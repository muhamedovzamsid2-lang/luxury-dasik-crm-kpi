import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
const DB=process.env.DB_PATH||'/app/data/data.sqlite';
const db=new DatabaseSync(DB);
for(const sql of ['ALTER TABLE users ADD COLUMN region TEXT','ALTER TABLE users ADD COLUMN district TEXT','ALTER TABLE users ADD COLUMN position TEXT','ALTER TABLE users ADD COLUMN phone TEXT']){try{db.exec(sql)}catch(e){if(!String(e.message).includes('duplicate column name'))throw e}}
const full=new URL('./employees_seed_full.gz.b64',import.meta.url);
const split1=new URL('./seed1.b64',import.meta.url);
const split2=new URL('./seed2.b64',import.meta.url);
const b64=fs.existsSync(full)?fs.readFileSync(full,'utf8'):fs.readFileSync(split1,'utf8')+fs.readFileSync(split2,'utf8');
const rows=JSON.parse(zlib.gunzipSync(Buffer.from(b64.replace(/\s+/g,''),'base64')).toString('utf8'));
if(rows.length!==285)throw Error(`EMPLOYEE_SEED_INVALID:${rows.length}`);
const sha=s=>crypto.createHash('sha256').update(String(s??'')).digest('hex');
const password=process.env.EMPLOYEE_PASSWORD||'Ulgurji2026';
const hash=sha(password);
db.prepare("DELETE FROM users WHERE login='employee1' AND employee_name='Ходим 1' AND role='employee'").run();
const ins=db.prepare("INSERT INTO users(login,password_hash,role,employee_name,active,region,district,position,phone) VALUES(?,?,?,?,1,?,?,?,?)");
const upd=db.prepare("UPDATE users SET role='employee',active=1,region=?,district=?,position=?,phone=?,password_hash=? WHERE id=?");
for(const r of rows){let u=db.prepare("SELECT id FROM users WHERE employee_name=? AND role='employee'").get(r.name);if(u)upd.run(r.region,r.district,r.position,r.phone,hash,u.id);else{let login=`hodim${String(r.no).padStart(3,'0')}`,x=db.prepare('SELECT id FROM users WHERE login=?').get(login);if(x)upd.run(r.region,r.district,r.position,r.phone,hash,x.id);else ins.run(login,hash,'employee',r.name,r.region,r.district,r.position,r.phone)}}
console.log(`EMPLOYEE_IMPORT_OK: ${rows.length}`);console.log(`EMPLOYEE_COUNT: ${db.prepare("SELECT COUNT(*) n FROM users WHERE role='employee' AND active=1").get().n}`);
