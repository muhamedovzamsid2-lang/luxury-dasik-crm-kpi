import fs from 'node:fs';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const DB=process.env.DB_PATH||'/app/data/data.sqlite';
const db=new DatabaseSync(DB);
for(const sql of ['ALTER TABLE users ADD COLUMN region TEXT','ALTER TABLE users ADD COLUMN district TEXT','ALTER TABLE users ADD COLUMN position TEXT','ALTER TABLE users ADD COLUMN phone TEXT']){try{db.exec(sql)}catch(e){if(!String(e.message).includes('duplicate column name'))throw e}}
const rows=[];for(let i=1;i<=6;i++)rows.push(...JSON.parse(fs.readFileSync(new URL(`./employees_seed_part${i}.json`,import.meta.url),'utf8')));
const sha=s=>crypto.createHash('sha256').update(String(s??'')).digest('hex');
const password=process.env.EMPLOYEE_PASSWORD||'Ulgurji2026';
const hash=sha(password);
const ins=db.prepare("INSERT INTO users(login,password_hash,role,employee_name,active,region,district,position,phone) VALUES(?,?,?,?,1,?,?,?,?)");
const upd=db.prepare("UPDATE users SET role='employee',active=1,region=?,district=?,position=?,phone=? WHERE id=?");
for(const r of rows){let u=db.prepare("SELECT id FROM users WHERE employee_name=? AND role='employee'").get(r.name);if(u)upd.run(r.region,r.district,r.position,r.phone,u.id);else{let login=`hodim${String(r.no).padStart(3,'0')}`,x=db.prepare('SELECT id FROM users WHERE login=?').get(login);if(x)upd.run(r.region,r.district,r.position,r.phone,x.id);else ins.run(login,hash,'employee',r.name,r.region,r.district,r.position,r.phone)}}
console.log(`EMPLOYEE_IMPORT_OK: ${rows.length}`);console.log(`EMPLOYEE_COUNT: ${db.prepare("SELECT COUNT(*) n FROM users WHERE role='employee' AND active=1").get().n}`);
