// ==== Constants ====
const CELL = 24;                  // Pixel size of a grid cell
const GRID = 20;                  // Grid width & height (GRID x GRID)
const START_LEN = 4;              // Starting length of the snake
const SPEED_BASE = 7;             // Base moves per second
const SPEED_STEP = 0.25;          // Speed increase per fruit
const MAX_SPEED = 20;             // Maximum speed cap

// ==== DOM Elements ====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const stateTitle = document.getElementById('stateTitle');
const stateSubtitle = document.getElementById('stateSubtitle');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const speedEl = document.getElementById('speed');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const wrapBtn = document.getElementById('wrapBtn');
const resumeBtn = document.getElementById('resumeBtn');
const overlayRestart = document.getElementById('overlayRestart');
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

// ==== Game State ====
let wrapWalls = false;
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let snake = [];
let food = null;
let running = false;
let paused = false;
let gameOver = false;
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;
let speed = SPEED_BASE;
let lastTick = 0;
let acc = 0;

// Initialize high score display
highEl.textContent = highScore;

// ==== Helper Functions ====
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ==== Game Logic ====
function reset() {
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  snake = [];
  for (let i = START_LEN - 1; i >= 0; i--) {
    snake.push({ x: Math.floor(GRID / 2) - i, y: Math.floor(GRID / 2) });
  }
  placeFood();
  running = false;
  paused = false;
  gameOver = false;
  score = 0;
  speed = SPEED_BASE;
  acc = 0;
  lastTick = 0;
  scoreEl.textContent = '0';
  speedEl.textContent = '1x';
  hideOverlay();
  draw();
}

function placeFood() {
  const empty = [];
  const occ = new Set(snake.map(p => `${p.x},${p.y}`));
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const key = `${x},${y}`;
      if (!occ.has(key)) empty.push({ x, y });
    }
  }
  food = empty.length ? empty[Math.floor(Math.random() * empty.length)] : null;
}

function start() {
  if (gameOver) reset();
  running = true;
  paused = false;
  hideOverlay();
  lastTick = performance.now();
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  if (paused) {
    showPause();
  } else {
    hideOverlay();
    lastTick = performance.now();
  }
}

function showPause() {
  stateTitle.textContent = 'Paused';
  stateSubtitle.innerHTML = 'Press <span class="kbd">Space</span> to resume';
  showOverlay();
}

function showGameOver() {
  stateTitle.textContent = 'Game Over';
  stateSubtitle.textContent = 'Press R or any arrow key to restart';
  showOverlay();
}

function showOverlay() {
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function step(dt) {
  if (!running || paused || gameOver) return;
  acc += dt;
  const msPerMove = 1000 / Math.max(1, speed);
  if (acc < msPerMove) return;
  acc -= msPerMove;

  if ((nextDir.x !== -dir.x) || (nextDir.y !== -dir.y)) {
    dir = nextDir;
  }

  let head = { ...snake[0] };
  head.x += dir.x;
  head.y += dir.y;

  if (wrapWalls) {
    head.x = (head.x + GRID) % GRID;
    head.y = (head.y + GRID) % GRID;
  } else {
    if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
      return endGame();
    }
  }

  for (const s of snake) {
    if (s.x === head.x && s.y === head.y) {
      return endGame();
    }
  }

  snake.unshift(head);

  if (food && head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    speed = Math.min(SPEED_BASE + (score / 10) * SPEED_STEP, MAX_SPEED);
    speedEl.textContent = (speed / SPEED_BASE).toFixed(2) + 'x';
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function endGame() {
  gameOver = true;
  running = false;
  paused = false;
  draw();
  if (score > highScore) {
    highScore = score;
    highEl.textContent = score;
    localStorage.setItem('highScore', score.toString());
  }
  showGameOver();
}

function draw() {
  const w = canvas.width;
  const h = canvas.height;

  // Clear canvas with gradient background
  const g1 = ctx.createLinearGradient(0, 0, 0, h);
  g1.addColorStop(0, '#0b1324');
  g1.addColorStop(1, '#0a1020');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);

  // Draw food glow
  if (food) {
    const cx = food.x * CELL + CELL / 2;
    const cy = food.y * CELL + CELL / 2;
    const r = CELL * 0.9;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    grad.addColorStop(0, 'rgba(134, 239, 172, 0.9)');
    grad.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw snake
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    const x = s.x * CELL;
    const y = s.y * CELL;
    const isHead = i === 0;
    const radius = 6;
    ctx.fillStyle = isHead ? '#22c55e' : '#16a34a';
    roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, radius);
    ctx.fill();

    if (isHead) {
      ctx.fillStyle = '#06281a';
      const ex = x + CELL / 2 + (dir.x === 1 ? 4 : dir.x === -1 ? -4 : 0);
      const ey = y + CELL / 2 + (dir.y === 1 ? 4 : dir.y === -1 ? -4 : 0);
      ctx.beginPath();
      ctx.arc(ex, ey, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw food
  if (food) {
    const x = food.x * CELL;
    const y = food.y * CELL;
    ctx.fillStyle = '#e11d48';
    roundRect(ctx, x + 4, y + 4, CELL - 8, CELL - 8, 8);
    ctx.fill();
  }
}

// ==== Game Loop ====
function loop(ts) {
  const dt = ts - lastTick;
  lastTick = ts;
  step(dt);
  requestAnimationFrame(loop);
}

// ==== Input Handling ====
function setDirection(x, y) {
  if (!running || paused || gameOver) return;
  if ((x === -dir.x && y === 0) || (y === -dir.y && x === 0)) return;
  nextDir = { x, y };
}

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (gameOver) {
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
      e.preventDefault();
      reset();
      start();
      switch (k) {
        case 'arrowup':
        case 'w':
          setDirection(0, -1);
          break;
        case 'arrowdown':
        case 's':
          setDirection(0, 1);
          break;
        case 'arrowleft':
        case 'a':
          setDirection(-1, 0);
          break;
        case 'arrowright':
        case 'd':
          setDirection(1, 0);
          break;
      }
      return;
    }
  }

  if (!running && !gameOver && (k === 'arrowup' || k === 'w')) {
    e.preventDefault();
    start();
    setDirection(0, -1);
    return;
  }

  if (['arrowup', 'w'].includes(k)) {
    e.preventDefault();
    setDirection(0, -1);
  } else if (['arrowdown', 's'].includes(k)) {
    e.preventDefault();
    setDirection(0, 1);
  } else if (['arrowleft', 'a'].includes(k)) {
    e.preventDefault();
    setDirection(-1, 0);
  } else if (['arrowright', 'd'].includes(k)) {
    e.preventDefault();
    setDirection(1, 0);
  } else if (k === ' ' || k === 'p') {
    e.preventDefault();
    togglePause();
  } else if (k === 'r') {
    e.preventDefault();
    reset();
    start();
  } else if (k === 't') {
    e.preventDefault();
    wrapWalls = !wrapWalls;
    wrapBtn.textContent = 'Wrap: ' + (wrapWalls ? 'On' : 'Off');
  }
});

// ==== Button Event Listeners ====
upBtn.addEventListener('click', () => setDirection(0, -1));
downBtn.addEventListener('click', () => setDirection(0, 1));
leftBtn.addEventListener('click', () => setDirection(-1, 0));
rightBtn.addEventListener('click', () => setDirection(1, 0));

startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', () => { reset(); start(); });
wrapBtn.addEventListener('click', () => {
  wrapWalls = !wrapWalls;
  wrapBtn.textContent = 'Wrap: ' + (wrapWalls ? 'On' : 'Off');
});
resumeBtn.addEventListener('click', togglePause);
overlayRestart.addEventListener('click', () => { reset(); start(); });

// ==== Initialize Game ====
reset();
requestAnimationFrame(loop);
