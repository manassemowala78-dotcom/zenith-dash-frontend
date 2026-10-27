// ── 9.7.0 · Paiement automatique par carte, PayPal, Apple Pay, Google Pay (Paddle) ──
const PD={cfg:null,lib:null,ready:false,sub:null,method:"card",txn:null,mode:"pay",done:false,poll:null};
const PD_METHOD_LABEL={card:"Carte",paypal:"PayPal",apple_pay:"Apple Pay",google_pay:"Google Pay"};
function pdOn(){return !!(State.tenant&&State.tenant.card_payments);}
function pdLocale(){const l=State.lang||"fr";return ["fr","en","es","ar"].includes(l)?l:"fr";}
function pdLoadLib(){
  if(window.Paddle)return Promise.resolve(window.Paddle);
  if(PD.lib)return PD.lib;
  PD.lib=new Promise((res,rej)=>{
    const s=document.createElement("script");s.src="https://cdn.paddle.com/paddle/v2/paddle.js";
    s.onload=()=>window.Paddle?res(window.Paddle):rej(new Error(t("pd_load_fail")));
    s.onerror=()=>{PD.lib=null;rej(new Error(t("pd_load_fail")));};
    document.head.appendChild(s);
  });
  return PD.lib;
}
async function pdInit(token,env){
  const P=await pdLoadLib();
  if(!PD.ready){if(env==="sandbox"&&P.Environment)P.Environment.set("sandbox");P.Initialize({token,eventCallback:pdEvent});PD.ready=true;}
  return P;
}
function pdOpen(P,txn,email){
  const o={transactionId:txn,settings:{displayMode:"overlay",theme:"light",locale:pdLocale(),allowLogout:false}};
  if(email)o.customer={email};
  P.Checkout.open(o);
}
function pdEvent(ev){
  const n=ev&&ev.name;
  if(n==="checkout.completed")pdCompleted();
  else if(n==="checkout.error")showToast(t("pd_error"),"error");
}

// Le choix du moyen de paiement dans le récapitulatif
function pdPick(m){PD.method=m;abRenderSummary();}
function pdSummary(){
  const box=document.getElementById("ab-sum"),q=_ab.quote;
  if(!box||!q||q.nothing_to_pay||!pdOn()||(_ab.offer&&_ab.offer.is_company))return;
  const btn=box.querySelector('button[onclick="abSubscribe()"]');if(!btn)return;
  const note=btn.nextElementSibling;
  const card=PD.method==="card";
  const wrap=document.createElement("div");wrap.className="pd-choose";
  wrap.innerHTML=`<div class="pd-cap">${esc(t("pd_how"))}</div>
    <label class="pd-opt${card?" on":""}"><input type="radio" name="pd-m" value="card" ${card?"checked":""} onchange="pdPick('card')"><span><b><i class="ti ti-credit-card" aria-hidden="true"></i> ${esc(t("pd_card"))}<em>${esc(t("pd_instant"))}</em></b><small>${esc(t("pd_card_x"))}</small></span></label>
    <label class="pd-opt${card?"":" on"}"><input type="radio" name="pd-m" value="wire" ${card?"":"checked"} onchange="pdPick('wire')"><span><b><i class="ti ti-building-bank" aria-hidden="true"></i> ${esc(t("pd_wire"))}</b><small>${esc(t("pd_wire_x"))}</small></span></label>
    <button type="button" class="btn btn-g pd-go" id="pd-go" onclick="pdGo()"><i class="ti ${card?"ti-lock":"ti-building-bank"}" aria-hidden="true"></i> ${esc(abTr("pd_pay_amount",{a:abMoney(q.total)}))}</button>
    <div class="pd-note">${esc(card?t("pd_card_note"):t("ab_pay_note"))}</div>`;
  btn.replaceWith(wrap);if(note)note.remove();
}
if(typeof abRenderSummary==="function"){
  const _pdARS=abRenderSummary;
  abRenderSummary=function(){const r=_pdARS.apply(this,arguments);try{pdSummary();}catch(_){}return r;};
}
function pdGo(){if(PD.method==="card")pdPay();else abSubscribe();}
async function pdPay(){
  const q=_ab.quote;if(!q||q.nothing_to_pay)return;
  const b=document.getElementById("pd-go");if(b)b.disabled=true;
  try{
    const lib=pdLoadLib();lib.catch(()=>{});
    const r=await api("POST","/billing/card/checkout",{selection:_ab.sel,billing_cycle:_ab.cycle});
    PD.txn=r.transaction_id;PD.mode="pay";PD.done=false;PD.amount=r.amount_usd;PD.label=r.label;
    const P=await pdInit(r.client_token,r.environment);
    pdOpen(P,r.transaction_id,r.email);
  }catch(e){showToast(e.message,"error");}
  finally{if(b)b.disabled=false;}
}
function pdCompleted(){
  if(PD.mode!=="pay"){setTimeout(()=>{try{window.Paddle&&window.Paddle.Checkout.close();}catch(_){}showToast(t("pd_card_updated"));pdReload();},1800);return;}
  if(PD.done)return;PD.done=true;
  setTimeout(()=>{try{window.Paddle&&window.Paddle.Checkout.close();}catch(_){}pdWait();},1500);
}
function pdWait(){
  zdModal("modal-pd",`<div class="pd-wait" role="status"><div class="pd-spin" aria-hidden="true"></div><div class="modal-title" style="justify-content:center">${esc(t("pd_wait_t"))}</div><div class="pd-sub">${esc(t("pd_wait_x"))}</div></div>`,420);
  const ov=document.getElementById("modal-pd");if(ov)ov.dataset.sticky="1";
  let n=0;clearInterval(PD.poll);
  PD.poll=setInterval(async()=>{
    n++;
    try{
      const s=await api("GET",`/billing/card/status?txn=${encodeURIComponent(PD.txn)}`);
      if(s.status==="paid"){clearInterval(PD.poll);pdDone(s);return;}
    }catch(_){}
    if(n>=45){clearInterval(PD.poll);pdSlow();}
  },2000);
}
async function pdDone(s){
  try{const fresh=await api("GET","/profile/");if(fresh){State.tenant={...State.tenant,...fresh};localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));}}catch(_){}
  zdModal("modal-pd",`<div class="pd-done"><div class="pd-ok" aria-hidden="true"><i class="ti ti-check"></i></div>
    <div class="modal-title" style="justify-content:center">${esc(t("pd_done_t"))}</div>
    <div class="pd-sub">${esc(t("pd_done_x"))}</div>
    <div class="pd-recap"><div><span>${esc(t("pd_formula"))}</span><b>${esc(s.label||PD.label||"")}</b></div><div><span>${esc(t("pd_paid"))}</span><b>${esc(abMoney(s.amount_usd||PD.amount||0))}</b></div>${s.expires_at?`<div><span>${esc(t("pd_until"))}</span><b>${esc(abDate(s.expires_at))}</b></div>`:""}</div>
    <button type="button" class="btn btn-g" style="width:100%;margin-top:14px" onclick="pdFinish()">${esc(t("pd_done_go"))}</button></div>`,420);
}
function pdSlow(){
  zdModal("modal-pd",`<div class="pd-done"><div class="modal-title" style="justify-content:center">${esc(t("pd_slow_t"))}</div><div class="pd-sub">${esc(t("pd_slow_x"))}</div>
    <button type="button" class="btn btn-o" style="width:100%;margin-top:14px" onclick="zdCloseModal('modal-pd');pdReload()">${esc(t("btn_close")!=="btn_close"?t("btn_close"):"OK")}</button></div>`,420);
}
function pdFinish(){zdCloseModal("modal-pd");window.location.href=window.location.pathname+"?p=dashboard";}
async function pdReload(){try{if(typeof abLoadBilling==="function")await abLoadBilling();}catch(_){}}

// L'abonnement par carte en cours : prochain prélèvement, changer de carte, reçus, arrêter
if(typeof abLoadBilling==="function"){
  const _pdALB=abLoadBilling;
  abLoadBilling=async function(){
    if(pdOn()){try{PD.sub=(await api("GET","/billing/card/subscription")).subscription;}catch(_){PD.sub=null;}}
    return _pdALB.apply(this,arguments);
  };
}
function pdSubHtml(){
  const s=PD.sub;if(!s)return"";
  const m=(PD_METHOD_LABEL[s.method]||s.method_label||t("pd_card"))+(s.card_last4?` •••• ${s.card_last4}`:"");
  if(s.status==="canceling")return `<div class="ab-banner wait pd-sub-b"><i class="ti ti-player-pause"></i><div style="flex:1;min-width:0"><b>${esc(t("pd_stopped_t"))}</b><div>${esc(abTr("pd_stopped_x",{d:s.cancel_at?abDate(s.cancel_at):"—"}))}</div>
    <div class="pd-acts"><button type="button" class="btn btn-g btn-sm" onclick="pdResume()">${esc(t("pd_resume"))}</button><button type="button" class="btn btn-o btn-sm" onclick="pdPortal()">${esc(t("pd_receipts"))}</button></div></div></div>`;
  const bad=s.status==="past_due";
  return `<div class="ab-banner ${bad?"bad":"ok"} pd-sub-b"><i class="ti ${bad?"ti-alert-triangle":"ti-refresh"}"></i><div style="flex:1;min-width:0"><b>${esc(t(bad?"pd_past_due_t":"pd_auto_t"))}</b>
    <div>${esc(bad?t("pd_past_due_x"):abTr("pd_auto_x",{m,d:s.next_billed_at?abDate(s.next_billed_at):"—",a:abMoney(s.amount_usd)}))}</div>
    <div class="pd-acts"><button type="button" class="btn ${bad?"btn-g":"btn-o"} btn-sm" onclick="pdUpdateCard()"><i class="ti ti-credit-card"></i> ${esc(t("pd_change_card"))}</button>
    <button type="button" class="btn btn-o btn-sm" onclick="pdPortal()"><i class="ti ti-file-invoice"></i> ${esc(t("pd_receipts"))}</button>
    ${bad?"":`<button type="button" class="btn btn-o btn-sm pd-stop" onclick="pdCancel()">${esc(t("pd_stop"))}</button>`}</div></div></div>`;
}
if(typeof abStatusHtml==="function"){
  const _pdASH=abStatusHtml;
  abStatusHtml=function(){return pdSubHtml()+_pdASH.apply(this,arguments);};
}
async function pdUpdateCard(){
  try{const r=await api("POST","/billing/card/update-payment");PD.mode="update";const P=await pdInit(r.client_token,r.environment);pdOpen(P,r.transaction_id);}
  catch(e){showToast(e.message,"error");}
}
async function pdPortal(){
  const w=window.open("about:blank","_blank");
  try{const r=await api("POST","/billing/card/portal");if(w)w.location.href=r.url;else window.location.href=r.url;}
  catch(e){if(w)w.close();showToast(e.message,"error");}
}
async function pdCancel(){
  const s=PD.sub;if(!s)return;
  if(!confirm(abTr("pd_stop_confirm",{d:s.next_billed_at?abDate(s.next_billed_at):"—"})))return;
  try{PD.sub=(await api("POST","/billing/card/cancel")).subscription;showToast(t("pd_stop_done"));abRender();}
  catch(e){showToast(e.message,"error");}
}
async function pdResume(){
  try{PD.sub=(await api("POST","/billing/card/resume")).subscription;showToast(t("pd_resume_done"));abRender();}
  catch(e){showToast(e.message,"error");}
}

// ── Admin : paiements automatiques ──
let _pay=null;
async function payAdminLoad(){
  const box=document.getElementById("pay-admin");if(!box||!State.tenant?.is_creator)return;
  try{_pay=await api("GET","/admin/payments");payAdminRender();}catch(_){box.innerHTML="";}
}
function payAdminRender(){
  const box=document.getElementById("pay-admin");if(!box||!_pay)return;
  const p=_pay,m=p.month||{};
  const kinds={paid:["Payé · activé","g"],renewed:["Renouvelé · prolongé","b"],failed:["Carte refusée · client prévenu","a"],canceling:["Renouvellement arrêté par le client","m"],canceled:["Abonnement terminé","m"],refunded:["Remboursé · abonnement arrêté","m"],wire:["Virement confirmé · activé","g"]};
  const money=v=>v==null?'<span class="adm-mut">—</span>':`${Number(v).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})} $`;
  box.innerHTML=`<div class="card pay-card">
    <div class="pay-head"><div><div style="font-weight:800;font-size:15px"><i class="ti ti-credit-card" style="color:var(--green)"></i> Paiements automatiques</div>
      <div class="fa-st">Carte, PayPal, Apple Pay et Google Pay par Paddle. Chaque paiement réussi active ou prolonge l'abonnement tout seul.</div></div>
      <span class="pay-chip ${p.enabled?"on":""}"><span></span>${p.enabled?(p.environment==="sandbox"?"Paddle connecté · mode test":"Paddle connecté · paiements réels"):"Paddle pas encore connecté"}</span></div>
    ${p.enabled?"":`<div class="pay-setup">Pour l'activer : crée ton compte Paddle, choisis Payoneer comme versement, puis ajoute dans Railway les variables <b>PADDLE_API_KEY</b>, <b>PADDLE_CLIENT_TOKEN</b> et <b>PADDLE_WEBHOOK_SECRET</b>. L'adresse de notification à donner à Paddle : <code>https://zenith-dash-production.up.railway.app/v1/webhooks/paddle</code></div>`}
    <div class="pay-tiles">
      <div><span>Encaissé ce mois (carte et PayPal)</span><b>${money(m.gross_usd)}</b><small>${m.payments||0} paiement${(m.payments||0)>1?"s":""}</small></div>
      <div><span>Frais Paddle</span><b class="a">${money(m.fee_usd)}</b></div>
      <div><span>Net pour toi</span><b class="g">${money(m.net_usd)}</b></div>
      <div><span>Prochain versement sur Payoneer</span><b class="b">vers le ${fmtDate(p.next_payout)}</b><small>une fois par mois, dès 100 $ · ${p.active_subscriptions} abonnement${p.active_subscriptions>1?"s":""} actif${p.active_subscriptions>1?"s":""}</small></div>
    </div>
    <div class="table-wrap"><table class="pay-table"><thead><tr><th>Date</th><th>Compte</th><th>Formule</th><th>Moyen</th><th>Montant</th><th>Frais</th><th>Net</th><th>Résultat</th></tr></thead>
      <tbody>${(p.rows||[]).length?p.rows.map(r=>{const k=kinds[r.kind]||[r.kind,"m"];return `<tr><td class="adm-num">${fmtDate(r.at)}</td><td><b>${esc(r.account)}</b></td><td>${esc(r.label||"—")}</td><td>${esc(r.method_label||"—")}</td><td class="adm-num">${money(r.amount_usd)}</td><td class="adm-num">${money(r.fee_usd)}</td><td class="adm-num">${money(r.net_usd)}</td><td><span class="pay-k ${k[1]}">${esc(k[0])}</span></td></tr>`;}).join(""):`<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:18px">Aucun paiement pour l'instant.</td></tr>`}</tbody></table></div>
    <small class="cm-hint">Remboursement : depuis ton espace Paddle. L'abonnement payé par ce paiement s'arrête alors tout seul. Les virements restent confirmés à la main comme aujourd'hui.</small>
  </div>`;
}
if(typeof loadAdminUsers==="function"){
  const _payLAU=loadAdminUsers;
  loadAdminUsers=async function(){const r=await _payLAU.apply(this,arguments);try{payAdminLoad();}catch(_){}return r;};
}
