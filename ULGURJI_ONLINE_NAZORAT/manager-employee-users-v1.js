import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const DB=process.env.DB_PATH||'/app/data/data.sqlite';
const db=new DatabaseSync(DB);
const sha=s=>crypto.createHash('sha256').update(String(s??'')).digest('hex');
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PATCH, PUT, OPTIONS'});res.end(JSON.stringify(data))};
const json=req=>new Promise((ok,no)=>{let a=[],n=0;req.on('data',c=>{n+=c.length;if(n>2e6)return no(Error('BODY_TOO_LARGE'));a.push(c)});req.on('end',()=>{try{ok(JSON.parse(Buffer.concat(a).toString()||'{}'))}catch{no(Error('INVALID_JSON'))}});req.on('error',no)});
function verify(req){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))throw Error('AUTH_INVALID');const t=h.slice(7),a=t.split('.');if(a.length!==3)throw Error('AUTH_INVALID');const secret=process.env.JWT_SECRET||'ULGURJI_CHANGE_SECRET';const sig=Buffer.from(crypto.createHmac('sha256',secret).update(a[0]+'.'+a[1]).digest()).toString('base64url');if(sig!==a[2])throw Error('AUTH_INVALID');const p=JSON.parse(Buffer.from(a[1],'base64url').toString());if(!p.exp||p.exp<Date.now()/1000)throw Error('AUTH_INVALID');return p}
function clean(s){return String(s??'').trim().replace(/\s+/g,' ')}
export async function handleManagerEmployeeUsers(req,res,url){
 if(!url.startsWith('/api/manager-employee-users'))return false;
 if(req.method==='OPTIONS'){send(res,204,{});return true}
 let u;try{u=verify(req)}catch{send(res,401,{error:'AUTH_INVALID'});return true}
 if(u.role!=='admin'){send(res,403,{error:'ADMIN_ONLY'});return true}
 try{
  if(req.method==='GET'&&url==='/api/manager-employee-users'){
   const items=db.prepare("SELECT id,employee_name,login,role,active,region,district,position,phone FROM users WHERE role='employee' ORDER BY employee_name COLLATE NOCASE,id").all();
   return send(res,200,{items}),true;
  }
  if((req.method==='POST'||req.method==='PUT'||req.method==='PATCH')&&url.startsWith('/api/manager-employee-users')){
   const b=await json(req),id=Number(url.split('/').pop())||0,name=clean(b.employee_name),login=clean(b.login).toLowerCase(),password=String(b.password??'');
   if(!name||!login)return send(res,400,{error:'NAME_AND_LOGIN_REQUIRED'}),true;
   if(!/^[a-z0-9._-]{3,80}$/.test(login))return send(res,400,{error:'LOGIN_FORMAT'}),true;
   const dup=db.prepare('SELECT id FROM users WHERE lower(login)=lower(?) AND id<>?').get(login,id);if(dup)return send(res,409,{error:'LOGIN_EXISTS'}),true;
   if(id){const old=db.prepare("SELECT id,role FROM users WHERE id=?").get(id);if(!old||old.role!=='employee')return send(res,404,{error:'EMPLOYEE_NOT_FOUND'}),true;
    if(password)db.prepare('UPDATE users SET employee_name=?,login=?,password_hash=?,active=?,region=?,district=?,position=?,phone=? WHERE id=?').run(name,login,sha(password),b.active===false?0:1,clean(b.region),clean(b.district),clean(b.position),clean(b.phone),id);
    else db.prepare('UPDATE users SET employee_name=?,login=?,active=?,region=?,district=?,position=?,phone=? WHERE id=?').run(name,login,b.active===false?0:1,clean(b.region),clean(b.district),clean(b.position),clean(b.phone),id);
    return send(res,200,{ok:true,id}),true;
   }
   if(password.length<4)return send(res,400,{error:'PASSWORD_REQUIRED'}),true;
   const r=db.prepare('INSERT INTO users(login,password_hash,role,employee_name,active,region,district,position,phone) VALUES(?,?,?,?,?,?,?,?,?)').run(login,sha(password),'employee',name,b.active===false?0:1,clean(b.region),clean(b.district),clean(b.position),clean(b.phone));
   return send(res,200,{ok:true,id:Number(r.lastInsertRowid)}),true;
  }
 }catch(e){send(res,400,{error:e.message||'MANAGER_EMPLOYEE_USERS_ERROR'});return true}
 return false;
}
