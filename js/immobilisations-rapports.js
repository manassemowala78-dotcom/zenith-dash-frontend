let _assets=null,_assetSel=null;
async function loadAssetsPage(){
  const box=document.getElementById("assets-body");if(!box)return;
  try{_assets=await api("GET","/assets");}
  catch(e){box.innerHTML=`<div class="card" style="text-align:center;padding:28px;color:var(--muted)"><i class="ti ti-lock" style="font-size:28px"></i><div style="margin:8px 0 12px">${esc(e.message)}</div><button class="btn btn-g btn-sm" onclick="navigate('billing')">${t("btn_see_plans")}</button></div>`;document.getElementById("assets-kpis").innerHTML="";return;}
  const tt=_assets.totals;
  document.getElementById("assets-kpis").innerHTML=`<div class="kpi"><div class="kl">${t("as_cost")}</div><div class="kv" style="font-size:18px">${fmtUSD(tt.cost)}</div></div>
    <div class="kpi"><div class="kl">${t("as_accumulated")}</div><div class="kv" style="font-size:18px">${fmtUSD(tt.accumulated)}</div></div>
    <div class="kpi"><div class="kl">${t("as_nbv")}</div><div class="kv" style="font-size:18px;color:var(--green)">${fmtUSD(tt.net_book_value)}</div></div>
    <div class="kpi"><div class="kl">${t("as_this_year")}</div><div class="kv" style="font-size:18px;color:var(--amber)">${fmtUSD(tt.this_year_depreciation)}</div></div>`;
  box.innerHTML=`<div class="card"><div class="table-wrap"><table><thead><tr><th>${t("th_name")}</th><th>${t("as_category")}</th><th>${t("as_acquired")}</th><th style="text-align:right">${t("as_cost")}</th><th>${t("as_life")}</th><th style="text-align:right">${t("as_nbv")}</th><th>${t("th_status")}</th><th></th></tr></thead><tbody>
    ${_assets.assets.map(a=>`<tr><td style="font-weight:600">${esc(a.name)}<div style="font-size:11px;color:var(--muted);font-family:var(--mono)">${a.account_code}</div></td><td>${esc(a.category_label)}</td><td>${fmtDate(a.purchase_date)}</td>
      <td style="text-align:right;font-family:var(--mono)">${fmtUSD(a.cost)}</td><td>${a.useful_life_years} ${t("as_years")}</td><td style="text-align:right;font-family:var(--mono);font-weight:700">${fmtUSD(a.net_book_value)}</td>
      <td>${a.disposed_at?`<span class="badge badge-gray">${t("as_disposed")}</span>`:a.fully_depreciated?`<span class="badge bb">${t("as_fully")}</span>`:`<span class="badge bg">${t("as_in_use")}</span>`}</td>
      <td style="display:flex;gap:5px"><button class="btn btn-sm btn-o" onclick="openAssetSchedule('${a.id}')" title="${t("as_schedule")}"><i class="ti ti-table"></i></button>
        ${a.disposed_at?"":`<button class="btn btn-sm btn-o" onclick="openDisposeAsset('${a.id}')">${t("as_dispose")}</button>`}
        <button class="btn btn-sm btn-r" onclick="deleteAsset('${a.id}')"><i class="ti ti-trash"></i></button></td></tr>`).join("")||`<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">${t("as_none")}</td></tr>`}
    </tbody></table></div></div><div style="font-size:12px;color:var(--muted);margin-top:8px">${t("as_hint")}</div>`;
}
function openAssetModal(){
  if(!_assets){showToast(t("as_locked"),"error");return;}
  const sel=document.getElementById("as-category");
  sel.innerHTML=Object.entries(_assets.categories).map(([k,v])=>`<option value="${k}">${esc(v.label)}</option>`).join("");
  ["as-name","as-cost","as-residual","as-supplier","as-notes"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("as-date").value=localDateInput(0);document.getElementById("as-payment").value="521";
  onAssetCategory();document.getElementById("modal-asset").style.display="flex";
}
function onAssetCategory(){const c=_assets.categories[document.getElementById("as-category").value];document.getElementById("as-years").value=c?c.default_years:5;updateAssetPreview();}
function updateAssetPreview(){
  const cost=parseFloat(document.getElementById("as-cost").value)||0,res=parseFloat(document.getElementById("as-residual").value)||0,y=parseInt(document.getElementById("as-years").value)||0;
  document.getElementById("as-preview").textContent=cost>0&&y>0?t("as_preview").replace("{amount}",fmtUSD((cost-res)/y)).replace("{y}",y):"";
}
function closeAssetModal(){document.getElementById("modal-asset").style.display="none";}
async function submitAsset(){
  const name=document.getElementById("as-name").value.trim(),cost=parseFloat(document.getElementById("as-cost").value);
  const bad=[];if(!name)bad.push(document.getElementById("as-name"));if(!(cost>0))bad.push(document.getElementById("as-cost"));
  if(bad.length){flagMissingFields(bad);return;}
  try{
    await api("POST","/assets",{name,category:document.getElementById("as-category").value,purchase_date:dateInputToIso(document.getElementById("as-date").value),cost,
      residual_value:parseFloat(document.getElementById("as-residual").value||0),useful_life_years:parseInt(document.getElementById("as-years").value||0)||null,
      payment_account:document.getElementById("as-payment").value,supplier:document.getElementById("as-supplier").value||null,notes:document.getElementById("as-notes").value||null});
    closeAssetModal();showToast(t("as_created"));loadAssetsPage();
  }catch(e){showToast(e.message,"error");}
}
async function openAssetSchedule(id){
  try{
    const r=await api("GET",`/assets/${id}/schedule`);
    document.getElementById("as-sched-title").textContent=r.asset.name;
    document.getElementById("as-sched-body").innerHTML=`<div style="font-size:12px;color:var(--muted);margin-bottom:8px">${t("as_sched_hint").replace("{cost}",fmtUSD(r.asset.cost)).replace("{y}",r.asset.useful_life_years)}</div>
      <div class="table-wrap"><table><thead><tr><th>${t("closing_year")}</th><th style="text-align:right">${t("as_dotation")}</th><th style="text-align:right">${t("as_accumulated")}</th><th style="text-align:right">${t("as_nbv")}</th><th></th></tr></thead><tbody>
      ${r.schedule.map(s=>`<tr><td style="font-family:var(--mono)">${s.year}</td><td style="text-align:right;font-family:var(--mono)">${fmtUSD(s.amount)}</td><td style="text-align:right;font-family:var(--mono)">${fmtUSD(s.cumulative)}</td><td style="text-align:right;font-family:var(--mono);font-weight:700">${fmtUSD(s.net_book_value)}</td><td>${s.posted?`<span class="badge bg">${t("as_posted")}</span>`:`<span class="badge badge-gray">${t("as_planned")}</span>`}</td></tr>`).join("")}</tbody></table></div>`;
    document.getElementById("modal-asset-schedule").style.display="flex";
  }catch(e){showToast(e.message,"error");}
}
function closeAssetSchedule(){document.getElementById("modal-asset-schedule").style.display="none";}
function openDisposeAsset(id){_assetSel=id;document.getElementById("disp-date").value=localDateInput(0);document.getElementById("disp-price").value="";document.getElementById("modal-asset-dispose").style.display="flex";}
function closeDisposeAsset(){document.getElementById("modal-asset-dispose").style.display="none";}
async function submitDisposeAsset(){
  try{const r=await api("POST",`/assets/${_assetSel}/dispose`,{date:dateInputToIso(document.getElementById("disp-date").value),price:parseFloat(document.getElementById("disp-price").value||0),payment_account:document.getElementById("disp-account").value});
    closeDisposeAsset();showToast(`${t("as_disposed_toast")} — ${r.gain_or_loss>=0?t("as_gain"):t("as_loss")} ${fmtUSD(Math.abs(r.gain_or_loss))}`);loadAssetsPage();}
  catch(e){showToast(e.message,"error");}
}
async function deleteAsset(id){if(!confirm(t("as_confirm_delete")))return;try{await api("DELETE",`/assets/${id}`);loadAssetsPage();}catch(e){showToast(e.message,"error");}}
let _crDatasets=null,_crLast=null;
const CR_LABELS={sales:"cr_ds_sales",payments:"cr_ds_payments",expenses:"cr_ds_expenses",purchases:"cr_ds_purchases",payroll:"cr_ds_payroll",stock:"cr_ds_stock"};
async function loadCustomReportsPage(){
  const box=document.getElementById("cr-builder");if(!box)return;
  let r;try{r=await api("GET","/reports/custom");}catch(e){box.innerHTML=esc(e.message);return;}
  if(!r.enabled){box.innerHTML=`<div style="text-align:center;padding:24px;color:var(--muted)"><i class="ti ti-lock" style="font-size:28px"></i><div style="margin:8px 0 12px">${t("cr_locked")}</div><button class="btn btn-g btn-sm" onclick="navigate('billing')">${t("btn_see_plans")}</button></div>`;document.getElementById("cr-saved").innerHTML="";return;}
  _crDatasets=r.datasets;
  const y=new Date().getFullYear();
  box.innerHTML=`<div class="grid2"><div class="fgrp"><label class="fl">${t("cr_dataset")}</label><select class="inp" id="cr-dataset" onchange="fillCrGroup()">${Object.keys(r.datasets).map(k=>`<option value="${k}">${t(CR_LABELS[k])}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${t("cr_group_by")}</label><select class="inp" id="cr-group"></select></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${t("cr_from")}</label><input class="inp" type="date" id="cr-from" value="${y}-01-01"></div><div class="fgrp"><label class="fl">${t("cr_to")}</label><input class="inp" type="date" id="cr-to" value="${localDateInput(0)}"></div></div>
    <button class="btn btn-g btn-sm" onclick="runCustomReport()"><i class="ti ti-player-play"></i> ${t("cr_run")}</button>
    <div id="cr-result" style="margin-top:14px"></div>`;
  fillCrGroup();
  document.getElementById("cr-saved").innerHTML=r.reports.map(x=>`<div style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--b);font-size:13px"><span style="flex:1"><b>${esc(x.name)}</b><div style="font-size:11px;color:var(--muted)">${t(CR_LABELS[x.config.dataset])} · ${t("cr_g_"+x.config.group_by)}</div></span>
      <button class="btn btn-o btn-sm" onclick='loadSavedReport(${JSON.stringify(JSON.stringify(x.config))})'>${t("cr_open")}</button>
      <button class="btn btn-sm ${x.pinned?"btn-g":"btn-o"}" onclick="pinReport('${x.id}',${!x.pinned})" title="${t("cr_pin")}"><i class="ti ti-pin"></i></button>
      <button class="btn btn-sm btn-r" onclick="deleteSavedReport('${x.id}')"><i class="ti ti-trash"></i></button></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${t("cr_none_saved")}</div>`;
}
function fillCrGroup(sel){const ds=document.getElementById("cr-dataset").value;document.getElementById("cr-group").innerHTML=_crDatasets[ds].map(g=>`<option value="${g}" ${g===sel?"selected":""}>${t("cr_g_"+g)}</option>`).join("");}
function crConfig(){return {dataset:document.getElementById("cr-dataset").value,group_by:document.getElementById("cr-group").value,date_from:dateInputToIso(document.getElementById("cr-from").value),date_to:dateInputToIso(document.getElementById("cr-to").value),limit:20};}
function reportBarsHtml(res,max){
  const top=Math.max(1,...res.rows.map(r=>r.value));
  return res.rows.slice(0,max||res.rows.length).map(r=>`<div class="cr-row"><span class="cr-lab" title="${esc(r.label)}">${esc(r.label)}</span><div class="cr-track"><div class="cr-bar" style="width:${Math.max(1,r.value/top*100)}%"></div></div><b class="cr-val">${fmtUSD(r.value)}</b></div>`).join("")||`<div style="color:var(--muted);font-size:13px">${t("cr_empty")}</div>`;
}
async function runCustomReport(){
  try{
    const cfg=crConfig();const res=await api("POST","/reports/custom/run",cfg);_crLast={cfg,res};
    document.getElementById("cr-result").innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px"><b>${t("cr_total")} ${fmtUSD(res.total)}</b>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-o btn-sm" onclick="exportCustomReport()"><i class="ti ti-file-spreadsheet"></i> CSV</button><button class="btn btn-g btn-sm" onclick="saveCustomReport()"><i class="ti ti-device-floppy"></i> ${t("cr_save")}</button></div></div>
      ${reportBarsHtml(res)}`;
  }catch(e){showToast(e.message,"error");}
}
function loadSavedReport(cfgJson){
  const cfg=JSON.parse(cfgJson);document.getElementById("cr-dataset").value=cfg.dataset;fillCrGroup(cfg.group_by);
  if(cfg.date_from)document.getElementById("cr-from").value=String(cfg.date_from).slice(0,10);
  if(cfg.date_to)document.getElementById("cr-to").value=String(cfg.date_to).slice(0,10);
  runCustomReport();window.scrollTo(0,0);
}
function exportCustomReport(){
  if(!_crLast)return;
  const csv="\ufeff"+[[t("cr_g_"+_crLast.cfg.group_by),"USD",t("cr_count")],..._crLast.res.rows.map(r=>[r.label,String(r.value).replace(".",","),r.count])].map(r=>r.map(csvEscape).join(";")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`rapport-${_crLast.cfg.dataset}-${_crLast.cfg.group_by}.csv`;document.body.appendChild(a);a.click();a.remove();
}
async function saveCustomReport(){
  const name=prompt(t("cr_prompt_name"),`${t(CR_LABELS[_crLast.cfg.dataset])} — ${t("cr_g_"+_crLast.cfg.group_by)}`);if(!name)return;
  const pinned=confirm(t("cr_confirm_pin"));
  try{await api("POST","/reports/custom",{name,config:_crLast.cfg,pinned});showToast(t("cr_saved"));loadCustomReportsPage();}catch(e){showToast(e.message,"error");}
}
async function pinReport(id,pinned){try{await api("PATCH",`/reports/custom/${id}`,{pinned});showToast(pinned?t("cr_pinned"):t("cr_unpinned"));loadCustomReportsPage();}catch(e){showToast(e.message,"error");}}
async function deleteSavedReport(id){if(!confirm(t("cr_confirm_delete")))return;try{await api("DELETE",`/reports/custom/${id}`);loadCustomReportsPage();}catch(e){showToast(e.message,"error");}}
async function loadDashboardWidgets(){
  const box=document.getElementById("dash-widgets");if(!box)return;
  try{
    const r=await api("GET","/dashboard/widgets");
    if(!r.enabled||!r.widgets.length){box.style.display="none";return;}
    box.style.display="";
    box.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:700"><i class="ti ti-layout-dashboard" style="color:var(--green)"></i> ${t("dw_title")}</div><button class="btn btn-o btn-sm" onclick="navigate('creports')">${t("dw_manage")}</button></div>
      <div class="dw-grid">${r.widgets.map((w,i)=>`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:6px"><b style="font-size:13px">${esc(w.name)}</b>
        <span style="display:flex;gap:4px">${i>0?`<button class="btn btn-o btn-sm" style="padding:2px 6px" onclick="moveWidget('${w.id}',-1)" aria-label="↑">↑</button>`:""}${i<r.widgets.length-1?`<button class="btn btn-o btn-sm" style="padding:2px 6px" onclick="moveWidget('${w.id}',1)" aria-label="↓">↓</button>`:""}</span></div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${t("cr_total")} <b style="color:var(--text)">${fmtUSD(w.result.total)}</b></div>${reportBarsHtml(w.result,5)}</div>`).join("")}</div>`;
    window._dashWidgets=r.widgets;
  }catch(_){box.style.display="none";}
}
async function moveWidget(id,dir){
  const ws=window._dashWidgets||[];const i=ws.findIndex(w=>w.id===id);const j=i+dir;if(i<0||j<0||j>=ws.length)return;
  [ws[i],ws[j]]=[ws[j],ws[i]];
  try{await Promise.all(ws.map((w,k)=>api("PATCH",`/reports/custom/${w.id}`,{position:k+1})));loadDashboardWidgets();}catch(e){showToast(e.message,"error");}
}
