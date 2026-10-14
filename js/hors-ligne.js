const OFFLINE_DB="zd-offline";
let _idbPromise=null;
function offlineDb(){
  if(!("indexedDB" in window))return Promise.reject(new Error("IndexedDB indisponible"));
  if(!_idbPromise)_idbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(OFFLINE_DB,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("cache"))db.createObjectStore("cache");if(!db.objectStoreNames.contains("outbox"))db.createObjectStore("outbox",{keyPath:"id"});};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return _idbPromise;
}
function idbRun(store,mode,op){
  return offlineDb().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(store,mode);const request=op(tx.objectStore(store));
    tx.oncomplete=()=>resolve(request?request.result:undefined);
    tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  }));
}
function offlineUserKey(){return State.tenant?.acting_as_member_email||State.tenant?.email||"anon";}
async function offlineCachePut(path,data){try{await idbRun("cache","readwrite",s=>s.put({data,at:Date.now()},`${offlineUserKey()}|${path}`));}catch(_){}}
async function offlineCacheGet(path){try{return await idbRun("cache","readonly",s=>s.get(`${offlineUserKey()}|${path}`));}catch(_){return null;}}
async function offlineCacheClear(){try{await idbRun("cache","readwrite",s=>s.clear());}catch(_){}}
async function outboxAll(){try{return (await idbRun("outbox","readonly",s=>s.getAll()))||[];}catch(_){return [];}}
async function outboxPut(item){await idbRun("outbox","readwrite",s=>s.put(item));}
async function outboxDelete(id){await idbRun("outbox","readwrite",s=>s.delete(id));}
function newIdempotencyKey(){return (crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`);}
const OFFLINE_WRITE_PREFIXES=["/purchases","/expense-claims","/pos","/delivery-notes","/clients","/invoices","/crm","/accounting/expenses","/stock","/suppliers","/supply-orders","/hr","/objectives","/projects","/price-list"];
function canQueueOffline(method,path){return method!=="GET"&&OFFLINE_WRITE_PREFIXES.some(p=>path===p||path.startsWith(p+"/")||path.startsWith(p+"?"));}
const OFFLINE_SECTION_LABELS={clients:"offline_sec_clients",invoices:"offline_sec_invoices",crm:"offline_sec_crm",accounting:"offline_sec_expenses",stock:"offline_sec_stock",suppliers:"offline_sec_suppliers","supply-orders":"offline_sec_supply",hr:"offline_sec_hr",objectives:"offline_sec_objectives",projects:"offline_sec_projects","price-list":"offline_sec_pricelist"};
function describeOfflineAction(method,path,body){
  const section=t(OFFLINE_SECTION_LABELS[path.split("/")[1]]||"offline_sec_other");
  const detail=body?.name||body?.title||body?.description||body?.items?.[0]?.description||body?.category||"";
  return `${t("offline_verb_"+method.toLowerCase())} · ${section}${detail?` — ${detail}`:""}`;
}
let _isOffline=false,_offlineSince=null;
function setNetworkState(online,cachedAt){
  const changed=_isOffline===online;
  _isOffline=!online;
  if(!online&&cachedAt) _offlineSince=cachedAt;
  if(online) _offlineSince=null;
  document.body.classList.toggle("zd-offline",_isOffline);
  if(changed) refreshOfflineBar();
}
async function queueOffline(method,path,body,key){
  const item={id:key,key,method,path,body,user:offlineUserKey(),created_at:Date.now(),label:describeOfflineAction(method,path,body),failed:false,error:null};
  await outboxPut(item);
  setNetworkState(false);
  refreshOfflineBar();
  setTimeout(()=>showToast(t("offline_queued"),"info"),650);
  return {queued:true,offline:true,id:`offline-${key}`,number:t("offline_pending_number"),name:body?.name||"",invoice_number:t("offline_pending_number"),new_stock:null,success:true};
}
async function refreshOfflineBar(){
  const bar=document.getElementById("offline-bar");if(!bar)return;
  const items=(await outboxAll()).filter(i=>i.user===offlineUserKey());
  const pending=items.filter(i=>!i.failed).length,failed=items.filter(i=>i.failed).length;
  let text="",cls="";
  if(_isOffline){
    text=`📴 ${t("offline_banner")}${_offlineSince?` · ${t("offline_data_from")} ${new Date(_offlineSince).toLocaleTimeString(State.lang==="ar"?"ar":State.lang,{hour:"2-digit",minute:"2-digit"})}`:""}${pending?` · ${t("offline_pending").replace("{n}",pending)}`:""}`;cls="off";
  }else if(pending){text=`🔄 ${t("offline_syncing").replace("{n}",pending)}`;cls="sync";}
  else if(failed){text=`⚠️ ${t("offline_failed").replace("{n}",failed)}`;cls="fail";}
  bar.className=`offline-bar ${cls}`;
  bar.style.display=text?"flex":"none";
  bar.innerHTML=text?`<span>${esc(text)}</span>${(pending||failed)?`<button class="btn btn-o btn-sm" onclick="openOfflineQueue()">${t("offline_details")}</button>`:""}`:"";
}
let _syncing=false;
async function flushOutbox(){
  if(_syncing||!navigator.onLine||!State.token)return;
  const items=(await outboxAll()).filter(i=>!i.failed&&i.user===offlineUserKey()).sort((a,b)=>a.created_at-b.created_at);
  if(!items.length){refreshOfflineBar();return;}
  _syncing=true;let done=0;
  try{
    for(const it of items){
      let r;
      try{
        r=await fetch(API_BASE+it.path,{method:it.method,headers:{"Content-Type":"application/json","Authorization":`Bearer ${State.token}`,"Idempotency-Key":it.key},body:it.body?JSON.stringify(it.body):null});
      }catch(_){setNetworkState(false);break;}
      setNetworkState(true);
      if(r.ok){await outboxDelete(it.id);done++;continue;}
      if(r.status>=500||r.status===401||r.status===429)break;
      let msg=`${t("server_error")} (${r.status})`;
      try{const d=await r.json();if(typeof d.detail==="string")msg=d.detail;else if(Array.isArray(d.detail))msg=d.detail.map(x=>x.msg).join(" · ");}catch(_){}
      it.failed=true;it.error=msg;await outboxPut(it);
    }
  }finally{_syncing=false;}
  await refreshOfflineBar();
  if(done){
    showToast(t("offline_synced").replace("{n}",done));
    const active=document.querySelector(".page.active")?.id?.replace("page-","");
    if(active) loadPage(active);
  }
}
async function openOfflineQueue(){
  const items=(await outboxAll()).filter(i=>i.user===offlineUserKey()).sort((a,b)=>a.created_at-b.created_at);
  const box=document.getElementById("offline-queue-list");
  box.innerHTML=items.map(i=>`<div style="padding:10px 0;border-bottom:1px solid var(--b)">
    <div style="font-size:13px">${i.failed?"⚠️":"⏳"} ${esc(i.label)}</div>
    <div style="font-size:11px;color:var(--muted)">${new Date(i.created_at).toLocaleString(State.lang==="ar"?"ar":State.lang)}</div>
    ${i.failed?`<div style="font-size:12px;color:var(--red);margin:4px 0">${esc(i.error||"")}</div>
      <div style="display:flex;gap:6px"><button class="btn btn-o btn-sm" onclick="retryOfflineItem('${i.id}')">${t("offline_retry")}</button><button class="btn btn-r btn-sm" onclick="dropOfflineItem('${i.id}')">${t("offline_drop")}</button></div>`:""}
  </div>`).join("")||`<div style="color:var(--muted);font-size:13px">${t("offline_nothing")}</div>`;
  document.getElementById("modal-offline").style.display="flex";
}
function closeOfflineQueue(){document.getElementById("modal-offline").style.display="none";}
async function retryOfflineItem(id){
  const it=(await outboxAll()).find(i=>i.id===id);if(!it)return;
  it.failed=false;it.error=null;await outboxPut(it);closeOfflineQueue();flushOutbox();
}
async function dropOfflineItem(id){
  if(!confirm(t("offline_drop_confirm")))return;
  await outboxDelete(id);openOfflineQueue();refreshOfflineBar();
}
window.addEventListener("online",()=>{setNetworkState(true);flushOutbox();});
window.addEventListener("offline",()=>setNetworkState(false));
setInterval(()=>{if(State.token)flushOutbox();},20000);
function zdCacheLangFile(lang){
  if(!("serviceWorker" in navigator)||!lang||lang==="fr")return;
  navigator.serviceWorker.ready.then(reg=>{if(reg.active)reg.active.postMessage({type:"cache-urls",urls:[`/js/i18n/${lang}.js${ZD_ASSET_V?"?v="+ZD_ASSET_V:""}`]});}).catch(()=>{});
}
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").then(()=>zdCacheLangFile(State.lang)).catch(()=>{});});
}
let _deferredInstall=null;
function isStandaloneApp(){return window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;}
function isIOSDevice(){return /iPhone|iPad|iPod/.test(navigator.userAgent);}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();_deferredInstall=e;renderInstallCard();maybeShowInstallBanner();});
window.addEventListener("appinstalled",()=>{_deferredInstall=null;hideInstallBanner();renderInstallCard();showToast(t("app_installed"));});
function renderInstallCard(){
  const box=document.getElementById("install-card-body");if(!box)return;
  if(isStandaloneApp()){box.innerHTML=`<span class="badge bg"><i class="ti ti-circle-check"></i> ${t("app_already_installed")}</span>`;return;}
  if(_deferredInstall){box.innerHTML=`<button class="btn btn-g btn-sm" onclick="installApp()"><i class="ti ti-download"></i> ${t("btn_install_app")}</button>`;return;}
  box.innerHTML=`<div style="font-size:12px;color:var(--muted);line-height:1.6">${isIOSDevice()?t("install_ios_steps"):t("install_browser_steps")}</div>`;
}
async function installApp(){
  if(!_deferredInstall){renderInstallCard();return;}
  _deferredInstall.prompt();
  try{await _deferredInstall.userChoice;}catch(_){}
  _deferredInstall=null;hideInstallBanner();renderInstallCard();
}
function maybeShowInstallBanner(){
  if(isStandaloneApp()||!_deferredInstall||window.innerWidth>768)return;
  try{if(localStorage.getItem("zd_install_dismissed"))return;}catch(_){}
  const b=document.getElementById("install-banner");if(b&&State.token)b.style.display="flex";
}
function hideInstallBanner(){const b=document.getElementById("install-banner");if(b)b.style.display="none";}
function dismissInstallBanner(){try{localStorage.setItem("zd_install_dismissed","1");}catch(_){}hideInstallBanner();}
const QUICK_ACTIONS=[
  {page:"invoices",icon:"ti-file-invoice",label:"qa_invoice",open:()=>openInvModal()},
  {page:"clients",icon:"ti-user-plus",label:"qa_client",open:()=>openClientModal()},
  {page:"expenses",icon:"ti-credit-card",label:"qa_expense",open:()=>openExpenseModal()},
  {page:"stock",icon:"ti-arrows-exchange",label:"qa_stock",open:()=>openStockMoveModal()},
];
function quickActionAllowed(a){return memberCanOpen(a.page)&&!(State.restricted&&!RESTRICTED_ALLOWED_PAGES.includes(a.page));}
function toggleQuickActions(force){
  const sheet=document.getElementById("quick-actions");if(!sheet)return;
  const open=force!==undefined?force:sheet.style.display!=="flex";
  if(open){
    const list=QUICK_ACTIONS.filter(quickActionAllowed);
    sheet.innerHTML=list.map((a,i)=>`<button class="qa-item" onclick="runQuickAction(${QUICK_ACTIONS.indexOf(a)})"><i class="ti ${a.icon}"></i><span>${t(a.label)}</span></button>`).join("");
  }
  sheet.style.display=open?"flex":"none";
  document.getElementById("zd-fab")?.classList.toggle("open",open);
}
async function runQuickAction(i){
  const a=QUICK_ACTIONS[i];toggleQuickActions(false);
  navigate(a.page);
  await new Promise(r=>setTimeout(r,350));
  try{await a.open();}catch(_){}
}
function updateFabVisibility(page){
  const fab=document.getElementById("zd-fab");if(!fab)return;
  const hidden=!State.token||page==="messaging"||page==="pos"||!QUICK_ACTIONS.some(quickActionAllowed);
  fab.style.display=hidden?"none":"";
  if(hidden) toggleQuickActions(false);
}
