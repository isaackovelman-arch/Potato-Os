/* POTATO-OS v3.1 — Core Engine */
"use strict";
const OS=(()=>{
  const S={running:new Set(),active:null,cfg:{}};
  function initCanvas(){
    const cv=document.getElementById("bg-canvas"),ctx=cv.getContext("2d");
    function rsz(){cv.width=innerWidth;cv.height=innerHeight;}rsz();addEventListener("resize",rsz);
    class Blob{constructor(i){this.hue=[8,24,200,260,140,320][i%6];this.ph=Math.random()*Math.PI*2;this.x=Math.random()*innerWidth;this.y=Math.random()*innerHeight;this.r=180+Math.random()*280;this.vx=(Math.random()-.5)*.25;this.vy=(Math.random()-.5)*.22;}
      upd(t){this.x+=this.vx+Math.sin(t*.0009+this.ph)*.35;this.y+=this.vy+Math.cos(t*.0007+this.ph)*.28;if(this.x<-this.r)this.x=cv.width+this.r;if(this.x>cv.width+this.r)this.x=-this.r;if(this.y<-this.r)this.y=cv.height+this.r;if(this.y>cv.height+this.r)this.y=-this.r;}
      draw(){const g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.r);g.addColorStop(0,`hsla(${this.hue},65%,15%,0.10)`);g.addColorStop(1,"transparent");ctx.fillStyle=g;ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fill();}}
    class Pt{constructor(){this.rst(true);}rst(init){this.x=Math.random()*cv.width;this.y=init?Math.random()*cv.height:cv.height+5;this.sz=Math.random()*1.5+.3;this.vy=-(Math.random()*.45+.08);this.vx=(Math.random()-.5)*.22;this.life=1;this.dec=Math.random()*.0022+.001;this.a=Math.random()*.5+.07;const h=[8,24,200,260,280][Math.floor(Math.random()*5)];this.col=`hsl(${h},${35+Math.random()*40}%,${28+Math.random()*28}%)`;}
      upd(){this.x+=this.vx;this.y+=this.vy;this.life-=this.dec;if(this.life<=0||this.y<-6)this.rst(false);}
      draw(){ctx.globalAlpha=this.life*this.a;ctx.beginPath();ctx.arc(this.x,this.y,this.sz,0,Math.PI*2);ctx.fillStyle=this.col;ctx.fill();}}
    const blobs=Array.from({length:6},(_,i)=>new Blob(i));
    const pts=Array.from({length:160},()=>new Pt());
    let t=0;
    (function frame(){t++;ctx.clearRect(0,0,cv.width,cv.height);ctx.fillStyle="#060504";ctx.fillRect(0,0,cv.width,cv.height);
      ctx.globalAlpha=1;blobs.forEach(b=>{b.upd(t);b.draw();});
      ctx.globalAlpha=.016;ctx.strokeStyle="rgba(212,168,83,1)";ctx.lineWidth=1;
      for(let x=0;x<cv.width;x+=88){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,cv.height);ctx.stroke();}
      for(let y=0;y<cv.height;y+=88){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cv.width,y);ctx.stroke();}
      ctx.globalAlpha=1;const v=ctx.createRadialGradient(cv.width*.5,cv.height*.5,cv.height*.12,cv.width*.5,cv.height*.5,cv.height*.88);v.addColorStop(0,"transparent");v.addColorStop(1,"rgba(0,0,0,0.62)");ctx.fillStyle=v;ctx.fillRect(0,0,cv.width,cv.height);
      pts.forEach(p=>{p.upd();p.draw();});ctx.globalAlpha=1;
      requestAnimationFrame(frame);})();
  }
  function initFPS(){const el=document.getElementById("fps");let f=0,last=performance.now();(function t(){f++;const now=performance.now();if(now-last>=1000){if(el)el.textContent=Math.round(f*1000/(now-last))+" FPS";f=0;last=now;}requestAnimationFrame(t);})();}
  function initClock(){
    const D=["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"],M=["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
    function tick(){const n=new Date(),h=n.getHours(),m=n.getMinutes(),ampm=h>=12?"PM":"AM",h12=String(h%12||12).padStart(2,"0"),mm=String(m).padStart(2,"0");const te=document.getElementById("hud-time"),de=document.getElementById("hud-date");if(te)te.textContent=`${h12}:${mm} ${ampm}`;if(de)de.textContent=`${D[n.getDay()]}, ${M[n.getMonth()]} ${n.getDate()}`;}
    tick();setInterval(tick,1000);
  }
  function openApp(id){closeDrawer();const w=document.getElementById("win-"+id);if(!w)return;if(w.classList.contains("minimized")){w.classList.remove("minimized");w.classList.add("active");S.active=id;return;}S.running.forEach(rid=>{const x=document.getElementById("win-"+rid);if(x&&rid!==id)x.classList.remove("active");});w.classList.add("active");w.classList.remove("minimized");S.running.add(id);S.active=id;document.getElementById("di-"+id)?.classList.add("on");}
  function closeApp(id){const w=document.getElementById("win-"+id);if(w)w.classList.remove("active","minimized","reveal");S.running.delete(id);S.active=null;document.getElementById("di-"+id)?.classList.remove("on");}
  function minApp(id){const w=document.getElementById("win-"+id);if(w){w.classList.add("minimized");w.classList.remove("active","reveal");}}
  function initTriggers(){const dock=document.getElementById("dock");document.getElementById("ttrig").addEventListener("mouseenter",()=>{if(S.active)document.getElementById("win-"+S.active)?.classList.add("reveal");});document.getElementById("ttrig").addEventListener("mouseleave",()=>{if(S.active)document.getElementById("win-"+S.active)?.classList.remove("reveal");});document.getElementById("btrig").addEventListener("mouseenter",()=>dock?.classList.remove("hidden"));dock?.addEventListener("mouseleave",()=>{if(S.running.size>0)setTimeout(()=>dock?.classList.add("hidden"),2000);});}
  function toggleDrawer(){const d=document.getElementById("drawer");if(!d)return;const o=d.classList.toggle("open");if(o)setTimeout(()=>document.getElementById("dr-q")?.focus(),70);}
  function closeDrawer(){document.getElementById("drawer")?.classList.remove("open");}
  function filterDrawer(q){document.querySelectorAll(".dr-app").forEach(a=>{const n=a.querySelector(".dr-name")?.textContent.toLowerCase()||"";a.style.display=(!q||n.includes(q.toLowerCase()))?"flex":"none";});}
  let _nid=0;
  function notify(title,msg="",icon="🔔"){const c=document.getElementById("notifs");if(!c)return;const id=++_nid,el=document.createElement("div");el.className="notif";el.id="n"+id;el.innerHTML=`<span class="n-icon">${icon}</span><div><div class="n-title">${title}</div>${msg?`<div class="n-msg">${msg}</div>`:""}</div>`;el.onclick=()=>dismiss(id);c.appendChild(el);while(c.children.length>4)c.removeChild(c.firstChild);setTimeout(()=>dismiss(id),4500);}
  function dismiss(id){const e=document.getElementById("n"+id);if(!e)return;e.classList.add("out");setTimeout(()=>e?.remove(),250);}
  function initCtx(){document.addEventListener("contextmenu",e=>{e.preventDefault();showCtx(e.clientX,e.clientY);});document.addEventListener("click",e=>{if(!e.target.closest("#ctx-menu"))closeCtx();});}
  function showCtx(x,y){const m=document.getElementById("ctx-menu");if(!m)return;m.innerHTML=`<div class="ctx-i" onclick="closeCtx();OS.notify('Refreshed','Desktop refreshed.','🔄')"><i class="fas fa-sync-alt"></i>Refresh</div><div class="ctx-i" onclick="closeCtx();OS.toggleDrawer()"><i class="fas fa-th-large"></i>App Drawer</div><div class="ctx-sep"></div><div class="ctx-i" onclick="closeCtx();OS.openApp('store')"><i class="fas fa-store"></i>Spud Store</div><div class="ctx-i" onclick="closeCtx();OS.openApp('music')"><i class="fas fa-music"></i>Spudify</div><div class="ctx-i" onclick="closeCtx();OS.openApp('browser')"><i class="fas fa-globe"></i>PotatoWeb</div><div class="ctx-i" onclick="closeCtx();OS.openApp('settings')"><i class="fas fa-cog"></i>The Peeler</div><div class="ctx-sep"></div><div class="ctx-i red" onclick="location.reload()"><i class="fas fa-power-off"></i>Reboot</div>`;m.style.left=Math.min(x,innerWidth-185)+"px";m.style.top=Math.min(y,innerHeight-250)+"px";m.style.display="block";}
  function closeCtx(){const m=document.getElementById("ctx-menu");if(m)m.style.display="none";}
  function initKeys(){document.addEventListener("keydown",e=>{if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA")return;if(e.key==="Escape"){closeCtx();closeDrawer();const gfs=document.getElementById("game-fs");if(gfs&&gfs.style.display!=="none"){gfs.style.display="none";const f=document.getElementById("game-iframe");if(f)f.src="";}document.getElementById("sp-overlay")?.classList.remove("open");}if(e.ctrlKey||e.metaKey){const map={s:"store",m:"music",b:"browser",p:"settings"};if(map[e.key]){e.preventDefault();openApp(map[e.key]);}if(e.key==="w"){e.preventDefault();if(S.active)closeApp(S.active);}}});}
  async function start(){
    try{const r=await fetch("config.json");S.cfg=await r.json();}catch(_){S.cfg={};}
    document.getElementById("dock")?.classList.remove("hidden");
    initCanvas();initFPS();initClock();initTriggers();initCtx();initKeys();
    const sc=document.getElementById("store-content"),mc=document.getElementById("music-content"),bc=document.getElementById("browser-content"),pc=document.getElementById("settings-content");
    if(sc&&window.SpudStore)SpudStore.build(sc,S.cfg);
    if(mc&&window.Spudify)Spudify.build(mc,S.cfg);
    if(bc&&window.PotatoWeb)PotatoWeb.build(bc,S.cfg);
    if(pc&&window.Peeler)Peeler.build(pc,S.cfg);
    document.getElementById("file-inp")?.addEventListener("change",e=>{const file=e.target.files[0];if(!file)return;const rd=new FileReader();rd.onload=ev=>{const id="u_"+Date.now(),html=ev.target.result,name=file.name.replace(".html","");try{localStorage.setItem("pot_html_"+id,html);}catch(_){}const inst=JSON.parse(localStorage.getItem("pot_installed")||"{}");inst[id]={id,name,cover:""};localStorage.setItem("pot_installed",JSON.stringify(inst));notify("Spud Store",`"${name}" installed!`,"✅");};rd.readAsText(file);e.target.value="";});
    const lg=JSON.parse(localStorage.getItem("pot_last_game")||"null");if(lg){const e=document.getElementById("rp-game-name");if(e)e.textContent=lg.name;}
    setTimeout(()=>notify("Potato-OS","Export complete. Welcome back!","🥔"),600);
    setTimeout(()=>notify("Spud Store","Browse and install games from the catalog.","🎮"),1800);
  }
  return{openApp,closeApp,minApp,toggleDrawer,closeDrawer,filterDrawer,notify,closeCtx,start,get cfg(){return S.cfg;}};
})();
window.OS=OS;window.closeCtx=OS.closeCtx;
