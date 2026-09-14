(()=>{
'use strict';
/* Clean single UI bootstrap. The previous chain loaded many overlapping legacy patches
   that could break the manager panel. Keep one stable core and only the task module. */
const blocked=/\/(?:tasks|final-ui|login-fix(?:2|3|4)?)\.js(?:\?|$)/i;
const stopLegacy=s=>{try{const src=s&&s.getAttribute&&s.getAttribute('src')||'';if(blocked.test(src)){s.type='application/x-uog-blocked';s.removeAttribute('src');s.remove();return true}}catch{}return false};
try{
  document.querySelectorAll('script[src]').forEach(stopLegacy);
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes&&m.addedNodes.forEach(n=>{if(n&&n.tagName==='SCRIPT')stopLegacy(n)}))).observe(document.documentElement,{childList:true,subtree:true});
}catch{}
const load=(src)=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
load('/app-fixed-v8.js?v=17')
  .then(()=>load('/tasks-v3.js?v=11'))
  .catch(e=>console.error('UI_LOAD_ERROR',e));
})();
