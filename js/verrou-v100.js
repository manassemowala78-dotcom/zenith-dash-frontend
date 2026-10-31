// ── 10.0.0 · Verrouillage de l'application : visage, empreinte ou mot de passe ──
const LK={st:null,shown:false,reason:"",pwd:false,reveal:false,fname:Math.random().toString(36).slice(2,10),last:Date.now(),unlockAt:Date.now(),hiddenAt:0,sup:0,tab:Math.random().toString(36).slice(2),
  busy:false,blocked:false,cd:null,cdEnd:0,err:"",left:null,uploads:0};
const LK_GRACE=2500,LK_SHOW_MIN=800,LK_RECHECK_WAIT=20;
function lkT(k,v){let s=t(k);if(v)Object.keys(v).forEach(x=>{s=s.split(`{${x}}`).join(v[x]);});return s;}
function lkLoad(k,d){try{const v=JSON.parse(localStorage.getItem(k)||"null");return v==null?d:v;}catch(_){return d;}}
function lkSave(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(_){}}
function lkCfg(){return Object.assign({delay_s:0,strict:false,idle_s:60,recheck_s:900},lkLoad("zd_lk_cfg",{}));}
function lkPid(){return (LK.st&&LK.st.person_id)||lkLoad("zd_lk_pid",null)||(State.tenant&&State.tenant.id)||"";}
function lkBioMap(){return lkLoad("zd_lk_bio",{});}
function lkBioLocal(){return lkBioMap()[lkPid()]||null;}
function lkBioHere(){const id=lkBioLocal();if(!id)return false;if(!LK.st)return true;return (LK.st.credentials||[]).some(c=>c.id===id);}
async function lkBioSupported(){try{return !!(window.PublicKeyCredential&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());}catch(_){return false;}}
function lkSuppressed(){return Date.now()<LK.sup;}
function lkBusy(){return (typeof CL!=="undefined"&&CL&&CL.call)||LK.uploads>0;}
function lkVisBeat(){if(State.token&&!LK.shown&&document.visibilityState==="visible")lkSave("zd_lk_vis",{t:LK.tab,at:Date.now()});}
function lkBeacon(path){
  if(!State.token)return;
  try{fetch(API_BASE+path,{method:"POST",keepalive:true,headers:{Authorization:`Bearer ${State.token}`}}).catch(()=>{});}catch(_){}
}

// ── Données binaires du visage / de l'empreinte (WebAuthn) ──
function lkU2B(s){s=String(s||"").replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer;}
function lkB2U(buf){const u=new Uint8Array(buf);let s="";for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function lkCreateOpts(o){return {...o,challenge:lkU2B(o.challenge),user:{...o.user,id:lkU2B(o.user.id)},excludeCredentials:(o.excludeCredentials||[]).map(c=>({...c,id:lkU2B(c.id)}))};}
function lkGetOpts(o){return {...o,challenge:lkU2B(o.challenge),allowCredentials:(o.allowCredentials||[]).map(c=>({...c,id:lkU2B(c.id)}))};}
function lkCredOut(c,att){
  const r=c.response,o={id:c.id,rawId:lkB2U(c.rawId),type:c.type,clientExtensionResults:c.getClientExtensionResults?c.getClientExtensionResults():{}};
  if(c.authenticatorAttachment)o.authenticatorAttachment=c.authenticatorAttachment;
  if(att)o.response={clientDataJSON:lkB2U(r.clientDataJSON),attestationObject:lkB2U(r.attestationObject),transports:r.getTransports?r.getTransports():[]};
  else{o.response={clientDataJSON:lkB2U(r.clientDataJSON),authenticatorData:lkB2U(r.authenticatorData),signature:lkB2U(r.signature)};if(r.userHandle)o.response.userHandle=lkB2U(r.userHandle);}
  return o;
}
function lkBioErr(e){
  const n=e&&e.name;
  if(n==="NotAllowedError"||n==="AbortError")return t("lk_bio_cancel");
  if(n==="InvalidStateError")return t("lk_bio_dup");
  if(n==="SecurityError"||n==="NotSupportedError")return t("lk_no_sensor");
  return (e&&e.message)||t("lk_bio_cancel");
}

// ── État du serveur ──
async function lkRefresh(){
  if(!State.token)return null;
  try{
    const s=await api("GET","/security/lock/status");
    LK.st=s;lkSave("zd_lk_pid",s.person_id);
    lkSave("zd_lk_cfg",{delay_s:s.delay_s,strict:s.strict,idle_s:s.idle_s,recheck_s:s.recheck_s});
    const m=lkBioMap(),pid=s.person_id;
    if(m[pid]&&!(s.credentials||[]).some(c=>c.id===m[pid])){delete m[pid];lkSave("zd_lk_bio",m);}
    LK.left=s.fails_left;
    if(s.locked&&!LK.shown)lkShow("server");
    else if(LK.shown)lkRender();
    return s;
  }catch(e){return null;}
}

// ── Quitter et revenir ──
function lkOnHide(){
  if(!State.token||LK.shown)return;
  lkSave("zd_lk_vis",{t:LK.tab,at:Date.now()});
  if(lkSuppressed())return;
  LK.hiddenAt=Date.now();
  lkBeacon("/security/lock/away");
}
function lkOnShow(){
  if(!State.token||LK.shown)return;
  if(lkSuppressed()){LK.sup=0;LK.hiddenAt=0;lkBack();return;}
  if(!LK.hiddenAt)return;
  const v=lkLoad("zd_lk_vis",null);
  const other=v&&v.t!==LK.tab?v.at:0;
  const gap=Date.now()-Math.max(LK.hiddenAt,other||0);
  LK.hiddenAt=0;
  if(gap>=Math.max(lkCfg().delay_s*1000,LK_SHOW_MIN))lkLock("away");else lkBack();
}
async function lkBack(){
  try{const r=await api("POST","/security/lock/back");if(r&&r.locked&&!LK.shown)lkShow("away");}catch(_){}
}
function lkLock(reason){
  if(!State.token)return;
  lkShow(reason);
  lkBeacon("/security/lock/engage");
}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")lkOnHide();else lkOnShow();});
window.addEventListener("pagehide",lkOnHide);
window.addEventListener("pageshow",e=>{if(e.persisted)lkOnShow();});
setInterval(lkVisBeat,1000);
document.addEventListener("click",e=>{
  const el=e.target&&e.target.closest&&e.target.closest('input[type="file"],label');
  if(el&&(el.matches('input[type="file"]')||el.querySelector('input[type="file"]')))LK.sup=Date.now()+10*60000;
},true);
if(navigator.share){const _lkShare=navigator.share.bind(navigator);try{navigator.share=function(){LK.sup=Date.now()+5*60000;return _lkShare.apply(null,arguments);};}catch(_){}}
if(typeof HTMLInputElement!=="undefined"){
  const _lkClick=HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click=function(){if(this.type==="file")LK.sup=Date.now()+10*60000;return _lkClick.apply(this,arguments);};
  if(HTMLInputElement.prototype.showPicker){const _lkSP=HTMLInputElement.prototype.showPicker;HTMLInputElement.prototype.showPicker=function(){if(this.type==="file")LK.sup=Date.now()+10*60000;return _lkSP.apply(this,arguments);};}
}

// ── Envois de fichiers en cours : la vérification attend la fin ──
(function(){
  const _send=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send=function(b){
    if(typeof FormData!=="undefined"&&b instanceof FormData){LK.uploads++;this.addEventListener("loadend",()=>{LK.uploads=Math.max(0,LK.uploads-1);LK.last=Date.now();},{once:true});}
    return _send.apply(this,arguments);
  };
})();
if(typeof apiUpload==="function"){
  const _lkUp=apiUpload;
  apiUpload=async function(){LK.uploads++;try{return await _lkUp.apply(this,arguments);}finally{LK.uploads=Math.max(0,LK.uploads-1);LK.last=Date.now();}};
}

// ── Protection renforcée : écran non touché, vérification régulière ──
["pointerdown","keydown","wheel","touchstart","input"].forEach(ev=>document.addEventListener(ev,()=>{LK.last=Date.now();},{capture:true,passive:true}));
document.addEventListener("scroll",()=>{LK.last=Date.now();},{capture:true,passive:true});
setInterval(()=>{
  if(!State.token||LK.shown||document.visibilityState!=="visible")return;
  const cfg=lkCfg();if(!cfg.strict)return;
  if(lkBusy()){LK.last=Date.now();return;}
  const now=Date.now();
  if(now-LK.last>=cfg.idle_s*1000){lkLock("idle");return;}
  if(cfg.recheck_s&&now-LK.unlockAt>=cfg.recheck_s*1000)lkLock("recheck");
},2000);

// ── L'écran verrouillé ──
function lkIco(k){
  const p={lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    fp:'<path d="M17.8 6.6A8 8 0 0 0 4 12v1.5"/><path d="M20 12v1.5c0 1.4-.2 2.8-.6 4"/><path d="M8 16.5a20 20 0 0 1-.5-4.5 4.5 4.5 0 0 1 9 0v.5"/><path d="M12 12v1.5c0 2.6.6 5 1.6 7"/><path d="M16.5 15.5c-.1 1.8.2 3.5.7 5"/><path d="M5 17c.6 1.2 1.2 2.4 2 3.5"/>',
    face:'<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 10v.5M15 10v.5M9.5 15c1.4 1 3.6 1 5 0"/>',
    key:'<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3M17 6l3 3M14 9l2 2"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>',
    phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    mobile:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    pc:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'}[k]||"";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
function lkWho(){
  const u=State.tenant||{};const name=u.acting_as_member_name||u.name||"";
  const sub=u.acting_as_member_name?u.name:(u.company_name&&u.company_name!==name?u.company_name:"");
  return {name,sub,avatar:u.avatar_url||null,ini:(name||"?").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()};
}
function lkShow(reason){
  if(!State.token)return;
  const first=!LK.shown;
  LK.shown=true;LK.reason=reason||LK.reason||"away";
  if(first){LK.err="";LK.pwd=false;}
  document.body.classList.add("zd-app-locked");
  let ov=document.getElementById("zd-lock");
  if(!ov){ov=document.createElement("div");ov.id="zd-lock";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");document.body.appendChild(ov);}
  ov.style.display="flex";
  try{if(document.activeElement&&document.activeElement!==document.body&&!ov.contains(document.activeElement))document.activeElement.blur();}catch(_){}
  if(LK.reason==="recheck"&&first){LK.cdEnd=Date.now()+LK_RECHECK_WAIT*1000;clearInterval(LK.cd);LK.cd=setInterval(lkTick,500);}
  lkRender();
  if(first)lkRefresh();
  if(first)setTimeout(()=>{const b=document.getElementById(lkBioHere()?"zd-lk-bio":"zd-lk-pwd");if(b&&LK.shown)try{b.focus({preventScroll:true});}catch(_){}},60);
}
function lkTick(){
  if(!LK.shown||LK.reason!=="recheck"){clearInterval(LK.cd);return;}
  const n=Math.max(0,Math.ceil((LK.cdEnd-Date.now())/1000));
  const el=document.getElementById("zd-lk-cd");if(el)el.textContent=lkT("lk_recheck_cd",{n});
  const bar=document.getElementById("zd-lk-cdbar");if(bar)bar.style.width=`${Math.max(0,Math.min(100,n/LK_RECHECK_WAIT*100))}%`;
  if(n<=0){clearInterval(LK.cd);LK.reason="away";lkRender();}
}
function lkRender(){
  const ov=document.getElementById("zd-lock");if(!ov||!LK.shown)return;
  const w=lkWho(),bio=lkBioHere(),re=LK.reason==="recheck";
  const keep=document.getElementById("zd-lk-pwd");const typed=keep?keep.value:"";
  const fid=document.activeElement&&ov.contains(document.activeElement)?document.activeElement.id:null;
  const av=w.avatar?`<span class="lk-av" style="background-image:url('${esc(w.avatar)}')" aria-hidden="true"></span>`:`<span class="lk-av" aria-hidden="true">${esc(w.ini)}</span>`;
  const call=(typeof CL!=="undefined"&&CL&&CL.call)?`<div class="lk-call"><span>${lkIco("phone")}${esc(t("lk_call_on"))}</span><button type="button" class="lk-call-end" onclick="clHangup()">${esc(t("lk_hangup"))}</button></div>`:"";
  const head=re?`<span class="lk-badge">${esc(t("lk_recheck_badge"))}</span><b class="lk-name lk-big">${esc(lkT("lk_recheck_t",{n:w.name.split(/\s+/)[0]||""}))}</b><span class="lk-sub lk-x">${esc(t("lk_recheck_x"))}</span>`
    :`${av}<div class="lk-id"><b class="lk-name">${esc(w.name)}</b>${w.sub?`<span class="lk-sub">${esc(w.sub)}</span>`:""}</div><span class="lk-pill">${lkIco("lock")}${esc(t("lk_locked"))}</span>`;
  const bioBtn=bio?`<div class="lk-bio-wrap"><button type="button" id="zd-lk-bio" class="lk-bio${re?" re":""}" onclick="lkBioUnlock()" aria-label="${esc(t("lk_touch"))}"${LK.busy?" disabled":""}>${lkIco("fp")}</button>
      <span class="lk-touch">${esc(t("lk_touch"))}</span><span class="lk-touch-x">${esc(t("lk_touch_x"))}</span>
      <button type="button" class="lk-pc-bio" onclick="lkBioUnlock()"${LK.busy?" disabled":""}>${lkIco("face")}<span>${esc(/Windows/i.test(navigator.userAgent)?t("lk_pc_bio"):t("lk_pc_bio").replace(/\s*\(Windows Hello\)/,""))}</span></button></div>`:"";
  const cd=re?`<div class="lk-cd"><span class="lk-cdtrack"><span id="zd-lk-cdbar" class="lk-cdbar"></span></span><span id="zd-lk-cd">${esc(lkT("lk_recheck_cd",{n:Math.max(0,Math.ceil((LK.cdEnd-Date.now())/1000))}))}</span></div>`:"";
  const left=LK.left;
  const err=LK.err?`<div class="lk-err" role="alert">${esc(LK.err)}</div>`:"";
  const showPwd=!bio||LK.pwd;
  const phone=!re&&lkPhoneOk();
  const sec=lkSecretOk();
  const ign='data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other"';
  const form=`<form class="lk-form" onsubmit="event.preventDefault();lkPwdUnlock()" autocomplete="off" ${ign}>
      ${!re&&!phone?`<span class="lk-pwd-sub">${esc(t("lk_pwd_sub"))}</span>`:""}
      <label class="lk-lbl" for="zd-lk-pwd">${esc(t("lk_pwd_lbl"))}</label>
      <span class="lk-field${LK.err?" bad":""}"><input id="zd-lk-pwd" name="zd-${LK.fname}" ${sec?`type="text" class="lk-secret${LK.reveal?" lk-reveal":""}" autocomplete="off"`:`type="${LK.reveal?"text":"password"}" autocomplete="new-password"`} autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="200" enterkeyhint="go" ${ign}>
        <button type="button" class="lk-eye" aria-label="${esc(t("lk_show_pwd"))}" aria-pressed="${LK.reveal?"true":"false"}" onclick="lkReveal()">${lkIco("eye")}</button></span>
      ${err}
      <button type="submit" class="lk-go${phone&&!bio?" lk-go2":""}"${LK.busy?" disabled":""}>${esc(t("lk_unlock"))}</button>
    </form>`;
  const phoneBtn=phone&&!bio?`<div class="lk-phone"><button type="button" id="zd-lk-phone" class="lk-go lk-phone-go" onclick="lkPhoneUnlock()"${LK.busy?" disabled":""}>${lkIco("mobile")}<span>${esc(t("lk_phone_btn"))}</span></button>
      <span class="lk-phone-x">${esc(t("lk_phone_x"))}</span></div><div class="lk-or"><span></span>${esc(t("lk_or"))}<span></span></div>`:"";
  ov.className=`zd-lock${showPwd?" pwd":""}${bio?" has-bio":""}${re?" re":""}${phone&&!bio?" has-phone":""}`;
  ov.setAttribute("aria-label",re?lkT("lk_recheck_t",{n:w.name}):t("lk_locked"));
  ov.innerHTML=`<div class="lk-box">
    <div class="lk-logo"><span class="lk-logo-mark" aria-hidden="true"></span>Zenith<span>Dash</span></div>
    <div class="lk-mid">${head}${cd}${bioBtn}
      ${bio?`<div class="lk-or"><span></span>${esc(t("lk_or"))}<span></span></div>`:""}
      ${phoneBtn}${form}
      ${bio&&LK.pwd?`<button type="button" class="lk-link lk-use-bio" onclick="LK.pwd=false;LK.err='';lkRender()">${lkIco("fp")}${esc(t("lk_use_bio"))}</button>`:""}
    </div>
    <div class="lk-foot">${call}
      ${bio&&!LK.pwd?`<button type="button" class="lk-alt" onclick="LK.pwd=true;lkRender();setTimeout(()=>document.getElementById('zd-lk-pwd')?.focus(),30)">${lkIco("key")}${esc(t("lk_use_pwd"))}</button>`:""}
      ${phone&&bio?`<button type="button" class="lk-link lk-phone-alt" onclick="lkPhoneUnlock()">${lkIco("mobile")}${esc(t("lk_phone_btn"))}</button>`:""}
      ${!re?`<button type="button" class="lk-link" id="zd-lk-forgot" onclick="lkForgot()">${esc(t("rs_forgot"))}</button>`:""}
      <button type="button" class="lk-link muted" onclick="lkLogout()">${esc(t("lk_not_you"))}</button>
    </div></div>`;
  const pi=document.getElementById("zd-lk-pwd");if(pi&&typed)pi.value=typed;
  if(fid){const f=document.getElementById(fid);if(f&&f.offsetParent!==null)try{f.focus({preventScroll:true});}catch(_){}}
  if(re)lkTick();
}
async function lkPwdUnlock(){
  const i=document.getElementById("zd-lk-pwd");const pw=i?i.value:"";
  if(!pw){LK.err=t("lk_pwd_empty");lkRender();document.getElementById("zd-lk-pwd")?.focus();return;}
  if(LK.busy)return;LK.busy=true;
  try{
    await api("POST","/security/lock/unlock/password",{password:pw});
    lkUnlocked();
  }catch(e){
    const d=e&&e.data&&e.data.detail;
    if(d&&d.error==="bad_password"){LK.left=d.left;LK.err=d.left<=1?t("lk_bad_pwd1"):lkT("lk_bad_pwd",{n:d.left});}
    else if(e&&e.status===401){LK.busy=false;lkHide();return;}
    else LK.err=(e&&e.message)||t("server_error");
    LK.busy=false;lkRender();const f=document.getElementById("zd-lk-pwd");if(f){f.value="";f.focus();}
    return;
  }
  LK.busy=false;
}
async function lkBioUnlock(){
  if(LK.busy)return;LK.busy=true;LK.err="";
  try{
    const o=await api("POST","/security/lock/webauthn/auth/options");
    const cred=await navigator.credentials.get({publicKey:lkGetOpts(o)});
    await api("POST","/security/lock/unlock/webauthn",{credential:lkCredOut(cred,false)});
    LK.busy=false;lkUnlocked();return;
  }catch(e){
    const d=e&&e.data&&e.data.detail;
    if(d&&d.error==="no_credential"){const m=lkBioMap();delete m[lkPid()];lkSave("zd_lk_bio",m);LK.pwd=true;LK.err=t("lk_bio_gone");}
    else LK.err=e&&e.name?lkBioErr(e):((e&&e.message)||t("lk_bio_cancel"));
  }
  LK.busy=false;lkRender();
}
let _lkSec=null;
function lkSecretOk(){if(_lkSec===null){try{_lkSec=!!(window.CSS&&CSS.supports&&CSS.supports("-webkit-text-security","disc"));}catch(_){_lkSec=false;}}return _lkSec;}
function lkMobile(){return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent));}
function lkPhoneOk(){return !!(window.PublicKeyCredential&&LK.st&&(LK.st.credentials||[]).length&&!lkMobile());}
function lkReveal(){
  LK.reveal=!LK.reveal;
  const i=document.getElementById("zd-lk-pwd");if(!i)return;
  if(lkSecretOk())i.classList.toggle("lk-reveal",LK.reveal);else i.type=LK.reveal?"text":"password";
  i.closest(".lk-field")?.querySelector(".lk-eye")?.setAttribute("aria-pressed",LK.reveal?"true":"false");
  try{i.focus({preventScroll:true});}catch(_){}
}
function lkForgot(){
  const email=(LK.st&&LK.st.email)||(State.tenant&&State.tenant.email)||"";
  if(typeof rsOpen==="function")rsOpen({from:"lock",email});
}
async function lkPhoneUnlock(){
  if(LK.busy)return;LK.busy=true;LK.err="";lkRender();
  try{
    const o=await api("POST","/security/lock/webauthn/auth/options?via=phone");
    const cred=await navigator.credentials.get({publicKey:lkGetOpts(o)});
    await api("POST","/security/lock/unlock/webauthn",{credential:lkCredOut(cred,false)});
    LK.busy=false;lkUnlocked();return;
  }catch(e){
    const d=e&&e.data&&e.data.detail;
    if(d&&d.error==="no_credential")LK.err=t("lk_phone_none");
    else if(e&&(e.name==="NotAllowedError"||e.name==="AbortError"))LK.err=t("lk_phone_cancel");
    else if(e&&e.name)LK.err=lkBioErr(e);
    else LK.err=(e&&e.message)||t("lk_phone_cancel");
  }
  LK.busy=false;lkRender();
}
window.addEventListener("pagehide",()=>{const i=document.getElementById("zd-lk-pwd");if(i)i.value="";});
function lkHide(){
  LK.shown=false;LK.reveal=false;clearInterval(LK.cd);
  const ov=document.getElementById("zd-lock");if(ov){ov.style.display="none";ov.innerHTML="";}
  document.body.classList.remove("zd-app-locked");
}
function lkUnlocked(){
  lkHide();LK.err="";LK.pwd=false;LK.unlockAt=LK.last=Date.now();LK.hiddenAt=0;LK.left=null;
  lkSave("zd_lk_vis",{t:LK.tab,at:Date.now()});
  if(LK.blocked){
    LK.blocked=false;
    const act=document.querySelector(".page.active")?.id?.replace("page-","");
    if(act)try{loadPage(act);}catch(_){}
  }
  lkFirstPrompt();
}
function lkLogout(){lkHide();try{doLogout();}catch(_){}}

// ── Le serveur répond « verrouillé » ──
if(typeof readApiResponse==="function"){
  const _lkRAR=readApiResponse;
  readApiResponse=async function(r){
    if(r&&r.status===423&&State.token){
      let d=null;try{d=await r.clone().json();}catch(_){}
      if(d&&d.detail&&d.detail.error==="app_locked"){
        LK.blocked=true;if(!LK.shown)lkShow("server");
        const err=new Error(t("lk_locked"));err.status=423;err.zdLocked=true;throw err;
      }
    }
    return _lkRAR.apply(this,arguments);
  };
}
if(typeof showToast==="function"){
  const _lkToast=showToast;
  showToast=function(msg){if(LK.shown&&msg===t("lk_locked"))return;return _lkToast.apply(this,arguments);};
}
if(typeof doLogout==="function"){
  const _lkOut=doLogout;
  doLogout=function(){lkHide();LK.st=null;return _lkOut.apply(this,arguments);};
}
if(typeof showAppLayout==="function"){
  const _lkSAL=showAppLayout;
  showAppLayout=async function(){
    const r=await _lkSAL.apply(this,arguments);
    if(!LK.shown){LK.unlockAt=LK.last=Date.now();}
    lkVisBeat();
    lkRefresh().then(()=>lkFirstPrompt());
    return r;
  };
}

// ── Première fois : proposer le visage ou l'empreinte ──
async function lkFirstPrompt(){
  if(!State.token||LK.shown||document.getElementById("zd-lk-first"))return;
  if(lkBioHere())return;
  const pid=lkPid();const seen=lkLoad("zd_lk_first",{});
  if(seen[pid]&&Date.now()-seen[pid]<30*86400000)return;
  if(!(await lkBioSupported()))return;
  setTimeout(()=>{
    if(!State.token||LK.shown||lkBioHere()||document.getElementById("zd-lk-first"))return;
    if(document.querySelector(".modal-overlay[style*='flex']"))return;
    const el=document.createElement("div");el.id="zd-lk-first";el.className="lk-sheet-ov";
    el.innerHTML=`<div class="lk-sheet" role="dialog" aria-modal="true" aria-labelledby="zd-lk-first-t">
      <span class="lk-sheet-ic">${lkIco("face")}</span>
      <b id="zd-lk-first-t">${esc(t("lk_first_t"))}</b>
      <p>${esc(t("lk_first_x"))}</p>
      <div class="lk-safe">${lkIco("shield")}<span>${esc(t("lk_first_safe"))}</span></div>
      <button type="button" class="lk-go" id="zd-lk-first-go">${esc(t("lk_first_go"))}</button>
      <button type="button" class="lk-alt" id="zd-lk-first-no">${esc(t("lk_first_later"))}</button></div>`;
    document.body.appendChild(el);
    const close=()=>{el.remove();const s=lkLoad("zd_lk_first",{});s[pid]=Date.now();lkSave("zd_lk_first",s);};
    document.getElementById("zd-lk-first-no").onclick=close;
    el.addEventListener("click",e=>{if(e.target===el)close();});
    document.getElementById("zd-lk-first-go").onclick=async()=>{const ok=await lkRegister();if(ok)el.remove();};
  },1800);
}

// ── Activer, retirer ──
async function lkRegister(){
  LK.sup=Date.now()+3*60000;
  try{
    const o=await api("POST","/security/lock/webauthn/register/options");
    const cred=await navigator.credentials.create({publicKey:lkCreateOpts(o)});
    const r=await api("POST","/security/lock/webauthn/register/verify",{credential:lkCredOut(cred,true)});
    const m=lkBioMap();m[lkPid()]=r.id;lkSave("zd_lk_bio",m);
    showToast(t("lk_bio_on"));
    await lkRefresh();lkRenderSettings();
    return true;
  }catch(e){
    showToast(e&&e.name?lkBioErr(e):((e&&e.message)||t("server_error")),"error");
    return false;
  }finally{LK.sup=Date.now()+1500;}
}
async function lkRemove(id){
  if(!confirm(t("lk_confirm_remove")))return;
  try{
    await api("DELETE",`/security/lock/webauthn/${encodeURIComponent(id)}`);
    const m=lkBioMap();if(m[lkPid()]===id){delete m[lkPid()];lkSave("zd_lk_bio",m);}
    showToast(t("lk_bio_off"));await lkRefresh();lkRenderSettings();
  }catch(e){showToast(e.message,"error");}
}
async function lkSet(body){
  try{
    const s=await api("PUT","/security/lock/settings",body);LK.st=s;
    lkSave("zd_lk_cfg",{delay_s:s.delay_s,strict:s.strict,idle_s:s.idle_s,recheck_s:s.recheck_s});
    LK.unlockAt=LK.last=Date.now();
    showToast(t("lk_saved"));lkRenderSettings();
  }catch(e){showToast(e.message,"error");lkRenderSettings();}
}

// ── Profil → Sécurité ──
function lkUseTxt(c){
  if(!c||!c.last_used_at)return "";
  const w=typeof fmtDateTime==="function"?fmtDateTime(c.last_used_at):(typeof fmtDate==="function"?fmtDate(c.last_used_at):"");
  return `<span class="lk-used">${esc(c.last_used_remote?lkT("lk_used_pc",{d:c.last_used_device||"PC",w}):lkT("lk_used",{w}))}</span>`;
}
function lkDur(s){return s<60?lkT("lk_s",{n:s}):lkT("lk_min",{n:Math.round(s/60)});}
async function lkRenderSettings(){
  const pg=document.getElementById("page-profile");if(!pg)return;
  let box=document.getElementById("zd-lk-settings");
  if(!box){
    const anchor=document.getElementById("security-2fa-status")?.closest(".card");
    box=document.createElement("div");box.id="zd-lk-settings";box.className="es-keep";
    if(anchor)anchor.after(box);else pg.appendChild(box);
  }
  const s=(await lkRefresh())||LK.st;if(!s){box.innerHTML="";return;}
  const sup=await lkBioSupported();
  const here=lkBioLocal(),cr=s.credentials||[];
  const mine=cr.find(c=>c.id===here),others=cr.filter(c=>c.id!==here);
  const radio=(name,val,cur,label,extra)=>`<label class="lk-opt${val===cur?" on":""}"><input type="radio" name="${name}" value="${val}"${val===cur?" checked":""} onchange="lkSet({${name}:${val}})"><span>${esc(label)}</span>${extra||""}</label>`;
  const dl={0:t("lk_d0"),60:t("lk_d60"),300:t("lk_d300"),900:t("lk_d900"),3600:t("lk_d3600")};
  box.innerHTML=`<div class="card lk-card" style="margin-bottom:16px">
      <div class="lk-card-h"><span class="lk-card-ic">${lkIco("lock")}</span><div><b>${esc(t("lk_card_t"))}</b><span class="lk-on">${esc(t("lk_on"))}</span></div></div>
      <div class="lk-cap">${esc(t("lk_when"))}</div>
      <div class="lk-opts" role="radiogroup" aria-label="${esc(t("lk_when"))}">${s.options.delays.map(v=>radio("delay_s",v,s.delay_s,dl[v]||lkDur(v),v===0?`<small>${esc(t("lk_default"))}</small>`:"")).join("")}</div>
      <div class="lk-cap">${esc(t("lk_how"))}</div>
      <div class="lk-row">${lkIco("fp")}<div><b>${esc(t("lk_bio_name"))}</b><span>${mine?esc(`${mine.name} · ${t("lk_this_dev")}`):esc(sup?t("lk_bio_off_here"):(cr.length&&!lkMobile()?t("lk_no_sensor_phone"):t("lk_no_sensor")))}</span>${mine?lkUseTxt(mine):""}</div>
        ${mine?`<button type="button" class="btn btn-o btn-sm lk-rm" onclick="lkRemove('${esc(mine.id)}')">${esc(t("lk_remove"))}</button>`:(sup?`<button type="button" class="btn btn-g btn-sm" id="zd-lk-add" onclick="lkRegister()">${esc(t("lk_add_here"))}</button>`:"")}</div>
      ${others.length?`<div class="lk-others"><span>${esc(t("lk_other_devs"))}</span>${others.map(c=>`<div class="lk-row sm"><div><b>${esc(c.name||"")}</b><span>${esc(c.created_at?fmtDate(c.created_at):"")}</span>${lkUseTxt(c)}</div><button type="button" class="btn btn-o btn-sm lk-rm" onclick="lkRemove('${esc(c.id)}')">${esc(t("lk_remove"))}</button></div>`).join("")}</div>`:""}
      <div class="lk-row">${lkIco("key")}<div><b>${esc(t("lk_pwd_lbl"))}</b><span>${esc(t("lk_pwd_always"))}</span></div></div>
      ${mine&&lkMobile()?`<div class="lk-pchint">${lkIco("pc")}<div><b>${esc(t("lk_pc_add_t"))}</b><span>${esc(t("lk_pc_add_x"))}</span></div></div>`:""}
      <p class="lk-note">${esc(t("lk_bio_note"))}</p>
    </div>
    <div class="card lk-card lk-strict${s.strict?" on":""}" style="margin-bottom:16px">
      <div class="lk-card-h"><span class="lk-card-ic st">${lkIco("fp")}</span><div><b>${esc(t("lk_strict_t"))}</b><span>${esc(s.strict?t("lk_on"):t("lk_strict_off"))}</span></div>
        <label class="lk-switch"><input type="checkbox" id="zd-lk-strict"${s.strict?" checked":""} onchange="lkSet({strict:this.checked})"><span class="lk-sw" aria-hidden="true"></span><span class="sr-only">${esc(t("lk_strict_t"))}</span></label></div>
      <p class="lk-note">${esc(t("lk_strict_x"))}</p>
      <div class="lk-strict-body"${s.strict?"":" hidden"}>
        <div class="lk-cap">${esc(t("lk_idle_lbl"))}</div>
        <div class="lk-chips" role="radiogroup" aria-label="${esc(t("lk_idle_lbl"))}">${s.options.idle.map(v=>radio("idle_s",v,s.idle_s,lkDur(v))).join("")}</div>
        <div class="lk-cap">${esc(t("lk_recheck_lbl"))}</div>
        <div class="lk-chips" role="radiogroup" aria-label="${esc(t("lk_recheck_lbl"))}">${[...s.options.recheck.filter(v=>v>0),0].map(v=>radio("recheck_s",v,s.recheck_s,v?lkDur(v):t("lk_never"))).join("")}</div>
        <p class="lk-note">${esc(t("lk_strict_note"))}</p>
      </div>
    </div>`;
}
if(typeof loadPage==="function"){
  const _lkLP=loadPage;
  loadPage=async function(p){const r=await _lkLP.apply(this,arguments);if(p==="profile")lkRenderSettings();return r;};
}

// ── Au démarrage : rouvrir après une absence = déverrouiller ──
(function lkBoot(){
  if(!State.token)return;
  const v=lkLoad("zd_lk_vis",null);
  if(v&&v.at&&Date.now()-v.at>=Math.max(lkCfg().delay_s*1000,LK_GRACE))lkLock("boot");
  else setTimeout(()=>{if(State.token&&!LK.shown)lkBack();},400);
})();
