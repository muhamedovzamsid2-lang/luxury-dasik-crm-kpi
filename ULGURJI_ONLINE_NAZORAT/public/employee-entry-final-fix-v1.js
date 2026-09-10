(()=>{
const boot=()=>{
 const p=document.querySelector('#employee-entry-panel');
 if(!p||p.dataset.finalfix==='1')return;
 const cards=p.querySelectorAll('.v3steps>.v3card');
 if(cards[1]){
  const dataCard=cards[1];
  const title=dataCard.querySelector('.v3title');
  if(title)title.textContent='2-қадам — Маълумот ва хатлов';
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
 }
 const hint=p.querySelector('.v3hint');
 if(hint)hint.textContent='1) Истеъмолчини қидиринг ва танланг → 2) маълумот ва хатловни киритинг, ҳужжат/фотоларни бириктиринг ва сақланг ёки раҳбарга юборинг.';
 const token=()=>localStorage.getItem('uog_token')||localStorage.getItem('token')||localStorage.getItem('authToken')||sessionStorage.getItem('token')||'';
 const $=s=>p.querySelector(s);
 const read=files=>Promise.all(Array.from(files||[]).map(f=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok({name:f.name,type:f.type,data:r.result});r.onerror=()=>ok(null);r.readAsDataURL(f)}))).then(a=>a.filter(Boolean));
 const status=t=>{const x=$('#v3-status');if(x)x.textContent=t};
 const old=$('#v3-save');
 if(old){
  const n=old.cloneNode(true);old.replaceWith(n);
  n.addEventListener('click',async e=>{
   e.preventDefault();
   const cid=+($('#v3-consumer')?.value||0),name=$('#v3-manual')?.value.trim()||'';
   if(!cid&&!name)return status('❌ Аввало истеъмолчини танланг ёки номини ёзинг.');
   status('Сақланмоқда...');
   try{
    const files=[];
    for(const id of ['v3-stamp-photo','v3-gas-photo','v3-meter-photo','v3-extra-photo','v3-doc']){const x=$('#'+id);if(x)files.push(...await read(x.files))}
    const r=await fetch('/api/employee-entry',{method:'POST',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify({consumer_id:cid||undefined,consumer_name:name,status:'DRAFT',contact_name:$('#v3-contact')?.value||'',order_amount:$('#v3-amount')?.value||'',payment_status:$('#v3-debt')?.value||'',next_action:$('#v3-next')?.value||'',notes:$('#v3-notes')?.value||'',fieldwork_data:{debt_type:$('#v3-debt')?.value||'',disconnected:$('#v3-next')?.value||'',activity:$('#v3-activity')?.value||'',stamp_number:$('#v3-stamp')?.value.trim()||'',meter_types:$('#v3-meter-type')?.value.trim()||'',meter_condition:$('#v3-meter-condition')?.value||'',gas_appliance_count:$('#v3-gas-count')?.value||'',gas_appliance_types:$('#v3-gas-types')?.value.trim()||''},attachments:files})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(d.error||'Сақлаш хатоси');
    status('✅ Маълумот муваффақиятли сақланди.');
   }catch(e){status('❌ '+e.message)}
  });
 }
 p.dataset.finalfix='1';
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500));else setTimeout(boot,500);
[1200,2500,5000].forEach(t=>setTimeout(boot,t));
new MutationObserver(()=>boot()).observe(document.documentElement,{childList:true,subtree:true});
})();
