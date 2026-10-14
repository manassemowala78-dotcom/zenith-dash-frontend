let _shopSettings=null;
async function loadShopPage(){
  const box=document.getElementById("shop-settings-box");if(!box)return;
  try{_shopSettings=await api("GET","/shop/settings");}catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;return;}
  const s=_shopSettings;
  if(!s.allowed){document.getElementById("shop-main").style.display="none";document.getElementById("shop-locked").style.display="block";return;}
  document.getElementById("shop-main").style.display="";document.getElementById("shop-locked").style.display="none";
  box.innerHTML=`<label style="display:flex;align-items:center;gap:10px;font-weight:700;cursor:pointer;margin-bottom:10px"><input type="checkbox" id="shop-enabled" ${s.enabled?"checked":""} style="width:20px;height:20px"> ${t("shop_enable")}</label>
    <div class="grid2"><div class="fgrp"><label class="fl">${t("shop_address")}</label><div style="display:flex;align-items:center;gap:4px"><span style="font-size:12px;color:var(--muted);white-space:nowrap">?shop=</span><input class="inp" id="shop-slug" value="${esc(s.slug||"")}" maxlength="40"></div></div>
      <div class="fgrp"><label class="fl">${t("shop_whatsapp")} *</label><input class="inp" id="shop-wa" value="${esc(s.whatsapp||"")}" placeholder="+243 81 234 5678"></div></div>
    <div class="fgrp"><label class="fl">${t("shop_welcome")}</label><input class="inp" id="shop-welcome" value="${esc(s.welcome||"")}" maxlength="500" placeholder="${t("shop_welcome_ph")}"></div>
    <div class="fgrp"><label class="fl">${t("shop_delivery")}</label><input class="inp" id="shop-delivery" value="${esc(s.delivery_info||"")}" maxlength="300" placeholder="${t("shop_delivery_ph")}"></div>
    <label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:10px;cursor:pointer"><input type="checkbox" id="shop-show-stock" ${s.show_stock?"checked":""}> ${t("shop_show_stock")}</label>
    <div class="fgrp"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><label class="fl" style="margin:0">${t("shop_terms_label")}</label><button type="button" class="btn btn-o btn-sm" onclick="insertShopTermsTemplate()"><i class="ti ti-file-plus"></i> ${t("shop_terms_template_btn")}</button></div>
      <div style="font-size:11px;color:var(--muted);margin:4px 0 6px">${t("shop_terms_hint")}</div>
      <textarea class="inp" id="shop-terms" rows="8" maxlength="6000" style="resize:vertical;font-size:13px;line-height:1.5">${esc(s.terms||"")}</textarea></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-g btn-sm" onclick="saveShopSettings()"><i class="ti ti-check"></i> ${t("btn_save")}</button>
      ${s.enabled?`<button class="btn btn-o btn-sm" onclick="copyText('${esc(s.public_url)}')"><i class="ti ti-link"></i> ${t("shop_copy_link")}</button><a class="btn btn-o btn-sm" href="${esc(s.public_url)}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i> ${t("shop_open")}</a>
      <a class="btn btn-o btn-sm" href="https://wa.me/?text=${encodeURIComponent(t("shop_share_msg")+" "+s.public_url)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> ${t("shop_share")}</a>`:""}</div>
    ${s.enabled?`<div style="font-size:12px;color:var(--muted);margin-top:8px;word-break:break-all">${esc(s.public_url)} · ${t("shop_products_count").replace("{n}",s.products_in_shop)}</div>`:""}`;
  loadShopProducts();loadShopOrders();
}
async function saveShopSettings(){
  try{
    await api("PUT","/shop/settings",{enabled:document.getElementById("shop-enabled").checked,slug:document.getElementById("shop-slug").value,whatsapp:document.getElementById("shop-wa").value||null,
      welcome:document.getElementById("shop-welcome").value,delivery_info:document.getElementById("shop-delivery").value,show_stock:document.getElementById("shop-show-stock").checked,
      terms:document.getElementById("shop-terms")?.value||""});
    showToast(t("shop_saved"));loadShopPage();
  }catch(e){showToast(e.message,"error");}
}
function insertShopTermsTemplate(){
  const box=document.getElementById("shop-terms");if(!box)return;
  if(box.value.trim()&&!confirm(t("shop_terms_replace")))return;
  const co=State.tenant?.company_name||State.tenant?.name||"";
  box.value=t("shop_terms_template").replaceAll("{company}",co).replaceAll("{whatsapp}",document.getElementById("shop-wa")?.value||"");
  box.focus();
}
async function loadShopProducts(){
  const box=document.getElementById("shop-products");if(!box)return;
  try{
    const list=await api("GET","/stock/products");
    box.innerHTML=list.map(p=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b)">
      <div class="shop-thumb">${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:`<i class="ti ti-photo"></i>`}</div>
      <div style="flex:1;min-width:0"><div style="font-weight:600">${esc(p.name)}</div><div style="font-size:11px;color:var(--muted)">${fmtUSD(p.unit_price)} · ${t("th_stock")} ${p.stock_qty} ${esc(p.unit)}</div></div>
      <label class="btn btn-o btn-sm" style="cursor:pointer" title="${t("shop_photo")}"><i class="ti ti-camera"></i><input type="file" accept="image/*" style="display:none" onchange="uploadProductImage('${p.id}',this.files[0])"></label>
      <label style="display:flex;gap:6px;align-items:center;font-size:13px;cursor:pointer"><input type="checkbox" ${p.in_shop?"checked":""} onchange="toggleProductShop('${p.id}',this.checked)"> ${t("shop_visible")}</label></div>`).join("")||`<div style="color:var(--muted);font-size:13px">${t("no_products")}</div>`;
  }catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;}
}
async function toggleProductShop(id,on){try{await api("PATCH",`/stock/products/${id}/shop`,{in_shop:on});showToast(on?t("shop_product_on"):t("shop_product_off"));}catch(e){showToast(e.message,"error");}}
async function uploadProductImage(id,file){
  if(!file)return;
  try{const c=await compressImageFile(file,1200,0.85);const fd=new FormData();fd.append("file",c);await apiUpload(`/stock/products/${id}/image`,fd);showToast(t("shop_photo_saved"));_products=[];loadShopProducts();}
  catch(e){showToast(e.message,"error");}
}
const SHOP_STATUS_BADGE={new:"ba",confirmed:"bb",delivered:"bg",cancelled:"badge-gray"};
async function loadShopOrders(){
  const box=document.getElementById("shop-orders");if(!box)return;
  try{
    const list=await api("GET","/shop/orders");
    box.innerHTML=list.map(o=>`<div class="card" style="margin-bottom:8px;padding:12px">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b style="font-family:var(--mono);color:var(--blue)">${esc(o.number)}</b> · ${fmtDateTime(o.created_at)} <span class="badge ${SHOP_STATUS_BADGE[o.status]}">${t("shop_st_"+o.status)}</span></div><b style="font-family:var(--mono)">${fmtMoney(o.total,o.currency)}</b></div>
      <div style="font-size:13px;margin:6px 0"><b>${esc(o.customer_name)}</b> · ${esc(o.customer_phone)}${o.customer_address?` · ${esc(o.customer_address)}`:""}</div>
      <div style="font-size:12px;color:var(--muted)">${o.items.map(i=>`${i.qty} × ${esc(i.name)}`).join(" · ")}${o.note?` — ${esc(o.note)}`:""}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        <a class="btn btn-o btn-sm" href="https://wa.me/${(o.customer_phone||"").replace(/[^0-9]/g,"")}?text=${encodeURIComponent(t("shop_wa_customer").replace("{name}",o.customer_name).replace("{number}",o.number))}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> ${t("shop_contact_customer")}</a>
        ${o.status==="new"?`<button class="btn btn-o btn-sm" onclick="setShopOrderStatus('${o.id}','confirmed')">${t("shop_confirm")}</button>`:""}
        ${["new","confirmed"].includes(o.status)?`<button class="btn btn-g btn-sm" onclick="setShopOrderStatus('${o.id}','delivered')"><i class="ti ti-truck-delivery"></i> ${t("shop_deliver")}</button>`:""}
        ${!o.invoice_id&&o.status!=="cancelled"?`<button class="btn btn-o btn-sm" onclick="shopOrderInvoice('${o.id}')"><i class="ti ti-file-invoice"></i> ${t("shop_invoice")}</button>`:""}
        ${["new","confirmed"].includes(o.status)?`<button class="btn btn-r btn-sm" onclick="setShopOrderStatus('${o.id}','cancelled')">${t("btn_cancel")}</button>`:""}
      </div></div>`).join("")||`<div style="color:var(--muted);font-size:13px">${t("shop_no_orders")}</div>`;
  }catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;}
}
async function setShopOrderStatus(id,status){
  if(status==="cancelled"&&!confirm(t("shop_confirm_cancel")))return;
  try{await api("PATCH",`/shop/orders/${id}`,{status});showToast(t("toast_updated"));loadShopOrders();}catch(e){showToast(e.message,"error");}
}
async function shopOrderInvoice(id){try{const r=await api("POST",`/shop/orders/${id}/invoice`);showToast(`${t("toast_invoice_created_num")} ${r.invoice_number} — ${r.client_name}`);loadShopOrders();}catch(e){showToast(e.message,"error");}}
let _shop={slug:null,data:null,cart:{},cat:""};
async function checkShopView(){
  const slug=new URLSearchParams(window.location.search).get("shop");
  if(!slug)return false;
  _shop.slug=slug;
  document.getElementById("auth-screen").style.display="none";
  try{document.getElementById("landing").style.display="none";}catch(_){}
  const v=document.getElementById("shop-view");v.style.display="block";
  try{const r=await fetch(`${API_BASE}/shop/public/${encodeURIComponent(slug)}`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"Erreur");_shop.data=d;renderShopView();}
  catch(e){v.innerHTML=`<div class="card" style="text-align:center;margin-top:40px;color:var(--muted)"><div style="font-size:40px">🛒</div>${esc(e.message)}</div>`;}
  return true;
}
function shopCartCount(){return Object.values(_shop.cart).reduce((a,b)=>a+b,0);}
function shopCartTotal(){return _shop.data.products.reduce((s,p)=>s+(_shop.cart[p.id]||0)*p.price,0);}
function renderShopView(){
  const d=_shop.data;const v=document.getElementById("shop-view");
  const color=/^#[0-9a-fA-F]{6}$/.test(d.brand_color||"")?d.brand_color:"#00b36b";
  const cats=[...new Set(d.products.map(p=>p.category).filter(Boolean))];
  const list=d.products.filter(p=>!_shop.cat||p.category===_shop.cat);
  v.innerHTML=`<div class="shop-head" style="border-bottom:3px solid ${color}">${d.logo_url?`<img src="${esc(d.logo_url)}" alt="" style="max-height:52px;max-width:120px;object-fit:contain;background:#fff;border-radius:8px;padding:3px">`:`<div class="ld-logo" style="background:${color}">🛒</div>`}
      <div style="flex:1;min-width:0"><div style="font-weight:800;font-size:18px">${esc(d.name)}</div>${d.welcome?`<div style="font-size:13px;color:var(--muted)">${esc(d.welcome)}</div>`:""}</div></div>
    ${d.delivery_info?`<div style="font-size:12px;color:var(--muted);margin:10px 0"><i class="ti ti-truck"></i> ${esc(d.delivery_info)}</div>`:""}
    ${cats.length>1?`<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin:10px 0"><button class="toggle-btn ${!_shop.cat?"active":""}" onclick="_shop.cat='';renderShopView()">${t("shop_all")}</button>${cats.map(c=>`<button class="toggle-btn ${_shop.cat===c?"active":""}" onclick="_shop.cat='${esc(c)}';renderShopView()">${esc(c)}</button>`).join("")}</div>`:""}
    <div class="shop-grid">${list.map(p=>`<div class="shop-card">
      <div class="shop-img">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">`:`<i class="ti ti-package"></i>`}</div>
      <div style="padding:10px;display:flex;flex-direction:column;gap:4px;flex:1"><div style="font-weight:700;font-size:14px">${esc(p.name)}</div>
        ${p.description?`<div style="font-size:12px;color:var(--muted)">${esc(p.description)}</div>`:""}
        <div style="font-family:var(--mono);font-weight:800;color:${color}">${fmtMoney(p.price,p.currency)}${p.unit?` <span style="font-size:11px;color:var(--muted);font-weight:400">/ ${esc(p.unit)}</span>`:""}</div>
        ${!p.available?`<div style="font-size:12px;color:var(--red)">${t("shop_out_of_stock")}</div>`:p.stock!=null?`<div style="font-size:11px;color:var(--muted)">${t("shop_in_stock").replace("{n}",p.stock)}</div>`:""}
        <div style="margin-top:auto;display:flex;align-items:center;gap:6px">${_shop.cart[p.id]?`<button class="btn btn-o btn-sm" onclick="shopQty('${p.id}',-1)">−</button><b>${_shop.cart[p.id]}</b><button class="btn btn-o btn-sm" onclick="shopQty('${p.id}',1)">+</button>`
          :`<button class="btn btn-g btn-sm" style="width:100%;background:${color};border-color:${color}" ${p.available?"":"disabled"} onclick="shopQty('${p.id}',1)">${t("shop_add")}</button>`}</div></div></div>`).join("")||`<div style="color:var(--muted)">${t("shop_empty")}</div>`}</div>
    ${shopLegalFooterHtml(d)}
    <div style="height:90px"></div>
    ${shopCartCount()?`<div class="shop-cartbar" style="background:${color}" onclick="openShopCheckout()"><span><i class="ti ti-shopping-cart"></i> ${t("shop_cart").replace("{n}",shopCartCount())}</span><b>${fmtMoney(shopCartTotal(),d.products[0]?.currency||"USD")} →</b></div>`:""}`;
}
function shopQty(id,delta){
  const p=_shop.data.products.find(x=>x.id===id);const n=(_shop.cart[id]||0)+delta;
  if(p.stock!=null&&n>p.stock){showToast(t("shop_max_stock").replace("{n}",p.stock),"error");return;}
  if(n<=0)delete _shop.cart[id];else _shop.cart[id]=n;renderShopView();
}
function openShopCheckout(){
  const d=_shop.data;const cur=d.products[0]?.currency||"USD";
  const lines=d.products.filter(p=>_shop.cart[p.id]);
  document.getElementById("shop-checkout-lines").innerHTML=lines.map(p=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0"><span>${_shop.cart[p.id]} × ${esc(p.name)}</span><b>${fmtMoney(_shop.cart[p.id]*p.price,cur)}</b></div>`).join("")
    +`<div style="display:flex;justify-content:space-between;font-weight:800;border-top:1px solid var(--b);margin-top:6px;padding-top:6px"><span>${t("inv_preview_total")}</span><span>${fmtMoney(shopCartTotal(),cur)}</span></div>`;
  document.getElementById("shop-checkout-result").innerHTML="";document.getElementById("shop-checkout-form").style.display="block";
  const tr=document.getElementById("sc-terms-row"),tc=document.getElementById("sc-terms");if(tr)tr.style.display=d.terms?"flex":"none";if(tc)tc.checked=false;
  document.getElementById("modal-shop-checkout").style.display="flex";
}
function closeShopCheckout(){document.getElementById("modal-shop-checkout").style.display="none";}
async function submitShopOrder(){
  const name=document.getElementById("sc-name"),phone=document.getElementById("sc-phone");
  const miss=[name,phone].filter(e=>!e.value.trim());if(miss.length){flagMissingFields(miss);return;}
  const needTerms=!!_shop.data.terms,termsBox=document.getElementById("sc-terms");
  if(needTerms&&!termsBox.checked){showToast(t("shop_terms_required"),"error");document.getElementById("sc-terms-row").classList.add("terms-missing");return;}
  const btn=document.getElementById("sc-submit");btn.disabled=true;
  try{
    const r=await fetch(`${API_BASE}/shop/public/${encodeURIComponent(_shop.slug)}/orders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer_name:name.value.trim(),customer_phone:phone.value.trim(),
      customer_address:document.getElementById("sc-address").value||null,note:document.getElementById("sc-note").value||null,accept_terms:needTerms?termsBox.checked:false,items:Object.entries(_shop.cart).map(([product_id,qty])=>({product_id,qty}))})});
    const d=await r.json();if(!r.ok)throw new Error(typeof d.detail==="string"?d.detail:"Erreur");
    _shop.cart={};renderShopView();
    document.getElementById("shop-checkout-form").style.display="none";
    document.getElementById("shop-checkout-result").innerHTML=`<div style="text-align:center;padding:10px"><div style="font-size:44px">✅</div><div style="font-weight:800;font-size:18px">${t("shop_order_sent")}</div>
      <div style="font-family:var(--mono);margin:6px 0">${esc(d.number)} · ${fmtMoney(d.total,d.currency)}</div><div style="font-size:13px;color:var(--muted);margin-bottom:12px">${t("shop_order_next")}</div>
      ${d.whatsapp_url?`<a class="btn btn-g" href="${esc(d.whatsapp_url)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> ${t("shop_send_wa")}</a>`:""}</div>`;
  }catch(e){showToast(e.message,"error");}
  finally{btn.disabled=false;}
}
async function openPortalQuoteDoc(qid){
  try{const r=await fetch(`${API_BASE}/portal/${_portalToken}/quotes/${qid}/document`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"Erreur");renderDocument(d);}
  catch(e){showToast(e.message,"error");}
}
async function sendQuoteForSignature(qid){
  try{
    const q=(await api("GET","/crm/quotes")).find(x=>x.id===qid);
    if(!q||!q.client_id){showToast(t("quote_need_client"),"error");return;}
    const r=await api("POST",`/clients/${q.client_id}/portal-link`);const tok=r.token||r.portal_token;
    const cl=(_clients||[]).find(c=>c.id===q.client_id)||(await api("GET","/clients/")).find(c=>c.id===q.client_id)||{};
    const link=`${window.location.origin}${window.location.pathname}?portal=${tok}`;
    const msg=t("quote_wa_sign").replace("{name}",cl.name||"").replace("{number}",q.number).replace("{link}",link).replace("{company}",State.tenant?.company_name||State.tenant?.name||"");
    window.open(`https://wa.me/${(cl.phone||"").replace(/[^0-9]/g,"")}?text=${encodeURIComponent(msg)}`,"_blank","noopener");
  }catch(e){showToast(e.message,"error");}
}
