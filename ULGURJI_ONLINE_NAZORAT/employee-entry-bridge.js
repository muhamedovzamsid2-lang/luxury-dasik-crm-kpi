import http from 'node:http';
import {handleEmployeeApi as handleEmployeeV2} from './employee-entry-v2.js';
import {handleEmployeeApi as handleEmployeeLegacy} from './employee-entry-api.js';
const originalCreateServer=http.createServer;
if(!http.__ULGURJI_EMPLOYEE_ENTRY_BRIDGE){http.createServer=function(listener,...args){const wrapped=async(req,res)=>{const pathname=new URL(req.url,'http://local').pathname;let handled=false;if(pathname.startsWith('/api/employee-'))handled=await handleEmployeeV2(req,res,pathname);else if(pathname.startsWith('/api/manager-employee-'))handled=await handleEmployeeLegacy(req,res,pathname);if(handled)return;return listener(req,res)};return originalCreateServer.call(http,wrapped,...args)};Object.defineProperty(http,'__ULGURJI_EMPLOYEE_ENTRY_BRIDGE',{value:true})}
