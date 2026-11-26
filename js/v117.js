const ZK={skip:false,ok:false};
const ZK_KEY="zd_known";
function zkTr(k,v){let s=t(k);Object.entries(v||{}).forEach(([a,b])=>{s=s.split("{"+a+"}").join(String(b));});return s;}
function zkHtml(k,v,bold){let s=esc(t(k));Object.entries(v||{}).forEach(([a,b])=>{const x=esc(String(b));s=s.split("{"+a+"}").join(bold&&bold.includes(a)?`<b>${x}</b>`:x);});return s;}
function zkMailOk(e){return typeof e==="string"&&e.length<=254&&/^[^\s@<>"'`]{1,64}@[^\s@<>"'`]{1,189}\.[^\s@<>"'`]{2,24}$/.test(e);}
function zkGet(){
  try{
    const v=JSON.parse(localStorage.getItem(ZK_KEY)||"null");
    if(v&&zkMailOk(v.e))return {e:v.e,n:typeof v.n==="string"?v.n.replace(/[\u0000-\u001f<>]/g,"").slice(0,40):""};
  }catch(_){}
  return null;
}
function zkForget(){try{localStorage.removeItem(ZK_KEY);}catch(_){}}
function zkSave(){
  const u=State.tenant;if(!u||!State.token)return;
  const mail=String(u.acting_as_member_email||u.email||"").trim().toLowerCase();
  if(u.is_creator){const k=zkGet();if(k&&(k.e===mail||k.e===String(u.email||"").trim().toLowerCase()))zkForget();return;}
  if(!zkMailOk(mail))return;
  const n=String(u.acting_as_member_name||u.name||"").trim().split(/\s+/)[0]||"";
  try{localStorage.setItem(ZK_KEY,JSON.stringify({e:mail,n:n.replace(/[\u0000-\u001f<>]/g,"").slice(0,40)}));}catch(_){}
}
function zkStandalone(){
  try{return ["standalone","fullscreen","minimal-ui"].some(m=>matchMedia(`(display-mode: ${m})`).matches)||navigator.standalone===true;}catch(_){return false;}
}
function zkFine(){try{return matchMedia("(pointer: fine)").matches;}catch(_){return false;}}

function zkMode(mode,k){
  const wrap=document.querySelector("#auth-screen .auth-wrap");if(!wrap)return;
  const nav=document.getElementById("auth-tabs-nav");
  let h=document.getElementById("zk-head"),f=document.getElementById("zk-foot");
  if(!mode){
    if(h)h.remove();if(f)f.remove();
    if(nav)nav.hidden=false;
    wrap.classList.remove("zk-on");
    return;
  }
  wrap.classList.add("zk-on");
  if(nav)nav.hidden=true;
  if(!h){
    h=document.createElement("div");h.id="zk-head";h.className="zk-head";
    const note=document.getElementById("auth-expired-note");
    const ref=note&&note.parentNode===wrap?note:nav;
    if(ref&&ref.parentNode)ref.parentNode.insertBefore(h,ref);else wrap.prepend(h);
  }
  if(mode==="back"&&k){
    const ini=(k.n||k.e).trim().charAt(0).toUpperCase()||"?";
    h.innerHTML=`<span class="zk-av" aria-hidden="true"></span><h1 class="zk-h"></h1><p class="zk-x"></p>`;
    h.querySelector(".zk-av").textContent=ini;
    h.querySelector(".zk-h").textContent=k.n?zkTr("zk_back_t",{n:k.n}):t("zk_back_t0");
    h.querySelector(".zk-x").textContent=t("zk_back_x");
  }else{
    h.innerHTML=`<span class="zk-ic" aria-hidden="true"><i class="ti ti-device-mobile"></i></span><h1 class="zk-h"></h1><p class="zk-x"></p>`;
    h.querySelector(".zk-h").textContent=t("zk_app_t");
    h.querySelector(".zk-x").textContent=zkStandalone()?t("zk_app_x"):t("zk_login_x");
  }
  const tab=document.getElementById("tab-login");
  if(!f&&tab){f=document.createElement("div");f.id="zk-foot";f.className="zk-foot";tab.appendChild(f);}
  if(f){
    f.innerHTML=(mode==="back"?`<button type="button" class="zk-link zk-notme"></button>`:"")+`<p class="zk-new"><span></span> <button type="button" class="zk-link zk-reg"></button></p>`;
    const nm=f.querySelector(".zk-notme");if(nm){nm.textContent=t("zk_not_me");nm.onclick=zkNotMe;}
    f.querySelector(".zk-new span").textContent=t("zk_new");
    const rg=f.querySelector(".zk-reg");rg.textContent=t("zk_new_btn");rg.onclick=zkRegister;
  }
  const em=document.getElementById("login-email"),pw=document.getElementById("login-password");
  if(mode==="back"&&k&&em){em.value=k.e;if(pw&&zkFine())setTimeout(()=>{try{pw.focus();}catch(_){}},60);}
}
function zkShowLogin(k){
  const l=document.getElementById("landing");if(l)l.style.display="none";
  const a=document.getElementById("auth-screen");if(!a)return false;
  a.style.display="flex";
  try{showAuthTab("login");showLogin2faStep(false);}catch(_){}
  zkMode(k?"back":"app",k);
  document.documentElement.classList.remove("zd-boot");
  try{window.scrollTo(0,0);}catch(_){}
  return true;
}
function zkNotMe(){
  zkForget();
  const em=document.getElementById("login-email"),pw=document.getElementById("login-password");
  if(em)em.value="";if(pw)pw.value="";
  if(zkStandalone())zkMode("app");else zkMode(null);
  try{em&&em.focus();}catch(_){}
}
function zkRegister(){
  ZK.skip=true;zkMode(null);
  let shown=false;
  try{shown=_zkLanding();}catch(_){}
  if(!shown){try{hideLanding("register");}catch(_){try{showAuthTab("register");}catch(__){}}}
}
let _zkLanding=()=>false;
if(typeof showLandingNow==="function"){
  _zkLanding=showLandingNow;
  showLandingNow=function(){
    if(!State.token&&!ZK.skip){
      const k=zkGet();
      if(k||zkStandalone())return zkShowLogin(k);
    }
    return _zkLanding.apply(this,arguments);
  };
}
if(typeof showAuthTab==="function"){
  const _zkTab=showAuthTab;
  showAuthTab=function(tab){const r=_zkTab.apply(this,arguments);try{if(tab==="register")zkMode(null);}catch(_){}return r;};
}

function zkSheetClose(){const ov=document.getElementById("zk-lo");if(ov)ov.remove();document.removeEventListener("keydown",zkSheetKey,true);if(ZK.back&&document.contains(ZK.back)){try{ZK.back.focus();}catch(_){}}ZK.back=null;}
function zkSheetKey(e){if(e.key==="Escape"){e.preventDefault();zkSheetClose();}}
function zkSheet(src){
  zkSheetClose();
  ZK.back=src||null;
  const k=zkGet();
  const ov=document.createElement("div");ov.id="zk-lo";ov.className="modal-overlay";ov.style.display="flex";ov.style.alignItems="flex-end";ov.style.zIndex="3000";
  ov.innerHTML=`<div class="modal zx-sheet zk-sheet" role="dialog" aria-modal="true" aria-labelledby="zk-lo-t"><span class="zx-grab" aria-hidden="true"></span>
    <h2 id="zk-lo-t"></h2><p class="zk-lo-x"></p>
    <label class="zk-lo-ck"><input type="checkbox" id="zk-lo-forget"><span></span></label>
    <button type="button" class="btn zk-lo-go"><i class="ti ti-logout" aria-hidden="true"></i> <span></span></button>
    <button type="button" class="btn btn-o zk-lo-no"></button></div>`;
  ov.querySelector("#zk-lo-t").textContent=t("zk_lo_t");
  ov.querySelector(".zk-lo-x").textContent=k&&k.n?zkTr("zk_lo_x",{n:k.n}):t("zk_lo_x0");
  ov.querySelector(".zk-lo-ck span").textContent=t("zk_lo_forget");
  ov.querySelector(".zk-lo-go span").textContent=t("zk_lo_go");
  ov.querySelector(".zk-lo-no").textContent=t("btn_cancel");
  ov.addEventListener("click",e=>{if(e.target===ov)zkSheetClose();});
  ov.querySelector(".zk-lo-no").onclick=zkSheetClose;
  ov.querySelector(".zk-lo-go").onclick=()=>{
    const forget=!!ov.querySelector("#zk-lo-forget").checked;
    zkSheetClose();
    if(forget){zkForget();ZK.forgot=true;}else zkSave();
    ZK.ok=true;
    try{doLogout();}finally{ZK.ok=false;}
  };
  document.body.appendChild(ov);
  document.addEventListener("keydown",zkSheetKey,true);
  setTimeout(()=>{try{ov.querySelector(".zk-lo-no").focus();}catch(_){}},50);
}
function zkClearFloating(){
  try{document.getElementById("zn-nudge")?.remove();document.body.classList.remove("zn-has-nudge");}catch(_){}
  try{const to=document.getElementById("tour-overlay");if(to)to.style.display="none";}catch(_){}
  try{document.getElementById("zl-sheet")?.remove();}catch(_){}
}
function zkAfterLogout(){
  if(State.token)return;
  zkClearFloating();
  const pw=document.getElementById("login-password");if(pw)pw.value="";
  const a=document.getElementById("auth-screen");if(!a||a.style.display==="none")return;
  const k=zkGet();
  if(!k){const em=document.getElementById("login-email");if(em&&ZK.forgot)em.value="";}
  ZK.forgot=false;
  if(k)zkMode("back",k);else if(zkStandalone())zkMode("app");else zkMode(null);
}
if(typeof doLogout==="function"){
  const _zkLO=doLogout;
  doLogout=function(){
    if(!ZK.ok){
      try{
        const ev=window.event;
        if(ev&&ev.type==="click"&&State.token&&!(State.tenant&&State.tenant.is_creator)&&!(typeof LK!=="undefined"&&LK&&LK.locked)){
          const el=ev.target&&ev.target.closest?ev.target.closest("[onclick]"):null;
          if(el&&(el.getAttribute("onclick")||"").trim()==="doLogout()"&&el.querySelector(".ti-logout")&&!el.classList.contains("zg-out")){zkSheet(el);return;}
        }
      }catch(_){}
    }
    const r=_zkLO.apply(this,arguments);
    try{zkAfterLogout();}catch(_){}
    Promise.resolve(r).then(()=>{try{zkAfterLogout();}catch(_){}},()=>{});
    return r;
  };
}

function zkTrialOn(u){try{return typeof zxTimerOn==="function"&&zxTimerOn(u);}catch(_){return false;}}
function zkLoc(){try{return typeof zdLocale==="function"?zdLocale():"fr-FR";}catch(_){return "fr-FR";}}
function zkDate(d,withTime){
  if(!(d instanceof Date)||isNaN(d))return "";
  const loc=zkLoc(),same=d.getFullYear()===new Date().getFullYear();
  let s;
  try{s=d.toLocaleDateString(loc,Object.assign({day:"numeric",month:"long"},same?{}:{year:"numeric"}));}catch(_){s=d.toLocaleDateString();}
  if(/^fr/i.test(loc)&&d.getDate()===1)s=s.replace(/^1 /,"1er ");
  if(withTime){let h;try{h=d.toLocaleTimeString(loc,{hour:"2-digit",minute:"2-digit"});}catch(_){h=d.toLocaleTimeString();}s=zkTr("zk_at",{d:s,h});}
  return s;
}
function zkEnd(tr){try{const d=tr&&tr.expires_at?parseServerDate(tr.expires_at):null;return d&&!isNaN(d)?d:null;}catch(_){return null;}}
function zkPausedBar(u){
  const bar=document.getElementById("trial-bar");if(!bar)return;
  const d=zkEnd(u&&u.trial);
  bar.className="trial-bar zx-tbar zx-paused";
  bar.innerHTML=`${zxIcon("lock",18)}<span><b>${d?zkHtml("zk_t_ended",{d:zkDate(d)}):esc(t("zk_t_ended_n"))}</b> ${esc(t("zx_t_paused_b"))}</span><a href="#" onclick="navigate('billing');return false">${esc(t("zk_t_choose"))}</a>`;
}
let ZKT=null;
if(typeof updateExpiryBar==="function"){
  const _zkBar=updateExpiryBar;
  updateExpiryBar=function(user){
    if(ZKT){clearInterval(ZKT);ZKT=null;}
    if(!zkTrialOn(user))return _zkBar.apply(this,arguments);
    if(typeof _expiryInterval!=="undefined"&&_expiryInterval){clearInterval(_expiryInterval);_expiryInterval=null;}
    const bar=document.getElementById("trial-bar");if(!bar)return;
    const tr=user.trial||{},tid=user.id,end=zkEnd(tr);
    if(tr.expired||!tr.active||!end){zkPausedBar(user);if(typeof enterRestrictedMode==="function")enterRestrictedMode();return;}
    const render=()=>{
      if(!State.token||!State.tenant||State.tenant.id!==tid){if(ZKT){clearInterval(ZKT);ZKT=null;}return;}
      const ms=end-new Date();
      if(ms<=0){if(ZKT){clearInterval(ZKT);ZKT=null;}zkPausedBar({trial:{expired:true,expires_at:tr.expires_at}});if(typeof enterRestrictedMode==="function")enterRestrictedMode();return;}
      let txt,soon=ms<1728e5;
      if(ms<864e5){const h=Math.floor(ms/36e5),m=Math.floor(ms%36e5/6e4);txt=zkHtml("zk_t_last",{h,m:String(m).padStart(2,"0")},["h","m"]);}
      else txt=zkHtml("zk_t_left",{n:Math.ceil(ms/864e5),d:zkDate(end)},["n"]);
      bar.className="trial-bar zx-tbar"+(soon?" zx-soon":"");
      bar.innerHTML=`${zxIcon("clock",18)}<span>${txt}</span><a href="#" onclick="navigate('billing');return false">${esc(t(soon?"zk_t_choose":"zx_t_plans"))}</a>`;
    };
    render();ZKT=setInterval(render,30000);
  };
}
if(typeof applyRestrictedUI==="function"){
  const _zkRUI=applyRestrictedUI;
  applyRestrictedUI=function(){
    const r=_zkRUI.apply(this,arguments);
    try{const u=State.tenant;if(State.restricted&&zkTrialOn(u)&&u.trial&&!u.trial.active)zkPausedBar(u);}catch(_){}
    return r;
  };
}
function zkToPlans(){const el=document.querySelector("#ab-root .ab-head");if(el)el.scrollIntoView({behavior:"smooth",block:"start"});}
if(typeof abStatusHtml==="function"){
  const _zkAS=abStatusHtml;
  abStatusHtml=function(){
    const h=_zkAS.apply(this,arguments);
    const u=State.tenant;if(!zkTrialOn(u))return h;
    const tr=u.trial||{},end=zkEnd(tr);
    if(tr.active&&end&&end>new Date()){
      const left=Math.max(1,Math.ceil((end-new Date())/864e5));
      const total=Math.max(left,parseInt(tr.total_days,10)||15);
      const used=Math.min(total,Math.max(0,total-left)),pct=Math.round(100*used/total);
      return `<section class="zk-ab" aria-labelledby="zk-ab-l"><div class="zk-ab-l" id="zk-ab-l">${esc(t("zk_ab_label"))}</div>
        <div class="zk-ab-n"><b>${left}</b><span>${esc(zkTr(left>1?"zk_ab_days":"zk_ab_day",{t:total}))}</span></div>
        <div class="zk-ab-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${used}" aria-label="${esc(t("zk_ab_used"))}"><span style="width:${pct}%"></span></div>
        <p class="zk-ab-x">${zkHtml("zk_ab_end",{d:zkDate(end,true)},["d"])}</p></section>`+h;
    }
    const d=end;
    const items=["zk_ab_o1","zk_ab_o2","zk_ab_o3","zk_ab_o4"].map(k=>`<li><i class="ti ti-check" aria-hidden="true"></i> ${esc(t(k))}</li>`).join("");
    return `<section class="zk-ab zk-ab-over" aria-labelledby="zk-ab-o"><h2 id="zk-ab-o">${esc(t("zk_ab_over_t"))}</h2>
      <p class="zk-ab-x">${d?zkHtml("zk_ab_over_x",{d:zkDate(d)}):esc(t("zk_ab_over_xn"))}</p>
      <div class="zk-ab-l">${esc(t("zk_ab_open"))}</div><ul class="zk-ab-ul">${items}</ul>
      <button type="button" class="btn btn-g zk-ab-go" onclick="zkToPlans()">${esc(t("zk_ab_go"))}</button></section>`+h;
  };
}

function zkDropStaleFree(){
  const u=State.tenant;if(!u||!u.free_all)return false;
  let stale=false;
  try{if(typeof ZDF!=="undefined"&&ZDF.data&&!ZDF.data.active)stale=true;}catch(_){}
  try{const until=u.free_all&&u.free_all.until;if(until&&String(until).slice(0,10)<new Date().toISOString().slice(0,10))stale=true;}catch(_){}
  if(typeof u.free_all!=="object")stale=true;
  if(stale){delete u.free_all;try{localStorage.setItem("zd_tenant",JSON.stringify(u));}catch(_){}}
  return stale;
}
if(typeof showAppLayout==="function"){
  const _zkSAL=showAppLayout;
  showAppLayout=async function(){
    try{zkDropStaleFree();}catch(_){}
    try{zkMode(null);}catch(_){}
    try{const pw=document.getElementById("login-password");if(pw)pw.value="";}catch(_){}
    const r=await _zkSAL.apply(this,arguments);
    try{zkSave();}catch(_){}
    return r;
  };
}
if(typeof znNudge==="function"){
  const _zkNG=znNudge;
  znNudge=function(){if(!State.token||document.getElementById("app-screen")?.style.display==="none")return;return _zkNG.apply(this,arguments);};
}
if(typeof zdfRefreshPublic==="function"){
  const _zkZR=zdfRefreshPublic;
  zdfRefreshPublic=function(){
    const r=_zkZR.apply(this,arguments);
    try{if(State.token&&State.tenant&&zkDropStaleFree()){updateExpiryBar(State.tenant);setHTML("topbar-plan",planBadge(State.tenant.plan));}}catch(_){}
    return r;
  };
}
if(typeof applyLanguageNow==="function"){
  const _zkALN=applyLanguageNow;
  applyLanguageNow=function(){
    const r=_zkALN.apply(this,arguments);
    try{
      const w=document.querySelector("#auth-screen .auth-wrap.zk-on");
      if(w&&!State.token){const k=zkGet();zkMode(document.getElementById("zk-head")?.querySelector(".zk-av")&&k?"back":"app",k);}
      if(State.token&&State.tenant&&zkTrialOn(State.tenant))updateExpiryBar(State.tenant);
    }catch(_){}
    return r;
  };
}
if(typeof showToast==="function"){
  const _zkToast=showToast;
  showToast=function(msg){
    try{if(!State.token&&/^(Not authenticated|Session expirée|Token invalide)/i.test(String(msg||"")))return;}catch(_){}
    return _zkToast.apply(this,arguments);
  };
}
if(typeof startTour==="function"){
  const _zkST=startTour;
  startTour=function(){if(!State.token||document.getElementById("app-screen")?.style.display==="none")return;return _zkST.apply(this,arguments);};
}
["login","register"].forEach(n=>{
  if(typeof window[n]!=="function")return;
  const _f=window[n];
  window[n]=async function(){const r=await _f.apply(this,arguments);try{zkSave();}catch(_){}return r;};
});
