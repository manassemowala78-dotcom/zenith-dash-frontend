// ── MODULE SALON DE BEAUTÉ (9.0) ──
const _bt={day:null,agenda:null,services:null,staff:null,products:null,co:null,q:"",repDay:null,newAp:null};
const BT_ST_COL={booked:"var(--blue)",confirmed:"var(--cyan)",arrived:"var(--amber)",in_service:"var(--purple)",done:"var(--green)",cancelled:"var(--muted)",no_show:"var(--red)"};
async function btServices(force){if(!_bt.services||force)_bt.services=await api("GET","/beauty/services");return _bt.services;}
async function btStaff(force){if(!_bt.staff||force)_bt.staff=await api("GET","/beauty/staff");return _bt.staff;}
function btMin(hm){const [h,m]=hm.split(":").map(Number);return h*60+m;}

SECTOR_PAGE_LOADERS.beautyagenda=async el=>{
  if(!_bt.day)_bt.day=zdToday();
  const ag=await api("GET",`/beauty/agenda?day=${_bt.day}`);_bt.agenda=ag;
  const o=btMin(ag.open),c=btMin(ag.close),px=1.4;const mob=window.innerWidth<=768;
  const hours=[];for(let m=o;m<=c;m+=60)hours.push(m);
  const live=ag.appointments.filter(a=>!["cancelled","no_show"].includes(a.status));
  const grid=ag.staff.length?(mob?
    ag.staff.map(s=>`<div class="card" style="margin-bottom:10px;border-left:4px solid ${s.color||"var(--b)"}"><b>${esc(s.name)}</b>${live.filter(a=>a.staff_id===s.id).map(a=>btApptRow(a)).join("")||`<div style="font-size:12px;color:var(--muted);padding:6px 0">${esc(t("bt_free_day"))}</div>`}</div>`).join(""):
    `<div class="card" style="padding:8px;overflow-x:auto"><div class="bt-cal" style="grid-template-columns:50px repeat(${ag.staff.length},minmax(150px,1fr))">
      <div></div>${ag.staff.map(s=>`<div class="bt-colh" style="border-color:${s.color||"var(--b)"}">${esc(s.name)}</div>`).join("")}
      <div class="bt-hours" style="height:${(c-o)*px}px">${hours.map(m=>`<div style="top:${(m-o)*px}px">${min2hm(m)}</div>`).join("")}</div>
      ${ag.staff.map(s=>`<div class="bt-col" style="height:${(c-o)*px}px" onclick="if(event.target===this)btApptModal({staff_id:'${s.id}',time:btSlotFromClick(event,${o},${px})})">${hours.map(m=>`<div class="bt-line" style="top:${(m-o)*px}px"></div>`).join("")}
        ${live.filter(a=>a.staff_id===s.id).map(a=>`<div class="bt-ap" style="top:${(btMin(a.time)-o)*px}px;height:${Math.max(18,a.duration*px-2)}px;--c:${BT_ST_COL[a.status]}" onclick="btApptDetail('${a.id}')"><b>${esc(a.time)} ${esc(a.customer_name)}</b><span>${a.services.map(x=>esc(x.name)).join(", ")}</span>${a.allergies?`<i class="ti ti-alert-triangle" style="color:var(--red)" title="${esc(a.allergies)}"></i>`:""}</div>`).join("")}</div>`).join("")}
    </div></div>`):`<div class="card" style="text-align:center;padding:26px">${zdEmpty(t("bt_no_staff"),"scissors")}${rsIsManager()?`<button class="btn btn-g btn-sm" onclick="btDemo()"><i class="ti ti-sparkles"></i> ${esc(t("welcome_load_demo"))}</button>`:""}</div>`;
  el.innerHTML=sectorPageHead(esc(t("nav_beauty_agenda")),esc(t("bt_agenda_sub").replace("{n}",ag.stats.count).replace("{d}",ag.stats.done).replace("{v}",zdMoney(ag.stats.expected))),
    `<button class="btn btn-o btn-sm" onclick="btWalkIn()"><i class="ti ti-walk"></i> ${esc(t("bt_walk_in"))}</button><button class="btn btn-g btn-sm" onclick="btApptModal()"><i class="ti ti-plus"></i> ${esc(t("bt_new_appt"))}</button>`)+
    `<div class="card" style="margin-bottom:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap"><button class="btn btn-o btn-sm" onclick="_bt.day=htAddDays(_bt.day,-1);navigate('beautyagenda')"><i class="ti ti-chevron-left"></i></button>
      <input class="inp" type="date" value="${_bt.day}" style="width:auto" onchange="_bt.day=this.value;navigate('beautyagenda')"><button class="btn btn-o btn-sm" onclick="_bt.day=htAddDays(_bt.day,1);navigate('beautyagenda')"><i class="ti ti-chevron-right"></i></button>
      <b>${new Date(_bt.day+"T00:00:00").toLocaleDateString(State.lang==="ar"?"ar":State.lang,{weekday:"long",day:"numeric",month:"long"})}</b>${ag.is_open?"":` <span class="badge br">${esc(t("bt_closed"))}</span>`}
      ${_bt.day!==zdToday()?`<button class="btn btn-o btn-sm" onclick="_bt.day=zdToday();navigate('beautyagenda')">${esc(t("today"))}</button>`:""}</div>`+
    (ag.waiting.length||ag.in_service.length?`<div class="card" style="margin-bottom:12px;border-color:var(--amber)"><b><i class="ti ti-armchair"></i> ${esc(t("bt_waiting_room"))}</b>
      ${ag.waiting.concat(ag.in_service).map(a=>`<div class="ht-bk"><span style="flex:1"><b>${esc(a.customer_name)}</b> <span class="badge" style="color:${BT_ST_COL[a.status]};border:1px solid ${BT_ST_COL[a.status]}">${esc(t("bt_st_"+a.status))}</span><div style="font-size:11px;color:var(--muted)">${esc(a.staff_name||"")} · ${a.services.map(x=>esc(x.name)).join(", ")}${a.allergies?` · <span style="color:var(--red)">⚠ ${esc(a.allergies)}</span>`:""}</div></span>
        ${a.status==="arrived"?`<button class="btn btn-o btn-sm" onclick="btSetStatus('${a.id}','in_service')">${esc(t("bt_start"))}</button>`:""}<button class="btn btn-g btn-sm" onclick="btCheckout('${a.id}')"><i class="ti ti-cash"></i> ${esc(t("btn_pos_pay"))}</button></div>`).join("")}</div>`:"")+grid+
    `<div class="rs-legend" style="margin-top:8px">${["booked","arrived","in_service","done"].map(s=>`<span><i style="background:${BT_ST_COL[s]}"></i>${esc(t("bt_st_"+s))}</span>`).join("")}</div>`;
  sectorTimer("beautyagenda",()=>{if(!document.querySelector(".modal-overlay[style*='flex']"))SECTOR_PAGE_LOADERS.beautyagenda(el);},45000);
};
function min2hm(m){return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;}
function btSlotFromClick(ev,o,px){const r=ev.currentTarget.getBoundingClientRect();const m=o+Math.floor((ev.clientY-r.top)/px/15)*15;return min2hm(m);}
function btApptRow(a){return `<div class="ht-bk" onclick="btApptDetail('${a.id}')"><span class="mono" style="font-weight:700;width:46px">${esc(a.time)}</span><span style="flex:1"><b>${esc(a.customer_name)}</b>${a.allergies?` <i class="ti ti-alert-triangle" style="color:var(--red)"></i>`:""}<div style="font-size:11px;color:var(--muted)">${a.services.map(x=>esc(x.name)).join(", ")} · ${zdMoney(a.total)}</div></span><span class="badge" style="color:${BT_ST_COL[a.status]};border:1px solid ${BT_ST_COL[a.status]}">${esc(t("bt_st_"+a.status))}</span></div>`;}
async function btDemo(){try{await api("POST","/beauty/setup-demo");_bt.services=null;_bt.staff=null;showToast(t("welcome_demo_done"));navigate("beautyagenda");}catch(e){showToast(e.message,"error");}}

// ── Nouveau rendez-vous ──
async function btApptModal(pre){
  pre=pre||{};const [svcs,staff,cls]=await Promise.all([btServices(),btStaff(),api("GET","/beauty/clients")]);_bt.clientList=cls;
  _bt.newAp={sel:[],slot:pre.time||null,staff:pre.staff_id||"",day:_bt.day||zdToday()};
  zdModal("modal-bt-ap",`<div class="modal-title"><i class="ti ti-calendar-plus" style="color:var(--pink)"></i> ${esc(t("bt_new_appt"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("bt_client"))} *</label><input class="inp" id="bt-a-name" list="bt-cl-list" oninput="btPickClient(this.value)"><datalist id="bt-cl-list">${cls.map(c=>`<option value="${esc(c.name)}">${esc(c.phone||"")}</option>`).join("")}</datalist></div>
      <div class="fgrp"><label class="fl">${esc(t("pb_phone"))}</label><input class="inp" id="bt-a-phone" inputmode="tel" placeholder="+243 …"></div></div>
    <div id="bt-a-allergy"></div>
    <div class="fgrp"><label class="fl">${esc(t("bt_services"))} *</label><div class="bt-svcs">${svcs.map(s=>`<label class="rs-opt"><input type="checkbox" value="${s.id}" onchange="btToggleSvc('${s.id}',this.checked)"> ${esc(s.name)} <span class="mono" style="margin-left:auto;font-size:11px">${s.duration_min}′ · ${zdMoney(s.price)}</span></label>`).join("")}</div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_date"))} *</label><input class="inp" type="date" id="bt-a-day" value="${_bt.newAp.day}" min="${zdToday()}" onchange="_bt.newAp.day=this.value;_bt.newAp.slot=null;btLoadSlots()"></div>
      <div class="fgrp"><label class="fl">${esc(t("bt_staff"))}</label><select class="inp" id="bt-a-staff" onchange="_bt.newAp.staff=this.value;btLoadSlots()"><option value="">${esc(t("bt_any_staff"))}</option>${staff.map(s=>`<option value="${s.id}"${s.id===pre.staff_id?" selected":""}>${esc(s.name)}</option>`).join("")}</select></div></div>
    <div id="bt-a-slots" class="pb-slots"></div>
    <div class="fgrp"><label class="fl">${esc(t("fld_notes"))}</label><input class="inp" id="bt-a-note"></div><div class="err-box" id="bt-a-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-bt-ap')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitBtAppt()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,640);
}
function btPickClient(v){const c=(_bt.clientList||[]).find(x=>x.name===v);if(c){const p=document.getElementById("bt-a-phone");if(p&&!p.value)p.value=c.phone||"";_bt.newAp.client_id=c.id;
  document.getElementById("bt-a-allergy").innerHTML=c.allergies?`<div class="alert-bar" style="margin-bottom:8px;color:var(--red)"><i class="ti ti-alert-triangle"></i> ${esc(c.allergies)}</div>`:"";}else{_bt.newAp.client_id=null;document.getElementById("bt-a-allergy").innerHTML="";}}
function btToggleSvc(id,on){_bt.newAp.sel=_bt.newAp.sel.filter(x=>x!==id);if(on)_bt.newAp.sel.push(id);_bt.newAp.slot=null;btLoadSlots();}
async function btLoadSlots(){
  const box=document.getElementById("bt-a-slots");if(!box)return;const n=_bt.newAp;
  if(!n.sel.length){box.innerHTML=`<div style="font-size:12px;color:var(--muted)">${esc(t("bt_pick_services"))}</div>`;return;}
  try{const r=await api("GET",`/beauty/slots?day=${n.day}&services=${n.sel.join(",")}`);
    const slots=n.staff?null:r.slots;
    let list=r.slots;
    if(n.staff){const s=(_bt.staff||[]).find(x=>x.id===n.staff);list=r.slots.filter(x=>x.staff_id===n.staff);if(!list.length)list=[];}
    box.innerHTML=`<div style="font-size:12px;color:var(--muted);width:100%;margin-bottom:4px">${r.duration} min · ${zdMoney(r.total)}${n.staff?` · ${esc(t("bt_slots_hint_staff"))}`:""}</div>`+(list.map(x=>`<button class="pb-slot${n.slot===x.time?" active":""}" onclick="_bt.newAp.slot='${x.time}';_bt.newAp.slotStaff='${x.staff_id}';btLoadSlots()" title="${esc(x.staff_name)}">${x.time}<span style="display:block;font-size:9px;color:var(--muted)">${esc(x.staff_name)}</span></button>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("pb_no_slots"))}</div>`);
  }catch(e){box.innerHTML=`<div style="color:var(--red);font-size:12px">${esc(e.message)}</div>`;}
}
async function submitBtAppt(){
  const n=_bt.newAp;if(!n.sel.length){showErr("bt-a-err",t("bt_pick_services"));return;}if(!n.slot){showErr("bt-a-err",t("bt_pick_slot"));return;}
  const body={customer_name:zdVal("bt-a-name"),phone:zdVal("bt-a-phone")||null,client_id:n.client_id||null,day:n.day,time:n.slot,service_ids:n.sel,staff_id:n.staff||n.slotStaff||null,note:zdVal("bt-a-note")||null};
  try{const a=await api("POST","/beauty/appointments",body);zdCloseModal("modal-bt-ap");_bt.day=a.day;showToast(t("bt_appt_saved").replace("{t}",a.time).replace("{s}",a.staff_name));navigate("beautyagenda");}catch(e){showErr("bt-a-err",e.message);}
}
async function btWalkIn(){
  const [svcs,cls]=await Promise.all([btServices(),api("GET","/beauty/clients")]);_bt.clientList=cls;_bt.newAp={sel:[]};
  zdModal("modal-bt-ap",`<div class="modal-title"><i class="ti ti-walk"></i> ${esc(t("bt_walk_in"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("bt_client"))} *</label><input class="inp" id="bt-a-name" list="bt-cl-list" oninput="btPickClient(this.value)"><datalist id="bt-cl-list">${cls.map(c=>`<option value="${esc(c.name)}">`).join("")}</datalist></div><div class="fgrp"><label class="fl">${esc(t("pb_phone"))}</label><input class="inp" id="bt-a-phone" inputmode="tel"></div></div>
    <div id="bt-a-allergy"></div><div class="fgrp"><label class="fl">${esc(t("bt_services"))} *</label><div class="bt-svcs">${svcs.map(s=>`<label class="rs-opt"><input type="checkbox" onchange="_bt.newAp.sel=_bt.newAp.sel.filter(x=>x!=='${s.id}');if(this.checked)_bt.newAp.sel.push('${s.id}')"> ${esc(s.name)} <span class="mono" style="margin-left:auto;font-size:11px">${zdMoney(s.price)}</span></label>`).join("")}</div></div>
    <div class="err-box" id="bt-a-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-bt-ap')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitBtWalkIn()">${esc(t("bt_add_queue"))}</button></div>`,560);
}
async function submitBtWalkIn(){if(!_bt.newAp.sel.length){showErr("bt-a-err",t("bt_pick_services"));return;}
  try{const a=await api("POST","/beauty/walk-in",{customer_name:zdVal("bt-a-name"),phone:zdVal("bt-a-phone")||null,client_id:_bt.newAp.client_id||null,service_ids:_bt.newAp.sel});zdCloseModal("modal-bt-ap");_bt.day=zdToday();showToast(t("bt_queued").replace("{s}",a.staff_name).replace("{n}",a.queue_position));navigate("beautyagenda");}catch(e){showErr("bt-a-err",e.message);}}

// ── Détail, statut, encaissement ──
function btApptDetail(id){
  const a=_bt.agenda.appointments.find(x=>x.id===id);if(!a)return;const open=!["done","cancelled","no_show"].includes(a.status);
  zdModal("modal-bt-det",`<div class="modal-title"><i class="ti ti-calendar-time" style="color:var(--pink)"></i> ${esc(a.customer_name)} <span class="badge" style="margin-left:auto;color:${BT_ST_COL[a.status]};border:1px solid ${BT_ST_COL[a.status]}">${esc(t("bt_st_"+a.status))}</span></div>
    <div style="font-size:13px;margin-bottom:8px">${esc(a.day)} · ${esc(a.time)} → ${esc(a.end)} · ${esc(a.staff_name||"")}${a.phone?` · <a href="tel:${esc(a.phone)}">${esc(a.phone)}</a>`:""}</div>
    ${a.allergies?`<div class="alert-bar" style="margin-bottom:8px;color:var(--red)"><i class="ti ti-alert-triangle"></i> ${esc(a.allergies)}</div>`:""}
    ${a.services.map(s=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid var(--b)"><span>${esc(s.name)} · ${s.duration_min}′</span><b class="mono">${zdMoney(s.price)}</b></div>`).join("")}
    ${a.note?`<div style="font-size:12px;color:var(--muted);margin-top:6px">${esc(a.note)}</div>`:""}<div style="font-size:11px;color:var(--muted);margin-top:6px">${esc(t("bt_by"))} ${esc(a.created_by||"")} · ${esc(t("bt_src_"+a.source))}</div>
    <div class="rs-more" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));margin-top:10px">
      ${open&&["booked","confirmed"].includes(a.status)?`<button class="btn btn-o" onclick="btSetStatus('${a.id}','arrived')"><i class="ti ti-armchair"></i> ${esc(t("bt_st_arrived"))}</button>`:""}
      ${open&&a.status==="booked"?`<button class="btn btn-o" onclick="btSetStatus('${a.id}','confirmed')"><i class="ti ti-check"></i> ${esc(t("bt_confirm"))}</button>`:""}
      ${open?`<button class="btn btn-g" onclick="btCheckout('${a.id}')"><i class="ti ti-cash"></i> ${esc(t("btn_pos_pay"))}</button><button class="btn btn-o" onclick="btSetStatus('${a.id}','no_show')"><i class="ti ti-user-off"></i> ${esc(t("bt_st_no_show"))}</button><button class="btn btn-r" onclick="btSetStatus('${a.id}','cancelled')"><i class="ti ti-x"></i> ${esc(t("btn_cancel"))}</button>`:""}
      ${a.client_id?`<button class="btn btn-o" onclick="zdCloseModal('modal-bt-det');btClientFile('${a.client_id}')"><i class="ti ti-id"></i> ${esc(t("bt_client_file"))}</button>`:""}
      ${a.phone&&open?`<a class="btn btn-o" target="_blank" rel="noopener" href="https://wa.me/${esc(a.phone.replace(/\D/g,""))}?text=${encodeURIComponent(t("bt_wa_reminder").replace("{n}",a.customer_name).replace("{d}",a.day).replace("{h}",a.time))}"><i class="ti ti-brand-whatsapp"></i> ${esc(t("bt_remind"))}</a>`:""}
      ${a.invoice_id?`<button class="btn btn-o" onclick="zdShowReceipt('${a.invoice_id}')"><i class="ti ti-receipt"></i> ${esc(t("bt_receipt"))}</button>`:""}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-bt-det')">${esc(t("btn_close"))}</button></div>`,520);
}
async function btSetStatus(id,st){if(["cancelled","no_show"].includes(st)&&!confirm(t("bt_confirm_status")))return;try{await api("PATCH",`/beauty/appointments/${id}`,{status:st});zdCloseModal("modal-bt-det");navigate("beautyagenda");}catch(e){showToast(e.message,"error");}}
async function btCheckout(id){
  const a=_bt.agenda.appointments.find(x=>x.id===id);
  const [prods,file]=await Promise.all([api("GET","/beauty/products").catch(()=>[]),a.client_id?api("GET",`/beauty/clients/${a.client_id}`).catch(()=>null):null]);
  _bt.products=Array.isArray(prods)?prods:(prods.items||[]);
  _bt.co={id,services:a.services.map(s=>({service_id:s.service_id,name:s.name,price:s.price,package_id:null})),products:[],packages:(file?.packages||[]).filter(p=>p.remaining>0),method:"cash"};
  zdCloseModal("modal-bt-det");btRenderCheckout(a);
}
function btRenderCheckout(a){
  a=a||_bt.agenda.appointments.find(x=>x.id===_bt.co.id);const co=_bt.co;
  const total=Math.max(0,co.services.reduce((s,x)=>s+(x.package_id?0:(+x.price||0)),0)+co.products.reduce((s,p)=>s+p.qty*p.price,0)+(zdNum("bt-co-tip")||0)-(zdNum("bt-co-disc")||0));
  zdModal("modal-bt-co",`<div class="modal-title"><i class="ti ti-cash" style="color:var(--green)"></i> ${esc(t("btn_pos_pay"))} · ${esc(a.customer_name)}</div>
    ${co.services.map((s,i)=>{const pk=co.packages.filter(p=>p.service_id===s.service_id);return `<div class="rs-payline"><span style="flex:1">${esc(s.name)}${pk.length?`<label style="display:block;font-size:11px;color:var(--purple)"><input type="checkbox" ${s.package_id?"checked":""} onchange="_bt.co.services[${i}].package_id=this.checked?'${pk[0].id}':null;btRenderCheckout()"> ${esc(t("bt_use_package").replace("{n}",pk[0].remaining))}</label>`:""}</span>
      <input class="inp" type="number" min="0" step="0.5" style="width:90px" value="${s.price}" ${s.package_id?"disabled":""} onchange="_bt.co.services[${i}].price=+this.value||0;btRenderCheckout()"></div>`;}).join("")}
    ${co.products.map((p,i)=>`<div class="rs-payline"><span style="flex:1">${esc(p.name)}</span><input class="inp" type="number" min="1" style="width:70px" value="${p.qty}" onchange="_bt.co.products[${i}].qty=+this.value||1;btRenderCheckout()"><span class="mono">${zdMoney(p.qty*p.price)}</span><button class="btn btn-o btn-sm" onclick="_bt.co.products.splice(${i},1);btRenderCheckout()"><i class="ti ti-x"></i></button></div>`).join("")}
    <div style="display:flex;gap:6px;margin:8px 0"><select class="inp" id="bt-co-prod"><option value="">${esc(t("bt_add_product"))}</option>${(_bt.products||[]).filter(p=>p.stock_qty>0).map(p=>`<option value="${p.id}">${esc(p.name)} · ${zdMoney(p.unit_price)} (${zdQty(p.stock_qty)})</option>`).join("")}</select><button class="btn btn-o btn-sm" onclick="btAddProduct()"><i class="ti ti-plus"></i></button></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("fld_discount"))}</label><input class="inp" type="number" min="0" step="0.5" id="bt-co-disc" value="${co.disc||""}" oninput="_bt.co.disc=this.value;btCoTotal()"></div>
      <div class="fgrp"><label class="fl">${esc(t("rs_tip"))}</label><input class="inp" type="number" min="0" step="0.5" id="bt-co-tip" value="${co.tip||""}" oninput="_bt.co.tip=this.value;btCoTotal()"></div>
      <div class="fgrp"><label class="fl">${esc(t("fld_payment_method"))}</label><select class="inp" id="bt-co-m" onchange="_bt.co.method=this.value;btRenderCheckout()">${zdMethodOptions(co.method)}</select></div></div>
    ${co.method==="cash"?`<div class="fgrp"><label class="fl">${esc(t("pos_tendered"))}</label><input class="inp" type="number" min="0" step="0.5" id="bt-co-t" oninput="btCoTotal()"></div>`:""}
    <div style="display:flex;justify-content:space-between;align-items:center"><b>${esc(t("inv_preview_total"))}</b><span id="bt-co-total" class="mono" style="font-size:24px;font-weight:800;color:var(--green)">${zdMoney(total)}</span></div><div id="bt-co-change" style="color:var(--amber);font-weight:700;text-align:right"></div>
    <div class="err-box" id="bt-co-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-bt-co')">${esc(t("btn_cancel"))}</button><button class="btn btn-g" onclick="submitBtCheckout()"><i class="ti ti-check"></i> ${esc(t("btn_pos_pay"))}</button></div>`,560);
  btCoTotal();
}
function btCoTotal(){const co=_bt.co;const total=Math.max(0,co.services.reduce((s,x)=>s+(x.package_id?0:(+x.price||0)),0)+co.products.reduce((s,p)=>s+p.qty*p.price,0)+(zdNum("bt-co-tip")||0)-(zdNum("bt-co-disc")||0));
  const el=document.getElementById("bt-co-total");if(el)el.textContent=zdMoney(total);const tv=zdNum("bt-co-t");const ch=document.getElementById("bt-co-change");if(ch)ch.textContent=tv!=null&&tv>=total?`${t("pos_change")} ${zdMoney(tv-total)}`:"";}
function btAddProduct(){const id=zdVal("bt-co-prod");const p=(_bt.products||[]).find(x=>x.id===id);if(!p)return;const ex=_bt.co.products.find(x=>x.product_id===id);if(ex)ex.qty++;else _bt.co.products.push({product_id:id,name:p.name,price:p.unit_price,qty:1});btRenderCheckout();}
async function submitBtCheckout(){
  const co=_bt.co;const body={services:co.services.map(s=>({service_id:s.service_id,name:s.name,price:+s.price||0,package_id:s.package_id})),products:co.products.map(p=>({product_id:p.product_id,qty:p.qty})),method:co.method,discount:zdNum("bt-co-disc")||0,tip:zdNum("bt-co-tip")||0};
  const tv=zdNum("bt-co-t");if(tv!=null)body.tendered=tv;
  try{const r=await api("POST",`/beauty/appointments/${co.id}/checkout`,body);zdCloseModal("modal-bt-co");showToast(`${t("rs_paid_ok")} · ${r.number}`+(r.change!=null?` · ${t("pos_change")} ${zdMoney(r.change)}`:""));
    if(confirm(t("rs_print_receipt_q")))zdShowReceipt(r.invoice_id);navigate("beautyagenda");}catch(e){showErr("bt-co-err",e.message);}
}

// ── Clientèle ──
SECTOR_PAGE_LOADERS.beautyclients=async el=>{
  const cl=await api("GET",`/beauty/clients${_bt.q?`?q=${encodeURIComponent(_bt.q)}`:""}`);
  el.innerHTML=sectorPageHead(esc(t("nav_beauty_clients")),esc(t("bt_clients_sub").replace("{n}",cl.length)))+
    `<div class="card" style="margin-bottom:12px"><input class="inp" placeholder="${esc(t("bt_search_client"))}" value="${esc(_bt.q)}" onchange="_bt.q=this.value;navigate('beautyclients')"></div>
    <div class="card">${cl.map(c=>`<div class="ht-bk" onclick="btClientFile('${c.id}')"><span style="flex:1"><b>${esc(c.name)}</b>${c.allergies?` <i class="ti ti-alert-triangle" style="color:var(--red)" title="${esc(c.allergies)}"></i>`:""}<div style="font-size:11px;color:var(--muted)">${esc(c.phone||"")} · ${c.visits} ${esc(t("bt_visits"))}${c.last_visit?` · ${esc(t("bt_last"))} ${esc(c.last_visit)}`:""}${c.next_visit?` · ${esc(t("bt_next"))} ${esc(c.next_visit)}`:""}</div></span><i class="ti ti-chevron-right"></i></div>`).join("")||zdEmpty(t("bt_no_clients"),"users")}</div>`;
};
async function btClientFile(cid){
  const f=await api("GET",`/beauty/clients/${cid}`);const svcs=await btServices();_bt.file=f;
  zdModal("modal-bt-file",`<div class="modal-title"><i class="ti ti-id" style="color:var(--pink)"></i> ${esc(f.client.name)}</div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;margin-bottom:10px"><span>${esc(f.client.phone||"")}</span><span>${f.visits} ${esc(t("bt_visits"))}</span><span>${esc(t("bt_spent"))} <b>${zdMoney(f.total_spent)}</b></span>${f.no_shows?`<span style="color:var(--red)">${f.no_shows} ${esc(t("bt_st_no_show"))}</span>`:""}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("bt_allergies"))}</label><input class="inp" id="bt-f-all" value="${esc(f.profile.allergies||"")}" placeholder="${esc(t("bt_allergies_ph"))}"></div><div class="fgrp"><label class="fl">${esc(t("bt_hair_type"))}</label><input class="inp" id="bt-f-hair" value="${esc(f.profile.hair_type||"")}"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("fld_notes"))}</label><input class="inp" id="bt-f-notes" value="${esc(f.profile.notes||"")}"></div><button class="btn btn-o btn-sm" onclick="submitBtProfile('${cid}')"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button>
    <div class="card2" style="padding:10px;border-radius:10px;margin-top:10px"><b>${esc(t("bt_formulas"))}</b>${(f.profile.formulas||[]).slice().reverse().map(x=>`<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--b)">${esc(x.date)} · ${esc(x.text)} <span style="color:var(--muted)">(${esc(x.by||"")})</span></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("bt_no_formula"))}</div>`}
      <div style="display:flex;gap:6px;margin-top:6px"><input class="inp" id="bt-f-form" placeholder="${esc(t("bt_formula_ph"))}"><button class="btn btn-o btn-sm" onclick="submitBtFormula('${cid}')"><i class="ti ti-plus"></i></button></div></div>
    <div class="card2" style="padding:10px;border-radius:10px;margin-top:10px"><b>${esc(t("bt_packages"))}</b>${f.packages.map(p=>`<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--b)">${esc(p.service_name)} · <b>${p.remaining}/${p.uses_total}</b> · ${zdMoney(p.price)}</div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("bt_no_package"))}</div>`}
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><select class="inp" id="bt-f-psvc" style="flex:2;min-width:140px">${svcs.map(s=>`<option value="${s.id}">${esc(s.name)} (${zdMoney(s.price)})</option>`).join("")}</select><input class="inp" type="number" min="2" id="bt-f-puses" value="10" style="width:70px"><select class="inp" id="bt-f-pm" style="width:auto">${zdMethodOptions("cash")}</select><button class="btn btn-g btn-sm" onclick="submitBtPackage('${cid}')">${esc(t("bt_sell_package"))}</button></div></div>
    <div style="margin-top:10px"><b style="font-size:13px">${esc(t("bt_history"))}</b>${f.history.map(a=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--b)"><span>${esc(a.day)} ${esc(a.time)} · ${a.services.map(x=>esc(x.name)).join(", ")} · ${esc(a.staff_name||"")}</span><span style="color:${BT_ST_COL[a.status]}">${esc(t("bt_st_"+a.status))}</span></div>`).join("")||zdEmpty(t("ht_none"))}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-bt-file')">${esc(t("btn_close"))}</button></div>`,620);
}
async function submitBtProfile(cid){try{await api("PATCH",`/beauty/clients/${cid}`,{allergies:zdVal("bt-f-all"),hair_type:zdVal("bt-f-hair"),notes:zdVal("bt-f-notes")});showToast(t("rs_settings_saved"));}catch(e){showToast(e.message,"error");}}
async function submitBtFormula(cid){const v=zdVal("bt-f-form");if(!v)return;try{await api("POST",`/beauty/clients/${cid}/formulas`,{text:v});btClientFile(cid);}catch(e){showToast(e.message,"error");}}
async function submitBtPackage(cid){try{const r=await api("POST",`/beauty/clients/${cid}/packages`,{service_id:zdVal("bt-f-psvc"),uses:parseInt(zdVal("bt-f-puses"))||10,method:zdVal("bt-f-pm")});showToast(t("bt_package_sold").replace("{v}",zdMoney(r.price)));btClientFile(cid);}catch(e){showToast(e.message,"error");}}

// ── Prestations et réglages ──
SECTOR_PAGE_LOADERS.beautyservices=async el=>{
  const [svcs,s]=await Promise.all([btServices(true),api("GET","/beauty/settings")]);_bt.settings=s;const mgr=rsIsManager();
  const cats=[...new Set(svcs.map(x=>x.category||"—"))];
  el.innerHTML=sectorPageHead(esc(t("nav_beauty_services")),esc(t("bt_services_sub").replace("{n}",svcs.length)),
    `<button class="btn btn-o btn-sm" onclick="btShareLink()"><i class="ti ti-world"></i> ${esc(t("bt_online_link"))}</button>${mgr?`<button class="btn btn-g btn-sm" onclick="btServiceModal()"><i class="ti ti-plus"></i> ${esc(t("bt_new_service"))}</button>`:""}`)+
    (svcs.length?cats.map(c=>`<div class="card" style="margin-bottom:10px"><b>${esc(c)}</b>${svcs.filter(x=>(x.category||"—")===c).map(x=>`<div class="rs-mitem"><div style="flex:1"><b>${esc(x.name)}</b> <span style="font-size:11px;color:var(--muted)">${x.duration_min} min${x.online?"":" · "+esc(t("bt_not_online"))}</span></div><b class="mono">${zdMoney(x.price)}</b>${mgr?`<button class="btn btn-o btn-sm" onclick="btServiceModal('${x.id}')"><i class="ti ti-pencil"></i></button>`:""}</div>`).join("")}</div>`).join(""):
      `<div class="card" style="text-align:center;padding:22px">${zdEmpty(t("bt_no_services"),"scissors")}${mgr?`<button class="btn btn-g btn-sm" onclick="btDemo()"><i class="ti ti-sparkles"></i> ${esc(t("welcome_load_demo"))}</button>`:""}</div>`)+
    (mgr?`<div class="card"><b>${esc(t("bt_settings"))}</b><div class="grid3" style="margin-top:8px"><div class="fgrp"><label class="fl">${esc(t("rs_open_time"))}</label><input class="inp" type="time" id="bt-s-open" value="${s.open}"></div><div class="fgrp"><label class="fl">${esc(t("rs_close_time"))}</label><input class="inp" type="time" id="bt-s-close" value="${s.close}"></div>
      <div class="fgrp"><label class="fl">${esc(t("bt_slot_step"))}</label><select class="inp" id="bt-s-step">${[10,15,20,30].map(x=>`<option value="${x}"${s.slot_step===x?" selected":""}>${x} min</option>`).join("")}</select></div></div>
      <div class="fgrp"><label class="fl">${esc(t("rs_open_days"))}</label><div class="rs-steps">${[0,1,2,3,4,5,6].map(d=>`<label class="toggle-btn" style="display:inline-flex;gap:4px;align-items:center"><input type="checkbox" class="bt-s-day" value="${d}" ${s.days.includes(d)?"checked":""}> ${esc(bkDayName(d).slice(0,3))}</label>`).join("")}</div></div>
      <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("bt_package_discount"))}</label><input class="inp" type="number" min="0" max="90" id="bt-s-pk" value="${s.package_discount_pct}"></div><div class="fgrp"><label class="fl">${esc(t("bt_min_notice"))}</label><input class="inp" type="number" min="0" id="bt-s-notice" value="${s.min_notice_min}"></div><div class="fgrp"><label class="fl">${esc(t("rs_slug"))}</label><input class="inp" id="bt-s-slug" value="${esc(s.slug||"")}"></div></div>
      <div class="fgrp"><label class="fl">${esc(t("bt_welcome"))}</label><input class="inp" id="bt-s-welcome" value="${esc(s.welcome||"")}"></div>
      <label style="font-size:13px"><input type="checkbox" id="bt-s-online" ${s.online_booking?"checked":""}> ${esc(t("bt_online_booking"))}</label>
      <div style="margin-top:10px"><button class="btn btn-g btn-sm" onclick="submitBtSettings()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button></div></div>`:"");
};
async function submitBtSettings(){const body={open:zdVal("bt-s-open"),close:zdVal("bt-s-close"),slot_step:parseInt(zdVal("bt-s-step")),days:[...document.querySelectorAll(".bt-s-day:checked")].map(x=>+x.value),
  package_discount_pct:zdNum("bt-s-pk")||0,min_notice_min:parseInt(zdVal("bt-s-notice"))||0,welcome:zdVal("bt-s-welcome"),online_booking:document.getElementById("bt-s-online").checked};
  const sl=zdVal("bt-s-slug");if(sl&&sl!==_bt.settings.slug)body.slug=sl;try{_bt.settings=await api("PUT","/beauty/settings",body);showToast(t("rs_settings_saved"));}catch(e){showToast(e.message,"error");}}
async function btShareLink(){const s=_bt.settings||await api("GET","/beauty/settings");
  zdModal("modal-bt-link",`<div class="modal-title"><i class="ti ti-world"></i> ${esc(t("bt_online_link"))}</div><div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center"><div id="bt-qr" style="background:#fff;padding:8px;border-radius:8px"></div><div style="flex:1;min-width:200px"><div style="font-size:13px;margin-bottom:8px">${esc(t("bt_online_hint"))}</div><input class="inp" readonly value="${esc(s.booking_url)}" onclick="this.select()">
    <a class="btn btn-o btn-sm" style="margin-top:8px" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(t("bt_share_text")+" "+s.booking_url)}"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a></div></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-bt-link')">${esc(t("btn_close"))}</button></div>`,540);
  try{const q=qrcode(0,"M");q.addData(s.booking_url);q.make();document.getElementById("bt-qr").innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});const sv=document.querySelector("#bt-qr svg");if(sv){sv.style.width="150px";sv.style.height="150px";}}catch(_){}}
function btServiceModal(id){
  const x=id?_bt.services.find(s=>s.id===id):null;
  zdModal("modal-bt-svc",`<div class="modal-title"><i class="ti ti-scissors"></i> ${esc(t(x?"bt_edit_service":"bt_new_service"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_name"))} *</label><input class="inp" id="bt-v-name" value="${esc(x?.name||"")}"></div><div class="fgrp"><label class="fl">${esc(t("rs_category"))}</label><input class="inp" id="bt-v-cat" value="${esc(x?.category||"")}" placeholder="Femme, Homme, Esthétique…"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_price"))} *</label><input class="inp" type="number" min="0" step="0.5" id="bt-v-price" value="${x?.price??""}"></div><div class="fgrp"><label class="fl">${esc(t("bt_duration"))} *</label><input class="inp" type="number" min="5" step="5" id="bt-v-dur" value="${x?.duration_min||30}"></div></div>
    <label style="font-size:13px"><input type="checkbox" id="bt-v-online" ${x?.online===false?"":"checked"}> ${esc(t("bt_bookable_online"))}</label>
    <div class="modal-footer">${x?`<button class="btn btn-r btn-sm" style="margin-right:auto" onclick="btArchiveService('${x.id}')"><i class="ti ti-trash"></i></button>`:""}<button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-bt-svc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitBtService('${x?x.id:""}')">${esc(t("btn_save"))}</button></div>`,500);
}
async function submitBtService(id){const body={name:zdVal("bt-v-name"),category:zdVal("bt-v-cat")||null,price:zdNum("bt-v-price"),duration_min:parseInt(zdVal("bt-v-dur"))||30,online:document.getElementById("bt-v-online").checked};
  try{await api(id?"PATCH":"POST",id?`/beauty/services/${id}`:"/beauty/services",body);zdCloseModal("modal-bt-svc");navigate("beautyservices");}catch(e){showToast(e.message,"error");}}
async function btArchiveService(id){if(!confirm(t("confirm_delete")))return;try{await api("PATCH",`/beauty/services/${id}`,{active:false});zdCloseModal("modal-bt-svc");navigate("beautyservices");}catch(e){showToast(e.message,"error");}}

// ── Équipe et commissions ──
SECTOR_PAGE_LOADERS.beautystaff=async el=>{
  const [staff,svcs,com]=await Promise.all([btStaff(true),btServices(),api("GET","/beauty/commissions")]);const mgr=rsIsManager();
  el.innerHTML=sectorPageHead(esc(t("nav_beauty_staff")),esc(t("bt_staff_sub").replace("{v}",zdMoney(com.total_unpaid))),mgr?`<button class="btn btn-g btn-sm" onclick="btStaffModal()"><i class="ti ti-user-plus"></i> ${esc(t("bt_new_staff"))}</button>`:"")+
    `<div class="cd-rooms">${staff.map(s=>{const c=com.staff.find(x=>x.id===s.id)||{commission:0,unpaid:0,count:0,lines:[]};return `<div class="card" style="border-left:4px solid ${s.color||"var(--b)"}">
      <div style="display:flex;justify-content:space-between"><b style="font-size:15px">${esc(s.name)}</b>${mgr?`<button class="btn btn-o btn-sm" onclick="btStaffModal('${s.id}')"><i class="ti ti-pencil"></i></button>`:""}</div>
      <div style="font-size:11px;color:var(--muted);margin:4px 0">${s.services.map(esc).join(" · ")||esc(t("bt_no_skill"))}</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px"><span>${esc(t("bt_commission_rate"))}</span><b>${s.commission_pct} %</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(t("bt_commission_month"))} (${c.count})</span><b class="mono">${zdMoney(c.commission)}</b></div>
      <div style="display:flex;justify-content:space-between;font-size:13px"><span>${esc(t("bt_unpaid"))}</span><b class="mono" style="color:${c.unpaid?"var(--amber)":"var(--text)"}">${zdMoney(c.unpaid)}</b></div>
      ${mgr&&c.unpaid>0?`<button class="btn btn-g btn-sm" style="margin-top:8px;width:100%" onclick="btPayCommission('${s.id}','${escJs(s.name)}',${c.unpaid})"><i class="ti ti-cash"></i> ${esc(t("bt_pay_commission"))}</button>`:""}</div>`;}).join("")}</div>`;
};
function btStaffModal(id){
  const s=id?_bt.staff.find(x=>x.id===id):null;
  zdModal("modal-bt-staff",`<div class="modal-title"><i class="ti ti-user-star"></i> ${esc(t(s?"bt_edit_staff":"bt_new_staff"))}</div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("fld_name"))} *</label><input class="inp" id="bt-st-name" value="${esc(s?.name||"")}"></div><div class="fgrp"><label class="fl">${esc(t("bt_commission_rate"))} (%)</label><input class="inp" type="number" min="0" max="100" id="bt-st-com" value="${s?.commission_pct??30}"></div><div class="fgrp"><label class="fl">${esc(t("rs_color"))}</label><input class="inp" type="color" id="bt-st-color" value="${s?.color||"#ec4899"}"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("bt_skills"))}</label><div class="bt-svcs">${_bt.services.map(v=>`<label class="rs-opt"><input type="checkbox" class="bt-st-svc" value="${v.id}" ${(s?.service_ids||[]).includes(v.id)?"checked":""}> ${esc(v.name)}</label>`).join("")}</div></div>
    <div class="modal-footer">${s?`<button class="btn btn-r btn-sm" style="margin-right:auto" onclick="btArchiveStaff('${s.id}')"><i class="ti ti-trash"></i></button>`:""}<button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-bt-staff')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitBtStaff('${s?s.id:""}')">${esc(t("btn_save"))}</button></div>`,600);
}
async function submitBtStaff(id){const body={name:zdVal("bt-st-name"),commission_pct:zdNum("bt-st-com")||0,color:zdVal("bt-st-color"),service_ids:[...document.querySelectorAll(".bt-st-svc:checked")].map(x=>x.value)};
  try{await api(id?"PATCH":"POST",id?`/beauty/staff/${id}`:"/beauty/staff",body);zdCloseModal("modal-bt-staff");_bt.staff=null;navigate("beautystaff");}catch(e){showToast(e.message,"error");}}
async function btArchiveStaff(id){if(!confirm(t("confirm_delete")))return;try{await api("PATCH",`/beauty/staff/${id}`,{active:false});zdCloseModal("modal-bt-staff");_bt.staff=null;navigate("beautystaff");}catch(e){showToast(e.message,"error");}}
async function btPayCommission(id,name,amt){if(!confirm(t("bt_pay_confirm").replace("{n}",name).replace("{v}",zdMoney(amt))))return;try{const r=await api("POST","/beauty/commissions/pay",{staff_id:id});showToast(t("bt_paid").replace("{v}",zdMoney(r.amount)));navigate("beautystaff");}catch(e){showToast(e.message,"error");}}

// ── Rapport ──
SECTOR_PAGE_LOADERS.beautyreport=async el=>{
  if(!_bt.repDay)_bt.repDay=zdToday();
  const r=await api("GET",`/beauty/report?day=${_bt.repDay}`);
  el.innerHTML=sectorPageHead(esc(t("nav_beauty_report")),esc(t("bt_report_sub")),`<input class="inp" type="date" value="${_bt.repDay}" style="width:auto" onchange="_bt.repDay=this.value;navigate('beautyreport')">`)+
    `<div class="kgrid"><div class="kpi g"><div class="kl">${esc(t("rs_revenue"))}</div><div class="kv">${zdMoney(r.revenue)}</div></div><div class="kpi b"><div class="kl">${esc(t("bt_done"))}</div><div class="kv">${r.done}/${r.appointments}</div></div>
      <div class="kpi a"><div class="kl">${esc(t("bt_walk_ins"))}</div><div class="kv">${r.walk_ins}</div></div><div class="kpi c"><div class="kl">${esc(t("rs_online"))}</div><div class="kv">${r.online}</div></div><div class="kpi r"><div class="kl">${esc(t("bt_st_no_show"))}</div><div class="kv">${r.no_shows}</div></div><div class="kpi p"><div class="kl">${esc(t("bt_commissions"))}</div><div class="kv">${zdMoney(r.commissions)}</div></div></div>
    <div class="grid2" style="margin-top:14px"><div class="card"><b>${esc(t("bt_by_staff"))}</b>${r.by_staff.map(s=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b)"><span><span style="color:${s.color||"var(--muted)"}">●</span> ${esc(s.name)} <span style="font-size:11px;color:var(--muted)">${s.count} · ${esc(t("bt_commissions"))} ${zdMoney(s.commission)}</span></span><b class="mono">${zdMoney(s.revenue)}</b></div>`).join("")}</div>
      <div class="card"><b>${esc(t("rs_by_method"))}</b>${Object.entries(r.by_method).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b)"><span>${esc(t("pay_method_"+k))}</span><b class="mono">${zdMoney(v)}</b></div>`).join("")||zdEmpty(t("rs_no_sales"))}</div>
      <div class="card"><b>${esc(t("bt_top_services"))}</b>${r.top_services.map(s=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b)"><span>${esc(s.name)} × ${s.qty}</span><b class="mono">${zdMoney(s.amount)}</b></div>`).join("")||zdEmpty(t("rs_no_sales"))}</div>
      <div class="card"><b>${esc(t("bt_products_sold"))}</b>${r.products.map(s=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b)"><span>${esc(s.name)} × ${zdQty(s.qty)}</span><b class="mono">${zdMoney(s.amount)}</b></div>`).join("")||zdEmpty(t("rs_no_sales"))}</div></div>`;
};

// ── Page publique : prise de rendez-vous ──
const _sp={sel:[],day:null,time:null,staff:""};
async function checkSalonView(){
  const slug=new URLSearchParams(window.location.search).get("salon");if(!slug)return false;
  document.getElementById("auth-screen").style.display="none";document.getElementById("landing").style.display="none";
  let v=document.getElementById("sector-public-view");if(!v){v=document.createElement("div");v.id="sector-public-view";v.className="pub-view";document.body.appendChild(v);}v.style.display="block";
  try{const r=await fetch(`${API_BASE}/public/salon/${encodeURIComponent(slug)}`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"Erreur");_sp.slug=slug;_sp.data=d;
    if(typeof ocLoadSalon==="function")await ocLoadSalon(slug);}
  catch(e){v.innerHTML=`<div class="card" style="text-align:center;color:var(--red);margin:30px auto;max-width:480px">${esc(e.message)}</div>`;return true;}
  renderSalonPublic();return true;
}
function renderSalonPublic(){
  const d=_sp.data;const v=document.getElementById("sector-public-view");
  const today=new Date(d.today+"T00:00:00");
  const days=[...Array(Math.min(d.max_days_ahead,21)+1)].map((_,i)=>{const x=new Date(today);x.setDate(x.getDate()+i);return x;}).filter(x=>d.days.includes((x.getDay()+6)%7));
  const total=d.services.filter(s=>_sp.sel.includes(s.id)).reduce((a,s)=>a+s.price,0),dur=d.services.filter(s=>_sp.sel.includes(s.id)).reduce((a,s)=>a+s.duration_min,0);
  v.innerHTML=`<div style="max-width:720px;margin:0 auto;padding:16px"><div style="text-align:center;margin:10px 0 18px">${d.logo_url?`<img src="${esc(d.logo_url)}" alt="" style="max-height:64px;max-width:180px;object-fit:contain;background:#fff;border-radius:8px;padding:4px">`:`<div style="font-size:34px">💇</div>`}
    <div style="font-size:22px;font-weight:800;margin-top:6px">${esc(d.name)}</div>${d.welcome||d.description?`<div style="font-size:13px;color:var(--muted)">${esc(d.welcome||d.description)}</div>`:""}<div style="font-size:12px;color:var(--muted);margin-top:4px">${d.address?esc(d.address)+" · ":""}${esc(d.open)} – ${esc(d.close)}</div></div>
    <div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">1. ${esc(t("pb_choose_service"))}</div>${d.services.map(s=>`<button class="pb-opt${_sp.sel.includes(s.id)?" active":""}" onclick="_sp.sel=_sp.sel.includes('${s.id}')?_sp.sel.filter(x=>x!=='${s.id}'):[..._sp.sel,'${s.id}'];_sp.time=null;renderSalonPublic()"><span><b>${esc(s.name)}</b><span style="display:block;font-size:11px;color:var(--muted)">${s.duration_min} min</span></span><b>${zdMoney(s.price)}</b></button>`).join("")}
      ${_sp.sel.length?`<div style="text-align:right;font-size:13px;margin-top:6px">${dur} min · <b>${zdMoney(total)}</b></div>`:""}</div>
    ${_sp.sel.length?`<div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">2. ${esc(t("pb_choose_day"))}</div><div class="pb-days">${days.map(x=>`<button class="pb-day${_sp.day===isoDate(x)?" active":""}" onclick="_sp.day='${isoDate(x)}';_sp.time=null;renderSalonPublic()"><span>${bkDayName((x.getDay()+6)%7).slice(0,3)}</span><b>${x.getDate()}</b><span>${x.toLocaleDateString(State.lang==="ar"?"ar":State.lang,{month:"short"})}</span></button>`).join("")}</div>
      <select class="inp" style="margin-top:8px" onchange="_sp.staff=this.value;_sp.time=null;renderSalonPublic()"><option value="">${esc(t("bt_any_staff"))}</option>${d.staff.filter(s=>_sp.sel.every(i=>s.service_ids.includes(i))).map(s=>`<option value="${s.id}"${_sp.staff===s.id?" selected":""}>${esc(s.name)}</option>`).join("")}</select></div>`:""}
    ${_sp.sel.length&&_sp.day?`<div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">3. ${esc(t("pb_choose_time"))}</div><div id="sp-slots" class="pb-slots"><div style="color:var(--muted);font-size:13px">${esc(t("loading"))}</div></div></div>`:""}
    ${_sp.time?`<div class="card" id="sp-form"><div style="font-weight:700;margin-bottom:8px">4. ${esc(t("pb_your_details"))}</div><div class="fgrp"><label class="fl">${esc(t("pb_name"))} *</label><input class="inp" id="sp-name"></div><div class="fgrp"><label class="fl">${esc(t("pb_phone"))} *</label><input class="inp" id="sp-phone" inputmode="tel" placeholder="+243 …"></div>
      <div class="fgrp"><label class="fl">${esc(t("fld_notes"))}</label><input class="inp" id="sp-note"></div>${typeof _ocp==="object"&&_ocp.info?.deposit_pct>0?`<div style="font-size:12px;color:var(--amber);margin-bottom:8px"><i class="ti ti-cash"></i> ${esc(t("oc_deposit_due").replace("{v}",zdMoney(Math.round(total*_ocp.info.deposit_pct)/100)))}</div>`:""}<div class="err-box" id="sp-err"></div><button class="btn btn-g" style="width:100%;padding:12px" id="sp-btn" onclick="submitSalonPublic()"><i class="ti ti-check"></i> ${esc(t("pb_confirm"))} — ${_sp.time}</button></div>`:""}
    ${typeof ocSalonShopHtml==="function"?ocSalonShopHtml():""}
    <div style="text-align:center;font-size:11px;color:var(--muted);margin:18px 0 80px">Zenith Dash</div></div>`;
  if(_sp.sel.length&&_sp.day)loadSalonSlots();
  if(typeof ocRenderCartBar==="function")ocRenderCartBar();
}
async function loadSalonSlots(){
  const box=document.getElementById("sp-slots");if(!box)return;
  try{const r=await fetch(`${API_BASE}/public/salon/${encodeURIComponent(_sp.slug)}/slots?day=${_sp.day}&services=${_sp.sel.join(",")}${_sp.staff?`&staff_id=${_sp.staff}`:""}`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"Erreur");
    box.innerHTML=d.slots.map(s=>`<button class="pb-slot${_sp.time===s.time?" active":""}" onclick="_sp.time='${s.time}';renderSalonPublic()">${s.time}</button>`).join("")||`<div style="color:var(--muted);font-size:13px">${esc(t("pb_no_slots"))}</div>`;}
  catch(e){box.innerHTML=`<div style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;}
}
async function submitSalonPublic(){
  const name=document.getElementById("sp-name"),phone=document.getElementById("sp-phone");const miss=[name,phone].filter(i=>!i.value.trim());if(miss.length){flagMissingFields(miss);return;}
  const btn=document.getElementById("sp-btn");btn.disabled=true;
  try{const r=await fetch(`${API_BASE}/public/salon/${encodeURIComponent(_sp.slug)}/appointments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_ids:_sp.sel,day:_sp.day,time:_sp.time,name:name.value.trim(),phone:phone.value.trim(),staff_id:_sp.staff||null,note:zdVal("sp-note")||null})});
    const d=await r.json();if(!r.ok)throw new Error(typeof d.detail==="string"?d.detail:"Erreur");
    document.getElementById("sp-form").innerHTML=`<div style="text-align:center;padding:16px"><i class="ti ti-circle-check" style="font-size:42px;color:var(--green)"></i><div style="font-weight:800;font-size:18px;margin-top:6px">${esc(t("bt_pub_done"))}</div><div style="margin-top:6px">${esc(d.day)} · ${esc(d.time)} – ${esc(d.end)} · ${esc(d.staff_name)} · <b>${zdMoney(d.total)}</b></div>${d.order_token?`<div style="margin-top:10px;color:var(--amber);font-weight:700">${esc(t("oc_deposit_due").replace("{v}",zdMoney(d.deposit)))}</div><a class="btn btn-g" style="margin-top:8px" href="?order=${encodeURIComponent(d.order_token)}"><i class="ti ti-cash"></i> ${esc(t("oc_pay_deposit"))}</a>`:""}</div>`;
    if(d.order_token&&typeof ocRemember==="function")ocRemember(d.order_token,"",d.name);
    if(d.id&&typeof zdClientLink==="function")zdClientLink("salon",d.id);}
  catch(e){showErr("sp-err",e.message);btn.disabled=false;}
}
