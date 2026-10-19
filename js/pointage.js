// ── 9.3 · POINTAGE SUR TABLETTE (gérant + tablette) ──
const PT_FACE_CDN="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15";
const _pt={set:null,day:null,list:null,emps:null,pair:null,pairTimer:null,sector:null};
function ptMgr(){return !(typeof isTeamMember==="function"&&isTeamMember())||State.tenant.member_role==="admin"||!!State.tenant.member_manager;}
function ptSq(){return _pt.sector?`sector=${encodeURIComponent(_pt.sector)}`:"";}
function ptOn(){return !(State.tenant&&State.tenant.pointage_enabled===false);}
function ptTzLabel(tz){return (tz||"").split("/").pop().replace(/_/g," ");}
function ptStatusBadge(s){const m={present:["bg","pt_st_present"],late:["ba","pt_st_late"],absent:["br","pt_st_absent"],absent_late:["br","pt_st_absent_late"],check:["bp","pt_st_check"],not_yet:["bb","pt_st_not_yet"]}[s]||["bb","pt_st_"+s];return `<span class="badge ${m[0]}">${esc(t(m[1]))}</span>`;}
function ptFlags(f){return (f||[]).map(x=>`<span class="pt-flag">${esc(t("pt_fl_"+x))}</span>`).join(" ");}

// Menu : la page Présences disparaît quand le pointage est désactivé
function ptApplyNav(){
  const off=!ptOn();
  document.querySelectorAll('.nav-i[data-p="attendance"]').forEach(e=>e.classList.toggle("zd-pt-off",off));
  document.querySelectorAll('#more-menu [onclick*="navigate(\'attendance\')"]').forEach(e=>e.classList.toggle("zd-pt-off",off));
  document.querySelectorAll('.nav-i[data-p="pointage"],#more-pointage').forEach(e=>e.classList.toggle("zd-pt-off",off&&!ptMgr()));
  const more=document.getElementById("more-menu");
  if(more&&!document.getElementById("more-pointage")){const src=more.querySelector('[onclick*="navigate(\'attendance\')"]');if(src){const d=document.createElement("div");d.id="more-pointage";d.setAttribute("onclick","navigate('pointage');closeMoreMenu()");d.style.cssText=src.style.cssText;d.innerHTML=`<i class="ti ti-device-tablet" style="font-size:22px;color:var(--green)"></i><span style="font-size:10px;font-family:var(--mono)">${esc(t("nav_pointage_short"))}</span>`;src.after(d);}}
}
if(typeof zdPageGuard==="function"){const _ptG=zdPageGuard;zdPageGuard=function(p){p=_ptG(p);if(!ptOn()&&(p==="attendance"||(p==="pointage"&&!ptMgr())))return "dashboard";return p;};}
if(typeof zdAfterAppLayout==="function"){const _ptA=zdAfterAppLayout;zdAfterAppLayout=function(){_ptA.apply(this,arguments);ptApplyNav();};}
if(typeof PAGE_MODULES==="object")PAGE_MODULES.pointage="hr";

// Page Présences : en mode tablette, plus de pointage manuel
if(typeof loadAttendance==="function"){
  const _ptLA=loadAttendance;
  loadAttendance=async function(){
    await _ptLA.apply(this,arguments);
    try{
      const day=document.getElementById("att-day")?.value;if(!day)return;
      const r=await api("GET",`/hr/attendance?day=${day}`);const page=document.getElementById("page-attendance");if(!page)return;
      let b=document.getElementById("pt-att-banner");
      if(r.tablet_mode){
        document.querySelectorAll("#attendance-tbody button").forEach(x=>x.remove());
        if(!b){b=document.createElement("div");b.id="pt-att-banner";b.className="alert-bar pt-banner";page.querySelector(".sh")?.after(b);}
        b.innerHTML=`<i class="ti ti-device-tablet"></i> ${esc(t("pt_att_banner"))} <a href="#" onclick="event.preventDefault();navigate('pointage')">${esc(t("pt_att_open"))}</a>`;
      }else if(b)b.remove();
    }catch(_){}
  };
}

// ── Page du gérant ──
V93_PAGES.pointage=async function(){
  const el=ensureSectorPage("pointage");document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x===el));
  if(!el.innerHTML)el.innerHTML=`<div class="card" style="text-align:center;color:var(--muted)">${esc(t("loading"))}</div>`;
  await ptLoad();
};
async function ptLoad(){
  const el=document.getElementById("page-pointage");if(!el)return;
  try{
    _pt.set=await api("GET","/pointage/settings"+(_pt.sector?"?"+ptSq():""));_pt.sector=_pt.set.sector||null;
    const anyOn=(_pt.set.sectors||[]).some(x=>x.enabled)||!!_pt.set.enabled;
    if(State.tenant&&State.tenant.pointage_enabled!==anyOn){State.tenant.pointage_enabled=anyOn;try{localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));}catch(_){}ptApplyNav();}
    if(_pt.set.enabled){
      if(!_pt.day)_pt.day=_pt.set.local_day;
      const q=ptSq();
      const [d,em,co]=await Promise.all([api("GET",`/pointage/day?day=${_pt.day}&${q}`),api("GET",`/pointage/employees?${q}`),api("GET",`/pointage/corrections?month=${_pt.day.slice(0,7)}&${q}`)]);
      _pt.list=d;_pt.emps=em;_pt.corr=co;
    }
    ptRender();
  }catch(e){el.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;}
}
function ptClockText(){const s=_pt.set;if(!s)return "";const now=new Date(Date.now()+(_pt.skew||0));try{return now.toLocaleTimeString("fr-FR",{timeZone:s.tz,hour:"2-digit",minute:"2-digit"});}catch(_){const d=new Date(now.getTime()+s.tz_offset_min*60000);return String(d.getUTCHours()).padStart(2,"0")+":"+String(d.getUTCMinutes()).padStart(2,"0");}}
function ptRender(){
  const el=document.getElementById("page-pointage");const s=_pt.set;const mgr=ptMgr();_pt.skew=s.now_utc_ms-Date.now();
  const tabletUrl=`${window.location.origin}/?pointage=1`;
  let h=`<div class="sh"><div><div class="st"><i class="ti ti-device-tablet"></i> ${esc(t("pt_title"))}</div><div class="ss">${esc(t("pt_sub"))}</div></div>
    <div class="pt-clock"><span>${esc(t("pt_clock_l"))}</span><b id="pt-clock">${esc(ptClockText())}</b><small>${esc(ptTzLabel(s.tz))} · UTC${s.tz_offset_min>=0?"+":"−"}${Math.abs(s.tz_offset_min/60)}</small></div></div>`;
  const secs=s.sectors||[];
  if(secs.length>1)h+=`<div class="pt-secs" role="tablist" aria-label="${esc(t("pt_sectors_l"))}">${secs.map(x=>`<button type="button" role="tab" class="pt-sec${x.key===s.sector?" on":""}" aria-selected="${x.key===s.sector}" onclick="_pt.sector='${x.key}';_pt.day=null;ptLoad()"><i class="ti ti-${x.enabled?"circle-check":"circle-off"}"></i> ${esc(sectorLabel(x.key))}</button>`).join("")}</div><div class="pt-muted" style="margin:-4px 0 12px">${esc(t("pt_sector_x"))}</div>`;
  h+=`<div class="card pt-onoff"><label class="pt-switch"><input type="checkbox" id="pt-en" ${s.enabled?"checked":""} ${mgr?"":"disabled"} onchange="ptToggle(this.checked)"><span></span></label><div><b>${esc(t(s.enabled?"pt_on_t":"pt_off_t"))}</b><div class="pt-muted">${esc(t(s.enabled?"pt_on_x":"pt_off_x"))}</div></div></div>`;
  if(!s.enabled){el.innerHTML=h+ptLegalHtml();return;}
  const d=_pt.list,c=d.counts||{};
  h+=`<div class="card pt-card"><div class="pt-head"><b>${esc(t(d.is_today?"pt_today":"pt_day"))}</b><input class="inp" type="date" value="${d.day}" max="${s.local_day}" onchange="_pt.day=this.value;ptLoad()" aria-label="${esc(t("pt_day"))}"></div>
    <div class="pt-counts">${["present","late","check","absent","absent_late","not_yet"].filter(k=>c[k]).map(k=>`${ptStatusBadge(k)} <b>${c[k]}</b>`).join(" ")||`<span class="pt-muted">${esc(t("pt_no_emp"))}</span>`}</div>
    <div class="pt-rules">${esc(abTr("pt_rules_line",{a:"\u2066"+d.rules.work_start,b:d.rules.work_end+"\u2069",l:pt_late_from(d.rules),x:d.rules.absent_after,f:d.rules.clock_from,g:d.rules.clock_to}))}</div>
    ${d.rows.length?`<div class="tbl-wrap"><table class="pt-t"><thead><tr><th>${esc(t("th_employee"))}</th><th>${esc(t("att_btn_in"))}</th><th>${esc(t("att_btn_out"))}</th><th>${esc(t("pt_status"))}</th><th></th></tr></thead><tbody>
    ${d.rows.map(r=>{const pin=r.punches.find(p=>p.kind==="in"),pout=r.punches.find(p=>p.kind==="out");const chk=r.punches.filter(p=>p.status==="check"&&!p.reviewed);
      return `<tr><td><b>${esc(r.name)}</b>${r.enrolled?"":`<small class="pt-sm">${esc(t("pt_not_enrolled"))}</small>`}</td><td class="mono">${esc(r.local_in||"—")}</td><td class="mono">${esc(r.local_out||"—")}</td>
      <td>${ptStatusBadge(r.status)} ${ptFlags(r.flags)}${r.source&&r.source.includes("correction")?` <span class="pt-flag c">${esc(t("pt_corrected"))}</span>`:""}</td>
      <td class="pt-acts">${mgr?[pin,pout].filter(p=>p&&p.has_photo).map(p=>`<button class="btn btn-o btn-sm" onclick="ptPhotos('${p.id}','${escJs(r.name)}')" title="${esc(t("pt_photos"))}" aria-label="${esc(t("pt_photos"))} ${esc(r.name)}"><i class="ti ti-photo"></i> ${esc(t(p.kind==="in"?"att_btn_in":"att_btn_out"))}</button>`).join("")+chk.map(p=>`<button class="btn btn-g btn-sm" onclick="ptReview('${p.id}')"><i class="ti ti-check"></i> ${esc(t("pt_review"))}</button>`).join("")+`<button class="btn btn-o btn-sm" onclick="ptFixModal('${r.employee_id}')"><i class="ti ti-pencil"></i> ${esc(t("pt_fix"))}</button>`:""}</td></tr>`;}).join("")}
    </tbody></table></div>`:zdEmpty(t("pt_no_emp"),"users")}</div>`;
  if(s.can_admin!==false)h+=`<div class="pt-grid"><div class="card pt-card"><div class="pt-head"><b>${esc(t("pt_tablets"))}</b>${mgr?`<button class="btn btn-g btn-sm" onclick="ptPair()"><i class="ti ti-link"></i> ${esc(t("pt_pair"))}</button>`:""}</div>
      <div id="pt-pair-box">${ptPairHtml()}</div>
      ${s.tablets.length?s.tablets.map(x=>`<div class="pt-line"><span><i class="ti ti-device-tablet"></i> <b>${esc(x.name)}</b><small class="pt-sm">${esc(x.located?t("pt_located"):t("pt_not_located"))}${x.last_seen_at?" · "+esc(abTr("pt_seen",{d:fmtDate(x.last_seen_at)})):""}</small></span>${mgr?`<button class="btn btn-o btn-sm" onclick="ptRevoke('${x.id}','${escJs(x.name)}')" aria-label="${esc(t("pt_revoke"))}"><i class="ti ti-x"></i></button>`:""}</div>`).join(""):`<div class="pt-muted">${esc(t("pt_no_tablet"))}</div>`}
      <div class="pt-muted" style="margin-top:8px">${esc(t("pt_tablet_url"))} <b class="mono">${esc(tabletUrl)}</b></div></div>
    <div class="card pt-card"><div class="pt-head"><b>${esc(t("pt_mgr_pin_t"))}</b>${s.manager_pin_set?`<span class="badge bg">${esc(t("pt_set"))}</span>`:`<span class="badge ba">${esc(t("pt_unset"))}</span>`}</div>
      <div class="pt-muted">${esc(t("pt_mgr_pin_x"))}</div>
      ${mgr?`<div class="pt-row"><input class="inp" id="pt-mpin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="••••••" aria-label="${esc(t("pt_mgr_pin_t"))}"><button class="btn btn-o btn-sm" onclick="ptSetMgrPin()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button></div>`:""}</div></div>`;
  h+=`<div class="card pt-card"><div class="pt-head"><b>${esc(t("pt_enrolled_t"))}</b><span class="badge bb">${s.employees_enrolled}/${s.employees_total}</span></div><div class="pt-muted" style="margin-bottom:8px">${esc(t("pt_enrolled_x"))}</div>
    ${(_pt.emps||[]).map(e=>`<div class="pt-line"><span><b>${esc(e.name)}</b><small class="pt-sm">${e.enrolled?esc(abTr("pt_enrolled_on",{d:fmtDate(e.consent_at)})):esc(t("pt_not_enrolled"))}${e.blocked_until?` · <b style="color:var(--red)">${esc(abTr("pt_blocked_until",{d:new Date(e.blocked_until).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}))}</b>`:""}</small></span>
      <span class="pt-acts">${s.can_admin&&secs.length>1?`<select class="inp pt-secsel" aria-label="${esc(t("pt_emp_sector"))} ${esc(e.name)}" onchange="ptEmpSector('${e.id}',this.value)">${secs.map(x=>`<option value="${x.key}" ${x.key===e.sector?"selected":""}>${esc(sectorLabel(x.key))}</option>`).join("")}</select>`:""}${mgr&&e.blocked_until?`<button class="btn btn-o btn-sm" onclick="ptUnblock('${e.id}')"><i class="ti ti-lock-open"></i> ${esc(t("pt_unblock"))}</button>`:""}${mgr&&e.enrolled?`<button class="btn btn-o btn-sm" onclick="ptUnenroll('${e.id}','${escJs(e.name)}')" aria-label="${esc(t("pt_unenroll"))}"><i class="ti ti-trash"></i></button>`:""}${e.enrolled?`<span class="badge bg"><i class="ti ti-face-id"></i> ${esc(t("pt_enrolled"))}</span>`:""}</span></div>`).join("")||`<div class="pt-muted">${esc(t("pt_no_emp"))}</div>`}</div>`;
  if(mgr)h+=`<div class="card pt-card"><div class="pt-head"><b>${esc(t("pt_rules_t"))}</b></div>
    <div class="pt-form">
      <label>${esc(t("pt_tz"))}<select class="inp" id="pr-tz">${s.tz_list.map(z=>`<option value="${z}" ${z===s.tz?"selected":""}>${esc(ptTzLabel(z))}</option>`).join("")}</select></label>
      <label>${esc(t("pt_ws"))}<input class="inp" type="time" id="pr-ws" value="${s.work_start}"></label>
      <label>${esc(t("pt_we"))}<input class="inp" type="time" id="pr-we" value="${s.work_end}"></label>
      <label>${esc(t("pt_grace"))}<input class="inp" type="number" min="0" max="120" id="pr-gr" value="${s.late_grace_min}"></label>
      <label>${esc(t("pt_absent_after"))}<input class="inp" type="time" id="pr-ab" value="${s.absent_after}"></label>
      <label>${esc(t("pt_from"))}<input class="inp" type="time" id="pr-cf" value="${s.clock_from}"></label>
      <label>${esc(t("pt_to"))}<input class="inp" type="time" id="pr-ct" value="${s.clock_to}"></label>
      <label>${esc(t("pt_geo"))}<input class="inp" type="number" min="0" max="5000" id="pr-geo" value="${s.geofence_m}"></label>
      <label>${esc(t("pt_min_stay"))}<input class="inp" type="number" min="0" max="240" id="pr-ms" value="${s.min_stay_min}"></label>
      <label>${esc(t("pt_photo_days"))}<select class="inp" id="pr-pd">${[7,30,90].map(n=>`<option value="${n}" ${n===s.photo_days?"selected":""}>${esc(abTr("pt_days",{n}))}</option>`).join("")}</select></label>
    </div>
    <div class="pt-muted" style="margin:6px 0 10px">${esc(t("pt_rules_x"))}</div><button class="btn btn-g btn-sm" onclick="ptSaveRules()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button><div class="sc-hint" id="pr-h"></div></div>`;
  h+=`<div class="card pt-card"><div class="pt-head"><b>${esc(t("pt_corr_t"))}</b></div>${(_pt.corr||[]).map(x=>`<div class="pt-line"><span><b>${esc(x.name)}</b> · ${esc(abDate(x.day))}<small class="pt-sm">${esc(x.old_in||"—")} → ${esc(x.new_in||"—")} · ${esc(x.old_out||"—")} → ${esc(x.new_out||"—")} · ${esc(x.reason)}</small></span><small class="pt-sm">${esc(x.by_name||"")} · ${esc(fmtDate(x.created_at))}</small></div>`).join("")||`<div class="pt-muted">${esc(t("pt_no_corr"))}</div>`}</div>`;
  el.innerHTML=h+ptLegalHtml();
  clearInterval(_pt.clk);_pt.clk=setInterval(()=>{const c=document.getElementById("pt-clock");if(!c){clearInterval(_pt.clk);return;}c.textContent=ptClockText();},15000);
}
function pt_late_from(r){const m=parseInt(r.work_start.slice(0,2),10)*60+parseInt(r.work_start.slice(3),10)+(+r.late_grace_min||0)+1;return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");}
function ptLegalHtml(){return `<div class="pt-legal"><i class="ti ti-shield-check"></i><div><b>${esc(t("pt_legal_t"))}</b><div>${esc(t("pt_legal_x"))}</div></div></div>`;}
function ptPairHtml(){
  const p=_pt.pair;if(!p)return "";
  const left=Math.max(0,Math.round((new Date(p.expires_at).getTime()-Date.now())/1000));
  if(!left)return `<div class="pt-muted">${esc(t("pt_pair_expired"))}</div>`;
  return `<div class="pt-pair"><div class="pt-pair-code" aria-label="${esc(t("pt_pair_code"))}">${esc(p.code.slice(0,3))} ${esc(p.code.slice(3))}</div><div class="pt-muted">${esc(abTr("pt_pair_x",{m:Math.ceil(left/60)}))}</div></div>`;
}
async function ptToggle(on){
  if(!on&&!confirm(t("pt_off_confirm"))){document.getElementById("pt-en").checked=true;return;}
  try{_pt.set=await api("PUT","/pointage/settings",{enabled:on,sector:_pt.sector});State.tenant.pointage_enabled=on||(_pt.set.sectors||[]).some(x=>x.enabled);try{localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));}catch(_){}ptApplyNav();showToast(t(on?"pt_on_ok":"pt_off_ok"));await ptLoad();}catch(e){showToast(e.message,"error");}
}
async function ptPair(){
  try{_pt.pair=await api("POST","/pointage/pair");document.getElementById("pt-pair-box").innerHTML=ptPairHtml();
    clearInterval(_pt.pairTimer);_pt.pairTimer=setInterval(()=>{const b=document.getElementById("pt-pair-box");if(!b){clearInterval(_pt.pairTimer);return;}b.innerHTML=ptPairHtml();if(new Date(_pt.pair.expires_at)<new Date())clearInterval(_pt.pairTimer);},20000);}catch(e){showToast(e.message,"error");}
}
async function ptRevoke(id,name){if(!confirm(abTr("pt_revoke_confirm",{n:name})))return;try{await api("DELETE",`/pointage/tablets/${id}`);await ptLoad();}catch(e){showToast(e.message,"error");}}
async function ptSetMgrPin(){
  const v=zdVal("pt-mpin");if(!/^\d{6}$/.test(v)){showToast(t("pt_mgr_pin_need"),"error");return;}
  try{await api("PUT","/pointage/manager-pin",{pin:v});showToast(t("pt_mgr_pin_ok"));await ptLoad();}catch(e){showToast(e.message,"error");}
}
async function ptSaveRules(){
  const b={tz:zdVal("pr-tz"),work_start:zdVal("pr-ws"),work_end:zdVal("pr-we"),late_grace_min:parseInt(zdVal("pr-gr"),10)||0,absent_after:zdVal("pr-ab"),clock_from:zdVal("pr-cf"),clock_to:zdVal("pr-ct"),geofence_m:parseInt(zdVal("pr-geo"),10)||0,min_stay_min:parseInt(zdVal("pr-ms"),10)||0,photo_days:parseInt(zdVal("pr-pd"),10),sector:_pt.sector};
  try{await api("PUT","/pointage/settings",b);showToast(t("toast_saved"));_pt.day=null;await ptLoad();}catch(e){const h=document.getElementById("pr-h");if(h){h.style.color="var(--red)";h.textContent=e.message;}}
}
async function ptEmpSector(id,sec){try{await api("PUT",`/pointage/employees/${id}/sector`,{sector:sec});showToast(t("toast_saved"));await ptLoad();}catch(e){showToast(e.message,"error");}}
async function ptUnblock(id){try{await api("POST",`/pointage/employees/${id}/unblock`);await ptLoad();}catch(e){showToast(e.message,"error");}}
async function ptUnenroll(id,name){if(!confirm(abTr("pt_unenroll_confirm",{n:name})))return;try{await api("DELETE",`/pointage/employees/${id}/enrollment`);showToast(t("pt_unenroll_ok"));await ptLoad();}catch(e){showToast(e.message,"error");}}
async function ptReview(id){try{await api("POST",`/pointage/punches/${id}/review`,{});showToast(t("pt_review_ok"));await ptLoad();}catch(e){showToast(e.message,"error");}}
async function ptPhotos(id,name){
  try{const r=await api("GET",`/pointage/punches/${id}/photos`);
    zdModal("modal-pt",`<div class="modal-title"><i class="ti ti-photo" style="color:var(--green)"></i> ${esc(name)}</div>
      <div class="pt-photos"><figure>${r.ref_url?`<img src="${esc(r.ref_url)}" alt="${esc(t("pt_ref_photo"))}">`:`<div class="pt-nophoto">—</div>`}<figcaption>${esc(t("pt_ref_photo"))}</figcaption></figure>
      <figure>${r.punch_url?`<img src="${esc(r.punch_url)}" alt="${esc(t("pt_punch_photo"))}">`:`<div class="pt-nophoto">${esc(t("pt_photo_gone"))}</div>`}<figcaption>${esc(t("pt_punch_photo"))}</figcaption></figure></div>
      <div class="pt-muted">${esc(abTr("pt_photo_rule",{n:r.photo_days}))}</div>
      <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-pt')">${esc(t("btn_close"))}</button></div>`,600);
  }catch(e){showToast(e.message,"error");}
}
function ptFixModal(eid){
  const r=(_pt.list?.rows||[]).find(x=>x.employee_id===eid);if(!r)return;
  zdModal("modal-pt",`<div class="modal-title"><i class="ti ti-pencil" style="color:var(--amber)"></i> ${esc(abTr("pt_fix_t",{n:r.name,d:abDate(_pt.list.day)}))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="pf-in">${esc(t("att_btn_in"))}</label><input class="inp" type="time" id="pf-in" value="${r.local_in||""}"></div><div class="fgrp"><label class="fl" for="pf-out">${esc(t("att_btn_out"))}</label><input class="inp" type="time" id="pf-out" value="${r.local_out||""}"></div></div>
    ${r.local_out?`<label class="sc-chk"><input type="checkbox" id="pf-clr"> ${esc(t("pt_clear_out"))}</label>`:""}
    <div class="fgrp"><label class="fl" for="pf-why">${esc(t("pt_reason"))} *</label><input class="inp" id="pf-why" maxlength="300" placeholder="${esc(t("pt_reason_ph"))}"></div>
    <div class="sc-hint" id="pf-h"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-pt')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="ptFix('${eid}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,480);
}
async function ptFix(eid){
  const h=document.getElementById("pf-h");const why=zdVal("pf-why");
  if(why.length<5){h.style.color="var(--red)";h.textContent=t("pt_reason_need");return;}
  const b={employee_id:eid,day:_pt.list.day,local_in:zdVal("pf-in")||null,local_out:zdVal("pf-out")||null,clear_out:!!document.getElementById("pf-clr")?.checked,reason:why};
  try{await api("PUT","/pointage/attendance",b);zdCloseModal("modal-pt");showToast(t("pt_fix_ok"));await ptLoad();}catch(e){h.style.color="var(--red)";h.textContent=e.message;}
}

// ── Application de la tablette (?pointage) ──
const _ptk={tok:null,home:null,skew:0,pos:null,emp:null,pin:"",photo:null,desc:null,mgrPin:null,enroll:null,faceP:null,timer:null,stream:null,back:null};
function ptkTok(){try{return localStorage.getItem("zd_pt_token");}catch(_){return null;}}
async function ptkApi(method,path,body){
  const r=await fetch(`${API_BASE}${path}`,{method,headers:{"Content-Type":"application/json","X-Tablet-Token":_ptk.tok||""},body:body?JSON.stringify(body):null});
  let d=null;try{d=await r.json();}catch(_){}
  if(!r.ok){const det=d&&d.detail;const e=new Error((det&&typeof det==="object"?det.message:det)||`${t("server_error")} (${r.status})`);e.status=r.status;e.data=det;throw e;}
  return d;
}
function ptkEl(){
  let k=document.getElementById("pt-kiosk");
  if(!k){k=document.createElement("div");k.id="pt-kiosk";document.body.appendChild(k);}
  ["auth-screen","landing","app-screen","portal-view"].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display="none";});
  document.body.classList.add("pt-kiosk-on");return k;
}
async function checkPointageView(){
  if(!new URLSearchParams(window.location.search).has("pointage"))return false;
  ptkEl();_ptk.tok=ptkTok();
  if(!_ptk.tok){ptkPairScreen();return true;}
  await ptkHome();
  try{if(navigator.wakeLock)_ptk.wake=await navigator.wakeLock.request("screen");}catch(_){}
  return true;
}
function ptkPos(){return new Promise(res=>{if(!navigator.geolocation)return res(null);navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude}),()=>res(null),{enableHighAccuracy:true,timeout:8000,maximumAge:120000});});}
function ptkPairScreen(msg){
  const k=ptkEl();
  k.innerHTML=`<div class="ptk-box"><div class="ptk-logo"><i class="ti ti-device-tablet"></i></div><h1>${esc(t("ptk_pair_t"))}</h1><p>${esc(t("ptk_pair_x"))}</p>
    <input class="inp ptk-code" id="ptk-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000" aria-label="${esc(t("pt_pair_code"))}">
    <input class="inp" id="ptk-name" maxlength="80" placeholder="${esc(t("ptk_name_ph"))}" aria-label="${esc(t("ptk_name_ph"))}">
    <button class="btn btn-g ptk-big" onclick="ptkPair()"><i class="ti ti-link"></i> ${esc(t("ptk_pair_go"))}</button><div class="ptk-msg" id="ptk-msg">${esc(msg||"")}</div>
    <div class="ptk-small">${esc(t("ptk_pair_geo"))}</div></div>`;
}
async function ptkPair(){
  const code=(document.getElementById("ptk-code").value||"").replace(/\D/g,""),m=document.getElementById("ptk-msg");
  if(code.length!==6){m.textContent=t("ptk_code6");return;}
  m.textContent=t("ptk_locating");const pos=await ptkPos();
  try{const r=await ptkApi("POST","/public/pointage/pair",{code,name:document.getElementById("ptk-name").value.trim()||null,lat:pos?.lat??null,lng:pos?.lng??null});
    try{localStorage.setItem("zd_pt_token",r.token);}catch(_){}_ptk.tok=r.token;await ptkHome();
  }catch(e){m.textContent=e.message;}
}
function ptkClock(){const h=_ptk.home;if(!h)return {t:"",d:""};const now=new Date(Date.now()+_ptk.skew);
  try{return {t:now.toLocaleTimeString("fr-FR",{timeZone:h.tz,hour:"2-digit",minute:"2-digit"}),d:now.toLocaleDateString(document.documentElement.lang||"fr",{timeZone:h.tz,weekday:"long",day:"numeric",month:"long"})};}
  catch(_){const d=new Date(now.getTime()+h.tz_offset_min*60000);return {t:String(d.getUTCHours()).padStart(2,"0")+":"+String(d.getUTCMinutes()).padStart(2,"0"),d:h.local_day};}}
async function ptkHome(){
  ptkStopCam();const k=ptkEl();
  try{_ptk.home=await ptkApi("GET","/public/pointage/tablet");_ptk.skew=_ptk.home.now_utc_ms-Date.now();}
  catch(e){if(e.status===401){try{localStorage.removeItem("zd_pt_token");}catch(_){}_ptk.tok=null;ptkPairScreen(e.message);return;}k.innerHTML=`<div class="ptk-box"><h1>${esc(t("ptk_offline"))}</h1><p>${esc(e.message)}</p><button class="btn btn-o ptk-big" onclick="ptkHome()">${esc(t("ptk_retry"))}</button></div>`;return;}
  const h=_ptk.home,c=ptkClock();
  if(!h.enabled){k.innerHTML=`<div class="ptk-box"><div class="ptk-logo off"><i class="ti ti-clock-off"></i></div><h1>${esc(t("ptk_disabled"))}</h1><p>${esc(h.business)}</p></div>`;return;}
  k.innerHTML=`<div class="ptk-top"><div><b>${esc(h.business)}</b><span>${esc(h.tablet_name)}</span></div><div class="ptk-clock"><b id="ptk-t">${esc(c.t)}</b><span id="ptk-d">${esc(c.d)}</span></div></div>
    <div class="ptk-main"><h2>${esc(t("ptk_touch"))}</h2>
    ${h.employees.length?ptkNamesHtml(h.employees):`<div class="ptk-empty">${esc(t("ptk_no_emp"))}</div>`}</div>
    <div class="ptk-foot"><span>${esc(abTr("ptk_rules",{a:"\u2066"+h.rules.work_start,b:h.rules.work_end+"\u2069"}))}</span><button type="button" class="btn btn-o btn-sm" onclick="ptkMgrStart()"><i class="ti ti-user-shield"></i> ${esc(t("ptk_mgr"))}</button></div>`;
  clearInterval(_ptk.timer);_ptk.timer=setInterval(()=>{const a=document.getElementById("ptk-t");if(!a)return;const c=ptkClock();a.textContent=c.t;document.getElementById("ptk-d").textContent=c.d;},10000);
  clearTimeout(_ptk.refresh);_ptk.refresh=setTimeout(()=>{if(document.querySelector(".ptk-names,.ptk-empty"))ptkHome();},300000);
  if(h.geofence)ptkPos().then(p=>{_ptk.pos=p;});
  setTimeout(()=>ptFaceInit().catch(()=>null),1500);
}
function ptkNamesHtml(list){
  const btn=e=>`<button type="button" onclick="ptkPick('${e.id}')">${esc(e.name)}</button>`;
  const secs=[...new Set(list.map(e=>e.sector).filter(Boolean))];
  if(secs.length<2)return `<div class="ptk-names">${list.map(btn).join("")}</div>`;
  return secs.map(sc=>`<div class="ptk-sec">${esc(typeof sectorLabel==="function"?sectorLabel(sc):sc)}</div><div class="ptk-names">${list.filter(e=>e.sector===sc).map(btn).join("")}</div>`).join("");
}
function ptkBackLater(ms){clearTimeout(_ptk.back);_ptk.back=setTimeout(()=>ptkHome(),ms||6000);}
function ptkPadHtml(title,sub,len,onDone){
  _ptk.pin="";_ptk.padLen=len;_ptk.padDone=onDone;
  return `<div class="ptk-pad-wrap"><h2>${esc(title)}</h2><p>${esc(sub)}</p><div class="ptk-dots" id="ptk-dots">${"<i></i>".repeat(len)}</div><div class="ptk-msg" id="ptk-msg"></div>
    <div class="ptk-pad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" onclick="ptkKey(${n})">${n}</button>`).join("")}<button type="button" class="alt" onclick="ptkHome()" aria-label="${esc(t("btn_cancel"))}"><i class="ti ti-x"></i></button><button type="button" onclick="ptkKey(0)">0</button><button type="button" class="alt" onclick="ptkKey(-1)" aria-label="${esc(t("ptk_erase"))}"><i class="ti ti-backspace"></i></button></div></div>`;
}
function ptkKey(n){
  if(n<0)_ptk.pin=_ptk.pin.slice(0,-1);else if(_ptk.pin.length<_ptk.padLen)_ptk.pin+=String(n);
  document.querySelectorAll("#ptk-dots i").forEach((d,i)=>d.classList.toggle("on",i<_ptk.pin.length));
  if(_ptk.pin.length===_ptk.padLen){const p=_ptk.pin;setTimeout(()=>_ptk.padDone(p),120);}
  clearTimeout(_ptk.back);_ptk.back=setTimeout(()=>ptkHome(),45000);
}
function ptkPadError(msg){_ptk.pin="";document.querySelectorAll("#ptk-dots i").forEach(d=>d.classList.remove("on"));const d=document.getElementById("ptk-dots");if(d){d.classList.remove("shake");void d.offsetWidth;d.classList.add("shake");}const m=document.getElementById("ptk-msg");if(m)m.textContent=msg;}
function ptkPick(id){
  _ptk.emp=_ptk.home.employees.find(e=>e.id===id);if(!_ptk.emp)return;
  ptkEl().innerHTML=ptkPadHtml(abTr("ptk_hello",{n:_ptk.emp.name}),t("ptk_pin"),4,pin=>{_ptk.empPin=pin;ptkCamera("punch");});
  ptkBackLater(45000);
}
// Caméra et visage
async function ptkStartCam(video){
  ptkStopCam();
  _ptk.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false});
  video.srcObject=_ptk.stream;await video.play();
}
function ptkStopCam(){try{(_ptk.stream?.getTracks()||[]).forEach(x=>x.stop());}catch(_){}_ptk.stream=null;}
function ptkGrab(video){const c=document.createElement("canvas");const w=480,h=Math.round(480*((video.videoHeight||480)/(video.videoWidth||640)));c.width=w;c.height=h;c.getContext("2d").drawImage(video,0,0,w,h);return c;}
function ptLoadScript(src){return new Promise((ok,ko)=>{if(window.faceapi)return ok();const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>ko(new Error("face-api"));document.head.appendChild(s);});}
function ptFaceInit(){
  if(window.zdPtFaceHook)return Promise.resolve(true);
  if(!_ptk.faceP)_ptk.faceP=(async()=>{await ptLoadScript(`${PT_FACE_CDN}/dist/face-api.js`);const M=`${PT_FACE_CDN}/model`;const tf=faceapi.tf;
    for(const b of["webgl","cpu"]){try{if(await tf.setBackend(b))break;}catch(_){}}
    await tf.ready();
    await faceapi.nets.tinyFaceDetector.loadFromUri(M);await faceapi.nets.faceLandmark68TinyNet.loadFromUri(M);await faceapi.nets.faceRecognitionNet.loadFromUri(M);return true;})().catch(e=>{_ptk.faceP=null;throw e;});
  return _ptk.faceP;
}
async function ptFaceDesc(canvas){
  try{
    if(window.zdPtFaceHook)return await window.zdPtFaceHook(canvas);
    await Promise.race([ptFaceInit(),new Promise((_,ko)=>setTimeout(()=>ko(new Error("timeout")),20000))]);
    const r=await faceapi.detectSingleFace(canvas,new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:0.5})).withFaceLandmarks(true).withFaceDescriptor();
    return r?Array.from(r.descriptor).map(x=>Math.round(x*1e6)/1e6):null;
  }catch(_){return null;}
}
async function ptkCamera(mode){
  const k=ptkEl();
  k.innerHTML=`<div class="ptk-cam"><h2>${esc(t(mode==="punch"?"ptk_look":"ptk_enroll_face"))}</h2><div class="ptk-video"><video id="ptk-v" playsinline muted></video><div class="ptk-count" id="ptk-count"></div></div><div class="ptk-msg" id="ptk-msg"></div>
    <button type="button" class="btn btn-o" onclick="ptkHome()">${esc(t("btn_cancel"))}</button></div>`;
  const v=document.getElementById("ptk-v");
  try{await ptkStartCam(v);}catch(e){document.getElementById("ptk-msg").textContent=t("ptk_no_cam");if(mode!=="punch")return;}
  const shots=mode==="punch"?1:3,descs=[];let photo=null;
  for(let i=0;i<shots;i++){
    for(let n=3;n>0;n--){const c=document.getElementById("ptk-count");if(!c)return;c.textContent=n;await new Promise(r=>setTimeout(r,mode==="punch"?450:550));}
    const c=document.getElementById("ptk-count");if(!c)return;c.textContent="📸";
    const cv=_ptk.stream?ptkGrab(v):null;if(cv&&!photo)photo=cv.toDataURL("image/jpeg",0.82);
    const d=cv?await ptFaceDesc(cv):null;descs.push(d);
    if(mode!=="punch")document.getElementById("ptk-msg").textContent=abTr("ptk_shot",{n:i+1,m:shots})+(d?"":" · "+t("ptk_no_face"));
  }
  ptkStopCam();
  if(mode==="punch"){_ptk.photo=photo;_ptk.desc=descs[0];ptkConfirm();}
  else{_ptk.enroll.photo=photo;_ptk.enroll.descs=descs.filter(Boolean);
    if(!_ptk.enroll.descs.length&&!window.zdPtFaceHook){k.innerHTML=`<div class="ptk-box"><h1>${esc(t("ptk_face_fail"))}</h1><p>${esc(t("ptk_face_fail_x"))}</p><button class="btn btn-g ptk-big" onclick="ptkCamera('enroll')">${esc(t("ptk_retry"))}</button><button class="btn btn-o" onclick="ptkHome()">${esc(t("btn_cancel"))}</button></div>`;return;}
    ptkEnrollPin();}
}
function ptkConfirm(){
  const e=_ptk.emp;
  ptkEl().innerHTML=`<div class="ptk-box"><div class="ptk-photo">${_ptk.photo?`<img src="${_ptk.photo}" alt="">`:`<i class="ti ti-user"></i>`}</div><h1>${esc(e.name)}</h1><p>${esc(_ptk.desc?t("ptk_face_ok"):t("ptk_face_none"))}</p>
    <button class="btn btn-g ptk-big" id="ptk-go" onclick="ptkPunch()"><i class="ti ti-check"></i> ${esc(t("ptk_confirm"))}</button><button class="btn btn-o" onclick="ptkPick('${e.id}')">${esc(t("ptk_again"))}</button><div class="ptk-msg" id="ptk-msg"></div></div>`;
  ptkBackLater(30000);
}
async function ptkPunch(){
  const b=document.getElementById("ptk-go");if(b)b.disabled=true;
  if(_ptk.home.geofence&&!_ptk.pos)_ptk.pos=await ptkPos();
  try{
    const r=await ptkApi("POST","/public/pointage/punch",{employee_id:_ptk.emp.id,pin:_ptk.empPin,descriptor:_ptk.desc||null,photo:_ptk.photo||null,lat:_ptk.pos?.lat??null,lng:_ptk.pos?.lng??null});
    const cls=r.status==="ok"?"ok":r.status==="check"?"check":"late";
    ptkEl().innerHTML=`<div class="ptk-box ptk-res ${cls}"><div class="ptk-logo"><i class="ti ti-${r.status==="check"?"alert-triangle":"circle-check"}"></i></div><h1>${esc(abTr(r.action==="in"?"ptk_in_ok":"ptk_out_ok",{n:r.name.split(" ")[0],h:r.local_time}))}</h1>
      <p class="ptk-st">${esc(t("ptk_st_"+r.status))}</p>${r.flags.length?`<p>${r.flags.map(f=>esc(t("pt_fl_"+f))).join(" · ")}</p>`:""}</div>`;
    ptkBackLater(r.status==="check"?8000:5000);
  }catch(e){
    if(e.status===401&&e.data&&e.data.error==="pin"){ptkEl().innerHTML=ptkPadHtml(abTr("ptk_hello",{n:_ptk.emp.name}),t("ptk_pin"),4,pin=>{_ptk.empPin=pin;ptkPunch();});ptkPadError(e.message);ptkBackLater(45000);return;}
    ptkEl().innerHTML=`<div class="ptk-box ptk-res bad"><div class="ptk-logo"><i class="ti ti-${e.status===423?"lock":e.status===403?"map-pin-off":"alert-circle"}"></i></div><h1>${esc(t(e.status===423?"ptk_blocked":e.status===409?"ptk_done":"ptk_refused"))}</h1><p>${esc(e.message)}</p></div>`;
    ptkBackLater(7000);
  }
}
// Enregistrement d'un employé (en présence du gérant)
function ptkMgrStart(){
  if(!_ptk.home.manager_pin_set){ptkEl().innerHTML=`<div class="ptk-box"><h1>${esc(t("ptk_mgr_unset"))}</h1><p>${esc(t("ptk_mgr_unset_x"))}</p><button class="btn btn-o ptk-big" onclick="ptkHome()">${esc(t("btn_close"))}</button></div>`;return;}
  ptkEl().innerHTML=ptkPadHtml(t("ptk_mgr_t"),t("ptk_mgr_pin"),6,async pin=>{
    try{const r=await ptkApi("POST","/public/pointage/manager",{manager_pin:pin});_ptk.mgrList=r.employees;ptkEnrollList();}catch(e){ptkPadError(e.message);}
  });ptkBackLater(45000);
}
function ptkEnrollList(){
  ptkEl().innerHTML=`<div class="ptk-main"><h2>${esc(t("ptk_enroll_t"))}</h2><p class="ptk-sub">${esc(t("ptk_enroll_x"))}</p><div class="ptk-names">${_ptk.mgrList.map(e=>`<button type="button" class="${e.enrolled?"done":""}" onclick="ptkEnrollStart('${e.id}')">${esc(e.name)}<small>${esc(t(e.enrolled?"ptk_re_enroll":"pt_not_enrolled"))}</small></button>`).join("")||`<div class="ptk-empty">${esc(t("ptk_no_emp_any"))}</div>`}</div>
    <div class="ptk-foot"><span></span><button type="button" class="btn btn-o btn-sm" onclick="ptkHome()">${esc(t("btn_close"))}</button></div></div>`;
  ptkBackLater(120000);
}
function ptkEnrollStart(id){
  const e=_ptk.mgrList.find(x=>x.id===id);if(!e)return;_ptk.enroll={id,name:e.name,photo:null,descs:[],pin:null};
  ptkEl().innerHTML=`<div class="ptk-box"><h1>${esc(e.name)}</h1><ol class="ptk-steps"><li>${esc(t("ptk_step_face"))}</li><li>${esc(t("ptk_step_pin"))}</li><li>${esc(t("ptk_step_ok"))}</li></ol>
    <button class="btn btn-g ptk-big" onclick="ptkCamera('enroll')"><i class="ti ti-camera"></i> ${esc(t("ptk_start"))}</button><button class="btn btn-o" onclick="ptkEnrollList()">${esc(t("btn_cancel"))}</button></div>`;
}
function ptkEnrollPin(){
  ptkEl().innerHTML=ptkPadHtml(abTr("ptk_choose_pin",{n:_ptk.enroll.name}),t("ptk_choose_pin_x"),4,pin=>{
    _ptk.enroll.pin1=pin;ptkEl().innerHTML=ptkPadHtml(t("ptk_repeat_pin"),t("ptk_choose_pin_x"),4,p2=>{
      if(p2!==_ptk.enroll.pin1){ptkEnrollPin();ptkPadError(t("ptk_pin_diff"));return;}
      _ptk.enroll.pin=p2;ptkEnrollValidate();});
  });
}
function ptkEnrollValidate(){
  const en=_ptk.enroll;
  ptkEl().innerHTML=`<div class="ptk-box"><div class="ptk-photo">${en.photo?`<img src="${en.photo}" alt="">`:`<i class="ti ti-user"></i>`}</div><h1>${esc(en.name)}</h1><p>${esc(abTr("ptk_face_n",{n:en.descs.length}))}</p>
    <label class="ptk-consent"><input type="checkbox" id="ptk-consent"> ${esc(t("ptk_consent"))}</label>
    <button class="btn btn-g ptk-big" onclick="ptkEnrollMgrPin()"><i class="ti ti-user-check"></i> ${esc(t("ptk_mgr_validate"))}</button><button class="btn btn-o" onclick="ptkEnrollList()">${esc(t("btn_cancel"))}</button><div class="ptk-msg" id="ptk-msg"></div></div>`;
}
function ptkEnrollMgrPin(){
  if(!document.getElementById("ptk-consent")?.checked){document.getElementById("ptk-msg").textContent=t("ptk_consent_need");return;}
  const en=_ptk.enroll;
  ptkEl().innerHTML=ptkPadHtml(t("ptk_mgr_t"),t("ptk_mgr_confirm"),6,async pin=>{
    try{await ptkApi("POST","/public/pointage/enroll",{manager_pin:pin,employee_id:en.id,pin:en.pin,descriptors:en.descs,photo:en.photo,consent:true});
      ptkEl().innerHTML=`<div class="ptk-box ptk-res ok"><div class="ptk-logo"><i class="ti ti-circle-check"></i></div><h1>${esc(abTr("ptk_enrolled",{n:en.name}))}</h1><p>${esc(t("ptk_enrolled_x"))}</p></div>`;
      _ptk.enroll=null;ptkBackLater(5000);
    }catch(e){if(e.status===401){ptkPadError(e.message);return;}ptkEl().innerHTML=`<div class="ptk-box ptk-res bad"><h1>${esc(t("ptk_refused"))}</h1><p>${esc(e.message)}</p><button class="btn btn-o ptk-big" onclick="ptkEnrollStart('${en.id}')">${esc(t("ptk_retry"))}</button></div>`;}
  });
}
if(typeof checkSectorPublicViews==="function"){const _ptCs=checkSectorPublicViews;checkSectorPublicViews=async function(){if(await checkPointageView())return true;return _ptCs();};}
