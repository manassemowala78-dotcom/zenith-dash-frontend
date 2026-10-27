(function(){
const host=location.hostname;
const API=(host==="localhost"||host==="127.0.0.1")?"http://localhost:8000/v1":(host.includes("staging")?"https://zenith-dash-staging.up.railway.app/v1":"https://zenith-dash-production.up.railway.app/v1");
const TX={
  fr:{title:"Réponse rapide",open:"Ouvrir la discussion",ph:"Écrire une réponse…",send:"Envoyer",mic:"Enregistrer un vocal",stop:"Envoyer le vocal",cancel:"Annuler",rec:"Enregistrement…",react:"Réagir avec",loading:"Chargement…",expired:"Ce lien a expiré. Ouvre la discussion dans Zenith Dash pour répondre.",fail:"Envoi impossible. Réessaie.",micno:"Micro indisponible : autorise le micro pour envoyer un vocal.",sentT:"Réponse envoyée",sentV:"Vocal envoyé",sentR:"Réaction envoyée",close:"Tu peux fermer cette page.",group:"Groupe",to:"à"},
  en:{title:"Quick reply",open:"Open the chat",ph:"Write a reply…",send:"Send",mic:"Record a voice message",stop:"Send voice message",cancel:"Cancel",rec:"Recording…",react:"React with",loading:"Loading…",expired:"This link has expired. Open the chat in Zenith Dash to reply.",fail:"Could not send. Try again.",micno:"Microphone unavailable: allow the microphone to send a voice message.",sentT:"Reply sent",sentV:"Voice message sent",sentR:"Reaction sent",close:"You can close this page.",group:"Group",to:"to"},
  es:{title:"Respuesta rápida",open:"Abrir la conversación",ph:"Escribe una respuesta…",send:"Enviar",mic:"Grabar un audio",stop:"Enviar el audio",cancel:"Cancelar",rec:"Grabando…",react:"Reaccionar con",loading:"Cargando…",expired:"Este enlace ha caducado. Abre la conversación en Zenith Dash para responder.",fail:"No se pudo enviar. Inténtalo de nuevo.",micno:"Micrófono no disponible: permite el micrófono para enviar un audio.",sentT:"Respuesta enviada",sentV:"Audio enviado",sentR:"Reacción enviada",close:"Puedes cerrar esta página.",group:"Grupo",to:"a"},
  ar:{title:"رد سريع",open:"فتح المحادثة",ph:"اكتب ردًا…",send:"إرسال",mic:"تسجيل رسالة صوتية",stop:"إرسال الرسالة الصوتية",cancel:"إلغاء",rec:"جارٍ التسجيل…",react:"تفاعل بـ",loading:"جارٍ التحميل…",expired:"انتهت صلاحية هذا الرابط. افتح المحادثة في Zenith Dash للرد.",fail:"تعذر الإرسال. أعد المحاولة.",micno:"الميكروفون غير متاح: اسمح بالميكروفون لإرسال رسالة صوتية.",sentT:"تم إرسال الرد",sentV:"تم إرسال الرسالة الصوتية",sentR:"تم إرسال التفاعل",close:"يمكنك إغلاق هذه الصفحة.",group:"مجموعة",to:"إلى"},
  sw:{title:"Jibu la haraka",open:"Fungua mazungumzo",ph:"Andika jibu…",send:"Tuma",mic:"Rekodi sauti",stop:"Tuma sauti",cancel:"Ghairi",rec:"Inarekodi…",react:"Itikia kwa",loading:"Inapakia…",expired:"Kiungo hiki kimeisha muda. Fungua mazungumzo kwenye Zenith Dash ili kujibu.",fail:"Imeshindikana kutuma. Jaribu tena.",micno:"Kipaza sauti hakipatikani: ruhusu kipaza sauti ili kutuma sauti.",sentT:"Jibu limetumwa",sentV:"Sauti imetumwa",sentR:"Itikio limetumwa",close:"Unaweza kufunga ukurasa huu.",group:"Kikundi",to:"kwa"},
  ln:{title:"Eyano ya noki",open:"Fungola lisolo",ph:"Koma eyano…",send:"Tinda",mic:"Kanga mongongo",stop:"Tinda mongongo",cancel:"Tika",rec:"Ezali kokanga…",react:"Pesa likanisi na",loading:"Ezali kofungwama…",expired:"Lien oyo esili. Fungola lisolo na Zenith Dash mpo na koyanola.",fail:"Ekoki kotindama te. Meka lisusu.",micno:"Mikro ezali te: pesa nzela na mikro mpo na kotinda mongongo.",sentT:"Eyano etindami",sentV:"Mongongo etindami",sentR:"Likanisi etindami",close:"Okoki kokanga nkasa oyo.",group:"Lisanga",to:"epai ya"}
};
let lang="fr";try{lang=localStorage.getItem("zd_lang")||(navigator.language||"fr").slice(0,2);}catch(_){lang=(navigator.language||"fr").slice(0,2);}
const T=TX[lang]||TX.fr;
document.documentElement.lang=TX[lang]?lang:"fr";
if(lang==="ar")document.documentElement.dir="rtl";
try{if(localStorage.getItem("zd_theme")==="light")document.documentElement.classList.add("light");}catch(_){}
document.title=T.title+" · Zenith Dash";
const q=new URLSearchParams(location.search);const tok=q.get("t")||"";let target=q.get("m")||"";
let conv=null;try{conv=JSON.parse(atob(tok.split(".")[0].replace(/-/g,"+").replace(/_/g,"/"))).c;}catch(_){}
const app=document.getElementById("app");
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const IC={send:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',mic:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',ok:'<svg viewBox="0 0 24 24" aria-hidden="true" style="width:30px;height:30px"><path d="m5 12 4 4 10-10"/></svg>'};
let data=null,rec=null,chunks=[],recStart=0,recTimer=null,busy=false;
function st(msg,err){const e=document.getElementById("st");if(e){e.textContent=msg||"";e.className="st"+(err?" err":"");}}
function openLink(){return conv?`/?p=messaging&c=${encodeURIComponent(conv)}`:"/?p=messaging";}
function done(label){
  app.innerHTML=`<div class="done"><div class="ok">${IC.ok}</div><div style="font-size:18px;font-weight:800">${esc(label)}</div><div class="sub">${esc(T.close)}</div><a class="btn" href="${openLink()}">${esc(T.open)}</a></div>`;
  setTimeout(()=>{try{window.close();}catch(_){}},1500);
}
async function post(path,body,isForm){
  const r=await fetch(`${API}/quick/${encodeURIComponent(tok)}${path}`,isForm?{method:"POST",body}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok){let m=T.fail;try{const d=await r.json();if(r.status===401)m=T.expired;else if(d&&typeof d.detail==="string")m=d.detail;}catch(_){}throw new Error(m);}
  return r;
}
function render(){
  const d=data;const last=[...d.messages].reverse().find(m=>!m.mine);if(!target&&last)target=last.id;
  app.innerHTML=`<header class="head"><span class="av" aria-hidden="true">${esc((d.name||"?").trim().charAt(0).toUpperCase())}</span><div style="min-width:0"><div class="nm">${esc(d.name)}</div><div class="sub">${esc(T.title)}${d.is_group?" · "+esc(T.group):""}</div></div><a class="open" href="${openLink()}">${esc(T.open)}</a></header>
    <section class="msgs" aria-label="${esc(d.name)}">${d.messages.map(m=>`<div class="bub${m.mine?" mine":""}${m.id===target?" target":""}">${d.is_group&&!m.mine?`<div class="who">${esc(m.sender_name)}</div>`:""}${esc(m.text)}</div>`).join("")}</section>
    <section class="sheet">
      ${target?`<div class="reacts" role="group" aria-label="${esc(T.react)}">${d.reactions.map(e=>`<button type="button" class="re${e===d.quick_reaction?" quick":""}" data-e="${esc(e)}" aria-label="${esc(T.react)} ${esc(e)}">${esc(e)}</button>`).join("")}</div>`:""}
      <div class="row" id="row"></div>
      <div class="st" id="st"></div>
    </section>`;
  app.querySelectorAll(".re").forEach(b=>b.addEventListener("click",()=>react(b.dataset.e)));
  rowText();
}
function rowText(){
  const row=document.getElementById("row");if(!row)return;
  row.innerHTML=`<input class="inp" id="txt" placeholder="${esc(T.ph)}" aria-label="${esc(T.ph)}" maxlength="4000" autocomplete="off"><button type="button" class="round" id="act" aria-label="${esc(T.mic)}">${IC.mic}</button>`;
  const inp=document.getElementById("txt"),act=document.getElementById("act");
  const sync=()=>{const has=inp.value.trim().length>0;act.innerHTML=has?IC.send:IC.mic;act.setAttribute("aria-label",has?T.send:T.mic);};
  inp.addEventListener("input",sync);
  inp.addEventListener("keydown",e=>{if(e.key==="Enter"&&inp.value.trim()){e.preventDefault();sendText();}});
  act.addEventListener("click",()=>{if(inp.value.trim())sendText();else startRec();});
}
async function sendText(){
  if(busy)return;const v=(document.getElementById("txt")?.value||"").trim();if(!v)return;
  busy=true;st("");try{await post("/reply",{content:v});done(T.sentT);}catch(e){st(e.message,true);}finally{busy=false;}
}
async function react(e){
  if(busy||!target)return;busy=true;st("");
  app.querySelectorAll(".re").forEach(b=>b.disabled=true);
  try{await post("/react",{message_id:target,emoji:e});done(`${T.sentR} ${e}`);}catch(err){st(err.message,true);app.querySelectorAll(".re").forEach(b=>b.disabled=false);}finally{busy=false;}
}
let meter=null;
function voiceMeter(stream,box,n){
  let ctx,an,src,data,raf=0,lv=0;
  try{ctx=new (window.AudioContext||window.webkitAudioContext)();src=ctx.createMediaStreamSource(stream);an=ctx.createAnalyser();an.fftSize=256;an.smoothingTimeConstant=.55;src.connect(an);data=new Uint8Array(an.frequencyBinCount);if(ctx.state==="suspended")ctx.resume().catch(()=>{});}
  catch(_){return {stop(){}};}
  box.innerHTML=Array.from({length:n},()=>"<i></i>").join("");const bars=[...box.children],mid=(n-1)/2;
  const bin=ctx.sampleRate/an.fftSize,lo=Math.max(1,Math.floor(90/bin)),hi=Math.min(data.length-1,Math.ceil(3800/bin));
  const tick=()=>{an.getByteFrequencyData(data);let sum=0;for(let i=lo;i<=hi;i++)sum+=data[i];lv=lv*.55+Math.min(1,sum/((hi-lo+1)*255)*2.6)*.45;
    bars.forEach((b,i)=>{const d=mid?Math.abs(i-mid)/mid:0;const v=data[Math.min(hi,Math.floor(lo+d*(hi-lo)*.85))]/255;b.style.transform=`scaleY(${Math.max(.14,Math.min(1,v*1.2*(1-d*.35)+lv*.25)).toFixed(3)})`;});
    box.parentElement&&box.parentElement.style.setProperty("--lv",lv.toFixed(3));raf=requestAnimationFrame(tick);};
  tick();
  return {stop(){cancelAnimationFrame(raf);try{src.disconnect();}catch(_){}try{ctx.close();}catch(_){}}};
}
function fmt(s){return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;}
async function startRec(){
  if(!navigator.mediaDevices||!window.MediaRecorder){st(T.micno,true);return;}
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}catch(_){st(T.micno,true);return;}
  const mime=["audio/webm;codecs=opus","audio/ogg;codecs=opus","audio/mp4"].find(m=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m))||"";
  rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);chunks=[];
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  rec.start();recStart=Date.now();
  const row=document.getElementById("row");
  row.innerHTML=`<div class="recbar"><span class="dot" aria-hidden="true"></span><span id="rt">0:00</span><span class="bars" id="vb" aria-hidden="true"></span><span class="sub sr">${esc(T.rec)}</span><button type="button" class="cancel" id="cx">${esc(T.cancel)}</button></div><button type="button" class="round rec" id="sv" aria-label="${esc(T.stop)}">${IC.send}</button>`;
  try{meter=voiceMeter(stream,document.getElementById("vb"),22);}catch(_){}
  recTimer=setInterval(()=>{const e=document.getElementById("rt");if(e)e.textContent=fmt((Date.now()-recStart)/1000);if(Date.now()-recStart>300000)stopRec(true);},250);
  document.getElementById("cx").addEventListener("click",()=>stopRec(false));
  document.getElementById("sv").addEventListener("click",()=>stopRec(true));
}
function stopRec(send){
  if(!rec)return;clearInterval(recTimer);if(meter){meter.stop();meter=null;}const r=rec;rec=null;
  r.onstop=async()=>{
    r.stream.getTracks().forEach(t=>t.stop());
    if(!send||!chunks.length){rowText();return;}
    const type=(r.mimeType||"audio/webm").split(";")[0];const ext=type.includes("mp4")?"m4a":type.includes("ogg")?"ogg":"webm";
    const fd=new FormData();fd.append("file",new Blob(chunks,{type}),`vocal.${ext}`);
    busy=true;st(T.loading);try{await post("/voice",fd,true);done(T.sentV);}catch(e){st(e.message,true);rowText();}finally{busy=false;}
  };
  r.stop();
}
async function load(){
  st(T.loading);
  if(!tok){app.innerHTML=`<div class="done"><div style="font-weight:700">${esc(T.expired)}</div><a class="btn" href="/?p=messaging">${esc(T.open)}</a></div>`;return;}
  try{const r=await fetch(`${API}/quick/${encodeURIComponent(tok)}`);if(!r.ok)throw new Error(r.status===401?T.expired:T.fail);data=await r.json();render();}
  catch(e){app.innerHTML=`<div class="done"><div style="font-weight:700">${esc(e.message)}</div><a class="btn" href="${openLink()}">${esc(T.open)}</a></div>`;}
}
load();
})();
