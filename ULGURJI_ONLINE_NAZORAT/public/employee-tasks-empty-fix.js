(()=>{
'use strict';
const fix=()=>{
 const notice=document.getElementById('employeeTaskNoticeV3'),list=document.getElementById('employeeTasksV3List');
 if(!notice||!list)return;
 const hasTasks=!!list.querySelector('.task-item');
 if(!hasTasks){
   notice.innerHTML='<div class="task-alert" style="background:#f8fafc;border-color:#dbe3ee;color:#475569">📋 Бугун қўшимча раҳбар вазифаси берилмаган.</div>';
 }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(fix,1200));else setTimeout(fix,1200);
[2000,3500,6000].forEach(t=>setTimeout(fix,t));
new MutationObserver(fix).observe(document.documentElement,{childList:true,subtree:true});
})();
