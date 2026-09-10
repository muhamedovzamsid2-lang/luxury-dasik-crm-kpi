(()=>{
'use strict';
/* Production task entrypoint. The HTML still contains legacy tasks.js tags;
   make both of them resolve to the single maintained tasks-v3 implementation. */
if(window.__UOG_TASKS_ENTRY_V3)return;
window.__UOG_TASKS_ENTRY_V3=1;
const load=(src)=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
load('/tasks-v3.js?v=10')
  .then(()=>load('/employee-tasks-empty-fix.js?v=3'))
  .catch(e=>console.error('TASKS_ENTRY_ERROR',e));
})();
