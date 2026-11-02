// ── 10.3.0 · Fin de la gratuité : annonce, rappels, bandeau et e-mails ──
let _fe=null,_fePoll=null,_feDirty=false;
const FE_REM=[90,60,45,30,7,1];
function feD(iso,o){try{const[y,m,d]=String(iso).split("-").map(Number);return new Date(Date.UTC(y,m-1,d,12)).toLocaleDateString("fr-FR",Object.assign({timeZone:"UTC"},o||{day:"numeric",month:"long",year:"numeric"}));}catch(_){return iso;}}
function feShort(iso){return String(feD(iso,{weekday:"short",day:"numeric",month:"short"})).replace(/\.$/,"");}
function feTs(iso){try{return parseServerDate(iso).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch(_){return iso||"";}}
function feBox(){
  let box=document.getElementById("fe-admin");
  const fa=document.getElementById("fa-admin");
  if(!box&&fa){box=document.createElement("div");box.id="fe-admin";box.style.marginBottom="18px";fa.after(box);}
  return box;
}
async function feLoad(){
  const box=feBox();if(!box||!State.tenant?.is_creator)return;
  try{_fe=await api("GET","/admin/free-end");}catch(e){box.innerHTML=`<div class="card fe-card"><span class="fe-err">${esc(e.message)}</span></div>`;return;}
  if(!_feDirty||!document.getElementById("fe-form"))feRender();else feRenderTrack();
}
function feForm(){
  const g=id=>document.getElementById(id);
  if(!g("fe-form"))return null;
  const who=document.querySelector('input[name="fe-who"]:checked')?.value||"managers";
  const rem=FE_REM.filter(n=>g("fe-r"+n)?.checked);
  const cap=parseInt(g("fe-cap")?.value,10);
  return {who,ch:{notif:!!g("fe-ch-notif")?.checked,banner:!!g("fe-ch-banner")?.checked,email:!!g("fe-ch-email")?.checked},
    subject:g("fe-subj")?.value||"",message:g("fe-msg")?.value||"",reminders:rem,daily_cap:isNaN(cap)?null:cap};
}
function feCount(f){const s=_fe;if(!s)return 0;return (f.who==="all"?s.counts.all:s.counts.managers);}
function feEstimate(){
  const el=document.getElementById("fe-est");const f=feForm();if(!el||!f||!_fe)return;
  const n=feCount(f),cap=f.daily_cap||0;
  if(!f.ch.email){el.textContent="E-mail décoché : aucun e-mail ne partira.";el.className="fe-est";return;}
  if(!cap||cap<1){el.textContent="Indique un nombre d'e-mails par jour (au moins 1).";el.className="fe-est bad";return;}
  const days=Math.max(1,Math.ceil(n/cap));
  const end=new Date(_fe.today+"T12:00:00Z");end.setUTCDate(end.getUTCDate()+days-1);
  el.textContent=days===1?`${n} e-mail${n>1?"s":""} → envoyé${n>1?"s":""} aujourd'hui`:`${n} e-mails → envoyés en ${days} jours (fini le ${feShort(end.toISOString().slice(0,10))})`;
  el.className="fe-est ok";
  const go=document.getElementById("fe-go");if(go&&!_fe.launched)go.innerHTML=`<i class="ti ti-speakerphone" aria-hidden="true"></i> Envoyer l'annonce à ${n} compte${n>1?"s":""}`;
}
function feChanged(){_feDirty=true;feEstimate();}
function feRemLabel(s){
  const lab=s.days===1?"La veille":`${s.days} jours`;
  const st={past:"passé",today:"aujourd'hui",skipped:"sauté",sent:"envoyé"}[s.status];
  const dis=s.status!=="future";
  return `<label class="fe-rem${dis?" dis":""}"><input type="checkbox" id="fe-r${s.days}" ${s.selected?"checked":""} ${dis?"disabled":""} onchange="feChanged()"><span>${lab}</span><small>· ${esc(st||feShort(s.date))}</small></label>`;
}
function feRender(){
  const box=feBox();if(!box||!_fe)return;
  const s=_fe,st=s.settings;
  if(!s.free.active||!s.pay_date){
    box.innerHTML=`<div class="card fe-card off"><div class="fe-h"><i class="ti ti-speakerphone" aria-hidden="true"></i><b>Annoncer le passage au payant</b></div>
      <p class="fe-p">Active d'abord la gratuité ci-dessus avec une date de fin (« Jusqu'au »). La date « devient payant » sera le lendemain, et l'annonce, les rappels et le bandeau suivront cette date.</p>
      ${s.launched?`<button type="button" class="btn btn-r btn-sm" onclick="feCancel()"><i class="ti ti-player-stop" aria-hidden="true"></i> Annuler l'annonce</button>`:""}
      ${feTrackHtml()}</div>`;
    return;
  }
  const subj=st.subject||s.default_subject,msg=st.message||s.default_message;
  const em=s.email.enabled;
  const L=s.launched;
  const nextR=(s.schedule||[]).find(x=>x.selected&&x.status==="future");
  box.innerHTML=`<div class="card fe-card${L?" on":""}">
    <div class="fe-h"><i class="ti ti-speakerphone" aria-hidden="true"></i><b>Annoncer le passage au payant</b>${L?`<span class="adm-pill p-sub">Annonce envoyée</span>`:""}</div>
    <div class="fe-date"><span>Zenith Dash devient payant le <b>${esc(s.pay_label)}</b></span><small>(le lendemain de la fin de la gratuité · dans ${s.days_left} jour${s.days_left>1?"s":""})</small><button type="button" class="fe-link" onclick="feEditDate()">Changer la date</button></div>
    ${L?`<div class="fe-sent"><i class="ti ti-circle-check" aria-hidden="true"></i><span>Annonce envoyée le ${esc(feTs(L.at))}.${nextR?` Prochain rappel : ${esc(nextR.days===1?"la veille":nextR.days+" jours avant")}, le ${esc(feShort(nextR.date))}.`:" Plus de rappel prévu."}</span></div>`:""}
    <form id="fe-form" class="fe-grid" onsubmit="event.preventDefault()" oninput="feChanged()">
      <div class="fe-col">
        <span class="fe-cap">Qui reçoit l'annonce</span>
        <div class="fe-who" role="radiogroup" aria-label="Qui reçoit l'annonce">
          <label class="fe-opt"><input type="radio" name="fe-who" value="managers" ${st.who!=="all"?"checked":""} onchange="feChanged()"><span><b>Les gérants</b><small>ceux qui paieront · ${s.counts.managers} compte${s.counts.managers>1?"s":""}</small></span></label>
          <label class="fe-opt"><input type="radio" name="fe-who" value="all" ${st.who==="all"?"checked":""} onchange="feChanged()"><span><b>Tout le monde</b><small>employés compris · ${s.counts.all} compte${s.counts.all>1?"s":""}</small></span></label>
        </div>
        <span class="fe-cap">Comment</span>
        <div class="fe-chks">
          <label class="fe-chk"><input type="checkbox" id="fe-ch-notif" ${st.ch.notif?"checked":""}> Notification dans l'app</label>
          <label class="fe-chk"><input type="checkbox" id="fe-ch-banner" ${st.ch.banner?"checked":""}> Bandeau en haut du site, avec le compte à rebours</label>
          <label class="fe-chk${em?"":" dis"}"><input type="checkbox" id="fe-ch-email" ${st.ch.email&&em?"checked":""} ${em?"":"disabled"}> E-mail à chacun${em?"":` <small>(envoi non configuré : ajoute BREVO_API_KEY dans Railway)</small>`}</label>
        </div>
        <label class="fe-cap" for="fe-subj">Objet de l'e-mail</label>
        <input class="inp" id="fe-subj" type="text" maxlength="200" value="${esc(subj)}">
        <label class="fe-cap" for="fe-msg">Ton message</label>
        <textarea class="inp" id="fe-msg" rows="4" maxlength="1500">${esc(msg)}</textarea>
        <small class="fe-small">Laisse le texte proposé tel quel : il se met à jour tout seul si tu changes la date.</small>
      </div>
      <div class="fe-col">
        <span class="fe-cap">Rappels automatiques</span>
        <div class="fe-rems">${(s.schedule||[]).map(feRemLabel).join("")}</div>
        <small class="fe-small">Chaque rappel passe par les mêmes moyens que l'annonce. Une date déjà passée ou le jour même de l'annonce est sautée. La veille, le bandeau ne peut plus être fermé.</small>
        <div class="fe-brevo">
          <b>Envoi des e-mails${s.email.provider==="brevo_api"?" · Brevo":""}</b>
          <span>Brevo gratuit = 300 e-mails par jour au total. Garde une marge pour les codes « mot de passe oublié ».</span>
          <div class="fe-capr"><label for="fe-cap">Annonces par jour</label><input class="inp" id="fe-cap" type="number" inputmode="numeric" min="1" max="100000" value="${esc(String(st.daily_cap))}"></div>
          <span id="fe-est" class="fe-est" role="status"></span>
          <small>Formule Brevo payante ? Augmente ce nombre.</small>
        </div>
      </div>
    </form>
    <div class="fe-btns">
      <button type="button" class="btn btn-o btn-sm" onclick="fePreview()"><i class="ti ti-eye" aria-hidden="true"></i> Aperçu</button>
      <button type="button" class="btn btn-o btn-sm" id="fe-test" onclick="feTest()"${em?"":" disabled"}><i class="ti ti-mail" aria-hidden="true"></i> M'envoyer l'essai</button>
      ${L?`<button type="button" class="btn btn-o btn-sm" onclick="feSave()"><i class="ti ti-device-floppy" aria-hidden="true"></i> Enregistrer les réglages</button>`:""}
      <span class="fe-sp"></span>
      ${L?`<button type="button" class="btn btn-r btn-sm" onclick="feCancel()"><i class="ti ti-player-stop" aria-hidden="true"></i> Annuler l'annonce</button>
           <button type="button" class="btn btn-o btn-sm" onclick="feSend(true)"><i class="ti ti-repeat" aria-hidden="true"></i> Renvoyer</button>`
        :`<button type="button" class="btn btn-g btn-sm" id="fe-go" onclick="feSend(false)"><i class="ti ti-speakerphone" aria-hidden="true"></i> Envoyer l'annonce</button>`}
    </div>
    <div id="fe-track">${feTrackHtml()}</div>
  </div>`;
  _feDirty=false;feEstimate();feSchedulePoll();
}
function feCampLabel(c){return c.kind==="annonce"?"Annonce":(c.days===1?"Rappel de la veille":`Rappel ${c.days} jours`);}
function feTrackHtml(){
  const s=_fe;if(!s||!(s.campaigns||[]).length)return "";
  const q=s.queue;
  let qline="";
  if(q.pause)qline=`<div class="fe-q warn" role="status"><i class="ti ti-player-pause" aria-hidden="true"></i> ${esc(q.pause.reason||"Envoi en pause")}</div>`;
  else if(q.cap_hit)qline=`<div class="fe-q" role="status"><i class="ti ti-clock" aria-hidden="true"></i> Limite du jour atteinte (${q.sent_today}/${q.cap}) : la suite part demain à partir de 00:00 UTC${q.days_needed>1?` (encore ${q.days_needed} jours)`:""}.</div>`;
  else if(q.pending)qline=`<div class="fe-q" role="status"><i class="ti ti-send" aria-hidden="true"></i> Envoi en cours : ${q.pending} e-mail${q.pending>1?"s":""} en attente.</div>`;
  const rows=s.campaigns.slice(0,6).map(c=>{
    const pct=c.total?Math.round(c.sent*100/c.total):0;
    const np=c.notif_total?`${c.notif_done} / ${c.notif_total}${c.notif_done>=c.notif_total?" ✓":""}`:"—";
    return `<div class="fe-row${c.cancelled?" cancelled":""}">
      <div class="fe-rh"><b>${esc(feCampLabel(c))}</b><small>${esc(feTs(c.created_at))}${c.cancelled?" · annulée":""}</small></div>
      <div class="fe-cells">
        <div><span class="fe-cap">Notifications</span><span class="${c.notif_total&&c.notif_done>=c.notif_total?"fe-good":""}">${np}</span></div>
        <div><span class="fe-cap">E-mails</span>${c.channels.email?`<div class="fa-bar" aria-hidden="true"><i style="width:${pct}%"></i></div><span>${c.sent} / ${c.total}${c.pending?` · ${c.pending} en attente`:""}</span>`:"<span>—</span>"}</div>
        <div><span class="fe-cap">Échecs</span>${(c.failed||c.skipped)?`<span class="${c.failed?"fe-bad":""}">${c.failed} échec${c.failed>1?"s":""}${c.skipped?` · ${c.skipped} écarté${c.skipped>1?"s":""}`:""}</span><button type="button" class="fe-link" onclick="feFailures('${esc(c.id)}')">Voir la liste</button>`:"<span>0</span>"}</div>
      </div></div>`;}).join("");
  return `<div class="fe-track"><span class="fe-cap">Suivi</span>${qline}${rows}</div>`;
}
function feRenderTrack(){const t=document.getElementById("fe-track");if(t)t.innerHTML=feTrackHtml();feSchedulePoll();}
function feSchedulePoll(){
  clearTimeout(_fePoll);
  const s=_fe;if(!s)return;
  const busy=(s.campaigns||[]).some(c=>c.notif_done<c.notif_total)||(s.queue.pending&&!s.queue.pause&&!s.queue.cap_hit);
  if(busy)_fePoll=setTimeout(async()=>{if(!document.getElementById("fe-admin")?.offsetParent)return;try{_fe=await api("GET","/admin/free-end");feRenderTrack();}catch(_){}},4000);
}
function feEditDate(){
  const el=document.getElementById("fa-admin");if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
  setTimeout(()=>{const r=document.querySelector('input[name="fa-dur"][value="date"]');if(r&&!r.checked){r.checked=true;r.dispatchEvent(new Event("change"));}document.getElementById("fa-until")?.focus();},350);
}
function feBody(extra){return Object.assign(feForm()||{},extra||{});}
async function feSave(){
  const f=feForm();if(!f)return;
  if(!f.daily_cap||f.daily_cap<1){showToast("Indique un nombre d'e-mails par jour (au moins 1)","error");return;}
  try{_fe=await api("PUT","/admin/free-end",f);_feDirty=false;feRender();showToast("Réglages enregistrés ✓");}catch(e){showToast(e.message,"error");}
}
async function feSend(again){
  const f=feForm();if(!f||!_fe)return;
  if(!f.ch.notif&&!f.ch.banner&&!f.ch.email){showToast("Coche au moins un moyen : notification, bandeau ou e-mail","error");return;}
  if(f.ch.email&&(!f.daily_cap||f.daily_cap<1)){showToast("Indique un nombre d'e-mails par jour (au moins 1)","error");return;}
  const n=feCount(f);
  const how=[f.ch.notif&&"notification",f.ch.banner&&"bandeau",f.ch.email&&"e-mail"].filter(Boolean).join(" + ");
  if(!confirm(`${again?"Renvoyer":"Envoyer"} l'annonce « Zenith Dash devient payant le ${_fe.pay_label} » à ${n} compte${n>1?"s":""} (${how}) ?`))return;
  try{_fe=await api("POST","/admin/free-end/send",Object.assign(f,{again:!!again}));_feDirty=false;feRender();showToast("Annonce envoyée ✓");}
  catch(e){
    if(e.status===409&&e.data?.detail?.error==="already_sent"&&!again){if(confirm(e.message+"\n\nLa renvoyer quand même à tout le monde ?"))return feSend(true);return;}
    showToast(e.message,"error");
  }
}
async function feCancel(){
  if(!confirm("Annuler l'annonce ? Le bandeau disparaît, les rappels ne partiront plus et les e-mails pas encore partis sont arrêtés. Les notifications déjà reçues restent."))return;
  try{_fe=await api("POST","/admin/free-end/cancel");_feDirty=false;feRender();showToast("Annonce annulée");}catch(e){showToast(e.message,"error");}
}
async function fePreview(){
  const f=feForm()||{};
  let p;try{p=await api("POST","/admin/free-end/preview",{subject:f.subject,message:f.message});}catch(e){showToast(e.message,"error");return;}
  const ov=zdModal("fe-prev",`<div class="modal-head fe-mh"><b>Aperçu de l'e-mail</b><button type="button" class="fe-x" aria-label="Fermer" onclick="zdCloseModal('fe-prev')"><i class="ti ti-x" aria-hidden="true"></i></button></div>
    <div class="fe-subjp"><span class="fe-cap">Objet</span><b>${esc(p.subject)}</b></div>
    <div class="fe-tabs" role="tablist"><button type="button" role="tab" aria-selected="true" class="on" onclick="fePrevTab(this,false)">Gérant</button><button type="button" role="tab" aria-selected="false" onclick="fePrevTab(this,true)">Employé</button></div>
    <iframe id="fe-ifr" class="fe-ifr" title="Aperçu de l'e-mail" sandbox=""></iframe>`,640);
  ov.querySelector("#fe-ifr").srcdoc=p.html;
}
async function fePrevTab(btn,member){
  btn.parentNode.querySelectorAll("button").forEach(b=>{b.classList.toggle("on",b===btn);b.setAttribute("aria-selected",b===btn?"true":"false");});
  const f=feForm()||{};
  try{const p=await api("POST","/admin/free-end/preview",{subject:f.subject,message:f.message,member});document.getElementById("fe-ifr").srcdoc=p.html;}catch(e){showToast(e.message,"error");}
}
async function feTest(){
  const b=document.getElementById("fe-test");if(b)b.disabled=true;
  const f=feForm()||{};
  try{const r=await api("POST","/admin/free-end/test",{subject:f.subject,message:f.message});showToast(`E-mail d'essai envoyé à ${r.to}`);}catch(e){showToast(e.message,"error");}
  if(b)b.disabled=false;
}
async function feFailures(cid){
  let rows;try{rows=await api("GET","/admin/free-end/failures?campaign_id="+encodeURIComponent(cid));}catch(e){showToast(e.message,"error");return;}
  zdModal("fe-fail",`<div class="modal-head fe-mh"><b>E-mails non envoyés</b><button type="button" class="fe-x" aria-label="Fermer" onclick="zdCloseModal('fe-fail')"><i class="ti ti-x" aria-hidden="true"></i></button></div>
    ${rows.length?`<div class="tbl-wrap fe-ftw"><table class="fe-ft"><thead><tr><th>Adresse</th><th>Compte</th><th>Raison</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="mono">${esc(r.email)}</td><td>${esc(r.name||"")}${r.company?`<br><small>${esc(r.company)}</small>`:""}</td><td class="${r.status==="failed"?"fe-bad":""}">${esc(r.error||"")}</td></tr>`).join("")}</tbody></table></div>`:zdEmpty("Aucun échec.","circle-check")}`,680);
}
if(typeof faRender==="function"){
  const _feFR=faRender;
  faRender=function(){const r=_feFR.apply(this,arguments);if(!document.getElementById("fe-admin")||!_fe)feLoad();return r;};
}
if(typeof loadPage==="function"){
  const _feLP=loadPage;
  loadPage=async function(p){if(p==="admin")setTimeout(feLoad,0);return _feLP.apply(this,arguments);};
}
if(typeof faSave==="function"){
  const _feFS=faSave;
  faSave=async function(){const r=await _feFS.apply(this,arguments);_feDirty=false;feLoad();return r;};
}

// ── Bandeau pour les comptes ──
const FB={data:null,at:0,busy:false};
function fbKey(){return "zd_fe_dismiss_"+(State.tenant?.id||"")+(State.tenant?.acting_as_member_id?"_"+State.tenant.acting_as_member_id:"");}
function fbDate(iso){try{const[y,m,d]=String(iso).split("-").map(Number);return new Date(Date.UTC(y,m-1,d,12)).toLocaleDateString(typeof zdLocale==="function"?zdLocale():"fr-FR",{timeZone:"UTC",day:"numeric",month:"long",year:"numeric"});}catch(_){return iso;}}
function fbDayMonth(iso){try{const[y,m,d]=String(iso).split("-").map(Number);return new Date(Date.UTC(y,m-1,d,12)).toLocaleDateString(typeof zdLocale==="function"?zdLocale():"fr-FR",{timeZone:"UTC",day:"numeric",month:"long"});}catch(_){return iso;}}
function fbEl(){
  let el=document.getElementById("fe-banner");
  if(!el){const main=document.querySelector("#app-screen .main");if(!main)return null;el=document.createElement("div");el.id="fe-banner";const ob=document.getElementById("offline-bar");if(ob&&ob.parentNode===main)ob.after(el);else main.prepend(el);}
  return el;
}
function fbRender(){
  const el=fbEl();if(!el)return;
  const d=FB.data;
  let dis=null;try{dis=localStorage.getItem(fbKey());}catch(_){}
  if(!d||!d.show||(!d.last&&dis===String(d.seq))){el.innerHTML="";el.hidden=true;document.body.classList.remove("fe-has-banner");return;}
  el.hidden=false;document.body.classList.add("fe-has-banner");
  const pay=fbDate(d.pay_date),until=fbDayMonth(d.until);
  const cta=d.member?"":`<button type="button" class="fb-cta" onclick="fbGo()">${esc(t(d.last?"fe_b_choose":"fe_b_plans"))}</button>`;
  const who=d.member?" "+t("fe_b_member"):"";
  if(d.last){
    el.className="fb fb-last";
    el.setAttribute("role","status");
    el.innerHTML=`<div class="fb-top"><span class="fb-ic" aria-hidden="true"><i class="ti ti-clock"></i></span><b class="fb-t">${esc(t("fe_b_last_t"))}</b></div>
      <p class="fb-x">${esc(t(d.member?"fe_b_last_member":"fe_b_last_x").replace("{date}",pay))}</p>${cta}`;
  }else{
    el.className="fb";
    el.removeAttribute("role");
    el.innerHTML=`<div class="fb-cd" aria-hidden="true"><b>${d.days_left}</b><span>${esc(t(d.days_left>1?"fe_b_days":"fe_b_day"))}</span></div>
      <div class="fb-body"><b class="fb-t">${esc(t("fe_b_title").replace("{date}",until))}</b>
        <span class="fb-x">${esc(t("fe_b_x").replace("{date}",pay)+who)}</span>
        <span class="sr-only">${esc(t(d.days_left>1?"fe_b_left_n":"fe_b_left_1").replace("{n}",d.days_left))}</span>${cta}</div>
      <button type="button" class="fb-close" aria-label="${esc(t("fe_b_close"))}" onclick="fbClose()"><i class="ti ti-x" aria-hidden="true"></i></button>`;
  }
}
function fbClose(){try{localStorage.setItem(fbKey(),String(FB.data?.seq||0));}catch(_){}const el=document.getElementById("fe-banner");if(el){el.innerHTML="";el.hidden=true;}document.body.classList.remove("fe-has-banner");}
function fbGo(){if(typeof navigate==="function")navigate("billing");}
async function fbLoad(force){
  if(!State.token||!State.tenant||State.tenant.is_creator||State.tenant.account_type==="client"){FB.data=null;fbRender();return;}
  if(FB.busy||(!force&&Date.now()-FB.at<20*60*1000))return;
  if(typeof LK!=="undefined"&&LK&&LK.locked)return;
  FB.busy=true;
  try{FB.data=await api("GET","/free-end/banner");FB.at=Date.now();}catch(_){}
  FB.busy=false;fbRender();
}
if(typeof showAppLayout==="function"){
  const _fbSAL=showAppLayout;
  showAppLayout=async function(){FB.data=null;fbRender();const r=await _fbSAL.apply(this,arguments);FB.at=0;fbLoad(true);return r;};
}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&State.token)fbLoad(false);});
setInterval(()=>{if(State.token&&document.visibilityState==="visible")fbLoad(false);},30*60*1000);
if(typeof applyLanguageNow==="function"){
  const _fbALN=applyLanguageNow;
  applyLanguageNow=function(){const r=_fbALN.apply(this,arguments);try{fbRender();}catch(_){}return r;};
}
