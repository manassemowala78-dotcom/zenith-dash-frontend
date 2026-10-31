// ── 10.1.0 · Mot de passe oublié : code à 6 chiffres reçu par e-mail ──
const RS={step:"ask",from:"login",email:"",masked:"",token:null,name:"",need2fa:false,busy:false,err:"",info:"",resendAt:0,tick:null,reveal:false,pw:"",pw2:"",code:"",c2:""};
function rsT(k,v){let s=t(k);if(v)Object.keys(v).forEach(x=>{s=s.split(`{${x}}`).join(v[x]);});return s;}
function rsIco(k){
  const p={mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    key:'<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 20 3M17 6l3 3M14 9l2 2"/>',
    ok:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 10"/>',
    back:'<path d="M15 6l-6 6 6 6"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    wa:'<path d="M3 21l1.7-5A9 9 0 1 1 8 19.3z"/><path d="M9 10c0 3 2 5 5 5l1-1.5-2-1-1 1c-1-.5-1.5-1-2-2l1-1-1-2z"/>',
    shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'}[k]||"";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
async function rsPost(path,body){
  const ctl=typeof AbortController!=="undefined"?new AbortController():null;
  const to=setTimeout(()=>{try{ctl&&ctl.abort();}catch(_){}},25000);
  let r;
  try{r=await fetch(API_BASE+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:ctl?ctl.signal:undefined});}
  catch(e){const er=new Error(t("rs_net"));er.net=true;throw er;}
  finally{clearTimeout(to);}
  let d=null;try{d=await r.json();}catch(_){}
  if(!r.ok){
    const det=d&&d.detail;const er=new Error(t("server_error"));er.status=r.status;
    if(det&&typeof det==="object"){er.code=det.error;er.left=det.left;er.wait=det.wait_s;er.message=det.message||er.message;}
    else if(Array.isArray(det)||r.status===422)er.message=t("rs_bad_email");
    else if(typeof det==="string")er.message=det;
    throw er;
  }
  return d||{};
}
function rsTz(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||null;}catch(_){return null;}}
function rsOpen(o){
  o=o||{};
  clearInterval(RS.tick);
  Object.assign(RS,{step:"ask",from:o.from||"login",email:(o.email||"").trim(),masked:"",token:null,name:"",need2fa:false,busy:false,err:"",info:"",resendAt:0,reveal:false,pw:"",pw2:"",code:"",c2:""});
  let ov=document.getElementById("zd-reset");
  if(!ov){ov=document.createElement("div");ov.id="zd-reset";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");document.body.appendChild(ov);}
  ov.style.display="flex";document.body.classList.add("zd-reset-open");
  rsRender();
  setTimeout(()=>{const f=document.getElementById(RS.email?"rs-send":"rs-email");try{f&&f.focus({preventScroll:true});}catch(_){}},60);
}
function rsClose(){
  clearInterval(RS.tick);
  const ov=document.getElementById("zd-reset");if(ov){ov.style.display="none";ov.innerHTML="";}
  document.body.classList.remove("zd-reset-open");
  RS.token=null;RS.pw=RS.pw2=RS.code=RS.c2="";
  if(RS.from==="lock"&&typeof LK!=="undefined"&&LK.shown)setTimeout(()=>document.getElementById("zd-lk-pwd")?.focus(),40);
}
function rsSave(){
  const g=id=>{const e=document.getElementById(id);return e?e.value:null;};
  const em=g("rs-email");if(em!=null)RS.email=em.trim();
  const cd=g("rs-code");if(cd!=null)RS.code=cd;
  const p1=g("rs-pw");if(p1!=null)RS.pw=p1;
  const p2=g("rs-pw2");if(p2!=null)RS.pw2=p2;
  const c2=g("rs-2fa");if(c2!=null)RS.c2=c2;
}
function rsRules(pw){return {len:pw.length>=8,mix:/[A-Za-zÀ-ÿ]/.test(pw)&&/[0-9]/.test(pw)};}
function rsScore(pw){
  if(!pw)return 0;let s=0;const r=rsRules(pw);
  if(r.len)s++;if(r.mix)s++;if(pw.length>=12)s++;if(/[^A-Za-z0-9]/.test(pw)||(/[a-z]/.test(pw)&&/[A-Z]/.test(pw)))s++;
  return Math.max(1,s);
}
function rsWait(){return Math.max(0,Math.ceil((RS.resendAt-Date.now())/1000));}
function rsTick(){
  const b=document.getElementById("rs-resend");if(!b){clearInterval(RS.tick);return;}
  const w=rsWait();b.disabled=w>0||RS.busy;b.textContent=w>0?rsT("rs_resend_in",{n:w}):t("rs_resend");
  if(w<=0)clearInterval(RS.tick);
}
function rsStartTick(){clearInterval(RS.tick);RS.tick=setInterval(rsTick,1000);rsTick();}
function rsErrBox(){return RS.err?`<div class="rs-err" role="alert">${esc(RS.err)}</div>`:"";}
function rsRender(){
  const ov=document.getElementById("zd-reset");if(!ov)return;
  const fid=document.activeElement&&ov.contains(document.activeElement)?document.activeElement.id:null;
  const logo=`<div class="rs-logo"><span class="rs-logo-mark" aria-hidden="true"></span>Zenith<span>Dash</span></div>`;
  const backTxt=RS.from==="lock"?t("rs_back_lock"):t("rs_back_login");
  let h="";
  if(RS.step==="ask"){
    h=`<button type="button" class="rs-top-link" onclick="rsClose()">${rsIco("back")}${esc(backTxt)}</button>${logo}
      <div class="rs-head"><span class="rs-ic">${rsIco("key")}</span><b class="rs-t" id="rs-title">${esc(t("rs_forgot"))}</b><p>${esc(t("rs_ask_x"))}</p></div>
      <form class="rs-form" onsubmit="event.preventDefault();rsAsk()" novalidate>
        <label class="rs-lbl" for="rs-email">${esc(t("rs_email_lbl"))}</label>
        <input class="rs-in" id="rs-email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" maxlength="320" value="${esc(RS.email)}" placeholder="vous@exemple.com">
        ${rsErrBox()}
        <button type="submit" class="rs-go" id="rs-send"${RS.busy?" disabled":""}>${esc(RS.busy?t("rs_sending"):t("rs_get_code"))}</button>
      </form>
      <div class="rs-grow"></div>
      <div class="rs-help"><span>${esc(t("rs_no_access"))}</span><button type="button" class="rs-wa" onclick="rsSupport()">${rsIco("wa")}${esc(t("rs_wa"))}</button></div>`;
  }else if(RS.step==="code"){
    const w=rsWait();
    h=`<button type="button" class="rs-top-link" onclick="RS.step='ask';RS.err='';rsRender()">${rsIco("back")}${esc(t("rs_change_email"))}</button>
      <div class="rs-head"><span class="rs-ic">${rsIco("mail")}</span><b class="rs-t" id="rs-title">${esc(t("rs_check_t"))}</b>
        <p>${esc(t("rs_check_x1"))} <b class="rs-mask">${esc(RS.masked)}</b>${esc(t("rs_check_x2"))}</p></div>
      <form class="rs-form" onsubmit="event.preventDefault();rsVerify()" novalidate>
        <label class="rs-lbl" for="rs-code">${esc(t("rs_code_lbl"))}</label>
        <input class="rs-in rs-code" id="rs-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]*" maxlength="7" placeholder="••• •••" value="${esc(RS.code)}" oninput="rsCodeInput(this)">
        ${rsErrBox()}
        <button type="submit" class="rs-go" id="rs-check"${RS.busy?" disabled":""}>${esc(t("rs_continue"))}</button>
      </form>
      <div class="rs-grow"></div>
      <div class="rs-help"><span>${esc(t("rs_spam"))}</span><button type="button" class="rs-resend" id="rs-resend" onclick="rsAsk(true)"${w>0||RS.busy?" disabled":""}>${esc(w>0?rsT("rs_resend_in",{n:w}):t("rs_resend"))}</button></div>`;
  }else if(RS.step==="new"){
    const r=rsRules(RS.pw),sc=rsScore(RS.pw);
    const lvl=["","weak","fair","good","strong"][sc];
    const rule=(okv,txt,neutral)=>`<span class="rs-rule${neutral?"":okv?" ok":""}"><span class="rs-dot" aria-hidden="true">${neutral?"•":okv?"✓":"•"}</span>${esc(txt)}</span>`;
    h=`${logo}<div class="rs-head"><b class="rs-t" id="rs-title">${esc(t("rs_new_t"))}</b><p>${esc(rsT("rs_new_for",{n:RS.name||RS.email}))}</p></div>
      <form class="rs-form" onsubmit="event.preventDefault();rsDone()" novalidate>
        <input type="text" name="username" autocomplete="username" value="${esc(RS.email)}" hidden readonly>
        ${RS.need2fa?`<div class="rs-2fa">${rsIco("shield")}<div><label class="rs-lbl" for="rs-2fa">${esc(t("rs_2fa_lbl"))}</label>
          <input class="rs-in" id="rs-2fa" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="20" placeholder="123 456" value="${esc(RS.c2)}"><span class="rs-sub">${esc(t("rs_2fa_x"))}</span></div></div>`:""}
        <label class="rs-lbl" for="rs-pw">${esc(t("rs_new_lbl"))}</label>
        <span class="rs-field"><input class="rs-in" id="rs-pw" type="${RS.reveal?"text":"password"}" autocomplete="new-password" maxlength="128" value="${esc(RS.pw)}" oninput="rsPwInput()">
          <button type="button" class="rs-eye" aria-label="${esc(t("lk_show_pwd"))}" aria-pressed="${RS.reveal?"true":"false"}" onclick="rsSave();RS.reveal=!RS.reveal;rsRender();document.getElementById('rs-pw')?.focus()">${rsIco("eye")}</button></span>
        <div class="rs-meter ${lvl}" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <div class="rs-rules" id="rs-rules">${rule(r.len,t("rs_rule_len"))}${rule(r.mix,t("rs_rule_mix"))}${rule(false,t("rs_rule_old"),true)}</div>
        <label class="rs-lbl" for="rs-pw2">${esc(t("rs_again_lbl"))}</label>
        <input class="rs-in" id="rs-pw2" type="${RS.reveal?"text":"password"}" autocomplete="new-password" maxlength="128" value="${esc(RS.pw2)}">
        <div class="rs-note">${rsIco("info")}<span>${esc(t("rs_signout_note"))}</span></div>
        ${rsErrBox()}
        <button type="submit" class="rs-go" id="rs-save"${RS.busy?" disabled":""}>${esc(RS.busy?t("rs_saving"):t("rs_save"))}</button>
      </form>`;
  }else{
    h=`${logo}<div class="rs-head rs-done"><span class="rs-ic ok">${rsIco("ok")}</span><b class="rs-t" id="rs-title">${esc(t("rs_done_t"))}</b><p>${esc(t("rs_done_x"))}</p>
        <div class="rs-note">${rsIco("shield")}<span>${esc(t("rs_done_bio"))}</span></div></div>
      <div class="rs-grow"></div>
      <button type="button" class="rs-go" id="rs-login" onclick="rsToLogin()">${esc(t("btn_login"))}</button>`;
  }
  ov.className=`zd-reset rs-st-${RS.step}`;
  ov.setAttribute("aria-labelledby","rs-title");
  ov.innerHTML=`<div class="rs-box">${h}</div>`;
  if(fid){const f=document.getElementById(fid);if(f)try{f.focus({preventScroll:true});}catch(_){}}
}
function rsCodeInput(el){
  const d=el.value.replace(/\D/g,"").slice(0,6);
  const v=d.length>3?d.slice(0,3)+" "+d.slice(3):d;
  if(el.value!==v)el.value=v;
  RS.code=v;
  if(d.length===6&&!RS.busy&&!RS.autoSent){RS.autoSent=true;rsVerify();}
  if(d.length<6)RS.autoSent=false;
}
function rsPwInput(){
  const pw=document.getElementById("rs-pw")?.value||"";RS.pw=pw;
  const r=rsRules(pw),sc=rsScore(pw);
  const m=document.querySelector("#zd-reset .rs-meter");if(m)m.className="rs-meter "+["","weak","fair","good","strong"][sc];
  const rules=document.querySelectorAll("#rs-rules .rs-rule");
  [[0,r.len],[1,r.mix]].forEach(([i,v])=>{const el=rules[i];if(!el)return;el.classList.toggle("ok",v);const d=el.querySelector(".rs-dot");if(d)d.textContent=v?"✓":"•";});
}
async function rsAsk(again){
  rsSave();
  const em=(RS.email||"").trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){RS.err=t("rs_bad_email");rsRender();document.getElementById("rs-email")?.focus();return;}
  if(RS.busy)return;RS.busy=true;RS.err="";rsRender();
  try{
    const r=await rsPost("/auth/password-reset/request",{email:em,tz:rsTz()});
    RS.masked=r.masked||em;RS.lastEmail=em.toLowerCase();RS.resendAt=Date.now()+(r.resend_s||60)*1000;RS.step="code";RS.code="";RS.autoSent=false;
    RS.busy=false;rsRender();rsStartTick();
    if(again&&typeof showToast==="function")showToast(t("rs_resent"));
    setTimeout(()=>document.getElementById("rs-code")?.focus({preventScroll:true}),40);
  }catch(e){
    RS.busy=false;
    if(e.code==="wait"&&e.wait){RS.resendAt=Date.now()+e.wait*1000;if(RS.step!=="code"&&RS.masked&&RS.lastEmail===em.toLowerCase())RS.step="code";}
    RS.err=e.message;rsRender();if(RS.step==="code")rsStartTick();
  }
}
async function rsVerify(){
  rsSave();
  const d=(RS.code||"").replace(/\D/g,"");
  if(d.length!==6){RS.err=t("rs_code_6");rsRender();document.getElementById("rs-code")?.focus();return;}
  if(RS.busy)return;RS.busy=true;RS.err="";rsRender();
  try{
    const r=await rsPost("/auth/password-reset/verify",{email:RS.email,code:d});
    Object.assign(RS,{token:r.token,name:r.name||"",need2fa:!!r.requires_2fa,step:"new",busy:false,err:"",pw:"",pw2:"",c2:""});
    if(r.email)RS.email=r.email;
    clearInterval(RS.tick);rsRender();
    setTimeout(()=>document.getElementById(RS.need2fa?"rs-2fa":"rs-pw")?.focus({preventScroll:true}),40);
  }catch(e){
    RS.busy=false;RS.err=e.message;RS.code="";RS.autoSent=false;
    rsRender();rsStartTick();const f=document.getElementById("rs-code");if(f){f.value="";f.focus();}
  }
}
async function rsDone(){
  rsSave();
  const r=rsRules(RS.pw);
  if(RS.need2fa&&!(RS.c2||"").trim()){RS.err=t("rs_need_2fa");rsRender();document.getElementById("rs-2fa")?.focus();return;}
  if(!r.len){RS.err=t("rs_rule_len");rsRender();document.getElementById("rs-pw")?.focus();return;}
  if(!r.mix){RS.err=t("rs_rule_mix");rsRender();document.getElementById("rs-pw")?.focus();return;}
  if(RS.pw!==RS.pw2){RS.err=t("rs_mismatch");rsRender();document.getElementById("rs-pw2")?.focus();return;}
  if(RS.busy)return;RS.busy=true;RS.err="";rsRender();
  try{
    await rsPost("/auth/password-reset/complete",{token:RS.token,password:RS.pw,code_2fa:RS.need2fa?RS.c2:null,tz:rsTz()});
    RS.busy=false;RS.step="done";RS.token=null;RS.pw=RS.pw2=RS.c2="";rsRender();
    setTimeout(()=>document.getElementById("rs-login")?.focus({preventScroll:true}),40);
  }catch(e){
    RS.busy=false;RS.err=e.message;
    if(e.code==="expired"){RS.step="ask";RS.token=null;}
    if(e.code==="bad_2fa")RS.c2="";
    rsRender();
  }
}
function rsToLogin(){
  const em=RS.email;const fromLock=RS.from==="lock";
  rsClose();
  if(fromLock||State.token){try{if(typeof lkHide==="function")lkHide();}catch(_){}try{doLogout();}catch(_){}}
  try{if(typeof showAuthTab==="function")showAuthTab("login");}catch(_){}
  const e=document.getElementById("login-email"),p=document.getElementById("login-password");
  if(e&&em)e.value=em;if(p){p.value="";setTimeout(()=>p.focus(),60);}
}
function rsSupport(){
  if(typeof openSupportWhatsapp==="function"){openSupportWhatsapp(t("rs_wa_topic"));return;}
  window.open("https://wa.me/?text="+encodeURIComponent(t("rs_wa_topic")),"_blank","noopener");
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.body.classList.contains("zd-reset-open")&&RS.step!=="done")rsClose();});

// ── Textes d'accessibilité traduits (aria-label) ──
function zdApplyAria(){document.querySelectorAll("[data-i18n-aria]").forEach(el=>{const v=t(el.getAttribute("data-i18n-aria"));if(v){el.setAttribute("aria-label",v);el.setAttribute("title",v);}});}
if(typeof applyLanguageNow==="function"){
  const _rsALN=applyLanguageNow;
  applyLanguageNow=function(){const r=_rsALN.apply(this,arguments);try{zdApplyAria();}catch(_){}return r;};
}
document.addEventListener("DOMContentLoaded",()=>{try{zdApplyAria();}catch(_){}});
