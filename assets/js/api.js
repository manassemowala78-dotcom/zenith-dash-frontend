const API_BASE = window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"
  ? "http://localhost:8000/v1"
  : "https://zenith-dash-production.up.railway.app/v1";

const State={token:localStorage.getItem("zd_token"),tenant:JSON.parse(localStorage.getItem("zd_tenant")||"null")};

async function api(method,path,body=null){
  const h={"Content-Type":"application/json"};
  if(State.token) h["Authorization"]=`Bearer ${State.token}`;
  try{
    const r=await fetch(API_BASE+path,{method,headers:h,body:body?JSON.stringify(body):null});
    const d=await r.json();
    if(!r.ok){const m=typeof d.detail==="object"?(d.detail.message||d.detail.error):d.detail;throw new Error(m||"Erreur serveur");}
    return d;
  }catch(e){
    if(e.message==="Failed to fetch"||e.name==="TypeError")
      throw new Error("Backend injoignable — lancez uvicorn main:app dans le dossier backend");
    throw e;
  }
}

function fmtUSD(a){return"$"+new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}).format(a||0);}
function fmtDate(iso){if(!iso)return"—";return new Date(iso).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});}

async function login(email,password){
  const r=await api("POST","/auth/login",{email,password});
  State.token=r.access_token; State.tenant=r.tenant;
  localStorage.setItem("zd_token",State.token);
  localStorage.setItem("zd_tenant",JSON.stringify(r.tenant));
  return r;
}
async function register(data){
  const r=await api("POST","/auth/register",data);
  State.token=r.access_token; State.tenant=r.tenant;
  localStorage.setItem("zd_token",State.token);
  localStorage.setItem("zd_tenant",JSON.stringify(r.tenant));
  return r;
}
function logout(){
  State.token=null; State.tenant=null;
  localStorage.removeItem("zd_token"); localStorage.removeItem("zd_tenant");
}

const getMe             = ()=>api("GET","/auth/me");
const getDashboard      = ()=>api("GET","/analytics/dashboard");
const getAIPrediction   = ()=>api("GET","/analytics/predict");
const listInvoices      = (s)=>api("GET","/invoices/"+(s?`?status=${s}`:""));
const createInvoice     = (d)=>api("POST","/invoices/",d);
const sendInvoice       = (id)=>api("POST",`/invoices/${id}/send`);
const markPaid          = (id)=>api("POST",`/invoices/${id}/paid`);
const listClients       = ()=>api("GET","/clients/");
const createClient      = (d)=>api("POST","/clients/",d);
const deleteClient      = (id)=>api("DELETE",`/clients/${id}`);
const getPlans          = ()=>api("GET","/billing/plans");
const subscribeToPlan   = (plan,cycle)=>api("POST","/billing/subscribe",{plan,billing_cycle:cycle});
const getReport         = (p)=>api("GET",`/reports/summary?period=${p}`);
const getProfile        = ()=>api("GET","/profile/");
const updateProfile     = (d)=>api("PATCH","/profile/",d);
const updateBank        = (d)=>api("PATCH","/profile/bank",d);
const changePassword    = (d)=>api("POST","/profile/change-password",d);
const requestRefund     = (id,reason)=>api("POST",`/billing/subscriptions/${id}/refund?reason=${encodeURIComponent(reason||"")}`);

function showToast(msg,type="success"){
  document.querySelector(".toast")?.remove();
  const t=Object.assign(document.createElement("div"),{className:`toast t${type==="error"?"r":type==="info"?"i":"g"}`,textContent:msg});
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),4500);
}
function showErr(id,msg){const e=document.getElementById(id);if(e){e.textContent=msg;e.style.display=msg?"block":"none";}}

function navigate(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav-i").forEach(n=>n.classList.remove("active"));
  document.getElementById(`page-${page}`)?.classList.add("active");
  document.querySelector(`[data-p="${page}"]`)?.classList.add("active");
  loadPage(page);
}
async function loadPage(p){
  switch(p){
    case"dashboard":   await loadDashboard();break;
    case"invoices":    await loadInvoices();break;
    case"clients":     await loadClients();break;
    case"billing":     await loadBilling();break;
    case"analytics":   await loadAnalytics();break;
    case"reports":     await loadReport("month");break;
    case"profile":     await loadProfile();break;
  }
}
function planBadge(plan){const c={sandbox:"badge-gray",starter:"bg",professional:"bb",business:"bp",enterprise:"ba",ultimate:"bgold"};return`<span class="badge ${c[plan]||"bb"}">${plan?.toUpperCase()}</span>`;}
function statusBadge(s){const m={draft:"badge-gray",sent:"bb",paid:"bg",overdue:"br",cancelled:"badge-gray"};return`<span class="badge ${m[s]||"bb"}">${s}</span>`;}

async function showAppLayout(){
  document.getElementById("auth-screen").style.display="none";
  document.getElementById("app-screen").style.display="block";
  const t=State.tenant;
  if(t){
    document.getElementById("topbar-name").textContent=t.name;
    document.getElementById("topbar-av").textContent=t.name?.charAt(0).toUpperCase();
    document.getElementById("topbar-plan").innerHTML=planBadge(t.plan);
  }
  navigate("dashboard");
}
