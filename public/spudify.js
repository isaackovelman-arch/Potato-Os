/* POTATO-OS — Spudify
   Embeds open.spotify.com in a full-window iframe with fade animation
   No fake player — just real Spotify with a branded entry screen
*/
"use strict";

const Spudify = (() => {
  function build(el, cfg) {
    el.style.cssText = "width:100%;height:100%;position:relative;background:#000;overflow:hidden";
    el.innerHTML = `
      <style>
        #spudify-wrap {
          width:100%;height:100%;display:flex;flex-direction:column;
          background:#000;font-family:'Space Grotesk',system-ui,sans-serif;
        }
        #spudify-topbar {
          height:44px;background:rgba(0,0,0,0.9);border-bottom:1px solid rgba(30,185,84,0.15);
          display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0;
          backdrop-filter:blur(10px);z-index:10;position:relative;
        }
        #spudify-logo {
          display:flex;align-items:center;gap:9px;text-decoration:none;
        }
        #spudify-logo img {
          width:26px;height:26px;border-radius:50%;
        }
        #spudify-logo span {
          font-family:'Space Mono',monospace;font-size:13px;font-weight:700;
          color:#1DB954;letter-spacing:2px;
        }
        #spudify-open-btn {
          margin-left:auto;
          background:#1DB954;border:none;color:#000;
          padding:6px 16px;border-radius:20px;
          font-size:12px;font-weight:700;cursor:pointer;
          font-family:inherit;transition:all 0.2s;
        }
        #spudify-open-btn:hover { background:#1ed760;transform:scale(1.04); }
        #spudify-frame {
          flex:1;border:none;width:100%;
          opacity:0;
          transition:opacity 1.2s ease;
        }
        #spudify-frame.loaded { opacity:1; }
        /* Loading overlay */
        #spudify-loading {
          position:absolute;inset:44px 0 0;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:18px;background:#000;
          transition:opacity 0.8s ease;z-index:5;
        }
        #spudify-loading.hidden { opacity:0;pointer-events:none; }
        #spudify-loading img { width:90px;height:90px;border-radius:50%;animation:spRotate 3s linear infinite; }
        @keyframes spRotate { to { transform:rotate(360deg); } }
        #spudify-loading p {
          font-size:14px;color:rgba(255,255,255,0.4);
          font-family:'Space Mono',monospace;letter-spacing:2px;
        }
        #spudify-loading .sp-bars {
          display:flex;gap:4px;align-items:flex-end;height:28px;
        }
        .sp-bar {
          width:4px;background:#1DB954;border-radius:2px;
          animation:spBar 1.2s ease-in-out infinite;
        }
        .sp-bar:nth-child(2){animation-delay:0.15s}
        .sp-bar:nth-child(3){animation-delay:0.3s}
        .sp-bar:nth-child(4){animation-delay:0.45s}
        .sp-bar:nth-child(5){animation-delay:0.6s}
        @keyframes spBar {
          0%,100%{height:6px;opacity:0.4}
          50%{height:28px;opacity:1}
        }
      </style>

      <div id="spudify-wrap">
        <div id="spudify-topbar">
          <div id="spudify-logo">
            <img src="img/spotify.webp" alt="Spotify">
            <span>SPUDIFY</span>
          </div>
          <button id="spudify-open-btn" onclick="window.open('https://open.spotify.com','_blank')">
            Open in Browser ↗
          </button>
        </div>

        <!-- Loading animation shown while Spotify loads -->
        <div id="spudify-loading">
          <img src="img/spotify.webp" alt="">
          <div class="sp-bars">
            <div class="sp-bar"></div>
            <div class="sp-bar"></div>
            <div class="sp-bar"></div>
            <div class="sp-bar"></div>
            <div class="sp-bar"></div>
          </div>
          <p>Connecting to Spudify...</p>
        </div>

        <iframe
          id="spudify-frame"
          src="https://open.spotify.com"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowfullscreen
          loading="lazy">
        </iframe>
      </div>`;

    // Fade in once iframe loads
    const frame   = el.querySelector("#spudify-frame");
    const loading = el.querySelector("#spudify-loading");
    let loaded = false;

    frame.addEventListener("load", () => {
      if(loaded) return; loaded = true;
      setTimeout(() => {
        frame.classList.add("loaded");
        setTimeout(() => loading.classList.add("hidden"), 400);
      }, 600);
    });

    // Fallback: show after 5s regardless
    setTimeout(() => {
      if(!loaded){ loaded=true; frame.classList.add("loaded"); loading.classList.add("hidden"); }
    }, 5000);
  }

  return { build };
})();
window.Spudify = Spudify;
