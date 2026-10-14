let _pdTab="tasks",_pdOverview=null;
function showProjectTab(tab){
  _pdTab=tab;
  document.querySelectorAll("[data-pdtab]").forEach(b=>b.classList.toggle("active",b.dataset.pdtab===tab));
  ["tasks","time","plan","budget"].forEach(k=>{const el=document.getElementById(`pd-panel-${k}`);if(el)el.style.display=k===tab?"block":"none";});
  if(tab==="tasks")loadProjectTasks();else loadProjectOverview();
}
async function loadProjectOverview(){
  try{_pdOverview=await api("GET",`/projects/${_currentProjectId}/overview`);}catch(e){showToast(e.message,"error");return;}
  const o=_pdOverview;
  if(_pdTab==="time")renderProjectTime(o);else if(_pdTab==="plan")renderGantt(o);else if(_pdTab==="budget")renderProjectBudget(o);
}
function renderProjectTime(o){
  const box=document.getElementById("pd-panel-time");
  box.innerHTML=`<div class="kgrid" style="margin-bottom:10px">
      <div class="kpi"><div class="kl">${t("pd_hours_total")}</div><div class="kv" style="font-size:18px">${o.hours} h</div></div>
      <div class="kpi"><div class="kl">${t("pd_unbilled")}</div><div class="kv" style="font-size:18px;color:var(--amber)">${o.unbilled_hours} h</div><div style="font-size:11px;color:var(--muted)">${fmtUSD(o.unbilled_amount)}</div></div></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <label style="font-size:12px;color:var(--muted)">${t("pd_hourly_rate")}</label><input class="inp" type="number" id="pd-rate" min="0" step="0.5" value="${o.hourly_rate||""}" style="width:100px">
      <button class="btn btn-o btn-sm" onclick="saveProjectRate()">${t("btn_save")}</button>
      <button class="btn btn-g btn-sm" style="margin-left:auto" onclick="invoiceProjectTime()" ${o.unbilled_hours>0?"":"disabled"}><i class="ti ti-file-invoice"></i> ${t("pd_invoice_time")}</button></div>
    ${o.time_logs.map(l=>`<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--b);font-size:13px">
      <span style="font-family:var(--mono);min-width:76px">${fmtDate(l.log_date)}</span><span style="flex:1;min-width:0">${esc(l.task)}${l.note?` · <span style="color:var(--muted)">${esc(l.note)}</span>`:""}<div style="font-size:11px;color:var(--muted)">${esc(l.logged_by||"")}</div></span>
      <b style="font-family:var(--mono)">${l.hours} h</b>
      ${l.invoiced?`<span class="badge bg">${t("pd_invoiced")}</span>`:`<label style="font-size:11px;display:flex;gap:4px;align-items:center;cursor:pointer"><input type="checkbox" ${l.billable?"checked":""} onchange="toggleBillable('${l.id}',this.checked)"> ${t("pd_billable")}</label>`}</div>`).join("")||`<div style="color:var(--muted);font-size:13px">${t("pd_no_time")}</div>`}`;
}
async function saveProjectRate(){
  const v=parseFloat(document.getElementById("pd-rate").value||0);
  try{await api("PATCH",`/projects/${_currentProjectId}`,{hourly_rate:v});showToast(t("toast_updated"));loadProjectOverview();}catch(e){showToast(e.message,"error");}
}
async function toggleBillable(id,billable){try{await api("PATCH",`/time/${id}?billable=${billable}`);loadProjectOverview();}catch(e){showToast(e.message,"error");loadProjectOverview();}}
async function invoiceProjectTime(){
  if(!confirm(t("pd_confirm_invoice").replace("{h}",_pdOverview.unbilled_hours).replace("{amount}",fmtUSD(_pdOverview.unbilled_amount))))return;
  try{const r=await api("POST",`/projects/${_currentProjectId}/invoice-time`,{});showToast(`${t("pd_invoice_created")} ${r.number} — ${fmtMoney(r.total,r.currency)}`);loadProjectOverview();}
  catch(e){showToast(e.message,"error");}
}
function renderGantt(o){
  const box=document.getElementById("pd-panel-plan");
  const tasks=o.timeline.filter(x=>x.start_date||x.due_date);
  if(!tasks.length){box.innerHTML=`<div style="color:var(--muted);font-size:13px;padding:12px">${t("pd_no_dates")}</div>`;return;}
  const d=s=>new Date(parseServerDate(s));
  const starts=tasks.map(x=>d(x.start_date||x.due_date)),ends=tasks.map(x=>d(x.due_date||x.start_date));
  let min=new Date(Math.min(...starts)),max=new Date(Math.max(...ends));
  min.setDate(min.getDate()-1);max.setDate(max.getDate()+1);
  const span=Math.max(1,(max-min)/86400000);
  const today=new Date();const todayPct=((today-min)/86400000)/span*100;
  const color=s=>["done","completed"].includes(s)?"var(--green)":s==="in_progress"?"var(--blue)":"var(--amber)";
  box.innerHTML=`<div class="gantt"><div class="gantt-head"><span>${fmtDate(min.toISOString())}</span><span>${fmtDate(max.toISOString())}</span></div>
    ${tasks.map(x=>{const s=d(x.start_date||x.due_date),e=d(x.due_date||x.start_date);const left=((s-min)/86400000)/span*100;const width=Math.max(2,((e-s)/86400000+1)/span*100);
      const late=x.due_date&&e<today&&!["done","completed"].includes(x.status);
      return `<div class="gantt-row"><div class="gantt-label" title="${esc(x.title)}">${esc(x.title)}<div style="font-size:10px;color:var(--muted)">${x.hours} / ${x.estimated_hours||"—"} h</div></div>
        <div class="gantt-track">${todayPct>=0&&todayPct<=100?`<div class="gantt-today" style="left:${todayPct}%"></div>`:""}<div class="gantt-bar" style="left:${left}%;width:${Math.min(width,100-left)}%;background:${late?"var(--red)":color(x.status)}" title="${fmtDate(s.toISOString())} → ${fmtDate(e.toISOString())}"></div></div></div>`;}).join("")}
    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin-top:8px"><span><span class="gantt-dot" style="background:var(--amber)"></span>${t("pd_todo")}</span><span><span class="gantt-dot" style="background:var(--blue)"></span>${t("pd_in_progress")}</span><span><span class="gantt-dot" style="background:var(--green)"></span>${t("pd_done")}</span><span><span class="gantt-dot" style="background:var(--red)"></span>${t("pd_late")}</span></div></div>`;
}
function renderProjectBudget(o){
  const box=document.getElementById("pd-panel-budget");
  const pct=o.budget_used_pct;
  box.innerHTML=`<div class="kgrid" style="margin-bottom:12px">
      <div class="kpi"><div class="kl">${t("pd_budget")}</div><div class="kv" style="font-size:18px">${o.budget?fmtUSD(o.budget):"—"}</div></div>
      <div class="kpi"><div class="kl">${t("pd_costs")}</div><div class="kv" style="font-size:18px;color:${pct>100?"var(--red)":"var(--text)"}">${fmtUSD(o.costs)}</div><div style="font-size:11px;color:var(--muted)">${t("pd_costs_detail").replace("{e}",fmtUSD(o.costs_expenses)).replace("{p}",fmtUSD(o.costs_purchases))}</div></div>
      <div class="kpi"><div class="kl">${t("pd_invoiced_total")}</div><div class="kv" style="font-size:18px">${fmtUSD(o.invoiced)}</div><div style="font-size:11px;color:var(--muted)">${t("paid_label")} ${fmtUSD(o.paid)}</div></div>
      <div class="kpi"><div class="kl">${t("pd_margin")}</div><div class="kv" style="font-size:18px;color:${o.margin<0?"var(--red)":"var(--green)"}">${fmtUSD(o.margin)}</div></div></div>
    ${o.budget?`<div style="font-size:12px;margin-bottom:4px">${t("pd_budget_used").replace("{pct}",pct)}</div><div style="height:10px;background:var(--bg);border-radius:6px;overflow:hidden"><div style="height:100%;width:${Math.min(100,pct||0)}%;background:${pct>100?"var(--red)":pct>80?"var(--amber)":"var(--green)"}"></div></div>`:""}
    ${o.estimated_hours?`<div style="font-size:12px;margin:12px 0 4px">${t("pd_hours_vs_estimate").replace("{h}",o.hours).replace("{e}",o.estimated_hours)}</div><div style="height:10px;background:var(--bg);border-radius:6px;overflow:hidden"><div style="height:100%;width:${Math.min(100,o.hours_vs_estimate_pct||0)}%;background:${o.hours_vs_estimate_pct>100?"var(--red)":"var(--blue)"}"></div></div>`:""}
    <div style="font-size:12px;color:var(--muted);margin-top:12px">${t("pd_budget_hint")}</div>
    ${o.invoices.length?`<div style="font-weight:700;font-size:13px;margin:12px 0 6px">${t("tab_invoices")}</div>`+o.invoices.map(i=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid var(--b)"><span style="font-family:var(--mono)">${esc(i.number)}</span><span>${statusBadge(i.status)} <b style="font-family:var(--mono)">${fmtMoney(i.total,i.currency)}</b></span></div>`).join(""):""}`;
}
async function loadProjectSelect(selId){
  const sel=document.getElementById(selId);if(!sel)return;
  const grp=sel.closest(".fgrp");
  if(!checkFeature(State.tenant?.limits||{},"projects")){if(grp)grp.style.display="none";return;}
  try{const list=await api("GET","/projects");sel.innerHTML=`<option value="">—</option>`+list.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("");if(grp)grp.style.display=list.length?"":"none";}
  catch(_){if(grp)grp.style.display="none";}
}
