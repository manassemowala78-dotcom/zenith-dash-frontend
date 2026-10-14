let _bkTab="agenda",_bkSettings=null,_bkServices=[],_bkWeekStart=null;
const BK_DAYS=[0,1,2,3,4,5,6];
function bkDayName(d){return t("bk_day_"+d);}
function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
async function loadBookingPage(){
  try{_bkSettings=await api("GET","/booking/settings");_bkServices=await api("GET","/booking/services");}catch(e){showToast(e.message,"error");return;}
  document.getElementById("bk-locked").style.display=_bkSettings.allowed?"none":"block";
  document.getElementById("bk-main").style.display=_bkSettings.allowed?"block":"none";
  if(!_bkWeekStart){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));_bkWeekStart=d;}
  showBookingTab(_bkTab);
}
function showBookingTab(tab){
  _bkTab=tab;
  document.querySelectorAll("[data-bktab]").forEach(b=>b.classList.toggle("active",b.dataset.bktab===tab));
  ["agenda","services","settings"].forEach(k=>{const el=document.getElementById(`bk-panel-${k}`);if(el)el.style.display=k===tab?"block":"none";});
  if(tab==="agenda")renderBookingAgenda();else if(tab==="services")renderBookingServices();else renderBookingSettings();
}
async function renderBookingAgenda(){
  const box=document.getElementById("bk-panel-agenda");
  const end=new Date(_bkWeekStart);end.setDate(end.getDate()+6);
  let list=[];try{list=await api("GET",`/booking/appointments?from=${isoDate(_bkWeekStart)}&to=${isoDate(end)}`);}catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;return;}
  const link=_bkSettings.public_url;
  const days=[...Array(7)].map((_,i)=>{const d=new Date(_bkWeekStart);d.setDate(d.getDate()+i);return d;});
  const stCls={booked:"bb",confirmed:"bg",done:"bp",no_show:"br",cancelled:"badge-gray"};
  box.innerHTML=`${_bkSettings.enabled?`<div class="card" style="margin-bottom:10px;padding:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px"><i class="ti ti-link" style="color:var(--green)"></i><span style="flex:1;min-width:0;word-break:break-all;font-family:var(--mono)">${esc(link)}</span>
      <button class="btn btn-o btn-sm" onclick="copyText('${esc(link)}')">${t("btn_copy")}</button><a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(t("bk_share_text")+" "+link)}"><i class="ti ti-brand-whatsapp"></i></a></div>`
      :`<div style="font-size:12px;color:var(--amber);margin-bottom:10px"><i class="ti ti-info-circle"></i> ${t("bk_closed_hint")}</div>`}
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><button class="btn btn-o btn-sm" onclick="bkWeek(-1)"><i class="ti ti-chevron-left"></i></button>
      <b style="flex:1;text-align:center">${fmtDate(_bkWeekStart.toISOString())} → ${fmtDate(end.toISOString())}</b><button class="btn btn-o btn-sm" onclick="bkWeek(1)"><i class="ti ti-chevron-right"></i></button>
      <button class="btn btn-g btn-sm" onclick="openManualAppointment()"><i class="ti ti-plus"></i> ${t("bk_new_appointment")}</button></div>
    ${days.map(d=>{const items=list.filter(a=>a.local_date===isoDate(d));return `<div class="bk-day"><div class="bk-day-head">${bkDayName((d.getDay()+6)%7)} ${d.getDate()}/${d.getMonth()+1}</div>
      ${items.map(a=>`<div class="bk-appt ${a.status}"><div style="font-family:var(--mono);font-weight:700;min-width:96px">${a.local_time}–${a.local_end}</div>
        <div style="flex:1;min-width:0"><b>${esc(a.customer_name)}</b> · ${esc(a.service||t("bk_no_service"))}<div style="font-size:11px;color:var(--muted)">${esc(a.customer_phone||"")}${a.source==="online"?` · ${t("bk_online")}`:""}${a.note?` · ${esc(a.note)}`:""}</div></div>
        <span class="badge ${stCls[a.status]||"bb"}">${t("bk_st_"+a.status)}</span>
        ${["booked","confirmed"].includes(a.status)?`<select class="inp" style="width:auto;padding:4px 6px;font-size:12px" onchange="setAppointmentStatus('${a.id}',this.value)"><option value="">⋯</option>${["confirmed","done","no_show","cancelled"].filter(s=>s!==a.status).map(s=>`<option value="${s}">${t("bk_st_"+s)}</option>`).join("")}</select>`:""}
        ${a.price&&!a.invoice_id&&a.status!=="cancelled"?`<button class="btn btn-o btn-sm" onclick="invoiceAppointment('${a.id}')" title="${t("bk_invoice")}"><i class="ti ti-file-invoice"></i></button>`:""}
        ${a.customer_phone?`<a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="https://wa.me/${(a.customer_phone||"").replace(/[^0-9]/g,"")}?text=${encodeURIComponent(t("bk_wa_client").replace("{name}",a.customer_name).replace("{date}",`${d.getDate()}/${d.getMonth()+1}`).replace("{time}",a.local_time))}"><i class="ti ti-brand-whatsapp"></i></a>`:""}</div>`).join("")||`<div style="font-size:12px;color:var(--muted);padding:4px 0">—</div>`}</div>`;}).join("")}`;
}
function bkWeek(n){_bkWeekStart.setDate(_bkWeekStart.getDate()+7*n);renderBookingAgenda();}
async function setAppointmentStatus(id,status){if(!status)return;try{await api("PATCH",`/booking/appointments/${id}`,{status});renderBookingAgenda();}catch(e){showToast(e.message,"error");}}
async function invoiceAppointment(id){try{const r=await api("POST",`/booking/appointments/${id}/invoice`);showToast(`${t("pd_invoice_created")} ${r.number} — ${fmtUSD(r.total)}`);renderBookingAgenda();}catch(e){showToast(e.message,"error");}}
function renderBookingServices(){
  const box=document.getElementById("bk-panel-services");
  box.innerHTML=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><input class="inp" id="bk-svc-name" placeholder="${t("bk_svc_name_ph")}" style="flex:2;min-width:150px">
      <input class="inp" id="bk-svc-dur" type="number" min="5" step="5" placeholder="${t("bk_minutes")}" style="width:100px"><input class="inp" id="bk-svc-price" type="number" min="0" step="0.5" placeholder="${t("th_price_short")}" style="width:100px">
      <button class="btn btn-g btn-sm" onclick="addBookingService()"><i class="ti ti-plus"></i> ${t("btn_add")}</button></div>
    ${_bkServices.map(s=>`<div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--b);font-size:13px;${s.active?"":"opacity:.5"}">
      <span style="flex:1"><b>${esc(s.name)}</b><div style="font-size:11px;color:var(--muted)">${s.duration_min} min${s.active?"":` · ${t("bk_archived")}`}</div></span><b style="font-family:var(--mono)">${fmtUSD(s.price)}</b>
      <button class="btn btn-sm btn-r" onclick="deleteBookingService('${s.id}')"><i class="ti ti-trash"></i></button></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${t("bk_no_services")}</div>`}`;
}
async function addBookingService(){
  const name=document.getElementById("bk-svc-name").value.trim();if(!name){flagMissingFields([document.getElementById("bk-svc-name")]);return;}
  try{await api("POST","/booking/services",{name,duration_min:parseInt(document.getElementById("bk-svc-dur").value||30),price:parseFloat(document.getElementById("bk-svc-price").value||0)});_bkServices=await api("GET","/booking/services");renderBookingServices();}
  catch(e){showToast(e.message,"error");}
}
async function deleteBookingService(id){if(!confirm(t("bk_confirm_delete_svc")))return;try{await api("DELETE",`/booking/services/${id}`);_bkServices=await api("GET","/booking/services");renderBookingServices();}catch(e){showToast(e.message,"error");}}
function renderBookingSettings(){
  const s=_bkSettings;const box=document.getElementById("bk-panel-settings");
  box.innerHTML=`<label style="display:flex;gap:10px;align-items:center;font-weight:700;margin-bottom:12px;cursor:pointer"><input type="checkbox" id="bk-enabled" ${s.enabled?"checked":""} style="width:20px;height:20px"> ${t("bk_enable")}</label>
    <div class="grid2"><div class="fgrp"><label class="fl">${t("bk_address")}</label><div style="display:flex;align-items:center;gap:4px"><span style="font-size:11px;color:var(--muted);font-family:var(--mono)">?book=</span><input class="inp" id="bk-slug" value="${esc(s.slug||"")}"></div></div>
      <div class="fgrp"><label class="fl">WhatsApp</label><input class="inp" id="bk-wa" value="${esc(s.whatsapp||"")}" placeholder="+243 …"></div></div>
    <div class="fgrp"><label class="fl">${t("bk_welcome")}</label><input class="inp" id="bk-welcome" value="${esc(s.welcome||"")}" maxlength="1000"></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${t("bk_slot")}</label><input class="inp" type="number" id="bk-slotmin" min="5" step="5" value="${s.slot_minutes}"></div>
      <div class="fgrp"><label class="fl">${t("bk_notice")}</label><input class="inp" type="number" id="bk-notice" min="0" step="0.5" value="${s.min_notice_hours}"></div>
      <div class="fgrp"><label class="fl">${t("bk_ahead")}</label><input class="inp" type="number" id="bk-ahead" min="1" value="${s.max_days_ahead}"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${t("bk_capacity")}</label><input class="inp" type="number" id="bk-capacity" min="1" max="50" value="${s.capacity}"></div>
      <div class="fgrp"><label class="fl">${t("bk_timezone")}</label><select class="inp" id="bk-tz">${[-300,-240,0,60,120,180].map(m=>`<option value="${m}" ${m===s.tz_offset_min?"selected":""}>UTC${m>=0?"+":"−"}${Math.abs(m)/60}${m===60?" (Kinshasa, Casablanca)":m===120?" (Lubumbashi)":""}</option>`).join("")}</select></div></div>
    <div style="font-weight:700;font-size:13px;margin:8px 0">${t("bk_hours")}</div>
    ${BK_DAYS.map(d=>{const r=(s.hours[String(d)]||[])[0];return `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap"><label style="width:110px;display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" class="bk-day-on" data-d="${d}" ${r?"checked":""}> ${bkDayName(d)}</label>
      <input class="inp bk-day-from" data-d="${d}" type="time" value="${r?r[0]:"08:00"}" style="width:auto"> → <input class="inp bk-day-to" data-d="${d}" type="time" value="${r?r[1]:"17:00"}" style="width:auto"></div>`;}).join("")}
    <button class="btn btn-g btn-sm" style="margin-top:8px" onclick="saveBookingSettings()"><i class="ti ti-check"></i> ${t("btn_save")}</button>`;
}
async function saveBookingSettings(){
  const hours={};
  BK_DAYS.forEach(d=>{const on=document.querySelector(`.bk-day-on[data-d="${d}"]`).checked;hours[String(d)]=on?[[document.querySelector(`.bk-day-from[data-d="${d}"]`).value,document.querySelector(`.bk-day-to[data-d="${d}"]`).value]]:[];});
  try{
    _bkSettings=await api("PUT","/booking/settings",{enabled:document.getElementById("bk-enabled").checked,slug:document.getElementById("bk-slug").value,whatsapp:document.getElementById("bk-wa").value||null,
      welcome:document.getElementById("bk-welcome").value||null,slot_minutes:parseInt(document.getElementById("bk-slotmin").value||30),min_notice_hours:parseFloat(document.getElementById("bk-notice").value||0),
      max_days_ahead:parseInt(document.getElementById("bk-ahead").value||30),capacity:parseInt(document.getElementById("bk-capacity").value||1),tz_offset_min:parseInt(document.getElementById("bk-tz").value),hours});
    showToast(t("bk_saved"));renderBookingSettings();
  }catch(e){showToast(e.message,"error");}
}
async function openManualAppointment(){
  populateClientSelect("ma-client");
  document.getElementById("ma-service").innerHTML=`<option value="">—</option>`+_bkServices.filter(s=>s.active).map(s=>`<option value="${s.id}">${esc(s.name)} (${s.duration_min} min)</option>`).join("");
  document.getElementById("ma-date").value=localDateInput(0);document.getElementById("ma-time").value="09:00";document.getElementById("ma-name").value="";document.getElementById("ma-note").value="";
  document.getElementById("modal-appointment").style.display="flex";
}
function closeManualAppointment(){document.getElementById("modal-appointment").style.display="none";}
async function submitManualAppointment(){
  try{
    await api("POST","/booking/appointments",{service_id:document.getElementById("ma-service").value||null,client_id:document.getElementById("ma-client").value||null,
      customer_name:document.getElementById("ma-name").value||null,date:document.getElementById("ma-date").value,time:document.getElementById("ma-time").value,note:document.getElementById("ma-note").value||null});
    closeManualAppointment();showToast(t("bk_appt_created"));renderBookingAgenda();
  }catch(e){showToast(e.message,"error");}
}
let _pb={slug:null,page:null,service:null,date:null,time:null};
async function checkBookingView(){
  const q=new URLSearchParams(window.location.search);const slug=q.get("book"),ctok=q.get("bookcancel");
  if(!slug&&!ctok)return false;
  document.getElementById("auth-screen").style.display="none";document.getElementById("landing").style.display="none";
  const v=document.getElementById("booking-view");v.style.display="block";
  if(ctok){await renderBookingCancel(ctok);return true;}
  _pb.slug=slug;
  try{const r=await fetch(`${API_BASE}/book/${encodeURIComponent(slug)}`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"Erreur");_pb.page=d;}
  catch(e){v.innerHTML=`<div class="card" style="text-align:center;color:var(--red);margin-top:30px">${esc(e.message)}</div>`;return true;}
  renderPublicBooking();return true;
}
function pbHeader(){const p=_pb.page;return `<div style="text-align:center;margin:10px 0 18px">${p.logo_url?`<img src="${esc(p.logo_url)}" alt="" style="max-height:60px;max-width:160px;object-fit:contain;background:#fff;border-radius:8px;padding:4px">`:`<div style="font-size:30px">📅</div>`}
  <div style="font-size:20px;font-weight:800;margin-top:6px">${esc(p.name)}</div>${p.address?`<div style="font-size:12px;color:var(--muted)">${esc(p.address)}</div>`:""}${p.welcome?`<div style="font-size:13px;margin-top:6px">${esc(p.welcome)}</div>`:""}</div>`;}
function renderPublicBooking(){
  const p=_pb.page;const v=document.getElementById("booking-view");
  const today=new Date(p.today+"T00:00:00");
  const days=[...Array(Math.min(p.max_days_ahead,21)+1)].map((_,i)=>{const d=new Date(today);d.setDate(d.getDate()+i);return d;}).filter(d=>p.open_days.includes((d.getDay()+6)%7));
  v.innerHTML=pbHeader()+`<div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">1. ${t("pb_choose_service")}</div>
      ${p.services.map(s=>`<button class="pb-opt${_pb.service===s.id?" active":""}" onclick="_pb.service='${s.id}';_pb.time=null;renderPublicBooking();loadPublicSlots()"><span><b>${esc(s.name)}</b><span style="display:block;font-size:11px;color:var(--muted)">${s.duration_min} min</span></span><b>${s.price?fmtUSD(s.price):""}</b></button>`).join("")}</div>
    ${_pb.service?`<div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">2. ${t("pb_choose_day")}</div><div class="pb-days">${days.map(d=>`<button class="pb-day${_pb.date===isoDate(d)?" active":""}" onclick="_pb.date='${isoDate(d)}';_pb.time=null;renderPublicBooking();loadPublicSlots()"><span>${bkDayName((d.getDay()+6)%7).slice(0,3)}</span><b>${d.getDate()}</b><span>${d.toLocaleDateString(State.lang==="ar"?"ar":State.lang,{month:"short"})}</span></button>`).join("")}</div></div>`:""}
    ${_pb.service&&_pb.date?`<div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">3. ${t("pb_choose_time")}</div><div id="pb-slots" class="pb-slots"><div style="color:var(--muted);font-size:13px">${t("loading")}</div></div></div>`:""}
    ${_pb.time?`<div class="card"><div style="font-weight:700;margin-bottom:8px">4. ${t("pb_your_details")}</div>
      <div class="fgrp"><label class="fl">${t("pb_name")} *</label><input class="inp" id="pb-name"></div>
      <div class="fgrp"><label class="fl">${t("pb_phone")} *</label><input class="inp" id="pb-phone" inputmode="tel" placeholder="+243 …"></div>
      <div class="fgrp"><label class="fl">${t("pb_email")}</label><input class="inp" id="pb-email" type="email"></div>
      <div class="fgrp"><label class="fl">${t("fld_notes")}</label><input class="inp" id="pb-note"></div>
      <button class="btn btn-g" style="width:100%;padding:12px" id="pb-submit" onclick="submitPublicBooking()"><i class="ti ti-check"></i> ${t("pb_confirm")} — ${_pb.time}</button></div>`:""}`;
  if(_pb.service&&_pb.date)loadPublicSlots();
}
async function loadPublicSlots(){
  const box=document.getElementById("pb-slots");if(!box)return;
  try{const r=await fetch(`${API_BASE}/book/${encodeURIComponent(_pb.slug)}/slots?service_id=${_pb.service}&date=${_pb.date}`);const d=await r.json();
    box.innerHTML=d.slots.length?d.slots.map(s=>`<button class="pb-slot${_pb.time===s?" active":""}" onclick="_pb.time='${s}';renderPublicBooking()">${s}</button>`).join(""):`<div style="color:var(--muted);font-size:13px">${t("pb_no_slots")}</div>`;}
  catch(_){box.innerHTML=`<div style="color:var(--red);font-size:13px">${t("backend_unreachable")}</div>`;}
}
async function submitPublicBooking(){
  const name=document.getElementById("pb-name"),phone=document.getElementById("pb-phone");
  const miss=[name,phone].filter(i=>!i.value.trim());if(miss.length){flagMissingFields(miss);return;}
  const btn=document.getElementById("pb-submit");btn.disabled=true;
  try{
    const r=await fetch(`${API_BASE}/book/${encodeURIComponent(_pb.slug)}/appointments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_id:_pb.service,date:_pb.date,time:_pb.time,
      customer_name:name.value.trim(),customer_phone:phone.value.trim(),customer_email:document.getElementById("pb-email").value.trim()||null,note:document.getElementById("pb-note").value.trim()||null})});
    const d=await r.json();if(!r.ok)throw new Error(typeof d.detail==="string"?d.detail:"Erreur");
    const v=document.getElementById("booking-view");
    v.innerHTML=pbHeader()+`<div class="card" style="text-align:center"><div style="font-size:42px">✅</div><div style="font-size:18px;font-weight:800;margin:6px 0">${t("pb_booked")}</div>
      <div style="font-size:14px">${esc(d.service)} · ${new Date(d.date+"T00:00:00").toLocaleDateString(State.lang==="ar"?"ar":State.lang,{weekday:"long",day:"numeric",month:"long"})} · <b>${d.time}</b></div>
      ${d.whatsapp_url?`<a class="btn btn-g" style="margin-top:14px;display:inline-flex" href="${esc(d.whatsapp_url)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> ${t("pb_confirm_whatsapp")}</a>`:""}
      <div style="font-size:12px;color:var(--muted);margin-top:14px">${t("pb_cancel_hint")}<br><a href="${esc(d.cancel_url)}" style="word-break:break-all">${esc(d.cancel_url)}</a></div></div>`;
  }catch(e){showToast(e.message,"error");btn.disabled=false;if(/disponible/.test(e.message)){_pb.time=null;renderPublicBooking();}}
}
async function renderBookingCancel(tok){
  const v=document.getElementById("booking-view");
  try{const r=await fetch(`${API_BASE}/book/cancel/${encodeURIComponent(tok)}`);const a=await r.json();if(!r.ok)throw new Error(a.detail||"Erreur");
    v.innerHTML=`<div style="text-align:center;margin:20px 0"><div style="font-size:30px">📅</div><div style="font-size:20px;font-weight:800">${esc(a.business)}</div></div>
      <div class="card" style="text-align:center"><div style="font-size:15px;font-weight:700">${esc(a.service||"")}</div><div style="margin:6px 0">${a.local_date} · <b>${a.local_time}</b></div><span class="badge ${a.status==="cancelled"?"badge-gray":"bg"}">${t("bk_st_"+a.status)}</span>
      ${a.can_cancel?`<div style="margin-top:14px"><button class="btn btn-r" onclick="confirmPublicCancel('${esc(tok)}')"><i class="ti ti-x"></i> ${t("pb_cancel_btn")}</button></div>`:a.status!=="cancelled"?`<div style="font-size:12px;color:var(--muted);margin-top:12px">${t("pb_cancel_too_late")}</div>`:""}</div>`;
  }catch(e){v.innerHTML=`<div class="card" style="text-align:center;color:var(--red);margin-top:30px">${esc(e.message)}</div>`;}
}
async function confirmPublicCancel(tok){
  if(!confirm(t("pb_cancel_confirm")))return;
  try{const r=await fetch(`${API_BASE}/book/cancel/${encodeURIComponent(tok)}`,{method:"POST"});const d=await r.json();if(!r.ok)throw new Error(d.detail||"Erreur");showToast(t("pb_cancelled"));renderBookingCancel(tok);}
  catch(e){showToast(e.message,"error");}
}
