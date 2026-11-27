const ZF={k:"zd_fab_pos",drag:false,just:false,timer:null,sx:0,sy:0,pid:null,tip:null};
function zfTr(k,v){let s=t(k);Object.entries(v||{}).forEach(([a,b])=>{s=s.split("{"+a+"}").join(String(b));});return s;}
function zfEl(){return document.getElementById("zd-fab");}
function zfLoad(){try{const v=JSON.parse(localStorage.getItem(ZF.k)||"null");if(v&&(v.s==="l"||v.s==="r")&&typeof v.y==="number"&&isFinite(v.y))return {s:v.s,y:Math.min(1,Math.max(0,v.y))};}catch(_){}return null;}
function zfSave(v){try{if(v)localStorage.setItem(ZF.k,JSON.stringify(v));else localStorage.removeItem(ZF.k);}catch(_){}}
function zfBounds(){
  const tb=document.querySelector(".topbar");const tr=tb&&tb.offsetParent!==null?tb.getBoundingClientRect():null;
  const top=Math.max(8,(tr?tr.bottom:56)+8);
  const nav=document.querySelector(".bottom-nav");const nr=nav&&nav.offsetParent!==null?nav.getBoundingClientRect():null;
  const bottom=(nr&&nr.height>0?nr.top:window.innerHeight)-8;
  return {top,bottom};
}
function zfQa(v,y,h){
  const qa=document.getElementById("quick-actions");if(!qa)return;
  if(!v){["left","right","top","bottom","alignItems"].forEach(k=>qa.style[k]="");return;}
  const side=v.s==="l";
  qa.style.left=side?"16px":"auto";qa.style.right=side?"auto":"16px";qa.style.alignItems=side?"flex-start":"flex-end";
  if(y+h/2>window.innerHeight/2){qa.style.top="auto";qa.style.bottom=Math.max(8,window.innerHeight-y+10)+"px";}
  else{qa.style.bottom="auto";qa.style.top=(y+h+10)+"px";}
}
function zfApply(){
  const f=zfEl();if(!f||ZF.drag)return;
  const v=zfLoad();
  if(!v){["left","right","top","bottom"].forEach(k=>f.style[k]="");zfQa(null);return;}
  const {top,bottom}=zfBounds(),h=f.offsetHeight||56;
  const y=Math.round(Math.min(Math.max(top,v.y*window.innerHeight),Math.max(top,bottom-h)));
  f.style.top=y+"px";f.style.bottom="auto";
  if(v.s==="l"){f.style.left="16px";f.style.right="auto";}else{f.style.right="16px";f.style.left="auto";}
  zfQa(v,y,h);
}
function zfTip(show,x,y){
  if(!show){ZF.tip?.remove();ZF.tip=null;return;}
  if(!ZF.tip){ZF.tip=document.createElement("div");ZF.tip.className="zf-tip";ZF.tip.setAttribute("role","status");document.body.appendChild(ZF.tip);ZF.tip.textContent=t("zf_drop");}
  const w=ZF.tip.offsetWidth||200,left=x>window.innerWidth/2?Math.max(8,x-w-44):Math.min(window.innerWidth-w-8,x+44);
  ZF.tip.style.left=left+"px";ZF.tip.style.top=Math.max(8,y-18)+"px";
}
function zfStart(e){
  const f=zfEl();if(!f||e.button>0)return;
  ZF.sx=e.clientX;ZF.sy=e.clientY;ZF.pid=e.pointerId;ZF.drag=false;
  clearTimeout(ZF.timer);
  ZF.timer=setTimeout(()=>{
    ZF.drag=true;f.classList.add("zf-drag");
    try{f.setPointerCapture(ZF.pid);}catch(_){}
    try{navigator.vibrate&&navigator.vibrate(18);}catch(_){}
    try{if(typeof toggleQuickActions==="function")toggleQuickActions(false);}catch(_){}
    zfMove({clientX:ZF.sx,clientY:ZF.sy});
  },380);
}
function zfMove(e){
  const f=zfEl();if(!f)return;
  if(!ZF.drag){if(ZF.timer&&Math.hypot(e.clientX-ZF.sx,e.clientY-ZF.sy)>12){clearTimeout(ZF.timer);ZF.timer=null;}return;}
  if(e.preventDefault&&e.cancelable)e.preventDefault();
  const w=f.offsetWidth||56,h=f.offsetHeight||56,{top,bottom}=zfBounds();
  const x=Math.min(Math.max(4,e.clientX-w/2),window.innerWidth-w-4);
  const y=Math.min(Math.max(top,e.clientY-h/2),Math.max(top,bottom-h));
  f.style.left=x+"px";f.style.top=y+"px";f.style.right="auto";f.style.bottom="auto";
  zfTip(true,x+w/2,y+h/2);
}
function zfEnd(){
  clearTimeout(ZF.timer);ZF.timer=null;
  const f=zfEl();
  if(!ZF.drag||!f)return;
  ZF.drag=false;ZF.just=true;setTimeout(()=>{ZF.just=false;},400);
  f.classList.remove("zf-drag");zfTip(false);
  const r=f.getBoundingClientRect();
  zfSave({s:r.left+r.width/2<window.innerWidth/2?"l":"r",y:r.top/window.innerHeight});
  zfApply();
  try{localStorage.setItem("zd_fab_hint","1");}catch(_){}
}
function zfInit(){
  const f=zfEl();if(!f||f.dataset.zf)return;
  f.dataset.zf="1";
  f.addEventListener("pointerdown",zfStart);
  f.addEventListener("pointermove",zfMove,{passive:false});
  f.addEventListener("pointerup",zfEnd);
  f.addEventListener("pointercancel",zfEnd);
  f.addEventListener("lostpointercapture",()=>{if(ZF.drag)zfEnd();});
  f.addEventListener("contextmenu",e=>e.preventDefault());
  f.addEventListener("click",e=>{if(ZF.just){e.preventDefault();e.stopImmediatePropagation();}},true);
  f.title=t("zf_hint");
  zfApply();
}
function zfReset(){zfSave(null);zfApply();showToast(t("zf_reset_done"));}
if(typeof toggleQuickActions==="function"){
  const _zfQA=toggleQuickActions;
  toggleQuickActions=function(force){
    if(ZF.drag||ZF.just)return;
    const r=_zfQA.apply(this,arguments);
    try{
      zfApply();
      const qa=document.getElementById("quick-actions");
      if(qa&&qa.style.display==="flex"){
        let seen=false;try{seen=localStorage.getItem("zd_fab_hint")==="1";}catch(_){}
        if(!seen){try{localStorage.setItem("zd_fab_hint","1");}catch(_){}setTimeout(()=>showToast(t("zf_hint")),300);}
      }
    }catch(_){}
    return r;
  };
}
if(typeof updateFabVisibility==="function"){
  const _zfUV=updateFabVisibility;
  updateFabVisibility=function(){const r=_zfUV.apply(this,arguments);try{zfInit();zfApply();}catch(_){}return r;};
}
window.addEventListener("resize",()=>{try{zfApply();}catch(_){}});
window.addEventListener("orientationchange",()=>setTimeout(()=>{try{zfApply();}catch(_){}},300));

function zmFit(){
  document.querySelectorAll(".zd-more.open .zd-more-m").forEach(m=>{
    m.style.left="";m.style.right="";m.style.maxWidth="";
    const vw=document.documentElement.clientWidth||window.innerWidth;
    m.style.maxWidth=Math.max(160,vw-16)+"px";
    let r=m.getBoundingClientRect();
    if(r.left<8){m.style.left="0";m.style.right="auto";r=m.getBoundingClientRect();}
    if(r.right>vw-8){const shift=r.right-(vw-8);const cur=parseFloat(getComputedStyle(m).left)||0;m.style.left=(cur-shift)+"px";m.style.right="auto";r=m.getBoundingClientRect();}
    if(r.left<8){const cur=parseFloat(getComputedStyle(m).left)||0;m.style.left=(cur+(8-r.left))+"px";}
  });
}
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest(".zd-more-b"))setTimeout(zmFit,0);},true);
window.addEventListener("resize",()=>{try{zmFit();}catch(_){}});
if(typeof zdOwnItems==="function"){
  const _zmOI=zdOwnItems;
  zdOwnItems=function(m,id){
    const r=_zmOI.apply(this,arguments);
    try{
      if(id==="myspace"&&State.tenant&&!(typeof zdIsClientAcc==="function"&&zdIsClientAcc())&&!State.tenant.space_linked){
        const b=document.createElement("button");b.type="button";b.className="btn zd-mi zd-own";b.setAttribute("role","menuitem");
        b.innerHTML=`<i class="ti ti-home" aria-hidden="true"></i> <span></span>`;b.querySelector("span").textContent=t("zm_back_mgmt");
        b.addEventListener("click",()=>navigate("dashboard"));
        m.prepend(b);
      }
    }catch(_){}
    return r;
  };
}

const ZNG={user:false,allow:0};
function znActive(){return (document.querySelector(".page.active")?.id||"").replace(/^page-/,"");}
function znUserEvent(){try{const ev=window.event;return !!(ev&&ev.isTrusted!==false&&/^(click|keydown|keyup|pointerup|touchend|submit|change|input)$/.test(ev.type));}catch(_){return false;}}
if(typeof navigate==="function"){
  const _znNavG=navigate;
  navigate=function(p){
    try{
      if(znUserEvent())ZNG.user=true;
      else if(typeof p==="string"&&State.token&&!ZNG.allow){
        const cur=znActive();
        if(p!==cur){
          const client=typeof zdIsClientAcc==="function"&&zdIsClientAcc();
          if(p==="myspace"&&!client&&cur&&cur!=="myspace")return;
          const home=typeof UI==="object"&&UI&&UI.p&&UI.p.home;
          if(ZNG.user&&home&&p===home&&p!=="dashboard")return;
        }
      }
    }catch(_){}
    return _znNavG.apply(this,arguments);
  };
}
if(typeof openDeepLink==="function"){
  const _znODL=openDeepLink;
  openDeepLink=async function(){ZNG.allow++;try{return await _znODL.apply(this,arguments);}finally{ZNG.allow=Math.max(0,ZNG.allow-1);}};
}
if(typeof showAppLayout==="function"){
  const _znSAL=showAppLayout;
  showAppLayout=async function(){
    ZNG.user=false;
    const r=await _znSAL.apply(this,arguments);
    try{
      const client=typeof zdIsClientAcc==="function"&&zdIsClientAcc();
      if(typeof UI==="object"&&UI&&UI.p&&UI.p.home==="myspace"&&!client){delete UI.p.home;if(typeof uiChanged==="function")uiChanged();}
      zfInit();zfApply();
    }catch(_){}
    return r;
  };
}

function zhPages(){
  const out=[];
  try{if(typeof uiFeatures==="function")uiFeatures().forEach(f=>{let locked=false;try{locked=typeof zpLocked==="function"&&zpLocked(f.id)!=null;}catch(_){}if(!locked&&(f.id!=="myspace"||(typeof zdIsClientAcc==="function"&&zdIsClientAcc())))out.push([f.id,f.name]);});}catch(_){}
  if(!out.some(x=>x[0]==="dashboard"))out.unshift(["dashboard",t("bnav_home")]);
  return out;
}
function zhSet(v){
  if(typeof UI!=="object"||!UI||!UI.p)return;
  if(!v||v==="dashboard")delete UI.p.home;else UI.p.home=v;
  if(typeof uiChanged==="function")uiChanged();
  showToast(t("zh_saved"));
}
function zhHtml(){
  const cur=(typeof UI==="object"&&UI&&UI.p&&UI.p.home)||"dashboard";
  const opts=zhPages().map(([id,n])=>`<option value="${esc(id)}"${id===cur?" selected":""}>${esc(n)}</option>`).join("");
  return `<div class="zap-cap zh-cap">${esc(t("zh_cap"))}</div>
    <p class="zap-note zh-x">${esc(t("zh_x"))}</p>
    <label class="zh-lbl" for="zh-sel">${esc(t("zh_lbl"))}</label>
    <select class="inp zh-sel" id="zh-sel" onchange="zhSet(this.value)">${opts}</select>
    ${zfEl()?`<button type="button" class="btn btn-o btn-sm zh-fab" onclick="zfReset()"><i class="ti ti-arrow-back-up" aria-hidden="true"></i> ${esc(t("zf_reset"))}</button>`:""}`;
}
if(typeof zapOpen==="function"){
  const _zhZO=zapOpen;
  zapOpen=function(){
    const r=_zhZO.apply(this,arguments);
    try{
      const box=document.querySelector("#zap-sheet .zap-box");
      if(box&&State.token&&!box.querySelector(".zh-cap")){
        const done=box.querySelector(".zap-done");
        const w=document.createElement("div");w.className="zh-wrap";w.innerHTML=zhHtml();
        if(done)box.insertBefore(w,done);else box.appendChild(w);
      }
    }catch(e){console.error(e);}
    return r;
  };
}
