import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const DB_PATH=process.env.DB_PATH||path.join(__dirname,'data.sqlite');
const SECRET=process.env.JWT_SECRET||'ULGURJI_CHANGE_SECRET';
const db=new DatabaseSync(DB_PATH);
const q=s=>db.prepare(s),now=()=>new Date().toISOString();
for(const s of [
  "ALTER TABLE consumers ADD COLUMN location_status TEXT DEFAULT 'UNSET'",
  "ALTER TABLE consumers ADD COLUMN location_proposed_lat REAL",
  "ALTER TABLE consumers ADD COLUMN location_proposed_lon REAL",
  "ALTER TABLE consumers ADD COLUMN location_proposed_accuracy REAL",
  "ALTER TABLE consumers ADD COLUMN location_proposed_by INTEGER",
  "ALTER TABLE consumers ADD COLUMN location_proposed_server TEXT",
  "ALTER TABLE consumers ADD COLUMN location_rejected_server TEXT"
]){try{db.exec(s)}catch(e){if(!String(e.message).toLowerCase().includes('duplicate column'))throw e}}
try{db.exec("UPDATE consumers SET location_status='APPROVED' WHERE lat IS NOT NULL AND lon IS NOT NULL AND (location_status IS NULL OR location_status='UNSET')") }catch{}
const coord=(a,b)=>Number.isFinite(+a)&&Number.isFinite(+b)&&+a>=-90&&+a<=90&&+b>=-180&&+b<=180;
const norm=s=>String(s??'').trim().toLowerCase().replace(/[ʻ’‘`']/g,"'").replace(/[–—-]/g,' ').replace(/\s+/g,' ');
const regionNorm=s=>norm(s);
function b64(s){return Buffer.from(s).toString('base64url')}
function ub(s){return Buffer.from(s,'base64url').toString()}
function verify(t){const a=String(t||'').split('.');if(a.length!==3)throw Error('AUTH_INVALID');const s=b64(crypto.createHmac('sha256',SECRET).update(a[0]+'.'+a[1]).digest());if(s!==a[2])throw Error('AUTH_INVALID');const p=JSON.parse(ub(a[1]));if(!p.exp||p.exp<Date.now()/1000)throw Error('AUTH_INVALID');return p}
function auth(req,res,admin=false){try{const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))throw Error('AUTH_INVALID');const u=verify(h.slice(7));if(admin&&u.role!=='admin')throw Error('ADMIN_ONLY');return u}catch(e){send(res,e.message==='ADMIN_ONLY'?403:401,{error:e.message==='ADMIN_ONLY'?'ADMIN_ONLY':'AUTH_INVALID'});return null}}
function send(res,c,d){const body=JSON.stringify(d);res.writeHead(c,{'Content-Type':'application/json','Cache-Control':'no-store, no-cache, must-revalidate','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS','Content-Length':Buffer.byteLength(body)});res.end(body)}
async function json(req){return await new Promise((resolve,reject)=>{let a=[],n=0;req.on('data',c=>{n+=c.length;if(n>1e6){reject(Error('BODY_TOO_LARGE'));req.destroy();return}a.push(c)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(a).toString('utf8')||'{}'))}catch{reject(Error('INVALID_JSON'))}});req.on('error',reject)})}
function consumer(id){return q('SELECT * FROM consumers WHERE id=? AND active=1').get(id)}
function employee(id){return q("SELECT id,region,district FROM users WHERE id=? AND role='employee' AND active=1").get(id)}
function assigned(e,c,d){return !!q('SELECT 1 FROM assignments WHERE employee_id=? AND consumer_id=? AND work_date=?').get(e,c,d)}
function territory(e,c){if(!e)return false;const cr=c.region||c.branch;if(!e.region||!cr||regionNorm(e.region)!==regionNorm(cr))return false;return !e.district||!c.district||norm(e.district)===norm(c.district)}
function audit(actor,action,payload){try{const prev=q('SELECT hash FROM audit ORDER BY id DESC LIMIT 1').get()?.hash||'GENESIS',ts=now(),p=JSON.stringify(payload||{}),h=crypto.createHash('sha256').update([prev,ts,actor||'',action,p].join('|')).digest('hex');q('INSERT INTO audit(ts_server,actor_id,action,payload,prev_hash,hash) VALUES(?,?,?,?,?,?)').run(ts,actor||null,action,p,prev,h)}catch(e){console.error('LOCATION_AUDIT_ERROR',e.message)}}
export async function handleLocationApproval(req,res,pathName){
  if(req.method==='OPTIONS'&&pathName.startsWith('/api/')){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'});res.end();return true}
  if(pathName==='/api/consumers/location'){
    if(req.method!=='POST')return false;
    const u=auth(req,res);if(!u)return true;
    const b=await json(req),c=consumer(Number(b.consumer_id));if(!c)return send(res,404,{error:'CONSUMER_NOT_FOUND'}),true;
    if(!coord(b.lat,b.lon))return send(res,400,{error:'GPS_INVALID'}),true;
    if(u.role==='employee'){
      const e=employee(u.id),d=now().slice(0,10);
      if(!assigned(u.id,c.id,d)||!territory(e,c))return send(res,403,{error:'TERRITORY_MISMATCH'}),true;
      const acc=b.accuracy==null?null:+b.accuracy;
      q(`UPDATE consumers SET location_proposed_lat=?,location_proposed_lon=?,location_proposed_accuracy=?,location_proposed_by=?,location_proposed_server=?,location_status=CASE WHEN lat IS NOT NULL AND lon IS NOT NULL THEN 'APPROVED' ELSE 'PENDING' END WHERE id=?`).run(+b.lat,+b.lon,acc,u.id,now(),c.id);
      audit(u.id,'CONSUMER_LOCATION_PROPOSED',{consumer_id:c.id,lat:+b.lat,lon:+b.lon,accuracy:acc});
      return send(res,200,{ok:true,consumer_id:c.id,status:(c.lat!=null&&c.lon!=null)?'APPROVED':'PENDING',message:'GPS нуқта раҳбар тасдиғига юборилди'}),true;
    }
    if(u.role!=='admin')return send(res,403,{error:'ADMIN_ONLY'}),true;
    q(`UPDATE consumers SET lat=?,lon=?,location_accuracy=?,location_set_server=?,location_status='APPROVED',location_proposed_lat=NULL,location_proposed_lon=NULL,location_proposed_accuracy=NULL,location_proposed_by=NULL,location_proposed_server=NULL WHERE id=?`).run(+b.lat,+b.lon,b.accuracy==null?null:+b.accuracy,now(),c.id);
    audit(u.id,'CONSUMER_LOCATION_APPROVED',{consumer_id:c.id,lat:+b.lat,lon:+b.lon});
    return send(res,200,{ok:true,consumer_id:c.id,status:'APPROVED'}),true;
  }
  if(pathName==='/api/location-proposals'&&req.method==='GET'){
    const u=auth(req,res,true);if(!u)return true;
    const rows=q(`SELECT c.id,c.name,c.region,c.district,c.mahalla,c.street,c.phone,c.lat,c.lon,c.location_status,c.location_proposed_lat,c.location_proposed_lon,c.location_proposed_accuracy,c.location_proposed_by,c.location_proposed_server,u.employee_name proposer_name FROM consumers c LEFT JOIN users u ON u.id=c.location_proposed_by WHERE c.active=1 AND c.location_status='PENDING' ORDER BY c.location_proposed_server DESC`).all();
    return send(res,200,{items:rows,total:rows.length}),true;
  }
  if(pathName==='/api/consumers/location/approve'&&req.method==='POST'){
    const u=auth(req,res,true);if(!u)return true;const b=await json(req),id=Number(b.consumer_id),c=consumer(id);if(!c)return send(res,404,{error:'CONSUMER_NOT_FOUND'}),true;
    if(!coord(c.location_proposed_lat,c.location_proposed_lon))return send(res,400,{error:'NO_PENDING_LOCATION'}),true;
    const ts=now();q(`UPDATE consumers SET lat=location_proposed_lat,lon=location_proposed_lon,location_accuracy=location_proposed_accuracy,location_set_server=?,location_status='APPROVED',location_rejected_server=NULL,location_proposed_lat=NULL,location_proposed_lon=NULL,location_proposed_accuracy=NULL,location_proposed_by=NULL,location_proposed_server=NULL WHERE id=?`).run(ts,id);audit(u.id,'CONSUMER_LOCATION_APPROVED',{consumer_id:id});return send(res,200,{ok:true,consumer_id:id,status:'APPROVED'}),true;
  }
  if(pathName==='/api/consumers/location/reject'&&req.method==='POST'){
    const u=auth(req,res,true);if(!u)return true;const b=await json(req),id=Number(b.consumer_id),c=consumer(id);if(!c)return send(res,404,{error:'CONSUMER_NOT_FOUND'}),true;
    const status=(c.lat!=null&&c.lon!=null)?'APPROVED':'REJECTED';q(`UPDATE consumers SET location_status=?,location_rejected_server=?,location_proposed_lat=NULL,location_proposed_lon=NULL,location_proposed_accuracy=NULL,location_proposed_by=NULL,location_proposed_server=NULL WHERE id=?`).run(status,now(),id);audit(u.id,'CONSUMER_LOCATION_REJECTED',{consumer_id:id,reason:String(b.reason||'')});return send(res,200,{ok:true,consumer_id:id,status}),true;
  }
  if(pathName.startsWith('/api/consumers/')&&req.method==='GET')return false;
  return false;
}
