// signaling-server/index.js
// Simple WebSocket signaling server for WebRTC offers/answers & ICE candidates.
// Run: node index.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

/*
  Simple in-memory rooms:
  rooms = { roomId: Set<ws> }
  Production: use Redis/pubsub for scaling.
*/

const rooms = new Map();

wss.on('connection', function connection(ws, req) {
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);

  ws.on('message', (message) => {
    let payload;
    try { payload = JSON.parse(message); } catch (e) { return; }

    // Expect payload shape: { type, room, data, token (optional) }
    const { type, room, data } = payload;

    if (!room) return ws.send(JSON.stringify({ type: 'error', error: 'room required' }));

    if (type === 'join') {
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(ws);
      ws.room = room;
      ws.send(JSON.stringify({ type: 'joined', room }));
      return;
    }

    // Broadcast to other clients in the room
    const peers = rooms.get(room);
    if (!peers) return;
    peers.forEach(peer => {
      if (peer !== ws && peer.readyState === WebSocket.OPEN) {
        peer.send(JSON.stringify({ type, data }));
      }
    });
  });

  ws.on('close', () => {
    if (ws.room && rooms.has(ws.room)) {
      rooms.get(ws.room).delete(ws);
      if (rooms.get(ws.room).size === 0) rooms.delete(ws.room);
    }
  });
});

// health ping
setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Signaling server listening on ${PORT}`));

