// ── 10.7.2 · Notifications fortes : bannière dans l'appli, sonnerie du téléphone même appli ouverte,
// rappel si non lu, état de l'appareil, test en 5 secondes, guide des réglages du téléphone ──
const ZN={shown:new Set(),timer:null,bannerConv:null};

// Notifications en premier partout : inscription, Profil
(function(){
  if(typeof ZPERM==="object"&&Array.isArray(ZPERM)){
    const i=ZPERM.findIndex(p=>p.k==="push");
    if(i>0){const p=ZPERM.splice(i,1)[0];ZPERM.unshift(p);}
  }
  if(typeof zpermRowsHtml==="function"){
    const _h=zpermRowsHtml;
    zpermRowsHtml=function(states){
      const html=_h.apply(this,arguments);
      if(!states||states.push==="granted"||states.push==="unsupported")return html;
      return html.replace(`<b>${esc(t("zp_push"))}</b>`,`<b>${esc(t("zp_push"))} <span class="zn-rec">${esc(t("zn_rec"))}</span></b>`);
    };
  }
  if(typeof obPerm==="function"){
    const _o=obPerm;
    obPerm=async function(){
      await _o.apply(this,arguments);
      try{
        if(znPerm()!=="prompt")return;
        const card=document.querySelector("#zd-onb .zp-card");
        if(card&&!document.getElementById("zn-ob-why")){
          const w=document.createElement("div");w.id="zn-ob-why";w.className="zn-why";
          w.innerHTML=`<i class="ti ti-bell-ringing" aria-hidden="true"></i><span>${esc(t("zn_ob_why"))}</span>`;
          card.parentNode.insertBefore(w,card);
        }
      }catch(_){}
    };
  }
})();

function znPerm(){
  if(!("Notification" in window)||!("serviceWorker" in navigator)||!("PushManager" in window))return "unsupported";
  const p=Notification.permission;return p==="default"?"prompt":p;
}
function znViewingConv(id){
  return !!id&&id===(typeof _currentConvId!=="undefined"?_currentConvId:null)&&document.visibilityState==="visible"&&document.hasFocus()
    &&!!document.getElementById("page-messaging")?.classList.contains("active");
}

// Le téléphone demande « la personne lit-elle déjà cette discussion ? » avant de sonner
if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("message",e=>{
    const d=e.data||{};
    if(d.type==="zd-viewing?"){try{e.ports[0].postMessage({viewing:znViewingConv(d.conv_id)});}catch(_){}return;}
    if(d.type==="zd-push"){
      if(d.msg_id&&d.shown)ZN.shown.add(d.msg_id);
      if(d.test)znTestReceived();
    }
  });
}

// ── Bannière en haut de l'écran pour chaque message reçu ──
function znPreview(m){
  if(!m)return "";
  if(m.view_once||m.needs_reveal)return "👁️ "+t("zn_once");
  const ty=m.message_type;
  if(ty==="voice")return "🎤 "+t("zn_voice");
  if(ty==="location")return "📍 "+t("zn_loc");
  if(ty==="contact")return "👤 "+t("zn_contact");
  if(ty==="poll")return "📊 "+(m.content||"");
  if(ty==="file"){
    const n=String(m.file_name||"").toLowerCase(),cap=String(m.content||"").trim();
    const base=/\.(jpe?g|png|gif|webp|heic|heif|bmp)$/.test(n)?"📷 "+t("zn_photo"):/\.(mp4|mov|webm|m4v|3gp|mkv|avi)$/.test(n)?"🎥 "+t("zn_video"):"📎 "+(m.file_name||t("zn_file"));
    return cap?`${base} · ${cap}`:base;
  }
  return String(m.content||"").replace(/<[^>]*>/g,"").slice(0,160);
}
function znHide(){
  const b=document.getElementById("zn-banner");if(b){b.classList.remove("on");setTimeout(()=>{if(!b.classList.contains("on"))b.remove();},250);}
  clearTimeout(ZN.timer);ZN.bannerConv=null;
}
async function znCloseSystem(convId){
  try{const reg=await navigator.serviceWorker.getRegistration();if(!reg)return;(await reg.getNotifications({tag:"conv-"+convId})).forEach(n=>n.close());}catch(_){}
}
async function znOpen(reply){
  const c=ZN.bannerConv;znHide();if(!c)return;
  znCloseSystem(c);
  try{if(typeof openDeepLink==="function")await openDeepLink("messaging",c);}catch(_){}
  if(reply)setTimeout(()=>{const i=document.getElementById("chat-input");if(i)i.focus();},350);
}
function znBanner(m,title){
  let b=document.getElementById("zn-banner");
  if(!b){b=document.createElement("div");b.id="zn-banner";b.className="zn-banner";b.setAttribute("role","status");b.setAttribute("aria-live","polite");document.body.appendChild(b);}
  const name=title||m.sender_name||"?";
  const ini=(String(name).trim()[0]||"?").toUpperCase();
  b.innerHTML=`<div class="zn-top"><span class="zn-av" aria-hidden="true">${esc(ini)}</span>
    <button type="button" class="zn-body" onclick="znOpen(false)"><b>${esc(name)}</b><span>${esc(znPreview(m))}</span></button>
    <button type="button" class="zn-x" aria-label="${esc(t("zn_close"))}" onclick="znHide()"><i class="ti ti-x"></i></button></div>
    <div class="zn-acts"><button type="button" class="zn-rep" onclick="znOpen(true)"><i class="ti ti-arrow-back-up"></i> ${esc(t("zn_reply"))}</button><button type="button" class="zn-go" onclick="znOpen(false)">${esc(t("zn_open"))}</button></div>`;
  ZN.bannerConv=m.conversation_id;
  requestAnimationFrame(()=>b.classList.add("on"));
  clearTimeout(ZN.timer);ZN.timer=setTimeout(znHide,9000);
}

nfOnMessage=async function(msg){
  try{
    if(!msg||msg.sender_tenant_id===State.tenant?.id)return;
    if(msg.message_type==="call"||msg.message_type==="system"||msg.message_type==="ephemeral_gone")return;
    await nfLoad();
    let conv=(_conversations||[]).find(c=>c.id===msg.conversation_id);
    if(!conv){try{conv=(await api("GET","/messaging/conversations")).find(c=>c.id===msg.conversation_id);}catch(_){}}
    conv=conv||{};
    if(conv.request==="pending")return;
    const me=State.tenant?.id;const mentioned=(msg.mentions||[]).includes(me);
    if(conv.notify&&conv.notify.muted&&!mentioned)return;
    if(znViewingConv(msg.conversation_id))return;
    const cat=conv.is_group?"groups":"messages";
    const c=(_nf&&_nf.cats||{})[cat];
    if(!(c&&c.app===false))znBanner(msg,conv.is_group&&conv.name?`${msg.sender_name||"?"} · ${conv.name}`:null);
    setTimeout(()=>{if(!ZN.shown.has(msg.id))nfAlert(cat,conv.notify&&conv.notify.sound,conv.notify&&conv.notify.always_ring);},1600);
  }catch(_){}
};

// ── Abonnement du téléphone : refait tout seul si l'autorisation est donnée mais l'abonnement perdu ──
async function znEnsureSub(force){
  if(!State.token||znPerm()!=="granted")return false;
  try{
    const reg=await getSwRegistration();
    let sub=await reg.pushManager.getSubscription();
    let last=0;try{last=+localStorage.getItem("zd_zn_sync")||0;}catch(_){}
    if(!sub||force||Date.now()-last>6*3600*1000){
      if(sub){const st=await api("GET",`/push/devices?endpoint=${encodeURIComponent(sub.endpoint)}`);if(!st.this_device_registered)sub=null;}
      if(!sub||force)await subscribeCurrentDevice(reg);
      try{localStorage.setItem("zd_zn_sync",String(Date.now()));}catch(_){}
    }
    return true;
  }catch(e){return false;}
}

// ── Invitation pour les comptes qui n'ont jamais répondu à la question des notifications ──
function znNudge(){
  if(!State.token||znPerm()!=="prompt")return;
  if(document.getElementById("zd-onb")||document.getElementById("zn-nudge"))return;
  let until=0;try{until=+localStorage.getItem("zd_zn_nudge")||0;}catch(_){}
  if(Date.now()<until)return;
  const n=document.createElement("div");n.id="zn-nudge";n.className="zn-nudge";n.setAttribute("role","region");n.setAttribute("aria-label",t("zn_nudge_t"));
  n.innerHTML=`<i class="ti ti-bell-ringing" aria-hidden="true"></i><div class="zn-ntx"><b>${esc(t("zn_nudge_t"))}</b><small>${esc(t("zn_nudge_x"))}</small></div>
    <div class="zn-nb"><button type="button" class="btn btn-g btn-sm" onclick="znNudgeYes(this)">${esc(t("zn_enable"))}</button><button type="button" class="btn btn-o btn-sm" onclick="znNudgeLater()">${esc(t("ob_later"))}</button></div>`;
  document.body.appendChild(n);document.body.classList.add("zn-has-nudge");
}
async function znNudgeYes(b){
  if(b)b.disabled=true;
  const r=await zpermAsk("push");
  document.getElementById("zn-nudge")?.remove();document.body.classList.remove("zn-has-nudge");
  if(r==="granted"){await znEnsureSub(true);showToast(t("push_enabled"));}
  else if(r==="denied"){showToast(t("zn_denied_toast"),"error");}
}
function znNudgeLater(){try{localStorage.setItem("zd_zn_nudge",String(Date.now()+24*3600*1000));}catch(_){}document.getElementById("zn-nudge")?.remove();document.body.classList.remove("zn-has-nudge");}

setTimeout(()=>{if(State.token){znEnsureSub();znNudge();}},3500);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){znCheckTest();if(State.token)znEnsureSub();}});

// ── Test en 5 secondes et guide ──
function znLS(k,v){try{if(v===undefined)return localStorage.getItem(k);if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,String(v));}catch(_){return null;}}
function znTestReceived(){if(znLS("zd_zn_test_at")){znLS("zd_zn_test_ok",Date.now());znLS("zd_zn_test_fail",null);znLS("zd_zn_test_at",null);znRefreshTop();}}
async function znCheckTest(){
  const at=+znLS("zd_zn_test_at")||0;if(!at)return;
  try{const c=await caches.open("zdmeta");const r=await c.match("/__zd_test");if(r){const v=+(await r.text())||0;if(v>=at){znTestReceived();return;}}}catch(_){}
  if(Date.now()-at>25000){znLS("zd_zn_test_at",null);znLS("zd_zn_test_fail",Date.now());znLS("zd_zn_test_ok",null);znRefreshTop();znGuide(true);}
}
nfTest=async function(btn){
  nfUnlock();
  if(znPerm()==="unsupported"){znGuide(true);return;}
  if(znPerm()==="prompt"){const r=await zpermAsk("push");if(r!=="granted"){znRefreshTop();if(r==="denied")znGuide(true);return;}}
  if(znPerm()==="denied"){znGuide(true);return;}
  if(btn)btn.disabled=true;
  try{
    await znEnsureSub(true);
    const r=await api("POST","/push/test-delayed");
    if(r&&r.scheduled){znLS("zd_zn_test_at",Date.now());showToast(t("zn_test_lock"));setTimeout(znCheckTest,26000);}
    else{showToast(t("nf_test_nodev"),"error");znGuide(true);}
  }catch(e){showToast(e.message,"error");}
  znRefreshTop();
  setTimeout(()=>{if(btn)btn.disabled=false;},6000);
};
function znGuide(failed){
  const step=(n,a,b)=>`<div class="zn-step"><span>${n}</span><div><b>${esc(a)}</b><small>${esc(b)}</small></div></div>`;
  const den=znPerm()==="denied";
  zdModal("zn-guide",`<div class="modal-title"><i class="ti ti-bell-ringing" style="color:var(--green)"></i> ${esc(t("zn_guide_t"))}</div>
    ${failed?`<div class="zn-alert"><i class="ti ti-alert-triangle" aria-hidden="true"></i><span>${esc(t(den?"zn_guide_denied":"zn_guide_fail"))}</span></div>`:""}
    <div class="zn-gsec"><div class="zn-gh">Android</div>${step(1,t("zn_g_a1"),t("zn_g_a1x"))}${step(2,t("zn_g_a2"),t("zn_g_a2x"))}${step(3,t("zn_g_a3"),t("zn_g_a3x"))}</div>
    <div class="zn-gsec"><div class="zn-gh ios">iPhone</div>${step(1,t("zn_g_i1"),t("zn_g_i1x"))}</div>
    <div class="modal-foot" style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button type="button" class="btn btn-o" onclick="zdCloseModal('zn-guide')">${esc(t("zn_close"))}</button><button type="button" class="btn btn-g" onclick="zdCloseModal('zn-guide');nfTest(null)"><i class="ti ti-bell-ringing"></i> ${esc(t("zn_retest"))}</button></div>`,460);
}

// ── Profil → Notifications : force du signal, appli ouverte, rappel, état de l'appareil ──
async function znStatusHtml(){
  const p=znPerm();let reg=null;
  if(p==="granted"){
    try{const r=await navigator.serviceWorker.getRegistration();const s=r?await r.pushManager.getSubscription():null;
      if(s){const st=await api("GET",`/push/devices?endpoint=${encodeURIComponent(s.endpoint)}`);reg=!!st.this_device_registered;}else reg=false;}catch(_){reg=false;}
  }
  const ok=+znLS("zd_zn_test_ok")||0,fail=+znLS("zd_zn_test_fail")||0,pend=+znLS("zd_zn_test_at")||0;
  const row=(good,txt)=>`<div class="zn-st ${good===null?"wait":good?"ok":"no"}"><i class="ti ti-${good===null?"clock":good?"circle-check":"circle-x"}" aria-hidden="true"></i><span>${esc(txt)}</span></div>`;
  return row(p==="granted",t(p==="granted"?"zn_st_perm_ok":p==="denied"?"zn_st_perm_no":p==="unsupported"?"zn_st_unsup":"zn_st_perm_ask"))
    +(p==="granted"?row(reg,t(reg?"zn_st_reg_ok":"zn_st_reg_no")):"")
    +(pend?row(null,t("zn_st_test_wait")):ok&&ok>=fail?row(true,abTr("zn_st_test_ok",{d:fmtDate(new Date(ok).toISOString())})):fail?row(false,t("zn_st_test_no")):"");
}
async function znRefreshTop(){
  const box=document.getElementById("zn-status");if(!box)return;
  box.innerHTML=await znStatusHtml();
}
async function znSetStrong(b){
  try{_nf=await api("PUT","/profile/notifications/strong",b);_nfAt=Date.now();showToast(t("nf_saved"));}catch(e){showToast(e.message,"error");}
  nfRenderCard();
}
const _znRender=nfRenderCard;
nfRenderCard=async function(){
  await _znRender.apply(this,arguments);
  const card=document.querySelector("#nf-box .nf-card");if(!card||!_nf)return;
  card.querySelector(".nf-test")?.remove();
  const seg=[...card.querySelectorAll(".nf-seg")].find(x=>x.getAttribute("aria-label")===t("nf_vol_t"));
  if(seg){const h=seg.previousElementSibling,h2=h&&h.previousElementSibling;if(h&&h.classList.contains("nf-hint"))h.remove();if(h2&&h2.classList.contains("nf-h"))h2.remove();seg.remove();}
  const lv=nfVolLevel(),s=_nf;
  const top=document.createElement("div");top.className="zn-card";
  top.innerHTML=`<div class="zn-h">${esc(t("zn_force"))}</div>
    <div class="nf-seg zn-seg" role="radiogroup" aria-label="${esc(t("zn_force"))}">${["soft","normal","loud"].map(v=>`<button type="button" role="radio" aria-checked="${lv===v}" class="nf-sg${lv===v?" on":""}" onclick="nfSetVol('${v}')">${esc(t("zn_lvl_"+v))}</button>`).join("")}</div>
    <small class="nf-hint">${esc(t("zn_force_"+lv))}</small>
    <div class="nf-row"><div><b>${esc(t("zn_open_t"))}</b><small>${esc(t("zn_open_x"))}</small></div>${nfSwitch(s.app_open!==false,`znSetStrong({app_open:${s.app_open===false}})`,t("zn_open_t"))}</div>
    <div class="nf-row"><div><b>${esc(t("zn_rem_t"))}</b><small>${esc(t("zn_rem_x"))}</small></div>${nfSwitch(s.remind!==false,`znSetStrong({remind:${s.remind===false}})`,t("zn_rem_t"))}</div>
    <div class="zn-h">${esc(t("zn_status_t"))}</div>
    <div id="zn-status" class="zn-status"></div>
    <button type="button" class="btn btn-g zn-test" id="nf-test-btn" onclick="nfTest(this)"><i class="ti ti-bell-ringing"></i> ${esc(t("zn_test_btn"))}</button>
    <small class="nf-hint zn-c">${esc(t("zn_test_x"))}</small>
    <button type="button" class="zn-link" onclick="znGuide(false)">${esc(t("zn_guide_link"))}</button>`;
  card.insertBefore(top,card.firstChild);
  znRefreshTop();
};

// Revenir sur la discussion déjà ouverte la marque comme lue (et range ses notifications)
if(typeof navigate==="function"){
  const _znNav=navigate;
  navigate=function(p){
    const r=_znNav.apply(this,arguments);
    if(p==="messaging")setTimeout(znMarkOpen,350);
    return r;
  };
}
function znMarkOpen(){
  if(document.visibilityState!=="visible"||typeof _currentConvId==="undefined"||!_currentConvId)return;
  if(!document.getElementById("page-messaging")?.classList.contains("active"))return;
  const box=document.getElementById("chat-messages");if(!box||box.offsetParent===null)return;
  try{if(_ws&&_ws.readyState===1)_ws.send(JSON.stringify({type:"mark_read",conversation_id:_currentConvId}));}catch(_){}
  znCloseSystem(_currentConvId);
}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")znMarkOpen();});
