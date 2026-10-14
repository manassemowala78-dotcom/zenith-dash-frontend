let _companies=null;
async function loadCompanies(){
  if(isTeamMember())return null;
  try{_companies=await api("GET","/companies");}catch(_){_companies=null;}
  renderCompanyChip();return _companies;
}
function renderCompanyChip(){
  const chip=document.getElementById("company-chip");if(!chip)return;
  const list=_companies?.companies||[];
  if(list.length<2){chip.style.display="none";return;}
  const cur=list.find(c=>c.is_current);
  chip.style.display="inline-flex";
  chip.innerHTML=`<i class="ti ti-building"></i> <span style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(cur?.name||"")}</span> <i class="ti ti-switch-horizontal"></i>`;
}
async function openCompaniesModal(){
  await loadCompanies();
  const box=document.getElementById("companies-body");
  const c=_companies||{companies:[],limit:0};
  let ov=null;try{ov=c.companies.length>1?await api("GET","/companies/overview"):null;}catch(_){}
  const stats=id=>ov?.companies.find(x=>x.id===id);
  box.innerHTML=`${c.companies.map(x=>{const s=stats(x.id);return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--b)">
      <i class="ti ti-building" style="font-size:22px;color:${x.is_current?"var(--green)":"var(--muted)"}"></i>
      <div style="flex:1;min-width:0"><div style="font-weight:700">${esc(x.name)} ${x.is_primary?`<span class="badge bb">${t("company_primary")}</span>`:""} ${x.is_current?`<span class="badge bg">${t("company_current")}</span>`:""}</div>
      ${s?`<div style="font-size:11px;color:var(--muted)">${t("company_month")} ${fmtUSD(s.revenue_month)} · ${t("company_receivables")} ${fmtUSD(s.receivables)} · ${s.clients} ${t("company_clients")}</div>`:""}</div>
      ${x.is_current?"":`<button class="btn btn-g btn-sm" onclick="switchCompany('${x.id}')"><i class="ti ti-switch-horizontal"></i> ${t("btn_open")}</button>`}</div>`;}).join("")}
    ${ov?`<div style="margin-top:12px;padding:10px;border-radius:10px;background:var(--bg);font-size:13px"><b>${t("company_total")}</b> — ${t("company_month")} <b style="color:var(--green)">${fmtUSD(ov.totals.revenue_month)}</b> · ${t("company_receivables")} <b>${fmtUSD(ov.totals.receivables)}</b> · ${ov.totals.invoices_month} ${t("company_invoices_month")}</div>`:""}
    <div style="margin-top:14px">${c.can_create?`<div style="display:flex;gap:6px"><input class="inp" id="new-company-name" placeholder="${t("company_name_ph")}"><button class="btn btn-g btn-sm" onclick="createCompany()"><i class="ti ti-plus"></i> ${t("btn_create")}</button></div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px">${t("company_limit").replace("{n}",c.limit===-1?"∞":c.limit)}</div>`:`<div style="font-size:12px;color:var(--amber)"><i class="ti ti-lock"></i> ${t("companies_locked")}</div>`}</div>`;
  document.getElementById("modal-companies").style.display="flex";
}
function closeCompaniesModal(){document.getElementById("modal-companies").style.display="none";}
async function createCompany(){
  const name=document.getElementById("new-company-name").value.trim();
  if(!name){flagMissingFields([document.getElementById("new-company-name")]);return;}
  try{await api("POST","/companies",{company_name:name});showToast(t("toast_company_created"));openCompaniesModal();}catch(e){showToast(e.message,"error");}
}
async function switchCompany(id){
  try{
    const r=await api("POST",`/companies/${id}/switch`);
    await offlineCacheClear();
    State.token=r.token;State.tenant=r.user;localStorage.setItem("zd_token",r.token);localStorage.setItem("zd_tenant",JSON.stringify(r.user));
    window.location.href=window.location.pathname;
  }catch(e){showToast(e.message,"error");}
}
async function loadApiKeys(){
  const box=document.getElementById("api-keys-box");if(!box)return;
  try{
    const r=await api("GET","/api-keys");
    if(!r.enabled){box.innerHTML=`<div style="font-size:12px;color:var(--amber)"><i class="ti ti-lock"></i> ${t("api_locked")}</div>`;return;}
    const base=API_BASE.replace(/\/v1$/,"");
    box.innerHTML=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><input class="inp" id="api-key-name" placeholder="${t("api_key_name_ph")}" style="flex:1;min-width:160px">
        <select class="inp" id="api-key-scope" style="width:auto"><option value="write">${t("api_scope_write")}</option><option value="read">${t("api_scope_read")}</option></select>
        <button class="btn btn-g btn-sm" onclick="createApiKey()"><i class="ti ti-key"></i> ${t("btn_create_key")}</button></div>
      ${r.keys.map(k=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--b);font-size:13px">
        <i class="ti ti-key" style="color:${k.revoked?"var(--muted)":"var(--green)"}"></i>
        <div style="flex:1;min-width:0"><b>${esc(k.name)}</b> <span class="badge ${k.scope==="read"?"bb":"bp"}">${k.scope==="read"?t("api_scope_read"):t("api_scope_write")}</span> ${k.revoked?`<span class="badge badge-gray">${t("api_revoked")}</span>`:""}
          <div style="font-size:11px;color:var(--muted);font-family:var(--mono)">${esc(k.prefix)}… · ${t("api_last_used")} ${k.last_used_at?fmtDateTime(k.last_used_at):t("api_never")}</div></div>
        ${k.revoked?"":`<button class="btn btn-sm btn-r" onclick="revokeApiKey('${k.id}')">${t("btn_revoke")}</button>`}</div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${t("api_no_keys")}</div>`}
      <div style="font-weight:700;font-size:13px;margin:16px 0 6px">${t("api_docs_title")}</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${t("api_docs_desc")}</div>
      <pre class="api-code">curl ${esc(API_BASE)}/invoices/ \\
  -H "Authorization: Bearer zd_live_…"

curl -X POST ${esc(API_BASE)}/clients/ \\
  -H "Authorization: Bearer zd_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Boulangerie Kinshasa","phone":"+243 81 234 5678"}'

curl -X POST ${esc(API_BASE)}/invoices/ \\
  -H "Authorization: Bearer zd_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"client_id":"…","items":[{"description":"Pain","qty":10,"unit_price":2.5,"tax_rate":16}]}'</pre>
      <div style="font-size:12px;margin-top:6px">${t("api_docs_more")} <a href="${esc(base)}/docs" target="_blank" rel="noopener">${esc(base)}/docs</a> · ${t("api_limits")}</div>`;
  }catch(e){box.innerHTML=`<div style="color:var(--red);font-size:12px">${esc(e.message)}</div>`;}
}
async function createApiKey(){
  const name=document.getElementById("api-key-name").value.trim();
  if(!name){flagMissingFields([document.getElementById("api-key-name")]);return;}
  try{
    const r=await api("POST","/api-keys",{name,scope:document.getElementById("api-key-scope").value});
    document.getElementById("api-key-value").value=r.key;
    document.getElementById("modal-api-key").style.display="flex";loadApiKeys();
  }catch(e){showToast(e.message,"error");}
}
async function copyApiKey(){try{await navigator.clipboard.writeText(document.getElementById("api-key-value").value);showToast(t("diag_copied"));}catch(e){document.getElementById("api-key-value").select();}}
function closeApiKeyModal(){document.getElementById("api-key-value").value="";document.getElementById("modal-api-key").style.display="none";}
async function revokeApiKey(id){if(!confirm(t("api_confirm_revoke")))return;try{await api("DELETE",`/api-keys/${id}`);loadApiKeys();}catch(e){showToast(e.message,"error");}}
function barChartSvg(points,valueKey,labelKey,color,fmt){
  const w=560,h=150,pad=20;const max=Math.max(1,...points.map(p=>p[valueKey]));const bw=(w-pad*2)/points.length;
  return `<svg viewBox="0 0 ${w} ${h+24}" style="width:100%;height:auto">${points.map((p,i)=>{const bh=Math.round((p[valueKey]/max)*(h-10));const x=pad+i*bw;
    return `<rect x="${x+2}" y="${h-bh}" width="${Math.max(2,bw-4)}" height="${bh}" rx="3" fill="${color}"><title>${esc(p[labelKey])} : ${fmt(p[valueKey])}</title></rect>${points.length<=12?`<text x="${x+bw/2}" y="${h+14}" font-size="9" text-anchor="middle" fill="currentColor" opacity=".6">${esc(String(p[labelKey]).slice(-5))}</text>`:""}`;}).join("")}</svg>`;
}
async function loadCreatorDashboard(){
  const box=document.getElementById("creator-dashboard");if(!box)return;
  try{
    const m=await api("GET","/admin/metrics");
    const kpi=(label,val,color)=>`<div class="kpi"><div class="kl">${label}</div><div class="kv" style="font-size:20px;${color?`color:${color}`:""}">${val}</div></div>`;
    box.innerHTML=`<div class="kgrid" style="margin-bottom:12px">
        ${kpi("MRR",fmtUSD(m.mrr),"var(--green)")}${kpi("ARR",fmtUSD(m.arr))}${kpi(t("cd_paying"),m.paying)}${kpi(t("cd_trials"),m.trials_active)}
        ${kpi(t("cd_conversion"),m.conversion_pct+" %")}${kpi(t("cd_churn"),m.churn_pct_30d+" %",m.churn_pct_30d>5?"var(--red)":"")}${kpi(t("cd_pending_wires"),`${m.pending_wires} · ${fmtUSD(m.pending_wires_amount)}`,"var(--amber)")}${kpi(t("cd_commissions_due"),fmtUSD(m.commissions_due))}
      </div>
      <div class="grid2"><div class="card"><div style="font-weight:700;margin-bottom:6px">${t("cd_revenue_12m")}</div>${barChartSvg(m.revenue_by_month,"amount","month","#00b36b",fmtUSD)}</div>
        <div class="card"><div style="font-weight:700;margin-bottom:6px">${t("cd_signups_30d")}</div>${barChartSvg(m.signups_by_day,"count","day","#3b82f6",v=>v)}</div></div>
      <div class="grid2" style="margin-top:12px"><div class="card"><div style="font-weight:700;margin-bottom:6px">${t("cd_by_plan")}</div>${Object.entries(m.by_plan).map(([k,v])=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span>${planBadge(k)}</span><b>${v}</b></div>`).join("")||"—"}</div>
        <div class="card"><div style="font-weight:700;margin-bottom:6px">${t("cd_countries")}</div>${m.top_countries.map(c=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span>${esc(c.country)}</span><b>${c.count}</b></div>`).join("")}</div></div>`;
  }catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;}
}
function siteBase(){return `${window.location.origin}${window.location.pathname}`;}
async function loadPartners(){
  const box=document.getElementById("partners-box");if(!box)return;
  try{
    const list=await api("GET","/admin/partners");
    box.innerHTML=list.map(p=>`<div class="card" style="margin-bottom:8px;padding:12px">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>${esc(p.name)}</b> <span class="badge bp" style="font-family:var(--mono)">${esc(p.code)}</span> ${p.active?"":`<span class="badge badge-gray">${t("partner_inactive")}</span>`}
        <div style="font-size:11px;color:var(--muted)">${esc(p.phone||"")} ${esc(p.email||"")} · ${t("partner_commission")} ${p.commission_pct} %</div></div>
        <div style="font-size:12px;text-align:right">${p.clients_count} ${t("partner_clients")} · ${p.paying_count} ${t("partner_paying")}<br>${t("partner_due")} <b style="color:var(--amber)">${fmtUSD(p.commission_pending)}</b> · ${t("partner_paid")} ${fmtUSD(p.commission_paid)}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
        <button class="btn btn-o btn-sm" onclick="copyText('${siteBase()}?ref=${p.code}')"><i class="ti ti-link"></i> ${t("partner_signup_link")}</button>
        <button class="btn btn-o btn-sm" onclick="copyText('${siteBase()}?partner=${p.access_token}')"><i class="ti ti-chart-bar"></i> ${t("partner_portal_link")}</button>
        <button class="btn btn-o btn-sm" onclick="togglePartner('${p.id}',${!p.active})">${p.active?t("btn_pause"):t("btn_resume")}</button></div>
      ${p.commissions.filter(c=>c.status==="pending").map(c=>`<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:6px 0;border-top:1px solid var(--b);margin-top:6px"><span>${esc(c.company)} · ${fmtDate(c.created_at)} · ${fmtUSD(c.amount_usd)} → <b>${fmtUSD(c.commission_usd)}</b></span><button class="btn btn-g btn-sm" onclick="payCommission('${c.id}')">${t("btn_mark_paid")}</button></div>`).join("")}
    </div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${t("no_partners")}</div>`;
  }catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;}
}
async function copyText(v){try{await navigator.clipboard.writeText(v);showToast(t("diag_copied"));}catch(_){prompt("",v);}}
async function createPartner(){
  const name=prompt(t("partner_prompt_name"));if(!name)return;
  const phone=prompt(t("partner_prompt_phone"))||null;
  const pct=parseFloat(prompt(t("partner_prompt_pct"),"20")||"20");
  try{await api("POST","/admin/partners",{name,phone,commission_pct:isNaN(pct)?20:pct});showToast(t("toast_partner_created"));loadPartners();loadCreatorDashboard();}catch(e){showToast(e.message,"error");}
}
async function togglePartner(id,active){try{await api("PATCH",`/admin/partners/${id}`,{active});loadPartners();}catch(e){showToast(e.message,"error");}}
async function payCommission(id){if(!confirm(t("partner_confirm_pay")))return;try{await api("POST",`/admin/partners/commissions/${id}/pay`);loadPartners();loadCreatorDashboard();}catch(e){showToast(e.message,"error");}}
async function checkPartnerView(){
  const token=new URLSearchParams(window.location.search).get("partner");
  if(!token)return false;
  document.getElementById("auth-screen").style.display="none";
  const view=document.getElementById("partner-view");view.style.display="block";
  try{
    const r=await fetch(`${API_BASE}/partner/${encodeURIComponent(token)}`);const p=await r.json();
    if(!r.ok)throw new Error(p.detail||"Erreur");
    view.innerHTML=`<div style="text-align:center;margin-bottom:16px"><div style="font-size:26px">⚡</div><div style="font-size:20px;font-weight:800">${t("partner_space")}</div><div style="color:var(--muted)">${esc(p.name)}</div></div>
      <div class="card" style="margin-bottom:12px"><div style="font-size:12px;color:var(--muted)">${t("partner_your_code")}</div><div style="font-family:var(--mono);font-size:26px;font-weight:800;color:var(--green)">${esc(p.code)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">${t("partner_share_link")}</div><div style="font-family:var(--mono);font-size:12px;word-break:break-all">${esc(siteBase())}?ref=${esc(p.code)}</div>
        <button class="btn btn-g btn-sm" style="margin-top:8px" onclick="copyText('${siteBase()}?ref=${p.code}')"><i class="ti ti-copy"></i> ${t("btn_copy")}</button></div>
      <div class="kgrid" style="margin-bottom:12px"><div class="kpi"><div class="kl">${t("partner_clients")}</div><div class="kv">${p.clients_count}</div></div><div class="kpi"><div class="kl">${t("partner_paying")}</div><div class="kv">${p.paying_count}</div></div>
        <div class="kpi"><div class="kl">${t("partner_due")}</div><div class="kv" style="color:var(--amber)">${fmtUSD(p.commission_pending)}</div></div><div class="kpi"><div class="kl">${t("partner_paid")}</div><div class="kv" style="color:var(--green)">${fmtUSD(p.commission_paid)}</div></div></div>
      <div class="card"><div style="font-weight:700;margin-bottom:6px">${t("partner_clients")}</div>${p.clients.map(c=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--b)"><span>${esc(c.company)}</span><span>${planBadge(c.plan)} ${c.paying?"✓":""}</span></div>`).join("")||`<div style="color:var(--muted);font-size:13px">—</div>`}
        <div style="font-size:11px;color:var(--muted);margin-top:8px">${t("partner_rate").replace("{pct}",p.commission_pct)}</div></div>`;
  }catch(e){view.innerHTML=`<div class="card" style="text-align:center;color:var(--red)">${esc(e.message)}</div>`;}
  return true;
}
function prefillReferralFromUrl(){
  const ref=new URLSearchParams(window.location.search).get("ref");
  if(!ref)return;
  const input=document.getElementById("reg-referral");if(input)input.value=ref.toUpperCase();
  try{showAuthTab("register");}catch(_){}
}
