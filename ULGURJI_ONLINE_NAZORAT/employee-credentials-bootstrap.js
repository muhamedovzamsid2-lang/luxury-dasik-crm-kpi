import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const DB=process.env.DB_PATH||'/app/data/data.sqlite';
const db=new DatabaseSync(DB);
const sha=s=>crypto.createHash('sha256').update(String(s??'')).digest('hex');
const map={'А':'A','а':'a','Б':'B','б':'b','В':'V','в':'v','Г':'G','г':'g','Д':'D','д':'d','Е':'E','е':'e','Ё':'Yo','ё':'yo','Ж':'J','ж':'j','З':'Z','з':'z','И':'I','и':'i','Й':'Y','й':'y','К':'K','к':'k','Л':'L','л':'l','М':'M','м':'m','Н':'N','н':'n','О':'O','о':'o','П':'P','п':'p','Р':'R','р':'r','С':'S','с':'s','Т':'T','т':'t','У':'U','у':'u','Ф':'F','ф':'f','Х':'X','х':'x','Ц':'Ts','ц':'ts','Ч':'Ch','ч':'ch','Ш':'Sh','ш':'sh','Щ':'Sh','щ':'sh','Ъ':'','ъ':'','Ы':'Y','ы':'y','Ь':'','ь':'','Э':'E','э':'e','Ю':'Yu','ю':'yu','Я':'Ya','я':'ya','Қ':'Q','қ':'q','Ғ':'G','ғ':'g','Ҳ':'H','ҳ':'h','Ў':'O','ў':'o','’':'','ʻ':''};
const slug=s=>String(s||'').split(/\s+/).filter(Boolean).map(x=>x.split('').map(ch=>map[ch]??ch).join('')).join('_').toLowerCase().replace(/[^a-z0-9_]+/g,'').replace(/_+/g,'_').replace(/^_|_$/g,'');
const names=['Темирбоев Олим','Турдиев Азиз','Комил Хошимов','Маьруф Хабибуллаев','Лазиз Холбутаев','Жасур Ахматджонов','Фазлитдин Сафаров'];
const rows=db.prepare("SELECT id,login,employee_name FROM users WHERE role='employee' AND active=1").all();
const upd=db.prepare('UPDATE users SET login=?,password_hash=? WHERE id=?');
for(const r of rows){if(/^hodim\d+$/i.test(String(r.login||''))){const login=slug(r.employee_name);if(login){const clash=db.prepare('SELECT id FROM users WHERE login=? AND id<>?').get(login,r.id);if(!clash)upd.run(login,sha(login),r.id)}}}
const find=db.prepare("SELECT id FROM users WHERE employee_name=? AND role='employee' LIMIT 1"), ins=db.prepare("INSERT INTO users(login,password_hash,role,employee_name,active) VALUES(?,?, 'employee',?,1)");
for(const name of names){const login=slug(name);let u=find.get(name);if(u){const clash=db.prepare('SELECT id FROM users WHERE login=? AND id<>?').get(login,u.id);if(!clash)upd.run(login,sha(login),u.id)}else{const clash=db.prepare('SELECT id FROM users WHERE login=?').get(login);if(!clash)ins.run(login,sha(login),name)}}
console.log('EMPLOYEE_CREDENTIALS_BOOTSTRAP_OK');