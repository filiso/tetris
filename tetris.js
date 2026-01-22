// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
    null,
    '#FF0D72', // I
    '#0DC2FF', // O
    '#0DFF72', // T
    '#F538FF', // S
    '#FF8E0D', // Z
    '#FFE138', // J
    '#3877FF'  // L
];

// Tetromino shapes
const SHAPES = [
    [], // Empty
    [[1,1,1,1]], // I
    [[2,2],[2,2]], // O
    [[0,3,0],[3,3,3]], // T
    [[0,4,4],[4,4,0]], // S
    [[5,5,0],[0,5,5]], // Z
    [[6,0,0],[6,6,6]], // J
    [[0,0,7],[7,7,7]]  // L
];

// Game state
let canvas, ctx;
let board = [];
let currentPiece = null;
let gameLoop = null;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let lines = 0;
let level = 1;
let isPaused = false;
let isGameOver = false;

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Create empty board
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            board[r][c] = 0;
        }
    }
    
    // Event listeners
    document.addEventListener('keydown', handleKeyPress);
    document.getElementById('restartBtn').addEventListener('click', restart);
    
    // Start game
    spawnPiece();
    requestAnimationFrame(update);
}

// Spawn a new piece
function spawnPiece() {
    const shapeIndex = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    currentPiece = {
        shape: SHAPES[shapeIndex],
        color: shapeIndex,
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[shapeIndex][0].length / 2),
        y: 0
    };
    
    // Check if game over
    if (checkCollision(currentPiece)) {
        gameOver();
    }
}

// Check collision
function checkCollision(piece, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Move piece
function movePiece(dir) {
    if (isPaused || isGameOver) return;
    
    if (!checkCollision(currentPiece, dir, 0)) {
        currentPiece.x += dir;
        draw();
    }
}

// Drop piece
function dropPiece() {
    if (isPaused || isGameOver) return;
    
    if (!checkCollision(currentPiece, 0, 1)) {
        currentPiece.y++;
        draw();
    } else {
        lockPiece();
    }
}

// Hard drop
function hardDrop() {
    if (isPaused || isGameOver) return;
    
    while (!checkCollision(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 2;
    }
    lockPiece();
}

// Rotate piece
function rotatePiece() {
    if (isPaused || isGameOver) return;
    
    const rotated = {
        ...currentPiece,
        shape: rotate(currentPiece.shape)
    };
    
    // Wall kick - try to move left or right if rotation fails
    if (!checkCollision(rotated)) {
        currentPiece.shape = rotated.shape;
    } else if (!checkCollision(rotated, 1, 0)) {
        currentPiece.x++;
        currentPiece.shape = rotated.shape;
    } else if (!checkCollision(rotated, -1, 0)) {
        currentPiece.x--;
        currentPiece.shape = rotated.shape;
    }
    draw();
}

// Rotate matrix
function rotate(matrix) {
    const N = matrix.length;
    const M = matrix[0].length;
    const rotated = [];
    
    for (let i = 0; i < M; i++) {
        rotated[i] = [];
        for (let j = 0; j < N; j++) {
            rotated[i][j] = matrix[N - 1 - j][i];
        }
    }
    return rotated;
}

// Lock piece to board
function lockPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
    
    clearLines();
    spawnPiece();
    draw();
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;
    
    for (let y = ROWS - 1; y >= 0; y--) {
        let isComplete = true;
        for (let x = 0; x < COLS; x++) {
            if (!board[y][x]) {
                isComplete = false;
                break;
            }
        }
        
        if (isComplete) {
            board.splice(y, 1);
            board.unshift(new Array(COLS).fill(0));
            linesCleared++;
            y++; // Check the same row again
        }
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        
        // Scoring: 100 for 1 line, 300 for 2, 500 for 3, 800 for 4
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] * level;
        
        // Level up every 10 lines
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        updateScore();
    }
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('lines').textContent = lines;
    document.getElementById('level').textContent = level;
}

// Draw game
function draw() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw board
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawBlock(x, y, board[y][x]);
            }
        }
    }
    
    // Draw current piece
    if (currentPiece) {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    drawBlock(currentPiece.x + x, currentPiece.y + y, currentPiece.color);
                }
            }
        }
    }
    
    // Draw grid
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
    }
}

// Draw a single block
function drawBlock(x, y, colorIndex) {
    ctx.fillStyle = COLORS[colorIndex];
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    // Add highlight for 3D effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, 3);
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, 3, BLOCK_SIZE);
    
    // Add shadow for 3D effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x * BLOCK_SIZE, (y + 1) * BLOCK_SIZE - 3, BLOCK_SIZE, 3);
    ctx.fillRect((x + 1) * BLOCK_SIZE - 3, y * BLOCK_SIZE, 3, BLOCK_SIZE);
}

// Game loop
function update(time = 0) {
    if (!isPaused && !isGameOver) {
        const deltaTime = time - lastTime;
        lastTime = time;
        dropCounter += deltaTime;
        
        if (dropCounter > dropInterval) {
            dropPiece();
            dropCounter = 0;
        }
    }
    
    requestAnimationFrame(update);
}

// Handle keyboard input
function handleKeyPress(e) {
    if (isGameOver) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            movePiece(-1);
            break;
        case 'ArrowRight':
            movePiece(1);
            break;
        case 'ArrowDown':
            dropPiece();
            score += 1;
            updateScore();
            break;
        case 'ArrowUp':
            rotatePiece();
            break;
        case ' ':
            e.preventDefault();
            hardDrop();
            updateScore();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }
}

// Toggle pause
function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    } else {
        draw();
    }
}

// Game over
function gameOver() {
    isGameOver = true;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Restart game
function restart() {
    // Reset game state
    board = [];
    for (let r = 0; r < ROWS; r++) {
        board[r] = [];
        for (let c = 0; c < COLS; c++) {
            board[r][c] = 0;
        }
    }
    
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropCounter = 0;
    isPaused = false;
    isGameOver = false;
    
    updateScore();
    document.getElementById('gameOver').classList.add('hidden');
    
    spawnPiece();
    draw();
}

// Start the game when page loads
window.addEventListener('load', init);
