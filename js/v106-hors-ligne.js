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

  /* ── 2. Messages en attente : voir v107-messages.js (envoi confirmé par le serveur) ── */
  const queue=()=>({length:typeof window.zmPendingCount==="function"?window.zmPendingCount():0});

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
