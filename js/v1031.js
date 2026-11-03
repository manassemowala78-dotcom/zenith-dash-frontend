// ── 10.3.1 · Gratuité visible partout, messages plus longs ──
function zdCountNum(n){return Number(n).toLocaleString("fr-FR").replace(/[  ]/g," ");}
function zdCountHtml(id,val,max){const n=String(val||"").length;return `<div class="zd-count${n>=max?" full":""}" id="${id}-n"><span>Jusqu'à ${zdCountNum(max)} caractères</span><b>${zdCountNum(n)} / ${zdCountNum(max)}</b></div>`;}
function zdCount(ta){const el=document.getElementById(ta.id+"-n");if(!el)return;const n=ta.value.length,max=ta.maxLength>0?ta.maxLength:n;const b=el.querySelector("b");if(b)b.textContent=`${zdCountNum(n)} / ${zdCountNum(max)}`;el.classList.toggle("full",n>=max);}

function zdfLoc(){return typeof zdLocale==="function"?zdLocale():"fr-FR";}
function zdfDate(iso,o){try{const[y,m,d]=String(iso).split("-").map(Number);let s=new Date(Date.UTC(y,m-1,d,12)).toLocaleDateString(zdfLoc(),Object.assign({timeZone:"UTC"},o));if(/^fr/i.test(zdfLoc())&&d===1&&o.month==="long")s=s.replace(/^1 /,"1er ");return s;}catch(_){return String(iso||"");}}
function zdLongDate(iso,withYear){return zdfDate(iso,withYear===false?{day:"numeric",month:"long"}:{day:"numeric",month:"long",year:"numeric"});}
function zdShortDate(iso){return zdfDate(iso,{day:"2-digit",month:"2-digit",year:"numeric"});}

const ZDF={data:null};
try{const c=JSON.parse(localStorage.getItem("zd_free_pub")||"null");if(c&&c.at&&Date.now()-c.at<864e5)ZDF.data=c.v;}catch(_){}
const ZDF_MAP={ld_badge:"fg_ld_badge",ld_cta:"fg_ld_cta",ld_start:"fg_ld_start",ld_pricing_sub:"fg_ld_pricing_sub",ld_q1:"fg_ld_q1",ld_a1:"fg_ld_a1",
  trial_badge:"fg_trial_badge",reg_type_manager_badge:"fg_reg_badge",reg_btn_manager:"fg_reg_btn",lbl_referral_ph:"fg_referral_ph"};
const ZDP_MAP={ld_cta:"fp_ld_cta",ld_start:"fp_ld_start",ld_pricing_sub:"fp_ld_pricing_sub",ld_q1:"fp_ld_q1",ld_a1:"fp_ld_a1",
  trial_badge:"fp_trial_badge",reg_type_manager_badge:"fp_reg_badge",reg_btn_manager:"fp_reg_btn",lbl_referral_ph:"fp_referral_ph"};
const ZDF_DATED=new Set(["fg_ld_badge","fg_ld_pricing_sub","fg_ld_a1","fg_trial_badge","fg_reg_badge"]);
function zdfOn(){return !!(ZDF.data&&ZDF.data.active);}
function zdfPaid(){return !!(ZDF.data&&!ZDF.data.active&&ZDF.data.trial===false);}
if(typeof t==="function"){
  const _zdfT=t;
  t=function(key){
    const m=ZDF_MAP[key];
    if(m&&zdfOn()){
      const u=ZDF.data.until,k=ZDF_DATED.has(m)&&!u?m+"_n":m,v=_zdfT(k);
      if(v&&v!==k)return u?v.replace("{d}",zdLongDate(u)).replace("{s}",zdShortDate(u)):v;
    }
    const q=ZDP_MAP[key];
    if(q&&zdfPaid()){
      const sd=ZDF.data.since,k=q==="fp_ld_a1"&&!sd?q+"_n":q,v=_zdfT(k);
      if(v&&v!==k)return sd?v.replace("{d}",zdLongDate(sd)):v;
    }
    return _zdfT(key);
  };
}
function zdfRefreshPublic(){
  document.querySelectorAll("#auth-screen [data-i18n]").forEach(el=>{const v=t(el.getAttribute("data-i18n"));if(el.hasAttribute("data-i18n-placeholder"))el.placeholder=v;else el.textContent=v;});
  if(typeof abRenderRegRoles==="function"&&document.getElementById("reg-roles"))abRenderRegRoles();
  const l=document.getElementById("landing");
  if(l&&l.style.display==="block"&&typeof renderLanding==="function")renderLanding();
}
async function zdfLoad(){
  try{
    const r=await fetch(`${API_BASE}/public/free-all`,{cache:"no-store"});if(!r.ok)return;
    const v=await r.json();const before=JSON.stringify(ZDF.data);
    ZDF.data=v&&v.active?{active:true,until:v.until||null,tier:v.tier||null}:{active:false,trial:!(v&&v.trial===false),since:(v&&v.since)||null};
    try{localStorage.setItem("zd_free_pub",JSON.stringify({at:Date.now(),v:ZDF.data}));}catch(_){}
    if(JSON.stringify(ZDF.data)!==before)zdfRefreshPublic();
  }catch(_){}
}
zdfLoad();
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&!State.token)zdfLoad();});
if(typeof applyLanguageNow==="function"){
  const _zdpALN=applyLanguageNow;
  applyLanguageNow=function(){const r=_zdpALN.apply(this,arguments);try{if(zdfPaid())zdfRefreshPublic();}catch(_){}return r;};
}
if(typeof applyLanguageNow==="function"){
  const _zdfALN=applyLanguageNow;
  applyLanguageNow=function(){const r=_zdfALN.apply(this,arguments);try{if(zdfOn())zdfRefreshPublic();}catch(_){}return r;};
}

function zdfUserFree(u){return u&&u.free_all&&!u.is_creator&&!u.member_role&&u.account_type!=="client"?u.free_all:null;}
if(typeof updateExpiryBar==="function"){
  const _zdfBar=updateExpiryBar;
  updateExpiryBar=function(user){
    const fa=zdfUserFree(user);
    if(!fa)return _zdfBar.apply(this,arguments);
    const sub=user.plan!=="trial"&&user.subscription_expires_at&&parseServerDate(user.subscription_expires_at)>new Date();
    if(sub)return _zdfBar.apply(this,arguments);
    if(_expiryInterval){clearInterval(_expiryInterval);_expiryInterval=null;}
    const bar=document.getElementById("trial-bar");if(!bar)return;
    bar.className="trial-bar zdf-bar";
    const txt=fa.until?t("fg_bar").replace("{d}",zdLongDate(fa.until)):t("fg_bar_n");
    bar.innerHTML=`<span class="zdf-t"><span aria-hidden="true">🎁</span> ${esc(txt)}</span><a href="#" onclick="event.preventDefault();navigate('billing')">${esc(t("fg_bar_link"))} →</a>`;
  };
}
if(typeof planBadge==="function"){
  const _zdfPB=planBadge;
  planBadge=function(plan){
    if(plan==="trial"&&zdfUserFree(State.tenant))return `<span class="badge bg">${esc(t("fg_badge"))}</span>`;
    return _zdfPB.apply(this,arguments);
  };
}

function zdpUser(u){return u&&!u.is_creator&&!u.member_role&&u.account_type!=="client"&&(u.no_trial||(u.trial&&u.trial.no_trial))?(u.no_trial||{}):null;}
if(typeof updateExpiryBar==="function"){
  const _zdpBar=updateExpiryBar;
  updateExpiryBar=function(user){
    if(!zdpUser(user)||zdfUserFree(user))return _zdpBar.apply(this,arguments);
    if(_expiryInterval){clearInterval(_expiryInterval);_expiryInterval=null;}
    const bar=document.getElementById("trial-bar");if(!bar)return;
    bar.className="trial-bar expired zdf-bar";
    bar.innerHTML=`<span class="zdf-t">${esc(t("fp_bar"))}</span><a href="#" onclick="event.preventDefault();navigate('billing')" style="color:var(--red)">${esc(t("fp_bar_link"))} →</a>`;
  };
}
if(typeof planBadge==="function"){
  const _zdpPB=planBadge;
  planBadge=function(plan){
    if(plan==="trial"&&zdpUser(State.tenant))return `<span class="badge br">${esc(t("fp_badge"))}</span>`;
    return _zdpPB.apply(this,arguments);
  };
}
if(typeof applyRestrictedUI==="function"){
  const _zdpRUI=applyRestrictedUI;
  applyRestrictedUI=function(){const r=_zdpRUI.apply(this,arguments);try{if(State.restricted&&zdpUser(State.tenant))setHTML("topbar-plan",`<span class="badge br">${esc(t("fp_badge"))}</span>`);}catch(_){}return r;};
}
if(typeof abStatusHtml==="function"){
  const _zdpAS=abStatusHtml;
  abStatusHtml=function(){
    const h=_zdpAS.apply(this,arguments);
    const nt=zdpUser(State.tenant);if(!nt)return h;
    const fresh=!!nt.fresh;
    const x=nt.since?t("fp_ban_x").replace("{d}",zdLongDate(nt.since)):t("fp_ban_x_n");
    return `<div class="ab-banner zdp-ban" role="status"><i class="ti ti-rocket" aria-hidden="true"></i><div><b>${esc(t(fresh?"fp_ban_new_t":"fp_ban_old_t"))}</b><br>${esc(x)}</div></div>`+h;
  };
}

let _zst=null;
async function zstLoad(){try{_zst=await api("GET","/admin/signup-trial");zstRender();}catch(_){}}
function zstRender(){
  const card=document.getElementById("fa-admin");if(!card||!_zst)return;
  document.getElementById("zst-box")?.remove();
  const fa=typeof _fa!=="undefined"?_fa:null;
  let h="";
  if(!_zst.trial_on){
    const d=_zst.since?zdLongDate(_zst.since):"";
    h=`<div class="zst-off"><i class="ti ti-lock" aria-hidden="true"></i><div><b>Essai gratuit de 14 jours : désactivé${d?" depuis le "+esc(d):""}</b><br><small>Les nouveaux inscrits choisissent une formule tout de suite. Pour une seule personne : bouton « Renouveler l'essai » dans la liste des inscrits.</small></div>
      <button type="button" class="btn btn-o btn-sm" onclick="zstReactivate()"><i class="ti ti-refresh" aria-hidden="true"></i> Réactiver l'essai de 14 jours</button></div>`;
  }else if(fa&&fa.active){
    const o=(v,title,sub)=>`<label class="zst-opt${_zst.after===v?" on":""}"><input type="radio" name="zst-after" value="${v}" ${_zst.after===v?"checked":""} onchange="zstSet('${v}')"><span><b>${title}</b><small>${sub}</small></span></label>`;
    h=`<span class="fl">Quand la gratuité s'arrête</span><div class="zst-opts" role="radiogroup">${o("paid","Payant directement","Plus d'essai gratuit : les nouveaux inscrits choisissent une formule tout de suite, et ceux inscrits pendant la gratuité aussi.")}${o("trial","Essai gratuit de 14 jours","Comme avant la gratuité, pour les nouveaux inscrits.")}</div>`;
  }
  if(!h)return;
  const box=document.createElement("div");box.id="zst-box";box.className="fgrp";box.innerHTML=h;
  const dur=card.querySelector(".fa-dur")?.closest(".fgrp");
  if(dur)dur.after(box);else{const first=card.querySelector(".fgrp")||card.querySelector(".card")?.firstElementChild;if(first)first.parentNode.insertBefore(box,first.nextSibling);else card.appendChild(box);}
}
async function zstSet(v){
  try{_zst=await api("PUT","/admin/signup-trial",{after:v});zstRender();showToast(v==="paid"?"Après la gratuité : payant directement ✓":"Après la gratuité : essai de 14 jours ✓");}
  catch(e){showToast(e.message,"error");zstRender();}
}
async function zstReactivate(){
  if(!confirm("Réactiver l'essai gratuit de 14 jours pour les nouveaux inscrits ?"))return;
  try{_zst=await api("PUT","/admin/signup-trial",{reactivate:true});zstRender();showToast("Essai de 14 jours réactivé ✓");}
  catch(e){showToast(e.message,"error");}
}
if(typeof faRender==="function"){
  const _zstFR=faRender;
  faRender=function(){const r=_zstFR.apply(this,arguments);try{if(_zst)zstRender();else zstLoad();}catch(_){}return r;};
}
if(typeof faSave==="function"){
  const _zstFS=faSave;
  faSave=async function(){const r=await _zstFS.apply(this,arguments);try{await zstLoad();}catch(_){}return r;};
}
