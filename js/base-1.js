const APP_BUILD="9.6.2 · 20/10/2026";
const ZD_ENV=(()=>{const host=window.location.hostname;if(host==="localhost"||host==="127.0.0.1")return "local";if(host.includes("staging"))return "staging";return "production";})();
const API_URLS={local:"http://localhost:8000/v1",staging:"https://zenith-dash-staging.up.railway.app/v1",production:"https://zenith-dash-production.up.railway.app/v1"};
const API_BASE=API_URLS[ZD_ENV];
const WS_BASE = API_BASE.replace("https://","wss://").replace("http://","ws://");

const I18N=window.ZD_I18N||(window.ZD_I18N={});
["fr","en","es","ar","sw","ln"].forEach(l=>{if(!I18N[l])I18N[l]={};});
const RTL_LANGS=["ar"];
const LANG_NAMES={fr:"Français",en:"English",es:"Español",ar:"العربية",sw:"Kiswahili",ln:"Lingála"};

function t(key){
  const lang=State.lang||"fr";
  return (I18N[lang]&&I18N[lang][key])||I18N.fr[key]||key;
}
function setTheme(theme){
  State.theme=theme;
  localStorage.setItem("zd_theme",theme);
  document.documentElement.classList.toggle("light",theme==="light");
  const dbtn=document.getElementById("theme-btn-dark"),lbtn=document.getElementById("theme-btn-light");
  if(dbtn) dbtn.classList.toggle("btn-g",theme==="dark");
  if(lbtn) lbtn.classList.toggle("btn-g",theme==="light");
}
const ZD_LANGS=["fr","en","es","ar","sw","ln"];
const ZD_ASSET_V=(document.querySelector('script[src*="/js/base-1.js"]')?.getAttribute("src").split("?v=")[1])||"";
function langLoaded(lang){return I18N[lang]&&Object.keys(I18N[lang]).length>0;}
function loadLangFile(lang){
  return new Promise((resolve,reject)=>{
    if(langLoaded(lang)){resolve();return;}
    const s=document.createElement("script");s.src=`/js/i18n/${lang}.js${ZD_ASSET_V?"?v="+ZD_ASSET_V:""}`;
    s.onload=()=>resolve();s.onerror=()=>reject(new Error("lang"));document.head.appendChild(s);
  });
}
function applyLanguage(lang){
  if(!ZD_LANGS.includes(lang)) lang="fr";
  if(!langLoaded(lang)) return loadLangFile(lang).then(()=>applyLanguageNow(lang)).catch(()=>applyLanguageNow("fr"));
  applyLanguageNow(lang);
  return Promise.resolve();
}
function applyLanguageNow(lang){
  if(!langLoaded(lang)) lang="fr";
  State.lang=lang;
  localStorage.setItem("zd_lang",lang);
  if(typeof zdCacheLangFile==="function")zdCacheLangFile(lang);
  document.documentElement.lang=lang;
  document.documentElement.dir=RTL_LANGS.includes(lang)?"rtl":"ltr";
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key=el.getAttribute("data-i18n");
    const val=t(key);
    if(el.hasAttribute("data-i18n-placeholder")) el.placeholder=val;
    else el.textContent=val;
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{
    el.placeholder=t(el.getAttribute("data-i18n-ph"));
  });
  const sel=document.getElementById("lang-selector");
  if(sel) sel.value=lang;
  const selApp=document.getElementById("lang-selector-app");
  if(selApp) selApp.value=lang;
  try{
    if(State.token&&State.tenant){updateExpiryBar(State.tenant);setHTML("topbar-plan",planBadge(State.tenant.plan));}
  }catch(_){}
  try{if(document.getElementById("landing")?.style.display==="block"&&typeof renderLanding==="function")renderLanding();}catch(_){}
  try{if(typeof renderLegalLinks==="function")renderLegalLinks();}catch(_){}
  try{if(typeof abRenderRegRoles==="function")abRenderRegRoles();}catch(_){}
  try{if(document.getElementById("client-space")?.style.display==="block"&&typeof csRender==="function"&&_cs.data)csRender();}catch(_){}
  try{if(State.token&&State.tenant&&typeof applySectorUI==="function"){applySectorUI();const act=document.querySelector(".page.active")?.id?.replace("page-","");if(act){document.querySelector(`.sidebar .nav-i[data-p="${act}"]`)?.classList.add("active");if(typeof SECTOR_PAGE_LOADERS!=="undefined"&&SECTOR_PAGE_LOADERS[act])loadSectorPage(act);}}}catch(_){}
}

const State={token:localStorage.getItem("zd_token"),tenant:JSON.parse(localStorage.getItem("zd_tenant")||"null"),lang:localStorage.getItem("zd_lang")||"fr",theme:localStorage.getItem("zd_theme")||"dark"};
const _shareTexts={};
async function shareViaNative(key){
  const text=_shareTexts[key];
  if(!text){showToast("Rien à partager pour l'instant","error");return;}
  if(navigator.share){
    try{await navigator.share({text});}
    catch(e){/* utilisateur a annulé le partage, rien à faire */}
  }else{
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank");
  }
}

async function apiFetch(url,opts,retry){
  try{return await fetch(url,opts);}
  catch(e){
    if(retry){
      await new Promise(r=>setTimeout(r,1200));
      try{return await fetch(url,opts);}catch(_){}
    }
    const err=new Error(t("backend_unreachable"));err.zdNetwork=true;throw err;
  }
}
async function readApiResponse(r){
  let d=null;
  try{d=await r.json();}catch(_){}
  if(r.status===401&&State.token&&d&&typeof d.detail==="string"&&/Session déconnectée|Token invalide|Compte introuvable/.test(d.detail)){
    doLogout();showToast(t("session_ended"),"error");throw new Error(d.detail);
  }
  if(r.status===402){
    enterRestrictedMode();
    throw new Error((d&&typeof d.detail==="string"&&d.detail)||t("restricted_toast"));
  }
  if(!r.ok){
    const det=d&&d.detail;
    let m=null;
    if(Array.isArray(det)) m=det.map(x=>x&&x.msg).filter(Boolean).join(" · ");
    else if(det&&typeof det==="object") m=det.message||det.error;
    else m=det;
    const err=new Error(m||`${t("server_error")} (${r.status})`);err.status=r.status;err.data=d;throw err;
  }
  return d;
}
async function api(method,path,body=null){
  const h={"Content-Type":"application/json"};
  if(State.token) h["Authorization"]=`Bearer ${State.token}`;
  if(method==="GET"){
    try{
      const r=await apiFetch(API_BASE+path,{method,headers:h},true);
      const d=await readApiResponse(r);
      setNetworkState(true);
      if(State.token) offlineCachePut(path,d);
      return d;
    }catch(e){
      if(e.zdNetwork&&State.token){
        const cached=await offlineCacheGet(path);
        setNetworkState(false,cached?.at);
        if(cached) return cached.data;
      }
      throw e;
    }
  }
  const key=newIdempotencyKey();
  h["Idempotency-Key"]=key;
  if(!navigator.onLine&&State.token&&canQueueOffline(method,path)) return queueOffline(method,path,body,key);
  try{
    const r=await apiFetch(API_BASE+path,{method,headers:h,body:body?JSON.stringify(body):null},false);
    setNetworkState(true);
    return await readApiResponse(r);
  }catch(e){
    if(e.zdNetwork&&State.token&&canQueueOffline(method,path)) return queueOffline(method,path,body,key);
    throw e;
  }
}
async function apiUpload(path,formData){
  const h={};
  if(State.token) h["Authorization"]=`Bearer ${State.token}`;
  const r=await apiFetch(API_BASE+path,{method:"POST",headers:h,body:formData},false);
  return readApiResponse(r);
}
const RESTRICTED_ALLOWED_PAGES=["billing","messaging","profile"];
function applyRestrictedUI(){
  const on=!!State.restricted;
  document.body.classList.toggle("zd-restricted",on);
  document.querySelectorAll(".nav-i[data-p],.bnav-item[data-bp]").forEach(el=>{
    const p=el.dataset.p||el.dataset.bp;
    el.classList.toggle("zd-locked",on&&!RESTRICTED_ALLOWED_PAGES.includes(p));
  });
  document.querySelectorAll("#more-menu [onclick]").forEach(el=>{
    const m=(el.getAttribute("onclick")||"").match(/navigate\('([a-z0-9-]+)'\)/);
    if(m) el.classList.toggle("zd-locked",on&&!RESTRICTED_ALLOWED_PAGES.includes(m[1]));
  });
  if(on) setHTML("topbar-plan",`<span class="badge br">${t("plan_expired_badge")}</span>`);
  else if(State.tenant) setHTML("topbar-plan",planBadge(State.tenant.plan));
}
function enterRestrictedMode(){
  if(State.restricted||State.tenant?.is_creator) return;
  State.restricted=true;
  applyRestrictedUI();
  const active=document.querySelector(".page.active")?.id?.replace("page-","");
  if(document.getElementById("app-screen")?.style.display==="block"&&!RESTRICTED_ALLOWED_PAGES.includes(active)) navigate("billing");
}

function esc(s){if(s==null)return"";return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function linkify(escapedText){
  return escapedText.replace(/(https?:\/\/[^\s<]+)/g,url=>{
    const clean=url.replace(/[.,;:!?)]+$/,"");
    const trail=url.slice(clean.length);
    return `<a href="${clean}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">${clean}</a>${trail}`;
  });
}
function escJs(s){if(s==null)return"";return String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/&/g,"&amp;").replace(/"/g,"&quot;");}
function fmtUSD(a,cur="USD"){if((a||0)<0)return "−"+fmtUSD(-a,cur);return(cur==="USD"?"$":cur==="EUR"?"€":cur==="XAF"?"XAF ":cur+" ")+new Intl.NumberFormat("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(a||0);}
function parseServerDate(v){
  if(!v) return null;
  if(v instanceof Date) return v;
  const s=String(v);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s+"T00:00:00");
  return new Date(/([zZ]|[+-]\d{2}:?\d{2})$/.test(s)?s:s+"Z");
}
function fmtDate(iso){if(!iso)return"—";return parseServerDate(iso).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});}
function fmtMsgTime(iso){
  if(!iso)return"—";
  const d=parseServerDate(iso),now=new Date();
  const isToday=d.toDateString()===now.toDateString();
  const time=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  return isToday?time:`${d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})} ${time}`;
}
function fmtDayDivider(iso){
  const d=parseServerDate(iso),now=new Date();
  const yesterday=new Date(now);yesterday.setDate(now.getDate()-1);
  if(d.toDateString()===now.toDateString())return t("day_today");
  if(d.toDateString()===yesterday.toDateString())return t("day_yesterday");
  return d.toLocaleDateString(State.lang==="ar"?"ar":State.lang,{day:"numeric",month:"long",year:"numeric"});
}
function fmtLastSeen(iso){
  if(!iso)return t("offline_status");
  const d=parseServerDate(iso),now=new Date();
  const yesterday=new Date(now);yesterday.setDate(now.getDate()-1);
  const time=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  if(d.toDateString()===now.toDateString())return `${t("last_seen_today_prefix")} ${time}`;
  if(d.toDateString()===yesterday.toDateString())return `${t("last_seen_yesterday_prefix")} ${time}`;
  return `${t("last_seen_prefix")} ${d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})} ${time}`;
}
function dayKey(iso){return parseServerDate(iso).toDateString();}
let _lastRenderedDayKey=null;

function planBadge(plan){
  const c={trial:"badge-trial",sandbox:"badge-gray",starter:"bg",professional:"bb",business:"bp",business_plus:"bp",enterprise:"ba"};
  const labels={trial:t("plan_badge_trial"),sandbox:"SANDBOX",starter:"STARTER",professional:t("ab_tier_essentiel").toUpperCase(),business:t("ab_tier_pro").toUpperCase(),business_plus:t("ab_tier_premium").toUpperCase(),enterprise:"ENTREPRISE"};
  return`<span class="badge ${c[plan]||"bb"}">${labels[plan]||plan?.toUpperCase()}</span>`;
}
function statusBadge(s){
  const m={draft:"badge-gray",sent:"bb",paid:"bg",overdue:"br",cancelled:"badge-gray",partial:"ba",
            pending:"ba",approved:"bg",rejected:"br",active:"bg",inactive:"badge-gray",on_leave:"ba",
            lead:"badge-gray",qualified:"bb",proposal:"ba",negotiation:"bp",won:"bg",lost:"br",
            accepted:"bg",in:"bg",out:"br",adjustment:"ba"};
  const labels={draft:t("st_draft"),sent:t("st_sent"),paid:t("st_paid"),overdue:t("st_overdue"),cancelled:t("st_cancelled"),partial:t("st_partial"),
                pending:t("st_pending"),approved:t("st_approved"),rejected:t("st_rejected"),active:t("st_active"),inactive:t("st_inactive"),on_leave:t("st_onleave"),
                lead:t("st_lead"),qualified:t("st_qualified"),proposal:t("st_proposal"),negotiation:t("st_negotiation"),won:t("st_won"),lost:t("st_lost"),
                accepted:t("st_accepted"),in:t("st_in"),out:t("st_out"),adjustment:t("st_adjustment")};
  return`<span class="badge ${m[s]||"bb"}">${labels[s]||s}</span>`;
}

let _expiryInterval=null;
function formatCountdown(msRemaining){
  if(msRemaining<=0) return "Expiré";
  const totalSec=Math.floor(msRemaining/1000);
  const days=Math.floor(totalSec/86400);
  const hours=Math.floor((totalSec%86400)/3600);
  const mins=Math.floor((totalSec%3600)/60);
  const secs=totalSec%60;
  if(days>0) return `${days}j ${hours}h`;
  if(hours>0) return `${hours}h ${String(mins).padStart(2,"0")}min`;
  if(mins>0) return `${mins}min ${String(secs).padStart(2,"0")}s`;
  return `${secs}s`;
}
function updateExpiryBar(user){
  const bar=document.getElementById("trial-bar");
  if(_expiryInterval){clearInterval(_expiryInterval);_expiryInterval=null;}
  if(!user||user.is_creator){bar.className="trial-bar hidden";return;}
  let targetIso=null,label="",linkText="";
  if(user.plan==="trial"&&user.trial){
    if(user.trial.expired){bar.className="trial-bar expired";
      bar.innerHTML=`⚠️ ${t("trial_expired_msg")} &nbsp;·&nbsp; <a href="#" onclick="navigate('billing')" style="color:var(--red);text-decoration:underline">${t("upgrade_view_plans")}</a>`;
      return;}
    if(user.trial.active&&user.trial.expires_at){targetIso=user.trial.expires_at;label=t("trial_label");linkText=t("btn_subscribe");}
  }else if(user.subscription_expires_at){
    targetIso=user.subscription_expires_at;label=t("sub_label");linkText=t("btn_manage");
  }
  if(!targetIso){bar.className="trial-bar hidden";return;}
  const target=parseServerDate(targetIso);
  bar.className="trial-bar";
  const render=()=>{
    const remaining=target-new Date();
    if(remaining<=0){
      bar.className="trial-bar expired";
      bar.innerHTML=`⚠️ ${t("expired_msg")} &nbsp;·&nbsp; <a href="#" onclick="navigate('billing')" style="color:var(--red);text-decoration:underline">${t("upgrade_view_plans")}</a>`;
      clearInterval(_expiryInterval);_expiryInterval=null;
      if(!user.is_creator) enterRestrictedMode();
      return;
    }
    bar.innerHTML=`${label} <b>${formatCountdown(remaining)} ${t("remaining_suffix")}</b> &nbsp;·&nbsp; <a href="#" onclick="navigate('billing')" style="color:var(--green);text-decoration:underline">${linkText} →</a>`;
  };
  render();
  _expiryInterval=setInterval(render,1000);
}

async function login(email,password){
  const r=await api("POST","/auth/login",{email,password});
  if(r.requires_2fa){_loginChallenge=r.challenge;return r;}
  State.token=r.token; State.tenant=r.user;
  localStorage.setItem("zd_token",State.token); localStorage.setItem("zd_tenant",JSON.stringify(r.user)); return r;
}
async function register(data){
  const r=await api("POST","/auth/register",data);
  State.token=r.token; State.tenant=r.user;
  localStorage.setItem("zd_token",State.token); localStorage.setItem("zd_tenant",JSON.stringify(r.user)); return r;
}
function logout(){State.token=null;State.tenant=null;localStorage.removeItem("zd_token");localStorage.removeItem("zd_tenant");}

function showUpgradeBanner(container, feature, requiredPlan) {
  const plans = {crm:"Professional",hr:"Business",stock:"Business",analytics:"Professional",csv:"Starter",api:"Enterprise"};
  const required = plans[feature] || requiredPlan || "supérieur";
  if (!container) return;
  container.innerHTML = `<div class="upgrade-banner">
    <i class="ti ti-lock"></i>
    <div>
      <div style="font-weight:700;color:var(--amber);font-size:13px">${t("upgrade_locked_title")}</div>
      <div style="color:var(--muted);font-size:12px;margin-top:2px">${t("upgrade_available_from")} <b style="color:var(--text)">${required}</b> — <a href="#" onclick="navigate('billing')" style="color:var(--amber)">${t("upgrade_view_plans")}</a></div>
    </div>
  </div>`;
}

function showUsageBar(id, current, max) {
  const el = document.getElementById(id);
  if (!el) return;
  const pct = max === -1 ? 0 : Math.min(100, (current/max)*100);
  const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)';
  el.innerHTML = `<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;color:var(--muted);margin-bottom:3px">
    <span>Utilisé</span><span style="color:${color}">${current}/${max===-1?'∞':max}</span>
  </div><div class="usage-bar"><div class="usage-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
}

function checkFeature(features, feature) {
  if (!features) return true;
  return features[feature] === true;
}
