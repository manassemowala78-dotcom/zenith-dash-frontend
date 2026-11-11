const AT_T={
fr:{title:"Suivi de réparation",steps:{received:"Véhicule reçu",diagnosis:"Diagnostic",waiting_parts:"Attente des pièces",in_progress:"En réparation",ready:"Prêt à récupérer",delivered:"Rendu au client"},cancelled:"Réparation annulée",now:"Étape actuelle",promised:"Date promise",total:"Montant",deposit:"Acompte versé",call:"Appeler le garage",nf:"Ce lien de suivi n'existe pas ou n'est plus actif.",by:"Suivi proposé par"},
en:{title:"Repair tracking",steps:{received:"Vehicle received",diagnosis:"Diagnosis",waiting_parts:"Waiting for parts",in_progress:"In repair",ready:"Ready to collect",delivered:"Handed back"},cancelled:"Repair cancelled",now:"Current step",promised:"Promised date",total:"Amount",deposit:"Deposit paid",call:"Call the garage",nf:"This tracking link does not exist or is no longer active.",by:"Tracking by"},
es:{title:"Seguimiento de la reparación",steps:{received:"Vehículo recibido",diagnosis:"Diagnóstico",waiting_parts:"Esperando piezas",in_progress:"En reparación",ready:"Listo para recoger",delivered:"Entregado"},cancelled:"Reparación anulada",now:"Etapa actual",promised:"Fecha prometida",total:"Importe",deposit:"Anticipo pagado",call:"Llamar al taller",nf:"Este enlace de seguimiento no existe o ya no está activo.",by:"Seguimiento ofrecido por"},
ar:{title:"متابعة الإصلاح",steps:{received:"تم استلام المركبة",diagnosis:"التشخيص",waiting_parts:"بانتظار القطع",in_progress:"قيد الإصلاح",ready:"جاهزة للاستلام",delivered:"تم التسليم"},cancelled:"تم إلغاء الإصلاح",now:"المرحلة الحالية",promised:"التاريخ الموعود",total:"المبلغ",deposit:"الدفعة المقدمة",call:"اتصل بالمرآب",nf:"رابط المتابعة هذا غير موجود أو لم يعد نشطًا.",by:"متابعة مقدمة من"},
sw:{title:"Ufuatiliaji wa matengenezo",steps:{received:"Gari limepokelewa",diagnosis:"Uchunguzi",waiting_parts:"Inasubiri vipuri",in_progress:"Inatengenezwa",ready:"Tayari kuchukuliwa",delivered:"Limekabidhiwa"},cancelled:"Matengenezo yameghairiwa",now:"Hatua ya sasa",promised:"Tarehe iliyoahidiwa",total:"Kiasi",deposit:"Malipo ya awali",call:"Piga simu gereji",nf:"Kiungo hiki cha ufuatiliaji hakipo au hakitumiki tena.",by:"Ufuatiliaji kutoka"},
ln:{title:"Kolanda bobongisi",steps:{received:"Motuka ezwami",diagnosis:"Botalisi",waiting_parts:"Ezali kozela biteni",in_progress:"Bazali kobongisa",ready:"Ebongi, okoki koya kozwa",delivered:"Ezongisami"},cancelled:"Bobongisi elongolami",now:"Etape ya sik'oyo",promised:"Mokolo oyo balakisi",total:"Mbongo",deposit:"Avance efutami",call:"Benga garage",nf:"Lien oyo ezali te to esalaka lisusu te.",by:"Bolandi ya"}};
(function(){
  const L=(()=>{let l="fr";try{l=localStorage.getItem("zd_lang")||(navigator.language||"fr").slice(0,2);}catch(_){l=(navigator.language||"fr").slice(0,2);}return AT_T[l]?l:"fr";})();
  const T=AT_T[L];document.documentElement.lang=L;if(L==="ar")document.documentElement.dir="rtl";document.title=T.title+" · Zenith Dash";
  const host=location.hostname,API=(host==="localhost"||host==="127.0.0.1")?"http://localhost:8000/v1":host.includes("staging")?"https://zenith-dash-staging.up.railway.app/v1":"https://zenith-dash-production.up.railway.app/v1";
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const app=document.getElementById("app"),tok=new URLSearchParams(location.search).get("t");
  const fmtD=s=>{try{return new Date(s.length===10?s+"T00:00:00":s+(s.endsWith("Z")?"":"Z")).toLocaleDateString(L==="ar"?"ar":L,{day:"numeric",month:"long",year:"numeric"});}catch(_){return s;}};
  const fmtT=s=>{try{return new Date(s+(s.endsWith("Z")?"":"Z")).toLocaleString(L==="ar"?"ar":L,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});}catch(_){return s;}};
  const money=v=>"$"+Number(v||0).toFixed(2);
  const fail=()=>{app.innerHTML=`<div class="err">${esc(T.nf)}</div>`;};
  if(!tok){fail();return;}
  fetch(API+"/public/garage/"+encodeURIComponent(tok)).then(r=>r.ok?r.json():Promise.reject()).then(d=>{
    const order=["received","diagnosis","waiting_parts","in_progress","ready","delivered"];
    const seen={};(d.history||[]).forEach(h=>{if(!seen[h.status])seen[h.status]=h.at;});
    const cur=order.indexOf(d.status);
    const steps=d.status==="cancelled"?`<div class="st" style="color:var(--red)">${esc(T.cancelled)}</div>`:
      `<ul class="steps">${order.filter(s=>s!=="waiting_parts"||seen.waiting_parts||d.status==="waiting_parts").map(s=>{const i=order.indexOf(s);return `<li class="${i<=cur?"on":""}${i===cur?" cur":""}"><span class="d"></span><span>${esc(T.steps[s])}${seen[s]?`<small>${esc(fmtT(seen[s]))}</small>`:""}</span></li>`;}).join("")}</ul>`;
    app.innerHTML=`<div class="brand">${esc(T.by)} <b>Zenith Dash</b></div>
      <div class="card"><div class="sub">${esc(d.garage)}</div><h1>${esc(T.title)} ${esc(d.number)}</h1><div class="sub">${esc(d.vehicle||"")}${d.plate?` · ${esc(d.plate)}`:""}</div>
      ${d.status!=="cancelled"?`<div class="st">${esc(T.now)} : ${esc(T.steps[d.status]||d.status)}</div>`:""}</div>
      <div class="card">${steps}</div>
      ${d.promised_at||d.total!=null||d.deposit?`<div class="card">${d.promised_at?`<div class="row"><span>${esc(T.promised)}</span><b>${esc(fmtD(d.promised_at))}</b></div>`:""}${d.total!=null?`<div class="row"><span>${esc(T.total)}</span><b>${money(d.total)}</b></div>`:""}${d.deposit?`<div class="row"><span>${esc(T.deposit)}</span><b>${money(d.deposit)}</b></div>`:""}</div>`:""}
      ${d.phone?`<a class="btn" href="tel:${esc(String(d.phone).replace(/[^0-9+]/g,""))}">📞 ${esc(T.call)} · ${esc(d.phone)}</a>`:""}`;
  }).catch(fail);
})();
