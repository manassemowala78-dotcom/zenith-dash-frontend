// ── 10.8.2 · Gratuité secteur par secteur : secteur obligatoire à l'inscription, PME payante si l'admin la décoche ──
const Z82={pub:null};
async function z82Pub(){
  try{const r=await fetch(`${API_BASE}/public/free-all`,{cache:"no-store"});if(r.ok){Z82.pub=await r.json();renderRegisterSectors();if(Z82.pub&&Z82.pub.active&&(Z82.pub.off||[]).length&&typeof zdfRefreshPublic==="function")zdfRefreshPublic();}}catch(_){}
}
renderRegisterSectors=function(){
  const box=document.getElementById("reg-sector-grid");if(!box)return;
  const p=Z82.pub,off=p&&p.active?(p.off||[]):null;
  box.innerHTML=SECTOR_KEYS.map(k=>{const m=SECTOR_META[k];const on=k===_regSector;
    const tag=off?`<em class="z82-tag ${off.includes(k)?"paid":"free"}">${esc(t(off.includes(k)?"v82_paid":"v82_offered"))}</em>`:"";
    return `<button type="button" class="sector-chip${on?" active":""}" style="--sc:${m.color}" onclick="selectRegSector('${k}')" aria-pressed="${on}"><i class="ti ti-${m.icon}"></i><span>${esc(t("sector_short_"+k))}</span>${tag}</button>`;}).join("");
  const hint=document.getElementById("reg-sector-hint");
  if(hint){hint.textContent=_regSector?t("sector_tagline_"+_regSector):t("v82_reg_hint");hint.classList.toggle("z82-need",!_regSector);}
};
selectRegSector=function(k){_regSector=k;renderRegisterSectors();const e=document.getElementById("reg-err");if(e&&e.dataset.z82){e.dataset.z82="";showErr("reg-err","");}};
if(typeof handleRegister==="function"){
  const _z82Reg=handleRegister;
  handleRegister=async function(e){
    const isClient=typeof _regAccountType==="string"&&_regAccountType==="client";
    if(!isClient&&!_regSector){
      if(e&&e.preventDefault)e.preventDefault();
      showErr("reg-err",t("v82_pick"));const er=document.getElementById("reg-err");if(er)er.dataset.z82="1";
      const g=document.getElementById("reg-sector-grid");if(g){g.scrollIntoView({block:"center",behavior:"smooth"});g.querySelector("button")?.focus({preventScroll:true});}
      return;
    }
    return _z82Reg.apply(this,arguments);
  };
}
z82Pub();
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&!State.token)z82Pub();});

// ── Abonnement : « ton secteur est maintenant payant » ──
if(typeof abStatusHtml==="function"){
  const _z82St=abStatusHtml;
  abStatusHtml=function(){
    let h=_z82St.apply(this,arguments);
    const fp=(_ab&&_ab.offer&&_ab.offer.free_paid_own)||[];
    if(fp.length){
      const names=fp.map(x=>abSectorLabel?abSectorLabel(x.key):x.label).join(", ");
      h=`<div class="z82-banner" role="alert"><i class="ti ti-lock" aria-hidden="true"></i><div><b>${esc(abTr("v82_now_paid",{s:names}))}</b><div>${esc(_ab.offer.free_paid_trial_until?abTr("v82_trial_x",{d:fmtDate(_ab.offer.free_paid_trial_until)}):t("v82_now_paid_x"))}</div>
        <div class="z82-alt"><i class="ti ti-gift" aria-hidden="true"></i><span>${esc(t("v82_others"))}</span></div>
        <button type="button" class="btn btn-o btn-sm" onclick="openSectorModal('change')"><i class="ti ti-arrows-exchange"></i> ${esc(t("v82_change"))}</button></div></div>`+h;
    }
    return h;
  };
}

// ── Admin : secteurs offerts pendant la gratuité ──
let _z82adm=null;
async function z82AdmLoad(){
  const host=document.getElementById("fa-admin");if(!host||!(State.tenant&&State.tenant.is_creator))return;
  try{_z82adm=await api("GET","/admin/free-sectors-off");z82AdmRender();}catch(_){}
}
function z82AdmRender(){
  const host=document.getElementById("fa-admin");if(!host||!_z82adm)return;
  let box=document.getElementById("z82-card");
  if(!box){box=document.createElement("div");box.id="z82-card";box.className="card z82-card";host.appendChild(box);}
  const d=_z82adm;
  box.innerHTML=`<div class="z82-h"><i class="ti ti-gift" style="color:var(--green)"></i> Secteurs offerts pendant la gratuité</div>
    <small class="cm-hint">Décoche un secteur pour le rendre payant tout de suite, pour tous les comptes.${d.active?"":" (La gratuité est arrêtée : ce réglage servira à la prochaine.)"}</small>
    <div class="z82-list">${d.sectors.map(s=>`<label class="z82-row"><input type="checkbox" value="${esc(s.key)}" ${s.offered?"checked":""} onchange="z82Mark(this)"><span>${esc(s.label)}</span><em class="z82-tag ${s.offered?"free":"paid"}">${s.offered?"Offert":"Payant"}</em></label>`).join("")}</div>
    <button type="button" class="btn btn-g btn-sm" id="z82-save" onclick="z82Save()"><i class="ti ti-device-floppy"></i> Enregistrer</button>`;
}
function z82Mark(cb){const em=cb.parentNode.querySelector(".z82-tag");if(em){em.className="z82-tag "+(cb.checked?"free":"paid");em.textContent=cb.checked?"Offert":"Payant";}}
async function z82Save(){
  const off=[...document.querySelectorAll("#z82-card input[type=checkbox]")].filter(c=>!c.checked).map(c=>c.value);
  const btn=document.getElementById("z82-save");if(btn)btn.disabled=true;
  try{
    const p=await api("POST","/admin/free-sectors-off/preview",{off});
    const names=(p.newly_paid||[]).map(x=>x.label).join(", ");
    const msg=(names?`${names} ${p.newly_paid.length>1?"deviennent payants":"devient payant"} tout de suite.\n`:"")+(p.lose_access?`${p.lose_access} compte${p.lose_access>1?"s":""} sans paiement ${p.lose_access>1?"perdent":"perd"} l'accès maintenant et ${p.lose_access>1?"reçoivent":"reçoit"} une notification.\n\nConfirmer ?`:"Aucun compte ne perd l'accès.\n\nConfirmer ?");
    if(!confirm(msg)){if(btn)btn.disabled=false;return;}
    _z82adm=await api("PUT","/admin/free-sectors-off",{off});
    showToast(`Enregistré ✓${_z82adm.notified?` · ${_z82adm.notified} compte(s) prévenu(s)`:""}`);z82AdmRender();
  }catch(e){showToast(e.message,"error");if(btn)btn.disabled=false;}
}
if(typeof faRender==="function"){
  const _z82FR=faRender;
  faRender=function(){const r=_z82FR.apply(this,arguments);if(_z82adm)z82AdmRender();else z82AdmLoad();return r;};
}
function z82OffNow(){
  try{
    const u=State&&State.tenant&&State.tenant.free_all;
    if(u&&Array.isArray(u.off))return u.off;
    if(Z82.pub&&Z82.pub.active&&Array.isArray(Z82.pub.off))return Z82.pub.off;
  }catch(_){}
  return [];
}
function z82SecName(k){const v=t("sector_short_"+k);return v&&v!=="sector_short_"+k?v:k;}
if(typeof t==="function"){
  const _z82T=t;
  const Z82_FREE=new Set(["ld_badge","trial_badge","ld_pricing_sub","fg_bar","fg_bar_n"]);
  t=function(key){
    const v=_z82T.apply(this,arguments);
    if(!Z82_FREE.has(key))return v;
    const off=z82OffNow();
    if(!off.length)return v;
    if(key!=="fg_bar"&&key!=="fg_bar_n"&&!(typeof zdfOn==="function"&&zdfOn()))return v;
    const s=off.map(z82SecName).join(", ");
    if(key==="ld_pricing_sub")return v+" "+_z82T("v82_now_paid").replace("{s}",s)+".";
    return v+" — "+_z82T("v82_except").replace("{s}",s);
  };
}
