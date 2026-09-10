(()=>{
'use strict';
if(window.__UOG_MONTHLY_SCHEMA_FIX)return;
window.__UOG_MONTHLY_SCHEMA_FIX=1;
const originalFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  const response=await originalFetch(input,init);
  try{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(!url.includes('/api/monthly'))return response;
    const data=await response.clone().json();
    if(!data||!Array.isArray(data.result))return response;
    data.result=data.result.map(x=>{
      const planned=Number(x.planned??x.planned_days??0)||0;
      const visited=Number(x.visited??x.visits??0)||0;
      const valid=Number(x.valid_visits??x.valid_visited??visited)||0;
      return {...x,planned,visited,not_visited:Math.max(0,planned-visited),suspicious:Number(x.suspicious||0)||0,completion:planned?Math.round(valid/planned*100):0};
    });
    return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers:response.headers});
  }catch{return response}
};
})();
