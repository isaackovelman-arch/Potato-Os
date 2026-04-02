/* POTATO-OS — PotatoWeb Browser + The Peeler Settings | Language: JavaScript */
"use strict";

/* ══════════════ POTATOWEB BROWSER ══════════════ */
const PotatoWeb=(()=>{
  let tabs=[],activeId=0,tid=0,cfg={},proxy="/proxy?url=";
  function mkTab(url=""){return{id:++tid,url:url||"_nt",title:url?dom(url):"New Tab",loading:false};}
  function dom(u){try{return new URL(/^https?:\/\//i.test(u)?u:"https://"+u).hostname;}catch{return u.slice(0,22);}}
  function activeTab(){return tabs.find(t=>t.id===activeId)||tabs[0];}
  function fav(url){if(!url||url==="_nt")return "";try{const u=new URL(/^https?:\/\//i.test(url)?url:"https://"+url);return`https://www.google.com/s2/favicons?domain=${u.hostname}&sz=14`;}catch{return "";}}

  function build(container,c){
    cfg=c;proxy=c.proxy_endpoint||"/proxy?url=";
    container.innerHTML=`
      <div id="tubernet">
        <div class="tn-tabbar">
          <div class="tn-brand">POTATOWEB</div>
          <div class="tn-tabs-container" id="tn-tabs"></div>
          <button class="tn-new-tab-btn" onclick="PotatoWeb.addTab()" title="New tab">+</button>
          <div class="tn-win-dots">
            <div class="tn-dot tn-dot-r" onclick="OS.closeApp('browser')"></div>
            <div class="tn-dot tn-dot-y" onclick="OS.minApp('browser')"></div>
            <div class="tn-dot tn-dot-g"></div>
          </div>
        </div>
        <div class="tn-addrbar">
          <button class="tn-nav-btn" onclick="PotatoWeb.back()"><i class="fas fa-arrow-left"></i></button>
          <button class="tn-nav-btn" onclick="PotatoWeb.fwd()"><i class="fas fa-arrow-right"></i></button>
          <button class="tn-nav-btn" onclick="PotatoWeb.refresh()"><i class="fas fa-redo"></i></button>
          <button class="tn-nav-btn" onclick="PotatoWeb.home()"><i class="fas fa-home"></i></button>
          <div class="tn-url-wrap">
            <i class="fas fa-lock tn-lock" id="tn-lock"></i>
            <input id="tn-url" type="text" placeholder="Search or enter a URL..." onkeydown="PotatoWeb.urlKey(event)" spellcheck="false" autocomplete="off">
          </div>
          <button class="tn-tool-btn" id="tn-star-btn" onclick="PotatoWeb.toggleStar()"><i class="far fa-star"></i></button>
          <button class="tn-tool-btn"><i class="fas fa-ellipsis-v"></i></button>
        </div>
        <div class="tn-content">
          <div id="tn-newtab">
            <div class="tn-nt-inner">
              <div class="tn-nt-time" id="tn-clock">12:00 PM</div>
              <div class="tn-nt-date" id="tn-date">WEDNESDAY, APRIL 1</div>
              <div class="tn-nt-search-wrap">
                <i class="fas fa-search tn-nt-s-ico"></i>
                <input id="tn-nt-q" placeholder="Search the web or enter URL..." onkeydown="PotatoWeb.ntKey(event)" spellcheck="false">
              </div>
              <div class="tn-shortcuts" id="tn-scs"></div>
            </div>
          </div>
          <div id="tn-loading">
            <div class="tn-load-bar-wrap"><div class="tn-load-bar"></div></div>
            <div class="tn-load-txt">this might take a while...</div>
          </div>
          <iframe id="tn-frame" class="tn-frame" allowfullscreen
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock">
          </iframe>
        </div>
        <div class="tn-status">
          <div class="tn-status-dot" id="tn-dot"></div>
          <span class="tn-status-txt" id="tn-stat">Ready</span>
          <span class="tn-proxy-info">PotatoWeb · Server-Side Proxy</span>
        </div>
      </div>`;

    const nt=document.getElementById("tn-newtab");
    if(nt&&cfg.newtab_bg)nt.style.backgroundImage=`url('${cfg.newtab_bg}')`;
    buildShortcuts();
    addTab();
    tickClock();setInterval(tickClock,1000);
  }

  function buildShortcuts(){
    const row=document.getElementById("tn-scs");if(!row)return;
    const scs=cfg.tubernet_shortcuts||[];
    row.innerHTML=scs.map(s=>`
      <div class="tn-sc" onclick="PotatoWeb.navigate('${s.url}')">
        <div class="tn-sc-ico">${s.icon}</div>
        <span class="tn-sc-lbl">${s.label}</span>
      </div>`).join("");
  }

  function tickClock(){
    const n=new Date(),h=n.getHours(),m=n.getMinutes(),ampm=h>=12?"PM":"AM",h12=String(h%12||12).padStart(2,"0"),mm=String(m).padStart(2,"0");
    const ck=document.getElementById("tn-clock"),dt=document.getElementById("tn-date");
    if(ck)ck.textContent=`${h12}:${mm} ${ampm}`;
    if(dt)dt.textContent=n.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase();
  }

  function renderTabs(){
    const strip=document.getElementById("tn-tabs");if(!strip)return;
    strip.innerHTML=tabs.map(t=>`
      <div class="tn-tab ${t.id===activeId?"active":""}" onclick="PotatoWeb.switchTab(${t.id})">
        <img class="tn-tab-fav" src="${fav(t.url)}" onerror="this.style.display='none'" alt="">
        <span class="tn-tab-title">${t.title}</span>
        <button class="tn-tab-x" onclick="event.stopPropagation();PotatoWeb.closeTab(${t.id})">×</button>
      </div>`).join("");
  }

  function showNT(){q("tn-newtab","show",true);q("tn-loading","show",false);q("tn-frame","show",false);setStatus("","Ready");}
  function showLoad(){q("tn-newtab","show",false);q("tn-loading","show",true);q("tn-frame","show",false);setStatus("loading","Connecting...");}
  function showPage(){q("tn-newtab","show",false);q("tn-loading","show",false);q("tn-frame","show",true);}
  function q(id,cls,add){const e=document.getElementById(id);if(e){if(add)e.classList.add(cls);else e.classList.remove(cls);}}
  function setStatus(t,txt){const d=document.getElementById("tn-dot"),s=document.getElementById("tn-stat");if(d){d.className="tn-status-dot";if(t)d.classList.add(t);}if(s)s.textContent=txt;}

  async function navigate(raw){
    if(!raw||raw==="_nt"||raw==="tubernet://newtab"){showNT();const u=document.getElementById("tn-url");if(u)u.value="";return;}
    let url=raw.trim();
    if(!/^https?:\/\//i.test(url)){url=url.includes(".")&&!url.includes(" ")?"https://"+url:"https://duckduckgo.com/?q="+encodeURIComponent(url);}
    const tab=activeTab();if(tab){tab.url=url;tab.title=dom(url);}
    const urlBar=document.getElementById("tn-url");if(urlBar)urlBar.value=url;
    const lock=document.getElementById("tn-lock");
    if(lock)lock.className="tn-lock fas fa-lock"+(url.startsWith("https")?" secure":"");
    renderTabs();showLoad();
    try{
      const proxyUrl=proxy+encodeURIComponent(url);
      const ctrl=new AbortController();const tid2=setTimeout(()=>ctrl.abort(),15000);
      const r=await fetch(proxyUrl,{signal:ctrl.signal});clearTimeout(tid2);
      if(!r.ok)throw new Error("HTTP "+r.status);
      const html=await r.text();
      const frame=document.getElementById("tn-frame");
      if(frame){showPage();frame.contentDocument.open();frame.contentDocument.write(html);frame.contentDocument.close();setStatus("ok","Proxied · "+dom(url));if(tab){tab.title=dom(url);}renderTabs();}
    }catch(err){
      const frame=document.getElementById("tn-frame");
      if(frame){frame.src=url;showPage();frame.onload=()=>setStatus("ok",dom(url));frame.onerror=()=>showErr(url);setStatus("loading","Direct load...");}
    }
  }

  function showErr(url){
    const frame=document.getElementById("tn-frame");if(!frame)return;
    frame.contentDocument.open();
    frame.contentDocument.write(`<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{background:#070605;color:#f5e6c8;font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:12px}h1{font-size:3rem}p{color:rgba(255,245,220,0.4);font-size:14px}button{background:rgba(212,168,83,0.15);border:1px solid rgba(212,168,83,0.3);color:#f5e6c8;padding:9px 22px;border-radius:7px;cursor:pointer;font-size:13px;margin-top:8px}</style></head><body><h1>⚡</h1><p style="font-size:17px;color:#f5e6c8;font-weight:700">Can't reach this page</p><p>${url}</p><p>Both proxy and direct load failed.</p><button onclick="window.open('${url}','_blank')">Open in new window</button></body></html>`);
    frame.contentDocument.close();setStatus("err","Failed · "+dom(url));
  }

  function addTab(url=""){const t=mkTab(url);tabs.push(t);activeId=t.id;renderTabs();if(url)navigate(url);else showNT();}
  function closeTab(id){const i=tabs.findIndex(t=>t.id===id);if(i===-1)return;tabs.splice(i,1);if(!tabs.length){addTab();return;}if(activeId===id)activeId=tabs[Math.max(0,i-1)].id;renderTabs();const at=activeTab();if(at){if(!at.url||at.url==="_nt")showNT();else navigate(at.url);}}
  function switchTab(id){activeId=id;renderTabs();const t=activeTab();if(t){if(!t.url||t.url==="_nt")showNT();else navigate(t.url);}}
  function back(){try{document.getElementById("tn-frame").contentWindow.history.back();}catch(_){}}
  function fwd(){try{document.getElementById("tn-frame").contentWindow.history.forward();}catch(_){}}
  function refresh(){const t=activeTab();if(t&&t.url&&t.url!=="_nt")navigate(t.url);}
  function home(){navigate("_nt");}
  function urlKey(e){if(e.key==="Enter")navigate(document.getElementById("tn-url").value);}
  function ntKey(e){if(e.key==="Enter")navigate(document.getElementById("tn-nt-q").value);}
  function toggleStar(){const b=document.getElementById("tn-star-btn");if(!b)return;const i=b.querySelector("i");if(i.className.includes("far")){i.className="fas fa-star";i.style.color="var(--amber)";}else{i.className="far fa-star";i.style.color="";}}
  return{build,navigate,addTab,closeTab,switchTab,back,fwd,refresh,home,urlKey,ntKey,toggleStar};
})();
/* ══════════════ THE PEELER — SETTINGS ══════════════ */
const Peeler=(()=>{
  let _tabs=[],_cfg={};

  function build(el,cfg){
    _cfg=cfg;el.style.cssText="width:100%;height:100%";
    const navs=[{i:"fa-palette",l:"Appearance"},{i:"fa-globe",l:"Network"},{i:"fa-store",l:"Spud Store"},{i:"fa-bell",l:"Notifications"},{i:"fa-shield-alt",l:"Privacy"},{i:"fa-microchip",l:"System"},{i:"fa-info-circle",l:"About"}];
    el.innerHTML=`<div id="peeler"><div class="pl-sidebar"><div class="pl-logo">THE PEELER</div>${navs.map((n,i)=>`<div class="pl-nav${i===0?" on":""}" onclick="Peeler.tab(${i},this)"><i class="fas ${n.i}"></i> ${n.l}</div>`).join("")}</div><div class="pl-content" id="pl-content"></div></div>`;
    makeTabs();tab(0,el.querySelector(".pl-nav.on"));
  }

  function r(title,desc,checked,onch){return `<div class="pl-row"><div><h4>${title}</h4><p>${desc}</p></div><label class="os-tog"><input type="checkbox" ${checked?"checked":""} ${onch?`onchange="${onch}"`:""}}><span class="tog-t"></span></label></div>`;}
  function iv(k,v){return `<div class="pl-row"><div><h4>${k}</h4></div><span class="pl-info-val">${v}</span></div>`;}

  function makeTabs(){
    _tabs=[
      ()=>`<div class="page-title">APPEARANCE</div>
        <div class="pl-card"><div class="pl-card-hdr">Theme</div>
          ${r("Dark Mode","System-wide dark theme",true)}
          ${r("Blur Effects","Glass morphism on panels",true)}
          ${r("Canvas Particles","Floating particles on desktop",true,`document.getElementById('bg-canvas').style.display=this.checked?'block':'none'`)}
          ${r("Smooth Animations","Window transitions",true)}
        </div>
        <div class="pl-card"><div class="pl-card-hdr">Accent Colour</div>
          <div class="pl-row" style="border:none"><div class="pl-dots">
            ${["#D4A853","#5BB974","#5B8FD4","#E05252","#9B72CF","#F07850"].map(c=>`<div class="pl-dot" style="background:${c}" onclick="document.documentElement.style.setProperty('--amber','${c}');OS.notify('Appearance','Accent updated!','🎨')"></div>`).join("")}
          </div></div>
        </div>`,
      ()=>`<div class="page-title">NETWORK</div>
        <div class="pl-card"><div class="pl-card-hdr">PotatoWeb Proxy</div>
          ${iv("Endpoint","/proxy (server-side Node.js)")}
          ${iv("Method","fetch() → strip X-Frame-Options + CSP")}
          ${iv("Game Fetch","/game?id=N (CDN relay)")}
          ${iv("Zones","/zones (cached server-side)")}
          <div class="pl-row" style="border:none"><div><h4>Test Proxy</h4><p>Ping the server endpoint</p></div>
            <button class="btn-ghost btn-sm" onclick="Peeler.testProxy()">Test</button></div>
        </div>`,
      ()=>`<div class="page-title">SPUD STORE</div>
        <div class="pl-card"><div class="pl-card-hdr">Game Library</div>
          ${iv("Source","GN-Math · gn-math.dev")}
          ${iv("Installed",Object.keys(JSON.parse(localStorage.getItem("pot_installed")||"{}")).length+" games")}
          ${iv("Storage Used",(JSON.stringify(localStorage).length/1024).toFixed(1)+" KB")}
          <div class="pl-row" style="border:none"><div><h4>Clear All Games</h4><p>Remove all installed games</p></div>
            <button class="btn-ghost btn-sm" onclick="Peeler.clearGames()">Clear</button></div>
        </div>`,
      ()=>`<div class="page-title">NOTIFICATIONS</div>
        <div class="pl-card"><div class="pl-card-hdr">Alerts</div>
          ${r("System Alerts","OS-level notifications",true)}
          ${r("Install Events","Game download & install toasts",true)}
          ${r("Music Updates","Now playing notifications",true)}
        </div>`,
      ()=>`<div class="page-title">PRIVACY</div>
        <div class="pl-card"><div class="pl-card-hdr">Data</div>
          ${r("Local Storage Only","All data stays on device",true)}
          ${r("Session Cookies","Allow browser cookies",false)}
        </div>
        <div class="pl-card"><div class="pl-card-hdr">Danger Zone</div>
          <div class="pl-row" style="border:none"><div><h4>Wipe &amp; Reboot</h4><p>Clears all saved data and reloads</p></div>
            <button class="btn-ghost btn-sm" style="color:var(--red);border-color:var(--red)" onclick="if(confirm('Wipe all data?')){localStorage.clear();location.reload()}">Wipe</button></div>
        </div>`,
      ()=>`<div class="page-title">SYSTEM</div>
        <div class="pl-card"><div class="pl-card-hdr">Runtime</div>
          ${iv("OS","Potato-OS v3.1.0")}${iv("Build","GOLDEN-HARVEST-2025")}${iv("Renderer","Canvas 2D + CSS3")}${iv("Storage Used",(JSON.stringify(localStorage).length/1024).toFixed(1)+" KB")}
        </div>
        <div class="pl-card"><div class="pl-card-hdr">Display</div>
          <div class="pl-row"><div><h4>FPS Counter</h4><p>Show frame rate</p></div><label class="os-tog"><input type="checkbox" checked onchange="document.getElementById('fps').style.display=this.checked?'block':'none'"><span class="tog-t"></span></label></div>
        </div>`,
      ()=>`<div class="page-title">ABOUT</div>
        <div style="text-align:center;padding:24px 0">
          <div style="font-size:64px;margin-bottom:12px">🥔</div>
          <div style="font-family:var(--hdr);font-size:1.6rem;letter-spacing:8px;margin-bottom:6px;color:var(--cream)">POTATO-OS</div>
          <div style="font-size:11px;color:var(--dimmer);margin-bottom:22px;font-family:var(--mono)">v3.1.0 · GOLDEN-HARVEST-2025 · Potato Softwares</div>
          <div style="font-style:italic;color:var(--amber);margin-bottom:24px;font-size:13px">"Grown fresh. Served hot."</div>
          <div class="pl-card" style="text-align:left;max-width:400px;margin:0 auto">
            ${iv("Games","GN-Math (gn-math.dev)")}${iv("Browser","PotatoWeb (server-side proxy)")}${iv("Music","Spudify (Spotify Web)")}${iv("License","Spud Public License v3")}
          </div>
        </div>`,
    ];
  }

  function tab(i,el){document.querySelectorAll(".pl-nav").forEach(n=>n.classList.remove("on"));if(el)el.classList.add("on");const c=document.getElementById("pl-content");if(c&&_tabs[i])c.innerHTML=_tabs[i]();}
  async function testProxy(){OS.notify("Network","Testing proxy...","📡");try{const r=await fetch("/proxy?url=https://httpbin.org/get",{signal:AbortSignal.timeout(8000)});if(r.ok)OS.notify("Network","Proxy working ✓","✅");else throw new Error("HTTP "+r.status);}catch(e){OS.notify("Network","Proxy error: "+e.message,"❌");}}
  function clearGames(){if(!confirm("Remove all installed games?"))return;Object.keys(localStorage).filter(k=>k.startsWith("pot_html_")||k==="pot_installed").forEach(k=>localStorage.removeItem(k));OS.notify("Spud Store","All games cleared.","🗑️");}
  return{build,tab,testProxy,clearGames};
})();
window.PotatoWeb=PotatoWeb;
window.Peeler=Peeler;
