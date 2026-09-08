import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');
const SECRET = process.env.JWT_SECRET || 'ULGURJI_CHANGE_SECRET';
const GEOFENCE_M = Number(process.env.GEOFENCE_M || 150);
const GPS_MAX_ACCURACY_M = Number(process.env.GPS_MAX_ACCURACY_M || 100);
const GPS_MAX_AGE_MS = Number(process.env.GPS_MAX_AGE_MS || 120000);
const GPS_MAX_JUMP_M = Number(process.env.GPS_MAX_JUMP_M || 200);

const db = new DatabaseSync(DB_PATH);
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY,
 login TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL,
 employee_name TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS consumers(
 id INTEGER PRIMARY KEY,
 name TEXT,
 branch TEXT,
 district TEXT,
 mahalla TEXT,
 street TEXT,
 category TEXT,
 activity TEXT,
 phone TEXT,
 lat REAL,
 lon REAL,
 location_accuracy REAL,
 location_set_server TEXT,
 active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS assignments(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 employee_id INTEGER NOT NULL,
 consumer_id INTEGER NOT NULL,
 work_date TEXT NOT NULL,
 UNIQUE(employee_id,consumer_id,work_date)
);
CREATE TABLE IF NOT EXISTS visits(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 employee_id INTEGER NOT NULL,
 consumer_id INTEGER NOT NULL,
 started_server TEXT NOT NULL,
 ended_server TEXT,
 start_lat REAL,
 start_lon REAL,
 start_accuracy REAL,
 end_lat REAL,
 end_lon REAL,
 end_accuracy REAL,
 distance_m REAL,
 status TEXT NOT NULL,
 client_event_id TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS gps_points(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 employee_id INTEGER NOT NULL,
 ts_server TEXT NOT NULL,
 lat REAL NOT NULL,
 lon REAL NOT NULL,
 accuracy REAL,
 speed REAL,
 client_event_id TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS audit(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 ts_server TEXT NOT NULL,
 actor_id INTEGER,
 action TEXT NOT NULL,
 payload TEXT NOT NULL,
 prev_hash TEXT,
 hash TEXT NOT NULL
);
`);

for (const sql of [
  'ALTER TABLE users ADD COLUMN region TEXT',
  'ALTER TABLE users ADD COLUMN district TEXT',
  'ALTER TABLE users ADD COLUMN position TEXT',
  'ALTER TABLE users ADD COLUMN phone TEXT',
  'ALTER TABLE consumers ADD COLUMN region TEXT'
]) {
  try { db.exec(sql); } catch (e) {
    if (!String(e.message).toLowerCase().includes('duplicate column name')) throw e;
  }
}

const q = (sql) => db.prepare(sql);
const now = () => new Date().toISOString();
const sha = (s) => crypto.createHash('sha256').update(String(s ?? '')).digest('hex');
const ph = (p) => sha(String(p ?? ''));
const b64 = (s) => Buffer.from(s).toString('base64url');
const ub = (s) => Buffer.from(s, 'base64url').toString();
const dateOk = (x) => /^\d{4}-\d{2}-\d{2}$/.test(String(x || ''));
const monthOk = (x) => /^\d{4}-\d{2}$/.test(String(x || ''));
const coord = (lat, lon) => Number.isFinite(+lat) && Number.isFinite(+lon) && +lat >= -90 && +lat <= 90 && +lon >= -180 && +lon <= 180;
const norm = (s) => String(s ?? '').trim().toLowerCase()
  .replace(/[ʻ’‘`']/g, "'").replace(/[–—-]/g, ' ').replace(/\s+/g, ' ');
const regionNorm = (s) => {
  const x = norm(s);
  const m = {
    'ққр': 'қорақалпоғистон республикаси',
    'анд': 'андижон вилояти',
    'бух': 'бухоро вилояти',
    'жиз': 'жиззах вилояти',
    'қаш': 'қашқадарё вилояти',
    'нав': 'навоий вилояти',
    'нам': 'наманган вилояти',
    'сам': 'самарқанд вилояти',
    'сур': 'сурхондарё вилояти',
    'сир': 'сирдарё вилояти',
    'тош': 'тошкент вилояти',
    'фар': 'фарғона вилояти',
    'хор': 'хоразм вилояти',
    'пой': 'тошкент шаҳри'
  };
  return m[x] || x.replace(/\s+республикаси$/, ' республикаси');
};
const sameRegion = (employeeRegion, consumerRegion) => {
  if (!employeeRegion || !consumerRegion) return false;
  return regionNorm(employeeRegion) === regionNorm(consumerRegion);
};
const sameDistrict = (a, b) => !!a && !!b && norm(a) === norm(b);

function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000, r = Math.PI / 180;
  const p1 = +lat1 * r, p2 = +lat2 * r;
  const dp = (+lat2 - +lat1) * r, dl = (+lon2 - +lon1) * r;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, x)));
}

function signJwt(payload) {
  const h = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 43200 }));
  const sig = b64(crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest());
  return h + '.' + p + '.' + sig;
}
function verifyJwt(token) {
  const a = String(token || '').split('.');
  if (a.length !== 3) throw Error('AUTH_INVALID');
  const expected = b64(crypto.createHmac('sha256', SECRET).update(a[0] + '.' + a[1]).digest());
  if (expected.length !== a[2].length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(a[2]))) throw Error('AUTH_INVALID');
  const p = JSON.parse(ub(a[1]));
  if (!p.exp || p.exp < Date.now() / 1000) throw Error('AUTH_INVALID');
  return p;
}

function send(res, code, data, type = 'application/json') {
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type'
  });
  res.end(type.includes('json') ? JSON.stringify(data) : data);
}
function auth(req, res, adminOnly = false) {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) throw Error('AUTH_INVALID');
    const u = verifyJwt(h.slice(7));
    if (adminOnly && u.role !== 'admin') throw Error('ADMIN_ONLY');
    return u;
  } catch (e) {
    send(res, e.message === 'ADMIN_ONLY' ? 403 : 401, { error: e.message === 'ADMIN_ONLY' ? 'ADMIN_ONLY' : 'AUTH_INVALID' });
    return null;
  }
}
async function body(req) {
  return await new Promise((resolve, reject) => {
    let text = '';
    req.on('data', (chunk) => {
      text += chunk;
      if (text.length > 2e6) reject(Error('BODY_TOO_LARGE'));
    });
    req.on('end', () => {
      try { resolve(text ? JSON.parse(text) : {}); } catch { reject(Error('BAD_JSON')); }
    });
    req.on('error', reject);
  });
}
function audit(actorId, action, payload) {
  const prev = q('SELECT hash FROM audit ORDER BY id DESC LIMIT 1').get()?.hash || 'GENESIS';
  const ts = now();
  const payloadText = JSON.stringify(payload ?? {});
  const hash = sha([prev, ts, actorId || '', action, payloadText].join('|'));
  q('INSERT INTO audit(ts_server,actor_id,action,payload,prev_hash,hash) VALUES(?,?,?,?,?,?)')
    .run(ts, actorId || null, action, payloadText, prev, hash);
}
function employee(id) {
  return q("SELECT id,login,employee_name,role,active,region,district,position,phone FROM users WHERE id=? AND role='employee' AND active=1").get(id);
}
function consumer(id) {
  return q('SELECT * FROM consumers WHERE id=? AND active=1').get(id);
}
function territoryAllowed(e, c) {
  const er = e?.region || '';
  const cr = c?.region || c?.branch || '';
  const ed = e?.district || '';
  const cd = c?.district || '';
  if (!er || !cr || !sameRegion(er, cr)) return false;
  if (ed && cd && !sameDistrict(ed, cd)) return false;
  return true;
}
function recentGps(employeeId, lat, lon) {
  const g = q('SELECT * FROM gps_points WHERE employee_id=? ORDER BY id DESC LIMIT 1').get(employeeId);
  if (!g) return { ok: false, error: 'GPS_TRACK_REQUIRED' };
  const age = Date.now() - Date.parse(g.ts_server);
  if (!Number.isFinite(age) || age > GPS_MAX_AGE_MS) return { ok: false, error: 'GPS_TRACK_OLD' };
  if (g.accuracy != null && Number(g.accuracy) > GPS_MAX_ACCURACY_M) return { ok: false, error: 'GPS_ACCURACY_TOO_LOW', accuracy: g.accuracy };
  const jump = distanceM(lat, lon, g.lat, g.lon);
  if (jump > GPS_MAX_JUMP_M) return { ok: false, error: 'GPS_MISMATCH', distance_m: jump };
  return { ok: true };
}

q("INSERT OR IGNORE INTO users(id,login,password_hash,role,employee_name) VALUES(1,'admin',?,'admin','Раҳбар')")
  .run(ph(process.env.ADMIN_PASSWORD || 'Ulgurji2026Admin'));
try { await import('./import-employees.js'); } catch (e) { console.error('EMPLOYEE_IMPORT_ERROR', e); }

async function api(req, res, url) {
  try {
    if (req.method === 'GET' && url === '/api/health') {
      return send(res, 200, { ok: true, time: now(), db: 'sqlite', db_path: DB_PATH, geofence_m: GEOFENCE_M });
    }
    if (req.method === 'POST' && url === '/api/login') {
      const b = await body(req);
      const login = String(b.login || '').trim();
      const u = q('SELECT * FROM users WHERE login=? AND active=1').get(login);
      if (!u || ph(b.password) !== u.password_hash) return send(res, 401, { error: 'LOGIN_FAILED' });
      const user = { id: u.id, role: u.role, name: u.employee_name, region: u.region || '', district: u.district || '', position: u.position || '', phone: u.phone || '' };
      const token = signJwt(user);
      audit(u.id, 'LOGIN', { login });
      return send(res, 200, { token, user });
    }
    if (req.method === 'GET' && url === '/api/me') {
      const u = auth(req, res); if (!u) return;
      const r = q('SELECT id,login,role,employee_name,region,district,position,phone,active FROM users WHERE id=?').get(u.id);
      if (!r || !r.active) return send(res, 401, { error: 'AUTH_INVALID' });
      return send(res, 200, { id: r.id, login: r.login, role: r.role, name: r.employee_name, region: r.region || '', district: r.district || '', position: r.position || '', phone: r.phone || '' });
    }
    if (req.method === 'GET' && url === '/api/metrics') {
      const u = auth(req, res, true); if (!u) return;
      const consumers = q('SELECT COUNT(*) n FROM consumers WHERE active=1').get().n;
      const located = q('SELECT COUNT(*) n FROM consumers WHERE active=1 AND lat IS NOT NULL AND lon IS NOT NULL').get().n;
      const employees = q("SELECT COUNT(*) n FROM users WHERE role='employee' AND active=1").get().n;
      const assignments = q('SELECT COUNT(*) n FROM assignments').get().n;
      const visits = q('SELECT COUNT(*) n FROM visits').get().n;
      const gps_points = q('SELECT COUNT(*) n FROM gps_points').get().n;
      const auditCount = q('SELECT COUNT(*) n FROM audit').get().n;
      return send(res, 200, { consumers, located, unlocated: consumers - located, employees, assignments, visits, gps_points, audit: auditCount, integrity: q('PRAGMA integrity_check').get().integrity_check, geofence_m: GEOFENCE_M });
    }
    if (req.method === 'GET' && url === '/api/employees') {
      const u = auth(req, res, true); if (!u) return;
      return send(res, 200, q("SELECT id,employee_name,login,active,region,district,position,phone FROM users WHERE role='employee' AND active=1 ORDER BY region,district,employee_name").all());
    }
    if (req.method === 'GET' && url.startsWith('/api/consumers/')) {
      const u = auth(req, res); if (!u) return;
      const id = Number(url.split('/').pop());
      const c = consumer(id);
      if (!c) return send(res, 404, { error: 'CONSUMER_NOT_FOUND' });
      return send(res, 200, c);
    }
    if (req.method === 'GET' && url === '/api/consumers') {
      const u = auth(req, res); if (!u) return;
      const p = new URL(req.url, 'http://local').searchParams;
      const term = String(p.get('q') || '').trim();
      const page = Math.max(1, Number(p.get('page') || 1));
      const limit = Math.min(500, Math.max(1, Number(p.get('limit') || 100)));
      const offset = (page - 1) * limit;
      let where = 'active=1', args = [];
      if (term) {
        where += ' AND (name LIKE ? OR district LIKE ? OR branch LIKE ? OR region LIKE ? OR mahalla LIKE ? OR street LIKE ? OR phone LIKE ?)';
        args = Array(7).fill('%' + term + '%');
      }
      const total = q(`SELECT COUNT(*) n FROM consumers WHERE ${where}`).get(...args).n;
      const items = q(`SELECT * FROM consumers WHERE ${where} ORDER BY branch,district,name LIMIT ? OFFSET ?`).all(...args, limit, offset);
      return send(res, 200, { items, page, limit, total, has_more: offset + items.length < total });
    }
    if (req.method === 'GET' && url === '/api/consumer-visits') {
      const u = auth(req, res, true); if (!u) return;
      const p = new URL(req.url, 'http://local').searchParams;
      const cid = Number(p.get('consumer_id'));
      if (!cid) return send(res, 400, { error: 'CONSUMER_REQUIRED' });
      const rows = q(`SELECT v.id visit_id,v.consumer_id,v.employee_id,u.employee_name,u.region,u.district,u.position,
        v.started_server,v.ended_server,v.start_lat,v.start_lon,v.end_lat,v.end_lon,v.start_accuracy,v.end_accuracy,v.distance_m,v.status
        FROM visits v JOIN users u ON u.id=v.employee_id WHERE v.consumer_id=? ORDER BY v.started_server DESC LIMIT 500`).all(cid);
      return send(res, 200, { consumer_id: cid, visits: rows });
    }
    if (req.method === 'POST' && url === '/api/consumers/location') {
      const u = auth(req, res, true); if (!u) return;
      const b = await body(req), c = consumer(b.consumer_id);
      if (!c || !coord(b.lat, b.lon)) return send(res, 400, { error: 'LOCATION_INVALID' });
      const ts = now();
      q('UPDATE consumers SET lat=?,lon=?,location_accuracy=?,location_set_server=?,region=COALESCE(region,branch) WHERE id=?')
        .run(+b.lat, +b.lon, b.accuracy ?? null, ts, c.id);
      audit(u.id, 'CONSUMER_LOCATION', b);
      return send(res, 200, { ok: true, server_time: ts });
    }
    if (req.method === 'POST' && url === '/api/assign') {
      const u = auth(req, res, true); if (!u) return;
      const b = await body(req);
      if (!dateOk(b.work_date)) return send(res, 400, { error: 'ASSIGNMENT_INVALID' });
      const e = employee(b.employee_id), c = consumer(b.consumer_id);
      if (!e || !c) return send(res, 404, { error: 'EMPLOYEE_OR_CONSUMER_NOT_FOUND' });
      if (!territoryAllowed(e, c)) return send(res, 403, { error: 'TERRITORY_MISMATCH', employee_region: e.region || '', employee_district: e.district || '', consumer_region: c.region || c.branch || '', consumer_district: c.district || '' });
      q('INSERT OR IGNORE INTO assignments(employee_id,consumer_id,work_date) VALUES(?,?,?)').run(b.employee_id, b.consumer_id, b.work_date);
      audit(u.id, 'ASSIGN', b);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && url === '/api/assignments') {
      const u = auth(req, res, true); if (!u) return;
      const p = new URL(req.url, 'http://local').searchParams;
      const d = dateOk(p.get('date')) ? p.get('date') : now().slice(0, 10);
      const eid = Number(p.get('employee_id') || 0);
      let sql = `SELECT a.id,a.employee_id,a.consumer_id,a.work_date,u.employee_name,u.region employee_region,u.district employee_district,c.name consumer_name,c.region consumer_region,c.branch,c.district consumer_district,c.mahalla FROM assignments a JOIN users u ON u.id=a.employee_id JOIN consumers c ON c.id=a.consumer_id WHERE a.work_date=?`;
      const args = [d];
      if (eid) { sql += ' AND a.employee_id=?'; args.push(eid); }
      return send(res, 200, { date: d, items: q(sql + ' ORDER BY u.region,u.district,u.employee_name,c.name').all(...args) });
    }
    if (req.method === 'GET' && url === '/api/today') {
      const u = auth(req, res); if (!u) return;
      const p = new URL(req.url, 'http://local').searchParams;
      const d = dateOk(p.get('date')) ? p.get('date') : now().slice(0, 10);
      const eid = u.role === 'admin' ? Number(p.get('employee_id') || 0) : u.id;
      if (!eid) return send(res, 400, { error: 'EMPLOYEE_REQUIRED' });
      const rows = q(`SELECT c.*,a.id assignment_id,
        (SELECT vv.id FROM visits vv WHERE vv.consumer_id=a.consumer_id AND vv.employee_id=a.employee_id AND vv.started_server LIKE ? ORDER BY vv.id DESC LIMIT 1) visit_id,
        (SELECT vv.status FROM visits vv WHERE vv.consumer_id=a.consumer_id AND vv.employee_id=a.employee_id AND vv.started_server LIKE ? ORDER BY vv.id DESC LIMIT 1) visit_status,
        (SELECT vv.started_server FROM visits vv WHERE vv.consumer_id=a.consumer_id AND vv.employee_id=a.employee_id AND vv.started_server LIKE ? ORDER BY vv.id DESC LIMIT 1) started_server,
        (SELECT vv.ended_server FROM visits vv WHERE vv.consumer_id=a.consumer_id AND vv.employee_id=a.employee_id AND vv.started_server LIKE ? ORDER BY vv.id DESC LIMIT 1) ended_server,
        (SELECT vv.distance_m FROM visits vv WHERE vv.consumer_id=a.consumer_id AND vv.employee_id=a.employee_id AND vv.started_server LIKE ? ORDER BY vv.id DESC LIMIT 1) distance_m
        FROM assignments a JOIN consumers c ON c.id=a.consumer_id WHERE a.employee_id=? AND a.work_date=? ORDER BY c.name`).all(`${d}%`,`${d}%`,`${d}%`,`${d}%`,`${d}%`,eid,d);
      return send(res, 200, { date: d, employee_id: eid, items: rows });
    }
    if (req.method === 'POST' && url === '/api/gps') {
      const u = auth(req, res); if (!u) return;
      const b = await body(req);
      if (!coord(b.lat, b.lon) || !b.client_event_id) return send(res, 400, { error: 'GPS_INVALID' });
      if (b.accuracy != null && Number(b.accuracy) > GPS_MAX_ACCURACY_M) return send(res, 400, { error: 'GPS_ACCURACY_TOO_LOW' });
      const eventId = String(b.client_event_id);
      const old = q('SELECT id,ts_server FROM gps_points WHERE client_event_id=?').get(eventId);
      if (old) return send(res, 409, { error: 'GPS_EVENT_ALREADY_EXISTS', gps_point_id: old.id, server_time: old.ts_server });
      const last = q('SELECT lat,lon,ts_server FROM gps_points WHERE employee_id=? ORDER BY id DESC LIMIT 1').get(u.id);
      if (last && Date.now() - Date.parse(last.ts_server) < 60000 && distanceM(b.lat, b.lon, last.lat, last.lon) > GPS_MAX_JUMP_M) return send(res, 400, { error: 'GPS_JUMP_TOO_LARGE' });
      const ts = now();
      q('INSERT INTO gps_points(employee_id,ts_server,lat,lon,accuracy,speed,client_event_id) VALUES(?,?,?,?,?,?,?)').run(u.id,ts,+b.lat,+b.lon,b.accuracy??null,b.speed??null,eventId);
      audit(u.id, 'GPS', b);
      return send(res, 200, { ok: true, server_time: ts });
    }
    if (req.method === 'POST' && url === '/api/visit/start') {
      const u = auth(req, res); if (!u) return;
      const b = await body(req), c = consumer(b.consumer_id), e = employee(u.id);
      if (!c) return send(res, 404, { error: 'CONSUMER_NOT_FOUND' });
      if (!coord(b.lat, b.lon) || !b.client_event_id) return send(res, 400, { error: 'LOCATION_REQUIRED' });
      if (b.accuracy != null && Number(b.accuracy) > GPS_MAX_ACCURACY_M) return send(res, 400, { error: 'GPS_ACCURACY_TOO_LOW' });
      if (!territoryAllowed(e, c)) return send(res, 403, { error: 'TERRITORY_MISMATCH' });
      const dte = now().slice(0, 10);
      const assignment = q('SELECT id FROM assignments WHERE employee_id=? AND consumer_id=? AND work_date=?').get(u.id,c.id,dte);
      if (!assignment) return send(res, 403, { error: 'NOT_ASSIGNED_TODAY' });
      if (!coord(c.lat, c.lon)) return send(res, 400, { error: 'CONSUMER_LOCATION_MISSING' });
      const fresh = recentGps(u.id, b.lat, b.lon);
      if (!fresh.ok) return send(res, 403, fresh);
      const distance = distanceM(b.lat,b.lon,c.lat,c.lon);
      if (distance > GEOFENCE_M) return send(res, 403, { error: 'OUTSIDE_GEOFENCE', distance_m: distance, geofence_m: GEOFENCE_M });
      const eventId = String(b.client_event_id);
      const old = q('SELECT id,status,ended_server FROM visits WHERE client_event_id=?').get(eventId);
      if (old) return send(res, 409, { error: 'VISIT_EVENT_ALREADY_EXISTS', visit_id: old.id, status: old.status, ended_server: old.ended_server });
      const open = q('SELECT id FROM visits WHERE employee_id=? AND consumer_id=? AND ended_server IS NULL').get(u.id,c.id);
      if (open) return send(res, 409, { error: 'VISIT_ALREADY_OPEN', visit_id: open.id });
      const ts = now();
      const r = q('INSERT INTO visits(employee_id,consumer_id,started_server,start_lat,start_lon,start_accuracy,distance_m,status,client_event_id) VALUES(?,?,?,?,?,?,?,?,?)').run(u.id,c.id,ts,+b.lat,+b.lon,b.accuracy??null,distance,'VALID',eventId);
      audit(u.id,'VISIT_START',{...b,distance_m:distance,status:'VALID'});
      return send(res, 200, { ok:true, visit_id:Number(r.lastInsertRowid), server_time:ts, distance_m:distance, status:'VALID' });
    }
    if (req.method === 'POST' && url === '/api/visit/end') {
      const u = auth(req, res); if (!u) return;
      const b = await body(req), v = q('SELECT * FROM visits WHERE id=? AND employee_id=?').get(b.visit_id,u.id);
      if (!v) return send(res, 404, { error:'VISIT_NOT_FOUND' });
      if (v.ended_server) return send(res, 409, { error:'VISIT_ALREADY_CLOSED' });
      if (!coord(b.lat,b.lon)) return send(res,400,{error:'LOCATION_REQUIRED'});
      if (b.accuracy != null && Number(b.accuracy) > GPS_MAX_ACCURACY_M) return send(res,400,{error:'GPS_ACCURACY_TOO_LOW'});
      const fresh = recentGps(u.id,b.lat,b.lon); if (!fresh.ok) return send(res,403,fresh);
      const endFromStart = distanceM(b.lat,b.lon,v.start_lat,v.start_lon);
      if (endFromStart > 1000) return send(res,403,{error:'END_LOCATION_MISMATCH',distance_m:endFromStart});
      const ts = now();
      q('UPDATE visits SET ended_server=?,end_lat=?,end_lon=?,end_accuracy=? WHERE id=?').run(ts,+b.lat,+b.lon,b.accuracy??null,v.id);
      audit(u.id,'VISIT_END',b);
      return send(res,200,{ok:true,server_time:ts});
    }
    if (req.method === 'GET' && url === '/api/live') {
      const u = auth(req, res, true); if (!u) return;
      const since = new Date(Date.now() - 900000).toISOString();
      return send(res,200,{server_time:now(),rows:q(`SELECT u.id,u.employee_name,u.region,u.district,g.ts_server,g.lat,g.lon,g.accuracy,g.speed FROM users u JOIN (SELECT employee_id,MAX(id) max_id FROM gps_points WHERE ts_server>=? GROUP BY employee_id)x ON x.employee_id=u.id JOIN gps_points g ON g.id=x.max_id WHERE u.role='employee' AND u.active=1 ORDER BY u.region,u.district,u.employee_name`).all(since)});
    }
    if (req.method === 'GET' && url === '/api/report') {
      const u = auth(req,res,true); if(!u)return;
      const p = new URL(req.url,'http://local').searchParams, d = dateOk(p.get('date')) ? p.get('date') : now().slice(0,10);
      const es = q("SELECT id,employee_name,region,district FROM users WHERE role='employee' AND active=1 ORDER BY region,district,employee_name").all();
      const result = es.map(e=>{
        const planned = Number(q('SELECT COUNT(*) n FROM assignments WHERE employee_id=? AND work_date=?').get(e.id,d).n||0);
        const visited = Number(q('SELECT COUNT(*) n FROM visits WHERE employee_id=? AND started_server LIKE ?').get(e.id,`${d}%`).n||0);
        const valid = Number(q("SELECT COUNT(*) n FROM visits WHERE employee_id=? AND started_server LIKE ? AND status='VALID'").get(e.id,`${d}%`).n||0);
        const suspicious = Number(q("SELECT COUNT(*) n FROM visits WHERE employee_id=? AND started_server LIKE ? AND status<>'VALID'").get(e.id,`${d}%`).n||0);
        return {employee_id:e.id,employee:e.employee_name,region:e.region||'',district:e.district||'',planned,visited,not_visited:Math.max(0,planned-visited),valid,suspicious,completion:planned?Math.round(visited/planned*100):0};
      });
      return send(res,200,{date:d,result});
    }
    if (req.method === 'GET' && url === '/api/monthly') {
      const u = auth(req,res,true); if(!u)return;
      const p = new URL(req.url,'http://local').searchParams, m = monthOk(p.get('month')) ? p.get('month') : now().slice(0,7);
      const rows = q(`SELECT u.id employee_id,u.employee_name,u.region,u.district,
        COUNT(DISTINCT a.id) planned,COUNT(DISTINCT v.id) visited,
        COUNT(DISTINCT CASE WHEN v.status='VALID' THEN v.id END) valid,
        COUNT(DISTINCT CASE WHEN v.status<>'VALID' THEN v.id END) suspicious
        FROM users u LEFT JOIN assignments a ON a.employee_id=u.id AND a.work_date LIKE ?
        LEFT JOIN visits v ON v.employee_id=u.id AND v.started_server LIKE ?
        WHERE u.role='employee' AND u.active=1 GROUP BY u.id ORDER BY u.region,u.district,u.employee_name`).all(`${m}%`,`${m}%`).map(x=>({...x,planned:Number(x.planned||0),visited:Number(x.visited||0),valid:Number(x.valid||0),suspicious:Number(x.suspicious||0),completion:x.planned?Math.round(x.visited/x.planned*100):0}));
      return send(res,200,{month:m,result:rows});
    }
    if (req.method === 'GET' && url === '/api/consumer-monthly') {
      const u = auth(req,res,true); if(!u)return;
      const p = new URL(req.url,'http://local').searchParams, m = monthOk(p.get('month')) ? p.get('month') : now().slice(0,7), term=String(p.get('q')||'').trim();
      let where='c.active=1',args=[`${m}%`];
      if(term){where+=' AND (c.name LIKE ? OR c.district LIKE ? OR c.branch LIKE ? OR c.mahalla LIKE ?)';args.push(`%${term}%`,`%${term}%`,`%${term}%`,`%${term}%`)}
      const rows=q(`SELECT c.id consumer_id,c.name,c.region,c.branch,c.district,c.mahalla,
        COUNT(v.id) visits,COUNT(DISTINCT v.employee_id) employees,MAX(v.started_server) last_visit,
        GROUP_CONCAT(DISTINCT u.employee_name) employee_names,
        SUM(CASE WHEN v.status='VALID' THEN 1 ELSE 0 END) valid,
        SUM(CASE WHEN v.status<>'VALID' THEN 1 ELSE 0 END) suspicious
        FROM consumers c LEFT JOIN visits v ON v.consumer_id=c.id AND v.started_server LIKE ?
        LEFT JOIN users u ON u.id=v.employee_id WHERE ${where}
        GROUP BY c.id ORDER BY visits DESC,c.name LIMIT 500`).all(...args).map(x=>({...x,visits:Number(x.visits||0),employees:Number(x.employees||0),valid:Number(x.valid||0),suspicious:Number(x.suspicious||0)}));
      return send(res,200,{month:m,result:rows});
    }
    if (req.method === 'GET' && url === '/api/route') {
      const u = auth(req,res,true); if(!u)return;
      const p = new URL(req.url,'http://local').searchParams, eid=Number(p.get('employee_id')), d=dateOk(p.get('date'))?p.get('date'):now().slice(0,10);
      if(!eid)return send(res,400,{error:'EMPLOYEE_REQUIRED'});
      const gps=q('SELECT id,ts_server,lat,lon,accuracy,speed FROM gps_points WHERE employee_id=? AND ts_server LIKE ? ORDER BY id').all(eid,`${d}%`);
      const visits=q('SELECT v.id,v.consumer_id,c.name,c.branch,c.district,v.started_server,v.ended_server,v.start_lat,v.start_lon,v.end_lat,v.end_lon,v.distance_m,v.status FROM visits v JOIN consumers c ON c.id=v.consumer_id WHERE v.employee_id=? AND v.started_server LIKE ? ORDER BY v.id').all(eid,`${d}%`);
      return send(res,200,{employee_id:eid,date:d,gps,visits});
    }
    if (req.method === 'GET' && url === '/api/audit') {
      const u = auth(req,res,true); if(!u)return;
      const rows=q('SELECT * FROM audit ORDER BY id DESC LIMIT 500').all();
      let prev='GENESIS',valid=true,bad=null;
      for(const r of [...rows].reverse()){
        const expected=sha([prev,r.ts_server,r.actor_id||'',r.action,r.payload].join('|'));
        if(expected!==r.hash || r.prev_hash!==prev){valid=false;bad={id:r.id,expected,actual:r.hash};break;}
        prev=r.hash;
      }
      return send(res,200,{chain_valid:valid,count:rows.length,bad,rows});
    }
    return false;
  } catch (e) {
    console.error('API_ERROR', e);
    return send(res,500,{error:e.message||'SERVER_ERROR'});
  }
}

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){
    res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type'});
    return res.end();
  }
  const url=new URL(req.url,'http://localhost').pathname;
  if(url.startsWith('/api/')){
    const done=await api(req,res,url);
    if(done!==false)return;
  }
  const file=url==='/'?'/index.html':url;
  if(file.includes('..'))return send(res,400,{error:'BAD_PATH'});
  const filePath=path.join(__dirname,'public',file);
  if(fs.existsSync(filePath)&&fs.statSync(filePath).isFile()){
    const ext=path.extname(filePath);
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
    res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store'});
    return fs.createReadStream(filePath).pipe(res);
  }
  return send(res,404,{error:'NOT_FOUND'});
});
server.listen(PORT,()=>console.log(`ULGURJI ONLINE NAZORAT FINAL :${PORT}`));
