const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
      catch { res.writeHead(400).end(); return; }
      // Only game assets are public. Desktop code and native helpers stay private.
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      const relative = path.relative(root,file).split(path.sep).join('/');
      const allowed = ['index.html','style.css'].includes(relative) || relative.startsWith('src/') || relative.startsWith('node_modules/three/');
      if (!allowed || !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404).end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
        res.end(data);
      });
    });
    server.once('error', reject);
    // Port zero asks the OS to reserve a free port atomically, avoiding port races.
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}
module.exports = { startServer };
if (require.main === module) startServer().then(({ url }) => console.log(`Porcelain Playground: ${url}`)).catch(err => { console.error(err); process.exitCode = 1; });
