const ZR={paused:false,pausedAt:0,audio:null,url:null};
function zrTr(k,v){let s=t(k);Object.entries(v||{}).forEach(([a,b])=>{s=s.split("{"+a+"}").join(String(b));});return s;}
function zrCanPause(){try{return typeof MediaRecorder!=="undefined"&&typeof MediaRecorder.prototype.pause==="function";}catch(_){return false;}}
function zrTick(){
  clearInterval(_recordingTimerInterval);
  const el=document.getElementById("recording-timer");
  const draw=()=>{const s=Math.max(0,Math.floor((Date.now()-_recordingStartTime)/1000));if(el)el.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;};
  draw();_recordingTimerInterval=setInterval(draw,1000);
}
function zrStopPreview(){
  try{if(ZR.audio){ZR.audio.pause();ZR.audio=null;}}catch(_){}
  try{if(ZR.url){URL.revokeObjectURL(ZR.url);ZR.url=null;}}catch(_){}
  const b=document.getElementById("zr-play");if(b){b.classList.remove("on");b.setAttribute("aria-label",t("zr_listen"));b.innerHTML='<i class="ti ti-player-play" aria-hidden="true"></i>';}
}
function zrUi(){
  const row=document.getElementById("recording-row");if(!row)return;
  row.classList.toggle("zr-paused",ZR.paused);
  const lbl=row.querySelector(".rec-lbl");if(lbl)lbl.textContent=t(ZR.paused?"zr_paused":"recording_in_progress");
  const pb=document.getElementById("zr-pause");
  if(pb){pb.setAttribute("aria-label",t(ZR.paused?"zr_resume":"zr_pause"));pb.innerHTML=ZR.paused?`<span class="zr-dot" aria-hidden="true"></span><span>${esc(t("zr_resume"))}</span>`:`<i class="ti ti-player-pause" aria-hidden="true"></i><span>${esc(t("zr_pause"))}</span>`;}
  const play=document.getElementById("zr-play");if(play)play.hidden=!ZR.paused;
  if(!ZR.paused)zrStopPreview();
}
function zrEnsure(){
  const row=document.getElementById("recording-row");if(!row||!zrCanPause())return;
  if(!document.getElementById("zr-pause")){
    const b=document.createElement("button");b.type="button";b.id="zr-pause";b.className="zr-pause";b.onclick=zrToggle;
    const send=row.querySelector(".rec-send");if(send)row.insertBefore(b,send);else row.appendChild(b);
  }
  if(!document.getElementById("zr-play")){
    const p=document.createElement("button");p.type="button";p.id="zr-play";p.className="zr-play";p.hidden=true;p.onclick=zrPreview;
    const pill=row.querySelector(".rec-pill");if(pill)pill.prepend(p);
  }
}
function zrToggle(){
  const r=_mediaRecorder;if(!r)return;
  try{
    if(!ZR.paused&&r.state==="recording"){
      r.pause();ZR.paused=true;ZR.pausedAt=Date.now();clearInterval(_recordingTimerInterval);
      try{r.requestData();}catch(_){}
    }else if(ZR.paused&&r.state==="paused"){
      zrStopPreview();
      _recordingStartTime+=Date.now()-ZR.pausedAt;ZR.paused=false;ZR.pausedAt=0;r.resume();zrTick();
    }
  }catch(e){showToast(e.message,"error");}
  zrUi();
}
function zrPreview(){
  const b=document.getElementById("zr-play");
  if(ZR.audio&&!ZR.audio.paused){zrStopPreview();return;}
  const parts=(typeof _recordedChunks!=="undefined"?_recordedChunks:[]).slice();
  if(!parts.length){setTimeout(()=>{if((_recordedChunks||[]).length)zrPreview();},250);return;}
  zrStopPreview();
  try{
    ZR.url=URL.createObjectURL(new Blob(parts,{type:parts[0].type||"audio/webm"}));
    ZR.audio=new Audio(ZR.url);
    ZR.audio.onended=zrStopPreview;
    ZR.audio.play().catch(()=>zrStopPreview());
    if(b){b.classList.add("on");b.setAttribute("aria-label",t("zr_stop_listen"));b.innerHTML='<i class="ti ti-player-stop" aria-hidden="true"></i>';}
  }catch(_){zrStopPreview();}
}
function zrReset(){zrStopPreview();ZR.paused=false;ZR.pausedAt=0;zrUi();}
if(typeof startVoiceRecording==="function"){
  const _zrS=startVoiceRecording;
  startVoiceRecording=async function(){zrReset();const r=await _zrS.apply(this,arguments);try{zrEnsure();zrUi();}catch(_){}return r;};
}
if(typeof stopVoiceRecording==="function"){
  const _zrE=stopVoiceRecording;
  stopVoiceRecording=async function(){
    if(ZR.paused&&ZR.pausedAt){_recordingStartTime+=Date.now()-ZR.pausedAt;ZR.pausedAt=0;}
    zrStopPreview();ZR.paused=false;
    try{return await _zrE.apply(this,arguments);}finally{zrUi();}
  };
}
if(typeof cancelVoiceRecording==="function"){
  const _zrC=cancelVoiceRecording;
  cancelVoiceRecording=async function(){zrStopPreview();ZR.paused=false;ZR.pausedAt=0;try{return await _zrC.apply(this,arguments);}finally{zrUi();}};
}

const ZS={on:false,ids:new Set()};
function zsBubble(id){return document.getElementById("msg-bubble-"+id);}
function zsMine(b){return !!b&&(b.classList.contains("mine")||b.style.alignSelf==="flex-end");}
function zsRemove(id){
  const b=zsBubble(id);if(!b)return;
  const row=b.parentElement&&b.parentElement.classList.contains("mrow")?b.parentElement:b;
  row.remove();ZS.ids.delete(id);zsBar();
}
function zsOther(){
  const c=(typeof _conversations!=="undefined"?_conversations:[]).find(x=>x.id===_currentConvId);
  return c&&!c.is_group?c.name:"";
}
function zsSheetClose(){document.getElementById("zs-sheet")?.remove();document.removeEventListener("keydown",zsKey,true);}
function zsKey(e){if(e.key==="Escape"){e.preventDefault();zsSheetClose();}}
function zsSheet(ids){
  ids=[...ids].filter(Boolean);if(!ids.length)return;
  zsSheetClose();
  const bubbles=ids.map(zsBubble).filter(Boolean);
  const allMine=bubbles.length===ids.length&&bubbles.every(zsMine);
  const one=ids.length===1;
  const other=zsOther();
  const ov=document.createElement("div");ov.id="zs-sheet";ov.className="modal-overlay";ov.style.display="flex";ov.style.alignItems="flex-end";ov.style.zIndex="3000";
  ov.innerHTML=`<div class="modal zx-sheet zs-box" role="dialog" aria-modal="true" aria-labelledby="zsd-t"><span class="zx-grab" aria-hidden="true"></span>
    <h2 id="zsd-t"></h2><p class="zs-x"></p><div class="zs-acts"></div><button type="button" class="btn btn-o zs-no"></button></div>`;
  ov.querySelector("#zsd-t").textContent=one?t("zs_t1"):zrTr("zs_tn",{n:ids.length});
  const x=ov.querySelector(".zs-x");
  if(one){
    const b=bubbles[0],raw=b&&(b.dataset.rawContent||"");
    x.textContent=allMine?(raw?`« ${raw.length>90?raw.slice(0,90)+"…":raw} »`:""):(other?zrTr("zs_theirs",{n:other}):t("zs_theirs0"));
  }else x.textContent=allMine?"":t("zs_mixed");
  if(!x.textContent)x.remove();
  const acts=ov.querySelector(".zs-acts");
  const mk=(cls,title,sub,fn)=>{const b=document.createElement("button");b.type="button";b.className="zs-opt "+cls;b.innerHTML=`<span></span><small></small>`;b.querySelector("span").textContent=title;b.querySelector("small").textContent=sub;b.onclick=fn;acts.appendChild(b);};
  if(allMine)mk("zs-all",t("zs_all"),other?zrTr("zs_all_x",{n:other}):t("zs_all_x0"),()=>zsDo(ids,"all"));
  mk("zs-me",t("zs_me"),allMine?(other?zrTr("zs_me_x",{n:other}):t("zs_me_x0")):(other?zrTr("zs_me_x2",{n:other}):t("zs_me_x0")),()=>zsDo(ids,"me"));
  const no=ov.querySelector(".zs-no");no.textContent=t("btn_cancel");no.onclick=zsSheetClose;
  ov.addEventListener("click",e=>{if(e.target===ov)zsSheetClose();});
  document.body.appendChild(ov);document.addEventListener("keydown",zsKey,true);
  setTimeout(()=>{try{no.focus();}catch(_){}},50);
}
async function zsDo(ids,mode){
  zsSheetClose();
  const btns=document.querySelectorAll("#zs-bar button");btns.forEach(b=>b.disabled=true);
  let ok=0,fail=0;
  try{
    if(mode==="me"){
      await api("POST","/messaging/messages/hide",{ids});
      ids.forEach(zsRemove);ok=ids.length;
    }else{
      for(const id of ids){
        try{await api("DELETE",`/messaging/messages/${encodeURIComponent(id)}`);if(typeof applyMessageDelete==="function")applyMessageDelete(id);ok++;}catch(_){fail++;}
      }
    }
  }catch(e){showToast(e.message,"error");}
  btns.forEach(b=>b.disabled=false);
  if(ok)showToast(ok===1?t("zs_done1"):zrTr("zs_donen",{n:ok}));
  if(fail)showToast(zrTr("zs_fail",{n:fail}),"error");
  zsSelEnd();
}
deleteMessageAction=function(msgId){zsSheet([msgId]);};

function zsBar(){
  let bar=document.getElementById("zs-bar");
  if(!ZS.on){if(bar)bar.remove();document.body.classList.remove("zs-on");return;}
  document.body.classList.add("zs-on");
  if(!bar){
    const box=document.getElementById("chat-messages");if(!box)return;
    bar=document.createElement("div");bar.id="zs-bar";bar.className="zs-bar";bar.setAttribute("role","toolbar");
    bar.innerHTML=`<button type="button" class="zs-x-btn"><i class="ti ti-x" aria-hidden="true"></i></button><span class="zs-n" aria-live="polite"></span><button type="button" class="btn btn-r btn-sm zs-del"><i class="ti ti-trash" aria-hidden="true"></i> <span></span></button>`;
    bar.querySelector(".zs-x-btn").onclick=zsSelEnd;
    bar.querySelector(".zs-del").onclick=()=>zsSheet(ZS.ids);
    box.parentNode.insertBefore(bar,box);
  }
  bar.querySelector(".zs-x-btn").setAttribute("aria-label",t("btn_cancel"));
  bar.setAttribute("aria-label",t("zs_select"));
  bar.querySelector(".zs-n").textContent=zrTr("zs_count",{n:ZS.ids.size});
  bar.querySelector(".zs-del span").textContent=t("delete_action");
  bar.querySelector(".zs-del").disabled=!ZS.ids.size;
}
function zsMark(id,on){const b=zsBubble(id);if(b){b.classList.toggle("zs-sel",on);b.setAttribute("aria-selected",on?"true":"false");}}
function zsSelStart(id){
  ZS.on=true;ZS.ids.clear();
  document.querySelectorAll("#chat-messages .mb.acts-on").forEach(x=>x.classList.remove("acts-on"));
  document.querySelectorAll("#chat-messages .mb[id^='msg-bubble-']").forEach(b=>{if(b.querySelector(".zs-ok"))b.classList.add("zs-can");});
  if(id){ZS.ids.add(id);zsMark(id,true);}
  zsBar();
}
function zsSelEnd(){ZS.on=false;ZS.ids.forEach(id=>zsMark(id,false));ZS.ids.clear();document.querySelectorAll("#chat-messages .zs-can").forEach(b=>b.classList.remove("zs-can"));zsBar();}
document.addEventListener("click",e=>{
  if(!ZS.on)return;
  const b=e.target.closest&&e.target.closest("#chat-messages .mb.zs-can");
  if(!b)return;
  e.preventDefault();e.stopPropagation();
  const id=b.id.replace("msg-bubble-","");
  const on=!ZS.ids.has(id);if(on)ZS.ids.add(id);else ZS.ids.delete(id);
  zsMark(id,on);zsBar();
},true);
const ZS_SKIP=new Set(["call","system","ephemeral_gone"]);
if(typeof appendMessageBubble==="function"){
  const _zsAMB=appendMessageBubble;
  appendMessageBubble=function(m){
    const r=_zsAMB.apply(this,arguments);
    try{
      if(m&&m.id&&!m.deleted&&!m._raw&&!ZS_SKIP.has(m.message_type)){
        const b=zsBubble(m.id),acts=b&&b.querySelector(".mb-acts");
        if(acts){
          let tr=acts.querySelector(".ti-trash");
          if(!tr){tr=document.createElement("i");tr.className="ti ti-trash";acts.appendChild(tr);}
          tr.removeAttribute("onclick");tr.classList.add("zs-ok");tr.setAttribute("role","button");tr.tabIndex=0;
          tr.title=t("delete_action");tr.setAttribute("aria-label",t("delete_action"));
          tr.onclick=e=>{e.stopPropagation();zsSheet([m.id]);};
          tr.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();tr.click();}};
          if(!acts.querySelector(".zs-pick")){
            const pk=document.createElement("i");pk.className="ti ti-checkbox zs-pick";pk.setAttribute("role","button");pk.tabIndex=0;
            pk.title=t("zs_select");pk.setAttribute("aria-label",t("zs_select"));
            pk.onclick=e=>{e.stopPropagation();zsSelStart(m.id);};
            pk.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();pk.click();}};
            tr.before(pk);
          }
          if(ZS.on)b.classList.add("zs-can");
        }
      }
    }catch(e){console.error(e);}
    return r;
  };
}
if(typeof openConversation==="function"){
  const _zsOC=openConversation;
  openConversation=function(){if(ZS.on)zsSelEnd();return _zsOC.apply(this,arguments);};
}
if(typeof connectMessagingWS==="function"){
  const _zsWS=connectMessagingWS;
  connectMessagingWS=function(){
    const had=typeof _ws!=="undefined"?_ws:null;
    const r=_zsWS.apply(this,arguments);
    try{
      if(_ws&&_ws!==had&&!_ws._zs){
        _ws._zs=true;
        _ws.addEventListener("message",ev=>{try{const d=JSON.parse(ev.data);if(d&&d.type==="message_hidden"&&typeof d.id==="string")zsRemove(d.id);}catch(_){}});
      }
    }catch(_){}
    return r;
  };
}

if(typeof nfRenderCard==="function"){
  const _zaRC=nfRenderCard;
  nfRenderCard=async function(){
    const r=await _zaRC.apply(this,arguments);
    try{
      const card=document.querySelector("#nf-box .zn-card");if(!card||typeof _nf==="undefined"||!_nf)return r;
      if(card.querySelector(".za-row"))return r;
      const s=_nf;
      const rows=[...card.querySelectorAll(".nf-row")];
      const after=rows[rows.length-1];
      const mk=(k,on,tk,xk)=>`<div class="nf-row za-row"><div><b>${esc(t(tk))}</b><small>${esc(t(xk))}</small></div>${nfSwitch(on,`znSetStrong({${k}:${!on}})`,t(tk))}</div>`;
      const html=mk("sticky",s.sticky!==false,"za_sticky_t","za_sticky_x")+mk("call_ring",s.call_ring!==false,"za_call_t","za_call_x");
      if(after)after.insertAdjacentHTML("afterend",html);else card.insertAdjacentHTML("beforeend",html);
    }catch(e){console.error(e);}
    return r;
  };
}
if(typeof applyMessageDelete==="function"){
  applyMessageDelete=function(msgId){
    const b=zsBubble(msgId);if(!b)return;
    const mine=zsMine(b),name=b.dataset.senderName||"";
    const time=(b.querySelector(".mb-time")||b.querySelector(".mb-meta"))?.textContent||"";
    b.classList.add("mb-sys");b.classList.remove("acts-on","zs-can","zs-sel");
    b.innerHTML=`${!mine&&name?`<div class="mb-name"></div>`:""}<span class="mb-off"><i class="ti ti-ban" aria-hidden="true"></i> <span></span></span><div class="mb-meta"></div>`;
    const n=b.querySelector(".mb-name");if(n)n.textContent=name;
    b.querySelector(".mb-off span").textContent=t("message_deleted_placeholder");
    b.querySelector(".mb-meta").textContent=time.trim();
    b.onclick=null;b.oncontextmenu=null;b.ondblclick=null;
    ZS.ids.delete(msgId);if(ZS.on)zsBar();
  };
}
