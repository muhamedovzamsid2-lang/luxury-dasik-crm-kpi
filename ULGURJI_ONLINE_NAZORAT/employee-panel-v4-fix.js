(()=>{
'use strict';
const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
ready(()=>{
  const root=document.querySelector('#employee-entry-panel'); if(!root) return;
  // Remove legacy consumer select/contact UI while keeping the name search.
  [...root.querySelectorAll('select')].forEach(el=>{
    const text=(el.parentElement?.innerText||'')+' '+(el.previousElementSibling?.innerText||'');
    if(/Истеъмолчини танланг/i.test(text)) el.closest('.field,.form-group,.card,.step,.e-grid>div')?.remove() || el.remove();
  });
  [...root.querySelectorAll('label')].forEach(l=>{
    if(/Алоқа қилган шахс/i.test(l.textContent||'')) l.closest('.field,.form-group,.card,.e-grid>div')?.remove();
  });
  const findByText=t=>[...root.querySelectorAll('label,h3,h4,p,div')].find(x=>(x.textContent||'').trim()===t);
  const dataHost=[...root.querySelectorAll('.step,.card,.e-grid')].find(x=>/Ҳисоблагич|Тармоқдан|Газ жиҳоз/i.test(x.innerText||'')) || root;
  const addField=(id,label,type='text',ph='')=>{
    if(root.querySelector('#'+id)) return root.querySelector('#'+id);
    const d=document.createElement('div'); d.className='field';
    d.innerHTML=`<label for="${id}">${label}</label><input id="${id}" type="${type}" ${ph?`placeholder="${ph}"`:''}>`;
    dataHost.appendChild(d); return d.querySelector('input');
  };
  const reading=addField('fw-meter-reading','Ҳисоблагич кўрсаткичи','number','Кўрсаткични киритинг');
  const addPhoto=(id,label,key)=>{
    if(root.querySelector('#'+id)) return;
    const d=document.createElement('div'); d.className='field'; d.innerHTML=`<label for="${id}">${label}</label><input id="${id}" type="file" accept="image/*" capture="environment" data-v4-key="${key}">`;
    dataHost.appendChild(d);
  };
  addPhoto('fw-act-photo','Тармоқдан ажратиш далолатномаси фотоси','network_disconnect_act_photo');
  addPhoto('fw-disconnected-photo','Тармоқдан ажратилган ҳолати фотоси','network_disconnected_state_photo');
  const updateCount=()=>{
    const el=[...root.querySelectorAll('*')].find(x=>/Топилди:\s*\d+/i.test(x.textContent||'') && x.children.length===0);
    if(el && !el.dataset.v4){ el.dataset.v4='1'; const n=(el.textContent.match(/\d[\d\s]*/)||['0'])[0].trim(); el.textContent='Қидирув натижаси: '+n+' та'; }
  };
  updateCount();
  new MutationObserver(updateCount).observe(root,{subtree:true,childList:true,characterData:true});
  const oldFetch=window.fetch;
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    if(!/\/api\/employee-entry(?:\?|$)/.test(url)) return oldFetch.apply(this,arguments);
    const token=document.querySelector('#fw-meter-reading')?.value||'';
    const extras={meter_reading:token,network_disconnect_act_photo:'',network_disconnected_state_photo:''};
    const f1=root.querySelector('#fw-act-photo')?.files?.[0], f2=root.querySelector('#fw-disconnected-photo')?.files?.[0];
    if(init?.body instanceof FormData){
      init.body.set('meter_reading',token);
      if(f1) init.body.append('fieldwork_photo_network_disconnect_act',f1,f1.name);
      if(f2) init.body.append('fieldwork_photo_network_disconnected_state',f2,f2.name);
      return oldFetch.call(this,input,init);
    }
    if(typeof init?.body==='string'){
      try{ const obj=JSON.parse(init.body); obj.fieldwork_data={...(obj.fieldwork_data||{}),meter_reading:token}; init={...init,body:JSON.stringify(obj)}; }catch{}
    }
    return oldFetch.call(this,input,init);
  };
});
})();
