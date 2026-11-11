const PV_ROWS=[["show_email","priv_show_email","pv_email_note"],["show_phone","priv_show_phone"],["show_photo","pv_photo"],["show_country","priv_show_country"],["show_company","priv_show_company"],["show_birthday","priv_show_birthday"],["show_last_seen","priv_show_last_seen","pv_seen_note"],["show_address","priv_show_address"],["show_since","pv_since"]];
let _privacy=null;
function pvSwitch(id,on,label,sub,fn){return `<div class="pv-sw"><span><b>${esc(label)}</b>${sub?`<small>${esc(sub)}</small>`:""}</span><label class="lk-switch"><input type="checkbox" id="${id}"${on?" checked":""} onchange="${fn}(this.checked,this)"><span class="lk-sw" aria-hidden="true"></span><span class="sr-only">${esc(label)}</span></label></div>`;}
async function loadPrivacyCard(){
  const box=document.getElementById("privacy-box");if(!box)return;
  try{_privacy=await api("GET","/profile/privacy");}catch(e){box.innerHTML=`<div style="color:var(--red);font-size:12px">${esc(e.message)}</div>`;return;}
  const lv=_privacy.levels||{};
  const seg=k=>["all","contacts","none"].map(v=>`<label class="pv-opt${lv[k]===v?" on":""}"><input type="radio" name="pv-${k}" value="${v}"${lv[k]===v?" checked":""} onchange="savePrivacyLevel('${k}','${v}',this)"><span>${esc(t("pv_"+v))}</span></label>`).join("");
  box.innerHTML=`<p class="pv-intro">${esc(t("pv_intro"))}</p>`+PV_ROWS.map(([k,l,n])=>`<div class="pv-row" role="radiogroup" aria-label="${esc(t(l))}"><div class="pv-lab"><b>${esc(t(l))}</b>${n?`<small>${esc(t(n))}</small>`:""}</div><div class="pv-seg">${seg(k)}</div></div>`).join("")
    +pvSwitch("pv-find-email",_privacy.find_by_email!==false,t("pv_find_email"),t("pv_find_email_x"),"savePrivacyFlag.bind(null,'find_by_email')")
    +pvSwitch("pv-bday-rem",_privacy.birthday_reminders!==false,t("priv_birthday_reminders"),"","savePrivacyFlag.bind(null,'birthday_reminders')");
}
async function savePrivacyLevel(key,value,el){
  try{_privacy=await api("PUT","/profile/privacy",{[key]:value});showToast(t("priv_saved"));loadPrivacyCard();}
  catch(e){showToast(e.message,"error");loadPrivacyCard();}
}
async function savePrivacyFlag(key,value,el){
  try{_privacy=await api("PUT","/profile/privacy",{[key]:value});showToast(t("priv_saved"));}
  catch(e){if(el)el.checked=!value;showToast(e.message,"error");}
}
function fillProfileBirth(p){
  const e=document.getElementById("prof-birth");if(!e)return;
  e.value=p&&p.birth_date?p.birth_date:"";
  const d=new Date();d.setFullYear(d.getFullYear()-18);e.max=d.toISOString().slice(0,10);
}
function profileBirthValue(){
  const e=document.getElementById("prof-birth");
  return e?(e.value||""):undefined;
}
function ciLang(){return State.lang==="ar"?"ar":State.lang==="sw"?"sw":State.lang==="ln"?"fr":State.lang||"fr";}
function ciBirthdayText(b){
  try{return new Date(2000,b.month-1,b.day).toLocaleDateString(ciLang(),{day:"numeric",month:"long"});}catch(_){return `${b.day}/${b.month}`;}
}
function ciCountryName(code){
  if(!code)return "";
  try{return new Intl.DisplayNames([ciLang()],{type:"region"}).of(code)||code;}catch(_){return code;}
}
function ciMonthYear(iso){
  try{return parseServerDate(iso).toLocaleDateString(ciLang(),{month:"long",year:"numeric"});}catch(_){return "";}
}
function ciRow(icon,label,valueHtml){return `<div class="ci-row"><i class="ti ${icon}"></i><div style="min-width:0"><div class="ci-label">${esc(label)}</div><div class="ci-val">${valueHtml}</div></div></div>`;}
function closeContactInfo(){const m=document.getElementById("modal-contact-info");if(m)m.style.display="none";}
async function openCurrentChatInfo(){
  const conv=(typeof _conversations!=="undefined"?_conversations:[]).find(c=>c.id===_currentConvId);
  if(!conv)return;
  document.getElementById("chat-more-menu").style.display="none";
  if(conv.is_group){openGroupInfo(conv);return;}
  if(conv.other_tenant_id)openContactInfo(conv.other_tenant_id,true);
}
async function openGroupInfo(conv){
  const body=document.getElementById("contact-info-body");
  document.getElementById("modal-contact-info").style.display="flex";
  body.innerHTML=`<div style="text-align:center;color:var(--muted);padding:20px">${t("loading")}</div>`;
  let members=[];
  try{members=await api("GET",`/messaging/conversations/${conv.id}/members`);}catch(e){body.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;return;}
  body.innerHTML=`<div class="ci-head"><div style="width:72px;height:72px;border-radius:50%;background:var(--c2);display:inline-flex;align-items:center;justify-content:center"><i class="ti ti-users-group" style="font-size:34px;color:var(--purple)"></i></div>
      <div class="ci-name">${esc(conv.name)}</div><div class="ci-sub">${t("ci_members_count").replace("{n}",members.length+1)}</div></div>
    <div style="font-weight:700;font-size:13px;margin-bottom:4px">${t("ci_members")}</div>
    ${members.map(m=>`<div class="ci-row" style="cursor:pointer;align-items:center" onclick="openContactInfo('${esc(m.id)}',false)"><div style="flex-shrink:0">${avatarHtml(null,m.name,30)}</div><div class="ci-val" style="flex:1">${esc(m.name)}</div><i class="ti ti-chevron-right"></i></div>`).join("")}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn btn-o btn-sm" onclick="closeContactInfo();openMediaGallery()"><i class="ti ti-photo"></i> ${t("media_gallery_action")}</button></div>`;
}
async function openContactInfo(tenantId,fromCurrentChat){
  const body=document.getElementById("contact-info-body");
  document.getElementById("modal-contact-info").style.display="flex";
  body.innerHTML=`<div style="text-align:center;color:var(--muted);padding:20px">${t("loading")}</div>`;
  let u;
  try{u=await api("GET",`/messaging/users/${encodeURIComponent(tenantId)}/profile`);}
  catch(e){body.innerHTML=`<div style="color:var(--red);text-align:center;padding:12px">${esc(e.message)}</div>`;return;}
  const status=u.online?`<span style="color:var(--green)">${t("online_status")}</span>`:esc(fmtLastSeen(u.last_seen_at));
  const rows=[];
  if(u.company_name)rows.push(ciRow("ti-building",t("ci_company"),esc(u.company_name)));
  if(u.email)rows.push(ciRow("ti-mail",t("ci_email"),`<a href="mailto:${esc(u.email)}" style="color:var(--green)">${esc(u.email)}</a>`));
  if(u.phone){const wa=String(u.phone).replace(/[^0-9]/g,"");rows.push(ciRow("ti-phone",t("ci_phone"),`<a href="tel:${esc(u.phone)}" style="color:var(--green)">${esc(u.phone)}</a>${wa?` · <a href="https://wa.me/${wa}" target="_blank" rel="noopener" style="color:var(--green)">WhatsApp</a>`:""}`));}
  if(u.address)rows.push(ciRow("ti-map-pin",t("ci_address"),esc(u.address)));
  if(u.country)rows.push(ciRow("ti-flag",t("ci_country"),esc(ciCountryName(u.country))));
  if(u.birthday)rows.push(ciRow("ti-cake",t("ci_birthday"),esc(ciBirthdayText(u.birthday))));
  if(u.member_since)rows.push(ciRow("ti-calendar",t("ci_member_since"),esc(ciMonthYear(u.member_since))));
  const groups=(u.common_groups||[]).length?`<div style="font-weight:700;font-size:13px;margin:14px 0 4px">${t("ci_common_groups")}</div>${u.common_groups.map(g=>`<div class="ci-row"><i class="ti ti-users-group"></i><div class="ci-val">${esc(g.name)}</div></div>`).join("")}`:"";
  const bday=u.birthday_today&&!u.is_me?`<div class="ci-bday">🎂 ${t("ci_birthday_today")}${fromCurrentChat?`<div style="margin-top:8px"><button class="btn btn-g btn-sm" onclick="wishBirthday()">${t("ci_wish")}</button></div>`:""}</div>`:"";
  const hidden=(u.hidden||[]).length&&!u.is_me?`<div class="ci-hidden"><i class="ti ti-lock"></i> ${t("ci_hidden_note")}</div>`:"";
  const actions=u.is_me?`<button class="btn btn-o btn-sm" onclick="closeContactInfo();navigate('profile')"><i class="ti ti-shield-lock"></i> ${t("ci_my_privacy")}</button>`
    :fromCurrentChat?`<button class="btn btn-o btn-sm" onclick="closeContactInfo();openMediaGallery()"><i class="ti ti-photo"></i> ${t("media_gallery_action")}</button>
      <button class="btn btn-o btn-sm" onclick="closeContactInfo();toggleBlockCurrentContact()"><i class="ti ti-ban"></i> ${u.blocked_by_me?t("ci_unblock"):t("block_user_action")}</button>
      <button class="btn btn-r btn-sm" onclick="closeContactInfo();reportCurrentContact()">${t("report_user_action")}</button>`:"";
  const shown=u.nickname||u.name;
  const avBig=avatarHtml(u.avatar_url,shown,96).replace("display:flex","display:inline-flex").replace("flex-shrink:0","flex-shrink:0;margin:0 auto");
  const renameBtn=(!u.is_me&&fromCurrentChat)?`<button type="button" class="btn btn-o btn-sm" onclick="ciRename('${esc(u.id)}')"><i class="ti ti-pencil"></i> ${esc(t("ci_rename"))}</button>`:"";
  const photoBtn=u.avatar_url?`<button type="button" class="btn btn-o btn-sm" onclick="zdPhotoViewer(${esc(JSON.stringify(u.avatar_url))},${esc(JSON.stringify(shown))})"><i class="ti ti-photo"></i> ${esc(t("ci_see_photo"))}</button>`:"";
  window._ciLast={id:u.id,name:u.name,nickname:u.nickname||""};
  body.innerHTML=`<div class="ci-head">${u.avatar_url?`<button type="button" class="ci-av-btn" onclick="zdPhotoViewer(${esc(JSON.stringify(u.avatar_url))},${esc(JSON.stringify(shown))})" aria-label="${esc(t("ci_see_photo"))}">${avBig}</button>`:avBig}<div class="ci-name">${esc(shown)}</div>${u.nickname?`<div class="ci-sub">${esc(t("ci_real_name"))} : ${esc(u.name)}</div>`:""}<div class="ci-sub">${u.is_me?t("ci_this_is_you"):status}</div>${(photoBtn||renameBtn)?`<div class="ci-head-act">${photoBtn}${renameBtn}</div>`:""}</div>
    ${bday}${rows.join("")||`<div style="text-align:center;color:var(--muted);font-size:13px;padding:10px 0">${t("ci_nothing_shared")}</div>`}${groups}${hidden}
    ${actions?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">${actions}</div>`:""}`;
}
// ── Renommer un contact (visible par moi seul) ──
function ciRename(id){
  const cur=window._ciLast&&window._ciLast.id===id?window._ciLast:{name:"",nickname:""};
  let ov=document.getElementById("ci-rename");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="ci-rename";ov.className="modal-overlay";ov.style.display="flex";ov.style.zIndex=1300;
  ov.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="ci-rn-t" style="max-width:420px">
    <h3 id="ci-rn-t" style="margin:0 0 6px">${esc(t("ci_rename_t"))}</h3>
    <p style="margin:0 0 12px;font-size:13.5px;color:var(--muted);line-height:1.5">${esc(t("ci_rename_x"))}</p>
    <label class="fl" style="display:block;font-size:12.5px;font-weight:700;margin-bottom:6px">${esc(t("ci_rename_lbl"))}</label>
    <input id="ci-rn-in" class="inp" maxlength="60" autocomplete="off" value="${esc(cur.nickname||cur.name)}" style="width:100%">
    <div style="font-size:12.5px;color:var(--muted);margin-top:8px">${esc(t("ci_real_name"))} : ${esc(cur.name)}</div>
    <div style="display:flex;gap:8px;margin-top:14px"><button type="button" class="btn btn-o" id="ci-rn-reset" style="flex:1"${cur.nickname?"":" hidden"}>${esc(t("ci_rename_reset"))}</button><button type="button" class="btn btn-g" id="ci-rn-save" style="flex:1">${esc(t("btn_save"))}</button></div></div>`;
  document.body.appendChild(ov);
  const close=()=>ov.remove();
  ov.addEventListener("click",e=>{if(e.target===ov)close();});
  const inp=document.getElementById("ci-rn-in");inp.focus();inp.select();
  const save=async v=>{
    try{await api("PUT",`/messaging/contacts/${encodeURIComponent(id)}/nickname`,{nickname:v});close();showToast(t("ci_rename_ok"));
      try{await loadConversations();}catch(_){}
      const c=(typeof _conversations!=="undefined"?_conversations:[]).find(x=>x.other_tenant_id===id);
      if(c&&c.id===_currentConvId){const h=document.getElementById("chat-header-name");if(h)h.textContent=c.name;}
      openContactInfo(id,true);
    }catch(e){showToast(e.message,"error");}
  };
  document.getElementById("ci-rn-save").onclick=()=>{const v=inp.value.trim();save(v===cur.name?"":v);};
  document.getElementById("ci-rn-reset").onclick=()=>save("");
  inp.addEventListener("keydown",e=>{if(e.key==="Enter")document.getElementById("ci-rn-save").click();if(e.key==="Escape")close();});
}
// ── Photo en grand : zoom à deux doigts / double toucher / molette ──
function zdPhotoViewer(src,name){
  let ov=document.getElementById("zd-photo-v");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="zd-photo-v";ov.className="zd-photo-v";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");
  ov.innerHTML=`<div class="zd-pv-top"><button type="button" class="mv-vw-b" aria-label="${esc(t("btn_close"))}"><i class="ti ti-x" aria-hidden="true"></i></button><span><b>${esc(name||"")}</b><small>${esc(t("ci_photo_of"))}</small></span></div>
    <div class="zd-pv-stage"><img src="${esc(src)}" alt="${esc(name||"")}" draggable="false"></div><div class="zd-pv-hint">${esc(t("ci_photo_hint"))}</div>`;
  document.body.appendChild(ov);
  const img=ov.querySelector("img"),stage=ov.querySelector(".zd-pv-stage");
  let sc=1,tx=0,ty=0,pts=new Map(),d0=0,sc0=1,last=null,lastTap=0;
  const apply=()=>{img.style.transform=`translate(${tx}px,${ty}px) scale(${sc})`;};
  const clamp=()=>{if(sc<=1){sc=1;tx=ty=0;}};
  const close=()=>{ov.remove();document.removeEventListener("keydown",onkey);};
  const onkey=e=>{if(e.key==="Escape")close();};document.addEventListener("keydown",onkey);
  ov.querySelector(".zd-pv-top button").onclick=close;
  stage.addEventListener("click",e=>{if(e.target===stage&&sc===1)close();});
  stage.addEventListener("wheel",e=>{e.preventDefault();sc=Math.min(5,Math.max(1,sc*(e.deltaY<0?1.15:0.87)));clamp();apply();},{passive:false});
  stage.addEventListener("pointerdown",e=>{stage.setPointerCapture&&stage.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){const [a,b]=[...pts.values()];d0=Math.hypot(a.x-b.x,a.y-b.y);sc0=sc;}
    else{last={x:e.clientX,y:e.clientY};const n=Date.now();if(n-lastTap<300){sc=sc>1?1:2.5;clamp();apply();}lastTap=n;}});
  stage.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(d0){sc=Math.min(5,Math.max(1,sc0*d/d0));clamp();apply();}}
    else if(sc>1&&last){tx+=e.clientX-last.x;ty+=e.clientY-last.y;last={x:e.clientX,y:e.clientY};apply();}});
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)d0=0;last=pts.size===1?[...pts.values()][0]:null;};
  stage.addEventListener("pointerup",up);stage.addEventListener("pointercancel",up);
  // glisser vers le bas (sans zoom) pour fermer
  let y0=null;stage.addEventListener("touchstart",e=>{y0=e.touches.length===1&&sc===1?e.touches[0].clientY:null;},{passive:true});
  stage.addEventListener("touchend",e=>{if(y0!=null&&e.changedTouches[0].clientY-y0>110)close();y0=null;},{passive:true});
  ov.querySelector(".zd-pv-top button").focus();
}
function wishBirthday(){
  closeContactInfo();
  const input=document.getElementById("chat-input");
  if(input){input.value=t("ci_wish_text");input.focus();}
}
