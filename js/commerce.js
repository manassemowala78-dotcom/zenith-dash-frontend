// ── MODULES COMMERCE ET PHARMACIE (9.0) ──
const _rt={cat:null,cart:[],client:"",method:"cash",onAccount:false,insurer:"",quote:null,q:"",lowOnly:false,lotFilter:"all",repDay:null,rxQ:"",clients:null};
function rtPharma(){return hasModule("pharmacy");}
async function rtCatalog(force){if(!_rt.cat||force)_rt.cat=await api("GET","/retail/catalog");return _rt.cat;}
async function rtClients(force){if(!_rt.clients||force)_rt.clients=await api("GET","/retail/clients");return _rt.clients;}

// ── Caisse comptoir ──
SECTOR_PAGE_LOADERS.retailpos=async el=>{
  const [cat,cls]=await Promise.all([rtCatalog(true),rtClients(true)]);
  if(!cat.length){el.innerHTML=sectorPageHead(esc(t("nav_retail_pos")),"")+`<div class="card" style="text-align:center;padding:26px">${zdEmpty(t("rt_no_products"),"packages")}${rsIsManager()?`<button class="btn btn-g btn-sm" onclick="rtDemo()"><i class="ti ti-sparkles"></i> ${esc(t("welcome_load_demo"))}</button>`:""}</div>`;return;}
  el.innerHTML=sectorPageHead(esc(t("nav_retail_pos")),esc(t(rtPharma()?"rt_pos_sub_pharma":"rt_pos_sub")))+
    `<div class="pos-grid"><div><div style="display:flex;gap:6px;margin-bottom:10px"><input class="inp" id="rt-search" placeholder="${esc(t("rt_search_scan"))}" value="${esc(_rt.q)}" oninput="_rt.q=this.value;rtRenderProducts()" onkeydown="if(event.key==='Enter'){event.preventDefault();rtScan(this.value)}"></div>
      <div id="rt-products" class="pos-products"></div></div>
      <div class="card pos-cart-card"><div style="font-weight:700;margin-bottom:8px"><i class="ti ti-shopping-cart"></i> ${esc(t("pos_cart"))} <button class="btn btn-o btn-sm" style="float:right;padding:2px 8px" onclick="_rt.cart=[];rtRenderCart()">${esc(t("btn_clear"))}</button></div>
      <div id="rt-cart"></div>
      <div class="fgrp" style="margin-top:8px"><label class="fl">${esc(t("rs_customer"))}</label><select class="inp" id="rt-client" onchange="_rt.client=this.value;rtQuote()"><option value="">${esc(t("rt_walk_in_customer"))}</option>${cls.filter(c=>!c.insurer).map(c=>`<option value="${c.id}"${_rt.client===c.id?" selected":""}>${esc(c.name)}${c.price_level==="wholesale"?" · "+esc(t("rt_wholesale")):""}${c.due?` · ${esc(t("rt_owes"))} ${zdMoney(c.due)}`:""}</option>`).join("")}</select></div>
      ${rtPharma()?`<div class="fgrp"><label class="fl">${esc(t("rt_insurer"))}</label><select class="inp" id="rt-insurer" onchange="_rt.insurer=this.value;rtRenderCart()"><option value="">—</option>${cls.filter(c=>c.insurer).map(c=>`<option value="${c.id}"${_rt.insurer===c.id?" selected":""}>${esc(c.name)} (${c.coverage_pct} %)</option>`).join("")}</select></div><div id="rt-rx"></div>`:""}
      <div id="rt-totals"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0">${["cash","mobile_money","card","account"].map(m=>`<button class="toggle-btn${_rt.method===m?" active":""}" onclick="_rt.method='${m}';rtRenderCart()">${esc(t(m==="account"?"rt_on_credit":"pay_method_"+m))}</button>`).join("")}</div>
      <div id="rt-cash" class="fgrp"></div>
      <div class="err-box" id="rt-err"></div>
      <button class="btn btn-g" id="rt-pay" style="width:100%;font-size:16px;padding:12px" onclick="submitRtSale()"><i class="ti ti-cash"></i> ${esc(t("btn_pos_pay"))}</button></div></div>`;
  rtRenderProducts();rtRenderCart();setTimeout(()=>{if(window.innerWidth>768)document.getElementById("rt-search")?.focus();},100);
};
async function rtDemo(){try{await api("POST","/retail/setup-demo");_rt.cat=null;showToast(t("welcome_demo_done"));navigate(rtPharma()?"retailpos":"retailpos");}catch(e){showToast(e.message,"error");}}
function rtRenderProducts(){
  const box=document.getElementById("rt-products");if(!box)return;const q=_rt.q.trim().toLowerCase();
  const list=_rt.cat.filter(p=>!q||(p.name+" "+(p.barcode||"")+" "+(p.dci||"")+" "+(p.category||"")).toLowerCase().includes(q)).slice(0,80);
  box.innerHTML=list.map(p=>`<button class="pos-prod${p.sellable_qty<=0?" out":""}" ${p.sellable_qty<=0?"disabled":""} onclick="rtAdd('${p.id}')"><span class="pn">${esc(p.name)}${p.rx?` <span class="badge br">Rx</span>`:""}</span><span class="pp">${zdMoney(p.price)}</span>
    <span class="ps">${zdQty(p.sellable_qty)} ${esc(p.unit)}${p.expired_qty?` · <span style="color:var(--red)">${zdQty(p.expired_qty)} ${esc(t("rt_expired_short"))}</span>`:""}${p.units.length?` · ${p.units.map(u=>esc(u.name)).join("/")}`:""}</span></button>`).join("")||zdEmpty(t("no_products"));
}
function rtAdd(pid,unit,qty){
  const p=_rt.cat.find(x=>x.id===pid);if(!p)return;
  if(unit===undefined&&p.units.length){
    zdModal("modal-rt-unit",`<div class="modal-title">${esc(p.name)}</div><div class="rs-more">${[{name:p.unit,factor:1,price:p.price}].concat(p.units).map(u=>`<button class="btn btn-o" onclick="zdCloseModal('modal-rt-unit');rtAdd('${pid}','${escJs(u.name)}')"><b>${esc(u.name)}</b>${u.factor>1?` (${zdQty(u.factor)} ${esc(p.unit)})`:""} <span class="mono" style="margin-left:auto">${u.price?zdMoney(u.price):zdMoney(p.price*u.factor)}</span></button>`).join("")}</div>`,380);return;}
  unit=unit||p.unit;
  const ex=_rt.cart.find(l=>l.product_id===pid&&l.unit===unit);
  if(ex)ex.qty+=qty||1;else _rt.cart.push({product_id:pid,name:p.name,unit,qty:qty||1,rx:p.rx});
  rtRenderCart();
}
async function rtScan(code){
  code=(code||"").trim();if(!code)return;
  try{const r=await api("GET",`/retail/lookup?code=${encodeURIComponent(code)}`);rtAdd(r.product_id,r.unit);_rt.q="";const i=document.getElementById("rt-search");if(i)i.value="";rtRenderProducts();zdBeep();}
  catch(e){if(_rt.cat.filter(p=>p.name.toLowerCase().includes(code.toLowerCase())).length===1)rtAdd(_rt.cat.find(p=>p.name.toLowerCase().includes(code.toLowerCase())).id);else showToast(e.message,"error");}
}
function rtDrawCart(){
  const box=document.getElementById("rt-cart");if(!box)return;
  box.innerHTML=_rt.cart.map((l,i)=>{const p=_rt.cat.find(x=>x.id===l.product_id);const units=[p.unit].concat(p.units.map(u=>u.name));const q=_rt.quote?.lines?.[i];
    return `<div class="pos-line"><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">${esc(l.name)}${l.rx?` <span class="badge br">Rx</span>`:""}</div>${q&&q.label!==l.name?`<div style="font-size:11px;color:var(--purple)">${esc(q.label.replace(l.name+" — ",""))}</div>`:""}
      ${units.length>1?`<select class="inp" style="padding:3px 6px;font-size:11px;width:auto;margin-top:3px" onchange="_rt.cart[${i}].unit=this.value;rtRenderCart()">${units.map(u=>`<option${u===l.unit?" selected":""}>${esc(u)}</option>`).join("")}</select>`:""}</div>
      <button class="btn btn-o btn-sm" onclick="_rt.cart[${i}].qty=Math.max(0,_rt.cart[${i}].qty-1);if(!_rt.cart[${i}].qty)_rt.cart.splice(${i},1);rtRenderCart()">−</button>
      <input class="inp" type="number" min="0.001" step="any" value="${l.qty}" style="width:60px;padding:4px;text-align:center" onchange="_rt.cart[${i}].qty=parseFloat(this.value)||1;rtRenderCart()">
      <button class="btn btn-o btn-sm" onclick="_rt.cart[${i}].qty++;rtRenderCart()">+</button><span class="mono" style="min-width:64px;text-align:right">${q?zdMoney(q.total):"…"}</span></div>`;}).join("")||`<div style="color:var(--muted);font-size:13px;padding:10px 0">${esc(t("rt_cart_empty"))}</div>`;
}
function rtRenderCart(){
  rtDrawCart();
  const rx=document.getElementById("rt-rx");
  if(rx){const need=_rt.cart.some(l=>l.rx);rx.innerHTML=need?`<div class="card2" style="padding:8px;border-radius:10px;margin-bottom:8px;border:1px solid var(--red)"><b style="font-size:12px;color:var(--red)"><i class="ti ti-prescription"></i> ${esc(t("rt_rx_required"))}</b>
    <div class="grid2" style="margin-top:6px"><input class="inp" id="rt-rx-patient" placeholder="${esc(t("rt_patient"))} *"><input class="inp" id="rt-rx-doctor" placeholder="${esc(t("rt_doctor"))} *"></div>
    <div class="grid2" style="margin-top:6px"><input class="inp" type="date" id="rt-rx-date" value="${zdToday()}"><input class="inp" id="rt-rx-age" placeholder="${esc(t("rt_age"))}"></div></div>`:"";}
  const cash=document.getElementById("rt-cash");if(cash)cash.innerHTML=_rt.method==="cash"?`<label class="fl">${esc(t("pos_tendered"))}</label><input class="inp" type="number" min="0" step="0.01" id="rt-tendered" oninput="rtTotals()"><div id="rt-change" style="font-weight:700;color:var(--amber);margin-top:6px"></div>`:"";
  rtQuote();
}
let _rtQT=null;
function rtQuote(){
  clearTimeout(_rtQT);
  _rtQT=setTimeout(async()=>{
    if(!_rt.cart.length){_rt.quote=null;rtTotals();return;}
    try{_rt.quote=await api("POST","/retail/quote",{lines:_rt.cart.map(l=>({product_id:l.product_id,qty:l.qty,unit:l.unit})),client_id:_rt.client||null});showErr("rt-err","");rtDrawCart();}
    catch(e){showErr("rt-err",e.message);}
    rtTotals();
  },180);
}
function rtTotals(){
  const box=document.getElementById("rt-totals");if(!box)return;const total=_rt.quote?.total||0;
  const ins=(_rt.clients||[]).find(c=>c.id===_rt.insurer);const insShare=ins?Math.round(total*ins.coverage_pct)/100:0;const pay=Math.round((total-insShare)*100)/100;
  box.innerHTML=`${_rt.quote?.level==="wholesale"?`<div class="badge bp" style="margin-bottom:6px">${esc(t("rt_wholesale_prices"))}</div>`:""}
    ${ins?`<div style="display:flex;justify-content:space-between;font-size:12px"><span>${esc(t("rt_insurer_share"))} (${ins.coverage_pct} %)</span><span class="mono">${zdMoney(insShare)}</span></div>`:""}
    <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0"><span style="font-weight:700">${esc(t(ins?"rt_patient_pays":"inv_preview_total"))}</span><span class="mono" style="font-size:26px;font-weight:800;color:var(--green)">${zdMoney(pay)}</span></div>`;
  const tv=zdNum("rt-tendered");const ch=document.getElementById("rt-change");if(ch)ch.textContent=tv!=null&&tv>=pay?`${t("pos_change")} ${zdMoney(tv-pay)}`:"";
  const btn=document.getElementById("rt-pay");if(btn)btn.disabled=!_rt.cart.length;
}
async function submitRtSale(){
  if(!_rt.cart.length)return;
  const body={lines:_rt.cart.map(l=>({product_id:l.product_id,qty:l.qty,unit:l.unit})),client_id:_rt.client||null,on_account:_rt.method==="account",method:_rt.method==="account"?"other":_rt.method};
  const tv=zdNum("rt-tendered");if(tv!=null&&_rt.method==="cash")body.tendered=tv;
  if(_rt.insurer)body.insurer_id=_rt.insurer;
  if(_rt.cart.some(l=>l.rx)||(_rt.insurer&&zdVal("rt-rx-patient"))){const pt=zdVal("rt-rx-patient"),dr=zdVal("rt-rx-doctor");
    if(_rt.cart.some(l=>l.rx)&&(!pt||!dr)){flagMissingFields([document.getElementById("rt-rx-patient"),document.getElementById("rt-rx-doctor")].filter(x=>!x.value.trim()));return;}
    if(pt&&dr)body.prescription={patient_name:pt,doctor:dr,issued_on:zdVal("rt-rx-date")||null,patient_age:zdVal("rt-rx-age")||null};}
  const btn=document.getElementById("rt-pay");btn.disabled=true;
  try{const r=await api("POST","/retail/sales",body);
    showToast(`${t("rs_paid_ok")} · ${r.number}`+(r.change!=null?` · ${t("pos_change")} ${zdMoney(r.change)}`:"")+(r.prescription_number?` · ${r.prescription_number}`:"")+(r.insurer_invoice_number?` · ${t("rt_insurer_invoice")} ${r.insurer_invoice_number}`:""));
    _rt.cart=[];_rt.quote=null;_rt.insurer="";if(_rt.method==="account")_rt.method="cash";
    if(confirm(t("rs_print_receipt_q")))zdShowReceipt(r.invoice_id);
    navigate("retailpos");}
  catch(e){showErr("rt-err",e.message);btn.disabled=false;}
}

// ── Catalogue ──
SECTOR_PAGE_LOADERS.retailcatalog=async el=>{
  const cat=await rtCatalog(true);const mgr=rsIsManager();const q=_rt.cq||"";
  const list=cat.filter(p=>(!_rt.lowOnly||p.low)&&(!q||(p.name+" "+(p.barcode||"")+" "+(p.category||"")).toLowerCase().includes(q.toLowerCase())));
  const value=cat.reduce((s,p)=>s+(p.stock_qty||0)*(p.cost_price||0),0);
  el.innerHTML=sectorPageHead(esc(t("nav_retail_catalog")),esc(t("rt_catalog_sub").replace("{n}",cat.length).replace("{v}",zdMoney(value)).replace("{l}",cat.filter(p=>p.low).length)),
    `<button class="btn btn-sm ${_rt.lowOnly?"btn-a":"btn-o"}" onclick="_rt.lowOnly=!_rt.lowOnly;navigate('retailcatalog')"><i class="ti ti-alert-triangle"></i> ${esc(t("rs_low_only"))}</button>${mgr?`<button class="btn btn-g btn-sm" onclick="rtProductModal()"><i class="ti ti-plus"></i> ${esc(t("rt_new_product"))}</button>`:""}`)+
    `<div class="card" style="margin-bottom:12px"><input class="inp" placeholder="${esc(t("rt_search_scan"))}" value="${esc(q)}" onchange="_rt.cq=this.value;navigate('retailcatalog')"></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>${esc(t("rt_product"))}</th><th>${esc(t("rs_stock"))}</th><th>${esc(t("fld_price"))}</th><th>${esc(t("rt_wholesale"))}</th><th>${esc(t("rt_units"))}</th><th></th></tr></thead><tbody>
    ${list.map(p=>`<tr><td><b>${esc(p.name)}</b>${p.rx?` <span class="badge br">Rx</span>`:""}${p.track_lots?` <span class="badge bb">${esc(t("rt_lots"))}</span>`:""}<div style="font-size:11px;color:var(--muted)">${esc(p.category||"")}${p.barcode?` · <span class="mono">${esc(p.barcode)}</span>`:""}${p.next_expiry?` · ${esc(t("cd_expiry"))} ${esc(p.next_expiry)}`:""}</div></td>
      <td class="mono" style="color:${p.low?"var(--red)":"var(--text)"}">${zdQty(p.sellable_qty)} ${esc(p.unit)}${p.expired_qty?`<div style="font-size:11px;color:var(--red)">+${zdQty(p.expired_qty)} ${esc(t("rt_expired_short"))}</div>`:""}</td>
      <td class="mono">${zdMoney(p.price)}${p.breaks.length?`<div style="font-size:10px;color:var(--purple)">${p.breaks.map(b=>`≥${zdQty(b.qty)} : ${zdMoney(b.price)}`).join(" · ")}</div>`:""}</td><td class="mono">${p.wholesale_price?zdMoney(p.wholesale_price):"—"}</td>
      <td style="font-size:11px">${p.units.map(u=>`${esc(u.name)} ×${zdQty(u.factor)}${u.price?` = ${zdMoney(u.price)}`:""}`).join("<br>")||"—"}</td>
      <td style="white-space:nowrap"><button class="btn btn-g btn-sm" title="${esc(t("rs_receive"))}" onclick="rtReceiveModal('${p.id}')"><i class="ti ti-truck-loading"></i></button>${mgr?` <button class="btn btn-o btn-sm" onclick="rtProductModal('${p.id}')"><i class="ti ti-pencil"></i></button>`:""}</td></tr>`).join("")||`<tr><td colspan="6">${zdEmpty(t("rt_no_products"),"packages")}</td></tr>`}
    </tbody></table></div></div>`;
};
let _rtEdit=null;
function rtProductModal(id){
  const p=id?_rt.cat.find(x=>x.id===id):null;const ph=rtPharma();
  _rtEdit={units:JSON.parse(JSON.stringify(p?.units||[])),breaks:JSON.parse(JSON.stringify(p?.breaks||[])),lots:[]};
  zdModal("modal-rt-prod",`<div class="modal-title"><i class="ti ti-package"></i> ${esc(t(p?"rt_edit_product":"rt_new_product"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_name"))} *</label><input class="inp" id="rt-p-name" value="${esc(p?.name||"")}"></div><div class="fgrp"><label class="fl">${esc(t("rs_category"))}</label><input class="inp" id="rt-p-cat" value="${esc(p?.category||"")}"></div></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("rt_retail_price"))} *</label><input class="inp" type="number" min="0" step="0.01" id="rt-p-price" value="${p?.price??""}"></div><div class="fgrp"><label class="fl">${esc(t("rt_wholesale_price"))}</label><input class="inp" type="number" min="0" step="0.01" id="rt-p-whole" value="${p?.wholesale_price??""}"></div><div class="fgrp"><label class="fl">${esc(t("rs_unit_cost"))}</label><input class="inp" type="number" min="0" step="0.01" id="rt-p-cost" value="${p?.cost_price??""}"></div></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("rt_base_unit"))}</label><input class="inp" id="rt-p-unit" value="${esc(p?.unit||"pcs")}" list="rs-units"></div><div class="fgrp"><label class="fl">${esc(t("rt_barcode"))}</label><input class="inp" id="rt-p-bc" value="${esc(p?.barcode||"")}"></div><div class="fgrp"><label class="fl">${esc(t("rs_min"))}</label><input class="inp" type="number" min="0" id="rt-p-min" value="${p?.stock_min||""}"></div></div>
    ${p?"":`<div class="fgrp"><label class="fl">${esc(t("rt_initial_stock"))}</label><input class="inp" type="number" min="0" id="rt-p-stock"></div>`}
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px"><label style="font-size:13px"><input type="checkbox" id="rt-p-lots" ${p?.track_lots?"checked":""}> ${esc(t("rt_track_lots"))}</label>${ph?`<label style="font-size:13px"><input type="checkbox" id="rt-p-rx" ${p?.rx?"checked":""}> ${esc(t("rt_rx"))}</label>`:""}</div>
    ${ph?`<div class="grid2"><div class="fgrp"><label class="fl">${esc(t("rt_dci"))}</label><input class="inp" id="rt-p-dci" value="${esc(p?.dci||"")}"></div><div class="fgrp"><label class="fl">${esc(t("rt_shelf"))}</label><input class="inp" id="rt-p-shelf" value="${esc(p?.shelf||"")}"></div></div>`:""}
    <div class="card2" style="padding:10px;border-radius:10px;margin-bottom:8px"><div style="display:flex;align-items:center"><b style="font-size:13px">${esc(t("rt_units_title"))}</b><button class="btn btn-o btn-sm" style="margin-left:auto" onclick="_rtEdit.units.push({name:'Carton',factor:12,price:null,barcode:''});rtRenderUnits()"><i class="ti ti-plus"></i></button></div><div id="rt-units"></div></div>
    <div class="card2" style="padding:10px;border-radius:10px"><div style="display:flex;align-items:center"><b style="font-size:13px">${esc(t("rt_breaks_title"))}</b><button class="btn btn-o btn-sm" style="margin-left:auto" onclick="_rtEdit.breaks.push({qty:10,price:0});rtRenderUnits()"><i class="ti ti-plus"></i></button></div><div id="rt-breaks"></div></div>
    <div class="err-box" id="rt-p-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rt-prod')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRtProduct('${p?p.id:""}')">${esc(t("btn_save"))}</button></div>`,700);
  rtRenderUnits();
}
function rtRenderUnits(){
  const u=document.getElementById("rt-units"),b=document.getElementById("rt-breaks");if(!u)return;
  u.innerHTML=_rtEdit.units.map((x,i)=>`<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><input class="inp" style="flex:1;min-width:90px" value="${esc(x.name)}" placeholder="Carton" oninput="_rtEdit.units[${i}].name=this.value"><input class="inp" type="number" min="1" style="width:80px" value="${x.factor}" title="${esc(t("rt_factor"))}" oninput="_rtEdit.units[${i}].factor=+this.value"><input class="inp" type="number" min="0" step="0.01" style="width:90px" value="${x.price??""}" placeholder="${esc(t("fld_price"))}" oninput="_rtEdit.units[${i}].price=this.value===''?null:+this.value"><input class="inp" style="width:140px" value="${esc(x.barcode||"")}" placeholder="${esc(t("rt_barcode"))}" oninput="_rtEdit.units[${i}].barcode=this.value"><button class="btn btn-o btn-sm" onclick="_rtEdit.units.splice(${i},1);rtRenderUnits()"><i class="ti ti-x"></i></button></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("rt_units_hint"))}</div>`;
  b.innerHTML=_rtEdit.breaks.map((x,i)=>`<div style="display:flex;gap:6px;margin-top:6px;align-items:center"><span style="font-size:12px">${esc(t("rt_from"))}</span><input class="inp" type="number" min="1" style="width:90px" value="${x.qty}" oninput="_rtEdit.breaks[${i}].qty=+this.value"><span style="font-size:12px">${esc(t("rt_price_each"))}</span><input class="inp" type="number" min="0" step="0.01" style="width:100px" value="${x.price||""}" oninput="_rtEdit.breaks[${i}].price=+this.value"><button class="btn btn-o btn-sm" onclick="_rtEdit.breaks.splice(${i},1);rtRenderUnits()"><i class="ti ti-x"></i></button></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("rt_breaks_hint"))}</div>`;
}
async function submitRtProduct(id){
  const body={name:zdVal("rt-p-name"),category:zdVal("rt-p-cat")||null,price:zdNum("rt-p-price"),cost_price:zdNum("rt-p-cost")||0,unit:zdVal("rt-p-unit")||"pcs",barcode:zdVal("rt-p-bc")||"",stock_min:zdNum("rt-p-min")||0,
    track_lots:document.getElementById("rt-p-lots").checked,units:_rtEdit.units.filter(u=>u.name&&u.factor>0).map(u=>({...u,barcode:u.barcode||null})),breaks:_rtEdit.breaks.filter(b=>b.qty>0&&b.price>0)};
  const w=zdNum("rt-p-whole");if(w!=null)body.wholesale_price=w;
  if(document.getElementById("rt-p-rx"))body.rx=document.getElementById("rt-p-rx").checked;
  if(document.getElementById("rt-p-dci")){body.dci=zdVal("rt-p-dci")||null;body.shelf=zdVal("rt-p-shelf")||null;}
  if(!id){const s=zdNum("rt-p-stock");if(s)body.initial_stock=s;}
  try{await api(id?"PATCH":"POST",id?`/retail/products/${id}`:"/retail/products",body);zdCloseModal("modal-rt-prod");_rt.cat=null;navigate("retailcatalog");showToast(t("rt_product_saved"));}catch(e){showErr("rt-p-err",e.message);}
}
function rtReceiveModal(id){
  const p=_rt.cat.find(x=>x.id===id);
  zdModal("modal-rt-rec",`<div class="modal-title"><i class="ti ti-truck-loading" style="color:var(--green)"></i> ${esc(t("rs_receive"))} · ${esc(p.name)}</div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("zd_qty"))} *</label><input class="inp" type="number" min="0" step="any" id="rt-r-qty"></div><div class="fgrp"><label class="fl">${esc(t("fld_unit"))}</label><select class="inp" id="rt-r-unit">${[p.unit].concat(p.units.map(u=>u.name)).map(u=>`<option>${esc(u)}</option>`).join("")}</select></div><div class="fgrp"><label class="fl">${esc(t("rt_cost_per_unit"))}</label><input class="inp" type="number" min="0" step="0.01" id="rt-r-cost"></div></div>
    ${p.track_lots?`<div class="grid2"><div class="fgrp"><label class="fl">${esc(t("rt_lot_number"))} *</label><input class="inp" id="rt-r-lot"></div><div class="fgrp"><label class="fl">${esc(t("cd_expiry"))}</label><input class="inp" type="date" id="rt-r-exp"></div></div>`:""}
    <div class="fgrp"><label class="fl">${esc(t("fld_supplier"))}</label><input class="inp" id="rt-r-sup"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rt-rec')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRtReceive('${id}')">${esc(t("btn_save"))}</button></div>`,540);
}
async function submitRtReceive(id){const body={qty:zdNum("rt-r-qty"),unit:zdVal("rt-r-unit"),cost:zdNum("rt-r-cost"),supplier:zdVal("rt-r-sup")||null};
  if(document.getElementById("rt-r-lot")){body.lot_number=zdVal("rt-r-lot");body.expiry=zdVal("rt-r-exp")||null;}
  try{await api("POST",`/retail/products/${id}/receive`,body);zdCloseModal("modal-rt-rec");_rt.cat=null;showToast(t("rs_received"));navigate("retailcatalog");}catch(e){showToast(e.message,"error");}}

// ── Carnet de crédit ──
SECTOR_PAGE_LOADERS.retailcredits=async el=>{
  const [cr,cls]=await Promise.all([api("GET","/retail/credits"),rtClients(true)]);const mgr=rsIsManager();
  el.innerHTML=sectorPageHead(esc(t("nav_retail_credits")),esc(t("rt_credits_sub")),`<button class="btn btn-g btn-sm" onclick="rtClientModal()"><i class="ti ti-user-plus"></i> ${esc(t("rt_new_client"))}</button>`)+
    `<div class="kgrid" style="margin-bottom:12px"><div class="kpi a"><div class="kl">${esc(t("rt_total_due"))}</div><div class="kv">${zdMoney(cr.total_due)}</div></div><div class="kpi r"><div class="kl">${esc(t("rt_overdue"))}</div><div class="kv">${zdMoney(cr.total_overdue)}</div></div><div class="kpi b"><div class="kl">${esc(t("rt_debtors"))}</div><div class="kv">${cr.clients.length}</div></div></div>
    <div class="card" style="margin-bottom:12px">${cr.clients.map(c=>`<div class="ht-bk"><span style="flex:1"><b>${esc(c.name)}</b>${c.insurer?` <span class="badge bb">${esc(t("rt_insurer_badge"))}</span>`:""}<div style="font-size:11px;color:var(--muted)">${c.invoices} ${esc(t("rt_invoices"))} · ${esc(t("rt_since"))} ${fmtDate(c.oldest)}${c.credit_limit?` · ${esc(t("rt_limit"))} ${zdMoney(c.credit_limit)}`:""}${c.overdue?` · <span style="color:var(--red)">${esc(t("rt_overdue"))} ${zdMoney(c.overdue)}</span>`:""}</div></span>
      <b class="mono" style="font-size:16px">${zdMoney(c.due)}</b><button class="btn btn-g btn-sm" onclick="rtPayModal('${c.id}','${escJs(c.name)}',${c.due})"><i class="ti ti-cash"></i></button>
      ${c.phone?`<a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc(c.phone.replace(/\D/g,""))}?text=${encodeURIComponent(t("rt_wa_reminder").replace("{n}",c.name).replace("{v}",zdMoney(c.due)))}"><i class="ti ti-brand-whatsapp"></i></a>`:""}</div>`).join("")||zdEmpty(t("rt_no_credit"),"mood-happy")}</div>
    <div class="card"><b>${esc(t("rt_client_conditions"))}</b>${cls.filter(c=>c.price_level==="wholesale"||c.credit_limit||c.insurer).map(c=>`<div class="ht-bk" ${mgr?`onclick="rtClientModal('${c.id}')"`:""}><span style="flex:1"><b>${esc(c.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(t(c.price_level==="wholesale"?"rt_wholesale":"rt_retail"))}${c.credit_limit?` · ${esc(t("rt_limit"))} ${zdMoney(c.credit_limit)}`:""}${c.insurer?` · ${esc(t("rt_insurer_badge"))} ${c.coverage_pct} %`:""}</div></span><span class="mono">${zdMoney(c.due)}</span></div>`).join("")||zdEmpty(t("rt_no_conditions"))}</div>`;
};
function rtPayModal(id,name,due){
  zdModal("modal-rt-pay",`<div class="modal-title"><i class="ti ti-cash"></i> ${esc(name)} · ${esc(t("rt_owes"))} ${zdMoney(due)}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("rs_amount"))} *</label><input class="inp" type="number" min="0" step="0.01" id="rt-cp-amt" value="${due}"></div><div class="fgrp"><label class="fl">${esc(t("fld_payment_method"))}</label><select class="inp" id="rt-cp-m">${zdMethodOptions("cash")}</select></div></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rt-pay')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRtCreditPay('${id}')">${esc(t("btn_save"))}</button></div>`,440);
}
async function submitRtCreditPay(id){try{const r=await api("POST",`/retail/credits/${id}/pay`,{amount:zdNum("rt-cp-amt"),method:zdVal("rt-cp-m")});zdCloseModal("modal-rt-pay");showToast(t("rt_credit_paid").replace("{v}",zdMoney(r.remaining)));navigate("retailcredits");}catch(e){showToast(e.message,"error");}}
function rtClientModal(id){
  const c=id?_rt.clients.find(x=>x.id===id):null;const ph=rtPharma();
  zdModal("modal-rt-cl",`<div class="modal-title"><i class="ti ti-user"></i> ${esc(c?c.name:t("rt_new_client"))}</div>
    ${c?"":`<div class="grid2"><div class="fgrp"><label class="fl">${esc(t("fld_name"))} *</label><input class="inp" id="rt-c-name"></div><div class="fgrp"><label class="fl">${esc(t("pb_phone"))}</label><input class="inp" id="rt-c-phone" inputmode="tel"></div></div>`}
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("rt_price_level"))}</label><select class="inp" id="rt-c-level"><option value="retail">${esc(t("rt_retail"))}</option><option value="wholesale"${c?.price_level==="wholesale"?" selected":""}>${esc(t("rt_wholesale"))}</option></select></div>
      <div class="fgrp"><label class="fl">${esc(t("rt_credit_limit"))}</label><input class="inp" type="number" min="0" id="rt-c-limit" value="${c?.credit_limit||""}" placeholder="0 = ${esc(t("rt_no_credit_allowed"))}"></div></div>
    ${ph?`<div class="grid2"><label style="font-size:13px;align-self:center"><input type="checkbox" id="rt-c-ins" ${c?.insurer?"checked":""}> ${esc(t("rt_is_insurer"))}</label><div class="fgrp"><label class="fl">${esc(t("rt_coverage"))}</label><input class="inp" type="number" min="0" max="100" id="rt-c-cov" value="${c?.coverage_pct||""}"></div></div>`:""}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rt-cl')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="submitRtClient('${c?c.id:""}')">${esc(t("btn_save"))}</button></div>`,500);
}
async function submitRtClient(id){const body={price_level:zdVal("rt-c-level"),credit_limit:zdNum("rt-c-limit")||0};
  if(document.getElementById("rt-c-ins")){body.insurer=document.getElementById("rt-c-ins").checked;body.coverage_pct=zdNum("rt-c-cov")||0;}
  if(!id){body.name=zdVal("rt-c-name");body.phone=zdVal("rt-c-phone")||null;}
  try{await api(id?"PUT":"POST",id?`/retail/clients/${id}`:"/retail/clients",body);zdCloseModal("modal-rt-cl");_rt.clients=null;navigate("retailcredits");}catch(e){showToast(e.message,"error");}}

// ── Lots et péremptions ──
SECTOR_PAGE_LOADERS.retaillots=async el=>{
  const r=await api("GET",`/retail/lots${_rt.lotFilter!=="all"?`?filter=${_rt.lotFilter}`:""}`);const mgr=rsIsManager();
  el.innerHTML=sectorPageHead(esc(t("nav_retail_lots")),esc(t("rt_lots_sub").replace("{d}",r.expiry_alert_days).replace("{v}",zdMoney(r.total_value))))+
    `<div class="rs-steps" style="margin-bottom:12px">${["all","expiring","expired"].map(f=>`<button class="toggle-btn${_rt.lotFilter===f?" active":""}" onclick="_rt.lotFilter='${f}';navigate('retaillots')">${esc(t("cd_f_"+f))}${f!=="all"?` (${r.counts[f]})`:""}</button>`).join("")}</div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>${esc(t("rt_product"))}</th><th>${esc(t("cd_lot"))}</th><th>${esc(t("cd_expiry"))}</th><th>${esc(t("zd_qty"))}</th><th>${esc(t("rs_value"))}</th><th></th></tr></thead><tbody>
    ${r.lots.map(l=>`<tr><td><b>${esc(l.product)}</b></td><td class="mono">${esc(l.lot_number)}</td><td>${l.expiry?`<span class="badge ${l.expired?"br":l.days_left<=r.expiry_alert_days?"ba":"bg"}">${esc(l.expiry)} · ${l.expired?esc(t("cd_expired")):l.days_left+" j"}</span>`:"—"}</td><td class="mono">${zdQty(l.qty)} ${esc(l.unit)}</td><td class="mono">${zdMoney(l.value)}</td>
      <td style="white-space:nowrap"><button class="btn btn-o btn-sm" onclick="rtLotHistory('${l.id}')"><i class="ti ti-history"></i></button>${mgr?` <button class="btn btn-r btn-sm" onclick="rtWithdraw('${l.id}','${escJs(l.product)}','${escJs(l.lot_number)}',${l.expired})"><i class="ti ti-trash-x"></i></button>`:""}</td></tr>`).join("")||`<tr><td colspan="6">${zdEmpty(t("cd_no_lots"),"calendar-check")}</td></tr>`}
    </tbody></table></div><div style="font-size:12px;color:var(--muted);margin-top:8px">${esc(t("rt_lots_hint"))}</div></div>`;
};
async function rtLotHistory(id){const h=await api("GET",`/retail/lots/${id}/history`);
  zdModal("modal-rt-hist",`<div class="modal-title"><i class="ti ti-history"></i> ${esc(h.lot.product)} · ${esc(h.lot.lot_number)}</div>${h.moves.map(m=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid var(--b)"><span><span class="badge ${m.kind==="in"?"bg":m.kind==="sale"?"bb":"br"}">${esc(t("rt_mv_"+m.kind))}</span> ${fmtDateTime(m.at)} · ${esc(m.by_name||"")}</span><b class="mono">${m.kind==="in"?"+":"−"}${zdQty(m.qty)}</b></div>`).join("")}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rt-hist')">${esc(t("btn_close"))}</button></div>`,500);}
async function rtWithdraw(id,prod,lot,expired){if(!confirm(t("rt_withdraw_confirm").replace("{p}",prod).replace("{l}",lot)))return;
  try{const r=await api("POST",`/retail/lots/${id}/withdraw`,{reason:expired?"expired":"damaged"});showToast(t("rt_withdrawn").replace("{v}",zdMoney(r.value)));_rt.cat=null;navigate("retaillots");}catch(e){showToast(e.message,"error");}}

// ── Ordonnancier ──
SECTOR_PAGE_LOADERS.retailrx=async el=>{
  const r=await api("GET",`/retail/prescriptions${_rt.rxQ?`?q=${encodeURIComponent(_rt.rxQ)}`:""}`);_rt.rx=r;
  el.innerHTML=sectorPageHead(esc(t("nav_pharma_rx")),esc(t("rt_rx_sub").replace("{n}",r.count)),`<button class="btn btn-o btn-sm" onclick="rtPrintRx()"><i class="ti ti-printer"></i></button>`)+
    `<div class="card" style="margin-bottom:12px"><input class="inp" placeholder="${esc(t("rt_rx_search"))}" value="${esc(_rt.rxQ)}" onchange="_rt.rxQ=this.value;navigate('retailrx')"></div>
    <div class="card">${r.prescriptions.map(x=>`<div style="padding:8px 0;border-bottom:1px solid var(--b)"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(x.patient_name)}${x.patient_age?` (${esc(x.patient_age)})`:""}</b><span class="mono" style="font-size:11px">${esc(x.number)}</span></div>
      <div style="font-size:12px;color:var(--muted)">${esc(t("rt_doctor"))} : ${esc(x.doctor)}${x.issued_on?` · ${esc(t("rt_rx_issued"))} ${esc(x.issued_on)}`:""} · ${fmtDateTime(x.created_at)} · ${esc(x.by_name||"")}</div>
      <div style="font-size:12px;margin-top:3px">${x.items.map(i=>`${zdQty(i.qty)} × ${esc(i.product)}${i.rx?" <b>Rx</b>":""}${i.lots?.length?` <span style="color:var(--muted)">(${i.lots.map(l=>esc(l.lot_number)).join(", ")})</span>`:""}`).join(" · ")}</div></div>`).join("")||zdEmpty(t("rt_no_rx"),"prescription")}</div>`;
};
function rtPrintRx(){const r=_rt.rx;if(!r)return;const co=r.company||{};
  zdShowDoc(`<div style="color:#111;font-size:11px"><b style="font-size:15px">${esc(co.name||"")}</b><div style="font-size:18px;font-weight:800;margin:6px 0">${esc(t("rt_rx_register"))}</div>
    <table class="doc-table" style="width:100%"><thead><tr><th>N°</th><th>${esc(t("fld_date"))}</th><th>${esc(t("rt_patient"))}</th><th>${esc(t("rt_doctor"))}</th><th>${esc(t("rt_product"))}</th></tr></thead><tbody>
    ${r.prescriptions.map(x=>`<tr><td>${esc(x.number)}</td><td>${fmtDate(x.created_at)}</td><td>${esc(x.patient_name)}</td><td>${esc(x.doctor)}</td><td>${x.items.map(i=>`${zdQty(i.qty)} × ${esc(i.product)}${i.lots?.length?" ("+i.lots.map(l=>esc(l.lot_number)).join(", ")+")":""}`).join("<br>")}</td></tr>`).join("")}</tbody></table></div>`,"ordonnancier");}

// ── Rapport ──
SECTOR_PAGE_LOADERS.retailreport=async el=>{
  if(!_rt.repDay)_rt.repDay=zdToday();
  const r=await api("GET",`/retail/report?day=${_rt.repDay}`);
  el.innerHTML=sectorPageHead(esc(t("nav_retail_report")),esc(t("rt_report_sub")),`<input class="inp" type="date" value="${_rt.repDay}" style="width:auto" onchange="_rt.repDay=this.value;navigate('retailreport')">`)+
    `<div class="kgrid"><div class="kpi g"><div class="kl">${esc(t("rs_revenue"))}</div><div class="kv">${zdMoney(r.revenue)}</div></div><div class="kpi b"><div class="kl">${esc(t("rt_sales"))}</div><div class="kv">${r.sales}</div></div>
      <div class="kpi c"><div class="kl">${esc(t("rt_avg_basket"))}</div><div class="kv">${zdMoney(r.avg_basket)}</div></div><div class="kpi p"><div class="kl">${esc(t("rs_margin"))}</div><div class="kv">${zdMoney(r.margin)}</div></div>
      <div class="kpi a"><div class="kl">${esc(t("rt_credit_sales"))}</div><div class="kv">${zdMoney(r.credit_sales)}</div></div><div class="kpi r"><div class="kl">${esc(t("rt_total_due"))}</div><div class="kv">${zdMoney(r.credit_outstanding)}</div></div></div>
    <div class="grid2" style="margin-top:14px"><div class="card"><b>${esc(t("rs_top_items"))}</b>${r.top_products.map(p=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b)"><span>${esc(p.name)} × ${zdQty(p.qty)}</span><b class="mono">${zdMoney(p.amount)}</b></div>`).join("")||zdEmpty(t("rs_no_sales"))}</div>
      <div class="card"><b>${esc(t("rs_by_method"))}</b>${Object.entries(r.by_method).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b)"><span>${esc(t(k==="account"?"rt_on_credit":"pay_method_"+k))}</span><b class="mono">${zdMoney(v)}</b></div>`).join("")||zdEmpty(t("rs_no_sales"))}
        <div style="font-size:12px;color:var(--muted);margin-top:8px">${esc(t("rt_report_alerts").replace("{l}",r.low_stock).replace("{e}",r.lots.expiring).replace("{x}",r.lots.expired))}</div></div></div>`;
};
