// ── 9.6.0 · Notifications sur chaque appareil, sons et chanson, réponse depuis la notification,
// suppression de discussions, page « Archivées et bloqués » ──
[typeof ZD_CLIENT_PAGES==="object"&&ZD_CLIENT_PAGES,typeof RESTRICTED_ALLOWED_PAGES==="object"&&RESTRICTED_ALLOWED_PAGES,typeof ES_FREE_PAGES==="object"&&ES_FREE_PAGES]
  .forEach(a=>{if(a&&!a.includes("msgarchive"))a.push("msgarchive");});
if(typeof PAGE_MODULES==="object"&&PAGE_MODULES.messaging)PAGE_MODULES.msgarchive=PAGE_MODULES.messaging;
const NF_CATS=["messages","groups","payments","bookings","stock","team","other"];
const NF_TONE_IDS=["zenith","goutte","clochette","caisse","marimba","douce","silence"];
let _nf=null,_nfAt=0;
async function nfLoad(force){
  if(!State.token)return null;
  if(_nf&&!force&&Date.now()-_nfAt<1200000)return _nf;
  try{_nf=await api("GET","/profile/notifications");_nfAt=Date.now();}catch(_){}
  return _nf;
}

// ── Sons : tonalités libres de droits (synthèse) et chanson de la personne ──
const NF_TONES={zenith:[["sine",880,0,.13],["sine",1320,.12,.24]],goutte:[["sine",1500,0,.07],["sine",760,.06,.16]],clochette:[["triangle",1568,0,.5],["triangle",2093,.1,.5]],
  caisse:[["square",1046,0,.06],["square",1318,.08,.06],["triangle",1568,.17,.32]],marimba:[["sine",523,0,.2],["sine",659,.13,.2],["sine",784,.26,.34]],douce:[["sine",440,0,.65],["sine",554,.22,.65]]};
let _nfCtx=null,_nfAudio=null,_nfAudioT=null;
function nfTone(id){
  const seq=NF_TONES[id];if(!seq)return;
  try{
    _nfCtx=_nfCtx||new (window.AudioContext||window.webkitAudioContext)();const ctx=_nfCtx;if(ctx.state==="suspended")ctx.resume();
    const t0=ctx.currentTime+.02;
    seq.forEach(([type,f,st,d])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;
      g.gain.setValueAtTime(0,t0+st);g.gain.linearRampToValueAtTime(type==="square"?.07:.2,t0+st+.015);g.gain.exponentialRampToValueAtTime(.0005,t0+st+d);
      o.connect(g);g.connect(ctx.destination);o.start(t0+st);o.stop(t0+st+d+.05);});
  }catch(_){}
}
function nfStop(){clearTimeout(_nfAudioT);if(_nfAudio){try{_nfAudio.pause();}catch(_){}}_nfAudio=null;}
function nfSong(start){
  const s=_nf&&_nf.song;if(!s||!s.url)return false;
  nfStop();
  const a=new Audio();a.preload="auto";a.src=s.url;_nfAudio=a;
  const from=start!=null?start:(s.start||0);
  a.addEventListener("loadedmetadata",()=>{try{a.currentTime=Math.min(from,Math.max(0,(a.duration||from+1)-0.5));}catch(_){}a.play().catch(()=>{});},{once:true});
  _nfAudioT=setTimeout(nfStop,10000);
  return true;
}
function nfPlay(id){
  if(!id||id==="silence")return;
  if(id==="song"){if(!nfSong())nfTone("zenith");return;}
  nfTone(id);
}
function nfHM(v){const m=/^(\d{1,2}):(\d{2})$/.exec(v||"");return m?(+m[1])*60+(+m[2]):null;}
function nfQuietNow(){
  const q=_nf&&_nf.quiet;if(!q||!q.on)return false;
  const a=nfHM(q.from),b=nfHM(q.to);if(a==null||b==null||a===b)return false;
  const d=new Date();const n=d.getHours()*60+d.getMinutes();
  return a<b?(n>=a&&n<b):(n>=a||n<b);
}
function nfVibrate(){try{if(_nf&&_nf.vibrate&&navigator.vibrate&&matchMedia("(pointer:coarse)").matches)navigator.vibrate([120,60,120]);}catch(_){}}
function nfAlert(cat,sound,alwaysRing){
  if(!_nf)return;
  const c=(_nf.cats||{})[cat];if(c&&c.app===false)return;
  if(nfQuietNow()&&!alwaysRing)return;
  nfPlay(sound||(c&&c.sound)||"zenith");nfVibrate();
}

// Messages reçus pendant que l'application est ouverte
if(typeof handleIncomingMessage==="function"){
  const _nfHIM=handleIncomingMessage;
  handleIncomingMessage=function(msg){
    const r=_nfHIM.apply(this,arguments);
    nfOnMessage(msg);
    return r;
  };
}
async function nfOnMessage(msg){
  try{
    if(!msg||msg.sender_tenant_id===State.tenant?.id)return;
    await nfLoad();
    let conv=(_conversations||[]).find(c=>c.id===msg.conversation_id);
    if(!conv){try{conv=(await api("GET","/messaging/conversations")).find(c=>c.id===msg.conversation_id);}catch(_){}}
    conv=conv||{};
    if(conv.request==="pending")return;
    const me=State.tenant?.id;const mentioned=(msg.mentions||[]).includes(me);
    if(conv.notify&&conv.notify.muted&&!mentioned)return;
    if(msg.conversation_id===_currentConvId&&document.getElementById("page-messaging")?.classList.contains("active")&&document.visibilityState==="visible"&&document.hasFocus())return;
    nfAlert(conv.is_group?"groups":"messages",conv.notify&&conv.notify.sound,conv.notify&&conv.notify.always_ring);
  }catch(_){}
}

// ── Présence par appareil : l'appareil que tu regardes ne sonne pas, les autres oui ──
let _nfEp=null,_nfEpAt=0;
async function nfEndpoint(){
  if(Date.now()-_nfEpAt<60000)return _nfEp;
  _nfEpAt=Date.now();
  try{const reg=navigator.serviceWorker?await navigator.serviceWorker.getRegistration():null;const sub=reg?await reg.pushManager.getSubscription():null;_nfEp=sub?sub.endpoint:null;}catch(_){_nfEp=null;}
  return _nfEp;
}
async function nfPresence(vis){
  if(!State.token)return;
  const ep=await nfEndpoint();if(!ep)return;
  const v=vis===undefined?(document.visibilityState==="visible"&&document.hasFocus()):vis;
  try{await fetch(`${API_BASE}/push/presence`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${State.token}`},body:JSON.stringify({endpoint:ep,visible:v}),keepalive:true});}catch(_){}
}
document.addEventListener("visibilitychange",()=>{nfPresence();if(document.visibilityState==="visible")nfPulse();});
window.addEventListener("focus",()=>nfPresence(true));
window.addEventListener("blur",()=>nfPresence(false));
window.addEventListener("pagehide",()=>{nfPresence(false);nfFlushKeepalive();});
setInterval(()=>{if(document.visibilityState==="visible"&&document.hasFocus())nfPresence(true);},40000);
if(typeof togglePushNotifications==="function"){
  const _nfTP=togglePushNotifications;
  togglePushNotifications=async function(){const r=await _nfTP.apply(this,arguments);_nfEpAt=0;nfPresence();return r;};
}

// ── La cloche en direct ──
let _nfSince=null,_nfBusy=false;
function nfBadge(n){const b=document.getElementById("notif-badge");if(b){b.textContent=n;b.style.display=n>0?"inline":"none";}}
async function nfPulse(){
  if(!State.token||_nfBusy||document.visibilityState!=="visible")return;
  _nfBusy=true;
  try{
    const r=await api("GET","/notifications/pulse"+(_nfSince?`?since=${encodeURIComponent(_nfSince)}`:""));
    if(r&&typeof r.unread==="number"){
      nfBadge(r.unread);
      if(_nfSince&&r.new&&r.new.length){
        await nfLoad();
        const n=r.new[0];showToast(`🔔 ${n.title}${n.message?" — "+n.message:""}`);
        nfAlert(n.cat==="security"?"other":n.cat);
        if(document.getElementById("page-notifications")?.classList.contains("active"))loadNotifications();
      }
      const mods=r.special_modules||{};
      if(State.tenant&&JSON.stringify(mods)!==JSON.stringify(State.tenant.special_modules||{})){
        State.tenant.special_modules=mods;try{localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));}catch(_){}
        if(typeof zdRenderSpecialNav==="function")zdRenderSpecialNav();
        if(!mods.carts&&!State.tenant.is_creator&&document.getElementById("page-carts")?.classList.contains("active"))navigate("dashboard");
      }
      _nfSince=r.now;
    }
  }catch(_){}finally{_nfBusy=false;}
}
setInterval(nfPulse,30000);
setTimeout(()=>{if(State.token){nfLoad();nfPulse();nfPresence();}},2500);
if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",e=>{if(e.data&&e.data.type==="zd-push")setTimeout(nfPulse,600);});
function nfAttachWS(){
  if(!_ws||_ws._nf)return;
  _ws._nf=true;
  _ws.addEventListener("message",ev=>{
    let d=null;try{d=JSON.parse(ev.data);}catch(_){return;}
    if(d.type==="notification")setTimeout(nfPulse,900);
    else if(d.type==="reaction"&&d.conversation_id===_currentConvId)openConversation(_currentConvId,document.getElementById("chat-header-name")?.textContent||"");
  });
}
if(typeof connectMessagingWS==="function"){
  const _nfCW=connectMessagingWS;
  connectMessagingWS=function(){const r=_nfCW.apply(this,arguments);nfAttachWS();return r;};
}
nfAttachWS();setTimeout(nfAttachWS,2600);

// La liste des notifications : chaque notification ouvre sa page
loadNotifications=async function(){
  try{
    const notifs=await api("GET","/notifications");
    const container=document.getElementById("notifs-list");
    nfBadge(notifs.filter(n=>!n.is_read).length);
    if(!container)return;
    if(!notifs?.length){container.innerHTML=`<div style="text-align:center;padding:32px;color:var(--muted)">${t("no_notifications")}</div>`;return;}
    const colors={info:"var(--blue)",warning:"var(--amber)",success:"var(--green)",error:"var(--red)"};
    container.innerHTML=notifs.map(n=>{const c=colors[n.type]||"var(--blue)";
      return `<div class="nf-item${n.is_read?" read":""}" style="--c:${c}" role="button" tabindex="0" data-id="${esc(n.id)}" data-link="${esc(n.link||"")}">
        <span class="nf-dot" aria-hidden="true"></span>
        <div class="nf-txt"><div class="nf-t">${esc(n.title)}</div><div class="nf-m">${esc(n.message)}</div><div class="nf-d">${fmtDate(n.created_at)}</div></div>
        <span class="nf-open">${n.link?`${esc(t("nf_open"))} <i class="ti ti-chevron-right" aria-hidden="true"></i>`:""}</span>
        ${!n.is_read?`<button type="button" class="btn btn-sm btn-o nf-read" data-read="${esc(n.id)}">${t("btn_read")}</button>`:""}</div>`;}).join("");
    container.querySelectorAll(".nf-item").forEach(el=>{
      const go=()=>nfOpenNotif(el.dataset.id,el.dataset.link);
      el.addEventListener("click",e=>{if(e.target.closest(".nf-read"))return;go();});
      el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go();}});
    });
    container.querySelectorAll(".nf-read").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();markNotifRead(b.dataset.read);}));
  }catch(e){showToast(e.message||"Erreur","error");}
};
async function nfOpenNotif(id,link){
  try{await api("PATCH",`/notifications/${id}/read`);}catch(_){}
  if(!link){loadNotifications();return;}
  let p="dashboard",c=null;try{const u=new URL(link,location.origin);p=u.searchParams.get("p")||"dashboard";c=u.searchParams.get("c");}catch(_){}
  if(p==="carts"||p==="dashboard"){try{const fresh=await api("GET","/profile/");if(fresh){State.tenant={...State.tenant,...fresh};localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));}}catch(_){}if(typeof zdRenderSpecialNav==="function")zdRenderSpecialNav();}
  let done=false;if(typeof openDeepLink==="function"){try{done=await openDeepLink(p,c);}catch(_){}}
  if(!done)navigate(p);
}

// ── Profil → Notifications ──
if(typeof loadPrivacyCard==="function"){
  const _nfLP=loadPrivacyCard;
  loadPrivacyCard=async function(){await _nfLP.apply(this,arguments);nfRenderCard(true);};
}
function nfSwitch(on,click,label,dis){return `<button type="button" class="nf-sw${on?" on":""}" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}" onclick="${click}" ${dis||""}><span></span></button>`;}
function nfSoundOpts(sel,withDefault){
  const ids=[...NF_TONE_IDS];if(_nf&&_nf.song)ids.splice(ids.length-1,0,"song");
  return (withDefault?`<option value="default"${!sel?" selected":""}>${esc(t("nf_snd_default"))}</option>`:"")+ids.map(i=>`<option value="${i}"${i===sel?" selected":""}>${esc(i==="song"?(_nf.song.name||t("nf_snd_song")):t("nf_snd_"+i))}</option>`).join("");
}
async function nfRenderCard(force){
  const anchor=document.getElementById("push-toggle-btn");if(!anchor)return;
  const card=anchor.closest(".card");if(!card)return;
  let box=document.getElementById("nf-box");if(!box){box=document.createElement("div");box.id="nf-box";card.appendChild(box);}
  const s=await nfLoad(force);if(!s){box.innerHTML="";return;}
  const fmtS=v=>{v=Math.max(0,Math.round(v||0));return `${Math.floor(v/60)}:${String(v%60).padStart(2,"0")}`;};
  const song=s.song;
  box.innerHTML=`<div class="nf-card">
    <div class="nf-row"><div><b>${esc(t("nf_phone"))}</b><small>${esc(t("nf_phone_x"))}</small></div>${nfSwitch(s.phone,"nfSet({phone:!_nf.phone})",t("nf_phone"))}</div>
    <div class="nf-row"><div><b>${esc(t("nf_vibrate"))}</b></div>${nfSwitch(s.vibrate,"nfSet({vibrate:!_nf.vibrate})",t("nf_vibrate"))}</div>
    <div class="nf-h">${esc(t("nf_what"))}</div>
    <div class="nf-cats">${NF_CATS.map(c=>{const v=s.cats[c];return `<div class="nf-cat"><div class="nf-cn"><b>${esc(t("nf_cat_"+c))}</b></div>
      <div class="nf-chips"><button type="button" class="nf-chip${v.push?" on":""}" aria-pressed="${v.push}" onclick="nfSetCat('${c}',{push:${!v.push}})">${esc(t("nf_where_phone"))}</button><button type="button" class="nf-chip${v.app?" on":""}" aria-pressed="${v.app}" onclick="nfSetCat('${c}',{app:${!v.app}})">${esc(t("nf_where_app"))}</button></div>
      <div class="nf-snd"><select class="inp" aria-label="${esc(t("nf_sound"))} — ${esc(t("nf_cat_"+c))}" onchange="nfSetCat('${c}',{sound:this.value});nfPlay(this.value)">${nfSoundOpts(v.sound)}</select><button type="button" class="nf-play" aria-label="${esc(t("nf_listen"))}" onclick="nfPlay(_nf.cats['${c}'].sound)"><i class="ti ti-player-play"></i></button></div></div>`;}).join("")}
      <div class="nf-cat nf-lock"><div class="nf-cn"><b>${esc(t("nf_cat_security"))}</b></div><small>${esc(t("nf_always_sent"))}</small></div></div>
    <div class="nf-h">${esc(t("nf_quiet"))}</div>
    <div class="nf-row"><div><b>${esc(t("nf_quiet_on"))}</b><small>${esc(t("nf_quiet_x"))}</small></div>${nfSwitch(s.quiet.on,"nfQuietToggle()",t("nf_quiet_on"))}</div>
    <div class="nf-quiet"><label>${esc(t("nf_from"))}<input class="inp" type="time" id="nf-qf" value="${esc(s.quiet.from||"")}" onchange="nfQuietSave()"></label><label>${esc(t("nf_to"))}<input class="inp" type="time" id="nf-qt" value="${esc(s.quiet.to||"")}" onchange="nfQuietSave()"></label><small>${esc(t("su_example").replace("{v}","22:00 → 06:00"))}</small></div>
    <div class="nf-h">${esc(t("nf_quick"))}</div>
    <div class="nf-reacts" role="group" aria-label="${esc(t("nf_quick"))}">${s.reactions.map(e=>`<button type="button" class="nf-re${e===s.quick_reaction?" on":""}" aria-pressed="${e===s.quick_reaction}" onclick="nfSet({quick_reaction:'${e}'})">${e}</button>`).join("")}</div>
    <small class="nf-hint">${esc(t("nf_quick_x"))}</small>
    <div class="nf-h">${esc(t("nf_song"))}</div>
    ${song?`<div class="nf-song"><i class="ti ti-music" aria-hidden="true"></i><div class="nf-sn"><b>${esc(song.name)}</b><small>${song.duration?fmtS(song.duration)+" · ":""}${(song.size/1048576).toFixed(1).replace(".",",")} Mo</small></div><button type="button" class="btn btn-o btn-sm" onclick="nfSongDel()">${esc(t("nf_song_remove"))}</button></div>
      <div class="nf-ex">${esc(abTr("nf_song_part",{a:fmtS(song.start),b:fmtS((song.start||0)+10)}))}</div>
      <div class="nf-exb"><button type="button" class="btn btn-o btn-sm" onclick="nfSongShift(-5)">−5 s</button><button type="button" class="btn btn-o btn-sm" onclick="nfSongShift(5)">+5 s</button><button type="button" class="btn btn-g btn-sm" onclick="nfSong()"><i class="ti ti-player-play"></i> ${esc(t("nf_listen"))}</button></div>`
     :`<label class="btn btn-o btn-sm nf-up"><i class="ti ti-upload"></i> ${esc(t("nf_song_add"))}<input type="file" accept=".mp3,.m4a,.ogg,.wav,.webm,audio/*" onchange="nfSongUp(this.files[0])"></label><small class="nf-hint">${esc(t("nf_song_x"))}</small>`}
    <small class="nf-hint">${esc(t("nf_limit"))}</small>
  </div>`;
}
async function nfSet(b){
  try{_nf=await api("PUT","/profile/notifications",b);_nfAt=Date.now();showToast(t("nf_saved"));}catch(e){showToast(e.message,"error");}
  nfRenderCard();
}
function nfSetCat(c,v){return nfSet({cats:{[c]:v}});}
function nfQuietToggle(){
  const on=!_nf.quiet.on;const f=zdVal("nf-qf"),to=zdVal("nf-qt");
  if(on&&(!f||!to)){flagMissingFields([!f?document.getElementById("nf-qf"):null,!to?document.getElementById("nf-qt"):null].filter(Boolean));showToast(t("nf_quiet_need"),"error");return;}
  nfSet({quiet:{on,from:f,to},tz_offset_min:-new Date().getTimezoneOffset()});
}
function nfQuietSave(){
  const f=zdVal("nf-qf"),to=zdVal("nf-qt");if(!f||!to)return;
  nfSet({quiet:{from:f,to,on:_nf.quiet.on},tz_offset_min:-new Date().getTimezoneOffset()});
}
async function nfSongUp(file){
  if(!file)return;
  if(file.size>5*1024*1024){showToast(t("nf_song_big"),"error");return;}
  const fd=new FormData();fd.append("file",file);
  try{
    _nf=await apiUpload("/profile/notifications/song",fd);
    const a=new Audio();a.preload="metadata";a.src=_nf.song.url;
    a.addEventListener("loadedmetadata",async()=>{if(isFinite(a.duration)){try{_nf=await api("PUT","/profile/notifications",{song_duration:a.duration});}catch(_){}nfRenderCard();}},{once:true});
    showToast(t("nf_song_added"));
  }catch(e){showToast(e.message,"error");}
  nfRenderCard();
}
async function nfSongShift(d){
  const s=_nf.song;if(!s)return;
  const max=s.duration?Math.max(0,s.duration-10):Infinity;const st=Math.min(max,Math.max(0,(s.start||0)+d));
  try{_nf=await api("PUT","/profile/notifications",{song_start:st});}catch(e){showToast(e.message,"error");}
  nfRenderCard();nfSong();
}
async function nfSongDel(){
  if(!confirm(t("nf_song_remove_q")))return;
  try{_nf=await api("DELETE","/profile/notifications/song");showToast(t("nf_saved"));}catch(e){showToast(e.message,"error");}
  nfStop();nfRenderCard();
}

// ── Réglages d'une discussion ──
function nfCurConv(){return (_conversations||[]).find(c=>c.id===_currentConvId);}
async function nfConvModal(){
  const c=nfCurConv();if(!c)return;await nfLoad();
  const n=c.notify||{};const mute=n.muted?(n.mute_until?"timed":"always"):"off";
  zdModal("modal-nf-conv",`<div class="modal-title"><i class="ti ti-bell-cog" style="color:var(--green)"></i> ${esc(t("nf_conv_t"))}</div>
    <div style="font-size:12.5px;color:var(--muted);margin:-4px 0 12px">${esc(c.name)}</div>
    <div class="fgrp"><label class="fl" for="nfc-snd">${esc(t("nf_conv_sound"))}</label><div class="nf-snd"><select class="inp" id="nfc-snd">${nfSoundOpts(n.sound,true)}</select><button type="button" class="nf-play" aria-label="${esc(t("nf_listen"))}" onclick="const v=zdVal('nfc-snd');nfPlay(v==='default'?(_nf.cats[nfCurConv()?.is_group?'groups':'messages'].sound):v)"><i class="ti ti-player-play"></i></button></div></div>
    <label class="nf-row" style="cursor:pointer"><div><b>${esc(t("nf_always"))}</b><small>${esc(t("nf_always_x"))}</small></div><input type="checkbox" id="nfc-ar" ${n.always_ring?"checked":""} style="width:20px;height:20px;accent-color:var(--green)"></label>
    <div class="fgrp" style="margin-top:10px"><div class="fl">${esc(t("nf_mute"))}</div><div class="nf-mutes">${["off","1h","8h","1w","always"].map(k=>`<label class="nf-mt"><input type="radio" name="nfc-mute" value="${k}" ${k===mute?"checked":""}> ${esc(t("nf_mute_"+k))}</label>`).join("")}</div>
      ${mute==="timed"?`<small class="nf-hint">${esc(abTr("nf_mute_until",{d:fmtDate(n.mute_until)}))}</small>`:""}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-nf-conv')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="nfConvSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,460);
}
async function nfConvSave(){
  const c=nfCurConv();if(!c)return;
  const body={sound:zdVal("nfc-snd")||"default",always_ring:document.getElementById("nfc-ar").checked};
  const m=document.querySelector("input[name=nfc-mute]:checked");if(m)body.mute=m.value;
  try{c.notify=await api("PUT",`/messaging/conversations/${c.id}/notify`,body);c.muted=c.notify.muted;zdCloseModal("modal-nf-conv");showToast(t("nf_saved"));if(typeof updateMuteArchiveIcons==="function")updateMuteArchiveIcons();}
  catch(e){showToast(e.message,"error");}
}
async function nfClearConv(){
  const c=nfCurConv();if(!c||!confirm(abTr("nf_clear_q",{n:c.name})))return;
  try{await api("POST",`/messaging/conversations/${c.id}/clear`);document.getElementById("chat-more-menu").style.display="none";await loadConversations();openConversation(c.id,c.name);showToast(t("nf_cleared"));}
  catch(e){showToast(e.message,"error");}
}
if(typeof openConversation==="function"){
  const _nfOC=openConversation;
  openConversation=async function(convId,name){
    const r=await _nfOC.apply(this,arguments);
    const c=(_conversations||[]).find(x=>x.id===convId);
    const lbl=document.getElementById("nf-menu-del-l");if(lbl)lbl.textContent=t(c&&c.is_group?"nf_leave_del":"nf_del_conv");
    return r;
  };
}

// ── Supprimer des discussions (pour soi), avec 5 s pour annuler ──
const _nfSel=new Set();let _nfSelMode=false;const _nfHidden=new Set();let _nfPend=null;
function nfDeleteConvs(ids){
  const list=ids.map(id=>(_conversations||[]).find(c=>c.id===id)).filter(Boolean);if(!list.length)return;
  const one=list.length===1?list[0]:null;const group=one&&one.is_group;const anyGroup=list.some(c=>c.is_group);
  const title=one?(group?abTr("nf_del_group_t",{n:one.name}):abTr("nf_del_one_t",{n:one.name})):abTr("nf_del_n_t",{n:list.length});
  zdModal("modal-nf-del",`<div class="modal-title"><i class="ti ti-trash" style="color:var(--red)"></i> ${esc(title)}</div>
    <p style="font-size:13px;line-height:1.55;margin:0 0 10px">${esc(t(group?"nf_del_group_x":"nf_del_x"))}</p>
    ${anyGroup&&!one?`<p style="font-size:12.5px;color:var(--muted);margin:0 0 10px">${esc(t("nf_del_groups_note"))}</p>`:""}
    ${one&&!group&&one.other_tenant_id?`<label style="display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer"><input type="checkbox" id="nf-del-block" style="width:18px;height:18px"> ${esc(abTr("nf_del_block",{n:one.name}))}</label>`:""}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-nf-del')">${esc(t("btn_cancel"))}</button><button class="btn btn-r btn-sm" id="nf-del-go"><i class="ti ti-trash"></i> ${esc(t(group?"nf_leave_del":"nf_del_btn"))}</button></div>`,440);
  document.getElementById("nf-del-go").onclick=()=>{
    const block=document.getElementById("nf-del-block")?.checked?one.other_tenant_id:null;
    zdCloseModal("modal-nf-del");nfQueueDelete(ids,block);
  };
}
function nfQueueDelete(ids,blockId){
  nfFlush();
  ids.forEach(id=>_nfHidden.add(id));nfSelEnd();
  if(ids.includes(_currentConvId)){
    document.getElementById("chat-active").style.display="none";const es=document.getElementById("chat-empty-state");if(es)es.style.display="flex";
    if(typeof backToConvList==="function")backToConvList();
  }
  _nfPend={ids,blockId,timer:setTimeout(nfFlush,5000)};
  renderConvList();nfUndoBar(ids.length);
}
function nfUndoBar(n){
  let b=document.getElementById("nf-undo");
  if(!b){b=document.createElement("div");b.id="nf-undo";b.className="nf-undo";b.setAttribute("role","status");document.body.appendChild(b);}
  b.innerHTML=`<i class="ti ti-circle-check" aria-hidden="true"></i><span>${esc(n>1?abTr("nf_deleted_n",{n}):t("nf_deleted_1"))}</span><button type="button" onclick="nfUndo()">${esc(t("nf_undo"))}</button>`;
  b.style.display="flex";
}
function nfHideUndo(){const b=document.getElementById("nf-undo");if(b)b.style.display="none";}
function nfUndo(){
  if(!_nfPend)return;clearTimeout(_nfPend.timer);_nfPend=null;_nfHidden.clear();nfHideUndo();renderConvList();showToast(t("nf_undone"));
}
async function nfFlush(){
  if(!_nfPend)return;const p=_nfPend;_nfPend=null;clearTimeout(p.timer);nfHideUndo();
  try{
    if(p.blockId)await api("POST","/messaging/block",{tenant_id:p.blockId});
    await api("POST","/messaging/conversations/delete",{ids:p.ids});
  }catch(e){showToast(e.message,"error");}
  p.ids.forEach(id=>_nfHidden.delete(id));
  try{await loadConversations();}catch(_){}
  nfArchCounts();
}
function nfFlushKeepalive(){
  if(!_nfPend||!State.token)return;const p=_nfPend;_nfPend=null;clearTimeout(p.timer);
  const h={"Content-Type":"application/json",Authorization:`Bearer ${State.token}`};
  try{
    if(p.blockId)fetch(`${API_BASE}/messaging/block`,{method:"POST",headers:h,body:JSON.stringify({tenant_id:p.blockId}),keepalive:true});
    fetch(`${API_BASE}/messaging/conversations/delete`,{method:"POST",headers:h,body:JSON.stringify({ids:p.ids}),keepalive:true});
  }catch(_){}
}
function nfSelStart(id){_nfSelMode=true;_nfSel.add(id);renderConvList();}
function nfSelEnd(){_nfSelMode=false;_nfSel.clear();const b=document.getElementById("nf-selbar");if(b)b.style.display="none";}
function nfSelToggle(id){if(_nfSel.has(id))_nfSel.delete(id);else _nfSel.add(id);if(!_nfSel.size)_nfSelMode=false;renderConvList();}
async function nfArchiveSel(){
  const ids=[..._nfSel];nfSelEnd();
  try{await Promise.all(ids.map(id=>api("POST",`/messaging/conversations/${id}/archive`)));showToast(abTr("nf_archived_n",{n:ids.length}));await loadConversations();nfArchCounts();}
  catch(e){showToast(e.message,"error");}
}
function nfSelBar(){
  const list=document.getElementById("conv-list");if(!list)return;
  let b=document.getElementById("nf-selbar");
  if(!b){b=document.createElement("div");b.id="nf-selbar";b.className="nf-selbar";list.parentNode.insertBefore(b,list);}
  if(!_nfSelMode||!_nfSel.size){b.style.display="none";return;}
  b.style.display="flex";
  b.innerHTML=`<button type="button" class="nf-ib" aria-label="${esc(t("nf_sel_cancel"))}" onclick="nfSelEnd();renderConvList()"><i class="ti ti-x"></i></button><b>${esc(abTr(_nfSel.size>1?"nf_sel_n":"nf_sel_1",{n:_nfSel.size}))}</b>
    <span style="margin-left:auto;display:flex;gap:2px"><button type="button" class="nf-ib" aria-label="${esc(t("nf_archive"))}" title="${esc(t("nf_archive"))}" onclick="nfArchiveSel()"><i class="ti ti-archive"></i></button><button type="button" class="nf-ib red" aria-label="${esc(t("nf_del_btn"))}" title="${esc(t("nf_del_btn"))}" onclick="nfDeleteConvs([..._nfSel])"><i class="ti ti-trash"></i></button></span>`;
}
if(typeof renderConvList==="function"){
  const _nfRCL=renderConvList;
  renderConvList=function(){
    const all=_conversations;
    if(_nfHidden.size)_conversations=all.filter(c=>!_nfHidden.has(c.id));
    try{_nfRCL.apply(this,arguments);}finally{_conversations=all;}
    nfSelBar();nfArchEntry();
    document.querySelectorAll('#conv-list > div[onclick^="openConversation("]').forEach(row=>{
      const m=/openConversation\('([^']+)'/.exec(row.getAttribute("onclick")||"");if(!m)return;const id=m[1];
      row.classList.add("nf-row-c");row.dataset.cid=id;
      if(_nfSelMode){
        row.removeAttribute("onclick");row.onclick=e=>{e.preventDefault();nfSelToggle(id);};
        row.classList.toggle("nf-on",_nfSel.has(id));row.setAttribute("aria-pressed",_nfSel.has(id));
      }else if(!row.querySelector(".nf-trash")){
        const b=document.createElement("button");b.type="button";b.className="nf-trash";b.setAttribute("aria-label",t("nf_del_btn"));b.title=t("nf_del_btn");b.innerHTML='<i class="ti ti-trash"></i>';
        b.addEventListener("click",e=>{e.stopPropagation();nfDeleteConvs([id]);});row.appendChild(b);
      }
      row.addEventListener("contextmenu",e=>{e.preventDefault();nfSelStart(id);});
      let lt=null,moved=false;
      row.addEventListener("touchstart",()=>{moved=false;lt=setTimeout(()=>{lt=null;if(!moved){row._nfLong=true;nfSelStart(id);}},550);},{passive:true});
      row.addEventListener("touchmove",()=>{moved=true;clearTimeout(lt);},{passive:true});
      row.addEventListener("touchend",e=>{clearTimeout(lt);if(row._nfLong){row._nfLong=false;e.preventDefault();}});
    });
  };
}

// ── Archivées et bloqués ──
let _nfArch={a:null,b:null};
async function nfArchCounts(){
  if(!State.token)return;
  try{const [all,bl]=await Promise.all([api("GET","/messaging/conversations?include_archived=true"),api("GET","/messaging/blocked")]);
    _nfArch={a:all.filter(c=>c.archived).length,b:bl.length};}catch(_){}
  nfArchEntry();
}
function nfArchEntry(){
  const list=document.getElementById("conv-list");if(!list||_nfArch.a==null)return;
  let e=document.getElementById("nf-arch-entry");
  if(!e){e=document.createElement("button");e.type="button";e.id="nf-arch-entry";e.className="dir-entry nf-arch-entry";e.onclick=()=>navigate("msgarchive");
    const anchor=document.getElementById("dir-entry")||list;anchor.parentNode.insertBefore(e,anchor);}
  e.innerHTML=`<i class="ti ti-archive" aria-hidden="true"></i> ${esc(abTr("nf_arch_entry",{a:_nfArch.a,b:_nfArch.b}))}<i class="ti ti-chevron-right" aria-hidden="true" style="margin-left:auto"></i>`;
}
if(typeof loadConversations==="function"){
  const _nfLC=loadConversations;let _nfLCAt=0;
  loadConversations=async function(){const r=await _nfLC.apply(this,arguments);if(Date.now()-_nfLCAt>20000){_nfLCAt=Date.now();nfArchCounts();}return r;};
}
let _nfArchTab="archived";
V93_PAGES.msgarchive=async function(){
  const el=ensureSectorPage("msgarchive");document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x===el));
  el.innerHTML=`<div class="card" style="text-align:center;color:var(--muted)">${esc(t("loading"))}</div>`;
  let all=[],bl=[];
  try{[all,bl]=await Promise.all([api("GET","/messaging/conversations?include_archived=true"),api("GET","/messaging/blocked")]);}catch(e){el.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;return;}
  const arch=all.filter(c=>c.archived);_nfArch={a:arch.length,b:bl.length};
  const av=(n,u)=>u?`<img class="nf-av" src="${esc(u)}" alt="">`:`<span class="nf-av" aria-hidden="true">${esc((n||"?").trim().charAt(0).toUpperCase())}</span>`;
  el.innerHTML=`<div class="sh"><div><button type="button" class="btn btn-o btn-sm" onclick="navigate('messaging')"><i class="ti ti-arrow-left"></i> ${esc(t("nf_back_msg"))}</button><div class="st" style="margin-top:10px">${esc(t("nf_arch_title"))}</div></div></div>
    <div class="nf-arch">
      <div class="nf-tabs" role="tablist"><button type="button" role="tab" aria-selected="${_nfArchTab==="archived"}" class="${_nfArchTab==="archived"?"on":""}" onclick="_nfArchTab='archived';V93_PAGES.msgarchive()">${esc(t("nf_tab_archived"))} <span>${arch.length}</span></button><button type="button" role="tab" aria-selected="${_nfArchTab==="blocked"}" class="${_nfArchTab==="blocked"?"on":""}" onclick="_nfArchTab='blocked';V93_PAGES.msgarchive()">${esc(t("nf_tab_blocked"))} <span>${bl.length}</span></button></div>
      <div class="card nf-alist">${_nfArchTab==="archived"?(arch.map(c=>`<div class="nf-arow"><button type="button" class="nf-aopen" onclick="nfOpenArchived('${esc(c.id)}')">${av(c.name,c.other_avatar_url)}<span class="nf-atx"><b>${esc(c.name)}</b><small>${esc(c.last_message||t("no_message"))}</small></span></button>
          <button type="button" class="btn btn-o btn-sm nf-g" onclick="nfUnarchive('${esc(c.id)}')">${esc(t("nf_unarchive"))}</button><button type="button" class="nf-ib red" aria-label="${esc(t("nf_del_btn"))}" onclick="nfDelArchived('${esc(c.id)}')"><i class="ti ti-trash"></i></button></div>`).join("")||`<div class="nf-empty">${esc(t("nf_no_archived"))}</div>`)+`<div class="nf-hint" style="padding:10px 4px 0">${esc(t("nf_arch_x"))}</div>`
        :(bl.map(b=>`<div class="nf-arow"><span class="nf-aopen">${av(b.name,b.avatar_url)}<span class="nf-atx"><b>${esc(b.name)}</b><small>${esc(abTr("nf_blocked_on",{d:fmtDate(b.blocked_at)}))}</small></span></span><button type="button" class="btn btn-o btn-sm" onclick="nfUnblock('${esc(b.id)}')">${esc(t("nf_unblock"))}</button></div>`).join("")||`<div class="nf-empty">${esc(t("nf_no_blocked"))}</div>`)+`<div class="nf-hint" style="padding:10px 4px 0">${esc(t("nf_blocked_x"))}</div>`}</div>
    </div>`;
};
async function nfOpenArchived(id){
  navigate("messaging");
  setTimeout(async()=>{try{_conversations=await api("GET","/messaging/conversations?include_archived=true");renderConvList();const c=_conversations.find(x=>x.id===id);openConversation(id,c?c.name:"");}catch(_){}},400);
}
async function nfUnarchive(id){try{await api("POST",`/messaging/conversations/${id}/unarchive`);showToast(t("nf_unarchived"));V93_PAGES.msgarchive();}catch(e){showToast(e.message,"error");}}
async function nfUnblock(tid){try{await api("POST","/messaging/unblock",{tenant_id:tid});showToast(t("nf_unblocked"));V93_PAGES.msgarchive();}catch(e){showToast(e.message,"error");}}
async function nfDelArchived(id){
  try{const all=await api("GET","/messaging/conversations?include_archived=true");const c=all.find(x=>x.id===id);if(c&&!(_conversations||[]).some(x=>x.id===id))_conversations=[...(_conversations||[]),c];}catch(_){}
  nfDeleteConvs([id]);
  const go=document.getElementById("nf-del-go");if(go){const f=go.onclick;go.onclick=async()=>{f();await nfFlush();V93_PAGES.msgarchive();};}
}

// ── Retrouver une personne par son nom ou son e-mail (comptes et clients) ──
function rcNorm(s){return String(s||"").toLowerCase().replace(/œ/g,"o").replace(/æ/g,"a").replace(/ø/g,"o").normalize("NFD").replace(/[̀-ͯ]/g,"");}
function rcMark(text,q){
  const s=String(text||"");const n=rcNorm(q);if(!n)return esc(s);
  let map=[],flat="";for(let i=0;i<s.length;i++){const p=rcNorm(s[i]);for(const ch of p){flat+=ch;map.push(i);}}
  const k=flat.indexOf(n);if(k<0)return esc(s);
  const a=map[k],b=map[k+n.length-1]+1;
  return esc(s.slice(0,a))+"<mark class=\"rc-mk\">"+esc(s.slice(a,b))+"</mark>"+esc(s.slice(b));
}
function rcRows(results,q,onPick){
  const acc=results.filter(u=>u.kind!=="client"),cli=results.filter(u=>u.kind==="client");
  const row=u=>{
    const can=!!u.id;
    const sub=[u.email,u.company_name].filter(Boolean).join(" · ");
    const chips=(u.is_contact?`<span class="rc-chip">${esc(t("rc_contact"))}</span>`:"")+(u.is_client?`<span class="rc-chip c">${esc(t("rc_client"))}</span>`:"")+(u.online?`<span class="rc-on">● ${esc(t("online_now"))}</span>`:"");
    return `<button type="button" class="rc-row${can?"":" off"}" data-id="${esc(u.id||"")}" data-name="${esc(u.name)}" data-cid="${esc(u.client_id||"")}">
      <span class="rc-av" aria-hidden="true">${esc((u.name||"?").trim().charAt(0).toUpperCase())}</span>
      <span class="rc-tx"><b>${rcMark(u.name,q)}</b>${sub?`<small>${rcMark(sub,q)}</small>`:""}${can?"":`<small class="rc-no">${esc(t("rc_noacc"))}</small>`}</span>
      <span class="rc-chips">${chips}</span></button>`;
  };
  return (acc.length?`<div class="rc-grp">${esc(t("rc_accounts"))}</div>${acc.map(row).join("")}`:"")+(cli.length?`<div class="rc-grp">${esc(t("rc_clients"))}</div>${cli.map(row).join("")}`:"");
}
function rcBind(box,onPick){
  box.querySelectorAll(".rc-row").forEach(b=>b.addEventListener("click",()=>{
    if(!b.dataset.id){showToast(abTr("rc_noacc_toast",{n:b.dataset.name}));return;}
    onPick(b.dataset.id,b.dataset.name);
  }));
}
searchUsers=async function(){
  const inp=document.getElementById("user-search-input");const box=document.getElementById("user-search-results");if(!inp||!box)return;
  const q=inp.value.trim();
  if(q.length<2){box.innerHTML="";return;}
  box.innerHTML=`<div class="rc-wait">${esc(t("searching"))}</div>`;
  let results=[];
  try{results=await api("GET",`/messaging/search-users?q=${encodeURIComponent(q)}`);}catch(e){box.innerHTML=`<div class="rc-err">${esc(e.message)}</div>`;return;}
  if(inp.value.trim()!==q)return;
  const group=typeof _convMode!=="undefined"&&_convMode==="group";
  box.innerHTML=results.length?rcRows(results,q):`<div class="rc-none">${esc(t("rc_none"))}</div>`;
  if(group){
    box.querySelectorAll(".rc-row").forEach(b=>{if(b.dataset.id&&_groupSelected.some(s=>s.id===b.dataset.id))b.classList.add("on");});
    rcBind(box,(id,name)=>{toggleGroupUser(id,name);});
  }else rcBind(box,(id,name)=>startConversationWith(id,name));
  box.insertAdjacentHTML("beforeend",`<button type="button" class="msg-dir-link" onclick="closeNewConvModal();navigate('directory')"><i class="ti ti-building-community" aria-hidden="true"></i> ${esc(t("msg_dir_link"))}</button>`);
};
if(typeof searchContactToShare==="function"){
  searchContactToShare=async function(){
    const q=document.getElementById("contact-picker-search").value.trim();
    const box=document.getElementById("contact-picker-results");
    if(q.length<2){box.innerHTML="";return;}
    try{
      const results=(await api("GET",`/messaging/search-users?q=${encodeURIComponent(q)}`)).filter(u=>u.id);
      box.innerHTML=results.length?rcRows(results,q):`<div class="rc-none">${esc(t("rc_none"))}</div>`;
      rcBind(box,(id,name)=>submitSharedContact(id,name));
    }catch(e){box.innerHTML=`<div class="rc-err">${esc(e.message)}</div>`;}
  };
}

// ── Admin : avec quelle formule chacun s'est inscrit ──
let _admUsers=[],_admFilter="all",_admSector="",_admRev=null;
function admSecName(k){return (t("sector_short_"+k)!=="sector_short_"+k&&t("sector_short_"+k))||k;}
function admTier(v){return (t("ab_tier_"+v)!=="ab_tier_"+v&&t("ab_tier_"+v))||v;}
function admKind(u){const c=u.sub_cycle||"monthly";if(c==="monthly"||c==="m1")return"monthly";if(c==="annual")return"annual";const m=/^m(\d+)$/.exec(c);if(m)return +m[1]>=12?"annual":"multi";return"monthly";}
function admCycleLabel(u){const c=u.sub_cycle||"monthly";if(c==="monthly"||c==="m1")return"Mensuel";if(c==="annual")return"Annuel";const m=/^m(\d+)$/.exec(c);return m?`${m[1]} mois`:c;}
function admMatch(u){
  if(u.is_creator)return _admFilter==="all"&&!_admSector;
  if(_admSector&&u.sector!==_admSector&&!(u.sector_extra||[]).includes(_admSector))return false;
  switch(_admFilter){
    case"trial":return u.status_key==="trial";
    case"expired":return u.status_key==="expired";
    case"monthly":return u.status_key==="sub"&&admKind(u)==="monthly";
    case"multi":return u.status_key==="sub"&&admKind(u)==="multi";
    case"annual":return u.status_key==="sub"&&admKind(u)==="annual";
    case"gift":return u.status_key==="gift";
    default:return true;
  }
}
function admCounts(){
  const us=_admUsers.filter(u=>!u.is_creator);
  const c={all:us.length,trial:0,expired:0,monthly:0,multi:0,annual:0,gift:0};
  us.forEach(u=>{if(u.status_key==="trial")c.trial++;else if(u.status_key==="expired")c.expired++;else if(u.status_key==="gift")c.gift++;else if(u.status_key==="sub")c[admKind(u)]++;});
  return c;
}
renderAdminStats=function(users){
  const box=document.getElementById("admin-stats-cards");if(!box)return;
  if(users)_admUsers=users;
  const c=admCounts();
  const money=_admRev?`${_admRev.total_usd.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})} $`:"…";
  box.className="adm-sum";box.removeAttribute("style");
  box.innerHTML=`<div class="adm-tile"><b>${c.all}</b><span>Inscrits (créateur exclu)</span></div>
    <div class="adm-tile a"><b>${c.trial}</b><span>En essai</span></div>
    <div class="adm-tile r"><b>${c.expired}</b><span>Essai expiré, sans abonnement</span></div>
    <div class="adm-tile g"><b>${c.monthly+c.multi+c.annual}</b><span>Abonnés : ${c.monthly} mensuel${c.monthly>1?"s":""}, ${c.annual} annuel${c.annual>1?"s":""}${c.multi?`, ${c.multi} sur quelques mois`:""}</span></div>
    <div class="adm-tile b"><b>${money}</b><span>Encaissé ce mois-ci${_admRev?` · ${_admRev.payments} paiement${_admRev.payments>1?"s":""}`:""}</span></div>
    ${c.gift?`<div class="adm-tile"><b>${c.gift}</b><span>Accès offerts</span></div>`:""}`;
};
function admFilters(){
  const tb=document.getElementById("admin-users-tbody");if(!tb)return;
  const wrap=tb.closest(".table-wrap");if(!wrap)return;
  let f=document.getElementById("adm-filters");
  if(!f){f=document.createElement("div");f.id="adm-filters";f.className="adm-filters";wrap.parentNode.insertBefore(f,wrap);}
  const c=admCounts();
  const secs=[...new Set(_admUsers.flatMap(u=>[u.sector,...(u.sector_extra||[])]).filter(Boolean))].sort((a,b)=>admSecName(a).localeCompare(admSecName(b)));
  const chip=(k,l,n)=>`<button type="button" class="adm-chip${_admFilter===k?" on":""}" aria-pressed="${_admFilter===k}" onclick="_admFilter='${k}';admRender()">${l} <em>${n}</em></button>`;
  f.innerHTML=chip("all","Tous",c.all)+chip("trial","Essai en cours",c.trial)+chip("expired","Essai expiré",c.expired)+chip("monthly","Abonnés mensuels",c.monthly)+(c.multi?chip("multi","Abonnés sur quelques mois",c.multi):"")+chip("annual","Abonnés annuels (12 mois et plus)",c.annual)+(c.gift?chip("gift","Accès offerts",c.gift):"")
    +`<select class="adm-sel" id="adm-sector" aria-label="Secteur" onchange="_admSector=this.value;admRender()"><option value="">Tous les secteurs</option>${secs.map(s=>`<option value="${esc(s)}"${s===_admSector?" selected":""}>${esc(admSecName(s))}</option>`).join("")}</select>`;
}
function admFormula(u){
  const pill=(cls,txt)=>`<span class="adm-pill ${cls}">${esc(txt)}</span>`;
  switch(u.status_key){
    case"creator":return pill("p-sub","Créateur");
    case"client":return pill("p-cli","Compte client (gratuit)");
    case"sub":{
      const src=Object.keys(u.paid_sectors||{}).length?u.paid_sectors:(u.entitled||{});
      const txt=Object.entries(src).sort((x,y)=>(x[0]===u.sector?-1:0)-(y[0]===u.sector?-1:0)).map(([k,v])=>admSecName(k)+" "+admTier(v)).join(" + ")||u.plan_label||u.subscribed_plan||"Abonné";
      return pill("p-sub",txt)+(u.deal_pct?` <span class="adm-note">remise ${u.deal_pct} %</span>`:"")+(Object.keys(u.gifted_sectors||{}).length?` <span class="adm-note">+ offert : ${esc(Object.entries(u.gifted_sectors).map(([k,v])=>admSecName(k)+" "+admTier(v)).join(", "))}</span>`:"");
    }
    case"gift":return pill("p-gift","Offert : "+Object.entries(u.gifted_sectors||{}).map(([k,v])=>admSecName(k)+" "+admTier(v)).join(" + "));
    case"trial":{
      const ms=u.trial_expires_at?parseServerDate(u.trial_expires_at)-new Date():null;
      const d=ms!=null?Math.max(0,Math.ceil(ms/86400000)):u.trial_days_remaining;
      return pill("p-trial",`Essai · ${d} j restant${d>1?"s":""}`);
    }
    case"expired":return pill("p-exp","Essai expiré");
    case"sandbox":return pill("p-cli","Gratuit");
    default:return planBadge(u.plan);
  }
}
function admRender(){
  const tb=document.getElementById("admin-users-tbody");if(!tb)return;
  const table=tb.closest("table");
  const th=table&&table.querySelector("thead");
  if(th)th.innerHTML=`<tr><th>Nom</th><th>Secteur à l'inscription</th><th>Formule</th><th>Cycle</th><th>Montant</th><th>Payé le</th><th>Fin / renouvellement</th><th>Inscrit le</th><th>Dernière visite</th><th>Pays</th><th>Statut</th><th>Actions</th></tr>`;
  admFilters();
  const list=_admUsers.filter(admMatch);
  if(!list.length){tb.innerHTML=`<tr><td colspan="12" style="text-align:center;color:var(--muted);padding:24px">Aucun compte dans ce filtre.</td></tr>`;return;}
  const dash='<span class="adm-mut">—</span>';
  tb.innerHTML=list.map(u=>{
    const sec=u.sector?`<span class="adm-sec">${esc(admSecName(u.sector))}${(u.sector_extra||[]).length?` <span class="adm-mut">+ ${esc(u.sector_extra.map(admSecName).join(", "))}</span>`:""}</span>`:(u.account_type==="client"||u.is_creator?dash:'<span class="adm-mut">Pas encore choisi</span>');
    const isSub=u.status_key==="sub";
    const cyc=isSub?`<span class="adm-pill p-cyc">${admCycleLabel(u)}</span>`:dash;
    const amt=isSub&&u.sub_price!=null?`${u.sub_price.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})} $`:dash;
    const paid=isSub&&u.sub_paid_at?fmtDate(u.sub_paid_at):dash;
    const end=isSub&&u.sub_expires_at?fmtDate(u.sub_expires_at):((u.status_key==="trial"||u.status_key==="expired")&&u.trial_expires_at?`${fmtDate(u.trial_expires_at)} <span class="adm-mut">(fin d'essai)</span>`:dash);
    return `<tr>
      <td class="adm-nm"><b>${esc(u.name)}</b>${u.is_creator?' <span class="badge bgold">CRÉATEUR</span>':''}${u.has_deal?' <span class="badge bp" title="Remise personnalisée">REMISE</span>':''}${u.has_gifts?' <span class="badge bp" title="Accès offert">OFFERT</span>':''}${u.filleuls?` <span class="badge bg" title="Filleuls">${u.filleuls} filleul${u.filleuls>1?"s":""}</span>`:''}<small>${esc(u.email)}</small></td>
      <td>${sec}</td><td>${admFormula(u)}</td><td>${cyc}</td>
      <td class="adm-num">${amt}</td><td class="adm-num">${paid}</td><td class="adm-num">${end}</td>
      <td class="adm-num">${fmtDate(u.created_at)}</td><td class="adm-num">${fmtDate(u.last_seen_at)}</td>
      <td>${esc(u.country)||"—"}</td>
      <td>${u.is_active?'<span class="badge bg">Actif</span>':'<span class="badge br">Banni</span>'}</td>
      <td><div class="adm-act">
        ${u.is_creator?"":`<button class="btn btn-sm btn-g" onclick="abAdminOffer('${u.id}')"><i class="ti ti-discount-2"></i> Conditions</button>`}
        ${u.is_creator?"":`<button class="btn btn-sm btn-b" onclick="resetTrial('${u.id}','${escJs(u.name)}')"><i class="ti ti-clock-play"></i> Renouveler essai</button>`}
        ${u.is_creator?"":u.is_active?`<button class="btn btn-sm btn-r" onclick="banUser('${u.id}','${escJs(u.name)}')"><i class="ti ti-ban"></i> Bannir</button>`:`<button class="btn btn-sm btn-g" onclick="unbanUser('${u.id}','${escJs(u.name)}')"><i class="ti ti-check"></i> Débannir</button>`}
        ${u.is_creator?"":`<button class="btn btn-sm btn-o" aria-label="Supprimer" onclick="deleteUser('${u.id}','${escJs(u.name)}')"><i class="ti ti-trash"></i></button>`}
      </div></td></tr>`;
  }).join("");
}
loadAdminUsers=async function(){
  const tb=document.getElementById("admin-users-tbody");if(!tb)return;
  try{
    const [users,rev]=await Promise.all([api("GET","/admin/users"),api("GET","/admin/revenue-month").catch(()=>null)]);
    _admUsers=users||[];_admRev=rev;
    renderAdminStats(_admUsers);
    if(!_admUsers.length){tb.innerHTML=`<tr><td colspan="12" style="text-align:center;color:var(--muted);padding:24px">Aucun utilisateur.</td></tr>`;return;}
    admRender();
  }catch(e){tb.innerHTML=`<tr><td colspan="12" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
};
