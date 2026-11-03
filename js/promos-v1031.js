// ── 10.3.1 · Promotions ──
let _pm=null,_pmF=null,_pmEdit=null,_pmBusy=false,_pmSearchT=null;
function pmFresh(){
  const today=_pm?.today||new Date().toISOString().slice(0,10);
  return {name:"",pct:"",who:"all",places:"",targets:[],tiers:{essentiel:true,pro:true,premium:true},start:today,end:"",ch:{notif:true,email:!!_pm?.email,banner:true}};
}
function pmD(iso){if(!iso)return"";const[y,m,d]=String(iso).split("-");return `${d}/${m}/${y}`;}
function pmTierTxt(tiers){const all=AB_TIERS.every(k=>tiers.includes(k));return all?"toutes les formules":AB_TIERS.filter(k=>tiers.includes(k)).map(k=>t("ab_tier_"+k)).join(", ");}
function pmWhoTxt(p){
  if(p.who==="first")return `Les ${p.places} premiers qui paient · ${p.used} place${p.used>1?"s":""} prise${p.used>1?"s":""}${p.pending?`, ${p.pending} en attente de paiement`:""}, ${p.left} restante${p.left>1?"s":""}`;
  if(p.who==="list")return `${p.targets_count} compte${p.targets_count>1?"s":""} choisi${p.targets_count>1?"s":""}`;
  return "Tout le monde";
}
function pmStatusBadge(p){
  const m={active:["bg","En cours"],scheduled:["bb","À venir · dès le "+pmD(p.start)],stopped:["badge-gray","Arrêtée"],ended:["badge-gray","Terminée"],full:["ba","Toutes les places prises"]};
  const[c,l]=m[p.status]||["badge-gray",p.status];return `<span class="badge ${c}">${esc(l)}</span>`;
}
async function pmLoad(){
  const host=document.getElementById("promo-admin");if(!host||!State.tenant?.is_creator)return;
  let box=document.getElementById("pm-admin");
  if(!box){box=document.createElement("div");box.id="pm-admin";box.style.marginBottom="18px";host.after(box);}
  try{_pm=await api("GET","/admin/promo-campaigns");if(!_pmF)_pmF=pmFresh();pmRender();}
  catch(e){box.innerHTML=`<div class="card" style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;}
}
function pmRowHtml(p){
  const live=p.status==="active"||p.status==="scheduled";
  const bar=p.who==="first"&&p.places?`<div class="pm-bar" role="img" aria-label="${p.used} sur ${p.places}"><i style="width:${Math.min(100,Math.round((p.used+p.pending)/p.places*100))}%"></i></div>`:"";
  const ch=[p.notif_total?`notifications ${p.notif_done}/${p.notif_total}`:"",p.mail_total?`e-mails ${p.mail_sent}/${p.mail_total}${p.mail_failed?` · ${p.mail_failed} échec${p.mail_failed>1?"s":""}`:""}`:""].filter(Boolean).join(" · ");
  const edit=_pmEdit&&_pmEdit.id===p.id;
  return `<div class="pm-row${live?"":" off"}"><div class="pm-row-m">
      <div class="pm-row-t"><b>${esc(p.name)}</b> <span class="badge bg">−${p.pct} %</span> ${pmStatusBadge(p)}${p.end?` <span class="badge ba">jusqu'au ${pmD(p.end)}</span>`:""}</div>
      <div class="pm-row-s">${esc(pmWhoTxt(p))} · ${esc(pmTierTxt(p.tiers))}${p.discount_total>0?` · réductions accordées : ${abMoney(p.discount_total)}`:""}</div>${bar}
      ${ch?`<div class="pm-row-s">${esc(ch)}</div>`:""}${!live&&p.ended_reason?`<div class="pm-row-s">${esc(p.ended_reason)}</div>`:""}</div>
    ${live?`<div class="pm-row-b"><button type="button" class="btn btn-o btn-sm" onclick="pmStartEdit('${p.id}')"><i class="ti ti-pencil" aria-hidden="true"></i> Modifier</button><button type="button" class="btn btn-r btn-sm" onclick="pmStop('${p.id}')"><i class="ti ti-player-stop" aria-hidden="true"></i> Arrêter</button></div>`:""}
    ${edit?pmEditHtml(p):""}</div>`;
}
function pmEditHtml(p){
  const e=_pmEdit;
  return `<div class="pm-edit" id="pm-edit"><div class="pm-grid">
    <div class="fgrp"><label class="fl" for="pme-name">Nom affiché aux clients</label><input class="inp" id="pme-name" maxlength="60" value="${esc(e.name)}"></div>
    <div class="fgrp"><label class="fl" for="pme-pct">Réduction</label><div class="pm-num"><input class="inp" id="pme-pct" type="number" min="1" max="${_pm.max_pct}" value="${e.pct}" inputmode="numeric"> <b>%</b></div></div>
    ${p.who==="first"?`<div class="fgrp"><label class="fl" for="pme-places">Nombre de places</label><div class="pm-num"><input class="inp" id="pme-places" type="number" min="${p.used||1}" value="${e.places}" inputmode="numeric"> <span>personnes</span></div></div>`:""}
    <div class="fgrp"><label class="fl" for="pme-end">Jusqu'au</label><input class="inp" type="date" id="pme-end" min="${_pm.today}" value="${esc(e.end||"")}"><small class="pm-hint">Vide = jusqu'à ce que tu l'arrêtes</small></div></div>
    <div class="fgrp"><span class="fl">Formules concernées</span><div class="pm-checks">${AB_TIERS.map(k=>`<label><input type="checkbox" class="pme-tier" value="${k}" ${e.tiers.includes(k)?"checked":""}> ${esc(t("ab_tier_"+k))}</label>`).join("")}</div></div>
    <div class="pm-btns"><button type="button" class="btn btn-o btn-sm" onclick="_pmEdit=null;pmRender()">Annuler</button><button type="button" class="btn btn-g btn-sm" onclick="pmSaveEdit()"><i class="ti ti-check" aria-hidden="true"></i> Enregistrer</button></div></div>`;
}
function pmFormHtml(){
  const f=_pmF;
  const opt=(v,title,sub,extra)=>`<label class="pm-opt${f.who===v?" on":""}"><input type="radio" name="pm-who" value="${v}" ${f.who===v?"checked":""} onchange="pmSet('who','${v}')"><span><b>${title}</b><small>${sub}</small>${f.who===v&&extra?extra:""}</span></label>`;
  const chips=f.targets.map((x,i)=>`<span class="pm-chip">${esc(x.label)}<button type="button" aria-label="Retirer ${esc(x.label)}" onclick="pmRemoveTarget(${i})">×</button></span>`).join("");
  const listExtra=`<div class="pm-chips">${chips}</div><div class="pm-search"><input class="inp" id="pm-q" placeholder="Nom, entreprise ou e-mail" autocomplete="off" oninput="pmSearch(this.value)" aria-label="Chercher un compte"><div id="pm-res" class="pm-res" role="listbox"></div></div>`;
  return `<div class="pm-new"><div class="pm-h2">Nouvelle promotion</div>
    <div class="pm-grid">
      <div class="fgrp"><label class="fl" for="pm-name">Nom affiché aux clients</label><input class="inp" id="pm-name" maxlength="60" placeholder="Ex. : Fête de l'indépendance" value="${esc(f.name)}" oninput="_pmF.name=this.value"></div>
      <div class="fgrp"><label class="fl" for="pm-pct">Réduction</label><div class="pm-num"><input class="inp" id="pm-pct" type="number" min="1" max="${_pm.max_pct}" placeholder="20" value="${esc(f.pct)}" inputmode="numeric" oninput="_pmF.pct=this.value"> <b>%</b> <small class="pm-hint">de 1 à ${_pm.max_pct} %</small></div></div>
    </div>
    <div class="fgrp"><span class="fl">Qui en profite</span><div class="pm-who" role="radiogroup">
      ${opt("all","Tout le monde","Chaque gérant qui paie pendant la promotion.")}
      ${opt("first","Les premiers qui paient","Dès que les places sont prises, la promotion s'arrête toute seule.",`<span class="pm-num"><input class="inp" id="pm-places" type="number" min="1" placeholder="50" value="${esc(f.places)}" inputmode="numeric" oninput="_pmF.places=this.value" aria-label="Nombre de personnes"> personnes</span>`)}
      ${opt("list","Des comptes choisis","De 1 à autant de comptes que tu veux.",listExtra)}
    </div></div>
    <div class="pm-grid">
      <div class="fgrp"><span class="fl">Formules concernées</span><div class="pm-checks">${AB_TIERS.map(k=>`<label><input type="checkbox" ${f.tiers[k]?"checked":""} onchange="_pmF.tiers['${k}']=this.checked"> ${esc(t("ab_tier_"+k))}</label>`).join("")}</div></div>
      <div class="fgrp"><span class="fl">Dates</span><div class="pm-dates"><span>du</span><input class="inp" type="date" id="pm-start" min="${_pm.today}" value="${esc(f.start)}" onchange="_pmF.start=this.value" aria-label="Date de début"><span>au</span><input class="inp" type="date" id="pm-end" min="${_pm.today}" value="${esc(f.end)}" onchange="_pmF.end=this.value" aria-label="Date de fin"></div><small class="pm-hint">Fin vide = jusqu'à ce que tu l'arrêtes</small></div>
      <div class="fgrp"><span class="fl">Prévenir les comptes concernés</span><div class="pm-checks">
        <label><input type="checkbox" ${f.ch.notif?"checked":""} onchange="_pmF.ch.notif=this.checked"> Notification</label>
        <label class="${_pm.email?"":"dis"}"><input type="checkbox" ${f.ch.email&&_pm.email?"checked":""} ${_pm.email?"":"disabled"} onchange="_pmF.ch.email=this.checked"> E-mail</label>
        <label><input type="checkbox" ${f.ch.banner?"checked":""} onchange="_pmF.ch.banner=this.checked"> Bandeau sur le site</label></div>
        ${_pm.email?"":`<small class="pm-hint">E-mail : envoi non configuré (BREVO_API_KEY dans Railway)</small>`}</div>
    </div>
    <div class="pm-note">S'ajoute aux autres réductions (plusieurs secteurs, plusieurs mois, parrainage, remise personnelle) sans jamais dépasser le plafond de ${_pm.cap_pct} %. Le prix obtenu pendant la promotion reste acquis pour toute la période payée. Une place est comptée quand le paiement est confirmé ; une commande en attente garde sa place tant que son virement est valable. Les e-mails partent en même temps que les annonces, dans la même limite par jour.</div>
    <div class="err-box" id="pm-err"></div>
    <div class="pm-btns"><button type="button" class="btn btn-o btn-sm" onclick="pmPreview()"><i class="ti ti-eye" aria-hidden="true"></i> Aperçu</button><button type="button" class="btn btn-g btn-sm" id="pm-go" onclick="pmLaunch()" ${_pmBusy?"disabled":""}><i class="ti ti-rocket" aria-hidden="true"></i> Lancer la promotion</button></div></div>`;
}
function pmRender(){
  const box=document.getElementById("pm-admin");if(!box||!_pm)return;
  const q=document.getElementById("pm-q");const qv=q?q.value:"";const hadFocus=document.activeElement&&document.activeElement.id==="pm-q";
  const items=_pm.items||[];
  const live=items.filter(p=>p.status==="active"||p.status==="scheduled"),past=items.filter(p=>!(p.status==="active"||p.status==="scheduled")).slice(0,5);
  box.innerHTML=`<div class="card pm-card"><div class="pm-head"><div><div class="pm-title"><i class="ti ti-discount-2" aria-hidden="true"></i> Promotions</div>
      <div class="pm-sub">Une réduction en plus, pour tout le monde ou pour un nombre de personnes, le temps que tu choisis.</div></div></div>
    ${live.map(pmRowHtml).join("")}
    ${pmFormHtml()}
    ${past.length?`<details class="pm-past"><summary>Promotions passées (${past.length})</summary>${past.map(pmRowHtml).join("")}</details>`:""}</div>`;
  const nq=document.getElementById("pm-q");if(nq&&qv){nq.value=qv;}if(nq&&hadFocus){nq.focus();}
}
function pmSet(k,v){_pmF[k]=v;pmRender();}
function pmSearch(v){
  clearTimeout(_pmSearchT);const res=document.getElementById("pm-res");if(!res)return;
  if((v||"").trim().length<2){res.innerHTML="";return;}
  _pmSearchT=setTimeout(async()=>{
    try{const r=await api("GET","/admin/promo-search?q="+encodeURIComponent(v.trim()));const box=document.getElementById("pm-res");if(!box)return;
      const have=new Set(_pmF.targets.map(x=>x.id));
      box.innerHTML=r.items.length?r.items.map(x=>`<button type="button" class="pm-res-i" role="option" ${have.has(x.id)?"disabled":""} onclick='pmAddTarget(${JSON.stringify({id:x.id,label:x.label}).replace(/'/g,"&#39;")})'><b>${esc(x.label)}</b><small>${esc(x.sub)}</small></button>`).join(""):`<div class="pm-res-e">Aucun compte trouvé</div>`;
    }catch(e){}
  },220);
}
function pmAddTarget(x){if(!_pmF.targets.some(y=>y.id===x.id))_pmF.targets.push(x);const q=document.getElementById("pm-q");if(q)q.value="";pmRender();setTimeout(()=>document.getElementById("pm-q")?.focus(),0);}
function pmRemoveTarget(i){_pmF.targets.splice(i,1);pmRender();}
function pmBody(){
  const f=_pmF;const tiers=AB_TIERS.filter(k=>f.tiers[k]);
  return {name:(f.name||"").trim(),pct:parseInt(f.pct,10),who:f.who,places:f.who==="first"?parseInt(f.places,10):null,targets:f.who==="list"?f.targets.map(x=>x.id):null,
          tiers,start:f.start||null,end:f.end||null,ch:{notif:!!f.ch.notif,email:!!f.ch.email&&!!_pm.email,banner:!!f.ch.banner}};
}
function pmValidate(b){
  if(b.name.length<2)return "Donne un nom à la promotion (affiché aux clients)";
  if(!(b.pct>=1&&b.pct<=_pm.max_pct))return `La réduction doit être entre 1 et ${_pm.max_pct} %`;
  if(b.who==="first"&&!(b.places>=1))return "Indique combien de personnes peuvent en profiter";
  if(b.who==="list"&&!b.targets.length)return "Ajoute au moins un compte";
  if(!b.tiers.length)return "Coche au moins une formule";
  if(b.end&&b.start&&b.end<b.start)return "La date de fin est avant la date de début";
  return null;
}
async function pmPreview(){
  const b=pmBody();
  try{
    const r=await api("POST","/admin/promo-campaigns/preview",{name:b.name||"Promotion",pct:b.pct||10,who:b.who,places:b.places,tiers:b.tiers.length?b.tiers:AB_TIERS,end:b.end});
    const ov=zdModal("modal-pm-preview",`<div class="modal-title"><i class="ti ti-eye" aria-hidden="true"></i> Aperçu de la promotion</div>
      <div class="pm-pv-l">Notification</div><div class="pm-pv-n"><b>${esc(r.notif_title)}</b><br>${esc(r.notif_body)}</div>
      ${b.ch.email?`<div class="pm-pv-l">E-mail · ${esc(r.email_subject)}</div><iframe class="pm-pv-f" sandbox title="Aperçu de l'e-mail"></iframe>`:""}
      <div class="modal-footer"><button class="btn btn-o btn-sm" onclick="zdCloseModal('modal-pm-preview')">Fermer</button></div>`,560);
    const fr=ov.querySelector("iframe");if(fr)fr.srcdoc=r.email_html;
  }catch(e){showToast(e.message,"error");}
}
async function pmLaunch(){
  const b=pmBody();const er=pmValidate(b);const box=document.getElementById("pm-err");
  if(er){if(box){box.textContent=er;box.style.display="block";}return;}
  if(box)box.style.display="none";
  const who=b.who==="first"?`les ${b.places} premiers qui paient`:b.who==="list"?`${b.targets.length} compte${b.targets.length>1?"s":""} choisi${b.targets.length>1?"s":""}`:"tout le monde";
  const when=b.start&&b.start>_pm.today?` à partir du ${pmD(b.start)}`:"";
  if(!confirm(`Lancer « ${b.name} » : −${b.pct} % pour ${who}${when}${b.end?`, jusqu'au ${pmD(b.end)}`:""} ?`))return;
  _pmBusy=true;pmRender();
  try{await api("POST","/admin/promo-campaigns",b);_pmF=null;showToast("Promotion lancée ✓");await pmLoad();}
  catch(e){const bx=document.getElementById("pm-err");if(bx){bx.textContent=e.message;bx.style.display="block";}else showToast(e.message,"error");}
  finally{_pmBusy=false;const g=document.getElementById("pm-go");if(g)g.disabled=false;}
}
function pmStartEdit(id){const p=(_pm.items||[]).find(x=>x.id===id);if(!p)return;_pmEdit={id,name:p.name,pct:p.pct,places:p.places||"",end:p.end||"",tiers:[...p.tiers]};pmRender();document.getElementById("pm-edit")?.scrollIntoView({block:"nearest"});}
async function pmSaveEdit(){
  const g=id=>document.getElementById(id);const tiers=[...document.querySelectorAll(".pme-tier")].filter(x=>x.checked).map(x=>x.value);
  const body={name:g("pme-name").value.trim(),pct:parseInt(g("pme-pct").value,10),tiers};
  const end=g("pme-end").value;if(end)body.end=end;else body.no_end=true;
  if(g("pme-places"))body.places=parseInt(g("pme-places").value,10);
  try{await api("PUT","/admin/promo-campaigns/"+_pmEdit.id,body);_pmEdit=null;showToast("Promotion modifiée ✓");await pmLoad();}
  catch(e){showToast(e.message,"error");}
}
async function pmStop(id){
  const p=(_pm.items||[]).find(x=>x.id===id);if(!p)return;
  if(!confirm(`Arrêter « ${p.name} » ? Les commandes déjà payées gardent leur prix ; les nouvelles commandes paient le prix normal.`))return;
  try{await api("POST",`/admin/promo-campaigns/${id}/stop`);showToast("Promotion arrêtée ✓");await pmLoad();}
  catch(e){showToast(e.message,"error");}
}
if(typeof prLoad==="function"){
  const _pmPL=prLoad;
  prLoad=async function(){const r=await _pmPL.apply(this,arguments);try{pmLoad();}catch(_){}return r;};
}

const PMC={data:null,at:0,busy:null};
function pmIsUser(){const u=State.tenant;return !!(State.token&&u&&!u.is_creator&&!u.member_role&&u.account_type!=="client");}
function pmFor(p){return AB_TIERS.every(k=>p.tiers.includes(k))?t("pm_f_all"):abTr("pm_f_some",{t:AB_TIERS.filter(k=>p.tiers.includes(k)).map(k=>t("ab_tier_"+k)).join(", ")});}
function pmLine(p){
  const parts=[];
  if(p.end)parts.push(abTr("pm_until",{d:typeof zdLongDate==="function"?zdLongDate(p.end):p.end}));
  if(p.places_left!=null&&!p.holder)parts.push(p.places_left===1?t("pm_left_1"):abTr("pm_left_n",{k:p.places_left}));
  return parts.join(" · ");
}
async function pmCurLoad(force){
  if(!pmIsUser()){PMC.data=null;pmBanRender();return;}
  if(!force&&Date.now()-PMC.at<10*60*1000)return;
  if(PMC.busy)return PMC.busy;
  PMC.busy=(async()=>{try{const r=await api("GET","/promo/current");PMC.data=r.promo;PMC.at=Date.now();}catch(_){}})();
  try{await PMC.busy;}finally{PMC.busy=null;}
  pmBanRender();
}
function pmBanEl(){
  let el=document.getElementById("pm-banner");
  if(!el){const main=document.querySelector("#app-screen .main");if(!main)return null;el=document.createElement("div");el.id="pm-banner";
    const fb=document.getElementById("fe-banner"),ob=document.getElementById("offline-bar");
    if(fb&&fb.parentNode===main)fb.after(el);else if(ob&&ob.parentNode===main)ob.after(el);else main.prepend(el);}
  return el;
}
function pmBanKey(id){return "zd_pm_dismiss_"+(State.tenant?.id||"")+"_"+id;}
function pmBanRender(){
  const el=pmBanEl();if(!el)return;
  const p=PMC.data;let dis=null;
  try{if(p)dis=localStorage.getItem(pmBanKey(p.id));}catch(_){}
  if(!p||!p.banner||dis||!pmIsUser()){el.innerHTML="";el.hidden=true;return;}
  el.hidden=false;el.className="pmb";
  const line=pmLine(p);
  el.innerHTML=`<span class="pmb-ic" aria-hidden="true"><i class="ti ti-discount-2"></i></span><div class="pmb-body"><b class="pmb-t">${esc(abTr("pm_ban_t",{n:p.name,p:p.pct,f:pmFor(p)}))}</b>
    <span class="pmb-x">${esc([line,t("pm_keep")].filter(Boolean).join(" · "))}</span>
    <button type="button" class="pmb-cta" onclick="navigate('billing')">${esc(t("pm_see"))}</button></div>
    <button type="button" class="pmb-close" aria-label="${esc(t("pm_close"))}" onclick="pmBanClose()"><i class="ti ti-x" aria-hidden="true"></i></button>`;
}
function pmBanClose(){const p=PMC.data;try{if(p)localStorage.setItem(pmBanKey(p.id),"1");}catch(_){}pmBanRender();}
if(typeof showAppLayout==="function"){
  const _pmSAL=showAppLayout;
  showAppLayout=async function(){PMC.data=null;PMC.at=0;pmBanRender();const r=await _pmSAL.apply(this,arguments);pmCurLoad(true).then(()=>{try{if(PMC.data&&document.querySelector("#page-billing.active")&&_ab&&_ab.cat&&_ab.offer)abRender();}catch(_){}});return r;};
}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&State.token)pmCurLoad(false);});
if(typeof applyLanguageNow==="function"){
  const _pmALN=applyLanguageNow;
  applyLanguageNow=function(){const r=_pmALN.apply(this,arguments);try{pmBanRender();}catch(_){}return r;};
}
if(typeof abStatusHtml==="function"){
  const _pmAS=abStatusHtml;
  abStatusHtml=function(){
    const h=_pmAS.apply(this,arguments);const p=PMC.data;if(!p||!pmIsUser())return h;
    const line=pmLine(p);
    return h+`<div class="ab-banner pm-ab" role="status"><i class="ti ti-discount-2" aria-hidden="true"></i><div><b>${esc(abTr("pm_ban_t",{n:p.name,p:p.pct,f:pmFor(p)}))}</b><br>${esc([line,t("pm_keep")].filter(Boolean).join(" · "))}</div></div>`;
  };
}
if(typeof abLoadBilling==="function"){
  const _pmLBP=abLoadBilling;
  abLoadBilling=async function(){
    if(pmIsUser()&&!PMC.busy&&Date.now()-PMC.at>60*1000){
      const before=JSON.stringify(PMC.data);
      pmCurLoad(true).then(()=>{try{if(JSON.stringify(PMC.data)!==before&&_ab&&_ab.cat&&_ab.offer&&document.getElementById("ab-root"))abRender();}catch(_){}});
    }
    return _pmLBP.apply(this,arguments);
  };
}

function pmLandMoney(v){const n=Math.round(v*100)/100;return (Number.isInteger(n)?n:n.toFixed(2).replace(".",","))+" $";}
if(typeof renderLandingPricing==="function"){
  const _pmRLP=renderLandingPricing;
  renderLandingPricing=function(){
    const r=_pmRLP.apply(this,arguments);
    try{
      const p=_landingPlans&&_landingPlans.promo,box=document.getElementById("ld-plans");
      document.getElementById("pm-land")?.remove();
      if(!p||!box)return r;
      const who=p.who==="first"?abTr("pm_land_first",{n:p.name,p:p.pct,x:p.places}):abTr("pm_land_all",{n:p.name,p:p.pct});
      const tiers=AB_TIERS.every(k=>p.tiers.includes(k))?"":" "+abTr("pm_on",{t:AB_TIERS.filter(k=>p.tiers.includes(k)).map(k=>t("ab_tier_"+k)).join(", ")});
      const line=pmLine({...p,holder:false});
      const b=document.createElement("div");b.id="pm-land";b.className="pm-land";b.setAttribute("role","status");
      b.innerHTML=`<i class="ti ti-discount-2" aria-hidden="true"></i><span>${esc(who+tiers+(line?" · "+line:""))}</span>`;
      box.parentNode.insertBefore(b,box);
      const tbl=box.querySelector("table");if(!tbl)return r;
      const cols=[...tbl.querySelectorAll("thead th")].slice(1).map((_,i)=>AB_TIERS[i]);
      tbl.querySelectorAll("tbody tr").forEach(tr=>{[...tr.children].slice(1).forEach((td,i)=>{
        const k=cols[i];if(!k||!p.tiers.includes(k))return;
        const m=td.textContent.trim().match(/^([\d.,\s]+)\s*\$$/);if(!m)return;
        const v=parseFloat(m[1].replace(/\s/g,"").replace(",","."));if(!(v>0))return;
        td.innerHTML=`<s class="pm-old">${esc(td.textContent.trim())}</s><span class="pm-new">${pmLandMoney(v*(1-p.pct/100))}</span>`;
      });});
    }catch(_){}
    return r;
  };
}
