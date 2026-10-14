const REM_OFFSETS=[-7,-3,-1,0,1,3,5,7,10,15,20,30,45,60];
let _remAuto=null;
function remOffsetLabel(o){return o<0?t("rem_before").replace("{n}",-o):o===0?t("rem_due_day"):t("rem_after").replace("{n}",o);}
async function loadReminderAutomation(){
  const box=document.getElementById("rem-auto-box");if(!box)return;
  try{_remAuto=await api("GET","/reminders/automation");}
  catch(e){box.innerHTML=`<div style="font-size:12px;color:var(--amber)"><i class="ti ti-lock"></i> ${esc(e.message)}</div>`;return;}
  renderReminderAutomation();loadWhatsappQueue();
}
function renderReminderAutomation(){
  const a=_remAuto;const box=document.getElementById("rem-auto-box");
  const chLabel={email:t("rem_ch_email"),sms:"SMS",whatsapp:"WhatsApp"};
  box.innerHTML=`<label style="display:flex;align-items:center;gap:10px;font-weight:700;cursor:pointer;margin-bottom:10px"><input type="checkbox" id="rem-auto-enabled" ${a.enabled?"checked":""} style="width:20px;height:20px"> ${t("rem_auto_enable")}</label>
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px">${t("rem_auto_desc")}</div>
    <div id="rem-steps">${a.steps.map((s,i)=>remStepRow(s,i)).join("")}</div>
    <button class="btn btn-o btn-sm" style="margin:6px 0 12px" onclick="addRemStep()"><i class="ti ti-plus"></i> ${t("rem_add_step")}</button>
    ${!a.email_configured?`<div style="font-size:11px;color:var(--amber);margin-bottom:4px">⚠️ ${t("rem_email_not_configured")}</div>`:""}
    ${a.sms_allowed&&!a.sms_configured?`<div style="font-size:11px;color:var(--amber);margin-bottom:4px">⚠️ ${t("rem_sms_not_configured")}</div>`:""}
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-g btn-sm" onclick="saveReminderAutomation()"><i class="ti ti-check"></i> ${t("btn_save")}</button>
      <button class="btn btn-o btn-sm" onclick="runReminderAutomation()"><i class="ti ti-player-play"></i> ${t("rem_run_now")}</button>
      <span style="font-size:12px;color:var(--muted);align-self:center">${t("rem_sent_30d").replace("{n}",a.sent_last_30d)}</span></div>
    <div style="font-weight:700;font-size:13px;margin:16px 0 6px">${t("rem_upcoming")}</div>
    ${a.upcoming.length?a.upcoming.map(u=>`<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--b);font-size:13px"><span style="font-family:var(--mono);min-width:86px">${fmtDate(u.date)}</span><span style="flex:1">${esc(u.client)} · <span style="font-family:var(--mono);color:var(--blue)">${esc(u.number)}</span> · ${fmtMoney(u.balance,u.currency)}</span><span class="badge bb">${remOffsetLabel(u.offset_days)}</span><span style="font-size:11px;color:var(--muted)">${u.channels.map(c=>chLabel[c]).join(" + ")}</span></div>`).join(""):`<div style="font-size:12px;color:var(--muted)">${t("rem_no_upcoming")}</div>`}`;
  document.querySelectorAll("#rem-steps select, #rem-steps input").forEach(el=>el.addEventListener("change",collectRemSteps));
}
function remStepRow(s,i){
  const smsOk=_remAuto.sms_allowed;
  return `<div class="rem-step" data-i="${i}" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px;border:1px solid var(--b);border-radius:10px;margin-bottom:6px">
    <select class="inp rem-off" style="width:auto">${REM_OFFSETS.map(o=>`<option value="${o}" ${o===s.offset_days?"selected":""}>${remOffsetLabel(o)}</option>`).join("")}</select>
    <label style="display:flex;gap:4px;align-items:center;font-size:13px"><input type="checkbox" class="rem-ch" value="email" ${s.channels.includes("email")?"checked":""}> ${t("rem_ch_email")}</label>
    <label style="display:flex;gap:4px;align-items:center;font-size:13px;${smsOk?"":"opacity:.5"}" title="${smsOk?"":t("rem_sms_locked")}"><input type="checkbox" class="rem-ch" value="sms" ${s.channels.includes("sms")?"checked":""} ${smsOk?"":"disabled"}> SMS${smsOk?"":" 🔒"}</label>
    <label style="display:flex;gap:4px;align-items:center;font-size:13px"><input type="checkbox" class="rem-ch" value="whatsapp" ${s.channels.includes("whatsapp")?"checked":""}> WhatsApp</label>
    <button class="btn btn-o btn-sm" style="margin-left:auto;padding:2px 8px" onclick="removeRemStep(${i})" aria-label="×"><i class="ti ti-x"></i></button></div>`;
}
function collectRemSteps(){
  _remAuto.steps=[...document.querySelectorAll("#rem-steps .rem-step")].map(r=>({offset_days:parseInt(r.querySelector(".rem-off").value),channels:[...r.querySelectorAll(".rem-ch:checked")].map(c=>c.value)}));
  _remAuto.enabled=document.getElementById("rem-auto-enabled").checked;
}
function addRemStep(){collectRemSteps();const used=_remAuto.steps.map(s=>s.offset_days);const off=REM_OFFSETS.find(o=>o>0&&!used.includes(o))??30;_remAuto.steps.push({offset_days:off,channels:["email"]});renderReminderAutomation();}
function removeRemStep(i){collectRemSteps();_remAuto.steps.splice(i,1);renderReminderAutomation();}
async function saveReminderAutomation(){
  collectRemSteps();
  try{await api("PUT","/reminders/automation",{enabled:_remAuto.enabled,steps:_remAuto.steps});showToast(t("rem_saved"));loadReminderAutomation();}
  catch(e){showToast(e.message,"error");}
}
async function runReminderAutomation(){
  try{const r=await api("POST","/reminders/automation/run");showToast(t("rem_run_result").replace("{sent}",r.sent).replace("{wa}",r.whatsapp));loadReminderAutomation();loadReminders();}
  catch(e){showToast(e.message,"error");}
}
async function loadWhatsappQueue(){
  const box=document.getElementById("rem-wa-queue");if(!box)return;
  try{
    const q=await api("GET","/reminders/whatsapp-queue");
    document.getElementById("rem-wa-card").style.display=q.length?"block":"none";
    box.innerHTML=q.map(x=>`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--b);font-size:13px">
      <span style="flex:1;min-width:180px"><b>${esc(x.client)}</b> · <span style="font-family:var(--mono)">${esc(x.number)}</span> · ${remOffsetLabel(x.offset_days)}</span>
      <a class="btn btn-g btn-sm" href="${esc(x.url)}" target="_blank" rel="noopener" onclick="setTimeout(()=>markWhatsappDone('${x.id}'),800)"><i class="ti ti-brand-whatsapp"></i> ${t("rem_wa_send")}</a>
      <button class="btn btn-o btn-sm" onclick="markWhatsappDone('${x.id}')">${t("rem_wa_done")}</button></div>`).join("");
  }catch(_){}
}
async function markWhatsappDone(id){try{await api("POST",`/reminders/whatsapp-queue/${id}/done`);loadWhatsappQueue();}catch(e){showToast(e.message,"error");}}
async function toggleClientReminders(id,enabled){
  try{await api("PATCH",`/clients/${id}/reminders`,{enabled});showToast(enabled?t("rem_client_on"):t("rem_client_off"));loadClients();}catch(e){showToast(e.message,"error");}
}
