// ── 10.5.0 · Restaurant : températures, lots, serveurs, prix selon l'heure, menu du jour, pertes, analyse de la carte ──
MODULE_PAGES.resto.push(["v5hh","clock-hour-5","v5_t_hh","sales"]);SECTOR_PAGE_MODULE.v5hh="resto";if(typeof PAGE_MODULES==="object")PAGE_MODULES.v5hh="sales";V5_HIDDEN.add("v5hh");
const V5_TEMP_KINDS=["fridge","freezer","vaccine","display","other"];

async function v5TempsPage(el,page,back){
  const eq=await api("GET","/temps/equipment");const mgr=v5Mgr();
  const late=eq.filter(e=>e.active&&!e.read_today).length;
  el.innerHTML=v5Head(t(page==="pharmatemps"?"v5_t_vaccine":"v5_t_temps"),t("v5_temps_x"),`<button class="btn btn-o btn-sm" onclick="v5TempRegister('${page}')"><i class="ti ti-printer"></i> ${esc(t("v5_register"))}</button>`+(mgr?`<button class="btn btn-g btn-sm" onclick="v5EquipModal('','${page}')"><i class="ti ti-plus"></i> ${esc(t("v5_equip_add"))}</button>`:""),back)+
    (late?`<div class="card2" style="color:var(--amber);font-size:13px;margin-bottom:10px"><i class="ti ti-alert-triangle"></i> ${esc(t("v5_temps_late").replace("{n}",late))}</div>`:"")+
    (eq.length?`<div class="v5-cards">${eq.map(e=>{const l=e.last;const col=!l?"var(--muted)":l.ok?"var(--green)":"var(--red)";
      return `<div class="card v5-temp${e.active?"":" off"}"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div style="min-width:0"><b>${esc(e.name)}</b><div style="font-size:12px;color:var(--muted)">${esc(t("v5_tk_"+e.kind))} · ${esc(t("v5_limits"))} ${e.t_min} / ${e.t_max} °C</div></div>
        ${mgr?`<button class="btn btn-o btn-sm" aria-label="${esc(t("btn_edit"))}" onclick="v5EquipModal('${e.id}','${page}')"><i class="ti ti-pencil"></i></button>`:""}</div>
        <div class="v5-temp-v" style="color:${col}">${l?`${l.value} °C`:"—"}</div>
        <div style="font-size:12px;color:var(--muted)">${l?`${esc(v5Date(l.day))} ${esc(l.hm||"")}`:esc(t("v5_never_read"))} ${e.read_today?`<span class="badge bg">${esc(t("v5_read_ok"))}</span>`:e.active?`<span class="badge ba">${esc(t("v5_read_todo"))}</span>`:""}</div>
        ${e.active?`<button class="btn btn-g btn-sm" style="margin-top:8px;width:100%" onclick="v5ReadModal('${e.id}','${page}')"><i class="ti ti-temperature"></i> ${esc(t("v5_read_now"))}</button>`:""}</div>`;}).join("")}</div>`:v5Empty("v5_equip_none","temperature"));
  _v5.temps=eq;
}
SECTOR_PAGE_LOADERS.restotemps=el=>v5TempsPage(el,"restotemps","restotools");
SECTOR_PAGE_LOADERS.pharmatemps=el=>v5TempsPage(el,"pharmatemps","pharmatools");
function v5EquipModal(id,page){
  const e=(_v5.temps||[]).find(x=>x.id===id)||{name:"",kind:page==="pharmatemps"?"vaccine":"fridge",t_min:page==="pharmatemps"?2:0,t_max:page==="pharmatemps"?8:4,active:true};
  zdModal("modal-v5-eq",`<div class="modal-title"><i class="ti ti-temperature" style="color:var(--green)"></i> ${esc(t(id?"v5_equip_edit":"v5_equip_add"))}</div>
    <div class="fgrp"><label class="fl" for="v5-eq-n">${esc(t("v5_name"))} *</label><input class="inp" id="v5-eq-n" value="${esc(e.name)}" maxlength="120"></div>
    <div class="fgrp"><label class="fl" for="v5-eq-k">${esc(t("v5_type"))}</label><select class="inp" id="v5-eq-k">${V5_TEMP_KINDS.map(k=>`<option value="${k}"${e.kind===k?" selected":""}>${esc(t("v5_tk_"+k))}</option>`).join("")}</select></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-eq-a">${esc(t("v5_tmin"))}</label><input class="inp" id="v5-eq-a" type="number" step="0.1" value="${e.t_min}"></div>
      <div class="fgrp"><label class="fl" for="v5-eq-b">${esc(t("v5_tmax"))}</label><input class="inp" id="v5-eq-b" type="number" step="0.1" value="${e.t_max}"></div></div>
    ${id?`<label class="terms-check"><input type="checkbox" id="v5-eq-on" ${e.active?"checked":""}><span>${esc(t("v5_in_use"))}</span></label>`:""}
    <div class="err-box" id="v5-eq-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-eq')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5EquipSave('${id}','${page}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,440);
}
async function v5EquipSave(id,page){
  const b={name:zdVal("v5-eq-n"),kind:zdVal("v5-eq-k"),t_min:zdNum("v5-eq-a")??0,t_max:zdNum("v5-eq-b")??0,active:id?document.getElementById("v5-eq-on").checked:true};
  if(!b.name){v5Err("v5-eq-err",t("v5_name"));return;}
  if(await v5Do(()=>api(id?"PATCH":"POST",id?`/temps/equipment/${id}`:"/temps/equipment",b),t("v5_saved"),"v5-eq-err")){zdCloseModal("modal-v5-eq");navigate(page);}
}
function v5ReadModal(id,page){
  const e=(_v5.temps||[]).find(x=>x.id===id);if(!e)return;
  zdModal("modal-v5-rd",`<div class="modal-title"><i class="ti ti-temperature" style="color:var(--green)"></i> ${esc(e.name)}</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:8px">${esc(t("v5_limits"))} ${e.t_min} / ${e.t_max} °C</div>
    <div class="fgrp"><label class="fl" for="v5-rd-v">${esc(t("v5_temp_read"))} (°C) *</label><input class="inp" id="v5-rd-v" type="number" step="0.1" inputmode="decimal" oninput="v5ReadCheck(${e.t_min},${e.t_max})" style="font-size:22px"></div>
    <div class="fgrp" id="v5-rd-ab" hidden><label class="fl" for="v5-rd-a" style="color:var(--red)">${esc(t("v5_temp_action"))} *</label><textarea class="inp" id="v5-rd-a" rows="2" maxlength="300" placeholder="${esc(t("v5_temp_action_ph"))}"></textarea></div>
    <div class="err-box" id="v5-rd-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-rd')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5ReadSave('${id}','${page}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,420);
  setTimeout(()=>document.getElementById("v5-rd-v")?.focus(),50);
}
function v5ReadCheck(a,b){const v=zdNum("v5-rd-v");document.getElementById("v5-rd-ab").hidden=v==null||(v>=a&&v<=b);}
async function v5ReadSave(id,page){
  const v=zdNum("v5-rd-v");if(v==null){v5Err("v5-rd-err",t("v5_temp_read"));return;}
  const r=await v5Do(()=>api("POST","/temps/readings",{equipment_id:id,value:v,action:zdVal("v5-rd-a")||null}),null,"v5-rd-err");
  if(r){showToast(r.ok?t("v5_temp_ok"):t("v5_temp_bad"),r.ok?"success":"error");zdCloseModal("modal-v5-rd");navigate(page);}
}
async function v5TempRegister(page){
  const m=prompt(t("v5_month_q"),v5Month());if(!m)return;
  try{const r=await api("GET",`/temps/register?month=${encodeURIComponent(m)}`);
    v5Print(t("v5_register")+" "+r.month,v5DocHead(r.company,t(page==="pharmatemps"?"v5_reg_vaccine":"v5_reg_haccp"),r.month)+
      `<div style="margin-bottom:8px">${esc(t("v5_reg_count").replace("{n}",r.count).replace("{a}",r.alerts))}</div>`+
      v5DocTable([t("v5_day"),t("v5_hour"),t("v5_equipment"),"°C",t("v5_limits"),t("v5_status"),t("v5_temp_action"),t("v5_by")],
        r.rows.map(x=>[esc(v5Date(x.day)),esc(x.hm||""),esc(x.equipment),String(x.value),esc(x.limits),x.ok?"OK":`<b style="color:#b91c1c">${esc(t("v5_out"))}</b>`,esc(x.action||""),esc(x.by||"")])));
  }catch(e){showToast(e.message,"error");}
}

// ── Lots et péremptions des ingrédients ──
SECTOR_PAGE_LOADERS.restolots=async el=>{
  const r=await api("GET","/resto/lots");const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_lots"),t("v5_lots_x"),`<button class="btn btn-g btn-sm" onclick="v5LotModal()"><i class="ti ti-plus"></i> ${esc(t("v5_lot_in"))}</button>`,"restotools")+
    `<div class="v5-kpis">${v5Kpi(t("v5_lots_expired"),r.expired,r.expired?"var(--red)":"")}${v5Kpi(t("v5_lots_soon"),r.soon,r.soon?"var(--amber)":"")}${v5Kpi(t("v5_lots_loss"),zdMoney(r.expired_value),r.expired_value?"var(--red)":"")}</div>`+
    (r.lots.length?`<div class="card" style="margin-top:12px">${v5Table([t("v5_product"),t("v5_lot"),t("v5_expiry"),t("v5_qty"),t("v5_value"),""],
      r.lots.map(l=>`<tr><td><b>${esc(l.product)}</b>${l.supplier?`<div style="font-size:11px;color:var(--muted)">${esc(l.supplier)}</div>`:""}</td><td class="mono">${esc(l.lot_number)}</td>
        <td>${esc(v5Date(l.expiry))} ${l.expired?v5Badge(t("v5_expired"),"br"):l.days_left!=null&&l.days_left<=3?v5Badge(t("v5_days_left").replace("{n}",l.days_left),"ba"):""}</td>
        <td>${zdQty(l.qty)} ${esc(l.unit)}</td><td>${zdMoney(l.value)}</td><td>${mgr?`<button class="btn btn-r btn-sm" onclick="v5LotDiscard('${l.id}','${escJs(l.product)}')"><i class="ti ti-trash"></i> ${esc(t("v5_discard"))}</button>`:""}</td></tr>`))}</div>`:v5Empty("v5_lots_none","calendar-due"));
};
async function v5LotModal(){
  const ing=(await api("GET","/resto/ingredients")).ingredients||[];
  if(!ing.length){showToast(t("v5_no_ingredients"),"error");return;}
  zdModal("modal-v5-lot",`<div class="modal-title"><i class="ti ti-calendar-due" style="color:var(--green)"></i> ${esc(t("v5_lot_in"))}</div>
    <div class="fgrp"><label class="fl" for="v5-lt-p">${esc(t("v5_ingredient"))} *</label><select class="inp" id="v5-lt-p">${ing.map(i=>`<option value="${i.id}">${esc(i.name)} (${esc(i.unit||"")})</option>`).join("")}</select></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-lt-q">${esc(t("v5_qty"))} *</label><input class="inp" id="v5-lt-q" type="number" min="0.001" step="0.001"></div>
      <div class="fgrp"><label class="fl" for="v5-lt-e">${esc(t("v5_expiry"))} *</label><input class="inp" id="v5-lt-e" type="date" min="${zdToday()}"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-lt-n">${esc(t("v5_lot"))}</label><input class="inp" id="v5-lt-n" maxlength="60" placeholder="${esc(t("v5_auto"))}"></div>
      <div class="fgrp"><label class="fl" for="v5-lt-c">${esc(t("v5_unit_cost"))}</label><input class="inp" id="v5-lt-c" type="number" min="0" step="0.01"></div></div>
    <div class="fgrp"><label class="fl" for="v5-lt-s">${esc(t("v5_supplier"))}</label><input class="inp" id="v5-lt-s" maxlength="200"></div>
    <label class="terms-check"><input type="checkbox" id="v5-lt-x"><span>${esc(t("v5_record_expense"))}</span></label>
    <div class="err-box" id="v5-lt-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-lot')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5LotSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,460);
}
async function v5LotSave(){
  const q=zdNum("v5-lt-q"),e=zdVal("v5-lt-e");if(!q||!e){v5Err("v5-lt-err",t("v5_qty_expiry"));return;}
  const b={qty:q,expiry:e,lot_number:zdVal("v5-lt-n")||null,unit_cost:zdNum("v5-lt-c"),supplier:zdVal("v5-lt-s")||null,record_expense:document.getElementById("v5-lt-x").checked};
  if(await v5Do(()=>api("POST",`/resto/ingredients/${zdVal("v5-lt-p")}/lots`,b),t("v5_saved"),"v5-lt-err")){zdCloseModal("modal-v5-lot");navigate("restolots");}
}
async function v5LotDiscard(id,name){if(!confirm(t("v5_discard_q").replace("{p}",name)))return;if(await v5Do(()=>api("POST",`/resto/lots/${id}/discard`),t("v5_discarded")))navigate("restolots");}

// ── Commissions et pourboires des serveurs ──
SECTOR_PAGE_LOADERS.restowaiters=async el=>{
  _v5.wm=_v5.wm||v5Month();const r=await api("GET",`/resto/waiters?month=${_v5.wm}`);const mgr=v5Mgr();_v5.waiters=r;
  el.innerHTML=v5Head(t("v5_t_waiters"),t("v5_waiters_x"),`<input class="inp" type="month" value="${_v5.wm}" style="width:auto" aria-label="${esc(t("v5_month"))}" onchange="_v5.wm=this.value;navigate('restowaiters')">`+
      (mgr?`<button class="btn btn-o btn-sm" onclick="v5RateModal('')"><i class="ti ti-discount"></i> ${esc(t("v5_default_rate"))} ${v5Num(r.default_pct)} %</button>`:""),"restotools")+
    `<div class="v5-kpis">${v5Kpi(t("v5_sales"),zdMoney(r.total_sales),"var(--green)")}${v5Kpi(t("v5_tips"),zdMoney(r.total_tips))}${v5Kpi(t("v5_commissions"),zdMoney(r.total_commission))}${v5Kpi(t("v5_to_pay"),zdMoney(r.total_due),r.total_due>0?"var(--amber)":"")}</div>`+
    (r.rows.length?`<div class="card" style="margin-top:12px">${v5Table([t("v5_waiter"),t("v5_orders"),t("v5_sales"),"%",t("v5_commission"),t("v5_tips"),t("v5_paid"),t("v5_to_pay"),""],
      r.rows.map(x=>`<tr><td><b>${esc(x.waiter)}</b></td><td>${x.orders}</td><td>${zdMoney(x.sales)}</td><td>${mgr&&x.waiter!=="—"?`<button class="btn btn-o btn-sm" onclick="v5RateModal('${escJs(x.waiter)}',${x.pct})">${v5Num(x.pct)} %</button>`:v5Num(x.pct)+" %"}</td>
        <td>${zdMoney(x.commission)}</td><td>${zdMoney(x.tips)}</td><td>${zdMoney(x.paid_commission+x.paid_tips)}</td><td><b style="color:${x.due>0?"var(--amber)":"var(--green)"}">${zdMoney(x.due)}</b></td>
        <td>${mgr&&x.due>0&&x.waiter!=="—"?`<button class="btn btn-g btn-sm" onclick="v5PayWaiter('${escJs(x.waiter)}',${x.due})"><i class="ti ti-cash"></i> ${esc(t("v5_pay"))}</button>`:""}</td></tr>`))}</div>`:v5Empty("v5_waiters_none","user-dollar"))+
    `<div class="card2" style="margin-top:12px;font-size:12px;color:var(--muted)"><i class="ti ti-info-circle"></i> ${esc(t("v5_waiters_how"))}</div>`;
};
function v5RateModal(w,pct){
  zdModal("modal-v5-rate",`<div class="modal-title"><i class="ti ti-discount" style="color:var(--green)"></i> ${esc(w?t("v5_rate_of").replace("{w}",w):t("v5_default_rate"))}</div>
    <div class="fgrp"><label class="fl" for="v5-rt">${esc(t("v5_rate_pct"))}</label><input class="inp" id="v5-rt" type="number" min="0" max="100" step="0.5" value="${pct??_v5.waiters?.default_pct??0}"></div>
    <div class="err-box" id="v5-rt-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-rate')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5RateSave('${escJs(w)}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,380);
}
async function v5RateSave(w){const p=zdNum("v5-rt");if(p==null||p<0||p>100){v5Err("v5-rt-err",t("v5_rate_pct"));return;}
  if(await v5Do(()=>api("PUT","/resto/waiters/rate",{waiter:w||null,pct:p}),t("v5_saved"),"v5-rt-err")){zdCloseModal("modal-v5-rate");navigate("restowaiters");}}
function v5PayWaiter(w,due){
  zdModal("modal-v5-pw",`<div class="modal-title"><i class="ti ti-cash" style="color:var(--green)"></i> ${esc(t("v5_pay"))} · ${esc(w)}</div>
    <div class="v5-big">${zdMoney(due)}</div><div style="font-size:12px;color:var(--muted);margin-bottom:10px">${esc(t("v5_pay_waiter_x").replace("{m}",_v5.wm))}</div>
    <div class="fgrp"><label class="fl" for="v5-pw-m">${esc(t("fld_payment_method"))}</label><select class="inp" id="v5-pw-m">${zdMethodOptions("cash")}</select></div>
    <div class="err-box" id="v5-pw-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-pw')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5PayWaiterGo('${escJs(w)}')"><i class="ti ti-check"></i> ${esc(t("v5_pay"))}</button></div>`,380);
}
async function v5PayWaiterGo(w){const r=await v5Do(()=>api("POST","/resto/waiters/pay",{waiter:w,month:_v5.wm,method:zdVal("v5-pw-m")}),null,"v5-pw-err");if(r){showToast(t("v5_paid_x").replace("{v}",zdMoney(r.paid)));zdCloseModal("modal-v5-pw");navigate("restowaiters");}}

// ── Prix selon l'heure (Restaurant sans Bar, Commerce) ──
function v5HHRows(rules,withCat){
  return rules.map((h,i)=>`<div class="card2 v5-hh"><div class="grid2"><div class="fgrp"><label class="fl" for="v5-hh-n${i}">${esc(t("v5_name"))}</label><input class="inp" id="v5-hh-n${i}" value="${esc(h.name||"")}" maxlength="60" oninput="_v5.hh[${i}].name=this.value"></div>
      <div class="fgrp"><label class="fl" for="v5-hh-d${i}">${esc(t("v5_discount_pct"))}</label><input class="inp" id="v5-hh-d${i}" type="number" min="0" max="90" step="1" value="${h.discount_pct||0}" oninput="_v5.hh[${i}].discount_pct=+this.value||0"></div></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-hh-s${i}">${esc(t("v5_from"))}</label><input class="inp" id="v5-hh-s${i}" type="time" value="${h.start||"17:00"}" onchange="_v5.hh[${i}].start=this.value"></div>
      <div class="fgrp"><label class="fl" for="v5-hh-e${i}">${esc(t("v5_to"))}</label><input class="inp" id="v5-hh-e${i}" type="time" value="${h.end||"19:00"}" onchange="_v5.hh[${i}].end=this.value"></div></div>
    ${withCat?`<div class="fgrp"><label class="fl" for="v5-hh-c${i}">${esc(t("v5_category_opt"))}</label><input class="inp" id="v5-hh-c${i}" value="${esc(h.category||"")}" maxlength="80" oninput="_v5.hh[${i}].category=this.value"></div>`:""}
    <div class="v5-days" role="group" aria-label="${esc(t("v5_days_lbl"))}">${[0,1,2,3,4,5,6].map(d=>`<label><input type="checkbox" ${(h.days||[]).includes(d)?"checked":""} onchange="v5HHDay(${i},${d},this.checked)"><span>${esc(t("v5_wd_"+d).slice(0,3))}</span></label>`).join("")}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><label class="terms-check" style="margin:0"><input type="checkbox" ${h.enabled!==false?"checked":""} onchange="_v5.hh[${i}].enabled=this.checked"><span>${esc(t("v5_active"))}</span></label>
      <button class="btn btn-r btn-sm" onclick="_v5.hh.splice(${i},1);v5HHDraw()"><i class="ti ti-trash"></i> ${esc(t("btn_delete"))}</button></div></div>`).join("")||zdEmpty(t("v5_hh_none"),"clock-hour-5");
}
function v5HHDay(i,d,on){const s=new Set(_v5.hh[i].days||[]);on?s.add(d):s.delete(d);_v5.hh[i].days=[...s].sort();}
function v5HHDraw(){const b=document.getElementById("v5-hh-box");if(b)b.innerHTML=v5HHRows(_v5.hh,_v5.hhCat);}
function v5HHAdd(){_v5.hh.push({name:t("v5_hh_default"),days:[0,1,2,3,4],start:"17:00",end:"19:00",discount_pct:10,enabled:true});v5HHDraw();}
SECTOR_PAGE_LOADERS.v5hh=async el=>{
  const r=await api("GET","/resto/happy-hours");_v5.hhCat=false;
  if(r.managed_by==="bar"){el.innerHTML=v5Head(t("v5_t_hh"),"","","restotools")+`<div class="card" style="text-align:center;padding:24px"><i class="ti ti-glass-full" style="font-size:28px;color:var(--muted)"></i><div style="margin:8px 0">${esc(t("v5_hh_bar"))}</div><button class="btn btn-g btn-sm" onclick="navigate('barsettings')">${esc(t("v5_open_bar_settings"))}</button></div>`;return;}
  _v5.hh=JSON.parse(JSON.stringify(r.happy_hours||[]));const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_hh"),t("v5_hh_x"),mgr?`<button class="btn btn-o btn-sm" onclick="v5HHAdd()"><i class="ti ti-plus"></i> ${esc(t("v5_hh_add"))}</button><button class="btn btn-g btn-sm" onclick="v5HHSave('/resto/happy-hours','v5hh')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button>`:"","restotools")+
    (r.now?.active?`<div class="card2" style="color:var(--green);margin-bottom:10px"><i class="ti ti-clock-play"></i> ${esc(t("v5_hh_now").replace("{p}",r.now.discount_pct).replace("{h}",r.now.until))}</div>`:"")+
    `<div id="v5-hh-box"></div><div class="err-box" id="v5-hh-err"></div>`;
  v5HHDraw();
};
async function v5HHSave(path,page){
  const key=path.includes("retail")?"promos":"happy_hours";
  const rules=_v5.hh.map(h=>({name:(h.name||"").trim()||t("v5_hh_default"),days:h.days||[],start:h.start,end:h.end,discount_pct:+h.discount_pct||0,enabled:h.enabled!==false,...(_v5.hhCat?{category:(h.category||"").trim()||null}:{})}));
  if(await v5Do(()=>api("PUT",path,{[key]:rules}),t("v5_saved"),"v5-hh-err"))navigate(page);
}

// ── Menu du jour ──
SECTOR_PAGE_LOADERS.restodaily=async el=>{
  const [r,menu]=await Promise.all([api("GET","/resto/daily-menu"),api("GET","/resto/menu")]);const m=r.menu;
  const items=(menu.categories||[]).flatMap(c=>c.items.map(i=>({...i,cat:c.name})));const sel=new Set((m?.items||[]).map(x=>x.id));
  el.innerHTML=v5Head(t("v5_t_daily"),t("v5_daily_x").replace("{d}",v5Date(r.today)),"","restotools")+
    `<div class="card">${m?`<div class="card2" style="margin-bottom:10px;color:var(--green)"><i class="ti ti-circle-check"></i> ${esc(t("v5_daily_on"))}</div>`:""}
      <div class="grid2"><div class="fgrp"><label class="fl" for="v5-dm-t">${esc(t("v5_daily_title"))} *</label><input class="inp" id="v5-dm-t" maxlength="120" value="${esc(m?.title||t("v5_daily_title_ph"))}"></div>
        <div class="fgrp"><label class="fl" for="v5-dm-p">${esc(t("v5_daily_price"))}</label><input class="inp" id="v5-dm-p" type="number" min="0" step="0.01" value="${m?.price??""}"></div></div>
      <div class="fl" style="margin-top:4px">${esc(t("v5_daily_items"))}</div>
      <div class="v5-picks">${items.length?items.map(i=>`<label class="v5-pick"><input type="checkbox" value="${i.id}" ${sel.has(i.id)?"checked":""}><span><b>${esc(i.name)}</b><small>${esc(i.cat)} · ${zdMoney(i.price)}</small></span></label>`).join(""):`<div style="font-size:12px;color:var(--muted)">${esc(t("v5_menu_empty"))}</div>`}</div>
      <div class="fgrp" style="margin-top:10px"><label class="fl" for="v5-dm-n">${esc(t("v5_note"))}</label><input class="inp" id="v5-dm-n" maxlength="300" value="${esc(m?.note||"")}"></div>
      <div class="err-box" id="v5-dm-err"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">${m?`<button class="btn btn-r btn-sm" onclick="v5DailyDel()"><i class="ti ti-x"></i> ${esc(t("v5_daily_remove"))}</button>`:""}<button class="btn btn-g btn-sm" onclick="v5DailySave()"><i class="ti ti-send"></i> ${esc(t("v5_daily_publish"))}</button></div></div>
    <div class="card2" style="margin-top:12px;font-size:12px;color:var(--muted)"><i class="ti ti-info-circle"></i> ${esc(t("v5_daily_how"))}</div>`;
};
async function v5DailySave(){
  const ids=[...document.querySelectorAll(".v5-picks input:checked")].map(x=>x.value);const title=zdVal("v5-dm-t");
  if(!title){v5Err("v5-dm-err",t("v5_daily_title"));return;}if(ids.length>12){v5Err("v5-dm-err",t("v5_daily_max"));return;}
  if(await v5Do(()=>api("PUT","/resto/daily-menu",{title,price:zdNum("v5-dm-p"),item_ids:ids,note:zdVal("v5-dm-n")||null}),t("v5_daily_published"),"v5-dm-err"))navigate("restodaily");
}
async function v5DailyDel(){if(await v5Do(()=>api("DELETE","/resto/daily-menu"),t("v5_saved")))navigate("restodaily");}

// ── Pertes et gaspillage ──
SECTOR_PAGE_LOADERS.restowaste=async el=>{
  _v5.wsm=_v5.wsm||v5Month();const r=await api("GET",`/resto/waste-report?month=${_v5.wsm}`);
  const max=Math.max(1,...r.by_reason.map(x=>x.cost));
  el.innerHTML=v5Head(t("v5_t_waste"),t("v5_waste_x"),`<input class="inp" type="month" value="${_v5.wsm}" style="width:auto" aria-label="${esc(t("v5_month"))}" onchange="_v5.wsm=this.value;navigate('restowaste')">`,"restotools")+
    `<div class="v5-kpis">${v5Kpi(t("v5_waste_stock"),zdMoney(r.total),r.total?"var(--red)":"")}${v5Kpi(t("v5_waste_void"),zdMoney(r.voided_cost))}${v5Kpi(t("v5_waste_pct"),v5Pct(r.pct_of_sales),r.pct_of_sales>5?"var(--red)":"")}${v5Kpi(t("v5_waste_voids"),r.voided_lines)}</div>
    <div class="grid2" style="margin-top:12px;align-items:start"><div class="card"><b>${esc(t("v5_by_reason"))}</b>${r.by_reason.length?r.by_reason.map(x=>`<div class="v5-hbar"><span>${esc(x.reason)} <small>× ${x.count}</small></span><div><i style="width:${Math.round(x.cost/max*100)}%"></i></div><b>${zdMoney(x.cost)}</b></div>`).join(""):zdEmpty(t("v5_nothing"))}</div>
      <div class="card"><b>${esc(t("v5_by_product"))}</b>${r.by_product.length?r.by_product.map(x=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(x.product)} <small style="color:var(--muted)">${zdQty(x.qty)} ${esc(x.unit||"")}</small></span><b>${zdMoney(x.cost)}</b></div>`).join(""):zdEmpty(t("v5_nothing"))}</div></div>
    ${r.lines.length?`<div class="card" style="margin-top:12px"><b>${esc(t("v5_details"))}</b>${v5Table([t("v5_date"),t("v5_product"),t("v5_qty"),t("v5_reason"),t("v5_cost")],r.lines.map(x=>`<tr><td>${esc(fmtDate(x.at))}</td><td>${esc(x.product)}</td><td>${zdQty(x.qty)} ${esc(x.unit||"")}</td><td>${esc(x.reason)}</td><td>${zdMoney(x.cost)}</td></tr>`))}</div>`:""}`;
};

// ── Analyse de la carte (plats stars, à revoir…) ──
const V5_MA={star:["var(--green)","star"],plowhorse:["var(--blue)","run"],puzzle:["var(--purple)","puzzle"],dog:["var(--red)","circle-x"]};
SECTOR_PAGE_LOADERS.restoanalysis=async el=>{
  _v5.mad=_v5.mad||30;const r=await api("GET",`/resto/menu-analysis?days=${_v5.mad}`);
  el.innerHTML=v5Head(t("v5_t_analysis"),t("v5_ma_x"),[30,60,90].map(n=>`<button class="toggle-btn${_v5.mad===n?" active":""}" onclick="_v5.mad=${n};navigate('restoanalysis')">${esc(t("v5_days").replace("{n}",n))}</button>`).join(""),"restotools")+
    `<div class="v5-kpis">${Object.entries(V5_MA).map(([k,[c,i]])=>`<div class="card v5-kpi" style="border-top:3px solid ${c}"><div><i class="ti ti-${i}"></i> ${esc(t("v5_ma_"+k))}</div><b style="color:${c}">${r.counts[k]||0}</b><small>${esc(t("v5_ma_"+k+"_x"))}</small></div>`).join("")}</div>`+
    (r.rows.length?`<div class="card" style="margin-top:12px">${v5Table([t("v5_dish"),t("v5_price"),t("v5_cost"),t("v5_food_cost"),t("v5_sold"),t("v5_margin"),""],
      r.rows.map(x=>{const [c,i]=V5_MA[x.class]||["var(--muted)","circle"];return `<tr><td><b>${esc(x.name)}</b>${x.category?`<div style="font-size:11px;color:var(--muted)">${esc(x.category)}</div>`:""}</td><td>${zdMoney(x.price)}</td><td>${zdMoney(x.cost)}</td>
        <td style="color:${x.food_cost_pct>40?"var(--red)":""}">${v5Pct(x.food_cost_pct)}</td><td>${v5Num(x.qty)}</td><td><b>${zdMoney(x.margin)}</b></td><td><span class="badge" style="color:${c};border:1px solid ${c}"><i class="ti ti-${i}"></i> ${esc(t("v5_ma_"+x.class))}</span></td></tr>`;}))}</div>`:v5Empty("v5_menu_empty","chart-dots"))+
    `<div class="card2" style="margin-top:12px;font-size:12px;color:var(--muted)"><i class="ti ti-info-circle"></i> ${esc(t("v5_ma_how"))}</div>`;
};

// ── Encaissement : client, bon de fidélité, crédit ──
if(typeof rsRenderPay==="function"){
  const _v5RsRender=rsRenderPay;
  rsRenderPay=function(){
    _v5RsRender();
    const o=_rs.order,p=_rs.pay;const ov=document.getElementById("modal-rs-pay");if(!ov||!o)return;
    const foot=ov.querySelector(".modal-footer");if(!foot)return;
    const box=document.createElement("div");box.id="v5-rs-perks";box.style.margin="8px 0";foot.before(box);
    v5RsPerksDraw(o.client_id||p.client_id);
  };
}
async function v5RsPerksDraw(cid){
  const box=document.getElementById("v5-rs-perks");if(!box)return;
  if(!cid){box.innerHTML=`<div class="card2" style="font-size:12px"><div style="margin-bottom:6px;color:var(--muted)"><i class="ti ti-gift"></i> ${esc(t("v5_rs_client_x"))}</div><div id="v5-rs-cs"></div></div>`;
    v5ClientSearch("v5-rs-cs","v5RsSetClient");return;}
  const pk=await v5Perks(cid);if(pk)box.innerHTML=v5PerksHtml(pk,{onVoucher:"v5RsVoucher"});
}
async function v5RsSetClient(id){try{_rs.order=await api("PUT",`/resto/orders/${_rs.order.id}/client`,{client_id:id});_rs.pay.client_id=id;rsRenderPay();}catch(e){showToast(e.message,"error");}}
async function v5RsVoucher(code){
  const o=_rs.order;try{_rs.order=await api("POST",`/resto/orders/${o.id}/voucher`,{code,client_id:o.client_id||_rs.pay.client_id||null});showToast(t("v5_voucher_used"));rsRenderPay();}catch(e){showToast(e.message,"error");}
}
