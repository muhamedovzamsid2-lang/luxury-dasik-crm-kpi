let token=localStorage.getItem("uog_token"), me=null, watchId=null, lastPos=null;
const $=id=>document.getElementById(id);
const api=async(url,opt={})=>{
  opt.headers={...(opt.headers||{}),Authorization:`Bearer ${token}`,"Content-Type":"application/json"};
  const r=await fetch(url,opt); const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"API_ERROR"); return d;
};
function show(id){["login","employee","admin"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden")}
async function login(){
  try{
    const d=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({login:$("loginUser").value,password:$("loginPass").value})}).then(r=>r.json());
    if(!d.token) throw new Error("Логин ёки парол хато");
    token=d.token;localStorage.setItem("uog_token",token);me=d.user;boot();
  }catch(e){$("loginMsg").textContent=e.message}
}
function logout(){localStorage.removeItem("uog_token");location.reload()}
async function boot(){
  try{me=await api("/api/me"); show(me.role==="admin"?"admin":"employee"); if(me.role==="admin"){loadReport();loadAudit();loadLive();setInterval(loadLive,10000)}else{ $("empName").textContent=me.name; loadToday();startGPS();}}
  catch{localStorage.removeItem("uog_token");show("login")}
}
function startGPS(){
  if(!navigator.geolocation){$("gpsState").textContent="❌ GPS мавжуд эмас";return}
  watchId=navigator.geolocation.watchPosition(async p=>{
    lastPos=p.coords;
    $("gpsState").textContent=`🟢 GPS: ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)} ±${Math.round(p.coords.accuracy||0)}м`;
    $("mapText").textContent=`📍 ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)} | accuracy ${Math.round(p.coords.accuracy||0)}m`;
    try{await api("/api/gps",{method:"POST",body:JSON.stringify({lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy,speed:p.coords.speed,client_event_id:crypto.randomUUID()})})}catch{}
  },e=>$("gpsState").textContent="⚠️ GPS: "+e.message,{enableHighAccuracy:true,maximumAge:10000,timeout:15000});
}
async function loadToday(){
  const d=await api("/api/today"); const q=($("search")?.value||"").toLowerCase();
  const items=d.items.filter(x=>(x.name+" "+x.district+" "+x.branch).toLowerCase().includes(q));
  const vv=d.items.filter(x=>x.visit_id).length;$("planned").textContent=d.items.length;$("visited").textContent=vv;$("notVisited").textContent=d.items.length-vv;$("completion").textContent=(d.items.length?Math.round(vv/d.items.length*100):0)+"%";
  $("list").innerHTML=items.map(x=>`<div class="consumer">
    <b>${esc(x.name)}</b><div class="muted">${esc(x.branch)} • ${esc(x.district)} • ${esc(x.category)}</div>
    <div class="row" style="margin-top:8px">
    ${x.visit_id?`<span class="${x.visit_status==="VALID"?"ok":"bad"}">${x.visit_status} • ${x.started_server}</span>`:`<button onclick="startVisit(${x.id})">📍 Ташрифни бошлаш</button>`}
    ${x.visit_id&&!x.ended_server?`<button class="secondary" onclick="endVisit(${x.visit_id})">Ташрифни якунлаш</button>`:""}
    </div></div>`).join("")||"<p>Натижа йўқ</p>";
}
async function startVisit(id){
  if(!lastPos){alert("GPS ҳали тайёр эмас.");return}
  try{
    const d=await api("/api/visit/start",{method:"POST",body:JSON.stringify({consumer_id:id,lat:lastPos.latitude,lon:lastPos.longitude,accuracy:lastPos.accuracy,client_event_id:crypto.randomUUID()})});
    alert(`${d.status}${d.distance_m==null?"":" • "+Math.round(d.distance_m)+" м"}`);loadToday();
  }catch(e){alert(e.message)}
}
async function endVisit(id){
  if(!lastPos){alert("GPS ҳали тайёр эмас.");return}
  await api("/api/visit/end",{method:"POST",body:JSON.stringify({visit_id:id,lat:lastPos.latitude,lon:lastPos.longitude,accuracy:lastPos.accuracy,client_event_id:crypto.randomUUID()}));loadToday();
}
async function loadReport(){
  const d=await api("/api/report"); let p=0,v=0,m=0,s=0;
  $("report").innerHTML=`<table><tr><th>Ходим</th><th>Режа</th><th>Ташриф</th><th>Ташрифсиз</th><th>Шубҳали</th><th>%</th></tr>`+
  d.result.map(x=>{p+=x.planned;v+=x.visited;m+=x.not_visited;s+=x.suspicious;return `<tr><td>${esc(x.employee)}</td><td>${x.planned}</td><td>${x.visited}</td><td class="bad">${x.not_visited}</td><td class="bad">${x.suspicious}</td><td>${x.completion}%</td></tr>`}).join("")+"</table>";
  $("aPlanned").textContent=p;$("aVisited").textContent=v;$("aMissing").textContent=m;$("aSuspicious").textContent=s;
}
async function loadAudit(){
  const d=await api("/api/audit"); $("auditState").innerHTML=d.chain_valid?`<span class="ok">✅ Audit chain бутун — ${d.rows.length} та ёзув текширилди.</span>`:`<span class="bad">🚨 Audit chain бузилган!</span>`;
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
if(token) boot();

async function loadLive(){
  try{
    const d=await api("/api/live");
    const rows=d.rows||[];
    $("mapDots").innerHTML=rows.map((x,i)=>{
      const left=(8+(i*19)%84), top=(15+(i*31)%70);
      return `<div class="dot" title="${esc(x.employee_name)} ${x.ts_server}" style="left:${left}%;top:${top}%"></div>`;
    }).join("");
  }catch{}
}
