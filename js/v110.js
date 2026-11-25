/* Zenith Dash 11.0.0 — comptes clients complets, installation pour tous, minuteur d'essai, appel en petite fenêtre, publications */
const ZX={feed:null,feedNext:null,person:null,personNext:null,pid:null,media:[],aud:"contacts",busy:false,cm:null};
const ZX_NEW_SEEN_KEY="zd_zx_new_seen";
function zxT(k,v){let s=t(k);if(v)Object.keys(v).forEach(x=>{s=s.split("{"+x+"}").join(v[x]);});return s;}
function zxIsClient(){return typeof zdIsClientAcc==="function"&&zdIsClientAcc();}
function zxIsMember(){return typeof isTeamMember==="function"&&isTeamMember();}
const ZX_SVG={heart:'<path d="M12 19.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z"/>'};
function zxIcon(n,s){
  if(n==="heart"||n==="heart-filled")return `<svg width="${s||20}" height="${s||20}" viewBox="0 0 24 24" fill="${n==="heart-filled"?"currentColor":"none"}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ZX_SVG.heart}</svg>`;
  const m={"layout-grid":"category","arrows-maximize":"maximize","database":"folder"};
  return `<i class="ti ti-${m[n]||n}" aria-hidden="true"${s?` style="font-size:${s}px"`:""}></i>`;
}

if(typeof ZD_CLIENT_PAGES==="object")["announcements","help","directory","spaces","files","feed","person","zdguide"].forEach(p=>{if(!ZD_CLIENT_PAGES.includes(p))ZD_CLIENT_PAGES.push(p);});
if(typeof RESTRICTED_ALLOWED_PAGES==="object")["messaging","profile","billing","spaces","notifications","announcements","help","directory","files","feed","person","myspace","zdguide"].forEach(p=>{if(!RESTRICTED_ALLOWED_PAGES.includes(p))RESTRICTED_ALLOWED_PAGES.push(p);});

zdClientBnavHtml=function(){
  const it=(p,i,k)=>`<div class="bnav-item" data-bp="${p}" onclick="navigate('${p}')"><i class="ti ti-${i}"></i><span>${esc(t(k))}</span></div>`;
  return it("myspace","shopping-bag","zx_home")+it("messaging","message-circle","zx_msgs")+it("feed","news","zx_feed")+it("notifications","bell","zx_notifs")+
    `<div class="bnav-item" data-bp="zxmore" onclick="zxPlusOpen()"><i class="ti ti-dots"></i><span>${esc(t("zx_more"))}</span></div>`;
};
const ZX_CLIENT_TILES=[
  ["zx_g_me",[["profile","user-circle","zx_profile"],["person:me","news","zx_myposts"],["files","folder","zx_files"]]],
  ["zx_g_others",[["directory","search","zx_directory"],["spaces","category","zx_spaces"],["messaging","phone","zx_calls"]]],
  ["zx_g_new",[["feed","news","zx_feed",1]],"zx_g_new_x"],
  ["zx_g_zd",[["announcements","speakerphone","zx_news"],["zdguide","help","zx_help"]]]];
function zxGo(p){zxPlusClose();if(p==="person:me"){zxOpenPerson(State.tenant&&State.tenant.id);return;}navigate(p);}
function zxPlusOpen(){
  let ov=document.getElementById("zx-plus");
  if(!ov){ov=document.createElement("div");ov.id="zx-plus";ov.className="zx-plus";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-labelledby","zx-plus-t");document.body.appendChild(ov);}
  ov.innerHTML=`<div class="zx-plus-h"><div class="zx-plus-bar"><h1 id="zx-plus-t">${esc(t("zx_all"))}</h1><button type="button" class="zx-x" onclick="zxPlusClose()" aria-label="${esc(t("zx_close"))}">${zxIcon("x",20)}</button></div>
    <label class="zx-search">${zxIcon("search",18)}<input type="search" id="zx-plus-q" placeholder="${esc(t("zx_search"))}" aria-label="${esc(t("zx_search"))}" oninput="zxPlusFilter()"></label></div>
    <div class="zx-plus-b">${ZX_CLIENT_TILES.map(([g,tiles,sub])=>`<section class="zx-sec"><h2>${esc(t(g))}</h2>${sub?`<p>${esc(t(sub))}</p>`:""}<div class="zx-grid">${tiles.map(([p,i,k,nw])=>`<button type="button" class="zx-tile" onclick="zxGo('${p}')">${nw?`<span class="zx-new">${esc(t("zx_new"))}</span>`:""}${zxIcon(i,24)}<span>${esc(t(k))}</span></button>`).join("")}</div></section>`).join("")}
    <p class="zx-none" id="zx-plus-none" hidden>${esc(t("zx_none"))}</p></div>`;
  ov.style.display="flex";document.body.classList.add("zx-plus-open");
  setTimeout(()=>ov.querySelector("#zx-plus-q")?.focus({preventScroll:true}),60);
}
function zxPlusClose(){const ov=document.getElementById("zx-plus");if(ov)ov.style.display="none";document.body.classList.remove("zx-plus-open");}
function zxPlusFilter(){
  const q=(document.getElementById("zx-plus-q").value||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();let n=0;
  document.querySelectorAll("#zx-plus .zx-sec").forEach(s=>{let k=0;s.querySelectorAll(".zx-tile").forEach(b=>{const on=!q||b.textContent.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").includes(q);b.hidden=!on;if(on)k++;});s.hidden=!k;n+=k;});
  document.getElementById("zx-plus-none").hidden=!!n;
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("zx-plus")?.style.display==="flex")zxPlusClose();});

if(typeof zdApplyClientUI==="function"){
  const _a=zdApplyClientUI;
  zdApplyClientUI=function(){
    const r=_a.apply(this,arguments);
    try{
      document.querySelectorAll('#page-profile [data-i18n="card_company_profile"],#page-profile [data-i18n="company_profile_title"]').forEach(el=>el.closest(".card")?.classList.add("zd-biz"));
      document.querySelectorAll("#page-profile .card").forEach(c=>{const h=(c.querySelector("div")?.textContent||"").trim();if(/^(Profil entreprise|Company profile|Perfil de empresa|ملف المؤسسة|Wasifu wa biashara|Profil ya entreprise)/i.test(h)||c.querySelector("#company_name,#p-company,#prof-company"))c.classList.add("zd-biz");});
      const lbl=document.querySelector('.sidebar .nav-i[data-p="profile"] span');if(lbl)lbl.textContent=t("bnav_profile");
      ["announcements","help"].forEach(p=>{const n=document.querySelector(`.sidebar .nav-i[data-p="${p}"]`);if(n)n.dataset.client="1";});
      const g=document.querySelector('.sidebar .nav-i[data-p="messaging"]');
      if(g&&!document.querySelector('.sidebar .nav-i[data-p="feed"]')){const f=document.createElement("div");f.className="nav-i";f.dataset.p="feed";f.dataset.client="1";f.setAttribute("onclick","navigate('feed')");f.innerHTML=`<i class="ti ti-news"></i><span>${esc(t("zx_feed"))}</span>`;g.after(f);}
      document.querySelectorAll(".sidebar .nav-g").forEach(gr=>gr.classList.toggle("zd-cl-hide",!gr.querySelector("[data-client]")));
    }catch(_){}
    return r;
  };
}
function zxManagerFeedNav(){
  if(zxIsClient()||!State.tenant)return;
  const g=document.querySelector('.sidebar .nav-i[data-p="messaging"]');
  if(g&&!document.querySelector('.sidebar .nav-i[data-p="feed"]')){const f=document.createElement("div");f.className="nav-i";f.dataset.p="feed";f.dataset.client="1";f.setAttribute("onclick","navigate('feed')");f.innerHTML=`<i class="ti ti-news"></i><span>${esc(t("zx_feed"))}</span>`;g.after(f);}
}
function zxManagerNewSection(){
  if(zxIsClient())return;
  const body=document.getElementById("mm-body");if(!body)return;
  let s=document.getElementById("mm-s-zxnew");
  if(!s){
    s=document.createElement("section");s.id="mm-s-zxnew";s.className="mm-sec";s.dataset.k="zx_g_new";
    s.innerHTML=`<h2 class="mm-t"></h2><div class="mm-grid"><div class="zx-mm-tile" onclick="navigate('feed');closeMoreMenu()" role="button" tabindex="0"><span class="zx-new">${esc(t("zx_new"))}</span><i class="ti ti-news" style="font-size:22px;color:var(--green)"></i><span style="font-size:12px">${esc(t("zx_feed"))}</span></div></div>`;
  }
  const trade=document.getElementById("mm-s-trade");
  if(trade&&s.previousElementSibling!==trade)trade.after(s);
  s.querySelector(".mm-t").textContent=t("zx_g_new");
  const tile=s.querySelector(".zx-mm-tile");if(tile){tile.lastElementChild.textContent=t("zx_feed");tile.firstElementChild.textContent=t("zx_new");}
}
if(typeof toggleMoreMenu==="function"){
  const _m=toggleMoreMenu;
  toggleMoreMenu=function(){const r=_m.apply(this,arguments);try{zxManagerNewSection();}catch(_){}setTimeout(()=>{try{zxManagerNewSection();}catch(_){}},40);return r;};
}

/* ── Installer l'appli : pour tous les comptes pas encore installés ── */
const ZX_INST_LATER="zd_zx_install_later";
function zxInApp(){const u=navigator.userAgent||"";return /FBAN|FBAV|Instagram|Line\/|WhatsApp|GSA\/|Snapchat|TikTok|; wv\)/i.test(u);}
function zxInstallState(){
  if(typeof isStandaloneApp==="function"&&isStandaloneApp())return "installed";
  try{if(localStorage.getItem("zd_zx_installed")==="1")return "installed";}catch(_){}
  if(zxInApp())return "inapp";
  if(typeof _deferredInstall!=="undefined"&&_deferredInstall)return "prompt";
  if(typeof isIOSDevice==="function"&&isIOSDevice())return "ios";
  return "manual";
}
function zxInstallLater(){try{localStorage.setItem(ZX_INST_LATER,String(Date.now()));}catch(_){}zxHideInstall();}
function zxInstallMuted(){try{const v=+localStorage.getItem(ZX_INST_LATER)||0;return v&&Date.now()-v<7*86400000;}catch(_){return false;}}
function zxHideInstall(){const b=document.getElementById("zx-inst");if(b)b.remove();}
function zxShowInstall(){
  if(!State.token||!document.getElementById("app-screen")||document.getElementById("app-screen").style.display!=="block")return;
  const st=zxInstallState();
  if(st==="installed"||zxInstallMuted()||window.innerWidth>900){zxHideInstall();return;}
  if(st==="manual"&&!/Android/i.test(navigator.userAgent||""))return;
  const old=document.getElementById("install-banner");if(old)old.style.display="none";
  let b=document.getElementById("zx-inst");
  if(!b){b=document.createElement("div");b.id="zx-inst";b.className="zx-inst";b.setAttribute("role","region");b.setAttribute("aria-label",t("zx_i_title"));document.body.appendChild(b);}
  b.innerHTML=`<span class="zx-inst-i">${zxIcon("download",22)}</span><div class="zx-inst-t"><b>${esc(t("zx_i_title"))}</b><small>${esc(t(st==="inapp"?"zx_inapp":"zx_i_sub"))}</small></div>
    <button type="button" class="btn btn-g btn-sm" onclick="zxInstall()">${esc(t(st==="inapp"?"zx_inapp_btn":"zx_i_btn"))}</button>
    <button type="button" class="zx-inst-x" onclick="zxInstallLater()" aria-label="${esc(t("zx_i_later"))}" title="${esc(t("zx_i_later"))}">${zxIcon("x",18)}</button>`;
}
async function zxInstall(){
  const st=zxInstallState();
  if(st==="prompt"&&typeof installApp==="function"){await installApp();return;}
  if(st==="inapp"){const u=location.href;if(/Android/i.test(navigator.userAgent||""))location.href="intent://"+u.replace(/^https?:\/\//,"")+"#Intent;scheme=https;package=com.android.chrome;end";else{try{await navigator.clipboard.writeText(u);showToast(t("zx_copied"));}catch(_){}}return;}
  zxGuideSheet(st);
}
function zxGuideSheet(st){
  let ov=document.getElementById("zx-ios");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="zx-ios";ov.className="modal-overlay";ov.style.display="flex";ov.style.alignItems="flex-end";
  ov.onclick=e=>{if(e.target===ov)ov.remove();};
  const steps=st==="ios"?["zx_ios_1","zx_ios_2","zx_ios_3"]:["zx_and_1","zx_and_2","zx_and_3"];
  ov.innerHTML=`<div class="modal zx-sheet" role="dialog" aria-modal="true" aria-labelledby="zx-ios-t"><span class="zx-grab" aria-hidden="true"></span>
    <h2 id="zx-ios-t">${esc(t(st==="ios"?"zx_ios_title":"zx_and_title"))}</h2><p class="zx-muted">${esc(t(st==="ios"?"zx_ios_x":"zx_and_x"))}</p>
    <ol class="zx-steps">${steps.map((k,i)=>`<li><span>${i+1}</span>${esc(t(k))}</li>`).join("")}</ol>
    <button type="button" class="btn btn-g zx-wide" onclick="zxInstalledDone()">${esc(t("zx_ios_done"))}</button>
    <button type="button" class="zx-link" onclick="document.getElementById('zx-ios').remove();zxInstallLater()">${esc(t("zx_i_later"))}</button></div>`;
  document.body.appendChild(ov);
}
function zxInstalledDone(){try{localStorage.setItem("zd_zx_installed","1");}catch(_){}document.getElementById("zx-ios")?.remove();zxHideInstall();if(typeof renderInstallCard==="function")renderInstallCard();}
(function(){try{if(!localStorage.getItem("zd_zx_inst_reset")){localStorage.setItem("zd_zx_inst_reset","1");localStorage.removeItem("zd_install_dismissed");}}catch(_){}})();
window.addEventListener("beforeinstallprompt",()=>{setTimeout(zxShowInstall,50);});
window.addEventListener("appinstalled",()=>{try{localStorage.setItem("zd_zx_installed","1");}catch(_){}zxHideInstall();});
if(typeof maybeShowInstallBanner==="function"){maybeShowInstallBanner=function(){zxShowInstall();};}
if(typeof dismissInstallBanner==="function"){dismissInstallBanner=function(){zxInstallLater();const b=document.getElementById("install-banner");if(b)b.style.display="none";};}
if(typeof renderInstallCard==="function"){
  const _r=renderInstallCard;
  renderInstallCard=function(){
    const r=_r.apply(this,arguments);
    try{
      const box=document.getElementById("install-card-body");const st=zxInstallState();
      if(box&&st!=="installed"&&st!=="prompt")box.innerHTML=`<button class="btn btn-g btn-sm" onclick="zxInstall()"><i class="ti ti-download"></i> ${esc(t("btn_install_app"))}</button>`;
    }catch(_){}
    return r;
  };
}

/* ── Minuteur de l'essai, et gestion en pause ── */
function zxNoTrial(u){try{return typeof zdpUser==="function"&&!!zdpUser(u);}catch(_){return false;}}
function zxTimerOn(u){return !!(u&&!u.is_creator&&u.plan==="trial"&&u.trial&&!zxIsMember()&&!zxIsClient()&&!(u.free_all)&&!zxNoTrial(u));}
if(typeof updateExpiryBar==="function"){
  const _u=updateExpiryBar;let iv=null;
  updateExpiryBar=function(user){
    if(iv){clearInterval(iv);iv=null;}
    if(!zxTimerOn(user))return _u.apply(this,arguments);
    if(typeof _expiryInterval!=="undefined"&&_expiryInterval){clearInterval(_expiryInterval);_expiryInterval=null;}
    const bar=document.getElementById("trial-bar");if(!bar)return;
    const paused=()=>{bar.className="trial-bar zx-tbar zx-paused";bar.innerHTML=`${zxIcon("lock",18)}<span><b>${esc(t("zx_t_paused_b"))}</b> ${esc(t("zx_t_paused"))}</span><a href="#" onclick="navigate('billing');return false">${esc(t("zx_t_pay"))}</a>`;};
    if(user.trial.expired||!user.trial.active||!user.trial.expires_at){paused();if(typeof enterRestrictedMode==="function")enterRestrictedMode();return;}
    const target=parseServerDate(user.trial.expires_at);
    const render=()=>{
      const ms=target-new Date();
      if(ms<=0){clearInterval(iv);iv=null;paused();if(typeof enterRestrictedMode==="function")enterRestrictedMode();return;}
      const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000);
      const txt=d>0?zxT("zx_t_left",{d,h:String(h).padStart(2,"0")}):zxT("zx_t_hours",{h,m:String(m).padStart(2,"0")});
      bar.className="trial-bar zx-tbar"+(d<2?" zx-soon":"");
      bar.innerHTML=`${zxIcon("clock",18)}<span>${esc(txt)}</span><a href="#" onclick="navigate('billing');return false">${esc(t("zx_t_plans"))}</a>`;
    };
    render();iv=setInterval(render,30000);
  };
}
if(typeof applyRestrictedUI==="function"){
  const _r=applyRestrictedUI;
  applyRestrictedUI=function(){
    const r=_r.apply(this,arguments);
    try{if(State.restricted&&!zxIsClient()&&State.tenant&&!State.tenant.is_creator&&!State.tenant.free_all&&!zxNoTrial(State.tenant)){const bar=document.getElementById("trial-bar");if(bar&&!bar.classList.contains("zx-paused")){bar.className="trial-bar zx-tbar zx-paused";bar.innerHTML=`${zxIcon("lock",18)}<span><b>${esc(t("zx_t_paused_b"))}</b> ${esc(t("zx_t_paused"))}</span><a href="#" onclick="navigate('billing');return false">${esc(t("zx_t_pay"))}</a>`;}}}catch(_){}
    return r;
  };
}

/* ── Appel : petite fenêtre qu'on déplace, le site reste utilisable ── */
if(typeof clMinimize==="function"){
  clMinimize=function(){
    const ov=document.getElementById("cl-ov");if(!ov)return;
    ov.classList.remove("min");ov.classList.add("zx-mini");ov.setAttribute("aria-modal","false");
    if(!ov.querySelector(".zx-mbar")){
      const mb=document.createElement("div");mb.className="zx-mbar";mb.setAttribute("role","toolbar");mb.setAttribute("aria-label",t("zx_calls"));
      mb.innerHTML=`<button type="button" class="zx-mb" data-a="mic" aria-label="${esc(t("zx_c_mic"))}">${zxIcon("microphone",17)}</button>
        <button type="button" class="zx-mb" data-a="max" aria-label="${esc(t("zx_c_expand"))}">${zxIcon("arrows-maximize",17)}</button>
        <button type="button" class="zx-mb red" data-a="end" aria-label="${esc(t("zx_c_end"))}">${zxIcon("phone-off",17)}</button>`;
      mb.addEventListener("click",e=>{const b=e.target.closest(".zx-mb");if(!b)return;e.stopPropagation();const a=b.dataset.a;
        if(a==="mic"&&typeof clToggleMic==="function"){clToggleMic();setTimeout(zxMiniSync,80);}
        if(a==="max")clMax();
        if(a==="end"&&typeof clHangup==="function")clHangup();});
      ov.appendChild(mb);
      zxMiniDrag(ov);
    }
    zxMiniSync();
    if(typeof clRefresh==="function")setTimeout(clRefresh,60);
  };
  const _max=clMax;
  clMax=function(){const ov=document.getElementById("cl-ov");if(ov){ov.classList.remove("zx-mini");ov.style.left=ov.style.top=ov.style.right=ov.style.bottom="";ov.setAttribute("aria-modal","true");}return _max.apply(this,arguments);};
}
function zxMiniSync(){const b=document.querySelector("#cl-ov .zx-mb[data-a=mic]");if(b&&typeof CL==="object"){b.classList.toggle("off",!CL.mic);b.innerHTML=zxIcon(CL.mic?"microphone":"microphone-off",17);}}
function zxMiniDrag(ov){
  let sx=0,sy=0,ox=0,oy=0,drag=false,moved=false;
  ov.addEventListener("pointerdown",e=>{if(!ov.classList.contains("zx-mini")||e.target.closest(".zx-mb"))return;drag=true;moved=false;const r=ov.getBoundingClientRect();sx=e.clientX;sy=e.clientY;ox=r.left;oy=r.top;try{ov.setPointerCapture(e.pointerId);}catch(_){}});
  ov.addEventListener("pointermove",e=>{if(!drag)return;const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;if(!moved)return;
    const w=ov.offsetWidth,h=ov.offsetHeight;const x=Math.max(6,Math.min(innerWidth-w-6,ox+dx)),y=Math.max(6,Math.min(innerHeight-h-6,oy+dy));
    ov.style.left=x+"px";ov.style.top=y+"px";ov.style.right="auto";ov.style.bottom="auto";});
  const up=e=>{if(!drag)return;drag=false;if(!moved&&ov.classList.contains("zx-mini")&&!e.target.closest(".zx-mb"))clMax();};
  ov.addEventListener("pointerup",up);ov.addEventListener("pointercancel",()=>{drag=false;});
}

/* ── Publications ── */
function zxAgo(iso){
  const d=typeof parseServerDate==="function"?parseServerDate(iso):new Date(iso);const s=(Date.now()-d)/1000;
  if(s<60)return t("zx_p_now");if(s<3600)return zxT("zx_p_min",{n:Math.floor(s/60)});if(s<86400)return zxT("zx_p_h",{n:Math.floor(s/3600)});
  return typeof fmtDate==="function"?fmtDate(iso):d.toLocaleDateString();
}
function zxAv(a,size){return typeof avatarHtml==="function"?avatarHtml(a&&a.avatar_url,(a&&a.name)||"?",size,a&&a.id):`<span class="zx-av">${esc(((a&&a.name)||"?")[0])}</span>`;}
function zxAudLbl(a){return t(a==="public"?"zx_p_aud_lbl_public":a==="me"?"zx_p_aud_lbl_me":"zx_p_aud_lbl_contacts");}
function zxPostHtml(p){
  const media=(p.media||[]).filter(m=>m.url).map(m=>m.kind==="video"?`<video class="zx-pm" src="${esc(m.url)}" controls playsinline preload="metadata"></video>`
    :`<button type="button" class="zx-pmb" onclick="zdPhotoViewer&&zdPhotoViewer(${esc(JSON.stringify(m.url))},'')" aria-label="${esc(t("zx_p_photo"))}"><img class="zx-pm" src="${esc(m.url)}" alt="" loading="lazy"></button>`).join("");
  return `<article class="zx-post" id="zxp-${esc(p.id)}" aria-label="${esc(p.author.name)}">
    <header><button type="button" class="zx-who" onclick="zxOpenPerson('${esc(p.author.id)}')">${zxAv(p.author,40)}<span><b>${esc(p.author.name)}</b><small>${esc(zxAgo(p.created_at))} · ${esc(zxAudLbl(p.audience))}</small></span></button>
      <button type="button" class="zx-ib" onclick="zxPostMenu('${esc(p.id)}',${p.mine?1:0})" aria-label="${esc(t("zp_more"))}">${zxIcon("dots",20)}</button></header>
    ${p.hidden?`<div class="zx-hid">${zxIcon("eye-off",16)} ${esc(t("zx_p_hidden"))}</div>`:""}
    ${p.text?`<div class="zx-ptext">${typeof linkify==="function"?linkify(esc(p.text)):esc(p.text)}</div>`:""}
    ${media?`<div class="zx-pmedia n${Math.min(4,(p.media||[]).length)}">${media}</div>`:""}
    <footer><button type="button" class="zx-act${p.liked?" on":""}" onclick="zxLike('${esc(p.id)}',this)" aria-pressed="${p.liked?"true":"false"}" aria-label="${esc(t("zx_p_like"))}">${zxIcon(p.liked?"heart-filled":"heart",20)}<span>${p.likes||0}</span></button>
      <button type="button" class="zx-act" onclick="zxComments('${esc(p.id)}')" aria-label="${esc(t("zx_p_comments"))}">${zxIcon("message-circle",20)}<span id="zxc-n-${esc(p.id)}">${p.comments||0}</span></button></footer></article>`;
}
function zxPageEl(id){const el=ensureSectorPage(id);document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x===el));return el;}
V93_PAGES.feed=async function(){
  const el=zxPageEl("feed");
  document.querySelector('[data-p="feed"]')?.classList.add("active");document.querySelector('[data-bp="feed"]')?.classList.add("active");
  const me=State.tenant||{};
  el.innerHTML=`<div class="zx-feed"><div class="sh"><div><div class="st">${esc(t("zx_p_title"))}</div></div><div></div></div>
    <button type="button" class="zx-compose" onclick="zxComposeOpen()">${zxAv({name:me.name,avatar_url:me.avatar_url,id:me.id},36)}<span>${esc(zxT("zx_p_whats",{n:(me.name||"").split(" ")[0]}))}</span>${zxIcon("photo",22)}</button>
    <div id="zx-feed-list" class="zx-list"><div class="zx-muted zx-pad">${esc(t("loading"))}</div></div><div id="zx-feed-more"></div></div>`;
  ZX.feed=[];ZX.feedNext=null;await zxFeedLoad();
};
async function zxFeedLoad(more){
  const list=document.getElementById("zx-feed-list");if(!list)return;
  let r;try{r=await api("GET","/posts/feed"+(more&&ZX.feedNext?`?before=${encodeURIComponent(ZX.feedNext)}`:""));}catch(e){list.innerHTML=`<div class="zx-err">${esc(e.message)}</div>`;return;}
  ZX.feed=more?ZX.feed.concat(r.items):r.items;ZX.feedNext=r.next;
  list.innerHTML=ZX.feed.length?ZX.feed.map(zxPostHtml).join(""):`<div class="zx-empty">${zxIcon("news",30)}<p><b>${esc(t("zx_p_empty"))}</b></p><p class="zx-muted">${esc(t("zx_p_empty_x"))}</p></div>`;
  const m=document.getElementById("zx-feed-more");if(m)m.innerHTML=ZX.feedNext?`<button type="button" class="btn btn-o btn-sm zx-wide" onclick="zxFeedLoad(true)">${esc(t("zx_p_more"))}</button>`:"";
}
function zxOpenPerson(id){if(!id)return;ZX.pid=id;navigate("person");}
V93_PAGES.person=async function(){
  const el=zxPageEl("person");const id=ZX.pid||(State.tenant&&State.tenant.id);
  el.innerHTML=`<div class="zx-muted zx-pad">${esc(t("loading"))}</div>`;
  let r;try{r=await api("GET",`/people/${encodeURIComponent(id)}`);}catch(e){el.innerHTML=`<div class="zx-err">${esc(e.message)}</div>`;return;}
  ZX.person=r;ZX.personItems=r.items;ZX.personNext=r.next;
  const p=r.person;
  el.innerHTML=`<div class="zx-feed"><div class="zx-phead">${zxAv(p,88)}<h1>${esc(p.name)}</h1>${p.company?`<div class="zx-muted">${esc(p.company)}</div>`:""}
    ${p.is_me?`<div class="zx-pacts"><button type="button" class="btn btn-g" onclick="zxComposeOpen()">${zxIcon("pencil",18)} ${esc(t("zx_p_new"))}</button></div>`
      :`<div class="zx-pacts"><button type="button" class="btn btn-g" onclick="zxMessage('${esc(p.id)}',${esc(JSON.stringify(p.name))})">${zxIcon("message-circle",18)} ${esc(t("zx_p_message"))}</button></div>`}</div>
    <div class="zx-muted zx-count">${esc(zxT("zx_p_count",{n:r.total!=null?r.total:r.items.length}))}</div>
    <div id="zx-person-list" class="zx-list">${r.items.length?r.items.map(zxPostHtml).join(""):`<div class="zx-empty"><p class="zx-muted">${esc(t("zx_p_none_person"))}</p></div>`}</div>
    <div id="zx-person-more">${r.next?`<button type="button" class="btn btn-o btn-sm zx-wide" onclick="zxPersonMore()">${esc(t("zx_p_more"))}</button>`:""}</div></div>`;
};
async function zxPersonMore(){
  if(!ZX.personNext||!ZX.person)return;
  try{const r=await api("GET",`/people/${encodeURIComponent(ZX.person.person.id)}?before=${encodeURIComponent(ZX.personNext)}`);ZX.personNext=r.next;
    document.getElementById("zx-person-list").insertAdjacentHTML("beforeend",r.items.map(zxPostHtml).join(""));
    document.getElementById("zx-person-more").innerHTML=r.next?`<button type="button" class="btn btn-o btn-sm zx-wide" onclick="zxPersonMore()">${esc(t("zx_p_more"))}</button>`:"";}
  catch(e){showToast(e.message,"error");}
}
function zxMessage(id,name){navigate("messaging");setTimeout(()=>{if(typeof startConversationWith==="function")startConversationWith(id,name);},300);}
async function zxLike(id,btn){
  try{const r=await api("POST",`/posts/${encodeURIComponent(id)}/like`);
    btn.classList.toggle("on",r.liked);btn.setAttribute("aria-pressed",r.liked?"true":"false");btn.innerHTML=`${zxIcon(r.liked?"heart-filled":"heart",20)}<span>${r.likes}</span>`;}
  catch(e){showToast(e.message,"error");}
}
function zxPostMenu(id,mine){
  let ov=document.getElementById("zx-pmenu");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="zx-pmenu";ov.className="modal-overlay";ov.style.display="flex";ov.style.alignItems="flex-end";ov.onclick=e=>{if(e.target===ov)ov.remove();};
  ov.innerHTML=`<div class="modal zx-sheet" role="dialog" aria-modal="true" aria-label="${esc(t("zp_more"))}"><span class="zx-grab" aria-hidden="true"></span>
    ${mine?`<button type="button" class="zx-row red" onclick="zxDeletePost('${esc(id)}')">${zxIcon("trash",20)} ${esc(t("zx_p_delete"))}</button>`
      :`<button type="button" class="zx-row" onclick="zxReport('${esc(id)}')">${zxIcon("flag",20)} ${esc(t("zx_p_report"))}</button>`}
    <button type="button" class="zx-link" onclick="document.getElementById('zx-pmenu').remove()">${esc(t("btn_cancel"))}</button></div>`;
  document.body.appendChild(ov);
}
async function zxDeletePost(id){
  document.getElementById("zx-pmenu")?.remove();
  if(!confirm(t("zx_p_confirm_del")))return;
  try{await api("DELETE",`/posts/${encodeURIComponent(id)}`);document.getElementById("zxp-"+id)?.remove();ZX.feed=(ZX.feed||[]).filter(x=>x.id!==id);showToast(t("zx_p_deleted"));}
  catch(e){showToast(e.message,"error");}
}
async function zxReport(id){
  document.getElementById("zx-pmenu")?.remove();
  try{await api("POST",`/posts/${encodeURIComponent(id)}/report`,{});showToast(t("zx_p_reported"));}catch(e){showToast(e.message,"error");}
}
function zxComposeOpen(){
  ZX.media=[];ZX.aud="contacts";
  let ov=document.getElementById("zx-compose");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="zx-compose";ov.className="modal-overlay";ov.style.display="flex";
  const aud=(k,i)=>`<label class="zx-aud${ZX.aud===k?" on":""}"><input type="radio" name="zx-aud" value="${k}"${ZX.aud===k?" checked":""} onchange="zxAud('${k}')">${zxIcon(i,21)}<span><b>${esc(t("zx_p_aud_"+k))}</b><small>${esc(t("zx_p_aud_"+k+"_x"))}</small></span></label>`;
  ov.innerHTML=`<div class="modal zx-compose-m" role="dialog" aria-modal="true" aria-labelledby="zx-cm-t">
    <div class="zx-cm-h"><button type="button" class="zx-ib" onclick="zxComposeClose()" aria-label="${esc(t("zx_close"))}">${zxIcon("x",22)}</button><h2 id="zx-cm-t">${esc(t("zx_p_new"))}</h2><span style="width:40px"></span></div>
    <textarea id="zx-cm-text" class="zx-cm-text" maxlength="5000" rows="5" placeholder="${esc(zxT("zx_p_whats",{n:((State.tenant||{}).name||"").split(" ")[0]}))}" aria-label="${esc(t("zx_p_new"))}"></textarea>
    <div class="zx-cm-media" id="zx-cm-media"></div>
    <label class="btn btn-o btn-sm zx-addm">${zxIcon("photo",18)} ${esc(t("zx_p_add_media"))}<input type="file" accept="image/*,video/*" multiple hidden onchange="zxPick(this)"></label>
    <div class="zx-cm-who">${esc(t("zx_p_who"))}</div>
    <div class="zx-auds" role="radiogroup" aria-label="${esc(t("zx_p_who"))}">${aud("contacts","users")}${aud("public","world")}${aud("me","lock")}</div>
    <div class="zx-cm-st" id="zx-cm-st" role="status" aria-live="polite"></div>
    <button type="button" class="btn btn-g zx-wide" id="zx-cm-go" onclick="zxPublish()">${esc(t("zx_p_publish"))}</button></div>`;
  document.body.appendChild(ov);
  setTimeout(()=>document.getElementById("zx-cm-text")?.focus(),60);
}
function zxComposeClose(){ZX.media.forEach(m=>{try{URL.revokeObjectURL(m.prev);}catch(_){}});ZX.media=[];document.getElementById("zx-compose")?.remove();}
function zxAud(k){ZX.aud=k;document.querySelectorAll("#zx-compose .zx-aud").forEach(l=>l.classList.toggle("on",l.querySelector("input").value===k));}
function zxPick(inp){
  const files=[...(inp.files||[])];inp.value="";
  for(const f of files){
    if(!/^(image|video)\//.test(f.type||"")){showToast(t("zx_p_only_media"),"error");continue;}
    if(ZX.media.length>=10){showToast(t("zx_p_too_many"),"error");break;}
    if(f.size>25*1024*1024){showToast(t("zx_p_too_big"),"error");continue;}
    ZX.media.push({file:f,prev:URL.createObjectURL(f),video:/^video\//.test(f.type)});
  }
  zxMediaRender();
}
function zxMediaRender(){
  const box=document.getElementById("zx-cm-media");if(!box)return;
  box.innerHTML=ZX.media.map((m,i)=>`<div class="zx-th">${m.video?`<video src="${esc(m.prev)}" muted playsinline></video>`:`<img src="${esc(m.prev)}" alt="">`}<button type="button" onclick="zxUnpick(${i})" aria-label="${esc(t("zx_p_delete"))}">${zxIcon("x",14)}</button></div>`).join("");
}
function zxUnpick(i){const m=ZX.media.splice(i,1)[0];if(m)try{URL.revokeObjectURL(m.prev);}catch(_){}zxMediaRender();}
async function zxPublish(){
  if(ZX.busy)return;
  const text=(document.getElementById("zx-cm-text")?.value||"").trim();
  if(!text&&!ZX.media.length){showToast(t("zx_p_empty_post"),"error");return;}
  ZX.busy=true;const go=document.getElementById("zx-cm-go");if(go)go.disabled=true;const st=document.getElementById("zx-cm-st");
  try{
    const ids=[];
    for(let i=0;i<ZX.media.length;i++){
      if(st)st.textContent=zxT("zx_p_uploading",{n:i+1,t:ZX.media.length});
      let f=ZX.media[i].file;if(!ZX.media[i].video&&typeof zdShrinkImage==="function")f=await zdShrinkImage(f);
      const fd=new FormData();fd.append("file",f,f.name||"photo.jpg");
      const up=typeof zdUploadWithProgress==="function"?await zdUploadWithProgress("/files/upload?category=post",fd,()=>{}):await apiUpload("/files/upload?category=post",fd);
      ids.push(up.id);
    }
    const p=await api("POST","/posts",{text:text||null,media:ids,audience:ZX.aud});
    zxComposeClose();showToast(t("zx_p_posted"));
    const act=document.querySelector(".page.active")?.id;
    if(act==="page-feed"){ZX.feed=[p].concat(ZX.feed||[]);const l=document.getElementById("zx-feed-list");if(l){if(!l.querySelector(".zx-post"))l.innerHTML="";l.insertAdjacentHTML("afterbegin",zxPostHtml(p));}}
    else if(act==="page-person"&&ZX.person&&ZX.person.person.is_me){const l=document.getElementById("zx-person-list");if(l){if(!l.querySelector(".zx-post"))l.innerHTML="";l.insertAdjacentHTML("afterbegin",zxPostHtml(p));}}
    else navigate("feed");
  }catch(e){showToast(e.message,"error");if(st)st.textContent="";}
  finally{ZX.busy=false;if(go)go.disabled=false;}
}
async function zxComments(id){
  ZX.cm=id;
  let ov=document.getElementById("zx-cm");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="zx-cm";ov.className="modal-overlay";ov.style.display="flex";ov.style.alignItems="flex-end";ov.onclick=e=>{if(e.target===ov)ov.remove();};
  ov.innerHTML=`<div class="modal zx-sheet zx-cms" role="dialog" aria-modal="true" aria-labelledby="zx-cms-t"><span class="zx-grab" aria-hidden="true"></span><h2 id="zx-cms-t">${esc(t("zx_p_comments"))}</h2>
    <div class="zx-clist" id="zx-clist"><div class="zx-muted">${esc(t("loading"))}</div></div>
    <form class="zx-cform" onsubmit="event.preventDefault();zxCommentSend()"><input class="inp" id="zx-ctext" maxlength="2000" placeholder="${esc(t("zx_p_write"))}" aria-label="${esc(t("zx_p_write"))}" autocomplete="off"><button type="submit" class="btn btn-g btn-sm" aria-label="${esc(t("zx_p_send"))}">${zxIcon("send",18)}</button></form></div>`;
  document.body.appendChild(ov);
  try{const r=await api("GET",`/posts/${encodeURIComponent(id)}/comments`);zxCommentsRender(r.items);}catch(e){document.getElementById("zx-clist").innerHTML=`<div class="zx-err">${esc(e.message)}</div>`;}
}
function zxCommentHtml(c){return `<div class="zx-c" id="zxc-${esc(c.id)}">${zxAv(c.author,32)}<div><b>${esc(c.author.name)}</b> <small class="zx-muted">${esc(zxAgo(c.created_at))}</small><div class="zx-ctext">${esc(c.text)}</div></div>${c.can_delete?`<button type="button" class="zx-ib" onclick="zxCommentDel('${esc(c.id)}')" aria-label="${esc(t("zx_p_delete"))}">${zxIcon("trash",16)}</button>`:""}</div>`;}
function zxCommentsRender(items){const l=document.getElementById("zx-clist");if(l)l.innerHTML=items.length?items.map(zxCommentHtml).join(""):`<div class="zx-muted">${esc(t("zx_p_no_comments"))}</div>`;}
async function zxCommentSend(){
  const inp=document.getElementById("zx-ctext");const v=(inp?.value||"").trim();if(!v||!ZX.cm)return;
  try{const c=await api("POST",`/posts/${encodeURIComponent(ZX.cm)}/comments`,{text:v});inp.value="";
    const l=document.getElementById("zx-clist");if(l){if(!l.querySelector(".zx-c"))l.innerHTML="";l.insertAdjacentHTML("beforeend",zxCommentHtml(c));l.scrollTop=l.scrollHeight;}
    const n=document.getElementById("zxc-n-"+ZX.cm);if(n)n.textContent=c.comments;}
  catch(e){showToast(e.message,"error");}
}
async function zxCommentDel(cid){
  try{const r=await api("DELETE",`/posts/${encodeURIComponent(ZX.cm)}/comments/${encodeURIComponent(cid)}`);document.getElementById("zxc-"+cid)?.remove();
    const n=document.getElementById("zxc-n-"+ZX.cm);if(n)n.textContent=r.comments;}
  catch(e){showToast(e.message,"error");}
}
if(typeof openContactInfo==="function"){
  const _o=openContactInfo;
  openContactInfo=async function(id){
    const r=await _o.apply(this,arguments);
    try{const body=document.getElementById("contact-info-body");if(body&&!body.querySelector(".zx-ci")){const b=document.createElement("button");b.type="button";b.className="btn btn-g btn-sm zx-ci";b.innerHTML=`${zxIcon("news",16)} ${esc(t("zx_p_see_profile"))}`;b.onclick=()=>{if(typeof closeContactInfo==="function")closeContactInfo();zxOpenPerson(id);};const head=body.querySelector(".ci-head");if(head)head.after(b);else body.prepend(b);}}catch(_){}
    return r;
  };
}

/* ── Admin : arrêter la gratuité, stockage, signalements ── */
if(typeof faSave==="function"){
  const _s=faSave;
  faSave=function(on){if(on)return _s.apply(this,arguments);zxStopSheet();};
}
function zxStopSheet(){
  let ov=document.getElementById("zx-stop");if(ov)ov.remove();
  ov=document.createElement("div");ov.id="zx-stop";ov.className="modal-overlay";ov.style.display="flex";ov.style.alignItems="flex-end";ov.onclick=e=>{if(e.target===ov)ov.remove();};
  ov.innerHTML=`<div class="modal zx-sheet" role="dialog" aria-modal="true" aria-labelledby="zx-stop-t"><span class="zx-grab" aria-hidden="true"></span>
    <h2 id="zx-stop-t">Arrêter la gratuité ?</h2><p class="zx-muted">Les nouveaux inscrits auront 15 jours d’essai. Et ceux qui se sont inscrits pendant la gratuité ?</p>
    <label class="zx-aud on"><input type="radio" name="zx-st" value="1" checked onchange="zxStopPick()">${zxIcon("gift",21)}<span><b>Leur offrir 15 jours d’essai à partir d’aujourd’hui</b><small>Personne n’est bloqué du jour au lendemain. Conseillé.</small></span></label>
    <label class="zx-aud"><input type="radio" name="zx-st" value="0" onchange="zxStopPick()">${zxIcon("credit-card",21)}<span><b>Payant tout de suite</b><small>Ils doivent choisir une formule dès maintenant. Leurs données restent gardées.</small></span></label>
    <label class="cm-chk"><input type="checkbox" id="zx-st-n" checked> Prévenir tout le monde (notification et e-mail)</label>
    <button type="button" class="btn btn-r zx-wide" id="zx-st-go" onclick="zxStopGo()">Arrêter la gratuité</button>
    <button type="button" class="zx-link" onclick="document.getElementById('zx-stop').remove()">Annuler</button></div>`;
  document.body.appendChild(ov);
}
function zxStopPick(){document.querySelectorAll("#zx-stop .zx-aud").forEach(l=>l.classList.toggle("on",l.querySelector("input").checked));}
async function zxStopGo(){
  const grace=document.querySelector('#zx-stop input[name="zx-st"]:checked')?.value==="1";const notify=!!document.getElementById("zx-st-n")?.checked;
  const go=document.getElementById("zx-st-go");if(go)go.disabled=true;
  try{const r=await api("POST","/admin/free-all/stop",{grace,notify});document.getElementById("zx-stop")?.remove();
    if(typeof _fa!=="undefined"){_fa=r;if(typeof faRender==="function")faRender();}
    const s=r.stop||{};showToast(grace?`Gratuité arrêtée ✓ · 15 jours offerts${s.until?" jusqu'au "+fmtDate(s.until):""}${notify?(s.email?" · notifications et e-mails en cours":" · notifications envoyées"):""}`:"Gratuité arrêtée ✓");}
  catch(e){showToast(e.message,"error");if(go)go.disabled=false;}
}
function zxBytes(n){const u=["o","Ko","Mo","Go","To"];let i=0;n=+n||0;while(n>=1024&&i<u.length-1){n/=1024;i++;}return (i?n.toFixed(n<10?1:0):n)+" "+u[i];}
async function zxAdminExtras(){
  const box=document.getElementById("fa-admin");if(!box||!State.tenant?.is_creator)return;
  let w=document.getElementById("zx-adm");
  if(!w){w=document.createElement("div");w.id="zx-adm";box.after(w);}
  let st=null,rep=[];
  try{[st,rep]=await Promise.all([api("GET","/admin/storage"),api("GET","/admin/posts/reports")]);}catch(_){return;}
  w.innerHTML=`<div class="card zx-acard"><div class="zx-ah">${zxIcon("database",18)} <b>Stockage des fichiers</b></div>
    <div class="zx-kpis"><div><small>Utilisé</small><b>${esc(zxBytes(st.bytes))}</b></div><div><small>Fichiers</small><b>${st.files}</b></div><div><small>Comptes clients</small><b>${esc(zxBytes(st.by_type.client))}</b></div><div><small>Comptes gérants</small><b>${esc(zxBytes(st.by_type.manager))}</b></div></div>
    <small class="cm-hint">${st.max_file_mb} Mo au plus par fichier, sans limite totale. Les comptes qui utilisent le plus :</small>
    <div class="zx-top">${(st.top||[]).slice(0,8).map(x=>`<div><span>${esc(x.name)} <small class="zx-muted">${esc(x.type==="client"?"client":"gérant")}</small></span><b>${esc(zxBytes(x.bytes))}</b></div>`).join("")||`<div class="zx-muted">Aucun fichier.</div>`}</div></div>
    <div class="card zx-acard"><div class="zx-ah">${zxIcon("flag",18)} <b>Publications signalées</b> <span class="adm-pill ${rep.length?"p-exp":"p-cli"}">${rep.length}</span></div>
    ${rep.length?rep.map(r=>`<div class="zx-rep" id="zxr-${esc(r.id)}"><div><b>${esc(r.author.name)}</b> <small class="zx-muted">${esc(r.author.email||"")}</small><div class="zx-rtext">${esc(r.text||"")}${r.media?` · ${r.media} photo(s)/vidéo(s)`:""}</div><small class="zx-muted">Signalé par ${esc(r.reporter)}${r.reason?" : « "+esc(r.reason)+" »":""}</small></div>
      <div class="zx-rbtn"><button type="button" class="btn btn-o btn-sm" onclick="zxMod('${esc(r.id)}','keep')">Garder</button><button type="button" class="btn btn-a btn-sm" onclick="zxMod('${esc(r.id)}','hide')">Masquer</button><button type="button" class="btn btn-r btn-sm" onclick="zxMod('${esc(r.id)}','delete')">Supprimer</button></div></div>`).join(""):`<small class="cm-hint">Aucun signalement en attente.</small>`}</div>`;
}
async function zxMod(id,a){
  if(a==="delete"&&!confirm("Supprimer définitivement cette publication ?"))return;
  try{await api("POST",`/admin/posts/reports/${encodeURIComponent(id)}`,{action:a});document.getElementById("zxr-"+id)?.remove();showToast("C’est fait ✓");}catch(e){showToast(e.message,"error");}
}
if(typeof faLoad==="function"){
  const _f=faLoad;
  faLoad=async function(){const r=await _f.apply(this,arguments);try{zxAdminExtras();}catch(_){}return r;};
}

/* ── Branchements ── */
if(typeof navigate==="function"){
  const _n=navigate;
  navigate=function(p){if(p!=="person")ZX.pidKeep=false;const r=_n.apply(this,arguments);try{zxPlusClose();zxManagerFeedNav();setTimeout(zxShowInstall,400);}catch(_){}return r;};
}
if(typeof updateFabVisibility==="function"){
  const _f=updateFabVisibility;
  updateFabVisibility=function(page){const r=_f.apply(this,arguments);if(["feed","person"].includes(page)){const fab=document.getElementById("zd-fab");if(fab)fab.style.display="none";}return r;};
}
if(typeof applyLanguage==="function"){
  const _l=applyLanguage;
  applyLanguage=function(){const r=_l.apply(this,arguments);try{const ov=document.getElementById("zx-plus");if(ov&&ov.style.display==="flex")zxPlusOpen();if(zxIsClient()&&typeof zdApplyClientUI==="function")zdApplyClientUI();const n=document.querySelector('.sidebar .nav-i[data-p="feed"] span');if(n)n.textContent=t("zx_feed");if(document.getElementById("zx-inst"))zxShowInstall();if(State.tenant&&typeof updateExpiryBar==="function")updateExpiryBar(State.tenant);}catch(_){}return r;};
}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(zxShowInstall,300);});
setTimeout(()=>{try{zxManagerFeedNav();zxShowInstall();}catch(_){}},1500);
