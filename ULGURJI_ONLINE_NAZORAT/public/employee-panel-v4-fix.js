(()=>{
const run=()=>{const p=document.querySelector('#employee-entry-panel');if(!p||p.dataset.v4==='1')return false;const $=s=>p.querySelector(s);
// Keep the restored second step, but remove the physical-inventory/network-disconnection block requested by the user.
const stepCards=p.querySelectorAll('.v3steps>.v3card');
if(stepCards[1]){const title=stepCards[1].querySelector('.v3title');if(title)title.textContent='2-қадам — Маълумот';}
// Remove network-disconnection field and all requested inventory-only fields.
['#v3-next','#v3-gas-count','#v3-gas-types','#v3-meter-type','#v3-meter-condition','#v4-meter-reading'].forEach(sel=>{const el=$(sel);if(el){const wrap=el.closest('label,.v3field,.v3row,.v3item')||el.parentElement;wrap?.remove();}});
// Remove inventory/network-disconnection photo uploads.
['#v3-gas-photo','#v3-meter-photo','#v4-act-photo','#v4-disconnected-photo'].forEach(sel=>{const el=$(sel);if(el)(el.closest('.v3file')||el).remove();});
// Remove labels/cards whose visible text belongs only to the removed block.
p.querySelectorAll('label,.v3field,.v3item,.v3row').forEach(el=>{const t=(el.textContent||'').trim();if(/Жойни хатловдан ўтказ|Жойни хатловдан утказ|Тармоқдан учирилди\?|Тармоқдан ўчирилди\?|Тармоқдан ажрат|Барча мавжуд газ жиҳозлари|Барча мавжуд ҳисоблагичлар/.test(t))el.remove();});
const manual=$('#v3-manual');if(manual)manual.placeholder='Рўйхатда йўқ бўлса, истеъмолчи номини ёзинг';
const contact=$('#v3-contact');if(contact)contact.closest('label,.v3field,.v3row,.v3item')?.remove();
const debt=$('#v3-debt');if(debt)debt.innerHTML='<option value="">Қарздорлик турини танланг</option><option>Олдиндан тўловдан қарздорлик</option><option>Дебитор қарздорлик</option><option>Қарздорлик мавжуд эмас</option>';
const stamp=p.querySelector('#v3-stamp-photo')?.closest('.v3file');if(stamp){const s=stamp.querySelector('small');if(s)s.textContent='📷 Тамға фотоси';}
// Replace save/send handlers so only the remaining fields are submitted.
const token=()=>localStorage.getItem('uog_token')||localStorage.getItem('token')||localStorage.getItem('authToken')||sessionStorage.getItem('token')||'';
let gps=null;const status=t=>{const x=$('#v3-status');if(x)x.textContent=t};
const locate=()=>new Promise((ok,no)=>{if(!navigator.geolocation)return no(Error('GPS_UNSUPPORTED'));const s=$('#v3-gps-state');if(s)s.textContent='Локация аниқланмоқда...';navigator.geolocation.getCurrentPosition(x=>{gps={lat:x.coords.latitude,lon:x.coords.longitude,accuracy:x.coords.accuracy,speed:x.coords.speed};if(s)s.textContent='✅ '+gps.lat.toFixed(6)+', '+gps.lon.toFixed(6)+' • ±'+Math.round(gps.accuracy||0)+' м';ok(gps)},e=>{if(s)s.textContent='❌ Локация аниқланмади';no(e)},{enableHighAccuracy:true,maximumAge:0,timeout:20000})});
const read=files=>Promise.all(Array.from(files||[]).map(f=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok({name:f.name,type:f.type,data:r.result});r.onerror=()=>ok(null);r.readAsDataURL(f)}))).then(x=>x.filter(Boolean));
const send=async state=>{const cid=+($('#v3-consumer')?.value||0),manualName=$('#v3-manual')?.value.trim()||'';if(!cid&&!manualName)return status('❌ Истеъмолчини қидириб танланг ёки номини киритинг.');if(!gps)try{await locate()}catch{return status('❌ Локацияни аниқлаш керак.')};if(state==='SUBMITTED'&&(!gps||+gps.accuracy>10))return status('❌ GPS аниқлиги 10 метрдан ошди. Аниқроқ локация олиб қайта юборинг.');
 const files=[];for(const id of ['v3-stamp-photo','v3-extra-photo','v3-doc']){const x=$('#'+id);if(x)files.push(...await read(x.files))}
 const fw={debt_type:$('#v3-debt')?.value||'',activity:$('#v3-activity')?.value||'',stamp_number:$('#v3-stamp')?.value.trim()||''};
 status(state==='SUBMITTED'?'Юборилмоқда...':'Сақланмоқда...');try{const r=await fetch('/api/employee-entry',{method:'POST',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify({consumer_id:cid||undefined,consumer_name:manualName,status:state,contact_name:'',order_amount:$('#v3-amount')?.value||'',payment_status:$('#v3-debt')?.value||'',next_action:'',notes:$('#v3-notes')?.value||'',lat:gps.lat,lon:gps.lon,accuracy:gps.accuracy,fieldwork_data:fw,attachments:files})});const d=await r.json();if(!r.ok)throw Error(d.error||'Хатолик');status(state==='SUBMITTED'?'✅ Раҳбарга юборилди.':'✅ Маълумот сақланди.')}catch(e){status('❌ '+e.message)}};
const oldSave=$('#v3-save'),oldSend=$('#v3-send');if(oldSave){const n=oldSave.cloneNode(true);oldSave.replaceWith(n);n.addEventListener('click',e=>{e.preventDefault();send('DRAFT')})}if(oldSend){const n=oldSend.cloneNode(true);oldSend.replaceWith(n);n.addEventListener('click',e=>{e.preventDefault();send('SUBMITTED')})}
p.dataset.v4='1';return true};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,300));else setTimeout(run,300);[700,1500,3000].forEach(x=>setTimeout(run,x));new MutationObserver(()=>run()).observe(document.documentElement,{childList:true,subtree:true});
})();