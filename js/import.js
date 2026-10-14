const IMPORT_SPECS={
  clients:{icon:"ti-users",fields:{name:["nom","name","client","raison sociale","nom du client"],company:["societe","entreprise","company"],email:["email","e-mail","courriel","mail"],phone:["telephone","tel","phone","mobile","gsm","portable"],address:["adresse","address"],country:["pays","country"],ice:["n fiscal","numero fiscal","nif","ice","rccm","tax id","id nat"],notes:["notes","remarque","commentaire"]},
    sample:[["Boulangerie Kinshasa","BK SARL","bk@exemple.cd","+243 81 234 5678","Av. Kasa-Vubu 12, Kinshasa","CD","A1234567B",""],["Hôtel Fleuve","","","+243 99 000 1111","","CD","",""]]},
  products:{icon:"ti-box",fields:{name:["nom","produit","article","designation","name"],sku:["sku","reference","ref","code article"],barcode:["code-barres","code barres","code barre","ean","barcode","gtin"],category:["categorie","famille","category"],unit_price:["prix","prix de vente","prix unitaire","price","pu"],cost_price:["cout","prix d achat","prix achat","cost"],stock_qty:["stock","quantite","qte","qty","quantity"],stock_min:["stock min","stock minimum","minimum","seuil","alerte"],unit:["unite","unit"],description:["description"]},
    sample:[["Ciment 50kg","CIM-50","6001234567890","Matériaux","12,00","9,00","100","20","sac",""],["Fer à béton 12mm","FER-12","6009876543210","Matériaux","8,00","6,00","50","10","pcs",""]]},
  suppliers:{icon:"ti-truck",fields:{name:["nom","fournisseur","name","raison sociale"],email:["email","e-mail","courriel","mail"],phone:["telephone","tel","phone","mobile"],notes:["notes","remarque","commentaire"]},
    sample:[["Cimenterie du Congo","vente@cimco.cd","+243 81 999 0000",""]]},
  employees:{icon:"ti-id-badge",fields:{name:["nom","nom complet","employe","name"],email:["email","e-mail","courriel","mail"],phone:["telephone","tel","phone","mobile"],position:["poste","fonction","position","titre"],department:["departement","service","department"],salary:["salaire","salary","salaire de base"],hire_date:["date d embauche","embauche","hire date","date d entree"],leave_balance:["conges","solde conges","solde de conges"],dependents:["personnes a charge","enfants a charge","dependents"],contract_type:["contrat","type de contrat"],notes:["notes","remarque"]},
    sample:[["Jean Mukendi","jean@exemple.cd","+243 81 555 1234","Comptable","Finance","800","15/03/2024","30","3","CDI",""]]}
};
const IMPORT_PAGES={clients:"clients",products:"stock",suppliers:"stock",employees:"hr"};
let _imp={entity:"clients",headers:[],rows:[],mapping:{},verified:false};
function normHeader(h){return String(h||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
function importAllowed(entity){const mod={clients:"clients",products:"stock",suppliers:"stock",employees:"hr"}[entity];
  const lim=State.tenant?.limits||{};
  if(entity==="products"||entity==="suppliers"){if(!checkFeature(lim,"stock"))return false;}
  if(entity==="employees"&&!checkFeature(lim,"hr"))return false;
  if(isTeamMember()&&State.tenant.member_role!=="admin"){const a=(State.tenant.member_access||{})[mod];if(a!=="rw")return false;}
  return true;}
function loadImportPage(entity){
  if(entity)_imp.entity=entity;
  _imp={entity:_imp.entity,headers:[],rows:[],mapping:{},verified:false};
  document.getElementById("import-types").innerHTML=Object.keys(IMPORT_SPECS).map(k=>{const okk=importAllowed(k);return `<button class="imp-type${k===_imp.entity?" active":""}${okk?"":" locked"}" onclick="${okk?`loadImportPage('${k}')`:`showToast(t('import_locked'),'error')`}"><i class="ti ${IMPORT_SPECS[k].icon}"></i><span>${t("imp_"+k)}</span>${okk?"":`<i class="ti ti-lock" style="font-size:12px"></i>`}</button>`;}).join("");
  document.getElementById("import-file").value="";
  document.getElementById("import-step2").style.display="none";
  document.getElementById("import-report").innerHTML="";
}
function csvEscape(v){v=String(v??"");return /[;"\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v;}
function downloadImportTemplate(){
  const spec=IMPORT_SPECS[_imp.entity];
  const head=Object.keys(spec.fields).map(f=>t("impf_"+f));
  const csv="\ufeff"+[head,...spec.sample].map(r=>r.map(csvEscape).join(";")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`modele-${_imp.entity}.csv`;document.body.appendChild(a);a.click();a.remove();
}
function parseCsvText(text){
  text=text.replace(/^\ufeff/,"");
  const first=text.split(/\r?\n/)[0]||"";
  const delim=[";",",","\t"].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const rows=[];let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=ch;continue;}
    if(ch==='"'){q=true;continue;}
    if(ch===delim){row.push(cell);cell="";continue;}
    if(ch==="\n"||ch==="\r"){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(cell);rows.push(row);row=[];cell="";continue;}
    cell+=ch;
  }
  if(cell!==""||row.length){row.push(cell);rows.push(row);}
  return rows.filter(r=>r.some(c=>String(c).trim()!==""));
}
async function loadSheetJs(){
  if(window.XLSX)return;
  await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";s.onload=res;s.onerror=()=>rej(new Error(t("import_xlsx_failed")));document.head.appendChild(s);});
}
async function onImportFile(file){
  if(!file)return;
  try{
    let table;
    if(/\.(xlsx|xls|ods)$/i.test(file.name)){
      await loadSheetJs();
      const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false});
      table=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:""}).filter(r=>r.some(c=>String(c).trim()!==""));
    }else table=parseCsvText(await file.text());
    if(table.length<2){showToast(t("import_empty"),"error");return;}
    _imp.headers=table[0].map(h=>String(h).trim());
    _imp.rows=table.slice(1);
    _imp.verified=false;
    const spec=IMPORT_SPECS[_imp.entity].fields;
    _imp.mapping={};
    const normHeaders=_imp.headers.map(normHeader);
    Object.entries(spec).forEach(([field,syn])=>{
      const label=normHeader(t("impf_"+field));
      let idx=normHeaders.findIndex(h=>h===label||syn.includes(h));
      if(idx<0)idx=normHeaders.findIndex(h=>syn.some(s=>s.length>3&&h.startsWith(s)));
      if(idx>=0&&!Object.values(_imp.mapping).includes(idx))_imp.mapping[field]=idx;
    });
    renderImportMapping();
  }catch(e){showToast(e.message,"error");}
}
function renderImportMapping(){
  const spec=IMPORT_SPECS[_imp.entity].fields;
  document.getElementById("import-step2").style.display="block";
  document.getElementById("import-summary").textContent=t("import_rows_found").replace("{n}",_imp.rows.length).replace("{c}",_imp.headers.length);
  document.getElementById("import-mapping").innerHTML=Object.keys(spec).map(f=>`<div class="imp-map-row"><span>${t("impf_"+f)}${f==="name"?" *":""}</span>
    <select class="inp" onchange="_imp.mapping['${f}']=this.value===''?undefined:parseInt(this.value);_imp.verified=false;renderImportPreview()"><option value="">${t("import_ignore")}</option>${_imp.headers.map((h,i)=>`<option value="${i}" ${_imp.mapping[f]===i?"selected":""}>${esc(h||`#${i+1}`)}</option>`).join("")}</select></div>`).join("");
  renderImportPreview();
}
function importRowObjects(){
  return _imp.rows.map(r=>{const o={};Object.entries(_imp.mapping).forEach(([f,i])=>{if(i!==undefined&&i!==null)o[f]=r[i];});return o;});
}
function renderImportPreview(){
  const spec=Object.keys(IMPORT_SPECS[_imp.entity].fields).filter(f=>_imp.mapping[f]!==undefined);
  const rows=importRowObjects().slice(0,5);
  document.getElementById("import-preview").innerHTML=`<table><thead><tr>${spec.map(f=>`<th>${t("impf_"+f)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${spec.map(f=>`<td>${esc(String(r[f]??""))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  document.getElementById("import-run-btn").disabled=!_imp.verified;
}
async function runImport(dry){
  if(_imp.mapping.name===undefined){showToast(t("import_need_name"),"error");return;}
  const mode=document.querySelector('input[name="import-mode"]:checked')?.value||"create";
  const rows=importRowObjects();
  const box=document.getElementById("import-report");
  box.innerHTML=`<div style="color:var(--muted);padding:10px">${t("loading")}</div>`;
  try{
    const r=await api("POST",`/import/${_imp.entity}`,{rows,mode,dry_run:dry});
    _imp.verified=dry;
    box.innerHTML=`<div class="kgrid" style="margin:10px 0">
        <div class="kpi"><div class="kl">${dry?t("import_will_create"):t("import_created")}</div><div class="kv" style="color:var(--green)">${r.created}</div></div>
        <div class="kpi"><div class="kl">${dry?t("import_will_update"):t("import_updated")}</div><div class="kv" style="color:var(--blue)">${r.updated}</div></div>
        <div class="kpi"><div class="kl">${t("import_skipped")}</div><div class="kv" style="color:${r.skipped_count?"var(--amber)":"var(--text)"}">${r.skipped_count}</div></div></div>
      ${r.skipped.length?`<div class="table-wrap"><table><thead><tr><th>${t("import_line")}</th><th>${t("th_name")}</th><th>${t("import_reason")}</th></tr></thead><tbody>${r.skipped.map(s=>`<tr><td style="font-family:var(--mono)">${s.row}</td><td>${esc(s.name||"")}</td><td style="color:var(--amber)">${esc(s.reason)}</td></tr>`).join("")}</tbody></table></div>`:""}
      ${dry?`<div style="font-size:12px;color:var(--muted);margin-top:8px">${t("import_dry_hint")}</div>`:`<div style="margin-top:10px"><button class="btn btn-o btn-sm" onclick="navigate('${IMPORT_PAGES[_imp.entity]==="hr"?"employees":IMPORT_PAGES[_imp.entity]}')">${t("import_see_result")}</button></div>`}`;
    if(!dry){showToast(`${t("import_done")} — ${r.created} / ${r.updated}`);_imp.verified=false;_products=[];}
    renderImportPreview();
  }catch(e){box.innerHTML=`<div style="color:var(--red);padding:10px">${esc(e.message)}</div>`;}
}
