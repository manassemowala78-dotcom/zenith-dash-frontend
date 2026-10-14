const CURRENCIES=["USD","CDF","MAD","EUR"];
let _rates={USD:1};let _ratesEnabled=false;
function fmtMoney(amount,cur){
  cur=cur||"USD";
  if((amount||0)<0)return "−"+fmtMoney(-amount,cur);
  const n=new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(amount||0);
  if(cur==="USD")return `$${n}`;if(cur==="EUR")return `${n} €`;return `${n} ${cur}`;
}
async function loadRates(){
  try{const r=await api("GET","/profile/exchange-rates");_rates=r.rates||{USD:1};_ratesEnabled=!!r.enabled;}catch(_){_ratesEnabled=false;}
}
function fillCurrencySelect(id,selected){
  const sel=document.getElementById(id);if(!sel)return;
  sel.innerHTML=CURRENCIES.map(c=>{
    const locked=c!=="USD"&&(!_ratesEnabled||!_rates[c]);
    return `<option value="${c}" ${c===selected?"selected":""} ${locked?"disabled":""}>${c}${locked&&c!=="USD"?(_ratesEnabled?` — ${t("rate_missing")}`:" 🔒"):""}</option>`;
  }).join("");
}
function lineRowHtml(prefix){
  return `<div class="line-row" style="display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,.8fr) minmax(0,1fr) minmax(0,.7fr) auto;gap:6px;margin-bottom:6px;align-items:center">
    <input class="inp xl-desc" placeholder="${t("fld_description").replace(" *","")}">
    <input class="inp xl-qty" type="number" min="0.01" step="0.01" placeholder="${t("th_qty_short")}">
    <input class="inp xl-price" type="number" min="0" step="0.01" placeholder="${t("th_price_short")}">
    <input class="inp xl-tax" type="number" min="0" max="100" step="0.01" placeholder="${t("th_tax_short")}">
    <button type="button" class="btn btn-o btn-sm" onclick="this.closest('.line-row').remove();linePreviewFor('${prefix}')()" aria-label="×"><i class="ti ti-x"></i></button>
  </div>`;
}
function linePreviewFor(prefix){
  if(prefix==="inv")return computeInvoicePreview;
  if(prefix==="quote")return computeQuotePreview;
  if(prefix==="pur")return computePurchasePreview;
  return ()=>{};
}
function addInvoiceLine(containerId,prefix){
  const box=document.getElementById(containerId);if(!box)return;
  box.insertAdjacentHTML("beforeend",lineRowHtml(prefix));
  const row=box.lastElementChild;
  row.querySelectorAll("input").forEach(i=>i.addEventListener("input",linePreviewFor(prefix)));
  row.querySelector(".xl-desc").focus();
}
function collectLines(prefix,containerId){
  const lines=[];const errors=[];
  const main={desc:document.getElementById(`${prefix}-desc`),qty:document.getElementById(`${prefix}-qty`),price:document.getElementById(`${prefix}-price`),tax:document.getElementById(`${prefix}-tax`)};
  const rows=[main,...[...document.querySelectorAll(`#${containerId} .line-row`)].map(r=>({desc:r.querySelector(".xl-desc"),qty:r.querySelector(".xl-qty"),price:r.querySelector(".xl-price"),tax:r.querySelector(".xl-tax")}))];
  rows.forEach((r,i)=>{
    const d=(r.desc.value||"").trim(),q=parseFloat(r.qty.value),p=parseFloat(r.price.value),tx=parseFloat(r.tax.value||0)||0;
    const empty=!d&&!r.qty.value&&!r.price.value;
    if(i>0&&empty)return;
    if(!d)errors.push(r.desc);if(!(q>0))errors.push(r.qty);if(!(p>=0)||isNaN(p))errors.push(r.price);
    lines.push({description:d,qty:q||0,unit_price:isNaN(p)?0:p,tax_rate:tx});
  });
  return {lines,errors};
}
function linesTotals(lines,discount){
  const sub=Math.round(lines.reduce((s,l)=>s+l.qty*l.unit_price,0)*100)/100;
  const tax=Math.round(lines.reduce((s,l)=>s+l.qty*l.unit_price*l.tax_rate/100,0)*100)/100;
  const total=Math.round((sub+tax-(discount||0))*100)/100;
  return {sub,tax,total};
}
function currencyHint(id,total,cur){
  const box=document.getElementById(id);if(!box)return;
  box.textContent=cur!=="USD"&&_rates[cur]&&total?`≈ ${fmtMoney(total/_rates[cur],"USD")} (1 USD = ${new Intl.NumberFormat("fr-FR").format(_rates[cur])} ${cur})`:"";
}
function computeInvoicePreview(){
  const {lines}=collectLines("inv","inv-extra-lines");
  const disc=parseFloat(document.getElementById("inv-disc").value)||0;
  const cur=document.getElementById("inv-currency")?.value||"USD";
  const {sub,tax,total}=linesTotals(lines,disc);
  const box=document.getElementById("inv-total-preview");
  if(box) box.innerHTML=sub?`${lines.length>1?`${lines.length} ${t("lines_label")} · `:""}${t("inv_preview_subtotal")} ${fmtMoney(sub,cur)} · ${t("fld_tax")} ${fmtMoney(tax,cur)} · ${t("fld_discount")} −${fmtMoney(disc,cur)} → <b style="color:${total<0?"var(--red)":"var(--green)"}">${t("inv_preview_total")} ${fmtMoney(total,cur)}</b>`:"";
  currencyHint("inv-currency-hint",total,cur);
  return total;
}
function computeQuotePreview(){
  const {lines}=collectLines("quote","quote-extra-lines");
  const cur=document.getElementById("quote-currency")?.value||"USD";
  const {sub,tax,total}=linesTotals(lines,0);
  const box=document.getElementById("quote-total-preview");
  if(box) box.innerHTML=sub?`${lines.length>1?`${lines.length} ${t("lines_label")} · `:""}${t("inv_preview_subtotal")} ${fmtMoney(sub,cur)} · ${t("fld_tax")} ${fmtMoney(tax,cur)} → <b style="color:var(--green)">${t("inv_preview_total")} ${fmtMoney(total,cur)}</b>`:"";
  currencyHint("quote-currency-hint",total,cur);
  return total;
}
async function openInvModal(){
  populateClientSelect("inv-client");
  ["inv-desc","inv-qty","inv-price","inv-tax","inv-disc","inv-notes"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  document.getElementById("inv-extra-lines").innerHTML="";
  document.getElementById("inv-due").value=localDateInput(30);
  document.getElementById("modal-inv").style.display="flex";
  fillCurrencySelect("inv-currency","USD");
  computeInvoicePreview();
  await loadRates();fillCurrencySelect("inv-currency","USD");
}
async function submitInvoice(){
  const {lines,errors}=collectLines("inv","inv-extra-lines");
  if(errors.length){flagMissingFields(errors);return;}
  if(computeInvoicePreview()<0){showToast(t("inv_discount_too_high"),"error");return;}
  try{
    const r=await api("POST","/invoices/",{
      client_id:document.getElementById("inv-client").value||null,
      items:lines,
      discount_amount:parseFloat(document.getElementById("inv-disc").value||0),
      due_date:dateInputToIso(document.getElementById("inv-due").value),
      notes:document.getElementById("inv-notes").value||null,
      currency:document.getElementById("inv-currency").value||"USD"});
    showToast(r.queued?t("offline_queued"):`${t("toast_invoice_created_num")} ${r.number} ✓`);closeInvModal();loadInvoices();
  }catch(e){showToast(e.message,"error");}
}
async function submitQuote(){
  const {lines,errors}=collectLines("quote","quote-extra-lines");
  if(errors.length){flagMissingFields(errors);return;}
  try{
    const d=document.getElementById("quote-valid").value;
    await api("POST","/crm/quotes",{client_id:document.getElementById("quote-client").value||null,items:lines,
      valid_until:d?dateInputToIso(d):null,notes:document.getElementById("quote-notes").value||null,
      currency:document.getElementById("quote-currency").value||"USD"});
    showToast(t("toast_quote_created"));closeQuoteModal();loadQuotes();
  }catch(e){showToast(e.message,"error");}
}
let _invoiceTab="list";
function showInvoicesTab(tab){
  _invoiceTab=tab;
  document.querySelectorAll("[data-invtab]").forEach(b=>b.classList.toggle("active",b.dataset.invtab===tab));
  ["list","recurring","credits"].forEach(k=>{const el=document.getElementById(`inv-panel-${k}`);if(el)el.style.display=k===tab?"block":"none";});
  const newBtn=document.getElementById("inv-new-btn"),recBtn=document.getElementById("rec-new-btn");
  if(newBtn)newBtn.style.display=tab==="list"?"":"none";
  if(recBtn)recBtn.style.display=tab==="recurring"?"":"none";
  if(tab==="list"){loadInvoices();loadPaymentNotices();}else if(tab==="recurring")loadRecurring();else loadCreditNotes();
}
function advancedBilling(){return !!(State.tenant?.limits?.invoice_templates||State.tenant?.is_creator);}
async function loadInvoices(append=false){
  const tbody=document.getElementById("inv-tbody");if(!tbody)return;
  if(!append)tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">${t("loading")}</td></tr>`;
  try{
    const st=await fetchListPage("invoices","/invoices/",append);
    const invs=st.items;
    if(!invs.length){tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">${st.q?t("list_no_result"):`${t("no_invoices")} <a href="#" onclick="openInvModal()">${t("create_arrow")}</a>`}</td></tr>`;renderListFooter("invoices","inv-more","loadInvoices");return;}
    tbody.innerHTML=invoiceRowsHtml(invs);
    renderListFooter("invoices","inv-more","loadInvoices");
  }catch(e){tbody.innerHTML=`<tr><td colspan="7" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
}
function invoiceRowsHtml(invs){
  const wa=!!State.tenant?.limits?.invoice_templates||State.tenant?.is_creator;
  return invs.map(i=>`<tr>
      <td style="font-family:var(--mono);color:var(--blue);cursor:pointer" onclick="openInvoiceDetail('${i.id}')">${i.number}</td>
      <td>${fmtDate(i.created_at)}</td><td>${statusBadge(i.status)}</td>
      <td style="font-family:var(--mono);font-weight:700">${fmtMoney(i.total,i.currency)}${i.status==="partial"||(i.credited>0&&i.status!=="cancelled")?`<div style="font-size:10px;font-weight:400;color:var(--amber)">${t("balance_label")} ${fmtMoney(i.balance_due,i.currency)}</div>`:""}${i.currency!=="USD"?`<div style="font-size:10px;font-weight:400;color:var(--muted)">≈ ${fmtMoney(i.total_usd,"USD")}</div>`:""}</td>
      <td style="font-family:var(--mono);font-size:12px;${i.status==="overdue"?"color:var(--red);font-weight:700":""}">${i.due_date?fmtDate(i.due_date):"—"}</td>
      <td>${i.blockchain_hash?`<span class="badge bp">🔗</span>`:"—"}</td>
      <td style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="btn btn-sm btn-o" onclick="openInvoiceDoc('${i.id}')" title="${t("btn_pdf")}"><i class="ti ti-file-type-pdf"></i></button>
        ${i.status==="draft"?`<button class="btn btn-sm btn-o" onclick="handleSend('${i.id}')">${t("btn_send")}</button>`:""}
        ${["draft","sent","overdue","partial"].includes(i.status)?`<button class="btn btn-sm btn-o" onclick="openPaymentModal('${i.id}')"><i class="ti ti-cash"></i> ${t("btn_collect")}</button><button class="btn btn-sm btn-g" onclick="handlePaid('${i.id}')">${t("btn_mark_paid")}</button>`:""}
        <button class="btn btn-sm btn-r" onclick="handleDelInv('${i.id}')"><i class="ti ti-trash"></i></button>
      </td></tr>`).join("");
}
let _payInvoice=null;
async function openPaymentModal(id){
  try{
    const inv=await api("GET",`/invoices/${id}`);_payInvoice=inv;
    document.getElementById("pay-title-num").textContent=inv.number;
    document.getElementById("pay-summary").innerHTML=`${t("inv_preview_total")} ${fmtMoney(inv.net_total,inv.currency)} · ${t("paid_label")} ${fmtMoney(inv.amount_paid,inv.currency)} · <b style="color:var(--amber)">${t("balance_label")} ${fmtMoney(inv.balance_due,inv.currency)}</b>`;
    document.getElementById("pay-amount").value=inv.balance_due;
    document.getElementById("pay-currency-label").textContent=inv.currency;
    document.getElementById("pay-date").value=localDateInput(0);
    document.getElementById("pay-method").value="cash";
    const kind=document.getElementById("pay-kind");kind.value="payment";
    kind.querySelector('option[value="deposit"]').disabled=!inv.advanced_billing;
    document.getElementById("pay-reference").value="";document.getElementById("pay-note").value="";
    document.getElementById("modal-payment").style.display="flex";
  }catch(e){showToast(e.message,"error");}
}
function closePaymentModal(){document.getElementById("modal-payment").style.display="none";}
async function submitPayment(){
  const amount=parseFloat(document.getElementById("pay-amount").value);
  if(!(amount>0)){flagMissingFields([document.getElementById("pay-amount")]);return;}
  const d=document.getElementById("pay-date").value;
  try{
    const r=await api("POST",`/invoices/${_payInvoice.id}/payments`,{amount,kind:document.getElementById("pay-kind").value,method:document.getElementById("pay-method").value,
      paid_at:paymentDateIso(d),reference:document.getElementById("pay-reference").value||null,note:document.getElementById("pay-note").value||null});
    closePaymentModal();
    showToast(r.queued?t("offline_queued"):(r.invoice.status==="paid"?t("toast_invoice_fully_paid"):`${t("toast_payment_saved")} — ${t("balance_label")} ${fmtMoney(r.invoice.balance_due,r.currency)}`));
    loadInvoices();if(document.getElementById("modal-inv-detail").style.display==="flex")openInvoiceDetail(_payInvoice.id);
  }catch(e){showToast(e.message,"error");}
}
function paymentDateIso(d){
  if(!d||d===localDateInput(0))return new Date().toISOString();
  const noon=new Date(`${d}T12:00:00`);
  return (noon>new Date()?new Date():noon).toISOString();
}
const PAYMENT_METHOD_KEYS=["cash","bank","mobile_money","card","cheque","other"];
async function openInvoiceDetail(id){
  try{
    const inv=await api("GET",`/invoices/${id}`);
    const body=document.getElementById("inv-detail-body");
    const open=["draft","sent","overdue","partial"].includes(inv.status);
    body.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <div><div style="font-family:var(--mono);font-size:18px;font-weight:700;color:var(--blue)">${esc(inv.number)}</div>
          <div style="font-size:12px;color:var(--muted)">${inv.client?esc(inv.client.name):t("no_client_option")} · ${fmtDate(inv.created_at)}${inv.due_date?` · ${t("th_due_date")} ${fmtDate(inv.due_date)}`:""}</div></div>
        <div>${statusBadge(inv.status)}</div>
      </div>
      <div class="kgrid" style="margin-bottom:12px">
        <div class="kpi"><div class="kl">${t("inv_preview_total")}</div><div class="kv" style="font-size:18px">${fmtMoney(inv.total,inv.currency)}</div>${inv.credited>0?`<div style="font-size:11px;color:var(--muted)">− ${t("credit_notes_label")} ${fmtMoney(inv.credited,inv.currency)}</div>`:""}</div>
        <div class="kpi"><div class="kl">${t("paid_label")}</div><div class="kv" style="font-size:18px;color:var(--green)">${fmtMoney(inv.amount_paid,inv.currency)}</div></div>
        <div class="kpi"><div class="kl">${t("balance_label")}</div><div class="kv" style="font-size:18px;color:${inv.balance_due>0?"var(--amber)":"var(--green)"}">${fmtMoney(inv.balance_due,inv.currency)}</div></div>
      </div>
      <div style="font-weight:700;font-size:13px;margin:6px 0">${t("payments_title")}</div>
      ${inv.payments.length?inv.payments.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--b);font-size:13px">
        <span style="flex:1">${fmtDate(p.paid_at)} · ${t("pay_kind_"+p.kind)} · ${t("pay_method_"+p.method)}${p.reference?` · ${esc(p.reference)}`:""}</span>
        <b style="font-family:var(--mono);color:${p.amount<0?"var(--red)":"var(--green)"}">${fmtMoney(p.amount,inv.currency)}</b>
        ${p.kind!=="refund"?`<button class="btn btn-o btn-sm" style="padding:2px 8px" onclick="deletePayment('${inv.id}','${p.id}')"><i class="ti ti-trash"></i></button>`:""}
      </div>`).join(""):`<div style="font-size:12px;color:var(--muted)">${t("no_payments_yet")}</div>`}
      ${inv.credit_notes.length?`<div style="font-weight:700;font-size:13px;margin:12px 0 6px">${t("credit_notes_label")}</div>`+inv.credit_notes.map(n=>`<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--b);font-size:13px"><span style="flex:1;font-family:var(--mono)">${esc(n.number)} · ${fmtDate(n.created_at)}${n.reason?` · ${esc(n.reason)}`:""}${n.refunded>0?` · ${t("refunded_label")} ${fmtMoney(n.refunded,inv.currency)}`:""}</span><b style="font-family:var(--mono);color:var(--red)">−${fmtMoney(n.amount,inv.currency)}</b></div>`).join(""):""}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:14px">
        ${open?`<button class="btn btn-g btn-sm" onclick="closeInvoiceDetail();openPaymentModal('${inv.id}')"><i class="ti ti-cash"></i> ${t("btn_collect")}</button>`:""}
        ${inv.advanced_billing&&inv.net_total>0?`<button class="btn btn-o btn-sm" onclick="openCreditModal('${inv.id}')"><i class="ti ti-receipt-refund"></i> ${t("btn_credit_note")}</button>`:""}
        ${open&&loyaltyAllowed()&&inv.client?`<button class="btn btn-o btn-sm" onclick="closeInvoiceDetail();applyVoucher('${inv.id}')"><i class="ti ti-gift"></i> ${t("btn_apply_voucher")}</button>`:""}
        <button class="btn btn-o btn-sm" onclick="openInvoiceDoc('${inv.id}')"><i class="ti ti-file-type-pdf"></i> ${t("btn_pdf")}</button>
        ${checkFeature(State.tenant?.limits||{},"stock")&&inv.source!=="pos"?`<button class="btn btn-o btn-sm" onclick="closeInvoiceDetail();openDeliveryModal('${inv.id}')"><i class="ti ti-truck-delivery"></i> ${t("btn_delivery_note")}</button>`:""}
      </div>`;
    document.getElementById("modal-inv-detail").style.display="flex";
  }catch(e){showToast(e.message,"error");}
}
function closeInvoiceDetail(){document.getElementById("modal-inv-detail").style.display="none";}
async function deletePayment(invId,payId){
  if(!confirm(t("confirm_delete_payment")))return;
  try{await api("DELETE",`/invoices/${invId}/payments/${payId}`);showToast(t("toast_deleted"));openInvoiceDetail(invId);loadInvoices();}
  catch(e){showToast(e.message,"error");}
}
let _creditInvoice=null;
async function openCreditModal(id){
  closeInvoiceDetail();
  try{
    const inv=await api("GET",`/invoices/${id}`);_creditInvoice=inv;
    document.getElementById("credit-title-num").textContent=inv.number;
    document.getElementById("credit-amount").value="";document.getElementById("credit-reason").value="";
    document.getElementById("credit-refund").checked=true;
    document.getElementById("credit-max").textContent=`${t("credit_max_label")} ${fmtMoney(inv.net_total,inv.currency)} · ${t("balance_label")} ${fmtMoney(inv.balance_due,inv.currency)}`;
    updateCreditHint();
    document.getElementById("modal-credit").style.display="flex";
  }catch(e){showToast(e.message,"error");}
}
function updateCreditHint(){
  const inv=_creditInvoice;if(!inv)return;
  const a=parseFloat(document.getElementById("credit-amount").value)||0;
  const excess=Math.round((a-Math.max(0,inv.balance_due))*100)/100;
  document.getElementById("credit-refund-box").style.display=excess>0.005?"block":"none";
  document.getElementById("credit-refund-text").textContent=t("credit_refund_text").replace("{amount}",fmtMoney(excess,inv.currency));
}
function closeCreditModal(){document.getElementById("modal-credit").style.display="none";if(_creditInvoice)openInvoiceDetail(_creditInvoice.id);}
async function submitCreditNote(){
  const amount=parseFloat(document.getElementById("credit-amount").value);
  if(!(amount>0)){flagMissingFields([document.getElementById("credit-amount")]);return;}
  try{
    const r=await api("POST",`/invoices/${_creditInvoice.id}/credit-notes`,{amount,reason:document.getElementById("credit-reason").value||null,refund:document.getElementById("credit-refund").checked});
    document.getElementById("modal-credit").style.display="none";
    showToast(`${t("toast_credit_created")} ${r.number}${r.refunded>0?` — ${t("refunded_label")} ${fmtMoney(r.refunded,_creditInvoice.currency)}`:""}`);
    openInvoiceDetail(_creditInvoice.id);loadInvoices();
  }catch(e){showToast(e.message,"error");}
}
async function loadCreditNotes(){
  const box=document.getElementById("credits-tbody");if(!box)return;
  if(!advancedBilling()){box.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--amber);padding:24px"><i class="ti ti-lock"></i> ${t("credits_locked")}</td></tr>`;return;}
  try{
    const list=await api("GET","/credit-notes");
    box.innerHTML=list.map(n=>`<tr><td style="font-family:var(--mono);color:var(--red)">${esc(n.number)}</td><td>${fmtDate(n.created_at)}</td>
      <td style="font-family:var(--mono);cursor:pointer;color:var(--blue)" onclick="openInvoiceDetail('${n.invoice_id}')">${esc(n.invoice_number)}</td>
      <td style="font-family:var(--mono);font-weight:700">−${fmtMoney(n.amount,n.currency)}</td><td>${n.refunded>0?fmtMoney(n.refunded,n.currency):"—"}</td><td>${esc(n.reason||"")}</td></tr>`).join("")
      ||`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("no_credit_notes")}</td></tr>`;
  }catch(e){box.innerHTML=`<tr><td colspan="6" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
}
async function loadRecurring(){
  const box=document.getElementById("rec-tbody");if(!box)return;
  if(!advancedBilling()){box.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--amber);padding:24px"><i class="ti ti-lock"></i> ${t("recurring_locked")}</td></tr>`;return;}
  try{
    const list=await api("GET","/recurring-invoices");
    box.innerHTML=list.map(r=>`<tr>
      <td style="font-weight:600">${esc(r.name||"—")}<div style="font-size:11px;color:var(--muted)">${esc(r.client_name||t("no_client_option"))}</div></td>
      <td>${t("freq_"+r.frequency)}</td>
      <td style="font-family:var(--mono);font-weight:700">${fmtMoney(r.total,r.currency)}</td>
      <td style="font-family:var(--mono);font-size:12px">${r.active?fmtDate(r.next_run_at):"—"}</td>
      <td>${r.generated_count}</td>
      <td>${r.active?`<span class="badge bg">${t("rec_active")}</span>`:`<span class="badge badge-gray">${t("rec_paused")}</span>`}${r.auto_send?` <span class="badge bb">${t("rec_auto_send")}</span>`:""}</td>
      <td style="display:flex;gap:5px;flex-wrap:wrap">
        ${r.active?`<button class="btn btn-sm btn-o" onclick="runRecurringNow('${r.id}')"><i class="ti ti-player-play"></i> ${t("btn_generate_now")}</button>`:""}
        <button class="btn btn-sm btn-o" onclick="toggleRecurring('${r.id}',${!r.active})">${r.active?t("btn_pause"):t("btn_resume")}</button>
        <button class="btn btn-sm btn-r" onclick="deleteRecurring('${r.id}')"><i class="ti ti-trash"></i></button>
      </td></tr>`).join("")||`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">${t("no_recurring")}</td></tr>`;
  }catch(e){box.innerHTML=`<tr><td colspan="7" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
}
async function openRecurringModal(){
  if(!advancedBilling()){showToast(t("recurring_locked"),"error");return;}
  populateClientSelect("rec-client");
  ["rec-name","rec-desc","rec-qty","rec-price","rec-tax","rec-disc"].forEach(id=>{document.getElementById(id).value="";});
  document.getElementById("rec-extra-lines").innerHTML="";
  document.getElementById("rec-frequency").value="monthly";
  document.getElementById("rec-start").value=localDateInput(0);
  document.getElementById("rec-end").value="";document.getElementById("rec-due").value=30;
  document.getElementById("rec-autosend").checked=false;
  await loadRates();fillCurrencySelect("rec-currency","USD");
  document.getElementById("modal-recurring").style.display="flex";
}
function closeRecurringModal(){document.getElementById("modal-recurring").style.display="none";}
async function submitRecurring(){
  const {lines,errors}=collectLines("rec","rec-extra-lines");
  if(errors.length){flagMissingFields(errors);return;}
  const s=document.getElementById("rec-start").value,e=document.getElementById("rec-end").value;
  try{
    const r=await api("POST","/recurring-invoices",{client_id:document.getElementById("rec-client").value||null,name:document.getElementById("rec-name").value||null,
      items:lines,currency:document.getElementById("rec-currency").value,discount_amount:parseFloat(document.getElementById("rec-disc").value||0),
      frequency:document.getElementById("rec-frequency").value,start_date:s?new Date(`${s}T00:00:00`).toISOString():null,end_date:e?dateInputToIso(e):null,
      due_days:parseInt(document.getElementById("rec-due").value||30),auto_send:document.getElementById("rec-autosend").checked});
    closeRecurringModal();
    showToast(r.created_invoices?.length?`${t("toast_recurring_created")} — ${r.created_invoices.join(", ")}`:t("toast_recurring_created"));
    loadRecurring();
  }catch(err){showToast(err.message,"error");}
}
async function runRecurringNow(id){try{const r=await api("POST",`/recurring-invoices/${id}/run`);showToast(`${t("toast_invoice_created_num")} ${r.invoice_number} ✓`);loadRecurring();}catch(e){showToast(e.message,"error");}}
async function toggleRecurring(id,active){try{await api("PATCH",`/recurring-invoices/${id}`,{active});loadRecurring();}catch(e){showToast(e.message,"error");}}
async function deleteRecurring(id){if(!confirm(t("confirm_delete_recurring")))return;try{await api("DELETE",`/recurring-invoices/${id}`);loadRecurring();}catch(e){showToast(e.message,"error");}}
let _currentDoc=null;
async function openInvoiceDoc(id){try{renderDocument(await api("GET",`/invoices/${id}/document`));}catch(e){showToast(e.message,"error");}}
async function openQuoteDoc(id){try{renderDocument(await api("GET",`/crm/quotes/${id}/document`));}catch(e){showToast(e.message,"error");}}
function portalLinkFor(token){return token?`${window.location.origin}${window.location.pathname}?portal=${token}`:null;}
function docEsc(v){return esc(v==null?"":String(v));}
function renderDocument(doc){
  _currentDoc=doc;
  if(doc.doc_type==="payslip"){
    renderPayslipDoc(doc);document.getElementById("doc-page").classList.remove("doc-ticket");
    document.getElementById("doc-view").style.display="block";document.body.classList.add("doc-open");
    return;
  }
  if(["delivery","receipt","ticket"].includes(doc.doc_type)){
    renderSimpleDoc(doc);
    document.getElementById("doc-page").classList.toggle("doc-ticket",doc.doc_type==="ticket");
    document.getElementById("doc-view").style.display="block";document.body.classList.add("doc-open");
    return;
  }
  document.getElementById("doc-page").classList.remove("doc-ticket");
  const co=doc.company||{},cl=doc.client||{},cur=doc.currency||"USD",isInv=doc.doc_type==="invoice";
  const color=/^#[0-9a-fA-F]{6}$/.test(co.brand_color||"")?co.brand_color:"#00b36b";
  const tpl=co.template||"classic";
  const lines=(doc.items||[]).map(it=>{const ht=it.qty*it.unit_price;return `<tr><td>${docEsc(it.description)}</td><td class="r">${new Intl.NumberFormat("fr-FR").format(it.qty)}</td><td class="r">${fmtMoney(it.unit_price,cur)}</td><td class="r">${it.tax_rate||0} %</td><td class="r">${fmtMoney(ht,cur)}</td></tr>`;}).join("");
  const pays=isInv?(doc.payments||[]):[];
  const notes=isInv?(doc.credit_notes||[]):[];
  const link=portalLinkFor(doc.portal_token);
  const headerStyle=tpl==="modern"?`background:${color};color:#fff;padding:22px 26px;border-radius:10px 10px 0 0;margin:-26px -26px 22px`:tpl==="minimal"?`border-bottom:1px solid #111;padding-bottom:14px;margin-bottom:22px`:`border-bottom:4px solid ${color};padding-bottom:14px;margin-bottom:22px`;
  const accent=tpl==="minimal"?"#111":color;
  const stamp=isInv&&doc.status==="paid"?`<div class="stamp" style="border-color:${accent};color:${accent}">${t("doc_paid_stamp")}</div>`:isInv&&doc.status==="cancelled"?`<div class="stamp" style="border-color:#c62828;color:#c62828">${t("st_cancelled")}</div>`:"";
  document.getElementById("doc-page").innerHTML=`
    <div style="${headerStyle};display:flex;justify-content:space-between;gap:16px;align-items:flex-start">
      <div style="display:flex;gap:14px;align-items:center">
        ${co.logo_url?`<img src="${docEsc(co.logo_url)}" alt="" style="max-height:64px;max-width:150px;object-fit:contain;${tpl==="modern"?"background:#fff;border-radius:6px;padding:4px":""}">`:""}
        <div><div style="font-size:20px;font-weight:800">${docEsc(co.name)}</div>
        <div style="font-size:11px;line-height:1.5;opacity:.85">${[co.address,co.country,co.phone,co.email,co.tax_number?`${t("doc_tax_number")} ${co.tax_number}`:""].filter(Boolean).map(docEsc).join("<br>")}</div></div>
      </div>
      <div style="text-align:right"><div style="font-size:24px;font-weight:800;letter-spacing:.04em;${tpl==="modern"?"":`color:${accent}`}">${isInv?t("doc_invoice_title"):t("doc_quote_title")}</div>
        <div style="font-family:monospace;font-size:13px">${docEsc(doc.number)}</div>
        <div style="font-size:11px;margin-top:4px">${t("doc_date")} ${fmtDate(doc.created_at)}${isInv&&doc.due_date?`<br>${t("th_due_date")} ${fmtDate(doc.due_date)}`:""}${!isInv&&doc.valid_until?`<br>${t("doc_valid_until")} ${fmtDate(doc.valid_until)}`:""}</div></div>
    </div>
    ${stamp}
    <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:18px;flex-wrap:wrap">
      <div style="font-size:12px"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#666;margin-bottom:4px">${t("doc_billed_to")}</div>
        ${cl.name?`<b style="font-size:14px">${docEsc(cl.name)}</b><br>${[cl.company,cl.address,cl.country,cl.phone,cl.email,cl.ice?`${t("doc_tax_number")} ${cl.ice}`:""].filter(Boolean).map(docEsc).join("<br>")}`:"—"}</div>
      ${cur!=="USD"&&isInv?`<div style="font-size:11px;color:#666;text-align:right">${t("doc_currency")} ${cur}<br>1 USD = ${new Intl.NumberFormat("fr-FR").format(Math.round(1/(doc.exchange_rate||1)*10000)/10000)} ${cur}</div>`:""}
    </div>
    <table class="doc-table"><thead><tr style="background:${tpl==="minimal"?"#fff":accent+"18"}"><th>${t("fld_description").replace(" *","")}</th><th class="r">${t("th_qty_short")}</th><th class="r">${t("th_price_short")}</th><th class="r">${t("th_tax_short")}</th><th class="r">${t("doc_total_ht")}</th></tr></thead><tbody>${lines}</tbody></table>
    <div style="display:flex;justify-content:space-between;gap:16px;margin-top:16px;flex-wrap:wrap">
      <div style="font-size:11px;color:#444;max-width:320px">
        ${doc.notes?`<div style="margin-bottom:8px"><b>${t("fld_notes")}</b><br>${docEsc(doc.notes)}</div>`:""}
        ${isInv&&co.bank_account?`<div><b>${t("doc_bank_details")}</b><br>${[co.bank_name,co.bank_account?`${t("doc_account")} ${co.bank_account}`:"",co.bank_iban?`IBAN ${co.bank_iban}`:"",co.bank_swift?`SWIFT ${co.bank_swift}`:""].filter(Boolean).map(docEsc).join("<br>")}</div>`:""}
      </div>
      <table class="doc-totals">
        <tr><td>${t("inv_preview_subtotal")}</td><td class="r">${fmtMoney(doc.subtotal,cur)}</td></tr>
        <tr><td>${t("fld_tax")}</td><td class="r">${fmtMoney(doc.tax_amount,cur)}</td></tr>
        ${doc.discount_amount?`<tr><td>${t("fld_discount")}</td><td class="r">−${fmtMoney(doc.discount_amount,cur)}</td></tr>`:""}
        <tr class="grand" style="border-top:2px solid ${accent}"><td>${t("inv_preview_total")}</td><td class="r">${fmtMoney(doc.total,cur)}</td></tr>
        ${notes.map(n=>`<tr><td>${t("doc_credit_note")} ${docEsc(n.number)}</td><td class="r">−${fmtMoney(n.amount,cur)}</td></tr>`).join("")}
        ${pays.map(p=>`<tr><td>${p.amount<0?t("pay_kind_refund"):p.kind==="deposit"?t("pay_kind_deposit"):t("pay_kind_payment")} ${fmtDate(p.paid_at)}</td><td class="r">${p.amount<0?"+":"−"}${fmtMoney(Math.abs(p.amount),cur)}</td></tr>`).join("")}
        ${isInv&&(pays.length||notes.length)?`<tr class="grand" style="border-top:2px solid ${accent}"><td>${t("balance_label")}</td><td class="r">${fmtMoney(doc.balance_due,cur)}</td></tr>`:""}
      </table>
    </div>
    ${link&&co.qr_enabled?`<div style="display:flex;align-items:center;gap:12px;margin-top:18px;font-size:11px;color:#444"><div id="doc-qr"></div><div>${t("doc_qr_hint")}<br><span style="font-family:monospace;word-break:break-all">${docEsc(link)}</span></div></div>`:""}
    ${!isInv&&doc.signed_name?`<div style="margin-top:22px;display:flex;justify-content:flex-end"><div style="border:1px solid #ccc;border-radius:8px;padding:10px 14px;min-width:240px;font-size:11px;color:#333"><b>${t("doc_signature")}</b><br>${doc.signature_data&&String(doc.signature_data).startsWith("data:image/")?`<img src="${docEsc(doc.signature_data)}" alt="" style="max-height:70px;max-width:220px;display:block;margin:6px 0">`:""}${t("doc_signed_by").replace("{name}",docEsc(doc.signed_name)).replace("{date}",fmtDate(doc.signed_at))}</div></div>`:""}
    ${co.footer?`<div style="margin-top:22px;padding-top:10px;border-top:1px solid #ddd;font-size:11px;color:#555;text-align:center">${docEsc(co.footer)}</div>`:""}`;
  if(link&&co.qr_enabled&&typeof qrcode==="function"){
    try{const q=qrcode(0,"M");q.addData(link);q.make();document.getElementById("doc-qr").innerHTML=q.createSvgTag({cellSize:3,margin:0,scalable:true});const s=document.querySelector("#doc-qr svg");if(s){s.style.width="84px";s.style.height="84px";}}catch(_){}
  }
  document.getElementById("doc-wa-btn").style.display=isInv&&(State.tenant?.limits?.invoice_templates||State.tenant?.is_creator)?"":"none";
  document.getElementById("doc-view").style.display="block";
  document.body.classList.add("doc-open");
}
function closeDocument(){document.getElementById("doc-view").style.display="none";document.body.classList.remove("doc-open");}
function printDocument(){
  const old=document.title;document.title=`${_currentDoc?.number||"document"}`;
  window.print();setTimeout(()=>{document.title=old;},1000);
}
function whatsappInvoiceMessage(doc){
  const cur=doc.currency||"USD";
  const link=portalLinkFor(doc.portal_token);
  return t("wa_invoice_message").replace("{client}",doc.client?.name||"").replace("{number}",doc.number).replace("{total}",fmtMoney(doc.total,cur))
    .replace("{balance}",fmtMoney(doc.balance_due,cur)).replace("{due}",doc.due_date?fmtDate(doc.due_date):"—").replace("{link}",link||"").replace("{company}",doc.company?.name||"");
}
function shareDocWhatsApp(){
  const doc=_currentDoc;if(!doc)return;
  const phone=(doc.client?.phone||"").replace(/[^0-9]/g,"");
  const url=`https://wa.me/${phone}?text=${encodeURIComponent(whatsappInvoiceMessage(doc))}`;
  window.open(url,"_blank","noopener");
}
async function loadBillingSettings(){
  const ratesBox=document.getElementById("rates-box");
  if(ratesBox){
    await loadRates();
    if(!_ratesEnabled){ratesBox.innerHTML=`<div style="font-size:12px;color:var(--amber)"><i class="ti ti-lock"></i> ${t("currencies_locked")}</div>`;}
    else ratesBox.innerHTML=CURRENCIES.filter(c=>c!=="USD").map(c=>`<div class="fgrp" style="display:flex;align-items:center;gap:8px"><span style="font-family:var(--mono);font-size:13px;white-space:nowrap">1 USD =</span><input class="inp" type="number" min="0" step="0.0001" id="rate-${c}" value="${_rates[c]||""}" placeholder="${c==="CDF"?"2850":c==="MAD"?"10":"0.92"}"><span style="font-family:var(--mono)">${c}</span></div>`).join("")
      +`<button class="btn btn-g btn-sm" onclick="saveRates()"><i class="ti ti-check"></i> ${t("btn_save")}</button>`;
  }
  const tn=State.tenant||{};
  const logoBox=document.getElementById("logo-preview");
  if(logoBox) logoBox.innerHTML=tn.logo_url?`<img src="${esc(tn.logo_url)}" alt="" style="max-height:60px;max-width:160px;object-fit:contain;background:#fff;border-radius:6px;padding:4px">`:`<span style="font-size:12px;color:var(--muted)">${t("no_logo")}</span>`;
  const adv=advancedBilling();
  const color=document.getElementById("design-color");if(color){color.value=tn.brand_color||"#00b36b";color.disabled=!adv;}
  const tpl=document.getElementById("design-template");if(tpl){tpl.value=tn.invoice_template||"classic";[...tpl.options].forEach(o=>{o.disabled=!adv&&o.value!=="classic";});}
  const foot=document.getElementById("design-footer");if(foot)foot.value=tn.invoice_footer||"";
  const lock=document.getElementById("design-lock");if(lock)lock.style.display=adv?"none":"block";
}
async function saveRates(){
  const rates={};CURRENCIES.filter(c=>c!=="USD").forEach(c=>{const v=document.getElementById(`rate-${c}`)?.value;if(v)rates[c]=parseFloat(v);});
  try{const r=await api("PUT","/profile/exchange-rates",{rates});_rates=r.rates;showToast(t("toast_rates_saved"));}catch(e){showToast(e.message,"error");}
}
async function saveDesign(){
  const adv=advancedBilling();
  const body={footer:document.getElementById("design-footer").value};
  if(adv){body.brand_color=document.getElementById("design-color").value;body.template=document.getElementById("design-template").value;}
  try{const r=await api("PUT","/profile/invoice-design",body);Object.assign(State.tenant,{brand_color:r.brand_color,invoice_template:r.template,invoice_footer:r.footer});saveTenantLocal();showToast(t("toast_design_saved"));}
  catch(e){showToast(e.message,"error");}
}
async function uploadLogo(file){
  resetFileInputs('input[type=file][onchange^="uploadLogo"]');
  if(!file)return;
  try{
    const compressed=await compressImageFile(file,800,0.9);
    const fd=new FormData();fd.append("file",compressed);
    const r=await apiUpload("/profile/logo",fd);
    State.tenant.logo_url=r.logo_url;saveTenantLocal();loadBillingSettings();showToast(t("toast_logo_saved"));
  }catch(e){showToast(e.message,"error");}
}
async function removeLogo(){try{await api("DELETE","/profile/logo");State.tenant.logo_url=null;saveTenantLocal();loadBillingSettings();}catch(e){showToast(e.message,"error");}}
