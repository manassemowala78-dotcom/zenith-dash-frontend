// ── 10.6.5 · Lecteur de messages vocaux Zenith ──
// Durée toujours visible, barre cliquable, vitesse 1× / 1,5× / 2×, rien qui déborde de la bulle.
const ZV={cur:null,io:null};
const ZV_SPEEDS=[1,1.5,2];
function zvFmt(s){s=Math.max(0,Math.round(s||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;}
function zvSpeedLbl(v){return (v===1.5?"1,5":String(v))+"×";}
function zvSpeed(){try{const v=+localStorage.getItem("zd_voice_speed");return ZV_SPEEDS.includes(v)?v:1;}catch(_){return 1;}}
function zvDurFromName(n){const m=/-(\d{1,5})s\.[a-z0-9]{2,5}$/i.exec(n||"");return m?Math.min(+m[1],36000):0;}
function zvBars(seed){let h=7;const s=String(seed||"x");for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;const o=[];for(let i=0;i<28;i++){h=(Math.imul(h,1103515245)+12345)&0x7fffffff;o.push(6+(h%21));}return o;}
function zvHtml(src,name){
  if(!src)return "";
  const dur=zvDurFromName(name),sp=zvSpeed();
  return `<div class="zv" data-src="${esc(src)}" data-dur="${dur||""}">
    <button type="button" class="zv-btn" aria-label="${esc(t("zv_play"))}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg></button>
    <div class="zv-mid"><div class="zv-wave" role="slider" tabindex="0" aria-label="${esc(t("zv_pos"))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${zvBars(src).map(h=>`<i style="height:${h}px"></i>`).join("")}</div>
      <div class="zv-row"><span class="zv-t">${dur?zvFmt(dur):"–:––"}</span><button type="button" class="zv-spd" aria-label="${esc(t("zv_speed"))}">${zvSpeedLbl(sp)}</button></div></div></div>`;
}
function zvAudio(el){
  if(el._a)return el._a;
  const a=new Audio();a.preload="metadata";a.src=el.dataset.src;el._a=a;
  a.addEventListener("loadedmetadata",()=>{
    if(a.duration===Infinity||isNaN(a.duration)){a._fix=true;try{a.currentTime=1e101;}catch(_){}}   // webm enregistré sans durée : on la force
    else zvSetDur(el,a.duration);
  });
  a.addEventListener("durationchange",()=>{if(isFinite(a.duration)&&a.duration>0){zvSetDur(el,a.duration);if(a._fix){a._fix=false;try{a.currentTime=0;}catch(_){}}}});
  a.addEventListener("timeupdate",()=>{if(!a._fix)zvPaint(el);});
  a.addEventListener("play",()=>zvState(el,true));
  a.addEventListener("pause",()=>zvState(el,false));
  a.addEventListener("ended",()=>{a.currentTime=0;zvState(el,false);zvPaint(el,true);});
  a.addEventListener("error",()=>{el.classList.add("zv-err");const tt=el.querySelector(".zv-t");if(tt)tt.textContent=t("zv_error");});
  return a;
}
function zvSetDur(el,d){el.dataset.dur=String(Math.round(d*10)/10);zvPaint(el,true);}
function zvPaint(el,reset){
  const a=el._a,d=+el.dataset.dur||(a&&isFinite(a.duration)?a.duration:0),cur=a&&!reset?a.currentTime:0;
  const f=d?Math.min(1,cur/d):0;
  const bars=el.querySelectorAll(".zv-wave i"),k=Math.round(bars.length*f);
  bars.forEach((b,i)=>b.classList.toggle("on",i<k));
  const w=el.querySelector(".zv-wave");if(w)w.setAttribute("aria-valuenow",String(Math.round(f*100)));
  const tt=el.querySelector(".zv-t");
  if(tt&&!el.classList.contains("zv-err"))tt.textContent=!d?"–:––":(cur>0.4&&!reset?`${zvFmt(cur)} / ${zvFmt(d)}`:zvFmt(d));
}
function zvState(el,playing){
  el.classList.toggle("zv-on",playing);
  const b=el.querySelector(".zv-btn");
  if(b){b.setAttribute("aria-label",t(playing?"zv_pause":"zv_play"));b.innerHTML=playing?`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/></svg>`:`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>`;}
}
function zvToggle(el){
  const a=zvAudio(el);
  if(a.paused){
    if(ZV.cur&&ZV.cur!==el&&ZV.cur._a)try{ZV.cur._a.pause();}catch(_){}
    ZV.cur=el;a.playbackRate=zvSpeed();
    const p=a.play();if(p&&p.catch)p.catch(()=>{el.classList.add("zv-err");const tt=el.querySelector(".zv-t");if(tt)tt.textContent=t("zv_error");});
  }else a.pause();
}
function zvSeek(el,clientX){
  const w=el.querySelector(".zv-wave"),r=w.getBoundingClientRect(),d=+el.dataset.dur;
  if(!d||!r.width)return;
  const f=Math.min(1,Math.max(0,(clientX-r.left)/r.width)),a=zvAudio(el);
  try{a.currentTime=f*d;}catch(_){}zvPaint(el);
}
document.addEventListener("click",e=>{
  const sp=e.target.closest&&e.target.closest(".zv-spd");
  if(sp){
    e.stopPropagation();
    const i=ZV_SPEEDS.indexOf(zvSpeed()),n=ZV_SPEEDS[(i+1)%ZV_SPEEDS.length];
    try{localStorage.setItem("zd_voice_speed",String(n));}catch(_){}
    document.querySelectorAll(".zv").forEach(z=>{const b=z.querySelector(".zv-spd");if(b)b.textContent=zvSpeedLbl(n);if(z._a)z._a.playbackRate=n;});
    return;
  }
  const b=e.target.closest&&e.target.closest(".zv-btn");
  if(b){e.stopPropagation();zvToggle(b.closest(".zv"));}
},true);
document.addEventListener("pointerdown",e=>{
  const w=e.target.closest&&e.target.closest(".zv-wave");if(!w)return;
  const el=w.closest(".zv");e.stopPropagation();
  zvSeek(el,e.clientX);
  const mv=ev=>zvSeek(el,ev.clientX),up=()=>{document.removeEventListener("pointermove",mv);document.removeEventListener("pointerup",up);};
  document.addEventListener("pointermove",mv);document.addEventListener("pointerup",up);
},true);
document.addEventListener("keydown",e=>{
  const w=e.target.closest&&e.target.closest(".zv-wave");if(!w)return;
  const el=w.closest(".zv"),a=zvAudio(el);
  if(e.key==="ArrowRight"){a.currentTime=Math.min((+el.dataset.dur||a.duration||0),a.currentTime+5);zvPaint(el);e.preventDefault();}
  else if(e.key==="ArrowLeft"){a.currentTime=Math.max(0,a.currentTime-5);zvPaint(el);e.preventDefault();}
  else if(e.key===" "||e.key==="Enter"){zvToggle(el);e.preventDefault();}
});
// Durée affichée sans lancer la lecture : on la lit quand le message devient visible
function zvProbe(el){if(el._probed)return;el._probed=true;if(!+el.dataset.dur)zvAudio(el);}
(function(){
  if(!window.IntersectionObserver)return;
  ZV.io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){zvProbe(x.target);ZV.io.unobserve(x.target);}}),{rootMargin:"200px"});
  const scan=n=>{if(n.nodeType!==1)return;(n.matches&&n.matches(".zv")?[n]:[]).concat([...n.querySelectorAll?n.querySelectorAll(".zv"):[]]).forEach(z=>{if(!z._seen){z._seen=true;ZV.io.observe(z);}});};
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(scan))).observe(document.documentElement,{childList:true,subtree:true});
})();
