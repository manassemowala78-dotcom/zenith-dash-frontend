/* Zenith Dash 10.6.5 — l'appli occupe exactement la zone visible, sur n'importe quel téléphone.
   On mesure la vraie zone visible (visualViewport) au lieu de se fier à 100vh/100dvh, qui mentent selon les Android. */
(function(){
  const root=document.documentElement,vv=window.visualViewport;
  function measure(){
    const h=Math.round((vv&&vv.height)||window.innerHeight),w=Math.round((vv&&vv.width)||window.innerWidth);
    const top=Math.round((vv&&vv.offsetTop)||0);
    root.style.setProperty("--zd-h",h+"px");root.style.setProperty("--zd-w",w+"px");root.style.setProperty("--zd-top",top+"px");
  }
  measure();
  ["resize","orientationchange","pageshow","focus"].forEach(e=>window.addEventListener(e,()=>{measure();setTimeout(measure,120);setTimeout(measure,500);}));
  if(vv){vv.addEventListener("resize",measure);vv.addEventListener("scroll",measure);}
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(measure,100);});
  setInterval(measure,2000);
})();
