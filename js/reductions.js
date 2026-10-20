// ── 9.4.1 · RÉDUCTIONS GÉNÉRALES : actives tant que l'administrateur le décide ──
let _pr=null,_prEdit=null,_prBusy=false;
const PR_KINDS=["referral","sectors","duration"];
async function prLoad(){
  const box=document.getElementById("promo-admin");if(!box)return;
  if(!State.tenant?.is_creator){box.innerHTML="";return;}
  try{_pr=await api("GET","/admin/promos");prReset();prRender();}
  catch(e){box.innerHTML=`<div class="card" style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;}
}
function prReset(){_prEdit={};PR_KINDS.forEach(k=>{const s=_pr.promos[k];_prEdit[k]={on:!!s.on,until:s.until||null,mode:s.until?"date":"stop"};});}
function prTiers(k){
  const T=_pr.tiers;
  if(k==="referral")return T.referral.map(([n,p])=>[`−${p} %`,abTr("pr_tier_ref",{n})]);
  if(k==="sectors")return T.sectors.map(([n,p],i)=>[`−${p} %`,abTr(i===T.sectors.length-1?"pr_tier_sec_plus":"pr_tier_sec",{n})]);
  return T.duration.filter(([n])=>n>1).map(([n,p])=>[`−${p} %`,abTr("pr_tier_months",{n})]);
}
function prSay(k){
  const s=_prEdit[k];if(!s.on)return t("pr_say_off");
  const x=t("pr_say_"+k);
  return s.mode==="date"&&s.until?abTr("pr_say_until",{x,d:abDate(s.until)}):abTr("pr_say_while",{x});
}
function prStatus(k){
  const s=_pr.promos[k];
  if(s.ended)return `<span class="badge br">${esc(abTr("pr_st_ended",{d:abDate(s.until)}))}</span>`;
  if(!s.on)return `<span class="badge ba">${esc(t("pr_st_off"))}</span>`;
  if(s.until)return `<span class="badge ba">${esc(abTr("pr_st_until",{d:abDate(s.until)}))}</span>`;
  return `<span class="badge bg">${esc(t("pr_st_active"))}</span>`;
}
function prCard(k){
  const s=_prEdit[k],on=s.on,date=s.mode==="date";
  const tiers=prTiers(k).map(([a,b])=>`<div class="pr-ti"><b>${esc(a)}</b><small>${esc(b)}</small></div>`).join("");
  return `<section class="pr-card${on?"":" off"}" id="pr-${k}">
    <div class="pr-hd"><div style="min-width:0"><div class="pr-t">${esc(t("pr_kind_"+k))}</div><div class="pr-x">${esc(t("pr_kind_"+k+"_x"))}</div>
      <div class="pr-meta">${prStatus(k)}<span>${esc(abTr("pr_concerned",{n:_pr.promos[k].concerned}))}</span></div></div>
      <button type="button" class="pr-sw${on?" on":""}" role="switch" aria-checked="${on}" aria-label="${esc(t("pr_kind_"+k))}" onclick="prToggle('${k}')"><span></span></button></div>
    <div class="pr-tiers">${tiers}</div>${k==="duration"?`<div class="pr-x">${esc(abTr("pr_free",{f:_pr.tiers.free_count,e:_pr.tiers.free_every}))}</div>`:""}
    <div><div class="pr-lbl">${esc(t("pr_duration_lbl"))}</div>
      <div class="pr-seg"><button type="button" class="${!date?"on":""}" aria-pressed="${!date}" onclick="prMode('${k}','stop')">${esc(t("pr_until_stop"))}</button><button type="button" class="${date?"on":""}" aria-pressed="${date}" onclick="prMode('${k}','date')">${esc(t("pr_until_date"))}</button>
      ${date?`<input class="inp pr-date" type="date" id="pr-d-${k}" min="${_pr.today}" value="${esc(s.until||"")}" aria-label="${esc(t("pr_end_date"))}" onchange="prDate('${k}',this.value)">`:""}</div></div>
    <div class="pr-pv"><i class="ti ti-eye"></i><span>${esc(t("pr_reader"))} <b>${esc(prSay(k))}</b></span></div>
  </section>`;
}
function prRender(){
  const box=document.getElementById("promo-admin");if(!box||!_pr)return;
  const rules=[1,2,3,4,5].map(i=>`<li><span>${i}</span>${esc(t("pr_rule_"+i))}</li>`).join("");
  box.innerHTML=`<div class="card pr-wrap"><div class="pr-top"><div><div style="font-weight:800;font-size:16px"><i class="ti ti-discount-2" style="color:var(--green)"></i> ${esc(t("pr_title"))}</div><div class="pr-x" style="margin-top:4px">${esc(t("pr_sub"))}</div></div>
    <button class="btn btn-g btn-sm" id="pr-save" onclick="prSave()" ${_prBusy?"disabled":""}><i class="ti ti-check"></i> ${esc(t("pr_save"))}</button></div>
    <div class="pr-grid">${PR_KINDS.map(prCard).join("")}
      <aside class="pr-card pr-rules"><div class="pr-t">${esc(t("pr_rules_t"))}</div><ol>${rules}</ol>
        <div class="pr-always"><b>${esc(t("pr_always_t"))}</b><br>${esc(abTr("pr_always_x",{p:_pr.cap_pct}))}</div></aside></div></div>`;
}
function prToggle(k){_prEdit[k].on=!_prEdit[k].on;prRender();}
function prMode(k,m){_prEdit[k].mode=m;if(m==="stop")_prEdit[k].until=null;prRender();if(m==="date")setTimeout(()=>document.getElementById("pr-d-"+k)?.focus(),30);}
function prDate(k,v){_prEdit[k].until=v||null;prRender();}
async function prSave(){
  if(_prBusy)return;
  const body={};
  for(const k of PR_KINDS){
    const s=_prEdit[k];
    if(s.on&&s.mode==="date"&&!s.until){showToast(abTr("pr_need_date",{n:t("pr_kind_"+k)}),"error");document.getElementById("pr-d-"+k)?.focus();return;}
    if(s.on&&s.mode==="date"&&s.until<_pr.today){showToast(t("pr_date_past"),"error");return;}
    body[k]={on:s.on,until:s.on&&s.mode==="date"?s.until:null};
  }
  const stops=PR_KINDS.filter(k=>_pr.promos[k].active&&!body[k].on);
  for(const k of stops){if(!confirm(abTr("pr_confirm_stop",{n:t("pr_kind_"+k),c:_pr.promos[k].concerned})))return;}
  _prBusy=true;prRender();
  try{
    const r=await api("PUT","/admin/promos",body);_pr=r;prReset();
    const n=Object.values(r.notified||{}).reduce((a,b)=>a+b,0);
    showToast(n?abTr("pr_saved_n",{n}):t("pr_saved"));
  }catch(e){showToast(e.message,"error");}
  finally{_prBusy=false;prRender();}
}
if(typeof loadCreatorDashboard==="function"){const _prX=loadCreatorDashboard;loadCreatorDashboard=async function(){const r=await _prX.apply(this,arguments);prLoad();return r;};}
