await import('./import-employees.js');
const publicPort=Number(process.env.PORT||3000);
process.env.INTERNAL_PORT='3001';
process.env.PORT='3001';
await import('./server.js');
process.env.PUBLIC_PORT=String(publicPort);
process.env.PORT=String(publicPort);
await import('./gateway.js');
