/* POTATO-OS — Spudify | Embeds CineOS Spotify App */
"use strict";

const Spudify = (() => {
  const SPOTIFY_URL = "https://cine-os.b-cdn.net/script/Apps/Spotify/index.html#/home";

  function build(el, cfg) {
    el.style.cssText = "width:100%;height:100%;position:relative;background:#000;overflow:hidden";
    el.innerHTML = `
      <style>
        #sp-shell { width:100%;height:100%;position:relative;background:#0a0a0a;font-family:'Space Grotesk',system-ui,sans-serif; }

        #sp-iframe-wrap { width:100%;height:100%;position:relative;overflow:hidden; }
        #sp-iframe {
          position:absolute;inset:0;width:100%;height:100%;border:none;
          opacity:0;transition:opacity 1.4s cubic-bezier(0.4,0,0.2,1);
        }
        #sp-iframe.ready { opacity:1; }
        #sp-loader {
          position:absolute;inset:0;display:flex;flex-direction:column;
          align-items:center;justify-content:center;gap:20px;background:#000;
          transition:opacity 0.9s ease;pointer-events:none;z-index:5;
        }
        #sp-loader.gone { opacity:0; }
        #sp-loader-disk {
          width:88px;height:88px;border-radius:50%;overflow:hidden;
          animation:spSpin 2.5s linear infinite;
          box-shadow:0 0 40px rgba(29,185,84,0.35);
        }
        #sp-loader-disk img { width:100%;height:100%;object-fit:cover; }
        @keyframes spSpin { to { transform:rotate(360deg); } }
        .sp-eq { display:flex;gap:3px;align-items:flex-end;height:24px; }
        .sp-eq-bar { width:4px;border-radius:2px;background:#1DB954;animation:spEq 1s ease-in-out infinite; }
        .sp-eq-bar:nth-child(1){animation-delay:0s}
        .sp-eq-bar:nth-child(2){animation-delay:0.15s}
        .sp-eq-bar:nth-child(3){animation-delay:0.3s}
        .sp-eq-bar:nth-child(4){animation-delay:0.45s}
        .sp-eq-bar:nth-child(5){animation-delay:0.6s}
        @keyframes spEq { 0%,100%{height:5px;opacity:0.35} 50%{height:24px;opacity:1} }
        #sp-loader p { font-size:11px;color:rgba(255,255,255,0.3);font-family:'Space Mono',monospace;letter-spacing:2px; }
      </style>

      <div id="sp-shell">

        <div id="sp-iframe-wrap">
          <div id="sp-loader">
            <div id="sp-loader-disk"><img src="img/spotify.webp" alt=""></div>
            <div class="sp-eq">
              <div class="sp-eq-bar"></div><div class="sp-eq-bar"></div>
              <div class="sp-eq-bar"></div><div class="sp-eq-bar"></div>
              <div class="sp-eq-bar"></div>
            </div>
            <p>Loading Spudify...</p>
          </div>
          <iframe id="sp-iframe" src="${SPOTIFY_URL}"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen"
            allowfullscreen>
          </iframe>
        </div>
      </div>`;

    const frame  = el.querySelector("#sp-iframe");
    const loader = el.querySelector("#sp-loader");
    let done = false;

    function reveal() {
      if(done) return; done = true;
      frame.classList.add("ready");
      setTimeout(() => loader.classList.add("gone"), 500);
    }

    frame.addEventListener("load", () => setTimeout(reveal, 700));
    setTimeout(reveal, 6000); // hard fallback
  }

  return { build };
})();
window.Spudify = Spudify;
