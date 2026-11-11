// ── 10.5.0 · Socle commun : pages, menus, outils partagés (vague 1, vague 2) ──
const V5_HIDDEN=new Set();
const V5_PAGES={
  plus:[["zdalerts","alert-triangle","nav_v5_alerts","reports"],["zdsecdash","chart-line","nav_v5_secdash","reports"],["zdgoals","target","nav_v5_goals","reports"],["creditbook","notebook","nav_v5_credit","sales"]],
  pme:[["pmeinterventions","adjustments","nav_v5_interventions","sales"],["pmetools","layout-dashboard","nav_v5_tools","sales"],
       ["rgpmecontract","file-certificate","v5_t_contracts","sales",1],["rgpmepurchase","shopping-cart","v5_t_purchases","sales",1],["rgpmefleet","engine","v5_t_fleet","sales",1],["pmeshifts","calendar-time","v5_t_shifts","sales",1]],
  resto:[["restotools","layout-dashboard","nav_v5_tools","sales"],["restotemps","temperature","v5_t_temps","sales",1],["restolots","calendar-due","v5_t_lots","stock",1],["restowaiters","user-star","v5_t_waiters","accounting",1],
         ["restowaste","trash","v5_t_waste","reports",1],["restoanalysis","chart-dots-3","v5_t_analysis","reports",1],["restodaily","star","v5_t_daily","sales",1],["rgcatering","cake","v5_t_catering","sales",1],["restoshifts","calendar-time","v5_t_shifts","sales",1]],
  bar:[["bartools","layout-dashboard","nav_v5_tools","sales"],["barbottles","bottle","v5_t_bottles","sales",1],["barevents","ticket","v5_t_events","sales",1],["baranalytics","clock","v5_t_peak","reports",1],
       ["barscan","barcode","v5_t_barscan","sales",1],["barshifts","calendar-time","v5_t_shifts_dj","sales",1]],
  hotel:[["hotelroomservice","tools-kitchen-2","nav_v5_roomservice","sales"],["hoteltools","layout-dashboard","nav_v5_tools","sales"],["hotelmenus","qrcode","v5_t_hmenus","sales",1],["hotelactivities","sparkles","v5_t_spa","sales",1],
         ["hotelcorporate","building","v5_t_corporate","accounting",1],["hotelguests","users","v5_t_guests","sales",1],["hotelissues","adjustments","v5_t_issues","sales",1],["hotelrates","calendar-stats","v5_t_rates","sales",1],
         ["hotelpolice","id","v5_t_police","sales",1],["rglaundry","bucket","v5_t_laundry","sales",1],["rglost","search","v5_t_lost","sales",1]],
  beauty:[["beautyqueue","list-details","nav_v5_queue","sales"],["beautytools","layout-dashboard","nav_v5_tools","sales"],["beautyreminders","bell","v5_t_reminders","sales",1],["beautycabins","door-enter","v5_t_cabins","sales",1],
          ["rgrent","armchair","v5_t_rent","sales",1],["beautyshifts","calendar-time","v5_t_shifts","sales",1]],
  retail:[["retailtools","layout-dashboard","nav_v5_tools","sales"],["retailcounts","clipboard-check","v5_t_counts","stock",1],["retailpromos","clock-hour-5","v5_t_promos","stock",1],["retailreorder","truck-delivery","v5_t_reorder","stock",1],
          ["retaillabels","tag","v5_t_labels","stock",1],["retailroutes","map-2","v5_t_routes","sales",1],["retailreturns","arrow-back-up","v5_t_returns","sales",1],["retailmargins","discount","v5_t_margins","reports",1]],
  pharmacy:[["pharmatools","layout-dashboard","nav_v5_tools_pharma","sales"],["pharmatemps","temperature","v5_t_vaccine","sales",1],["pharmaregister","lock","v5_t_controlled","sales",1],["rgpharmareturn","arrow-back-up","v5_t_supret","stock",1],["pharmashifts","calendar-time","v5_t_gardes","sales",1]],
  cold:[["colddeliveries","truck","nav_v5_deliveries","sales"],["coldtools","layout-dashboard","nav_v5_tools","sales"],["coldmap","layout-board","v5_t_map","sales",1],["coldlabels","qrcode","v5_t_coldlabels","sales",1],
        ["coldcert","certificate","v5_t_cert","sales",1],["rgcoldcontract","file-certificate","v5_t_ccontracts","sales",1],["rggenerator","plug","v5_t_generator","sales",1],["rgmaintenance","adjustments","v5_t_maint","sales",1]],
  school:[["schooltools","layout-dashboard","nav_v5_tools","sales"],["schoolmeetings","calendar-event","v5_t_meetings","sales",1],["schoolcanteen","tools-kitchen-2","v5_t_canteen","sales",1],["schoolshop","shopping-bag","v5_t_shop","sales",1],
          ["schoolhomework","book","v5_t_homework","sales",1],["schoolprereg","user-plus","v5_t_prereg","sales",1],["schoolgate","id-badge-2","v5_t_gate","sales",1],["schoolhours","clock-dollar","v5_t_hours","accounting",1],
          ["schoolrooms","door-enter","v5_t_rooms","sales",1],["schoolauto","bell-ringing","v5_t_autorem","accounting",1]],
  garage:[["garagetools","layout-dashboard","nav_v5_tools","sales"],["garagewarranties","shield-check","v5_t_warranties","sales",1],["rgloan","engine","v5_t_loans","sales",1]],
};
Object.entries(V5_PAGES).forEach(([m,pages])=>{
  MODULE_PAGES[m]=(MODULE_PAGES[m]||[]).concat(pages.map(p=>[p[0],p[1],p[2],p[3]]));
  pages.forEach(p=>{SECTOR_PAGE_MODULE[p[0]]=m;if(typeof PAGE_MODULES==="object")PAGE_MODULES[p[0]]=p[3];if(p[4])V5_HIDDEN.add(p[0]);});
});
SECTOR_MODULES.pme=["pme"];
const _v5SecMods=sectorModules;
sectorModules=function(){const m=_v5SecMods().slice();if(State.tenant&&!m.includes("plus"))m.push("plus");return m;};
const _v5HasModule=hasModule;
hasModule=function(m){return m==="plus"?!!State.tenant:_v5HasModule(m);};
function v5RetailCredit(){return sectorModules().includes("retail");}
const _v5Apply=applySectorUI;
applySectorUI=function(){
  _v5Apply();
  const hide=p=>V5_HIDDEN.has(p)||(p==="creditbook"&&v5RetailCredit());
  document.querySelectorAll("#nav-sector .nav-i[data-p]").forEach(el=>{if(hide(el.dataset.p))el.remove();});
  document.querySelectorAll("#more-sector [onclick]").forEach(el=>{const m=(el.getAttribute("onclick")||"").match(/navigate\('([a-z0-9-]+)'\)/);if(m&&hide(m[1]))el.remove();});
  const g=document.getElementById("nav-sector");
  if(g&&!g.querySelector(".v5-sep")){const first=g.querySelector('.nav-i[data-p="zdalerts"]');if(first){const s=document.createElement("div");s.className="nav-lbl v5-sep";s.innerHTML=`<i class="ti ti-dashboard"></i> ${esc(t("v5_nav_pilot"))}`;first.before(s);}}
  v5AlertBadge();
};

// ── Petits outils ──
const _v5={};
function v5Back(page){return `<button class="btn btn-o btn-sm" onclick="navigate('${page}')"><i class="ti ti-arrow-left"></i> ${esc(t("v5_back"))}</button>`;}
function v5Head(title,sub,actions,back){return sectorPageHead(esc(title),sub?esc(sub):"",(back?v5Back(back):"")+(actions||""));}
function v5Mgr(){return rsIsManager();}
function v5Badge(txt,cls){return `<span class="badge ${cls||"bb"}">${esc(txt)}</span>`;}
function v5Date(iso){return iso?fmtDate(iso.length===10?iso+"T12:00:00":iso):"—";}
function v5Num(v,d){return new Intl.NumberFormat(State.lang==="ar"?"ar":"fr-FR",{maximumFractionDigits:d??2}).format(v||0);}
function v5Pct(v){return v==null?"—":v5Num(v,1)+" %";}
function v5Wa(phone,msg){const d=String(phone||"").replace(/[^0-9]/g,"");return `https://wa.me/${d}?text=${encodeURIComponent(msg||"")}`;}
function v5Empty(key,icon){return `<div class="card">${zdEmpty(t(key),icon)}</div>`;}
function v5Month(){return zdToday().slice(0,7);}
function v5Tiles(items){return `<div class="v5-tiles">${items.filter(Boolean).map(x=>`<button class="card v5-tile" onclick="navigate('${x[0]}')"><i class="ti ti-${x[1]}"></i><b>${esc(t(x[2]))}</b><small>${esc(t(x[2]+"_x"))}</small></button>`).join("")}</div>`;}
function v5Kpi(label,val,color){return `<div class="card v5-kpi"><div>${esc(label)}</div><b style="${color?`color:${color}`:""}">${val}</b></div>`;}
function v5Table(heads,rows){return `<div class="table-wrap"><table><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;}
function v5QrSvg(text,cell){try{const q=qrcode(0,"M");q.addData(String(text));q.make();return q.createSvgTag({cellSize:cell||3,margin:0,scalable:true});}catch(_){return "";}}
function v5Scan(cb,title){if(typeof openScanner==="function")openScanner(cb,title);else{const c=prompt(title||t("scan_title"));if(c)cb(c);}}
function v5Err(id,e){showErr(id,e&&e.message?e.message:String(e||""));}
async function v5Do(fn,okMsg,errId){try{const r=await fn();if(okMsg)showToast(okMsg);return r;}catch(e){if(errId)v5Err(errId,e);else showToast(e.message,"error");return null;}}
function v5Later(page,ms){setTimeout(()=>{const el=document.getElementById("page-"+page);if(el&&el.classList.contains("active")&&!document.querySelector(".modal-overlay[style*='flex']")&&SECTOR_PAGE_LOADERS[page])SECTOR_PAGE_LOADERS[page](el);},ms||1200);}
function v5Reload(){const p=document.querySelector(".page.active")?.id?.replace("page-","");if(p)navigate(p);}
async function v5Clients(force){if(!_v5.clients||force){const r=await api("GET","/clients/");_v5.clients=Array.isArray(r)?r:(r.items||[]);}return _v5.clients;}
function v5ClientOptions(list,sel){return `<option value="">—</option>`+(list||[]).map(c=>`<option value="${c.id}"${c.id===sel?" selected":""}>${esc(c.name)}${c.phone?" · "+esc(c.phone):""}</option>`).join("");}
async function v5Img(path){try{const r=await fetch(API_BASE+path,{headers:{Authorization:`Bearer ${State.token}`}});if(!r.ok)return "";return URL.createObjectURL(await r.blob());}catch(_){return "";}}
function v5Resize(file,max){return new Promise((res,rej)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{const sc=Math.min(1,(max||1400)/Math.max(img.width,img.height));const cv=document.createElement("canvas");cv.width=Math.round(img.width*sc);cv.height=Math.round(img.height*sc);cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(u);res(cv.toDataURL("image/jpeg",0.82));};img.onerror=rej;img.src=u;});}
function v5Print(title,html){if(typeof zdShowDoc==="function")zdShowDoc(`<div style="color:#111;font-size:12px">${html}</div>`,title);else{const w=window.open("","_blank");w.document.write(`<title>${esc(title)}</title>${html}`);w.document.close();w.print();}}
function v5DocHead(co,title,sub){return `<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:12px"><div><b style="font-size:15px">${esc(co?.name||"")}</b><div style="font-size:11px">${esc([co?.address,co?.phone].filter(Boolean).join(" · "))}</div></div><div style="text-align:right"><div style="font-size:18px;font-weight:800">${esc(title)}</div><div>${esc(sub||"")}</div></div></div>`;}
function v5DocTable(heads,rows){return `<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr>${heads.map(h=>`<th style="text-align:left;border-bottom:2px solid #333;padding:4px">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td style="border-bottom:1px solid #ccc;padding:4px;vertical-align:top">${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;}

// Code-barres Code 128 (B) en SVG, pour les étiquettes
const V5_C128="212222,222122,222221,121223,121322,131222,122213,122312,132212,221213,221312,231212,112232,122132,122231,113222,123122,123221,223211,221132,221231,213212,223112,312131,311222,321122,321221,312212,322112,322211,212123,212321,232121,111323,131123,131321,112313,132113,132311,211313,231113,231311,112133,112331,132131,113123,113321,133121,313121,211331,231131,213113,213311,213131,311123,311321,331121,312113,312311,332111,314111,221411,431111,111224,111422,121124,121421,141122,141221,112214,112412,122114,122411,142112,142211,241211,221114,413111,241112,134111,111242,121142,121241,114212,124112,124211,411212,421112,421211,212141,214121,412121,111143,111341,131141,114113,114311,411113,411311,113141,114131,311141,411131,211412,211214,211232,2331112".split(",");
function v5Barcode(text,h){
  const s=String(text||"").replace(/[^\x20-\x7e]/g,"");if(!s)return "";
  const codes=[104];for(const ch of s)codes.push(ch.charCodeAt(0)-32);
  let sum=104;for(let i=1;i<codes.length;i++)sum+=codes[i]*i;codes.push(sum%103);codes.push(106);
  let x=10,bars="";
  codes.forEach(c=>{const p=V5_C128[c];for(let i=0;i<p.length;i++){const w=+p[i];if(i%2===0)bars+=`<rect x="${x}" y="0" width="${w}" height="${h||40}"/>`;x+=w;}});
  return `<svg viewBox="0 0 ${x+10} ${h||40}" preserveAspectRatio="none" style="width:100%;height:${h||40}px" aria-label="${esc(s)}" role="img"><g fill="#000">${bars}</g></svg>`;
}

// Signature au doigt
function v5SignPad(id){
  const cv=document.getElementById(id);if(!cv)return;const ctx=cv.getContext("2d");const r=window.devicePixelRatio||1;const w=cv.clientWidth,h=cv.clientHeight;cv.width=w*r;cv.height=h*r;ctx.scale(r,r);
  ctx.lineWidth=2.2;ctx.lineCap="round";ctx.strokeStyle="#111";ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);let draw=false;cv.dataset.signed="";
  const pos=e=>{const b=cv.getBoundingClientRect();const p=e.touches?e.touches[0]:e;return [p.clientX-b.left,p.clientY-b.top];};
  const down=e=>{e.preventDefault();draw=true;const [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y);};
  const move=e=>{if(!draw)return;e.preventDefault();const [x,y]=pos(e);ctx.lineTo(x,y);ctx.stroke();cv.dataset.signed="1";};
  const up=()=>{draw=false;};
  cv.addEventListener("pointerdown",down);cv.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}
function v5SignClear(id){const cv=document.getElementById(id);if(cv)v5SignPad(id);}

// ── Fidélité et crédit au comptoir (widget réutilisable) ──
async function v5Perks(cid){try{return await api("GET",`/perks/${cid}`);}catch(_){return null;}}
function v5PerksHtml(p,opts){
  if(!p)return "";opts=opts||{};
  const vs=(p.vouchers||[]).map(v=>`<button type="button" class="btn btn-o btn-sm" onclick="${opts.onVoucher}('${escJs(v.code)}',${v.value_usd})"><i class="ti ti-gift"></i> ${esc(v.code)} · ${zdMoney(v.value_usd)}</button>`).join("");
  const can=p.loyalty_enabled&&p.rewards_available>0;
  return `<div class="v5-perks"><div class="v5-perks-h"><b><i class="ti ti-gift"></i> ${esc(p.name)}</b><span>${esc(t("v5_points").replace("{n}",p.points))}</span></div>
    <div class="v5-perks-r">${p.credit_limit?`<span>${esc(t("v5_credit_left"))} <b>${zdMoney(p.available)}</b> / ${zdMoney(p.credit_limit)}</span>`:`<span style="color:var(--muted)">${esc(t("v5_no_credit"))}</span>`}${p.due?`<span>${esc(t("v5_due"))} <b>${zdMoney(p.due)}</b></span>`:""}</div>
    ${vs||can?`<div class="v5-perks-v">${vs}${can?`<button type="button" class="btn btn-o btn-sm" onclick="v5Redeem('${p.client_id}','${escJs(opts.onVoucher)}')"><i class="ti ti-sparkles"></i> ${esc(t("v5_make_voucher").replace("{p}",p.reward_points).replace("{v}",zdMoney(p.reward_value_usd)))}</button>`:""}</div>`:""}
    ${opts.applied?`<div class="v5-perks-ok"><i class="ti ti-check"></i> ${esc(t("v5_voucher_applied").replace("{c}",opts.applied.code).replace("{v}",zdMoney(opts.applied.value)))}</div>`:""}</div>`;
}
async function v5Redeem(cid,cb){const p=await v5Perks(cid);if(!p)return;try{const v=await api("POST",`/loyalty/clients/${cid}/redeem`,{points:p.reward_points});showToast(t("v5_voucher_made").replace("{c}",v.code));if(window[cb])window[cb](v.code,v.value_usd);}catch(e){showToast(e.message,"error");}}
function v5ClientSearch(boxId,onPick){
  const box=document.getElementById(boxId);if(!box)return;
  box.innerHTML=`<div style="position:relative"><input class="inp" id="${boxId}-q" placeholder="${esc(t("v5_find_client"))}" autocomplete="off"><div class="v5-sug" id="${boxId}-s"></div></div>`;
  const q=document.getElementById(boxId+"-q");let tm=null;
  q.oninput=()=>{clearTimeout(tm);tm=setTimeout(async()=>{const v=q.value.trim();const s=document.getElementById(boxId+"-s");if(v.length<2){s.innerHTML="";return;}
    try{const r=await api("GET",`/perks-search?q=${encodeURIComponent(v)}`);s.innerHTML=r.map(c=>`<button type="button" onclick="(${onPick})('${c.id}','${escJs(c.name)}')">${esc(c.name)}${c.phone?` · ${esc(c.phone)}`:""}</button>`).join("")||`<div style="padding:6px;color:var(--muted);font-size:12px">${esc(t("v5_no_match"))}</div>`;}catch(_){}},250);};
}

// Les requêtes d'encaissement reçoivent le bon de fidélité choisi
let _v5Voucher=null;
const _v5Api=api;
api=async function(method,path,body){
  if(_v5Voucher&&method==="POST"&&body&&typeof body==="object"&&_v5Voucher.rx.test(path)){body={...body,voucher_code:_v5Voucher.code};}
  const r=await _v5Api(method,path,body);
  if(_v5Voucher&&method==="POST"&&_v5Voucher.rx.test(path))_v5Voucher=null;
  return r;
};

// ── Badge d'alertes ──
let _v5AlertAt=0;
async function v5AlertBadge(){
  if(!State.token||Date.now()-_v5AlertAt<120000)return;_v5AlertAt=Date.now();
  try{const r=await api("GET","/alerts/today");const el=document.querySelector('#nav-sector .nav-i[data-p="zdalerts"]');if(!el)return;
    let b=el.querySelector(".nav-badge");if(!b){b=document.createElement("span");b.className="nav-badge";el.appendChild(b);}
    const n=r.danger+r.warning;b.textContent=n;b.style.display=n?"":"none";}catch(_){}
}
