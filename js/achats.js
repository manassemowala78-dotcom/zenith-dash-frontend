const PURCHASE_CATEGORIES=["Marchandises","Matières premières","Fournitures","Équipement","Transport","Loyer / Bureau","Logiciels / Abonnements","Marketing","Assurance","Téléphone / Internet","Services","Autre"];
let _purTab="list",_suppliersCache=[];
async function loadPurchasesPage(){
  if(!checkFeature(State.tenant?.limits||{},"stock")){document.getElementById("pur-body").innerHTML=`<div class="card" style="text-align:center;padding:28px;color:var(--muted)"><i class="ti ti-lock" style="font-size:28px"></i><div style="margin:8px 0">${t("pur_locked")}</div><button class="btn btn-g btn-sm" onclick="navigate('billing')">${t("btn_see_plans")}</button></div>`;document.getElementById("pur-kpis").innerHTML="";return;}
  try{
    const s=await api("GET","/purchases/summary");
    document.getElementById("pur-kpis").innerHTML=`<div class="kpi r"><div class="kl">${t("pur_total_payable")}</div><div class="kv">${fmtUSD(s.total_payable)}</div></div>
      <div class="kpi r"><div class="kl">${t("pur_overdue")}</div><div class="kv" style="color:${s.buckets.overdue?"var(--red)":"var(--text)"}">${fmtUSD(s.buckets.overdue)}</div></div>
      <div class="kpi a"><div class="kl">${t("pur_this_week")}</div><div class="kv">${fmtUSD(s.buckets.week)}</div></div>
      <div class="kpi b"><div class="kl">${t("pur_this_month")}</div><div class="kv">${fmtUSD(s.buckets.month)}</div></div>`;
    window._purSummary=s;
  }catch(e){document.getElementById("pur-kpis").innerHTML="";}
  showPurchasesTab(_purTab);
}
function purStatusBadge(p){
  if(p.status==="paid")return `<span class="badge bg">${t("st_paid")}</span>`;
  if(p.status==="cancelled")return `<span class="badge badge-gray">${t("st_cancelled")}</span>`;
  if(p.overdue)return `<span class="badge br">${t("st_overdue")}</span>`;
  if(p.status==="partial")return `<span class="badge ba">${t("st_partial")}</span>`;
  return `<span class="badge bb">${t("pur_to_pay")}</span>`;
}
async function showPurchasesTab(tab){
  _purTab=tab;
  document.querySelectorAll("[data-purtab]").forEach(b=>b.classList.toggle("active",b.dataset.purtab===tab));
  const box=document.getElementById("pur-body");
  try{
    if(tab==="list"){
      const list=await api("GET","/purchases");
      box.innerHTML=`<div class="card"><div class="table-wrap"><table><thead><tr><th>${t("th_number")}</th><th>${t("th_date")}</th><th>${t("th_supplier")}</th><th>${t("th_amount")}</th><th>${t("th_due_date")}</th><th>${t("th_status")}</th><th></th></tr></thead><tbody>
        ${list.map(p=>`<tr><td style="font-family:var(--mono);color:var(--blue);cursor:pointer" onclick="openPurchaseDetail('${p.id}')">${p.number}${p.has_attachment?' <i class="ti ti-paperclip"></i>':""}</td><td>${fmtDate(p.invoice_date)}</td>
          <td>${esc(p.supplier_name||"—")}${p.supplier_ref?`<div style="font-size:10px;color:var(--muted)">${esc(p.supplier_ref)}</div>`:""}</td>
          <td style="font-family:var(--mono);font-weight:700">${fmtMoney(p.total,p.currency)}${p.status==="partial"?`<div style="font-size:10px;font-weight:400;color:var(--amber)">${t("balance_label")} ${fmtMoney(p.balance_due,p.currency)}</div>`:""}</td>
          <td style="font-family:var(--mono);font-size:12px;${p.overdue?"color:var(--red);font-weight:700":""}">${p.due_date?fmtDate(p.due_date):"—"}</td><td>${purStatusBadge(p)}</td>
          <td style="display:flex;gap:5px">${["open","partial"].includes(p.status)?`<button class="btn btn-sm btn-g" onclick="openSupplierPayModal('${p.id}')"><i class="ti ti-cash"></i> ${t("btn_pay_supplier")}</button>`:""}<button class="btn btn-sm btn-o" onclick="openPurchaseDetail('${p.id}')"><i class="ti ti-eye"></i></button></td></tr>`).join("")
        ||`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">${t("pur_none")}</td></tr>`}</tbody></table></div></div>`;
    }else if(tab==="schedule"){
      const s=window._purSummary||await api("GET","/purchases/summary");
      const groups=[["overdue",t("pur_overdue")],["week",t("pur_this_week")],["month",t("pur_this_month")],["later",t("pur_later")],["no_date",t("pur_no_date")]];
      box.innerHTML=groups.map(([k,label])=>{const items=s.schedule.filter(x=>x.bucket===k);if(!items.length)return "";
        return `<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:6px"><span style="${k==="overdue"?"color:var(--red)":""}">${label}</span><span style="font-family:var(--mono)">${fmtUSD(s.buckets[k])}</span></div>
          ${items.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--b);font-size:13px"><span style="flex:1">${p.due_date?fmtDate(p.due_date):"—"} · <b>${esc(p.supplier_name||"—")}</b> · ${p.number}</span><b style="font-family:var(--mono)">${fmtMoney(p.balance_due,p.currency)}</b><button class="btn btn-sm btn-g" onclick="openSupplierPayModal('${p.id}')">${t("btn_pay_supplier")}</button></div>`).join("")}</div>`;}).join("")
        ||`<div class="card" style="text-align:center;color:var(--muted);padding:24px">${t("pur_nothing_due")}</div>`;
    }else{
      const s=window._purSummary||await api("GET","/purchases/summary");
      box.innerHTML=`<div class="card"><div class="table-wrap"><table><thead><tr><th>${t("th_supplier")}</th><th>${t("pur_invoices_open")}</th><th>${t("pur_total_payable")}</th><th></th></tr></thead><tbody>
        ${s.by_supplier.map(x=>`<tr><td style="font-weight:600">${esc(x.supplier_name)}</td><td>${x.count}</td><td style="font-family:var(--mono);font-weight:700">${fmtUSD(x.balance_usd)}</td><td>${x.supplier_id?`<button class="btn btn-sm btn-o" onclick="openSupplierStatement('${x.supplier_id}')"><i class="ti ti-list-details"></i> ${t("pur_statement")}</button>`:""}</td></tr>`).join("")
        ||`<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">${t("pur_nothing_due")}</td></tr>`}</tbody></table></div></div>`;
    }
  }catch(e){box.innerHTML=`<div style="color:var(--red);padding:16px">${esc(e.message)}</div>`;}
}
async function openPurchaseModal(orderId){
  try{_suppliersCache=await api("GET","/suppliers/");}catch(_){_suppliersCache=[];}
  document.getElementById("pur-supplier").innerHTML=`<option value="">—</option>`+_suppliersCache.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");
  document.getElementById("pur-category").innerHTML=PURCHASE_CATEGORIES.map(c=>`<option value="${esc(c)}">${esc(t("purcat_"+c)!=="purcat_"+c?t("purcat_"+c):c)}</option>`).join("");
  ["pur-ref","pur-desc","pur-qty","pur-price","pur-tax","pur-disc","pur-notes"].forEach(id=>{document.getElementById(id).value="";});
  document.getElementById("pur-extra-lines").innerHTML="";document.getElementById("pur-file").value="";
  document.getElementById("pur-date").value=localDateInput(0);document.getElementById("pur-due").value=localDateInput(30);
  await loadRates();fillCurrencySelect("pur-currency","USD");
  document.getElementById("pur-preview").textContent="";
  document.getElementById("modal-purchase").style.display="flex";
  loadProjectSelect("pur-project");
}
function closePurchaseModal(){document.getElementById("modal-purchase").style.display="none";}
function computePurchasePreview(){
  const {lines}=collectLines("pur","pur-extra-lines");const disc=parseFloat(document.getElementById("pur-disc").value)||0;
  const cur=document.getElementById("pur-currency").value||"USD";const {sub,tax,total}=linesTotals(lines,disc);
  document.getElementById("pur-preview").innerHTML=sub?`${t("inv_preview_subtotal")} ${fmtMoney(sub,cur)} · ${t("fld_tax")} ${fmtMoney(tax,cur)}${disc?` · ${t("fld_discount")} −${fmtMoney(disc,cur)}`:""} → <b style="color:var(--green)">${t("inv_preview_total")} ${fmtMoney(total,cur)}</b>`:"";
}
async function submitPurchase(){
  const {lines,errors}=collectLines("pur","pur-extra-lines");
  if(errors.length){flagMissingFields(errors);return;}
  try{
    const p=await api("POST","/purchases",{supplier_id:document.getElementById("pur-supplier").value||null,supplier_ref:document.getElementById("pur-ref").value||null,
      category:document.getElementById("pur-category").value,items:lines,discount_amount:parseFloat(document.getElementById("pur-disc").value||0),
      currency:document.getElementById("pur-currency").value||"USD",invoice_date:dateInputToIso(document.getElementById("pur-date").value),
      due_date:document.getElementById("pur-due").value?dateInputToIso(document.getElementById("pur-due").value):null,notes:document.getElementById("pur-notes").value||null,project_id:document.getElementById("pur-project").value||null});
    const f=document.getElementById("pur-file").files[0];
    if(f&&p.id&&!p.queued){try{const fd=new FormData();fd.append("file",f);await apiUpload(`/purchases/${p.id}/attachment`,fd);}catch(e){showToast(e.message,"error");}}
    closePurchaseModal();showToast(p.queued?t("offline_queued"):`${t("toast_purchase_created")} ${p.number}`);loadPurchasesPage();
  }catch(e){showToast(e.message,"error");}
}
async function createPurchaseFromOrder(oid){
  try{const p=await api("POST",`/purchases/from-order/${oid}`);showToast(`${t("toast_purchase_created")} ${p.number}`);_purTab="list";navigate("purchases");}catch(e){showToast(e.message,"error");}
}
let _supPay=null;
async function openSupplierPayModal(id){
  try{
    _supPay=await api("GET",`/purchases/${id}`);
    document.getElementById("sp-title").textContent=`${_supPay.number} — ${_supPay.supplier_name||""}`;
    document.getElementById("sp-summary").textContent=`${t("inv_preview_total")} ${fmtMoney(_supPay.total,_supPay.currency)} · ${t("paid_label")} ${fmtMoney(_supPay.amount_paid,_supPay.currency)} · ${t("balance_label")} ${fmtMoney(_supPay.balance_due,_supPay.currency)}`;
    document.getElementById("sp-amount").value=_supPay.balance_due;document.getElementById("sp-date").value=localDateInput(0);
    document.getElementById("sp-method").value="bank";document.getElementById("sp-ref").value="";
    closePurchaseDetail();document.getElementById("modal-supplier-pay").style.display="flex";
  }catch(e){showToast(e.message,"error");}
}
function closeSupplierPayModal(){document.getElementById("modal-supplier-pay").style.display="none";}
async function submitSupplierPayment(){
  const amount=parseFloat(document.getElementById("sp-amount").value);
  if(!(amount>0)){flagMissingFields([document.getElementById("sp-amount")]);return;}
  try{
    const r=await api("POST",`/purchases/${_supPay.id}/payments`,{amount,method:document.getElementById("sp-method").value,paid_at:paymentDateIso(document.getElementById("sp-date").value),reference:document.getElementById("sp-ref").value||null});
    closeSupplierPayModal();showToast(r.queued?t("offline_queued"):(r.purchase.status==="paid"?t("toast_purchase_paid"):`${t("toast_payment_saved")} — ${t("balance_label")} ${fmtMoney(r.purchase.balance_due,r.currency)}`));loadPurchasesPage();
  }catch(e){showToast(e.message,"error");}
}
async function openPurchaseDetail(id){
  try{
    const p=await api("GET",`/purchases/${id}`);
    document.getElementById("pur-detail-body").innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px"><div><div style="font-family:var(--mono);font-size:18px;font-weight:700;color:var(--blue)">${p.number}</div>
        <div style="font-size:12px;color:var(--muted)">${esc(p.supplier_name||"—")}${p.supplier_ref?` · ${t("pur_supplier_ref")} ${esc(p.supplier_ref)}`:""} · ${fmtDate(p.invoice_date)} · ${esc(p.category)}</div></div><div>${purStatusBadge(p)}</div></div>
      <div class="table-wrap"><table style="font-size:13px"><tbody>${p.items.map(i=>`<tr><td>${esc(i.description)}</td><td style="text-align:right">${i.qty} × ${fmtMoney(i.unit_price,p.currency)}</td><td style="text-align:right">${i.tax_rate||0} %</td></tr>`).join("")}</tbody></table></div>
      <div style="text-align:right;margin:8px 0;font-size:13px">${t("inv_preview_subtotal")} ${fmtMoney(p.subtotal,p.currency)} · ${t("fld_tax")} ${fmtMoney(p.tax_amount,p.currency)} · <b>${t("inv_preview_total")} ${fmtMoney(p.total,p.currency)}</b></div>
      <div style="font-weight:700;font-size:13px;margin:10px 0 6px">${t("payments_title")}</div>
      ${p.payments.map(x=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--b);font-size:13px"><span style="flex:1">${fmtDate(x.paid_at)} · ${t("pay_method_"+x.method)}${x.reference?` · ${esc(x.reference)}`:""}</span><b style="font-family:var(--mono)">${fmtMoney(x.amount,p.currency)}</b><button class="btn btn-o btn-sm" style="padding:2px 8px" onclick="deleteSupplierPayment('${p.id}','${x.id}')"><i class="ti ti-trash"></i></button></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${t("no_payments_yet")}</div>`}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">
        ${["open","partial"].includes(p.status)?`<button class="btn btn-g btn-sm" onclick="openSupplierPayModal('${p.id}')"><i class="ti ti-cash"></i> ${t("btn_pay_supplier")}</button>`:""}
        ${p.attachment_url?`<a class="btn btn-o btn-sm" href="${esc(p.attachment_url)}" target="_blank" rel="noopener"><i class="ti ti-paperclip"></i> ${t("pur_attachment")}</a>`:""}
        ${p.payments.length?"":`<button class="btn btn-r btn-sm" onclick="deletePurchase('${p.id}')"><i class="ti ti-trash"></i> ${t("btn_delete")}</button>`}
      </div>`;
    document.getElementById("modal-purchase-detail").style.display="flex";
  }catch(e){showToast(e.message,"error");}
}
function closePurchaseDetail(){document.getElementById("modal-purchase-detail").style.display="none";}
async function deleteSupplierPayment(pid,payid){if(!confirm(t("confirm_delete_payment")))return;try{await api("DELETE",`/purchases/${pid}/payments/${payid}`);openPurchaseDetail(pid);loadPurchasesPage();}catch(e){showToast(e.message,"error");}}
async function deletePurchase(id){if(!confirm(t("pur_confirm_delete")))return;try{await api("DELETE",`/purchases/${id}`);closePurchaseDetail();loadPurchasesPage();}catch(e){showToast(e.message,"error");}}
async function openSupplierStatement(sid){
  try{
    const s=await api("GET",`/suppliers/${sid}/statement`);
    document.getElementById("pur-detail-body").innerHTML=`<div style="font-weight:700;font-size:16px;margin-bottom:4px">${t("pur_statement")} — ${esc(s.supplier.name)}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px">${t("pur_purchased_total")} ${fmtUSD(s.purchased_usd)} · ${t("pur_total_payable")} <b style="color:var(--red)">${fmtUSD(s.balance_usd)}</b></div>
      <div class="table-wrap"><table style="font-size:12px"><thead><tr><th>${t("th_date")}</th><th>${t("ledger_label")}</th><th style="text-align:right">${t("pur_we_owe")}</th><th style="text-align:right">${t("pur_we_paid")}</th><th style="text-align:right">${t("ledger_balance")}</th></tr></thead><tbody>
      ${s.lines.map(l=>`<tr><td>${fmtDate(l.date)}</td><td>${esc(l.label)}</td><td style="text-align:right;font-family:var(--mono)">${l.credit?fmtUSD(l.credit):""}</td><td style="text-align:right;font-family:var(--mono)">${l.debit?fmtUSD(l.debit):""}</td><td style="text-align:right;font-family:var(--mono);font-weight:700">${fmtUSD(l.balance)}</td></tr>`).join("")}</tbody></table></div>`;
    document.getElementById("modal-purchase-detail").style.display="flex";
  }catch(e){showToast(e.message,"error");}
}
