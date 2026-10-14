let _payrollSettings=null,_previewTimer=null;
async function loadPayrollSettings(){try{_payrollSettings=await api("GET","/hr/payroll-settings");}catch(_){_payrollSettings=null;}return _payrollSettings;}
async function openPayslipModal(){
  if(!_employees.length) try{_employees=await api("GET","/hr/employees");}catch(_){}
  if(!_employees.length){showToast(t("no_employees"),"error");return;}
  populateEmpSelect("payslip-emp-id");
  await Promise.all([loadRates(),loadPayrollSettings()]);
  fillCurrencySelect("payslip-currency","USD");
  document.getElementById("payslip-mode").value=_payrollSettings?.default_mode||"simple";
  const d=new Date();document.getElementById("payslip-month").value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  ["payslip-bonuses","payslip-deductions"].forEach(id=>document.getElementById(id).value="");
  onPayslipEmployeeChange();
  document.getElementById("modal-payslip").style.display="flex";
}
function onPayslipEmployeeChange(){
  const e=_employees.find(x=>x.id===document.getElementById("payslip-emp-id").value);
  if(e){document.getElementById("payslip-base").value=e.salary||"";const cur=e.currency||"USD";const sel=document.getElementById("payslip-currency");if([...sel.options].some(o=>o.value===cur&&!o.disabled))sel.value=cur;}
  schedulePayslipPreview();
}
function schedulePayslipPreview(){clearTimeout(_previewTimer);_previewTimer=setTimeout(refreshPayslipPreview,250);}
function payslipBody(){
  return {base_salary:parseFloat(document.getElementById("payslip-base").value||0),bonuses:parseFloat(document.getElementById("payslip-bonuses").value||0),
    deductions:parseFloat(document.getElementById("payslip-deductions").value||0),currency:document.getElementById("payslip-currency").value||"USD",mode:document.getElementById("payslip-mode").value,
    employee_id:document.getElementById("payslip-emp-id").value||null};
}
async function refreshPayslipPreview(){
  const box=document.getElementById("payslip-preview");if(!box)return;
  const b=payslipBody();if(!(b.base_salary>0)){box.innerHTML="";return;}
  try{
    const p=await api("POST","/hr/payslips/preview",b);const cur=p.currency;
    const row=(l,v,c)=>`<div style="display:flex;justify-content:space-between;gap:8px"><span>${l}</span><b style="font-family:var(--mono);${c?`color:${c}`:""}">${v}</b></div>`;
    box.innerHTML=`<div style="font-size:12px;line-height:1.8">${row(t("ps_gross"),fmtMoney(p.gross_salary,cur))}
      ${p.mode==="rdc"?row(`${t("ps_cnss_employee")} (${_payrollSettings?.cnss_employee_pct??5} %)`,"−"+fmtMoney(p.cnss_employee,cur),"var(--red)")
        +row(`${t("ps_ipr")}${cur!=="CDF"?` <span style="color:var(--muted)">(${new Intl.NumberFormat("fr-FR").format(p.ipr_cdf)} FC)</span>`:""}${p.dependents?` <span style="color:var(--muted)">· ${t("ps_dependents_reduction").replace("{n}",p.dependents)}</span>`:""}`,"−"+fmtMoney(p.ipr,cur),"var(--red)"):""}
      ${p.deductions?row(t("ps_other_deductions"),"−"+fmtMoney(p.deductions,cur),"var(--red)"):""}
      <div style="border-top:1px solid var(--b);margin:4px 0"></div>${row(t("ps_net"),fmtMoney(p.net_salary,cur),"var(--green)")}
      ${p.mode==="rdc"?`<div style="color:var(--muted);margin-top:6px">${t("ps_employer_charges")} : CNSS ${fmtMoney(p.cnss_employer,cur)} · INPP ${fmtMoney(p.inpp,cur)} · ONEM ${fmtMoney(p.onem,cur)}</div>`+row(t("ps_employer_cost"),fmtMoney(p.employer_cost,cur)):""}</div>`;
  }catch(e){box.innerHTML=`<div style="font-size:12px;color:var(--red)">${esc(e.message)}</div>`;}
}
async function submitPayslip(){
  const month=document.getElementById("payslip-month").value;
  if(!month){flagMissingFields([document.getElementById("payslip-month")]);return;}
  try{
    const r=await api("POST","/hr/payslips",{employee_id:document.getElementById("payslip-emp-id").value,month,...payslipBody()});
    showToast(r.queued?t("offline_queued"):`${t("toast_payslip_created")} — ${t("ps_net")} ${fmtMoney(r.net_salary,r.currency)}`);closePayslipModal();loadPayroll();
  }catch(e){showToast(e.message,"error");}
}
async function loadPayroll(){
  const tbody=document.getElementById("payroll-tbody");if(!tbody)return;
  if(!_employees.length) try{_employees=await api("GET","/hr/employees");}catch(e){}
  try{
    const slips=await api("GET","/hr/payslips");
    if(!slips?.length){tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">${t("no_payslips")}</td></tr>`;return;}
    tbody.innerHTML=slips.map(s=>{
      const emp=_employees.find(e=>e.id===s.employee_id);const cur=s.currency||"USD";
      const legal=(s.cnss_employee||0)+(s.ipr||0);
      return`<tr>
        <td style="font-weight:600">${esc(emp?.name)||"—"}${s.mode==="rdc"?` <span class="badge bb">RDC</span>`:""}</td>
        <td style="font-family:var(--mono)">${esc(s.month)}</td>
        <td style="font-family:var(--mono)">${fmtMoney(s.base_salary,cur)}</td>
        <td style="font-family:var(--mono);color:var(--green)">${fmtMoney(s.bonuses,cur)}</td>
        <td style="font-family:var(--mono);color:var(--red)">${fmtMoney(legal+(s.deductions||0),cur)}${s.mode==="rdc"?`<div style="font-size:10px;color:var(--muted)">CNSS ${fmtMoney(s.cnss_employee,cur)} · IPR ${fmtMoney(s.ipr,cur)}</div>`:""}</td>
        <td style="font-family:var(--mono);font-weight:700">${fmtMoney(s.net_salary,cur)}${s.employer_cost&&s.mode==="rdc"?`<div style="font-size:10px;font-weight:400;color:var(--muted)">${t("ps_cost_short")} ${fmtMoney(s.employer_cost,cur)}</div>`:""}</td>
        <td>${s.paid?`<span class="badge bg">${t("st_paid")}</span>`:`<span class="badge ba">${t("st_pending")}</span>`}</td>
        <td style="display:flex;gap:5px"><button class="btn btn-sm btn-o" onclick="openPayslipDoc('${s.id}')" title="PDF"><i class="ti ti-file-type-pdf"></i></button>${!s.paid?`<button class="btn btn-sm btn-g" onclick="payPayslip('${s.id}')">${t("btn_pay")}</button>`:`<span style="font-size:11px">${fmtDate(s.paid_at)}</span>`}</td>
      </tr>`;}).join("");
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}
async function openPayslipDoc(id){try{renderDocument(await api("GET",`/hr/payslips/${id}/document`));}catch(e){showToast(e.message,"error");}}
async function openPayrollSettings(){
  const s=await loadPayrollSettings();if(!s)return;
  document.getElementById("pset-mode").value=s.default_mode;
  document.getElementById("pset-cnss-emp").value=s.cnss_employee_pct;document.getElementById("pset-cnss-er").value=s.cnss_employer_pct;
  document.getElementById("pset-onem").value=s.onem_pct;document.getElementById("pset-inpp-mode").value=s.inpp_mode;document.getElementById("pset-inpp").value=s.inpp_pct;
  document.getElementById("pset-cap").value=s.ipr_cap_pct;document.getElementById("pset-min").value=s.ipr_min_cdf;document.getElementById("pset-start").value=s.work_start;
  document.getElementById("pset-brackets").innerHTML=s.ipr_brackets.map(([u,r],i)=>`<div style="display:grid;grid-template-columns:1fr 90px;gap:6px;margin-bottom:6px">
    <input class="inp pset-up" type="number" min="0" value="${u??""}" placeholder="${t("pset_no_ceiling")}" ${u===null?"disabled":""}><input class="inp pset-rate" type="number" min="0" max="100" step="0.01" value="${r}"></div>`).join("");
  document.getElementById("pset-inpp-note").textContent=`${t("pset_inpp_effective")} ${s.inpp_effective_pct} %`;
  document.getElementById("pset-cdf").textContent=s.cdf_rate?`1 USD = ${new Intl.NumberFormat("fr-FR").format(s.cdf_rate)} CDF`:t("pset_cdf_missing");
  document.getElementById("modal-payroll-settings").style.display="flex";
}
function closePayrollSettings(){document.getElementById("modal-payroll-settings").style.display="none";}
async function savePayrollSettings(){
  const ups=[...document.querySelectorAll("#pset-brackets .pset-up")],rates=[...document.querySelectorAll("#pset-brackets .pset-rate")];
  const brackets=ups.map((u,i)=>[u.disabled||u.value===""?null:parseFloat(u.value),parseFloat(rates[i].value||0)]);
  try{
    await api("PUT","/hr/payroll-settings",{default_mode:document.getElementById("pset-mode").value,cnss_employee_pct:parseFloat(document.getElementById("pset-cnss-emp").value),
      cnss_employer_pct:parseFloat(document.getElementById("pset-cnss-er").value),onem_pct:parseFloat(document.getElementById("pset-onem").value),
      inpp_mode:document.getElementById("pset-inpp-mode").value,inpp_pct:parseFloat(document.getElementById("pset-inpp").value),ipr_brackets:brackets,
      ipr_cap_pct:parseFloat(document.getElementById("pset-cap").value),ipr_min_cdf:parseFloat(document.getElementById("pset-min").value),work_start:document.getElementById("pset-start").value});
    closePayrollSettings();showToast(t("toast_payroll_settings_saved"));
  }catch(e){showToast(e.message,"error");}
}
async function resetPayrollSettings(){if(!confirm(t("confirm_reset_payroll")))return;try{await api("POST","/hr/payroll-settings/reset");closePayrollSettings();openPayrollSettings();showToast(t("toast_payroll_settings_reset"));}catch(e){showToast(e.message,"error");}}
function localDayTime(){const d=new Date();return {day:localDateInput(0),time:`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`};}
async function loadAttendance(){
  const box=document.getElementById("attendance-tbody");if(!box)return;
  if(!checkFeature(State.tenant?.limits||{},"hr")){box.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--amber);padding:24px">${t("upgrade_hr_locked")}</td></tr>`;return;}
  const dayInput=document.getElementById("att-day");if(!dayInput.value)dayInput.value=localDateInput(0);
  const monthInput=document.getElementById("att-month");if(!monthInput.value)monthInput.value=dayInput.value.slice(0,7);
  const isToday=dayInput.value===localDateInput(0);
  try{
    const r=await api("GET",`/hr/attendance?day=${dayInput.value}`);
    document.getElementById("att-head").textContent=`${r.present}/${r.employees.length} ${t("att_present")} · ${t("att_start")} ${r.work_start}`;
    box.innerHTML=r.employees.map(e=>`<tr><td style="font-weight:600">${esc(e.name)}<div style="font-size:11px;color:var(--muted)">${esc(e.position||"")}</div></td>
      <td style="font-family:var(--mono)">${e.local_in||"—"} ${e.late?`<span class="badge br">${t("att_late")}</span>`:""}</td><td style="font-family:var(--mono)">${e.local_out||"—"}</td>
      <td style="font-family:var(--mono)">${e.hours!=null?e.hours+" h":"—"}</td>
      <td>${e.local_in?(e.local_out?`<span class="badge bg">${t("att_done")}</span>`:`<span class="badge bb">${t("att_here")}</span>`):`<span class="badge badge-gray">${t("att_absent")}</span>`}</td>
      <td>${isToday&&!e.local_in?`<button class="btn btn-sm btn-g" onclick="markAttendance('${e.employee_id}','in')"><i class="ti ti-login"></i> ${t("att_btn_in")}</button>`:""}${isToday&&e.local_in&&!e.local_out?`<button class="btn btn-sm btn-o" onclick="markAttendance('${e.employee_id}','out')"><i class="ti ti-logout"></i> ${t("att_btn_out")}</button>`:""}</td></tr>`).join("")
      ||`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("no_employees")}</td></tr>`;
    const s=await api("GET",`/hr/attendance/summary?month=${monthInput.value}`);
    document.getElementById("att-summary").innerHTML=s.employees.map(e=>`<tr><td>${esc(e.name)}</td><td>${e.days_present}</td><td style="font-family:var(--mono)">${e.hours} h</td><td style="color:${e.late_days?"var(--red)":"inherit"}">${e.late_days}</td><td>${e.incomplete_days}</td></tr>`).join("");
  }catch(e){box.innerHTML=`<tr><td colspan="6" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
}
async function markAttendance(empId,action){
  const {day,time}=localDayTime();
  try{const r=await api("POST","/hr/attendance",{employee_id:empId,action,local_day:day,local_time:time});showToast(`${r.name||""} — ${action==="in"?t("att_btn_in"):t("att_btn_out")} ${time}`);loadAttendance();}
  catch(e){showToast(e.message,"error");}
}
let _claims={claims:[],can_decide:false};
async function loadClaims(){
  const box=document.getElementById("claims-tbody");if(!box)return;
  try{
    _claims=await api("GET","/expense-claims");
    document.getElementById("claims-locked").style.display="none";document.getElementById("claims-main").style.display="";
    const tt=_claims.totals;
    document.getElementById("claims-totals").innerHTML=`<span>${t("claim_st_submitted")} <b>${fmtUSD(tt.submitted)}</b></span><span>${t("claim_st_approved")} <b>${fmtUSD(tt.approved)}</b></span><span>${t("claim_st_reimbursed")} <b style="color:var(--green)">${fmtUSD(tt.reimbursed)}</b></span>`;
    const badge={submitted:"ba",approved:"bb",rejected:"br",reimbursed:"bg"};
    box.innerHTML=_claims.claims.map(c=>`<tr><td>${fmtDate(c.date)}</td><td style="font-weight:600">${esc(c.submitter_name)}</td><td>${esc(c.category)}<div style="font-size:11px;color:var(--muted)">${esc(c.description||"")}</div></td>
      <td style="font-family:var(--mono);font-weight:700">${fmtUSD(c.amount)}</td>
      <td><span class="badge ${badge[c.status]||"badge-gray"}">${t("claim_st_"+c.status)}</span>${c.reject_reason?`<div style="font-size:11px;color:var(--red)">${esc(c.reject_reason)}</div>`:""}</td>
      <td style="display:flex;gap:5px;flex-wrap:wrap">${c.receipt_url?`<a class="btn btn-sm btn-o" href="${esc(c.receipt_url)}" target="_blank" rel="noopener" title="${t("claim_receipt")}"><i class="ti ti-paperclip"></i></a>`:""}
        ${_claims.can_decide&&c.status==="submitted"?`<button class="btn btn-sm btn-g" onclick="decideClaim('${c.id}','approve')">${t("btn_approve")}</button><button class="btn btn-sm btn-r" onclick="decideClaim('${c.id}','reject')">${t("btn_reject")}</button>`:""}
        ${_claims.can_decide&&c.status==="approved"?`<button class="btn btn-sm btn-g" onclick="decideClaim('${c.id}','reimburse')"><i class="ti ti-cash"></i> ${t("btn_reimburse")}</button>`:""}
        ${c.status!=="reimbursed"?`<button class="btn btn-sm btn-o" onclick="deleteClaim('${c.id}')"><i class="ti ti-trash"></i></button>`:""}</td></tr>`).join("")
      ||`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("no_claims")}</td></tr>`;
  }catch(e){
    if(/Professional/.test(e.message)){document.getElementById("claims-locked").style.display="block";document.getElementById("claims-main").style.display="none";return;}
    box.innerHTML=`<tr><td colspan="6" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;
  }
}
function openClaimModal(){["claim-amount","claim-desc"].forEach(id=>document.getElementById(id).value="");document.getElementById("claim-category").value="Transport";document.getElementById("claim-date").value=localDateInput(0);document.getElementById("claim-file").value="";document.getElementById("modal-claim").style.display="flex";}
function closeClaimModal(){document.getElementById("modal-claim").style.display="none";}
async function submitClaim(){
  const amount=parseFloat(document.getElementById("claim-amount").value);
  if(!(amount>0)){flagMissingFields([document.getElementById("claim-amount")]);return;}
  try{
    const c=await api("POST","/expense-claims",{amount,category:document.getElementById("claim-category").value,description:document.getElementById("claim-desc").value||null,date:dateInputToIso(document.getElementById("claim-date").value)});
    const f=document.getElementById("claim-file").files[0];
    if(f&&c.id){const file=f.type.startsWith("image/")?await compressImageFile(f,1600,0.85):f;const fd=new FormData();fd.append("file",file);await apiUpload(`/expense-claims/${c.id}/receipt`,fd);}
    closeClaimModal();showToast(c.queued?t("offline_queued"):t("toast_claim_submitted"));loadClaims();
  }catch(e){showToast(e.message,"error");}
}
async function decideClaim(id,action){
  let body=null;
  if(action==="reject"){const reason=prompt(t("prompt_reject_reason"));if(reason===null)return;body={reason};}
  if(action==="reimburse"&&!confirm(t("confirm_reimburse")))return;
  try{await api("POST",`/expense-claims/${id}/${action}`,body);showToast(t("toast_claim_"+action));loadClaims();}catch(e){showToast(e.message,"error");}
}
async function deleteClaim(id){if(!confirm(t("confirm_delete_claim")))return;try{await api("DELETE",`/expense-claims/${id}`);loadClaims();}catch(e){showToast(e.message,"error");}}
function staffLinkFor(token){return `${window.location.origin}${window.location.pathname}?staff=${token}`;}
async function openStaffLink(empId){
  try{
    const r=await api("POST",`/hr/employees/${empId}/portal-link`);const link=staffLinkFor(r.portal_token);
    document.getElementById("staff-link-name").textContent=r.name;document.getElementById("staff-link-input").value=link;
    const phone=(r.phone||"").replace(/[^0-9]/g,"");
    document.getElementById("staff-link-wa").href=`https://wa.me/${phone}?text=${encodeURIComponent(t("staff_wa_message").replace("{name}",r.name).replace("{link}",link))}`;
    document.getElementById("staff-link-empid").value=empId;
    document.getElementById("modal-staff-link").style.display="flex";
  }catch(e){showToast(e.message,"error");}
}
function closeStaffLink(){document.getElementById("modal-staff-link").style.display="none";}
async function copyStaffLink(){try{await navigator.clipboard.writeText(document.getElementById("staff-link-input").value);showToast(t("toast_link_copied"));}catch(_){document.getElementById("staff-link-input").select();}}
async function resetStaffLink(){if(!confirm(t("confirm_reset_staff_link")))return;try{await api("POST",`/hr/employees/${document.getElementById("staff-link-empid").value}/portal-link/reset`);openStaffLink(document.getElementById("staff-link-empid").value);showToast(t("toast_link_reset"));}catch(e){showToast(e.message,"error");}}
let _staffToken=null,_staff=null;
async function staffApi(method,path,body,isForm){
  const r=await fetch(`${API_BASE}/staff/${_staffToken}${path}`,{method,headers:isForm?{}:{"Content-Type":"application/json"},body:isForm?body:(body?JSON.stringify(body):null)});
  let d=null;try{d=await r.json();}catch(_){}
  if(!r.ok)throw new Error((d&&typeof d.detail==="string"&&d.detail)||`${t("server_error")} (${r.status})`);
  return d;
}
async function checkStaffView(){
  const token=new URLSearchParams(window.location.search).get("staff");
  if(!token)return false;
  _staffToken=token;
  document.getElementById("auth-screen").style.display="none";
  document.getElementById("staff-view").style.display="block";
  await loadStaffHome();
  return true;
}
async function loadStaffHome(){
  const box=document.getElementById("staff-content");
  try{
    _staff=await staffApi("GET",`?day=${localDateInput(0)}`);
    const s=_staff,co=s.company;
    document.getElementById("staff-company").innerHTML=`${co.logo_url?`<img src="${esc(co.logo_url)}" alt="" style="max-height:44px;max-width:120px;object-fit:contain;display:block;margin:0 auto 6px;background:#fff;border-radius:6px;padding:3px">`:""}${esc(co.name)}`;
    const td=s.today;
    box.innerHTML=`<h3 style="margin-bottom:4px">${t("staff_hello")} ${esc(s.employee.name)}</h3><div style="color:var(--muted);font-size:13px;margin-bottom:16px">${esc(s.employee.position||"")}</div>
      <div class="card" style="margin-bottom:14px"><div style="font-weight:700;margin-bottom:8px"><i class="ti ti-clock"></i> ${t("staff_attendance_today")}</div>
        <div style="font-size:13px;margin-bottom:10px">${t("att_start")} ${s.work_start} · ${t("att_btn_in")} <b>${td?.local_in||"—"}</b> · ${t("att_btn_out")} <b>${td?.local_out||"—"}</b></div>
        ${!td?.local_in?`<button class="btn btn-g" style="width:100%" onclick="staffClock('in')"><i class="ti ti-login"></i> ${t("staff_clock_in")}</button>`:!td.local_out?`<button class="btn btn-o" style="width:100%" onclick="staffClock('out')"><i class="ti ti-logout"></i> ${t("staff_clock_out")}</button>`:`<span class="badge bg">${t("att_done")}</span>`}</div>
      <div class="card" style="margin-bottom:14px"><div style="font-weight:700;margin-bottom:8px"><i class="ti ti-beach"></i> ${t("staff_leaves")} — ${t("staff_balance")} <b style="color:var(--green)">${s.employee.leave_balance} ${t("days_short")}</b></div>
        <div class="grid2"><div class="fgrp"><label class="fl">${t("fld_start_date_short")}</label><input class="inp" type="date" id="staff-leave-start"></div><div class="fgrp"><label class="fl">${t("fld_end_date_short")}</label><input class="inp" type="date" id="staff-leave-end"></div></div>
        <div class="fgrp"><input class="inp" id="staff-leave-reason" placeholder="${t("fld_reason")}"></div>
        <button class="btn btn-o btn-sm" onclick="staffLeave()"><i class="ti ti-send"></i> ${t("staff_request_leave")}</button>
        ${s.leaves.map(l=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--b);font-size:12px;margin-top:6px"><span>${fmtDate(l.start_date)} → ${fmtDate(l.end_date)} (${l.days} ${t("days_short")})</span>${statusBadge(l.status)}</div>`).join("")}</div>
      <div class="card" style="margin-bottom:14px"><div style="font-weight:700;margin-bottom:8px"><i class="ti ti-receipt"></i> ${t("staff_payslips")}</div>
        ${s.payslips.map(p=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--b);font-size:13px"><span style="font-family:var(--mono)">${esc(p.month)}</span><b>${fmtMoney(p.net_salary,p.currency)}</b><button class="btn btn-sm btn-o" onclick="staffPayslip('${p.id}')"><i class="ti ti-file-type-pdf"></i></button></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${t("no_payslips")}</div>`}</div>
      ${s.claims_enabled?`<div class="card"><div style="font-weight:700;margin-bottom:8px"><i class="ti ti-receipt-2"></i> ${t("nav_claims")}</div>
        <div class="grid2"><div class="fgrp"><input class="inp" type="number" id="staff-claim-amount" min="0.01" step="0.01" placeholder="${t("fld_amount_req")}"></div><div class="fgrp"><input class="inp" id="staff-claim-cat" value="Transport"></div></div>
        <div class="fgrp"><input class="inp" type="file" accept="image/*,application/pdf" id="staff-claim-file"></div>
        <button class="btn btn-o btn-sm" onclick="staffClaim()"><i class="ti ti-send"></i> ${t("staff_submit_claim")}</button>
        ${s.claims.map(c=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--b);font-size:12px;margin-top:6px"><span>${fmtDate(c.date)} · ${esc(c.category)} · ${fmtUSD(c.amount)}</span><span class="badge">${t("claim_st_"+c.status)}</span></div>`).join("")}</div>`:""}`;
  }catch(e){box.innerHTML=`<div class="card" style="text-align:center;color:var(--red);padding:30px">${esc(e.message)}</div>`;}
}
async function staffClock(action){const {day,time}=localDayTime();try{await staffApi("POST","/attendance",{action,local_day:day,local_time:time});showToast(`${action==="in"?t("att_btn_in"):t("att_btn_out")} ${time} ✓`);loadStaffHome();}catch(e){showToast(e.message,"error");}}
async function staffLeave(){
  const s=document.getElementById("staff-leave-start").value,e=document.getElementById("staff-leave-end").value;
  if(!s||!e){flagMissingFields([!s&&document.getElementById("staff-leave-start"),!e&&document.getElementById("staff-leave-end")].filter(Boolean));return;}
  try{const r=await staffApi("POST","/leaves",{start_date:s,end_date:e,reason:document.getElementById("staff-leave-reason").value||null});showToast(`${t("staff_leave_sent")} (${r.days} ${t("days_short")})`);loadStaffHome();}catch(err){showToast(err.message,"error");}
}
async function staffClaim(){
  const amount=parseFloat(document.getElementById("staff-claim-amount").value);
  if(!(amount>0)){flagMissingFields([document.getElementById("staff-claim-amount")]);return;}
  try{
    const c=await staffApi("POST","/claims",{amount,category:document.getElementById("staff-claim-cat").value||"Autre"});
    const f=document.getElementById("staff-claim-file").files[0];
    if(f){const file=f.type.startsWith("image/")?await compressImageFile(f,1600,0.85):f;const fd=new FormData();fd.append("file",file);await staffApi("POST",`/claims/${c.id}/receipt`,fd,true);}
    showToast(t("toast_claim_submitted"));loadStaffHome();
  }catch(e){showToast(e.message,"error");}
}
async function staffPayslip(id){try{renderDocument(await staffApi("GET",`/payslips/${id}`));}catch(e){showToast(e.message,"error");}}
function renderPayslipDoc(doc){
  const co=doc.company||{},emp=doc.employee||{},cur=doc.currency||"USD";
  const color=/^#[0-9a-fA-F]{6}$/.test(co.brand_color||"")?co.brand_color:"#00b36b";
  const rdc=doc.mode==="rdc";
  const line=(l,v,cls)=>`<tr><td>${l}</td><td class="r"${cls?` style="color:${cls}"`:""}>${v}</td></tr>`;
  const [y,m]=(doc.month||"").split("-");
  const period=y?new Date(+y,+m-1,1).toLocaleDateString(State.lang==="ar"?"ar":State.lang,{month:"long",year:"numeric"}):doc.month;
  document.getElementById("doc-page").innerHTML=`
    <div style="border-bottom:4px solid ${color};padding-bottom:14px;margin-bottom:18px;display:flex;justify-content:space-between;gap:16px">
      <div style="display:flex;gap:12px;align-items:center">${co.logo_url?`<img src="${docEsc(co.logo_url)}" alt="" style="max-height:60px;max-width:140px;object-fit:contain">`:""}
        <div><div style="font-size:19px;font-weight:800">${docEsc(co.name)}</div><div style="font-size:11px;color:#555">${[co.address,co.tax_number?`${t("doc_tax_number")} ${co.tax_number}`:""].filter(Boolean).map(docEsc).join("<br>")}</div></div></div>
      <div style="text-align:right"><div style="font-size:20px;font-weight:800;color:${color}">${t("doc_payslip_title")}</div><div style="font-size:13px;text-transform:capitalize">${docEsc(period)}</div></div>
    </div>
    <div style="font-size:12px;margin-bottom:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><div style="font-size:10px;text-transform:uppercase;color:#666">${t("th_employee")}</div><b style="font-size:14px">${docEsc(emp.name||doc.employee_name)}</b><br>${[emp.position,emp.department,emp.contract_type].filter(Boolean).map(docEsc).join(" · ")}</div>
      <div style="text-align:right">${emp.hire_date?`${t("ps_hire_date")} ${fmtDate(emp.hire_date)}<br>`:""}${t("doc_currency")} ${cur}</div>
    </div>
    <table class="doc-table"><thead><tr style="background:${color}18"><th>${t("ps_item")}</th><th class="r">${t("th_amount")}</th></tr></thead><tbody>
      ${line(t("fld_base_salary"),fmtMoney(doc.base_salary,cur))}${doc.bonuses?line(t("fld_bonuses"),fmtMoney(doc.bonuses,cur)):""}
      <tr style="font-weight:800"><td>${t("ps_gross")}</td><td class="r">${fmtMoney(doc.gross_salary??(doc.base_salary+doc.bonuses),cur)}</td></tr>
      ${rdc?line(`${t("ps_cnss_employee")}`,"−"+fmtMoney(doc.cnss_employee,cur),"#c62828")+line(`${t("ps_taxable")}`,fmtMoney(doc.taxable_base,cur))+line(`${t("ps_ipr")}`,"−"+fmtMoney(doc.ipr,cur),"#c62828"):""}
      ${doc.deductions?line(t("ps_other_deductions"),"−"+fmtMoney(doc.deductions,cur),"#c62828"):""}
      <tr style="font-weight:800;font-size:15px;border-top:2px solid ${color}"><td>${t("ps_net")}</td><td class="r">${fmtMoney(doc.net_salary,cur)}</td></tr>
    </tbody></table>
    ${rdc?`<div style="font-size:11px;color:#555;margin-top:12px"><b>${t("ps_employer_charges")}</b> : CNSS ${fmtMoney(doc.cnss_employer,cur)} · INPP ${fmtMoney(doc.inpp,cur)} · ONEM ${fmtMoney(doc.onem,cur)} — ${t("ps_employer_cost")} ${fmtMoney(doc.employer_cost,cur)}</div>`:""}
    <div style="font-size:11px;margin-top:10px">${doc.paid?`${t("ps_paid_on")} ${fmtDate(doc.paid_at)}`:t("st_pending")}</div>
    <div style="display:flex;gap:24px;margin-top:36px;flex-wrap:wrap"><div style="flex:1;min-width:200px;border-top:1px solid #999;padding-top:6px;font-size:11px;color:#555">${t("doc_signature_company")}</div><div style="flex:1;min-width:200px;border-top:1px solid #999;padding-top:6px;font-size:11px;color:#555">${t("ps_signature_employee")}</div></div>`;
  document.getElementById("doc-wa-btn").style.display="none";
}
async function editDependents(id,current){
  const v=prompt(t("prompt_dependents"),current??0);if(v===null)return;
  const n=parseInt(v);if(isNaN(n)||n<0||n>20){showToast(t("invalid_number"),"error");return;}
  try{await api("PATCH",`/hr/employees/${id}`,{dependents:n});showToast(t("toast_updated"));loadEmployees();}catch(e){showToast(e.message,"error");}
}
