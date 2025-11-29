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

let state = {
    screen: 'menu', // menu, game
    layout: 'portrait', // portrait, landscape
    level: 1,
    health: 5,
    qIndex: 0, 
    totalQPerLevel: 5,
    currentQ: null,
    lastAns: 0, // For Ans button
    monsterHP: 1,
    particles: [],
    gridOffset: 0, 
    isRunning: false
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
    let q = { text: "", ans: 0, type: "normal", context: story, options: null };
    
    let P, R, T, n, mode;

    switch(level) {
        case 1: // Simple Interest
            P = randomInt(10, 200) * 100;
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
            R = randomInt(4, 12);
            T = randomInt(1, 3);
            let periods = [2, 4, 12]; 
            let periodNames = ["半年 Half-yearly", "每季 Quarterly", "每月 Monthly"];
            let pIdx = randomInt(0, 2);
            let m = periods[pIdx];
            
            q.text = `[複利息 Compound Interest]\n(${periodNames[pIdx]})\nP=$${P}, R=${R}%, T=${T}年\n求本利和 (Find Amount).`;
            q.ans = P * Math.pow((1 + (R/100)/m), T*m);
            break;

        case 4: // Reverse Problems
            let targetA = randomInt(100, 200) * 100;
            R = randomInt(3, 8);
            T = randomInt(2, 5);
            let realP = targetA / Math.pow(1 + R/100, T);
            q.text = `[逆向複利息 Reverse CI]\n本利和 Amount=$${targetA}, R=${R}%, T=${T}年\n(每年一結 Yearly)\n求本金 (Find Principal).`;
            q.ans = realP;
            break;

        case 5: // BOSS BATTLE: Comparison
            q.type = "comparison";
            let bP = randomInt(5, 20) * 1000;
            let bT = randomInt(2, 5);
            // Plan A: Simple Interest High Rate
            let rA = randomInt(6, 9); 
            // Plan B: Compound Interest Lower Rate
            let rB = randomInt(4, 7);
            
            let valA = bP + (bP * rA * bT)/100;
            let valB = bP * Math.pow(1 + rB/100, bT);
            
            q.text = `[BOSS BATTLE] P=$${bP}, T=${bT}年\nPlan A: ${rA}% Simple Interest\nPlan B: ${rB}% Compounded Yearly`;
            q.ans = valA > valB ? "A" : "B";
            q.options = { A: valA, B: valB };
            break;
    }
    return q;
}

// ==========================================
// 3. ENGINE & VISUALS
// ==========================================

function init() {
    resize();
    window.addEventListener('resize', resize);
    
    document.getElementById('btn-portrait').onclick = () => startGame('portrait');
    document.getElementById('btn-landscape').onclick = () => startGame('landscape');
    document.getElementById('backBtn').onclick = stopGame;
    document.getElementById('btn-submit').onclick = checkAnswer;
    document.getElementById('btn-continue').onclick = loadGame;
    
    // Boss Buttons
    document.getElementById('btn-planA').onclick = () => checkBossAnswer('A');
    document.getElementById('btn-planB').onclick = () => checkBossAnswer('B');

    document.querySelectorAll('.calc-btn').forEach(btn => {
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); handleCalc(btn.dataset.val); });
        btn.addEventListener('click', () => handleCalc(btn.dataset.val));
    });

    if(localStorage.getItem('iw_save')) {
        let s = JSON.parse(localStorage.getItem('iw_save'));
        document.getElementById('save-msg').style.display = 'block';
        document.getElementById('save-lvl').innerText = s.level;
    }

    requestAnimationFrame(gameLoop);
}

function resize() {
    let container = document.getElementById('game-container');
    if (state.screen === 'game') {
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
    setTimeout(resize, 50);

    if (!state.currentQ) {
        resetLevel(1);
    }
    updateUI();
}

function stopGame() {
    state.screen = 'menu';
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
}

function resetLevel(lvl) {
    state.level = lvl;
    state.health = 5;
    state.qIndex = 0;
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
    state.currentQ = generateQuestion(state.level); 
    startGame('portrait'); 
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
    for (let i = state.particles.length - 1; i >= 0; i--) {
        let p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) state.particles.splice(i, 1);
    }
    if (state.isRunning) {
        state.gridOffset = (state.gridOffset + 10) % 100; 
    }
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let w = canvas.width;
    let h = canvas.height;
    let cx = w / 2;

    // Sky colors
    let colors = ['#87CEEB', '#87CEEB', '#FFA500', '#4B0082', '#330000']; // Red sky for boss
    let skyColor = colors[(state.level - 1) % 5];
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, w, h/2);

    // Ground
    ctx.fillStyle = '#222';
    ctx.fillRect(0, h/2, w, h/2);
    
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = -2000; i < 2000; i+=200) {
        ctx.moveTo(cx, h/2);
        ctx.lineTo(cx + i * 2, h);
    }
    
    for (let i = 0; i < 10; i++) {
        let p = (state.gridOffset + i * 100) / 1000; 
        let y = h/2 + (p * h/2);
        if (y > h) y = h;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
    }
    ctx.stroke();

    if (!state.isRunning) {
        let scale = state.currentQ.type === 'comparison' ? 1.5 : ((state.qIndex + 1) * 0.2 + 0.5);
        drawMonster(cx, h/2 + 50, scale);
    }

    state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.s, p.s);
    });
}

function drawMonster(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    // Boss is Red, others vary
    ctx.fillStyle = state.level === 5 ? '#d32f2f' : '#800080'; 
    
    ctx.fillRect(-40, -80, 80, 80);
    ctx.fillStyle = '#ff0';
    ctx.fillRect(-20, -60, 20, 20);
    ctx.fillRect(20, -60, 20, 20);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-30, -20, 10, 10);
    ctx.fillRect(0, -20, 10, 10);
    ctx.fillRect(30, -20, 10, 10);
    
    // Boss Crown
    if(state.level === 5) {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-40, -100, 80, 20);
        ctx.fillRect(-30, -110, 10, 10);
        ctx.fillRect(0, -110, 10, 10);
        ctx.fillRect(20, -110, 10, 10);
    }

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
// 5. GAME LOGIC & UI
// ==========================================

function updateUI() {
    document.getElementById('level-display').innerText = state.level;
    document.getElementById('hp-display').innerText = "❤️".repeat(state.health);
    document.getElementById('progress-display').innerText = (state.qIndex + 1) + " / " + state.totalQPerLevel;
    document.getElementById('story-text').innerText = state.currentQ.context || "Boss Battle!";
    document.getElementById('math-text').innerText = state.currentQ.text;
    document.getElementById('answer-input').value = "";

    // Toggle Boss UI vs Normal UI
    if (state.currentQ.type === 'comparison') {
        document.getElementById('input-controls').classList.add('hidden');
        document.getElementById('boss-options').classList.remove('hidden');
    } else {
        document.getElementById('input-controls').classList.remove('hidden');
        document.getElementById('boss-options').classList.add('hidden');
    }
}

function handleSuccess() {
    spawnParticles();
    state.isRunning = true; 
    setTimeout(() => { state.isRunning = false; }, 1000);
    
    state.qIndex++;
    if (state.qIndex >= state.totalQPerLevel) {
        state.level++;
        if (state.level > 5) {
            alert("恭喜! 你已擊敗所有 Boss! (Game Cleared)");
            state.level = 1;
        }
        resetLevel(state.level);
    } else {
        state.currentQ = generateQuestion(state.level);
        saveGame();
        updateUI();
    }
}

function handleFail(correctMsg) {
    state.health--;
    document.body.classList.add('shake-effect');
    setTimeout(() => document.body.classList.remove('shake-effect'), 500);
    
    alert("❌ Wrong! \n" + correctMsg);

    if (state.health <= 0) {
        alert("GAME OVER! Try Level " + state.level + " again.");
        resetLevel(state.level);
    } else {
        updateUI();
        saveGame();
    }
}

// Normal Text Answer
function checkAnswer() {
    let input = document.getElementById('answer-input').value;
    if (!input) return;

    // Try to evaluate input first just in case they didn't hit "="
    try {
         let raw = input.replace(/\^/g, '**').replace(/×/g, '*').replace(/÷/g, '/');
         let val = Function('"use strict";return (' + raw + ')')();
         state.lastAns = val; // Store raw value

         let correct = Math.abs(val - state.currentQ.ans) < 0.5;
         if (correct) {
             handleSuccess();
         } else {
             handleFail("Correct Answer: " + round2(state.currentQ.ans));
         }
    } catch (e) {
        alert("Invalid Number format!");
    }
}

// Boss Button Answer
function checkBossAnswer(choice) {
    if (choice === state.currentQ.ans) {
        handleSuccess();
    } else {
        let msg = `Plan A: $${round2(state.currentQ.options.A)}\nPlan B: $${round2(state.currentQ.options.B)}`;
        handleFail(msg);
    }
}

// Calculator
function handleCalc(val) {
    let input = document.getElementById('answer-input');
    
    if (val === 'AC') {
        input.value = '';
    } else if (val === 'DEL') {
        input.value = input.value.slice(0, -1);
    } else if (val === 'ANS') {
        input.value += state.lastAns;
    } else if (val === 'ROOT') {
        input.value += '^(1/';
    } else if (val === '=') {
        try {
            let raw = input.value.replace(/\^/g, '**').replace(/×/g, '*').replace(/÷/g, '/');
            let result = Function('"use strict";return (' + raw + ')')();
            state.lastAns = result;
            input.value = round2(result);
        } catch (e) {
            input.value = "Error";
        }
    } else {
        input.value += val;
    }
}

window.onload = init;
