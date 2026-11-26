const ZQ_ORDER=["push","mic","cam","geo"];
const ZQ_IC={push:"bell",mic:"microphone",cam:"camera",geo:"map-pin"};
const ZQ={over:{},tab:null,model:""};
function zqT(k,v){let s=t(k);Object.entries(v||{}).forEach(([a,b])=>{s=s.split("{"+a+"}").join(b);});return s;}
function zqFmt(s){return esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");}
function zqIos(){const u=navigator.userAgent||"";return /iPhone|iPad|iPod/i.test(u)||(/Macintosh/i.test(u)&&navigator.maxTouchPoints>1);}
function zqAndroid(){return /Android/i.test(navigator.userAgent||"");}
function zqSamBrowser(){return /SamsungBrowser/i.test(navigator.userAgent||"");}
function zqSamsung(){return zqSamBrowser()||/SM-[A-Z0-9]|SAMSUNG|Galaxy/i.test((navigator.userAgent||"")+" "+ZQ.model);}
function zqStandalone(){try{return typeof isStandaloneApp==="function"&&isStandaloneApp();}catch(_){return false;}}
(function(){try{if(navigator.userAgentData&&navigator.userAgentData.getHighEntropyValues)navigator.userAgentData.getHighEntropyValues(["model"]).then(v=>{ZQ.model=(v&&v.model)||"";}).catch(()=>{});}catch(_){}})();
function zqDefaultTab(){if(zqIos())return "ios";if(zqSamBrowser())return "sam";if(zqStandalone())return "app";return "chrome";}
if(typeof zpermState==="function"){
  const _zqS=zpermState;
  zpermState=async function(k){const s=await _zqS.apply(this,arguments);if(s==="granted"&&ZQ.over[k])return ZQ.over[k];return s;};
}
async function zqProbe(k){
  try{
    if(k==="mic"||k==="cam"){
      if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia))return "unsupported";
      const s=await navigator.mediaDevices.getUserMedia(k==="mic"?{audio:true}:{video:true});
      s.getTracks().forEach(tr=>tr.stop());return "granted";
    }
    if(k==="geo"){
      if(!navigator.geolocation)return "unsupported";
      return await new Promise(ok=>navigator.geolocation.getCurrentPosition(()=>ok("granted"),e=>ok(e&&e.code===1?"denied":(e&&e.code===2?"off":"granted")),{timeout:15000,maximumAge:600000}));
    }
    if(k==="push"){
      if(!("Notification" in window))return "unsupported";
      const p=Notification.permission==="granted"?"granted":await Notification.requestPermission();
      if(p==="granted"){try{const reg=await getSwRegistration();const ex=await reg.pushManager.getSubscription();if(!ex)await subscribeCurrentDevice(reg);}catch(_){}}
      return p==="default"?"prompt":p;
    }
  }catch(e){
    const n=e&&e.name;
    if(n==="NotAllowedError"||n==="SecurityError"||n==="PermissionDeniedError")return "denied";
    if(n==="NotReadableError"||n==="AbortError"||n==="TrackStartError"||n==="SourceUnavailableError")return "busy";
    if(n==="NotFoundError"||n==="DevicesNotFoundError"||n==="OverconstrainedError")return "nodev";
    return "prompt";
  }
  return "prompt";
}
if(typeof zpermAsk==="function"){
  zpermAsk=async function(k){
    const r=await zqProbe(k);
    if(r==="busy"||r==="off"||r==="nodev"){ZQ.over[k]=r;try{zpermStore(k,r==="nodev"?"prompt":"granted");}catch(_){}}
    else{delete ZQ.over[k];try{zpermStore(k,r);}catch(_){}}
    return r==="nodev"?"unsupported":r;
  };
}
function zqLabel(k){return t("zq_l_"+k);}
function zqRow(k,s,after,compact){
  let right="",note="";
  const a=after?`,'${after}'`:"";
  if(s==="granted")right=`<span class="zq-pill ok">${esc(t("zq_ok"))}</span>`;
  else if(s==="denied")right=`<span class="zq-pill no">${esc(t("zq_blocked"))}</span><button type="button" class="btn btn-o btn-sm zq-b" onclick="zqGuide('${k}'${a})">${esc(t("zq_unblock"))}</button>`;
  else if(s==="busy"){right=`<span class="zq-pill warn">${esc(t(k==="cam"?"zq_busy_f":"zq_busy"))}</span><button type="button" class="btn btn-o btn-sm zq-b" onclick="zqVerify('${k}'${a})">${esc(t("zq_retry"))}</button>`;note=t(k==="cam"?"zq_busy_cam":"zq_busy_mic");}
  else if(s==="off"){right=`<span class="zq-pill warn">${esc(t("zq_off"))}</span><button type="button" class="btn btn-o btn-sm zq-b" onclick="zqVerify('${k}'${a})">${esc(t("zq_retry"))}</button>`;note=t("zq_off_geo");}
  else if(s==="unsupported")right=`<span class="zq-pill">${esc(t("zq_nodev"))}</span>`;
  else right=`<button type="button" class="btn btn-g btn-sm zq-b" onclick="zqSeq(['${k}']${a})">${esc(t("zq_allow"))}</button>`;
  const rec=k==="push"&&s!=="granted"&&s!=="unsupported"&&t("zn_rec")!=="zn_rec"?` <span class="zn-rec">${esc(t("zn_rec"))}</span>`:"";
  return `<div class="zq-row" data-k="${k}" data-s="${esc(s)}"><span class="zq-ic"><i class="ti ti-${ZQ_IC[k]}" aria-hidden="true"></i></span><span class="zq-tx"><b>${esc(zqLabel(k))}${rec}</b>${compact?"":`<small>${esc(t("zq_w_"+k))}</small>`}</span><span class="zq-r">${right}</span>${note?`<em class="zq-note">${esc(note)}</em>`:""}</div>`;
}
zpermRowsHtml=function(states,compact,after){return ZQ_ORDER.map(k=>zqRow(k,states[k],after,compact)).join("");};
async function zqStates(){const o={};for(const k of ZQ_ORDER)o[k]=await zpermState(k);return o;}
zpermStates=zqStates;
const ZQ_AFTER=["zpermRenderProfile","obPermRefresh"];
function zqAfter(after){if(after&&ZQ_AFTER.includes(after)&&typeof window[after]==="function")window[after]();else zpermRenderProfile();}
zpermRenderProfile=async function(){
  const pg=document.getElementById("page-profile");if(!pg)return;
  let box=document.getElementById("zd-perm-card");
  if(!box){box=document.createElement("div");box.id="zd-perm-card";box.className="es-keep";pg.insertBefore(box,pg.firstElementChild?pg.firstElementChild.nextSibling:null);}
  const st=await zqStates();
  const den=ZQ_ORDER.filter(k=>st[k]==="denied").length,miss=ZQ_ORDER.filter(k=>st[k]==="prompt").length,warn=ZQ_ORDER.filter(k=>st[k]==="busy"||st[k]==="off").length;
  const sub=den?zqT("zq_sub_den",{n:den}):(miss?t("zq_sub_miss"):(warn?"":t("zq_sub_ok")));
  box.innerHTML=`<div class="card zq-card"><div class="zq-h"><span class="zq-hic${den||miss||warn?" warn":""}"><i class="ti ti-${den||miss||warn?"shield":"shield-check"}" aria-hidden="true"></i></span><div><b>${esc(t("zq_title"))}</b>${sub?`<small>${esc(sub)}</small>`:""}</div></div>
    <div class="zq-rows">${zpermRowsHtml(st,true,"zpermRenderProfile")}</div>
    ${miss>1?`<button type="button" class="btn btn-g zq-wide" onclick="zqSeqMissing('zpermRenderProfile')">${esc(t("zq_missing_all"))}</button>`:""}</div>`;
};
async function zqSeqMissing(after){const st=await zqStates();zqSeq(ZQ_ORDER.filter(k=>st[k]==="prompt"),after);}
zpermAll=async function(){const st=await zqStates();return new Promise(res=>zqSeq(ZQ_ORDER.filter(k=>st[k]==="prompt"),null,res));};
zpermAllBtn=async function(){zqSeqMissing("zpermRenderProfile");};
function zqSheet(id,html,label){
  let ov=document.getElementById(id);if(ov)ov.remove();
  ov=document.createElement("div");ov.id=id;ov.className="modal-overlay zq-ov";ov.style.display="flex";ov.style.alignItems="flex-end";
  ov.onclick=e=>{if(e.target===ov)zqClose(id);};
  ov.innerHTML=`<div class="modal zx-sheet zq-sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}"><span class="zx-grab" aria-hidden="true"></span>${html}</div>`;
  document.body.appendChild(ov);return ov;
}
function zqClose(id){const ov=document.getElementById(id);if(ov){if(ov._done){const f=ov._done;ov._done=null;f();}ov.remove();}}
function zqSeq(list,after,done){
  list=(list||[]).filter(k=>ZQ_ORDER.includes(k));
  const fin=()=>{if(done)done();zqAfter(after);};
  if(!list.length){fin();return;}
  let i=0;
  const show=()=>{
    if(i>=list.length){zqClose("zq-seq");fin();return;}
    const k=list[i];
    const ov=zqSheet("zq-seq",`<small class="zq-of">${esc(zqT("zq_s_of",{n:i+1,t:list.length}))}</small>
      <div class="zq-big"><span class="zq-ic l"><i class="ti ti-${ZQ_IC[k]}" aria-hidden="true"></i></span><div><h2 id="zq-seq-t">${esc(zqLabel(k))}</h2><p>${esc(t("zq_w_"+k))}</p></div></div>
      <div class="zq-inst"><i class="ti ti-info-circle" aria-hidden="true"></i><span>${zqFmt(t("zq_s_inst"))}</span></div>
      <button type="button" class="btn btn-g zq-wide" id="zq-seq-go">${esc(zqT("zq_s_btn",{x:t("zq_a_"+k)}))}</button>
      <button type="button" class="zx-link" id="zq-seq-later">${esc(t("zq_s_later"))}</button>`,t("zq_s_title"));
    ov._done=null;ov.onclick=e=>{if(e.target===ov){i=list.length;show();}};
    ov.querySelector("#zq-seq-go").onclick=async function(){
      this.disabled=true;
      const r=await zpermAsk(k);
      if(r==="granted")try{showToast(zqT("zq_res_ok",{p:zqLabel(k)}));}catch(_){}
      i++;
      if(r==="denied"){zqClose("zq-seq");zqGuide(k,after,()=>{if(i<list.length)show();else fin();});return;}
      show();
    };
    ov.querySelector("#zq-seq-later").onclick=()=>{i++;show();};
  };
  show();
}
function zqStepsFor(k,tab){
  const p=t("zq_n_"+k);
  const phone=b=>zqT("zq_phone",{b,p});
  if(tab==="ios")return [k==="geo"?t("zq_ios_geo"):(k==="push"?t("zq_ios_push"):zqT("zq_ios_media",{p})),t("zq_ios_2")];
  if(tab==="app")return [t("zq_app_1"),t("zq_app_2"),zqT("zq_app_3",{p}),phone("Chrome"),t("zq_back")];
  if(tab==="sam")return [t("zq_si_1"),zqT("zq_si_2",{p}),t("zq_si_3"),phone("Samsung Internet"),t("zq_back")];
  return [t("zq_ch_1"),zqT("zq_ch_2",{p}),phone("Chrome"),t("zq_back")];
}
function zqResetSteps(tab){
  if(tab==="ios")return [t("zq_r_ios_1"),t("zq_r_ios_2"),t("zq_r_end")];
  if(tab==="sam")return [t("zq_r_si_1"),t("zq_r_si_2"),t("zq_r_si_3"),t("zq_r_end")];
  return [t("zq_r_ch_1"),t("zq_r_ch_2"),t("zq_r_ch_3"),t("zq_r_end")];
}
function zqTabs(tabs,cur,fn){return `<div class="zq-tabs" role="tablist">${tabs.map(x=>`<button type="button" role="tab" aria-selected="${x===cur}" class="zq-tab${x===cur?" on":""}" onclick="${fn}('${x}')">${esc(t({app:"zq_t_app",chrome:"zq_t_chrome",sam:"zq_t_sam",ios:"zq_t_ios"}[x]))}</button>`).join("")}</div>`;}
function zqList(steps){return `<ol class="zx-steps zq-steps">${steps.map((s,i)=>`<li><span>${i+1}</span><div>${zqFmt(s)}</div></li>`).join("")}</ol>`;}
function zqGuideTabs(){const a=[];if(!zqIos())a.push("app","chrome","sam");a.push("ios");return a;}
function zqGuide(k,after,done){
  if(!ZQ_ORDER.includes(k))return;
  ZQ.g={k,after,done,tab:ZQ.g&&ZQ.g.k===k&&ZQ.g.tab?ZQ.g.tab:zqDefaultTab(),msg:""};
  if(!zqGuideTabs().includes(ZQ.g.tab))ZQ.g.tab=zqGuideTabs()[0];
  zqGuideRender();
}
function zqGuideTab(x){if(ZQ.g){ZQ.g.tab=x;ZQ.g.msg="";zqGuideRender();}}
function zqGuideRender(){
  const g=ZQ.g;if(!g)return;
  const ov=zqSheet("zq-guide",`<h2 id="zq-g-t">${esc(zqT("zq_g_title",{p:zqLabel(g.k)}))}</h2><p class="zx-muted">${esc(t("zq_g_sub"))}</p>
    ${zqTabs(zqGuideTabs(),g.tab,"zqGuideTab")}
    ${zqList(zqStepsFor(g.k,g.tab))}
    ${g.msg?`<div class="zq-msg ${g.msgOk?"ok":""}" role="status">${esc(g.msg)}</div>`:""}
    <button type="button" class="zq-more" onclick="zqReset()">${esc(t("zq_still"))} <u>${esc(t("zq_reset_link"))}</u></button>
    <div class="zq-foot"><button type="button" class="btn btn-o" onclick="zqClose('zq-guide')">${esc(t("zq_close"))}</button><button type="button" class="btn btn-g" id="zq-g-v" onclick="zqGuideVerify()">${esc(t("zq_verify"))}</button></div>`,zqT("zq_g_title",{p:zqLabel(g.k)}));
  ov._done=()=>{const d=g.done;g.done=null;zqAfter(g.after);if(d)d();};
}
async function zqGuideVerify(){
  const g=ZQ.g;if(!g)return;
  const b=document.getElementById("zq-g-v");if(b)b.disabled=true;
  const r=await zpermAsk(g.k);
  if(r==="granted"){try{showToast(zqT("zq_res_ok",{p:zqLabel(g.k)}));}catch(_){}zqClose("zq-guide");return;}
  g.msgOk=false;
  g.msg=r==="busy"?t(g.k==="cam"?"zq_busy_cam":"zq_busy_mic"):(r==="off"?t("zq_off_geo"):(r==="unsupported"?t("zq_nodev_x"):zqT("zq_res_den",{p:zqLabel(g.k)})));
  if(r==="busy"||r==="off"){zqClose("zq-guide");try{showToast(g.msg,"error");}catch(_){}return;}
  zqGuideRender();
}
async function zqVerify(k,after){
  const r=await zpermAsk(k);
  if(r==="granted")try{showToast(zqT("zq_res_ok",{p:zqLabel(k)}));}catch(_){}
  else if(r==="denied"){zqGuide(k,after);return;}
  else if(r==="busy"||r==="off")try{showToast(t(r==="off"?"zq_off_geo":(k==="cam"?"zq_busy_cam":"zq_busy_mic")),"error");}catch(_){}
  zqAfter(after);
}
function zqReset(){
  const tabs=zqGuideTabs().filter(x=>x!=="app");
  ZQ.r=ZQ.r&&tabs.includes(ZQ.r)?ZQ.r:(zqIos()?"ios":(zqSamBrowser()?"sam":"chrome"));
  zqResetRender();
}
function zqResetTab(x){ZQ.r=x;zqResetRender();}
function zqResetRender(){
  const keep=document.getElementById("zq-guide");if(keep)keep.style.display="none";
  const tabs=zqGuideTabs().filter(x=>x!=="app");
  const ov=zqSheet("zq-reset",`<h2>${esc(t("zq_r_title"))}</h2><div class="zq-warn"><i class="ti ti-alert-triangle" aria-hidden="true"></i><span>${esc(t("zq_r_sub"))}</span></div>
    ${zqTabs(tabs,ZQ.r,"zqResetTab")}${zqList(zqResetSteps(ZQ.r))}
    <div class="zq-foot"><button type="button" class="btn btn-o" onclick="zqResetBack()">${esc(t("zq_close"))}</button><button type="button" class="btn btn-g" onclick="zqResetBack(true)">${esc(t("zq_verify"))}</button></div>`,t("zq_r_title"));
  ov.onclick=e=>{if(e.target===ov)zqResetBack();};
}
function zqResetBack(verify){
  document.getElementById("zq-reset")?.remove();
  const g=document.getElementById("zq-guide");
  if(g){g.style.display="flex";if(verify)zqGuideVerify();}
}
if(typeof zpermCallHtml==="function"){
  const _zqC=zpermCallHtml;
  zpermCallHtml=async function(){
    let h=await _zqC.apply(this,arguments);
    const st={mic:await zpermState("mic"),cam:await zpermState("cam")};
    const den=["mic","cam"].filter(k=>st[k]==="denied");let i=0;
    const help=`<div class="cl-pr-h">${esc(t("zp_denied_help"))}</div>`;
    while(h.includes(help)&&i<den.length){const k=den[i++];h=h.replace(help,`<div class="cl-pr-h"><button type="button" class="cl-pr-b" onclick="zqGuide('${k}')">${esc(t("zq_unblock"))}</button></div>`);}
    return h;
  };
}
if(typeof obPerm==="function"){
  window.obPermAll=async function(b){if(b)b.disabled=true;const st=await zqStates();zqSeq(ZQ_ORDER.filter(k=>st[k]==="prompt"),"obPermRefresh");};
}
function zqInAppName(){
  const u=navigator.userAgent||"";
  if(/GSA\//i.test(u))return t("zq_a_google");
  if(/FBAN|FBAV|FB_IAB/i.test(u))return "Facebook";
  if(/Instagram/i.test(u))return "Instagram";
  if(/WhatsApp/i.test(u))return "WhatsApp";
  if(/TikTok|musical_ly|Bytedance/i.test(u))return "TikTok";
  if(/Snapchat/i.test(u))return "Snapchat";
  if(/Line\//i.test(u))return "LINE";
  return t("zq_a_other");
}
function zqInApp(){try{if(typeof zxInApp==="function")return zxInApp();}catch(_){}return /FBAN|FBAV|Instagram|Line\/|WhatsApp|GSA\/|Snapchat|TikTok|; wv\)/i.test(navigator.userAgent||"");}
function zqSafeUrl(){const l=location;return l.origin+l.pathname+l.search+(/token|code|reset/i.test(l.hash)?"":l.hash);}
async function zqOpenOutside(){
  const u=zqSafeUrl();
  if(zqAndroid()){location.href="intent://"+u.replace(/^https?:\/\//,"")+"#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url="+encodeURIComponent(u)+";end";return;}
  try{await navigator.clipboard.writeText(u);showToast(t("zq_ia_copied"));}catch(_){try{prompt(t("zq_ia_copied"),u);}catch(__){}}
}
function zqInAppHide(){try{sessionStorage.setItem("zd_zq_ia","1");}catch(_){}document.getElementById("zq-ia")?.remove();document.body.classList.remove("zq-ia-on");}
function zqInAppBanner(){
  if(!zqInApp()||zqStandalone())return;
  try{if(sessionStorage.getItem("zd_zq_ia")==="1")return;}catch(_){}
  if(document.getElementById("zq-ia"))return;
  const ios=zqIos();
  const d=document.createElement("div");d.id="zq-ia";d.className="zq-ia";d.setAttribute("role","alert");
  d.innerHTML=`<div class="zq-ia-in"><div class="zq-ia-h"><span class="zq-ic"><i class="ti ti-${ios?"world":"external-link"}" aria-hidden="true"></i></span><b>${esc(t(ios?"zq_ia_ios_title":"zq_ia_title"))}</b><button type="button" class="zq-x" aria-label="${esc(t("zq_hide"))}" onclick="zqInAppHide()"><i class="ti ti-x" aria-hidden="true"></i></button></div>
    <p>${esc(zqT("zq_ia_x",{a:zqInAppName()}))}</p>
    <button type="button" class="btn btn-g zq-wide" onclick="zqOpenOutside()">${esc(t(ios?"zq_ia_ios_btn":"zq_ia_btn"))}</button>
    ${ios?"":`<small>${esc(t("zq_ia_sam"))}</small>`}</div>`;
  document.body.appendChild(d);document.body.classList.add("zq-ia-on");
}
if(typeof applyLanguage==="function"){
  const _zqL=applyLanguage;
  applyLanguage=function(){const r=_zqL.apply(this,arguments);try{if(document.getElementById("zq-ia")){document.getElementById("zq-ia").remove();zqInAppBanner();}if(document.querySelector("#page-profile.active"))zpermRenderProfile();}catch(_){}return r;};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(zqInAppBanner,600));else setTimeout(zqInAppBanner,600);
