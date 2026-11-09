/* Room client: WebSocket par chalne wala chhota realtime layer.
   Server ke saath baat karta hai aur app.js ko emit/on/presence/peers deta hai. */
function connectRoom(code, name) {
  return new Promise((resolve, reject) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(proto + '://' + location.host + '/ws');
    let me = null, ready = false, peers = [];
    const handlers = {}, peerFns = [], mine = { name, voice: false };
    const send = o => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };

    const R = {
      emit(topic, data) { send({ t: 'emit', topic, data }); return Promise.resolve(); },
      on(topic, fn) {
        (handlers[topic] = handlers[topic] || []).push(fn);
        return () => { handlers[topic] = handlers[topic].filter(f => f !== fn); };
      },
      presence(patch) { Object.assign(mine, patch); send({ t: 'presence', patch }); return Promise.resolve(); },
      peers: () => peers,
      onPeers(fn) { peerFns.push(fn); return () => { peerFns.splice(peerFns.indexOf(fn), 1); }; },
      leave() { ws.close(); }
    };

    ws.onopen = () => send({ t: 'join', room: code, presence: mine });
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch (_) { return; }
      if (m.t === 'welcome') {
        me = m.id;
        if (!ready) { ready = true; resolve(R); }
      } else if (m.t === 'full') {
        reject(new Error('full'));
      } else if (m.t === 'peers') {
        const before = new Map(peers.map(p => [p.peer, p]));
        peers = m.peers.map(p => ({ peer: p.id, presence: p.presence || {}, isMe: p.id === me, sameTab: false }));
        const now = new Set(peers.map(p => p.peer));
        const joined = peers.filter(p => !before.has(p.peer));
        const left = [...before.values()].filter(p => !now.has(p.peer));
        peerFns.forEach(f => f({ peers, joined, left, updated: [] }));
      } else if (m.t === 'msg') {
        (handlers[m.topic] || []).forEach(f =>
          f({ topic: m.topic, data: m.data, peer: m.from, isMe: false, sameTab: false }));
      }
    };
    ws.onerror = () => { if (!ready) reject(new Error('ws')); };
    ws.onclose = () => {
      if (!ready) reject(new Error('closed'));
      else if (typeof log === 'function')
        log('<div class="sys">Server se connection toot gaya. Page refresh karke dobara judo.</div>');
    };
  });
}
