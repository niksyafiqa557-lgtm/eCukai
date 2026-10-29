/* ---------------- PASSWORD VISIBILITY TOGGLE ---------------- */
const EYE_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.innerHTML = EYE_CLOSED;
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.innerHTML = showing ? EYE_CLOSED : EYE_OPEN;
    btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });
});

/* ---------------- API HELPER ---------------- */
/* These paths use PHP locally and are rewritten to Vercel Functions online. */
async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'},
    ...options,
  });
  let data;
  try { data = await res.json(); }
  catch { throw new Error('Server returned an invalid response. Check the API deployment and server logs.'); }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

let map, markers = {}, activeId = null;
let currentOfficerRole = null;
let currentRecords = [];

function switchAuthTab(which){
  document.getElementById('tab-login').classList.toggle('active', which==='login');
  document.getElementById('tab-register').classList.toggle('active', which==='register');
  document.getElementById('login-form').classList.toggle('active', which==='login');
  document.getElementById('register-form').classList.toggle('active', which==='register');
  document.getElementById('auth-hint').textContent = which==='login'
    ? 'Welcome to E-Cukai system. Please enter your valid staff ID and password to continue.'
    : 'Please enter valid information before creating an account.';
  hideAuthNote();
}
function showAuthNote(msg, type){
  const el = document.getElementById('auth-note');
  el.textContent = msg;
  el.className = 'form-note show ' + type;
}
function hideAuthNote(){
  document.getElementById('auth-note').className = 'form-note';
}

/* ---------------- LOGIN ---------------- */
document.getElementById('login-form').addEventListener('submit', async function(e){
  e.preventDefault();
  const staff_no = document.getElementById('officer-id').value.trim();
  const password = document.getElementById('officer-pw').value;
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Logging in…';
  try {
    const data = await api('login.php', {method:'POST', body: JSON.stringify({staff_no, password})});
    currentOfficerRole = data.officer.role;
    document.getElementById('officer-name-display').textContent =
      data.officer.name + (currentOfficerRole === 'admin' ? ' (Admin)' : '');
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    setTimeout(startDashboard, 50);
  } catch (err) {
    showAuthNote(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Log In';
  }
});

/* ---------------- REGISTER ---------------- */
document.getElementById('register-form').addEventListener('submit', async function(e){
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const staff_no = document.getElementById('reg-staffid').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pw = document.getElementById('reg-pw').value;
  const pw2 = document.getElementById('reg-pw2').value;

  if(pw.length < 8){ showAuthNote('Password must be at least 8 characters.', 'error'); return; }
  if(pw !== pw2){ showAuthNote('Passwords do not match.', 'error'); return; }

  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Creating account…';
  try {
    await api('register.php', {method:'POST', body: JSON.stringify({name, staff_no, email, password: pw})});
    document.getElementById('register-form').reset();
    document.getElementById('officer-id').value = staff_no;
    switchAuthTab('login');
    showAuthNote('Account created for ' + name + '. You can now log in with Staff ID "' + staff_no + '".', 'success');
  } catch (err) {
    showAuthNote(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Create Account';
  }
});

document.getElementById('logout-btn').addEventListener('click', async function(){
  try { await api('logout.php', {method:'POST'}); } catch {}
  document.getElementById('dashboard').classList.remove('active');
  document.getElementById('login-screen').style.display = 'flex';
  map = null; // force re-init next login
  document.getElementById('map').innerHTML = '';
  currentOfficerRole = null;
});

/* ---------------- DASHBOARD STARTUP ---------------- */
async function startDashboard(){
  initMap();
  await loadProperties();   // builds markers + list + area filter
  await loadStats();
  document.getElementById('open-add-modal-btn').style.display =
    currentOfficerRole === 'admin' ? 'inline-block' : 'none';
}

/* ---------------- MAP ---------------- */
// 1. Sign up free at https://account.mapbox.com/auth/signup/
// 2. Copy your "Default public token" from https://account.mapbox.com/access-tokens/
// 3. Paste it below, between the quotes.
const MAPBOX_TOKEN = '';

function initMap(){
  if(map){ map.invalidateSize(); return; }
  map = L.map('map', {zoomControl:true}).setView([5.8317, 102.4064], 14.3);

  // Street Map layer — always available, always current, no API key needed.
  const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  });

  // Satellite layer — Mapbox if a token is set, otherwise Esri as a fallback.
  let satelliteLayer;
  if (MAPBOX_TOKEN) {
    // satellite-streets-v12 = satellite photo + labelled roads/place names on top,
    // same combination MyLOT-style land apps use so the imagery stays readable.
    satelliteLayer = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=' + MAPBOX_TOKEN, {
      maxZoom: 22,
      tileSize: 512,
      zoomOffset: -1,
      attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap contributors'
    });
  } else {
    // Fallback while no token is set yet, so the map still works out of the box.
    satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      maxNativeZoom: 17, // stops "map data not yet available" tiles; upscales instead
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
    });
  }

  // Satellite shown by default, but officers can switch to the always-current street map.
  satelliteLayer.addTo(map);
  L.control.layers(
    { 'Satellite': satelliteLayer, 'Street Map': streetLayer },
    null,
    { position: 'topleft', collapsed: false }
  ).addTo(map);
}


function rebuildMarkers(records){
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};
  records.forEach(p=>{
    const cls = p.status === 'PAID' ? 'paid' : 'unpaid';
    const icon = L.divIcon({
      className:'', html:`<div class="lot-pin ${cls}"></div>`,
      iconSize:[26,26], iconAnchor:[13,26]
    });
    const marker = L.marker([parseFloat(p.latitude), parseFloat(p.longitude)], {icon}).addTo(map);
    marker.on('click', ()=> selectProperty(p.property_id));
    markers[p.property_id] = marker;
  });
}

let areaFilterPopulated = false;
function populateAreaFilter(records){
  if(areaFilterPopulated) return;
  const areas = [...new Set(records.map(p=>p.area))].sort();
  const sel = document.getElementById('area-filter');
  areas.forEach(a=>{
    const opt = document.createElement('option');
    opt.value = a; opt.textContent = a;
    sel.appendChild(opt);
  });
  areaFilterPopulated = true;
}

/* ---------------- LOAD / SEARCH (hits search_property.php) ---------------- */
let searchDebounce;
document.getElementById('search-input').addEventListener('input', ()=>{
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadProperties, 300);
});
document.getElementById('area-filter').addEventListener('change', loadProperties);

async function loadProperties(){
  const q = document.getElementById('search-input').value.trim();
  const area = document.getElementById('area-filter').value;
  const params = new URLSearchParams();
  if(q) params.set('q', q);
  if(area && area !== 'all') params.set('area', area);

  const list = document.getElementById('record-list');
  try {
    const records = await api('api/search_property.php?' + params.toString());
    currentRecords = records;
    populateAreaFilter(records.length ? records : currentRecords);
    rebuildMarkers(records);
    renderList(records);
  } catch (err) {
    list.innerHTML = `<div class="empty-note">Couldn't load records: ${err.message}<br>Check that the API is deployed and the database is configured.</div>`;
  }
}

function renderList(records){
  const list = document.getElementById('record-list');
  list.innerHTML = '';
  if(records.length === 0){
    list.innerHTML = '<div class="empty-note">No property record matches your search.</div>';
    return;
  }
  records.forEach(p=>{
    const row = document.createElement('div');
    row.className = 'record-row' + (p.property_id === activeId ? ' active' : '');
    row.innerHTML = `
      <div class="addr">${p.address}</div>
      <div class="meta">
        <span>Acc. ${p.account_no}</span>
        <span class="badge ${p.status.toLowerCase()}">${p.status}</span>
      </div>`;
    row.addEventListener('click', ()=> selectProperty(p.property_id));
    list.appendChild(row);
  });
}

/* ---------------- SELECT / DETAIL PANEL (hits property_details.php) ---------------- */
async function selectProperty(id){
  activeId = id;
  let p;
  try {
    p = await api('api/property_details.php?property_id=' + id);
  } catch (err) {
    showAuthNote && null; // no-op, panel has its own error path below
    alert("Couldn't load property details: " + err.message);
    return;
  }

  map.flyTo([parseFloat(p.latitude), parseFloat(p.longitude)], 16, {duration:0.6});

  const badge = document.getElementById('dp-status-badge');
  badge.textContent = p.status;
  badge.className = 'status-badge ' + p.status.toLowerCase();

  document.getElementById('dp-addr').textContent = p.address;
  document.getElementById('dp-acc').textContent = 'Account No. ' + p.account_no;
  document.getElementById('dp-area').textContent = p.area;
  document.getElementById('dp-type').textContent = p.property_type;
  document.getElementById('dp-year').textContent = p.year;
  document.getElementById('dp-amount').textContent = 'RM' + parseFloat(p.amount).toFixed(2);

  const paySection = document.getElementById('dp-payment-section');
  const note = document.getElementById('dp-note');
  if(p.status === 'PAID' && p.payment){
    paySection.style.display = 'block';
    document.getElementById('dp-paydate').textContent = p.payment.payment_date;
    document.getElementById('dp-payamount').textContent = 'RM' + parseFloat(p.payment.payment_amount).toFixed(2);
    note.textContent = "This lot's assessment tax has been paid in full for the current year.";
    note.className = 'dp-note ok';
  } else {
    paySection.style.display = 'none';
    note.textContent = "This lot has an outstanding assessment tax balance for the current year. No payment record found.";
    note.className = 'dp-note';
  }

  document.getElementById('detail-panel').classList.add('open');
  renderList(currentRecords);
}

document.getElementById('dp-close').addEventListener('click', ()=>{
  document.getElementById('detail-panel').classList.remove('open');
  activeId = null;
  renderList(currentRecords);
});

/* ---------------- ADD PROPERTY MODAL ---------------- */
function openAddModal(){
  document.getElementById('add-modal-overlay').classList.add('open');
  hideAddModalNote();
}
function closeAddModal(){
  document.getElementById('add-modal-overlay').classList.remove('open');
  document.getElementById('add-property-form').reset();
  document.getElementById('ap-year').value = 2026;
}
function showAddModalNote(msg, type){
  const el = document.getElementById('add-modal-note');
  el.textContent = msg;
  el.className = 'am-note show ' + type;
}
function hideAddModalNote(){
  document.getElementById('add-modal-note').className = 'am-note';
}

document.getElementById('open-add-modal-btn').addEventListener('click', openAddModal);
document.getElementById('add-modal-close').addEventListener('click', closeAddModal);
document.getElementById('add-modal-overlay').addEventListener('click', function(e){
  if (e.target === this) closeAddModal();
});

document.getElementById('add-property-form').addEventListener('submit', async function(e){
  e.preventDefault();
  const payload = {
    account_no: document.getElementById('ap-account').value.trim(),
    address: document.getElementById('ap-address').value.trim(),
    area: document.getElementById('ap-area').value.trim(),
    property_type: document.getElementById('ap-type').value,
    latitude: document.getElementById('ap-lat').value.trim(),
    longitude: document.getElementById('ap-lng').value.trim(),
    year: document.getElementById('ap-year').value,
    amount: document.getElementById('ap-amount').value.trim(),
    status: document.getElementById('ap-status').value,
  };

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await api('api/add_property.php', {method:'POST', body: JSON.stringify(payload)});
    showAddModalNote('Property added successfully.', 'success');
    await loadProperties();
    await loadStats();
    setTimeout(closeAddModal, 700);
  } catch (err) {
    showAddModalNote(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save Property';
  }
});

/* ---------------- STATS (hits dashboard_stats.php) ---------------- */
async function loadStats(){
  try {
    const s = await api('api/dashboard_stats.php?year=2026');
    document.getElementById('stat-total').textContent = s.total ?? 0;
    document.getElementById('stat-paid').textContent = s.paid ?? 0;
    document.getElementById('stat-unpaid').textContent = s.unpaid ?? 0;
    document.getElementById('stat-collected').textContent = 'RM' + Math.round(s.collected ?? 0);
  } catch (err) {
    console.error('Stats failed to load:', err.message);
  }
}
