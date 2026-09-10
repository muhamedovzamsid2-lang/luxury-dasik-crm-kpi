(()=>{
'use strict';
const $=id=>document.getElementById(id);
function getId(btn){
  const s=btn.getAttribute('onclick')||'';
  const m=s.match(/(?:employeeDetailV9|v10Employee|viewEmployee|showEmployee|employeeDetail|openEmployee)\s*\(\s*(\d+)/i);
  if(m)return Number(m[1]);
  const row=btn.closest('tr');
  const name=(row?.cells?.[0]?.innerText||'').trim().toLowerCase();
  const emp=window.EMP?.find?.(x=>String(x.employee_name||'').trim().toLowerCase()===name);
  return emp?Number(emp.id):null;
}
function fix(){
  const p=$('reportsTab'); if(!p)return;
  p.querySelectorAll('button').forEach(old=>{
    const text=(old.innerText||old.textContent||'').trim().toLowerCase();
    if(!text.includes('кўриш')||old.dataset.dailyFix==='1')return;
    const id=getId(old); if(!id)return;
    const b=old.cloneNode(true);
    b.dataset.dailyFix='1';
    b.removeAttribute('onclick');
    b.addEventListener('click',ev=>{
      ev.preventDefault();ev.stopPropagation();
      const d=$('v10Day')?.value||new Date().toISOString().slice(0,10);
      if(typeof window.employeeDetailV9==='function') window.employeeDetailV9(id,d);
      else if(typeof window.v10Employee==='function') window.v10Employee(id);
    },true);
    old.replaceWith(b);
  });
}
const mo=new MutationObserver(fix);mo.observe(document.documentElement,{childList:true,subtree:true});
fix();setInterval(fix,1000);
})();
