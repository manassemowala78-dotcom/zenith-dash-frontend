// ── 9.7.0 · Appels audio et vidéo (LiveKit) · animation de la voix ──

// ── L'animation de la voix : des barres qui suivent le niveau du micro ──
function zdVoiceMeter(stream,box,n){
  n=n||24;
  let ctx,an,src,data,raf=0,lv=0;
  try{
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    src=ctx.createMediaStreamSource(stream);an=ctx.createAnalyser();an.fftSize=256;an.smoothingTimeConstant=.55;src.connect(an);
    data=new Uint8Array(an.frequencyBinCount);
    if(ctx.state==="suspended")ctx.resume().catch(()=>{});
  }catch(_){return {level:()=>0,stop(){}};}
  const host=box&&box.parentElement;
  if(box){box.innerHTML=Array.from({length:n},()=>"<i></i>").join("");box.classList.add("vb-on");if(host)host.classList.add("vb-live");}
  const bars=box?[...box.children]:[];
  const binHz=ctx.sampleRate/an.fftSize,lo=Math.max(1,Math.floor(90/binHz)),hi=Math.min(data.length-1,Math.ceil(3800/binHz));
  const mid=(bars.length-1)/2;
  const tick=()=>{
    an.getByteFrequencyData(data);
    let sum=0;for(let i=lo;i<=hi;i++)sum+=data[i];
    const avg=sum/((hi-lo+1)*255);
    lv=lv*.55+Math.min(1,avg*2.6)*.45;
    for(let i=0;i<bars.length;i++){
      const d=mid?Math.abs(i-mid)/mid:0;
      const v=data[Math.min(hi,Math.floor(lo+d*(hi-lo)*.85))]/255;
      bars[i].style.transform=`scaleY(${Math.max(.14,Math.min(1,v*1.2*(1-d*.35)+lv*.25)).toFixed(3)})`;
    }
    if(host)host.style.setProperty("--lv",lv.toFixed(3));
    raf=requestAnimationFrame(tick);
  };
  tick();
  return {level:()=>lv,stop(){cancelAnimationFrame(raf);try{src.disconnect();}catch(_){}try{ctx.close();}catch(_){}
    if(box){box.classList.remove("vb-on");box.innerHTML="";}if(host){host.classList.remove("vb-live");host.style.removeProperty("--lv");}}};
}
let _vbRec=null;
function vbStop(){if(_vbRec){_vbRec.stop();_vbRec=null;}}
if(typeof startVoiceRecording==="function"){
  const _vbS=startVoiceRecording;
  startVoiceRecording=async function(){
    const r=await _vbS.apply(this,arguments);
    try{if(_mediaRecorder&&_mediaRecorder.stream){vbStop();_vbRec=zdVoiceMeter(_mediaRecorder.stream,document.getElementById("vb-rec"),28);}}catch(_){}
    return r;
  };
  const _vbT=stopVoiceRecording;stopVoiceRecording=async function(){vbStop();return _vbT.apply(this,arguments);};
  const _vbC=cancelVoiceRecording;cancelVoiceRecording=async function(){vbStop();return _vbC.apply(this,arguments);};
}

// ── Appels ──
const CL={cfg:null,lkp:null,LK:null,room:null,call:null,kind:"audio",ring:null,ringT:null,t0:null,timer:null,ping:null,out:false,mic:true,cam:false,sound:true,
  share:false,hand:false,facing:"user",min:false,side:false,quality:null,speakers:[],tiles:new Map(),raf:0,joining:false,lastEnd:null,banner:null};
const _clDismissed=new Set();
function clMe(){return State.tenant?.messaging_id||State.tenant?.id;}
function clT(k,v){return abTr(k,v||{});}
function clCoarse(){try{return matchMedia("(pointer:coarse)").matches;}catch(_){return false;}}
function clNarrow(){return window.innerWidth<760;}
function clFmt(s){s=Math.max(0,Math.floor(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+":"+String(m).padStart(2,"0"):String(m).padStart(2,"0"))+":"+String(x).padStart(2,"0");}
function clDur(s){
  if(s==null)return"";s=Math.round(s);
  if(s<60)return clT("cl_dur_s",{s});
  const m=Math.floor(s/60),x=s%60;
  if(m<60)return x?clT("cl_dur_ms",{m,s:x}):clT("cl_dur_m",{m});
  return clT("cl_dur_hm",{h:Math.floor(m/60),m:m%60});
}
function clHue(s){let h=0;for(const c of String(s||"?"))h=(h*31+c.charCodeAt(0))%360;return h;}
function clAv(name,url,size){
  const st=`--s:${size}px;--h:${clHue(name)}`;
  if(url)return `<span class="cl-av img" style="${st};background-image:url('${esc(url)}')" aria-hidden="true"></span>`;
  return `<span class="cl-av" style="${st}" aria-hidden="true">${esc((name||"?").trim().charAt(0).toUpperCase())}</span>`;
}
async function clConfig(){
  if(CL.cfg)return CL.cfg;
  try{CL.cfg=await api("GET","/calls/config");}catch(_){return {enabled:false};}
  return CL.cfg;
}
function clLoadLK(){
  if(window.LivekitClient)return Promise.resolve(window.LivekitClient);
  if(CL.lkp)return CL.lkp;
  CL.lkp=new Promise((res,rej)=>{
    const s=document.createElement("script");
    s.src="/js/vendor/livekit-client.umd.js?v="+String(typeof APP_BUILD!=="undefined"?APP_BUILD:"").split(" ")[0];
    s.onload=()=>window.LivekitClient?res(window.LivekitClient):rej(new Error(t("cl_load_fail")));
    s.onerror=()=>{CL.lkp=null;rej(new Error(t("cl_load_fail")));};
    document.head.appendChild(s);
  });
  return CL.lkp;
}
function clConv(id){return (typeof _conversations!=="undefined"&&_conversations||[]).find(c=>c.id===id)||null;}
function clTitle(c){
  c=c||CL.call;if(!c)return"";
  if(c.is_group)return c.group_name||clConv(c.conversation_id)?.name||t("cl_group");
  if(c.from&&c.from.id!==clMe())return c.from.name;
  const conv=clConv(c.conversation_id);if(conv)return conv.name;
  const other=Object.entries(c.names||{}).find(([id])=>id!==clMe());
  return other?other[1]:t("cl_call");
}
function clOtherAvatar(c){
  if(c.from&&c.from.id!==clMe())return c.from.avatar;
  return clConv(c.conversation_id)?.other_avatar_url||null;
}

// Sons : sonnerie, tonalité d'attente, bips
const CLS={ctx:null,timer:null,vib:null};
function clTone(seq){
  try{
    CLS.ctx=CLS.ctx||new (window.AudioContext||window.webkitAudioContext)();const c=CLS.ctx;if(c.state==="suspended")c.resume().catch(()=>{});
    const t0=c.currentTime+.03;
    seq.forEach(([f,s,d,ty,v])=>{const o=c.createOscillator(),g=c.createGain();o.type=ty||"sine";o.frequency.value=f;v=v||.16;
      g.gain.setValueAtTime(0,t0+s);g.gain.linearRampToValueAtTime(v,t0+s+.02);g.gain.setValueAtTime(v,t0+s+Math.max(.03,d-.06));g.gain.linearRampToValueAtTime(0,t0+s+d);
      o.connect(g);g.connect(c.destination);o.start(t0+s);o.stop(t0+s+d+.03);});
  }catch(_){}
}
const CL_RINGTONE=[[659,0,.16,"triangle",.2],[784,.18,.16,"triangle",.2],[988,.36,.32,"triangle",.2],[659,.9,.16,"triangle",.2],[784,1.08,.16,"triangle",.2],[988,1.26,.32,"triangle",.2]];
const CL_RINGBACK=[[425,0,1.1,"sine",.07]];
function clSound(kind){
  clSoundStop();
  const seq=kind==="in"?CL_RINGTONE:CL_RINGBACK,every=kind==="in"?3000:4000;
  clTone(seq);CLS.timer=setInterval(()=>clTone(seq),every);
  if(kind==="in"&&navigator.vibrate&&clCoarse()){try{navigator.vibrate([700,500,700]);}catch(_){}CLS.vib=setInterval(()=>{try{navigator.vibrate([700,500,700]);}catch(_){}},3000);}
}
function clSoundStop(){clearInterval(CLS.timer);clearInterval(CLS.vib);CLS.timer=CLS.vib=null;try{if(navigator.vibrate)navigator.vibrate(0);}catch(_){}}
function clBeep(k){clTone(k==="end"?[[520,0,.14,"sine",.12],[390,.17,.24,"sine",.12]]:k==="join"?[[660,0,.1,"sine",.1],[880,.12,.14,"sine",.1]]:[[880,0,.12,"sine",.1]]);}
function clQuiet(){return typeof nfQuietNow==="function"&&nfQuietNow();}

// ── Appel entrant ──
function clQuickReplies(){return [t("cl_q_callback"),t("cl_q_busy"),t("cl_q_meeting")];}
function clShowRing(call){
  if(!call||!["ringing","ongoing"].includes(call.status))return;
  if(CL.call&&CL.call.id===call.id)return;
  if(_clDismissed.has(call.id))return;
  if(CL.ring&&CL.ring.id===call.id){CL.ring=call;return;}
  CL.ring=call;
  let el=document.getElementById("cl-ring");
  if(!el){el=document.createElement("div");el.id="cl-ring";document.body.appendChild(el);}
  const who=call.from||{},grp=call.is_group,title=clTitle(call),video=call.kind==="video";
  const sub=grp?clT(video?"cl_in_video_grp":"cl_in_audio_grp",{n:who.name||""}):t(video?"cl_in_video":"cl_in_audio");
  const busy=!!CL.call;
  el.className="cl-ring"+(busy?" busy":"");
  el.setAttribute("role","alertdialog");el.setAttribute("aria-label",`${title} · ${sub}`);
  const acts=`<div class="cl-acts">
      <div><button type="button" class="cl-b red" onclick="clDecline()" aria-label="${esc(t("cl_decline"))}"><i class="ti ti-phone-off"></i></button><span>${esc(t("cl_decline"))}</span></div>
      ${video?`<div><button type="button" class="cl-b" onclick="clAnswer('audio')" aria-label="${esc(t("cl_answer_audio"))}"><i class="ti ti-phone"></i></button><span>${esc(t("cl_answer_audio"))}</span></div>
      <div><button type="button" class="cl-b green" onclick="clAnswer('video')" aria-label="${esc(t("cl_answer_video"))}"><i class="ti ti-video"></i></button><span>${esc(t("cl_answer_video"))}</span></div>`
      :`<div><button type="button" class="cl-b green" onclick="clAnswer('audio')" aria-label="${esc(t("cl_answer"))}"><i class="ti ti-phone"></i></button><span>${esc(t("cl_answer"))}</span></div>`}
    </div>`;
  if(busy){
    el.innerHTML=`<div class="cl-ring-mini">${clAv(title,grp?null:who.avatar,40)}<div class="cl-rm-t"><b>${esc(title)}</b><small>${esc(sub)}</small></div>
      <button type="button" class="cl-b sm red" onclick="clDecline()" aria-label="${esc(t("cl_decline"))}"><i class="ti ti-phone-off"></i></button>
      <button type="button" class="cl-b sm green" onclick="clAnswer('${video?"video":"audio"}')" aria-label="${esc(t("cl_answer_end"))}" title="${esc(t("cl_answer_end"))}"><i class="ti ti-phone"></i></button></div>`;
    clBeep();
  }else{
    el.innerHTML=`<div class="cl-ring-in">
      <div class="cl-pulse">${clAv(title,grp?null:who.avatar,104)}</div>
      <div class="cl-who">${esc(title)}</div><div class="cl-sub">${esc(sub)}</div>
      <div class="cl-quick" role="group" aria-label="${esc(t("cl_q_title"))}">${clQuickReplies().map((q,i)=>`<button type="button" class="cl-chip" onclick="clDeclineWith(${i})">${esc(q)}</button>`).join("")}
        <button type="button" class="cl-chip" onclick="clQuickOther()" aria-label="${esc(t("cl_q_other"))}"><i class="ti ti-pencil"></i></button></div>
      <form class="cl-qin" id="cl-qin" hidden onsubmit="event.preventDefault();clDecline(document.getElementById('cl-qtxt').value)">
        <input class="inp" id="cl-qtxt" maxlength="300" placeholder="${esc(t("cl_q_ph"))}" aria-label="${esc(t("cl_q_ph"))}"><button type="submit" class="btn btn-g btn-sm"><i class="ti ti-send"></i></button></form>
      ${acts}</div>`;
    if(!clQuiet())clSound("in");
  }
  el.style.display="flex";
  clearTimeout(CL.ringT);CL.ringT=setTimeout(()=>clHideRing(call.id),((CL.cfg&&CL.cfg.ring_seconds)||45)*1000+3000);
  if(document.hidden&&"Notification" in window&&Notification.permission==="granted"&&navigator.serviceWorker){
    navigator.serviceWorker.ready.then(reg=>{if(CL.ring&&CL.ring.id===call.id&&document.hidden)reg.showNotification(`${video?"🎥":"📞"} ${title}`,{body:sub,tag:`call-${call.id}`,icon:"/icon-192.png",badge:"/icon-192.png",requireInteraction:true,renotify:true,
      data:{url:`/?p=messaging&c=${call.conversation_id}&call=${call.id}`,call_id:call.id,conv_id:call.conversation_id,type:"call"}}).catch(()=>{});}).catch(()=>{});
  }
}
function clHideRing(id,quiet){
  if(!CL.ring||(id&&CL.ring.id!==id))return;
  const was=CL.ring;CL.ring=null;_clDismissed.add(was.id);
  clearTimeout(CL.ringT);if(!CL.out)clSoundStop();
  const el=document.getElementById("cl-ring");if(el){el.style.display="none";el.innerHTML="";}
  clCloseNotif(was.id);
}
function clCloseNotif(id){
  try{if(navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.controller.postMessage({type:"zd-clear",tags:[`call-${id}`]});}catch(_){}
}
function clQuickOther(){const f=document.getElementById("cl-qin");if(f){f.hidden=false;document.getElementById("cl-qtxt")?.focus();}}
function clDeclineWith(i){clDecline(clQuickReplies()[i]);}
async function clDecline(message){
  const c=CL.ring;if(!c)return;
  clHideRing(c.id);
  try{await api("POST",`/calls/${c.id}/decline`,message&&String(message).trim()?{message:String(message).trim()}:{});
    if(message&&String(message).trim())showToast(t("cl_msg_sent"));}catch(e){showToast(e.message,"error");}
}
async function clAnswer(kind){
  const c=CL.ring;if(!c)return;
  clHideRing(c.id,true);
  if(CL.call)await clHangup(true);
  await clJoin(c.id,kind);
}

// ── Lancer, rejoindre, quitter ──
async function clStart(kind,convId){
  convId=convId||_currentConvId;if(!convId)return;
  if(CL.call){if(CL.call.conversation_id===convId){clMax();return;}showToast(t("cl_busy"),"error");return;}
  if(CL.joining)return;
  const cfg=await clConfig();if(!cfg.enabled){showToast(t("cl_off"),"error");return;}
  CL.joining=true;
  try{
    const lkp=clLoadLK();lkp.catch(()=>{});
    const r=await api("POST","/calls",{conversation_id:convId,kind});
    await clEnter(r,kind,r.joined_existing?"join":"out",lkp);
  }catch(e){showToast(e.message,"error");clFinish("error",true);}
  finally{CL.joining=false;}
}
async function clJoin(callId,kind){
  if(CL.joining)return;
  if(CL.call&&CL.call.id===callId){clMax();return;}
  const cfg=await clConfig();if(!cfg.enabled){showToast(t("cl_off"),"error");return;}
  CL.joining=true;
  try{
    const lkp=clLoadLK();lkp.catch(()=>{});
    const r=await api("POST",`/calls/${callId}/join`,{kind:kind==="video"?"video":"audio"});
    await clEnter(r,kind==="video"?"video":"audio","join",lkp);
  }catch(e){showToast(e.message,"error");clFinish("error",true);}
  finally{CL.joining=false;}
}
function clJoinById(id,kind){clJoin(id,kind);}
async function clEnter(r,kind,mode,lkp){
  if(CL.room){try{CL.room.disconnect();}catch(_){}}
  Object.assign(CL,{call:r.call,kind,cam:kind==="video",mic:true,sound:true,share:false,hand:false,facing:"user",min:false,side:false,quality:null,speakers:[],
    out:mode==="out",t0:r.call.answered_at?parseServerDate(r.call.answered_at).getTime():null,room:null});
  CL.tiles.forEach(el=>el.remove());CL.tiles.clear();
  clRenderCall();
  if(CL.out&&!clQuiet())clSound("out");
  clearInterval(CL.ping);CL.lastPing=0;CL.ping=setInterval(clPing,4000);setTimeout(clPing,1500);
  clStatus(t("cl_connecting"));
  const LK=CL.LK=await (lkp||clLoadLK());
  if(!CL.call||CL.call.id!==r.call.id)return;
  const dev=clDevPrefs();
  const vcap={resolution:LK.VideoPresets.h540.resolution};if(clCoarse())vcap.facingMode="user";if(dev.cam)vcap.deviceId=dev.cam;
  const acap={echoCancellation:true,noiseSuppression:true,autoGainControl:true,voiceIsolation:true,channelCount:1};if(dev.mic)acap.deviceId=dev.mic;
  const room=new LK.Room({adaptiveStream:true,dynacast:true,webAudioMix:false,
    publishDefaults:{simulcast:true,dtx:true,red:true,videoSimulcastLayers:[LK.VideoPresets.h180,LK.VideoPresets.h360],screenShareEncoding:LK.ScreenSharePresets?LK.ScreenSharePresets.h1080fps15.encoding:undefined},
    videoCaptureDefaults:vcap,audioCaptureDefaults:acap,audioOutput:dev.out?{deviceId:dev.out}:undefined});
  CL.room=room;clBind(room,LK);
  await room.connect(r.lk.url,r.lk.token,{autoSubscribe:true});
  if(CL.room!==room){try{room.disconnect();}catch(_){}return;}
  clStatus("");
  try{await clMicOn(room.localParticipant);}catch(e){CL.mic=false;clDevError("mic",e);}
  if(CL.out&&!room.remoteParticipants.size){CL.hold=true;try{const pub=room.localParticipant.getTrackPublication(LK.Track.Source.Microphone);if(pub&&pub.track)await pub.track.mute();}catch(_){}}
  if(CL.cam){try{await clCamOn(room.localParticipant);}catch(e){CL.cam=false;clDevError("cam",e);}}
  if(room.remoteParticipants.size)clOnRemoteJoin(true);
  clBar();clRefresh();
  if(!room.canPlaybackAudio)clAudioUnlock(true);
}
function clBind(room,LK){
  const E=LK.RoomEvent,r=()=>clRefreshSoon();
  room.on(E.ParticipantConnected,()=>{clOnRemoteJoin();r();})
    .on(E.ParticipantDisconnected,()=>{r();clCheckAlone();})
    .on(E.TrackSubscribed,(track,pub,p)=>{
      if(track.kind==="audio")clAttachAudio(track,pub,p);
      r();})
    .on(E.TrackUnsubscribed,(track,pub,p)=>{if(track.kind==="audio"){track.detach().forEach(e=>e.remove());clDedupeAudio();}r();})
    .on(E.Reconnected,()=>clDedupeAudio())
    .on(E.TrackMuted,r).on(E.TrackUnmuted,r).on(E.LocalTrackPublished,r).on(E.LocalTrackUnpublished,()=>{r();clSyncLocal();})
    .on(E.ActiveSpeakersChanged,sp=>{const ids=sp.map(x=>x.identity);ids.filter(i=>i!==room.localParticipant.identity).forEach(i=>{CL.speakers=[i,...CL.speakers.filter(x=>x!==i)].slice(0,8);});CL.speaking=new Set(ids);clSpeakers();})
    .on(E.ParticipantAttributesChanged,r)
    .on(E.DataReceived,(payload,p)=>clData(payload,p))
    .on(E.ConnectionQualityChanged,(q,p)=>{if(p&&p.isLocal){CL.quality=q;clNet();}})
    .on(E.Reconnecting,()=>clStatus(t("cl_reconnecting"))).on(E.Reconnected,()=>clStatus(""))
    .on(E.AudioPlaybackStatusChanged,()=>clAudioUnlock(!room.canPlaybackAudio))
    .on(E.Disconnected,reason=>{if(CL.room!==room)return;clFinish(LK.DisconnectReason&&reason===LK.DisconnectReason.DUPLICATE_IDENTITY?"moved":"lost");});
}
function clSyncLocal(){
  const lp=CL.room&&CL.room.localParticipant;if(!lp)return;
  CL.mic=lp.isMicrophoneEnabled;CL.cam=lp.isCameraEnabled;CL.share=lp.isScreenShareEnabled;clBar();
}
function clOnRemoteJoin(silent){
  if(CL.out){CL.out=false;clSoundStop();}
  if(CL.hold){CL.hold=false;try{const pub=CL.room&&CL.LK&&CL.room.localParticipant.getTrackPublication(CL.LK.Track.Source.Microphone);if(pub&&pub.track&&CL.mic)pub.track.unmute();}catch(_){}}
  if(!CL.t0)CL.t0=Date.now();
  if(!silent)clBeep("join");
  clTick();
}
function clCheckAlone(){
  const c=CL.call,room=CL.room;if(!c||!room||c.is_group)return;
  if(!room.remoteParticipants.size&&CL.t0)setTimeout(()=>{if(CL.room===room&&!room.remoteParticipants.size)clHangup();},4000);
}
async function clPing(){
  const c=CL.call;if(!c)return;
  const ringing=CL.out||c.status==="ringing";
  if(!ringing&&Date.now()-(CL.lastPing||0)<14000)return;
  CL.lastPing=Date.now();
  try{
    const r=await api("POST",`/calls/${c.id}/ping?fast=1`);
    if(!CL.call||CL.call.id!==c.id)return;
    if(r&&r.status&&!["ringing","ongoing"].includes(r.status))clFinish(r.status==="missed"&&CL.out?"noanswer":r.status);
    else if(r&&r.answered&&CL.out&&CL.room&&CL.room.remoteParticipants.size)clOnRemoteJoin();
  }catch(_){}
}
async function clHangup(silent){
  const c=CL.call;if(!c)return;
  clFinish("hangup",silent);
  try{await api("POST",`/calls/${c.id}/leave`);}catch(_){}
}
function clEndText(reason){
  const map={declined:"cl_end_declined",noanswer:"cl_end_noanswer",missed:"cl_end_noanswer",cancelled:"cl_end_cancelled",lost:"cl_end_lost",moved:"cl_end_moved",error:null};
  return reason in map?(map[reason]?t(map[reason]):null):t("cl_end");
}
function clFinish(reason,silent){
  const c=CL.call;
  const lostRinging=reason==="lost"&&c&&CL.out&&!CL.t0;
  CL.hold=false;clearTimeout(CL.offT);
  clSoundStop();clearInterval(CL.ping);clearInterval(CL.timer);cancelAnimationFrame(CL.raf);CL.ping=CL.timer=null;
  const room=CL.room;CL.room=null;
  if(room){try{room.disconnect();}catch(_){}}
  const dur=CL.t0?(Date.now()-CL.t0)/1000:null;
  CL.call=null;CL.out=false;CL.t0=null;CL.tiles.clear();
  const ov=document.getElementById("cl-ov");
  if(!c){if(ov)ov.remove();return;}
  _clDismissed.add(c.id);
  if(silent||!ov){if(ov)ov.remove();clHeaderSync();return;}
  if(reason!=="error")clBeep("end");
  const txt=clEndText(reason);
  ov.classList.remove("min");ov.classList.add("ended");
  const st=document.getElementById("cl-sub");if(st)st.textContent=[txt,dur?clFmt(dur):""].filter(Boolean).join(" · ");
  const bar=document.getElementById("cl-bar");if(bar)bar.innerHTML="";
  if(lostRinging){clLostScreen(ov,c);clHeaderSync();return;}
  setTimeout(()=>{if(!CL.call)ov.remove();},1400);
  clHeaderSync();
}
window.addEventListener("pagehide",()=>{
  const c=CL.call;if(!c||!State.token)return;
  try{fetch(`${API_BASE}/calls/${c.id}/leave`,{method:"POST",keepalive:true,headers:{Authorization:`Bearer ${State.token}`}});}catch(_){}
});

// ── L'écran d'appel ──
function clRenderCall(){
  let ov=document.getElementById("cl-ov");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="cl-ov";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");
  const c=CL.call;
  ov.className="cl-ov "+(c.is_group?"grp":"one");
  ov.setAttribute("aria-label",clTitle(c));
  ov.innerHTML=`<div class="cl-top">
      <button type="button" class="cl-ib" onclick="clMinimize()" aria-label="${esc(t("cl_minimize"))}" title="${esc(t("cl_minimize"))}"><i class="ti ti-chevron-down"></i></button>
      <div class="cl-title"><b>${esc(clTitle(c))}</b><span id="cl-sub" aria-live="polite"></span></div>
      <span class="cl-lock" title="${esc(t("cl_secure"))}"><i class="ti ti-lock"></i></span>
    </div>
    <div class="cl-body"><div class="cl-stage" id="cl-stage"><div class="cl-feat" id="cl-feat"></div><div class="cl-grid" id="cl-grid"></div></div>
      <aside class="cl-side" id="cl-side" hidden></aside></div>
    <div class="cl-net" id="cl-net" hidden><i class="ti ti-antenna-bars-2"></i> ${esc(t("cl_net_poor"))}</div>
    <button type="button" class="cl-unlock" id="cl-unlock" hidden onclick="clUnlock()"><i class="ti ti-volume"></i> ${esc(t("cl_enable_sound"))}</button>
    <div class="cl-bar" id="cl-bar" role="toolbar" aria-label="${esc(t("cl_controls"))}"></div>
    <button type="button" class="cl-pill" onclick="clMax()"><span class="cl-dot"></span><span id="cl-pill-t">${esc(clTitle(c))}</span><b>${esc(t("cl_back"))}</b></button>
    <div id="cl-audio" hidden></div>`;
  document.body.appendChild(ov);
  clearInterval(CL.timer);CL.timer=setInterval(clTick,1000);
  clTick();clBar();clRefresh();clHeaderSync();
}
function clStatus(s){CL.status=s||"";clTick();}
function clTick(){
  const el=document.getElementById("cl-sub");if(!el||!CL.call)return;
  const c=CL.call,n=CL.room?CL.room.remoteParticipants.size+1:(c.active_count||1);
  let s;
  if(CL.status)s=CL.status;
  else if(CL.out)s=t(c.is_group?"cl_calling_grp":"cl_ringing");
  else if(CL.t0)s=clFmt((Date.now()-CL.t0)/1000);
  else s=t("cl_waiting");
  if(c.is_group&&!CL.out)s+=" · "+clT("cl_people",{n});
  el.textContent=s;
  const p=document.getElementById("cl-pill-t");if(p)p.textContent=`${clTitle(c)} · ${CL.t0&&!CL.status?clFmt((Date.now()-CL.t0)/1000):s}`;
}
function clMinimize(){const ov=document.getElementById("cl-ov");if(ov){ov.classList.add("min");}}
function clMax(){const ov=document.getElementById("cl-ov");if(ov){ov.classList.remove("min");clRefresh();}}
function clBar(){
  const bar=document.getElementById("cl-bar");if(!bar||!CL.call)return;
  const grp=CL.call.is_group,canShare=!clCoarse()&&!!(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia);
  const b=(fn,ic,label,cls)=>`<button type="button" class="cl-b ${cls||""}" onclick="${fn}" aria-label="${esc(label)}" title="${esc(label)}"${cls&&cls.includes("on")?' aria-pressed="true"':""}><i class="ti ${ic}"></i></button>`;
  bar.innerHTML=[
    b("clToggleMic()",CL.mic?"ti-microphone":"ti-microphone-off",t(CL.mic?"cl_mic_off":"cl_mic_on"),CL.mic?"":"off"),
    b("clToggleCam()",CL.cam?"ti-video":"ti-video-off",t(CL.cam?"cl_cam_off":"cl_cam_on"),CL.cam?"":"off"),
    CL.cam&&clCoarse()?b("clFlip()","ti-camera-rotate",t("cl_flip")):"",
    b("clToggleSound()",CL.sound?"ti-volume":"ti-volume-off",t(CL.sound?"cl_sound_off":"cl_sound_on"),CL.sound?"":"off"),
    !clCoarse()?b("clDevices()","ti-adjustments",t("cl_devices")):"",
    canShare?b("clToggleShare()",CL.share?"ti-screen-share-off":"ti-screen-share",t(CL.share?"cl_share_stop":"cl_share"),CL.share?"on":""):"",
    grp?b("clToggleHand()","ti-hand-stop",t(CL.hand?"cl_hand_down":"cl_hand_up"),CL.hand?"on":""):"",
    grp?b("clToggleSide()","ti-users",t("cl_participants"),CL.side?"on":""):"",
    b("clHangup()","ti-phone-off",t(grp?"cl_leave":"cl_hangup"),"red")
  ].join("");
}
async function clToggleMic(){const lp=CL.room?.localParticipant;CL.mic=!CL.mic;clBar();if(lp){try{if(CL.mic)await clMicOn(lp);else await lp.setMicrophoneEnabled(false);}catch(e){CL.mic=lp.isMicrophoneEnabled;clBar();clDevError("mic",e);}}clRefreshSoon();}
async function clToggleCam(){
  const lp=CL.room?.localParticipant;CL.cam=!CL.cam;clBar();
  if(lp){try{if(CL.cam)await clCamOn(lp);else await lp.setCameraEnabled(false);}catch(e){CL.cam=lp.isCameraEnabled;clBar();clDevError("cam",e);}}
  clSyncLocal();clRefreshSoon();
}
async function clFlip(){
  const lp=CL.room?.localParticipant;if(!lp||!CL.LK)return;
  const pub=lp.getTrackPublication(CL.LK.Track.Source.Camera);if(!pub||!pub.track)return;
  CL.facing=CL.facing==="user"?"environment":"user";
  try{await pub.track.restartTrack({facingMode:CL.facing});}catch(_){showToast(t("cl_flip_fail"),"error");}
  clRefreshSoon();
}
function clToggleSound(){CL.sound=!CL.sound;document.querySelectorAll("#cl-audio audio").forEach(a=>a.muted=!CL.sound);clBar();}

// ── 9.8.0 · Son sans écho, caméra qui démarre sur PC, choix des appareils ──
function clDevPrefs(){try{return JSON.parse(localStorage.getItem("zd_cl_dev")||"{}")||{};}catch(_){return {};}}
function clDevSave(k,v){const d=clDevPrefs();if(v)d[k]=v;else delete d[k];try{localStorage.setItem("zd_cl_dev",JSON.stringify(d));}catch(_){}}
function clAttachAudio(track,pub,p){
  const box=document.getElementById("cl-audio");
  const src=(pub&&pub.source)||track.source||"microphone";
  if(box)box.querySelectorAll("audio").forEach(a=>{if(a.dataset.sid===track.sid||(a.dataset.pid===p.identity&&a.dataset.src===String(src))){try{track.detach(a);}catch(_){}a.srcObject=null;a.remove();}});
  try{track.detach().forEach(e=>e.remove());}catch(_){}
  const el=track.attach();el.dataset.pid=p.identity;el.dataset.sid=track.sid||"";el.dataset.src=String(src);el.muted=!CL.sound;el.autoplay=true;el.setAttribute("playsinline","");
  const out=clDevPrefs().out;if(out&&typeof el.setSinkId==="function")el.setSinkId(out).catch(()=>{});
  box?.appendChild(el);
}
function clDedupeAudio(){
  const box=document.getElementById("cl-audio");if(!box)return;
  const seen=new Set();
  [...box.querySelectorAll("audio")].reverse().forEach(a=>{const k=a.dataset.pid+"|"+a.dataset.src;if(seen.has(k)||!a.srcObject||!a.srcObject.getAudioTracks().some(x=>x.readyState==="live")){a.srcObject=null;a.remove();}else seen.add(k);});
}
function clFail(e){
  let f=null;try{f=CL.LK&&CL.LK.MediaDeviceFailure&&CL.LK.MediaDeviceFailure.getFailure(e);}catch(_){}
  const n=String((e&&e.name)||"")+" "+String((e&&e.message)||"");
  if(f==="PermissionDenied"||/NotAllowed|Permission|denied|SecurityError/i.test(n))return "perm";
  if(f==="NotFound"||/NotFound|DevicesNotFound|Requested device not found/i.test(n))return "none";
  if(f==="DeviceInUse"||/NotReadable|TrackStart|Could not start|AbortError/i.test(n))return "busy";
  if(/Overconstrained/i.test(n))return "constraint";
  return "other";
}
async function clPermState(kind){try{const r=await navigator.permissions.query({name:kind==="cam"?"camera":"microphone"});return r.state;}catch(_){return null;}}
async function clCamOn(lp){
  if(!lp)return;
  if(await clPermState("cam")==="denied"){const e=new Error("Permission denied");e.name="NotAllowedError";throw e;}
  const LK=CL.LK,dev=clDevPrefs(),base={};
  if(clCoarse())base.facingMode=CL.facing;
  const tries=[];
  if(dev.cam)tries.push({...base,deviceId:dev.cam,resolution:LK.VideoPresets.h540.resolution});
  tries.push({...base,resolution:LK.VideoPresets.h540.resolution},{...base,resolution:LK.VideoPresets.h360.resolution},{});
  let err=null;
  for(const o of tries){
    try{await lp.setCameraEnabled(true,o);if(lp.isCameraEnabled)return true;}
    catch(e){err=e;const f=clFail(e);if(f==="perm")break;if(f==="none"&&!o.deviceId)break;if(o.deviceId&&(f==="none"||f==="constraint"))clDevSave("cam",null);}
  }
  try{await lp.setCameraEnabled(false);}catch(_){}
  throw err||new Error("camera");
}
async function clMicOn(lp){
  if(!lp)return;
  const dev=clDevPrefs();
  try{await lp.setMicrophoneEnabled(true);return true;}
  catch(e){
    const f=clFail(e);
    if(dev.mic&&(f==="none"||f==="constraint"||f==="busy")){clDevSave("mic",null);try{await CL.room.switchActiveDevice("audioinput","default");}catch(_){}await lp.setMicrophoneEnabled(true);return true;}
    throw e;
  }
}
function clDevError(kind,e){
  const f=clFail(e),cam=kind==="cam";
  const steps=f==="perm"?(clCoarse()?t(cam?"cl_cam_perm_tel":"cl_mic_perm_tel"):t(cam?"cl_cam_perm_pc":"cl_mic_perm_pc")):t(`cl_${cam?"cam":"mic"}_${f==="constraint"?"other":f}`);
  const name=(e&&e.name)||"";
  const ov=zdModal("cl-err",`<div class="modal-title"><i class="ti ${cam?"ti-video-off":"ti-microphone-off"}" style="color:var(--red)"></i> ${esc(t(cam?"cl_cam_fail_t":"cl_mic_fail_t"))}</div>
    <p class="cl-err-x">${esc(steps)}</p>
    ${name?`<p class="cl-err-code">${esc(t("cl_err_code"))} : ${esc(name)}</p>`:""}
    <div class="modal-footer"><button type="button" class="btn btn-o btn-sm" onclick="zdCloseModal('cl-err')">${esc(t("btn_close"))}</button>
      ${!clCoarse()?`<button type="button" class="btn btn-o btn-sm" onclick="zdCloseModal('cl-err');clDevices()"><i class="ti ti-adjustments"></i> ${esc(t("cl_devices_short"))}</button>`:""}
      <button type="button" class="btn btn-g btn-sm" onclick="zdCloseModal('cl-err');${cam?"clToggleCam()":"clToggleMic()"}"><i class="ti ti-refresh"></i> ${esc(t("cl_retry"))}</button></div>`,440);
  ov.classList.add("cl-modal");
}
async function clDevices(){
  let list=[];
  try{list=await navigator.mediaDevices.enumerateDevices();}catch(_){}
  const dev=clDevPrefs(),room=CL.room;
  const cur=k=>{try{return room&&room.getActiveDevice?room.getActiveDevice(k):null;}catch(_){return null;}};
  const sinkOk=typeof HTMLMediaElement!=="undefined"&&"setSinkId" in HTMLMediaElement.prototype;
  const sel=(kind,key,label)=>{
    const ds=list.filter(d=>d.kind===kind&&d.deviceId);
    if(!ds.length)return `<div class="fgrp"><label class="fl">${esc(label)}</label><div class="cl-dev-none">${esc(t("cl_dev_none"))}</div></div>`;
    const active=dev[key]||cur(kind)||"default";
    return `<div class="fgrp"><label class="fl" for="cl-dev-${key}">${esc(label)}</label><select class="inp" id="cl-dev-${key}" onchange="clPickDevice('${kind}','${key}',this.value)">${ds.map((d,i)=>`<option value="${esc(d.deviceId)}"${d.deviceId===active?" selected":""}>${esc(d.label||`${label} ${i+1}`)}</option>`).join("")}</select></div>`;
  };
  const ov=zdModal("cl-dev",`<div class="modal-title"><i class="ti ti-adjustments"></i> ${esc(t("cl_devices"))}</div>
    ${sel("videoinput","cam",t("cl_dev_cam"))}${sel("audioinput","mic",t("cl_dev_mic"))}${sinkOk?sel("audiooutput","out",t("cl_dev_out")):""}
    <p class="cl-echo-tip"><i class="ti ti-info-circle"></i> ${esc(t("cl_echo_tip"))}</p>
    <div class="modal-footer"><button type="button" class="btn btn-g btn-sm" onclick="zdCloseModal('cl-dev')">${esc(t("btn_close"))}</button></div>`,440);
  ov.classList.add("cl-modal");
}
async function clPickDevice(kind,key,id){
  clDevSave(key,id);
  const room=CL.room;
  if(key==="out"){document.querySelectorAll("#cl-audio audio").forEach(a=>{if(typeof a.setSinkId==="function")a.setSinkId(id).catch(()=>{});});}
  if(!room)return;
  try{await room.switchActiveDevice(kind,id);}
  catch(e){if(key==="cam"&&CL.cam){try{await clCamOn(room.localParticipant);}catch(e2){clDevError("cam",e2);}}else showToast(t("cl_dev_fail"),"error");}
  clRefreshSoon();
}
async function clToggleShare(){
  const lp=CL.room?.localParticipant;if(!lp)return;
  try{await lp.setScreenShareEnabled(!CL.share,{audio:false});CL.share=lp.isScreenShareEnabled;}catch(e){if(e&&e.name!=="NotAllowedError")showToast(t("cl_share_fail"),"error");CL.share=lp.isScreenShareEnabled;}
  clBar();clRefreshSoon();
}
async function clToggleHand(){
  const lp=CL.room?.localParticipant;if(!lp)return;
  CL.hand=!CL.hand;clBar();
  try{await lp.setAttributes({hand:CL.hand?"1":""});}catch(_){CL.hand=!CL.hand;clBar();}
  clRefreshSoon();
}
function clToggleSide(force){
  CL.side=typeof force==="boolean"?force:!CL.side;
  const s=document.getElementById("cl-side");if(s)s.hidden=!CL.side;
  document.getElementById("cl-ov")?.classList.toggle("side",CL.side);
  clBar();clRefresh();
}
function clUnlock(){const r=CL.room;if(r)r.startAudio().then(()=>clAudioUnlock(false)).catch(()=>{});}
function clAudioUnlock(show){const b=document.getElementById("cl-unlock");if(b)b.hidden=!show;}
function clNet(){
  const el=document.getElementById("cl-net");if(!el)return;
  const q=String(CL.quality||"");el.hidden=!(q==="poor"||q==="lost");
}
function clMuteAll(){
  const lp=CL.room?.localParticipant;if(!lp)return;
  try{lp.publishData(new TextEncoder().encode(JSON.stringify({t:"muteall"})),{reliable:true});showToast(t("cl_muted_all"));}catch(_){}
}
function clData(payload,p){
  let d=null;try{d=JSON.parse(new TextDecoder().decode(payload));}catch(_){return;}
  if(d&&d.t==="muteall"&&p&&CL.call&&p.identity===CL.call.from?.id){
    if(CL.mic){CL.mic=false;CL.room?.localParticipant.setMicrophoneEnabled(false).catch(()=>{});clBar();clRefreshSoon();}
    showToast(clT("cl_muted_by",{n:p.name||""}));
  }
}

// Les vignettes : une par personne (et une pour le partage d'écran)
function clMeta(p){try{return JSON.parse(p.metadata||"{}")||{};}catch(_){return {};}}
function clPeople(){
  const room=CL.room;if(!room)return [];
  const arr=[room.localParticipant,...room.remoteParticipants.values()];
  return arr.map(p=>({p,id:p.identity,local:!!p.isLocal,name:p.isLocal?t("cl_you"):(p.name||CL.call?.names?.[p.identity]||"?"),avatar:clMeta(p).avatar||null,
    hand:(p.attributes||{}).hand==="1",micOff:p.isLocal&&CL.hold?!CL.mic:!p.isMicrophoneEnabled}));
}
function clPub(p,src){if(!CL.LK)return null;const pub=p.getTrackPublication(CL.LK.Track.Source[src]);return pub&&pub.track&&!pub.isMuted?pub:null;}
function clTileEl(key,x,screen){
  let el=CL.tiles.get(key);
  if(!el){
    el=document.createElement("div");el.className="cl-tile";el.dataset.k=key;el.dataset.pid=x.id;
    el.innerHTML=`<video playsinline autoplay muted></video><div class="cl-ph"><span class="cl-lv"></span>${clAv(x.local?(State.tenant?.acting_as_member_name||State.tenant?.name):x.name,x.avatar,64)}</div>
      <div class="cl-lbl"><span class="cl-moff"><i class="ti ti-microphone-off"></i></span><span class="cl-hd">✋</span><span class="cl-nm"></span></div>`;
    CL.tiles.set(key,el);
  }
  const pub=screen?clPub(x.p,"ScreenShare"):clPub(x.p,"Camera");
  const v=el.querySelector("video");
  const sid=pub?pub.trackSid:"";
  if(v.dataset.sid!==sid){
    const old=CL.tiles.get(key)._track;if(old){try{old.detach(v);}catch(_){}}
    if(pub){pub.track.attach(v);el._track=pub.track;}else{el._track=null;v.removeAttribute("src");try{v.srcObject=null;}catch(_){}}
    v.dataset.sid=sid;
  }
  el.classList.toggle("has-v",!!pub);
  el.classList.toggle("mirror",!!pub&&x.local&&!screen&&CL.facing==="user");
  el.classList.toggle("screen",!!screen);
  el.classList.toggle("moff",!screen&&x.micOff);
  el.classList.toggle("hand",!screen&&x.hand);
  el.querySelector(".cl-nm").textContent=screen?clT("cl_screen_of",{n:x.local?t("cl_you"):x.name}):x.name;
  return el;
}
function clMore(n){
  const el=document.createElement("button");el.type="button";el.className="cl-tile more";el.onclick=()=>clToggleSide(true);
  el.innerHTML=`<b>+${n}</b><small>${esc(t("cl_more"))}</small>`;return el;
}
let _clRefT=0;
function clRefreshSoon(){if(_clRefT)return;_clRefT=requestAnimationFrame(()=>{_clRefT=0;clRefresh();});}
function clRefresh(){
  const ov=document.getElementById("cl-ov"),feat=document.getElementById("cl-feat"),grid=document.getElementById("cl-grid");
  if(!ov||!feat||!grid||!CL.call)return;
  const people=clPeople(),grp=CL.call.is_group,narrow=clNarrow(),min=ov.classList.contains("min");
  if(!CL.room){
    const c=CL.call;feat.innerHTML=`<div class="cl-wait"><div class="cl-pulse">${clAv(clTitle(c),c.is_group?null:clOtherAvatar(c),110)}</div></div>`;grid.innerHTML="";
    return;
  }
  const shares=people.filter(x=>clPub(x.p,"ScreenShare"));
  const keep=new Set();let featured=[],tiles=[];
  const remote=people.filter(x=>!x.local),local=people.find(x=>x.local);
  if(shares.length)featured=[{k:"s:"+shares[0].id,x:shares[0],screen:true}];
  if(!grp){
    if(!featured.length){
      if(remote[0])featured=[{k:"c:"+remote[0].id,x:remote[0]}];
    }else if(remote[0]&&shares[0].id!==remote[0].id)tiles.push({k:"c:"+remote[0].id,x:remote[0]});
    if(local)tiles.push({k:"c:"+local.id,x:local});
  }else{
    let order=[...people];
    const rank=id=>{const i=CL.speakers.indexOf(id);return i<0?99:i;};
    order.sort((a,b)=>(b.hand-a.hand)||(rank(a.id)-rank(b.id))||(a.local-b.local));
    if(!featured.length&&narrow){
      const sp=order.find(x=>!x.local)||order[0];
      if(sp){featured=[{k:"c:"+sp.id,x:sp}];order=order.filter(x=>x!==sp);}
    }else if(featured.length){/* le partage d'écran en grand, tout le monde en dessous */}
    tiles=order.map(x=>({k:"c:"+x.id,x}));
  }
  ov.classList.toggle("has-feat",featured.length>0);
  ov.classList.toggle("alone",!grp&&!remote.length);
  const max=grp?(narrow?(featured.length?5:8):(featured.length?6:12)):9;
  let extra=0;if(tiles.length>max){extra=tiles.length-(max-1);tiles=tiles.slice(0,max-1);}
  const fe=featured.map(f=>{keep.add(f.k);return clTileEl(f.k,f.x,f.screen);});
  const te=tiles.map(f=>{keep.add(f.k);return clTileEl(f.k,f.x,f.screen);});
  if(!grp&&!remote.length){
    const c=CL.call;
    if(!feat.querySelector(".cl-wait"))feat.innerHTML=`<div class="cl-wait"><div class="cl-pulse">${clAv(clTitle(c),clOtherAvatar(c),110)}</div></div>`;
  }else{
    feat.querySelector(".cl-wait")?.remove();
    fe.forEach((el,i)=>{if(feat.children[i]!==el)feat.insertBefore(el,feat.children[i]||null);});
    [...feat.children].forEach(el=>{if(!fe.includes(el))el.remove();});
  }
  te.forEach((el,i)=>{if(grid.children[i]!==el)grid.insertBefore(el,grid.children[i]||null);});
  [...grid.children].forEach(el=>{if(!te.includes(el))el.remove();});
  if(extra)grid.appendChild(clMore(extra));
  grid.dataset.n=String(Math.min(te.length+(extra?1:0),12));
  CL.tiles.forEach((el,k)=>{if(!keep.has(k)){if(el._track){try{el._track.detach(el.querySelector("video"));}catch(_){}}el.remove();CL.tiles.delete(k);}});
  if(CL.side)clSide(people);
  clTick();clSpeakers();
  if(!CL.raf&&!min)clLevels();
}
function clSpeakers(){
  const s=CL.speaking||new Set();
  CL.tiles.forEach(el=>el.classList.toggle("spk",!el.classList.contains("screen")&&s.has(el.dataset.pid)));
  if(CL.side)document.querySelectorAll("#cl-side .cl-pp").forEach(r=>r.classList.toggle("spk",s.has(r.dataset.pid)));
}
function clLevels(){
  const room=CL.room;if(!room||!document.getElementById("cl-ov")){CL.raf=0;return;}
  const lv={};lv[room.localParticipant.identity]=room.localParticipant.audioLevel||0;
  room.remoteParticipants.forEach(p=>lv[p.identity]=p.audioLevel||0);
  CL.tiles.forEach(el=>{const v=lv[el.dataset.pid]||0;const prev=+(el._lv||0);const nv=prev*.6+Math.min(1,v*2.4)*.4;el._lv=nv;el.style.setProperty("--lv",nv.toFixed(3));});
  CL.raf=requestAnimationFrame(clLevels);
}
function clSide(people){
  const s=document.getElementById("cl-side");if(!s)return;
  people=people||clPeople();
  const org=CL.call&&CL.call.from&&CL.call.from.id===clMe()&&CL.call.is_group;
  s.innerHTML=`<div class="cl-sh"><b>${esc(clT("cl_participants_n",{n:people.length}))}</b><button type="button" class="cl-ib" onclick="clToggleSide(false)" aria-label="${esc(t("btn_close")!=="btn_close"?t("btn_close"):"×")}"><i class="ti ti-x"></i></button></div>
    <div class="cl-pl">${people.map(x=>`<div class="cl-pp" data-pid="${esc(x.id)}">${clAv(x.local?(State.tenant?.name):x.name,x.avatar,28)}<span class="cl-pn">${esc(x.name)}</span>
      ${x.hand?`<span title="${esc(t("cl_hand_up"))}">✋</span>`:""}${x.micOff?`<i class="ti ti-microphone-off cl-red" title="${esc(t("cl_mic_is_off"))}"></i>`:`<i class="ti ti-volume cl-spk-ic" aria-hidden="true"></i>`}</div>`).join("")}</div>
    ${org?`<button type="button" class="btn btn-o btn-sm" onclick="clMuteAll()"><i class="ti ti-microphone-off"></i> ${esc(t("cl_mute_all"))}</button><small>${esc(t("cl_mute_all_x"))}</small>`:""}`;
}
window.addEventListener("resize",()=>{if(CL.call)clRefreshSoon();});

// ── Les boutons d'appel dans la discussion ──
function clHeaderSync(){
  const conv=clConv(_currentConvId);
  const ok=!!conv&&conv.request!=="pending"&&!conv.awaiting&&!conv.declined&&document.getElementById("chat-blocked-banner")?.style.display!=="block"&&!(CL.cfg&&CL.cfg.enabled===false);
  [["cl-btn-audio","cl_btn_audio"],["cl-btn-video","cl_btn_video"]].forEach(([id,k])=>{const b=document.getElementById(id);if(b){b.style.display=ok?"":"none";b.setAttribute("aria-label",t(k));b.title=t(k);b.classList.toggle("live",!!(CL.call&&CL.call.conversation_id===_currentConvId));}});
  clLiveBar();
}
let _clLiveConv=null,_clLive=null;
async function clLiveCheck(convId){
  _clLiveConv=convId;_clLive=null;clLiveBar();
  const conv=clConv(convId);if(!conv||!conv.is_group)return;
  try{const r=await api("GET",`/calls/active?conversation_id=${encodeURIComponent(convId)}`);if(_clLiveConv===convId){_clLive=(r.calls||[])[0]||null;clLiveBar();}}catch(_){}
}
function clLiveBar(){
  let bar=document.getElementById("cl-live");
  const c=_clLive&&_clLive.conversation_id===_currentConvId&&["ringing","ongoing"].includes(_clLive.status)&&!(CL.call&&CL.call.id===_clLive.id)?_clLive:null;
  let seen=false;
  if(c){const box=document.getElementById("chat-messages");
    const bub=[...document.querySelectorAll("#chat-messages .cl-bub.live")].find(el=>el._m&&clInfo(el._m).call_id===c.id);
    if(bub&&box){const a=bub.getBoundingClientRect(),b=box.getBoundingClientRect();seen=a.bottom>b.top&&a.top<b.bottom;}}
  if(!c||seen){if(bar)bar.remove();return;}
  if(!bar){const msgs=document.getElementById("chat-messages");if(!msgs)return;bar=document.createElement("div");bar.id="cl-live";bar.className="cl-live";msgs.parentElement.insertBefore(bar,msgs);}
  bar.innerHTML=`<i class="ti ${c.kind==="video"?"ti-video":"ti-phone"}"></i><span>${esc(t(c.kind==="video"?"cl_b_live_v":"cl_b_live_a"))} · ${esc(clT("cl_people",{n:c.active_count||1}))}</span><button type="button" class="btn btn-g btn-sm" onclick="clJoin('${c.id}','audio')">${esc(t("cl_join"))}</button>`;
}
if(typeof openConversation==="function"){
  const _clOC=openConversation;
  openConversation=async function(id){
    const r=await _clOC.apply(this,arguments);
    try{clHeaderSync();clLiveCheck(id);clConfig().then(clHeaderSync);}catch(_){}
    return r;
  };
}

document.addEventListener("scroll",e=>{if(_clLive&&e.target&&e.target.id==="chat-messages"){clearTimeout(clLiveBar._t);clLiveBar._t=setTimeout(clLiveBar,120);}},true);

// ── Les appels dans le fil de la discussion ──
function clInfo(m){let d={};try{d=JSON.parse(m.content||"{}")||{};}catch(_){}return d;}
function clBubbleHtml(m){
  const d=clInfo(m),mine=m.is_mine!==undefined?m.is_mine:(m.sender_tenant_id===State.tenant?.id);
  const video=d.kind==="video",st=d.status,live=st==="ringing"||st==="ongoing",grp=!!d.group;
  let title,miss=false,act="";
  const k=video?"v":"a";
  if(live)title=t("cl_b_live_"+k);
  else if(st==="missed"){title=t(mine?"cl_b_noanswer_"+k:"cl_b_missed_"+k);miss=!mine;}
  else if(st==="declined")title=t(mine?"cl_b_declined_"+k:"cl_b_you_declined_"+k);
  else if(st==="cancelled"){title=t(mine?"cl_b_cancelled_"+k:"cl_b_missed_"+k);miss=!mine;}
  else title=t("cl_b_"+k);
  const bits=[];
  if(!mine&&grp)bits.push(m.sender_name||"");
  if(st==="ended"&&d.duration!=null)bits.push(clDur(d.duration));
  if(grp&&(d.people||0)>1&&(st==="ended"||live))bits.push(clT("cl_people",{n:d.people}));
  bits.push(fmtMsgTime(m.created_at));
  const inIt=CL.call&&CL.call.id===d.call_id;
  if(live){
    if(inIt)act=`<span class="cl-bt">${esc(t("cl_b_in"))}</span>`;
    else if(grp||!mine)act=`<button type="button" class="cl-bt go" onclick="event.stopPropagation();clJoin('${esc(d.call_id)}','${video?"video":"audio"}')">${esc(t(grp?"cl_join":"cl_answer"))}</button>`;
  }else if(["missed","declined","cancelled"].includes(st)){
    act=`<button type="button" class="cl-bt" onclick="event.stopPropagation();clStart('${video?"video":"audio"}','${esc(m.conversation_id||_currentConvId)}')">${esc(t("cl_callback"))}</button>`;
  }
  return `<span class="cl-bi${miss?" miss":""}"><i class="ti ${video?"ti-video":(miss?"ti-phone-x":(mine?"ti-phone-outgoing":"ti-phone-incoming"))}"></i></span>
    <span class="cl-bx"><b class="${miss?"miss":""}">${esc(title)}</b><small>${esc(bits.filter(Boolean).join(" · "))}</small></span>${act}`;
}
function clBubbleClass(m){
  const d=clInfo(m),mine=m.is_mine!==undefined?m.is_mine:(m.sender_tenant_id===State.tenant?.id);
  return "cl-bub"+(mine?" mine":"")+(d.status==="ringing"||d.status==="ongoing"?" live":"");
}
if(typeof appendMessageBubble==="function"){
  const _clAMB=appendMessageBubble;
  appendMessageBubble=function(m){
    if(!m||m.message_type!=="call"||m.deleted)return _clAMB.apply(this,arguments);
    const box=document.getElementById("chat-messages");if(!box)return;
    if(m.id&&document.getElementById(`msg-bubble-${m.id}`))return;
    if(m.created_at&&typeof dayKey==="function"){
      const key=dayKey(m.created_at);
      if(key!==_lastRenderedDayKey){
        const dv=document.createElement("div");dv.className="mday";
        dv.innerHTML=`<span>${esc(fmtDayDivider(m.created_at))}</span>`;box.appendChild(dv);_lastRenderedDayKey=key;
      }
    }
    const el=document.createElement("div");el.id=`msg-bubble-${m.id}`;el._m=m;el.className=clBubbleClass(m);el.innerHTML=clBubbleHtml(m);
    box.appendChild(el);
  };
}
function clUpdateBubble(id,convId,content){
  const el=document.getElementById(`msg-bubble-${id}`);
  if(el&&el._m){el._m={...el._m,content};el.className=clBubbleClass(el._m);el.innerHTML=clBubbleHtml(el._m);}
  if(document.getElementById("page-messaging")?.classList.contains("active")){clearTimeout(clUpdateBubble._t);clUpdateBubble._t=setTimeout(()=>{try{loadConversations();}catch(_){}},800);}
}
function clRedrawBubbles(){document.querySelectorAll(".cl-bub").forEach(el=>{if(el._m){el.className=clBubbleClass(el._m);el.innerHTML=clBubbleHtml(el._m);}});}
if(typeof msgPreviewText==="function"){
  const _clMPT=msgPreviewText;
  msgPreviewText=function(m){
    if(m&&m.message_type==="call"){const d=clInfo(m),v=d.kind==="video"?"v":"a";
      if(d.status==="missed"||d.status==="cancelled")return (d.kind==="video"?"🎥 ":"📞 ")+t("cl_b_missed_"+v);
      return (d.kind==="video"?"🎥 ":"📞 ")+t("cl_b_"+v);}
    return _clMPT.apply(this,arguments);
  };
}
if(typeof nfOnMessage==="function"){
  const _clNOM=nfOnMessage;
  nfOnMessage=function(m){if(m&&m.message_type==="call")return;return _clNOM.apply(this,arguments);};
}

// ── En direct ──
function clOnWS(d){
  if(!d||!d.type)return;
  if(d.type==="call_ring")clShowRing(d.call);
  else if(d.type==="call_update"&&d.call){
    const c=d.call;
    if(CL.ring&&CL.ring.id===c.id){
      if(d.declined===clMe())clHideRing(c.id,true);
      else if(d.joined===clMe()&&!(CL.call&&CL.call.id===c.id)){clHideRing(c.id,true);showToast(t("cl_other_device"));}
      else CL.ring=c;
    }
    if(CL.call&&CL.call.id===c.id){
      const was=CL.call.status;CL.call=c;
      if(c.answered_at&&!CL.t0)CL.t0=parseServerDate(c.answered_at).getTime();
      if(was==="ringing"&&c.status==="ongoing"&&CL.out&&c.active_count>1)clOnRemoteJoin();
      clTick();
    }
    if(c.conversation_id===_currentConvId&&c.is_group){_clLive=c;clLiveBar();}
  }else if(d.type==="call_ended"&&d.call){
    const c=d.call;
    if(CL.ring&&CL.ring.id===c.id)clHideRing(c.id,true);
    if(CL.call&&CL.call.id===c.id)clFinish(d.reason||c.status);
    _clDismissed.add(c.id);
    if(_clLive&&_clLive.id===c.id){_clLive=null;clLiveBar();}
  }else if(d.type==="call_message")clUpdateBubble(d.message_id,d.conversation_id,d.content);
}
function clAttachWS(){
  if(typeof _ws==="undefined"||!_ws||_ws._cl)return;
  _ws._cl=true;
  _ws.addEventListener("message",ev=>{let d=null;try{d=JSON.parse(ev.data);}catch(_){return;}clOnWS(d);});
  _ws.addEventListener("open",()=>clResync());
  if(_ws.readyState===1)clResync();
}
if(typeof connectMessagingWS==="function"){
  const _clCW=connectMessagingWS;
  connectMessagingWS=function(){const r=_clCW.apply(this,arguments);clAttachWS();return r;};
}
// Au retour du réseau ou de l'arrière-plan : un appel qui sonne encore s'affiche
let _clSyncAt=0;
async function clResync(){
  if(!State.token||Date.now()-_clSyncAt<4000)return;_clSyncAt=Date.now();
  try{
    const r=await api("GET","/calls/active");
    (r.calls||[]).forEach(c=>{
      if(c.status==="ringing"&&c.from&&c.from.id!==clMe()&&!(c.active||[]).includes(clMe())&&!CL.call)clShowRing(c);
    });
  }catch(_){}
}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&State.token)clResync();});
setTimeout(clAttachWS,2600);

// ── Liens depuis une notification : répondre, rappeler ──
const CL_DL=(()=>{
  const q=new URLSearchParams(location.search);
  const o={call:q.get("call"),answer:q.get("answer")==="1",kind:q.get("kind"),callback:q.get("callback"),conv:q.get("c")};
  if(o.call||o.callback){["call","answer","kind","callback"].forEach(k=>q.delete(k));try{history.replaceState(history.state,"",location.pathname+(q.toString()?"?"+q:""));}catch(_){}}
  return o;
})();
async function clHandleLink(o){
  if(!o||!(o.call||o.callback)||!State.token)return false;
  if(o.callback&&o.conv){setTimeout(()=>clStart(o.callback==="video"?"video":"audio",o.conv),600);return true;}
  try{
    const c=await api("GET",`/calls/${encodeURIComponent(o.call)}`);
    if(!["ringing","ongoing"].includes(c.status)){showToast(t("cl_already_ended"));return true;}
    if(o.answer)await clJoin(c.id,o.kind||c.kind);
    else{_clDismissed.delete(c.id);clShowRing(c);}
  }catch(e){showToast(e.message,"error");}
  return true;
}
(function clDeepLinkWait(n){
  if(!(CL_DL.call||CL_DL.callback))return;
  if(State.token&&document.body.classList.contains("zd-app-visible")||n>40&&State.token){const o={...CL_DL};CL_DL.call=CL_DL.callback=null;clHandleLink(o);return;}
  if(n>120)return;
  setTimeout(()=>clDeepLinkWait(n+1),500);
})(0);
if("serviceWorker" in navigator)navigator.serviceWorker.addEventListener("message",e=>{
  const d=e.data||{};
  if(d.type==="open-url"&&d.url){try{const u=new URL(d.url);const o={call:u.searchParams.get("call"),answer:u.searchParams.get("answer")==="1",kind:u.searchParams.get("kind"),callback:u.searchParams.get("callback"),conv:u.searchParams.get("c")};if(o.call||o.callback)clHandleLink(o);}catch(_){}}
  if((d.type==="zd-call-declined"||d.type==="zd-call-closed")&&CL.ring&&CL.ring.id===d.call_id){if(d.type==="zd-call-closed")clRingPoll();else clHideRing(d.call_id,true);}
});

// ── 10.0.0 · Sonnerie synchronisée : l'appelé voit tout de suite que l'appel est terminé ──
function clLostScreen(ov,c){
  ov.classList.add("cl-lost");
  const st=document.getElementById("cl-sub");
  if(st)st.innerHTML=`<span class="cl-lost-t"><i class="ti ti-wifi-off" aria-hidden="true"></i> ${esc(t("cl_lost_t"))}</span><span class="cl-lost-x">${esc(lkT("cl_lost_x",{n:clTitle(c)}))}</span>`;
  const bar=document.getElementById("cl-bar");
  if(bar)bar.innerHTML=`<div class="cl-lost-acts"><div><button type="button" class="cl-b green" id="cl-lost-again" aria-label="${esc(t("cl_redial"))}"><i class="ti ti-phone"></i></button><span>${esc(t("cl_redial"))}</span></div>
    <div><button type="button" class="cl-b" id="cl-lost-close" aria-label="${esc(t("btn_close"))}"><i class="ti ti-x"></i></button><span>${esc(t("btn_close"))}</span></div></div>`;
  const close=()=>{if(!CL.call)ov.remove();};
  document.getElementById("cl-lost-close")?.addEventListener("click",close);
  document.getElementById("cl-lost-again")?.addEventListener("click",()=>{ov.remove();clStart(c.kind==="video"?"video":"audio",c.conversation_id);});
}
function clRingEnded(c,reason){
  const el=document.getElementById("cl-ring");
  if(!CL.ring||CL.ring.id!==c.id||!el||el.classList.contains("busy")){clHideRing(c.id,true);return;}
  const was=CL.ring;CL.ring=null;_clDismissed.add(was.id);
  clearTimeout(CL.ringT);clearInterval(CL.ringPoll);clSoundStop();clCloseNotif(was.id);
  const who=was.from||{},grp=was.is_group,title=clTitle(was),video=was.kind==="video";
  const hung=["cancelled","caller_gone","hangup","caller"].includes(reason);
  el.className="cl-ring ended";
  el.innerHTML=`<div class="cl-ring-in">
    <div class="cl-pulse off">${clAv(title,grp?null:who.avatar,104)}</div>
    <div class="cl-who">${esc(title)}</div>
    <div class="cl-sub cl-hung"><i class="ti ti-phone-x" aria-hidden="true"></i> ${esc(t(hung?"cl_hung_up":"cl_missed_short"))}</div>
    <div class="cl-end-card"><div class="cl-end-row"><span class="cl-end-ic"><i class="ti ti-phone" aria-hidden="true"></i></span><div><b>${esc(t(video?"cl_missed_video":"cl_missed_audio"))}</b><small>${esc(new Date().toLocaleTimeString(State.lang||"fr",{hour:"2-digit",minute:"2-digit"}))}</small></div></div>
      <div class="cl-end-acts"><button type="button" class="btn btn-g" id="cl-end-call">${esc(t("cl_redial"))}</button><button type="button" class="btn btn-o" id="cl-end-write">${esc(t("cl_write"))}</button></div></div>
    <button type="button" class="cl-end-x" id="cl-end-close" aria-label="${esc(t("btn_close"))}"><i class="ti ti-x" aria-hidden="true"></i></button></div>`;
  el.style.display="flex";
  const close=()=>{clearTimeout(CL.endT);if(!CL.ring){el.style.display="none";el.innerHTML="";el.className="cl-ring";}};
  clearTimeout(CL.endT);CL.endT=setTimeout(close,8000);
  document.getElementById("cl-end-close").onclick=close;
  document.getElementById("cl-end-call").onclick=()=>{close();clStart(video?"video":"audio",was.conversation_id);};
  document.getElementById("cl-end-write").onclick=()=>{close();try{navigate("messaging");setTimeout(()=>openConversationById(was.conversation_id),400);}catch(_){}};
}
async function clRingPoll(){
  const r=CL.ring;if(!r)return;
  if(!navigator.onLine){if(!CL.offAt)CL.offAt=Date.now();else if(Date.now()-CL.offAt>8000)clHideRing(r.id,true);return;}
  CL.offAt=0;
  try{
    const c=await api("GET",`/calls/${r.id}`);
    if(!CL.ring||CL.ring.id!==r.id)return;
    if(!["ringing","ongoing"].includes(c.status))clRingEnded(c,c.status==="declined"?"declined":"missed");
    else if((c.active||[]).includes(clMe())&&!(CL.call&&CL.call.id===c.id)){clHideRing(c.id,true);showToast(t("cl_other_device"));}
  }catch(e){if(e&&e.status===404)clHideRing(r.id,true);}
}
const _clShowRing100=clShowRing;
clShowRing=function(call){
  const before=CL.ring&&CL.ring.id;
  _clShowRing100.apply(this,arguments);
  if(CL.ring&&CL.ring.id!==before){clearInterval(CL.ringPoll);CL.offAt=0;CL.ringPoll=setInterval(clRingPoll,4000);}
};
const _clHideRing100=clHideRing;
clHideRing=function(id,quiet){
  const had=CL.ring&&(!id||CL.ring.id===id);
  _clHideRing100.apply(this,arguments);
  if(had){clearInterval(CL.ringPoll);const el=document.getElementById("cl-ring");if(el)el.className="cl-ring";}
};
const _clOnWS100=clOnWS;
clOnWS=function(d){
  if(d&&d.type==="call_ended"&&d.call&&CL.ring&&CL.ring.id===d.call.id){
    const r=d.reason||d.call.status;
    if(r==="declined"&&!(CL.call&&CL.call.id===d.call.id)){clHideRing(d.call.id,true);}
    else clRingEnded(d.call,r);
    _clDismissed.add(d.call.id);
    if(CL.call&&CL.call.id===d.call.id)clFinish(d.reason||d.call.status);
    if(_clLive&&_clLive.id===d.call.id){_clLive=null;clLiveBar();}
    return;
  }
  return _clOnWS100.apply(this,arguments);
};
window.addEventListener("offline",()=>{
  if(CL.call&&CL.out&&!CL.t0){clearTimeout(CL.offT);CL.offT=setTimeout(()=>{if(CL.call&&!navigator.onLine&&CL.out&&!CL.t0)clFinish("lost");},10000);}
});
window.addEventListener("online",()=>{clearTimeout(CL.offT);if(CL.ring)clRingPoll();});
const _clDecline100=clDecline;
clDecline=async function(message){
  const c=CL.ring;if(!c)return;
  if(navigator.onLine)return _clDecline100.apply(this,arguments);
  clHideRing(c.id);
  window.addEventListener("online",()=>{api("POST",`/calls/${c.id}/decline`,message&&String(message).trim()?{message:String(message).trim()}:{}).catch(()=>{});},{once:true});
};
