import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 3001);

// Single-process gateway: server.js owns SQLite and all API routes.
// The gateway only exposes PORT and injects the task UI into HTML.
const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  env: { ...process.env, PORT: String(BACKEND_PORT) },
  stdio: 'inherit'
});

let backendExited = false;
child.on('exit', code => {
  backendExited = true;
  console.error(`BACKEND_EXIT:${code ?? 'unknown'}`);
});

const server = http.createServer((req, res) => {
  const u = new URL(req.url || '/', 'http://local');
  const opts = {
    hostname: '127.0.0.1',
    port: BACKEND_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${BACKEND_PORT}` }
  };

  const proxy = http.request(opts, upstream => {
    const isHtml = (u.pathname === '/' || u.pathname.endsWith('.html')) &&
      String(upstream.headers['content-type'] || '').includes('text/html');

    if (!isHtml) {
      res.writeHead(upstream.statusCode || 502, upstream.headers);
      upstream.pipe(res);
      return;
    }

    const chunks = [];
    upstream.on('data', c => chunks.push(c));
    upstream.on('end', () => {
      let html = Buffer.concat(chunks).toString('utf8');
      html = html.replace(/<script[^>]+src=["']\/tasks(?:-v2|-v3)?\.js[^>]*><\/script>/gi, '');
      html = html.replace(/<script[^>]+src=["']\/app-fixed(?:-v\d+)?\.js[^>]*><\/script>/gi, '<script src="/app-fixed-v8.js?v=8"></script>');
      if (!html.includes('/tasks-v3.js')) {
        html = html.replace('</body>', '<script src="/tasks-v3.js?v=3"></script></body>');
      }
      if (!html.includes('/app-fixed-v8.js')) {
        html = html.replace('</body>', '<script src="/app-fixed-v8.js?v=8"></script></body>');
      }
      const headers = { ...upstream.headers, 'content-length': Buffer.byteLength(html) };
      delete headers['transfer-encoding'];
      res.writeHead(upstream.statusCode || 500, headers);
      res.end(html);
    });
  });

  proxy.on('error', err => {
    if (!res.headersSent) {
      res.writeHead(502, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: backendExited ? 'BACKEND_STOPPED' : 'BACKEND_UNAVAILABLE', message: err.message }));
    }
  });

  req.pipe(proxy);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ULGURJI_GATEWAY_READY port=${PORT} backend=${BACKEND_PORT}`);
});

const shutdown = () => {
  child.kill('SIGTERM');
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
