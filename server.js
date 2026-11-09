// CineTogether server: static files + WebSocket rooms (chat, sync, WebRTC signaling).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_PER_ROOM = 12;
const PUB = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent((req.url || '/').split('?')[0]); } catch (_) { res.writeHead(400); return res.end(); }
  if (p === '/health') { res.writeHead(200); return res.end('ok'); }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
const rooms = new Map(); // code -> Set<ws>
let counter = 0;

const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
function cleanPresence(o) {
  const out = {};
  if (o && typeof o === 'object') {
    if ('name' in o) out.name = String(o.name || '').slice(0, 20);
    if ('voice' in o) out.voice = !!o.voice;
  }
  return out;
}
function broadcastPeers(code) {
  const r = rooms.get(code); if (!r) return;
  const peers = [...r].map(c => ({ id: c.id, presence: c.presence }));
  r.forEach(c => send(c, { t: 'peers', peers }));
}

wss.on('connection', ws => {
  ws.id = 'p' + (++counter) + Math.random().toString(36).slice(2, 6);
  ws.room = null; ws.presence = {}; ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });

  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (_) { return; }
    if (!m || typeof m !== 'object') return;

    if (!ws.room) {
      if (m.t !== 'join') return;
      const code = String(m.room || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30);
      if (!code) return ws.close();
      let r = rooms.get(code);
      if (!r) { r = new Set(); rooms.set(code, r); }
      if (r.size >= MAX_PER_ROOM) { send(ws, { t: 'full' }); return ws.close(); }
      ws.room = code; ws.presence = cleanPresence(m.presence); r.add(ws);
      send(ws, { t: 'welcome', id: ws.id });
      broadcastPeers(code);
      return;
    }

    if (m.t === 'presence') {
      ws.presence = { ...ws.presence, ...cleanPresence(m.patch) };
      broadcastPeers(ws.room);
    } else if (m.t === 'emit') {
      const topic = String(m.topic || '').slice(0, 30);
      const out = JSON.stringify({ t: 'msg', topic, data: m.data, from: ws.id });
      const to = m.data && typeof m.data === 'object' ? m.data.to : null;
      for (const c of rooms.get(ws.room) || []) {
        if (c === ws || c.readyState !== 1) continue;
        if (to && c.id !== to) continue; // WebRTC signaling sirf us dost ko jata hai
        c.send(out);
      }
    }
  });

  ws.on('close', () => {
    if (!ws.room) return;
    const r = rooms.get(ws.room); if (!r) return;
    r.delete(ws);
    if (!r.size) rooms.delete(ws.room); else broadcastPeers(ws.room);
  });
});

// Hosting platforms idle connections kaat dete hain, isliye ping bhejte rehte hain.
setInterval(() => {
  wss.clients.forEach(c => { if (!c.alive) return c.terminate(); c.alive = false; c.ping(); });
}, 30000);

server.listen(PORT, () => console.log('CineTogether chal raha hai: http://localhost:' + PORT));
