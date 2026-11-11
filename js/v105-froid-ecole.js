// ── 10.5.0 · Chambre froide, École, Garage ──
const V5_CD_COL={planned:"var(--blue)",on_road:"var(--amber)",delivered:"var(--green)",failed:"var(--red)",cancelled:"var(--muted)"};
SECTOR_PAGE_LOADERS.colddeliveries=async el=>{
  _v5.cds=_v5.cds||"open";const r=await api("GET",`/cold/deliveries?status=${_v5.cds}`);_v5.cd=r;
  el.innerHTML=v5Head(t("nav_v5_deliveries"),t("v5_cd_x"),["open","all"].map(s=>`<button class="toggle-btn${_v5.cds===s?" active":""}" onclick="_v5.cds='${s}';navigate('colddeliveries')">${esc(t("v5_ro_"+s))}</button>`).join("")+`<button class="btn btn-g btn-sm" onclick="v5CdModal()"><i class="ti ti-plus"></i> ${esc(t("v5_cd_new"))}</button>`)+
    (r.deliveries.length?`<div class="v5-cards">${r.deliveries.map(d=>`<div class="card" style="border-left:4px solid ${V5_CD_COL[d.status]}"><div style="display:flex;justify-content:space-between;gap:6px"><b>${esc(d.client||d.contact||"—")}</b><span class="mono" style="font-size:11px">${esc(d.number)}</span></div>
      <div style="font-size:13px">${esc(d.address)}</div><div style="font-size:12px;color:var(--muted)">${d.day?esc(v5Date(d.day))+" · ":""}${esc(t("v5_cds_"+d.status))}${d.driver?` · ${esc(d.driver)}`:""}${d.vehicle?` · ${esc(d.vehicle)}`:""}${d.doc_number?` · ${esc(d.doc_number)}`:""}</div>
      ${d.status==="delivered"?`<div style="font-size:12px;margin-top:4px;color:var(--green)">${esc(t("v5_received_by"))} ${esc(d.receiver||"")}${d.temp_at_delivery!=null?` · ${d.temp_at_delivery} °C`:""}</div>`:""}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${d.phone?`<a class="btn btn-o btn-sm" href="tel:${esc(d.phone)}" aria-label="${esc(t("v5_phone"))}"><i class="ti ti-phone"></i></a>`:""}
        ${d.status==="planned"?`<button class="btn btn-a btn-sm" onclick="v5CdSt('${d.id}','on_road')"><i class="ti ti-truck"></i> ${esc(t("v5_cds_on_road"))}</button>`:""}
        ${["planned","on_road"].includes(d.status)?`<button class="btn btn-g btn-sm" onclick="v5CdDone('${d.id}',${d.fee})"><i class="ti ti-check"></i> ${esc(t("v5_cds_delivered"))}</button><button class="btn btn-o btn-sm" onclick="v5CdSt('${d.id}','failed')">${esc(t("v5_cds_failed"))}</button>`:""}
        ${d.invoice_id?`<button class="btn btn-o btn-sm" onclick="openInvoiceDoc('${d.invoice_id}')"><i class="ti ti-file-invoice"></i></button>`:""}</div></div>`).join("")}</div>`:v5Empty("v5_cd_none","truck"));
};
async function v5CdModal(){
  const cl=await v5Clients();const ex=_v5.cd?.recent_exits||[];
  zdModal("modal-v5-cd",`<div class="modal-title"><i class="ti ti-truck" style="color:var(--green)"></i> ${esc(t("v5_cd_new"))}</div>
    <div class="fgrp"><label class="fl" for="v5-cd-d">${esc(t("v5_exit_doc"))}</label><select class="inp" id="v5-cd-d"><option value="">—</option>${ex.map(d=>`<option value="${esc(d.number)}">${esc(d.number)}${d.recipient?` · ${esc(d.recipient)}`:""}</option>`).join("")}</select></div>
    <div class="fgrp"><label class="fl" for="v5-cd-c">${esc(t("v5_client_opt"))}</label><select class="inp" id="v5-cd-c">${v5ClientOptions(cl)}</select></div>
    <div class="fgrp"><label class="fl" for="v5-cd-a">${esc(t("v5_address"))} *</label><input class="inp" id="v5-cd-a" maxlength="300"></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-cd-n">${esc(t("v5_contact"))}</label><input class="inp" id="v5-cd-n" maxlength="200"></div><div class="fgrp"><label class="fl" for="v5-cd-p">${esc(t("v5_phone"))}</label><input class="inp" id="v5-cd-p" type="tel" maxlength="50"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-cd-day">${esc(t("v5_date"))}</label><input class="inp" id="v5-cd-day" type="date" value="${zdToday()}"></div><div class="fgrp"><label class="fl" for="v5-cd-f">${esc(t("v5_delivery_fee"))}</label><input class="inp" id="v5-cd-f" type="number" min="0" step="0.01" value="0"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-cd-dr">${esc(t("v5_driver"))}</label><input class="inp" id="v5-cd-dr" maxlength="200"></div><div class="fgrp"><label class="fl" for="v5-cd-v">${esc(t("v5_vehicle"))}</label><input class="inp" id="v5-cd-v" maxlength="80"></div></div>
    <div class="err-box" id="v5-cd-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-cd')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5CdSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,480);
}
async function v5CdSave(){
  const b={doc_number:zdVal("v5-cd-d")||null,client_id:zdVal("v5-cd-c")||null,address:zdVal("v5-cd-a"),contact:zdVal("v5-cd-n")||null,phone:zdVal("v5-cd-p")||null,day:zdVal("v5-cd-day")||null,fee:zdNum("v5-cd-f")||0,driver:zdVal("v5-cd-dr")||null,vehicle:zdVal("v5-cd-v")||null};
  if(b.address.length<3){v5Err("v5-cd-err",t("v5_address"));return;}
  if(await v5Do(()=>api("POST","/cold/deliveries",b),t("v5_saved"),"v5-cd-err")){zdCloseModal("modal-v5-cd");navigate("colddeliveries");}
}
async function v5CdSt(id,s){if(await v5Do(()=>api("POST",`/cold/deliveries/${id}/status`,{status:s}),t("v5_saved")))navigate("colddeliveries");}
function v5CdDone(id,fee){
  zdModal("modal-v5-cdd",`<div class="modal-title"><i class="ti ti-check" style="color:var(--green)"></i> ${esc(t("v5_cds_delivered"))}</div>
    <div class="fgrp"><label class="fl" for="v5-cdd-r">${esc(t("v5_receiver"))} *</label><input class="inp" id="v5-cdd-r" maxlength="200"></div>
    <div class="fgrp"><label class="fl" for="v5-cdd-t">${esc(t("v5_temp_delivery"))}</label><input class="inp" id="v5-cdd-t" type="number" step="0.1"></div>
    ${fee>0?`<label class="terms-check"><input type="checkbox" id="v5-cdd-b" checked><span>${esc(t("v5_bill_fee").replace("{v}",zdMoney(fee)))}</span></label>`:""}
    <div class="err-box" id="v5-cdd-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-cdd')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5CdDoneGo('${id}')"><i class="ti ti-check"></i> ${esc(t("v5_validate"))}</button></div>`,400);
}
async function v5CdDoneGo(id){const r=zdVal("v5-cdd-r");if(!r){v5Err("v5-cdd-err",t("v5_receiver"));return;}
  if(await v5Do(()=>api("POST",`/cold/deliveries/${id}/status`,{status:"delivered",receiver:r,temp_at_delivery:zdNum("v5-cdd-t"),bill:!!document.getElementById("v5-cdd-b")?.checked}),t("v5_saved"),"v5-cdd-err")){zdCloseModal("modal-v5-cdd");navigate("colddeliveries");}}

// ── Plan des emplacements ──
SECTOR_PAGE_LOADERS.coldmap=async el=>{
  const r=await api("GET","/cold/map");_v5.cm=r;const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_map"),t("v5_map_x"),`<button class="btn btn-o btn-sm" onclick="v5Scan(v5MapScan,t('v5_scan'))"><i class="ti ti-scan"></i> ${esc(t("v5_place_lot"))}</button>`,"coldtools")+
    (r.rooms.length?r.rooms.map(rm=>{const aisles=[...new Set(rm.spots.map(s=>s.aisle))];
      return `<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><b><i class="ti ti-snowflake"></i> ${esc(rm.room)}</b><span style="font-size:12px;color:var(--muted)">${esc(t("v5_free_spots").replace("{a}",rm.free).replace("{b}",rm.total))}</span>
        ${mgr?`<span style="display:flex;gap:6px"><button class="btn btn-o btn-sm" onclick="v5SpotsModal('${rm.room_id}','${escJs(rm.room)}')"><i class="ti ti-layout-cards"></i> ${esc(t("v5_draw_map"))}</button>${rm.total?`<button class="btn btn-r btn-sm" aria-label="${esc(t("v5_clear_map"))}" onclick="v5SpotsClear('${rm.room_id}')"><i class="ti ti-trash"></i></button>`:""}</span>`:""}</div>
        ${rm.total?aisles.map(a=>`<div class="v5-aisle"><span>${esc(a)}</span><div class="v5-spots">${rm.spots.filter(s=>s.aisle===a).map(s=>`<button class="v5-spot ${s.used?(s.free?"part":"full"):""}" title="${esc(s.code)}${s.lots.length?" · "+esc(s.lots.map(l=>l.product+(l.owner?" ("+l.owner+")":"")).join(", ")):""}" onclick="v5SpotInfo('${rm.room_id}','${s.code}')">${esc(s.rack)}.${s.level}</button>`).join("")}</div></div>`).join("")
          :`<div style="font-size:12px;color:var(--muted);margin-top:6px">${esc(t("v5_map_empty"))}</div>`}
        ${rm.unplaced.length?`<div style="margin-top:8px;font-size:12px"><b>${esc(t("v5_unplaced"))}</b> ${rm.unplaced.map(l=>`<button class="btn btn-o btn-sm" style="margin:2px" onclick="v5PlaceModal('${l.id}','${escJs(l.number)}','${escJs(l.product)}','${rm.room_id}')">${esc(l.number)} · ${esc(l.product)}</button>`).join("")}</div>`:""}</div>`;}).join(""):v5Empty("v5_no_rooms","snowflake"));
};
function v5SpotInfo(rid,code){const rm=_v5.cm.rooms.find(x=>x.room_id===rid);const s=rm?.spots.find(x=>x.code===code);if(!s)return;
  zdModal("modal-v5-spot",`<div class="modal-title"><i class="ti ti-layout-board" style="color:var(--green)"></i> ${esc(rm.room)} · ${esc(code)}</div><div style="font-size:13px;margin-bottom:8px">${esc(t("v5_capacity"))} ${s.capacity} · ${esc(t("v5_used"))} ${s.used}</div>
    ${s.lots.length?s.lots.map(l=>`<div class="ht-bk" style="cursor:default"><span style="flex:1"><b class="mono">${esc(l.number)}</b> ${esc(l.product)}<div style="font-size:11px;color:var(--muted)">${esc(l.owner||"")}${l.expiry?` · ${esc(v5Date(l.expiry))}`:""}</div></span><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-spot');v5PlaceModal('${l.id}','${escJs(l.number)}','${escJs(l.product)}','${rid}')">${esc(t("v5_move"))}</button></div>`).join(""):zdEmpty(t("v5_spot_free"),"square")}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-spot')">${esc(t("btn_close"))}</button></div>`,440);}
function v5PlaceModal(lid,num,prod,rid){const rm=_v5.cm?.rooms.find(x=>x.room_id===rid);
  zdModal("modal-v5-pl",`<div class="modal-title"><i class="ti ti-map-pin" style="color:var(--green)"></i> ${esc(num)} · ${esc(prod)}</div>
    <div class="fgrp"><label class="fl" for="v5-pl-s">${esc(t("v5_spot"))}</label><select class="inp" id="v5-pl-s"><option value="">${esc(t("v5_no_spot"))}</option>${(rm?.spots||[]).filter(s=>s.free).map(s=>`<option value="${s.code}">${esc(s.code)} (${s.used}/${s.capacity})</option>`).join("")}</select></div>
    <div class="err-box" id="v5-pl-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-pl')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5PlaceGo('${lid}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,400);}
async function v5PlaceGo(lid){if(await v5Do(()=>api("PUT",`/cold/lots/${lid}/position`,{position:zdVal("v5-pl-s")||null}),t("v5_saved"),"v5-pl-err")){zdCloseModal("modal-v5-pl");navigate("coldmap");}}
async function v5MapScan(code){try{const l=await api("GET",`/cold/lots/lookup?code=${encodeURIComponent(code)}`);zdBeep();v5PlaceModal(l.id,l.number,l.product,l.room_id);}catch(e){showToast(e.message,"error");}}
function v5SpotsModal(rid,name){
  zdModal("modal-v5-sp",`<div class="modal-title"><i class="ti ti-layout-cards" style="color:var(--green)"></i> ${esc(t("v5_draw_map"))} · ${esc(name)}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(t("v5_draw_x"))}</div>
    <div class="fgrp"><label class="fl" for="v5-sp-a">${esc(t("v5_aisles"))}</label><input class="inp" id="v5-sp-a" value="A,B,C" placeholder="A,B,C"></div>
    <div class="grid3"><div class="fgrp"><label class="fl" for="v5-sp-r">${esc(t("v5_racks"))}</label><input class="inp" id="v5-sp-r" type="number" min="1" max="60" value="10"></div><div class="fgrp"><label class="fl" for="v5-sp-l">${esc(t("v5_levels"))}</label><input class="inp" id="v5-sp-l" type="number" min="1" max="10" value="3"></div>
      <div class="fgrp"><label class="fl" for="v5-sp-c">${esc(t("v5_pallets_per_spot"))}</label><input class="inp" id="v5-sp-c" type="number" min="0.1" max="100" step="0.1" value="1"></div></div>
    <div class="err-box" id="v5-sp-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-sp')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5SpotsGo('${rid}')"><i class="ti ti-check"></i> ${esc(t("v5_create"))}</button></div>`,440);}
async function v5SpotsGo(rid){const aisles=zdVal("v5-sp-a").split(/[,; ]+/).map(x=>x.trim()).filter(Boolean);if(!aisles.length){v5Err("v5-sp-err",t("v5_aisles"));return;}
  const r=await v5Do(()=>api("POST","/cold/spots/generate",{room_id:rid,aisles,racks:parseInt(zdVal("v5-sp-r"))||1,levels:parseInt(zdVal("v5-sp-l"))||1,capacity:zdNum("v5-sp-c")||1}),null,"v5-sp-err");
  if(r){showToast(t("v5_spots_made").replace("{n}",r.created));zdCloseModal("modal-v5-sp");navigate("coldmap");}}
async function v5SpotsClear(rid){if(!confirm(t("v5_clear_map_q")))return;if(await v5Do(()=>api("DELETE",`/cold/spots?room_id=${rid}`),t("v5_saved")))navigate("coldmap");}

// ── Étiquettes QR des lots et palettes ──
SECTOR_PAGE_LOADERS.coldlabels=async el=>{
  const r=await api("GET","/cold/lots?status=stored");const lots=r.lots||[];_v5.cl=lots;
  el.innerHTML=v5Head(t("v5_t_coldlabels"),t("v5_coldlabels_x"),`<button class="btn btn-o btn-sm" onclick="v5Scan(v5ColdFind,t('v5_scan'))"><i class="ti ti-scan"></i> ${esc(t("v5_scan_label"))}</button><button class="btn btn-g btn-sm" onclick="v5ColdLabels()"><i class="ti ti-printer"></i> ${esc(t("v5_print"))}</button>`,"coldtools")+
    `<div id="v5-cl-hit"></div>`+(lots.length?`<div class="card"><label class="terms-check"><input type="checkbox" onchange="document.querySelectorAll('[data-cl]').forEach(c=>c.checked=this.checked)"><span>${esc(t("v5_select_all"))}</span></label>
      ${lots.map(l=>`<label class="ht-bk" style="cursor:pointer"><input type="checkbox" data-cl="${l.id}"><span style="flex:1"><b class="mono">${esc(l.number)}</b> ${esc(l.product)} <small style="color:var(--muted)">${esc(l.client_name||l.owner||"")}${l.position?` · ${esc(l.position)}`:""}</small></span><span>${zdQty(l.pallets||0)} ${esc(t("v5_pallets"))}</span></label>`).join("")}</div>`:v5Empty("v5_nothing","qrcode"));
};
async function v5ColdFind(code){const box=document.getElementById("v5-cl-hit");try{const l=await api("GET",`/cold/lots/lookup?code=${encodeURIComponent(code)}`);zdBeep();
  box.innerHTML=`<div class="card2 v5-hit" style="margin-bottom:10px"><b class="mono">${esc(l.number)}</b> · ${esc(l.product)}<div style="font-size:13px">${esc(l.client_name||l.owner||"")} · ${zdQty(l.qty)} ${esc(l.unit||"")}${l.position?` · ${esc(t("v5_spot"))} ${esc(l.position)}`:""}${l.expiry?` · ${esc(v5Date(l.expiry))}`:""}</div></div>`;}catch(e){box.innerHTML=`<div class="card2" style="color:var(--red);margin-bottom:10px">${esc(e.message)}</div>`;}}
async function v5ColdLabels(){
  const ids=[...document.querySelectorAll("[data-cl]:checked")].map(c=>c.dataset.cl);if(!ids.length){showToast(t("v5_labels_none"),"error");return;}
  try{const r=await api("GET",`/cold/labels?ids=${ids.join(",")}`);
    v5Print(t("v5_t_coldlabels"),`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${r.labels.map(x=>`<div style="border:1px solid #333;border-radius:6px;padding:8px;display:flex;gap:8px;break-inside:avoid"><div style="width:90px;flex:none">${v5QrSvg(x.code,3)}</div>
      <div style="font-size:11px;line-height:1.4"><b style="font-size:13px">${esc(x.number)}</b> · ${esc(t("v5_pallet"))} ${esc(x.pallet)}<br><b>${esc(x.product)}</b><br>${esc(x.owner||"")}<br>${esc(x.room||"")}${x.position?" · "+esc(x.position):""}<br>${x.expiry?esc(t("v5_expiry"))+" "+esc(v5Date(x.expiry))+"<br>":""}${zdQty(x.qty)} ${esc(x.unit||"")}${x.weight_kg?" · "+zdQty(x.weight_kg)+" kg":""}<br><small>${esc(r.company)}</small></div></div>`).join("")}</div>`);
  }catch(e){showToast(e.message,"error");}
}

// ── Certificat de stockage ──
SECTOR_PAGE_LOADERS.coldcert=async el=>{
  const cl=await v5Clients(true);
  el.innerHTML=v5Head(t("v5_t_cert"),t("v5_cert_x"),"","coldtools")+
    `<div class="card"><div class="grid2"><div class="fgrp"><label class="fl" for="v5-ce-c">${esc(t("v5_client"))} *</label><select class="inp" id="v5-ce-c">${v5ClientOptions(cl)}</select></div><div class="fgrp"><label class="fl" for="v5-ce-d">${esc(t("v5_on_date"))}</label><input class="inp" id="v5-ce-d" type="date" value="${zdToday()}"></div></div>
      <div class="err-box" id="v5-ce-err"></div><button class="btn btn-g btn-sm" onclick="v5CertGo()"><i class="ti ti-certificate"></i> ${esc(t("v5_make_cert"))}</button></div>`;
};
async function v5CertGo(){
  const c=zdVal("v5-ce-c");if(!c){v5Err("v5-ce-err",t("v5_client"));return;}
  try{const r=await api("GET",`/cold/certificate?client_id=${c}&day=${zdVal("v5-ce-d")}`);
    v5Print(r.reference,v5DocHead(r.company,t("v5_cert_title"),r.reference)+`<p style="font-size:12px">${esc(t("v5_cert_text").replace("{c}",r.client.name).replace("{d}",v5Date(r.day)).replace("{s}",r.company?.name||""))}</p>`+
      v5DocTable([t("v5_lot"),t("v5_product"),t("v5_qty"),"kg",t("v5_pallets"),t("v5_room"),t("v5_spot"),t("v5_received"),t("v5_expiry")],r.rows.map(x=>[esc(x.number),esc(x.product),`${zdQty(x.qty)} ${esc(x.unit||"")}`,zdQty(x.weight_kg||0),zdQty(x.pallets||0),esc(x.room||""),esc(x.position||""),esc(fmtDate(x.received_at)),esc(v5Date(x.expiry))]))+
      `<div style="text-align:right;margin-top:8px;font-size:12px">${esc(t("v5_total"))} : ${zdQty(r.total_weight)} kg · ${zdQty(r.total_pallets)} ${esc(t("v5_pallets"))}</div><div style="margin-top:34px;display:flex;justify-content:space-between;font-size:11px"><span>${esc(t("v5_sign_manager"))}</span><span>${esc(t("v5_stamp"))}</span></div>`);
  }catch(e){v5Err("v5-ce-err",e);}
}

// ── École : rendez-vous parents ──
async function v5Sc(){if(!_v5.sct){[_v5.sct,_v5.scc]=await Promise.all([api("GET","/school/teachers"),api("GET","/school/classes")]);}return _v5.sct;}
SECTOR_PAGE_LOADERS.schoolmeetings=async el=>{
  await v5Sc();const rows=await api("GET","/school/meetings");const mgr=v5Mgr();
  const byDay={};rows.forEach(m=>{(byDay[m.day]=byDay[m.day]||[]).push(m);});
  el.innerHTML=v5Head(t("v5_t_meetings"),t("v5_meet_x"),mgr?`<button class="btn btn-g btn-sm" onclick="v5SlotsModal()"><i class="ti ti-plus"></i> ${esc(t("v5_slots_add"))}</button>`:"","schooltools")+
    (rows.length?Object.entries(byDay).map(([d,ms])=>`<div class="card" style="margin-bottom:10px"><b>${esc(v5Date(d))}</b>${ms.map(m=>`<div class="ht-bk" style="cursor:default"><span style="flex:1"><b>${esc(m.start)}–${esc(m.end)}</b> · ${esc(m.teacher||"")}${m.place?` · ${esc(m.place)}`:""}
      ${m.status==="booked"?`<div style="font-size:12px;color:var(--green)">${esc(m.parent_name||"")} · ${esc(m.student||"")}${m.subject?` — ${esc(m.subject)}`:""}</div>`:`<div style="font-size:12px;color:var(--muted)">${esc(t("v5_slot_free"))}</div>`}</span>
      ${mgr?`<button class="btn btn-o btn-sm" aria-label="${esc(t("btn_delete"))}" onclick="v5SlotDel('${m.id}',${m.status==="booked"})"><i class="ti ti-x"></i></button>`:""}</div>`).join("")}</div>`).join(""):v5Empty("v5_meet_none","calendar-user"))+
    `<div class="card2" style="margin-top:12px;font-size:12px;color:var(--muted)"><i class="ti ti-info-circle"></i> ${esc(t("v5_meet_how"))}</div>`;
};
function v5SlotsModal(){
  zdModal("modal-v5-sl",`<div class="modal-title"><i class="ti ti-calendar-event" style="color:var(--green)"></i> ${esc(t("v5_slots_add"))}</div>
    <div class="fgrp"><label class="fl" for="v5-sl-t">${esc(t("v5_teacher"))} *</label><select class="inp" id="v5-sl-t">${(_v5.sct||[]).filter(x=>x.active).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>
    <div class="grid3"><div class="fgrp"><label class="fl" for="v5-sl-d">${esc(t("v5_date"))}</label><input class="inp" id="v5-sl-d" type="date" value="${zdToday()}"></div><div class="fgrp"><label class="fl" for="v5-sl-a">${esc(t("v5_from"))}</label><input class="inp" id="v5-sl-a" type="time" value="14:00"></div><div class="fgrp"><label class="fl" for="v5-sl-b">${esc(t("v5_to"))}</label><input class="inp" id="v5-sl-b" type="time" value="16:00"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-sl-m">${esc(t("v5_slot_minutes"))}</label><input class="inp" id="v5-sl-m" type="number" min="5" max="120" value="15"></div><div class="fgrp"><label class="fl" for="v5-sl-p">${esc(t("v5_place"))}</label><input class="inp" id="v5-sl-p" maxlength="120"></div></div>
    <div class="err-box" id="v5-sl-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-sl')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5SlotsGo()"><i class="ti ti-check"></i> ${esc(t("v5_create"))}</button></div>`,460);
}
async function v5SlotsGo(){if(!zdVal("v5-sl-t")){v5Err("v5-sl-err",t("v5_teacher"));return;}const r=await v5Do(()=>api("POST","/school/meetings/slots",{teacher_id:zdVal("v5-sl-t"),day:zdVal("v5-sl-d"),start:zdVal("v5-sl-a"),end:zdVal("v5-sl-b"),minutes:parseInt(zdVal("v5-sl-m"))||15,place:zdVal("v5-sl-p")||null}),null,"v5-sl-err");
  if(r){showToast(t("v5_slots_made").replace("{n}",r.created));zdCloseModal("modal-v5-sl");navigate("schoolmeetings");}}
async function v5SlotDel(id,booked){if(!confirm(t(booked?"v5_slot_del_booked_q":"v5_slot_del_q")))return;if(await v5Do(()=>api("DELETE",`/school/meetings/${id}`),t("v5_saved")))navigate("schoolmeetings");}

// ── Cantine prépayée ──
SECTOR_PAGE_LOADERS.schoolcanteen=async el=>{
  await v5Sc();const [w,x]=await Promise.all([api("GET",`/school/wallet${_v5.scl?`?class_id=${_v5.scl}`:""}`),api("GET","/school/extras")]);_v5.sw=w;const mgr=v5Mgr();
  _sc.set=_sc.set||{currency:x.currency};const list=w.students;
  el.innerHTML=v5Head(t("v5_t_canteen"),t("v5_canteen_x").replace("{p}",scMoney(w.meal_price)),(mgr?`<button class="btn btn-o btn-sm" onclick="v5CanteenCfg()"><i class="ti ti-settings"></i></button>`:"")+`<button class="btn btn-o btn-sm" onclick="v5Scan(v5CanteenScan,t('v5_scan'))"><i class="ti ti-scan"></i> ${esc(t("v5_scan_card"))}</button>`,"schooltools")+
    `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><select class="inp" style="width:auto" aria-label="${esc(t("v5_class"))}" onchange="_v5.scl=this.value;navigate('schoolcanteen')"><option value="">${esc(t("v5_all_classes"))}</option>${(_v5.scc||[]).map(c=>`<option value="${c.id}"${_v5.scl===c.id?" selected":""}>${esc(c.name)}</option>`).join("")}</select>
      <input class="inp" style="flex:1;min-width:160px" placeholder="${esc(t("v5_find_student"))}" aria-label="${esc(t("v5_find_student"))}" value="${esc(_v5.swq||"")}" oninput="_v5.swq=this.value;clearTimeout(_v5.swt);_v5.swt=setTimeout(()=>v5CanteenFilter(),250)"></div>
    <div class="v5-kpis">${v5Kpi(t("v5_ate_today"),w.students.filter(s=>s.ate_today).length+" / "+w.students.length)}${v5Kpi(t("v5_low_balance"),w.students.filter(s=>s.balance<w.meal_price).length,"var(--amber)")}</div>`+
    (list.length?`<div class="card" style="margin-top:12px">${list.map(s=>`<div class="ht-bk v5-cs" data-n="${esc((s.name+" "+(s.matricule||"")+" "+(s.class_name||"")).toLowerCase())}" style="cursor:default;flex-wrap:wrap"><span style="flex:1;min-width:150px"><b>${esc(s.name)}</b> <small style="color:var(--muted)">${esc(s.class_name||"")}</small><div style="font-size:12px;color:${s.balance<w.meal_price?"var(--red)":"var(--muted)"}">${esc(t("v5_balance"))} ${scMoney(s.balance)}</div></span>
      <span style="display:flex;gap:6px">${s.ate_today?`<span class="badge bg">${esc(t("v5_ate"))}</span>`:`<button class="btn btn-g btn-sm" onclick="v5Meal('${s.id}')"><i class="ti ti-tools-kitchen-2"></i> ${esc(t("v5_meal"))}</button>`}
        <button class="btn btn-o btn-sm" onclick="v5Topup('${s.id}','${escJs(s.name)}')"><i class="ti ti-plus"></i> ${esc(t("v5_topup"))}</button><button class="btn btn-o btn-sm" aria-label="${esc(t("v5_history"))}" onclick="v5WalletHist('${s.id}')"><i class="ti ti-history"></i></button></span></div>`).join("")}</div>`:v5Empty("v5_nothing","tools-kitchen"));
  v5CanteenFilter();
};
function v5CanteenFilter(){const q=(_v5.swq||"").trim().toLowerCase();document.querySelectorAll(".v5-cs").forEach(r=>{r.style.display=!q||r.dataset.n.includes(q)?"":"none";});}
async function v5Meal(sid){const r=await v5Do(()=>api("POST","/school/wallet",{student_id:sid,kind:"meal"}));if(r){zdBeep();showToast(t("v5_meal_ok").replace("{b}",scMoney(r.balance)));navigate("schoolcanteen");}}
async function v5CanteenScan(code){
  const c=String(code||"").split("verif=").pop().replace("ZDS:","").trim();const s=(_v5.sw?.students||[]).find(x=>x.matricule===c);
  if(s){v5Meal(s.id);return;}
  try{const g=await api("POST","/school/gate",{code,direction:"in"});const s2=(_v5.sw?.students||[]).find(x=>x.name===g.name);if(s2)v5Meal(s2.id);else showToast(g.name);}catch(e){showToast(e.message,"error");}
}
function v5Topup(sid,name){
  zdModal("modal-v5-tu",`<div class="modal-title"><i class="ti ti-credit-card" style="color:var(--green)"></i> ${esc(t("v5_topup"))} · ${esc(name)}</div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-tu-a">${esc(t("v5_amount"))} *</label><input class="inp" id="v5-tu-a" type="number" min="0.01" step="0.01"></div><div class="fgrp"><label class="fl" for="v5-tu-m">${esc(t("fld_payment_method"))}</label><select class="inp" id="v5-tu-m">${zdMethodOptions("cash")}</select></div></div>
    <div class="err-box" id="v5-tu-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="v5TopupGo('${sid}','refund')">${esc(t("v5_refund_balance"))}</button><button class="btn btn-g btn-sm" onclick="v5TopupGo('${sid}','topup')"><i class="ti ti-check"></i> ${esc(t("v5_topup"))}</button></div>`,420);
}
async function v5TopupGo(sid,kind){const a=zdNum("v5-tu-a");if(!a){v5Err("v5-tu-err",t("v5_amount"));return;}if(kind==="refund"&&!confirm(t("v5_refund_q")))return;
  const r=await v5Do(()=>api("POST","/school/wallet",{student_id:sid,kind,amount:a,method:zdVal("v5-tu-m")}),null,"v5-tu-err");if(r){showToast(t("v5_balance")+" "+scMoney(r.balance));zdCloseModal("modal-v5-tu");navigate("schoolcanteen");}}
async function v5WalletHist(sid){const r=await api("GET",`/school/wallet/${sid}`);
  zdModal("modal-v5-wh",`<div class="modal-title"><i class="ti ti-history" style="color:var(--green)"></i> ${esc(r.student)} · ${scMoney(r.balance)}</div><div style="max-height:50vh;overflow:auto">${r.moves.map(m=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(v5Date(m.day))} · ${esc(m.label||"")}<div style="font-size:11px;color:var(--muted)">${esc(m.by||"")}</div></span><b style="color:${m.amount<0?"var(--red)":"var(--green)"}">${m.amount>0?"+":""}${scMoney(m.amount)}</b></div>`).join("")||zdEmpty(t("v5_nothing"))}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-wh')">${esc(t("btn_close"))}</button></div>`,440);}
async function v5CanteenCfg(){const x=await api("GET","/school/extras");
  zdModal("modal-v5-cc",`<div class="modal-title"><i class="ti ti-settings" style="color:var(--green)"></i> ${esc(t("v5_t_canteen"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-cc-p">${esc(t("v5_meal_price"))}</label><input class="inp" id="v5-cc-p" type="number" min="0" step="0.01" value="${x.meal_price??""}"></div><div class="fgrp"><label class="fl" for="v5-cc-m">${esc(t("v5_wallet_min"))}</label><input class="inp" id="v5-cc-m" type="number" min="0" step="0.01" value="${x.wallet_min??0}"></div></div>
    <div class="err-box" id="v5-cc-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-cc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5CanteenCfgGo()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,420);}
async function v5CanteenCfgGo(){if(await v5Do(()=>api("PUT","/school/extras",{meal_price:zdNum("v5-cc-p")||0,wallet_min:zdNum("v5-cc-m")||0}),t("v5_saved"),"v5-cc-err")){zdCloseModal("modal-v5-cc");navigate("schoolcanteen");}}

// ── Boutique de l'école (uniformes, fournitures) ──
SECTOR_PAGE_LOADERS.schoolshop=async el=>{
  const [ps,sales]=await Promise.all([api("GET","/stock/products"),api("GET","/school/shop/sales")]);_v5.sp=(Array.isArray(ps)?ps:(ps.items||[]));_v5.cart=_v5.cart||[];
  el.innerHTML=v5Head(t("v5_t_shop"),t("v5_shop_x"),"","schooltools")+
    `<div class="grid2" style="align-items:start"><div class="card"><b>${esc(t("v5_items"))}</b><div style="max-height:50vh;overflow:auto;margin-top:6px">${_v5.sp.filter(p=>(p.stock_qty||0)>0).map(p=>`<button class="ht-bk" style="width:100%;text-align:left" onclick="v5ShopAdd('${p.id}')"><span style="flex:1">${esc(p.name)} <small style="color:var(--muted)">${zdQty(p.stock_qty)}</small></span><b>${scMoney(p.unit_price)}</b></button>`).join("")||zdEmpty(t("v5_no_stock_items"))}</div></div>
      <div class="card"><b>${esc(t("v5_cart"))}</b><div id="v5-sh-cart"></div></div></div>
    ${sales.length?`<div class="card" style="margin-top:12px"><b>${esc(t("v5_recent_sales"))}</b>${v5Table([t("v5_number"),t("v5_date"),t("v5_buyer"),t("v5_total"),t("v5_method")],sales.slice(0,30).map(s=>`<tr><td class="mono">${esc(s.number)}</td><td>${esc(fmtDate(s.created_at))}</td><td>${esc(s.buyer||"—")}</td><td>${scMoney(s.total)}</td><td>${esc(t(["fees","credit-card"].includes(s.method)?"v5_pm_"+s.method:"pay_method_"+s.method))}</td></tr>`))}</div>`:""}`;
  v5ShopDraw();
};
function v5ShopAdd(id){const p=_v5.sp.find(x=>x.id===id);if(!p)return;const l=_v5.cart.find(x=>x.product_id===id);if(l)l.qty++;else _v5.cart.push({product_id:id,name:p.name,price:p.unit_price,qty:1});v5ShopDraw();}
async function v5ShopDraw(){
  const box=document.getElementById("v5-sh-cart");if(!box)return;const tot=_v5.cart.reduce((s,l)=>s+l.qty*l.price,0);
  if(!_v5.scs){try{_v5.scs=await api("GET","/school/students");}catch(_){_v5.scs=[];}}
  box.innerHTML=(_v5.cart.length?_v5.cart.map((l,i)=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(l.name)}</span><input class="inp v5-n" type="number" min="1" value="${l.qty}" aria-label="${esc(t("v5_qty"))}" onchange="_v5.cart[${i}].qty=parseFloat(this.value)||1;v5ShopDraw()"><b>${scMoney(l.qty*l.price)}</b><button class="btn btn-o btn-sm" aria-label="${esc(t("btn_delete"))}" onclick="_v5.cart.splice(${i},1);v5ShopDraw()"><i class="ti ti-x"></i></button></div>`).join(""):`<div style="font-size:12px;color:var(--muted);padding:8px 0">${esc(t("v5_cart_empty"))}</div>`)+
    `<div class="fgrp" style="margin-top:8px"><label class="fl" for="v5-sh-s">${esc(t("v5_student_opt"))}</label><select class="inp" id="v5-sh-s"><option value="">—</option>${_v5.scs.map(s=>`<option value="${s.id}">${esc(s.last_name||"")} ${esc(s.first_name||"")}${s.class_name?` · ${esc(s.class_name)}`:""}</option>`).join("")}</select></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-sh-m">${esc(t("fld_payment_method"))}</label><select class="inp" id="v5-sh-m">${zdMethodOptions("cash")}<option value="fees">${esc(t("v5_pm_fees"))}</option><option value="wallet">${esc(t("v5_pm_wallet"))}</option></select></div>
      <div class="fgrp"><label class="fl" for="v5-sh-b">${esc(t("v5_buyer"))}</label><input class="inp" id="v5-sh-b" maxlength="200"></div></div>
    <div class="err-box" id="v5-sh-err"></div><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px">${scMoney(tot)}</b><button class="btn btn-g btn-sm" ${_v5.cart.length?"":"disabled"} onclick="v5ShopPay()"><i class="ti ti-cash"></i> ${esc(t("v5_sell"))}</button></div>`;
}
async function v5ShopPay(){const r=await v5Do(()=>api("POST","/school/shop/sales",{student_id:zdVal("v5-sh-s")||null,buyer:zdVal("v5-sh-b")||null,method:zdVal("v5-sh-m"),lines:_v5.cart.map(l=>({product_id:l.product_id,qty:l.qty}))}),null,"v5-sh-err");
  if(r){showToast(t("v5_sold_x").replace("{v}",scMoney(r.total))+" · "+r.number);_v5.cart=[];navigate("schoolshop");}}

// ── Cahier de textes ──
SECTOR_PAGE_LOADERS.schoolhomework=async el=>{
  await v5Sc();const rows=await api("GET",`/school/homework${_v5.hwc?`?class_id=${_v5.hwc}`:""}`);
  el.innerHTML=v5Head(t("v5_t_homework"),t("v5_hw_x"),`<select class="inp" style="width:auto" aria-label="${esc(t("v5_class"))}" onchange="_v5.hwc=this.value;navigate('schoolhomework')"><option value="">${esc(t("v5_all_classes"))}</option>${(_v5.scc||[]).map(c=>`<option value="${c.id}"${_v5.hwc===c.id?" selected":""}>${esc(c.name)}</option>`).join("")}</select><button class="btn btn-g btn-sm" onclick="v5HwModal()"><i class="ti ti-plus"></i> ${esc(t("v5_hw_add"))}</button>`,"schooltools")+
    (rows.length?`<div class="v5-list">${rows.map(h=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(h.subject)} · ${esc(h.class_name||"")}</b><span style="font-size:12px;color:var(--muted)">${esc(v5Date(h.day))}</span></div>
      ${h.lesson?`<div style="font-size:13px;margin-top:4px"><b>${esc(t("v5_lesson"))} :</b> ${esc(h.lesson)}</div>`:""}${h.homework?`<div style="font-size:13px;margin-top:4px;color:var(--amber)"><b>${esc(t("v5_homework"))} :</b> ${esc(h.homework)}${h.due_day?` (${esc(t("v5_for_day"))} ${esc(v5Date(h.due_day))})`:""}</div>`:""}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:11px;color:var(--muted)"><span>${esc(h.teacher||"")}</span><button class="btn btn-o btn-sm" aria-label="${esc(t("btn_delete"))}" onclick="v5HwDel('${h.id}')"><i class="ti ti-trash"></i></button></div></div>`).join("")}</div>`:v5Empty("v5_hw_none","book"));
};
function v5HwModal(){
  zdModal("modal-v5-hw",`<div class="modal-title"><i class="ti ti-book" style="color:var(--green)"></i> ${esc(t("v5_hw_add"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-hw-c">${esc(t("v5_class"))} *</label><select class="inp" id="v5-hw-c">${(_v5.scc||[]).map(c=>`<option value="${c.id}"${_v5.hwc===c.id?" selected":""}>${esc(c.name)}</option>`).join("")}</select></div><div class="fgrp"><label class="fl" for="v5-hw-s">${esc(t("v5_subject"))} *</label><input class="inp" id="v5-hw-s" maxlength="120"></div></div>
    <div class="fgrp"><label class="fl" for="v5-hw-l">${esc(t("v5_lesson"))}</label><textarea class="inp" id="v5-hw-l" rows="3" maxlength="4000"></textarea></div>
    <div class="fgrp"><label class="fl" for="v5-hw-h">${esc(t("v5_homework"))}</label><textarea class="inp" id="v5-hw-h" rows="2" maxlength="4000"></textarea></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-hw-d">${esc(t("v5_date"))}</label><input class="inp" id="v5-hw-d" type="date" value="${zdToday()}"></div><div class="fgrp"><label class="fl" for="v5-hw-due">${esc(t("v5_for_day"))}</label><input class="inp" id="v5-hw-due" type="date"></div></div>
    <div style="font-size:12px;color:var(--muted)">${esc(t("v5_hw_notify"))}</div>
    <div class="err-box" id="v5-hw-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-hw')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5HwSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,500);
}
async function v5HwSave(){const b={class_id:zdVal("v5-hw-c"),subject:zdVal("v5-hw-s"),lesson:zdVal("v5-hw-l")||null,homework:zdVal("v5-hw-h")||null,day:zdVal("v5-hw-d"),due_day:zdVal("v5-hw-due")||null};
  if(!b.class_id||!b.subject){v5Err("v5-hw-err",t("v5_subject"));return;}if(!b.lesson&&!b.homework){v5Err("v5-hw-err",t("v5_hw_need"));return;}
  if(await v5Do(()=>api("POST","/school/homework",b),t("v5_saved"),"v5-hw-err")){zdCloseModal("modal-v5-hw");navigate("schoolhomework");}}
async function v5HwDel(id){if(!confirm(t("v5_delete_q")))return;if(await v5Do(()=>api("DELETE",`/school/homework/${id}`),t("v5_saved")))navigate("schoolhomework");}

// ── Pré-inscriptions en ligne ──
const V5_PR={new:"ba",contacted:"bb",enrolled:"bg",refused:"br"};
SECTOR_PAGE_LOADERS.schoolprereg=async el=>{
  await v5Sc();const r=await api("GET","/school/prereg");_v5.pr2=r;const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_prereg"),t("v5_prereg_x").replace("{n}",r.new),"","schooltools")+
    `<div class="card" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${r.on?`<div style="width:90px;flex:none">${v5QrSvg(r.public_url,3)}</div>`:""}<div style="flex:1;min-width:200px"><b>${esc(t(r.on?"v5_prereg_on":"v5_prereg_off"))}</b><div style="font-size:12px;color:var(--muted);word-break:break-all">${esc(r.public_url)}</div>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">${r.on?`<button class="btn btn-o btn-sm" onclick="navigator.clipboard.writeText('${escJs(r.public_url)}').then(()=>showToast(t('ga_copied')))"><i class="ti ti-copy"></i> ${esc(t("v5_copy_link"))}</button>`:""}${mgr?`<button class="btn btn-${r.on?"o":"g"} btn-sm" onclick="v5PreregCfg()"><i class="ti ti-settings"></i> ${esc(t(r.on?"v5_settings":"v5_prereg_open"))}</button>`:""}</div></div></div>`+
    (r.rows.length?`<div class="v5-list" style="margin-top:12px">${r.rows.map(p=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${esc(p.name)}</b>${v5Badge(t("v5_pr_"+p.status),V5_PR[p.status])}</div>
      <div style="font-size:12px;color:var(--muted)">${esc(p.number)} · ${esc(fmtDate(p.created_at))}${p.wanted_class?` · ${esc(p.wanted_class)}`:""}${p.birth_day?` · ${esc(v5Date(p.birth_day))}`:""}${p.previous_school?` · ${esc(p.previous_school)}`:""}</div>
      <div style="font-size:13px;margin-top:4px">${esc(p.parent_name)} · <a href="tel:${esc(p.parent_phone)}">${esc(p.parent_phone)}</a>${p.parent_email?` · ${esc(p.parent_email)}`:""}</div>${p.note?`<div class="card2" style="font-size:12px;margin-top:4px">${esc(p.note)}</div>`:""}
      ${p.status!=="enrolled"?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="${esc(v5Wa(p.parent_phone,t("v5_prereg_wa").replace("{n}",p.parent_name).replace("{s}",p.name)))}" onclick="v5PreregSt('${p.id}','contacted',true)"><i class="ti ti-brand-whatsapp"></i> ${esc(t("v5_contact_parent"))}</a>
        <button class="btn btn-g btn-sm" onclick="v5PreregEnroll('${p.id}')"><i class="ti ti-user-check"></i> ${esc(t("v5_enroll"))}</button>${p.status!=="refused"?`<button class="btn btn-r btn-sm" onclick="v5PreregSt('${p.id}','refused')">${esc(t("v5_refuse"))}</button>`:""}</div>`:""}</div>`).join("")}</div>`:v5Empty("v5_prereg_none","user-plus"));
};
function v5PreregCfg(){const r=_v5.pr2;
  zdModal("modal-v5-prc",`<div class="modal-title"><i class="ti ti-user-plus" style="color:var(--green)"></i> ${esc(t("v5_t_prereg"))}</div>
    <label class="terms-check"><input type="checkbox" id="v5-prc-on" ${r.on?"checked":""}><span>${esc(t("v5_prereg_open"))}</span></label>
    <div class="fgrp"><label class="fl" for="v5-prc-n">${esc(t("v5_prereg_note"))}</label><textarea class="inp" id="v5-prc-n" rows="3" maxlength="1000">${esc(r.note||"")}</textarea></div>
    <div class="err-box" id="v5-prc-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-prc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5PreregCfgGo()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,440);}
async function v5PreregCfgGo(){if(await v5Do(()=>api("PUT","/school/prereg/settings",{on:document.getElementById("v5-prc-on").checked,note:zdVal("v5-prc-n")}),t("v5_saved"),"v5-prc-err")){zdCloseModal("modal-v5-prc");navigate("schoolprereg");}}
async function v5PreregSt(id,s,quiet){const r=await v5Do(()=>api("POST",`/school/prereg/${id}`,{status:s}),quiet?null:t("v5_saved"));if(r&&!quiet)navigate("schoolprereg");else if(r)v5Later("schoolprereg",1500);}
function v5PreregEnroll(id){
  zdModal("modal-v5-pre",`<div class="modal-title"><i class="ti ti-user-check" style="color:var(--green)"></i> ${esc(t("v5_enroll"))}</div>
    <div class="fgrp"><label class="fl" for="v5-pre-c">${esc(t("v5_class"))}</label><select class="inp" id="v5-pre-c"><option value="">—</option>${(_v5.scc||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
    <div class="err-box" id="v5-pre-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-pre')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5PreregEnrollGo('${id}')"><i class="ti ti-check"></i> ${esc(t("v5_enroll"))}</button></div>`,400);}
async function v5PreregEnrollGo(id){if(await v5Do(()=>api("POST",`/school/prereg/${id}`,{status:"enrolled",class_id:zdVal("v5-pre-c")||null}),t("v5_enrolled"),"v5-pre-err")){zdCloseModal("modal-v5-pre");navigate("schoolprereg");}}

// ── Cartes d'élève et contrôle à l'entrée ──
SECTOR_PAGE_LOADERS.schoolgate=async el=>{
  await v5Sc();const r=await api("GET","/school/gate");const mgr=v5Mgr();_v5.gd=_v5.gd||"in";
  el.innerHTML=v5Head(t("v5_t_gate"),t("v5_gate_x").replace("{h}",r.late_hm),`<button class="btn btn-o btn-sm" onclick="v5CardsModal()"><i class="ti ti-id-badge-2"></i> ${esc(t("v5_print_cards"))}</button>`+(mgr?`<button class="btn btn-o btn-sm" aria-label="${esc(t("v5_late_hour"))}" onclick="v5GateCfg('${r.late_hm}')"><i class="ti ti-clock"></i></button>`:""),"schooltools")+
    `<div class="v5-kpis">${v5Kpi(t("v5_present"),r.present+" / "+r.students,"var(--green)")}${v5Kpi(t("v5_late"),r.late,r.late?"var(--amber)":"")}</div>
    <div class="card" style="margin-top:12px"><div style="display:flex;gap:6px;margin-bottom:8px">${["in","out"].map(d=>`<button class="toggle-btn${_v5.gd===d?" active":""}" onclick="_v5.gd='${d}';navigate('schoolgate')">${esc(t("v5_dir_"+d))}</button>`).join("")}</div>
      <div style="display:flex;gap:6px"><input class="inp" id="v5-gt" placeholder="${esc(t("v5_card_code"))}" aria-label="${esc(t("v5_card_code"))}" onkeydown="if(event.key==='Enter')v5GateGo(this.value)"><button class="btn btn-g btn-sm" onclick="v5Scan(v5GateGo,t('v5_scan'))"><i class="ti ti-scan"></i> ${esc(t("v5_scan"))}</button></div><div id="v5-gt-r" style="margin-top:8px"></div></div>
    ${r.rows.length?`<div class="card" style="margin-top:12px">${r.rows.map(x=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(x.name)}</span><span>${esc(x.hm)} · ${esc(t("v5_dir_"+x.direction))}</span>${x.late?v5Badge(t("v5_late"),"ba"):""}</div>`).join("")}</div>`:""}`;
  setTimeout(()=>document.getElementById("v5-gt")?.focus(),50);
};
async function v5GateGo(code){code=String(code||"").trim();if(!code)return;const box=document.getElementById("v5-gt-r");
  try{const r=await api("POST","/school/gate",{code,direction:_v5.gd||"in"});zdBeep();
    box.innerHTML=`<div class="card2" style="color:${r.late?"var(--amber)":"var(--green)"};font-weight:700"><i class="ti ti-circle-check"></i> ${esc(r.name)} · ${esc(r.class_name||"")} · ${esc(r.hm)}${r.late?` · ${esc(t("v5_late"))}`:""}</div>`;
    v5Later("schoolgate");
  }catch(e){if(box)box.innerHTML=`<div class="card2" style="color:var(--red);font-weight:700"><i class="ti ti-circle-x"></i> ${esc(e.message)}</div>`;}}
async function v5GateCfg(h){const v=prompt(t("v5_late_hour_q"),h);if(!v)return;if(await v5Do(()=>api("PUT","/school/gate/settings",{late_hm:v}),t("v5_saved")))navigate("schoolgate");}
function v5CardsModal(){
  zdModal("modal-v5-cards",`<div class="modal-title"><i class="ti ti-id-badge-2" style="color:var(--green)"></i> ${esc(t("v5_print_cards"))}</div>
    <div class="fgrp"><label class="fl" for="v5-cards-c">${esc(t("v5_class"))}</label><select class="inp" id="v5-cards-c"><option value="">${esc(t("v5_all_classes"))}</option>${(_v5.scc||[]).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-cards')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5CardsGo()"><i class="ti ti-printer"></i> ${esc(t("v5_print"))}</button></div>`,400);}
async function v5CardsGo(){const c=zdVal("v5-cards-c");zdCloseModal("modal-v5-cards");
  try{const r=await api("GET",`/school/cards${c?`?class_id=${c}`:""}`);if(!r.cards.length){showToast(t("v5_nothing"),"error");return;}
    v5Print(t("v5_print_cards"),`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${r.cards.map(x=>`<div style="border:1px solid #333;border-radius:10px;padding:10px;display:flex;gap:10px;break-inside:avoid;height:200px">
      <div style="flex:1;font-size:11px;line-height:1.5">${r.logo_url?`<img src="${esc(r.logo_url)}" alt="" style="height:28px">`:""}<div style="font-weight:800;font-size:12px">${esc(r.school||"")}</div><div style="color:#555">${esc(t("v5_student_card"))} ${esc(r.year||"")}</div>
        <div style="font-weight:800;font-size:15px;margin-top:6px">${esc(x.name)}</div><div>${esc(t("v5_class"))} : ${esc(x.class_name||"—")}</div><div>${esc(t("v5_matricule"))} : ${esc(x.matricule||"")}</div>${x.birth_day?`<div>${esc(t("v5_born"))} ${esc(v5Date(x.birth_day))}</div>`:""}</div>
      <div style="width:110px;flex:none;text-align:center">${v5QrSvg(x.verify_url,3)}<div style="font-size:8px;margin-top:2px">${esc(t("v5_scan_verify"))}</div></div></div>`).join("")}</div>`);
  }catch(e){showToast(e.message,"error");}}

// ── Heures des vacataires ──
SECTOR_PAGE_LOADERS.schoolhours=async el=>{
  _v5.thm=_v5.thm||v5Month();const r=await api("GET",`/school/teacher-hours?month=${_v5.thm}`);_v5.th=r;const mgr=v5Mgr();
  const cur=v=>{_sc.set=_sc.set||{currency:r.currency};return scMoney(v);};
  el.innerHTML=v5Head(t("v5_t_hours"),t("v5_hours_x"),`<input class="inp" type="month" value="${_v5.thm}" style="width:auto" aria-label="${esc(t("v5_month"))}" onchange="_v5.thm=this.value;navigate('schoolhours')"><button class="btn btn-g btn-sm" onclick="v5HoursModal()"><i class="ti ti-plus"></i> ${esc(t("v5_hours_add"))}</button>`,"schooltools")+
    `<div class="v5-kpis">${v5Kpi(t("v5_to_pay"),cur(r.total_unpaid),r.total_unpaid?"var(--amber)":"")}</div>`+
    (r.rows.length?`<div class="card" style="margin-top:12px">${v5Table([t("v5_teacher"),t("v5_hours"),t("v5_rate"),t("v5_amount"),t("v5_to_pay"),""],r.rows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${v5Num(x.hours)} h</td><td>${x.rate!=null?cur(x.rate):"—"}</td><td>${cur(x.amount)}</td><td><b style="color:${x.unpaid?"var(--amber)":"var(--green)"}">${cur(x.unpaid)}</b></td>
      <td>${mgr&&x.unpaid>0?`<button class="btn btn-g btn-sm" onclick="v5HoursPay('${x.teacher_id}','${escJs(x.name)}',${x.unpaid})"><i class="ti ti-cash"></i> ${esc(t("v5_pay"))}</button>`:""}</td></tr>`))}</div>
      <div class="card" style="margin-top:12px"><b>${esc(t("v5_details"))}</b>${v5Table([t("v5_date"),t("v5_teacher"),t("v5_hours"),t("v5_label"),t("v5_amount"),""],r.lines.map(l=>`<tr><td>${esc(v5Date(l.day))}</td><td>${esc(l.teacher)}</td><td>${v5Num(l.hours)}</td><td>${esc(l.label||"")}</td><td>${cur(l.amount)}</td><td>${l.paid?v5Badge(t("v5_paid"),"bg"):""}</td></tr>`))}</div>`:v5Empty("v5_hours_none","clock-dollar"));
};
function v5HoursModal(){const r=_v5.th;
  zdModal("modal-v5-th",`<div class="modal-title"><i class="ti ti-clock-dollar" style="color:var(--green)"></i> ${esc(t("v5_hours_add"))}</div>
    <div class="fgrp"><label class="fl" for="v5-th-t">${esc(t("v5_teacher"))} *</label><select class="inp" id="v5-th-t" onchange="v5HoursRate()">${r.teachers.map(x=>`<option value="${x.id}" data-r="${x.hourly_rate??""}">${esc(x.name)}</option>`).join("")}</select></div>
    <div class="grid3"><div class="fgrp"><label class="fl" for="v5-th-d">${esc(t("v5_date"))}</label><input class="inp" id="v5-th-d" type="date" value="${zdToday()}"></div><div class="fgrp"><label class="fl" for="v5-th-h">${esc(t("v5_hours"))} *</label><input class="inp" id="v5-th-h" type="number" min="0.25" max="24" step="0.25"></div><div class="fgrp"><label class="fl" for="v5-th-r">${esc(t("v5_rate"))}</label><input class="inp" id="v5-th-r" type="number" min="0" step="0.01"></div></div>
    <div class="fgrp"><label class="fl" for="v5-th-l">${esc(t("v5_label"))}</label><input class="inp" id="v5-th-l" maxlength="200"></div>
    ${v5Mgr()?`<label class="terms-check"><input type="checkbox" id="v5-th-def"><span>${esc(t("v5_rate_default"))}</span></label>`:""}
    <div class="err-box" id="v5-th-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-th')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5HoursGo()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,460);
  v5HoursRate();}
function v5HoursRate(){const o=document.getElementById("v5-th-t")?.selectedOptions[0];const r=document.getElementById("v5-th-r");if(o&&r)r.value=o.dataset.r;}
async function v5HoursGo(){const tid=zdVal("v5-th-t"),h=zdNum("v5-th-h"),rate=zdNum("v5-th-r");if(!tid||!h){v5Err("v5-th-err",t("v5_hours"));return;}
  if(document.getElementById("v5-th-def")?.checked&&rate!=null)await v5Do(()=>api("PUT",`/school/teachers/${tid}/rate`,{hourly_rate:rate}));
  if(await v5Do(()=>api("POST","/school/teacher-hours",{teacher_id:tid,day:zdVal("v5-th-d"),hours:h,rate,label:zdVal("v5-th-l")||null}),t("v5_saved"),"v5-th-err")){zdCloseModal("modal-v5-th");navigate("schoolhours");}}
function v5HoursPay(tid,name,due){
  zdModal("modal-v5-thp",`<div class="modal-title"><i class="ti ti-cash" style="color:var(--green)"></i> ${esc(t("v5_pay"))} · ${esc(name)}</div><div class="v5-big">${scMoney(due)}</div>
    <div class="fgrp"><label class="fl" for="v5-thp-m">${esc(t("fld_payment_method"))}</label><select class="inp" id="v5-thp-m">${zdMethodOptions("cash")}</select></div>
    <div class="err-box" id="v5-thp-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-thp')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5HoursPayGo('${tid}')"><i class="ti ti-check"></i> ${esc(t("v5_pay"))}</button></div>`,380);}
async function v5HoursPayGo(tid){const r=await v5Do(()=>api("POST","/school/teacher-hours/pay",{teacher_id:tid,month:_v5.thm,method:zdVal("v5-thp-m")}),null,"v5-thp-err");if(r){showToast(t("v5_paid_x").replace("{v}",scMoney(r.paid)));zdCloseModal("modal-v5-thp");navigate("schoolhours");}}

// ── Relances automatiques des frais ──
SECTOR_PAGE_LOADERS.schoolauto=async el=>{
  const x=await api("GET","/school/extras");const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_autorem"),t("v5_autorem_x"),"","schooltools")+
    `<div class="card"><label class="terms-check"><input type="checkbox" id="v5-ar-on" ${x.auto_remind?"checked":""} ${mgr?"":"disabled"}><span><b>${esc(t("v5_autorem_on"))}</b></span></label>
      <div class="fgrp"><label class="fl" for="v5-ar-d">${esc(t("v5_autorem_every"))}</label><input class="inp" id="v5-ar-d" type="number" min="1" max="60" value="${x.remind_every_days||7}" ${mgr?"":"disabled"}></div>
      <div class="err-box" id="v5-ar-err"></div><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn btn-o btn-sm" onclick="v5AutoRun()"><i class="ti ti-send"></i> ${esc(t("v5_autorem_run"))}</button>${mgr?`<button class="btn btn-g btn-sm" onclick="v5AutoSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button>`:""}</div></div>
    <div style="margin-top:12px" id="v5-ar-out"></div>`;
  document.getElementById("v5-ar-out").innerHTML=await v5OutboxHtml("school");
};
async function v5AutoSave(){if(await v5Do(()=>api("PUT","/school/extras",{auto_remind:document.getElementById("v5-ar-on").checked,remind_every_days:parseInt(zdVal("v5-ar-d"))||7}),t("v5_saved"),"v5-ar-err"))navigate("schoolauto");}
async function v5AutoRun(){const r=await v5Do(()=>api("POST","/school/fees/auto-run"));if(r){showToast(t("v5_autorem_done").replace("{n}",r.reminded));navigate("schoolauto");}}

// ── Garage : garanties, carnet d'entretien, sous-traitance ──
SECTOR_PAGE_LOADERS.garagewarranties=async el=>{
  _v5.gwa=_v5.gwa!==false;const rows=await api("GET",`/garage/warranties?active=${_v5.gwa}&q=${encodeURIComponent(_v5.gwq||"")}`);
  el.innerHTML=v5Head(t("v5_t_warranties"),t("v5_warr_x"),`<button class="toggle-btn${_v5.gwa?" active":""}" onclick="_v5.gwa=true;navigate('garagewarranties')">${esc(t("v5_warr_active"))}</button><button class="toggle-btn${_v5.gwa?"":" active"}" onclick="_v5.gwa=false;navigate('garagewarranties')">${esc(t("v5_warr_all"))}</button>`,"garagetools")+
    `<input class="inp" style="margin-bottom:10px" placeholder="${esc(t("v5_warr_q"))}" aria-label="${esc(t("v5_warr_q"))}" value="${esc(_v5.gwq||"")}" onkeydown="if(event.key==='Enter'){_v5.gwq=this.value;navigate('garagewarranties')}">`+
    (rows.length?`<div class="card">${v5Table([t("v5_vehicle"),t("v5_client"),t("v5_part_work"),t("v5_job"),t("v5_until"),""],rows.map(w=>`<tr><td><b>${esc(w.plate||w.vehicle||"")}</b><div style="font-size:11px;color:var(--muted)">${esc(w.vehicle||"")}</div></td><td>${esc(w.client||"—")}</td><td>${esc(w.label)} <small style="color:var(--muted)">(${w.months} ${esc(t("v5_months"))})</small></td>
      <td><a href="#" class="mono" onclick="gaJobOpen('${w.job_id}');return false">${esc(w.job)}</a></td><td>${esc(v5Date(w.until))}</td><td>${w.active?v5Badge(t("v5_days_left").replace("{n}",w.days_left),w.days_left<=30?"ba":"bg"):v5Badge(t("v5_expired"),"br")}</td></tr>`))}</div>`:v5Empty("v5_warr_none","shield-check"));
};
function gaRenderLines(closed,ps){
  ps=ps||_ga.products||[];const box=document.getElementById("ga-lines");if(!box)return;
  const badge=k=>`<span class="badge ${k==="labor"?"bb":k==="sub"?"bp":"ba"}">${esc(t(k==="sub"?"v5_k_sub":"ga_k_"+k))}</span>`;
  box.innerHTML=_ga.lines.length?_ga.lines.map((l,i)=>closed?`<div class="ga-line ro">${badge(l.kind)}<span style="flex:1">${esc(l.label)}${l.warranty_months?` <small style="color:var(--green)"><i class="ti ti-shield-check"></i> ${l.warranty_months} ${esc(t("v5_months"))}</small>`:""}${l.kind==="sub"&&l.supplier?` <small style="color:var(--muted)">· ${esc(l.supplier)}</small>`:""}</span><span>${zdQty(l.qty)} × ${zdMoney(l.unit_price)}</span><b>${zdMoney(l.qty*l.unit_price)}</b></div>`:
    `<div class="ga-line">${badge(l.kind)}
      ${l.kind==="part"?`<select class="inp" aria-label="${esc(t("ga_part_stock"))}" onchange="gaPickProduct(${i},this.value)"><option value="">${esc(t("ga_free_part"))}</option>${ps.map(p=>`<option value="${p.id}"${p.id===l.product_id?" selected":""}>${esc(p.name)} (${zdQty(p.stock_qty)})</option>`).join("")}</select>`:""}
      <input class="inp" aria-label="${esc(t("ga_label"))}" placeholder="${esc(t("ga_label"))}" value="${esc(l.label)}" oninput="_ga.lines[${i}].label=this.value">
      <input class="inp ga-n" aria-label="${esc(t("ga_qty"))}" type="number" min="0.01" step="0.01" value="${l.qty}" oninput="_ga.lines[${i}].qty=parseFloat(this.value)||0;gaTot()">
      <input class="inp ga-n" aria-label="${esc(t("ga_price"))}" type="number" min="0" step="0.01" value="${l.unit_price}" oninput="_ga.lines[${i}].unit_price=parseFloat(this.value)||0;gaTot()">
      ${l.kind==="sub"?`<input class="inp ga-n" aria-label="${esc(t("v5_sub_cost"))}" title="${esc(t("v5_sub_cost"))}" placeholder="${esc(t("v5_sub_cost"))}" type="number" min="0" step="0.01" value="${l.cost??""}" oninput="_ga.lines[${i}].cost=parseFloat(this.value)||0;gaTot()"><input class="inp" aria-label="${esc(t("v5_sub_supplier"))}" placeholder="${esc(t("v5_sub_supplier"))}" value="${esc(l.supplier||"")}" oninput="_ga.lines[${i}].supplier=this.value">`:""}
      <select class="inp ga-n" aria-label="${esc(t("v5_warranty"))}" title="${esc(t("v5_warranty"))}" onchange="_ga.lines[${i}].warranty_months=parseInt(this.value)||0">${[0,1,3,6,12,24].map(m=>`<option value="${m}"${(l.warranty_months||0)===m?" selected":""}>${m?`${m} ${esc(t("v5_months_short"))}`:esc(t("v5_no_warranty"))}</option>`).join("")}</select>
      <button class="btn btn-o btn-sm" aria-label="${esc(t("btn_delete"))}" onclick="_ga.lines.splice(${i},1);gaRenderLines()"><i class="ti ti-x"></i></button></div>`).join(""):`<div style="font-size:12px;color:var(--muted);padding:4px 0">${esc(t("ga_no_lines"))}</div>`;
  if(!closed){const lb=document.querySelector(`#modal-ga-job button[onclick="gaAddLine('labor')"]`)||[...document.querySelectorAll("button")].find(b=>b.getAttribute("onclick")==="gaAddLine('labor')");
    if(lb&&!document.getElementById("v5-ga-sub"))lb.insertAdjacentHTML("afterend",`<button id="v5-ga-sub" class="btn btn-o btn-sm" onclick="gaAddLine('sub')"><i class="ti ti-plus"></i> ${esc(t("v5_add_sub"))}</button>`);}
  gaTot();
}
const _v5GaAdd=gaAddLine;
gaAddLine=async function(kind){if(kind==="sub"){_ga.lines.push({kind:"sub",label:"",qty:1,unit_price:0,cost:0,supplier:""});gaRenderLines();return;}return _v5GaAdd(kind);};
const _v5GaBody=gaJobBody;
gaJobBody=function(){const b=_v5GaBody();b.lines=_ga.lines.map(l=>{const o={kind:l.kind,label:(l.label||"").trim(),qty:l.qty,unit_price:l.unit_price,product_id:l.kind==="part"?(l.product_id||null):null,warranty_months:l.warranty_months||0};if(l.kind==="sub"){o.cost=l.cost||0;o.supplier=(l.supplier||"").trim()||null;}return o;});return b;};
const _v5GaVm=gaVehicleModal;
gaVehicleModal=async function(id){await _v5GaVm(id);if(!id)return;const f=document.querySelector("#modal-ga-v .modal-footer");if(f&&!document.getElementById("v5-ga-lb"))f.insertAdjacentHTML("afterbegin",`<button id="v5-ga-lb" class="btn btn-o btn-sm" onclick="v5Logbook('${id}')"><i class="ti ti-notebook"></i> ${esc(t("v5_logbook"))}</button>`);};
async function v5Logbook(vid){
  try{const r=await api("GET",`/garage/vehicles/${vid}/logbook`);const v=r.vehicle;
    v5Print(t("v5_logbook")+" "+(v.plate||""),v5DocHead(r.company,t("v5_logbook"),`${v.label||""}${v.plate?" · "+v.plate:""}`)+
      `<div style="font-size:12px;margin-bottom:8px">${esc(v.client_name||"")}${v.vin?` · VIN ${esc(v.vin)}`:""}${v.mileage?` · ${zdQty(v.mileage)} km`:""}</div>`+
      v5DocTable([t("v5_date"),t("v5_job"),"km",t("v5_work_done"),t("v5_mechanic"),t("v5_total")],r.entries.map(e=>[esc(fmtDate(e.day)),esc(e.number),e.mileage?zdQty(e.mileage):"",esc([e.complaint,e.diagnosis].filter(Boolean).join(" — "))+"<br>"+e.lines.map(l=>`${esc(l.label)}${l.warranty_months?` (${l.warranty_months} ${esc(t("v5_months_short"))})`:""}`).join(", "),esc(e.mechanic||""),zdMoney(e.total)]))+
      `<div style="text-align:right;margin-top:8px"><b>${esc(t("v5_total"))} ${zdMoney(r.total)}</b></div>`);
  }catch(e){showToast(e.message,"error");}
}
