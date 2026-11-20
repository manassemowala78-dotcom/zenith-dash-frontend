// ── 10.8.1 · Admin introuvable : combinaison secrète (clavier ou 7 appuis sur le logo), puis code Google Authenticator ──
const ZG={armed:false,buf:"",until:0,timer:null,taps:[],busy:false,g:null,backup:false,err:"",lastAct:Date.now()};
const ZG_IDLE=30*60*1000;

zdAdminOpen=function(){try{if(/[?&]acces=admin/.test(location.search))history.replaceState(null,"",location.pathname+location.hash);}catch(_){}};

function zgDisarm(){ZG.armed=false;ZG.buf="";clearTimeout(ZG.timer);}
async function zgSend(){
  const p=ZG.buf;zgDisarm();
  if(p.length<6||ZG.busy)return;
  ZG.busy=true;
  try{
    const r=await fetch(API_BASE+"/auth/gate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({p})});
    if(r.status===200){const j=await r.json();if(j&&j.g)zgOpen(j.g);}
  }catch(_){}
  ZG.busy=false;
}
function zgKeyChar(e){
  if(e.ctrlKey||e.metaKey||e.altKey)return null;
  if(/^(Digit|Numpad)[0-9]$/.test(e.code||""))return e.code.slice(-1);
  if(e.key&&e.key.length===1&&/[a-z0-9]/i.test(e.key))return e.key.toUpperCase();
  return null;
}
document.addEventListener("keydown",e=>{
  if(document.getElementById("zd-gate"))return;
  const k=(e.key||"").toLowerCase();
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&k==="z"){
    e.preventDefault();e.stopPropagation();ZG.armed=true;ZG.buf="";ZG.until=Date.now()+12000;clearTimeout(ZG.timer);return;
  }
  if(!ZG.armed)return;
  if(Date.now()>ZG.until){zgDisarm();return;}
  if(e.key==="Escape"){zgDisarm();return;}
  if(e.key==="Enter"){e.preventDefault();e.stopPropagation();zgSend();return;}
  if(e.key==="Backspace"){e.preventDefault();e.stopPropagation();ZG.buf=ZG.buf.slice(0,-1);return;}
  if(["Shift","CapsLock","Control","Meta","Alt"].includes(e.key))return;
  const c=zgKeyChar(e);
  if(!c){zgDisarm();return;}
  e.preventDefault();e.stopPropagation();
  ZG.buf=(ZG.buf+c).slice(-32);
  clearTimeout(ZG.timer);ZG.timer=setTimeout(()=>{if(ZG.buf.length>=6)zgSend();else zgDisarm();},1500);
},true);

document.addEventListener("click",e=>{
  if(!e.target.closest||!e.target.closest(".ld1-brand,.ld-logo,.auth-logo,.logo"))return;
  const now=Date.now();ZG.taps=ZG.taps.filter(x=>now-x<4000);ZG.taps.push(now);
  if(ZG.taps.length>=7){ZG.taps=[];zgMobileField();}
},true);
function zgMobileField(){
  let f=document.getElementById("zg-in");
  if(!f){
    f=document.createElement("input");f.id="zg-in";f.type="text";f.autocomplete="off";f.setAttribute("autocapitalize","characters");f.setAttribute("autocorrect","off");f.spellcheck=false;
    f.setAttribute("enterkeyhint","go");f.setAttribute("aria-hidden","true");f.tabIndex=-1;
    f.setAttribute("data-lpignore","true");f.setAttribute("data-1p-ignore","true");f.setAttribute("data-form-type","other");
    f.className="zg-in";document.body.appendChild(f);
    let t=null;const go=()=>{ZG.buf=(f.value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,32);f.value="";f.blur();f.remove();clearTimeout(t);zgSend();};
    f.addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();go();}});
    f.addEventListener("input",()=>{clearTimeout(t);t=setTimeout(()=>{if((f.value||"").replace(/[^A-Za-z0-9]/g,"").length>=6)go();},2500);});
    f.addEventListener("blur",()=>setTimeout(()=>{if(document.activeElement!==f){f.value="";f.remove();}},400));
  }
  f.value="";f.focus();
}

// ── Page d'entrée ──
function zgOpen(g){
  Object.assign(ZG,{g,backup:false,err:"",busy:false});
  let ov=document.getElementById("zd-gate");
  if(!ov){ov=document.createElement("div");ov.id="zd-gate";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-labelledby","zg-title");document.body.appendChild(ov);}
  document.body.classList.add("zd-gate-open");
  zgRender();
  setTimeout(()=>document.querySelector("#zd-gate .zg-d, #zg-backup")?.focus(),60);
  clearTimeout(ZG.gt);ZG.gt=setTimeout(()=>{if(document.getElementById("zd-gate"))zgClose();},295000);
}
function zgClose(){document.getElementById("zd-gate")?.remove();document.body.classList.remove("zd-gate-open");ZG.g=null;clearTimeout(ZG.gt);}
const ZG_SHIELD='<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>';
function zgRender(){
  const ov=document.getElementById("zd-gate");if(!ov)return;
  const fields=ZG.backup
    ?`<label class="zg-lbl" for="zg-backup">Code de secours</label><input class="zg-bk" id="zg-backup" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="XXXX-XXXX">`
    :`<div class="zg-ds" role="group" aria-label="Code à 6 chiffres">${[0,1,2,3,4,5].map(i=>`<input class="zg-d" id="zg-d${i}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="${i===0?"one-time-code":"off"}" aria-label="Chiffre ${i+1}">`).join("")}</div>`;
  ov.className="zg-ov";
  ov.innerHTML=`<div class="zg-box">
    <div class="zg-ic">${ZG_SHIELD}</div>
    <h2 id="zg-title">Accès privé</h2>
    <p class="zg-x">${ZG.backup?"Un de tes codes de secours (à usage unique).":"Code à 6 chiffres de ton application<br>Google Authenticator"}</p>
    <form onsubmit="event.preventDefault();zgSubmit()" autocomplete="off" novalidate>
      ${fields}
      ${ZG.err?`<div class="zg-err" role="alert">${esc(ZG.err)}</div>`:""}
      <button type="submit" class="zg-go" id="zg-go"${ZG.busy?" disabled":""}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> ${ZG.busy?"Vérification…":"Entrer"}</button>
    </form>
    <p class="zg-warn">5 codes faux de suite : l'accès se bloque 15 minutes et tu reçois une alerte.</p>
    <button type="button" class="zg-link" onclick="ZG.backup=!ZG.backup;ZG.err='';zgRender();setTimeout(()=>document.querySelector('#zd-gate .zg-d, #zg-backup')?.focus(),30)">${ZG.backup?"Utiliser Google Authenticator":"Utiliser un code de secours"}</button>
    <button type="button" class="zg-close" onclick="zgClose()">Fermer · Échap</button>
  </div>`;
  if(!ZG.backup){
    const ds=[...ov.querySelectorAll(".zg-d")];
    ds.forEach((d,i)=>{
      d.addEventListener("input",()=>{
        const v=d.value.replace(/\D/g,"");
        if(v.length>1){v.split("").slice(0,6-i).forEach((ch,j)=>{if(ds[i+j])ds[i+j].value=ch;});}else d.value=v;
        const n=ds.findIndex(x=>!x.value);if(n>=0&&v)ds[n].focus();
        if(ds.every(x=>x.value))zgSubmit();
      });
      d.addEventListener("keydown",ev=>{if(ev.key==="Backspace"&&!d.value&&i>0){ds[i-1].value="";ds[i-1].focus();ev.preventDefault();}});
      d.addEventListener("paste",ev=>{const t=(ev.clipboardData?.getData("text")||"").replace(/\D/g,"").slice(0,6);if(!t)return;ev.preventDefault();t.split("").forEach((ch,j)=>{if(ds[j])ds[j].value=ch;});if(t.length===6)zgSubmit();else ds[t.length]?.focus();});
    });
  }
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("zd-gate"))zgClose();});
async function zgSubmit(){
  if(ZG.busy||!ZG.g)return;
  const code=ZG.backup?(document.getElementById("zg-backup")?.value||"").trim():[...document.querySelectorAll("#zd-gate .zg-d")].map(x=>x.value).join("");
  if(!ZG.backup&&!/^\d{6}$/.test(code)){ZG.err="Entre les 6 chiffres";zgRender();return;}
  if(ZG.backup&&code.length<6){ZG.err="Entre ton code de secours";zgRender();return;}
  ZG.busy=true;ZG.err="";zgRender();
  try{
    const r=await fetch(API_BASE+"/auth/gate/enter",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({g:ZG.g,code})});
    let j={};try{j=await r.json();}catch(_){}
    ZG.busy=false;
    if(r.status===200&&j.token){
      zgClose();
      zaDone(j);
      ZG.lastAct=Date.now();
      setTimeout(()=>{try{navigate("admin");}catch(_){}},150);
      return;
    }
    if(r.status===404){zgClose();return;}
    ZG.err=r.status===429?"Trop de codes incorrects. Réessaie dans 15 minutes.":(typeof j.detail==="string"?j.detail:"Code incorrect");
    zgRender();
    setTimeout(()=>document.querySelector("#zd-gate .zg-d, #zg-backup")?.focus(),30);
  }catch(_){ZG.busy=false;ZG.err="Pas de connexion. Réessaie.";zgRender();}
}

// ── Session admin : fermée après 30 minutes sans activité ──
["pointerdown","keydown","scroll","touchstart"].forEach(ev=>document.addEventListener(ev,()=>{ZG.lastAct=Date.now();},{passive:true,capture:true}));
function zgIdleCheck(){
  if(!State.token||!State.tenant||!State.tenant.is_creator)return;
  if(Date.now()-ZG.lastAct>ZG_IDLE){try{doLogout();}catch(_){}try{history.replaceState(null,"",location.pathname);}catch(_){}}
}
setInterval(zgIdleCheck,30000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")zgIdleCheck();});
try{const a=+localStorage.getItem("zd_admin_act")||0;if(a)ZG.lastAct=a;}catch(_){}
setInterval(()=>{if(State.tenant&&State.tenant.is_creator){try{localStorage.setItem("zd_admin_act",String(ZG.lastAct));}catch(_){}}},15000);
window.addEventListener("pagehide",()=>{if(State.tenant&&State.tenant.is_creator){try{localStorage.setItem("zd_admin_act",String(ZG.lastAct));}catch(_){}}});

// ── Dans l'admin : sécurité de l'accès ──
async function zgCard(){
  const pg=document.getElementById("page-admin");if(!pg||!(State.tenant&&State.tenant.is_creator))return;
  let box=document.getElementById("zg-card");
  if(!box){box=document.createElement("div");box.id="zg-card";box.className="card zg-card";const sh=pg.querySelector(".sh");sh?sh.after(box):pg.prepend(box);}
  try{
    const d=await api("GET","/admin/gate");
    box.innerHTML=`<div class="zg-h"><i class="ti ti-shield-lock"></i> Sécurité de l'accès</div>
      ${d.default?`<div class="zg-alert" role="alert"><i class="ti ti-alert-triangle" aria-hidden="true"></i><span>Tu utilises encore la combinaison d'exemple. Change-la dès que possible.</span></div>`:""}
      <div class="zg-row"><div><b>Combinaison secrète</b><small>${d.changed_at?"Modifiée le "+esc(fmtDate(d.changed_at)):"Combinaison d'exemple"}</small></div><button type="button" class="btn btn-o btn-sm" onclick="zgChange()">Changer</button></div>
      <div class="zg-row"><div><b>Session admin : ${d.idle_min} min</b><small>Sans activité, l'admin se ferme tout seul.</small></div></div>
      <div class="zg-row zg-col"><b>Dernières entrées</b>${(d.entries||[]).length?d.entries.map(e=>`<small>${esc(new Date(e.at).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}))} · ${esc(String(e.detail||"").replace(/^entrée dans l'admin depuis /,""))}</small>`).join(""):"<small>—</small>"}</div>
      <button type="button" class="btn btn-o zg-out" onclick="doLogout()"><i class="ti ti-logout"></i> Fermer l'admin</button>`;
  }catch(e){box.innerHTML=`<div style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;}
}
function zgChange(){
  zdModal("zg-chg",`<div class="modal-title"><i class="ti ti-key" style="color:var(--green)"></i> Nouvelle combinaison</div>
    <p style="font-size:13px;color:var(--muted);line-height:1.5;margin:0 0 10px">De 6 à 32 lettres ou chiffres. Sur ordinateur : <b>Ctrl + Maj + Z</b> puis ta combinaison. Sur téléphone : 7 appuis sur le logo puis ta combinaison.</p>
    <label class="fl" for="zg-p1">Nouvelle combinaison</label><input class="inp" id="zg-p1" type="password" autocomplete="new-password" maxlength="32" data-lpignore="true" data-1p-ignore="true">
    <label class="fl" for="zg-p2">Encore une fois</label><input class="inp" id="zg-p2" type="password" autocomplete="new-password" maxlength="32" data-lpignore="true" data-1p-ignore="true">
    <div class="modal-footer"><button type="button" class="btn btn-o" onclick="zdCloseModal('zg-chg')">Annuler</button><button type="button" class="btn btn-g" id="zg-save" onclick="zgSave()">Enregistrer</button></div>`,440);
  setTimeout(()=>document.getElementById("zg-p1")?.focus(),60);
}
async function zgSave(){
  const a=(document.getElementById("zg-p1")?.value||"").toUpperCase().replace(/[^A-Z0-9]/g,""),b=(document.getElementById("zg-p2")?.value||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(a.length<6){showToast("Au moins 6 lettres ou chiffres","error");return;}
  if(a!==b){showToast("Les deux combinaisons sont différentes","error");return;}
  const btn=document.getElementById("zg-save");if(btn)btn.disabled=true;
  try{await api("PUT","/admin/gate",{phrase:a});zdCloseModal("zg-chg");showToast("Combinaison changée ✓ Retiens-la bien.");zgCard();}
  catch(e){showToast(e.message,"error");if(btn)btn.disabled=false;}
}
if(typeof loadPage==="function"){
  const _zgLP=loadPage;
  loadPage=async function(p){const r=await _zgLP.apply(this,arguments);if(p==="admin")setTimeout(zgCard,50);return r;};
}
if(typeof navigate==="function"){
  const _zgNav=navigate;
  navigate=function(p){if(p==="admin"&&!(State.tenant&&State.tenant.is_creator))p="dashboard";return _zgNav.call(this,p,...[].slice.call(arguments,1));};
}
