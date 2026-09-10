import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
const DB=process.env.DB_PATH||'/app/data/data.sqlite';
const db=new DatabaseSync(DB);
for(const sql of ['ALTER TABLE users ADD COLUMN region TEXT','ALTER TABLE users ADD COLUMN district TEXT','ALTER TABLE users ADD COLUMN position TEXT','ALTER TABLE users ADD COLUMN phone TEXT','ALTER TABLE consumers ADD COLUMN region TEXT']){try{db.exec(sql)}catch(e){if(!String(e.message).includes('duplicate column name'))throw e}}
const b64=fs.readFileSync(new URL('./employees_seed_285_full.b64',import.meta.url),'utf8').replace(/\s+/g,'');
const rows=JSON.parse(zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8'));
if(rows.length!==285)throw Error(`EMPLOYEE_SEED_INVALID:${rows.length}`);
const sha=s=>crypto.createHash('sha256').update(String(s??'')).digest('hex');
const password=process.env.EMPLOYEE_PASSWORD||'ulgurji2026';
const hash=sha(password);
const republic=new Set(['Темирбоев Олим','Турдиев Азиз','Комил Хошимов','Маьруф Хабибуллаев','Лазиз Холбутаев','Жасур Ахматджонов','Фазлитдин Сафаров']);
db.prepare("DELETE FROM users WHERE login='employee1' AND employee_name='Ходим 1' AND role='employee'").run();
const ins=db.prepare("INSERT INTO users(login,password_hash,role,employee_name,active,region,district,position,phone) VALUES(?,?,?,?,1,?,?,?,?)");
const find=db.prepare("SELECT id,login,role,password_hash FROM users WHERE employee_name=? ORDER BY CASE WHEN role='admin' THEN 0 ELSE 1 END,id LIMIT 1");
const updEmployee=db.prepare("UPDATE users SET login=?,password_hash=?,role='employee',active=1,region=?,district=?,position=?,phone=? WHERE id=?");
const updAdmin=db.prepare("UPDATE users SET role='admin',active=1,region=?,district=?,position=?,phone=? WHERE id=?");
for(const r of rows){
  const wantedRole=republic.has(r.name)?'admin':'employee';
  const login=String(r.no).padStart(3,'0');
  const u=find.get(r.name);
  if(u){
    if(wantedRole==='employee') updEmployee.run(login,hash,r.region,r.district,r.position,r.phone,u.id);
    else updAdmin.run(login,r.region,r.district,r.position,r.phone,u.id);
  }else{
    const x=db.prepare('SELECT id FROM users WHERE login=?').get(login);
    if(x){
      if(wantedRole==='employee') updEmployee.run(login,hash,r.region,r.district,r.position,r.phone,x.id);
      else updAdmin.run(r.region,r.district,r.position,r.phone,x.id);
    }else{
      ins.run(login,hash,wantedRole,r.name,r.region,r.district,r.position,r.phone);
    }
  }
}
console.log(`EMPLOYEE_IMPORT_OK: ${rows.length}`);
console.log(`EMPLOYEE_COUNT: ${db.prepare("SELECT COUNT(*) n FROM users WHERE role='employee' AND active=1").get().n}`);
await import('./employee-credentials-bootstrap.js');
await import('./employee-entry-bridge.js');
