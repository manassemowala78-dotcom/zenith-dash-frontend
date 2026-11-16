/* Zenith Dash 10.7.1 — clients potentiels.
   Onglets « Clients » / « Clients potentiels » dans la page Clients, fiche avec le parcours,
   passage en client automatique (réservation, commande, facture…) ou à la main. */
(function(){
  if(typeof loadClients!=="function")return;
  const ZC={tab:"client",counts:{clients:0,prospects:0},stats:{}};
  window.ZC=ZC;
  const IC={
    msg:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-5 4v-4a2 2 0 0 1-1-1.7z"/></svg>',
    plus:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/></svg>',
    cal:'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/></svg>',
    file:'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 13h5M10 17h5"/></svg>',
    box:'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></svg>',
    hand:'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 9.5 17 19 7.500"/></svg>',
    x:'<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  };
  const isP=c=>c&&c.status==="prospect";
  const badge=c=>`<span class="zc-badge ${isP(c)?"p":"c"}">${esc(t(isP(c)?"zc_badge_p":"zc_badge_c"))}</span>`;
  const ini=n=>esc(((n||"?").trim().charAt(0)||"?").toUpperCase());
  const hue=s=>{let h=0;for(const ch of String(s||""))h=(h*31+ch.charCodeAt(0))%360;return h;};

  function ensureTabs(){
    const pg=document.getElementById("page-clients");if(!pg)return;
    let tb=document.getElementById("zc-tabs");
    if(!tb){
      tb=document.createElement("div");tb.id="zc-tabs";tb.className="zc-tabs";tb.setAttribute("role","tablist");
      const card=pg.querySelector(".card");pg.insertBefore(tb,card);
      const info=document.createElement("div");info.id="zc-info";info.className="zc-info";info.hidden=true;pg.insertBefore(info,card);
      const list=document.createElement("div");list.id="zc-list";list.className="zc-list";list.hidden=true;
      const more=document.getElementById("clients-more");
      (card.querySelector(".table-wrap,.tw")||card.querySelector("table")).before(list);
      void more;
    }
    tb.innerHTML=[["client","zc_tab_clients",ZC.counts.clients],["prospect","zc_tab_prospects",ZC.counts.prospects]].map(([k,l,n])=>
      `<button type="button" role="tab" aria-selected="${ZC.tab===k}" class="zc-tab ${k==="prospect"?"p":"c"}${ZC.tab===k?" on":""}" data-k="${k}">${esc(t(l))} <span>${n}</span></button>`).join("");
    tb.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{if(ZC.tab===b.dataset.k)return;ZC.tab=b.dataset.k;loadClients(false);}));
    const info=document.getElementById("zc-info");
    if(info){info.hidden=ZC.tab!=="prospect";info.innerHTML=`<span class="zc-info-ic">${IC.plus}</span><span>${esc(t("zc_info"))}</span>`;}
  }
  async function refreshStats(){
    try{const r=await api("GET","/clients/contact-stats");ZC.counts=r.counts||ZC.counts;ZC.stats=r.stats||{};}catch(_){}
  }
  function sub(c){
    const s=ZC.stats[c.id];
    if(s&&s.messages)return abTr(s.messages>1?"zc_wrote_n":"zc_wrote_1",{d:fmtDate(s.last_at),n:s.messages});
    return abTr("zc_added_on",{d:fmtDate(c.status_at||c.created_at)});
  }
  function cards(list){
    return list.map(c=>`<div class="zc-row"><button type="button" class="zc-open" onclick="zcOpenFiche('${esc(c.id)}')"><span class="zc-av" style="background:hsl(${hue(c.id)} 70% 72%)">${ini(c.name)}</span>
      <span class="zc-tx"><span class="zc-nm"><b>${esc(c.name)}</b>${badge(c)}</span><small>${esc(sub(c))}</small></span></button>
      ${c.account_id?`<button type="button" class="zc-ib" aria-label="${esc(t("zc_write"))}" title="${esc(t("zc_write"))}" onclick="zcWrite('${esc(c.account_id)}','${escJs(c.name)}')">${IC.msg}</button>`:""}</div>`).join("");
  }
  const _rows=clientRowsHtml;
  clientRowsHtml=function(list){
    // même tableau qu'avant ; le nom ouvre la fiche et porte le statut
    const html=_rows(list);
    const tmp=document.createElement("tbody");tmp.innerHTML=html;
    [...tmp.children].forEach((tr,i)=>{const c=list[i],td=tr.firstElementChild;if(!c||!td)return;
      td.innerHTML=`<button type="button" class="zc-name" onclick="zcOpenFiche('${esc(c.id)}')">${esc(c.name)}</button> ${c.account_id||isP(c)?badge(c):""}`;});
    return tmp.innerHTML;
  };
  loadClients=async function(append=false){
    const tbody=document.getElementById("clients-tbody");if(!tbody)return;
    try{
      if(!append)await refreshStats();
      ensureTabs();
      const st=await fetchListPage("clients",`/clients/?status=${ZC.tab}`,append);
      _clients=st.items;
      const list=document.getElementById("zc-list"),wrap=tbody.closest(".table-wrap,.tw")||tbody.closest("table");
      const asCards=ZC.tab==="prospect";
      if(list)list.hidden=!asCards;if(wrap)wrap.style.display=asCards?"none":"";
      const empty=st.q?t("list_no_result"):t(asCards?"zc_none_p":"no_clients");
      if(asCards){list.innerHTML=_clients.length?cards(_clients):`<div class="zc-empty">${esc(empty)}</div>`;}
      else tbody.innerHTML=_clients.length?clientRowsHtml(_clients):`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">${esc(empty)}</td></tr>`;
      renderListFooter("clients","clients-more","loadClients");
    }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
  };
  window.zcWrite=async function(accountId,name){
    document.getElementById("zc-fiche")?.remove();
    try{
      const r=await api("POST","/messaging/conversations",{tenant_ids:[accountId]});
      navigate("messaging");setTimeout(()=>openConversation(r.id,name),250);
    }catch(e){showToast(e.message,"error");}
  };
  const EV={message:["zc_ev_message",IC.msg,"a"],booking:["zc_ev_booking",IC.cal,"g"],order:["zc_ev_order",IC.box,"g"],invoice:["zc_ev_invoice",IC.file,"b"],quote:["zc_ev_quote",IC.file,"b"],
    sale:["zc_ev_sale",IC.box,"g"],job:["zc_ev_job",IC.box,"g"],delivery:["zc_ev_delivery",IC.box,"g"],project:["zc_ev_project",IC.file,"b"],storage:["zc_ev_storage",IC.box,"g"],
    case:["zc_ev_case",IC.file,"b"],link:["zc_ev_link",IC.cal,"g"],activity:["zc_ev_activity",IC.hand,"g"],manual_client:["zc_ev_manual_c",IC.hand,"g"],manual_prospect:["zc_ev_manual_p",IC.hand,"a"]};
  window.zcOpenFiche=async function(id){
    let j;
    try{j=await api("GET",`/clients/${encodeURIComponent(id)}/journey`);}catch(e){showToast(e.message,"error");return;}
    document.getElementById("zc-fiche")?.remove();
    const p=j.status==="prospect";
    let auto=-1;
    if(j.source==="message"){auto=j.events.findIndex(e=>!["message","manual_prospect","manual_client"].includes(e.kind));
      if(auto>=0&&j.events.slice(0,auto).some(e=>e.kind==="manual_client"))auto=-1;}
    const steps=j.events.map((e,i)=>{const d=EV[e.kind]||EV.activity;
      const note=e.kind==="message"&&i===0?t("zc_auto_p"):i===auto?t("zc_auto_c"):"";
      return `<li class="zc-step ${d[2]}"><span class="zc-step-ic">${d[1]}</span><span class="zc-step-tx"><b>${esc(t(d[0]))}${e.label?` · ${esc(e.label)}`:""}</b><small>${esc(fmtDateTimeSafe(e.at))}${note?` · ${esc(note)}`:""}</small></span></li>`;}).join("");
    const ov=document.createElement("div");ov.id="zc-fiche";ov.className="modal-overlay";ov.style.display="flex";ov.style.zIndex=1200;
    ov.innerHTML=`<div class="modal zc-fiche" role="dialog" aria-modal="true" aria-labelledby="zc-f-t">
      <div class="zc-f-top"><h3 id="zc-f-t">${esc(t("zc_fiche_t"))}</h3><button type="button" class="mm-x" id="zc-f-x" aria-label="${esc(t("mm_close"))}" title="${esc(t("mm_close"))}">${IC.x}</button></div>
      <div class="zc-f-id"><span class="zc-av big" style="background:hsl(${hue(j.id)} 70% 72%)">${ini(j.name)}</span><div><div class="zc-f-nm">${esc(j.name)}</div>
        <div class="zc-f-st">${badge(j)}${j.status_at?`<small>${esc(abTr("zc_since",{d:fmtDate(j.status_at)}))}</small>`:""}</div></div></div>
      <div class="zc-f-acts">${j.account_id?`<button type="button" class="btn btn-g" id="zc-f-w">${IC.msg} ${esc(t("zc_write"))}</button>`:""}
        <button type="button" class="btn btn-o" id="zc-f-s">${esc(t(p?"zc_to_client":"zc_to_prospect"))}</button></div>
      ${j.messages&&j.messages.messages?`<div class="zc-f-msgs">${esc(abTr(j.messages.messages>1?"zc_wrote_n":"zc_wrote_1",{d:fmtDate(j.messages.last_at),n:j.messages.messages}))}</div>`:""}
      <div class="zc-f-card"><div class="mm-t">${esc(t("zc_journey"))}</div>${steps?`<ol class="zc-steps">${steps}</ol>`:`<div class="zc-empty" style="padding:6px 0 12px">${esc(t("zc_journey_none"))}</div>`}</div>
      <div class="zc-f-hint">${esc(t("zc_rule"))}</div></div>`;
    document.body.appendChild(ov);
    const close=()=>ov.remove();
    ov.addEventListener("click",e=>{if(e.target===ov)close();});
    ov.querySelector("#zc-f-x").addEventListener("click",close);
    ov.querySelector("#zc-f-w")?.addEventListener("click",()=>zcWrite(j.account_id,j.name));
    ov.querySelector("#zc-f-s").addEventListener("click",async ev=>{
      ev.currentTarget.disabled=true;
      try{await api("PATCH",`/clients/${encodeURIComponent(id)}/status`,{status:p?"client":"prospect"});showToast(t(p?"zc_now_client":"zc_now_prospect"));close();
        if(document.getElementById("page-clients")?.classList.contains("active"))loadClients(false);}
      catch(e){ev.currentTarget.disabled=false;showToast(e.message,"error");}
    });
  };
  function fmtDateTimeSafe(v){
    try{const d=parseServerDate(v);return `${fmtDate(v)} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;}catch(_){return fmtDate(v);}
  }
})();
