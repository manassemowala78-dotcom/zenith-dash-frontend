// ── 10.4.0 · Secteur Garage / Atelier de réparation (remplace l'Ambassade) ──
delete SECTOR_META.embassy;SECTOR_META.garage={icon:"engine",color:"#ef4444"};
(function(){const i=SECTOR_KEYS.indexOf("embassy");if(i>=0)SECTOR_KEYS.splice(i,1);if(!SECTOR_KEYS.includes("garage"))SECTOR_KEYS.push("garage");})();
delete SECTOR_MODULES.embassy;SECTOR_MODULES.garage=["garage"];
delete MODULE_PAGES.embassy;
MODULE_PAGES.garage=[["garagejobs","clipboard-list","nav_ga_jobs","sales"],["garagevehicles","engine","nav_ga_vehicles","sales"],["garagereminders","bell-ringing","nav_ga_reminders","sales"],
  ["garagemechanics","user-star","nav_ga_mechanics","accounting"],["garagereport","chart-bar","nav_ga_report","reports"]];
delete SECTOR_HIDE.embassy;SECTOR_HIDE.garage=["projects","pricelist","shop"];
delete SECTOR_BNAV.embassy;SECTOR_BNAV.garage=["garagejobs","garagevehicles","garagereminders"];
MODULE_PAGES.garage.forEach(p=>{SECTOR_PAGE_MODULE[p[0]]="garage";if(typeof PAGE_MODULES==="object")PAGE_MODULES[p[0]]=p[3];});
if(typeof SETUP_GROUP_OF==="object")delete SETUP_GROUP_OF.embassy;

const GA_ST=["received","diagnosis","waiting_parts","in_progress","ready"];
const GA_ST_COL={received:"var(--blue)",diagnosis:"var(--cyan)",waiting_parts:"var(--amber)",in_progress:"var(--purple)",ready:"var(--green)",delivered:"var(--muted)",cancelled:"var(--red)"};
const GA_KINDS=["car","moto","truck","device","other"];
const GA_KIND_ICON={car:"engine",moto:"motorbike",truck:"truck",device:"device-mobile",other:"engine"};
const _ga={jobs:null,filter:"open",vehicles:null,mech:null,products:null,job:null,lines:[],vq:"",month:null,settings:null};

async function gaMech(force){if(!_ga.mech||force)_ga.mech=await api("GET","/garage/mechanics");return _ga.mech;}
async function gaProducts(){if(!_ga.products){try{_ga.products=await api("GET","/stock/products");}catch(_){_ga.products=[];}}return _ga.products;}
async function gaSettings(force){if(!_ga.settings||force)_ga.settings=await api("GET","/garage/settings");return _ga.settings;}
function gaBadge(s){return `<span class="badge" style="color:${GA_ST_COL[s]};border:1px solid ${GA_ST_COL[s]}">${esc(t("ga_st_"+s))}</span>`;}
function gaLate(j){return j.promised_at&&j.promised_at<zdToday()&&!["delivered","cancelled"].includes(j.status);}
function gaTrackUrl(j){return `${location.origin}/atelier.html?t=${encodeURIComponent(j.token)}`;}
function gaWa(phone,msg){const d=String(phone||"").replace(/[^0-9]/g,"");return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;}

SECTOR_PAGE_LOADERS.garagejobs=async el=>{
  const q=_ga.filter==="all"?"":`?status=${_ga.filter}`;
  _ga.jobs=await api("GET","/garage/jobs"+q);
  const mob=window.innerWidth<=768,jobs=_ga.jobs;
  const card=j=>`<div class="card ga-job" style="--c:${GA_ST_COL[j.status]}" onclick="gaJobOpen('${j.id}')">
      <div style="display:flex;justify-content:space-between;gap:6px;align-items:center"><b style="font-family:var(--mono);font-size:12px">${esc(j.number)}</b>${gaLate(j)?`<span class="badge br">${esc(t("ga_late"))}</span>`:""}</div>
      <div style="font-weight:700;margin-top:4px">${esc(j.vehicle||"—")}</div>
      <div style="font-size:12px;color:var(--muted)">${esc(j.client_name||t("ga_no_client"))}${j.mechanic?` · ${esc(j.mechanic)}`:""}</div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px"><span>${j.promised_at?`<i class="ti ti-calendar-due"></i> ${esc(fmtDate(j.promised_at))}`:""}</span><b>${zdMoney(j.total)}</b></div></div>`;
  const chips=["open","all","delivered","cancelled"].map(f=>`<button class="toggle-btn${_ga.filter===f?" active":""}" onclick="_ga.filter='${f}';navigate('garagejobs')">${esc(t("ga_f_"+f))}</button>`).join("");
  let body;
  if(!jobs.length)body=`<div class="card">${zdEmpty(t("ga_no_jobs"),"clipboard-list")}<div style="text-align:center"><button class="btn btn-g btn-sm" onclick="gaNewJob()"><i class="ti ti-plus"></i> ${esc(t("ga_new_job"))}</button></div></div>`;
  else if(_ga.filter==="open"&&!mob)body=`<div class="ga-board">${GA_ST.map(s=>{const l=jobs.filter(j=>j.status===s);return `<div class="ga-col"><div class="ga-colh" style="color:${GA_ST_COL[s]}">${esc(t("ga_st_"+s))} <span>${l.length}</span></div>${l.map(card).join("")||`<div class="ga-emptycol">—</div>`}</div>`;}).join("")}</div>`;
  else body=`<div class="ga-list">${jobs.map(j=>card(j).replace('<div style="font-weight:700;margin-top:4px">',`<div style="margin-top:4px">${gaBadge(j.status)}</div><div style="font-weight:700;margin-top:4px">`)).join("")}</div>`;
  el.innerHTML=sectorPageHead(esc(t("nav_ga_jobs")),esc(t("ga_jobs_sub")),
    `${rsIsManager()?`<button class="btn btn-o btn-sm" onclick="gaSettingsModal()"><i class="ti ti-settings"></i> ${esc(t("ga_settings"))}</button>`:""}<button class="btn btn-g btn-sm" onclick="gaNewJob()"><i class="ti ti-plus"></i> ${esc(t("ga_new_job"))}</button>`)+
    `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${chips}</div>`+body;
};

async function gaNewJob(vehicleId){
  const [vs,ms]=await Promise.all([api("GET","/garage/vehicles"),gaMech()]);_ga.vehicles=vs;
  zdModal("modal-ga-new",`<div class="modal-title"><i class="ti ti-clipboard-list" style="color:var(--green)"></i> ${esc(t("ga_new_job"))}</div>
    <div class="fgrp"><label class="fl" for="ga-nj-v">${esc(t("ga_vehicle"))}</label><select class="inp" id="ga-nj-v" onchange="document.getElementById('ga-nj-newv').style.display=this.value==='__new'?'block':'none'">
      <option value="">${esc(t("ga_pick_vehicle"))}</option>${vs.map(v=>`<option value="${v.id}"${v.id===vehicleId?" selected":""}>${esc(v.label)}${v.client_name?" — "+esc(v.client_name):""}</option>`).join("")}<option value="__new">+ ${esc(t("ga_new_vehicle"))}</option></select></div>
    <div id="ga-nj-newv" style="display:none">${gaVehicleFields("ga-nj",{})}</div>
    <div class="fgrp"><label class="fl" for="ga-nj-c">${esc(t("ga_complaint"))}</label><textarea class="inp" id="ga-nj-c" rows="2" placeholder="${esc(t("ga_complaint_ph"))}"></textarea></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="fgrp"><label class="fl" for="ga-nj-km">${esc(t("ga_mileage_in"))}</label><input class="inp" id="ga-nj-km" type="number" min="0" inputmode="numeric"></div>
      <div class="fgrp"><label class="fl" for="ga-nj-p">${esc(t("ga_promised"))}</label><input class="inp" id="ga-nj-p" type="date"></div></div>
    <div class="fgrp"><label class="fl" for="ga-nj-m">${esc(t("ga_mechanic"))}</label><select class="inp" id="ga-nj-m"><option value="">—</option>${ms.filter(m=>m.active).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("")}</select></div>
    <div class="err-box" id="ga-nj-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ga-new')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" id="ga-nj-go" onclick="gaNewJobGo()"><i class="ti ti-check"></i> ${esc(t("ga_open_job"))}</button></div>`,520);
}
function gaVehicleFields(px,v){
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div class="fgrp"><label class="fl" for="${px}-kind">${esc(t("ga_kind"))}</label><select class="inp" id="${px}-kind">${GA_KINDS.map(k=>`<option value="${k}"${(v.kind||"car")===k?" selected":""}>${esc(t("ga_kind_"+k))}</option>`).join("")}</select></div>
    <div class="fgrp"><label class="fl" for="${px}-plate">${esc(t("ga_plate"))}</label><input class="inp" id="${px}-plate" value="${esc(v.plate||"")}" autocapitalize="characters"></div>
    <div class="fgrp"><label class="fl" for="${px}-brand">${esc(t("ga_brand"))}</label><input class="inp" id="${px}-brand" value="${esc(v.brand||"")}"></div>
    <div class="fgrp"><label class="fl" for="${px}-model">${esc(t("ga_model"))}</label><input class="inp" id="${px}-model" value="${esc(v.model||"")}"></div>
    <div class="fgrp"><label class="fl" for="${px}-year">${esc(t("ga_year"))}</label><input class="inp" id="${px}-year" type="number" min="1900" max="2100" value="${v.year||""}"></div>
    <div class="fgrp"><label class="fl" for="${px}-mil">${esc(t("ga_mileage"))}</label><input class="inp" id="${px}-mil" type="number" min="0" value="${v.mileage??""}"></div>
    <div class="fgrp"><label class="fl" for="${px}-cn">${esc(t("ga_client"))}</label><input class="inp" id="${px}-cn" value="${esc(v.client_name||"")}"></div>
    <div class="fgrp"><label class="fl" for="${px}-cp">${esc(t("ga_phone"))}</label><input class="inp" id="${px}-cp" type="tel" value=""></div></div>`;
}
function gaVehicleData(px){
  const n=id=>{const v=zdVal(id);return v===""?null:Number(v);};
  const d={kind:zdVal(px+"-kind"),plate:zdVal(px+"-plate")||null,brand:zdVal(px+"-brand")||null,model:zdVal(px+"-model")||null,year:n(px+"-year"),mileage:n(px+"-mil")};
  const cn=zdVal(px+"-cn");if(cn){d.client_name=cn;d.client_phone=zdVal(px+"-cp")||null;}
  return d;
}
async function gaNewJobGo(){
  const b=document.getElementById("ga-nj-go");b.disabled=true;
  try{
    let vid=zdVal("ga-nj-v");
    if(!vid)throw new Error(t("ga_pick_vehicle"));
    if(vid==="__new"){const v=await api("POST","/garage/vehicles",gaVehicleData("ga-nj"));vid=v.id;}
    const km=zdVal("ga-nj-km");
    const j=await api("POST","/garage/jobs",{vehicle_id:vid,complaint:zdVal("ga-nj-c")||null,mileage_in:km?Number(km):null,promised_at:zdVal("ga-nj-p")||null,mechanic_id:zdVal("ga-nj-m")||null,lines:[]});
    zdCloseModal("modal-ga-new");showToast(t("ga_job_opened").replace("{n}",j.number));
    if(document.getElementById("page-garagejobs")?.classList.contains("active"))navigate("garagejobs");
    gaJobOpen(j.id);
  }catch(e){showErr("ga-nj-err",e.message);}finally{b.disabled=false;}
}

async function gaJobOpen(id){
  const [j,ms,ps]=await Promise.all([api("GET",`/garage/jobs/${id}`),gaMech(),gaProducts()]);
  _ga.job=j;_ga.lines=(j.lines||[]).map(l=>({...l}));
  const closed=["delivered","cancelled"].includes(j.status);
  const idx=GA_ST.indexOf(j.status),next=idx>=0&&idx<GA_ST.length-1?GA_ST[idx+1]:null;
  zdModal("modal-ga-job",`<div class="modal-title" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><span><i class="ti ti-clipboard-list" style="color:var(--green)"></i> ${esc(j.number)}</span>${gaBadge(j.status)}</div>
    <div style="font-size:13px;margin-bottom:10px"><b>${esc(j.vehicle)}</b> · ${esc(j.client_name||t("ga_no_client"))}${j.mileage_in?` · ${zdQty(j.mileage_in)} km`:""}</div>
    ${closed?"":`<div class="ga-steps">${GA_ST.map((s,i)=>`<button type="button" class="ga-step${i<=idx?" on":""}" onclick="gaSetStatus('${s}')" ${s===j.status?"aria-current='step'":""}>${esc(t("ga_st_"+s))}</button>`).join("")}</div>`}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fgrp"><label class="fl" for="ga-j-m">${esc(t("ga_mechanic"))}</label><select class="inp" id="ga-j-m" ${closed?"disabled":""}><option value="">—</option>${ms.map(m=>`<option value="${m.id}"${m.id===j.mechanic_id?" selected":""}>${esc(m.name)}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl" for="ga-j-p">${esc(t("ga_promised"))}</label><input class="inp" id="ga-j-p" type="date" value="${esc(j.promised_at||"")}" ${closed?"disabled":""}></div></div>
    <div class="fgrp"><label class="fl" for="ga-j-c">${esc(t("ga_complaint"))}</label><textarea class="inp" id="ga-j-c" rows="2" ${closed?"disabled":""}>${esc(j.complaint||"")}</textarea></div>
    <div class="fgrp"><label class="fl" for="ga-j-d">${esc(t("ga_diagnosis"))}</label><textarea class="inp" id="ga-j-d" rows="2" ${closed?"disabled":""}>${esc(j.diagnosis||"")}</textarea></div>
    <div class="fl" style="margin:6px 0">${esc(t("ga_lines"))}</div><div id="ga-lines"></div>
    ${closed?"":`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px"><button class="btn btn-o btn-sm" onclick="gaAddLine('part')"><i class="ti ti-plus"></i> ${esc(t("ga_add_part"))}</button><button class="btn btn-o btn-sm" onclick="gaAddLine('labor')"><i class="ti ti-plus"></i> ${esc(t("ga_add_labor"))}</button></div>`}
    <div id="ga-tot"></div>
    <div class="ga-track"><i class="ti ti-link"></i> <span>${esc(t("ga_track_x"))}</span> <button class="btn btn-o btn-sm" onclick="gaCopyTrack()"><i class="ti ti-copy"></i> ${esc(t("ga_copy_link"))}</button>
      <a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="${gaWa("",t("ga_wa_track").replace("{n}",j.number).replace("{v}",j.vehicle).replace("{u}",gaTrackUrl(j)))}"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a></div>
    ${(j.history||[]).length?`<details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px">${esc(t("ga_history"))}</summary>${j.history.slice().reverse().map(h=>`<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--b)">${fmtDate(h.at)} ${zdTime(h.at)} · ${esc(t("ga_st_"+h.status))}${h.by?` · ${esc(h.by)}`:""}${h.note?` — ${esc(h.note)}`:""}</div>`).join("")}</details>`:""}
    <div class="err-box" id="ga-j-err"></div>
    <div class="modal-footer" style="flex-wrap:wrap;gap:6px">
      ${closed?(j.invoice_id?`<button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ga-job');navigate('invoices')"><i class="ti ti-file-invoice"></i> ${esc(t("ga_see_invoice"))}</button>`:""):`
      ${j.status!=="cancelled"?`<button class="btn btn-o btn-sm" onclick="gaCancelJob()">${esc(t("ga_cancel_job"))}</button>`:""}
      <button class="btn btn-o btn-sm" onclick="gaQuote()"><i class="ti ti-file-invoice"></i> ${esc(t(j.quote_id?"ga_quote_again":"ga_quote"))}</button>
      <button class="btn btn-o btn-sm" onclick="gaDeposit()"><i class="ti ti-cash"></i> ${esc(t("ga_deposit"))}${j.deposit?` (${zdMoney(j.deposit)})`:""}</button>
      <button class="btn btn-o btn-sm" onclick="gaSaveJob()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button>
      ${next?`<button class="btn btn-o btn-sm" onclick="gaSetStatus('${next}')">${esc(t("ga_next"))} : ${esc(t("ga_st_"+next))}</button>`:""}
      <button class="btn btn-g btn-sm" onclick="gaCheckout()"><i class="ti ti-cash"></i> ${esc(t("ga_checkout"))}</button>`}</div>`,640);
  gaRenderLines(closed,ps);
}
function gaRenderLines(closed,ps){
  ps=ps||_ga.products||[];
  const box=document.getElementById("ga-lines");if(!box)return;
  box.innerHTML=_ga.lines.length?_ga.lines.map((l,i)=>closed?`<div class="ga-line ro"><span class="badge ${l.kind==="labor"?"bb":"ba"}">${esc(t("ga_k_"+l.kind))}</span><span style="flex:1">${esc(l.label)}</span><span>${zdQty(l.qty)} × ${zdMoney(l.unit_price)}</span><b>${zdMoney(l.qty*l.unit_price)}</b></div>`:
    `<div class="ga-line"><span class="badge ${l.kind==="labor"?"bb":"ba"}">${esc(t("ga_k_"+l.kind))}</span>
      ${l.kind==="part"?`<select class="inp" aria-label="${esc(t("ga_part_stock"))}" onchange="gaPickProduct(${i},this.value)"><option value="">${esc(t("ga_free_part"))}</option>${ps.map(p=>`<option value="${p.id}"${p.id===l.product_id?" selected":""}>${esc(p.name)} (${zdQty(p.stock_qty)})</option>`).join("")}</select>`:""}
      <input class="inp" aria-label="${esc(t("ga_label"))}" placeholder="${esc(t("ga_label"))}" value="${esc(l.label)}" oninput="_ga.lines[${i}].label=this.value">
      <input class="inp ga-n" aria-label="${esc(t("ga_qty"))}" type="number" min="0.01" step="0.01" value="${l.qty}" oninput="_ga.lines[${i}].qty=parseFloat(this.value)||0;gaTot()">
      <input class="inp ga-n" aria-label="${esc(t("ga_price"))}" type="number" min="0" step="0.01" value="${l.unit_price}" oninput="_ga.lines[${i}].unit_price=parseFloat(this.value)||0;gaTot()">
      <button class="btn btn-o btn-sm" aria-label="${esc(t("btn_delete"))}" onclick="_ga.lines.splice(${i},1);gaRenderLines()"><i class="ti ti-x"></i></button></div>`).join(""):`<div style="font-size:12px;color:var(--muted);padding:4px 0">${esc(t("ga_no_lines"))}</div>`;
  gaTot();
}
function gaTot(){
  const b=document.getElementById("ga-tot");if(!b)return;
  const p=_ga.lines.filter(l=>l.kind!=="labor").reduce((s,l)=>s+(l.qty||0)*(l.unit_price||0),0),w=_ga.lines.filter(l=>l.kind==="labor").reduce((s,l)=>s+(l.qty||0)*(l.unit_price||0),0);
  const j=_ga.job||{};
  b.innerHTML=`<div class="ga-totals"><span>${esc(t("ga_parts"))} <b>${zdMoney(p)}</b></span><span>${esc(t("ga_labor"))} <b>${zdMoney(w)}</b></span>${j.deposit?`<span>${esc(t("ga_deposit"))} <b>−${zdMoney(j.deposit)}</b></span>`:""}<span class="ga-big">${esc(t("ga_total"))} <b>${zdMoney(p+w)}</b></span></div>`;
}
async function gaAddLine(kind){
  if(kind==="labor"){const s=await gaSettings();_ga.lines.push({kind,label:t("ga_labor_default"),qty:1,unit_price:Number(s.labor_rate)||0});}
  else _ga.lines.push({kind,label:"",qty:1,unit_price:0,product_id:null});
  gaRenderLines();
}
function gaPickProduct(i,pid){const p=(_ga.products||[]).find(x=>x.id===pid);const l=_ga.lines[i];l.product_id=pid||null;if(p){l.label=p.name;l.unit_price=p.unit_price||0;}gaRenderLines();}
function gaJobBody(){return {mechanic_id:zdVal("ga-j-m")||null,promised_at:zdVal("ga-j-p")||null,complaint:zdVal("ga-j-c")||null,diagnosis:zdVal("ga-j-d")||null,lines:_ga.lines.map(l=>({kind:l.kind,label:(l.label||"").trim(),qty:l.qty,unit_price:l.unit_price,product_id:l.product_id||null}))};}
async function gaSaveJob(silent){
  try{const j=await api("PATCH",`/garage/jobs/${_ga.job.id}`,gaJobBody());_ga.job=j;if(!silent)showToast(t("ga_saved"));gaRefreshList();return j;}
  catch(e){showErr("ga-j-err",e.message);throw e;}
}
function gaRefreshList(){if(document.getElementById("page-garagejobs")?.classList.contains("active"))navigate("garagejobs");}
async function gaSetStatus(s){
  try{await gaSaveJob(true);await api("POST",`/garage/jobs/${_ga.job.id}/status`,{status:s});showToast(t("ga_st_done").replace("{s}",t("ga_st_"+s)));gaRefreshList();gaJobOpen(_ga.job.id);}
  catch(e){showErr("ga-j-err",e.message);}
}
function gaCancelJob(){
  zdModal("modal-ga-confirm",`<div class="modal-title">${esc(t("ga_cancel_job"))}</div><div style="font-size:13px;margin-bottom:12px">${esc(t("ga_cancel_q"))}</div><div class="err-box" id="ga-cf-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ga-confirm')">${esc(t("btn_back"))}</button><button class="btn btn-sm" style="background:var(--red);color:#fff" onclick="gaCancelGo()">${esc(t("ga_cancel_job"))}</button></div>`,420);
}
async function gaCancelGo(){try{await api("POST",`/garage/jobs/${_ga.job.id}/status`,{status:"cancelled"});zdCloseModal("modal-ga-confirm");zdCloseModal("modal-ga-job");gaRefreshList();}catch(e){showErr("ga-cf-err",e.message);}}
async function gaQuote(){
  try{await gaSaveJob(true);const r=await api("POST",`/garage/jobs/${_ga.job.id}/quote`);
    const link=`${location.origin}/?portal=${encodeURIComponent(r.portal_token)}`;
    zdModal("modal-ga-q",`<div class="modal-title"><i class="ti ti-file-invoice" style="color:var(--green)"></i> ${esc(t("ga_quote_ok").replace("{n}",r.number))}</div>
      <div style="font-size:13px;margin-bottom:10px">${esc(t("ga_quote_x"))}</div><input class="inp" readonly value="${esc(link)}" onclick="this.select()">
      <div class="modal-footer"><a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="${gaWa("",t("ga_wa_quote").replace("{n}",r.number).replace("{a}",zdMoney(r.total)).replace("{u}",link))}"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a><button class="btn btn-g btn-sm" onclick="navigator.clipboard.writeText('${esc(link)}').then(()=>showToast(t('ga_copied')),()=>{});zdCloseModal('modal-ga-q')"><i class="ti ti-copy"></i> ${esc(t("ga_copy_link"))}</button></div>`,480);
    gaJobOpen(_ga.job.id);
  }catch(e){showErr("ga-j-err",e.message);}
}
function gaDeposit(){
  zdModal("modal-ga-dep",`<div class="modal-title"><i class="ti ti-cash" style="color:var(--green)"></i> ${esc(t("ga_deposit"))}</div>
    <div class="fgrp"><label class="fl" for="ga-dp-a">${esc(t("ga_amount"))}</label><input class="inp" id="ga-dp-a" type="number" min="0.01" step="0.01" inputmode="decimal"></div>
    <div class="fgrp"><label class="fl" for="ga-dp-m">${esc(t("ga_method"))}</label><select class="inp" id="ga-dp-m">${zdMethodOptions(_ga.job.deposit_method||"cash")}</select></div>
    <div class="err-box" id="ga-dp-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ga-dep')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="gaDepositGo()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,400);
}
async function gaDepositGo(){
  const a=zdNum("ga-dp-a");if(!(a>0)){showErr("ga-dp-err",t("ga_amount_req"));return;}
  try{await api("POST",`/garage/jobs/${_ga.job.id}/deposit`,{amount:a,method:zdVal("ga-dp-m")});zdCloseModal("modal-ga-dep");showToast(t("ga_saved"));gaJobOpen(_ga.job.id);}catch(e){showErr("ga-dp-err",e.message);}
}
async function gaCheckout(){
  try{await gaSaveJob(true);}catch(_){return;}
  const j=_ga.job,tot=(j.lines||[]).reduce((s,l)=>s+l.qty*l.unit_price,0);
  if(!tot){showErr("ga-j-err",t("ga_no_lines"));return;}
  const s=await gaSettings();const nd=new Date();nd.setMonth(nd.getMonth()+Number(s.reminder_months||6));
  zdModal("modal-ga-co",`<div class="modal-title"><i class="ti ti-cash" style="color:var(--green)"></i> ${esc(t("ga_checkout"))} · ${esc(j.number)}</div>
    <div class="ga-totals" style="margin-bottom:10px"><span>${esc(t("ga_total"))} <b>${zdMoney(tot)}</b></span>${j.deposit?`<span>${esc(t("ga_deposit"))} <b>−${zdMoney(j.deposit)}</b></span>`:""}<span class="ga-big">${esc(t("ga_to_collect"))} <b id="ga-co-rest">${zdMoney(tot-(j.deposit||0))}</b></span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fgrp"><label class="fl" for="ga-co-d">${esc(t("ga_discount"))}</label><input class="inp" id="ga-co-d" type="number" min="0" step="0.01" value="0" oninput="document.getElementById('ga-co-rest').textContent=zdMoney(Math.max(0,${tot}-(parseFloat(this.value)||0)-${j.deposit||0}))"></div>
      <div class="fgrp"><label class="fl" for="ga-co-m">${esc(t("ga_method"))}</label><select class="inp" id="ga-co-m">${zdMethodOptions("cash")}</select></div>
      <div class="fgrp"><label class="fl" for="ga-co-t">${esc(t("ga_tendered"))}</label><input class="inp" id="ga-co-t" type="number" min="0" step="0.01" inputmode="decimal"></div>
      <div class="fgrp"><label class="fl" for="ga-co-n">${esc(t("ga_next_service"))}</label><input class="inp" id="ga-co-n" type="date" value="${isoDate(nd)}"></div></div>
    <div class="err-box" id="ga-co-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ga-co')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" id="ga-co-go" onclick="gaCheckoutGo()"><i class="ti ti-check"></i> ${esc(t("ga_checkout_go"))}</button></div>`,480);
}
async function gaCheckoutGo(){
  const b=document.getElementById("ga-co-go");b.disabled=true;
  try{
    const tv=zdVal("ga-co-t");
    const r=await api("POST",`/garage/jobs/${_ga.job.id}/checkout`,{method:zdVal("ga-co-m"),discount:zdNum("ga-co-d")||0,tendered:tv?Number(tv):null,next_service_date:zdVal("ga-co-n")||null});
    zdCloseModal("modal-ga-co");zdCloseModal("modal-ga-job");
    showToast(t("ga_paid").replace("{n}",r.number)+(r.change?` · ${t("ga_change")} ${zdMoney(r.change)}`:""));gaRefreshList();
  }catch(e){showErr("ga-co-err",e.message);}finally{b.disabled=false;}
}
function gaCopyTrack(){const u=gaTrackUrl(_ga.job);navigator.clipboard.writeText(u).then(()=>showToast(t("ga_copied")),()=>showToast(u));}

SECTOR_PAGE_LOADERS.garagevehicles=async el=>{
  const vs=await api("GET","/garage/vehicles"+(_ga.vq?`?q=${encodeURIComponent(_ga.vq)}`:""));
  el.innerHTML=sectorPageHead(esc(t("nav_ga_vehicles")),esc(t("ga_vehicles_sub").replace("{n}",vs.length)),`<button class="btn btn-g btn-sm" onclick="gaVehicleModal()"><i class="ti ti-plus"></i> ${esc(t("ga_new_vehicle"))}</button>`)+
    `<div class="card" style="margin-bottom:12px"><input class="inp" id="ga-vq" placeholder="${esc(t("ga_search_ph"))}" value="${esc(_ga.vq)}" onkeydown="if(event.key==='Enter'){_ga.vq=this.value.trim();navigate('garagevehicles')}"></div>`+
    (vs.length?`<div class="ga-list">${vs.map(v=>`<div class="card ga-job" style="--c:var(--b)" onclick="gaVehicleModal('${v.id}')"><div style="display:flex;gap:8px;align-items:center"><i class="ti ti-${GA_KIND_ICON[v.kind]||"engine"}" style="font-size:20px;color:var(--muted)"></i><div style="min-width:0"><b>${esc(v.label)}</b><div style="font-size:12px;color:var(--muted)">${esc(v.client_name||t("ga_no_client"))}${v.mileage!=null?` · ${zdQty(v.mileage)} km`:""}</div></div></div>
      ${v.next_service_date?`<div style="font-size:12px;margin-top:6px;color:${v.next_service_date<zdToday()?"var(--red)":"var(--muted)"}"><i class="ti ti-bell"></i> ${esc(t("ga_next_service"))} : ${esc(fmtDate(v.next_service_date))}</div>`:""}</div>`).join("")}</div>`:`<div class="card">${zdEmpty(t("ga_no_vehicles"),"engine")}</div>`);
};
async function gaVehicleModal(id){
  const v=id?await api("GET",`/garage/vehicles/${id}`):{};
  zdModal("modal-ga-v",`<div class="modal-title"><i class="ti ti-${GA_KIND_ICON[v.kind]||"engine"}" style="color:var(--green)"></i> ${esc(id?v.label:t("ga_new_vehicle"))}</div>
    ${gaVehicleFields("ga-v",v)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="fgrp"><label class="fl" for="ga-v-vin">${esc(t("ga_vin"))}</label><input class="inp" id="ga-v-vin" value="${esc(v.vin||"")}"></div>
      <div class="fgrp"><label class="fl" for="ga-v-nsd">${esc(t("ga_next_service"))}</label><input class="inp" id="ga-v-nsd" type="date" value="${esc(v.next_service_date||"")}"></div></div>
    <div class="fgrp"><label class="fl" for="ga-v-notes">${esc(t("ga_notes"))}</label><textarea class="inp" id="ga-v-notes" rows="2">${esc(v.notes||"")}</textarea></div>
    ${id?`<div class="fl" style="margin:8px 0">${esc(t("ga_history_v"))} · ${esc(t("ga_spent"))} ${zdMoney(v.spent)}</div>${(v.jobs||[]).map(j=>`<div class="ht-bk" onclick="zdCloseModal('modal-ga-v');gaJobOpen('${j.id}')"><span style="flex:1"><b style="font-family:var(--mono);font-size:12px">${esc(j.number)}</b> ${gaBadge(j.status)}<div style="font-size:12px;color:var(--muted)">${esc(fmtDate(j.created_at))} · ${esc((j.complaint||"").slice(0,80))}</div></span><b>${zdMoney(j.total)}</b></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">—</div>`}`:""}
    <div class="err-box" id="ga-v-err"></div>
    <div class="modal-footer">${id?`<button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ga-v');gaNewJob('${id}')"><i class="ti ti-clipboard-list"></i> ${esc(t("ga_new_job"))}</button>`:""}<button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ga-v')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="gaVehicleSave('${id||""}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,560);
  if(id&&v.client_name){const c=document.getElementById("ga-v-cn");if(c)c.dataset.orig=v.client_name;}
}
async function gaVehicleSave(id){
  const d=gaVehicleData("ga-v");d.vin=zdVal("ga-v-vin")||null;d.notes=zdVal("ga-v-notes")||null;d.next_service_date=zdVal("ga-v-nsd")||null;
  const c=document.getElementById("ga-v-cn");if(id&&c&&c.dataset.orig&&c.value.trim()===c.dataset.orig){delete d.client_name;delete d.client_phone;}
  try{await api(id?"PATCH":"POST",id?`/garage/vehicles/${id}`:"/garage/vehicles",d);zdCloseModal("modal-ga-v");showToast(t("ga_saved"));
    if(document.getElementById("page-garagevehicles")?.classList.contains("active"))navigate("garagevehicles");}
  catch(e){showErr("ga-v-err",e.message);}
}

SECTOR_PAGE_LOADERS.garagereminders=async el=>{
  const r=await api("GET","/garage/reminders");
  el.innerHTML=sectorPageHead(esc(t("nav_ga_reminders")),esc(t("ga_rem_sub").replace("{n}",r.todo)),"")+
    (r.rows.length?`<div class="card">${r.rows.map(v=>`<div class="ht-bk" style="cursor:default"><span style="flex:1;min-width:0"><b>${esc(v.label)}</b> ${v.done?`<span class="badge bg">${esc(t("ga_reminded"))}</span>`:v.overdue?`<span class="badge br">${esc(t("ga_overdue"))}</span>`:`<span class="badge ba">${esc(t("ga_soon"))}</span>`}
      <div style="font-size:12px;color:var(--muted)">${esc(v.client_name||t("ga_no_client"))}${v.client_phone?` · ${esc(v.client_phone)}`:""} · ${esc(fmtDate(v.next_service_date))}</div></span>
      ${v.client_phone?`<a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="${gaWa(v.client_phone,t("ga_wa_rem").replace("{c}",v.client_name||"").replace("{v}",v.label).replace("{g}",State.tenant?.company_name||State.tenant?.name||""))}"><i class="ti ti-brand-whatsapp"></i></a>`:""}
      ${v.done?"":`<button class="btn btn-o btn-sm" onclick="gaReminded('${v.id}')"><i class="ti ti-check"></i> ${esc(t("ga_mark_reminded"))}</button>`}</div>`).join("")}</div>`:`<div class="card">${zdEmpty(t("ga_no_reminders"),"bell")}</div>`);
};
async function gaReminded(id){try{await api("POST",`/garage/vehicles/${id}/reminded`);navigate("garagereminders");}catch(e){showToast(e.message,"error");}}

SECTOR_PAGE_LOADERS.garagemechanics=async el=>{
  if(!_ga.month)_ga.month=zdToday().slice(0,7);
  const [ms,cm]=await Promise.all([gaMech(true),api("GET",`/garage/commissions?month=${_ga.month}`)]);
  const mgr=rsIsManager();
  el.innerHTML=sectorPageHead(esc(t("nav_ga_mechanics")),esc(t("ga_mech_sub")),mgr?`<button class="btn btn-g btn-sm" onclick="gaMechModal()"><i class="ti ti-plus"></i> ${esc(t("ga_add_mech"))}</button>`:"")+
    `<div class="card" style="margin-bottom:12px">${ms.length?ms.map(m=>`<div class="ht-bk" onclick="${mgr?`gaMechModal('${m.id}')`:""}"><span style="flex:1"><b>${esc(m.name)}</b>${m.active?"":` <span class="badge br">${esc(t("ga_inactive"))}</span>`}<div style="font-size:12px;color:var(--muted)">${esc(m.specialty||"")}${m.phone?` · ${esc(m.phone)}`:""}</div></span><span class="badge bb">${m.commission_pct} %</span></div>`).join(""):zdEmpty(t("ga_no_mech"),"user-star")}</div>
    <div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px"><b>${esc(t("ga_commissions"))}</b><input class="inp" type="month" value="${_ga.month}" style="width:auto" onchange="_ga.month=this.value;navigate('garagemechanics')"></div>
      ${cm.rows.length?`<div class="table-wrap"><table><thead><tr><th>${esc(t("ga_mechanic"))}</th><th>${esc(t("ga_jobs_n"))}</th><th>${esc(t("ga_labor"))}</th><th>${esc(t("ga_commission"))}</th><th>${esc(t("ga_unpaid"))}</th><th></th></tr></thead><tbody>${cm.rows.map(r=>`<tr><td><b>${esc(r.name)}</b></td><td>${r.jobs}</td><td>${zdMoney(r.base)}</td><td>${zdMoney(r.amount)}</td><td>${zdMoney(r.unpaid)}</td><td>${mgr&&r.unpaid>0?`<button class="btn btn-o btn-sm" onclick="gaPayComm('${r.mechanic_id}')">${esc(t("ga_pay"))}</button>`:""}</td></tr>`).join("")}</tbody></table></div>
      <div style="text-align:right;font-size:13px;margin-top:6px">${esc(t("ga_total"))} <b>${zdMoney(cm.total)}</b> · ${esc(t("ga_unpaid"))} <b>${zdMoney(cm.unpaid)}</b></div>`:zdEmpty(t("ga_no_comm"),"cash")}</div>`;
};
function gaMechModal(id){
  const m=(_ga.mech||[]).find(x=>x.id===id)||{active:true,commission_pct:0};
  zdModal("modal-ga-m",`<div class="modal-title"><i class="ti ti-user-star" style="color:var(--green)"></i> ${esc(id?m.name:t("ga_add_mech"))}</div>
    <div class="fgrp"><label class="fl" for="ga-m-n">${esc(t("ga_name"))}</label><input class="inp" id="ga-m-n" value="${esc(m.name||"")}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="fgrp"><label class="fl" for="ga-m-p">${esc(t("ga_phone"))}</label><input class="inp" id="ga-m-p" type="tel" value="${esc(m.phone||"")}"></div>
      <div class="fgrp"><label class="fl" for="ga-m-s">${esc(t("ga_specialty"))}</label><input class="inp" id="ga-m-s" value="${esc(m.specialty||"")}"></div>
      <div class="fgrp"><label class="fl" for="ga-m-c">${esc(t("ga_commission_pct"))}</label><input class="inp" id="ga-m-c" type="number" min="0" max="100" step="0.5" value="${m.commission_pct||0}"></div>
      ${id?`<label class="terms-check" style="align-self:end"><input type="checkbox" id="ga-m-a" ${m.active?"checked":""}><span>${esc(t("ga_active"))}</span></label>`:""}</div>
    <div class="err-box" id="ga-m-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ga-m')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="gaMechSave('${id||""}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,460);
}
async function gaMechSave(id){
  const d={name:zdVal("ga-m-n"),phone:zdVal("ga-m-p")||null,specialty:zdVal("ga-m-s")||null,commission_pct:zdNum("ga-m-c")||0};
  if(id)d.active=!!document.getElementById("ga-m-a")?.checked;
  try{await api(id?"PATCH":"POST",id?`/garage/mechanics/${id}`:"/garage/mechanics",d);zdCloseModal("modal-ga-m");navigate("garagemechanics");}catch(e){showErr("ga-m-err",e.message);}
}
async function gaPayComm(mid){try{const r=await api("POST","/garage/commissions/pay",{mechanic_id:mid,month:_ga.month});showToast(t("ga_paid_comm").replace("{a}",zdMoney(r.paid)));navigate("garagemechanics");}catch(e){showToast(e.message,"error");}}

SECTOR_PAGE_LOADERS.garagereport=async el=>{
  if(!_ga.month)_ga.month=zdToday().slice(0,7);
  const r=await api("GET",`/garage/report?month=${_ga.month}`);
  const tile=(l,v,c)=>`<div class="card"><div style="font-size:12px;color:var(--muted)">${esc(l)}</div><div style="font-size:22px;font-weight:800;${c?`color:${c}`:""}">${v}</div></div>`;
  el.innerHTML=sectorPageHead(esc(t("nav_ga_report")),"",`<input class="inp" type="month" value="${_ga.month}" style="width:auto" onchange="_ga.month=this.value;navigate('garagereport')">`)+
    `<div class="ga-tiles">${tile(t("ga_r_revenue"),zdMoney(r.revenue),"var(--green)")}${tile(t("ga_r_delivered"),r.delivered)}${tile(t("ga_r_avg"),zdMoney(r.avg_ticket))}${tile(t("ga_parts"),zdMoney(r.parts))}${tile(t("ga_labor"),zdMoney(r.labor))}${tile(t("ga_r_open"),r.open)}${tile(t("ga_late"),r.late,r.late?"var(--red)":"")}</div>
    <div class="card" style="margin-top:12px"><b>${esc(t("ga_r_by_status"))}</b>${GA_ST.map(s=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${gaBadge(s)}</span><b>${r.by_status[s]||0}</b></div>`).join("")}</div>`;
};

async function gaSettingsModal(){
  const s=await gaSettings(true);
  zdModal("modal-ga-s",`<div class="modal-title"><i class="ti ti-settings" style="color:var(--green)"></i> ${esc(t("ga_settings"))}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="fgrp"><label class="fl" for="ga-s-r">${esc(t("ga_labor_rate"))}</label><input class="inp" id="ga-s-r" type="number" min="0" step="0.5" value="${s.labor_rate}"></div>
      <div class="fgrp"><label class="fl" for="ga-s-m">${esc(t("ga_rem_months"))}</label><input class="inp" id="ga-s-m" type="number" min="1" max="36" value="${s.reminder_months}"></div>
      <div class="fgrp"><label class="fl" for="ga-s-d">${esc(t("ga_rem_days"))}</label><input class="inp" id="ga-s-d" type="number" min="0" max="90" value="${s.reminder_days_before}"></div>
      <div class="fgrp"><label class="fl" for="ga-s-p">${esc(t("ga_phone_public"))}</label><input class="inp" id="ga-s-p" type="tel" value="${esc(s.phone||"")}"></div></div>
    <label class="terms-check"><input type="checkbox" id="ga-s-t" ${s.public_tracking?"checked":""}><span>${esc(t("ga_public_tracking"))}</span></label>
    <div class="err-box" id="ga-s-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ga-s')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="gaSettingsSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,480);
}
async function gaSettingsSave(){
  try{_ga.settings=await api("PUT","/garage/settings",{labor_rate:zdNum("ga-s-r")||0,reminder_months:parseInt(zdVal("ga-s-m"))||6,reminder_days_before:parseInt(zdVal("ga-s-d"))||0,phone:zdVal("ga-s-p"),public_tracking:!!document.getElementById("ga-s-t").checked});zdCloseModal("modal-ga-s");showToast(t("ga_saved"));}
  catch(e){showErr("ga-s-err",e.message);}
}
