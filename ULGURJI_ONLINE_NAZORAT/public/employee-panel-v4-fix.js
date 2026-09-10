(()=>{
const run=()=>{const p=document.querySelector('#employee-entry-panel');if(!p||p.dataset.v4==='1'||p.dataset.locfix==='1'||window.__UOG_EMPLOYEE_FINALFIX_V5)return false;const $=s=>p.querySelector(s);
const sel=$('#v3-consumer'); if(sel){sel.style.display='';const lab=p.querySelector('.v3select-label');if(lab)lab.style.display='';}
const manual=$('#v3-manual');if(manual){manual.placeholder='Рўйхатда йўқ бўлса, истеъмолчи номини ёзинг';}
const contact=$('#v3-contact');if(contact){contact.remove();}
const debt=$('#v3-debt');if(debt){debt.innerHTML='<option value="">Қарздорлик турини танланг</option><option>Олдиндан тўловдан қарздорлик</option><option>Дебитор қарздорлик</option><option>Қарздорлик мавжуд эмас</option>';}
const next=$('#v3-next');if(next){next.innerHTML='<option value="">Тармоқдан учирилди?</option><option>Ҳа</option><option>Йўқ</option>';}
const grid=p.querySelector('.v3grid');if(grid&&!$('#v4-meter-reading')){const m=document.createElement('input');m.id='v4-meter-reading';m.placeholder='Ҳисоблагич кўрсаткичи';grid.insertBefore(m,$('#v3-meter-type'));}
const photos=p.querySelector('.v3photo-grid');if(photos&&!$('#v4-act-photo')){const a=document.createElement('label');a.className='v3file';a.innerHTML='<small>📷 Тармоқдан ажратиш далолатномаси фотоси</small><input id="v4-act-photo" type="file" accept="image/*">';const b=document.createElement('label');b.className='v3file';b.innerHTML='<small>📷 Тармоқдан ажратилган ҳолати фотоси</small><input id="v4-disconnected-photo" type="file" accept="image/*">';photos.append(a,b);}
const stamp=p.querySelector('#v3-stamp-photo')?.closest('.v3file');if(stamp)stamp.querySelector('small').textContent='📷 Тамға фотоси';
const gas=p.querySelector('#v3-gas-photo')?.closest('.v3file');if(gas)gas.querySelector('small').textContent='📷 Барча мавжуд газ жиҳозлари фотолари';
const meter=p.querySelector('#v3-meter-photo')?.closest('.v3file');if(meter)meter.querySelector('small').textContent='📷 Барча мавжуд ҳисоблагичлар фотолари';
p.dataset.v4='1';return true};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,300));else setTimeout(run,300);[700,1500,3000].forEach(x=>setTimeout(run,x));new MutationObserver(()=>run()).observe(document.documentElement,{childList:true,subtree:true});
})();