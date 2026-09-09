(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const today = () => new Date().toISOString().slice(0,10);
  const token = () => localStorage.getItem('uog_token') || '';
  async function api2(url, opt={}) {
    const headers = {...(opt.headers||{})};
    if (!headers['Content-Type'] && opt.body) headers['Content-Type']='application/json';
    if (token()) headers.Authorization='Bearer '+token();
    const r=await fetch(url,{...opt,headers,cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw Error(d.error||('HTTP_'+r.status));
    return d;
  }
  function addStyle(){
    if($('finalFixStyles')) return;
    const s=document.createElement('style');s.id='finalFixStyles';
    s.textContent=`
      .employee-only-note{padding:12px 14px;border:1px solid #dbeafe;background:#f7fbff;border-radius:12px;margin:12px 0;color:#334155}
      .route-modal{position:fixed;inset:0;background:rgba(2,6,23,.68);z-index:120000;display:none;align-items:center;justify-content:center;padding:16px}
      .route-modal.open{display:flex}.route-box{width:min(1100px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 30px 90px rgba(0,0,0,.28);padding:20px}
      .route-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid #e5eaf2;padding-bottom:14px;margin-bottom:14px}.route-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.route-stat{background:#f8fafc;border:1px solid #e8edf4;border-radius:12px;padding:12px}.route-stat small{display:block;color:#718096}.route-stat b{display:block;font-size:20px;margin-top:3px}.route-list{margin-top:14px}.route-item{padding:11px 0;border-bottom:1px solid #edf1f6}.route-item:last-child{border-bottom:0}.route-time{font-weight:800}.route-coord{font-size:11px;color:#718096}.map-close-final{margin-left:auto}
      @media(max-width:700px){.route-grid{grid-template-columns:1fr 1fr}.route-box{padding:14px}}
    `;document.head.appendChild(s);
  }
  function routeModal(){
    let m=$('routeDetailModal');if(m)return m;
    m=document.createElement('div');m.id='routeDetailModal';m.className='route-modal';
    m.innerHTML='<div class="route-box" onclick="event.stopPropagation()"><div class="route-head"><div><div class="eyebrow">ХОДИМ МАРШРУТИ</div><h2 id="routeTitle" style="margin:0">Кунлик маршрут тафсилотлари</h2><div id="routeSub" class="muted"></div></div><button class="btn secondary sm" id="routeCloseBtn">✕ Ёпиш</button></div><div id="routeBody"></div></div>';
    m.onclick=e=>{if(e.target===m)m.classList.remove('open')};document.body.appendChild(m);$('routeCloseBtn').onclick=()=>m.classList.remove('open');return m;
  }
  window.showRoute = async function(employeeId, date=today()){
    try{
      const d=await api2('/api/route?employee_id='+encodeURIComponent(employeeId)+'&date='+encodeURIComponent(date));
      const gps=d.gps||[], visits=d.visits||[], m=routeModal();
      const emp=(visits[0]?.employee_name)||'Ходим';
      $('routeTitle').textContent=emp+' — кунлик иш тафсилоти';
      $('routeSub').textContent=date+' • GPS нуқталар: '+gps.length+' • ташрифлар: '+visits.length;
      const durations=visits.map(v=>v.ended_server&&v.started_server?(new Date(v.ended_server)-new Date(v.started_server))/60000:0).filter(x=>x>0);
      const totalMin=Math.round(durations.reduce((a,b)=>a+b,0));
      const first=gps[0]?.ts_server,last=gps[gps.length-1]?.ts_server;
      $('routeBody').innerHTML='<div class="route-grid"><div class="route-stat"><small>GPS нуқталари</small><b>'+gps.length+'</b></div><div class="route-stat"><small>Ташрифлар</small><b>'+visits.length+'</b></div><div class="route-stat"><small>Ишланган вақт</small><b>'+totalMin+' дақ.</b></div><div class="route-stat"><small>GPS оралиғи</small><b>'+(first&&last?esc(first.slice(11,19)+' — '+last.slice(11,19)):'—')+'</b></div></div><div class="route-list"><h3>Ташрифлар тафсилоти</h3>'+(visits.map(v=>'<div class="route-item"><div class="route-time">'+esc(v.name||'Истеъмолчи')+' <span class="pill">ID '+v.consumer_id+'</span></div><div class="muted">Кириш: '+esc(v.started_server||'—')+' • Чиқиш: '+esc(v.ended_server||'—')+'</div><div class="muted">Ҳолат: '+esc(v.status||'—')+' • Масофа: '+(v.distance_m!=null?Math.round(v.distance_m)+' м':'—')+'</div><div class="muted">Натижа: '+esc(v.outcome||'—')+' • Изоҳ: '+esc(v.notes||'—')+'</div></div>').join('')||'<div class="empty">Бу санада ташриф қайд этилмаган.</div>')+'</div><div class="route-list"><h3>GPS маршрут нуқталари</h3>'+(gps.map(g=>'<div class="route-item"><span class="route-time">'+esc(g.ts_server||'—')+'</span><div class="route-coord">Координата: '+esc(g.lat)+', '+esc(g.lon)+' • Аниқлик: '+(g.accuracy!=null?Math.round(g.accuracy)+' м':'—')+'</div></div>').join('')||'<div class="empty">GPS нуқталари йўқ.</div>')+'</div><div class="row" style="margin-top:14px"><button class="btn secondary" onclick="document.getElementById(\'routeDetailModal\').classList.remove(\'open\')">✕ Ёпиш</button><button class="btn primary" onclick="document.getElementById(\'routeDetailModal\').classList.remove(\'open\');window.tab?.(\'mapTab\',document.querySelector(\'.tabbtn[onclick*=mapTab]\'))">🗺️ Харитага очиш</button></div>';
      m.classList.add('open');
    }catch(e){alert('Ходим маршрути маълумотини очиб бўлмади: '+e.message)}
  };
  function hideAdminEmployeeTab(){
    const admin=$('admin');if(!admin)return;
    admin.querySelectorAll('.tabs .tabbtn').forEach(b=>{if((b.textContent||'').includes('Ходимлар')){b.style.display='none'}});
  }
  function ensureMapClose(){
    const tab=$('mapTab');if(!tab)return;
    const title=tab.querySelector('.section-title');
    if(title&&!title.querySelector('[data-final-map-close]')){
      const b=document.createElement('button');b.className='btn secondary sm map-close-final';b.dataset.finalMapClose='1';b.textContent='✕ Харитани ёпиш';b.onclick=()=>{if(map&&typeof map.remove==='function'){try{map.remove()}catch{}};if(window.map)window.map=null;tab.classList.add('hidden');const first=document.querySelector('.tabs .tabbtn');if(first&&typeof window.tab==='function')window.tab('dashboardTab',first)};title.appendChild(b);
    }
  }
  function fix(){addStyle();hideAdminEmployeeTab();ensureMapClose();
    const admin=$('admin');
    if(admin&&!$('employeeRoleNote')){const n=document.createElement('div');n.id='employeeRoleNote';n.className='employee-only-note';n.innerHTML='<b>Ходимлар кириши:</b> ходим логини орқали алоҳида иш режимида киради. Ходимга раҳбарлик ҳисоботлари, бошқарув, бириктириш ва бошқа ўзгартириш ҳуқуқлари берилмайди.';admin.querySelector('.admin-heading')?.after(n)}
  }
  function start(){fix();setTimeout(fix,100);setTimeout(fix,500);setTimeout(fix,1500);new MutationObserver(fix).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
