/**
 * MAIN.JS
 * - Game State & Navigation
 * - Question Generator (HK S3 Math: Simple/Compound Interest)
 * - Canvas Rendering (Fake 3D)
 * - Calculator Logic
 */

// ==========================================
// 1. GAME CONFIG & STATE
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Audio context for simple beeps (optional, keeping silent for now to adhere to strict file limit simple request)

let state = {
    screen: 'menu', // menu, game
    layout: 'portrait', // portrait, landscape
    level: 1,
    health: 5,
    qIndex: 0, // 0 to 4 (5 questions per level)
    totalQPerLevel: 5,
    currentQ: null,
    lastAns: 0, // For Ans button
    combo: 0,
    monsterHP: 1, // 1 hit to kill usually
    particles: [],
    gridOffset: 0, // For running animation
    isRunning: false // Animation state
};

// ==========================================
// 2. MATH GENERATOR
// ==========================================
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function round2(num) { return Math.round((num + Number.EPSILON) * 100) / 100; }

const STORIES = [
    "你儲存了利是錢...",
    "你想在兩年後買 PS5 Pro...",
    "你向銀行借貸創業...",
    "你將零用錢放入定期存款...",
    "爸爸給你一筆基金..."
];

function generateQuestion(level) {
    const story = STORIES[randomInt(0, STORIES.length - 1)];
    let q = { text: "", ans: 0, type: "normal", context: story };
    
    // P: Principal, R: Rate (%), T: Time (years)
    // SI: I = P*R*T/100, A = P + I
    // CI: A = P * (1 + R/100)^T
    
    let P, R, T, n, mode;

    switch(level) {
        case 1: // Simple Interest (Find Amount or Interest)
            P = randomInt(10, 200) * 100; // 1000 to 20000
            R = randomInt(2, 15);
            T = randomInt(1, 5);
            mode = Math.random() > 0.5 ? 'I' : 'A';
            
            if (mode === 'I') {
                q.text = `[單利息 Simple Interest]\nP=$${P}, R=${R}%, T=${T}年\n求利息 (Find Interest).`;
                q.ans = (P * R * T) / 100;
            } else {
                q.text = `[單利息 Simple Interest]\nP=$${P}, R=${R}%, T=${T}年\n求本利和 (Find Amount).`;
                q.ans = P + (P * R * T) / 100;
            }
            break;

        case 2: // Compound Interest (Annual)
            P = randomInt(10, 100) * 1000;
            R = randomInt(2, 10);
            T = randomInt(2, 5);
            
            q.text = `[複利息 Compound Interest]\n(每年一結 / Compounded yearly)\nP=$${P}, R=${R}%, T=${T}年\n求本利和 (Find Amount).`;
            q.ans = P * Math.pow((1 + R/100), T);
            break;

        case 3: // Compound Interest (Non-annual)
            P = randomInt(5, 50) * 1000;
            R = randomInt(4, 12); // divisible usually
            T = randomInt(1, 3);
            let periods = [2, 4, 12]; // Half-year, Quarterly, Monthly
            let periodNames = ["半年 Half-yearly", "每季 Quarterly", "每月 Monthly"];
            let pIdx = randomInt(0, 2);
            let m = periods[pIdx];
            
            q.text = `[複利息 Compound Interest]\n(${periodNames[pIdx]})\nP=$${P}, R=${R}%, T=${T}年\n求本利和 (Find Amount).`;
            q.ans = P * Math.pow((1 + (R/100)/m), T*m);
            break;

        case 4: // Find P, R, or T (Mixed SI/CI)
            // Simplification: Find P is easiest for CI. Find R/T usually SI for S3 level unless trial/error.
            // Let's do Find Principal for CI.
            let targetA = randomInt(100, 200) * 100;
            R = randomInt(3, 8);
            T = randomInt(2, 5);
            // A = P(1+r)^t => P = A / (1+r)^t
            let realP = targetA / Math.pow(1 + R/100, T);
            // Present as: Find P if Amount is $TargetA...
            q.text = `[逆向複利息 Reverse CI]\n本利和 Amount=$${targetA}, R=${R}%, T=${T}年\n(每年一結 Yearly)\n求本金 (Find Principal).`;
            q.ans = realP;
            break;

        case 5: // Boss Level - Harder or Comparison
            // Comparison Question
            let pA = 10000, rA = 5, tA = 3; // SI
            let pB = 10000, rB = 4.8, tB = 3; // CI
            let amtA = pA + (pA*rA*tA/100);
            let amtB = pB * Math.pow(1 + rB/100, tB);
            
            // Just a standard hard question for simplicity of text input interface
            // Or non-annual Find Principal
             P = randomInt(10, 50) * 1000;
             R = 12; // Nice number
             m = 12; // Monthly
             T = 2;
             // Let's ask for Amount but trickier numbers
             q.text = `[BOSS LEVEL - 複利息]\n(每月一結 Monthly)\nP=$${P}, R=${R}%, T=${T}年\n求本利和 (Find Amount).`;
             q.ans = P * Math.pow((1 + (R/100)/m), T*m);
             break;
    }
    
    // Every 5th question is a "Boss" visually, logic is handled in render
    return q;
}

// ==========================================
// 3. ENGINE & VISUALS
// ==========================================

function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // Button Listeners
    document.getElementById('btn-portrait').onclick = () => startGame('portrait');
    document.getElementById('btn-landscape').onclick = () => startGame('landscape');
    document.getElementById('backBtn').onclick = stopGame;
    document.getElementById('btn-submit').onclick = checkAnswer;
    document.getElementById('btn-continue').onclick = loadGame;

    // Calculator Listeners
    document.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); handleCalc(btn.dataset.val); });
        btn.addEventListener('click', () => handleCalc(btn.dataset.val));
    });

    // Check Save
    if(localStorage.getItem('iw_save')) {
        let s = JSON.parse(localStorage.getItem('iw_save'));
        document.getElementById('save-msg').style.display = 'block';
        document.getElementById('save-lvl').innerText = s.level;
    }

    requestAnimationFrame(gameLoop);
}

function resize() {
    // In portrait mode, canvas is part of flex; in landscape, it's fixed ratio
    // Actually, we just need to fill the container the canvas is in.
    let container = document.getElementById('game-container');
    if (state.screen === 'game') {
        // We can't trust container size immediately if hidden, but handled in startGame
        let rect = canvas.parentElement.getBoundingClientRect();
        // In Portrait: Canvas is top part. In Landscape: Left part.
        // We set internal resolution to match display size for crisp text
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
}

function startGame(mode) {
    state.screen = 'game';
    state.layout = mode;
    
    let cont = document.getElementById('game-container');
    cont.classList.remove('hidden');
    cont.className = mode === 'portrait' ? 'layout-portrait' : 'layout-landscape';
    
    document.getElementById('menu').classList.add('hidden');
    
    // Trigger resize after layout change
    setTimeout(resize, 50);

    // Start new game if not continuing
    if (!state.currentQ) {
        resetLevel(1);
    }
    updateUI();
}

function stopGame() {
    state.screen = 'menu';
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    // Check save again
    if(localStorage.getItem('iw_save')) {
        let s = JSON.parse(localStorage.getItem('iw_save'));
        document.getElementById('save-lvl').innerText = s.level;
    }
}

function resetLevel(lvl) {
    state.level = lvl;
    state.health = 5;
    state.qIndex = 0;
    state.monsterHP = 1;
    state.currentQ = generateQuestion(lvl);
    state.isRunning = false;
    updateUI();
    saveGame();
}

function loadGame() {
    let s = JSON.parse(localStorage.getItem('iw_save'));
    state.level = s.level;
    state.health = s.health;
    state.qIndex = s.qIndex;
    state.currentQ = generateQuestion(state.level); // Regenerate a Q
    startGame('portrait'); // Default to portrait, user can switch later strictly speaking but simplified here
}

function saveGame() {
    localStorage.setItem('iw_save', JSON.stringify({
        level: state.level,
        health: state.health,
        qIndex: state.qIndex
    }));
}

// ==========================================
// 4. GAME LOOP (RENDER)
// ==========================================

function gameLoop() {
    if (state.screen === 'game') {
        update();
        draw();
    }
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
        let p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) state.particles.splice(i, 1);
    }

    // Running animation (Grid movement)
    if (state.isRunning) {
        state.gridOffset = (state.gridOffset + 10) % 100; // Speed
    }
}

function draw() {
    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let w = canvas.width;
    let h = canvas.height;
    let cx = w / 2;
    let cy = h / 2;

    // 1. SKY (Day/Night Cycle based on Level)
    let colors = ['#87CEEB', '#87CEEB', '#FFA500', '#4B0082', '#000033']; // Lvl 1-5
    let skyColor = colors[(state.level - 1) % 5];
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, w, h/2);

    // 2. GROUND (Grid)
    ctx.fillStyle = '#222';
    ctx.fillRect(0, h/2, w, h/2);
    
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Vertical perspective lines
    for (let i = -2000; i < 2000; i+=200) {
        ctx.moveTo(cx, h/2);
        ctx.lineTo(cx + i * 2, h);
    }
    
    // Horizontal moving lines
    // Illusion of depth: y increases exponentially
    for (let i = 0; i < 10; i++) {
        let p = (state.gridOffset + i * 100) / 1000; // 0 to 1
        let y = h/2 + (p * h/2);
        if (y > h) y = h;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
    }
    ctx.stroke();

    // 3. MONSTER
    // Simple Pixel Art ProcGen
    if (!state.isRunning) {
        drawMonster(cx, h/2 + 50, (state.qIndex + 1) * 0.2 + 0.5); // Scale up as level progresses
    }

    // 4. PARTICLES
    state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.s, p.s);
    });
}

function drawMonster(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    // Draw a generic pixel monster
    ctx.fillStyle = state.level === 5 ? '#f00' : '#800080'; // Red for boss, Purple normal
    
    // Body
    ctx.fillRect(-40, -80, 80, 80);
    // Eyes
    ctx.fillStyle = '#ff0';
    ctx.fillRect(-20, -60, 20, 20);
    ctx.fillRect(20, -60, 20, 20);
    // Teeth
    ctx.fillStyle = '#fff';
    ctx.fillRect(-30, -20, 10, 10);
    ctx.fillRect(0, -20, 10, 10);
    ctx.fillRect(30, -20, 10, 10);
    
    ctx.restore();
}

function spawnParticles() {
    for(let i=0; i<30; i++) {
        state.particles.push({
            x: canvas.width/2,
            y: canvas.height/2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 30,
            color: Math.random() > 0.5 ? '#f00' : '#ff0',
            s: 5
        });
    }
}

// ==========================================
// 5. GAME LOGIC
// ==========================================

function updateUI() {
    document.getElementById('level-display').innerText = state.level;
    document.getElementById('hp-display').innerText = "❤️".repeat(state.health);
    document.getElementById('progress-display').innerText = (state.qIndex + 1) + " / " + state.totalQPerLevel;
    document.getElementById('story-text').innerText = state.currentQ.context;
    document.getElementById('math-text').innerText = state.currentQ.text;
    document.getElementById('answer-input').value = "";
}

function checkAnswer() {
    let input = document.getElementById('answer-input').value;
    if (!input) return;

    // Determine tolerance (cents often off by rounding)
    let userAns = parseFloat(input);
    let correct = Math.abs(userAns - state.currentQ.ans) < 0.5; // Allow 50 cent error for rounding diffs

    state.lastAns = userAns; // Store for ANS button

    if (correct) {
        // CORRECT
        spawnParticles();
        state.isRunning = true; // Trigger run animation
        setTimeout(() => { state.isRunning = false; }, 1000);
        
        state.qIndex++;
        if (state.qIndex >= state.totalQPerLevel) {
            // Level Complete
            state.level++;
            if (state.level > 5) {
                alert("恭喜! 你已擊敗所有 Boss! (Game Cleared)");
                state.level = 1;
            }
            resetLevel(state.level);
        } else {
            // Next Question
            state.currentQ = generateQuestion(state.level);
            saveGame();
            updateUI();
        }
    } else {
        // WRONG
        state.health--;
        document.body.classList.add('shake-effect');
        setTimeout(() => document.body.classList.remove('shake-effect'), 500);
        
        if (state.health <= 0) {
            alert("GAME OVER! Try Level " + state.level + " again.");
            resetLevel(state.level);
        } else {
            updateUI();
            saveGame();
        }
    }
}

// ==========================================
// 6. CALCULATOR
// ==========================================

function handleCalc(val) {
    let input = document.getElementById('answer-input');
    
    if (val === 'AC') {
        input.value = '';
    } else if (val === 'DEL') {
        input.value = input.value.slice(0, -1);
    } else if (val === 'ANS') {
        input.value += state.lastAns;
    } else if (val === 'ROOT') {
        // Logic: User types index y, then root button
