// ── MODULE HÔTEL (9.0) ──
const _ht={front:null,planStart:null,types:null,rooms:null,settings:null,repFrom:null,repTo:null,q:""};
const HT_ROOM_COL={clean:"var(--green)",dirty:"var(--amber)",inspected:"var(--cyan)",out_of_order:"var(--red)"};
const HT_BK_COL={booked:"var(--blue)",checked_in:"var(--green)",checked_out:"var(--muted)",cancelled:"var(--red)",no_show:"var(--red)"};
function htAddDays(iso,n){const d=new Date(iso+"T00:00:00");d.setDate(d.getDate()+n);return isoDate(d);}
function htDate(iso){return new Date(iso+"T00:00:00").toLocaleDateString(State.lang==="ar"?"ar":State.lang,{day:"numeric",month:"short"});}
async function htTypes(force){if(!_ht.types||force)_ht.types=await api("GET","/hotel/room-types");return _ht.types;}

SECTOR_PAGE_LOADERS.hotelfront=async el=>{
  const f=await api("GET","/hotel/front");_ht.front=f;const st=f.stats;
  const card=(b,act)=>`<div class="ht-bk" onclick="htFolio('${b.id}')"><div style="flex:1;min-width:0"><b>${esc(b.guest_name)}</b> ${b.source==="online"?`<span class="badge bb">${esc(t("rs_online"))}</span>`:""}
      <div style="font-size:11px;color:var(--muted)">${esc(b.room?t("ht_room")+" "+b.room:b.type_name+" · "+t("ht_no_room"))} · ${htDate(b.check_in)} → ${htDate(b.check_out)} · ${b.nights} ${esc(t("ht_nights"))} · ${b.adults+b.children} ${esc(t("ht_pers"))}</div>
      ${b.folio?`<div style="font-size:11px">${esc(t("ht_balance"))} <b class="mono">${zdMoney(b.folio.estimated_balance)}</b></div>`:""}</div>${act||""}</div>`;
  el.innerHTML=sectorPageHead(esc(t("nav_hotel_front")),esc(t("ht_front_sub").replace("{in}",f.check_in_time).replace("{out}",f.check_out_time)),
    `<button class="btn btn-o btn-sm" onclick="htLinks()"><i class="ti ti-world"></i></button>${rsIsManager()?`<button class="btn btn-o btn-sm" onclick="htNightAudit()"><i class="ti ti-moon"></i> ${esc(t("ht_night_audit"))}</button>`:""}<button class="btn btn-g btn-sm" onclick="htBookingModal()"><i class="ti ti-plus"></i> ${esc(t("ht_new_booking"))}</button>`)+
    `<div class="kgrid" style="margin-bottom:12px"><div class="kpi g"><div class="kl">${esc(t("ht_occupancy"))}</div><div class="kv">${st.occupancy_pct} %</div><div style="font-size:11px;color:var(--muted)">${st.occupied}/${st.rooms} · ${st.guests} ${esc(t("ht_guests"))}</div></div>
      <div class="kpi b"><div class="kl">${esc(t("ht_arrivals"))}</div><div class="kv">${st.arrivals}</div></div><div class="kpi a"><div class="kl">${esc(t("ht_departures"))}</div><div class="kv">${st.departures}</div></div>
      <div class="kpi c"><div class="kl">${esc(t("ht_free"))}</div><div class="kv">${st.free}</div></div><div class="kpi r"><div class="kl">${esc(t("ht_dirty"))}</div><div class="kv">${st.dirty}</div></div></div>
    <div class="card" style="margin-bottom:12px"><input class="inp" placeholder="${esc(t("ht_search"))}" value="${esc(_ht.q)}" onchange="_ht.q=this.value;htSearch()"><div id="ht-search"></div></div>
    <div class="grid2"><div class="card"><b><i class="ti ti-door-enter"></i> ${esc(t("ht_arrivals_today"))}</b>${f.arrivals.map(b=>card(b,`<button class="btn btn-g btn-sm" onclick="event.stopPropagation();htCheckIn('${b.id}')">${esc(t("ht_check_in"))}</button>`)).join("")||zdEmpty(t("ht_none"))}</div>
      <div class="card"><b><i class="ti ti-door-exit"></i> ${esc(t("ht_departures_today"))}</b>${f.departures.map(b=>card(b,`<button class="btn btn-a btn-sm" onclick="event.stopPropagation();htCheckOut('${b.id}')">${esc(t("ht_check_out"))}</button>`)).join("")||zdEmpty(t("ht_none"))}</div>
      <div class="card"><b><i class="ti ti-bed"></i> ${esc(t("ht_inhouse"))} (${f.inhouse.length})</b>${f.inhouse.map(b=>card(b)).join("")||zdEmpty(t("ht_none"))}</div>
      <div class="card"><b><i class="ti ti-calendar"></i> ${esc(t("ht_upcoming"))}</b>${f.upcoming.map(b=>card(b)).join("")||zdEmpty(t("ht_none"))}</div></div>`;
  if(_ht.q)htSearch();
};
async function htSearch(){const box=document.getElementById("ht-search");if(!box)return;if(!_ht.q){box.innerHTML="";return;}
  const r=await api("GET",`/hotel/bookings?q=${encodeURIComponent(_ht.q)}`);
  box.innerHTML=r.slice(0,15).map(b=>`<div class="ht-bk" onclick="htFolio('${b.id}')"><span style="flex:1"><b>${esc(b.guest_name)}</b> <span class="mono" style="font-size:11px">${esc(b.number)}</span><div style="font-size:11px;color:var(--muted)">${esc(b.room||b.type_name||"")} · ${htDate(b.check_in)} → ${htDate(b.check_out)}</div></span><span class="badge" style="color:${HT_BK_COL[b.status]};border:1px solid ${HT_BK_COL[b.status]}">${esc(t("ht_bs_"+b.status))}</span></div>`).join("")||zdEmpty(t("ht_none"));}
async function htNightAudit(){if(!confirm(t("ht_audit_confirm")))return;try{const r=await api("POST","/hotel/night-audit");showToast(t("ht_audit_done").replace("{n}",r.nights_posted).replace("{x}",r.no_shows));navigate("hotelfront");}catch(e){showToast(e.message,"error");}}
async function htLinks(){const s=await api("GET","/hotel/settings");_ht.settings=s;
  zdModal("modal-ht-links",`<div class="modal-title"><i class="ti ti-world"></i> ${esc(t("ht_online_link"))}</div><div style="font-size:13px;margin-bottom:8px">${esc(t("ht_online_hint"))}</div>
    <div class="fgrp"><input class="inp" readonly value="${esc(s.booking_url)}" onclick="this.select()"></div><a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(t("ht_share_text")+" "+s.booking_url)}"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ht-links')">${esc(t("btn_close"))}</button></div>`,520);}

// ── Réservation ──
async function htBookingModal(id,pre){
  const types=await htTypes();const b=id?await api("GET",`/hotel/bookings/${id}`):null;pre=pre||{};
  const ci=b?.check_in||pre.check_in||zdToday(),co=b?.check_out||pre.check_out||htAddDays(ci,1);
  const cls=await cdClients().catch(()=>[]);
  zdModal("modal-ht-book",`<div class="modal-title"><i class="ti ti-calendar-plus" style="color:var(--blue)"></i> ${esc(t(b?"ht_edit_booking":"ht_new_booking"))}${b?` · <span class="mono">${esc(b.number)}</span>`:""}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("ht_guest"))} *</label><input class="inp" id="ht-b-name" value="${esc(b?.guest_name||"")}"></div><div class="fgrp"><label class="fl">${esc(t("pb_phone"))}</label><input class="inp" id="ht-b-phone" inputmode="tel" value="${esc(b?.phone||"")}" placeholder="+243 …"></div></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("ht_arrival"))} *</label><input class="inp" type="date" id="ht-b-ci" value="${ci}" ${b?.status==="checked_in"?"disabled":""} onchange="htAvail()"></div><div class="fgrp"><label class="fl">${esc(t("ht_departure"))} *</label><input class="inp" type="date" id="ht-b-co" value="${co}" onchange="htAvail()"></div>
      <div class="fgrp"><label class="fl">${esc(t("ht_adults_children"))}</label><div style="display:flex;gap:6px"><input class="inp" type="number" min="1" id="ht-b-ad" value="${b?.adults||1}"><input class="inp" type="number" min="0" id="ht-b-ch" value="${b?.children||0}"></div></div></div>
    ${b?"":`<div class="grid2"><div class="fgrp"><label class="fl">${esc(t("ht_category"))}</label><select class="inp" id="ht-b-type" onchange="htAvail()">${types.map(x=>`<option value="${x.id}"${pre.type_id===x.id?" selected":""}>${esc(x.name)} · ${zdMoney(x.base_rate)}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("ht_room"))}</label><select class="inp" id="ht-b-room" data-pre="${pre.room_id||""}"></select></div></div>`}
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("ht_rate"))}</label><input class="inp" type="number" min="0" step="0.01" id="ht-b-rate" value="${b?.rate??""}" placeholder="${esc(t("ht_rate_auto"))}"></div>
      <div class="fgrp"><label class="fl">${esc(t("ht_source"))}</label><select class="inp" id="ht-b-src">${["direct","phone","walk_in","online","agency","corporate"].map(s=>`<option value="${s}"${(b?.source||"direct")===s?" selected":""}>${esc(t("ht_src_"+s))}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("ht_company"))}</label><select class="inp" id="ht-b-client"><option value="">—</option>${cls.map(c=>`<option value="${c.id}"${b?.client_id===c.id?" selected":""}>${esc(c.name)}</option>`).join("")}</select></div></div>
    <label style="font-size:13px"><input type="checkbox" id="ht-b-bf" ${b?.breakfast?"checked":""}> ${esc(t("ht_breakfast"))}</label>
    ${b?"":`<div class="grid2" style="margin-top:8px"><div class="fgrp"><label class="fl">${esc(t("ht_deposit"))}</label><input class="inp" type="number" min="0" step="0.01" id="ht-b-dep"></div><div class="fgrp"><label class="fl">${esc(t("fld_payment_method"))}</label><select class="inp" id="ht-b-depm">${zdMethodOptions("cash")}</select></div></div>`}
    <div class="fgrp"><label class="fl">${esc(t("fld_notes"))}</label><input class="inp" id="ht-b-notes" value="${esc(b?.notes||"")}"></div>
    <div id="ht-b-avail" style="font-size:12px;color:var(--muted)"></div><div class="err-box" id="ht-b-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ht-book')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitHtBooking('${b?b.id:""}')">${esc(t("btn_save"))}</button></div>`,640);
  if(!b)htAvail();
}
async function htAvail(){
  const sel=document.getElementById("ht-b-room");if(!sel)return;
  const ci=zdVal("ht-b-ci"),co=zdVal("ht-b-co"),ty=zdVal("ht-b-type");if(!ci||!co||co<=ci){sel.innerHTML="";return;}
  try{const a=await api("GET",`/hotel/availability?check_in=${ci}&check_out=${co}`);const x=a.types.find(z=>z.id===ty);
    const pre=sel.dataset.pre;
    sel.innerHTML=`<option value="">${esc(t("ht_assign_later"))}</option>`+(x?x.rooms.map(r=>`<option value="${r.id}"${r.id===pre?" selected":""}>${esc(r.number)}${r.status==="dirty"?" ("+esc(t("ht_rs_dirty"))+")":""}</option>`).join(""):"");
    document.getElementById("ht-b-avail").textContent=x?t("ht_avail_info").replace("{n}",x.available).replace("{nights}",a.nights).replace("{total}",zdMoney(x.total)):"";}catch(_){}
}
async function submitHtBooking(id){
  const body={guest_name:zdVal("ht-b-name"),phone:zdVal("ht-b-phone")||null,check_out:zdVal("ht-b-co"),adults:parseInt(zdVal("ht-b-ad"))||1,children:parseInt(zdVal("ht-b-ch"))||0,
    breakfast:document.getElementById("ht-b-bf").checked,source:zdVal("ht-b-src"),notes:zdVal("ht-b-notes")||null,client_id:zdVal("ht-b-client")||null};
  if(!document.getElementById("ht-b-ci").disabled)body.check_in=zdVal("ht-b-ci");
  const rate=zdNum("ht-b-rate");if(rate!=null)body.rate=rate;
  if(!id){const room=zdVal("ht-b-room");if(room)body.room_id=room;else body.type_id=zdVal("ht-b-type");const dep=zdNum("ht-b-dep");if(dep){body.deposit=dep;body.deposit_method=zdVal("ht-b-depm");}}
  try{const b=await api(id?"PATCH":"POST",id?`/hotel/bookings/${id}`:"/hotel/bookings",body);zdCloseModal("modal-ht-book");showToast(t("ht_booking_saved").replace("{n}",b.number));htRefresh();}catch(e){showErr("ht-b-err",e.message);}
}
function htRefresh(){const act=document.querySelector(".page.active")?.id?.replace("page-","");if(act&&act.startsWith("hotel"))navigate(act);}

// ── Note de séjour ──
async function htFolio(id){
  const b=await api("GET",`/hotel/bookings/${id}`);_ht.bk=b;const f=b.folio;const mgr=rsIsManager();const active=["booked","checked_in"].includes(b.status);
  zdModal("modal-ht-folio",`<div class="modal-title"><i class="ti ti-file-text"></i> ${esc(b.guest_name)} · <span class="mono" style="font-size:13px">${esc(b.number)}</span> <span class="badge" style="margin-left:auto;color:${HT_BK_COL[b.status]};border:1px solid ${HT_BK_COL[b.status]}">${esc(t("ht_bs_"+b.status))}</span></div>
    <div style="font-size:13px;margin-bottom:10px">${esc(b.room?t("ht_room")+" "+b.room:t("ht_no_room"))} · ${esc(b.type_name||"")} · ${htDate(b.check_in)} → ${htDate(b.check_out)} (${b.nights} ${esc(t("ht_nights"))}) · ${zdMoney(b.rate)}/${esc(t("ht_night"))}
      ${b.phone?` · <a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>`:""}${b.breakfast?` · ${esc(t("ht_breakfast_short"))}`:""}${b.id_doc?` · ${esc(t("ht_id_doc"))} ${esc(b.id_doc)}`:""}</div>
    <div class="card2" style="padding:10px;border-radius:10px;max-height:260px;overflow:auto">${f.charges.map(c=>`<div style="display:flex;gap:8px;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--b)"><span>${htDate(c.day)} · ${esc(c.description)}${c.qty!==1?` (${zdQty(c.qty)} × ${zdMoney(c.unit_price)})`:""}</span><span style="white-space:nowrap"><b class="mono">${zdMoney(c.amount)}</b>${mgr&&b.status==="checked_in"&&c.kind!=="room"?` <button class="btn btn-o btn-sm" style="padding:1px 6px" onclick="htVoidCharge('${c.id}')"><i class="ti ti-x"></i></button>`:""}</span></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("ht_no_charges"))}</div>`}
      ${f.payments.map(p=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;color:var(--green)"><span>${esc(p.note||t("ht_payment"))} · ${esc(t("pay_method_"+p.method))}</span><b class="mono">−${zdMoney(p.amount)}</b></div>`).join("")}</div>
    <div class="rs-totals" style="margin-top:8px"><div><span>${esc(t("ht_posted"))}</span><span class="mono">${zdMoney(f.total)}</span></div><div><span>${esc(t("rs_paid"))}</span><span class="mono">${zdMoney(f.paid)}</span></div>
      ${f.unposted_nights?`<div style="color:var(--muted)"><span>${esc(t("ht_unposted").replace("{n}",f.unposted_nights))}</span><span class="mono">${zdMoney(f.estimated_total-f.total)}</span></div>`:""}
      <div class="rs-total"><span>${esc(t("ht_balance"))}</span><span class="mono">${zdMoney(f.estimated_balance)}</span></div></div>
    <div class="rs-more" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));margin-top:10px">
      ${b.status==="booked"?`<button class="btn btn-g" onclick="htCheckIn('${b.id}')"><i class="ti ti-door-enter"></i> ${esc(t("ht_check_in"))}</button>`:""}
      ${b.status==="checked_in"?`<button class="btn btn-a" onclick="htCheckOut('${b.id}')"><i class="ti ti-door-exit"></i> ${esc(t("ht_check_out"))}</button><button class="btn btn-o" onclick="htChargeModal('${b.id}')"><i class="ti ti-plus"></i> ${esc(t("ht_add_charge"))}</button>`:""}
      ${active?`<button class="btn btn-o" onclick="htPaymentModal('${b.id}')"><i class="ti ti-cash"></i> ${esc(t("ht_add_payment"))}</button><button class="btn btn-o" onclick="zdCloseModal('modal-ht-folio');htBookingModal('${b.id}')"><i class="ti ti-pencil"></i> ${esc(t("ht_modify"))}</button><button class="btn btn-o" onclick="htMoveModal('${b.id}')"><i class="ti ti-arrows-exchange"></i> ${esc(t("ht_move"))}</button>`:""}
      ${b.status==="booked"?`<button class="btn btn-o" onclick="htNoShow('${b.id}')"><i class="ti ti-user-off"></i> ${esc(t("ht_bs_no_show"))}</button><button class="btn btn-r" onclick="htCancel('${b.id}',${f.paid})"><i class="ti ti-x"></i> ${esc(t("ht_cancel"))}</button>`:""}
      ${b.invoice_id?`<button class="btn btn-o" onclick="openInvoiceDoc('${b.invoice_id}')"><i class="ti ti-file-invoice"></i> ${esc(t("ht_invoice"))}</button>`:""}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ht-folio')">${esc(t("btn_close"))}</button></div>`,640);
}
async function htCheckIn(id){
  const b=await api("GET",`/hotel/bookings/${id}`);let rooms=[];
  try{const a=await api("GET",`/hotel/availability?check_in=${b.check_in<zdToday()?zdToday():b.check_in}&check_out=${b.check_out}`);rooms=(a.types.find(x=>x.id===b.type_id)||{rooms:[]}).rooms;}catch(_){}
  const early=b.check_in>zdToday();
  zdModal("modal-ht-folio",`<div class="modal-title"><i class="ti ti-door-enter" style="color:var(--green)"></i> ${esc(t("ht_check_in"))} · ${esc(b.guest_name)}</div>
    ${early?`<div class="alert-bar" style="margin-bottom:8px"><i class="ti ti-alert-triangle"></i> ${esc(t("ht_early").replace("{d}",htDate(b.check_in)))}</div>`:""}
    <div class="fgrp"><label class="fl">${esc(t("ht_room"))} *</label><select class="inp" id="ht-ci-room">${b.room_id?`<option value="${b.room_id}">${esc(b.room)}</option>`:""}${rooms.filter(r=>r.id!==b.room_id).map(r=>`<option value="${r.id}">${esc(r.number)}${r.status==="dirty"?" ("+esc(t("ht_rs_dirty"))+")":""}</option>`).join("")}</select></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("ht_id_doc"))}</label><input class="inp" id="ht-ci-id" value="${esc(b.id_doc||"")}"></div><div class="fgrp"><label class="fl">${esc(t("ht_nationality"))}</label><input class="inp" id="ht-ci-nat" value="${esc(b.nationality||"")}"></div></div>
    <div class="err-box" id="ht-ci-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ht-folio')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitHtCheckIn('${id}',${early})">${esc(t("ht_check_in"))}</button></div>`,480);
}
async function submitHtCheckIn(id,early){
  const body={room_id:zdVal("ht-ci-room")||null,id_doc:zdVal("ht-ci-id")||null,nationality:zdVal("ht-ci-nat")||null,early};
  try{const r=await api("POST",`/hotel/bookings/${id}/check-in`,body);zdCloseModal("modal-ht-folio");showToast(t("ht_welcome").replace("{n}",r.guest_name).replace("{r}",r.room));if(r.warning)showToast(r.warning,"error");htRefresh();}catch(e){showErr("ht-ci-err",e.message);}
}
async function htCheckOut(id){
  const b=await api("GET",`/hotel/bookings/${id}`);const f=b.folio;
  zdModal("modal-ht-folio",`<div class="modal-title"><i class="ti ti-door-exit" style="color:var(--amber)"></i> ${esc(t("ht_check_out"))} · ${esc(b.guest_name)}</div>
    <div style="display:flex;justify-content:space-between;font-size:15px;margin-bottom:10px"><span>${esc(t("ht_balance"))}</span><b class="mono" style="font-size:22px">${zdMoney(f.estimated_balance)}</b></div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px">${esc(t("ht_checkout_hint"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_payment_method"))}</label><select class="inp" id="ht-co-m">${zdMethodOptions("cash")}</select></div><div class="fgrp"><label class="fl">${esc(t("pos_tendered"))}</label><input class="inp" type="number" min="0" step="0.01" id="ht-co-t"></div></div>
    ${b.client_id?`<label style="font-size:13px"><input type="checkbox" id="ht-co-acc"> ${esc(t("ht_on_account"))}</label>`:""}
    <div class="err-box" id="ht-co-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ht-folio')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitHtCheckOut('${id}')">${esc(t("ht_check_out"))}</button></div>`,460);
}
async function submitHtCheckOut(id){
  const body={method:zdVal("ht-co-m"),on_account:!!document.getElementById("ht-co-acc")?.checked};const tv=zdNum("ht-co-t");if(tv!=null)body.tendered=tv;
  try{const r=await api("POST",`/hotel/bookings/${id}/check-out`,body);zdCloseModal("modal-ht-folio");
    showToast(t("ht_checked_out").replace("{n}",r.number).replace("{v}",zdMoney(r.total))+(r.change!=null?` · ${t("pos_change")} ${zdMoney(r.change)}`:"")+(r.refund?` · ${t("ht_refund")} ${zdMoney(r.refund)}`:""));
    openInvoiceDoc(r.invoice_id);htRefresh();}catch(e){showErr("ht-co-err",e.message);}
}
function htChargeModal(id){
  zdModal("modal-ht-ch",`<div class="modal-title"><i class="ti ti-plus"></i> ${esc(t("ht_add_charge"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("ht_kind"))}</label><select class="inp" id="ht-c-kind">${["minibar","laundry","restaurant","bar","transport","phone","breakfast","other"].map(k=>`<option value="${k}">${esc(t("ht_k_"+k))}</option>`).join("")}</select></div><div class="fgrp"><label class="fl">${esc(t("rs_description"))} *</label><input class="inp" id="ht-c-desc"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("zd_qty"))}</label><input class="inp" type="number" min="1" id="ht-c-qty" value="1"></div><div class="fgrp"><label class="fl">${esc(t("fld_price"))} *</label><input class="inp" type="number" min="0" step="0.01" id="ht-c-price"></div></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ht-ch')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitHtCharge('${id}')">${esc(t("btn_add"))}</button></div>`,460);
}
async function submitHtCharge(id){try{await api("POST",`/hotel/bookings/${id}/charges`,{kind:zdVal("ht-c-kind"),description:zdVal("ht-c-desc"),qty:zdNum("ht-c-qty")||1,unit_price:zdNum("ht-c-price")||0});zdCloseModal("modal-ht-ch");htFolio(id);}catch(e){showToast(e.message,"error");}}
async function htVoidCharge(cid){if(!confirm(t("confirm_delete")))return;try{const b=await api("DELETE",`/hotel/charges/${cid}`);htFolio(b.id);}catch(e){showToast(e.message,"error");}}
function htPaymentModal(id){
  zdModal("modal-ht-ch",`<div class="modal-title"><i class="ti ti-cash"></i> ${esc(t("ht_add_payment"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("rs_amount"))} *</label><input class="inp" type="number" min="0" step="0.01" id="ht-p-amt"></div><div class="fgrp"><label class="fl">${esc(t("fld_payment_method"))}</label><select class="inp" id="ht-p-m">${zdMethodOptions("cash")}</select></div></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ht-ch')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitHtPayment('${id}')">${esc(t("btn_save"))}</button></div>`,440);
}
async function submitHtPayment(id){try{await api("POST",`/hotel/bookings/${id}/payments`,{amount:zdNum("ht-p-amt"),method:zdVal("ht-p-m")});zdCloseModal("modal-ht-ch");htFolio(id);}catch(e){showToast(e.message,"error");}}
async function htMoveModal(id){
  const b=_ht.bk;const a=await api("GET",`/hotel/availability?check_in=${b.check_in<zdToday()?zdToday():b.check_in}&check_out=${b.check_out}`);
  zdModal("modal-ht-ch",`<div class="modal-title"><i class="ti ti-arrows-exchange"></i> ${esc(t("ht_move"))}</div>${a.types.map(x=>`<div style="margin-bottom:8px"><b style="font-size:12px">${esc(x.name)}</b><div class="rs-steps" style="margin-top:4px">${x.rooms.map(r=>`<button class="toggle-btn" onclick="htDoMove('${id}','${r.id}')">${esc(r.number)}</button>`).join("")||`<span style="font-size:12px;color:var(--muted)">—</span>`}</div></div>`).join("")}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ht-ch')">${esc(t("btn_cancel"))}</button></div>`,480);
}
async function htDoMove(id,rid){try{await api("POST",`/hotel/bookings/${id}/move`,{room_id:rid});zdCloseModal("modal-ht-ch");htFolio(id);htRefresh();}catch(e){showToast(e.message,"error");}}
async function htNoShow(id){if(!confirm(t("ht_noshow_confirm")))return;try{await api("POST",`/hotel/bookings/${id}/no-show`);zdCloseModal("modal-ht-folio");htRefresh();}catch(e){showToast(e.message,"error");}}
async function htCancel(id,paid){
  const reason=prompt(t("ht_cancel_reason"));if(reason===null)return;
  const refund=paid>0?confirm(t("ht_refund_q").replace("{v}",zdMoney(paid))):false;
  try{const r=await api("POST",`/hotel/bookings/${id}/cancel`,{reason,refund});zdCloseModal("modal-ht-folio");showToast(t("ht_cancelled")+(r.retained?` · ${t("ht_retained")} ${zdMoney(r.retained)}`:""));htRefresh();}catch(e){showToast(e.message,"error");}
}

// ── Planning ──
SECTOR_PAGE_LOADERS.hotelplanning=async el=>{
  const days=window.innerWidth<=768?7:14;
  const p=await api("GET",`/hotel/planning?days=${days}${_ht.planStart?`&start=${_ht.planStart}`:""}`);_ht.plan=p;
  const n=p.days.length;
  el.innerHTML=sectorPageHead(esc(t("nav_hotel_planning")),esc(t("ht_plan_sub")),`<button class="btn btn-o btn-sm" onclick="_ht.planStart=htAddDays('${p.start}',-${days});navigate('hotelplanning')"><i class="ti ti-chevron-left"></i></button>
    <button class="btn btn-o btn-sm" onclick="_ht.planStart=null;navigate('hotelplanning')">${esc(t("today"))}</button><button class="btn btn-o btn-sm" onclick="_ht.planStart=htAddDays('${p.start}',${days});navigate('hotelplanning')"><i class="ti ti-chevron-right"></i></button>
    <button class="btn btn-g btn-sm" onclick="htBookingModal()"><i class="ti ti-plus"></i></button>`)+
    (p.unassigned.length?`<div class="alert-bar" style="margin-bottom:10px"><i class="ti ti-alert-triangle"></i> ${esc(t("ht_unassigned").replace("{n}",p.unassigned.length))} ${p.unassigned.map(b=>`<a href="#" onclick="event.preventDefault();htFolio('${b.id}')">${esc(b.guest_name)} (${htDate(b.check_in)})</a>`).join(", ")}</div>`:"")+
    `<div class="card" style="padding:8px;overflow-x:auto"><div class="ht-plan" style="grid-template-columns:70px repeat(${n},minmax(42px,1fr))">
      <div class="ht-ph"></div>${p.days.map(d=>`<div class="ht-ph${d===p.today?" today":""}">${new Date(d+"T00:00:00").toLocaleDateString(State.lang==="ar"?"ar":State.lang,{weekday:"short"}).slice(0,3)}<br><b>${d.slice(8)}</b></div>`).join("")}
      ${p.rooms.map((r,ri)=>`<div class="ht-pr" style="grid-row:${ri+2}"><b>${esc(r.number)}</b><span style="color:${HT_ROOM_COL[r.status]}">●</span><div style="font-size:9px;color:var(--muted)">${esc(r.type_name||"")}</div></div>
        ${p.days.map((d,di)=>`<div class="ht-pc${d===p.today?" today":""}" style="grid-row:${ri+2};grid-column:${di+2}" onclick="htBookingModal(null,{room_id:'${r.id}',type_id:'${r.type_id}',check_in:'${d}'})"></div>`).join("")}`).join("")}
      ${p.bookings.filter(b=>b.room_id&&b.span>0).map(b=>{const ri=p.rooms.findIndex(r=>r.id===b.room_id);if(ri<0)return"";return `<div class="ht-pb" style="grid-row:${ri+2};grid-column:${b.offset+2} / span ${b.span};background:${HT_BK_COL[b.status]}" onclick="htFolio('${b.id}')" title="${esc(b.guest_name)}">${esc(b.guest_name)}</div>`;}).join("")}
    </div></div><div class="rs-legend" style="margin-top:8px">${["booked","checked_in","checked_out"].map(s=>`<span><i style="background:${HT_BK_COL[s]}"></i>${esc(t("ht_bs_"+s))}</span>`).join("")}</div>`;
};

// ── Ménage ──
SECTOR_PAGE_LOADERS.hotelhk=async el=>{
  const rooms=await api("GET","/hotel/rooms");_ht.rooms=rooms;
  const floors=[...new Set(rooms.map(r=>r.floor||"—"))];
  el.innerHTML=sectorPageHead(esc(t("nav_hotel_hk")),esc(t("ht_hk_sub").replace("{n}",rooms.filter(r=>r.status==="dirty").length)))+
    `<div class="rs-legend">${Object.keys(HT_ROOM_COL).map(s=>`<span><i style="background:${HT_ROOM_COL[s]}"></i>${esc(t("ht_rs_"+s))}</span>`).join("")}</div>`+
    floors.map(f=>`<div class="card" style="margin-bottom:10px"><b>${esc(t("ht_floor"))} ${esc(f)}</b><div class="ht-hk">${rooms.filter(r=>(r.floor||"—")===f).map(r=>`<button class="ht-hkr" style="--c:${HT_ROOM_COL[r.status]}" onclick="htHkModal('${r.id}')">
      <b>${esc(r.number)}</b><span>${esc(t("ht_rs_"+r.status))}</span>${r.occupied?`<span class="badge bg">${esc(r.guest.departing_today?t("ht_departing"):t("ht_occupied"))}</span>`:r.arrival?`<span class="badge bb">${esc(t("ht_arriving"))}</span>`:""}${r.hk_note?`<span style="font-size:10px;color:var(--muted)">${esc(r.hk_note)}</span>`:""}</button>`).join("")}</div></div>`).join("");
};
function htHkModal(id){
  const r=_ht.rooms.find(x=>x.id===id);
  zdModal("modal-ht-hk",`<div class="modal-title"><i class="ti ti-bucket"></i> ${esc(t("ht_room"))} ${esc(r.number)}</div>
    <div class="rs-steps" style="margin-bottom:10px">${Object.keys(HT_ROOM_COL).map(s=>`<button class="toggle-btn${r.status===s?" active":""}" onclick="htSetHk('${id}','${s}')">${esc(t("ht_rs_"+s))}</button>`).join("")}</div>
    <div class="fgrp"><label class="fl">${esc(t("ht_hk_note"))}</label><input class="inp" id="ht-hk-note" value="${esc(r.hk_note||"")}" placeholder="${esc(t("ht_hk_note_ph"))}"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ht-hk')">${esc(t("btn_close"))}</button><button class="btn btn-g btn-sm" onclick="htSetHk('${id}','${r.status}')">${esc(t("btn_save"))}</button></div>`,460);
}
async function htSetHk(id,st){try{await api("PATCH",`/hotel/rooms/${id}/status`,{status:st,note:zdVal("ht-hk-note")});zdCloseModal("modal-ht-hk");navigate("hotelhk");}catch(e){showToast(e.message,"error");}}

// ── Chambres, tarifs, réglages ──
SECTOR_PAGE_LOADERS.hotelrooms=async el=>{
  const [types,rooms,s]=await Promise.all([htTypes(true),api("GET","/hotel/rooms"),api("GET","/hotel/settings")]);_ht.rooms=rooms;_ht.settings=s;const mgr=rsIsManager();
  el.innerHTML=sectorPageHead(esc(t("nav_hotel_rooms")),esc(t("ht_rooms_sub").replace("{n}",rooms.length).replace("{t}",types.length)),
    mgr?`<button class="btn btn-o btn-sm" onclick="htTypeModal()"><i class="ti ti-category"></i> ${esc(t("ht_new_type"))}</button><button class="btn btn-g btn-sm" onclick="htRoomModal()"><i class="ti ti-plus"></i> ${esc(t("ht_new_room"))}</button>`:"")+
    (!rooms.length&&mgr?`<div class="card" style="text-align:center;padding:22px;margin-bottom:12px">${zdEmpty(t("ht_no_rooms"),"bed")}<button class="btn btn-g btn-sm" onclick="htDemo()"><i class="ti ti-sparkles"></i> ${esc(t("welcome_load_demo"))}</button></div>`:"")+
    `<div class="grid2"><div class="card"><b>${esc(t("ht_categories"))}</b>${types.map(x=>`<div class="rs-mitem"><div style="flex:1"><b>${esc(x.name)}</b> <span style="font-size:11px;color:var(--muted)">${x.capacity} ${esc(t("ht_pers"))} · ${x.rooms} ${esc(t("ht_rooms_word"))}</span><div style="font-size:11px;color:var(--muted)">${(x.amenities||[]).map(esc).join(" · ")}</div></div><b class="mono">${zdMoney(x.base_rate)}</b>${mgr?`<button class="btn btn-o btn-sm" onclick="htTypeModal('${x.id}')"><i class="ti ti-pencil"></i></button>`:""}</div>`).join("")||zdEmpty(t("ht_none"))}</div>
      <div class="card"><b>${esc(t("nav_hotel_rooms"))}</b><div class="ht-hk">${rooms.map(r=>`<button class="ht-hkr" style="--c:${HT_ROOM_COL[r.status]}" ${mgr?`onclick="htRoomModal('${r.id}')"`:""}><b>${esc(r.number)}</b><span>${esc(r.type_name||"")}</span><span class="mono" style="font-size:11px">${zdMoney(r.rate)}</span></button>`).join("")}</div></div></div>
    ${mgr?`<div class="card" style="margin-top:12px"><b>${esc(t("ht_settings"))}</b><div class="grid3" style="margin-top:8px"><div class="fgrp"><label class="fl">${esc(t("ht_ci_time"))}</label><input class="inp" type="time" id="ht-s-ci" value="${s.check_in_time}"></div><div class="fgrp"><label class="fl">${esc(t("ht_co_time"))}</label><input class="inp" type="time" id="ht-s-co" value="${s.check_out_time}"></div>
      <div class="fgrp"><label class="fl">${esc(t("ht_city_tax"))}</label><input class="inp" type="number" min="0" step="0.1" id="ht-s-tax" value="${s.city_tax_per_night}"></div></div>
      <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("ht_breakfast_price"))}</label><input class="inp" type="number" min="0" step="0.5" id="ht-s-bf" value="${s.breakfast_price}"></div><div class="fgrp"><label class="fl">${esc(t("rs_slug"))}</label><input class="inp" id="ht-s-slug" value="${esc(s.slug||"")}"></div>
      <div class="fgrp"><label class="fl">${esc(t("ht_max_online"))}</label><input class="inp" type="number" min="1" id="ht-s-max" value="${s.max_online_nights}"></div></div>
      <label style="font-size:13px"><input type="checkbox" id="ht-s-online" ${s.online_booking?"checked":""}> ${esc(t("ht_online_booking"))}</label>
      <div style="margin-top:10px"><button class="btn btn-g btn-sm" onclick="submitHtSettings()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button></div></div>`:""}`;
};
async function htDemo(){try{await api("POST","/hotel/setup-demo");showToast(t("welcome_demo_done"));navigate("hotelfront");}catch(e){showToast(e.message,"error");}}
async function submitHtSettings(){const body={check_in_time:zdVal("ht-s-ci"),check_out_time:zdVal("ht-s-co"),city_tax_per_night:zdNum("ht-s-tax")||0,breakfast_price:zdNum("ht-s-bf")||0,max_online_nights:parseInt(zdVal("ht-s-max"))||30,online_booking:document.getElementById("ht-s-online").checked};
  const sl=zdVal("ht-s-slug");if(sl&&sl!==_ht.settings.slug)body.slug=sl;try{await api("PUT","/hotel/settings",body);showToast(t("rs_settings_saved"));}catch(e){showToast(e.message,"error");}}
function htTypeModal(id){
  const x=id?_ht.types.find(y=>y.id===id):null;
  zdModal("modal-ht-type",`<div class="modal-title"><i class="ti ti-category"></i> ${esc(t(x?"ht_edit_type":"ht_new_type"))}</div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("fld_name"))} *</label><input class="inp" id="ht-t-name" value="${esc(x?.name||"")}"></div><div class="fgrp"><label class="fl">${esc(t("ht_rate"))} *</label><input class="inp" type="number" min="0" step="0.01" id="ht-t-rate" value="${x?.base_rate??""}"></div><div class="fgrp"><label class="fl">${esc(t("ht_capacity"))}</label><input class="inp" type="number" min="1" id="ht-t-cap" value="${x?.capacity||2}"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("rs_description"))}</label><input class="inp" id="ht-t-desc" value="${esc(x?.description||"")}"></div>
    <div class="fgrp"><label class="fl">${esc(t("ht_amenities"))}</label><input class="inp" id="ht-t-am" value="${esc((x?.amenities||[]).join(", "))}" placeholder="Wi-Fi, Climatisation, TV"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ht-type')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitHtType('${x?x.id:""}')">${esc(t("btn_save"))}</button></div>`,520);
}
async function submitHtType(id){const body={name:zdVal("ht-t-name"),base_rate:zdNum("ht-t-rate"),capacity:parseInt(zdVal("ht-t-cap"))||2,description:zdVal("ht-t-desc")||null,amenities:zdVal("ht-t-am").split(",").map(s=>s.trim()).filter(Boolean)};
  try{await api(id?"PATCH":"POST",id?`/hotel/room-types/${id}`:"/hotel/room-types",body);zdCloseModal("modal-ht-type");navigate("hotelrooms");}catch(e){showToast(e.message,"error");}}
function htRoomModal(id){
  const r=id?_ht.rooms.find(x=>x.id===id):null;
  zdModal("modal-ht-room",`<div class="modal-title"><i class="ti ti-bed"></i> ${esc(t(r?"ht_edit_room":"ht_new_room"))}</div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("ht_number"))} *</label><input class="inp" id="ht-r-num" value="${esc(r?.number||"")}"></div><div class="fgrp"><label class="fl">${esc(t("ht_category"))} *</label><select class="inp" id="ht-r-type">${_ht.types.map(x=>`<option value="${x.id}"${r?.type_id===x.id?" selected":""}>${esc(x.name)}</option>`).join("")}</select></div><div class="fgrp"><label class="fl">${esc(t("ht_floor"))}</label><input class="inp" id="ht-r-floor" value="${esc(r?.floor||"")}"></div></div>
    <div class="modal-footer">${r?`<button class="btn btn-r btn-sm" style="margin-right:auto" onclick="htDeleteRoom('${r.id}')"><i class="ti ti-trash"></i></button>`:""}<button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ht-room')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitHtRoom('${r?r.id:""}')">${esc(t("btn_save"))}</button></div>`,500);
}
async function submitHtRoom(id){try{await api(id?"PATCH":"POST",id?`/hotel/rooms/${id}`:"/hotel/rooms",{number:zdVal("ht-r-num"),type_id:zdVal("ht-r-type"),floor:zdVal("ht-r-floor")||null});zdCloseModal("modal-ht-room");navigate("hotelrooms");}catch(e){showToast(e.message,"error");}}
async function htDeleteRoom(id){if(!confirm(t("confirm_delete")))return;try{await api("DELETE",`/hotel/rooms/${id}`);zdCloseModal("modal-ht-room");navigate("hotelrooms");}catch(e){showToast(e.message,"error");}}

// ── Rapport ──
SECTOR_PAGE_LOADERS.hotelreport=async el=>{
  const qs=new URLSearchParams();if(_ht.repFrom)qs.set("start",_ht.repFrom);if(_ht.repTo)qs.set("end",_ht.repTo);
  const r=await api("GET","/hotel/report?"+qs);
  el.innerHTML=sectorPageHead(esc(t("nav_hotel_report")),esc(t("ht_report_sub").replace("{n}",r.days)),`<input class="inp" type="date" value="${r.start}" style="width:auto" onchange="_ht.repFrom=this.value;navigate('hotelreport')"><input class="inp" type="date" value="${r.end}" style="width:auto" onchange="_ht.repTo=this.value;navigate('hotelreport')">`)+
    `<div class="kgrid"><div class="kpi g"><div class="kl">${esc(t("ht_occupancy"))}</div><div class="kv">${r.occupancy_pct} %</div><div style="font-size:11px;color:var(--muted)">${r.room_nights_sold}/${r.room_nights_available} ${esc(t("ht_nights"))}</div></div>
      <div class="kpi b"><div class="kl">${esc(t("ht_adr"))}</div><div class="kv">${zdMoney(r.adr)}</div></div><div class="kpi p"><div class="kl">RevPAR</div><div class="kv">${zdMoney(r.revpar)}</div></div>
      <div class="kpi c"><div class="kl">${esc(t("ht_total_revenue"))}</div><div class="kv">${zdMoney(r.total_revenue)}</div></div><div class="kpi a"><div class="kl">${esc(t("ht_avg_stay"))}</div><div class="kv">${r.avg_stay} ${esc(t("ht_nights"))}</div></div></div>
    <div class="grid2" style="margin-top:14px"><div class="card"><b>${esc(t("ht_by_kind"))}</b>${Object.entries(r.by_kind).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b)"><span>${esc(t("ht_k_"+k))}</span><b class="mono">${zdMoney(v)}</b></div>`).join("")||zdEmpty(t("rs_no_sales"))}</div>
      <div class="card"><b>${esc(t("ht_by_source"))}</b>${Object.entries(r.by_source).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b)"><span>${esc(t("ht_src_"+k))}</span><b>${v}</b></div>`).join("")||zdEmpty(t("ht_none"))}
        <div style="font-size:12px;color:var(--muted);margin-top:8px">${esc(t("ht_cancel_noshow").replace("{c}",r.cancelled).replace("{n}",r.no_shows))}</div></div></div>`;
};

// ── Réservation en ligne (page publique) ──
const _hp={};
async function checkHotelView(){
  const slug=new URLSearchParams(window.location.search).get("hotel");if(!slug)return false;
  document.getElementById("auth-screen").style.display="none";document.getElementById("landing").style.display="none";
  let v=document.getElementById("sector-public-view");if(!v){v=document.createElement("div");v.id="sector-public-view";v.className="pub-view";document.body.appendChild(v);}v.style.display="block";
  try{const r=await fetch(`${API_BASE}/public/hotel/${encodeURIComponent(slug)}`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"Erreur");Object.assign(_hp,{slug,data:d,ci:d.today,co:htAddDays(d.today,1),avail:null,type:null});}
  catch(e){v.innerHTML=`<div class="card" style="text-align:center;color:var(--red);margin:30px auto;max-width:480px">${esc(e.message)}</div>`;return true;}
  renderHotelPublic();return true;
}
function renderHotelPublic(){
  const d=_hp.data;const v=document.getElementById("sector-public-view");
  v.innerHTML=`<div style="max-width:720px;margin:0 auto;padding:16px"><div style="text-align:center;margin:10px 0 16px">${d.logo_url?`<img src="${esc(d.logo_url)}" alt="" style="max-height:64px;max-width:180px;object-fit:contain;background:#fff;border-radius:8px;padding:4px">`:`<div style="font-size:34px">🏨</div>`}
    <div style="font-size:22px;font-weight:800;margin-top:6px">${esc(d.name)}</div>${d.description?`<div style="font-size:13px;color:var(--muted)">${esc(d.description)}</div>`:""}<div style="font-size:12px;color:var(--muted);margin-top:4px">${d.address?esc(d.address)+" · ":""}${esc(t("ht_ci_time"))} ${esc(d.check_in_time)} · ${esc(t("ht_co_time"))} ${esc(d.check_out_time)}</div></div>
    <div class="card" style="margin-bottom:12px"><div class="grid2"><div class="fgrp"><label class="fl">${esc(t("ht_arrival"))}</label><input class="inp" type="date" min="${d.today}" value="${_hp.ci}" onchange="_hp.ci=this.value;if(_hp.co<=_hp.ci)_hp.co=htAddDays(_hp.ci,1);_hp.avail=null;renderHotelPublic()"></div><div class="fgrp"><label class="fl">${esc(t("ht_departure"))}</label><input class="inp" type="date" min="${htAddDays(_hp.ci,1)}" value="${_hp.co}" onchange="_hp.co=this.value;_hp.avail=null;renderHotelPublic()"></div></div>
      <button class="btn btn-g" style="width:100%" onclick="htPublicSearch()"><i class="ti ti-search"></i> ${esc(t("ht_pub_search"))}</button></div>
    <div id="hp-types">${d.types.map(x=>{const a=_hp.avail?.types.find(z=>z.id===x.id);return `<div class="card" style="margin-bottom:10px;${a&&!a.available?"opacity:.5":""}"><div style="display:flex;justify-content:space-between;gap:10px"><div><b style="font-size:16px">${esc(x.name)}</b><div style="font-size:12px;color:var(--muted)">${esc(x.description||"")} · ${x.capacity} ${esc(t("ht_pers"))}</div><div style="font-size:11px;color:var(--muted)">${(x.amenities||[]).map(esc).join(" · ")}</div></div>
      <div style="text-align:right"><b class="mono">${zdMoney(x.rate)}</b><div style="font-size:11px;color:var(--muted)">/ ${esc(t("ht_night"))}</div>${a?(a.available?`<div class="mono" style="font-weight:700">${zdMoney(a.total)} · ${_hp.avail.nights} ${esc(t("ht_nights"))}</div><button class="btn btn-g btn-sm" style="margin-top:6px" onclick="_hp.type='${x.id}';renderHotelPublic()">${esc(t("ht_pub_choose"))}</button>`:`<span class="badge br">${esc(t("ht_pub_full"))}</span>`):""}</div></div>
      ${_hp.type===x.id?`<div style="margin-top:10px;border-top:1px solid var(--b);padding-top:10px"><div class="grid2"><div class="fgrp"><label class="fl">${esc(t("pb_name"))} *</label><input class="inp" id="hp-name"></div><div class="fgrp"><label class="fl">${esc(t("pb_phone"))} *</label><input class="inp" id="hp-phone" inputmode="tel" placeholder="+243 …"></div></div>
        <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("pb_email"))}</label><input class="inp" id="hp-email" type="email"></div><div class="fgrp"><label class="fl">${esc(t("ht_adults"))}</label><input class="inp" type="number" min="1" max="${x.capacity+1}" id="hp-ad" value="1"></div><div class="fgrp"><label class="fl">${esc(t("ht_children"))}</label><input class="inp" type="number" min="0" id="hp-ch" value="0"></div></div>
        <div class="fgrp"><label class="fl">${esc(t("fld_notes"))}</label><input class="inp" id="hp-notes" placeholder="${esc(t("ht_pub_notes_ph"))}"></div><div class="err-box" id="hp-err"></div>
        <button class="btn btn-g" style="width:100%" id="hp-btn" onclick="submitHotelPublic()"><i class="ti ti-check"></i> ${esc(t("pb_confirm"))}</button></div>`:""}</div>`;}).join("")}</div>
    <div style="text-align:center;font-size:11px;color:var(--muted);margin:18px 0">Zenith Dash</div></div>`;
}
async function htPublicSearch(){try{const r=await fetch(`${API_BASE}/public/hotel/${encodeURIComponent(_hp.slug)}/availability?check_in=${_hp.ci}&check_out=${_hp.co}`);const d=await r.json();if(!r.ok)throw new Error(typeof d.detail==="string"?d.detail:"Erreur");_hp.avail=d;_hp.type=null;renderHotelPublic();}catch(e){showToast(e.message,"error");}}
async function submitHotelPublic(){
  const name=document.getElementById("hp-name"),phone=document.getElementById("hp-phone");const miss=[name,phone].filter(i=>!i.value.trim());if(miss.length){flagMissingFields(miss);return;}
  const btn=document.getElementById("hp-btn");btn.disabled=true;
  try{const r=await fetch(`${API_BASE}/public/hotel/${encodeURIComponent(_hp.slug)}/bookings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type_id:_hp.type,check_in:_hp.ci,check_out:_hp.co,name:name.value.trim(),phone:phone.value.trim(),email:zdVal("hp-email")||null,adults:parseInt(zdVal("hp-ad"))||1,children:parseInt(zdVal("hp-ch"))||0,notes:zdVal("hp-notes")||null})});
    const d=await r.json();if(!r.ok)throw new Error(typeof d.detail==="string"?d.detail:"Erreur");
    document.getElementById("hp-types").innerHTML=`<div class="card" style="text-align:center;padding:20px"><i class="ti ti-circle-check" style="font-size:42px;color:var(--green)"></i><div style="font-weight:800;font-size:18px;margin-top:6px">${esc(t("ht_pub_done"))}</div>
      <div style="margin-top:6px">${esc(d.type)} · ${htDate(d.check_in)} → ${htDate(d.check_out)} · ${d.nights} ${esc(t("ht_nights"))} · <b>${zdMoney(d.total)}</b></div><div class="mono" style="margin-top:4px">${esc(d.number)}</div><div style="font-size:12px;color:var(--muted);margin-top:6px">${esc(t("ht_pub_done_hint"))}</div>
      ${d.order_token?`<div style="margin-top:12px;color:var(--amber);font-weight:700">${esc(t("oc_deposit_due").replace("{v}",zdMoney(d.deposit)))}</div><a class="btn btn-g" style="margin-top:8px" href="?order=${encodeURIComponent(d.order_token)}"><i class="ti ti-cash"></i> ${esc(t("oc_pay_deposit"))}</a>`:""}</div>`;
    if(d.order_token&&typeof ocRemember==="function")ocRemember(d.order_token,d.number,d.name);}
  catch(e){showErr("hp-err",e.message);btn.disabled=false;}
}
