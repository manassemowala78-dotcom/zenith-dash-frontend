function showEnvRibbon(){
  if(ZD_ENV==="production"||document.getElementById("zd-env-ribbon"))return;
  const r=document.createElement("div");
  r.id="zd-env-ribbon";
  r.textContent=ZD_ENV==="staging"?t("env_staging"):t("env_local");
  r.style.cssText="position:fixed;top:calc(env(safe-area-inset-top,0px) + 2px);left:50%;transform:translateX(-50%);z-index:99999;background:#f59e0b;color:#1a1200;font:700 11px/1 var(--mono);letter-spacing:.08em;padding:4px 10px;border-radius:0 0 8px 8px;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.4)";
  document.body.appendChild(r);
}
document.addEventListener("DOMContentLoaded",showEnvRibbon);
function showToast(msg,type="success"){
  document.querySelector(".toast")?.remove();
  const t=Object.assign(document.createElement("div"),{className:`toast t${type==="error"?"r":type==="info"?"i":"g"}`,textContent:msg});
  document.body.appendChild(t);setTimeout(()=>t.remove(),4500);
}
function showErr(id,msg){const e=document.getElementById(id);if(e){e.textContent=msg;e.style.display=msg?"block":"none";}}
function set(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function setHTML(id,v){const e=document.getElementById(id);if(e)e.innerHTML=v;}

function applyMobileMessagingLayout(){
  const layout=document.getElementById("msg-layout");
  const backBtn=document.querySelector(".msg-back-btn");
  if(!layout)return;
  const isMobile=window.innerWidth<=768;
  const onPage=!!document.querySelector("#page-messaging.active");
  const full=isMobile&&onPage&&layout.classList.contains("mobile-chat-open");
  document.body.classList.toggle("mv-full",full);
  if(!isMobile){
    layout.classList.remove("js-fixed");
    layout.style.top="";layout.style.bottom="";layout.style.height="";
    if(backBtn) backBtn.style.display="none";
    return;
  }
  layout.classList.add("js-fixed");
  if(full){
    const vv=window.visualViewport;
    const top=vv?Math.max(0,vv.offsetTop):0,h=vv?vv.height:window.innerHeight;
    layout.style.top=`${Math.round(top)}px`;layout.style.bottom="auto";layout.style.height=`${Math.round(h)}px`;
    if(window.scrollY)window.scrollTo(0,0);
  }else{
    const topbar=document.querySelector(".topbar");
    const trialBar=document.getElementById("trial-bar");
    let topEdge=topbar&&topbar.offsetParent!==null?topbar.getBoundingClientRect().bottom:0;
    if(trialBar&&trialBar.offsetParent!==null) topEdge=Math.max(topEdge,trialBar.getBoundingClientRect().bottom);
    const bottomNav=document.querySelector(".bottom-nav");
    const bottomOffset=(bottomNav&&getComputedStyle(bottomNav).display!=="none")?(window.innerHeight-bottomNav.getBoundingClientRect().top):0;
    layout.style.top=`${Math.max(0,Math.round(topEdge))}px`;
    layout.style.bottom=`${Math.max(0,Math.round(bottomOffset))}px`;
    layout.style.height="";
  }
  if(backBtn) backBtn.style.display=layout.classList.contains("mobile-chat-open")?"inline-flex":"none";
}
if(window.visualViewport){
  const _vvFix=()=>{if(document.body.classList.contains("mv-full"))applyMobileMessagingLayout();};
  window.visualViewport.addEventListener("resize",_vvFix);
  window.visualViewport.addEventListener("scroll",_vvFix);
}
window.addEventListener("scroll",()=>{if(document.body.classList.contains("mv-full")&&window.scrollY&&!(window.visualViewport&&window.visualViewport.offsetTop))window.scrollTo(0,0);},{passive:true});
window.addEventListener("resize",applyMobileMessagingLayout);
window.addEventListener("orientationchange",()=>setTimeout(applyMobileMessagingLayout,200));
if(window.ResizeObserver){
  const _layoutResizeObserver=new ResizeObserver(()=>applyMobileMessagingLayout());
  const _topbarEl=document.querySelector(".topbar");
  const _trialBarEl=document.getElementById("trial-bar");
  if(_topbarEl) _layoutResizeObserver.observe(_topbarEl);
  if(_trialBarEl) _layoutResizeObserver.observe(_trialBarEl);
}
function navigate(page){
  if(typeof zdPageGuard==="function")page=zdPageGuard(page);
  if(!memberCanOpen(page)){
    if(document.querySelector(".page.active")) showToast(t("role_forbidden_page"),"error");
    page="dashboard";
  }
  if(State.restricted&&!RESTRICTED_ALLOWED_PAGES.includes(page)){
    if(document.querySelector(".page.active")) showToast(t("restricted_toast"),"error");
    page="billing";
  }
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav-i").forEach(n=>n.classList.remove("active"));
  document.querySelectorAll(".bnav-item").forEach(n=>n.classList.remove("active"));
  document.getElementById(`page-${page}`)?.classList.add("active");
  document.querySelector(`[data-p="${page}"]`)?.classList.add("active");
  document.querySelector(`[data-bp="${page}"]`)?.classList.add("active");
  document.querySelector(".main")?.classList.toggle("msg-active",page==="messaging");
  if(page==="messaging"){applyMobileMessagingLayout();setTimeout(applyMobileMessagingLayout,100);setTimeout(applyMobileMessagingLayout,400);}
  toggleQuickActions(false);
  updateFabVisibility(page);
  document.querySelectorAll(".modal-overlay").forEach(m=>{if(m.style.display==="flex"&&!["modal-terms-update","modal-sector-intro","modal-sector-welcome"].includes(m.id))m.style.display="none";});
  loadPage(page);
}
async function loadPage(p){
  switch(p){
    case"dashboard":  loadChecklist();loadDashboardWidgets();loadSectorToday();await loadDashboard();break;
    case"assets":     await loadAssetsPage();break;
    case"creports":   await loadCustomReportsPage();break;
    case"help":       loadHelpPage();break;
    case"import":     loadImportPage();break;
    case"purchases":  await loadPurchasesPage();break;
    case"booking":    await loadBookingPage();break;
    case"accountant": await loadAccountantPage();break;
    case"shop":       await loadShopPage();break;
    case"invoices":   showInvoicesTab(_invoiceTab||"list");break;
    case"clients":    await loadClients();break;
    case"crm":        await loadCRM();break;
    case"quotes":     await loadQuotes();break;
    case"employees":  await loadEmployees();break;
    case"leaves":     await loadLeaves();break;
    case"payroll":    await loadPayroll();break;
    case"attendance": await loadAttendance();break;
    case"claims":     await loadClaims();break;
    case"stock":      await loadWarehouses();showStockTab(_stockTab||"products");break;
    case"pos":        await loadPos();break;
    case"ledger":     await loadLedgerPage();break;
    case"marketing":  await loadMarketing();break;
    case"supply":     await loadSupplyOrders();break;
    case"pricelist":  await loadPriceList();break;
    case"messaging":  await loadConversations();break;
    case"announcements": await loadAnnouncements();break;
    case"expenses":   await loadExpenses();break;
    case"pl":         await loadPL("month");break;
    case"margin":     await loadMarginHistory();break;
    case"reminders":  await loadReminders();break;
    case"billing":    await loadBilling();break;
    case"analytics":  await loadAnalytics();break;
    case"reports":    await loadReport("month");break;
    case"profile":    await loadProfile();renderSectorProfileCard();break;
    case"team":       await loadTeam();break;
    case"files":      await loadFiles();break;
    case"bank":       await loadBankTx();break;
    case"integrations": await loadWebhooks();loadApiKeys();break;
    case"audit":      await loadAudit();break;
    case"objectives": await loadObjectives();break;
    case"projects":   await loadProjects();break;
    case"calendar":   await loadCalendar();break;
    case"notifications": await loadNotifications();break;
    case"ai":         await loadAI();break;
    case"admin":      loadCreatorDashboard();loadPartners();await loadAdminUsers();await loadPendingWires();await loadAdminStats();break;
    default: if(typeof V93_PAGES!=="undefined"&&V93_PAGES[p]){await V93_PAGES[p]();break;} if(typeof loadSectorPage==="function") await loadSectorPage(p);
  }
}

async function loadNotifBadge(){
  try{
    const notifs=await api("GET","/notifications?unread_only=true");
    const badge=document.getElementById("notif-badge");
    if(badge){badge.textContent=notifs.length;badge.style.display=notifs.length>0?"inline":"none";}
  }catch(_){}
}

async function showAppLayout(){
  if(State.tenant?.account_type==="client"&&typeof zdShowClientApp==="function"){await zdShowClientApp();return;}
  if(typeof zdLeaveClientUI==="function")zdLeaveClientUI();
  const cs=document.getElementById("client-space");if(cs)cs.style.display="none";
  await upgradeLegacySession();
  State.restricted=!!State.tenant?.access_blocked&&!State.tenant?.is_creator;
  applyMemberUI();
  document.getElementById("auth-screen").style.display="none";
  document.getElementById("app-screen").style.display="block";
  document.querySelector(".bottom-nav")?.classList.add("show");
  const t=State.tenant;
  if(t){
    const displayName=t.acting_as_member_name||t.name;
    set("topbar-name",t.acting_as_member_name?`${t.acting_as_member_name} · ${t.name}`:t.name);
    setTopbarAvatar(t.avatar_url,displayName);
    setHTML("topbar-plan",planBadge(t.plan));
    if(t.trial) updateExpiryBar(t);
    connectMessagingWS();
    if(t.is_creator){
      const navAdmin=document.getElementById("nav-admin");
      if(navAdmin) navAdmin.style.display="flex";
      const navBilling=document.getElementById("nav-billing");
      if(navBilling) navBilling.style.display="none";
    }
  }
  // Rafraîchir les données depuis le serveur à chaque connexion
  try{
    const fresh=await api("GET","/profile/");
    if(fresh&&fresh.trial){
      State.tenant={...State.tenant,...fresh,trial:fresh.trial,chat_wallpaper:_pendingDefaultWallpaper||fresh.chat_wallpaper};
      localStorage.setItem("zd_tenant",JSON.stringify(State.tenant));
      applyMemberUI();
      setTopbarAvatar(State.tenant.avatar_url,State.tenant.acting_as_member_name||State.tenant.name);
      updateExpiryBar(fresh);
      setHTML("topbar-plan",planBadge(fresh.plan));
      if(fresh.is_creator){
        const navAdmin=document.getElementById("nav-admin");
        if(navAdmin) navAdmin.style.display="flex";
        const navBilling=document.getElementById("nav-billing");
        if(navBilling) navBilling.style.display="none";
      }
    }
  }catch(_){}
  if(State.tenant?.account_type==="client"&&typeof showClientSpace==="function"){showClientSpace();return;}
  State.restricted=!!State.tenant?.access_blocked&&!State.tenant?.is_creator;
  applyRestrictedUI();
  if(typeof resumePendingWallpapers==="function")setTimeout(()=>resumePendingWallpapers(),800);
  const deepLink=consumeDeepLink();
  if(!(await openDeepLink(deepLink.page,deepLink.conv,deepLink.action))) navigate(State.restricted?"billing":"dashboard");
  document.body.classList.add("zd-app-visible");
  document.getElementById("landing").style.display="none";
  renderAccountantBanner();
  if(sessionStorage.getItem("zd_acc_invite"))setTimeout(checkAccountantInvite,600);
  try{checkTermsAcceptance(State.tenant);}catch(_){}
  if(window._zdJustRegistered){window._zdJustRegistered=false;setTimeout(()=>openSectorWelcome(false),900);}
  else if(!State.tenant?.terms_required){if(!checkSectorPrompt())setTimeout(()=>startTour(false),1500);}
  loadCompanies();
  const cc=document.getElementById("companies-card");if(cc)cc.style.display=isTeamMember()?"none":"";
  refreshOfflineBar();flushOutbox();maybeShowInstallBanner();
  loadNotifBadge();
  syncPushSubscription();
  if(typeof zdAfterAppLayout==="function")zdAfterAppLayout();
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard(){
  try{
    const s=await api("GET","/analytics/dashboard");
    set("kpi-revenue",fmtUSD(s.total_revenue_usd));
    set("kpi-pending",fmtUSD(s.pending_revenue));
    set("kpi-pipeline",fmtUSD(s.pipeline_value));
    set("kpi-clients",s.active_clients);
    set("kpi-employees",s.active_employees);
    set("kpi-expenses",fmtUSD(s.expenses_30d));
    set("dash-inv-count",s.invoices_created);
    set("dash-products",s.products);
    set("dash-low-stock",(s.low_stock_alerts||0)+" alertes");
    set("dash-opps",(s.open_opportunities||0)+" ouvertes");
    setHTML("dash-plan",planBadge(s.plan));
    if(s.trial&&State.tenant) updateExpiryBar({...State.tenant,trial:s.trial});
    // Afficher les limites d'usage
    if(s.limits_usage){
      const invUsage=document.getElementById("inv-usage");
      const cliUsage=document.getElementById("cli-usage");
      if(invUsage) invUsage.textContent=s.limits_usage.invoices;
      if(cliUsage) cliUsage.textContent=s.limits_usage.clients;
    }
    const banner=document.getElementById("stock-alert-banner");
    const badge=document.getElementById("stock-alert-badge");
    if(s.low_stock_alerts>0){
      if(banner){banner.style.display="block";banner.innerHTML=`<div class="alert-bar"><i class="ti ti-alert-triangle"></i> ${s.low_stock_alerts} produit(s) en rupture ou sous le seuil minimum — <a href="#" onclick="navigate('stock')" style="color:var(--red)">Voir le stock →</a></div>`;}
      if(badge) badge.style.display="inline";
    }else{
      if(banner){banner.style.display="none";banner.innerHTML="";}
      if(badge) badge.style.display="none";
    }
  }catch(e){
    console.error(e);
    ["kpi-revenue","kpi-pending","kpi-pipeline","kpi-clients","kpi-employees","kpi-expenses"].forEach(id=>set(id,"—"));
    showToast(e.message||"Impossible de charger le tableau de bord","error");
  }
}

// ── FACTURES ─────────────────────────────────────────────────────────────────
async function handleSend(id){
  try{
    const r=await api("POST",`/invoices/${id}/send`);
    showToast(t("toast_sent"));
    loadInvoices();
    const body=document.getElementById("send-invoice-body");
    if(!r.client_name){
      body.innerHTML=`<p style="color:var(--amber)"><i class="ti ti-alert-triangle"></i> ${t("send_no_client_warning")}</p>`;
    }else{
      const link=`${window.location.origin}${window.location.pathname}?portal=${r.portal_token}`;
      body.innerHTML=`
        <p>${t("send_marked_for_prefix")} <b>${esc(r.client_name)}</b></p>
        <p>${t("send_email_label")} ${r.client_email?esc(r.client_email):`<i style="color:var(--muted)">${t("send_no_email_on_file")}</i>`}</p>
        <p style="margin-top:10px">${t("send_portal_link_label")}</p>
        <div style="display:flex;gap:8px;margin-top:4px">
          <input class="inp" readonly value="${link}" style="font-size:11px;flex:1" onclick="this.select()">
          <button class="btn btn-o btn-sm" onclick="navigator.clipboard.writeText('${link}');showToast('${t("toast_link_copied")}')"><i class="ti ti-copy"></i></button>
        </div>`;
    }
    document.getElementById("modal-send-invoice").style.display="flex";
  }catch(e){showToast(e.message,"error");}
}
async function handlePaid(id){try{await api("POST",`/invoices/${id}/paid`);showToast(t("toast_paid"));loadInvoices();}catch(e){showToast(e.message,"error");}}
async function handleDelInv(id){if(!confirm(t("confirm_del_invoice")))return;try{await api("DELETE",`/invoices/${id}`);showToast(t("toast_deleted"));loadInvoices();}catch(e){showToast(e.message,"error");}}
function localDateInput(daysAhead){
  const d=new Date();d.setDate(d.getDate()+daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dateInputToIso(v){
  if(!v)return null;
  const [y,m,d]=v.split("-").map(Number);
  return new Date(Date.UTC(y,m-1,d,23,59,59)).toISOString();
}
["inv-desc","inv-qty","inv-price","inv-tax","inv-disc"].forEach(id=>document.getElementById(id)?.addEventListener("input",computeInvoicePreview));
["quote-qty","quote-price","quote-tax"].forEach(id=>document.getElementById(id)?.addEventListener("input",computeQuotePreview));
function closeInvModal(){document.getElementById("modal-inv").style.display="none";}
// ── CLIENTS ───────────────────────────────────────────────────────────────────
let _clients=[];
async function loadClients(append=false){
  const tbody=document.getElementById("clients-tbody");if(!tbody)return;
  try{
    const st=await fetchListPage("clients","/clients/",append);
    _clients=st.items;
    if(!_clients.length){tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">${st.q?t("list_no_result"):t("no_clients")}</td></tr>`;renderListFooter("clients","clients-more","loadClients");return;}
    tbody.innerHTML=clientRowsHtml(_clients);
    renderListFooter("clients","clients-more","loadClients");
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}
function clientRowsHtml(list){
    return list.map(c=>`<tr>
      <td style="font-weight:600">${esc(c.name)}</td>
      <td style="color:var(--muted)">${esc(c.company)||"—"}</td>
      <td style="font-family:var(--mono);font-size:12px">${esc(c.email)||"—"}</td>
      <td style="font-family:var(--mono);font-size:12px">${esc(c.phone)||"—"}</td>
      <td>${esc(c.country)||"—"}</td>
      <td style="font-family:var(--mono);font-weight:700">${fmtUSD(c.total_invoiced)}${c.balance_due>0?`<div style="font-size:10px;font-weight:400;color:var(--amber)">${t("client_balance_due")} ${fmtUSD(c.balance_due)}</div>`:""}</td>
      <td style="display:flex;gap:5px">
        <button class="btn btn-sm btn-o" onclick="getPortalLink('${c.id}')" title="${t("portal_link_title")}"><i class="ti ti-link"></i></button>
        <button class="btn btn-sm btn-o" onclick="toggleClientReminders('${c.id}',${c.no_auto_reminders?"true":"false"})" title="${t("rem_client_toggle")}" style="${c.no_auto_reminders?"opacity:.45":""}"><i class="ti ${c.no_auto_reminders?"ti-bell-off":"ti-bell"}"></i></button>
        <button class="btn btn-sm btn-r" onclick="handleDelClient('${c.id}')"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`).join("");
}
async function populateClientSelect(id){
  try{_clients=await api("GET","/clients/");}catch(e){return;}
  const sel=document.getElementById(id);if(!sel)return;
  const first=sel.options[0]?.value==""?sel.options[0].outerHTML:"<option value=''>Sans client</option>";
  const clientOptions=_clients.map(c=>`<option value="${c.id}">${esc(c.name)}${c.company?" — "+esc(c.company):""}${c.phone?" · "+esc(c.phone):""}</option>`).join("");
  const createOption=`<option value="__create_new__">+ ${t("create_new_client_option")}</option>`;
  sel.innerHTML=first+clientOptions+createOption;
  sel.onchange=()=>{if(sel.value==="__create_new__"){sel.value="";openClientModal(id);}};
}
let _clientSelectToRefresh=null;
function openClientModal(returnToSelectId){
  _clientSelectToRefresh=returnToSelectId||null;
  document.getElementById("modal-client").style.display="flex";
}
async function handleDelClient(id){if(!confirm(t("confirm_del_client")))return;try{await api("DELETE",`/clients/${id}`);showToast(t("toast_deleted"));loadClients();}catch(e){showToast(e.message,"error");}}
async function getPortalLink(clientId){
  try{
    const r=await api("POST",`/clients/${clientId}/portal-link`);
    const link=`${window.location.origin}${window.location.pathname}?portal=${r.portal_token}`;
    await navigator.clipboard.writeText(link);
    showToast("Lien portail copié ✓ — envoie-le à ton client");
  }catch(e){showToast(e.message,"error");}
}
function closeClientModal(){document.getElementById("modal-client").style.display="none";}
async function submitClient(){
  const name=document.getElementById("cl-name").value;
  if(!name){showToast("Nom obligatoire","error");return;}
  try{
    const r=await api("POST","/clients/",{name,company:document.getElementById("cl-company").value||null,
      email:document.getElementById("cl-email").value||null,phone:document.getElementById("cl-phone").value||null,
      country:document.getElementById("cl-country").value||null,ice:document.getElementById("cl-ice").value||null,
      address:document.getElementById("cl-address").value||null,notes:document.getElementById("cl-notes").value||null});
    showToast("Client ajouté ✓");closeClientModal();loadClients();
    if(_clientSelectToRefresh){
      await populateClientSelect(_clientSelectToRefresh);
      const sel=document.getElementById(_clientSelectToRefresh);
      if(sel&&r.id) sel.value=r.id;
      _clientSelectToRefresh=null;
    }
  }catch(e){showToast(e.message,"error");}
}

// ── CRM ───────────────────────────────────────────────────────────────────────
const STAGES=[{k:"lead",c:"var(--muted)"},{k:"qualified",c:"var(--blue)"},
  {k:"proposal",c:"var(--purple)"},{k:"negotiation",c:"var(--amber)"},
  {k:"won",c:"var(--green)"},{k:"lost",c:"var(--red)"}];
const STAGE_KEY={lead:"st_lead",qualified:"st_qualified",proposal:"st_proposal",negotiation:"st_negotiation",won:"st_won",lost:"st_lost"};

async function loadCRM(){
  const board=document.getElementById("pipeline-board");if(!board)return;
  const features=State.tenant?.limits||{};
  if(!checkFeature(features,'crm')){
    board.innerHTML='';
    showUpgradeBanner(board,'crm');
    return;
  }
  try{
    const opps=await api("GET","/crm/opportunities");
    board.innerHTML=STAGES.map(s=>`
      <div class="pipeline-col">
        <div class="pipeline-col-title" style="color:${s.c}">${t(STAGE_KEY[s.k])}</div>
        <div id="col-${s.k}">
          ${opps.filter(o=>o.stage===s.k).map(o=>`
            <div class="opp-card">
              <div style="font-weight:600;font-size:13px">${esc(o.name)}</div>
              <div style="font-family:var(--mono);font-size:11px;color:var(--green);margin-top:3px">${fmtUSD(o.value)}</div>
              <div style="font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:3px">${o.probability}% ${t("opp_probability_suffix")}</div>
              <div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap">
                ${STAGES.filter(st=>st.k!==s.k).map(st=>`<button class="btn btn-sm btn-o" style="font-size:10px;padding:3px 7px" onclick="moveOpp('${o.id}','${st.k}')">${t(STAGE_KEY[st.k])}</button>`).join("")}
                <button class="btn btn-sm btn-r" style="font-size:10px;padding:3px 7px" onclick="delOpp('${o.id}')"><i class="ti ti-trash"></i></button>
              </div>
            </div>`).join("")||`<div style="color:var(--muted);font-size:12px;padding:8px">${t("opp_none")}</div>`}
        </div>
      </div>`).join("");
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}
async function moveOpp(id,stage){try{await api("PATCH",`/crm/opportunities/${id}/stage?stage=${stage}`);loadCRM();}catch(e){showToast(e.message,"error");}}
async function delOpp(id){if(!confirm(t("confirm_generic")))return;try{await api("DELETE",`/crm/opportunities/${id}`);loadCRM();}catch(e){showToast(e.message,"error");}}
function openOppModal(){populateClientSelect("opp-client");document.getElementById("modal-opp").style.display="flex";}
function closeOppModal(){document.getElementById("modal-opp").style.display="none";}
async function submitOpportunity(){
  const name=document.getElementById("opp-name").value;
  if(!name){showToast("Titre obligatoire","error");return;}
  try{
    const d=document.getElementById("opp-date").value;
    await api("POST","/crm/opportunities",{name,client_id:document.getElementById("opp-client").value||null,
      stage:document.getElementById("opp-stage").value,value:parseFloat(document.getElementById("opp-value").value||0),
      probability:parseInt(document.getElementById("opp-prob").value||20),
      expected_date:d?new Date(d).toISOString():null,notes:document.getElementById("opp-notes").value||null,currency:"USD"});
    showToast("Opportunité créée ✓");closeOppModal();loadCRM();
  }catch(e){showToast(e.message,"error");}
}

// ── DEVIS ─────────────────────────────────────────────────────────────────────
async function loadQuotes(){
  const tbody=document.getElementById("quotes-tbody");if(!tbody)return;
  try{
    const quotes=await api("GET","/crm/quotes");
    if(!quotes?.length){tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("no_quotes")}</td></tr>`;return;}
    tbody.innerHTML=quotes.map(q=>`<tr>
      <td style="font-family:var(--mono);color:var(--purple)">${q.number}</td>
      <td>${fmtDate(q.created_at)}</td><td>${statusBadge(q.status)}</td>
      <td style="font-family:var(--mono);font-weight:700">${fmtUSD(q.total)}</td>
      <td>${fmtDate(q.valid_until)}</td>
      <td style="display:flex;gap:5px">
        <button class="btn btn-sm btn-o" onclick="openQuoteDoc('${q.id}')" title="${t("btn_pdf")}"><i class="ti ti-file-type-pdf"></i></button>
        ${(q.status==="sent"||q.status==="draft")&&q.client_id?`<button class="btn btn-sm btn-o" onclick="sendQuoteForSignature('${q.id}')" title="${t("quote_sign_send")}"><i class="ti ti-signature"></i></button>`:""}
        ${!q.converted_invoice_id&&q.status!=="rejected"?`<button class="btn btn-sm btn-g" onclick="convertQuote('${q.id}')"><i class="ti ti-file-invoice"></i> ${t("btn_convert")}</button>`:""}
        ${q.converted_invoice_id?`<span class="badge bg">✓ ${t("quote_invoiced")}</span>`:""}
        ${q.signed_at?`<button class="btn btn-sm btn-o" onclick="viewQuoteSignature('${q.id}')"><i class="ti ti-signature"></i> ${t("btn_signature")}</button>`:""}
      </td></tr>`).join("");
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}
async function viewQuoteSignature(quoteId){
  try{
    const s=await api("GET",`/crm/quotes/${quoteId}/signature`);
    const win=window.open("","_blank");
    win.document.write(`<body style="font-family:sans-serif;padding:24px;text-align:center">
      <h3>${t("btn_signature")} — ${esc(s.quote_number)}</h3>
      <p>${t("sig_signed_by")} <b>${esc(s.signed_name)}</b> — ${parseServerDate(s.signed_at).toLocaleString()}</p>
      <p style="color:#888;font-size:12px">IP: ${esc(s.signed_ip||"—")}</p>
      ${s.signature_data?`<img src="${s.signature_data}" style="border:1px solid #ccc;max-width:400px;margin-top:16px">`:`<p>${t("sig_no_drawing")}</p>`}
    </body>`);
  }catch(e){showToast(e.message,"error");}
}
async function convertQuote(id){
  try{const r=await api("PATCH",`/crm/quotes/${id}/convert`);showToast(`${t("inv_singular")} ${r.invoice_number} ✓`);loadQuotes();}
  catch(e){showToast(e.message,"error");}
}
let _sectorTemplates=[];
async function openQuoteModal(){
  populateClientSelect("quote-client");
  document.getElementById("quote-extra-lines").innerHTML="";
  document.getElementById("quote-total-preview").innerHTML="";
  fillCurrencySelect("quote-currency","USD");
  loadRates().then(()=>fillCurrencySelect("quote-currency","USD"));
  document.getElementById("quote-sector-suggestions").innerHTML="";
  document.getElementById("quote-sector").value="";
  document.getElementById("quote-ai-desc").value="";
  document.getElementById("quote-ai-result").innerHTML="";
  _aiQuoteItems=[];
  if(!_sectorTemplates.length){
    try{_sectorTemplates=await api("GET","/quotes/sector-templates");}catch(e){}
  }
  document.getElementById("quote-sector").innerHTML=`<option value="">Choisir un secteur pour des suggestions...</option>`+
    _sectorTemplates.map(s=>`<option value="${s.key}">${esc(s.label)}</option>`).join("");
  const catBox=document.getElementById("quote-catalog-suggestions");
  try{
    if(!_priceList.length) _priceList=await api("GET","/price-list/");
    catBox.innerHTML=_priceList.length?_priceList.map(it=>`<button type="button" class="btn btn-sm btn-o" style="font-size:11px" onclick="applySectorSuggestion('${escJs(it.name)}',${it.unit_price})">${esc(it.name)} — ${fmtUSD(it.unit_price)}</button>`).join(""):`<span style="font-size:11px;color:var(--muted)">Aucun article dans ton catalogue — ajoute-en dans "Catalogue de prix".</span>`;
  }catch(e){catBox.innerHTML="";}
  document.getElementById("modal-quote").style.display="flex";
}
async function loadSectorSuggestions(key){
  const box=document.getElementById("quote-sector-suggestions");
  if(!key){box.innerHTML="";return;}
  box.innerHTML=`<span style="font-size:11px;color:var(--muted)">Chargement...</span>`;
  try{
    const t=await api("GET",`/quotes/sector-templates/${key}`);
    box.innerHTML=t.items.map(it=>`<button type="button" class="btn btn-sm btn-o" style="font-size:11px" onclick="applySectorSuggestion('${escJs(it.description)}',${it.unit_price})">${esc(it.description)} — ${fmtUSD(it.unit_price)}</button>`).join("");
  }catch(e){box.innerHTML=`<span style="font-size:11px;color:var(--red)">${esc(e.message)}</span>`;}
}
function applySectorSuggestion(description,price){
  document.getElementById("quote-desc").value=description;
  document.getElementById("quote-price").value=price;
  if(!document.getElementById("quote-qty").value) document.getElementById("quote-qty").value="1";
}
function closeQuoteModal(){document.getElementById("modal-quote").style.display="none";}
function openEstimateModal(){
  document.getElementById("est-desc").value="";
  document.getElementById("est-result").innerHTML="";
  document.getElementById("modal-estimate").style.display="flex";
}
function closeEstimateModal(){document.getElementById("modal-estimate").style.display="none";}
async function submitEstimate(){
  const desc=document.getElementById("est-desc").value.trim();
  if(!desc){showToast("Décris la prestation d'abord","error");return;}
  const btn=document.getElementById("est-btn"),box=document.getElementById("est-result");
  btn.disabled=true;btn.innerHTML=`<i class="ti ti-loader-2"></i> Estimation...`;
  box.innerHTML="";
  try{
    const r=await api("POST","/estimate/ai",{description:desc});
    box.innerHTML=`
      <div style="text-align:center;padding:14px;background:var(--c2);border-radius:10px;border:1px solid var(--b)">
        <div style="font-size:22px;font-weight:800;color:var(--green)">${fmtUSD(r.low_estimate)} — ${fmtUSD(r.high_estimate)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">${esc(r.reasoning)}</div>
      </div>
      ${r.factors.length?`<div style="margin-top:10px">
        <div style="font-size:12px;font-weight:700;margin-bottom:6px">Facteurs qui influencent le prix :</div>
        ${r.factors.map(f=>`<div style="font-size:12px;color:var(--muted);padding:3px 0"><i class="ti ti-point"></i> ${esc(f)}</div>`).join("")}
      </div>`:""}`;
  }catch(e){
    box.innerHTML=`<div style="color:var(--red);font-size:13px">${esc(e.message)}</div>`;
  }finally{
    btn.disabled=false;btn.innerHTML=`<i class="ti ti-sparkles"></i> Estimer`;
  }
}
let _aiQuoteItems=[];
async function generateAiQuote(){
  const desc=document.getElementById("quote-ai-desc").value.trim();
  if(!desc){showToast("Décris le besoin du client d'abord","error");return;}
  const btn=document.getElementById("quote-ai-btn"),box=document.getElementById("quote-ai-result");
  btn.disabled=true;btn.innerHTML=`<i class="ti ti-loader-2"></i> Génération...`;
  box.innerHTML="";
  try{
    const r=await api("POST","/quotes/ai-generate",{description:desc});
    _aiQuoteItems=r.items;
    renderAiQuoteItems();
  }catch(e){
    box.innerHTML=`<div style="color:var(--red);font-size:12px;margin-top:6px">${esc(e.message)}</div>`;
  }finally{
    btn.disabled=false;btn.innerHTML=`<i class="ti ti-sparkles"></i> Générer`;
  }
}
function renderAiQuoteItems(){
  const box=document.getElementById("quote-ai-result");
  if(!_aiQuoteItems.length){box.innerHTML="";return;}
  const total=_aiQuoteItems.reduce((s,it)=>s+it.qty*it.unit_price,0);
  box.innerHTML=`
    <div style="font-size:12px;color:var(--muted);margin-bottom:6px">Lignes proposées — retire celles que tu ne veux pas :</div>
    ${_aiQuoteItems.map((it,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--b);font-size:12px">
      <span>${esc(it.description)} — ${it.qty} × ${fmtUSD(it.unit_price)}</span>
      <button type="button" class="btn btn-sm btn-r" onclick="removeAiItem(${i})"><i class="ti ti-x"></i></button>
    </div>`).join("")}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
      <b style="font-size:13px">Total: ${fmtUSD(total)}</b>
      <button type="button" class="btn btn-g btn-sm" onclick="submitAiQuote()">Créer ce devis</button>
    </div>`;
}
function removeAiItem(i){_aiQuoteItems.splice(i,1);renderAiQuoteItems();}
async function submitAiQuote(){
  if(!_aiQuoteItems.length){showToast("Aucune ligne à créer","error");return;}
  try{
    await api("POST","/crm/quotes",{client_id:document.getElementById("quote-client").value||null,
      items:_aiQuoteItems.map(it=>({description:it.description,qty:it.qty,unit_price:it.unit_price}))});
    showToast("Devis créé ✓");_aiQuoteItems=[];closeQuoteModal();loadQuotes();
  }catch(e){showToast(e.message,"error");}
}
// ── RH ────────────────────────────────────────────────────────────────────────
let _employees=[];
async function loadEmployees(){
  const tbody=document.getElementById("emp-tbody");if(!tbody)return;
  const features=State.tenant?.limits||{};
  if(!checkFeature(features,'hr')){
    const card=tbody.closest('.card');
    if(card) showUpgradeBanner(card.parentElement,'hr');
    tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;color:var(--amber);padding:24px">${t("upgrade_hr_locked")}</td></tr>`;
    return;
  }
  try{
    _employees=await api("GET","/hr/employees");
    if(!_employees?.length){tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">${t("no_employees")}</td></tr>`;return;}
    tbody.innerHTML=_employees.map(e=>`<tr>
      <td style="font-weight:600">${esc(e.name)}</td>
      <td style="color:var(--muted)">${esc(e.position)||"—"}</td>
      <td style="color:var(--muted)">${esc(e.department)||"—"}</td>
      <td><span class="badge badge-gray">${esc(e.contract_type)}</span></td>
      <td style="font-family:var(--mono)">${fmtUSD(e.salary)}<div style="font-size:10px;color:var(--muted);cursor:pointer" onclick="editDependents('${e.id}',${e.dependents||0})" title="${t("fld_dependents")}"><i class="ti ti-users"></i> ${e.dependents||0} ${t("th_dependents").toLowerCase()} ✎</div></td>
      <td style="font-family:var(--mono)">${e.leave_balance}j</td>
      <td>${statusBadge(e.status)}</td>
      <td style="display:flex;gap:5px">${(State.tenant?.is_creator||["trial","business_plus","enterprise"].includes(State.tenant?.plan))?`<button class="btn btn-sm btn-o" onclick="openStaffLink('${e.id}')" title="${t("staff_space")}"><i class="ti ti-id-badge-2"></i></button>`:""}<button class="btn btn-sm btn-r" onclick="delEmployee('${e.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`).join("");
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}
async function delEmployee(id){if(!confirm("Supprimer ?"))return;try{const r=await api("DELETE",`/hr/employees/${id}`);showToast(r.archived?r.message:"Supprimé ✓");loadEmployees();}catch(e){showToast(e.message,"error");}}
function openEmpModal(){document.getElementById("modal-emp").style.display="flex";}
function closeEmpModal(){document.getElementById("modal-emp").style.display="none";}
async function submitEmployee(){
  const name=document.getElementById("emp-name").value;
  if(!name){showToast("Nom obligatoire","error");return;}
  try{
    const d=document.getElementById("emp-hire").value;
    await api("POST","/hr/employees",{name,email:document.getElementById("emp-email").value||null,
      position:document.getElementById("emp-position").value||null,department:document.getElementById("emp-dept").value||null,
      salary:parseFloat(document.getElementById("emp-salary").value||0),contract_type:document.getElementById("emp-contract").value,
      hire_date:d?new Date(d).toISOString():null,leave_balance:parseInt(document.getElementById("emp-leave-bal").value||30),
      notes:document.getElementById("emp-notes").value||null,currency:"USD",dependents:parseInt(document.getElementById("emp-dependents").value||0)});
    showToast("Employé ajouté ✓");closeEmpModal();loadEmployees();
  }catch(e){showToast(e.message,"error");}
}

function populateEmpSelect(id){
  const sel=document.getElementById(id);if(!sel)return;
  sel.innerHTML=_employees.map(e=>`<option value="${e.id}">${esc(e.name)}${e.position?" — "+esc(e.position):""}</option>`).join("");
}

async function loadLeaves(){
  const tbody=document.getElementById("leaves-tbody");if(!tbody)return;
  if(!_employees.length) try{_employees=await api("GET","/hr/employees");}catch(e){}
  try{
    const leaves=await api("GET","/hr/leaves");
    if(!leaves?.length){tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px">${t("no_leave_requests")}</td></tr>`;return;}
    tbody.innerHTML=leaves.map(l=>{
      const emp=_employees.find(e=>e.id===l.employee_id);
      return`<tr>
        <td style="font-weight:600">${esc(emp?.name)||"—"}</td>
        <td>${esc(l.type)}</td><td>${fmtDate(l.start_date)}</td><td>${fmtDate(l.end_date)}</td>
        <td style="font-family:var(--mono)">${l.days}j</td>
        <td style="color:var(--muted)">${esc(l.reason)||"—"}</td>
        <td>${statusBadge(l.status)}</td>
        <td style="display:flex;gap:5px">
          ${l.status==="pending"?`<button class="btn btn-sm btn-g" onclick="handleLeave('${l.id}','approve')">✓</button><button class="btn btn-sm btn-r" onclick="handleLeave('${l.id}','reject')">✗</button>`:""}
        </td></tr>`;}).join("");
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}
async function handleLeave(id,action){
  try{await api("PATCH",`/hr/leaves/${id}/${action}`);showToast(action==="approve"?t("toast_approved"):t("toast_rejected"));loadLeaves();}
  catch(e){showToast(e.message,"error");}
}
function openLeaveModal(){if(!_employees.length){showToast("Chargez d'abord les employés","error");return;}populateEmpSelect("leave-emp-id");document.getElementById("modal-leave").style.display="flex";}
function closeLeaveModal(){document.getElementById("modal-leave").style.display="none";}
function updateLeaveDays(){
  const s=document.getElementById("leave-start").value,e=document.getElementById("leave-end").value;
  if(!s||!e)return;
  const span=Math.round((Date.parse(e+"T00:00:00Z")-Date.parse(s+"T00:00:00Z"))/86400000)+1;
  document.getElementById("leave-days").value=span>0?span:"";
}
async function submitLeave(){
  const s=document.getElementById("leave-start").value,e=document.getElementById("leave-end").value;
  if(!s||!e){showToast(t("leave_dates_required"),"error");return;}
  const daysVal=parseInt(document.getElementById("leave-days").value,10);
  try{
    await api("POST","/hr/leaves",{employee_id:document.getElementById("leave-emp-id").value,
      type:document.getElementById("leave-type").value,
      start_date:`${s}T00:00:00`,
      end_date:`${e}T00:00:00`,
      days:daysVal>0?daysVal:null,
      reason:document.getElementById("leave-reason").value||null});
    showToast("Demande soumise ✓");closeLeaveModal();loadLeaves();
  }catch(e){showToast(e.message,"error");}
}

async function payPayslip(id){try{await api("PATCH",`/hr/payslips/${id}/pay`);showToast(t("toast_paid"));loadPayroll();}catch(e){showToast(e.message,"error");}}
function closePayslipModal(){document.getElementById("modal-payslip").style.display="none";}
// ── STOCK ─────────────────────────────────────────────────────────────────────
let _products=[];
async function loadStock(){
  const tbody=document.getElementById("stock-tbody");if(!tbody)return;
  const features=State.tenant?.limits||{};
  if(!checkFeature(features,'stock')){
    tbody.innerHTML=`<tr><td colspan="9" style="text-align:center;color:var(--amber);padding:24px">${t("upgrade_hr_locked")}</td></tr>`;
    return;
  }
  try{
    _products=await api("GET","/stock/products");
    const alerts=await api("GET","/stock/alerts");
    const section=document.getElementById("stock-alerts-section");
    const badge=document.getElementById("stock-alert-badge");
    if(badge) badge.style.display=alerts?.length?"inline":"none";
    if(section){
      if(alerts?.length){
        section.style.display="block";
        section.innerHTML=`<div class="alert-bar" style="flex-direction:column;align-items:stretch;gap:8px">
          <div><i class="ti ti-alert-triangle"></i> <b>${alerts.length} ${t("stock_below_min")}</b> ${t("stock_below_min_hint")}</div>
          ${alerts.map(a=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
            <span>${esc(a.name)} — ${a.stock_qty} / ${a.stock_min}</span>
            <button class="btn btn-sm btn-g" onclick="openStockMoveModal('${a.id}','in')"><i class="ti ti-plus"></i> ${t("btn_restock")}</button>
          </div>`).join("")}
        </div>`;
      }else{
        section.style.display="none";section.innerHTML="";
      }
    }
    if(!_products?.length){tbody.innerHTML=`<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:24px">${t("no_products")}</td></tr>`;return;}
    tbody.innerHTML=_products.map(p=>`<tr>
      <td style="font-weight:600">${esc(p.name)}</td>
      <td style="font-family:var(--mono);font-size:11px">${esc(p.sku)||"—"}${p.barcode?`<div style="color:var(--muted)"><i class="ti ti-barcode"></i> ${esc(p.barcode)}</div>`:""}</td>
      <td style="color:var(--muted)">${esc(p.category)||"—"}</td>
      <td style="font-family:var(--mono)">${fmtUSD(p.unit_price)}</td>
      <td style="font-family:var(--mono)">${fmtUSD(p.cost_price)}</td>
      <td style="font-family:var(--mono);font-weight:700">${stockCell(p)}</td>
      <td style="font-family:var(--mono)">${p.stock_min} ${esc(p.unit)}</td>
      <td>${p.low_stock?`<span class="badge br">${t("st_low")}</span>`:`<span class="badge bg">${t("st_ok")}</span>`}</td>
      <td><button class="btn btn-sm btn-r" onclick="delProduct('${p.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`).join("");
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}
async function delProduct(id){if(!confirm("Supprimer ?"))return;try{await api("DELETE",`/stock/products/${id}`);showToast("Supprimé ✓");loadStock();}catch(e){showToast(e.message,"error");}}
function closeProductModal(){document.getElementById("modal-product").style.display="none";}
function closeStockMoveModal(){document.getElementById("modal-stock-move").style.display="none";}
// ── DÉPENSES ──────────────────────────────────────────────────────────────────
async function loadExpenses(append=false){
  const tbody=document.getElementById("expenses-tbody");if(!tbody)return;
  try{
    const st=await fetchListPage("expenses","/accounting/expenses",append);
    const exps=st.items;
    if(!exps.length){tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("no_expenses")}</td></tr>`;renderListFooter("expenses","exp-more","loadExpenses");return;}
    tbody.innerHTML=expenseRowsHtml(exps);
    renderListFooter("expenses","exp-more","loadExpenses");
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}
function expenseRowsHtml(exps){
    return exps.map(e=>`<tr>
      <td>${fmtDate(e.date)}</td>
      <td><span class="badge badge-gray">${esc(e.category)}</span></td>
      <td style="color:var(--muted)">${esc(e.description)||"—"}</td>
      <td style="font-family:var(--mono);font-weight:700;color:var(--red)">${fmtUSD(e.amount)}</td>
      <td>${e.tax_deductible?`<span class="badge bg">${t("st_deductible")}</span>`:"—"}</td>
      <td><button class="btn btn-sm btn-r" onclick="delExpense('${e.id}')"><i class="ti ti-trash"></i></button></td>
    </tr>`).join("");
}
async function delExpense(id){if(!confirm(t("confirm_del_generic")))return;try{await api("DELETE",`/accounting/expenses/${id}`);showToast(t("toast_deleted"));loadExpenses();}catch(e){showToast(e.message,"error");}}
function openExpenseModal(){["exp-amount","exp-vat","exp-desc"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});document.getElementById("modal-expense").style.display="flex";loadProjectSelect("exp-project");}
function closeExpenseModal(){document.getElementById("modal-expense").style.display="none";}
async function submitExpense(){
  try{
    const d=document.getElementById("exp-date").value;
    await api("POST","/accounting/expenses",{category:document.getElementById("exp-cat").value,
      amount:parseFloat(document.getElementById("exp-amount").value||0),
      description:document.getElementById("exp-desc").value||null,
      date:d?new Date(d).toISOString():null,
      tax_deductible:document.getElementById("exp-deductible").checked,currency:"USD",vat_amount:parseFloat(document.getElementById("exp-vat").value||0),project_id:document.getElementById("exp-project").value||null});
    showToast("Dépense enregistrée ✓");closeExpenseModal();loadExpenses();
  }catch(e){showToast(e.message,"error");}
}

// ── P&L ──────────────────────────────────────────────────────────────────────
let _plPeriod="month";
async function loadPL(period,btn){
  _plPeriod=period||"month";
  document.querySelectorAll("[data-pp]").forEach(b=>b.classList.toggle("active",b.dataset.pp===_plPeriod));
  showPeriodRange("pl-period-range",_plPeriod);
  try{
    const [pl,tax]=await Promise.all([api("GET",`/accounting/pl?period=${_plPeriod}`),api("GET","/accounting/tax-summary")]);
    set("pl-revenue",fmtUSD(pl.revenue));
    set("pl-expenses",fmtUSD(pl.expenses));
    set("pl-payroll",fmtUSD(pl.payroll));
    const profit=document.getElementById("pl-profit");
    if(profit){profit.textContent=fmtUSD(pl.gross_profit);profit.style.color=pl.gross_profit>=0?"var(--green)":"var(--red)";}
    const margin=document.getElementById("pl-margin");
    if(margin){margin.textContent=pl.margin_pct+"%";margin.style.color=pl.margin_pct>=0?"var(--green)":"var(--red)";}
    set("tax-revenue",fmtUSD(tax.revenue_ytd));
    set("tax-collected",fmtUSD(tax.tax_collected));
    set("tax-deductible",fmtUSD(tax.deductible_expenses));
    set("tax-base",fmtUSD(tax.estimated_tax_base));
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}

// ── MARGE & RENTABILITÉ ──────────────────────────────────────────────────────
async function submitMarginCalc(){
  const name=document.getElementById("margin-name").value.trim();
  const revenue=parseFloat(document.getElementById("margin-revenue").value);
  if(!name||!revenue){showToast(t("fld_name_revenue_required"),"error");return;}
  const box=document.getElementById("margin-result");
  box.innerHTML=`<div style="text-align:center;color:var(--muted);padding:32px 0"><i class="ti ti-loader-2" style="font-size:32px;display:block;margin-bottom:8px"></i>${t("margin_calculating")}</div>`;
  try{
    const r=await api("POST","/margin/calculate",{
      name,revenue,
      material_cost:parseFloat(document.getElementById("margin-material").value||0),
      other_costs:parseFloat(document.getElementById("margin-other").value||0),
      labor_hours:parseFloat(document.getElementById("margin-hours").value||0),
      hourly_rate:parseFloat(document.getElementById("margin-rate").value||0),
      overhead_pct:parseFloat(document.getElementById("margin-overhead").value||15)/100,
      tax_rate:parseFloat(document.getElementById("margin-tax").value||20)/100,
      ask_ai:document.getElementById("margin-ask-ai").checked,
    });
    renderMarginResult(r);
    loadMarginHistory();
  }catch(e){
    box.innerHTML=`<div style="color:var(--red);padding:20px">${esc(e.message)}</div>`;
    showToast(e.message,"error");
  }
}
function renderMarginResult(r){
  const box=document.getElementById("margin-result");
  const color=r.net_margin_pct>20?"var(--green)":r.net_margin_pct>10?"var(--amber)":r.net_margin_pct>0?"var(--purple)":"var(--red)";
  box.innerHTML=`
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:15px;font-weight:700">${esc(r.verdict)}</div>
      <div style="font-size:36px;font-weight:800;color:${color};margin-top:4px">${r.net_margin_pct}%</div>
      <div style="font-family:var(--mono);font-size:11px;color:var(--muted)">${t("net_margin_label")}</div>
    </div>
    <div class="grid2" style="margin-bottom:14px">
      <div class="card2"><div class="kl">${t("card_net_profit")}</div><div style="font-size:18px;font-weight:700;margin-top:4px">${fmtUSD(r.net_profit)}</div></div>
      <div class="card2"><div class="kl">${t("card_gross_margin")}</div><div style="font-size:18px;font-weight:700;margin-top:4px">${r.gross_margin_pct}%</div></div>
      <div class="card2"><div class="kl">${t("card_break_even")}</div><div style="font-size:18px;font-weight:700;margin-top:4px">${fmtUSD(r.break_even)}</div></div>
      <div class="card2"><div class="kl">${t("card_roi")}</div><div style="font-size:18px;font-weight:700;margin-top:4px">${r.roi}%</div></div>
    </div>
    <div style="font-weight:700;font-size:13px;margin-bottom:8px">${t("card_recommendations")}</div>
    ${r.recommendations.map(rec=>`<div style="padding:8px 0;border-bottom:1px solid var(--b);font-size:13px">${esc(rec)}</div>`).join("")}
    ${r.ai_analysis?`<div style="margin-top:14px;padding:12px;background:var(--c2);border-radius:10px;border:1px solid var(--b)"><div style="font-weight:700;font-size:12px;color:var(--purple);margin-bottom:6px"><i class="ti ti-brain"></i> ${t("card_ai_analysis")}</div><div style="font-size:13px;white-space:pre-wrap">${esc(r.ai_analysis)}</div></div>`:""}
  `;
}
async function loadMarginHistory(){
  const box=document.getElementById("margin-history");if(!box)return;
  try{
    const list=await api("GET","/margin/history");
    if(!list.length){box.innerHTML=`<div style="color:var(--muted);font-size:13px">Aucun calcul pour l'instant.</div>`;return;}
    box.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Nom</th><th>CA</th><th>Marge nette</th><th>ROI</th><th>Date</th><th></th></tr></thead><tbody>
      ${list.map(a=>`<tr>
        <td style="font-weight:600">${esc(a.name)}</td>
        <td style="font-family:var(--mono)">${fmtUSD(a.revenue)}</td>
        <td style="font-family:var(--mono);color:${a.net_margin_pct>10?'var(--green)':'var(--amber)'}">${a.net_margin_pct}%</td>
        <td style="font-family:var(--mono)">${a.roi}%</td>
        <td style="font-family:var(--mono);font-size:11px">${fmtDate(a.created_at)}</td>
        <td><button class="btn btn-sm btn-r" onclick="deleteMarginAnalysis('${a.id}')"><i class="ti ti-trash"></i></button></td>
      </tr>`).join("")}
    </tbody></table></div>`;
  }catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;}
}
async function deleteMarginAnalysis(id){
  if(!confirm("Supprimer ce calcul ?"))return;
  try{await api("DELETE",`/margin/${id}`);showToast("Supprimé ✓");loadMarginHistory();}
  catch(e){showToast(e.message,"error");}
}

// ── RELANCES ──────────────────────────────────────────────────────────────────
const URGENCY_COLORS={critical:"var(--red)",high:"var(--amber)",normal:"var(--purple)",upcoming:"var(--muted)"};
const URGENCY_LABELS={critical:"Critique",high:"Élevé",normal:"En retard",upcoming:"À venir"};
async function loadReminders(){
  loadReminderAutomation();
  try{
    const data=await api("GET","/reminders/overdue");
    set("rem-count",data.total_overdue_count);
    set("rem-total",fmtUSD(data.total_amount_due));
    const tbody=document.getElementById("rem-tbody");
    if(!data.invoices.length){tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px">Aucune facture à relancer 🎉</td></tr>`;}
    else{
      tbody.innerHTML=data.invoices.map(i=>`<tr>
        <td style="font-weight:600">${esc(i.number)}</td>
        <td>${esc(i.client_name)||"—"}</td>
        <td style="font-family:var(--mono)">${fmtUSD(i.total)}</td>
        <td style="font-family:var(--mono);font-size:11px">${fmtDate(i.due_date)}</td>
        <td><span class="badge" style="background:${URGENCY_COLORS[i.urgency]}22;color:${URGENCY_COLORS[i.urgency]}">${i.days_overdue>0?i.days_overdue+"j — ":""}${URGENCY_LABELS[i.urgency]}</span></td>
        <td><button class="btn btn-sm btn-g" onclick="openReminderModal('${i.invoice_id}','${escJs(i.client_name||'')}')"><i class="ti ti-send"></i></button></td>
      </tr>`).join("");
    }
    await loadReminderHistory();
  }catch(e){
    document.getElementById("rem-tbody").innerHTML=`<tr><td colspan="6" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;
  }
}
async function loadReminderHistory(){
  const box=document.getElementById("rem-history");
  try{
    const logs=await api("GET","/reminders/logs");
    if(!logs.length){box.innerHTML=`<div style="color:var(--muted);font-size:13px">Aucune relance envoyée pour l'instant.</div>`;return;}
    box.innerHTML=logs.map(l=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--b);font-size:13px">
      <span><b>${esc(l.invoice_number)}</b> · <span style="color:var(--muted)">${esc(l.channel)}</span></span>
      <span style="font-family:var(--mono);font-size:11px;color:var(--muted)">${fmtDate(l.sent_at)}</span>
    </div>`).join("");
  }catch(e){box.innerHTML=`<div style="color:var(--red)">${esc(e.message)}</div>`;}
}
function openReminderModal(invoiceId,clientName){
  const channels=confirm(`Envoyer une relance à ${clientName||"ce client"} ?\n\nOK = Email + WhatsApp\nAnnuler = ne rien envoyer`);
  if(!channels)return;
  sendReminder(invoiceId,["email","whatsapp"]);
}
async function sendReminder(invoiceId,channels){
  try{
    const r=await api("POST","/reminders/send",{invoice_id:invoiceId,channels});
    showToast("Relance enregistrée ✓ ("+r.note+")");
    loadReminders();
  }catch(e){showToast(e.message,"error");}
}

let _subCycle="monthly"; let _lastWire=null;
async function loadBilling(){return abLoadBilling();}
function setSubCycle(cycle){_subCycle=cycle;if(typeof abSetCycle==="function")abSetCycle(cycle);}
async function initSubscribe(plan){try{const r=await api("POST","/billing/subscribe",{plan,billing_cycle:_subCycle});_lastWire=r;showWireModal(r);}catch(e){showToast(e.message,"error");}}
function showWireModal(r){
  const ins=r.instructions; const nw=ins.national_wire; const iw=ins.international_wire;
  setHTML("wire-modal-content",`
    <div style="background:rgba(0,212,200,.06);border:1px solid rgba(0,212,200,.2);border-radius:10px;padding:14px;margin-bottom:16px">
      <div style="font-weight:700;margin-bottom:4px">${esc(ins.plan)} — ${esc(ins.billing_cycle)}</div>
      <div style="font-size:20px;font-weight:800;color:var(--green);margin:6px 0">$${ins.amount_usd.toFixed(2)}</div>
    </div>
    <div style="background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-weight:700;font-size:13px;color:var(--amber)">
      ⚠️ ${t("wire_label_required")} : <span style="font-family:var(--mono);letter-spacing:2px">${esc(ins.reference)}</span>
    </div>
    <div style="font-weight:700;font-size:14px;margin-bottom:10px;color:var(--green)">🇨🇩 ${esc(nw.label)}</div>
    <div class="wire-box" style="margin-bottom:16px">
      <b>${t("beneficiary_label")} :</b> ${esc(nw.beneficiary)}<br><b>${t("account_number_label")} :</b> ${esc(nw.account_number)}<br>
      <b>${t("full_ref_label")} :</b> ${esc(nw.full_account_reference)}<br><b>${t("bank_label")} :</b> ${esc(nw.bank_name)}<br>
      <b>${t("swift_label")} :</b> ${esc(nw.swift_bic)}<br><b>${t("currency_label")} :</b> ${esc(nw.currency)}
    </div>
    <div style="font-weight:700;font-size:14px;margin-bottom:10px;color:var(--cyan)">🌍 ${esc(iw.label)}</div>
    <div class="wire-box">
      <b>${t("beneficiary_label")} :</b> ${esc(iw.beneficiary)}<br><b>${t("address_label")} :</b> ${esc(iw.beneficiary_address)}<br>
      <b>${t("account_number_label")} :</b> ${esc(iw.account_number)}<br><b>${t("swift_label")}/BIC :</b> ${esc(iw.swift_bic)}<br>
      <b>${t("bank_label")} :</b> ${esc(iw.bank_name)}<br><b>${t("correspondent_label")} :</b> ${esc(iw.correspondent_bank)} (${esc(iw.correspondent_bic)})<br>
      <b>${t("currency_label")} :</b> ${esc(iw.currency)}
    </div>
    <div style="margin-top:16px">
      ${r.expires_at?`<div style="font-size:12px;color:var(--muted);margin-bottom:8px"><i class="ti ti-clock"></i> ${esc(t("ab_pending_exp").replace("{d}",fmtDate(r.expires_at)))}</div>`:""}
      ${typeof abProofForm==="function"?abProofForm(ins.reference,"wm"):""}
    </div>`);
  document.getElementById("wire-modal").style.display="flex";
}
function closeWireModal(){document.getElementById("wire-modal").style.display="none";}
function copyWireDetails(){
  if(!_lastWire)return;
  const ins=_lastWire.instructions; const nw=ins.national_wire;
  navigator.clipboard.writeText(`VIREMENT ZENITH DASH\nPlan: ${ins.plan}\nMontant: $${ins.amount_usd}\nRéférence: ${ins.reference}\nBénéficiaire: ${nw.beneficiary}\nCompte: ${nw.account_number}\nSWIFT: ${nw.swift_bic}`)
    .then(()=>showToast("Copié ✓"));
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
async function loadAnalytics(){
  const features=State.tenant?.limits||{};
  if(!checkFeature(features,'analytics')){
    const el=document.getElementById("pred-recs");
    if(el) el.innerHTML=`<div style="padding:20px"><div class="upgrade-banner"><i class="ti ti-lock"></i><div><div style="font-weight:700;color:var(--amber)">${t("ai_analytics_locked")}</div><div style="color:var(--muted);font-size:12px">${t("upgrade_available_from")} <b style="color:var(--text)">Professional</b> — <a href="#" onclick="navigate('billing')" style="color:var(--amber)">${t("upgrade_view_plans")}</a></div></div></div></div>`;
    ['pred-next-month','pred-next-quarter','pred-growth','pred-confidence'].forEach(id=>set(id,'🔒'));
    return;
  }
  try{
    const p=await api("GET","/analytics/predict");
    set("pred-next-month",fmtUSD(p.predicted_revenue_next_month));
    set("pred-next-quarter",fmtUSD(p.predicted_revenue_next_quarter));
    const ge=document.getElementById("pred-growth");
    if(ge){ge.textContent=(p.growth_rate_percent>=0?"+":"")+p.growth_rate_percent+"%";ge.style.color=p.growth_rate_percent>=0?"var(--green)":"var(--red)";}
    set("pred-confidence",Math.round(p.confidence*100)+"%");
    const el=document.getElementById("pred-recs");
    if(el) el.innerHTML=p.recommendations.map(r=>`<li style="padding:6px 0;border-bottom:1px solid var(--b);font-size:13px"><span style="color:var(--purple);margin-right:8px">→</span>${r}</li>`).join("");
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}

// ── RAPPORTS ─────────────────────────────────────────────────────────────────
let _repPeriod="month";
async function loadReport(period,btn){
  _repPeriod=period||"month";
  document.querySelectorAll("[data-rp]").forEach(b=>b.classList.toggle("active",b.dataset.rp===_repPeriod));
  showPeriodRange("rep-period-range",_repPeriod);
  try{
    const r=await api("GET",`/reports/summary?period=${_repPeriod}`);
    set("rep-paid",fmtUSD(r.revenue?.total_paid));
    set("rep-pending",fmtUSD(r.revenue?.pending));
    set("rep-net",fmtUSD(r.revenue?.net));
    set("rep-inv-count",r.invoices?.total||0);
  }catch(e){console.error(e);showToast(e.message||"Erreur de chargement","error");}
}
async function exportCsv(){
  try{
    const r=await fetch(`${API_BASE}/reports/export/csv?period=${_repPeriod}`,{headers:{Authorization:`Bearer ${State.token}`}});
    const csv=await r.text();
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`zenith-${_repPeriod}.csv`; a.click();
    showToast("Export téléchargé ✓");
  }catch(e){showToast(e.message,"error");}
}

// ── ÉQUIPE ────────────────────────────────────────────────────────────────────
let _lastInviteToken=null;
async function loadTeam(){
  loadAccountantAccess();
  try{
    const d=await api("GET","/team/members");
    const pct=d.seats_limit===-1?0:Math.min(100,(d.seats_used/d.seats_limit)*100);
    const color=pct>=90?'var(--red)':pct>=70?'var(--amber)':'var(--green)';
    set("team-seats-label",`${d.seats_used}/${d.seats_limit===-1?'∞':d.seats_limit}`);
    const bar=document.getElementById("team-seats-bar");
    if(bar) bar.innerHTML=`<div class="usage-bar-fill" style="width:${pct}%;background:${color}"></div>`;
    set("team-seats-note",d.seats_limit!==-1&&d.seats_used>=d.seats_limit
      ?t("seats_limit_reached")
      :t("seats_note"));
    const tbody=document.getElementById("team-members-tbody");
    if(tbody){
      if(!d.members.length){tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("no_members_yet")}</td></tr>`;}
      else{tbody.innerHTML=d.members.map(m=>`<tr>
        <td style="font-weight:600">${esc(m.name)}</td>
        <td style="font-family:var(--mono);font-size:12px">${esc(m.email)}</td>
        <td><span class="badge bb">${esc(t("role_"+(m.role||"admin")))}</span>${d.roles_enabled?` <button class="btn btn-o btn-sm" style="padding:2px 8px" data-id="${esc(m.id)}" data-name="${esc(m.name)}" data-role="${esc(m.role||"admin")}" data-perms="${esc(JSON.stringify(m.permissions||[]))}" onclick="openRoleModal(this.dataset.id,this.dataset.name,this.dataset.role,JSON.parse(this.dataset.perms))">${t("btn_change_role")}</button>`:""}</td>
        <td style="font-family:var(--mono);font-size:11px">${fmtDate(m.last_seen_at)}</td>
        <td>${m.is_active?`<span class="badge bg">${t("st_active")}</span>`:`<span class="badge br">${t("st_banned")}</span>`}</td>
        <td><button class="btn btn-sm btn-r" onclick="removeMember('${m.id}','${escJs(m.name)}')"><i class="ti ti-trash"></i></button></td>
      </tr>`).join("");}
    }
    const invBox=document.getElementById("team-invites-list");
    if(invBox){
      if(!d.pending_invites.length){invBox.innerHTML=`<div style="color:var(--muted);font-size:13px">${t("no_pending_invites")}</div>`;}
      else{invBox.innerHTML=d.pending_invites.map(i=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--b)">
        <div><div style="font-size:13px">${esc(i.email)}</div><div style="font-family:var(--mono);font-size:10px;color:var(--muted)">${t("sent_on")} ${fmtDate(i.created_at)}</div></div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-o" onclick="showInviteLink('${i.token}')"><i class="ti ti-link"></i> ${t("btn_link")}</button>
          <button class="btn btn-sm btn-r" onclick="cancelInvite('${i.id}')"><i class="ti ti-x"></i></button>
        </div>
      </div>`).join("");}
    }
  }catch(e){showToast(e.message,"error");}
}
function openInviteModal(){
  const sel=document.getElementById("invite-role");
  const rolesOn=!!State.tenant?.roles_enabled;
  sel.innerHTML=roleOptions("admin",!!State.tenant?.custom_roles_enabled);
  sel.disabled=!rolesOn;
  renderCustomModules("invite-custom-box",[]);
  onInviteRoleChange();
  if(!rolesOn) document.getElementById("invite-role-desc").textContent=t("roles_locked");
  document.getElementById("modal-invite").style.display="flex";
}
function closeInviteModal(){document.getElementById("modal-invite").style.display="none";document.getElementById("invite-email").value="";}
async function submitInvite(){
  const email=document.getElementById("invite-email").value.trim();
  if(!email){showToast("Email obligatoire","error");return;}
  const role=document.getElementById("invite-role").value||"admin";
  const body={email,role};
  if(role==="custom"){body.permissions=selectedCustomModules("invite-custom-box");if(!body.permissions.length){showToast(t("pick_one_section"),"error");return;}}
  try{
    const r=await api("POST","/team/invite",body);
    closeInviteModal();showInviteLink(r.invite_token);loadTeam();
  }catch(e){showToast(e.message,"error");}
}
function buildInviteUrl(token){return `${window.location.origin}${window.location.pathname}?invite=${token}`;}
function showInviteLink(token){
  _lastInviteToken=token;
  const url=buildInviteUrl(token);
  document.getElementById("invite-link-box").textContent=url;
  _shareTexts.invite=`Rejoins mon espace ZenithDash : ${url}`;
  document.getElementById("modal-invite-link").style.display="flex";
}
function closeInviteLinkModal(){document.getElementById("modal-invite-link").style.display="none";}
function copyInviteLink(){
  if(!_lastInviteToken)return;
  navigator.clipboard.writeText(buildInviteUrl(_lastInviteToken)).then(()=>showToast("Lien copié ✓"));
}
async function cancelInvite(id){
  if(!confirm("Annuler cette invitation ?"))return;
  try{await api("DELETE",`/team/invite/${id}`);showToast("Invitation annulée");loadTeam();}
  catch(e){showToast(e.message,"error");}
}
async function removeMember(id,name){
  if(!confirm(`Retirer ${name} de l'équipe ?`))return;
  try{await api("DELETE",`/team/members/${id}`);showToast("Membre retiré ✓");loadTeam();}
  catch(e){showToast(e.message,"error");}
}

// ── FICHIERS ──────────────────────────────────────────────────────────────────
function fmtFileSize(bytes){
  if(bytes<1024) return bytes+" o";
  if(bytes<1024*1024) return (bytes/1024).toFixed(1)+" Ko";
  return (bytes/(1024*1024)).toFixed(1)+" Mo";
}
async function loadFiles(){
  const tbody=document.getElementById("files-tbody");if(!tbody)return;
  try{
    const files=await api("GET","/files/");
    if(!files.length){tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("no_files_yet")}</td></tr>`;return;}
    tbody.innerHTML=files.map(f=>`<tr>
      <td style="font-weight:600"><i class="ti ti-file"></i> ${esc(f.filename)}</td>
      <td style="font-family:var(--mono);font-size:12px">${fmtFileSize(f.size_bytes)}</td>
      <td style="color:var(--muted);font-size:12px">${esc(f.content_type)||"—"}</td>
      <td>${esc(f.uploaded_by)||"—"}</td>
      <td style="font-family:var(--mono);font-size:11px">${fmtDate(f.created_at)}</td>
      <td style="display:flex;gap:5px">
        <button class="btn btn-sm btn-o" onclick="downloadFile('${f.id}')"><i class="ti ti-download"></i></button>
        <button class="btn btn-sm btn-r" onclick="deleteFile('${f.id}','${escJs(f.filename)}')"><i class="ti ti-trash"></i></button>
      </td></tr>`).join("");
  }catch(e){tbody.innerHTML=`<tr><td colspan="6" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
}
async function submitFileUpload(file){
  if(!file) return;
  const maxMb=25;
  if(file.size>maxMb*1024*1024){showToast(`Fichier trop volumineux (max ${maxMb} Mo)`,"error");document.getElementById("file-upload-input").value="";return;}
  const box=document.getElementById("file-upload-progress");
  box.style.display="block";
  box.innerHTML=`<div class="card" style="display:flex;align-items:center;gap:10px"><i class="ti ti-loader-2"></i> Envoi de ${esc(file.name)} en cours...</div>`;
  try{
    const fd=new FormData();
    fd.append("file",file);
    await apiUpload("/files/upload",fd);
    showToast("Fichier envoyé ✓");
    box.style.display="none";
    document.getElementById("file-upload-input").value="";
    loadFiles();
  }catch(e){
    box.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;
    showToast(e.message,"error");
  }
}
async function downloadFile(id){
  try{
    const r=await api("GET",`/files/${id}/download-url`);
    window.open(r.download_url,"_blank");
  }catch(e){showToast(e.message,"error");}
}
async function deleteFile(id,name){
  if(!confirm(`Supprimer ${name} ?`))return;
  try{await api("DELETE",`/files/${id}`);showToast("Fichier supprimé ✓");loadFiles();}
  catch(e){showToast(e.message,"error");}
}

// ── RAPPROCHEMENT BANCAIRE ───────────────────────────────────────────────────
let _bankFilter="";
function filterBankTx(status){
  _bankFilter=status;
  document.querySelectorAll('#bank-filter-tabs button').forEach(b=>{
    b.classList.toggle('btn-g',b.dataset.filter===status);
    b.classList.toggle('btn-o',b.dataset.filter!==status);
  });
  loadBankTx();
}
async function loadBankTx(){
  const tbody=document.getElementById("bank-tbody");if(!tbody)return;
  try{
    const txs=await api("GET",`/bank/transactions${_bankFilter?`?status=${_bankFilter}`:""}`);
    if(!txs.length){tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">${t("no_transactions")}</td></tr>`;return;}
    const statusLabel={unmatched:`<span class="badge badge-gray">${t("st_unmatched")}</span>`,suggested:`<span class="badge bb">${t("st_suggested")}</span>`,confirmed:`<span class="badge bg">${t("st_confirmed")}</span>`};
    tbody.innerHTML=txs.map(t=>`<tr>
      <td style="font-family:var(--mono);font-size:11px">${t.tx_date?fmtDate(t.tx_date):"—"}</td>
      <td style="font-size:13px">${esc(t.description)}</td>
      <td style="font-family:var(--mono);font-weight:600">${fmtUSD(t.amount)}</td>
      <td>${t.matched_invoice_number?`<span style="font-family:var(--mono)">${esc(t.matched_invoice_number)}</span>`:'<span style="color:var(--muted)">—</span>'}</td>
      <td>${statusLabel[t.status]||t.status}</td>
      <td style="display:flex;gap:5px">
        ${t.status==='suggested'?`<button class="btn btn-sm btn-g" onclick="confirmBankTx('${t.id}')"><i class="ti ti-check"></i></button>
        <button class="btn btn-sm btn-o" onclick="unmatchBankTx('${t.id}')"><i class="ti ti-x"></i></button>`:''}
        ${t.status==='unmatched'?`<button class="btn btn-sm btn-o" onclick="showManualMatch('${t.id}','${t.amount}')"><i class="ti ti-link"></i></button>`:''}
        <button class="btn btn-sm btn-r" onclick="deleteBankTx('${t.id}')"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`).join("");
  }catch(e){tbody.innerHTML=`<tr><td colspan="6" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
}
async function submitBankCsv(file){
  if(!file)return;
  const box=document.getElementById("bank-import-result");
  box.style.display="block";
  box.innerHTML=`<div class="card" style="display:flex;align-items:center;gap:10px"><i class="ti ti-loader-2"></i> ${t("importing_file").replace("{f}",esc(file.name))}</div>`;
  try{
    const fd=new FormData();fd.append("file",file);
    const r=await apiUpload("/bank/import-csv",fd);
    box.innerHTML=`<div class="card" style="border-color:rgba(0,224,128,.25);color:var(--green)">✓ ${r.imported} transaction(s) importée(s), dont ${r.auto_suggested} avec une correspondance suggérée automatiquement.${r.skipped_duplicates?` ${r.skipped_duplicates} doublon(s) ignoré(s).`:""}</div>`;
    document.getElementById("bank-csv-input").value="";
    loadBankTx();
  }catch(e){
    box.innerHTML=`<div class="card" style="color:var(--red)">${esc(e.message)}</div>`;
    showToast(e.message,"error");
  }
}
async function confirmBankTx(id){
  if(!confirm("Confirmer ce rapprochement ? La facture sera marquée comme payée."))return;
  try{const r=await api("POST",`/bank/transactions/${id}/confirm`);showToast(`Facture ${r.invoice_number} marquée payée ✓`);loadBankTx();}
  catch(e){showToast(e.message,"error");}
}
async function unmatchBankTx(id){
  try{await api("POST",`/bank/transactions/${id}/unmatch`);showToast("Correspondance retirée");loadBankTx();}
  catch(e){showToast(e.message,"error");}
}
async function deleteBankTx(id){
  if(!confirm("Supprimer cette transaction importée ?"))return;
  try{await api("DELETE",`/bank/transactions/${id}`);showToast("Supprimé ✓");loadBankTx();}
  catch(e){showToast(e.message,"error");}
}
function showManualMatch(txId,amount){
  showToast(`Aucune correspondance automatique pour ${fmtUSD(parseFloat(amount))} — vérifie manuellement dans Factures`);
}

// ── APPROVISIONNEMENT ────────────────────────────────────────────────────────
let _suppliers=[];
function supplyStatusLabel(){return {draft:`<span class="badge badge-gray">${t("st_draft")}</span>`,ordered:`<span class="badge bb">${t("st_ordered")}</span>`,received:`<span class="badge bg">${t("st_received")}</span>`,cancelled:`<span class="badge br">${t("st_cancelled")}</span>`};}
async function loadSupplyOrders(){
  const tbody=document.getElementById("supply-tbody");if(!tbody)return;
  try{
    const [orders,suppliers]=await Promise.all([api("GET","/supply-orders/"),api("GET","/suppliers/")]);
    _suppliers=suppliers;
    const statusLabels=supplyStatusLabel();
    if(!orders.length){tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">${t("no_orders")}</td></tr>`;return;}
    tbody.innerHTML=orders.map(o=>`<tr>
      <td style="font-family:var(--mono);color:var(--purple)">${esc(o.number)}</td>
      <td>${esc(o.supplier_name)||"—"}</td>
      <td style="font-size:12px">${esc(o.items.map(it=>`${it.product_name} ×${it.qty}`).join(", "))}</td>
      <td style="font-family:var(--mono);font-weight:700">${fmtUSD(o.total_cost)}</td>
      <td>${esc(statusLabels[o.status]||o.status)}</td>
      <td style="font-family:var(--mono);font-size:11px">${o.expected_date?fmtDate(o.expected_date):"—"}</td>
      <td style="display:flex;gap:5px">
        ${o.status==='draft'?`<button class="btn btn-sm btn-o" onclick="updateSupplyStatus('${o.id}','ordered')">${t("btn_order_action")}</button>`:''}
        ${o.status==='ordered'?`<button class="btn btn-sm btn-g" onclick="updateSupplyStatus('${o.id}','received')">${t("btn_receive")}</button>`:''}
        ${o.status==='received'?`<button class="btn btn-sm btn-o" onclick="createPurchaseFromOrder('${o.id}')"><i class="ti ti-file-dollar"></i> ${t("btn_supplier_invoice")}</button>`:''}
        ${o.status!=='received'?`<button class="btn btn-sm btn-r" onclick="deleteSupplyOrder('${o.id}')"><i class="ti ti-trash"></i></button>`:''}
      </td>
    </tr>`).join("");
  }catch(e){tbody.innerHTML=`<tr><td colspan="7" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
}
async function deleteSupplyOrder(id){
  if(!confirm("Supprimer cette commande ?"))return;
  try{await api("DELETE",`/supply-orders/${id}`);showToast("Supprimé ✓");loadSupplyOrders();}
  catch(e){showToast(e.message,"error");}
}
function openSupplierModal(){
  ["sup-name","sup-email","sup-phone"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  document.getElementById("modal-supplier").style.display="flex";
}
function closeSupplierModal(){document.getElementById("modal-supplier").style.display="none";}
async function submitSupplier(){
  const name=document.getElementById("sup-name").value.trim();
  if(!name){showToast("Le nom est obligatoire","error");return;}
  try{
    await api("POST","/suppliers/",{name,email:document.getElementById("sup-email").value||null,phone:document.getElementById("sup-phone").value||null});
    showToast("Fournisseur créé ✓");closeSupplierModal();loadSupplyOrders();
  }catch(e){showToast(e.message,"error");}
}
async function openSupplyOrderModal(){
  try{
    const [prods,sups]=await Promise.all([api("GET","/stock/products"),api("GET","/suppliers/")]);
    _products=prods;_suppliers=sups;
  }catch(e){showToast(e.message,"error");}
  document.getElementById("so-supplier").innerHTML=`<option value="">Sans fournisseur</option>`+_suppliers.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");
  document.getElementById("so-product").innerHTML=_products.map(p=>`<option value="${p.id}">${esc(p.name)} (stock: ${p.stock_qty})</option>`).join("");
  document.getElementById("so-qty").value="";document.getElementById("so-cost").value="";document.getElementById("so-date").value="";
  document.getElementById("modal-supply-order").style.display="flex";
}
function closeSupplyOrderModal(){document.getElementById("modal-supply-order").style.display="none";}
async function submitSupplyOrder(){
  const productId=document.getElementById("so-product").value;
  const qty=parseFloat(document.getElementById("so-qty").value);
  const cost=parseFloat(document.getElementById("so-cost").value);
  if(!productId||!qty||!cost){showToast("Produit, quantité et coût sont obligatoires","error");return;}
  try{
    await api("POST","/supply-orders/",{
      supplier_id:document.getElementById("so-supplier").value||null,
      items:[{product_id:productId,qty,unit_cost:cost}],
      expected_date:dateInputToIso(document.getElementById("so-date").value),
    });
    showToast("Commande créée ✓");closeSupplyOrderModal();loadSupplyOrders();
  }catch(e){showToast(e.message,"error");}
}

// ── CATALOGUE DE PRIX ────────────────────────────────────────────────────────
let _priceList=[];
async function loadPriceList(){
  const tbody=document.getElementById("pricelist-tbody");if(!tbody)return;
  try{
    _priceList=await api("GET","/price-list/");
    if(!_priceList.length){tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">Aucun article. Crée ton premier article réutilisable.</td></tr>`;return;}
    tbody.innerHTML=_priceList.map(it=>`<tr>
      <td style="font-weight:600">${esc(it.name)}</td>
      <td style="color:var(--muted);font-size:12px">${esc(it.category)||"—"}</td>
      <td style="font-family:var(--mono);font-weight:700">${fmtUSD(it.unit_price)}</td>
      <td style="font-size:12px">${esc(it.unit)}</td>
      <td style="font-family:var(--mono);font-size:12px">${it.tax_rate}%</td>
      <td style="display:flex;gap:5px">
        <button class="btn btn-sm btn-o" onclick="editPriceItem('${it.id}')"><i class="ti ti-pencil"></i></button>
        <button class="btn btn-sm btn-r" onclick="deletePriceItem('${it.id}')"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`).join("");
  }catch(e){tbody.innerHTML=`<tr><td colspan="6" style="color:var(--red);padding:20px">${esc(e.message)}</td></tr>`;}
}
function openPriceItemModal(){
  document.getElementById("pi-modal-title").textContent=t("modal_price_item_default");
  document.getElementById("pi-edit-id").value="";
  ["pi-name","pi-desc","pi-price","pi-unit","pi-category","pi-tax"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("modal-price-item").style.display="flex";
}
function editPriceItem(id){
  const it=_priceList.find(p=>p.id===id);if(!it)return;
  document.getElementById("pi-modal-title").textContent=t("modal_edit_item");
  document.getElementById("pi-edit-id").value=id;
  document.getElementById("pi-name").value=it.name;
  document.getElementById("pi-desc").value=it.description||"";
  document.getElementById("pi-price").value=it.unit_price;
  document.getElementById("pi-unit").value=it.unit;
  document.getElementById("pi-category").value=it.category||"";
  document.getElementById("pi-tax").value=it.tax_rate;
  document.getElementById("modal-price-item").style.display="flex";
}
function closePriceItemModal(){document.getElementById("modal-price-item").style.display="none";}
async function submitPriceItem(){
  const name=document.getElementById("pi-name").value.trim();
  const price=parseFloat(document.getElementById("pi-price").value);
  if(!name||isNaN(price)){showToast("Nom et prix sont obligatoires","error");return;}
  const payload={name,description:document.getElementById("pi-desc").value||null,unit_price:price,
    unit:document.getElementById("pi-unit").value||"unité",category:document.getElementById("pi-category").value||null,
    tax_rate:parseFloat(document.getElementById("pi-tax").value||0)};
  const editId=document.getElementById("pi-edit-id").value;
  try{
    if(editId) await api("PUT",`/price-list/${editId}`,payload);
    else await api("POST","/price-list/",payload);
    showToast(editId?"Article modifié ✓":"Article créé ✓");closePriceItemModal();loadPriceList();
  }catch(e){showToast(e.message,"error");}
}
async function deletePriceItem(id){
  if(!confirm("Supprimer cet article du catalogue ?"))return;
  try{await api("DELETE",`/price-list/${id}`);showToast("Supprimé ✓");loadPriceList();}
  catch(e){showToast(e.message,"error");}
}

// ── MESSAGERIE ────────────────────────────────────────────────────────────────
let _ws=null,_currentConvId=null,_conversations=[],_typingTimeout=null;
function connectMessagingWS(){
  if(!State.token||_ws) return;
  _ws=new WebSocket(`${WS_BASE}/messaging/ws?token=${State.token}`);
  _ws.onopen=()=>sendWsVisibility();
  _ws.onmessage=(evt)=>{
    const data=JSON.parse(evt.data);
    if(data.type==="message") handleIncomingMessage(data);
    else if(data.type==="typing") showTypingIndicator(data);
    else if(data.type==="read_receipt") handleReadReceipt(data);
    else if(data.type==="message_edited"&&data.conversation_id===_currentConvId) applyMessageEdit(data.id,data.content,data.edited_at);
    else if(data.type==="message_deleted"&&data.conversation_id===_currentConvId) applyMessageDelete(data.id);
    else if((data.type==="message_pinned"||data.type==="message_unpinned")&&data.conversation_id===_currentConvId) loadPinnedBar(_currentConvId);
    else if(data.type==="poll_updated"&&data.conversation_id===_currentConvId) updatePollUI(data.poll_id,data.votes,data.total_votes);
    else if(data.type==="presence") handlePresenceUpdate(data);
    else if(data.type==="delivered_receipt") handleDeliveredReceipt(data);
    else if(data.type==="profile_updated") handleProfileUpdated(data);
  };
  _ws.onclose=()=>{_ws=null;setTimeout(()=>{if(State.token)connectMessagingWS();},3000);};
  _ws.onerror=()=>{};
}
