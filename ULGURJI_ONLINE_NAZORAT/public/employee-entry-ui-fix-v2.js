(()=>{
'use strict';
if(window.__UOG_EMPLOYEE_ENTRY_UI_FIX_V2)return;
window.__UOG_EMPLOYEE_ENTRY_UI_FIX_V2=true;
const boot=()=>{
 const p=document.querySelector('#employee-entry-panel-final');
 if(!p)return;
 const $=s=>p.querySelector(s);
 const fields=$('#ef-fields');
 if(fields&&!fields.dataset.ready){
  fields.innerHTML=`
   <label>Натижа *<select id="ef-outcome"><option value="">Натижани танланг</option><option value="Газ етказиб берилди">Газ етказиб берилди</option><option value="Газ етказиб берилмади">Газ етказиб берилмади</option><option value="Объектда фаолият йўқ">Объектда фаолият йўқ</option><option value="Бошқа">Бошқа</option></select></label>
   <label>Қарздорлик тури *<select id="ef-debt"><option value="">Танланг</option><option value="Олдиндан тўловдан қарздорлик">Олдиндан тўловдан қарздорлик</option><option value="Дебитор қарздорлик">Дебитор қарздорлик</option><option value="Қарздорлик мавжуд эмас">Қарздорлик мавжуд эмас</option></select></label>
   <label>Тўлов ҳолати *<select id="ef-payment"><option value="">Танланг</option><option value="yes">Тўланган</option><option value="no">Тўланмаган</option></select></label>
   <label>Тўлов суммаси<input id="ef-amount" inputmode="decimal" placeholder="Сўмда"></label>
   <label>Ҳисоблагич сони *<input id="ef-meter-count" inputmode="numeric"></label>
   <label>Ҳисоблагич тури *<input id="ef-meter-type"></label>
   <label>Ҳисоблагич кўрсаткичи<input id="ef-meter-reading" inputmode="decimal"></label>
   <label>Тамға рақами *<input id="ef-stamp"></label>
   <label>Ҳисоблагич ҳолати *<select id="ef-condition"><option value="">Танланг</option><option>Соз</option><option>Носоз</option><option>Муддати ўтган</option></select></label>
   <label>Газ жиҳозлари сони *<input id="ef-gas-count" inputmode="numeric"></label>
   <label>Газ жиҳозлари тури *<input id="ef-gas-types"></label>
   <label>Стандарт ҳолати *<select id="ef-standard"><option value="">Танланг</option><option>Меъёрда</option><option>Меъёрга мос эмас</option></select></label>
   <label>ГОСТ/метрология муддати *<input id="ef-gost" type="date"></label>
   <label>Корхона ҳолати *<select id="ef-business"><option value="">Танланг</option><option value="active">Фаол</option><option value="inactive">Фаол эмас</option></select></label>
   <label class="wide">Изоҳ<textarea id="ef-note" placeholder="Қўшимча изоҳ"></textarea></label>`;
  fields.dataset.ready='1';
 }
 const status=t=>{const x=$('#ef-status');if(x)x.textContent=t};
 const locate=()=>new Promise((ok,no)=>navigator.geolocation?.getCurrentPosition(x=>ok({lat:x.coords.latitude,lon:x.coords.longitude,accuracy:x.coords.accuracy}),e=>no(Error(e.code===1?'Локацияга рухсат берилмаган':'GPS аниқланмади')),{enableHighAccuracy:true,maximumAge:5000,timeout:20000})||no(Error('GPS_UNSUPPORTED')));
 const required=()=>{const ids=['ef-consumer','ef-outcome','ef-debt','ef-payment','ef-meter-count','ef-meter-type','ef-stamp','ef-condition','ef-gas-count','ef-gas-types','ef-standard','ef-gost','ef-business'];const miss=ids.filter(id=>!$('#'+id)?.value).map(id=>id.replace('ef-',''));for(const id of ['ef-stamp-photo','ef-meter-photo','ef-reading-photo','ef-gas-photo'])if(!$('#'+id)?.files?.length)miss.push('мажбурий фото');if($('#ef-payment')?.value==='yes'&&!$('#ef-amount')?.value)miss.push('тўлов суммаси');if($('#ef-business')?.value==='inactive'){if(!$('#ef-act-photo')?.files?.length)miss.push('ажратиш далолатномаси');if(!$('#ef-disconnected-photo')?.files?.length)miss.push('ажратилганлик фотоси')}return miss};
 const read=f=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(f)});
 const collect=async(id,role)=>{const x=$('#'+id),a=[];if(x?.files)for(const f of x.files)a.push({name:f.name,type:f.type,data:await read(f),role});return a};
 const send=async(state)=>{const miss=required();if(miss.length)return status('❌ '+miss.join(', ')+' киритилиши шарт.');status('⏳ Юборилмоқда...');try{const gps=await locate();$('#ef-gps-state').textContent='✅ '+gps.lat.toFixed(6)+', '+gps.lon.toFixed(6)+' • ±'+Math.round(gps.accuracy||0)+' м';const files=[];for(const x of [['ef-stamp-photo','seal'],['ef-meter-photo','meter'],['ef-reading-photo','reading'],['ef-gas-photo','gas'],['ef-act-photo','act'],['ef-disconnected-photo','network_removed'],['ef-inactive-photo','network_removed'],['ef-extra-photo','extra'],['ef-document','document']])files.push(...await collect(x[0],x[1]));const fw={outcome:$('#ef-outcome').value,debt_type:$('#ef-debt').value,payment_status:$('#ef-payment').value,payment_amount:$('#ef-amount').value,meter_count:$('#ef-meter-count').value,meter_type:$('#ef-meter-type').value,meter_reading:$('#ef-meter-reading').value,stamp_number:$('#ef-stamp').value,meter_condition:$('#ef-condition').value,gas_count:$('#ef-gas-count').value,gas_types:$('#ef-gas-types').value,standard_status:$('#ef-standard').value,gost_expiry:$('#ef-gost').value,business_activity:$('#ef-business').value,company_active:$('#ef-business').value==='inactive'?'0':'1',notes:$('#ef-note').value};const token=localStorage.getItem('uog_token')||localStorage.getItem('ulgurji_token')||'';const r=await fetch('/api/employee-entry',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({consumer_id:Number($('#ef-consumer').value),status:state,order_amount:$('#ef-amount').value,payment_status:$('#ef-payment').value,notes:$('#ef-note').value,lat:gps.lat,lon:gps.lon,accuracy:gps.accuracy,fieldwork_data:fw,attachments:files})});const d=await r.json();if(!r.ok)throw Error(d.error||'SERVER_ERROR');status(state==='SUBMITTED'?'✅ Раҳбарга юборилди.':'✅ Сақланди.')}catch(e){status('❌ '+e.message)}};
 if(!p.dataset.submitFix){p.dataset.submitFix='1';$('#ef-send')?.addEventListener('click',()=>send('SUBMITTED'));$('#ef-save')?.addEventListener('click',()=>send('DRAFT'));$('#ef-gps')?.addEventListener('click',async()=>{try{const g=await locate();$('#ef-gps-state').textContent='✅ '+g.lat.toFixed(6)+', '+g.lon.toFixed(6)+' • ±'+Math.round(g.accuracy||0)+' м'}catch(e){status('❌ '+e.message)}});}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
setTimeout(boot,500);setTimeout(boot,1500);
})();