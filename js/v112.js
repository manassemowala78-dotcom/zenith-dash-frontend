const ZAP={day:"07:00",night:"19:00",timer:null};
function zapT(k,v){let s=t(k);Object.entries(v||{}).forEach(([a,b])=>{s=s.split("{"+a+"}").join(b);});return s;}
function zapMin(s){const m=/^(\d{2}):(\d{2})$/.exec(s||"");return m?(+m[1])*60+(+m[2]):null;}
function zapDay(){return (UI.p&&UI.p.day)||ZAP.day;}
function zapNightFrom(){return (UI.p&&UI.p.night)||ZAP.night;}
function zapIsNight(now){
  const d=zapMin(zapDay()),n=zapMin(zapNightFrom());if(d==null||n==null||d===n)return false;
  const x=now||new Date(),m=x.getHours()*60+x.getMinutes();
  const isDay=d<n?(m>=d&&m<n):(m>=d||m<n);
  return !isDay;
}
function zapNorm(){
  if(!UI.p)UI.p={};
  if(!["soft","soft-dark"].includes(UI.p.theme))delete UI.p.theme;
  delete UI.p.accent;
  if(!["l","xl"].includes(UI.p.font))delete UI.p.font;
  ["day","night"].forEach(k=>{if(UI.p[k]!=null&&zapMin(UI.p[k])==null)delete UI.p[k];});
  ["warm","hc","calm"].forEach(k=>{if(UI.p[k]!==true)delete UI.p[k];});
}
function zapResolve(){
  const night=zapIsNight();
  const th=UI.p&&UI.p.theme;
  const dark=th==="soft-dark"?true:(th==="soft"?false:night);
  return {dark,night,warm:!!(UI.p&&UI.p.warm)&&night,hc:!!(UI.p&&UI.p.hc),calm:!!(UI.p&&UI.p.calm)};
}
function zapPaint(){
  zapNorm();
  const r=zapResolve(),h=document.documentElement;
  h.classList.toggle("light",!r.dark);
  h.classList.add("zd-soft");
  h.classList.toggle("zd-sd",r.dark);
  h.classList.toggle("zd-warm",r.warm);
  h.classList.toggle("zd-hc",r.hc);
  h.classList.toggle("zd-calm",r.calm);
  delete h.dataset.accent;
  const v=r.dark?"soft-dark":"soft";
  State.theme=v;try{localStorage.setItem("zd_theme",v);}catch(_){}
  try{let m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",r.dark?(r.hc?"#000000":(r.warm?"#201A14":"#1B1A18")):(r.hc?"#FFFFFF":"#F7F3EC"));}catch(_){}
}
setTheme=function(){zapPaint();};
uiTheme=zapPaint;
if(typeof uiThemeBtns==="function")uiThemeBtns=function(){};
if(typeof uiApply==="function"){
  const _zaUA=uiApply;
  uiApply=function(){zapNorm();return _zaUA.apply(this,arguments);};
}
function zapSet(k,v){
  zapNorm();
  if(k==="auto"){if(v)delete UI.p.theme;else UI.p.theme=zapResolve().dark?"soft-dark":"soft";}
  else if(k==="theme"){UI.p.theme=v==="soft-dark"?"soft-dark":"soft";}
  else if(k==="day"||k==="night"){if(zapMin(v)!=null){if(v===ZAP[k])delete UI.p[k];else UI.p[k]=v;}}
  else if(k==="font"){if(v==="l"||v==="xl")UI.p.font=v;else delete UI.p.font;}
  else if(["warm","hc","calm"].includes(k)){if(v)UI.p[k]=true;else delete UI.p[k];}
  uiChanged();zapPaint();
  if(document.getElementById("zap-sheet"))zapOpen(true);
  zapProfileCard();
}
function zapSw(k,on,label){return `<button type="button" role="switch" aria-checked="${on}" aria-label="${esc(label)}" class="zap-sw${on?" on":""}" onclick="zapSet('${k}',${!on})"><span aria-hidden="true"></span></button>`;}
function zapRow(title,sub,right,id){return `<div class="zap-row"${id?` id="${id}"`:""}><div class="zap-tx"><b>${esc(title)}</b><small>${esc(sub)}</small></div>${right}</div>`;}
function zapChoice(v,cur,dim){
  const on=cur===v;
  return `<button type="button" aria-pressed="${on}" class="zap-ch${on?" on":""}${dim?" dim":""}" onclick="zapSet('theme','${v}')"><span class="zap-prev ${v==="soft-dark"?"d":"l"}" aria-hidden="true"><i></i><i></i></span><span>${esc(t(v==="soft-dark"?"zap_dark":"zap_light"))}</span></button>`;
}
function zapOpen(keep){
  zapNorm();
  const auto=!UI.p.theme,r=zapResolve(),cur=UI.p.theme||(r.dark?"soft-dark":"soft"),fs=UI.p.font||"m";
  const sizes=[["m",14,"zap_fs_m"],["l",17,"zap_fs_l"],["xl",20,"zap_fs_xl"]];
  const seg=`<div class="zap-seg" role="radiogroup" aria-label="${esc(t("zap_fs"))}">${sizes.map(([v,px,k])=>`<button type="button" role="radio" aria-checked="${fs===v}" aria-label="${esc(t(k))}" class="${fs===v?"on":""}" style="font-size:${px}px" onclick="zapSet('font','${v}')">A</button>`).join("")}</div>`;
  const html=`<div class="zap-head"><h2 id="zap-t">${esc(t("zap_title"))}</h2><span class="zap-now">${esc(t(r.dark?"zap_now_d":"zap_now_l"))}</span></div>
    <div class="zap-cap">${esc(t("zap_sec_time"))}</div>
    ${zapRow(t("zap_auto"),t("zap_auto_x"),zapSw("auto",auto,t("zap_auto")))}
    ${auto?`<div class="zap-times"><label>${esc(t("zap_day"))}<input type="time" class="inp" value="${esc(zapDay())}" onchange="zapSet('day',this.value)"></label><label>${esc(t("zap_night"))}<input type="time" class="inp" value="${esc(zapNightFrom())}" onchange="zapSet('night',this.value)"></label></div>`:""}
    <div class="zap-chs">${zapChoice("soft",cur,auto)}${zapChoice("soft-dark",cur,auto)}</div>
    <p class="zap-note">${esc(t(auto?"zap_manual_x":"zap_manual_on"))}</p>
    <div class="zap-cap">${esc(t("zap_sec_eyes"))}</div>
    ${zapRow(t("zap_warm"),t("zap_warm_x"),zapSw("warm",!!UI.p.warm,t("zap_warm")))}
    ${zapRow(t("zap_hc"),t("zap_hc_x"),zapSw("hc",!!UI.p.hc,t("zap_hc")))}
    ${zapRow(t("zap_fs"),t("zap_fs_x"),seg)}
    ${zapRow(t("zap_calm"),t("zap_calm_x"),zapSw("calm",!!UI.p.calm,t("zap_calm")))}
    <button type="button" class="btn btn-g zap-done" onclick="zapClose()">${esc(t("zap_done"))}</button>`;
  let ov=document.getElementById("zap-sheet");
  if(ov&&keep){const box=ov.querySelector(".zap-box");const st=box.scrollTop;box.innerHTML=html;box.scrollTop=st;return;}
  if(ov)ov.remove();
  ov=document.createElement("div");ov.id="zap-sheet";ov.className="modal-overlay";ov.style.display="flex";ov.style.alignItems="flex-end";
  ov.onclick=e=>{if(e.target===ov)zapClose();};
  ov.innerHTML=`<div class="modal zx-sheet zap-box" role="dialog" aria-modal="true" aria-labelledby="zap-t">${html}</div>`;
  document.body.appendChild(ov);
  setTimeout(()=>{try{ov.querySelector(".zap-sw")?.focus();}catch(_){}},50);
}
function zapClose(){document.getElementById("zap-sheet")?.remove();}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("zap-sheet"))zapClose();});
function zapSummary(){
  zapNorm();
  if(UI.p.theme==="soft")return t("zap_sum_light");
  if(UI.p.theme==="soft-dark")return t("zap_sum_dark");
  return zapT("zap_sum_auto",{d:zapDay(),n:zapNightFrom()});
}
function zapProfileCard(){
  const b=document.getElementById("theme-btn-soft");if(!b)return;
  const wrap=b.parentElement;
  if(!wrap.dataset.za){
    wrap.dataset.za="1";wrap.style.display="none";
    document.getElementById("theme-btn-auto")?.remove();
    const d=document.createElement("div");d.id="zap-card";d.className="zap-card";wrap.after(d);
    const title=wrap.parentElement.firstElementChild;
    if(title&&!title.dataset.za){title.dataset.za="1";title.innerHTML=`<i class="ti ti-sun-moon" aria-hidden="true"></i> <span id="zap-ttl">${esc(t("zap_title"))}</span>`;}
  }
  const d=document.getElementById("zap-card");if(!d)return;
  d.innerHTML=`<p>${esc(zapSummary())}</p><button type="button" class="btn btn-g btn-sm" onclick="zapOpen()"><i class="ti ti-adjustments" aria-hidden="true"></i> ${esc(t("zap_open"))}</button>`;
}
if(typeof uiProfileCard==="function"){
  const _zaPC=uiProfileCard;
  uiProfileCard=function(){const r=_zaPC.apply(this,arguments);try{zapProfileCard();}catch(_){}return r;};
}
if(typeof uiOpen==="function"){
  const _zaUO=uiOpen;
  uiOpen=function(){
    const r=_zaUO.apply(this,arguments);
    try{
      const g=document.querySelector("#modal-ui .ui-gen");
      if(g){
        const kids=[...g.children];
        kids.slice(0,3).forEach(x=>x.remove());
        const d=document.createElement("div");
        d.innerHTML=`<div class="ui-cap">${esc(t("zap_title"))}</div><button type="button" class="btn btn-o btn-sm" onclick="zapOpen()"><i class="ti ti-sun-moon" aria-hidden="true"></i> ${esc(t("zap_open"))}</button>`;
        g.insertBefore(d,g.firstChild);
      }
    }catch(_){}
    return r;
  };
}
if(typeof uiResetAll==="function"){
  uiResetAll=function(){
    if(!confirm(t("ui_reset_confirm")))return;
    UI.p={};uiChanged();zapPaint();uiOpen();showToast(t("ui_reset_done"));
  };
}
function zapNewCard(){
  try{
    if(!State.token||!State.tenant)return;
    const k="zd_v112_seen_"+(State.tenant.linked_account_id||State.tenant.id);
    if(localStorage.getItem(k))return;
    const c=State.tenant.created_at?Date.parse(State.tenant.created_at):0;
    if(c&&Date.now()-c<6*3600*1000){localStorage.setItem(k,"1");return;}
    const pg=document.querySelector(".page.active");if(!pg||document.getElementById("zap-new"))return;
    const d=document.createElement("div");d.id="zap-new";d.className="card zap-new";d.setAttribute("role","status");
    d.innerHTML=`<div class="zap-new-t"><i class="ti ti-sparkles" aria-hidden="true"></i><div><b>${esc(t("zap_new_t"))}</b> ${esc(t("zap_new_x"))}</div></div><div class="zap-new-b"><button type="button" class="btn btn-o btn-sm" onclick="zapNewDone();zapOpen()">${esc(t("zap_open"))}</button><button type="button" class="btn btn-g btn-sm" onclick="zapNewDone()">${esc(t("zap_ok"))}</button></div>`;
    pg.insertBefore(d,pg.firstChild);
  }catch(_){}
}
function zapNewDone(){try{localStorage.setItem("zd_v112_seen_"+(State.tenant.linked_account_id||State.tenant.id),"1");}catch(_){}document.getElementById("zap-new")?.remove();}
if(typeof showAppLayout==="function"){
  const _zaSAL=showAppLayout;
  showAppLayout=async function(){const r=await _zaSAL.apply(this,arguments);try{zapPaint();setTimeout(zapNewCard,900);}catch(_){}return r;};
}
if(typeof applyLanguage==="function"){
  const _zaL=applyLanguage;
  applyLanguage=function(){const r=_zaL.apply(this,arguments);try{if(document.getElementById("zap-sheet"))zapOpen(true);const tt=document.getElementById("zap-ttl");if(tt)tt.textContent=t("zap_title");zapProfileCard();}catch(_){}return r;};
}
ZAP.timer=setInterval(zapPaint,60000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")zapPaint();});
zapPaint();
if(document.querySelector("#page-profile.active"))zapProfileCard();
const ZS_ORDER={pme:["invoices","quotes","clients"],restaurant:["kitchen","report","menu","tables"],bar:["tabs","report","menu","tables"],cold:["lots","exits","billing","rooms"],hotel:["bookings","arrivals","report","rooms"],beauty:["agenda","report","services","staff"],retail:["pos","items","credits","report"],pharmacy:["pos","rx","lots","items"],school:["attendance","fees","students","classes"],garage:["jobs","vehicles","report","mechanics"]};
const ZS_HIDE={pme:[],restaurant:["clients","invoices","crm","quotes","marketing","pos","stock","projects","booking","pricelist","reminders"],bar:["clients","invoices","crm","quotes","shop","pos","stock","projects","booking","pricelist","reminders"],cold:["crm","quotes","shop","pos","stock","projects","booking","pricelist"],hotel:["crm","pos","shop","projects","booking","pricelist"],beauty:["clients","invoices","quotes","crm","pos","shop","projects","booking","pricelist","reminders"],retail:["crm","pos","stock","projects","booking","pricelist"],pharmacy:["clients","crm","quotes","shop","pos","projects","booking","pricelist"],school:["clients","invoices","quotes","crm","marketing","stock","pos","shop","projects","booking","supply","margin","pricelist","reminders","zdgoals","creditbook"],garage:["crm","shop","pos","projects","booking","marketing","pricelist"]};
const ZS_CLIENT_LBL={cold:"zs_cl_cold",hotel:"zs_cl_hotel"};
if(typeof SECTOR_HIDE==="object")Object.entries(ZS_HIDE).forEach(([k,v])=>{if(k!=="pme")SECTOR_HIDE[k]=v.slice();});
function zsSec(){return (ZPV&&ZPV.s&&ZPV.s.sector)||(typeof sectorOf==="function"?sectorOf():"pme");}
function zsSeen(){try{return new Set(JSON.parse(localStorage.getItem("zd_zs_seen_"+zpTid())||"[]"));}catch(_){return new Set();}}
function zsMarkSeen(k){try{const s=zsSeen();s.add(k);localStorage.setItem("zd_zs_seen_"+zpTid(),JSON.stringify([...s]));}catch(_){}}
function zsItems(){
  const s=ZPV&&ZPV.s;if(!s||!Array.isArray(s.steps))return [];
  const sec=s.sector,ord=ZS_ORDER[sec]||[];
  return ord.map(k=>s.steps.find(x=>x.key===k)).filter(x=>x&&x.done&&!x.locked&&(typeof memberCanOpen!=="function"||memberCanOpen(x.page))).map(x=>({key:x.key,page:x.page,label:zpTx(`zp_${sec}_${x.key}_btn`)||zpStepLabel(sec,x.key),auto:!ZP_NOAUTO.has(x.key)}));
}
function zsGo(k){const it=zsItems().find(x=>x.key===k);if(!it)return;zsMarkSeen(k);document.getElementById("zs-more")?.remove();zpGo(it.page,it.auto);}
function zsBtn(it,seen){const isNew=!seen.has(it.key);return `<button type="button" class="btn btn-o zs-b" onclick="zsGo('${esc(it.key)}')"><span>${esc(it.label)}</span>${isNew?`<span class="zs-new">${esc(t("zx_new"))}</span>`:""}</button>`;}
function zsRender(){
  const dash=document.getElementById("page-dashboard");if(!dash)return;
  const quick=dash.querySelector('[data-i18n="dash_quick"]')?.closest(".card");
  if(quick)quick.classList.add("zs-off");
  const sumCard=dash.querySelector('[data-i18n="dash_summary"]')?.closest(".card");
  const sec=(typeof sectorOf==="function"?sectorOf():"pme");
  if(sumCard)sumCard.classList.toggle("zs-off",sec!=="pme");
  const grid=quick&&quick.parentElement;
  if(grid&&grid.classList.contains("grid2"))grid.classList.toggle("zs-off",[...grid.children].every(x=>x.classList.contains("zs-off")));
  let box=document.getElementById("zs-card");
  const items=zsItems();
  const member=typeof zpManager==="function"&&!zpManager();
  if(!items.length||member||!zpOn()){if(box)box.remove();return;}
  if(!box){box=document.createElement("section");box.id="zs-card";box.className="card zs-card";box.setAttribute("aria-labelledby","zs-t");const zp=document.getElementById("zp-start");if(zp&&zp.parentElement===dash)zp.after(box);else dash.prepend(box);}
  const seen=zsSeen(),top=items.slice(0,3),rest=items.slice(3);
  const fresh=items.filter(x=>!seen.has(x.key));
  const note=fresh.length===1&&items.length<=3?zapT("zs_new_x",{s:zpStepLabel(zsSec(),fresh[0].key)}):"";
  box.innerHTML=`<h2 class="zs-t" id="zs-t">${esc(t("zs_title"))}</h2><div class="zs-list">${top.map(x=>zsBtn(x,seen)).join("")}</div>${rest.length?`<button type="button" class="zs-more" onclick="zsMore()"><i class="ti ti-dots" aria-hidden="true"></i> ${esc(t("zp_more"))}</button>`:""}${note?`<p class="zs-note">${esc(note)}</p>`:""}`;
}
function zsMore(){
  const items=zsItems().slice(3);if(!items.length)return;
  const seen=zsSeen();
  let ov=document.getElementById("zs-more");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="zs-more";ov.className="modal-overlay";ov.style.display="flex";ov.style.alignItems="flex-end";
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  ov.innerHTML=`<div class="modal zx-sheet" role="dialog" aria-modal="true" aria-labelledby="zs-more-t"><span class="zx-grab" aria-hidden="true"></span><h2 id="zs-more-t">${esc(t("zp_more"))}</h2><div class="zs-list">${items.map(x=>zsBtn(x,seen)).join("")}</div><button type="button" class="zx-link" onclick="document.getElementById('zs-more').remove()">${esc(t("zap_done"))}</button></div>`;
  document.body.appendChild(ov);
}
function zsHideAll(){
  const sec=(typeof sectorOf==="function"?sectorOf():"pme");
  if(typeof fullMenuWanted==="function"&&fullMenuWanted())return;
  const hide=new Set(ZS_HIDE[sec]||[]);
  document.querySelectorAll('.sidebar .nav-i[data-p],.bnav-item[data-bp]').forEach(el=>{const p=el.dataset.p||el.dataset.bp;if(hide.has(p))el.classList.add("zd-hidden-sector");});
  document.querySelectorAll('#more-menu [onclick]').forEach(el=>{const m=(el.getAttribute("onclick")||"").match(/navigate\('([a-z0-9-]+)'\)/);if(m&&hide.has(m[1]))el.classList.add("zd-hidden-sector");});
}
function zsClientLabels(){
  const sec=(typeof sectorOf==="function"?sectorOf():"pme"),k=ZS_CLIENT_LBL[sec];
  document.querySelectorAll('.sidebar .nav-i[data-p="clients"] span[data-i18n],.sidebar .nav-i[data-p="clients"] span:not(.nav-badge)').forEach(sp=>{if(!sp.dataset.zsOrig)sp.dataset.zsOrig=sp.textContent;sp.textContent=k?t(k):(sp.dataset.i18n?t(sp.dataset.i18n):sp.dataset.zsOrig);});
}
if(typeof zpSet==="function"){
  const _zsSet=zpSet;
  zpSet=function(){const r=_zsSet.apply(this,arguments);try{if(document.querySelector("#page-dashboard.active"))zsRender();}catch(_){}return r;};
}
if(typeof applySectorUI==="function"){
  const _zsASU=applySectorUI;
  applySectorUI=function(){const r=_zsASU.apply(this,arguments);try{zsClientLabels();zsHideAll();}catch(_){}return r;};
}
if(typeof loadPage==="function"){
  const _zsLP=loadPage;
  loadPage=async function(p){const r=await _zsLP.apply(this,arguments);if(p==="dashboard"){try{zsRender();}catch(_){}}return r;};
}
if(typeof applyLanguage==="function"){
  const _zsL=applyLanguage;
  applyLanguage=function(){const r=_zsL.apply(this,arguments);try{zsClientLabels();if(document.querySelector("#page-dashboard.active"))zsRender();}catch(_){}return r;};
}
try{if(typeof applySectorUI==="function"&&State.tenant)applySectorUI();}catch(_){}
try{if(document.querySelector("#page-dashboard.active"))zsRender();}catch(_){}
if(typeof toggleMoreMenu==="function"){
  const _zsTM=toggleMoreMenu;
  toggleMoreMenu=function(){const r=_zsTM.apply(this,arguments);try{zsHideAll();setTimeout(zsHideAll,80);}catch(_){}return r;};
}
if(typeof uiPush==="function"){
  uiPush=async function(){
    if(!State.token)return;
    const sent=JSON.stringify(UI.p);
    try{const r=await api("PUT","/profile/ui-prefs",{prefs:UI.p});if(r&&r.prefs&&JSON.stringify(UI.p)===sent){UI.p=r.prefs;uiSaveLocal();}else if(JSON.stringify(UI.p)!==sent){clearTimeout(UI.saveT);UI.saveT=setTimeout(uiPush,300);}}catch(_){}
  };
}
