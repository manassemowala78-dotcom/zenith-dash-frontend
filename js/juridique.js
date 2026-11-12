const LEGAL_PAGES=[["legal_mentions","/legal/mentions-legales.html"],["legal_terms","/legal/conditions-generales.html"],["legal_privacy","/legal/confidentialite.html"],["legal_refund","/legal/remboursement.html"]];
function legalLinksInner(){return LEGAL_PAGES.map(([k,u])=>`<a href="${u}" target="_blank" rel="noopener">${esc(t(k))}</a>`).join('<span aria-hidden="true">·</span>');}
function legalLinksHtml(){return `<div class="legal-links">${legalLinksInner()}</div>`;}
function renderLegalLinks(){
  ["auth-legal-links","terms-update-links","profile-legal-links"].forEach(id=>{const b=document.getElementById(id);if(b)b.innerHTML=legalLinksInner();});
}
function initRegisterBirthLimit(){
  const e=document.getElementById("reg-birth");if(!e)return;
  const d=new Date();d.setFullYear(d.getFullYear()-18);e.max=d.toISOString().slice(0,10);
}
function zdTermsMiss(boxId,errId){
  const c=document.getElementById(boxId);if(!c)return;
  const row=c.closest(".terms-check");
  if(row){row.classList.remove("terms-missing");void row.offsetWidth;row.classList.add("terms-missing");
    let h=row.nextElementSibling;if(!h||!h.classList.contains("terms-warn")){h=document.createElement("div");h.className="terms-warn";h.setAttribute("role","alert");row.after(h);}
    h.textContent=t("terms_tick_first");
    try{row.scrollIntoView({block:"center",behavior:"smooth"});}catch(_){}}
  try{navigator.vibrate&&navigator.vibrate(80);}catch(_){}
  try{c.focus({preventScroll:true});}catch(_){}
}
function zdTermsSync(boxId,btnId,errId){
  const c=document.getElementById(boxId),b=document.getElementById(btnId);if(!c||!b)return;
  const on=!!c.checked;
  b.classList.toggle("zd-need-terms",!on);b.setAttribute("aria-disabled",on?"false":"true");
  if(on){const row=c.closest(".terms-check");row?.classList.remove("terms-missing");
    const h=row?.nextElementSibling;if(h&&h.classList.contains("terms-warn"))h.remove();
    const e=errId&&document.getElementById(errId);if(e&&e.textContent===t("terms_required")){e.textContent="";e.style.display="none";}}
}
function zdTermsGate(boxId,btnId,errId){
  const c=document.getElementById(boxId),b=document.getElementById(btnId);if(!c||!b||b.dataset.termsGate)return;
  b.dataset.termsGate="1";
  c.addEventListener("change",()=>zdTermsSync(boxId,btnId,errId));
  b.addEventListener("click",ev=>{if(!c.checked){ev.preventDefault();ev.stopImmediatePropagation();zdTermsMiss(boxId,errId);}},true);
  const f=b.closest("form");
  if(f)f.addEventListener("submit",ev=>{if(!c.checked){ev.preventDefault();ev.stopImmediatePropagation();zdTermsMiss(boxId,errId);}},true);
  zdTermsSync(boxId,btnId,errId);
}
function registerTermsOk(){
  const c=document.getElementById("reg-terms");
  if(c&&!c.checked){zdTermsMiss("reg-terms","reg-err");return false;}
  c?.closest(".terms-check")?.classList.remove("terms-missing");
  return true;
}
function inviteTermsOk(){
  const c=document.getElementById("invite-terms");
  if(c&&!c.checked){zdTermsMiss("invite-terms","invite-accept-err");return false;}
  return true;
}
function registerBirthValue(){
  const v=(document.getElementById("reg-birth")?.value||"").trim();
  return v||null;
}
function checkTermsAcceptance(user){
  try{if(State.tenant&&State.tenant.terms_required){State.tenant.terms_required=false;localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));}}catch(_){}
  const m=document.getElementById("modal-terms-update");if(m)m.style.display="none";
}
function closeTermsModal(){const m=document.getElementById("modal-terms-update");if(m)m.style.display="none";}
async function acceptCurrentTerms(){
  const c=document.getElementById("terms-update-check");
  if(c&&!c.checked){showErr("terms-update-err",t("terms_required"));return;}
  const btn=document.getElementById("terms-update-btn");if(btn)btn.disabled=true;
  try{
    const r=await api("POST","/auth/accept-terms");
    if(State.tenant){State.tenant.terms_required=false;State.tenant.terms_accepted_version=r.terms_version;try{localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));}catch(_){}}
    closeTermsModal();showToast(t("terms_thanks"));
    setTimeout(()=>{try{if(!checkSectorPrompt())startTour(false);}catch(_){}},800);
  }catch(e){showErr("terms-update-err",e.message);}
  finally{if(btn)btn.disabled=false;}
}
function openShopTerms(){
  const d=_shop.data||{};
  document.getElementById("shop-terms-body").textContent=d.terms||"";
  document.getElementById("modal-shop-terms").style.display="flex";
}
function shopLegalFooterHtml(d){
  const seller=[d.name,d.address,d.phone,d.tax_number?`${t("shop_tax_number")} ${d.tax_number}`:null].filter(Boolean).map(esc).join(" · ");
  return `<div class="shop-legal"><div>${t("shop_seller")} : ${seller}</div>${d.terms?`<a href="#" onclick="event.preventDefault();openShopTerms()">${t("shop_terms_link_cap")}</a> · `:""}<span>${t("shop_powered")}</span> · <a href="/legal/mentions-legales.html" target="_blank" rel="noopener">${t("legal_mentions")}</a></div>`;
}
const PUBLIC_VIEWS=["booking-view","staff-view","portal-view"];
function syncPublicLegalFooter(){
  const f=document.getElementById("public-legal-footer");if(!f)return;
  const on=PUBLIC_VIEWS.some(id=>{const e=document.getElementById(id);return e&&e.style.display&&e.style.display!=="none";});
  f.style.display=on?"flex":"none";if(on)f.innerHTML=legalLinksInner();
}
document.addEventListener("DOMContentLoaded",()=>{
  renderLegalLinks();initRegisterBirthLimit();
  zdTermsGate("reg-terms","reg-btn","reg-err");zdTermsGate("invite-terms","invite-accept-btn","invite-accept-err");
  const obs=new MutationObserver(syncPublicLegalFooter);
  PUBLIC_VIEWS.forEach(id=>{const e=document.getElementById(id);if(e)obs.observe(e,{attributes:true,attributeFilter:["style"]});});
  syncPublicLegalFooter();
});
document.addEventListener("click",()=>setTimeout(()=>{zdTermsSync("reg-terms","reg-btn","reg-err");zdTermsSync("invite-terms","invite-accept-btn","invite-accept-err");},0),true);
document.addEventListener("reset",()=>setTimeout(()=>{zdTermsSync("reg-terms","reg-btn","reg-err");zdTermsSync("invite-terms","invite-accept-btn","invite-accept-err");},0),true);
