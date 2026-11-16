/* Zenith Dash 10.7.1 — « Filmer une vidéo » depuis la discussion.
   L'appli filme elle-même, en qualité allégée (environ 7 Mo par minute), pour que la vidéo passe sous la limite de 25 Mo.
   Si le téléphone ne le permet pas, on ouvre l'appareil photo du téléphone en mode vidéo. */
(function(){
  const MAX_S=180,MAX_BYTES=24*1024*1024;
  const R={stream:null,rec:null,chunks:[],bytes:0,t0:0,tick:0,facing:"environment",mime:"",busy:false,keep:false};
  const el=id=>document.getElementById(id);
  const fmt=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  function pickMime(){
    const c=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp8,opus","video/webm;codecs=vp9,opus","video/webm"];
    for(const m of c){try{if(MediaRecorder.isTypeSupported(m))return m;}catch(_){}}
    return "";
  }
  function native(){const i=el("chat-video-input");if(i){i.value="";i.click();}}
  function stopStream(){try{R.stream&&R.stream.getTracks().forEach(x=>x.stop());}catch(_){}R.stream=null;}
  function close(){
    clearInterval(R.tick);R.keep=false;
    try{if(R.rec&&R.rec.state!=="inactive")R.rec.stop();}catch(_){}
    R.rec=null;R.chunks=[];R.bytes=0;stopStream();
    el("zv-rec")?.remove();
  }
  window.zvRecClose=close;
  async function startStream(){
    stopStream();
    R.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},
      video:{facingMode:{ideal:R.facing},width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}}});
    const v=el("zv-rec-v");if(v){v.srcObject=R.stream;v.classList.toggle("mirror",R.facing==="user");try{await v.play();}catch(_){}}
  }
  function ui(){
    const on=!!(R.rec&&R.rec.state==="recording"),s=on?(Date.now()-R.t0)/1000:0;
    const tm=el("zv-rec-t");if(tm){tm.textContent=`${fmt(s)} / ${fmt(MAX_S)}`;tm.classList.toggle("on",on);}
    const b=el("zv-rec-go");if(b){b.classList.toggle("on",on);const l=t(on?"zv_rec_stop":"zv_rec_start");b.setAttribute("aria-label",l);b.title=l;}
    const sw=el("zv-rec-sw");if(sw)sw.disabled=on||R.busy;
    const h=el("zv-rec-h");if(h)h.textContent=t(on?"zv_rec_hint_on":"zv_rec_hint");
    if(on&&(s>=MAX_S||R.bytes>=MAX_BYTES))stop();
  }
  function start(){
    if(!R.stream||R.busy)return;
    R.chunks=[];R.bytes=0;R.keep=true;
    const opt={videoBitsPerSecond:850000,audioBitsPerSecond:64000};if(R.mime)opt.mimeType=R.mime;
    try{R.rec=new MediaRecorder(R.stream,opt);}catch(_){try{R.rec=new MediaRecorder(R.stream);}catch(e){showToast(t("zv_rec_unsupported"),"error");close();native();return;}}
    R.rec.ondataavailable=e=>{if(e.data&&e.data.size){R.chunks.push(e.data);R.bytes+=e.data.size;}};
    R.rec.onstop=()=>{
      const keep=R.keep,secs=Math.max(1,Math.round((Date.now()-R.t0)/1000));
      const type=(R.rec&&R.rec.mimeType)||R.mime||"video/webm",chunks=R.chunks;
      clearInterval(R.tick);
      if(!keep||!chunks.length){return;}
      const ext=/mp4/i.test(type)?"mp4":"webm";
      const file=new File(chunks,`video-${Date.now()}-${secs}s.${ext}`,{type:type.split(";")[0]});
      close();
      if(file.size>25*1024*1024){showToast(abTr("mf_too_big",{n:file.name,m:25}),"error");return;}
      mvPickFiles([file]);
    };
    R.t0=Date.now();
    try{R.rec.start(1000);}catch(e){showToast(t("zv_rec_unsupported"),"error");close();native();return;}
    clearInterval(R.tick);R.tick=setInterval(ui,250);ui();
  }
  function stop(){try{if(R.rec&&R.rec.state!=="inactive")R.rec.stop();}catch(_){}}
  async function flip(){
    if(R.busy||(R.rec&&R.rec.state==="recording"))return;
    R.busy=true;ui();R.facing=R.facing==="user"?"environment":"user";
    try{await startStream();}catch(_){R.facing=R.facing==="user"?"environment":"user";try{await startStream();}catch(__){}}
    R.busy=false;ui();
  }
  window.zvRecOpen=async function(){
    if(typeof _currentConvId==="undefined"||!_currentConvId)return;
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==="undefined"){native();return;}
    close();
    R.mime=pickMime();R.facing="environment";
    const ov=document.createElement("div");ov.id="zv-rec";ov.className="zv-rec";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-label",t("zv_film"));
    ov.innerHTML=`<video id="zv-rec-v" playsinline muted autoplay></video>
      <div class="zv-rec-top"><button type="button" class="zv-rec-b" id="zv-rec-x"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        <span class="zv-rec-t" id="zv-rec-t" role="timer">0:00 / ${fmt(MAX_S)}</span><span style="width:46px"></span></div>
      <div class="zv-rec-bot"><div class="zv-rec-h" id="zv-rec-h"></div>
        <div class="zv-rec-row"><span style="width:52px"></span><button type="button" class="zv-rec-go" id="zv-rec-go"><span></span></button>
          <button type="button" class="zv-rec-b" id="zv-rec-sw"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 0 1-13.7 5.7"/><path d="M4 12a8 8 0 0 1 13.7-5.700"/><path d="M17.500 2.500v4h-4"/><path d="M6.500 21.500v-4h4"/></svg></button></div></div>`;
    document.body.appendChild(ov);
    const x=el("zv-rec-x");x.setAttribute("aria-label",t("mm_close"));x.title=t("mm_close");x.addEventListener("click",close);
    const sw=el("zv-rec-sw");sw.setAttribute("aria-label",t("zv_rec_switch"));sw.title=t("zv_rec_switch");sw.addEventListener("click",flip);
    el("zv-rec-go").addEventListener("click",()=>{if(R.rec&&R.rec.state==="recording")stop();else start();});
    ui();
    try{await startStream();ui();}
    catch(e){
      close();
      const denied=e&&(e.name==="NotAllowedError"||e.name==="SecurityError"||e.name==="PermissionDeniedError");
      showToast(t(denied?"zv_rec_perm":"zv_rec_unsupported"),"error");
      if(!denied)native();
    }
  };
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&el("zv-rec"))close();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&el("zv-rec")&&R.rec&&R.rec.state==="recording")stop();});
})();
