let _ledger={tab:"journal",year:new Date().getFullYear(),accounts:[],fy:null};
function ledgerAllowed(){const p=State.tenant?.plan;return !!State.tenant?.is_creator||["trial","business","business_plus","enterprise"].includes(p);}
function vatAllowed(){const p=State.tenant?.plan;return !!State.tenant?.is_creator||["trial","professional","business","business_plus","enterprise"].includes(p);}
async function loadLedgerPage(){
  const sel=document.getElementById("ledger-year");
  if(sel&&!sel.options.length){const y=new Date().getFullYear();sel.innerHTML=[y,y-1,y-2,y-3].map(v=>`<option value="${v}">${v}</option>`).join("");}
  if(!ledgerAllowed()&&_ledger.tab!=="vat")_ledger.tab="vat";
  showLedgerTab(_ledger.tab);
}
function ledgerLocked(box,msg){box.innerHTML=`<div style="text-align:center;padding:28px;color:var(--muted)"><i class="ti ti-lock" style="font-size:28px"></i><div style="margin:8px 0 12px">${msg}</div><button class="btn btn-g btn-sm" onclick="navigate('billing')">${t("btn_see_plans")}</button></div>`;}
async function showLedgerTab(tab){
  _ledger.tab=tab;_ledger.year=parseInt(document.getElementById("ledger-year")?.value||new Date().getFullYear());
  document.querySelectorAll("[data-ledgertab]").forEach(b=>b.classList.toggle("active",b.dataset.ledgertab===tab));
  const box=document.getElementById("ledger-body");if(!box)return;
  if(tab!=="vat"&&!ledgerAllowed()){ledgerLocked(box,t("ledger_locked"));return;}
  if(tab==="vat"&&!vatAllowed()){ledgerLocked(box,t("vat_locked"));return;}
  const seq=_ledger.seq=(_ledger.seq||0)+1;
  const tmp=document.createElement("div");
  if(!box.innerHTML.trim()) box.innerHTML=`<div style="color:var(--muted);padding:16px">${t("loading")}</div>`;
  try{
    if(tab==="journal")await renderLedgerJournal(tmp);
    else if(tab==="general")await renderGeneralLedger(tmp);
    else if(tab==="trial")await renderTrialBalance(tmp);
    else if(tab==="income")await renderIncomeStatement(tmp);
    else if(tab==="balance")await renderBalanceSheet(tmp);
    else if(tab==="vat")await renderVat(tmp);
    else if(tab==="accounts")await renderAccounts(tmp);
    else if(tab==="closing")await renderClosing(tmp);
  }catch(e){tmp.innerHTML=`<div style="color:var(--red);padding:16px">${esc(e.message)}</div>`;}
  if(seq===_ledger.seq) box.replaceChildren(...tmp.childNodes);
}
const m2=v=>fmtUSD(v||0);
async function renderLedgerJournal(box){
  const j=document.getElementById("ledger-journal-filter")?.value||"";
  const r=await api("GET",`/ledger/journal?year=${_ledger.year}${j?`&journal=${j}`:""}`);
  const opts=Object.entries(r.journals).map(([k,v])=>`<option value="${k}" ${k===j?"selected":""}>${k} — ${esc(v)}</option>`).join("");
  box.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap"><select class="inp" id="ledger-journal-filter" style="width:auto" onchange="showLedgerTab('journal')"><option value="">${t("ledger_all_journals")}</option>${opts}</select></div>
    ${r.entries.map(e=>`<div class="card" style="margin-bottom:8px;padding:12px">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px"><div><b style="font-family:var(--mono);color:var(--blue)">${e.number}</b> · ${fmtDate(e.date)} · <span class="badge badge-gray">${e.journal}</span> ${e.locked?"🔒":""}</div>
        <div style="display:flex;gap:6px;align-items:center"><b style="font-family:var(--mono)">${m2(e.total)}</b>${e.manual&&!e.locked?`<button class="btn btn-sm btn-r" onclick="deleteLedgerEntry('${e.id}')"><i class="ti ti-trash"></i></button>`:""}</div></div>
      <div style="font-size:13px;margin-bottom:6px">${esc(e.label)}</div>
      <div class="table-wrap"><table style="font-size:12px"><tbody>${e.lines.map(l=>`<tr><td style="font-family:var(--mono);width:70px">${l.account}</td><td>${esc(l.account_name)}</td><td style="font-family:var(--mono);text-align:right">${l.debit?m2(l.debit):""}</td><td style="font-family:var(--mono);text-align:right">${l.credit?m2(l.credit):""}</td></tr>`).join("")}</tbody></table></div>
    </div>`).join("")||`<div style="color:var(--muted);padding:16px">${t("ledger_no_entries")}</div>`}`;
}
async function ensureLedgerAccounts(){_ledger.accounts=await api("GET","/ledger/accounts");return _ledger.accounts;}
async function renderGeneralLedger(box){
  const accs=await ensureLedgerAccounts();
  const used=accs.filter(a=>a.debit||a.credit);
  const current=document.getElementById("ledger-account")?.value||(used[0]?.code)||"411";
  const r=await api("GET",`/ledger/general?account=${encodeURIComponent(current)}&year=${_ledger.year}`);
  box.innerHTML=`<select class="inp" id="ledger-account" style="width:auto;max-width:100%;margin-bottom:10px" onchange="showLedgerTab('general')">${accs.map(a=>`<option value="${esc(a.code)}" ${a.code===current?"selected":""}>${esc(a.code)} — ${esc(a.name)}${a.debit||a.credit?"":" ·"}</option>`).join("")}</select>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>${t("th_date")}</th><th>${t("th_number")}</th><th>${t("ledger_label")}</th><th style="text-align:right">${t("ledger_debit")}</th><th style="text-align:right">${t("ledger_credit")}</th><th style="text-align:right">${t("ledger_balance")}</th></tr></thead><tbody>
    <tr style="color:var(--muted)"><td colspan="5">${t("ledger_opening")}</td><td style="text-align:right;font-family:var(--mono)">${m2(r.opening)}</td></tr>
    ${r.lines.map(l=>`<tr><td>${fmtDate(l.date)}</td><td style="font-family:var(--mono);font-size:11px">${l.number}</td><td>${esc(l.label)}</td><td style="text-align:right;font-family:var(--mono)">${l.debit?m2(l.debit):""}</td><td style="text-align:right;font-family:var(--mono)">${l.credit?m2(l.credit):""}</td><td style="text-align:right;font-family:var(--mono);font-weight:700">${m2(l.balance)}</td></tr>`).join("")}
    <tr style="font-weight:700"><td colspan="3">${t("ledger_totals")}</td><td style="text-align:right;font-family:var(--mono)">${m2(r.total_debit)}</td><td style="text-align:right;font-family:var(--mono)">${m2(r.total_credit)}</td><td style="text-align:right;font-family:var(--mono)">${m2(r.closing)}</td></tr>
    </tbody></table></div></div>`;
}
async function renderTrialBalance(box){
  const r=await api("GET",`/ledger/trial-balance?year=${_ledger.year}`);
  box.innerHTML=`<div style="margin-bottom:8px">${r.balanced?`<span class="badge bg">✓ ${t("ledger_balanced")}</span>`:`<span class="badge br">${t("ledger_unbalanced")}</span>`}</div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>${t("ledger_account")}</th><th>${t("th_name")}</th><th style="text-align:right">${t("ledger_opening_short")}</th><th style="text-align:right">${t("ledger_debit")}</th><th style="text-align:right">${t("ledger_credit")}</th><th style="text-align:right">${t("ledger_balance")}</th></tr></thead><tbody>
    ${r.rows.map(x=>`<tr><td style="font-family:var(--mono)">${x.account}</td><td>${esc(x.name)}</td><td style="text-align:right;font-family:var(--mono)">${x.opening?m2(x.opening):""}</td><td style="text-align:right;font-family:var(--mono)">${m2(x.debit)}</td><td style="text-align:right;font-family:var(--mono)">${m2(x.credit)}</td><td style="text-align:right;font-family:var(--mono);font-weight:700;color:${x.balance<0?"var(--amber)":"var(--text)"}">${m2(x.balance)}</td></tr>`).join("")}
    <tr style="font-weight:800"><td colspan="3">${t("ledger_totals")}</td><td style="text-align:right;font-family:var(--mono)">${m2(r.total_debit)}</td><td style="text-align:right;font-family:var(--mono)">${m2(r.total_credit)}</td><td></td></tr></tbody></table></div></div>`;
}
function statementTable(rows,total,label){
  return `<table><tbody>${rows.map(x=>`<tr><td style="font-family:var(--mono);width:60px">${x.account}</td><td>${esc(x.name)}</td><td style="text-align:right;font-family:var(--mono)">${m2(x.amount)}</td></tr>`).join("")||`<tr><td colspan="3" style="color:var(--muted)">—</td></tr>`}
    <tr style="font-weight:800;border-top:2px solid var(--b)"><td colspan="2">${label}</td><td style="text-align:right;font-family:var(--mono)">${m2(total)}</td></tr></tbody></table>`;
}
async function renderIncomeStatement(box){
  const r=await api("GET",`/ledger/income-statement?year=${_ledger.year}`);
  box.innerHTML=`<div class="grid2"><div class="card"><div style="font-weight:700;margin-bottom:8px">${t("ledger_products")} (${t("ledger_class")} 7)</div><div class="table-wrap">${statementTable(r.products,r.total_products,t("ledger_total_products"))}</div></div>
    <div class="card"><div style="font-weight:700;margin-bottom:8px">${t("ledger_charges")} (${t("ledger_class")} 6)</div><div class="table-wrap">${statementTable(r.charges,r.total_charges,t("ledger_total_charges"))}</div></div></div>
    <div class="card" style="margin-top:12px;text-align:center"><div style="color:var(--muted);font-size:12px">${t("ledger_net_result")} ${r.year}</div><div style="font-size:28px;font-weight:800;font-family:var(--mono);color:${r.result<0?"var(--red)":"var(--green)"}">${m2(r.result)}</div><div style="font-size:12px;color:var(--muted)">${r.result>=0?t("ledger_profit"):t("ledger_loss")}</div></div>`;
}
async function renderBalanceSheet(box){
  const r=await api("GET",`/ledger/balance-sheet?year=${_ledger.year}`);
  box.innerHTML=`<div style="margin-bottom:8px">${r.balanced?`<span class="badge bg">✓ ${t("ledger_bs_balanced")}</span>`:`<span class="badge br">${t("ledger_unbalanced")}</span>`} ${r.closed?`<span class="badge bb">🔒 ${t("ledger_closed_year")}</span>`:""}</div>
    <div class="grid2"><div class="card"><div style="font-weight:700;margin-bottom:8px">${t("ledger_assets")}</div><div class="table-wrap">${statementTable(r.assets,r.total_assets,t("ledger_total_assets"))}</div></div>
    <div class="card"><div style="font-weight:700;margin-bottom:8px">${t("ledger_liabilities")}</div><div class="table-wrap">${statementTable(r.liabilities,r.total_liabilities,t("ledger_total_liabilities"))}</div></div></div>`;
}
function monthOptions(){
  const out=[];const d=new Date();d.setDate(1);
  for(let i=0;i<24;i++){const v=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;out.push(v);d.setMonth(d.getMonth()-1);}
  return out;
}
async function renderVat(box){
  const months=monthOptions();
  const period=document.getElementById("vat-period")?.value||months[1];
  const s=await api("GET",`/vat/summary?period=${period}`);
  const list=await api("GET","/vat/returns");
  const now=new Date();const [py,pm]=period.split("-").map(Number);const finished=new Date(py,pm,1)<=now;
  const ret=s.return;
  box.innerHTML=`<select class="inp" id="vat-period" style="width:auto;margin-bottom:10px" onchange="showLedgerTab('vat')">${months.map(m=>`<option value="${m}" ${m===period?"selected":""}>${m}</option>`).join("")}</select>
    <div class="kgrid" style="margin-bottom:12px">
      <div class="kpi"><div class="kl">${t("vat_sales_ht")}</div><div class="kv" style="font-size:18px">${m2(s.sales_ht)}</div></div>
      <div class="kpi"><div class="kl">${t("vat_collected")}</div><div class="kv" style="font-size:18px">${m2(s.collected)}</div></div>
      <div class="kpi"><div class="kl">${t("vat_deductible")}</div><div class="kv" style="font-size:18px">${m2(s.deductible)}</div></div>
      <div class="kpi"><div class="kl">${s.net_due>=0?t("vat_to_pay"):t("vat_credit")}</div><div class="kv" style="font-size:18px;color:${s.net_due>0?"var(--amber)":"var(--green)"}">${m2(Math.abs(s.net_due))}</div></div>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px">${t("vat_hint")}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      ${ret?`<span class="badge ${ret.status==="paid"?"bg":"ba"}">${ret.status==="paid"?t("vat_paid"):t("vat_declared")}</span>`:""}
      ${(!ret||ret.status!=="paid")?`<button class="btn btn-g btn-sm" ${finished?"":"disabled"} onclick="declareVat('${period}')"><i class="ti ti-file-check"></i> ${ret?t("vat_redeclare"):t("vat_declare")}</button>`:""}
      ${ret&&ret.status==="declared"?`<button class="btn btn-o btn-sm" onclick="payVat('${ret.id}')"><i class="ti ti-cash"></i> ${t("vat_mark_paid")}</button>`:""}
      ${!finished?`<span style="font-size:12px;color:var(--muted)">${t("vat_not_finished")}</span>`:""}
    </div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>${t("vat_period")}</th><th style="text-align:right">${t("vat_collected")}</th><th style="text-align:right">${t("vat_deductible")}</th><th style="text-align:right">${t("vat_net")}</th><th>${t("th_status")}</th></tr></thead><tbody>
    ${list.map(v=>`<tr><td style="font-family:var(--mono)">${v.period}</td><td style="text-align:right;font-family:var(--mono)">${m2(v.collected)}</td><td style="text-align:right;font-family:var(--mono)">${m2(v.deductible)}</td><td style="text-align:right;font-family:var(--mono);font-weight:700">${m2(v.net_due)}</td><td>${v.status==="paid"?`<span class="badge bg">${t("vat_paid")}</span>`:`<span class="badge ba">${t("vat_declared")}</span>`}</td></tr>`).join("")||`<tr><td colspan="5" style="color:var(--muted)">—</td></tr>`}
    </tbody></table></div></div>`;
}
async function declareVat(period){try{const r=await api("POST","/vat/returns",{period});showToast(`${t("vat_declared")} — ${m2(r.net_due)}`);showLedgerTab("vat");}catch(e){showToast(e.message,"error");}}
async function payVat(id){if(!confirm(t("vat_confirm_pay")))return;try{await api("POST",`/vat/returns/${id}/pay`);showToast(t("vat_paid"));showLedgerTab("vat");}catch(e){showToast(e.message,"error");}}
async function renderAccounts(box){
  const accs=await ensureLedgerAccounts();
  const classes={1:t("ledger_c1"),2:t("ledger_c2"),3:t("ledger_c3"),4:t("ledger_c4"),5:t("ledger_c5"),6:t("ledger_c6"),7:t("ledger_c7"),8:t("ledger_c8")};
  box.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button class="btn btn-g btn-sm" onclick="createLedgerAccount()"><i class="ti ti-plus"></i> ${t("ledger_new_account")}</button></div>`+
    Object.entries(classes).map(([k,v])=>{const list=accs.filter(a=>a.class==k);if(!list.length)return "";
      return `<div class="card" style="margin-bottom:10px"><div style="font-weight:700;margin-bottom:6px">${t("ledger_class")} ${k} — ${v}</div><div class="table-wrap"><table style="font-size:13px"><tbody>${list.map(a=>`<tr><td style="font-family:var(--mono);width:70px">${esc(a.code)}</td><td>${esc(a.name)} ${a.custom?`<span class="badge badge-gray">${t("ledger_custom")}</span>`:""}</td><td style="text-align:right;font-family:var(--mono)">${a.debit||a.credit?m2(a.balance):""}</td></tr>`).join("")}</tbody></table></div></div>`;}).join("");
}
async function createLedgerAccount(){
  const code=prompt(t("ledger_prompt_code"));if(!code)return;
  const name=prompt(t("ledger_prompt_name"));if(!name)return;
  try{await api("POST","/ledger/accounts",{code:code.trim(),name:name.trim()});showToast(t("toast_account_created"));showLedgerTab("accounts");}catch(e){showToast(e.message,"error");}
}
async function renderClosing(box){
  const r=await api("GET","/ledger/fiscal-years");
  const cy=new Date().getFullYear();
  box.innerHTML=`<div style="font-size:13px;color:var(--muted);margin-bottom:10px">${t("closing_hint")}</div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>${t("closing_year")}</th><th>${t("th_status")}</th><th style="text-align:right">${t("ledger_net_result")}</th><th></th></tr></thead><tbody>
    ${r.years.map(y=>`<tr><td style="font-family:var(--mono);font-weight:700">${y.year}</td><td>${y.closed?`<span class="badge bg">🔒 ${t("closing_closed")}</span>`:y.year>=cy?`<span class="badge bb">${t("closing_in_progress")}</span>`:`<span class="badge ba">${t("closing_to_close")}</span>`}</td>
      <td style="text-align:right;font-family:var(--mono)">${y.closed?m2(y.result):"—"}</td>
      <td>${!y.closed&&y.year<cy?(r.can_close?`<button class="btn btn-sm btn-g" onclick="closeFiscalYear(${y.year})"><i class="ti ti-lock"></i> ${t("closing_btn")} ${y.year}</button>`:`<span style="font-size:12px;color:var(--amber)"><i class="ti ti-lock"></i> ${t("closing_locked")}</span>`):""}</td></tr>`).join("")}
    </tbody></table></div></div>`;
}
async function closeFiscalYear(year){
  if(!confirm(t("closing_confirm").replace(/\{year\}/g,year)))return;
  try{const r=await api("POST",`/ledger/fiscal-years/${year}/close`);showToast(`${t("closing_done")} ${year} — ${t("ledger_net_result")} ${m2(r.result)}`);showLedgerTab("closing");}catch(e){showToast(e.message,"error");}
}
async function deleteLedgerEntry(id){if(!confirm(t("ledger_confirm_delete")))return;try{await api("DELETE",`/ledger/entries/${id}`);showLedgerTab("journal");}catch(e){showToast(e.message,"error");}}
async function openLedgerEntryModal(){
  if(!ledgerAllowed()){showToast(t("ledger_locked"),"error");return;}
  await ensureLedgerAccounts();
  document.getElementById("le-date").value=localDateInput(0);document.getElementById("le-label").value="";document.getElementById("le-journal").value="OD";
  document.getElementById("le-lines").innerHTML="";addLedgerLine();addLedgerLine();updateLedgerTotals();
  document.getElementById("modal-ledger-entry").style.display="flex";
}
function closeLedgerEntryModal(){document.getElementById("modal-ledger-entry").style.display="none";}
function addLedgerLine(){
  document.getElementById("le-lines").insertAdjacentHTML("beforeend",`<div class="le-row" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto;gap:6px;margin-bottom:6px">
    <select class="inp le-acc">${_ledger.accounts.map(a=>`<option value="${esc(a.code)}">${esc(a.code)} — ${esc(a.name)}</option>`).join("")}</select>
    <input class="inp le-d" type="number" min="0" step="0.01" placeholder="${t("ledger_debit")}" oninput="updateLedgerTotals()">
    <input class="inp le-c" type="number" min="0" step="0.01" placeholder="${t("ledger_credit")}" oninput="updateLedgerTotals()">
    <button type="button" class="btn btn-o btn-sm" onclick="this.closest('.le-row').remove();updateLedgerTotals()"><i class="ti ti-x"></i></button></div>`);
}
function ledgerLines(){return [...document.querySelectorAll("#le-lines .le-row")].map(r=>({account:r.querySelector(".le-acc").value,debit:parseFloat(r.querySelector(".le-d").value)||0,credit:parseFloat(r.querySelector(".le-c").value)||0})).filter(l=>l.debit||l.credit);}
function updateLedgerTotals(){
  const ls=ledgerLines();const d=ls.reduce((s,l)=>s+l.debit,0),c=ls.reduce((s,l)=>s+l.credit,0);
  const ok=Math.abs(d-c)<0.005&&d>0;
  document.getElementById("le-totals").innerHTML=`${t("ledger_debit")} <b>${m2(d)}</b> · ${t("ledger_credit")} <b>${m2(c)}</b> · ${ok?`<span style="color:var(--green)">✓ ${t("ledger_balanced")}</span>`:`<span style="color:var(--red)">${t("ledger_diff")} ${m2(Math.abs(d-c))}</span>`}`;
}
async function submitLedgerEntry(){
  const label=document.getElementById("le-label").value.trim();
  if(!label){flagMissingFields([document.getElementById("le-label")]);return;}
  try{
    const r=await api("POST","/ledger/entries",{date:dateInputToIso(document.getElementById("le-date").value),journal:document.getElementById("le-journal").value,label,lines:ledgerLines()});
    closeLedgerEntryModal();showToast(`${t("toast_entry_created")} ${r.number}`);showLedgerTab("journal");
  }catch(e){showToast(e.message,"error");}
}
async function exportLedgerCsv(){
  try{
    const r=await apiFetch(API_BASE+`/ledger/export?year=${_ledger.year}`,{method:"GET",headers:{"Authorization":`Bearer ${State.token}`}},true);
    if(!r.ok){await readApiResponse(r);return;}
    const blob=await r.blob();const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`grand-livre-${_ledger.year}.csv`;document.body.appendChild(a);a.click();a.remove();
  }catch(e){showToast(e.message,"error");}
}
function printLedger(){
  const titles={journal:t("ledger_tab_journal"),general:t("ledger_tab_general"),trial:t("ledger_tab_trial"),income:t("ledger_tab_income"),balance:t("ledger_tab_balance"),vat:t("ledger_tab_vat"),accounts:t("ledger_tab_accounts"),closing:t("ledger_tab_closing")};
  const co=State.tenant||{};
  _currentDoc={number:`${titles[_ledger.tab]}-${_ledger.year}`};
  const page=document.getElementById("doc-page");
  page.classList.remove("doc-ticket");
  page.innerHTML=`<div style="border-bottom:3px solid #00b36b;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between"><div style="font-weight:800;font-size:17px">${esc(co.company_name||co.name||"")}</div><div style="text-align:right"><div style="font-weight:800">${titles[_ledger.tab]}</div><div style="font-size:11px">${t("closing_year")} ${_ledger.year} · SYSCOHADA</div></div></div><div class="ledger-print">${document.getElementById("ledger-body").innerHTML}</div>`;
  page.querySelectorAll("button,select").forEach(el=>el.remove());
  document.getElementById("doc-wa-btn").style.display="none";
  document.getElementById("doc-view").style.display="block";document.body.classList.add("doc-open");
}
