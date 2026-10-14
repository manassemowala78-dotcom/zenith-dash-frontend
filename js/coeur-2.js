function disconnectMessagingWS(){if(_ws){_ws.onclose=null;_ws.close();_ws=null;}}
function msgPreviewText(m){
  if(m.view_once||m.needs_reveal) return t("preview_view_once");
  switch(m.message_type){
    case "location": return t("shared_location");
    case "contact": return t("preview_contact");
    case "voice": return t("preview_voice");
    case "file": return `📎 ${m.file_name||t("msg_file_label")}`;
    case "poll": return `📊 ${m.content||""}`;
    default: return m.content||t("msg_file_placeholder");
  }
}
function handleIncomingMessage(msg){
  if(msg.sender_tenant_id===State.tenant?.id){
    if(msg.conversation_id===_currentConvId){
      const local=msg.client_msg_id?document.getElementById(`msg-bubble-${msg.client_msg_id}`):null;
      if(local){
        appendMessageBubble({...msg,is_mine:true,reactions:msg.reactions||[]});
        const created=document.getElementById(`msg-bubble-${msg.id}`);
        if(created&&created!==local) local.replaceWith(created);
      }else if(!document.getElementById(`msg-bubble-${msg.id}`)){
        appendMessageBubble({...msg,is_mine:true,reactions:msg.reactions||[]});
        scrollChatToBottom();
      }
    }
    loadConversations();return;
  }
  if(msg.conversation_id===_currentConvId){
    appendMessageBubble(msg);
    scrollChatToBottom();
    if(document.visibilityState==="visible"&&_ws&&_ws.readyState===1){
      _ws.send(JSON.stringify({type:"mark_read",conversation_id:_currentConvId}));
    }
  }else{
    showToast(`💬 ${msg.sender_name}: ${msgPreviewText(msg)}`);
  }
  loadConversations();
}
let _typingUsers=new Map();
function showTypingIndicator(data){
  if(data.conversation_id!==_currentConvId)return;
  clearTimeout(_typingUsers.get(data.tenant_id)?.timeout);
  const timeout=setTimeout(()=>{_typingUsers.delete(data.tenant_id);renderTypingIndicator();},2500);
  _typingUsers.set(data.tenant_id,{name:data.tenant_name,timeout});
  renderTypingIndicator();
}
function renderTypingIndicator(){
  const el=document.getElementById("chat-typing-indicator");
  const names=[..._typingUsers.values()].map(u=>u.name);
  if(!names.length){el.textContent="";return;}
  if(names.length===1){el.textContent=`${names[0]} ${t("msg_typing_suffix")}`;return;}
  if(names.length===2){el.textContent=`${names[0]} ${t("and_word")} ${names[1]} ${t("msg_typing_suffix_plural")}`;return;}
  el.textContent=`${names.length} ${t("several_typing_suffix")}`;
}
function notifyTyping(){
  if(_ws&&_ws.readyState===1&&_currentConvId){
    _ws.send(JSON.stringify({type:"typing",conversation_id:_currentConvId}));
  }
}
function avatarHtml(url,name,size){
  if(url) return `<div style="width:${size}px;height:${size}px;border-radius:50%;background-image:url('${url}');background-size:cover;background-position:center;flex-shrink:0"></div>`;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--green);color:#04160e;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${Math.round(size*0.42)}px;flex-shrink:0">${esc((name||"?").charAt(0).toUpperCase())}</div>`;
}
async function loadConversations(){
  connectMessagingWS();
  const box=document.getElementById("conv-list");if(!box)return;
  try{
    _conversations=await api("GET","/messaging/conversations");
    _conversations.forEach(c=>{if(_pendingConvTheme[c.id])c.theme=_pendingConvTheme[c.id];});
    renderConvList();
  }catch(e){box.innerHTML=`<div style="color:var(--red);padding:16px;font-size:13px">${esc(e.message)}</div>`;}
}
function renderConvList(){
  const box=document.getElementById("conv-list");if(!box)return;
  const totalUnread=_conversations.reduce((s,c)=>s+c.unread_count,0);
  const badge=document.getElementById("msg-unread-badge");
  if(badge) badge.style.display=totalUnread>0?"inline-flex":"none";
  if(!_conversations.length){box.innerHTML=`<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">${t("no_conversations")}</div>`;return;}
  box.innerHTML=_conversations.map(c=>`
      <div onclick="openConversation('${c.id}','${escJs(c.name)}')" style="padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--b);display:flex;gap:10px;align-items:center;${c.id===_currentConvId?'background:var(--c2)':''}">
        <div style="position:relative;flex-shrink:0">
          ${c.is_group?`<div style="width:40px;height:40px;border-radius:50%;background:var(--card);display:flex;align-items:center;justify-content:center"><i class="ti ti-users-group" style="color:var(--purple);font-size:18px"></i></div>`:avatarHtml(c.other_avatar_url,c.name,40)}
          ${!c.is_group&&c.other_online?`<span style="position:absolute;bottom:0;right:0;width:11px;height:11px;border-radius:50%;background:var(--green);border:2px solid var(--s)"></span>`:''}
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between"><b style="font-size:13px">${esc(c.name)}</b>${c.unread_count>0?`<span class="badge bb" style="font-size:10px">${c.unread_count}</span>`:''}</div>
          <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${c.blocked_by_me?`<span style="color:var(--red)"><i class="ti ti-ban"></i> ${t("blocked_tag")}</span> · `:""}${esc(c.last_message)||t("no_message")}</div>
        </div>
      </div>`).join("");
}
async function openConversation(convId,name){
  _currentConvId=convId;
  setViewOnceMode(null);
  setEphemeralDuration(null);
  cancelReply();
  document.getElementById("chat-input-row").style.display="flex";
  document.getElementById("recording-row").style.display="none";
  updateChatBlockUI();
  document.getElementById("chat-empty-state").style.display="none";
  document.getElementById("chat-active").style.display="flex";
  document.getElementById("msg-layout")?.classList.add("mobile-chat-open");
  applyMobileMessagingLayout();
  applyConversationTheme();
  document.getElementById("chat-header-name").textContent=name;
  const headerConv=_conversations.find(c=>c.id===convId);
  const headerAv=document.getElementById("chat-header-avatar");
  if(headerAv) headerAv.innerHTML=headerConv?.is_group?`<div style="width:34px;height:34px;border-radius:50%;background:var(--card);display:flex;align-items:center;justify-content:center"><i class="ti ti-users-group" style="color:var(--purple);font-size:16px"></i></div>`:avatarHtml(headerConv?.other_avatar_url,name,34);
  document.getElementById("chat-more-menu").style.display="none";
  document.getElementById("chat-theme-panel").style.display="none";
  document.getElementById("extra-features-menu").style.display="none";
  _typingUsers.forEach(u=>clearTimeout(u.timeout));
  _typingUsers.clear();
  document.getElementById("chat-typing-indicator").textContent="";
  _countedReaders.clear();
  loadPinnedBar(convId);
  loadGroupMembersIfNeeded(convId);
  _pendingMentions=[];
  document.getElementById("mention-dropdown").style.display="none";
  updateMuteArchiveIcons();
  const convInfo=_conversations.find(c=>c.id===convId);
  const statusEl=document.getElementById("chat-header-status");
  if(statusEl){
    if(convInfo&&convInfo.other_online!=null){
      statusEl.style.display="block";
      statusEl.textContent=convInfo.other_online?t("online_status"):fmtLastSeen(convInfo.other_last_seen);
      statusEl.style.color=convInfo.other_online?"var(--green)":"var(--muted)";
    }else{
      statusEl.style.display="none";
    }
  }
  _lastRenderedDayKey=null;
  document.getElementById("chat-messages").innerHTML=`<div style="text-align:center;color:var(--muted)">${t("loading")}</div>`;
  loadConversations();
  try{
    const msgs=await api("GET",`/messaging/conversations/${convId}/messages`);
    const box=document.getElementById("chat-messages");
    box.innerHTML="";
    msgs.forEach(m=>appendMessageBubble(m));
    scrollChatToBottom();
  }catch(e){showToast(e.message,"error");}
}
function appendMessageBubble(m){
  const box=document.getElementById("chat-messages");if(!box)return;
  if(m.id&&document.getElementById(`msg-bubble-${m.id}`))return;
  if(m.created_at){
    const key=dayKey(m.created_at);
    if(key!==_lastRenderedDayKey){
      const divider=document.createElement("div");
      divider.style.cssText="text-align:center;margin:10px 0;font-size:11px;color:var(--muted);align-self:center";
      divider.textContent=fmtDayDivider(m.created_at);
      box.appendChild(divider);
      _lastRenderedDayKey=key;
    }
  }
  const mine=m.is_mine!==undefined?m.is_mine:(m.sender_tenant_id===State.tenant?.id);
  const div=document.createElement("div");
  div.id=`msg-bubble-${m.id}`;
  div.dataset.senderName=m.sender_name||"";
  div.style.cssText=`max-width:70%;align-self:${mine?'flex-end':'flex-start'};background:${mine?'var(--bub-mine-bg,var(--green))':'var(--bub-theirs-bg,var(--card))'};color:${mine?'var(--bub-mine-fg,#04160e)':'var(--bub-theirs-fg,var(--text))'};padding:8px 12px;border-radius:12px;font-size:13px;min-width:0;overflow-wrap:anywhere;word-break:break-word`;

  if(m.deleted){
    div.innerHTML=`${!mine?`<div style="font-size:11px;font-weight:700;margin-bottom:2px">${esc(m.sender_name)}</div>`:""}<i class="ti ti-ban" style="opacity:.6"></i> <i style="opacity:.6">${t("message_deleted_placeholder")}</i>
      <div style="font-size:10px;opacity:.6;margin-top:3px">${fmtMsgTime(m.created_at)}</div>`;
    box.appendChild(div);return;
  }
  if(m.destroyed){
    div.innerHTML=`${!mine?`<div style="font-size:11px;font-weight:700;margin-bottom:2px">${esc(m.sender_name)}</div>`:""}<i class="ti ti-eye-off" style="opacity:.6"></i> <i style="opacity:.6">${t("message_destroyed")}</i>
      <div style="font-size:10px;opacity:.6;margin-top:3px">${fmtMsgTime(m.created_at)}</div>`;
    box.appendChild(div);return;
  }
  if(m.needs_reveal){
    div.style.cursor="pointer";
    div.innerHTML=`${!mine?`<div style="font-size:11px;font-weight:700;margin-bottom:2px">${esc(m.sender_name)}</div>`:""}<i class="ti ti-eye"></i> ${t("tap_to_view")}
      <div style="font-size:10px;opacity:.6;margin-top:3px">${fmtMsgTime(m.created_at)}</div>`;
    div.onclick=()=>revealViewOnceMessage(m.id);
    box.appendChild(div);return;
  }
  let content="";
  if(m._raw){
    content=m.content;
  }else if(m.message_type==="poll"&&m.poll){
    const p=m.poll;
    content=`<div data-poll-id="${p.id}" style="min-width:220px">
      <div style="font-weight:700;margin-bottom:8px"><i class="ti ti-chart-bar"></i> ${esc(p.question)}</div>
      ${p.options.map((opt,idx)=>{
        const pct=p.total_votes>0?Math.round((p.votes[idx]/p.total_votes)*100):0;
        const isMyVote=p.my_vote===idx;
        return `<div class="poll-option-row${isMyVote?' poll-my-vote':''}" onclick="votePollOption('${p.id}',${idx})" style="cursor:pointer;position:relative;margin-bottom:6px;padding:6px 10px;border-radius:6px;border:1px solid ${isMyVote?'var(--purple)':'rgba(0,0,0,.15)'};overflow:hidden">
          <div class="poll-bar" style="position:absolute;left:0;top:0;bottom:0;background:rgba(168,85,247,.18);width:${pct}%;transition:width .3s"></div>
          <div style="position:relative;display:flex;justify-content:space-between;font-size:12px">
            <span>${isMyVote?'✓ ':''}${esc(opt)}</span><span class="poll-pct">${pct}%</span>
          </div>
        </div>`;
      }).join("")}
      <div class="poll-total" style="font-size:11px;opacity:.6;margin-top:4px">${p.total_votes} ${t("poll_votes_count")}</div>
    </div>`;
  }else if(m.message_type==="location"){
    try{
      const loc=JSON.parse(m.content);
      const mapsUrl=`https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
      content=`<a href="${mapsUrl}" target="_blank" style="color:inherit;text-decoration:none;display:block">
        <div style="background:rgba(0,0,0,.08);border-radius:8px;padding:10px;min-width:180px">
          <div style="font-weight:700;font-size:12px">${t("shared_location")}</div>
          <div style="font-size:11px;text-decoration:underline;margin-top:4px">${t("open_in_maps")} →</div>
        </div></a>`;
    }catch(e){content=t("shared_location");}
  }else if(m.message_type==="contact"){
    try{
      const c=JSON.parse(m.content);
      content=`<div style="background:rgba(0,0,0,.08);border-radius:8px;padding:10px;min-width:180px">
        <div style="font-weight:700;font-size:12px">${t("shared_contact_prefix")} ${esc(c.name)}</div>
        <button class="btn btn-sm btn-o" style="margin-top:6px;width:100%" onclick="startConvFromSharedContact('${c.tenant_id}','${escJs(c.name)}')">${t("start_conv_btn")}</button>
      </div>`;
    }catch(e){content=t("shared_contact_prefix");}
  }else if(m.message_type==="voice"){
    content=`<audio controls preload="metadata" style="height:36px;max-width:220px" src="${m.file_url}"></audio>`;
  }else if(m.message_type==="file"){
    content=`<a href="${m.file_url}" target="_blank" style="color:inherit;text-decoration:underline"><i class="ti ti-file"></i> ${esc(m.file_name)||t("msg_file_label")}</a>`;
  }else{
    content=`<span id="content-${m.id}">${highlightMentions(linkify(esc(m.content)))}</span>`;
  }
  const replyHtml=m.reply_to?`<div onclick="scrollToMessage('${m.reply_to.id}')" style="cursor:pointer;border-left:3px solid ${mine?'currentColor':'var(--blue)'};padding:3px 8px;margin-bottom:5px;opacity:.85;font-size:12px;border-radius:4px;background:rgba(0,0,0,.08)">
      <div style="font-weight:700">${esc(m.reply_to.sender_name)}</div>
      <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px">${m.reply_to.deleted?t("message_deleted_placeholder"):esc(m.reply_to.content)}</div>
    </div>`:"";
  const reactionsHtml=(m.reactions&&m.reactions.length)?`<div style="margin-top:4px;font-size:11px">${m.reactions.map(r=>r.emoji).join(" ")}</div>`:"";
  const translateBtn=(m.content&&m.message_type==="text")?`<i class="ti ti-language" style="cursor:pointer;opacity:.6;margin-left:6px;font-size:12px" onclick="translateMessage('${m.id}',this)" title="${t("msg_translate_title")}"></i>`:"";
  const viewOnceBadge=m.view_once?`<i class="ti ti-eye" style="opacity:.6;margin-left:4px;font-size:11px" title="${t("view_once_toggle")}"></i>`:"";
  const viewedBadge=(m.view_once&&m.viewed_at)?` · ${t("viewed_indicator")}`:"";
  const readTicks=mine?(m.total_others!=null
    ?`<span id="ticks-${m.id}" data-total-others="${m.total_others}" data-base-read-count="${m.read_count||0}" style="font-size:10px;margin-left:4px;color:${m.read_count>0?'#2dd4ff':'var(--muted)'}">${m.read_count>=m.total_others&&m.total_others>0?t("read_by_all"):`${t("read_by_prefix")} ${m.read_count||0}/${m.total_others}`}</span>`
    :tickIconHtml(m.id,m.read_by_other?"read":m.delivered?"delivered":"sent")):"";
  const editedBadge=m.edited_at?` <i style="opacity:.6">${t("edited_suffix")}</i>`:"";
  const replyPreviewText=m.message_type==="text"?(m.content||"").slice(0,80):`[${m.message_type}]`;
  const canEditDelete=mine&&m.message_type==="text"&&!m.view_once;
  const isPinned=!!m.pinned_at;
  const actionsHtml=`<span style="display:inline-flex;flex-wrap:wrap;gap:6px;margin-left:6px;opacity:.6">
      <i class="ti ti-arrow-back-up" style="cursor:pointer;font-size:12px" onclick="replyToMessageAction('${m.id}','${escJs(m.sender_name)}','${escJs(replyPreviewText)}')" title="${t("reply_action")}"></i>
      <i class="ti ti-arrow-forward-up" style="cursor:pointer;font-size:12px" onclick="openForwardModal('${m.id}')" title="${t("forward_action")}"></i>
      <i class="ti ${isPinned?'ti-pinned-off':'ti-pin'}" style="cursor:pointer;font-size:12px" onclick="togglePinMessage('${m.id}',${isPinned})" title="${isPinned?t("unpin_action"):t("pin_action")}"></i>
      <i class="ti ${m.is_starred?'ti-star-filled':'ti-star'}" style="cursor:pointer;font-size:12px;${m.is_starred?'color:#f5a623':''}" onclick="toggleStarMessage('${m.id}',${!!m.is_starred},this)" title="${m.is_starred?t("unstar_action"):t("star_action")}"></i>
      ${canEditDelete?`<i class="ti ti-pencil" style="cursor:pointer;font-size:12px" onclick="editMessageAction('${m.id}')" title="${t("edit_action")}"></i>`:""}
      ${canEditDelete?`<i class="ti ti-trash" style="cursor:pointer;font-size:12px" onclick="deleteMessageAction('${m.id}')" title="${t("delete_action")}"></i>`:""}
    </span>`;
  if(mine) div.dataset.createdAt=m.created_at;
  if(m.message_type==="text") div.dataset.rawContent=m.content||"";
  div.innerHTML=`${!mine?`<div style="font-size:11px;font-weight:700;margin-bottom:2px">${esc(m.sender_name)}</div>`:""}${replyHtml}${content}${editedBadge}${translateBtn}${viewOnceBadge}${actionsHtml}
    <div id="translation-${m.id}" style="font-size:12px;font-style:italic;opacity:.85;margin-top:4px"></div>
    ${reactionsHtml}
    <div style="font-size:10px;opacity:.6;margin-top:3px;display:flex;align-items:center;gap:2px">${fmtMsgTime(m.created_at)}${viewedBadge}${readTicks}</div>`;
  div.oncontextmenu=(e)=>{e.preventDefault();reactToMessage(m.id);};
  div.ondblclick=()=>reactToMessage(m.id);
  if(mine){box.appendChild(div);return;}
  const row=document.createElement("div");
  row.style.cssText="display:flex;align-items:flex-end;gap:6px;align-self:flex-start";
  const avatar=document.createElement("div");
  avatar.style.cssText="width:28px;height:28px;border-radius:50%;flex-shrink:0;overflow:hidden;background:var(--green);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#04160e";
  avatar.dataset.avatarFor=m.sender_tenant_id||"";
  if(m.sender_avatar){
    avatar.innerHTML=`<img src="${m.sender_avatar}" style="width:100%;height:100%;object-fit:cover" alt="">`;
  }else{
    avatar.textContent=(m.sender_name||"?").charAt(0).toUpperCase();
  }
  row.style.maxWidth="calc(70% + 34px)";
  div.style.maxWidth="calc(100% - 34px)";
  div.style.alignSelf="auto";
  row.appendChild(avatar);
  row.appendChild(div);
  box.appendChild(row);
}
async function revealViewOnceMessage(msgId){
  try{
    const r=await api("POST",`/messaging/messages/${msgId}/view`);
    const bubble=document.getElementById(`msg-bubble-${msgId}`);
    if(!bubble)return;
    if(r.destroyed||!r.content&&!r.file_url){
      bubble.innerHTML=`<i class="ti ti-eye-off" style="opacity:.6"></i> <i style="opacity:.6">${t("message_destroyed")}</i>`;
      bubble.style.cursor="default";bubble.onclick=null;
      return;
    }
    bubble.style.cursor="default";bubble.onclick=null;
    let content;
    if(r.message_type==="voice"&&r.file_url) content=`<audio controls preload="metadata" style="height:36px;max-width:220px" src="${r.file_url}"></audio>`;
    else if(r.file_url) content=`<a href="${r.file_url}" target="_blank" style="color:inherit;text-decoration:underline">${esc(r.content)||t("msg_file_label")}</a>`;
    else content=esc(r.content);
    bubble.innerHTML=`${content}<div style="font-size:10px;opacity:.6;margin-top:3px">${t("viewed_indicator")}</div>`;
  }catch(e){showToast(e.message,"error");}
}

// ── ENREGISTREMENT VOCAL ─────────────────────────────────────────────────────
let _mediaRecorder=null,_recordedChunks=[],_recordingStartTime=null,_recordingTimerInterval=null;
async function startVoiceRecording(){
  if(!navigator.mediaDevices||!window.MediaRecorder){showToast(t("mic_not_supported"),"error");return;}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    _recordedChunks=[];
    _mediaRecorder=new MediaRecorder(stream);
    _mediaRecorder.ondataavailable=(e)=>{if(e.data.size>0)_recordedChunks.push(e.data);};
    _mediaRecorder.start();
    _recordingStartTime=Date.now();
    document.getElementById("chat-input-row").style.display="none";
    document.getElementById("recording-row").style.display="flex";
    document.getElementById("recording-timer").textContent="0:00";
    _recordingTimerInterval=setInterval(()=>{
      const secs=Math.floor((Date.now()-_recordingStartTime)/1000);
      document.getElementById("recording-timer").textContent=`${Math.floor(secs/60)}:${String(secs%60).padStart(2,"0")}`;
    },1000);
  }catch(e){
    showToast(t("mic_permission_denied"),"error");
  }
}
function _stopRecordingInternal(){
  return new Promise(resolve=>{
    if(!_mediaRecorder){resolve(null);return;}
    _mediaRecorder.onstop=()=>{
      _mediaRecorder.stream.getTracks().forEach(tr=>tr.stop());
      resolve(new Blob(_recordedChunks,{type:"audio/webm"}));
    };
    _mediaRecorder.stop();
  });
}
async function stopVoiceRecording(){
  clearInterval(_recordingTimerInterval);
  document.getElementById("chat-input-row").style.display="flex";
  document.getElementById("recording-row").style.display="none";
  const blob=await _stopRecordingInternal();
  _mediaRecorder=null;
  if(!blob||blob.size===0)return;
  const file=new File([blob],`voice-${Date.now()}.webm`,{type:"audio/webm"});
  await sendFileMessage(file);
}
async function cancelVoiceRecording(){
  clearInterval(_recordingTimerInterval);
  document.getElementById("chat-input-row").style.display="flex";
  document.getElementById("recording-row").style.display="none";
  await _stopRecordingInternal();
  _mediaRecorder=null;
  _recordedChunks=[];
}
function scrollToMessage(msgId){
  const el=document.getElementById(`msg-bubble-${msgId}`);
  if(!el)return;
  el.scrollIntoView({behavior:"smooth",block:"center"});
  const original=el.style.outline;
  el.style.outline="2px solid var(--blue)";
  setTimeout(()=>{el.style.outline=original;},1200);
}
async function editMessageAction(msgId){
  const bubble=document.getElementById(`msg-bubble-${msgId}`);
  const current=bubble?.dataset.rawContent||"";
  const newContent=prompt(t("prompt_edit_msg"),current);
  if(newContent===null||newContent.trim()===""||newContent===current)return;
  try{
    const r=await api("PATCH",`/messaging/messages/${msgId}`,{content:newContent.trim()});
    applyMessageEdit(msgId,r.content,r.edited_at);
  }catch(e){showToast(e.message,"error");}
}
function applyMessageEdit(msgId,content,editedAt){
  const bubble=document.getElementById(`msg-bubble-${msgId}`);
  const contentSpan=document.getElementById(`content-${msgId}`);
  if(!bubble||!contentSpan)return;
  bubble.dataset.rawContent=content;
  contentSpan.innerHTML=highlightMentions(linkify(esc(content)));
  if(!bubble.querySelector(".edited-tag")){
    const span=document.createElement("i");
    span.className="edited-tag"; span.style.opacity=".6"; span.textContent=` ${t("edited_suffix")}`;
    contentSpan.after(span);
  }
}
async function deleteMessageAction(msgId){
  if(!confirm(t("confirm_delete_msg")))return;
  try{
    await api("DELETE",`/messaging/messages/${msgId}`);
    applyMessageDelete(msgId);
  }catch(e){showToast(e.message,"error");}
}
function applyMessageDelete(msgId){
  const bubble=document.getElementById(`msg-bubble-${msgId}`);
  if(!bubble)return;
  const mine=bubble.style.alignSelf==="flex-end";
  bubble.innerHTML=`${!mine&&bubble.dataset.senderName?`<div style="font-size:11px;font-weight:700;margin-bottom:2px">${esc(bubble.dataset.senderName)}</div>`:""}<i class="ti ti-ban" style="opacity:.6"></i> <i style="opacity:.6">${t("message_deleted_placeholder")}</i>`;
  bubble.onclick=null; bubble.oncontextmenu=null; bubble.ondblclick=null;
}
let _forwardMsgId=null;
function openForwardModal(msgId){
  _forwardMsgId=msgId;
  const box=document.getElementById("forward-conv-list");
  box.innerHTML=_conversations.map(c=>`<div onclick="submitForward('${c.id}')" style="padding:10px;cursor:pointer;border-bottom:1px solid var(--b)">
    <b style="font-size:13px">${c.is_group?'<i class="ti ti-users-group"></i> ':''}${esc(c.name)}</b>
  </div>`).join("")||`<div style="color:var(--muted);padding:10px">${t("no_conversations")}</div>`;
  document.getElementById("modal-forward").style.display="flex";
}
function closeForwardModal(){document.getElementById("modal-forward").style.display="none";_forwardMsgId=null;}
async function submitForward(targetConvId){
  const sourceBubble=document.getElementById(`msg-bubble-${_forwardMsgId}`);
  const content=sourceBubble?.dataset.rawContent;
  if(!content){closeForwardModal();return;}
  try{
    await api("POST",`/messaging/conversations/${targetConvId}/messages`,{content,message_type:"text"});
    showToast(t("toast_forwarded"));
  }catch(e){showToast(e.message,"error");}
  closeForwardModal();
}
function tickIconHtml(id,state){
  const cls=state==="sent"?"ti-check":"ti-checks";
  const style=state==="read"?"color:var(--bub-tick-read,#2dd4ff);opacity:1":"opacity:.55";
  return `<i id="ticks-${id}" data-tick="${state}" class="ti ${cls}" style="font-size:13px;margin-left:3px;${style}" title="${t("tick_"+state)}"></i>`;
}
function setTickState(el,state){
  const order={sent:0,delivered:1,read:2};
  if((order[el.dataset.tick]||0)>=order[state])return;
  el.dataset.tick=state;
  el.className=`ti ${state==="sent"?"ti-check":"ti-checks"}`;
  el.style.color=state==="read"?"var(--bub-tick-read,#2dd4ff)":"";
  el.style.opacity=state==="read"?"1":".55";
  el.title=t("tick_"+state);
}
function handleDeliveredReceipt(data){
  if(data.conversation_id!==_currentConvId)return;
  const at=parseServerDate(data.delivered_at);
  document.querySelectorAll('#chat-messages i[id^="ticks-"]').forEach(el=>{
    const bubble=el.closest("div[data-created-at]");
    if(!bubble||parseServerDate(bubble.dataset.createdAt)>at)return;
    setTickState(el,"delivered");
  });
}
function scrollChatToBottom(){const box=document.getElementById("chat-messages");if(box)box.scrollTop=box.scrollHeight;}
let _countedReaders=new Map();
function handleReadReceipt(data){
  if(data.conversation_id!==_currentConvId)return;
  const readAt=parseServerDate(data.read_at);
  document.querySelectorAll('#chat-messages [id^="ticks-"]').forEach(el=>{
    const bubble=el.closest("div[data-created-at]");
    if(!bubble)return;
    if(parseServerDate(bubble.dataset.createdAt)>readAt)return;
    const msgId=el.id.replace("ticks-","");
    if(el.dataset.totalOthers!=null){
      if(!_countedReaders.has(msgId)) _countedReaders.set(msgId,new Set());
      const readers=_countedReaders.get(msgId);
      if(readers.has(data.reader_id))return;
      readers.add(data.reader_id);
      const total=parseInt(el.dataset.totalOthers,10);
      const baseCount=parseInt(el.dataset.baseReadCount,10)||0;
      const count=Math.min(baseCount+readers.size,total);
      el.style.color=count>0?"#2dd4ff":"var(--muted)";
      el.textContent=count>=total&&total>0?t("read_by_all"):`${t("read_by_prefix")} ${count}/${total}`;
    }else{
      setTickState(el,"read");
    }
  });
}

// ── PHOTO DE PROFIL & FOND D'ÉCRAN ──────────────────────────────────────────
function applyAvatarPreview(url,name){
  const el=document.getElementById("avatar-preview");if(!el)return;
  if(url){el.style.backgroundImage=`url('${url}')`;el.textContent="";}
  else{el.style.backgroundImage="";el.textContent=(name||"?").charAt(0).toUpperCase();}
}
function compressImageFile(file,maxDimension,quality){
  return new Promise((resolve,reject)=>{
    if(!file.type.startsWith("image/")){resolve(file);return;}
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      let w=img.width,h=img.height;
      if(w>maxDimension||h>maxDimension){
        if(w>h){h=Math.round(h*(maxDimension/w));w=maxDimension;}
        else{w=Math.round(w*(maxDimension/h));h=maxDimension;}
      }
      const canvas=document.createElement("canvas");
      canvas.width=w;canvas.height=h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      canvas.toBlob(blob=>{
        if(!blob){resolve(file);return;}
        resolve(new File([blob],file.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg"}));
      },"image/jpeg",quality);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(file);};
    img.src=url;
  });
}
function setTopbarAvatar(url,name){
  const el=document.getElementById("topbar-av");if(!el)return;
  if(url){el.style.backgroundImage=`url('${url}')`;el.style.backgroundSize="cover";el.style.backgroundPosition="center";el.textContent="";}
  else{el.style.backgroundImage="";el.textContent=(name||"?").charAt(0).toUpperCase();}
}
function showOwnAvatarEverywhere(url){
  const name=State.tenant?.acting_as_member_name||State.tenant?.name;
  applyAvatarPreview(url,name);
  setTopbarAvatar(url,name);
}
function resetFileInputs(selector){document.querySelectorAll(selector).forEach(i=>{i.value="";});}
async function uploadAvatar(file){
  resetFileInputs('input[type=file][onchange^="uploadAvatar"]');
  if(!file)return;
  const previous=State.tenant?.avatar_url||null;
  const localUrl=URL.createObjectURL(file);
  showOwnAvatarEverywhere(localUrl);
  showToast(t("uploading_label"));
  try{
    const compressed=await compressImageFile(file,800,0.85);
    const fd=new FormData();fd.append("file",compressed);
    const r=await apiUpload("/profile/avatar",fd);
    if(State.tenant){State.tenant.avatar_url=r.avatar_url;localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));}
    const img=new Image();
    img.onload=()=>{showOwnAvatarEverywhere(r.avatar_url);URL.revokeObjectURL(localUrl);};
    img.onerror=()=>{};
    img.src=r.avatar_url;
    showToast(t("toast_avatar_updated"));
  }catch(e){
    showOwnAvatarEverywhere(previous);URL.revokeObjectURL(localUrl);
    showToast(e.message,"error");
  }
}
function handleProfileUpdated(data){
  let changed=false;
  _conversations.forEach(c=>{if(!c.is_group&&c.other_tenant_id===data.tenant_id){c.other_avatar_url=data.avatar_url;changed=true;}});
  if(changed) renderConvList();
  const cur=_conversations.find(c=>c.id===_currentConvId);
  const headerAv=document.getElementById("chat-header-avatar");
  if(cur&&!cur.is_group&&cur.other_tenant_id===data.tenant_id&&headerAv) headerAv.innerHTML=avatarHtml(data.avatar_url,cur.name,34);
  document.querySelectorAll(`[data-avatar-for="${data.tenant_id}"]`).forEach(el=>{
    el.textContent="";el.innerHTML=`<img src="${data.avatar_url}" style="width:100%;height:100%;object-fit:cover" alt="">`;
  });
}
const WALLPAPER_SWATCHES={
  default:"var(--bg)",dark_leaves:"linear-gradient(135deg,#0f2418,#1a3d2a)",soft_blue:"linear-gradient(135deg,#0f1f2e,#1a3550)",
  warm_sand:"linear-gradient(135deg,#2e2417,#4a3a24)",midnight:"linear-gradient(135deg,#0a0a1a,#1a1a35)",forest:"linear-gradient(135deg,#0f2418,#1e4030)"};
const BUBBLE_COLORS={
  green:{bg:"#00e080",fg:"#04160e",tick:"#0a4fb5"},blue:{bg:"#3b82f6",fg:"#ffffff",tick:"#a5f3fc"},
  purple:{bg:"#8b5cf6",fg:"#ffffff",tick:"#a5f3fc"},pink:{bg:"#ec4899",fg:"#ffffff",tick:"#a5f3fc"},
  orange:{bg:"#f59e0b",fg:"#1a1200",tick:"#1d4ed8"},teal:{bg:"#14b8a6",fg:"#04161a",tick:"#1d4ed8"},
  red:{bg:"#ef4444",fg:"#ffffff",tick:"#a5f3fc"},slate:{bg:"#334155",fg:"#f1f5f9",tick:"#2dd4ff"},
  light:{bg:"#f1f5f9",fg:"#0f172a",tick:"#2563eb"},card:{bg:"var(--card)",fg:"var(--text)",tick:"#2dd4ff"}};
const DEFAULT_BUBBLE_MINE="green",DEFAULT_BUBBLE_THEIRS="card";
const _pendingConvTheme={};
let _pendingDefaultWallpaper=null;
function currentConversation(){return _conversations.find(c=>c.id===_currentConvId)||null;}
function defaultTheme(){
  return {wallpaper:State.tenant?.chat_wallpaper||"default",mine:State.tenant?.bubble_mine||DEFAULT_BUBBLE_MINE,theirs:State.tenant?.bubble_theirs||DEFAULT_BUBBLE_THEIRS};
}
function effectiveTheme(conv){
  const th=conv?.theme||{},d=defaultTheme();
  return {wallpaper:th.wallpaper||d.wallpaper,mine:th.bubble_mine||d.mine,theirs:th.bubble_theirs||d.theirs};
}
function applyBubbleVars(el,mine,theirs){
  if(!el)return;
  const m=BUBBLE_COLORS[mine]||BUBBLE_COLORS[DEFAULT_BUBBLE_MINE],o=BUBBLE_COLORS[theirs]||BUBBLE_COLORS[DEFAULT_BUBBLE_THEIRS];
  el.style.setProperty("--bub-mine-bg",m.bg);el.style.setProperty("--bub-mine-fg",m.fg);el.style.setProperty("--bub-tick-read",m.tick);
  el.style.setProperty("--bub-theirs-bg",o.bg);el.style.setProperty("--bub-theirs-fg",o.fg);
}
function applyConversationTheme(){
  const box=document.getElementById("chat-messages");if(!box)return;
  const th=effectiveTheme(currentConversation());
  applyChatWallpaper(th.wallpaper);
  applyBubbleVars(box,th.mine,th.theirs);
  const panel=document.getElementById("chat-theme-panel");
  if(panel&&panel.style.display!=="none") renderChatThemePanel();
}
function wallpaperTileBackground(key){
  if(key&&key.startsWith("custom:")) return `url("${key.slice(7)}") center/cover no-repeat`;
  return WALLPAPER_SWATCHES[key]||WALLPAPER_SWATCHES.default;
}
function renderWallpaperGrid(current,targetId){
  const grid=document.getElementById(targetId||"wallpaper-grid");if(!grid)return;
  const isConv=targetId==="chat-wallpaper-grid";
  const handler=isConv?"selectConversationWallpaper":"selectWallpaper";
  const tiles=[];
  if(isConv) tiles.push(`<div onclick="selectConversationWallpaper(null)" style="cursor:pointer;border-radius:10px;height:54px;background:${wallpaperTileBackground(defaultTheme().wallpaper)};border:2px solid ${current==null?'var(--green)':'var(--b)'};display:flex;align-items:end;justify-content:center;padding-bottom:4px">
      <span style="font-size:10px;color:#fff;background:rgba(0,0,0,.6);padding:1px 6px;border-radius:6px">${t("wp_use_default")}</span></div>`);
  Object.entries(WALLPAPER_SWATCHES).forEach(([key,bg])=>tiles.push(`
    <div onclick="${handler}('${key}')" style="cursor:pointer;border-radius:10px;height:${isConv?54:60}px;background:${bg};border:2px solid ${current===key?'var(--green)':'var(--b)'};display:flex;align-items:end;justify-content:center;padding-bottom:4px">
      <span style="font-size:10px;color:var(--muted);background:rgba(0,0,0,.5);padding:1px 6px;border-radius:6px">${t("wp_"+key)}</span>
    </div>`));
  if(current&&current.startsWith("custom:")) tiles.push(`<div style="border-radius:10px;height:${isConv?54:60}px;background:${wallpaperTileBackground(current)};border:2px solid var(--green)"></div>`);
  grid.innerHTML=tiles.join("");
}
function renderBubbleSwatches(targetId,current,scope,which){
  const el=document.getElementById(targetId);if(!el)return;
  const parts=[];
  if(scope==="conv") parts.push(`<button type="button" class="bubble-swatch inherit${current==null?" selected":""}" onclick="selectBubbleColor('conv','${which}',null)">${t("bubble_default")}</button>`);
  Object.entries(BUBBLE_COLORS).forEach(([key,c])=>parts.push(`<button type="button" class="bubble-swatch${current===key?" selected":""}" style="background:${c.bg};color:${c.fg}" title="${t("bubble_"+key)}" aria-label="${t("bubble_"+key)}" onclick="selectBubbleColor('${scope}','${which}','${key}')">Aa</button>`));
  el.innerHTML=parts.join("");
}
function renderDefaultThemeSettings(){
  const d=defaultTheme();
  renderWallpaperGrid(d.wallpaper,"wallpaper-grid");
  showWallpaperPreview(d.wallpaper);
  renderBubbleSwatches("default-bubble-mine",d.mine,"default","mine");
  renderBubbleSwatches("default-bubble-theirs",d.theirs,"default","theirs");
  applyBubbleVars(document.getElementById("default-bubble-preview"),d.mine,d.theirs);
}
function renderChatThemePanel(){
  const th=currentConversation()?.theme||{};
  renderWallpaperGrid(th.wallpaper??null,"chat-wallpaper-grid");
  renderBubbleSwatches("chat-bubble-mine",th.bubble_mine??null,"conv","mine");
  renderBubbleSwatches("chat-bubble-theirs",th.bubble_theirs??null,"conv","theirs");
}
function saveTenantLocal(){try{localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));}catch(_){}}
async function selectWallpaper(key){
  const previous=State.tenant?.chat_wallpaper||"default";
  const show=()=>{renderDefaultThemeSettings();applyConversationTheme();};
  if(State.tenant) State.tenant.chat_wallpaper=key;
  _pendingDefaultWallpaper=key;show();
  try{
    await api("PUT","/profile/wallpaper",{wallpaper:key});
    saveTenantLocal();
    showToast(t("toast_wallpaper_updated"));
  }catch(e){if(State.tenant)State.tenant.chat_wallpaper=previous;show();showToast(e.message,"error");}
  finally{_pendingDefaultWallpaper=null;}
}
async function selectBubbleColor(scope,which,key){
  const field=which==="mine"?"bubble_mine":"bubble_theirs";
  if(scope==="default"){
    const previous=State.tenant?.[field]??null;
    if(State.tenant) State.tenant[field]=key;
    renderDefaultThemeSettings();applyConversationTheme();
    try{await api("PUT","/profile/chat-theme",{[field]:key});saveTenantLocal();showToast(t("toast_theme_updated"));}
    catch(e){if(State.tenant)State.tenant[field]=previous;renderDefaultThemeSettings();applyConversationTheme();showToast(e.message,"error");}
    return;
  }
  const conv=currentConversation();if(!conv)return;
  const convId=conv.id,previous={...(conv.theme||{})};
  conv.theme={...previous,[field]:key};_pendingConvTheme[convId]=conv.theme;
  applyConversationTheme();renderChatThemePanel();
  try{
    const r=await api("PUT",`/messaging/conversations/${convId}/theme`,{[field]:key});
    conv.theme={...conv.theme,[field]:r.theme[field]};showToast(t("toast_theme_updated"));
  }catch(e){conv.theme=previous;applyConversationTheme();renderChatThemePanel();showToast(e.message,"error");}
  finally{delete _pendingConvTheme[convId];}
}
async function selectConversationWallpaper(key){
  const conv=currentConversation();if(!conv)return;
  const convId=conv.id,previous={...(conv.theme||{})};
  conv.theme={...previous,wallpaper:key};_pendingConvTheme[convId]=conv.theme;
  applyConversationTheme();renderChatThemePanel();
  try{
    await api("PUT",`/messaging/conversations/${convId}/theme`,{wallpaper:key});
    showToast(t("toast_wallpaper_updated"));
  }catch(e){conv.theme=previous;applyConversationTheme();renderChatThemePanel();showToast(e.message,"error");}
  finally{delete _pendingConvTheme[convId];}
}
async function uploadConversationWallpaper(file){
  resetFileInputs("#chat-wallpaper-input");
  const conv=currentConversation();if(!file||!conv)return;
  const convId=conv.id,previous={...(conv.theme||{})};
  const localUrl=URL.createObjectURL(file);
  conv.theme={...previous,wallpaper:`custom:${localUrl}`};_pendingConvTheme[convId]=conv.theme;
  applyConversationTheme();renderChatThemePanel();
  showToast(t("uploading_label"));
  try{
    const compressed=await compressImageFile(file,1600,0.85);
    const fd=new FormData();fd.append("file",compressed);
    const r=await apiUpload(`/messaging/conversations/${convId}/wallpaper-image`,fd);
    await preloadImage(r.url);
    conv.theme={...conv.theme,wallpaper:r.theme.wallpaper};
    if(_currentConvId===convId){applyConversationTheme();}
    URL.revokeObjectURL(localUrl);
    showToast(t("toast_wallpaper_updated"));
  }catch(e){
    conv.theme=previous;applyConversationTheme();URL.revokeObjectURL(localUrl);
    showToast(e.message,"error");
  }finally{delete _pendingConvTheme[convId];}
}
async function resetConversationTheme(){
  const conv=currentConversation();if(!conv)return;
  const previous={...(conv.theme||{})};
  conv.theme={wallpaper:null,bubble_mine:null,bubble_theirs:null};
  applyConversationTheme();renderChatThemePanel();
  try{await api("PUT",`/messaging/conversations/${conv.id}/theme`,{reset:true});showToast(t("toast_theme_updated"));}
  catch(e){conv.theme=previous;applyConversationTheme();renderChatThemePanel();showToast(e.message,"error");}
}
async function refreshWallpaperUrls(failedUrl){
  _wallpaperRefreshTried.add(failedUrl);
  try{
    const [profile,convs]=await Promise.all([api("GET","/profile/"),api("GET","/messaging/conversations?include_archived=true")]);
    if(State.tenant&&!_pendingDefaultWallpaper){State.tenant.chat_wallpaper=profile.chat_wallpaper||"default";saveTenantLocal();}
    convs.forEach(fresh=>{const local=_conversations.find(c=>c.id===fresh.id);if(local&&!_pendingConvTheme[fresh.id])local.theme=fresh.theme;});
    [State.tenant?.chat_wallpaper,...convs.map(c=>c.theme?.wallpaper)].forEach(k=>{if(k&&k.startsWith("custom:"))_wallpaperRefreshTried.add(k.slice(7));});
    applyConversationTheme();
    renderDefaultThemeSettings();
  }catch(_){}
}
function preloadImage(url){
  return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=url;});
}
const _wallpaperRefreshTried=new Set();
function applyChatWallpaper(key){
  const box=document.getElementById("chat-messages");if(!box)return;
  if(key&&key.startsWith("custom:")){
    const url=key.slice(7);
    box.style.background=`url("${url}") center/cover no-repeat`;
    if(!url.startsWith("blob:")&&!_wallpaperRefreshTried.has(url)){
      preloadImage(url).then(ok=>{if(!ok) refreshWallpaperUrls(url);});
    }
    return;
  }
  box.style.background=WALLPAPER_SWATCHES[key]||WALLPAPER_SWATCHES.default;
}
function backToConvList(){
  document.getElementById("msg-layout")?.classList.remove("mobile-chat-open");
  _currentConvId=null;
  applyMobileMessagingLayout();
}
async function shareLocation(){
  if(!navigator.geolocation){showToast(t("location_denied"),"error");return;}
  if(!confirm(t("share_location_confirm")))return;
  navigator.geolocation.getCurrentPosition(async(pos)=>{
    const content=JSON.stringify({lat:pos.coords.latitude,lng:pos.coords.longitude});
    try{
      const saved=await api("POST",`/messaging/conversations/${_currentConvId}/messages`,{content,message_type:"location"});
      appendMessageBubble({...saved,is_mine:true,reactions:[]});
      scrollChatToBottom();
    }catch(e){showToast(e.message,"error");}
  },()=>{showToast(t("location_denied"),"error");});
}
function openContactPickerModal(){
  document.getElementById("contact-picker-search").value="";
  document.getElementById("contact-picker-results").innerHTML="";
  document.getElementById("modal-contact-picker").style.display="flex";
}
function closeContactPickerModal(){document.getElementById("modal-contact-picker").style.display="none";}
let _contactPickerTimer=null;
function searchContactToShareDebounced(){
  clearTimeout(_contactPickerTimer);
  _contactPickerTimer=setTimeout(searchContactToShare,350);
}
async function searchContactToShare(){
  const q=document.getElementById("contact-picker-search").value.trim();
  const box=document.getElementById("contact-picker-results");
  if(q.length<2){box.innerHTML="";return;}
  try{
    const results=await api("GET",`/messaging/search-users?q=${encodeURIComponent(q)}`);
    box.innerHTML=results.map(u=>`<div onclick="submitSharedContact('${u.id}','${escJs(u.name)}')" style="padding:10px;cursor:pointer;border-bottom:1px solid var(--b)">
      <b style="font-size:13px">${esc(u.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(u.email)}</div>
    </div>`).join("")||`<div style="padding:10px;color:var(--muted)">${t("no_search_results")}</div>`;
  }catch(e){box.innerHTML=`<div style="padding:10px;color:var(--red)">${esc(e.message)}</div>`;}
}
async function submitSharedContact(tenantId,name){
  const content=JSON.stringify({tenant_id:tenantId,name});
  try{
    const saved=await api("POST",`/messaging/conversations/${_currentConvId}/messages`,{content,message_type:"contact"});
    appendMessageBubble({...saved,is_mine:true,reactions:[]});
    scrollChatToBottom();
    closeContactPickerModal();
  }catch(e){showToast(e.message,"error");}
}
async function startConvFromSharedContact(tenantId,name){
  try{
    const r=await api("POST","/messaging/conversations",{tenant_ids:[tenantId]});
    closeMoreMenu?.();
    navigate("messaging");
    setTimeout(()=>openConversation(r.id,name),200);
  }catch(e){showToast(e.message,"error");}
}
function openPollModal(){
  document.getElementById("poll-question-input").value="";
  document.getElementById("poll-options-list").innerHTML=`
    <div class="fgrp"><input class="inp poll-option-input" placeholder="Option 1"></div>
    <div class="fgrp"><input class="inp poll-option-input" placeholder="Option 2"></div>`;
  document.getElementById("modal-poll").style.display="flex";
}
function closePollModal(){document.getElementById("modal-poll").style.display="none";}
function addPollOptionField(){
  const list=document.getElementById("poll-options-list");
  const n=list.querySelectorAll(".poll-option-input").length+1;
  if(n>10)return;
  const div=document.createElement("div");
  div.className="fgrp";
  div.innerHTML=`<input class="inp poll-option-input" placeholder="${t("poll_option_ph")} ${n}">`;
  list.appendChild(div);
}
async function submitPoll(){
  const question=document.getElementById("poll-question-input").value.trim();
  const options=Array.from(document.querySelectorAll(".poll-option-input")).map(i=>i.value.trim()).filter(Boolean);
  if(!question){showToast(t("poll_question_required"),"error");return;}
  if(options.length<2){showToast(t("poll_min_options"),"error");return;}
  try{
    const saved=await api("POST",`/messaging/conversations/${_currentConvId}/polls`,{question,options});
    appendMessageBubble({...saved,is_mine:true,reactions:[]});
    scrollChatToBottom();
    closePollModal();
  }catch(e){showToast(e.message,"error");}
}
async function votePollOption(pollId,optionIndex){
  try{
    const r=await api("POST",`/messaging/polls/${pollId}/vote?option_index=${optionIndex}`);
    updatePollUI(pollId,r.votes,r.total_votes,optionIndex);
  }catch(e){showToast(e.message,"error");}
}
function updatePollUI(pollId,votes,totalVotes,myVote){
  document.querySelectorAll(`[data-poll-id="${pollId}"]`).forEach(container=>{
    const isMine=myVote!==undefined&&myVote!==null;
    container.querySelectorAll(".poll-option-row").forEach((row,idx)=>{
      const pct=totalVotes>0?Math.round((votes[idx]/totalVotes)*100):0;
      row.querySelector(".poll-bar").style.width=`${pct}%`;
      row.querySelector(".poll-pct").textContent=`${pct}%`;
      if(myVote!==undefined) row.classList.toggle("poll-my-vote",idx===myVote);
    });
    const totalEl=container.querySelector(".poll-total");
    if(totalEl) totalEl.textContent=`${totalVotes} ${t("poll_votes_count")}`;
  });
}
let _globalSearchTimer=null;
function globalSearchDebounced(){
  clearTimeout(_globalSearchTimer);
  _globalSearchTimer=setTimeout(globalSearch,350);
}
async function globalSearch(){
  const q=document.getElementById("global-search-input").value.trim();
  const resultsBox=document.getElementById("global-search-results");
  const listBox=document.getElementById("conv-list");
  if(q.length<2){resultsBox.style.display="none";listBox.style.display="block";return;}
  resultsBox.style.display="block";listBox.style.display="none";
  resultsBox.innerHTML=`<div style="padding:16px;color:var(--muted);font-size:13px">${t("loading")}</div>`;
  try{
    const data=await api("GET",`/messaging/search?q=${encodeURIComponent(q)}`);
    if(!data.conversations.length&&!data.messages.length){
      resultsBox.innerHTML=`<div style="padding:16px;color:var(--muted);font-size:13px">${t("no_search_results")}</div>`;return;
    }
    let html="";
    if(data.conversations.length){
      html+=`<div style="padding:8px 14px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">${t("search_people_section")}</div>`;
      html+=data.conversations.map(c=>`<div onclick="openConversationFromSearch('${c.conversation_id}','${escJs(c.name)}')" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--b)">
        <b style="font-size:13px">${c.is_group?'<i class="ti ti-users-group"></i> ':''}${esc(c.name)}</b>
      </div>`).join("");
    }
    if(data.messages.length){
      html+=`<div style="padding:8px 14px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">${t("search_messages_section")}</div>`;
      html+=data.messages.map(m=>`<div onclick="openConversationFromSearch('${m.conversation_id}','${escJs(m.conversation_name)}','${m.message_id}','${m.created_at}')" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--b)">
        <div style="font-size:11px;font-weight:700;color:var(--blue)">${esc(m.conversation_name)} · ${esc(m.sender_name)}</div>
        <div style="font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.content)}</div>
      </div>`).join("");
    }
    resultsBox.innerHTML=html;
  }catch(e){resultsBox.innerHTML=`<div style="padding:16px;color:var(--red)">${esc(e.message)}</div>`;}
}
async function openConversationFromSearch(convId,name,messageId,createdAt){
  document.getElementById("global-search-input").value="";
  document.getElementById("global-search-results").style.display="none";
  document.getElementById("conv-list").style.display="block";
  if(messageId&&createdAt){
    await openConversation(convId,name);
    try{
      const target=new Date(parseServerDate(createdAt).getTime()+1000).toISOString().replace("Z","");
      const msgs=await api("GET",`/messaging/conversations/${convId}/messages?before=${encodeURIComponent(target)}`);
      _lastRenderedDayKey=null;
      document.getElementById("chat-messages").innerHTML="";
      msgs.forEach(m=>appendMessageBubble(m));
      setTimeout(()=>scrollToMessage(messageId),100);
    }catch(e){}
  }else{
    openConversation(convId,name);
  }
}
let _mediaData=null;
async function openMediaGallery(){
  document.getElementById("modal-media-gallery").style.display="flex";
  document.querySelectorAll('#modal-media-gallery .toggle-btn').forEach(b=>b.classList.remove("active"));
  document.querySelector('#modal-media-gallery [data-tab="images"]').classList.add("active");
  document.getElementById("chat-more-menu").style.display="none";
  const content=document.getElementById("media-gallery-content");
  content.innerHTML=`<div style="padding:16px;color:var(--muted)">${t("loading")}</div>`;
  try{
    _mediaData=await api("GET",`/messaging/conversations/${_currentConvId}/media`);
    renderMediaTab("images");
  }catch(e){content.innerHTML=`<div style="padding:16px;color:var(--red)">${esc(e.message)}</div>`;}
}
function closeMediaGallery(){document.getElementById("modal-media-gallery").style.display="none";}
function switchMediaTab(tab,btn){
  document.querySelectorAll('#modal-media-gallery .toggle-btn').forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  renderMediaTab(tab);
}
function renderMediaTab(tab){
  const content=document.getElementById("media-gallery-content");
  if(!_mediaData){content.innerHTML="";return;}
  const items=_mediaData[tab]||[];
  if(!items.length){content.innerHTML=`<div style="padding:24px;text-align:center;color:var(--muted)">${t("no_media")}</div>`;return;}
  if(tab==="images"){
    content.innerHTML=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${items.map(i=>`<a href="${i.file_url}" target="_blank"><img src="${i.file_url}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px" loading="lazy"></a>`).join("")}</div>`;
  }else if(tab==="files"){
    content.innerHTML=items.map(i=>`<a href="${i.file_url}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--b);color:inherit;text-decoration:none">
      <i class="ti ti-file" style="font-size:20px;color:var(--blue)"></i><span style="font-size:13px">${esc(i.file_name)}</span>
    </a>`).join("");
  }else if(tab==="voice"){
    content.innerHTML=items.map(i=>`<div style="padding:10px;border-bottom:1px solid var(--b)"><audio controls preload="metadata" style="width:100%;height:36px" src="${i.file_url}"></audio></div>`).join("");
  }else if(tab==="links"){
    content.innerHTML=items.map(i=>`<a href="${i.url}" target="_blank" style="display:block;padding:10px;border-bottom:1px solid var(--b);color:var(--blue);text-decoration:underline;font-size:13px;word-break:break-all">${esc(i.url)}</a>`).join("");
  }
}
function triggerAvatarFromChat(){
  document.getElementById("chat-avatar-input").click();
}
function toggleWallpaperMenuInChat(){
  const panel=document.getElementById("chat-theme-panel");
  const isOpening=panel.style.display==="none";
  panel.style.display=isOpening?"flex":"none";
  if(isOpening) renderChatThemePanel();
}
async function uploadWallpaperImage(file){
  resetFileInputs('input[type=file][onchange^="uploadWallpaperImage"]');
  if(!file)return;
  const previous=State.tenant?.chat_wallpaper||"default";
  const localUrl=URL.createObjectURL(file);
  if(State.tenant) State.tenant.chat_wallpaper=`custom:${localUrl}`;
  _pendingDefaultWallpaper=State.tenant?.chat_wallpaper;
  renderDefaultThemeSettings();applyConversationTheme();
  showToast(t("uploading_label"));
  try{
    const compressed=await compressImageFile(file,1600,0.85);
    const fd=new FormData();fd.append("file",compressed);
    const r=await apiUpload("/profile/wallpaper-image",fd);
    await preloadImage(r.url);
    if(State.tenant){State.tenant.chat_wallpaper=`custom:${r.url}`;saveTenantLocal();}
    renderDefaultThemeSettings();applyConversationTheme();
    URL.revokeObjectURL(localUrl);
    showToast(t("toast_wallpaper_updated"));
  }catch(e){
    if(State.tenant) State.tenant.chat_wallpaper=previous;
    renderDefaultThemeSettings();applyConversationTheme();URL.revokeObjectURL(localUrl);
    showToast(e.message,"error");
  }finally{_pendingDefaultWallpaper=null;}
}
function showWallpaperPreview(key){
  const el=document.getElementById("wallpaper-custom-preview");if(!el)return;
  if(key&&key.startsWith("custom:")){el.style.display="block";el.style.backgroundImage=`url("${key.slice(7)}")`;}
  else{el.style.display="none";el.style.backgroundImage="";}
}
function handlePresenceUpdate(data){
  const conv=_conversations.find(c=>c.other_tenant_id===data.tenant_id);
  if(!conv)return;
  conv.other_online=data.online;
  if(!data.online) conv.other_last_seen=data.last_seen_at;
  renderConvList();
  if(conv.id===_currentConvId){
    const statusEl=document.getElementById("chat-header-status");
    if(statusEl){
      statusEl.style.display="block";
      statusEl.textContent=data.online?t("online_status"):fmtLastSeen(data.last_seen_at);
      statusEl.style.color=data.online?"var(--green)":"var(--muted)";
    }
  }
}
function toggleExtraFeaturesMenu(){
  const menu=document.getElementById("extra-features-menu");
  menu.style.display=menu.style.display==="none"?"flex":"none";
}
function toggleChatMoreMenu(){
  const menu=document.getElementById("chat-more-menu");
  menu.style.display=menu.style.display==="none"?"flex":"none";
}
function updateChatBlockUI(){
  const conv=_conversations.find(c=>c.id===_currentConvId);
  const blocked=!!(conv&&!conv.is_group&&conv.blocked_by_me);
  const row=document.getElementById("chat-input-row");
  const rec=document.getElementById("recording-row");
  const banner=document.getElementById("chat-blocked-banner");
  const label=document.getElementById("chat-block-label");
  const blockBtn=document.getElementById("chat-block-btn");
  if(blockBtn) blockBtn.style.display=conv&&!conv.is_group?"":"none";
  if(label) label.textContent=t(blocked?"unblock_user_action":"block_user_action");
  if(blocked){
    if(row) row.style.display="none";
    if(rec) rec.style.display="none";
    document.getElementById("chat-blocked-text").textContent=t("blocked_banner").replace("{name}",conv.name);
    if(banner) banner.style.display="block";
  }else{
    if(banner) banner.style.display="none";
    if(row&&(!rec||rec.style.display==="none")) row.style.display="flex";
  }
}
function setConversationBlocked(tenantId,blocked){
  _conversations.forEach(c=>{if(!c.is_group&&c.other_tenant_id===tenantId)c.blocked_by_me=blocked;});
  renderConvList();
  updateChatBlockUI();
}
async function toggleBlockCurrentContact(){
  const conv=_conversations.find(c=>c.id===_currentConvId);
  if(!conv?.other_tenant_id)return;
  document.getElementById("chat-more-menu").style.display="none";
  if(conv.blocked_by_me){await unblockContact(conv.other_tenant_id,conv.name);return;}
  if(!confirm(t("confirm_block")))return;
  try{
    await api("POST","/messaging/block",{tenant_id:conv.other_tenant_id});
    setConversationBlocked(conv.other_tenant_id,true);
    showToast(t("toast_blocked"));
    loadBlockedContacts();
  }catch(e){showToast(e.message,"error");}
}
async function blockCurrentContact(){return toggleBlockCurrentContact();}
async function unblockCurrentContact(){
  const conv=_conversations.find(c=>c.id===_currentConvId);
  if(conv?.other_tenant_id) await unblockContact(conv.other_tenant_id,conv.name);
}
async function unblockContact(tenantId,name){
  if(!confirm(t("confirm_unblock").replace("{name}",name||"")))return;
  try{
    await api("POST","/messaging/unblock",{tenant_id:tenantId});
    setConversationBlocked(tenantId,false);
    showToast(t("toast_unblocked"));
    loadBlockedContacts();
  }catch(e){showToast(e.message,"error");}
}
async function loadBlockedContacts(){
  const box=document.getElementById("blocked-contacts-list");if(!box)return;
  try{
    const list=await api("GET","/messaging/blocked");
    if(!list.length){box.innerHTML=`<div style="font-size:13px;color:var(--muted)">${t("no_blocked_contacts")}</div>`;return;}
    const fmt=d=>parseServerDate(d).toLocaleDateString(State.lang==="ar"?"ar":State.lang,{day:"numeric",month:"short",year:"numeric"});
    box.innerHTML=list.map(b=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--b)">
      ${avatarHtml(b.avatar_url,b.name,34)}
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.name)}</div>
        ${b.blocked_at?`<div style="font-size:11px;color:var(--muted)">${t("blocked_since").replace("{date}",fmt(b.blocked_at))}</div>`:""}
      </div>
      <button class="btn btn-o btn-sm" data-id="${esc(b.id)}" data-name="${esc(b.name)}" onclick="unblockContact(this.dataset.id,this.dataset.name)"><i class="ti ti-lock-open"></i> ${t("unblock_user_action")}</button>
    </div>`).join("");
  }catch(e){box.innerHTML=`<div style="font-size:13px;color:var(--red)">${esc(e.message)}</div>`;}
}
async function reportCurrentContact(){
  const conv=_conversations.find(c=>c.id===_currentConvId);
  if(!conv?.other_tenant_id)return;
  const reason=prompt(t("prompt_report_reason"));
  if(!reason||!reason.trim())return;
  try{
    await api("POST","/messaging/report",{tenant_id:conv.other_tenant_id,reason:reason.trim()});
    showToast(t("toast_reported"));
    document.getElementById("chat-more-menu").style.display="none";
  }catch(e){showToast(e.message,"error");}
}
let _pinnedMsgIds=[];
let _groupMembers=[];
let _pendingMentions=[];
async function loadGroupMembersIfNeeded(convId){
  const conv=_conversations.find(c=>c.id===convId);
  _groupMembers=conv?.is_group?await api("GET",`/messaging/conversations/${convId}/members`).catch(()=>[]):[];
}
function checkMentionTrigger(){
  const input=document.getElementById("chat-input");
  const dropdown=document.getElementById("mention-dropdown");
  if(!_groupMembers.length){dropdown.style.display="none";return;}
  const cursorPos=input.selectionStart;
  const textBefore=input.value.slice(0,cursorPos);
  const match=textBefore.match(/@([\w]*)$/);
  if(!match){dropdown.style.display="none";return;}
  const query=match[1].toLowerCase();
  const matches=_groupMembers.filter(m=>m.name.toLowerCase().includes(query));
  if(!matches.length){dropdown.style.display="none";return;}
  dropdown.style.display="block";
  dropdown.innerHTML=matches.map(m=>`<div onclick="selectMention('${m.id}','${escJs(m.name)}')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--b)">${esc(m.name)}</div>`).join("");
}
function selectMention(tenantId,name){
  const input=document.getElementById("chat-input");
  const cursorPos=input.selectionStart;
  const textBefore=input.value.slice(0,cursorPos).replace(/@([\w]*)$/,`@${name} `);
  const textAfter=input.value.slice(cursorPos);
  input.value=textBefore+textAfter;
  if(!_pendingMentions.includes(tenantId)) _pendingMentions.push(tenantId);
  document.getElementById("mention-dropdown").style.display="none";
  input.focus();
}
function highlightMentions(escapedText){
  return escapedText.replace(/@([\wÀ-ÿ]+(?: [\wÀ-ÿ]+)?)/g,(match,name)=>{
    if(_groupMembers.some(m=>m.name===name)) return `<b style="color:var(--blue)">${match}</b>`;
    return match;
  });
}
async function loadPinnedBar(convId){
  const bar=document.getElementById("pinned-bar");
  try{
    const pinned=await api("GET",`/messaging/conversations/${convId}/pinned`);
    _pinnedMsgIds=pinned.map(p=>p.id);
    if(!pinned.length){bar.style.display="none";return;}
    bar.style.display="flex";
    document.getElementById("pinned-bar-text").textContent=`${pinned[0].sender_name}: ${pinned[0].content}`;
  }catch(e){bar.style.display="none";}
}
async function togglePinMessage(msgId,isPinned){
  try{
    await api("POST",`/messaging/messages/${msgId}/${isPinned?'unpin':'pin'}`);
    if(_currentConvId) loadPinnedBar(_currentConvId);
    const bubble=document.getElementById(`msg-bubble-${msgId}`);
    const icon=bubble?.querySelector(`[onclick*="togglePinMessage('${msgId}'"]`);
    if(icon){
      icon.className=isPinned?"ti ti-pin":"ti ti-pinned-off";
      icon.setAttribute("onclick",`togglePinMessage('${msgId}',${!isPinned})`);
      icon.title=isPinned?t("pin_action"):t("unpin_action");
    }
  }catch(e){showToast(e.message,"error");}
}
async function toggleStarMessage(msgId,isStarred,iconEl){
  try{
    await api("POST",`/messaging/messages/${msgId}/${isStarred?'unstar':'star'}`);
    iconEl.className=isStarred?"ti ti-star":"ti ti-star-filled";
    iconEl.style.color=isStarred?"":"#f5a623";
    iconEl.setAttribute("onclick",`toggleStarMessage('${msgId}',${!isStarred},this)`);
    iconEl.title=isStarred?t("star_action"):t("unstar_action");
  }catch(e){showToast(e.message,"error");}
}
async function toggleMuteConversation(){
  if(!_currentConvId)return;
  const conv=_conversations.find(c=>c.id===_currentConvId);
  const nowMuted=!(conv?.muted);
  try{
    await api("POST",`/messaging/conversations/${_currentConvId}/${nowMuted?'mute':'unmute'}`);
    if(conv) conv.muted=nowMuted;
    updateMuteArchiveIcons();
  }catch(e){showToast(e.message,"error");}
}
async function toggleArchiveConversation(){
  if(!_currentConvId)return;
  const conv=_conversations.find(c=>c.id===_currentConvId);
  const nowArchived=!(conv?.archived);
  try{
    await api("POST",`/messaging/conversations/${_currentConvId}/${nowArchived?'archive':'unarchive'}`);
    showToast(nowArchived?t("archive_action"):t("unarchive_action"));
    loadConversations();
    if(nowArchived) backToConvList();
  }catch(e){showToast(e.message,"error");}
}
function updateMuteArchiveIcons(){
  const conv=_conversations.find(c=>c.id===_currentConvId);
  const muteBtn=document.getElementById("mute-btn");
  if(muteBtn){muteBtn.className=conv?.muted?"ti ti-bell-off":"ti ti-bell";muteBtn.style.color=conv?.muted?"var(--amber)":"var(--muted)";muteBtn.title=conv?.muted?t("unmute_action"):t("mute_action");}
  const archiveBtn=document.getElementById("archive-btn");
  if(archiveBtn) archiveBtn.title=t("archive_action");
}
function replyToMessageAction(msgId,senderName,contentPreview){
  _pendingReplyTo={id:msgId,sender_name:senderName,content:contentPreview};
  document.getElementById("reply-preview-bar").style.display="flex";
  document.getElementById("reply-preview-name").textContent=senderName;
  document.getElementById("reply-preview-content").textContent=contentPreview;
  document.getElementById("chat-input").focus();
}
function cancelReply(){
  _pendingReplyTo=null;
  document.getElementById("reply-preview-bar").style.display="none";
}
let _pendingEphemeral=null;
let _pendingViewOnce=null;
function toggleEphemeralMenu(){
  const menu=document.getElementById("ephemeral-menu");
  menu.style.display=menu.style.display==="none"?"flex":"none";
}
function setEphemeralDuration(seconds){
  _pendingEphemeral=seconds;
  document.getElementById("ephemeral-menu").style.display="none";
  const ind=document.getElementById("ephemeral-indicator");
  const btn=document.getElementById("ephemeral-btn");
  if(seconds){
    const label=seconds===3600?t("eph_1h"):seconds===86400?t("eph_24h"):t("eph_7d");
    ind.style.display="block";
    ind.textContent=`${t("ephemeral_active_prefix")} ${label}`;
    btn.style.color="var(--amber)";
  }else{
    ind.style.display="none";
    btn.style.color="var(--muted)";
  }
}
function toggleViewOnce(){
  setViewOnceMode(_pendingViewOnce?null:"destruct");
}
function setViewOnceMode(mode){
  _pendingViewOnce=mode;
  const ind=document.getElementById("view-once-indicator");
  const btn=document.getElementById("view-once-btn");
  if(mode){
    ind.style.display="block";
    ind.textContent=`${t("view_once_active_prefix")} ${t("view_once_destruct_option")}`;
    btn.style.color="var(--purple)";
  }else{
    ind.style.display="none";
    btn.style.color="var(--muted)";
  }
}
function sendChatMessage(){
  const input=document.getElementById("chat-input");
  const text=input.value.trim();
  if(!text||!_currentConvId)return;
  if(_ws&&_ws.readyState===1){
    const viewOnce=!!_pendingViewOnce,viewOnceMode=_pendingViewOnce,ephemeralSeconds=_pendingEphemeral,replyToId=_pendingReplyTo?.id||null,mentionsToSend=_pendingMentions.length?[..._pendingMentions]:null;
    const clientMsgId=`local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    appendMessageBubble({id:clientMsgId,sender_tenant_id:State.tenant?.id,sender_name:State.tenant?.name,
      content:text,message_type:"text",created_at:new Date().toISOString(),is_mine:true,reactions:[],
      view_once:viewOnce,view_once_mode:viewOnceMode,reply_to:_pendingReplyTo?{id:_pendingReplyTo.id,sender_name:_pendingReplyTo.sender_name,content:_pendingReplyTo.content}:null});
    scrollChatToBottom();
    _ws.send(JSON.stringify({type:"message",client_msg_id:clientMsgId,conversation_id:_currentConvId,content:text,message_type:"text",view_once:viewOnce,view_once_mode:viewOnceMode,ephemeral_seconds:ephemeralSeconds,reply_to_id:replyToId,mentions:mentionsToSend}));
    input.value="";
    setViewOnceMode(null);
    setEphemeralDuration(null);
    cancelReply();
    _pendingMentions=[];
  }else{showToast(t("msg_connecting"),"error");}
}
async function sendFileMessage(file){
  if(!file||!_currentConvId)return;
  const tempId=`uploading-${Date.now()}`;
  const isVoice=file.type.startsWith("audio/");
  appendMessageBubble({id:tempId,sender_tenant_id:State.tenant?.id,sender_name:State.tenant?.name,
    content:`<i class="ti ti-loader-2"></i> ${t("uploading_file")}`,message_type:"text",
    created_at:new Date().toISOString(),is_mine:true,reactions:[],_raw:true});
  scrollChatToBottom();
  try{
    const fd=new FormData();fd.append("file",file);
    const uploaded=await apiUpload("/files/upload",fd);
    const viewOnce=!!_pendingViewOnce,viewOnceMode=_pendingViewOnce,ephemeralSeconds=_pendingEphemeral,replyToId=_pendingReplyTo?.id||null;
    const saved=await api("POST",`/messaging/conversations/${_currentConvId}/messages`,{
      message_type:isVoice?"voice":"file",file_url:uploaded.r2_key,file_name:uploaded.filename,
      view_once:viewOnce,view_once_mode:viewOnceMode,ephemeral_seconds:ephemeralSeconds,reply_to_id:replyToId});
    document.getElementById(`msg-bubble-${tempId}`)?.remove();
    appendMessageBubble({...saved,is_mine:true,reactions:saved.reactions||[]});
    scrollChatToBottom();
    document.getElementById("chat-file-input").value="";
    setViewOnceMode(null);
    setEphemeralDuration(null);
    cancelReply();
  }catch(e){
    const bubble=document.getElementById(`msg-bubble-${tempId}`);
    if(bubble) bubble.innerHTML=`<i class="ti ti-alert-triangle" style="color:var(--red)"></i> ${esc(e.message)}`;
    showToast(e.message,"error");
  }
}
async function reactToMessage(msgId){
  const emoji=prompt(t("msg_react_prompt"),"👍");
  if(!emoji)return;
  try{await api("POST",`/messaging/messages/${msgId}/react`,{emoji});openConversation(_currentConvId,document.getElementById("chat-header-name").textContent);}
  catch(e){showToast(e.message,"error");}
}
async function translateMessage(msgId,iconEl){
  const box=document.getElementById(`translation-${msgId}`);
  if(!box) return;
  if(box.textContent){box.textContent="";return;}
  const originalIcon=iconEl.className;
  iconEl.className="ti ti-loader-2";
  try{
    const r=await api("POST",`/messaging/messages/${msgId}/translate?target_lang=${State.lang}`);
    box.textContent=`🌐 ${r.translation}`;
  }catch(e){showToast(e.message,"error");}
  finally{iconEl.className=originalIcon;}
}

// ── NOUVEAUTÉS & SUPPORT ──────────────────────────────────────────────────────
const CATEGORY_LABELS={feature:"cat_feature",fix:"cat_fix",info:"cat_info"};
let _announcements=[];
async function loadAnnouncements(){
  const box=document.getElementById("announcements-list");if(!box)return;
  const newBtn=document.getElementById("new-announcement-btn");
  if(newBtn) newBtn.style.display=State.tenant?.is_creator?"inline-flex":"none";
  try{
    _announcements=await api("GET","/announcements");
    if(!_announcements.length){box.innerHTML=`<div class="card" style="text-align:center;color:var(--muted);padding:24px">${t("no_announcements_yet")}</div>`;return;}
    box.innerHTML=_announcements.map(a=>`<div class="card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:10px">
        <div>
          <span class="badge bb" style="font-size:11px">${t(CATEGORY_LABELS[a.category])||a.category}</span>
          <div style="font-weight:700;font-size:15px;margin-top:6px">${esc(a.title)}</div>
        </div>
        ${State.tenant?.is_creator?`<button class="btn btn-sm btn-r" onclick="deleteAnnouncementItem('${a.id}')"><i class="ti ti-trash"></i></button>`:''}
      </div>
      <div style="font-size:13px;color:var(--muted);margin-top:8px;white-space:pre-wrap">${esc(a.content)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:10px;font-family:var(--mono)">${fmtDate(a.created_at)}</div>
    </div>`).join("");
  }catch(e){box.innerHTML=`<div style="color:var(--red);padding:16px">${esc(e.message)}</div>`;}
}
function openAnnouncementModal(){
  document.getElementById("ann-title").value="";
  document.getElementById("ann-content").value="";
  document.getElementById("ann-category").value="feature";
  document.getElementById("modal-announcement").style.display="flex";
}
function closeAnnouncementModal(){document.getElementById("modal-announcement").style.display="none";}
async function submitAnnouncement(){
  const title=document.getElementById("ann-title").value.trim();
  const content=document.getElementById("ann-content").value.trim();
  if(!title||!content){showToast(t("ann_title_content_required"),"error");return;}
  try{
    await api("POST","/announcements",{title,content,category:document.getElementById("ann-category").value});
    showToast(t("toast_ann_published"));closeAnnouncementModal();loadAnnouncements();
  }catch(e){showToast(e.message,"error");}
}
async function deleteAnnouncementItem(id){
  if(!confirm(t("confirm_del_generic")))return;
  try{await api("DELETE",`/announcements/${id}`);showToast(t("toast_deleted"));loadAnnouncements();}
  catch(e){showToast(e.message,"error");}
}
async function openSupportChat(){
  try{
    const support=await api("GET","/support/contact");
    const conv=await api("POST","/messaging/conversations",{tenant_ids:[support.tenant_id]});
    navigate("messaging");
    setTimeout(()=>openConversation(conv.id,support.name),300);
  }catch(e){showToast(e.message,"error");}
}
let _convMode="direct",_groupSelected=[];
function openNewConvModal(){
  document.getElementById("user-search-input").value="";
  document.getElementById("user-search-results").innerHTML="";
  setConvMode("direct");
  document.getElementById("modal-new-conv").style.display="flex";
}
