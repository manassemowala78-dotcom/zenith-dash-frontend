// ── 10.0.0 · Apparence au choix : chacun règle son affichage, la base reste par défaut ──
const UI={p:{},saveT:null,applying:false,obs:null,obsT:null,sorting:false,mq:null};
const UI_ACCENTS={green:"#00e080",blue:"#4f7aff",violet:"#a77bff",orange:"#ff9f43",pink:"#ff6fa8"};
const UI_NOHIDE=["profile"];
const UI_BLOCKS=[["kpi-revenue","kpi"],["kpi-pending","kpi"],["kpi-pipeline","kpi"],["kpi-clients","kpi"],["kpi-employees","kpi"],["kpi-expenses","kpi"],["quick","card"],["summary","card"],["widgets","box"]];
function uiKey(){return "zd_ui_"+((State.tenant&&(State.tenant.linked_account_id||State.tenant.id))||"x");}
function uiLoadLocal(){try{return JSON.parse(localStorage.getItem(uiKey())||"{}")||{};}catch(_){return {};}}
function uiSaveLocal(){try{localStorage.setItem(uiKey(),JSON.stringify(UI.p));}catch(_){}}
function uiPage(id){return (UI.p.pages&&UI.p.pages[id])||{};}
function uiSetPage(id,v){
  UI.p.pages=UI.p.pages||{};
  const c={};Object.keys(v).forEach(k=>{const x=v[k];if(x==null||(Array.isArray(x)&&!x.length))return;c[k]=x;});
  if(Object.keys(c).length)UI.p.pages[id]=c;else delete UI.p.pages[id];
  if(!Object.keys(UI.p.pages).length)delete UI.p.pages;
}
function uiChanged(){uiSaveLocal();uiApply();clearTimeout(UI.saveT);UI.saveT=setTimeout(uiPush,500);}
async function uiPush(){if(!State.token)return;try{const r=await api("PUT","/profile/ui-prefs",{prefs:UI.p});if(r&&r.prefs){UI.p=r.prefs;uiSaveLocal();}}catch(_){}}
async function uiPull(){
  if(!State.token)return;
  try{const r=await api("GET","/profile/ui-prefs");if(r&&r.prefs&&JSON.stringify(r.prefs)!==JSON.stringify(UI.p)){UI.p=r.prefs;uiSaveLocal();uiApply();}}catch(_){}
}

// ── Appliquer ──
function uiTheme(){
  const th=UI.p.theme;if(!th||typeof setTheme!=="function")return;
  const want=th==="auto"?(window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):th;
  if(State.theme!==want||document.documentElement.classList.contains("light")!==(want==="light")){UI.applying=true;try{setTheme(want);}finally{UI.applying=false;}}
}
function uiApply(){
  const h=document.documentElement,b=document.body;
  uiTheme();
  if(UI.p.accent&&UI.p.accent!=="green")h.dataset.accent=UI.p.accent;else delete h.dataset.accent;
  ["s","l","xl"].forEach(f=>h.classList.toggle("zd-fs-"+f,UI.p.font===f));
  if(b)b.classList.toggle("zd-compact",UI.p.density==="compact");
  uiNav();
  document.querySelectorAll(".page").forEach(pg=>{
    const id=pg.id.replace("page-","");const v=uiPage(id).view;
    pg.classList.toggle("zv-cards",v==="cards");pg.classList.toggle("zv-list",v==="list");
  });
  uiColStyle();uiBlocks();uiTables();uiThemeBtns();
}
function uiThemeBtns(){
  const th=UI.p.theme||(State.theme==="light"?"light":"dark");
  ["dark","light","auto"].forEach(k=>{const el=document.getElementById("theme-btn-"+k);if(el)el.classList.toggle("btn-g",th===k);});
}
function uiNav(){
  const hidden=new Set((UI.p.nav&&UI.p.nav.hidden)||[]),order=(UI.p.nav&&UI.p.nav.order)||[];
  document.querySelectorAll(".sidebar .nav-g").forEach(g=>{
    const items=[...g.querySelectorAll(":scope > .nav-i[data-p]")];
    items.forEach((el,i)=>{if(el.dataset.zo==null)el.dataset.zo=String(i);el.classList.toggle("zd-ui-hidden",hidden.has(el.dataset.p)&&!UI_NOHIDE.includes(el.dataset.p));});
    const rank=el=>{const k=order.indexOf(el.dataset.p);return k<0?1000+Number(el.dataset.zo):k;};
    const sorted=[...items].sort((a,b)=>rank(a)-rank(b));
    if(sorted.some((el,i)=>el!==items[i])){
      const after=items[items.length-1].nextSibling;
      sorted.forEach(el=>g.insertBefore(el,after));
    }
    const lbl=g.querySelector(":scope > .nav-lbl");
    if(lbl)lbl.classList.toggle("zd-ui-hidden",items.length>0&&items.every(el=>el.classList.contains("zd-ui-hidden")));
  });
  document.querySelectorAll(".bnav-item[data-bp]").forEach(el=>el.classList.toggle("zd-ui-hidden",hidden.has(el.dataset.bp)&&!["dashboard","profile"].includes(el.dataset.bp)));
  document.querySelectorAll("#more-menu [onclick]").forEach(el=>{
    const m=(el.getAttribute("onclick")||"").match(/navigate\('([a-z0-9-]+)'\)/);
    if(m)el.classList.toggle("zd-ui-hidden",hidden.has(m[1])&&!UI_NOHIDE.includes(m[1]));
  });
}
function uiColStyle(){
  let st=document.getElementById("zd-ui-cols");
  if(!st){st=document.createElement("style");st.id="zd-ui-cols";document.head.appendChild(st);}
  const rules=[];
  Object.entries(UI.p.pages||{}).forEach(([id,v])=>{
    (v.hide||[]).forEach(i=>{const n=i+1;rules.push(`#page-${id} table.zv-t>thead>tr>:nth-child(${n}),#page-${id} table.zv-t>tbody>tr>:nth-child(${n}){display:none!important}`);});
  });
  st.textContent=rules.join("\n");
}
function uiBlockEl(k){
  if(k.startsWith("kpi-"))return document.getElementById(k)?.closest(".kpi");
  if(k==="quick")return document.querySelector('#page-dashboard [data-i18n="dash_quick"]')?.closest(".card");
  if(k==="summary")return document.querySelector('#page-dashboard [data-i18n="dash_summary"]')?.closest(".card");
  if(k==="widgets")return document.getElementById("dash-widgets");
  return null;
}
function uiBlockLabel(k){
  const el=uiBlockEl(k);
  if(k.startsWith("kpi-"))return el?.querySelector(".kl")?.textContent?.trim()||k;
  if(k==="quick")return t("dash_quick");if(k==="summary")return t("dash_summary");
  return t("ui_widgets");
}
function uiBlocks(){
  const off=new Set(uiPage("dashboard").blocks_off||[]);
  UI_BLOCKS.forEach(([k])=>{const el=uiBlockEl(k);if(el){el.dataset.zb=k;el.classList.toggle("zd-ui-hidden",off.has(k));}});
  const g=document.querySelector("#page-dashboard .grid2");
  if(g){const cards=[...g.children];g.classList.toggle("zd-ui-hidden",cards.length>0&&cards.every(c=>c.classList.contains("zd-ui-hidden")));}
}

// ── Tableaux : cartes, liste, colonnes, tri ──
function uiMainTable(pg){
  if(!pg)return null;
  const ts=[...pg.querySelectorAll("table")].filter(tb=>!tb.closest(".modal-overlay,.zd-no-view")&&tb.tHead&&tb.tHead.rows.length&&tb.tHead.rows[0].cells.length>=2);
  return ts.find(tb=>tb.offsetParent!==null)||ts[0]||null;
}
function uiHeads(tb){return tb?[...tb.tHead.rows[0].cells].map(c=>(c.textContent||"").trim()):[];}
function uiNum(s){
  const x=String(s||"").replace(/ | /g," ").trim();
  let m=x.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if(m){const y=m[3].length===2?2000+Number(m[3]):Number(m[3]);return {n:Date.UTC(y,Number(m[2])-1,Number(m[1]))};}
  m=x.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return {n:Date.UTC(+m[1],+m[2]-1,+m[3])};
  const c=x.replace(/[^\d,.\-]/g,"");
  if(/\d/.test(c)&&/^[^A-Za-zÀ-ÿ]*[\d][\d\s.,]*[^A-Za-zÀ-ÿ]*$|^[$€£]|[$€£%]$|USD|CDF|FC/.test(x)){
    let v=c;if(v.includes(",")&&v.includes("."))v=v.lastIndexOf(",")>v.lastIndexOf(".")?v.replace(/\./g,"").replace(",","."):v.replace(/,/g,"");
    else if(v.includes(","))v=/,\d{3}$/.test(v)&&!/,\d{1,2}$/.test(v)?v.replace(/,/g,""):v.replace(",",".");
    const n=parseFloat(v);if(!isNaN(n))return {n};
  }
  return {s:x.toLocaleLowerCase()};
}
function uiSortTable(tb,sort){
  const body=tb.tBodies[0];if(!body)return;
  const n=tb.tHead.rows[0].cells.length;
  const rows=[...body.rows];
  if(rows.length<2||rows.some(r=>r.cells.length!==n||[...r.cells].some(c=>c.colSpan>1)))return;
  const col=sort.col,dir=sort.dir==="desc"?-1:1;
  const keyed=rows.map((r,i)=>({r,i,k:uiNum(r.cells[col]?r.cells[col].textContent:"")}));
  keyed.sort((a,b)=>{
    const x=a.k,y=b.k;let d;
    if(x.n!=null&&y.n!=null)d=x.n-y.n;else if(x.n!=null)d=-1;else if(y.n!=null)d=1;else d=(x.s||"").localeCompare(y.s||"","fr",{numeric:true});
    return d*dir||a.i-b.i;
  });
  if(keyed.every((x,i)=>x.r===rows[i]))return;
  UI.sorting=true;keyed.forEach(x=>body.appendChild(x.r));setTimeout(()=>{UI.sorting=false;},0);
}
function uiTables(){
  const pg=document.querySelector(".page.active");if(!pg)return;
  const id=pg.id.replace("page-","");const v=uiPage(id);
  document.querySelectorAll("table.zv-t").forEach(tb=>{if(!pg.contains(tb))tb.classList.remove("zv-t");});
  if(!v.view&&!(v.hide&&v.hide.length)&&!v.sort){pg.querySelectorAll("table.zv-t").forEach(tb=>tb.classList.remove("zv-t"));return;}
  const tb=uiMainTable(pg);if(!tb)return;
  pg.querySelectorAll("table.zv-t").forEach(x=>{if(x!==tb)x.classList.remove("zv-t");});
  tb.classList.add("zv-t");
  if(v.view==="cards"||v.view==="list"){
    const hs=uiHeads(tb);
    [...(tb.tBodies[0]?.rows||[])].forEach(r=>[...r.cells].forEach((c,i)=>{const l=hs[i]||"";if(c.dataset.zl!==l)c.dataset.zl=l;}));
  }
  if(v.sort)uiSortTable(tb,v.sort);
}
function uiWatch(){
  const main=document.querySelector(".main");if(!main||UI.obs)return;
  UI.obs=new MutationObserver(()=>{
    if(UI.sorting)return;
    clearTimeout(UI.obsT);UI.obsT=setTimeout(()=>{uiTables();uiBlocks();uiShButton();},120);
  });
  UI.obs.observe(main,{childList:true,subtree:true});
}

// ── Bouton « Affichage » dans chaque page ──
const UI_NO_BTN=["messaging","profile","admin","ai","help","myspace"];
function uiShButton(){
  const pg=document.querySelector(".page.active");if(!pg)return;
  const id=pg.id.replace("page-","");if(UI_NO_BTN.includes(id))return;
  const sh=pg.querySelector(":scope > .sh");if(!sh||sh.querySelector(".zd-ui-btn"))return;
  const has=id==="dashboard"||!!uiMainTable(pg);if(!has)return;
  const b=document.createElement("button");b.type="button";b.className="btn btn-o btn-sm zd-ui-btn";
  b.innerHTML=`<i class="ti ti-adjustments-horizontal" aria-hidden="true"></i> <span>${esc(t("ui_display"))}</span>`;
  b.onclick=()=>uiSheet(id);
  let tools=sh.querySelector(":scope > div:last-child");
  if(tools&&tools!==sh.firstElementChild&&tools.tagName==="DIV")tools.prepend(b);
  else sh.appendChild(b);
}
function uiNavName(id){
  const el=document.querySelector(`.sidebar .nav-i[data-p="${id}"]`);
  return ((el&&(el.querySelector("span[data-i18n]")||el).textContent)||id).replace(/\s+\d+$/,"").trim();
}
function uiSheet(id){
  const v=uiPage(id),pg=document.getElementById("page-"+id),tb=uiMainTable(pg),hs=uiHeads(tb);
  const hidden=new Set((UI.p.nav&&UI.p.nav.hidden)||[]);
  const views=[["table","ti-table",t("ui_v_table")],["cards","ti-layout-cards",t("ui_v_cards")],["list","ti-list",t("ui_v_list")]];
  const cur=v.view||"table";
  const colsHtml=hs.map((h,i)=>h?`<label class="ui-ck"><input type="checkbox" data-col="${i}"${(v.hide||[]).includes(i)?"":" checked"}> <span>${esc(h)}</span></label>`:"").join("");
  const blocksHtml=id==="dashboard"?UI_BLOCKS.filter(([k])=>uiBlockEl(k)).map(([k])=>`<label class="ui-ck"><input type="checkbox" data-block="${k}"${(v.blocks_off||[]).includes(k)?"":" checked"}> <span>${esc(uiBlockLabel(k))}</span></label>`).join(""):"";
  const sortCols=hs.map((h,i)=>h?`<option value="${i}"${v.sort&&v.sort.col===i?" selected":""}>${esc(h)}</option>`:"").join("");
  const ov=zdModal("modal-ui-sheet",`<div class="modal-title"><i class="ti ti-adjustments-horizontal" style="color:var(--green)"></i> ${esc(lkT("ui_sheet_t",{n:uiNavName(id)}))}</div>
    ${tb?`<div class="ui-cap">${esc(t("ui_view"))}</div>
    <div class="ui-views" role="radiogroup" aria-label="${esc(t("ui_view"))}">${views.map(([k,ic,l])=>`<button type="button" role="radio" aria-checked="${k===cur}" class="ui-view${k===cur?" on":""}" data-view="${k}"><i class="ti ${ic}" aria-hidden="true"></i><span>${esc(l)}</span></button>`).join("")}</div>
    <div class="ui-cap">${esc(t("ui_cols"))}</div><div class="ui-cks">${colsHtml}</div>
    <div class="ui-cap">${esc(t("ui_sort"))}</div>
    <div class="ui-sort"><select class="inp" id="ui-sort-col" aria-label="${esc(t("ui_sort"))}"><option value="">${esc(t("ui_sort_none"))}</option>${sortCols}</select>
      <select class="inp" id="ui-sort-dir" aria-label="${esc(t("ui_sort_dir"))}"><option value="asc"${v.sort&&v.sort.dir==="asc"?" selected":""}>${esc(t("ui_asc"))}</option><option value="desc"${!v.sort||v.sort.dir==="desc"?" selected":""}>${esc(t("ui_desc"))}</option></select></div>`:""}
    ${blocksHtml?`<div class="ui-cap">${esc(t("ui_blocks"))}</div><div class="ui-cks">${blocksHtml}</div>`:""}
    ${!tb&&!blocksHtml?`<p class="ui-note">${esc(t("ui_no_table"))}</p>`:""}
    <div class="ui-cap">${esc(t("ui_menu_cap"))}</div>
    ${UI_NOHIDE.includes(id)?"":`<label class="ui-ck"><input type="checkbox" id="ui-in-menu"${hidden.has(id)?"":" checked"}> <span>${esc(t("ui_in_menu"))}</span></label>`}
    <label class="ui-ck"><input type="checkbox" id="ui-home"${(UI.p.home||"dashboard")===id?" checked":""}> <span>${esc(t("ui_open_here"))}</span></label>
    <div class="modal-footer"><button type="button" class="btn btn-o btn-sm" id="ui-sheet-reset">${esc(t("ui_default"))}</button><button type="button" class="btn btn-g btn-sm" id="ui-sheet-ok">${esc(t("ui_apply"))}</button></div>`,460);
  ov.classList.add("ui-sheet-ov");
  let view=cur;
  ov.querySelectorAll(".ui-view").forEach(bt=>bt.onclick=()=>{view=bt.dataset.view;ov.querySelectorAll(".ui-view").forEach(x=>{x.classList.toggle("on",x===bt);x.setAttribute("aria-checked",String(x===bt));});});
  document.getElementById("ui-sheet-reset").onclick=()=>{
    uiSetPage(id,{});
    if(UI.p.nav&&UI.p.nav.hidden){UI.p.nav.hidden=UI.p.nav.hidden.filter(x=>x!==id);}
    if(UI.p.home===id)delete UI.p.home;
    uiTidy();uiChanged();zdCloseModal("modal-ui-sheet");showToast(t("ui_reset_done"));
  };
  document.getElementById("ui-sheet-ok").onclick=()=>{
    const hide=[...ov.querySelectorAll("[data-col]")].filter(x=>!x.checked).map(x=>Number(x.dataset.col));
    const off=[...ov.querySelectorAll("[data-block]")].filter(x=>!x.checked).map(x=>x.dataset.block);
    const sc=document.getElementById("ui-sort-col"),sd=document.getElementById("ui-sort-dir");
    const sort=sc&&sc.value!==""?{col:Number(sc.value),dir:sd.value}:null;
    const nv={...uiPage(id)};
    if(tb){nv.view=view==="table"?null:view;nv.hide=hide.length&&hide.length<hs.filter(Boolean).length?hide:null;nv.sort=sort;}
    if(id==="dashboard")nv.blocks_off=off.length?off:null;
    uiSetPage(id,nv);
    const im=document.getElementById("ui-in-menu");
    if(im){UI.p.nav=UI.p.nav||{};const hset=new Set(UI.p.nav.hidden||[]);if(im.checked)hset.delete(id);else hset.add(id);UI.p.nav.hidden=[...hset];}
    const hm=document.getElementById("ui-home");
    if(hm.checked)UI.p.home=id;else if(UI.p.home===id)delete UI.p.home;
    if(UI.p.home==="dashboard")delete UI.p.home;
    uiTidy();uiChanged();zdCloseModal("modal-ui-sheet");showToast(t("ui_applied"));
  };
}
function uiTidy(){
  if(UI.p.nav){if(UI.p.nav.hidden&&!UI.p.nav.hidden.length)delete UI.p.nav.hidden;if(UI.p.nav.order&&!UI.p.nav.order.length)delete UI.p.nav.order;if(!Object.keys(UI.p.nav).length)delete UI.p.nav;}
  if(UI.p.pages&&!Object.keys(UI.p.pages).length)delete UI.p.pages;
}

// ── Profil → Apparence : réglages généraux et par fonctionnalité ──
function uiFeatures(){
  const out=[];const seen=new Set();
  document.querySelectorAll(".sidebar .nav-g").forEach(g=>{
    g.querySelectorAll(":scope > .nav-i[data-p]").forEach(el=>{
      const id=el.dataset.p;if(seen.has(id)||id==="admin")return;
      const vis=el.classList.contains("zd-ui-hidden")||(el.style.display!=="none"&&getComputedStyle(el).display!=="none");
      if(!vis)return;seen.add(id);
      out.push({id,name:uiNavName(id),group:g});
    });
  });
  return out;
}
function uiViewSummary(id){
  const v=uiPage(id),parts=[];
  if(v.view)parts.push(t("ui_v_"+v.view));
  if(v.hide&&v.hide.length)parts.push(lkT("ui_cols_off",{n:v.hide.length}));
  if(v.sort)parts.push(t("ui_sorted"));
  if(v.blocks_off&&v.blocks_off.length)parts.push(lkT("ui_blocks_off",{n:v.blocks_off.length}));
  return parts.join(" · ")||t("ui_base");
}
function uiOpen(){
  const feats=uiFeatures(),hidden=new Set((UI.p.nav&&UI.p.nav.hidden)||[]),home=UI.p.home||"dashboard";
  const seg=(key,opts,cur,cls)=>`<div class="ui-seg${cls?" "+cls:""}" role="radiogroup">${opts.map(([v,l,extra])=>`<button type="button" role="radio" aria-checked="${v===cur}" class="ui-segb${v===cur?" on":""}" onclick="uiSetGen('${key}','${v}')"${extra||""}>${l}</button>`).join("")}</div>`;
  const th=UI.p.theme||(State.theme==="light"?"light":"dark"),ac=UI.p.accent||"green",fs=UI.p.font||"m",dn=UI.p.density||"comfy";
  const rows=feats.map((f,i)=>{
    const changed=hidden.has(f.id)||!!UI.p.pages?.[f.id]||((UI.p.nav&&UI.p.nav.order)||[]).includes(f.id)||(UI.p.home===f.id);
    const sameGroup=feats.filter(x=>x.group===f.group);const k=sameGroup.indexOf(f);
    return `<div class="ui-row${hidden.has(f.id)?" off":""}" data-f="${esc(f.id)}">
      <span class="ui-move"><button type="button" aria-label="${esc(lkT("ui_up",{n:f.name}))}" onclick="uiMove('${esc(f.id)}',-1)"${k===0?" disabled":""}><i class="ti ti-chevron-up"></i></button><button type="button" aria-label="${esc(lkT("ui_down",{n:f.name}))}" onclick="uiMove('${esc(f.id)}',1)"${k===sameGroup.length-1?" disabled":""}><i class="ti ti-chevron-down"></i></button></span>
      <span class="ui-fname"><b>${esc(f.name)}</b>${changed?`<em class="ui-mod">${esc(t("ui_modified"))}</em>`:""}</span>
      <label class="lk-switch ui-sw"><input type="checkbox"${hidden.has(f.id)?"":" checked"}${UI_NOHIDE.includes(f.id)?" disabled":""} onchange="uiToggleMenu('${esc(f.id)}',this.checked)"><span class="lk-sw" aria-hidden="true"></span><span class="sr-only">${esc(lkT("ui_in_menu_n",{n:f.name}))}</span></label>
      <button type="button" class="ui-vbtn" onclick="uiGoSheet('${esc(f.id)}')">${esc(uiViewSummary(f.id))}<i class="ti ti-chevron-right" aria-hidden="true"></i></button>
      <span class="ui-home">${home===f.id?`<i class="ti ti-home" aria-hidden="true"></i> ${esc(t("ui_home_here"))}`:""}</span>
      <span class="ui-rst">${changed?`<button type="button" class="btn-link" onclick="uiResetOne('${esc(f.id)}')">${esc(t("ui_restore"))}</button>`:""}</span>
    </div>`;
  }).join("");
  zdModal("modal-ui",`<div class="ui-head"><div><div class="modal-title" style="margin:0"><i class="ti ti-palette" style="color:var(--green)"></i> ${esc(t("ui_title"))}</div><p class="ui-note">${esc(t("ui_only_you"))}</p></div>
      <button type="button" class="btn btn-o btn-sm" onclick="uiResetAll()"><i class="ti ti-restore" aria-hidden="true"></i> ${esc(t("ui_reset_all"))}</button></div>
    <div class="ui-gen">
      <div><div class="ui-cap">${esc(t("ui_theme"))}</div>${seg("theme",[["dark",esc(t("ui_dark"))],["light",esc(t("ui_light"))],["auto",esc(t("ui_auto"))]],th)}</div>
      <div><div class="ui-cap">${esc(t("ui_accent"))}</div><div class="ui-sw-row" role="radiogroup">${Object.entries(UI_ACCENTS).map(([k,c])=>`<button type="button" role="radio" aria-checked="${k===ac}" class="ui-acc${k===ac?" on":""}" style="background:${c}" aria-label="${esc(t("ui_acc_"+k))}" onclick="uiSetGen('accent','${k}')"></button>`).join("")}</div></div>
      <div><div class="ui-cap">${esc(t("ui_font"))}</div>${seg("font",[["s","A",' style="font-size:12px" aria-label="'+esc(t("ui_fs_s"))+'"'],["m","A",' style="font-size:14px" aria-label="'+esc(t("ui_fs_m"))+'"'],["l","A",' style="font-size:17px" aria-label="'+esc(t("ui_fs_l"))+'"'],["xl","A",' style="font-size:20px" aria-label="'+esc(t("ui_fs_xl"))+'"']],fs,"fs")}</div>
      <div><div class="ui-cap">${esc(t("ui_density"))}</div>${seg("density",[["comfy",esc(t("ui_comfy"))],["compact",esc(t("ui_compact"))]],dn)}</div>
    </div>
    <div class="ui-table"><div class="ui-row ui-th"><span></span><span>${esc(t("ui_feature"))}</span><span>${esc(t("ui_in_menu_s"))}</span><span>${esc(t("ui_view"))}</span><span>${esc(t("ui_home_col"))}</span><span></span></div>${rows}</div>
    <div class="modal-footer"><button type="button" class="btn btn-g btn-sm" onclick="zdCloseModal('modal-ui')">${esc(t("ui_done"))}</button></div>`,980);
}
function uiSetGen(k,v){
  const base={theme:null,accent:"green",font:"m",density:"comfy"};
  if(k==="theme"){UI.p.theme=v;}else if(v===base[k])delete UI.p[k];else UI.p[k]=v;
  uiChanged();uiOpen();
}
function uiToggleMenu(id,on){
  UI.p.nav=UI.p.nav||{};const h=new Set(UI.p.nav.hidden||[]);if(on)h.delete(id);else h.add(id);UI.p.nav.hidden=[...h];
  uiTidy();uiChanged();uiOpen();
}
function uiMove(id,dir){
  const feats=uiFeatures();const f=feats.find(x=>x.id===id);if(!f)return;
  const grp=feats.filter(x=>x.group===f.group).map(x=>x.id);
  const i=grp.indexOf(id),j=i+dir;if(j<0||j>=grp.length)return;
  [grp[i],grp[j]]=[grp[j],grp[i]];
  const order=((UI.p.nav&&UI.p.nav.order)||[]).filter(x=>!grp.includes(x));
  UI.p.nav=UI.p.nav||{};UI.p.nav.order=[...order,...grp];
  uiChanged();uiOpen();
}
function uiResetOne(id){
  uiSetPage(id,{});
  if(UI.p.nav){if(UI.p.nav.hidden)UI.p.nav.hidden=UI.p.nav.hidden.filter(x=>x!==id);if(UI.p.nav.order){const f=uiFeatures().find(x=>x.id===id);const grp=f?uiFeatures().filter(x=>x.group===f.group).map(x=>x.id):[id];UI.p.nav.order=UI.p.nav.order.filter(x=>!grp.includes(x));}}
  if(UI.p.home===id)delete UI.p.home;
  uiTidy();uiChanged();uiOpen();
}
function uiResetAll(){
  if(!confirm(t("ui_reset_confirm")))return;
  const th=UI.p.theme;UI.p={};
  if(th&&th!=="dark"&&typeof setTheme==="function"){UI.applying=true;try{setTheme("dark");}finally{UI.applying=false;}}
  uiChanged();uiOpen();showToast(t("ui_reset_done"));
}
function uiGoSheet(id){zdCloseModal("modal-ui");navigate(id);setTimeout(()=>uiSheet(id),700);}
function uiProfileCard(){
  const dark=document.getElementById("theme-btn-dark");if(!dark)return;
  const wrap=dark.parentElement;
  if(!document.getElementById("theme-btn-auto")){
    const a=document.createElement("button");a.className="btn btn-o btn-sm";a.id="theme-btn-auto";a.type="button";
    a.innerHTML=`<i class="ti ti-device-desktop" aria-hidden="true"></i> ${esc(t("ui_auto"))}`;a.onclick=()=>{UI.p.theme="auto";uiChanged();};
    wrap.appendChild(a);wrap.style.flexWrap="wrap";
  }
  if(!document.getElementById("zd-ui-open")){
    const b=document.createElement("button");b.className="btn btn-g btn-sm";b.id="zd-ui-open";b.type="button";
    b.innerHTML=`<i class="ti ti-adjustments" aria-hidden="true"></i> ${esc(t("ui_customize"))}`;b.onclick=uiOpen;
    const p=document.createElement("div");p.className="ui-card-x";p.innerHTML=`<p>${esc(t("ui_card_x"))}</p>`;p.appendChild(b);
    wrap.after(p);
  }
  uiThemeBtns();
}

// ── Branchements ──
if(typeof setTheme==="function"){
  const _uiST=setTheme;
  setTheme=function(th){const r=_uiST.apply(this,arguments);const ev=window.event;if(!UI.applying&&State.token&&ev&&ev.type==="click"){UI.p.theme=th;uiSaveLocal();clearTimeout(UI.saveT);UI.saveT=setTimeout(uiPush,500);uiThemeBtns();}return r;};
}
if(typeof loadPage==="function"){
  const _uiLP=loadPage;
  loadPage=async function(p){const r=await _uiLP.apply(this,arguments);try{uiApply();uiShButton();if(p==="profile")uiProfileCard();}catch(_){}return r;};
}
if(typeof navigate==="function"){
  const _uiNav=navigate;
  navigate=function(p){const r=_uiNav.apply(this,arguments);setTimeout(()=>{try{uiApply();uiShButton();}catch(_){}},60);return r;};
}
const UI_DEEP=/[?&](p|c|call|callback)=/.test(location.search);
if(typeof showAppLayout==="function"){
  const _uiSAL=showAppLayout;
  showAppLayout=async function(){
    UI.p=uiLoadLocal();uiApply();
    const r=await _uiSAL.apply(this,arguments);
    await uiPull();uiApply();uiWatch();
    const home=UI.p.home;
    if(home&&home!=="dashboard"&&!UI_DEEP&&!State.restricted&&document.querySelector("#page-dashboard.active")&&document.querySelector(`.sidebar .nav-i[data-p="${home}"]`))navigate(home);
    return r;
  };
}
if(typeof doLogout==="function"){
  const _uiOut=doLogout;
  doLogout=function(){const r=_uiOut.apply(this,arguments);UI.p={};uiApply();return r;};
}
if(window.matchMedia){try{matchMedia("(prefers-color-scheme: light)").addEventListener("change",()=>{if(UI.p.theme==="auto")uiTheme();});}catch(_){}}
if(State.token){UI.p=uiLoadLocal();try{uiApply();}catch(_){}}
