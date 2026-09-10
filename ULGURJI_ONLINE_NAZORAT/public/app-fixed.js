(()=>{
'use strict';
/* Single UI entrypoint: prevent legacy duplicate scripts in index.html from loading
   after this bootstrap. The production page still contains older script tags, so
   guard them here without changing the page structure. */
const blocked=/\/(?:tasks|final-ui)\.js(?:\?|$)/i;
const stopLegacy=s=>{try{const src=s&&s.getAttribute&&s.getAttribute('src')||'';if(blocked.test(src)){s.type='application/x-uog-blocked';s.removeAttribute('src');s.remove();return true}}catch{}return false};
try{
  document.querySelectorAll('script[src]').forEach(stopLegacy);
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes&&m.addedNodes.forEach(n=>{if(n&&n.tagName==='SCRIPT')stopLegacy(n)}))).observe(document.documentElement,{childList:true,subtree:true});
}catch{}
const load=(src)=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
load('/app-fixed-v8.js?v=14')
.then(()=>load('/final-ui.js?v=14'))
.then(()=>load('/executive-control.js?v=4'))
.then(()=>load('/tasks-v3.js?v=8'))
.then(()=>load('/employee-tasks-empty-fix.js?v=2'))
.then(()=>load('/management-v9.js?v=3'))
.then(()=>load('/map-close-v9.js?v=2'))
.then(()=>load('/final-v10.js?v=2'))
.then(()=>load('/employee-panel-v1.js?v=2'))
.then(()=>load('/final-overrides.js?v=2'))
.then(()=>load('/employee-panel-v4-fix.js?v=4'))
.then(()=>load('/manager-control-v12.js?v=1'))
.then(()=>load('/manager-control-v12-fix.js?v=1'))
.then(()=>load('/monthly-report-schema-fix.js?v=3'))
.then(()=>load('/employee-control-final-fix.js?v=3'))
.catch(e=>console.error('UI_LOAD_ERROR',e));
})();