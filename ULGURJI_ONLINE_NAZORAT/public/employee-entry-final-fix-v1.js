(()=>{
const boot=()=>{
 const p=document.querySelector('#employee-entry-panel');
 if(!p)return;
 const cards=p.querySelectorAll('.v3steps>.v3card');
 if(cards[1]){
  const dataCard=cards[1];
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
  // Remove only the requested inventory/network-disconnection block.
  ['#v3-next','#v3-gas-count','#v3-gas-types','#v3-meter-type','#v3-meter-condition','#v4-meter-reading'].forEach(sel=>{
   const el=dataCard.querySelector(sel);if(el)(el.closest('label,.v3field,.v3row,.v3item')||el.parentElement)?.remove();
  });
  ['#v3-gas-photo','#v3-meter-photo','#v4-act-photo','#v4-disconnected-photo'].forEach(sel=>{
   const el=dataCard.querySelector(sel);if(el)(el.closest('.v3file')||el)?.remove();
  });
  dataCard.querySelectorAll('label,.v3field,.v3item,.v3row').forEach(el=>{
   const t=(el.textContent||'').trim();
   if(/Жойни хатловдан ўтказ|Жойни хатловдан утказ|Тармоқдан учириш\/ажратиш|Тармоқдан учириш|Тармоқдан учирилди\?|Тармоқдан ўчирилди\?|Тармоқдан ажрат|Истеъмолчи тармоққа уланганми\?|Уланган|Ажратилган|Хатлов фотоси|Тармоқ фотоси|Газ жиҳозлари фотоси|Ҳисоблагич фотоси|Уланиш\/ажратиш фотоси|Жами газ жиҳозлари сони|Газ жиҳозлари турлари|Мавжуд ҳисоблагичлар тури/.test(t))el.remove();
  });
 }
 const hint=p.querySelector('.v3hint');
 if(hint)hint.textContent='1) Истеъмолчини қидиринг ва танланг → 2) маълумотни киритинг, ҳужжат/асосий фотоларни бириктиринг ва сақланг ёки раҳбарга юборинг.';
 const token=()=>localStorage.getItem('uog_token')||localStorage.getItem('token')||localStorage.getItem('authToken')||sessionStorage.getItem('token')||'';
 const $=s=>p.querySelector(s);
 const read=files=>Promise.all(Array.from(files||[]).map(f=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok({name:f.name,type:f.type,data:r.result});r.onerror=()=>ok(null);r.readAsDataURL(f)}))).then(a=>a.filter(Boolean));
 const status=t=>{const x=$('#v3-status');if(x)x.textContent=t};
 const old=$('#v3-save');
 if(old&&!old.dataset.finalfixBound){
  const n=old.cloneNode(true);old.replaceWith(n);n.dataset.finalfixBound='1';
  n.addEventListener('click',async e=>{
   e.preventDefault();
   const cid=+($('#v3-consumer')?.value||0),name=$('#v3-manual')?.value.trim()||'';
   if(!cid&&!name)return status('❌ Аввало истеъмолчини танланг ёки номини ёзинг.');
   status('Сақланмоқда...');
   try{
    const files=[];
    for(const id of ['v3-stamp-photo','v3-extra-photo','v3-doc']){const x=$('#'+id);if(x)files.push(...await read(x.files))}
    const r=await fetch('/api/employee-entry',{method:'POST',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify({consumer_id:cid||undefined,consumer_name:name,status:'DRAFT',contact_name:$('#v3-contact')?.value||'',order_amount:$('#v3-amount')?.value||'',payment_status:$('#v3-debt')?.value||'',next_action:'',notes:$('#v3-notes')?.value||'',fieldwork_data:{debt_type:$('#v3-debt')?.value||'',activity:$('#v3-activity')?.value||'',stamp_number:$('#v3-stamp')?.value.trim()||''},attachments:files})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(d.error||'Сақлаш хатоси');
    status('✅ Маълумот муваффақиятли сақланди.');
   }catch(e){status('❌ '+e.message)}
  });
 }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500));else setTimeout(boot,500);
[1200,2500,5000].forEach(t=>setTimeout(boot,t));
new MutationObserver(()=>boot()).observe(document.documentElement,{childList:true,subtree:true});
})();
