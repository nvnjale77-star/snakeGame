const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startBtn = document.getElementById("start-btn");

const GRID = 20;
const CELL = canvas.width / GRID;
const HIGH_SCORE_KEY = "snakeHighScore";

const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};

let snake;
let direction;
let nextDirection;
let food;
let score;
let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
let loopId = null;
let tickMs;
let running = false;
let paused = false;

highScoreEl.textContent = highScore;

function randomEmptyCell() {
    const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
    const empty = [];
    for (let x = 0; x < GRID; x += 1) {
        for (let y = 0; y < GRID; y += 1) {
            if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
        }
    }
    return empty[Math.floor(Math.random() * empty.length)];
}

function resetGame() {
    const mid = Math.floor(GRID / 2);
    snake = [
        { x: mid, y: mid },
        { x: mid - 1, y: mid },
        { x: mid - 2, y: mid },
    ];
    direction = DIRS.right;
    nextDirection = DIRS.right;
    food = randomEmptyCell();
    score = 0;
    tickMs = 140;
    scoreEl.textContent = score;
}

function drawCell(x, y, color, inset = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(x * CELL + inset, y * CELL + inset, CELL - inset * 2, CELL - inset * 2);
}

function draw() {
    ctx.fillStyle = "#08140c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(61, 220, 132, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL);
        ctx.lineTo(canvas.width, i * CELL);
        ctx.stroke();
    }

    drawCell(food.x, food.y, "#ff5a5a", 3);

    snake.forEach((part, index) => {
        drawCell(part.x, part.y, index === 0 ? "#3ddc84" : "#2aa866", 2);
    });
}

function same(a, b) {
    return a.x === b.x && a.y === b.y;
}

function opposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
}

function setDirection(dir) {
    if (!dir) return;
    if (opposite(dir, direction)) return;
    nextDirection = dir;
}

function gameOver() {
    running = false;
    paused = false;
    clearTimeout(loopId);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
        highScoreEl.textContent = highScore;
    }
    overlayTitle.textContent = "Game Over";
    overlayText.textContent = `You scored ${score}. Press Start to play again.`;
    startBtn.textContent = "Play Again";
    overlay.classList.remove("hidden");
}

function tick() {
    if (!running || paused) return;

    direction = nextDirection;
    const head = snake[0];
    const next = { x: head.x + direction.x, y: head.y + direction.y };

    const hitWall = next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID;
    const hitSelf = snake.some((part) => same(part, next));
    if (hitWall || hitSelf) {
        gameOver();
        return;
    }

    snake.unshift(next);

    if (same(next, food)) {
        score += 10;
        scoreEl.textContent = score;
        tickMs = Math.max(70, tickMs - 3);
        if (snake.length === GRID * GRID) {
            gameOver();
            overlayTitle.textContent = "You Win!";
            overlayText.textContent = "The board is full. Amazing run!";
            return;
        }
        food = randomEmptyCell();
    } else {
        snake.pop();
    }

    draw();
    loopId = setTimeout(tick, tickMs);
}

function startGame() {
    clearTimeout(loopId);
    resetGame();
    running = true;
    paused = false;
    overlay.classList.add("hidden");
    draw();
    loopId = setTimeout(tick, tickMs);
}

function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) {
        overlayTitle.textContent = "Paused";
        overlayText.textContent = "Press Space or the button to continue.";
        startBtn.textContent = "Resume";
        overlay.classList.remove("hidden");
        clearTimeout(loopId);
    } else {
        overlay.classList.add("hidden");
        loopId = setTimeout(tick, tickMs);
    }
}

startBtn.addEventListener("click", () => {
    if (paused) {
        togglePause();
        return;
    }
    startGame();
});

const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    a: "left",
    s: "down",
    d: "right",
    W: "up",
    A: "left",
    S: "down",
    D: "right",
};

document.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
        event.preventDefault();
        if (!running) {
            startGame();
        } else {
            togglePause();
        }
        return;
    }
    const name = keyMap[event.key];
    if (name) {
        event.preventDefault();
        setDirection(DIRS[name]);
    }
});

document.querySelectorAll(".dpad button").forEach((btn) => {
    btn.addEventListener("click", () => setDirection(DIRS[btn.dataset.dir]));
});

let touchStart = null;
canvas.addEventListener("touchstart", (event) => {
    const t = event.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

canvas.addEventListener("touchend", (event) => {
    if (!touchStart) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? DIRS.right : DIRS.left);
    } else {
        setDirection(dy > 0 ? DIRS.down : DIRS.up);
    }
}, { passive: true });

resetGame();
draw();
