let token=localStorage.getItem('uog_token')||'';
let me=null,watchId=null,lastPos=null,map=null,routeLine=null,routeMarkers=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const today=()=>new Date().toISOString().slice(0,10);
const month=()=>new Date().toISOString().slice(0,7);
async function api(url,opt={}){
  const headers=Object.assign({'Content-Type':'application/json'},opt.headers||{});
  if(token)headers.Authorization='Bearer '+token;
  const r=await fetch(url,{...opt,headers,cache:'no-store'});
  const d=await r.json().catch(()=>({error:'SERVER_RESPONSE_ERROR'}));
  if(!r.ok)throw Error(d.error||('HTTP_'+r.status));
  return d;
}
function show(id){['loginScreen','employee','admin'].forEach(x=>$(x)?.classList.add('hidden'));$(id)?.classList.remove('hidden');}
function tab(id,btn){
  document.querySelectorAll('.tabpanel').forEach(x=>x.classList.add('hidden'));
  $(id)?.classList.remove('hidden');
  document.querySelectorAll('.tabbtn').forEach(x=>x.classList.remove('active'));
  btn?.classList.add('active');
  if(id==='consumersTab')loadConsumers(1);
  if(id==='employeesTab')loadEmployees();
  if(id==='reportsTab')loadReport();
  if(id==='monthlyTab'){loadMonthly();loadConsumerMonthly();}
  if(id==='mapTab')loadLive();
  if(id==='auditTab')loadAudit();
}
async function loginApp(){
  const msg=$('loginMsg'),btn=$('loginBtn');
  if(msg)msg.textContent='';if(btn)btn.disabled=true;
  try{
    const d=await api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login:$('loginUser').value.trim(),password:$('loginPass').value})});
    token=d.token;me=d.user;localStorage.setItem('uog_token',token);await boot();
  }catch(e){if(msg)msg.textContent=e.message==='LOGIN_FAILED'?'Логин ёки парол хато':e.message;}
  finally{if(btn)btn.disabled=false;}
  return false;
}
window.loginApp=loginApp;
function logout(){stopGps();localStorage.removeItem('uog_token');token='';location.reload();}
async function boot(){
  try{
    me=await api('/api/me');
    if(me.role==='admin'){
      show('admin');
      await Promise.allSettled([loadMetrics(),loadReport(),loadConsumers(1),loadEmployees(),loadMonthly(),loadConsumerMonthly(),loadAudit(),loadLive()]);
    }else{
      show('employee');
      $('empName').textContent=me.name||'';
      $('empTerritory').textContent=[me.region,me.district].filter(Boolean).join(' • ');
      await loadToday();startGps();
    }
  }catch(e){localStorage.removeItem('uog_token');token='';show('loginScreen');}
}
function startGps(){
  if(!navigator.geolocation||watchId!==null)return;
  watchId=navigator.geolocation.watchPosition(async p=>{
    lastPos=p;
    const c=p.coords;
    if($('gpsState'))$('gpsState').textContent='GPS: онлайн • ±'+Math.round(c.accuracy||0)+' м';
    try{await api('/api/gps',{method:'POST',body:JSON.stringify({lat:c.latitude,lon:c.longitude,accuracy:c.accuracy,speed:c.speed,client_event_id:'gps-'+me.id+'-'+Date.now()})});}
    catch(e){if($('gpsState'))$('gpsState').textContent='GPS: '+e.message;}
  },e=>{if($('gpsState'))$('gpsState').textContent='GPS: '+e.message;},{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
}
function stopGps(){if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;}}
async function loadToday(){
  try{
    const d=await api('/api/today?date='+today()),items=d.items||[],qv=(($('search')?.value)||'').trim().toLowerCase();
    const f=items.filter(x=>([x.name,x.district,x.branch,x.mahalla,x.phone].join(' ')).toLowerCase().includes(qv));
    $('planned').textContent=items.length;$('visited').textContent=items.filter(x=>x.visit_id).length;$('notVisited').textContent=items.filter(x=>!x.visit_id).length;
    $('completion').textContent=(items.length?Math.round(items.filter(x=>x.visit_id).length/items.length*100):0)+'%';
    $('list').innerHTML=f.map(x=>`<div class="consumer"><div class="row"><b style="margin-right:auto">${esc(x.name||'Номсиз')}</b><span class="pill">ID ${x.id}</span></div><div class="muted">${esc(x.branch||'—')} • ${esc(x.district||'—')} • ${esc(x.mahalla||'—')}</div><div class="muted">${esc(x.category||'—')} • ${esc(x.activity||'—')}</div><div class="row"><span class="${x.visit_id?'ok':'bad'}">${x.visit_id?'✅ Кирилган':'⛔ Кирилмаган'}</span>${x.visit_id?`<span class="muted">${esc(x.visit_status||'')}</span>`:`<button onclick="startVisit(${x.id})">📍 Ташрифни бошлаш</button>`}${x.visit_id&&!x.ended_server?`<button class="secondary" onclick="endVisit(${x.visit_id})">Ташрифни якунлаш</button>`:''}</div></div>`).join('')||'<p>Натижа йўқ</p>';
  }catch(e){$('list').innerHTML='<p class="bad">Бугунги маълумот юкланмади</p>';}
}
async function startVisit(id){
  try{
    if(!lastPos)throw Error('GPS жойлашуви ҳали олинмади');
    const c=lastPos.coords,d=await api('/api/visit/start',{method:'POST',body:JSON.stringify({consumer_id:id,lat:c.latitude,lon:c.longitude,accuracy:c.accuracy,client_event_id:'visit-'+me.id+'-'+id+'-'+Date.now()})});
    alert('Ташриф қайд этилди. Масофа: '+Math.round(d.distance_m)+' м');await loadToday();
  }catch(e){alert(e.message);}
}
async function endVisit(id){
  try{
    if(!lastPos)throw Error('GPS керак');const c=lastPos.coords;
    await api('/api/visit/end',{method:'POST',body:JSON.stringify({visit_id:id,lat:c.latitude,lon:c.longitude,accuracy:c.accuracy})});
    alert('Ташриф якунланди');await loadToday();
  }catch(e){alert(e.message);}
}
async function loadMetrics(){
  try{const d=await api('/api/metrics');$('dbState').textContent='База: '+d.integrity+' • Истеъмолчи: '+d.consumers+' • Ходим: '+d.employees+' • GPS: '+d.gps_points+' • Ташриф: '+d.visits;}catch(e){$('dbState').textContent='База: текширишда хатолик';}
}
async function loadEmployees(){
  try{
    const d=await api('/api/employees');
    $('employeeSelect').innerHTML='<option value="">Ходимни танланг</option>'+d.map(e=>`<option value="${e.id}">${esc(e.employee_name)} — ${esc(e.region||'')} / ${esc(e.district||'')}</option>`).join('');
    $('employeeTable').innerHTML='<table><tr><th>Ходим</th><th>Вилоят</th><th>Туман/шаҳар</th><th>Лавозим</th><th>Телефон</th></tr>'+d.map(e=>`<tr><td>${esc(e.employee_name)}</td><td>${esc(e.region||'—')}</td><td>${esc(e.district||'—')}</td><td>${esc(e.position||'—')}</td><td>${esc(e.phone||'—')}</td></tr>`).join('')+'</table>';
  }catch(e){$('employeeTable').innerHTML='<p class="bad">Ходимлар маълумоти юкланмади</p>';}
}
let consumerPage=1;
async function loadConsumers(page=consumerPage){
  consumerPage=page;
  try{
    const term=(($('consumerSearch')?.value)||'').trim(),d=await api('/api/consumers?page='+page+'&limit=100'+(term?'&q='+encodeURIComponent(term):''));
    $('consumerCount').textContent='Кўрсатилаяпти: '+d.items.length+' / '+d.total;
    $('consumerList').innerHTML=d.items.map(x=>`<div class="consumer clickable" onclick="showConsumer(${x.id})"><div class="row"><b style="margin-right:auto">${esc(x.name||'Номсиз')}</b><span class="pill">ID ${x.id}</span></div><div class="muted">Вилоят: ${esc(x.region||x.branch||'—')}</div><div class="muted">Туман/шаҳар: ${esc(x.district||'—')} • Маҳалла: ${esc(x.mahalla||'—')}</div><div class="muted">Манзил: ${esc(x.street||'—')} • Телефон: ${esc(x.phone||'—')}</div><div class="muted">Категория: ${esc(x.category||'—')} • Фаолият: ${esc(x.activity||'—')}</div><div class="muted">GPS: ${x.lat!=null&&x.lon!=null?'бор':'йўқ'}</div></div>`).join('')||'<p>Истеъмолчи топилмади</p>';
    const old=$('consumerPager');if(old)old.remove();
    if(d.total>100){const pager=document.createElement('div');pager.id='consumerPager';pager.className='row';pager.innerHTML=`<button class="secondary" ${page<=1?'disabled':''} onclick="loadConsumers(${page-1})">← Олдинги</button><span class="muted">Саҳифа ${page} / ${Math.ceil(d.total/100)}</span><button class="secondary" ${!d.has_more?'disabled':''} onclick="loadConsumers(${page+1})">Кейинги →</button>`;$('consumerList').after(pager);}
  }catch(e){$('consumerList').innerHTML='<p class="bad">Истеъмолчилар рўйхатини юклашда хатолик</p>';}
}
async function showConsumer(id){
  try{
    const c=await api('/api/consumers/'+id);
    $('consumerModal').classList.remove('hidden');$('consumerModal').classList.add('open');
    $('consumerDetail').innerHTML=`<h3>${esc(c.name||'Истеъмолчи')}</h3><div class="detailgrid"><div><b>ID</b><span>${c.id}</span></div><div><b>Вилоят</b><span>${esc(c.region||c.branch||'—')}</span></div><div><b>Туман/шаҳар</b><span>${esc(c.district||'—')}</span></div><div><b>Маҳалла</b><span>${esc(c.mahalla||'—')}</span></div><div><b>Кўча/манзил</b><span>${esc(c.street||'—')}</span></div><div><b>Телефон</b><span>${esc(c.phone||'—')}</span></div><div><b>Категория</b><span>${esc(c.category||'—')}</span></div><div><b>Фаолият</b><span>${esc(c.activity||'—')}</span></div><div><b>GPS</b><span>${c.lat!=null&&c.lon!=null?esc(c.lat+', '+c.lon):'Ўрнатилмаган'}</span></div></div><hr><h4>Ташрифлар тарихи — қайси ходим келган</h4><div id="consumerVisitors">Текширилмоқда...</div>`;
    const d=await api('/api/consumer-visits?consumer_id='+id),rows=d.visits||[];
    $('consumerVisitors').innerHTML=rows.length?rows.map(v=>`<div class="visitor"><b>${esc(v.employee_name||'Номаълум ходим')}</b><span>Ҳудуд: ${esc(v.region||'—')} • ${esc(v.district||'—')}</span><span>Кирган вақт: ${esc(v.started_server||'—')}</span><span>Чиққан вақт: ${esc(v.ended_server||'—')}</span><span>Ҳолат: ${esc(v.status||'—')} • Масофа: ${v.distance_m!=null?Math.round(v.distance_m)+' м':'—'}</span><span>GPS кириш: ${v.start_lat!=null?esc(v.start_lat+', '+v.start_lon):'—'}</span></div>`).join(''):'<div class="bad">Бу истеъмолчига ҳали ташриф қайд этилмаган.</div>';
  }catch(e){alert(e.message);}
}
function closeConsumer(){$('consumerModal')?.classList.remove('open');$('consumerModal')?.classList.add('hidden');}
async function assign(){
  try{const eid=Number($('employeeSelect').value),cid=Number($('consumerId').value),date=$('assignDate').value||today();if(!eid||!cid)return alert('Ходим ва истеъмолчини танланг');await api('/api/assign',{method:'POST',body:JSON.stringify({employee_id:eid,consumer_id:cid,work_date:date})});alert('Режага қўшилди');await loadReport();}catch(e){alert(e.message==='TERRITORY_MISMATCH'?'Ходим ва истеъмолчи ҳудуди мос эмас':e.message);}
}
async function loadReport(){
  try{const d=await api('/api/report?date='+encodeURIComponent($('reportDate').value||today())),r=d.result||[];let p=0,v=0,m=0,s=0;
    $('report').innerHTML='<table><tr><th>Ходим</th><th>Ҳудуд</th><th>Режа</th><th>Ташриф</th><th>Ташрифсиз</th><th>Шубҳали</th><th>%</th><th>Маршрут</th></tr>'+r.map(x=>{p+=x.planned;v+=x.visited;m+=x.not_visited;s+=x.suspicious;return `<tr><td>${esc(x.employee)}</td><td>${esc(x.region)} / ${esc(x.district)}</td><td>${x.planned}</td><td>${x.visited}</td><td>${x.not_visited}</td><td>${x.suspicious}</td><td>${x.completion}%</td><td><button onclick="showRoute(${x.employee_id})">Кўриш</button></td></tr>`}).join('')+'</table>';
    $('aPlanned').textContent=p;$('aVisited').textContent=v;$('aMissing').textContent=m;$('aSuspicious').textContent=s;
  }catch(e){$('report').innerHTML='<p class="bad">Ҳисобот юкланмади</p>';}
}
async function loadMonthly(){
  try{const d=await api('/api/monthly?month='+encodeURIComponent($('monthDate').value||month()));$('monthly').innerHTML='<table><tr><th>Ходим</th><th>Ҳудуд</th><th>Режа</th><th>Ташриф</th><th>VALID</th><th>Шубҳали</th><th>%</th></tr>'+d.result.map(x=>`<tr><td>${esc(x.employee_name)}</td><td>${esc(x.region||'')} / ${esc(x.district||'')}</td><td>${x.planned}</td><td>${x.visited}</td><td>${x.valid}</td><td>${x.suspicious}</td><td>${x.completion}%</td></tr>`).join('')+'</table>';}catch(e){$('monthly').innerHTML='<p class="bad">Ойлик ҳисобот юкланмади</p>';}
}
async function loadConsumerMonthly(){
  try{const d=await api('/api/consumer-monthly?month='+encodeURIComponent($('monthDate').value||month()));$('consumerMonthly').innerHTML='<table><tr><th>Истеъмолчи</th><th>Вилоят</th><th>Туман</th><th>Ташриф</th><th>Ходимлар</th><th>Охирги ташриф</th><th>Маълумот</th></tr>'+d.result.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.region||x.branch||'—')}</td><td>${esc(x.district||'—')}</td><td><b>${x.visits}</b></td><td>${x.employees}</td><td>${esc(x.last_visit||'—')}</td><td><button onclick="showConsumer(${x.consumer_id})">Очиш</button></td></tr>`).join('')+'</table>';}catch(e){$('consumerMonthly').innerHTML='<p class="bad">Истеъмолчи ойлик маълумотлари юкланмади</p>';}
}
async function showRoute(employeeId){
  try{
    tab('mapTab',document.querySelector('.tabbtn:nth-of-type(6)'));
    const d=await api('/api/route?employee_id='+employeeId+'&date='+today());
    if(!window.L)return;
    if(map){map.remove();map=null;}
    map=L.map('map').setView([41.3,69.25],6);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
    const pts=(d.gps||[]).filter(x=>Number.isFinite(+x.lat)&&Number.isFinite(+x.lon)).map(x=>[+x.lat,+x.lon]);
    routeMarkers=[];(d.visits||[]).forEach(v=>{if(v.start_lat!=null){const mk=L.marker([+v.start_lat,+v.start_lon]).addTo(map).bindPopup(`<b>${esc(v.name)}</b><br>Ташриф: ${esc(v.started_server)}<br>Ҳолат: ${esc(v.status)}<br>Масофа: ${Math.round(v.distance_m||0)} м`);routeMarkers.push(mk);}});
    if(pts.length>1){routeLine=L.polyline(pts).addTo(map);map.fitBounds(routeLine.getBounds(),{padding:[20,20]});}else if(pts.length===1)map.setView(pts[0],15);
    setTimeout(()=>map.invalidateSize(),200);
  }catch(e){alert('Маршрут юкланмади: '+e.message);}
}
async function loadLive(){
  try{const d=await api('/api/live');$('liveTable').innerHTML=d.rows?.length?'<table><tr><th>Ходим</th><th>Ҳудуд</th><th>GPS вақти</th><th>Аниқлик</th></tr>'+d.rows.map(x=>`<tr><td>${esc(x.employee_name)}</td><td>${esc(x.region||'')} / ${esc(x.district||'')}</td><td>${esc(x.ts_server)}</td><td>${x.accuracy!=null?Math.round(x.accuracy)+' м':'—'}</td></tr>`).join('')+'</table>':'<p class="muted">Ҳозир онлайн GPS юбориб турган ходим йўқ.</p>';}catch(e){$('liveTable').innerHTML='<p class="bad">Онлайн маълумот юкланмади</p>';}
}
async function loadAudit(){
  try{const d=await api('/api/audit'),state=d.chain_valid?'✅ Audit занжири бутун':'❌ Audit занжирида хато';$('auditState').innerHTML=`<p class="${d.chain_valid?'ok':'bad'}">${state} • ${d.count} та ёзув</p>`;$('auditRows').innerHTML=(d.rows||[]).slice(0,100).map(x=>`<tr><td>${x.id}</td><td>${esc(x.ts_server)}</td><td>${esc(x.actor_id??'')}</td><td>${esc(x.action)}</td></tr>`).join('');}catch(e){$('auditState').innerHTML='<p class="bad">Audit текширилмади</p>';}
}
window.tab=tab;window.loadToday=loadToday;window.startVisit=startVisit;window.endVisit=endVisit;window.loadConsumers=loadConsumers;window.showConsumer=showConsumer;window.closeConsumer=closeConsumer;window.loadEmployees=loadEmployees;window.loadReport=loadReport;window.loadMonthly=loadMonthly;window.loadConsumerMonthly=loadConsumerMonthly;window.showRoute=showRoute;window.loadLive=loadLive;window.loadAudit=loadAudit;window.assign=assign;window.logout=logout;
window.addEventListener('DOMContentLoaded',()=>{
  $('consumerModal')?.classList.add('hidden');$('consumerModal')?.classList.remove('open');
  if($('reportDate')&&!$('reportDate').value)$('reportDate').value=today();
  if($('monthDate')&&!$('monthDate').value)$('monthDate').value=month();
  $('loginForm')?.addEventListener('submit',e=>{e.preventDefault();loginApp();});
  if(token)boot();else show('loginScreen');
  setInterval(()=>{if(me?.role==='admin')Promise.allSettled([loadMetrics(),loadReport(),loadLive(),loadAudit()]);else if(me?.role==='employee')loadToday();},30000);
  setInterval(()=>{if(me?.role==='admin')Promise.allSettled([loadMonthly(),loadConsumerMonthly()]);},300000);
});
