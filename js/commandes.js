// ── COMMANDES ET PAIEMENTS EN LIGNE (9.1) ─────────────────────────────────
// Page « Commandes en ligne » (commerçant), panier public (carte QR, boutique,
// salon), suivi de commande (?order=) et espace client chambre froide.
const OC_MODULES=["resto","hotel","beauty","retail","cold"];
MODULE_PAGES.online=[["onlineorders","world-www","nav_online_orders","sales"]];
SECTOR_PAGE_MODULE.onlineorders="online";
if(typeof PAGE_MODULES==="object")PAGE_MODULES.onlineorders="sales";
function ocHasModules(){return sectorModules().some(m=>OC_MODULES.includes(m));}
const _ocHasModuleOrig=hasModule;
hasModule=function(m){return m==="online"?ocHasModules():_ocHasModuleOrig(m);};
const _ocApplyOrig=applySectorUI;
applySectorUI=function(){
  _ocApplyOrig();
  if(!State.tenant||!ocHasModules())return;
  const g=document.getElementById("nav-sector");
  if(g&&!g.querySelector('[data-p="onlineorders"]')){
    const lbl=g.querySelector(".nav-lbl");const d=document.createElement("div");
    d.className="nav-i";d.dataset.p="onlineorders";d.setAttribute("onclick","navigate('onlineorders')");
    d.innerHTML=`<i class="ti ti-world-www"></i><span>${esc(t("nav_online_orders"))}</span> <span class="nav-badge" id="online-badge" style="display:none">0</span>`;
    d.classList.toggle("zd-hidden-role",!memberCanOpen("onlineorders"));
    lbl?lbl.after(d):g.prepend(d);
    if(document.getElementById("page-onlineorders")?.classList.contains("active"))d.classList.add("active");
  }
  const box=document.getElementById("more-sector");
  if(box&&!box.querySelector('[data-oc]')&&memberCanOpen("onlineorders")){
    const d=document.createElement("div");d.dataset.oc="1";d.setAttribute("onclick","navigate('onlineorders');closeMoreMenu()");
    d.style.cssText="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:10px;background:var(--card);cursor:pointer;border:1px solid var(--green);position:relative";
    d.innerHTML=`<i class="ti ti-world-www" style="font-size:22px;color:var(--green)"></i><span style="font-size:10px;font-family:var(--mono);text-align:center">${esc(t("nav_online_orders"))}</span><span class="nav-badge" id="online-badge-more" style="display:none;position:absolute;top:4px;right:6px">0</span>`;
    box.prepend(d);
  }
  ocUpdateBadges();
};

function ocErr(d){const x=d&&d.detail;if(!x)return "Erreur";if(typeof x==="string")return x;if(x.message)return x.message;if(Array.isArray(x))return x.map(e=>e.msg||"").join(" · ");return "Erreur";}
async function ocFetch(method,path,body){
  const r=await fetch(`${API_BASE}${path}`,{method,headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined});
  let d={};try{d=await r.json();}catch(_){}
  if(!r.ok){const e=new Error(ocErr(d));e.detail=d.detail;e.status=r.status;throw e;}
  return d;
}
function ocPayLabel(m,mode){
  if(m==="cash")return t(mode==="delivery"?"oc_pay_cash_delivery":"oc_pay_cash_pickup");
  return t("oc_pay_"+m);
}
function ocModeLabel(o){
  if(o.mode==="table")return t("oc_mode_table")+(o.table_name?" "+o.table_name:"");
  if(o.mode==="room")return t("oc_mode_room")+(o.extra?.room?" · "+t("ht_room")+" "+o.extra.room:"");
  return t("oc_mode_"+o.mode);
}
function ocItemsHtml(items){
  return (items||[]).map(i=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:3px 0"><span><b>${zdQty(i.qty)} ×</b> ${esc(i.name)}${i.unit&&i.unit!==""&&i.unit!=null&&!String(i.name).includes(i.unit)?` <span style="color:var(--muted)">(${esc(i.unit)})</span>`:""}${(i.modifiers||[]).length?`<div style="font-size:11px;color:var(--muted)">${i.modifiers.map(m=>esc(m.name||m.option||"")).join(", ")}</div>`:""}${i.note?`<div style="font-size:11px;color:var(--amber)">${esc(i.note)}</div>`:""}${i.rx?` <span class="badge ba">${esc(t("oc_rx_badge"))}</span>`:""}${i.lot?` <span style="font-size:11px;color:var(--muted)">${esc(i.lot)}</span>`:""}</span>${i.total!=null?`<b class="mono">${zdMoney(i.total)}</b>`:""}</div>`).join("");
}

// ── Compteur et alertes ──
let _ocLast={todo:null,declared:null},_ocPoll=null;
async function ocUpdateBadges(){
  if(!State.token||!State.tenant||!ocHasModules())return;
  try{
    const r=await api("GET","/online/count");
    ["online-badge","online-badge-more"].forEach(id=>{const b=document.getElementById(id);if(b){b.textContent=r.todo;b.style.display=r.todo?"inline-flex":"none";}});
    if(_ocLast.todo!==null&&(r.pending>_ocLast.pending||r.declared>_ocLast.declared)){
      zdBeep();setTimeout(zdBeep,300);
      showToast(r.declared>_ocLast.declared&&!(r.pending>_ocLast.pending)?t("oc_new_pay_toast"):t("oc_new_toast"));
      if(document.getElementById("page-onlineorders")?.classList.contains("active"))ocLoad();
    }
    _ocLast=r;
  }catch(_){}
}
function ocStartPolling(){clearInterval(_ocPoll);_ocPoll=setInterval(()=>{if(!document.hidden)ocUpdateBadges();},30000);}
document.addEventListener("DOMContentLoaded",ocStartPolling);

// ── Page « Commandes en ligne » ──
const _oc={tab:"active",orders:[],settings:null};
SECTOR_PAGE_LOADERS.onlineorders=async el=>{el.innerHTML=`<div class="card" style="text-align:center;color:var(--muted)">${esc(t("loading"))}</div>`;await ocLoad(el);sectorTimer("onlineorders",()=>{if(_oc.tab!=="settings")ocLoad();},20000);};
async function ocLoad(el){
  el=el||document.getElementById("page-onlineorders");if(!el)return;
  try{
    if(!_oc.settings||_oc.tab==="settings")_oc.settings=await api("GET","/online/settings");
    if(_oc.tab!=="settings"){_oc.orders=await api("GET",`/online/orders?status=${_oc.tab}`);_ocLast=await api("GET","/online/count");}
    ocRender(el);ocUpdateBadges();
  }catch(e){el.innerHTML=`<div class="card" style="text-align:center;color:var(--red)">${esc(e.message)}</div>`;}
}
function ocRender(el){
  el=el||document.getElementById("page-onlineorders");if(!el)return;
  const s=_oc.settings||{};const c=_ocLast||{};
  const tabs=["active","done","settings"].map(k=>`<button class="btn btn-sm ${_oc.tab===k?"btn-g":"btn-o"}" onclick="_oc.tab='${k}';ocLoad()">${esc(t("oc_tab_"+k))}${k==="active"&&c.todo?` <span class="nav-badge" style="display:inline-flex">${c.todo}</span>`:""}</button>`).join("");
  let body="";
  if(_oc.tab==="settings")body=ocSettingsHtml();
  else if(!s.enabled&&!_oc.orders.length)body=`<div class="card" style="text-align:center;padding:30px"><i class="ti ti-world-www" style="font-size:40px;color:var(--green)"></i><div style="font-weight:800;font-size:17px;margin:10px 0 6px">${esc(t("oc_off_title"))}</div><div style="color:var(--muted);font-size:13px;max-width:520px;margin:0 auto 14px">${esc(t("oc_off_text"))}</div><button class="btn btn-g" onclick="_oc.tab='settings';ocLoad()"><i class="ti ti-settings"></i> ${esc(t("oc_enable_btn"))}</button></div>`;
  else body=_oc.orders.length?`<div class="oc-grid">${_oc.orders.map(ocCardHtml).join("")}</div>`:`<div class="card">${zdEmpty(t(_oc.tab==="done"?"oc_none_done":"oc_none"),"inbox")}</div>`;
  el.innerHTML=sectorPageHead(`<i class="ti ti-world-www"></i> ${esc(t("nav_online_orders"))}`,esc(t("oc_sub").replace("{p}",c.pending||0).replace("{d}",c.declared||0).replace("{a}",c.active||0)),tabs)+body;
  if(_oc.tab==="settings")ocAfterSettingsRender();
}
function ocCardHtml(o){
  const stCls={pending:"ba",accepted:"bb",ready:"bg",delivering:"bb",completed:"bg",rejected:"br",cancelled:"br"}[o.status]||"bb";
  const psCls={unpaid:"ba",declared:"bb",paid:"bg",refund_due:"br",refunded:"bg"}[o.payment_status]||"ba";
  const phone=(o.customer_phone||"").replace(/[^0-9+]/g,"");
  const late=o.status==="pending"&&o.minutes>=10;
  const payable=["mobile_money","bank"].includes(o.payment_method);
  let acts=[];
  if(o.channel==="deposit"){
    if(o.status==="pending")acts.push(`<button class="btn btn-o btn-sm" onclick="ocReject('${o.id}')"><i class="ti ti-x"></i> ${esc(t("oc_cancel_order"))}</button>`);
  }else if(o.status==="pending"){
    acts.push(`<button class="btn btn-g btn-sm" onclick="ocAccept('${o.id}')"><i class="ti ti-check"></i> ${esc(t("oc_accept"))}</button>`,`<button class="btn btn-o btn-sm" onclick="ocReject('${o.id}')"><i class="ti ti-x"></i> ${esc(t("oc_reject"))}</button>`);
  }else if(["accepted","ready","delivering"].includes(o.status)){
    if(o.status==="accepted"&&o.channel!=="resto"&&o.channel!=="cold")acts.push(`<button class="btn btn-o btn-sm" onclick="ocStep('${o.id}','ready')"><i class="ti ti-package"></i> ${esc(t("oc_ready"))}</button>`);
    if(o.mode==="delivery"&&o.status!=="delivering")acts.push(`<button class="btn btn-o btn-sm" onclick="ocStep('${o.id}','deliver')"><i class="ti ti-truck-delivery"></i> ${esc(t("oc_deliver"))}</button>`);
    acts.push(`<button class="btn btn-g btn-sm" onclick="ocComplete('${o.id}')"><i class="ti ti-circle-check"></i> ${esc(t(o.channel==="cold"?"oc_complete_cold":"oc_complete"))}</button>`);
    acts.push(`<button class="btn btn-o btn-sm" onclick="ocReject('${o.id}')"><i class="ti ti-x"></i> ${esc(t("oc_cancel_order"))}</button>`);
  }
  if(o.payment_status==="declared")acts.unshift(`<button class="btn btn-g btn-sm" onclick="ocPay('${o.id}','confirm')"><i class="ti ti-cash"></i> ${esc(t("oc_confirm_pay"))}</button>`,`<button class="btn btn-o btn-sm" onclick="ocPayReject('${o.id}')">${esc(t("oc_reject_pay"))}</button>`);
  if(o.payment_status==="refund_due")acts.push(`<button class="btn btn-o btn-sm" onclick="ocPay('${o.id}','refunded')"><i class="ti ti-arrow-back-up"></i> ${esc(t("oc_refunded"))}</button>`);
  acts.push(`<button class="btn btn-o btn-sm" onclick="ocPrint('${o.id}')" title="${esc(t("oc_print"))}"><i class="ti ti-printer"></i></button>`);
  return `<div class="card oc-card${o.status==="pending"?" oc-new":""}" id="oc-${o.id}">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b class="mono">${esc(o.number)}</b> <span class="badge ${stCls}">${esc(t("oc_st_"+o.status))}</span><div style="font-size:12px;color:var(--muted);margin-top:2px"><i class="ti ti-${{resto:"tools-kitchen-2",store:"building-store",beauty:"scissors",deposit:"cash",cold:"snowflake"}[o.channel]||"world-www"}"></i> ${esc(t("oc_ch_"+o.channel))} · ${esc(ocModeLabel(o))}</div></div>
      <div style="text-align:right;font-size:12px;${late?"color:var(--red);font-weight:700":"color:var(--muted)"}">${esc(t("oc_minutes").replace("{m}",o.minutes))}${o.scheduled_for?`<div style="color:var(--amber);font-weight:700">${esc(t("oc_scheduled").replace("{h}",o.scheduled_for.slice(5).replace("-","/")))}</div>`:""}</div></div>
    <div style="margin:8px 0;padding:8px 0;border-top:1px solid var(--b);border-bottom:1px solid var(--b)"><b>${esc(o.customer_name)}</b>${o.customer_phone?` · <a href="tel:${esc(phone)}" style="color:var(--text)">${esc(o.customer_phone)}</a> <a href="https://wa.me/${esc(phone.replace("+",""))}" target="_blank" rel="noopener" style="color:var(--green)"><i class="ti ti-brand-whatsapp"></i></a>`:""}
      ${o.address?`<div style="font-size:12px;margin-top:3px"><i class="ti ti-map-pin"></i> ${esc(o.address)}</div>`:""}${o.note?`<div style="font-size:12px;margin-top:3px;color:var(--amber)"><i class="ti ti-message"></i> ${esc(o.note)}</div>`:""}
      ${o.extra?.vehicle||o.extra?.recipient?`<div style="font-size:12px;margin-top:3px"><i class="ti ti-truck"></i> ${esc([o.extra.vehicle,o.extra.driver,o.extra.recipient].filter(Boolean).join(" · "))}</div>`:""}</div>
    ${ocItemsHtml(o.items)}
    ${o.delivery_fee?`<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted)"><span>${esc(t("oc_delivery_fee"))}</span><span class="mono">${zdMoney(o.delivery_fee)}</span></div>`:""}
    ${o.channel!=="cold"?`<div style="display:flex;justify-content:space-between;font-weight:800;margin-top:4px"><span>${esc(t("oc_total"))}</span><span class="mono">${zdMoney(o.total)}</span></div>`:""}
    ${o.rx?`<div class="card2" style="margin-top:8px;padding:8px;border-radius:8px;font-size:12px"><i class="ti ti-prescription"></i> ${esc(t("oc_rx_patient").replace("{p}",o.rx.patient_name).replace("{d}",o.rx.doctor))}${o.rx.age?" · "+esc(o.rx.age):""}${o.has_attachment?` <button class="btn btn-o btn-sm" style="margin-left:6px" onclick="ocViewRx('${o.id}')"><i class="ti ti-photo"></i> ${esc(t("oc_view_rx"))}</button>`:""}</div>`:""}
    ${o.kitchen?`<div style="font-size:12px;margin-top:6px"><i class="ti ti-chef-hat"></i> ${esc(t("oc_kitchen").replace("{r}",o.kitchen.ready).replace("{t}",o.kitchen.total))} · ${esc(o.kitchen.order_number)}</div>`:""}
    ${o.channel!=="cold"?`<div style="font-size:12px;margin-top:6px">${esc(ocPayLabel(o.payment_method,o.mode))} · <span class="badge ${psCls}">${esc(t("oc_ps_"+o.payment_status))}</span>${o.payment_ref?` · ${esc(t("oc_ref"))} <b class="mono">${esc(o.payment_ref)}</b>`:""}${o.extra?.payer?` · ${esc(o.extra.payer)}`:""}</div>`:""}
    ${o.channel==="deposit"&&o.status==="pending"&&o.payment_status==="unpaid"?`<div style="font-size:12px;color:var(--muted);margin-top:4px">${esc(t("oc_wait_deposit"))}</div>`:""}
    ${o.reject_reason?`<div style="font-size:12px;color:var(--red);margin-top:4px">${esc(o.reject_reason)}</div>`:""}
    ${o.invoice_number||o.doc_number?`<div style="font-size:12px;color:var(--muted);margin-top:4px"><i class="ti ti-receipt"></i> ${esc(o.invoice_number||o.doc_number)}</div>`:""}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${acts.join("")}</div></div>`;
}
function ocFind(id){return _oc.orders.find(x=>x.id===id);}
async function ocAccept(id){
  const o=ocFind(id);
  zdModal("modal-oc-act",`<div class="modal-title"><i class="ti ti-check"></i> ${esc(t("oc_accept"))} — ${esc(o.number)}</div>
    <div class="fgrp"><label class="fl">${esc(t("oc_accept_msg"))}</label><input class="inp" id="oc-msg" placeholder="${esc(t("oc_accept_msg_ph").replace("20",String(_oc.settings?.prep_minutes||20)))}"></div><div class="err-box" id="oc-act-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-oc-act')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" id="oc-act-btn" onclick="ocDoAccept('${id}')"><i class="ti ti-check"></i> ${esc(t("oc_accept"))}</button></div>`,440);
}
async function ocDoAccept(id){
  const b=document.getElementById("oc-act-btn");b.disabled=true;
  try{await api("POST",`/online/orders/${id}/accept`,{reason:zdVal("oc-msg")||null});zdCloseModal("modal-oc-act");ocLoad();}catch(e){showErr("oc-act-err",e.message);b.disabled=false;}
}
function ocReject(id){
  const o=ocFind(id);
  zdModal("modal-oc-act",`<div class="modal-title"><i class="ti ti-x"></i> ${esc(t(o.status==="pending"?"oc_reject":"oc_cancel_order"))} — ${esc(o.number)}</div>
    <div class="fgrp"><label class="fl">${esc(t("oc_reject_reason"))} *</label><input class="inp" id="oc-reason" placeholder="${esc(t("oc_reject_ph"))}"></div><div class="err-box" id="oc-act-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-oc-act')">${esc(t("btn_cancel"))}</button><button class="btn btn-r btn-sm" id="oc-act-btn" onclick="ocDoReject('${id}')">${esc(t(o.status==="pending"?"oc_reject":"oc_cancel_order"))}</button></div>`,440);
}
async function ocDoReject(id){
  const r=document.getElementById("oc-reason");if(!r.value.trim()){flagMissingFields([r]);return;}
  const b=document.getElementById("oc-act-btn");b.disabled=true;
  try{await api("POST",`/online/orders/${id}/reject`,{reason:r.value.trim()});zdCloseModal("modal-oc-act");ocLoad();}catch(e){showErr("oc-act-err",e.message);b.disabled=false;}
}
async function ocStep(id,step){try{await api("POST",`/online/orders/${id}/${step}`);ocLoad();}catch(e){showToast(e.message,"error");}}
async function ocPay(id,action,reason){try{await api("POST",`/online/orders/${id}/payment`,{action,reason:reason||null});ocLoad();}catch(e){showToast(e.message,"error");}}
function ocPayReject(id){
  zdModal("modal-oc-act",`<div class="modal-title"><i class="ti ti-alert-triangle"></i> ${esc(t("oc_reject_pay"))}</div>
    <div class="fgrp"><label class="fl">${esc(t("oc_pay_reject_reason"))}</label><input class="inp" id="oc-reason" value="${esc(t("oc_reject_pay"))}"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-oc-act')">${esc(t("btn_cancel"))}</button><button class="btn btn-r btn-sm" onclick="zdCloseModal('modal-oc-act');ocPay('${id}','reject',zdVal('oc-reason'))">${esc(t("btn_confirm"))}</button></div>`,420);
}
async function ocComplete(id,extra){
  const o=ocFind(id);
  try{
    const r=await api("POST",`/online/orders/${id}/complete`,extra||{});
    zdCloseModal("modal-oc-act");showToast(t("oc_done_ok").replace("{n}",r.invoice_number||r.doc_number?" · "+(r.invoice_number||r.doc_number):""));ocLoad();
  }catch(e){
    const d=e.detail||{};
    if(d.error==="payment_pending"){
      zdModal("modal-oc-act",`<div class="modal-title"><i class="ti ti-cash"></i> ${esc(t("oc_complete_title"))}</div><div style="font-size:13px;color:var(--muted);margin-bottom:10px">${esc(t("oc_complete_hint"))}</div>
        <div class="fgrp"><select class="inp" id="oc-method">${zdMethodOptions(o.payment_method==="bank"?"bank":"cash")}</select></div>
        <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-oc-act')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="ocComplete('${id}',{method:zdVal('oc-method')})"><i class="ti ti-check"></i> ${esc(t("oc_complete"))}</button></div>`,420);
    }else if(d.error==="room_required"){
      let rooms=[];try{const x=await api("GET","/cold/rooms");rooms=Array.isArray(x)?x:(x.rooms||[]);}catch(_){}
      zdModal("modal-oc-act",`<div class="modal-title"><i class="ti ti-snowflake"></i> ${esc(t("oc_room_title"))}</div>
        <div class="fgrp"><select class="inp" id="oc-room">${rooms.map(r=>`<option value="${r.id}">${esc(r.name)}${r.free_pallets!=null?` — ${zdQty(r.free_pallets)} ${esc(t("cd_free_pallets"))}`:""}</option>`).join("")}</select></div>
        <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-oc-act')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="ocComplete('${id}',{room_id:zdVal('oc-room')})"><i class="ti ti-check"></i> ${esc(t("oc_complete_cold"))}</button></div>`,420);
    }else showToast(e.message,"error");
  }
}
async function ocViewRx(id){
  try{const r=await fetch(`${API_BASE}/online/orders/${id}/attachment`,{headers:{Authorization:"Bearer "+State.token}});if(!r.ok)throw new Error(t("error"));
    const url=URL.createObjectURL(await r.blob());
    zdModal("modal-oc-rx",`<div class="modal-title"><i class="ti ti-prescription"></i> ${esc(t("oc_rx_title"))}</div><img src="${url}" alt="" style="width:100%;border-radius:8px;background:#fff"><div class="modal-footer"><a class="btn btn-o btn-sm" href="${url}" download="ordonnance.jpg"><i class="ti ti-download"></i></a><button class="btn btn-g btn-sm" onclick="zdCloseModal('modal-oc-rx')">${esc(t("btn_close"))}</button></div>`,560);
  }catch(e){showToast(e.message,"error");}
}
function ocPrint(id){
  const o=ocFind(id);const co=State.tenant||{};
  zdShowTicket(`<div style="font-family:monospace;color:#000;font-size:12px"><div style="text-align:center;font-weight:800">${esc(co.company_name||co.name||"")}</div><div style="text-align:center;font-weight:700">${esc(t("nav_online_orders")).toUpperCase()} — ${esc(o.number)}</div><hr>
    <div>${esc(ocModeLabel(o))}${o.scheduled_for?" · "+esc(o.scheduled_for):""}</div><div><b>${esc(o.customer_name)}</b> ${esc(o.customer_phone||"")}</div>${o.address?`<div>${esc(o.address)}</div>`:""}${o.note?`<div>${esc(o.note)}</div>`:""}<hr>
    ${(o.items||[]).map(i=>`<div style="display:flex;justify-content:space-between"><span>${zdQty(i.qty)} × ${esc(i.name)}${(i.modifiers||[]).length?" ("+i.modifiers.map(m=>esc(m.name)).join(", ")+")":""}</span><span>${i.total!=null?zdMoney(i.total):""}</span></div>${i.note?`<div>  › ${esc(i.note)}</div>`:""}`).join("")}
    ${o.delivery_fee?`<div style="display:flex;justify-content:space-between"><span>${esc(t("oc_delivery_fee"))}</span><span>${zdMoney(o.delivery_fee)}</span></div>`:""}<hr>
    ${o.channel!=="cold"?`<div style="display:flex;justify-content:space-between;font-weight:800"><span>${esc(t("oc_total"))}</span><span>${zdMoney(o.total)}</span></div><div>${esc(ocPayLabel(o.payment_method,o.mode))} — ${esc(t("oc_ps_"+o.payment_status))}</div>`:""}
    <div style="margin-top:10px;text-align:center">${new Date().toLocaleString("fr-FR")}</div></div>`,o.number);
}

// ── Réglages ──
let _ocSet=null,_ocCatalog=null,_ocColdClients=null;
function ocSettingsHtml(){
  const s=_oc.settings;_ocSet=JSON.parse(JSON.stringify(s));
  const mods=s.modules||[];const can=!isTeamMember()||State.tenant?.member_role==="admin";
  const ck=(k,lbl,cond=true)=>cond?`<label class="oc-check"><input type="checkbox" id="ocs-${k}" ${s[k]?"checked":""} ${can?"":"disabled"}> ${esc(t(lbl))}</label>`:"";
  const pv=s.payment_preview||{};const bank=pv.bank;
  const links=Object.entries(s.links||{});
  return `${!s.plan_ok?`<div class="alert-bar" style="margin-bottom:12px"><i class="ti ti-lock"></i> ${esc(t("sector_locked"))}</div>`:""}${!can?`<div class="alert-bar" style="margin-bottom:12px"><i class="ti ti-info-circle"></i> ${esc(t("oc_manager_only"))}</div>`:""}
  <div class="grid2" style="align-items:start">
  <div>
    <div class="card" style="margin-bottom:12px"><label class="oc-check" style="font-weight:800;font-size:15px"><input type="checkbox" id="ocs-enabled" ${s.enabled?"checked":""} ${can?"":"disabled"}> ${esc(t("oc_set_enabled"))}</label></div>
    <div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">${esc(t("oc_set_channels"))}</div>
      ${ck("resto_pickup","oc_set_resto_pickup",mods.includes("resto"))}${ck("resto_delivery","oc_set_resto_delivery",mods.includes("resto"))}${ck("resto_table","oc_set_resto_table",mods.includes("resto"))}${ck("room_service","oc_set_room_service",mods.includes("resto")&&mods.includes("hotel"))}
      ${ck("store_pickup","oc_set_store_pickup",mods.includes("retail"))}${ck("store_delivery","oc_set_store_delivery",mods.includes("retail"))}
      ${ck("beauty_shop","oc_set_beauty_shop",mods.includes("beauty"))}
      ${mods.includes("beauty")?`<div class="grid2" style="margin-top:6px"><div class="fgrp"><label class="fl">${esc(t("oc_set_beauty_deposit"))}</label><input class="inp" type="number" min="0" max="100" id="ocs-beauty_deposit_pct" value="${s.beauty_deposit_pct||0}" ${can?"":"disabled"}></div><div class="fgrp"><label class="fl">${esc(t("oc_set_package_sizes"))}</label><input class="inp" id="ocs-package_sizes" value="${(s.package_sizes||[]).join(", ")}" ${can?"":"disabled"}></div></div>`:""}
      ${ck("hotel_prepay","oc_set_hotel_prepay",mods.includes("hotel"))}${mods.includes("hotel")?`<div style="font-size:12px;color:var(--muted);margin:-2px 0 6px 24px" id="ocs-hotel-dep"></div>`:""}
      ${ck("cold_requests","oc_set_cold",mods.includes("cold"))}</div>
    <div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:4px">${esc(t("oc_set_payments"))}</div><div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(t("oc_set_pay_hint"))}</div>
      ${ck("pay_cash","oc_set_cash")}${ck("pay_mobile","oc_set_mobile")}
      <div id="ocs-momo" style="margin:4px 0 8px 24px"></div>
      ${ck("pay_bank","oc_set_bank")}<div style="font-size:12px;margin:-2px 0 4px 24px;color:${bank||s.bank_ready?"var(--muted)":"var(--amber)"}">${s.bank_ready?esc(t("oc_set_bank_info").replace("{b}",[bank?.bank_name,bank?.account||bank?.iban].filter(Boolean).join(" · ")||"✓")):`${esc(t("oc_set_bank_missing"))} <a href="#" onclick="navigate('profile');return false">${esc(t("nav_profil"))}</a>`}</div></div>
  </div>
  <div>
    <div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">${esc(t("oc_set_delivery"))}</div>
      <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("oc_set_delivery_fee"))}</label><input class="inp" type="number" min="0" step="0.5" id="ocs-delivery_fee" value="${s.delivery_fee||0}" ${can?"":"disabled"}></div><div class="fgrp"><label class="fl">${esc(t("oc_set_min_order"))}</label><input class="inp" type="number" min="0" step="0.5" id="ocs-min_order" value="${s.min_order||0}" ${can?"":"disabled"}></div><div class="fgrp"><label class="fl">${esc(t("oc_set_prep"))}</label><input class="inp" type="number" min="0" id="ocs-prep_minutes" value="${s.prep_minutes||0}" ${can?"":"disabled"}></div></div>
      <div class="fgrp"><label class="fl">${esc(t("oc_set_delivery_info"))}</label><input class="inp" id="ocs-delivery_info" value="${esc(s.delivery_info||"")}" placeholder="${esc(t("oc_set_delivery_info_ph"))}" ${can?"":"disabled"}></div>
      <div class="fgrp"><label class="fl">${esc(t("oc_set_message"))}</label><input class="inp" id="ocs-message" value="${esc(s.message||"")}" ${can?"":"disabled"}></div>
      <div class="fgrp"><label class="fl">${esc(t("oc_set_wa"))}</label><input class="inp" id="ocs-notify_whatsapp" inputmode="tel" value="${esc(s.notify_whatsapp||"")}" placeholder="+243 …" ${can?"":"disabled"}></div>
      ${mods.includes("retail")?`<div class="fgrp"><label class="fl">${esc(t("oc_set_store_slug"))}</label><input class="inp" id="ocs-store_slug" value="${esc(s.store_slug||"")}" ${can?"":"disabled"}></div>`:""}</div>
    <div class="err-box" id="ocs-err"></div>${can?`<button class="btn btn-g" style="width:100%;margin-bottom:12px" id="ocs-btn" onclick="ocSaveSettings()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button>`:""}
    <div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">${esc(t("oc_set_links"))}</div>
      ${links.length?links.map(([k,u])=>`<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--b)"><div id="ocq-${k}" style="width:64px;height:64px;flex:0 0 64px;background:#fff;border-radius:6px;padding:3px"></div><div style="flex:1;min-width:0"><b style="font-size:13px">${esc(t("oc_link_"+k))}</b><div class="mono" style="font-size:11px;color:var(--muted);word-break:break-all">${esc(u)}</div><div style="display:flex;gap:6px;margin-top:4px"><button class="btn btn-o btn-sm" onclick="ocCopy('${esc(u)}')"><i class="ti ti-copy"></i> ${esc(t("oc_copy_link"))}</button><a class="btn btn-o btn-sm" href="${esc(u)}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i></a></div></div></div>`).join(""):`<div style="font-size:12px;color:var(--muted)">—</div>`}
      ${(s.tables||[]).length&&s.resto_slug?`<div style="margin-top:10px"><b style="font-size:13px">${esc(t("oc_table_qr"))}</b><div style="font-size:12px;color:var(--muted);margin:2px 0 6px">${esc(t("oc_table_qr_hint"))}</div><button class="btn btn-o btn-sm" onclick="ocPrintTableQr()"><i class="ti ti-qrcode"></i> ${esc(t("oc_table_qr"))} (${s.tables.length})</button></div>`:""}</div>
    ${mods.includes("retail")?`<div class="card" style="margin-bottom:12px"><div style="font-weight:700">${esc(t("oc_set_hidden"))}</div><div style="font-size:12px;color:var(--muted);margin-bottom:6px">${esc(t("oc_set_hidden_hint"))}</div><div id="ocs-catalog" style="max-height:260px;overflow:auto;font-size:13px">${esc(t("loading"))}</div></div>`:""}
    ${mods.includes("cold")?`<div class="card" style="margin-bottom:12px"><div style="font-weight:700">${esc(t("oc_cold_clients"))}</div><div style="font-size:12px;color:var(--muted);margin-bottom:6px">${esc(t("oc_cold_clients_hint"))}</div><div id="ocs-cold">${esc(t("loading"))}</div></div>`:""}
  </div></div>`;
}
function ocRenderMomo(){
  const box=document.getElementById("ocs-momo");if(!box)return;const can=!isTeamMember()||State.tenant?.member_role==="admin";
  const prov=_oc.settings.providers||{};
  box.innerHTML=(_ocSet.mobile_accounts||[]).map((a,i)=>`<div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap"><select class="inp" style="flex:0 0 130px" onchange="_ocSet.mobile_accounts[${i}].provider=this.value" ${can?"":"disabled"}>${Object.entries(prov).map(([k,v])=>`<option value="${k}"${k===a.provider?" selected":""}>${esc(v)}</option>`).join("")}</select><input class="inp" style="flex:1;min-width:130px" inputmode="tel" placeholder="${esc(t("oc_set_number"))}" value="${esc(a.number||"")}" oninput="_ocSet.mobile_accounts[${i}].number=this.value" ${can?"":"disabled"}><input class="inp" style="flex:1;min-width:120px" placeholder="${esc(t("oc_set_holder"))}" value="${esc(a.name||"")}" oninput="_ocSet.mobile_accounts[${i}].name=this.value" ${can?"":"disabled"}>${can?`<button class="btn btn-o btn-sm" onclick="_ocSet.mobile_accounts.splice(${i},1);ocRenderMomo()"><i class="ti ti-trash"></i></button>`:""}</div>`).join("")+
    (can?`<button class="btn btn-o btn-sm" onclick="_ocSet.mobile_accounts.push({provider:'mpesa',number:'',name:''});ocRenderMomo()"><i class="ti ti-plus"></i> ${esc(t("oc_set_add_number"))}</button>`:"");
}
async function ocAfterSettingsRender(){
  ocRenderMomo();
  const s=_oc.settings;
  Object.entries(s.links||{}).forEach(([k,u])=>{try{const q=qrcode(0,"M");q.addData(u);q.make();const el=document.getElementById("ocq-"+k);if(el){el.innerHTML=q.createSvgTag({cellSize:2,margin:0,scalable:true});const sv=el.querySelector("svg");if(sv){sv.style.width="100%";sv.style.height="100%";}}}catch(_){}});
  if((s.modules||[]).includes("hotel")){try{const h=await api("GET","/hotel/settings");const el=document.getElementById("ocs-hotel-dep");if(el)el.textContent=h.deposit_pct>0?t("oc_set_hotel_deposit").replace("{p}",h.deposit_pct):t("oc_set_hotel_deposit0");}catch(_){}}
  if((s.modules||[]).includes("retail")){
    try{const c=await api("GET","/retail/catalog");_ocCatalog=Array.isArray(c)?c:(c.products||c.items||[]);const hid=new Set(_ocSet.store_hidden||[]);const can=!isTeamMember()||State.tenant?.member_role==="admin";
      const box=document.getElementById("ocs-catalog");if(box)box.innerHTML=_ocCatalog.map(p=>`<label class="oc-check" style="padding:3px 0"><input type="checkbox" ${hid.has(p.id)?"":"checked"} ${can?"":"disabled"} onchange="ocToggleHidden('${p.id}',!this.checked)"> ${esc(p.name)}${p.rx?` <span class="badge ba">${esc(t("oc_rx_badge"))}</span>`:""}</label>`).join("")||zdEmpty(t("rt_no_products"));}catch(_){}
  }
  if((s.modules||[]).includes("cold")){
    try{const c=await api("GET","/cold/clients");_ocColdClients=c.clients||[];const box=document.getElementById("ocs-cold");
      if(box)box.innerHTML=_ocColdClients.map(c=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--b)"><span style="font-size:13px"><b>${esc(c.name)}</b>${c.pallets!=null?` <span style="color:var(--muted)">· ${zdQty(c.pallets)} ${esc(t("oc_pallets"))}</span>`:""}</span><span style="display:flex;gap:4px"><button class="btn btn-o btn-sm" onclick="ocColdLink('${c.id}',false)"><i class="ti ti-copy"></i></button><button class="btn btn-o btn-sm" onclick="ocColdLink('${c.id}',true)" style="color:var(--green)"><i class="ti ti-brand-whatsapp"></i></button></span></div>`).join("")||zdEmpty(t("cd_no_clients"));}catch(_){}
  }
}
function ocToggleHidden(id,hide){const h=new Set(_ocSet.store_hidden||[]);hide?h.add(id):h.delete(id);_ocSet.store_hidden=[...h];}
async function ocColdLink(cid,wa){
  try{const r=await api("POST",`/clients/${cid}/portal-link`);const link=`${window.location.origin}${window.location.pathname}?portal=${r.portal_token}`;
    if(wa){const c=(_ocColdClients||[]).find(x=>x.id===cid)||{};const ph=(c.phone||"").replace(/[^0-9]/g,"");window.open(`https://wa.me/${ph}?text=${encodeURIComponent(t("oc_cold_wa_msg")+"\n"+link)}`,"_blank");}
    else ocCopy(link);}catch(e){showToast(e.message,"error");}
}
function ocCopy(txt){try{navigator.clipboard.writeText(txt);showToast(t("oc_link_copied"));}catch(_){prompt("",txt);}}
async function ocSaveSettings(){
  const v=_ocSet;const g=k=>document.getElementById("ocs-"+k);
  ["enabled","resto_pickup","resto_delivery","resto_table","room_service","store_pickup","store_delivery","beauty_shop","hotel_prepay","cold_requests","pay_cash","pay_mobile","pay_bank"].forEach(k=>{if(g(k))v[k]=g(k).checked;});
  ["delivery_fee","min_order","prep_minutes","beauty_deposit_pct"].forEach(k=>{if(g(k))v[k]=parseFloat(g(k).value)||0;});
  v.prep_minutes=Math.round(v.prep_minutes||0);
  ["delivery_info","message","notify_whatsapp","store_slug"].forEach(k=>{if(g(k))v[k]=g(k).value.trim();});
  if(g("package_sizes"))v.package_sizes=g("package_sizes").value.split(/[,; ]+/).map(x=>parseInt(x)).filter(x=>x>=2&&x<=50);
  v.mobile_accounts=(v.mobile_accounts||[]).filter(a=>(a.number||"").trim());
  const body={};["enabled","store_slug","resto_pickup","resto_delivery","resto_table","room_service","store_pickup","store_delivery","beauty_shop","beauty_deposit_pct","package_sizes","hotel_prepay","cold_requests","delivery_fee","min_order","prep_minutes","delivery_info","pay_cash","pay_mobile","pay_bank","mobile_accounts","message","store_hidden","notify_whatsapp"].forEach(k=>{if(v[k]!==undefined&&v[k]!==null)body[k]=v[k];});
  if(!body.store_slug)delete body.store_slug;if(!body.notify_whatsapp)body.notify_whatsapp="";
  const b=document.getElementById("ocs-btn");b.disabled=true;
  try{_oc.settings=await api("PUT","/online/settings",body);showToast(t("oc_saved"));ocRender();}catch(e){showErr("ocs-err",e.message);}finally{const x=document.getElementById("ocs-btn");if(x)x.disabled=false;}
}
function ocPrintTableQr(){
  const s=_oc.settings;const base=`${window.location.origin}${window.location.pathname}?menu=${encodeURIComponent(s.resto_slug)}&table=`;
  const co=State.tenant||{};
  const cards=s.tables.map(tb=>{let svg="";try{const q=qrcode(0,"M");q.addData(base+tb.id);q.make();svg=q.createSvgTag({cellSize:5,margin:0,scalable:true});}catch(_){}
    return `<div style="border:2px dashed #999;border-radius:12px;padding:14px;text-align:center;break-inside:avoid;color:#000"><div style="font-weight:800;font-size:16px">${esc(co.company_name||co.name||"")}</div><div style="width:170px;height:170px;margin:10px auto">${svg.replace("<svg ","<svg style=\"width:100%;height:100%\" ")}</div><div style="font-size:13px">${esc(t("oc_table_qr_scan"))}</div><div style="font-size:26px;font-weight:900;margin-top:4px">${esc(tb.name)}</div></div>`;}).join("");
  zdShowDoc(`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;padding:10px">${cards}</div>`,"QR-tables");
}

// ── Pages publiques : panier ──
const _ocp={kind:null,slug:null,info:null,cart:[],mode:null,table:null};
function ocCartTotal(){return Math.round(_ocp.cart.reduce((a,l)=>a+l.total,0)*100)/100;}
function ocCartCount(){return _ocp.cart.reduce((a,l)=>a+(l.kind==="package"?1:l.qty),0);}
function ocRenderCartBar(){
  let bar=document.getElementById("oc-cartbar");
  if(!_ocp.cart.length){bar?.remove();return;}
  if(!bar){bar=document.createElement("div");bar.id="oc-cartbar";bar.className="oc-cartbar";document.body.appendChild(bar);}
  bar.innerHTML=`<button class="btn btn-g" onclick="ocOpenCheckout()"><i class="ti ti-shopping-cart"></i> ${esc(t("oc_cart_items").replace("{n}",ocCartCount()))} · <b>${zdMoney(ocCartTotal())}</b> <span style="margin-left:auto">${esc(t("oc_order_btn"))} <i class="ti ti-arrow-right"></i></span></button>`;
}
function ocAddLine(line){
  const same=_ocp.cart.find(l=>l.key===line.key);
  if(same){same.qty+=line.qty;same.total=Math.round(same.qty*same.unit_price*100)/100;}else _ocp.cart.push(line);
  showToast(t("rs_added")+" : "+line.name);ocRenderCartBar();
}

// Restaurant
async function ocLoadResto(slug,table){
  try{_ocp.info=await ocFetch("GET",`/public/order/resto/${encodeURIComponent(slug)}${table?`?table=${encodeURIComponent(table)}`:""}`);}catch(_){_ocp.info=null;}
  _ocp.kind="resto";_ocp.slug=slug;_ocp.mode=_ocp.info?.modes?.[0]||null;_ocp.table=_ocp.info?.table||null;
}
function ocRestoCan(){return _ocp.kind==="resto"&&_ocp.info&&_ocp.info.enabled;}
function ocRestoBanner(){
  if(!ocRestoCan())return "";const i=_ocp.info;
  return `<div class="card oc-banner" style="margin-bottom:12px"><i class="ti ti-shopping-bag" style="font-size:22px;color:var(--green)"></i><div style="flex:1"><b>${esc(_ocp.table?t("oc_mode_table")+" "+_ocp.table.name:t("oc_order_online"))}</b><div style="font-size:12px;color:var(--muted)">${i.modes.filter(m=>m!=="table").map(m=>esc(t("oc_mode_"+m))).join(" · ")}${i.min_order?" · "+esc(t("oc_min_order").replace("{v}",zdMoney(i.min_order))):""}${i.prep_minutes?" · ~"+i.prep_minutes+" min":""}</div>${i.message?`<div style="font-size:12px;margin-top:2px">${esc(i.message)}</div>`:""}${i.happy_hour?`<div class="badge bg" style="margin-top:4px">${esc(t("oc_hh"))}</div>`:""}</div></div>`;
}
function ocRestoAdd(id){
  const it=_ocp.info.items[id];if(!it||!it.available)return;
  if((it.modifiers||[]).length){ocRestoOptions(id);return;}
  ocAddLine({key:id,id,name:it.name,qty:1,unit_price:Math.round(it.price*(1+(it.tax_rate||0)/100)*100)/100,total:Math.round(it.price*(1+(it.tax_rate||0)/100)*100)/100,modifiers:[]});
}
let _ocOpt={};
function ocRestoOptions(id){
  const it=_ocp.info.items[id];_ocOpt={id,sel:{},qty:1,note:""};
  ocRenderOptions();
}
function ocRenderOptions(){
  const it=_ocp.info.items[_ocOpt.id];
  const extra=Object.entries(_ocOpt.sel).reduce((a,[g,arr])=>a+arr.reduce((b,o)=>b+((it.modifiers.find(x=>x.name===g)?.options.find(x=>x.name===o)?.price)||0),0),0);
  const unit=Math.round((it.price+extra)*(1+(it.tax_rate||0)/100)*100)/100;
  zdModal("modal-oc-opt",`<div class="modal-title">${esc(it.name)}</div><div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(t("oc_choose_options"))}</div>
    ${it.modifiers.map(g=>`<div style="margin-bottom:10px"><div style="font-weight:700;font-size:13px">${esc(g.name)}${g.min?" *":""} <span style="font-weight:400;color:var(--muted);font-size:11px">${g.max>1?esc(t("rs_up_to").replace("{n}",g.max)):""}</span></div><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">${g.options.map(o=>{const on=(_ocOpt.sel[g.name]||[]).includes(o.name);return `<button class="pb-slot${on?" active":""}" onclick="ocToggleOpt('${esc(g.name).replace(/'/g,"\\'")}','${esc(o.name).replace(/'/g,"\\'")}',${g.max})">${esc(o.name)}${o.price?` +${zdMoney(o.price)}`:""}</button>`;}).join("")}</div></div>`).join("")}
    <div class="fgrp"><input class="inp" id="oc-opt-note" placeholder="${esc(t("rs_note_ph"))}" value="${esc(_ocOpt.note)}" oninput="_ocOpt.note=this.value"></div>
    <div style="display:flex;align-items:center;gap:10px"><button class="btn btn-o btn-sm" onclick="_ocOpt.qty=Math.max(1,_ocOpt.qty-1);ocRenderOptions()">−</button><b>${_ocOpt.qty}</b><button class="btn btn-o btn-sm" onclick="_ocOpt.qty++;ocRenderOptions()">+</button><div class="err-box" id="oc-opt-err" style="flex:1;margin:0"></div></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-oc-opt')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="ocConfirmOptions()"><i class="ti ti-plus"></i> ${esc(t("oc_add"))} · ${zdMoney(unit*_ocOpt.qty)}</button></div>`,460);
}
function ocToggleOpt(g,o,max){
  const arr=_ocOpt.sel[g]||[];
  if(arr.includes(o))_ocOpt.sel[g]=arr.filter(x=>x!==o);
  else if(max<=1)_ocOpt.sel[g]=[o];
  else if(arr.length<max)_ocOpt.sel[g]=[...arr,o];
  ocRenderOptions();
}
function ocConfirmOptions(){
  const it=_ocp.info.items[_ocOpt.id];
  const miss=it.modifiers.find(g=>(_ocOpt.sel[g.name]||[]).length<(g.min||0));
  if(miss){showErr("oc-opt-err",miss.name);return;}
  const mods=[];let extra=0;
  it.modifiers.forEach(g=>(_ocOpt.sel[g.name]||[]).forEach(o=>{mods.push({group:g.name,option:o});extra+=g.options.find(x=>x.name===o)?.price||0;}));
  const unit=Math.round((it.price+extra)*(1+(it.tax_rate||0)/100)*100)/100;
  const note=(_ocOpt.note||"").trim();
  ocAddLine({key:_ocOpt.id+"|"+JSON.stringify(mods)+"|"+note,id:_ocOpt.id,name:it.name,qty:_ocOpt.qty,unit_price:unit,total:Math.round(unit*_ocOpt.qty*100)/100,modifiers:mods,labels:mods.map(m=>m.option),note});
  zdCloseModal("modal-oc-opt");
}

// Boutique (commerce / pharmacie)
const _ocs={q:"",cat:""};
async function checkStoreView(){
  const slug=new URLSearchParams(window.location.search).get("store");if(!slug)return false;
  const v=ocPublicShell();
  try{_ocp.info=await ocFetch("GET",`/public/store/${encodeURIComponent(slug)}`);_ocp.kind="store";_ocp.slug=slug;_ocp.mode=_ocp.info.modes[0];}
  catch(e){v.innerHTML=`<div class="card" style="text-align:center;color:var(--red);margin:30px auto;max-width:480px">${esc(e.message)}</div>`;return true;}
  ocRenderStore();return true;
}
function ocPublicShell(){
  document.getElementById("auth-screen").style.display="none";const l=document.getElementById("landing");if(l)l.style.display="none";
  let v=document.getElementById("sector-public-view");if(!v){v=document.createElement("div");v.id="sector-public-view";v.className="pub-view";document.body.appendChild(v);}
  v.style.display="block";return v;
}
function ocHeader(d,emoji){
  return `<div style="text-align:center;margin:10px 0 16px">${d.logo_url?`<img src="${esc(d.logo_url)}" alt="" style="max-height:64px;max-width:180px;object-fit:contain;background:#fff;border-radius:8px;padding:4px">`:`<div style="font-size:34px">${emoji}</div>`}
    <div style="font-size:22px;font-weight:800;margin-top:6px">${esc(d.name||d.business||"")}</div>${d.description?`<div style="font-size:13px;color:var(--muted)">${esc(d.description)}</div>`:""}
    <div style="font-size:12px;color:var(--muted);margin-top:4px">${[d.address||d.business_address,d.phone||d.business_phone].filter(Boolean).map(esc).join(" · ")}</div></div>`;
}
function ocRenderStore(){
  const d=_ocp.info;const v=document.getElementById("sector-public-view");
  const cats=[...new Set(d.products.map(p=>p.category).filter(Boolean))];
  const q=_ocs.q.toLowerCase();
  const list=d.products.filter(p=>(!_ocs.cat||p.category===_ocs.cat)&&(!q||(p.name+" "+(p.dci||"")).toLowerCase().includes(q)));
  v.innerHTML=`<div style="max-width:900px;margin:0 auto;padding:16px 16px 90px">${ocHeader(d,d.pharmacy?"💊":"🛒")}
    ${d.message||d.delivery_info?`<div class="card oc-banner" style="margin-bottom:12px"><i class="ti ti-truck-delivery" style="font-size:22px;color:var(--green)"></i><div style="font-size:13px">${esc([d.message,d.delivery_info].filter(Boolean).join(" · "))}${d.min_order?` · ${esc(t("oc_min_order").replace("{v}",zdMoney(d.min_order)))}`:""}</div></div>`:""}
    <input class="inp" placeholder="${esc(t("oc_search"))}" value="${esc(_ocs.q)}" oninput="_ocs.q=this.value;clearTimeout(window._ocsT);window._ocsT=setTimeout(()=>{ocRenderStore();const i=document.querySelector('#sector-public-view input.inp');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},250)" style="margin-bottom:8px">
    ${cats.length>1?`<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px"><button class="pb-slot${!_ocs.cat?" active":""}" onclick="_ocs.cat='';ocRenderStore()">${esc(t("oc_all"))}</button>${cats.map(c=>`<button class="pb-slot${_ocs.cat===c?" active":""}" onclick="_ocs.cat='${esc(c).replace(/'/g,"\\'")}';ocRenderStore()">${esc(c)}</button>`).join("")}</div>`:""}
    <div class="oc-products">${list.map(p=>`<div class="card oc-prod${p.available?"":" oc-off"}">${p.image_url?`<img src="${esc(p.image_url)}" alt="" loading="lazy">`:`<div class="oc-ph"><i class="ti ti-${d.pharmacy?"pill":"package"}"></i></div>`}
      <div style="font-weight:700;font-size:14px">${esc(p.name)}</div>${p.dci?`<div style="font-size:11px;color:var(--muted)">${esc(p.dci)}</div>`:""}${p.rx?`<span class="badge ba" style="margin-top:3px">${esc(t("oc_rx_badge"))}</span>`:""}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:8px"><b class="mono">${zdMoney(p.price)}<span style="font-size:11px;color:var(--muted);font-weight:400"> / ${esc(p.unit)}</span></b>${p.available?`<button class="btn btn-g btn-sm" onclick="ocStoreAdd('${p.id}')"><i class="ti ti-plus"></i></button>`:`<span class="badge br">${esc(t("oc_unavailable"))}</span>`}</div>
      ${p.units.length?`<div style="font-size:11px;color:var(--muted);margin-top:4px">${p.units.map(u=>`${esc(u.name)} (${zdQty(u.factor)}) : ${zdMoney(u.price)}`).join(" · ")}</div>`:""}</div>`).join("")||zdEmpty(t("rt_no_products"))}</div>
    <div style="text-align:center;font-size:11px;color:var(--muted);margin:18px 0">Zenith Dash</div></div>`;
  ocRenderCartBar();
}
function ocStoreAdd(id){
  const p=_ocp.info.products.find(x=>x.id===id);if(!p)return;
  if(p.units.length){
    zdModal("modal-oc-opt",`<div class="modal-title">${esc(p.name)}</div><div class="fgrp"><label class="fl">${esc(t("oc_unit"))}</label><select class="inp" id="oc-unit"><option value="">${esc(p.unit)} — ${zdMoney(p.price)}</option>${p.units.map(u=>`<option value="${esc(u.name)}">${esc(u.name)} (${zdQty(u.factor)} ${esc(p.unit)}) — ${zdMoney(u.price)}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("zd_qty"))}</label><input class="inp" type="number" min="1" id="oc-qty" value="1"></div>
      <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-oc-opt')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="ocStoreAddUnit('${p.id}')"><i class="ti ti-plus"></i> ${esc(t("oc_add"))}</button></div>`,420);
    return;
  }
  ocAddLine({key:p.id+"|",id:p.id,name:p.name,qty:1,unit:null,unit_label:p.unit,unit_price:p.price,total:p.price,rx:p.rx});
}
function ocStoreAddUnit(id){
  const p=_ocp.info.products.find(x=>x.id===id);const un=zdVal("oc-unit");const qty=Math.max(1,parseInt(zdVal("oc-qty"))||1);
  const u=p.units.find(x=>x.name===un);const price=u?u.price:p.price;
  ocAddLine({key:p.id+"|"+un,id:p.id,name:p.name+(u?` — ${u.name}`:""),qty,unit:un||null,unit_label:u?u.name:p.unit,unit_price:price,total:Math.round(price*qty*100)/100,rx:p.rx});
  zdCloseModal("modal-oc-opt");
}

// Salon : forfaits et produits
async function ocLoadSalon(slug){
  try{_ocp.info=await ocFetch("GET",`/public/order/salon/${encodeURIComponent(slug)}`);_ocp.kind="salon";_ocp.slug=slug;_ocp.mode="pickup";}catch(_){_ocp.info=null;}
}
function ocSalonShopHtml(){
  const d=_ocp.info;if(_ocp.kind!=="salon"||!d||!d.enabled||(!d.packages?.length&&!d.products?.length))return "";
  return `<div class="card" style="margin-top:12px"><div style="font-weight:800;font-size:16px;margin-bottom:8px"><i class="ti ti-shopping-bag"></i> ${esc(t("oc_shop_title"))}</div>
    ${(d.packages||[]).map(p=>`<div style="padding:8px 0;border-bottom:1px solid var(--b)"><b>${esc(p.name)}</b><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${p.sizes.map(z=>`<button class="pb-slot" onclick="ocSalonAddPackage('${p.service_id}',${z.uses})">${esc(t("oc_package").replace("{n}",z.uses))} · <b>${zdMoney(z.price)}</b>${d.discount_pct?` <span style="color:var(--green)">${esc(t("oc_save_pct").replace("{p}",d.discount_pct))}</span>`:""}</button>`).join("")}</div></div>`).join("")}
    ${(d.products||[]).map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--b);${p.available?"":"opacity:.5"}"><span><b>${esc(p.name)}</b>${p.description?`<div style="font-size:11px;color:var(--muted)">${esc(p.description)}</div>`:""}</span><span style="display:flex;align-items:center;gap:8px"><b class="mono">${zdMoney(p.price)}</b>${p.available?`<button class="btn btn-g btn-sm" onclick="ocSalonAddProduct('${p.id}')"><i class="ti ti-plus"></i></button>`:""}</span></div>`).join("")}</div>`;
}
function ocSalonAddPackage(sid,uses){
  const p=_ocp.info.packages.find(x=>x.service_id===sid);const z=p.sizes.find(x=>x.uses===uses);
  ocAddLine({key:"pk|"+sid+"|"+uses,kind:"package",id:sid,uses,name:t("oc_package").replace("{n}",uses)+" — "+p.name,qty:1,unit_price:z.price,total:z.price});
}
function ocSalonAddProduct(id){const p=_ocp.info.products.find(x=>x.id===id);ocAddLine({key:"pr|"+id,kind:"product",id,name:p.name,qty:1,unit_price:p.price,total:p.price});}

// Validation du panier
function ocModes(){const i=_ocp.info||{};return _ocp.kind==="salon"?(i.modes||["pickup"]).filter(m=>m==="pickup"||_ocp.cart.some(l=>l.kind==="product")):(i.modes||[]);}
function ocOpenCheckout(){
  if(!_ocp.cart.length){showToast(t("oc_empty_cart"),"error");return;}
  const modes=ocModes();if(!modes.includes(_ocp.mode))_ocp.mode=modes[0];
  ocRenderCheckout();
}
let _ocForm={};
function ocKeepForm(){document.querySelectorAll("#modal-oc-checkout [data-k]").forEach(el=>{_ocForm[el.dataset.k]=el.type==="checkbox"?el.checked:el.value;});}
function ocRenderCheckout(){
  const i=_ocp.info;const mode=_ocp.mode;const modes=ocModes();
  const pay=(i.payment?.methods||[]).filter(m=>!(m==="cash"&&false));
  if(!pay.includes(_ocForm.method))_ocForm.method=pay[0];
  const sub=ocCartTotal();const fee=mode==="delivery"?(i.delivery_fee||0):0;
  const needRx=_ocp.kind==="store"&&i.pharmacy&&_ocp.cart.some(l=>l.rx);
  const noPay=mode==="table"||mode==="room";
  const f=k=>esc(_ocForm[k]||"");
  zdModal("modal-oc-checkout",`<div class="modal-title"><i class="ti ti-shopping-cart"></i> ${esc(t("oc_checkout_title"))}</div>
    <div style="max-height:200px;overflow:auto;margin-bottom:8px">${_ocp.cart.map((l,ix)=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--b)"><div style="flex:1;font-size:13px"><b>${esc(l.name)}</b>${l.labels?.length?`<div style="font-size:11px;color:var(--muted)">${l.labels.map(esc).join(", ")}</div>`:""}${l.note?`<div style="font-size:11px;color:var(--amber)">${esc(l.note)}</div>`:""}</div>
      ${l.kind==="package"?"":`<button class="btn btn-o btn-sm" onclick="ocKeepForm();ocQty(${ix},-1)">−</button><b>${zdQty(l.qty)}</b><button class="btn btn-o btn-sm" onclick="ocKeepForm();ocQty(${ix},1)">+</button>`}<b class="mono" style="min-width:64px;text-align:right">${zdMoney(l.total)}</b><button class="btn btn-o btn-sm" onclick="ocKeepForm();ocQty(${ix},-999)"><i class="ti ti-trash"></i></button></div>`).join("")}</div>
    ${modes.length>1?`<div style="font-weight:700;font-size:13px;margin:6px 0">${esc(t("oc_how"))}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${modes.map(m=>`<button class="pb-slot${m===mode?" active":""}" onclick="ocKeepForm();_ocp.mode='${m}';ocRenderCheckout()">${esc(m==="table"&&_ocp.table?t("oc_mode_table")+" "+_ocp.table.name:t("oc_mode_"+m))}</button>`).join("")}</div>`:`<div style="font-size:13px;margin-bottom:8px"><b>${esc(mode==="table"&&_ocp.table?t("oc_mode_table")+" "+_ocp.table.name:t("oc_mode_"+mode))}</b></div>`}
    ${mode==="table"?`<div style="font-size:12px;color:var(--muted);margin-bottom:6px">${esc(t("oc_table_hint"))}</div>`:""}
    <div style="font-weight:700;font-size:13px;margin:6px 0">${esc(t("oc_your_details"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("pb_name"))} *</label><input class="inp" id="oc-name" data-k="name" value="${f("name")}"></div><div class="fgrp"><label class="fl">${esc(t("pb_phone"))} *</label><input class="inp" id="oc-phone" data-k="phone" inputmode="tel" placeholder="+243 …" value="${f("phone")}"></div></div>
    ${mode==="room"?`<div class="grid2"><div class="fgrp"><label class="fl">${esc(t("oc_room_no"))} *</label><input class="inp" id="oc-room" data-k="room" value="${f("room")}"></div><div class="fgrp"><label class="fl">${esc(t("oc_booking_no"))}</label><input class="inp" id="oc-booking" data-k="booking" placeholder="RES-…" value="${f("booking")}"></div></div><div style="font-size:12px;color:var(--muted);margin-bottom:6px">${esc(t("oc_room_hint"))}</div>`:""}
    ${mode==="delivery"?`<div class="fgrp"><label class="fl">${esc(t("oc_address"))} *</label><textarea class="inp" id="oc-address" data-k="address" rows="2" placeholder="${esc(t("oc_address_ph"))}">${f("address")}</textarea></div>${i.delivery_info?`<div style="font-size:12px;color:var(--muted);margin:-4px 0 6px">${esc(i.delivery_info)}</div>`:""}`:""}
    ${(mode==="pickup"||mode==="delivery")&&_ocp.kind!=="salon"?`<div class="fgrp"><label class="fl">${esc(t("oc_when"))}</label><input class="inp" type="time" id="oc-when" data-k="when" value="${f("when")}"><div style="font-size:11px;color:${_ocp.kind==="resto"&&i.open_now===false?"var(--amber)":"var(--muted)"};margin-top:2px">${_ocp.kind==="resto"&&i.open_now===false?esc(t("oc_closed").replace("{o}",i.open).replace("{c}",i.close)):esc(t("oc_asap"))}</div></div>`:""}
    ${needRx?`<div class="card2" style="padding:10px;border-radius:10px;margin-bottom:8px"><div style="font-weight:700;font-size:13px"><i class="ti ti-prescription"></i> ${esc(t("oc_rx_title"))}</div><div style="font-size:12px;color:var(--muted);margin-bottom:6px">${esc(t("oc_rx_hint"))}</div>
      <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("oc_rx_patient"))} *</label><input class="inp" id="oc-rx-patient" data-k="rxp" value="${f("rxp")}"></div><div class="fgrp"><label class="fl">${esc(t("oc_rx_doctor"))} *</label><input class="inp" id="oc-rx-doctor" data-k="rxd" value="${f("rxd")}"></div><div class="fgrp"><label class="fl">${esc(t("oc_rx_age"))}</label><input class="inp" id="oc-rx-age" data-k="rxa" value="${f("rxa")}"></div></div>
      <div class="fgrp"><label class="fl">${esc(t("oc_rx_photo"))} *</label><input class="inp" type="file" accept="image/*" capture="environment" id="oc-rx-photo" onchange="ocRxPhoto(this)">${_ocForm.rxphoto?`<img src="${_ocForm.rxphoto}" alt="" style="max-height:90px;margin-top:6px;border-radius:6px">`:""}</div></div>`:""}
    ${noPay?"":`<div style="font-weight:700;font-size:13px;margin:6px 0">${esc(t("oc_pay_how"))}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${pay.map(m=>`<button class="pb-slot${m===_ocForm.method?" active":""}" onclick="ocKeepForm();_ocForm.method='${m}';ocRenderCheckout()"><i class="ti ti-${{cash:"cash",mobile_money:"device-mobile",bank:"building-bank"}[m]}"></i> ${esc(ocPayLabel(m,mode))}</button>`).join("")}</div>`}
    <div class="fgrp"><input class="inp" id="oc-note" data-k="note" placeholder="${esc(t("oc_note_ph"))}" value="${f("note")}"></div>
    <div style="border-top:1px solid var(--b);padding-top:8px;font-size:13px">${fee?`<div style="display:flex;justify-content:space-between"><span>${esc(t("oc_subtotal"))}</span><span class="mono">${zdMoney(sub)}</span></div><div style="display:flex;justify-content:space-between"><span>${esc(t("oc_delivery_fee"))}</span><span class="mono">${zdMoney(fee)}</span></div>`:""}<div style="display:flex;justify-content:space-between;font-weight:800;font-size:16px"><span>${esc(t("oc_total"))}</span><span class="mono">${zdMoney(sub+fee)}</span></div>
      ${i.min_order&&sub<i.min_order&&mode!=="table"&&mode!=="room"?`<div style="color:var(--amber);font-size:12px">${esc(t("oc_min_order").replace("{v}",zdMoney(i.min_order)))}</div>`:""}</div>
    <div class="err-box" id="oc-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="ocKeepForm();zdCloseModal('modal-oc-checkout')">${esc(t("btn_cancel"))}</button><button class="btn btn-g" id="oc-send" onclick="ocSubmit()"><i class="ti ti-send"></i> ${esc(t("oc_send_order"))}</button></div>`,560);
}
function ocQty(ix,d){const l=_ocp.cart[ix];if(!l)return;l.qty+=d;if(l.qty<=0||d===-999)_ocp.cart.splice(ix,1);else l.total=Math.round(l.qty*l.unit_price*100)/100;ocRenderCartBar();if(!_ocp.cart.length){zdCloseModal("modal-oc-checkout");return;}ocRenderCheckout();}
function ocRxPhoto(inp){
  const f=inp.files&&inp.files[0];if(!f)return;ocKeepForm();
  const img=new Image();const url=URL.createObjectURL(f);
  img.onload=()=>{const m=1600,sc=Math.min(1,m/Math.max(img.width,img.height));const cv=document.createElement("canvas");cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);_ocForm.rxphoto=cv.toDataURL("image/jpeg",0.82);URL.revokeObjectURL(url);ocRenderCheckout();};
  img.onerror=()=>showToast(t("error"),"error");img.src=url;
}
async function ocSubmit(){
  ocKeepForm();const mode=_ocp.mode;const i=_ocp.info;
  const need=[document.getElementById("oc-name"),document.getElementById("oc-phone")];
  if(mode==="delivery")need.push(document.getElementById("oc-address"));
  if(mode==="room")need.push(document.getElementById("oc-room"));
  const needRx=_ocp.kind==="store"&&i.pharmacy&&_ocp.cart.some(l=>l.rx);
  if(needRx)need.push(document.getElementById("oc-rx-patient"),document.getElementById("oc-rx-doctor"));
  const miss=need.filter(x=>x&&!x.value.trim());if(miss.length){flagMissingFields(miss);return;}
  if(needRx&&!_ocForm.rxphoto){showErr("oc-err",t("oc_rx_photo"));return;}
  const base={customer_name:_ocForm.name.trim(),phone:_ocForm.phone.trim(),address:mode==="delivery"?(_ocForm.address||"").trim():null,note:(_ocForm.note||"").trim()||null,
    payment_method:_ocForm.method||"cash",when:(mode==="pickup"||mode==="delivery")&&_ocForm.when?_ocForm.when:null,mode};
  let path,body;
  if(_ocp.kind==="resto"){path=`/public/order/resto/${encodeURIComponent(_ocp.slug)}`;body={...base,table_id:_ocp.table?.id||null,room_number:_ocForm.room||null,booking_number:_ocForm.booking||null,items:_ocp.cart.map(l=>({item_id:l.id,qty:l.qty,modifiers:l.modifiers||[],note:l.note||null}))};}
  else if(_ocp.kind==="store"){path=`/public/store/${encodeURIComponent(_ocp.slug)}/orders`;body={...base,items:_ocp.cart.map(l=>({product_id:l.id,qty:l.qty,unit:l.unit||null})),rx:needRx?{patient_name:_ocForm.rxp.trim(),doctor:_ocForm.rxd.trim(),age:(_ocForm.rxa||"").trim()||null,photo:_ocForm.rxphoto}:null};}
  else{path=`/public/order/salon/${encodeURIComponent(_ocp.slug)}`;body={...base,items:_ocp.cart.map(l=>l.kind==="package"?{kind:"package",service_id:l.id,uses:l.uses}:{kind:"product",product_id:l.id,qty:l.qty})};}
  const b=document.getElementById("oc-send");b.disabled=true;
  try{
    const r=await ocFetch("POST",path,body);
    ocRemember(r.token,r.number,r.business);_ocp.cart=[];ocRenderCartBar();zdCloseModal("modal-oc-checkout");
    if(r.whatsapp_url){try{sessionStorage.setItem("oc_wa_"+r.token,r.whatsapp_url);}catch(_){}}
    window.location.href=`${window.location.pathname}?order=${encodeURIComponent(r.token)}`;
  }catch(e){showErr("oc-err",e.message);b.disabled=false;}
}
function ocRemember(token,number,business){try{const l=JSON.parse(localStorage.getItem("zd_my_orders")||"[]").filter(x=>x.token!==token);l.unshift({token,number,business,at:Date.now()});localStorage.setItem("zd_my_orders",JSON.stringify(l.slice(0,20)));}catch(_){}}

// ── Suivi de commande (?order=) ──
let _oct=null,_octTimer=null;
async function checkOrderView(){
  const token=new URLSearchParams(window.location.search).get("order");if(!token)return false;
  const v=ocPublicShell();
  try{_oct=await ocFetch("GET",`/public/orders/${encodeURIComponent(token)}`);}catch(e){v.innerHTML=`<div class="card" style="text-align:center;color:var(--red);margin:30px auto;max-width:480px">${esc(e.message)}</div>`;return true;}
  ocRemember(_oct.token,_oct.number,_oct.business);
  ocRenderTrack();clearInterval(_octTimer);
  _octTimer=setInterval(async()=>{if(document.hidden||document.getElementById("oct-ref")===document.activeElement)return;try{const n=await ocFetch("GET",`/public/orders/${encodeURIComponent(token)}`);if(JSON.stringify(n)!==JSON.stringify(_oct)){_oct=n;ocRenderTrack();}}catch(_){}},15000);
  return true;
}
function ocSteps(o){
  if(o.channel==="deposit")return [["pending","oc_step_received"],["completed","oc_step_deposit"]];
  if(o.channel==="cold")return [["pending","oc_step_received"],["accepted","oc_step_accepted"],["completed","oc_step_done"]];
  const s=[["pending","oc_step_received"],["accepted","oc_step_accepted"]];
  if(o.mode!=="table"&&o.mode!=="room")s.push(["ready","oc_step_ready"]);
  if(o.mode==="delivery")s.push(["delivering","oc_step_delivering"]);
  s.push(["completed","oc_step_done"]);return s;
}
function ocTrackMsg(o){
  if(o.status==="rejected")return t("oc_track_rejected").replace("{r}",o.reject_reason||"");
  if(o.status==="cancelled")return t("oc_track_cancelled")+(o.reject_reason?" "+o.reject_reason:"");
  if(o.channel==="deposit")return o.status==="completed"?t("oc_track_deposit_done"):t("oc_track_deposit");
  if(o.status==="ready")return t(o.mode==="pickup"?"oc_track_ready_pickup":"oc_track_ready");
  return t("oc_track_"+o.status);
}
function ocRenderTrack(){
  const o=_oct;const v=document.getElementById("sector-public-view");const steps=ocSteps(o);
  const order=["pending","accepted","ready","delivering","completed"];const cur=order.indexOf(o.status);
  const bad=["rejected","cancelled"].includes(o.status);
  const p=o.payment||{};const due=["mobile_money","bank"].includes(o.payment_method)&&!["paid","refund_due","refunded"].includes(o.payment_status)&&!bad;
  let wa=null;try{wa=sessionStorage.getItem("oc_wa_"+o.token);}catch(_){}
  const ph=(o.business_phone||"").replace(/[^0-9+]/g,"");
  v.innerHTML=`<div style="max-width:620px;margin:0 auto;padding:16px">${ocHeader({name:o.business,logo_url:o.logo_url,address:o.business_address,phone:o.business_phone},o.channel==="deposit"?"🧾":"🛍️")}
    <div class="card" style="margin-bottom:12px;text-align:center"><div style="font-size:12px;color:var(--muted)">${esc(t("oc_track_title"))}</div><div class="mono" style="font-weight:800;font-size:18px">${esc(o.number)}</div>
      ${bad?`<div style="margin:12px 0;color:var(--red);font-weight:700"><i class="ti ti-circle-x" style="font-size:30px;display:block"></i>${esc(ocTrackMsg(o))}</div>`:`<div class="oc-steps">${steps.map(([k,l])=>{const i=order.indexOf(k);const done=i<=cur;return `<div class="oc-step${done?" done":""}${k===o.status?" cur":""}"><span>${done?'<i class="ti ti-check"></i>':""}</span><div>${esc(t(l))}</div></div>`;}).join("")}</div>
      <div style="font-weight:700;margin-top:8px">${esc(ocTrackMsg(o))}</div>`}
      ${o.extra?.staff_message?`<div style="font-size:13px;margin-top:6px;color:var(--green)">${esc(t("oc_staff_msg").replace("{m}",o.extra.staff_message))}</div>`:""}
      ${o.scheduled_for?`<div style="font-size:12px;color:var(--muted);margin-top:4px">${esc(t("oc_scheduled").replace("{h}",o.scheduled_for))}</div>`:""}</div>
    ${due?ocPayBox(o):""}
    ${!due&&o.channel!=="cold"?`<div class="card" style="margin-bottom:12px;font-size:13px">${o.payment_status==="paid"?`<b style="color:var(--green)">${esc(t("oc_pay_paid"))}</b>`:o.payment_status==="refund_due"?esc(t("oc_refund_due")):o.payment_method==="cash"?esc(t(o.mode==="delivery"?"oc_pay_at_delivery":"oc_pay_at_pickup").replace("{v}",zdMoney(o.total))):o.payment_method==="room"?esc(t("oc_pay_room_msg")):o.payment_method==="table"?esc(t("oc_pay_at_table")):""}</div>`:""}
    <div class="card" style="margin-bottom:12px">${ocItemsHtml(o.items)}${o.delivery_fee?`<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--muted)"><span>${esc(t("oc_delivery_fee"))}</span><span class="mono">${zdMoney(o.delivery_fee)}</span></div>`:""}${o.channel!=="cold"?`<div style="display:flex;justify-content:space-between;font-weight:800;margin-top:6px;border-top:1px solid var(--b);padding-top:6px"><span>${esc(t("oc_total"))}</span><span class="mono">${zdMoney(o.total)}</span></div>`:""}${o.address?`<div style="font-size:12px;color:var(--muted);margin-top:6px"><i class="ti ti-map-pin"></i> ${esc(o.address)}</div>`:""}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${ph?`<a class="btn btn-o btn-sm" href="tel:${esc(ph)}"><i class="ti ti-phone"></i> ${esc(t("oc_call"))}</a>`:""}${wa?`<a class="btn btn-o btn-sm" href="${esc(wa)}" target="_blank" rel="noopener" style="color:var(--green)"><i class="ti ti-brand-whatsapp"></i> ${esc(t("oc_whatsapp"))}</a>`:""}${o.can_cancel?`<button class="btn btn-o btn-sm" style="color:var(--red)" onclick="ocCancelMine()"><i class="ti ti-x"></i> ${esc(t("oc_cancel_mine"))}</button>`:""}</div>
    ${ocMyOrdersHtml(o.token)}
    <div style="text-align:center;font-size:11px;color:var(--muted);margin:18px 0">Zenith Dash</div></div>`;
}
function ocPayBox(o){
  const p=o.payment||{};const total=zdMoney(o.total);const ref=o.number;
  const methods=(p.methods||[]).filter(m=>m!=="cash"||(o.channel!=="deposit"&&o.status==="pending"));
  const copy=(v)=>`<button class="btn btn-o btn-sm" style="padding:2px 6px" onclick="ocCopy('${esc(v).replace(/'/g,"\\'")}')"><i class="ti ti-copy"></i></button>`;
  let inner="";
  if(o.payment_method==="mobile_money")inner=`<div style="font-size:13px;margin-bottom:8px">${esc(t("oc_pay_send").replace("{v}",total).replace("{n}",ref))}</div>${(p.mobile_accounts||[]).map(a=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px;border:1px solid var(--b);border-radius:8px;margin-bottom:6px"><span><b>${esc(a.provider_label)}</b><div class="mono">${esc(a.number)}</div><div style="font-size:11px;color:var(--muted)">${esc(a.name||"")}</div></span>${copy(a.number)}</div>`).join("")}`;
  else if(o.payment_method==="bank"&&p.bank)inner=`<div style="font-size:13px;margin-bottom:8px">${esc(t("oc_pay_bank_send").replace("{v}",total).replace("{n}",ref))}</div><div style="font-size:13px;border:1px solid var(--b);border-radius:8px;padding:8px">${[["oc_bank_holder",p.bank.holder],["oc_bank_name",p.bank.bank_name],["oc_bank_account",p.bank.account],["oc_iban",p.bank.iban],["oc_swift",p.bank.swift]].filter(x=>x[1]).map(([k,v])=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0"><span style="color:var(--muted)">${esc(t(k))}</span><span class="mono" style="text-align:right">${esc(v)} ${k==="oc_bank_holder"?"":copy(v)}</span></div>`).join("")}</div>`;
  const rej=o.extra?.payment_rejected;
  return `<div class="card" style="margin-bottom:12px;border-color:var(--amber)"><div style="font-weight:800;margin-bottom:6px"><i class="ti ti-cash"></i> ${esc(t("oc_pay_title"))} · <span class="mono">${total}</span></div>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:8px"><span>${esc(t("oc_ref"))} <b class="mono">${esc(ref)}</b></span>${copy(ref)}</div>
    ${inner}
    ${rej?`<div class="err-box" style="display:block">${esc(t("oc_pay_rejected").replace("{r}",rej))}</div>`:""}
    ${o.payment_status==="declared"?`<div style="font-size:13px;color:var(--blue);margin-top:8px"><i class="ti ti-clock"></i> ${esc(t("oc_pay_declared").replace("{r}",o.payment_ref||""))}</div>`:`
      <div class="fgrp" style="margin-top:8px"><label class="fl">${esc(t("oc_pay_ref"))} *</label><input class="inp mono" id="oct-ref" placeholder="${esc(t("oc_pay_ref_ph"))}"></div>
      ${o.payment_method==="mobile_money"?`<div class="fgrp"><label class="fl">${esc(t("oc_pay_payer"))}</label><input class="inp" id="oct-payer" inputmode="tel"></div>`:""}
      <div class="err-box" id="oct-err"></div><button class="btn btn-g" style="width:100%" id="oct-btn" onclick="ocDeclare()"><i class="ti ti-check"></i> ${esc(t("oc_i_paid"))}</button>`}
    ${methods.length>1&&o.payment_status!=="declared"?`<div style="margin-top:10px;font-size:12px"><span style="color:var(--muted)">${esc(t("oc_change_method"))} :</span> ${methods.filter(m=>m!==o.payment_method).map(m=>`<a href="#" onclick="ocChangeMethod('${m}');return false">${esc(ocPayLabel(m,o.mode))}</a>`).join(" · ")}</div>`:""}</div>`;
}
async function ocDeclare(){
  const r=document.getElementById("oct-ref");if(!r.value.trim()||r.value.trim().length<3){flagMissingFields([r]);return;}
  const b=document.getElementById("oct-btn");b.disabled=true;
  try{_oct=await ocFetch("POST",`/public/orders/${encodeURIComponent(_oct.token)}/payment`,{reference:r.value.trim(),payer:zdVal("oct-payer")||null,provider:_oct.payment_method==="mobile_money"?(_oct.payment?.mobile_accounts?.[0]?.provider||null):"bank"});ocRenderTrack();}
  catch(e){showErr("oct-err",e.message);b.disabled=false;}
}
async function ocChangeMethod(m){try{_oct=await ocFetch("POST",`/public/orders/${encodeURIComponent(_oct.token)}/method`,{method:m});ocRenderTrack();}catch(e){showToast(e.message,"error");}}
async function ocCancelMine(){if(!confirm(t("oc_cancel_confirm")))return;try{_oct=await ocFetch("POST",`/public/orders/${encodeURIComponent(_oct.token)}/cancel`);ocRenderTrack();}catch(e){showToast(e.message,"error");}}
function ocMyOrdersHtml(cur){
  let l=[];try{l=JSON.parse(localStorage.getItem("zd_my_orders")||"[]").filter(x=>x.token!==cur);}catch(_){}
  if(!l.length)return "";
  return `<div style="margin-top:18px"><div style="font-size:12px;color:var(--muted);margin-bottom:6px">${esc(t("oc_my_orders"))}</div>${l.slice(0,6).map(x=>`<a href="?order=${encodeURIComponent(x.token)}" class="card2" style="display:flex;justify-content:space-between;padding:8px 10px;border-radius:8px;margin-bottom:6px;text-decoration:none;color:var(--text);font-size:13px"><span>${esc(x.business||"")}</span><span class="mono">${esc(x.number)}</span></a>`).join("")}</div>`;
}

// ── Espace client chambre froide (portail) ──
let _occ=null,_occTok=null,_occEntry=[];
async function ocPortalCold(token,content){
  try{_occ=await ocFetch("GET",`/portal/${encodeURIComponent(token)}/cold`);}catch(_){return;}
  if(!_occ.enabled)return;_occTok=token;
  let box=document.getElementById("oc-portal-cold");if(!box){box=document.createElement("div");box.id="oc-portal-cold";content.prepend(box);}
  ocRenderPortalCold();
}
function ocRenderPortalCold(){
  const d=_occ;const box=document.getElementById("oc-portal-cold");if(!box)return;
  box.innerHTML=`<div style="font-weight:800;font-size:16px;margin:10px 0"><i class="ti ti-snowflake" style="color:#06b6d4"></i> ${esc(t("oc_cold_title"))}</div>
    ${d.lots.length?`<div style="overflow-x:auto"><table class="tbl" style="width:100%;font-size:13px"><thead><tr><th>${esc(t("oc_cold_product"))}</th><th>${esc(t("oc_cold_qty"))}</th><th>${esc(t("oc_cold_expiry"))}</th><th>${esc(t("oc_cold_room"))}</th></tr></thead><tbody>${d.lots.map(l=>`<tr><td><b>${esc(l.product)}</b><div style="font-size:11px;color:var(--muted)">${esc(l.number)}</div></td><td class="mono">${zdQty(l.qty)} ${esc(l.unit)}<div style="font-size:11px;color:var(--muted)">${zdQty(l.weight_kg)} ${esc(t("oc_kg"))} · ${zdQty(l.pallets)} ${esc(t("oc_pallets"))}</div></td><td>${l.expiry?`${esc(l.expiry)} <span class="badge ${l.days_left<0?"br":l.days_left<=7?"ba":"bg"}">${esc(t("oc_cold_days_left").replace("{d}",l.days_left))}</span>`:"—"}</td><td>${esc(l.room||"")}</td></tr>`).join("")}</tbody></table></div>`:`<div style="color:var(--muted);font-size:13px">${esc(t("oc_cold_none"))}</div>`}
    ${d.requests_enabled?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">${d.lots.length?`<button class="btn btn-g btn-sm" onclick="ocColdExitModal()"><i class="ti ti-truck-delivery"></i> ${esc(t("oc_cold_exit"))}</button>`:""}<button class="btn btn-o btn-sm" onclick="_occEntry=[{product:'',qty:'',unit:'carton',weight_kg:'',pallets:'',expiry:''}];ocColdEntryModal()"><i class="ti ti-truck"></i> ${esc(t("oc_cold_entry"))}</button></div>`:""}
    ${d.requests.length?`<div style="font-weight:700;margin:10px 0 6px">${esc(t("oc_cold_requests"))}</div>${d.requests.map(r=>`<a href="?order=${encodeURIComponent(r.token)}" class="card2" style="display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:8px;margin-bottom:6px;text-decoration:none;color:var(--text);font-size:13px"><span><b>${esc(t("oc_mode_"+r.kind))}</b> · ${esc(r.scheduled_for||"")}${r.doc_number?` · ${esc(r.doc_number)}`:""}</span><span class="badge ${r.status==="completed"?"bg":r.status==="rejected"||r.status==="cancelled"?"br":"ba"}">${esc(t("oc_st_"+r.status))}</span></a>`).join("")}`:""}
    <hr style="border:none;border-top:1px solid var(--b);margin:16px 0">`;
}
function ocColdCommon(){
  const tm=new Date();tm.setDate(tm.getDate()+1);
  return `<div class="grid2"><div class="fgrp"><label class="fl">${esc(t("oc_cold_day"))} *</label><input class="inp" type="date" id="occ-day" min="${isoDate(new Date())}" value="${isoDate(tm)}"></div><div class="fgrp"><label class="fl">${esc(t("oc_cold_time"))}</label><input class="inp" type="time" id="occ-time" value="08:00"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("oc_cold_vehicle"))}</label><input class="inp" id="occ-vehicle"></div><div class="fgrp"><label class="fl">${esc(t("oc_cold_driver"))}</label><input class="inp" id="occ-driver"></div></div>
    <div class="fgrp"><input class="inp" id="occ-note" placeholder="${esc(t("oc_note_ph"))}"></div>`;
}
function ocColdExitModal(){
  zdModal("modal-occ",`<div class="modal-title"><i class="ti ti-truck-delivery"></i> ${esc(t("oc_cold_exit"))}</div>
    ${_occ.lots.map(l=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--b);font-size:13px"><span><b>${esc(l.product)}</b><div style="font-size:11px;color:var(--muted)">${esc(l.number)} · ${zdQty(l.qty)} ${esc(l.unit)}</div></span><input class="inp" type="number" min="0" max="${l.qty}" step="any" style="width:90px" data-lot="${l.id}" placeholder="0"></div>`).join("")}
    ${ocColdCommon()}<div class="fgrp"><label class="fl">${esc(t("oc_cold_recipient"))}</label><input class="inp" id="occ-recipient"></div>
    <div class="err-box" id="occ-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-occ')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" id="occ-btn" onclick="ocColdSend('exit')"><i class="ti ti-send"></i> ${esc(t("oc_cold_send"))}</button></div>`,560);
}
function ocColdEntryModal(){
  zdModal("modal-occ",`<div class="modal-title"><i class="ti ti-truck"></i> ${esc(t("oc_cold_entry"))}</div>
    ${_occEntry.map((l,i)=>`<div class="card2" style="padding:8px;border-radius:8px;margin-bottom:6px"><div class="grid2"><div class="fgrp"><label class="fl">${esc(t("oc_cold_product"))} *</label><input class="inp" value="${esc(l.product)}" oninput="_occEntry[${i}].product=this.value"></div><div class="fgrp"><label class="fl">${esc(t("oc_cold_qty"))} *</label><input class="inp" type="number" min="0" step="any" value="${esc(l.qty)}" oninput="_occEntry[${i}].qty=this.value"></div></div>
      <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("oc_kg"))}</label><input class="inp" type="number" min="0" step="any" value="${esc(l.weight_kg)}" oninput="_occEntry[${i}].weight_kg=this.value"></div><div class="fgrp"><label class="fl">${esc(t("oc_pallets"))}</label><input class="inp" type="number" min="0" step="any" value="${esc(l.pallets)}" oninput="_occEntry[${i}].pallets=this.value"></div><div class="fgrp"><label class="fl">${esc(t("oc_cold_expiry"))}</label><input class="inp" type="date" value="${esc(l.expiry)}" oninput="_occEntry[${i}].expiry=this.value"></div></div></div>`).join("")}
    <button class="btn btn-o btn-sm" onclick="_occEntry.push({product:'',qty:'',unit:'carton',weight_kg:'',pallets:'',expiry:''});ocColdEntryModal()"><i class="ti ti-plus"></i> ${esc(t("oc_cold_add_line"))}</button>
    ${ocColdCommon()}<div class="err-box" id="occ-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-occ')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" id="occ-btn" onclick="ocColdSend('entry')"><i class="ti ti-send"></i> ${esc(t("oc_cold_send"))}</button></div>`,560);
}
async function ocColdSend(kind){
  const body={kind,day:zdVal("occ-day"),time:zdVal("occ-time")||null,vehicle:zdVal("occ-vehicle")||null,driver:zdVal("occ-driver")||null,note:zdVal("occ-note")||null,recipient:zdVal("occ-recipient")||null};
  if(kind==="exit"){body.exit_lines=[...document.querySelectorAll("#modal-occ [data-lot]")].map(i=>({lot_id:i.dataset.lot,qty:parseFloat(i.value)||0})).filter(x=>x.qty>0);if(!body.exit_lines.length){showErr("occ-err",t("oc_cold_pick"));return;}}
  else{body.entry_lines=_occEntry.filter(l=>l.product.trim()&&parseFloat(l.qty)>0).map(l=>({product:l.product.trim(),qty:parseFloat(l.qty),unit:l.unit||"carton",weight_kg:parseFloat(l.weight_kg)||0,pallets:parseFloat(l.pallets)||0,expiry:l.expiry||null}));if(!body.entry_lines.length){showErr("occ-err",t("oc_cold_pick"));return;}}
  const b=document.getElementById("occ-btn");b.disabled=true;
  try{await ocFetch("POST",`/portal/${encodeURIComponent(_occTok)}/cold/requests`,body);zdCloseModal("modal-occ");showToast(t("oc_cold_sent"));_occ=await ocFetch("GET",`/portal/${encodeURIComponent(_occTok)}/cold`);ocRenderPortalCold();}
  catch(e){showErr("occ-err",e.message);b.disabled=false;}
}
