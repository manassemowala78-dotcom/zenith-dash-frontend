// ── 10.5.0 · Hôtel : room service par QR, cartes room service et minibar, entreprises, clients réguliers, tarifs, registre des voyageurs ──
const V5_RO_COL={new:"var(--blue)",preparing:"var(--amber)",delivered:"var(--green)",cancelled:"var(--red)"};
SECTOR_PAGE_LOADERS.hotelroomservice=async el=>{
  _v5.ros=_v5.ros||"open";const rows=await api("GET",`/hotel/room-orders?status=${_v5.ros}`);
  el.innerHTML=v5Head(t("nav_v5_roomservice"),t("v5_ro_x"),["open","all"].map(s=>`<button class="toggle-btn${_v5.ros===s?" active":""}" onclick="_v5.ros='${s}';navigate('hotelroomservice')">${esc(t("v5_ro_"+s))}</button>`).join("")+`<button class="btn btn-o btn-sm" onclick="navigate('hotelmenus')"><i class="ti ti-qrcode"></i> ${esc(t("v5_t_hmenus"))}</button>`)+
    (rows.length?`<div class="v5-cards">${rows.map(o=>`<div class="card" style="border-left:4px solid ${V5_RO_COL[o.status]}"><div style="display:flex;justify-content:space-between;gap:6px"><b>${esc(t("v5_room_n").replace("{n}",o.room||"—"))}</b><span class="mono" style="font-size:11px">${esc(o.number)}</span></div>
      <div style="font-size:12px;color:var(--muted)">${esc(zdTime(o.created_at))} · ${esc(t("v5_ros_"+o.status))}</div>
      <div style="margin:6px 0;font-size:13px">${o.items.map(i=>`${i.qty} × ${esc(i.name)}`).join("<br>")}</div>${o.note?`<div class="card2" style="font-size:12px">${esc(o.note)}</div>`:""}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><b>${zdMoney(o.total)}</b><span style="display:flex;gap:6px">
        ${o.status==="new"?`<button class="btn btn-o btn-sm" onclick="v5RoSt('${o.id}','preparing')"><i class="ti ti-chef-hat"></i> ${esc(t("v5_ros_preparing"))}</button>`:""}
        ${["new","preparing"].includes(o.status)?`<button class="btn btn-g btn-sm" onclick="v5RoSt('${o.id}','delivered')"><i class="ti ti-check"></i> ${esc(t("v5_ro_deliver"))}</button><button class="btn btn-r btn-sm" aria-label="${esc(t("btn_cancel"))}" onclick="v5RoSt('${o.id}','cancelled')"><i class="ti ti-x"></i></button>`:""}</span></div></div>`).join("")}</div>`:v5Empty("v5_ro_none","tools-kitchen-2"));
  sectorTimer("hotelroomservice",()=>{if(!document.querySelector(".modal-overlay[style*='flex']"))SECTOR_PAGE_LOADERS.hotelroomservice(el);},20000);
};
async function v5RoSt(id,s){if(s==="cancelled"&&!confirm(t("v5_cancel_q")))return;if(await v5Do(()=>api("POST",`/hotel/room-orders/${id}/status`,{status:s}),s==="delivered"?t("v5_ro_charged"):t("v5_saved")))navigate("hotelroomservice");}

// ── Cartes room service et minibar, QR des chambres ──
SECTOR_PAGE_LOADERS.hotelmenus=async el=>{
  const m=await api("GET","/hotel/menus");_v5.hm={rs:m.room_service.map(x=>({...x})),mb:m.minibar.map(x=>({...x})),on:m.room_service_on};
  try{_v5.hmProds=await api("GET","/stock/products");}catch(_){_v5.hmProds=[];}
  const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_hmenus"),t("v5_hm_x"),`<button class="btn btn-o btn-sm" onclick="v5RoomQr()"><i class="ti ti-qrcode"></i> ${esc(t("v5_room_qr"))}</button>`+(mgr?`<button class="btn btn-g btn-sm" onclick="v5HmSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button>`:""),"hoteltools")+
    `<div class="card"><label class="terms-check"><input type="checkbox" id="v5-hm-on" ${m.room_service_on?"checked":""} ${mgr?"":"disabled"}><span><b>${esc(t("v5_rs_open"))}</b> — ${esc(t("v5_rs_open_x"))}</span></label></div>
    <div class="grid2" style="margin-top:12px;align-items:start"><div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><b><i class="ti ti-tools-kitchen-2"></i> ${esc(t("v5_rs_menu"))}</b>${mgr?`<button class="btn btn-o btn-sm" onclick="v5HmAdd('rs')"><i class="ti ti-plus"></i></button>`:""}</div><div id="v5-hm-rs"></div></div>
      <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><b><i class="ti ti-fridge"></i> ${esc(t("v5_minibar"))}</b>${mgr?`<button class="btn btn-o btn-sm" onclick="v5HmAdd('mb')"><i class="ti ti-plus"></i></button>`:""}</div><div id="v5-hm-mb"></div></div></div>
    <div class="err-box" id="v5-hm-err"></div>`;
  v5HmDraw("rs");v5HmDraw("mb");
};
function v5HmDraw(k){
  const box=document.getElementById("v5-hm-"+k);if(!box)return;const list=_v5.hm[k];const prods=_v5.hmProds||[];
  box.innerHTML=list.length?list.map((x,i)=>`<div class="v5-mi"><input class="inp" aria-label="${esc(t("v5_name"))}" placeholder="${esc(t("v5_name"))}" value="${esc(x.name)}" oninput="_v5.hm.${k}[${i}].name=this.value">
    <input class="inp v5-n" aria-label="${esc(t("v5_price"))}" type="number" min="0" step="0.01" value="${x.price}" oninput="_v5.hm.${k}[${i}].price=+this.value||0">
    <select class="inp" aria-label="${esc(t("v5_stock_link"))}" onchange="_v5.hm.${k}[${i}].product_id=this.value||null"><option value="">${esc(t("v5_no_stock"))}</option>${prods.map(p=>`<option value="${p.id}"${p.id===x.product_id?" selected":""}>${esc(p.name)}</option>`).join("")}</select>
    <label class="terms-check" style="margin:0" title="${esc(t("v5_available"))}"><input type="checkbox" ${x.available!==false?"checked":""} onchange="_v5.hm.${k}[${i}].available=this.checked"><span>${esc(t("v5_available"))}</span></label>
    <button class="btn btn-o btn-sm" aria-label="${esc(t("btn_delete"))}" onclick="_v5.hm.${k}.splice(${i},1);v5HmDraw('${k}')"><i class="ti ti-x"></i></button></div>`).join(""):`<div style="font-size:12px;color:var(--muted);padding:8px 0">${esc(t("v5_hm_empty"))}</div>`;
}
function v5HmAdd(k){_v5.hm[k].push({name:"",price:0,product_id:null,available:true});v5HmDraw(k);}
async function v5HmSave(){
  const clean=l=>l.filter(x=>(x.name||"").trim()).map(x=>({id:x.id||null,name:x.name.trim(),price:+x.price||0,category:x.category||null,product_id:x.product_id||null,available:x.available!==false}));
  if(await v5Do(()=>api("PUT","/hotel/menus",{room_service:clean(_v5.hm.rs),minibar:clean(_v5.hm.mb),room_service_on:document.getElementById("v5-hm-on").checked}),t("v5_saved"),"v5-hm-err"))navigate("hotelmenus");
}
async function v5RoomQr(){
  try{const rooms=await api("GET","/hotel/room-qr");if(!rooms.length){showToast(t("v5_no_rooms"),"error");return;}
    const co=State.tenant?.company_name||State.tenant?.name||"";
    v5Print(t("v5_room_qr"),`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${rooms.map(r=>`<div style="border:1px dashed #999;border-radius:8px;padding:10px;text-align:center;break-inside:avoid"><div style="font-weight:800;font-size:15px">${esc(t("v5_room_n").replace("{n}",r.number))}</div>
      <div style="width:120px;margin:6px auto">${v5QrSvg(r.url,4)}</div><div style="font-size:11px">${esc(t("v5_qr_scan_order"))}</div><div style="font-size:10px;color:#555">${esc(co)}</div></div>`).join("")}</div>`);
  }catch(e){showToast(e.message,"error");}
}

// ── Comptes entreprises (relevé mensuel) ──
SECTOR_PAGE_LOADERS.hotelcorporate=async el=>{
  _v5.hcm=_v5.hcm||v5Month();const r=await api("GET",`/hotel/corporate?month=${_v5.hcm}`);_v5.hc=r;
  el.innerHTML=v5Head(t("v5_t_corporate"),t("v5_corp_x"),`<input class="inp" type="month" value="${_v5.hcm}" style="width:auto" aria-label="${esc(t("v5_month"))}" onchange="_v5.hcm=this.value;navigate('hotelcorporate')">`,"hoteltools")+
    (r.companies.length?r.companies.map((c,i)=>`<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div><b>${esc(c.name)}</b><div style="font-size:12px;color:var(--muted)">${esc(t("v5_stays_n").replace("{n}",c.stays.length))} · ${esc(t("v5_total"))} ${zdMoney(c.total)}</div></div>
      <div style="display:flex;gap:6px;align-items:center"><b style="color:${c.due>0?"var(--amber)":"var(--green)"}">${esc(t("v5_due"))} ${zdMoney(c.due)}</b><button class="btn btn-o btn-sm" onclick="v5CorpPrint(${i})"><i class="ti ti-printer"></i> ${esc(t("v5_statement"))}</button></div></div>
      ${v5Table([t("v5_booking"),t("v5_guest"),t("v5_stay"),t("v5_invoice"),t("v5_total"),t("v5_due")],c.stays.map(s=>`<tr><td class="mono">${esc(s.booking)}</td><td>${esc(s.guest)}</td><td>${esc(v5Date(s.check_in))} → ${esc(v5Date(s.check_out))}</td><td><a href="#" onclick="openInvoiceDoc('${s.invoice_id}');return false" class="mono">${esc(s.invoice)}</a></td><td>${zdMoney(s.total)}</td><td>${zdMoney(s.due)}</td></tr>`))}</div>`).join(""):v5Empty("v5_corp_none","building"))+
    `<div class="card2" style="margin-top:12px;font-size:12px;color:var(--muted)"><i class="ti ti-info-circle"></i> ${esc(t("v5_corp_how"))}</div>`;
};
function v5CorpPrint(i){const r=_v5.hc;const c=r.companies[i];
  v5Print(t("v5_statement")+" "+c.name,v5DocHead(r.company,t("v5_statement"),`${c.name} · ${r.month}`)+v5DocTable([t("v5_booking"),t("v5_guest"),t("v5_stay"),t("v5_invoice"),t("v5_total"),t("v5_due")],c.stays.map(s=>[esc(s.booking),esc(s.guest),`${esc(v5Date(s.check_in))} → ${esc(v5Date(s.check_out))}`,esc(s.invoice),zdMoney(s.total),zdMoney(s.due)]))+
    `<div style="text-align:right;margin-top:10px;font-size:13px"><div>${esc(t("v5_total"))} : <b>${zdMoney(c.total)}</b></div><div>${esc(t("v5_due"))} : <b>${zdMoney(c.due)}</b></div></div>`);}

// ── Clients réguliers ──
SECTOR_PAGE_LOADERS.hotelguests=async el=>{
  const r=await api("GET",`/hotel/guests?q=${encodeURIComponent(_v5.hgq||"")}`);
  el.innerHTML=v5Head(t("v5_t_guests"),t("v5_guests_x").replace("{n}",r.regulars),"","hoteltools")+
    `<input class="inp" style="margin-bottom:10px" placeholder="${esc(t("v5_find_client"))}" aria-label="${esc(t("v5_find_client"))}" value="${esc(_v5.hgq||"")}" onkeydown="if(event.key==='Enter'){_v5.hgq=this.value;navigate('hotelguests')}">`+
    (r.guests.length?`<div class="card">${v5Table([t("v5_guest"),t("v5_stays"),t("v5_nights"),t("v5_last_stay"),t("v5_spent"),r.loyalty_enabled?t("v5_points_lbl"):"",""],r.guests.map(g=>`<tr><td><b>${esc(g.name||"—")}</b> ${g.regular?v5Badge(t("v5_regular"),"bp"):""}<div style="font-size:11px;color:var(--muted)">${esc(g.phone||"")}</div></td>
      <td>${g.stays}</td><td>${g.nights}</td><td>${esc(v5Date(g.last))}</td><td>${zdMoney(g.spent)}</td><td>${r.loyalty_enabled?g.points:""}</td>
      <td>${g.phone?`<a class="btn btn-o btn-sm" target="_blank" rel="noopener" aria-label="WhatsApp" href="${esc(v5Wa(g.phone,t("v5_guest_thanks").replace("{n}",g.name||"").replace("{h}",State.tenant?.company_name||"")))}"><i class="ti ti-brand-whatsapp"></i></a>`:""}</td></tr>`))}</div>`:v5Empty("v5_guests_none","users"));
};

// ── Tarifs par saison, week-end et longue durée ──
SECTOR_PAGE_LOADERS.hotelrates=async el=>{
  const [r,types]=await Promise.all([api("GET","/hotel/rate-rules"),api("GET","/hotel/room-types")]);_v5.rr=JSON.parse(JSON.stringify(r.rules||[]));_v5.rtypes=Array.isArray(types)?types:(types.types||[]);const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_rates"),t("v5_rates_x"),mgr?`<button class="btn btn-o btn-sm" onclick="v5RrAdd()"><i class="ti ti-plus"></i> ${esc(t("v5_rule_add"))}</button><button class="btn btn-g btn-sm" onclick="v5RrSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button>`:"","hoteltools")+
    `<div id="v5-rr"></div><div class="err-box" id="v5-rr-err"></div>
    <div class="card" style="margin-top:12px"><b><i class="ti ti-calculator"></i> ${esc(t("v5_rate_sim"))}</b>
      <div class="grid2" style="margin-top:8px"><div class="fgrp"><label class="fl" for="v5-rq-t">${esc(t("v5_room_type"))}</label><select class="inp" id="v5-rq-t">${_v5.rtypes.map(x=>`<option value="${x.id}">${esc(x.name)} · ${zdMoney(x.base_rate)}</option>`).join("")}</select></div>
        <div class="grid2"><div class="fgrp"><label class="fl" for="v5-rq-a">${esc(t("v5_arrival"))}</label><input class="inp" id="v5-rq-a" type="date" value="${zdToday()}"></div><div class="fgrp"><label class="fl" for="v5-rq-b">${esc(t("v5_departure"))}</label><input class="inp" id="v5-rq-b" type="date" value="${isoDate(new Date(Date.now()+3*864e5))}"></div></div></div>
      <button class="btn btn-o btn-sm" onclick="v5RateQuote()">${esc(t("v5_calc"))}</button><div id="v5-rq-r" style="margin-top:8px"></div></div>`;
  v5RrDraw();
};
function v5RrDraw(){
  const box=document.getElementById("v5-rr");if(!box)return;
  box.innerHTML=_v5.rr.length?_v5.rr.map((r,i)=>`<div class="card2 v5-hh"><div class="grid2"><div class="fgrp"><label class="fl" for="v5-rr-n${i}">${esc(t("v5_name"))}</label><input class="inp" id="v5-rr-n${i}" value="${esc(r.name)}" maxlength="60" oninput="_v5.rr[${i}].name=this.value"></div>
      <div class="grid2"><div class="fgrp"><label class="fl" for="v5-rr-k${i}">${esc(t("v5_type"))}</label><select class="inp" id="v5-rr-k${i}" onchange="_v5.rr[${i}].kind=this.value;v5RrDraw()">${["season","weekend","long_stay"].map(k=>`<option value="${k}"${r.kind===k?" selected":""}>${esc(t("v5_rk_"+k))}</option>`).join("")}</select></div>
        <div class="fgrp"><label class="fl" for="v5-rr-p${i}">${esc(t("v5_rate_change"))}</label><input class="inp" id="v5-rr-p${i}" type="number" min="-90" max="300" step="1" value="${r.pct}" oninput="_v5.rr[${i}].pct=+this.value||0"></div></div></div>
    ${r.kind==="season"?`<div class="grid2"><div class="fgrp"><label class="fl" for="v5-rr-s${i}">${esc(t("v5_from_ddmm"))}</label><input class="inp" id="v5-rr-s${i}" placeholder="12-15" value="${esc(r.start||"")}" oninput="_v5.rr[${i}].start=this.value"></div><div class="fgrp"><label class="fl" for="v5-rr-e${i}">${esc(t("v5_to_ddmm"))}</label><input class="inp" id="v5-rr-e${i}" placeholder="01-10" value="${esc(r.end||"")}" oninput="_v5.rr[${i}].end=this.value"></div></div>`:""}
    ${r.kind==="weekend"?`<div class="v5-days" role="group" aria-label="${esc(t("v5_nights_lbl"))}">${[0,1,2,3,4,5,6].map(d=>`<label><input type="checkbox" ${(r.days||[]).includes(d)?"checked":""} onchange="v5RrDay(${i},${d},this.checked)"><span>${esc(t("v5_wd_"+d).slice(0,3))}</span></label>`).join("")}</div>`:""}
    ${r.kind==="long_stay"?`<div class="fgrp"><label class="fl" for="v5-rr-m${i}">${esc(t("v5_min_nights"))}</label><input class="inp" id="v5-rr-m${i}" type="number" min="1" max="365" value="${r.min_nights||7}" oninput="_v5.rr[${i}].min_nights=+this.value||1"></div>`:""}
    <div class="v5-days" role="group" aria-label="${esc(t("v5_room_types"))}"><span style="font-size:12px;color:var(--muted)">${esc(t("v5_room_types"))} :</span>${_v5.rtypes.map(ty=>`<label><input type="checkbox" ${(r.type_ids||[]).includes(ty.id)?"checked":""} onchange="v5RrType(${i},'${ty.id}',this.checked)"><span>${esc(ty.name)}</span></label>`).join("")}<small style="color:var(--muted)">${esc(t("v5_all_if_none"))}</small></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><label class="terms-check" style="margin:0"><input type="checkbox" ${r.enabled!==false?"checked":""} onchange="_v5.rr[${i}].enabled=this.checked"><span>${esc(t("v5_active"))}</span></label><button class="btn btn-r btn-sm" onclick="_v5.rr.splice(${i},1);v5RrDraw()"><i class="ti ti-trash"></i> ${esc(t("btn_delete"))}</button></div></div>`).join(""):v5Empty("v5_rules_none","calendar-dollar");
}
function v5RrDay(i,d,on){const s=new Set(_v5.rr[i].days||[]);on?s.add(d):s.delete(d);_v5.rr[i].days=[...s].sort();}
function v5RrType(i,id,on){const s=new Set(_v5.rr[i].type_ids||[]);on?s.add(id):s.delete(id);_v5.rr[i].type_ids=[...s];}
function v5RrAdd(){_v5.rr.push({name:t("v5_rule_default"),kind:"season",pct:20,start:"12-15",end:"01-10",days:[4,5],min_nights:7,type_ids:[],enabled:true});v5RrDraw();}
async function v5RrSave(){
  const rules=_v5.rr.map(r=>({name:(r.name||"").trim()||t("v5_rule_default"),kind:r.kind,pct:+r.pct||0,start:r.kind==="season"?(r.start||"").trim():null,end:r.kind==="season"?(r.end||"").trim():null,days:r.kind==="weekend"?(r.days||[]):[],min_nights:r.kind==="long_stay"?(+r.min_nights||1):1,type_ids:r.type_ids||[],enabled:r.enabled!==false}));
  if(rules.some(r=>r.kind==="season"&&!(/^\d{2}-\d{2}$/.test(r.start)&&/^\d{2}-\d{2}$/.test(r.end)))){v5Err("v5-rr-err",t("v5_ddmm_bad"));return;}
  if(await v5Do(()=>api("PUT","/hotel/rate-rules",{rules}),t("v5_saved"),"v5-rr-err"))navigate("hotelrates");
}
async function v5RateQuote(){
  const box=document.getElementById("v5-rq-r");
  try{const q=await api("GET",`/hotel/rate-quote?type_id=${zdVal("v5-rq-t")}&check_in=${zdVal("v5-rq-a")}&check_out=${zdVal("v5-rq-b")}`);
    box.innerHTML=`<div style="font-size:13px">${q.nights.map(n=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(v5Date(n.day))}${n.rules.length?` <small style="color:var(--muted)">${esc(n.rules.join(", "))}</small>`:""}</span><b>${zdMoney(n.rate)}</b></div>`).join("")}
      <div style="display:flex;justify-content:space-between;margin-top:6px"><span>${esc(t("v5_avg_night"))} ${zdMoney(q.average)}</span><b>${esc(t("v5_total"))} ${zdMoney(q.total)}</b></div></div>`;
  }catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;}
}

// ── Registre des voyageurs (fiche de police) ──
SECTOR_PAGE_LOADERS.hotelpolice=async el=>{
  const today=zdToday();_v5.hpa=_v5.hpa||today.slice(0,8)+"01";_v5.hpb=_v5.hpb||today;
  const r=await api("GET",`/hotel/police-register?from=${_v5.hpa}&to=${_v5.hpb}`);_v5.hp=r;
  el.innerHTML=v5Head(t("v5_t_police"),t("v5_police_x"),`<input class="inp" type="date" value="${_v5.hpa}" style="width:auto" aria-label="${esc(t("v5_from"))}" onchange="_v5.hpa=this.value;navigate('hotelpolice')"><input class="inp" type="date" value="${_v5.hpb}" style="width:auto" aria-label="${esc(t("v5_to"))}" onchange="_v5.hpb=this.value;navigate('hotelpolice')"><button class="btn btn-g btn-sm" onclick="v5PolicePrint()"><i class="ti ti-printer"></i> ${esc(t("v5_print_pdf"))}</button>`,"hoteltools")+
    (r.missing?`<div class="card2" style="color:var(--amber);font-size:13px;margin-bottom:10px"><i class="ti ti-alert-triangle"></i> ${esc(t("v5_police_missing").replace("{n}",r.missing))}</div>`:"")+
    (r.rows.length?`<div class="card">${v5Table(["#",t("v5_guest"),t("v5_nationality"),t("v5_id_doc"),t("v5_room"),t("v5_arrival"),t("v5_departure"),t("v5_persons")],r.rows.map(x=>`<tr style="${x.missing?"background:color-mix(in srgb,var(--amber) 10%,transparent)":""}"><td>${x.n}</td><td><b>${esc(x.guest)}</b><div style="font-size:11px;color:var(--muted)">${esc(x.phone||"")}</div></td><td>${esc(x.nationality||"—")}</td><td>${esc(x.id_doc||"—")}</td><td>${esc(x.room||"—")}</td><td>${esc(v5Date(x.check_in))}</td><td>${esc(v5Date(x.check_out))}</td><td>${x.adults}${x.children?` + ${x.children}`:""}</td></tr>`))}</div>`:v5Empty("v5_police_none","id"));
};
function v5PolicePrint(){const r=_v5.hp;if(!r)return;
  v5Print(t("v5_t_police"),v5DocHead(r.company,t("v5_police_title"),`${v5Date(r.from)} → ${v5Date(r.to)}`)+v5DocTable(["#",t("v5_guest"),t("v5_nationality"),t("v5_id_doc"),t("v5_phone"),t("v5_room"),t("v5_arrival"),t("v5_departure"),t("v5_persons")],
    r.rows.map(x=>[String(x.n),esc(x.guest),esc(x.nationality||""),esc(x.id_doc||""),esc(x.phone||""),esc(x.room||""),esc(v5Date(x.check_in)),esc(v5Date(x.check_out)),`${x.adults}${x.children?" + "+x.children:""}`]))+
    `<div style="margin-top:30px;display:flex;justify-content:space-between;font-size:11px"><span>${esc(t("v5_sign_manager"))}</span><span>${esc(t("v5_stamp"))}</span></div>`);}

// ── Fiche du séjour : minibar et bon de fidélité ──
if(typeof htFolio==="function"){
  const _v5HtFolio=htFolio;
  htFolio=async function(id){
    await _v5HtFolio(id);const b=_ht.bk;if(!b)return;const ov=document.getElementById("modal-ht-folio");const more=ov?.querySelector(".rs-more");if(!more)return;
    if(b.status==="checked_in")more.insertAdjacentHTML("beforeend",`<button class="btn btn-o" onclick="v5MinibarModal('${b.id}')"><i class="ti ti-fridge"></i> ${esc(t("v5_minibar"))}</button>`);
    if(["booked","checked_in"].includes(b.status))more.insertAdjacentHTML("beforeend",`<button class="btn btn-o" onclick="v5HtVoucher('${b.id}')"><i class="ti ti-gift"></i> ${esc(t("v5_use_voucher"))}</button>`);
  };
}
async function v5MinibarModal(bid){
  const m=await api("GET","/hotel/menus");const items=(m.minibar||[]).filter(x=>x.available!==false);
  if(!items.length){showToast(t("v5_minibar_empty"),"error");return;}
  zdModal("modal-v5-mb",`<div class="modal-title"><i class="ti ti-fridge" style="color:var(--green)"></i> ${esc(t("v5_minibar"))}</div>
    ${items.map(x=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(x.name)} <small style="color:var(--muted)">${zdMoney(x.price)}</small></span><input class="inp v5-n" type="number" min="0" max="50" value="0" data-mb="${x.id}" aria-label="${esc(x.name)}"></div>`).join("")}
    <div class="err-box" id="v5-mb-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-mb')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5MinibarSave('${bid}')"><i class="ti ti-check"></i> ${esc(t("v5_charge_room"))}</button></div>`,420);
}
async function v5MinibarSave(bid){
  const lines=[...document.querySelectorAll("[data-mb]")].map(i=>({id:i.dataset.mb,qty:parseInt(i.value)||0})).filter(x=>x.qty>0);if(!lines.length){v5Err("v5-mb-err",t("v5_minibar_none"));return;}
  const r=await v5Do(()=>api("POST",`/hotel/bookings/${bid}/minibar`,{lines}),null,"v5-mb-err");if(r){showToast(t("v5_charged_x").replace("{v}",zdMoney(r.total)));zdCloseModal("modal-v5-mb");htFolio(bid);}
}
async function v5HtVoucher(bid){
  const code=prompt(t("v5_voucher_code_q"));if(!code)return;
  if(await v5Do(()=>api("POST",`/hotel/bookings/${bid}/voucher`,{code:code.trim()}),t("v5_voucher_used")))htFolio(bid);
}

// ── Réservation : calcul du tarif selon les règles ──
if(typeof htBookingModal==="function"){
  const _v5HtBm=htBookingModal;
  htBookingModal=async function(id,pre){
    await _v5HtBm(id,pre);const rate=document.getElementById("ht-b-rate");if(!rate||document.getElementById("v5-ht-q"))return;
    rate.insertAdjacentHTML("afterend",`<button type="button" id="v5-ht-q" class="btn btn-o btn-sm" style="margin-top:6px" onclick="v5HtQuote()"><i class="ti ti-calculator"></i> ${esc(t("v5_rate_apply"))}</button><div id="v5-ht-qr" style="font-size:12px;color:var(--muted)"></div>`);
  };
}
async function v5HtQuote(){
  const ty=zdVal("ht-b-type"),a=zdVal("ht-b-ci"),b=zdVal("ht-b-co");const out=document.getElementById("v5-ht-qr");
  if(!ty||!a||!b){out.textContent=t("v5_rate_need");return;}
  try{const q=await api("GET",`/hotel/rate-quote?type_id=${ty}&check_in=${a}&check_out=${b}`);document.getElementById("ht-b-rate").value=q.average;out.textContent=t("v5_rate_applied").replace("{a}",zdMoney(q.average)).replace("{t}",zdMoney(q.total));}
  catch(e){out.textContent=e.message;}
}
