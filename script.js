const canvas = document.getElementById("game");  
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 🌍 WORLD SIZE
const WORLD_SIZE = 10000;

// 🌐 MULTIPLAYER
const socket = new WebSocket("ws://localhost:3000");
let otherPlayers = {};

socket.onmessage = (event) => {
  try {
    otherPlayers = JSON.parse(event.data);
  } catch {}
};

// 🌍 Camera
let camera = { x: 0, y: 0 };

// 🖱️ Input
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

canvas.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// 🎨 Skins
const skins = [
  ["#aaffaa","lime","#006600"],
  ["#aaaaff","blue","#000066"],
  ["#ffaaaa","red","#660000"],
  ["#ffffaa","yellow","#666600"],
  ["#ffaaff","magenta","#660066"]
];

function randomSkin() {
  return skins[Math.floor(Math.random()*skins.length)];
}

// 🍬 FOOD SYSTEM (FIXED)
let foods = [];
const MAX_FOOD = 2000; // 🔥 MUCH MORE FOOD

function spawnFood(x, y) {
  foods.push({
    x,
    y,
    color: skins[Math.floor(Math.random()*skins.length)][1]
  });
}

// initial spawn
for (let i = 0; i < MAX_FOOD; i++) {
  spawnFood(
    Math.random()*WORLD_SIZE - WORLD_SIZE/2,
    Math.random()*WORLD_SIZE - WORLD_SIZE/2
  );
}

// 🐍 CREATE SNAKE
function createSnake(x, y) {
  return {
    snake: [{x, y}],
    head: {x, y},
    angle: Math.random()*Math.PI*2,
    targetAngle: 0,
    maxLength: 20,
    skin: randomSkin(),
    alive: true
  };
}

// 🐍 PLAYER
let player = createSnake(0,0);

// 🤖 NPCs
let bots = [];
const BOT_COUNT = 60;

for (let i = 0; i < BOT_COUNT; i++) {
  bots.push(createSnake(
    Math.random()*WORLD_SIZE - WORLD_SIZE/2,
    Math.random()*WORLD_SIZE - WORLD_SIZE/2
  ));
}

// 📡 SEND DATA
setInterval(() => {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({
      x: player.head.x,
      y: player.head.y
    }));
  }
}, 50);

// 🔷 HEX BG
function drawHex(x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    let a = Math.PI / 3 * i;
    let px = x + size * Math.cos(a);
    let py = y + size * Math.sin(a);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawBackground() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const size = 25;
  const hexWidth = size * 2;
  const hexHeight = Math.sqrt(3) * size;

  const horiz = hexWidth * 0.75;
  const vert = hexHeight;

  ctx.strokeStyle = "#1c1c1c";

  for (let col = -50; col < 50; col++) {
    for (let row = -50; row < 50; row++) {

      let worldX = col * horiz;
      let worldY = row * vert;

      if (col % 2 !== 0) worldY += vert / 2;

      drawHex(worldX - camera.x, worldY - camera.y, size);
    }
  }
}

// 💀 DEATH
function die(s){
  if(!s.alive) return;

  for(let p of s.snake){
    spawnFood(p.x,p.y);
  }

  s.alive = false;
}

// 🔄 UPDATE
function updateSnake(s, isPlayer=false){
  if(!s.alive) return;

  if(isPlayer){
    let wx = mouseX + camera.x;
    let wy = mouseY + camera.y;
    s.targetAngle = Math.atan2(wy - s.head.y, wx - s.head.x);
  } else {
    let closest = null;
    let closestDist = 999999;

    for(let f of foods){
      let dx = f.x - s.head.x;
      let dy = f.y - s.head.y;
      let d = dx*dx + dy*dy;

      if(d < closestDist && d < 100000){
        closestDist = d;
        closest = f;
      }
    }

    if(closest){
      s.targetAngle = Math.atan2(
        closest.y - s.head.y,
        closest.x - s.head.x
      );
    }
  }

  let diff = s.targetAngle - s.angle;
  if(diff > Math.PI) diff -= Math.PI*2;
  if(diff < -Math.PI) diff += Math.PI*2;

  s.angle += diff * 0.1;

  let speed = 2.5;

  s.head.x += Math.cos(s.angle) * speed;
  s.head.y += Math.sin(s.angle) * speed;

  s.snake.unshift({x:s.head.x, y:s.head.y});

  while(s.snake.length > s.maxLength){
    s.snake.pop();
  }

  // 🍬 EAT + RESPAWN
  for(let i = foods.length-1; i >= 0; i--){
    let f = foods[i];
    let dx = f.x - s.head.x;
    let dy = f.y - s.head.y;

    if(dx*dx + dy*dy < 100){
      foods.splice(i,1);
      s.maxLength += 2;

      // 🔥 RESPAWN FOOD
      spawnFood(
        Math.random()*WORLD_SIZE - WORLD_SIZE/2,
        Math.random()*WORLD_SIZE - WORLD_SIZE/2
      );
    }
  }
}

// 💀 COLLISION
function checkCollision(s, others){
  for(let o of others){
    if(!o.alive) continue;

    for(let p of o.snake){
      let dx = s.head.x - p.x;
      let dy = s.head.y - p.y;

      if(dx*dx + dy*dy < 100){
        die(s);
        return;
      }
    }
  }
}

// 🎨 FOOD
function drawFood(){
  for(let f of foods){
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(f.x - camera.x, f.y - camera.y, 4, 0, Math.PI*2);
    ctx.fill();
  }
}

// 🐍 DRAW
function drawSnake(s){
  if(!s.alive) return;

  for(let i = s.snake.length-1; i >= 0; i--){
    let p = s.snake[i];

    let x = p.x - camera.x;
    let y = p.y - camera.y;

    let size = 10 - (i / s.snake.length) * 5;

    ctx.fillStyle = s.skin[2];
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = s.skin[1];
    ctx.beginPath();
    ctx.arc(x-2, y-2, size*0.85, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = s.skin[0];
    ctx.beginPath();
    ctx.arc(x-4, y-4, size*0.5, 0, Math.PI*2);
    ctx.fill();

    if(i === 0){
      let a = s.angle;

      let ex1 = x + Math.cos(a+0.5)*4;
      let ey1 = y + Math.sin(a+0.5)*4;

      let ex2 = x + Math.cos(a-0.5)*4;
      let ey2 = y + Math.sin(a-0.5)*4;

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(ex1, ey1, 3, 0, Math.PI*2);
      ctx.arc(ex2, ey2, 3, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.arc(ex1 + Math.cos(a)*1.5, ey1 + Math.sin(a)*1.5, 1.5, 0, Math.PI*2);
      ctx.arc(ex2 + Math.cos(a)*1.5, ey2 + Math.sin(a)*1.5, 1.5, 0, Math.PI*2);
      ctx.fill();
    }
  }
}

// 👥 MULTIPLAYER
function drawOtherPlayers(){
  for(let id in otherPlayers){
    let p = otherPlayers[id];
    if(!p) continue;

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(p.x - camera.x, p.y - camera.y, 8, 0, Math.PI*2);
    ctx.fill();
  }
}

// 🔁 LOOP
function gameLoop(){

  updateSnake(player, true);

  for(let b of bots){
    updateSnake(b);
  }

  for(let b of bots){
    checkCollision(player, [b]);
    checkCollision(b, [player]);
  }

  camera.x = player.head.x - canvas.width/2;
  camera.y = player.head.y - canvas.height/2;

  drawBackground();
  drawFood();

  for(let b of bots){
    drawSnake(b);
  }

  drawSnake(player);
  drawOtherPlayers();

  requestAnimationFrame(gameLoop);
}

gameLoop();
