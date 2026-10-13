// Dedicated website CRM shell. Rental/finance/admin analytics scripts are not loaded.
function showDashboard() {
  const login = document.getElementById('login-screen');
  const dashboard = document.getElementById('dashboard-screen');
  login.classList.remove('login-visible', 'login-hiding');
  login.style.display = 'none';
  dashboard.style.display = 'block';
  document.body.style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const textsNav = document.getElementById('nav-texts-desktop');
  if (textsNav) textsNav.classList.add('active');
  switchView('texts-view', textsNav);
}
function switchView(id, nav) {
  const allowed = new Set(['texts-view', 'galleries-view', 'export-view', 'maintenance-view']);
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
  if (nav) nav.classList.add('active');
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
