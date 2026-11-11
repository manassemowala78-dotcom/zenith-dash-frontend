// ── 10.5.0 · Pages communes : alertes, tableau de bord, objectifs, crédit, registres, plannings, réservations, dossiers ──
const V5_ALERT_PAGE={temps:()=>hasModule("resto")?"restotemps":"pharmatemps",retailreorder:()=>hasModule("retail")?"retailreorder":"stock",retaillots:()=>"retaillots",restolots:()=>"restolots",
  reg_pme_contract:()=>"rgpmecontract",reg_pme_purchase:()=>"rgpmepurchase",reg_pme_fleet:()=>"rgpmefleet",reg_resto_catering:()=>"rgcatering",reg_beauty_rent:()=>"rgrent",
  reg_cold_contract:()=>"rgcoldcontract",reg_cold_maintenance:()=>"rgmaintenance",reg_garage_loan:()=>"rgloan",reg_hotel_laundry:()=>"rglaundry",reg_hotel_lost:()=>"rglost",reg_pharma_return:()=>"rgpharmareturn",reg_cold_generator:()=>"rggenerator"};
function v5AlertGo(p){const f=V5_ALERT_PAGE[p];navigate(f?f():p);}
const V5_LVL={danger:["var(--red)","alert-circle"],warning:["var(--amber)","alert-triangle"],info:["var(--blue)","info-circle"]};

SECTOR_PAGE_LOADERS.zdalerts=async el=>{
  const r=await api("GET","/alerts/today");
  el.innerHTML=v5Head(t("nav_v5_alerts"),t("v5_alerts_sub").replace("{d}",v5Date(r.day)),`<button class="btn btn-o btn-sm" onclick="v5WrModal()"><i class="ti ti-mail"></i> ${esc(t("v5_wr"))}</button>`)+
    (r.alerts.length?`<div class="v5-list">${r.alerts.map(a=>{const [c,i]=V5_LVL[a.level];const title=a.title.startsWith("reg_")?t("v5_alert_"+a.title):t("v5_al_"+a.key.split(":")[0]);
      return `<button class="card v5-alert" style="--c:${c}" onclick="v5AlertGo('${a.page}')"><i class="ti ti-${i}"></i><span><b>${esc(title)}</b><small>${esc(a.detail)}</small></span><span class="badge" style="color:${c};border:1px solid ${c}">${a.count}</span></button>`;}).join("")}</div>`
      :`<div class="card" style="text-align:center;padding:30px"><i class="ti ti-circle-check" style="font-size:34px;color:var(--green)"></i><div style="margin-top:8px;font-weight:700">${esc(t("v5_alerts_none"))}</div></div>`);
  _v5AlertAt=0;v5AlertBadge();
};

SECTOR_PAGE_LOADERS.zdsecdash=async el=>{
  _v5.dd=_v5.dd||30;const d=await api("GET",`/sector/dashboard?days=${_v5.dd}`);
  const max=Math.max(1,...d.series.map(x=>x.amount));
  const fmt=k=>k.format==="usd"?zdMoney(k.value):k.format==="pct"?v5Pct(k.value):v5Num(k.value);
  el.innerHTML=v5Head(t("nav_v5_secdash"),t("v5_dd_sub").replace("{a}",v5Date(d.from)).replace("{b}",v5Date(d.to)),[7,30,90].map(n=>`<button class="toggle-btn${_v5.dd===n?" active":""}" onclick="_v5.dd=${n};navigate('zdsecdash')">${esc(t("v5_days").replace("{n}",n))}</button>`).join(""))+
    `<div class="v5-kpis">${d.kpis.map(k=>v5Kpi(t("v5_k_"+k.key),fmt(k),k.key==="revenue"?"var(--green)":"")).join("")}${d.growth_pct!=null?v5Kpi(t("v5_k_growth"),(d.growth_pct>=0?"+":"")+v5Pct(d.growth_pct),d.growth_pct>=0?"var(--green)":"var(--red)"):""}</div>
    <div class="card" style="margin-top:12px"><b>${esc(t("v5_dd_daily"))}</b><div class="v5-bars" role="img" aria-label="${esc(t("v5_dd_daily"))}">${d.series.map(x=>`<div title="${esc(v5Date(x.day))} · ${zdMoney(x.amount)}" style="height:${Math.max(2,Math.round(x.amount/max*100))}%"></div>`).join("")}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)"><span>${esc(v5Date(d.from))}</span><span>${esc(v5Date(d.to))}</span></div></div>
    <div class="card" style="margin-top:12px"><b>${esc(t("v5_dd_top"))}</b>${d.top.length?d.top.map((x,i)=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${i+1}. ${esc(x.name)} <small style="color:var(--muted)">× ${v5Num(x.qty)}</small></span><b>${zdMoney(x.amount)}</b></div>`).join(""):zdEmpty(t("v5_nothing"))}</div>`;
};

SECTOR_PAGE_LOADERS.zdgoals=async el=>{
  _v5.gm=_v5.gm||v5Month();const r=await api("GET",`/team-goals?month=${_v5.gm}`);const mgr=v5Mgr();
  el.innerHTML=v5Head(t("nav_v5_goals"),t("v5_goals_sub").replace("{p}",v5Num(r.elapsed_pct,0)),`<input class="inp" type="month" value="${_v5.gm}" style="width:auto" onchange="_v5.gm=this.value;navigate('zdgoals')" aria-label="${esc(t("v5_month"))}">`+(mgr?`<button class="btn btn-g btn-sm" onclick="v5GoalModal()"><i class="ti ti-target"></i> ${esc(t("v5_set_goal"))}</button>`:""))+
    `<div class="v5-kpis">${v5Kpi(t("v5_total_sales"),zdMoney(r.total),"var(--green)")}${v5Kpi(t("v5_total_target"),zdMoney(r.total_target))}</div>`+
    (r.rows.length?`<div class="card" style="margin-top:12px">${r.rows.map(x=>`<div class="v5-rank"><span class="v5-pos${x.rank<=3?" top":""}">${x.rank}</span><div style="flex:1;min-width:0"><b>${esc(x.person)}</b>
      <div style="font-size:12px;color:var(--muted)">${esc(t("v5_sales_n").replace("{n}",x.sales))}${x.target?` · ${esc(t("v5_target"))} ${zdMoney(x.target)} · ${esc(t("v5_forecast"))} ${zdMoney(x.forecast)}`:""}</div>
      ${x.target?`<div class="v5-meter"><i style="width:${Math.min(100,x.pct||0)}%;background:${x.on_track?"var(--green)":"var(--amber)"}"></i></div>`:""}</div>
      <div style="text-align:right"><b>${zdMoney(x.amount)}</b>${x.target?`<div style="font-size:12px;color:${x.on_track?"var(--green)":"var(--amber)"}">${v5Pct(x.pct)}</div>`:""}${mgr?`<button class="btn btn-o btn-sm" aria-label="${esc(t("v5_set_goal"))}" onclick="v5GoalModal('${escJs(x.person)}',${x.target||0})"><i class="ti ti-target"></i></button>`:""}</div></div>`).join("")}</div>`:v5Empty("v5_goals_none","trophy"))+
    `<div class="card2" style="margin-top:12px;font-size:12px;color:var(--muted)"><i class="ti ti-info-circle"></i> ${esc(t("v5_goals_how"))}</div>`;
};
function v5GoalModal(person,amount){
  zdModal("modal-v5-goal",`<div class="modal-title"><i class="ti ti-target" style="color:var(--green)"></i> ${esc(t("v5_set_goal"))} · ${esc(_v5.gm)}</div>
    <div class="fgrp"><label class="fl" for="v5-g-p">${esc(t("v5_person"))}</label><input class="inp" id="v5-g-p" value="${esc(person||"")}"></div>
    <div class="fgrp"><label class="fl" for="v5-g-a">${esc(t("v5_target_amount"))}</label><input class="inp" id="v5-g-a" type="number" min="0" step="1" value="${amount||""}"></div>
    <div class="err-box" id="v5-g-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-goal')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5GoalSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,420);
}
async function v5GoalSave(){const p=zdVal("v5-g-p");if(!p){v5Err("v5-g-err",t("v5_person"));return;}
  if(await v5Do(()=>api("PUT","/team-goals",{person:p,month:_v5.gm,amount:zdNum("v5-g-a")||0}),t("v5_saved"),"v5-g-err")){zdCloseModal("modal-v5-goal");navigate("zdgoals");}}

async function v5WrModal(){
  const w=await api("GET","/weekly-report");const days=[0,1,2,3,4,5,6];
  zdModal("modal-v5-wr",`<div class="modal-title"><i class="ti ti-mail" style="color:var(--green)"></i> ${esc(t("v5_wr"))}</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:10px">${esc(t("v5_wr_x"))}</div>
    <label class="terms-check"><input type="checkbox" id="v5-wr-on" ${w.on?"checked":""}><span>${esc(t("v5_wr_on"))}</span></label>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-wr-e">${esc(t("lbl_email"))}</label><input class="inp" id="v5-wr-e" type="email" value="${esc(w.email||"")}"></div>
      <div class="fgrp"><label class="fl" for="v5-wr-d">${esc(t("v5_wr_day"))}</label><select class="inp" id="v5-wr-d">${days.map(d=>`<option value="${d}"${w.weekday===d?" selected":""}>${esc(t("v5_wd_"+d))}</option>`).join("")}</select></div></div>
    ${w.email_enabled?"":`<div class="card2" style="font-size:12px;color:var(--amber)">${esc(t("v5_wr_noemail"))}</div>`}
    <div class="err-box" id="v5-wr-err"></div>
    <div class="modal-footer" style="flex-wrap:wrap"><button class="btn btn-o btn-sm" onclick="v5WrPreview()"><i class="ti ti-eye"></i> ${esc(t("v5_preview"))}</button>${w.email_enabled?`<button class="btn btn-o btn-sm" onclick="v5WrSend()"><i class="ti ti-send"></i> ${esc(t("v5_send_now"))}</button>`:""}
      <button class="btn btn-g btn-sm" onclick="v5WrSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,480);
}
async function v5WrSave(){if(await v5Do(()=>api("PUT","/weekly-report",{on:document.getElementById("v5-wr-on").checked,email:zdVal("v5-wr-e")||null,weekday:+zdVal("v5-wr-d")}),t("v5_saved"),"v5-wr-err"))zdCloseModal("modal-v5-wr");}
async function v5WrSend(){const r=await v5Do(()=>api("POST","/weekly-report/send"),null,"v5-wr-err");if(r)showToast(t("v5_wr_sent").replace("{e}",r.to));}
async function v5WrPreview(){const r=await v5Do(()=>api("GET","/weekly-report/preview"),null,"v5-wr-err");if(r){const w=window.open("","_blank");if(w){w.document.write(r.html);w.document.close();}}}

SECTOR_PAGE_LOADERS.creditbook=async el=>{
  const r=await api("GET","/credit-book");const mgr=v5Mgr();_v5.cb=r;
  el.innerHTML=v5Head(t("nav_v5_credit"),t("v5_cb_sub"),mgr?`<button class="btn btn-g btn-sm" onclick="v5LimitModal()"><i class="ti ti-plus"></i> ${esc(t("v5_cb_add"))}</button>`:"")+
    `<div class="v5-kpis">${v5Kpi(t("v5_cb_due"),zdMoney(r.total_due),"var(--amber)")}${v5Kpi(t("v5_cb_overdue"),zdMoney(r.total_overdue),"var(--red)")}</div>`+
    (r.clients.length?`<div class="card" style="margin-top:12px">${r.clients.map(c=>`<div class="ht-bk" style="cursor:default;flex-wrap:wrap"><span style="flex:1;min-width:160px"><b>${esc(c.name)}</b>${c.over?` ${v5Badge(t("v5_over"),"br")}`:""}
      <div style="font-size:12px;color:var(--muted)">${c.credit_limit?esc(t("v5_limit"))+" "+zdMoney(c.credit_limit)+" · "+esc(t("v5_available"))+" "+zdMoney(c.available):esc(t("v5_no_limit"))}${c.oldest?` · ${esc(t("v5_since"))} ${v5Date(c.oldest)}`:""}</div></span>
      <b style="color:${c.overdue>0?"var(--red)":"var(--text)"}">${zdMoney(c.due)}</b>
      ${c.phone&&c.due>0?`<a class="btn btn-o btn-sm" target="_blank" rel="noopener" aria-label="WhatsApp" href="${v5Wa(c.phone,t("v5_cb_wa").replace("{n}",c.name).replace("{a}",zdMoney(c.due)).replace("{c}",State.tenant?.company_name||""))}"><i class="ti ti-brand-whatsapp"></i></a>`:""}
      ${c.due>0?`<button class="btn btn-o btn-sm" onclick="v5CbPay('${c.id}')">${esc(t("v5_cash_in"))}</button>`:""}${mgr?`<button class="btn btn-o btn-sm" aria-label="${esc(t("v5_limit"))}" onclick="v5LimitModal('${c.id}')"><i class="ti ti-adjustments"></i></button>`:""}</div>`).join("")}</div>`:v5Empty("v5_cb_none","notebook"))+
    `<div class="card2" style="margin-top:12px;font-size:12px;color:var(--muted)"><i class="ti ti-info-circle"></i> ${esc(t("v5_cb_how"))} <a href="#" onclick="event.preventDefault();navigate('reminders')">${esc(t("v5_cb_reminders"))}</a></div>`;
};
async function v5LimitModal(cid){
  const cls=await v5Clients();const c=(_v5.cb?.clients||[]).find(x=>x.id===cid);
  zdModal("modal-v5-lim",`<div class="modal-title"><i class="ti ti-notebook" style="color:var(--green)"></i> ${esc(t("v5_limit"))}</div>
    <div class="fgrp"><label class="fl" for="v5-l-c">${esc(t("v5_client"))}</label><select class="inp" id="v5-l-c" ${cid?"disabled":""}>${v5ClientOptions(cls,cid)}</select></div>
    <div class="fgrp"><label class="fl" for="v5-l-a">${esc(t("v5_limit_amount"))}</label><input class="inp" id="v5-l-a" type="number" min="0" step="1" value="${c?.credit_limit??""}"></div>
    <div style="font-size:12px;color:var(--muted)">${esc(t("v5_limit_x"))}</div><div class="err-box" id="v5-l-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-lim')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5LimitSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,420);
}
async function v5LimitSave(){const cid=zdVal("v5-l-c");if(!cid){v5Err("v5-l-err",t("v5_client"));return;}
  if(await v5Do(()=>api("PUT",`/credit-book/${cid}/limit`,{credit_limit:zdNum("v5-l-a")||0}),t("v5_saved"),"v5-l-err")){zdCloseModal("modal-v5-lim");v5Reload();}}
function v5CbPay(cid){const c=_v5.cb.clients.find(x=>x.id===cid);
  zdModal("modal-v5-cbp",`<div class="modal-title"><i class="ti ti-cash" style="color:var(--green)"></i> ${esc(c.name)} · ${zdMoney(c.due)}</div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-cp-a">${esc(t("ga_amount"))}</label><input class="inp" id="v5-cp-a" type="number" min="0.01" step="0.01" value="${c.due}"></div>
    <div class="fgrp"><label class="fl" for="v5-cp-m">${esc(t("fld_payment_method"))}</label><select class="inp" id="v5-cp-m">${zdMethodOptions("cash")}</select></div></div>
    <div class="err-box" id="v5-cp-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-cbp')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5CbPayGo('${cid}')"><i class="ti ti-check"></i> ${esc(t("v5_cash_in"))}</button></div>`,420);}
async function v5CbPayGo(cid){const r=await v5Do(()=>api("POST",`/credit-book/${cid}/pay`,{amount:zdNum("v5-cp-a"),method:zdVal("v5-cp-m")}),null,"v5-cp-err");if(r){zdCloseModal("modal-v5-cbp");showToast(t("v5_left_due").replace("{a}",zdMoney(r.remaining)));v5Reload();}}

// ── Registres génériques ──
const V5_REG={rgpmecontract:["pme_contract","pmetools","v5_t_contracts"],rgpmepurchase:["pme_purchase","pmetools","v5_t_purchases"],rgpmefleet:["pme_fleet","pmetools","v5_t_fleet"],
  rgcatering:["resto_catering","restotools","v5_t_catering"],rglaundry:["hotel_laundry","hoteltools","v5_t_laundry"],rglost:["hotel_lost","hoteltools","v5_t_lost"],rgrent:["beauty_rent","beautytools","v5_t_rent"],
  rgcoldcontract:["cold_contract","coldtools","v5_t_ccontracts"],rggenerator:["cold_generator","coldtools","v5_t_generator"],rgmaintenance:["cold_maintenance","coldtools","v5_t_maint"],
  rgloan:["garage_loan","garagetools","v5_t_loans"],rgpharmareturn:["pharma_return","pharmatools","v5_t_supret"]};
const V5_REG_MAIN={pme_contract:["client_id","end","amount"],pme_purchase:["qty","amount","needed_by"],pme_fleet:["ref","insurance_end","next_service"],resto_catering:["event_day","guests","amount"],
  hotel_laundry:["sent_day","pieces_sent","pieces_back"],hotel_lost:["found_day","room","owner"],beauty_rent:["space","rent","next_due"],cold_contract:["client_id","end","amount"],
  cold_generator:["type","day","liters"],cold_maintenance:["equipment","next_service","cost"],garage_loan:["plate","out_day","back_day"],pharma_return:["supplier","qty","amount"]};
const V5_REG_ST={active:"bg",ended:"",requested:"ba",approved:"bb",rejected:"br",ordered:"bp",received:"bg",in_use:"bg",repair:"ba",out:"ba",quote:"ba",confirmed:"bb",done:"bg",cancelled:"br",
  sent:"ba",partial:"ba",returned:"bg",kept:"bb",discarded:"",logged:"bb",planned:"bb",back:"bg",credited:"bg",refused:"br"};
function v5RegVal(k,typ,v,cl){
  if(v==null||v==="")return "—";
  if(typ&&typ.select)return t("v5_o_"+v);
  if(typ==="date")return v5Date(v);if(typ==="money")return zdMoney(v);if(typ==="client")return cl||"—";if(typ==="method")return t("pay_method_"+v);
  if(typ==="num"||typ==="int")return v5Num(v);return String(v);
}
Object.entries(V5_REG).forEach(([page,[kind,back,title]])=>{
  SECTOR_PAGE_LOADERS[page]=async el=>{
    _v5.rq=_v5.rq||{};const st=_v5.rq[kind]||"open";
    const r=await api("GET",`/registry/${kind}?status=${st}`);_v5.reg=r;_v5.regPage=page;
    const main=V5_REG_MAIN[kind]||[];const F=r.spec.fields;
    el.innerHTML=v5Head(t(title),t(title+"_x"),`<button class="btn btn-g btn-sm" onclick="v5RegModal()"><i class="ti ti-plus"></i> ${esc(t("v5_new"))}</button>`,back)+
      `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${["open","all"].concat(r.spec.statuses).filter((v,i,a)=>a.indexOf(v)===i).map(s=>`<button class="toggle-btn${st===s?" active":""}" onclick="_v5.rq['${kind}']='${s}';navigate('${page}')">${esc(s==="open"?t("v5_f_open"):s==="all"?t("v5_f_all"):t("v5_st_"+s))}</button>`).join("")}</div>`+
      (r.total?`<div class="v5-kpis" style="margin-bottom:12px">${v5Kpi(t("v5_total"),zdMoney(r.total))}${r.due?v5Kpi(t("v5_due_soon"),r.due,"var(--amber)"):""}</div>`:"")+
      (r.rows.length?`<div class="v5-list">${r.rows.map(x=>`<button class="card v5-row" onclick="v5RegModal('${x.id}')"><div style="flex:1;min-width:0"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b>${esc(x.title)}</b> ${v5Badge(t("v5_st_"+x.status),V5_REG_ST[x.status]||"bb")}${x.due?` ${v5Badge(t("v5_due_soon"),"br")}`:""}</div>
        <div style="font-size:12px;color:var(--muted)"><span class="mono">${esc(x.number)}</span> · ${main.map(f=>`${esc(t("v5_f_"+f))} : ${esc(v5RegVal(f,F[f],x.data[f],x.client))}`).join(" · ")}</div></div><i class="ti ti-chevron-right" style="color:var(--muted)"></i></button>`).join("")}</div>`:v5Empty("v5_nothing","list"));
  };
});
async function v5RegModal(id){
  const r=_v5.reg;const x=id?r.rows.find(z=>z.id===id):null;const F=r.spec.fields;const kind=r.kind;
  const needCl=Object.values(F).includes("client");const cls=needCl?await v5Clients():[];
  const field=(f,typ)=>{const v=x?x.data[f]:"";const idn="v5-r-"+f;const lab=`<label class="fl" for="${idn}">${esc(t("v5_f_"+f))}</label>`;
    if(typ.select)return `<div class="fgrp">${lab}<select class="inp" id="${idn}"><option value="">—</option>${typ.select.map(o=>`<option value="${o}"${v===o?" selected":""}>${esc(t("v5_o_"+o))}</option>`).join("")}</select></div>`;
    if(typ==="client")return `<div class="fgrp">${lab}<select class="inp" id="${idn}">${v5ClientOptions(cls,v)}</select></div>`;
    if(typ==="method")return `<div class="fgrp">${lab}<select class="inp" id="${idn}"><option value="">—</option>${zdMethodOptions(v||"")}</select></div>`;
    if(typ==="text")return `<div class="fgrp" style="grid-column:1/-1">${lab}<textarea class="inp" id="${idn}" rows="2">${esc(v||"")}</textarea></div>`;
    const tp=typ==="date"?"date":(["num","money","int"].includes(typ)?"number":"text");
    return `<div class="fgrp">${lab}<input class="inp" id="${idn}" type="${tp}" ${tp==="number"?`min="0" step="${typ==="int"?1:0.01}"`:""} value="${esc(v??"")}"></div>`;};
  const acts=(r.spec.actions||[]).filter(()=>!!x);
  zdModal("modal-v5-reg",`<div class="modal-title"><i class="ti ti-file-text" style="color:var(--green)"></i> ${esc(x?x.number+" · "+x.title:t("v5_new"))}</div>
    <div class="fgrp"><label class="fl" for="v5-r-title">${esc(t("v5_f_title_"+kind))}</label><input class="inp" id="v5-r-title" value="${esc(x?.title||"")}"></div>
    <div class="v5-grid">${Object.entries(F).map(([f,typ])=>field(f,typ)).join("")}</div>
    ${x?`<div class="fgrp"><label class="fl" for="v5-r-st">${esc(t("v5_status"))}</label><select class="inp" id="v5-r-st">${r.spec.statuses.map(s=>`<option value="${s}"${x.status===s?" selected":""}>${esc(t("v5_st_"+s))}</option>`).join("")}</select></div>`:""}
    ${x&&x.invoices.length?`<div style="font-size:12px;margin:6px 0">${esc(t("v5_invoices"))} : ${x.invoices.map(i=>`<a href="#" onclick="event.preventDefault();openInvoiceDoc('${i.id}')">${esc(i.number)}</a> (${zdMoney(i.amount)})`).join(", ")}</div>`:""}
    ${x&&x.history.length?`<details style="margin:6px 0"><summary style="cursor:pointer;font-size:12px">${esc(t("ga_history"))}</summary>${x.history.slice().reverse().map(h=>`<div style="font-size:12px;padding:3px 0">${esc(v5Date(h.at))} · ${esc(t("v5_st_"+h.status)===("v5_st_"+h.status)?h.status:t("v5_st_"+h.status))}${h.by?" · "+esc(h.by):""}${h.note?" — "+esc(h.note):""}</div>`).join("")}</details>`:""}
    <div class="err-box" id="v5-r-err"></div>
    <div class="modal-footer" style="flex-wrap:wrap">${x&&v5Mgr()&&!x.invoices.length?`<button class="btn btn-o btn-sm" style="color:var(--red)" onclick="v5RegDel('${x.id}')"><i class="ti ti-trash"></i></button>`:""}
      ${acts.map(a=>`<button class="btn btn-o btn-sm" onclick="v5RegAct('${x.id}','${a}')">${esc(t("v5_act_"+a))}</button>`).join("")}
      <button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-reg')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5RegSave('${x?x.id:""}')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,600);
}
function v5RegData(){const F=_v5.reg.spec.fields;const d={};Object.entries(F).forEach(([f,typ])=>{const v=zdVal("v5-r-"+f);d[f]=v===""?null:(["num","money","int"].includes(typ)?Number(v):v);});return d;}
async function v5RegSave(id){
  const body={title:zdVal("v5-r-title")||null,data:v5RegData()};if(id)body.status=zdVal("v5-r-st");
  if(!body.title){v5Err("v5-r-err",t("v5_f_title_"+_v5.reg.kind));return;}
  if(await v5Do(()=>api(id?"PATCH":"POST",id?`/registry/item/${id}`:`/registry/${_v5.reg.kind}`,body),t("v5_saved"),"v5-r-err")){zdCloseModal("modal-v5-reg");navigate(_v5.regPage);}
}
async function v5RegDel(id){if(!confirm(t("confirm_delete")))return;if(await v5Do(()=>api("DELETE",`/registry/item/${id}`),t("v5_deleted"),"v5-r-err")){zdCloseModal("modal-v5-reg");navigate(_v5.regPage);}}
async function v5RegAct(id,a){
  let method=null;
  if(a==="invoice"||a==="collect"){const paid=confirm(t("v5_paid_now_q"));if(paid)method="cash";}
  await v5Do(()=>api("PATCH",`/registry/item/${id}`,{data:v5RegData(),title:zdVal("v5-r-title")||null}),null,"v5-r-err");
  const r=await v5Do(()=>api("POST",`/registry/item/${id}/action`,{action:a,method}),null,"v5-r-err");
  if(r){zdCloseModal("modal-v5-reg");showToast(r.number?t("v5_invoiced").replace("{n}",r.number):t("v5_saved"));navigate(_v5.regPage);}
}

// ── Plannings ──
const V5_SHIFTS={pmeshifts:["pme","pmetools","v5_t_shifts"],restoshifts:["resto","restotools","v5_t_shifts"],barshifts:["bar","bartools","v5_t_shifts_dj"],beautyshifts:["beauty","beautytools","v5_t_shifts"],pharmashifts:["pharmacy","pharmatools","v5_t_gardes"]};
function v5Monday(d){const x=new Date((d||zdToday())+"T12:00:00");x.setDate(x.getDate()-((x.getDay()+6)%7));return isoDate(x);}
function v5AddDays(iso,n){const x=new Date(iso+"T12:00:00");x.setDate(x.getDate()+n);return isoDate(x);}
Object.entries(V5_SHIFTS).forEach(([page,[mod,back,title]])=>{
  SECTOR_PAGE_LOADERS[page]=async el=>{
    _v5.sw=_v5.sw||{};const start=_v5.sw[mod]||v5Monday();const r=await api("GET",`/shifts?module=${mod}&start=${start}&days=7`);_v5.sh={mod,page,data:r};const mgr=v5Mgr();
    const days=[...Array(7)].map((_,i)=>v5AddDays(start,i));
    el.innerHTML=v5Head(t(title),t("v5_week_of").replace("{d}",v5Date(start)),`<button class="btn btn-o btn-sm" aria-label="${esc(t("v5_prev"))}" onclick="_v5.sw['${mod}']='${v5AddDays(start,-7)}';navigate('${page}')"><i class="ti ti-chevron-left"></i></button><button class="btn btn-o btn-sm" aria-label="${esc(t("v5_next"))}" onclick="_v5.sw['${mod}']='${v5AddDays(start,7)}';navigate('${page}')"><i class="ti ti-chevron-right"></i></button>`+
      (mgr?`<button class="btn btn-o btn-sm" onclick="v5ShiftCopy()"><i class="ti ti-copy"></i> ${esc(t("v5_copy_prev"))}</button><button class="btn btn-g btn-sm" onclick="v5ShiftModal()"><i class="ti ti-plus"></i> ${esc(t("v5_add_shift"))}</button>`:""),back)+
      `<div class="v5-week">${days.map(d=>{const l=r.shifts.filter(s=>s.day===d);return `<div class="card v5-day${d===zdToday()?" today":""}"><b>${esc(new Date(d+"T12:00:00").toLocaleDateString(State.lang==="ar"?"ar":State.lang,{weekday:"short",day:"numeric",month:"short"}))}</b>
        ${l.map(s=>`<div class="v5-shift"><span><b>${esc(s.person)}</b>${s.role?` · ${esc(s.role)}`:""}<small>${esc(s.start)} – ${esc(s.end)}${s.label?" · "+esc(s.label):""}</small></span>${mgr?`<button class="btn btn-o btn-sm" aria-label="${esc(t("btn_delete"))}" onclick="v5ShiftDel('${s.id}')"><i class="ti ti-x"></i></button>`:""}</div>`).join("")||`<div style="font-size:12px;color:var(--muted)">—</div>`}</div>`;}).join("")}</div>
      ${Object.keys(r.hours).length?`<div class="card" style="margin-top:12px"><b>${esc(t("v5_hours_week"))}</b>${Object.entries(r.hours).map(([p,h])=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(p)}</span><b>${v5Num(h)} h</b></div>`).join("")}</div>`:""}`;
  };
});
function v5ShiftModal(){const r=_v5.sh.data;
  zdModal("modal-v5-sh",`<div class="modal-title"><i class="ti ti-calendar-time" style="color:var(--green)"></i> ${esc(t("v5_add_shift"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-s-p">${esc(t("v5_person"))}</label><input class="inp" id="v5-s-p" list="v5-s-pl"><datalist id="v5-s-pl">${r.people.map(p=>`<option value="${esc(p)}">`).join("")}</datalist></div>
      <div class="fgrp"><label class="fl" for="v5-s-r">${esc(t("v5_role"))}</label><input class="inp" id="v5-s-r"></div>
      <div class="fgrp"><label class="fl" for="v5-s-d">${esc(t("v5_day"))}</label><input class="inp" id="v5-s-d" type="date" value="${zdToday()}"></div>
      <div class="fgrp"><label class="fl" for="v5-s-l">${esc(t("v5_shift_label"))}</label><input class="inp" id="v5-s-l" placeholder="${esc(t("v5_shift_label_ph"))}"></div>
      <div class="fgrp"><label class="fl" for="v5-s-a">${esc(t("v5_start"))}</label><input class="inp" id="v5-s-a" type="time" value="08:00"></div>
      <div class="fgrp"><label class="fl" for="v5-s-b">${esc(t("v5_end"))}</label><input class="inp" id="v5-s-b" type="time" value="16:00"></div>
      <div class="fgrp"><label class="fl" for="v5-s-n">${esc(t("v5_repeat"))}</label><input class="inp" id="v5-s-n" type="number" min="0" max="31" value="0"></div></div>
    <div style="font-size:12px;color:var(--muted)">${esc(t("v5_night_hint"))}</div><div class="err-box" id="v5-s-err"></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-sh')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5ShiftSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,520);}
async function v5ShiftSave(){if(!zdVal("v5-s-p")){v5Err("v5-s-err",t("v5_person"));return;}
  const b={person:zdVal("v5-s-p"),role:zdVal("v5-s-r")||null,day:zdVal("v5-s-d"),start:zdVal("v5-s-a"),end:zdVal("v5-s-b"),label:zdVal("v5-s-l")||null,repeat_days:parseInt(zdVal("v5-s-n"))||0};
  if(await v5Do(()=>api("POST",`/shifts?module=${_v5.sh.mod}`,b),t("v5_saved"),"v5-s-err")){zdCloseModal("modal-v5-sh");navigate(_v5.sh.page);}}
async function v5ShiftDel(id){if(await v5Do(()=>api("DELETE",`/shifts/${id}`)))navigate(_v5.sh.page);}
async function v5ShiftCopy(){const to=_v5.sh.data.start;if(!confirm(t("v5_copy_q")))return;const r=await v5Do(()=>api("POST",`/shifts/copy-week?module=${_v5.sh.mod}`,{from_start:v5AddDays(to,-7),to_start:to}));if(r){showToast(t("v5_copied").replace("{n}",r.copied));navigate(_v5.sh.page);}}

// ── Réservations de ressources ──
const V5_RES={hotelactivities:["hotel","hoteltools","v5_t_spa","activity"],beautycabins:["beauty","beautytools","v5_t_cabins","cabin"],schoolrooms:["school","schooltools","v5_t_rooms","room"]};
Object.entries(V5_RES).forEach(([page,[mod,back,title,kind]])=>{
  SECTOR_PAGE_LOADERS[page]=async el=>{
    _v5.rd=_v5.rd||{};const day=_v5.rd[mod]||zdToday();const r=await api("GET",`/resources/bookings?module=${mod}&day=${day}`);_v5.res={mod,page,kind,data:r};const mgr=v5Mgr();
    el.innerHTML=v5Head(t(title),t(title+"_x"),`<input class="inp" type="date" value="${day}" style="width:auto" aria-label="${esc(t("v5_day"))}" onchange="_v5.rd['${mod}']=this.value;navigate('${page}')">`+
      (mgr?`<button class="btn btn-o btn-sm" onclick="v5ResModal()"><i class="ti ti-settings"></i> ${esc(t("v5_resources"))}</button>`:"")+(r.resources.length?`<button class="btn btn-g btn-sm" onclick="v5RbModal()"><i class="ti ti-plus"></i> ${esc(t("v5_book"))}</button>`:""),back)+
      (r.resources.length?`<div class="v5-res">${r.resources.filter(x=>x.active).map(x=>{const l=r.bookings.filter(b=>b.resource_id===x.id);return `<div class="card"><div style="display:flex;justify-content:space-between;gap:6px"><b>${esc(x.name)}</b><small style="color:var(--muted)">${esc(x.open_hm)}–${esc(x.close_hm)}${x.price?" · "+zdMoney(x.price):""}${x.capacity>1?" · "+esc(t("v5_cap").replace("{n}",x.capacity)):""}</small></div>
        ${l.map(b=>`<div class="v5-shift" style="opacity:${b.status==="cancelled"?.5:1}"><span><b>${esc(b.start)}–${esc(b.end)}</b> · ${esc(b.who)}${b.persons>1?` (${b.persons})`:""}<small>${esc(t("v5_st_"+b.status))}${b.amount?" · "+zdMoney(b.amount):""}${b.charged?" · "+esc(t("v5_charged")):""}${b.note?" · "+esc(b.note):""}</small></span>
          ${b.status==="booked"?`<span style="display:flex;gap:4px"><button class="btn btn-o btn-sm" aria-label="${esc(t("v5_st_done"))}" onclick="v5RbSt('${b.id}','done')"><i class="ti ti-check"></i></button><button class="btn btn-o btn-sm" aria-label="${esc(t("btn_cancel"))}" onclick="v5RbSt('${b.id}','cancelled')"><i class="ti ti-x"></i></button></span>`:""}</div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("v5_free_all_day"))}</div>`}</div>`;}).join("")}</div>`
      :`<div class="card" style="text-align:center;padding:24px">${zdEmpty(t("v5_res_none"),"door")}${mgr?`<button class="btn btn-g btn-sm" onclick="v5ResModal()"><i class="ti ti-plus"></i> ${esc(t("v5_resources"))}</button>`:""}</div>`);
  };
});
function v5ResModal(){const r=_v5.res.data;
  zdModal("modal-v5-res",`<div class="modal-title"><i class="ti ti-settings" style="color:var(--green)"></i> ${esc(t("v5_resources"))}</div>
    <div id="v5-res-list">${r.resources.map(x=>`<div class="ht-bk" onclick="v5ResEdit('${x.id}')"><span style="flex:1"><b>${esc(x.name)}</b> <small style="color:var(--muted)">${esc(t("v5_o_"+x.kind))} · ${esc(x.open_hm)}–${esc(x.close_hm)}${x.price?" · "+zdMoney(x.price):""}</small></span>${x.active?"":v5Badge(t("ga_inactive"),"br")}</div>`).join("")}</div>
    <div class="card2" style="margin-top:10px"><b id="v5-res-t">${esc(t("v5_new"))}</b><input type="hidden" id="v5-res-id">
      <div class="grid2"><div class="fgrp"><label class="fl" for="v5-res-n">${esc(t("v5_name"))}</label><input class="inp" id="v5-res-n"></div>
        <div class="fgrp"><label class="fl" for="v5-res-k">${esc(t("v5_type"))}</label><select class="inp" id="v5-res-k">${["room","equipment","activity","cabin","vehicle","other"].map(k=>`<option value="${k}"${k===_v5.res.kind?" selected":""}>${esc(t("v5_o_"+k))}</option>`).join("")}</select></div>
        <div class="fgrp"><label class="fl" for="v5-res-c">${esc(t("v5_capacity"))}</label><input class="inp" id="v5-res-c" type="number" min="1" value="1"></div>
        <div class="fgrp"><label class="fl" for="v5-res-p">${esc(t("v5_price_per"))}</label><input class="inp" id="v5-res-p" type="number" min="0" step="0.5" value="0"></div>
        <div class="fgrp"><label class="fl" for="v5-res-d">${esc(t("v5_duration"))}</label><input class="inp" id="v5-res-d" type="number" min="5" value="60"></div>
        <div class="fgrp"><label class="fl">${esc(t("v5_open_close"))}</label><div style="display:flex;gap:6px"><input class="inp" id="v5-res-o" type="time" value="08:00" aria-label="${esc(t("v5_start"))}"><input class="inp" id="v5-res-f" type="time" value="20:00" aria-label="${esc(t("v5_end"))}"></div></div></div>
      <label class="terms-check"><input type="checkbox" id="v5-res-a" checked><span>${esc(t("ga_active"))}</span></label></div>
    <div class="err-box" id="v5-res-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-res')">${esc(t("btn_close"))}</button><button class="btn btn-g btn-sm" onclick="v5ResSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,560);}
function v5ResEdit(id){const x=_v5.res.data.resources.find(z=>z.id===id);document.getElementById("v5-res-id").value=id;document.getElementById("v5-res-t").textContent=x.name;
  [["n","name"],["k","kind"],["c","capacity"],["p","price"],["d","duration_min"],["o","open_hm"],["f","close_hm"]].forEach(([a,b])=>document.getElementById("v5-res-"+a).value=x[b]);document.getElementById("v5-res-a").checked=x.active;}
async function v5ResSave(){const id=zdVal("v5-res-id");const b={name:zdVal("v5-res-n"),kind:zdVal("v5-res-k"),capacity:parseInt(zdVal("v5-res-c"))||1,price:zdNum("v5-res-p")||0,duration_min:parseInt(zdVal("v5-res-d"))||60,open_hm:zdVal("v5-res-o"),close_hm:zdVal("v5-res-f"),active:document.getElementById("v5-res-a").checked};
  if(!b.name){v5Err("v5-res-err",t("v5_name"));return;}
  if(await v5Do(()=>api(id?"PATCH":"POST",id?`/resources/${id}`:`/resources?module=${_v5.res.mod}`,b),t("v5_saved"),"v5-res-err")){zdCloseModal("modal-v5-res");navigate(_v5.res.page);}}
async function v5RbModal(){const r=_v5.res.data;let inh=[];if(_v5.res.mod==="hotel")inh=await api("GET","/hotel/inhouse").catch(()=>[]);
  zdModal("modal-v5-rb",`<div class="modal-title"><i class="ti ti-calendar-plus" style="color:var(--green)"></i> ${esc(t("v5_book"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-rb-r">${esc(t("v5_resource"))}</label><select class="inp" id="v5-rb-r">${r.resources.filter(x=>x.active).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>
      <div class="fgrp"><label class="fl" for="v5-rb-d">${esc(t("v5_day"))}</label><input class="inp" id="v5-rb-d" type="date" value="${r.day}"></div>
      <div class="fgrp"><label class="fl" for="v5-rb-a">${esc(t("v5_start"))}</label><input class="inp" id="v5-rb-a" type="time" value="09:00"></div>
      <div class="fgrp"><label class="fl" for="v5-rb-b">${esc(t("v5_end_opt"))}</label><input class="inp" id="v5-rb-b" type="time"></div>
      <div class="fgrp"><label class="fl" for="v5-rb-w">${esc(t("v5_who"))}</label><input class="inp" id="v5-rb-w"></div>
      <div class="fgrp"><label class="fl" for="v5-rb-n">${esc(t("v5_persons"))}</label><input class="inp" id="v5-rb-n" type="number" min="1" value="1"></div>
      ${inh.length?`<div class="fgrp" style="grid-column:1/-1"><label class="fl" for="v5-rb-h">${esc(t("v5_charge_room"))}</label><select class="inp" id="v5-rb-h"><option value="">—</option>${inh.map(b=>`<option value="${b.id}">${esc(b.room)} · ${esc(b.guest_name)}</option>`).join("")}</select></div>`:""}
      <div class="fgrp" style="grid-column:1/-1"><label class="fl" for="v5-rb-x">${esc(t("fld_notes"))}</label><input class="inp" id="v5-rb-x"></div></div>
    <div class="err-box" id="v5-rb-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-rb')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5RbSave()"><i class="ti ti-check"></i> ${esc(t("v5_book"))}</button></div>`,520);}
async function v5RbSave(){const b={resource_id:zdVal("v5-rb-r"),day:zdVal("v5-rb-d"),start:zdVal("v5-rb-a"),end:zdVal("v5-rb-b")||null,who:zdVal("v5-rb-w"),persons:parseInt(zdVal("v5-rb-n"))||1,note:zdVal("v5-rb-x")||null,hotel_booking_id:zdVal("v5-rb-h")||null};
  if(!b.who){v5Err("v5-rb-err",t("v5_who"));return;}
  if(await v5Do(()=>api("POST","/resources/bookings",b),t("v5_saved"),"v5-rb-err")){zdCloseModal("modal-v5-rb");navigate(_v5.res.page);}}
async function v5RbSt(id,st){if(await v5Do(()=>api("POST",`/resources/bookings/${id}/status`,{status:st})))navigate(_v5.res.page);}

// ── Dossiers suivis par étapes ──
const V5_CASES={pmeinterventions:["intervention",null,"nav_v5_interventions"],hotelissues:["room_issue","hoteltools","v5_t_issues"]};
const V5_CASE_COL={received:"var(--blue)",scheduled:"var(--cyan)",in_progress:"var(--purple)",waiting:"var(--amber)",done:"var(--green)",cancelled:"var(--red)"};
Object.entries(V5_CASES).forEach(([page,[kind,back,title]])=>{
  SECTOR_PAGE_LOADERS[page]=async el=>{
    _v5.cf=_v5.cf||{};const f=_v5.cf[kind]||"open";const r=await api("GET",`/cases?kind=${kind}&status=${f}`);_v5.cs={kind,page,rows:r};
    el.innerHTML=v5Head(t(title),t(title+"_x"),`<button class="btn btn-g btn-sm" onclick="v5CaseModal()"><i class="ti ti-plus"></i> ${esc(t("v5_new_case_"+kind))}</button>`,back)+
      `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${["open","all","done","cancelled"].map(s=>`<button class="toggle-btn${f===s?" active":""}" onclick="_v5.cf['${kind}']='${s}';navigate('${page}')">${esc(t(s==="open"?"v5_f_open":s==="all"?"v5_f_all":"v5_cs_"+s))}</button>`).join("")}</div>`+
      (r.length?`<div class="v5-list">${r.map(c=>`<button class="card v5-row" style="border-left:4px solid ${V5_CASE_COL[c.status]}" onclick="v5CaseModal('${c.id}')"><div style="flex:1;min-width:0"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><b>${esc(c.title)}</b>${v5Badge(t("v5_cs_"+c.status))}${c.priority==="urgent"||c.priority==="high"?v5Badge(t("v5_pr_"+c.priority),"br"):""}</div>
        <div style="font-size:12px;color:var(--muted)"><span class="mono">${esc(c.number)}</span>${c.room?" · "+esc(t("ht_room"))+" "+esc(c.room):""}${c.contact?" · "+esc(c.contact):""}${c.assignee?" · "+esc(c.assignee):""}${c.planned_day?" · "+v5Date(c.planned_day):""}${c.total?" · "+zdMoney(c.total):""}</div></div><i class="ti ti-chevron-right" style="color:var(--muted)"></i></button>`).join("")}</div>`:v5Empty("v5_nothing","tool"));
  };
});
async function v5CaseModal(id){
  const kind=_v5.cs.kind;const c=id?_v5.cs.rows.find(x=>x.id===id):{lines:[],flow:kind==="intervention"?["received","scheduled","in_progress","waiting","done"]:["received","in_progress","waiting","done"],status:"received",priority:"normal"};
  const [cls,rooms]=await Promise.all([kind==="intervention"?v5Clients():[],kind==="room_issue"?api("GET","/hotel/rooms").then(r=>Array.isArray(r)?r:(r.rooms||[])).catch(()=>[]):[]]);
  _v5.case={...c,lines:(c.lines||[]).map(l=>({...l}))};const closed=["done","cancelled"].includes(c.status);const idx=c.flow.indexOf(c.status);
  zdModal("modal-v5-case",`<div class="modal-title" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><span><i class="ti ti-adjustments" style="color:var(--green)"></i> ${esc(id?c.number:t("v5_new_case_"+kind))}</span>${id?v5Badge(t("v5_cs_"+c.status)):""}</div>
    ${id&&!closed?`<div class="ga-steps">${c.flow.map((s,i)=>`<button type="button" class="ga-step${i<=idx?" on":""}" onclick="v5CaseStatus('${s}')">${esc(t("v5_cs_"+s))}</button>`).join("")}</div>`:""}
    <div class="fgrp"><label class="fl" for="v5-c-t">${esc(t("v5_case_title"))}</label><input class="inp" id="v5-c-t" value="${esc(c.title||"")}"></div>
    <div class="v5-grid">${kind==="intervention"?`<div class="fgrp"><label class="fl" for="v5-c-cl">${esc(t("v5_client"))}</label><select class="inp" id="v5-c-cl">${v5ClientOptions(cls,c.client_id)}</select></div>
      <div class="fgrp"><label class="fl" for="v5-c-ph">${esc(t("ga_phone"))}</label><input class="inp" id="v5-c-ph" type="tel" value="${esc(c.phone||"")}"></div>
      <div class="fgrp" style="grid-column:1/-1"><label class="fl" for="v5-c-ad">${esc(t("v5_address"))}</label><input class="inp" id="v5-c-ad" value="${esc(c.address||"")}"></div>`
      :`<div class="fgrp"><label class="fl" for="v5-c-rm">${esc(t("ht_room"))}</label><select class="inp" id="v5-c-rm"><option value="">—</option>${rooms.map(r=>`<option value="${r.id}"${r.id===c.room_id?" selected":""}>${esc(r.number)}</option>`).join("")}</select></div>`}
      <div class="fgrp"><label class="fl" for="v5-c-as">${esc(t("v5_assignee"))}</label><input class="inp" id="v5-c-as" value="${esc(c.assignee||"")}"></div>
      <div class="fgrp"><label class="fl" for="v5-c-pd">${esc(t("v5_planned"))}</label><input class="inp" id="v5-c-pd" type="date" value="${esc(c.planned_day||"")}"></div>
      <div class="fgrp"><label class="fl" for="v5-c-pr">${esc(t("v5_priority"))}</label><select class="inp" id="v5-c-pr">${["low","normal","high","urgent"].map(p=>`<option value="${p}"${c.priority===p?" selected":""}>${esc(t("v5_pr_"+p))}</option>`).join("")}</select></div></div>
    <div class="fgrp"><label class="fl" for="v5-c-de">${esc(t("v5_description"))}</label><textarea class="inp" id="v5-c-de" rows="2">${esc(c.description||"")}</textarea></div>
    ${id?`<div class="fgrp"><label class="fl" for="v5-c-re">${esc(t("v5_report"))}</label><textarea class="inp" id="v5-c-re" rows="2">${esc(c.report||"")}</textarea></div>`:""}
    ${kind==="intervention"&&id?`<div class="fl" style="margin:6px 0">${esc(t("ga_lines"))}</div><div id="v5-c-lines"></div>${c.invoice_id?"":`<div style="display:flex;gap:6px;margin:6px 0 10px"><button class="btn btn-o btn-sm" onclick="v5CaseLine('part')"><i class="ti ti-plus"></i> ${esc(t("ga_add_part"))}</button><button class="btn btn-o btn-sm" onclick="v5CaseLine('labor')"><i class="ti ti-plus"></i> ${esc(t("ga_add_labor"))}</button></div>`}
      <div class="ga-track"><i class="ti ti-link"></i> <span>${esc(t("v5_track_x"))}</span><button class="btn btn-o btn-sm" onclick="v5CaseCopy()"><i class="ti ti-copy"></i> ${esc(t("ga_copy_link"))}</button><a class="btn btn-o btn-sm" target="_blank" rel="noopener" href="${v5Wa(c.phone,t("v5_case_wa").replace("{n}",c.number).replace("{u}",v5CaseUrl(c)))}"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a></div>`:""}
    <div class="err-box" id="v5-c-err"></div>
    <div class="modal-footer" style="flex-wrap:wrap">${id&&!closed?`<button class="btn btn-o btn-sm" onclick="v5CaseStatus('cancelled')">${esc(t("btn_cancel"))} ${esc(t("v5_the_case"))}</button>`:""}
      ${kind==="intervention"&&id&&!c.invoice_id&&c.lines.length?`<button class="btn btn-o btn-sm" onclick="v5CaseInvoice()"><i class="ti ti-file-invoice"></i> ${esc(t("v5_invoice_it"))}</button>`:""}
      ${c.invoice_id?`<button class="btn btn-o btn-sm" onclick="openInvoiceDoc('${c.invoice_id}')"><i class="ti ti-file-invoice"></i> ${esc(t("ga_see_invoice"))}</button>`:""}
      <button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-case')">${esc(t("btn_close"))}</button><button class="btn btn-g btn-sm" onclick="v5CaseSave()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button></div>`,620);
  v5CaseLines();
}
function v5CaseUrl(c){return `${location.origin}/?suivi=${encodeURIComponent(c.token||"")}`;}
function v5CaseCopy(){const u=v5CaseUrl(_v5.case);navigator.clipboard.writeText(u).then(()=>showToast(t("ga_copied")),()=>showToast(u));}
function v5CaseLines(){const box=document.getElementById("v5-c-lines");if(!box)return;const c=_v5.case;const ro=!!c.invoice_id;
  box.innerHTML=(c.lines.length?c.lines.map((l,i)=>ro?`<div class="ga-line ro"><span class="badge ${l.kind==="labor"?"bb":"ba"}">${esc(t("ga_k_"+l.kind))}</span><span style="flex:1">${esc(l.label)}</span><span>${zdQty(l.qty)} × ${zdMoney(l.unit_price)}</span></div>`
    :`<div class="ga-line"><span class="badge ${l.kind==="labor"?"bb":"ba"}">${esc(t("ga_k_"+l.kind))}</span><input class="inp" aria-label="${esc(t("ga_label"))}" placeholder="${esc(t("ga_label"))}" value="${esc(l.label)}" oninput="_v5.case.lines[${i}].label=this.value">
      <input class="inp ga-n" aria-label="${esc(t("ga_qty"))}" type="number" min="0.01" step="0.01" value="${l.qty}" oninput="_v5.case.lines[${i}].qty=parseFloat(this.value)||0;v5CaseTot()"><input class="inp ga-n" aria-label="${esc(t("ga_price"))}" type="number" min="0" step="0.01" value="${l.unit_price}" oninput="_v5.case.lines[${i}].unit_price=parseFloat(this.value)||0;v5CaseTot()">
      <button class="btn btn-o btn-sm" aria-label="${esc(t("btn_delete"))}" onclick="_v5.case.lines.splice(${i},1);v5CaseLines()"><i class="ti ti-x"></i></button></div>`).join(""):`<div style="font-size:12px;color:var(--muted)">${esc(t("ga_no_lines"))}</div>`)+`<div id="v5-c-tot" style="text-align:right;font-weight:800;margin-top:6px"></div>`;v5CaseTot();}
function v5CaseTot(){const el=document.getElementById("v5-c-tot");if(el)el.textContent=t("ga_total")+" "+zdMoney(_v5.case.lines.reduce((s,l)=>s+(l.qty||0)*(l.unit_price||0),0));}
function v5CaseLine(k){_v5.case.lines.push({kind:k,label:k==="labor"?t("ga_labor_default"):"",qty:1,unit_price:0});v5CaseLines();}
function v5CaseBody(){const kind=_v5.cs.kind;const b={title:zdVal("v5-c-t")||null,assignee:zdVal("v5-c-as")||null,planned_day:zdVal("v5-c-pd")||null,priority:zdVal("v5-c-pr"),description:zdVal("v5-c-de")||null};
  if(document.getElementById("v5-c-re"))b.report=zdVal("v5-c-re")||null;
  if(kind==="intervention"){b.client_id=zdVal("v5-c-cl")||null;b.phone=zdVal("v5-c-ph")||null;b.address=zdVal("v5-c-ad")||null;if(_v5.case.id&&!_v5.case.invoice_id)b.lines=_v5.case.lines.map(l=>({kind:l.kind,label:(l.label||"").trim(),qty:l.qty,unit_price:l.unit_price}));}
  else b.room_id=zdVal("v5-c-rm")||null;return b;}
async function v5CaseSave(){const b=v5CaseBody();if(!b.title){v5Err("v5-c-err",t("v5_case_title"));return;}const id=_v5.case.id;
  const r=await v5Do(()=>api(id?"PATCH":"POST",id?`/cases/${id}`:`/cases?kind=${_v5.cs.kind}`,b),t("v5_saved"),"v5-c-err");if(r){zdCloseModal("modal-v5-case");await SECTOR_PAGE_LOADERS[_v5.cs.page](document.getElementById("page-"+_v5.cs.page));if(!id)v5CaseModal(r.id);}}
async function v5CaseStatus(s){const id=_v5.case.id;if(s==="cancelled"&&!confirm(t("v5_cancel_q")))return;
  await v5Do(()=>api("PATCH",`/cases/${id}`,v5CaseBody()),null,"v5-c-err");const r=await v5Do(()=>api("POST",`/cases/${id}/status`,{status:s}),null,"v5-c-err");
  if(r){showToast(t("ga_st_done").replace("{s}",t("v5_cs_"+s)));await SECTOR_PAGE_LOADERS[_v5.cs.page](document.getElementById("page-"+_v5.cs.page));if(!["done","cancelled"].includes(s))v5CaseModal(id);else zdCloseModal("modal-v5-case");}}
async function v5CaseInvoice(){const id=_v5.case.id;await v5Do(()=>api("PATCH",`/cases/${id}`,v5CaseBody()),null,"v5-c-err");const paid=confirm(t("v5_paid_now_q"));
  const r=await v5Do(()=>api("POST",`/cases/${id}/invoice`,{method:paid?"cash":null}),null,"v5-c-err");if(r){showToast(t("v5_invoiced").replace("{n}",r.number));zdCloseModal("modal-v5-case");navigate(_v5.cs.page);}}

// ── Messages WhatsApp à envoyer ──
async function v5OutboxHtml(module){
  const rows=await api("GET",`/outbox?module=${module}`);
  return `<div class="card"><b><i class="ti ti-brand-whatsapp"></i> ${esc(t("v5_outbox"))} (${rows.length})</b><div style="font-size:12px;color:var(--muted);margin:4px 0 8px">${esc(t("v5_outbox_x"))}</div>
    ${rows.map(o=>`<div class="ht-bk" style="cursor:default;flex-wrap:wrap"><span style="flex:1;min-width:180px"><b>${esc(o.name||"")}</b> <small>${esc(o.phone||"")}</small><div style="font-size:12px;color:var(--muted)">${esc(o.text)}</div></span>
      ${o.wa?`<a class="btn btn-g btn-sm" target="_blank" rel="noopener" href="${esc(o.wa)}" onclick="setTimeout(()=>v5OutDone('${o.id}','${module}'),800)"><i class="ti ti-brand-whatsapp"></i> ${esc(t("v5_send"))}</a>`:""}<button class="btn btn-o btn-sm" onclick="v5OutDone('${o.id}','${module}')"><i class="ti ti-check"></i></button></div>`).join("")||`<div style="font-size:12px;color:var(--muted)">${esc(t("v5_outbox_none"))}</div>`}</div>`;
}
async function v5OutDone(id){await v5Do(()=>api("POST",`/outbox/${id}/done`));v5Reload();}

// ── Pages « Outils » de chaque secteur ──
SECTOR_PAGE_LOADERS.pmetools=async el=>{el.innerHTML=v5Head(t("nav_v5_tools"),t("v5_tools_x"))+v5Tiles([["rgpmecontract","file-certificate","v5_t_contracts"],["rgpmepurchase","shopping-cart","v5_t_purchases"],["rgpmefleet","engine","v5_t_fleet"],["pmeshifts","calendar-time","v5_t_shifts"],["booking","calendar-event","v5_t_booking"],["projects","clock","v5_t_timesheets"],["v5dn","signature","v5_t_dnsign"]]);};
SECTOR_PAGE_LOADERS.restotools=async el=>{el.innerHTML=v5Head(t("nav_v5_tools"),t("v5_tools_x"))+v5Tiles([["restotemps","temperature","v5_t_temps"],["restolots","calendar-due","v5_t_lots"],["restowaiters","user-star","v5_t_waiters"],["restodaily","star","v5_t_daily"],["v5hh","clock-hour-5","v5_t_hh"],["rgcatering","cake","v5_t_catering"],["restowaste","trash","v5_t_waste"],["restoanalysis","chart-dots-3","v5_t_analysis"],["restoshifts","calendar-time","v5_t_shifts"],hasModule("bar")?null:["barevents","ticket","v5_t_events"]]);};
SECTOR_PAGE_LOADERS.bartools=async el=>{el.innerHTML=v5Head(t("nav_v5_tools"),t("v5_tools_x"))+v5Tiles([["barscan","barcode","v5_t_barscan"],["barbottles","bottle","v5_t_bottles"],["barevents","ticket","v5_t_events"],["baranalytics","clock","v5_t_peak"],["barshifts","calendar-time","v5_t_shifts_dj"],["restowaiters","user-star","v5_t_waiters"]]);};
SECTOR_PAGE_LOADERS.hoteltools=async el=>{el.innerHTML=v5Head(t("nav_v5_tools"),t("v5_tools_x"))+v5Tiles([["hotelmenus","qrcode","v5_t_hmenus"],["hotelactivities","sparkles","v5_t_spa"],["hotelcorporate","building","v5_t_corporate"],["hotelguests","users","v5_t_guests"],["hotelissues","adjustments","v5_t_issues"],["hotelrates","calendar-stats","v5_t_rates"],["hotelpolice","id","v5_t_police"],["rglaundry","bucket","v5_t_laundry"],["rglost","search","v5_t_lost"]]);};
SECTOR_PAGE_LOADERS.beautytools=async el=>{el.innerHTML=v5Head(t("nav_v5_tools"),t("v5_tools_x"))+v5Tiles([["beautyreminders","bell","v5_t_reminders"],["beautycabins","door-enter","v5_t_cabins"],["rgrent","armchair","v5_t_rent"],["beautyshifts","calendar-time","v5_t_shifts"],["zdgoals","target","nav_v5_goals"]]);};
SECTOR_PAGE_LOADERS.retailtools=async el=>{el.innerHTML=v5Head(t("nav_v5_tools"),t("v5_tools_x"))+v5Tiles([["retailcounts","clipboard-check","v5_t_counts"],["retailpromos","clock-hour-5","v5_t_promos"],["retailreorder","truck-delivery","v5_t_reorder"],["retaillabels","tag","v5_t_labels"],["retailroutes","map-2","v5_t_routes"],["retailreturns","arrow-back-up","v5_t_returns"],["retailmargins","discount","v5_t_margins"]]);};
SECTOR_PAGE_LOADERS.pharmatools=async el=>{el.innerHTML=v5Head(t("nav_v5_tools_pharma"),t("v5_tools_x"))+v5Tiles([["pharmatemps","temperature","v5_t_vaccine"],["pharmaregister","lock","v5_t_controlled"],["rgpharmareturn","arrow-back-up","v5_t_supret"],["pharmashifts","calendar-time","v5_t_gardes"]]);};
SECTOR_PAGE_LOADERS.coldtools=async el=>{el.innerHTML=v5Head(t("nav_v5_tools"),t("v5_tools_x"))+v5Tiles([["coldmap","layout-board","v5_t_map"],["coldlabels","qrcode","v5_t_coldlabels"],["coldcert","certificate","v5_t_cert"],["rgcoldcontract","file-certificate","v5_t_ccontracts"],["rggenerator","plug","v5_t_generator"],["rgmaintenance","adjustments","v5_t_maint"]]);};
SECTOR_PAGE_LOADERS.schooltools=async el=>{el.innerHTML=v5Head(t("nav_v5_tools"),t("v5_tools_x"))+v5Tiles([["schoolmeetings","calendar-event","v5_t_meetings"],["schoolhomework","book","v5_t_homework"],["schoolcanteen","tools-kitchen-2","v5_t_canteen"],["schoolshop","shopping-bag","v5_t_shop"],["schoolprereg","user-plus","v5_t_prereg"],["schoolgate","id-badge-2","v5_t_gate"],["schoolhours","clock-dollar","v5_t_hours"],["schoolrooms","door-enter","v5_t_rooms"],["schoolauto","bell-ringing","v5_t_autorem"]]);};
SECTOR_PAGE_LOADERS.garagetools=async el=>{el.innerHTML=v5Head(t("nav_v5_tools"),t("v5_tools_x"))+v5Tiles([["garagewarranties","shield-check","v5_t_warranties"],["rgloan","engine","v5_t_loans"],["garagevehicles","engine","v5_t_logbook"]]);};
