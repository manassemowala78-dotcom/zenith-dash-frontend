async function loadAccountantAccess(){
  const box=document.getElementById("acc-access-box");if(!box)return;
  if(isTeamMember()){document.getElementById("acc-access-card").style.display="none";return;}
  try{
    const r=await api("GET","/accountant-access");
    if(!r.allowed){box.innerHTML=`<div style="font-size:12px;color:var(--amber)"><i class="ti ti-lock"></i> ${t("acc_locked")}</div>`;return;}
    box.innerHTML=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><input class="inp" id="acc-email" type="email" placeholder="${t("acc_email_ph")}" style="flex:1;min-width:180px">
        <select class="inp" id="acc-level" style="width:auto"><option value="write">${t("acc_write")}</option><option value="read">${t("acc_read")}</option></select>
        <button class="btn btn-g btn-sm" onclick="inviteAccountant()"><i class="ti ti-send"></i> ${t("btn_invite")}</button></div>
      ${r.links.map(l=>`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--b);font-size:13px">
        <i class="ti ti-briefcase" style="color:var(--green)"></i><span style="flex:1;min-width:160px"><b>${esc(l.accountant_name||l.email)}</b>${l.accountant_name?`<div style="font-size:11px;color:var(--muted)">${esc(l.email)}</div>`:""}</span>
        <span class="badge ${l.status==="active"?"bg":"ba"}">${l.status==="active"?t("acc_active"):t("acc_invited")}</span><span class="badge bb">${l.access==="write"?t("acc_write"):t("acc_read")}</span>
        ${l.invite_url?`<button class="btn btn-o btn-sm" onclick="copyText('${esc(l.invite_url)}')"><i class="ti ti-copy"></i></button><a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(t("acc_wa_text").replace("{company}",State.tenant.company_name||State.tenant.name)+" "+l.invite_url)}"><i class="ti ti-brand-whatsapp"></i></a>`:""}
        <button class="btn btn-sm btn-r" onclick="revokeAccountant('${l.id}')">${t("btn_revoke")}</button></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${t("acc_none")}</div>`}`;
  }catch(e){box.innerHTML=`<div style="color:var(--red);font-size:12px">${esc(e.message)}</div>`;}
}
async function inviteAccountant(){
  const email=document.getElementById("acc-email").value.trim();if(!email){flagMissingFields([document.getElementById("acc-email")]);return;}
  try{const l=await api("POST","/accountant-access",{email,access:document.getElementById("acc-level").value});showToast(t("acc_invite_created"));loadAccountantAccess();if(l.invite_url)copyText(l.invite_url);}
  catch(e){showToast(e.message,"error");}
}
async function revokeAccountant(id){if(!confirm(t("acc_confirm_revoke")))return;try{await api("DELETE",`/accountant-access/${id}`);loadAccountantAccess();}catch(e){showToast(e.message,"error");}}
async function loadAccountantPage(){
  const box=document.getElementById("acc-clients");if(!box)return;
  try{
    const r=await api("GET","/accountant/clients");
    box.innerHTML=r.clients.length?`<div class="acc-grid">${r.clients.map(c=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><div style="font-weight:800">${esc(c.company)}</div><div style="font-size:11px;color:var(--muted)">${planBadge(c.plan)} · ${c.access==="write"?t("acc_write"):t("acc_read")}</div></div>${c.blocked?`<span class="badge br">${t("acc_blocked")}</span>`:""}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0;font-size:12px"><span>${t("acc_revenue_month")}<br><b style="font-family:var(--mono)">${fmtUSD(c.revenue_month)}</b></span><span>${t("acc_expenses_month")}<br><b style="font-family:var(--mono)">${fmtUSD(c.expenses_month)}</b></span>
        <span>${t("acc_receivables")}<br><b style="font-family:var(--mono);color:var(--amber)">${fmtUSD(c.receivables)}</b></span><span>${t("acc_payables")}<br><b style="font-family:var(--mono)">${fmtUSD(c.payables)}</b></span></div>
      <button class="btn btn-g btn-sm" style="width:100%" onclick="openAccountantClient('${c.link_id}')"><i class="ti ti-folder-open"></i> ${t("acc_open")}</button></div>`).join("")}</div>`
      :`<div class="card" style="text-align:center;color:var(--muted);padding:24px"><i class="ti ti-briefcase" style="font-size:28px"></i><div style="margin-top:8px">${t("acc_no_clients")}</div></div>`;
  }catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;}
}
async function switchAccountantSession(r){
  await offlineCacheClear();
  State.token=r.token;State.tenant=r.user;localStorage.setItem("zd_token",r.token);localStorage.setItem("zd_tenant",JSON.stringify(r.user));
  window.location.href=window.location.pathname+(r.user.accountant_mode?"?p=ledger":"?p=accountant");
}
async function openAccountantClient(linkId){try{await switchAccountantSession(await api("POST",`/accountant/clients/${linkId}/open`));}catch(e){showToast(e.message,"error");}}
async function returnToFirm(){try{await switchAccountantSession(await api("POST","/accountant/return"));}catch(e){showToast(e.message,"error");}}
function renderAccountantBanner(){
  const b=document.getElementById("accountant-banner");if(!b)return;
  if(!State.tenant?.accountant_mode){b.style.display="none";document.body.classList.remove("acc-mode");return;}
  b.style.display="flex";document.body.classList.add("acc-mode");
  b.innerHTML=`<i class="ti ti-briefcase"></i><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t("acc_banner").replace("{company}",esc(State.tenant.company_name||State.tenant.name))}</span>
    <button class="btn btn-sm" style="background:#fff;color:#0b3d2a;font-weight:700" onclick="returnToFirm()"><i class="ti ti-arrow-back-up"></i> ${t("acc_return")}</button>`;
}
async function checkAccountantInvite(){
  const token=new URLSearchParams(window.location.search).get("accountant_invite")||sessionStorage.getItem("zd_acc_invite");
  if(!token)return false;
  let info;
  try{const r=await fetch(`${API_BASE}/accountant-access/invite/${encodeURIComponent(token)}`);info=await r.json();if(!r.ok)throw new Error(info.detail||"Erreur");}
  catch(e){sessionStorage.removeItem("zd_acc_invite");showToast(e.message,"error");return false;}
  sessionStorage.setItem("zd_acc_invite",token);
  if(!State.token){
    document.getElementById("landing").style.display="none";document.getElementById("auth-screen").style.display="flex";
    const n=document.getElementById("acc-invite-note");n.style.display="block";n.textContent=t("acc_invite_login").replace("{company}",info.company);
    try{showAuthTab("login");}catch(_){}
    return true;
  }
  if(!confirm(t("acc_invite_confirm").replace("{company}",info.company).replace("{access}",info.access==="write"?t("acc_write"):t("acc_read"))))
    {sessionStorage.removeItem("zd_acc_invite");return false;}
  try{await api("POST","/accountant-access/accept",{token});sessionStorage.removeItem("zd_acc_invite");showToast(t("acc_accepted").replace("{company}",info.company));
    history.replaceState(null,"",window.location.pathname+"?p=accountant");}
  catch(e){sessionStorage.removeItem("zd_acc_invite");showToast(e.message,"error");}
  return false;
}
