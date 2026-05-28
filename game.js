// Tuukka's Thesis Quest - 2D Platformer
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
 
// Game state
let gameRunning = false;
let gameTime = 0;
let startTime = 0;
let articles = 0;
let interviews = 0;
let cameraX = 0;
 
// Level dimensions
const LEVEL_WIDTH = 6000;
const GROUND_Y = 440;
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const MOVE_SPEED = 5;
const MAX_SPEED = 7;
 
// Player (Tuukka)
const player = {
    x: 100,
    y: GROUND_Y - 50,
    width: 36,
    height: 50,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    frame: 0,
    frameTimer: 0
};
 
// Input
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', e => {
    keys[e.code] = false;
});
 
// Platform generation
let platforms = [];
let collectibles = [];
let decorations = [];
let finishLine = LEVEL_WIDTH - 200;
 
function generateLevel() {
    platforms = [];
    collectibles = [];
    decorations = [];
 
    // Ground segments with gaps
    let gx = 0;
    while (gx < LEVEL_WIDTH) {
        const segLen = 150 + Math.random() * 300;
        platforms.push({ x: gx, y: GROUND_Y, width: segLen, height: 60, type: 'ground' });
        gx += segLen;
        // Occasional gap
        if (gx > 300 && gx < LEVEL_WIDTH - 400 && Math.random() < 0.3) {
            gx += 80 + Math.random() * 60;
        }
    }
 
    // Floating platforms
    for (let i = 0; i < 45; i++) {
        const px = 300 + Math.random() * (LEVEL_WIDTH - 600);
        const py = 200 + Math.random() * 200;
        const pw = 80 + Math.random() * 120;
        platforms.push({ x: px, y: py, width: pw, height: 20, type: 'floating' });
    }
 
    // Collectibles - Articles (on platforms and ground)
    for (let i = 0; i < 25; i++) {
        const cx = 200 + (i / 25) * (LEVEL_WIDTH - 400);
        const plat = platforms[Math.floor(Math.random() * platforms.length)];
        collectibles.push({
            x: plat.x + Math.random() * (plat.width - 20),
            y: plat.y - 40,
            width: 24,
            height: 30,
            type: 'article',
            collected: false,
            bobOffset: Math.random() * Math.PI * 2
        });
    }
 
    // Collectibles - Interviews (rarer, higher up)
    for (let i = 0; i < 12; i++) {
        const cx = 400 + (i / 12) * (LEVEL_WIDTH - 600);
        const cy = 120 + Math.random() * 150;
        collectibles.push({
            x: cx,
            y: cy,
            width: 26,
            height: 26,
            type: 'interview',
            collected: false,
            bobOffset: Math.random() * Math.PI * 2
        });
    }
 
    // Background decorations (trees, buildings)
    for (let i = 0; i < 30; i++) {
        decorations.push({
            x: Math.random() * LEVEL_WIDTH,
            y: GROUND_Y,
            type: Math.random() < 0.5 ? 'tree' : 'building',
            height: 60 + Math.random() * 80,
            width: 30 + Math.random() * 40
        });
    }
}
 
function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('endScreen').style.display = 'none';
 
    // Reset
    player.x = 100;
    player.y = GROUND_Y - 50;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    articles = 0;
    interviews = 0;
    cameraX = 0;
    gameTime = 0;
    startTime = Date.now();
 
    generateLevel();
    gameRunning = true;
    requestAnimationFrame(gameLoop);
}
 
function endGame() {
    gameRunning = false;
    gameTime = (Date.now() - startTime) / 1000;
 
    // Calculate thesis quality
    const totalPages = articles * 3 + interviews * 7;
    const maxItems = 37; // 25 articles + 12 interviews
    const collected = articles + interviews;
    const collectionRatio = collected / maxItems;
 
    // Speed bonus: faster = better (under 60s is great, over 120s is slow)
    let speedScore = 0;
    if (gameTime < 45) speedScore = 100;
    else if (gameTime < 60) speedScore = 90;
    else if (gameTime < 80) speedScore = 75;
    else if (gameTime < 100) speedScore = 60;
    else if (gameTime < 130) speedScore = 45;
    else speedScore = 30;
 
    // Length score based on pages
    let lengthScore = 0;
    if (totalPages >= 150) lengthScore = 100;
    else if (totalPages >= 120) lengthScore = 90;
    else if (totalPages >= 90) lengthScore = 75;
    else if (totalPages >= 60) lengthScore = 60;
    else if (totalPages >= 30) lengthScore = 40;
    else lengthScore = 20;
 
    // Final score: weighted combination
    const finalScore = speedScore * 0.4 + lengthScore * 0.6;
 
    let grade, comment;
    if (finalScore >= 90) { grade = '5'; comment = 'Excellent! A masterpiece of academic work!'; }
    else if (finalScore >= 75) { grade = '4'; comment = 'Great thesis! Well researched and timely.'; }
    else if (finalScore >= 60) { grade = '3'; comment = 'Solid work. Could use more sources.'; }
    else if (finalScore >= 45) { grade = '2'; comment = 'Passable, but the supervisor is not impressed.'; }
    else if (finalScore >= 30) { grade = '1'; comment = 'Barely passed... maybe try again?'; }
    else { grade = '0'; comment = 'Did you even try? The supervisor is disappointed.'; }
 
    document.getElementById('gradeDisplay').textContent = `Grade: ${grade}/5`;
    document.getElementById('statArticles').textContent = `📄 Articles collected: ${articles}/25`;
    document.getElementById('statInterviews').textContent = `🎤 Interviews collected: ${interviews}/12`;
    document.getElementById('statPages').textContent = `📜 Thesis length: ${totalPages} pages`;
    document.getElementById('statTime').textContent = `⏱ Time: ${gameTime.toFixed(1)}s`;
    document.getElementById('statComment').textContent = comment;
    document.getElementById('endScreen').style.display = 'flex';
}
 
function update() {
    // Input
    let moveX = 0;
    if (keys['ArrowLeft'] || keys['KeyA']) moveX = -1;
    if (keys['ArrowRight'] || keys['KeyD']) moveX = 1;
 
    // Horizontal movement
    if (moveX !== 0) {
        player.vx += moveX * 0.8;
        player.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.vx));
        player.facing = moveX;
    } else {
        player.vx *= 0.85;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }
 
    // Jump
    if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && player.onGround) {
        player.vy = JUMP_FORCE;
        player.onGround = false;
    }
 
    // Gravity
    player.vy += GRAVITY;
 
    // Move player
    player.x += player.vx;
    player.y += player.vy;
 
    // Platform collision
    player.onGround = false;
    for (const plat of platforms) {
        if (player.x + player.width > plat.x &&
            player.x < plat.x + plat.width &&
            player.y + player.height > plat.y &&
            player.y + player.height < plat.y + 20 &&
            player.vy >= 0) {
            player.y = plat.y - player.height;
            player.vy = 0;
            player.onGround = true;
        }
    }
 
    // Fall death - respawn
    if (player.y > 600) {
        player.y = 100;
        player.vy = 0;
        // Move back a bit
        player.x = Math.max(100, player.x - 200);
    }
 
    // Boundaries
    if (player.x < 0) player.x = 0;
 
    // Collectibles
    for (const c of collectibles) {
        if (c.collected) continue;
        const bobY = c.y + Math.sin(Date.now() / 400 + c.bobOffset) * 5;
        if (player.x + player.width > c.x &&
            player.x < c.x + c.width &&
            player.y + player.height > bobY &&
            player.y < bobY + c.height) {
            c.collected = true;
            if (c.type === 'article') articles++;
            else interviews++;
        }
    }
 
    // Camera
    const targetCam = player.x - canvas.width / 3;
    cameraX += (targetCam - cameraX) * 0.08;
    cameraX = Math.max(0, Math.min(LEVEL_WIDTH - canvas.width, cameraX));
 
    // Animation
    if (Math.abs(player.vx) > 0.5) {
        player.frameTimer++;
        if (player.frameTimer > 6) {
            player.frame = (player.frame + 1) % 4;
            player.frameTimer = 0;
        }
    } else {
        player.frame = 0;
    }
 
    // Check finish
    if (player.x > finishLine) {
        endGame();
    }
 
    // Update UI
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const pages = articles * 3 + interviews * 7;
    document.getElementById('articles').textContent = `📄 Articles: ${articles}`;
    document.getElementById('interviews').textContent = `🎤 Interviews: ${interviews}`;
    document.getElementById('thesisLength').textContent = `📜 Thesis: ${pages} pages`;
    document.getElementById('timer').textContent = `⏱ Time: ${elapsed}s`;
}
 
function drawBackground() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0f3460');
    grad.addColorStop(0.6, '#16213e');
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
 
    // Parallax clouds
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 0; i < 8; i++) {
        const cx = ((i * 300 + 100) - cameraX * 0.2) % (canvas.width + 200) - 100;
        const cy = 50 + (i % 3) * 40;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 60, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 30, cy - 5, 40, 15, 0, 0, Math.PI * 2);
        ctx.fill();
    }
 
    // Background decorations
    for (const d of decorations) {
        const dx = d.x - cameraX * 0.5;
        if (dx < -100 || dx > canvas.width + 100) continue;
        if (d.type === 'tree') {
            ctx.fillStyle = '#1a4a1a';
            ctx.fillRect(dx + d.width / 2 - 5, d.y - d.height, 10, d.height);
            ctx.fillStyle = '#2d6b2d';
            ctx.beginPath();
            ctx.arc(dx + d.width / 2, d.y - d.height, d.width / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#1a1a3e';
            ctx.fillRect(dx, d.y - d.height, d.width, d.height);
            // Windows
            ctx.fillStyle = '#e9a560';
            for (let wy = d.y - d.height + 10; wy < d.y - 10; wy += 20) {
                for (let wx = dx + 5; wx < dx + d.width - 10; wx += 15) {
                    ctx.fillRect(wx, wy, 8, 10);
                }
            }
        }
    }
}
 
function drawPlatforms() {
    for (const plat of platforms) {
        const px = plat.x - cameraX;
        if (px > canvas.width + 50 || px + plat.width < -50) continue;
 
        if (plat.type === 'ground') {
            // Ground
            ctx.fillStyle = '#2d5a27';
            ctx.fillRect(px, plat.y, plat.width, plat.height);
            // Grass top
            ctx.fillStyle = '#4a9e3f';
            ctx.fillRect(px, plat.y, plat.width, 8);
            // Dirt texture
            ctx.fillStyle = '#6b4226';
            ctx.fillRect(px, plat.y + 8, plat.width, plat.height - 8);
            ctx.fillStyle = '#2d5a27';
            ctx.fillRect(px, plat.y, plat.width, 10);
        } else {
            // Floating platform
            ctx.fillStyle = '#5a3a1a';
            ctx.fillRect(px, plat.y, plat.width, plat.height);
            ctx.fillStyle = '#7a5a3a';
            ctx.fillRect(px, plat.y, plat.width, 6);
            // Brick lines
            ctx.strokeStyle = '#4a2a0a';
            ctx.lineWidth = 1;
            for (let bx = px; bx < px + plat.width; bx += 20) {
                ctx.beginPath();
                ctx.moveTo(bx, plat.y);
                ctx.lineTo(bx, plat.y + plat.height);
                ctx.stroke();
            }
        }
    }
}
 
function drawPlayer() {
    const px = player.x - cameraX;
    const py = player.y;
 
    ctx.save();
    ctx.translate(px + player.width / 2, py + player.height / 2);
    if (player.facing < 0) ctx.scale(-1, 1);
    ctx.translate(-player.width / 2, -player.height / 2);
 
    // Body
    ctx.fillStyle = '#3498db';
    ctx.fillRect(4, 16, 28, 24);
 
    // Head
    ctx.fillStyle = '#fdbcb4';
    ctx.beginPath();
    ctx.arc(18, 12, 12, 0, Math.PI * 2);
    ctx.fill();
 
    // Hair
    ctx.fillStyle = '#5a3825';
    ctx.beginPath();
    ctx.arc(18, 8, 11, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(8, 4, 20, 6);
 
    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(14, 10, 3, 3);
    ctx.fillRect(21, 10, 3, 3);
 
    // Smile
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(18, 15, 4, 0.1, Math.PI - 0.1);
    ctx.stroke();
 
    // Legs with animation
    ctx.fillStyle = '#2c3e50';
    const legOffset = Math.sin(player.frame * Math.PI / 2) * 4;
    ctx.fillRect(8, 40, 8, 10);
    ctx.fillRect(20, 40, 8, 10);
 
    // Shoes
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(6, 48, 10, 4);
    ctx.fillRect(20, 48, 10, 4);
 
    // Backpack (for thesis!)
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(-2, 18, 8, 16);
    ctx.fillStyle = '#d35400';
    ctx.fillRect(-2, 18, 8, 3);
 
    ctx.restore();
 
    // Name tag
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('TUUKKA', px + player.width / 2, py - 8);
}
 
function drawCollectibles() {
    const time = Date.now();
    for (const c of collectibles) {
        if (c.collected) continue;
        const cx = c.x - cameraX;
        if (cx < -30 || cx > canvas.width + 30) continue;
 
        const bobY = c.y + Math.sin(time / 400 + c.bobOffset) * 5;
        const glow = 0.5 + Math.sin(time / 300 + c.bobOffset) * 0.3;
 
        if (c.type === 'article') {
            // Article - paper document
            ctx.save();
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 5 * glow;
 
            // Paper
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx, bobY, 20, 26);
            // Fold corner
            ctx.fillStyle = '#ddd';
            ctx.beginPath();
            ctx.moveTo(cx + 14, bobY);
            ctx.lineTo(cx + 20, bobY + 6);
            ctx.lineTo(cx + 14, bobY + 6);
            ctx.closePath();
            ctx.fill();
            // Text lines
            ctx.fillStyle = '#666';
            ctx.fillRect(cx + 3, bobY + 10, 14, 2);
            ctx.fillRect(cx + 3, bobY + 14, 12, 2);
            ctx.fillRect(cx + 3, bobY + 18, 14, 2);
            ctx.fillRect(cx + 3, bobY + 22, 8, 2);
 
            ctx.restore();
        } else {
            // Interview - microphone
            ctx.save();
            ctx.shadowColor = '#e94560';
            ctx.shadowBlur = 8 * glow;
 
            // Mic body
            ctx.fillStyle = '#333';
            ctx.fillRect(cx + 9, bobY + 10, 6, 14);
            // Mic head
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(cx + 12, bobY + 8, 8, 0, Math.PI * 2);
            ctx.fill();
            // Mic grid
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(cx + 12, bobY + 8, 6, 0, Math.PI * 2);
            ctx.fill();
            // Grid lines
            ctx.strokeStyle = '#777';
            ctx.lineWidth = 0.5;
            for (let gy = bobY + 4; gy < bobY + 13; gy += 2) {
                ctx.beginPath();
                ctx.moveTo(cx + 7, gy);
                ctx.lineTo(cx + 17, gy);
                ctx.stroke();
            }
 
            ctx.restore();
        }
    }
}
 
function drawFinishLine() {
    const fx = finishLine - cameraX;
    if (fx < -50 || fx > canvas.width + 50) return;
 
    // Flag pole
    ctx.fillStyle = '#888';
    ctx.fillRect(fx, GROUND_Y - 150, 4, 150);
 
    // Flag
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.moveTo(fx + 4, GROUND_Y - 150);
    ctx.lineTo(fx + 54, GROUND_Y - 130);
    ctx.lineTo(fx + 4, GROUND_Y - 110);
    ctx.closePath();
    ctx.fill();
 
    // Text on flag
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('SUBMIT', fx + 10, GROUND_Y - 127);
 
    // Checkered pattern on ground
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 2; j++) {
            ctx.fillStyle = (i + j) % 2 === 0 ? '#fff' : '#333';
            ctx.fillRect(fx - 30 + i * 15, GROUND_Y - 10 + j * 10, 15, 10);
        }
    }
}
 
function drawProgressBar() {
    const progress = Math.min(1, player.x / finishLine);
    const barWidth = 200;
    const barX = canvas.width - barWidth - 20;
    const barY = 15;
 
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barWidth, 12);
    ctx.fillStyle = '#4a9e3f';
    ctx.fillRect(barX, barY, barWidth * progress, 12);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, 12);
 
    ctx.fillStyle = '#fff';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(progress * 100)}%`, barX + barWidth / 2, barY + 10);
 
    // Tuukka icon on progress
    ctx.fillText('🏃', barX + barWidth * progress - 5, barY - 2);
}
 
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawPlatforms();
    drawCollectibles();
    drawFinishLine();
    drawPlayer();
    drawProgressBar();
}
 
function gameLoop() {
    if (!gameRunning) return;
    update();
    render();
    requestAnimationFrame(gameLoop);
}
 
// Make startGame available globally
window.startGame = startGame;
