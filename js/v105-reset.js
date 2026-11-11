// ── 10.5.0 · Mot de passe oublié protégé : empreinte, visage ou code du téléphone avant le code à 6 chiffres ──
function rpIco(k){
  const p={fp:'<path d="M12 11v2a8 8 0 0 0 1 4"/><path d="M8 11a4 4 0 0 1 8 0v1"/><path d="M5 12a7 7 0 0 1 14 0c0 2-.3 3.5-1 5"/><path d="M9 15c.3 1.6 1 3 2 4"/>',
    face:'<path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M20 16v2a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 10v1"/><path d="M15 10v1"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>',
    lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    warn:'<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    pc:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    back:'<path d="M15 6l-6 6 6 6"/>'}[k]||"";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
function rpT(k,v){let s=t(k);if(v)Object.keys(v).forEach(x=>{s=s.split(`{${x}}`).join(v[x]);});return s;}
function rpLocale(){const l=(typeof State!=="undefined"&&State.lang)||document.documentElement.lang||"fr";return {fr:"fr-FR",en:"en-GB",es:"es-ES",ar:"ar",sw:"sw",ln:"fr-CD"}[l]||l;}
function rpWhen(iso){try{return new Date(iso).toLocaleString(rpLocale(),{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});}catch(_){return iso||"";}}
function rpLeft(iso){const ms=Math.max(0,new Date(iso).getTime()-Date.now());const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);return rpT("rp_h_m",{h,m});}

// Remet à zéro l'état propre à la 10.5.0 à chaque ouverture
const _rpOpen=rsOpen;
rsOpen=function(o){Object.assign(RS,{rpLocal:true,rpSites:[],rpUnpro:false,rpRemoved:false,rpWhy:"",rpRel:null,rpDelay:24,rpAt:0});return _rpOpen(o);};

// Demande du code : un compte protégé passe d'abord par le téléphone
rsAsk=async function(again){
  rsSave();
  const em=(RS.email||"").trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){RS.err=t("rs_bad_email");rsRender();document.getElementById("rs-email")?.focus();return;}
  if(RS.busy)return;RS.busy=true;RS.err="";rsRender();
  try{
    const r=await rsPost("/auth/password-reset/request",{email:em,tz:rsTz()});
    RS.masked=r.masked||em;RS.lastEmail=em.toLowerCase();RS.busy=false;
    if(r.needs_device){
      Object.assign(RS,{step:"device",rpLocal:!!r.has_local,rpSites:Array.isArray(r.sites)?r.sites:[],rpUnpro:false});
      rsRender();setTimeout(()=>document.getElementById("rp-unlock")?.focus({preventScroll:true}),40);return;
    }
    RS.rpUnpro=r.protected===false;
    RS.resendAt=Date.now()+(r.resend_s||60)*1000;RS.step="code";RS.code="";RS.autoSent=false;
    rsRender();rsStartTick();
    if(again&&typeof showToast==="function")showToast(t("rs_resent"));
    setTimeout(()=>document.getElementById("rs-code")?.focus({preventScroll:true}),40);
  }catch(e){
    RS.busy=false;
    if(e.code==="wait"&&e.wait){RS.resendAt=Date.now()+e.wait*1000;if(RS.step!=="code"&&RS.masked&&RS.lastEmail===em.toLowerCase())RS.step="code";}
    RS.err=e.message;rsRender();if(RS.step==="code")rsStartTick();
  }
};

async function rpUnlock(via){
  if(RS.busy)return;
  if(!window.PublicKeyCredential||!navigator.credentials||typeof lkGetOpts!=="function"){RS.err=t("rp_dev_unsupported");rsRender();return;}
  RS.busy=true;RS.err="";rsRender();
  let cred=null;
  try{
    const o=await rsPost("/auth/password-reset/device/options",{email:RS.email,via:via||null});
    cred=await navigator.credentials.get({publicKey:lkGetOpts(o)});
    if(!cred)throw Object.assign(new Error(t("rp_dev_cancel")),{name:"NotAllowedError"});
  }catch(e){
    RS.busy=false;
    RS.err=e&&(e.name==="NotAllowedError"||e.name==="AbortError")?t("rp_dev_cancel"):(e&&e.code==="no_credential"?t("rp_dev_none"):((e&&e.message)||t("rp_dev_cancel")));
    rsRender();return;
  }
  try{
    const r=await rsPost("/auth/password-reset/device/verify",{email:RS.email,credential:lkCredOut(cred,false),tz:rsTz()});
    RS.masked=r.masked||RS.masked;RS.resendAt=Date.now()+(r.resend_s||60)*1000;
    Object.assign(RS,{busy:false,step:"code",code:"",autoSent:false,rpUnpro:false});
    rsRender();rsStartTick();
    if(typeof showToast==="function")showToast(t("rp_dev_ok"));
    setTimeout(()=>document.getElementById("rs-code")?.focus({preventScroll:true}),40);
  }catch(e){
    RS.busy=false;RS.err=e.message;
    if(e.code==="wait"&&e.wait){RS.resendAt=Date.now()+e.wait*1000;RS.step="code";rsRender();rsStartTick();return;}
    rsRender();
  }
}

async function rpLostSend(){
  const w=document.getElementById("rp-why");if(w)RS.rpWhy=w.value;
  if(RS.busy)return;RS.busy=true;RS.err="";rsRender();
  try{
    const r=await rsPost("/auth/password-reset/recovery",{email:RS.email,reason:(RS.rpWhy||"").trim()||null,tz:rsTz()});
    Object.assign(RS,{busy:false,step:"wait",rpRel:r.release_at,rpDelay:r.delay_hours||24,rpAt:Date.now(),masked:r.masked||RS.masked});
    rsRender();
  }catch(e){RS.busy=false;RS.err=e.message;rsRender();}
}
function rpToCode(){Object.assign(RS,{step:"code",err:"",code:"",autoSent:false,resendAt:Date.now()+60000});rsRender();rsStartTick();setTimeout(()=>document.getElementById("rs-code")?.focus({preventScroll:true}),40);}
function rpInvite(go){
  if(go){try{localStorage.setItem("zd_rp_invite","1");}catch(_){}}
  RS.rpUnpro=false;RS.rpRemoved=false;
  if(!go){rsRender();return;}
  if(!State.token&&document.getElementById("landing")?.style.display!=="none"&&typeof hideLanding==="function")hideLanding("login");
  rsToLogin();
}

const _rpRender=rsRender;
rsRender=function(){
  const ov=document.getElementById("zd-reset");if(!ov)return;
  if(!["device","lost","wait"].includes(RS.step)){
    _rpRender();
    if(RS.step==="code"&&RS.rpUnpro){
      const head=ov.querySelector(".rs-head");
      if(head&&!ov.querySelector(".rp-warn"))head.insertAdjacentHTML("afterend",`<div class="rp-warn" role="note">${rpIco("warn")}<span>${esc(t("rp_nopro_warn"))}</span></div>`);
    }
    if(RS.step==="done"&&(RS.rpUnpro||RS.rpRemoved)){
      const head=ov.querySelector(".rs-head");
      ov.querySelector(".rs-done .rs-note")?.remove();
      if(head&&!ov.querySelector(".rp-card"))head.insertAdjacentHTML("afterend",`<div class="rp-card">
        <div class="rp-card-h">${rpIco("shield")}<b>${esc(t("rp_inv_t"))}</b></div>
        ${RS.rpRemoved?`<p>${esc(t("rp_phone_removed"))}</p>`:""}<p>${esc(t("rp_inv_x"))}</p>
        <button type="button" class="rs-go" id="rp-inv-go" onclick="rpInvite(true)">${esc(t("rp_inv_go"))}</button>
        <button type="button" class="rp-alt" onclick="rpInvite(false)">${esc(t("rp_inv_later"))}</button></div>`);
    }
    return;
  }
  const fid=document.activeElement&&ov.contains(document.activeElement)?document.activeElement.id:null;
  let h="";
  if(RS.step==="device"){
    const other=!RS.rpLocal;
    h=`<button type="button" class="rs-top-link" onclick="RS.step='ask';RS.err='';rsRender()">${rpIco("back")}${esc(t("rs_change_email"))}</button>
      <div class="rs-head"><b class="rs-t" id="rs-title">${esc(t("rp_dev_t"))}</b><p>${esc(t("rp_dev_x"))}</p></div>
      <div class="rp-bio"><div class="rp-bio-ics">${rpIco("fp")}${rpIco("face")}${rpIco("lock")}</div><span>${esc(t("rp_dev_kinds"))}</span></div>
      ${other?`<div class="rp-warn" role="note">${rpIco("warn")}<span>${esc(rpT("rp_dev_other_site",{s:(RS.rpSites||[]).join(", ")||"Zenith Dash"}))}</span></div>`:""}
      ${rsErrBox()}
      ${other?"":`<button type="button" class="rs-go" id="rp-unlock" onclick="rpUnlock()"${RS.busy?" disabled":""}>${esc(RS.busy?t("rp_dev_wait"):t("rp_dev_go"))}</button>
      ${typeof lkMobile==="function"&&!lkMobile()?`<button type="button" class="rp-alt" id="rp-unlock-phone" onclick="rpUnlock('phone')"${RS.busy?" disabled":""}>${rpIco("phone")}${esc(t("rp_dev_phone"))}</button>`:""}`}
      <p class="rp-small">${esc(t("rp_dev_privacy"))}</p>
      <div class="rs-grow"></div>
      <button type="button" class="rp-link" id="rp-lost" onclick="RS.step='lost';RS.err='';rsRender()">${esc(t("rp_dev_lost"))}</button>`;
  }else if(RS.step==="lost"){
    h=`<button type="button" class="rs-top-link" onclick="RS.step='device';RS.err='';rsRender()">${rpIco("back")}${esc(t("rp_back"))}</button>
      <div class="rs-head"><b class="rs-t" id="rs-title">${esc(t("rp_lost_t"))}</b><p>${esc(t("rp_lost_x"))}</p></div>
      <div class="rp-card">
        <div class="rp-line">${rpIco("clock")}<span><b>${esc(rpT("rp_lost_wait_b",{h:RS.rpDelay||24}))}</b>${esc(t("rp_lost_wait_x"))}</span></div>
        <div class="rp-line">${rpIco("mail")}<span><b>${esc(t("rp_lost_mail_b"))}</b>${esc(t("rp_lost_mail_x"))}</span></div>
      </div>
      <form class="rs-form" onsubmit="event.preventDefault();rpLostSend()" novalidate>
        <label class="rs-lbl" for="rp-why">${esc(t("rp_lost_why"))}</label>
        <textarea class="rs-in rp-why" id="rp-why" rows="3" maxlength="500" oninput="RS.rpWhy=this.value">${esc(RS.rpWhy||"")}</textarea>
        ${rsErrBox()}
        <button type="submit" class="rs-go" id="rp-lost-send"${RS.busy?" disabled":""}>${esc(RS.busy?t("rs_sending"):t("rp_lost_send"))}</button>
      </form>`;
  }else{
    const total=(RS.rpDelay||24)*3600000,rel=new Date(RS.rpRel||Date.now()).getTime();
    const pct=Math.min(100,Math.max(3,Math.round((1-(rel-Date.now())/total)*100)));
    h=`<div class="rs-head"><span class="rs-ic">${rpIco("clock")}</span><b class="rs-t" id="rs-title">${esc(t("rp_wait_t"))}</b></div>
      <div class="rp-card">
        <b>${esc(rpT("rp_wait_when",{d:rpWhen(RS.rpRel)}))}</b>
        <div class="rp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
        <p>${esc(rpT("rp_wait_left",{t:rpLeft(RS.rpRel)}))}</p>
      </div>
      <div class="rp-warn" role="note">${rpIco("warn")}<span>${esc(t("rp_wait_notme"))}</span></div>
      <button type="button" class="rs-go" id="rp-have-code" onclick="rpToCode()">${esc(t("rp_wait_code"))}</button>
      <div class="rs-grow"></div>
      <div class="rs-help"><button type="button" class="rs-wa" onclick="rsSupport()">${typeof rsIco==="function"?rsIco("wa"):""}${esc(t("rp_wa"))}</button></div>`;
  }
  ov.className=`zd-reset rs-st-${RS.step}`;
  ov.setAttribute("aria-labelledby","rs-title");
  ov.innerHTML=`<div class="rs-box">${h}</div>`;
  if(fid){const f=document.getElementById(fid);if(f)try{f.focus({preventScroll:true});}catch(_){}}
};

// Fin : le compte n'était pas protégé (ou son téléphone vient d'être retiré) → invitation à activer
rsDone=(function(prev){return async function(){
  rsSave();
  const r=rsRules(RS.pw);
  if(RS.need2fa&&!(RS.c2||"").trim()){RS.err=t("rs_need_2fa");rsRender();document.getElementById("rs-2fa")?.focus();return;}
  if(!r.len){RS.err=t("rs_rule_len");rsRender();document.getElementById("rs-pw")?.focus();return;}
  if(!r.mix){RS.err=t("rs_rule_mix");rsRender();document.getElementById("rs-pw")?.focus();return;}
  if(RS.pw!==RS.pw2){RS.err=t("rs_mismatch");rsRender();document.getElementById("rs-pw2")?.focus();return;}
  if(RS.busy)return;RS.busy=true;RS.err="";rsRender();
  try{
    const d=await rsPost("/auth/password-reset/complete",{token:RS.token,password:RS.pw,code_2fa:RS.need2fa?RS.c2:null,tz:rsTz()});
    RS.rpRemoved=!!d.phone_removed;RS.rpUnpro=d.protected===false&&!RS.admin;
    RS.busy=false;RS.step="done";RS.token=null;RS.pw=RS.pw2=RS.c2="";rsRender();
    setTimeout(()=>document.getElementById(RS.rpUnpro||RS.rpRemoved?"rp-inv-go":"rs-login")?.focus({preventScroll:true}),40);
  }catch(e){
    RS.busy=false;RS.err=e.message;
    if(e.code==="expired"){RS.step="ask";RS.token=null;}
    if(e.code==="bad_2fa")RS.c2="";
    rsRender();
  }
};})(rsDone);

// ── Lien « Ce n'est pas moi » reçu par e-mail : ?recovery_cancel=… ──
function rpCancelView(tok){
  let ov=document.getElementById("zd-reset");
  if(!ov){ov=document.createElement("div");ov.id="zd-reset";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");document.body.appendChild(ov);}
  ov.style.display="flex";ov.className="zd-reset rs-st-cancel";ov.setAttribute("aria-labelledby","rs-title");document.body.classList.add("zd-reset-open");
  const close=`<button type="button" class="rp-alt" onclick="rpCancelClose()">${esc(t("btn_close"))}</button>`;
  const draw=(st,msg)=>{
    let h;
    if(st==="ask")h=`<div class="rs-head"><span class="rs-ic">${rpIco("warn")}</span><b class="rs-t" id="rs-title">${esc(t("rp_cancel_t"))}</b><p>${esc(t("rp_cancel_x"))}</p></div>
      ${msg?`<div class="rs-err" role="alert">${esc(msg)}</div>`:""}
      <button type="button" class="rs-go rp-danger" id="rp-cancel-go">${esc(t("rp_cancel_go"))}</button>${close}`;
    else if(st==="done")h=`<div class="rs-head rs-done"><span class="rs-ic ok">${rpIco("shield")}</span><b class="rs-t" id="rs-title">${esc(t("rp_cancel_done_t"))}</b><p>${esc(t("rp_cancel_done_x"))}</p></div>${close}`;
    else h=`<div class="rs-head"><b class="rs-t" id="rs-title">${esc(t("rp_cancel_bad"))}</b></div>${close}`;
    ov.innerHTML=`<div class="rs-box">${h}</div>`;
    const go=document.getElementById("rp-cancel-go");
    if(go)go.onclick=async()=>{go.disabled=true;try{await rsPost("/auth/password-reset/recovery/cancel",{token:tok});draw("done");}catch(e){if(e.status===404)draw("bad");else draw("ask",e.message);}};
  };
  draw("ask");
}
function rpCancelClose(){const ov=document.getElementById("zd-reset");if(ov){ov.style.display="none";ov.innerHTML="";}document.body.classList.remove("zd-reset-open");}
(function(){
  try{
    const u=new URL(location.href),tok=u.searchParams.get("recovery_cancel");
    if(!tok)return;
    u.searchParams.delete("recovery_cancel");history.replaceState(null,"",u.pathname+(u.search||"")+u.hash);
    if(/^[A-Za-z0-9_-]{10,200}$/.test(tok))setTimeout(()=>rpCancelView(tok),300);
  }catch(_){}
})();

// ── Après la connexion : ouvrir Profil → Sécurité si l'invitation a été acceptée ──
if(typeof showAppLayout==="function"){
  const _rpSAL=showAppLayout;
  showAppLayout=async function(){
    const r=await _rpSAL.apply(this,arguments);
    let want=false;try{want=localStorage.getItem("zd_rp_invite")==="1";localStorage.removeItem("zd_rp_invite");}catch(_){}
    if(want&&State.token&&State.tenant?.account_type!=="client")setTimeout(()=>{try{navigate("profile");}catch(_){}
      setTimeout(()=>{const c=document.getElementById("zd-rp-card");if(c)c.scrollIntoView({behavior:"smooth",block:"center"});showToast(t("rp_invite_toast"));},900);},400);
    return r;
  };
}

// ── Profil → Sécurité : carte « Protection mot de passe oublié » ──
if(typeof lkRenderSettings==="function"){
  const _rpLRS=lkRenderSettings;
  lkRenderSettings=async function(){
    const r=await _rpLRS.apply(this,arguments);
    try{rpRenderCard();}catch(_){}
    return r;
  };
}
async function rpRenderCard(){
  const lk=document.getElementById("zd-lk-settings");if(!lk||typeof LK==="undefined"||!LK.st)return;
  let box=document.getElementById("zd-rp-card");
  if(!box){box=document.createElement("div");box.id="zd-rp-card";box.className="es-keep";lk.after(box);}
  const cr=LK.st.credentials||[];const here=typeof lkBioLocal==="function"?lkBioLocal():null;
  const sup=typeof lkBioSupported==="function"?await lkBioSupported():false;
  const mine=cr.some(c=>c.id===here);
  const icon=n=>/iphone|android|mobile|phone|téléphone|tablet|ipad/i.test(n||"")?rpIco("phone"):rpIco("pc");
  box.innerHTML=`<div class="card rp-prof" style="margin-bottom:16px">
    <div class="rp-card-h">${rpIco("shield")}<b>${esc(t("rp_card_t"))}</b><span class="rp-badge${cr.length?" on":""}">${esc(cr.length?t("rp_card_on_badge"):t("rp_card_off_badge"))}</span></div>
    <p class="rp-small">${esc(t("rp_card_x"))}</p>
    ${cr.length?cr.map(c=>`<div class="rp-dev">${icon(c.name)}<span><b>${esc(c.name||"")}</b>${c.id===here?` · ${esc(t("lk_this_dev"))}`:""}<br><small>${esc(rpT("rp_card_on",{d:c.created_at&&typeof fmtDate==="function"?fmtDate(c.created_at):""}))}</small></span>
      <button type="button" class="btn btn-o btn-sm lk-rm" onclick="lkRemove('${escJs(c.id)}')">${esc(t("lk_remove"))}</button></div>`).join(""):`<div class="rp-warn">${rpIco("warn")}<span>${esc(t("rp_card_none"))}</span></div>`}
    ${!mine&&sup?`<button type="button" class="btn btn-g" id="rp-add" style="width:100%;min-height:46px" onclick="lkRegister()">${esc(t("rp_card_add"))}</button>`:""}
    <p class="rp-small">${esc(t("rp_card_same"))}</p></div>`;
}

// ── Admin : demandes de récupération (téléphone perdu) ──
let _rpa=null;
async function rpaLoad(){
  const host=document.getElementById("fs-admin")||document.getElementById("fa-admin");if(!host||!State.tenant?.is_creator)return;
  let box=document.getElementById("rp-admin");if(!box){box=document.createElement("div");box.id="rp-admin";box.style.marginTop="12px";host.after(box);}
  try{_rpa=await api("GET","/admin/recoveries");rpaRender();}catch(_){box.innerHTML="";}
}
function rpaRender(){
  const box=document.getElementById("rp-admin");if(!box||!_rpa)return;const a=_rpa;
  const st={pending:"",sent:"Code envoyé",used:"Terminée",cancelled:"Annulée par le titulaire",refused:"Refusée"};
  const rows=a.rows.map(r=>`<tr><td><b>${esc(r.account)}</b><br><small>${esc(r.email)}${r.phone?` · ${esc(r.phone)}`:""}</small></td>
    <td>${esc(rpWhen(r.created_at))}</td><td>${esc(r.device||"")}<br><small>${esc(r.ip||"")}</small></td><td>${esc(r.reason||"—")}</td>
    <td>${r.status==="pending"?`Dans ${esc(rpLeft(r.release_at))}`:r.sent_at?`Envoyé le ${esc(rpWhen(r.sent_at))}`:"—"}</td>
    <td>${r.status==="pending"?`<span style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn btn-g btn-sm" onclick="rpaDo('${escJs(r.id)}','approve')">Valider</button><button type="button" class="btn btn-o btn-sm" style="color:var(--red)" onclick="rpaDo('${escJs(r.id)}','refuse')">Refuser</button></span>`:`<span style="font-weight:700;color:${r.status==="cancelled"||r.status==="refused"?"var(--red)":"var(--green)"}">${esc(st[r.status]||r.status)}</span>${r.decided_by?`<br><small>${esc(r.decided_by)}</small>`:""}`}</td></tr>`).join("");
  box.innerHTML=`<div class="card fa-card">
    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><div style="font-weight:800;font-size:15px"><i class="ti ti-key" style="color:var(--green)"></i> Demandes de récupération (téléphone perdu)</div>
      <span class="adm-pill ${a.pending?"p-gift":"p-cli"}">${a.pending} en attente</span></div>
    <div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Compte</th><th>Demandé le</th><th>Appareil / IP</th><th>Motif</th><th>Code</th><th>Action</th></tr></thead>
      <tbody>${rows||`<tr><td colspan="6" style="color:var(--muted)">Aucune demande</td></tr>`}</tbody></table></div>
    <div class="fl" style="margin-top:10px">Délai de sécurité</div>
    <div class="fs-opts">${[12,24,48].map(h=>`<label class="fs-opt${a.settings.delay_hours===h?" on":""}"><input type="radio" name="rp-delay" value="${h}" ${a.settings.delay_hours===h?"checked":""} onchange="rpaDelay(${h})"><span><b>${h} h</b></span></label>`).join("")}</div>
    <small class="cm-hint">Avant de valider, vérifie que c'est bien la personne (par exemple un appel au numéro du compte). Sans action de ta part, le code part tout seul après le délai, sauf si le titulaire a cliqué « Ce n'est pas moi ». Après le changement de mot de passe, le téléphone perdu est retiré de la protection du compte.</small></div>`;
}
async function rpaDo(id,action){
  if(!confirm(action==="approve"?"Valider la demande et envoyer le code maintenant par e-mail ?":"Refuser cette demande ?"))return;
  try{_rpa=await api("POST",`/admin/recoveries/${encodeURIComponent(id)}`,{action});rpaRender();showToast(action==="approve"?"Code envoyé ✓":"Demande refusée");}catch(e){showToast(e.message,"error");}
}
async function rpaDelay(h){try{_rpa=await api("PUT","/admin/recoveries/settings",{delay_hours:h});rpaRender();showToast("Enregistré ✓");}catch(e){showToast(e.message,"error");rpaRender();}}
if(typeof faRender==="function"){const _rpFaR=faRender;faRender=function(){_rpFaR();setTimeout(()=>{if(!document.getElementById("rp-admin")||!_rpa)rpaLoad();},50);};}
