/* POTATO-OS — Spudify Music Player | Language: JavaScript */
"use strict";
const Spudify=(()=>{
  let st={playing:false,progress:0,track:null,liked:new Set(JSON.parse(localStorage.getItem("pot_liked")||"[]"))};
  let _tid=null,_secs=[];
  const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  const greet=()=>{const h=new Date().getHours();return h<12?"Good Morning":h<17?"Good Afternoon":"Good Evening";};

  function build(el,cfg){
    _secs=cfg.spudify?.sections||[];
    el.style.cssText="width:100%;height:100%";
    const secHtml=_secs.map(sec=>`
      <div class="sp-section">
        <div class="sp-sec-title">${sec.title}</div>
        <div class="sp-song-row">
          ${(sec.tracks||[]).map(t=>`
            <div class="sp-song-card" onclick='Spudify.play(${JSON.stringify(t)})'>
              <div class="sp-sc-art-wrap">
                <div class="sp-sc-art" style="background:${t.col||"#1a1a1a"}">🎵</div>
                <div class="sp-sc-hover"><div class="sp-sc-play"><i class="fas fa-play"></i></div></div>
              </div>
              <div class="sp-sc-title" title="${t.title}">${t.title}</div>
              <div class="sp-sc-artist">${t.artist}</div>
            </div>`).join("")}
        </div>
      </div>`).join("");

    el.innerHTML=`
      <div id="spudify">
        <div class="sp-layout">
          <div class="sp-sidebar">
            <div class="sp-logo-area">
              <div class="sp-logo">SPUDIFY<span>Music for Spuds</span></div>
            </div>
            <div class="sp-nav on"><i class="fas fa-home"></i> Home</div>
            <div class="sp-nav"><i class="fas fa-search"></i> Search</div>
            <div class="sp-nav-sep"></div>
            <div class="sp-pl-hdr"><span class="sp-pl-title">Your Library</span><button class="sp-pl-add" onclick="OS.notify('Library','Coming soon!','📚')">+</button></div>
            <div class="sp-pl-item">
              <div class="sp-pl-thumb" style="background:linear-gradient(135deg,#3d2005,#d4a853)">♥</div>
              <div><div class="sp-pl-name">Liked Tracks</div><div class="sp-pl-meta" id="sp-liked-cnt">0 songs</div></div>
            </div>
            <div class="sp-pl-item">
              <div class="sp-pl-thumb" style="background:linear-gradient(135deg,#1a0a00,#6b3800)">🔥</div>
              <div><div class="sp-pl-name">Fried &amp; Crispy</div><div class="sp-pl-meta">Playlist</div></div>
            </div>
            <div class="sp-pl-item">
              <div class="sp-pl-thumb" style="background:linear-gradient(135deg,#000a18,#0a2040)">🌙</div>
              <div><div class="sp-pl-name">Late Night Mash</div><div class="sp-pl-meta">Playlist</div></div>
            </div>
          </div>
          <div class="sp-main">
            <div class="sp-topbar">
              <div class="sp-arrows">
                <button class="sp-arrow"><i class="fas fa-chevron-left"></i></button>
                <button class="sp-arrow"><i class="fas fa-chevron-right"></i></button>
              </div>
              <div class="sp-user">
                <div class="sp-avatar"><i class="fas fa-user" style="font-size:11px"></i></div>
                <span style="font-size:12px;font-weight:600;color:var(--cream)">Spud User</span>
              </div>
            </div>
            <div class="sp-content">
              <div class="sp-greeting">${greet()}</div>
              ${secHtml}
            </div>
          </div>
        </div>
        <div class="sp-player">
          <div class="sp-now">
            <div class="sp-now-art" id="sp-now-art" style="background:var(--bg3)">🎵</div>
            <div style="min-width:0">
              <div class="sp-now-title" id="sp-now-title">Not Playing</div>
              <div class="sp-now-artist" id="sp-now-artist">—</div>
            </div>
            <button class="sp-like" id="sp-like-btn" onclick="Spudify.toggleLike()"><i class="far fa-heart"></i></button>
          </div>
          <div class="sp-center">
            <div class="sp-ctrl-row">
              <button class="sp-ctrl"><i class="fas fa-random"></i></button>
              <button class="sp-ctrl" onclick="Spudify.prev()"><i class="fas fa-step-backward"></i></button>
              <button class="sp-play-btn" id="sp-play-btn" onclick="Spudify.togglePlay()"><i class="fas fa-play"></i></button>
              <button class="sp-ctrl" onclick="Spudify.next()"><i class="fas fa-step-forward"></i></button>
              <button class="sp-ctrl"><i class="fas fa-redo"></i></button>
            </div>
            <div class="sp-prog-row">
              <span class="sp-time" id="sp-cur">0:00</span>
              <div class="sp-prog-bar" onclick="Spudify.seek(event)"><div class="sp-prog-fill" id="sp-prog" style="width:0%"></div></div>
              <span class="sp-time" id="sp-dur">3:30</span>
            </div>
          </div>
          <div class="sp-vol">
            <i class="fas fa-volume-up sp-vol-i"></i>
            <div class="sp-vol-bar"><div class="sp-vol-fill"></div></div>
          </div>
        </div>
      </div>`;
    updateLiked();
  }

  function play(t){
    st.track=t;st.playing=true;st.progress=0;
    const g=id=>document.getElementById(id);
    if(g("sp-now-title"))g("sp-now-title").textContent=t.title;
    if(g("sp-now-artist"))g("sp-now-artist").textContent=t.artist;
    const art=g("sp-now-art");if(art){art.textContent="🎵";art.style.background=t.col||"#1a1a1a";}
    updatePlayBtn();updateLikeBtn();startProg();
    const ov=g("sp-overlay"),ifr=g("sp-iframe");
    if(ov&&ifr){ifr.src=`https://open.spotify.com/embed/track/${t.id}?utm_source=generator&theme=0`;ov.classList.add("open");}
    const rp=g("rp-music-status");if(rp)rp.textContent=`${t.title} — ${t.artist}`;
    OS.notify("Now Playing",`${t.title} — ${t.artist}`,"🎵");
  }

  function togglePlay(){st.playing=!st.playing;updatePlayBtn();if(st.playing)startProg();else clearInterval(_tid);}
  function updatePlayBtn(){const b=document.getElementById("sp-play-btn");if(b)b.innerHTML=st.playing?'<i class="fas fa-pause"></i>':'<i class="fas fa-play"></i>';}
  function startProg(){
    clearInterval(_tid);const D=200;
    _tid=setInterval(()=>{
      if(!st.playing)return;
      st.progress=Math.min(st.progress+100/D,100);
      const f=document.getElementById("sp-prog");if(f)f.style.width=st.progress+"%";
      const e=(st.progress/100)*D,c=document.getElementById("sp-cur");if(c)c.textContent=fmt(e);
      if(st.progress>=100){clearInterval(_tid);next();}
    },1000);
  }
  function seek(e){const b=e.currentTarget;st.progress=(e.offsetX/b.offsetWidth)*100;const f=document.getElementById("sp-prog");if(f)f.style.width=st.progress+"%";}
  function allTracks(){return _secs.flatMap(s=>s.tracks||[]);}
  function next(){const a=allTracks();if(!st.track||!a.length)return;const i=a.findIndex(t=>t.id===st.track.id);play(a[(i+1)%a.length]);}
  function prev(){const a=allTracks();if(!st.track||!a.length)return;const i=a.findIndex(t=>t.id===st.track.id);play(a[(i-1+a.length)%a.length]);}
  function toggleLike(){if(!st.track)return;const id=st.track.id;if(st.liked.has(id))st.liked.delete(id);else st.liked.add(id);localStorage.setItem("pot_liked",JSON.stringify([...st.liked]));updateLikeBtn();updateLiked();}
  function updateLikeBtn(){const b=document.getElementById("sp-like-btn");if(!b||!st.track)return;b.innerHTML=st.liked.has(st.track.id)?'<i class="fas fa-heart" style="color:var(--green)"></i>':'<i class="far fa-heart"></i>';}
  function updateLiked(){const e=document.getElementById("sp-liked-cnt");if(e)e.textContent=`${st.liked.size} songs`;}
  return{build,play,togglePlay,next,prev,seek,toggleLike};
})();
window.Spudify=Spudify;
