// ── 9.9.0 · Sécurité : session expirée, administrateur protégé, confirmation des actions sensibles ──
function secNote(show){
  const box=document.querySelector("#auth-screen .auth-wrap");if(!box)return;
  let n=document.getElementById("auth-expired-note");
  if(!show){if(n)n.remove();return;}
  if(!n){n=document.createElement("div");n.id="auth-expired-note";n.className="sec-note";n.setAttribute("role","status");const tabs=box.querySelector(".auth-tabs-nav");if(tabs)tabs.before(n);else box.prepend(n);}
  n.textContent=t("sec_expired_x");
}
if(typeof readApiResponse==="function"){
  const _secRAR=readApiResponse;
  readApiResponse=async function(r){
    if(r&&r.status===401&&State.token){
      let d=null;try{d=await r.clone().json();}catch(_){}
      if(d&&typeof d.detail==="string"&&/Session expirée/.test(d.detail)){
        try{doLogout();}catch(_){}
        secNote(true);
        const err=new Error(d.detail);err.status=401;err.data=d;throw err;
      }
    }
    return _secRAR.apply(this,arguments);
  };
}
document.addEventListener("submit",e=>{if(e.target&&e.target.closest&&e.target.closest("#auth-screen"))setTimeout(()=>{if(State.token)secNote(false);},1500);},true);

// ── Code de confirmation pour les actions sensibles ──
let _secStepUpP=null;
function secStepUp(){
  if(_secStepUpP)return _secStepUpP;
  _secStepUpP=new Promise(resolve=>{
    const done=v=>{zdCloseModal("modal-sec-stepup");_secStepUpP=null;resolve(v);};
    const ov=zdModal("modal-sec-stepup",`<div class="modal-title"><i class="ti ti-lock" style="color:var(--amber)"></i> ${esc(t("sec_stepup_t"))}</div>
      <p style="font-size:13.5px;line-height:1.6;margin:0 0 12px">${esc(t("sec_stepup_x"))}</p>
      <div class="fgrp"><label class="fl" for="sec-stepup-code">${esc(t("sec_code_lbl"))}</label><input class="inp sec-code" id="sec-stepup-code" inputmode="numeric" autocomplete="one-time-code" maxlength="20" placeholder="••• •••"></div>
      <div id="sec-stepup-err" class="err-box"></div>
      <p style="font-size:12px;color:var(--muted);margin:8px 0 0">${esc(t("sec_stepup_note"))}</p>
      <div class="modal-footer"><button type="button" class="btn btn-o btn-sm" id="sec-stepup-no">${esc(t("btn_cancel"))}</button><button type="button" class="btn btn-g btn-sm" id="sec-stepup-go">${esc(t("sec_stepup_btn"))}</button></div>`,420);
    ov.dataset.sticky="1";
    const inp=document.getElementById("sec-stepup-code"),go=document.getElementById("sec-stepup-go"),err=document.getElementById("sec-stepup-err");
    const send=async()=>{
      const code=(inp.value||"").replace(/\s/g,"");
      if(code.length<6){showErr("sec-stepup-err",t("sec_code_short"));inp.focus();return;}
      go.disabled=true;
      try{await _secApi("POST","/security/step-up",{code});done(true);}
      catch(e){showErr("sec-stepup-err",e.message);go.disabled=false;inp.select();}
    };
    go.onclick=send;document.getElementById("sec-stepup-no").onclick=()=>done(false);
    inp.addEventListener("keydown",e=>{if(e.key==="Enter")send();if(e.key==="Escape")done(false);});
    if(err)err.style.display="none";
    setTimeout(()=>inp.focus(),50);
  });
  return _secStepUpP;
}

// ── Administration : double authentification obligatoire ──
let _secGateShown=false;
function secAdminGate(){
  const page=document.getElementById("page-admin");if(!page)return;
  page.classList.add("sec-gated");
  let g=document.getElementById("sec-admin-gate");
  if(!g){g=document.createElement("div");g.id="sec-admin-gate";g.className="card sec-gate";page.prepend(g);}
  g.innerHTML=`<div class="sec-gate-h"><span class="sec-gate-ic"><i class="ti ti-shield-check" aria-hidden="true"></i></span><div><b>${esc(t("sec_admin2fa_t"))}</b><span>${esc(t("sec_admin2fa_sub"))}</span></div></div>
    <p>${esc(t("sec_admin2fa_x"))}</p>
    <ol class="sec-steps"><li>${esc(t("sec_admin2fa_s1"))}</li><li>${esc(t("sec_admin2fa_s2"))}</li><li>${esc(t("sec_admin2fa_s3"))}</li></ol>
    <button type="button" class="btn btn-g" onclick="start2faSetup()"><i class="ti ti-shield-lock" aria-hidden="true"></i> ${esc(t("sec_admin2fa_btn"))}</button>
    <p class="sec-small">${esc(t("sec_admin2fa_note"))}</p>`;
  _secGateShown=true;
}
function secAdminUngate(){
  const page=document.getElementById("page-admin");if(!page)return;
  page.classList.remove("sec-gated");document.getElementById("sec-admin-gate")?.remove();_secGateShown=false;
}
if(typeof submitEnable2fa==="function"){
  const _secSE=submitEnable2fa;
  submitEnable2fa=async function(){const r=await _secSE.apply(this,arguments);if(_secGateShown&&document.getElementById("twofa-codes-step")?.style.display==="block"){secAdminUngate();}return r;};
}
if(typeof close2faModal==="function"){
  const _secC2=close2faModal;
  close2faModal=function(){const r=_secC2.apply(this,arguments);if(document.querySelector("#page-admin.active")&&!_secGateShown){try{loadPage("admin");}catch(_){}}return r;};
}

// ── Toutes les requêtes : confirmation et blocage administrateur gérés au même endroit ──
const _secApi=api;
function secErrKind(e){const d=e&&e.data&&e.data.detail;return d&&typeof d==="object"?d.error:null;}
api=async function(method,path,body){
  try{return await _secApi(method,path,body);}
  catch(e){
    const k=secErrKind(e);
    if(k==="step_up_required"){if(await secStepUp())return _secApi(method,path,body);const c=new Error(t("sec_cancelled"));c.status=403;throw c;}
    if(k==="admin_2fa_required"){secAdminGate();}
    throw e;
  }
};
if(typeof apiUpload==="function"){
  const _secUp=apiUpload;
  apiUpload=async function(path,fd){
    try{return await _secUp(path,fd);}
    catch(e){if(secErrKind(e)==="step_up_required"&&await secStepUp())return _secUp(path,fd);if(secErrKind(e)==="admin_2fa_required")secAdminGate();throw e;}
  };
}
