const PAGE_MODULES={booking:"sales",assets:"accounting",creports:"reports",shop:"sales",purchases:"accounting",marketing:"sales",ledger:"accounting",attendance:"hr",pos:"sales",invoices:"invoices",clients:"clients",crm:"sales",quotes:"sales",stock:"stock",supply:"stock",pricelist:"stock",
  employees:"hr",leaves:"hr",payroll:"hr",expenses:"accounting",pl:"accounting",reminders:"accounting",bank:"accounting",margin:"accounting",calendar:"accounting",
  reports:"reports",analytics:"reports",ai:"reports",projects:"projects",objectives:"projects",files:"files",integrations:"integrations",audit:"audit"};
function isTeamMember(){return !!State.tenant?.member_role;}
function zdIsMgrRole(){return State.tenant?.member_role==="admin"||!!State.tenant?.member_manager;}
function memberCanOpen(page){
  if(!isTeamMember())return true;
  if(page==="team")return false;
  if(State.tenant.member_role==="admin")return true;
  const mod=PAGE_MODULES[page];
  if(!mod)return true;
  return !!(State.tenant.member_access||{})[mod];
}
function applyMemberUI(){
  document.querySelectorAll(".nav-i[data-p],.bnav-item[data-bp]").forEach(el=>{
    const p=el.dataset.p||el.dataset.bp;
    el.classList.toggle("zd-hidden-role",!memberCanOpen(p));
  });
  document.querySelectorAll("#more-menu [onclick]").forEach(el=>{
    const m=(el.getAttribute("onclick")||"").match(/navigate\('([a-z0-9-]+)'\)/);
    if(m) el.classList.toggle("zd-hidden-role",!memberCanOpen(m[1]));
  });
  if(typeof applySectorUI==="function") applySectorUI();
}
function decodeJwtPayload(token){
  try{const part=token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");return JSON.parse(decodeURIComponent(escape(atob(part+"=".repeat((4-part.length%4)%4)))));}
  catch(_){return {};}
}
async function upgradeLegacySession(){
  if(!State.token||decodeJwtPayload(State.token).sid)return;
  try{
    const r=await api("POST","/auth/session/upgrade");
    if(r.token){State.token=r.token;localStorage.setItem("zd_token",r.token);}
  }catch(_){}
}
let _loginChallenge=null;
function showLogin2faStep(show){
  document.getElementById("login-form").style.display=show?"none":"block";
  document.getElementById("login-2fa-step").style.display=show?"block":"none";
  if(show){const i=document.getElementById("login-2fa-code");i.value="";setTimeout(()=>i.focus(),50);}
}
async function submitLogin2fa(e){
  if(e)e.preventDefault();
  const code=document.getElementById("login-2fa-code").value.trim();
  const btn=document.getElementById("login-2fa-btn");
  if(!code){markMissingField(document.getElementById("login-2fa-code"));return;}
  btn.disabled=true;
  try{
    const r=await api("POST","/auth/login/2fa",{challenge:_loginChallenge,code});
    State.token=r.token;State.tenant=r.user;
    localStorage.setItem("zd_token",r.token);localStorage.setItem("zd_tenant",JSON.stringify(r.user));
    _loginChallenge=null;showLogin2faStep(false);
    showAppLayout();
    if(typeof r.backup_codes_left==="number") showToast(t("backup_codes_left").replace("{n}",r.backup_codes_left),r.backup_codes_left<=2?"error":"info");
  }catch(err){showErr("login-2fa-err",err.message);}
  finally{btn.disabled=false;}
}
function cancelLogin2fa(){_loginChallenge=null;showLogin2faStep(false);}
function fmtDateTime(iso){
  if(!iso)return "—";
  return parseServerDate(iso).toLocaleString(State.lang==="ar"?"ar":State.lang,{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
async function loadSecurityCard(){
  const box=document.getElementById("security-2fa-status");if(!box)return;
  try{
    const s=await api("GET","/security/status");
    box.innerHTML=s.two_factor_enabled
      ?`<span class="badge bg"><i class="ti ti-shield-check"></i> ${t("twofa_on")}</span> <span style="font-size:12px;color:var(--muted);margin-left:6px">${t("backup_codes_left").replace("{n}",s.backup_codes_left)}</span>`
      :`<span class="badge br"><i class="ti ti-shield-off"></i> ${t("twofa_off")}</span>`;
    document.getElementById("twofa-enable-btn").style.display=s.two_factor_enabled?"none":"inline-flex";
    document.getElementById("twofa-disable-btn").style.display=s.two_factor_enabled?"inline-flex":"none";
    document.getElementById("twofa-codes-btn").style.display=s.two_factor_enabled?"inline-flex":"none";
  }catch(e){box.textContent=e.message;}
  loadSessions();
  loadBackups();
}
async function start2faSetup(){
  try{
    const r=await api("POST","/security/2fa/setup");
    document.getElementById("twofa-secret").textContent=r.secret.replace(/(.{4})/g,"$1 ").trim();
    document.getElementById("twofa-open-app").href=r.otpauth_uri;
    const qrBox=document.getElementById("twofa-qr");
    qrBox.innerHTML="";
    if(typeof qrcode==="function"){
      const qr=qrcode(0,"M");qr.addData(r.otpauth_uri);qr.make();
      qrBox.innerHTML=qr.createSvgTag({cellSize:5,margin:2,scalable:true});
      const svg=qrBox.querySelector("svg");if(svg){svg.style.width="200px";svg.style.height="200px";svg.style.background="#fff";svg.style.borderRadius="8px";}
    }else qrBox.innerHTML=`<div style="font-size:12px;color:var(--muted)">${t("qr_unavailable")}</div>`;
    document.getElementById("twofa-setup-step").style.display="block";
    document.getElementById("twofa-codes-step").style.display="none";
    document.getElementById("twofa-confirm-code").value="";
    document.getElementById("modal-2fa").style.display="flex";
  }catch(e){showToast(e.message,"error");}
}
async function submitEnable2fa(){
  const code=document.getElementById("twofa-confirm-code").value.trim();
  if(!code){markMissingField(document.getElementById("twofa-confirm-code"));return;}
  try{
    const r=await api("POST","/security/2fa/enable",{code});
    showBackupCodes(r.backup_codes);
    loadSecurityCard();
    showToast(t("twofa_enabled_toast"));
  }catch(e){showToast(e.message,"error");}
}
let _lastBackupCodes=[];
function showBackupCodes(codes){
  _lastBackupCodes=codes;
  document.getElementById("twofa-setup-step").style.display="none";
  document.getElementById("twofa-codes-step").style.display="block";
  document.getElementById("twofa-codes-list").innerHTML=codes.map(c=>`<div style="font-family:var(--mono);font-size:15px;padding:6px 10px;background:var(--bg);border:1px solid var(--b);border-radius:6px;text-align:center">${esc(c)}</div>`).join("");
  document.getElementById("modal-2fa").style.display="flex";
}
function backupCodesText(){return `Zenith Dash — ${t("backup_codes_title")}\n${State.tenant?.acting_as_member_email||State.tenant?.email||""}\n\n${_lastBackupCodes.join("\n")}\n\n${t("backup_codes_hint")}`;}
async function copyBackupCodes(){
  try{await navigator.clipboard.writeText(backupCodesText());showToast(t("diag_copied"));}catch(e){showToast(e.message,"error");}
}
function downloadBackupCodes(){
  const blob=new Blob([backupCodesText()],{type:"text/plain"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="zenith-dash-codes-de-secours.txt";document.body.appendChild(a);a.click();a.remove();
}
function close2faModal(){document.getElementById("modal-2fa").style.display="none";}
function openDisable2fa(){
  document.getElementById("twofa-disable-password").value="";document.getElementById("twofa-disable-code").value="";
  document.getElementById("modal-2fa-disable").style.display="flex";
}
function closeDisable2fa(){document.getElementById("modal-2fa-disable").style.display="none";}
async function submitDisable2fa(){
  const password=document.getElementById("twofa-disable-password").value;
  const code=document.getElementById("twofa-disable-code").value.trim();
  try{
    await api("POST","/security/2fa/disable",{password,code});
    closeDisable2fa();loadSecurityCard();showToast(t("twofa_disabled_toast"));
  }catch(e){showToast(e.message,"error");}
}
async function regenerateBackupCodes(){
  const code=prompt(t("prompt_2fa_code"));
  if(!code)return;
  try{const r=await api("POST","/security/2fa/backup-codes",{code:code.trim()});showBackupCodes(r.backup_codes);loadSecurityCard();}
  catch(e){showToast(e.message,"error");}
}
async function loadSessions(){
  const box=document.getElementById("sessions-list");if(!box)return;
  try{
    const list=await api("GET","/security/sessions");
    box.innerHTML=list.map(s=>`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--b)">
      <i class="ti ${/Android|iPhone|iPad/.test(s.device)?"ti-device-mobile":"ti-device-laptop"}" style="font-size:22px;color:${s.current?"var(--green)":"var(--muted)"}"></i>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600">${esc(s.device)} ${s.current?`<span class="badge bg" style="margin-left:4px">${t("this_device")}</span>`:""}</div>
        <div style="font-size:11px;color:var(--muted)">${t("last_activity")} ${fmtDateTime(s.last_seen_at)}${s.ip?` · ${esc(s.ip)}`:""}</div>
      </div>
      ${s.current?"":`<button class="btn btn-o btn-sm" onclick="revokeSession('${s.id}')"><i class="ti ti-logout"></i> ${t("btn_disconnect")}</button>`}
    </div>`).join("")||`<div style="font-size:13px;color:var(--muted)">—</div>`;
    document.getElementById("revoke-others-btn").style.display=list.filter(s=>!s.current).length?"inline-flex":"none";
  }catch(e){box.textContent=e.message;}
}
async function revokeSession(id){
  if(!confirm(t("confirm_revoke_session")))return;
  try{await api("DELETE",`/security/sessions/${id}`);showToast(t("toast_session_revoked"));loadSessions();}
  catch(e){showToast(e.message,"error");}
}
async function revokeOtherSessions(){
  if(!confirm(t("confirm_revoke_others")))return;
  try{const r=await api("POST","/security/sessions/revoke-others");showToast(t("toast_sessions_revoked").replace("{n}",r.revoked));loadSessions();}
  catch(e){showToast(e.message,"error");}
}
async function downloadFullExport(){
  const btn=document.getElementById("export-btn");if(btn)btn.disabled=true;
  showToast(t("export_preparing"));
  try{
    const r=await apiFetch(API_BASE+"/export/full",{method:"GET",headers:{"Authorization":`Bearer ${State.token}`}},true);
    if(!r.ok){await readApiResponse(r);return;}
    const blob=await r.blob();
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download=`zenith-dash-export-${new Date().toISOString().slice(0,10)}.zip`;document.body.appendChild(a);a.click();a.remove();
    showToast(t("export_done"));
  }catch(e){showToast(e.message,"error");}
  finally{if(btn)btn.disabled=false;}
}
async function loadBackups(){
  const box=document.getElementById("backups-box");if(!box)return;
  try{
    const b=await api("GET","/backups");
    if(!b.enabled){box.innerHTML=`<div style="font-size:12px;color:var(--muted)"><i class="ti ti-lock"></i> ${t("backups_locked")}</div>`;return;}
    const fmtSize=n=>n>1048576?`${(n/1048576).toFixed(1)} Mo`:`${Math.max(1,Math.round(n/1024))} Ko`;
    box.innerHTML=`<div style="font-size:12px;color:var(--muted);margin-bottom:8px">${t("backups_desc").replace("{keep}",b.keep)}</div>
      ${b.backups.map(x=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b)">
        <i class="ti ti-archive" style="color:var(--blue)"></i>
        <div style="flex:1;font-size:13px">${fmtDateTime(x.created_at)} <span style="color:var(--muted);font-size:11px">· ${fmtSize(x.size_bytes)} · ${x.kind==="manual"?t("backup_manual"):t("backup_auto")}</span></div>
        ${x.download_url?`<a class="btn btn-o btn-sm" href="${esc(x.download_url)}" target="_blank" rel="noopener"><i class="ti ti-download"></i></a>`:""}
      </div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${t("no_backups_yet")}</div>`}
      <button class="btn btn-o btn-sm" style="margin-top:10px" onclick="runBackupNow()"><i class="ti ti-player-play"></i> ${t("btn_backup_now")}</button>`;
  }catch(e){box.innerHTML=`<div style="font-size:12px;color:var(--red)">${esc(e.message)}</div>`;}
}
async function runBackupNow(){
  try{await api("POST","/backups/run");showToast(t("backup_done"));loadBackups();}
  catch(e){showToast(e.message,"error");}
}
const AUDIT_ICONS={invoice:"ti-file-invoice",client:"ti-users",quote:"ti-file-text",opportunity:"ti-target",product:"ti-box",supplier:"ti-truck",supply_order:"ti-truck-delivery",
  price_item:"ti-tag",employee:"ti-user",leave:"ti-calendar-off",payslip:"ti-receipt",expense:"ti-credit-card",objective:"ti-target-arrow",project:"ti-briefcase",
  bank:"ti-building-bank",file:"ti-folder",company:"ti-building",security:"ti-shield-lock",billing:"ti-building-bank",team:"ti-users-group",webhook:"ti-plug",export:"ti-download"};
async function loadAudit(){
  const list=document.getElementById("audit-list");if(!list)return;
  const locked=document.getElementById("audit-locked");
  const allowed=State.tenant?.audit_history_days;
  if(allowed===0){locked.style.display="block";list.innerHTML="";document.getElementById("audit-filters").style.display="none";return;}
  locked.style.display="none";document.getElementById("audit-filters").style.display="flex";
  const days=document.getElementById("audit-days").value;
  const actor=document.getElementById("audit-actor").value;
  const action=document.getElementById("audit-action").value;
  const qs=new URLSearchParams({days});if(actor)qs.set("actor_id",actor);if(action)qs.set("action",action);
  list.innerHTML=`<div style="color:var(--muted);padding:16px">${t("loading")}</div>`;
  try{
    const r=await api("GET",`/audit?${qs}`);
    const sel=document.getElementById("audit-actor");
    const current=sel.value;
    sel.innerHTML=`<option value="">${t("audit_everyone")}</option>`+r.actors.map(a=>`<option value="${esc(a.id)}">${esc(a.name||"?")}</option>`).join("");
    sel.value=current;
    document.getElementById("audit-limit-note").textContent=r.history_days===-1?t("audit_unlimited"):t("audit_limit").replace("{n}",r.history_days);
    if(!r.entries.length){list.innerHTML=`<div style="color:var(--muted);padding:16px;text-align:center">${t("audit_empty")}</div>`;return;}
    let lastDay="";
    list.innerHTML=r.entries.map(e=>{
      const d=parseServerDate(e.created_at);
      const day=d.toLocaleDateString(State.lang==="ar"?"ar":State.lang,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
      const head=day!==lastDay?`<div style="font-family:var(--mono);font-size:11px;color:var(--muted);text-transform:uppercase;margin:14px 0 6px">${day}</div>`:"";
      lastDay=day;
      return head+`<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:var(--card);border:1px solid var(--b);border-radius:10px;margin-bottom:6px">
        <i class="ti ${AUDIT_ICONS[e.entity_type]||"ti-point"}" style="font-size:18px;color:${e.action.includes("delete")||e.action.includes("revoke")?"var(--red)":"var(--green)"};margin-top:2px"></i>
        <div style="flex:1;min-width:0"><div style="font-size:13px;word-break:break-word"><b>${esc(e.actor_name||"?")}</b> ${esc(e.label)}</div>
        <div style="font-size:11px;color:var(--muted)">${d.toLocaleTimeString(State.lang==="ar"?"ar":State.lang,{hour:"2-digit",minute:"2-digit"})}${e.ip?` · ${esc(e.ip)}`:""}</div></div>
      </div>`;
    }).join("");
  }catch(e){list.innerHTML=`<div style="color:var(--red);padding:16px">${esc(e.message)}</div>`;}
}
const ROLE_KEYS=["admin","accountant","sales","hr","readonly","custom"];
const CUSTOM_MODULE_KEYS=["invoices","clients","sales","stock","hr","accounting","reports","projects","files"];
function roleOptions(selected,customEnabled){
  return ROLE_KEYS.filter(k=>k!=="custom"||customEnabled).map(k=>`<option value="${k}" ${k===selected?"selected":""}>${t("role_"+k)}</option>`).join("");
}
function renderCustomModules(containerId,selected){
  const box=document.getElementById(containerId);if(!box)return;
  box.innerHTML=CUSTOM_MODULE_KEYS.map(m=>`<label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:4px 0;cursor:pointer">
    <input type="checkbox" value="${m}" ${selected.includes(m)?"checked":""}> ${t("module_"+m)}</label>`).join("");
}
function selectedCustomModules(containerId){return [...document.querySelectorAll(`#${containerId} input:checked`)].map(i=>i.value);}
function onInviteRoleChange(){
  const role=document.getElementById("invite-role").value;
  document.getElementById("invite-custom-box").style.display=role==="custom"?"block":"none";
  document.getElementById("invite-role-desc").textContent=t("role_desc_"+role);
}
let _roleEditMember=null;
function openRoleModal(id,name,role,perms){
  _roleEditMember=id;
  document.getElementById("role-modal-name").textContent=name;
  document.getElementById("role-select").innerHTML=roleOptions(role,!!State.tenant?.custom_roles_enabled);
  renderCustomModules("role-custom-box",perms||[]);
  onRoleSelectChange();
  document.getElementById("modal-role").style.display="flex";
}
function onRoleSelectChange(){
  const role=document.getElementById("role-select").value;
  document.getElementById("role-custom-box").style.display=role==="custom"?"block":"none";
  document.getElementById("role-desc").textContent=t("role_desc_"+role);
}
function closeRoleModal(){document.getElementById("modal-role").style.display="none";}
async function submitRoleChange(){
  const role=document.getElementById("role-select").value;
  const body={role};
  if(role==="custom"){body.permissions=selectedCustomModules("role-custom-box");if(!body.permissions.length){showToast(t("pick_one_section"),"error");return;}}
  try{await api("PATCH",`/team/members/${_roleEditMember}/role`,body);closeRoleModal();showToast(t("toast_role_updated"));loadTeam();}
  catch(e){showToast(e.message,"error");}
}
