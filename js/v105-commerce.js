// ── 10.5.0 · Salon (file d'attente, rappels, bons et crédit à l'encaissement), Commerce et Pharmacie ──
const V5_Q_COL={waiting:"var(--blue)",called:"var(--amber)",served:"var(--green)",left:"var(--muted)"};
SECTOR_PAGE_LOADERS.beautyqueue=async el=>{
  const r=await api("GET","/beauty/queue");const mgr=v5Mgr();_v5.q=r;
  el.innerHTML=v5Head(t("nav_v5_queue"),t("v5_queue_x").replace("{n}",r.waiting).replace("{m}",r.avg_min),`<button class="btn btn-g btn-sm" onclick="v5QueueAdd()"><i class="ti ti-user-plus"></i> ${esc(t("v5_walkin"))}</button>`+(mgr?`<button class="btn btn-o btn-sm" onclick="v5QueueCfg()"><i class="ti ti-settings"></i></button>`:""))+
    `<div class="card" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${r.on?`<div style="width:90px;flex:none">${v5QrSvg(r.public_url,3)}</div>`:""}<div style="flex:1;min-width:200px">
      <b>${esc(t(r.on?"v5_queue_on":"v5_queue_off"))}</b><div style="font-size:12px;color:var(--muted);word-break:break-all">${esc(r.public_url)}</div>
      ${r.on?`<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn btn-o btn-sm" onclick="navigator.clipboard.writeText('${escJs(r.public_url)}').then(()=>showToast(t('ga_copied')))"><i class="ti ti-copy"></i> ${esc(t("v5_copy_link"))}</button><button class="btn btn-o btn-sm" onclick="v5QueuePoster()"><i class="ti ti-printer"></i> ${esc(t("v5_poster"))}</button></div>`:""}</div></div>`+
    (r.rows.length?`<div class="v5-list" style="margin-top:12px">${r.rows.map(q=>`<div class="card v5-q" style="border-left:4px solid ${V5_Q_COL[q.status]}"><span class="v5-qn">${q.num}</span><span style="flex:1;min-width:0"><b>${esc(q.name)}</b>${q.service?` <small style="color:var(--muted)">· ${esc(q.service)}</small>`:""}
        <div style="font-size:12px;color:var(--muted)">${esc(t("v5_qs_"+q.status))}${q.source==="online"?` · ${esc(t("v5_online"))}`:""}${q.ahead!=null?` · ${esc(t("v5_wait_min").replace("{m}",q.wait_min))}`:""}${q.staff?` · ${esc(q.staff)}`:""}</div></span>
        <span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${q.status==="waiting"?`<button class="btn btn-a btn-sm" onclick="v5QueueSt('${q.id}','called')"><i class="ti ti-bell"></i> ${esc(t("v5_call"))}</button>`:""}
          ${["waiting","called"].includes(q.status)?`<button class="btn btn-g btn-sm" onclick="v5QueueSt('${q.id}','served')"><i class="ti ti-check"></i></button><button class="btn btn-o btn-sm" aria-label="${esc(t("v5_qs_left"))}" onclick="v5QueueSt('${q.id}','left')"><i class="ti ti-door-exit"></i></button>`:""}</span></div>`).join("")}</div>`:v5Empty("v5_queue_none","list-numbers"));
  sectorTimer("beautyqueue",()=>{if(!document.querySelector(".modal-overlay[style*='flex']"))SECTOR_PAGE_LOADERS.beautyqueue(el);},20000);
};
async function v5QueueSt(id,s){const r=await v5Do(()=>api("POST",`/beauty/queue/${id}/status`,{status:s}));if(!r)return;if(r.wa&&s==="called")window.open(r.wa,"_blank","noopener");navigate("beautyqueue");}
function v5QueueAdd(){
  zdModal("modal-v5-qa",`<div class="modal-title"><i class="ti ti-user-plus" style="color:var(--green)"></i> ${esc(t("v5_walkin"))}</div>
    <div class="fgrp"><label class="fl" for="v5-qa-n">${esc(t("v5_name"))} *</label><input class="inp" id="v5-qa-n" maxlength="160"></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-qa-p">${esc(t("v5_phone"))}</label><input class="inp" id="v5-qa-p" type="tel" maxlength="50"></div><div class="fgrp"><label class="fl" for="v5-qa-s">${esc(t("v5_service"))}</label><input class="inp" id="v5-qa-s" maxlength="160"></div></div>
    <div class="err-box" id="v5-qa-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-qa')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5QueueAddGo()"><i class="ti ti-check"></i> ${esc(t("v5_give_ticket"))}</button></div>`,420);
}
async function v5QueueAddGo(){const n=zdVal("v5-qa-n");if(n.length<2){v5Err("v5-qa-err",t("v5_name"));return;}
  const r=await v5Do(()=>api("POST","/beauty/queue",{name:n,phone:zdVal("v5-qa-p")||null,service:zdVal("v5-qa-s")||null}),null,"v5-qa-err");if(r){showToast(t("v5_ticket_n").replace("{n}",r.num));zdCloseModal("modal-v5-qa");navigate("beautyqueue");}}
function v5QueueCfg(){const r=_v5.q;
  zdModal("modal-v5-qc",`<div class="modal-title"><i class="ti ti-settings" style="color:var(--green)"></i> ${esc(t("nav_v5_queue"))}</div>
    <label class="terms-check"><input type="checkbox" id="v5-qc-on" ${r.on?"checked":""}><span>${esc(t("v5_queue_online"))}</span></label>
    <div class="fgrp"><label class="fl" for="v5-qc-m">${esc(t("v5_avg_service"))}</label><input class="inp" id="v5-qc-m" type="number" min="5" max="180" value="${r.avg_min}"></div>
    <div class="err-box" id="v5-qc-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-qc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5QueueCfgSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button></div>`,400);}
async function v5QueueCfgSave(){if(await v5Do(()=>api("PUT","/beauty/queue/settings",{on:document.getElementById("v5-qc-on").checked,avg_min:parseInt(zdVal("v5-qc-m"))||20}),t("v5_saved"),"v5-qc-err")){zdCloseModal("modal-v5-qc");navigate("beautyqueue");}}
function v5QueuePoster(){const r=_v5.q;const co=State.tenant?.company_name||State.tenant?.name||"";
  v5Print(t("v5_poster"),`<div style="text-align:center;padding:30px"><div style="font-size:26px;font-weight:800">${esc(co)}</div><div style="font-size:18px;margin:10px 0">${esc(t("v5_poster_x"))}</div><div style="width:260px;margin:20px auto">${v5QrSvg(r.public_url,8)}</div><div style="font-size:12px">${esc(r.public_url)}</div></div>`);}

// ── Rappels de rendez-vous ──
SECTOR_PAGE_LOADERS.beautyreminders=async el=>{
  const r=await api("GET","/beauty/reminders");const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_reminders"),t("v5_rem_x"),"","beautytools")+
    `<div class="card"><label class="terms-check"><input type="checkbox" id="v5-rm-on" ${r.reminders_on?"checked":""} ${mgr?"":"disabled"}><span><b>${esc(t("v5_rem_on"))}</b></span></label>
      <div class="fgrp"><label class="fl" for="v5-rm-h">${esc(t("v5_rem_hours"))}</label><select class="inp" id="v5-rm-h" ${mgr?"":"disabled"}>${[2,3,6,12,24,48,72].map(h=>`<option value="${h}"${r.reminder_hours===h?" selected":""}>${esc(t("v5_hours_before").replace("{h}",h))}</option>`).join("")}</select></div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px"><i class="ti ti-info-circle"></i> ${esc(t(r.sms?"v5_rem_sms":r.email?"v5_rem_email":"v5_rem_wa"))}</div>
      <div class="err-box" id="v5-rm-err"></div><div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="btn btn-o btn-sm" onclick="v5RemRun()"><i class="ti ti-refresh"></i> ${esc(t("v5_rem_run"))}</button>${mgr?`<button class="btn btn-g btn-sm" onclick="v5RemSave()"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button>`:""}</div></div>
    <div style="margin-top:12px" id="v5-rm-out"></div>`;
  document.getElementById("v5-rm-out").innerHTML=await v5OutboxHtml("beauty");
};
async function v5RemSave(){if(await v5Do(()=>api("PUT","/beauty/reminders",{reminders_on:document.getElementById("v5-rm-on").checked,reminder_hours:parseInt(zdVal("v5-rm-h"))||24}),t("v5_saved"),"v5-rm-err"))navigate("beautyreminders");}
async function v5RemRun(){const r=await v5Do(()=>api("POST","/beauty/reminders/run"));if(r){showToast(t("v5_rem_prepared").replace("{n}",r.prepared));navigate("beautyreminders");}}

// ── Encaissement au salon : bon de fidélité et vente à crédit ──
if(typeof btRenderCheckout==="function"){
  const _v5BtR=btRenderCheckout;
  btRenderCheckout=function(a){
    _v5BtR(a);a=a||_bt.agenda.appointments.find(x=>x.id===_bt.co.id);const co=_bt.co;
    const sel=document.getElementById("bt-co-m");if(sel&&a?.client_id&&!sel.querySelector('option[value="account"]'))sel.insertAdjacentHTML("beforeend",`<option value="account"${co.method==="account"?" selected":""}>${esc(t("v5_on_credit"))}</option>`);
    const err=document.getElementById("bt-co-err");if(!err||!a?.client_id)return;
    const box=document.createElement("div");box.id="v5-bt-perks";err.before(box);
    v5Perks(a.client_id).then(p=>{const b=document.getElementById("v5-bt-perks");if(b&&p)b.innerHTML=v5PerksHtml(p,{onVoucher:"v5BtVoucher",applied:co.voucher});});
    if(co.voucher)_v5Voucher={rx:/^\/beauty\/appointments\/[^/]+\/checkout$/,code:co.voucher.code};
    btCoTotal();
  };
  const _v5BtT=btCoTotal;
  btCoTotal=function(){_v5BtT();const co=_bt.co;if(!co?.voucher)return;const el=document.getElementById("bt-co-total");if(!el)return;
    const total=Math.max(0,co.services.reduce((s,x)=>s+(x.package_id?0:(+x.price||0)),0)+co.products.reduce((s,p)=>s+p.qty*p.price,0)+(zdNum("bt-co-tip")||0)-(zdNum("bt-co-disc")||0)-co.voucher.value);el.textContent=zdMoney(total);};
}
function v5BtVoucher(code,value){_bt.co.voucher={code,value};btRenderCheckout();}

// ── Commerce : bon de fidélité et crédit au comptoir ──
if(typeof rtTotals==="function"){
  const _v5RtT=rtTotals;
  rtTotals=function(){
    _v5RtT();const box=document.getElementById("rt-totals");if(!box)return;
    if(!_rt.client){_rt.voucher=null;return;}
    let pk=document.getElementById("v5-rt-perks");if(!pk){pk=document.createElement("div");pk.id="v5-rt-perks";box.after(pk);}
    if(_rt.voucher){_v5Voucher={rx:/^\/retail\/sales$/,code:_rt.voucher.code};box.insertAdjacentHTML("beforeend",`<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--green)"><span>${esc(t("v5_voucher"))} ${esc(_rt.voucher.code)}</span><span class="mono">−${zdMoney(_rt.voucher.value)}</span></div>`);}
    if(pk.dataset.cid!==_rt.client||pk.dataset.v!==String(_rt.voucher?.code||"")){pk.dataset.cid=_rt.client;pk.dataset.v=String(_rt.voucher?.code||"");v5Perks(_rt.client).then(p=>{if(p)pk.innerHTML=v5PerksHtml(p,{onVoucher:"v5RtVoucher",applied:_rt.voucher});});}
  };
}
function v5RtVoucher(code,value){_rt.voucher={code,value};rtTotals();}

// ── Inventaire tournant ──
SECTOR_PAGE_LOADERS.retailcounts=async el=>{
  const rows=await api("GET","/retail/counts");_v5.counts=rows;
  el.innerHTML=v5Head(t("v5_t_counts"),t("v5_counts_x"),`<button class="btn btn-g btn-sm" onclick="v5CountNew()"><i class="ti ti-plus"></i> ${esc(t("v5_count_new"))}</button>`,"retailtools")+
    (rows.length?`<div class="v5-list">${rows.map(c=>`<button class="card v5-ev" onclick="v5CountOpen('${c.id}')"><span style="display:flex;justify-content:space-between;gap:8px;width:100%"><b class="mono">${esc(c.number)}</b>${v5Badge(t("v5_cs2_"+c.status),c.status==="open"?"ba":"bg")}</span>
      <small>${esc(c.scope||"")} · ${esc(fmtDate(c.created_at))} · ${esc(c.by||"")}</small><span style="font-size:12px">${esc(t("v5_counted_n").replace("{a}",c.counted).replace("{b}",c.total))}${c.diff_lines?` · ${esc(t("v5_gaps_n").replace("{n}",c.diff_lines))} · ${zdMoney(c.diff_value)}`:""}</span></button>`).join("")}</div>`:v5Empty("v5_counts_none","clipboard-check"));
};
function v5CountNew(){
  zdModal("modal-v5-cn",`<div class="modal-title"><i class="ti ti-clipboard-check" style="color:var(--green)"></i> ${esc(t("v5_count_new"))}</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:8px">${esc(t("v5_count_new_x"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-cn-s">${esc(t("v5_count_size"))}</label><input class="inp" id="v5-cn-s" type="number" min="1" max="500" value="20"></div>
      <div class="fgrp"><label class="fl" for="v5-cn-c">${esc(t("v5_or_category"))}</label><input class="inp" id="v5-cn-c" maxlength="80"></div></div>
    <div class="err-box" id="v5-cn-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-cn')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5CountNewGo()"><i class="ti ti-check"></i> ${esc(t("v5_start"))}</button></div>`,420);
}
async function v5CountNewGo(){const r=await v5Do(()=>api("POST","/retail/counts",{size:parseInt(zdVal("v5-cn-s"))||20,category:zdVal("v5-cn-c")||null}),null,"v5-cn-err");if(r){zdCloseModal("modal-v5-cn");await SECTOR_PAGE_LOADERS.retailcounts(document.getElementById("page-retailcounts"));v5CountOpen(r.id,r);}}
async function v5CountOpen(id,c){
  c=c||(_v5.counts||[]).find(x=>x.id===id);if(!c)return;_v5.count=c;const open=c.status==="open";
  zdModal("modal-v5-co",`<div class="modal-title"><i class="ti ti-clipboard-check" style="color:var(--green)"></i> ${esc(c.number)} <small style="margin-left:auto;font-weight:400">${esc(t("v5_counted_n").replace("{a}",c.counted).replace("{b}",c.total))}</small></div>
    ${open?`<div style="display:flex;gap:6px;margin-bottom:8px"><input class="inp" id="v5-co-b" placeholder="${esc(t("v5_code_ph"))}" aria-label="${esc(t("v5_barcode"))}" onkeydown="if(event.key==='Enter')v5CountScan(this.value)"><button class="btn btn-o btn-sm" aria-label="${esc(t("v5_scan"))}" onclick="v5Scan(v5CountScan,t('v5_scan'))"><i class="ti ti-scan"></i></button></div>`:""}
    <div style="max-height:50vh;overflow:auto">${c.lines.map(l=>{const d=l.counted==null?null:l.counted-l.expected;return `<div class="ht-bk" style="cursor:default"><span style="flex:1;min-width:0"><b>${esc(l.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(t("v5_expected"))} ${zdQty(l.expected)} ${esc(l.unit||"")}${d!=null&&Math.abs(d)>1e-9?` · <b style="color:${d<0?"var(--red)":"var(--amber)"}">${d>0?"+":""}${zdQty(d)}</b>`:""}</div></span>
      ${open?`<input class="inp v5-n" type="number" min="0" step="any" value="${l.counted??""}" aria-label="${esc(l.name)}" onchange="v5CountSet('${l.product_id}',this.value)">`:`<b>${l.counted==null?"—":zdQty(l.counted)}</b>`}</div>`;}).join("")}</div>
    <div class="err-box" id="v5-co-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-co')">${esc(t("btn_close"))}</button>${open&&v5Mgr()?`<button class="btn btn-g btn-sm" onclick="v5CountClose('${c.id}')"><i class="ti ti-check"></i> ${esc(t("v5_validate"))}</button>`:""}</div>`,560);
  setTimeout(()=>document.getElementById("v5-co-b")?.focus(),50);
}
async function v5CountSet(pid,v){const c=_v5.count;try{_v5.count=await api("PATCH",`/retail/counts/${c.id}`,{product_id:pid,counted:v===""?null:parseFloat(v)});}catch(e){showErr("v5-co-err",e.message);}}
async function v5CountScan(code){code=String(code||"").trim();if(!code)return;const c=_v5.count;
  try{_v5.count=await api("PATCH",`/retail/counts/${c.id}`,{barcode:code,add:1});zdBeep();v5CountOpen(c.id,_v5.count);}catch(e){showErr("v5-co-err",e.message);}}
async function v5CountClose(id){if(!confirm(t("v5_count_close_q")))return;const r=await v5Do(()=>api("POST",`/retail/counts/${id}/close`),null,"v5-co-err");if(r){showToast(t("v5_count_closed").replace("{v}",zdMoney(r.diff_value)));zdCloseModal("modal-v5-co");navigate("retailcounts");}}

// ── Promotions selon l'heure ──
SECTOR_PAGE_LOADERS.retailpromos=async el=>{
  const r=await api("GET","/retail/promos");_v5.hh=JSON.parse(JSON.stringify(r.promos||[]));_v5.hhCat=true;const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_promos"),t("v5_promos_x"),mgr?`<button class="btn btn-o btn-sm" onclick="v5HHAdd()"><i class="ti ti-plus"></i> ${esc(t("v5_hh_add"))}</button><button class="btn btn-g btn-sm" onclick="v5HHSave('/retail/promos','retailpromos')"><i class="ti ti-check"></i> ${esc(t("btn_save"))}</button>`:"","retailtools")+
    (r.active_now.length?`<div class="card2" style="color:var(--green);margin-bottom:10px"><i class="ti ti-clock-play"></i> ${esc(t("v5_promo_now").replace("{p}",r.active_now.join(", ")))}</div>`:"")+`<div id="v5-hh-box"></div><div class="err-box" id="v5-hh-err"></div>`;
  v5HHDraw();
};

// ── Réapprovisionnement automatique ──
SECTOR_PAGE_LOADERS.retailreorder=async el=>{
  const r=await api("GET","/retail/reorder");_v5.ro=r;const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_reorder"),t("v5_reorder_x"),"","retailtools")+
    (r.rows.length?`<div class="card">${v5Table(["",t("v5_product"),t("v5_stock"),t("v5_min"),t("v5_sold30"),t("v5_order_qty"),t("v5_cost")],r.rows.map((x,i)=>`<tr><td><input type="checkbox" checked data-ro="${i}" aria-label="${esc(x.name)}"></td><td><b>${esc(x.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(x.category||"")}</div></td>
      <td style="color:var(--red)">${zdQty(x.stock_qty)}</td><td>${zdQty(x.stock_min)}</td><td>${zdQty(x.sold_30d)}</td><td><input class="inp v5-n" type="number" min="0.001" step="any" value="${x.suggested}" data-roq="${i}" aria-label="${esc(t("v5_order_qty"))}"></td><td>${zdMoney(x.amount)}</td></tr>`))}
      ${mgr?`<div class="grid2" style="margin-top:10px"><div class="fgrp"><label class="fl" for="v5-ro-s">${esc(t("v5_supplier"))}</label><select class="inp" id="v5-ro-s"><option value="">—</option>${r.suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div>
        <div class="fgrp"><label class="fl" for="v5-ro-n">${esc(t("v5_note"))}</label><input class="inp" id="v5-ro-n" maxlength="500"></div></div><div class="err-box" id="v5-ro-err"></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><b>${esc(t("v5_total"))} ${zdMoney(r.total)}</b><button class="btn btn-g btn-sm" onclick="v5ReorderGo()"><i class="ti ti-truck-delivery"></i> ${esc(t("v5_make_po"))}</button></div>`:""}</div>`
      :`<div class="card" style="text-align:center;padding:26px"><i class="ti ti-circle-check" style="font-size:30px;color:var(--green)"></i><div style="margin-top:6px">${esc(t("v5_reorder_none"))}</div></div>`);
};
async function v5ReorderGo(){
  const lines=[...document.querySelectorAll("[data-ro]")].filter(c=>c.checked).map(c=>{const x=_v5.ro.rows[+c.dataset.ro];return {product_id:x.product_id,qty:parseFloat(document.querySelector(`[data-roq="${c.dataset.ro}"]`).value)||0,unit_cost:x.unit_cost};}).filter(l=>l.qty>0);
  if(!lines.length){v5Err("v5-ro-err",t("v5_pick_lines"));return;}
  const r=await v5Do(()=>api("POST","/retail/reorder",{supplier_id:zdVal("v5-ro-s")||null,lines,notes:zdVal("v5-ro-n")||null}),null,"v5-ro-err");
  if(r){showToast(t("v5_po_made").replace("{n}",r.number||""));navigate("purchases");}
}

// ── Étiquettes de prix avec code-barres ──
SECTOR_PAGE_LOADERS.retaillabels=async el=>{
  const ps=await api("GET","/stock/products");_v5.lp=(Array.isArray(ps)?ps:(ps.items||[]));
  el.innerHTML=v5Head(t("v5_t_labels"),t("v5_labels_x"),`<button class="btn btn-g btn-sm" onclick="v5LabelsPrint()"><i class="ti ti-printer"></i> ${esc(t("v5_print"))}</button>`,"retailtools")+
    `<input class="inp" style="margin-bottom:10px" placeholder="${esc(t("v5_filter"))}" aria-label="${esc(t("v5_filter"))}" oninput="v5LabelsFilter(this.value)">
    <div class="card"><div id="v5-lp">${_v5.lp.map(p=>`<div class="ht-bk v5-lp" data-n="${esc((p.name+" "+(p.category||"")+" "+(p.barcode||"")).toLowerCase())}" style="cursor:default"><span style="flex:1"><b>${esc(p.name)}</b> <small style="color:var(--muted)">${zdMoney(p.unit_price)}${p.barcode?` · ${esc(p.barcode)}`:` · ${esc(t("v5_no_barcode"))}`}</small></span>
      <input class="inp v5-n" type="number" min="0" max="200" value="0" data-lp="${p.id}" aria-label="${esc(t("v5_copies"))} ${esc(p.name)}"></div>`).join("")||zdEmpty(t("v5_nothing"))}</div></div>`;
};
function v5LabelsFilter(q){q=q.trim().toLowerCase();document.querySelectorAll(".v5-lp").forEach(r=>{r.style.display=!q||r.dataset.n.includes(q)?"":"none";});}
function v5LabelsPrint(){
  const out=[];document.querySelectorAll("[data-lp]").forEach(i=>{const n=parseInt(i.value)||0;const p=_v5.lp.find(x=>x.id===i.dataset.lp);for(let k=0;k<n&&p;k++)out.push(p);});
  if(!out.length){showToast(t("v5_labels_none"),"error");return;}
  v5Print(t("v5_t_labels"),`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">${out.map(p=>`<div style="border:1px dashed #aaa;border-radius:6px;padding:6px;text-align:center;break-inside:avoid"><div style="font-size:11px;font-weight:700;min-height:26px">${esc(p.name)}</div><div style="font-size:16px;font-weight:800">${zdMoney(p.unit_price)}</div>${p.barcode?`${v5Barcode(p.barcode,30)}<div style="font-size:9px">${esc(p.barcode)}</div>`:""}</div>`).join("")}</div>`);
}

// ── Vendeurs ambulants (tournées) ──
SECTOR_PAGE_LOADERS.retailroutes=async el=>{
  const rows=await api("GET","/retail/routes");_v5.routes=rows;
  el.innerHTML=v5Head(t("v5_t_routes"),t("v5_routes_x"),`<button class="btn btn-g btn-sm" onclick="v5RouteNew()"><i class="ti ti-plus"></i> ${esc(t("v5_route_new"))}</button>`,"retailtools")+
    (rows.length?`<div class="v5-cards">${rows.map(r=>`<div class="card"><div style="display:flex;justify-content:space-between;gap:6px"><b>${esc(r.seller)}</b><span class="mono" style="font-size:11px">${esc(r.number)}</span></div>
      <div style="font-size:12px;color:var(--muted)">${esc(v5Date(r.day))}${r.zone?` · ${esc(r.zone)}`:""} · ${esc(t("v5_items_n").replace("{n}",r.lines.length))}</div>
      ${r.status==="closed"?`<div style="margin-top:6px;font-size:13px">${esc(t("v5_expected"))} ${zdMoney(r.expected)} · ${esc(t("v5_received"))} ${zdMoney(r.received)} · <b style="color:${r.gap<0?"var(--red)":"var(--green)"}">${r.gap>0?"+":""}${zdMoney(r.gap)}</b></div>`
        :`<button class="btn btn-a btn-sm" style="margin-top:8px;width:100%" onclick="v5RouteClose('${r.id}')"><i class="ti ti-flag"></i> ${esc(t("v5_route_close"))}</button>`}</div>`).join("")}</div>`:v5Empty("v5_routes_none","route"));
};
async function v5RouteNew(){
  const ps=await api("GET","/stock/products");_v5.rp=(Array.isArray(ps)?ps:(ps.items||[])).filter(p=>(p.stock_qty||0)>0);
  zdModal("modal-v5-rn",`<div class="modal-title"><i class="ti ti-map-2" style="color:var(--green)"></i> ${esc(t("v5_route_new"))}</div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-rn-s">${esc(t("v5_seller"))} *</label><input class="inp" id="v5-rn-s" maxlength="160"></div><div class="fgrp"><label class="fl" for="v5-rn-z">${esc(t("v5_zone"))}</label><input class="inp" id="v5-rn-z" maxlength="160"></div></div>
    <div class="fl">${esc(t("v5_goods_out"))}</div><div style="max-height:40vh;overflow:auto">${_v5.rp.map(p=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(p.name)} <small style="color:var(--muted)">${zdQty(p.stock_qty)} · ${zdMoney(p.unit_price)}</small></span><input class="inp v5-n" type="number" min="0" max="${p.stock_qty}" step="any" value="0" data-rn="${p.id}" aria-label="${esc(p.name)}"></div>`).join("")||zdEmpty(t("v5_no_stock_items"))}</div>
    <div class="err-box" id="v5-rn-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-rn')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5RouteNewGo()"><i class="ti ti-check"></i> ${esc(t("v5_route_start"))}</button></div>`,520);
}
async function v5RouteNewGo(){
  const lines=[...document.querySelectorAll("[data-rn]")].map(i=>({product_id:i.dataset.rn,qty:parseFloat(i.value)||0})).filter(l=>l.qty>0);const s=zdVal("v5-rn-s");
  if(!s||!lines.length){v5Err("v5-rn-err",t("v5_route_need"));return;}
  if(await v5Do(()=>api("POST","/retail/routes",{seller:s,zone:zdVal("v5-rn-z")||null,lines}),t("v5_saved"),"v5-rn-err")){zdCloseModal("modal-v5-rn");navigate("retailroutes");}
}
function v5RouteClose(id){const r=_v5.routes.find(x=>x.id===id);if(!r)return;
  zdModal("modal-v5-rc",`<div class="modal-title"><i class="ti ti-flag" style="color:var(--green)"></i> ${esc(t("v5_route_close"))} · ${esc(r.seller)}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:6px">${esc(t("v5_returns_x"))}</div>
    ${r.lines.map(l=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(l.name)} <small style="color:var(--muted)">${esc(t("v5_out_n").replace("{n}",zdQty(l.out)))} · ${zdMoney(l.price)}</small></span><input class="inp v5-n" type="number" min="0" max="${l.out}" step="any" value="0" data-rc="${l.product_id}" data-out="${l.out}" data-pr="${l.price}" oninput="v5RouteExp()" aria-label="${esc(t("v5_returned"))} ${esc(l.name)}"></div>`).join("")}
    <div style="display:flex;justify-content:space-between;margin:10px 0"><span>${esc(t("v5_expected"))}</span><b id="v5-rc-exp"></b></div>
    <div class="grid2"><div class="fgrp"><label class="fl" for="v5-rc-r">${esc(t("v5_cash_received"))}</label><input class="inp" id="v5-rc-r" type="number" min="0" step="0.01"></div><div class="fgrp"><label class="fl" for="v5-rc-m">${esc(t("fld_payment_method"))}</label><select class="inp" id="v5-rc-m">${zdMethodOptions("cash")}</select></div></div>
    <div class="err-box" id="v5-rc-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-v5-rc')">${esc(t("btn_cancel"))}</button><button class="btn btn-g btn-sm" onclick="v5RouteCloseGo('${id}')"><i class="ti ti-check"></i> ${esc(t("v5_validate"))}</button></div>`,520);
  v5RouteExp();}
function v5RouteExp(){let e=0;document.querySelectorAll("[data-rc]").forEach(i=>{e+=(+i.dataset.out-(parseFloat(i.value)||0))*+i.dataset.pr;});const el=document.getElementById("v5-rc-exp");if(el)el.textContent=zdMoney(Math.max(0,e));const r=document.getElementById("v5-rc-r");if(r&&!r.dataset.t){r.placeholder=Math.max(0,e).toFixed(2);}}
async function v5RouteCloseGo(id){
  const returns=[...document.querySelectorAll("[data-rc]")].map(i=>({product_id:i.dataset.rc,returned:parseFloat(i.value)||0}));const rec=zdNum("v5-rc-r");if(rec==null){v5Err("v5-rc-err",t("v5_cash_received"));return;}
  const r=await v5Do(()=>api("POST",`/retail/routes/${id}/close`,{returns,received:rec,method:zdVal("v5-rc-m")}),null,"v5-rc-err");if(r){showToast(t("v5_route_closed").replace("{g}",zdMoney(r.gap)));zdCloseModal("modal-v5-rc");navigate("retailroutes");}
}

// ── Retours clients et avoirs ──
SECTOR_PAGE_LOADERS.retailreturns=async el=>{
  el.innerHTML=v5Head(t("v5_t_returns"),t("v5_returns_page_x"),"","retailtools")+
    `<div class="card"><div style="display:flex;gap:6px"><input class="inp" id="v5-rt-n" placeholder="${esc(t("v5_ticket_number"))}" aria-label="${esc(t("v5_ticket_number"))}" onkeydown="if(event.key==='Enter')v5ReturnFind()"><button class="btn btn-g btn-sm" onclick="v5ReturnFind()">${esc(t("v5_find"))}</button></div><div id="v5-rt-box" style="margin-top:10px"></div></div>`;
};
async function v5ReturnFind(){
  const box=document.getElementById("v5-rt-box");
  try{const inv=await api("GET",`/retail/invoice-lookup?number=${encodeURIComponent(zdVal("v5-rt-n"))}`);_v5.ret=inv;
    box.innerHTML=`<div style="font-size:13px;margin-bottom:6px"><b class="mono">${esc(inv.number)}</b> · ${esc(fmtDate(inv.date))} · ${zdMoney(inv.total)}${inv.credited?` · ${esc(t("v5_already_credited"))} ${zdMoney(inv.credited)}`:""}</div>
      ${inv.items.map((x,i)=>`<div class="ht-bk" style="cursor:default"><span style="flex:1">${esc(x.description)} <small style="color:var(--muted)">${zdQty(x.qty)} × ${zdMoney(x.unit_price)}</small></span><input class="inp v5-n" type="number" min="0" max="${x.qty}" step="any" value="0" data-ri="${i}" aria-label="${esc(t("v5_returned"))} ${esc(x.description)}"></div>`).join("")}
      <div class="grid2" style="margin-top:8px"><div class="fgrp"><label class="fl" for="v5-rt-m">${esc(t("v5_return_mode"))}</label><select class="inp" id="v5-rt-m"><option value="refund">${esc(t("v5_refund"))}</option><option value="credit">${esc(t("v5_credit_note"))}</option></select></div>
        <div class="fgrp"><label class="fl" for="v5-rt-r">${esc(t("v5_reason"))}</label><input class="inp" id="v5-rt-r" maxlength="300"></div></div>
      <label class="terms-check"><input type="checkbox" id="v5-rt-s" checked><span>${esc(t("v5_restock"))}</span></label>
      <div class="err-box" id="v5-rt-err"></div><button class="btn btn-g btn-sm" onclick="v5ReturnGo()"><i class="ti ti-arrow-back-up"></i> ${esc(t("v5_validate_return"))}</button>`;
  }catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;}
}
async function v5ReturnGo(){
  const inv=_v5.ret;const rs=document.getElementById("v5-rt-s").checked;
  const lines=[...document.querySelectorAll("[data-ri]")].map(i=>{const x=inv.items[+i.dataset.ri];return {product_id:x.product_id||null,description:String(x.description||"").split(" (promo")[0],qty:parseFloat(i.value)||0,unit_price:x.unit_price,restock:rs};}).filter(l=>l.qty>0);
  if(!lines.length){v5Err("v5-rt-err",t("v5_pick_lines"));return;}
  const r=await v5Do(()=>api("POST","/retail/returns",{invoice_number:inv.number,lines,mode:zdVal("v5-rt-m"),reason:zdVal("v5-rt-r")||null}),null,"v5-rt-err");
  if(r){showToast(t("v5_return_ok").replace("{n}",r.credit_note).replace("{v}",zdMoney(r.amount)));navigate("retailreturns");}
}

// ── Marges par catégorie ──
SECTOR_PAGE_LOADERS.retailmargins=async el=>{
  _v5.rmd=_v5.rmd||30;const r=await api("GET",`/retail/margins?days=${_v5.rmd}`);const max=Math.max(1,...r.rows.map(x=>Math.abs(x.margin)));
  el.innerHTML=v5Head(t("v5_t_margins"),t("v5_margins_x"),[7,30,90].map(n=>`<button class="toggle-btn${_v5.rmd===n?" active":""}" onclick="_v5.rmd=${n};navigate('retailmargins')">${esc(t("v5_days").replace("{n}",n))}</button>`).join(""),"retailtools")+
    `<div class="v5-kpis">${v5Kpi(t("v5_sales"),zdMoney(r.revenue),"var(--green)")}${v5Kpi(t("v5_margin"),zdMoney(r.margin))}${v5Kpi(t("v5_margin_pct"),v5Pct(r.margin_pct))}</div>`+
    (r.rows.length?`<div class="card" style="margin-top:12px">${r.rows.map(x=>`<div class="v5-hbar"><span>${esc(x.category)} <small>${v5Pct(x.margin_pct)}</small></span><div><i style="width:${Math.round(Math.abs(x.margin)/max*100)}%;${x.margin<0?"background:var(--red)":""}"></i></div><b>${zdMoney(x.margin)}</b></div>`).join("")}
      ${v5Table([t("v5_category"),t("v5_qty"),t("v5_sales"),t("v5_cost"),t("v5_margin"),"%"],r.rows.map(x=>`<tr><td>${esc(x.category)}</td><td>${zdQty(x.qty)}</td><td>${zdMoney(x.revenue)}</td><td>${zdMoney(x.cost)}</td><td><b>${zdMoney(x.margin)}</b></td><td>${v5Pct(x.margin_pct)}</td></tr>`))}</div>`:v5Empty("v5_nothing","percentage"));
};

// ── Pharmacie : registre des produits sous contrôle ──
const V5_MOVE={in:"v5_mv_in",sale:"v5_mv_sale",use:"v5_mv_sale",waste:"v5_mv_waste",count:"v5_mv_count",return:"v5_mv_return",supplier_return:"v5_mv_return"};
SECTOR_PAGE_LOADERS.pharmaregister=async el=>{
  _v5.prm=_v5.prm||v5Month();const r=await api("GET",`/retail/controlled-register?month=${_v5.prm}`);_v5.pr=r;const mgr=v5Mgr();
  el.innerHTML=v5Head(t("v5_t_controlled"),t("v5_ctrl_x"),`<input class="inp" type="month" value="${_v5.prm}" style="width:auto" aria-label="${esc(t("v5_month"))}" onchange="_v5.prm=this.value;navigate('pharmaregister')">${mgr?`<button class="btn btn-o btn-sm" onclick="v5CtrlModal()"><i class="ti ti-lock"></i> ${esc(t("v5_ctrl_products"))}</button>`:""}<button class="btn btn-g btn-sm" onclick="v5CtrlPrint()"><i class="ti ti-printer"></i> ${esc(t("v5_print"))}</button>`,"pharmatools")+
    (r.products.length?`<div class="v5-kpis">${r.products.map(p=>v5Kpi(p.product,zdQty(p.stock_qty))).join("")}</div>`:`<div class="card2" style="font-size:13px;color:var(--muted);margin-bottom:10px">${esc(t("v5_ctrl_none"))}</div>`)+
    (r.rows.length?`<div class="card" style="margin-top:12px">${v5Table([t("v5_date"),t("v5_product"),t("v5_move"),t("v5_qty"),t("v5_lot"),t("v5_party"),t("v5_doc")],r.rows.map(x=>`<tr><td>${esc(fmtDate(x.at))}</td><td>${esc(x.product)}</td><td>${esc(t(V5_MOVE[x.kind]||"v5_mv_other"))}</td><td>${x.kind==="in"?"+":"−"}${zdQty(x.qty)}</td><td class="mono">${esc(x.lot||"")}</td><td>${esc(x.party||"")}</td><td class="mono">${esc(x.doc||"")}</td></tr>`))}</div>`:r.products.length?v5Empty("v5_nothing","lock"):"");
};
async function v5CtrlModal(){
  const ps=await api("GET","/stock/products");const list=Array.isArray(ps)?ps:(ps.items||[]);
  zdModal("modal-v5-ctl",`<div class="modal-title"><i class="ti ti-lock" style="color:var(--green)"></i> ${esc(t("v5_ctrl_products"))}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(t("v5_ctrl_set_x"))}</div>
    <div class="fgrp"><label class="fl" for="v5-ctl-p">${esc(t("v5_product"))}</label><select class="inp" id="v5-ctl-p">${list.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></div>
    <div class="err-box" id="v5-ctl-err"></div><div class="modal-footer"><button class="btn btn-o btn-sm" onclick="v5CtrlSet(false)">${esc(t("v5_ctrl_remove"))}</button><button class="btn btn-g btn-sm" onclick="v5CtrlSet(true)"><i class="ti ti-lock"></i> ${esc(t("v5_ctrl_add"))}</button></div>`,440);
}
async function v5CtrlSet(on){if(await v5Do(()=>api("PUT",`/retail/products/${zdVal("v5-ctl-p")}/controlled`,{controlled:on}),t("v5_saved"),"v5-ctl-err")){zdCloseModal("modal-v5-ctl");navigate("pharmaregister");}}
function v5CtrlPrint(){const r=_v5.pr;if(!r)return;
  v5Print(t("v5_t_controlled"),v5DocHead(r.company,t("v5_ctrl_title"),r.month)+v5DocTable([t("v5_date"),t("v5_product"),t("v5_move"),t("v5_qty"),t("v5_lot"),t("v5_expiry"),t("v5_party"),t("v5_doc")],
    r.rows.map(x=>[esc(fmtDate(x.at)),esc(x.product),esc(t(V5_MOVE[x.kind]||"v5_mv_other")),(x.kind==="in"?"+":"−")+zdQty(x.qty),esc(x.lot||""),esc(v5Date(x.expiry)),esc(x.party||""),esc(x.doc||"")]))+
    `<div style="margin-top:10px">${r.products.map(p=>`${esc(p.product)} : ${esc(t("v5_stock"))} ${zdQty(p.stock_qty)}`).join("<br>")}</div><div style="margin-top:30px;font-size:11px">${esc(t("v5_sign_pharmacist"))}</div>`);}
