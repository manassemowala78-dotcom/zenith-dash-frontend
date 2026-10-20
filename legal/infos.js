window.ZD_LEGAL={
  marque:"Zenith Dash",
  editeur:"Manasse Mowala",
  forme_juridique:"Auto-entrepreneur (personne physique)",
  rnae:"",
  ice:"",
  capital:"",
  rccm:"",
  id_nat:"",
  numero_fiscal:"",
  adresse:"2WVH+7R2, Route principale Fès–Meknès, Fès, Maroc",
  directeur_publication:"Manasse Mowala",
  email:"manassemowala78@gmail.com",
  whatsapp:"+212 774 887 385",
  site:"https://zenithdash.org",
  pays_droit_applicable:"Maroc",
  tribunal:"Fès",
  delai_activation:"2 jours ouvrés",
  delai_remboursement:"14 jours",
  date_mise_a_jour:"20 octobre 2026"
};
(function(){
  var L=window.ZD_LEGAL,labels={editeur:"nom ou raison sociale de l'éditeur",forme_juridique:"forme juridique",rccm:"numéro RCCM ou registre du commerce",numero_fiscal:"numéro fiscal",adresse:"adresse du siège",directeur_publication:"nom du directeur de la publication",email:"adresse e-mail de contact",pays_droit_applicable:"pays dont la loi s'applique",tribunal:"ville du tribunal compétent"};
  function fill(){
    document.querySelectorAll("[data-l]").forEach(function(el){
      var k=el.getAttribute("data-l"),v=(L[k]||"").trim();
      if(v){
        if(el.hasAttribute("data-l-mail")){el.innerHTML="";var a=document.createElement("a");a.href="mailto:"+v;a.textContent=v;el.appendChild(a);}
        else if(el.hasAttribute("data-l-wa")){el.innerHTML="";var w=document.createElement("a");w.href="https://wa.me/"+v.replace(/[^0-9]/g,"");w.target="_blank";w.rel="noopener";w.textContent=v;el.appendChild(w);}
        else if(el.hasAttribute("data-l-link")){el.innerHTML="";var s=document.createElement("a");s.href=v;s.textContent=v.replace(/^https?:\/\//,"");el.appendChild(s);}
        else el.textContent=v;
      }else{
        el.innerHTML="";var m=document.createElement("mark");m.className="todo";m.textContent="[À compléter : "+(labels[k]||k)+"]";el.appendChild(m);
      }
    });
    document.querySelectorAll("[data-l-if]").forEach(function(el){
      var k=el.getAttribute("data-l-if");if(!(L[k]||"").trim())el.style.display="none";
    });
    var y=document.getElementById("legal-year");if(y)y.textContent=new Date().getFullYear();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fill);else fill();
})();
