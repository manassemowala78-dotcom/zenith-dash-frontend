function legalLinksInner(){return "";}
function legalLinksHtml(){return "";}
function renderLegalLinks(){}
function initRegisterBirthLimit(){
  const e=document.getElementById("reg-birth");if(!e)return;
  const d=new Date();d.setFullYear(d.getFullYear()-18);e.max=d.toISOString().slice(0,10);
}
function registerTermsOk(){return true;}
function registerBirthValue(){
  const v=(document.getElementById("reg-birth")?.value||"").trim();
  return v||null;
}
function checkTermsAcceptance(){}
function closeTermsModal(){}
function openShopTerms(){
  const d=_shop.data||{};
  document.getElementById("shop-terms-body").textContent=d.terms||"";
  document.getElementById("modal-shop-terms").style.display="flex";
}
function shopLegalFooterHtml(d){
  const seller=[d.name,d.address,d.phone,d.tax_number?`${t("shop_tax_number")} ${d.tax_number}`:null].filter(Boolean).map(esc).join(" · ");
  return `<div class="shop-legal"><div>${t("shop_seller")} : ${seller}</div>${d.terms?`<a href="#" onclick="event.preventDefault();openShopTerms()">${t("shop_terms_link_cap")}</a> · `:""}<span>${t("shop_powered")}</span></div>`;
}
document.addEventListener("DOMContentLoaded",initRegisterBirthLimit);
