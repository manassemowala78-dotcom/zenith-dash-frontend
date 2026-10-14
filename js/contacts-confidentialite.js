const PRIVACY_KEYS=[["show_company","priv_show_company"],["show_email","priv_show_email"],["show_phone","priv_show_phone"],["show_address","priv_show_address"],["show_country","priv_show_country"],["show_birthday","priv_show_birthday"],["show_last_seen","priv_show_last_seen"],["birthday_reminders","priv_birthday_reminders"]];
let _privacy=null;
async function loadPrivacyCard(){
  const box=document.getElementById("privacy-box");if(!box)return;
  try{_privacy=await api("GET","/profile/privacy");}catch(e){box.innerHTML=`<div style="color:var(--red);font-size:12px">${esc(e.message)}</div>`;return;}
  box.innerHTML=PRIVACY_KEYS.map(([k,l])=>`<label class="priv-row"><span>${t(l)}</span><input type="checkbox" id="priv-${k}" ${_privacy[k]?"checked":""} onchange="savePrivacyToggle('${k}',this.checked,this)"></label>`).join("");
}
async function savePrivacyToggle(key,value,el){
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
  body.innerHTML=`<div class="ci-head">${avatarHtml(u.avatar_url,u.name,72).replace("display:flex","display:inline-flex").replace("flex-shrink:0","flex-shrink:0;margin:0 auto")}<div class="ci-name">${esc(u.name)}</div><div class="ci-sub">${u.is_me?t("ci_this_is_you"):status}</div></div>
    ${bday}${rows.join("")||`<div style="text-align:center;color:var(--muted);font-size:13px;padding:10px 0">${t("ci_nothing_shared")}</div>`}${groups}${hidden}
    ${actions?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">${actions}</div>`:""}`;
}
function wishBirthday(){
  closeContactInfo();
  const input=document.getElementById("chat-input");
  if(input){input.value=t("ci_wish_text");input.focus();}
}
