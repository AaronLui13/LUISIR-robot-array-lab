import { prepareVendor } from './vendor.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
await prepareVendor();
const root = resolve('.');
http.createServer(async (req, res) => {
  const file = resolve(root, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.mjs': 'text/javascript', '.js':'text/javascript', '.png':'image/png', '.gif':'image/gif', '.mp3':'audio/mpeg', '.woff':'font/woff', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'text/plain' });
    res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173'));
