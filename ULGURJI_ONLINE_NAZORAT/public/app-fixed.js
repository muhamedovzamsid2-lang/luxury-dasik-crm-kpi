(()=>{
'use strict';
/* Single UI entrypoint: prevent legacy duplicate scripts in index.html from loading
   after this bootstrap. */
const blocked=/\/(?:tasks|final-ui|login-fix(?:2|3|4)?)\.js(?:\?|$)/i;
const stopLegacy=s=>{try{const src=s&&s.getAttribute&&s.getAttribute('src')||'';if(blocked.test(src)){s.type='application/x-uog-blocked';s.removeAttribute('src');s.remove();return true}}catch{}return false};
try{
  document.querySelectorAll('script[src]').forEach(stopLegacy);
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes&&m.addedNodes.forEach(n=>{if(n&&n.tagName==='SCRIPT')stopLegacy(n)}))).observe(document.documentElement,{childList:true,subtree:true});
}catch{}
const load=(src)=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
load('/app-fixed-v8.js?v=16')
.then(()=>load('/final-ui.js?v=16'))
.then(()=>load('/executive-control.js?v=6'))
.then(()=>load('/tasks-v3.js?v=10'))
.then(()=>load('/employee-tasks-empty-fix.js?v=4'))
.then(()=>load('/management-v9.js?v=5'))
.then(()=>load('/map-close-v9.js?v=4'))
.then(()=>load('/final-v10.js?v=4'))
.then(()=>load('/employee-panel-v1.js?v=4'))
.then(()=>load('/final-overrides.js?v=4'))
.then(()=>load('/employee-panel-v4-fix.js?v=6'))
.then(()=>load('/employee-entry-final-fix-v1.js?v=9'))
.then(()=>load('/manager-control-v12.js?v=3'))
.then(()=>load('/manager-control-v12-fix.js?v=3'))
.then(()=>load('/monthly-report-schema-fix.js?v=5'))
.then(()=>load('/employee-control-final-fix.js?v=5'))
.catch(e=>console.error('UI_LOAD_ERROR',e));
})();