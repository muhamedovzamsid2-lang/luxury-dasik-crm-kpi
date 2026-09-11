(()=>{
'use strict';
const remove=()=>{
  document.querySelectorAll('.assign-box').forEach(x=>x.remove());
  document.querySelectorAll('#employeeSelect,#consumerId,#assignDate').forEach(x=>{const p=x.closest('.assign-box');if(p)p.remove()});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',remove,{once:true});
remove();
new MutationObserver(remove).observe(document.documentElement,{childList:true,subtree:true});
})();
