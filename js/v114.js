const ZO_DROP={pme:"crm",restaurant:"restomenu",bar:"restofloor",cold:"coldrooms",hotel:"hotelhk",beauty:"beautyservices",retail:"retailcatalog",pharmacy:"retaillots",school:"schoolgrades",garage:"garagereminders"};
const ZO_GENERIC=["clients","invoices","quotes","crm","marketing","reminders","creditbook","zdgoals","stock","supply","purchases","pricelist","pos","shop","booking","projects","margin","assets","objectives","creports"];
const ZO={open:false};
function zoT(k,v){let s=t(k);Object.entries(v||{}).forEach(([a,b])=>{s=s.split("{"+a+"}").join(b);});return s;}
function zoSec(){return typeof sectorOf==="function"?sectorOf():"pme";}
function zoClient(){try{return typeof zdIsClientAcc==="function"&&zdIsClientAcc();}catch(_){return false;}}
zlBnav=function(){
  if(zoClient())return;
  const inner=document.querySelector(".bottom-nav-inner");if(!inner)return;
  const canMsg=typeof memberCanOpen!=="function"||memberCanOpen("messaging");
  let prof=inner.querySelector('.bnav-item[data-bp="profile"]');
  if(!prof){const d=document.createElement("div");d.innerHTML=`<div class="bnav-item" data-bp="profile" onclick="navigate('profile')"><i class="ti ti-settings"></i><span data-i18n="bnav_profile">${esc(t("bnav_profile"))}</span></div>`;prof=d.firstElementChild;const more=[...inner.children].pop();inner.insertBefore(prof,more||null);}
  if(canMsg&&!inner.querySelector('.bnav-item[data-bp="messaging"]')){
    const d=document.createElement("div");d.innerHTML=zlMsgItem();inner.insertBefore(d.firstElementChild,prof);
  }
  const msg=inner.querySelector('.bnav-item[data-bp="messaging"]');
  if(msg&&msg.nextElementSibling!==prof)inner.insertBefore(msg,prof);
  const drop=ZO_DROP[zoSec()];const it=drop&&inner.querySelector(`.bnav-item[data-bp="${drop}"]`);
  if(it&&inner.querySelectorAll(".bnav-item").length>6)it.remove();
  const act=document.querySelector(".page.active")?.id?.replace("page-","");
  inner.querySelectorAll(".bnav-item[data-bp]").forEach(x=>x.classList.toggle("active",x.dataset.bp===act));
  zlBadge();
};
function zoHidden(){
  if(typeof fullMenuWanted==="function"&&fullMenuWanted())return [];
  const sec=zoSec(),hide=new Set([...((typeof SECTOR_HIDE==="object"&&SECTOR_HIDE[sec])||[]),...((typeof ZS_HIDE==="object"&&ZS_HIDE[sec])||[])]);
  return ZO_GENERIC.filter(p=>hide.has(p)&&(typeof memberCanOpen!=="function"||memberCanOpen(p))).map(p=>{
    const nav=document.querySelector(`.sidebar .nav-i[data-p="${p}"]`);
    const mm=[...document.querySelectorAll("#more-menu [onclick]")].find(el=>(el.getAttribute("onclick")||"").includes(`navigate('${p}')`)&&el.id!=="zo-other");
    const src=nav||mm;if(!src)return null;
    const label=(src.querySelector("span[data-i18n]")||src).textContent.replace(/\s+/g," ").trim();
    const ic=(src.querySelector("i.ti")?.className.match(/ti-[a-z0-9-]+/g)||[]).find(c=>c!=="ti")||"ti-apps";
    return label?{p,label,ic}:null;
  }).filter(Boolean);
}
function zoLocked(p){try{return typeof zpLocked==="function"&&zpLocked(p)!=null;}catch(_){return false;}}
function zoGo(p){if(!ZO_GENERIC.includes(p)&&!Object.values(ZO_DROP).includes(p))return;try{if(typeof closeMoreMenu==="function")closeMoreMenu();}catch(_){}navigate(p);}
function zoToggle(btn){
  ZO.open=!ZO.open;
  document.querySelectorAll(".zo-tg").forEach(b=>b.setAttribute("aria-expanded",String(ZO.open)));
  document.querySelectorAll(".zo-body").forEach(b=>b.hidden=!ZO.open);
}
function zoBody(items,side){
  const tiles=items.map(x=>{const lk=zoLocked(x.p);
    return side?`<div class="nav-i zo-ni" data-zo="${esc(x.p)}" role="button" tabindex="0"><i class="ti ${esc(x.ic)}"></i><span>${esc(x.label)}</span>${lk?'<i class="ti ti-lock zo-lk" aria-hidden="true"></i>':""}</div>`
      :`<button type="button" class="zo-tile${lk?" lk":""}" data-zo="${esc(x.p)}"><i class="ti ${esc(x.ic)}" aria-hidden="true"></i><span>${esc(x.label)}</span>${lk?'<i class="ti ti-lock zo-lk" aria-hidden="true"></i>':""}</button>`;}).join("");
  return `<p class="zo-x">${esc(t("zo_x"))}</p><div class="${side?"zo-list":"zo-grid"}">${tiles}</div>`;
}
function zoHead(n){return `<span class="zo-h"><b>${esc(t("zo_title"))}</b><small>${esc(zoT("zo_sub",{n}))}</small></span><i class="ti ti-chevron-down zo-ch" aria-hidden="true"></i>`;}
function zoWire(root){
  root.querySelectorAll(".zo-tg").forEach(b=>{if(!b.dataset.w){b.dataset.w="1";b.addEventListener("click",()=>zoToggle(b));}});
  root.querySelectorAll("[data-zo]").forEach(el=>{if(!el.dataset.w){el.dataset.w="1";el.addEventListener("click",()=>zoGo(el.dataset.zo));el.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&el.tagName!=="BUTTON"){e.preventDefault();zoGo(el.dataset.zo);}});}});
}
function zoPlus(){
  const m=document.getElementById("more-menu");if(!m)return;
  document.getElementById("zl-prof-tile")?.remove();
  const drop=ZO_DROP[zoSec()],box=document.getElementById("more-sector");
  if(box&&drop){const tl=[...box.children].find(el=>(el.getAttribute("onclick")||"").includes(`navigate('${drop}')`));if(tl&&box.firstElementChild!==tl)box.prepend(tl);}
  if(drop&&!zoClient()&&!m.querySelector(`[onclick*="navigate('${drop}')"]`)){
    const nav=document.querySelector(`.sidebar .nav-i[data-p="${drop}"]`);
    if(nav&&(typeof memberCanOpen!=="function"||memberCanOpen(drop))){
      const label=(nav.querySelector("span[data-i18n]")||nav).textContent.replace(/\s+/g," ").trim();
      const ic=(nav.querySelector("i.ti")?.className.match(/ti-[a-z0-9-]+/g)||[])[0]||"ti-apps";
      const d=document.createElement("div");d.id="zo-drop";d.setAttribute("onclick",`navigate('${drop}');closeMoreMenu()`);d.setAttribute("role","button");d.tabIndex=0;
      d.style.cssText="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:10px;background:var(--card);cursor:pointer";
      d.innerHTML=`<i class="ti ${esc(ic)}" style="font-size:22px"></i><span style="font-size:10px">${esc(label)}</span>`;
      const grid=document.querySelector("#mm-body .mm-grid");if(grid)grid.prepend(d);else m.prepend(d);
    }
  }
  const items=zoClient()?[]:zoHidden();
  let g=document.getElementById("zo-other");
  if(!items.length){g?.remove();return;}
  const sig=items.map(x=>x.p+(zoLocked(x.p)?"1":"0")).join(",")+"|"+t("zo_title");
  if(!g){g=document.createElement("section");g.id="zo-other";g.className="mm-sec zo-other";g.dataset.k="zo_title";}
  const body=document.getElementById("mm-body");
  if(body){const none=document.getElementById("mm-none");if(g.parentElement!==body||g.nextElementSibling!==none)body.insertBefore(g,none||null);}
  else if(g.parentElement!==m)m.appendChild(g);
  if(g.dataset.sig!==sig){
    g.dataset.sig=sig;
    g.innerHTML=`<h2 class="mm-t" hidden></h2><button type="button" class="zo-tg" aria-expanded="${ZO.open}" aria-controls="zo-b1">${zoHead(items.length)}</button><div class="zo-body" id="zo-b1"${ZO.open?"":" hidden"}>${zoBody(items,false)}</div>`;
    zoWire(g);
  }
  g.hidden=false;
  if(!g.dataset.obs){g.dataset.obs="1";new MutationObserver(()=>{if(!g.hidden)return;const q=(document.getElementById("mm-q")?.value||"").trim();if(!q||[...g.querySelectorAll(".zo-tile")].some(x=>!x.hidden))g.hidden=false;}).observe(g,{attributes:true,attributeFilter:["hidden"]});}
}
function zoSide(){
  const sb=document.querySelector(".sidebar");if(!sb)return;
  const items=zoClient()?[]:zoHidden();
  let g=document.getElementById("zo-side");
  if(!items.length){g?.remove();return;}
  const groups=sb.querySelectorAll(".nav-g");const last=groups[groups.length-1];if(!last)return;
  if(!g){g=document.createElement("div");g.id="zo-side";g.className="nav-g zo-side";last.after(g);}
  g.innerHTML=`<button type="button" class="zo-tg" aria-expanded="${ZO.open}" aria-controls="zo-b2">${zoHead(items.length)}</button><div class="zo-body" id="zo-b2"${ZO.open?"":" hidden"}>${zoBody(items,true)}</div>`;
  zoWire(g);
}
if(typeof toggleMoreMenu==="function"){
  const _zoTM=toggleMoreMenu;
  toggleMoreMenu=function(){const r=_zoTM.apply(this,arguments);try{zoPlus();setTimeout(zoPlus,100);}catch(_){}return r;};
}
if(typeof applySectorUI==="function"){
  const _zoASU=applySectorUI;
  applySectorUI=function(){const r=_zoASU.apply(this,arguments);try{zoSide();}catch(_){}return r;};
}
if(typeof zpSet==="function"){
  const _zoSet=zpSet;
  zpSet=function(){const r=_zoSet.apply(this,arguments);try{zoSide();if(document.getElementById("zo-other"))zoPlus();}catch(_){}return r;};
}
if(typeof applyLanguage==="function"){
  const _zoL=applyLanguage;
  applyLanguage=function(){const r=_zoL.apply(this,arguments);try{zoSide();if(document.getElementById("zo-other"))zoPlus();}catch(_){}return r;};
}
try{if(State.token&&State.tenant){zlBnav();zoSide();}}catch(_){}
try{if(typeof ZP!=="undefined"&&Array.isArray(ZP)){const z=ZP.find(x=>x.id==="more-menu");if(z)z.stay=(z.stay?z.stay+",":"")+".zo-tg";}}catch(_){}
function zoSearch(){
  const q=(document.getElementById("mm-q")?.value||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim();
  const g=document.getElementById("zo-other");if(!g)return;
  const tiles=[...g.querySelectorAll(".zo-tile")];
  if(!q){tiles.forEach(x=>x.hidden=false);g.hidden=false;g.querySelector(".zo-body").hidden=!ZO.open;g.querySelector(".zo-tg").setAttribute("aria-expanded",String(ZO.open));return;}
  let n=0;tiles.forEach(x=>{const ok=x.textContent.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().includes(q);x.hidden=!ok;if(ok)n++;});
  if(!n)g.hidden=true;if(n){g.hidden=false;g.querySelector(".zo-body").hidden=false;g.querySelector(".zo-tg").setAttribute("aria-expanded","true");const none=document.getElementById("mm-none");if(none)none.hidden=true;}
}
document.addEventListener("input",e=>{if(e.target&&e.target.id==="mm-q")setTimeout(zoSearch,0);},true);
