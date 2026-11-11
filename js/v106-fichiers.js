// ── 10.6.2 · Envoyer plusieurs fichiers d'un coup (jusqu'à 30, 25 Mo chacun) ──
const MF={files:[],max:30,maxBytes:25*1024*1024,urls:new Map(),sending:false};
function mfSize(n){return n<1024?`${n} o`:n<1048576?`${Math.round(n/1024)} Ko`:`${(n/1048576).toFixed(n<10485760?1:0).replace(".",",")} Mo`;}
function mfKind(f){const ty=f.type||"",n=f.name||"";if(/^image\//.test(ty)||/\.(jpe?g|png|gif|webp|heic|heif|avif|bmp)$/i.test(n))return "img";if(/^video\//.test(ty)||/\.(mp4|mov|webm|m4v|3gp)$/i.test(n))return "vid";return "doc";}
function mfIcon(f){const n=(f.name||"").toLowerCase();if(/\.pdf$/.test(n))return "ti-file-type-pdf";if(/\.(xlsx?|csv)$/.test(n))return "ti-file-spreadsheet";if(/\.(docx?|odt|txt)$/.test(n))return "ti-file-text";if(/\.(mp3|m4a|wav|ogg|aac)$/.test(n))return "ti-music";if(/\.(zip|rar|7z)$/.test(n))return "ti-file-zip";return "ti-file";}
function mfKey(f){return `${f.name}|${f.size}|${f.lastModified}`;}
// Point d'entrée unique : sélecteur de fichiers, glisser-déposer, coller
function mvPickFiles(files){
  const arr=[...(files||[])];if(!arr.length||!_currentConvId)return;
  if(arr.length===1&&!document.getElementById("mf-ov")){
    if(arr[0].size>MF.maxBytes){showToast(abTr("mf_too_big",{n:arr[0].name,m:25}),"error");return;}
    sendFileMessage(arr[0]);return;
  }
  mfAdd(arr);
}
function mfAdd(arr){
  const have=new Set(MF.files.map(mfKey));let cut=0;
  for(const f of arr){
    if(have.has(mfKey(f)))continue;
    if(MF.files.length>=MF.max){cut++;continue;}
    MF.files.push(f);have.add(mfKey(f));
  }
  if(cut)showToast(abTr("mf_max",{n:MF.max}),"info");
  mfRender();
}
function mfClose(){
  document.getElementById("mf-ov")?.remove();
  MF.urls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(_){}});MF.urls.clear();MF.files=[];
}
function mfRemove(i){const f=MF.files[i];if(f){const k=mfKey(f),u=MF.urls.get(k);if(u){try{URL.revokeObjectURL(u);}catch(_){}MF.urls.delete(k);}}MF.files.splice(i,1);if(!MF.files.length)mfClose();else mfRender();}
function mfThumb(f,i){
  const k=mfKind(f),big=f.size>MF.maxBytes;let inner;
  if(k==="img"||k==="vid"){
    let u=MF.urls.get(mfKey(f));if(!u){try{u=URL.createObjectURL(f);MF.urls.set(mfKey(f),u);}catch(_){}}
    inner=u?(k==="img"?`<img src="${u}" alt="" loading="lazy" decoding="async">`:`<video src="${u}#t=0.1" muted playsinline preload="metadata"></video><span class="mf-play"><i class="ti ti-player-play-filled"></i></span>`):`<i class="ti ${mfIcon(f)}"></i>`;
  }else inner=`<i class="ti ${mfIcon(f)}"></i><span class="mf-nm">${esc(f.name||"")}</span>`;
  return `<div class="mf-th${big?" big":""}${k==="doc"?" doc":""}" title="${esc(f.name||"")}">${inner}<span class="mf-sz">${big?esc(t("mf_big_tag")):esc(mfSize(f.size))}</span>
    <button type="button" class="mf-x" aria-label="${esc(t("mf_remove"))}" onclick="mfRemove(${i})"><i class="ti ti-x"></i></button></div>`;
}
function mfRender(){
  let ov=document.getElementById("mf-ov");
  if(!ov){ov=document.createElement("div");ov.id="mf-ov";ov.className="modal-overlay";ov.style.display="flex";ov.style.zIndex=1250;ov.style.alignItems="flex-end";
    ov.addEventListener("click",e=>{if(e.target===ov)mfClose();});document.body.appendChild(ov);}
  const ok=MF.files.filter(f=>f.size<=MF.maxBytes),n=ok.length;
  ov.innerHTML=`<div class="mf-sheet" role="dialog" aria-modal="true" aria-labelledby="mf-t">
    <div class="mf-top"><b id="mf-t">${esc(abTr(MF.files.length===1?"mf_title_1":"mf_title_n",{n:MF.files.length}))}</b>
      <button type="button" class="btn btn-o btn-sm" onclick="document.getElementById('mf-more').click()"${MF.files.length>=MF.max?" disabled":""}><i class="ti ti-plus"></i> ${esc(t("mf_add"))}</button></div>
    <div class="mf-grid">${MF.files.map(mfThumb).join("")}</div>
    <p class="mf-note">${esc(abTr("mf_limits",{n:MF.max,m:25}))}</p>
    <button type="button" class="mf-send" id="mf-send"${n?"":" disabled"} onclick="mfSend()"><i class="ti ti-send"></i> ${esc(abTr(n===1?"mf_send_1":"mf_send_n",{n}))}</button>
    <button type="button" class="mf-cancel" onclick="mfClose()">${esc(t("btn_cancel"))}</button>
    <input type="file" id="mf-more" multiple style="display:none" onchange="mfAdd([...this.files]);this.value=''"></div>`;
}
async function mfSend(){
  if(MF.sending)return;
  const conv=_currentConvId,list=MF.files.filter(f=>f.size<=MF.maxBytes);
  if(!list.length||!conv)return;
  MF.sending=true;
  const keep=new Map();   // les aperçus restent utilisables dans les bulles : on ne révoque pas ici
  document.getElementById("mf-ov")?.remove();MF.urls.clear();MF.files=[];
  try{
    for(const f of list){
      if(_currentConvId!==conv){showToast(t("mf_interrupted"),"error");break;}
      await sendFileMessage(f);
    }
  }finally{MF.sending=false;}
}
mvSendFiles=mvPickFiles;
