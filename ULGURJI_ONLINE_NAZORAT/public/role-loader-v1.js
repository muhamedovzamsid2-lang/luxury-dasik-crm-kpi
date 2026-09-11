(()=>{
  'use strict';
  const token=localStorage.getItem('uog_token')||localStorage.getItem('ulgurji_token');
  if(!token)return;

  const employeeScripts=[
    '/employee-entry-final-fix-v1.js?v=4',
    '/employee-location-submit-fix-v1.js?v=3',
    '/employee-tasks-final-fix-v1.js?v=3',
    '/employee-mobile-ui-v1.js?v=5',
    '/employee-panel-v4-fix.js?v=5',
    '/location-approval-ui-v1.js?v=3'
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

      if(me.role==='admin'){
        if(location.pathname!=='/manager-panel-v1.html'){
          location.replace('/manager-panel-v1.html?v=20260911');
        }
        return;
      }

      for(const src of employeeScripts)await load(src);
      window.dispatchEvent(new CustomEvent('ulgurji:role-ready',{detail:me}));
    }catch(e){console.error('ROLE_LOADER_ERROR',e)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();