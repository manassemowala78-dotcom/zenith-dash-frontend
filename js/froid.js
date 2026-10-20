// ── MODULE CHAMBRE FROIDE (9.0) ──
const _cd={rooms:null,lots:null,filter:"all",client:"",room:"",q:"",entryLines:[],exitSel:{},hFrom:null,hTo:null,clients:null};
const CD_ST_COL={ok:"var(--green)",alert:"var(--red)",late:"var(--amber)",no_reading:"var(--muted)"};
function cdTemp(v){return v==null?"—":`${new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1}).format(v)} °C`;}
function zdShowDoc(html,title){const page=document.getElementById("doc-page");page.innerHTML=html;page.classList.remove("doc-ticket");window._currentDoc={number:title||"document"};document.getElementById("doc-wa-btn").style.display="none";document.getElementById("doc-view").style.display="block";document.body.classList.add("doc-open");}
async function cdClients(force){if(!_cd.clients||force){const r=await api("GET","/clients/");_cd.clients=Array.isArray(r)?r:(r.items||[]);}return _cd.clients;}

SECTOR_PAGE_LOADERS.coldrooms=async el=>{
  const r=await api("GET","/cold/rooms");_cd.rooms=r.rooms;const mgr=rsIsManager();
  el.innerHTML=sectorPageHead(esc(t("nav_cold_rooms")),esc(t("cd_rooms_sub").replace("{n}",r.rooms.length).replace("{a}",r.alerts).replace("{h}",r.reading_interval_h)),
    mgr?`<button class="btn btn-o btn-sm" onclick="cdSettingsModal()"><i class="ti ti-settings"></i></button><button class="btn btn-g btn-sm" onclick="cdRoomModal()"><i class="ti ti-plus"></i> ${esc(t("cd_new_room"))}</button>`:"")+
    (r.rooms.length?`<div class="cd-rooms">${r.rooms.map(x=>`<div class="card cd-room" style="--c:${CD_ST_COL[x.status]}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div><b style="font-size:15px">${esc(x.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(t("cd_kind_"+x.kind))} · ${cdTemp(x.min_temp)} → ${cdTemp(x.max_temp)}${x.has_sensor?` · <i class="ti ti-wifi"></i> ${esc(t("cd_sensor"))}`:""}</div></div>
        <span class="badge" style="color:var(--c);border:1px solid var(--c)">${esc(t("cd_st_"+x.status))}</span></div>
      <div class="cd-temp">${cdTemp(x.last_temp)}</div><div style="font-size:11px;color:var(--muted)">${x.last_reading_at?esc(t("cd_last_reading"))+" "+fmtDateTime(x.last_reading_at):esc(t("cd_no_reading"))} · ${x.readings_today} ${esc(t("cd_today_readings"))}</div>
      ${x.capacity_pallets?`<div style="margin-top:10px;font-size:12px;display:flex;justify-content:space-between"><span>${esc(t("cd_occupancy"))}</span><b>${zdQty(x.occupancy.pallets)} / ${x.capacity_pallets} ${esc(t("cd_pallets"))} · ${x.occupancy_pct} %</b></div><div class="usage-bar"><div class="usage-bar-fill" style="width:${Math.min(100,x.occupancy_pct)}%;background:${x.occupancy_pct>=90?"var(--red)":x.occupancy_pct>=75?"var(--amber)":"var(--cyan)"}"></div></div>`:""}
      <div style="font-size:12px;color:var(--muted);margin-top:4px">${x.occupancy.lots} ${esc(t("cd_lots"))} · ${zdQty(x.occupancy.kg)} kg</div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn btn-g btn-sm" onclick="cdReadingModal('${x.id}')"><i class="ti ti-temperature-plus"></i> ${esc(t("cd_reading"))}</button><button class="btn btn-o btn-sm" onclick="cdHistory('${x.id}')"><i class="ti ti-chart-line"></i> ${esc(t("cd_history"))}</button>
        ${mgr?`<button class="btn btn-o btn-sm" onclick="cdRoomModal('${x.id}')"><i class="ti ti-pencil"></i></button><button class="btn btn-o btn-sm" onclick="cdSensor('${x.id}')" title="${esc(t("cd_sensor"))}"><i class="ti ti-wifi"></i></button>`:""}</div></div>`).join("")}</div>`:
      `<div class="card" style="text-align:center;padding:26px">${zdEmpty(t("cd_no_rooms"),"snowflake")}${mgr?`<button class="btn btn-g btn-sm" onclick="cdRoomModal()"><i class="ti ti-plus"></i> ${esc(t("cd_new_room"))}</button>`:""}</div>`);
  sectorTimer("coldrooms",()=>{if(!document.querySelector(".modal-overlay[style*='flex']"))SECTOR_PAGE_LOADERS.coldrooms(el);},60000);
};
function cdRoomModal(id){
  const r=id?_cd.rooms.find(x=>x.id===id):null;
  zdModal("modal-cd-room",`<div class="modal-title"><i class="ti ti-snowflake" style="color:var(--cyan)"></i> ${esc(t(r?"cd_edit_room":"cd_new_room"))}</div>
    <div class="fgrp"><label class="fl">${esc(t("fld_name"))} *</label><input class="inp" id="cd-r-name" value="${esc(r?.name||"")}" placeholder="Chambre négative 2"></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("cd_kind"))}</label><select class="inp" id="cd-r-kind">${["positive","negative","mixed"].map(k=>`<option value="${k}"${(r?.kind||"positive")===k?" selected":""}>${esc(t("cd_kind_"+k))}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("cd_min"))} *</label><input class="inp" type="number" step="0.5" id="cd-r-min" value="${r?.min_temp??0}"></div><div class="fgrp"><label class="fl">${esc(t("cd_max"))} *</label><input class="inp" type="number" step="0.5" id="cd-r-max" value="${r?.max_temp??4}"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("cd_cap_pallets"))}</label><input class="inp" type="number" min="0" id="cd-r-cap" value="${r?.capacity_pallets||""}"></div><div class="fgrp"><label class="fl">${esc(t("cd_cap_kg"))}</label><input class="inp" type="number" min="0" id="cd-r-kg" value="${r?.capacity_kg||""}"></div></div>
    <div class="modal-footer">${r?`<button class="btn btn-r btn-sm" style="margin-right:auto" onclick="cdDeleteRoom('${r.id}')"><i class="ti ti-trash"></i></button>`:""}<button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cd-room')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitCdRoom('${r?r.id:""}')">${esc(t("btn_save"))}</button></div>`,520);
}
async function submitCdRoom(id){const body={name:zdVal("cd-r-name"),kind:zdVal("cd-r-kind"),min_temp:zdNum("cd-r-min"),max_temp:zdNum("cd-r-max"),capacity_pallets:parseInt(zdVal("cd-r-cap"))||0,capacity_kg:zdNum("cd-r-kg")||0};
  try{await api(id?"PATCH":"POST",id?`/cold/rooms/${id}`:"/cold/rooms",body);zdCloseModal("modal-cd-room");navigate("coldrooms");}catch(e){showToast(e.message,"error");}}
async function cdDeleteRoom(id){if(!confirm(t("confirm_delete")))return;try{await api("DELETE",`/cold/rooms/${id}`);zdCloseModal("modal-cd-room");navigate("coldrooms");}catch(e){showToast(e.message,"error");}}
function cdReadingModal(id){
  const r=_cd.rooms.find(x=>x.id===id);
  zdModal("modal-cd-read",`<div class="modal-title"><i class="ti ti-temperature" style="color:var(--cyan)"></i> ${esc(t("cd_reading"))} · ${esc(r.name)}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(t("cd_range"))} : ${cdTemp(r.min_temp)} → ${cdTemp(r.max_temp)}</div>
    <div class="fgrp"><label class="fl">${esc(t("cd_temp"))} (°C) *</label><input class="inp" type="number" step="0.1" id="cd-v" style="font-size:22px" oninput="const v=parseFloat(this.value);document.getElementById('cd-act-box').style.display=(!isNaN(v)&&(v<${r.min_temp}||v>${r.max_temp}))?'block':'none'"></div>
    <div id="cd-act-box" style="display:none"><div class="alert-bar" style="margin-bottom:8px"><i class="ti ti-alert-triangle"></i> ${esc(t("cd_out_of_range"))}</div><div class="fgrp"><label class="fl">${esc(t("cd_action"))}</label><textarea class="inp" id="cd-act" rows="2" placeholder="${esc(t("cd_action_ph"))}"></textarea></div></div>
    <div class="fgrp"><label class="fl">${esc(t("fld_notes"))}</label><input class="inp" id="cd-note"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cd-read')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitCdReading('${id}')">${esc(t("btn_save"))}</button></div>`,440);
  setTimeout(()=>document.getElementById("cd-v")?.focus(),100);
}
async function submitCdReading(id){const v=zdNum("cd-v");if(v==null){flagMissingFields([document.getElementById("cd-v")]);return;}
  try{const r=await api("POST","/cold/readings",{room_id:id,value:v,note:zdVal("cd-note")||null,corrective_action:zdVal("cd-act")||null});zdCloseModal("modal-cd-read");showToast(r.ok?t("cd_reading_ok"):t("cd_reading_alert"),r.ok?"success":"error");navigate("coldrooms");}catch(e){showToast(e.message,"error");}}
async function cdHistory(id){
  const r=_cd.rooms.find(x=>x.id===id);const h=await api("GET",`/cold/readings?room_id=${id}&days=7`);
  const pts=[...h.readings].reverse();const W=560,Hh=170,pad=28;
  let svg="";
  if(pts.length>1){const ts=pts.map(p=>parseServerDate(p.recorded_at).getTime());const t0=Math.min(...ts),t1=Math.max(...ts)||t0+1;
    const vs=pts.map(p=>p.value).concat([r.min_temp,r.max_temp]);const lo=Math.min(...vs)-1,hi=Math.max(...vs)+1;
    const X=tt=>pad+(tt-t0)/(t1-t0||1)*(W-pad-8),Y=v=>8+(hi-v)/(hi-lo)*(Hh-24);
    svg=`<svg viewBox="0 0 ${W} ${Hh}" style="width:100%;height:auto;background:var(--c2);border-radius:10px"><rect x="${pad}" y="${Y(r.max_temp)}" width="${W-pad-8}" height="${Math.max(1,Y(r.min_temp)-Y(r.max_temp))}" fill="rgba(0,212,200,.12)"/>
      <text x="2" y="${Y(r.max_temp)+4}" font-size="10" fill="#888">${r.max_temp}°</text><text x="2" y="${Y(r.min_temp)+4}" font-size="10" fill="#888">${r.min_temp}°</text>
      <polyline fill="none" stroke="#00d4c8" stroke-width="2" points="${pts.map((p,i)=>`${X(ts[i])},${Y(p.value)}`).join(" ")}"/>${pts.map((p,i)=>p.ok?"":`<circle cx="${X(ts[i])}" cy="${Y(p.value)}" r="4" fill="#ff5f6d"/>`).join("")}</svg>`;}
  zdModal("modal-cd-hist",`<div class="modal-title"><i class="ti ti-chart-line"></i> ${esc(r.name)} · 7 ${esc(t("cd_days"))}</div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;margin-bottom:8px"><span>${esc(t("cd_min_short"))} <b>${cdTemp(h.stats.min)}</b></span><span>${esc(t("cd_max_short"))} <b>${cdTemp(h.stats.max)}</b></span><span>${esc(t("cd_avg"))} <b>${cdTemp(h.stats.avg)}</b></span><span style="color:var(--red)">${esc(t("cd_alerts"))} <b>${h.stats.alerts}</b></span></div>
    ${svg||zdEmpty(t("cd_no_reading"))}
    <div style="max-height:240px;overflow:auto;margin-top:10px">${h.readings.slice(0,60).map(x=>`<div style="display:flex;gap:8px;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b);font-size:12px"><span>${fmtDateTime(x.recorded_at)} · ${esc(x.by_name||x.source)}</span><b style="color:${x.ok?"var(--text)":"var(--red)"}">${cdTemp(x.value)}</b>
      ${!x.ok?(x.corrective_action?`<span style="color:var(--muted);flex-basis:100%">${esc(x.corrective_action)}</span>`:`<button class="btn btn-o btn-sm" onclick="cdAction('${x.id}','${id}')">${esc(t("cd_add_action"))}</button>`):""}</div>`).join("")}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cd-hist')">${esc(t("btn_close"))}</button></div>`,640);
}
async function cdAction(rid,room){const v=prompt(t("cd_action"));if(!v)return;try{await api("PATCH",`/cold/readings/${rid}`,{note:v});cdHistory(room);}catch(e){showToast(e.message,"error");}}
async function cdSensor(id){
  if(!confirm(t("cd_sensor_confirm")))return;
  try{const r=await api("POST",`/cold/rooms/${id}/sensor`);const url=API_BASE.replace(/\/v1$/,"")+r.url;
    zdModal("modal-cd-sensor",`<div class="modal-title"><i class="ti ti-wifi"></i> ${esc(t("cd_sensor"))}</div><div style="font-size:13px;margin-bottom:8px">${esc(t("cd_sensor_hint"))}</div>
      <div class="fgrp"><label class="fl">URL (POST)</label><input class="inp" readonly value="${esc(url)}" onclick="this.select()"></div><pre class="api-code" style="white-space:pre-wrap">curl -X POST ${esc(url)} -H "Content-Type: application/json" -d '{"value": 3.2}'</pre>
      <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cd-sensor')">${esc(t("btn_close"))}</button></div>`,560);
  }catch(e){showToast(e.message,"error");}
}
async function cdSettingsModal(){
  const s=await api("GET","/cold/settings");
  zdModal("modal-cd-set",`<div class="modal-title"><i class="ti ti-settings"></i> ${esc(t("cd_settings"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("cd_interval"))}</label><input class="inp" type="number" min="0.5" step="0.5" id="cd-s-int" value="${s.reading_interval_h}"></div>
    <div class="fgrp"><label class="fl">${esc(t("cd_expiry_days"))}</label><input class="inp" type="number" min="1" id="cd-s-exp" value="${s.expiry_alert_days}"></div></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cd-set')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitCdSettings()">${esc(t("btn_save"))}</button></div>`,440);
}
async function submitCdSettings(){try{await api("PUT","/cold/settings",{reading_interval_h:zdNum("cd-s-int"),expiry_alert_days:parseInt(zdVal("cd-s-exp"))});zdCloseModal("modal-cd-set");navigate("coldrooms");}catch(e){showToast(e.message,"error");}}

// ── Lots ──
SECTOR_PAGE_LOADERS.coldlots=async el=>{
  const qs=new URLSearchParams();if(_cd.client)qs.set("client_id",_cd.client);if(_cd.room)qs.set("room_id",_cd.room);if(_cd.filter!=="all")qs.set("filter",_cd.filter);if(_cd.q)qs.set("q",_cd.q);
  const [r,rooms,cls]=await Promise.all([api("GET","/cold/lots?"+qs),api("GET","/cold/rooms"),api("GET","/cold/clients")]);_cd.rooms=rooms.rooms;_cd.lotList=r.lots;
  el.innerHTML=sectorPageHead(esc(t("nav_cold_lots")),esc(t("cd_lots_sub").replace("{n}",r.totals.lots).replace("{p}",zdQty(r.totals.pallets)).replace("{k}",zdQty(r.totals.kg))),
    `<button class="btn btn-g btn-sm" onclick="cdEntryModal()"><i class="ti ti-login"></i> ${esc(t("cd_entry"))}</button><button class="btn btn-o btn-sm" onclick="cdExitModal()"><i class="ti ti-logout"></i> ${esc(t("cd_exit"))}</button>`)+
    `<div class="card" style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <select class="inp" style="width:auto" onchange="_cd.client=this.value;navigate('coldlots')"><option value="">${esc(t("cd_all_owners"))}</option><option value="own"${_cd.client==="own"?" selected":""}>${esc(t("cd_own_stock"))}</option>${cls.clients.map(c=>`<option value="${c.id}"${_cd.client===c.id?" selected":""}>${esc(c.name)}</option>`).join("")}</select>
      <select class="inp" style="width:auto" onchange="_cd.room=this.value;navigate('coldlots')"><option value="">${esc(t("cd_all_rooms"))}</option>${rooms.rooms.map(x=>`<option value="${x.id}"${_cd.room===x.id?" selected":""}>${esc(x.name)}</option>`).join("")}</select>
      ${["all","expiring","expired"].map(f=>`<button class="toggle-btn${_cd.filter===f?" active":""}" onclick="_cd.filter='${f}';navigate('coldlots')">${esc(t("cd_f_"+f))}</button>`).join("")}
      <input class="inp" style="flex:1;min-width:150px" placeholder="${esc(t("cd_search"))}" value="${esc(_cd.q)}" onchange="_cd.q=this.value;navigate('coldlots')"></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>${esc(t("cd_lot"))}</th><th>${esc(t("cd_product"))}</th><th>${esc(t("cd_owner"))}</th><th>${esc(t("cd_location"))}</th><th>${esc(t("zd_qty"))}</th><th>kg</th><th>${esc(t("cd_pallets"))}</th><th>${esc(t("cd_expiry"))}</th><th></th></tr></thead><tbody>
    ${r.lots.map(l=>`<tr><td class="mono" style="font-size:11px">${esc(l.number)}${l.supplier_lot?`<div style="color:var(--muted)">${esc(l.supplier_lot)}</div>`:""}</td><td><b>${esc(l.product)}</b></td><td>${esc(l.client_name||t("cd_own_stock"))}</td><td>${esc(l.room_name||"")}${l.position?` · ${esc(l.position)}`:""}</td>
      <td class="mono">${zdQty(l.qty)} ${esc(l.unit)}</td><td class="mono">${zdQty(l.weight_kg)}</td><td class="mono">${zdQty(l.pallets)}</td>
      <td>${l.expiry?`<span class="badge ${l.expired?"br":l.days_left<=r.expiry_alert_days?"ba":"bg"}">${esc(l.expiry)}${l.days_left!=null?` · ${l.expired?esc(t("cd_expired")):l.days_left+" j"}`:""}</span>`:"—"}</td>
      <td><button class="btn btn-o btn-sm" onclick="cdLotHistory('${l.id}')"><i class="ti ti-history"></i></button></td></tr>`).join("")||`<tr><td colspan="9">${zdEmpty(t("cd_no_lots"),"box")}</td></tr>`}</tbody></table></div></div>`;
};
async function cdLotHistory(id){
  const h=await api("GET",`/cold/lots/${id}/history`);
  zdModal("modal-cd-hist",`<div class="modal-title"><i class="ti ti-history"></i> ${esc(h.lot.product)} · <span class="mono">${esc(h.lot.number)}</span></div>
    ${h.moves.map(m=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--b);font-size:13px"><span><span class="badge ${m.kind==="in"?"bg":"ba"}">${esc(t("cd_mv_"+m.kind))}</span> ${esc(m.doc||"")} · ${fmtDateTime(m.at)} · ${esc(m.by_name||"")}${m.note&&m.note!=="pickup"?" · "+esc(t("cd_reason_"+m.note)):""}</span><b class="mono">${m.kind==="in"?"+":"−"}${zdQty(m.qty)} ${esc(h.lot.unit)}</b></div>`).join("")}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cd-hist')">${esc(t("btn_close"))}</button></div>`,560);
}

// ── Bons d'entrée / de sortie ──
async function cdEntryModal(){
  const [rooms,cls]=await Promise.all([api("GET","/cold/rooms"),cdClients()]);_cd.rooms=rooms.rooms;
  _cd.entryLines=[{product:"",supplier_lot:"",unit:"carton",qty:"",weight_kg:"",pallets:"",expiry:"",position:"",temp:"",unit_price:""}];
  zdModal("modal-cd-entry",`<div class="modal-title"><i class="ti ti-login" style="color:var(--green)"></i> ${esc(t("cd_entry"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("cd_owner"))}</label><select class="inp" id="cd-e-client" onchange="cdRenderEntry()"><option value="">${esc(t("cd_own_stock"))}</option>${cls.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("cd_room"))} *</label><select class="inp" id="cd-e-room">${rooms.rooms.map(x=>`<option value="${x.id}">${esc(x.name)} (${x.capacity_pallets?zdQty(x.capacity_pallets-x.occupancy.pallets)+" "+esc(t("cd_free_pallets")):"—"})</option>`).join("")}</select></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("cd_vehicle"))}</label><input class="inp" id="cd-e-veh" placeholder="KN 1234 AB"></div><div class="fgrp"><label class="fl">${esc(t("cd_driver"))}</label><input class="inp" id="cd-e-drv"></div></div>
    <div id="cd-e-lines"></div><button class="btn btn-o btn-sm" onclick="_cd.entryLines.push({unit:'carton'});cdRenderEntry()"><i class="ti ti-plus"></i> ${esc(t("cd_add_line"))}</button>
    <div class="err-box" id="cd-e-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cd-entry')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitCdEntry()"><i class="ti ti-check"></i> ${esc(t("cd_validate_entry"))}</button></div>`,820);
  cdRenderEntry();
}
function cdRenderEntry(){
  const own=!zdVal("cd-e-client");
  document.getElementById("cd-e-lines").innerHTML=_cd.entryLines.map((l,i)=>`<div class="card2" style="padding:10px;border-radius:10px;margin-bottom:8px">
    <div style="display:flex;gap:6px;flex-wrap:wrap"><input class="inp" style="flex:2;min-width:180px" placeholder="${esc(t("cd_product"))} *" value="${esc(l.product||"")}" oninput="_cd.entryLines[${i}].product=this.value">
      <input class="inp" style="flex:1;min-width:100px" placeholder="${esc(t("cd_supplier_lot"))}" value="${esc(l.supplier_lot||"")}" oninput="_cd.entryLines[${i}].supplier_lot=this.value">
      ${_cd.entryLines.length>1?`<button class="btn btn-o btn-sm" onclick="_cd.entryLines.splice(${i},1);cdRenderEntry()"><i class="ti ti-x"></i></button>`:""}</div>
    <div class="cd-eline">${[["qty","fld_qty","number"],["unit","fld_unit","text"],["weight_kg","cd_weight","number"],["pallets","cd_pallets","number"],["expiry","cd_expiry","date"],["position","cd_position","text"],["temp","cd_temp_in","number"]].concat(own?[["unit_price","cd_sale_price","number"]]:[]).map(([k,lb,tp])=>`<label><span>${esc(t(lb))}${k==="qty"?" *":""}</span><input class="inp" type="${tp}" ${tp==="number"?'step="any"':""} value="${esc(l[k]??"")}" oninput="_cd.entryLines[${i}].${k}=this.value"></label>`).join("")}</div></div>`).join("");
}
async function submitCdEntry(){
  const num=v=>v===""||v==null?null:parseFloat(String(v).replace(",","."));
  const lines=_cd.entryLines.filter(l=>(l.product||"").trim()).map(l=>({product:l.product.trim(),supplier_lot:l.supplier_lot||null,unit:l.unit||"carton",qty:num(l.qty)||0,weight_kg:num(l.weight_kg)||0,pallets:num(l.pallets)||0,expiry:l.expiry||null,position:l.position||null,temp:num(l.temp),unit_price:num(l.unit_price)}));
  if(!lines.length||lines.some(l=>!l.qty)){showErr("cd-e-err",t("cd_entry_missing"));return;}
  try{const r=await api("POST","/cold/entries",{client_id:zdVal("cd-e-client")||null,room_id:zdVal("cd-e-room"),vehicle:zdVal("cd-e-veh")||null,driver:zdVal("cd-e-drv")||null,lines});
    zdCloseModal("modal-cd-entry");showToast(t("cd_entry_ok").replace("{n}",r.number));r.warnings.forEach(w=>showToast(w,"error"));cdPrintDoc(r.doc_id);}
  catch(e){showErr("cd-e-err",e.message);}
}
async function cdExitModal(){
  const cls=await cdClients();_cd.exitSel={};
  zdModal("modal-cd-exit",`<div class="modal-title"><i class="ti ti-logout" style="color:var(--amber)"></i> ${esc(t("cd_exit"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("cd_owner"))}</label><select class="inp" id="cd-x-client" onchange="cdLoadExitLots()"><option value="own">${esc(t("cd_own_stock"))}</option>${cls.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("cd_reason"))}</label><select class="inp" id="cd-x-reason" onchange="cdExitReason()">${["pickup","sale","destruction","transfer","other"].map(r=>`<option value="${r}">${esc(t("cd_reason_"+r))}</option>`).join("")}</select></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("cd_recipient"))}</label><input class="inp" id="cd-x-rec"></div><div class="fgrp"><label class="fl">${esc(t("cd_vehicle"))}</label><input class="inp" id="cd-x-veh"></div></div>
    <div id="cd-x-sale" style="display:none" class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_payment_method"))}</label><select class="inp" id="cd-x-method">${zdMethodOptions("cash")}</select></div><div class="fgrp"><label class="fl">${esc(t("rs_customer"))}</label><select class="inp" id="cd-x-buyer"><option value="">—</option>${cls.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div></div>
    <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap"><input class="inp" style="flex:2;min-width:150px" id="cd-x-fprod" placeholder="${esc(t("cd_fefo_product"))}"><input class="inp" style="width:100px" type="number" id="cd-x-fqty" placeholder="${esc(t("zd_qty"))}"><button class="btn btn-o btn-sm" onclick="cdFefo()"><i class="ti ti-sort-ascending"></i> FEFO</button></div>
    <div id="cd-x-lots" style="max-height:300px;overflow:auto"></div><div class="err-box" id="cd-x-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cd-exit')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitCdExit()"><i class="ti ti-check"></i> ${esc(t("cd_validate_exit"))}</button></div>`,760);
  cdLoadExitLots();
}
function cdExitReason(){document.getElementById("cd-x-sale").style.display=zdVal("cd-x-reason")==="sale"?"grid":"none";}
async function cdLoadExitLots(){
  const r=await api("GET",`/cold/lots?client_id=${zdVal("cd-x-client")}`);_cd.exitLots=r.lots;_cd.exitSel={};
  document.getElementById("cd-x-lots").innerHTML=r.lots.map(l=>`<div class="rs-payline"><span style="flex:1"><b>${esc(l.product)}</b> <span class="mono" style="font-size:11px;color:var(--muted)">${esc(l.number)}</span><div style="font-size:11px;color:${l.expired?"var(--red)":"var(--muted)"}">${zdQty(l.qty)} ${esc(l.unit)} · ${esc(l.expiry||"—")}${l.unit_price?` · ${zdMoney(l.unit_price)}`:""}</div></span>
    <input class="inp cd-x-q" data-id="${l.id}" type="number" min="0" max="${l.qty}" step="any" style="width:90px" placeholder="0"></div>`).join("")||zdEmpty(t("cd_no_lots"),"box");
}
async function cdFefo(){
  const p=zdVal("cd-x-fprod"),q=zdNum("cd-x-fqty");if(!p||!q)return;
  const cl=zdVal("cd-x-client");
  try{const r=await api("GET",`/cold/fefo?product=${encodeURIComponent(p)}&qty=${q}${cl!=="own"?`&client_id=${cl}`:""}`);
    document.querySelectorAll(".cd-x-q").forEach(i=>{const m=r.lines.find(x=>x.lot_id===i.dataset.id);i.value=m?m.qty:"";});
    if(r.missing>0)showToast(t("cd_fefo_missing").replace("{n}",zdQty(r.missing)),"error");}catch(e){showToast(e.message,"error");}
}
async function submitCdExit(){
  const lines=[...document.querySelectorAll(".cd-x-q")].filter(i=>parseFloat(i.value)>0).map(i=>({lot_id:i.dataset.id,qty:parseFloat(i.value)}));
  if(!lines.length){showErr("cd-x-err",t("cd_exit_missing"));return;}
  const reason=zdVal("cd-x-reason");const cl=zdVal("cd-x-client");
  const body={client_id:cl==="own"?null:cl,lines,reason,recipient:zdVal("cd-x-rec")||null,vehicle:zdVal("cd-x-veh")||null};
  if(reason==="sale")body.sale={method:zdVal("cd-x-method"),client_id:zdVal("cd-x-buyer")||null};
  try{const r=await api("POST","/cold/exits",body);zdCloseModal("modal-cd-exit");showToast(t("cd_exit_ok").replace("{n}",r.number)+(r.invoice_number?` · ${r.invoice_number} ${zdMoney(r.total)}`:""));cdPrintDoc(r.doc_id);}
  catch(e){showErr("cd-x-err",e.message);}
}
async function cdPrintDoc(id){
  try{const d=await api("GET",`/cold/documents/${id}`);const co=d.company||{};
    zdShowDoc(`<div style="color:#111;font-size:12px"><div style="display:flex;justify-content:space-between"><div><b style="font-size:16px">${esc(co.name||"")}</b><div>${esc(co.address||"")}</div><div>${esc(co.phone||"")}</div></div>
      <div style="text-align:right"><div style="font-size:20px;font-weight:800">${esc(d.title)}</div><div class="mono">${esc(d.number)}</div><div>${fmtDateTime(d.created_at)}</div></div></div><hr>
      <div style="display:flex;gap:30px;flex-wrap:wrap;margin:8px 0"><div><b>${esc(t("cd_owner"))}</b><br>${esc(d.client?.name||t("cd_own_stock"))}${d.client?.phone?"<br>"+esc(d.client.phone):""}</div><div><b>${esc(t("cd_room"))}</b><br>${esc(d.room||"")}</div>
      ${d.vehicle?`<div><b>${esc(t("cd_vehicle"))}</b><br>${esc(d.vehicle)}</div>`:""}${d.driver?`<div><b>${esc(t("cd_driver"))}</b><br>${esc(d.driver)}</div>`:""}${d.recipient?`<div><b>${esc(t("cd_recipient"))}</b><br>${esc(d.recipient)}</div>`:""}</div>
      <table class="doc-table" style="width:100%"><thead><tr><th>${esc(t("cd_lot"))}</th><th>${esc(t("cd_product"))}</th><th>${esc(t("zd_qty"))}</th><th>kg</th><th>${esc(t("cd_pallets"))}</th><th>${esc(t("cd_expiry"))}</th><th>°C</th></tr></thead><tbody>
      ${d.lines.map(l=>`<tr><td>${esc(l.lot)}${l.supplier_lot?" / "+esc(l.supplier_lot):""}</td><td>${esc(l.product)}</td><td>${zdQty(l.qty)} ${esc(l.unit)}</td><td>${zdQty(l.weight_kg)}</td><td>${zdQty(l.pallets)}</td><td>${esc(l.expiry||"")}</td><td>${l.temp??""}</td></tr>`).join("")}</tbody></table>
      ${d.note?`<p>${esc(d.note)}</p>`:""}<div style="display:flex;justify-content:space-between;margin-top:40px"><div>${esc(t("cd_sign_warehouse"))} (${esc(d.by_name||"")})</div><div>${esc(t("cd_sign_carrier"))}</div></div></div>`,d.number);
  }catch(e){showToast(e.message,"error");}
}
SECTOR_PAGE_LOADERS.coldmoves=async el=>{
  const docs=await api("GET","/cold/documents");
  el.innerHTML=sectorPageHead(esc(t("nav_cold_moves")),esc(t("cd_moves_sub")),
    `<button class="btn btn-g btn-sm" onclick="cdEntryModal()"><i class="ti ti-login"></i> ${esc(t("cd_entry"))}</button><button class="btn btn-o btn-sm" onclick="cdExitModal()"><i class="ti ti-logout"></i> ${esc(t("cd_exit"))}</button>`)+
    `<div class="card"><div class="table-wrap"><table><thead><tr><th>${esc(t("cd_doc"))}</th><th>${esc(t("fld_date"))}</th><th>${esc(t("cd_owner"))}</th><th>${esc(t("cd_lots"))}</th><th>${esc(t("zd_qty"))}</th><th>${esc(t("cd_pallets"))}</th><th>kg</th><th></th></tr></thead><tbody>
    ${docs.map(d=>`<tr><td><span class="badge ${d.kind==="BE"?"bg":"ba"}">${d.kind}</span> <span class="mono">${esc(d.number)}</span></td><td>${fmtDateTime(d.created_at)}</td><td>${esc(d.client_name||t("cd_own_stock"))}</td><td>${d.lines}</td><td class="mono">${zdQty(d.qty)}</td><td class="mono">${zdQty(d.pallets)}</td><td class="mono">${zdQty(d.kg)}</td>
      <td><button class="btn btn-o btn-sm" onclick="cdPrintDoc('${d.id}')"><i class="ti ti-printer"></i></button></td></tr>`).join("")||`<tr><td colspan="8">${zdEmpty(t("cd_no_docs"),"truck")}</td></tr>`}</tbody></table></div></div>`;
};

// ── HACCP ──
SECTOR_PAGE_LOADERS.coldhaccp=async el=>{
  const qs=new URLSearchParams();if(_cd.hFrom)qs.set("start",_cd.hFrom);if(_cd.hTo)qs.set("end",_cd.hTo);
  const h=await api("GET","/cold/haccp?"+qs);_cd.haccp=h;
  el.innerHTML=sectorPageHead(esc(t("nav_cold_haccp")),esc(t("cd_haccp_sub")),`<input class="inp" type="date" value="${h.start}" style="width:auto" onchange="_cd.hFrom=this.value;navigate('coldhaccp')"><input class="inp" type="date" value="${h.end}" style="width:auto" onchange="_cd.hTo=this.value;navigate('coldhaccp')">
    <button class="btn btn-o btn-sm" onclick="cdCheckModal()"><i class="ti ti-clipboard-check"></i> ${esc(t("cd_check"))}</button><button class="btn btn-o btn-sm" onclick="cdPrintHaccp()"><i class="ti ti-printer"></i></button>`)+
    `<div class="kgrid" style="margin-bottom:12px"><div class="kpi c"><div class="kl">${esc(t("cd_readings"))}</div><div class="kv">${h.summary.readings}</div></div><div class="kpi r"><div class="kl">${esc(t("cd_alerts"))}</div><div class="kv">${h.summary.alerts}</div></div>
      <div class="kpi a"><div class="kl">${esc(t("cd_without_action"))}</div><div class="kv">${h.summary.without_action}</div></div><div class="kpi p"><div class="kl">${esc(t("cd_days_without"))}</div><div class="kv">${h.summary.days_without_reading}</div></div></div>
    <div class="card" style="margin-bottom:12px"><div class="table-wrap">${cdHaccpTable(h)}</div></div>
    <div class="card"><b>${esc(t("cd_checks"))}</b>${h.checks.map(c=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--b);font-size:13px"><span><span class="badge ${c.result==="ok"?"bg":"br"}">${esc(t("cd_res_"+c.result))}</span> ${esc(t("cd_chk_"+c.kind))}${c.room?" · "+esc(c.room):""}${c.note?`<div style="font-size:11px;color:var(--muted)">${esc(c.note)}</div>`:""}</span><span style="font-size:11px;color:var(--muted)">${fmtDateTime(c.done_at)} · ${esc(c.by_name||"")}</span></div>`).join("")||zdEmpty(t("cd_no_checks"))}</div>`;
};
function cdHaccpTable(h){
  return `<table><thead><tr><th>${esc(t("cd_room"))}</th>${h.days.map(d=>`<th style="text-align:center">${d.slice(8)}/${d.slice(5,7)}</th>`).join("")}</tr></thead><tbody>${h.rooms.map(r=>`<tr><td><b>${esc(r.name)}</b><div style="font-size:10px;color:var(--muted)">${r.min_temp}° → ${r.max_temp}°</div></td>${r.days.map(d=>`<td style="text-align:center;font-size:11px;${d.alerts?"background:rgba(255,95,109,.12)":d.count?"":"background:rgba(245,166,35,.08)"}">${d.count?`${cdTemp(d.min)}<br>${cdTemp(d.max)}<br><span style="color:var(--muted)">${d.count}×</span>`:"—"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function cdCheckModal(){
  zdModal("modal-cd-check",`<div class="modal-title"><i class="ti ti-clipboard-check"></i> ${esc(t("cd_check"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("cd_check_kind"))}</label><select class="inp" id="cd-c-kind">${["cleaning","defrost","door_seal","calibration","pest_control","maintenance","other"].map(k=>`<option value="${k}">${esc(t("cd_chk_"+k))}</option>`).join("")}</select></div>
    <div class="fgrp"><label class="fl">${esc(t("cd_room"))}</label><select class="inp" id="cd-c-room"><option value="">${esc(t("cd_all_rooms"))}</option>${(_cd.haccp?.rooms||[]).map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join("")}</select></div></div>
    <div class="fgrp"><label class="fl">${esc(t("cd_result"))}</label><div class="rs-steps"><label class="toggle-btn"><input type="radio" name="cd-c-res" value="ok" checked> ${esc(t("cd_res_ok"))}</label><label class="toggle-btn"><input type="radio" name="cd-c-res" value="issue"> ${esc(t("cd_res_issue"))}</label></div></div>
    <div class="fgrp"><label class="fl">${esc(t("fld_notes"))}</label><textarea class="inp" id="cd-c-note" rows="2"></textarea></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cd-check')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitCdCheck()">${esc(t("btn_save"))}</button></div>`,480);
}
async function submitCdCheck(){try{await api("POST","/cold/checks",{kind:zdVal("cd-c-kind"),room_id:zdVal("cd-c-room")||null,result:document.querySelector("input[name=cd-c-res]:checked").value,note:zdVal("cd-c-note")||null});zdCloseModal("modal-cd-check");navigate("coldhaccp");}catch(e){showToast(e.message,"error");}}
function cdPrintHaccp(){const h=_cd.haccp;if(!h)return;const co=h.company||{};
  zdShowDoc(`<div style="color:#111;font-size:11px"><b style="font-size:15px">${esc(co.name||"")}</b><div style="font-size:18px;font-weight:800;margin:6px 0">${esc(t("cd_haccp_title"))}</div><div>${esc(h.start)} → ${esc(h.end)}</div><br>${cdHaccpTable(h)}<br>
    <b>${esc(t("cd_checks"))}</b>${h.checks.map(c=>`<div>${fmtDateTime(c.done_at)} — ${esc(t("cd_chk_"+c.kind))}${c.room?" ("+esc(c.room)+")":""} : ${esc(t("cd_res_"+c.result))}${c.note?" — "+esc(c.note):""} · ${esc(c.by_name||"")}</div>`).join("")}</div>`,"HACCP");}

// ── Facturation de l'entreposage ──
SECTOR_PAGE_LOADERS.coldbilling=async el=>{
  const [cl,hist]=await Promise.all([api("GET","/cold/clients"),api("GET","/cold/billing")]);_cd.billClients=cl;
  const mode=tf=>`${zdMoney(tf.rate)} / ${esc(t("cd_mode_"+tf.mode))}`;
  el.innerHTML=sectorPageHead(esc(t("nav_cold_billing")),esc(t("cd_billing_sub")),rsIsManager()?`<button class="btn btn-o btn-sm" onclick="cdTariffModal('default')"><i class="ti ti-tag"></i> ${esc(t("cd_default_tariff"))} · ${mode(cl.default_tariff)}</button>`:"")+
    `<div class="card" style="margin-bottom:12px"><div class="table-wrap"><table><thead><tr><th>${esc(t("rs_customer"))}</th><th>${esc(t("cd_lots"))}</th><th>${esc(t("cd_pallets"))}</th><th>kg</th><th>${esc(t("cd_tariff"))}</th><th>${esc(t("cd_billed_until"))}</th><th></th></tr></thead><tbody>
    ${cl.clients.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td>${c.lots}</td><td class="mono">${zdQty(c.pallets)}</td><td class="mono">${zdQty(c.kg)}</td><td style="font-size:12px">${mode(c.tariff)}${c.custom_tariff?"":` <span class="badge badge-gray">${esc(t("cd_default"))}</span>`}</td><td>${esc(c.billed_until||"—")}</td>
      <td style="white-space:nowrap">${rsIsManager()?`<button class="btn btn-o btn-sm" onclick="cdTariffModal('${c.id}')"><i class="ti ti-tag"></i></button> `:""}<button class="btn btn-g btn-sm" onclick="cdBillModal('${c.id}')"><i class="ti ti-file-invoice"></i> ${esc(t("cd_bill"))}</button></td></tr>`).join("")||`<tr><td colspan="7">${zdEmpty(t("cd_no_clients"),"users")}</td></tr>`}</tbody></table></div></div>
    <div class="card"><b>${esc(t("cd_billing_history"))}</b>${hist.map(h=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--b);font-size:13px;cursor:pointer" onclick="openInvoiceDoc('${h.invoice_id}')"><span>${esc(h.client_name||"")} · ${esc(h.period_from)} → ${esc(h.period_to)} · <span class="mono">${esc(h.invoice_number||"")}</span> <span class="badge ${h.invoice_status==="paid"?"bg":"ba"}">${esc(t("st_"+(h.invoice_status||"sent"))||h.invoice_status)}</span></span><b class="mono">${zdMoney(h.amount)}</b></div>`).join("")||zdEmpty(t("cd_no_billing"))}</div>`;
};
function cdTariffModal(id){
  const c=id==="default"?{name:t("cd_default_tariff"),tariff:_cd.billClients.default_tariff}:_cd.billClients.clients.find(x=>x.id===id);const tf=c.tariff;
  zdModal("modal-cd-tariff",`<div class="modal-title"><i class="ti ti-tag"></i> ${esc(t("cd_tariff"))} · ${esc(c.name)}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("cd_mode"))}</label><select class="inp" id="cd-t-mode">${["pallet_day","kg_day","unit_day","flat_month"].map(m=>`<option value="${m}"${tf.mode===m?" selected":""}>${esc(t("cd_mode_"+m))}</option>`).join("")}</select></div><div class="fgrp"><label class="fl">${esc(t("cd_rate"))} *</label><input class="inp" type="number" min="0" step="0.001" id="cd-t-rate" value="${tf.rate}"></div></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("cd_h_in"))}</label><input class="inp" type="number" min="0" step="0.01" id="cd-t-in" value="${tf.handling_in||0}"></div><div class="fgrp"><label class="fl">${esc(t("cd_h_out"))}</label><input class="inp" type="number" min="0" step="0.01" id="cd-t-out" value="${tf.handling_out||0}"></div><div class="fgrp"><label class="fl">${esc(t("cd_min_amount"))}</label><input class="inp" type="number" min="0" step="0.01" id="cd-t-min" value="${tf.min_amount||0}"></div></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cd-tariff')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitCdTariff('${id}')">${esc(t("btn_save"))}</button></div>`,520);
}
async function submitCdTariff(id){try{await api("PUT",`/cold/tariffs/${id}`,{mode:zdVal("cd-t-mode"),rate:zdNum("cd-t-rate")||0,handling_in:zdNum("cd-t-in")||0,handling_out:zdNum("cd-t-out")||0,min_amount:zdNum("cd-t-min")||0});zdCloseModal("modal-cd-tariff");navigate("coldbilling");}catch(e){showToast(e.message,"error");}}
function cdBillModal(id){
  const c=_cd.billClients.clients.find(x=>x.id===id);const d=new Date();const first=new Date(d.getFullYear(),d.getMonth()-1,1),last=new Date(d.getFullYear(),d.getMonth(),0);
  let start=isoDate(first);
  if(c.billed_until){const x=new Date(c.billed_until+"T00:00:00");x.setDate(x.getDate()+1);start=isoDate(x);}
  let end=isoDate(last);
  if(end<start||end>zdToday())end=zdToday();
  if(start>end)start=end;
  zdModal("modal-cd-bill",`<div class="modal-title"><i class="ti ti-file-invoice"></i> ${esc(t("cd_bill"))} · ${esc(c.name)}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("cd_from"))}</label><input class="inp" type="date" id="cd-b-from" value="${start}" onchange="cdBillPreview('${id}')"></div><div class="fgrp"><label class="fl">${esc(t("cd_to"))}</label><input class="inp" type="date" id="cd-b-to" value="${end}" max="${zdToday()}" onchange="cdBillPreview('${id}')"></div></div>
    <div id="cd-b-prev"></div><div class="err-box" id="cd-b-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cd-bill')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitCdBill('${id}')"><i class="ti ti-check"></i> ${esc(t("cd_create_invoice"))}</button></div>`,620);
  cdBillPreview(id);
}
async function cdBillPreview(id){
  const box=document.getElementById("cd-b-prev");
  try{const p=await api("GET",`/cold/billing/preview?client_id=${id}&start=${zdVal("cd-b-from")}&end=${zdVal("cd-b-to")}`);showErr("cd-b-err","");
    box.innerHTML=`<div class="card2" style="padding:10px;border-radius:10px">${p.lines.map(l=>`<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--b)"><span>${esc(l.description)} · ${zdQty(l.qty)} × ${zdMoney(l.unit_price)}</span><b class="mono">${zdMoney(l.qty*l.unit_price)}</b></div>`).join("")||zdEmpty(t("cd_nothing_to_bill"))}
      <div style="display:flex;justify-content:space-between;font-weight:800;margin-top:6px"><span>${esc(t("inv_preview_total"))} (${p.days} ${esc(t("cd_days"))})</span><span class="mono">${zdMoney(p.total)}</span></div></div>`;}
  catch(e){box.innerHTML="";showErr("cd-b-err",e.message);}
}
async function submitCdBill(id){try{const r=await api("POST","/cold/billing/run",{client_id:id,start:zdVal("cd-b-from"),end:zdVal("cd-b-to")});zdCloseModal("modal-cd-bill");showToast(t("cd_invoice_ok").replace("{n}",r.number).replace("{v}",zdMoney(r.total)));navigate("coldbilling");}catch(e){showErr("cd-b-err",e.message);}}
