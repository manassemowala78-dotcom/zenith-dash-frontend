// ── MODULE BAR (9.0) : ardoises, consignes, inventaire, happy hour ──
const _bar={settings:null,sheet:null,result:null};
SECTOR_PAGE_LOADERS.bartabs=async el=>{
  const [r,s]=await Promise.all([api("GET","/bar/tabs"),api("GET","/bar/settings")]);_bar.settings=s;
  const hh=s.happy_hour_now;
  el.innerHTML=sectorPageHead(esc(t("nav_bar_tabs")),esc(t("bar_tabs_sub").replace("{n}",r.tabs.length).replace("{v}",zdMoney(r.open_total)).replace("{c}",r.closed_today)),
    `<button class="btn btn-g btn-sm" onclick="rsNewOrder('tab')"><i class="ti ti-plus"></i> ${esc(t("bar_new_tab"))}</button>`)+
    (hh.active?`<div class="alert-bar" style="margin-bottom:12px;border-color:var(--purple);color:var(--purple)"><i class="ti ti-clock-hour-5"></i> ${esc(t("bar_hh_on").replace("{p}",hh.discount_pct).replace("{h}",hh.until))}</div>`:"")+
    (r.tabs.length?`<div class="rs-orders">${r.tabs.map(x=>`<button class="rs-ocard" onclick="rsOpenOrder('${x.id}')" style="gap:6px">
      <b style="font-size:15px">${esc(x.customer_name||"—")}</b><span class="mono" style="font-size:18px;font-weight:800">${zdMoney(x.due)}</span>
      ${x.tab_limit?`<div class="usage-bar" style="width:100%"><div class="usage-bar-fill" style="width:${Math.min(100,x.limit_used_pct)}%;background:${x.limit_used_pct>=90?"var(--red)":x.limit_used_pct>=70?"var(--amber)":"var(--green)"}"></div></div><span style="font-size:11px;color:var(--muted)">${esc(t("bar_tab_limit"))} ${zdMoney(x.tab_limit)} · ${x.limit_used_pct} %</span>`:`<span style="font-size:11px;color:var(--muted)">${esc(t("bar_no_limit"))}</span>`}
      <span style="font-size:11px;color:var(--muted)">${x.minutes_open} min · ${esc(x.waiter_name||"")}${x.customer_phone?" · "+esc(x.customer_phone):""}</span></button>`).join("")}</div>`:`<div class="card">${zdEmpty(t("bar_no_tabs"),"notes")}</div>`);
  sectorTimer("bartabs",()=>{if(!document.querySelector("#modal-resto-order[style*='flex']"))SECTOR_PAGE_LOADERS.bartabs(el);},20000);
};
SECTOR_PAGE_LOADERS.bardeposits=async el=>{
  const d=await api("GET","/bar/deposits");_bar.deposits=d;
  el.innerHTML=sectorPageHead(esc(t("nav_bar_deposits")),esc(t("bar_deposits_sub")))+
    `<div class="kgrid" style="margin-bottom:12px"><div class="kpi a"><div class="kl">${esc(t("bar_dep_outstanding"))}</div><div class="kv">${zdMoney(d.outstanding_amount)}</div></div><div class="kpi b"><div class="kl">${esc(t("bar_dep_units"))}</div><div class="kv">${zdQty(d.outstanding_qty)}</div></div></div>
    ${d.types.length?`<div class="card" style="margin-bottom:12px"><div class="grid2"><div class="fgrp"><label class="fl">${esc(t("rs_customer"))} *</label><input class="inp" id="bd-name" list="bd-names"><datalist id="bd-names">${d.customers.map(c=>`<option value="${esc(c.name)}">`).join("")}</datalist></div>
      <div class="fgrp"><label class="fl">${esc(t("pb_phone"))}</label><input class="inp" id="bd-phone" inputmode="tel"></div></div>
      <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("bar_dep_type"))} *</label><select class="inp" id="bd-type">${d.types.map(x=>`<option value="${esc(x.name)}">${esc(x.name)} · ${zdMoney(x.amount)}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("zd_qty"))} *</label><input class="inp" type="number" min="1" id="bd-qty" value="1"></div>
      <div class="fgrp"><label class="fl">${esc(t("fld_payment_method"))}</label><select class="inp" id="bd-method">${zdMethodOptions("cash")}</select></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-g btn-sm" onclick="submitBarDeposit('out')"><i class="ti ti-arrow-up-right"></i> ${esc(t("bar_dep_out"))}</button><button class="btn btn-o btn-sm" onclick="submitBarDeposit('return')"><i class="ti ti-arrow-back-up"></i> ${esc(t("bar_dep_return"))}</button></div></div>`:
      `<div class="card" style="margin-bottom:12px">${zdEmpty(t("bar_no_dep_types"),"bottle")}<div style="text-align:center"><button class="btn btn-o btn-sm" onclick="navigate('barsettings')">${esc(t("nav_bar_settings"))}</button></div></div>`}
    <div class="grid2"><div class="card"><b>${esc(t("bar_dep_by_customer"))}</b>${d.customers.map(c=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--b);cursor:pointer" onclick="document.getElementById('bd-name').value='${escJs(c.name)}'"><span><b>${esc(c.name)}</b><div style="font-size:11px;color:var(--muted)">${Object.entries(c.by_type).filter(([,q])=>q).map(([k,q])=>`${zdQty(q)} × ${esc(k)}`).join(" · ")}</div></span><b class="mono">${zdMoney(c.amount)}</b></div>`).join("")||zdEmpty(t("bar_no_deposits"))}</div>
      <div class="card"><b>${esc(t("bar_dep_recent"))}</b>${d.recent.map(m=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid var(--b)"><span>${esc(m.customer_name)} · ${zdQty(Math.abs(m.qty))} × ${esc(m.type_name)}</span><span class="mono" style="color:${m.amount>0?"var(--green)":"var(--amber)"}">${m.amount>0?"+":"−"}${zdMoney(Math.abs(m.amount))}</span></div>`).join("")||zdEmpty(t("bar_no_deposits"))}</div></div>`;
};
async function submitBarDeposit(kind){
  const body={customer_name:zdVal("bd-name"),phone:zdVal("bd-phone")||null,type_name:zdVal("bd-type"),qty:zdNum("bd-qty")||0,method:zdVal("bd-method")};
  if(!body.customer_name){flagMissingFields([document.getElementById("bd-name")]);return;}
  try{const r=await api("POST",`/bar/deposits/${kind}`,body);showToast(t(kind==="out"?"bar_dep_out_ok":"bar_dep_return_ok").replace("{v}",zdMoney(r.amount)));navigate("bardeposits");}catch(e){showToast(e.message,"error");}
}
SECTOR_PAGE_LOADERS.barinventory=async el=>{
  const [sh,hist]=await Promise.all([api("GET","/bar/inventory/sheet"),api("GET","/bar/inventory")]);_bar.sheet=sh.products;
  el.innerHTML=sectorPageHead(esc(t("nav_bar_inventory")),esc(t("bar_inv_sub")))+
    (_bar.result?`<div class="card" style="margin-bottom:12px;border-color:${_bar.result.diff_value<0?"var(--red)":"var(--green)"}"><b>${esc(_bar.result.number)}</b> · ${esc(t("bar_inv_gap"))} <b class="mono" style="color:${_bar.result.diff_value<0?"var(--red)":"var(--green)"}">${zdMoney(_bar.result.diff_value)}</b>
      ${_bar.result.missing.map(l=>`<div style="font-size:12px;color:var(--red)">${esc(l.name)} : ${zdQty(l.diff)} ${esc(l.unit)} (${zdMoney(l.value)})</div>`).join("")}</div>`:"")+
    `<div class="card"><div class="table-wrap"><table><thead><tr><th>${esc(t("rs_ingredient"))}</th><th>${esc(t("bar_expected"))}</th><th>${esc(t("bar_counted"))}</th><th>${esc(t("rs_value"))}</th></tr></thead><tbody>
      ${sh.products.map(p=>`<tr><td><b>${esc(p.name)}</b></td><td class="mono">${zdQty(p.expected)} ${esc(p.unit)}</td><td><input class="inp bi-count" data-id="${p.id}" type="number" min="0" step="0.01" style="width:110px" placeholder="${zdQty(p.expected)}"></td><td class="mono">${zdMoney(p.value)}</td></tr>`).join("")||`<tr><td colspan="4">${zdEmpty(t("bar_inv_empty"))}</td></tr>`}
    </tbody></table></div><div style="font-size:12px;color:var(--muted);margin:8px 0">${esc(t("bar_inv_hint"))}</div>
    <div class="fgrp"><input class="inp" id="bi-note" placeholder="${esc(t("fld_notes"))}"></div><button class="btn btn-g btn-sm" onclick="submitBarInventory()"><i class="ti ti-clipboard-check"></i> ${esc(t("bar_inv_validate"))}</button></div>
    <div class="card" style="margin-top:12px"><b>${esc(t("bar_inv_history"))}</b>${hist.map(h=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--b);font-size:13px"><span><span class="mono">${esc(h.number)}</span> · ${fmtDate(h.created_at)} · ${esc(h.by_name||"")}</span><b class="mono" style="color:${h.diff_value<0?"var(--red)":"var(--text)"}">${zdMoney(h.diff_value)}</b></div>`).join("")||zdEmpty(t("bar_inv_none"))}</div>`;
  _bar.result=null;
};
async function submitBarInventory(){
  const counts=[...document.querySelectorAll(".bi-count")].filter(i=>i.value.trim()!=="").map(i=>({product_id:i.dataset.id,counted:parseFloat(i.value.replace(",","."))}));
  if(!counts.length){showToast(t("bar_inv_nothing"),"error");return;}
  if(!confirm(t("bar_inv_confirm").replace("{n}",counts.length)))return;
  try{_bar.result=await api("POST","/bar/inventory",{counts,note:zdVal("bi-note")||null});navigate("barinventory");}catch(e){showToast(e.message,"error");}
}
SECTOR_PAGE_LOADERS.barsettings=async el=>{
  const s=await api("GET","/bar/settings");_bar.settings=s;_bar.hh=JSON.parse(JSON.stringify(s.happy_hours));_bar.dep=JSON.parse(JSON.stringify(s.deposit_types));
  const rep=await api("GET","/bar/report").catch(()=>null);
  el.innerHTML=sectorPageHead(esc(t("nav_bar_settings")),esc(t("bar_settings_sub")))+
    (rep?`<div class="kgrid" style="margin-bottom:12px"><div class="kpi g"><div class="kl">${esc(t("bar_drinks_today"))}</div><div class="kv">${zdMoney(rep.drinks_revenue)}</div></div><div class="kpi p"><div class="kl">${esc(t("bar_hh_sales"))}</div><div class="kv">${zdQty(rep.happy_hour.qty)} · ${zdMoney(rep.happy_hour.amount)}</div></div>
      <div class="kpi b"><div class="kl">${esc(t("nav_bar_tabs"))}</div><div class="kv">${rep.open_tabs} · ${zdMoney(rep.open_tabs_total)}</div></div><div class="kpi a"><div class="kl">${esc(t("bar_dep_outstanding"))}</div><div class="kv">${zdMoney(rep.deposits.outstanding)}</div></div></div>`:"")+
    `<div class="card" style="margin-bottom:12px"><div style="display:flex;align-items:center;margin-bottom:8px"><b>${esc(t("bar_hh_title"))}</b>${s.happy_hour_now.active?` <span class="badge bp" style="margin-left:8px">${esc(t("bar_hh_active"))}</span>`:""}<button class="btn btn-o btn-sm" style="margin-left:auto" onclick="_bar.hh.push({name:'Happy hour',days:[0,1,2,3,4,5,6],start:'17:00',end:'19:00',discount_pct:20,enabled:true});barRenderHH()"><i class="ti ti-plus"></i></button></div><div id="bar-hh"></div>
      <div style="font-size:12px;color:var(--muted)">${esc(t("bar_hh_hint"))}</div></div>
    <div class="card" style="margin-bottom:12px"><div style="display:flex;align-items:center;margin-bottom:8px"><b>${esc(t("bar_dep_types"))}</b><button class="btn btn-o btn-sm" style="margin-left:auto" onclick="_bar.dep.push({name:'',amount:0});barRenderDep()"><i class="ti ti-plus"></i></button></div><div id="bar-dep"></div></div>
    <div class="card" style="margin-bottom:12px"><div class="fgrp"><label class="fl">${esc(t("bar_default_limit"))}</label><input class="inp" type="number" min="0" id="bar-deflimit" value="${s.tab_default_limit||""}" placeholder="${esc(t("bar_tab_limit_ph"))}" style="max-width:200px"></div></div>
    <button class="btn btn-g btn-sm" onclick="submitBarSettings()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button>`;
  barRenderHH();barRenderDep();
};
function barRenderHH(){
  const box=document.getElementById("bar-hh");if(!box)return;
  box.innerHTML=_bar.hh.map((h,i)=>`<div style="border:1px solid var(--b);border-radius:8px;padding:8px;margin-bottom:6px"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
    <input class="inp" style="flex:1;min-width:120px" value="${esc(h.name)}" oninput="_bar.hh[${i}].name=this.value"><input class="inp" type="time" style="width:110px" value="${h.start}" oninput="_bar.hh[${i}].start=this.value"><input class="inp" type="time" style="width:110px" value="${h.end}" oninput="_bar.hh[${i}].end=this.value">
    <label style="font-size:12px">− <input class="inp" type="number" min="0" max="90" value="${h.discount_pct}" style="width:70px;display:inline-block" oninput="_bar.hh[${i}].discount_pct=+this.value||0"> %</label>
    <label style="font-size:12px"><input type="checkbox" ${h.enabled!==false?"checked":""} onchange="_bar.hh[${i}].enabled=this.checked"> ${esc(t("bar_active"))}</label><button class="btn btn-o btn-sm" onclick="_bar.hh.splice(${i},1);barRenderHH()"><i class="ti ti-trash"></i></button></div>
    <div class="rs-steps" style="margin-top:6px">${[0,1,2,3,4,5,6].map(d=>`<label class="toggle-btn" style="padding:3px 8px;font-size:11px"><input type="checkbox" ${h.days.includes(d)?"checked":""} onchange="const a=_bar.hh[${i}].days.filter(x=>x!==${d});if(this.checked)a.push(${d});_bar.hh[${i}].days=a"> ${esc(bkDayName(d).slice(0,3))}</label>`).join("")}</div></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("bar_no_hh"))}</div>`;
}
function barRenderDep(){
  const box=document.getElementById("bar-dep");if(!box)return;
  box.innerHTML=_bar.dep.map((d,i)=>`<div style="display:flex;gap:6px;margin-bottom:6px"><input class="inp" style="flex:1" placeholder="${esc(t("bar_dep_type_ph"))}" value="${esc(d.name)}" oninput="_bar.dep[${i}].name=this.value"><input class="inp" type="number" min="0" step="0.05" style="width:110px" value="${d.amount||""}" placeholder="$" oninput="_bar.dep[${i}].amount=+this.value||0"><button class="btn btn-o btn-sm" onclick="_bar.dep.splice(${i},1);barRenderDep()"><i class="ti ti-trash"></i></button></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("bar_no_dep_types"))}</div>`;
}
async function submitBarSettings(){
  try{await api("PUT","/bar/settings",{happy_hours:_bar.hh,deposit_types:_bar.dep.filter(d=>d.name.trim()),tab_default_limit:zdNum("bar-deflimit")||0});_rs.menu=null;showToast(t("rs_settings_saved"));navigate("barsettings");}catch(e){showToast(e.message,"error");}
}
