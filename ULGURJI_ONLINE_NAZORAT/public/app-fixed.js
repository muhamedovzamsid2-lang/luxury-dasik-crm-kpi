var token = localStorage.getItem('uog_token') || '';
var me = null;
var lastPos = null;

function $(id) { return document.getElementById(id); }

async function api(url, options) {
  options = options || {};
  options.headers = Object.assign({}, options.headers || {}, {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  });
  var r = await fetch(url, options);
  var d = await r.json().catch(function () { return {}; });
  if (!r.ok) throw new Error(d.error || 'API_ERROR');
  return d;
}

function show(id) {
  ['loginScreen', 'employee', 'admin'].forEach(function (x) {
    var el = $(x);
    if (el) el.classList.add('hidden');
  });
  var target = $(id);
  if (target) target.classList.remove('hidden');
}

async function loginApp() {
  var msg = $('loginMsg');
  var btn = $('loginBtn');
  var user = $('loginUser');
  var pass = $('loginPass');
  if (msg) msg.textContent = '';
  if (!user || !pass || !user.value.trim() || !pass.value) {
    if (msg) msg.textContent = 'Логин ва паролни киритинг';
    return;
  }
  if (btn) btn.disabled = true;
  try {
    var r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ login: user.value.trim(), password: pass.value })
    });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok || !d.token) throw new Error(d.error === 'LOGIN_FAILED' ? 'Логин ёки парол хато' : (d.error || 'Киришда хатолик'));
    token = d.token;
    me = d.user;
    localStorage.setItem('uog_token', token);
    await boot();
  } catch (e) {
    if (msg) msg.textContent = e.message || 'Киришда хатолик';
  } finally {
    if (btn) btn.disabled = false;
  }
}

function logout() {
  localStorage.removeItem('uog_token');
  location.reload();
}

async function boot() {
  try {
    me = await api('/api/me');
    if (me.role === 'admin') {
      show('admin');
      loadReport();
      loadAudit();
      loadMetrics();
    } else {
      show('employee');
      if ($('empName')) $('empName').textContent = me.name || '';
      loadToday();
    }
  } catch (e) {
    localStorage.removeItem('uog_token');
    token = '';
    show('loginScreen');
  }
}

async function loadToday() {
  try {
    var d = await api('/api/today');
    var items = d.items || [];
    var q = (($('search') && $('search').value) || '').toLowerCase();
    var filtered = items.filter(function (x) {
      return (String(x.name || '') + ' ' + String(x.district || '') + ' ' + String(x.branch || '')).toLowerCase().indexOf(q) >= 0;
    });
    var visited = items.filter(function (x) { return x.visit_id; }).length;
    if ($('planned')) $('planned').textContent = items.length;
    if ($('visited')) $('visited').textContent = visited;
    if ($('notVisited')) $('notVisited').textContent = items.length - visited;
    if ($('completion')) $('completion').textContent = (items.length ? Math.round(visited / items.length * 100) : 0) + '%';
    if ($('list')) $('list').innerHTML = filtered.map(function (x) {
      return '<div class="consumer"><b>' + esc(x.name) + '</b><div class="muted">' + esc(x.branch) + ' • ' + esc(x.district) + ' • ' + esc(x.category) + '</div></div>';
    }).join('') || '<p>Натижа йўқ</p>';
  } catch (e) {}
}

async function loadReport() {
  try {
    var d = await api('/api/report');
    var rows = d.result || [];
    var p = 0, v = 0, m = 0, s = 0;
    if ($('report')) $('report').innerHTML = '<table><tr><th>Ходим</th><th>Режа</th><th>Ташриф</th><th>Ташрифсиз</th><th>Шубҳали</th><th>%</th></tr>' + rows.map(function (x) {
      p += x.planned; v += x.visited; m += x.not_visited; s += x.suspicious;
      return '<tr><td>' + esc(x.employee) + '</td><td>' + x.planned + '</td><td>' + x.visited + '</td><td>' + x.not_visited + '</td><td>' + x.suspicious + '</td><td>' + x.completion + '%</td></tr>';
    }).join('') + '</table>';
    if ($('aPlanned')) $('aPlanned').textContent = p;
    if ($('aVisited')) $('aVisited').textContent = v;
    if ($('aMissing')) $('aMissing').textContent = m;
    if ($('aSuspicious')) $('aSuspicious').textContent = s;
  } catch (e) {}
}

async function loadAudit() {
  try {
    var d = await api('/api/audit');
    if ($('auditState')) $('auditState').textContent = d.chain_valid ? '✅ Audit chain бутун — ' + (d.rows || []).length + ' та ёзув.' : '🚨 Audit chain бузилган!';
  } catch (e) {}
}

async function loadMetrics() {
  try {
    var d = await api('/api/metrics');
    if ($('dbState')) $('dbState').textContent = 'DB: ' + d.integrity + ' • истеъмолчи ' + d.consumers + ' • ходим ' + d.employees + ' • GPS ' + d.gps_points + ' • ташриф ' + d.visits;
  } catch (e) {}
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>\"']/g, function (m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m];
  });
}

window.loginApp = loginApp;
window.login = loginApp;
window.logout = logout;
window.loadToday = loadToday;
window.loadAudit = loadAudit;

document.addEventListener('DOMContentLoaded', function () {
  var btn = $('loginBtn');
  var form = $('loginForm');
  var pass = $('loginPass');
  if (btn) btn.addEventListener('click', loginApp);
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); loginApp(); });
  if (pass) pass.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); loginApp(); } });
  if (token) boot();
});
