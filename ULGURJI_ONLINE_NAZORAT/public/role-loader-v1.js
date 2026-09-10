(()=>{
  'use strict';
  const token=localStorage.getItem('uog_token');
  if(!token)return;
  const employeeScripts=[
    '/employee-entry-final-fix-v1.js?v=4',
    '/employee-location-submit-fix-v1.js?v=3',
    '/employee-tasks-final-fix-v1.js?v=3',
    '/employee-mobile-ui-v1.js?v=5',
    '/employee-panel-v4-fix.js?v=5',
    '/location-approval-ui-v1.js?v=3'
  ];
  const adminScripts=[
    '/tasks-v3.js?v=10',
    '/management-v9.js?v=7',
    '/map-close-v9.js?v=6',
    '/final-v10.js?v=7',
    '/employee-control-final-fix.js?v=3',
    '/final-control-v1.js?v=3',
    '/location-approval-ui-v1.js?v=3',
    '/employee-entry-final-fix-v1.js?v=4',
    '/employee-location-submit-fix-v1.js?v=3',
    '/employee-tasks-final-fix-v1.js?v=3',
    '/employee-mobile-ui-v1.js?v=5',
    '/employee-panel-v4-fix.js?v=5',
    '/monthly-report-schema-fix.js?v=3'
  ];
  const loaded=new Set();
  function load(src){
    if(loaded.has(src))return Promise.resolve();
    loaded.add(src);
    return new Promise(resolve=>{
      const s=document.createElement('script');
      s.src=src;
      s.async=false;
      s.onload=()=>resolve();
      s.onerror=()=>{console.error('ROLE_SCRIPT_LOAD_FAILED',src);resolve()};
      document.head.appendChild(s);
    });
  }
  async function start(){
    try{
      const r=await fetch('/api/me',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      if(!r.ok)return;
      const me=await r.json();
      const list=me.role==='admin'?adminScripts:employeeScripts;
      for(const src of list)await load(src);
      window.dispatchEvent(new CustomEvent('ulgurji:role-ready',{detail:me}));
    }catch(e){console.error('ROLE_LOADER_ERROR',e)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
