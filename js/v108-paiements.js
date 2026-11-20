// ── 10.8.0 · Paiements : Mobile Money, preuve avec téléphone, paiement partiel, reçus,
// et côté admin : « À vérifier » / « Reçus », activation d'une formule payée, numéros Mobile Money ──
const ZP8={tab:null,receipts:null,adm:{tab:"check",q:"",month:null,data:null,pay:null},act:null};
const ZP8_MOB=["mpesa","orange","airtel"];
const ZP8_NAMES={mpesa:"M-Pesa",orange:"Orange Money",airtel:"Airtel Money",bank:null,cash:"Espèces",other:"Autre"};
function zp8Name(k){return k==="bank"?t("zp8_m_bank"):(ZP8_NAMES[k]||k);}
function zp8Money(v){const n=Math.round((+v||0)*100)/100;return n.toLocaleString("fr-FR",{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})+" $";}
function zp8Copy(txt,msg){try{navigator.clipboard.writeText(txt).then(()=>showToast(msg||t("zp8_copied")));}catch(_){showToast(txt);}}

// ── Client : instructions de paiement (Mobile Money ou banque) ──
showWireModal=function(r){
  const ins=r.instructions||{};const mob=(ins.mobile||[]).filter(m=>m&&m.number);
  const tabs=[...mob.map(m=>m.key),"bank"];
  if(!ZP8.tab||!tabs.includes(ZP8.tab))ZP8.tab=tabs[0];
  const amt=r.remaining_usd!=null&&r.remaining_usd>0?r.remaining_usd:(ins.amount_usd||r.amount_usd||0);
  const ref=ins.reference||r.wire_reference;
  const title=document.querySelector("#wire-modal .modal-title");
  if(title)title.innerHTML=`<i class="ti ti-wallet" style="color:var(--green)"></i> ${esc(t("zp8_title"))}`;
  const nw=ins.national_wire||{},iw=ins.international_wire||{};
  const panel=k=>{
    if(k==="bank")return `<div class="zp8-panel"><div class="zp8-ph">🇨🇩 ${esc(nw.label||"")}</div>
      ${[["beneficiary_label",nw.beneficiary],["account_number_label",nw.account_number],["full_ref_label",nw.full_account_reference],["bank_label",nw.bank_name],["swift_label",nw.swift_bic],["currency_label",nw.currency]].filter(x=>x[1]).map(([a,b])=>`<div class="zp8-kv"><span>${esc(t(a))}</span><b>${esc(b)}</b></div>`).join("")}
      <div class="zp8-ph" style="margin-top:10px">🌍 ${esc(iw.label||"")}</div>
      ${[["beneficiary_label",iw.beneficiary],["address_label",iw.beneficiary_address],["account_number_label",iw.account_number],["swift_label",iw.swift_bic],["bank_label",iw.bank_name],["correspondent_label",iw.correspondent_bank?`${iw.correspondent_bank} (${iw.correspondent_bic||""})`:""],["currency_label",iw.currency]].filter(x=>x[1]).map(([a,b])=>`<div class="zp8-kv"><span>${esc(t(a))}</span><b>${esc(b)}</b></div>`).join("")}</div>`;
    const m=mob.find(x=>x.key===k)||{};
    return `<div class="zp8-panel"><div class="zp8-kv"><span>${esc(t("zp8_send_to"))}</span><b class="zp8-num">${esc(m.number)} <button type="button" class="zp8-cp" aria-label="${esc(t("zp8_copy"))}" onclick="zp8Copy('${escJs(m.number)}')"><i class="ti ti-copy"></i></button></b></div>
      <div class="zp8-kv"><span>${esc(t("zp8_acc_name"))}</span><b>${esc(m.name)}</b></div></div>`;
  };
  setHTML("wire-modal-content",`
    <div class="zp8-amt"><small>${esc(t("zp8_amount"))}</small><b>${esc(zp8Money(amt))}</b>
      <div class="zp8-ref"><span>${esc(t("zp8_ref"))} :</span><code>${esc(ref)}</code><button type="button" class="zp8-cp" aria-label="${esc(t("zp8_copy"))}" onclick="zp8Copy('${escJs(ref)}')"><i class="ti ti-copy"></i></button></div>
      <small>${esc(t("zp8_ref_note"))}</small>${ins.plan?`<small class="zp8-plan">${esc(ins.plan)}</small>`:""}</div>
    <div class="zp8-tabs" role="tablist">${tabs.map(k=>`<button type="button" role="tab" aria-selected="${ZP8.tab===k}" class="${ZP8.tab===k?"on":""}" onclick="ZP8.tab='${k}';showWireModal(_lastWire)">${esc(zp8Name(k))}</button>`).join("")}</div>
    ${panel(ZP8.tab)}
    <div style="margin-top:14px">${r.expires_at?`<div class="ab-small" style="margin-bottom:8px"><i class="ti ti-clock"></i> ${esc(t("ab_pending_exp").replace("{d}",fmtDate(r.expires_at)))}</div>`:""}
    ${abProofForm(ref,"wm")}</div>`);
  _lastWire=r;
  document.getElementById("wire-modal").style.display="flex";
};
copyWireDetails=function(){
  const r=_lastWire;if(!r)return;const ins=r.instructions||{};const m=(ins.mobile||[]).find(x=>x.key===ZP8.tab);
  const amt=r.remaining_usd>0?r.remaining_usd:(ins.amount_usd||0);
  const lines=[`ZENITH DASH · ${t("zp8_ref")} ${ins.reference||r.wire_reference}`,`${t("zp8_amount")} : ${zp8Money(amt)}`];
  if(m)lines.push(`${m.label} : ${m.number} (${m.name})`);
  else if(ins.national_wire)lines.push(`${ins.national_wire.beneficiary} · ${ins.national_wire.account_number} · ${ins.national_wire.bank_name} · SWIFT ${ins.national_wire.swift_bic}`);
  zp8Copy(lines.join("\n"),t("zp8_copied"));
};
async function zp8HowTo(ref){
  try{const r=await api("GET",`/billing/wire/${encodeURIComponent(ref)}/instructions`);ZP8.tab=null;showWireModal(r);}catch(e){showToast(e.message,"error");}
}

// ── Client : preuve avec le moyen de paiement et le téléphone ──
abProofForm=function(ref,px){
  const mob=(_lastWire?.instructions?.mobile||_ab?.offer?.pay_mobile||[]).map(m=>m.key);
  const opts=[...new Set([...(ZP8.tab&&ZP8.tab!=="bank"?[ZP8.tab]:[]),...mob,"bank"])];
  const sel=ZP8.tab&&opts.includes(ZP8.tab)?ZP8.tab:opts[0];
  return `<div class="ab-proof" id="${px}-proof"><div class="ab-proof-t">${esc(t("zp8_paid_t"))}</div>
    <label class="fl" for="${px}-method">${esc(t("zp8_method"))}</label>
    <select class="inp" id="${px}-method" onchange="zp8MethodChange('${px}')">${opts.map(k=>`<option value="${k}"${k===sel?" selected":""}>${esc(zp8Name(k))}</option>`).join("")}</select>
    <div id="${px}-phone-w"${sel==="bank"?' style="display:none"':""}><label class="fl" for="${px}-phone">${esc(t("zp8_phone"))}</label><input class="inp" id="${px}-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="${esc(t("zp8_phone_ph"))}" maxlength="30"></div>
    <label class="fl" for="${px}-txn">${esc(t("zp8_txn_lbl"))}</label>
    <input class="inp" id="${px}-txn" placeholder="${esc(t("zp8_txn_ph"))}" autocomplete="off" maxlength="100">
    <label class="ab-proof-file"><input type="file" id="${px}-file" accept="image/*,application/pdf" onchange="abProofPicked('${px}')"><i class="ti ti-paperclip"></i> <span id="${px}-fname">${esc(t("ab_proof_pick"))}</span></label>
    <button type="button" class="btn btn-g" style="width:100%;min-height:46px" id="${px}-send" onclick="abSendProof('${esc(ref)}','${px}')"><i class="ti ti-send"></i> ${esc(t("zp8_send"))}</button>
    <div class="ab-small">${esc(t("ab_proof_note"))}</div></div>`;
};
function zp8MethodChange(px){const v=document.getElementById(px+"-method")?.value;const w=document.getElementById(px+"-phone-w");if(w)w.style.display=v==="bank"?"none":"";}
abSendProof=async function(ref,px){
  const g=id=>document.getElementById(px+id);
  const txn=(g("-txn")?.value||"").trim(),f=g("-file")?.files?.[0],method=g("-method")?.value||"bank",phone=(g("-phone")?.value||"").trim();
  if(txn.length<4){showToast(t("ab_proof_need_txn"),"error");return;}
  if(method!=="bank"&&!/^\+?[0-9][0-9 .\-]{5,22}$/.test(phone)){showToast(t("zp8_need_phone"),"error");return;}
  if(!f){showToast(t("ab_proof_need_file"),"error");return;}
  const btn=g("-send");if(btn)btn.disabled=true;
  try{
    const up=f.type.startsWith("image/")&&typeof compressImageFile==="function"?await compressImageFile(f,1800,0.85):f;
    const fd=new FormData();fd.append("file",up,up.name||f.name);fd.append("txn",txn);fd.append("method",method);fd.append("phone",method==="bank"?"":phone);
    await apiUpload(`/billing/wire/${encodeURIComponent(ref)}/proof`,fd);
    showToast(t("ab_proof_ok"));
    if(px==="wm")closeWireModal();
    _ab.offer=await api("GET","/billing/my-offer");abRender();
  }catch(e){showToast(e.message,"error");if(btn)btn.disabled=false;}
};

// ── Client : paiement partiel, « voir comment payer », reçus ──
const _zp8Status=abStatusHtml;
abStatusHtml=function(){
  let h=_zp8Status.apply(this,arguments);
  const pd=_ab.offer?.pending;
  if(pd){
    const extra=(pd.partial?`<div class="zp8-part"><i class="ti ti-clock-dollar" aria-hidden="true"></i><div><b>${esc(t("zp8_partial_t"))}</b><div>${esc(abTr("zp8_partial",{r:zp8Money(pd.received_usd),t:zp8Money(pd.amount_usd),l:zp8Money(pd.remaining_usd)}))}</div></div></div>`:"")
      +`<button type="button" class="btn btn-o btn-sm zp8-how" onclick="zp8HowTo('${escJs(pd.reference)}')"><i class="ti ti-wallet"></i> ${esc(t("zp8_howto"))}</button>`;
    h=h.replace(/(<div class="ab-banner wait">[\s\S]*?<div style="flex:1;min-width:0">)/,`$1${extra}`);
  }
  const R=ZP8.receipts||[];
  if(R.length)h+=`<div class="zp8-rcs"><div class="zp8-h">${esc(t("zp8_receipts"))}</div>${R.slice(0,12).map(r=>`<div class="zp8-rc"><i class="ti ti-receipt" aria-hidden="true"></i><div><b>${esc(abTr("zp8_receipt",{n:r.receipt_no}))}</b><small>${esc(fmtDate(r.paid_at))} · ${esc(zp8Money(r.amount_usd))}${r.refunded?" · "+esc(t("zp8_rc_refunded")):""}</small></div><button type="button" class="btn btn-o btn-sm" aria-label="${esc(t("zp8_dl"))}" onclick="zp8PrintReceipt('${escJs(r.receipt_no)}')"><i class="ti ti-download"></i></button></div>`).join("")}</div>`;
  return h;
};
const _zp8Load=abLoadBilling;
abLoadBilling=async function(){
  try{ZP8.receipts=await api("GET","/billing/receipts");}catch(_){ZP8.receipts=[];}
  return _zp8Load.apply(this,arguments);
};
function zp8ReceiptHtml(r){
  const kv=(a,b)=>b?`<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`:"";
  return `<div class="zp8-print"><div class="zp8-ph1"><div><b>Zenith Dash</b><small>zenithdash.org</small></div><div style="text-align:right"><b>${esc(t("zp8_rc_title"))}</b><small>${esc(abTr("zp8_receipt",{n:r.receipt_no}))}</small></div></div>
    <table>${kv(t("zp8_rc_customer"),[r.customer.company,r.customer.name,r.customer.email].filter(Boolean).join(" · "))}${kv(t("zp8_rc_paid"),fmtDate(r.paid_at))}
    ${kv(t("zp8_rc_period"),r.start&&r.end?`${fmtDate(r.start)} → ${fmtDate(r.end)}`:"")}${(r.lines||[]).map(l=>kv(l.sector,l.tier)).join("")}
    ${kv(t("zp8_rc_method"),r.pay_method_label==="Virement bancaire"?t("zp8_m_bank"):r.pay_method_label)}${kv(t("zp8_rc_txn"),r.txn)}${kv(t("zp8_ref"),r.reference)}</table>
    <div class="zp8-tot"><span>${esc(t("zp8_rc_amount"))}</span><b>${esc(zp8Money(r.amount_usd))}</b></div>${r.refunded?`<div class="zp8-ref-st">${esc(t("zp8_rc_refunded"))}</div>`:""}
    <p>${esc(t("zp8_rc_thanks"))}</p></div>`;
}
async function zp8PrintReceipt(no,adminRef){
  try{
    const r=adminRef?await api("GET",`/admin/receipts/${encodeURIComponent(adminRef)}`):await api("GET",`/billing/receipts/${encodeURIComponent(no)}`);
    let box=document.getElementById("zp8-print-box");if(!box){box=document.createElement("div");box.id="zp8-print-box";document.body.appendChild(box);}
    box.innerHTML=zp8ReceiptHtml(r);document.body.classList.add("zp8-printing");
    const old=document.title;document.title=`${r.receipt_no}`;
    const done=()=>{document.body.classList.remove("zp8-printing");document.title=old;window.removeEventListener("afterprint",done);};
    window.addEventListener("afterprint",done);setTimeout(()=>{window.print();setTimeout(done,1500);},80);
  }catch(e){showToast(e.message,"error");}
}

// ── Admin : page Paiements (« À vérifier » / « Reçus ») ──
function zp8AdmShell(){
  const box=document.getElementById("pending-wires-list");if(!box)return null;
  const card=box.closest(".card");
  if(card&&!card.dataset.zp8){
    card.dataset.zp8="1";
    const h=card.querySelector(".sh div");if(h)h.innerHTML=`<i class="ti ti-wallet"></i> Paiements`;
  }
  return box;
}
loadPendingWires=async function(){
  const box=zp8AdmShell();if(!box)return;
  const A=ZP8.adm;
  try{
    const [wires,pay]=await Promise.all([api("GET","/admin/pending-wires"+(A.q?`?q=${encodeURIComponent(A.q)}`:"")+(A.q?"&all=true":"")),api("GET","/admin/payments-received"+`?month=${encodeURIComponent(A.month||new Date().toISOString().slice(0,7))}`+(A.q?`&q=${encodeURIComponent(A.q)}`:""))]);
    A.data=wires;A.pay=pay;zp8AdmRender();
  }catch(e){box.innerHTML=`<div style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;}
};
function zp8AdmRender(){
  const box=zp8AdmShell();if(!box)return;const A=ZP8.adm;const W=(A.data||[]).filter(w=>A.q||w.proof);const P=A.pay||{rows:[]};
  const tab=(k,l)=>`<button type="button" role="tab" aria-selected="${A.tab===k}" class="${A.tab===k?"on":""}" onclick="ZP8.adm.tab='${k}';zp8AdmRender()">${l}</button>`;
  let h=`<div class="zp8-tabs zp8-atabs" role="tablist">${tab("check",`À vérifier · ${W.length}`)}${tab("paid","Reçus")}${tab("set","Numéros")}</div>`;
  if(A.tab!=="set")h+=`<div class="zp8-srch"><i class="ti ti-search" aria-hidden="true"></i><input class="inp" id="zp8-q" type="search" placeholder="Nom, référence, n° de transaction ou téléphone" value="${esc(A.q)}" aria-label="Rechercher un paiement" onkeydown="if(event.key==='Enter'){ZP8.adm.q=this.value.trim();loadPendingWires();}"><button type="button" class="btn btn-o btn-sm" onclick="ZP8.adm.q=document.getElementById('zp8-q').value.trim();loadPendingWires()">OK</button></div>`;
  if(A.tab==="check"){
    if(!W.length)h+=`<div class="zp8-empty">${A.q?"Aucune commande ne correspond.":"Aucune preuve de paiement à vérifier."}</div>`;
    h+=W.map(zp8WireCard).join("");
    h+=`<div class="zp8-hint">Vérifie dans ton historique M-Pesa, Orange, Airtel ou bancaire qu'un paiement de ce montant est arrivé avec ce n° de transaction, puis saisis ce que tu as vraiment reçu.</div>`;
  }else if(A.tab==="paid"){
    h+=`<div class="zp8-stats"><div><small>${esc(zp8MonthLabel(P.month))}</small><b>${esc(zp8Money(P.total_usd))}</b><small>${P.count} paiement${P.count>1?"s":""}${P.refunded_usd?` · ${esc(zp8Money(P.refunded_usd))} remboursés`:""}</small></div>
      <div><small>Fin dans 7 jours</small><b style="color:var(--amber)">${P.ending_7d||0}</b><small>à relancer</small></div></div>
      <div class="zp8-month"><button type="button" class="btn btn-o btn-sm" aria-label="Mois précédent" onclick="zp8Month(-1)"><i class="ti ti-chevron-left"></i></button><span>${esc(zp8MonthLabel(P.month))}</span><button type="button" class="btn btn-o btn-sm" aria-label="Mois suivant" onclick="zp8Month(1)"><i class="ti ti-chevron-right"></i></button></div>`;
    h+=(P.rows||[]).length?(P.rows||[]).map(zp8PaidRow).join(""):`<div class="zp8-empty">Aucun paiement reçu ce mois-ci.</div>`;
  }else h+=`<div id="zp8-set">Chargement…</div>`;
  box.innerHTML=h;
  if(A.tab==="set")zp8LoadSettings();
}
function zp8MonthLabel(m){if(!m)return "";const [y,mo]=m.split("-").map(Number);return new Date(y,mo-1,15).toLocaleDateString("fr-FR",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase());}
function zp8Month(d){const A=ZP8.adm;const cur=A.month||new Date().toISOString().slice(0,7);const [y,m]=cur.split("-").map(Number);const n=new Date(y,m-1+d,15);A.month=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;loadPendingWires();}
function zp8WireCard(w){
  const b=w.breakdown||{};const L=(a,v,cls)=>`<div class="zp8-l${cls?" "+cls:""}"><span>${esc(a)}</span><b>${esc(v)}</b></div>`;
  const rows=(b.rows||[]).map(r=>L(`${r.label.split(" /")[0]} · ${r.tier_label||r.tier}`,zp8Money(r.price))).join("")+(b.discounts||[]).map(d=>L(d.label,"−"+zp8Money(d.amount),"disc")).join("");
  const dup=(w.duplicates||[]).length?`<div class="zp8-dup" role="alert"><i class="ti ti-alert-triangle" aria-hidden="true"></i><span><b>N° de transaction déjà envoyé</b> pour ${w.duplicates.map(d=>`${esc(d.tenant_name)} (${esc(d.reference)}, ${d.status==="confirmed"?"déjà encaissé":"en attente"})`).join(", ")}. Vérifie avant de valider.</span></div>`:"";
  const proofs=(w.proofs||[]).map(p=>`<button type="button" class="zp8-pf" onclick="zp8OpenProof('${escJs(w.reference)}',${p.i})"><i class="ti ti-photo"></i><span><b>${esc(zp8Name(p.method||"bank"))}</b> · n° ${esc(p.txn||"—")}${p.phone?` · ${esc(p.phone)}`:""}<small>${esc(fmtDate(p.at))} · Voir la preuve</small></span></button>`).join("");
  const id="zp8a-"+w.reference.replace(/[^A-Za-z0-9]/g,"");
  return `<div class="zp8-card${(w.duplicates||[]).length?" bad":""}">
    <div class="zp8-top"><b>${esc(w.tenant_name)}</b><code>${esc(w.reference)}</code></div><small class="zp8-mut">${esc(w.tenant_email)}${w.tenant_rejects?` · ${w.tenant_rejects} preuve(s) refusée(s)`:""}</small>
    <div class="zp8-lines">${rows}${L(`Attendu · ${w.billing_label||""}`,zp8Money(w.amount_usd),"tot")}${w.received_usd>0?L("Déjà reçu",zp8Money(w.received_usd),"got")+L("Reste",zp8Money(w.remaining_usd),"tot"):""}</div>
    ${dup}${proofs}
    <div class="zp8-recv"><label class="fl" for="${id}">Montant reçu sur ton compte (USD)</label><input class="inp" id="${id}" type="number" inputmode="decimal" step="0.01" min="0.01" value="${w.remaining_usd||w.amount_usd}"></div>
    <div class="zp8-acts"><button type="button" class="btn btn-g" onclick="zp8Receive('${escJs(w.reference)}','${id}',${w.remaining_usd||w.amount_usd})"><i class="ti ti-circle-check"></i> Argent reçu · Activer</button>${w.received_usd>0?"":`<button type="button" class="btn btn-o" onclick="adminRejectWire('${escJs(w.reference)}')">Refuser</button>`}</div></div>`;
}
async function zp8OpenProof(ref,i){
  const win=window.open("about:blank","_blank");
  try{const r=await api("GET",`/admin/wires/${encodeURIComponent(ref)}/proofs/${i}`);if(win){win.opener=null;win.location.href=r.url;}else window.open(r.url,"_blank","noopener");}
  catch(e){if(win)win.close();showToast(e.message,"error");}
}
async function zp8Receive(ref,id,expected){
  const v=parseFloat(String(document.getElementById(id)?.value||"").replace(",","."));
  if(!(v>0)){showToast("Indique le montant reçu","error");return;}
  const msg=v+0.009>=expected?`Confirmer : ${zp8Money(v)} bien reçus pour ${ref} ?\nLes formules seront activées tout de suite.`:`Seulement ${zp8Money(v)} reçus sur ${zp8Money(expected)}.\nRien ne sera activé : le client sera prévenu qu'il manque ${zp8Money(expected-v)}.`;
  if(!confirm(msg))return;
  try{
    const r=await api("POST",`/admin/wires/${encodeURIComponent(ref)}/receive`,{amount_usd:Math.round(v*100)/100});
    showToast(r.activated?`Activé ✓ · reçu ${r.receipt_no}${r.excess_usd>0?` · trop-perçu ${zp8Money(r.excess_usd)}`:""}`:`Enregistré · il manque ${zp8Money(r.remaining_usd)}`);
    loadPendingWires();if(typeof loadAdminUsers==="function")loadAdminUsers();
  }catch(e){showToast(e.message,"error");}
}
function zp8PaidRow(p){
  const st={active:["Active","ok"],ending:["Fin le "+fmtDate(p.expires_at),"warn"],ended:["Terminée","mut"],refunded:["Remboursé · annulé","bad"]}[p.state]||["",""];
  const lab=Object.entries(p.selection||{}).map(([k,v])=>`${(typeof admSecName==="function"?admSecName(k):k)} ${v.charAt(0).toUpperCase()+v.slice(1)}`).join(" + ")||p.selection_label||"";
  return `<div class="zp8-paid"><div class="zp8-top"><b>${esc(p.tenant_name)}</b><b>${esc(zp8Money(p.amount_usd))}</b></div>
    <div class="zp8-top zp8-mut"><span>${esc(lab)} · ${esc(p.billing_label||"")} · ${esc(zp8Name(p.pay_method))}${p.manual?" · activé par toi":""}</span><span>${esc(fmtDate(p.confirmed_at))}</span></div>
    ${p.txn||p.phone?`<small class="zp8-mut">${p.txn?"n° "+esc(p.txn):""}${p.phone?" · "+esc(p.phone):""}${p.note?" · "+esc(p.note):""}</small>`:""}
    <div class="zp8-prow"><span class="zp8-st ${st[1]}">${esc(st[0])}</span><span class="zp8-pact">
      ${p.receipt_no?`<button type="button" class="btn btn-o btn-sm" onclick="zp8PrintReceipt(null,'${escJs(p.reference)}')"><i class="ti ti-receipt"></i> ${esc(p.receipt_no)}</button>`:""}
      ${p.state!=="refunded"?`<button type="button" class="btn btn-o btn-sm" onclick="zp8Activate('${escJs(p.tenant_id)}',${esc(JSON.stringify(JSON.stringify(p.selection||{})))},${p.months||1})"><i class="ti ti-plus"></i> Prolonger</button>
      <button type="button" class="btn btn-o btn-sm" onclick="zp8Cancel('${escJs(p.reference)}',${p.amount_usd})"><i class="ti ti-arrow-back-up"></i> Annuler</button>`:""}</span></div></div>`;
}
async function zp8Cancel(ref,amt){
  const note=prompt(`Annuler ce paiement de ${zp8Money(amt)} ?\nLa formule s'arrête et le client est prévenu que l'argent lui est rendu.\n\nMotif (gardé dans l'historique) :`,"Erreur de saisie");
  if(note===null)return;
  try{await api("POST",`/admin/wires/${encodeURIComponent(ref)}/refund`,{mode:"full",note:note.trim().slice(0,300)||null});showToast("Paiement annulé");loadPendingWires();if(typeof loadAdminUsers==="function")loadAdminUsers();}
  catch(e){showToast(e.message,"error");}
}

// ── Admin : numéros Mobile Money ──
async function zp8LoadSettings(){
  const box=document.getElementById("zp8-set");if(!box)return;
  try{
    const s=await api("GET","/admin/pay-settings");
    box.innerHTML=`<div class="zp8-hint" style="margin-top:0">Ces numéros s'affichent aux clients quand ils paient. Ce ne sont pas des clés secrètes.</div>`+ZP8_MOB.map(k=>{const m=s.mobile[k]||{};return `<div class="zp8-set">
      <label class="zp8-sw"><input type="checkbox" id="zp8-${k}-on" ${m.on?"checked":""}> <b>${esc(s.labels[k])}</b></label>
      <div class="zp8-two"><div><label class="fl" for="zp8-${k}-num">Numéro</label><input class="inp" id="zp8-${k}-num" type="tel" inputmode="tel" maxlength="30" value="${esc(m.number)}" placeholder="+243 …"></div>
      <div><label class="fl" for="zp8-${k}-name">Nom du compte</label><input class="inp" id="zp8-${k}-name" maxlength="60" value="${esc(m.name)}" placeholder="Zenith Dash"></div></div></div>`;}).join("")
      +`<button type="button" class="btn btn-g" style="width:100%;margin-top:6px" onclick="zp8SaveSettings()"><i class="ti ti-device-floppy"></i> Enregistrer</button>`;
  }catch(e){box.innerHTML=`<div style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;}
}
async function zp8SaveSettings(){
  const b={};ZP8_MOB.forEach(k=>{b[k]={on:!!document.getElementById(`zp8-${k}-on`)?.checked,number:(document.getElementById(`zp8-${k}-num`)?.value||"").trim(),name:(document.getElementById(`zp8-${k}-name`)?.value||"").trim()};});
  try{await api("PUT","/admin/pay-settings",b);showToast("Numéros enregistrés ✓");}catch(e){showToast(e.message,"error");}
}

// ── Admin : activer une formule payée pour un compte ──
async function zp8Activate(uid,selJson,months){
  try{
    await abCatalog();
    const u=(typeof _admUsers!=="undefined"?_admUsers:[]).find(x=>x.id===uid)||{};
    let sel={};try{sel=selJson?JSON.parse(selJson):{};}catch(_){}
    if(!Object.keys(sel).length){const own=[u.sector,...(u.sector_extra||[])].filter(Boolean);if(own[0])sel={[own[0]]:"pro"};}
    ZP8.act={uid,name:u.name||u.company_name||"",user:u,sel,months:months||1,method:"orange",amount:null,quote:null,edited:false};
    zp8ActRender();zp8ActQuote();
  }catch(e){showToast(e.message,"error");}
}
function zp8ActRender(){
  const a=ZP8.act;if(!a)return;const cat=_ab.cat||{sectors:[]};
  const secRow=s=>{const on=a.sel[s.key];return `<div class="zp8-sec"><label class="zp8-sw"><input type="checkbox" ${on?"checked":""} onchange="zp8ActSec('${s.key}',this.checked)"> <b>${esc(abSectorLabel(s.key))}</b></label>
    ${on?`<div class="zp8-tiers">${s.prices.map((p,i)=>p==null?`<span class="zp8-tier off">${esc(abTierLabel(i))}<small>—</small></span>`:`<button type="button" class="zp8-tier${on===AB_TIERS[i]?" on":""}" aria-pressed="${on===AB_TIERS[i]}" onclick="zp8ActTier('${s.key}','${AB_TIERS[i]}')">${esc(abTierLabel(i))}<small>${p} $</small></button>`).join("")}</div>`:""}</div>`;};
  const q=a.quote;const end=zp8ActEnd();
  zdModal("zp8-act",`<div class="modal-title"><i class="ti ti-credit-card" style="color:var(--green)"></i> Activer une formule payée</div>
    <div class="zp8-who"><span class="zp8-av">${esc((a.name.trim()[0]||"?").toUpperCase())}</span><div><b>${esc(a.name)}</b><small>${esc(a.user.email||"")}</small></div></div>
    <div class="zp8-h">Formules</div>${(cat.sectors||[]).map(secRow).join("")}
    <div class="zp8-h">Durée payée</div><div class="zp8-seg">${[1,3,6,12].map(n=>`<button type="button" class="${a.months===n?"on":""}" aria-pressed="${a.months===n}" onclick="ZP8.act.months=${n};zp8ActQuote()">${n===12?"1 an":n+" mois"}</button>`).join("")}</div>
    <div class="zp8-exp" id="zp8-exp">${q?`Montant attendu : <b>${esc(zp8Money(q.total))}</b>${q.sector_discount>0?` (remise ${q.sector_discount_pct} % incluse)`:""}`:(a.err?`<span style="color:var(--red)">${esc(a.err)}</span>`:"Choisis au moins une formule.")}</div>
    <div class="zp8-h">Paiement reçu</div><div class="zp8-meth">${["orange","mpesa","airtel","cash","bank","other"].map(k=>`<button type="button" class="${a.method===k?"on":""}" aria-pressed="${a.method===k}" onclick="ZP8.act.method='${k}';zp8ActRender()">${esc(zp8Name(k))}</button>`).join("")}</div>
    <div class="zp8-two"><div><label class="fl" for="zp8-amt">Montant reçu (USD)</label><input class="inp" id="zp8-amt" type="number" inputmode="decimal" step="0.01" min="0.01" value="${a.amount!=null?a.amount:(q?q.total:"")}" oninput="ZP8.act.amount=this.value;ZP8.act.edited=true"></div>
      <div><label class="fl" for="zp8-ref">N° de transaction</label><input class="inp" id="zp8-ref" maxlength="100" value="${esc(a.ref||"")}" oninput="ZP8.act.ref=this.value" placeholder="${a.method==="cash"?"Facultatif":"Ex. MP241117.1432.A82"}"></div></div>
    ${ZP8_MOB.includes(a.method)?`<label class="fl" for="zp8-ph">Téléphone qui a payé</label><input class="inp" id="zp8-ph" type="tel" inputmode="tel" maxlength="30" value="${esc(a.phone||"")}" oninput="ZP8.act.phone=this.value" placeholder="+243 …">`:""}
    <label class="fl" for="zp8-note">Note (facultatif)</label><input class="inp" id="zp8-note" maxlength="300" value="${esc(a.note||"")}" oninput="ZP8.act.note=this.value">
    ${q?`<div class="zp8-sum"><b>${esc(Object.entries(a.sel).map(([k,v])=>abShort(k)+" "+abTierLabel(AB_TIERS.indexOf(v))).join(" + "))}</b> actif jusqu'au ${esc(end)}. Le client reçoit une notification et un reçu.</div>`:""}
    <div class="modal-footer"><button type="button" class="btn btn-o" onclick="zdCloseModal('zp8-act')">Annuler</button><button type="button" class="btn btn-g" id="zp8-go" ${q?"":"disabled"} onclick="zp8ActGo()"><i class="ti ti-circle-check"></i> Activer et envoyer le reçu</button></div>`,520);
}
function zp8ActEnd(){
  const a=ZP8.act;const u=a.user||{};const now=new Date();let start=now;
  const cur=u.sub_expires_at?parseServerDate(u.sub_expires_at):null;
  const same=JSON.stringify(u.paid_sectors||{})===JSON.stringify(a.sel);
  if(cur&&cur>now&&same)start=cur;
  const d=new Date(start);const days=a.months===12?365:Math.round(a.months*365/12);d.setDate(d.getDate()+days);
  return d.toLocaleDateString("fr-FR");
}
function zp8ActSec(k,on){const a=ZP8.act;if(on){const s=(_ab.cat.sectors||[]).find(x=>x.key===k);const i=s?s.prices.findIndex(p=>p!=null):0;a.sel[k]=AB_TIERS[Math.max(0,i)];}else delete a.sel[k];zp8ActQuote();}
function zp8ActTier(k,v){ZP8.act.sel[k]=v;zp8ActQuote();}
async function zp8ActQuote(){
  const a=ZP8.act;a.err=null;
  if(!Object.keys(a.sel).length){a.quote=null;zp8ActRender();return;}
  try{a.quote=await api("POST",`/admin/users/${encodeURIComponent(a.uid)}/quote`,{selection:a.sel,billing_cycle:a.months===1?"monthly":"m"+a.months});
    if(a.quote&&(a.quote.nothing_to_pay||!a.quote.rows.length)){a.err="Ces formules sont déjà gratuites ou offertes pour ce compte : rien à payer.";a.quote=null;}
    if(!a.edited&&a.quote)a.amount=a.quote.total;}
  catch(e){a.quote=null;a.err=e.message;}
  zp8ActRender();
}
async function zp8ActGo(){
  const a=ZP8.act;if(!a||!a.quote)return;
  const amt=parseFloat(String(document.getElementById("zp8-amt")?.value||"").replace(",","."));
  if(!(amt>0)){showToast("Indique le montant reçu","error");return;}
  const phone=(document.getElementById("zp8-ph")?.value||"").trim();
  if(ZP8_MOB.includes(a.method)&&phone&&!/^\+?[0-9][0-9 .\-]{5,22}$/.test(phone)){showToast("Numéro de téléphone invalide","error");return;}
  const btn=document.getElementById("zp8-go");if(btn)btn.disabled=true;
  try{
    const r=await api("POST",`/admin/users/${encodeURIComponent(a.uid)}/manual-payment`,{selection:a.sel,months:a.months,amount_usd:Math.round(amt*100)/100,method:a.method,
      reference:(document.getElementById("zp8-ref")?.value||"").trim()||null,phone:phone||null,note:(document.getElementById("zp8-note")?.value||"").trim()||null});
    zdCloseModal("zp8-act");showToast(`Activé jusqu'au ${fmtDate(r.expires_at)} · reçu ${r.receipt_no}`);
    if(typeof loadAdminUsers==="function")loadAdminUsers();loadPendingWires();
  }catch(e){showToast(e.message,"error");if(btn)btn.disabled=false;}
}

// ── Admin : bouton « Activer » sur chaque compte, filtre « Fin dans 7 j » et recherche ──
let _zp8Search="";
if(typeof admRender==="function"){
  const _zp8Render=admRender;
  admRender=function(){
    _zp8Render.apply(this,arguments);
    const tb=document.getElementById("admin-users-tbody");if(!tb)return;
    tb.querySelectorAll("tr").forEach(tr=>{
      const btn=tr.querySelector('button[onclick^="abAdminOffer("]');if(!btn||tr.querySelector(".zp8-actbtn"))return;
      const id=(btn.getAttribute("onclick").match(/abAdminOffer\('([^']+)'\)/)||[])[1];if(!id)return;
      const b=document.createElement("button");b.type="button";b.className="btn btn-sm btn-g zp8-actbtn";b.innerHTML='<i class="ti ti-credit-card"></i> Activer';
      b.onclick=()=>zp8Activate(id,null,1);btn.parentNode.insertBefore(b,btn);
    });
  };
}
if(typeof admMatch==="function"){
  const _zp8Match=admMatch;
  admMatch=function(u){
    if(_zp8Search){const s=_zp8Search.toLowerCase();if(![u.name,u.email,u.company_name].some(x=>String(x||"").toLowerCase().includes(s)))return false;}
    if(_admFilter==="end7"){const e=u.sub_expires_at?parseServerDate(u.sub_expires_at):null;const now=new Date();return u.status_key==="sub"&&e&&e>now&&e-now<=7*86400000;}
    return _zp8Match.apply(this,arguments);
  };
}
if(typeof admFilters==="function"){
  const _zp8Filters=admFilters;
  admFilters=function(){
    _zp8Filters.apply(this,arguments);
    const f=document.getElementById("adm-filters");if(!f)return;
    const n=(_admUsers||[]).filter(u=>{const e=u.sub_expires_at?parseServerDate(u.sub_expires_at):null;const now=new Date();return u.status_key==="sub"&&e&&e>now&&e-now<=7*86400000;}).length;
    const chip=document.createElement("button");chip.type="button";chip.className="adm-chip"+(_admFilter==="end7"?" on":"");chip.setAttribute("aria-pressed",_admFilter==="end7");
    chip.innerHTML=`Fin dans 7 j <em>${n}</em>`;chip.onclick=()=>{_admFilter="end7";admRender();};
    const sel=f.querySelector("#adm-sector");f.insertBefore(chip,sel||null);
    if(!document.getElementById("zp8-usr-q")){
      const w=document.createElement("div");w.className="zp8-srch zp8-usrq";
      w.innerHTML=`<i class="ti ti-search" aria-hidden="true"></i><input class="inp" id="zp8-usr-q" type="search" placeholder="Rechercher un compte (nom, e-mail, entreprise)" aria-label="Rechercher un compte">`;
      f.parentNode.insertBefore(w,f);
      const inp=w.querySelector("input");inp.value=_zp8Search;
      inp.addEventListener("input",()=>{_zp8Search=inp.value.trim();admRender();setTimeout(()=>{const i=document.getElementById("zp8-usr-q");if(i&&document.activeElement!==i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},0);});
    }
  };
}
