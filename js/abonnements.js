// ── ABONNEMENTS PAR SECTEUR, PARRAINAGE, OFFRES ADMIN, ESPACE CLIENT (9.2) ──
const AB_TIERS=["essentiel","pro","premium"];
let _ab={cat:null,offer:null,ref:null,sel:{},cycle:"monthly",quote:null,seq:0,timer:null};
let _regAccountType="manager";

function abTr(key,vars){let s=t(key);Object.entries(vars||{}).forEach(([k,v])=>{s=s.split("{"+k+"}").join(v);});return s;}
function abMoney(v){const n=Math.round((+v||0)*100)/100;return (Number.isInteger(n)?String(n):n.toFixed(2).replace(".",","))+" $";}
function abTierLabel(i){return t("ab_tier_"+AB_TIERS[i]);}
function abSectorLabel(k){const s=(_ab.cat?.sectors||[]).find(x=>x.key===k);return t("sector_"+k)!=="sector_"+k?t("sector_"+k):(s?s.label:k);}
function abShort(k){return t("sector_short_"+k)!=="sector_short_"+k?t("sector_short_"+k):abSectorLabel(k).split(" /")[0];}
function abDate(d){if(!d)return "";const x=/^\d{4}-\d{2}-\d{2}$/.test(d)?new Date(d+"T12:00:00"):parseServerDate(d);return x.toLocaleDateString(State.lang==="ar"?"ar":State.lang||"fr");}
async function abCatalog(){if(!_ab.cat){const r=await fetch(`${API_BASE}/billing/catalog`);_ab.cat=await r.json();}return _ab.cat;}

// ── Inscription : client ou gérant ──
function abRegRole(role){
  _regAccountType=role==="client"?"client":"manager";
  document.querySelectorAll("#reg-roles .reg-role").forEach(b=>b.setAttribute("aria-checked",b.dataset.role===_regAccountType?"true":"false"));
  const isC=_regAccountType==="client";
  ["reg-company","reg-referral"].forEach(id=>{const g=document.getElementById(id)?.closest(".fgrp");if(g)g.style.display=isC?"none":"";});
  const sg=document.getElementById("reg-sector-grid")?.closest(".fgrp");if(sg)sg.style.display=isC?"none":"";
  const lbl=document.querySelector("#reg-btn span");if(lbl){lbl.removeAttribute("data-i18n");lbl.textContent=t(isC?"reg_btn_client":"reg_btn_manager");}
  const ic=document.querySelector("#reg-btn i");if(ic)ic.className="ti "+(isC?"ti-user-plus":"ti-rocket");
}
function abRenderRegRoles(){
  const box=document.getElementById("reg-roles");if(!box)return;
  box.innerHTML=[["manager","ti-building-store"],["client","ti-shopping-bag"]].map(([r,i])=>`<button type="button" class="reg-role" data-role="${r}" role="radio" aria-checked="${_regAccountType===r}" onclick="abRegRole('${r}')">
    <i class="ti ${i}"></i><span class="rr-t">${esc(t("reg_type_"+r+"_t"))}</span><span class="rr-x">${esc(t("reg_type_"+r+"_x"))}</span><span class="rr-b ${r==="client"?"free":"trial"}">${esc(t("reg_type_"+r+"_badge"))}</span></button>`).join("");
  abRegRole(_regAccountType);
}

// ── Liens automatiques vers « Mon espace » (comptes clients) ──
function zdIsClient(){return !!(State.token&&State.tenant&&State.tenant.account_type==="client");}
function zdClientLink(kind,token){
  if(!zdIsClient()||!kind||!token)return Promise.resolve(null);
  return fetch(`${API_BASE}/me/links`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${State.token}`},body:JSON.stringify({kind,token:String(token)})}).then(r=>r.ok?r.json():null).catch(()=>null);
}

// ── Page Abonnements ──
async function abLoadBilling(){
  const root=document.getElementById("ab-root");if(!root)return;
  if(!_ab.cat)root.innerHTML=`<div style="color:var(--muted);padding:20px">${t("loading")}</div>`;
  try{
    await abCatalog();
    const [offer,ref]=await Promise.all([api("GET","/billing/my-offer"),api("GET","/referral/status").catch(()=>null)]);
    _ab.offer=offer;_ab.ref=ref;
    abInitSel();abRender();
  }catch(e){root.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;}
}
function abGifts(){return _ab.offer?.gifts?.sectors||{};}
function abInitSel(){
  const o=_ab.offer||{};let sel={};
  const cur=o.subscription?.selection||{};
  if(Object.keys(cur).length)sel={...cur};
  else if(o.pending&&Object.keys(o.pending.selection||{}).length)sel={...o.pending.selection};
  else{
    const secs=[State.tenant?.sector,...(State.tenant?.sector_extra||[])].filter(Boolean);
    secs.forEach(k=>{const s=_ab.cat.sectors.find(x=>x.key===k);if(s)sel[k]=s.prices[1]!=null?"pro":"essentiel";});
  }
  const g=abGifts();
  Object.keys(sel).forEach(k=>{if(g[k]&&AB_TIERS.indexOf(sel[k])<=AB_TIERS.indexOf(g[k]))delete sel[k];});
  if(o.subscription?.billing_cycle==="annual")_ab.cycle="annual";
  _ab.sel=sel;
}
function abPick(k,tier){
  if(tier===null||_ab.sel[k]===tier)delete _ab.sel[k];else _ab.sel[k]=tier;
  abRenderSectors();abRequote();
}
function abSetCycle(c){_ab.cycle=c;document.querySelectorAll("#ab-cycle button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.c===c?"true":"false"));abRenderSectors();abRequote();}
function abPriceLabel(p){
  if(_ab.cycle==="annual"){const a=p*_ab.cat.annual.factor;return `<b>${abMoney(a)}</b><small>${esc(t("ab_per_year"))}</small><s>${abMoney(p*12)}</s>`;}
  return `<b>${abMoney(p)}</b><small>${esc(t("ab_per_month"))}</small>`;
}
function abSectorCard(s){
  const g=abGifts()[s.key];const gi=g?AB_TIERS.indexOf(g):-1;const cur=_ab.sel[s.key];
  const on=!!cur,gift=gi>=0&&!cur;
  let body="";
  if(gi>=0){
    body=`<div class="ab-gift"><i class="ti ti-gift"></i> ${esc(abTr("ab_gift_tile",{t:abTierLabel(gi)}))}</div><div class="ab-tiers">`+
      s.prices.map((p,i)=>i<=gi||p==null?"":`<button type="button" class="ab-tier${cur===AB_TIERS[i]?" on":""}" aria-pressed="${cur===AB_TIERS[i]}" onclick="abPick('${s.key}','${AB_TIERS[i]}')"><span>${esc(abTr("ab_upgrade",{t:abTierLabel(i)}))}</span>${abPriceLabel(p)}</button>`).join("")+`</div>`;
  }else{
    body=`<div class="ab-tiers"><button type="button" class="ab-tier none${!cur?" on":""}" aria-pressed="${!cur}" onclick="abPick('${s.key}',null)"><span>${esc(t("ab_none"))}</span><small>${esc(t("ab_not_this_sector"))}</small></button>`+
      s.prices.map((p,i)=>p==null?"":`<button type="button" class="ab-tier${cur===AB_TIERS[i]?" on":""}" aria-pressed="${cur===AB_TIERS[i]}" onclick="abPick('${s.key}','${AB_TIERS[i]}')"><span>${esc(abTierLabel(i))}</span>${abPriceLabel(p)}</button>`).join("")+`</div>`;
  }
  return `<div class="ab-sec${on?" on":""}${gift?" gift":""}" style="--sc:${s.color}"><div class="ab-sec-h"><span class="ab-dot"><i class="ti ti-${esc(s.icon)}"></i></span><div><b>${esc(abSectorLabel(s.key))}</b><span>${esc(t("sector_tagline_"+s.key)!=="sector_tagline_"+s.key?t("sector_tagline_"+s.key):s.tagline)}</span></div>
    ${gift?`<span class="ab-tag g">${esc(t("ab_gift_tag"))}</span>`:on?`<span class="ab-tag r">${esc(abTierLabel(AB_TIERS.indexOf(cur)))}</span>`:""}</div>${body}</div>`;
}
function abRenderSectors(){const box=document.getElementById("ab-sectors");if(box)box.innerHTML=_ab.cat.sectors.map(abSectorCard).join("");}
function abStatusHtml(){
  const o=_ab.offer||{};const parts=[];
  if(o.is_company)parts.push(`<div class="ab-note">${esc(t("ab_company_note"))}</div>`);
  if(o.subscription&&Object.keys(o.subscription.selection||{}).length){
    const lab=Object.entries(o.subscription.selection).map(([k,v])=>`${abShort(k)} ${abTierLabel(AB_TIERS.indexOf(v))}`).join(" + ");
    parts.push(`<div class="ab-banner ok"><i class="ti ti-circle-check"></i><div><b>${esc(t("ab_current"))}</b> : ${esc(lab)} · ${esc(o.subscription.billing_cycle==="annual"?t("ab_cycle_annual"):t("ab_cycle_monthly"))}${o.subscription.expires_at?` · ${esc(abTr("ab_until",{d:abDate(o.subscription.expires_at)}))}`:""}</div></div>`);
  }
  if(o.pending){
    parts.push(`<div class="ab-banner wait"><i class="ti ti-clock"></i><div><b>${esc(t("ab_pending_t"))}</b><div>${esc(abTr("ab_pending_x",{r:o.pending.reference,a:abMoney(o.pending.amount_usd)}))}</div>
      <button type="button" class="btn btn-sm btn-g" style="margin-top:8px" onclick="abPendingWa('${esc(o.pending.reference)}')"><i class="ti ti-brand-whatsapp"></i> ${esc(t("ab_pending_wa"))}</button></div></div>`);
  }
  if(o.deal){
    const scope=o.deal.scope==="all"?t("ab_deal_all"):abTr("ab_deal_some",{s:o.deal.sectors.map(abShort).join(", ")});
    parts.push(`<div class="ab-banner gift"><i class="ti ti-discount-2"></i><div>${esc(abTr("ab_deal",{p:String(o.deal.pct).replace(".",","),scope}))}${esc(o.deal.until?abTr("ab_until_d",{d:abDate(o.deal.until)}):t("ab_no_end"))}</div></div>`);
  }
  const g=abGifts();
  if(Object.keys(g).length){
    const lab=Object.entries(g).map(([k,v])=>`${abShort(k)} ${abTierLabel(AB_TIERS.indexOf(v))}`).join(", ");
    parts.push(`<div class="ab-banner gift"><i class="ti ti-gift"></i><div>${esc(abTr("ab_gifts",{s:lab}))}${esc(o.gifts.until?abTr("ab_until_d",{d:abDate(o.gifts.until)}):t("ab_no_end"))}</div></div>`);
  }
  return parts.join("");
}
async function abPendingWa(ref){
  let n="";try{n=await supportNumber();}catch(_){}
  window.open(`https://wa.me/${String(n||"").replace(/[^0-9]/g,"")}?text=${encodeURIComponent(abTr("ab_pending_msg",{r:ref}))}`,"_blank","noopener");
}
function abTiersTable(){
  const cat=_ab.cat;
  const feats=[0,1,2].map(i=>t("ab_tf_"+i).split("|"));
  return `<div class="card" style="margin-top:16px"><div style="font-weight:700;font-size:14px;margin-bottom:12px">${esc(t("ab_tiers_title"))}</div><div class="ab-tf">${[0,1,2].map(i=>`<div class="ab-tf-col"><div class="ab-tf-h">${esc(abTierLabel(i))}<small>${esc(abTr("ab_users",{n:cat.tiers[i].users}))}</small></div><ul>${feats[i].map(f=>`<li><i class="ti ti-check"></i> ${esc(f)}</li>`).join("")}</ul></div>`).join("")}</div>
    <div style="font-size:12px;color:var(--muted);margin-top:10px">${esc(abTr("ab_users_note",{n:cat.extra_sector_users}))}</div></div>`;
}
function abReferralHtml(){
  const r=_ab.ref;if(!r)return "";
  const steps=r.discount_tiers.map(([n,p])=>`<div class="ab-step${r.best>=n?" done":""}"><div class="n">${esc(abTr("ab_ref_step",{n:n+(n===35?"+":"")}))}</div><div class="v">−${p} %</div></div>`).join("");
  const tsteps=r.trial_tiers.map(([n,d])=>`<div class="ab-step${r.best>=n?" done":""}"><div class="n">${esc(abTr("ab_ref_step",{n:n+(n===40?"+":"")}))}</div><div class="v">${(_ab.cat?.trial_days||14)+d} ${esc(t("ab_days"))}</div><div class="n">+${d}</div></div>`).join("");
  const pct=Math.min(100,r.best/35*100);
  const next=r.next_discount?abTr("ab_ref_next",{n:r.next_discount.missing,p:r.next_discount.pct}):t("ab_ref_max");
  const tnext=r.next_trial?abTr("ab_ref_trial_next",{n:r.next_trial.missing,d:(_ab.cat?.trial_days||14)+r.next_trial.days}):abTr("ab_ref_trial_max",{d:(_ab.cat?.trial_days||14)+r.trial_bonus_max});
  return `<div class="card ab-ref" style="margin-top:16px"><div style="font-weight:700;font-size:15px"><i class="ti ti-gift" style="color:var(--green)"></i> ${esc(t("ab_ref_title"))}</div>
    <div style="font-size:13px;color:var(--muted);margin:6px 0 12px">${esc(t("ab_ref_x"))}</div>
    <div class="ab-ref-top"><span>${esc(t("ab_ref_code"))} <code>${esc(r.code||"—")}</code></span><span>${esc(t("ab_ref_filleuls"))} <b>${r.filleuls}</b></span><span>${esc(t("ab_ref_disc_now"))} <b>${r.discount_pct} %</b></span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button class="btn btn-o btn-sm" onclick="abCopyRef()"><i class="ti ti-copy"></i> ${esc(t("ab_ref_copy"))}</button><button class="btn btn-sm" style="background:#25D366;color:#fff" onclick="abShareRef()"><i class="ti ti-brand-whatsapp"></i> ${esc(t("ab_ref_wa"))}</button></div>
    <div class="usage-bar" style="height:8px"><div class="usage-bar-fill" style="width:${pct}%;background:var(--green)"></div></div>
    <div style="font-size:12px;color:var(--muted);margin:6px 0 10px">${esc(next)}</div>
    <div class="ab-steps">${steps}</div>
    ${r.in_trial?`<div class="ab-trial"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${esc(t("ab_ref_trial_title"))}</div><div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(t("ab_ref_trial_x"))}</div><div class="ab-steps six">${tsteps}</div><div style="font-size:12px;color:var(--muted);margin-top:6px">${esc(tnext)}</div></div>`:""}
    ${(r.recent||[]).length?`<div style="font-weight:700;font-size:13px;margin:14px 0 6px">${esc(t("ab_ref_recent"))}</div>${r.recent.map(f=>`<div class="ab-fl"><span>${esc(f.company)}</span><span class="badge ${f.paying?"bg":"ba"}">${esc(f.paying?t("ab_ref_paying"):t("ab_ref_in_trial"))}</span><span style="font-family:var(--mono);font-size:11px;color:var(--muted)">${fmtDate(f.joined_at)}</span></div>`).join("")}`:""}</div>`;
}
function abRefLink(){return _ab.ref?.code?`${window.location.origin}/?ref=${_ab.ref.code}`:null;}
function abCopyRef(){const l=abRefLink();if(!l)return;navigator.clipboard.writeText(l).then(()=>showToast(t("ab_copied")));}
function abShareRef(){const l=abRefLink();if(!l)return;const txt=abTr("ab_ref_share",{c:_ab.ref.code,l});
  if(navigator.share){navigator.share({text:txt}).catch(()=>{});return;}
  window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`,"_blank","noopener");}
function abRender(){
  const root=document.getElementById("ab-root");if(!root)return;
  const c=_ab.cat;
  root.innerHTML=`${abStatusHtml()}
    <div class="ab-head"><div><div style="font-weight:800;font-size:17px">${esc(t("ab_title_sectors"))}</div><div style="font-size:13px;color:var(--muted);margin-top:4px">${esc(abTr("ab_sub_sectors",{a:c.sector_discounts[0][1],b:c.sector_discounts[1][1],c:c.sector_discounts[2][1],d:c.sector_discounts[3][1]}))}</div></div>
      <div class="ab-cycle" id="ab-cycle" role="group"><button type="button" data-c="monthly" aria-pressed="${_ab.cycle==="monthly"}" onclick="abSetCycle('monthly')">${esc(t("ab_cycle_monthly"))}</button><button type="button" data-c="annual" aria-pressed="${_ab.cycle==="annual"}" onclick="abSetCycle('annual')">${esc(t("ab_cycle_annual"))} <small>· ${esc(t("ab_cycle_annual_note"))}</small></button></div></div>
    <div class="ab-grid"><div class="ab-sectors" id="ab-sectors"></div><aside class="ab-sum card" aria-live="polite"><div style="font-weight:700;font-size:15px;margin-bottom:10px">${esc(t("ab_summary"))}</div><div id="ab-sum"></div></aside></div>
    ${abTiersTable()}${abReferralHtml()}
    <button type="button" class="ab-mbar" id="ab-mbar" hidden onclick="document.getElementById('ab-sum')?.closest('.ab-sum')?.scrollIntoView({behavior:'smooth',block:'start'})"><span id="ab-mbar-l"></span><b id="ab-mbar-v"></b><i class="ti ti-chevron-down"></i></button>`;
  abRenderSectors();abRequote();abWatchSummary();
}
let _abSumObs=null,_abSumVisible=false;
function abWatchSummary(){
  if(_abSumObs){_abSumObs.disconnect();_abSumObs=null;}
  const el=document.querySelector("#ab-root .ab-sum");if(!el||!("IntersectionObserver" in window))return;
  _abSumObs=new IntersectionObserver(es=>{_abSumVisible=es.some(e=>e.isIntersecting);abUpdateMbar();},{threshold:0.15});
  _abSumObs.observe(el);
}
function abUpdateMbar(){
  const bar=document.getElementById("ab-mbar");if(!bar)return;
  const q=_ab.quote;
  if(!q||_abSumVisible){bar.hidden=true;return;}
  document.getElementById("ab-mbar-l").textContent=_ab.cycle==="annual"?t("ab_total_a"):t("ab_total_m");
  document.getElementById("ab-mbar-v").textContent=abMoney(q.total);
  bar.hidden=false;
}
function abRequote(){
  clearTimeout(_ab.timer);
  const box=document.getElementById("ab-sum");if(box&&!Object.keys(_ab.sel).length&&!Object.keys(abGifts()).length){_ab.quote=null;abRenderSummary();return;}
  _ab.timer=setTimeout(async()=>{
    const seq=++_ab.seq;
    try{const q=await api("POST","/billing/quote",{selection:_ab.sel,billing_cycle:_ab.cycle});if(seq===_ab.seq){_ab.quote=q;abRenderSummary();}}
    catch(e){if(seq===_ab.seq&&box)box.innerHTML=`<div style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;}
  },120);
}
function abRenderSummary(){
  const box=document.getElementById("ab-sum");if(!box)return;
  const q=_ab.quote;
  if(!q){box.innerHTML=`<div style="color:var(--muted);font-size:13px">${esc(t("ab_empty"))}</div>`;abUpdateMbar();return;}
  const L=(a,b,cls)=>`<div class="ab-line${cls?" "+cls:""}"><span>${a}</span><span>${b}</span></div>`;
  let h=q.rows.map(r=>L(esc(`${abShort(r.sector)} · ${abTierLabel(AB_TIERS.indexOf(r.tier))}`),abMoney(r.price))).join("");
  h+=q.gifts.map(g=>L(esc(abTr("ab_offered_line",{s:abShort(g.sector),t:abTierLabel(AB_TIERS.indexOf(g.tier))})),"0 $","gift")).join("");
  if(q.rows.length)h+=L(esc(t("ab_sum")),abMoney(q.sum),"sub");
  if(q.admin_discount>0)h+=L(esc(abTr("ab_admin_disc",{p:String(q.admin_pct).replace(".",",")})),"−"+abMoney(q.admin_discount),"disc");
  if(q.sector_discount>0)h+=L(esc(abTr("ab_sector_disc",{n:q.sector_count,p:q.sector_discount_pct})),"−"+abMoney(q.sector_discount),"disc");
  if(q.referral_discount>0)h+=L(esc(abTr("ab_ref_disc",{n:q.referral_filleuls,p:q.referral_pct})),"−"+abMoney(q.referral_discount),"disc");
  if(q.capped)h+=`<div class="ab-cap">${esc(abTr("ab_cap",{p:q.cap_pct}))}</div>`;
  h+=`<div class="ab-total"><span>${esc(_ab.cycle==="annual"?t("ab_total_a"):t("ab_total_m"))}</span><b>${abMoney(q.total)}</b></div>`;
  if(q.saving_vs_monthly>0)h+=`<div class="ab-save">${esc(abTr("ab_saving",{s:abMoney(q.saving_vs_monthly)}))}</div>`;
  const nG=q.gifts.length;
  h+=`<div class="ab-chips">${q.users?`<span>${esc(abTr("ab_users",{n:q.users}))}</span>`:""}${q.sectors.length?`<span>${esc(abTr("ab_sectors_n",{n:q.sectors.length}))}</span>`:""}${nG?`<span class="g">${esc(abTr("ab_gifted_n",{n:nG}))}</span>`:""}</div>`;
  const company=_ab.offer?.is_company;
  if(q.nothing_to_pay)h+=`<button class="btn btn-o" style="width:100%;margin-top:12px" disabled>${esc(t("ab_nothing"))}</button>`;
  else h+=`<button class="btn btn-g" style="width:100%;margin-top:12px" ${company?"disabled":""} onclick="abSubscribe()"><i class="ti ti-building-bank"></i> ${esc(t("ab_pay"))}</button>`;
  h+=`<div style="font-size:11px;color:var(--muted);margin-top:8px">${esc(t("ab_pay_note"))}</div>`;
  box.innerHTML=h;
  abUpdateMbar();
}
async function abSubscribe(){
  const q=_ab.quote;if(!q||q.nothing_to_pay)return;
  if(!confirm(abTr("ab_confirm",{a:abMoney(q.total)})))return;
  try{
    const r=await api("POST","/billing/subscribe-sectors",{selection:_ab.sel,billing_cycle:_ab.cycle});
    _lastWire=r;showWireModal(r);
    _ab.offer=await api("GET","/billing/my-offer");abRender();
  }catch(e){showToast(e.message,"error");}
}

// ── Administration : offre d'un compte ──
let _abAdm=null;
async function abAdminOffer(uid){
  try{
    await abCatalog();
    _abAdm=await api("GET",`/admin/users/${uid}/offer`);_abAdm.uid=uid;abAdminRender();
  }catch(e){showToast(e.message,"error");}
}
function abAdminRender(){
  const o=_abAdm;const d=o.deal_raw||{};const g=o.gifts_raw||{};const gs=g.sectors||{};const a=o.account;
  const secs=_ab.cat.sectors;
  const chk=(id,on,lab)=>`<label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="${id}" ${on?"checked":""}> ${lab}</label>`;
  const scopeSome=(d.scope||"all")==="some";
  const html=`<div class="modal-title"><i class="ti ti-discount-2" style="color:var(--green)"></i> Conditions spéciales — ${esc(a.company_name||a.name)}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:12px">${esc(a.email)} · ${a.account_type==="client"?"compte client":"compte gérant"} · inscrit le ${fmtDate(a.created_at)}${o.subscription?` · abonnement : ${esc(Object.entries(o.subscription.selection||{}).map(([k,v])=>abShort(k)+" "+abTierLabel(AB_TIERS.indexOf(v))).join(" + ")||"ancienne formule")} jusqu'au ${fmtDate(o.subscription.expires_at)}`:""}</div>
    <div class="ab-adm">
      <div class="card2"><div style="font-weight:700;margin-bottom:6px">Remise personnalisée</div><div style="font-size:12px;color:var(--muted);margin-bottom:8px">Une réduction en plus, sur toutes ses formules ou sur certains secteurs.</div>
        <div class="fgrp"><label class="fl">Remise (%)</label><input class="inp" type="number" id="abm-pct" min="0" max="100" step="1" value="${d.pct||0}"></div>
        <div class="fgrp"><label class="fl">S'applique à</label><select class="inp" id="abm-scope" onchange="document.getElementById('abm-secs').style.display=this.value==='some'?'grid':'none'"><option value="all" ${!scopeSome?"selected":""}>Toutes ses formules</option><option value="some" ${scopeSome?"selected":""}>Seulement les secteurs cochés</option></select></div>
        <div id="abm-secs" class="ab-adm-secs" style="display:${scopeSome?"grid":"none"}">${secs.map(s=>chk("abm-s-"+s.key,(d.sectors||[]).includes(s.key),esc(abShort(s.key)))).join("")}</div>
        <div class="ab-adm-end"><div class="fgrp" style="flex:1"><label class="fl">Valable jusqu'au</label><input class="inp" type="date" id="abm-until" value="${esc(d.until||"")}" ${d.pct&&!d.until?"disabled":""}></div>${chk("abm-forever",!!(d.pct&&!d.until),"Sans fin")}</div>
        ${chk("abm-nocap",!!d.no_cap,"Ignorer le plafond de 70 % pour ce compte")}
        <div style="font-size:11px;color:var(--muted);margin:4px 0 8px">Décoché : le client paie toujours au moins 30 % du prix. Coché : ta remise s'applique en entier.</div>
        <div class="fgrp"><label class="fl">Note interne (le client ne la voit pas)</label><textarea class="inp" id="abm-note" rows="2">${esc(d.note||"")}</textarea></div></div>
      <div class="card2"><div style="font-weight:700;margin-bottom:6px">Accès offert</div><div style="font-size:12px;color:var(--muted);margin-bottom:8px">Des formules actives sans paiement, même s'il ne paie qu'une seule formule ou rien du tout.</div>
        ${secs.map(s=>`<div class="ab-adm-gift"><span>${esc(abSectorLabel(s.key))}</span><select class="inp" id="abm-g-${s.key}"><option value="">Non offert</option>${s.prices.map((p,i)=>p==null?"":`<option value="${AB_TIERS[i]}" ${gs[s.key]===AB_TIERS[i]?"selected":""}>${abTierLabel(i)} offert</option>`).join("")}</select></div>`).join("")}
        <div class="ab-adm-end"><div class="fgrp" style="flex:1"><label class="fl">Accès offert jusqu'au</label><input class="inp" type="date" id="abm-guntil" value="${esc(g.until||"")}" ${Object.keys(gs).length&&!g.until?"disabled":""}></div>${chk("abm-gforever",!!(Object.keys(gs).length&&!g.until),"Sans fin")}</div>
        <div style="font-size:11px;color:var(--muted)">Avec une date de fin, la formule offerte s'arrête ce jour-là. Le client peut aussi passer à une formule supérieure en la payant.</div></div>
    </div>
    <div style="font-size:12px;color:var(--muted);margin:10px 0">Modifiable à tout moment : tu peux changer le pourcentage, ajouter une date de fin ou la retirer.</div>
    <div class="card2" style="margin-top:6px"><div style="font-weight:700;margin-bottom:6px">Parrainage</div>
      <div style="font-size:13px;margin-bottom:6px">${o.referred_by?`Invité par <b>${esc(o.referred_by.name)}</b> (${esc(o.referred_by.email)})`:"Inscrit sans code de parrainage"} · Filleuls : <b>${o.referral.filleuls}</b> · Palier acquis : <b>${o.referral.best}</b> (−${o.referral.discount_pct} % à vie)</div>
      ${(o.filleuls||[]).length?`<div style="max-height:200px;overflow:auto">${o.filleuls.map(f=>`<div class="ab-fl"><span>${esc(f.company)} <span style="color:var(--muted);font-size:11px">${esc(f.email)}${f.account_type==="client"?" · client":""}</span></span><button class="btn btn-sm ${f.void?"btn-g":"btn-o"}" onclick="abAdminVoid('${f.id}',${!f.void})">${f.void?"Rétablir":"Retirer"}</button></div>`).join("")}</div>`:`<div style="font-size:12px;color:var(--muted)">Aucun filleul.</div>`}
      <div style="font-size:11px;color:var(--muted);margin-top:6px">« Retirer » un filleul suspect recalcule ses paliers.</div></div>
    <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-ab-admin')">Fermer</button><button class="btn btn-g btn-sm" onclick="abAdminSave()"><i class="ti ti-device-floppy"></i> Enregistrer</button></div>`;
  zdModal("modal-ab-admin",html,760);
  const tog=(c,i)=>{const cb=document.getElementById(c);cb.onchange=()=>{document.getElementById(i).disabled=cb.checked;};};
  tog("abm-forever","abm-until");tog("abm-gforever","abm-guntil");
}
async function abAdminSave(){
  const secs=_ab.cat.sectors;
  const pct=parseFloat(zdVal("abm-pct").replace(",","."))||0;
  const scope=zdVal("abm-scope");
  const forever=document.getElementById("abm-forever").checked,gforever=document.getElementById("abm-gforever").checked;
  const until=forever?null:(zdVal("abm-until")||null),guntil=gforever?null:(zdVal("abm-guntil")||null);
  if(pct>0&&!forever&&!until){showToast("Choisis une date de fin ou coche « Sans fin »","error");return;}
  const gifts={};secs.forEach(s=>{const v=zdVal("abm-g-"+s.key);if(v)gifts[s.key]=v;});
  if(Object.keys(gifts).length&&!gforever&&!guntil){showToast("Choisis une date de fin pour l'accès offert ou coche « Sans fin »","error");return;}
  const body={deal:{pct,scope,sectors:secs.filter(s=>document.getElementById("abm-s-"+s.key)?.checked).map(s=>s.key),until,no_cap:document.getElementById("abm-nocap").checked,note:zdVal("abm-note")||null},
              gifts:{sectors:gifts,until:guntil}};
  try{_abAdm={...(await api("PUT",`/admin/users/${_abAdm.uid}/offer`,body)),uid:_abAdm.uid};showToast("Conditions enregistrées ✓");abAdminRender();if(typeof loadAdminUsers==="function")loadAdminUsers();}
  catch(e){showToast(e.message,"error");}
}
async function abAdminVoid(fid,v){
  try{await api("PATCH",`/admin/referrals/${fid}`,{void:v});await abAdminOffer(_abAdm.uid);}catch(e){showToast(e.message,"error");}
}

// ── Espace client ──
let _cs={data:null,tab:"all"};
const CS_GROUPS={orders:"cs_tab_orders",reservations:"cs_tab_res",invoices:"cs_tab_inv"};
async function showClientSpace(){
  document.getElementById("auth-screen").style.display="none";
  const land=document.getElementById("landing");if(land)land.style.display="none";
  document.getElementById("app-screen").style.display="none";
  document.querySelector(".bottom-nav")?.classList.remove("show");
  const box=document.getElementById("client-space");box.style.display="block";
  document.body.classList.add("zd-app-visible");
  box.innerHTML=`<div style="color:var(--muted);padding:40px;text-align:center">${t("loading")}</div>`;
  await csSyncLocal();
  await csLoad();
}
async function csSyncLocal(){
  let l=[];try{l=JSON.parse(localStorage.getItem("zd_my_orders")||"[]");}catch(_){}
  await Promise.all(l.slice(0,20).map(x=>zdClientLink("order",x.token)));
}
async function csLoad(){
  try{_cs.data=await api("GET","/me/space");}catch(e){document.getElementById("client-space").innerHTML=`<div class="card" style="color:var(--red);margin:20px">${esc(e.message)}</div>`;return;}
  csRender();
}
function csStatus(s){const k="cs_st_"+s;const o="oc_st_"+s;return t(k)!==k?t(k):(t(o)!==o?t(o):s);}
function csStatusBadge(s){const good=["completed","paid","confirmed","done","checked_out","accepted","ready"],bad=["cancelled","rejected","no_show","overdue"];return `<span class="badge ${good.includes(s)?"bg":bad.includes(s)?"br":"ba"}">${esc(csStatus(s))}</span>`;}
function csItem(it){
  let title="",lines=[],open=null,st=it.status;
  if(it.kind==="order"){title=abTr("cs_order",{n:it.number});lines.push(abMoney(it.total)+" · "+fmtDate(it.created_at));open=`?order=${encodeURIComponent(it.token)}`;}
  else if(it.kind==="portal"){
    title=it.client_name||"";const unpaid=(it.invoices||[]).filter(i=>i.balance_due>0&&!["paid","cancelled","draft"].includes(i.status));
    lines.push(abTr("cs_invoices_n",{n:(it.invoices||[]).length}));
    const pq=(it.quotes||[]).filter(q=>q.status==="sent").length;if(pq)lines.push(abTr("cs_quotes_pending",{n:pq}));
    if(it.balance_usd>0.004)lines.push(abTr("cs_balance",{a:abMoney(it.balance_usd)}));
    if(it.loyalty)lines.push(abTr("cs_points",{p:it.loyalty.points}));
    (it.invoices||[]).slice(0,3).forEach(i=>lines.push(`${i.number} · ${fmtMoney(i.total,i.currency||"USD")} · ${csStatus(i.status)}`));
    st=unpaid.length?"overdue_or_due":null;open=`?portal=${encodeURIComponent(it.token)}`;
  }else if(it.kind==="appointment"){title=it.service||t("cs_appt_t");lines.push(abTr("cs_appt",{d:abDate(it.local_date||it.start_at),h:it.local_time||""}));open=`?bookcancel=${encodeURIComponent(it.token)}`;}
  else if(it.kind==="hotel"){title=(it.room_type||t("cs_hotel_t"))+" · "+it.number;lines.push(abTr("cs_hotel",{a:abDate(it.check_in),b:abDate(it.check_out),n:it.nights}));lines.push(abMoney(it.total));}
  else if(it.kind==="salon"){title=(it.services||[]).join(", ")||t("cs_salon_t");lines.push(abTr("cs_salon",{d:abDate(it.day),h:it.time})+(it.staff_name?" · "+abTr("cs_with",{s:it.staff_name}):""));lines.push(abMoney(it.total));}
  return `<div class="cs-item card2"><div class="cs-item-h"><div><div class="cs-biz">${esc(it.business||"")}</div><b>${esc(title)}</b></div>${st&&st!=="overdue_or_due"?csStatusBadge(st):st==="overdue_or_due"?`<span class="badge ba">${esc(t("cs_to_pay"))}</span>`:""}</div>
    ${lines.map(l=>`<div class="cs-line">${esc(l)}</div>`).join("")}
    <div class="cs-actions">${open?`<a class="btn btn-sm btn-g" href="${open}"><i class="ti ti-external-link"></i> ${esc(t("cs_open"))}</a>`:""}<button class="btn btn-sm btn-o" onclick="csRemove('${it.id}')"><i class="ti ti-x"></i> ${esc(t("cs_remove"))}</button></div></div>`;
}
function csRender(){
  const d=_cs.data;const box=document.getElementById("client-space");
  const items=(d.items||[]).filter(i=>_cs.tab==="all"||i.group===_cs.tab);
  const counts={all:(d.items||[]).length};Object.keys(CS_GROUPS).forEach(g=>counts[g]=(d.items||[]).filter(i=>i.group===g).length);
  const secOpts=(window._zdSectors||[]).length?window._zdSectors.map(s=>`<option value="${s.key}">${esc(abSectorLabel(s.key))}</option>`).join(""):["pme","restaurant","bar","hotel","beauty","retail","pharmacy","cold"].map(k=>`<option value="${k}">${esc(t("sector_"+k)!=="sector_"+k?t("sector_"+k):k)}</option>`).join("");
  box.innerHTML=`<div class="cs-wrap"><div class="cs-top"><div class="logo"><div class="logo-icon">⚡</div>Zenith <span>Dash</span></div><button class="btn btn-o btn-sm" onclick="doLogout();document.getElementById('client-space').style.display='none'"><i class="ti ti-logout"></i> ${esc(t("cs_logout"))}</button></div>
    <h1 class="cs-h1">${esc(abTr("cs_hello",{n:(d.name||"").split(" ")[0]}))}</h1><div class="cs-sub">${esc(t("cs_sub"))}</div>
    <div class="cs-tabs" role="tablist">${["all",...Object.keys(CS_GROUPS)].map(g=>`<button type="button" role="tab" aria-selected="${_cs.tab===g}" class="${_cs.tab===g?"on":""}" onclick="_cs.tab='${g}';csRender()">${esc(t(g==="all"?"cs_tab_all":CS_GROUPS[g]))} <span>${counts[g]}</span></button>`).join("")}</div>
    <div class="cs-list">${items.length?items.map(csItem).join(""):`<div class="cs-empty"><i class="ti ti-inbox"></i><div>${esc(t("cs_empty"))}</div></div>`}</div>
    <div class="card2 cs-add"><div style="font-weight:700">${esc(t("cs_add_t"))}</div><div style="font-size:12px;color:var(--muted);margin:4px 0 8px">${esc(t("cs_add_x"))}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input class="inp" id="cs-link" style="flex:1;min-width:0" placeholder="https://zenithdash.org/?order=…"><button class="btn btn-g btn-sm" onclick="csAddLink()">${esc(t("cs_add_btn"))}</button></div></div>
    <div class="card2 cs-biz-card"><div style="font-weight:700;font-size:15px"><i class="ti ti-building-store" style="color:var(--green)"></i> ${esc(t("cs_open_biz_t"))}</div><div style="font-size:13px;color:var(--muted);margin:4px 0 10px">${esc(t("cs_open_biz_x"))}</div>
      <div id="cs-biz-form" style="display:none"><div class="fgrp"><label class="fl">${esc(t("cs_company"))}</label><input class="inp" id="cs-company"></div><div class="fgrp"><label class="fl">${esc(t("cs_sector"))}</label><select class="inp" id="cs-sector">${secOpts}</select></div>
        <button class="btn btn-g" style="width:100%" onclick="csBecomeManager()"><i class="ti ti-rocket"></i> ${esc(t("cs_start"))}</button></div>
      <button class="btn btn-o btn-sm" id="cs-biz-open" onclick="this.style.display='none';document.getElementById('cs-biz-form').style.display='block'">${esc(t("cs_open_biz_btn"))}</button></div>
    <div class="cs-foot">${typeof legalLinksHtml==="function"?legalLinksHtml():""}</div></div>`;
}
function csParseLink(v){
  v=(v||"").trim();if(!v)return null;
  let q=null;try{q=new URL(v,window.location.origin).searchParams;}catch(_){return null;}
  if(q.get("order"))return{kind:"order",token:q.get("order")};
  if(q.get("portal"))return{kind:"portal",token:q.get("portal")};
  if(q.get("bookcancel"))return{kind:"appointment",token:q.get("bookcancel")};
  return null;
}
async function csAddLink(){
  const p=csParseLink(zdVal("cs-link"));if(!p){showToast(t("cs_add_bad"),"error");return;}
  try{await api("POST","/me/links",p);showToast(t("cs_added"));await csLoad();}catch(e){showToast(e.message,"error");}
}
async function csRemove(id){if(!confirm(t("cs_remove_confirm")))return;try{await api("DELETE",`/me/links/${id}`);await csLoad();}catch(e){showToast(e.message,"error");}}
async function csBecomeManager(){
  const company=zdVal("cs-company");if(!company){showToast(t("cs_company_req"),"error");return;}
  try{
    const r=await api("POST","/account/become-manager",{company_name:company,sector:zdVal("cs-sector")||"pme"});
    State.tenant=r.user;localStorage.setItem("zd_tenant",JSON.stringify(r.user));
    document.getElementById("client-space").style.display="none";
    window._zdJustRegistered=true;
    showAppLayout();
  }catch(e){showToast(e.message,"error");}
}
