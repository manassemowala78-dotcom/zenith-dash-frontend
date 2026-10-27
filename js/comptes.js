// ── 9.7.0 · Mode client, notifications de mes autres comptes, gratuité, menus qui se ferment, chiffre de l'icône ──

// ── Mes messages me suivent : l'identité de messagerie (compte personnel) ──
function cmMsgId(){return State.tenant?.messaging_id||null;}
function cmFixIds(d){
  const mid=cmMsgId(),me=State.tenant?.id;if(!mid||!me||!d||typeof d!=="object")return d;
  ["sender_tenant_id","tenant_id","reader_tenant_id","user_id","by"].forEach(k=>{if(d[k]===mid)d[k]=me;});
  return d;
}
function cmWrapWS(){
  if(typeof _ws==="undefined"||!_ws||_ws._cm||!cmMsgId())return;
  _ws._cm=true;
  const h=_ws.onmessage;
  if(typeof h==="function")_ws.onmessage=function(evt){
    let d=null;try{d=JSON.parse(evt.data);}catch(_){return h.call(this,evt);}
    return h.call(this,{data:JSON.stringify(cmFixIds(d))});
  };
}
if(typeof connectMessagingWS==="function"){
  const _cmCW=connectMessagingWS;
  connectMessagingWS=function(){const r=_cmCW.apply(this,arguments);cmWrapWS();return r;};
}
setTimeout(cmWrapWS,2700);

// ── Réponses du serveur : mode client ailleurs, établissement en pause ──
let _cmReloadAt=0;
if(typeof readApiResponse==="function"){
  const _cmRAR=readApiResponse;
  readApiResponse=async function(r){
    try{return await _cmRAR.apply(this,arguments);}
    catch(e){
      const det=e&&e.data&&e.data.detail;
      if(e&&e.status===423&&det&&det.error==="business_paused")cmPausedScreen(det.message);
      else if(e&&e.status===403&&det&&det.error==="client_mode"&&State.token&&!(State.tenant&&(State.tenant.client_mode||State.tenant.account_type==="client"))&&Date.now()-_cmReloadAt>30000){
        _cmReloadAt=Date.now();
        try{const fresh=await _cmRAR(await apiFetch(API_BASE+"/profile/",{headers:{Authorization:`Bearer ${State.token}`}}));if(fresh){State.tenant={...State.tenant,...fresh};localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));setTimeout(()=>{window.location.href=window.location.pathname;},300);}}catch(_){}
      }
      throw e;
    }
  };
}
function cmPausedScreen(msg){
  if(document.getElementById("cm-paused"))return;
  const tn=State.tenant||{};
  const name=tn.company_name||tn.name||"";
  const el=document.createElement("div");el.id="cm-paused";el.className="cm-paused";el.setAttribute("role","alertdialog");el.setAttribute("aria-modal","true");
  el.innerHTML=`<div class="cm-pz"><div class="cm-pz-ic"><i class="ti ti-player-pause"></i></div>
    <h2>${esc(abTr("cm_paused_t",{n:name}))}</h2><p>${esc(msg||abTr("cm_paused_x",{n:name}))}</p>
    <div class="cm-pz-b">${tn.space_linked||tn.acting_as_member_email?`<button type="button" class="btn btn-g" onclick="esSwitch('home')"><i class="ti ti-home"></i> ${esc(t("cm_back_home"))}</button>`:""}
    <button type="button" class="btn btn-o" onclick="doLogout()"><i class="ti ti-logout"></i> ${esc(t("cs_logout"))}</button></div></div>`;
  document.body.appendChild(el);
}
if(typeof showAppLayout==="function"){
  const _cmSAL=showAppLayout;
  showAppLayout=async function(){
    const r=await _cmSAL.apply(this,arguments);
    try{if(State.tenant&&State.tenant.establishment_paused)cmPausedScreen();cmWrapWS();cmBadgeSoon();}catch(_){}
    return r;
  };
}

// ── Mode client : bandeau et carte du profil ──
function cmIsClientMode(){return !!(State.tenant&&State.tenant.client_mode);}
function cmBanner(){
  document.body.classList.toggle("zd-cm",cmIsClientMode());
  let b=document.getElementById("cm-banner");
  if(!cmIsClientMode()){if(b)b.remove();return;}
  const biz=State.tenant.business||{};
  const main=document.querySelector(".main");if(!main)return;
  if(!b){b=document.createElement("div");b.id="cm-banner";b.className="cm-banner";main.insertBefore(b,main.firstChild);}
  b.innerHTML=`<i class="ti ti-shopping-bag" aria-hidden="true"></i><span>${esc(t("cm_banner_pre"))} <b>${esc(t("cm_client_mode"))}</b>. ${esc(abTr(biz.state==="paused"?"cm_banner_paused":"cm_banner_open",{n:biz.name||""}))}</span>
    <button type="button" class="btn btn-g btn-sm" onclick="cmSetMode('manager')">${esc(t("cm_back_biz"))}</button>`;
}
if(typeof zdShowClientApp==="function"){
  const _cmSCA=zdShowClientApp;
  zdShowClientApp=async function(){const r=await _cmSCA.apply(this,arguments);try{cmBanner();cmBadgeSoon();}catch(_){}return r;};
}
let _cmMode=null;
async function cmModeCard(){
  const page=document.getElementById("page-profile");if(!page)return;
  let card=document.getElementById("cm-card");
  let m=null;try{m=await api("GET","/account/mode");}catch(_){}
  _cmMode=m;
  if(!m||(!m.can_switch&&m.mode!=="client")){if(card)card.remove();return;}
  if(!card){card=document.createElement("div");card.id="cm-card";card.className="card";card.style.marginBottom="16px";const first=page.querySelector(".card");if(first&&first.nextSibling)page.insertBefore(card,first.nextSibling);else page.appendChild(card);}
  const cl=m.mode==="client",biz=m.business||{};
  const tile=(on,tag,title,txt,tagCls)=>`<div class="cm-mode${on?" on":""}"><span class="cm-tag ${tagCls||""}">${esc(tag)}</span><b>${esc(title)}</b><small>${esc(txt)}</small></div>`;
  card.innerHTML=`<div style="font-weight:700;font-size:14px;margin-bottom:10px"><i class="ti ti-switch-horizontal" style="color:var(--green)"></i> ${esc(t("cm_card_t"))}</div>
    <div class="cm-modes">${tile(!cl,cl?t("cm_tag_paid"):t("cm_tag_current"),t("cm_manager"),abTr("cm_manager_x",{n:biz.name||""}))}${tile(cl,cl?t("cm_tag_current"):t("cm_tag_free"),t("cm_client"),t("cm_client_x"),"f")}</div>
    ${cl?`<div class="cm-state ${biz.state==="paused"?"p":"o"}"><i class="ti ${biz.state==="paused"?"ti-player-pause":"ti-building-store"}"></i> ${esc(abTr(biz.state==="paused"?"cm_state_paused":"cm_state_open",{n:biz.name||""}))}</div>
      <div class="cm-btns"><button type="button" class="btn btn-g btn-sm" onclick="cmSetMode('manager')"><i class="ti ti-building"></i> ${esc(t("cm_back_manager"))}</button>
      <button type="button" class="btn btn-o btn-sm" onclick="cmAsk('${biz.state==="paused"?"open":"paused"}')">${esc(t(biz.state==="paused"?"cm_reopen":"cm_pause"))}</button></div>`
    :`<div class="cm-btns"><button type="button" class="btn btn-o btn-sm" onclick="cmAsk()"><i class="ti ti-shopping-bag"></i> ${esc(t("cm_go_client"))}</button></div>`}
    <small class="cm-hint">${esc(t("cm_hint"))}</small>`;
}
if(typeof loadProfile==="function"){
  const _cmLP=loadProfile;
  loadProfile=async function(){const r=await _cmLP.apply(this,arguments);try{cmModeCard();}catch(_){}return r;};
}
function cmAsk(force){
  const m=_cmMode||{};const biz=m.business||{};const name=biz.name||"";
  const cl=m.mode==="client";
  const pick=force||(cl?biz.state:"open")||"open";
  const until=m.subscription_until?fmtDate(m.subscription_until):null;
  const trial=m.trial_left_days!=null&&!until?Math.max(0,Math.ceil(m.trial_left_days)):null;
  const opt=(v,ti,x)=>`<label class="cm-opt${pick===v?" on":""}"><input type="radio" name="cm-biz" value="${v}" ${pick===v?"checked":""} onchange="document.querySelectorAll('.cm-opt').forEach(l=>l.classList.toggle('on',l.querySelector('input').checked));cmWarn()"><span><b>${esc(ti)}</b><small>${esc(x)}</small></span></label>`;
  zdModal("modal-cm",`<div class="modal-title"><i class="ti ti-shopping-bag" style="color:var(--green)"></i> ${esc(t(cl?"cm_change_t":"cm_ask_t"))}</div>
    <div class="cm-cap">${esc(abTr("cm_meanwhile",{n:name}))}</div>
    ${opt("open",t("cm_open_t"),t("cm_open_x"))}${opt("paused",t("cm_paused_opt_t"),t("cm_paused_opt_x"))}
    <div class="cm-list"><div><i class="ti ti-check"></i><span>${esc(t("cm_keep_data"))}</span></div><div><i class="ti ti-check"></i><span>${esc(t("cm_follow"))}</span></div></div>
    <div class="cm-warn" id="cm-warn" data-until="${esc(until||"")}" data-trial="${trial==null?"":trial}"></div>
    ${(biz.members||0)>0?`<label class="cm-chk"><input type="checkbox" id="cm-notify" checked> ${esc(abTr("cm_notify_team",{n:biz.members}))}</label>`:""}
    <div class="modal-footer"><button type="button" class="btn btn-o btn-sm" onclick="zdCloseModal('modal-cm')">${esc(t("btn_cancel")!=="btn_cancel"?t("btn_cancel"):"Annuler")}</button>
      <button type="button" class="btn btn-g btn-sm" id="cm-go" onclick="cmConfirm()">${esc(t(cl?"btn_save":"cm_go_client"))}</button></div>`,500);
  cmWarn();
}
function cmWarn(){
  const w=document.getElementById("cm-warn");if(!w)return;
  const v=document.querySelector('input[name="cm-biz"]:checked')?.value;
  const until=w.dataset.until,trial=w.dataset.trial;
  let s="";
  if(v==="paused"){s=until?abTr("cm_warn_sub",{d:until}):(trial!==""?abTr("cm_warn_trial",{n:trial}):t("cm_warn_none"));}
  w.textContent=s;w.style.display=s?"block":"none";
}
async function cmConfirm(){
  const v=document.querySelector('input[name="cm-biz"]:checked')?.value||"open";
  const n=document.getElementById("cm-notify");
  const b=document.getElementById("cm-go");if(b)b.disabled=true;
  await cmSetMode("client",v,n?n.checked:true);
  if(b)b.disabled=false;
}
async function cmSetMode(mode,business,notify){
  try{
    const r=await api("POST","/account/mode",{mode,business:business||null,notify_team:notify!==false});
    try{if(typeof offlineCacheClear==="function")await offlineCacheClear();}catch(_){}
    State.tenant=r.user;localStorage.setItem("zd_tenant",JSON.stringify(r.user));
    zdCloseModal("modal-cm");
    showToast(t(mode==="client"?"cm_done_client":"cm_done_manager"));
    setTimeout(()=>{window.location.href=window.location.pathname+(mode==="client"?"?p=myspace":"?p=dashboard");},500);
  }catch(e){showToast(e.message,"error");}
}

// ── Notifications de mes autres comptes ──
let _cmAcc=null,_cmAccAt=0;
async function cmAccounts(force){
  if(!force&&_cmAcc&&Date.now()-_cmAccAt<60000)return _cmAcc;
  try{_cmAcc=await api("GET","/profile/notifications/accounts");_cmAccAt=Date.now();}catch(_){_cmAcc=_cmAcc||{accounts:[]};}
  return _cmAcc;
}
function cmKindLabel(a){
  if(a.kind==="seat")return abTr("cm_k_seat",{r:a.role_label||""});
  if(a.kind==="company")return t("cm_k_company");
  if(a.kind==="client")return t("cm_k_client");
  return t("cm_k_business");
}
async function cmAccSection(){
  const box=document.getElementById("nf-box");if(!box)return;
  const d=await cmAccounts(true);const acc=(d&&d.accounts)||[];
  let s=document.getElementById("cm-acc");
  if(acc.length<2){if(s)s.remove();return;}
  if(!s){s=document.createElement("div");s.id="cm-acc";s.className="cm-acc";}
  const card=box.querySelector(".nf-card")||box;card.appendChild(s);
  s.innerHTML=`<div class="nf-h">${esc(t("cm_acc_t"))}</div><small class="nf-hint">${esc(t("cm_acc_x"))}</small>
    ${acc.map(a=>`<div class="nf-row cm-acc-row"><span class="cm-acc-av" aria-hidden="true">${esc((a.name||"?").trim().charAt(0).toUpperCase())}</span><div><b>${esc(a.name)}</b><small>${esc(cmKindLabel(a))}${a.current?" · "+esc(t("cm_current_acc")):""}</small></div>
      ${a.current?`<span class="cm-cur">${esc(t("cm_here"))}</span>`:nfSwitch(a.enabled,`cmAccToggle('${a.id}',${!a.enabled})`,a.name)}</div>`).join("")}`;
}
async function cmAccToggle(id,on){
  try{_cmAcc=await api("PUT","/profile/notifications/accounts",{id,enabled:on});_cmAccAt=Date.now();cmAccSection();if(typeof loadNotifications==="function")loadNotifications();}
  catch(e){showToast(e.message,"error");}
}
if(typeof nfRenderCard==="function"){
  const _cmNRC=nfRenderCard;
  nfRenderCard=async function(){const r=await _cmNRC.apply(this,arguments);try{await cmAccSection();}catch(_){}return r;};
}
async function cmPost(path,tok){
  const r=await apiFetch(API_BASE+path,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${tok}`}});
  let d=null;try{d=await r.json();}catch(_){}
  if(!r.ok){const det=d&&d.detail;throw new Error((det&&typeof det==="object"?det.message:det)||t("server_error"));}
  return d;
}
async function cmSwitchTo(sw,link){
  const d=await cmAccounts();const accs=(d&&d.accounts)||[];
  const cur=accs.find(a=>a.current)||{switch:{kind:"home"}};
  const home=accs.find(a=>a.switch&&a.switch.kind==="home");
  let tok=State.token,r=null;
  try{
    if(cur.switch.kind==="seat"&&sw.kind!=="seat"){r=await cmPost("/spaces/home/switch",tok);tok=r.token;}
    if(cur.switch.kind==="company"&&sw.kind!=="company"&&home){r=await cmPost(`/companies/${home.id}/switch`,tok);tok=r.token;}
    if(sw.kind==="seat")r=await cmPost(`/spaces/${sw.id}/switch`,tok);
    else if(sw.kind==="company")r=await cmPost(`/companies/${sw.id}/switch`,tok);
    if(!r)throw new Error(t("server_error"));
    try{if(typeof offlineCacheClear==="function")await offlineCacheClear();}catch(_){}
    State.token=r.token;State.tenant=r.user;localStorage.setItem("zd_token",r.token);localStorage.setItem("zd_tenant",JSON.stringify(r.user));
    window.location.href=link&&link.startsWith("/")?link:window.location.pathname;
  }catch(e){showToast(e.message,"error");}
}
let _cmNotifs=[];
loadNotifications=async function(){
  try{
    const notifs=await api("GET","/notifications");_cmNotifs=notifs||[];
    const container=document.getElementById("notifs-list");
    nfBadge(_cmNotifs.filter(n=>!n.is_read).length);
    if(!container)return;
    if(!_cmNotifs.length){container.innerHTML=`<div style="text-align:center;padding:32px;color:var(--muted)">${t("no_notifications")}</div>`;return;}
    const colors={info:"var(--blue)",warning:"var(--amber)",success:"var(--green)",error:"var(--red)"};
    container.innerHTML=_cmNotifs.map(n=>{const c=colors[n.type]||"var(--blue)";
      return `<div class="nf-item${n.is_read?" read":""}" style="--c:${c}" role="button" tabindex="0" data-id="${esc(n.id)}" data-link="${esc(n.link||"")}">
        <span class="nf-dot" aria-hidden="true"></span>
        <div class="nf-txt"><div class="nf-t">${esc(n.title)}</div><div class="nf-m">${esc(n.message)}</div><div class="nf-d">${n.account?`<span class="cm-acct">${esc(n.account.name)}</span> · `:""}${fmtDate(n.created_at)}</div></div>
        <span class="nf-open">${n.link||n.account?`${esc(t(n.account?"cm_open_in":"nf_open"))} <i class="ti ti-chevron-right" aria-hidden="true"></i>`:""}</span>
        ${!n.is_read?`<button type="button" class="btn btn-sm btn-o nf-read" data-read="${esc(n.id)}">${t("btn_read")}</button>`:""}</div>`;}).join("");
    container.querySelectorAll(".nf-item").forEach(el=>{
      const go=()=>nfOpenNotif(el.dataset.id,el.dataset.link);
      el.addEventListener("click",e=>{if(e.target.closest(".nf-read"))return;go();});
      el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go();}});
    });
    container.querySelectorAll(".nf-read").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();markNotifRead(b.dataset.read);}));
  }catch(e){showToast(e.message||"Erreur","error");}
};
if(typeof nfOpenNotif==="function"){
  const _cmONF=nfOpenNotif;
  nfOpenNotif=async function(id,link){
    const n=_cmNotifs.find(x=>x.id===id);
    if(n&&n.account&&n.account.switch){
      try{await api("PATCH",`/notifications/${id}/read`);}catch(_){}
      return cmSwitchTo(n.account.switch,link||"/?p=notifications");
    }
    return _cmONF.apply(this,arguments);
  };
}

// ── Admin : les comptes en mode client ──
if(typeof admFormula==="function"){
  const _cmAF=admFormula;
  admFormula=function(u){
    const base=_cmAF.apply(this,arguments);
    if(!u.client_mode)return base;
    return base+` <span class="adm-pill p-cli">${u.client_mode_business==="paused"?"Mode client · entreprise en pause":"Mode client · entreprise ouverte"}</span>`;
  };
}

// ── Admin : gratuité générale ──
let _fa=null,_faPoll=null;
async function faLoad(){
  const box=document.getElementById("fa-admin");if(!box||!State.tenant?.is_creator)return;
  try{_fa=await api("GET","/admin/free-all");faRender();}catch(e){box.innerHTML="";}
}
function faRender(){
  const box=document.getElementById("fa-admin");if(!box||!_fa)return;
  const f=_fa,j=f.job||{};
  const tiers=[["essentiel","Essentiel"],["pro","Pro"],["premium","Premium"]];
  const today=new Date().toISOString().slice(0,10);
  box.innerHTML=`<div class="card fa-card${f.active?" on":""}">
    <div class="fa-head"><div><div style="font-weight:800;font-size:15px"><i class="ti ti-gift" style="color:var(--green)"></i> Gratuité pour tout le monde</div>
      <div class="fa-st">${f.active?`<span class="adm-pill p-gift">Active</span> ${esc(f.description||"")}`:(f.on?`<span class="adm-pill p-exp">Terminée</span>`:`<span class="adm-pill p-cli">Désactivée</span> Chacun paie sa formule normalement.`)}</div></div></div>
    <div class="fa-grid">
      <div class="fgrp"><label class="fl" for="fa-tier">Formule offerte</label><select class="inp" id="fa-tier">${tiers.map(([k,l])=>`<option value="${k}"${(f.tier||"premium")===k?" selected":""}>${l}</option>`).join("")}</select></div>
      <div class="fgrp"><span class="fl">Durée</span><div class="fa-dur">
        <label><input type="radio" name="fa-dur" value="none" ${!f.until?"checked":""} onchange="document.getElementById('fa-until').disabled=true"> Sans limite</label>
        <label><input type="radio" name="fa-dur" value="date" ${f.until?"checked":""} onchange="document.getElementById('fa-until').disabled=false"> Jusqu'au</label>
        <input class="inp" type="date" id="fa-until" min="${today}" value="${esc(f.until||"")}" ${f.until?"":"disabled"} aria-label="Date de fin"></div></div>
    </div>
    <div class="fgrp"><label class="fl" for="fa-msg">Message joint à la notification (optionnel)</label><textarea class="inp" id="fa-msg" rows="2" maxlength="400" placeholder="Ex. : Pour fêter nos 1 000 inscrits, tout est offert ce mois-ci.">${esc(f.message||"")}</textarea></div>
    <label class="cm-chk"><input type="checkbox" id="fa-notify" checked> Prévenir tout le monde par notification (${f.accounts} compte${f.accounts>1?"s":""} gérant${f.accounts>1?"s":""})</label>
    <div class="fa-job" id="fa-job" role="status"${j.running?"":" hidden"}>${faJobHtml(j)}</div>
    <div class="fa-btns"><button type="button" class="btn btn-g btn-sm" onclick="faSave(true)"><i class="ti ti-gift"></i> ${f.active?"Mettre à jour":"Activer la gratuité"}</button>
      ${f.active?`<button type="button" class="btn btn-r btn-sm" onclick="faSave(false)"><i class="ti ti-player-stop"></i> Arrêter la gratuité</button>`:""}</div>
    <small class="cm-hint">Chaque compte reçoit la formule choisie pour ses propres secteurs, sans rien payer. Les abonnés gardent leur abonnement (il n'est pas prolongé). Pour une seule personne : bouton « Conditions » dans la liste des inscrits, rubrique « Accès offert ».</small>
  </div>`;
  clearTimeout(_faPoll);
  if(j.running)_faPoll=setTimeout(faPollJob,1500);
}
function faJobHtml(j){return `<div class="fa-bar"><i style="width:${j.total?Math.round(j.done*100/j.total):5}%"></i></div>Mise à jour des comptes : ${j.done} / ${j.total||"…"}`;}
async function faPollJob(){
  let f=null;try{f=await api("GET","/admin/free-all");}catch(_){return;}
  const el=document.getElementById("fa-job");
  if(!f.job.running||!el){_fa=f;faRender();return;}
  el.innerHTML=faJobHtml(f.job);
  _faPoll=setTimeout(faPollJob,1500);
}
async function faSave(on){
  const tier=zdVal("fa-tier")||"premium";
  const dated=document.querySelector('input[name="fa-dur"]:checked')?.value==="date";
  const until=dated?(zdVal("fa-until")||null):null;
  if(on&&dated&&!until){showToast("Choisis la date de fin ou « Sans limite »","error");return;}
  const notify=document.getElementById("fa-notify")?.checked!==false;
  const q=on?`Offrir ${tier==="essentiel"?"Essentiel":tier==="pro"?"Pro":"Premium"} à tout le monde ${until?"jusqu'au "+until.split("-").reverse().join("/"):"sans limite"}${notify?", avec une notification à chacun":""} ?`:`Arrêter la gratuité pour tout le monde${notify?" et prévenir chacun":""} ?`;
  if(!confirm(q))return;
  try{_fa=await api("PUT","/admin/free-all",{on,tier,until,message:zdVal("fa-msg")||null,notify});faRender();showToast(on?"Gratuité activée ✓":"Gratuité arrêtée ✓");}
  catch(e){showToast(e.message,"error");}
}
if(typeof loadAdminUsers==="function"){
  const _cmLAU=loadAdminUsers;
  loadAdminUsers=async function(){const r=await _cmLAU.apply(this,arguments);try{faLoad();}catch(_){}return r;};
}
// « Tout offrir » dans les conditions d'une personne
if(typeof abAdminRender==="function"){
  const _cmAAR=abAdminRender;
  abAdminRender=function(){
    const r=_cmAAR.apply(this,arguments);
    try{
      const first=document.querySelector("#modal-ab-admin .ab-adm-gift");if(!first||document.getElementById("abm-all"))return r;
      const row=document.createElement("div");row.className="ab-adm-all";
      row.innerHTML=`<span><b>Tout offrir</b></span><select class="inp" id="abm-all" aria-label="Formule pour tous les secteurs"><option value="premium">Premium partout</option><option value="pro">Pro partout</option><option value="essentiel">Essentiel partout</option><option value="">Rien (tout retirer)</option></select><button type="button" class="btn btn-o btn-sm" onclick="abAllGifts()">Appliquer</button>`;
      first.parentNode.insertBefore(row,first);
    }catch(_){}
    return r;
  };
}
function abAllGifts(){
  const v=zdVal("abm-all");const order=["essentiel","pro","premium"];
  document.querySelectorAll('#modal-ab-admin select[id^="abm-g-"]').forEach(s=>{
    if(!v){s.value="";return;}
    let i=order.indexOf(v);
    while(i>=0&&![...s.options].some(o=>o.value===order[i]))i--;
    s.value=i>=0?order[i]:"";
  });
  showToast("Choix appliqué à tous les secteurs : pense à enregistrer");
}

// ── Les menus se ferment tout seuls ──
function zpVis(id){const e=document.getElementById(id);return !!e&&e.style.display!=="none"&&e.style.display!=="";}
function zpHide(id){const e=document.getElementById(id);if(e)e.style.display="none";}
const ZP=[
  {id:"more-menu",close:()=>{if(typeof closeMoreMenu==="function")closeMoreMenu();},trig:'[onclick*="toggleMoreMenu"],#more-menu-backdrop'},
  {id:"quick-actions",open:()=>document.getElementById("quick-actions")?.style.display==="flex",close:()=>{if(typeof toggleQuickActions==="function")toggleQuickActions(false);},trig:"#zd-fab"},
  {id:"chat-more-menu",close:()=>{zpHide("chat-more-menu");zpHide("chat-theme-panel");},trig:'[onclick*="toggleChatMoreMenu"]',stay:'#chat-theme-panel,[onclick*="toggleWallpaperMenuInChat"],input,select,textarea'},
  {id:"extra-features-menu",close:()=>zpHide("extra-features-menu"),trig:"#extra-features-btn",stay:"input[type=file]"},
  {id:"ephemeral-menu",close:()=>zpHide("ephemeral-menu"),trig:'[onclick*="toggleEphemeralMenu"]'},
  {id:"mention-dropdown",close:()=>zpHide("mention-dropdown"),trig:"#chat-input"},
  {id:"cl-side",open:()=>!!(typeof CL!=="undefined"&&CL.side&&clNarrow()),close:()=>clToggleSide(false),trig:'[onclick*="clToggleSide"]'},
];
function zpOpen(p){return p.open?p.open():zpVis(p.id);}
function zpAnyOpen(){return ZP.some(zpOpen)||zpCallOpen();}
function zpCallOpen(){const o=document.getElementById("cl-ov");return !!o&&!o.classList.contains("min")&&!o.classList.contains("ended");}
function zpCloseAll(except){ZP.forEach(p=>{if(p!==except&&zpOpen(p)){try{p.close();}catch(_){}}});zpSoon();}
document.addEventListener("pointerdown",e=>{
  const tg=e.target;if(!(tg instanceof Element))return;
  ZP.forEach(p=>{
    if(!zpOpen(p))return;
    const el=document.getElementById(p.id);
    if(el&&el.contains(tg))return;
    if(p.trig&&tg.closest(p.trig))return;
    if(tg.closest(".modal-overlay"))return;
    try{p.close();}catch(_){}
  });
  zpSoon();
},true);
document.addEventListener("click",e=>{
  const tg=e.target;if(!(tg instanceof Element))return;
  ZP.forEach(p=>{
    if(!zpOpen(p))return;
    const el=document.getElementById(p.id);if(!el||!el.contains(tg))return;
    if(p.stay&&tg.closest(p.stay))return;
    const act=tg.closest('button,a,[onclick],.qa-item,label,[role="menuitem"]');
    if(!act||!el.contains(act)||act===el)return;
    if(act.matches("label")&&act.querySelector("input[type=file]")){setTimeout(()=>{try{p.close();}catch(_){}zpSoon();},400);return;}
    setTimeout(()=>{if(zpOpen(p)){try{p.close();}catch(_){}}zpSoon();},0);
  });
});
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  const open=ZP.filter(zpOpen);
  if(open.length){open.forEach(p=>{try{p.close();}catch(_){}});zpSoon();e.preventDefault();return;}
  if(zpCallOpen()&&!document.querySelector(".modal-overlay[style*='flex']")){clMinimize();zpSoon();}
});
// Le bouton Retour du téléphone ferme le menu ouvert (ou réduit l'appel) au lieu de quitter
let _zpPushed=false,_zpIgnore=0,_zpT=0;
function zpSoon(){clearTimeout(_zpT);_zpT=setTimeout(zpSync,60);}
function zpSync(){
  const open=zpAnyOpen();
  if(open&&!_zpPushed){try{history.pushState(Object.assign({},history.state||{},{zdPop:1}),"");_zpPushed=true;}catch(_){}}
  else if(!open&&_zpPushed){_zpPushed=false;if(history.state&&history.state.zdPop){_zpIgnore++;history.back();}}
}
window.addEventListener("popstate",()=>{
  if(_zpIgnore){_zpIgnore--;return;}
  if(_zpPushed){
    _zpPushed=false;
    if(ZP.some(zpOpen))zpCloseAll();
    else if(zpCallOpen())clMinimize();
    setTimeout(zpSync,80);
  }
});
(function zpObserve(){
  const mo=new MutationObserver(zpSoon);
  ZP.forEach(p=>{const el=document.getElementById(p.id);if(el)mo.observe(el,{attributes:true,attributeFilter:["style","hidden"]});});
  new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.id==="cl-ov")))zpSoon();}).observe(document.body,{childList:true});
  document.addEventListener("click",()=>setTimeout(zpSync,120));
})();
if(typeof navigate==="function"){
  const _zpNav=navigate;
  navigate=function(){
    ZP.forEach(p=>{if(p.id!=="cl-side"&&zpOpen(p)){try{p.close();}catch(_){}}});
    const r=_zpNav.apply(this,arguments);zpSoon();return r;
  };
}

// ── Le chiffre sur l'icône de l'appli et le ménage des notifications du téléphone ──
let _cmBadgeT=0;
function cmSW(msg){try{if(navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.controller.postMessage(msg);}catch(_){}}
function cmSetBadge(n){
  try{
    if(!("setAppBadge" in navigator))return;
    if(n>0)navigator.setAppBadge(n).catch(()=>{});else navigator.clearAppBadge().catch(()=>{});
  }catch(_){}
}
function cmOnPulse(r){
  if(!r||typeof r.badge!=="number")return;
  cmSetBadge(r.badge);
  cmSW({type:"zd-clear",keep_nids:r.unread_nids||[],keep_convs:r.unread_convs||[],badge:r.badge});
}
if(typeof api==="function"){
  const _cmApi=api;
  api=async function(method,path){
    const r=await _cmApi.apply(this,arguments);
    try{if(method==="GET"&&typeof path==="string"&&path.startsWith("/notifications/pulse"))cmOnPulse(r);}catch(_){}
    return r;
  };
}
function cmBadgeSoon(){clearTimeout(_cmBadgeT);_cmBadgeT=setTimeout(()=>{if(State.token&&document.visibilityState==="visible"&&typeof nfPulse==="function")nfPulse();},1500);}
if(typeof openConversation==="function"){
  const _cmOC=openConversation;
  openConversation=async function(id){
    const r=await _cmOC.apply(this,arguments);
    cmSW({type:"zd-clear",conv_id:id});cmBadgeSoon();
    return r;
  };
}
if(typeof markNotifRead==="function"){
  const _cmMNR=markNotifRead;
  markNotifRead=async function(id){const r=await _cmMNR.apply(this,arguments);cmSW({type:"zd-clear",nid:id});cmBadgeSoon();return r;};
}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")cmBadgeSoon();});
