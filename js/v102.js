// ── 10.2.0 · Accès administrateur (rien n'est retenu par le navigateur) et envoi des e-mails ──
const ZA={step:"id",busy:false,err:"",challenge:null,fname:Math.random().toString(36).slice(2,9),reveal:false};
function zaIgn(){return 'autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other"';}
function zaSecret(){return typeof lkSecretOk==="function"&&lkSecretOk();}
function zdAdminOpen(){
  Object.assign(ZA,{step:"id",busy:false,err:"",challenge:null,reveal:false});
  let ov=document.getElementById("zd-admin");
  if(!ov){ov=document.createElement("div");ov.id="zd-admin";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-labelledby","za-title");document.body.appendChild(ov);}
  ov.style.display="flex";document.body.classList.add("zd-admin-open");
  zaRender();
  setTimeout(()=>document.getElementById("za-email")?.focus({preventScroll:true}),60);
}
function zaClose(){
  const ov=document.getElementById("zd-admin");if(ov){ov.style.display="none";ov.innerHTML="";}
  document.body.classList.remove("zd-admin-open");
  try{if(/[?&]acces=admin/.test(location.search))history.replaceState(null,"",location.pathname+location.hash);}catch(_){}
}
function zaRender(){
  const ov=document.getElementById("zd-admin");if(!ov)return;
  const keep={};["za-email","za-pw","za-code"].forEach(id=>{const e=document.getElementById(id);if(e)keep[id]=e.value;});
  const fid=document.activeElement&&ov.contains(document.activeElement)?document.activeElement.id:null;
  const sec=zaSecret();
  const pwAttrs=sec?`type="text" class="rs-in lk-secret${ZA.reveal?" lk-reveal":""}"`:`type="${ZA.reveal?"text":"password"}" class="rs-in"`;
  const err=ZA.err?`<div class="rs-err" role="alert">${esc(ZA.err)}</div>`:"";
  const body=ZA.step==="id"?`
      <label class="rs-lbl" for="za-email">${esc(t("za_email"))}</label>
      <input class="rs-in" id="za-email" type="text" inputmode="email" name="za-${ZA.fname}-a" maxlength="320" ${zaIgn()}>
      <label class="rs-lbl" for="za-pw">${esc(t("za_pwd"))}</label>
      <span class="rs-field"><input ${pwAttrs} id="za-pw" name="za-${ZA.fname}-b" maxlength="200" ${zaIgn()}>
        <button type="button" class="rs-eye" aria-label="${esc(t("lk_show_pwd"))}" aria-pressed="${ZA.reveal?"true":"false"}" onclick="ZA.reveal=!ZA.reveal;zaRender();document.getElementById('za-pw')?.focus()">${typeof rsIco==="function"?rsIco("eye"):""}</button></span>`
    :`<label class="rs-lbl" for="za-code">${esc(t("za_code"))}</label>
      <input class="rs-in rs-code" id="za-code" type="text" inputmode="numeric" name="za-${ZA.fname}-c" maxlength="20" placeholder="123 456" ${zaIgn()}>
      <span class="rs-sub">${esc(t("za_code_x"))}</span>`;
  ov.className="zd-reset za-ov";
  ov.innerHTML=`<div class="rs-box za-box">
    <div class="rs-logo"><span class="rs-logo-mark" aria-hidden="true"></span>Zenith<span>Dash</span></div>
    <div class="za-head"><span class="za-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/></svg></span><b class="rs-t" id="za-title">${esc(t("za_title"))}</b></div>
    <p class="za-x">${esc(t("za_x"))}</p>
    <form class="rs-form" autocomplete="off" onsubmit="event.preventDefault();zaSubmit()" novalidate ${'data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other"'}>
      ${body}${err}
      <button type="submit" class="rs-go za-go" id="za-go"${ZA.busy?" disabled":""}>${esc(ZA.busy?t("za_wait"):(ZA.step==="id"?t("za_enter"):t("btn_verify")))}</button>
    </form>
    ${ZA.step==="code"?`<button type="button" class="rs-top-link za-back" onclick="ZA.step='id';ZA.err='';ZA.challenge=null;zaRender()">${esc(t("btn_back"))}</button>`:""}
  </div>`;
  Object.keys(keep).forEach(id=>{const e=document.getElementById(id);if(e)e.value=keep[id];});
  if(fid){const f=document.getElementById(fid);if(f)try{f.focus({preventScroll:true});}catch(_){}}
}
async function zaSubmit(){
  if(ZA.busy)return;
  const g=id=>(document.getElementById(id)?.value||"");
  try{
    if(ZA.step==="id"){
      const email=g("za-email").trim(),password=g("za-pw");
      if(!email||!password){ZA.err=t("za_fill");zaRender();return;}
      ZA.busy=true;ZA.err="";zaRender();
      const r=await rsPost("/auth/login",{email,password,admin:true});
      ZA.busy=false;
      if(r.requires_2fa){ZA.challenge=r.challenge;ZA.step="code";zaRender();setTimeout(()=>document.getElementById("za-code")?.focus(),40);return;}
      return zaDone(r);
    }
    const code=g("za-code").trim();if(!code){ZA.err=t("za_code");zaRender();return;}
    ZA.busy=true;ZA.err="";zaRender();
    const r=await rsPost("/auth/login/2fa",{challenge:ZA.challenge,code});
    ZA.busy=false;zaDone(r);
  }catch(e){
    ZA.busy=false;ZA.err=e.message||t("server_error");
    if(e.status===401&&ZA.step==="code"&&/reconnecte|Délai/i.test(ZA.err)){ZA.step="id";ZA.challenge=null;}
    zaRender();
    const f=document.getElementById(ZA.step==="id"?"za-pw":"za-code");if(f){f.value="";f.focus();}
  }
}
function zaDone(r){
  State.token=r.token;State.tenant=r.user;
  localStorage.setItem("zd_token",r.token);localStorage.setItem("zd_tenant",JSON.stringify(r.user));
  ["za-email","za-pw","za-code"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  zaClose();
  try{document.getElementById("landing").style.display="none";}catch(_){}
  showAppLayout();
  if(typeof r.backup_codes_left==="number")showToast(t("backup_codes_left").replace("{n}",r.backup_codes_left),r.backup_codes_left<=2?"error":"info");
}
(function zaBoot(){
  const go=()=>{
    if(!/[?&]acces=admin\b/.test(location.search))return;
    if(State.token){try{history.replaceState(null,"",location.pathname+location.hash);}catch(_){}return;}
    zdAdminOpen();
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
})();

// ── Administration → Envoi des e-mails ──
async function zdMailCard(){
  const pg=document.getElementById("page-admin");if(!pg||!(State.tenant&&State.tenant.is_creator))return;
  let box=document.getElementById("zd-mail-card");
  if(!box){box=document.createElement("div");box.id="zd-mail-card";box.className="card zm-card";pg.querySelector(".sh")?pg.querySelector(".sh").after(box):pg.prepend(box);}
  let d;
  try{d=await api("GET","/admin/email");}catch(e){box.innerHTML=`<div style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;return;}
  const prov=d.provider==="brevo_api"?t("zm_api"):d.provider==="smtp"?t("zm_smtp"):t("zm_none");
  const okp=d.provider==="brevo_api";
  const rows=(d.logs||[]).map(l=>`<tr><td class="mono">${esc(fmtDateTime(l.at))}</td><td>${esc(l.kind||"")}</td><td class="mono">${esc(l.to||"—")}</td><td class="${l.ok?"zm-ok":"zm-ko"}">${l.ok?"✓ "+esc(t("zm_sent")):"✕ "+esc(l.error||t("zm_failed"))}</td></tr>`).join("");
  box.innerHTML=`<div class="zm-h"><i class="ti ti-mail" aria-hidden="true"></i><b>${esc(t("zm_title"))}</b></div>
    <div class="zm-grid">
      <div class="zm-tile${okp?" good":" bad"}"><span class="zm-cap">${esc(t("zm_method"))}</span><b>${esc(prov)}</b><span class="zm-sub">${esc(okp?t("zm_key_ok"):(d.provider==="smtp"?t("zm_smtp_warn"):t("zm_key_missing")))}</span></div>
      <div class="zm-tile"><span class="zm-cap">${esc(t("zm_sender"))}</span><b>${esc(d.sender||"—")}</b><span class="zm-sub">${esc(d.sender?t("zm_sender_x"):t("zm_sender_missing"))}</span></div>
      <div class="zm-tile"><span class="zm-cap">${esc(t("zm_try"))}</span><button type="button" class="btn btn-g btn-sm" id="zm-test" onclick="zdMailTest()"${d.enabled?"":" disabled"}><i class="ti ti-send" aria-hidden="true"></i> ${esc(t("zm_test"))}</button></div>
    </div>
    <div class="zm-cap" style="margin-top:12px">${esc(t("zm_last"))}</div>
    ${rows?`<div class="tbl-wrap"><table class="zm-t"><tbody>${rows}</tbody></table></div>`:`<div style="color:var(--muted);font-size:13px">${esc(t("zm_empty"))}</div>`}`;
}
async function zdMailTest(){
  const b=document.getElementById("zm-test");if(b)b.disabled=true;
  try{const r=await api("POST","/admin/email/test");showToast(t("zm_test_ok").replace("{to}",r.to));}
  catch(e){showToast(e.message,"error");}
  await zdMailCard();
}
if(typeof loadPage==="function"){
  const _zmLP=loadPage;
  let _zmAt=0;
  loadPage=async function(p){if(p==="admin"&&(!document.getElementById("zd-mail-card")||Date.now()-_zmAt>30000)){_zmAt=Date.now();setTimeout(zdMailCard,0);}return _zmLP.apply(this,arguments);};
}
