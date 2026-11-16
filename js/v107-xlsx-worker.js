/* Zenith Dash 10.7.1 — lecture des fichiers Excel dans un « worker » isolé.
   SheetJS 0.18.5 a deux failles connues à la lecture d'un fichier piégé (pollution de prototype, ReDoS) :
   lu ici, un fichier piégé ne peut toucher ni la page, ni la session, ni les données. */
self.onmessage=function(e){
  try{
    importScripts("/js/vendor/xlsx.full.min.js");
    var wb=XLSX.read(e.data,{type:"array",cellDates:false,cellFormula:false,cellHTML:false,cellStyles:false,bookVBA:false,WTF:false});
    var name=wb.SheetNames&&wb.SheetNames[0];
    if(!name){self.postMessage({ok:true,rows:[]});return;}
    var raw=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:""});
    var rows=[],maxRows=20000,maxCols=200;
    for(var i=0;i<raw.length&&i<maxRows;i++){
      var r=raw[i]||[],out=[];
      for(var j=0;j<r.length&&j<maxCols;j++){
        var v=r[j];
        out.push(v===null||v===undefined?"":(typeof v==="number"||typeof v==="boolean")?v:String(v).slice(0,5000));
      }
      rows.push(out);
    }
    self.postMessage({ok:true,rows:rows,cut:raw.length>maxRows});
  }catch(err){self.postMessage({ok:false,error:String(err&&err.message||err).slice(0,300)});}
};
