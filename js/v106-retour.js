// ── 10.6.5 · Le geste « retour » du téléphone ramène d'un pas dans l'application ──
// Liste des discussions → discussion : retour = liste. Menu/fenêtre ouverts : retour les ferme.
// Sur l'accueil : « Appuie encore pour quitter ».
const ZB={on:false,entries:[],ign:0,exitAt:0,nav:false,ov:new Set(),busy:false};
const ZB_PERSIST=["modal-terms-update","modal-sector-intro","modal-sector-welcome"];
function zbPage(){return (document.querySelector(".page.active")?.id||"").replace("page-","")||"dashboard";}
function zbOverlays(){
  const ids=[];
  document.querySelectorAll(".modal-overlay").forEach(m=>{if(m.id&&!ZB_PERSIST.includes(m.id)&&m.style.display==="flex")ids.push(m.id);});
  ["zd-photo-v"].forEach(i=>{if(document.getElementById(i))ids.push(i);});
  return ids;
}
function zbChatOpen(){const l=document.getElementById("msg-layout");return !!(l&&l.classList.contains("mobile-chat-open")&&window.innerWidth<=768);}
function zbSig(){return [zbPage(),zbChatOpen()?1:0,zbOverlays().join(",")].join("|");}
function zbPush(k,data){
  if(!ZB.on)return;
  ZB.entries.push(Object.assign({k,p:zbPage()},data||{}));
  try{history.pushState({zb:ZB.entries.length-1},"");}catch(_){}
}
function zbDropTop(){ZB.entries.pop();ZB.ign++;try{history.back();}catch(_){ZB.ign=Math.max(0,ZB.ign-1);}}
function zbInit(){
  if(ZB.on||!State.token)return;
  ZB.on=true;ZB.exitAt=0;ZB.entries=[{k:"root",p:""},{k:"home",p:zbPage()}];ZB.ov=new Set(zbOverlays());
  try{history.replaceState(Object.assign({},history.state||{},{zb:0}),"");history.pushState({zb:1},"");}catch(_){ZB.on=false;}
}
function zbUndo(en){
  if(en.k==="chat"){if(typeof backToConvList==="function"&&zbChatOpen())backToConvList();}
  else if(en.k==="modal"){
    if(en.id==="zd-photo-v"){document.getElementById("zd-photo-v")?.remove();}
    else{const m=document.getElementById(en.id);if(m&&m.style.display==="flex")m.style.display="none";}
    ZB.ov.delete(en.id);
  }else if(en.k==="page"){
    const prev=ZB.entries[ZB.entries.length-1],target=prev&&prev.p;
    if(target&&target!==zbPage()){ZB.nav=true;try{navigate(target);}finally{ZB.nav=false;}}
  }
}
window.addEventListener("popstate",e=>{
  if(!ZB.on)return;
  if(ZB.ign>0){ZB.ign--;return;}
  const z=e.state&&typeof e.state.zb==="number"?e.state.zb:null;
  if(z===null||z>=ZB.entries.length-1)return;           // entrée ajoutée par un autre module (menu, visionneuse…)
  const before=zbSig();
  while(ZB.entries.length-1>z){const en=ZB.entries.pop();zbUndo(en);}
  if(z===0){
    if(Date.now()<ZB.exitAt){ZB.on=false;try{history.back();}catch(_){}return;}   // second appui : on quitte
    ZB.exitAt=Date.now()+2500;
    try{showToast(t("zb_exit"),"info");}catch(_){}
    ZB.entries=[{k:"root",p:""},{k:"home",p:zbPage()}];
    try{history.pushState({zb:1},"");}catch(_){}
    return;
  }
  // l'entrée dépilée ne changeait plus rien à l'écran (fermée entre-temps) : on continue de reculer
  if(zbSig()===before&&!ZB.busy){ZB.busy=true;setTimeout(()=>{ZB.busy=false;try{history.back();}catch(_){}},0);}
});
// Les autres modules réécrivent parfois l'état de l'historique : on garde notre repère
if(history.replaceState){
  const _rs=history.replaceState.bind(history);
  history.replaceState=function(st,ti,url){
    try{const z=history.state&&history.state.zb;if(ZB.on&&typeof z==="number"&&!(st&&typeof st.zb==="number"))st=Object.assign({},st||{},{zb:z});}catch(_){}
    return _rs(st,ti,url);
  };
}
// Pages
if(typeof navigate==="function"){
  const _zbNav=navigate;
  navigate=function(){
    const before=zbPage();const r=_zbNav.apply(this,arguments);
    if(ZB.on&&!ZB.nav){const after=zbPage();if(after!==before)zbPush("page",{});}
    return r;
  };
}
// Discussion ouverte (téléphone) / refermée
if(typeof openConversation==="function"){
  const _zbOC=openConversation;
  openConversation=function(){
    const r=_zbOC.apply(this,arguments);
    try{if(ZB.on&&zbChatOpen()){const top=ZB.entries[ZB.entries.length-1];if(!top||top.k!=="chat")zbPush("chat",{});}}catch(_){}
    return r;
  };
}
if(typeof backToConvList==="function"){
  const _zbBL=backToConvList;
  backToConvList=function(){
    const top=ZB.entries[ZB.entries.length-1];
    const r=_zbBL.apply(this,arguments);
    if(ZB.on&&top&&top.k==="chat"&&!ZB.busy&&ZB.ign===0&&!ZB.undoing)zbDropTop();
    return r;
  };
}
// Fenêtres ouvertes / fermées
(function(){
  const sync=()=>{
    if(!ZB.on)return;
    const now=new Set(zbOverlays());
    now.forEach(id=>{if(!ZB.ov.has(id)){ZB.ov.add(id);zbPush("modal",{id});}});
    [...ZB.ov].forEach(id=>{
      if(now.has(id))return;
      ZB.ov.delete(id);
      const top=ZB.entries[ZB.entries.length-1];
      if(top&&top.k==="modal"&&top.id===id)zbDropTop();
    });
  };
  let t=0;const soon=()=>{clearTimeout(t);t=setTimeout(sync,30);};
  new MutationObserver(soon).observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:["style"]});
  new MutationObserver(m=>{if(m.some(x=>[...x.addedNodes,...x.removedNodes].some(n=>n.id==="zd-photo-v")))soon();}).observe(document.body,{childList:true});
})();
// Démarrage / déconnexion
if(typeof showAppLayout==="function"){
  const _zbSA=showAppLayout;
  showAppLayout=function(){const r=_zbSA.apply(this,arguments);setTimeout(zbInit,400);return r;};
}
if(typeof doLogout==="function"){
  const _zbLO=doLogout;
  doLogout=function(){ZB.on=false;ZB.entries=[];ZB.ov.clear();return _zbLO.apply(this,arguments);};
}
if(State&&State.token)setTimeout(zbInit,800);

/* Garde-fou d'affichage : seuls <main> et les listes défilent. Si un script (focus, scrollIntoView…) fait défiler
   le cadre de l'appli, l'en-tête disparaît et le bas devient vide : on remet le cadre à sa place. */
(function(){
  const frames=()=>[document.getElementById("app-screen"),document.querySelector(".layout"),document.body,document.documentElement];
  function appOn(){const a=document.getElementById("app-screen");return !!a&&a.style.display==="block";}
  function fix(){if(!appOn())return;frames().forEach(e=>{if(e&&(e.scrollTop||e.scrollLeft)){e.scrollTop=0;e.scrollLeft=0;}});}
  document.addEventListener("scroll",ev=>{const t=ev.target;if(t===document||frames().includes(t))fix();},true);
  window.addEventListener("scroll",fix,{passive:true});
  window.addEventListener("resize",fix);
  document.addEventListener("focusin",()=>setTimeout(fix,50));
  setInterval(fix,1500);
})();
