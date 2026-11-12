// ── 10.6.5 · Inscription : photo (étape 1), autorisations (étape 2), verrouillage (étape 3) ──
window._regPhoto=null;
function regPhotoPick(file){
  const b=document.getElementById("reg-photo-btn"),rm=document.getElementById("reg-photo-rm");
  if(!file){window._regPhoto=null;if(b){b.innerHTML='<i class="ti ti-camera"></i>';b.classList.remove("has");}if(rm)rm.style.display="none";return;}
  if(!/^image\//.test(file.type||"")){showToast(t("ob_photo_bad"),"error");return;}
  if(file.size>25*1024*1024){showToast(abTr("mf_too_big",{n:file.name,m:25}),"error");return;}
  window._regPhoto=file;
  try{const u=URL.createObjectURL(file);if(b){b.innerHTML=`<img src="${u}" alt="">`;b.classList.add("has");}}catch(_){}
  if(rm)rm.style.display="";
}
function obShell(step,inner,foot){
  let ov=document.getElementById("zd-onb");
  if(!ov){ov=document.createElement("div");ov.id="zd-onb";ov.className="zd-onb";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");document.body.appendChild(ov);}
  ov.innerHTML=`<div class="zd-onb-in"><div class="ob-prog"><div class="ob-bar"><i style="width:${Math.round(step/3*100)}%"></i></div><small>${esc(abTr("ob_step",{n:step}))}</small></div>
    <div class="zd-onb-body">${inner}</div></div><div class="zd-onb-foot">${foot}</div>`;
  ov.scrollTop=0;return ov;
}
async function obPerm(){
  const st=await zpermStates();
  const missing=ZPERM.filter(p=>st[p.k]==="prompt").length;
  obShell(2,`<h1>${esc(t("ob_perm_t"))}</h1><p class="ob-sub">${esc(t("ob_perm_x"))}</p><div class="card zp-card">${zpermRowsHtml(st,false,"obPermRefresh")}</div>`,
    `${missing?`<button type="button" class="ob-go" id="ob-all" onclick="obPermAll(this)">${esc(t("zp_all"))}</button><button type="button" class="ob-alt" onclick="window._obNext()">${esc(t("ob_later"))}</button>`
      :`<button type="button" class="ob-go" onclick="window._obNext()">${esc(t("ob_continue"))}</button>`}`);
}
async function obPermAll(b){if(b)b.disabled=true;await zpermAll();obPerm();}
function obPermRefresh(){obPerm();}
async function obLock(){
  let s=null;try{s=await lkRefresh();}catch(_){}
  s=s||LK.st;
  const sup=typeof lkBioSupported==="function"?await lkBioSupported():false;
  const mine=s&&typeof lkBioLocal==="function"?(s.credentials||[]).find(c=>c.id===lkBioLocal()):null;
  obShell(3,`<h1>${esc(t("ob_lock_t"))}</h1><p class="ob-sub">${esc(t("ob_lock_x"))}</p>
    <div class="card lk-card ob-lock">${s&&s.options?lkTimingHtml(s):`<div class="ob-sub">${esc(t("lk_default"))}</div>`}</div>
    ${sup?`<div class="card ob-bio"><span class="ob-bio-ic"><i class="ti ti-fingerprint"></i></span><div><b>${esc(t("lk_bio_name"))}</b><small>${esc(t("ob_bio_x"))}</small></div>${mine?`<span class="zp-st ok"><i class="ti ti-check"></i> ${esc(t("zp_ok"))}</span>`:`<button type="button" class="btn btn-o btn-sm" onclick="obBio()">${esc(t("lk_enable")||t("zp_ask"))}</button>`}</div>`:""}`,
    `<button type="button" class="ob-go" onclick="window._obNext()">${esc(t("ob_finish"))}</button>`);
}
async function obBio(){try{await lkRegister();}catch(_){}obLock();}
async function zdOnboard(){
  // 1) photo choisie à l'étape 1
  const f=window._regPhoto;window._regPhoto=null;
  if(f){try{await uploadAvatar(f);}catch(_){}}
  if(document.body.classList.contains("zd-client")&&false)return;
  document.getElementById("auth-screen").style.display="none";
  // 2) autorisations, 3) verrouillage
  await new Promise(done=>{
    let step=2;
    window._obNext=()=>{if(step===2){step=3;obLock();window.lkAfterSet=obLock;}else{window.lkAfterSet=null;done();}};
    obPerm();
  });
  window.lkAfterSet=null;
  document.getElementById("zd-onb")?.remove();
}
function regStepLbl(){const e=document.getElementById("reg-step-lbl");if(e&&typeof abTr==="function")e.textContent=abTr("ob_step",{n:1});}
if(typeof applyLanguage==="function"){const _regAL=applyLanguage;applyLanguage=function(){const r=_regAL.apply(this,arguments);try{regStepLbl();}catch(_){}return r;};}
document.addEventListener("DOMContentLoaded",()=>setTimeout(regStepLbl,0));
