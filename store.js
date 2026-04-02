/* POTATO-OS — Spud Store  |  Rebuilt to match CineOS Play Store layout
   Home: Upload + Your Games + Try Something New + Recommend
   Play Store: Featured hero + Random Game widget + Trending grid
   Game Library: Hero view of selected game + installed grid
*/
"use strict";

const SpudStore = (() => {
  const CDN = {
    covers: "https://cdn.jsdelivr.net/gh/gn-math/covers@main",
    html:   "https://cdn.jsdelivr.net/gh/gn-math/html@main",
  };

  let games     = [];
  let installed = JSON.parse(localStorage.getItem("pot_installed") || "{}");
  let userGames = [];
  let view      = "home";
  let libSelect = null;   // selected game in library
  let cfg       = {};

  /* ── helpers ─────────────────────────────────────────── */
  function res(u){ return (u||"").replace("{COVER_URL}",CDN.covers).replace("{HTML_URL}",CDN.html); }
  function isIn(id){ return !!installed[String(id)]; }
  function save(){ localStorage.setItem("pot_installed", JSON.stringify(installed)); }
  function saveHtml(id,html){ try{ localStorage.setItem("pot_html_"+id, html); }catch(_){ const ks=Object.keys(localStorage).filter(k=>k.startsWith("pot_html_")); if(ks.length){ localStorage.removeItem(ks[0]); localStorage.setItem("pot_html_"+id,html); } } }
  function getHtml(id){ return localStorage.getItem("pot_html_"+id); }
  function tags(g){ return (g.special||[]).slice(0,2).map(t=>t.charAt(0).toUpperCase()+t.slice(1)).join(" • "); }
  function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  /* ── fetch catalog ────────────────────────────────────── */
  async function loadCatalog(){
    const urls = [cfg.zones||"/zones", "https://cdn.jsdelivr.net/gh/gn-math/assets@latest/zones.json"];
    for(const url of urls){
      try{
        const ctrl=new AbortController(), tid=setTimeout(()=>ctrl.abort(),12000);
        const r=await fetch(url,{signal:ctrl.signal}); clearTimeout(tid);
        if(!r.ok) continue;
        const data=await r.json();
        if(Array.isArray(data)&&data.length>0){
          games=data;
          renderView();
          OS.notify("Spud Store",`${games.length} games available`,"🎮");
          return;
        }
      }catch(_){}
    }
    showLoadErr();
  }

  function showLoadErr(){
    const el=document.getElementById("ss-view-area");
    if(!el)return;
    el.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;color:rgba(255,255,255,0.3)">
      <div style="font-size:52px">📡</div>
      <div style="font-size:14px">Catalog unavailable</div>
      <button onclick="SpudStore.reload()" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:8px 20px;border-radius:7px;cursor:pointer;font-size:13px;font-family:inherit">
        <i class="fas fa-redo" style="margin-right:6px"></i>Retry
      </button></div>`;
  }

  /* ── install a game ───────────────────────────────────── */
  async function install(id, btnEl){
    if(isIn(id)){ launch(id); return; }
    const game=games.find(g=>g.id==id); if(!game) return;

    if(btnEl){ btnEl.textContent="..."; btnEl.className="ss-store-btn installing"; }

    const urls=[
      `/game?id=${id}`,
      `${CDN.html}/${id}.html`,
    ];

    let html=null;
    for(const url of urls){
      try{
        const r=await fetch(url,{signal:AbortSignal.timeout(14000)});
        if(!r.ok) continue;
        const t=await r.text();
        if(!t.trim().startsWith("Couldn't")&&t.length>80){ html=t; break; }
      }catch(_){}
    }

    if(!html){
      if(btnEl){ btnEl.textContent="Retry"; btnEl.className="ss-store-btn get"; }
      OS.notify("Failed",`Could not download "${game.name}"`,"⚠️");
      return;
    }

    saveHtml(id, html);
    installed[String(id)]={ id:game.id, name:game.name, cover:res(game.cover) };
    save();

    if(btnEl){ btnEl.textContent="OPEN"; btnEl.className="ss-store-btn open"; btnEl.onclick=()=>launch(id); }

    // "X added to Library!" notification like in screenshot
    OS.notify(game.name+" added to Library!","","✅");

    // refresh library view if active
    if(view==="library") renderLibrary();
    // update rp panel
    const rp=document.getElementById("rp-game-name"); if(rp) rp.textContent=game.name;
    localStorage.setItem("pot_last_game",JSON.stringify({id,name:game.name}));
  }

  /* ── launch ───────────────────────────────────────────── */
  function launch(id){
    const html=getHtml(String(id));
    const game=installed[String(id)];
    if(!html||!game){ OS.notify("Error","Game data missing — reinstall.","⚠️"); return; }
    const fs=document.getElementById("game-fs"), nm=document.getElementById("gfs-name"), ifr=document.getElementById("game-iframe");
    if(!fs||!ifr)return;
    if(nm) nm.textContent=game.name.toUpperCase();
    fs.style.display="flex";
    ifr.contentDocument.open(); ifr.contentDocument.write(html); ifr.contentDocument.close();
    localStorage.setItem("pot_last_game",JSON.stringify({id,name:game.name}));
    const rp=document.getElementById("rp-game-name"); if(rp) rp.textContent=game.name;
    // set as library selection
    libSelect=games.find(g=>g.id==id)||game;
  }

  function launchUser(id){
    const html=localStorage.getItem("pot_html_"+id);
    const meta=userGames.find(g=>g.id===id);
    if(!html){OS.notify("Error","Game data missing.","⚠️");return;}
    const fs=document.getElementById("game-fs"),nm=document.getElementById("gfs-name"),ifr=document.getElementById("game-iframe");
    if(!fs||!ifr)return;
    if(nm)nm.textContent=(meta?.name||"Custom Game").toUpperCase();
    fs.style.display="flex";
    ifr.contentDocument.open();ifr.contentDocument.write(html);ifr.contentDocument.close();
  }

  function removeUser(id){
    userGames=userGames.filter(g=>g.id!==id);
    localStorage.removeItem("pot_html_"+id);
    localStorage.setItem("pot_ugames",JSON.stringify(userGames.map(g=>({id:g.id,name:g.name}))));
    renderHome();
  }

  /* ── nav switch ───────────────────────────────────────── */
  function switchView(v, el){
    view=v;
    document.querySelectorAll(".ss-nav-link").forEach(n=>n.classList.toggle("active",n===el));
    renderView();
  }

  function renderView(){
    if(view==="home")    renderHome();
    if(view==="library") renderLibrary();
    if(view==="store")   renderStore();
  }

  /* ══════════════════════════════════════════
     HOME VIEW
     ══════════════════════════════════════════ */
  function renderHome(){
    const area=document.getElementById("ss-view-area"); if(!area)return;
    const newGames=[...games].sort(()=>Math.random()-.5).slice(0,16);
    const recGames=games.filter(g=>g.featured||(g.special||[]).includes("popular")).slice(0,12);

    // User games list (stored locally)
    const storedMeta=JSON.parse(localStorage.getItem("pot_ugames")||"[]");
    userGames=storedMeta;

    area.innerHTML=`
      <div class="ss-home">
        <!-- Upload -->
        <div class="ss-home-section">
          <h1 class="ss-big-title">Upload Title</h1>
          <p class="ss-subtitle">Install package via USB/HTML</p>
          <button class="ss-install-media-btn" onclick="document.getElementById('file-inp').click()">
            <i class="fas fa-download"></i> Install Media
          </button>
        </div>

        <!-- Your Games -->
        <div class="ss-home-section">
          <div class="ss-section-label">Your Games</div>
          <div class="ss-your-games-row" id="ss-your-games">
            <div class="ss-add-card" onclick="document.getElementById('file-inp').click()">
              <i class="fas fa-plus"></i>
            </div>
            ${Object.values(installed).map(g=>`
              <div class="ss-lib-thumb-card" onclick="SpudStore.launchById(${g.id})" title="${g.name}">
                <img src="${g.cover}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" loading="lazy">
                <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:26px">🎮</div>
                <div class="ss-lib-thumb-name">${g.name}</div>
              </div>`).join("")}
            ${userGames.map(g=>`
              <div class="ss-lib-thumb-card" onclick="SpudStore.launchUser('${g.id}')" title="${g.name}">
                <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px">🎮</div>
                <div class="ss-lib-thumb-name">${g.name}</div>
                <button class="ss-lib-del" onclick="event.stopPropagation();SpudStore.removeUser('${g.id}')">×</button>
              </div>`).join("")}
          </div>
        </div>

        <!-- Try Something New -->
        <div class="ss-home-section">
          <div class="ss-section-label">Try Something New!</div>
          ${games.length===0?`<div style="color:rgba(255,255,255,0.3);font-size:13px;padding:10px 0">Loading catalog...</div>`:`
          <div class="ss-new-row">
            ${newGames.map(g=>`
              <div class="ss-new-thumb" onclick="SpudStore.launchById(${g.id})" title="${g.name}">
                <img src="${res(g.cover)}" loading="lazy" onerror="this.style.background='#1a1a1a'">
              </div>`).join("")}
          </div>`}
        </div>

        <!-- What We Recommend -->
        ${games.length>0?`
        <div class="ss-home-section">
          <div class="ss-section-label">What We Recommend</div>
          <div class="ss-rec-grid">
            ${recGames.map(g=>`
              <div class="ss-rec-card" onclick="SpudStore.launchById(${g.id})">
                <img src="${res(g.cover)}" loading="lazy" onerror="this.style.background='#1a1a1a'">
                <div class="ss-rec-info">
                  <div class="ss-rec-name">${g.name}</div>
                  <div class="ss-rec-tags">${tags(g)}</div>
                </div>
              </div>`).join("")}
          </div>
        </div>`:""}
      </div>`;
  }

  /* ══════════════════════════════════════════
     GAME LIBRARY VIEW
     ══════════════════════════════════════════ */
  function renderLibrary(){
    const area=document.getElementById("ss-view-area"); if(!area) return;
    const instList=Object.values(installed);
    const sel=libSelect || instList[0] || null;

    if(!instList.length){
      area.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:rgba(255,255,255,0.3)">
        <div style="font-size:52px">📦</div>
        <div style="font-size:14px">No games installed yet</div>
        <div style="font-size:12px;opacity:0.6">Go to Play Store and GET a game</div></div>`;
      return;
    }

    const selCover=sel?.cover||"";
    const selName=sel?.name||"";
    const selGame=games.find(g=>g.id==sel?.id);
    const selTags=selGame?tags(selGame):"Classic";

    area.innerHTML=`
      <div class="ss-library">
        <!-- Hero -->
        <div class="ss-lib-hero" style="background-image:url('${selCover}')">
          <div class="ss-lib-hero-overlay"></div>
          <div class="ss-lib-hero-content">
            <h1 class="ss-lib-hero-title">${selName}</h1>
            <p class="ss-lib-hero-sub">Noah's Collection • ${selTags||"Classic"}</p>
            <button class="ss-lib-hero-btn" onclick="SpudStore.launchById(${sel?.id})">
              <i class="fas fa-plus"></i> Add to Home
            </button>
          </div>
        </div>
        <!-- Library grid -->
        <div class="ss-lib-grid-wrap">
          <div class="ss-section-label" style="padding:0 0 12px">Library</div>
          <div class="ss-lib-grid">
            ${instList.map(g=>`
              <div class="ss-lib-card ${g.id==sel?.id?"ss-lib-card-sel":""}"
                   onclick="SpudStore.selectLib(${g.id})">
                <img src="${g.cover}" loading="lazy" onerror="this.style.background='#1a1a1a'">
              </div>`).join("")}
          </div>
        </div>
      </div>`;
  }

  function selectLib(id){
    const g=installed[String(id)];
    if(!g)return;
    libSelect=g;
    renderLibrary();
  }

  function launchById(id){
    if(isIn(id)){ launch(id); return; }
    // Not installed — go to store and find it
    const g=games.find(x=>x.id==id);
    if(g){ switchView("store",document.querySelector('.ss-nav-link[data-v="store"]')); }
  }

  /* ══════════════════════════════════════════
     PLAY STORE VIEW
     ══════════════════════════════════════════ */
  function renderStore(){
    const area=document.getElementById("ss-view-area"); if(!area)return;
    if(!games.length){
      area.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.3);font-size:14px">Loading catalog...</div>`;
      return;
    }

    const featured=rand(games.filter(g=>g.featured||(g.special||[]).includes("popular"))||games);
    const randomGame=rand(games);
    const trending=[...games].sort(()=>Math.random()-.5).slice(0,14);
    const allGames=[...games];

    area.innerHTML=`
      <div class="ss-store">
        <!-- Top row: featured hero + random widget -->
        <div class="ss-store-top">
          <!-- Featured -->
          <div class="ss-store-featured" style="background-image:url('${res(featured.cover)}')">
            <div class="ss-store-feat-overlay"></div>
            <div class="ss-store-feat-content">
              <div class="ss-store-feat-badge">FEATURED TITLE</div>
              <h2 class="ss-store-feat-title">${featured.name}</h2>
              <p class="ss-store-feat-sub">Available Now • PS5 Enhanced</p>
              <button class="ss-store-feat-btn" id="feat-btn-${featured.id}"
                      onclick="SpudStore.installFromStore(${featured.id},this)">
                ${isIn(featured.id)?"OPEN":"GET"}
              </button>
            </div>
          </div>
          <!-- Random Game widget -->
          <div class="ss-random-widget" onclick="SpudStore.installFromStore(${randomGame.id},this.querySelector('.ss-store-btn'))" style="cursor:pointer">
            <div class="ss-random-img" style="background-image:url('${res(randomGame.cover)}')"></div>
            <div class="ss-random-info">
              <div class="ss-random-title"><i class="fas fa-dice" style="margin-right:8px"></i>Random Game</div>
              <div class="ss-random-sub">Can't decide? Click to instantly grab the game shown!</div>
              <button class="ss-store-btn ${isIn(randomGame.id)?"open":"get"}" style="display:none"
                      id="rand-btn-${randomGame.id}"></button>
            </div>
          </div>
        </div>

        <!-- Search bar -->
        <div class="ss-store-search-wrap">
          <div style="position:relative;width:280px">
            <i class="fas fa-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.35);font-size:12px;pointer-events:none"></i>
            <input id="ss-store-q" style="width:100%;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:7px 11px 7px 30px;color:#fff;font-family:inherit;font-size:12px;outline:none;user-select:text"
                   placeholder="Search games..." oninput="SpudStore.storeSearch(this.value)" autocomplete="off">
          </div>
        </div>

        <!-- Trending Now -->
        <div class="ss-store-section">
          <h2 class="ss-store-section-title">Trending Now</h2>
          <div class="ss-store-grid" id="ss-trending-grid">
            ${trending.map(g=>storeCard(g)).join("")}
          </div>
        </div>

        <!-- All Games -->
        <div class="ss-store-section">
          <h2 class="ss-store-section-title">All Games</h2>
          <div class="ss-store-grid" id="ss-all-grid">
            ${allGames.map(g=>storeCard(g)).join("")}
          </div>
        </div>
      </div>`;
  }

  function storeCard(g){
    const inst=isIn(g.id);
    return `
      <div class="ss-card">
        <div class="ss-card-img-wrap" onclick="SpudStore.installFromStore(${g.id},this.closest('.ss-card').querySelector('.ss-store-btn'))">
          <img src="${res(g.cover)}" loading="lazy" onerror="this.closest('.ss-card-img-wrap').style.background='#1a1a1a'">
        </div>
        <div class="ss-card-body">
          <div class="ss-card-name">${g.name}</div>
          <div class="ss-card-tags">Game</div>
          <button class="ss-store-btn ${inst?"open":"get"}" id="btn-${g.id}"
                  onclick="SpudStore.installFromStore(${g.id},this)">
            ${inst?"OPEN":"GET"}
          </button>
        </div>
      </div>`;
  }

  async function installFromStore(id, btnEl){
    if(isIn(id)){ launch(id); return; }
    const game=games.find(g=>g.id==id); if(!game) return;
    if(btnEl){ btnEl.textContent="..."; btnEl.classList.add("installing"); }

    const urls=[`/game?id=${id}`,`${CDN.html}/${id}.html`];
    let html=null;
    for(const url of urls){
      try{
        const r=await fetch(url,{signal:AbortSignal.timeout(14000)});
        if(!r.ok)continue;
        const t=await r.text();
        if(!t.trim().startsWith("Couldn't")&&t.length>80){html=t;break;}
      }catch(_){}
    }

    if(!html){
      if(btnEl){btnEl.textContent="GET";btnEl.classList.remove("installing");}
      OS.notify("Failed",`Could not download "${game.name}"`,"⚠️");
      return;
    }

    saveHtml(id,html);
    installed[String(id)]={id:game.id,name:game.name,cover:res(game.cover)};
    save();

    // Update ALL buttons for this game on screen
    document.querySelectorAll(`#btn-${id},#feat-btn-${id},#rand-btn-${id}`).forEach(b=>{
      if(b){b.textContent="OPEN";b.className="ss-store-btn open";b.onclick=()=>launch(id);}
    });

    OS.notify(game.name+" added to Library!","","✅");
    localStorage.setItem("pot_last_game",JSON.stringify({id,name:game.name}));
    const rp=document.getElementById("rp-game-name");if(rp)rp.textContent=game.name;
  }

  function storeSearch(q){
    const grid=document.getElementById("ss-all-grid"); if(!grid)return;
    const hits=q?games.filter(g=>g.name.toLowerCase().includes(q.toLowerCase())):games;
    grid.innerHTML=hits.map(g=>storeCard(g)).join("");
  }

  /* ── build panel ──────────────────────────────────────── */
  function build(container, config){
    cfg=config;
    CDN.covers=config.gnmath?.covers||CDN.covers;
    CDN.html=(config.gnmath?.html||"/game?id=").replace("/game?id=","").replace("undefined","");

    container.innerHTML=`
      <div id="spud-store-shell">
        <!-- Nav -->
        <div class="ss-nav">
          <span class="ss-nav-link active" data-v="home"    onclick="SpudStore.switchView('home',this)">Home</span>
          <span class="ss-nav-link"        data-v="library" onclick="SpudStore.switchView('library',this)">Game Library</span>
          <span class="ss-nav-link"        data-v="store"   onclick="SpudStore.switchView('store',this)">Play Store</span>
          <span class="ss-nav-link"        data-v="search"  onclick="SpudStore.switchView('store',document.querySelector('.ss-nav-link[data-v=store]'));document.getElementById('ss-store-q')?.focus()">
            <i class="fas fa-search" style="margin-right:5px"></i>Search
          </span>
          <div class="ss-nav-right">
            <i class="fas fa-cog" onclick="OS.openApp('settings')" style="cursor:pointer;color:rgba(255,255,255,0.5);font-size:15px;transition:color 0.2s" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.5)'"></i>
            <i class="fas fa-mouse-pointer" style="color:rgba(255,255,255,0.4);font-size:14px"></i>
            <i class="fas fa-user-circle" style="color:rgba(255,255,255,0.5);font-size:16px"></i>
            <span id="ss-clock" style="font-size:14px;font-weight:600;color:#fff;font-family:inherit">12:00 PM</span>
          </div>
        </div>
        <!-- View area -->
        <div id="ss-view-area"></div>
      </div>`;

    // Inline styles for the store
    const style=document.createElement("style");
    style.textContent=`
      #spud-store-shell{width:100%;height:100%;background:#000;display:flex;flex-direction:column;font-family:'Space Grotesk',system-ui,sans-serif;color:#fff}
      .ss-nav{height:52px;display:flex;align-items:center;padding:0 32px;gap:28px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.06);position:relative}
      .ss-nav-link{font-size:14px;font-weight:600;color:rgba(255,255,255,0.5);cursor:pointer;padding-bottom:2px;border-bottom:2px solid transparent;transition:all 0.2s;white-space:nowrap}
      .ss-nav-link:hover{color:#fff}.ss-nav-link.active{color:#fff;border-bottom-color:#fff}
      .ss-nav-right{display:flex;align-items:center;gap:14px;margin-left:auto}
      #ss-view-area{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.12) transparent}
      #ss-view-area::-webkit-scrollbar{width:4px}
      #ss-view-area::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px}

      /* HOME */
      .ss-home{padding:32px;max-width:1400px}
      .ss-big-title{font-size:2.8rem;font-weight:800;margin-bottom:6px;color:#fff}
      .ss-subtitle{font-size:14px;color:rgba(255,255,255,0.4);margin-bottom:18px}
      .ss-install-media-btn{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 22px;border-radius:30px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:inherit}
      .ss-install-media-btn:hover{background:rgba(255,255,255,0.2)}
      .ss-home-section{margin-bottom:40px}
      .ss-section-label{font-size:1.1rem;font-weight:700;color:#fff;margin-bottom:14px;text-decoration:underline;text-underline-offset:3px}
      .ss-your-games-row{display:flex;gap:12px;flex-wrap:wrap}
      .ss-add-card{width:128px;height:128px;border:2px solid rgba(255,255,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s}
      .ss-add-card:hover{border-color:rgba(255,255,255,0.4);background:rgba(255,255,255,0.04)}
      .ss-add-card i{font-size:26px;color:rgba(255,255,255,0.4)}
      .ss-lib-thumb-card{width:128px;cursor:pointer;position:relative;border-radius:12px;overflow:hidden;border:2px solid transparent;transition:all 0.2s}
      .ss-lib-thumb-card:hover{border-color:rgba(255,255,255,0.3);transform:translateY(-3px)}
      .ss-lib-thumb-card img{width:128px;height:128px;object-fit:cover;display:block}
      .ss-lib-thumb-name{font-size:10px;color:rgba(255,255,255,0.6);text-align:center;padding:5px;background:rgba(0,0,0,0.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ss-lib-del{position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.75);border:none;color:#ff5555;width:20px;height:20px;border-radius:50%;font-size:13px;cursor:pointer;display:none;align-items:center;justify-content:center;line-height:1}
      .ss-lib-thumb-card:hover .ss-lib-del{display:flex}
      .ss-new-row{display:flex;gap:8px;overflow-x:auto;padding:4px 0 12px;scrollbar-width:none}
      .ss-new-row::-webkit-scrollbar{display:none}
      .ss-new-thumb{width:110px;height:110px;border-radius:10px;overflow:hidden;flex-shrink:0;cursor:pointer;border:2px solid transparent;transition:all 0.2s}
      .ss-new-thumb:hover{border-color:rgba(255,255,255,0.3);transform:scale(1.06)}
      .ss-new-thumb img{width:100%;height:100%;object-fit:cover;display:block}
      .ss-rec-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px}
      .ss-rec-card{border-radius:10px;overflow:hidden;cursor:pointer;background:#111;border:1px solid rgba(255,255,255,0.07);transition:all 0.2s}
      .ss-rec-card:hover{border-color:rgba(255,255,255,0.2);transform:translateY(-4px)}
      .ss-rec-card img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#1a1a1a}
      .ss-rec-info{padding:8px 10px}
      .ss-rec-name{font-size:12px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ss-rec-tags{font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px}

      /* LIBRARY */
      .ss-library{display:flex;flex-direction:column;height:100%}
      .ss-lib-hero{height:55vh;min-height:380px;position:relative;background-size:cover;background-position:center;display:flex;align-items:flex-end;flex-shrink:0}
      .ss-lib-hero-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.5) 40%,transparent 100%)}
      .ss-lib-hero-content{position:relative;z-index:2;padding:28px 36px;max-width:600px}
      .ss-lib-hero-title{font-size:2.4rem;font-weight:800;margin-bottom:6px}
      .ss-lib-hero-sub{font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:16px}
      .ss-lib-hero-btn{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px 22px;border-radius:30px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:inherit}
      .ss-lib-hero-btn:hover{background:rgba(255,255,255,0.2)}
      .ss-lib-grid-wrap{padding:24px 32px;flex:1;overflow-y:auto}
      .ss-lib-grid{display:flex;gap:10px;flex-wrap:wrap}
      .ss-lib-card{width:120px;height:120px;border-radius:10px;overflow:hidden;cursor:pointer;border:2px solid transparent;transition:all 0.2s;flex-shrink:0}
      .ss-lib-card:hover{border-color:rgba(255,255,255,0.3);transform:scale(1.05)}
      .ss-lib-card-sel{border-color:#fff!important}
      .ss-lib-card img{width:100%;height:100%;object-fit:cover;display:block;background:#1a1a1a}

      /* PLAY STORE */
      .ss-store{padding:0 0 40px}
      .ss-store-top{display:grid;grid-template-columns:1fr 380px;gap:0;height:280px;margin-bottom:32px}
      .ss-store-featured{position:relative;background-size:cover;background-position:center;display:flex;align-items:flex-end;overflow:hidden}
      .ss-store-feat-overlay{position:absolute;inset:0;background:linear-gradient(to right,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.4) 60%,transparent 100%)}
      .ss-store-feat-content{position:relative;z-index:2;padding:28px 32px;max-width:480px}
      .ss-store-feat-badge{font-size:10px;color:#6ab4ff;letter-spacing:2px;font-weight:700;text-transform:uppercase;margin-bottom:8px}
      .ss-store-feat-title{font-size:2rem;font-weight:800;margin-bottom:6px}
      .ss-store-feat-sub{font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:14px}
      .ss-store-feat-btn{background:#fff;border:none;color:#000;padding:9px 26px;border-radius:5px;font-size:14px;font-weight:800;cursor:pointer;transition:all 0.2s;letter-spacing:0.5px}
      .ss-store-feat-btn:hover{background:rgba(255,255,255,0.85)}
      .ss-random-widget{background:#111;border:2px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;overflow:hidden;transition:border-color 0.2s}
      .ss-random-widget:hover{border-color:rgba(255,255,255,0.25)}
      .ss-random-img{flex:1;background-size:cover;background-position:center;min-height:0}
      .ss-random-info{padding:14px 16px;flex-shrink:0;background:#0a0a0a}
      .ss-random-title{font-size:14px;font-weight:700;color:#fff;margin-bottom:4px}
      .ss-random-sub{font-size:11px;color:rgba(255,255,255,0.4)}
      .ss-store-search-wrap{padding:0 32px 20px;display:flex;gap:12px;align-items:center}
      .ss-store-section{padding:0 32px;margin-bottom:36px}
      .ss-store-section-title{font-size:1.4rem;font-weight:700;margin-bottom:16px;color:#fff}
      .ss-store-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:14px}
      .ss-card{background:#111;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);transition:all 0.2s}
      .ss-card:hover{border-color:rgba(255,255,255,0.18);transform:translateY(-4px);box-shadow:0 10px 28px rgba(0,0,0,0.5)}
      .ss-card-img-wrap{cursor:pointer;overflow:hidden}
      .ss-card-img-wrap img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#1a1a1a;transition:transform 0.3s}
      .ss-card:hover .ss-card-img-wrap img{transform:scale(1.06)}
      .ss-card-body{padding:9px 10px 10px;display:flex;align-items:center;gap:8px}
      .ss-card-name{flex:1;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
      .ss-card-tags{font-size:10px;color:rgba(255,255,255,0.35);display:none}
      .ss-store-btn{flex-shrink:0;padding:4px 13px;border-radius:5px;font-size:11px;font-weight:800;cursor:pointer;border:none;font-family:inherit;transition:all 0.2s;letter-spacing:0.5px}
      .ss-store-btn.get{background:rgba(255,255,255,0.12);color:#fff;border:1px solid rgba(255,255,255,0.25)}.ss-store-btn.get:hover{background:rgba(255,255,255,0.22)}
      .ss-store-btn.open{background:#fff;color:#000}.ss-store-btn.open:hover{background:rgba(255,255,255,0.85)}
      .ss-store-btn.installing{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.12);cursor:not-allowed}
    `;
    container.appendChild(style);

    // Clock
    setInterval(()=>{
      const n=new Date(),h=n.getHours(),m=n.getMinutes(),ampm=h>=12?"PM":"AM";
      const el=document.getElementById("ss-clock");
      if(el)el.textContent=`${String(h%12||12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ampm}`;
    },1000);

    renderHome();
    loadCatalog();
  }

  function reload(){ loadCatalog(); }

  return{build,reload,switchView,installFromStore,install,launch,launchById,launchUser,removeUser,selectLib,storeSearch};
})();
window.SpudStore=SpudStore;
