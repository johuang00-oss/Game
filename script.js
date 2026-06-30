const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const healthEl = document.getElementById('health');
const timeEl = document.getElementById('time');
const suppliesEl = document.getElementById('supplies');
const startButton = document.getElementById('startButton');
const gameOverPanel = document.getElementById('gameOver');
const finalTime = document.getElementById('finalTime');
const finalSupplies = document.getElementById('finalSupplies');

const state = {
  running: false,
  health: 100,
  time: 0,
  supplies: 0,
  speed: 240,
  spawnTimer: 0,
  enemyTimer: 0,
  enemies: [],
  supplyDrops: [],
  keys: {},
};

const player = {
  x: 380,
  y: 230,
  size: 28,
  color: '#3b82f6',
};

const gameConfig = {
  supplyCount: 6,
  maxEnemies: 8,
  healthDrainPerSecond: 9,
  supplyHeal: 18,
  enemyDamage: 18,
  enemySpeedBase: 80,
  enemySpeedGrow: 6,
};

function resetGame() {
  state.running = false;
  state.health = 100;
  state.time = 0;
  state.supplies = 0;
  state.spawnTimer = 0;
  state.enemyTimer = 0;
  state.enemies = [];
  state.supplyDrops = [];
  player.x = 380;
  player.y = 230;
  updateHUD();
  drawIntro();
}

function updateHUD() {
  healthEl.textContent = Math.max(0, Math.floor(state.health));
  timeEl.textContent = state.time.toFixed(1);
  suppliesEl.textContent = state.supplies;
}

function drawIntro() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '26px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Press Start to survive the night', canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '18px Inter, system-ui, sans-serif';
  ctx.fillText('Collect supplies and avoid enemies in this survival challenge.', canvas.width / 2, canvas.height / 2 + 24);
}

function spawnSupply() {
  if (state.supplyDrops.length >= gameConfig.supplyCount) return;
  const margin = 40;
  state.supplyDrops.push({
    x: margin + Math.random() * (canvas.width - margin * 2),
    y: margin + Math.random() * (canvas.height - margin * 2),
    size: 18,
  });
}

function spawnEnemy() {
  if (state.enemies.length >= gameConfig.maxEnemies) return;
  const origin = Math.random() < 0.5 ? 'horizontal' : 'vertical';
  const x = origin === 'horizontal' ? (Math.random() < 0.5 ? -20 : canvas.width + 20) : Math.random() * canvas.width;
  const y = origin === 'vertical' ? (Math.random() < 0.5 ? -20 : canvas.height + 20) : Math.random() * canvas.height;
  state.enemies.push({
    x,
    y,
    size: 24,
    speed: gameConfig.enemySpeedBase + Math.min(4, state.time / 6) * gameConfig.enemySpeedGrow,
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updatePlayer(delta) {
  let dx = 0;
  let dy = 0;
  if (state.keys.ArrowUp || state.keys.w) dy -= 1;
  if (state.keys.ArrowDown || state.keys.s) dy += 1;
  if (state.keys.ArrowLeft || state.keys.a) dx -= 1;
  if (state.keys.ArrowRight || state.keys.d) dx += 1;
  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    player.x += (dx / length) * state.speed * delta;
    player.y += (dy / length) * state.speed * delta;
  }
  player.x = clamp(player.x, player.size / 2, canvas.width - player.size / 2);
  player.y = clamp(player.y, player.size / 2, canvas.height - player.size / 2);
}

function updateEnemies(delta) {
  state.enemies.forEach((enemy) => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / distance) * enemy.speed * delta;
    enemy.y += (dy / distance) * enemy.speed * delta;
  });
}

function updateSupplies() {
  state.supplyDrops = state.supplyDrops.filter((supply) => {
    const dx = player.x - supply.x;
    const dy = player.y - supply.y;
    const dist = Math.hypot(dx, dy);
    if (dist < (player.size + supply.size) / 2) {
      state.supplies += 1;
      state.health = clamp(state.health + gameConfig.supplyHeal, 0, 100);
      return false;
    }
    return true;
  });
}

function detectCollisions(delta) {
  state.enemies.forEach((enemy) => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist < (player.size + enemy.size) / 2) {
      state.health -= gameConfig.enemyDamage * delta * 0.8;
    }
  });
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  state.supplyDrops.forEach((supply) => {
    ctx.beginPath();
    ctx.fillStyle = 'var(--supply)';
    ctx.fillRect(supply.x - supply.size / 2, supply.y - supply.size / 2, supply.size, supply.size);
  });

  state.enemies.forEach((enemy) => {
    ctx.beginPath();
    ctx.fillStyle = '#ef4444';
    ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.beginPath();
  ctx.fillStyle = player.color;
  ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.restore();
}

let lastTime = 0;
function gameLoop(timestamp) {
  if (!state.running) return;
  const delta = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  state.time += delta;
  state.health -= gameConfig.healthDrainPerSecond * delta;
  state.spawnTimer += delta;
  state.enemyTimer += delta;

  if (state.spawnTimer >= 2.4) {
    spawnSupply();
    state.spawnTimer = 0;
  }
  if (state.enemyTimer >= 1.9) {
    spawnEnemy();
    state.enemyTimer = 0;
  }

  updatePlayer(delta);
  updateEnemies(delta);
  updateSupplies();
  detectCollisions(delta);
  drawScene();
  updateHUD();

  if (state.health <= 0) {
    endGame();
    return;
  }

  requestAnimationFrame(gameLoop);
}

function endGame() {
  state.running = false;
  finalTime.textContent = state.time.toFixed(1);
  finalSupplies.textContent = state.supplies;
  gameOverPanel.classList.remove('hidden');
  startButton.textContent = 'Restart Game';
}

function startGame() {
  state.running = true;
  state.health = 100;
  state.time = 0;
  state.supplies = 0;
  state.enemies = [];
  state.supplyDrops = [];
  state.spawnTimer = 0;
  state.enemyTimer = 0;
  gameOverPanel.classList.add('hidden');
  updateHUD();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  state.keys[event.key] = true;
});
window.addEventListener('keyup', (event) => {
  state.keys[event.key] = false;
});
startButton.addEventListener('click', () => {
  if (!state.running) {
    startGame();
  }
});

resetGame();
