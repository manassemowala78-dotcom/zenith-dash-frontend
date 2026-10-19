// ── 9.3 · BAR : FICHE DE COMPTE, PRODUITS ET PRIX, VENTE RAPIDE ──
const _bs={items:[],sheet:null,set:null,sel:null,q:0,start:null,end:null,preset:"today",np:{lot:12}};
function bsMgr(){return !(typeof isTeamMember==="function"&&isTeamMember())||zdIsMgrRole();}
function bsMoney(v){const c=_bs.set?.currency||"CDF";const n=Math.round((+v||0)*100)/100;return n.toLocaleString("fr-FR",{maximumFractionDigits:c==="CDF"?0:2}).replace(/[\u00a0\u202f ]/g,"\u00a0")+"\u00a0"+(c==="CDF"?"FC":c);}
function bsAmt(v){const c=_bs.set?.currency||"CDF";return (Math.round((+v||0)*100)/100).toLocaleString("fr-FR",{maximumFractionDigits:c==="CDF"?0:2}).replace(/[\u00a0\u202f ]/g,"\u00a0");}
function bsMinus(v){return v>0?"−"+bsMoney(v):bsMoney(0);}
function bsN(v){return (Math.round((+v||0)*1000)/1000).toLocaleString("fr-FR").replace(/[\u00a0\u202f ]/g,"\u00a0");}
function bsDay(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function bsPreset(p){
  const today=_bs.set?.today||bsDay(new Date());const d=new Date(today+"T12:00:00");
  _bs.preset=p;_bs.end=today;
  if(p==="week"){d.setDate(d.getDate()-6);_bs.start=bsDay(d);}
  else if(p==="month"){_bs.start=today.slice(0,8)+"01";}
  else _bs.start=today;
}
SECTOR_PAGE_LOADERS.barsheet=async el=>{
  if(!_bs.set){_bs.set=await api("GET","/bar/sheet/settings");}
  if(!_bs.start)bsPreset("today");
  await bsLoad(el);
};
async function bsLoad(el){
  el=el||document.getElementById("page-barsheet");if(!el)return;
  try{
    const [items,sheet,set]=await Promise.all([api("GET","/bar/sheet/items"),api("GET",`/bar/sheet?start=${_bs.start}&end=${_bs.end}`),api("GET","/bar/sheet/settings")]);
    _bs.items=items;_bs.sheet=sheet;_bs.set=set;
    if(!_bs.items.find(i=>i.id===_bs.sel)){_bs.sel=_bs.items[0]?.id||null;_bs.q=0;}
    bsRender(el);
  }catch(e){el.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;}
}
function bsRender(el){
  el=el||document.getElementById("page-barsheet");if(!el)return;
  const mgr=bsMgr(),S=_bs.sheet;
  el.innerHTML=sectorPageHead(`<i class="ti ti-table"></i> ${esc(t("bs_title"))}`,esc(t("bs_sub")))+
    `<div class="bs-ex">${esc(t("bs_example"))}</div>`+
    bsProductsHtml(mgr)+
    `<div class="bs-sale"><div class="card bs-sale-l" id="bs-sale"></div><div class="card bs-sale-r" id="bs-today"></div></div>`+
    bsEntryHtml(mgr)+
    `<div class="card bs-sheet"><div class="bs-per"><b>${esc(t("bs_sheet_t"))}</b>
      <div class="bs-chips">${[["today","bs_p_today"],["week","bs_p_week"],["month","bs_p_month"]].map(([k,l])=>`<button type="button" class="${_bs.preset===k?"on":""}" onclick="bsPreset('${k}');bsLoad()">${esc(t(l))}</button>`).join("")}</div>
      <div class="bs-dates"><input class="inp" type="date" id="bs-start" value="${S.start}" max="${S.today}" onchange="bsSetPeriod()" aria-label="${esc(t("bs_from"))}"><span>→</span><input class="inp" type="date" id="bs-end" value="${S.end}" max="${S.today}" onchange="bsSetPeriod()" aria-label="${esc(t("bs_to"))}"></div></div>
      <div id="bs-table"></div></div>`+
    `<div class="bs-notes"><div><b>${esc(t("bs_n_brut_t"))}</b><span>${esc(t("bs_n_brut"))}</span></div><div><b>${esc(t("bs_n_real_t"))}</b><span>${esc(t("bs_n_real"))}</span></div><div><b>${esc(t("bs_n_gap_t"))}</b><span>${esc(t("bs_n_gap"))}</span></div><div><b>${esc(t("bs_n_profit_t"))}</b><span>${esc(t("bs_n_profit"))}</span></div></div>`;
  bsRenderSale();bsRenderToday();bsRenderSheet();bsNpHint();
}
function bsProductsHtml(mgr){
  const it=_bs.items;
  const rows=it.map(i=>mgr?`<div class="bs-prow" data-id="${i.id}">
      <input class="inp bs-pn" value="${esc(i.name)}" aria-label="${esc(t("bs_product"))}" onchange="bsPatch('${i.id}',{name:this.value.trim()})">
      <label><span>${esc(t("bs_lot_units"))}</span><input class="inp" type="number" min="1" step="1" value="${i.lot_units}" onchange="bsPatch('${i.id}',{lot_units:Math.max(1,parseInt(this.value,10)||1)})"></label>
      <label><span>${esc(t("bs_lot_price"))}</span><input class="inp" type="number" min="0" step="any" value="${i.lot_price}" onchange="bsPatch('${i.id}',{lot_price:Math.max(0,parseFloat(this.value)||0)})"></label>
      <div class="bs-brut"><span>${esc(t("bs_brut"))}</span><b>${bsMoney(i.brut)}</b></div>
      <label><span>${esc(t("bs_sell"))}</span><input class="inp" type="number" min="0" step="any" value="${i.sell_price}" onchange="bsPatch('${i.id}',{sell_price:parseFloat(this.value)||0})"></label>
      <div class="bs-brut"><span>${esc(t("bs_margin"))}</span><b style="color:${i.margin>=0?"var(--green)":"var(--red)"}">${bsMoney(i.margin)}</b></div>
      <button class="btn btn-o btn-sm" onclick="bsArchive('${i.id}')" aria-label="${esc(t("bs_remove"))} ${esc(i.name)}" title="${esc(t("bs_remove"))}"><i class="ti ti-x"></i></button></div>`:
    `<div class="bs-prow ro"><b>${esc(i.name)}</b><span>${esc(abTr("bs_lot_line",{u:i.lot_units,p:bsMoney(i.lot_price)}))}</span><span>${esc(t("bs_brut"))} ${bsMoney(i.brut)}</span><span>${esc(t("bs_sell"))} <b>${bsMoney(i.sell_price)}</b></span></div>`).join("");
  return `<details class="card bs-prods" ${(_bs.prodOpen??!it.length)?"open":""} ontoggle="_bs.prodOpen=this.open"><summary><b>${esc(t("bs_prods_t"))}</b> <span class="badge bb">${it.length}</span><span class="bs-sum-x">${esc(t("bs_prods_x"))}</span></summary>
    ${mgr?`<div class="bs-form">
      <label>${esc(t("bs_product"))}<input class="inp" id="np-n" placeholder="${esc(t("bs_product_ph"))}" maxlength="120"></label>
      <label>${esc(t("bs_lot_units"))}<input class="inp" id="np-lot" type="number" min="1" step="1" value="${_bs.np.lot}" oninput="bsNpHint()"></label>
      <label>${esc(t("bs_lot_price"))} (${esc(bsCur())})<input class="inp" id="np-lp" type="number" min="0" step="any" placeholder="37000" oninput="bsNpHint()"></label>
      <label>${esc(t("bs_sell"))} (${esc(bsCur())})<input class="inp" id="np-pr" type="number" min="0" step="any" placeholder="4000" oninput="bsNpHint()"></label>
      <label>${esc(t("bs_stock_now"))}<input class="inp" id="np-st" type="number" min="0" step="1" value="0"></label>
      <button class="btn btn-g btn-sm" id="np-go" onclick="bsAddProduct()"><i class="ti ti-plus"></i> ${esc(t("bs_add_product"))}</button></div>
      <div class="bs-hint" id="np-h"></div>
      <div class="bs-cur"><label>${esc(t("carts_currency"))} <select class="inp" onchange="bsSetCurrency(this.value)">${(_bs.set?.currencies||["CDF"]).map(c=>`<option ${c===_bs.set?.currency?"selected":""}>${c}</option>`).join("")}</select></label></div>`:`<div class="bs-hint">${esc(t("bs_prods_ro"))}</div>`}
    <div class="bs-plist">${rows||`<div class="bs-hint">${esc(t("bs_no_products"))}</div>`}</div></details>`;
}
function bsCur(){const c=_bs.set?.currency||"CDF";return c==="CDF"?"FC":c;}
function bsNpHint(){
  const h=document.getElementById("np-h");if(!h)return;
  const lot=Math.max(1,parseInt(zdVal("np-lot"),10)||1),lp=parseFloat(zdVal("np-lp"))||0,pr=parseFloat(zdVal("np-pr"))||0;_bs.np.lot=lot;
  h.style.color="";h.textContent=lp?abTr(pr?"bs_np_hint2":"bs_np_hint1",{b:bsMoney(lp/lot),m:bsMoney(pr-lp/lot)}):"";
}
async function bsAddProduct(){
  const name=zdVal("np-n"),lot=Math.max(1,parseInt(zdVal("np-lot"),10)||1),lp=parseFloat(zdVal("np-lp"))||0,pr=parseFloat(zdVal("np-pr"))||0,st=Math.max(0,parseFloat(zdVal("np-st"))||0);
  const h=document.getElementById("np-h");
  if(!name||pr<=0){if(h){h.style.color="var(--red)";h.textContent=t("bs_np_need");}return;}
  try{const r=await api("POST","/bar/sheet/items",{name,lot_units:lot,lot_price:lp,sell_price:pr,stock:st});_bs.sel=r.id;_bs.q=0;showToast(abTr("bs_np_ok",{n:r.name,b:bsMoney(r.brut)}));await bsLoad();}
  catch(e){if(h){h.style.color="var(--red)";h.textContent=e.message;}else showToast(e.message,"error");}
}
async function bsPatch(id,body){
  if(body.name==="")return bsLoad();
  if(body.sell_price!==undefined&&!(body.sell_price>0)){showToast(t("bs_np_need"),"error");return bsLoad();}
  try{await api("PATCH",`/bar/sheet/items/${id}`,body);showToast(t("toast_saved"));await bsLoad();}catch(e){showToast(e.message,"error");await bsLoad();}
}
async function bsArchive(id){
  const i=_bs.items.find(x=>x.id===id);if(!i||!confirm(abTr("bs_remove_confirm",{n:i.name})))return;
  try{await api("PATCH",`/bar/sheet/items/${id}`,{active:false});await bsLoad();}catch(e){showToast(e.message,"error");}
}
async function bsSetCurrency(c){try{_bs.set=await api("PUT","/bar/sheet/settings",{currency:c});await bsLoad();}catch(e){showToast(e.message,"error");}}

function bsRenderSale(){
  const box=document.getElementById("bs-sale");if(!box)return;
  const it=_bs.items,cur=it.find(i=>i.id===_bs.sel);
  if(!it.length){box.innerHTML=`<b>${esc(t("bs_quick"))}</b><div class="bs-hint" style="margin-top:8px">${esc(t("bs_quick_empty"))}</div>`;return;}
  const sold=id=>(_bs.sheet?.today_sales?.items||[]).find(x=>x.item_id===id)?.qty||0;
  box.innerHTML=`<b>${esc(t("bs_quick"))}</b>
    <div class="bs-prods-btn">${it.map(i=>`<button type="button" aria-pressed="${i.id===_bs.sel}" onclick="bsPick('${i.id}')">${esc(i.name)}<small>${bsMoney(i.sell_price)} · ${esc(abTr("bs_sold_today",{n:bsN(sold(i.id))}))}</small></button>`).join("")}</div>
    ${cur?`<div class="bs-selline"><b>${esc(cur.name)}</b> · ${esc(abTr("bs_already",{n:bsN(sold(cur.id))}))} · ${esc(abTr("bs_in_stock",{n:bsN(cur.stock)}))}</div>`:""}
    <div class="bs-ql">${esc(t("bs_qty_label"))}</div>
    <div class="bs-qty"><button type="button" id="bs-minus" onclick="bsStep(-1)" ${_bs.q<=0?"disabled":""} aria-label="${esc(t("bs_less"))}">−</button><output id="bs-q">${_bs.q}</output><button type="button" id="bs-plus" onclick="bsStep(1)" aria-label="${esc(t("bs_more"))}">+</button><span class="bs-qt">= ${bsMoney(_bs.q*(cur?.sell_price||0))}</span></div>
    <button type="button" class="btn btn-g bs-go" id="bs-go" onclick="bsSell()" ${_bs.q>0&&cur?"":"disabled"}><i class="ti ti-check"></i> ${esc(t(_bs.q>0?"bs_record":"bs_pick_qty"))}</button>`;
}
function bsPick(id){_bs.sel=id;_bs.q=0;bsRenderSale();}
function bsStep(n){_bs.q=Math.max(0,Math.min(1000,_bs.q+n));bsRenderSale();}
async function bsSell(){
  if(!_bs.q||!_bs.sel)return;
  const btn=document.getElementById("bs-go");if(btn)btn.disabled=true;
  const q=_bs.q,i=_bs.items.find(x=>x.id===_bs.sel);
  try{const r=await api("POST","/bar/sheet/sales",{item_id:_bs.sel,qty:q});_bs.q=0;showToast(abTr("bs_sale_ok",{q,n:i?.name||"",a:bsMoney(r.amount)}));await bsLoad();}
  catch(e){showToast(e.message,"error");bsRenderSale();}
}
function bsRenderToday(){
  const box=document.getElementById("bs-today");if(!box)return;
  const d=_bs.sheet?.today_sales||{items:[],log:[],amount:0,qty:0},mgr=bsMgr();
  box.innerHTML=`<b>${esc(t("bs_today_t"))}</b>
    <div class="bs-tot">${d.items.length?d.items.map(x=>`<span>${esc(x.name)} : <b>${bsN(x.qty)}</b></span>`).join("")+`<span class="t">${esc(t("carts_total"))} : <b>${bsMoney(d.amount)}</b></span>`:`<span>${esc(t("bs_no_sale"))}</span>`}</div>
    <div class="bs-log">${d.log.map(x=>`<div class="${x.voided?"void":""}"><span class="mono">${esc(x.time)}</span><b>${bsN(x.qty)} × ${esc(x.name)}</b><span class="mono">${bsMoney(x.amount)}</span>${mgr&&!x.voided?`<button class="btn btn-o btn-sm" onclick="bsVoid('${x.id}')" aria-label="${esc(t("bs_void"))}" title="${esc(t("bs_void"))}"><i class="ti ti-arrow-back-up"></i></button>`:x.voided?`<span class="badge br">${esc(t("bs_voided"))}</span>`:"<span></span>"}</div>`).join("")}</div>`;
}
async function bsVoid(id){
  if(!confirm(t("bs_void_confirm")))return;
  try{await api("POST",`/bar/sheet/sales/${id}/void`);await bsLoad();}catch(e){showToast(e.message,"error");}
}
function bsEntryHtml(mgr){
  if(!_bs.items.length)return "";
  const sel=_bs.items.find(i=>i.id===_bs.entrySel)||_bs.items[0];
  return `<div class="card bs-entry"><b>${esc(t("bs_entry_t"))}</b><div style="font-size:12px;color:var(--muted);margin:2px 0 8px">${esc(t("bs_entry_x"))}</div>
    <div class="bs-form">
      <label>${esc(t("bs_product"))}<select class="inp" id="be-item" onchange="bsEntryPick(this.value)">${_bs.items.map(i=>`<option value="${i.id}" ${i.id===sel.id?"selected":""}>${esc(i.name)}</option>`).join("")}</select></label>
      <label>${esc(t("zd_qty"))}<input class="inp" id="be-qty" type="number" min="0" step="any" value="1" oninput="bsEntryHint()"></label>
      <label>${esc(t("bs_unit"))}<select class="inp" id="be-unit" onchange="bsEntryHint()"><option value="lot">${esc(abTr("bs_unit_lot",{n:sel.lot_units}))}</option><option value="unit">${esc(t("bs_unit_unit"))}</option></select></label>
      ${mgr?`<label>${esc(t("bs_lot_price_paid"))} (${esc(bsCur())})<input class="inp" id="be-lp" type="number" min="0" step="any" value="${sel.lot_price}" oninput="bsEntryHint()"></label>`:""}
      <button class="btn btn-o btn-sm" onclick="bsEntry()"><i class="ti ti-truck-delivery"></i> ${esc(t("bs_entry_go"))}</button></div>
    <div class="bs-hint" id="be-h"></div></div>`;
}
function bsEntryPick(id){
  _bs.entrySel=id;const i=_bs.items.find(x=>x.id===id);if(!i)return;
  const u=document.getElementById("be-unit");if(u&&u.options[0])u.options[0].textContent=abTr("bs_unit_lot",{n:i.lot_units});
  const lp=document.getElementById("be-lp");if(lp)lp.value=i.lot_price;bsEntryHint();
}
function bsEntryHint(){
  const h=document.getElementById("be-h");if(!h)return;const i=_bs.items.find(x=>x.id===zdVal("be-item"));if(!i)return;
  const q=parseFloat(zdVal("be-qty"))||0,u=zdVal("be-unit")==="lot"?q*i.lot_units:q,lp=document.getElementById("be-lp")?(parseFloat(zdVal("be-lp"))||0):i.lot_price;
  h.textContent=q>0?abTr("bs_entry_hint",{n:bsN(u),b:bsMoney(lp/i.lot_units)}):"";
}
async function bsEntry(){
  const id=zdVal("be-item"),q=parseFloat(zdVal("be-qty"))||0;if(!id||q<=0){showToast(t("bs_entry_need"),"error");return;}
  const body={item_id:id,qty:q,unit:zdVal("be-unit")};if(document.getElementById("be-lp"))body.lot_price=Math.max(0,parseFloat(zdVal("be-lp"))||0);
  try{const r=await api("POST","/bar/sheet/entries",body);_bs.entrySel=id;showToast(abTr("bs_entry_ok",{n:bsN(r.units),p:r.item.name}));await bsLoad();}catch(e){showToast(e.message,"error");}
}
function bsSetPeriod(){
  const a=zdVal("bs-start"),b=zdVal("bs-end");if(!/^\d{4}-\d{2}-\d{2}$/.test(a)||!/^\d{4}-\d{2}-\d{2}$/.test(b))return;
  if(b<a){showToast(t("bs_period_bad"),"error");return;}
  _bs.start=a;_bs.end=b;_bs.preset="custom";bsLoad();
}
function bsRenderSheet(){
  const box=document.getElementById("bs-table");if(!box)return;
  const S=_bs.sheet,T=S.totals,live=S.end===S.today;
  if(!S.items.length){box.innerHTML=`<div class="bs-hint">${esc(t("bs_no_products"))}</div>`;return;}
  const gap=v=>`<span class="${v<0?"bs-neg":v>0?"bs-pos":"bs-mut"}">${v>0?"+":""}${bsN(v)}</span>`;
  const cnt=r=>live&&r.active?`<input class="inp bs-cnt" type="number" min="0" step="any" data-id="${r.id}" placeholder="${bsN(r.stock_now)}" ${r.counted!=null&&r.count_day===S.today?`value="${r.counted}"`:""} aria-label="${esc(t("bs_counted"))} ${esc(r.name)}">`:(r.counted!=null?bsN(r.counted):"—");
  box.innerHTML=`<div class="bs-period">${esc(abTr("bs_period",{a:abDate(S.start),b:abDate(S.end)}))} · ${esc(abTr("bs_amounts_in",{c:bsCur()}))}${live?` · <span class="badge bg">${esc(t("bs_live"))}</span>`:""}</div>
    <div class="tbl-wrap bs-twrap"><table class="bs-t"><thead><tr><th>${esc(t("bs_product"))}</th><th>${esc(t("bs_c_lot"))}</th><th>${esc(t("bs_brut"))}<br><small>${esc(t("bs_per_unit"))}</small></th><th>${esc(t("bs_real"))}<br><small>${esc(t("bs_per_unit_sell"))}</small></th><th>${esc(t("bs_c_deb"))}</th><th>${esc(t("bs_c_ent"))}</th><th>${esc(t("bs_c_ven"))}</th><th>${esc(t("bs_c_reste"))}<br><small>${esc(t("bs_computed"))}</small></th><th>${esc(t("bs_counted"))}</th><th>${esc(t("bs_c_gap"))}</th><th>${esc(t("bs_c_ca"))}</th><th>${esc(t("bs_c_cost"))}</th><th>${esc(t("bs_c_profit"))}</th></tr></thead><tbody>
    ${S.items.map(r=>`<tr${r.active?"":` class="bs-off"`}><td><b>${esc(r.name)}</b>${r.active?"":` <small>(${esc(t("bs_removed"))})</small>`}</td><td class="bs-lot">${r.lot_units} u.<small>${bsAmt(r.lot_price)}</small></td><td class="mono">${bsAmt(r.brut)}</td><td class="mono">${bsAmt(r.sell_price)}</td><td>${bsN(r.deb)}</td><td>${bsN(r.ent)}</td><td>${bsN(r.ven)}${r.today_sold&&S.end===S.today&&S.start!==S.end?`<small class="bs-add">${esc(abTr("bs_of_today",{n:bsN(r.today_sold)}))}</small>`:""}</td><td><b>${bsN(r.reste)}</b></td><td>${cnt(r)}</td><td>${r.counted!=null||r.ecart?gap(r.ecart):"—"}</td><td class="mono">${bsAmt(r.ca)}</td><td class="mono">${bsAmt(r.cout)}</td><td class="mono ${r.ben>=0?"bs-pos":"bs-neg"}">${bsAmt(r.ben)}</td></tr>`).join("")}
    </tbody><tfoot><tr><td colspan="10">${esc(t("bs_total_period"))} · ${esc(t("bs_missing"))} : <span class="${T.perte>0?"bs-neg":"bs-mut"}">${bsMinus(T.perte)}</span> · ${esc(t("bs_after_missing"))} : <b class="${T.net>=0?"bs-pos":"bs-neg"}">${bsMoney(T.net)}</b></td><td class="mono">${bsAmt(T.ca)}</td><td class="mono">${bsAmt(T.cout)}</td><td class="mono bs-pos">${bsAmt(T.ben)}</td></tr></tfoot></table></div>
    <div class="bs-cards">${S.items.map(r=>`<div class="bs-card${r.active?"":" bs-off"}"><h4>${esc(r.name)}</h4>
      <div class="bs-row"><span>${esc(t("bs_c_lot"))}</span><span>${esc(abTr("bs_lot_line",{u:r.lot_units,p:bsMoney(r.lot_price)}))}</span></div>
      <div class="bs-row"><span>${esc(t("bs_brut"))} ${esc(t("bs_per_unit"))}</span><span>${bsMoney(r.brut)}</span></div>
      <div class="bs-row"><span>${esc(t("bs_real"))} ${esc(t("bs_per_unit"))}</span><span>${bsMoney(r.sell_price)}</span></div>
      <div class="bs-row"><span>${esc(t("bs_formula"))}</span><span>${bsN(r.deb)} + ${bsN(r.ent)} − ${bsN(r.ven)} = <b>${bsN(r.reste)}</b></span></div>
      <div class="bs-row"><span>${esc(t("bs_counted"))} / ${esc(t("bs_c_gap"))}</span><span>${live&&r.active?cnt(r).replace('class="inp bs-cnt"','class="inp bs-cnt bs-cnt-m"'):(r.counted!=null?bsN(r.counted):"—")} · ${r.counted!=null||r.ecart?gap(r.ecart):"—"}</span></div>
      <div class="bs-row"><span>${esc(t("bs_c_ca"))} − ${esc(t("bs_c_cost"))}</span><span>${bsMoney(r.ca)} − ${bsMoney(r.cout)}</span></div>
      <div class="bs-big"><span>${esc(t("bs_c_profit"))}</span><b class="${r.ben>=0?"bs-pos":"bs-neg"}">${bsMoney(r.ben)}</b></div></div>`).join("")}
      <div class="bs-card"><div class="bs-big" style="border:0;padding:0;margin:0"><span>${esc(t("bs_total_profit"))}</span><b class="bs-pos">${bsMoney(T.ben)}</b></div><div class="bs-row"><span>${esc(t("bs_missing"))}</span><span class="${T.perte>0?"bs-neg":"bs-mut"}">${bsMinus(T.perte)}</span></div><div class="bs-row"><span>${esc(t("bs_after_missing"))}</span><b>${bsMoney(T.net)}</b></div></div></div>
    ${live?`<div class="bs-countbar"><span>${esc(t("bs_count_x"))}</span><button class="btn btn-g btn-sm" onclick="bsCount()"><i class="ti ti-clipboard-check"></i> ${esc(t("bs_count_go"))}</button></div>`:""}`;
}
async function bsCount(){
  const mobile=window.matchMedia("(max-width:860px)").matches;
  const seen=new Set(),counts=[];
  document.querySelectorAll(mobile?".bs-cards .bs-cnt":".bs-t .bs-cnt").forEach(i=>{const v=i.value.trim();if(v===""||seen.has(i.dataset.id))return;seen.add(i.dataset.id);counts.push({item_id:i.dataset.id,counted:Math.max(0,parseFloat(v.replace(",","."))||0)});});
  if(!counts.length){showToast(t("bs_count_none"),"error");return;}
  if(!confirm(abTr("bs_count_confirm",{n:counts.length})))return;
  try{const r=await api("POST","/bar/sheet/counts",{counts});showToast(r.loss>0?abTr("bs_count_loss",{a:bsMoney(r.loss)}):t("bs_count_ok"),r.loss>0?"error":undefined);await bsLoad();}catch(e){showToast(e.message,"error");}
}
