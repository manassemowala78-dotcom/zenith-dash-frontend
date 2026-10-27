// ── 9.8.0 · Messagerie : nouvelle présentation, fiche du contact, photos rapides, plein écran sur téléphone ──
const MV={cards:new Map(),panel:true,conv:null};
try{MV.panel=localStorage.getItem("zd_mv_panel")!=="0";}catch(_){}
function mvWide(){return window.innerWidth>=1180;}
function mvNarrow(){return window.innerWidth<=768;}
function mvConv(id){return (typeof _conversations!=="undefined"&&_conversations||[]).find(c=>c.id===id)||null;}

// ── Libellés des boutons ──
function mvLabels(){
  const L=[["mv-search-tg","mv_search"],["mv-new","mv_new"],["mv-panel-tg","mv_panel"],["mv-more-btn","mv_more"],["extra-features-btn","mv_attach"],["mic-btn","mv_voice"],["mv-send","mv_send"]];
  L.forEach(([id,k])=>{const e=document.getElementById(id);if(e){e.setAttribute("aria-label",t(k));e.title=t(k);}});
  const b=document.querySelector(".msg-back-btn");if(b)b.setAttribute("aria-label",t("mv_back"));
  const h=document.getElementById("mv-h");if(h)h.textContent=t("mv_title");
  document.querySelectorAll(".sidebar .nav-i").forEach(n=>{if(!n.title){const s=n.querySelector("span");if(s)n.title=s.textContent.trim();}});
}

// ── Recherche (téléphone : derrière la loupe) ──
function mvToggleSearch(force){
  const p=document.querySelector(".msg-conv-panel");if(!p)return;
  const on=force!=null?force:!p.classList.contains("search-on");
  p.classList.toggle("search-on",on);
  const i=document.getElementById("global-search-input");
  if(on){setTimeout(()=>i&&i.focus(),30);}
  else if(i&&i.value){i.value="";try{globalSearch();}catch(_){}}
}

// ── Zone de saisie : micro quand c'est vide, flèche d'envoi quand il y a du texte ──
function mvComposerState(){
  const i=document.getElementById("chat-input"),send=document.getElementById("mv-send"),mic=document.getElementById("mic-btn");
  if(!i||!send||!mic)return;
  const has=!!i.value.trim();
  send.hidden=!has;mic.hidden=has;
}
if(typeof sendChatMessage==="function"){
  const _mvSCM=sendChatMessage;
  sendChatMessage=function(){const r=_mvSCM.apply(this,arguments);mvComposerState();return r;};
}

// ── Onglets : Tout · Non lus · Clients · Équipe · Groupes · Vus sans réponse · Demandes ──
if(typeof ZD_CONV_FILTERS==="object"){
  if(!ZD_CONV_FILTERS.some(f=>f[0]==="clients"))ZD_CONV_FILTERS.push(["clients","mv_f_clients"],["team","mv_f_team"]);
  const order=["all","unread","clients","team","groups","seen","requests"];
  const sorted=[...ZD_CONV_FILTERS].sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0]));
  ZD_CONV_FILTERS.splice(0,ZD_CONV_FILTERS.length,...sorted);
}
if(typeof zdConvMatch==="function"){
  const _mvM=zdConvMatch;
  zdConvMatch=function(c,f){
    if(f==="clients")return c.relation==="client"&&c.request!=="pending";
    if(f==="team")return c.relation==="team"&&c.request!=="pending";
    return _mvM(c,f);
  };
}
if(typeof zdConvEmptyText==="function"){
  const _mvE=zdConvEmptyText;
  zdConvEmptyText=function(){if(_zdConvFilter==="clients")return t("mv_e_clients");if(_zdConvFilter==="team")return t("mv_e_team");return _mvE.apply(this,arguments);};
}
if(typeof zdRenderConvFilters==="function"){
  const _mvR=zdRenderConvFilters;
  zdRenderConvFilters=function(){
    ["clients","team"].forEach(k=>{if(_zdConvFilter===k&&!_conversations.some(c=>zdConvMatch(c,k)))_zdConvFilter="all";});
    _mvR.apply(this,arguments);
    ["clients","team"].forEach(k=>{
      if(_conversations.some(c=>zdConvMatch(c,k)))return;
      document.querySelector(`#conv-filters [onclick*="'${k}'"]`)?.remove();
    });
    const on=document.querySelector("#conv-filters button.on");
    if(on&&on.scrollIntoView&&on.parentElement.scrollWidth>on.parentElement.clientWidth){try{on.scrollIntoView({block:"nearest",inline:"nearest"});}catch(_){}}
  };
}

// ── En-tête de la discussion, bandeau « client », fiche du contact ──
function mvRelLabel(rel){return rel&&ZD_REL[rel]?t(ZD_REL[rel]):"";}
function mvHeaderTag(conv){
  const el=document.getElementById("mv-chead-tag");if(!el)return;
  const rel=conv&&conv.relation&&conv.relation!=="group"?conv.relation:null;
  el.className="mv-sub-tag"+(rel?" r-"+rel:"");
  el.textContent=rel?mvRelLabel(rel):"";
}
async function mvLoadCard(convId,force){
  const hit=MV.cards.get(convId);
  if(hit&&!force&&Date.now()-hit.at<30000)return hit.data;
  try{const d=await api("GET",`/messaging/conversations/${convId}/card`);MV.cards.set(convId,{at:Date.now(),data:d});return d;}
  catch(_){return hit?hit.data:null;}
}
function mvCanBill(cl){if(!cl||!State.tenant)return false;if(typeof zdIsClientAcc==="function"&&zdIsClientAcc())return false;return cl.biz_id===State.tenant.id;}
function mvInvCount(n){return n===1?t("mv_inv_1"):abTr("mv_inv_n",{n});}
function mvBizStrip(convId,card){
  const el=document.getElementById("mv-biz");if(!el)return;
  const cl=card&&card.client;
  if(!cl||convId!==_currentConvId){el.hidden=true;el.innerHTML="";return;}
  const owes=cl.owed_usd>0.005;
  const can=mvCanBill(cl);
  el.innerHTML=`<span class="mv-biz-a${owes?" due":" ok"}">${esc(owes?abTr("mv_owes",{a:fmtUSD(cl.owed_usd)}):t("mv_uptodate"))}</span>
    <span class="mv-biz-n">· ${esc(owes?abTr("mv_open_n",{n:cl.open_count}):mvInvCount(cl.invoices))}</span>
    ${can?`<span class="mv-biz-b"><button type="button" class="mv-chip" onclick="mvNewInvoice()"><i class="ti ti-file-invoice" aria-hidden="true"></i> ${esc(t("mv_btn_invoice"))}</button>${owes?`<button type="button" class="mv-chip" onclick="mvRemind()"><i class="ti ti-bell-ringing" aria-hidden="true"></i> ${esc(t("mv_btn_remind"))}</button>`:""}</span>`:""}`;
  el.hidden=false;
}
function mvFmtDate(iso,opt){if(!iso)return "";try{return parseServerDate(iso).toLocaleDateString(zdLocale(),opt||{day:"2-digit",month:"2-digit",year:"numeric"});}catch(_){return "";}}
function mvPanelEl(){
  let p=document.getElementById("mv-panel");
  if(!p){const lay=document.getElementById("msg-layout");if(!lay)return null;p=document.createElement("aside");p.id="mv-panel";p.className="mv-panel";p.setAttribute("aria-label",t("mv_panel"));lay.appendChild(p);}
  return p;
}
function mvPanelVisible(){return mvWide()&&MV.panel&&!!_currentConvId;}
function mvSyncPanel(){
  const lay=document.getElementById("msg-layout");if(!lay)return;
  const on=mvPanelVisible();
  lay.classList.toggle("panel-open",on);
  const tg=document.getElementById("mv-panel-tg");if(tg){tg.classList.toggle("on",on);tg.setAttribute("aria-pressed",on?"true":"false");}
}
function mvTogglePanel(){
  MV.panel=!MV.panel;try{localStorage.setItem("zd_mv_panel",MV.panel?"1":"0");}catch(_){}
  mvSyncPanel();if(MV.panel&&_currentConvId)mvRenderPanel(_currentConvId,(MV.cards.get(_currentConvId)||{}).data);
}
function mvRenderPanel(convId,card){
  const p=mvPanelEl();if(!p)return;
  mvSyncPanel();
  if(convId!==_currentConvId)return;
  const conv=mvConv(convId)||{};
  const links=`<div class="mvp-links">
      <button type="button" onclick="openMediaGallery()"><i class="ti ti-photo" aria-hidden="true"></i> ${esc(t("mv_files"))}</button>
      <button type="button" onclick="openCurrentChatInfo()"><i class="ti ti-info-circle" aria-hidden="true"></i> ${esc(t(conv.is_group?"mv_group_info":"mv_info"))}</button>
      ${typeof nfConvModal==="function"?`<button type="button" onclick="nfConvModal()"><i class="ti ti-bell" aria-hidden="true"></i> ${esc(t("nf_conv_t"))}</button>`:""}
    </div>`;
  if(conv.is_group||(card&&card.relation==="group")){
    const g=(card&&card.group)||{};
    p.innerHTML=`<div class="mvp-id">${zdGroupAv(72)}<b>${esc(conv.name||g.name||"")}</b><span>${esc(g.members?abTr("mv_members",{n:g.members}):t("mv_rel_group"))}</span></div>${links}`;
    return;
  }
  const o=(card&&card.other)||{};
  const rel=(card&&card.relation)||conv.relation;
  const name=conv.name||o.name||"";
  const status=conv.other_online?`<span class="mv-online">${esc(t("online_status"))}</span>`:(conv.other_last_seen?esc(fmtLastSeen(conv.other_last_seen)):"");
  const head=`<div class="mvp-id">${avatarHtml(conv.other_avatar_url||o.avatar_url,name,72,conv.other_tenant_id||o.id)}<b>${esc(name)}</b>
    <span>${rel?`<span class="mv-sub-tag r-${rel}">${esc(mvRelLabel(rel))}</span>`:""}${o.company&&o.company!==name?`${rel?" · ":""}${esc(o.company)}`:""}</span>${status?`<span class="mvp-st">${status}</span>`:""}</div>`;
  const cl=card&&card.client;
  if(!cl){p.innerHTML=head+links;return;}
  const can=mvCanBill(cl);
  const open=(cl.open||[]).map(i=>`<div class="mvp-inv${i.overdue?" late":""}"><span>${esc(i.number)}</span><span>${esc(fmtUSD(i.remaining,i.currency))}${i.due_date?` · ${esc(i.overdue?t("mv_late"):mvFmtDate(i.due_date,{day:"2-digit",month:"2-digit"}))}`:""}</span></div>`).join("");
  const paid=(cl.paid_recent||[]).slice(0,2).map(i=>`<div class="mvp-inv paid"><span>${esc(i.number)}</span><span>${esc(t("mv_paid"))}</span></div>`).join("");
  p.innerHTML=head+`
    <div class="mvp-since">${esc(abTr("mv_client_since",{d:mvFmtDate(cl.since,{month:"long",year:"numeric"})}))} · ${esc(mvInvCount(cl.invoices))}${cl.biz_name&&!can?` · ${esc(cl.biz_name)}`:""}</div>
    <div class="mvp-stats"><div><span>${esc(t("mv_owed"))}</span><b class="${cl.owed_usd>0.005?"due":""}">${esc(fmtUSD(cl.owed_usd))}</b></div><div><span>${esc(abTr("mv_paid_year",{y:cl.year}))}</span><b>${esc(fmtUSD(cl.paid_year_usd))}</b></div></div>
    <div class="mvp-k">${esc(t("mv_open_invoices"))}</div>
    <div class="mvp-list">${open||`<div class="mvp-none">${esc(t("mv_none_open"))}</div>`}${paid}</div>
    ${cl.last_paid_at?`<div class="mvp-last"><i class="ti ti-circle-check" aria-hidden="true"></i> ${esc(abTr("mv_last_paid",{d:mvFmtDate(cl.last_paid_at)}))}</div>`:""}
    ${can?`<div class="mvp-acts"><button type="button" class="btn mv-btn-p" onclick="mvNewInvoice()"><i class="ti ti-file-invoice" aria-hidden="true"></i> ${esc(t("mv_new_invoice"))}</button>
      ${cl.owed_usd>0.005?`<button type="button" class="btn mv-btn-o" onclick="mvRemind()"><i class="ti ti-bell-ringing" aria-hidden="true"></i> ${esc(t("mv_send_remind"))}</button>`:""}</div>`:`<div class="mvp-none">${esc(abTr("mv_other_biz",{b:cl.biz_name||""}))}</div>`}
    ${links}`;
}
async function mvAfterOpen(convId){
  const conv=mvConv(convId);
  mvHeaderTag(conv);
  mvComposerState();
  mvSyncPanel();
  const cached=(MV.cards.get(convId)||{}).data;
  mvBizStrip(convId,cached);
  if(mvPanelVisible())mvRenderPanel(convId,cached);
  const card=await mvLoadCard(convId);
  if(convId!==_currentConvId)return;
  if(card&&conv&&card.relation!==undefined&&!conv.relation&&card.relation){conv.relation=card.relation;mvHeaderTag(conv);}
  mvBizStrip(convId,card);
  if(mvPanelVisible())mvRenderPanel(convId,card);
}
if(typeof openConversation==="function"){
  const _mvOC=openConversation;
  openConversation=async function(convId){
    document.getElementById("mv-biz")?.setAttribute("hidden","");
    const r=await _mvOC.apply(this,arguments);
    try{mvAfterOpen(convId);}catch(_){}
    return r;
  };
}
if(typeof backToConvList==="function"){
  const _mvBack=backToConvList;
  backToConvList=function(){const r=_mvBack.apply(this,arguments);mvSyncPanel();return r;};
}
if(typeof updateMuteArchiveIcons==="function"){
  const _mvUMA=updateMuteArchiveIcons;
  updateMuteArchiveIcons=function(){
    const r=_mvUMA.apply(this,arguments);
    const c=mvConv(_currentConvId),l=document.getElementById("mv-mute-l");if(l)l.textContent=t(c&&c.muted?"unmute_action":"mute_action");
    return r;
  };
}
if(typeof renderConvList==="function"){
  const _mvRCL=renderConvList;
  renderConvList=function(){
    const r=_mvRCL.apply(this,arguments);
    if(_currentConvId){const c=mvConv(_currentConvId);if(c)mvHeaderTag(c);}
    return r;
  };
}

// ── Actions du bandeau client ──
async function mvNewInvoice(){
  const card=(MV.cards.get(_currentConvId)||{}).data,cl=card&&card.client;if(!cl)return;
  navigate("invoices");
  try{await openInvModal();}catch(_){}
  const t0=Date.now();
  const pick=()=>{const s=document.getElementById("inv-client");if(s&&[...s.options].some(o=>o.value===cl.id)){s.value=cl.id;s.dispatchEvent(new Event("change",{bubbles:true}));return;}
    if(Date.now()-t0<4000)setTimeout(pick,150);};
  pick();
}
async function mvRemind(){
  const convId=_currentConvId;
  const card=await mvLoadCard(convId,true),cl=card&&card.client;
  if(!cl||!(cl.owed_usd>0.005)||convId!==_currentConvId)return;
  let link="";
  try{const r=await api("POST",`/clients/${cl.id}/portal-link`);const tok=r.token||r.portal_token;if(tok)link=`${location.origin}${location.pathname}?portal=${encodeURIComponent(tok)}`;}catch(_){}
  const first=(mvConv(convId)?.name||cl.name||"").trim().split(/\s+/)[0];
  const open=cl.open||[];
  let txt;
  if(open.length===1){const i=open[0];txt=abTr(i.due_date?"mv_remind_1":"mv_remind_1b",{n:first,f:i.number,a:fmtUSD(i.remaining,i.currency),d:mvFmtDate(i.due_date)});}
  else txt=abTr("mv_remind_n",{n:first,k:cl.open_count,a:fmtUSD(cl.owed_usd)});
  if(link)txt+=" "+abTr("mv_remind_link",{l:link});
  const inp=document.getElementById("chat-input");if(!inp)return;
  inp.value=txt;mvComposerState();inp.focus();try{inp.setSelectionRange(txt.length,txt.length);}catch(_){}
  showToast(t("mv_remind_ready"),"info");
}

// ── Photos : plusieurs à la fois, aperçu plein écran ──
async function mvSendFiles(files){
  const list=[...(files||[])].slice(0,10);
  for(const f of list){await sendFileMessage(f);}
}
function zdImgBroken(img){
  const b=img.closest(".mb-img");if(!b)return;
  const src=b.dataset.src||img.src,name=b.dataset.name||t("mv_photo_short");
  const a=document.createElement("a");a.href=src;a.target="_blank";a.rel="noopener";a.className="mb-card";
  a.innerHTML=`<span class="mb-card-ic"><i class="ti ti-photo" aria-hidden="true"></i></span><span class="mb-card-tx"><b>${esc(name)}</b><span>${esc(t("mv_open_file"))}</span></span>`;
  b.closest(".mb")?.classList.remove("media");b.replaceWith(a);
}
function mvImgLoaded(img){
  const box=document.getElementById("chat-messages");if(!box)return;
  if(box.scrollHeight-box.scrollTop-box.clientHeight<img.clientHeight+260)box.scrollTop=box.scrollHeight;
}
function mvViewImage(btn){
  const img=btn.querySelector("img");const src=img&&img.currentSrc||btn.dataset.src;const remote=btn.dataset.src||src;if(!src)return;
  let ov=document.getElementById("mv-viewer");
  if(!ov){ov=document.createElement("div");ov.id="mv-viewer";ov.className="mv-viewer";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");document.body.appendChild(ov);
    ov.addEventListener("click",e=>{if(e.target===ov||e.target.classList.contains("mv-vw-stage"))mvCloseViewer();});}
  ov.innerHTML=`<div class="mv-vw-top"><a class="mv-vw-b" href="${esc(remote)}" target="_blank" rel="noopener" download aria-label="${esc(t("mv_download"))}" title="${esc(t("mv_download"))}"><i class="ti ti-download" aria-hidden="true"></i></a>
    <button type="button" class="mv-vw-b" onclick="mvCloseViewer()" aria-label="${esc(t("btn_close"))}" title="${esc(t("btn_close"))}"><i class="ti ti-x" aria-hidden="true"></i></button></div>
    <div class="mv-vw-stage"><img src="${esc(src)}" alt=""></div>`;
  ov.style.display="flex";
  try{history.pushState({...(history.state||{}),mvViewer:1},"");}catch(_){}
  ov.querySelector(".mv-vw-b:last-child")?.focus();
}
function mvCloseViewer(fromPop){
  const ov=document.getElementById("mv-viewer");if(!ov||ov.style.display==="none")return;
  ov.style.display="none";ov.innerHTML="";
  if(!fromPop&&history.state&&history.state.mvViewer){try{history.back();}catch(_){}}
}
window.addEventListener("popstate",()=>mvCloseViewer(true));
document.addEventListener("keydown",e=>{if(e.key==="Escape")mvCloseViewer();});

// ── Coller ou glisser une photo dans la discussion ──
document.addEventListener("paste",e=>{
  if(!_currentConvId||!document.querySelector("#page-messaging.active"))return;
  const files=[...(e.clipboardData&&e.clipboardData.files||[])].filter(f=>/^image\//.test(f.type));
  if(files.length){e.preventDefault();mvSendFiles(files);}
});
(function mvDrop(){
  const zone=()=>document.querySelector("#chat-active");
  document.addEventListener("dragover",e=>{const z=zone();if(z&&_currentConvId&&z.contains(e.target)&&e.dataTransfer&&[...e.dataTransfer.types].includes("Files")){e.preventDefault();z.classList.add("mv-drop");}});
  document.addEventListener("dragleave",e=>{const z=zone();if(z&&!z.contains(e.relatedTarget))z.classList.remove("mv-drop");});
  document.addEventListener("drop",e=>{const z=zone();if(z)z.classList.remove("mv-drop");if(z&&_currentConvId&&z.contains(e.target)&&e.dataTransfer&&e.dataTransfer.files.length){e.preventDefault();mvSendFiles(e.dataTransfer.files);}});
})();

// ── Menu latéral réduit à des icônes pendant la messagerie (PC) ──
function mvRail(page){
  const lay=document.querySelector(".layout");if(!lay)return;
  lay.classList.toggle("mv-rail",page==="messaging"&&!mvNarrow());
}
if(typeof navigate==="function"){
  const _mvNav=navigate;
  navigate=function(page){
    const r=_mvNav.apply(this,arguments);
    try{const cur=(document.querySelector(".page.active")?.id||"").replace("page-","");mvRail(cur);applyMobileMessagingLayout();mvSyncPanel();}catch(_){}
    return r;
  };
}
window.addEventListener("resize",()=>{
  const cur=(document.querySelector(".page.active")?.id||"").replace("page-","");
  mvRail(cur);mvSyncPanel();
  if(mvPanelVisible()&&_currentConvId)mvRenderPanel(_currentConvId,(MV.cards.get(_currentConvId)||{}).data);
});
document.addEventListener("click",e=>{if(!e.target.closest("#chat-messages .mb"))document.querySelectorAll("#chat-messages .mb.acts-on").forEach(x=>x.classList.remove("acts-on"));});
(function mvInit(n){
  if(typeof t!=="function"||!window.ZD_I18N||!window.ZD_I18N.fr){if((n||0)<80)setTimeout(()=>mvInit((n||0)+1),100);return;}
  mvLabels();mvComposerState();
  const cur=(document.querySelector(".page.active")?.id||"").replace("page-","");mvRail(cur);
})();
