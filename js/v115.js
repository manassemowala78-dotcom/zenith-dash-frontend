function ztT(k,v){let s=t(k);Object.entries(v||{}).forEach(([a,b])=>{s=s.split("{"+a+"}").join(b);});return s;}
function ztAct(){const s=ZPV&&ZPV.s;return s&&s.activity?s.activity:null;}
function ztLeft(){const a=ztAct();return a?Math.max(0,(a.need||10)-(a.n||0)):0;}
function ztWhy(){const s=ZPV.s,a=ztAct();if(!a)return "";return ztT("zt_why",{x:ztT("zt_act_"+s.sector,{n:ztLeft()})});}
if(typeof zpPageLabel==="function"){
  const _ztPL=zpPageLabel;
  zpPageLabel=function(p){
    const r=_ztPL.apply(this,arguments);
    if(r&&r!==p)return r;
    const nav=document.querySelector(`.sidebar .nav-i[data-p="${CSS.escape(String(p||""))}"]`);
    const lbl=nav&&(nav.querySelector("span[data-i18n]")||nav).textContent.replace(/\s+/g," ").trim();
    return lbl||r;
  };
}
function ztSheet(p){
  const s=ZPV&&ZPV.s,a=ztAct();if(!s||!a)return;
  const pct=Math.round(100*Math.min(a.n||0,a.need||10)/(a.need||10));
  let ov=document.getElementById("zl-sheet");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="zl-sheet";ov.className="modal-overlay";ov.style.display="flex";ov.style.alignItems="flex-end";
  ov.onclick=e=>{if(e.target===ov)zlClose();};
  ov.innerHTML=`<div class="modal zx-sheet zl-box" role="dialog" aria-modal="true" aria-labelledby="zl-t"><span class="zx-grab" aria-hidden="true"></span>
    <div class="zl-head"><span class="zl-ic">${ZP_SVG.lock}</span><h2 id="zl-t">${esc(zlT("zl_title",{p:zpPageLabel(p)}))}</h2></div>
    <p>${esc(ztWhy())}</p>
    <div class="zt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${a.need||10}" aria-valuenow="${a.n||0}"><span style="width:${pct}%"></span></div>
    <small class="zt-of">${esc(ztT("zt_of",{n:a.n||0,t:a.need||10}))}</small>
    <button type="button" class="btn btn-g zl-go" id="zl-go">${esc(t("zt_btn_"+s.sector))}</button>
    <button type="button" class="zx-link" onclick="zlClose()">${esc(t("zq_s_later"))}</button></div>`;
  document.body.appendChild(ov);
  ov.querySelector("#zl-go").onclick=()=>{zlClose();if(zpLocked(a.page)!=null)zlSheet(a.page);else navigate(a.page);};
  setTimeout(()=>{try{ov.querySelector("#zl-go").focus();}catch(_){}},50);
}
if(typeof navigate==="function"){
  const _ztNav=navigate;
  navigate=function(p){
    try{
      const ev=window.event,user=ev&&/^(click|keydown|keyup|pointerup|touchend)$/.test(ev.type);
      if(user&&typeof p==="string"&&zpLocked(p)==="act"){
        try{if(typeof closeMoreMenu==="function")closeMoreMenu();}catch(_){}
        ztSheet(p);return;
      }
    }catch(_){}
    return _ztNav.apply(this,arguments);
  };
}
if(typeof zpLockHtml==="function"){
  const _ztLH=zpLockHtml;
  zpLockHtml=function(p){
    if(zpLocked(p)!=="act")return _ztLH.apply(this,arguments);
    const s=ZPV.s,a=ztAct()||{n:0,need:10};
    const pct=Math.round(100*Math.min(a.n||0,a.need||10)/(a.need||10));
    return `<div class="zp-lock" role="region" aria-labelledby="zp-lock-t">
      <span class="zp-lki">${ZP_SVG.lockBig}</span>
      <h1 id="zp-lock-t">${esc(zlT("zl_title",{p:zpPageLabel(p)}))}</h1>
      <p>${esc(ztWhy())}</p>
      <div class="zt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${a.need||10}" aria-valuenow="${a.n||0}"><span style="width:${pct}%"></span></div>
      <small class="zt-of">${esc(ztT("zt_of",{n:a.n||0,t:a.need||10}))}</small>
      <button type="button" class="btn btn-g zp-cta" onclick="navigate('${esc(a.page||"dashboard")}')">${esc(t("zt_btn_"+s.sector))}</button>
    </div>`;
  };
}
if(typeof zpSet==="function"){
  const _ztSet=zpSet;
  zpSet=function(r){
    const okId=v=>typeof v==="string"&&/^[a-z0-9_-]{1,40}$/.test(v);
    const act=r&&r.locked?Object.keys(r.locked).filter(k=>okId(k)&&r.locked[k]==="act"):[];
    let a=null;
    if(r&&r.activity&&typeof r.activity==="object"){const x=r.activity;a={n:Math.max(0,parseInt(x.n,10)||0),need:Math.max(1,parseInt(x.need,10)||10),page:okId(x.page)?x.page:"dashboard",key:okId(x.key)?x.key:"",done:!!x.done};}
    const res=_ztSet.apply(this,arguments);
    try{
      if(ZPV.s){ZPV.s.activity=a;act.forEach(k=>{ZPV.s.locked[k]="act";});}
      zpMarkNav();
      if(typeof zoSide==="function")zoSide();
      const cur=document.querySelector(".page.active")?.id?.replace("page-","");
      if(cur&&cur!=="zdlock"&&act.includes(cur))navigate(cur);
    }catch(_){}
    return res;
  };
}
