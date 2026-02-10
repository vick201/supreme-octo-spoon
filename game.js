const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreLabel = document.getElementById("score");
const statusLabel = document.getElementById("status");
const guide = document.getElementById("guide");

const state = {
  keys: { left: false, right: false },
  playerLane: 0,
  roadDrift: 0,
  score: 0,
  gameOver: false,
  stripeOffset: 0,
  npcs: [],
  nextSpawn: 0,
  speed: 0.36,
};

const laneOffsets = [-0.48, 0, 0.48];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function addNpc() {
  const lane = Math.floor(Math.random() * 3);
  state.npcs.push({
    lane,
    z: 1.25 + Math.random() * 0.45,
    color: `hsl(${Math.random() * 360} 80% 58%)`,
  });
}

function projectY(z) {
  const horizonY = canvas.height * 0.45;
  const roadBottom = canvas.height * 0.94;
  return horizonY + (1 - z) * (roadBottom - horizonY);
}

function roadWidthAt(z) {
  const top = canvas.width * 0.12;
  const bottom = canvas.width * 0.78;
  return top + (1 - z) * (bottom - top);
}

function drawRoad() {
  const horizonY = canvas.height * 0.45;
  const bottomY = canvas.height * 0.94;
  const topW = canvas.width * 0.12;
  const bottomW = canvas.width * 0.78;

  const roadCenterTop = canvas.width * 0.5;
  const roadCenterBottom = canvas.width * (0.5 + state.roadDrift * 0.04);

  ctx.fillStyle = "#2e343d";
  ctx.beginPath();
  ctx.moveTo(roadCenterTop - topW / 2, horizonY);
  ctx.lineTo(roadCenterTop + topW / 2, horizonY);
  ctx.lineTo(roadCenterBottom + bottomW / 2, bottomY);
  ctx.lineTo(roadCenterBottom - bottomW / 2, bottomY);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 24; i += 1) {
    const z = ((i / 24 + state.stripeOffset) % 1 + 1) % 1;
    const y = projectY(z);
    const w = roadWidthAt(z);
    const centerX = canvas.width * (0.5 + state.roadDrift * 0.04 * (1 - z));

    ctx.fillStyle = "#ffd95a";
    const stripeW = Math.max(3, w * 0.02);
    const stripeH = Math.max(6, (1 - z) * 24);

    ctx.fillRect(centerX - stripeW / 2, y - stripeH / 2, stripeW, stripeH);
  }
}

function drawPlayer() {
  const y = canvas.height * 0.84;
  const z = 0.03;
  const w = roadWidthAt(z) * 0.16;
  const h = w * 0.95;
  const roadCenter = canvas.width * (0.5 + state.roadDrift * 0.04 * (1 - z));
  const x = roadCenter + laneOffsets[state.playerLane + 1] * roadWidthAt(z) * 0.34;

  ctx.fillStyle = "#31e783";
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = "#b7fff0";
  ctx.fillRect(x - w * 0.28, y - h * 0.38, w * 0.56, h * 0.26);
  ctx.fillStyle = "#10141d";
  ctx.fillRect(x - w * 0.38, y + h * 0.36, w * 0.76, h * 0.14);
}

function drawNpc(npc) {
  const z = clamp(npc.z, 0.02, 1.2);
  const y = projectY(z);
  const w = roadWidthAt(z) * (0.22 * (1 - z) + 0.05);
  const h = w * 0.95;
  const roadCenter = canvas.width * (0.5 + state.roadDrift * 0.04 * (1 - z));
  const x = roadCenter + laneOffsets[npc.lane] * roadWidthAt(z) * 0.33;

  ctx.fillStyle = npc.color;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = "#f8fbff";
  ctx.fillRect(x - w * 0.25, y - h * 0.35, w * 0.5, h * 0.22);
}

function detectCollision(npc) {
  if (Math.abs(npc.z) > 0.13) return false;
  return npc.lane === state.playerLane + 1;
}

function update(delta) {
  if (state.gameOver) return;

  const steering = Number(state.keys.right) - Number(state.keys.left);
  state.playerLane = clamp(state.playerLane + steering * delta * 3.2, -1, 1);
  state.playerLane = Math.round(state.playerLane);
  state.roadDrift = clamp(state.roadDrift + steering * delta * 0.55, -1, 1);
  state.roadDrift *= 0.92;

  state.stripeOffset += delta * state.speed;
  state.score += delta * 25;

  state.nextSpawn -= delta;
  if (state.nextSpawn <= 0) {
    addNpc();
    state.nextSpawn = 0.7 + Math.random() * 0.8;
  }

  for (const npc of state.npcs) {
    npc.z -= delta * state.speed;
    if (detectCollision(npc)) {
      state.gameOver = true;
      statusLabel.textContent = "Status: Crashed! Press Space to restart (H for help)";
    }
  }

  state.npcs = state.npcs.filter((npc) => npc.z > -0.25);

  scoreLabel.textContent = `Score: ${Math.floor(state.score)}`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoad();

  const ordered = [...state.npcs].sort((a, b) => b.z - a.z);
  for (const npc of ordered) {
    drawNpc(npc);
  }

  drawPlayer();
}

function reset() {
  state.playerLane = 0;
  state.roadDrift = 0;
  state.score = 0;
  state.gameOver = false;
  state.stripeOffset = 0;
  state.npcs = [];
  state.nextSpawn = 0;
  statusLabel.textContent = "Status: Racing";
}

function toggleGuide() {
  guide.classList.toggle("guide-hidden");
}


window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    state.keys.left = true;
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    state.keys.right = true;
  }
  if (event.code === "Space" && state.gameOver) {
    reset();
  }
  if (event.key.toLowerCase() === "h") {
    toggleGuide();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    state.keys.left = false;
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    state.keys.right = false;
  }
});

let last = performance.now();
function gameLoop(now) {
  const delta = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

reset();
requestAnimationFrame(gameLoop);
