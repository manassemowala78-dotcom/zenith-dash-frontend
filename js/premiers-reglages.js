// ── 9.5.0 · Première ouverture d'un secteur : rien n'est rempli d'avance ──
// Tant que l'établissement n'a pas choisi l'essentiel, chaque page du secteur affiche ce
// formulaire (champs vides, exemples en gris). Les autres membres voient un message d'attente.
const SETUP_GROUP_OF={resto:"resto",bar:"resto",hotel:"hotel",beauty:"beauty",retail:"retail",pharmacy:"retail",cold:"cold",embassy:"embassy",school:"school"};
const SETUP_EXAMPLE={resto:{areas:"Salle, Terrasse",open:"10:00",close:"23:00",receipt_footer:"Merci de votre visite !"},
  hotel:{check_in_time:"14:00",check_out_time:"12:00",city_tax_per_night:"1",breakfast_price:"5"},
  beauty:{open:"09:00",close:"19:00"},retail:{expiry_alert_days:"30",credit_days:"30"},
  cold:{reading_interval_h:"4",expiry_alert_days:"7",tariff_rate:"1.5"},
  embassy:{country:"Belgique",open:"08:30",close:"15:00",slot_min:"20",per_slot:"2",fee_visa:"80",fee_passport:"100",fee_civil:"20",fee_legal:"10",fee_registry:"0"},
  school:{official_name:"Complexe scolaire Les Palmiers",year:"2026-2027",city:"Kinshasa",director:"M. / Mme …"}};
// [clé, type, requis]
const SETUP_FIELDS={
  resto:[["areas","list",1],["open","time",1],["close","time",1],["days","days",1],["receipt_footer","text",0]],
  hotel:[["check_in_time","time",1],["check_out_time","time",1],["city_tax_per_night","money",0],["breakfast_price","money",0]],
  beauty:[["open","time",1],["close","time",1],["days","days",1],["slot_step","step",1]],
  retail:[["expiry_alert_days","int",1],["credit_days","int",1]],
  cold:[["reading_interval_h","int",1],["expiry_alert_days","int",1],["tariff_mode","tariff",1],["tariff_rate","money",1]],
  embassy:[["currency","currency",1],["country","text",1],["days","days",1],["open","time",1],["close","time",1],["slot_min","int",1],["per_slot","int",1],["fees","fees",1]],
  school:[["official_name","text",0],["year","text",1],["currency","currency",1],["city","text",0],["director","text",0]]};
let _setup=null;
async function setupStatus(force){
  const tid=State.tenant?.id;
  if(force||!_setup||_setup._tid!==tid){
    try{_setup=await api("GET","/setup");}catch(_){_setup={needed:[],groups:[],can_edit:false};}
    _setup._tid=tid;
  }
  return _setup;
}
function setupGroupOfPage(p){const info=sectorPageInfo(p);return info?SETUP_GROUP_OF[info.module]:null;}
const _loadSectorPage_su=loadSectorPage;
loadSectorPage=async function(p){
  const info=sectorPageInfo(p);
  if(info&&hasModule(info.module)&&!(State.tenant&&State.tenant.sector_plan_ok===false)&&State.tenant?.account_type!=="client"){
    const g=SETUP_GROUP_OF[info.module];
    if(g){
      let s=await setupStatus();
      if(!(s.groups||[]).some(x=>x.key===g))s=await setupStatus(true);
      if((s.needed||[]).includes(g)){
        const el=ensureSectorPage(p);
        document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x===el));
        el.innerHTML=setupPanel(g,s,p);setupCheck(g);return;
      }
    }
  }
  return _loadSectorPage_su(p);
};
function suEx(g,k){const v=(SETUP_EXAMPLE[g]||{})[k];return v?t("su_example").replace("{v}",v):"";}
function suField(g,f,s){
  const [k,type,req]=f;const id=`su-${k}`;const lab=`<label class="fl" for="${id}">${esc(t("su_f_"+g+"_"+k)!=="su_f_"+g+"_"+k?t("su_f_"+g+"_"+k):t("su_f_"+k))}${req?` <span class="su-req">· ${esc(t("su_required"))}</span>`:""}</label>`;
  const ex=suEx(g,k);const hint=ex&&(type==="time")?`<div class="su-ex">${esc(ex)}</div>`:"";
  const ph=ex?` placeholder="${esc(ex)}"`:"";
  const on=`oninput="setupCheck('${g}')" onchange="setupCheck('${g}')"`;
  if(type==="days")return `<div class="fgrp su-wide">${lab}<div class="su-days">${[0,1,2,3,4,5,6].map(d=>`<label class="toggle-btn su-day"><input type="checkbox" class="su-dayx" value="${d}" ${on}> ${esc(bkDayName(d).slice(0,3))}</label>`).join("")}</div></div>`;
  if(type==="currency")return `<div class="fgrp">${lab}<select class="inp" id="${id}" ${on}><option value="">${esc(t("su_choose"))}</option>${(s.currencies||[]).map(c=>`<option value="${c}">${esc(c)}</option>`).join("")}</select></div>`;
  if(type==="step")return `<div class="fgrp">${lab}<select class="inp" id="${id}" ${on}><option value="">${esc(t("su_choose"))}</option>${[5,10,15,20,30,45,60,90,120].map(m=>`<option value="${m}">${m} min</option>`).join("")}</select></div>`;
  if(type==="tariff")return `<div class="fgrp">${lab}<select class="inp" id="${id}" ${on}><option value="">${esc(t("su_choose"))}</option>${(s.tariff_modes||[]).map(m=>`<option value="${m}">${esc(t("su_tariff_"+m))}</option>`).join("")}</select></div>`;
  if(type==="fees")return `<div class="fgrp su-wide">${lab}<div class="su-fees">${(s.emb_kinds||[]).map(x=>`<div class="fgrp"><label class="fl" for="su-fee-${x}">${esc(t("su_fee_"+x))}</label><input class="inp" type="number" min="0" step="0.01" id="su-fee-${x}" placeholder="${esc(suEx(g,"fee_"+x))}" ${on}></div>`).join("")}</div></div>`;
  if(type==="time")return `<div class="fgrp">${lab}<input class="inp" type="time" id="${id}" ${on}>${hint}</div>`;
  if(type==="int"||type==="money")return `<div class="fgrp">${lab}<input class="inp" type="number" min="0" ${type==="money"?'step="0.01"':'step="1"'} id="${id}"${ph} ${on}></div>`;
  return `<div class="fgrp${type==="list"||k==="receipt_footer"?" su-wide":""}">${lab}<input class="inp" id="${id}" maxlength="${k==="receipt_footer"?300:160}"${ph} ${on}>${type==="list"?`<div class="su-ex">${esc(t("su_list_hint"))}</div>`:""}</div>`;
}
function setupPanel(g,s,p){
  const label=t("su_group_"+g);
  if(!s.can_edit)return sectorPageHead(esc(t("su_title")),"")+`<div class="card su-wait"><i class="ti ti-hourglass" aria-hidden="true"></i><div><b>${esc(t("su_wait_title"))}</b><div class="su-sm">${esc(t("su_wait_text").replace("{s}",label))}</div></div></div>`;
  return sectorPageHead(esc(t("su_title")),esc(t("su_intro")))+
    `<div class="card su-card"><div class="su-head"><i class="ti ti-adjustments" aria-hidden="true"></i><b>${esc(t("su_essentials").replace("{s}",label))}</b></div>
      <div class="su-grid">${SETUP_FIELDS[g].map(f=>suField(g,f,s)).join("")}</div></div>
     <div class="card su-left" id="su-left"></div>
     <div class="err-box" id="su-err"></div>
     <button class="btn btn-g su-go" id="su-go" type="button" disabled onclick="setupSave('${g}','${p}')"><i class="ti ti-check" aria-hidden="true"></i> ${esc(t("su_open").replace("{s}",label))}</button>
     ${g==="school"?`<div class="su-sm su-next">${esc(t("su_school_next"))}</div>`:""}`;
}
function suRead(g){
  const v={};const s=_setup||{};
  for(const [k,type] of SETUP_FIELDS[g]){
    if(type==="days")v.days=[...document.querySelectorAll(".su-dayx:checked")].map(x=>+x.value);
    else if(type==="fees"){v.fees={};(s.emb_kinds||[]).forEach(x=>{const e=document.getElementById("su-fee-"+x);v.fees[x]=e&&e.value!==""?parseFloat(e.value):null;});}
    else if(type==="list")v[k]=zdVal("su-"+k).split(",").map(x=>x.trim()).filter(Boolean);
    else if(type==="int"||type==="money"||type==="step"){const e=document.getElementById("su-"+k);v[k]=e&&e.value!==""?parseFloat(e.value):null;}
    else v[k]=zdVal("su-"+k);
  }
  return v;
}
function suMissing(g,v){
  const miss=[];
  for(const [k,type,req] of SETUP_FIELDS[g]){
    if(!req)continue;const x=v[k];
    if(type==="fees"){if(Object.values(x||{}).some(y=>y===null||isNaN(y)))miss.push(k);}
    else if(Array.isArray(x)?!x.length:(x===null||x===""||x===undefined||(typeof x==="number"&&isNaN(x))))miss.push(k);
  }
  return miss;
}
function setupCheck(g){
  const box=document.getElementById("su-left");if(!box)return;
  const miss=suMissing(g,suRead(g));
  document.getElementById("su-go").disabled=miss.length>0;
  box.classList.toggle("su-ok",!miss.length);
  box.innerHTML=miss.length?`<div class="su-sm">${esc(t(miss.length>1?"su_left_n":"su_left_1").replace("{n}",miss.length))}</div><div class="su-chips">${miss.map(k=>`<span class="su-chip">${esc(t("su_f_"+g+"_"+k)!=="su_f_"+g+"_"+k?t("su_f_"+g+"_"+k):t("su_f_"+k))}</span>`).join("")}</div>`:
    `<div class="su-sm"><i class="ti ti-circle-check" aria-hidden="true"></i> ${esc(t("su_ready"))}</div>`;
}
async function setupSave(g,p){
  const btn=document.getElementById("su-go");if(btn)btn.disabled=true;
  try{
    const r=await api("PUT","/setup/"+g,suRead(g));r._tid=State.tenant?.id;_setup=r;
    showToast(t("su_saved"));
    if(typeof _sc==="object"&&_sc)_sc.set=null;
    navigate(p);
  }catch(e){showErr("su-err",e.message);if(btn)btn.disabled=false;}
}
