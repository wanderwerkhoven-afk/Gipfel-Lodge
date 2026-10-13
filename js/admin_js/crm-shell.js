// Dedicated website CRM shell. Rental/finance/admin analytics scripts are not loaded.
function showDashboard() {
  const login = document.getElementById('login-screen');
  const dashboard = document.getElementById('dashboard-screen');
  login.classList.remove('login-visible', 'login-hiding');
  login.style.display = 'none';
  dashboard.style.display = 'block';
  document.body.style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const homeNav = document.getElementById('nav-crm-home');
  switchView(crmRouteView(), homeNav);
}
function switchView(id, nav) {
  const allowed = new Set(['crm-home-view', 'texts-view', 'galleries-view', 'export-view', 'maintenance-view']);
  if (!allowed.has(id)) return;
  if (id === 'maintenance-view' && currentUserRole !== 'superuser') {
    alert('Deze functie is alleen beschikbaar voor de superuser.');
    return;
  }
  document.querySelectorAll('.dashboard-view').forEach(el => el.classList.remove('active'));
  const view = document.getElementById(id);
  if (!view) return;
  view.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  (nav || document.querySelector('.crm-navigation [onclick*=\"'+id+'\"]'))?.classList.add('active');
  const crumb=document.getElementById('crm-page-breadcrumb');
  if(crumb) crumb.hidden=id==='crm-home-view';
  const name=document.getElementById('crm-current-page-label');
  if(name) name.textContent=crmTitles[id]||'Home';
  if(location.hash!=='#/'+crmRoutes[id]) history.pushState(null,'','#/'+crmRoutes[id]);
  const side = document.getElementById('dashboard-sidebar');
  if (side) side.classList.remove('active');
  const overlay = document.getElementById('mobile-sidebar-overlay');
  if (overlay) overlay.classList.remove('active');
  if (id === 'texts-view' && typeof initTextsView === 'function') initTextsView();
  if (id === 'galleries-view' && typeof initGalleriesView === 'function') initGalleriesView();
  if (id === 'maintenance-view') import('./dataviz/pages/maintenancePage.js').then(m=>m.MaintenancePage.init()).catch(console.error);
}
function toggleMobileMenu() {
  document.getElementById('dashboard-sidebar')?.classList.toggle('active');
  document.getElementById('mobile-sidebar-overlay')?.classList.toggle('active');
}
async function testFirebaseConnection() {
  const display = document.getElementById('db-test-result');
  try {
    const {db,doc,getDoc}=await import('../site_js/core/firebase.js');
    await getDoc(doc(db,'settings','translations'));
    if(display){display.style.display='block';display.textContent='Firebase verbinding succesvol.';display.style.color='#4ade80';}
  } catch(e) {
    if(display){display.style.display='block';display.textContent='Firebase verbinding mislukt.';display.style.color='#ff6b6b';}
  }
}

function showToast(title, message, type='success') {
  const container=document.getElementById('eb-toast-container');
  if(!container) return;
  const toast=document.createElement('div');
  toast.style.cssText='pointer-events:auto;background:#fff;border:1px solid #d1d5db;border-radius:10px;padding:14px 18px;box-shadow:0 4px 16px #0002;color:#1e293b;max-width:360px';
  const strong=document.createElement('strong'); strong.textContent=title;
  const p=document.createElement('p');p.textContent=message;p.style.margin='4px 0 0';
  toast.append(strong,p);container.appendChild(toast);
  setTimeout(()=>toast.remove(),4500);
}
async function logActivity(action, details='', bookingId='') {
  if (!window.currentUser) return;
  try {
    const {db,collection,addDoc,serverTimestamp}=await import('../site_js/core/firebase.js');
    await addDoc(collection(db,'audit_logs'),{
      timestamp:serverTimestamp(),userId:window.currentUser.uid,
      userEmail:window.currentUser.email,
      userName:window.currentUserName||window.currentUser.email,
      action,details,bookingId
    });
  } catch(e) { console.warn('CRM audit logging failed',e); }
}
window.showToast=showToast;
window.logActivity=logActivity;

const crmRoutes={'crm-home-view':'home','texts-view':'teksten','galleries-view':'galerijen','export-view':'publicatie','maintenance-view':'status'};
const crmTitles={'crm-home-view':'Home','texts-view':'Teksten & Vertalingen','galleries-view':'Galerijen & Media','export-view':'Publicatie','maintenance-view':'Website Status'};
function crmRouteView(){const name=location.hash.slice(2);return Object.keys(crmRoutes).find(key=>crmRoutes[key]===name)||'crm-home-view';}
window.addEventListener('popstate',()=>{if(window.currentUser) switchView(crmRouteView());});
