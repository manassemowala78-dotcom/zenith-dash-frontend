// ── SECTEURS D'ACTIVITÉ (9.0) ─────────────────────────────────────────────
// Menu, tableau de bord et pages métier selon le secteur du compte.
const SECTOR_META={pme:{icon:"briefcase",color:"#10b981"},restaurant:{icon:"tools-kitchen-2",color:"#f97316"},bar:{icon:"glass-full",color:"#a855f7"},
  cold:{icon:"snowflake",color:"#06b6d4"},hotel:{icon:"bed",color:"#3b82f6"},beauty:{icon:"scissors",color:"#ec4899"},
  retail:{icon:"building-store",color:"#eab308"},pharmacy:{icon:"pill",color:"#22c55e"},school:{icon:"building-community",color:"#0ea5e9"},embassy:{icon:"building-bank",color:"#6366f1"}};
const SECTOR_KEYS=Object.keys(SECTOR_META);
const SECTOR_MODULES={pme:[],restaurant:["resto"],bar:["bar","resto"],cold:["cold"],hotel:["hotel"],beauty:["beauty"],retail:["retail"],pharmacy:["retail","pharmacy"],school:["school"],embassy:["embassy"]};
// Pages de chaque module : [page, icône, clé de traduction, module d'équipe]
const MODULE_PAGES={
  resto:[["restofloor","armchair","nav_resto_floor","sales"],["restokitchen","chef-hat","nav_resto_kitchen","sales"],["restoresa","calendar-event","nav_resto_resa","sales"],
         ["restomenu","book-2","nav_resto_menu","sales"],["restostock","basket","nav_resto_stock","stock"],["restoreport","report-money","nav_resto_report","reports"]],
  bar:[["barsheet","table","nav_bar_sheet","sales"],["bartabs","notes","nav_bar_tabs","sales"],["bardeposits","bottle","nav_bar_deposits","sales"],["barinventory","clipboard-list","nav_bar_inventory","stock"],["barsettings","clock-hour-5","nav_bar_settings","sales"]],
  cold:[["coldrooms","temperature","nav_cold_rooms","sales"],["coldlots","box","nav_cold_lots","sales"],["coldmoves","truck","nav_cold_moves","sales"],
        ["coldhaccp","clipboard-check","nav_cold_haccp","sales"],["coldbilling","receipt","nav_cold_billing","accounting"]],
  hotel:[["hotelfront","door-enter","nav_hotel_front","sales"],["hotelplanning","calendar-stats","nav_hotel_planning","sales"],["hotelhk","bucket","nav_hotel_hk","sales"],
         ["hotelrooms","bed","nav_hotel_rooms","sales"],["hotelreport","chart-bar","nav_hotel_report","reports"]],
  beauty:[["beautyagenda","calendar-time","nav_beauty_agenda","sales"],["beautyclients","users","nav_beauty_clients","sales"],["beautyservices","scissors","nav_beauty_services","sales"],
          ["beautystaff","user-star","nav_beauty_staff","accounting"],["beautyreport","chart-bar","nav_beauty_report","reports"]],
  retail:[["retailpos","cash-register","nav_retail_pos","sales"],["retailcatalog","packages","nav_retail_catalog","sales"],["retailcredits","notebook","nav_retail_credits","sales"],
          ["retaillots","calendar-due","nav_retail_lots","stock"],["retailreport","chart-bar","nav_retail_report","reports"]],
  pharmacy:[["retailrx","prescription","nav_pharma_rx","sales"]],
  school:[["schoolstudents","users","nav_school_students","sales"],["schoolclasses","building","nav_school_classes","sales"],["schoolattendance","checklist","nav_school_attendance","sales"],
          ["schoolgrades","report","nav_school_grades","sales"],["schoolexams","calendar-event","nav_school_exams","sales"],["schoolfees","cash","nav_school_fees","accounting"],
          ["schoolteachers","user-star","nav_school_teachers","hr"],["schooldiscipline","alert-triangle","nav_school_discipline","sales"],["schoolservices","truck","nav_school_services","sales"],
          ["schoollibrary","book-2","nav_school_library","sales"],["schooldocs","file-certificate","nav_school_docs","sales"],["schoolsettings","settings","nav_school_settings","sales"]],
  embassy:[["embvisas","id","nav_emb_visa","sales"],["embappts","calendar-event","nav_emb_appts","sales"],["embpassports","book","nav_emb_passport","sales"],["embcivil","certificate","nav_emb_civil","sales"],
           ["emblegal","signature","nav_emb_legal","sales"],["embregistry","users","nav_emb_registry","sales"],["embvisitors","door-enter","nav_emb_visitors","sales"],["embcrisis","alert-triangle","nav_emb_crisis","sales"],
           ["embstaff","shield-lock","nav_emb_staff","hr"],["embstats","chart-bar","nav_emb_stats","reports"],["embposts","building","nav_emb_posts","sales"]],
};
const SECTOR_HIDE={restaurant:["crm","quotes","projects","booking","pos","pricelist"],bar:["crm","quotes","projects","booking","pos","pricelist"],
  cold:["pos","shop","booking","projects","pricelist"],hotel:["crm","pos","shop","booking","projects","pricelist"],
  beauty:["booking","crm","quotes","projects","pos","pricelist"],retail:["pos","booking","projects","crm","pricelist"],pharmacy:["pos","booking","projects","crm","pricelist","shop"],school:["pos","booking","projects","crm","pricelist","shop","quotes"],embassy:["pos","booking","projects","crm","pricelist","shop","quotes"]};
const SECTOR_BNAV={restaurant:["restofloor","restokitchen","restomenu"],bar:["barsheet","restofloor","bartabs"],cold:["coldrooms","coldlots","coldmoves"],
  hotel:["hotelfront","hotelplanning","hotelhk"],beauty:["beautyagenda","beautyclients","beautyservices"],retail:["retailpos","retailcatalog","retailcredits"],pharmacy:["retailpos","retailrx","retaillots"],school:["schoolattendance","schoolgrades","schoolstudents"],embassy:["embvisas","embappts","embregistry"]};
const SECTOR_PAGE_LOADERS={};
const SECTOR_PAGE_MODULE={};
Object.entries(MODULE_PAGES).forEach(([m,pages])=>pages.forEach(p=>{SECTOR_PAGE_MODULE[p[0]]=m;if(typeof PAGE_MODULES==="object")PAGE_MODULES[p[0]]=p[3];}));
function sectorOf(){return State.tenant?.sector||"pme";}
function sectorModules(){return State.tenant?.sector_modules||[];}
function hasModule(m){return sectorModules().includes(m);}
function sectorLabel(k){return t("sector_"+k);}
function sectorPageInfo(p){for(const [m,pages] of Object.entries(MODULE_PAGES)){const f=pages.find(x=>x[0]===p);if(f)return {module:m,page:f[0],icon:f[1],label:f[2]};}return null;}
function fullMenuWanted(){try{return localStorage.getItem("zd_full_menu")==="1";}catch(_){return false;}}

let _bnavOriginal=null;
function applySectorUI(){
  if(!State.tenant)return;
  const sec=sectorOf(),mods=sectorModules();
  const hide=new Set(fullMenuWanted()?[]:(SECTOR_HIDE[sec]||[]));
  document.querySelectorAll(".sidebar .nav-i[data-p]").forEach(el=>el.classList.toggle("zd-hidden-sector",hide.has(el.dataset.p)));
  document.querySelectorAll("#more-menu [onclick]").forEach(el=>{const m=(el.getAttribute("onclick")||"").match(/navigate\('([a-z0-9-]+)'\)/);if(m&&!el.closest("#more-sector"))el.classList.toggle("zd-hidden-sector",hide.has(m[1]));});
  // Groupe du menu latéral
  let g=document.getElementById("nav-sector");
  const sidebar=document.querySelector(".sidebar");
  if(!mods.length){g?.remove();}
  else if(sidebar){
    if(!g){g=document.createElement("div");g.className="nav-g";g.id="nav-sector";const first=sidebar.querySelector(".nav-g");first?first.after(g):sidebar.prepend(g);}
    const meta=SECTOR_META[sec]||SECTOR_META.pme;
    g.innerHTML=`<div class="nav-lbl" style="color:${meta.color}"><i class="ti ti-${meta.icon}"></i> ${esc(sectorLabel(sec))}</div>`+
      mods.flatMap(m=>MODULE_PAGES[m]||[]).map(([p,icon,lbl])=>`<div class="nav-i" data-p="${p}" onclick="navigate('${p}')"><i class="ti ti-${icon}"></i><span>${esc(t(lbl))}</span>${p==="restokitchen"?` <span class="nav-badge" id="kitchen-badge" style="display:none">0</span>`:""}</div>`).join("");
    g.querySelectorAll(".nav-i").forEach(el=>el.classList.toggle("zd-hidden-role",!memberCanOpen(el.dataset.p)));
  }
  // Barre du bas (téléphone)
  const inner=document.querySelector(".bottom-nav-inner");
  if(inner){
    if(_bnavOriginal===null)_bnavOriginal=inner.innerHTML;
    const pages=(SECTOR_BNAV[sec]||[]).filter(p=>mods.includes(SECTOR_PAGE_MODULE[p]));
    if(pages.length){
      const items=pages.map(p=>{const i=sectorPageInfo(p);return `<div class="bnav-item" data-bp="${p}" onclick="navigate('${p}')"><i class="ti ti-${i.icon}"></i><span>${esc(t(i.label+"_short")!==i.label+"_short"?t(i.label+"_short"):t(i.label))}</span></div>`;}).join("");
      inner.innerHTML=`<div class="bnav-item" data-bp="dashboard" onclick="navigate('dashboard')"><i class="ti ti-layout-dashboard"></i><span>${esc(t("bnav_home"))}</span></div>${items}<div class="bnav-item" data-bp="profile" onclick="navigate('profile')"><i class="ti ti-settings"></i><span>${esc(t("bnav_profile"))}</span></div><div class="bnav-item" onclick="toggleMoreMenu()"><i class="ti ti-dots"></i><span>${esc(t("bnav_more"))}</span></div>`;
      inner.querySelectorAll(".bnav-item[data-bp]").forEach(el=>el.classList.toggle("zd-hidden-role",!memberCanOpen(el.dataset.bp)));
      const act=document.querySelector(".page.active")?.id?.replace("page-","");if(act)inner.querySelector(`[data-bp="${act}"]`)?.classList.add("active");
    }else if(inner.innerHTML!==_bnavOriginal){inner.innerHTML=_bnavOriginal;}
  }
  // Menu « Plus » (téléphone)
  const more=document.getElementById("more-menu");
  if(more){
    let box=document.getElementById("more-sector");
    if(!mods.length){box?.remove();}
    else{
      if(!box){box=document.createElement("div");box.id="more-sector";box.style.cssText="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px";more.prepend(box);}
      const meta=SECTOR_META[sec]||SECTOR_META.pme;
      box.innerHTML=mods.flatMap(m=>MODULE_PAGES[m]||[]).filter(p=>memberCanOpen(p[0])).map(([p,icon,lbl])=>`<div onclick="navigate('${p}');closeMoreMenu()" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:10px;background:var(--card);cursor:pointer;border:1px solid ${meta.color}33"><i class="ti ti-${icon}" style="font-size:22px;color:${meta.color}"></i><span style="font-size:10px;font-family:var(--mono);text-align:center">${esc(t(lbl))}</span></div>`).join("");
    }
  }
  const kp=document.getElementById("kpi-pipeline")?.closest(".kpi");if(kp)kp.classList.toggle("zd-hidden-sector",hide.has("crm"));
  document.querySelectorAll(".quick-actions [onclick*=\"openOppModal\"],#page-dashboard [onclick*=\"openOppModal\"]").forEach(b=>b.classList.toggle("zd-hidden-sector",hide.has("crm")));
  document.body.dataset.sector=sec;
}

function ensureSectorPage(p){
  let el=document.getElementById("page-"+p);
  if(!el){el=document.createElement("div");el.id="page-"+p;el.className="page";document.querySelector("main.main")?.appendChild(el);}
  return el;
}
async function loadSectorPage(p){
  const info=sectorPageInfo(p);if(!info)return;
  const el=ensureSectorPage(p);
  document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x===el));
  document.querySelector(`[data-p="${p}"]`)?.classList.add("active");
  document.querySelector(`[data-bp="${p}"]`)?.classList.add("active");
  if(!hasModule(info.module)){el.innerHTML=sectorMissingCard(info.module);return;}
  if(State.tenant&&State.tenant.sector_plan_ok===false){el.innerHTML=sectorLockedCard();return;}
  const fn=SECTOR_PAGE_LOADERS[p];
  if(!fn){el.innerHTML=`<div class="card" style="text-align:center;color:var(--muted)">${esc(t("loading"))}</div>`;return;}
  try{await fn(el);}catch(e){el.innerHTML=`<div class="card" style="text-align:center;color:var(--red)">${esc(e.message)}</div>`;}
}
function sectorLockedCard(){return `<div class="card" style="text-align:center;padding:28px"><i class="ti ti-lock" style="font-size:30px;color:var(--muted)"></i><div style="margin:10px 0;color:var(--muted)">${esc(t("sector_locked"))}</div><button class="btn btn-g btn-sm" onclick="navigate('billing')">${esc(t("btn_see_plans"))}</button></div>`;}
function sectorMissingCard(m){return `<div class="card" style="text-align:center;padding:28px"><i class="ti ti-puzzle" style="font-size:30px;color:var(--muted)"></i><div style="margin:10px 0;color:var(--muted)">${esc(t("sector_module_missing").replace("{m}",t("module_"+m)))}</div><button class="btn btn-g btn-sm" onclick="openSectorModal('change')">${esc(t("sector_change_btn"))}</button></div>`;}
function sectorPageHead(title,sub,actions){return `<div class="sh"><div><div class="st">${title}</div>${sub?`<div class="ss">${sub}</div>`:""}</div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">${actions||""}</div></div>`;}

// ── Fenêtres génériques ──
function zdModal(id,html,width){
  let ov=document.getElementById(id);
  if(!ov){ov=document.createElement("div");ov.id=id;ov.className="modal-overlay";ov.addEventListener("click",e=>{if(e.target===ov&&!ov.dataset.sticky)zdCloseModal(id);});document.body.appendChild(ov);}
  ov.innerHTML=`<div class="modal" style="width:${width||520}px">${html}</div>`;
  ov.style.display="flex";
  return ov;
}
function zdCloseModal(id){const m=document.getElementById(id);if(m)m.style.display="none";}
function zdVal(id){const e=document.getElementById(id);return e?e.value.trim():"";}
function zdNum(id){const v=parseFloat(String(zdVal(id)).replace(",","."));return isNaN(v)?null:v;}
function zdMoney(v){return fmtUSD(v||0);}
function zdQty(v){return new Intl.NumberFormat("fr-FR",{maximumFractionDigits:3}).format(v||0);}
function zdTime(iso){if(!iso)return"—";return parseServerDate(iso).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});}
function zdEmpty(msg,icon){return `<div style="text-align:center;padding:26px;color:var(--muted)"><i class="ti ti-${icon||"mood-empty"}" style="font-size:28px"></i><div style="margin-top:8px;font-size:13px">${esc(msg)}</div></div>`;}
function zdMethodOptions(sel,extra){const m=["cash","mobile_money","card","bank","cheque","other"].concat(extra||[]);return m.map(k=>`<option value="${k}"${k===sel?" selected":""}>${esc(t("pay_method_"+k))}</option>`).join("");}
function zdToday(){return isoDate(new Date());}
function zdLocalHM(){const d=new Date();return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;}
function zdBeep(){try{const a=new (window.AudioContext||window.webkitAudioContext)();const o=a.createOscillator(),g=a.createGain();o.frequency.value=880;o.connect(g);g.connect(a.destination);g.gain.value=.08;o.start();setTimeout(()=>{o.stop();a.close();},220);}catch(_){}}
function zdTicketHtml(title,lines,footer){return `<div style="font-family:monospace;font-size:12px;color:#000">${title}${lines}${footer||""}</div>`;}
function zdShowTicket(html,title){
  const page=document.getElementById("doc-page");if(!page)return;
  page.innerHTML=html;page.classList.add("doc-ticket");
  window._currentDoc={number:title||"ticket"};
  document.getElementById("doc-wa-btn").style.display="none";
  document.getElementById("doc-view").style.display="block";document.body.classList.add("doc-open");
}
async function zdShowReceipt(invoiceId){try{renderDocument(await api("GET",`/pos/sales/${invoiceId}/receipt`));}catch(e){showToast(e.message,"error");}}
let _sectorTimers={};
function sectorTimer(key,fn,ms){clearInterval(_sectorTimers[key]);_sectorTimers[key]=setInterval(()=>{const pg=document.getElementById("page-"+key);if(!pg||!pg.classList.contains("active")){clearInterval(_sectorTimers[key]);return;}fn();},ms);}

// ── Tableau de bord ──
async function loadSectorToday(){
  const box=document.getElementById("sector-today");if(!box)return;
  if(!sectorModules().length||State.tenant?.sector_plan_ok===false){box.style.display="none";return;}
  try{
    const r=await api("GET","/sector/today");
    if(!r.tiles.length){box.style.display="none";return;}
    const meta=SECTOR_META[r.sector]||SECTOR_META.pme;
    box.style.display="block";
    box.innerHTML=`<div style="font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:8px"><i class="ti ti-${meta.icon}" style="color:${meta.color}"></i> ${esc(t("sector_today_title"))} · ${esc(sectorLabel(r.sector))}</div>
      <div class="kgrid">${r.tiles.map(x=>`<div class="kpi" style="cursor:pointer" onclick="navigate('${esc(x.page.replace("-",""))}')"><div class="kl"><i class="ti ti-${esc(x.icon)}"></i> ${esc(t("tile_"+x.key)!=="tile_"+x.key?t("tile_"+x.key):x.label)}</div><div class="kv">${x.format==="usd"?zdMoney(x.value):esc(String(x.value))}</div></div>`).join("")}</div>`;
  }catch(_){box.style.display="none";}
}

// ── Choix du secteur à l'inscription ──
let _regSector="pme";
function renderRegisterSectors(){
  const box=document.getElementById("reg-sector-grid");if(!box)return;
  box.innerHTML=SECTOR_KEYS.map(k=>{const m=SECTOR_META[k];return `<button type="button" class="sector-chip${k===_regSector?" active":""}" style="--sc:${m.color}" onclick="selectRegSector('${k}')" aria-pressed="${k===_regSector}"><i class="ti ti-${m.icon}"></i><span>${esc(t("sector_short_"+k))}</span></button>`;}).join("");
  const hint=document.getElementById("reg-sector-hint");if(hint)hint.textContent=t("sector_tagline_"+_regSector);
}
function selectRegSector(k){_regSector=k;renderRegisterSectors();}
document.addEventListener("DOMContentLoaded",()=>setTimeout(renderRegisterSectors,50));

// ── Présentation des secteurs (anciens comptes) et changement de secteur ──
let _secChoice={sector:"pme",extra:[],mode:"intro"};
function checkSectorPrompt(){
  const u=State.tenant;
  if(!u||!u.sector_prompt||u.terms_required||isTeamMember())return false;
  openSectorModal("intro");return true;
}
function openSectorModal(mode){
  const u=State.tenant||{};
  if(mode==="change"&&isTeamMember()&&u.member_role!=="admin"){showToast(t("sector_owner_only"),"error");return;}
  _secChoice={sector:u.sector_prompt?"pme":(u.sector||"pme"),extra:[...(u.sector_extra||[])],mode};
  renderSectorModal();
}
function renderSectorModal(){
  const c=_secChoice;
  const intro=c.mode==="intro";
  const cards=SECTOR_KEYS.map(k=>{const m=SECTOR_META[k];const feats=(t("sector_features_"+k)||"").split("|").filter(Boolean);
    return `<button type="button" class="sector-card${c.sector===k?" active":""}" style="--sc:${m.color}" onclick="_secChoice.sector='${k}';_secChoice.extra=_secChoice.extra.filter(x=>x!=='${k}');renderSectorModal()">
      <div class="sc-head"><i class="ti ti-${m.icon}"></i><b>${esc(sectorLabel(k))}</b>${k==="pme"?`<span class="badge bg" style="margin-left:auto">${esc(t("sector_current_features"))}</span>`:""}</div>
      <div class="sc-tag">${esc(t("sector_tagline_"+k))}</div>
      <ul>${feats.slice(0,4).map(f=>`<li>${esc(f)}</li>`).join("")}</ul></button>`;}).join("");
  const own=SECTOR_MODULES[c.sector]||[];
  const extras=SECTOR_KEYS.filter(k=>k!=="pme"&&k!==c.sector&&!(SECTOR_MODULES[k]||[]).every(m=>own.includes(m)));
  const ov=zdModal("modal-sector-intro",`
    <div class="modal-title"><i class="ti ti-building-community" style="color:var(--green)"></i> ${esc(t(intro?"sector_intro_title":"sector_change_title"))}</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:12px">${esc(t(intro?"sector_intro_text":"sector_change_text"))}</div>
    <div class="sector-cards">${cards}</div>
    ${extras.length?`<div style="margin-top:14px"><div style="font-weight:700;font-size:13px;margin-bottom:6px">${esc(t("sector_extra_title"))}</div><div style="display:flex;flex-wrap:wrap;gap:6px">${extras.map(k=>`<label class="sector-extra"><input type="checkbox" ${c.extra.includes(k)?"checked":""} onchange="toggleSectorExtra('${k}',this.checked)"> <i class="ti ti-${SECTOR_META[k].icon}"></i> ${esc(t("sector_extra_"+k))}</label>`).join("")}</div></div>`:""}
    <div style="font-size:11px;color:var(--muted);margin-top:12px"><i class="ti ti-info-circle"></i> ${esc(t("sector_keep_data"))}</div>
    <div class="err-box" id="sector-err"></div>
    <div class="modal-footer">${intro?`<button class="btn btn-o btn-sm" onclick="saveSectorChoice(true)">${esc(t("sector_stay_pme"))}</button>`:`<button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-sector-intro')">${esc(t("btn_cancel"))}</button>`}
      <button class="btn btn-g btn-sm" id="sector-save-btn" onclick="saveSectorChoice(false)"><i class="ti ti-check"></i> ${esc(c.sector==="pme"?t("sector_confirm_pme"):t("sector_confirm").replace("{s}",sectorLabel(c.sector)))}</button></div>`,780);
  if(intro)ov.dataset.sticky="1";else delete ov.dataset.sticky;
}
function toggleSectorExtra(k,on){_secChoice.extra=_secChoice.extra.filter(x=>x!==k);if(on)_secChoice.extra.push(k);}
async function saveSectorChoice(stayPme){
  const c=_secChoice;const body=stayPme?{sector:"pme",extra:[]}:{sector:c.sector,extra:c.extra};
  const btn=document.getElementById("sector-save-btn");if(btn)btn.disabled=true;
  try{
    const u=await api("PUT","/profile/sector",body);
    State.tenant={...State.tenant,...u};localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));
    zdCloseModal("modal-sector-intro");
    applyMemberUI();
    showToast(body.sector==="pme"?t("sector_saved_pme"):t("sector_saved").replace("{s}",sectorLabel(body.sector)));
    if(c.mode==="intro"&&body.sector!=="pme")openSectorWelcome(true);
    else if(c.mode==="intro")setTimeout(()=>{try{startTour(false);}catch(_){}},600);
    const act=document.querySelector(".page.active")?.id?.replace("page-","")||"dashboard";
    navigate(act==="profile"?"profile":"dashboard");
  }catch(e){showErr("sector-err",e.message);}
  finally{if(btn)btn.disabled=false;}
}

// ── Accueil après inscription : description et démarrage rapide ──
let _welcomeStep=1;
function openSectorWelcome(skipDescription){
  _welcomeStep=skipDescription?2:1;renderSectorWelcome();
}
function renderSectorWelcome(){
  const u=State.tenant||{};const sec=u.sector||"pme";const m=SECTOR_META[sec]||SECTOR_META.pme;
  if(_welcomeStep===2){zdCloseModal("modal-sector-welcome");setTimeout(()=>{try{startTour(false);}catch(_){}},500);return;}
  let html;
  if(_welcomeStep===1){
    html=`<div style="text-align:center;margin-bottom:10px"><div style="width:54px;height:54px;border-radius:14px;margin:0 auto;display:flex;align-items:center;justify-content:center;background:${m.color}22;color:${m.color};font-size:28px"><i class="ti ti-${m.icon}"></i></div></div>
      <div class="modal-title" style="justify-content:center">${esc(t("welcome_desc_title"))}</div>
      <div style="font-size:13px;color:var(--muted);text-align:center;margin-bottom:12px">${esc(t("welcome_desc_text"))}</div>
      <textarea class="inp" id="welcome-desc" maxlength="512" rows="5" placeholder="${esc(t("welcome_desc_ph_"+sec)!=="welcome_desc_ph_"+sec?t("welcome_desc_ph_"+sec):t("welcome_desc_ph"))}" oninput="document.getElementById('welcome-count').textContent=this.value.length+'/512'">${esc(u.business_description||"")}</textarea>
      <div style="text-align:right;font-size:11px;color:var(--muted);margin-top:4px" id="welcome-count">${(u.business_description||"").length}/512</div>
      <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="_welcomeStep=2;renderSectorWelcome()">${esc(t("btn_skip"))}</button><button class="btn btn-g btn-sm" onclick="saveWelcomeDescription()">${esc(t("btn_next"))} <i class="ti ti-arrow-right"></i></button></div>`;
  }
  const ov=zdModal("modal-sector-welcome",html,540);ov.dataset.sticky="1";
}
async function saveWelcomeDescription(){
  const v=zdVal("welcome-desc");
  if(v){try{await api("PATCH","/profile/",{business_description:v});State.tenant.business_description=v;localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));}catch(e){showToast(e.message,"error");return;}}
  _welcomeStep=2;renderSectorWelcome();
}
function finishSectorWelcome(){zdCloseModal("modal-sector-welcome");setTimeout(()=>{try{startTour(false);}catch(_){}},600);}

// ── Carte « Secteur d'activité » du profil ──
function renderSectorProfileCard(){
  const box=document.getElementById("sector-card");if(!box||!State.tenant)return;
  const u=State.tenant,sec=u.sector||"pme",m=SECTOR_META[sec]||SECTOR_META.pme;
  const canEdit=!isTeamMember()||u.member_role==="admin";
  box.innerHTML=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:${m.color}22;color:${m.color};font-size:22px"><i class="ti ti-${m.icon}"></i></div>
      <div style="flex:1;min-width:180px"><div style="font-weight:700">${esc(t("sector_profile_title"))} : ${esc(sectorLabel(sec))}</div>
        <div style="font-size:12px;color:var(--muted)">${(u.sector_modules||[]).length?esc(t("sector_modules_active"))+" : "+u.sector_modules.map(x=>esc(t("module_"+x))).join(", "):esc(t("sector_pme_desc"))}</div></div>
      ${canEdit?`<button class="btn btn-o btn-sm" onclick="openSectorModal('change')"><i class="ti ti-switch-horizontal"></i> ${esc(t("sector_change_btn"))}</button>`:""}</div>
    ${u.sector!=="pme"&&(u.sector_modules||[]).length?`<label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;color:var(--muted)"><input type="checkbox" ${fullMenuWanted()?"checked":""} onchange="try{localStorage.setItem('zd_full_menu',this.checked?'1':'0')}catch(_){};applySectorUI()"> ${esc(t("sector_full_menu"))}</label>`:""}
    ${u.sector_plan_ok===false&&(u.sector_modules||[]).length?`<div class="alert-bar" style="margin-top:10px"><i class="ti ti-lock"></i> ${esc(t("sector_locked"))}</div>`:""}`;
}

// ── Pages publiques des modules (menu QR, salon, hôtel) ──
async function checkSectorPublicViews(){
  const q=new URLSearchParams(window.location.search);
  if(q.get("menu")&&typeof checkRestoMenuView==="function")return await checkRestoMenuView();
  if(q.get("salon")&&typeof checkSalonView==="function")return await checkSalonView();
  if(q.get("hotel")&&typeof checkHotelView==="function")return await checkHotelView();
  if(q.get("store")&&typeof checkStoreView==="function")return await checkStoreView();
  if(q.get("order")&&typeof checkOrderView==="function")return await checkOrderView();
  return false;
}
