function zlT(k,v){let s=t(k);Object.entries(v||{}).forEach(([a,b])=>{s=s.split("{"+a+"}").join(b);});return s;}
function zlNeeds(p){
  const s=ZPV&&ZPV.s;if(!s||!Array.isArray(s.steps))return [];
  const own=s.steps.find(x=>x.page===p);
  const idx=own&&Array.isArray(own.need)&&own.need.length?own.need:[zpLocked(p)];
  return idx.filter(i=>Number.isInteger(i)&&s.steps[i]).map(i=>s.steps[i]);
}
function zlDo(st){const s=ZPV.s;return zpTx(`zp_${s.sector}_${st.key}_do`)||zlT("zl_fill",{s:zpStepLabel(s.sector,st.key)});}
function zlWhy(p){const miss=zlNeeds(p).filter(x=>!x.done);if(!miss.length)return "";return zlT("zl_why",{x:miss.map(zlDo).join(t("zl_and"))});}
if(typeof zpRowNote==="function"){
  const _zlRN=zpRowNote;
  zpRowNote=function(s,x,cur){if(x&&x.locked&&!x.done){const w=zlWhy(x.page);if(w)return w;}return _zlRN.apply(this,arguments);};
}
function zlSheet(p){
  const s=ZPV&&ZPV.s;if(!s)return;
  const needs=zlNeeds(p);if(!needs.length)return;
  const first=needs.find(x=>!x.done)||needs[0];
  const lbl=zpPageLabel(p);
  const rows=needs.map(x=>`<li class="zl-row ${x.done?"ok":"todo"}"><span class="zp-dot ${x.done?"ok":"cur"}">${x.done?ZP_SVG.ok:String(x.n)}</span><div><b>${esc(zpStepLabel(s.sector,x.key))}</b><small>${esc(x.done?t("zp_done"):zlDo(x))}</small></div></li>`).join("");
  let ov=document.getElementById("zl-sheet");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="zl-sheet";ov.className="modal-overlay";ov.style.display="flex";ov.style.alignItems="flex-end";
  ov.onclick=e=>{if(e.target===ov)zlClose();};
  ov.innerHTML=`<div class="modal zx-sheet zl-box" role="dialog" aria-modal="true" aria-labelledby="zl-t"><span class="zx-grab" aria-hidden="true"></span>
    <div class="zl-head"><span class="zl-ic">${ZP_SVG.lock}</span><h2 id="zl-t">${esc(zlT("zl_title",{p:lbl}))}</h2></div>
    <p>${esc(t("zl_need"))}</p><ol class="zl-list">${rows}</ol>
    <button type="button" class="btn btn-g zl-go" id="zl-go">${esc(zpTx(`zp_${s.sector}_${first.key}_btn`)||zpStepLabel(s.sector,first.key))}</button>
    <button type="button" class="zx-link" onclick="zlClose()">${esc(t("zq_s_later"))}</button></div>`;
  document.body.appendChild(ov);
  ov.querySelector("#zl-go").onclick=()=>{zlClose();zpGo(first.page,!ZP_NOAUTO.has(first.key));};
  setTimeout(()=>{try{ov.querySelector("#zl-go").focus();}catch(_){}},50);
}
function zlClose(){document.getElementById("zl-sheet")?.remove();}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("zl-sheet"))zlClose();});
if(typeof navigate==="function"){
  const _zlNav=navigate;
  navigate=function(p){
    try{
      const ev=window.event,user=ev&&/^(click|keydown|keyup|pointerup|touchend)$/.test(ev.type);
      const act=document.querySelector(".page.active")?.id?.replace("page-","");
      if(user&&typeof p==="string"&&p!==act&&typeof zpLocked==="function"&&zpLocked(p)!=null&&zlNeeds(p).length){
        try{if(typeof closeMoreMenu==="function")closeMoreMenu();}catch(_){}
        try{if(typeof zxPlusClose==="function")zxPlusClose();}catch(_){}
        zlSheet(p);return;
      }
    }catch(_){}
    return _zlNav.apply(this,arguments);
  };
}
const ZL={unread:0};
function zlMsgItem(){return `<div class="bnav-item" data-bp="messaging" onclick="navigate('messaging')"><span class="zl-bi"><i class="ti ti-message-circle"></i><span class="zl-bb" id="zl-msg-bb"${ZL.unread>0?"":" hidden"}>${ZL.unread>99?"99+":ZL.unread}</span></span><span>${esc(t("zx_msgs"))}</span></div>`;}
function zlBnav(){
  if(typeof zdIsClientAcc==="function"&&zdIsClientAcc())return;
  const inner=document.querySelector(".bottom-nav-inner");if(!inner)return;
  const prof=inner.querySelector('.bnav-item[data-bp="profile"]');
  if(prof&&!inner.querySelector('.bnav-item[data-bp="messaging"]')){
    const tmp=document.createElement("div");tmp.innerHTML=zlMsgItem();const it=tmp.firstElementChild;
    if(typeof memberCanOpen==="function"&&!memberCanOpen("messaging"))return;
    prof.replaceWith(it);
    const act=document.querySelector(".page.active")?.id?.replace("page-","");if(act==="messaging")it.classList.add("active");
  }else if(prof)prof.remove();
  zlBadge();
}
function zlBadge(){
  const b=document.getElementById("zl-msg-bb");if(!b)return;
  if(ZL.unread>0){b.textContent=ZL.unread>99?"99+":String(ZL.unread);b.hidden=false;b.setAttribute("aria-label",zlT("zl_unread",{n:ZL.unread}));}else{b.hidden=true;}
}
if(typeof cmOnPulse==="function"){
  const _zlP=cmOnPulse;
  cmOnPulse=function(r){try{if(r&&r.unread_messages!=null){ZL.unread=Math.max(0,parseInt(r.unread_messages,10)||0);zlBadge();}}catch(_){}return _zlP.apply(this,arguments);};
}
if(typeof applySectorUI==="function"){
  const _zlASU=applySectorUI;
  applySectorUI=function(){const r=_zlASU.apply(this,arguments);try{zlBnav();}catch(_){}return r;};
}
function zlProfileTile(){
  const m=document.getElementById("more-menu");if(!m||document.getElementById("zl-prof-tile"))return;
  const d=document.createElement("div");d.id="zl-prof-tile";d.setAttribute("onclick","navigate('profile');closeMoreMenu()");d.setAttribute("role","button");d.tabIndex=0;
  d.style.cssText="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:10px;background:var(--card);cursor:pointer";
  d.innerHTML=`<i class="ti ti-user-circle" style="font-size:22px"></i><span style="font-size:10px">${esc(t("bnav_profile"))}</span>`;
  d.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();d.click();}});
  const g=document.querySelector("#mm-s-account .mm-grid");if(g)g.prepend(d);else m.appendChild(d);
}
if(typeof toggleMoreMenu==="function"){
  const _zlTM=toggleMoreMenu;
  toggleMoreMenu=function(){const r=_zlTM.apply(this,arguments);try{zlProfileTile();setTimeout(()=>{const g=document.querySelector("#mm-s-account .mm-grid"),d=document.getElementById("zl-prof-tile");if(g&&d&&d.parentElement!==g)g.prepend(d);const sp=d&&d.querySelector("span");if(sp)sp.textContent=t("bnav_profile");},60);}catch(_){}return r;};
}
function zlAvatar(){
  const av=document.getElementById("topbar-av");if(!av||av.dataset.zl)return;
  av.dataset.zl="1";av.setAttribute("role","button");av.tabIndex=0;av.style.cursor="pointer";
  av.setAttribute("aria-label",t("bnav_profile"));
  av.addEventListener("click",()=>navigate("profile"));
  av.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();navigate("profile");}});
}
if(typeof applyLanguage==="function"){
  const _zlL=applyLanguage;
  applyLanguage=function(){const r=_zlL.apply(this,arguments);try{const it=document.querySelector('.bottom-nav-inner .bnav-item[data-bp="messaging"] > span:last-child');if(it&&document.getElementById("zl-msg-bb"))it.textContent=t("zx_msgs");zlBadge();const av=document.getElementById("topbar-av");if(av)av.setAttribute("aria-label",t("bnav_profile"));}catch(_){}return r;};
}
if(typeof showAppLayout==="function"){
  const _zlSAL=showAppLayout;
  showAppLayout=async function(){const r=await _zlSAL.apply(this,arguments);try{zlAvatar();zlBnav();}catch(_){}return r;};
}
try{zlAvatar();if(State.token)zlBnav();}catch(_){}
