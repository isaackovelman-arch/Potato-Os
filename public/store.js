/* POTATO-OS — Spud Store  |  store.js
   FIXED: blob URL game launch (prevents anti-iframe code from reloading OS)
   FIXED: proper GN-Math catalog loading with visible errors
   FIXED: GET/OPEN store buttons, library hero, home sections
*/
"use strict";

const SpudStore = (() => {
  const COVERS = "https://cdn.jsdelivr.net/gh/gn-math/covers@main";
  const HTML   = "https://cdn.jsdelivr.net/gh/gn-math/html@main";

  let games     = [];
  let installed = JSON.parse(localStorage.getItem("pot_installed") || "{}");
  let view      = "home";
  let libSel    = null;

  /* ── utils ─────────────────────────────────────────── */
  function coverUrl(g){ return (g.cover||"").replace("{COVER_URL}", COVERS).replace("{HTML_URL}", HTML); }
  function isIn(id)   { return !!installed[String(id)]; }
  function save()     { localStorage.setItem("pot_installed", JSON.stringify(installed)); }
  function saveHtml(id, html){
    try { localStorage.setItem("pot_html_" + id, html); }
    catch(_){
      // storage full — remove oldest game
      const old = Object.keys(localStorage).filter(k => k.startsWith("pot_html_"));
      if(old.length){ localStorage.removeItem(old[0]); localStorage.setItem("pot_html_" + id, html); }
    }
  }
  function getHtml(id){ return localStorage.getItem("pot_html_" + id); }
  function tags(g){ return (g.special||[]).slice(0,2).map(t => t.charAt(0).toUpperCase()+t.slice(1)).join(" • "); }

  /* ── FIXED: launch via blob URL ──────────────────────
     Blob URLs are cross-origin from the parent page.
     This means games with  if(top!==self) top.location=...
     will throw a security error instead of reloading the OS.
     ─────────────────────────────────────────────────── */
  function launchHtml(html, name){
    const fs  = document.getElementById("game-fs");
    const nm  = document.getElementById("gfs-name");
    const ifr = document.getElementById("game-iframe");
    if(!fs || !ifr){ alert("game-fs element missing"); return; }
    if(nm) nm.textContent = name.toUpperCase();
    fs.style.display = "flex";
    // Create blob URL — cross-origin isolation prevents OS reload
    const blob    = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    ifr.onload = () => URL.revokeObjectURL(blobUrl);
    ifr.src    = blobUrl;
  }

  function launch(id){
    const html = getHtml(String(id));
    const game = installed[String(id)];
    if(!html || !game){ OS.notify("Error", "Game data missing — reinstall.", "⚠️"); return; }
    launchHtml(html, game.name);
    localStorage.setItem("pot_last_game", JSON.stringify({ id, name: game.name }));
    const rp = document.getElementById("rp-game-name");
    if(rp) rp.textContent = game.name;
    libSel = games.find(g => g.id == id) || game;
  }

  function launchUser(id){
    const html = localStorage.getItem("pot_html_" + id);
    const meta = JSON.parse(localStorage.getItem("pot_ugames") || "[]").find(g => g.id === id);
    if(!html){ OS.notify("Error", "Game data missing.", "⚠️"); return; }
    launchHtml(html, meta?.name || "Custom Game");
  }

  /* ── install / download ──────────────────────────── */
  async function installGame(id, btnEl){
    if(isIn(id)){ launch(id); return; }
    const game = games.find(g => g.id == id);
    if(!game) return;

    if(btnEl){ btnEl.textContent = "..."; btnEl.className = "ss-store-btn installing"; }

    let html = null;
    // Try server-side endpoint first, then CDN directly
    const tries = [
      `/game?id=${id}`,
      `${HTML}/${id}.html`,
    ];
    for(const url of tries){
      try{
        const r = await fetch(url, { signal: AbortSignal.timeout(14000) });
        if(!r.ok) continue;
        const t = await r.text();
        if(t.length > 80 && !t.trim().startsWith("Couldn't")){ html = t; break; }
      } catch(_){}
    }

    if(!html){
      if(btnEl){ btnEl.textContent = "GET"; btnEl.className = "ss-store-btn get"; }
      OS.notify("Failed", `"${game.name}" could not be downloaded`, "⚠️");
      return;
    }

    saveHtml(id, html);
    installed[String(id)] = { id: game.id, name: game.name, cover: coverUrl(game) };
    save();

    // Update every button for this game on screen
    document.querySelectorAll(`[data-gid="${id}"]`).forEach(b => {
      b.textContent = "OPEN"; b.className = "ss-store-btn open";
      b.onclick = () => launch(id);
    });

    OS.notify(game.name + " added to Library!", "", "✅");
    localStorage.setItem("pot_last_game", JSON.stringify({ id, name: game.name }));
    const rp = document.getElementById("rp-game-name");
    if(rp) rp.textContent = game.name;
    if(view === "library") renderLibrary();
  }

  function removeUser(id){
    let ug = JSON.parse(localStorage.getItem("pot_ugames") || "[]");
    ug = ug.filter(g => g.id !== id);
    localStorage.removeItem("pot_html_" + id);
    localStorage.setItem("pot_ugames", JSON.stringify(ug));
    renderHome();
  }

  function uninstall(id){
    delete installed[String(id)];
    localStorage.removeItem("pot_html_" + id);
    save();
    if(view === "library") renderLibrary();
    OS.notify("Uninstalled", "Game removed.", "🗑️");
  }

  /* ── catalog fetch ───────────────────────────────── */
  async function loadCatalog(){
    setViewHtml(`<div class="ss-loading"><div class="ss-loading-spin">⏳</div><p>Loading GN-Math catalog...</p></div>`);
    const urls = ["/zones", "https://cdn.jsdelivr.net/gh/gn-math/assets@latest/zones.json"];
    for(const url of urls){
      try{
        const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if(!r.ok) continue;
        const data = await r.json();
        if(Array.isArray(data) && data.length > 0){
          games = data;
          renderView();
          OS.notify("Spud Store", `${games.length} games ready`, "🎮");
          return;
        }
      } catch(_){}
    }
    // All failed
    setViewHtml(`<div class="ss-loading">
      <div style="font-size:48px">📡</div>
      <p>Could not reach GN-Math servers</p>
      <button class="ss-retry-btn" onclick="SpudStore.reload()">
        <i class="fas fa-redo"></i> Retry
      </button>
    </div>`);
    OS.notify("Spud Store", "Catalog failed to load — tap Retry", "⚠️");
  }

  function setViewHtml(html){
    const el = document.getElementById("ss-view-area");
    if(el) el.innerHTML = html;
  }

  /* ── nav ─────────────────────────────────────────── */
  function switchView(v, el){
    view = v;
    document.querySelectorAll(".ss-nav-link").forEach(n => n.classList.remove("active"));
    if(el) el.classList.add("active");
    renderView();
  }
  function renderView(){
    if(view === "home")    renderHome();
    if(view === "library") renderLibrary();
    if(view === "store")   renderStore();
  }

  /* ══ HOME ══════════════════════════════════════════ */
  function renderHome(){
    const ug    = JSON.parse(localStorage.getItem("pot_ugames") || "[]");
    const instL = Object.values(installed);
    const newG  = [...games].sort(() => Math.random() - .5).slice(0, 18);
    const recG  = games.filter(g => g.featured || (g.special||[]).includes("popular")).slice(0, 12);

    setViewHtml(`<div class="ss-home">
      <h1 class="ss-big-title">Upload Title</h1>
      <p class="ss-sub">Install package via USB/HTML</p>
      <button class="ss-media-btn" onclick="document.getElementById('file-inp').click()">
        <i class="fas fa-download"></i> Install Media
      </button>

      <div class="ss-home-sec">
        <div class="ss-sec-label">Your Games</div>
        <div class="ss-your-row" id="ss-your-row">
          <div class="ss-add-card" onclick="document.getElementById('file-inp').click()">
            <i class="fas fa-plus"></i>
          </div>
          ${instL.map(g => `
            <div class="ss-yt-card" onclick="SpudStore.launch(${g.id})" title="${g.name}">
              <img src="${g.cover}" onerror="this.style.display='none'" loading="lazy">
              <div class="ss-yt-name">${g.name}</div>
              <button class="ss-yt-del" onclick="event.stopPropagation();SpudStore.uninstall(${g.id})">×</button>
            </div>`).join("")}
          ${ug.map(g => `
            <div class="ss-yt-card" onclick="SpudStore.launchUser('${g.id}')" title="${g.name}">
              <div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:28px">🎮</div>
              <div class="ss-yt-name">${g.name}</div>
              <button class="ss-yt-del" onclick="event.stopPropagation();SpudStore.removeUser('${g.id}')">×</button>
            </div>`).join("")}
        </div>
      </div>

      ${games.length ? `
      <div class="ss-home-sec">
        <div class="ss-sec-label">Try Something New!</div>
        <div class="ss-new-row">
          ${newG.map(g => `
            <div class="ss-new-thumb" onclick="SpudStore.installGame(${g.id},null)" title="${g.name}">
              <img src="${coverUrl(g)}" loading="lazy" onerror="this.style.background='#1a1a1a'">
            </div>`).join("")}
        </div>
      </div>

      <div class="ss-home-sec">
        <div class="ss-sec-label">What We Recommend</div>
        <div class="ss-rec-grid">
          ${recG.map(g => `
            <div class="ss-rec-card" onclick="SpudStore.installGame(${g.id},null)">
              <img src="${coverUrl(g)}" loading="lazy" onerror="this.style.background='#1a1a1a'">
              <div class="ss-rec-body">
                <div class="ss-rec-name">${g.name}</div>
                <div class="ss-rec-tags">${tags(g)}</div>
              </div>
            </div>`).join("")}
        </div>
      </div>` : `<div style="color:rgba(255,255,255,0.3);font-size:13px;margin-top:20px">Loading game catalog...</div>`}
    </div>`);
  }

  /* ══ LIBRARY ════════════════════════════════════════ */
  function renderLibrary(){
    const instL = Object.values(installed);
    if(!instL.length){
      setViewHtml(`<div class="ss-loading">
        <div style="font-size:52px">📦</div>
        <p>No games installed</p>
        <p style="font-size:11px;opacity:0.5">Go to Play Store and hit GET</p>
      </div>`);
      return;
    }
    const sel   = libSel || instL[0];
    const selG  = games.find(g => g.id == sel.id);
    setViewHtml(`<div class="ss-library">
      <div class="ss-lib-hero" style="background-image:url('${sel.cover}')">
        <div class="ss-lib-hero-ov"></div>
        <div class="ss-lib-hero-body">
          <h1 class="ss-lib-hero-title">${sel.name}</h1>
          <p class="ss-lib-hero-sub">Potato Collection • ${selG ? tags(selG) : "Classic"}</p>
          <button class="ss-lib-hero-btn" onclick="SpudStore.launch(${sel.id})">
            ▶ Play Now
          </button>
        </div>
      </div>
      <div class="ss-lib-grid-wrap">
        <div class="ss-sec-label" style="margin-bottom:12px">Library</div>
        <div class="ss-lib-grid">
          ${instL.map(g => `
            <div class="ss-lib-card ${g.id == sel.id ? "sel" : ""}"
                 onclick="SpudStore.selectLib(${g.id})">
              <img src="${g.cover}" loading="lazy" onerror="this.style.background='#1a1a1a'">
            </div>`).join("")}
        </div>
      </div>
    </div>`);
  }

  function selectLib(id){
    libSel = installed[String(id)];
    if(libSel) renderLibrary();
  }

  /* ══ PLAY STORE ═════════════════════════════════════ */
  function renderStore(){
    if(!games.length){
      setViewHtml(`<div class="ss-loading"><div class="ss-loading-spin">⏳</div><p>Loading...</p></div>`);
      return;
    }
    const feat    = games.filter(g => g.featured || (g.special||[]).includes("popular"));
    const featG   = feat[Math.floor(Math.random() * (feat.length || 1))] || games[0];
    const randG   = games[Math.floor(Math.random() * games.length)];
    const trending = [...games].sort(() => Math.random() - .5).slice(0, 14);

    setViewHtml(`<div class="ss-store">
      <!-- Hero row -->
      <div class="ss-store-top">
        <div class="ss-feat" style="background-image:url('${coverUrl(featG)}')">
          <div class="ss-feat-ov"></div>
          <div class="ss-feat-body">
            <div class="ss-feat-badge">FEATURED TITLE</div>
            <h2 class="ss-feat-title">${featG.name}</h2>
            <p class="ss-feat-sub">Available Now • PS5 Enhanced</p>
            <button class="ss-store-feat-btn ${isIn(featG.id) ? "open" : "get"}"
                    data-gid="${featG.id}"
                    onclick="SpudStore.installGame(${featG.id}, this)">
              ${isIn(featG.id) ? "OPEN" : "GET"}
            </button>
          </div>
        </div>
        <div class="ss-rand-widget" onclick="SpudStore.installGame(${randG.id}, document.querySelector('[data-gid=\\'rand\\']'))">
          <div class="ss-rand-img" style="background-image:url('${coverUrl(randG)}')"></div>
          <div class="ss-rand-body">
            <div class="ss-rand-title"><i class="fas fa-dice"></i> Random Game</div>
            <div class="ss-rand-sub">Can't decide? Click to instantly grab the game shown!</div>
            <button style="display:none" data-gid="rand" class="ss-store-btn get"></button>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div style="padding:0 28px 18px;display:flex;align-items:center;gap:10px">
        <div style="position:relative">
          <i class="fas fa-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.35);font-size:12px;pointer-events:none"></i>
          <input id="ss-q" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:7px 12px 7px 30px;color:#fff;font-family:inherit;font-size:12px;outline:none;user-select:text;width:260px"
                 placeholder="Search games..." oninput="SpudStore.search(this.value)" autocomplete="off">
        </div>
      </div>

      <!-- Trending -->
      <div class="ss-store-sec">
        <h2 class="ss-store-sec-title">Trending Now</h2>
        <div class="ss-store-grid" id="ss-trend-grid">
          ${trending.map(g => storeCard(g)).join("")}
        </div>
      </div>

      <!-- All -->
      <div class="ss-store-sec">
        <h2 class="ss-store-sec-title">All Games</h2>
        <div class="ss-store-grid" id="ss-all-grid">
          ${games.map(g => storeCard(g)).join("")}
        </div>
      </div>
    </div>`);
  }

  function storeCard(g){
    const inst = isIn(g.id);
    return `<div class="ss-card">
      <div class="ss-card-img" onclick="SpudStore.installGame(${g.id}, this.parentNode.querySelector('.ss-store-btn'))">
        <img src="${coverUrl(g)}" loading="lazy" onerror="this.style.background='#222'">
      </div>
      <div class="ss-card-foot">
        <div>
          <div class="ss-card-name">${g.name}</div>
          <div class="ss-card-type">Game</div>
        </div>
        <button class="ss-store-btn ${inst ? "open" : "get"}" data-gid="${g.id}"
                onclick="SpudStore.installGame(${g.id}, this)">
          ${inst ? "OPEN" : "GET"}
        </button>
      </div>
    </div>`;
  }

  function search(q){
    const grid = document.getElementById("ss-all-grid");
    if(!grid) return;
    const hits = q ? games.filter(g => g.name.toLowerCase().includes(q.toLowerCase())) : games;
    grid.innerHTML = hits.map(g => storeCard(g)).join("");
  }

  /* ══ BUILD ══════════════════════════════════════════ */
  function build(container, cfg){
    container.innerHTML = `
      <div id="ss-shell">
        <div class="ss-nav">
          <span class="ss-nav-link active" onclick="SpudStore.switchView('home',this)">Home</span>
          <span class="ss-nav-link" onclick="SpudStore.switchView('library',this)">Game Library</span>
          <span class="ss-nav-link" onclick="SpudStore.switchView('store',this)">Play Store</span>
          <span class="ss-nav-link" onclick="SpudStore.switchView('store',document.querySelector('.ss-nav-link:nth-child(3)'));setTimeout(()=>document.getElementById('ss-q')?.focus(),100)">
            <i class="fas fa-search"></i> Search
          </span>
          <div class="ss-nav-r">
            <i class="fas fa-cog" onclick="OS.openApp('settings')" style="cursor:pointer"></i>
            <span id="ss-clock">12:00 PM</span>
          </div>
        </div>
        <div id="ss-view-area"></div>
      </div>`;

    injectStyles(container);
    tickClock(); setInterval(tickClock, 1000);
    renderHome();
    loadCatalog();
  }

  function tickClock(){
    const n=new Date(),h=n.getHours(),m=n.getMinutes(),ap=h>=12?"PM":"AM";
    const el=document.getElementById("ss-clock");
    if(el)el.textContent=`${String(h%12||12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ap}`;
  }

  function injectStyles(container){
    const s = document.createElement("style");
    s.textContent = `
    #ss-shell{width:100%;height:100%;background:#000;display:flex;flex-direction:column;font-family:'Space Grotesk',system-ui,sans-serif;color:#fff;overflow:hidden}
    .ss-nav{height:50px;display:flex;align-items:center;padding:0 28px;gap:26px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.07)}
    .ss-nav-link{font-size:14px;font-weight:600;color:rgba(255,255,255,0.45);cursor:pointer;border-bottom:2px solid transparent;padding-bottom:2px;transition:all 0.2s;white-space:nowrap;display:flex;align-items:center;gap:6px}
    .ss-nav-link:hover{color:#fff}.ss-nav-link.active{color:#fff;border-bottom-color:#fff}
    .ss-nav-r{margin-left:auto;display:flex;align-items:center;gap:14px;color:rgba(255,255,255,0.45);font-size:14px}
    #ss-clock{font-weight:700;color:#fff}
    #ss-view-area{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.12) transparent}
    /* Loading */
    .ss-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;color:rgba(255,255,255,0.35);text-align:center;padding:20px}
    .ss-loading p{font-size:13px}.ss-loading-spin{font-size:44px}
    .ss-retry-btn{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:8px 20px;border-radius:7px;cursor:pointer;font-family:inherit;font-size:13px;margin-top:8px;display:flex;align-items:center;gap:7px}
    .ss-retry-btn:hover{background:rgba(255,255,255,0.15)}
    /* Home */
    .ss-home{padding:28px;max-width:1400px}
    .ss-big-title{font-size:2.6rem;font-weight:800;margin-bottom:5px}
    .ss-sub{font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:16px}
    .ss-media-btn{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:10px 22px;border-radius:30px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:inherit;margin-bottom:36px}
    .ss-media-btn:hover{background:rgba(255,255,255,0.18)}
    .ss-home-sec{margin-bottom:36px}
    .ss-sec-label{font-size:1.05rem;font-weight:700;margin-bottom:12px;text-decoration:underline;text-underline-offset:3px}
    .ss-your-row{display:flex;gap:11px;flex-wrap:wrap}
    .ss-add-card{width:124px;height:124px;border:2px solid rgba(255,255,255,0.13);border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;flex-shrink:0}
    .ss-add-card:hover{border-color:rgba(255,255,255,0.35);background:rgba(255,255,255,0.04)}
    .ss-add-card i{font-size:24px;color:rgba(255,255,255,0.4)}
    .ss-yt-card{width:124px;position:relative;cursor:pointer;border-radius:11px;overflow:hidden;border:2px solid transparent;transition:all 0.2s;flex-shrink:0}
    .ss-yt-card:hover{border-color:rgba(255,255,255,0.28);transform:translateY(-3px)}
    .ss-yt-card img{width:124px;height:124px;object-fit:cover;display:block;background:#1a1a1a}
    .ss-yt-name{font-size:10px;color:rgba(255,255,255,0.6);text-align:center;padding:5px;background:rgba(0,0,0,0.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ss-yt-del{position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.75);border:none;color:#ff5555;width:20px;height:20px;border-radius:50%;font-size:13px;cursor:pointer;display:none;align-items:center;justify-content:center;line-height:1}
    .ss-yt-card:hover .ss-yt-del{display:flex}
    .ss-new-row{display:flex;gap:8px;overflow-x:auto;padding:4px 0 10px;scrollbar-width:none}
    .ss-new-row::-webkit-scrollbar{display:none}
    .ss-new-thumb{width:108px;height:108px;border-radius:10px;overflow:hidden;flex-shrink:0;cursor:pointer;border:2px solid transparent;transition:all 0.2s}
    .ss-new-thumb:hover{border-color:rgba(255,255,255,0.3);transform:scale(1.06)}
    .ss-new-thumb img{width:100%;height:100%;object-fit:cover;display:block;background:#1a1a1a}
    .ss-rec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:13px}
    .ss-rec-card{border-radius:10px;overflow:hidden;cursor:pointer;background:#111;border:1px solid rgba(255,255,255,0.07);transition:all 0.2s}
    .ss-rec-card:hover{border-color:rgba(255,255,255,0.2);transform:translateY(-4px)}
    .ss-rec-card img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#1a1a1a}
    .ss-rec-body{padding:7px 9px}.ss-rec-name{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ss-rec-tags{font-size:10px;color:rgba(255,255,255,0.38);margin-top:2px}
    /* Library */
    .ss-library{display:flex;flex-direction:column;height:100%;overflow:hidden}
    .ss-lib-hero{height:56vh;min-height:370px;position:relative;background-size:cover;background-position:center;display:flex;align-items:flex-end;flex-shrink:0}
    .ss-lib-hero-ov{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.96) 0%,rgba(0,0,0,0.5) 45%,transparent 100%)}
    .ss-lib-hero-body{position:relative;z-index:2;padding:26px 34px;max-width:600px}
    .ss-lib-hero-title{font-size:2.2rem;font-weight:800;margin-bottom:5px}
    .ss-lib-hero-sub{font-size:12px;color:rgba(255,255,255,0.45);margin-bottom:14px}
    .ss-lib-hero-btn{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.22);color:#fff;padding:10px 22px;border-radius:30px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:inherit}
    .ss-lib-hero-btn:hover{background:rgba(255,255,255,0.22)}
    .ss-lib-grid-wrap{padding:22px 28px;overflow-y:auto}
    .ss-lib-grid{display:flex;gap:9px;flex-wrap:wrap}
    .ss-lib-card{width:115px;height:115px;border-radius:9px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all 0.2s;flex-shrink:0}
    .ss-lib-card:hover{border-color:rgba(255,255,255,0.3);transform:scale(1.05)}
    .ss-lib-card.sel{border-color:#fff!important}
    .ss-lib-card img{width:100%;height:100%;object-fit:cover;display:block;background:#1a1a1a}
    /* Play Store */
    .ss-store{padding-bottom:40px}
    .ss-store-top{display:grid;grid-template-columns:1fr 360px;height:270px;margin-bottom:28px}
    .ss-feat{position:relative;background-size:cover;background-position:center;overflow:hidden;display:flex;align-items:flex-end}
    .ss-feat-ov{position:absolute;inset:0;background:linear-gradient(to right,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.4) 60%,transparent 100%)}
    .ss-feat-body{position:relative;z-index:2;padding:26px 30px;max-width:460px}
    .ss-feat-badge{font-size:10px;color:#6ab4ff;letter-spacing:2px;font-weight:700;margin-bottom:7px}
    .ss-feat-title{font-size:1.9rem;font-weight:800;margin-bottom:5px}
    .ss-feat-sub{font-size:12px;color:rgba(255,255,255,0.45);margin-bottom:13px}
    .ss-store-feat-btn{border:none;padding:9px 24px;border-radius:5px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;transition:all 0.2s;letter-spacing:0.5px}
    .ss-store-feat-btn.get{background:#fff;color:#000}.ss-store-feat-btn.get:hover{background:rgba(255,255,255,0.85)}
    .ss-store-feat-btn.open{background:#fff;color:#000}
    .ss-rand-widget{background:#111;border:2px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;overflow:hidden;cursor:pointer;transition:border-color 0.2s}
    .ss-rand-widget:hover{border-color:rgba(255,255,255,0.25)}
    .ss-rand-img{flex:1;background-size:cover;background-position:center;min-height:0}
    .ss-rand-body{padding:13px 15px;flex-shrink:0;background:#0a0a0a}
    .ss-rand-title{font-size:13px;font-weight:700;margin-bottom:3px;display:flex;align-items:center;gap:7px}
    .ss-rand-sub{font-size:10px;color:rgba(255,255,255,0.38)}
    .ss-store-sec{padding:0 28px;margin-bottom:32px}
    .ss-store-sec-title{font-size:1.3rem;font-weight:700;margin-bottom:14px}
    .ss-store-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:13px}
    .ss-card{background:#111;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);transition:all 0.2s}
    .ss-card:hover{border-color:rgba(255,255,255,0.18);transform:translateY(-4px);box-shadow:0 10px 28px rgba(0,0,0,0.5)}
    .ss-card-img{cursor:pointer;overflow:hidden}
    .ss-card-img img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#1a1a1a;transition:transform 0.3s}
    .ss-card:hover .ss-card-img img{transform:scale(1.06)}
    .ss-card-foot{padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px}
    .ss-card-name{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
    .ss-card-type{font-size:10px;color:rgba(255,255,255,0.35)}
    .ss-store-btn{flex-shrink:0;padding:4px 12px;border-radius:5px;font-size:11px;font-weight:800;cursor:pointer;border:none;font-family:inherit;transition:all 0.2s}
    .ss-store-btn.get{background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.22)}.ss-store-btn.get:hover{background:rgba(255,255,255,0.2)}
    .ss-store-btn.open{background:#fff;color:#000}.ss-store-btn.open:hover{background:rgba(255,255,255,0.85)}
    .ss-store-btn.installing{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1);cursor:not-allowed}
    `;
    container.appendChild(s);
  }

  return { build, reload: loadCatalog, switchView, installGame, launch, launchUser, selectLib, uninstall, removeUser, search };
})();
window.SpudStore = SpudStore;
