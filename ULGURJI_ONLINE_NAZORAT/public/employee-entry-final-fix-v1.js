(()=>{
if(window.__UOG_EMPLOYEE_FINALFIX_V3)return;
window.__UOG_EMPLOYEE_FINALFIX_V3=true;
const boot=()=>{
 const p=document.querySelector('#employee-entry-panel');
 if(!p)return;
 const $=s=>p.querySelector(s);
 const cards=[...p.querySelectorAll('.v3steps>.v3card')];
 const dataCard=cards[1]||cards[0];
 if(!dataCard)return;
 const title=dataCard.querySelector('.v3title');
 if(title)title.textContent='2-қадам — Маълумот';
 const docCard=cards[2];
 if(docCard){
  const doc=docCard.querySelector('.v3file');
  const actions=docCard.querySelector('.v3actions');
  const statusEl=docCard.querySelector('#v3-status');
  if(doc)dataCard.appendChild(doc);
  if(actions)dataCard.appendChild(actions);
  if(statusEl)dataCard.appendChild(statusEl);
  docCard.remove();
 }
 // Remove the duplicate "Охирги киритилган маълумотлар" block so the employee sees one unified entry step.
 p.querySelectorAll('*').forEach(el=>{
  if(el.children.length>0)return;
  const t=(el.textContent||'').trim();
  if(t==='Охирги киритилган маълумотлар'){
   const box=el.closest('.v3card,section,.card,.panel');
   if(box&&box!==dataCard)box.remove();
   else el.remove();
  }
 });
 // Remove the old inventory/network section and its photos from the unified step.
 ['#v3-next','#v3-gas-count','#v3-gas-types','#v3-meter-type','#v3-meter-condition'].forEach(sel=>{
  const el=$(sel);if(el)(el.closest('label,.v3field,.v3row,.v3item')||el.parentElement)?.remove();
 });
 ['#v3-gas-photo','#v3-meter-photo','#v4-act-photo','#v4-disconnected-photo'].forEach(sel=>{
  const el=$(sel);if(el)(el.closest('.v3file')||el)?.remove();
 });
 dataCard.querySelectorAll('label,.v3field,.v3item,.v3row').forEach(el=>{
  const t=(el.textContent||'').trim();
  if(/Жойни хатловдан ўтказ|Жойни хатловдан утказ|Тармоқдан учириш\/ажратиш|Тармоқдан учириш|Тармоқдан учирилди\?|Тармоқдан ўчирилди\?|Тармоқдан ажрат|Истеъмолчи тармоққа уланганми\?|Уланган|Ажратилган|Хатлов фотоси|Тармоқ фотоси|Газ жиҳозлари фотоси|Ҳисоблагич фотоси|Уланиш\/ажратиш фотоси|Жами газ жиҳозлари сони|Газ жиҳозлари турлари|Мавжуд ҳисоблагичлар тури/.test(t))el.remove();
 });
 // Restore the two required fields: stamp number and meter reading.
 const grid=dataCard.querySelector('.v3grid')||dataCard;
 const stamp=$('#v3-stamp');
 if(stamp){
  stamp.placeholder='Тамға рақами';
  const lab=stamp.closest('label,.v3field,.v3item');
  if(lab){const small=lab.querySelector('small');if(small)small.textContent='Тамға рақами';}
 }
 if(!$('#v4-meter-reading')){
  const m=document.createElement('input');
  m.id='v4-meter-reading';
  m.placeholder='Ҳисоблагич кўрсаткичи';
  m.type='text';
  grid.appendChild(m);
 }
 const stampPhoto=$('#v3-stamp-photo')?.closest('.v3file');
 if(stampPhoto){const s=stampPhoto.querySelector('small');if(s)s.textContent='📷 Тамға фотоси';}
 const extraPhoto=$('#v3-extra-photo')?.closest('.v3file');
 if(extraPhoto){const s=extraPhoto.querySelector('small');if(s)s.textContent='📷 Қўшимча фотолар';}
 const hint=p.querySelector('.v3hint');
 if(hint)hint.textContent='1) Истеъмолчини қидиринг ва танланг → 2) маълумотни киритинг, тамға рақами ва ҳисоблагич кўрсаткичини ёзинг, фотолар/ҳужжатни бириктиринг ва сақланг ёки раҳбарга юборинг.';
 const token=()=>localStorage.getItem('uog_token')||localStorage.getItem('token')||localStorage.getItem('authToken')||sessionStorage.getItem('token')||'';
 const read=files=>Promise.all(Array.from(files||[]).map(f=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok({name:f.name,type:f.type,data:r.result});r.onerror=()=>ok(null);r.readAsDataURL(f)}))).then(a=>a.filter(Boolean));
 const status=t=>{const x=$('#v3-status');if(x)x.textContent=t};
 const send=async state=>{
  const cid=+($('#v3-consumer')?.value||0),name=$('#v3-manual')?.value.trim()||'';
  if(!cid&&!name)return status('❌ Аввало истеъмолчини танланг ёки номини ёзинг.');
  status(state==='SUBMITTED'?'Юборилмоқда...':'Сақланмоқда...');
  try{
   const files=[];
   for(const id of ['v3-stamp-photo','v3-extra-photo','v3-doc']){const x=$('#'+id);if(x)files.push(...await read(x.files))}
   const fw={debt_type:$('#v3-debt')?.value||'',activity:$('#v3-activity')?.value||'',stamp_number:$('#v3-stamp')?.value.trim()||'',meter_reading:$('#v4-meter-reading')?.value.trim()||'',stamp_photo_label:'Тамға фотоси',extra_photo_label:'Қўшимча фотолар'};
   const r=await fetch('/api/employee-entry',{method:'POST',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify({consumer_id:cid||undefined,consumer_name:name,status:state,contact_name:'',order_amount:$('#v3-amount')?.value||'',payment_status:$('#v3-debt')?.value||'',next_action:'',notes:$('#v3-notes')?.value||'',fieldwork_data:fw,attachments:files})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(d.error||'Хатолик');
   status(state==='SUBMITTED'?'✅ Раҳбарга юборилди.':'✅ Маълумот муваффақиятли сақланди.');
  }catch(e){status('❌ '+e.message)}
 };
 const oldSave=$('#v3-save'),oldSend=$('#v3-send');
 if(oldSave&&!oldSave.dataset.finalfixBound){const n=oldSave.cloneNode(true);oldSave.replaceWith(n);n.dataset.finalfixBound='1';n.addEventListener('click',e=>{e.preventDefault();send('DRAFT')})}
 if(oldSend&&!oldSend.dataset.finalfixBound){const n=oldSend.cloneNode(true);oldSend.replaceWith(n);n.dataset.finalfixBound='1';n.addEventListener('click',e=>{e.preventDefault();send('SUBMITTED')})}
};
const schedule=()=>{[300,1000,2000,4000,7000].forEach(t=>setTimeout(boot,t));};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();