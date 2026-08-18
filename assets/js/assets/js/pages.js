/* ── DASHBOARD ── */
async function loadDashboard(){
  try{
    const s=await getDashboard();
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set("kpi-calls",s.total_calls.toLocaleString());
    set("kpi-invoices",s.invoices_created.toLocaleString());
    set("kpi-revenue",fmtUSD(s.total_revenue_usd));
    set("kpi-clients",s.active_clients.toLocaleString());
  }catch(e){console.error(e);}
}

/* ── INVOICES ── */
async function loadInvoices(filter=null){
  const tbody=document.getElementById("inv-tbody");if(!tbody)return;
  tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">Chargement...</td></tr>`;
  try{
    const invs=await listInvoices(filter);
    if(!invs?.length){tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">Aucune facture. <a href="#" onclick="openInvModal()">Créer →</a></td></tr>`;return;}
    tbody.innerHTML=invs.map(i=>`<tr>
      <td style="font-family:var(--mono);color:var(--blue)">${i.number}</td>
      <td>${fmtDate(i.created_at)}</td>
      <td>${statusBadge(i.status)}</td>
      <td style="font-family:var(--mono);font-weight:700">${fmtUSD(i.total)}</td>
      <td style="font-family:var(--mono);font-size:11px;color:var(--muted)">${i.blockchain_hash?`<span class="badge bp">🔗 Signé</span>`:"—"}</td>
      <td style="display:flex;gap:5px">
        ${i.status==="draft"?`<button class="btn btn-sm btn-o" onclick="handleSend('${i.id}')">Envoyer</button>`:""}
        ${i.status!=="paid"?`<button class="btn btn-sm btn-g" onclick="handlePaid('${i.id}')">Payée</button>`:""}
      </td></tr>`).join("");
  }catch(e){tbody.innerHTML=`<tr><td colspan="6" style="color:var(--red);padding:20px">${e.message}</td></tr>`;}
}
async function handleSend(id){try{await sendInvoice(id);showToast("Envoyée ✓");loadInvoices();}catch(e){showToast(e.message,"error");}}
async function handlePaid(id){try{await markPaid(id);showToast("Payée ✓");loadInvoices();}catch(e){showToast(e.message,"error");}}
function openInvModal(){document.getElementById("modal-inv").style.display="flex";}
function closeInvModal(){document.getElementById("modal-inv").style.display="none";}
async function submitInvoice(){
  const desc=document.getElementById("inv-desc").value;
  const qty=parseFloat(document.getElementById("inv-qty").value);
  const price=parseFloat(document.getElementById("inv-price").value);
  const tax=parseFloat(document.getElementById("inv-tax").value||0);
  const disc=parseFloat(document.getElementById("inv-disc").value||0);
  if(!desc||!qty||!price){showToast("Remplissez les champs obligatoires","error");return;}
  try{
    await createInvoice({items:[{description:desc,qty,unit_price:price,tax_rate:tax}],discount_amount:disc,currency:"USD"});
    showToast("Facture créée ✓");closeInvModal();
    ["inv-desc","inv-qty","inv-price"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
    loadInvoices();
  }catch(e){showToast(e.message,"error");}
}

/* ── CLIENTS ── */
async function loadClients(){
  const c=document.getElementById("clients-list");if(!c)return;
  try{
    const cls=await listClients();
    if(!cls?.length){c.innerHTML=`<div style="text-align:center;color:var(--muted);padding:32px">Aucun client. <a href="#" onclick="openClientModal()">Ajouter →</a></div>`;return;}
    c.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Facturé</th><th></th></tr></thead><tbody>
    ${cls.map(cl=>`<tr><td style="font-weight:600">${cl.name}</td><td style="font-family:var(--mono);font-size:12px">${cl.email||"—"}</td><td style="font-family:var(--mono);font-size:12px">${cl.phone||"—"}</td><td style="font-family:var(--mono);font-weight:700">${fmtUSD(cl.total_invoiced)}</td><td><button class="btn btn-sm btn-r" onclick="handleDelClient('${cl.id}')">Suppr.</button></td></tr>`).join("")}
    </tbody></table></div>`;
  }catch(e){c.innerHTML=`<p style="color:var(--red)">${e.message}</p>`;}
}
async function handleDelClient(id){if(!confirm("Supprimer ?"))return;try{await deleteClient(id);showToast("Supprimé ✓");loadClients();}catch(e){showToast(e.message,"error");}}
function openClientModal(){document.getElementById("modal-client").style.display="flex";}
function closeClientModal(){document.getElementById("modal-client").style.display="none";}
async function submitClient(){
  const name=document.getElementById("cl-name").value;
  if(!name){showToast("Nom obligatoire","error");return;}
  try{
    await createClient({name,email:document.getElementById("cl-email").value||null,phone:document.getElementById("cl-phone").value||null});
    showToast("Client ajouté ✓");closeClientModal();loadClients();
  }catch(e){showToast(e.message,"error");}
}

/* ── BILLING ── */
let _plans={};let _subCycle="monthly";let _lastWire=null;
async function loadBilling(){
  try{
    _plans=await getPlans();
    renderPlans();
  }catch(e){console.error(e);}
}
function setSubCycle(cycle){
  _subCycle=cycle;
  document.getElementById("toggle-m").classList.toggle("active",cycle==="monthly");
  document.getElementById("toggle-a").classList.toggle("active",cycle==="annual");
  renderPlans();
}
function renderPlans(){
  const grid=document.getElementById("plans-grid");if(!grid||!_plans)return;
  const order=["starter","professional","business","enterprise","ultimate"];
  const colors={starter:"var(--green)",professional:"var(--blue)",business:"var(--purple)",enterprise:"var(--amber)",ultimate:"var(--gold)"};
  grid.innerHTML=order.filter(k=>_plans[k]).map(k=>{
    const p=_plans[k];
    const price=_subCycle==="annual"?p.price_annual:p.price_monthly;
    const period=_subCycle==="annual"?"/an":"/mois";
    const savings=p.savings_annual;
    return `<div class="plan-card ${k==="professional"?"featured":""}">
      <div style="font-family:var(--mono);font-size:10px;color:${colors[k]};text-transform:uppercase;margin-bottom:8px">${p.name}</div>
      <div style="font-size:28px;font-weight:800">$${price}</div>
      <div style="font-family:var(--mono);font-size:11px;color:var(--muted)">USD${period}</div>
      ${_subCycle==="annual"&&savings>0?`<div style="font-family:var(--mono);font-size:10px;color:var(--green);margin-top:2px">Économisez $${savings}/an</div>`:""}
      <div style="font-size:11px;color:var(--muted);margin:8px 0 12px;font-style:italic">${p.tagline}</div>
      <button class="btn btn-g" style="width:100%;justify-content:center" onclick="initSubscribe('${k}')">
        <i class="ti ti-building-bank"></i> Souscrire
      </button>
    </div>`;
  }).join("");
}
async function initSubscribe(plan){
  try{
    const r=await subscribeToPlan(plan,_subCycle);
    _lastWire=r;
    showWireModal(r);
  }catch(e){showToast(e.message,"error");}
}
function showWireModal(r){
  const ins=r.instructions;
  const nw=ins.national_wire;
  const iw=ins.international_wire;
  document.getElementById("wire-modal-content").innerHTML=`
    <div style="background:rgba(0,212,200,.06);border:1px solid rgba(0,212,200,.2);border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:4px">${ins.plan} — ${ins.billing_cycle}</div>
      <div style="font-size:20px;font-weight:800;color:var(--green);margin:6px 0">${fmtUSD(ins.amount_usd)}</div>
      <div style="font-family:var(--mono);font-size:11px;color:var(--muted)">${ins.refund_policy}</div>
    </div>
    <div style="background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-weight:700;font-size:13px;color:var(--amber)">
      ⚠️ Libellé OBLIGATOIRE : <span style="font-family:var(--mono);letter-spacing:2px">${ins.reference}</span>
    </div>

    <div style="font-weight:700;font-size:14px;margin-bottom:10px;color:var(--green)">🇨🇩 ${nw.label}</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px">${nw.note}</div>
    <div class="wire-box" style="margin-bottom:16px">
      <b>Bénéficiaire :</b> ${nw.beneficiary}<br>
      <b>N° de compte :</b> ${nw.account}<br>
      <b>Banque :</b> ${nw.bank_name}<br>
      <b>Agence :</b> ${nw.branch}<br>
      <b>SWIFT :</b> ${nw.swift}<br>
      <b>Devise :</b> ${nw.currency}
    </div>

    <div style="font-weight:700;font-size:14px;margin-bottom:10px;color:var(--cyan)">🌍 ${iw.label}</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px">${iw.note}</div>
    <div class="wire-box">
      <b>Bénéficiaire :</b> ${iw.beneficiary}<br>
      <b>IBAN :</b> ${iw.iban}<br>
      <b>SWIFT/BIC :</b> ${iw.swift_bic}<br>
      <b>Banque :</b> ${iw.bank_name}<br>
      <b>Adresse :</b> ${iw.bank_address}<br>
      <b>Banque intermédiaire :</b> ${iw.intermediary_bank}<br>
      <b>SWIFT intermédiaire :</b> ${iw.intermediary_bic}<br>
      <b>Devise :</b> ${iw.currency}
    </div>
    <div style="margin-top:12px;font-family:var(--mono);font-size:11px;color:var(--muted)">${ins.activation_delay}</div>
  `;
  document.getElementById("wire-modal").style.display="flex";
}
function closeWireModal(){document.getElementById("wire-modal").style.display="none";}
function copyWireDetails(){
  if(!_lastWire)return;
  const ins=_lastWire.instructions; const nw=ins.national_wire; const iw=ins.international_wire;
  const text=`VIREMENT ZENITH DASH\nPlan: ${ins.plan} (${ins.billing_cycle})\nMontant: ${fmtUSD(ins.amount_usd)}\nRéférence OBLIGATOIRE: ${ins.reference}\n\nVIREMENT NATIONAL (RDC)\nBénéficiaire: ${nw.beneficiary}\nCompte: ${nw.account}\nSWIFT: ${nw.swift}\nBanque: ${nw.bank_name}\n\nVIREMENT INTERNATIONAL (SWIFT)\nBénéficiaire: ${iw.beneficiary}\nIBAN: ${iw.iban}\nSWIFT: ${iw.swift_bic}\nBanque: ${iw.bank_name}\nBanque inter.: ${iw.intermediary_bank} (${iw.intermediary_bic})`;
  navigator.clipboard.writeText(text).then(()=>showToast("Coordonnées copiées ✓"));
}

/* ── ANALYTICS ── */
async function loadAnalytics(){
  try{
    const p=await getAIPrediction();
    const set=(id,v,col)=>{const e=document.getElementById(id);if(e){e.textContent=v;if(col)e.style.color=col;}};
    set("pred-next-month",fmtUSD(p.predicted_revenue_next_month));
    set("pred-next-quarter",fmtUSD(p.predicted_revenue_next_quarter));
    set("pred-growth",(p.growth_rate_percent>=0?"+":"")+p.growth_rate_percent+"%",p.growth_rate_percent>=0?"var(--green)":"var(--red)");
    set("pred-confidence",Math.round(p.confidence*100)+"%");
    const el=document.getElementById("pred-recs");
    if(el) el.innerHTML=p.recommendations.map(r=>`<li style="padding:6px 0;border-bottom:1px solid var(--b);font-size:13px"><span style="color:var(--purple);margin-right:8px">→</span>${r}</li>`).join("");
  }catch(e){console.error(e);}
}

/* ── REPORTS ── */
let _repPeriod="month";
async function loadReport(period,btn){
  _repPeriod=period||"month";
  if(btn){document.querySelectorAll("[data-rp]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");}
  try{
    const r=await getReport(_repPeriod);
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set("rep-paid",fmtUSD(r.revenue?.total_paid));
    set("rep-pending",fmtUSD(r.revenue?.pending));
    set("rep-net",fmtUSD(r.revenue?.net));
    set("rep-api-cost",fmtUSD(r.api_costs_usd));
    set("rep-inv-count",r.invoices?.total||0);
    set("rep-inv-paid",r.invoices?.paid||0);
    const tc=document.getElementById("rep-top-clients");
    if(tc) tc.innerHTML=r.top_clients?.length?r.top_clients.map((c,i)=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b);font-size:12px"><span>${i+1}. ${c.name}</span><span style="color:var(--cyan);font-family:var(--mono)">${fmtUSD(c.total_usd)}</span></div>`).join(""):`<p style="color:var(--muted);font-size:12px">Aucun client facturé</p>`;
  }catch(e){console.error(e);}
}
async function exportCsv(){
  try{
    const r=await fetch(`${API_BASE}/reports/export/csv?period=${_repPeriod}`,{headers:{Authorization:`Bearer ${State.token}`}});
    const csv=await r.text();
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`zenith-${_repPeriod}.csv`;
    a.click();
    showToast("Export téléchargé ✓");
  }catch(e){showToast(e.message,"error");}
}

/* ── PROFILE ── */
async function loadProfile(){
  try{
    const p=await getProfile();
    const set=(id,v)=>{const e=document.getElementById(id);if(e&&v!=null)e.value=v;};
    set("prof-name",p.name); set("prof-company",p.company_name);
    set("prof-phone",p.phone); set("prof-country",p.country);
    set("bank-name",p.bank?.bank_name); set("bank-account",p.bank?.bank_account);
    set("bank-swift",p.bank?.bank_swift); set("bank-iban",p.bank?.bank_iban);
  }catch(e){console.error(e);}
}
async function saveProfile(){
  try{
    const d={};
    const f={name:"prof-name",company_name:"prof-company",phone:"prof-phone",country:"prof-country"};
    for(const[k,id] of Object.entries(f)){const e=document.getElementById(id);if(e&&e.value)d[k]=e.value;}
    await updateProfile(d); showToast("Profil mis à jour ✓");
  }catch(e){showToast(e.message,"error");}
}
async function saveBank(){
  const name=document.getElementById("bank-name")?.value;
  const account=document.getElementById("bank-account")?.value;
  if(!name||!account){showToast("Nom et numéro de compte obligatoires","error");return;}
  try{
    await updateBank({bank_name:name,bank_account:account,bank_swift:document.getElementById("bank-swift")?.value||null,bank_iban:document.getElementById("bank-iban")?.value||null});
    showToast("Coordonnées bancaires enregistrées ✓");
  }catch(e){showToast(e.message,"error");}
}
async function savePwd(){
  const cur=document.getElementById("pwd-cur")?.value;
  const nw=document.getElementById("pwd-new")?.value;
  const cf=document.getElementById("pwd-cf")?.value;
  if(!cur||!nw||!cf){showToast("Remplissez tous les champs","error");return;}
  if(nw!==cf){showToast("Les mots de passe ne correspondent pas","error");return;}
  try{await changePassword({current_password:cur,new_password:nw});showToast("Mot de passe modifié ✓");}
  catch(e){showToast(e.message,"error");}
}

/* ── AUTH HANDLERS ── */
async function handleLogin(e){
  e.preventDefault();
  const btn=document.getElementById("login-btn");btn.textContent="Connexion...";btn.disabled=true;
  try{await login(document.getElementById("login-email").value,document.getElementById("login-password").value);showAppLayout();}
  catch(err){showErr("login-err",err.message);btn.innerHTML='<i class="ti ti-login"></i> Se connecter';btn.disabled=false;}
}
async function handleRegister(e){
  e.preventDefault();
  const btn=document.getElementById("reg-btn");btn.textContent="Création...";btn.disabled=true;
  try{
    await register({name:document.getElementById("reg-name").value,email:document.getElementById("reg-email").value,password:document.getElementById("reg-password").value,company_name:document.getElementById("reg-company").value||null});
    showAppLayout();
  }catch(err){showErr("reg-err",err.message);btn.innerHTML='<i class="ti ti-user-plus"></i> Créer mon compte';btn.disabled=false;}
}
function showAuthTab(tab){
  document.querySelectorAll(".auth-tab-content").forEach(t=>t.style.display="none");
  document.querySelectorAll(".auth-tab").forEach(b=>b.classList.remove("active"));
  document.getElementById(`tab-${tab}`).style.display="block";
  document.querySelector(`[data-tab="${tab}"]`).classList.add("active");
}
function doLogout(){logout();document.getElementById("app-screen").style.display="none";document.getElementById("auth-screen").style.display="flex";}
