/* POTATO-OS — PotatoWeb Browser
   HOW THE PROXY WORKS:
   - Set frame.src = "/proxy?url=..." directly (NOT fetch + blob)
   - The server fetches the page, strips X-Frame-Options + CSP headers, injects <base> tag
   - Browser loads it natively so all relative CSS/JS/images resolve via the <base> tag
   - This is the only approach that actually loads full pages correctly
*/
"use strict";

const TuberNet = (() => {
  let tabs = [], activeId = 0, tabId = 0, cfg = {};

  function mkTab(url){ return { id:++tabId, url:url||"_nt", title:url?dom(url):"New Tab" }; }
  function dom(u){ try{ return new URL(/^https?:\/\//i.test(u)?u:"https://"+u).hostname; }catch{ return u.slice(0,22); } }
  function active(){ return tabs.find(t=>t.id===activeId)||tabs[0]; }
  function fav(url){ if(!url||url==="_nt") return ""; try{ const u=new URL(/^https?:\/\//i.test(url)?url:"https://"+url); return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=14`; }catch{ return ""; } }

  /* ────────────────────────────────────────────────────
     BUILD UI
  ──────────────────────────────────────────────────── */
  function build(container, c){
    cfg = c;
    container.innerHTML = `
      <div id="tubernet">
        <div class="tn-tabbar">
          <div class="tn-brand">POTATOWEB</div>
          <div class="tn-tabs-wrap" id="tn-tabs"></div>
          <button class="tn-newtab-btn" onclick="TuberNet.addTab()" title="New tab">+</button>
          <div class="tn-wdots">
            <div class="tn-dot r" onclick="OS.closeApp('browser')"></div>
            <div class="tn-dot y" onclick="OS.minApp('browser')"></div>
            <div class="tn-dot g"></div>
          </div>
        </div>
        <div class="tn-addrbar">
          <button class="tn-nav" onclick="TuberNet.back()"   ><i class="fas fa-arrow-left" ></i></button>
          <button class="tn-nav" onclick="TuberNet.fwd()"    ><i class="fas fa-arrow-right"></i></button>
          <button class="tn-nav" onclick="TuberNet.refresh()"><i class="fas fa-redo"        ></i></button>
          <button class="tn-nav" onclick="TuberNet.home()"   ><i class="fas fa-home"        ></i></button>
          <div class="tn-url-bar">
            <i class="fas fa-lock tn-lock" id="tn-lock"></i>
            <input id="tn-url" type="text" placeholder="Search or enter URL..."
                   onkeydown="TuberNet.urlKey(event)" spellcheck="false" autocomplete="off">
          </div>
          <button class="tn-nav" id="tn-star" onclick="TuberNet.star()">
            <i class="far fa-star"></i>
          </button>
        </div>
        <div class="tn-content-area">
          <!-- New Tab page -->
          <div id="tn-nt">
            <div class="tn-nt-inner">
              <div class="tn-nt-time" id="tn-clock">12:00 PM</div>
              <div class="tn-nt-date" id="tn-date">WEDNESDAY, APRIL 1</div>
              <div class="tn-nt-search">
                <i class="fas fa-search tn-nt-si"></i>
                <input id="tn-nt-q" placeholder="Search the web or enter a URL..."
                       onkeydown="TuberNet.ntKey(event)" spellcheck="false">
              </div>
              <div class="tn-shortcuts" id="tn-scs"></div>
            </div>
          </div>
          <!-- Loading -->
          <div id="tn-load">
            <div class="tn-load-bar-wrap"><div class="tn-load-bar"></div></div>
            <div class="tn-load-txt">this might take a while...</div>
          </div>
          <!-- Main iframe — src is set to /proxy?url=... directly -->
          <iframe id="tn-frame" class="tn-frame" allowfullscreen
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock">
          </iframe>
        </div>
        <div class="tn-statusbar">
          <div class="tn-sdot" id="tn-sdot"></div>
          <span class="tn-stxt" id="tn-stxt">Ready</span>
          <span class="tn-proxy-badge">PotatoWeb · Server-Side Proxy</span>
        </div>
      </div>`;

    injectStyles(container);

    const ntEl = document.getElementById("tn-nt");
    if(ntEl && cfg.newtab_bg) ntEl.style.backgroundImage = `url('${cfg.newtab_bg}')`;

    buildShortcuts();
    addTab();
    tickClock(); setInterval(tickClock, 1000);
  }

  function buildShortcuts(){
    const row = document.getElementById("tn-scs"); if(!row) return;
    (cfg.tubernet_shortcuts||[]).forEach(s => {
      const d = document.createElement("div");
      d.className = "tn-sc"; d.onclick = () => navigate(s.url);
      d.innerHTML = `<div class="tn-sc-ico">${s.icon}</div><span class="tn-sc-lbl">${s.label}</span>`;
      row.appendChild(d);
    });
  }

  function tickClock(){
    const n=new Date(),h=n.getHours(),m=n.getMinutes(),ap=h>=12?"PM":"AM";
    const ck=document.getElementById("tn-clock"),dt=document.getElementById("tn-date");
    if(ck) ck.textContent=`${String(h%12||12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ap}`;
    if(dt) dt.textContent=n.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
  }

  function renderTabs(){
    const strip = document.getElementById("tn-tabs"); if(!strip) return;
    strip.innerHTML = tabs.map(t => `
      <div class="tn-tab ${t.id===activeId?"active":""}" onclick="TuberNet.switchTab(${t.id})">
        <img class="tn-tab-fav" src="${fav(t.url)}" onerror="this.style.display='none'" alt="">
        <span class="tn-tab-title">${t.title}</span>
        <button class="tn-tab-x" onclick="event.stopPropagation();TuberNet.closeTab(${t.id})">×</button>
      </div>`).join("");
  }

  /* show/hide */
  function cls(id,on){ const e=document.getElementById(id); if(e) e.classList.toggle("show",on); }
  function showNT()  { cls("tn-nt",true);  cls("tn-load",false); cls("tn-frame",false); setStatus("","Ready"); }
  function showLoad(){ cls("tn-nt",false); cls("tn-load",true);  cls("tn-frame",false); setStatus("loading","Connecting..."); }
  function showPage(){ cls("tn-nt",false); cls("tn-load",false); cls("tn-frame",true); }
  function setStatus(type,txt){
    const d=document.getElementById("tn-sdot"),s=document.getElementById("tn-stxt");
    if(d){ d.className="tn-sdot"; if(type) d.classList.add(type); }
    if(s) s.textContent=txt;
  }

  /* ────────────────────────────────────────────────────
     NAVIGATE — the correct proxy approach:
     Set frame.src = "/proxy?url=..." directly.
     Server strips X-Frame-Options + CSP, injects <base> tag.
     Browser loads natively so CSS/JS/images all resolve.
  ──────────────────────────────────────────────────── */
  function navigate(raw){
    if(!raw||raw==="_nt"){ showNT(); const u=document.getElementById("tn-url"); if(u) u.value=""; return; }

    let url = raw.trim();
    if(!/^https?:\/\//i.test(url)){
      url = (url.includes(".")&&!url.includes(" "))
        ? "https://"+url
        : "https://duckduckgo.com/?q="+encodeURIComponent(url);
    }

    const tab = active();
    if(tab){ tab.url=url; tab.title=dom(url); }

    const urlEl = document.getElementById("tn-url");
    if(urlEl) urlEl.value = url;

    const lock = document.getElementById("tn-lock");
    if(lock) lock.className = "fas fa-lock tn-lock"+(url.startsWith("https")?" secure":"");

    renderTabs();
    showLoad();

    const frame = document.getElementById("tn-frame");
    if(!frame) return;

    // ✅ KEY FIX: Set src directly to proxy URL.
    // Server fetches page, strips blocking headers, injects <base> for relative URLs.
    // Browser handles it natively — CSS, JS, images all load correctly.
    const proxyUrl = "/proxy?url=" + encodeURIComponent(url);
    frame.src = proxyUrl;

    // Show page once frame signals it loaded
    const onLoad = () => {
      frame.removeEventListener("load", onLoad);
      showPage();
      setStatus("ok", dom(url));
      if(tab){ tab.title = dom(url); }
      renderTabs();
    };
    const onErr = () => {
      frame.removeEventListener("error", onErr);
      showErr(url);
    };

    frame.addEventListener("load",  onLoad, { once: true });
    frame.addEventListener("error", onErr,  { once: true });

    // Safety timeout — if iframe doesn't fire load in 18s, show anyway
    setTimeout(() => { showPage(); setStatus("ok", dom(url)); }, 18000);
  }

  function showErr(url){
    const frame = document.getElementById("tn-frame"); if(!frame) return;
    frame.srcdoc = `<html><body style="background:#070605;color:#f5e6c8;font-family:system-ui;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      height:100vh;gap:12px;margin:0">
      <div style="font-size:52px">⚡</div>
      <p style="font-size:17px;font-weight:700">Can't reach this page</p>
      <p style="font-size:12px;opacity:0.4">${url}</p>
      <button onclick="window.open('${url}','_blank')"
        style="background:rgba(212,168,83,0.15);border:1px solid rgba(212,168,83,0.3);
        color:#f5e6c8;padding:9px 22px;border-radius:7px;cursor:pointer;font-size:13px;margin-top:8px">
        Open in new window ↗
      </button>
    </body></html>`;
    setStatus("err","Failed · "+dom(url));
  }

  /* tab management */
  function addTab(url){ const t=mkTab(url); tabs.push(t); activeId=t.id; renderTabs(); if(url) navigate(url); else showNT(); }
  function closeTab(id){ const i=tabs.findIndex(t=>t.id===id); if(i===-1) return; tabs.splice(i,1); if(!tabs.length){addTab();return;} if(activeId===id) activeId=tabs[Math.max(0,i-1)].id; renderTabs(); const at=active(); if(at){if(!at.url||at.url==="_nt")showNT();else navigate(at.url);} }
  function switchTab(id){ activeId=id; renderTabs(); const t=active(); if(t){if(!t.url||t.url==="_nt")showNT();else navigate(t.url);} }
  function back()    { const f=document.getElementById("tn-frame"); try{ f.contentWindow.history.back(); }catch(_){ if(active()?.url) navigate(active().url); } }
  function fwd()     { const f=document.getElementById("tn-frame"); try{ f.contentWindow.history.forward(); }catch(_){} }
  function refresh() { const t=active(); if(t&&t.url&&t.url!=="_nt") navigate(t.url); }
  function home()    { navigate("_nt"); }
  function urlKey(e) { if(e.key==="Enter") navigate(document.getElementById("tn-url").value); }
  function ntKey(e)  { if(e.key==="Enter") navigate(document.getElementById("tn-nt-q").value); }
  function star()    { const b=document.getElementById("tn-star"); if(!b) return; const i=b.querySelector("i"); i.className=i.className.includes("far")?"fas fa-star":"far fa-star"; i.style.color=i.className.includes("fas")?"#D4A853":""; }

  /* ────────────────────────────────────────────────────
     STYLES
  ──────────────────────────────────────────────────── */
  function injectStyles(container){
    const s = document.createElement("style");
    s.textContent = `
#tubernet{width:100%;height:100%;background:#0a0806;display:flex;flex-direction:column;font-family:'Space Grotesk',system-ui,sans-serif}
.tn-tabbar{height:38px;background:#0e0c0a;border-bottom:1px solid rgba(212,168,83,0.1);display:flex;align-items:flex-end;padding:0 6px;gap:1px;flex-shrink:0}
.tn-brand{font-family:'Space Mono',monospace;font-size:11px;color:#D4A853;letter-spacing:2px;padding:0 12px 0 4px;line-height:38px;flex-shrink:0}
.tn-tabs-wrap{display:flex;flex:1;overflow:hidden;align-items:flex-end;gap:2px}
.tn-tab{display:flex;align-items:center;gap:6px;padding:0 9px;height:31px;background:rgba(255,255,255,0.04);border-radius:7px 7px 0 0;border:1px solid rgba(212,168,83,0.08);border-bottom:none;cursor:pointer;min-width:100px;max-width:170px;flex-shrink:0;transition:background 0.15s}
.tn-tab:hover{background:rgba(255,255,255,0.07)}.tn-tab.active{background:#0a0806;border-bottom:1px solid #0a0806;z-index:2}
.tn-tab-fav{width:13px;height:13px;border-radius:3px;flex-shrink:0;object-fit:contain}
.tn-tab-title{font-size:11px;color:rgba(255,245,220,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}.tn-tab.active .tn-tab-title{color:rgba(255,245,220,0.9)}
.tn-tab-x{width:14px;height:14px;border-radius:50%;background:transparent;border:none;color:rgba(255,255,255,0.3);font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:all 0.13s;flex-shrink:0;line-height:1}
.tn-tab:hover .tn-tab-x,.tn-tab.active .tn-tab-x{opacity:1}.tn-tab-x:hover{background:rgba(255,80,80,0.2);color:#ff7777}
.tn-newtab-btn{width:26px;height:26px;border-radius:6px;background:transparent;border:none;color:rgba(255,255,255,0.3);font-size:17px;cursor:pointer;margin-left:3px;margin-bottom:2px;display:flex;align-items:center;justify-content:center;transition:all 0.13s;flex-shrink:0;line-height:1}.tn-newtab-btn:hover{background:rgba(255,255,255,0.06);color:#fff}
.tn-wdots{display:flex;gap:5px;padding:0 8px;margin-bottom:3px;margin-left:auto;flex-shrink:0}
.tn-dot{width:11px;height:11px;border-radius:50%;cursor:pointer;transition:opacity 0.13s}.tn-dot:hover{opacity:0.7}
.tn-dot.r{background:#ff5f57}.tn-dot.y{background:#febc2e}.tn-dot.g{background:#28c840}
.tn-addrbar{height:40px;background:#070605;border-bottom:1px solid rgba(212,168,83,0.08);display:flex;align-items:center;padding:0 7px;gap:5px;flex-shrink:0}
.tn-nav{width:26px;height:26px;border-radius:6px;background:transparent;border:none;color:rgba(255,245,220,0.35);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.13s}.tn-nav:hover{background:rgba(255,255,255,0.06);color:rgba(255,245,220,0.9)}
.tn-url-bar{flex:1;display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.06);border:1px solid rgba(212,168,83,0.1);border-radius:8px;padding:0 10px;height:27px;transition:border-color 0.18s}.tn-url-bar:focus-within{border-color:rgba(212,168,83,0.4)}
.tn-lock{color:rgba(255,255,255,0.25);font-size:10px;flex-shrink:0}.tn-lock.secure{color:rgba(91,185,116,0.7)}
#tn-url{flex:1;background:transparent;border:none;color:rgba(255,245,220,0.9);font-family:'Space Mono',monospace;font-size:11.5px;outline:none;user-select:text}#tn-url::placeholder{color:rgba(255,245,220,0.28)}
.tn-content-area{flex:1;position:relative;overflow:hidden;background:#000}
.tn-frame{position:absolute;inset:0;width:100%;height:100%;border:none;display:none}.tn-frame.show{display:block}
#tn-load{position:absolute;inset:0;background:#000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:10}#tn-load.show{display:flex}
.tn-load-bar-wrap{width:180px;height:4px;background:rgba(255,255,255,0.07);border-radius:4px;overflow:hidden}
.tn-load-bar{height:100%;background:linear-gradient(90deg,#8B6820,#D4A853);border-radius:4px;animation:tnL 2s cubic-bezier(0.4,0,0.6,1) infinite;box-shadow:0 0 8px rgba(212,168,83,0.4)}
@keyframes tnL{0%{width:0%;margin-left:0%}50%{width:65%;margin-left:20%}100%{width:0%;margin-left:100%}}
.tn-load-txt{font-size:11px;color:rgba(255,245,220,0.3)}
#tn-nt{position:absolute;inset:0;background-size:cover;background-position:center;display:none;flex-direction:column;align-items:center;justify-content:center;z-index:5}#tn-nt.show{display:flex}
#tn-nt::before{content:'';position:absolute;inset:0;background:rgba(0,0,0,0.3);pointer-events:none}
.tn-nt-inner{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center}
.tn-nt-time{font-family:'Orbitron',monospace;font-size:5.5rem;font-weight:900;color:rgba(255,245,220,0.88);letter-spacing:3px;line-height:1;text-shadow:0 2px 30px rgba(0,0,0,0.5)}
.tn-nt-date{font-size:0.78rem;color:rgba(255,245,220,0.48);letter-spacing:5px;text-transform:uppercase;margin-top:10px;margin-bottom:24px;font-family:'Space Mono',monospace}
.tn-nt-search{position:relative;width:460px;max-width:84vw;margin-bottom:24px}
.tn-nt-si{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:rgba(255,245,220,0.38);font-size:14px;pointer-events:none;z-index:1}
#tn-nt-q{width:100%;padding:13px 18px 13px 42px;background:rgba(10,8,6,0.72);border:1px solid rgba(212,168,83,0.18);border-radius:28px;color:rgba(255,245,220,0.9);font-family:'Space Grotesk',system-ui;font-size:14px;outline:none;user-select:text;backdrop-filter:blur(12px)}
#tn-nt-q::placeholder{color:rgba(255,245,220,0.33)}#tn-nt-q:focus{border-color:rgba(212,168,83,0.45)}
.tn-shortcuts{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:480px}
.tn-sc{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;padding:9px;border-radius:12px;transition:background 0.18s;min-width:62px}.tn-sc:hover{background:rgba(255,255,255,0.06)}
.tn-sc-ico{width:48px;height:48px;background:rgba(10,8,6,0.72);border:1px solid rgba(212,168,83,0.1);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:21px;backdrop-filter:blur(8px)}.tn-sc-lbl{font-size:10px;color:rgba(255,245,220,0.48)}
.tn-statusbar{height:20px;background:rgba(7,6,5,0.9);border-top:1px solid rgba(212,168,83,0.07);display:flex;align-items:center;padding:0 11px;gap:7px;flex-shrink:0}
.tn-sdot{width:5px;height:5px;border-radius:50%;background:#444;flex-shrink:0}.tn-sdot.ok{background:#5BB974;box-shadow:0 0 4px rgba(91,185,116,0.4)}.tn-sdot.loading{background:#D4A853;animation:sdP 1s infinite}.tn-sdot.err{background:#E05252}
@keyframes sdP{50%{opacity:0.3}}
.tn-stxt{font-size:10px;color:rgba(255,245,220,0.28);font-family:'Space Mono',monospace}
.tn-proxy-badge{margin-left:auto;font-size:9px;color:rgba(212,168,83,0.18)}
`;
    container.appendChild(s);
  }

  return { build, navigate, addTab, closeTab, switchTab, back, fwd, refresh, home, urlKey, ntKey, star };
})();
window.TuberNet  = TuberNet;
window.PotatoWeb = TuberNet;

/* ════════════ THE PEELER — Settings ════════════ */
const Peeler = (() => {
  let _t = [], _cfg = {};

  function build(el, cfg){
    _cfg = cfg; el.style.cssText = "width:100%;height:100%";
    const navs = [{i:"fa-palette",l:"Appearance"},{i:"fa-globe",l:"Network"},{i:"fa-store",l:"Spud Store"},{i:"fa-bell",l:"Notifications"},{i:"fa-shield-alt",l:"Privacy"},{i:"fa-microchip",l:"System"},{i:"fa-info-circle",l:"About"}];
    el.innerHTML = `<div id="peeler"><div class="pl-sidebar"><div class="pl-logo">THE PEELER</div>${navs.map((n,i)=>`<div class="pl-nav${i===0?" on":""}" onclick="Peeler.tab(${i},this)"><i class="fas ${n.i}"></i> ${n.l}</div>`).join("")}</div><div class="pl-content" id="pl-content"></div></div>`;
    mkTabs(); tab(0, el.querySelector(".pl-nav.on"));
  }

  function r(t,d,c,oc){ return `<div class="pl-row"><div><h4>${t}</h4><p>${d}</p></div><label class="os-tog"><input type="checkbox" ${c?"checked":""} ${oc?`onchange="${oc}"`:""}}><span class="tog-t"></span></label></div>`; }
  function iv(k,v){ return `<div class="pl-row"><div><h4>${k}</h4></div><span class="pl-info-val">${v}</span></div>`; }

  function mkTabs(){
    _t = [
      ()=>`<div class="page-title">APPEARANCE</div>
        <div class="pl-card"><div class="pl-card-hdr">Theme</div>
          ${r("Dark Mode","System-wide dark theme",true)}
          ${r("Blur Effects","Glass morphism panels",true)}
          ${r("Canvas Particles","Desktop floating particles",true,"document.getElementById('bg-canvas').style.display=this.checked?'block':'none'")}
        </div>
        <div class="pl-card"><div class="pl-card-hdr">Accent Colour</div>
          <div class="pl-row" style="border:none"><div class="pl-dots">
            ${["#D4A853","#5BB974","#5B8FD4","#E05252","#9B72CF","#F07850"].map(c=>`<div class="pl-dot" style="background:${c}" onclick="document.documentElement.style.setProperty('--amber','${c}');OS.notify('Appearance','Accent updated!','🎨')"></div>`).join("")}
          </div></div>
        </div>`,
      ()=>`<div class="page-title">NETWORK</div>
        <div class="pl-card"><div class="pl-card-hdr">PotatoWeb Proxy</div>
          ${iv("Endpoint","/proxy?url= (server-side)")}
          ${iv("Method","node-fetch → strip X-Frame-Options + inject &lt;base&gt;")}
          ${iv("Frame","iframe.src = proxyUrl (native load)")}
          ${iv("Game Fetch","/game?id=N (CDN relay)")}
          <div class="pl-row" style="border:none"><div><h4>Test Connection</h4><p>Ping the proxy</p></div>
            <button class="btn-ghost btn-sm" onclick="Peeler.testProxy()">Test</button></div>
        </div>`,
      ()=>`<div class="page-title">SPUD STORE</div>
        <div class="pl-card"><div class="pl-card-hdr">Game Library</div>
          ${iv("Source","GN-Math · gn-math.dev")}
          ${iv("Installed",Object.keys(JSON.parse(localStorage.getItem("pot_installed")||"{}")).length+" games")}
          ${iv("Storage",(JSON.stringify(localStorage).length/1024).toFixed(1)+" KB")}
          <div class="pl-row" style="border:none"><div><h4>Clear All Games</h4><p>Free up space</p></div>
            <button class="btn-ghost btn-sm" onclick="Peeler.clearGames()">Clear</button></div>
        </div>`,
      ()=>`<div class="page-title">NOTIFICATIONS</div>
        <div class="pl-card"><div class="pl-card-hdr">Alerts</div>
          ${r("System Alerts","OS notifications",true)}
          ${r("Install Events","Game downloads",true)}
          ${r("Music Updates","Now playing toasts",true)}
        </div>`,
      ()=>`<div class="page-title">PRIVACY</div>
        <div class="pl-card"><div class="pl-card-hdr">Data</div>
          ${r("Local Storage Only","All data stays on device",true)}
          ${r("Session Cookies","Allow cookies",false)}
        </div>
        <div class="pl-card"><div class="pl-card-hdr">Danger Zone</div>
          <div class="pl-row" style="border:none"><div><h4>Wipe & Reboot</h4><p>Clear all data</p></div>
            <button class="btn-ghost btn-sm" style="color:var(--red);border-color:var(--red)" onclick="if(confirm('Wipe all?')){localStorage.clear();location.reload()}">Wipe</button></div>
        </div>`,
      ()=>`<div class="page-title">SYSTEM</div>
        <div class="pl-card"><div class="pl-card-hdr">Runtime</div>
          ${iv("OS","Potato-OS v3.1.0")}${iv("Build","GOLDEN-HARVEST-2025")}${iv("Storage",(JSON.stringify(localStorage).length/1024).toFixed(1)+" KB")}
        </div>
        <div class="pl-card"><div class="pl-card-hdr">Display</div>
          <div class="pl-row"><div><h4>FPS Counter</h4></div><label class="os-tog"><input type="checkbox" checked onchange="document.getElementById('fps').style.display=this.checked?'block':'none'"><span class="tog-t"></span></label></div>
        </div>`,
      ()=>`<div class="page-title">ABOUT</div>
        <div style="text-align:center;padding:24px 0">
          <div style="font-size:64px;margin-bottom:12px">🥔</div>
          <div style="font-family:var(--hdr);font-size:1.6rem;letter-spacing:8px;margin-bottom:6px;color:var(--cream)">POTATO-OS</div>
          <div style="font-size:11px;color:var(--dimmer);margin-bottom:18px;font-family:var(--mono)">v3.1.0 · GOLDEN-HARVEST-2025</div>
          <div style="font-style:italic;color:var(--amber);margin-bottom:22px;font-size:13px">"Grown fresh. Served hot."</div>
          <div class="pl-card" style="text-align:left;max-width:380px;margin:0 auto">
            ${iv("Games","GN-Math (gn-math.dev)")}${iv("Browser","PotatoWeb (server-side proxy)")}${iv("Music","Spudify (CineOS Player)")}
          </div>
        </div>`,
    ];
  }

  function tab(i, el){ document.querySelectorAll(".pl-nav").forEach(n=>n.classList.remove("on")); if(el)el.classList.add("on"); const c=document.getElementById("pl-content"); if(c&&_t[i])c.innerHTML=_t[i](); }
  async function testProxy(){ OS.notify("Network","Testing...","📡"); try{ const r=await fetch("/proxy?url=https://httpbin.org/get",{signal:AbortSignal.timeout(8000)}); r.ok?OS.notify("Network","Proxy OK ✓","✅"):OS.notify("Network","HTTP "+r.status,"❌"); }catch(e){ OS.notify("Network",e.message,"❌"); } }
  function clearGames(){ if(!confirm("Remove all installed games?"))return; Object.keys(localStorage).filter(k=>k.startsWith("pot_html_")||k==="pot_installed").forEach(k=>localStorage.removeItem(k)); OS.notify("Spud Store","Cleared.","🗑️"); }

  return { build, tab, testProxy, clearGames };
})();
window.Peeler = Peeler;
