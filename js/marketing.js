let _mkt={tab:"segments",segments:[],status:null};
function segmentsAllowed(){const p=State.tenant?.plan;return !!State.tenant?.is_creator||["trial","professional","business","business_plus","enterprise"].includes(p);}
function loyaltyAllowed(){const p=State.tenant?.plan;return !!State.tenant?.is_creator||["trial","business_plus","enterprise"].includes(p);}
async function loadMarketing(){showMarketingTab(_mkt.tab);}
async function showMarketingTab(tab){
  _mkt.tab=tab;
  document.querySelectorAll("[data-mkttab]").forEach(b=>b.classList.toggle("active",b.dataset.mkttab===tab));
  const box=document.getElementById("mkt-body");if(!box)return;
  const seq=_mkt.seq=(_mkt.seq||0)+1;const tmp=document.createElement("div");
  try{
    if(tab==="segments"){if(!segmentsAllowed())ledgerLocked(tmp,t("segments_locked"));else await renderSegments(tmp);}
    else if(tab==="campaigns")await renderCampaigns(tmp);
    else{if(!loyaltyAllowed())ledgerLocked(tmp,t("loyalty_locked"));else await renderLoyalty(tmp);}
  }catch(e){tmp.innerHTML=`<div style="color:var(--red);padding:16px">${esc(e.message)}</div>`;}
  if(seq===_mkt.seq)box.replaceChildren(...tmp.childNodes);
}
function segmentRulesFromForm(){
  const v=id=>document.getElementById(id);const r={};
  if(v("sg-balance")?.checked)r.has_balance_due=true;
  if(v("sg-email")?.checked)r.has_email=true;
  if(v("sg-phone")?.checked)r.has_phone=true;
  if(v("sg-optin")?.checked)r.opted_in=true;
  const num=(id,key)=>{const x=v(id)?.value;if(x!==""&&x!=null)r[key]=parseFloat(x);};
  num("sg-min","min_invoiced");num("sg-max","max_invoiced");num("sg-inactive","inactive_days");num("sg-new","new_days");num("sg-points","min_points");
  const c=v("sg-country")?.value.trim();if(c)r.country=c;
  return r;
}
function describeRules(r){
  const out=[];
  if(r.has_balance_due)out.push(t("sg_rule_balance"));if(r.inactive_days)out.push(t("sg_rule_inactive").replace("{n}",r.inactive_days));
  if(r.new_days)out.push(t("sg_rule_new").replace("{n}",r.new_days));if(r.min_invoiced!=null)out.push(`≥ ${fmtUSD(r.min_invoiced)}`);
  if(r.max_invoiced!=null)out.push(`≤ ${fmtUSD(r.max_invoiced)}`);if(r.country)out.push(r.country);if(r.has_email)out.push("email");if(r.has_phone)out.push(t("sg_phone"));
  if(r.min_points)out.push(`≥ ${r.min_points} pts`);if(r.opted_in)out.push(t("sg_optin_short"));
  return out.join(" · ")||t("sg_all_clients");
}
async function renderSegments(box){
  _mkt.segments=await api("GET","/segments");
  box.innerHTML=`<div class="grid2" style="align-items:start">
    <div class="card"><div style="font-weight:700;margin-bottom:8px">${t("sg_builder")}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        <button class="btn btn-o btn-sm" onclick="segmentPreset('unpaid')">${t("sg_preset_unpaid")}</button>
        <button class="btn btn-o btn-sm" onclick="segmentPreset('inactive')">${t("sg_preset_inactive")}</button>
        <button class="btn btn-o btn-sm" onclick="segmentPreset('best')">${t("sg_preset_best")}</button>
        <button class="btn btn-o btn-sm" onclick="segmentPreset('new')">${t("sg_preset_new")}</button>
      </div>
      <label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:6px"><input type="checkbox" id="sg-balance" onchange="previewSegment()"> ${t("sg_rule_balance")}</label>
      <div class="grid2"><div class="fgrp"><label class="fl">${t("sg_inactive_days")}</label><input class="inp" type="number" min="0" id="sg-inactive" oninput="previewSegment()"></div>
        <div class="fgrp"><label class="fl">${t("sg_new_days")}</label><input class="inp" type="number" min="0" id="sg-new" oninput="previewSegment()"></div></div>
      <div class="grid2"><div class="fgrp"><label class="fl">${t("sg_min_invoiced")}</label><input class="inp" type="number" min="0" id="sg-min" oninput="previewSegment()"></div>
        <div class="fgrp"><label class="fl">${t("sg_max_invoiced")}</label><input class="inp" type="number" min="0" id="sg-max" oninput="previewSegment()"></div></div>
      <div class="grid2"><div class="fgrp"><label class="fl">${t("sg_country")}</label><input class="inp" id="sg-country" oninput="previewSegment()"></div>
        <div class="fgrp"><label class="fl">${t("sg_min_points")}</label><input class="inp" type="number" min="0" id="sg-points" oninput="previewSegment()"></div></div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px;margin-bottom:10px">
        <label><input type="checkbox" id="sg-email" onchange="previewSegment()"> ${t("sg_has_email")}</label>
        <label><input type="checkbox" id="sg-phone" onchange="previewSegment()"> ${t("sg_has_phone")}</label>
        <label><input type="checkbox" id="sg-optin" onchange="previewSegment()"> ${t("sg_optin")}</label></div>
      <button class="btn btn-g btn-sm" onclick="saveSegment()"><i class="ti ti-device-floppy"></i> ${t("sg_save")}</button>
      <div style="font-weight:700;margin:16px 0 6px">${t("sg_saved")}</div>
      ${_mkt.segments.map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--b)"><div><b>${esc(s.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(describeRules(s.rules))}</div></div><div style="display:flex;gap:6px;align-items:center"><span class="badge bb">${s.count}</span><button class="btn btn-sm btn-r" onclick="deleteSegment('${s.id}')"><i class="ti ti-trash"></i></button></div></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">—</div>`}
    </div>
    <div class="card"><div style="font-weight:700;margin-bottom:8px">${t("sg_preview")} <span id="sg-count" class="badge bg"></span></div><div id="sg-list"></div></div></div>`;
  setTimeout(previewSegment,0);
}
function segmentPreset(k){
  ["sg-balance","sg-email","sg-phone","sg-optin"].forEach(id=>{const e=document.getElementById(id);if(e)e.checked=false;});
  ["sg-inactive","sg-new","sg-min","sg-max","sg-country","sg-points"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  if(k==="unpaid")document.getElementById("sg-balance").checked=true;
  if(k==="inactive")document.getElementById("sg-inactive").value=90;
  if(k==="best")document.getElementById("sg-min").value=1000;
  if(k==="new")document.getElementById("sg-new").value=30;
  previewSegment();
}
let _sgTimer=null;
function previewSegment(){clearTimeout(_sgTimer);_sgTimer=setTimeout(async()=>{
  try{
    const r=await api("POST","/segments/preview",{rules:segmentRulesFromForm()});
    document.getElementById("sg-count").textContent=r.count;
    document.getElementById("sg-list").innerHTML=r.clients.map(c=>`<div style="display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--b);font-size:13px">
      <div style="min-width:0"><b>${esc(c.name)}</b>${c.opted_out?` <span class="badge badge-gray">${t("sg_unsubscribed")}</span>`:""}<div style="font-size:11px;color:var(--muted)">${esc(c.email||"")}${c.email&&c.phone?" · ":""}${esc(c.phone||"")}</div></div>
      <div style="text-align:right;font-family:var(--mono);font-size:12px">${fmtUSD(c.invoiced)}${c.balance_due>0?`<div style="color:var(--amber)">${t("balance_label")} ${fmtUSD(c.balance_due)}</div>`:""}</div></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${t("sg_nobody")}</div>`;
  }catch(e){showToast(e.message,"error");}
},250);}
async function saveSegment(){
  const name=prompt(t("sg_prompt_name"));if(!name)return;
  try{const s=await api("POST","/segments",{name,rules:segmentRulesFromForm()});showToast(`${t("sg_saved_toast")} ${s.name} (${s.count})`);showMarketingTab("segments");}catch(e){showToast(e.message,"error");}
}
async function deleteSegment(id){if(!confirm(t("sg_confirm_delete")))return;try{await api("DELETE",`/segments/${id}`);showMarketingTab("segments");}catch(e){showToast(e.message,"error");}}
const CH_ICON={email:"ti-mail",sms:"ti-message-2",whatsapp:"ti-brand-whatsapp"};
async function renderCampaigns(box){
  const r=await api("GET","/campaigns");_mkt.status=r;
  const q=ch=>{const x=r.quotas[ch];return x.limit===-1?`${x.used} / ∞`:x.limit===0?"🔒":`${x.used} / ${x.limit}`;};
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px">
        <span><i class="ti ti-mail"></i> Email ${q("email")} ${r.email_enabled?"":`<span class="badge ba">${t("mkt_not_configured")}</span>`}</span>
        <span><i class="ti ti-brand-whatsapp"></i> WhatsApp ${q("whatsapp")}</span>
        <span><i class="ti ti-message-2"></i> SMS ${q("sms")} ${r.sms_enabled?"":`<span class="badge ba">${t("mkt_not_configured")}</span>`}</span></div>
      <button class="btn btn-g btn-sm" onclick="openCampaignModal()"><i class="ti ti-plus"></i> ${t("mkt_new_campaign")}</button></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>${t("th_name")}</th><th>${t("mkt_channel")}</th><th>${t("mkt_target")}</th><th>${t("th_status")}</th><th>${t("mkt_results")}</th><th></th></tr></thead><tbody>
    ${r.campaigns.map(c=>`<tr><td style="font-weight:600">${esc(c.name)}<div style="font-size:11px;color:var(--muted)">${fmtDate(c.created_at)}</div></td>
      <td><i class="ti ${CH_ICON[c.channel]}"></i> ${c.channel==="sms"?"SMS":c.channel==="whatsapp"?"WhatsApp":"Email"}</td>
      <td>${esc(c.segment_name||t("sg_all_clients"))} <span class="badge bb">${c.recipients_count}</span></td>
      <td>${c.status==="draft"?`<span class="badge badge-gray">${t("mkt_draft")}</span>`:c.status==="sending"?`<span class="badge ba">${t("mkt_sending")}</span>`:`<span class="badge bg">${t("mkt_sent")}</span>`}</td>
      <td style="font-size:12px">${c.status==="draft"?"—":`✓ ${c.sent_count}${c.failed_count?` · ✗ ${c.failed_count}`:""}${c.skipped_count?` · ⊘ ${c.skipped_count}`:""}`}</td>
      <td style="display:flex;gap:5px">${c.status==="draft"?`<button class="btn btn-sm btn-g" onclick="sendCampaign('${c.id}')"><i class="ti ti-send"></i> ${t("mkt_send")}</button><button class="btn btn-sm btn-r" onclick="deleteCampaign('${c.id}')"><i class="ti ti-trash"></i></button>`:`<button class="btn btn-sm btn-o" onclick="openCampaignDetail('${c.id}')">${t("mkt_details")}</button>`}</td></tr>`).join("")||`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("mkt_no_campaigns")}</td></tr>`}
    </tbody></table></div></div>`;
  if(r.campaigns.some(c=>c.status==="sending"))setTimeout(()=>{if(_mkt.tab==="campaigns"&&document.querySelector(".page.active")?.id==="page-campaigns")showMarketingTab("campaigns");},2500);
}
async function openCampaignModal(){
  let segs=[];try{segs=segmentsAllowed()?await api("GET","/segments"):[];}catch(_){}
  document.getElementById("cp-segment").innerHTML=`<option value="">${t("sg_all_clients")}</option>`+segs.map(s=>`<option value="${s.id}">${esc(s.name)} (${s.count})</option>`).join("");
  ["cp-name","cp-subject","cp-body"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("cp-channel").value="email";onCampaignChannel();
  document.getElementById("modal-campaign").style.display="flex";
}
function onCampaignChannel(){document.getElementById("cp-subject-box").style.display=document.getElementById("cp-channel").value==="email"?"":"none";}
function closeCampaignModal(){document.getElementById("modal-campaign").style.display="none";}
async function submitCampaign(){
  const ch=document.getElementById("cp-channel").value;
  const req=[document.getElementById("cp-name"),document.getElementById("cp-body")];if(ch==="email")req.push(document.getElementById("cp-subject"));
  const miss=req.filter(e=>!e.value.trim());if(miss.length){flagMissingFields(miss);return;}
  try{
    const c=await api("POST","/campaigns",{name:document.getElementById("cp-name").value,channel:ch,segment_id:document.getElementById("cp-segment").value||null,
      subject:document.getElementById("cp-subject").value||null,body:document.getElementById("cp-body").value});
    closeCampaignModal();showToast(`${t("mkt_saved")} — ${c.recipients_count} ${t("mkt_recipients")}`);showMarketingTab("campaigns");
  }catch(e){showToast(e.message,"error");}
}
async function sendCampaign(id){
  if(!confirm(t("mkt_confirm_send")))return;
  try{const c=await api("POST",`/campaigns/${id}/send`);showToast(c.channel==="whatsapp"?t("mkt_wa_ready"):t("mkt_sending_toast"));showMarketingTab("campaigns");if(c.channel==="whatsapp")openCampaignDetail(id);}
  catch(e){showToast(e.message,"error");}
}
async function deleteCampaign(id){if(!confirm(t("mkt_confirm_delete")))return;try{await api("DELETE",`/campaigns/${id}`);showMarketingTab("campaigns");}catch(e){showToast(e.message,"error");}}
async function openCampaignDetail(id){
  try{
    const c=await api("GET",`/campaigns/${id}`);
    document.getElementById("cpd-title").textContent=c.name;
    document.getElementById("cpd-body").innerHTML=`<div style="font-size:12px;color:var(--muted);white-space:pre-wrap;margin-bottom:10px;background:var(--bg);padding:10px;border-radius:8px">${esc(c.body)}</div>
      ${c.recipients.map(r=>`<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--b);font-size:13px">
        <div style="min-width:0"><b>${esc(r.name||"?")}</b><div style="font-size:11px;color:var(--muted)">${esc(r.address||"")}${r.error?` · <span style="color:var(--red)">${esc(r.error)}</span>`:""}</div></div>
        ${r.whatsapp_url?`<a class="btn btn-sm btn-g" href="${esc(r.whatsapp_url)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> ${t("mkt_send")}</a>`:
          `<span class="badge ${r.status==="sent"?"bg":r.status==="failed"?"br":"badge-gray"}">${t("mkt_rs_"+r.status)}</span>`}</div>`).join("")}`;
    document.getElementById("modal-campaign-detail").style.display="flex";
  }catch(e){showToast(e.message,"error");}
}
function closeCampaignDetail(){document.getElementById("modal-campaign-detail").style.display="none";}
async function renderLoyalty(box){
  const r=await api("GET","/loyalty/clients");const s=r.settings;
  box.innerHTML=`<div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">${t("loy_rules")}</div>
      <label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:8px"><input type="checkbox" id="loy-enabled" ${s.enabled?"checked":""}> ${t("loy_enabled")}</label>
      <div class="grid3"><div class="fgrp"><label class="fl">${t("loy_points_per_usd")}</label><input class="inp" type="number" min="0.01" step="0.01" id="loy-ppu" value="${s.points_per_usd}"></div>
        <div class="fgrp"><label class="fl">${t("loy_reward_points")}</label><input class="inp" type="number" min="1" id="loy-rp" value="${s.reward_points}"></div>
        <div class="fgrp"><label class="fl">${t("loy_reward_value")}</label><input class="inp" type="number" min="0.01" step="0.01" id="loy-rv" value="${s.reward_value_usd}"></div></div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${t("loy_example").replace("{ppu}",s.points_per_usd).replace("{rp}",s.reward_points).replace("{rv}",fmtUSD(s.reward_value_usd))}</div>
      <button class="btn btn-g btn-sm" onclick="saveLoyalty()"><i class="ti ti-check"></i> ${t("btn_save")}</button></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Client</th><th style="text-align:right">${t("loy_paid")}</th><th style="text-align:right">Points</th><th>${t("loy_vouchers")}</th><th></th></tr></thead><tbody>
    ${r.clients.map(c=>`<tr><td style="font-weight:600">${esc(c.name)}</td><td style="text-align:right;font-family:var(--mono)">${fmtUSD(c.paid_usd)}</td><td style="text-align:right;font-family:var(--mono);font-weight:700;color:var(--green)">${c.points}</td>
      <td style="font-size:11px">${c.vouchers.map(v=>`<span class="badge ${v.used?"badge-gray":"bg"}" style="margin:1px">${esc(v.code)} ${fmtUSD(v.value_usd)}${v.used?" ✓":""}</span>`).join(" ")||"—"}</td>
      <td>${c.rewards_available>0?`<button class="btn btn-sm btn-g" onclick="redeemPoints('${c.id}',${c.points},${s.reward_points})"><i class="ti ti-gift"></i> ${t("loy_redeem")}</button>`:""}</td></tr>`).join("")}
    </tbody></table></div></div>`;
}
async function saveLoyalty(){
  try{await api("PUT","/loyalty/settings",{enabled:document.getElementById("loy-enabled").checked,points_per_usd:parseFloat(document.getElementById("loy-ppu").value),
    reward_points:parseInt(document.getElementById("loy-rp").value),reward_value_usd:parseFloat(document.getElementById("loy-rv").value)});showToast(t("toast_updated"));showMarketingTab("loyalty");}
  catch(e){showToast(e.message,"error");}
}
async function redeemPoints(cid,points,step){
  const max=Math.floor(points/step)*step;
  const v=prompt(t("loy_prompt_points").replace("{max}",max).replace("{step}",step),max);if(!v)return;
  try{const r=await api("POST",`/loyalty/clients/${cid}/redeem`,{points:parseInt(v)});alert(`${t("loy_voucher_created")}\n\n${r.code} — ${fmtUSD(r.value_usd)}\n${r.client}`);showMarketingTab("loyalty");}
  catch(e){showToast(e.message,"error");}
}
async function applyVoucher(invId){
  const code=prompt(t("loy_prompt_code"));if(!code)return;
  try{const r=await api("POST",`/invoices/${invId}/voucher`,{code:code.trim()});showToast(`${t("loy_voucher_applied")} ${r.code} — ${r.credit_note}`);openInvoiceDetail(invId);loadInvoices();}
  catch(e){showToast(e.message,"error");}
}
async function loadPaymentNotices(){
  const box=document.getElementById("notices-box");if(!box)return;
  try{
    const list=(await api("GET","/payment-notices")).filter(n=>n.status==="pending");
    if(!list.length){box.style.display="none";box.innerHTML="";return;}
    box.style.display="block";
    box.innerHTML=`<div class="alert-bar" style="flex-direction:column;align-items:stretch;gap:8px;border-color:rgba(59,130,246,.4);background:rgba(59,130,246,.08)"><div><i class="ti ti-message-dollar"></i> <b>${list.length} ${t("notice_title")}</b></div>
      ${list.map(n=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px"><span><b>${esc(n.client_name)}</b> — ${esc(n.invoice_number)} · ${fmtMoney(n.amount,n.currency)} · ${t("pay_method_"+n.method)}${n.reference?` · ${t("fld_reference")} ${esc(n.reference)}`:""}${n.note?` · ${esc(n.note)}`:""}</span>
        <span style="display:flex;gap:6px"><button class="btn btn-sm btn-g" onclick="decideNotice('${n.id}','confirm')"><i class="ti ti-check"></i> ${t("notice_confirm")}</button><button class="btn btn-sm btn-r" onclick="decideNotice('${n.id}','reject')">${t("notice_reject")}</button></span></div>`).join("")}</div>`;
  }catch(_){box.style.display="none";}
}
async function decideNotice(id,action){
  if(action==="reject"&&!confirm(t("notice_confirm_reject")))return;
  try{const r=await api("POST",`/payment-notices/${id}/${action}`);showToast(action==="confirm"?`${t("notice_confirmed")} ${r.number}`:t("notice_rejected"));loadPaymentNotices();loadInvoices();}
  catch(e){showToast(e.message,"error");}
}
async function renderPortalExtras(token){
  const box=document.getElementById("portal-extras");if(!box)return null;
  try{
    const r=await fetch(`${API_BASE}/portal/${token}/summary`);const s=await r.json();if(!r.ok)return null;
    if(!s.enriched){box.innerHTML="";return s;}
    box.innerHTML=`<div class="kgrid" style="margin-bottom:14px">
      <div class="kpi"><div class="kl">${t("portal_invoiced")}</div><div class="kv" style="font-size:17px">${fmtUSD(s.invoiced_usd)}</div></div>
      <div class="kpi"><div class="kl">${t("paid_label")}</div><div class="kv" style="font-size:17px;color:var(--green)">${fmtUSD(s.paid_usd)}</div></div>
      <div class="kpi"><div class="kl">${t("balance_label")}</div><div class="kv" style="font-size:17px;color:${s.balance_usd>0?"var(--amber)":"var(--green)"}">${fmtUSD(s.balance_usd)}</div></div></div>
      ${s.loyalty?`<div class="card2" style="margin-bottom:14px"><b><i class="ti ti-gift"></i> ${t("portal_loyalty")}</b> — <span style="color:var(--green);font-weight:800">${s.loyalty.points} points</span>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">${t("portal_loyalty_rule").replace("{rp}",s.loyalty.reward_points).replace("{rv}",fmtUSD(s.loyalty.reward_value_usd))}</div>
        ${s.loyalty.vouchers.length?`<div style="margin-top:6px">${s.loyalty.vouchers.map(v=>`<span class="badge bg" style="margin:2px">${esc(v.code)} — ${fmtUSD(v.value_usd)}</span>`).join("")}</div>`:""}</div>`:""}`;
    return s;
  }catch(_){return null;}
}
let _portalNoticeInv=null;
function openPortalNotice(invId,number,balance,currency){
  _portalNoticeInv=invId;
  document.getElementById("pn-title").textContent=number;
  document.getElementById("pn-amount").value=balance;document.getElementById("pn-currency").textContent=currency;
  document.getElementById("pn-reference").value="";document.getElementById("pn-note").value="";
  document.getElementById("modal-portal-notice").style.display="flex";
}
function closePortalNotice(){document.getElementById("modal-portal-notice").style.display="none";}
async function submitPortalNotice(){
  const amount=parseFloat(document.getElementById("pn-amount").value);
  if(!(amount>0)){flagMissingFields([document.getElementById("pn-amount")]);return;}
  try{
    const r=await fetch(`${API_BASE}/portal/${_portalToken}/payment-notices`,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({invoice_id:_portalNoticeInv,amount,method:document.getElementById("pn-method").value,reference:document.getElementById("pn-reference").value||null,note:document.getElementById("pn-note").value||null})});
    const d=await r.json();if(!r.ok)throw new Error(typeof d.detail==="string"?d.detail:t("server_error"));
    closePortalNotice();showToast(t("portal_notice_sent"));checkPortalView();
  }catch(e){showToast(e.message,"error");}
}
async function portalInvoiceDoc(invId){
  try{const r=await fetch(`${API_BASE}/portal/${_portalToken}/invoices/${invId}/document`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"Erreur");renderDocument(d);}
  catch(e){showToast(e.message,"error");}
}
