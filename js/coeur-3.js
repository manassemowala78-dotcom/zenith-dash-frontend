function closeNewConvModal(){document.getElementById("modal-new-conv").style.display="none";}
function setConvMode(mode){
  _convMode=mode;_groupSelected=[];
  document.getElementById("conv-mode-direct").className=mode==="direct"?"btn btn-sm btn-g":"btn btn-sm btn-o";
  document.getElementById("conv-mode-group").className=mode==="group"?"btn btn-sm btn-g":"btn btn-sm btn-o";
  document.getElementById("group-name-field").style.display=mode==="group"?"block":"none";
  document.getElementById("group-selected-list").style.display=mode==="group"?"flex":"none";
  document.getElementById("create-group-btn").style.display=mode==="group"?"block":"none";
  document.getElementById("group-name-input").value="";
  renderGroupSelected();
  document.getElementById("user-search-results").innerHTML="";
}
function renderGroupSelected(){
  document.getElementById("group-selected-list").innerHTML=_groupSelected.map(u=>
    `<span class="badge bg" style="display:inline-flex;align-items:center;gap:4px">${esc(u.name)} <i class="ti ti-x" style="cursor:pointer" onclick="toggleGroupUser('${u.id}','${escJs(u.name)}')"></i></span>`).join("");
}
function toggleGroupUser(id,name){
  const idx=_groupSelected.findIndex(u=>u.id===id);
  if(idx>=0) _groupSelected.splice(idx,1);
  else _groupSelected.push({id,name});
  renderGroupSelected();
}
let _searchDebounce=null;
function searchUsersDebounced(){
  clearTimeout(_searchDebounce);
  _searchDebounce=setTimeout(searchUsers,400);
}
async function searchUsers(){
  const q=document.getElementById("user-search-input").value.trim();
  const box=document.getElementById("user-search-results");
  if(q.length<2){box.innerHTML="";return;}
  box.innerHTML=`<div style="text-align:center;color:var(--muted);padding:10px">${t("searching")}</div>`;
  try{
    const results=await api("GET",`/messaging/search-users?q=${encodeURIComponent(q)}`);
    if(!results.length){box.innerHTML=`<div style="text-align:center;color:var(--muted);padding:10px">${t("no_results")}</div>`;return;}
    if(_convMode==="group"){
      box.innerHTML=results.map(u=>{
        const checked=_groupSelected.some(s=>s.id===u.id);
        return `<div onclick="toggleGroupUser('${u.id}','${escJs(u.name)}')" style="padding:10px;cursor:pointer;border-bottom:1px solid var(--b);display:flex;justify-content:space-between;align-items:center;${checked?'background:var(--c2)':''}">
          <div><b style="font-size:13px">${esc(u.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(u.email)}</div></div>
          ${checked?'<i class="ti ti-check" style="color:var(--green)"></i>':''}
        </div>`;
      }).join("");
    }else{
      box.innerHTML=results.map(u=>`<div onclick="startConversationWith('${u.id}','${escJs(u.name)}')" style="padding:10px;cursor:pointer;border-bottom:1px solid var(--b);display:flex;justify-content:space-between">
        <div><b style="font-size:13px">${esc(u.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(u.email)}</div></div>
        ${u.online?`<span style="color:var(--green);font-size:11px">● ${t("online_now")}</span>`:''}
      </div>`).join("");
    }
  }catch(e){box.innerHTML=`<div style="color:var(--red);padding:10px">${esc(e.message)}</div>`;}
}
async function startConversationWith(userId,name){
  try{
    const conv=await api("POST","/messaging/conversations",{tenant_ids:[userId]});
    closeNewConvModal();
    await loadConversations();
    openConversation(conv.id,name);
  }catch(e){showToast(e.message,"error");}
}
async function submitGroupConversation(){
  const name=document.getElementById("group-name-input").value.trim();
  if(!name){showToast(t("group_name_required"),"error");return;}
  if(_groupSelected.length<2){showToast(t("group_min_2"),"error");return;}
  try{
    const conv=await api("POST","/messaging/conversations",{tenant_ids:_groupSelected.map(u=>u.id),is_group:true,name});
    closeNewConvModal();
    await loadConversations();
    openConversation(conv.id,name);
  }catch(e){showToast(e.message,"error");}
}

// ── NOTIFICATIONS PUSH ────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String){
  const padding="=".repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
function pushSupported(){return "serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;}
async function getSwRegistration(){
  await navigator.serviceWorker.register("/sw.js");
  return await navigator.serviceWorker.ready;
}
function sameApplicationKey(current,expected){
  if(!current)return true;
  const a=new Uint8Array(current);
  if(a.length!==expected.length)return false;
  for(let i=0;i<a.length;i++) if(a[i]!==expected[i]) return false;
  return true;
}
async function subscribeCurrentDevice(reg){
  const vapid=await api("GET","/push/vapid-public-key");
  if(!vapid.enabled||!vapid.public_key) throw new Error(t("push_not_configured"));
  const key=urlBase64ToUint8Array(vapid.public_key);
  let sub=await reg.pushManager.getSubscription();
  if(sub&&!sameApplicationKey(sub.options&&sub.options.applicationServerKey,key)){await sub.unsubscribe();sub=null;}
  if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  const raw=sub.toJSON();
  await api("POST","/push/subscribe",{endpoint:raw.endpoint,p256dh_key:raw.keys.p256dh,auth_key:raw.keys.auth});
  return sub;
}
async function refreshPushButtonState(){
  const btn=document.getElementById("push-toggle-btn");if(!btn)return;
  const testBtn=document.getElementById("push-test-btn");
  const hint=document.getElementById("push-status-hint");
  if(!pushSupported()){btn.textContent=t("not_supported_browser");btn.disabled=true;if(testBtn)testBtn.style.display="none";return;}
  try{
    const reg=await navigator.serviceWorker.getRegistration();
    const sub=reg?await reg.pushManager.getSubscription():null;
    const active=!!sub&&Notification.permission==="granted";
    btn.disabled=false;
    btn.textContent=active?t("btn_deactivate"):t("btn_activate");
    btn.className=active?"btn btn-o btn-sm":"btn btn-g btn-sm";
    if(testBtn) testBtn.style.display=active?"inline-flex":"none";
    if(hint){
      hint.style.display=Notification.permission==="denied"?"block":"none";
      hint.textContent=t("push_blocked_help");
    }
  }catch(e){}
}
async function togglePushNotifications(){
  if(!pushSupported()){showToast(t("not_supported_browser"),"error");return;}
  const btn=document.getElementById("push-toggle-btn");
  if(btn) btn.disabled=true;
  try{
    const existingReg=await navigator.serviceWorker.getRegistration();
    const existing=existingReg?await existingReg.pushManager.getSubscription():null;
    if(existing&&Notification.permission==="granted"){
      const endpoint=existing.endpoint;
      await existing.unsubscribe();
      try{await api("POST","/push/unsubscribe",{endpoint});}catch(_){}
      showToast(t("push_disabled"));
      return;
    }
    if(Notification.permission==="denied") throw new Error(t("push_blocked_help"));
    const perm=Notification.permission==="granted"?"granted":await Notification.requestPermission();
    if(perm!=="granted") throw new Error(t("push_permission_denied"));
    const reg=await getSwRegistration();
    await subscribeCurrentDevice(reg);
    showToast(t("push_enabled"));
  }catch(e){
    showToast(e&&e.message?e.message:t("push_activation_failed"),"error");
  }finally{
    if(btn) btn.disabled=false;
    refreshPushButtonState();
  }
}
async function currentPushSubscription(){
  const reg=await navigator.serviceWorker.getRegistration();
  return reg?await reg.pushManager.getSubscription():null;
}
async function freshSubscribe(reg){
  const old=await reg.pushManager.getSubscription();
  if(old){
    const endpoint=old.endpoint;
    try{await old.unsubscribe();}catch(_){}
    try{await api("POST","/push/unsubscribe",{endpoint});}catch(_){}
  }
  return subscribeCurrentDevice(reg);
}
async function testPushNotification(){
  const btn=document.getElementById("push-test-btn");
  if(btn) btn.disabled=true;
  try{
    const reg=await getSwRegistration();
    let sub=await reg.pushManager.getSubscription();
    let r=await api("POST","/push/test",{endpoint:sub?.endpoint||null});
    if(r.this_device!=="sent"){
      await freshSubscribe(reg);
      sub=await reg.pushManager.getSubscription();
      r=await api("POST","/push/test",{endpoint:sub?.endpoint||null});
      if(r.this_device==="sent"){showToast(t("push_test_repaired"));return;}
    }
    if(r.this_device==="sent") showToast(t("push_test_sent"));
    else showToast(`${t("push_test_failed")} ${(r.errors||[])[0]||t("push_device_not_reached")}`,"error");
  }catch(e){showToast(e.message,"error");}
  finally{if(btn) btn.disabled=false;refreshPushButtonState();}
}
async function syncPushSubscription(){
  if(!pushSupported()||Notification.permission!=="granted"||!State.token)return;
  try{
    const reg=await getSwRegistration();
    const sub=await reg.pushManager.getSubscription();
    if(!sub)return;
    const status=await api("GET",`/push/devices?endpoint=${encodeURIComponent(sub.endpoint)}`);
    if(status.this_device_registered) await subscribeCurrentDevice(reg);
    else await freshSubscribe(reg);
  }catch(e){console.warn("Synchronisation push impossible :",e);}
}
let _lastDiagnostics="";
async function runDiagnostics(){
  const out=document.getElementById("diag-output");
  const copyBtn=document.getElementById("diag-copy-btn");
  if(!out)return;
  out.style.display="block";out.textContent=t("diag_running");
  const lines=[];
  const add=(ok,label,value)=>lines.push(`${ok===true?"✅":ok===false?"❌":"⚠️"} ${label} : ${value}`);
  add(true,t("diag_app_version"),`${APP_BUILD} (${ZD_ENV})`);
  add(true,t("diag_server_url"),API_BASE.replace(/^https?:\/\//,""));
  let info=null;
  try{info=await api("GET","/system/info");add(true,t("diag_server"),`${info.version} · ${info.env}`);}
  catch(e){add(false,t("diag_server"),e.message);}
  if(info){
    const skew=Math.round((Date.now()-parseServerDate(info.server_time).getTime())/1000);
    add(Math.abs(skew)<120?true:null,t("diag_clock"),`${skew>0?"+":""}${skew} s`);
    add(info.storage_enabled,t("diag_storage"),info.storage_enabled?t("diag_yes"):t("diag_no"));
    add(info.push_enabled,t("diag_push_server"),info.push_enabled?t("diag_yes"):t("diag_no"));
  }
  add(true,t("diag_device"),`${/Android/i.test(navigator.userAgent)?"Android":/iPhone|iPad/i.test(navigator.userAgent)?"iOS":/Windows/i.test(navigator.userAgent)?"Windows":/Mac/i.test(navigator.userAgent)?"Mac":"?"} · ${window.innerWidth}×${window.innerHeight} · ${navigator.language}`);
  add(!!(_ws&&_ws.readyState===1),t("diag_realtime"),_ws&&_ws.readyState===1?t("diag_connected"):t("diag_disconnected"));
  if(!pushSupported()){add(false,t("diag_push_support"),t("diag_no"));}
  else{
    add(Notification.permission==="granted"?true:Notification.permission==="denied"?false:null,t("diag_push_permission"),Notification.permission);
    try{
      const reg=await navigator.serviceWorker.getRegistration();
      add(!!reg?.active,t("diag_sw"),reg?.active?t("diag_active"):t("diag_missing"));
      const sub=reg?await reg.pushManager.getSubscription():null;
      add(!!sub,t("diag_push_local"),sub?t("diag_yes"):t("diag_no"));
      if(sub){
        const st=await api("GET",`/push/devices?endpoint=${encodeURIComponent(sub.endpoint)}`);
        add(st.this_device_registered,t("diag_push_registered"),`${st.this_device_registered?t("diag_yes"):t("diag_no")} (${st.count} ${t("diag_devices")})`);
        if(info?.vapid_public_key){
          const match=sameApplicationKey(sub.options&&sub.options.applicationServerKey,urlBase64ToUint8Array(info.vapid_public_key));
          add(match,t("diag_push_key"),match?t("diag_ok"):t("diag_mismatch"));
        }
      }
    }catch(e){add(false,t("diag_push_local"),e.message);}
  }
  const wp=State.tenant?.chat_wallpaper||"default";
  if(wp.startsWith("custom:")){
    const ok=await preloadImage(wp.slice(7));
    add(ok,t("diag_wallpaper_default"),ok?t("diag_photo_ok"):t("diag_photo_fail"));
  }else add(true,t("diag_wallpaper_default"),wp);
  const custom=_conversations.filter(c=>c.theme?.wallpaper);
  if(custom.length){
    let bad=0;
    for(const c of custom){if(c.theme.wallpaper.startsWith("custom:")&&!(await preloadImage(c.theme.wallpaper.slice(7))))bad++;}
    add(bad===0,t("diag_wallpaper_convs"),`${custom.length} · ${bad?`${bad} ${t("diag_photo_fail")}`:t("diag_ok")}`);
  }
  _lastDiagnostics=`Zenith Dash — ${new Date().toLocaleString()}\n`+lines.join("\n");
  out.textContent=lines.join("\n");
  if(copyBtn) copyBtn.style.display="inline-flex";
}
async function copyDiagnostics(){
  try{await navigator.clipboard.writeText(_lastDiagnostics);showToast(t("diag_copied"));}
  catch(_){
    const ta=document.createElement("textarea");ta.value=_lastDiagnostics;document.body.appendChild(ta);ta.select();
    try{document.execCommand("copy");showToast(t("diag_copied"));}catch(e){showToast(e.message,"error");}
    ta.remove();
  }
}
function consumeDeepLink(){
  const params=new URLSearchParams(window.location.search);
  const page=params.get("p"),conv=params.get("c"),action=params.get("a");
  if(page||conv||action||params.get("source")){
    params.delete("p");params.delete("c");params.delete("a");params.delete("source");
    const rest=params.toString();
    window.history.replaceState({},"",window.location.pathname+(rest?`?${rest}`:""));
  }
  return {page,conv,action};
}
const DEEP_LINK_PAGES=["messaging","profile","notifications","announcements","dashboard","invoices","clients","expenses","stock"];
async function openConversationById(convId){
  navigate("messaging");
  if(!_conversations.find(c=>c.id===convId)){
    try{_conversations=await api("GET","/messaging/conversations?include_archived=true");renderConvList();}catch(_){}
  }
  const conv=_conversations.find(c=>c.id===convId);
  if(conv) openConversation(conv.id,conv.name);
}
async function openDeepLink(page,conv,action){
  if(page==="messaging"&&conv){await openConversationById(conv);return true;}
  const quick=QUICK_ACTIONS.find(a=>a.page===page);
  if(action==="new"&&quick&&quickActionAllowed(quick)){runQuickAction(QUICK_ACTIONS.indexOf(quick));return true;}
  if(page==="admin"&&State.tenant?.is_creator){navigate("admin");return true;}
  if(page&&(DEEP_LINK_PAGES.includes(page)||(/^[a-z_]+$/.test(page)&&document.getElementById(`page-${page}`)))){navigate(page);return true;}
  return false;
}
if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("message",e=>{
    if(!e.data||e.data.type!=="open-url"||!State.token)return;
    try{
      const u=new URL(e.data.url);
      openDeepLink(u.searchParams.get("p"),u.searchParams.get("c"));
    }catch(_){}
  });
}
function isUserActivelyViewing(){return document.visibilityState==="visible"&&document.hasFocus();}
function sendWsVisibility(visible){
  if(_ws&&_ws.readyState===1) _ws.send(JSON.stringify({type:"visibility",visible:visible===undefined?isUserActivelyViewing():visible}));
}
document.addEventListener("visibilitychange",()=>sendWsVisibility());
window.addEventListener("focus",()=>sendWsVisibility());
window.addEventListener("blur",()=>sendWsVisibility(false));
window.addEventListener("pagehide",()=>sendWsVisibility(false));

// ── INTÉGRATIONS / WEBHOOKS ─────────────────────────────────────────────────────
function WEBHOOK_EVENT_LABELS_FN(){return{"invoice.paid":t("wh_invoice_paid"),"invoice.created":t("wh_invoice_created"),"client.created":t("wh_client_created"),"subscription.activated":t("wh_subscription_activated"),"stock.low":t("wh_stock_low")};}
async function loadWebhooks(){
  const container=document.getElementById("webhooks-list");if(!container)return;
  const limits=State.tenant?.limits||{};
  if(!limits.api){showUpgradeBanner(container,'api');return;}
  try{
    const hooks=await api("GET","/webhooks/");
    if(!hooks.length){container.innerHTML=`<div class="card" style="text-align:center;padding:32px;color:var(--muted)"><i class="ti ti-plug" style="font-size:40px;display:block;margin-bottom:12px"></i>${t("no_webhooks")}</div>`;return;}
    container.innerHTML=hooks.map(h=>`<div class="card" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div>
          <div style="font-weight:700;font-size:13px">${esc(WEBHOOK_EVENT_LABELS_FN()[h.event]||h.event)}</div>
          <div style="font-family:var(--mono);font-size:11px;color:var(--muted);word-break:break-all">${esc(h.url)}</div>
          <div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:4px">
            ${h.last_fired_at?`${t("last_call")} : ${fmtDate(h.last_fired_at)} — statut ${h.last_status||"?"}`:t("never_triggered")}
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge ${h.is_active?'bg':'badge-gray'}">${h.is_active?t("st_webhook_active"):t("st_webhook_disabled")}</span>
          <button class="btn btn-sm btn-o" onclick="toggleWebhook('${h.id}')"><i class="ti ti-power"></i></button>
          <button class="btn btn-sm btn-r" onclick="deleteWebhook('${h.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>`).join("");
  }catch(e){container.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;}
}
function openWebhookModal(){document.getElementById("modal-webhook").style.display="flex";}
function closeWebhookModal(){document.getElementById("modal-webhook").style.display="none";document.getElementById("wh-url").value="";}
async function submitWebhook(){
  const url=document.getElementById("wh-url").value.trim();
  const event=document.getElementById("wh-event").value;
  if(!url){showToast("URL obligatoire","error");return;}
  if(!url.startsWith("https://")){showToast("L'URL doit être en HTTPS","error");return;}
  try{
    const r=await api("POST","/webhooks/",{url,event});
    closeWebhookModal();
    document.getElementById("webhook-secret-box").textContent=r.secret;
    document.getElementById("modal-webhook-secret").style.display="flex";
    loadWebhooks();
  }catch(e){showToast(e.message,"error");}
}
function closeWebhookSecretModal(){document.getElementById("modal-webhook-secret").style.display="none";}
async function toggleWebhook(id){try{await api("PATCH",`/webhooks/${id}/toggle`);loadWebhooks();}catch(e){showToast(e.message,"error");}}
async function deleteWebhook(id){
  if(!confirm("Supprimer ce webhook ?"))return;
  try{await api("DELETE",`/webhooks/${id}`);showToast("Webhook supprimé ✓");loadWebhooks();}
  catch(e){showToast(e.message,"error");}
}

// ── PROFIL ────────────────────────────────────────────────────────────────────
async function loadProfile(){
  loadSecurityCard();
  loadBillingSettings();
  renderInstallCard();
  try{
    const p=await api("GET","/profile/");
    refreshPushButtonState();
    applyAvatarPreview(p.avatar_url,p.name);
    if(State.tenant&&!_pendingDefaultWallpaper){State.tenant.chat_wallpaper=p.chat_wallpaper||"default";State.tenant.bubble_mine=p.bubble_mine||null;State.tenant.bubble_theirs=p.bubble_theirs||null;}
    renderDefaultThemeSettings();
    loadBlockedContacts();
    const setVal=(id,v)=>{const e=document.getElementById(id);if(e&&v!=null)e.value=v;};
    setVal("prof-name",p.name); setVal("prof-company",p.company_name);
    setVal("prof-phone",p.phone); setVal("prof-country",p.country);
    setVal("prof-address",p.address); setVal("prof-currency",p.currency);
    setVal("prof-tax",p.tax_number);
    fillProfileBirth(p);loadPrivacyCard();renderLegalLinks();
    setVal("bank-name",p.bank?.bank_name); setVal("bank-account",p.bank?.bank_account);
    setVal("bank-swift",p.bank?.bank_swift); setVal("bank-iban",p.bank?.bank_iban);
    if(p.referral_code){
      set("referral-code-display",p.referral_code);
      const link=`${window.location.origin}${window.location.pathname}?ref=${p.referral_code}`;
      _shareTexts.referral=(typeof abTr==="function"?abTr("ab_ref_share",{c:p.referral_code,l:link}):link);
      _referralLink=link;
    }
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}
let _referralLink=null;
function copyReferralLink(){
  if(!_referralLink){showToast("Lien pas encore prêt","error");return;}
  navigator.clipboard.writeText(_referralLink).then(()=>showToast("Lien copié ✓"));
}
async function saveProfile(){
  const btn=document.getElementById("save-profile-btn");
  const originalText=btn?.innerHTML;
  if(btn){btn.disabled=true;btn.innerHTML=`<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i> ${t("saving_label")}`;}
  try{
    await api("PATCH","/profile/",{
      name:document.getElementById("prof-name")?.value||undefined,
      company_name:document.getElementById("prof-company")?.value||undefined,
      phone:document.getElementById("prof-phone")?.value||undefined,
      country:document.getElementById("prof-country")?.value||undefined,
      address:document.getElementById("prof-address")?.value||undefined,
      currency:document.getElementById("prof-currency")?.value||undefined,
      tax_number:document.getElementById("prof-tax")?.value||undefined,
      birth_date:profileBirthValue()});
    showToast("Profil mis à jour ✓");
  }catch(e){showToast(e.message,"error");}
  finally{if(btn){btn.disabled=false;btn.innerHTML=originalText;}}
}
async function saveBank(){
  const name=document.getElementById("bank-name")?.value;
  const account=document.getElementById("bank-account")?.value;
  if(!name||!account){showToast("Nom et numéro de compte obligatoires","error");return;}
  try{
    await api("PATCH","/profile/bank",{bank_name:name,bank_account:account,
      bank_swift:document.getElementById("bank-swift")?.value||null,
      bank_iban:document.getElementById("bank-iban")?.value||null});
    showToast("Coordonnées bancaires enregistrées ✓");
  }catch(e){showToast(e.message,"error");}
}
async function savePwd(){
  const cur=document.getElementById("pwd-cur")?.value;
  const nw=document.getElementById("pwd-new")?.value;
  const cf=document.getElementById("pwd-cf")?.value;
  if(!cur||!nw||!cf){showToast(t("toast_fill_all_fields"),"error");return;}
  if(nw!==cf){showToast(t("toast_passwords_mismatch"),"error");return;}
  try{await api("POST","/profile/change-password",{current_password:cur,new_password:nw});showToast(t("toast_password_changed"));}
  catch(e){showToast(e.message,"error");}
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
async function loadAdminStats(){
  try{
    const s=await api("GET","/admin/stats");
    set("stat-total-users",s.total_users);
    const planLabels={trial:t("plan_trial"),sandbox:t("plan_sandbox")+" / clients",starter:"Starter",professional:"Essentiel",business:"Pro",business_plus:"Premium",enterprise:"Entreprise"};
    const box=document.getElementById("stat-by-plan");
    box.innerHTML=Object.entries(s.by_plan).map(([plan,count])=>`
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--b)">
        <span style="color:var(--muted)">${esc(planLabels[plan]||plan)}</span><b>${count}</b>
      </div>`).join("")+`<div style="display:flex;justify-content:space-between;padding:6px 0 0;margin-top:4px;color:var(--green)"><span>${t("active_subs_label")}</span><b>${s.active_subscriptions}</b></div><div style="display:flex;justify-content:space-between;padding:4px 0 0;color:var(--muted)"><span>Comptes clients (gratuits)</span><b>${s.client_accounts||0}</b></div>`;
  }catch(e){console.error(e);}
}
async function loadPendingWires(){
  const box=document.getElementById("pending-wires-list");if(!box)return;
  try{
    const wires=await api("GET","/admin/pending-wires");
    if(!wires.length){box.innerHTML=`<div style="color:var(--muted);font-size:13px">${t("no_pending_wires")}</div>`;return;}
    const planLabels={starter:"Starter",professional:"Essentiel",business:"Pro",business_plus:"Premium",enterprise:"Entreprise"};
    box.innerHTML=wires.map(w=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--b)">
      <div>
        <div style="font-weight:700;font-size:13px">${esc(w.tenant_name)} <span style="color:var(--muted);font-weight:400">— ${esc(w.tenant_email)}</span></div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:2px">
          ${w.selection_label?`<span class="badge bb">${esc(w.selection_label)}</span>`:w.plan?`<span class="badge bb">${esc(planLabels[w.plan]||w.plan)}</span>`:""} ${w.billing_cycle==='annual'?t("toggle_annual"):t("toggle_monthly")} · $${w.amount_usd.toFixed(2)} · ${esc(w.reference)} · ${fmtDate(w.created_at)}
        </div>
      </div>
      <button class="btn btn-g btn-sm" onclick="confirmPendingWire('${esc(w.reference)}')"><i class="ti ti-check"></i> ${t("btn_unlock")}</button>
    </div>`).join("");
  }catch(e){box.innerHTML=`<div style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;}
}
async function confirmPendingWire(reference){
  if(!confirm(t("confirm_wire_activate").replace("{r}",reference)))return;
  try{
    const r=await api("POST",`/webhooks/admin/confirm-wire?wire_reference=${encodeURIComponent(reference)}`);
    showToast(r.success?`Plan ${r.plan_activated} activé ✓`:t("toast_activate_failed"),"error");
    loadPendingWires();
  }catch(e){showToast(e.message,"error");}
}
async function adminConfirmWire(){
  const ref=document.getElementById("admin-ref")?.value.trim();
  if(!ref){showToast(t("fld_wire_ref_ph"),"error");return;}
  const bankRef=document.getElementById("admin-bank-ref")?.value.trim();
  const res=document.getElementById("admin-result");
  try{
    const r=await api("POST",`/webhooks/admin/confirm-wire?wire_reference=${encodeURIComponent(ref)}${bankRef?`&bank_reference=${encodeURIComponent(bankRef)}`:""}` );
    if(res){res.style.display="block";res.style.background="rgba(0,224,128,.08)";res.style.border="1px solid rgba(0,224,128,.2)";res.style.color="var(--green)";
      res.innerHTML=r.success?`✅ Plan <b>${r.plan_activated}</b> activé pour <b>${r.tenant}</b>`:"❌ Échec — vérifie la référence";}
    if(r.success){showToast("Compte activé ✓");loadPendingWires();}
  }catch(e){
    if(res){res.style.display="block";res.style.background="rgba(255,95,109,.08)";res.style.border="1px solid rgba(255,95,109,.2)";res.style.color="var(--red)";res.innerHTML="❌ "+e.message;}
    showToast(e.message,"error");
  }
}

function renderAdminStats(users){
  const box=document.getElementById("admin-stats-cards");if(!box||!users)return;
  const planLabels={trial:"Essai",sandbox:"Clients (gratuit)",starter:"Starter",professional:"Essentiel",business:"Pro",business_plus:"Premium",enterprise:"Entreprise"};
  const counts={};
  users.forEach(u=>{
    if(u.is_creator)return;
    counts[u.plan]=(counts[u.plan]||0)+1;
  });
  const total=users.filter(u=>!u.is_creator).length;
  const rows=Object.keys(planLabels).map(k=>`<tr>
    <td style="font-weight:600">${planLabels[k]}</td>
    <td style="font-family:var(--mono);text-align:right">${counts[k]||0}</td>
    <td style="font-family:var(--mono);text-align:right;color:var(--muted)">${total?Math.round((counts[k]||0)/total*100):0}%</td>
  </tr>`).join("");
  box.innerHTML=`
    <div class="card2" style="display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center">
      <div class="kl">Utilisateurs au total</div>
      <div style="font-size:38px;font-weight:800;margin-top:6px">${total}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">(créateur exclu)</div>
    </div>
    <div class="card2">
      <div class="kl" style="margin-bottom:8px">Répartition par formule</div>
      <table style="width:100%;font-size:12px"><tbody>${rows}</tbody></table>
    </div>`;
}
async function loadAdminUsers(){
  const tbody=document.getElementById("admin-users-tbody");if(!tbody)return;
  try{
    const users=await api("GET","/admin/users");
    renderAdminStats(users);
    if(!users?.length){tbody.innerHTML=`<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:24px">Aucun utilisateur.</td></tr>`;return;}
    tbody.innerHTML=users.map(u=>`<tr>
      <td style="font-weight:600">${esc(u.name)}${u.is_creator?' <span class="badge bgold">CRÉATEUR</span>':''}${u.account_type==="client"?' <span class="badge badge-gray">CLIENT</span>':''}${u.has_deal?' <span class="badge bp" title="Remise personnalisée">REMISE</span>':''}${u.has_gifts?' <span class="badge bp" title="Accès offert">OFFERT</span>':''}${u.filleuls?` <span class="badge bg" title="Filleuls">${u.filleuls} filleul${u.filleuls>1?"s":""}</span>`:''}</td>
      <td style="font-family:var(--mono);font-size:12px">${esc(u.email)}</td>
      <td>${planBadge(u.plan)}</td>
      <td style="font-family:var(--mono);font-size:12px">${u.plan==='trial'?(u.trial_expired?'<span style="color:var(--red)">Expiré</span>':(u.trial_expires_at?formatCountdown(parseServerDate(u.trial_expires_at)-new Date()):`${u.trial_days_remaining}j`)):'—'}</td>
      <td>${u.is_subscribed?`<span class="badge bg">${esc(u.entitled?Object.entries(u.entitled).map(([k,v])=>(t("sector_short_"+k)||k)+" "+(t("ab_tier_"+v)||v)).join(" + "):(u.plan_label||u.subscribed_plan))}</span>`:'<span class="badge badge-gray">Non</span>'}</td>
      <td>${esc(u.country)||"—"}</td>
      <td style="font-family:var(--mono);font-size:11px">${fmtDate(u.created_at)}</td>
      <td style="font-family:var(--mono);font-size:11px">${fmtDate(u.last_seen_at)}</td>
      <td>${u.is_active?'<span class="badge bg">Actif</span>':'<span class="badge br">Banni</span>'}</td>
      <td style="display:flex;gap:5px;flex-wrap:wrap">
        ${u.is_creator?"":`<button class="btn btn-sm btn-g" onclick="abAdminOffer('${u.id}')"><i class="ti ti-discount-2"></i> Conditions</button>`}
        ${u.is_creator?"":`<button class="btn btn-sm btn-b" onclick="resetTrial('${u.id}','${escJs(u.name)}')"><i class="ti ti-clock-play"></i> Renouveler essai</button>`}
        ${u.is_creator?"":u.is_active
          ?`<button class="btn btn-sm btn-r" onclick="banUser('${u.id}','${escJs(u.name)}')"><i class="ti ti-ban"></i> Bannir</button>`
          :`<button class="btn btn-sm btn-g" onclick="unbanUser('${u.id}','${escJs(u.name)}')"><i class="ti ti-check"></i> Débannir</button>`}
        ${u.is_creator?"":`<button class="btn btn-sm btn-o" onclick="deleteUser('${u.id}','${escJs(u.name)}')"><i class="ti ti-trash"></i></button>`}
      </td></tr>`).join("");
  }catch(e){tbody.innerHTML=`<tr><td colspan="10" style="color:var(--red);padding:20px">${e.message}</td></tr>`;}
}
async function resetTrial(id,name){
  if(!confirm(`Renouveler un essai gratuit de 14 jours pour ${name} ?`))return;
  try{await api("PATCH",`/admin/users/${id}/reset-trial`);showToast(`Essai renouvelé pour ${name} ✓`);loadAdminUsers();}
  catch(e){showToast(e.message,"error");}
}
async function banUser(id,name){
  if(!confirm(`Bannir ${name} ? Cette personne ne pourra plus se connecter.`))return;
  try{await api("PATCH",`/admin/users/${id}/ban`);showToast("Utilisateur banni ✓");loadAdminUsers();}
  catch(e){showToast(e.message,"error");}
}
async function unbanUser(id,name){
  try{await api("PATCH",`/admin/users/${id}/unban`);showToast(`${name} débanni ✓`);loadAdminUsers();}
  catch(e){showToast(e.message,"error");}
}
async function deleteUser(id,name){
  if(!confirm(`Supprimer définitivement le compte de ${name} ? Action irréversible.`))return;
  try{await api("DELETE",`/admin/users/${id}`);showToast("Compte supprimé ✓");loadAdminUsers();}
  catch(e){showToast(e.message,"error");}
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
async function handleLogin(e){
  e.preventDefault();
  const btn=document.getElementById("login-btn");btn.textContent="Connexion...";btn.disabled=true;
  try{
    const r=await login(document.getElementById("login-email").value,document.getElementById("login-password").value);
    btn.innerHTML='<i class="ti ti-login"></i> Se connecter';btn.disabled=false;
    if(r.requires_2fa){showLogin2faStep(true);return;}
    showAppLayout();
  }
  catch(err){showErr("login-err",err.message);btn.innerHTML='<i class="ti ti-login"></i> Se connecter';btn.disabled=false;}
}
async function handleRegister(e){
  e.preventDefault();
  showErr("reg-err","");
  if(!registerTermsOk())return;
  const btn=document.getElementById("reg-btn");const label=btn.innerHTML;btn.textContent=t("reg_creating");btn.disabled=true;
  try{
    const isClient=typeof _regAccountType==="string"&&_regAccountType==="client";
    await register({name:document.getElementById("reg-name").value,email:document.getElementById("reg-email").value,
      password:document.getElementById("reg-password").value,company_name:isClient?null:(document.getElementById("reg-company").value||null),
      referral_code:isClient?null:(document.getElementById("reg-referral").value.trim()||null),birth_date:registerBirthValue(),accept_terms:true,
      sector:isClient?null:(typeof _regSector==="string"?_regSector:"pme"),account_type:isClient?"client":"manager"});
    window._zdJustRegistered=true;
    showAppLayout();
  }catch(err){showErr("reg-err",err.message);btn.innerHTML=label;btn.disabled=false;}
}
function showAuthTab(tab){
  document.querySelectorAll(".auth-tab-content").forEach(t=>t.style.display="none");
  document.querySelectorAll(".auth-tab").forEach(b=>b.classList.remove("active"));
  document.getElementById(`tab-${tab}`).style.display="block";
  document.querySelector(`[data-tab="${tab}"]`).classList.add("active");
}
function doLogout(){offlineCacheClear();document.body.classList.remove("zd-app-visible");hideInstallBanner();toggleQuickActions(false);logout();State.restricted=false;applyRestrictedUI();disconnectMessagingWS();if(_expiryInterval){clearInterval(_expiryInterval);_expiryInterval=null;}document.getElementById("app-screen").style.display="none";document.getElementById("blocked-screen").style.display="none";document.getElementById("auth-screen").style.display="flex";document.querySelector(".bottom-nav")?.classList.remove("show");try{showAuthTab("login");showLogin2faStep(false);}catch(_){}}

// ── ÉCRAN DE BLOCAGE (essai/abonnement expiré) ──────────────────────────────
async function showBlockedScreen(){
  document.getElementById("auth-screen").style.display="none";
  document.getElementById("app-screen").style.display="none";
  document.getElementById("portal-view").style.display="none";
  document.querySelector(".bottom-nav")?.classList.remove("show");
  document.getElementById("blocked-screen").style.display="flex";
  await loadBlockedPlans();
}
async function loadBlockedPlans(){
  const box=document.getElementById("blocked-plans");
  try{
    const plans=await fetch(`${API_BASE}/billing/plans`,{headers:State.token?{"Authorization":`Bearer ${State.token}`}:{}}).then(r=>r.json());
    box.innerHTML=Object.entries(plans).map(([key,p])=>`
      <div class="card2" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div><div style="font-weight:700">${esc(p.name)}</div><div style="font-size:12px;color:var(--muted)">$${p.price_monthly}/mois ou $${p.price_annual}/an</div></div>
        <button class="btn btn-g btn-sm" onclick="subscribeFromBlocked('${key}')">Souscrire</button>
      </div>`).join("");
  }catch(e){box.innerHTML=`<div style="color:var(--red);text-align:center">${esc(e.message)}</div>`;}
}
async function subscribeFromBlocked(planKey){
  try{
    const r=await fetch(`${API_BASE}/billing/subscribe`,{method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${State.token}`},
      body:JSON.stringify({plan:planKey,billing_cycle:"monthly"})}).then(r=>r.json());
    const ins=r.instructions;
    const box=document.getElementById("blocked-wire-result");
    box.style.display="block";
    box.innerHTML=`
      <div class="card2">
        <div style="font-weight:700;margin-bottom:8px">Instructions de paiement — ${esc(ins.plan)}</div>
        <div style="font-family:var(--mono);font-size:12px;line-height:1.9">
          Référence : <b>${esc(ins.reference)}</b><br>
          Montant : <b>${fmtUSD(ins.amount_usd)}</b><br>
          Bénéficiaire : ${esc(ins.national_wire.beneficiary)}<br>
          Compte : ${esc(ins.national_wire.account_number)}<br>
          Banque : ${esc(ins.national_wire.bank_name)}
        </div>
        <a href="https://wa.me/${ins.whatsapp.number.replace('+','')}?text=${encodeURIComponent(ins.whatsapp.message)}" target="_blank" style="display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;padding:8px 16px;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none;margin-top:10px"><i class="ti ti-brand-whatsapp"></i> Confirmer sur WhatsApp</a>
      </div>`;
  }catch(e){showToast(e.message,"error");}
}

document.addEventListener("keydown",e=>{
  if(e.ctrlKey&&e.shiftKey&&e.key==="K"){document.getElementById("creator-modal").style.display="flex";document.getElementById("creator-input").focus();}
});
// ── OBJECTIFS ──────────────────────────────────────────────────────────────
async function loadObjectives(){
  const container=document.getElementById("objectives-list");if(!container)return;
  const limits=State.tenant?.limits||{};
  if(!limits.objectives){showUpgradeBanner(container,'objectives');return;}
  try{
    const objs=await api("GET","/objectives");
    if(!objs?.length){container.innerHTML=`<div class="card" style="text-align:center;padding:32px;color:var(--muted)"><i class="ti ti-target-arrow" style="font-size:40px;display:block;margin-bottom:12px"></i>${t("no_objectives")} <a href="#" onclick="openObjModal()">${t("create_arrow")}</a></div>`;return;}
    container.innerHTML=objs.map(o=>{
      const pct=Math.min(100,Math.round((o.current_value/o.target_value)*100));
      const color=pct>=100?'var(--green)':pct>=70?'var(--blue)':pct>=40?'var(--amber)':'var(--muted)';
      return`<div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div><div style="font-weight:700;font-size:14px">${esc(o.title)}</div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--muted)">${esc(o.category)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:20px;font-weight:800;color:${color}">${pct}%</div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--muted)">${o.current_value}/${o.target_value} ${esc(o.unit)}</div>
          </div>
        </div>
        <div style="height:8px;background:var(--s);border-radius:4px;overflow:hidden;margin-bottom:10px">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width .5s"></div>
        </div>
        <div style="display:flex;gap:8px">
          <input class="inp" type="number" placeholder="${t("fld_update_value_ph")}" id="obj-update-${o.id}" style="font-size:12px">
          <button class="btn btn-g btn-sm" onclick="updateObjective('${o.id}')">${t("btn_update_value")}</button>
          <button class="btn btn-r btn-sm" onclick="deleteObj('${o.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>`;
    }).join("");
  }catch(e){container.innerHTML=`<div class="card" style="color:var(--red)">${e.message}</div>`;}
}
async function updateObjective(id){
  const val=parseFloat(document.getElementById(`obj-update-${id}`)?.value||0);
  try{await api("PATCH",`/objectives/${id}/progress`,{current_value:val});showToast("Mis à jour ✓");loadObjectives();loadNotifications();}
  catch(e){showToast(e.message,"error");}
}
async function deleteObj(id){if(!confirm("Supprimer ?"))return;try{await api("DELETE",`/objectives/${id}`);loadObjectives();}catch(e){showToast(e.message,"error");}}
function openObjModal(){document.getElementById("modal-obj").style.display="flex";}
function closeObjModal(){document.getElementById("modal-obj").style.display="none";}
async function submitObjective(){
  const title=document.getElementById("obj-title").value;
  const target=parseFloat(document.getElementById("obj-target").value);
  if(!title||!target){showToast("Titre et valeur cible obligatoires","error");return;}
  try{
    const d=document.getElementById("obj-deadline").value;
    await api("POST","/objectives",{title,target_value:target,unit:document.getElementById("obj-unit").value,
      category:document.getElementById("obj-cat").value,description:document.getElementById("obj-desc").value||null,
      deadline:d?new Date(d).toISOString():null});
    showToast("Objectif créé ✓");closeObjModal();loadObjectives();
  }catch(e){showToast(e.message,"error");}
}

// ── PROJETS ───────────────────────────────────────────────────────────────────
async function loadProjects(){
  const container=document.getElementById("projects-list");if(!container)return;
  const limits=State.tenant?.limits||{};
  if(!limits.projects){showUpgradeBanner(container,'projects');return;}
  try{
    const projs=await api("GET","/projects");
    if(!projs?.length){container.innerHTML=`<div class="card" style="text-align:center;padding:32px;color:var(--muted)"><i class="ti ti-briefcase" style="font-size:40px;display:block;margin-bottom:12px"></i>${t("no_projects")} <a href="#" onclick="openProjectModal()">${t("create_arrow")}</a></div>`;return;}
    container.innerHTML=projs.map(p=>{
      const statusColors={active:"var(--green)",completed:"var(--blue)",on_hold:"var(--amber)",cancelled:"var(--red)"};
      return`<div class="card" style="margin-bottom:12px;cursor:pointer" onclick="openProjectDetail('${p.id}','${escJs(p.name)}')">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div><div style="font-weight:700;font-size:14px">${esc(p.name)}</div>
            <div style="font-size:12px;color:var(--muted)">${esc(p.description)||"—"}</div>
          </div>
          <div style="text-align:right">
            <span class="badge" style="background:${statusColors[p.status]}22;color:${statusColors[p.status]};border:1px solid ${statusColors[p.status]}44">${p.status}</span>
            <div style="font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:4px">${fmtUSD(p.budget)}</div>
          </div>
        </div>
        <div style="margin-top:10px;height:6px;background:var(--s);border-radius:3px"><div style="height:100%;width:${p.progress}%;background:var(--blue);border-radius:3px"></div></div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:4px">${p.progress}${t("pct_completed")}</div>
      </div>`;
    }).join("");
  }catch(e){container.innerHTML=`<div class="card" style="color:var(--red)">${e.message}</div>`;}
}
function openProjectModal(){populateClientSelect("proj-client-p");document.getElementById("modal-project").style.display="flex";}
function closeProjectModal(){document.getElementById("modal-project").style.display="none";}
async function submitProject(){
  const name=document.getElementById("proj-name-p").value;
  if(!name){showToast("Nom obligatoire","error");return;}
  try{
    const s=document.getElementById("proj-start").value;
    const e=document.getElementById("proj-end").value;
    await api("POST","/projects",{name,description:document.getElementById("proj-desc-p").value||null,
      client_id:document.getElementById("proj-client-p").value||null,
      budget:parseFloat(document.getElementById("proj-budget").value||0),hourly_rate:parseFloat(document.getElementById("proj-rate").value||0),
      start_date:s?new Date(s).toISOString():null,end_date:e?new Date(e).toISOString():null,currency:"USD"});
    showToast("Projet créé ✓");closeProjectModal();loadProjects();
  }catch(e){showToast(e.message,"error");}
}

// ── TÂCHES + SUIVI DES HEURES ────────────────────────────────────────────────
let _currentProjectId=null,_currentTaskId=null;
const taskStatusLabel={todo:"À faire",in_progress:"En cours",done:"Terminé"};
async function openProjectDetail(projectId,projectName){
  _currentProjectId=projectId;
  document.getElementById("pd-title").textContent=projectName;
  document.getElementById("modal-project-detail").style.display="flex";
  showProjectTab("tasks");
}
function closeProjectDetail(){document.getElementById("modal-project-detail").style.display="none";}
async function loadProjectTasks(){
  const box=document.getElementById("pd-tasks-list");
  box.innerHTML=`<div style="text-align:center;color:var(--muted);padding:16px">Chargement...</div>`;
  try{
    const tasks=await api("GET",`/projects/${_currentProjectId}/tasks`);
    if(!tasks.length){box.innerHTML=`<div style="text-align:center;color:var(--muted);padding:16px">Aucune tâche.</div>`;return;}
    const withHours=await Promise.all(tasks.map(async t=>{
      try{const logs=await api("GET",`/projects/tasks/${t.id}/time`);return{...t,totalHours:logs.reduce((s,l)=>s+l.hours,0)};}
      catch{return{...t,totalHours:0};}
    }));
    box.innerHTML=withHours.map(t=>`<div class="card2" style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="font-weight:600;font-size:13px">${esc(t.title)}</div>
        <button class="btn btn-sm btn-r" onclick="deleteTask('${t.id}')"><i class="ti ti-trash"></i></button>
      </div>
      <div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap">
        <select class="inp" style="width:auto;padding:4px 8px;font-size:11px" onchange="changeTaskStatus('${t.id}',this.value)">
          ${Object.keys(taskStatusLabel).map(s=>`<option value="${s}" ${s===t.status?"selected":""}>${taskStatusLabel[s]}</option>`).join("")}
        </select>
        <span style="font-family:var(--mono);font-size:11px;color:var(--amber);cursor:pointer" onclick="viewTimeHistory('${t.id}','${escJs(t.title)}')">
          <i class="ti ti-clock"></i> ${t.totalHours}h
        </span>
        <button class="btn btn-sm btn-o" style="margin-left:auto" onclick="openTimeLogModal('${t.id}')"><i class="ti ti-plus"></i> Heures</button>
      </div>
    </div>`).join("");
  }catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;}
}
async function changeTaskStatus(taskId,status){
  try{await api("PATCH",`/projects/tasks/${taskId}/status?status=${status}`);showToast("Statut mis à jour ✓");}
  catch(e){showToast(e.message,"error");loadProjectTasks();}
}
async function deleteTask(taskId){
  if(!confirm("Supprimer cette tâche et ses heures enregistrées ?"))return;
  try{await api("DELETE",`/projects/tasks/${taskId}`);showToast("Supprimée ✓");loadProjectTasks();}
  catch(e){showToast(e.message,"error");}
}
function openTaskModal(){
  document.getElementById("task-title").value="";document.getElementById("task-due").value="";document.getElementById("task-assigned").value="";
  document.getElementById("task-start").value="";document.getElementById("task-est").value="";
  document.getElementById("modal-task").style.display="flex";
}
function closeTaskModal(){document.getElementById("modal-task").style.display="none";}
async function submitTask(){
  const title=document.getElementById("task-title").value.trim();
  if(!title){showToast("Le titre est obligatoire","error");return;}
  try{
    const due=document.getElementById("task-due").value;
    await api("POST","/projects/tasks",{project_id:_currentProjectId,title,
      priority:document.getElementById("task-priority").value,
      due_date:due?new Date(due).toISOString():null,
      start_date:document.getElementById("task-start").value?new Date(document.getElementById("task-start").value).toISOString():null,
      estimated_hours:parseFloat(document.getElementById("task-est").value||0),
      assigned_to:document.getElementById("task-assigned").value||null});
    showToast("Tâche créée ✓");closeTaskModal();loadProjectTasks();
  }catch(e){showToast(e.message,"error");}
}
function openTimeLogModal(taskId){
  _currentTaskId=taskId;
  document.getElementById("tl-hours").value="";document.getElementById("tl-note").value="";
  document.getElementById("tl-date").value=new Date().toISOString().slice(0,10);
  document.getElementById("modal-timelog").style.display="flex";
}
function closeTimeLogModal(){document.getElementById("modal-timelog").style.display="none";}
async function submitTimeLog(){
  const hours=parseFloat(document.getElementById("tl-hours").value);
  if(!hours||hours<=0){showToast("Entre un nombre d'heures valide","error");return;}
  try{
    const d=document.getElementById("tl-date").value;
    await api("POST",`/projects/tasks/${_currentTaskId}/time`,{hours,
      log_date:d?new Date(d).toISOString():null,note:document.getElementById("tl-note").value||null});
    showToast("Heures enregistrées ✓");closeTimeLogModal();loadProjectTasks();
  }catch(e){showToast(e.message,"error");}
}
async function viewTimeHistory(taskId,taskTitle){
  document.getElementById("modal-time-history").style.display="flex";
  const box=document.getElementById("th-list");
  box.innerHTML=`<div style="text-align:center;color:var(--muted);padding:16px">Chargement...</div>`;
  try{
    const logs=await api("GET",`/projects/tasks/${taskId}/time`);
    if(!logs.length){box.innerHTML=`<div style="text-align:center;color:var(--muted);padding:16px">Aucune heure enregistrée.</div>`;return;}
    box.innerHTML=logs.map(l=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--b);font-size:13px">
      <div><b>${l.hours}h</b> — ${esc(l.logged_by)||"?"}<div style="font-size:11px;color:var(--muted)">${esc(l.note)||""}</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-family:var(--mono);font-size:11px;color:var(--muted)">${fmtDate(l.log_date)}</span>
        <button class="btn btn-sm btn-r" onclick="deleteTimeLog('${l.id}','${taskId}')"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join("");
  }catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;}
}
async function deleteTimeLog(logId,taskId){
  if(!confirm("Supprimer cette entrée ?"))return;
  try{await api("DELETE",`/time/${logId}`);showToast("Supprimée ✓");viewTimeHistory(taskId);loadProjectTasks();}
  catch(e){showToast(e.message,"error");}
}
function closeTimeHistoryModal(){document.getElementById("modal-time-history").style.display="none";}

// ── CALENDRIER ────────────────────────────────────────────────────────────────
async function loadCalendar(){
  const limits=State.tenant?.limits||{};
  if(!limits.calendar){
    const c=document.getElementById("cal-upcoming");if(c)showUpgradeBanner(c,'calendar');return;
  }
  try{
    const d=await api("GET","/accounting/calendar");
    const overdue=document.getElementById("cal-overdue");
    const upcoming=document.getElementById("cal-upcoming");
    if(overdue){
      if(!d.overdue?.length){overdue.innerHTML=`<div style="color:var(--green);font-size:13px">${t("no_overdue")}</div>`;}
      else{overdue.innerHTML=d.overdue.map(i=>`<div style="padding:8px 0;border-bottom:1px solid var(--b)">
        <div style="font-weight:600;font-size:13px">${i.number}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--red)">${fmtUSD(i.total)} — ${t("st_overdue")}</div>
      </div>`).join("");}
    }
    if(upcoming){
      if(!d.upcoming?.length){upcoming.innerHTML=`<div style="color:var(--muted);font-size:13px">${t("no_upcoming")}</div>`;}
      else{upcoming.innerHTML=d.upcoming.map(i=>`<div style="padding:8px 0;border-bottom:1px solid var(--b)">
        <div style="font-weight:600;font-size:13px">${i.number}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--blue)">${fmtUSD(i.total)} — ${fmtDate(i.due_date)}</div>
      </div>`).join("");}
    }
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
async function loadNotifications(){
  try{
    const notifs=await api("GET","/notifications");
    const container=document.getElementById("notifs-list");
    const badge=document.getElementById("notif-badge");
    const unread=notifs.filter(n=>!n.is_read).length;
    if(badge){badge.textContent=unread;badge.style.display=unread>0?"inline":"none";}
    if(!container)return;
    if(!notifs?.length){container.innerHTML=`<div style="text-align:center;padding:32px;color:var(--muted)">${t("no_notifications")}</div>`;return;}
    container.innerHTML=notifs.map(n=>{
      const colors={info:"var(--blue)",warning:"var(--amber)",success:"var(--green)",error:"var(--red)"};
      const c=colors[n.type]||"var(--blue)";
      return`<div style="padding:12px;border-bottom:1px solid var(--b);background:${!n.is_read?c+'0D':'transparent'};border-radius:8px;margin-bottom:4px">
        <div style="display:flex;align-items:start;gap:10px">
          <div style="width:8px;height:8px;border-radius:50%;background:${c};margin-top:5px;flex-shrink:0;${n.is_read?'opacity:0.3':''}"></div>
          <div style="flex:1">
            <div style="font-weight:${n.is_read?'500':'700'};font-size:13px;color:var(--text)">${esc(n.title)}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px">${esc(n.message)}</div>
            <div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:4px">${fmtDate(n.created_at)}</div>
          </div>
          ${!n.is_read?`<button class="btn btn-sm btn-o" style="font-size:10px;padding:3px 8px" onclick="markNotifRead('${n.id}')">${t("btn_read")}</button>`:""}
        </div>
      </div>`;
    }).join("");
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}
async function markNotifRead(id){try{await api("PATCH",`/notifications/${id}/read`);loadNotifications();}catch(e){}}
async function markAllNotifsRead(){try{await api("PATCH","/notifications/read-all");showToast(t("toast_all_read"));loadNotifications();}catch(e){showToast(e.message,"error");}}

// ── ASSISTANT IA ──────────────────────────────────────────────────────────────
async function loadAI(){
  const container=document.getElementById("ai-content");if(!container)return;
  const limits=State.tenant?.limits||{};
  if(!limits.ai_assistant){showUpgradeBanner(container,'ai_assistant');return;}
  container.innerHTML=`<div style="text-align:center;padding:20px;color:var(--muted)"><i class="ti ti-robot" style="font-size:32px"></i><div style="margin-top:8px">${t("ai_analyzing")}</div></div>`;
  try{
    const d=await api("POST","/ai/advice");
    const priorityColors={high:"var(--red)",medium:"var(--amber)",low:"var(--green)"};
    container.innerHTML=`
      <div class="kgrid" style="margin-bottom:20px">
        <div class="kpi g"><div class="kl">${t("kpi_total_revenue")}</div><div class="kv">${fmtUSD(d.summary?.revenue||0)}</div></div>
        <div class="kpi b"><div class="kl">${t("st_pending")}</div><div class="kv">${fmtUSD(d.summary?.pending||0)}</div></div>
        <div class="kpi p"><div class="kl">${t("cl_title")}</div><div class="kv">${d.summary?.clients||0}</div></div>
        <div class="kpi r"><div class="kl">${t("exp_title")}</div><div class="kv">${fmtUSD(d.summary?.expenses||0)}</div></div>
      </div>
      <div class="card">
        <div style="font-weight:700;font-size:15px;margin-bottom:14px"><i class="ti ti-robot" style="color:var(--purple)"></i> ${t("card_personalized_advice")}</div>
        ${d.advice.map(a=>`<div style="padding:12px;margin-bottom:10px;border-radius:10px;background:${priorityColors[a.priority]}11;border:1px solid ${priorityColors[a.priority]}33">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span class="badge" style="background:${priorityColors[a.priority]}22;color:${priorityColors[a.priority]};border:1px solid ${priorityColors[a.priority]}44;font-size:9px">${a.priority.toUpperCase()}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--muted)">${a.category}</span>
          </div>
          <div style="font-size:13px;color:var(--text)">${a.text}</div>
        </div>`).join("")}
      </div>`;
  }catch(e){container.innerHTML=`<div class="card" style="color:var(--red)">${e.message}</div>`;}
}

async function activateCreator(){
  const code=document.getElementById("creator-input").value.trim();
  if(!code){showToast("Entre le code","error");return;}
  try{
    const r=await api("POST",`/creator/activate?code=${encodeURIComponent(code)}`);
    showToast(r.message);
    const fresh=await api("GET","/profile/");
    State.tenant=fresh;
    localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));
    setHTML("topbar-plan",planBadge(fresh.plan));
    document.getElementById("trial-bar").className="trial-bar hidden";
    document.getElementById("creator-modal").style.display="none";
    document.getElementById("creator-input").value="";
    const navAdmin=document.getElementById("nav-admin");
    if(navAdmin) navAdmin.style.display="flex";
    navigate("dashboard");
  }catch(e){showToast(e.message,"error");}
}

function toggleMoreMenu(){
  const m=document.getElementById("more-menu");
  const b=document.getElementById("more-menu-backdrop");
  const show=m.style.display==="none";
  if(m) m.style.display=show?"block":"none";
  if(b) b.style.display=show?"block":"none";
}
function closeMoreMenu(){
  const m=document.getElementById("more-menu");
  const b=document.getElementById("more-menu-backdrop");
  if(m) m.style.display="none";
  if(b) b.style.display="none";
}

// Fix iPhone — scroll vers le bouton après remplissage
document.querySelectorAll('.inp').forEach(inp => {
  inp.addEventListener('blur', () => {
    setTimeout(() => {
      const btn = document.querySelector('#tab-register .btn-g, #tab-login .btn-g');
      if (btn) btn.scrollIntoView({behavior:'smooth', block:'center'});
    }, 300);
  });
});

// Fix iPhone — empêcher le zoom sur les inputs
document.querySelectorAll('input').forEach(inp => {
  inp.style.fontSize = '16px';
});

let _pendingInviteToken=null;
async function checkPendingInvite(){
  const params=new URLSearchParams(window.location.search);
  const token=params.get("invite");
  if(!token) return false;
  try{
    const info=await api("GET",`/team/invite-info/${token}`);
    _pendingInviteToken=token;
    document.getElementById("invite-company-name").textContent=info.company_name||"un espace ZenithDash";
    document.getElementById("invite-accept-email").value=info.email;
    document.getElementById("invite-accept-panel").style.display="block";
    document.getElementById("auth-tabs-nav").style.display="none";
    document.getElementById("tab-login").classList.remove("active");
    document.getElementById("tab-register").classList.remove("active");
    return true;
  }catch(e){
    showToast("Lien d'invitation invalide ou expiré","error");
    return false;
  }
}
async function handleAcceptInvite(e){
  e.preventDefault();
  const name=document.getElementById("invite-accept-name").value.trim();
  const password=document.getElementById("invite-accept-password").value;
  if(!name||!password){showErr("invite-accept-err","Remplissez tous les champs");return;}
  if(password.length<8){showErr("invite-accept-err","Mot de passe minimum 8 caractères");return;}
  const btn=document.getElementById("invite-accept-btn");
  btn.innerHTML="Connexion...";btn.disabled=true;
  try{
    const r=await api("POST","/team/accept",{token:_pendingInviteToken,name,password});
    State.token=r.token; State.tenant=r.user;
    localStorage.setItem("zd_token",State.token); localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));
    window.history.replaceState({},"",window.location.pathname);
    await showAppLayout();
  }catch(err){
    showErr("invite-accept-err",err.message);
    btn.innerHTML='<i class="ti ti-check"></i> Rejoindre l\'équipe';
    btn.disabled=false;
  }
}
function checkPendingReferral(){
  const params=new URLSearchParams(window.location.search);
  const ref=params.get("ref");
  if(!ref) return;
  const field=document.getElementById("reg-referral");
  if(field) field.value=ref.toUpperCase();
  showAuthTab("register");
}
let _portalToken=null;
function statusLabelFr(s){
  return {draft:"Brouillon",sent:"Envoyé",accepted:"Accepté",rejected:"Refusé",paid:"Payée",overdue:"En retard",cancelled:"Annulée",partial:"Partiellement payée",expired:"Expiré"}[s]||s;
}
async function checkPortalView(){
  const params=new URLSearchParams(window.location.search);
  const token=params.get("portal");
  if(!token) return false;
  _portalToken=token;
  document.getElementById("auth-screen").style.display="none";
  document.getElementById("portal-view").style.display="block";
  const content=document.getElementById("portal-content");
  try{
    const r=await fetch(`${API_BASE}/portal/${token}`);
    const d=await r.json();
    if(!r.ok) throw new Error(d.detail||"Lien invalide");
    if(typeof zdClientLink==="function")zdClientLink("portal",token);
    document.getElementById("portal-company").textContent=d.company_name;
    const s=await renderPortalExtras(token);
    const rich=!!s?.enriched;
    const pending=new Set((s?.notices||[]).filter(n=>n.status==="pending").map(n=>n.invoice_id));
    let html=`<h3 style="margin-bottom:10px">Bonjour ${esc(d.client_name)}</h3>`;
    html+=`<div style="font-weight:700;margin:20px 0 10px">Devis</div>`;
    if(!d.quotes.length) html+=`<div style="color:var(--muted);font-size:13px">Aucun devis.</div>`;
    d.quotes.forEach(q=>{
      html+=`<div class="card2" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between"><b>${esc(q.number)}</b><span>${fmtUSD(q.total)}</span></div>
        <div style="font-size:12px;color:var(--muted);margin:6px 0">${statusLabelFr(q.status)}</div>
        ${(q.status==='sent'||q.status==='draft')?`<div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-sm btn-g" onclick="openSignatureModal('${q.id}')">Accepter</button>
          <button class="btn btn-sm btn-r" onclick="portalActOnQuote('${q.id}')">Refuser</button>
        </div>`:''}
        ${q.signed_name?`<div style="font-size:11px;color:var(--muted);margin-top:6px">Signé par ${esc(q.signed_name)} le ${fmtDate(q.signed_at)}</div>`:''}
        <button class="btn btn-sm btn-o" style="margin-top:8px" onclick="openPortalQuoteDoc('${q.id}')"><i class="ti ti-file-type-pdf"></i> PDF</button>
      </div>`;
    });
    html+=`<div style="font-weight:700;margin:20px 0 10px">Factures</div>`;
    if(!d.invoices.length) html+=`<div style="color:var(--muted);font-size:13px">Aucune facture.</div>`;
    d.invoices.forEach(i=>{
      const cur=i.currency||"USD";const bal=i.balance_due??i.total;
      html+=`<div class="card2" style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between"><b>${esc(i.number)}</b><span>${fmtMoney(i.total,cur)}</span></div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">${statusLabelFr(i.status)}${bal>0&&i.status!=="paid"&&i.status!=="cancelled"?` · ${t("balance_label")} <b style="color:var(--amber)">${fmtMoney(bal,cur)}</b>`:""}</div>
        ${rich?`<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn btn-sm btn-o" onclick="portalInvoiceDoc('${i.id}')"><i class="ti ti-file-type-pdf"></i> PDF</button>
          ${bal>0&&!["paid","cancelled","draft"].includes(i.status)?(pending.has(i.id)?`<span class="badge ba">${t("portal_notice_sent")}</span>`:`<button class="btn btn-sm btn-g" onclick="openPortalNotice('${i.id}','${esc(i.number)}',${bal},'${cur}')"><i class="ti ti-cash"></i> ${t("portal_i_paid")}</button>`):""}</div>`:""}
      </div>`;
    });
    content.innerHTML=html;
    if(typeof ocPortalCold==="function")ocPortalCold(token,content);
  }catch(e){
    content.innerHTML=`<div style="text-align:center;color:var(--red);padding:40px 0">${esc(e.message)}</div>`;
  }
  return true;
}
let _sigQuoteId=null,_sigCanvas=null,_sigCtx=null,_sigDrawing=false,_sigHasDrawn=false;
function openSignatureModal(quoteId){
  _sigQuoteId=quoteId;
  document.getElementById("sig-name").value="";
  document.getElementById("modal-signature").style.display="flex";
  setTimeout(initSignaturePad,50);
}
function closeSignatureModal(){document.getElementById("modal-signature").style.display="none";}
function initSignaturePad(){
  _sigCanvas=document.getElementById("sig-canvas");
  _sigCtx=_sigCanvas.getContext("2d");
  _sigCtx.clearRect(0,0,_sigCanvas.width,_sigCanvas.height);
  _sigCtx.strokeStyle="#111";_sigCtx.lineWidth=2;_sigCtx.lineCap="round";
  _sigHasDrawn=false;
  const pos=(e)=>{
    const r=_sigCanvas.getBoundingClientRect();
    const cx=(e.touches?e.touches[0].clientX:e.clientX)-r.left;
    const cy=(e.touches?e.touches[0].clientY:e.clientY)-r.top;
    return {x:cx*(_sigCanvas.width/r.width),y:cy*(_sigCanvas.height/r.height)};
  };
  const start=(e)=>{_sigDrawing=true;_sigHasDrawn=true;const p=pos(e);_sigCtx.beginPath();_sigCtx.moveTo(p.x,p.y);e.preventDefault();};
  const move=(e)=>{if(!_sigDrawing)return;const p=pos(e);_sigCtx.lineTo(p.x,p.y);_sigCtx.stroke();e.preventDefault();};
  const end=()=>{_sigDrawing=false;};
  _sigCanvas.onmousedown=start;_sigCanvas.onmousemove=move;_sigCanvas.onmouseup=end;_sigCanvas.onmouseleave=end;
  _sigCanvas.ontouchstart=start;_sigCanvas.ontouchmove=move;_sigCanvas.ontouchend=end;
}
function clearSignaturePad(){_sigCtx.clearRect(0,0,_sigCanvas.width,_sigCanvas.height);_sigHasDrawn=false;}
async function submitSignedQuote(){
  const name=document.getElementById("sig-name").value.trim();
  if(!name){alert("Ton nom complet est requis pour signer.");return;}
  try{
    const r=await fetch(`${API_BASE}/portal/${_portalToken}/quotes/${_sigQuoteId}/approve`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({signed_name:name,signature_data:_sigHasDrawn?_sigCanvas.toDataURL("image/png"):null}),
    });
    const d=await r.json();
    if(!r.ok) throw new Error(d.detail||"Erreur");
    closeSignatureModal();
    checkPortalView();
  }catch(e){alert(e.message);}
}
async function portalActOnQuote(quoteId){
  if(!confirm("Confirmer le refus de ce devis ?"))return;
  try{
    const r=await fetch(`${API_BASE}/portal/${_portalToken}/quotes/${quoteId}/reject`,{method:"POST"});
    const d=await r.json();
    if(!r.ok) throw new Error(d.detail||"Erreur");
    checkPortalView();
  }catch(e){alert(e.message);}
}

function showPeriodRange(id,period){
  const el=document.getElementById(id);if(!el)return;
  const days={week:7,month:30,quarter:90,year:365}[period]||30;
  const end=new Date(),start=new Date(end.getTime()-days*86400000);
  const f=d=>d.toLocaleDateString(State.lang==="ar"?"ar":State.lang,{day:"numeric",month:"short",year:"numeric"});
  el.textContent=`${t("period_range_prefix")} ${f(start)} → ${f(end)}`;
}
function markMissingField(el){
  el.classList.remove("inp-missing");void el.offsetWidth;el.classList.add("inp-missing");
  const clear=()=>{el.classList.remove("inp-missing");el.removeEventListener("input",clear);el.removeEventListener("change",clear);};
  el.addEventListener("input",clear);el.addEventListener("change",clear);
}
function findMissingRequired(container){
  const missing=[];
  container.querySelectorAll(".fgrp").forEach(g=>{
    if(g.offsetParent===null)return;
    const lbl=g.querySelector(".fl");
    const field=g.querySelector("input:not([type=hidden]):not([type=checkbox]):not([type=file]),select,textarea");
    if(!lbl||!field||field.disabled)return;
    if(!/\*\s*$/.test(lbl.textContent.trim()))return;
    if(!String(field.value||"").trim())missing.push(field);
  });
  return missing;
}
function flagMissingFields(fields){
  fields.forEach(markMissingField);
  const first=fields[0];
  first.scrollIntoView({behavior:"smooth",block:"center"});
  setTimeout(()=>{try{first.focus({preventScroll:true});}catch(_){}},300);
  showToast(fields.length>1?t("fill_missing_fields_n").replace("{n}",fields.length):t("fill_missing_field"),"error");
}
const SKIP_REQUIRED_CHECK=new Set(["submitAiQuote"]);
let _lastSubmitBtn=null;
document.addEventListener("click",e=>{
  const b=e.target.closest("button");
  if(b&&/\bsubmit[A-Za-z]*\s*\(/.test(b.getAttribute("onclick")||"")) _lastSubmitBtn=b;
},true);
function wrapSubmitHandler(name){
  const original=window[name];
  if(typeof original!=="function"||original._zdWrapped)return;
  const wrapped=async function(...args){
    const btn=_lastSubmitBtn;_lastSubmitBtn=null;
    const box=btn&&!SKIP_REQUIRED_CHECK.has(name)?(btn.closest(".modal")||btn.closest(".card")):null;
    document.querySelectorAll(".inp-missing").forEach(el=>{if(!box||!box.contains(el))el.classList.remove("inp-missing");});
    if(box){const missing=findMissingRequired(box);if(missing.length){flagMissingFields(missing);return;}}
    if(btn){
      if(btn.dataset.busy==="1")return;
      btn.dataset.busy="1";btn.disabled=true;btn.classList.add("btn-busy");
    }
    try{return await original.apply(this,args);}
    finally{if(btn){btn.dataset.busy="";btn.disabled=false;btn.classList.remove("btn-busy");}}
  };
  wrapped._zdWrapped=true;
  window[name]=wrapped;
}
Object.getOwnPropertyNames(window).filter(n=>/^submit[A-Z]/.test(n)).forEach(wrapSubmitHandler);
document.addEventListener("DOMContentLoaded",async ()=>{
  applyLanguage(State.lang);
  setTheme(State.theme);
  if(typeof abRenderRegRoles==="function")abRenderRegRoles();
  const isPortal=await checkPortalView();
  if(isPortal) return;
  if(await checkStaffView()) return;
  if(await checkPartnerView()) return;
  if(await checkShopView()) return;
  if(await checkBookingView()) return;
  if(typeof checkSectorPublicViews==="function"&&await checkSectorPublicViews()) return;
  prefillReferralFromUrl();
  const hasInvite=await checkPendingInvite();
  if(!hasInvite) checkPendingReferral();
  if(!hasInvite&&await checkAccountantInvite()) return;
  if(!hasInvite&&State.token&&State.tenant) showAppLayout();
  else if(!hasInvite&&!new URLSearchParams(window.location.search).get("ref")&&!new URLSearchParams(window.location.search).get("invite")) showLanding();
});
