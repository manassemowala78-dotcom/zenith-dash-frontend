// ── 9.3 · ESPACE CLIENT, MESSAGERIE, IA EN PAUSE, CHARIOTS, PREUVES DE VIREMENT ──
const V93_PAGES={};
const ZD_CLIENT_PAGES=["myspace","messaging","notifications","profile"];
let _zdBnavSaved=null,_zdConvFilter="all";

function zdIsClientAcc(){return !!(State.tenant&&State.tenant.account_type==="client");}
function zdHasModule(m){return !!(State.tenant&&(State.tenant.is_creator||(State.tenant.special_modules||{})[m]));}
function zdAiOn(){return !!(State.tenant&&State.tenant.ai_enabled);}
function zdApplyAI(){document.body.classList.toggle("zd-no-ai",!zdAiOn());}
function zdPageGuard(page){
  if(zdIsClientAcc()&&!ZD_CLIENT_PAGES.includes(page))return "myspace";
  if(page==="ai"&&!zdAiOn())return "dashboard";
  if(page==="carts"&&!zdHasModule("carts"))return "dashboard";
  if(page==="messaging"&&document.querySelector("#page-messaging.active")&&document.querySelector(".msg-layout.mobile-chat-open")&&typeof backToConvList==="function")backToConvList();
  return page;
}

// ── Comptes clients dans l'application ──
function zdClientBnavHtml(){
  const it=(p,i,k)=>`<div class="bnav-item" data-bp="${p}" onclick="navigate('${p}')"><i class="ti ti-${i}"></i><span>${esc(t(k))}</span></div>`;
  return it("myspace","shopping-bag","bnav_myspace")+it("messaging","message-circle","nav_messaging")+it("notifications","bell","nav_notifications")+it("profile","settings","bnav_profile");
}
function zdApplyClientUI(){
  document.body.classList.add("zd-client");
  const inner=document.querySelector(".bottom-nav-inner");
  if(inner){if(_zdBnavSaved===null)_zdBnavSaved=inner.innerHTML;inner.innerHTML=zdClientBnavHtml();}
  ["card_currencies","card_invoice_design","card_companies","card_bank_details","card_referral"].forEach(k=>document.querySelectorAll(`#page-profile [data-i18n="${k}"]`).forEach(el=>el.closest(".card")?.classList.add("zd-biz")));
  document.getElementById("sector-card")?.classList.add("zd-biz");
  document.getElementById("companies-card")?.classList.add("zd-biz");
  document.querySelectorAll(".sidebar .nav-g").forEach(g=>g.classList.toggle("zd-cl-hide",!g.querySelector("[data-client]")));
  const tb=document.getElementById("trial-bar");if(tb)tb.className="trial-bar hidden";
  setHTML("topbar-plan",`<span class="badge bg">${esc(t("badge_client"))}</span>`);
}
function zdLeaveClientUI(){
  if(!document.body.classList.contains("zd-client"))return;
  document.body.classList.remove("zd-client");
  const inner=document.querySelector(".bottom-nav-inner");
  if(inner&&_zdBnavSaved!==null){inner.innerHTML=_zdBnavSaved;}
  _zdBnavSaved=null;
}
async function zdShowClientApp(){
  const cs=document.getElementById("client-space");if(cs)cs.style.display="none";
  document.getElementById("auth-screen").style.display="none";
  const land=document.getElementById("landing");if(land)land.style.display="none";
  document.getElementById("app-screen").style.display="block";
  document.querySelector(".bottom-nav")?.classList.add("show");
  State.restricted=false;
  try{const fresh=await api("GET","/profile/");if(fresh){State.tenant={...State.tenant,...fresh};localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));}}catch(_){}
  const u=State.tenant;
  set("topbar-name",u.name||"");
  setTopbarAvatar(u.avatar_url,u.name);
  zdApplyClientUI();zdApplyAI();
  connectMessagingWS();
  const dl=consumeDeepLink();
  if(!(dl.page==="messaging"&&dl.conv&&await openDeepLink(dl.page,dl.conv)))navigate(ZD_CLIENT_PAGES.includes(dl.page)?dl.page:"myspace");
  document.body.classList.add("zd-app-visible");
  try{checkTermsAcceptance(State.tenant);}catch(_){}
  loadNotifBadge();syncPushSubscription();
}
function zdAfterAppLayout(){zdApplyAI();zdRenderSpecialNav();}

// ── « Mon espace client » (clients et gérants) ──
function zdClientLink(kind,token){
  if(!State.token||!kind||!token)return Promise.resolve(null);
  return fetch(`${API_BASE}/me/links`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${State.token}`},body:JSON.stringify({kind,token:String(token)})}).then(r=>r.ok?r.json():null).catch(()=>null);
}
function zdMySpaceEl(){const el=ensureSectorPage("myspace");document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x===el));return el;}
V93_PAGES.myspace=async function(){
  const el=zdMySpaceEl();
  if(!el.innerHTML)el.innerHTML=`<div class="card" style="text-align:center;color:var(--muted)">${esc(t("loading"))}</div>`;
  await csSyncLocal();await csLoad();
};
async function csLoad(){
  const el=zdMySpaceEl();
  try{_cs.data=await api("GET","/me/space");}catch(e){el.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;return;}
  csRender();
}
function csRender(){
  const d=_cs.data||{items:[]};const el=zdMySpaceEl();const client=zdIsClientAcc();
  const items=(d.items||[]).filter(i=>_cs.tab==="all"||i.group===_cs.tab);
  const counts={all:(d.items||[]).length};Object.keys(CS_GROUPS).forEach(g=>counts[g]=(d.items||[]).filter(i=>i.group===g).length);
  const secOpts=["pme","restaurant","bar","hotel","beauty","retail","pharmacy","cold","school","embassy"].map(k=>`<option value="${k}">${esc(t("sector_"+k)!=="sector_"+k?t("sector_"+k):k)}</option>`).join("");
  el.innerHTML=`<div class="sh"><div><div class="st">${esc(client?abTr("cs_hello",{n:(d.name||"").split(" ")[0]}):t("nav_myspace"))}</div><div class="ss">${esc(client?t("cs_sub"):t("cs_sub_manager"))}</div></div></div>
    <div class="cs-tabs" role="tablist">${["all",...Object.keys(CS_GROUPS)].map(g=>`<button type="button" role="tab" aria-selected="${_cs.tab===g}" class="${_cs.tab===g?"on":""}" onclick="_cs.tab='${g}';csRender()">${esc(t(g==="all"?"cs_tab_all":CS_GROUPS[g]))} <span>${counts[g]}</span></button>`).join("")}</div>
    <div class="cs-list">${items.length?items.map(csItem).join(""):`<div class="cs-empty"><i class="ti ti-inbox"></i><div>${esc(t(client?"cs_empty":"cs_empty_manager"))}</div></div>`}</div>
    <div class="card2 cs-add"><div style="font-weight:700">${esc(t("cs_add_t"))}</div><div style="font-size:12px;color:var(--muted);margin:4px 0 8px">${esc(t("cs_add_x"))}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input class="inp" id="cs-link" style="flex:1;min-width:0" placeholder="https://zenithdash.org/?order=…"><button class="btn btn-g btn-sm" onclick="csAddLink()">${esc(t("cs_add_btn"))}</button></div></div>
    <div class="ms-hint-v93">${esc(t("cs_auto_hint"))}</div>
    ${client?`<div class="card2 cs-biz-card"><div style="font-weight:700;font-size:15px"><i class="ti ti-building-store" style="color:var(--green)"></i> ${esc(t("cs_open_biz_t"))}</div><div style="font-size:13px;color:var(--muted);margin:4px 0 10px">${esc(t("cs_open_biz_x"))}</div>
      <div id="cs-biz-form" style="display:none"><div class="fgrp"><label class="fl">${esc(t("cs_company"))}</label><input class="inp" id="cs-company"></div><div class="fgrp"><label class="fl">${esc(t("cs_sector"))}</label><select class="inp" id="cs-sector">${secOpts}</select></div>
        <button class="btn btn-g" style="width:100%" onclick="csBecomeManager()"><i class="ti ti-rocket"></i> ${esc(t("cs_start"))}</button></div>
      <button class="btn btn-o btn-sm" id="cs-biz-open" onclick="this.style.display='none';document.getElementById('cs-biz-form').style.display='block'">${esc(t("cs_open_biz_btn"))}</button></div>`:""}`;
}
async function csAddLink(){
  const p=csParseLink(zdVal("cs-link"));if(!p){showToast(t("cs_add_bad"),"error");return;}
  try{const r=await api("POST","/me/links",p);showToast(t(r&&r.own?"cs_added_own":"cs_added"),r&&r.own?"error":undefined);await csLoad();}catch(e){showToast(e.message,"error");}
}
async function csBecomeManager(){
  const company=zdVal("cs-company");if(!company){showToast(t("cs_company_req"),"error");return;}
  try{
    const r=await api("POST","/account/become-manager",{company_name:company,sector:zdVal("cs-sector")||"pme"});
    State.tenant=r.user;localStorage.setItem("zd_tenant",JSON.stringify(r.user));
    window._zdJustRegistered=true;
    zdLeaveClientUI();
    await showAppLayout();
  }catch(e){showToast(e.message,"error");}
}

// ── Messagerie : 4 pages ──
const ZD_CONV_FILTERS=[["all","msg_f_all"],["groups","msg_f_groups"],["unread","msg_f_unread"],["seen","msg_f_seen"]];
function zdConvMatch(c,f){
  if(f==="groups")return !!c.is_group;
  if(f==="unread")return (c.unread_count||0)>0;
  if(f==="seen")return (c.unread_count||0)===0&&!!c.last_message&&c.last_from_me===false;
  return true;
}
function zdConvFiltered(){return _conversations.filter(c=>zdConvMatch(c,_zdConvFilter));}
function zdConvEmptyText(){return t({groups:"msg_e_groups",unread:"msg_e_unread",seen:"msg_e_seen"}[_zdConvFilter]||"no_conversations");}
function zdRenderConvFilters(){
  const box=document.getElementById("conv-filters");if(!box)return;
  box.innerHTML=ZD_CONV_FILTERS.map(([k,l])=>{const n=_conversations.filter(c=>zdConvMatch(c,k)).length;return `<button type="button" role="tab" aria-selected="${_zdConvFilter===k}" class="${_zdConvFilter===k?"on":""}" onclick="zdSetConvFilter('${k}')" title="${esc(t(l+"_x"))}">${esc(t(l))}${k!=="all"&&n?` <span>${n}</span>`:""}</button>`;}).join("");
}
function zdSetConvFilter(k){_zdConvFilter=k;renderConvList();}

// ── Modules spéciaux dans le menu ──
function zdRenderSpecialNav(){
  const on=zdHasModule("carts")&&!zdIsClientAcc();
  const sidebar=document.querySelector(".sidebar");
  let g=document.getElementById("nav-special");
  if(!on){g?.remove();document.getElementById("more-special")?.remove();return;}
  if(sidebar&&!g){g=document.createElement("div");g.className="nav-g";g.id="nav-special";const first=sidebar.querySelector(".nav-g");first?first.after(g):sidebar.prepend(g);}
  if(g)g.innerHTML=`<div class="nav-lbl">${esc(t("nav_special"))}</div><div class="nav-i" data-p="carts" onclick="navigate('carts')"><i class="ti ti-shopping-cart"></i><span>${esc(t("carts_title"))}</span></div>`;
  const more=document.getElementById("more-menu");
  if(more&&!document.getElementById("more-special")){const d=document.createElement("div");d.id="more-special";d.style.cssText="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px";
    d.innerHTML=`<div onclick="navigate('carts');closeMoreMenu()" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:10px;background:var(--card);cursor:pointer"><i class="ti ti-shopping-cart" style="font-size:22px;color:var(--green)"></i><span style="font-size:11px;text-align:center">${esc(t("carts_title"))}</span></div>`;more.prepend(d);}
}

// ── Module Chariots et thermos ──
let _cart={day:null,data:null,week:null,showSettings:false};
function cartToday(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function cartAddDays(s,n){const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function cartMoney(v){const c=_cart.data?.settings?.currency||"CDF";const n=Math.round((+v||0)*100)/100;return n.toLocaleString("fr-FR",{maximumFractionDigits:2}).replace(/[\u00a0\u202f ]/g,"\u00a0")+"\u00a0"+(c==="CDF"?"FC":c);}
function cartEl(){const el=ensureSectorPage("carts");document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x===el));return el;}
V93_PAGES.carts=async function(){
  if(!_cart.day)_cart.day=cartToday();
  const el=cartEl();
  if(!el.innerHTML)el.innerHTML=`<div class="card" style="text-align:center;color:var(--muted)">${esc(t("loading"))}</div>`;
  await cartLoad();
};
async function cartLoad(){
  const el=cartEl();
  try{
    const [d,w]=await Promise.all([api("GET",`/carts?day=${_cart.day}`),api("GET",`/carts/summary?start=${cartAddDays(_cart.day,-6)}&end=${_cart.day}`)]);
    _cart.data=d;_cart.week=w;
    if(!d.settings.per_thermos&&!_cart.showSettings)_cart.showSettings=true;
    cartRender();
  }catch(e){el.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;}
}
function cartRender(){
  const el=cartEl(),d=_cart.data,s=d.settings,T=d.totals,mgr=typeof isTeamMember!=="function"||!isTeamMember()||zdIsMgrRole();
  const gap=v=>`<span class="badge ${v<0?"br":v>0?"bg":"bb"}">${v>0?"+":""}${cartMoney(v)}</span>`;
  el.innerHTML=`<div class="sh"><div><div class="st"><i class="ti ti-shopping-cart"></i> ${esc(t("carts_title"))}</div><div class="ss">${esc(t("carts_sub"))}</div></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn btn-o btn-sm" onclick="cartShift(-1)" aria-label="${esc(t("carts_prev_day"))}"><i class="ti ti-chevron-left"></i></button><input class="inp" type="date" id="cart-day" value="${_cart.day}" onchange="cartSetDay(this.value)" style="width:auto"><button class="btn btn-o btn-sm" onclick="cartShift(1)" aria-label="${esc(t("carts_next_day"))}"><i class="ti ti-chevron-right"></i></button>
      ${mgr?`<button class="btn btn-o btn-sm" onclick="_cart.showSettings=!_cart.showSettings;cartRender()"><i class="ti ti-settings"></i> ${esc(t("carts_settings"))}</button>`:""}</div></div>
    ${_cart.showSettings&&mgr?`<div class="card" style="margin-bottom:14px"><div style="font-weight:700;margin-bottom:10px">${esc(t("carts_settings"))}</div>
      <div class="cart-set">
        <div class="fgrp"><label class="fl" for="cs-per">${esc(t("carts_per_thermos"))}</label><input class="inp" type="number" min="0" step="any" id="cs-per" value="${s.per_thermos||""}" placeholder="7000"></div>
        <div class="fgrp"><label class="fl" for="cs-mode">${esc(t("carts_salary_mode"))}</label><select class="inp" id="cs-mode"><option value="day" ${s.salary_mode==="day"?"selected":""}>${esc(t("carts_salary_day"))}</option><option value="thermos" ${s.salary_mode==="thermos"?"selected":""}>${esc(t("carts_salary_thermos"))}</option></select></div>
        <div class="fgrp"><label class="fl" for="cs-sal">${esc(t("carts_salary_amount"))}</label><input class="inp" type="number" min="0" step="any" id="cs-sal" value="${s.salary_amount||""}" placeholder="5000"></div>
        <div class="fgrp"><label class="fl" for="cs-cur">${esc(t("carts_currency"))}</label><select class="inp" id="cs-cur">${["CDF","USD","XAF","XOF","MAD","EUR"].map(c=>`<option ${s.currency===c?"selected":""}>${c}</option>`).join("")}</select></div>
      </div>
      <div style="font-size:12px;color:var(--muted);margin:2px 0 10px">${esc(t("carts_settings_note"))}</div>
      <button class="btn btn-g btn-sm" onclick="cartSaveSettings()"><i class="ti ti-device-floppy"></i> ${esc(t("btn_save"))}</button></div>`:""}
    <div class="card" style="margin-bottom:14px"><div style="font-weight:700;margin-bottom:10px">${esc(t("carts_of_day"))}</div>
      ${d.carts.length?`<div class="tbl-wrap"><table class="cart-tbl cart-day"><thead><tr><th>${esc(t("carts_cart"))}</th><th>${esc(t("carts_vendor"))}</th><th class="r">${esc(t("carts_thermos"))}</th><th class="r">${esc(t("carts_expected"))}</th><th class="r">${esc(t("carts_paid"))}</th><th class="r">${esc(t("carts_gap"))}</th><th class="r">${esc(t("carts_salary"))}</th><th></th></tr></thead><tbody>
        ${d.carts.map(c=>`<tr><td class="cn">${esc(c.name)}</td><td class="cv">${esc(c.vendor)}</td><td class="r" data-l="${esc(t("carts_thermos"))}"><input class="inp cart-in" type="number" min="0" step="1" value="${c.thermos}" id="ct-${c.id}" onchange="cartSaveDay('${c.id}')" aria-label="${esc(t("carts_thermos"))} ${esc(c.name)}"></td><td class="r mono" data-l="${esc(t("carts_expected"))}">${cartMoney(c.expected)}</td><td class="r" data-l="${esc(t("carts_paid"))}"><input class="inp cart-in w" type="number" min="0" step="any" value="${c.paid}" id="cp-${c.id}" onchange="cartSaveDay('${c.id}')" aria-label="${esc(t("carts_paid"))} ${esc(c.name)}"></td><td class="r" data-l="${esc(t("carts_gap"))}">${c.thermos||c.paid?gap(c.gap):"—"}</td><td class="r mono" data-l="${esc(t("carts_salary"))}">${cartMoney(c.salary)}</td><td class="r ce">${mgr?`<button class="btn btn-o btn-sm" onclick="cartEdit('${c.id}')" title="${esc(t("carts_edit"))}" aria-label="${esc(t("carts_edit"))}"><i class="ti ti-pencil"></i></button>`:""}</td></tr>`).join("")}
        </tbody><tfoot><tr><td colspan="2" class="cn"><b>${esc(t("carts_total"))}</b></td><td class="r" data-l="${esc(t("carts_thermos"))}"><b>${T.thermos}</b></td><td class="r mono" data-l="${esc(t("carts_expected"))}"><b>${cartMoney(T.expected)}</b></td><td class="r mono" data-l="${esc(t("carts_paid"))}"><b>${cartMoney(T.paid)}</b></td><td class="r" data-l="${esc(t("carts_gap"))}">${T.thermos||T.paid?gap(T.gap):"—"}</td><td class="r mono" data-l="${esc(t("carts_salary"))}"><b>${cartMoney(T.salary)}</b></td><td class="ce"></td></tr></tfoot></table></div>`:`<div style="color:var(--muted);font-size:13px">${esc(t("carts_none"))}</div>`}
      ${mgr?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><input class="inp" id="cart-new" placeholder="${esc(t("carts_vendor_ph"))}" style="flex:1;min-width:0"><button class="btn btn-o btn-sm" onclick="cartAdd()"><i class="ti ti-plus"></i> ${esc(t("carts_add"))}</button></div>`:""}
    </div>
    <div class="cart-grid">
      <div class="card"><div style="font-weight:700;margin-bottom:10px">${esc(t("carts_expenses"))}</div>
        ${d.expenses.length?d.expenses.map(e=>`<div class="cart-line"><span>${esc(e.label)}</span><span class="mono">${cartMoney(e.amount)}</span><button class="btn btn-o btn-sm" onclick="cartDelExpense('${e.id}')" aria-label="${esc(t("btn_delete"))} ${esc(e.label)}"><i class="ti ti-x"></i></button></div>`).join(""):`<div style="color:var(--muted);font-size:13px">${esc(t("carts_no_expense"))}</div>`}
        <div class="cart-line"><b>${esc(t("carts_total_exp"))}</b><b class="mono">${cartMoney(T.expenses)}</b><span></span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><input class="inp" id="cart-el" placeholder="${esc(t("carts_exp_ph"))}" style="flex:1;min-width:0"><input class="inp" id="cart-ea" type="number" min="0" step="any" placeholder="${esc(t("carts_amount"))}" style="width:120px"><button class="btn btn-o btn-sm" onclick="cartAddExpense()"><i class="ti ti-plus"></i> ${esc(t("btn_add"))}</button></div></div>
      <div class="card"><div style="font-weight:700;margin-bottom:10px">${esc(t("carts_result"))}</div>
        <div class="cart-line"><span>${esc(t("carts_paid_in"))}</span><b class="mono">${cartMoney(T.paid)}</b><span></span></div>
        <div class="cart-line"><span>${esc(t("carts_salaries"))}</span><span class="mono">−${cartMoney(T.salary)}</span><span></span></div>
        <div class="cart-line"><span>${esc(t("carts_expenses"))}</span><span class="mono">−${cartMoney(T.expenses)}</span><span></span></div>
        <div class="cart-profit"><span>${esc(t("carts_profit"))}</span><b class="mono" style="color:${T.profit>=0?"var(--green)":"var(--red)"}">${cartMoney(T.profit)}</b></div>
        ${T.gap<0?`<div class="cart-warn">${esc(abTr("carts_missing",{a:cartMoney(-T.gap)}))}</div>`:""}</div>
    </div>
    <div class="card" style="margin-top:14px"><div style="font-weight:700;margin-bottom:10px">${esc(t("carts_week"))}</div>
      ${(_cart.week?.days||[]).length?`<div class="tbl-wrap"><table class="cart-tbl"><thead><tr><th>${esc(t("carts_day"))}</th><th class="r">${esc(t("carts_thermos"))}</th><th class="r">${esc(t("carts_paid"))}</th><th class="r">${esc(t("carts_salaries"))}</th><th class="r">${esc(t("carts_expenses"))}</th><th class="r">${esc(t("carts_profit"))}</th></tr></thead><tbody>
        ${_cart.week.days.map(r=>`<tr><td>${esc(abDate(r.day))}</td><td class="r">${r.thermos}</td><td class="r mono">${cartMoney(r.paid)}</td><td class="r mono">${cartMoney(r.salary)}</td><td class="r mono">${cartMoney(r.expenses)}</td><td class="r mono"><b>${cartMoney(r.profit)}</b></td></tr>`).join("")}
        </tbody><tfoot><tr><td><b>${esc(t("carts_total"))}</b></td><td class="r"><b>${_cart.week.totals.thermos}</b></td><td class="r mono"><b>${cartMoney(_cart.week.totals.paid)}</b></td><td class="r mono"><b>${cartMoney(_cart.week.totals.salary)}</b></td><td class="r mono"><b>${cartMoney(_cart.week.totals.expenses)}</b></td><td class="r mono"><b>${cartMoney(_cart.week.totals.profit)}</b></td></tr></tfoot></table></div>`:`<div style="color:var(--muted);font-size:13px">${esc(t("carts_week_empty"))}</div>`}</div>`;
}
function cartSetDay(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||""))return;_cart.day=v;cartLoad();}
function cartShift(n){cartSetDay(cartAddDays(_cart.day,n));}
async function cartSaveSettings(){
  const per=parseFloat(zdVal("cs-per"))||0,sal=parseFloat(zdVal("cs-sal"))||0;
  if(per<=0){showToast(t("carts_need_per"),"error");return;}
  try{await api("PUT","/carts/settings",{per_thermos:per,salary_mode:zdVal("cs-mode"),salary_amount:sal,currency:zdVal("cs-cur")});_cart.showSettings=false;showToast(t("toast_saved"));await cartLoad();}catch(e){showToast(e.message,"error");}
}
async function cartSaveDay(id){
  const th=Math.max(0,parseInt(document.getElementById("ct-"+id)?.value,10)||0),paid=Math.max(0,parseFloat(document.getElementById("cp-"+id)?.value)||0);
  try{await api("PUT",`/carts/${id}/days/${_cart.day}`,{thermos:th,paid});await cartLoad();}catch(e){showToast(e.message,"error");}
}
async function cartAdd(){
  const v=zdVal("cart-new");if(!v){showToast(t("carts_vendor_req"),"error");return;}
  try{await api("POST","/carts",{vendor:v});await cartLoad();}catch(e){showToast(e.message,"error");}
}
async function cartEdit(id){
  const c=_cart.data.carts.find(x=>x.id===id);if(!c)return;
  const v=prompt(t("carts_edit_prompt"),c.vendor);if(v===null)return;
  if(v.trim()===""){if(!confirm(t("carts_archive_confirm")))return;try{await api("PATCH",`/carts/${id}`,{active:false});await cartLoad();}catch(e){showToast(e.message,"error");}return;}
  try{await api("PATCH",`/carts/${id}`,{vendor:v.trim()});await cartLoad();}catch(e){showToast(e.message,"error");}
}
async function cartAddExpense(){
  const l=zdVal("cart-el"),a=parseFloat(zdVal("cart-ea"))||0;
  if(!l||a<=0){showToast(t("carts_exp_req"),"error");return;}
  try{await api("POST","/carts/expenses",{day:_cart.day,label:l,amount:a});await cartLoad();}catch(e){showToast(e.message,"error");}
}
async function cartDelExpense(id){try{await api("DELETE",`/carts/expenses/${id}`);await cartLoad();}catch(e){showToast(e.message,"error");}}

// ── Administration : preuves de virement, modules, paiements bloqués ──
let _wiresAll=false;
async function loadPendingWires(){
  const box=document.getElementById("pending-wires-list");if(!box)return;
  try{
    const wires=await api("GET","/admin/pending-wires"+(_wiresAll?"?all=true":""));
    const tog=`<label style="display:flex;gap:6px;align-items:center;font-size:12px;color:var(--muted);margin-bottom:8px"><input type="checkbox" ${_wiresAll?"checked":""} onchange="_wiresAll=this.checked;loadPendingWires()"> Afficher aussi les commandes sans preuve</label>`;
    if(!wires.length){box.innerHTML=tog+`<div style="color:var(--muted);font-size:13px">${t("no_pending_wires")}</div>`;return;}
    box.innerHTML=tog+wires.map(w=>`<div class="wire-row">
      <div style="min-width:0"><div style="font-weight:700;font-size:13px">${esc(w.tenant_name)} <span style="color:var(--muted);font-weight:400">— ${esc(w.tenant_email)}</span></div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:2px">${w.selection_label?`<span class="badge bb">${esc(w.selection_label)}</span> `:""}${esc(w.billing_label||"")} · $${(+w.amount_usd).toFixed(2)} · ${esc(w.reference)}</div>
        <div style="font-size:12px;margin-top:4px">${w.proof?`<span class="badge bg">Preuve reçue ${fmtDate(w.proof_at)}</span> N° transaction : <b>${esc(w.client_txn||"—")}</b> · <a href="#" onclick="event.preventDefault();adminOpenProof('${esc(w.reference)}')">Voir la preuve</a>`:`<span class="badge ba">Sans preuve · expire ${fmtDate(w.expires_at)}</span>`}${w.tenant_rejects?` <span class="badge br">${w.tenant_rejects} refus</span>`:""}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-g btn-sm" onclick="confirmPendingWire('${esc(w.reference)}')"><i class="ti ti-check"></i> ${t("btn_unlock")}</button><button class="btn btn-o btn-sm" onclick="adminRejectWire('${esc(w.reference)}')"><i class="ti ti-x"></i> Refuser</button></div></div>`).join("");
  }catch(e){box.innerHTML=`<div style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;}
}
async function adminOpenProof(ref){
  try{const r=await api("GET",`/admin/wires/${encodeURIComponent(ref)}/proof`);window.open(r.url,"_blank","noopener");}catch(e){showToast(e.message,"error");}
}
async function adminRejectWire(ref){
  const reason=prompt("Motif du refus (le client le verra) :","Virement introuvable sur le relevé bancaire");if(reason===null)return;
  if(reason.trim().length<3){showToast("Motif trop court","error");return;}
  try{const r=await api("POST",`/admin/wires/${encodeURIComponent(ref)}/reject`,{reason:reason.trim()});showToast(r.payments_blocked?"Refusé · paiements du compte bloqués":"Virement refusé");loadPendingWires();}catch(e){showToast(e.message,"error");}
}
if(typeof abAdminRender==="function"){
  const _abAdminRender92=abAdminRender;
  abAdminRender=function(){
    _abAdminRender92();
    const o=_abAdm;const m=document.querySelector("#modal-ab-admin .modal-footer");if(!m||!o)return;
    const box=document.createElement("div");box.className="card2";box.style.marginTop="10px";
    box.innerHTML=`<div style="font-weight:700;margin-bottom:6px">Modules spéciaux</div>
      ${Object.entries(o.special_modules||{}).map(([k,l])=>`<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin-bottom:4px"><input type="checkbox" id="abm-mod-${k}" ${(o.modules||{})[k]?"checked":""} onchange="abAdminModule('${k}',this.checked)"> ${esc(l)} <span style="color:var(--muted);font-size:11px">(hors secteurs, visible seulement sur ce compte)</span></label>`).join("")}
      <div style="font-weight:700;margin:10px 0 6px">Paiements</div>
      <div style="font-size:13px">${o.payments_blocked?`<span class="badge br">Bloqués</span> après ${o.wire_rejects} preuve(s) refusée(s) <button class="btn btn-o btn-sm" onclick="abAdminPayments(false)">Débloquer</button>`:`<span class="badge bg">Autorisés</span> · preuves refusées : ${o.wire_rejects||0} <button class="btn btn-o btn-sm" onclick="abAdminPayments(true)">Bloquer</button>`}</div>`;
    m.before(box);
  };
}
async function abAdminModule(k,on){
  try{await api("PUT",`/admin/users/${_abAdm.uid}/modules`,{modules:{[k]:on}});showToast(on?"Module activé ✓":"Module désactivé");_abAdm={...(await api("GET",`/admin/users/${_abAdm.uid}/offer`)),uid:_abAdm.uid};}catch(e){showToast(e.message,"error");}
}
async function abAdminPayments(block){
  try{await api("PATCH",`/admin/users/${_abAdm.uid}/payments`,{blocked:block});_abAdm={...(await api("GET",`/admin/users/${_abAdm.uid}/offer`)),uid:_abAdm.uid};abAdminRender();}catch(e){showToast(e.message,"error");}
}
