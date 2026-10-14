let _warehouses=[],_warehouseLimit=0;
async function loadWarehouses(){
  try{const r=await api("GET","/stock/warehouses");_warehouses=r.warehouses||[];_warehouseLimit=r.limit;}catch(_){_warehouses=[];}
  return _warehouses;
}
function warehouseOptions(selected){
  return _warehouses.map(w=>`<option value="${w.id}" ${w.id===selected||(!selected&&w.is_default)?"selected":""}>${esc(w.name)}</option>`).join("");
}
function fillWarehouseSelect(id,selected){
  const sel=document.getElementById(id);if(!sel)return;
  sel.innerHTML=warehouseOptions(selected);
  const grp=sel.closest(".fgrp");if(grp)grp.style.display=_warehouses.length>1?"":"none";
}
let _stockTab="products";
function showStockTab(tab){
  _stockTab=tab;
  document.querySelectorAll("[data-stocktab]").forEach(b=>b.classList.toggle("active",b.dataset.stocktab===tab));
  ["products","warehouses","inventories","deliveries","receipts"].forEach(k=>{const el=document.getElementById(`stock-panel-${k}`);if(el)el.style.display=k===tab?"block":"none";});
  if(tab==="products")loadStock();else if(tab==="warehouses")loadWarehousesPanel();else if(tab==="inventories")loadInventories();else if(tab==="deliveries")loadDeliveryNotes();else loadGoodsReceipts();
}
function stockCell(p){
  const multi=_warehouses.length>1&&(p.stocks||[]).length;
  const detail=multi?`<div style="font-size:10px;font-weight:400;color:var(--muted)">${p.stocks.filter(s=>s.qty).map(s=>`${esc(s.warehouse_name||"?")} : ${s.qty}`).join(" · ")||"—"}</div>`:"";
  return `${p.stock_qty} ${esc(p.unit)}${detail}`;
}
async function openProductModal(){
  ["prod-name","prod-sku","prod-cat","prod-price","prod-cost","prod-qty","prod-min","prod-desc","prod-barcode"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  await loadWarehouses();fillWarehouseSelect("prod-warehouse");
  document.getElementById("modal-product").style.display="flex";
}
async function submitProduct(){
  const name=document.getElementById("prod-name").value;
  if(!name){flagMissingFields([document.getElementById("prod-name")]);return;}
  try{
    const r=await api("POST","/stock/products",{name,sku:document.getElementById("prod-sku").value||null,barcode:document.getElementById("prod-barcode").value||null,
      category:document.getElementById("prod-cat").value||null,unit:document.getElementById("prod-unit").value,
      unit_price:parseFloat(document.getElementById("prod-price").value||0),cost_price:parseFloat(document.getElementById("prod-cost").value||0),
      stock_qty:parseFloat(document.getElementById("prod-qty").value||0),stock_min:parseFloat(document.getElementById("prod-min").value||0),
      description:document.getElementById("prod-desc").value||null,currency:"USD",warehouse_id:document.getElementById("prod-warehouse").value||null});
    showToast(r.queued?t("offline_queued"):t("toast_product_created"));closeProductModal();loadStock();
  }catch(e){showToast(e.message,"error");}
}
async function openStockMoveModal(productId,type){
  const sel=document.getElementById("move-product-id");if(!sel)return;
  if(!_products.length) try{_products=await api("GET","/stock/products");}catch(e){}
  sel.innerHTML=_products.map(p=>`<option value="${p.id}">${esc(p.name)} (${p.stock_qty} ${esc(p.unit)})</option>`).join("");
  if(productId) sel.value=productId;
  document.getElementById("move-type").value=type||"in";
  const prod=_products.find(p=>p.id===sel.value);
  document.getElementById("move-qty").value=productId&&prod?Math.max(1,Math.ceil((prod.stock_min*2)-prod.stock_qty)):"";
  document.getElementById("move-reason").value=productId?t("restock_reason"):"";
  document.getElementById("modal-stock-move").style.display="flex";
  await loadWarehouses();fillWarehouseSelect("move-warehouse");
}
async function submitStockMove(){
  try{
    const r=await api("POST","/stock/moves",{product_id:document.getElementById("move-product-id").value,
      type:document.getElementById("move-type").value,qty:parseFloat(document.getElementById("move-qty").value||0),
      reason:document.getElementById("move-reason").value||null,warehouse_id:document.getElementById("move-warehouse").value||null});
    showToast(r.queued?t("offline_queued"):`${t("toast_stock_updated")} : ${r.new_stock}${r.low_stock?" ⚠ "+t("st_low"):""}`);
    closeStockMoveModal();loadStock();
  }catch(e){showToast(e.message,"error");}
}
async function openTransferModal(){
  await loadWarehouses();
  if(_warehouses.length<2){showToast(t("transfer_need_two"),"error");return;}
  if(!_products.length) try{_products=await api("GET","/stock/products");}catch(_){}
  document.getElementById("tr-product").innerHTML=_products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");
  document.getElementById("tr-from").innerHTML=warehouseOptions();
  document.getElementById("tr-to").innerHTML=_warehouses.map((w,i)=>`<option value="${w.id}" ${i===1?"selected":""}>${esc(w.name)}</option>`).join("");
  document.getElementById("tr-qty").value="";
  document.getElementById("modal-transfer").style.display="flex";
}
function closeTransferModal(){document.getElementById("modal-transfer").style.display="none";}
async function submitTransfer(){
  const qty=parseFloat(document.getElementById("tr-qty").value);
  if(!(qty>0)){flagMissingFields([document.getElementById("tr-qty")]);return;}
  try{
    const r=await api("POST","/stock/transfers",{product_id:document.getElementById("tr-product").value,from_warehouse_id:document.getElementById("tr-from").value,to_warehouse_id:document.getElementById("tr-to").value,qty});
    closeTransferModal();showToast(`${t("toast_transfer_done")} ${r.from} ${r.from_qty} · ${r.to} ${r.to_qty}`);loadStock();
  }catch(e){showToast(e.message,"error");}
}
async function loadWarehousesPanel(){
  const box=document.getElementById("warehouses-tbody");if(!box)return;
  await loadWarehouses();
  document.getElementById("warehouse-limit-note").textContent=_warehouseLimit===-1?t("warehouses_unlimited"):t("warehouses_limit").replace("{n}",_warehouseLimit);
  box.innerHTML=_warehouses.map(w=>`<tr><td style="font-weight:600">${esc(w.name)} ${w.is_default?`<span class="badge bg">${t("wh_default")}</span>`:""}</td>
    <td style="color:var(--muted)">${esc(w.address||"—")}</td><td>${w.products}</td><td style="font-family:var(--mono)">${fmtUSD(w.stock_value)}</td>
    <td>${w.is_default?"":`<button class="btn btn-sm btn-r" onclick="deleteWarehouse('${w.id}')"><i class="ti ti-trash"></i></button>`}</td></tr>`).join("");
}
async function createWarehouse(){
  const name=prompt(t("prompt_warehouse_name"));if(!name)return;
  try{await api("POST","/stock/warehouses",{name});showToast(t("toast_warehouse_created"));loadWarehousesPanel();}catch(e){showToast(e.message,"error");}
}
async function deleteWarehouse(id){if(!confirm(t("confirm_delete_warehouse")))return;try{await api("DELETE",`/stock/warehouses/${id}`);loadWarehousesPanel();}catch(e){showToast(e.message,"error");}}
let _scanCallback=null,_scanStream=null,_scanTimer=null,_zxingReader=null;
async function openScanner(onCode,title){
  _scanCallback=onCode;
  document.getElementById("scan-title").textContent=title||t("scan_title");
  document.getElementById("scan-manual").value="";
  document.getElementById("scan-status").textContent=t("scan_starting");
  document.getElementById("modal-scan").style.display="flex";
  setTimeout(()=>document.getElementById("scan-manual").focus(),100);
  await startCamera();
}
async function startCamera(){
  const video=document.getElementById("scan-video");const status=document.getElementById("scan-status");
  if(!navigator.mediaDevices?.getUserMedia){status.textContent=t("scan_no_camera");video.style.display="none";return;}
  try{
    _scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
    video.srcObject=_scanStream;video.style.display="block";await video.play().catch(()=>{});
  }catch(e){status.textContent=t("scan_camera_denied");video.style.display="none";return;}
  if("BarcodeDetector" in window){
    let detector;
    try{detector=new BarcodeDetector({formats:["ean_13","ean_8","code_128","code_39","upc_a","upc_e","qr_code","itf"]});}catch(_){detector=new BarcodeDetector();}
    status.textContent=t("scan_aim");
    const loop=async()=>{
      if(!_scanStream)return;
      try{const codes=await detector.detect(video);if(codes&&codes.length&&codes[0].rawValue){handleScannedCode(codes[0].rawValue);return;}}catch(_){}
      _scanTimer=setTimeout(loop,250);
    };
    loop();return;
  }
  status.textContent=t("scan_loading_engine");
  try{
    if(!window.ZXing) await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
    _zxingReader=new ZXing.BrowserMultiFormatReader();
    status.textContent=t("scan_aim");
    _zxingReader.decodeFromVideoElementContinuously?_zxingReader.decodeFromVideoElementContinuously(video,(res)=>{if(res)handleScannedCode(res.getText());})
      :_zxingReader.decodeFromVideoDevice(undefined,video,(res)=>{if(res)handleScannedCode(res.getText());});
  }catch(_){status.textContent=t("scan_engine_failed");}
}
function stopCamera(){
  clearTimeout(_scanTimer);_scanTimer=null;
  try{_zxingReader&&_zxingReader.reset();}catch(_){}
  _zxingReader=null;
  if(_scanStream){_scanStream.getTracks().forEach(tr=>tr.stop());_scanStream=null;}
  const v=document.getElementById("scan-video");if(v)v.srcObject=null;
}
function closeScanner(){stopCamera();document.getElementById("modal-scan").style.display="none";_scanCallback=null;}
function handleScannedCode(code){
  code=String(code||"").trim();if(!code)return;
  if(navigator.vibrate)try{navigator.vibrate(60);}catch(_){}
  const cb=_scanCallback;closeScanner();
  if(cb)cb(code);
}
function submitManualCode(e){if(e)e.preventDefault();handleScannedCode(document.getElementById("scan-manual").value);}
async function scanToFindProduct(){
  openScanner(async code=>{
    try{const p=await api("GET",`/stock/products/lookup?code=${encodeURIComponent(code)}`);showToast(`${p.name} — ${t("th_stock")} ${p.stock_qty} ${p.unit}`);openStockMoveModal(p.id,"in");}
    catch(e){showToast(e.message,"error");}
  });
}
function scanIntoField(fieldId){openScanner(code=>{const el=document.getElementById(fieldId);if(el){el.value=code;el.dispatchEvent(new Event("input"));}});}
let _pos={register:null,registers:[],cart:[],method:"cash",products:[]};
async function loadPos(){
  const box=document.getElementById("pos-products");if(!box)return;
  if(!checkFeature(State.tenant?.limits||{},"stock")){document.getElementById("pos-locked").style.display="block";document.getElementById("pos-main").style.display="none";return;}
  document.getElementById("pos-locked").style.display="none";document.getElementById("pos-main").style.display="";
  try{
    const r=await api("GET","/pos/registers");_pos.registers=r.registers.filter(x=>x.active);
    if(!_pos.register||!_pos.registers.find(x=>x.id===_pos.register))_pos.register=_pos.registers[0]?.id||null;
    document.getElementById("pos-register").innerHTML=_pos.registers.map(x=>`<option value="${x.id}" ${x.id===_pos.register?"selected":""}>${esc(x.name)} — ${esc(x.warehouse_name||"")}</option>`).join("");
    _pos.products=await api("GET","/stock/products");
  }catch(e){showToast(e.message,"error");}
  renderPosProducts();renderCart();loadPosSummary();
}
function posRegister(){return _pos.registers.find(x=>x.id===_pos.register);}
function posAvailable(p){const r=posRegister();const s=(p.stocks||[]).find(s=>s.warehouse_id===r?.warehouse_id);return s?s.qty:0;}
function renderPosProducts(){
  const q=(document.getElementById("pos-search").value||"").trim().toLowerCase();
  const list=_pos.products.filter(p=>!q||p.name.toLowerCase().includes(q)||(p.sku||"").toLowerCase().includes(q)||(p.barcode||"").includes(q));
  document.getElementById("pos-products").innerHTML=list.map(p=>{const av=posAvailable(p);return `<button class="pos-prod${av<=0?" out":""}" onclick="posAdd('${p.id}')" ${av<=0?"disabled":""}>
    <span class="pn">${esc(p.name)}</span><span class="pp">${fmtUSD(p.unit_price)}</span><span class="ps">${av} ${esc(p.unit)}</span></button>`;}).join("")
    ||`<div style="color:var(--muted);font-size:13px;padding:12px">${t("no_products")}</div>`;
}
function posAdd(pid,qty){
  const p=_pos.products.find(x=>x.id===pid);if(!p)return;
  const line=_pos.cart.find(l=>l.product_id===pid);
  const inCart=line?line.qty:0;
  if(inCart+(qty||1)>posAvailable(p)+1e-9){showToast(`${t("pos_not_enough")} ${p.name} (${posAvailable(p)})`,"error");return;}
  if(line)line.qty+=qty||1;else _pos.cart.push({product_id:pid,name:p.name,unit_price:p.unit_price,qty:qty||1,tax_rate:0});
  renderCart();
}
function posQty(pid,delta){
  const l=_pos.cart.find(x=>x.product_id===pid);if(!l)return;
  if(delta>0){posAdd(pid,delta);return;}
  l.qty+=delta;if(l.qty<=0)_pos.cart=_pos.cart.filter(x=>x!==l);renderCart();
}
function posTotals(){
  const sub=Math.round(_pos.cart.reduce((s,l)=>s+l.qty*l.unit_price,0)*100)/100;
  const disc=parseFloat(document.getElementById("pos-discount").value)||0;
  return {sub,disc,total:Math.round((sub-disc)*100)/100};
}
function renderCart(){
  const box=document.getElementById("pos-cart");if(!box)return;
  box.innerHTML=_pos.cart.map(l=>`<div class="pos-line"><div style="flex:1;min-width:0"><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(l.name)}</div><div style="font-size:11px;color:var(--muted)">${fmtUSD(l.unit_price)} × ${l.qty}</div></div>
    <button class="btn btn-o btn-sm" onclick="posQty('${l.product_id}',-1)">−</button><b style="min-width:26px;text-align:center">${l.qty}</b><button class="btn btn-o btn-sm" onclick="posQty('${l.product_id}',1)">+</button>
    <b style="font-family:var(--mono);min-width:72px;text-align:right">${fmtUSD(l.qty*l.unit_price)}</b></div>`).join("")||`<div style="color:var(--muted);font-size:13px;text-align:center;padding:18px">${t("pos_cart_empty")}</div>`;
  const {sub,disc,total}=posTotals();
  document.getElementById("pos-total").textContent=fmtUSD(Math.max(0,total));
  document.getElementById("pos-subtotal").textContent=disc?`${t("inv_preview_subtotal")} ${fmtUSD(sub)} · ${t("fld_discount")} −${fmtUSD(disc)}`:"";
  document.querySelectorAll("[data-posmethod]").forEach(b=>b.classList.toggle("active",b.dataset.posmethod===_pos.method));
  document.getElementById("pos-cash-box").style.display=_pos.method==="cash"?"":"none";
  const tendered=parseFloat(document.getElementById("pos-tendered").value);
  document.getElementById("pos-change").textContent=_pos.method==="cash"&&tendered>=total&&total>0?`${t("pos_change")} ${fmtUSD(tendered-total)}`:"";
  document.getElementById("pos-pay-btn").disabled=!_pos.cart.length||total<=0;
}
function setPosMethod(m){_pos.method=m;renderCart();}
function posSearchKey(e){
  if(e.key!=="Enter")return;
  const code=e.target.value.trim();if(!code)return;
  const p=_pos.products.find(x=>x.barcode===code||(x.sku||"").toLowerCase()===code.toLowerCase());
  if(p){posAdd(p.id);e.target.value="";renderPosProducts();}
  else{const list=_pos.products.filter(x=>x.name.toLowerCase().includes(code.toLowerCase()));if(list.length===1){posAdd(list[0].id);e.target.value="";renderPosProducts();}else showToast(`${t("scan_unknown")} ${code}`,"error");}
}
function posScan(){
  openScanner(code=>{
    const p=_pos.products.find(x=>x.barcode===code||(x.sku||"").toLowerCase()===code.toLowerCase());
    if(p)posAdd(p.id);else showToast(`${t("scan_unknown")} ${code}`,"error");
  },t("pos_scan_title"));
}
function posClear(){_pos.cart=[];document.getElementById("pos-discount").value="";document.getElementById("pos-tendered").value="";renderCart();}
async function submitPosSale(){
  const {disc,total}=posTotals();
  if(!_pos.cart.length||total<=0)return;
  const tendered=parseFloat(document.getElementById("pos-tendered").value);
  if(_pos.method==="cash"&&!isNaN(tendered)&&tendered<total){flagMissingFields([document.getElementById("pos-tendered")]);showToast(t("pos_tendered_short"),"error");return;}
  try{
    const r=await api("POST","/pos/sales",{register_id:_pos.register,items:_pos.cart.map(l=>({product_id:l.product_id,qty:l.qty,unit_price:l.unit_price,tax_rate:l.tax_rate})),
      discount_amount:disc,payment_method:_pos.method,amount_tendered:_pos.method==="cash"&&!isNaN(tendered)?tendered:null});
    if(r.queued){showToast(t("offline_queued"));posClear();return;}
    showToast(`${t("pos_sale_done")} ${r.number}${r.change!=null?` — ${t("pos_change")} ${fmtUSD(r.change)}`:""}`);
    posClear();
    _pos.products=await api("GET","/stock/products");renderPosProducts();loadPosSummary();
    openPosReceipt(r.id);
  }catch(e){showToast(e.message,"error");}
}
async function openPosReceipt(id){try{renderDocument(await api("GET",`/pos/sales/${id}/receipt`));}catch(e){showToast(e.message,"error");}}
async function loadPosSummary(){
  const box=document.getElementById("pos-summary");if(!box)return;
  try{
    const s=await api("GET",`/pos/summary${_pos.register?`?register_id=${_pos.register}`:""}`);
    box.innerHTML=`<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px;margin-bottom:8px"><span>${t("pos_today_sales")} <b>${s.count}</b></span><span>${t("inv_preview_total")} <b style="color:var(--green)">${fmtUSD(s.total)}</b></span>
      ${Object.entries(s.by_method).map(([m,v])=>`<span>${t("pay_method_"+m)} <b>${fmtUSD(v)}</b></span>`).join("")}</div>
      ${s.sales.slice(0,8).map(x=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b);font-size:12px;cursor:pointer" onclick="openPosReceipt('${x.id}')"><span style="font-family:var(--mono);color:var(--blue)">${x.number}</span><span>${new Date(parseServerDate(x.created_at)).toLocaleTimeString(State.lang==="ar"?"ar":State.lang,{hour:"2-digit",minute:"2-digit"})}</span><b style="font-family:var(--mono)">${fmtUSD(x.total)}</b></div>`).join("")}`;
  }catch(_){}
}
async function loadInventories(){
  const box=document.getElementById("inventories-tbody");if(!box)return;
  try{
    const list=await api("GET","/stock/inventories");
    box.innerHTML=list.map(c=>`<tr><td style="font-family:var(--mono);color:var(--blue);cursor:pointer" onclick="openInventory('${c.id}')">${c.number}</td><td>${fmtDate(c.created_at)}</td><td>${esc(c.warehouse_name||"")}</td>
      <td>${c.lines_counted}/${c.lines_total}</td><td>${c.status==="open"?`<span class="badge ba">${t("inv_status_open")}</span>`:c.status==="validated"?`<span class="badge bg">${t("inv_status_validated")}</span>`:`<span class="badge badge-gray">${t("st_cancelled")}</span>`}</td>
      <td style="font-family:var(--mono);color:${c.gap_value<0?"var(--red)":"var(--text)"}">${c.status==="validated"?fmtUSD(c.gap_value):"—"}</td></tr>`).join("")||`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("no_inventories")}</td></tr>`;
  }catch(e){box.innerHTML=`<tr><td colspan="6" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
}
async function startInventory(){
  await loadWarehouses();
  let wid=_warehouses.find(w=>w.is_default)?.id;
  if(_warehouses.length>1){
    const names=_warehouses.map((w,i)=>`${i+1}. ${w.name}`).join("\n");
    const pick=prompt(`${t("prompt_pick_warehouse")}\n${names}`,"1");if(!pick)return;
    wid=_warehouses[parseInt(pick)-1]?.id;if(!wid)return;
  }
  try{const c=await api("POST","/stock/inventories",{warehouse_id:wid});showToast(`${t("toast_inventory_started")} ${c.number}`);loadInventories();openInventory(c.id);}
  catch(e){showToast(e.message,"error");}
}
let _inv=null;
async function openInventory(id){
  try{_inv=await api("GET",`/stock/inventories/${id}`);renderInventory();document.getElementById("modal-inventory").style.display="flex";}
  catch(e){showToast(e.message,"error");}
}
function renderInventory(){
  const c=_inv;const open=c.status==="open";
  document.getElementById("inventory-title").textContent=`${c.number} — ${c.warehouse_name||""}`;
  const gap=c.lines.reduce((s,l)=>s+(l.counted_qty!=null?(l.counted_qty-l.expected_qty)*(l.cost_price||0):0),0);
  document.getElementById("inventory-progress").innerHTML=`${t("inv_counted")} <b>${c.lines.filter(l=>l.counted_qty!=null).length}/${c.lines.length}</b> · ${t("inv_gap_value")} <b style="color:${gap<0?"var(--red)":"var(--green)"}">${fmtUSD(gap)}</b>`;
  document.getElementById("inventory-lines").innerHTML=c.lines.map(l=>`<tr>
    <td>${esc(l.name)}<div style="font-size:10px;color:var(--muted);font-family:var(--mono)">${esc(l.barcode||l.sku||"")}</div></td>
    <td style="font-family:var(--mono)">${l.expected_qty}</td>
    <td>${open?`<input class="inp" type="number" min="0" step="1" style="width:90px;padding:6px 8px" value="${l.counted_qty??""}" onchange="setInventoryCount('${l.product_id}',this.value)">`:(l.counted_qty??"—")}</td>
    <td style="font-family:var(--mono);font-weight:700;color:${l.difference==null?"var(--muted)":l.difference<0?"var(--red)":l.difference>0?"var(--amber)":"var(--green)"}">${l.difference==null?"—":(l.difference>0?"+":"")+l.difference}</td></tr>`).join("");
  document.getElementById("inventory-actions").style.display=open?"flex":"none";
}
async function setInventoryCount(pid,val){
  try{const r=await api("PATCH",`/stock/inventories/${_inv.id}/lines`,{product_id:pid,counted_qty:val===""?null:parseFloat(val)});
    const l=_inv.lines.find(x=>x.product_id===pid);Object.assign(l,{counted_qty:r.counted_qty,difference:r.difference});renderInventory();}
  catch(e){showToast(e.message,"error");}
}
function inventoryScan(){
  openScanner(async code=>{
    const l=_inv.lines.find(x=>x.barcode===code||(x.sku||"").toLowerCase()===code.toLowerCase());
    if(!l){showToast(`${t("scan_unknown")} ${code}`,"error");return;}
    try{const r=await api("PATCH",`/stock/inventories/${_inv.id}/lines`,{product_id:l.product_id,increment:1});Object.assign(l,{counted_qty:r.counted_qty,difference:r.difference});renderInventory();showToast(`${l.name} : ${r.counted_qty}`);}
    catch(e){showToast(e.message,"error");}
  },t("inventory_scan_title"));
}
async function validateInventory(){
  const missing=_inv.lines.filter(l=>l.counted_qty==null).length;
  if(!confirm(missing?t("confirm_validate_inventory_missing").replace("{n}",missing):t("confirm_validate_inventory")))return;
  try{const r=await api("POST",`/stock/inventories/${_inv.id}/validate`);closeInventory();showToast(`${t("toast_inventory_validated")} — ${r.adjusted} ${t("inv_adjustments")} · ${t("inv_gap_value")} ${fmtUSD(r.gap_value)}`);loadInventories();}
  catch(e){showToast(e.message,"error");}
}
async function cancelInventory(){if(!confirm(t("confirm_cancel_inventory")))return;try{await api("POST",`/stock/inventories/${_inv.id}/cancel`);closeInventory();loadInventories();}catch(e){showToast(e.message,"error");}}
function closeInventory(){document.getElementById("modal-inventory").style.display="none";}
async function loadDeliveryNotes(){
  const box=document.getElementById("deliveries-tbody");if(!box)return;
  try{
    const list=await api("GET","/delivery-notes");
    box.innerHTML=list.map(d=>`<tr><td style="font-family:var(--mono);color:var(--blue)">${d.number}</td><td>${fmtDate(d.created_at)}</td><td>${esc(d.client_name||"—")}</td>
      <td style="font-family:var(--mono)">${esc(d.invoice_number||"—")}</td><td>${d.items.length}</td>
      <td>${d.status==="delivered"?`<span class="badge bg">${t("dn_delivered")}</span>`:`<span class="badge ba">${t("dn_to_deliver")}</span>`}</td>
      <td style="display:flex;gap:5px"><button class="btn btn-sm btn-o" onclick="openDeliveryDoc('${d.id}')" title="PDF"><i class="ti ti-file-type-pdf"></i></button>
      ${d.status!=="delivered"?`<button class="btn btn-sm btn-g" onclick="deliverNote('${d.id}')"><i class="ti ti-truck-delivery"></i> ${t("btn_deliver")}</button><button class="btn btn-sm btn-r" onclick="deleteDeliveryNote('${d.id}')"><i class="ti ti-trash"></i></button>`:""}</td></tr>`).join("")
      ||`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">${t("no_delivery_notes")}</td></tr>`;
  }catch(e){box.innerHTML=`<tr><td colspan="7" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
}
async function openDeliveryModal(invoiceId){
  await loadWarehouses();fillWarehouseSelect("dn-warehouse");
  try{
    const invs=(await api("GET","/invoices/")).filter(i=>i.source!=="pos");
    document.getElementById("dn-invoice").innerHTML=`<option value="">${t("dn_no_invoice")}</option>`+invs.map(i=>`<option value="${i.id}" ${i.id===invoiceId?"selected":""}>${i.number} — ${fmtMoney(i.total,i.currency)}</option>`).join("");
  }catch(_){}
  populateClientSelect("dn-client");
  if(!_products.length) try{_products=await api("GET","/stock/products");}catch(_){}
  document.getElementById("dn-lines").innerHTML="";document.getElementById("dn-notes").value="";
  onDeliveryInvoiceChange();
  document.getElementById("modal-delivery").style.display="flex";
}
function onDeliveryInvoiceChange(){
  const fromInv=!!document.getElementById("dn-invoice").value;
  document.getElementById("dn-manual").style.display=fromInv?"none":"block";
  if(!fromInv&&!document.querySelector("#dn-lines .dn-row"))addDeliveryLine();
}
function addDeliveryLine(){
  document.getElementById("dn-lines").insertAdjacentHTML("beforeend",`<div class="dn-row" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,.8fr) auto;gap:6px;margin-bottom:6px">
    <select class="inp dn-prod"><option value="">${t("dn_free_line")}</option>${_products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>
    <input class="inp dn-qty" type="number" min="0.01" step="0.01" placeholder="${t("th_qty_short")}">
    <button type="button" class="btn btn-o btn-sm" onclick="this.closest('.dn-row').remove()"><i class="ti ti-x"></i></button></div>`);
}
function closeDeliveryModal(){document.getElementById("modal-delivery").style.display="none";}
async function submitDeliveryNote(){
  const invoice_id=document.getElementById("dn-invoice").value||null;
  const body={invoice_id,client_id:document.getElementById("dn-client").value||null,warehouse_id:document.getElementById("dn-warehouse").value||null,notes:document.getElementById("dn-notes").value||null};
  if(!invoice_id){
    const bad=[];body.items=[...document.querySelectorAll("#dn-lines .dn-row")].map(r=>{const sel=r.querySelector(".dn-prod"),q=r.querySelector(".dn-qty");const qty=parseFloat(q.value);if(!(qty>0))bad.push(q);
      const p=_products.find(x=>x.id===sel.value);return {product_id:sel.value||null,description:p?p.name:t("dn_free_line"),qty:qty||0};});
    if(bad.length){flagMissingFields(bad);return;}
  }
  try{const d=await api("POST","/delivery-notes",body);closeDeliveryModal();showToast(`${t("toast_dn_created")} ${d.number}`);if(_stockTab==="deliveries")loadDeliveryNotes();else{navigate("stock");setTimeout(()=>showStockTab("deliveries"),300);}}
  catch(e){showToast(e.message,"error");}
}
async function deliverNote(id){if(!confirm(t("confirm_deliver")))return;try{const d=await api("POST",`/delivery-notes/${id}/deliver`);showToast(`${d.number} — ${t("dn_delivered")}`);loadDeliveryNotes();}catch(e){showToast(e.message,"error");}}
async function deleteDeliveryNote(id){if(!confirm(t("confirm_delete_dn")))return;try{await api("DELETE",`/delivery-notes/${id}`);loadDeliveryNotes();}catch(e){showToast(e.message,"error");}}
async function openDeliveryDoc(id){try{renderDocument(await api("GET",`/delivery-notes/${id}/document`));}catch(e){showToast(e.message,"error");}}
async function loadGoodsReceipts(){
  const box=document.getElementById("receipts-tbody");if(!box)return;
  try{
    const list=await api("GET","/goods-receipts");
    box.innerHTML=list.map(g=>`<tr><td style="font-family:var(--mono);color:var(--blue)">${g.number}</td><td>${fmtDate(g.created_at)}</td><td>${esc(g.supplier_name||"—")}</td><td style="font-family:var(--mono)">${esc(g.order_number||"—")}</td><td>${esc(g.warehouse_name||"")}</td>
      <td><button class="btn btn-sm btn-o" onclick="openReceiptDoc('${g.id}')" title="PDF"><i class="ti ti-file-type-pdf"></i></button></td></tr>`).join("")||`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("no_goods_receipts")}</td></tr>`;
  }catch(e){box.innerHTML=`<tr><td colspan="6" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
}
async function openReceiptDoc(id){try{renderDocument(await api("GET",`/goods-receipts/${id}/document`));}catch(e){showToast(e.message,"error");}}
let _receiveOrderId=null;
async function updateSupplyStatus(id,status){
  if(status==="received"){
    await loadWarehouses();
    if(_warehouses.length>1){_receiveOrderId=id;document.getElementById("receive-warehouse").innerHTML=warehouseOptions();document.getElementById("modal-receive").style.display="flex";return;}
  }
  const msg=status==="received"?t("confirm_receive"):t("confirm_order");
  if(!confirm(msg))return;
  await doSupplyStatus(id,status,null);
}
async function doSupplyStatus(id,status,warehouseId){
  try{const r=await api("PATCH",`/supply-orders/${id}/status?status=${status}${warehouseId?`&warehouse_id=${warehouseId}`:""}`);showToast(r.receipt_number?`${t("toast_updated")} — ${t("goods_receipt")} ${r.receipt_number}`:t("toast_updated"));loadSupplyOrders();loadStock();}
  catch(e){showToast(e.message,"error");}
}
function closeReceiveModal(){document.getElementById("modal-receive").style.display="none";}
async function confirmReceive(){const w=document.getElementById("receive-warehouse").value;closeReceiveModal();await doSupplyStatus(_receiveOrderId,"received",w);}
function renderSimpleDoc(doc){
  const co=doc.company||{},party=doc.client||{};
  const color=/^#[0-9a-fA-F]{6}$/.test(co.brand_color||"")?co.brand_color:"#00b36b";
  if(doc.doc_type==="ticket"){
    const pays=doc.payments||[];
    document.getElementById("doc-page").innerHTML=`<div class="ticket">
      ${co.logo_url?`<img src="${docEsc(co.logo_url)}" alt="" style="max-height:48px;max-width:140px;display:block;margin:0 auto 6px">`:""}
      <div style="text-align:center;font-weight:800;font-size:15px">${docEsc(co.name)}</div>
      <div style="text-align:center;font-size:10px">${[co.address,co.phone].filter(Boolean).map(docEsc).join(" · ")}</div>
      <div class="tk-sep"></div>
      <div style="display:flex;justify-content:space-between;font-size:11px"><span>${docEsc(doc.number)}</span><span>${new Date(parseServerDate(doc.created_at)).toLocaleString(State.lang==="ar"?"ar":State.lang)}</span></div>
      <div style="font-size:11px">${docEsc(doc.register||"")}</div><div class="tk-sep"></div>
      ${(doc.items||[]).map(it=>`<div style="font-size:12px">${docEsc(it.description)}</div><div style="display:flex;justify-content:space-between;font-size:12px"><span>${it.qty} × ${fmtUSD(it.unit_price)}</span><span>${fmtUSD(it.qty*it.unit_price)}</span></div>`).join("")}
      <div class="tk-sep"></div>
      ${doc.discount_amount?`<div style="display:flex;justify-content:space-between;font-size:12px"><span>${t("fld_discount")}</span><span>−${fmtUSD(doc.discount_amount)}</span></div>`:""}
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800"><span>${t("inv_preview_total")}</span><span>${fmtUSD(doc.total)}</span></div>
      ${pays.map(p=>`<div style="display:flex;justify-content:space-between;font-size:12px"><span>${t("pay_method_"+p.method)}</span><span>${fmtUSD(p.amount)}</span></div>${p.note?`<div style="font-size:11px;text-align:right">${docEsc(p.note)}</div>`:""}`).join("")}
      <div class="tk-sep"></div><div style="text-align:center;font-size:11px">${docEsc(co.footer||t("tk_thanks"))}</div></div>`;
    document.getElementById("doc-wa-btn").style.display="none";
    return;
  }
  const isDel=doc.doc_type==="delivery";
  document.getElementById("doc-page").innerHTML=`
    <div style="border-bottom:4px solid ${color};padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;gap:16px">
      <div style="display:flex;gap:12px;align-items:center">${co.logo_url?`<img src="${docEsc(co.logo_url)}" alt="" style="max-height:60px;max-width:140px;object-fit:contain">`:""}
        <div><div style="font-size:19px;font-weight:800">${docEsc(co.name)}</div><div style="font-size:11px;color:#555">${[co.address,co.phone,co.email].filter(Boolean).map(docEsc).join("<br>")}</div></div></div>
      <div style="text-align:right"><div style="font-size:21px;font-weight:800;color:${color}">${isDel?t("doc_delivery_title"):t("doc_receipt_title")}</div>
        <div style="font-family:monospace">${docEsc(doc.number)}</div><div style="font-size:11px">${t("doc_date")} ${fmtDate(doc.created_at)}${doc.invoice_number?`<br>${t("th_invoice")} ${docEsc(doc.invoice_number)}`:""}${doc.order_number?`<br>${t("doc_order")} ${docEsc(doc.order_number)}`:""}${doc.warehouse_name?`<br>${t("wh_label")} ${docEsc(doc.warehouse_name)}`:""}</div></div>
    </div>
    <div style="font-size:12px;margin-bottom:16px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#666">${isDel?t("doc_deliver_to"):t("doc_supplier")}</div>${party.name?`<b style="font-size:14px">${docEsc(party.name)}</b><br>${[party.company,party.address,party.phone].filter(Boolean).map(docEsc).join("<br>")}`:"—"}</div>
    <table class="doc-table"><thead><tr style="background:${color}18"><th>${t("fld_description").replace(" *","")}</th><th class="r">${t("th_qty_short")}</th><th class="r">${t("doc_received_qty")}</th></tr></thead>
      <tbody>${(doc.items||[]).map(it=>`<tr><td>${docEsc(it.description)}</td><td class="r">${it.qty}</td><td class="r" style="color:#999">______</td></tr>`).join("")}</tbody></table>
    ${doc.notes?`<div style="margin-top:12px;font-size:11px"><b>${t("fld_notes")}</b><br>${docEsc(doc.notes)}</div>`:""}
    <div style="display:flex;gap:24px;margin-top:36px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px;border-top:1px solid #999;padding-top:6px;font-size:11px;color:#555">${t("doc_signature_company")}</div>
      <div style="flex:1;min-width:200px;border-top:1px solid #999;padding-top:6px;font-size:11px;color:#555">${isDel?t("doc_signature_client"):t("doc_signature_supplier")}</div></div>`;
  document.getElementById("doc-wa-btn").style.display="none";
}
