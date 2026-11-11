// ── 10.5.0 · Pages publiques, « Mes secteurs », réglage admin des secteurs ouverts, bons signés, employés des rendez-vous, photos ──
MODULE_PAGES.plus.push(["mysectors","building-community","v5_my_sectors",null]);SECTOR_PAGE_MODULE.mysectors="plus";V5_HIDDEN.add("mysectors");
MODULE_PAGES.pme.push(["v5dn","truck-delivery","v5_t_dn","stock"]);SECTOR_PAGE_MODULE.v5dn="pme";if(typeof PAGE_MODULES==="object")PAGE_MODULES.v5dn="stock";V5_HIDDEN.add("v5dn");

// Liens d'alerte et notifications vers les pages des secteurs
const V5_ALIAS={temps:()=>hasModule("resto")?"restotemps":"pharmatemps"};
const _v5Nav=navigate;
navigate=function(page){if(V5_ALIAS[page])page=V5_ALIAS[page]();return _v5Nav(page);};
if(typeof openDeepLink==="function"){
  const _v5Odl=openDeepLink;
  openDeepLink=async function(page,conv,action){if(await _v5Odl(page,conv,action))return true;if(page&&(V5_ALIAS[page]||sectorPageInfo(page))){navigate(page);return true;}return false;};
}

// ── Pages publiques ──
function v5Pub(title){
  document.getElementById("auth-screen").style.display="none";const land=document.getElementById("landing");if(land)land.style.display="none";
  document.getElementById("portal-view").style.display="block";document.getElementById("portal-company").textContent=title||"";
  return document.getElementById("portal-content");
}
async function v5PubGet(path,opt){const r=await fetch(API_BASE+path,opt);let d={};try{d=await r.json();}catch(_){}if(!r.ok)throw new Error(typeof d.detail==="string"?d.detail:(d.detail?.message||t("v5_link_bad")));return d;}
function v5PubPost(path,body){return v5PubGet(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})});}

async function v5RoomView(tok){
  const box=v5Pub("");_v5.pubRoom=_v5.pubRoom||{tok,cart:{}};
  try{const d=await v5PubGet(`/public/room/${encodeURIComponent(tok)}?mine=${encodeURIComponent(v5RoomMine(tok).join(","))}`);_v5.pubRoom.d=d;document.getElementById("portal-company").textContent=d.hotel;
    const cart=_v5.pubRoom.cart;const tot=d.menu.reduce((s,x)=>s+(cart[x.id]||0)*x.price,0);
    const cats=[...new Set(d.menu.map(x=>x.category||""))];
    box.innerHTML=`<div class="card2" style="margin-bottom:12px"><b style="font-size:16px"><i class="ti ti-tools-kitchen-2"></i> ${esc(t("v5_pub_room_t").replace("{n}",d.room))}</b><div style="font-size:13px;color:var(--muted)">${esc(t(d.open?"v5_pub_room_x":d.in_house?"v5_pub_room_closed":"v5_pub_room_nostay"))}</div></div>
      ${d.open?cats.map(c=>`${c?`<div class="fl" style="margin-top:10px">${esc(c)}</div>`:""}${d.menu.filter(x=>(x.category||"")===c).map(x=>`<div class="card v5-pub-item"><span style="flex:1"><b>${esc(x.name)}</b><div style="font-size:13px;color:var(--muted)">${zdMoney(x.price)}</div></span>
        <span class="v5-stepper"><button class="btn btn-o btn-sm" aria-label="−" onclick="v5RoomQty('${x.id}',-1)">−</button><b>${cart[x.id]||0}</b><button class="btn btn-o btn-sm" aria-label="+" onclick="v5RoomQty('${x.id}',1)">+</button></span></div>`).join("")}`).join("")
        +`<div class="fgrp" style="margin-top:10px"><label class="fl" for="v5-pr-n">${esc(t("v5_note"))}</label><input class="inp" id="v5-pr-n" maxlength="500" placeholder="${esc(t("v5_pub_room_note"))}" value="${esc(_v5.pubRoom.note||"")}" oninput="_v5.pubRoom.note=this.value"></div>
        <div class="err-box" id="v5-pr-err"></div><button class="btn btn-g" style="width:100%;padding:12px" ${tot>0?"":"disabled"} onclick="v5RoomOrder()"><i class="ti ti-send"></i> ${esc(t("v5_pub_order"))} · ${zdMoney(tot)}</button>
        <div style="font-size:12px;color:var(--muted);text-align:center;margin-top:6px">${esc(t("v5_pub_room_bill"))}</div>`:""}
      ${d.orders.length?`<div class="card" style="margin-top:12px"><b>${esc(t("v5_pub_my_orders"))}</b>${d.orders.map(o=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(zdTime(o.created_at))} · ${o.items.map(i=>`${i.qty} × ${esc(i.name)}`).join(", ")}</span><b>${esc(t("v5_ros_"+o.status))}</b></div>`).join("")}</div>`:""}`;
  }catch(e){box.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;}
  return true;
}
function v5RoomQty(id,d){const c=_v5.pubRoom.cart;c[id]=Math.max(0,Math.min(50,(c[id]||0)+d));v5RoomView(_v5.pubRoom.tok);}
async function v5RoomOrder(){const c=_v5.pubRoom.cart;const lines=Object.entries(c).filter(([,q])=>q>0).map(([id,qty])=>({id,qty}));
  try{const ro=await v5PubPost(`/public/room/${encodeURIComponent(_v5.pubRoom.tok)}/orders`,{lines,note:_v5.pubRoom.note||null});v5RoomMineAdd(_v5.pubRoom.tok,ro&&ro.token);_v5.pubRoom.cart={};_v5.pubRoom.note="";showToast(t("v5_pub_order_ok"));v5RoomView(_v5.pubRoom.tok);}
  catch(e){showErr("v5-pr-err",e.message);}}

async function v5CaseView(tok){
  const box=v5Pub("");
  try{const d=await v5PubGet(`/public/case/${encodeURIComponent(tok)}`);document.getElementById("portal-company").textContent=d.company;
    const idx=d.flow.indexOf(d.status);
    box.innerHTML=`<div class="card"><div style="font-size:12px;color:var(--muted)">${esc(t("v5_pub_case_t"))} · <span class="mono">${esc(d.number)}</span></div><div style="font-size:18px;font-weight:800;margin:4px 0">${esc(d.title)}</div>
      <div style="font-weight:800;color:var(--green)">${esc(t("v5_cs_"+d.status))}</div>${d.planned_day?`<div style="font-size:13px;margin-top:4px">${esc(t("v5_planned_on"))} ${esc(v5Date(d.planned_day))}</div>`:""}${d.assignee?`<div style="font-size:13px">${esc(t("v5_tech"))} : ${esc(d.assignee)}</div>`:""}</div>
      <div class="card"><ol class="v5-steps">${d.flow.map((s,i)=>{const h=[...d.history].reverse().find(x=>x.status===s);return `<li class="${i<=idx&&idx>=0?"on":""}${i===idx?" cur":""}"><i></i><span>${esc(t("v5_cs_"+s))}${h?`<small>${esc(fmtDate(h.at))}${h.note?` · ${esc(h.note)}`:""}</small>`:""}</span></li>`;}).join("")}</ol>
        ${d.status==="cancelled"?`<div style="color:var(--red);font-weight:700">${esc(t("v5_cs_cancelled"))}</div>`:""}${d.total!=null?`<div style="display:flex;justify-content:space-between;margin-top:8px"><span>${esc(t("v5_total"))}</span><b>${zdMoney(d.total)}</b></div>`:""}</div>
      ${d.phone?`<a class="btn btn-g" style="width:100%;padding:12px" href="${esc(v5Wa(d.phone,t("v5_pub_case_wa").replace("{n}",d.number)))}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> ${esc(t("v5_contact_company"))}</a>`:""}`;
  }catch(e){box.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;}
  return true;
}

async function v5QueueView(slug,ticket){
  const box=v5Pub("");
  try{
    if(ticket){const d=await v5PubGet(`/public/queue/ticket/${encodeURIComponent(ticket)}`);document.getElementById("portal-company").textContent=d.salon;
      box.innerHTML=`<div class="card" style="text-align:center"><div style="font-size:13px;color:var(--muted)">${esc(t("v5_pub_your_ticket"))}</div><div class="v5-ticket">${d.num}</div><div style="font-weight:800">${esc(d.name)}</div>
        <div style="font-size:16px;margin-top:10px;color:${d.status==="called"?"var(--amber)":"var(--green)"};font-weight:800">${esc(d.status==="waiting"?t("v5_pub_ahead").replace("{n}",d.ahead).replace("{m}",d.wait_min):t("v5_qs_"+d.status))}</div>
        ${d.status==="waiting"?`<button class="btn btn-o btn-sm" style="margin-top:14px" onclick="v5QueueLeave('${escJs(slug)}','${escJs(ticket)}')">${esc(t("v5_pub_leave"))}</button>`:""}<div style="font-size:11px;color:var(--muted);margin-top:10px">${esc(t("v5_pub_refresh"))}</div></div>`;
      clearTimeout(_v5.qvT);if(["waiting","called"].includes(d.status))_v5.qvT=setTimeout(()=>v5QueueView(slug,ticket),30000);return true;}
    const d=await v5PubGet(`/public/queue/${encodeURIComponent(slug)}`);document.getElementById("portal-company").textContent=d.salon;
    let saved=null;try{saved=localStorage.getItem("zd_q_"+slug);}catch(_){}
    box.innerHTML=`<div class="card2" style="margin-bottom:12px"><b style="font-size:16px"><i class="ti ti-list-details"></i> ${esc(t("v5_pub_queue_t"))}</b><div style="font-size:13px;color:var(--muted)">${esc(t("v5_pub_queue_now").replace("{n}",d.waiting).replace("{m}",d.waiting*d.avg_min))}</div></div>
      ${saved?`<button class="btn btn-o" style="width:100%;margin-bottom:10px" onclick="v5QueueView('${escJs(slug)}','${escJs(saved)}')"><i class="ti ti-ticket"></i> ${esc(t("v5_pub_see_ticket"))}</button>`:""}
      ${d.open?`<div class="card"><div class="fgrp"><label class="fl" for="v5-pq-n">${esc(t("v5_name"))} *</label><input class="inp" id="v5-pq-n" maxlength="160" autocomplete="name"></div>
        <div class="fgrp"><label class="fl" for="v5-pq-p">${esc(t("v5_phone"))} *</label><input class="inp" id="v5-pq-p" type="tel" inputmode="tel" maxlength="50" placeholder="+243 …"></div>
        ${d.services.length?`<div class="fgrp"><label class="fl" for="v5-pq-s">${esc(t("v5_service"))}</label><select class="inp" id="v5-pq-s"><option value="">—</option>${d.services.map(s=>`<option>${esc(s)}</option>`).join("")}</select></div>`:""}
        <div class="err-box" id="v5-pq-err"></div><button class="btn btn-g" style="width:100%;padding:12px" onclick="v5QueueJoin('${escJs(slug)}')"><i class="ti ti-ticket"></i> ${esc(t("v5_pub_take_ticket"))}</button></div>`
        :`<div class="card" style="text-align:center;color:var(--muted)">${esc(t("v5_pub_queue_closed"))}</div>`}`;
  }catch(e){box.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;}
  return true;
}
async function v5QueueJoin(slug){const n=zdVal("v5-pq-n"),p=zdVal("v5-pq-p");if(n.length<2||p.replace(/\D/g,"").length<6){showErr("v5-pq-err",t("v5_pub_need_name_phone"));return;}
  try{const r=await v5PubPost(`/public/queue/${encodeURIComponent(slug)}`,{name:n,phone:p,service:zdVal("v5-pq-s")||null});try{localStorage.setItem("zd_q_"+slug,r.token);}catch(_){}
    history.replaceState(null,"",`/?queue=${encodeURIComponent(slug)}&ticket=${encodeURIComponent(r.token)}`);v5QueueView(slug,r.token);}catch(e){showErr("v5-pq-err",e.message);}}
async function v5QueueLeave(slug,tk){if(!confirm(t("v5_pub_leave_q")))return;try{await v5PubPost(`/public/queue/ticket/${encodeURIComponent(tk)}/leave`);try{localStorage.removeItem("zd_q_"+slug);}catch(_){}history.replaceState(null,"",`/?queue=${encodeURIComponent(slug)}`);v5QueueView(slug);}catch(e){showToast(e.message,"error");}}

async function v5PreregView(slug){
  const box=v5Pub("");
  try{const d=await v5PubGet(`/public/school/prereg/${encodeURIComponent(slug)}`);document.getElementById("portal-company").textContent=d.school;
    box.innerHTML=`<div class="card2" style="margin-bottom:12px"><b style="font-size:16px"><i class="ti ti-school"></i> ${esc(t("v5_pub_prereg_t"))}${d.year?` ${esc(d.year)}`:""}</b>${d.note?`<div style="font-size:13px;margin-top:4px">${esc(d.note)}</div>`:""}${d.address||d.phone?`<div style="font-size:12px;color:var(--muted);margin-top:4px">${esc([d.address,d.phone].filter(Boolean).join(" · "))}</div>`:""}</div>`+
      (d.open?`<div class="card"><b>${esc(t("v5_pub_child"))}</b><div class="grid2" style="margin-top:6px"><div class="fgrp"><label class="fl" for="v5-pp-ln">${esc(t("v5_last_name"))} *</label><input class="inp" id="v5-pp-ln" maxlength="80"></div><div class="fgrp"><label class="fl" for="v5-pp-fn">${esc(t("v5_first_name"))} *</label><input class="inp" id="v5-pp-fn" maxlength="80"></div></div>
        <div class="grid3"><div class="fgrp"><label class="fl" for="v5-pp-g">${esc(t("v5_gender"))}</label><select class="inp" id="v5-pp-g"><option value="">—</option><option value="F">${esc(t("v5_girl"))}</option><option value="M">${esc(t("v5_boy"))}</option></select></div>
          <div class="fgrp"><label class="fl" for="v5-pp-b">${esc(t("v5_birth_day"))}</label><input class="inp" id="v5-pp-b" type="date"></div>
          <div class="fgrp"><label class="fl" for="v5-pp-c">${esc(t("v5_wanted_class"))}</label>${d.classes.length?`<select class="inp" id="v5-pp-c"><option value="">—</option>${d.classes.map(c=>`<option>${esc(c)}</option>`).join("")}</select>`:`<input class="inp" id="v5-pp-c" maxlength="120">`}</div></div>
        <div class="fgrp"><label class="fl" for="v5-pp-ps">${esc(t("v5_previous_school"))}</label><input class="inp" id="v5-pp-ps" maxlength="200"></div>
        <b>${esc(t("v5_pub_parent"))}</b><div class="grid2" style="margin-top:6px"><div class="fgrp"><label class="fl" for="v5-pp-pn">${esc(t("v5_name"))} *</label><input class="inp" id="v5-pp-pn" maxlength="160"></div><div class="fgrp"><label class="fl" for="v5-pp-pp">${esc(t("v5_phone"))} *</label><input class="inp" id="v5-pp-pp" type="tel" maxlength="50"></div></div>
        <div class="fgrp"><label class="fl" for="v5-pp-pe">${esc(t("lbl_email"))}</label><input class="inp" id="v5-pp-pe" type="email" maxlength="200"></div>
        <div class="fgrp"><label class="fl" for="v5-pp-no">${esc(t("v5_note"))}</label><textarea class="inp" id="v5-pp-no" rows="2" maxlength="1000"></textarea></div>
        <div class="err-box" id="v5-pp-err"></div><button class="btn btn-g" style="width:100%;padding:12px" onclick="v5PreregSend('${escJs(slug)}')"><i class="ti ti-send"></i> ${esc(t("v5_pub_send"))}</button></div>`
        :`<div class="card" style="text-align:center;color:var(--muted)">${esc(t("v5_pub_prereg_closed"))}</div>`);
  }catch(e){box.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;}
  return true;
}
async function v5PreregSend(slug){
  const b={last_name:zdVal("v5-pp-ln"),first_name:zdVal("v5-pp-fn"),gender:zdVal("v5-pp-g")||null,birth_day:zdVal("v5-pp-b")||null,wanted_class:zdVal("v5-pp-c")||null,previous_school:zdVal("v5-pp-ps")||null,parent_name:zdVal("v5-pp-pn"),parent_phone:zdVal("v5-pp-pp"),parent_email:zdVal("v5-pp-pe")||null,note:zdVal("v5-pp-no")||null};
  if(!b.last_name||!b.first_name||b.parent_name.length<2||b.parent_phone.length<6){showErr("v5-pp-err",t("v5_pub_fill"));return;}
  try{const r=await v5PubPost(`/public/school/prereg/${encodeURIComponent(slug)}`,b);
    document.getElementById("portal-content").innerHTML=`<div class="card" style="text-align:center"><div style="font-size:42px">✅</div><div style="font-size:18px;font-weight:800;margin:6px 0">${esc(t("v5_pub_prereg_ok"))}</div><div>${esc(t("v5_pub_prereg_ok_x").replace("{n}",r.number))}</div></div>`;}
  catch(e){showErr("v5-pp-err",e.message);}
}

// Parents : cahier de textes, entrées, cantine, rendez-vous avec les enseignants
async function v5ParentExtras(tok){
  try{const d=await v5PubGet(`/public/school/student/${encodeURIComponent(tok)}`);const box=document.getElementById("portal-content");if(!box)return;_v5.par={tok,d};
    _sc.set=_sc.set||{currency:d.currency};const m=d.meetings||{mine:[],free:[]};
    let el=document.getElementById("v5-par");if(!el){el=document.createElement("div");el.id="v5-par";box.appendChild(el);}
    el.innerHTML=`${d.wallet?`<div class="card2" style="margin-top:12px"><b><i class="ti ti-tools-kitchen-2"></i> ${esc(t("v5_t_canteen"))}</b><div style="font-size:14px;margin-top:4px">${esc(t("v5_balance"))} <b>${scMoney(d.wallet.balance)}</b>${d.wallet.meal_price?` · ${esc(t("v5_meal_price"))} ${scMoney(d.wallet.meal_price)}`:""}</div></div>`:""}
      ${(d.homework||[]).length?`<div class="card2" style="margin-top:12px"><b><i class="ti ti-book"></i> ${esc(t("v5_t_homework"))}</b>${d.homework.slice(0,10).map(h=>`<div style="border-top:1px solid var(--b);padding:6px 0;font-size:13px"><b>${esc(h.subject)}</b> · ${esc(v5Date(h.day))}${h.lesson?`<div>${esc(h.lesson)}</div>`:""}${h.homework?`<div style="color:var(--amber)">${esc(t("v5_homework"))} : ${esc(h.homework)}${h.due_day?` (${esc(t("v5_for_day"))} ${esc(v5Date(h.due_day))})`:""}</div>`:""}</div>`).join("")}</div>`:""}
      ${(d.gate||[]).length?`<div class="card2" style="margin-top:12px"><b><i class="ti ti-door-enter"></i> ${esc(t("v5_pub_gate"))}</b>${d.gate.map(g=>`<div style="font-size:13px;padding:3px 0">${esc(v5Date(g.day))} · ${esc(g.hm)} · ${esc(t("v5_dir_"+g.direction))}${g.late?` · <b style="color:var(--amber)">${esc(t("v5_late"))}</b>`:""}</div>`).join("")}</div>`:""}
      <div class="card2" style="margin-top:12px"><b><i class="ti ti-calendar-event"></i> ${esc(t("v5_t_meetings"))}</b>
        ${m.mine.map(x=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(v5Date(x.day))} · ${esc(x.start)} · ${esc(x.teacher||"")}${x.place?` · ${esc(x.place)}`:""}</span><button class="btn btn-o btn-sm" onclick="v5ParCancel('${x.id}')">${esc(t("btn_cancel"))}</button></div>`).join("")}
        ${m.free.length?`<div class="fgrp" style="margin-top:8px"><label class="fl" for="v5-par-s">${esc(t("v5_pub_pick_slot"))}</label><select class="inp" id="v5-par-s">${m.free.map(x=>`<option value="${x.id}">${esc(v5Date(x.day))} · ${esc(x.start)} · ${esc(x.teacher||"")}</option>`).join("")}</select></div>
          <div class="grid2"><div class="fgrp"><label class="fl" for="v5-par-n">${esc(t("v5_your_name"))} *</label><input class="inp" id="v5-par-n" maxlength="160"></div><div class="fgrp"><label class="fl" for="v5-par-o">${esc(t("v5_subject_opt"))}</label><input class="inp" id="v5-par-o" maxlength="300"></div></div>
          <div class="err-box" id="v5-par-err"></div><button class="btn btn-g btn-sm" onclick="v5ParBook()"><i class="ti ti-check"></i> ${esc(t("v5_pub_book"))}</button>`:`<div style="font-size:12px;color:var(--muted);margin-top:4px">${esc(t("v5_pub_no_slots"))}</div>`}</div>`;
  }catch(_){}
}
async function v5ParBook(){const n=zdVal("v5-par-n");if(n.length<2){showErr("v5-par-err",t("v5_your_name"));return;}
  try{const r=await v5PubPost(`/public/school/student/${encodeURIComponent(_v5.par.tok)}/meetings`,{slot_id:zdVal("v5-par-s"),parent_name:n,subject:zdVal("v5-par-o")||null});showToast(t("v5_pub_booked").replace("{d}",v5Date(r.day)).replace("{h}",r.start));v5ParentExtras(_v5.par.tok);}catch(e){showErr("v5-par-err",e.message);}}
async function v5ParCancel(id){if(!confirm(t("v5_cancel_q")))return;try{await v5PubPost(`/public/school/student/${encodeURIComponent(_v5.par.tok)}/meetings/${id}/cancel`);v5ParentExtras(_v5.par.tok);}catch(e){showToast(e.message,"error");}}

if(typeof checkSectorPublicViews==="function"){
  const _v5Cspv=checkSectorPublicViews;
  checkSectorPublicViews=async function(){
    const q=new URLSearchParams(window.location.search);
    if(q.get("room"))return v5RoomView(q.get("room"));
    if(q.get("suivi"))return v5CaseView(q.get("suivi"));
    if(q.get("queue"))return v5QueueView(q.get("queue"),q.get("ticket"));
    if(q.get("inscription"))return v5PreregView(q.get("inscription"));
    const r=await _v5Cspv();
    if(r&&q.get("eleve")&&!State.token)v5ParentExtras(q.get("eleve"));
    return r;
  };
}

// ── Mes secteurs (gratuité) ──
SECTOR_PAGE_LOADERS.mysectors=async el=>{
  const r=await api("GET","/me/free-sectors");_v5.ms=r;const mgr=v5Mgr();
  const left=r.max_sectors?Math.max(0,r.max_sectors-r.used):null;
  const head=r.allowed?`<div class="card2" style="color:var(--green);margin-bottom:12px"><i class="ti ti-gift"></i> ${esc(t("v5_ms_free").replace("{d}",v5Date(r.until)))}${r.max_sectors?` · ${esc(t("v5_ms_limit").replace("{n}",r.max_sectors).replace("{u}",r.used))}`:""}</div>`
    :`<div class="card2" style="margin-bottom:12px;color:var(--muted)"><i class="ti ti-info-circle"></i> ${esc(t(r.reason==="full"?"v5_ms_full":r.free_active?"v5_ms_own":"v5_ms_paid"))}</div>`;
  el.innerHTML=v5Head(t("v5_my_sectors"),t("v5_ms_x"))+head+
    `<div class="v5-cards">${r.sectors.map(s=>{const m=SECTOR_META[s.key]||{};return `<div class="card v5-sec${s.own?" own":""}" style="--sc:${m.color||"var(--green)"}"><div style="display:flex;gap:8px;align-items:center"><i class="ti ti-${m.icon||"building"}" style="font-size:22px;color:${m.color||"var(--green)"}"></i><b style="flex:1">${esc(sectorLabel(s.key))}</b>
      ${s.main?v5Badge(t("v5_ms_main"),"bg"):s.own?v5Badge(t("v5_ms_added"),"bb"):""}</div><div style="font-size:12px;color:var(--muted);margin:6px 0">${esc(t("sector_tagline_"+s.key))}</div>
      ${s.prices&&s.prices[0]?`<div style="font-size:12px">${esc(t("v5_ms_after").replace("{p}",zdMoney(s.prices[0])))}</div>`:""}
      ${mgr&&!s.main?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${s.own?`<button class="btn btn-o btn-sm" onclick="v5MsSet('main','${s.key}')"><i class="ti ti-star"></i> ${esc(t("v5_ms_make_main"))}</button><button class="btn btn-o btn-sm" onclick="v5MsSet('remove','${s.key}')"><i class="ti ti-x"></i> ${esc(t("v5_ms_remove"))}</button>`
        :(r.allowed&&(left===null||left>0)?`<button class="btn btn-g btn-sm" onclick="v5MsSet('add','${s.key}')"><i class="ti ti-plus"></i> ${esc(t("v5_ms_add_free"))}</button>`:"")}</div>`:""}</div>`;}).join("")}</div>
    <div class="err-box" id="v5-ms-err"></div><div class="card2" style="margin-top:12px;font-size:12px;color:var(--muted)"><i class="ti ti-info-circle"></i> ${esc(t("v5_ms_how"))}</div>`;
};
async function v5MsSet(act,key){
  const r=_v5.ms;let main=r.own[0],extra=r.own.slice(1);
  if(act==="add")extra=[...extra,key];else if(act==="remove"){if(!confirm(t("v5_ms_remove_q")))return;extra=extra.filter(x=>x!==key);}else{extra=[main,...extra].filter(x=>x!==key);main=key;}
  try{const u=await api("PUT","/profile/sector",{sector:main,extra:extra.filter(x=>x!=="pme"||main!=="pme")});State.tenant={...State.tenant,...u};localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));
    applySectorUI();applyMemberUI();showToast(t("v5_saved"));navigate("mysectors");}catch(e){v5Err("v5-ms-err",e);}
}
// Lien « Mes secteurs » dans la fenêtre de choix du secteur
if(typeof renderSectorModal==="function"){
  const _v5Rsm=renderSectorModal;
  renderSectorModal=function(){_v5Rsm();const f=document.querySelector("#modal-sector-intro .modal-footer");if(f&&_secChoice.mode!=="intro"&&!document.getElementById("v5-ms-link"))f.insertAdjacentHTML("afterbegin",`<button id="v5-ms-link" class="btn btn-o btn-sm" onclick="zdCloseModal('modal-sector-intro');navigate('mysectors')"><i class="ti ti-gift"></i> ${esc(t("v5_my_sectors"))}</button>`);};
}

// ── Admin : secteurs ouverts pendant la gratuité ──
let _fs=null;
async function fsLoad(){const host=document.getElementById("fa-admin");if(!host||!State.tenant?.is_creator)return;
  let box=document.getElementById("fs-admin");if(!box){box=document.createElement("div");box.id="fs-admin";box.style.marginTop="12px";host.after(box);}
  try{_fs=await api("GET","/admin/free-sectors");_fs.draft={scope:_fs.scope,who:_fs.who,first_n:_fs.first_n,chosen:[..._fs.chosen_items],max_sectors:_fs.max_sectors,message:_fs.message};fsRender();}catch(_){box.innerHTML="";}}
function fsRender(){
  const box=document.getElementById("fs-admin");if(!box||!_fs)return;const f=_fs,d=f.draft;
  const opt=(name,val,cur,label,sub)=>`<label class="fs-opt${cur===val?" on":""}"><input type="radio" name="${name}" value="${val}" ${cur===val?"checked":""} onchange="_fs.draft.${name.replace("fs-","")}=${typeof val==="number"?val:`'${val}'`};fsRender()"><span><b>${label}</b>${sub?`<small>${sub}</small>`:""}</span></label>`;
  box.innerHTML=`<div class="card fa-card${f.scope==="all"&&f.free_active?" on":""}">
    <div style="font-weight:800;font-size:15px"><i class="ti ti-building-community" style="color:var(--green)"></i> Secteurs ouverts pendant la gratuité</div>
    <div class="fa-st">${f.free_active?`Gratuité active jusqu'au ${esc(v5Date(f.free_until))}.`:"La gratuité générale est désactivée : ce réglage s'appliquera quand elle sera active."} ${f.scope==="all"?`<span class="adm-pill p-gift">Tous les secteurs</span>`:`<span class="adm-pill p-cli">Secteur du compte seulement</span>`}</div>
    <div class="fl" style="margin-top:10px">Quels secteurs sont gratuits</div><div class="fs-opts">${opt("fs-scope","own",d.scope,"Seulement le secteur du compte","Comme aujourd'hui")}${opt("fs-scope","all",d.scope,"Tous les secteurs","Changer de secteur principal et en ajouter d'autres, sans payer")}</div>
    ${d.scope==="all"?`<div class="fl" style="margin-top:10px">Pour qui</div><div class="fs-opts">${opt("fs-who","everyone",d.who,"Tout le monde",`${f.accounts} comptes gérants`)}${opt("fs-who","first",d.who,"Un nombre précis de personnes","Les premiers qui ajoutent un secteur")}${opt("fs-who","chosen",d.who,"Des comptes choisis","Recherche par nom ou e-mail")}</div>
      ${d.who==="first"?`<div class="grid2" style="margin-top:8px"><div class="fgrp"><label class="fl" for="fs-n">Nombre de places</label><input class="inp" id="fs-n" type="number" min="1" value="${d.first_n}" oninput="_fs.draft.first_n=parseInt(this.value)||1"></div><div style="align-self:center;font-size:13px">Places prises : <b>${f.used}</b> / ${f.first_n}${f.used?` <label class="cm-chk" style="display:inline-flex;margin-left:8px"><input type="checkbox" id="fs-reset"> Remettre le compteur à zéro</label>`:""}</div></div>`:""}
      ${d.who==="chosen"?`<div class="pm-chips" style="margin-top:8px">${d.chosen.map((c,i)=>`<span class="pm-chip">${esc(c.label)}<button type="button" aria-label="Retirer ${esc(c.label)}" onclick="_fs.draft.chosen.splice(${i},1);fsRender()">×</button></span>`).join("")||`<small style="color:var(--muted)">Aucun compte choisi</small>`}</div>
        <div class="pm-search"><input class="inp" id="fs-q" placeholder="Nom, entreprise ou e-mail" autocomplete="off" oninput="fsSearch(this.value)" aria-label="Rechercher un compte"><div id="fs-res" class="pm-res" role="listbox"></div></div>`:""}
      <div class="fl" style="margin-top:10px">Combien de secteurs par compte</div><div class="fs-opts">${[[0,"Sans limite"],[2,"2 au plus"],[3,"3 au plus"],[5,"5 au plus"]].map(([v,l])=>opt("fs-max_sectors",v,d.max_sectors,l)).join("")}</div>
      <div class="fgrp" style="margin-top:10px"><label class="fl" for="fs-msg">Message aux utilisateurs</label><textarea class="inp" id="fs-msg" rows="3" maxlength="2000" oninput="_fs.draft.message=this.value">${esc(d.message||"")}</textarea></div>
      <label class="cm-chk"><input type="checkbox" id="fs-notify" checked> Prévenir par notification</label><label class="cm-chk"><input type="checkbox" id="fs-email" checked> et par e-mail</label>`:""}
    <div class="fa-btns"><button type="button" class="btn btn-g btn-sm" onclick="fsSave()"><i class="ti ti-check"></i> Enregistrer</button></div>
    <small class="cm-hint">Les données des secteurs ajoutés ne sont jamais supprimées. Après la gratuité, chaque compte choisit dans Abonnements les secteurs qu'il garde et ne paie que ceux-là.</small></div>`;
}
let _fsT=null;
function fsSearch(v){clearTimeout(_fsT);const res=document.getElementById("fs-res");if((v||"").trim().length<2){if(res)res.innerHTML="";return;}
  _fsT=setTimeout(async()=>{try{const r=await api("GET","/admin/promo-search?q="+encodeURIComponent(v.trim()));const box=document.getElementById("fs-res");if(!box)return;const have=new Set(_fs.draft.chosen.map(x=>x.id));
    box.innerHTML=r.items.length?r.items.map(x=>`<button type="button" class="pm-res-i" role="option" ${have.has(x.id)?"disabled":""} onclick='fsAdd(${JSON.stringify({id:x.id,label:x.label}).replace(/'/g,"&#39;")})'><b>${esc(x.label)}</b><small>${esc(x.sub)}</small></button>`).join(""):`<div style="padding:8px;font-size:12px;color:var(--muted)">Aucun compte</div>`;}catch(_){}},220);}
function fsAdd(x){_fs.draft.chosen.push(x);fsRender();setTimeout(()=>document.getElementById("fs-q")?.focus(),30);}
async function fsSave(){
  const d=_fs.draft;const notify=d.scope==="all"&&document.getElementById("fs-notify")?.checked;const email=!!document.getElementById("fs-email")?.checked;
  if(d.scope==="all"&&d.who==="chosen"&&!d.chosen.length){showToast("Ajoute au moins un compte","error");return;}
  const who=d.who==="everyone"?"tout le monde":d.who==="first"?`les ${d.first_n} premiers`:`${d.chosen.length} compte(s) choisi(s)`;
  if(!confirm(d.scope==="all"?`Ouvrir tous les secteurs pendant la gratuité pour ${who}${d.max_sectors?` (${d.max_sectors} secteurs au plus)`:""}${notify?", avec notification":""} ?`:"Revenir au secteur du compte seulement ?"))return;
  try{const r=await api("PUT","/admin/free-sectors",{scope:d.scope,who:d.who,first_n:d.first_n,chosen:d.chosen.map(x=>x.id),max_sectors:d.max_sectors,message:d.message||null,notify,email,reset_count:!!document.getElementById("fs-reset")?.checked});
    _fs={...r,draft:{scope:r.scope,who:r.who,first_n:r.first_n,chosen:[...r.chosen_items],max_sectors:r.max_sectors,message:r.message}};fsRender();showToast(r.notified?`Enregistré ✓ · ${r.notified} compte(s) prévenu(s)`:"Enregistré ✓");}
  catch(e){showToast(e.message,"error");}
}
if(typeof faRender==="function"){const _v5FaR=faRender;faRender=function(){_v5FaR();if(!document.getElementById("fs-admin")||!_fs)fsLoad();};}

// ── PME : bons de livraison signés sur le téléphone du client ──
SECTOR_PAGE_LOADERS.v5dn=async el=>{
  const list=await api("GET","/delivery-notes");_v5.dn=list;
  el.innerHTML=v5Head(t("v5_t_dn"),t("v5_dn_x"),"","pmetools")+
    (list.length?`<div class="v5-list">${list.map(d=>`<div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:180px"><b class="mono">${esc(d.number)}</b> · ${esc(d.client_name||"—")}<div style="font-size:12px;color:var(--muted)">${esc(fmtDate(d.created_at))} · ${esc(t("v5_items_n").replace("{n}",d.items.length))}</div>
      ${d.signed_at?`<div style="font-size:12px;color:var(--green)"><i class="ti ti-signature"></i> ${esc(t("v5_signed_by").replace("{n}",d.signer||"").replace("{d}",fmtDate(d.signed_at)))}</div>`:""}</span>
      <button class="btn btn-o btn-sm" onclick="openDeliveryDoc('${d.id}')"><i class="ti ti-file-type-pdf"></i></button>${d.signed_at?`<button class="btn btn-o btn-sm" onclick="v5DnShow('${d.id}')"><i class="ti ti-signature"></i></button>`:`<button class="btn btn-g btn-sm" onclick="v5DnSign('${d.id}')"><i class="ti ti-signature"></i> ${esc(t("v5_sign_now"))}</button>`}</div>`).join("")}</div>`:v5Empty("v5_dn_none","truck-delivery"));
};
function v5DnSign(id){const d=(_v5.dn||[]).find(x=>x.id===id)||{};
  zdModal("modal-v5-sign",`<div class="modal-title"><i class="ti ti-signature" style="color:var(--green)"></i> ${esc(d.number||"")} · ${esc(d.client_name||"")}</div>
    <div style="font-size:13px;margin-bottom:8px">${(d.items||[]).map(i=>`${zdQty(i.qty)} × ${esc(i.name||i.description||"")}`).join("<br>")}</div>
    <div class="fgrp"><label class="fl" for="v5-sg-n">${esc(t("v5_signer"))} *</label><input class="inp" id="v5-sg-n" maxlength="160"></div>
    <div class="fl">${esc(t("v5_sign_here"))}</div><canvas id="v5-sg" class="v5-sign" aria-label="${esc(t("v5_sign_here"))}"></canvas>
    <button class="btn btn-o btn-sm" onclick="v5SignClear('v5-sg')">${esc(t("v5_clear"))}</button>
    ${d.status!=="delivered"?`<label class="terms-check"><input type="checkbox" id="v5-sg-d" checked><span>${esc(t("v5_mark_delivered"))}</span></label>`:""}
    <div class="err-box" id="v5-sg-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-sign')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5DnSignGo('${id}')"><i class="ti ti-check"></i> ${esc(t("v5_validate"))}</button></div>`,480);
  setTimeout(()=>v5SignPad("v5-sg"),30);}
async function v5DnSignGo(id){const cv=document.getElementById("v5-sg");const n=zdVal("v5-sg-n");if(n.length<2){v5Err("v5-sg-err",t("v5_signer"));return;}if(!cv.dataset.signed){v5Err("v5-sg-err",t("v5_sign_here"));return;}
  if(await v5Do(()=>api("POST",`/delivery-notes/${id}/sign`,{signer:n,signature:cv.toDataURL("image/png"),deliver:document.getElementById("v5-sg-d")?.checked!==false}),t("v5_signed"),"v5-sg-err")){zdCloseModal("modal-v5-sign");navigate("v5dn");}}
function v5DnShow(id){const d=(_v5.dn||[]).find(x=>x.id===id);if(!d)return;
  zdModal("modal-v5-sgs",`<div class="modal-title"><i class="ti ti-signature" style="color:var(--green)"></i> ${esc(d.number)}</div><div style="font-size:13px">${esc(t("v5_signed_by").replace("{n}",d.signer||"").replace("{d}",fmtDate(d.signed_at)))}</div>
    ${d.signature?`<img src="${esc(d.signature)}" alt="${esc(t("v5_signature"))}" style="width:100%;background:#fff;border-radius:8px;margin-top:8px">`:""}<div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-sgs')">${esc(t("btn_close"))}</button></div>`,440);}
if(typeof loadDeliveryNotes==="function"){
  const _v5Ldn=loadDeliveryNotes;
  loadDeliveryNotes=async function(){await _v5Ldn();try{const list=await api("GET","/delivery-notes");_v5.dn=list;document.querySelectorAll("#deliveries-tbody tr").forEach((tr,i)=>{const d=list[i];const cell=tr.lastElementChild;if(!d||!cell||cell.querySelector(".v5-sgb"))return;
    cell.insertAdjacentHTML("beforeend",d.signed_at?`<button class="btn btn-sm btn-o v5-sgb" title="${esc(t("v5_signed_by").replace("{n}",d.signer||"").replace("{d}",fmtDate(d.signed_at)))}" onclick="v5DnShow('${d.id}')"><i class="ti ti-signature" style="color:var(--green)"></i></button>`:`<button class="btn btn-sm btn-o v5-sgb" title="${esc(t("v5_sign_now"))}" onclick="v5DnSign('${d.id}')"><i class="ti ti-signature"></i></button>`);});}catch(_){}};
}

// ── Rendez-vous en ligne : choix de l'employé ──
if(typeof renderBookingSettings==="function"){
  const _v5Rbs=renderBookingSettings;
  renderBookingSettings=async function(){_v5Rbs();const box=document.getElementById("bk-panel-settings");if(!box)return;
    let st={staff:[]};try{st=await api("GET","/booking/staff");}catch(_){}_v5.bks=st.staff||[];
    const c=document.createElement("div");c.className="card2";c.id="v5-bks";c.style.marginTop="12px";box.appendChild(c);v5BksDraw();};
}
function v5BksDraw(){const c=document.getElementById("v5-bks");if(!c)return;
  c.innerHTML=`<b><i class="ti ti-users"></i> ${esc(t("v5_bk_staff"))}</b><div style="font-size:12px;color:var(--muted);margin:4px 0 8px">${esc(t("v5_bk_staff_x"))}</div>
    <div class="pm-chips">${_v5.bks.map((n,i)=>`<span class="pm-chip">${esc(n)}<button type="button" aria-label="${esc(t("btn_delete"))} ${esc(n)}" onclick="_v5.bks.splice(${i},1);v5BksDraw()">×</button></span>`).join("")}</div>
    <div style="display:flex;gap:6px;margin-top:6px"><input class="inp" id="v5-bks-n" maxlength="120" placeholder="${esc(t("v5_name"))}" aria-label="${esc(t("v5_name"))}" onkeydown="if(event.key==='Enter')v5BksAdd()"><button class="btn btn-o btn-sm" onclick="v5BksAdd()"><i class="ti ti-plus"></i></button><button class="btn btn-g btn-sm" onclick="v5BksSave()">${esc(t("btn_save"))}</button></div>`;}
function v5BksAdd(){const n=zdVal("v5-bks-n");if(!n)return;if(!_v5.bks.some(x=>x.toLowerCase()===n.toLowerCase()))_v5.bks.push(n);v5BksDraw();document.getElementById("v5-bks-n")?.focus();}
async function v5BksSave(){const r=await v5Do(()=>api("PUT","/booking/staff",{staff:_v5.bks}),t("v5_saved"));if(r){_v5.bks=r.staff;v5BksDraw();}}
if(typeof renderPublicBooking==="function"){
  const _v5Rpb=renderPublicBooking;
  renderPublicBooking=function(){_v5Rpb();const st=_pb.page?.staff||[];if(!st.length||!_pb.service)return;const v=document.getElementById("booking-view");const cards=v.querySelectorAll(".card");if(cards.length<2)return;
    cards[0].insertAdjacentHTML("afterend",`<div class="card" style="margin-bottom:12px"><div style="font-weight:700;margin-bottom:8px">${esc(t("v5_pb_staff"))}</div><div class="pb-slots"><button class="pb-slot${!_pb.staff?" active":""}" onclick="_pb.staff=null;_pb.time=null;renderPublicBooking()">${esc(t("v5_pb_anyone"))}</button>${st.map(n=>`<button class="pb-slot${_pb.staff===n?" active":""}" onclick="_pb.staff='${escJs(n)}';_pb.time=null;renderPublicBooking()">${esc(n)}</button>`).join("")}</div></div>`);};
  const _v5Fetch=window.fetch;
  window.fetch=function(url,opt){
    try{if(typeof url==="string"&&_pb?.staff&&url.includes("/book/")){
      if(url.includes("/slots?"))url+=`&staff=${encodeURIComponent(_pb.staff)}`;
      else if(/\/book\/[^/]+\/appointments$/.test(url)&&opt?.method==="POST"&&opt.body){const b=JSON.parse(opt.body);b.staff=_pb.staff;opt={...opt,body:JSON.stringify(b)};}}}catch(_){}
    return _v5Fetch.call(this,url,opt);
  };
}

// ── Photos (avant / après au salon, état du véhicule au garage) ──
async function v5PhotosHtml(kind,eid,tags,boxId){
  let list=[];try{list=await api("GET",`/photos?kind=${kind}&entity_id=${eid}`);}catch(_){return "";}
  const imgs=await Promise.all(list.map(p=>v5Img(`/photos/${p.id}`)));
  return `<div class="card2" style="margin-top:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap"><b><i class="ti ti-camera"></i> ${esc(t("v5_photos"))} (${list.length})</b>
    <span style="display:flex;gap:6px;align-items:center"><select class="inp" id="${boxId}-tag" style="width:auto" aria-label="${esc(t("v5_photo_tag"))}">${tags.map(x=>`<option value="${x}">${esc(t("v5_ph_"+x))}</option>`).join("")}</select>
      <label class="btn btn-o btn-sm" style="margin:0"><i class="ti ti-photo-plus"></i> ${esc(t("v5_add_photo"))}<input type="file" accept="image/*" capture="environment" hidden onchange="v5PhotoUp(this,'${kind}','${eid}','${boxId}')"></label></span></div>
    <div class="v5-photos">${list.map((p,i)=>`<figure><img src="${imgs[i]}" alt="${esc(t("v5_ph_"+(p.tag||tags[0])))}" onclick="window.open(this.src,'_blank')"><figcaption>${esc(p.tag?t("v5_ph_"+p.tag):"")}<button type="button" aria-label="${esc(t("btn_delete"))}" onclick="v5PhotoDel('${p.id}','${kind}','${eid}','${boxId}')">×</button></figcaption></figure>`).join("")}</div></div>`;
}
const V5_PH_TAGS={beauty_client:["before","after"],garage_job:["in","out","damage","part"]};
async function v5PhotoDraw(kind,eid,boxId){const b=document.getElementById(boxId);if(b)b.innerHTML=await v5PhotosHtml(kind,eid,V5_PH_TAGS[kind],boxId);}
async function v5PhotoUp(inp,kind,eid,boxId){const f=inp.files?.[0];if(!f)return;try{const data=await v5Resize(f,1400);await api("POST","/photos",{kind,entity_id:eid,tag:zdVal(boxId+"-tag")||null,data_url:data});showToast(t("v5_photo_added"));v5PhotoDraw(kind,eid,boxId);}catch(e){showToast(e.message,"error");}}
async function v5PhotoDel(id,kind,eid,boxId){if(!confirm(t("v5_delete_q")))return;try{await api("DELETE",`/photos/${id}`);v5PhotoDraw(kind,eid,boxId);}catch(e){showToast(e.message,"error");}}
if(typeof gaJobOpen==="function"){
  const _v5Gjo=gaJobOpen;
  gaJobOpen=async function(id){await _v5Gjo(id);const f=document.querySelector("#modal-ga-job .modal-footer");if(f&&!document.getElementById("v5-gph")){f.insertAdjacentHTML("beforebegin",`<div id="v5-gph"></div>`);v5PhotoDraw("garage_job",id,"v5-gph");}};
}
if(typeof btClientFile==="function"){
  const _v5Bcf=btClientFile;
  btClientFile=async function(cid){await _v5Bcf(cid);const f=document.querySelector("#modal-bt-file .modal-footer");if(f&&!document.getElementById("v5-bph")){f.insertAdjacentHTML("beforebegin",`<div id="v5-bph"></div>`);v5PhotoDraw("beauty_client",cid,"v5-bph");}};
}

// Commandes room service passées depuis ce téléphone (le QR de la chambre sert à plusieurs clients successifs)
function v5RoomMine(tok){try{const m=JSON.parse(localStorage.getItem("zd_room_mine")||"{}");return Array.isArray(m[tok])?m[tok].slice(-10):[];}catch(_){return [];}}
function v5RoomMineAdd(tok,o){if(!o)return;try{const m=JSON.parse(localStorage.getItem("zd_room_mine")||"{}");const a=Array.isArray(m[tok])?m[tok]:[];a.push(o);m[tok]=a.slice(-10);localStorage.setItem("zd_room_mine",JSON.stringify(m));}catch(_){}}
