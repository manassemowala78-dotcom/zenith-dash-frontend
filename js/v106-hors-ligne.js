/* Zenith Dash 10.6 — résilience hors-ligne : on ne te sort jamais de l'appli quand le réseau coupe.
   • la page / la discussion ouverte sont mémorisées et rouvertes au rechargement
   • les messages écrits sans réseau attendent avec une horloge ⏱ et partent seuls au retour du réseau
   • la liste des discussions reste affichée (dernière version connue) au lieu d'une erreur rouge */
(function(){
  const LS=window.localStorage;
  const jget=(k,d)=>{try{return JSON.parse(LS.getItem(k))??d;}catch(_){return d;}};
  const jset=(k,v)=>{try{LS.setItem(k,JSON.stringify(v));}catch(_){}};
  const me=()=>State.tenant?.id||"anon";

  /* ── 1. Mémoriser la page / la discussion ── */
  function savePos(extra){
    const cur=document.querySelector(".page.active");if(!cur||!State.token)return;
    const p=cur.id.replace(/^page-/,"");
    const pos=Object.assign({u:me(),p,at:Date.now()},extra||{});
    if(!("c" in pos)&&p==="messaging"&&_currentConvId&&document.getElementById("chat-input-row")?.style.display!=="none")pos.c=_currentConvId;
    jset("zd_pos",pos);
  }
  const _nav=navigate;
  navigate=function(page){const r=_nav.apply(this,arguments);setTimeout(()=>savePos({c:null}),30);return r;};
  if(typeof openConversation==="function"){
    const _oc=openConversation;
    openConversation=function(id){const r=_oc.apply(this,arguments);setTimeout(()=>savePos({c:id}),80);return r;};
  }
  if(typeof backToConvList==="function"){
    const _bk=backToConvList;
    backToConvList=function(){const r=_bk.apply(this,arguments);setTimeout(()=>savePos({c:null}),30);return r;};
  }
  /* au démarrage : sans lien profond, on rouvre là où on était (rechargement ou hors-ligne) */
  const _cdl=consumeDeepLink;
  consumeDeepLink=function(){
    const d=_cdl.apply(this,arguments);
    if(d.page||d.conv||d.action)return d;
    const pos=jget("zd_pos",null);
    const nav=(performance.getEntriesByType&&performance.getEntriesByType("navigation")[0])||{};
    if(pos&&pos.u===me()&&pos.p&&pos.p!=="billing"&&(!navigator.onLine||nav.type==="reload"||Date.now()-pos.at<30*60*1000)){
      return {page:pos.p,conv:pos.c||null,action:null};
    }
    return d;
  };

  /* ── 2. Messages en attente ── */
  const QK="zd_msgq";
  const queue=()=>jget(QK,[]).filter(m=>m.u===me());
  const allQ=()=>jget(QK,[]);
  const clockHtml=id=>`<i id="ticks-${id}" data-tick="queued" class="ti ti-clock" style="font-size:13px;margin-left:3px;opacity:.75" title="${esc(t("oq_wait"))}"></i>`;
  function paintQueued(conv){
    if(_currentConvId!==conv)return;
    queue().filter(m=>m.conv===conv).forEach(m=>{
      if(document.getElementById("msg-bubble-"+m.id))return;
      try{
        appendMessageBubble({id:m.id,sender_tenant_id:State.tenant?.id,sender_name:State.tenant?.name,content:m.text,message_type:"text",created_at:new Date(m.at).toISOString(),is_mine:true,reactions:[],reply_to:null});
        const tk=document.getElementById("ticks-"+m.id);if(tk)tk.outerHTML=clockHtml(m.id);
      }catch(_){}
    });
  }
  const _send=sendChatMessage;
  sendChatMessage=function(){
    const input=document.getElementById("chat-input");
    const text=(input?.value||"").trim();
    if(!text||!_currentConvId)return;
    if(navigator.onLine){return _send.apply(this,arguments);}
    // Hors-ligne : on garde le message, avec une horloge
    if(text.length>8000){showToast(t("oq_too_long"),"error");return;}
    const m={id:"q-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),u:me(),conv:_currentConvId,text,at:Date.now()};
    const q=allQ();q.push(m);
    if(q.filter(x=>x.u===me()).length>100){showToast(t("oq_full"),"error");return;}
    jset(QK,q);
    input.value="";try{input.dispatchEvent(new Event("input"));}catch(_){}
    paintQueued(m.conv);scrollChatToBottom();
    if(typeof setNetworkState==="function")setNetworkState(false);
    showToast(t("oq_queued"),"info");
  };
  let flushing=false;
  async function flushMsgs(){
    if(flushing||!navigator.onLine||!State.token)return;
    const mine=queue();if(!mine.length)return;
    flushing=true;
    try{
      for(const m of mine){
        try{
          await api("POST",`/messaging/conversations/${m.conv}/messages`,{content:m.text,message_type:"text"});
        }catch(e){
          if(e&&e.zdNetwork)break;                        // le réseau a recoupé : on réessaiera
          if(e&&(e.status===403||e.status===404||e.status===423)){} // discussion fermée/verrouillée : on abandonne ce message
          else break;
        }
        jset(QK,allQ().filter(x=>x.id!==m.id));
        const b=document.getElementById("msg-bubble-"+m.id);if(b)b.remove();
      }
    }finally{flushing=false;}
    if(_currentConvId&&typeof openConversation==="function"&&!queue().length){
      const had=mine.some(m=>m.conv===_currentConvId);
      if(had){try{openConversation(_currentConvId);}catch(_){}}
    }
    if(typeof loadConversations==="function"&&document.getElementById("conv-list"))loadConversations().catch(()=>{});
  }
  window.zdFlushMsgs=flushMsgs;
  window.addEventListener("online",()=>setTimeout(flushMsgs,600));
  setInterval(()=>{if(navigator.onLine&&queue().length)flushMsgs();},10000);
  /* repeindre les messages en attente quand on (ré)ouvre la discussion */
  const _oc2=openConversation;
  openConversation=async function(id){const r=await _oc2.apply(this,arguments);paintQueued(id);return r;};

  /* ── 3. Liste des discussions hors-ligne ── */
  const _lc=loadConversations;
  loadConversations=async function(){
    const r=await _lc.apply(this,arguments);
    const box=document.getElementById("conv-list");
    if(box&&!navigator.onLine&&box.querySelector("div[style*='var(--red)']")){
      if(_conversations&&_conversations.length){renderConvList();}
      else box.innerHTML=`<div style="color:var(--muted);padding:16px;font-size:13px;text-align:center"><i class="ti ti-cloud-off" style="font-size:22px;display:block;margin-bottom:6px"></i>${esc(t("oq_list_off"))}</div>`;
    }
    return r;
  };
  /* le bandeau jaune compte aussi les messages en attente */
  if(typeof refreshOfflineBar==="function"){
    const _rb=refreshOfflineBar;
    refreshOfflineBar=async function(){
      await _rb.apply(this,arguments);
      const bar=document.getElementById("offline-bar"),n=queue().length;
      if(bar&&n&&bar.style.display==="none"){bar.className="offline-bar sync";bar.style.display="flex";bar.innerHTML=`<span>🔄 ${esc(t("oq_sending").replace("{n}",n))}</span>`;}
    };
  }
  window.addEventListener("offline",()=>{try{setNetworkState(false);}catch(_){}});
})();
