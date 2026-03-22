// server.js
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });

let players = {};

function createPlayer() {
  return {
    x: Math.random()*2000-1000,
    y: Math.random()*2000-1000,
    angle: 0,
    length: 20
  };
}

wss.on("connection", ws => {
  const id = Math.random().toString(36).substr(2, 9);
  players[id] = createPlayer();

  ws.on("message", msg => {
    try {
      const data = JSON.parse(msg);
      players[id] = { ...players[id], ...data };
    } catch {}
  });

  ws.on("close", () => {
    delete players[id];
  });
});

// send updates
setInterval(() => {
  const data = JSON.stringify(players);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}, 50);

console.log("Server running on ws://localhost:3000");