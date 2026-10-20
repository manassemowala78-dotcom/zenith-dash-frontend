// ── 9.5.0 · Contacter sans devenir membre : annuaire, demandes de message, qui peut me trouver ──
[typeof ZD_CLIENT_PAGES==="object"&&ZD_CLIENT_PAGES,typeof RESTRICTED_ALLOWED_PAGES==="object"&&RESTRICTED_ALLOWED_PAGES,typeof ES_FREE_PAGES==="object"&&ES_FREE_PAGES]
  .forEach(a=>{if(a&&!a.includes("directory"))a.push("directory");});
const DIR_SECTORS=["school","hotel","restaurant","bar","beauty","retail","pharmacy","cold","embassy","pme"];
const _dir={q:"",sector:"",city:"",list:null,open:null,busy:false};
function dirInitials(n){return String(n||"?").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();}
function dirAvatar(d,big){const m=(typeof SECTOR_META==="object"&&SECTOR_META[d.sectors?.[0]?.key])||{color:"#4f7aff"};
  return d.logo_url?`<img class="dir-av${big?" big":""}" src="${esc(d.logo_url)}" alt="">`:`<span class="dir-av${big?" big":""}" style="--c:${m.color}" aria-hidden="true">${esc(dirInitials(d.name))}</span>`;}
function dirSub(d){return [d.sectors.map(s=>sectorLabel(s.key)).join(" · "),d.city].filter(Boolean).join(" · ");}
function dirEl(){const el=ensureSectorPage("directory");document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x===el));return el;}
V93_PAGES.directory=async function(){_dir.open=null;dirRender();await dirSearch();};
function dirRender(){
  const el=dirEl();
  if(_dir.open)return dirRenderPage(el);
  el.innerHTML=`<div class="sh"><div><div class="st"><i class="ti ti-building-community" aria-hidden="true"></i> ${esc(t("dir_title"))}</div><div class="ss">${esc(t("dir_sub"))}</div></div></div>
    <div class="dir-wrap"><div class="card dir-search">
      <div class="dir-in"><i class="ti ti-search" aria-hidden="true"></i><input class="inp" id="dir-q" value="${esc(_dir.q)}" placeholder="${esc(t("dir_q_ph"))}" aria-label="${esc(t("dir_q_ph"))}" oninput="_dir.q=this.value;dirSearchSoon()"></div>
      <div class="dir-chips" role="group" aria-label="${esc(t("dir_sector"))}"><button type="button" class="dir-chip${!_dir.sector?" on":""}" aria-pressed="${!_dir.sector}" onclick="_dir.sector='';dirRender();dirSearch()">${esc(t("dir_all"))}</button>${DIR_SECTORS.map(s=>`<button type="button" class="dir-chip${_dir.sector===s?" on":""}" aria-pressed="${_dir.sector===s}" onclick="_dir.sector='${s}';dirRender();dirSearch()">${esc(sectorLabel(s))}</button>`).join("")}</div>
      <div class="dir-in sm"><i class="ti ti-map-pin" aria-hidden="true"></i><input class="inp" id="dir-city" value="${esc(_dir.city)}" placeholder="${esc(t("dir_city_ph"))}" aria-label="${esc(t("dir_city_ph"))}" oninput="_dir.city=this.value;dirSearchSoon()"></div></div>
      <div id="dir-results" class="dir-results" aria-live="polite">${dirResultsHtml()}</div>
      <div class="dir-info"><i class="ti ti-info-circle" aria-hidden="true"></i><span>${esc(t("dir_no_people"))}</span></div></div>`;
}
function dirResultsHtml(){
  if(_dir.list===null)return `<div class="dir-empty">${esc(t("loading"))}</div>`;
  if(!_dir.list.length)return `<div class="dir-empty"><i class="ti ti-building" aria-hidden="true"></i><div>${esc(t("dir_none"))}</div></div>`;
  return _dir.list.map(d=>`<div class="card dir-res"><div class="dir-row">${dirAvatar(d)}<div class="dir-txt"><b>${esc(d.name)}</b><div class="dir-sm">${esc(dirSub(d))}</div></div><button type="button" class="btn btn-o btn-sm" onclick="dirOpen('${d.id}')">${esc(t("dir_view"))}</button></div></div>`).join("");
}
let _dirT=null;
function dirSearchSoon(){clearTimeout(_dirT);_dirT=setTimeout(dirSearch,350);}
async function dirSearch(){
  const qs=new URLSearchParams();if(_dir.q.trim())qs.set("q",_dir.q.trim());if(_dir.sector)qs.set("sector",_dir.sector);if(_dir.city.trim())qs.set("city",_dir.city.trim());
  try{_dir.list=await api("GET","/directory"+(qs.toString()?"?"+qs:""));}catch(e){_dir.list=[];showToast(e.message,"error");}
  const box=document.getElementById("dir-results");if(box)box.innerHTML=dirResultsHtml();
}
async function dirOpen(id){
  try{_dir.open=await api("GET","/directory/"+id);dirRender();window.scrollTo(0,0);}catch(e){showToast(e.message,"error");}
}
function dirRenderPage(el){
  const d=_dir.open;
  el.innerHTML=`<div class="sh"><div><button type="button" class="btn btn-o btn-sm" onclick="_dir.open=null;dirRender()"><i class="ti ti-arrow-left" aria-hidden="true"></i> ${esc(t("dir_back"))}</button></div></div>
    <div class="dir-wrap"><div class="card dir-page"><div class="dir-row">${dirAvatar(d,true)}<div class="dir-txt"><h2 class="dir-h">${esc(d.name)}</h2><div class="dir-sm">${esc(dirSub(d))}</div></div></div>
      ${d.about?`<p class="dir-about">${esc(d.about)}</p>`:""}</div>
    ${d.is_me?`<div class="dir-info"><i class="ti ti-info-circle" aria-hidden="true"></i><span>${esc(t("dir_is_me"))}</span></div>`:
     `<button type="button" class="btn btn-g dir-contact" onclick="dirContact('${d.id}')"><i class="ti ti-message-circle" aria-hidden="true"></i> ${esc(d.conversation_id?t("dir_continue"):abTr("dir_contact",{n:d.name}))}</button>
      <div class="dir-info"><i class="ti ti-info-circle" aria-hidden="true"></i><span>${esc(t("dir_contact_x"))}</span></div>
      <div class="card dir-join"><b>${esc(t("dir_join_t"))}</b><div class="dir-sm">${esc(t("dir_join_x"))}</div>
        <button type="button" class="btn btn-o" onclick="dirJoin()"><i class="ti ti-key" aria-hidden="true"></i> ${esc(t("dir_join_btn"))}</button></div>`}</div>`;
}
function dirJoin(){navigate("spaces");setTimeout(()=>{const e=document.getElementById("es-code");if(e){e.scrollIntoView({block:"center"});e.focus();}},700);}
async function dirContact(id){
  try{const r=await api("POST",`/directory/${id}/contact`);navigate("messaging");setTimeout(async()=>{try{await loadConversations();openConversation(r.id,r.name);}catch(_){}},400);}
  catch(e){showToast(e.message,"error");}
}

// ── Messagerie : demandes de message ──
if(typeof ZD_CONV_FILTERS==="object"&&!ZD_CONV_FILTERS.some(f=>f[0]==="requests"))ZD_CONV_FILTERS.push(["requests","msg_f_requests"]);
if(typeof zdConvMatch==="function"){
  const _m=zdConvMatch;
  zdConvMatch=function(c,f){if(f==="requests")return c.request==="pending";if(c.request==="pending")return false;return _m(c,f);};
}
if(typeof zdRenderConvFilters==="function"){
  const _r=zdRenderConvFilters;
  zdRenderConvFilters=function(){
    if(_zdConvFilter==="requests"&&!_conversations.some(c=>c.request==="pending"))_zdConvFilter="all";
    _r.apply(this,arguments);
    const n=_conversations.filter(c=>c.request==="pending").length;
    const b=document.querySelector('#conv-filters [onclick*="\'requests\'"]');if(b){if(n)b.classList.add("cf-req");else b.remove();}
  };
}
if(typeof renderConvList==="function"){
  const _rl=renderConvList;
  renderConvList=function(){
    _rl.apply(this,arguments);
    (_conversations||[]).forEach(c=>{
      const tag=c.request==="pending"?["msg_req_tag","req"]:c.declined?["msg_declined_tag","off"]:c.awaiting?["msg_awaiting_tag","wait"]:null;if(!tag)return;
      const row=document.querySelector(`#conv-list [onclick^="openConversation('${c.id}'"]`);const b=row&&row.querySelector("b");
      if(b&&!row.querySelector(".msg-rq"))b.insertAdjacentHTML("afterend",` <span class="msg-rq ${tag[1]}">${esc(t(tag[0]))}</span>`);
    });
    const box=document.getElementById("conv-list");
    if(box&&!document.getElementById("dir-entry")){box.insertAdjacentHTML("beforebegin",`<button type="button" id="dir-entry" class="dir-entry" onclick="navigate('directory')"><i class="ti ti-building-community" aria-hidden="true"></i> ${esc(t("dir_title"))}</button>`);}
  };
}
if(typeof openConversation==="function"){
  const _oc=openConversation;
  openConversation=async function(convId,name){
    const r=await _oc.apply(this,arguments);msgReqBar(convId,name);return r;
  };
}
function msgReqBar(convId,name){
  const c=(_conversations||[]).find(x=>x.id===convId);const row=document.getElementById("chat-input-row");if(!row)return;
  let bar=document.getElementById("msg-req-bar");
  if(!c||!(c.request==="pending"||c.awaiting||c.declined)){if(bar)bar.remove();return;}
  if(!bar){bar=document.createElement("div");bar.id="msg-req-bar";row.parentNode.insertBefore(bar,row);}
  if(c.request==="pending"){
    row.style.display="none";bar.className="msg-req-bar req";
    bar.innerHTML=`<div class="msg-req-k">${esc(t("msg_req_k"))}</div><div class="msg-req-x">${esc(abTr("msg_req_x",{n:name||c.name}))}</div>
      <div class="msg-req-acts"><button type="button" class="btn btn-o btn-sm" onclick="msgReqRefuse('${convId}')">${esc(t("msg_req_refuse"))}</button><button type="button" class="btn btn-o btn-sm msg-req-block" onclick="msgReqBlock('${convId}')">${esc(t("msg_req_block"))}</button><button type="button" class="btn btn-g btn-sm" onclick="msgReqAccept('${convId}')">${esc(t("msg_req_accept"))}</button></div>`;
  }else if(c.declined){
    row.style.display="none";bar.className="msg-req-bar off";bar.innerHTML=`<div class="msg-req-x">${esc(t("msg_declined_x"))}</div>`;
  }else{
    bar.className="msg-req-bar wait";bar.innerHTML=`<div class="msg-req-x"><i class="ti ti-clock" aria-hidden="true"></i> ${esc(abTr("msg_awaiting_x",{n:name||c.name}))}</div>`;
  }
}
async function msgReqAccept(id){try{await api("POST",`/messaging/conversations/${id}/accept`);await loadConversations();const c=_conversations.find(x=>x.id===id);document.getElementById("chat-input-row").style.display="flex";openConversation(id,c?.name);}catch(e){showToast(e.message,"error");}}
async function msgReqRefuse(id){if(!confirm(t("msg_req_refuse_q")))return;try{await api("POST",`/messaging/conversations/${id}/refuse`);showToast(t("msg_req_refused"));await loadConversations();if(typeof backToConvList==="function")backToConvList();document.getElementById("chat-active").style.display="none";document.getElementById("chat-empty-state").style.display="";}catch(e){showToast(e.message,"error");}}
async function msgReqBlock(id){
  const c=_conversations.find(x=>x.id===id);if(!c||!confirm(abTr("msg_req_block_q",{n:c.name})))return;
  try{if(c.other_tenant_id)await api("POST","/messaging/block",{tenant_id:c.other_tenant_id});await api("POST",`/messaging/conversations/${id}/refuse`);showToast(t("msg_req_blocked"));await loadConversations();if(typeof backToConvList==="function")backToConvList();document.getElementById("chat-active").style.display="none";document.getElementById("chat-empty-state").style.display="";}catch(e){showToast(e.message,"error");}
}
if(typeof startConversationWith==="function"){
  const _sw=startConversationWith;
  startConversationWith=async function(userId,name){
    const r=await _sw.apply(this,arguments);
    const c=(_conversations||[]).find(x=>x.other_tenant_id===userId&&!x.is_group);if(c&&c.awaiting)showToast(abTr("msg_req_sent",{n:name}));
    return r;
  };
}
if(typeof searchUsers==="function"){
  const _su=searchUsers;
  searchUsers=async function(){
    await _su.apply(this,arguments);
    const box=document.getElementById("user-search-results");if(!box)return;
    if(!box.querySelector("[onclick]")&&document.getElementById("user-search-input")?.value.trim().length>=2&&!box.querySelector(".msg-find-x"))
      box.insertAdjacentHTML("beforeend",`<div class="msg-find-x">${esc(t("msg_find_x"))}</div>`);
    if(!box.querySelector(".msg-dir-link"))box.insertAdjacentHTML("beforeend",`<button type="button" class="msg-dir-link" onclick="closeNewConvModal();navigate('directory')"><i class="ti ti-building-community" aria-hidden="true"></i> ${esc(t("msg_dir_link"))}</button>`);
  };
}

// ── Qui peut me trouver, qui peut m'écrire, fiche d'annuaire ──
let _ctSet=null;
if(typeof loadPrivacyCard==="function"){
  const _lp=loadPrivacyCard;
  loadPrivacyCard=async function(){
    await _lp.apply(this,arguments);
    const box=document.getElementById("privacy-box");if(!box)return;
    try{_ctSet=await api("GET","/profile/contact-settings");}catch(_){return;}
    let x=document.getElementById("ct-box");if(!x){x=document.createElement("div");x.id="ct-box";box.after(x);}
    ctRender();
  };
}
function ctRender(){
  const x=document.getElementById("ct-box");if(!x||!_ctSet)return;const s=_ctSet;
  const dis=s.can_edit===false?"disabled":"";
  const radio=(name,val,label)=>`<label class="ct-opt"><input type="radio" name="${name}" value="${val}" ${s[name]===val?"checked":""} ${dis} onchange="ctSave({${name}:'${val}'})"> <span>${esc(t(label))}</span></label>`;
  x.innerHTML=`<fieldset class="ct-group"><legend>${esc(t("ct_find_t"))}</legend>${radio("findable","name","ct_find_name")}${radio("findable","exact","ct_find_exact")}${radio("findable","nobody","ct_find_nobody")}</fieldset>
    <fieldset class="ct-group"><legend>${esc(t("ct_dm_t"))}</legend>${radio("dm","contacts","ct_dm_contacts")}${radio("dm","everyone","ct_dm_everyone")}<div class="ct-hint">${esc(t("ct_dm_x"))}</div></fieldset>
    ${s.can_list?`<fieldset class="ct-group"><legend>${esc(abTr("ct_dir_t",{n:s.establishment_name||""}))}</legend>
      <label class="priv-row"><span>${esc(t("ct_dir_listed"))}</span><input type="checkbox" id="ct-listed" ${s.listed?"checked":""} onchange="ctSave({listed:this.checked})"></label>
      <div class="fgrp"><label class="fl" for="ct-city">${esc(t("ct_dir_city"))}</label><input class="inp" id="ct-city" maxlength="80" value="${esc(s.city||"")}" placeholder="${esc(t("dir_city_ph"))}"></div>
      <div class="fgrp"><label class="fl" for="ct-about">${esc(t("ct_dir_about"))}</label><textarea class="inp" id="ct-about" rows="3" maxlength="500" placeholder="${esc(t("ct_dir_about_ph"))}">${esc(s.about||"")}</textarea></div>
      <button type="button" class="btn btn-o btn-sm" onclick="ctSave({city:zdVal('ct-city'),about:zdVal('ct-about')})"><i class="ti ti-device-floppy" aria-hidden="true"></i> ${esc(t("btn_save"))}</button>
      <div class="ct-hint">${esc(t("ct_dir_x"))}</div></fieldset>`:""}`;
}
async function ctSave(b){
  try{_ctSet=await api("PUT","/profile/contact-settings",b);showToast(t("priv_saved"));ctRender();}catch(e){showToast(e.message,"error");ctRender();}
}

// ── Espace client : trouver un établissement ──
if(typeof csRender==="function"){
  const _cr=csRender;
  csRender=function(){
    _cr.apply(this,arguments);
    const el=document.getElementById("page-myspace");if(!el||el.querySelector(".cs-dir"))return;
    const list=el.querySelector(".cs-list");if(list)list.insertAdjacentHTML("afterend",`<button type="button" class="card2 cs-dir" onclick="navigate('directory')"><i class="ti ti-building-community" aria-hidden="true"></i><span><b>${esc(t("dir_title"))}</b><small>${esc(t("cs_dir_x"))}</small></span><i class="ti ti-chevron-right" aria-hidden="true"></i></button>`);
  };
}
