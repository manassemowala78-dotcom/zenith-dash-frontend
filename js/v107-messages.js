/* Zenith Dash 10.7.0 — messagerie fiable.
   1. Chaque message texte part par une requête confirmée par le serveur : horloge tant que ce n'est pas
      enregistré, nouvel essai tout seul quand le réseau revient, « Non envoyé · Réessayer » s'il est refusé.
      Il ne reçoit ses coches que lorsqu'il est vraiment enregistré, et jamais deux fois.
   2. Remonter en haut d'une discussion recharge les messages précédents (50 par 50).
   3. La zone d'écriture passe à la ligne et grandit jusqu'à 5 lignes.
   4. Archiver un message : marque « Archivé », bandeau Annuler / Voir, page Archives. */
(function(){
  const QK="zd_msgq",PAGE=50,LS=window.localStorage;
  const jget=(k,d)=>{try{const v=JSON.parse(LS.getItem(k));return v==null?d:v;}catch(_){return d;}};
  const jset=(k,v)=>{try{LS.setItem(k,JSON.stringify(v));return true;}catch(_){return false;}};
  const me=()=>State.tenant?.id||"";
  const SVG={
    clock:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    alert:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.3h.01"/></svg>',
    retry:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/></svg>',
    archive:'<svg viewBox="0 0 24 24" width="SZ" height="SZ" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/></svg>',
    spin:'<svg class="zm-spin" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-8-8"/></svg>',
  };
  const icArchive=sz=>SVG.archive.replace(/SZ/g,sz);
  window.zmIcArchive=icArchive;

  /* ═══════════ 1. Envoi confirmé ═══════════ */
  const all=()=>{const v=jget(QK,[]);return Array.isArray(v)?v:[];};
  const mine=()=>all().filter(m=>m&&m.u===me());
  const put=list=>jset(QK,list);
  const upd=(id,patch)=>{const l=all(),i=l.findIndex(x=>x.id===id);if(i<0)return null;Object.assign(l[i],patch);put(l);return l[i];};
  const drop=id=>put(all().filter(x=>x.id!==id));
  window.zmPendingCount=()=>mine().filter(m=>m.st!=="fail").length;

  function metaHtml(m){
    if(m.st==="fail")return `<span class="zm-st fail" id="ticks-${m.id}">${SVG.alert} ${esc(t("zm_failed"))}</span>`;
    const late=!navigator.onLine||Date.now()-(m.at||0)>4000||(m.tries||0)>0;
    return `<span class="zm-st wait" id="ticks-${m.id}" title="${esc(t("zm_waiting"))}">${SVG.clock}${late?" "+esc(t(navigator.onLine&&!(m.tries>0)?"zm_sending":"zm_waiting")):""}</span>`;
  }
  function paint(m){
    if(typeof _currentConvId==="undefined"||_currentConvId!==m.conv)return;
    let b=document.getElementById("msg-bubble-"+m.id);
    if(!b){
      try{
        appendMessageBubble({id:m.id,sender_tenant_id:State.tenant?.id,sender_name:State.tenant?.name,content:m.text,message_type:"text",
          created_at:new Date(m.at).toISOString(),is_mine:true,reactions:[],view_once:!!m.vo,view_once_mode:m.vo||null,reply_to:m.reply||null});
      }catch(e){console.error(e);}
      b=document.getElementById("msg-bubble-"+m.id);
    }
    if(!b)return;
    b.classList.add("zm-local");b.classList.toggle("zm-failed",m.st==="fail");
    b.querySelector(".mb-acts")?.remove();b.querySelector(".mb-tr")?.remove();
    const tk=b.querySelector(`[id="ticks-${m.id}"]`);
    if(tk)tk.outerHTML=metaHtml(m);else b.querySelector(".mb-meta")?.insertAdjacentHTML("beforeend",metaHtml(m));
    b.querySelector(".zm-fail")?.remove();
    if(m.st==="fail"){
      b.insertAdjacentHTML("beforeend",`<div class="zm-fail"><span>${esc(m.err||t("zm_failed"))}</span><span class="zm-fail-b"><button type="button" class="zm-retry" onclick="event.stopPropagation();zmRetry('${m.id}')">${SVG.retry} ${esc(t("zm_retry"))}</button><button type="button" class="zm-del" onclick="event.stopPropagation();zmDiscard('${m.id}')">${esc(t("zm_discard"))}</button></span></div>`);      try{const box=document.getElementById("chat-messages");if(box&&box.scrollHeight-box.scrollTop-box.clientHeight<260)scrollChatToBottom();}catch(_){}
    }
  }
  function paintConv(conv){mine().filter(m=>m.conv===conv).sort((a,b)=>a.at-b.at).forEach(paint);}
  function settle(m,saved){
    drop(m.id);
    if(typeof _currentConvId!=="undefined"&&_currentConvId===m.conv){
      const local=document.getElementById("msg-bubble-"+m.id);
      let fin=saved&&saved.id?document.getElementById("msg-bubble-"+saved.id):null;
      if(!fin&&saved&&saved.id){
        try{appendMessageBubble({...saved,is_mine:true,reactions:saved.reactions||[]});}catch(e){console.error(e);}
        fin=document.getElementById("msg-bubble-"+saved.id);
        if(fin&&local&&local.parentNode&&fin!==local)local.parentNode.insertBefore(fin,local);
      }
      if(local&&local!==fin)local.remove();
    }
    if(typeof loadConversations==="function"&&document.getElementById("conv-list"))loadConversations().catch(()=>{});
  }
  const PERM=new Set([400,403,404,409,413,422]);
  async function post(m){
    const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),20000);
    try{
      const r=await fetch(`${API_BASE}/messaging/conversations/${encodeURIComponent(m.conv)}/messages`,{method:"POST",signal:ctl.signal,
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${State.token}`,"Idempotency-Key":"zm-"+m.id},
        body:JSON.stringify({content:m.text,message_type:"text",client_msg_id:m.id,view_once:!!m.vo,view_once_mode:m.vo||null,reply_to_id:m.reply?m.reply.id:null,mentions:m.mentions||null})});
      let d=null;try{d=await r.json();}catch(_){}
      if(r.ok)return {ok:true,data:d};
      let det=d&&d.detail;if(Array.isArray(det))det=det.map(x=>x&&x.msg).filter(Boolean).join(" · ");else if(det&&typeof det==="object")det=det.message||det.error;
      if(r.status===402){try{enterRestrictedMode();}catch(_){}}
      return {ok:false,status:r.status,perm:PERM.has(r.status)||r.status===402,msg:typeof det==="string"?det:null};
    }catch(e){return {ok:false,net:true};}
    finally{clearTimeout(tm);}
  }
  let pumping=false,timer=0,delay=3000;
  function later(ms){clearTimeout(timer);timer=setTimeout(pump,ms);}
  async function pump(){
    if(pumping||!State.token||!me())return;
    pumping=true;
    try{
      for(;;){
        const m=mine().filter(x=>x.st!=="fail").sort((a,b)=>a.at-b.at)[0];
        if(!m)break;
        if(!navigator.onLine){paint(m);later(5000);break;}
        const res=await post(m);
        if(!all().some(x=>x.id===m.id))continue;                 // retiré entre-temps
        if(res.ok){delay=3000;try{setNetworkState(true);}catch(_){}settle(m,res.data);continue;}
        if(res.perm){paint(upd(m.id,{st:"fail",err:res.msg||null})||m);continue;}
        // réseau coupé, serveur occupé, session verrouillée : on garde le message et on réessaie
        paint(upd(m.id,{tries:(m.tries||0)+1})||m);
        if(res.net){try{setNetworkState(false);}catch(_){}}
        if(res.status===401)break;
        later(res.status===429?20000:delay);delay=Math.min(delay*2,30000);
        break;
      }
    }finally{pumping=false;try{if(typeof refreshOfflineBar==="function")refreshOfflineBar();}catch(_){}}
  }
  window.zmPump=pump;
  window.zmRetry=function(id){const m=upd(id,{st:"wait",err:null,tries:0,at:Date.now()});if(m){paint(m);pump();}};
  window.zmDiscard=function(id){drop(id);document.getElementById("msg-bubble-"+id)?.remove();};

  sendChatMessage=function(){
    const input=document.getElementById("chat-input");
    const text=(input?.value||"").trim();
    if(!text||typeof _currentConvId==="undefined"||!_currentConvId)return;
    if(text.length>8000){showToast(t("zm_too_long"),"error");return;}
    if(mine().length>=200){showToast(t("zm_queue_full"),"error");return;}
    const rp=typeof _pendingReplyTo!=="undefined"&&_pendingReplyTo?{id:_pendingReplyTo.id,sender_name:_pendingReplyTo.sender_name,content:(_pendingReplyTo.content||"").slice(0,200)}:null;
    const m={id:`local-${Date.now()}-${Math.random().toString(36).slice(2,10)}`,u:me(),conv:_currentConvId,text,at:Date.now(),st:"wait",
      vo:(typeof _pendingViewOnce!=="undefined"&&_pendingViewOnce)||null,reply:rp,
      mentions:(typeof _pendingMentions!=="undefined"&&_pendingMentions.length)?[..._pendingMentions]:null};
    const l=all();l.push(m);
    if(!put(l)){showToast(t("zm_queue_full"),"error");return;}
    input.value="";zmGrow();
    try{input.dispatchEvent(new Event("input",{bubbles:true}));}catch(_){}
    try{setViewOnceMode(null);setEphemeralDuration(null);cancelReply();_pendingMentions=[];}catch(_){}
    paint(m);try{scrollChatToBottom();}catch(_){}
    setTimeout(()=>{const x=all().find(y=>y.id===m.id);if(x&&x.st!=="fail")paint(x);},4200);
    pump();
  };
  window.addEventListener("online",()=>{delay=3000;later(400);});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&mine().length)later(300);});
  setInterval(()=>{if(State.token&&navigator.onLine&&mine().some(m=>m.st!=="fail"))pump();},15000);

  /* ═══════════ 2. Anciens messages ═══════════ */
  const OLD={conv:null,done:false,busy:false};
  const firstMsg=box=>[...box.querySelectorAll(".mb[data-ts]")].find(b=>!b.classList.contains("zm-local")&&!/^msg-bubble-(local-|uploading-)/.test(b.id));
  function pill(html,id){const d=document.createElement("div");d.id=id;d.className="zm-pill";d.setAttribute("role","status");d.innerHTML=html;return d;}
  async function loadOlder(){
    const box=document.getElementById("chat-messages");
    if(!box||OLD.busy||OLD.done||typeof _currentConvId==="undefined"||!_currentConvId||OLD.conv!==_currentConvId)return;
    const first=firstMsg(box);if(!first)return;
    const conv=_currentConvId;OLD.busy=true;
    document.getElementById("zm-old")?.remove();
    box.insertBefore(pill(`${SVG.spin} ${esc(t("zm_older_loading"))}`,"zm-old"),box.firstChild);
    try{
      const before=new Date(+first.dataset.ts).toISOString().replace("Z","");
      const rows=await api("GET",`/messaging/conversations/${conv}/messages?before=${encodeURIComponent(before)}`);
      if(conv!==_currentConvId)return;
      document.getElementById("zm-old")?.remove();
      const fresh=(rows||[]).filter(r=>r&&r.id&&!document.getElementById("msg-bubble-"+r.id));
      if(fresh.length){
        const h0=box.scrollHeight,t0=box.scrollTop,keep=document.createDocumentFragment();
        while(box.firstChild)keep.appendChild(box.firstChild);
        const dayAfter=_lastRenderedDayKey;_lastRenderedDayKey=null;
        fresh.forEach(m=>{try{appendMessageBubble(m);}catch(e){console.error(e);}});
        const k1=keep.firstElementChild;
        if(k1&&k1.classList.contains("mday")){
          const nb=[...keep.querySelectorAll(".mb[data-ts]")][0];
          if(nb&&new Date(+nb.dataset.ts).toDateString()===_lastRenderedDayKey)k1.remove();
        }
        box.appendChild(keep);_lastRenderedDayKey=dayAfter;
        box.scrollTop=box.scrollHeight-h0+t0;
      }
      if(!rows||rows.length<PAGE||!fresh.length){
        OLD.done=true;
        if(box.querySelectorAll(".mb").length>PAGE)box.insertBefore(pill(esc(t("zm_older_end")),"zm-old"),box.firstChild);
      }
    }catch(e){
      document.getElementById("zm-old")?.remove();
      const p=pill(`${esc(t("zm_older_fail"))} <button type="button" onclick="zmLoadOlder()">${esc(t("zm_retry"))}</button>`,"zm-old");
      box.insertBefore(p,box.firstChild);
    }finally{OLD.busy=false;}
  }
  window.zmLoadOlder=loadOlder;
  function onScroll(){const box=document.getElementById("chat-messages");if(box&&box.scrollTop<140)loadOlder();}
  function bindScroll(){const box=document.getElementById("chat-messages");if(box&&!box.dataset.zmScroll){box.dataset.zmScroll="1";box.addEventListener("scroll",onScroll,{passive:true});}}

  const _oc=openConversation;
  openConversation=async function(id){
    OLD.conv=null;OLD.done=false;OLD.busy=false;
    const r=await _oc.apply(this,arguments);
    try{
      if(typeof _currentConvId!=="undefined"&&_currentConvId===id){
        const box=document.getElementById("chat-messages");
        const n=box?[...box.querySelectorAll(".mb[data-ts]")].length:0;
        OLD.conv=id;OLD.done=n<PAGE;
        bindScroll();paintConv(id);scrollChatToBottom();
        if(box&&!OLD.done&&box.scrollHeight<=box.clientHeight+40)loadOlder();
      }
    }catch(e){console.error(e);}
    pump();
    return r;
  };

  /* ═══════════ 3. Zone d'écriture ═══════════ */
  const coarse=()=>{try{return matchMedia("(pointer:coarse)").matches;}catch(_){return false;}};
  function zmGrow(el){
    el=el||document.getElementById("chat-input");if(!el||el.tagName!=="TEXTAREA")return;
    const cs=getComputedStyle(el),lh=parseFloat(cs.lineHeight)||22,pad=(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0)+(parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0);
    const max=Math.round(lh*5+pad);
    el.style.height="auto";
    const h=Math.min(el.scrollHeight+(parseFloat(cs.borderTopWidth)||0)+(parseFloat(cs.borderBottomWidth)||0),max);
    el.style.height=h+"px";el.style.overflowY=el.scrollHeight>max?"auto":"hidden";
  }
  window.zmGrow=zmGrow;
  window.zmKey=function(ev){
    if(ev.key!=="Enter"||ev.isComposing||ev.keyCode===229)return;
    if(ev.shiftKey||coarse())return;                               // téléphone : Entrée va à la ligne
    const dd=document.getElementById("mention-dropdown");
    if(dd&&dd.style.display!=="none")return;
    ev.preventDefault();sendChatMessage();
  };
  document.addEventListener("input",e=>{if(e.target&&(e.target.id==="chat-input"||e.target.id==="mf-cap"))zmGrow(e.target);},true);
  window.addEventListener("resize",()=>zmGrow());

  /* ═══════════ 4. Archiver un message ═══════════ */
  const ARCH_OK=m=>m&&m.id&&!m._raw&&!m.deleted&&!m.destroyed&&!m.needs_reveal&&["text","file","voice"].includes(m.message_type)
    &&!/^(local-|uploading-|q-)/.test(String(m.id))&&!(m.view_once&&!(m.is_mine!==undefined?m.is_mine:m.sender_tenant_id===State.tenant?.id));
  function markArch(b,on){
    b.classList.toggle("zm-arch",on);
    b.querySelector(".zm-arch-tag")?.remove();
    if(on)b.querySelector(".mb-time")?.insertAdjacentHTML("beforebegin",`<span class="zm-arch-tag">${icArchive(12)} ${esc(t("zm_archived_tag"))}</span>`);
    const ic=b.querySelector(".zm-arch-btn");
    if(ic){ic.classList.toggle("on",on);ic.title=t(on?"zm_unarchive":"zm_archive");ic.setAttribute("aria-label",ic.title);ic.setAttribute("aria-pressed",on?"true":"false");}
  }
  const _amb=appendMessageBubble;
  appendMessageBubble=function(m){
    const r=_amb.apply(this,arguments);
    try{
      if(ARCH_OK(m)){
        const b=document.getElementById("msg-bubble-"+m.id),acts=b&&b.querySelector(".mb-acts");
        if(acts&&!acts.querySelector(".zm-arch-btn")){
          const s=acts.querySelector(".ti-star,.ti-star-filled");
          const btn=document.createElement("button");btn.type="button";btn.className="zm-arch-btn";btn.innerHTML=icArchive(15);
          btn.addEventListener("click",e=>{e.stopPropagation();zmToggleArchive(m.id);});
          if(s)s.after(btn);else acts.appendChild(btn);
          markArch(b,!!m.is_archived);
        }
      }
    }catch(e){console.error(e);}
    return r;
  };
  function actionToast(text,actions){
    document.getElementById("zm-toast")?.remove();document.querySelector(".toast")?.remove();
    const d=document.createElement("div");d.id="zm-toast";d.className="zm-toast";d.setAttribute("role","status");
    d.innerHTML=`<span class="zm-toast-ic">${icArchive(19)}</span><span class="zm-toast-tx"></span>`;
    d.querySelector(".zm-toast-tx").textContent=text;
    (actions||[]).forEach(a=>{const b=document.createElement("button");b.type="button";b.className=a.main?"go":"";b.textContent=a.label;b.addEventListener("click",()=>{d.remove();a.run();});d.appendChild(b);});
    document.body.appendChild(d);setTimeout(()=>{if(d.isConnected)d.remove();},6000);
  }
  window.zmToggleArchive=async function(id,silent){
    const b=document.getElementById("msg-bubble-"+id);
    const on=!(b&&b.classList.contains("zm-arch"));
    try{
      await api(on?"POST":"DELETE",`/messaging/messages/${encodeURIComponent(id)}/archive`);
      if(b)markArch(b,on);
      try{if(typeof nfArchCounts==="function")nfArchCounts();}catch(_){}
      if(silent)return;
      if(on)actionToast(t("zm_archived"),[{label:t("btn_cancel"),run:()=>zmToggleArchive(id,true)},{label:t("zm_see"),main:true,run:()=>{window._nfArchTab="messages";try{_nfArchTab="messages";}catch(_){}navigate("msgarchive");}}]);
      else showToast(t("zm_unarchived"),"info");
    }catch(e){showToast(e.message,"error");}
  };

  /* Page Archives : onglet « Messages » (texte, photos et vidéos, vocaux) à côté des discussions */
  let aKind="all";
  const KIND_IC={text:"ti-message",photo:"ti-photo",video:"ti-video",voice:"ti-microphone",file:"ti-file"};
  function aLabel(i){
    if(i.kind==="text")return i.excerpt||"";
    const base=i.kind==="voice"?t("zm_k_voice"):i.kind==="photo"?t("zm_k_photo"):i.kind==="video"?t("zm_k_video"):(i.file_name||t("zm_k_file"));
    return i.excerpt?`${base} · ${i.excerpt}`:base;
  }
  async function renderArchMsgs(el){
    const host=el.querySelector(".nf-alist");if(!host)return;
    host.innerHTML=`<div class="nf-empty">${esc(t("loading"))}</div>`;
    let d;
    try{d=await api("GET",`/messaging/archived-messages?kind=${encodeURIComponent(aKind)}`);}catch(e){host.innerHTML=`<div class="nf-empty" style="color:var(--red)">${esc(e.message)}</div>`;return;}
    const tabN=el.querySelector("#zm-tab-msgs span");if(tabN)tabN.textContent=d.counts.all;
    const chips=[["all","zm_f_all"],["text","zm_f_text"],["media","zm_f_media"],["voice","zm_f_voice"],["file","zm_f_file"]].filter(c=>c[0]!=="file"||d.counts.file||aKind==="file");
    host.innerHTML=`<div class="zm-chips" role="group" aria-label="${esc(t("zm_f_label"))}">${chips.map(([k,l])=>`<button type="button" class="zm-chip${aKind===k?" on":""}" aria-pressed="${aKind===k}" data-k="${k}">${esc(t(l))} <span>${d.counts[k]}</span></button>`).join("")}</div>
      ${d.items.map((i,n)=>`<div class="nf-arow zm-arow"><button type="button" class="nf-aopen" data-i="${n}"><span class="zm-aic k-${esc(i.kind)}"><i class="ti ${KIND_IC[i.kind]||"ti-message"}" aria-hidden="true"></i></span><span class="nf-atx"><b>${esc(aLabel(i))}</b><small>${esc(i.is_mine?abTr("zm_from_me",{n:i.conversation_name}):(i.is_group?`${i.sender_name} · ${i.conversation_name}`:i.sender_name||i.conversation_name))} · ${esc(fmtDate(i.created_at))}</small></span></button>
        <button type="button" class="btn btn-o btn-sm nf-g" data-rm="${n}">${esc(t("zm_remove"))}</button></div>`).join("")||`<div class="nf-empty">${esc(t("zm_none"))}</div>`}
      <div class="nf-hint" style="padding:10px 4px 0">${esc(t("zm_arch_hint"))}</div>`;
    host.querySelectorAll(".zm-chip").forEach(c=>c.addEventListener("click",()=>{aKind=c.dataset.k;renderArchMsgs(el);}));
    host.querySelectorAll("[data-i]").forEach(b=>b.addEventListener("click",()=>{const i=d.items[+b.dataset.i];zmOpenArchived(i);}));
    host.querySelectorAll("[data-rm]").forEach(b=>b.addEventListener("click",async()=>{const i=d.items[+b.dataset.rm];b.disabled=true;
      try{await api("DELETE",`/messaging/messages/${encodeURIComponent(i.id)}/archive`);showToast(t("zm_unarchived"),"info");renderArchMsgs(el);}catch(e){b.disabled=false;showToast(e.message,"error");}}));
  }
  window.zmOpenArchived=function(i){
    navigate("messaging");
    setTimeout(async()=>{
      try{
        _conversations=await api("GET","/messaging/conversations?include_archived=true");renderConvList();
        await openConversationFromSearch(i.conversation_id,i.conversation_name,i.id,i.created_at);
      }catch(e){showToast(e.message,"error");}
    },350);
  };
  if(typeof V93_PAGES==="object"&&V93_PAGES.msgarchive){
    const _pg=V93_PAGES.msgarchive;
    V93_PAGES.msgarchive=async function(){
      const want=typeof _nfArchTab!=="undefined"&&_nfArchTab==="messages";
      if(want)_nfArchTab="archived";
      await _pg.apply(this,arguments);
      const el=document.getElementById("page-msgarchive");const tabs=el&&el.querySelector(".nf-tabs");if(!tabs)return;
      const b=document.createElement("button");b.type="button";b.id="zm-tab-msgs";b.setAttribute("role","tab");b.innerHTML=`${esc(t("zm_tab_msgs"))} <span>…</span>`;
      b.addEventListener("click",()=>{_nfArchTab="messages";V93_PAGES.msgarchive();});
      tabs.insertBefore(b,tabs.firstChild);
      if(want){
        _nfArchTab="messages";
        tabs.querySelectorAll("button").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-selected",on?"true":"false");});
        await renderArchMsgs(el);
      }else{
        b.setAttribute("aria-selected","false");
        api("GET","/messaging/archived-messages?kind=all").then(d=>{const s=b.querySelector("span");if(s)s.textContent=d.counts.all;}).catch(()=>{const s=b.querySelector("span");if(s)s.textContent="";});
      }
    };
  }

  /* déconnexion : on tente un dernier envoi, puis les messages non partis ne restent pas sur l'appareil */
  if(typeof doLogout==="function"){
    const _lo=doLogout;
    doLogout=async function(){
      const uid=me(),args=arguments;
      if(uid&&navigator.onLine&&window.zmPendingCount()){try{await Promise.race([pump(),new Promise(r=>setTimeout(r,3000))]);}catch(_){}}
      const r=await _lo.apply(this,args);
      try{if(!State.token&&uid)put(all().filter(m=>m&&m.u!==uid));}catch(_){}
      return r;
    };
  }
  /* démarrage : on reprend les envois restés en attente */
  if(typeof showAppLayout==="function"){const _sa=showAppLayout;showAppLayout=function(){const r=_sa.apply(this,arguments);setTimeout(pump,1500);return r;};}
  if(State&&State.token)setTimeout(pump,2500);
  document.addEventListener("DOMContentLoaded",()=>{bindScroll();zmGrow();});
})();
