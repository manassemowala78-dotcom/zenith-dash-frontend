// ── 9.3 · SECTEUR AMBASSADE ET CONSULATS ──
const _emb={set:null,f:{},case:null,stats:null};
const EMB_KINDS=["visa","passport","civil","legal","registry"];
const EMB_PAGE_KIND={embvisas:"visa",embpassports:"passport",embcivil:"civil",emblegal:"legal",embregistry:"registry"};
const EMB_DETAIL_FIELDS={
  visa:[["visa_type","select",["short_tourism","short_business","short_family","studies","transit","long_stay"]],["travel_from","date"],["travel_to","date"],["purpose","text"]],
  passport:[["request_type","select",["first","renewal","lost","laissez_passer"]]],
  civil:[["act_type","select",["birth","marriage","death","transcription","full_copy"]],["event_day","date"],["event_place","text"]],
  legal:[["doc_type","select",["signature","certified_copy"]],["document","text"],["pages","number"]],
  registry:[["address","text"],["profession","text"]]};
function embMoney(v){const c=_emb.set?.currency||"USD";return (Math.round((+v||0)*100)/100).toLocaleString("fr-FR",{maximumFractionDigits:2}).replace(/[\u00a0\u202f ]/g,"\u00a0")+"\u00a0"+(c==="USD"?"$":c==="CDF"?"FC":c);}
function embSt(s){return t("emb_st_"+s);}
function embStBadge(s){const cl={granted:"bg",delivered:"bg",registered:"bg",legalized:"bg",refused:"br",cancelled:"br",docs:"ba",decision:"bp",new:"bb"}[s]||"bb";return `<span class="badge ${cl}">${esc(embSt(s))}</span>`;}
function embMe(){return _emb.set?.me||{role:"manager",manager:true};}
function embIsMgr(){return !!embMe().manager;}
function embPostName(id){return (_emb.set?.posts||[]).find(p=>p.id===id)?.name||"";}
async function embBase(force){if(force||!_emb.set)_emb.set=await api("GET","/embassy/settings");}
function embErr(el,e){
  const d=e&&e.data&&e.data.detail;const code=d&&d.error;
  el.innerHTML=`<div class="card" style="text-align:center;padding:26px"><i class="ti ti-${code==="embassy_2fa"?"shield-lock":"lock"}" style="font-size:30px;color:var(--amber)"></i><div style="margin:10px 0">${esc(code&&t("emb_err_"+code)!=="emb_err_"+code?t("emb_err_"+code):(d&&d.message)||e.message)}</div>${code==="embassy_2fa"?`<button class="btn btn-g btn-sm" onclick="navigate('profile')">${esc(t("emb_go_security"))}</button>`:""}</div>`;
}
function embWrap(fn){return async el=>{try{await fn(el);}catch(e){embErr(el,e);}};}
function emb2faBanner(){return embIsMgr()&&_emb.set&&!_emb.set.two_factor_on?`<div class="alert-bar emb-2fa" style="margin-bottom:12px"><i class="ti ti-shield-lock"></i> ${esc(t("emb_owner_2fa"))} <a href="#" onclick="event.preventDefault();navigate('profile')">${esc(t("emb_go_security"))}</a></div>`:"";}

// ── Dossiers ──
Object.keys(EMB_PAGE_KIND).forEach(pg=>{SECTOR_PAGE_LOADERS[pg]=embWrap(async el=>{await embBase();await embCasesPage(el,EMB_PAGE_KIND[pg],pg);});});
async function embCasesPage(el,kind,pg){
  const f=_emb.f[kind]=_emb.f[kind]||{status:"open",post:"",q:""};const me=embMe();
  const d=await api("GET",`/embassy/cases?kind=${kind}${f.status?`&status=${f.status}`:""}${f.post?`&post_id=${f.post}`:""}${f.q?`&q=${encodeURIComponent(f.q)}`:""}`);
  const steps=["open",...(kind==="visa"?["new","docs","interview","decision","granted","refused","delivered"]:kind==="passport"?["new","biometrics","production","ready","delivered"]:kind==="registry"?["new","registered"]:kind==="civil"?["new","verification","registered","delivered"]:["new","verification","legalized","delivered"]),""];
  const canWrite=me.role!=="ambassador";
  el.innerHTML=sectorPageHead(esc(t("nav_emb_"+kind)),esc(t("emb_sub_"+kind)),canWrite?`<button class="btn btn-g btn-sm" onclick="embNewCase('${kind}')"><i class="ti ti-plus"></i> ${esc(t("emb_new_"+kind))}</button>${embIsMgr()&&!_emb.set.demo_done?`<button class="btn btn-o btn-sm" onclick="embDemo()">${esc(t("emb_demo"))}</button>`:""}`:"")+emb2faBanner()+
    `<div class="card" style="margin-bottom:12px"><div class="emb-chips" role="tablist">${steps.map(s=>`<button type="button" class="${f.status===s?"on":""}" onclick="_emb.f['${kind}'].status='${s}';navigate('${pg}')">${esc(s==="open"?t("emb_f_open"):s===""?t("emb_f_all"):embSt(s))}</button>`).join("")}</div>
      <div class="sc-filters" style="margin-top:10px">${me.post_ids==null&&(_emb.set.posts||[]).length>1?`<select class="inp" onchange="_emb.f['${kind}'].post=this.value;navigate('${pg}')" aria-label="${esc(t("emb_post"))}"><option value="">${esc(t("emb_all_posts"))}</option>${_emb.set.posts.map(p=>`<option value="${p.id}" ${p.id===f.post?"selected":""}>${esc(p.name)}</option>`).join("")}</select>`:""}
      <input class="inp" id="emb-q-${kind}" placeholder="${esc(t("emb_search_ph"))}" value="${esc(f.q)}" onkeydown="if(event.key==='Enter'){_emb.f['${kind}'].q=this.value.trim();navigate('${pg}')}"><button class="btn btn-o btn-sm" onclick="_emb.f['${kind}'].q=zdVal('emb-q-${kind}');navigate('${pg}')" aria-label="${esc(t("emb_search_ph"))}"><i class="ti ti-search"></i></button></div></div>
    <div class="card">${d.rows.length?`<div class="tbl-wrap"><table class="sc-t emb-t"><thead><tr><th>${esc(t("emb_number"))}</th><th>${esc(t("emb_applicant"))}</th><th>${esc(t("emb_type"))}</th><th>${esc(t("emb_deposit"))}</th><th>${esc(t("emb_post"))}</th><th>${esc(t("emb_state"))}</th><th>${esc(t("emb_next"))}</th></tr></thead><tbody>
      ${d.rows.map(c=>`<tr><td class="mono"><a href="#" onclick="event.preventDefault();embOpenCase('${c.id}')">${esc(c.number)}</a></td><td><b>${esc(c.applicant_name)}</b>${c.assigned_name?`<small class="sc-sm">${esc(c.assigned_name)}</small>`:""}</td><td>${esc(embTypeLabel(c))}</td><td>${esc(abDate(c.created_at))}</td><td>${esc(c.post_name)}</td><td>${embStBadge(c.status)}${!c.paid&&c.fee>0?` <span class="badge ba">${esc(t("emb_unpaid"))}</span>`:""}</td>
        <td class="sc-acts">${c.actions.filter(a=>!["granted","refused"].includes(a)).slice(0,1).map(a=>`<button class="btn btn-o btn-sm" onclick="embStatus('${c.id}','${a}')">${esc(t("emb_act_"+a))}</button>`).join("")}${c.actions.includes("granted")?`<button class="btn btn-g btn-sm" onclick="embOpenCase('${c.id}')">${esc(t("emb_decide"))}</button>`:""}${!c.actions.length?`<button class="btn btn-o btn-sm" onclick="embOpenCase('${c.id}')"><i class="ti ti-eye"></i></button>`:""}</td></tr>`).join("")}
      </tbody></table></div><div class="sc-hint" style="color:var(--muted)">${esc(t("emb_advance_x"))}</div>`:zdEmpty(t("emb_no_cases"),"file-text")}</div>`;
}
function embTypeLabel(c){const d=c.details||{};const k={visa:"visa_type",passport:"request_type",civil:"act_type",legal:"doc_type"}[c.kind];if(k&&d[k])return t("emb_o_"+d[k])!=="emb_o_"+d[k]?t("emb_o_"+d[k]):d[k];if(c.kind==="registry")return c.city||"—";return "—";}
function embNewCase(kind,appt){
  const me=embMe();const posts=(_emb.set.posts||[]).filter(p=>p.active&&(me.post_ids==null||me.post_ids.includes(p.id)));
  const fee=(_emb.set.fees||{})[kind]||0;
  const fld=([k,type,opts])=>`<div class="fgrp"><label class="fl">${esc(t("emb_d_"+k))}</label>${type==="select"?`<select class="inp emb-d" data-k="${k}">${opts.map(o=>`<option value="${o}">${esc(t("emb_o_"+o))}</option>`).join("")}</select>`:`<input class="inp emb-d" data-k="${k}" type="${type}">`}</div>`;
  zdModal("modal-emb",`<div class="modal-title"><i class="ti ti-file-plus" style="color:var(--green)"></i> ${esc(t("emb_new_"+kind))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("emb_applicant"))} *</label><input class="inp" id="ec-n" value="${esc(appt?.name||"")}"></div><div class="fgrp"><label class="fl">${esc(t("emb_nationality"))}</label><input class="inp" id="ec-na"></div></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("emb_birth"))}</label><input class="inp" type="date" id="ec-b"></div><div class="fgrp"><label class="fl">${esc(t("emb_passport_no"))}</label><input class="inp" id="ec-p"></div><div class="fgrp"><label class="fl">${esc(t(kind==="registry"?"emb_zone":"emb_city"))}${kind==="registry"?" *":""}</label><input class="inp" id="ec-c"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("pb_phone"))}</label><input class="inp" id="ec-ph" inputmode="tel" value="${esc(appt?.phone||"")}"></div><div class="fgrp"><label class="fl">Email</label><input class="inp" id="ec-e" type="email" value="${esc(appt?.email||"")}"></div></div>
    <div class="grid2">${EMB_DETAIL_FIELDS[kind].map(fld).join("")}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("emb_post"))}</label><select class="inp" id="ec-po">${posts.map(p=>`<option value="${p.id}" ${appt&&appt.post_id===p.id?"selected":""}>${esc(p.name)}</option>`).join("")}</select></div><div class="fgrp"><label class="fl">${esc(t("emb_fee"))} (${esc(_emb.set.currency)})</label><input class="inp" type="number" min="0" step="any" id="ec-f" value="${fee}"></div></div>
    <div class="sc-hint" id="ec-h"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-emb')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="embCreate('${kind}','${appt?.id||""}')"><i class="ti ti-check"></i> ${esc(t("emb_create"))}</button></div>`,640);
}
async function embCreate(kind,apptId){
  const det={};document.querySelectorAll("#modal-emb .emb-d").forEach(i=>{if(i.value.trim()!=="")det[i.dataset.k]=i.type==="number"?+i.value:i.value.trim();});
  const b={kind,applicant_name:zdVal("ec-n"),nationality:zdVal("ec-na")||null,birth_day:zdVal("ec-b")||null,passport_no:zdVal("ec-p")||null,city:zdVal("ec-c")||null,phone:zdVal("ec-ph")||null,email:zdVal("ec-e")||null,details:det,post_id:zdVal("ec-po")||null,fee:zdNum("ec-f")??0,appointment_id:apptId||null};
  const h=document.getElementById("ec-h");
  if(b.applicant_name.length<2||(kind==="registry"&&!b.city)){h.style.color="var(--red)";h.textContent=t("emb_need_fields");return;}
  try{const c=await api("POST","/embassy/cases",b);zdCloseModal("modal-emb");showToast(abTr("emb_created",{n:c.number}));await embReloadCurrent();embShowCase(c);}catch(e){h.style.color="var(--red)";h.textContent=e.message;}
}
async function embReloadCurrent(){const pg=document.querySelector(".page.active")?.id?.replace("page-","");if(pg&&SECTOR_PAGE_LOADERS[pg])await SECTOR_PAGE_LOADERS[pg](document.getElementById("page-"+pg));}
async function embOpenCase(id){try{embShowCase(await api("GET",`/embassy/cases/${id}`));}catch(e){showToast(e.message,"error");}}
function embShowCase(c){
  _emb.case=c;const me=embMe();const idx=c.steps.indexOf(c.status);
  const det=Object.entries(c.details||{}).map(([k,v])=>`<div class="sc-line"><span>${esc(t("emb_d_"+k)!=="emb_d_"+k?t("emb_d_"+k):k)}</span><span>${esc(t("emb_o_"+v)!=="emb_o_"+v?t("emb_o_"+v):String(v))}</span></div>`).join("");
  const track=`${window.location.origin}/?demarche=${encodeURIComponent(c.client_token||"")}`;
  zdModal("modal-embc",`<div class="modal-title"><i class="ti ti-file-text" style="color:#818cf8"></i> ${esc(c.number)} ${embStBadge(c.status)}</div>
    <div style="font-size:12px;color:var(--muted);margin:-4px 0 10px">${esc(c.applicant_name)} · ${esc(c.post_name)}${c.assigned_name?" · "+esc(c.assigned_name):""}</div>
    <div class="emb-steps">${c.steps.map((s,i)=>`<div class="${i<idx||(c.status==="delivered")?"done":i===idx?"cur":""}${c.status==="refused"&&s==="granted"?" ko":""}"><span>${i+1}</span>${esc(embSt(s))}</div>`).join("")}${c.status==="refused"?`<div class="ko cur"><span>✕</span>${esc(embSt("refused"))}</div>`:""}</div>
    <div class="sc-2"><div><div class="sc-sub">${esc(t("emb_applicant"))}</div>
      ${[["emb_nationality",c.nationality],["emb_birth",c.birth_day&&abDate(c.birth_day)],["emb_passport_no",c.passport_no],["pb_phone",c.phone],["Email",c.email],[c.kind==="registry"?"emb_zone":"emb_city",c.city],["emb_reference",c.reference_no]].filter(x=>x[1]).map(([k,v])=>`<div class="sc-line"><span>${esc(k==="Email"?k:t(k))}</span><span>${esc(v)}</span></div>`).join("")}${det}
      <div class="sc-line"><span>${esc(t("emb_fee"))}</span><span>${embMoney(c.fee)} ${c.paid?`<span class="badge bg">${esc(t("emb_paid"))}${c.receipt_no?" · "+esc(c.receipt_no):""}</span>`:`<span class="badge ba">${esc(t("emb_unpaid"))}</span>`}</span></div></div>
      <div><div class="sc-sub">${esc(t("emb_history"))}</div><div class="emb-hist">${(c.history||[]).slice().reverse().map(h=>`<div><b>${esc(t("emb_ev_"+h.event))}</b>${h.to?" · "+esc(h.event==="transfer"||h.event==="assign"?h.to:embSt(h.to)):""}${h.note?` <small>— ${esc(h.note)}</small>`:""}<small class="sc-sm">${esc(fmtDate(h.at))} · ${esc(h.by||"")}${h.post?" · "+esc(h.post):""}</small></div>`).join("")}</div></div></div>
    ${me.role!=="ambassador"?`<div class="sc-sub">${esc(t("emb_actions"))}</div><div class="emb-acts">
      ${c.actions.filter(a=>!["granted","refused"].includes(a)).map(a=>`<button class="btn btn-o btn-sm" onclick="embStatus('${c.id}','${a}',true)">${esc(t("emb_act_"+a))}</button>`).join("")}
      ${c.actions.includes("granted")?`<button class="btn btn-g btn-sm" onclick="embStatus('${c.id}','granted',true)"><i class="ti ti-check"></i> ${esc(t("emb_act_granted"))}</button><button class="btn btn-r btn-sm" onclick="embStatus('${c.id}','refused',true)"><i class="ti ti-x"></i> ${esc(t("emb_act_refused"))}</button>`:""}
      ${!c.paid&&c.fee>0?`<button class="btn btn-o btn-sm" onclick="embPay('${c.id}')"><i class="ti ti-cash"></i> ${esc(t("emb_pay"))}</button>`:""}
      ${c.can_transfer&&(c.posts||[]).length?`<span class="emb-tr"><select class="inp" id="emb-tr">${c.posts.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select><button class="btn btn-o btn-sm" onclick="embTransfer('${c.id}')"><i class="ti ti-arrow-right"></i> ${esc(t("emb_transfer"))}</button></span>`:""}
      ${c.agents?`<span class="emb-tr"><select class="inp" id="emb-as"><option value="">${esc(t("emb_unassigned"))}</option>${c.agents.map(a=>`<option value="${a.id}" ${a.id===c.assigned_id?"selected":""}>${esc(a.name)}</option>`).join("")}</select><button class="btn btn-o btn-sm" onclick="embAssign('${c.id}')">${esc(t("emb_assign"))}</button></span>`:""}
      ${c.can_cancel?`<button class="btn btn-o btn-sm" onclick="embStatus('${c.id}','cancelled',true)">${esc(t("emb_cancel_case"))}</button>`:""}</div>
      <div class="fgrp" style="margin-top:8px"><input class="inp" id="emb-note" placeholder="${esc(t("emb_note_ph"))}"></div>`:""}
    <div class="sc-sub">${esc(t("emb_track"))}</div><div class="sc-plink"><input class="inp" readonly value="${esc(track)}" onclick="this.select()"><button class="btn btn-o btn-sm" onclick="embReceipt()" title="${esc(t("emb_receipt_doc"))}"><i class="ti ti-printer"></i></button>${c.phone?`<a class="btn btn-g btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc((c.phone||"").replace(/\D/g,""))}?text=${encodeURIComponent(abTr("emb_track_msg",{n:c.number,u:track}))}"><i class="ti ti-brand-whatsapp"></i></a>`:""}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-embc')">${esc(t("btn_close"))}</button></div>`,760);
}
async function embStatus(id,s,fromModal){
  if(["refused","cancelled"].includes(s)&&!confirm(t("emb_confirm_"+s)))return;
  const note=fromModal?zdVal("emb-note")||null:null;
  try{const c=await api("POST",`/embassy/cases/${id}/status`,{status:s,note});showToast(abTr("emb_status_ok",{n:c.number,s:embSt(c.status)}));await embReloadCurrent();if(fromModal)embShowCase({...c,posts:_emb.case?.posts,agents:_emb.case?.agents});}catch(e){showToast(e.message,"error");}
}
async function embPay(id){try{const c=await api("POST",`/embassy/cases/${id}/pay`,{method:"cash"});showToast(abTr("emb_paid_ok",{r:c.receipt_no}));embShowCase({...c,posts:_emb.case?.posts,agents:_emb.case?.agents});await embReloadCurrent();}catch(e){showToast(e.message,"error");}}
async function embTransfer(id){
  const to=zdVal("emb-tr");if(!to)return;if(!confirm(abTr("emb_transfer_confirm",{p:embPostName(to)})))return;
  try{const r=await api("POST",`/embassy/cases/${id}/transfer`,{post_id:to,note:zdVal("emb-note")||null});showToast(abTr("emb_transfer_ok",{p:r.post_name}));zdCloseModal("modal-embc");await embReloadCurrent();if(r.visible)embOpenCase(id);}catch(e){showToast(e.message,"error");}
}
async function embAssign(id){try{const c=await api("POST",`/embassy/cases/${id}/assign`,{assigned_id:zdVal("emb-as")||null});showToast(t("toast_saved"));embShowCase({...c,posts:_emb.case?.posts,agents:_emb.case?.agents});await embReloadCurrent();}catch(e){showToast(e.message,"error");}}
function embReceipt(){
  const c=_emb.case;if(!c)return;const track=`${window.location.origin}/?demarche=${encodeURIComponent(c.client_token||"")}`;
  const page=document.getElementById("doc-page");page.classList.remove("doc-ticket");
  page.innerHTML=`<div class="scd"><div class="scd-h"><div><div class="scd-n">${esc(State.tenant?.company_name||"")}</div><div class="scd-s">${esc(c.post_name)}</div></div></div><h2 class="scd-t">${esc(t("emb_receipt_doc"))}</h2>
    <div class="scd-id"><div><b>${esc(c.number)}</b> · ${esc(t("nav_emb_"+c.kind))}</div><div>${esc(abDate(c.created_at))}</div></div>
    <div class="scd-sum"><div><span>${esc(t("emb_applicant"))}</span><b>${esc(c.applicant_name)}</b></div><div><span>${esc(t("emb_type"))}</span><b>${esc(embTypeLabel(c))}</b></div><div><span>${esc(t("emb_fee"))}</span><b>${embMoney(c.fee)}</b></div><div><span>${esc(t("emb_state"))}</span><b>${esc(c.paid?(t("emb_paid")+(c.receipt_no?" · "+c.receipt_no:"")):t("emb_unpaid"))}</b></div></div>
    <div class="scd-foot"><div id="scd-qr" class="scd-qr"></div><div class="scd-small">${esc(t("emb_receipt_qr"))}<br>${esc(track)}</div><div class="scd-sig">${esc(t("emb_agent"))}<div class="scd-line"></div></div></div></div>`;
  window._currentDoc={number:c.number};const wa=document.getElementById("doc-wa-btn");if(wa)wa.style.display="none";
  document.getElementById("doc-view").style.display="block";document.body.classList.add("doc-open");
  if(typeof qrcode==="function"){try{const q=qrcode(0,"M");q.addData(track);q.make();document.getElementById("scd-qr").innerHTML=q.createSvgTag({cellSize:3,margin:0,scalable:true});}catch(_){}}
}

// ── Rendez-vous ──
SECTOR_PAGE_LOADERS.embappts=embWrap(async el=>{
  await embBase();const day=_emb.f.apptDay||null;const d=await api("GET",`/embassy/appointments${day?`?day=${day}`:""}`);_emb.f.apptDay=d.day;const me=embMe();
  const posts=(_emb.set.posts||[]).filter(p=>p.active&&(me.post_ids==null||me.post_ids.includes(p.id)));
  const link=`${window.location.origin}/?consulat=${encodeURIComponent(_emb.set.slug)}`;
  el.innerHTML=sectorPageHead(esc(t("nav_emb_appts")),esc(t("emb_appts_sub")))+emb2faBanner()+
    `<div class="card" style="margin-bottom:12px"><div class="sc-head"><b>${esc(t("emb_public_link"))}</b><span class="sc-hint" style="color:var(--muted)">${esc(t(_emb.set.online_booking?"emb_public_on":"emb_public_off"))}</span></div><div class="sc-plink"><input class="inp" readonly value="${esc(link)}" onclick="this.select()"><a class="btn btn-o btn-sm" href="${esc(link)}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i></a></div></div>
    <div class="card" style="margin-bottom:12px"><div class="sc-filters"><input class="inp" type="date" value="${d.day}" onchange="_emb.f.apptDay=this.value;navigate('embappts')" aria-label="${esc(t("emb_day"))}"><span class="badge bb">${esc(abTr("emb_appts_n",{n:d.rows.length}))}</span><span class="badge bg">${esc(abTr("emb_queue_n",{n:d.queue.length}))}</span></div></div>
    <div class="card" style="margin-bottom:12px">${d.rows.length?d.rows.map(a=>`<div class="sc-line"><span><b>${esc(a.time)}</b> · ${esc(a.name)}<small class="sc-sm">${esc(t("nav_emb_"+a.service))} · ${esc(a.post_name)}${a.phone?" · "+esc(a.phone):""}</small></span>
      <span>${a.queue_no?`<span class="badge bg">${esc(abTr("emb_ticket",{n:a.queue_no}))}</span> `:""}<span class="badge ${a.status==="no_show"||a.status==="cancelled"?"br":a.status==="done"?"bg":"bb"}">${esc(t("emb_ap_"+a.status))}</span></span>
      <span class="sc-acts">${a.status==="booked"?`<button class="btn btn-g btn-sm" onclick="embApSt('${a.id}','checked_in')">${esc(t("emb_checkin"))}</button><button class="btn btn-o btn-sm" onclick="embApSt('${a.id}','no_show')">${esc(t("emb_ap_no_show"))}</button>`:""}${a.status==="checked_in"&&!a.case_id&&me.role!=="ambassador"?`<button class="btn btn-g btn-sm" onclick='embNewCase("${a.service}",${JSON.stringify({id:a.id,name:a.name,phone:a.phone,email:a.email,post_id:a.post_id}).replace(/'/g,"&#39;")})'>${esc(t("emb_open_case"))}</button><button class="btn btn-o btn-sm" onclick="embApSt('${a.id}','done')">${esc(t("emb_ap_done"))}</button>`:""}</span></div>`).join(""):zdEmpty(t("emb_no_appts"),"calendar-event")}</div>
    ${me.role!=="ambassador"?`<div class="card"><b>${esc(t("emb_book_staff"))}</b><div class="sc-form sc-form6" style="margin-top:10px"><select class="inp" id="ea-p" aria-label="${esc(t("emb_post"))}">${posts.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select><select class="inp" id="ea-s" aria-label="${esc(t("emb_service"))}">${EMB_KINDS.map(k=>`<option value="${k}">${esc(t("nav_emb_"+k))}</option>`).join("")}</select><input class="inp" type="date" id="ea-d" value="${d.day}" onchange="document.getElementById('ea-t').value=embNextSlot(this.value)" aria-label="${esc(t("emb_day"))}"><input class="inp" type="time" id="ea-t" value="${esc(embNextSlot(d.day))}" step="${_emb.set.slot_min*60}" aria-label="${esc(t("emb_time"))}"><input class="inp" id="ea-n" placeholder="${esc(t("emb_applicant"))}"><button class="btn btn-o btn-sm" onclick="embStaffBook()"><i class="ti ti-plus"></i> ${esc(t("emb_book"))}</button></div><div class="sc-hint" id="ea-h"></div></div>`:""}`;
});
async function embApSt(id,s){try{const r=await api("POST",`/embassy/appointments/${id}/status`,{status:s});if(s==="checked_in")showToast(abTr("emb_ticket",{n:r.queue_no}));navigate("embappts");}catch(e){showToast(e.message,"error");}}
async function embStaffBook(){const b={post_id:zdVal("ea-p"),service:zdVal("ea-s"),day:zdVal("ea-d"),time:zdVal("ea-t"),name:zdVal("ea-n")};const h=document.getElementById("ea-h");
  if(b.name.length<2){h.style.color="var(--red)";h.textContent=t("emb_need_fields");return;}
  try{await api("POST","/embassy/appointments",b);navigate("embappts");}catch(e){h.style.color="var(--red)";h.textContent=e.message;}}

// ── Accueil et visiteurs ──
SECTOR_PAGE_LOADERS.embvisitors=embWrap(async el=>{
  await embBase();const d=await api("GET","/embassy/visitors");const me=embMe();const posts=(_emb.set.posts||[]).filter(p=>p.active&&(me.post_ids==null||me.post_ids.includes(p.id)));
  el.innerHTML=sectorPageHead(esc(t("nav_emb_visitors")),esc(abTr("emb_visitors_sub",{n:d.inside})))+
    (me.role!=="ambassador"?`<div class="card" style="margin-bottom:12px"><div class="sc-form sc-form6"><input class="inp" id="ev-n" placeholder="${esc(t("emb_v_name"))}"><input class="inp" id="ev-i" placeholder="${esc(t("emb_v_id"))}"><input class="inp" id="ev-w" placeholder="${esc(t("emb_v_visiting"))}"><input class="inp" id="ev-r" placeholder="${esc(t("emb_v_reason"))}">${posts.length>1?`<select class="inp" id="ev-p" aria-label="${esc(t("emb_post"))}">${posts.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>`:`<span></span>`}<button class="btn btn-g btn-sm" onclick="embVisitorIn()"><i class="ti ti-login"></i> ${esc(t("emb_v_in"))}</button></div></div>`:"")+
    `<div class="card">${d.rows.length?d.rows.map(v=>`<div class="sc-line${v.out_at?" sc-off":""}"><span><b>${esc(v.name)}</b> <span class="badge bb">${esc(v.badge_no||"")}</span><small class="sc-sm">${esc([v.id_doc,v.visiting,v.reason,v.post_name].filter(Boolean).join(" · "))}</small></span><span class="mono">${esc(zdTime(v.in_at))}${v.out_at?" → "+esc(zdTime(v.out_at)):""}</span>${!v.out_at&&me.role!=="ambassador"?`<button class="btn btn-o btn-sm" onclick="embVisitorOut('${v.id}')"><i class="ti ti-logout"></i> ${esc(t("emb_v_out"))}</button>`:"<span></span>"}</div>`).join(""):zdEmpty(t("emb_no_visitors"),"users")}</div>`;
});
async function embVisitorIn(){const b={name:zdVal("ev-n"),id_doc:zdVal("ev-i")||null,visiting:zdVal("ev-w")||null,reason:zdVal("ev-r")||null,post_id:zdVal("ev-p")||null};
  if(b.name.length<2){flagMissingFields([document.getElementById("ev-n")]);return;}
  try{const r=await api("POST","/embassy/visitors",b);showToast(abTr("emb_badge",{n:r.badge_no}));navigate("embvisitors");}catch(e){showToast(e.message,"error");}}
async function embVisitorOut(id){try{await api("POST",`/embassy/visitors/${id}/out`);navigate("embvisitors");}catch(e){showToast(e.message,"error");}}

// ── Communication de crise ──
SECTOR_PAGE_LOADERS.embcrisis=embWrap(async el=>{
  await embBase();const d=await api("GET","/embassy/alerts");const me=embMe();const can=me.role!=="agent";
  el.innerHTML=sectorPageHead(esc(t("nav_emb_crisis")),esc(abTr("emb_crisis_sub",{n:d.nationals})))+
    `<div class="card" style="margin-bottom:12px"><b>${esc(t("emb_zones"))}</b><div class="emb-chips" style="margin-top:8px">${d.zones.map(z=>`<span class="badge bb">${esc(z.zone)} · ${z.count}</span>`).join(" ")||`<span class="sc-hint" style="color:var(--muted)">${esc(t("emb_no_nationals"))}</span>`}</div></div>`+
    (can?`<div class="card" style="margin-bottom:12px"><b>${esc(t("emb_alert_new"))}</b><div class="grid3" style="margin-top:10px"><div class="fgrp"><label class="fl">${esc(t("emb_zone"))}</label><select class="inp" id="al-z"><option value="">${esc(t("emb_all_zones"))}</option>${d.zones.map(z=>`<option value="${esc(z.zone)}">${esc(z.zone)} (${z.count})</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("emb_level"))}</label><select class="inp" id="al-l">${["info","warning","evacuation"].map(k=>`<option value="${k}">${esc(t("emb_lv_"+k))}</option>`).join("")}</select></div><div class="fgrp"><label class="fl">${esc(t("emb_alert_title"))}</label><input class="inp" id="al-t"></div></div>
      <div class="fgrp"><textarea class="inp" id="al-m" rows="3" placeholder="${esc(t("emb_alert_ph"))}"></textarea></div><button class="btn btn-r btn-sm" onclick="embAlert()"><i class="ti ti-alert-triangle"></i> ${esc(t("emb_alert_send"))}</button><div id="al-res"></div></div>`:"")+
    `<div class="card"><b>${esc(t("emb_alerts"))}</b>${d.alerts.length?d.alerts.map(a=>`<div class="sc-line"><span><span class="badge ${a.level==="evacuation"?"br":a.level==="warning"?"ba":"bb"}">${esc(t("emb_lv_"+a.level))}</span> <b>${esc(a.title)}</b><small class="sc-sm">${esc(fmtDate(a.created_at))} · ${esc(a.zone||t("emb_all_zones"))} · ${esc(abTr("emb_recipients",{n:a.recipients}))}</small></span>
      <span><span class="badge bg">${esc(t("emb_r_safe"))} ${a.safe}</span> <span class="badge ba">${esc(t("emb_r_help"))} ${a.help}</span> <span class="badge br">${esc(t("emb_r_repatriate"))} ${a.repatriate}</span></span><button class="btn btn-o btn-sm" onclick="embAlertOpen('${a.id}')"><i class="ti ti-users"></i> ${esc(t("emb_census"))}</button></div>`).join(""):zdEmpty(t("emb_no_alerts"),"bell")}</div>`;
});
async function embAlert(){
  const b={zone:zdVal("al-z")||null,level:zdVal("al-l"),title:zdVal("al-t"),message:zdVal("al-m")};
  if(b.title.length<3||b.message.length<5){flagMissingFields([document.getElementById(b.title.length<3?"al-t":"al-m")]);return;}
  if(!confirm(t("emb_alert_confirm")))return;
  try{const r=await api("POST","/embassy/alerts",b);showToast(abTr("emb_alert_ok",{n:r.recipients}));await SECTOR_PAGE_LOADERS.embcrisis(document.getElementById("page-embcrisis"));
    const box=document.getElementById("al-res");if(box)box.innerHTML=`<div class="sc-alerts"><b>${esc(t("emb_alert_wa"))}</b>${r.list.map(x=>`<div class="sc-line"><span>${esc(x.name)}<small class="sc-sm">${esc(x.city||"")}</small></span><span class="sc-hint" style="color:var(--muted)">${x.notified?esc(abTr("sc_notified",{n:x.notified})):esc(x.phone||"")}</span>${x.wa?`<a class="btn btn-o btn-sm" href="${esc(x.wa)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i></a>`:"<span></span>"}</div>`).join("")}</div>`;
  }catch(e){showToast(e.message,"error");}
}
async function embAlertOpen(id){
  try{const a=await api("GET",`/embassy/alerts/${id}`);
    zdModal("modal-emb",`<div class="modal-title"><i class="ti ti-users" style="color:var(--amber)"></i> ${esc(a.title)}</div>${a.rows.map(r=>`<div class="sc-line"><span>${esc(r.name)}<small class="sc-sm">${esc(r.city||"")}${r.phone?" · "+esc(r.phone):""}</small></span><span>${r.status?`<span class="badge ${r.status==="safe"?"bg":r.status==="help"?"ba":"br"}">${esc(t("emb_r_"+r.status))}</span>`:`<span class="badge bb">${esc(t("emb_r_none"))}</span>`}${r.note?` <small>${esc(r.note)}</small>`:""}</span></div>`).join("")||zdEmpty(t("emb_no_nationals"),"users")}
      <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-emb')">${esc(t("btn_close"))}</button></div>`,600);
  }catch(e){showToast(e.message,"error");}
}

// ── Personnel et sécurité ──
SECTOR_PAGE_LOADERS.embstaff=embWrap(async el=>{
  await embBase(true);const d=await api("GET","/embassy/agents");const mgr=embIsMgr();const posts=_emb.set.posts||[];const SV=["visa","passport","civil","legal","registry","appointments","visitors","crisis"];
  el.innerHTML=sectorPageHead(esc(t("nav_emb_staff")),esc(t("emb_staff_sub")),mgr?`<button class="btn btn-o btn-sm" onclick="navigate('team')"><i class="ti ti-user-plus"></i> ${esc(t("emb_invite"))}</button><button class="btn btn-o btn-sm" onclick="navigate('audit')"><i class="ti ti-list"></i> ${esc(t("emb_journal"))}</button>`:"")+emb2faBanner()+
    `<div class="card" style="margin-bottom:12px;font-size:13px;color:var(--muted)">${esc(t(d.require_2fa?"emb_2fa_required":"emb_2fa_optional"))}</div>
    <div class="card">${d.agents.length?d.agents.map(a=>`<div class="emb-agent"><div class="emb-agent-h"><b>${esc(a.name)}</b><small>${esc(a.email)}</small><span class="badge ${a.two_factor?"bg":"br"}"><i class="ti ti-shield-lock"></i> ${esc(t(a.two_factor?"emb_2fa_on":"emb_2fa_off"))}</span></div>
      ${mgr?`<div class="grid3"><select class="inp" id="ag-r-${a.member_id}" aria-label="${esc(t("emb_role"))}">${["agent","chief","ambassador"].map(r=>`<option value="${r}" ${a.role===r?"selected":""}>${esc(t("emb_role_"+r))}</option>`).join("")}</select><select class="inp" id="ag-p-${a.member_id}" aria-label="${esc(t("emb_post"))}"><option value="">—</option>${posts.map(p=>`<option value="${p.id}" ${a.post_id===p.id?"selected":""}>${esc(p.name)}</option>`).join("")}</select><label class="sc-chk"><input type="checkbox" id="ag-o-${a.member_id}" ${a.assigned_only?"checked":""}> ${esc(t("emb_assigned_only"))}</label></div>
      <div class="emb-svcs">${SV.map(s=>`<label class="sc-chk"><input type="checkbox" class="ag-s-${a.member_id}" value="${s}" ${(a.services||[]).includes(s)?"checked":""}> ${esc(t("emb_sv_"+s))}</label>`).join("")}</div><button class="btn btn-g btn-sm" onclick="embSaveAgent('${a.member_id}')"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button>`:
      `<div class="sc-hint" style="color:var(--muted)">${esc(a.role?t("emb_role_"+a.role):"—")} · ${esc(embPostName(a.post_id)||"—")} · ${esc((a.services||[]).map(s=>t("emb_sv_"+s)).join(", "))}</div>`}</div>`).join(""):zdEmpty(t("emb_no_agents"),"users")}</div>`;
});
async function embSaveAgent(mid){
  const b={role:zdVal("ag-r-"+mid),post_id:zdVal("ag-p-"+mid)||null,assigned_only:document.getElementById("ag-o-"+mid).checked,services:[...document.querySelectorAll(".ag-s-"+mid+":checked")].map(c=>c.value)};
  try{await api("PUT",`/embassy/agents/${mid}`,b);showToast(t("toast_saved"));navigate("embstaff");}catch(e){showToast(e.message,"error");}
}

// ── Statistiques ──
SECTOR_PAGE_LOADERS.embstats=embWrap(async el=>{
  await embBase();const d=await api("GET","/embassy/stats?months=6");
  el.innerHTML=sectorPageHead(esc(t("nav_emb_stats")),esc(t("emb_stats_sub")))+
    `<div class="kgrid" style="margin-bottom:12px"><div class="kpi b"><div class="kl">${esc(t("emb_k_total"))}</div><div class="kv">${d.total}</div></div><div class="kpi g"><div class="kl">${esc(t("emb_k_granted"))}</div><div class="kv">${d.visa_decisions.granted}</div></div><div class="kpi r"><div class="kl">${esc(t("emb_k_refused"))}</div><div class="kv">${d.visa_decisions.refused}</div></div><div class="kpi a"><div class="kl">${esc(t("emb_k_nationals"))}</div><div class="kv">${d.nationals}</div></div></div>
    <div class="card" style="margin-bottom:12px"><b>${esc(t("emb_by_post"))}</b><div class="tbl-wrap"><table class="sc-t"><thead><tr><th>${esc(t("emb_post"))}</th><th class="r">${esc(t("emb_total"))}</th><th class="r">${esc(t("emb_f_open"))}</th><th class="r">${esc(t("emb_k_granted"))}</th><th class="r">${esc(t("emb_k_refused"))}</th></tr></thead><tbody>${d.posts.map(p=>`<tr><td>${esc(p.post_name)}</td><td class="r">${p.total}</td><td class="r">${p.open}</td><td class="r">${p.granted}</td><td class="r">${p.refused}</td></tr>`).join("")||`<tr><td colspan="5">${zdEmpty(t("emb_no_cases"),"chart-bar")}</td></tr>`}</tbody></table></div></div>
    <div class="card" style="margin-bottom:12px"><b>${esc(t("emb_by_month"))}</b><div class="tbl-wrap"><table class="sc-t"><thead><tr><th>${esc(t("emb_month"))}</th>${EMB_KINDS.map(k=>`<th class="r">${esc(t("nav_emb_"+k+"_short"))}</th>`).join("")}</tr></thead><tbody>${d.months.map(m=>`<tr><td>${esc(m.month)}</td>${EMB_KINDS.map(k=>`<td class="r">${m[k]}</td>`).join("")}</tr>`).join("")||`<tr><td colspan="6">—</td></tr>`}</tbody></table></div></div>
    <div class="card"><b>${esc(t("emb_avg_days"))}</b>${EMB_KINDS.map(k=>`<div class="sc-line"><span>${esc(t("nav_emb_"+k))}</span><span class="mono">${d.avg_days[k]!=null?esc(abTr("emb_days",{n:String(d.avg_days[k]).replace(".",",")})):"—"}</span></div>`).join("")}<div class="sc-line"><span>${esc(t("emb_appts_total"))}</span><span class="mono">${d.appointments.total} · ${esc(t("emb_ap_no_show"))} ${d.appointments.no_show}</span></div></div>`;
});

// ── Réseau consulaire et réglages ──
SECTOR_PAGE_LOADERS.embposts=embWrap(async el=>{
  await embBase(true);const s=_emb.set;const mgr=embIsMgr();
  el.innerHTML=sectorPageHead(esc(t("nav_emb_posts")),esc(t("emb_posts_sub")))+emb2faBanner()+
    `<div class="card" style="margin-bottom:12px">${s.posts.map(p=>`<div class="sc-line${p.active?"":" sc-off"}"><span><b>${esc(p.name)}</b> <span class="badge ${p.kind==="embassy"?"bp":p.kind==="general"?"bb":"ba"}">${esc(t("emb_pk_"+p.kind))}</span><small class="sc-sm">${esc([p.city,p.address,p.phone].filter(Boolean).join(" · "))}</small></span><span class="sc-hint" style="color:var(--muted)">${esc(t("emb_pk_x_"+p.kind))}</span>${mgr?`<button class="btn btn-o btn-sm" onclick="embPostModal('${p.id}')"><i class="ti ti-pencil"></i></button>`:""}</div>`).join("")}
      ${mgr?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-g btn-sm" onclick="embPostModal('','general')"><i class="ti ti-plus"></i> ${esc(t("emb_add_general"))}</button><button class="btn btn-o btn-sm" onclick="embPostModal('','honorary')"><i class="ti ti-plus"></i> ${esc(t("emb_add_honorary"))}</button></div>`:""}</div>
    ${mgr?`<div class="card"><b>${esc(t("emb_settings"))}</b>
      <div class="grid3" style="margin-top:10px"><div class="fgrp"><label class="fl">${esc(t("emb_country"))}</label><input class="inp" id="es-c" value="${esc(s.country||"")}"></div><div class="fgrp"><label class="fl">${esc(t("carts_currency"))}</label><select class="inp" id="es-m">${["USD","EUR","CDF","XAF","XOF","MAD"].map(c=>`<option ${c===s.currency?"selected":""}>${c}</option>`).join("")}</select></div><div class="fgrp"><label class="fl">${esc(t("emb_slug"))}</label><input class="inp" id="es-s" value="${esc(s.slug)}"></div></div>
      <div class="grid3">${EMB_KINDS.map(k=>`<div class="fgrp"><label class="fl">${esc(t("emb_fee"))} · ${esc(t("nav_emb_"+k+"_short"))}</label><input class="inp es-f" data-k="${k}" type="number" min="0" step="any" value="${(s.fees||{})[k]??0}"></div>`).join("")}</div>
      <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("emb_open"))}</label><input class="inp" type="time" id="es-o" value="${esc(s.open)}"></div><div class="fgrp"><label class="fl">${esc(t("emb_close"))}</label><input class="inp" type="time" id="es-x" value="${esc(s.close)}"></div><div class="fgrp"><label class="fl">${esc(t("emb_slot_min"))}</label><input class="inp" type="number" min="5" max="120" id="es-l" value="${s.slot_min}"></div></div>
      <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("emb_per_slot"))}</label><input class="inp" type="number" min="1" max="50" id="es-p" value="${s.per_slot}"></div><label class="sc-chk"><input type="checkbox" id="es-b" ${s.online_booking?"checked":""}> ${esc(t("emb_online_booking"))}</label><label class="sc-chk"><input type="checkbox" id="es-2" ${s.require_2fa?"checked":""}> ${esc(t("emb_require_2fa"))}</label></div>
      <div class="emb-svcs">${[0,1,2,3,4,5,6].map(d=>`<label class="sc-chk"><input type="checkbox" class="es-d" value="${d}" ${s.days.includes(d)?"checked":""}> ${esc(scDayName(d))}</label>`).join("")}</div>
      <button class="btn btn-g btn-sm" onclick="embSaveSettings()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button><div class="sc-hint" id="es-h"></div></div>`:""}`;
});
function embPostModal(id,kind){
  const p=(_emb.set.posts||[]).find(x=>x.id===id)||{kind,active:true};
  zdModal("modal-emb",`<div class="modal-title"><i class="ti ti-building" style="color:#818cf8"></i> ${esc(id?p.name:t(kind==="general"?"emb_add_general":"emb_add_honorary"))}</div>
    <div class="fgrp"><label class="fl">${esc(t("sc_name"))} *</label><input class="inp" id="ep-n" value="${esc(p.name||(kind?t("emb_pk_"+kind):""))}"></div><div class="grid2"><div class="fgrp"><label class="fl">${esc(t("emb_city"))}</label><input class="inp" id="ep-c" value="${esc(p.city||"")}"></div><div class="fgrp"><label class="fl">${esc(t("pb_phone"))}</label><input class="inp" id="ep-ph" value="${esc(p.phone||"")}"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("sc_address"))}</label><input class="inp" id="ep-a" value="${esc(p.address||"")}"></div>${id&&p.kind!=="embassy"?`<label class="sc-chk"><input type="checkbox" id="ep-act" ${p.active?"checked":""}> ${esc(t("emb_post_active"))}</label>`:""}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-emb')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="embSavePost('${id||""}','${p.kind}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,520);
}
async function embSavePost(id,kind){
  const b={kind,name:zdVal("ep-n"),city:zdVal("ep-c")||null,address:zdVal("ep-a")||null,phone:zdVal("ep-ph")||null};const act=document.getElementById("ep-act");if(act)b.active=act.checked;
  if(b.name.length<2){flagMissingFields([document.getElementById("ep-n")]);return;}
  try{id?await api("PATCH",`/embassy/posts/${id}`,b):await api("POST","/embassy/posts",b);zdCloseModal("modal-emb");navigate("embposts");}catch(e){showToast(e.message,"error");}
}
async function embSaveSettings(){
  const fees={};document.querySelectorAll(".es-f").forEach(i=>fees[i.dataset.k]=parseFloat(i.value)||0);
  const b={country:zdVal("es-c"),currency:zdVal("es-m"),slug:zdVal("es-s"),fees,open:zdVal("es-o"),close:zdVal("es-x"),slot_min:parseInt(zdVal("es-l"),10)||20,per_slot:parseInt(zdVal("es-p"),10)||1,
    online_booking:document.getElementById("es-b").checked,require_2fa:document.getElementById("es-2").checked,days:[...document.querySelectorAll(".es-d:checked")].map(c=>+c.value)};
  try{_emb.set=await api("PUT","/embassy/settings",b);showToast(t("toast_saved"));navigate("embposts");}catch(e){const h=document.getElementById("es-h");h.style.color="var(--red)";h.textContent=e.message;}
}

// ── Espace usager : démarches et rendez-vous ──
if(typeof CS_GROUPS==="object")CS_GROUPS.consular="cs_tab_consular";
if(typeof csItem==="function"){
  const _csItemSc=csItem;
  csItem=function(it){
    if(it.kind==="consular"){
      const i=it.steps.indexOf(it.status);window._csConsular=window._csConsular||{};window._csConsular[it.id]=it;
      return `<div class="cs-item card2"><div class="cs-item-h"><div><div class="cs-biz">${esc(it.business||"")}</div><b>${esc(t("nav_emb_"+(it.case_kind||"visa")))} · ${esc(it.number)}</b></div>${embStBadge(it.status)}</div>
        <div class="cs-line">${esc(it.post_name)}${it.reference_no?" · "+esc(it.reference_no):""}</div><div class="cs-line">${esc(abTr("cs_emb_step",{a:Math.max(1,i+1),b:it.steps.length}))}${it.fee>0?" · "+esc(it.paid?t("emb_paid"):t("emb_unpaid")):""}</div>
        ${(it.alerts||[]).filter(a=>!a.reply).map(a=>`<div class="cs-line" style="color:var(--amber)">🚨 ${esc(a.title)}</div>`).join("")}
        <div class="cs-actions"><a class="btn btn-sm btn-g" href="?demarche=${encodeURIComponent(it.token)}"><i class="ti ti-external-link"></i> ${esc(t("cs_open"))}</a><button class="btn btn-sm btn-o" onclick="csRemove('${it.id}')"><i class="ti ti-x"></i> ${esc(t("cs_remove"))}</button></div></div>`;
    }
    if(it.kind==="consular_appt")return `<div class="cs-item card2"><div class="cs-item-h"><div><div class="cs-biz">${esc(it.business||"")}</div><b>${esc(t("emb_appt_t"))} · ${esc(t("nav_emb_"+it.service))}</b></div><span class="badge ${it.status==="cancelled"||it.status==="no_show"?"br":"bb"}">${esc(t("emb_ap_"+it.status))}</span></div>
      <div class="cs-line">${esc(abDate(it.day))} · ${esc(it.time)} · ${esc(it.post_name)}</div>${it.post_address?`<div class="cs-line">${esc(it.post_address)}</div>`:""}${it.queue_no?`<div class="cs-line">${esc(abTr("emb_ticket",{n:it.queue_no}))}</div>`:""}
      <div class="cs-actions"><button class="btn btn-sm btn-o" onclick="csRemove('${it.id}')"><i class="ti ti-x"></i> ${esc(t("cs_remove"))}</button></div></div>`;
    return _csItemSc(it);
  };
}
if(typeof csParseLink==="function"){
  const _csParseSc=csParseLink;
  csParseLink=function(v){try{const q=new URL((v||"").trim(),window.location.origin).searchParams;if(q.get("demarche"))return{kind:"consular",token:q.get("demarche")};}catch(_){}return _csParseSc(v);};
}
function embPubShell(title){
  document.getElementById("auth-screen").style.display="none";const land=document.getElementById("landing");if(land)land.style.display="none";
  document.getElementById("portal-view").style.display="block";document.getElementById("portal-company").textContent=title||"";return document.getElementById("portal-content");
}
async function checkEmbassyCaseView(){
  const tok=new URLSearchParams(window.location.search).get("demarche");if(!tok)return false;
  if(State.token&&typeof zdClientLink==="function")zdClientLink("consular",tok);
  const box=embPubShell("");
  try{const r=await fetch(`${API_BASE}/public/embassy/case/${encodeURIComponent(tok)}`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"");
    _emb.set=_emb.set||{currency:d.currency};document.getElementById("portal-company").textContent=d.business;const i=d.steps.indexOf(d.status);
    box.innerHTML=`<div class="card2" style="margin-bottom:12px"><b style="font-size:16px">${esc(t("nav_emb_"+d.kind))} · ${esc(d.number)}</b><div style="font-size:13px;color:var(--muted)">${esc(d.applicant_name)} · ${esc(d.post_name)}${d.post_address?" · "+esc(d.post_address):""}</div></div>
      <div class="emb-steps">${d.steps.map((s,k)=>`<div class="${k<i||d.status==="delivered"?"done":k===i?"cur":""}"><span>${k+1}</span>${esc(embSt(s))}</div>`).join("")}${["refused","cancelled"].includes(d.status)?`<div class="ko cur"><span>✕</span>${esc(embSt(d.status))}</div>`:""}</div>
      <div class="card2" style="margin:12px 0">${d.reference_no?`<div class="sc-line"><span>${esc(t("emb_reference"))}</span><b>${esc(d.reference_no)}</b></div>`:""}${d.fee>0?`<div class="sc-line"><span>${esc(t("emb_fee"))}</span><span>${embMoney(d.fee)} ${d.paid?`<span class="badge bg">${esc(t("emb_paid"))}${d.receipt_no?" · "+esc(d.receipt_no):""}</span>`:`<span class="badge ba">${esc(t("emb_unpaid"))}</span>`}</span></div>`:""}
        ${d.timeline.slice().reverse().map(h=>`<div class="sc-line"><span>${esc(fmtDate(h.at))}</span><span>${esc(t("emb_ev_"+h.event))}${h.to&&h.event!=="assign"?" · "+esc(h.event==="transfer"?h.to:embSt(h.to)):""}</span></div>`).join("")}</div>
      ${(d.alerts||[]).map(a=>`<div class="card2 emb-alert ${a.level}"><b>🚨 ${esc(a.title)}</b><div style="margin:6px 0">${esc(a.message)}</div>${a.reply?`<span class="badge bg">${esc(t("emb_r_"+a.reply))}</span>`:""}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${["safe","help","repatriate"].map(s=>`<button class="btn btn-sm ${s==="safe"?"btn-g":"btn-o"}" onclick="embReply('${a.id}','${escJs(tok)}','${s}')">${esc(t("emb_r_"+s))}</button>`).join("")}</div></div>`).join("")}
      ${State.token?"":`<div class="card2"><div style="font-size:13px;color:var(--muted);margin-bottom:8px">${esc(t("cs_emb_keep"))}</div><button class="btn btn-g btn-sm" onclick="localStorage.setItem('zd_pending_consular','${escJs(tok)}');document.getElementById('portal-view').style.display='none';showAuthTab('register');document.getElementById('auth-screen').style.display=''"><i class="ti ti-user-plus"></i> ${esc(t("cs_emb_keep_go"))}</button></div>`}`;
  }catch(e){box.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message||t("emb_case_bad"))}</div>`;}
  return true;
}
async function embReply(aid,tok,s){try{const r=await fetch(`${API_BASE}/public/embassy/alerts/${aid}/reply`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:tok,status:s})});if(!r.ok)throw new Error((await r.json()).detail||"");showToast(t("emb_reply_ok"));checkEmbassyCaseView();}catch(e){showToast(e.message,"error");}}
let _embPub={slug:null,d:null,post:null,service:"visa",day:null,time:null};
async function checkEmbassyBookingView(){
  const slug=new URLSearchParams(window.location.search).get("consulat");if(!slug)return false;
  const box=embPubShell("");
  try{const r=await fetch(`${API_BASE}/public/embassy/${encodeURIComponent(slug)}`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"");
    _embPub={slug,d,post:d.posts[0]?.id,service:d.posts[0]?.services[0]||"visa",day:d.today,time:null};_emb.set=_emb.set||{currency:d.currency};
    document.getElementById("portal-company").textContent=d.name;await embPubRender();
  }catch(e){box.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;}
  return true;
}
async function embPubRender(){
  const box=document.getElementById("portal-content");const d=_embPub.d;const p=d.posts.find(x=>x.id===_embPub.post)||d.posts[0];
  let slots=[];try{const r=await fetch(`${API_BASE}/public/embassy/${encodeURIComponent(_embPub.slug)}/slots?post_id=${p.id}&day=${_embPub.day}`);slots=(await r.json()).slots||[];}catch(_){}
  const max=new Date(d.today+"T12:00:00");max.setDate(max.getDate()+d.max_days_ahead);
  box.innerHTML=`<h3 style="margin-bottom:6px">${esc(t("emb_pub_t"))}</h3><div style="font-size:13px;color:var(--muted);margin-bottom:12px">${esc(t("emb_pub_x"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("emb_post"))}</label><select class="inp" id="pb-post" onchange="_embPub.post=this.value;_embPub.time=null;embPubRender()">${d.posts.map(x=>`<option value="${x.id}" ${x.id===p.id?"selected":""}>${esc(x.name)}${x.city?" · "+esc(x.city):""}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("emb_service"))}</label><select class="inp" id="pb-svc" onchange="_embPub.service=this.value">${p.services.map(k=>`<option value="${k}" ${k===_embPub.service?"selected":""}>${esc(t("nav_emb_"+k))}${d.fees[k]?" · "+embMoney(d.fees[k]):""}</option>`).join("")}</select></div></div>
    <div class="fgrp"><label class="fl">${esc(t("emb_day"))}</label><input class="inp" type="date" id="pb-day" value="${_embPub.day}" min="${d.today}" max="${max.toISOString().slice(0,10)}" onchange="_embPub.day=this.value;_embPub.time=null;embPubRender()"></div>
    <div class="emb-slots">${slots.length?slots.map(s=>`<button type="button" class="${_embPub.time===s.time?"on":""}" ${s.left<=0?"disabled":""} onclick="_embPub.time='${s.time}';document.querySelectorAll('.emb-slots button').forEach(b=>b.classList.toggle('on',b.textContent.startsWith('${s.time}')))">${s.time}<small>${s.left<=0?esc(t("emb_full")):esc(abTr("emb_left",{n:s.left}))}</small></button>`).join(""):`<div class="sc-hint" style="color:var(--muted)">${esc(t("emb_no_slot"))}</div>`}</div>
    <div class="grid3" style="margin-top:12px"><div class="fgrp"><label class="fl">${esc(t("emb_fullname"))} *</label><input class="inp" id="pb-n"></div><div class="fgrp"><label class="fl">${esc(t("pb_phone"))}</label><input class="inp" id="pb-ph" inputmode="tel"></div><div class="fgrp"><label class="fl">Email</label><input class="inp" id="pb-e" type="email"></div></div>
    <button class="btn btn-g" style="width:100%" onclick="embPubBook()"><i class="ti ti-calendar-event"></i> ${esc(t("emb_book_go"))}</button><div class="sc-hint" id="pb-h"></div>`;
}
async function embPubBook(){
  const b={post_id:_embPub.post,service:zdVal("pb-svc"),day:_embPub.day,time:_embPub.time,name:zdVal("pb-n"),phone:zdVal("pb-ph")||null,email:zdVal("pb-e")||null};const h=document.getElementById("pb-h");
  if(!b.time){h.style.color="var(--red)";h.textContent=t("emb_pick_slot");return;}
  if(b.name.length<2||!(b.phone||b.email)){h.style.color="var(--red)";h.textContent=t("emb_need_contact");return;}
  try{const r=await fetch(`${API_BASE}/public/embassy/${encodeURIComponent(_embPub.slug)}/appointments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});const d=await r.json();if(!r.ok)throw new Error(d.detail||"");
    if(State.token&&typeof zdClientLink==="function")zdClientLink("consular_appt",d.token);else{try{localStorage.setItem("zd_pending_consular_appt",d.token);}catch(_){}}
    document.getElementById("portal-content").innerHTML=`<div class="card2 sc-verify ok"><i class="ti ti-calendar-check"></i><div><b>${esc(t("emb_booked_t"))}</b><div>${esc(abDate(d.day))} · ${esc(d.time)} · ${esc(d.post_name)}</div><div>${esc(t("nav_emb_"+d.service))}${d.address?" · "+esc(d.address):""}</div></div></div>
      <div class="card2" style="margin-top:12px;font-size:13px;color:var(--muted)">${esc(t(State.token?"emb_booked_saved":"emb_booked_keep"))}</div>`;
  }catch(e){h.style.color="var(--red)";h.textContent=e.message;}
}
if(typeof checkSectorPublicViews==="function"){
  const _cspvE=checkSectorPublicViews;
  checkSectorPublicViews=async function(){if(await checkEmbassyCaseView())return true;if(await checkEmbassyBookingView())return true;return _cspvE();};
}
async function zdLinkPendingConsular(){
  if(!State.token||typeof zdClientLink!=="function")return;
  for(const [k,kind] of [["zd_pending_consular","consular"],["zd_pending_consular_appt","consular_appt"]]){let tok=null;try{tok=localStorage.getItem(k);localStorage.removeItem(k);}catch(_){}if(tok)await zdClientLink(kind,tok);}
}
if(typeof zdShowClientApp==="function"){const _zscaE=zdShowClientApp;zdShowClientApp=async function(){await zdLinkPendingConsular();return _zscaE.apply(this,arguments);};}
if(typeof zdAfterAppLayout==="function"){const _zaalE=zdAfterAppLayout;zdAfterAppLayout=function(){_zaalE.apply(this,arguments);zdLinkPendingConsular();};}
function embNextSlot(day){const st=_emb.set||{};const hm=v=>{const p=String(v||"0:0").split(":");return (+p[0])*60+(+p[1]||0);};const fm=m=>String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");const a=hm(st.open||"08:30"),b=hm(st.close||"15:00"),step=+st.slot_min||20;const loc=new Date(Date.now()+(+st.tz_offset_min||0)*60000);const today=loc.toISOString().slice(0,10);if(day!==today)return fm(a);const now=loc.getUTCHours()*60+loc.getUTCMinutes();for(let m=a;m+step<=b;m+=step)if(m>now)return fm(m);return fm(a);}
