// ── 10.6.0 · Autorisations de l'appareil : micro, caméra, localisation, notifications ──
// Un seul endroit pour les demander : inscription, Profil et menu ⋮ d'un appel.
const ZPERM=[
  {k:"mic",ic:"microphone",q:"microphone",lbl:"zp_mic",x:"zp_mic_x"},
  {k:"cam",ic:"camera",q:"camera",lbl:"zp_cam",x:"zp_cam_x"},
  {k:"geo",ic:"map-pin",q:"geolocation",lbl:"zp_geo",x:"zp_geo_x"},
  {k:"push",ic:"bell",q:"notifications",lbl:"zp_push",x:"zp_push_x"}];
function zpermLocal(k){try{return localStorage.getItem("zd_perm_"+k)||"prompt";}catch(_){return "prompt";}}
function zpermStore(k,v){try{localStorage.setItem("zd_perm_"+k,v);}catch(_){}}
async function zpermState(k){
  if(k==="push"){
    if(!("Notification" in window))return "unsupported";
    const p=Notification.permission;return p==="default"?"prompt":p;
  }
  if((k==="mic"||k==="cam")&&!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia))return "unsupported";
  if(k==="geo"&&!navigator.geolocation)return "unsupported";
  const q=ZPERM.find(x=>x.k===k).q;
  try{if(navigator.permissions&&navigator.permissions.query){const r=await navigator.permissions.query({name:q});return r.state;}}catch(_){}
  return zpermLocal(k);
}
async function zpermAsk(k){
  let res="prompt";
  try{
    if(k==="mic"||k==="cam"){
      const s=await navigator.mediaDevices.getUserMedia(k==="mic"?{audio:true}:{video:true});
      s.getTracks().forEach(tr=>tr.stop());res="granted";
    }else if(k==="geo"){
      res=await new Promise(ok=>navigator.geolocation.getCurrentPosition(()=>ok("granted"),e=>ok(e&&e.code===1?"denied":"granted"),{timeout:15000,maximumAge:600000}));
    }else if(k==="push"){
      if(!("Notification" in window))return "unsupported";
      const p=Notification.permission==="granted"?"granted":await Notification.requestPermission();
      res=p==="default"?"prompt":p;
      if(res==="granted"){try{const reg=await getSwRegistration();const ex=await reg.pushManager.getSubscription();if(!ex)await subscribeCurrentDevice(reg);}catch(_){}}
    }
  }catch(e){res=(e&&(e.name==="NotAllowedError"||e.name==="SecurityError"))?"denied":(e&&e.name==="NotFoundError"?"unsupported":"prompt");}
  zpermStore(k,res);return res;
}
async function zpermAll(){
  const out={};
  for(const p of ZPERM){const s=await zpermState(p.k);if(s==="prompt")out[p.k]=await zpermAsk(p.k);}
  return out;
}
function zpermBadge(s){
  if(s==="granted")return `<span class="zp-st ok"><i class="ti ti-check"></i> ${esc(t("zp_ok"))}</span>`;
  if(s==="denied")return `<span class="zp-st no">${esc(t("zp_denied"))}</span>`;
  if(s==="unsupported")return `<span class="zp-st">${esc(t("zp_unsupported"))}</span>`;
  return "";
}
function zpermRowsHtml(states,compact,after){
  return ZPERM.map(p=>{
    const s=states[p.k];
    const right=s==="prompt"?`<button type="button" class="btn btn-o btn-sm zp-ask" onclick="zpermClick('${p.k}','${after||""}')">${esc(t("zp_ask"))}</button>`:zpermBadge(s);
    return `<div class="zp-row${compact?" c":""}"><span class="zp-ic"><i class="ti ti-${p.ic}"></i></span><span class="zp-tx"><b>${esc(t(p.lbl))}</b>${compact?"":`<small>${esc(t(p.x))}</small>`}${s==="denied"?`<em>${esc(t(p.k==="push"?"zp_denied_push":"zp_denied_help"))}</em>`:""}</span>${right}</div>`;
  }).join("");
}
async function zpermStates(){const o={};for(const p of ZPERM)o[p.k]=await zpermState(p.k);return o;}
async function zpermClick(k,after){await zpermAsk(k);if(after&&typeof window[after]==="function")window[after]();else zpermRenderProfile();}
// ── Carte « Autorisations de cet appareil » en haut du Profil ──
async function zpermRenderProfile(){
  const pg=document.getElementById("page-profile");if(!pg)return;
  let box=document.getElementById("zd-perm-card");
  if(!box){box=document.createElement("div");box.id="zd-perm-card";box.className="es-keep";pg.insertBefore(box,pg.firstElementChild?pg.firstElementChild.nextSibling:null);}
  const st=await zpermStates();
  const missing=ZPERM.filter(p=>st[p.k]==="prompt").length,denied=ZPERM.filter(p=>st[p.k]==="denied").length;
  box.innerHTML=`<div class="card zp-card" style="margin-bottom:16px"><div class="zp-h"><span class="zp-hic${missing||denied?" warn":""}"><i class="ti ti-${missing||denied?"shield-half":"shield-check"}"></i></span><div><b>${esc(t("zp_title"))}</b><small>${esc(t(missing?"zp_sub_missing":denied?"zp_sub_denied":"zp_sub_ok"))}</small></div></div>
    ${zpermRowsHtml(st,true,"zpermRenderProfile")}
    ${missing?`<button type="button" class="btn btn-g zp-all" onclick="zpermAllBtn(this)"><i class="ti ti-checks"></i> ${esc(t("zp_all"))}</button>`:""}</div>`;
}
async function zpermAllBtn(b){if(b)b.disabled=true;await zpermAll();zpermRenderProfile();}
if(typeof loadPage==="function"){
  const _zpLP=loadPage;
  loadPage=async function(p){const r=await _zpLP.apply(this,arguments);if(p==="profile")zpermRenderProfile();return r;};
}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&document.querySelector("#page-profile.active"))zpermRenderProfile();});
// ── Pendant un appel : autoriser le micro / la caméra, changer de micro ou de sortie ──
async function zpermCallHtml(){
  const st={mic:await zpermState("mic"),cam:await zpermState("cam")};
  const row=(p)=>{const s=st[p.k];return `<div class="cl-pr"><i class="ti ti-${p.ic}" aria-hidden="true"></i><span>${esc(t(p.lbl))}</span>${s==="prompt"?`<button type="button" class="cl-pr-b" onclick="zpermCallAsk('${p.k}')">${esc(t("zp_ask"))}</button>`:zpermBadge(s)}</div>${s==="denied"?`<div class="cl-pr-h">${esc(t("zp_denied_help"))}</div>`:""}`;};
  let devs="";
  try{
    const list=await navigator.mediaDevices.enumerateDevices();
    const room=typeof CL!=="undefined"&&CL&&CL.room;
    if(room&&room.switchActiveDevice){
      const mk=(kind,key,title)=>{const arr=list.filter(d=>d.kind===kind&&d.deviceId);if(arr.length<2)return "";
        const cur=room.getActiveDevice?room.getActiveDevice(kind):"";
        return `<div class="cl-dv"><b>${esc(t(title))}</b>${arr.map((d,i)=>`<button type="button" class="cl-dvb${(cur===d.deviceId||(!cur&&i===0))?" on":""}" onclick="zpermCallDevice('${kind}','${esc(d.deviceId)}')">${esc(d.label||(t("zp_device")+" "+(i+1)))}${(cur===d.deviceId||(!cur&&i===0))?' <i class="ti ti-check"></i>':""}</button>`).join("")}</div>`;};
      devs=mk("audioinput","mic","zp_switch_mic")+mk("audiooutput","out","zp_switch_out");
    }
  }catch(_){}
  return `<div class="cl-sec"><div class="cl-cap">${esc(t("zp_title_call"))}</div>${row(ZPERM[0])}${row(ZPERM[1])}${devs}</div>`;
}
async function zpermCallAsk(k){
  await zpermAsk(k);
  if(k==="mic"&&typeof clMicRestart==="function"){try{await clMicRestart();}catch(_){}}
  if(typeof clMoreOpen==="function")clMoreOpen();
}
async function zpermCallDevice(kind,id){
  try{if(CL&&CL.room&&CL.room.switchActiveDevice)await CL.room.switchActiveDevice(kind,id);}catch(e){try{showToast(e.message||t("zp_device_fail"),"error");}catch(_){}}
  if(typeof clMoreOpen==="function")clMoreOpen();
}
