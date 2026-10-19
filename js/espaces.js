// ── 9.4 · ESPACES : un compte, plusieurs établissements ──
const _es={data:null,team:null,join:null,reqs:null,look:null,code:null};
const ES_FREE_PAGES=["profile","notifications","announcements","spaces","claims","help"];
function esU(){return State.tenant||{};}
function esEnabled(){return esU().spaces_enabled!==false;}
function esRoleName(k,label){const v=t("role_"+k);return v&&v!=="role_"+k?v:(label||k);}
function esSecIcon(s){const m=(typeof SECTOR_META==="object"&&SECTOR_META[s])||{icon:"building",color:"#10b981"};return m;}
function esDot(kind,sector){
  if(kind==="client")return `<span class="es-dot" style="--c:#9b6dff"><i class="ti ti-shopping-bag"></i></span>`;
  const m=esSecIcon(sector||"pme");return `<span class="es-dot" style="--c:${m.color}"><i class="ti ti-${m.icon}"></i></span>`;
}

// Pages autorisées : un statut de secteur ne voit que ses pages
(function(){
  const o=window.memberCanOpen;
  window.memberCanOpen=function(p){
    const u=esU();
    if(p==="spaces")return esEnabled();
    if(u.role_pages){if(ES_FREE_PAGES.includes(p))return true;if(p==="team")return !!u.member_team;return u.role_pages.includes(p);}
    if(p==="team"&&u.member_team)return true;
    if(u.space_linked&&(p==="myspace"||p==="billing"))return false;
    return o(p);
  };
})();
if(typeof zdPageGuard==="function"){const _esG=zdPageGuard;zdPageGuard=function(p){p=_esG(p);const u=esU();
  if(State.restricted&&u.member_role)return esEnabled()?"spaces":"profile";
  if(u.role_pages&&!memberCanOpen(p))return u.role_home||"spaces";
  return p;};}
if(typeof RESTRICTED_ALLOWED_PAGES==="object"&&!RESTRICTED_ALLOWED_PAGES.includes("spaces"))RESTRICTED_ALLOWED_PAGES.push("spaces");
if(typeof ZD_CLIENT_PAGES==="object"&&!ZD_CLIENT_PAGES.includes("spaces"))ZD_CLIENT_PAGES.push("spaces");
if(typeof updateExpiryBar==="function"){const _esX=updateExpiryBar;updateExpiryBar=function(u){if(u&&u.member_role){const b=document.getElementById("trial-bar");if(b)b.className="trial-bar hidden";if(_expiryInterval){clearInterval(_expiryInterval);_expiryInterval=null;}return;}return _esX.apply(this,arguments);};}
if(typeof applyRestrictedUI==="function"){const _esR=applyRestrictedUI;applyRestrictedUI=function(){_esR.apply(this,arguments);esPlanBadge();};}
function esPlanBadge(){
  const u=esU();if(!u.member_role)return;
  setHTML("topbar-plan",`<span class="badge ${State.restricted?"br":"bb"}">${esc(State.restricted?t("es_blocked_badge"):esRoleName(u.member_role,u.role_label))}</span>`);
}

// Dans un siège, la sécurité, les appareils et les contacts bloqués se gèrent depuis le compte personnel
["loadSessions","loadBackups","loadBlockedContacts"].forEach(n=>{const f=window[n];if(typeof f==="function")window[n]=function(){if(esU().space_linked)return Promise.resolve();return f.apply(this,arguments);};});

// ── Puce « Mes espaces » dans la barre du haut ──
function esChip(){
  if(!esEnabled())return;
  let chip=document.getElementById("space-chip");
  if(!chip){const ref=document.getElementById("company-chip");if(!ref)return;chip=document.createElement("button");chip.id="space-chip";chip.type="button";chip.className="btn btn-o btn-sm es-chip";chip.setAttribute("onclick","navigate('spaces')");ref.before(chip);}
  const u=esU();const n=(_es.data?.invites||[]).length;
  const label=u.member_role?(u.establishment_name||u.name):t("es_chip");
  chip.innerHTML=`<i class="ti ti-${u.member_role?"building-community":"layers-subtract"}"></i><span class="es-chip-t">${esc(label)}</span>${n?`<span class="es-chip-n">${n}</span>`:""}<i class="ti ti-selector"></i>`;
  chip.setAttribute("aria-label",t("es_title")+(n?` (${n})`:""));
}
async function esFetch(){try{_es.data=await api("GET","/spaces");}catch(_){_es.data=null;}return _es.data;}
function esSeatProfile(){
  const u=esU();document.body.classList.toggle("zd-seat",!!u.space_linked);
  document.body.classList.toggle("zd-role-sector",!!u.role_pages);
  const pg=document.getElementById("page-profile");if(!pg)return;
  pg.querySelectorAll(".card").forEach(c=>{if(c.querySelector("#lang-selector-app,#theme-btn-dark,#push-toggle-btn"))c.classList.add("es-keep");});
  let n=document.getElementById("es-seat-card");
  if(u.space_linked){
    if(!n){n=document.createElement("div");n.id="es-seat-card";n.className="card es-keep es-seat-card";pg.prepend(n);}
    n.innerHTML=`<div class="es-seat-h">${esDot("member",u.sector)}<div><b>${esc(u.acting_as_member_name||u.name)}</b><div class="es-muted">${esc(u.acting_as_member_email||"")}</div></div></div>
      <div class="es-muted" style="margin:8px 0 10px">${esc(abTr("es_seat_profile",{e:u.establishment_name||"",r:esRoleName(u.member_role,u.role_label)}))}</div>
      <button class="btn btn-g btn-sm" onclick="esSwitch('home')"><i class="ti ti-arrow-back-up"></i> ${esc(t("es_back_home"))}</button>`;
  }else if(n)n.remove();
}
function esNavGroups(){
  document.querySelectorAll(".sidebar .nav-g").forEach(g=>{
    const items=[...g.querySelectorAll(".nav-i")];if(!items.length)return;
    g.classList.toggle("es-empty-g",!items.some(i=>getComputedStyle(i).display!=="none"));
  });
}
if(typeof applyMemberUI==="function"){const _esM=applyMemberUI;applyMemberUI=function(){_esM.apply(this,arguments);esNavGroups();};}
function esAfterLayout(){
  const u=esU();if(u.space_linked&&u.acting_as_member_name)set("topbar-name",u.acting_as_member_name);
  esPlanBadge();esSeatProfile();esNavGroups();setTimeout(esNavGroups,600);
  esFetch().then(()=>{esChip();esPending();});
  esChip();
}
if(typeof zdAfterAppLayout==="function"){const _esA=zdAfterAppLayout;zdAfterAppLayout=function(){_esA.apply(this,arguments);esAfterLayout();};}
if(typeof zdShowClientApp==="function"){const _esC=zdShowClientApp;zdShowClientApp=async function(){await _esC.apply(this,arguments);esAfterLayout();};}

// ── Page « Mes espaces » ──
V93_PAGES.spaces=async function(){
  const el=ensureSectorPage("spaces");document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x===el));
  if(!el.innerHTML)el.innerHTML=`<div class="card" style="text-align:center;color:var(--muted)">${esc(t("loading"))}</div>`;
  await esFetch();esRender();esChip();
};
function esRender(){
  const el=document.getElementById("page-spaces");if(!el)return;
  const d=_es.data;
  if(!d||!d.enabled){el.innerHTML=sectorPageHead(esc(t("es_title")),"")+`<div class="card">${zdEmpty(t("es_legacy"),"user-off")}</div>`;return;}
  const u=esU();
  let h=sectorPageHead(`<i class="ti ti-layers-subtract"></i> ${esc(t("es_title"))}`,esc(t("es_sub")));
  if(State.restricted&&u.member_role)h+=`<div class="alert-bar es-alert"><i class="ti ti-lock"></i> ${esc(abTr("es_blocked_x",{e:u.establishment_name||""}))}</div>`;
  h+=`<div class="card es-card"><div class="es-h"><b>${esc(t("es_mine"))}</b><span class="es-muted">${esc(d.home_email||"")}</span></div><div class="es-list">`;
  h+=d.spaces.map(s=>{
    const nm=s.kind==="client"?t("es_client_space"):s.name;
    const sub=s.kind==="member"?esRoleName(s.role,s.role_label):(s.kind==="client"?t("es_client_x"):t("es_owner"));
    return `<div class="es-row${s.current?" on":""}">${esDot(s.kind,s.sector)}<div class="es-txt"><b>${esc(nm)}</b><div class="es-tags"><span class="es-tag">${esc(sub)}</span>${s.current?`<span class="badge bg">${esc(t("es_current"))}</span>`:""}${s.blocked?`<span class="badge br">${esc(t("es_blocked_badge"))}</span>`:""}${s.unread?`<span class="badge bb">${esc(abTr("es_unread",{n:s.unread}))}</span>`:""}</div></div>
      <div class="es-acts">${s.current?"":`<button class="btn btn-g btn-sm" onclick="esSwitch('${s.id}')"><i class="ti ti-arrow-right"></i> ${esc(t("es_open"))}</button>`}${s.kind==="member"?`<button class="btn btn-o btn-sm" onclick="esLeave('${s.id}','${escJs(s.name)}',${s.current?1:0})" aria-label="${esc(t("es_leave"))} ${esc(s.name)}"><i class="ti ti-door-exit"></i></button>`:""}</div></div>`;}).join("");
  h+=`</div><div class="es-free"><i class="ti ti-gift"></i> ${esc(t("es_free"))}</div></div>`;
  if(d.invites.length)h+=`<div class="card es-card"><div class="es-h"><b>${esc(t("es_invites"))}</b></div>${d.invites.map(i=>`<div class="es-row">${esDot("member",i.sector)}<div class="es-txt"><b>${esc(i.name)}</b><div class="es-tags"><span class="es-tag">${esc(esRoleName(i.role,i.role_label))}</span><span class="es-muted">${esc(fmtDate(i.sent_at))}</span></div></div>
    <div class="es-acts"><button class="btn btn-o btn-sm" onclick="esDecline('${i.token}')">${esc(t("es_decline"))}</button><button class="btn btn-g btn-sm" onclick="esAccept('${i.token}')"><i class="ti ti-check"></i> ${esc(t("es_accept"))}</button></div></div>`).join("")}</div>`;
  h+=`<div class="card es-card"><div class="es-h"><b><i class="ti ti-user-plus"></i> ${esc(t("es_join_t"))}</b></div><div class="es-muted" style="margin-bottom:10px">${esc(t("es_join_x"))}</div>
    <div class="es-joinrow"><input class="inp" id="es-code" placeholder="${esc(t("es_code_ph"))}" maxlength="12" autocomplete="off" autocapitalize="characters" aria-label="${esc(t("es_code_l"))}" value="${esc(_es.code||"")}" onkeydown="if(event.key==='Enter')esLookup()"><button class="btn btn-g btn-sm" onclick="esLookup()"><i class="ti ti-search"></i> ${esc(t("es_find"))}</button></div>
    <div id="es-look">${esLookHtml()}</div></div>`;
  if(d.requests.length)h+=`<div class="card es-card"><div class="es-h"><b>${esc(t("es_my_requests"))}</b></div>${d.requests.map(r=>`<div class="es-row"><div class="es-txt"><b>${esc(r.name)}</b><div class="es-tags"><span class="es-tag">${esc(esRoleName(r.role,r.role_label))}</span>${esReqBadge(r.status)}${r.reason?`<span class="es-muted">${esc(r.reason)}</span>`:""}</div></div>
    ${r.status==="pending"?`<div class="es-acts"><button class="btn btn-o btn-sm" onclick="esCancelReq('${r.id}')">${esc(t("btn_cancel"))}</button></div>`:""}</div>`).join("")}</div>`;
  el.innerHTML=h;
}
function esReqBadge(s){const m={pending:["ba","es_st_pending"],accepted:["bg","es_st_accepted"],refused:["br","es_st_refused"],cancelled:["bb","es_st_cancelled"],expired:["bb","es_st_expired"]}[s]||["bb",s];return `<span class="badge ${m[0]}">${esc(t(m[1]))}</span>`;}
function esLookHtml(){
  const L=_es.look;if(!L)return "";
  if(L.error)return `<div class="es-err">${esc(L.error)}</div>`;
  return `<div class="es-look">${esDot("member",L.sector)}<div class="es-txt"><b>${esc(L.name)}</b><div class="es-muted">${esc(t("es_pick_role"))}</div></div></div>
    <div class="es-roles" role="radiogroup" aria-label="${esc(t("es_pick_role"))}">${L.roles.map((r,i)=>`<label class="es-role"><input type="radio" name="es-role" value="${r.key}" ${i===0?"checked":""}> <span>${esc(esRoleName(r.key,r.label))}</span></label>`).join("")}</div>
    <label class="fl" for="es-msg">${esc(t("es_msg_l"))}</label><textarea class="inp" id="es-msg" rows="2" maxlength="400" placeholder="${esc(t("es_msg_ph"))}"></textarea>
    <div class="es-muted" style="margin:8px 0">${esc(t("es_need_ok"))}</div>
    <button class="btn btn-g" style="width:100%" onclick="esSendReq()"><i class="ti ti-send"></i> ${esc(t("es_send"))}</button>`;
}
async function esLookup(code){
  code=(code||zdVal("es-code")).toUpperCase().replace(/[^A-Z0-9]/g,"");_es.code=code.length>4?code.slice(0,4)+"-"+code.slice(4,8):code;
  if(code.length!==8){_es.look={error:t("es_code_need")};const b=document.getElementById("es-look");if(b)b.innerHTML=esLookHtml();return;}
  try{_es.look={...(await api("GET",`/join/${code}`)),code};}catch(e){_es.look={error:e.status===404?t("es_code_unknown"):e.message};}
  const b=document.getElementById("es-look");if(b)b.innerHTML=esLookHtml();
}
async function esSendReq(){
  const L=_es.look;if(!L||!L.code)return;
  const role=document.querySelector('input[name="es-role"]:checked')?.value;if(!role)return;
  try{const r=await api("POST",`/join/${L.code}`,{role,message:zdVal("es-msg")||null});_es.look=null;_es.code=null;showToast(abTr("es_sent",{e:r.name}));try{sessionStorage.removeItem("zd_join");}catch(_){}zdCloseModal("modal-es");if(document.getElementById("page-spaces")?.classList.contains("active")){await esFetch();esRender();}}
  catch(e){showToast(e.message,"error");}
}
async function esCancelReq(id){try{await api("DELETE",`/join/requests/${id}`);await esFetch();esRender();}catch(e){showToast(e.message,"error");}}
async function esEnter(r){
  try{if(typeof offlineCacheClear==="function")await offlineCacheClear();}catch(_){}
  State.token=r.token;State.tenant=r.user;localStorage.setItem("zd_token",r.token);localStorage.setItem("zd_tenant",JSON.stringify(r.user));
  window.location.href=window.location.pathname;
}
async function esSwitch(id){try{await esEnter(await api("POST",`/spaces/${id}/switch`));}catch(e){showToast(e.message,"error");}}
async function esAccept(token){try{try{sessionStorage.removeItem("zd_invite");}catch(_){}await esEnter(await api("POST",`/spaces/invites/${token}/accept`));}catch(e){showToast(e.message,"error");}}
async function esDecline(token){if(!confirm(t("es_decline_confirm")))return;try{try{sessionStorage.removeItem("zd_invite");}catch(_){}await api("POST",`/spaces/invites/${token}/decline`);zdCloseModal("modal-es");await esFetch();esRender();esChip();}catch(e){showToast(e.message,"error");}}
async function esLeave(id,name,current){
  if(!confirm(abTr("es_leave_confirm",{e:name})))return;
  try{
    if(current){const h=await api("POST","/spaces/home/switch");State.token=h.token;localStorage.setItem("zd_token",h.token);}
    await api("DELETE",`/spaces/${id}`);showToast(t("es_left"));
    if(current){const me=await api("GET","/profile/");State.tenant=me;localStorage.setItem("zd_tenant",JSON.stringify(me));window.location.href=window.location.pathname;return;}
    await esFetch();esRender();
  }catch(e){showToast(e.message,"error");}
}

// ── Actions en attente après connexion (lien d'invitation, code d'établissement) ──
async function esPending(){
  let inv=null,code=null;try{inv=sessionStorage.getItem("zd_invite");code=sessionStorage.getItem("zd_join");}catch(_){}
  if(inv){
    const i=(_es.data?.invites||[]).find(x=>x.token===inv);
    if(!i){try{sessionStorage.removeItem("zd_invite");}catch(_){}showToast(t("es_invite_other"),"error");return;}
    zdModal("modal-es",`<div class="modal-title">${esDot("member",i.sector)} ${esc(t("es_invite_t"))}</div>
      <p style="font-size:14px;line-height:1.6">${esc(abTr("es_invite_x",{e:i.name,r:esRoleName(i.role,i.role_label)}))}</p><div class="es-free"><i class="ti ti-gift"></i> ${esc(t("es_free"))}</div>
      <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="esDecline('${i.token}')">${esc(t("es_decline"))}</button><button class="btn btn-g btn-sm" onclick="esAccept('${i.token}')"><i class="ti ti-check"></i> ${esc(t("es_accept"))}</button></div>`,460);
    return;
  }
  if(code){
    _es.code=null;await esLookup(code);
    if(_es.look&&!_es.look.error)zdModal("modal-es",`<div class="modal-title"><i class="ti ti-user-plus" style="color:var(--green)"></i> ${esc(t("es_join_t"))}</div><div id="es-look">${esLookHtml()}</div>
      <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="try{sessionStorage.removeItem('zd_join')}catch(_){};zdCloseModal('modal-es')">${esc(t("btn_cancel"))}</button></div>`,480);
    else{try{sessionStorage.removeItem("zd_join");}catch(_){}showToast(_es.look?.error||t("es_code_unknown"),"error");}
  }
}
function esAuthBanner(html){
  ["landing","app-screen"].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display="none";});
  const a=document.getElementById("auth-screen");if(a)a.style.display="flex";
  try{showAuthTab("login");}catch(_){}
  let b=document.getElementById("es-auth-banner");
  const box=document.querySelector("#auth-screen .auth-box")||document.querySelector("#auth-screen .auth-card")||document.getElementById("tab-login")?.parentElement;
  if(!b&&box){b=document.createElement("div");b.id="es-auth-banner";b.className="es-auth-banner";box.prepend(b);}
  if(b)b.innerHTML=html;
}
if(typeof checkSectorPublicViews==="function"){
  const _esP=checkSectorPublicViews;
  checkSectorPublicViews=async function(){
    const q=new URLSearchParams(window.location.search);const code=q.get("rejoindre");
    if(code){
      try{sessionStorage.setItem("zd_join",code);}catch(_){}
      window.history.replaceState({},"",window.location.pathname);
      if(State.token&&State.tenant)return false;
      let info=null;try{info=await api("GET",`/join/${encodeURIComponent(code.replace(/[^A-Za-z0-9]/g,""))}`);}catch(_){}
      esAuthBanner(info?`<div class="es-ab-h">${esDot("member",info.sector)}<div><b>${esc(info.name)}</b><div>${esc(info.roles.map(r=>esRoleName(r.key,r.label)).join(" · "))}</div></div></div><div>${esc(t("es_auth_join"))}</div>`:`<div>${esc(t("es_code_unknown"))}</div>`);
      return true;
    }
    return await _esP.apply(this,arguments);
  };
}
(function(){
  const o=window.checkPendingInvite;
  window.checkPendingInvite=async function(){
    const token=new URLSearchParams(window.location.search).get("invite");if(!token)return false;
    let info=null;try{info=await api("GET",`/team/invite-info/${token}`);}catch(_){}
    if(!info||!info.existing_account)return await o.apply(this,arguments);
    try{sessionStorage.setItem("zd_invite",token);}catch(_){}
    window.history.replaceState({},"",window.location.pathname);
    if(State.token&&State.tenant)return false;
    esAuthBanner(`<div class="es-ab-h">${esDot("member",null)}<div><b>${esc(info.company_name||"")}</b><div>${esc(esRoleName(info.role,info.role_label))}</div></div></div><div>${esc(abTr("es_auth_invite",{m:info.email}))}</div>`);
    const le=document.getElementById("login-email");if(le)le.value=info.email;
    return true;
  };
})();

// ── Équipe : statuts par secteur, demandes, code d'établissement ──
function esIsOwnerOrAdmin(){const u=esU();return !u.member_role||u.member_role==="admin";}
function esRoleGroups(roles,selected,placeholder){
  const gen=roles.filter(r=>!r.sector),bySec={};
  roles.filter(r=>r.sector).forEach(r=>{(bySec[r.sector]=bySec[r.sector]||[]).push(r);});
  const opt=r=>`<option value="${r.key}" ${r.key===selected?"selected":""}>${esc(esRoleName(r.key,r.label))}</option>`;
  return (placeholder?`<option value="" ${!selected?"selected":""} disabled>${esc(t("es_pick_status"))}</option>`:"")+
    Object.entries(bySec).map(([s,l])=>`<optgroup label="${esc(sectorLabel(s))}">${l.map(opt).join("")}</optgroup>`).join("")+
    (gen.length?`<optgroup label="${esc(t("es_generic_roles"))}">${gen.map(opt).join("")}</optgroup>`:"");
}
window.roleOptions=function(selected,customEnabled){
  const roles=(_es.team&&_es.team.roles)||ROLE_KEYS.filter(k=>k!=="custom"||customEnabled).map(k=>({key:k,label:t("role_"+k),sector:null}));
  return esRoleGroups(roles.filter(r=>r.key!=="custom"||customEnabled),selected,false);
};
window.openInviteModal=function(){
  const sel=document.getElementById("invite-role");
  const roles=(_es.team&&_es.team.roles)||[{key:"admin",label:t("role_admin"),sector:null}];
  sel.innerHTML=esRoleGroups(roles,"",true);sel.disabled=false;
  renderCustomModules("invite-custom-box",[]);
  document.getElementById("invite-custom-box").style.display="none";
  document.getElementById("invite-role-desc").textContent=t("es_pick_status_x");
  document.getElementById("modal-invite").style.display="flex";
};
window.onInviteRoleChange=function(){
  const role=document.getElementById("invite-role").value;
  document.getElementById("invite-custom-box").style.display=role==="custom"?"block":"none";
  const d=t("role_desc_"+role);document.getElementById("invite-role-desc").textContent=d&&d!=="role_desc_"+role?d:"";
};
window.onRoleSelectChange=function(){
  const role=document.getElementById("role-select").value;
  document.getElementById("role-custom-box").style.display=role==="custom"?"block":"none";
  const d=t("role_desc_"+role);document.getElementById("role-desc").textContent=d&&d!=="role_desc_"+role?d:"";
};
window.submitInvite=async function(){
  const email=document.getElementById("invite-email").value.trim();
  const role=document.getElementById("invite-role").value;
  if(!email){flagMissingFields([document.getElementById("invite-email")]);return;}
  if(!role){flagMissingFields([document.getElementById("invite-role")]);showToast(t("es_pick_status"),"error");return;}
  const body={email,role};
  if(role==="custom"){body.permissions=selectedCustomModules("invite-custom-box");if(!body.permissions.length){showToast(t("pick_one_section"),"error");return;}}
  try{const r=await api("POST","/team/invite",body);closeInviteModal();
    if(r.existing_account)showToast(abTr("es_invited_existing",{m:email}));
    showInviteLink(r.invite_token);loadTeam();
  }catch(e){showToast(e.message,"error");}
};
window.loadTeam=async function(){
  if(esIsOwnerOrAdmin()&&typeof loadAccountantAccess==="function")loadAccountantAccess();
  else{const a=document.getElementById("acc-access-card");if(a)a.style.display="none";}
  let d;try{d=await api("GET","/team/members");_es.team=d;}catch(e){showToast(e.message,"error");return;}
  const pct=d.seats_limit===-1?0:Math.min(100,(d.seats_used/d.seats_limit)*100);
  const color=pct>=90?"var(--red)":pct>=70?"var(--amber)":"var(--green)";
  set("team-seats-label",`${d.seats_used}/${d.seats_limit===-1?"∞":d.seats_limit}`);
  const bar=document.getElementById("team-seats-bar");if(bar)bar.innerHTML=`<div class="usage-bar-fill" style="width:${pct}%;background:${color}"></div>`;
  set("team-seats-note",(d.seats_limit!==-1&&d.seats_used>=d.seats_limit?t("seats_limit_reached"):t("seats_note"))+" "+t("es_seats_free"));
  const tb=document.getElementById("team-members-tbody");
  if(tb){tb.innerHTML=d.members.length?d.members.map(m=>`<tr>
      <td style="font-weight:600">${esc(m.name)}${m.linked?` <i class="ti ti-link" title="${esc(t("es_linked"))}" style="color:var(--muted);font-size:12px"></i>`:""}</td>
      <td style="font-family:var(--mono);font-size:12px">${esc(m.email)}</td>
      <td><span class="badge bb">${esc(esRoleName(m.role,m.role_label))}</span>${m.can_manage?` <button class="btn btn-o btn-sm" style="padding:2px 8px" data-id="${esc(m.id)}" data-name="${esc(m.name)}" data-role="${esc(m.role)}" data-perms="${esc(JSON.stringify(m.permissions||[]))}" onclick="openRoleModal(this.dataset.id,this.dataset.name,this.dataset.role,JSON.parse(this.dataset.perms))">${esc(t("btn_change_role"))}</button>`:""}</td>
      <td style="font-family:var(--mono);font-size:11px">${fmtDate(m.last_seen_at)}</td>
      <td>${m.is_active?`<span class="badge bg">${t("st_active")}</span>`:`<span class="badge br">${t("st_banned")}</span>`}</td>
      <td>${m.can_manage?`<button class="btn btn-sm btn-r" onclick="removeMember('${m.id}','${escJs(m.name)}')" aria-label="${esc(t("es_remove"))} ${esc(m.name)}"><i class="ti ti-trash"></i></button>`:""}</td></tr>`).join("")
    :`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("no_members_yet")}</td></tr>`;}
  const ib=document.getElementById("team-invites-list");
  if(ib)ib.innerHTML=d.pending_invites.length?d.pending_invites.map(i=>`<div class="es-inv"><div><div style="font-size:13px">${esc(i.email)} <span class="badge bb">${esc(esRoleName(i.role,i.role_label))}</span></div><div style="font-family:var(--mono);font-size:10px;color:var(--muted)">${t("sent_on")} ${fmtDate(i.created_at)}</div></div>
      <div style="display:flex;gap:6px"><button class="btn btn-sm btn-o" onclick="showInviteLink('${i.token}')"><i class="ti ti-link"></i> ${t("btn_link")}</button><button class="btn btn-sm btn-r" onclick="cancelInvite('${i.id}')" aria-label="${esc(t("btn_cancel"))}"><i class="ti ti-x"></i></button></div></div>`).join("")
    :`<div style="color:var(--muted);font-size:13px">${t("no_pending_invites")}</div>`;
  esTeamExtras(d);
};
function esTeamBox(id,afterSel){
  let b=document.getElementById(id);
  if(!b){const pg=document.getElementById("page-team");if(!pg)return null;b=document.createElement("div");b.id=id;b.className="card es-card";const ref=pg.querySelector(afterSel);if(ref)ref.after(b);else pg.appendChild(b);}
  return b;
}
async function esTeamExtras(d){
  const rb=esTeamBox("es-req-card","#acc-access-card");
  if(rb)await esRequestsInto(rb);
  const jb=esTeamBox("es-join-card","#es-req-card");
  if(!jb)return;
  if(!esIsOwnerOrAdmin()){jb.style.display="none";return;}
  try{_es.join=await api("GET","/team/join-settings");}catch(e){jb.innerHTML=`<div class="es-err">${esc(e.message)}</div>`;return;}
  esJoinRender();
}
async function esRequestsInto(box){
  try{_es.reqs=await api("GET","/team/requests");}catch(_){box.style.display="none";return;}
  const R=_es.reqs||[];box.style.display=R.length?"":"none";
  box.innerHTML=`<div class="es-h"><b><i class="ti ti-hand-stop"></i> ${esc(t("es_reqs_t"))}</b><span class="badge ba">${R.length}</span></div><div class="es-muted" style="margin-bottom:8px">${esc(t("es_reqs_x"))}</div>`+R.map(r=>`<div class="es-row"><div class="es-txt"><b>${esc(r.name)}</b> <span class="es-muted">${esc(r.email)}</span>
      <div class="es-tags"><span class="es-tag">${esc(esRoleName(r.role,r.role_label))}</span><span class="es-muted">${esc(fmtDate(r.created_at))}</span></div>${r.message?`<div class="es-msg">« ${esc(r.message)} »</div>`:""}</div>
      <div class="es-acts"><button class="btn btn-o btn-sm" onclick="esRefuseModal('${r.id}','${escJs(r.name)}')">${esc(t("es_refuse"))}</button><button class="btn btn-g btn-sm" onclick="esAcceptModal('${r.id}')"><i class="ti ti-check"></i> ${esc(t("es_accept"))}</button></div></div>`).join("");
}
async function esAcceptModal(id){
  const r=(_es.reqs||[]).find(x=>x.id===id);if(!r)return;
  if(r.role==="parent"){
    zdModal("modal-es",`<div class="modal-title"><i class="ti ti-users" style="color:var(--green)"></i> ${esc(abTr("es_parent_t",{n:r.name}))}</div>
      <div class="es-muted" style="margin-bottom:8px">${esc(t("es_parent_x"))}</div>
      <input class="inp" id="es-st-q" placeholder="${esc(t("es_parent_search"))}" aria-label="${esc(t("es_parent_search"))}" oninput="esStudentList()">
      <div id="es-st-list" class="es-stlist"></div><div class="sc-hint" id="es-st-h"></div>
      <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-es')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="esAcceptGo('${id}')"><i class="ti ti-check"></i> ${esc(t("es_accept"))}</button></div>`,520);
    try{_es.students=await api("GET","/school/students");}catch(_){_es.students=[];}
    esStudentList();return;
  }
  const roles=(_es.team&&_es.team.roles)||[];
  zdModal("modal-es",`<div class="modal-title"><i class="ti ti-user-check" style="color:var(--green)"></i> ${esc(abTr("es_accept_t",{n:r.name}))}</div>
    <div class="fgrp"><label class="fl" for="es-acc-role">${esc(t("lbl_role"))}</label><select class="inp" id="es-acc-role" onchange="esAccTeacher()">${esRoleGroups(roles,r.role,false)}</select></div>
    <div id="es-acc-tch"></div><div class="es-free"><i class="ti ti-info-circle"></i> ${esc(t("es_seat_uses"))}</div><div class="sc-hint" id="es-acc-h"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-es')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="esAcceptGo('${id}')"><i class="ti ti-check"></i> ${esc(t("es_accept"))}</button></div>`,480);
  esAccTeacher();
}
async function esAccTeacher(){
  const box=document.getElementById("es-acc-tch");if(!box)return;
  if(zdVal("es-acc-role")!=="sc_teacher"){box.innerHTML="";return;}
  let list=[];try{list=await api("GET","/school/teachers");}catch(_){}
  box.innerHTML=`<div class="fgrp"><label class="fl" for="es-acc-t">${esc(t("es_teacher_card"))}</label><select class="inp" id="es-acc-t"><option value="">${esc(t("es_teacher_auto"))}</option>${list.filter(x=>x.active).map(x=>`<option value="${x.id}">${esc(x.name)}${x.subjects?" · "+esc(x.subjects):""}</option>`).join("")}</select></div>`;
}
function esStudentList(){
  const q=(zdVal("es-st-q")||"").toLowerCase();const box=document.getElementById("es-st-list");if(!box)return;
  const sel=new Set([...document.querySelectorAll(".es-st:checked")].map(x=>x.value));
  const L=(_es.students||[]).filter(s=>!q||(s.name||"").toLowerCase().includes(q)||(s.parent_name||"").toLowerCase().includes(q)||(s.matricule||"").toLowerCase().includes(q)).slice(0,60);
  box.innerHTML=L.map(s=>`<label class="es-st-row"><input type="checkbox" class="es-st" value="${s.id}" ${sel.has(s.id)?"checked":""}> <span><b>${esc(s.name)}</b> <small>${esc(s.class_name||"")}${s.parent_name?" · "+esc(s.parent_name):""}</small></span></label>`).join("")||zdEmpty(t("es_no_student"),"users");
}
async function esAcceptGo(id){
  const r=(_es.reqs||[]).find(x=>x.id===id);if(!r)return;
  const body={};
  if(r.role==="parent"){body.student_ids=[...document.querySelectorAll(".es-st:checked")].map(x=>x.value);if(!body.student_ids.length){const h=document.getElementById("es-st-h");h.style.color="var(--red)";h.textContent=t("es_parent_need");return;}}
  else{body.role=zdVal("es-acc-role");const tc=zdVal("es-acc-t");if(tc)body.teacher_id=tc;}
  try{await api("POST",`/team/requests/${id}/accept`,body);zdCloseModal("modal-es");showToast(t("es_accepted"));
    if(document.getElementById("page-team")?.classList.contains("active"))loadTeam();else{const b=document.getElementById("es-req-sc");if(b)esRequestsInto(b);}}
  catch(e){const h=document.getElementById(r.role==="parent"?"es-st-h":"es-acc-h");if(h){h.style.color="var(--red)";h.textContent=e.message;}else showToast(e.message,"error");}
}
function esRefuseModal(id,name){
  zdModal("modal-es",`<div class="modal-title"><i class="ti ti-x" style="color:var(--red)"></i> ${esc(abTr("es_refuse_t",{n:name}))}</div>
    <div class="fgrp"><label class="fl" for="es-ref">${esc(t("es_refuse_why"))}</label><input class="inp" id="es-ref" maxlength="300" placeholder="${esc(t("es_refuse_ph"))}"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-es')">${esc(t("btn_cancel"))}</button><button class="btn btn-r btn-sm" onclick="esRefuseGo('${id}')">${esc(t("es_refuse"))}</button></div>`,440);
}
async function esRefuseGo(id){
  try{await api("POST",`/team/requests/${id}/refuse`,{reason:zdVal("es-ref")||null});zdCloseModal("modal-es");showToast(t("es_refused"));
    if(document.getElementById("page-team")?.classList.contains("active"))loadTeam();else{const b=document.getElementById("es-req-sc");if(b)esRequestsInto(b);}}
  catch(e){showToast(e.message,"error");}
}
function esJoinUrl(code){return `${window.location.origin}/?rejoindre=${encodeURIComponent(code)}`;}
function esJoinRender(){
  const b=document.getElementById("es-join-card");const j=_es.join;if(!b||!j)return;b.style.display="";
  const av=j.roles_available||[];
  b.innerHTML=`<div class="es-h"><b><i class="ti ti-qrcode"></i> ${esc(t("es_jc_t"))}</b><label class="pt-switch" title="${esc(t("es_jc_open"))}"><input type="checkbox" id="es-jc-open" ${j.open?"checked":""} onchange="esJoinSave()" aria-label="${esc(t("es_jc_open"))}"><span></span></label></div>
    <div class="es-muted" style="margin-bottom:10px">${esc(t("es_jc_x"))}</div>
    ${j.open&&j.code?`<div class="es-code"><b class="mono">${esc(j.code)}</b><div class="es-acts"><button class="btn btn-o btn-sm" onclick="esCopyJoin()"><i class="ti ti-copy"></i> ${esc(t("es_jc_copy"))}</button><a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(abTr("es_jc_wa",{u:esJoinUrl(j.code)}))}"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a><button class="btn btn-o btn-sm" onclick="esJoinSave(true)"><i class="ti ti-refresh"></i> ${esc(t("es_jc_new"))}</button></div></div><div class="es-muted mono" style="word-break:break-all;margin-bottom:10px">${esc(esJoinUrl(j.code))}</div>`:""}
    <div class="fl">${esc(t("es_jc_roles"))}</div>
    <div class="es-roles">${j.school?`<label class="es-role"><input type="checkbox" id="es-jc-par" ${j.parents?"checked":""}> <span>${esc(t("es_parent"))}</span></label>`:""}${av.map(r=>`<label class="es-role"><input type="checkbox" class="es-jc-r" value="${r.key}" ${j.roles.includes(r.key)?"checked":""}> <span>${esc(esRoleName(r.key,r.label))}</span></label>`).join("")}</div>
    <div class="es-muted" style="margin:8px 0">${esc(t("es_jc_safe"))}</div>
    <button class="btn btn-g btn-sm" onclick="esJoinSave()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button><div class="sc-hint" id="es-jc-h"></div>`;
}
async function esJoinSave(regen){
  if(regen&&!confirm(t("es_jc_new_confirm")))return;
  const body={open:!!document.getElementById("es-jc-open")?.checked,roles:[...document.querySelectorAll(".es-jc-r:checked")].map(x=>x.value)};
  const par=document.getElementById("es-jc-par");if(par)body.parents=par.checked;
  if(regen)body.regenerate=true;
  try{_es.join=await api("PUT","/team/join-settings",body);esJoinRender();showToast(t("toast_saved"));}
  catch(e){const h=document.getElementById("es-jc-h");if(h){h.style.color="var(--red)";h.textContent=e.message;}const o=document.getElementById("es-jc-open");if(o&&_es.join)o.checked=_es.join.open;}
}
function esCopyJoin(){const j=_es.join;if(!j||!j.code)return;navigator.clipboard.writeText(esJoinUrl(j.code)).then(()=>showToast(t("es_jc_copied"))).catch(()=>{});}

// Le secrétariat reçoit les demandes des parents sur la page Élèves
if(typeof SECTOR_PAGE_LOADERS==="object"&&SECTOR_PAGE_LOADERS.schoolstudents){
  const _esSL=SECTOR_PAGE_LOADERS.schoolstudents;
  SECTOR_PAGE_LOADERS.schoolstudents=async function(el){
    await _esSL.apply(this,arguments);
    const u=esU();if(!(u.member_role==="sc_secretary"||u.member_role==="sc_director"))return;
    let b=document.getElementById("es-req-sc");if(!b){b=document.createElement("div");b.id="es-req-sc";b.className="card es-card";el.querySelector(".sh")?.after(b);}
    await esRequestsInto(b);
  };
}
