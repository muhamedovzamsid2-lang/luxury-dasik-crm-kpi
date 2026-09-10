import http from 'node:http';
import {handleEmployeeApi} from './employee-entry-api.js';

const originalCreateServer=http.createServer;
if(!http.__ULGURJI_EMPLOYEE_ENTRY_BRIDGE){
  http.createServer=function(listener,...args){
    const wrapped=async(req,res)=>{
      const pathname=new URL(req.url,'http://local').pathname;
      if(pathname.startsWith('/api/employee-')||pathname.startsWith('/api/manager-employee-')){
        const handled=await handleEmployeeApi(req,res,pathname);
        if(handled)return;
      }
      return listener(req,res);
    };
    return originalCreateServer.call(http,wrapped,...args);
  };
  Object.defineProperty(http,'__ULGURJI_EMPLOYEE_ENTRY_BRIDGE',{value:true});
}
