// ── 9.3 · SECTEUR ÉCOLE ──
const _sc={set:null,classes:null,teachers:null,ov:null,f:{cls:"",q:"",status:"active"},att:{cls:"",day:null,rows:[]},gr:{cls:"",period:"0",course:""},
  ex:{cls:"",period:"0"},fee:{cls:"",status:""},svc:{sel:null},lib:{q:""},doc:{sid:""},file:null,fileTab:"info"};
const SC_DAYS=[0,1,2,3,4,5];
function scMgr(){return !(typeof isTeamMember==="function"&&isTeamMember())||zdIsMgrRole();}
function scNum(v,d){return (Math.round((+v||0)*100)/100).toLocaleString("fr-FR",{maximumFractionDigits:d??2}).replace(/[   ]/g," ");}
function scMoney(v){const c=_sc.set?.currency||"USD";return scNum(v)+" "+(c==="CDF"?"FC":c==="USD"?"$":c);}
function scPct(v){return v==null?"—":scNum(v,1)+" %";}
function scMention(k){return k?(["gd","d","s","e"].includes(k)?t("sc_m_"+k):k):"—";}
function scMentionBadge(k,passed){return k?`<span class="badge ${passed===false||k==="e"?"br":"bg"}">${esc(scMention(k))}</span>`:(passed===false?`<span class="badge br">${esc(t("sc_adjourned"))}</span>`:"");}
function scEvals(){return _sc.set?.grading?.evals||[];}
function scRank(r,n){return r?abTr("sc_rank_of",{r,n}):"—";}
function scDayName(d){return typeof bkDayName==="function"?bkDayName(d):["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"][d];}
function scPeriods(){return _sc.set?.periods||[];}
function scPeriodName(p){return p==="year"||p===-1?t("sc_year_all"):(scPeriods()[+p]||"");}
async function scBase(force){
  const jobs=[];
  if(force||!_sc.set)jobs.push(api("GET","/school/settings").then(r=>_sc.set=r));
  if(force||!_sc.classes)jobs.push(api("GET","/school/classes").then(r=>_sc.classes=r));
  if(force||!_sc.teachers)jobs.push(api("GET","/school/teachers").then(r=>_sc.teachers=r));
  await Promise.all(jobs);
}
function scClassOpts(sel,all){return (all?`<option value="">${esc(t(all))}</option>`:"")+(_sc.classes||[]).map(c=>`<option value="${c.id}" ${c.id===sel?"selected":""}>${esc(c.name)}</option>`).join("");}
function scPeriodOpts(sel,withYear){return scPeriods().map((p,i)=>`<option value="${i}" ${String(i)===String(sel)?"selected":""}>${esc(p)}</option>`).join("")+(withYear?`<option value="year" ${sel==="year"?"selected":""}>${esc(t("sc_year_all"))}</option>`:"");}
function scTeacherOpts(sel){return `<option value="">${esc(t("sc_no_teacher"))}</option>`+(_sc.teachers||[]).filter(x=>x.active||x.id===sel).map(x=>`<option value="${x.id}" ${x.id===sel?"selected":""}>${esc(x.name)}</option>`).join("");}
let _scStudents=null;
async function scStudentsAll(force){if(force||!_scStudents)_scStudents=await api("GET","/school/students");return _scStudents;}
function scStudentOpts(list,sel){
  const by={};list.forEach(s=>{(by[s.class_name||t("sc_no_class")]=by[s.class_name||t("sc_no_class")]||[]).push(s);});
  return `<option value="">${esc(t("sc_pick_student"))}</option>`+Object.entries(by).map(([c,ss])=>`<optgroup label="${esc(c)}">${ss.map(s=>`<option value="${s.id}" ${s.id===sel?"selected":""}>${esc(s.name)} · ${esc(s.matricule)}</option>`).join("")}</optgroup>`).join("");
}
function scNoClass(el,msg){el.innerHTML=sectorPageHead(esc(t(msg)),"")+`<div class="card">${zdEmpty(t(!scMgr()&&(State.tenant||{}).member_role==="sc_teacher"?"sc_no_class_mine":"sc_need_class"),"building")}<div style="text-align:center;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${scMgr()?`<button class="btn btn-g btn-sm" onclick="navigate('schoolclasses')"><i class="ti ti-plus"></i> ${esc(t("sc_add_class"))}</button>`:""}</div></div>`;}
function scWaBtn(url){return url?`<a class="btn btn-o btn-sm" href="${esc(url)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>`:"";}

// ── Élèves et inscriptions ──
SECTOR_PAGE_LOADERS.schoolstudents=async el=>{
  await scBase();
  const [ov,list]=await Promise.all([api("GET","/school/overview"),api("GET",`/school/students?status=${_sc.f.status}${_sc.f.cls?`&class_id=${_sc.f.cls}`:""}${_sc.f.q?`&q=${encodeURIComponent(_sc.f.q)}`:""}`)]);
  _sc.ov=ov;
  if(!_sc.classes.length&&!list.length){scNoClass(el,"nav_school_students");return;}
  const mgr=scMgr();
  el.innerHTML=sectorPageHead(esc(t("nav_school_students")),esc(abTr("sc_students_sub",{n:ov.students,y:ov.year})),
    `<button class="btn btn-g btn-sm" onclick="scEnrolModal()"><i class="ti ti-user-plus"></i> ${esc(t("sc_enrol"))}</button>${mgr?`<button class="btn btn-o btn-sm" onclick="scPromoteModal()"><i class="ti ti-arrow-up-right"></i> ${esc(t("sc_promote"))}</button>`:""}`)+
    `<div class="kgrid" style="margin-bottom:12px">
      <div class="kpi g"><div class="kl">${esc(t("sc_k_students"))}</div><div class="kv">${ov.students}</div></div>
      <div class="kpi b"><div class="kl">${esc(t("sc_k_present"))}</div><div class="kv">${ov.attendance.pct==null?"—":ov.attendance.pct+" %"}</div></div>
      <div class="kpi a"><div class="kl">${esc(t("sc_k_fees"))}</div><div class="kv" style="font-size:16px">${scMoney(ov.fees.paid)} / ${scMoney(ov.fees.total)}</div></div>
      <div class="kpi r" style="cursor:pointer" onclick="navigate('schoolfees')"><div class="kl">${esc(t("sc_k_late"))}</div><div class="kv">${ov.late_families}</div></div></div>
    <div class="card" style="margin-bottom:12px"><div class="sc-filters">
      <select class="inp" onchange="_sc.f.cls=this.value;navigate('schoolstudents')" aria-label="${esc(t("sc_class"))}">${scClassOpts(_sc.f.cls,"sc_all_classes")}</select>
      <input class="inp" id="sc-q" placeholder="${esc(t("sc_search_ph"))}" value="${esc(_sc.f.q)}" onkeydown="if(event.key==='Enter'){_sc.f.q=this.value.trim();navigate('schoolstudents')}">
      <select class="inp" onchange="_sc.f.status=this.value;navigate('schoolstudents')" aria-label="${esc(t("sc_status"))}"><option value="active" ${_sc.f.status==="active"?"selected":""}>${esc(t("sc_st_active"))}</option><option value="left" ${_sc.f.status==="left"?"selected":""}>${esc(t("sc_st_left"))}</option></select>
      <button class="btn btn-o btn-sm" onclick="_sc.f.q=zdVal('sc-q');navigate('schoolstudents')"><i class="ti ti-search"></i></button></div></div>
    <div class="card">${list.length?`<div class="sc-list">${list.map(s=>`<button type="button" class="sc-stu" onclick="scOpenStudent('${s.id}')">
        <span class="sc-av ${s.gender==="F"?"f":""}">${esc((s.first_name||"?")[0])}</span>
        <span class="sc-stu-m"><b>${esc(s.name)}</b><small>${esc(s.matricule)} · ${esc(s.class_name||t("sc_no_class"))}${s.parent_phone?" · "+esc(s.parent_phone):""}</small></span>
        <span class="sc-stu-r">${s.siblings?`<span class="badge bb">${esc(abTr("sc_siblings_n",{n:s.siblings}))}</span>`:""}${s.late>0?`<span class="badge br">${esc(t("sc_late"))} ${scMoney(s.late)}</span>`:s.balance>0?`<span class="badge ba">${scMoney(s.balance)}</span>`:""}</span></button>`).join("")}</div>`:zdEmpty(t("sc_no_students"),"users")}</div>`;
};
function scStudentForm(s){
  const isNew=!s;s=s||{};const g=s.gender||"";const defCls=isNew?(_sc.f.cls||(_sc.classes||[])[0]?.id||""):(s.class_id||"");
  return `<div class="grid2"><div class="fgrp"><label class="fl">${esc(t("sc_last_name"))} *</label><input class="inp" id="st-ln" value="${esc(s.last_name||"")}"></div><div class="fgrp"><label class="fl">${esc(t("sc_first_name"))} *</label><input class="inp" id="st-fn" value="${esc(s.first_name||"")}"></div></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("sc_gender"))}</label><select class="inp" id="st-g"><option value=""></option><option value="F" ${g==="F"?"selected":""}>${esc(t("sc_g_f"))}</option><option value="M" ${g==="M"?"selected":""}>${esc(t("sc_g_m"))}</option></select></div>
      <div class="fgrp"><label class="fl">${esc(t("sc_birth"))}</label><input class="inp" type="date" id="st-bd" value="${esc(s.birth_day||"")}"></div><div class="fgrp"><label class="fl">${esc(t("sc_birth_place"))}</label><input class="inp" id="st-bp" value="${esc(s.birth_place||"")}"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("sc_class"))}</label><select class="inp" id="st-cl">${scClassOpts(defCls,"sc_no_class")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("sc_discount"))}</label><input class="inp" type="number" min="0" max="100" id="st-dc" value="${s.discount_pct||0}" ${scMgr()?"":"disabled"}></div></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("sc_parent"))}</label><input class="inp" id="st-pn" value="${esc(s.parent_name||"")}"></div><div class="fgrp"><label class="fl">${esc(t("sc_parent_phone"))}</label><input class="inp" id="st-pp" inputmode="tel" value="${esc(s.parent_phone||"")}"></div>
      <div class="fgrp"><label class="fl">${esc(t("sc_parent_email"))}</label><input class="inp" type="email" id="st-pe" value="${esc(s.parent_email||"")}"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("sc_address"))}</label><input class="inp" id="st-ad" value="${esc(s.address||"")}"></div>
    <div class="fgrp"><label class="fl">${esc(t("sc_notes"))}</label><textarea class="inp" id="st-no" rows="2">${esc(s.notes||"")}</textarea></div>`;
}
function scStudentBody(){return {last_name:zdVal("st-ln"),first_name:zdVal("st-fn"),gender:zdVal("st-g")||null,birth_day:zdVal("st-bd")||null,birth_place:zdVal("st-bp")||null,class_id:zdVal("st-cl")||null,
  discount_pct:zdNum("st-dc")||0,parent_name:zdVal("st-pn")||null,parent_phone:zdVal("st-pp")||null,parent_email:zdVal("st-pe")||null,address:zdVal("st-ad")||null,notes:zdVal("st-no")||null};}
function scDropHidden(id){const m=document.getElementById(id);if(m&&m.style.display!=="flex")m.remove();}
function scEnrolModal(){
  scDropHidden("modal-scf");
  zdModal("modal-sc",`<div class="modal-title"><i class="ti ti-user-plus" style="color:var(--green)"></i> ${esc(t("sc_enrol"))}</div>${scStudentForm()}<div class="sc-hint" id="st-h"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-sc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="scEnrol()"><i class="ti ti-check"></i> ${esc(t("sc_enrol_go"))}</button></div>`,640);
}
async function scEnrol(){
  const b=scStudentBody();if(!b.last_name||!b.first_name){flagMissingFields([document.getElementById(!b.last_name?"st-ln":"st-fn")]);return;}
  try{const r=await api("POST","/school/students",b);_scStudents=null;zdCloseModal("modal-sc");showToast(abTr("sc_enrol_ok",{n:r.name,m:r.matricule})+(r.siblings_names?.length?" · "+abTr("sc_siblings_found",{n:r.siblings_names.join(", ")}):""));await scBase(true);navigate("schoolstudents");}
  catch(e){const h=document.getElementById("st-h");if(h){h.style.color="var(--red)";h.textContent=e.message;}}
}
async function scPromoteModal(){
  const all=await scStudentsAll(true);
  zdModal("modal-sc",`<div class="modal-title"><i class="ti ti-arrow-up-right" style="color:var(--green)"></i> ${esc(t("sc_promote"))}</div><div style="font-size:12px;color:var(--muted);margin-bottom:10px">${esc(t("sc_promote_x"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("sc_from_class"))}</label><select class="inp" id="pr-from" onchange="scPromoteList()">${scClassOpts("")}</select></div>
      <div class="fgrp"><label class="fl">${esc(t("sc_to_class"))}</label><select class="inp" id="pr-to"><option value="__leave">${esc(t("sc_leave_school"))}</option>${scClassOpts("")}</select></div></div>
    <label style="font-size:12px;display:flex;gap:6px;align-items:center;margin-bottom:6px"><input type="checkbox" id="pr-all" checked onchange="document.querySelectorAll('.pr-s').forEach(c=>c.checked=this.checked)"> ${esc(t("sc_select_all"))}</label>
    <div id="pr-list" class="sc-checks"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-sc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="scPromote()"><i class="ti ti-check"></i> ${esc(t("sc_promote_go"))}</button></div>`,600);
  const to=document.getElementById("pr-to");if(to&&to.options.length>2)to.selectedIndex=2;
  scPromoteList();
}
function scPromoteList(){const cid=zdVal("pr-from");const box=document.getElementById("pr-list");if(!box)return;const ss=(_scStudents||[]).filter(s=>s.class_id===cid);
  box.innerHTML=ss.length?ss.map(s=>`<label><input type="checkbox" class="pr-s" value="${s.id}" checked> ${esc(s.name)}</label>`).join(""):`<div class="sc-hint">${esc(t("sc_no_students"))}</div>`;}
async function scPromote(){
  const ids=[...document.querySelectorAll(".pr-s:checked")].map(c=>c.value);if(!ids.length){showToast(t("sc_pick_students"),"error");return;}
  const to=zdVal("pr-to"),leave=to==="__leave";
  if(leave&&!confirm(abTr("sc_leave_confirm",{n:ids.length})))return;
  try{const r=await api("POST","/school/students/promote",{to_class_id:leave?null:to,student_ids:ids,leave});_scStudents=null;zdCloseModal("modal-sc");showToast(abTr("sc_promote_ok",{n:r.count}));await scBase(true);navigate("schoolstudents");}catch(e){showToast(e.message,"error");}
}
async function scOpenStudent(id,tab){
  try{_sc.file=await api("GET",`/school/students/${id}`);}catch(e){showToast(e.message,"error");return;}
  if(tab)_sc.fileTab=tab;scRenderFile();
}
function scRenderFile(){
  const s=_sc.file;if(!s)return;scDropHidden("modal-sc");const tab=_sc.fileTab;const mgr=scMgr();
  const tabs=[["info","sc_tab_info"],["grades","sc_tab_grades"],["att","sc_tab_att"],["fees","sc_tab_fees"],["disc","sc_tab_disc"],["more","sc_tab_more"],["parent","sc_tab_parent"]];
  let body="";
  if(tab==="info")body=scStudentForm(s)+`<div class="sc-hint" id="st-h"></div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button class="btn btn-g btn-sm" onclick="scSaveStudent()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button></div>`+
    (s.siblings.length?`<div class="sc-sub">${esc(t("sc_siblings"))}</div>${s.siblings.map(x=>`<div class="sc-line"><a href="#" onclick="event.preventDefault();scOpenStudent('${x.id}','info')">${esc(x.name)}</a><span>${esc(x.class_name||"")}</span></div>`).join("")}`:"")+
    `<div class="sc-sub">${esc(t("sc_history"))}</div>${(s.history||[]).map(h=>`<div class="sc-line"><span>${esc(abDate(h.day))}</span><span>${esc(t("sc_ev_"+h.event)!=="sc_ev_"+h.event?t("sc_ev_"+h.event):h.event)}${h.year?" · "+esc(h.year):""}</span></div>`).join("")||`<div class="sc-hint">—</div>`}`;
  else if(tab==="grades")body=s.periods.map(p=>`<div class="sc-line"><span><b>${esc(p.name)}</b></span><span>${p.max?`${scPct(p.pct)} ${scMentionBadge(p.mention,p.passed)} · ${esc(scRank(p.rank,p.class_size))}`:"—"}</span><span>${p.max?`<button class="btn btn-o btn-sm" onclick="scBulletin('${s.id}','${p.index}')"><i class="ti ti-file-text"></i> ${esc(t("sc_bulletin"))}</button>`:""}</span></div>`).join("")+
    `<div style="margin-top:10px"><button class="btn btn-o btn-sm" onclick="scBulletin('${s.id}','year')"><i class="ti ti-file-text"></i> ${esc(t("sc_bulletin_year"))}</button></div>`;
  else if(tab==="att")body=`<div class="kgrid" style="margin-bottom:10px"><div class="kpi r"><div class="kl">${esc(t("sc_absences"))}</div><div class="kv">${s.attendance.absent}</div></div><div class="kpi a"><div class="kl">${esc(t("sc_lates"))}</div><div class="kv">${s.attendance.late}</div></div><div class="kpi b"><div class="kl">${esc(t("sc_unjustified"))}</div><div class="kv">${s.attendance.unjustified}</div></div></div>`+
    (s.attendance.recent.map(a=>`<div class="sc-line"><span>${esc(abDate(a.day))}</span><span>${scAttBadge(a.status)}${a.justified?` <span class="badge bb">${esc(t("sc_justified"))}</span>`:""}</span><span>${esc(a.note||"")}</span></div>`).join("")||zdEmpty(t("sc_no_absence"),"checklist"));
  else if(tab==="fees")body=scFeeTable(s.fees,true)||zdEmpty(t("sc_no_fees"),"cash");
  else if(tab==="disc")body=(s.incidents.map(i=>`<div class="sc-inc"><div><b>${esc(t("sc_inc_"+i.kind))}</b> · ${esc(abDate(i.day))}${i.by_name?" · "+esc(i.by_name):""}</div><div>${esc(i.description)}</div>${i.sanction?`<div class="sc-hint" style="color:var(--amber)">${esc(t("sc_sanction"))} : ${esc(i.sanction)}</div>`:""}</div>`).join("")||zdEmpty(t("sc_no_incident"),"shield-check"))+
    `<div style="margin-top:10px"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-scf');_sc.disc={sid:'${s.id}'};navigate('schooldiscipline')"><i class="ti ti-plus"></i> ${esc(t("sc_inc_add"))}</button></div>`;
  else if(tab==="more")body=`<div class="sc-sub">${esc(t("nav_school_services"))}</div>${s.services.map(v=>`<div class="sc-line"><span>${esc(t(v.kind==="canteen"?"sc_canteen":"sc_transport"))}</span><span>${esc(v.name)}</span></div>`).join("")||`<div class="sc-hint">—</div>`}
    <div class="sc-sub">${esc(t("nav_school_library"))}</div>${s.loans.map(l=>`<div class="sc-line"><span>${esc(l.title)}</span><span>${esc(abDate(l.out_day))} → ${esc(abDate(l.due_day))}</span><span>${l.returned_day?`<span class="badge bg">${esc(t("sc_returned"))}</span>`:`<span class="badge ba">${esc(t("sc_on_loan"))}</span>`}</span></div>`).join("")||`<div class="sc-hint">—</div>`}
    <div class="sc-sub">${esc(t("nav_school_docs"))}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${["attest","certif","card"].map(k=>`<button class="btn btn-o btn-sm" onclick="scDoc('${s.id}','${k}')"><i class="ti ti-file-certificate"></i> ${esc(t("sc_doc_"+k))}</button>`).join("")}</div>`;
  else if(tab==="parent")body=`<div style="font-size:13px;color:var(--muted);margin-bottom:10px">${esc(t("sc_parent_x"))}</div><div id="sc-plink" class="sc-hint">${esc(t("loading"))}</div>`;
  zdModal("modal-scf",`<div class="modal-title"><span class="sc-av ${s.gender==="F"?"f":""}">${esc((s.first_name||"?")[0])}</span> ${esc(s.name)} <span class="badge bb">${esc(s.matricule)}</span>${s.status==="left"?` <span class="badge br">${esc(t("sc_st_left"))}</span>`:""}</div>
    <div style="font-size:12px;color:var(--muted);margin:-4px 0 10px">${esc(s.class_name||t("sc_no_class"))}${s.parent_name?" · "+esc(s.parent_name):""}${s.parent_phone?" · "+esc(s.parent_phone):""}</div>
    <div class="sc-tabs" role="tablist">${tabs.map(([k,l])=>`<button type="button" role="tab" aria-selected="${k===tab}" class="${k===tab?"on":""}" onclick="_sc.fileTab='${k}';scRenderFile()">${esc(t(l))}</button>`).join("")}</div>
    <div class="sc-fbody">${body}</div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-scf')">${esc(t("btn_close"))}</button></div>`,720);
  if(tab==="parent")scParentLink(s.id,false);
}
async function scSaveStudent(){
  const s=_sc.file;const b=scStudentBody();if(!b.last_name||!b.first_name)return;
  if(!scMgr()&&b.discount_pct===(s.discount_pct||0))delete b.discount_pct;
  b.class_id=b.class_id||"";b.parent_email=b.parent_email||"";
  try{await api("PATCH",`/school/students/${s.id}`,b);_scStudents=null;showToast(t("toast_saved"));await scOpenStudent(s.id);if(document.getElementById("page-schoolstudents")?.classList.contains("active"))SECTOR_PAGE_LOADERS.schoolstudents(document.getElementById("page-schoolstudents"));}
  catch(e){const h=document.getElementById("st-h");if(h){h.style.color="var(--red)";h.textContent=e.message;}}
}
async function scParentLink(id,regen){
  const box=document.getElementById("sc-plink");if(!box)return;
  if(regen&&!confirm(t("sc_plink_regen_confirm")))return;
  try{const r=await api("GET",`/school/students/${id}/parent-link${regen?"?regenerate=true":""}`);const s=_sc.file;
    const url=`${window.location.origin}/?eleve=${encodeURIComponent(r.token)}`;
    const msg=abTr("sc_plink_msg",{n:s.first_name,s:_sc.set?.school_name||"",u:url});
    box.style.color="";box.innerHTML=`<div class="sc-plink"><input class="inp" readonly value="${esc(url)}" onclick="this.select()"><button class="btn btn-o btn-sm" onclick="navigator.clipboard?.writeText('${escJs(url)}').then(()=>showToast(t('sc_copied_link')))"><i class="ti ti-copy"></i></button></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${s.parent_phone?`<a class="btn btn-g btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc((s.parent_phone||"").replace(/\D/g,""))}?text=${encodeURIComponent(msg)}"><i class="ti ti-brand-whatsapp"></i> ${esc(t("sc_plink_send"))}</a>`:""}
      ${scMgr()?`<button class="btn btn-o btn-sm" onclick="scParentLink('${id}',true)"><i class="ti ti-refresh"></i> ${esc(t("sc_plink_regen"))}</button>`:""}</div>
      <div class="sc-hint" style="margin-top:8px;color:var(--muted)">${esc(abTr("sc_plink_linked",{n:r.linked}))}</div>`;
  }catch(e){box.style.color="var(--red)";box.textContent=e.message;}
}

// ── Classes, cours et emploi du temps ──
SECTOR_PAGE_LOADERS.schoolclasses=async el=>{
  await scBase(true);const mgr=scMgr();const cl=_sc.classes;
  if(!_sc.cls||!cl.find(c=>c.id===_sc.cls))_sc.cls=cl[0]?.id||"";
  const c=cl.find(x=>x.id===_sc.cls);const tt=c?await api("GET",`/school/timetable?class_id=${c.id}`):[];
  el.innerHTML=sectorPageHead(esc(t("nav_school_classes")),esc(t("sc_classes_sub")),mgr?`<button class="btn btn-g btn-sm" onclick="scClassModal()"><i class="ti ti-plus"></i> ${esc(t("sc_add_class"))}</button>`:"")+
    (cl.length?`<div class="sc-classes">${cl.map(x=>`<button type="button" class="sc-cls${x.id===_sc.cls?" on":""}" onclick="_sc.cls='${x.id}';navigate('schoolclasses')"><b>${esc(x.name)}</b><small>${esc(abTr("sc_cls_line",{n:x.students,c:x.capacity||"∞"}))}${x.titular_name?" · "+esc(x.titular_name):""}</small></button>`).join("")}</div>`:`<div class="card">${zdEmpty(t(!scMgr()&&(State.tenant||{}).member_role==="sc_teacher"?"sc_no_class_mine":"sc_need_class"),"building")}</div>`)+
    (c?`<div class="card" style="margin-bottom:12px"><div class="sc-head"><b>${esc(c.name)}</b><span class="sc-hint" style="color:var(--muted)">${esc([c.level,c.option,c.room].filter(Boolean).join(" · "))}</span>
        ${mgr?`<span style="margin-left:auto;display:flex;gap:6px"><button class="btn btn-o btn-sm" onclick="scClassModal('${c.id}')"><i class="ti ti-pencil"></i></button><button class="btn btn-o btn-sm" onclick="scDelClass('${c.id}')" aria-label="${esc(t("btn_delete"))}"><i class="ti ti-trash"></i></button></span>`:""}</div>
      <div class="sc-sub">${esc(t("sc_courses"))} · ${esc(abTr("sc_max_points",{p:c.max_points}))}</div>
      <div class="tbl-wrap"><table class="sc-t"><thead><tr><th>${esc(t("sc_course"))}</th><th class="r">${esc(t("sc_max_period"))}</th><th>${esc(t("sc_teacher"))}</th><th></th></tr></thead><tbody>
        ${c.courses.map(k=>`<tr><td>${mgr?`<input class="inp" value="${esc(k.name)}" onchange="scPatchCourse('${k.id}',{name:this.value.trim()})" aria-label="${esc(t("sc_course"))}">`:esc(k.name)}</td><td class="r">${mgr?`<input class="inp sc-w" type="number" min="1" max="10000" step="any" value="${k.max}" onchange="if(+this.value>0)scPatchCourse('${k.id}',{max:+this.value})" aria-label="${esc(t("sc_max_period"))}">`:k.max}</td>
          <td>${mgr?`<select class="inp" onchange="scPatchCourse('${k.id}',{teacher_id:this.value})" aria-label="${esc(t("sc_teacher"))}">${scTeacherOpts(k.teacher_id)}</select>`:esc(k.teacher_name||"—")}</td><td class="r">${mgr?`<button class="btn btn-o btn-sm" onclick="scDelCourse('${k.id}')" aria-label="${esc(t("btn_delete"))}"><i class="ti ti-x"></i></button>`:""}</td></tr>`).join("")||`<tr><td colspan="4">${zdEmpty(t("sc_no_course"),"book")}</td></tr>`}
      </tbody></table></div>
      ${mgr?`<div class="sc-form" style="margin-top:10px"><input class="inp" id="nc-n" placeholder="${esc(t("sc_course_ph"))}"><input class="inp" id="nc-w" type="number" min="1" max="10000" step="any" placeholder="${esc(t("sc_max_ph"))}" aria-label="${esc(t("sc_max_period"))}"><select class="inp" id="nc-t" aria-label="${esc(t("sc_teacher"))}">${scTeacherOpts("")}</select><button class="btn btn-o btn-sm" onclick="scAddCourse('${c.id}')"><i class="ti ti-plus"></i> ${esc(t("sc_add_course"))}</button></div>
        ${cl.length>1?`<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--muted)">${esc(t("sc_copy_from"))} <select class="inp" id="cp-from" style="width:auto">${cl.filter(x=>x.id!==c.id).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select><button class="btn btn-o btn-sm" onclick="scCopyCourses('${c.id}')">${esc(t("sc_copy_go"))}</button></div>`:""}`:""}</div>
    <div class="card"><div class="sc-head"><b>${esc(t("sc_timetable"))}</b><button class="btn btn-o btn-sm" style="margin-left:auto" onclick="scPrintTimetable()"><i class="ti ti-printer"></i></button></div>
      <div class="sc-tt">${SC_DAYS.map(d=>`<div class="sc-tt-d"><div class="sc-tt-h">${esc(scDayName(d))}</div>${tt.filter(s=>s.day===d).map(s=>`<div class="sc-slot"><b>${esc(s.start)}–${esc(s.end)}</b><span>${esc(s.course_name)}</span><small>${esc([s.teacher_name,s.room].filter(Boolean).join(" · "))}</small>${mgr?`<button onclick="scDelSlot('${s.id}')" aria-label="${esc(t("btn_delete"))}">×</button>`:""}</div>`).join("")||`<div class="sc-hint" style="color:var(--muted)">—</div>`}</div>`).join("")}</div>
      ${mgr&&c.courses.length?`<div class="sc-form sc-form6" style="margin-top:10px"><select class="inp" id="ns-d" aria-label="${esc(t("sc_day"))}">${SC_DAYS.map(d=>`<option value="${d}">${esc(scDayName(d))}</option>`).join("")}</select><input class="inp" type="time" id="ns-a" value="08:00" aria-label="${esc(t("sc_start"))}"><input class="inp" type="time" id="ns-b" value="09:00" aria-label="${esc(t("sc_end"))}">
        <select class="inp" id="ns-c" aria-label="${esc(t("sc_course"))}">${c.courses.map(k=>`<option value="${k.id}">${esc(k.name)}</option>`).join("")}</select><input class="inp" id="ns-r" placeholder="${esc(t("sc_room"))}" value="${esc(c.room||"")}"><button class="btn btn-o btn-sm" onclick="scAddSlot('${c.id}')"><i class="ti ti-plus"></i> ${esc(t("sc_add_slot"))}</button></div><div class="sc-hint" id="ns-h"></div>`:""}</div>`:"");
};
function scClassModal(id){
  const c=(_sc.classes||[]).find(x=>x.id===id)||{};
  zdModal("modal-sc",`<div class="modal-title"><i class="ti ti-building" style="color:var(--green)"></i> ${esc(t(id?"sc_edit_class":"sc_add_class"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("sc_class_name"))} *</label><input class="inp" id="cl-n" value="${esc(c.name||"")}" placeholder="4e secondaire A"></div><div class="fgrp"><label class="fl">${esc(t("sc_level"))}</label><input class="inp" id="cl-l" value="${esc(c.level||"")}"></div></div>
    <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("sc_option"))}</label><input class="inp" id="cl-o" value="${esc(c.option||"")}"></div><div class="fgrp"><label class="fl">${esc(t("sc_room"))}</label><input class="inp" id="cl-r" value="${esc(c.room||"")}"></div><div class="fgrp"><label class="fl">${esc(t("sc_capacity"))}</label><input class="inp" type="number" min="1" id="cl-c" value="${c.capacity||""}"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("sc_titular"))}</label><select class="inp" id="cl-t">${scTeacherOpts(c.titular_id||"")}</select></div><div class="sc-hint" id="cl-h"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-sc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="scSaveClass('${id||""}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,560);
}
async function scSaveClass(id){
  const b={name:zdVal("cl-n"),level:zdVal("cl-l")||null,option:zdVal("cl-o")||null,room:zdVal("cl-r")||null,capacity:parseInt(zdVal("cl-c"),10)||null,titular_id:zdVal("cl-t")||null};
  if(!b.name){flagMissingFields([document.getElementById("cl-n")]);return;}
  try{const r=id?await api("PATCH",`/school/classes/${id}`,b):await api("POST","/school/classes",b);if(!id)_sc.cls=r.id;zdCloseModal("modal-sc");_sc.classes=null;navigate("schoolclasses");}
  catch(e){const h=document.getElementById("cl-h");h.style.color="var(--red)";h.textContent=e.message;}
}
async function scDelClass(id){if(!confirm(t("sc_del_class_confirm")))return;try{await api("DELETE",`/school/classes/${id}`);_sc.cls="";navigate("schoolclasses");}catch(e){showToast(e.message,"error");}}
async function scAddCourse(cid,back){const n=zdVal("nc-n");const mx=zdNum("nc-w");
  if(!n||!(mx>0)){flagMissingFields([!n?document.getElementById("nc-n"):null,!(mx>0)?document.getElementById("nc-w"):null].filter(Boolean));return;}
  try{await api("POST",`/school/classes/${cid}/courses`,{name:n,max:mx,teacher_id:zdVal("nc-t")||null});_sc.classes=null;
    if(back==="schoolsettings"&&_sc.gb){_sc.classes=await api("GET","/school/classes");scGbRender();showToast(t("toast_saved"));}else navigate(back||"schoolclasses");}catch(e){showToast(e.message,"error");}}
async function scPatchCourse(id,b,back){const pg=back||"schoolclasses";if(b.name==="")return navigate(pg);
  const keep=pg==="schoolsettings"&&_sc.gb;
  try{await api("PATCH",`/school/courses/${id}`,b);_sc.classes=null;showToast(t("toast_saved"));if(keep){_sc.classes=await api("GET","/school/classes");scGbRender();}else navigate(pg);}
  catch(e){showToast(e.message,"error");if(keep){_sc.classes=await api("GET","/school/classes");scGbRender();}else navigate(pg);}}
async function scDelCourse(id){if(!confirm(t("sc_del_course_confirm")))return;try{await api("DELETE",`/school/courses/${id}`);navigate("schoolclasses");}catch(e){showToast(e.message,"error");}}
async function scCopyCourses(cid){try{const r=await api("POST",`/school/classes/${cid}/copy-courses`,{from_class_id:zdVal("cp-from")});showToast(abTr("sc_copied",{n:r.copied}));navigate("schoolclasses");}catch(e){showToast(e.message,"error");}}
async function scAddSlot(cid){
  const b={class_id:cid,course_id:zdVal("ns-c"),day:+zdVal("ns-d"),start:zdVal("ns-a"),end:zdVal("ns-b"),room:zdVal("ns-r")||null};
  try{await api("POST","/school/slots",b);navigate("schoolclasses");}catch(e){const h=document.getElementById("ns-h");if(h){h.style.color="var(--red)";h.textContent=e.message;}else showToast(e.message,"error");}
}
async function scDelSlot(id){try{await api("DELETE",`/school/slots/${id}`);navigate("schoolclasses");}catch(e){showToast(e.message,"error");}}
async function scPrintTimetable(){
  const c=(_sc.classes||[]).find(x=>x.id===_sc.cls);if(!c)return;const tt=await api("GET",`/school/timetable?class_id=${c.id}`);
  scShowDoc(scDocHead()+`<h2 class="scd-t">${esc(t("sc_timetable"))} · ${esc(c.name)}</h2><table class="scd-tab"><thead><tr>${SC_DAYS.map(d=>`<th>${esc(scDayName(d))}</th>`).join("")}</tr></thead><tbody><tr>${SC_DAYS.map(d=>`<td style="vertical-align:top">${tt.filter(s=>s.day===d).map(s=>`<div style="margin-bottom:8px"><b>${esc(s.start)}–${esc(s.end)}</b><br>${esc(s.course_name)}<br><small>${esc([s.teacher_name,s.room].filter(Boolean).join(" · "))}</small></div>`).join("")}</td>`).join("")}</tr></tbody></table>`,`EDT-${c.name}`);
}

// ── Présences ──
function scAttBadge(s){return s==="a"?`<span class="badge br">${esc(t("sc_att_a"))}</span>`:s==="r"?`<span class="badge ba">${esc(t("sc_att_r"))}</span>`:s==="p"?`<span class="badge bg">${esc(t("sc_att_p"))}</span>`:"—";}
SECTOR_PAGE_LOADERS.schoolattendance=async el=>{
  await scBase();if(!_sc.classes.length){scNoClass(el,"nav_school_attendance");return;}
  if(!_sc.att.cls||!_sc.classes.find(c=>c.id===_sc.att.cls))_sc.att.cls=_sc.classes[0].id;
  const r=await api("GET",`/school/attendance?class_id=${_sc.att.cls}${_sc.att.day?`&day=${_sc.att.day}`:""}`);_sc.att.day=r.day;
  _sc.att.rows=r.rows.map(x=>({...x,status:x.status||"p"}));
  el.innerHTML=sectorPageHead(esc(t("nav_school_attendance")),esc(t("sc_att_sub")))+
    `<div class="card" style="margin-bottom:12px"><div class="sc-filters"><select class="inp" onchange="_sc.att.cls=this.value;navigate('schoolattendance')" aria-label="${esc(t("sc_class"))}">${scClassOpts(_sc.att.cls)}</select>
      <input class="inp" type="date" value="${r.day}" max="${r.today}" onchange="_sc.att.day=this.value;navigate('schoolattendance')" aria-label="${esc(t("sc_day"))}">
      ${r.taken?`<span class="badge bg">${esc(abTr("sc_att_taken",{p:r.present,a:r.absent,r:r.late}))}</span>`:`<span class="badge ba">${esc(t("sc_att_not_taken"))}</span>`}</div></div>
    <div class="card"><div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(t("sc_att_help"))}</div><div id="sc-att"></div>
      ${_sc.att.rows.length?`<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;margin-top:12px"><button class="btn btn-o btn-sm" onclick="_sc.att.rows.forEach(x=>{x.status='p';x.justified=false});scRenderAtt()"><i class="ti ti-user-check"></i> ${esc(t("sc_all_present"))}</button><button class="btn btn-g btn-sm" id="sc-att-go" onclick="scSaveAtt()"><i class="ti ti-device-floppy"></i> ${esc(t("sc_att_save"))}</button></div>`:""}
      <div id="sc-att-res"></div></div>`;
  scRenderAtt();
};
function scRenderAtt(){
  const box=document.getElementById("sc-att");if(!box)return;
  box.innerHTML=_sc.att.rows.length?_sc.att.rows.map((r,i)=>`<div class="sc-att-r"><span class="sc-att-n">${esc(r.name)}</span>
    <span class="sc-seg" role="group" aria-label="${esc(r.name)}">${["p","r","a"].map(k=>`<button type="button" class="${r.status===k?"on "+k:""}" aria-pressed="${r.status===k}" onclick="_sc.att.rows[${i}].status='${k}';if('${k}'==='p')_sc.att.rows[${i}].justified=false;scRenderAtt()">${esc(t("sc_att_"+k+"_s"))}</button>`).join("")}</span>
    ${r.status!=="p"?`<label class="sc-just"><input type="checkbox" ${r.justified?"checked":""} onchange="_sc.att.rows[${i}].justified=this.checked"> ${esc(t("sc_justified"))}</label>`:"<span></span>"}</div>`).join(""):zdEmpty(t("sc_no_students"),"users");
}
async function scSaveAtt(){
  const btn=document.getElementById("sc-att-go");if(btn)btn.disabled=true;
  try{const r=await api("PUT","/school/attendance",{class_id:_sc.att.cls,day:_sc.att.day,marks:_sc.att.rows.map(x=>({student_id:x.student_id,status:x.status,justified:!!x.justified}))});
    showToast(abTr("sc_att_saved",{p:r.present,a:r.absent}));
    await SECTOR_PAGE_LOADERS.schoolattendance(document.getElementById("page-schoolattendance"));
    const res=document.getElementById("sc-att-res");
    if(res&&r.alerts.length)res.innerHTML=`<div class="sc-alerts"><b>${esc(t("sc_att_alerts"))}</b>${r.alerts.map(a=>`<div class="sc-line"><span>${esc(a.name)}</span><span class="sc-hint" style="color:var(--muted)">${a.notified?esc(abTr("sc_notified",{n:a.notified})):esc(a.parent_phone||t("sc_no_phone"))}</span>${scWaBtn(a.wa)}</div>`).join("")}</div>`;
  }catch(e){showToast(e.message,"error");if(btn)btn.disabled=false;}
}

// ── Notes et bulletins ──
SECTOR_PAGE_LOADERS.schoolgrades=async el=>{
  await scBase();if(!_sc.classes.length){scNoClass(el,"nav_school_grades");return;}
  if(!_sc.set.grading_ready){el.innerHTML=sectorPageHead(esc(t("nav_school_grades")),esc(t("sc_grades_sub")))+scGradingWait();return;}
  const g=_sc.gr;if(!g.cls||!_sc.classes.find(c=>c.id===g.cls))g.cls=_sc.classes[0].id;
  const c=_sc.classes.find(x=>x.id===g.cls);if(!c.courses.find(k=>k.id===g.course))g.course=c.courses[0]?.id||"";
  if(g.period!=="year"&&+g.period>=scPeriods().length)g.period="0";
  const [gr,rk]=await Promise.all([g.course&&g.period!=="year"?api("GET",`/school/grades?course_id=${g.course}&period=${g.period}`):null,api("GET",`/school/ranking?class_id=${g.cls}&period=${g.period}`)]);
  const ev=gr?gr.evals:scEvals();
  el.innerHTML=sectorPageHead(esc(t("nav_school_grades")),esc(t("sc_grades_sub")))+
    `<div class="card" style="margin-bottom:12px"><div class="sc-filters"><select class="inp" onchange="_sc.gr.cls=this.value;navigate('schoolgrades')" aria-label="${esc(t("sc_class"))}">${scClassOpts(g.cls)}</select>
      <select class="inp" onchange="_sc.gr.period=this.value;navigate('schoolgrades')" aria-label="${esc(t("sc_period"))}">${scPeriodOpts(g.period,true)}</select>
      ${g.period!=="year"?`<select class="inp" onchange="_sc.gr.course=this.value;navigate('schoolgrades')" aria-label="${esc(t("sc_course"))}">${c.courses.map(k=>`<option value="${k.id}" ${k.id===g.course?"selected":""}>${esc(k.name)} (/${scNum(k.max)})</option>`).join("")}</select>`:""}</div></div>
    ${gr?`<div class="card" style="margin-bottom:12px"><div class="sc-head"><b>${esc(gr.course.name)} · ${esc(scPeriodName(g.period))}</b><span class="sc-hint" style="color:var(--muted)">${esc(abTr("sc_max_line",{m:scNum(gr.course.max)}))}${gr.average!=null?" · "+esc(abTr("sc_class_avg",{a:scNum(gr.average,1)+" / "+scNum(gr.course.max)})):""}</span></div>
      <div class="sc-hint" style="color:var(--muted);margin-bottom:6px">${esc(ev.map(e=>`${e.name} /${scNum(e.max)} · ${scNum(e.weight)} %`).join("  —  "))}</div>
      <div class="tbl-wrap"><table class="sc-t sc-gt"><thead><tr><th>${esc(t("sc_student"))}</th>${ev.map(e=>`<th class="r">${esc(e.name)} <small>/${scNum(e.max)}</small></th>`).join("")}<th class="r">${esc(t("sc_points"))} /${scNum(gr.course.max)}</th></tr></thead><tbody>
      ${gr.rows.map(r=>`<tr><td>${esc(r.name)}</td>${ev.map(e=>`<td class="r"><input class="inp sc-n gi" type="number" min="0" max="${e.max}" step="0.25" data-s="${r.student_id}" data-e="${e.id}" data-max="${e.max}" value="${(r.marks||{})[e.id]??""}" aria-label="${esc(e.name)} ${esc(r.name)}"></td>`).join("")}<td class="r mono">${r.points==null?"—":scNum(r.points,2)}</td></tr>`).join("")||`<tr><td colspan="${ev.length+2}">${zdEmpty(t("sc_no_students"),"users")}</td></tr>`}
      </tbody></table></div>${gr.rows.length?`<div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn btn-g btn-sm" onclick="scSaveGrades()"><i class="ti ti-device-floppy"></i> ${esc(t("sc_grades_save"))}</button></div>`:""}</div>`:(g.period!=="year"?`<div class="card" style="margin-bottom:12px">${zdEmpty(t("sc_no_course"),"book")}</div>`:"")}
    <div class="card"><div class="sc-head"><b>${esc(t("sc_ranking"))} · ${esc(c.name)} · ${esc(scPeriodName(g.period))}</b><span class="sc-hint" style="color:var(--muted)">${rk.graded?esc(abTr("sc_rank_stats",{p:rk.passed,n:rk.graded,a:scNum(rk.average,1)})):""}</span></div>
      ${rk.graded?`<div class="tbl-wrap"><table class="sc-t"><thead><tr><th class="r">${esc(t("sc_rank"))}</th><th>${esc(t("sc_student"))}</th><th class="r">${esc(t("sc_points"))}</th><th class="r">%</th><th>${esc(t("sc_mention"))}</th><th></th></tr></thead><tbody>
      ${rk.rows.map(r=>`<tr><td class="r"><b>${r.rank||"—"}</b></td><td>${esc(r.name)}</td><td class="r mono">${r.max?scNum(r.points,1)+" / "+scNum(r.max):"—"}</td><td class="r mono">${scPct(r.pct)}</td><td>${r.pct==null?"—":scMentionBadge(r.mention,r.passed)||"—"}</td><td class="r">${r.max?`<button class="btn btn-o btn-sm" onclick="scBulletin('${r.student_id}','${g.period}')"><i class="ti ti-file-text"></i> ${esc(t("sc_bulletin"))}</button>`:""}</td></tr>`).join("")}
      </tbody></table></div>`:zdEmpty(t("sc_no_grades"),"report")}</div>`;
};
function scGradingWait(){
  const miss=_sc.set?.grading_missing||[];
  return `<div class="card sc-gwait"><div class="sc-head"><i class="ti ti-hourglass" aria-hidden="true"></i><b>${esc(t("sc_g_wait_title"))}</b></div>
    <div class="sc-hint" style="color:var(--muted)">${esc(t(scMgr()?"sc_g_wait_mgr":"sc_g_wait_member"))}</div>
    <ul class="sc-gmiss">${miss.map(m=>`<li>${esc(t("sc_g_miss_"+m))}</li>`).join("")}</ul>
    ${scMgr()?`<button class="btn btn-g btn-sm" onclick="navigate('schoolsettings')"><i class="ti ti-adjustments"></i> ${esc(t("sc_g_go_settings"))}</button>`:""}</div>`;
}
async function scSaveGrades(){
  const m={};let bad=null;
  document.querySelectorAll(".gi").forEach(i=>{const s=i.dataset.s;m[s]=m[s]||{student_id:s,marks:{}};const v=i.value.trim();
    if(v!==""){const n=parseFloat(v.replace(",","."));if(isNaN(n)||n<0||n>+i.dataset.max){bad=bad||i;}else m[s].marks[i.dataset.e]=n;}});
  if(bad){bad.focus();showToast(abTr("sc_grade_range_x",{m:scNum(+bad.dataset.max)}),"error");return;}
  try{await api("PUT","/school/grades",{course_id:_sc.gr.course,period:+_sc.gr.period,marks:Object.values(m)});showToast(t("sc_grades_saved"));navigate("schoolgrades");}catch(e){showToast(e.message,"error");}
}

// ── Documents imprimables ──
function scShowDoc(html,title){
  const page=document.getElementById("doc-page");if(!page)return;
  page.classList.remove("doc-ticket");page.innerHTML=`<div class="scd">${html}</div>`;window._currentDoc={number:title||"document"};
  const wa=document.getElementById("doc-wa-btn");if(wa)wa.style.display="none";
  document.getElementById("doc-view").style.display="block";document.body.classList.add("doc-open");
}
function scDocHead(d){
  d=d||{};const s=_sc.set||{};const name=d.school||s.school_name||"";
  return `<div class="scd-h">${d.logo_url||State.tenant?.logo_url?`<img src="${esc(d.logo_url||State.tenant.logo_url)}" alt="">`:""}<div><div class="scd-n">${esc(name)}</div><div class="scd-s">${esc([d.city||s.city,abTr("sc_year_line",{y:d.year||s.year||""})].filter(Boolean).join(" · "))}</div></div></div>`;
}
function scSign(left,right){return `<div class="scd-sign"><div><div>${esc(left)}</div><div class="scd-line"></div></div><div><div>${esc(right)}</div><div class="scd-line"></div></div></div>`;}
async function scBulletin(sid,period){
  try{await scBase();const r=await api("GET",`/school/report?student_id=${sid}&period=${period}`);
    const ev=r.evals||[];
    const rows=r.lines.length?r.lines.map(l=>`<tr><td>${esc(l.course)}</td>${ev.map(e=>`<td class="r">${(l.marks||{})[e.id]!=null?scNum(l.marks[e.id],2):"—"}</td>`).join("")}<td class="r">${l.points==null?"—":scNum(l.points,2)} / ${scNum(l.max)}</td></tr>`).join(""):"";
    scShowDoc(scDocHead(r)+`<h2 class="scd-t">${esc(t("sc_bulletin"))} · ${esc(r.period==="year"?t("sc_year_all"):r.period_name)}</h2>
      <div class="scd-id"><div><b>${esc(r.student.name)}</b> · ${esc(r.student.matricule)}</div><div>${esc(t("sc_class"))} : ${esc(r.student.class_name||"—")}${r.titular?" · "+esc(t("sc_titular"))+" : "+esc(r.titular):""}</div></div>
      ${rows?`<table class="scd-tab"><thead><tr><th>${esc(t("sc_course"))}</th>${ev.map(e=>`<th class="r">${esc(e.name)} /${scNum(e.max)}</th>`).join("")}<th class="r">${esc(t("sc_points"))}</th></tr></thead><tbody>${rows}</tbody></table>`:""}
      <div class="scd-sum"><div><span>${esc(t("sc_points"))}</span><b>${scNum(r.points,2)} / ${scNum(r.max)}</b></div><div><span>${esc(t("sc_percent"))}</span><b>${scPct(r.pct)}</b></div><div><span>${esc(t("sc_mention"))}</span><b>${esc(scMention(r.mention))}</b></div>${r.passed!=null?`<div><span>${esc(t("sc_decision"))}</span><b>${esc(t(r.passed?"sc_admitted":"sc_adjourned"))}</b></div>`:""}<div><span>${esc(t("sc_rank"))}</span><b>${esc(scRank(r.rank,r.class_size))}</b></div><div><span>${esc(t("sc_absences"))}</span><b>${r.absences} · ${esc(t("sc_lates"))} ${r.lates}</b></div></div>
      ${scSign(t("sc_titular"),r.director?`${t("sc_director")} — ${r.director}`:t("sc_director"))}`,`BULLETIN-${r.student.matricule}`);
  }catch(e){showToast(e.message,"error");}
}
async function scDoc(sid,kind){
  try{await scBase();const d=await api("GET",`/school/students/${sid}/docs`);const s=d.student;const verify=`${window.location.origin}/?verif=${encodeURIComponent(d.verify_token)}`;
    const born=s.birth_day?abTr("sc_born",{d:abDate(s.birth_day),p:s.birth_place||"—"}):"";
    let html="";
    if(kind==="card")html=`<div class="scd-card"><div class="scd-card-h">${esc(d.school)}</div><div class="scd-card-b"><div class="scd-ph">${esc((s.first_name||"?")[0])}</div><div><b>${esc(s.last_name)}</b><br>${esc(s.first_name)}<br><small>${esc(s.matricule)}</small><br><small>${esc(d.class_name||"")} · ${esc(d.year)}</small></div><div id="scd-qr" class="scd-qr"></div></div><div class="scd-card-f">${esc(t("sc_card_verify"))}</div></div>`;
    else{
      const title=t(kind==="attest"?"sc_doc_attest":"sc_doc_certif");
      const body=abTr(kind==="attest"?"sc_attest_body":"sc_certif_body",{d:d.director||t("sc_director"),s:d.school,n:`${s.last_name} ${s.first_name}`,b:born,c:d.class_name||"—",y:d.year});
      html=scDocHead(d)+`<h2 class="scd-t">${esc(title)}</h2><p class="scd-p">${esc(body)}</p><p class="scd-p">${esc(t("sc_doc_for"))}</p><p class="scd-p" style="text-align:right">${esc(abTr("sc_done_at",{c:d.city||"",d:abDate(d.today)}))}</p>
        <div class="scd-foot"><div id="scd-qr" class="scd-qr"></div><div class="scd-small">${esc(t("sc_doc_verify"))}<br>${esc(verify)}</div><div class="scd-sig">${esc(d.director?`${t("sc_director")} — ${d.director}`:t("sc_director"))}<div class="scd-line"></div></div></div>`;
    }
    scShowDoc(html,`${kind.toUpperCase()}-${s.matricule}`);
    if(typeof qrcode==="function"){try{const q=qrcode(0,"M");q.addData(verify);q.make();const box=document.getElementById("scd-qr");if(box)box.innerHTML=q.createSvgTag({cellSize:3,margin:0,scalable:true});}catch(_){}}
  }catch(e){showToast(e.message,"error");}
}

// ── Examens et délibérations ──
SECTOR_PAGE_LOADERS.schoolexams=async el=>{
  await scBase();if(!_sc.classes.length){scNoClass(el,"nav_school_exams");return;}
  const x=_sc.ex;if(!x.cls||!_sc.classes.find(c=>c.id===x.cls))x.cls=_sc.classes[0].id;const c=_sc.classes.find(k=>k.id===x.cls);const mgr=scMgr();
  const [ex,rk,dl]=await Promise.all([api("GET","/school/exams"),api("GET",`/school/ranking?class_id=${x.cls}&period=${x.period}`),api("GET","/school/deliberations")]);
  el.innerHTML=sectorPageHead(esc(t("nav_school_exams")),esc(t("sc_exams_sub")))+
    `<div class="card" style="margin-bottom:12px"><b>${esc(t("sc_exam_plan"))}</b>
      ${mgr?`<div class="sc-form sc-form8" style="margin-top:10px"><select class="inp" id="ex-c" onchange="_sc.ex.cls=this.value;navigate('schoolexams')" aria-label="${esc(t("sc_class"))}">${scClassOpts(x.cls)}</select><select class="inp" id="ex-p" aria-label="${esc(t("sc_period"))}">${scPeriodOpts(x.period==="year"?"0":x.period)}</select>
        <select class="inp" id="ex-k" aria-label="${esc(t("sc_course"))}">${c.courses.map(k=>`<option value="${k.id}">${esc(k.name)}</option>`).join("")}</select><input class="inp" type="date" id="ex-d" aria-label="${esc(t("sc_day"))}"><input class="inp" type="time" id="ex-a" value="08:00" aria-label="${esc(t("sc_start"))}"><input class="inp" type="time" id="ex-b" value="10:00" aria-label="${esc(t("sc_end"))}">
        <input class="inp" id="ex-r" placeholder="${esc(t("sc_room"))}"><input class="inp" id="ex-s" placeholder="${esc(t("sc_supervisor"))}" list="ex-sl"><datalist id="ex-sl">${(_sc.teachers||[]).map(x=>`<option value="${esc(x.name)}">`).join("")}</datalist><button class="btn btn-o btn-sm" onclick="scAddExam()"><i class="ti ti-plus"></i> ${esc(t("sc_add_exam"))}</button></div><div class="sc-hint" id="ex-h"></div>`:""}
      <div style="margin-top:10px">${ex.length?ex.map(e=>`<div class="sc-line"><span><b>${esc(abDate(e.day))}</b> ${esc(e.start)}–${esc(e.end)}</span><span>${esc(e.class_name||"")} · ${esc(e.course_name)} · ${esc(scPeriodName(e.period))}</span><span class="sc-hint" style="color:var(--muted)">${esc([e.room,e.supervisor].filter(Boolean).join(" · "))}</span>${mgr?`<button class="btn btn-o btn-sm" onclick="scDelExam('${e.id}')" aria-label="${esc(t("btn_delete"))}"><i class="ti ti-x"></i></button>`:""}</div>`).join(""):zdEmpty(t("sc_no_exam"),"calendar-event")}</div></div>
    <div class="card" style="margin-bottom:12px"><div class="sc-head"><b>${esc(t("sc_delib"))}</b><div class="sc-filters" style="margin-left:auto"><select class="inp" onchange="_sc.ex.cls=this.value;navigate('schoolexams')" aria-label="${esc(t("sc_class"))}">${scClassOpts(x.cls)}</select><select class="inp" onchange="_sc.ex.period=this.value;navigate('schoolexams')" aria-label="${esc(t("sc_period"))}">${scPeriodOpts(x.period,true)}</select></div></div>
      ${rk.graded?`<div class="kgrid" style="margin:10px 0"><div class="kpi b"><div class="kl">${esc(t("sc_graded"))}</div><div class="kv">${rk.graded}</div></div><div class="kpi g"><div class="kl">${esc(t("sc_passed"))}</div><div class="kv">${rk.passed}</div></div><div class="kpi r"><div class="kl">${esc(t("sc_failed"))}</div><div class="kv">${rk.graded-rk.passed}</div></div><div class="kpi a"><div class="kl">${esc(t("sc_avg"))}</div><div class="kv">${scPct(rk.average)}</div></div></div>
        <div class="tbl-wrap"><table class="sc-t"><thead><tr><th class="r">${esc(t("sc_rank"))}</th><th>${esc(t("sc_student"))}</th><th class="r">%</th><th>${esc(t("sc_mention"))}</th><th>${esc(t("sc_decision"))}</th></tr></thead><tbody>${rk.rows.map(r=>`<tr><td class="r">${r.rank||"—"}</td><td>${esc(r.name)}</td><td class="r mono">${scPct(r.pct)}</td><td>${scMentionBadge(r.mention)||"—"}</td><td>${r.pct==null?"—":r.passed?`<span class="badge bg">${esc(t("sc_admitted"))}</span>`:`<span class="badge br">${esc(t("sc_adjourned"))}</span>`}</td></tr>`).join("")}</tbody></table></div>
        ${mgr?`<div class="fgrp" style="margin-top:10px"><label class="fl">${esc(t("sc_delib_note"))}</label><textarea class="inp" id="dl-n" rows="2"></textarea></div><button class="btn btn-g btn-sm" onclick="scCloseDelib()"><i class="ti ti-lock"></i> ${esc(t("sc_delib_close"))}</button>`:""}`:zdEmpty(t("sc_no_grades"),"report")}</div>
    <div class="card"><b>${esc(t("sc_pv_list"))}</b>${dl.length?dl.map(d=>`<div class="sc-line"><span>${esc(abDate(d.created_at))}</span><span>${esc(d.class_name||"")} · ${esc(scPeriodName(d.period))}</span><span>${esc(abTr("sc_pv_line",{p:d.passed,n:d.graded}))}</span><button class="btn btn-o btn-sm" onclick="scShowPV('${d.id}')"><i class="ti ti-file-text"></i> ${esc(t("sc_pv"))}</button></div>`).join(""):zdEmpty(t("sc_no_pv"),"file-text")}</div>`;
};
async function scAddExam(){
  const b={class_id:zdVal("ex-c"),period:+zdVal("ex-p"),course_id:zdVal("ex-k"),day:zdVal("ex-d"),start:zdVal("ex-a"),end:zdVal("ex-b"),room:zdVal("ex-r")||null,supervisor:zdVal("ex-s")||null};
  if(!b.day){flagMissingFields([document.getElementById("ex-d")]);return;}
  try{await api("POST","/school/exams",b);navigate("schoolexams");}catch(e){const h=document.getElementById("ex-h");h.style.color="var(--red)";h.textContent=e.message;}
}
async function scDelExam(id){try{await api("DELETE",`/school/exams/${id}`);navigate("schoolexams");}catch(e){showToast(e.message,"error");}}
async function scCloseDelib(){
  if(!confirm(t("sc_delib_confirm")))return;
  try{const r=await api("POST","/school/deliberations",{class_id:_sc.ex.cls,period:_sc.ex.period,note:zdVal("dl-n")||null});showToast(abTr("sc_delib_ok",{p:r.passed,n:r.graded}));await SECTOR_PAGE_LOADERS.schoolexams(document.getElementById("page-schoolexams"));await scShowPV(r.id);}catch(e){showToast(e.message,"error");}
}
async function scShowPV(id){
  try{await scBase();const d=await api("GET",`/school/deliberations/${id}`);
    scShowDoc(scDocHead(d)+`<h2 class="scd-t">${esc(t("sc_pv_title"))}</h2><div class="scd-id"><div>${esc(t("sc_class"))} : <b>${esc(d.class_name)}</b> · ${esc(d.period<0?t("sc_year_all"):d.period_name)}</div><div>${esc(abDate(d.created_at))}${d.by_name?" · "+esc(d.by_name):""}</div></div>
      <table class="scd-tab"><thead><tr><th class="r">${esc(t("sc_rank"))}</th><th>${esc(t("sc_student"))}</th><th>${esc(t("sc_matricule"))}</th><th class="r">%</th><th>${esc(t("sc_mention"))}</th><th>${esc(t("sc_decision"))}</th></tr></thead><tbody>
      ${d.rows.map(r=>`<tr><td class="r">${r.rank||"—"}</td><td>${esc(r.name)}</td><td>${esc(r.matricule||"")}</td><td class="r">${scPct(r.pct)}</td><td>${esc(scMention(r.mention))}</td><td>${r.pct==null?"—":esc(t(r.passed?"sc_admitted":"sc_adjourned"))}</td></tr>`).join("")}</tbody></table>
      <div class="scd-sum"><div><span>${esc(t("sc_graded"))}</span><b>${d.graded}</b></div><div><span>${esc(t("sc_passed"))}</span><b>${d.passed}</b></div><div><span>${esc(t("sc_avg"))}</span><b>${scPct(d.average)}</b></div></div>
      ${d.note?`<p class="scd-p">${esc(d.note)}</p>`:""}${scSign(t("sc_jury"),d.director?`${t("sc_director")} — ${d.director}`:t("sc_director"))}`,`PV-${d.class_name}`);
  }catch(e){showToast(e.message,"error");}
}

// ── Frais scolaires ──
function scFeeState(s){return {paid:["bg","sc_fee_paid"],late:["br","sc_fee_late"],upcoming:["bb","sc_fee_upcoming"],partial:["ba","sc_fee_partial"]}[s]||["bb",s];}
function scFeeTable(rows,compact){
  if(!rows.length)return "";const mgr=scMgr();
  return `<div class="tbl-wrap"><table class="sc-t"><thead><tr>${compact?"":`<th>${esc(t("sc_student"))}</th>`}<th>${esc(t("sc_fee_label"))}</th><th>${esc(t("sc_due"))}</th><th class="r">${esc(t("sc_amount"))}</th><th class="r">${esc(t("sc_paid"))}</th><th class="r">${esc(t("sc_balance"))}</th><th>${esc(t("sc_state"))}</th><th></th></tr></thead><tbody>
    ${rows.map(f=>{const [cl,k]=scFeeState(f.status);return `<tr>${compact?"":`<td>${esc(f.student_name)}<small class="sc-sm">${esc(f.class_name||"")}</small></td>`}<td>${esc(f.label)}${f.discount>0?`<small class="sc-sm">${esc(abTr("sc_discount_line",{a:scMoney(f.discount)}))}</small>`:""}</td><td>${esc(abDate(f.due_day))}</td><td class="r mono">${scMoney(f.amount-f.discount)}</td><td class="r mono">${scMoney(f.paid)}</td><td class="r mono"><b>${scMoney(f.balance)}</b></td>
      <td><span class="badge ${cl}">${esc(t(k))}</span>${f.reminded_at&&f.status==="late"?`<small class="sc-sm">${esc(t("sc_reminded"))}</small>`:""}</td><td class="r sc-acts">${f.balance>0?`<button class="btn btn-g btn-sm" onclick="scPayModal('${f.id}')">${esc(t("sc_collect"))}</button>`:""}${f.payments.map(p=>`<button class="btn btn-o btn-sm" onclick="scReceipt('${p.id}')" title="${esc(p.receipt_no)}" aria-label="${esc(p.receipt_no)}"><i class="ti ti-receipt"></i></button>`).join("")}${mgr&&!f.paid?`<button class="btn btn-o btn-sm" onclick="scDelFee('${f.id}')" aria-label="${esc(t("btn_delete"))}"><i class="ti ti-x"></i></button>`:""}</td></tr>`;}).join("")}</tbody></table></div>`;
}
SECTOR_PAGE_LOADERS.schoolfees=async el=>{
  await scBase(true);if(!_sc.classes.length){scNoClass(el,"nav_school_fees");return;}
  const f=_sc.fee;const mgr=scMgr();
  const [d,late]=await Promise.all([api("GET",`/school/fees?${f.cls?`class_id=${f.cls}&`:""}${f.status?`status=${f.status}`:""}`),api("GET","/school/fees/late")]);
  el.innerHTML=sectorPageHead(esc(t("nav_school_fees")),esc(t("sc_fees_sub")))+
    `<div class="kgrid" style="margin-bottom:12px"><div class="kpi b"><div class="kl">${esc(t("sc_k_due"))}</div><div class="kv">${scMoney(d.total)}</div></div><div class="kpi g"><div class="kl">${esc(t("sc_k_paid"))}</div><div class="kv">${scMoney(d.paid)}</div></div><div class="kpi a"><div class="kl">${esc(t("sc_k_rest"))}</div><div class="kv">${scMoney(d.balance)}</div></div><div class="kpi r"><div class="kl">${esc(t("sc_k_late_amt"))}</div><div class="kv">${scMoney(d.late)}</div></div></div>
    ${mgr?`<div class="card" style="margin-bottom:12px"><b>${esc(t("sc_plan_t"))}</b><div style="font-size:12px;color:var(--muted);margin:2px 0 8px">${esc(t("sc_plan_x"))}</div>
      <div class="sc-form sc-form6"><select class="inp" id="fp-c" aria-label="${esc(t("sc_class"))}">${scClassOpts("","sc_all_classes")}</select><input class="inp" id="fp-l" placeholder="${esc(t("sc_fee_label_ph"))}"><input class="inp" type="number" min="0" step="any" id="fp-a" placeholder="${esc(t("sc_amount"))}"><input class="inp" type="date" id="fp-d" aria-label="${esc(t("sc_due"))}">
        <label class="sc-chk"><input type="checkbox" id="fp-x" checked> ${esc(t("sc_apply_disc"))}</label><button class="btn btn-g btn-sm" onclick="scFeePlan()"><i class="ti ti-plus"></i> ${esc(t("sc_plan_go"))}</button></div><div class="sc-hint" id="fp-h"></div></div>`:""}
    <div class="card" style="margin-bottom:12px"><div class="sc-head"><b>${esc(t("sc_late_fam"))}</b>${late.count?`<button class="btn btn-o btn-sm" style="margin-left:auto" onclick="scRemind()"><i class="ti ti-bell"></i> ${esc(t("sc_remind_all"))}</button>`:""}</div>
      ${late.count?late.families.map(x=>`<div class="sc-line"><span><b>${esc(x.parent_name||x.students.join(", "))}</b><small class="sc-sm">${esc(x.students.join(", "))}${x.parent_phone?" · "+esc(x.parent_phone):""}</small></span><span class="mono" style="color:var(--red)">${scMoney(x.amount)}</span><span>${x.reminded_at?`<span class="badge bb">${esc(t("sc_reminded"))}</span>`:""}</span></div>`).join(""):zdEmpty(t("sc_no_late"),"mood-happy")}<div id="sc-rem"></div></div>
    <div class="card"><div class="sc-filters" style="margin-bottom:10px"><select class="inp" onchange="_sc.fee.cls=this.value;navigate('schoolfees')" aria-label="${esc(t("sc_class"))}">${scClassOpts(f.cls,"sc_all_classes")}</select>
      <select class="inp" onchange="_sc.fee.status=this.value;navigate('schoolfees')" aria-label="${esc(t("sc_state"))}"><option value="">${esc(t("sc_all_states"))}</option>${["late","upcoming","partial","paid"].map(k=>`<option value="${k}" ${f.status===k?"selected":""}>${esc(t(scFeeState(k)[1]))}</option>`).join("")}</select></div>
      ${scFeeTable(d.rows)||zdEmpty(t("sc_no_fees"),"cash")}</div>`;
};
async function scFeePlan(){
  const b={class_id:zdVal("fp-c")||null,label:zdVal("fp-l"),amount:zdNum("fp-a")||0,due_day:zdVal("fp-d"),apply_discounts:document.getElementById("fp-x").checked};
  const h=document.getElementById("fp-h");
  if(!b.label||!(b.amount>0)||!b.due_day){h.style.color="var(--red)";h.textContent=t("sc_plan_need");return;}
  try{const r=await api("POST","/school/fees/plan",b);showToast(abTr("sc_plan_ok",{n:r.count,a:scMoney(r.total)})+(r.skipped?" · "+abTr("sc_plan_skip",{n:r.skipped}):""));navigate("schoolfees");}catch(e){h.style.color="var(--red)";h.textContent=e.message;}
}
async function scDelFee(id){if(!confirm(t("sc_del_fee_confirm")))return;try{await api("DELETE",`/school/fees/${id}`);navigate("schoolfees");}catch(e){showToast(e.message,"error");}}
function scPayModal(id){
  zdModal("modal-sc",`<div class="modal-title"><i class="ti ti-cash" style="color:var(--green)"></i> ${esc(t("sc_collect"))}</div><div id="py-info" class="sc-hint" style="color:var(--muted)"></div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("sc_amount"))}</label><input class="inp" type="number" min="0" step="any" id="py-a"></div><div class="fgrp"><label class="fl">${esc(t("fld_payment_method"))}</label><select class="inp" id="py-m">${zdMethodOptions("cash").replace(/<option value="cheque"[^<]*<\/option>/,"")}</select></div></div><div class="sc-hint" id="py-h"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-sc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="scPay('${id}')"><i class="ti ti-check"></i> ${esc(t("sc_collect_go"))}</button></div>`,460);
  api("GET","/school/fees").then(d=>{const f=d.rows.find(x=>x.id===id);if(f){document.getElementById("py-a").value=f.balance;document.getElementById("py-info").textContent=`${f.student_name} · ${f.label} · ${t("sc_balance")} ${scMoney(f.balance)}`;}}).catch(()=>{});
}
async function scPay(id){
  const a=zdNum("py-a")||0;if(a<=0)return;
  try{const r=await api("POST",`/school/fees/${id}/pay`,{amount:a,method:zdVal("py-m")});zdCloseModal("modal-sc");showToast(abTr("sc_paid_ok",{r:r.receipt.receipt_no}));
    if(document.getElementById("modal-scf")?.style.display==="flex"&&_sc.file)await scOpenStudent(_sc.file.id,"fees");
    if(document.getElementById("page-schoolfees")?.classList.contains("active"))await SECTOR_PAGE_LOADERS.schoolfees(document.getElementById("page-schoolfees"));
    scShowReceipt(r.receipt);
  }catch(e){const h=document.getElementById("py-h");if(h){h.style.color="var(--red)";h.textContent=e.message;}}
}
async function scReceipt(pid){try{scShowReceipt(await api("GET",`/school/receipts/${pid}`));}catch(e){showToast(e.message,"error");}}
function scShowReceipt(r){
  scShowDoc(scDocHead(r)+`<h2 class="scd-t">${esc(t("sc_receipt"))} ${esc(r.receipt_no)}</h2><div class="scd-id"><div><b>${esc(r.student)}</b> · ${esc(r.matricule)}</div><div>${esc(r.class_name||"")}</div></div>
    <div class="scd-sum"><div><span>${esc(t("sc_fee_label"))}</span><b>${esc(r.label)}</b></div><div><span>${esc(t("sc_amount_paid"))}</span><b>${scMoney(r.amount)}</b></div><div><span>${esc(t("fld_payment_method"))}</span><b>${esc(t("pay_method_"+r.method))}</b></div><div><span>${esc(t("sc_balance"))}</span><b>${scMoney(r.balance)}</b></div><div><span>${esc(t("sc_date"))}</span><b>${esc(fmtDate(r.created_at))}</b></div></div>
    ${scSign(r.by_name?abTr("sc_received_by",{n:r.by_name}):t("sc_cashier"),t("sc_parent"))}`,r.receipt_no);
}
async function scRemind(){
  if(!confirm(t("sc_remind_confirm")))return;
  try{const r=await api("POST","/school/fees/remind",{});showToast(abTr("sc_remind_ok",{n:r.reminders.length}));
    await SECTOR_PAGE_LOADERS.schoolfees(document.getElementById("page-schoolfees"));
    const box=document.getElementById("sc-rem");if(box)box.innerHTML=`<div class="sc-alerts"><b>${esc(t("sc_remind_wa"))}</b>${r.reminders.map(x=>`<div class="sc-line"><span>${esc(x.name)}</span><span class="mono">${scMoney(x.amount)}</span><span class="sc-hint" style="color:var(--muted)">${x.notified?esc(abTr("sc_notified",{n:x.notified})):""}</span>${scWaBtn(x.wa)}</div>`).join("")}</div>`;
  }catch(e){showToast(e.message,"error");}
}

// ── Enseignants ──
SECTOR_PAGE_LOADERS.schoolteachers=async el=>{
  await scBase(true);const mgr=scMgr();
  el.innerHTML=sectorPageHead(esc(t("nav_school_teachers")),esc(t("sc_teachers_sub")),`${mgr?`<button class="btn btn-g btn-sm" onclick="scTeacherModal()"><i class="ti ti-user-plus"></i> ${esc(t("sc_add_teacher"))}</button>`:""}<button class="btn btn-o btn-sm" onclick="navigate('employees')"><i class="ti ti-users"></i> ${esc(t("sc_hr_link"))}</button>`)+
    `<div class="card">${_sc.teachers.length?_sc.teachers.map(x=>`<div class="sc-line${x.active?"":" sc-off"}"><span><b>${esc(x.name)}</b><small class="sc-sm">${esc([x.subjects,x.phone,x.email].filter(Boolean).join(" · "))}</small></span>
      <span class="sc-hint" style="color:var(--muted)">${x.courses.map(k=>esc(k.name)+" ("+esc(k.class_name||"")+")").join(", ")||"—"}</span><span class="badge bb">${esc(abTr("sc_hours_week",{h:scNum(x.hours_week,1)}))}</span>${mgr?`<button class="btn btn-o btn-sm" onclick="scTeacherModal('${x.id}')" aria-label="${esc(t("btn_edit"))}"><i class="ti ti-pencil"></i></button>`:""}</div>`).join(""):zdEmpty(t("sc_no_teacher_yet"),"user-star")}</div>`;
};
function scTeacherModal(id){
  const x=(_sc.teachers||[]).find(k=>k.id===id)||{active:true};
  zdModal("modal-sc",`<div class="modal-title"><i class="ti ti-user-star" style="color:var(--green)"></i> ${esc(t(id?"sc_edit_teacher":"sc_add_teacher"))}</div>
    <div class="fgrp"><label class="fl">${esc(t("sc_name"))} *</label><input class="inp" id="te-n" value="${esc(x.name||"")}"></div><div class="grid2"><div class="fgrp"><label class="fl">${esc(t("pb_phone"))}</label><input class="inp" id="te-p" value="${esc(x.phone||"")}"></div><div class="fgrp"><label class="fl">Email</label><input class="inp" id="te-e" value="${esc(x.email||"")}"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("sc_subjects"))}</label><input class="inp" id="te-s" value="${esc(x.subjects||"")}"></div>${id?`<label class="sc-chk"><input type="checkbox" id="te-a" ${x.active?"checked":""}> ${esc(t("sc_active"))}</label>`:""}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-sc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="scSaveTeacher('${id||""}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,500);
}
async function scSaveTeacher(id){
  const b={name:zdVal("te-n"),phone:zdVal("te-p")||null,email:zdVal("te-e")||null,subjects:zdVal("te-s")||null};if(id)b.active=document.getElementById("te-a").checked;
  if(!b.name){flagMissingFields([document.getElementById("te-n")]);return;}
  try{id?await api("PATCH",`/school/teachers/${id}`,b):await api("POST","/school/teachers",b);zdCloseModal("modal-sc");_sc.teachers=null;navigate("schoolteachers");}catch(e){showToast(e.message,"error");}
}

// ── Discipline ──
SECTOR_PAGE_LOADERS.schooldiscipline=async el=>{
  await scBase();const [list,studs]=await Promise.all([api("GET","/school/incidents"),scStudentsAll(true)]);const sel=_sc.disc?.sid||"";_sc.disc=null;const mgr=scMgr();
  el.innerHTML=sectorPageHead(esc(t("nav_school_discipline")),esc(t("sc_disc_sub")))+
    `<div class="card" style="margin-bottom:12px"><b>${esc(t("sc_inc_add"))}</b><div class="sc-form sc-form4" style="margin-top:10px"><select class="inp" id="in-s" aria-label="${esc(t("sc_student"))}">${scStudentOpts(studs,sel)}</select>
      <select class="inp" id="in-k" aria-label="${esc(t("sc_inc_type"))}">${["warning","blame","exclusion","council","other"].map(k=>`<option value="${k}">${esc(t("sc_inc_"+k))}</option>`).join("")}</select><input class="inp" type="date" id="in-d" value="${esc(_sc.set.today)}" max="${esc(_sc.set.today)}" aria-label="${esc(t("sc_day"))}"><input class="inp" id="in-x" placeholder="${esc(t("sc_sanction"))}"></div>
      <div class="fgrp" style="margin-top:8px"><textarea class="inp" id="in-t" rows="2" placeholder="${esc(t("sc_inc_ph"))}"></textarea></div><button class="btn btn-g btn-sm" onclick="scAddIncident()"><i class="ti ti-plus"></i> ${esc(t("btn_save"))}</button><div class="sc-hint" style="color:var(--muted)">${esc(t("sc_inc_parent"))}</div></div>
    <div class="card"><b>${esc(t("sc_history"))}</b>${list.length?list.map(i=>`<div class="sc-inc"><div><b>${esc(i.student_name)}</b> · ${esc(i.class_name||"")} · <span class="badge ${i.kind==="exclusion"||i.kind==="council"?"br":"ba"}">${esc(t("sc_inc_"+i.kind))}</span> · ${esc(abDate(i.day))}${mgr?` <button class="btn btn-o btn-sm" style="float:right" onclick="scDelIncident('${i.id}')" aria-label="${esc(t("btn_delete"))}"><i class="ti ti-x"></i></button>`:""}</div><div>${esc(i.description)}</div>${i.sanction?`<div class="sc-hint" style="color:var(--amber)">${esc(t("sc_sanction"))} : ${esc(i.sanction)}</div>`:""}</div>`).join(""):zdEmpty(t("sc_no_incident"),"shield-check")}</div>`;
};
async function scAddIncident(){
  const b={student_id:zdVal("in-s"),kind:zdVal("in-k"),day:zdVal("in-d")||null,description:zdVal("in-t"),sanction:zdVal("in-x")||null};
  if(!b.student_id||b.description.length<2){flagMissingFields([document.getElementById(!b.student_id?"in-s":"in-t")]);return;}
  try{await api("POST","/school/incidents",b);showToast(t("toast_saved"));navigate("schooldiscipline");}catch(e){showToast(e.message,"error");}
}
async function scDelIncident(id){if(!confirm(t("sc_del_confirm")))return;try{await api("DELETE",`/school/incidents/${id}`);navigate("schooldiscipline");}catch(e){showToast(e.message,"error");}}

// ── Cantine et transport ──
SECTOR_PAGE_LOADERS.schoolservices=async el=>{
  await scBase();const sv=await api("GET","/school/services");const mgr=scMgr();
  if(!_sc.svc.sel||!sv.find(v=>v.id===_sc.svc.sel))_sc.svc.sel=sv[0]?.id||null;const cur=sv.find(v=>v.id===_sc.svc.sel);
  const log=cur?await api("GET",`/school/services/${cur.id}/log`):null;
  el.innerHTML=sectorPageHead(esc(t("nav_school_services")),esc(t("sc_svc_sub")),mgr?`<button class="btn btn-g btn-sm" onclick="scSvcModal()"><i class="ti ti-plus"></i> ${esc(t("sc_add_svc"))}</button>`:"")+
    (sv.length?`<div class="sc-classes">${sv.map(v=>`<button type="button" class="sc-cls${v.id===_sc.svc.sel?" on":""}${v.active?"":" sc-off"}" onclick="_sc.svc.sel='${v.id}';navigate('schoolservices')"><b><i class="ti ti-${v.kind==="canteen"?"tools-kitchen-2":"truck"}"></i> ${esc(v.name)}</b><small>${esc(t(v.kind==="canteen"?"sc_canteen":"sc_transport"))} · ${scMoney(v.price)} / ${esc(t("sc_month"))} · ${esc(abTr("sc_subs_n",{n:v.subscribers.length}))}</small></button>`).join("")}</div>`:`<div class="card">${zdEmpty(t("sc_no_svc"),"truck")}</div>`)+
    (cur?`<div class="card" style="margin-bottom:12px"><div class="sc-head"><b>${esc(cur.name)}</b><span class="sc-hint" style="color:var(--muted)">${esc(cur.details||"")}</span><span style="margin-left:auto;display:flex;gap:6px">${mgr?`<button class="btn btn-o btn-sm" onclick="scSvcModal('${cur.id}')"><i class="ti ti-pencil"></i></button>`:""}<button class="btn btn-o btn-sm" onclick="scSubsModal('${cur.id}')"><i class="ti ti-users"></i> ${esc(t("sc_subs"))}</button></span></div>
      <div class="sc-sub">${esc(abTr("sc_log_t",{d:abDate(log.day)}))}</div>
      ${log.rows.length?log.rows.map(r=>`<div class="sc-line"><span><b>${esc(r.name)}</b><small class="sc-sm">${esc(r.class_name||"")}</small></span><span style="display:flex;gap:6px;flex-wrap:wrap">${(cur.kind==="canteen"?["meal"]:["am","pm"]).map(k=>r.done.includes(k)?`<span class="badge bg"><i class="ti ti-check"></i> ${esc(t("sc_log_"+k))}</span>`:`<button class="btn btn-o btn-sm" onclick="scLog('${cur.id}','${r.student_id}','${k}')">${esc(t("sc_log_"+k))}</button>`).join("")}</span></div>`).join(""):zdEmpty(t("sc_no_subs"),"users")}
      ${mgr?`<div class="sc-sub">${esc(t("sc_bill_t"))}</div><div class="sc-form sc-form3"><input class="inp" type="month" id="bl-m" value="${esc((_sc.set.today||"").slice(0,7))}" aria-label="${esc(t("sc_month"))}"><input class="inp" type="date" id="bl-d" aria-label="${esc(t("sc_due"))}"><button class="btn btn-o btn-sm" onclick="scBill('${cur.id}')"><i class="ti ti-receipt"></i> ${esc(t("sc_bill_go"))}</button></div>`:""}</div>`:"");
};
function scSvcModal(id){
  const v=id?null:{kind:"canteen",price:0,active:true};
  const go=x=>zdModal("modal-sc",`<div class="modal-title"><i class="ti ti-truck" style="color:var(--green)"></i> ${esc(t(id?"sc_edit_svc":"sc_add_svc"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl">${esc(t("sc_svc_kind"))}</label><select class="inp" id="sv-k" ${id?"disabled":""}><option value="canteen" ${x.kind==="canteen"?"selected":""}>${esc(t("sc_canteen"))}</option><option value="transport" ${x.kind==="transport"?"selected":""}>${esc(t("sc_transport"))}</option></select></div><div class="fgrp"><label class="fl">${esc(t("sc_price_month"))}</label><input class="inp" type="number" min="0" step="any" id="sv-p" value="${x.price||""}"></div></div>
    <div class="fgrp"><label class="fl">${esc(t("sc_name"))} *</label><input class="inp" id="sv-n" value="${esc(x.name||"")}" placeholder="${esc(t("sc_svc_ph"))}"></div><div class="fgrp"><label class="fl">${esc(t("sc_svc_details"))}</label><input class="inp" id="sv-d" value="${esc(x.details||"")}"></div>
    ${id?`<label class="sc-chk"><input type="checkbox" id="sv-a" ${x.active?"checked":""}> ${esc(t("sc_active"))}</label>`:""}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-sc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="scSaveSvc('${id||""}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,500);
  if(id)api("GET","/school/services").then(l=>go(l.find(k=>k.id===id)||{})).catch(e=>showToast(e.message,"error"));else go(v);
}
async function scSaveSvc(id){
  const b={kind:zdVal("sv-k"),name:zdVal("sv-n"),price:zdNum("sv-p")||0,details:zdVal("sv-d")||null};if(id)b.active=document.getElementById("sv-a").checked;
  if(!b.name){flagMissingFields([document.getElementById("sv-n")]);return;}
  try{const r=id?await api("PATCH",`/school/services/${id}`,b):await api("POST","/school/services",b);if(!id)_sc.svc.sel=r.id;zdCloseModal("modal-sc");navigate("schoolservices");}catch(e){showToast(e.message,"error");}
}
async function scSubsModal(id){
  const [sv,studs]=await Promise.all([api("GET","/school/services"),scStudentsAll(true)]);const v=sv.find(x=>x.id===id);if(!v)return;const on=new Set(v.subscribers);
  const by={};studs.forEach(s=>{(by[s.class_name||t("sc_no_class")]=by[s.class_name||t("sc_no_class")]||[]).push(s);});
  zdModal("modal-sc",`<div class="modal-title"><i class="ti ti-users" style="color:var(--green)"></i> ${esc(t("sc_subs"))} · ${esc(v.name)}</div><input class="inp" placeholder="${esc(t("sc_search_ph"))}" oninput="const q=this.value.toLowerCase();document.querySelectorAll('#sb-list label').forEach(l=>l.style.display=l.textContent.toLowerCase().includes(q)?'':'none')" style="margin-bottom:8px">
    <div id="sb-list" class="sc-checks tall">${Object.entries(by).map(([c,ss])=>`<div class="sc-sub">${esc(c)}</div>${ss.map(s=>`<label><input type="checkbox" class="sb-s" value="${s.id}" ${on.has(s.id)?"checked":""}> ${esc(s.name)}</label>`).join("")}`).join("")}</div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-sc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="scSaveSubs('${id}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,560);
}
async function scSaveSubs(id){try{const r=await api("PUT",`/school/services/${id}/subs`,{student_ids:[...document.querySelectorAll(".sb-s:checked")].map(c=>c.value)});zdCloseModal("modal-sc");showToast(abTr("sc_subs_n",{n:r.count}));navigate("schoolservices");}catch(e){showToast(e.message,"error");}}
async function scLog(id,sid,kind){try{await api("POST",`/school/services/${id}/log`,{student_id:sid,kind});navigate("schoolservices");}catch(e){showToast(e.message,"error");}}
async function scBill(id){const m=zdVal("bl-m"),d=zdVal("bl-d");if(!m||!d){showToast(t("sc_bill_need"),"error");return;}
  try{const r=await api("POST",`/school/services/${id}/bill`,{month:m,due_day:d});showToast(abTr("sc_bill_ok",{n:r.count}));}catch(e){showToast(e.message,"error");}}

// ── Bibliothèque ──
SECTOR_PAGE_LOADERS.schoollibrary=async el=>{
  await scBase();const [books,loans,studs]=await Promise.all([api("GET",`/school/books${_sc.lib.q?`?q=${encodeURIComponent(_sc.lib.q)}`:""}`),api("GET","/school/loans?status=open"),scStudentsAll()]);
  el.innerHTML=sectorPageHead(esc(t("nav_school_library")),esc(t("sc_lib_sub")))+
    `<div class="sc-2"><div class="card"><b>${esc(t("sc_loan_new"))}</b><div class="sc-form sc-form3" style="margin-top:10px"><select class="inp" id="lo-b" aria-label="${esc(t("sc_book"))}"><option value="">${esc(t("sc_pick_book"))}</option>${books.filter(b=>b.available>0).map(b=>`<option value="${b.id}">${esc(b.title)} (${b.available})</option>`).join("")}</select><select class="inp" id="lo-s" aria-label="${esc(t("sc_student"))}">${scStudentOpts(studs,"")}</select><input class="inp" type="number" min="1" max="120" id="lo-d" value="14" aria-label="${esc(t("sc_days"))}"></div>
        <button class="btn btn-g btn-sm" style="margin-top:8px" onclick="scLoan()"><i class="ti ti-book"></i> ${esc(t("sc_loan_go"))}</button><div class="sc-hint" id="lo-h"></div></div>
      <div class="card"><b>${esc(t("sc_add_book"))}</b><div class="sc-form sc-form4" style="margin-top:10px"><input class="inp" id="bk-t" placeholder="${esc(t("sc_title"))}"><input class="inp" id="bk-a" placeholder="${esc(t("sc_author"))}"><input class="inp" id="bk-c" placeholder="${esc(t("sc_code"))}"><input class="inp" type="number" min="1" id="bk-n" value="1" aria-label="${esc(t("sc_copies"))}"></div><button class="btn btn-o btn-sm" style="margin-top:8px" onclick="scAddBook()"><i class="ti ti-plus"></i> ${esc(t("btn_add"))}</button></div></div>
    <div class="card" style="margin:12px 0"><b>${esc(t("sc_loans_open"))}</b>${loans.length?loans.map(l=>`<div class="sc-line"><span><b>${esc(l.title)}</b><small class="sc-sm">${esc(l.student_name)} · ${esc(l.class_name||"")}</small></span><span>${esc(abDate(l.out_day))} → ${esc(abDate(l.due_day))}</span><span>${l.late?`<span class="badge br">${esc(t("sc_late"))}</span>`:`<span class="badge bb">${esc(t("sc_on_loan"))}</span>`}</span><button class="btn btn-o btn-sm" onclick="scReturn('${l.id}')"><i class="ti ti-arrow-back-up"></i> ${esc(t("sc_return"))}</button></div>`).join(""):zdEmpty(t("sc_no_loan"),"book")}</div>
    <div class="card"><div class="sc-head"><b>${esc(t("sc_catalog"))}</b><input class="inp" style="margin-left:auto;max-width:240px" placeholder="${esc(t("sc_search_ph"))}" value="${esc(_sc.lib.q)}" onkeydown="if(event.key==='Enter'){_sc.lib.q=this.value.trim();navigate('schoollibrary')}"></div>
      ${books.length?books.map(b=>`<div class="sc-line"><span><b>${esc(b.title)}</b><small class="sc-sm">${esc([b.author,b.code].filter(Boolean).join(" · "))}</small></span><span class="badge ${b.available?"bg":"br"}">${esc(abTr("sc_avail",{a:b.available,n:b.copies}))}</span></div>`).join(""):zdEmpty(t("sc_no_book"),"book-2")}</div>`;
};
async function scAddBook(){const b={title:zdVal("bk-t"),author:zdVal("bk-a")||null,code:zdVal("bk-c")||null,copies:parseInt(zdVal("bk-n"),10)||1};if(!b.title){flagMissingFields([document.getElementById("bk-t")]);return;}
  try{await api("POST","/school/books",b);navigate("schoollibrary");}catch(e){showToast(e.message,"error");}}
async function scLoan(){const b={book_id:zdVal("lo-b"),student_id:zdVal("lo-s"),days:parseInt(zdVal("lo-d"),10)||14};const h=document.getElementById("lo-h");
  if(!b.book_id||!b.student_id){h.style.color="var(--red)";h.textContent=t("sc_loan_need");return;}
  try{const r=await api("POST","/school/loans",b);showToast(abTr("sc_loan_ok",{d:abDate(r.due_day)}));navigate("schoollibrary");}catch(e){h.style.color="var(--red)";h.textContent=e.message;}}
async function scReturn(id){try{await api("POST",`/school/loans/${id}/return`);navigate("schoollibrary");}catch(e){showToast(e.message,"error");}}

// ── Documents officiels ──
SECTOR_PAGE_LOADERS.schooldocs=async el=>{
  await scBase();const studs=await scStudentsAll(true);
  el.innerHTML=sectorPageHead(esc(t("nav_school_docs")),esc(t("sc_docs_sub")))+
    `<div class="card"><div class="fgrp"><label class="fl">${esc(t("sc_student"))}</label><select class="inp" id="dc-s" onchange="_sc.doc.sid=this.value">${scStudentOpts(studs,_sc.doc.sid)}</select></div>
      <div class="sc-docs">${[["attest","file-certificate"],["certif","file-description"],["card","id-badge"],["bulletin","file-text"]].map(([k,i])=>`<button type="button" class="sc-docb" onclick="scDocGo('${k}')"><i class="ti ti-${i}"></i><b>${esc(t(k==="bulletin"?"sc_bulletin":"sc_doc_"+k))}</b><small>${esc(t("sc_doc_x_"+k))}</small></button>`).join("")}</div>
      <div class="sc-hint" style="color:var(--muted)">${esc(t("sc_docs_qr"))}</div></div>`;
};
function scDocGo(k){const sid=zdVal("dc-s");if(!sid){flagMissingFields([document.getElementById("dc-s")]);return;}if(k==="bulletin")scBulletin(sid,"0");else scDoc(sid,k);}

// ── Réglages ──
SECTOR_PAGE_LOADERS.schoolsettings=async el=>{
  await scBase(true);const s=_sc.set;const mgr=scMgr();const dis=mgr?"":"disabled";const gd=s.grading||{evals:[],mentions:[]};
  _sc.gb={periods:[...(s.periods||[])],evals:gd.evals.map(e=>({...e})),mentions:gd.mentions.map(m=>({...m})),pass:s.pass_pct??"",cls:_sc.gb?.cls||""};
  el.innerHTML=sectorPageHead(esc(t("nav_school_settings")),esc(t("sc_settings_sub")))+
    `<div class="card" style="margin-bottom:12px"><div class="grid2"><div class="fgrp"><label class="fl">${esc(t("sc_official_name"))}</label><input class="inp" id="ss-o" value="${esc(s.official_name||"")}" placeholder="${esc(s.school_name)}" ${dis}></div><div class="fgrp"><label class="fl">${esc(t("sc_director"))}</label><input class="inp" id="ss-d" value="${esc(s.director||"")}" ${dis}></div></div>
      <div class="grid3"><div class="fgrp"><label class="fl">${esc(t("sc_city"))}</label><input class="inp" id="ss-c" value="${esc(s.city||"")}" ${dis}></div><div class="fgrp"><label class="fl">${esc(t("sc_school_year"))}</label><input class="inp" id="ss-y" value="${esc(s.year)}" placeholder="2026-2027" ${dis}></div><div class="fgrp"><label class="fl">${esc(t("carts_currency"))}</label><select class="inp" id="ss-m" ${dis}>${["USD","CDF","XAF","XOF","MAD","EUR"].map(c=>`<option ${c===s.currency?"selected":""}>${c}</option>`).join("")}</select></div></div>
      <div class="fgrp"><label class="fl">${esc(t("sc_sibling_pct"))}</label><input class="inp" type="number" min="0" max="100" id="ss-sb" value="${s.sibling_discount_pct}" style="max-width:160px" ${dis}></div></div>
    <div class="sc-gb-wrap"><div><h3 class="sc-gb-t">${esc(t("sc_g_title"))}</h3><div class="sc-hint" style="color:var(--muted)">${esc(t("sc_g_intro"))}</div></div>
      <div class="sc-gb-cols"><div class="sc-gb-main" id="sc-gb"></div><div class="sc-gb-side"><div class="card sc-gb-status" id="sc-gb-status"></div>
        <div class="card"><b>${esc(t("sc_g_example"))}</b><div class="sc-hint" id="sc-gb-ex" style="color:var(--muted);margin-top:6px"></div></div>
        <div class="card"><b>${esc(t("sc_g_others"))}</b><ul class="sc-gb-ul"><li>${esc(t("sc_g_teacher"))}</li><li>${esc(t("sc_g_parent"))}</li><li>${esc(t("sc_g_change"))}</li></ul></div></div></div></div>
    ${mgr?`<div class="sc-gb-save"><button class="btn btn-g" onclick="scSaveSettings()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button></div>`:""}`;
  scGbRender();
};
function scGbRender(){
  const box=document.getElementById("sc-gb");if(!box)return;const G=_sc.gb;const mgr=scMgr();const dis=mgr?"":"disabled";
  const cls=_sc.classes||[];if(!G.cls||!cls.find(c=>c.id===G.cls))G.cls=cls[0]?.id||"";const c=cls.find(x=>x.id===G.cls);
  box.innerHTML=`<div class="card"><div class="sc-gb-h"><span class="sc-gb-n">1</span><b>${esc(t("sc_g_periods"))}</b></div>
      ${mgr?`<div class="sc-gb-tpl"><span>${esc(t("sc_g_tpl"))}</span><button type="button" class="btn btn-o btn-sm" onclick="scGbTpl(3)">${esc(t("sc_g_tpl3"))}</button><button type="button" class="btn btn-o btn-sm" onclick="scGbTpl(2)">${esc(t("sc_g_tpl2"))}</button><button type="button" class="btn btn-o btn-sm" onclick="scGbTpl(6)">${esc(t("sc_g_tpl6"))}</button></div>`:""}
      ${G.periods.length?G.periods.map((p,i)=>`<div class="sc-gb-row sc-gb-p"><input class="inp" value="${esc(p)}" placeholder="${esc(t("sc_g_period_ph"))}" oninput="_sc.gb.periods[${i}]=this.value;scGbCheck()" aria-label="${esc(t("sc_period"))} ${i+1}" ${dis}>${mgr?`<button type="button" class="sc-x" onclick="_sc.gb.periods.splice(${i},1);scGbRender()" aria-label="${esc(t("btn_delete"))}"><i class="ti ti-x"></i></button>`:""}</div>`).join(""):`<div class="sc-gb-empty">${esc(t("sc_g_no_period"))}</div>`}
      ${mgr&&G.periods.length<6?`<button type="button" class="btn btn-sm sc-gb-add" onclick="_sc.gb.periods.push('');scGbRender()"><i class="ti ti-plus"></i> ${esc(t("sc_g_add_period"))}</button>`:""}</div>
    <div class="card"><div class="sc-gb-h"><span class="sc-gb-n">2</span><b>${esc(t("sc_g_evals"))}</b></div><div class="sc-hint" style="color:var(--muted)">${esc(t("sc_g_evals_x"))}</div>
      ${G.evals.length?`<div class="sc-gb-row sc-gb-e sc-gb-hd"><span>${esc(t("sc_g_name"))}</span><span>${esc(t("sc_g_max"))}</span><span>${esc(t("sc_g_weight"))}</span><span></span></div>`+G.evals.map((e,i)=>`<div class="sc-gb-row sc-gb-e"><input class="inp" value="${esc(e.name)}" oninput="_sc.gb.evals[${i}].name=this.value;scGbCheck()" aria-label="${esc(t("sc_g_name"))}" ${dis}><input class="inp" type="number" min="0" step="any" value="${e.max??""}" placeholder="${esc(t("sc_g_max_ph"))}" oninput="_sc.gb.evals[${i}].max=this.value;scGbCheck()" aria-label="${esc(t("sc_g_max"))} — ${esc(e.name)}" ${dis}><input class="inp" type="number" min="0" max="100" step="any" value="${e.weight??""}" placeholder="%" oninput="_sc.gb.evals[${i}].weight=this.value;scGbCheck()" aria-label="${esc(t("sc_g_weight"))} — ${esc(e.name)}" ${dis}>${mgr?`<button type="button" class="sc-x" onclick="_sc.gb.evals.splice(${i},1);scGbRender()" aria-label="${esc(t("btn_delete"))}"><i class="ti ti-x"></i></button>`:"<span></span>"}</div>`).join(""):`<div class="sc-gb-empty">${esc(t("sc_g_no_eval"))}</div>`}
      <div class="sc-gb-tpl">${mgr?`<button type="button" class="btn btn-sm sc-gb-add" onclick="scGbAddEval('interro')"><i class="ti ti-plus"></i> ${esc(t("sc_g_add_interro"))}</button><button type="button" class="btn btn-sm sc-gb-add" onclick="scGbAddEval('devoir')"><i class="ti ti-plus"></i> ${esc(t("sc_g_add_devoir"))}</button><button type="button" class="btn btn-sm sc-gb-add" onclick="scGbAddEval('exam')"><i class="ti ti-plus"></i> ${esc(t("sc_g_add_exam"))}</button>`:""}<span id="sc-gb-w"></span></div></div>
    <div class="card"><div class="sc-gb-h"><span class="sc-gb-n">3</span><b>${esc(t("sc_g_courses"))}</b>${cls.length>1?`<select class="inp" style="width:auto;margin-left:auto" onchange="_sc.gb.cls=this.value;scGbRender()" aria-label="${esc(t("sc_class"))}">${scClassOpts(G.cls)}</select>`:c?`<span class="sc-hint" style="margin-left:auto;color:var(--muted)">${esc(c.name)}</span>`:""}</div>
      <div class="sc-hint" style="color:var(--muted)">${esc(t("sc_g_courses_x"))}</div>
      ${!c?`<div class="sc-gb-empty">${esc(t("sc_g_no_class"))}${mgr?` <a href="#" onclick="event.preventDefault();navigate('schoolclasses')">${esc(t("sc_add_class"))}</a>`:""}</div>`:
        (c.courses.length?`<div class="sc-gb-row sc-gb-k sc-gb-hd"><span>${esc(t("sc_course"))}</span><span>${esc(t("sc_max_period"))}</span></div>`+c.courses.map(k=>`<div class="sc-gb-row sc-gb-k"><span>${esc(k.name)}</span><input class="inp" type="number" min="1" step="any" value="${k.max}" onchange="if(+this.value>0)scPatchCourse('${k.id}',{max:+this.value},'schoolsettings')" aria-label="${esc(t("sc_max_period"))} — ${esc(k.name)}" ${dis}></div>`).join(""):`<div class="sc-gb-empty">${esc(t("sc_no_course"))}</div>`)+
        (mgr?`<div class="sc-form sc-gb-addk"><input class="inp" id="nc-n" placeholder="${esc(t("sc_course_ph"))}" aria-label="${esc(t("sc_course"))}"><input class="inp" id="nc-w" type="number" min="1" step="any" placeholder="${esc(t("sc_max_ph"))}" aria-label="${esc(t("sc_max_period"))}"><button type="button" class="btn btn-o btn-sm" onclick="scAddCourse('${c.id}','schoolsettings')"><i class="ti ti-plus"></i> ${esc(t("sc_add_course"))}</button></div>`:"")}</div>
    <div class="card"><div class="sc-gb-h"><span class="sc-gb-n">4</span><b>${esc(t("sc_g_pass"))}</b></div>
      <div class="fgrp" style="max-width:220px"><label class="fl" for="ss-pp">${esc(t("sc_pass_pct"))}</label><input class="inp" type="number" min="1" max="100" step="any" id="ss-pp" value="${G.pass}" placeholder="${esc(t("sc_g_pass_ph"))}" oninput="_sc.gb.pass=this.value;scGbCheck()" ${dis}></div>
      <div class="sc-hint" style="color:var(--muted)">${esc(t("sc_g_mentions_x"))}</div>
      ${G.mentions.map((m,i)=>`<div class="sc-gb-row sc-gb-m"><input class="inp" type="number" min="0" max="100" step="any" value="${m.min??""}" placeholder="%" oninput="_sc.gb.mentions[${i}].min=this.value;scGbCheck()" aria-label="${esc(t("sc_g_from_pct"))}" ${dis}><input class="inp" value="${esc(m.label||"")}" placeholder="${esc(t("sc_g_mention_ph"))}" oninput="_sc.gb.mentions[${i}].label=this.value;scGbCheck()" aria-label="${esc(t("sc_mention"))}" ${dis}>${mgr?`<button type="button" class="sc-x" onclick="_sc.gb.mentions.splice(${i},1);scGbRender()" aria-label="${esc(t("btn_delete"))}"><i class="ti ti-x"></i></button>`:""}</div>`).join("")}
      ${mgr&&G.mentions.length<10?`<button type="button" class="btn btn-sm sc-gb-add" onclick="_sc.gb.mentions.push({min:'',label:''});scGbRender()"><i class="ti ti-plus"></i> ${esc(t("sc_g_add_mention"))}</button>`:""}</div>`;
  scGbCheck();
}
function scGbTpl(n){
  const T={3:["sc_tpl_t1","sc_tpl_t2","sc_tpl_t3"],2:["sc_tpl_s1","sc_tpl_s2"],6:["sc_tpl_p1","sc_tpl_p2","sc_tpl_e1","sc_tpl_p3","sc_tpl_p4","sc_tpl_e2"]}[n];
  _sc.gb.periods=T.map(k=>t(k));scGbRender();
}
function scGbAddEval(kind){
  const G=_sc.gb;let name=t("sc_g_"+kind);
  if(kind==="interro"){const n=G.evals.filter(e=>String(e.name).startsWith(name)).length+1;name=`${name} ${n}`;}
  G.evals.push({name,max:"",weight:""});scGbRender();
}
function scGbNum(v){const n=parseFloat(String(v??"").replace(",","."));return isFinite(n)&&n>0?n:null;}
function scGbMissing(){
  const G=_sc.gb;const miss=[];
  if(!G.periods.length||G.periods.some(p=>!String(p).trim()))miss.push("periods");
  if(!G.evals.length)miss.push("evals");
  else if(G.evals.some(e=>!String(e.name).trim()||!scGbNum(e.max)||!scGbNum(e.weight)))miss.push("eval_fields");
  else if(Math.abs(G.evals.reduce((a,e)=>a+scGbNum(e.weight),0)-100)>0.01)miss.push("weights_100");
  if(!scGbNum(G.pass))miss.push("pass_pct");
  if(G.mentions.some(m=>!String(m.label||"").trim()||m.min===""||isNaN(parseFloat(m.min))))miss.push("mentions");
  return miss;
}
function scGbCheck(){
  const G=_sc.gb;const w=document.getElementById("sc-gb-w");
  if(w){const sum=G.evals.reduce((a,e)=>a+(scGbNum(e.weight)||0),0);w.className=G.evals.length?(Math.abs(sum-100)<=0.01?"sc-chip ok":"sc-chip warn"):"";w.textContent=G.evals.length?abTr("sc_g_wsum",{n:scNum(sum)}):"";}
  const st=document.getElementById("sc-gb-status");const miss=scGbMissing();
  if(st){st.classList.toggle("ok",!miss.length);st.innerHTML=`<b>${esc(t(miss.length?"sc_g_pending":"sc_g_complete"))}</b><div class="sc-hint" style="color:var(--muted);margin:4px 0">${esc(t(miss.length?"sc_g_pending_x":"sc_g_complete_x"))}</div>${miss.length?`<ul class="sc-gmiss">${miss.map(m=>`<li>${esc(t("sc_g_miss_"+m))}</li>`).join("")}</ul>`:""}`;}
  const ex=document.getElementById("sc-gb-ex");
  if(ex){const c=(_sc.classes||[]).find(x=>x.id===G.cls);const k=c?.courses?.[0];const ok=G.evals.length&&G.evals.every(e=>scGbNum(e.max)&&scGbNum(e.weight));
    ex.textContent=k&&ok?abTr("sc_g_example_x",{c:k.name,m:scNum(k.max),e:G.evals.map(e=>`${e.name} ${scNum(scGbNum(e.max)*0.75)}/${scNum(scGbNum(e.max))} (${scNum(scGbNum(e.weight))} %)`).join(", "),p:scNum(k.max*0.75)}):t("sc_g_example_empty");}
}
async function scSaveSettings(){
  const G=_sc.gb;const miss=scGbMissing();
  if(miss.includes("mentions")){showToast(t("sc_g_miss_mentions"),"error");return;}
  const body={official_name:zdVal("ss-o"),director:zdVal("ss-d"),city:zdVal("ss-c"),year:zdVal("ss-y"),currency:zdVal("ss-m"),sibling_discount_pct:zdNum("ss-sb")||0};
  const periods=G.periods.map(p=>String(p).trim()).filter(Boolean);if(periods.length)body.periods=periods;
  if(scGbNum(G.pass))body.pass_pct=scGbNum(G.pass);
  if(G.evals.length&&(miss.includes("eval_fields")||miss.includes("weights_100"))){showToast(t(miss.includes("weights_100")?"sc_g_miss_weights_100":"sc_g_miss_eval_fields"),"error");return;}
  body.grading={evals:G.evals.map(e=>({id:e.id||null,name:String(e.name).trim(),max:scGbNum(e.max),weight:scGbNum(e.weight)})),mentions:G.mentions.map(m=>({min:parseFloat(m.min),label:String(m.label).trim()}))};
  const was=!!_sc.set?.grading_ready;
  try{_sc.set=await api("PUT","/school/settings",body);showToast(t(_sc.set.grading_ready&&!was?"sc_g_saved_ready":"toast_saved"));navigate("schoolsettings");}catch(e){showToast(e.message,"error");}
}

// ── Espace parents ──
if(typeof CS_GROUPS==="object")CS_GROUPS.school="cs_tab_school";
if(typeof csItem==="function"){
  const _csItem92=csItem;
  csItem=function(it){
    if(it.kind!=="student")return _csItem92(it);
    const p=(it.periods||[])[it.periods.length-1];const cur=it.currency||"USD";const m=v=>scNum(v)+" "+(cur==="CDF"?"FC":cur==="USD"?"$":cur);
    const lines=[`${it.class_name||""} · ${it.year||""}`];
    if(p)lines.push(abTr("cs_school_period",{p:p.name,v:scPct(p.pct),m:scMention(p.mention),r:scRank(p.rank,p.class_size)}));
    lines.push(abTr("cs_school_abs",{a:it.absences?.absent||0,r:it.absences?.late||0}));
    lines.push(it.balance>0?abTr("cs_school_due",{a:m(it.balance)})+(it.late_amount>0?" · "+abTr("cs_school_late",{a:m(it.late_amount)}):""):t("cs_school_paid"));
    window._csStudents=window._csStudents||{};window._csStudents[it.id]=it;
    return `<div class="cs-item card2"><div class="cs-item-h"><div><div class="cs-biz">${esc(it.business||"")}</div><b>${esc(it.student)}</b></div>${it.late_amount>0?`<span class="badge br">${esc(t("cs_to_pay"))}</span>`:""}</div>
      ${lines.map(l=>`<div class="cs-line">${esc(l)}</div>`).join("")}
      <div class="cs-actions"><button class="btn btn-sm btn-g" onclick="csStudentModal('${it.id}')"><i class="ti ti-file-text"></i> ${esc(t("cs_school_open"))}</button>${it.school_id?`<button class="btn btn-sm btn-o" onclick="navigate('messaging');setTimeout(()=>startConversationWith('${it.school_id}','${escJs(it.business||"")}'),400)"><i class="ti ti-message-circle"></i> ${esc(t("cs_school_write"))}</button>`:""}<button class="btn btn-sm btn-o" onclick="csRemove('${it.id}')"><i class="ti ti-x"></i> ${esc(t("cs_remove"))}</button></div></div>`;
  };
}
function csStudentModal(id){
  const it=(window._csStudents||{})[id];if(!it)return;const cur=it.currency||"USD";const m=v=>scNum(v)+" "+(cur==="CDF"?"FC":cur==="USD"?"$":cur);
  zdModal("modal-scp",`<div class="modal-title"><i class="ti ti-users" style="color:var(--green)"></i> ${esc(it.student)}</div><div style="font-size:12px;color:var(--muted);margin:-4px 0 10px">${esc(it.business)} · ${esc(it.class_name||"")} · ${esc(it.year||"")}</div>
    ${(it.periods||[]).map(p=>`<div class="sc-sub">${esc(p.name)} · ${scPct(p.pct)} · ${esc(scMention(p.mention))} · ${esc(scRank(p.rank,p.class_size))}</div><div class="tbl-wrap"><table class="sc-t"><thead><tr><th>${esc(t("sc_course"))}</th>${(it.evals||[]).map(e=>`<th class="r">${esc(e.name)} /${scNum(e.max)}</th>`).join("")}<th class="r">${esc(t("sc_points"))}</th></tr></thead><tbody>${p.lines.map(l=>`<tr><td>${esc(l.course)}</td>${(it.evals||[]).map(e=>`<td class="r">${(l.marks||{})[e.id]!=null?scNum(l.marks[e.id],2):"—"}</td>`).join("")}<td class="r">${l.points==null?"—":scNum(l.points,1)} / ${scNum(l.max)}</td></tr>`).join("")}</tbody></table></div>`).join("")||`<div class="sc-hint" style="color:var(--muted)">${esc(t("sc_no_grades"))}</div>`}
    <div class="sc-sub">${esc(t("sc_tab_att"))}</div>${(it.absences?.recent||[]).map(a=>`<div class="sc-line"><span>${esc(abDate(a.day))}</span><span>${scAttBadge(a.status)}${a.justified?` <span class="badge bb">${esc(t("sc_justified"))}</span>`:""}</span></div>`).join("")||`<div class="sc-hint" style="color:var(--muted)">${esc(t("sc_no_absence"))}</div>`}
    <div class="sc-sub">${esc(t("sc_tab_fees"))}</div>${(it.fees||[]).map(f=>{const [cl,k]=scFeeState(f.status);return `<div class="sc-line"><span>${esc(f.label)}<small class="sc-sm">${esc(abDate(f.due_day))}</small></span><span class="mono">${m(f.amount-f.discount)}</span><span class="badge ${cl}">${esc(t(k))}</span></div>`;}).join("")||`<div class="sc-hint" style="color:var(--muted)">${esc(t("sc_no_fees"))}</div>`}
    ${(it.incidents||[]).length?`<div class="sc-sub">${esc(t("sc_tab_disc"))}</div>${it.incidents.map(i=>`<div class="sc-inc"><b>${esc(t("sc_inc_"+i.kind))}</b> · ${esc(abDate(i.day))}<div>${esc(i.description)}</div></div>`).join("")}`:""}
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-scp')">${esc(t("btn_close"))}</button></div>`,640);
}
if(typeof csParseLink==="function"){
  const _csParse92=csParseLink;
  csParseLink=function(v){
    try{const q=new URL((v||"").trim(),window.location.origin).searchParams;if(q.get("eleve"))return{kind:"student",token:q.get("eleve")};}catch(_){}
    return _csParse92(v);
  };
}
// Pages publiques : lien parent et vérification d'un document
async function checkSchoolParentView(){
  const tok=new URLSearchParams(window.location.search).get("eleve");if(!tok)return false;
  if(State.token&&typeof zdClientLink==="function"){const r=await zdClientLink("student",tok);if(r){history.replaceState(null,"","/?p=myspace");return false;}}
  document.getElementById("auth-screen").style.display="none";const land=document.getElementById("landing");if(land)land.style.display="none";
  const pv=document.getElementById("portal-view");pv.style.display="block";const box=document.getElementById("portal-content");document.getElementById("portal-company").textContent="";
  try{const r=await fetch(`${API_BASE}/public/school/student/${encodeURIComponent(tok)}`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"");
    _sc.set=_sc.set||{currency:d.currency};document.getElementById("portal-company").textContent=d.business;
    window._csStudents={pub:{...d,id:"pub"}};
    box.innerHTML=`<div class="card2" style="margin-bottom:12px"><b style="font-size:16px">${esc(d.student)}</b><div style="font-size:13px;color:var(--muted)">${esc(d.class_name||"")} · ${esc(d.year)}</div></div>${csItem({...d,id:"pub",kind:"student"}).replace(/<button class="btn btn-sm btn-o" onclick="csRemove[^<]*<\/i>[^<]*<\/button>/,"").replace(/<button class="btn btn-sm btn-o" onclick="navigate\('messaging'\)[\s\S]*?<\/button>/,"")}
      <div class="card2" style="margin-top:12px"><b>${esc(t("cs_school_keep_t"))}</b><div style="font-size:13px;color:var(--muted);margin:6px 0 10px">${esc(t("cs_school_keep_x"))}</div><button class="btn btn-g btn-sm" onclick="localStorage.setItem('zd_pending_student','${escJs(tok)}');document.getElementById('portal-view').style.display='none';showAuthTab('register');document.getElementById('auth-screen').style.display=''"><i class="ti ti-user-plus"></i> ${esc(t("cs_school_keep_go"))}</button></div>`;
  }catch(e){box.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message||t("cs_school_bad"))}</div>`;}
  return true;
}
async function checkSchoolVerifyView(){
  const tok=new URLSearchParams(window.location.search).get("verif");if(!tok)return false;
  document.getElementById("auth-screen").style.display="none";const land=document.getElementById("landing");if(land)land.style.display="none";
  document.getElementById("portal-view").style.display="block";const box=document.getElementById("portal-content");document.getElementById("portal-company").textContent=t("sc_verify_t");
  try{const r=await fetch(`${API_BASE}/public/school/verify/${encodeURIComponent(tok)}`);const d=await r.json();if(!r.ok)throw new Error(d.detail||"");
    box.innerHTML=`<div class="card2 sc-verify ${d.valid?"ok":"bad"}"><i class="ti ti-${d.valid?"shield-check":"alert-triangle"}"></i><div><b>${esc(t(d.valid?"sc_verify_ok":"sc_verify_left"))}</b><div>${esc(d.student)} · ${esc(d.matricule)}</div><div>${esc(d.class_name||"")} · ${esc(d.school)} · ${esc(d.year)}</div></div></div>`;
  }catch(e){box.innerHTML=`<div class="card2 sc-verify bad"><i class="ti ti-alert-triangle"></i><div><b>${esc(t("sc_verify_bad"))}</b><div>${esc(e.message)}</div></div></div>`;}
  return true;
}
if(typeof checkSectorPublicViews==="function"){
  const _cspv=checkSectorPublicViews;
  checkSectorPublicViews=async function(){
    if(await checkSchoolVerifyView())return true;
    if(await checkSchoolParentView())return true;
    return _cspv();
  };
}
async function zdLinkPendingStudent(){
  let tok=null;try{tok=localStorage.getItem("zd_pending_student");}catch(_){}
  if(!tok||!State.token||typeof zdClientLink!=="function")return;
  try{localStorage.removeItem("zd_pending_student");}catch(_){}
  await zdClientLink("student",tok);
}
if(typeof zdShowClientApp==="function"){const _zsca=zdShowClientApp;zdShowClientApp=async function(){await zdLinkPendingStudent();return _zsca.apply(this,arguments);};}
if(typeof zdAfterAppLayout==="function"){const _zaal=zdAfterAppLayout;zdAfterAppLayout=function(){_zaal.apply(this,arguments);zdLinkPendingStudent();};}
