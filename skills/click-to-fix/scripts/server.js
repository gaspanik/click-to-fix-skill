const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 47753;
const HOST = '127.0.0.1';
const FILE = path.join(os.tmpdir(), '__click-to-fix-instruction.json');

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '';
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/instruction') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
        try {
          const historyFile = path.join(process.cwd(), '.claude', 'click-to-fix-history.jsonl');
          fs.mkdirSync(path.dirname(historyFile), { recursive: true });
          fs.appendFileSync(historyFile, JSON.stringify({ ...data, savedAt: new Date().toISOString() }) + '\n');
        } catch (e) {}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        console.log('[click-to-fix] received:', data.instruction);
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/instruction') {
    try {
      const data = fs.readFileSync(FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (e) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'no instruction yet' }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/stop') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    try { fs.unlinkSync(FILE); } catch (e) {}
    console.log('[click-to-fix] stopped');
    server.close(() => process.exit(0));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, HOST, () => {
  console.log(`[click-to-fix] listening on ${HOST}:${PORT}`);
  console.log(`[click-to-fix] file: ${FILE}`);
});
