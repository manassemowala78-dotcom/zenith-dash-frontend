/* Zenith Dash 10.9.0 — parcours guidé par secteur, étapes verrouillées qui s'ouvrent avec les données, menu ⋯, guide d'utilisation */
const ZPV={s:null,at:0,p:null,lockFor:null,soon:null,first:true};
const ZP_LBL={
  pme:{company:"zp_l_company",clients:"zp_l_clients",quotes:"zp_l_quotes",invoices:"zp_l_invoices"},
  restaurant:{tables:"nav_resto_floor",menu:"nav_resto_menu",kitchen:"nav_resto_kitchen_short",report:"nav_resto_report"},
  bar:{tables:"nav_resto_floor",menu:"nav_resto_menu",tabs:"nav_bar_tabs",report:"nav_resto_report"},
  cold:{rooms:"nav_cold_rooms_short",lots:"nav_cold_lots_short",exits:"nav_cold_moves",billing:"nav_cold_billing"},
  hotel:{rooms:"nav_hotel_rooms_short",bookings:"nav_hotel_planning",arrivals:"nav_hotel_front",report:"nav_hotel_report"},
  beauty:{services:"nav_beauty_services",staff:"nav_beauty_staff_short",agenda:"nav_beauty_agenda",report:"nav_beauty_report"},
  retail:{items:"nav_retail_catalog_short",pos:"nav_retail_pos_short",credits:"nav_retail_credits",report:"nav_retail_report"},
  pharmacy:{items:"nav_retail_catalog_short",lots:"nav_retail_lots",pos:"nav_retail_pos_short",rx:"nav_pharma_rx"},
  school:{classes:"nav_school_classes_short",students:"nav_school_students_short",attendance:"nav_school_attendance",fees:"nav_school_fees_short"},
  garage:{mechanics:"nav_ga_mechanics",vehicles:"nav_ga_vehicles",jobs:"nav_ga_jobs",report:"nav_ga_report"}};
const ZP_STATIC={profile:"bnav_profile",clients:"zp_l_clients",quotes:"zp_l_quotes",invoices:"zp_l_invoices",dashboard:"nav_dashboard"};
const ZP_NOAUTO=new Set(["report","credits","rx","company","arrivals"]);
const ZD_TIDY_SKIP=new Set(["messaging","admin","zdlock","zdguide","pos"]);
const ZP_SVG={
  ok:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="zp-check" d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  lock:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  lockBig:'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'};

function zpTx(k){const v=t(k);return v&&v!==k?v:null;}
function zpOn(){return !!(State.token&&State.tenant&&!State.restricted&&!(typeof zdIsClientAcc==="function"&&zdIsClientAcc()));}
function zpTid(){return (State.tenant&&(State.tenant.linked_account_id||State.tenant.id))||"x";}
function zpManager(){return typeof isTeamMember!=="function"||!isTeamMember()||(typeof zdIsMgrRole==="function"&&zdIsMgrRole());}
function zpHidden(){try{return localStorage.getItem("zd_zp_hide_"+zpTid())==="1";}catch(_){return false;}}
function zpSetHidden(v){try{v?localStorage.setItem("zd_zp_hide_"+zpTid(),"1"):localStorage.removeItem("zd_zp_hide_"+zpTid());}catch(_){}zpRenderBox();zdRetidy();}
function zpLocked(p){const s=ZPV.s;if(!p||!s||!s.locked||!zpOn())return null;const v=s.locked[p];return v==null?null:v;}
function zpStepLabel(sec,k){const key=(ZP_LBL[sec]||{})[k];return (key&&zpTx(key))||k;}
function zpPageLabel(p){
  if(ZP_STATIC[p]&&zpTx(ZP_STATIC[p]))return zpTx(ZP_STATIC[p]);
  for(const m in (typeof MODULE_PAGES==="object"?MODULE_PAGES:{})){
    const e=(MODULE_PAGES[m]||[]).find(x=>x[0]===p);
    if(e)return zpTx(e[2]+"_short")||zpTx(e[2])||p;
  }
  return p;
}
function zpSep(){return State.lang==="ar"?"، ":", ";}

async function zpLoad(force){
  if(!zpOn()){ZPV.s=null;return null;}
  if(!force&&ZPV.s&&Date.now()-ZPV.at<4000)return ZPV.s;
  if(ZPV.p)return ZPV.p;
  ZPV.p=(async()=>{
    try{const r=await api("GET","/parcours");ZPV.at=Date.now();zpSet(r);}catch(_){}
    finally{ZPV.p=null;}
    return ZPV.s;
  })();
  return ZPV.p;
}
function zpRefreshSoon(){if(ZPV.s&&ZPV.s.all_done)return;clearTimeout(ZPV.soon);ZPV.soon=setTimeout(()=>zpLoad(true),700);}
function zpSet(r){
  if(!r||!Array.isArray(r.steps))return;
  const okId=v=>typeof v==="string"&&/^[a-z0-9_-]{1,40}$/.test(v);
  r.steps=r.steps.filter(x=>x&&okId(x.page)&&okId(x.key));
  const lk={};Object.keys(r.locked||{}).forEach(k=>{if(okId(k)&&Number.isInteger(r.locked[k]))lk[k]=r.locked[k];});r.locked=lk;
  r.sector=okId(r.sector)?r.sector:"pme";
  const prev=ZPV.s;ZPV.s=r;
  if(prev&&prev.sector===r.sector&&!ZPV.first){
    const opened=r.steps.find(x=>!x.locked&&(prev.steps.find(y=>y.key===x.key)||{}).locked);
    if(r.all_done&&!prev.all_done&&r.steps.length)showToast(t("zp_all_open"));
    else if(opened)showToast(t("zp_unlocked").replace("{s}",zpStepLabel(r.sector,opened.key)));
  }
  ZPV.first=false;
  zpMarkNav();
  if(document.querySelector("#page-dashboard.active"))zpRenderBox();
  const act=document.querySelector(".page.active");
  const id=act?act.id.replace("page-",""):"";
  if(id==="zdlock"&&ZPV.lockFor&&zpLocked(ZPV.lockFor)==null){const q=ZPV.lockFor;ZPV.lockFor=null;navigate(q);}
  else if(id&&id!=="zdlock"&&zpLocked(id)!=null)navigate(id);
}

function zpRowNote(s,x,cur){
  if(x.done)return t("zp_done");
  if(x.locked)return t("zp_after").replace("{n}",x.missing+1);
  return zpTx(`zp_${s.sector}_${x.key}_hint`)||t("zp_todo");
}
function zpRenderBox(){
  const dash=document.getElementById("page-dashboard");if(!dash)return;
  let box=document.getElementById("zp-start");
  if(!box){box=document.createElement("section");box.id="zp-start";box.className="card zp-box";box.setAttribute("aria-labelledby","zp-start-t");dash.prepend(box);}
  const s=ZPV.s;
  const show=zpOn()&&s&&s.steps&&s.steps.length&&!s.all_done&&zpManager()&&!zpHidden();
  if(!show){box.style.display="none";box.innerHTML="";return;}
  const old=document.getElementById("onboarding-checklist");if(old)old.style.display="none";
  const cur=s.steps.find(x=>!x.done&&!x.locked);
  const rows=s.steps.map(x=>{
    const c=x.done?"ok":x.locked?"lk":x===cur?"cur":"todo";
    const dot=x.done?ZP_SVG.ok:x.locked?ZP_SVG.lock:String(x.n);
    return `<li class="zp-row ${c}" role="button" tabindex="0" data-page="${esc(x.page)}" onclick="zpGo('${esc(x.page)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();zpGo('${esc(x.page)}');}">
      <span class="zp-dot ${c}">${dot}</span><div><div class="zp-name">${esc(zpStepLabel(s.sector,x.key))}</div><div class="zp-note">${esc(zpRowNote(s,x,cur))}</div></div></li>`;
  }).join("");
  const lk=Object.keys(s.locked||{}).length;
  box.style.display="block";
  box.innerHTML=`<div class="zp-head"><div><h2 class="zp-title" id="zp-start-t">${esc(t("zp_title"))}</h2><p class="zp-sub">${esc(t("zp_sub"))}${lk?" "+esc(t("zp_sub_lock")):""}</p></div></div>
    <ol class="zp-list">${rows}</ol>
    ${cur?`<button type="button" class="btn btn-g zp-go" onclick="zpGo('${esc(cur.page)}',${ZP_NOAUTO.has(cur.key)?"false":"true"})">${esc(zpTx(`zp_${s.sector}_${cur.key}_btn`)||zpStepLabel(s.sector,cur.key))}</button>`:""}`;
}

function zpGo(page,auto){
  navigate(page);
  if(!auto||zpLocked(page)!=null)return;
  const until=Date.now()+5000;
  const tick=()=>{
    const pg=document.querySelector(".page.active");
    const b=pg&&pg.id==="page-"+page&&pg.querySelector(".sh .btn-g:not([disabled])");
    if(b&&b.offsetParent&&!b.closest(".zd-more-m")){b.click();return;}
    if(Date.now()<until)setTimeout(tick,150);
  };
  setTimeout(tick,250);
}

function zpLockHtml(p){
  const s=ZPV.s,mi=zpLocked(p);
  const miss=s.steps[mi]||{key:"",page:"dashboard"};
  const own=s.steps.find(x=>x.page===p);
  const head=(own&&zpTx(`zp_${s.sector}_${own.key}_for`))||t("zp_for_page").replace("{p}",zpPageLabel(p));
  const todo=zpTx(`zp_${s.sector}_${miss.key}_do`)||zpStepLabel(s.sector,miss.key);
  const line=own?t("zp_stepof").replace("{n}",own.n).replace("{t}",s.total):zpPageLabel(p);
  const btn=zpTx(`zp_${s.sector}_${miss.key}_btn`)||zpStepLabel(s.sector,miss.key);
  return `<div class="zp-lock" role="region" aria-labelledby="zp-lock-t">
    <span class="zp-lki">${ZP_SVG.lockBig}</span>
    <div class="zp-step">${esc(line)}</div>
    <h1 id="zp-lock-t">${esc(head+zpSep()+todo)}.</h1>
    <p>${esc(t("zp_why"))}</p>
    <div class="zp-acts">
      <button type="button" class="btn btn-g zp-go" onclick="zpGo('${esc(miss.page)}',${ZP_NOAUTO.has(miss.key)?"false":"true"})">${esc(btn)}</button>
      <button type="button" class="zp-link" onclick="navigate('dashboard')">${esc(t("zp_back"))}</button>
    </div></div>`;
}
function zpActivate(id){const el=ensureSectorPage(id);document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x===el));return el;}
V93_PAGES.zdlock=async function(){
  const el=zpActivate("zdlock");
  const p=ZPV.lockFor;
  if(!p||zpLocked(p)==null){ZPV.lockFor=null;navigate(p||"dashboard");return;}
  el.innerHTML=zpLockHtml(p);
  document.querySelector(`[data-p="${p}"]`)?.classList.add("active");
  document.querySelector(`[data-bp="${p}"]`)?.classList.add("active");
};

function zgPrint(){document.body.classList.add("zg-print");setTimeout(()=>{try{window.print();}finally{setTimeout(()=>document.body.classList.remove("zg-print"),400);}},50);}
function zdOpenGuide(){navigate("zdguide");}
V93_PAGES.zdguide=async function(){
  const el=zpActivate("zdguide");
  await zpLoad();
  const s=ZPV.s,sec=(s&&s.sector)||(State.tenant&&State.tenant.sector)||"pme";
  const steps=(s&&s.steps)||[];
  const li=steps.map(x=>{
    const needs=(x.need||[]).map(i=>steps[i]&&zpStepLabel(sec,steps[i].key)).filter(Boolean).join(" · ");
    return `<li><span class="zg-n">${x.n}</span><div class="zg-b"><div class="zg-t">${esc(zpStepLabel(sec,x.key))}</div>
      <div class="zg-x">${esc(zpTx(`zp_${sec}_${x.key}_hint`)||"")}</div>
      <div class="zg-w">${esc(t("zp_g_where").replace("{p}",zpPageLabel(x.page)))}${needs?" · "+esc(t("zp_g_needs").replace("{s}",needs)):""}</div></div>
      <button type="button" class="btn btn-o btn-sm zg-o" onclick="zpGo('${esc(x.page)}')">${esc(t("zp_g_open"))}</button></li>`;
  }).join("");
  el.innerHTML=`<div class="zg">
    <div class="sh" data-zt="1"><div><div class="st">${esc(t("zp_g_title"))}</div><div class="ss">${esc(typeof sectorLabel==="function"?sectorLabel(sec):sec)}</div></div>
      <div><button type="button" class="btn btn-g btn-sm zg-noprint" onclick="zgPrint()"><i class="ti ti-printer" aria-hidden="true"></i> ${esc(t("zp_g_print"))}</button></div></div>
    <p class="zg-sub">${esc(t("zp_g_sub"))}</p>
    ${li?`<h2>${esc(t("zp_g_steps"))}</h2><ol>${li}</ol>`:""}
    <h2>${esc(t("zp_g_tips"))}</h2>
    <div class="zg-tips">${["zp_g_tip1","zp_g_tip2","zp_g_tip3","zp_g_tip4"].map(k=>`<p>${esc(t(k))}</p>`).join("")}</div></div>`;
};

function zpMarkNav(){
  const lk=(zpOn()&&ZPV.s&&ZPV.s.locked)||{};
  document.querySelectorAll('.sidebar .nav-i[data-p], .bnav-item[data-bp], #more-menu [onclick*="navigate("]').forEach(el=>{
    const p=el.dataset.p||el.dataset.bp||((el.getAttribute("onclick")||"").match(/navigate\('([a-z0-9_-]+)'\)/)||[])[1];
    const on=!!p&&lk[p]!=null;
    el.classList.toggle("zp-lk",on);
    let i=el.querySelector(":scope > .zp-lkx");
    if(on&&!i){i=document.createElement("i");i.className="ti ti-lock zp-lkx";i.setAttribute("aria-hidden","true");el.appendChild(i);el.setAttribute("title",t("zp_locked"));}
    if(!on&&i){i.remove();el.removeAttribute("title");}
  });
}

function zdCloseMenus(except){document.querySelectorAll(".zd-more.open").forEach(w=>{if(w!==except){w.classList.remove("open");w.querySelector(".zd-more-b")?.setAttribute("aria-expanded","false");}});}
function zdRetidy(){document.querySelectorAll(".page.active .sh[data-zt]").forEach(sh=>{if(sh.closest("#page-zdguide"))return;const w=sh.querySelector(".zd-more");if(w){[...w.querySelectorAll(".zd-mi:not(.zd-own)")].forEach(b=>{b.classList.remove("zd-mi");b.removeAttribute("role");w.before(b);});w.remove();}delete sh.dataset.zt;});zdTidy();}
function zdTidyMove(acts,m){
  const btns=[...acts.querySelectorAll(":scope > button, :scope > a.btn, :scope > label.btn")].filter(b=>!b.classList.contains("zd-more-b"));
  const primary=btns.find(b=>b.classList.contains("btn-g"))||null;
  const move=btns.filter(b=>b!==primary&&(b.textContent||"").trim().length>0);
  if(!move.length)return;
  let sep=m.querySelector(":scope > .zd-msep");
  if(!sep){sep=document.createElement("div");sep.className="zd-msep";m.prepend(sep);}
  move.forEach(b=>{b.classList.add("zd-mi");b.setAttribute("role","menuitem");sep.before(b);});
}
function zdOwnItems(m,id){
  m.querySelectorAll(":scope > .zd-own").forEach(x=>x.remove());
  const own=(lbl,icon,fn)=>{const b=document.createElement("button");b.type="button";b.className="btn zd-mi zd-own";b.setAttribute("role","menuitem");b.innerHTML=`<i class="ti ti-${icon}" aria-hidden="true"></i> ${esc(lbl)}`;b.addEventListener("click",fn);m.appendChild(b);};
  if(id==="dashboard"&&ZPV.s&&ZPV.s.steps&&ZPV.s.steps.length&&!ZPV.s.all_done&&zpManager()){
    const h=zpHidden();own(t(h?"zp_show":"zp_hide"),h?"eye":"eye-off",()=>zpSetHidden(!h));
  }
  own(t("zp_help"),"help",()=>zdOpenGuide());
}
function zdTidy(){
  const pg=document.querySelector(".page.active");if(!pg||!State.token)return;
  const id=pg.id.replace("page-","");if(ZD_TIDY_SKIP.has(id))return;
  const sh=[...pg.querySelectorAll(".sh")].find(x=>!x.closest(".modal,.modal-overlay"));
  if(!sh)return;
  if(sh.dataset.zt){const w=sh.querySelector(":scope .zd-more");if(w&&w.parentElement)zdTidyMove(w.parentElement,w.querySelector(".zd-more-m"));return;}
  sh.dataset.zt="1";
  const kids=[...sh.children];
  let acts=kids.length>1?kids[kids.length-1]:null;
  if(!acts||acts.querySelector(".st")||acts.matches("button,a")){
    const d=document.createElement("div");d.style.cssText="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end";
    if(acts&&acts.matches("button,a"))acts.before(d),d.appendChild(acts);else sh.appendChild(d);
    acts=d;
  }
  const w=document.createElement("div");w.className="zd-more";
  w.innerHTML=`<button type="button" class="btn btn-o btn-sm zd-more-b" aria-haspopup="menu" aria-expanded="false" aria-label="${esc(t("zp_more"))}" title="${esc(t("zp_more"))}"><i class="ti ti-dots" aria-hidden="true"></i></button><div class="zd-more-m" role="menu"></div>`;
  const m=w.lastElementChild;
  zdOwnItems(m,id);
  acts.appendChild(w);
  zdTidyMove(acts,m);
}
document.addEventListener("click",e=>{
  const b=e.target.closest&&e.target.closest(".zd-more-b");
  if(b){const w=b.parentElement;const open=!w.classList.contains("open");if(open){const pg=w.closest(".page");zdOwnItems(w.querySelector(".zd-more-m"),pg?pg.id.replace("page-",""):"");}zdCloseMenus(w);w.classList.toggle("open",open);b.setAttribute("aria-expanded",String(open));if(open)w.querySelector(".zd-more-m .zd-mi")?.focus();return;}
  if(e.target.closest&&e.target.closest(".zd-more-m .zd-mi")){setTimeout(()=>zdCloseMenus(),0);return;}
  if(!(e.target.closest&&e.target.closest(".zd-more")))zdCloseMenus();
},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.querySelector(".zd-more.open")){const w=document.querySelector(".zd-more.open");zdCloseMenus();w.querySelector(".zd-more-b")?.focus();}});

(function(){
  try{
    if(!localStorage.getItem("zd_v109_soft")){
      localStorage.setItem("zd_v109_soft","1");
      let explicit=false;
      try{const tn=JSON.parse(localStorage.getItem("zd_tenant")||"null");const k="zd_ui_"+((tn&&(tn.linked_account_id||tn.id))||"x");explicit=!!(JSON.parse(localStorage.getItem(k)||"{}")||{}).theme;}catch(_){}
      if(!explicit){localStorage.setItem("zd_theme","soft");State.theme="soft";}
    }
  }catch(_){}
  if(typeof zdPageGuard==="function"){
    const _g=zdPageGuard;
    zdPageGuard=function(p){p=_g(p);if(zpLocked(p)!=null){ZPV.lockFor=p;return "zdlock";}return p;};
  }
  if(typeof api==="function"){
    const _a=api;
    api=async function(method,path){
      const r=await _a.apply(this,arguments);
      try{if(method!=="GET"&&zpOn()&&typeof path==="string"&&!/^\/(conversations|messages|msg|calls|push|notifications|profile\/ui-prefs|presence|typing|sessions|parcours|auth)/.test(path))zpRefreshSoon();}catch(_){}
      return r;
    };
  }
  if(typeof loadChecklist==="function"){
    const _c=loadChecklist;
    loadChecklist=async function(){
      await zpLoad();
      if(ZPV.s&&ZPV.s.steps&&ZPV.s.steps.length){const o=document.getElementById("onboarding-checklist");if(o)o.style.display="none";zpRenderBox();return;}
      return _c.apply(this,arguments);
    };
  }
  if(typeof quickActionAllowed==="function"){
    const _q=quickActionAllowed;
    quickActionAllowed=function(a){return _q(a)&&zpLocked(a.page)==null;};
  }
  if(typeof applySectorUI==="function"){
    const _s=applySectorUI;
    applySectorUI=function(){const r=_s.apply(this,arguments);try{zpMarkNav();}catch(_){}return r;};
  }
  if(typeof toggleMoreMenu==="function"){
    const _m=toggleMoreMenu;
    toggleMoreMenu=function(){const r=_m.apply(this,arguments);setTimeout(()=>{try{zpMarkNav();}catch(_){}},30);return r;};
  }
  if(typeof applyLanguage==="function"){
    const _l=applyLanguage;
    applyLanguage=function(){const r=_l.apply(this,arguments);try{zpMarkNav();if(document.querySelector("#page-dashboard.active"))zpRenderBox();zdRetidy();const a=document.querySelector(".page.active");if(a&&(a.id==="page-zdlock"||a.id==="page-zdguide"))V93_PAGES[a.id.slice(5)]();}catch(_){}return r;};
  }
  if(typeof updateFabVisibility==="function"){
    const _f=updateFabVisibility;
    updateFabVisibility=function(page){const r=_f.apply(this,arguments);if(page==="zdlock"||page==="zdguide"){const fab=document.getElementById("zd-fab");if(fab)fab.style.display="none";}return r;};
  }
  if(typeof doLogout==="function"){
    const _o=doLogout;
    doLogout=function(){ZPV.s=null;ZPV.first=true;ZPV.lockFor=null;return _o.apply(this,arguments);};
  }
  let tT=null;
  const mo=new MutationObserver(()=>{clearTimeout(tT);tT=setTimeout(()=>{try{zdTidy();zpMarkNav();}catch(_){}},120);});
  const start=()=>{const m=document.querySelector("main.main")||document.body;mo.observe(m,{childList:true,subtree:true});const sb=document.querySelector(".sidebar");if(sb)mo.observe(sb,{childList:true,subtree:true});};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
  setInterval(()=>{if(zpOn()&&document.visibilityState==="visible")zpLoad(true);},90000);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&zpOn())zpLoad(true);});
  const boot=()=>{if(zpOn())zpLoad(true);};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,600));else setTimeout(boot,600);
})();
