(function(){
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function renderConsumerDetails(x){
    var rows=Object.entries(x||{}).filter(([k,v])=>v!==null&&v!==undefined&&v!=='').map(([k,v])=>'<div class="detail-row"><span>'+esc(k)+'</span><b>'+esc(typeof v==='object'?JSON.stringify(v):v)+'</b></div>').join('');
    var lat=x.lat,lon=x.lon;
    var gps=(lat!=null&&lon!=null)?'<div class="ok">📍 GPS: '+esc(lat)+', '+esc(lon)+'</div>':'<div class="bad">⚠️ GPS координата йўқ</div>';
    return '<details class="consumer-detail"><summary><b>'+esc(x.name||'Номсиз истеъмолчи')+'</b><span class="muted"> '+esc(x.branch||'')+' • '+esc(x.district||'')+'</span></summary><div class="detail-box">'+gps+rows+'</div></details>';
  }
  async function loadConsumerDetails(){
    var box=$('consumerList');if(!box||!window.api)return;
    try{
      var term=(($('consumerSearch')?.value)||'').trim();
      var d=await api('/api/consumers?limit=200'+(term?'&q='+encodeURIComponent(term):''));
      var items=Array.isArray(d)?d:(d.items||[]);
      $('consumerCount').textContent='Кўрсатилаяпти: '+items.length+' / '+(d.total??items.length)+' — истеъмолчини босиб маълумотини очинг';
      box.innerHTML=items.map(renderConsumerDetails).join('')||'<p>Истеъмолчи топилмади</p>';
    }catch(e){box.innerHTML='<p class="bad">Истеъмолчи маълумотларини юклашда хатолик: '+esc(e.message)+'</p>'}
  }
  function addStyles(){
    if($('uiV5Style'))return;
    var s=document.createElement('style');s.id='uiV5Style';s.textContent=''+
      '.consumer-detail{border:1px solid #dbe3ec;border-radius:12px;margin:7px 0;background:#fff;overflow:hidden}.consumer-detail summary{padding:13px;cursor:pointer;list-style:none}.consumer-detail summary::-webkit-details-marker{display:none}.consumer-detail summary:before{content:"▶";display:inline-block;margin-right:8px;font-size:11px}.consumer-detail[open] summary:before{content:"▼"}.detail-box{padding:12px;border-top:1px solid #e5e7eb;background:#f8fafc}.detail-row{display:flex;justify-content:space-between;gap:15px;padding:6px 0;border-bottom:1px solid #e5e7eb;font-size:12px}.detail-row span{color:#6b7280}.detail-row b{text-align:right;word-break:break-word}.admin-nav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.admin-nav button{width:auto!important}.admin-nav button.active{outline:3px solid #d1d5db}.admin-section-hidden{display:none!important}';document.head.appendChild(s);
  }
  function setupNav(){
    var admin=$('admin');if(!admin||$('adminNav'))return;
    var cards=[...admin.children].filter(x=>x.classList.contains('card')||x.id==='routeCard');
    var groups=[
      ['home','🏠 Бош саҳифа',[cards[0]]],
      ['consumers','🏪 Истеъмолчилар',[cards[1]]],
      ['employees','👥 Ходимлар',[cards[2],cards[3]]],
      ['reports','📊 Ҳисоботлар',[cards[4],cards[5],cards[6]]],
      ['map','🗺️ Харита',[cards[7]]],
      ['security','🔐 Назорат',[cards[8]]]
    ];
    var nav=document.createElement('div');nav.id='adminNav';nav.className='admin-nav';
    groups.forEach(function(g,i){var b=document.createElement('button');b.textContent=g[1];b.onclick=function(){groups.forEach(function(z){z[2].forEach(function(c){if(c)c.classList.add('admin-section-hidden')})});g[2].forEach(function(c){if(c)c.classList.remove('admin-section-hidden')});[...nav.children].forEach(x=>x.classList.remove('active'));b.classList.add('active');if(g[0]==='consumers')loadConsumerDetails();};nav.appendChild(b);});
    admin.insertBefore(nav,admin.children[1]);
    nav.children[0].click();
  }
  document.addEventListener('DOMContentLoaded',function(){addStyles();setTimeout(setupNav,300);setTimeout(function(){if($('admin')&&!$('admin').classList.contains('hidden'))loadConsumerDetails()},800)});
  window.loadConsumerDetails=loadConsumerDetails;
  var oldBoot=window.boot;
  setInterval(function(){if($('admin')&&!$('admin').classList.contains('hidden')&&$('consumerList')&&!$('consumerList').querySelector('details'))loadConsumerDetails()},5000);
})();
