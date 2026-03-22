const canvas = document.getElementById("game"); 
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 🌍 Camera
let camera = { x: 0, y: 0 };

// 🖱️ Input
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let boosting = false;

canvas.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
canvas.addEventListener("mousedown", () => boosting = true);
canvas.addEventListener("mouseup", () => boosting = false);

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

// 🍬 Food
let foods = [];
const FOOD_COUNT = 400;

function spawnFood(x, y) {
  foods.push({
    x,
    y,
    color: skins[Math.floor(Math.random()*skins.length)][1]
  });
}

for (let i = 0; i < FOOD_COUNT; i++) {
  spawnFood(Math.random()*4000-2000, Math.random()*4000-2000);
}

// 🐍 Create snake
function createSnake(x, y) {
  return {
    snake: [],
    head: {x, y},
    angle: Math.random()*Math.PI*2,
    targetAngle: 0,
    maxLength: 20,
    skin: randomSkin(),
    alive: true
  };
}

// 🐍 Player + bots
let player = createSnake(0,0);

let bots = [];
for (let i = 0; i < 6; i++) {
  bots.push(createSnake(
    Math.random()*2000-1000,
    Math.random()*2000-1000
  ));
}

// 📏 Size
function getSize(len) {
  return 10 + Math.sqrt(len) * 0.8;
}

// 🔍 AI food targeting
function findClosestFood(x, y) {
  let closest = null;
  let minDist = Infinity;

  for (let f of foods) {
    let dx = f.x - x;
    let dy = f.y - y;
    let dist = dx * dx + dy * dy;

    if (dist < minDist) {
      minDist = dist;
      closest = f;
    }
  }

  return closest;
}

// 💀 Death
function die(s){
  if(!s.alive) return;

  for(let p of s.snake){
    spawnFood(p.x,p.y);
  }

  s.alive = false;
}

// 🔷 Draw Hex
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

// 🌌 PERFECT HEX BACKGROUND (WORLD-LOCKED)
function drawBackground() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const size = 25;
  const hexWidth = size * 2;
  const hexHeight = Math.sqrt(3) * size;
  const horizSpacing = hexWidth * 0.75;
  const vertSpacing = hexHeight;

  ctx.strokeStyle = "#1c1c1c";
  ctx.lineWidth = 1;

  let startCol = Math.floor(camera.x / horizSpacing) - 2;
  let endCol = Math.floor((camera.x + canvas.width) / horizSpacing) + 2;

  let startRow = Math.floor(camera.y / vertSpacing) - 2;
  let endRow = Math.floor((camera.y + canvas.height) / vertSpacing) + 2;

  for (let col = startCol; col <= endCol; col++) {
    for (let row = startRow; row <= endRow; row++) {

      let worldX = col * horizSpacing;
      let worldY = row * vertSpacing;

      if (col % 2 !== 0) {
        worldY += vertSpacing / 2;
      }

      let screenX = worldX - camera.x;
      let screenY = worldY - camera.y;

      drawHex(screenX, screenY, size);
    }
  }
}

// 🔄 Update snake
function updateSnake(s, isPlayer=false){
  if(!s.alive) return;

  let size = getSize(s.maxLength);

  if(isPlayer){
    let wx = mouseX + camera.x;
    let wy = mouseY + camera.y;
    s.targetAngle = Math.atan2(wy - s.head.y, wx - s.head.x);
  } else {
    let food = findClosestFood(s.head.x, s.head.y);

    if (food) {
      s.targetAngle = Math.atan2(food.y - s.head.y, food.x - s.head.x);
    } else if (Math.random() < 0.02) {
      s.targetAngle = Math.random() * Math.PI * 2;
    }
  }

  let diff = s.targetAngle - s.angle;
  if(diff > Math.PI) diff -= Math.PI*2;
  if(diff < -Math.PI) diff += Math.PI*2;

  s.angle += diff * 0.1;

  let speed = 2.5 - Math.min(1.2, s.maxLength * 0.002);

  if(isPlayer && boosting && s.maxLength > 10){
    speed += 2;
    s.maxLength -= 0.1;
    spawnFood(s.head.x,s.head.y);
  }

  s.head.x += Math.cos(s.angle) * speed;
  s.head.y += Math.sin(s.angle) * speed;

  s.snake.unshift({x:s.head.x,y:s.head.y});
  while(s.snake.length > s.maxLength) s.snake.pop();

  for(let f of foods){
    let dx = s.head.x - f.x;
    let dy = s.head.y - f.y;

    if(Math.sqrt(dx*dx + dy*dy) < size){
      s.maxLength += 2;

      f.x = s.head.x + (Math.random()-0.5)*2000;
      f.y = s.head.y + (Math.random()-0.5)*2000;
    }
  }
}

// 💀 Collision
function checkCollision(a, b) {
  if (!a.alive || !b.alive) return false;

  let head = a.head;
  let size = getSize(a.maxLength);

  for (let i = 5; i < b.snake.length; i++) {
    let p = b.snake[i];

    let dx = head.x - p.x;
    let dy = head.y - p.y;

    if (Math.sqrt(dx * dx + dy * dy) < size) {
      return true;
    }
  }

  return false;
}

// 🎨 Draw snake
function drawSnake(s){
  if(!s.alive) return;

  let base = getSize(s.maxLength);

  for(let i = s.snake.length - 1; i >= 0; i--){
    let p = s.snake[i];
    let x = p.x - camera.x;
    let y = p.y - camera.y;

    let size = base - (i / s.snake.length) * (base * 0.4);

    let g = ctx.createRadialGradient(x,y,1,x,y,size);
    g.addColorStop(0,s.skin[0]);
    g.addColorStop(0.5,s.skin[1]);
    g.addColorStop(1,s.skin[2]);

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x,y,size,0,Math.PI*2);
    ctx.fill();
  }

  let hx = s.head.x - camera.x;
  let hy = s.head.y - camera.y;
  let hs = base + 2;

  ctx.fillStyle = s.skin[1];
  ctx.beginPath();
  ctx.arc(hx,hy,hs,0,Math.PI*2);
  ctx.fill();

  // 👀 Eyes
  let f = hs*0.65, side = hs*0.35;

  let e1x = hx + Math.cos(s.angle)*f + Math.cos(s.angle+Math.PI/2)*side;
  let e1y = hy + Math.sin(s.angle)*f + Math.sin(s.angle+Math.PI/2)*side;

  let e2x = hx + Math.cos(s.angle)*f + Math.cos(s.angle-Math.PI/2)*side;
  let e2y = hy + Math.sin(s.angle)*f + Math.sin(s.angle-Math.PI/2)*side;

  ctx.fillStyle="white";
  ctx.beginPath();
  ctx.arc(e1x,e1y,hs*0.3,0,Math.PI*2);
  ctx.arc(e2x,e2y,hs*0.3,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="black";
  ctx.beginPath();
  ctx.arc(e1x,e1y,hs*0.15,0,Math.PI*2);
  ctx.arc(e2x,e2y,hs*0.15,0,Math.PI*2);
  ctx.fill();
}

// 🔁 GAME LOOP
function gameLoop(){

  updateSnake(player, true);

  for (let i = bots.length - 1; i >= 0; i--) {
    let b = bots[i];

    if (!b.alive) {
      bots.splice(i, 1);
      bots.push(createSnake(
        Math.random()*2000-1000,
        Math.random()*2000-1000
      ));
      continue;
    }

    updateSnake(b);
  }

  for (let b of bots) {
    if (checkCollision(player, b)) die(player);
    if (checkCollision(b, player)) die(b);
  }

  for (let i = 0; i < bots.length; i++) {
    for (let j = 0; j < bots.length; j++) {
      if (i !== j && checkCollision(bots[i], bots[j])) {
        die(bots[i]);
      }
    }
  }

  for (let b of bots) {
    let dx = player.head.x - b.head.x;
    let dy = player.head.y - b.head.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < getSize(player.maxLength)) {
      die(player);
      die(b);
    }
  }

  if (player.alive) {
    camera.x = player.head.x - canvas.width/2;
    camera.y = player.head.y - canvas.height/2;
  }

  drawBackground();

  // 🍬 Food
  for(let f of foods){
    let x = f.x - camera.x;
    let y = f.y - camera.y;

    let g = ctx.createRadialGradient(x,y,1,x,y,6);
    g.addColorStop(0,"white");
    g.addColorStop(1,f.color);

    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fill();
  }

  drawSnake(player);
  for(let b of bots) drawSnake(b);

  requestAnimationFrame(gameLoop);
}

gameLoop();