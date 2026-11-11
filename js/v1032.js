// ── 10.3.2 · Politique de remboursement (Paddle) ──
const RF_URL="/legal/remboursement.html";
function rfLink(){return `<a href="${RF_URL}" target="_blank" rel="noopener">${esc(t("rf_ld_link"))}</a>`;}
function rfCardOn(){return !!((typeof _landingPlans!=="undefined"&&_landingPlans&&_landingPlans.card_payments)||(State.tenant&&State.tenant.card_payments));}

if(typeof renderLandingPricing==="function"){
  const _rfRLP=renderLandingPricing;
  renderLandingPricing=function(){
    const r=_rfRLP.apply(this,arguments);
    try{
      const box=document.getElementById("ld-plans");
      if(box&&box.innerHTML&&!box.querySelector(".rf-note")){
        let h="";
        if(rfCardOn())h+=`<div class="ld-pnote rf-note rf-card"><i class="ti ti-credit-card"></i> <span>${esc(t("rf_ld_card"))}</span></div>`;
        h+=`<div class="ld-pnote rf-note"><i class="ti ti-shield-check"></i> <span>${esc(t("rf_ld_note"))} ${rfLink()}</span></div>`;
        box.insertAdjacentHTML("beforeend",h);
      }
      rfFaqExtras();
    }catch(_){}
    return r;
  };
}

function rfFaqExtras(){
  const faq=document.getElementById("ld-faq");if(!faq)return;
  const items=faq.querySelectorAll("details.help-item:not(.rf-faq)");
  if(rfCardOn()&&items[1]){const b=items[1].querySelector(".help-body");if(b&&!b.querySelector(".rf-a2"))b.insertAdjacentHTML("beforeend",` <span class="rf-a2">${esc(t("rf_ld_a2_card"))}</span>`);}
  if(!faq.querySelector(".rf-faq")){
    const last=items[items.length-1];
    const d=`<details class="help-item rf-faq"><summary>${esc(t("rf_ld_q"))}</summary><div class="help-body">${esc(t("rf_ld_a"))} ${rfLink()}</div></details>`;
    if(last)last.insertAdjacentHTML("afterend",d);else faq.insertAdjacentHTML("beforeend",d);
  }
}
if(typeof renderLanding==="function"){
  const _rfRL=renderLanding;
  renderLanding=function(){
    const r=_rfRL.apply(this,arguments);
    try{rfFaqExtras();}catch(_){}
    return r;
  };
}

if(typeof abRenderSummary==="function"){
  const _rfARS=abRenderSummary;
  abRenderSummary=function(){
    const r=_rfARS.apply(this,arguments);
    try{
      const box=document.getElementById("ab-sum"),q=_ab.quote;
      if(box&&q&&!q.nothing_to_pay&&!box.querySelector(".rf-ab"))
        box.insertAdjacentHTML("beforeend",`<div class="rf-ab"><i class="ti ti-shield-check" aria-hidden="true"></i> <span>${esc(t("rf_ab_note"))} ${rfLink()}</span></div>`);
    }catch(_){}
    return r;
  };
}

// ── Admin : rembourser un virement ──
function rfWireRefundBtn(el){rfWireRefundOpen(el.dataset.ref,el.dataset.amt,el.dataset.acc,Number(el.dataset.days)||0);}
let _rfRef=null;
function rfWireRefundOpen(ref,amount,account,days){
  _rfRef=ref;
  const amt=Number(amount)||0;
  zdModal("modal-rf-wire",`<div class="modal-title"><i class="ti ti-receipt-refund" style="color:var(--green)"></i> Rembourser un virement</div>
    <div style="font-size:13px;line-height:1.6;margin-bottom:12px"><b>${esc(account)}</b> · référence <code>${esc(ref)}</code> · ${amt.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})} $<br><span style="color:var(--muted)">Confirmé il y a ${days} jour${days>1?"s":""}${days>14?" · la garantie de 14 jours est dépassée":""}.</span></div>
    <label class="pd-opt on" style="margin-bottom:8px"><input type="radio" name="rf-mode" value="full" checked onchange="rfWireMode()"><span><b>Remboursement complet</b><small>Garantie de 14 jours : tout le montant est rendu et l'abonnement payé par ce virement s'arrête tout de suite. Les données du compte sont conservées.</small></span></label>
    <label class="pd-opt"><input type="radio" name="rf-mode" value="excess" onchange="rfWireMode()"><span><b>Excédent seulement</b><small>Argent envoyé en trop : seul ce montant est rendu, l'abonnement continue.</small></span></label>
    <div class="fgrp" id="rf-amt-wrap" style="display:none;margin-top:10px"><label class="fl" for="rf-amt">Montant à rendre (USD)</label><input class="inp" id="rf-amt" type="number" min="0.01" step="0.01" max="${amt}" inputmode="decimal"></div>
    <div class="fgrp" style="margin-top:10px"><label class="fl" for="rf-note">Note (facultative, visible par toi seul)</label><input class="inp" id="rf-note" maxlength="300" placeholder="Ex. : virement retour fait le 05/11 depuis Rawbank"></div>
    <div class="err-box" id="rf-err"></div>
    <div style="font-size:12px;color:var(--muted);margin:8px 0 4px">Zenith Dash enregistre le remboursement et prévient le client. Le virement retour, tu le fais toi-même depuis ta banque.</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-rf-wire')">Annuler</button><button class="btn btn-g btn-sm" id="rf-go" onclick="rfWireRefundGo()"><i class="ti ti-check"></i> Enregistrer le remboursement</button></div>`,480);
}
function rfWireMode(){
  const m=document.querySelector('input[name="rf-mode"]:checked')?.value;
  document.querySelectorAll('#modal-rf-wire .pd-opt').forEach(l=>l.classList.toggle("on",!!l.querySelector("input:checked")));
  const w=document.getElementById("rf-amt-wrap");if(w)w.style.display=m==="excess"?"block":"none";
}
async function rfWireRefundGo(){
  const ref=_rfRef;if(!ref)return;
  const mode=document.querySelector('input[name="rf-mode"]:checked')?.value||"full";
  const body={mode,note:(document.getElementById("rf-note")?.value||"").trim()||null};
  if(mode==="excess"){
    const v=parseFloat(String(document.getElementById("rf-amt")?.value||"").replace(",","."));
    if(!(v>0)){showErr("rf-err","Indique le montant à rendre.");return;}
    body.amount_usd=v;
  }
  const b=document.getElementById("rf-go");if(b)b.disabled=true;
  try{
    await api("POST",`/admin/wires/${encodeURIComponent(ref)}/refund`,body);
    zdCloseModal("modal-rf-wire");showToast(mode==="full"?"Remboursement enregistré · abonnement arrêté":"Excédent enregistré");
    if(typeof payAdminLoad==="function")payAdminLoad();
  }catch(e){showErr("rf-err",e.message);}
  finally{if(b)b.disabled=false;}
}
if(typeof payAdminRender==="function"){
  const _rfPAR=payAdminRender;
  payAdminRender=function(){
    const r=_rfPAR.apply(this,arguments);
    try{
      const box=document.getElementById("pay-admin");if(!box||!_pay)return r;
      const rows=box.querySelectorAll(".pay-table tbody tr");
      (_pay.rows||[]).forEach((row,i)=>{
        const tr=rows[i];if(!tr)return;
        if(row.method==="wire"&&tr.children[3])tr.children[3].textContent="Virement";
        if(row.kind==="refund_part"){const k=tr.querySelector(".pay-k");if(k){k.textContent="Excédent rendu";k.className="pay-k m";}}
        if(row.kind!=="wire"||!row.ref)return;
        const cell=tr.lastElementChild;if(!cell)return;
        if(row.refunded){cell.insertAdjacentHTML("beforeend",` <span class="pay-k m">Remboursé</span>`);return;}
        const days=Math.max(0,Math.floor((Date.now()-new Date(row.at).getTime())/86400000));
        cell.insertAdjacentHTML("beforeend",` <button type="button" class="btn btn-o btn-sm rf-btn" data-ref="${esc(row.ref)}" data-amt="${Number(row.amount_usd)||0}" data-acc="${esc(row.account||"")}" data-days="${days}" onclick="rfWireRefundBtn(this)"><i class="ti ti-receipt-refund"></i> Rembourser</button>`);
      });
      const hint=box.querySelector(".cm-hint");
      if(hint)hint.innerHTML="Remboursement par carte ou PayPal : depuis ton espace Paddle (Transactions → Refund). L'abonnement s'arrête tout seul et ne se renouvelle plus. Remboursement d'un virement : bouton « Rembourser » sur la ligne, puis fais le virement retour depuis ta banque. Garantie : 14 jours après le premier paiement (<a href=\"/legal/remboursement.html\" target=\"_blank\" rel=\"noopener\">politique de remboursement</a>).";
    }catch(_){}
    return r;
  };
}
