// ── 10.5.0 · Bar : scan et carton, bouteilles gardées, soirées et liste d'invités, heures de pointe ──
MODULE_PAGES.resto.push(["restoevents","ticket","v5_t_events","sales"]);SECTOR_PAGE_MODULE.restoevents="resto";if(typeof PAGE_MODULES==="object")PAGE_MODULES.restoevents="sales";V5_HIDDEN.add("restoevents");
MODULE_PAGES.hotel.push(["hotelevents","ticket","v5_t_events","sales"]);SECTOR_PAGE_MODULE.hotelevents="hotel";if(typeof PAGE_MODULES==="object")PAGE_MODULES.hotelevents="sales";V5_HIDDEN.add("hotelevents");
function v5EventsPage(){return hasModule("bar")?"barevents":hasModule("resto")?"restoevents":"hotelevents";}
function v5EventsBack(){return hasModule("bar")?"bartools":hasModule("resto")?"restotools":"hoteltools";}

// ── Scan des codes-barres et vente au carton ──
SECTOR_PAGE_LOADERS.barscan=async el=>{
  const items=await api("GET","/bar/sheet/items");_v5.bs=items;const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_barscan"),t("v5_barscan_x"),`<button class="btn btn-g btn-sm" onclick="v5BsScan()"><i class="ti ti-scan"></i> ${esc(t("v5_scan"))}</button>`,"bartools")+
    `<div class="card"><div style="display:flex;gap:8px"><input class="inp" id="v5-bs-code" placeholder="${esc(t("v5_code_ph"))}" aria-label="${esc(t("v5_barcode"))}" onkeydown="if(event.key==='Enter')v5BsFind(this.value)"><button class="btn btn-o btn-sm" onclick="v5BsFind(zdVal('v5-bs-code'))">${esc(t("v5_find"))}</button></div><div id="v5-bs-hit" style="margin-top:10px"></div></div>`+
    (items.length?`<div class="card" style="margin-top:12px"><b>${esc(t("v5_bs_items"))}</b>${v5Table([t("v5_product"),t("v5_stock"),t("v5_barcode"),t("v5_carton"),""],
      items.map(i=>`<tr><td><b>${esc(i.name)}</b><div style="font-size:11px;color:var(--muted)">${zdMoney(i.sell_price)} · ${esc(t("v5_per_carton").replace("{n}",i.lot_units))}</div></td><td>${zdQty(i.stock)}</td>
        <td class="mono">${esc(i.barcode||"—")}</td><td>${i.lot_units>1?zdMoney(i.carton_price||i.lot_units*i.sell_price):"—"}</td>
        <td style="white-space:nowrap"><button class="btn btn-g btn-sm" onclick="v5BsShow('${i.id}')"><i class="ti ti-shopping-cart"></i></button>${mgr?` <button class="btn btn-o btn-sm" aria-label="${esc(t("btn_edit"))}" onclick="v5BsCodes('${i.id}')"><i class="ti ti-barcode"></i></button>`:""}</td></tr>`))}</div>`:v5Empty("v5_bs_none","bottle"));
};
function v5BsScan(){v5Scan(c=>{const i=document.getElementById("v5-bs-code");if(i)i.value=c;v5BsFind(c);},t("v5_scan"));}
async function v5BsFind(code){code=String(code||"").trim();if(!code)return;try{const i=await api("GET",`/bar/sheet/lookup?code=${encodeURIComponent(code)}`);const f=(_v5.bs||[]).find(x=>x.id===i.id);v5BsShow(i.id,f?{...i,stock:f.stock}:i);zdBeep();}catch(e){document.getElementById("v5-bs-hit").innerHTML=`<div class="card2" style="color:var(--red)">${esc(e.message)}</div>`;}}
function v5BsShow(id,it){
  const i=it||(_v5.bs||[]).find(x=>x.id===id);if(!i)return;const box=document.getElementById("v5-bs-hit");if(!box)return;
  const cp=i.carton_price||i.lot_units*i.sell_price;
  box.innerHTML=`<div class="card2 v5-hit"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b style="font-size:16px">${esc(i.name)}</b>${i.stock!=null?`<span>${esc(t("v5_stock"))} <b>${zdQty(i.stock)}</b></span>`:""}</div>
    <div class="grid2" style="margin-top:10px"><div><div class="fl">${esc(t("v5_units"))} · ${zdMoney(i.sell_price)}</div><div style="display:flex;gap:6px"><input class="inp" id="v5-bs-u" type="number" min="1" step="1" value="1" aria-label="${esc(t("v5_units"))}"><button class="btn btn-g btn-sm" onclick="v5BsSell('${i.id}',false)">${esc(t("v5_sell"))}</button></div></div>
      ${i.lot_units>1?`<div><div class="fl">${esc(t("v5_cartons"))} · ${zdMoney(cp)} (${i.lot_units})</div><div style="display:flex;gap:6px"><input class="inp" id="v5-bs-c" type="number" min="1" step="1" value="1" aria-label="${esc(t("v5_cartons"))}"><button class="btn btn-g btn-sm" onclick="v5BsSell('${i.id}',true)">${esc(t("v5_sell"))}</button></div></div>`:""}</div></div>`;
}
async function v5BsSell(id,carton){
  const n=parseInt(zdVal(carton?"v5-bs-c":"v5-bs-u"))||0;if(n<1)return;
  const r=await v5Do(()=>api("POST",carton?"/bar/sheet/sales/carton":"/bar/sheet/sales",carton?{item_id:id,cartons:n}:{item_id:id,qty:n}));
  if(r){showToast(t("v5_sold_x").replace("{v}",zdMoney(r.amount)));const i=(_v5.bs||[]).find(x=>x.id===id);if(i){i.stock=r.stock;}navigate("barscan");}
}
function v5BsCodes(id){
  const i=(_v5.bs||[]).find(x=>x.id===id);if(!i)return;
  zdModal("modal-v5-bsc",`<div class="modal-title"><i class="ti ti-barcode" style="color:var(--green)"></i> ${esc(i.name)}</div>
    <div class="fgrp"><label class="fl" for="v5-bsc-b">${esc(t("v5_barcode"))}</label><div style="display:flex;gap:6px"><input class="inp" id="v5-bsc-b" value="${esc(i.barcode||"")}" maxlength="80"><button class="btn btn-o btn-sm" aria-label="${esc(t("v5_scan"))}" onclick="v5Scan(c=>{document.getElementById('v5-bsc-b').value=c;},t('v5_scan'))"><i class="ti ti-scan"></i></button></div></div>
    <div class="fgrp"><label class="fl" for="v5-bsc-p">${esc(t("v5_carton_price"))} (${i.lot_units})</label><input class="inp" id="v5-bsc-p" type="number" min="0" step="0.01" value="${i.carton_price??""}" placeholder="${zdMoney(i.lot_units*i.sell_price)}"></div>
    <div class="err-box" id="v5-bsc-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-bsc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5BsCodesSave('${id}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,420);
}
async function v5BsCodesSave(id){if(await v5Do(()=>api("PUT",`/bar/sheet/items/${id}/codes`,{barcode:zdVal("v5-bsc-b")||null,carton_price:zdNum("v5-bsc-p")}),t("v5_saved"),"v5-bsc-err")){zdCloseModal("modal-v5-bsc");navigate("barscan");}}

// ── Bouteilles gardées (clients VIP) ──
const V5_BOT_ST={kept:"bg",finished:"",taken:"bb",discarded:"br"};
SECTOR_PAGE_LOADERS.barbottles=async el=>{
  _v5.bst=_v5.bst||"kept";const rows=await api("GET",`/bar/bottles?status=${_v5.bst}&q=${encodeURIComponent(_v5.bq||"")}`);_v5.bottles=rows;
  el.innerHTML=v5Head(t("v5_t_bottles"),t("v5_bottles_x"),`<button class="btn btn-g btn-sm" onclick="v5BottleModal()"><i class="ti ti-plus"></i> ${esc(t("v5_bottle_add"))}</button>`,"bartools")+
    `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">${["kept","finished","taken","all"].map(s=>`<button class="toggle-btn${_v5.bst===s?" active":""}" onclick="_v5.bst='${s}';navigate('barbottles')">${esc(t("v5_bst_"+s))}</button>`).join("")}
      <input class="inp" style="flex:1;min-width:160px" placeholder="${esc(t("v5_bottle_q"))}" aria-label="${esc(t("v5_bottle_q"))}" value="${esc(_v5.bq||"")}" onkeydown="if(event.key==='Enter'){_v5.bq=this.value;navigate('barbottles')}"></div>`+
    (rows.length?`<div class="v5-cards">${rows.map(b=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:6px"><b>${esc(b.label)}</b><span class="mono" style="font-size:11px">${esc(b.number)}</span></div>
        <div style="font-size:13px">${esc(b.owner)}${b.phone?` · ${esc(b.phone)}`:""}</div>
        <div class="v5-meter" style="margin:8px 0" role="img" aria-label="${esc(t("v5_glasses_left").replace("{n}",b.left).replace("{t}",b.glasses))}"><i style="width:${Math.round(b.left/b.glasses*100)}%;background:var(--green)"></i></div>
        <div style="font-size:12px;color:var(--muted)">${esc(t("v5_glasses_left").replace("{n}",b.left).replace("{t}",b.glasses))}${b.shelf?` · ${esc(t("v5_shelf"))} ${esc(b.shelf)}`:""}</div>
        <div style="font-size:12px;margin-top:2px">${esc(t("v5_kept_until"))} ${esc(v5Date(b.expiry_day))} ${b.expired?v5Badge(t("v5_expired"),"br"):""} ${v5Badge(t("v5_bst_"+b.status),V5_BOT_ST[b.status])}</div>
        ${b.status==="kept"?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${b.expired?"":`<button class="btn btn-g btn-sm" onclick="v5BottleServe('${b.id}',${b.left})"><i class="ti ti-glass-full"></i> ${esc(t("v5_serve"))}</button>`}
          <button class="btn btn-o btn-sm" onclick="v5BottleUpd('${b.id}',{extend_days:30})"><i class="ti ti-calendar-plus"></i> ${esc(t("v5_extend30"))}</button>
          <button class="btn btn-o btn-sm" onclick="v5BottleUpd('${b.id}',{status:'taken'},'${escJs(t("v5_taken_q"))}')"><i class="ti ti-door-exit"></i> ${esc(t("v5_taken"))}</button>
          ${b.phone?`<a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="${esc(v5Wa(b.phone,t("v5_bottle_wa").replace("{l}",b.label).replace("{n}",b.left).replace("{d}",v5Date(b.expiry_day))))}"><i class="ti ti-brand-whatsapp"></i></a>`:""}
          ${v5Mgr()?`<button class="btn btn-r btn-sm" aria-label="${esc(t("v5_discard"))}" onclick="v5BottleUpd('${b.id}',{status:'discarded'},'${escJs(t("v5_discard_bottle_q"))}')"><i class="ti ti-trash"></i></button>`:""}</div>`:""}</div>`).join("")}</div>`:v5Empty("v5_bottles_none","bottle"));
};
async function v5BottleModal(){
  const cl=await v5Clients();
  zdModal("modal-v5-bot",`<div class="modal-title"><i class="ti ti-bottle" style="color:var(--green)"></i> ${esc(t("v5_bottle_add"))}</div>
    <div class="fgrp"><label class="fl" for="v5-bt-c">${esc(t("v5_client_opt"))}</label><select class="inp" id="v5-bt-c" onchange="v5BottleClient(this.value)">${v5ClientOptions(cl)}</select></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-bt-o">${esc(t("v5_owner"))} *</label><input class="inp" id="v5-bt-o" maxlength="200"></div>
      <div class="fgrp"><label class="fl" for="v5-bt-p">${esc(t("v5_phone"))}</label><input class="inp" id="v5-bt-p" type="tel" maxlength="50"></div></div>
    <div class="fgrp"><label class="fl" for="v5-bt-l">${esc(t("v5_bottle_label"))} *</label><input class="inp" id="v5-bt-l" maxlength="200" placeholder="${esc(t("v5_bottle_label_ph"))}"></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-bt-g">${esc(t("v5_glasses"))}</label><input class="inp" id="v5-bt-g" type="number" min="1" max="200" value="20"></div>
      <div class="fgrp"><label class="fl" for="v5-bt-r">${esc(t("v5_glasses_now"))}</label><input class="inp" id="v5-bt-r" type="number" min="0" max="200" placeholder="${esc(t("v5_full"))}"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-bt-s">${esc(t("v5_shelf"))}</label><input class="inp" id="v5-bt-s" maxlength="40"></div>
      <div class="fgrp"><label class="fl" for="v5-bt-k">${esc(t("v5_keep_days"))}</label><input class="inp" id="v5-bt-k" type="number" min="1" max="730" value="90"></div></div>
    <div class="err-box" id="v5-bt-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-bot')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5BottleSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,460);
}
function v5BottleClient(id){const c=(_v5.clients||[]).find(x=>x.id===id);if(!c)return;document.getElementById("v5-bt-o").value=c.name||"";document.getElementById("v5-bt-p").value=c.phone||"";}
async function v5BottleSave(){
  const b={client_id:zdVal("v5-bt-c")||null,owner:zdVal("v5-bt-o"),phone:zdVal("v5-bt-p")||null,label:zdVal("v5-bt-l"),glasses:parseInt(zdVal("v5-bt-g"))||20,left:zdVal("v5-bt-r")===""?null:parseInt(zdVal("v5-bt-r")),shelf:zdVal("v5-bt-s")||null,keep_days:parseInt(zdVal("v5-bt-k"))||90};
  if(!b.owner||!b.label){v5Err("v5-bt-err",t("v5_owner_label"));return;}
  const r=await v5Do(()=>api("POST","/bar/bottles",b),null,"v5-bt-err");if(r){showToast(t("v5_bottle_saved").replace("{n}",r.number));zdCloseModal("modal-v5-bot");_v5.bst="kept";navigate("barbottles");}
}
async function v5BottleServe(id,left){const n=parseInt(prompt(t("v5_serve_q").replace("{n}",left),"1"));if(!n||n<1)return;if(await v5Do(()=>api("POST",`/bar/bottles/${id}/serve`,{glasses:n}),t("v5_served")))navigate("barbottles");}
async function v5BottleUpd(id,body,q){if(q&&!confirm(q))return;if(await v5Do(()=>api("PATCH",`/bar/bottles/${id}`,body),t("v5_saved")))navigate("barbottles");}

// ── Soirées, liste d'invités et contrôle à l'entrée ──
async function v5EventsLoad(el){
  const rows=await api("GET","/events");const pg=v5EventsPage();
  el.innerHTML=v5Head(t("v5_t_events"),t("v5_events_x"),`<button class="btn btn-g btn-sm" onclick="v5EventModal()"><i class="ti ti-plus"></i> ${esc(t("v5_event_add"))}</button>`,v5EventsBack())+
    (rows.length?`<div class="v5-cards">${rows.map(e=>`<button class="card v5-ev" onclick="v5EventOpen('${e.id}')"><b>${esc(e.title)}</b><small>${esc(v5Date(e.day))}${e.start?` · ${esc(e.start)}`:""}${e.price?` · ${zdMoney(e.price)}`:""}</small>
      <span style="font-size:12px">${esc(t("v5_ev_stats").replace("{g}",e.guests).replace("{p}",e.persons).replace("{a}",e.arrived))}${e.capacity?` / ${e.capacity}`:""}${e.vip?` · VIP ${e.vip}`:""}</span></button>`).join("")}</div>`:v5Empty("v5_events_none","ticket"));
  _v5.evPage=pg;
}
SECTOR_PAGE_LOADERS.barevents=v5EventsLoad;SECTOR_PAGE_LOADERS.restoevents=v5EventsLoad;SECTOR_PAGE_LOADERS.hotelevents=v5EventsLoad;
function v5EventModal(){
  zdModal("modal-v5-ev",`<div class="modal-title"><i class="ti ti-ticket" style="color:var(--green)"></i> ${esc(t("v5_event_add"))}</div>
    <div class="fgrp"><label class="fl" for="v5-ev-t">${esc(t("v5_event_title"))} *</label><input class="inp" id="v5-ev-t" maxlength="200"></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-ev-d">${esc(t("v5_date"))} *</label><input class="inp" id="v5-ev-d" type="date" value="${zdToday()}"></div>
      <div class="fgrp"><label class="fl" for="v5-ev-s">${esc(t("v5_hour"))}</label><input class="inp" id="v5-ev-s" type="time" value="21:00"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-ev-c">${esc(t("v5_capacity"))}</label><input class="inp" id="v5-ev-c" type="number" min="0" value="0"><small style="color:var(--muted)">${esc(t("v5_zero_unlimited"))}</small></div>
      <div class="fgrp"><label class="fl" for="v5-ev-p">${esc(t("v5_entry_price"))}</label><input class="inp" id="v5-ev-p" type="number" min="0" step="0.01" value="0"></div></div>
    <div class="fgrp"><label class="fl" for="v5-ev-n">${esc(t("v5_note"))}</label><input class="inp" id="v5-ev-n" maxlength="500"></div>
    <div class="err-box" id="v5-ev-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-ev')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5EventSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,460);
}
async function v5EventSave(){
  const b={title:zdVal("v5-ev-t"),day:zdVal("v5-ev-d"),start:zdVal("v5-ev-s")||null,capacity:parseInt(zdVal("v5-ev-c"))||0,price:zdNum("v5-ev-p")||0,note:zdVal("v5-ev-n")||null};
  if(!b.title||!b.day){v5Err("v5-ev-err",t("v5_event_title"));return;}
  const r=await v5Do(()=>api("POST","/events",b),t("v5_saved"),"v5-ev-err");if(r){zdCloseModal("modal-v5-ev");await v5EventsLoad(document.getElementById("page-"+v5EventsPage()));v5EventOpen(r.id);}
}
async function v5EventOpen(id,keep){
  const r=await api("GET",`/events/${id}/guests`);const e=r.event;_v5.ev=r;
  zdModal("modal-v5-evo",`<div class="modal-title"><i class="ti ti-ticket" style="color:var(--green)"></i> ${esc(e.title)} <small style="margin-left:auto;font-weight:400">${esc(v5Date(e.day))}</small></div>
    <div class="v5-kpis">${v5Kpi(t("v5_ev_guests"),e.guests)}${v5Kpi(t("v5_ev_persons"),e.persons+(e.capacity?` / ${e.capacity}`:""))}${v5Kpi(t("v5_ev_arrived"),e.arrived,"var(--green)")}</div>
    <div class="card2" style="margin:10px 0"><b>${esc(t("v5_door"))}</b><div style="display:flex;gap:6px;margin-top:6px"><input class="inp" id="v5-evc" inputmode="numeric" placeholder="${esc(t("v5_guest_code"))}" aria-label="${esc(t("v5_guest_code"))}" onkeydown="if(event.key==='Enter')v5EventCheck('${id}',this.value)">
      <button class="btn btn-o btn-sm" aria-label="${esc(t("v5_scan"))}" onclick="v5Scan(c=>v5EventCheck('${id}',c),t('v5_scan'))"><i class="ti ti-scan"></i></button><button class="btn btn-g btn-sm" onclick="v5EventCheck('${id}',zdVal('v5-evc'))">${esc(t("v5_let_in"))}</button></div><div id="v5-evc-r" style="margin-top:6px"></div></div>
    <details class="card2" id="v5-gs-d"${keep?" open":""}><summary style="cursor:pointer;font-weight:700">${esc(t("v5_guest_add"))}</summary>
      <div class="grid2" style="margin-top:8px"><div class="fgrp"><label class="fl" for="v5-gs-n">${esc(t("v5_name"))} *</label><input class="inp" id="v5-gs-n" maxlength="200"></div><div class="fgrp"><label class="fl" for="v5-gs-p">${esc(t("v5_phone"))}</label><input class="inp" id="v5-gs-p" type="tel" maxlength="50"></div></div>
      <div class="grid2"><div class="fgrp"><label class="fl" for="v5-gs-x">${esc(t("v5_ev_persons"))}</label><input class="inp" id="v5-gs-x" type="number" min="1" max="50" value="1"></div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><label class="terms-check" style="margin:0"><input type="checkbox" id="v5-gs-v"><span>VIP</span></label><label class="terms-check" style="margin:0"><input type="checkbox" id="v5-gs-pd"><span>${esc(t("v5_paid"))}</span></label></div></div>
      <div class="err-box" id="v5-gs-err"></div><button class="btn btn-g btn-sm" onclick="v5GuestSave('${id}')"><i class="ti ti-user-plus"></i> ${esc(t("v5_guest_add"))}</button></details>
    <div style="margin-top:10px;max-height:40vh;overflow:auto">${r.guests.length?r.guests.map(g=>`<div class="ht-bk" style="cursor:default;flex-wrap:wrap"><span style="flex:1;min-width:150px"><b>${esc(g.name)}</b> ${g.vip?v5Badge("VIP","bp"):""} ${g.paid?v5Badge(t("v5_paid"),"bg"):""}<div style="font-size:12px;color:var(--muted)">${esc(t("v5_code"))} <span class="mono">${esc(g.code)}</span> · ${g.checked_in}/${g.persons}</div></span>
      ${g.phone?`<a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="${esc(v5Wa(g.phone,t("v5_guest_wa").replace("{e}",e.title).replace("{d}",v5Date(e.day)).replace("{c}",g.code)))}" aria-label="WhatsApp"><i class="ti ti-brand-whatsapp"></i></a>`:""}
      ${g.checked_in<g.persons?`<button class="btn btn-g btn-sm" onclick="v5EventCheck('${id}',null,'${g.id}')"><i class="ti ti-door-enter"></i></button>`:`<span class="badge bg">${esc(t("v5_in"))}</span>`}</div>`).join(""):zdEmpty(t("v5_guests_none"),"users")}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-evo')">${esc(t("btn_close"))}</button></div>`,560);
  setTimeout(()=>document.getElementById("v5-evc")?.focus(),50);
}
async function v5GuestSave(id){
  const b={name:zdVal("v5-gs-n"),phone:zdVal("v5-gs-p")||null,persons:parseInt(zdVal("v5-gs-x"))||1,vip:document.getElementById("v5-gs-v").checked,paid:document.getElementById("v5-gs-pd").checked};
  if(!b.name){v5Err("v5-gs-err",t("v5_name"));return;}
  const r=await v5Do(()=>api("POST",`/events/${id}/guests`,b),null,"v5-gs-err");if(r){showToast(t("v5_guest_saved").replace("{c}",r.code));await v5EventOpen(id,true);document.getElementById("v5-gs-n")?.focus();}
}
async function v5EventCheck(id,code,gid){
  const box=document.getElementById("v5-evc-r");
  try{const r=await api("POST",`/events/${id}/checkin`,gid?{guest_id:gid}:{code});zdBeep();
    showToast(t("v5_welcome").replace("{n}",r.name)+(r.vip?" · VIP":""));await v5EventOpen(id);
    const b2=document.getElementById("v5-evc-r");if(b2)b2.innerHTML=`<div style="color:var(--green);font-weight:700"><i class="ti ti-circle-check"></i> ${esc(r.name)} ${r.vip?"· VIP":""} (${r.checked_in}/${r.persons}) ${r.paid?"":`<span style="color:var(--amber)">· ${esc(t("v5_not_paid"))}</span>`}</div>`;
  }catch(e){if(box)box.innerHTML=`<div style="color:var(--red);font-weight:700"><i class="ti ti-circle-x"></i> ${esc(e.message)}</div>`;}
}

// ── Heures de pointe et meilleures soirées ──
SECTOR_PAGE_LOADERS.baranalytics=async el=>{
  _v5.bad=_v5.bad||60;const r=await api("GET",`/bar/analytics?days=${_v5.bad}`);
  const mh=Math.max(1,...r.by_hour),mw=Math.max(1,...r.by_weekday);
  el.innerHTML=v5Head(t("v5_t_peak"),t("v5_peak_x"),[30,60,90].map(n=>`<button class="toggle-btn${_v5.bad===n?" active":""}" onclick="_v5.bad=${n};navigate('baranalytics')">${esc(t("v5_days").replace("{n}",n))}</button>`).join(""),"bartools")+
    `<div class="v5-kpis">${v5Kpi(t("v5_sales"),zdMoney(r.total),"var(--green)")}${v5Kpi(t("v5_peak_hour"),r.peak_hour==null?"—":`${String(r.peak_hour).padStart(2,"0")} h`)}</div>
    <div class="card" style="margin-top:12px"><b>${esc(t("v5_by_hour"))}</b><div class="v5-bars" role="img" aria-label="${esc(t("v5_by_hour"))}">${r.by_hour.map((v,h)=>`<div title="${h} h · ${zdMoney(v)}" style="height:${Math.max(2,Math.round(v/mh*100))}%;${h===r.peak_hour?"background:var(--amber)":""}"></div>`).join("")}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>23 h</span></div></div>
    <div class="grid2" style="margin-top:12px;align-items:start"><div class="card"><b>${esc(t("v5_by_weekday"))}</b>${r.by_weekday.map((v,d)=>`<div class="v5-hbar"><span>${esc(t("v5_wd_"+d))}</span><div><i style="width:${Math.round(v/mw*100)}%"></i></div><b>${zdMoney(v)}</b></div>`).join("")}</div>
      <div class="card"><b>${esc(t("v5_best_nights"))}</b>${r.best_nights.length?r.best_nights.map((x,i)=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${i+1}. ${esc(t("v5_wd_"+x.weekday))} ${esc(v5Date(x.day))}</span><b>${zdMoney(x.amount)}</b></div>`).join(""):zdEmpty(t("v5_nothing"))}</div></div>`;
};
