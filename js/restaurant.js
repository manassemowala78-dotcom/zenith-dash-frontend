// ── MODULE RESTAURANT (9.0) : salle, commandes, cuisine, carte, réservations ──
const _rs={floor:null,area:null,edit:false,menu:null,order:null,cat:null,search:"",tab:"menu",kitchenStation:"kitchen",kitchenCount:null,resaDay:null,menuTab:"menu",settings:null,pay:null,reportDay:null};
const RS_STATUS_COLORS={free:"var(--muted)",occupied:"var(--amber)",ready:"var(--green)",bill:"var(--blue)",reserved:"var(--purple)"};
function rsIsManager(){return !isTeamMember()||zdIsMgrRole();}
async function rsMenu(force){if(!_rs.menu||force)_rs.menu=await api("GET","/resto/menu");return _rs.menu;}

// ── Salle ──
SECTOR_PAGE_LOADERS.restofloor=async el=>{
  const f=await api("GET","/resto/floor");_rs.floor=f;
  const areas=["all",...f.areas];
  if(!areas.includes(_rs.area))_rs.area=f.areas[0]||"all";
  if(_rs.edit&&_rs.area==="all")_rs.area=f.areas[0]||"all";
  const tables=f.tables.filter(x=>_rs.area==="all"||x.area===_rs.area);
  const empty=!f.tables.length;
  el.innerHTML=sectorPageHead(esc(t("nav_resto_floor")),esc(t("rs_floor_sub").replace("{o}",f.stats.occupied).replace("{t}",f.stats.tables).replace("{c}",f.stats.covers)),
    `<button class="btn btn-o btn-sm" onclick="rsNewOrder('takeaway')"><i class="ti ti-shopping-bag"></i> ${esc(t("rs_takeaway"))}</button>
     <button class="btn btn-o btn-sm" onclick="rsNewOrder('delivery')"><i class="ti ti-motorbike"></i> ${esc(t("rs_delivery"))}</button>
     ${hasModule("bar")?`<button class="btn btn-o btn-sm" onclick="rsNewOrder('tab')"><i class="ti ti-notes"></i> ${esc(t("bar_new_tab"))}</button>`:""}
     ${rsIsManager()?`<button class="btn btn-sm ${_rs.edit?"btn-g":"btn-o"}" onclick="_rs.edit=!_rs.edit;navigate('restofloor')"><i class="ti ti-layout-board"></i> ${esc(t(_rs.edit?"rs_edit_done":"rs_edit_plan"))}</button>`:""}`)+
    (empty?`<div class="card" style="text-align:center;padding:26px"><i class="ti ti-armchair" style="font-size:34px;color:var(--muted)"></i><div style="margin:10px 0;color:var(--muted)">${esc(t("rs_no_tables"))}</div>
      ${rsIsManager()?`<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-g btn-sm" onclick="rsTableModal()"><i class="ti ti-plus"></i> ${esc(t("rs_add_table"))}</button></div>`:""}</div>`:
    `<div class="rs-areas">${areas.map(a=>`<button class="toggle-btn${_rs.area===a?" active":""}" onclick="_rs.area='${escJs(a)}';navigate('restofloor')">${esc(a==="all"?t("rs_all_areas"):a)}</button>`).join("")}
      ${_rs.edit?`<button class="btn btn-g btn-sm" style="margin-left:auto" onclick="rsTableModal()"><i class="ti ti-plus"></i> ${esc(t("rs_add_table"))}</button>`:""}</div>
     <div class="rs-legend">${["free","occupied","ready","bill","reserved"].map(s=>`<span><i style="background:${RS_STATUS_COLORS[s]}"></i>${esc(t("rs_st_"+s))}</span>`).join("")}</div>
     <div class="rs-floor${_rs.edit?" editing":""}${_rs.area==="all"?" rs-grid":""}" id="rs-floor">${tables.map(rsTableCard).join("")}</div>
     ${_rs.edit?`<div style="font-size:12px;color:var(--muted);margin-top:6px"><i class="ti ti-hand-move"></i> ${esc(t("rs_edit_hint"))}</div>`:""}`)+
    `<div class="card" style="margin-top:14px"><div style="font-weight:700;margin-bottom:8px"><i class="ti ti-list"></i> ${esc(t("rs_other_orders"))}</div>
      ${f.other_orders.length?`<div class="rs-orders">${f.other_orders.map(o=>`<button class="rs-ocard" onclick="rsOpenOrder('${o.id}')"><b>${esc(o.kind_label)}${o.customer_name?" · "+esc(o.customer_name):""}</b><span class="mono">${esc(o.number)}</span><span>${zdMoney(o.total)} · ${o.minutes_open} min</span>${o.counts.ready?`<span class="badge bg">${o.counts.ready} ${esc(t("rs_ready"))}</span>`:""}</button>`).join("")}</div>`:zdEmpty(t("rs_no_other_orders"),"receipt-off")}</div>`;
  if(_rs.edit)rsEnableDrag();
  sectorTimer("restofloor",()=>{if(!_rs.edit&&!document.querySelector("#modal-resto-order[style*='flex']"))SECTOR_PAGE_LOADERS.restofloor(el);},15000);
};
function rsTableCard(tb){
  const o=tb.order;const st=tb.status;
  return `<div class="rs-table rs-${st} ${tb.shape}" data-id="${tb.id}" style="--x:${tb.x}%;--y:${tb.y}%;--c:${RS_STATUS_COLORS[st]}" onclick="rsTableClick('${tb.id}')">
    <div class="rs-tname">${esc(tb.name)}</div>
    <div class="rs-tinfo"><i class="ti ti-users"></i> ${o?o.covers:tb.seats}${o?"":""}</div>
    ${o?`<div class="rs-ttot">${zdMoney(o.total)}</div><div class="rs-tmin">${o.minutes_open} min${o.counts.ready?` · <b>${o.counts.ready} ${esc(t("rs_ready"))}</b>`:""}</div>`:
      tb.reservation?`<div class="rs-tmin">${esc(tb.reservation.time)} · ${esc(tb.reservation.name)}</div>`:`<div class="rs-tmin">${esc(t("rs_st_free"))}</div>`}
  </div>`;
}
function rsTableClick(id){
  if(_rs.edit){if(_rs.dragMoved){_rs.dragMoved=false;return;}rsTableModal(id);return;}
  const tb=_rs.floor.tables.find(x=>x.id===id);if(!tb)return;
  if(tb.order){rsOpenOrder(tb.order.id);return;}
  zdModal("modal-rs-open",`<div class="modal-title"><i class="ti ti-armchair" style="color:var(--green)"></i> ${esc(t("rs_open_table").replace("{t}",tb.name))}</div>
    ${tb.reservation?`<div class="alert-bar" style="margin-bottom:10px"><i class="ti ti-calendar-event"></i> ${esc(t("rs_reserved_for").replace("{n}",tb.reservation.name).replace("{h}",tb.reservation.time))}</div>`:""}
    <div class="fgrp"><label class="fl">${esc(t("rs_covers"))} *</label><div class="rs-steps">${[1,2,3,4,5,6,8,10].map(n=>`<button class="toggle-btn${n===(tb.reservation?.covers||Math.min(tb.seats,2))?" active":""}" onclick="document.getElementById('rs-open-cov').value=${n};this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('active'));this.classList.add('active')">${n}</button>`).join("")}</div>
      <input class="inp" type="number" min="1" max="200" id="rs-open-cov" value="${tb.reservation?.covers||Math.min(tb.seats,2)}" style="margin-top:6px"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-open')">${esc(t("btn_cancel"))}</button>
      <button class="btn btn-g btn-sm" onclick="submitRsOpenTable('${tb.id}','${tb.reservation?tb.reservation.id:""}')"><i class="ti ti-check"></i> ${esc(t("rs_open_btn"))}</button></div>`,420);
}
async function submitRsOpenTable(tableId,resaId){
  const covers=parseInt(zdVal("rs-open-cov"))||1;
  try{
    const o=resaId?await api("POST",`/resto/reservations/${resaId}/seat`,{table_id:tableId}):await api("POST","/resto/orders",{kind:"dine_in",table_id:tableId,covers});
    if(resaId&&covers!==o.covers)await api("PATCH",`/resto/orders/${o.id}`,{covers});
    zdCloseModal("modal-rs-open");rsOpenOrder(o.id);
  }catch(e){showToast(e.message,"error");}
}
function rsNewOrder(kind){
  const tab=kind==="tab";
  zdModal("modal-rs-open",`<div class="modal-title"><i class="ti ti-${kind==="delivery"?"motorbike":tab?"notes":"shopping-bag"}" style="color:var(--green)"></i> ${esc(t(tab?"bar_new_tab":kind==="delivery"?"rs_new_delivery":"rs_new_takeaway"))}</div>
    <div class="fgrp"><label class="fl">${esc(t(tab?"bar_tab_name":"rs_customer"))}${tab?" *":""}</label><input class="inp" id="rs-no-name" maxlength="200"></div>
    <div class="fgrp"><label class="fl">${esc(t("pb_phone"))}${kind==="delivery"?" *":""}</label><input class="inp" id="rs-no-phone" inputmode="tel" placeholder="+243 …"></div>
    ${kind==="delivery"?`<div class="fgrp"><label class="fl">${esc(t("rs_address"))} *</label><textarea class="inp" id="rs-no-addr" rows="2"></textarea></div>`:""}
    ${tab?`<div class="fgrp"><label class="fl">${esc(t("bar_tab_limit"))}</label><input class="inp" type="number" min="0" step="1" id="rs-no-limit" placeholder="${esc(t("bar_tab_limit_ph"))}"></div>`:""}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-open')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRsNewOrder('${kind}')"><i class="ti ti-check"></i> ${esc(t("rs_open_btn"))}</button></div>`,440);
}
async function submitRsNewOrder(kind){
  const body={kind,customer_name:zdVal("rs-no-name")||null,customer_phone:zdVal("rs-no-phone")||null};
  if(kind==="delivery")body.address=zdVal("rs-no-addr")||null;
  if(kind==="tab"){const l=zdNum("rs-no-limit");if(l)body.tab_limit=l;}
  try{
    const o=kind==="tab"&&hasModule("bar")?await api("POST","/bar/tabs",{name:body.customer_name||"",phone:body.customer_phone,limit:body.tab_limit??null}):await api("POST","/resto/orders",body);
    zdCloseModal("modal-rs-open");rsOpenOrder(o.id);
  }catch(e){showToast(e.message,"error");}
}
function rsTableModal(id){
  const tb=id?_rs.floor.tables.find(x=>x.id===id):null;
  zdModal("modal-rs-table",`<div class="modal-title"><i class="ti ti-armchair"></i> ${esc(t(tb?"rs_edit_table":"rs_add_table"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_name"))} *</label><input class="inp" id="rs-tb-name" maxlength="40" value="${esc(tb?.name||"")}" placeholder="T9"></div>
    <div class="fgrp"><label class="fl">${esc(t("rs_seats"))} *</label><input class="inp" type="number" min="1" max="50" id="rs-tb-seats" value="${tb?.seats||4}"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("rs_area"))}</label><input class="inp" id="rs-tb-area" list="rs-areas-list" value="${esc(tb?.area||(_rs.area!=="all"?_rs.area:"Salle"))}"><datalist id="rs-areas-list">${(_rs.floor?.areas||[]).map(a=>`<option value="${esc(a)}">`).join("")}</datalist></div>
    <div class="fgrp"><label class="fl">${esc(t("rs_shape"))}</label><select class="inp" id="rs-tb-shape">${["square","round","rect"].map(s=>`<option value="${s}"${tb?.shape===s?" selected":""}>${esc(t("rs_shape_"+s))}</option>`).join("")}</select></div></div>
    <div class="modal-footer">${tb?`<button class="btn btn-r btn-sm" style="margin-right:auto" onclick="rsDeleteTable('${tb.id}')"><i class="ti ti-trash"></i></button>`:""}<button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-table')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRsTable('${tb?tb.id:""}')">${esc(t("btn_save"))}</button></div>`,440);
}
async function submitRsTable(id){
  const body={name:zdVal("rs-tb-name"),seats:parseInt(zdVal("rs-tb-seats"))||4,area:zdVal("rs-tb-area")||"Salle",shape:zdVal("rs-tb-shape")};
  try{await api(id?"PATCH":"POST",id?`/resto/tables/${id}`:"/resto/tables",body);zdCloseModal("modal-rs-table");navigate("restofloor");}catch(e){showToast(e.message,"error");}
}
async function rsDeleteTable(id){if(!confirm(t("rs_confirm_delete_table")))return;try{await api("DELETE",`/resto/tables/${id}`);zdCloseModal("modal-rs-table");navigate("restofloor");}catch(e){showToast(e.message,"error");}}
function rsEnableDrag(){
  const floor=document.getElementById("rs-floor");if(!floor||window.innerWidth<=768)return;
  floor.querySelectorAll(".rs-table").forEach(card=>{
    card.addEventListener("pointerdown",ev=>{
      const rect=floor.getBoundingClientRect();const start={x:ev.clientX,y:ev.clientY};let moved=false;
      card.setPointerCapture(ev.pointerId);
      const move=e=>{if(Math.abs(e.clientX-start.x)+Math.abs(e.clientY-start.y)>4)moved=true;if(!moved)return;
        const x=Math.max(0,Math.min(92,(e.clientX-rect.left)/rect.width*100-4)),y=Math.max(0,Math.min(88,(e.clientY-rect.top)/rect.height*100-6));
        card.style.setProperty("--x",x+"%");card.style.setProperty("--y",y+"%");card.dataset.nx=x;card.dataset.ny=y;};
      const up=async()=>{card.removeEventListener("pointermove",move);card.removeEventListener("pointerup",up);
        if(moved){_rs.dragMoved=true;try{await api("PATCH",`/resto/tables/${card.dataset.id}`,{x:Math.round(card.dataset.nx*10)/10,y:Math.round(card.dataset.ny*10)/10});const tb=_rs.floor.tables.find(x=>x.id===card.dataset.id);if(tb){tb.x=+card.dataset.nx;tb.y=+card.dataset.ny;}}catch(e){showToast(e.message,"error");}}};
      card.addEventListener("pointermove",move);card.addEventListener("pointerup",up);
    });
  });
}

// ── Écran de commande ──
async function rsOpenOrder(id){
  try{_rs.order=await api("GET",`/resto/orders/${id}`);await rsMenu();}catch(e){showToast(e.message,"error");return;}
  if(!_rs.cat)_rs.cat=_rs.menu.categories[0]?.id||null;
  _rs.tab="menu";rsRenderOrder();
}
function rsRenderOrder(){
  const o=_rs.order;if(!o)return;
  const title=o.table_name?`${esc(t("rs_table"))} ${esc(o.table_name)}`:`${esc(o.kind_label)}${o.customer_name?" · "+esc(o.customer_name):""}`;
  const cats=_rs.menu.categories;
  const q=_rs.search.toLowerCase();
  const items=q?cats.flatMap(c=>c.items).filter(i=>i.name.toLowerCase().includes(q)):(cats.find(c=>c.id===_rs.cat)?.items||[]);
  const hh=_rs.menu.happy_hour;
  const closed=o.status!=="open";
  const linesHtml=o.lines.length?o.lines.map(l=>{
    const editable=l.status==="new"&&!closed;
    return `<div class="rs-line rs-l-${l.status}">
      <div style="flex:1;min-width:0"><div><b>${zdQty(l.qty)} × ${esc(l.name)}</b>${l.happy?` <span class="badge bp">HH</span>`:""}${l.seat?` <span class="badge badge-gray">P${l.seat}</span>`:""}</div>
        ${l.modifiers.length?`<div class="rs-mods">${l.modifiers.map(m=>esc(m.name)+(m.price?` (+${zdMoney(m.price)})`:"")).join(" · ")}</div>`:""}
        ${l.note?`<div class="rs-mods"><i class="ti ti-message"></i> ${esc(l.note)}</div>`:""}
        ${l.void_reason?`<div class="rs-mods" style="color:var(--red)">${esc(t("rs_voided"))} : ${esc(l.void_reason)}</div>`:""}</div>
      <div style="text-align:right"><div class="mono">${zdMoney(l.amount)}</div><span class="rs-chip rs-c-${l.status}">${esc(t("rs_ls_"+l.status))}${l.minutes!=null?` · ${l.minutes}′`:""}</span></div>
      ${!closed&&l.status!=="void"?`<div class="rs-lact">${editable?`<button class="btn btn-o btn-sm" onclick="rsLineQty('${l.id}',-1)">−</button><button class="btn btn-o btn-sm" onclick="rsLineQty('${l.id}',1)">+</button>`:""}
        ${l.status==="ready"?`<button class="btn btn-g btn-sm" onclick="rsLineStatus('${l.id}','served')" title="${esc(t("rs_ls_served"))}"><i class="ti ti-check"></i></button>`:""}
        ${(l.paid_qty||0)===0?`<button class="btn btn-o btn-sm" onclick="rsVoidLine('${l.id}','${l.status}')" title="${esc(t("rs_void"))}"><i class="ti ti-x"></i></button>`:""}</div>`:""}
    </div>`;}).join(""):zdEmpty(t("rs_order_empty"),"tools-kitchen-2");
  const html=`<div class="rs-ohead"><div><div style="font-weight:800;font-size:17px">${title}</div><div style="font-size:12px;color:var(--muted)"><span class="mono">${esc(o.number)}</span> · ${o.covers} ${esc(t("rs_covers_short"))} · ${esc(o.waiter_name||"")} · ${o.minutes_open} min${o.tab_limit?` · ${esc(t("bar_tab_limit"))} ${zdMoney(o.tab_limit)}`:""}</div></div>
      <button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-resto-order');if(document.getElementById('page-restofloor')?.classList.contains('active'))navigate('restofloor');if(document.getElementById('page-bartabs')?.classList.contains('active'))navigate('bartabs')"><i class="ti ti-x"></i></button></div>
    <div class="rs-otabs"><button class="toggle-btn${_rs.tab==="menu"?" active":""}" onclick="_rs.tab='menu';rsRenderOrder()">${esc(t("rs_tab_menu"))}</button><button class="toggle-btn${_rs.tab==="ticket"?" active":""}" onclick="_rs.tab='ticket';rsRenderOrder()">${esc(t("rs_tab_ticket"))} (${o.lines.filter(l=>l.status!=="void").length})</button></div>
    <div class="rs-ogrid rs-show-${_rs.tab}">
      <div class="rs-ocol rs-col-menu">${closed?zdEmpty(t("rs_order_closed"),"lock"):`
        ${hh.active?`<div class="alert-bar" style="margin-bottom:8px;border-color:var(--purple);color:var(--purple)"><i class="ti ti-clock-hour-5"></i> ${esc(t("bar_hh_on").replace("{p}",hh.discount_pct).replace("{h}",hh.until))}</div>`:""}
        <input class="inp" placeholder="${esc(t("rs_search_menu"))}" value="${esc(_rs.search)}" oninput="_rs.search=this.value;rsRenderOrder();const i=document.querySelector('#modal-resto-order .rs-col-menu input');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}" style="margin-bottom:8px">
        <div class="rs-cats">${cats.map(c=>`<button class="toggle-btn${c.id===_rs.cat&&!q?" active":""}" style="${c.color?`border-color:${c.color}`:""}" onclick="_rs.cat='${c.id}';_rs.search='';rsRenderOrder()">${esc(c.name)}</button>`).join("")}</div>
        <div class="rs-mbar"><button class="btn btn-o" onclick="_rs.tab='ticket';rsRenderOrder()"><i class="ti ti-receipt"></i> ${o.lines.filter(l=>l.status!=="void").length} · <b class="mono">${zdMoney(o.total)}</b></button>${o.counts.new?`<button class="btn btn-a" onclick="rsSend()"><i class="ti ti-send"></i> ${esc(t("rs_send"))} (${o.counts.new})</button>`:""}</div>
        <div class="rs-items">${items.map(i=>`<button class="pos-prod${i.available?"":" out"}" ${i.available?"":"disabled"} onclick="rsPickItem('${i.id}')"><span class="pn">${esc(i.name)}</span><span class="pp">${zdMoney(i.price)}</span>${i.modifiers.length?`<span class="ps"><i class="ti ti-adjustments"></i> ${esc(t("rs_options"))}</span>`:""}${i.available?"":`<span class="ps" style="color:var(--red)">${esc(t("rs_sold_out"))}</span>`}</button>`).join("")||zdEmpty(t("rs_no_items"))}</div>`}
      </div>
      <div class="rs-ocol rs-col-ticket">
        <div class="rs-lines">${linesHtml}</div>
        <div class="rs-totals">
          <div><span>${esc(t("rs_subtotal"))}</span><span class="mono">${zdMoney(o.subtotal)}</span></div>
          ${o.tax?`<div><span>${esc(t("rs_tax"))}</span><span class="mono">${zdMoney(o.tax)}</span></div>`:""}
          ${o.service?`<div><span>${esc(t("rs_service"))} (${o.service_pct} %)</span><span class="mono">${zdMoney(o.service)}</span></div>`:""}
          ${o.discount?`<div style="color:var(--amber)"><span>${esc(t("fld_discount"))}${o.discount_reason?" · "+esc(o.discount_reason):""}</span><span class="mono">−${zdMoney(o.discount)}</span></div>`:""}
          <div class="rs-total"><span>${esc(t("inv_preview_total"))}</span><span class="mono">${zdMoney(o.total)}</span></div>
          ${o.paid?`<div style="color:var(--green)"><span>${esc(t("rs_paid"))}</span><span class="mono">${zdMoney(o.paid)}</span></div><div style="font-weight:700"><span>${esc(t("rs_due"))}</span><span class="mono">${zdMoney(o.due)}</span></div>`:""}
          ${o.tips?`<div style="color:var(--muted);font-size:12px"><span>${esc(t("rs_tips"))}</span><span class="mono">${zdMoney(o.tips)}</span></div>`:""}
        </div>
        ${closed?`<div style="text-align:center;margin-top:10px"><span class="badge ${o.status==="paid"?"bg":"badge-gray"}">${esc(t("rs_os_"+o.status))}</span></div>`:`
        <div class="rs-actions">
          <button class="btn btn-a" ${o.counts.new?"":"disabled"} onclick="rsSend()"><i class="ti ti-send"></i> ${esc(t("rs_send"))}${o.counts.new?` (${o.counts.new})`:""}</button>
          <button class="btn btn-o" onclick="rsPrintBill()"><i class="ti ti-receipt"></i> ${esc(t("rs_bill"))}</button>
          <button class="btn btn-g" ${o.due>0?"":"disabled"} onclick="rsPayModal()"><i class="ti ti-cash"></i> ${esc(t("btn_pos_pay"))}</button>
          <button class="btn btn-o" onclick="rsMoreActions()"><i class="ti ti-dots"></i></button>
        </div>`}
      </div>
    </div>`;
  const ov=zdModal("modal-resto-order",html,1180);ov.classList.add("rs-order-overlay");
}
async function rsRefreshOrder(){_rs.order=await api("GET",`/resto/orders/${_rs.order.id}`);rsRenderOrder();}
function rsPickItem(id){
  const it=_rs.menu.categories.flatMap(c=>c.items).find(i=>i.id===id);if(!it)return;
  if(!it.modifiers.length){rsAddLines([{item_id:id,qty:1}]);return;}
  zdModal("modal-rs-item",`<div class="modal-title">${esc(it.name)} <span class="mono" style="margin-left:auto;color:var(--green)">${zdMoney(it.price)}</span></div>
    ${it.modifiers.map((g,gi)=>`<div class="fgrp"><label class="fl">${esc(g.name)}${g.min?" *":""} <span style="color:var(--muted);font-weight:400">${g.max>1?esc(t("rs_up_to").replace("{n}",g.max)):""}</span></label>
      <div class="rs-optgrid">${g.options.map((op,oi)=>`<label class="rs-opt"><input type="${g.max>1?"checkbox":"radio"}" name="rsg${gi}" data-g="${esc(g.name)}" data-o="${esc(op.name)}" data-max="${g.max}" onchange="rsOptLimit(this)"> ${esc(op.name)}${op.price?` <span class="mono">+${zdMoney(op.price)}</span>`:""}</label>`).join("")}</div></div>`).join("")}
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("zd_qty"))}</label><input class="inp" type="number" min="1" id="rs-it-qty" value="1"></div>
      <div class="fgrp"><label class="fl">${esc(t("rs_seat"))}</label><input class="inp" type="number" min="1" max="99" id="rs-it-seat" placeholder="—"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("rs_note_kitchen"))}</label><input class="inp" id="rs-it-note" maxlength="300" placeholder="${esc(t("rs_note_ph"))}"></div>
    <div class="err-box" id="rs-it-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-item')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRsItem('${it.id}')"><i class="ti ti-plus"></i> ${esc(t("btn_add"))}</button></div>`,480);
}
function rsOptLimit(inp){if(inp.type!=="checkbox")return;const max=+inp.dataset.max;const all=[...document.querySelectorAll(`#modal-rs-item input[name="${inp.name}"]:checked`)];if(all.length>max){inp.checked=false;showToast(t("rs_up_to").replace("{n}",max),"error");}}
async function submitRsItem(id){
  const mods=[...document.querySelectorAll("#modal-rs-item input:checked")].map(i=>({group:i.dataset.g,option:i.dataset.o}));
  const qty=parseFloat(zdVal("rs-it-qty"))||1,seat=parseInt(zdVal("rs-it-seat"))||null,note=zdVal("rs-it-note")||null;
  const ok=await rsAddLines([{item_id:id,qty,modifiers:mods,note,seat}],"rs-it-err");
  if(ok)zdCloseModal("modal-rs-item");
}
async function rsAddLines(lines,errId){
  try{_rs.order=await api("POST",`/resto/orders/${_rs.order.id}/lines`,{lines});rsRenderOrder();if(window.innerWidth<=768)showToast(t("rs_added"),"info");return true;}
  catch(e){if(errId)showErr(errId,e.message);else showToast(e.message,"error");return false;}
}
async function rsLineQty(id,d){
  const l=_rs.order.lines.find(x=>x.id===id);if(!l)return;
  const q=l.qty+d;
  try{if(q<=0)await api("POST",`/resto/lines/${id}/void`,{});else await api("PATCH",`/resto/lines/${id}`,{qty:q});await rsRefreshOrder();}catch(e){showToast(e.message,"error");}
}
async function rsLineStatus(id,st){try{await api("PATCH",`/resto/lines/${id}`,{status:st});await rsRefreshOrder();}catch(e){showToast(e.message,"error");}}
async function rsVoidLine(id,status){
  let reason=null;
  if(status!=="new"){reason=prompt(t("rs_void_reason"));if(reason===null)return;}
  try{await api("POST",`/resto/lines/${id}/void`,{reason});await rsRefreshOrder();}catch(e){showToast(e.message,"error");}
}
async function rsSend(){
  try{const r=await api("POST",`/resto/orders/${_rs.order.id}/send`);_rs.order=r;rsRenderOrder();showToast(t("rs_sent").replace("{n}",r.sent));
    if(r.tickets?.length&&localStorage.getItem("zd_rs_print_tickets")==="1")rsPrintKitchenTickets(r.tickets);}
  catch(e){showToast(e.message,"error");}
}
function rsPrintKitchenTickets(tickets){
  const html=tickets.map(tk=>`<div style="page-break-after:always;font-family:monospace;color:#000"><div style="font-size:18px;font-weight:800;text-align:center">${esc(t(tk.station==="bar"?"rs_bar_ticket":"rs_kitchen_ticket"))}</div>
    <div style="text-align:center">${esc(tk.table||"")} · ${esc(tk.order)} · ${tk.covers} ${esc(t("rs_covers_short"))}</div><div style="text-align:center">${new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})} · ${esc(tk.waiter||"")}</div><hr>
    ${tk.lines.map(l=>`<div style="font-size:15px;font-weight:700">${zdQty(l.qty)} × ${esc(l.name)}${l.seat?` (P${l.seat})`:""}</div>${l.modifiers.length?`<div>  ${l.modifiers.map(esc).join(", ")}</div>`:""}${l.note?`<div>  ⚠ ${esc(l.note)}</div>`:""}`).join("")}</div>`).join("");
  zdShowTicket(html,"cuisine");
}
async function rsPrintBill(){
  try{const b=await api("GET",`/resto/orders/${_rs.order.id}/bill`);const co=b.company||{};
    zdShowTicket(`<div style="font-family:monospace;color:#000;font-size:12px"><div style="text-align:center;font-weight:800;font-size:15px">${esc(co.name||"")}</div>${co.address?`<div style="text-align:center">${esc(co.address)}</div>`:""}${co.phone?`<div style="text-align:center">${esc(co.phone)}</div>`:""}
      <hr><div style="text-align:center;font-weight:700">${esc(t("rs_bill_title"))}</div><div>${esc(b.table_name?t("rs_table")+" "+b.table_name:b.kind_label)} · ${esc(b.number)}</div><div>${new Date().toLocaleString("fr-FR")}</div><hr>
      ${b.bill_lines.map(l=>`<div style="display:flex;justify-content:space-between"><span>${zdQty(l.qty)} ${esc(l.name)}</span><span>${zdMoney(l.amount)}</span></div>${l.modifiers.length?`<div style="padding-left:10px">${l.modifiers.map(esc).join(", ")}</div>`:""}`).join("")}
      <hr>${b.service?`<div style="display:flex;justify-content:space-between"><span>${esc(t("rs_service"))} ${b.service_pct} %</span><span>${zdMoney(b.service)}</span></div>`:""}
      ${b.discount?`<div style="display:flex;justify-content:space-between"><span>${esc(t("fld_discount"))}</span><span>−${zdMoney(b.discount)}</span></div>`:""}
      <div style="display:flex;justify-content:space-between;font-weight:800;font-size:15px"><span>${esc(t("inv_preview_total"))}</span><span>${zdMoney(b.total)}</span></div>
      ${b.paid?`<div style="display:flex;justify-content:space-between"><span>${esc(t("rs_paid"))}</span><span>${zdMoney(b.paid)}</span></div><div style="display:flex;justify-content:space-between;font-weight:700"><span>${esc(t("rs_due"))}</span><span>${zdMoney(b.due)}</span></div>`:""}
      ${b.covers>1?`<div style="margin-top:4px">${esc(t("rs_per_person").replace("{n}",b.covers))} : ${zdMoney(b.per_person)}</div>`:""}
      ${b.tip_suggestions?.length?`<div style="margin-top:6px">${esc(t("rs_tip_hint"))} : ${b.tip_suggestions.map(p=>`${p} % = ${zdMoney(b.total*p/100)}`).join(" · ")}</div>`:""}
      ${b.footer?`<hr><div style="text-align:center">${esc(b.footer)}</div>`:""}</div>`,b.number);
  }catch(e){showToast(e.message,"error");}
}
function rsMoreActions(){
  const o=_rs.order;const mgr=rsIsManager();
  zdModal("modal-rs-more",`<div class="modal-title"><i class="ti ti-dots"></i> ${esc(o.number)}</div>
    <div class="rs-more">
      <button class="btn btn-o" onclick="rsEditCovers()"><i class="ti ti-users"></i> ${esc(t("rs_change_covers"))}</button>
      <button class="btn btn-o" onclick="rsDiscount()"><i class="ti ti-discount-2"></i> ${esc(t("rs_discount"))}</button>
      ${o.kind==="dine_in"?`<button class="btn btn-o" onclick="rsTransfer()"><i class="ti ti-arrows-exchange"></i> ${esc(t("rs_transfer"))}</button><button class="btn btn-o" onclick="rsMerge()"><i class="ti ti-arrow-merge"></i> ${esc(t("rs_merge"))}</button>`:""}
      <button class="btn btn-o" onclick="rsNote()"><i class="ti ti-note"></i> ${esc(t("fld_notes"))}</button>
      <label class="btn btn-o" style="justify-content:flex-start"><input type="checkbox" ${localStorage.getItem("zd_rs_print_tickets")==="1"?"checked":""} onchange="localStorage.setItem('zd_rs_print_tickets',this.checked?'1':'0')"> ${esc(t("rs_auto_print"))}</label>
      <button class="btn btn-r" onclick="rsCancelOrder()"><i class="ti ti-trash"></i> ${esc(t("rs_cancel_order"))}</button>
    </div>${!mgr?`<div style="font-size:11px;color:var(--muted);margin-top:10px">${esc(t("rs_manager_hint"))}</div>`:""}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-more')">${esc(t("btn_close"))}</button></div>`,420);
}
async function rsPatchOrder(body){try{_rs.order=await api("PATCH",`/resto/orders/${_rs.order.id}`,body);zdCloseModal("modal-rs-more");rsRenderOrder();}catch(e){showToast(e.message,"error");}}
function rsEditCovers(){const v=prompt(t("rs_covers"),_rs.order.covers);if(v===null)return;const n=parseInt(v);if(n>0)rsPatchOrder({covers:n});}
function rsNote(){const v=prompt(t("fld_notes"),_rs.order.notes||"");if(v===null)return;rsPatchOrder({notes:v});}
function rsDiscount(){
  zdModal("modal-rs-more",`<div class="modal-title"><i class="ti ti-discount-2"></i> ${esc(t("rs_discount"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("rs_discount_amount"))} *</label><input class="inp" type="number" min="0" step="0.01" id="rs-disc" value="${_rs.order.discount||""}"></div>
    <div class="fgrp"><label class="fl">${esc(t("rs_discount_pct"))}</label><input class="inp" type="number" min="0" max="100" step="1" id="rs-disc-pct" oninput="document.getElementById('rs-disc').value=(${_rs.order.subtotal+_rs.order.service+_rs.order.tax}*(+this.value||0)/100).toFixed(2)"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("rs_discount_reason"))} *</label><input class="inp" id="rs-disc-r" maxlength="200" value="${esc(_rs.order.discount_reason||"")}" placeholder="${esc(t("rs_discount_reason_ph"))}"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-more')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRsDiscount()">${esc(t("btn_save"))}</button></div>`,440);
}
function submitRsDiscount(){rsPatchOrder({discount:zdNum("rs-disc")||0,discount_reason:zdVal("rs-disc-r")||null});}
async function rsTransfer(){
  const f=await api("GET","/resto/floor");const free=f.tables.filter(x=>!x.order);
  zdModal("modal-rs-more",`<div class="modal-title"><i class="ti ti-arrows-exchange"></i> ${esc(t("rs_transfer"))}</div><div class="rs-steps">${free.map(x=>`<button class="toggle-btn" onclick="rsDoTransfer('${x.id}')">${esc(x.name)}</button>`).join("")||esc(t("rs_no_free_table"))}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-more')">${esc(t("btn_cancel"))}</button></div>`,440);
}
async function rsDoTransfer(tid){try{_rs.order=await api("POST",`/resto/orders/${_rs.order.id}/transfer`,{table_id:tid});zdCloseModal("modal-rs-more");rsRenderOrder();showToast(t("rs_transferred"));}catch(e){showToast(e.message,"error");}}
async function rsMerge(){
  const list=(await api("GET","/resto/orders?status=open")).filter(x=>x.id!==_rs.order.id&&!x.paid);
  zdModal("modal-rs-more",`<div class="modal-title"><i class="ti ti-arrow-merge"></i> ${esc(t("rs_merge"))}</div><div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(t("rs_merge_hint"))}</div>
    <div class="rs-steps">${list.map(x=>`<button class="toggle-btn" onclick="rsDoMerge('${x.id}')">${esc(x.table_name||x.kind_label)} · ${zdMoney(x.total)}</button>`).join("")||esc(t("rs_nothing_to_merge"))}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-more')">${esc(t("btn_cancel"))}</button></div>`,440);
}
async function rsDoMerge(fid){try{_rs.order=await api("POST",`/resto/orders/${_rs.order.id}/merge`,{from_order_id:fid});zdCloseModal("modal-rs-more");rsRenderOrder();showToast(t("rs_merged"));}catch(e){showToast(e.message,"error");}}
async function rsCancelOrder(){
  if(!confirm(t("rs_confirm_cancel")))return;
  const sent=_rs.order.lines.some(l=>!["new","void"].includes(l.status));
  let reason="";if(sent){reason=prompt(t("rs_void_reason"))||"";if(!reason)return;}
  try{await api("POST",`/resto/orders/${_rs.order.id}/cancel`,{reason});zdCloseModal("modal-rs-more");zdCloseModal("modal-resto-order");showToast(t("rs_cancelled"));navigate(document.getElementById("page-bartabs")?.classList.contains("active")?"bartabs":"restofloor");}catch(e){showToast(e.message,"error");}
}

// ── Encaissement ──
function rsPayModal(){
  const o=_rs.order;
  _rs.pay={mode:"all",parts:2,method:"cash",tip:0,lines:{},client_id:o.client_id||"",booking_id:""};
  rsRenderPay();
  if(hasModule("hotel"))api("GET","/hotel/inhouse").then(r=>{_rs.inhouse=r;rsRenderPay();}).catch(()=>{});
  api("GET","/clients/").then(r=>{_rs.clients=Array.isArray(r)?r:(r.items||[]);}).catch(()=>{});
}
function rsPayAmount(){
  const o=_rs.order,p=_rs.pay;
  if(p.mode==="all")return o.due;
  if(p.mode==="split")return p.parts<=1?o.due:Math.round(o.due/p.parts*100)/100;
  if(p.mode==="amount")return Math.min(o.due,zdNum("rs-pay-amount")||0);
  const gross=o.lines.filter(l=>l.status!=="void").reduce((s,l)=>s+l.amount,0)||1;const f=o.total/gross;
  return Math.min(o.due,Math.round(o.lines.reduce((s,l)=>s+(p.lines[l.id]||0)*l.amount/l.qty*f,0)*100)/100);
}
function rsRenderPay(){
  const o=_rs.order,p=_rs.pay;const amt=rsPayAmount();
  const methods=zdMethodOptions(p.method,["account"].concat(hasModule("hotel")?["room"]:[]));
  const unpaid=o.lines.filter(l=>l.status!=="void"&&l.qty-(l.paid_qty||0)>0);
  const sugg=(_rs.settings?.tip_suggestions)||[];
  zdModal("modal-rs-pay",`<div class="modal-title"><i class="ti ti-cash" style="color:var(--green)"></i> ${esc(t("rs_pay_title"))} · ${esc(o.table_name||o.kind_label)} <span class="mono" style="margin-left:auto">${esc(t("rs_due"))} ${zdMoney(o.due)}</span></div>
    <div class="rs-steps" style="margin-bottom:10px">${["all","lines","split","amount"].map(m=>`<button class="toggle-btn${p.mode===m?" active":""}" onclick="_rs.pay.mode='${m}';rsRenderPay()">${esc(t("rs_pm_"+m))}</button>`).join("")}</div>
    ${p.mode==="lines"?`<div class="card2" style="padding:8px;border-radius:10px;margin-bottom:10px;max-height:220px;overflow:auto">${unpaid.map(l=>{const left=l.qty-(l.paid_qty||0);const v=p.lines[l.id]||0;return `<div class="rs-payline"><span style="flex:1">${esc(l.name)} <span style="color:var(--muted)">(${zdQty(left)})</span></span><span class="mono">${zdMoney(l.amount/l.qty)}</span>
      <button class="btn btn-o btn-sm" onclick="rsPayLine('${l.id}',-1,${left})">−</button><b style="min-width:22px;text-align:center">${zdQty(v)}</b><button class="btn btn-o btn-sm" onclick="rsPayLine('${l.id}',1,${left})">+</button></div>`;}).join("")||zdEmpty(t("rs_all_items_paid"))}</div>`:""}
    ${p.mode==="split"?`<div class="fgrp"><label class="fl">${esc(t("rs_split_parts"))}</label><div class="rs-steps">${[1,2,3,4,5,6,8,10].map(n=>`<button class="toggle-btn${p.parts===n?" active":""}" onclick="_rs.pay.parts=${n};rsRenderPay()">${n===1?esc(t("rs_last_part")):n}</button>`).join("")}</div></div>`:""}
    ${p.mode==="amount"?`<div class="fgrp"><label class="fl">${esc(t("rs_amount"))} *</label><input class="inp" type="number" min="0" step="0.01" id="rs-pay-amount" oninput="document.getElementById('rs-pay-amt').textContent=zdMoney(rsPayAmount());rsPayChange()"></div>`:""}
    <div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 12px"><span style="font-weight:700">${esc(t("rs_to_pay"))}</span><span id="rs-pay-amt" class="mono" style="font-size:24px;font-weight:800;color:var(--green)">${zdMoney(amt)}</span></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_payment_method"))}</label><select class="inp" id="rs-pay-method" onchange="_rs.pay.method=this.value;rsRenderPay()">${methods}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("rs_tip"))}</label><input class="inp" type="number" min="0" step="0.01" id="rs-pay-tip" value="${p.tip||""}" oninput="_rs.pay.tip=+this.value||0;rsPayChange()"><div class="rs-steps" style="margin-top:4px">${sugg.map(s=>`<button class="toggle-btn" style="padding:3px 8px;font-size:11px" onclick="_rs.pay.tip=Math.round(rsPayAmount()*${s})/100;document.getElementById('rs-pay-tip').value=_rs.pay.tip;rsPayChange()">${s} %</button>`).join("")}</div></div></div>
    ${p.method==="cash"?`<div class="fgrp"><label class="fl">${esc(t("pos_tendered"))}</label><input class="inp" type="number" min="0" step="0.01" id="rs-pay-tendered" oninput="rsPayChange()"><div id="rs-pay-change" style="font-weight:700;color:var(--amber);margin-top:6px"></div></div>`:""}
    ${p.method==="account"?`<div class="fgrp"><label class="fl">${esc(t("rs_bill_to"))} *</label><select class="inp" id="rs-pay-client" onchange="_rs.pay.client_id=this.value"><option value="">—</option>${(_rs.clients||[]).map(c=>`<option value="${c.id}"${c.id===p.client_id?" selected":""}>${esc(c.name)}</option>`).join("")}</select></div>`:""}
    ${p.method==="room"?`<div class="fgrp"><label class="fl">${esc(t("rs_room"))} *</label><select class="inp" id="rs-pay-room" onchange="_rs.pay.booking_id=this.value"><option value="">—</option>${(_rs.inhouse||[]).map(b=>`<option value="${b.id}"${b.id===p.booking_id?" selected":""}>${esc(b.room)} · ${esc(b.guest_name)}</option>`).join("")}</select></div>`:""}
    <div class="err-box" id="rs-pay-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-pay')">${esc(t("btn_cancel"))}</button><button class="btn btn-g" id="rs-pay-btn" onclick="submitRsPay()"><i class="ti ti-check"></i> ${esc(t("btn_pos_pay"))}</button></div>`,520);
  rsPayChange();
}
function rsPayLine(id,d,max){const p=_rs.pay;p.lines[id]=Math.max(0,Math.min(max,(p.lines[id]||0)+d));rsRenderPay();}
function rsPayChange(){const el=document.getElementById("rs-pay-change");if(!el)return;const tend=zdNum("rs-pay-tendered");const due=rsPayAmount()+(_rs.pay.tip||0);el.textContent=tend!=null&&tend>=due?`${t("pos_change")} ${zdMoney(tend-due)}`:"";}
async function submitRsPay(){
  const p=_rs.pay;const body={mode:p.mode,method:p.method,tip:p.tip||0};
  if(p.mode==="lines"){body.lines=Object.entries(p.lines).filter(([,q])=>q>0).map(([line_id,qty])=>({line_id,qty}));if(!body.lines.length){showErr("rs-pay-err",t("rs_pick_items"));return;}}
  if(p.mode==="split")body.parts=p.parts;
  if(p.mode==="amount"){body.amount=zdNum("rs-pay-amount");if(!body.amount){showErr("rs-pay-err",t("rs_amount_required"));return;}}
  if(p.method==="cash"){const tv=zdNum("rs-pay-tendered");if(tv!=null)body.tendered=tv;}
  if(p.method==="account")body.client_id=zdVal("rs-pay-client")||null;
  if(p.method==="room")body.booking_id=zdVal("rs-pay-room")||null;
  try{
    const r=await api("POST",`/resto/orders/${_rs.order.id}/pay`,body);
    zdCloseModal("modal-rs-pay");_rs.order=r.order;
    showToast(r.change!=null?`${t("rs_paid_ok")} · ${t("pos_change")} ${zdMoney(r.change)}`:t("rs_paid_ok"));
    if(r.order_status==="paid"){zdCloseModal("modal-resto-order");if(r.invoice_id&&confirm(t("rs_print_receipt_q")))zdShowReceipt(r.invoice_id);
      navigate(document.getElementById("page-bartabs")?.classList.contains("active")?"bartabs":"restofloor");}
    else{rsRenderOrder();if(r.invoice_id&&confirm(t("rs_print_receipt_q")))zdShowReceipt(r.invoice_id);}
  }catch(e){showErr("rs-pay-err",e.message);}
}

// ── Cuisine / bar ──
SECTOR_PAGE_LOADERS.restokitchen=async el=>{
  const k=await api("GET",`/resto/kitchen?station=${_rs.kitchenStation}`);
  const n=k.tickets.length;
  if(_rs.kitchenCount!=null&&n>_rs.kitchenCount)zdBeep();
  _rs.kitchenCount=n;
  const b=document.getElementById("kitchen-badge");if(b){b.textContent=k.counts.waiting;b.style.display=k.counts.waiting?"inline":"none";}
  el.innerHTML=sectorPageHead(esc(t("nav_resto_kitchen")),esc(t("rs_kitchen_sub").replace("{w}",k.counts.waiting).replace("{p}",k.counts.preparing).replace("{r}",k.counts.ready)),
    ["kitchen","bar","all"].map(s=>`<button class="btn btn-sm ${_rs.kitchenStation===s?"btn-g":"btn-o"}" onclick="_rs.kitchenStation='${s}';_rs.kitchenCount=null;navigate('restokitchen')">${esc(t("rs_station_"+s))}</button>`).join("")+
    `<button class="btn btn-o btn-sm" onclick="document.documentElement.requestFullscreen?.()"><i class="ti ti-maximize"></i></button>`)+
    (n?`<div class="rs-kds">${k.tickets.map(tk=>`<div class="rs-kt${tk.late?" late":""}${tk.all_ready?" done":""}">
      <div class="rs-kth"><b>${esc(tk.table||tk.kind_label)}</b><span class="mono">${tk.minutes}′</span></div>
      <div class="rs-ktsub">${esc(tk.number)} · ${tk.covers} ${esc(t("rs_covers_short"))} · ${esc(tk.waiter||"")}${tk.customer?" · "+esc(tk.customer):""}</div>
      ${tk.lines.map(l=>`<div class="rs-kl rs-l-${l.status}" onclick="rsKitchenLine('${l.id}','${l.status}')"><b>${zdQty(l.qty)} × ${esc(l.name)}</b>${l.seat?` <span class="badge badge-gray">P${l.seat}</span>`:""}
        ${l.modifiers.length?`<div class="rs-mods">${l.modifiers.map(m=>esc(m.name)).join(" · ")}</div>`:""}${l.note?`<div class="rs-mods" style="color:var(--amber)"><i class="ti ti-alert-triangle"></i> ${esc(l.note)}</div>`:""}
        <span class="rs-chip rs-c-${l.status}">${esc(t("rs_ls_"+l.status))}</span></div>`).join("")}
      <div style="display:flex;gap:6px;margin-top:8px">${tk.all_ready?`<button class="btn btn-o btn-sm" style="flex:1" onclick="rsBump('${tk.order_id}','served')"><i class="ti ti-check"></i> ${esc(t("rs_served_btn"))}</button>`:`<button class="btn btn-g btn-sm" style="flex:1" onclick="rsBump('${tk.order_id}','ready')"><i class="ti ti-bell-ringing"></i> ${esc(t("rs_ready_btn"))}</button>`}</div>
    </div>`).join("")}</div>`:`<div class="card">${zdEmpty(t("rs_kitchen_empty"),"chef-hat")}</div>`)+
    `<div style="font-size:12px;color:var(--muted);margin-top:8px">${esc(t("rs_kitchen_hint").replace("{m}",k.late_after_min))}</div>`;
  sectorTimer("restokitchen",()=>SECTOR_PAGE_LOADERS.restokitchen(el),8000);
};
async function rsKitchenLine(id,st){
  const next={sent:"preparing",preparing:"ready",ready:"served"}[st];if(!next)return;
  try{await api("PATCH",`/resto/lines/${id}`,{status:next});navigate("restokitchen");}catch(e){showToast(e.message,"error");}
}
async function rsBump(oid,status){try{await api("POST","/resto/kitchen/bump",{order_id:oid,station:_rs.kitchenStation,status});navigate("restokitchen");}catch(e){showToast(e.message,"error");}}

// ── Réservations ──
SECTOR_PAGE_LOADERS.restoresa=async el=>{
  if(!_rs.resaDay)_rs.resaDay=zdToday();
  const [r,s]=await Promise.all([api("GET",`/resto/reservations?day=${_rs.resaDay}&days=1`),api("GET","/resto/settings")]);_rs.settings=s;
  const d=new Date(_rs.resaDay+"T00:00:00");
  el.innerHTML=sectorPageHead(esc(t("nav_resto_resa")),esc(t("rs_resa_sub").replace("{n}",r.reservations.filter(x=>!["cancelled","no_show"].includes(x.status)).length).replace("{c}",r.covers)),
    `<button class="btn btn-o btn-sm" onclick="rsShareLinks()"><i class="ti ti-qrcode"></i> ${esc(t("rs_qr_links"))}</button><button class="btn btn-g btn-sm" onclick="rsResaModal()"><i class="ti ti-plus"></i> ${esc(t("rs_new_resa"))}</button>`)+
    `<div class="card" style="margin-bottom:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap"><button class="btn btn-o btn-sm" onclick="rsResaShift(-1)"><i class="ti ti-chevron-left"></i></button>
      <input class="inp" type="date" value="${_rs.resaDay}" style="width:auto" onchange="_rs.resaDay=this.value;navigate('restoresa')"><button class="btn btn-o btn-sm" onclick="rsResaShift(1)"><i class="ti ti-chevron-right"></i></button>
      <b style="margin-left:6px">${d.toLocaleDateString(State.lang==="ar"?"ar":State.lang,{weekday:"long",day:"numeric",month:"long"})}</b>
      ${_rs.resaDay!==zdToday()?`<button class="btn btn-o btn-sm" onclick="_rs.resaDay=zdToday();navigate('restoresa')">${esc(t("today"))}</button>`:""}</div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>${esc(t("rs_time"))}</th><th>${esc(t("fld_name"))}</th><th>${esc(t("rs_covers"))}</th><th>${esc(t("rs_table"))}</th><th>${esc(t("fld_status"))}</th><th></th></tr></thead><tbody>
      ${r.reservations.map(x=>`<tr style="${["cancelled","no_show"].includes(x.status)?"opacity:.5":""}"><td class="mono"><b>${esc(x.time)}</b></td><td><b>${esc(x.name)}</b>${x.phone?`<div style="font-size:11px"><a href="tel:${esc(x.phone)}">${esc(x.phone)}</a></div>`:""}${x.notes?`<div style="font-size:11px;color:var(--muted)">${esc(x.notes)}</div>`:""}${x.source==="online"?` <span class="badge bb">${esc(t("rs_online"))}</span>`:""}</td>
        <td>${x.covers}</td><td>${esc(x.table_name||"—")}</td><td><span class="badge ${x.status==="seated"?"bg":x.status==="confirmed"?"bb":["cancelled","no_show"].includes(x.status)?"br":"ba"}">${esc(t("rs_rs_"+x.status))}</span></td>
        <td style="white-space:nowrap">${["booked","confirmed"].includes(x.status)?`${x.status==="booked"?`<button class="btn btn-o btn-sm" title="${esc(t("rs_confirm"))}" onclick="rsResaStatus('${x.id}','confirmed')"><i class="ti ti-check"></i></button>`:""}
          <button class="btn btn-g btn-sm" title="${esc(t("rs_seat"))}" onclick="rsResaSeat('${x.id}','${x.table_id||""}')"><i class="ti ti-armchair"></i></button>
          <button class="btn btn-o btn-sm" title="${esc(t("rs_rs_no_show"))}" onclick="rsResaStatus('${x.id}','no_show')"><i class="ti ti-user-off"></i></button>
          <button class="btn btn-o btn-sm" title="${esc(t("btn_edit"))}" onclick="rsResaModal('${x.id}')"><i class="ti ti-pencil"></i></button>
          <button class="btn btn-o btn-sm" title="${esc(t("btn_cancel"))}" onclick="rsResaStatus('${x.id}','cancelled')"><i class="ti ti-x"></i></button>`:""}
          ${x.phone?`<a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc(x.phone.replace(/\D/g,""))}?text=${encodeURIComponent(t("rs_wa_confirm").replace("{n}",x.name).replace("{d}",x.day).replace("{h}",x.time).replace("{c}",x.covers))}"><i class="ti ti-brand-whatsapp"></i></a>`:""}</td></tr>`).join("")||`<tr><td colspan="6">${zdEmpty(t("rs_no_resa"),"calendar-off")}</td></tr>`}
    </tbody></table></div></div>`;
  _rs.resaList=r.reservations;
};
function rsResaShift(d){const x=new Date(_rs.resaDay+"T00:00:00");x.setDate(x.getDate()+d);_rs.resaDay=isoDate(x);navigate("restoresa");}
async function rsResaModal(id){
  const r=id?(_rs.resaList||[]).find(x=>x.id===id):null;
  const f=_rs.floor||await api("GET","/resto/floor");_rs.floor=f;
  zdModal("modal-rs-resa",`<div class="modal-title"><i class="ti ti-calendar-event" style="color:var(--green)"></i> ${esc(t(r?"rs_edit_resa":"rs_new_resa"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_name"))} *</label><input class="inp" id="rs-r-name" value="${esc(r?.name||"")}"></div>
    <div class="fgrp"><label class="fl">${esc(t("pb_phone"))}</label><input class="inp" id="rs-r-phone" inputmode="tel" value="${esc(r?.phone||"")}" placeholder="+243 …"></div></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("fld_date"))} *</label><input class="inp" type="date" id="rs-r-day" value="${r?.day||_rs.resaDay||zdToday()}"></div>
    <div class="fgrp"><label class="fl">${esc(t("rs_time"))} *</label><input class="inp" type="time" id="rs-r-time" value="${r?.time||"20:00"}"></div>
    <div class="fgrp"><label class="fl">${esc(t("rs_covers"))} *</label><input class="inp" type="number" min="1" id="rs-r-cov" value="${r?.covers||2}"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("rs_table"))}</label><select class="inp" id="rs-r-table"><option value="">${esc(t("rs_table_later"))}</option>${f.tables.map(x=>`<option value="${x.id}"${r?.table_id===x.id?" selected":""}>${esc(x.name)} · ${x.seats} ${esc(t("rs_seats_short"))} · ${esc(x.area)}</option>`).join("")}</select></div>
    <div class="fgrp"><label class="fl">${esc(t("fld_notes"))}</label><input class="inp" id="rs-r-notes" value="${esc(r?.notes||"")}" placeholder="${esc(t("rs_resa_notes_ph"))}"></div>
    <div class="err-box" id="rs-r-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-resa')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRsResa('${r?r.id:""}')">${esc(t("btn_save"))}</button></div>`,540);
}
async function submitRsResa(id){
  const body={name:zdVal("rs-r-name"),phone:zdVal("rs-r-phone")||null,day:zdVal("rs-r-day"),time:zdVal("rs-r-time"),covers:parseInt(zdVal("rs-r-cov"))||2,table_id:zdVal("rs-r-table")||null,notes:zdVal("rs-r-notes")||null};
  try{await api(id?"PATCH":"POST",id?`/resto/reservations/${id}`:"/resto/reservations",body);zdCloseModal("modal-rs-resa");_rs.resaDay=body.day;navigate("restoresa");showToast(t("rs_resa_saved"));}catch(e){showErr("rs-r-err",e.message);}
}
async function rsResaStatus(id,st){if(st==="cancelled"&&!confirm(t("rs_confirm_cancel_resa")))return;try{await api("PATCH",`/resto/reservations/${id}`,{status:st});navigate("restoresa");}catch(e){showToast(e.message,"error");}}
async function rsResaSeat(id,tableId){
  const f=await api("GET","/resto/floor");_rs.floor=f;
  const free=f.tables.filter(x=>!x.order);
  zdModal("modal-rs-resa",`<div class="modal-title"><i class="ti ti-armchair"></i> ${esc(t("rs_seat"))}</div><div class="rs-steps">${free.map(x=>`<button class="toggle-btn${x.id===tableId?" active":""}" onclick="rsDoSeat('${id}','${x.id}')">${esc(x.name)} (${x.seats})</button>`).join("")||esc(t("rs_no_free_table"))}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-resa')">${esc(t("btn_cancel"))}</button></div>`,440);
}
async function rsDoSeat(id,tid){try{const o=await api("POST",`/resto/reservations/${id}/seat`,{table_id:tid});zdCloseModal("modal-rs-resa");rsOpenOrder(o.id);}catch(e){showToast(e.message,"error");}}
async function rsShareLinks(){
  const s=_rs.settings||await api("GET","/resto/settings");
  zdModal("modal-rs-links",`<div class="modal-title"><i class="ti ti-qrcode"></i> ${esc(t("rs_qr_links"))}</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center"><div id="rs-qr" style="background:#fff;padding:8px;border-radius:8px"></div>
    <div style="flex:1;min-width:200px;font-size:13px"><div style="margin-bottom:6px">${esc(t("rs_qr_hint"))}</div>
      <div class="fgrp"><label class="fl">${esc(t("rs_menu_link"))}</label><input class="inp" readonly value="${esc(s.menu_url)}" onclick="this.select()"></div>
      <div class="fgrp"><label class="fl">${esc(t("rs_resa_link"))}</label><input class="inp" readonly value="${esc(s.reserve_url)}" onclick="this.select()"></div>
      <a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(t("rs_share_text")+" "+s.reserve_url)}"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a></div></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-links')">${esc(t("btn_close"))}</button></div>`,560);
  try{const q=qrcode(0,"M");q.addData(s.menu_url);q.make();document.getElementById("rs-qr").innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});const sv=document.querySelector("#rs-qr svg");if(sv){sv.style.width="160px";sv.style.height="160px";}}catch(_){}
}

// ── Carte, coût matière et réglages ──
SECTOR_PAGE_LOADERS.restomenu=async el=>{
  const mgr=rsIsManager();
  const tabs=`<div class="rs-steps" style="margin-bottom:12px">${["menu","costing","settings"].filter(x=>mgr||x==="menu").map(x=>`<button class="toggle-btn${_rs.menuTab===x?" active":""}" onclick="_rs.menuTab='${x}';navigate('restomenu')">${esc(t("rs_mtab_"+x))}</button>`).join("")}</div>`;
  if(_rs.menuTab==="costing"&&mgr){
    const c=await api("GET","/resto/costing");
    el.innerHTML=sectorPageHead(esc(t("nav_resto_menu")),esc(t("rs_costing_sub")))+tabs+
      `<div class="kgrid" style="margin-bottom:12px"><div class="kpi g"><div class="kl">${esc(t("rs_avg_food_cost"))}</div><div class="kv">${c.average_food_cost_pct!=null?c.average_food_cost_pct+" %":"—"}</div></div><div class="kpi r"><div class="kl">${esc(t("rs_above_35"))}</div><div class="kv">${c.above_35}</div></div></div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>${esc(t("rs_dish"))}</th><th>${esc(t("fld_price"))}</th><th>${esc(t("rs_cost"))}</th><th>${esc(t("rs_margin"))}</th><th>${esc(t("rs_food_cost"))}</th></tr></thead><tbody>
      ${c.items.map(i=>`<tr><td><b>${esc(i.name)}</b><div style="font-size:11px;color:var(--muted)">${i.no_recipe?`<span style="color:var(--amber)">${esc(t("rs_no_recipe"))}</span>`:i.recipe_lines.map(r=>`${esc(r.name)} ${zdQty(r.qty)} ${esc(r.unit)}`).join(" · ")}</div></td><td class="mono">${zdMoney(i.price)}</td><td class="mono">${zdMoney(i.cost)}</td><td class="mono">${zdMoney(i.margin)}</td>
        <td><span class="badge ${i.food_cost_pct==null||i.no_recipe?"badge-gray":i.food_cost_pct>35?"br":i.food_cost_pct>28?"ba":"bg"}">${i.food_cost_pct!=null&&!i.no_recipe?i.food_cost_pct+" %":"—"}</span></td></tr>`).join("")}</tbody></table></div>
      <div style="font-size:12px;color:var(--muted);margin-top:8px">${esc(t("rs_costing_hint"))}</div></div>`;
    return;
  }
  if(_rs.menuTab==="settings"&&mgr){
    const s=await api("GET","/resto/settings");_rs.settings=s;
    const days=[0,1,2,3,4,5,6];
    el.innerHTML=sectorPageHead(esc(t("nav_resto_menu")),esc(t("rs_settings_sub")))+tabs+
      `<div class="card"><div class="grid3"><div class="fgrp"><label class="fl">${esc(t("rs_service_pct"))}</label><input class="inp" type="number" min="0" max="30" step="0.5" id="rs-s-service" value="${s.service_pct}"></div>
        <div class="fgrp"><label class="fl">${esc(t("rs_delivery_fee"))}</label><input class="inp" type="number" min="0" step="0.5" id="rs-s-delivery" value="${s.delivery_fee}"></div>
        <div class="fgrp"><label class="fl">${esc(t("rs_late_min"))}</label><input class="inp" type="number" min="1" max="240" id="rs-s-late" value="${s.kitchen_late_min}"></div></div>
      <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("rs_open_time"))}</label><input class="inp" type="time" id="rs-s-open" value="${s.open}"></div>
        <div class="fgrp"><label class="fl">${esc(t("rs_close_time"))}</label><input class="inp" type="time" id="rs-s-close" value="${s.close}"></div>
        <div class="fgrp"><label class="fl">${esc(t("rs_tips_suggest"))}</label><input class="inp" id="rs-s-tips" value="${(s.tip_suggestions||[]).join(", ")}" placeholder="5, 10, 15"></div></div>
      <div class="fgrp"><label class="fl">${esc(t("rs_open_days"))}</label><div class="rs-steps">${days.map(d=>`<label class="toggle-btn" style="display:inline-flex;gap:4px;align-items:center"><input type="checkbox" class="rs-s-day" value="${d}" ${s.days.includes(d)?"checked":""}> ${esc(bkDayName(d).slice(0,3))}</label>`).join("")}</div></div>
      <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("rs_areas"))}</label><input class="inp" id="rs-s-areas" value="${esc((s.areas||[]).join(", "))}"></div>
        <div class="fgrp"><label class="fl">${esc(t("rs_slug"))}</label><input class="inp" id="rs-s-slug" value="${esc(s.slug||"")}"></div></div>
      <div class="fgrp"><label class="fl">${esc(t("rs_receipt_footer"))}</label><input class="inp" id="rs-s-footer" maxlength="300" value="${esc(s.receipt_footer||"")}"></div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin:6px 0 12px"><label><input type="checkbox" id="rs-s-pubmenu" ${s.public_menu?"checked":""}> ${esc(t("rs_public_menu"))}</label><label><input type="checkbox" id="rs-s-online" ${s.online_reservations?"checked":""}> ${esc(t("rs_online_resa"))}</label>
        <label>${esc(t("rs_max_online"))} <input class="inp" type="number" min="1" max="100" id="rs-s-maxcov" value="${s.max_online_covers}" style="width:80px;display:inline-block"></label></div>
      <button class="btn btn-g btn-sm" onclick="submitRsSettings()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button></div>`;
    return;
  }
  const m=await rsMenu(true);
  el.innerHTML=sectorPageHead(esc(t("nav_resto_menu")),esc(t("rs_menu_sub").replace("{n}",m.categories.reduce((s,c)=>s+c.items.length,0))),
    mgr?`<button class="btn btn-o btn-sm" onclick="rsCategoryModal()"><i class="ti ti-folder-plus"></i> ${esc(t("rs_new_category"))}</button><button class="btn btn-g btn-sm" onclick="rsItemModal()"><i class="ti ti-plus"></i> ${esc(t("rs_new_item"))}</button>`:"")+tabs+
    (m.categories.length?m.categories.map(c=>`<div class="card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:10px;height:10px;border-radius:50%;background:${c.color||"var(--muted)"}"></span><b>${esc(c.name)}</b><span class="badge badge-gray">${esc(t("rs_station_"+(c.station||"kitchen")))}</span>
        ${mgr&&c.id?`<button class="btn btn-o btn-sm" style="margin-left:auto" onclick="rsCategoryModal('${c.id}')"><i class="ti ti-pencil"></i></button>`:""}</div>
      ${c.items.map(i=>`<div class="rs-mitem"><div style="flex:1;min-width:0"><b>${esc(i.name)}</b>${i.modifiers.length?` <span class="badge bb">${i.modifiers.length} ${esc(t("rs_options"))}</span>`:""}${i.happy_price!=null?` <span class="badge bp">HH ${zdMoney(i.happy_price)}</span>`:""}
          ${i.description?`<div style="font-size:12px;color:var(--muted)">${esc(i.description)}</div>`:""}</div>
        <span class="mono" style="font-weight:700">${zdMoney(i.price)}</span>
        <label class="rs-avail" title="${esc(t("rs_available"))}"><input type="checkbox" ${i.available?"checked":""} onchange="rsToggleAvail('${i.id}',this.checked)"> <span>${esc(t(i.available?"rs_available":"rs_sold_out"))}</span></label>
        ${mgr?`<button class="btn btn-o btn-sm" onclick="rsItemModal('${i.id}')"><i class="ti ti-pencil"></i></button>`:""}</div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("rs_no_items"))}</div>`}</div>`).join(""):
      `<div class="card" style="text-align:center;padding:26px">${zdEmpty(t("rs_menu_empty"),"book-2")}${mgr?`<button class="btn btn-g btn-sm" onclick="rsItemModal()"><i class="ti ti-plus"></i> ${esc(t("rs_new_item"))}</button>`:""}</div>`);
};
async function submitRsSettings(){
  const body={service_pct:zdNum("rs-s-service")||0,delivery_fee:zdNum("rs-s-delivery")||0,kitchen_late_min:parseInt(zdVal("rs-s-late"))||20,open:zdVal("rs-s-open"),close:zdVal("rs-s-close"),
    tip_suggestions:zdVal("rs-s-tips").split(/[,;\s]+/).map(Number).filter(x=>x>0).slice(0,5),days:[...document.querySelectorAll(".rs-s-day:checked")].map(x=>+x.value),
    areas:zdVal("rs-s-areas").split(",").map(x=>x.trim()).filter(Boolean),receipt_footer:zdVal("rs-s-footer"),public_menu:document.getElementById("rs-s-pubmenu").checked,
    online_reservations:document.getElementById("rs-s-online").checked,max_online_covers:parseInt(zdVal("rs-s-maxcov"))||10};
  const slug=zdVal("rs-s-slug");if(slug&&slug!==_rs.settings?.slug)body.slug=slug;
  try{_rs.settings=await api("PUT","/resto/settings",body);showToast(t("rs_settings_saved"));}catch(e){showToast(e.message,"error");}
}
async function rsToggleAvail(id,on){try{await api("PATCH",`/resto/menu/items/${id}`,{available:on});_rs.menu=null;showToast(t(on?"rs_back_available":"rs_marked_sold_out"));navigate("restomenu");}catch(e){showToast(e.message,"error");navigate("restomenu");}}
function rsCategoryModal(id){
  const c=id?_rs.menu.categories.find(x=>x.id===id):null;
  zdModal("modal-rs-cat",`<div class="modal-title"><i class="ti ti-folder"></i> ${esc(t(c?"rs_edit_category":"rs_new_category"))}</div>
    <div class="fgrp"><label class="fl">${esc(t("fld_name"))} *</label><input class="inp" id="rs-c-name" value="${esc(c?.name||"")}" placeholder="${esc(t("rs_category_ph"))}"></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("rs_station"))}</label><select class="inp" id="rs-c-station">${["kitchen","bar","none"].map(s=>`<option value="${s}"${(c?.station||"kitchen")===s?" selected":""}>${esc(t("rs_station_"+s))}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("rs_color"))}</label><input class="inp" type="color" id="rs-c-color" value="${c?.color||"#f97316"}"></div></div>
    <div class="modal-footer">${c?`<button class="btn btn-r btn-sm" style="margin-right:auto" onclick="rsDeleteCategory('${c.id}')"><i class="ti ti-trash"></i></button>`:""}<button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-cat')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRsCategory('${c?c.id:""}')">${esc(t("btn_save"))}</button></div>`,440);
}
async function submitRsCategory(id){const body={name:zdVal("rs-c-name"),station:zdVal("rs-c-station"),color:zdVal("rs-c-color")};try{await api(id?"PATCH":"POST",id?`/resto/menu/categories/${id}`:"/resto/menu/categories",body);zdCloseModal("modal-rs-cat");_rs.menu=null;navigate("restomenu");}catch(e){showToast(e.message,"error");}}
async function rsDeleteCategory(id){if(!confirm(t("confirm_delete")))return;try{await api("DELETE",`/resto/menu/categories/${id}`);zdCloseModal("modal-rs-cat");navigate("restomenu");}catch(e){showToast(e.message,"error");}}
let _rsEdit=null;
async function rsItemModal(id){
  const m=await rsMenu();const it=id?m.categories.flatMap(c=>c.items).find(i=>i.id===id):null;
  const ing=await api("GET","/resto/ingredients");_rs.ingredients=ing.ingredients;
  _rsEdit={modifiers:JSON.parse(JSON.stringify(it?.modifiers||[])),recipe:JSON.parse(JSON.stringify(it?.recipe||[]))};
  zdModal("modal-rs-itemedit",`<div class="modal-title"><i class="ti ti-tools-kitchen-2"></i> ${esc(t(it?"rs_edit_item":"rs_new_item"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_name"))} *</label><input class="inp" id="rs-i-name" value="${esc(it?.name||"")}"></div>
      <div class="fgrp"><label class="fl">${esc(t("fld_price"))} *</label><input class="inp" type="number" min="0" step="0.01" id="rs-i-price" value="${it?.price??""}"></div></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("rs_category"))}</label><select class="inp" id="rs-i-cat">${m.categories.filter(c=>c.id).map(c=>`<option value="${c.id}"${it?.category_id===c.id?" selected":""}>${esc(c.name)}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("rs_course"))}</label><select class="inp" id="rs-i-course">${["starter","main","dessert","drink","other"].map(x=>`<option value="${x}"${(it?.course||"main")===x?" selected":""}>${esc(t("rs_course_"+x))}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("rs_prep_min"))}</label><input class="inp" type="number" min="0" id="rs-i-prep" value="${it?.prep_minutes||""}"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("rs_description"))}</label><input class="inp" id="rs-i-desc" maxlength="1000" value="${esc(it?.description||"")}"></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("rs_tax_rate"))}</label><input class="inp" type="number" min="0" max="100" id="rs-i-tax" value="${it?.tax_rate||0}"></div>
      ${hasModule("bar")?`<div class="fgrp"><label class="fl">${esc(t("bar_happy_price"))}</label><input class="inp" type="number" min="0" step="0.01" id="rs-i-happy" value="${it?.happy_price??""}"></div>`:""}
      <div class="fgrp"><label class="fl">${esc(t("rs_direct_product"))}</label><select class="inp" id="rs-i-product"><option value="">—</option>${_rs.ingredients.map(p=>`<option value="${p.id}"${it?.product_id===p.id?" selected":""}>${esc(p.name)} (${esc(p.unit)})</option>`).join("")}</select></div></div>
    ${hasModule("bar")?`<div class="fgrp"><label class="fl">${esc(t("bar_serve_qty"))}</label><input class="inp" type="number" min="0.001" step="0.001" id="rs-i-serve" value="${it?.serve_qty??1}"><div style="font-size:11px;color:var(--muted)">${esc(t("bar_serve_hint"))}</div></div>`:""}
    <div class="card2" style="padding:12px;border-radius:10px;margin-bottom:10px"><div style="display:flex;align-items:center;margin-bottom:6px"><b>${esc(t("rs_modifiers"))}</b><button class="btn btn-o btn-sm" style="margin-left:auto" onclick="rsModAdd()"><i class="ti ti-plus"></i> ${esc(t("rs_add_group"))}</button></div><div id="rs-mods-edit"></div></div>
    <div class="card2" style="padding:12px;border-radius:10px"><div style="display:flex;align-items:center;margin-bottom:6px"><b>${esc(t("rs_recipe"))}</b><button class="btn btn-o btn-sm" style="margin-left:auto" onclick="_rsEdit.recipe.push({product_id:'',qty:0});rsRenderRecipe()"><i class="ti ti-plus"></i> ${esc(t("rs_add_ingredient"))}</button></div><div id="rs-recipe-edit"></div><div id="rs-recipe-cost" style="font-size:12px;margin-top:6px"></div></div>
    <div class="err-box" id="rs-i-err"></div>
    <div class="modal-footer">${it?`<button class="btn btn-r btn-sm" style="margin-right:auto" onclick="rsDeleteItem('${it.id}')"><i class="ti ti-trash"></i></button>`:""}<button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-itemedit')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRsItemEdit('${it?it.id:""}')">${esc(t("btn_save"))}</button></div>`,680);
  rsRenderMods();rsRenderRecipe();
}
function rsModAdd(){_rsEdit.modifiers.push({name:"",min:0,max:1,options:[{name:"",price:0}]});rsRenderMods();}
function rsRenderMods(){
  const box=document.getElementById("rs-mods-edit");if(!box)return;
  box.innerHTML=_rsEdit.modifiers.map((g,gi)=>`<div style="border:1px solid var(--b);border-radius:8px;padding:8px;margin-bottom:6px">
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><input class="inp" style="flex:1;min-width:140px" placeholder="${esc(t("rs_group_ph"))}" value="${esc(g.name)}" oninput="_rsEdit.modifiers[${gi}].name=this.value">
      <label style="font-size:12px"><input type="checkbox" ${g.min>0?"checked":""} onchange="_rsEdit.modifiers[${gi}].min=this.checked?1:0"> ${esc(t("rs_required"))}</label>
      <label style="font-size:12px">${esc(t("rs_max_choices"))} <input class="inp" type="number" min="1" max="10" value="${g.max||1}" style="width:60px;display:inline-block" oninput="_rsEdit.modifiers[${gi}].max=+this.value||1"></label>
      <button class="btn btn-o btn-sm" onclick="_rsEdit.modifiers.splice(${gi},1);rsRenderMods()"><i class="ti ti-trash"></i></button></div>
    ${g.options.map((o,oi)=>`<div style="display:flex;gap:6px;margin-top:6px"><input class="inp" style="flex:1" placeholder="${esc(t("rs_option_ph"))}" value="${esc(o.name)}" oninput="_rsEdit.modifiers[${gi}].options[${oi}].name=this.value">
      <input class="inp" type="number" step="0.01" style="width:90px" placeholder="+0" value="${o.price||""}" oninput="_rsEdit.modifiers[${gi}].options[${oi}].price=+this.value||0">
      <button class="btn btn-o btn-sm" onclick="_rsEdit.modifiers[${gi}].options.splice(${oi},1);rsRenderMods()"><i class="ti ti-x"></i></button></div>`).join("")}
    <button class="btn btn-o btn-sm" style="margin-top:6px" onclick="_rsEdit.modifiers[${gi}].options.push({name:'',price:0});rsRenderMods()"><i class="ti ti-plus"></i> ${esc(t("rs_add_option"))}</button></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("rs_modifiers_hint"))}</div>`;
}
function rsRenderRecipe(){
  const box=document.getElementById("rs-recipe-edit");if(!box)return;
  box.innerHTML=_rsEdit.recipe.map((r,ri)=>`<div style="display:flex;gap:6px;margin-top:6px"><select class="inp" style="flex:1" onchange="_rsEdit.recipe[${ri}].product_id=this.value;rsRenderRecipe()"><option value="">—</option>${_rs.ingredients.map(p=>`<option value="${p.id}"${r.product_id===p.id?" selected":""}>${esc(p.name)} (${esc(p.unit)})</option>`).join("")}</select>
    <input class="inp" type="number" min="0" step="0.001" style="width:100px" value="${r.qty||""}" placeholder="${esc(t("zd_qty"))}" oninput="_rsEdit.recipe[${ri}].qty=+this.value||0;rsRecipeCost()"><button class="btn btn-o btn-sm" onclick="_rsEdit.recipe.splice(${ri},1);rsRenderRecipe()"><i class="ti ti-x"></i></button></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("rs_recipe_hint"))}</div>`;
  rsRecipeCost();
}
function rsRecipeCost(){const el=document.getElementById("rs-recipe-cost");if(!el)return;const cost=_rsEdit.recipe.reduce((s,r)=>{const p=_rs.ingredients.find(x=>x.id===r.product_id);return s+(p?(r.qty||0)*(p.cost_price||0):0);},0);const price=zdNum("rs-i-price")||0;
  el.innerHTML=cost?`${esc(t("rs_cost"))} <b class="mono">${zdMoney(cost)}</b>${price?` · ${esc(t("rs_food_cost"))} <b>${(cost/price*100).toFixed(1)} %</b>`:""}`:"";}
async function submitRsItemEdit(id){
  const body={name:zdVal("rs-i-name"),price:zdNum("rs-i-price"),category_id:zdVal("rs-i-cat")||null,course:zdVal("rs-i-course"),prep_minutes:parseInt(zdVal("rs-i-prep"))||0,
    description:zdVal("rs-i-desc")||null,tax_rate:zdNum("rs-i-tax")||0,product_id:zdVal("rs-i-product")||null,
    modifiers:_rsEdit.modifiers.map(g=>({...g,options:g.options.filter(o=>o.name.trim())})).filter(g=>g.name.trim()),recipe:_rsEdit.recipe.filter(r=>r.product_id&&r.qty>0)};
  if(document.getElementById("rs-i-happy")){const h=zdNum("rs-i-happy");if(h==null)body.clear_happy_price=true;else body.happy_price=h;}
  if(document.getElementById("rs-i-serve"))body.serve_qty=zdNum("rs-i-serve")||1;
  if(body.product_id==="")body.product_id=null;
  try{await api(id?"PATCH":"POST",id?`/resto/menu/items/${id}`:"/resto/menu/items",body);zdCloseModal("modal-rs-itemedit");_rs.menu=null;navigate("restomenu");showToast(t("rs_item_saved"));}catch(e){showErr("rs-i-err",e.message);}
}
async function rsDeleteItem(id){if(!confirm(t("confirm_delete")))return;try{await api("DELETE",`/resto/menu/items/${id}`);zdCloseModal("modal-rs-itemedit");_rs.menu=null;navigate("restomenu");}catch(e){showToast(e.message,"error");}}

// ── Stock cuisine ──
SECTOR_PAGE_LOADERS.restostock=async el=>{
  const r=await api("GET","/resto/ingredients");_rs.ingredients=r.ingredients;
  const low=_rs.stockLow;
  const list=r.ingredients.filter(i=>!low||i.low);
  el.innerHTML=sectorPageHead(esc(t("nav_resto_stock")),esc(t("rs_stock_sub").replace("{v}",zdMoney(r.total_value)).replace("{l}",r.low)),
    `<button class="btn btn-sm ${low?"btn-a":"btn-o"}" onclick="_rs.stockLow=!_rs.stockLow;navigate('restostock')"><i class="ti ti-alert-triangle"></i> ${esc(t("rs_low_only"))} (${r.low})</button>${rsIsManager()?`<button class="btn btn-g btn-sm" onclick="rsIngredientModal()"><i class="ti ti-plus"></i> ${esc(t("rs_new_ingredient"))}</button>`:""}`)+
    `<div class="card"><div class="table-wrap"><table><thead><tr><th>${esc(t("rs_ingredient"))}</th><th>${esc(t("rs_stock"))}</th><th>${esc(t("rs_min"))}</th><th>${esc(t("rs_unit_cost"))}</th><th>${esc(t("rs_value"))}</th><th>${esc(t("rs_used_in"))}</th><th></th></tr></thead><tbody>
    ${list.map(i=>`<tr><td><b>${esc(i.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(i.category||"")}</div></td><td class="mono" style="color:${i.low?"var(--red)":"var(--text)"}">${zdQty(i.stock_qty)} ${esc(i.unit)}${i.low?` <i class="ti ti-alert-triangle"></i>`:""}</td><td class="mono">${zdQty(i.stock_min)}</td><td class="mono">${zdMoney(i.cost_price)}</td><td class="mono">${zdMoney(i.value)}</td><td>${i.used_in}</td>
      <td style="white-space:nowrap"><button class="btn btn-g btn-sm" onclick="rsReceiveModal('${i.id}')" title="${esc(t("rs_receive"))}"><i class="ti ti-truck-loading"></i></button> <button class="btn btn-o btn-sm" onclick="rsWasteModal('${i.id}')" title="${esc(t("rs_waste"))}"><i class="ti ti-trash-x"></i></button></td></tr>`).join("")||`<tr><td colspan="7">${zdEmpty(t("rs_no_ingredients"),"basket")}</td></tr>`}
    </tbody></table></div><div style="font-size:12px;color:var(--muted);margin-top:8px">${esc(t("rs_stock_hint"))}</div></div>`;
};
function rsIngredientModal(){
  zdModal("modal-rs-ing",`<div class="modal-title"><i class="ti ti-basket"></i> ${esc(t("rs_new_ingredient"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_name"))} *</label><input class="inp" id="rs-g-name"></div><div class="fgrp"><label class="fl">${esc(t("fld_unit"))} *</label><input class="inp" id="rs-g-unit" value="kg" list="rs-units"><datalist id="rs-units">${["kg","g","l","cl","pcs","bouteille","casier","sac","boîte"].map(u=>`<option value="${u}">`).join("")}</datalist></div></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("rs_unit_cost"))}</label><input class="inp" type="number" min="0" step="0.01" id="rs-g-cost"></div><div class="fgrp"><label class="fl">${esc(t("rs_stock"))}</label><input class="inp" type="number" min="0" step="0.001" id="rs-g-stock"></div><div class="fgrp"><label class="fl">${esc(t("rs_min"))}</label><input class="inp" type="number" min="0" step="0.001" id="rs-g-min"></div></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-ing')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRsIngredient()">${esc(t("btn_save"))}</button></div>`,500);
}
async function submitRsIngredient(){try{await api("POST","/resto/ingredients",{name:zdVal("rs-g-name"),unit:zdVal("rs-g-unit")||"kg",cost_price:zdNum("rs-g-cost")||0,stock_qty:zdNum("rs-g-stock")||0,stock_min:zdNum("rs-g-min")||0});zdCloseModal("modal-rs-ing");navigate("restostock");}catch(e){showToast(e.message,"error");}}
function rsReceiveModal(id){
  const i=_rs.ingredients.find(x=>x.id===id);
  zdModal("modal-rs-ing",`<div class="modal-title"><i class="ti ti-truck-loading" style="color:var(--green)"></i> ${esc(t("rs_receive"))} · ${esc(i.name)}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("zd_qty"))} (${esc(i.unit)}) *</label><input class="inp" type="number" min="0" step="0.001" id="rs-rc-qty"></div><div class="fgrp"><label class="fl">${esc(t("rs_unit_cost"))}</label><input class="inp" type="number" min="0" step="0.01" id="rs-rc-cost" value="${i.cost_price||""}"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("fld_supplier"))}</label><input class="inp" id="rs-rc-sup"></div>
    <label style="font-size:13px"><input type="checkbox" id="rs-rc-exp"> ${esc(t("rs_record_expense"))}</label>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-ing')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRsReceive('${id}')">${esc(t("btn_save"))}</button></div>`,460);
}
async function submitRsReceive(id){try{await api("POST",`/resto/ingredients/${id}/receive`,{qty:zdNum("rs-rc-qty"),unit_cost:zdNum("rs-rc-cost"),supplier:zdVal("rs-rc-sup")||null,record_expense:document.getElementById("rs-rc-exp").checked});zdCloseModal("modal-rs-ing");showToast(t("rs_received"));navigate("restostock");}catch(e){showToast(e.message,"error");}}
function rsWasteModal(id){
  const i=_rs.ingredients.find(x=>x.id===id);
  zdModal("modal-rs-ing",`<div class="modal-title"><i class="ti ti-trash-x" style="color:var(--red)"></i> ${esc(t("rs_waste"))} · ${esc(i.name)}</div>
    <div class="fgrp"><label class="fl">${esc(t("zd_qty"))} (${esc(i.unit)}) *</label><input class="inp" type="number" min="0" step="0.001" id="rs-w-qty"></div>
    <div class="fgrp"><label class="fl">${esc(t("rs_waste_reason"))} *</label><input class="inp" id="rs-w-reason" placeholder="${esc(t("rs_waste_reason_ph"))}"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rs-ing')">${esc(t("btn_cancel"))}</button><button class="btn btn-r btn-sm" onclick="submitRsWaste('${id}')">${esc(t("btn_save"))}</button></div>`,460);
}
async function submitRsWaste(id){try{await api("POST",`/resto/ingredients/${id}/waste`,{qty:zdNum("rs-w-qty"),reason:zdVal("rs-w-reason")});zdCloseModal("modal-rs-ing");navigate("restostock");}catch(e){showToast(e.message,"error");}}

// ── Rapport du jour ──
SECTOR_PAGE_LOADERS.restoreport=async el=>{
  if(!_rs.reportDay)_rs.reportDay=zdToday();
  const r=await api("GET",`/resto/report?day=${_rs.reportDay}`);_rs.report=r;
  const bar=(list,key)=>{const mx=Math.max(1,...list.map(x=>x[key]));return list.map(x=>`<div style="margin:6px 0"><div style="display:flex;justify-content:space-between;font-size:12px"><span>${esc(x.name)}</span><span class="mono">${key==="qty"?zdQty(x.qty):zdMoney(x[key])}</span></div><div class="usage-bar"><div class="usage-bar-fill" style="width:${x[key]/mx*100}%"></div></div></div>`).join("");};
  el.innerHTML=sectorPageHead(esc(t("nav_resto_report")),esc(t("rs_report_sub")),`<input class="inp" type="date" value="${_rs.reportDay}" style="width:auto" onchange="_rs.reportDay=this.value;navigate('restoreport')"><button class="btn btn-o btn-sm" onclick="rsPrintZ()"><i class="ti ti-printer"></i> ${esc(t("rs_print_z"))}</button>`)+
    `<div class="kgrid"><div class="kpi g"><div class="kl">${esc(t("rs_revenue"))}</div><div class="kv">${zdMoney(r.revenue)}</div></div><div class="kpi b"><div class="kl">${esc(t("rs_bills"))}</div><div class="kv">${r.orders}</div></div>
      <div class="kpi c"><div class="kl">${esc(t("rs_covers"))}</div><div class="kv">${r.covers}</div></div><div class="kpi p"><div class="kl">${esc(t("rs_avg_ticket"))}</div><div class="kv">${zdMoney(r.avg_ticket)}</div></div>
      <div class="kpi a"><div class="kl">${esc(t("rs_tips"))}</div><div class="kv">${zdMoney(r.tips)}</div></div><div class="kpi r"><div class="kl">${esc(t("rs_food_cost"))}</div><div class="kv">${r.revenue?(r.food_cost/r.revenue*100).toFixed(1)+" %":"—"}</div></div></div>
    <div class="grid2" style="margin-top:14px"><div class="card"><b>${esc(t("rs_by_method"))}</b>${Object.entries(r.by_method).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b)"><span>${esc(t(k==="room"?"rs_pm_room":k==="account"?"rs_pm_account":"pay_method_"+k))}</span><b class="mono">${zdMoney(v)}</b></div>`).join("")||zdEmpty(t("rs_no_sales"))}</div>
      <div class="card"><b>${esc(t("rs_by_waiter"))}</b>${r.by_waiter.map(w=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b)"><span>${esc(w.name)} <span style="color:var(--muted);font-size:11px">${w.orders} · ${esc(t("rs_tips"))} ${zdMoney(w.tips)}</span></span><b class="mono">${zdMoney(w.amount)}</b></div>`).join("")||zdEmpty(t("rs_no_sales"))}</div>
      <div class="card"><b>${esc(t("rs_by_category"))}</b>${bar(r.by_category,"amount")||zdEmpty(t("rs_no_sales"))}</div>
      <div class="card"><b>${esc(t("rs_top_items"))}</b>${bar(r.top_items,"qty")||zdEmpty(t("rs_no_sales"))}</div>
      <div class="card"><b>${esc(t("rs_voids"))} (${r.voids.count} · ${zdMoney(r.voids.value)})</b>${r.voids.lines.map(v=>`<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--b)">${zdQty(v.qty)} × ${esc(v.name)} — ${esc(v.reason||"")} <span style="color:var(--muted)">(${esc(v.by||"")})</span></div>`).join("")||zdEmpty(t("rs_no_voids"),"check")}</div>
      <div class="card"><b>${esc(t("rs_other_figures"))}</b>${[["rs_discounts",zdMoney(r.discounts)],["rs_waste_value",zdMoney(r.waste.value)],["rs_room_charges",zdMoney(r.room_charges)],["rs_on_account",zdMoney(r.on_account)],["rs_cancelled_orders",r.cancelled],["rs_open_orders",r.open_orders],["rs_takeaway",r.by_kind.takeaway],["rs_delivery",r.by_kind.delivery]].map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b);font-size:13px"><span>${esc(t(k))}</span><b class="mono">${v}</b></div>`).join("")}</div></div>`;
};
function rsPrintZ(){
  const r=_rs.report;if(!r)return;const co=r.company||{};
  const row=(a,b)=>`<div style="display:flex;justify-content:space-between"><span>${a}</span><span>${b}</span></div>`;
  zdShowTicket(`<div style="font-family:monospace;color:#000;font-size:12px"><div style="text-align:center;font-weight:800">${esc(co.name||"")}</div><div style="text-align:center;font-weight:700">${esc(t("rs_z_title"))} — ${esc(r.day)}</div><hr>
    ${row(esc(t("rs_revenue")),zdMoney(r.revenue))}${row(esc(t("rs_bills")),r.orders)}${row(esc(t("rs_covers")),r.covers)}${row(esc(t("rs_avg_ticket")),zdMoney(r.avg_ticket))}${row(esc(t("rs_tips")),zdMoney(r.tips))}<hr>
    ${Object.entries(r.by_method).map(([k,v])=>row(esc(t(k==="room"?"rs_pm_room":k==="account"?"rs_pm_account":"pay_method_"+k)),zdMoney(v))).join("")}<hr>
    ${r.by_category.map(c=>row(esc(c.name)+" ("+zdQty(c.qty)+")",zdMoney(c.amount))).join("")}<hr>
    ${row(esc(t("rs_discounts")),zdMoney(r.discounts))}${row(esc(t("rs_voids")),r.voids.count+" · "+zdMoney(r.voids.value))}${row(esc(t("rs_waste_value")),zdMoney(r.waste.value))}
    <div style="margin-top:10px;text-align:center">${new Date().toLocaleString("fr-FR")}</div></div>`,"Z-"+r.day);
}

// ── Page publique : menu QR et réservation ──
async function checkRestoMenuView(){
  const q=new URLSearchParams(window.location.search);const slug=q.get("menu");if(!slug)return false;
  document.getElementById("auth-screen").style.display="none";document.getElementById("landing").style.display="none";
  let v=document.getElementById("sector-public-view");if(!v){v=document.createElement("div");v.id="sector-public-view";v.className="pub-view";document.body.appendChild(v);}
  v.style.display="block";
  try{const r=await fetch(`${API_BASE}/public/resto/${encodeURIComponent(slug)}`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"Erreur");_rs.pub={slug,data:d,showResa:q.get("reserver")==="1"};
    if(typeof ocLoadResto==="function")await ocLoadResto(slug,q.get("table"));}
  catch(e){v.innerHTML=`<div class="card" style="text-align:center;color:var(--red);margin:30px auto;max-width:480px">${esc(e.message)}</div>`;return true;}
  renderRestoPublic();return true;
}
function renderRestoPublic(){
  const v=document.getElementById("sector-public-view");const d=_rs.pub.data;
  v.innerHTML=`<div style="max-width:720px;margin:0 auto;padding:16px">
    <div style="text-align:center;margin:10px 0 18px">${d.logo_url?`<img src="${esc(d.logo_url)}" alt="" style="max-height:64px;max-width:180px;object-fit:contain;background:#fff;border-radius:8px;padding:4px">`:`<div style="font-size:34px">🍽️</div>`}
      <div style="font-size:22px;font-weight:800;margin-top:6px">${esc(d.name)}</div>${d.description?`<div style="font-size:13px;color:var(--muted);margin-top:4px">${esc(d.description)}</div>`:""}
      <div style="font-size:12px;color:var(--muted);margin-top:4px">${d.address?esc(d.address)+" · ":""}${esc(d.open)} – ${esc(d.close)}${d.phone?` · <a href="tel:${esc(d.phone)}">${esc(d.phone)}</a>`:""}</div>
      ${d.online_reservations&&!(typeof _ocp==="object"&&_ocp.table)?`<button class="btn btn-o" style="margin-top:12px" onclick="_rs.pub.showResa=!_rs.pub.showResa;renderRestoPublic()"><i class="ti ti-calendar-event"></i> ${esc(t("rs_pub_reserve"))}</button>`:""}</div>
    ${typeof ocRestoBanner==="function"?ocRestoBanner():""}
    ${_rs.pub.showResa&&d.online_reservations?`<div class="card" style="margin-bottom:14px" id="rs-pub-form"><div style="font-weight:700;margin-bottom:8px">${esc(t("rs_pub_reserve"))}</div>
      <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("pb_name"))} *</label><input class="inp" id="rp-name"></div><div class="fgrp"><label class="fl">${esc(t("pb_phone"))} *</label><input class="inp" id="rp-phone" inputmode="tel" placeholder="+243 …"></div></div>
      <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("fld_date"))} *</label><input class="inp" type="date" id="rp-day" min="${d.today}" value="${d.today}"></div><div class="fgrp"><label class="fl">${esc(t("rs_time"))} *</label><input class="inp" type="time" id="rp-time" value="20:00"></div><div class="fgrp"><label class="fl">${esc(t("rs_covers"))} *</label><input class="inp" type="number" min="1" max="${d.max_online_covers}" id="rp-cov" value="2"></div></div>
      <div class="fgrp"><label class="fl">${esc(t("fld_notes"))}</label><input class="inp" id="rp-notes" placeholder="${esc(t("rs_resa_notes_ph"))}"></div>
      <div class="err-box" id="rp-err"></div><button class="btn btn-g" style="width:100%" id="rp-btn" onclick="submitRestoPublicResa()"><i class="ti ti-check"></i> ${esc(t("pb_confirm"))}</button></div>`:""}
    ${d.public_menu?d.menu.map(c=>`<div class="card" style="margin-bottom:12px"><div style="font-weight:800;font-size:16px;margin-bottom:6px">${esc(c.name)}</div>${c.items.map(i=>`<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--b);${i.available?"":"opacity:.45"}"><div style="flex:1"><b>${esc(i.name)}</b>${i.available?"":` <span class="badge br">${esc(t("rs_sold_out"))}</span>`}${i.description?`<div style="font-size:12px;color:var(--muted)">${esc(i.description)}</div>`:""}${i.options.map(o=>`<div style="font-size:11px;color:var(--muted)">${esc(o.name)} : ${o.choices.map(esc).join(", ")}</div>`).join("")}</div><div style="text-align:right"><b class="mono">${zdMoney(i.price)}</b>${typeof ocRestoCan==="function"&&ocRestoCan()&&i.available&&i.id?`<div><button class="btn btn-g btn-sm" style="margin-top:4px" onclick="ocRestoAdd('${i.id}')"><i class="ti ti-plus"></i> ${esc(t("oc_add"))}</button></div>`:""}</div></div>`).join("")}</div>`).join(""):""}
    <div style="text-align:center;font-size:11px;color:var(--muted);margin:18px 0 80px">Zenith Dash</div></div>`;
  if(typeof ocRenderCartBar==="function")ocRenderCartBar();
}
async function submitRestoPublicResa(){
  const name=document.getElementById("rp-name"),phone=document.getElementById("rp-phone");
  const miss=[name,phone].filter(i=>!i.value.trim());if(miss.length){flagMissingFields(miss);return;}
  const btn=document.getElementById("rp-btn");btn.disabled=true;
  try{const r=await fetch(`${API_BASE}/public/resto/${encodeURIComponent(_rs.pub.slug)}/reservations`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.value.trim(),phone:phone.value.trim(),day:zdVal("rp-day"),time:zdVal("rp-time"),covers:parseInt(zdVal("rp-cov"))||2,notes:zdVal("rp-notes")||null})});
    const d=await r.json();if(!r.ok)throw new Error(typeof d.detail==="string"?d.detail:"Erreur");
    document.getElementById("rs-pub-form").innerHTML=`<div style="text-align:center;padding:16px"><i class="ti ti-circle-check" style="font-size:40px;color:var(--green)"></i><div style="font-weight:800;font-size:17px;margin-top:6px">${esc(t("rs_pub_done"))}</div><div style="color:var(--muted);margin-top:4px">${esc(t("rs_pub_done_detail").replace("{d}",d.day).replace("{h}",d.time).replace("{c}",d.covers))}</div></div>`;}
  catch(e){showErr("rp-err",e.message);btn.disabled=false;}
}
