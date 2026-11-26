function zuIsAct(v){return v==="act"||v==="act5";}
function zuNeed(p){const a=ztAct()||{};const v=zpLocked(p);return v==="act5"?(a.mid||5):(a.need||10);}
function zuLeft(p){const a=ztAct()||{};return Math.max(0,zuNeed(p)-(a.n||0));}
function zuWhyAct(p){const s=ZPV.s;return ztT("zt_why",{x:ztT("zt_act_"+s.sector,{n:zuLeft(p)})});}
function zuBody(p){
  const a=ztAct()||{n:0},need=zuNeed(p),n=Math.min(a.n||0,need);
  const pct=Math.round(100*n/need);
  return `<p>${esc(zuWhyAct(p))}</p>
    <div class="zt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${need}" aria-valuenow="${n}"><span style="width:${pct}%"></span></div>
    <small class="zt-of">${esc(ztT("zt_of",{n:n,t:need}))}</small>`;
}
ztSheet=function(p){
  const s=ZPV&&ZPV.s,a=ztAct();if(!s||!a)return;
  let ov=document.getElementById("zl-sheet");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="zl-sheet";ov.className="modal-overlay";ov.style.display="flex";ov.style.alignItems="flex-end";
  ov.onclick=e=>{if(e.target===ov)zlClose();};
  ov.innerHTML=`<div class="modal zx-sheet zl-box" role="dialog" aria-modal="true" aria-labelledby="zl-t"><span class="zx-grab" aria-hidden="true"></span>
    <div class="zl-head"><span class="zl-ic">${ZP_SVG.lock}</span><h2 id="zl-t">${esc(zlT("zl_title",{p:zpPageLabel(p)}))}</h2></div>
    ${zuBody(p)}
    <button type="button" class="btn btn-g zl-go" id="zl-go">${esc(t("zt_btn_"+s.sector))}</button>
    <button type="button" class="zx-link" onclick="zlClose()">${esc(t("zq_s_later"))}</button></div>`;
  document.body.appendChild(ov);
  ov.querySelector("#zl-go").onclick=()=>{zlClose();if(zpLocked(a.page)!=null)zlSheet(a.page);else navigate(a.page);};
  setTimeout(()=>{try{ov.querySelector("#zl-go").focus();}catch(_){}},50);
};
if(typeof navigate==="function"){
  const _zuNav=navigate;
  navigate=function(p){
    try{
      const ev=window.event,user=ev&&/^(click|keydown|keyup|pointerup|touchend)$/.test(ev.type);
      if(user&&typeof p==="string"&&zpLocked(p)==="act5"){
        try{if(typeof closeMoreMenu==="function")closeMoreMenu();}catch(_){}
        ztSheet(p);return;
      }
    }catch(_){}
    return _zuNav.apply(this,arguments);
  };
}
if(typeof zpLockHtml==="function"){
  const _zuLH=zpLockHtml;
  zpLockHtml=function(p){
    if(!zuIsAct(zpLocked(p)))return _zuLH.apply(this,arguments);
    const s=ZPV.s,a=ztAct()||{};
    return `<div class="zp-lock" role="region" aria-labelledby="zp-lock-t">
      <span class="zp-lki">${ZP_SVG.lockBig}</span>
      <h1 id="zp-lock-t">${esc(zlT("zl_title",{p:zpPageLabel(p)}))}</h1>
      ${zuBody(p)}
      <button type="button" class="btn btn-g zp-cta" onclick="navigate('${esc(a.page||"dashboard")}')">${esc(t("zt_btn_"+s.sector))}</button>
    </div>`;
  };
}
function zuTileWhy(p){
  const s=ZPV&&ZPV.s;if(!s)return "";
  const v=zpLocked(p);if(v==null)return "";
  if(v==="act5")return ztT("zu_ops",{n:(ztAct()||{}).mid||5});
  if(v==="act")return ztT("zu_ops",{n:(ztAct()||{}).need||10});
  const own=(s.steps||[]).some(x=>x.page===p);
  const st=(s.steps||[])[v];
  if(own&&st)return ztT("zu_after",{s:zpStepLabel(s.sector,st.key)});
  return t("zu_steps");
}
function zuWhy(){
  document.querySelectorAll('#more-menu [onclick*="navigate("]').forEach(el=>{
    const p=((el.getAttribute("onclick")||"").match(/navigate\('([a-z0-9_-]+)'\)/)||[])[1];
    let w=el.querySelector(":scope > .zu-why");
    const txt=p?zuTileWhy(p):"";
    if(!txt){if(w)w.remove();return;}
    if(!w){w=document.createElement("small");w.className="zu-why";el.appendChild(w);}
    if(w.textContent!==txt)w.textContent=txt;
  });
}
function zuNavInfo(p){
  const nav=document.querySelector(`.sidebar .nav-i[data-p="${CSS.escape(p)}"]`);
  if(!nav)return null;
  const ic=(nav.querySelector("i.ti")?.className.match(/ti-[a-z0-9-]+/g)||[]).find(c=>c!=="ti")||"ti-apps";
  const label=(nav.querySelector("span[data-i18n]")||nav.querySelector("span")||nav).textContent.replace(/\s+/g," ").trim();
  return label?{ic,label}:null;
}
function zuBnav(){
  if(typeof zoClient==="function"&&zoClient())return;
  const inner=document.querySelector(".bottom-nav-inner");if(!inner)return;
  inner.querySelectorAll(".bnav-item[data-zu]").forEach(x=>x.remove());
  const s=ZPV&&ZPV.s;
  const fixed=new Set(["dashboard","messaging","profile"]);
  const orig=[...inner.querySelectorAll(".bnav-item[data-bp]")].filter(x=>!fixed.has(x.dataset.bp)&&!x.classList.contains("zd-hidden-role"));
  if(!s||!s.locked||!zpOn()){orig.forEach(x=>{x.style.display="";delete x.dataset.zuh;});return;}
  let need=0;
  orig.forEach(x=>{const lk=zpLocked(x.dataset.bp)!=null;x.style.display=lk?"none":"";if(lk){need++;x.dataset.zuh="1";}else delete x.dataset.zuh;});
  if(!need)return;
  const shown=new Set(orig.filter(x=>x.style.display!=="none").map(x=>x.dataset.bp));
  const steps=s.steps||[];
  const cand=[...steps.filter(x=>!x.done&&!x.locked),...steps.filter(x=>x.done).reverse()].map(x=>x.page)
    .filter((p,i,a)=>a.indexOf(p)===i&&!fixed.has(p)&&!shown.has(p)&&zpLocked(p)==null&&(typeof memberCanOpen!=="function"||memberCanOpen(p)));
  const anchor=inner.querySelector('.bnav-item[data-bp="messaging"]')||inner.querySelector('.bnav-item[data-bp="profile"]');
  const act=document.querySelector(".page.active")?.id?.replace("page-","");
  for(const p of cand){
    if(!need)break;
    const info=zuNavInfo(p);if(!info)continue;
    const d=document.createElement("div");
    d.className="bnav-item"+(p===act?" active":"");d.dataset.bp=p;d.dataset.zu="1";
    d.setAttribute("onclick",`navigate('${p}')`);
    d.innerHTML=`<i class="ti ${info.ic}"></i><span>${esc(info.label)}</span>`;
    if(anchor)inner.insertBefore(d,anchor);else inner.appendChild(d);
    need--;
  }
}
function zuPlusTiles(){
  const m=document.getElementById("more-menu");if(!m)return;
  const hid=[...document.querySelectorAll('.bottom-nav-inner .bnav-item[data-zuh="1"]')].map(x=>x.dataset.bp).filter(p=>/^[a-z0-9_-]{1,40}$/.test(p));
  m.querySelectorAll(".zu-tile").forEach(el=>{if(!hid.includes(el.dataset.zup))el.remove();});
  const grid=document.querySelector("#mm-body .mm-grid");
  hid.slice().reverse().forEach(p=>{
    if(m.querySelector(`[onclick*="navigate('${p}')"]`))return;
    const info=zuNavInfo(p);if(!info)return;
    const d=document.createElement("div");d.className="zu-tile";d.dataset.zup=p;d.id="zu-t-"+p;
    d.setAttribute("onclick",`navigate('${p}');closeMoreMenu()`);d.setAttribute("role","button");d.tabIndex=0;
    d.style.cssText="position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:10px;background:var(--card);cursor:pointer";
    d.innerHTML=`<i class="ti ${esc(info.ic)}" style="font-size:22px"></i><span style="font-size:10px">${esc(info.label)}</span>`;
    d.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();d.click();}});
    if(grid)grid.prepend(d);else m.prepend(d);
  });
  zpMarkNav();
}
function zuAll(){try{zuBnav();zuPlusTiles();zuWhy();}catch(_){}}
if(typeof zpSet==="function"){
  const _zuSet=zpSet;
  zpSet=function(r){
    const okId=v=>typeof v==="string"&&/^[a-z0-9_-]{1,40}$/.test(v);
    const a5=r&&r.locked?Object.keys(r.locked).filter(k=>okId(k)&&r.locked[k]==="act5"):[];
    const mid=r&&r.activity&&typeof r.activity==="object"?Math.max(1,parseInt(r.activity.mid,10)||5):5;
    const res=_zuSet.apply(this,arguments);
    try{
      if(ZPV.s){a5.forEach(k=>{ZPV.s.locked[k]="act5";});if(ZPV.s.activity)ZPV.s.activity.mid=mid;}
      zpMarkNav();
      if(typeof zoSide==="function")zoSide();
      zuAll();
      const cur=document.querySelector(".page.active")?.id?.replace("page-","");
      if(cur&&cur!=="zdlock"&&a5.includes(cur))navigate(cur);
    }catch(_){}
    return res;
  };
}
if(typeof zlBnav==="function"){
  const _zuZB=zlBnav;
  zlBnav=function(){const r=_zuZB.apply(this,arguments);try{zpMarkNav();zuBnav();}catch(_){}return r;};
}
if(typeof toggleMoreMenu==="function"){
  const _zuTM=toggleMoreMenu;
  toggleMoreMenu=function(){const r=_zuTM.apply(this,arguments);const f=()=>{try{zuPlusTiles();zuWhy();}catch(_){}};setTimeout(f,0);setTimeout(f,150);setTimeout(f,400);return r;};
}
(function(){
  const mm=document.getElementById("more-menu");if(!mm||typeof MutationObserver!=="function")return;
  let busy=false;
  new MutationObserver(()=>{if(busy)return;busy=true;requestAnimationFrame(()=>{try{zuWhy();}catch(_){}busy=false;});}).observe(mm,{childList:true,subtree:true});
})();
try{if(State.token&&ZPV.s)zuAll();}catch(_){}
