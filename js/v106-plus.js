/* Zenith Dash 10.7.1 — menu « Plus » en plein écran : titre, recherche, fonctions rangées par groupes.
   Les tuiles d'origine sont déplacées (jamais copiées) : les règles de rôle, de secteur et de pointage continuent de s'appliquer. */
(function(){
  if(typeof toggleMoreMenu!=="function")return;
  const GROUPS=[
    ["mm_g_sales",["shop","pos","clients","quotes","marketing","booking","reminders","pricelist","objectives","margin"]],
    ["mm_g_team",["employees","attendance","pointage","leaves","payroll","claims","team"]],
    ["mm_g_buy",["purchases","supply","expenses","assets","bank"]],
    ["mm_g_acc",["ledger","pl","reports","creports","analytics","ai"]],
    ["mm_g_org",["projects","calendar","files","messaging","notifications","announcements"]],
    ["mm_g_account",["billing","integrations","accountant","import","help","audit"]]];
  const TILE='[onclick*="navigate("]';
  const more=()=>document.getElementById("more-menu");
  const pageOf=el=>((el.getAttribute("onclick")||"").match(/navigate\('([a-z0-9_-]+)'\)/)||[])[1]||"";
  const norm=s=>(s||"").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();
  const isOpen=()=>{const m=more();return !!m&&m.style.display!=="none"&&m.style.display!=="";};
  function sec(id,key){
    let s=document.getElementById(id);
    if(!s){s=document.createElement("section");s.id=id;s.className="mm-sec";s.innerHTML='<h2 class="mm-t"></h2>';}
    s.dataset.k=key;return s;
  }
  const setTxt=(el,v)=>{if(el&&el.textContent!==v)el.textContent=v;};
  const setAttr=(el,k,v)=>{if(el&&el.getAttribute(k)!==v)el.setAttribute(k,v);};
  function build(){
    const m=more();if(!m)return;
    let head=document.getElementById("mm-head"),body=document.getElementById("mm-body");
    if(!head){
      head=document.createElement("div");head.id="mm-head";
      head.innerHTML='<div class="mm-bar"><h1 id="mm-title"></h1><button type="button" id="mm-x" class="mm-x"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>'+
        '<label class="mm-search"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input type="search" id="mm-q" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>';
      body=document.createElement("div");body.id="mm-body";
      const old=[...m.children];
      m.append(head,body);
      old.forEach(c=>body.appendChild(c));
      head.querySelector("#mm-x").addEventListener("click",()=>closeMoreMenu());
      head.querySelector("#mm-q").addEventListener("input",refresh);
      const none=document.createElement("div");none.id="mm-none";none.hidden=true;body.appendChild(none);
      m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.setAttribute("aria-labelledby","mm-title");
    }
    // 1. Ton métier : les blocs ajoutés par le secteur et les offres spéciales
    const trade=sec("mm-s-trade","mm_g_trade");
    if(trade.parentElement!==body)body.prepend(trade);
    ["more-sector","more-special"].forEach(id=>{const b=document.getElementById(id);if(b&&b.parentElement!==trade)trade.appendChild(b);});
    [...m.children].forEach(c=>{if(c!==head&&c!==body)trade.appendChild(c);});      // bloc ajouté pendant que le menu était fermé
    // 2. Les groupes
    let prev=trade;
    GROUPS.forEach(([key,pages])=>{
      const s=sec("mm-s-"+key.slice(5),key);
      let g=s.querySelector(".mm-grid");if(!g){g=document.createElement("div");g.className="mm-grid";s.appendChild(g);}
      if(s.parentElement!==body)prev.after(s);
      prev=s;
      pages.forEach(p=>{
        body.querySelectorAll(TILE).forEach(el=>{
          if(pageOf(el)!==p||el.closest("#mm-s-trade")||el.parentElement===g)return;
          g.appendChild(el);
        });
      });
    });
    // 3. Le reste (fonctions ajoutées plus tard par d'autres modules)
    const other=sec("mm-s-other","mm_g_other");
    if(other.parentElement!==body)prev.after(other);
    [...body.children].forEach(c=>{if(!c.classList.contains("mm-sec")&&c.id!=="mm-none"){c.classList.add("mm-grid");other.appendChild(c);}});
    {const none=document.getElementById("mm-none");if(body.lastElementChild!==none)body.appendChild(none);}
    // textes (la langue peut avoir changé)
    setTxt(document.getElementById("mm-title"),t("mm_title"));
    const x=document.getElementById("mm-x");setAttr(x,"aria-label",t("mm_close"));setAttr(x,"title",t("mm_close"));
    const q=document.getElementById("mm-q");setAttr(q,"placeholder",t("mm_search"));setAttr(q,"aria-label",t("mm_search"));
    body.querySelectorAll(".mm-sec").forEach(s=>{setTxt(s.querySelector(".mm-t"),t(s.dataset.k));});
    setTxt(document.getElementById("mm-none"),t("mm_none"));
  }
  function refresh(){
    const body=document.getElementById("mm-body");if(!body)return;
    const q=norm(document.getElementById("mm-q").value);
    let total=0;
    body.querySelectorAll(TILE).forEach(el=>{el.classList.toggle("mm-nomatch",!!q&&!norm(el.textContent).includes(q));});
    body.querySelectorAll(".mm-sec").forEach(s=>{
      let n=0;s.querySelectorAll(TILE).forEach(el=>{if(getComputedStyle(el).display!=="none")n++;});
      s.hidden=!n;total+=n;
    });
    document.getElementById("mm-none").hidden=!!total;
  }
  function place(){
    const m=more();if(!m)return;
    const app=document.getElementById("app-screen"),nav=document.querySelector(".bottom-nav");
    const H=(window.visualViewport&&window.visualViewport.height)||window.innerHeight;
    const top=app&&app.style.display==="block"?Math.max(0,Math.round(app.getBoundingClientRect().top)):0;
    let bottom=0;
    if(nav&&getComputedStyle(nav).display!=="none"){const r=nav.getBoundingClientRect();if(r.height>0&&r.top>0)bottom=Math.max(0,Math.round(top+H-r.top));}
    m.style.top=top+"px";m.style.bottom=bottom+"px";m.style.maxHeight="none";
  }
  function open(){
    const m=more(),b=document.getElementById("more-menu-backdrop");if(!m)return;
    try{build();}catch(e){console.error(e);}
    m.classList.add("mm-full");m.style.display="flex";if(b)b.style.display="block";
    place();
    const q=document.getElementById("mm-q");if(q)q.value="";
    try{refresh();}catch(_){}
    const body=document.getElementById("mm-body");if(body)body.scrollTop=0;
    document.querySelectorAll('.bnav-item[onclick*="toggleMoreMenu"]').forEach(e=>e.classList.add("mm-on"));
  }
  const _close=closeMoreMenu;
  closeMoreMenu=function(){
    const r=_close.apply(this,arguments);
    const q=document.getElementById("mm-q");if(q){q.value="";try{q.blur();}catch(_){}}
    document.querySelectorAll(".bnav-item.mm-on").forEach(e=>e.classList.remove("mm-on"));
    return r;
  };
  toggleMoreMenu=function(){if(isOpen())closeMoreMenu();else if(appOn())open();};
  // déconnexion ou sortie de l'appli : le menu ne doit jamais rester par-dessus l'accueil
  const appOn=()=>{const a=document.getElementById("app-screen");return !!a&&a.style.display==="block";};
  if(typeof doLogout==="function"){const _lo=doLogout;doLogout=function(){try{closeMoreMenu();}catch(_){}return _lo.apply(this,arguments);};}
  const watch=()=>{const a=document.getElementById("app-screen");if(a)new MutationObserver(()=>{if(!appOn()&&isOpen())closeMoreMenu();}).observe(a,{attributes:true,attributeFilter:["style"]});};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",watch);else watch();
  window.addEventListener("resize",()=>{if(isOpen())place();});
  if(window.visualViewport)window.visualViewport.addEventListener("resize",()=>{if(isOpen())place();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&isOpen())closeMoreMenu();});
  // un module ajoute ou retire des fonctions pendant que le menu est ouvert : on range et on recompte
  let tm=0;
  const obs=()=>{const m=more();if(!m)return;new MutationObserver(()=>{if(!isOpen())return;clearTimeout(tm);tm=setTimeout(()=>{try{build();refresh();}catch(_){}} ,60);}).observe(m,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",obs);else obs();
})();
