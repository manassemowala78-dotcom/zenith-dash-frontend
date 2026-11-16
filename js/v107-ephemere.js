/* Zenith Dash 10.7.1 — messages éphémères (1 h, 24 h, 7 jours) et copie des messages.
   Le choix ne vaut que pour le message suivant ; un bandeau le rappelle avec « Annuler ».
   Chaque message éphémère porte un compte à rebours, puis laisse la ligne « Un message éphémère a disparu ».
   Tous les autres messages restent enregistrés. */
(function(){
  const DUR=[3600,86400,604800];
  const IC={
    timer:sz=>`<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5"/><path d="M9.5 2.5h5"/></svg>`,
    shield:'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6v6c0 4.2 3 7.5 7 9 4-1.5 7-4.8 7-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    copy:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  };
  window.zeIcTimer=IC.timer;
  const durLabel=s=>t(s===3600?"eph_1h":s===86400?"eph_24h":"eph_7d");
  const hm=d=>`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  function whenText(d){
    const now=new Date(),tom=new Date(now);tom.setDate(now.getDate()+1);
    if(d.toDateString()===now.toDateString())return abTr("ze_at_today",{h:hm(d)});
    if(d.toDateString()===tom.toDateString())return abTr("ze_at_tomorrow",{h:hm(d)});
    return abTr("ze_at_day",{d:fmtDate(d.toISOString()),h:hm(d)});
  }
  function goneTime(iso){
    const d=parseServerDate(iso),now=new Date(),y=new Date(now);y.setDate(now.getDate()-1);
    if(d.toDateString()===now.toDateString())return hm(d);
    if(d.toDateString()===y.toDateString())return abTr("ze_yesterday",{h:hm(d)});
    return `${fmtDate(iso)} ${hm(d)}`;
  }
  function leftText(ms){
    if(ms<=60000)return t("ze_lt1");
    if(ms<3600000)return abTr("ze_m",{n:Math.ceil(ms/60000)});
    if(ms<48*3600000)return abTr("ze_h",{n:Math.ceil(ms/3600000)});
    return abTr("ze_d",{n:Math.ceil(ms/86400000)});
  }

  /* ── Choisir la durée ── */
  let pick=86400;
  window.zeOpen=function(){
    if(typeof _currentConvId==="undefined"||!_currentConvId)return;
    document.getElementById("ze-sheet")?.remove();
    pick=DUR.includes(_pendingEphemeral)?_pendingEphemeral:86400;
    const who=(document.getElementById("chat-header-name")?.textContent||"").trim();
    const ov=document.createElement("div");ov.id="ze-sheet";ov.className="modal-overlay ze-ov";ov.style.display="flex";
    ov.innerHTML=`<div class="ze-sheet" role="dialog" aria-modal="true" aria-labelledby="ze-t">
      <div class="ze-grip" aria-hidden="true"></div>
      <div class="ze-head"><span class="ze-ic">${IC.timer(22)}</span><h2 id="ze-t">${esc(t("ze_title"))}</h2></div>
      <p class="ze-x">${esc(who?abTr("ze_intro",{n:who}):t("ze_intro_noname"))}</p>
      <div class="ze-opts" role="radiogroup" aria-labelledby="ze-t">${DUR.map(s=>`<button type="button" role="radio" class="ze-opt" data-s="${s}" aria-checked="false"><span class="ze-ring"><span></span></span><span class="ze-otx"><b>${esc(durLabel(s))}</b><small>${esc(abTr("ze_goes",{w:whenText(new Date(Date.now()+s*1000))}))}</small></span></button>`).join("")}</div>
      <div class="ze-safe">${IC.shield}<span>${esc(t("ze_safe"))}</span></div>
      <div class="ze-btns"><button type="button" class="ze-cancel">${esc(t("btn_cancel"))}</button><button type="button" class="ze-ok"></button></div></div>`;
    document.body.appendChild(ov);
    const sync=()=>{ov.querySelectorAll(".ze-opt").forEach(b=>{const on=+b.dataset.s===pick;b.classList.toggle("on",on);b.setAttribute("aria-checked",on?"true":"false");b.tabIndex=on?0:-1;});
      ov.querySelector(".ze-ok").textContent=abTr("ze_choose",{d:durLabel(pick)});};
    ov.querySelectorAll(".ze-opt").forEach(b=>{
      b.addEventListener("click",()=>{pick=+b.dataset.s;sync();});
      b.addEventListener("keydown",e=>{const i=DUR.indexOf(pick);
        if(["ArrowDown","ArrowRight"].includes(e.key)){e.preventDefault();pick=DUR[(i+1)%3];sync();ov.querySelector(".ze-opt.on").focus();}
        if(["ArrowUp","ArrowLeft"].includes(e.key)){e.preventDefault();pick=DUR[(i+2)%3];sync();ov.querySelector(".ze-opt.on").focus();}});
    });
    const close=()=>ov.remove();
    ov.addEventListener("click",e=>{if(e.target===ov)close();});
    ov.querySelector(".ze-cancel").addEventListener("click",close);
    ov.querySelector(".ze-ok").addEventListener("click",()=>{close();setEphemeralDuration(pick);document.getElementById("chat-input")?.focus();});
    sync();setTimeout(()=>ov.querySelector(".ze-opt.on")?.focus(),60);
  };
  setEphemeralDuration=function(seconds){
    _pendingEphemeral=DUR.includes(seconds)?seconds:null;
    const old=document.getElementById("ephemeral-menu");if(old)old.style.display="none";
    const ind=document.getElementById("ephemeral-indicator");if(!ind)return;
    if(_pendingEphemeral){
      ind.className="ze-band";ind.style.display="flex";
      ind.innerHTML=`<span class="ze-ic">${IC.timer(17)}</span><span class="ze-btx"></span><button type="button" class="ze-bx">${esc(t("btn_cancel"))}</button>`;
      ind.querySelector(".ze-btx").textContent=abTr("ze_next",{d:durLabel(_pendingEphemeral)});
      ind.querySelector(".ze-bx").addEventListener("click",()=>setEphemeralDuration(null));
    }else{ind.style.display="none";ind.innerHTML="";}
  };
  toggleEphemeralMenu=function(){zeOpen();};
  if(typeof openConversation==="function"){
    const _oc=openConversation;
    openConversation=function(){try{setEphemeralDuration(null);}catch(_){}document.getElementById("ze-sheet")?.remove();return _oc.apply(this,arguments);};
  }

  /* ── Affichage : compte à rebours, ligne « a disparu », bouton copier ── */
  function goneEl(id,createdIso,expIso){
    const d=document.createElement("div");d.id="msg-bubble-"+id;d.className="ze-gone";d.setAttribute("role","note");
    d.dataset.goneTs=parseServerDate(createdIso).getTime();
    d.innerHTML=`${IC.timer(13)}<span></span>`;d.querySelector("span").textContent=abTr("ze_gone",{t:goneTime(expIso)});
    return d;
  }
  function vanish(b){
    const exp=b.dataset.zeExp;if(!exp)return;
    const id=b.id.replace(/^msg-bubble-/,"");
    const g=goneEl("gone-"+id,new Date(+b.dataset.ts).toISOString(),new Date(+exp).toISOString());
    b.replaceWith(g);
  }
  function tick(){
    const now=Date.now();
    document.querySelectorAll("#chat-messages .mb[data-ze-exp]").forEach(b=>{
      const ms=+b.dataset.zeExp-now;
      if(ms<=0){vanish(b);return;}
      const l=b.querySelector(".ze-left span");if(l){const tx=abTr("ze_left",{d:leftText(ms)});if(l.textContent!==tx)l.textContent=tx;}
    });
  }
  setInterval(tick,20000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick();});

  async function copyText(txt){
    try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(txt);return true;}}catch(_){}
    try{
      const ta=document.createElement("textarea");ta.value=txt;ta.setAttribute("readonly","");ta.style.cssText="position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,txt.length);const ok=document.execCommand("copy");ta.remove();return ok;
    }catch(_){return false;}
  }
  window.zeCopy=async function(id){
    const b=document.getElementById("msg-bubble-"+id);if(!b)return;
    const txt=b.dataset.rawContent!=null&&b.dataset.rawContent!==""?b.dataset.rawContent:(b.dataset.zeCopy||"");
    if(!txt)return;
    const ok=await copyText(txt);showToast(t(ok?"ze_copied":"ze_copy_fail"),ok?"info":"error");
    b.classList.remove("acts-on");
  };

  const _amb=appendMessageBubble;
  appendMessageBubble=function(m){
    if(m&&m.message_type==="ephemeral_gone"){
      const box=document.getElementById("chat-messages");if(!box||document.getElementById("msg-bubble-"+m.id))return;
      if(m.expires_at&&parseServerDate(m.expires_at).getTime()>Date.now())return;
      const key=dayKey(m.created_at);
      if(key!==_lastRenderedDayKey){const dv=document.createElement("div");dv.className="mday";dv.innerHTML=`<span>${esc(fmtDayDivider(m.created_at))}</span>`;box.appendChild(dv);_lastRenderedDayKey=key;}
      box.appendChild(goneEl(m.id,m.created_at,m.expires_at||m.created_at));
      return;
    }
    if(m&&m.expires_at&&!m._raw&&parseServerDate(m.expires_at).getTime()<=Date.now())return;
    const r=_amb.apply(this,arguments);
    try{
      const b=m&&m.id&&document.getElementById("msg-bubble-"+m.id);
      if(!b||m._raw)return r;
      if(m.expires_at&&!b.dataset.zeExp){
        const exp=parseServerDate(m.expires_at).getTime();
        b.dataset.zeExp=exp;b.classList.add("ze-eph");
        const tm=b.querySelector(".mb-time");
        if(tm){const s=document.createElement("span");s.className="ze-left";s.innerHTML=`${IC.timer(12)} <span></span>`;s.querySelector("span").textContent=abTr("ze_left",{d:leftText(exp-Date.now())});tm.before(s);}
      }
      const txt=m.message_type==="text"?(m.content||""):(["file","voice"].includes(m.message_type)?(m.content||""):"");
      const mine=m.is_mine!==undefined?m.is_mine:m.sender_tenant_id===State.tenant?.id;
      const okCopy=txt.trim()&&!m.deleted&&!m.destroyed&&!m.needs_reveal&&!(m.view_once&&!mine);
      const acts=b.querySelector(".mb-acts");
      if(okCopy&&acts&&!acts.querySelector(".ze-copy")){
        if(m.message_type!=="text")b.dataset.zeCopy=txt;
        const btn=document.createElement("button");btn.type="button";btn.className="ze-copy";btn.innerHTML=IC.copy;
        btn.title=t("ze_copy");btn.setAttribute("aria-label",t("ze_copy"));
        btn.addEventListener("click",e=>{e.stopPropagation();zeCopy(m.id);});
        const fw=acts.querySelector(".ti-arrow-forward-up");if(fw)fw.after(btn);else acts.prepend(btn);
      }
      if(m.expires_at)b.querySelector(".zm-arch-btn")?.remove();
    }catch(e){console.error(e);}
    return r;
  };
})();
