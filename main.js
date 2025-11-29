/**
 * MAIN.JS - Interest Warrior
 * Features: Real-Life Stories, Particles, Combos, Fake 3D, LocalStorage
 */

// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const menu = document.getElementById('menu');
const questionText = document.getElementById('question-text');
const hpDisplay = document.getElementById('hp-display');
const levelDisplay = document.getElementById('level-display');
const inputField = document.getElementById('answer-input');
const calcScreen = document.getElementById('calc-screen');
const damageOverlay = document.getElementById('damage-overlay');
const comboOverlay = document.getElementById('combo-overlay');
const comboCountSpan = document.getElementById('combo-count');
const btnContinue = document.getElementById('btn-continue');

// --- Game State ---
let currentState = 'MENU'; 
let layoutMode = 'portrait';
let level = 1;
let health = 5;
let questionCount = 0;
let combo = 0; // New Combo counter
let currentQuestion = null;
let calcExpression = ""; 
let lastCalcAnswer = 0;
let questionsNeeded = 5;

// Animation Vars
let frameCount = 0;
let monsterScale = 0.1;
let gridSpeed = 0.5;
let animationTimer = 0;
let particles = []; // Particle System Array

// --- Constants ---
const TOTAL_LEVELS = 5;

// --- Initialization ---
function resize() {
    const rect = document.getElementById('canvas-wrapper').getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
window.addEventListener('resize', resize);
window.onload = () => {
    resize();
    checkSaveGame();
    requestAnimationFrame(gameLoop);
};

// --- Save/Load ---
function checkSaveGame() {
    if (localStorage.getItem('mathWarriorSave')) {
        btnContinue.classList.remove('hidden');
        btnContinue.onclick = () => loadGame();
    }
}

function saveGame() {
    const saveState = { level, health, questionCount, combo, layoutMode };
    localStorage.setItem('mathWarriorSave', JSON.stringify(saveState));
}

function loadGame() {
    const saveState = JSON.parse(localStorage.getItem('mathWarriorSave'));
    if (saveState) {
        level = saveState.level;
        health = saveState.health;
        questionCount = saveState.questionCount;
        combo = saveState.combo || 0;
        startGame(saveState.layoutMode || 'portrait', true);
    }
}

// --- Menu & Layout ---
document.getElementById('btn-portrait').onclick = () => startGame('portrait', false);
document.getElementById('btn-landscape').onclick = () => startGame('landscape', false);
document.getElementById('backBtn').onclick = goBackToMenu;

function startGame(mode, isLoad) {
    layoutMode = mode;
    currentState = 'PLAYING';
    
    menu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    gameContainer.className = mode === 'portrait' ? 'portrait-mode' : 'landscape-mode';
    
    if (!isLoad) {
        level = 1;
        health = 5;
        questionCount = 0;
        combo = 0;
        nextLevel(1);
    } else {
        updateHUD();
        newTurn();
    }
    resize();
}

function goBackToMenu() {
    currentState = 'MENU';
    gameContainer.classList.add('hidden');
    menu.classList.remove('hidden');
    saveGame();
}

// --- Enhanced Math Generator (Real-Life Context) ---
function generateQuestion(lvl) {
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const fmt = (num) => num.toLocaleString();

    let P, R, T, n, text, answer;
    let askType = Math.random() < 0.5 ? 'I' : 'A'; // Random: Interest or Amount?
    
    // Story Contexts
    const contexts = [
        "🧧 你將新年收到的利是錢存入銀行...<br>You deposit your Red Packet money...",
        "🎮 你想儲錢買 PS5 Pro...<br>Saving for a game console...",
        "👟 你做暑期工賺了一筆錢...<br>Earnings from summer job...",
        "📱 你想兩年後買一部新 iPhone...<br>Planning for a new phone...",
        "🏦 家人幫你開了一個教育基金...<br>Family education fund..."
    ];
    let story = contexts[randInt(0, contexts.length - 1)];

    // Variables
    P = randInt(5, 50) * 1000; 
    R = randInt(3, 12);
    T = randInt(2, 5);

    switch(lvl) {
        case 1: // Simple Interest
            let simpleI = P * (R / 100) * T;
            let simpleA = P + simpleI;
            let qStr = askType === 'I' ? "求利息 Interest (I)?" : "求本利和 Amount (A)?";
            answer = askType === 'I' ? simpleI : simpleA;
            
            text = `[Level 1: 單利息 Simple]<br>${story}<br>
                    P (本金) = $${fmt(P)}<br>
                    R (年利率) = ${R}%<br>
                    T (年期) = ${T} 年<br>
                    ${qStr}`;
            break;

        case 2: // Compound Annual
            let cA_Yr = P * Math.pow((1 + R / 100), T);
            let cI_Yr = cA_Yr - P;
            let qStr2 = askType === 'I' ? "求複利息 Compound Interest (I)?" : "求本利和 Amount (A)?";
            answer = askType === 'I' ? cI_Yr : cA_Yr;

            text = `[Level 2: 複利息 Compound]<br>${story}<br>
                    <b>每年一結 (Yearly)</b><br>
                    P = $${fmt(P)}, R = ${R}%, T = ${T} 年<br>
                    ${qStr2}`;
            break;

        case 3: // Compound Periods
            let periods = [2, 4, 12]; 
            let typeNames = ['每半年一結 (Half-yearly)', '每季一結 (Quarterly)', '每月一結 (Monthly)'];
            let idx = randInt(0, 2);
            n = periods[idx];
            
            let cA_Pd = P * Math.pow((1 + (R / 100) / n), (n * T));
            let cI_Pd = cA_Pd - P;
            let qStr3 = askType === 'I' ? "求複利息 Compound Interest (I)?" : "求本利和 Amount (A)?";
            answer = askType === 'I' ? cI_Pd : cA_Pd;

            text = `[Level 3: 複利息 Periods]<br>${story}<br>
                    <b>${typeNames[idx]}</b><br>
                    P = $${fmt(P)}, R = ${R}%, T = ${T} 年<br>
                    ${qStr3}`;
            break;
            
        case 4: // Find Principle (Reverse)
            // Logic: Give A, find P
            let revA = P * Math.pow((1 + R / 100), T);
            revA = Math.round(revA); // Round to make it "real" question
            text = `[Level 4: 逆向思考 Reverse]<br>
                    目標金額 Target Amount = $${fmt(revA)}<br>
                    R = ${R}%, T = ${T} 年 (每年一結)<br>
                    求需存入本金 P (整數)?`;
            answer = Math.round(revA / Math.pow((1 + R/100), T)); 
            // Note: Student might get +/- 1 due to rounding, handled in check
            break;

        case 5: // Boss Challenge (Comparison) - Simplified for text input
            // Compare Simple vs Compound
            let s_Amt = P * (1 + (R/100)*T);
            let c_Amt = P * Math.pow((1 + R/100), T);
            let diff = c_Amt - s_Amt;
            text = `[BOSS LEVEL]<br>
                    P=$${fmt(P)}, R=${R}%, T=${T}年<br>
                    計算: (複利息Amount) - (單利息Amount)<br>
                    Difference between Compound & Simple Amount?`;
            answer = diff;
            break;
    }
    return { text, answer, level: lvl };
}

function nextLevel(lvl) {
    if (lvl > TOTAL_LEVELS) {
        alert("🎉 Congratulations! You are the Interest Master! 🎉");
        currentState = 'WIN';
        localStorage.removeItem('mathWarriorSave');
        return;
    }
    level = lvl;
    questionCount = 0;
    monsterScale = 0.3;
    newTurn();
}

function newTurn() {
    currentQuestion = generateQuestion(level);
    questionText.innerHTML = `Level ${level} (Q${questionCount+1}/${questionsNeeded})<br>${currentQuestion.text}`;
    inputField.value = '';
    currentState = 'PLAYING';
    monsterScale = 0.3;
    updateHUD();
    saveGame();
}

function updateHUD() {
    levelDisplay.innerText = level;
    let hearts = "";
    for(let i=0; i<health; i++) hearts += "❤️";
    hpDisplay.innerText = hearts;
    
    // Fever Mode UI
    if (combo >= 3) {
        document.getElementById('question-container').classList.add('fever-mode');
    } else {
        document.getElementById('question-container').classList.remove('fever-mode');
    }
}

// --- Interactions ---
document.getElementById('submit-btn').addEventListener('click', checkAnswer);
document.getElementById('calc-toggle-btn').addEventListener('click', () => {
    document.getElementById('calculator').classList.toggle('hidden');
    resize();
});

function checkAnswer() {
    if (currentState !== 'PLAYING') return;

    let userVal = parseFloat(inputField.value);
    if (isNaN(userVal)) {
        alert("請輸入數字 / Please enter a number");
        return;
    }

    let correctVal = currentQuestion.answer;
    // Tolerance logic: 1% error margin OR exact integer match
    let isCorrect = Math.abs(userVal - correctVal) < (correctVal * 0.01) || Math.round(userVal) === Math.round(correctVal);

    if (isCorrect) {
        // Correct
        combo++;
        showCombo();
        createParticles(canvas.width / 2, canvas.height / 2); // JUICE!
        
        currentState = 'RUNNING';
        animationTimer = 60;
        questionCount++;
    } else {
        // Wrong
        combo = 0; // Reset combo
        health--;
        updateHUD();
        triggerDamageEffect();
        
        if (health <= 0) {
            alert("💀 Game Over! 重新挑戰本關 Restart Level!");
            health = 5;
            combo = 0;
            questionCount = 0;
            newTurn(); // Restart level logic
        } else {
             alert(`❌ 錯了 Wrong!\n正確答案 Ans: ${correctVal.toFixed(2)}`);
        }
    }
}

function showCombo() {
    if (combo > 1) {
        comboCountSpan.innerText = combo;
        comboOverlay.classList.add('combo-active');
        setTimeout(() => comboOverlay.classList.remove('combo-active'), 800);
    }
}

function triggerDamageEffect() {
    gameContainer.classList.add('shake-effect');
    damageOverlay.classList.add('damage-flash');
    setTimeout(() => {
        gameContainer.classList.remove('shake-effect');
        damageOverlay.classList.remove('damage-flash');
    }, 500);
}

// --- Particle System ---
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 15;
        this.vy = (Math.random() - 0.5) * 15;
        this.life = 1.0; this.color = color;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.5; this.life -= 0.03;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 10, 10); // Big pixels
        ctx.globalAlpha = 1.0;
    }
}
function createParticles(x, y) {
    for(let i=0; i<30; i++) {
        const c = ['#f1c40f', '#e74c3c', '#fff'][Math.floor(Math.random()*3)]; 
        particles.push(new Particle(x, y, c));
    }
}

// --- Canvas Loop ---
function gameLoop() {
    frameCount++;
    
    // Day/Night Cycle based on Level
    let skyColor = '#87CEEB'; // Lvl 1 Day
    if (level === 2 || level === 3) skyColor = '#e67e22'; // Afternoon
    if (level >= 4) skyColor = '#2c3e50'; // Night
    
    ctx.fillStyle = skyColor; 
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
    
    // Grass (darker at night)
    ctx.fillStyle = level >= 4 ? '#145a32' : '#27ae60';
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

    // Speed Logic
    let currentSpeed = currentState === 'RUNNING' ? 8.0 : gridSpeed;
    if (currentState === 'RUNNING') {
        monsterScale += 0.015; // Zoom faster
        animationTimer--;
        if (animationTimer <= 0) {
             if (questionCount >= questionsNeeded) nextLevel(level + 1);
             else newTurn();
        }
    }

    // Grid Lines
    ctx.strokeStyle = level >= 4 ? '#0b5345' : '#1e8449';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = -8; i <= 8; i++) {
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + (i * cx * 2.5), canvas.height);
    }
    // Moving Horizon Lines
    let moveOffset = (frameCount * currentSpeed) % 40;
    for (let i = 0; i < 12; i++) {
        let dist = (i * 30 + moveOffset);
        let yPos = cy + Math.pow(dist, 1.4) * 0.05; // Perspective curve
        if (yPos > canvas.height) continue;
        ctx.moveTo(0, yPos);
        ctx.lineTo(canvas.width, yPos);
    }
    ctx.stroke();

    // Draw Monster
    let shakeX = currentState === 'RUNNING' ? (Math.random()-0.5)*15 : 0;
    drawMonster(cx + shakeX, cy + 60, monsterScale);

    // Draw Sword
    let swordY = canvas.height - 50;
    if (currentState === 'RUNNING') swordY += Math.sin(frameCount*0.8)*30; // Run bobbing
    drawSword(cx + 150, swordY);

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    requestAnimationFrame(gameLoop);
}

function drawMonster(x, y, scale) {
    if (scale > 5) scale = 5; // Cap size
    ctx.save();
    ctx.translate(x, y);
    let s = scale * (canvas.height/350);
    ctx.scale(s, s);
    
    // Monster (Slime)
    ctx.fillStyle = level >= 4 ? '#8e44ad' : '#9b59b6'; // Darker purple at night
    ctx.beginPath();
    ctx.arc(0, 0, 50, Math.PI, 0);
    ctx.bezierCurveTo(50, 50, -50, 50, -50, 0);
    ctx.fill();
    
    // Face
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(-20, -10, 12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, -10, 12, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'red';
    ctx.beginPath(); ctx.arc(-20, -10, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, -10, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}

function drawSword(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.4);
    // Retro Sword (Pixel style rects)
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(-10, -140, 20, 140); // Blade
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-20, 0, 40, 10); // Guard
    ctx.fillStyle = '#8e44ad';
    ctx.fillRect(-8, 10, 16, 40); // Grip
    ctx.restore();
}

// --- Calculator ---
const calcBtns = document.querySelectorAll('.calc-btn');
calcBtns.forEach(btn => btn.addEventListener('click', (e) => handleCalcInput(e.target.dataset.val)));

function handleCalcInput(val) {
    if (val === 'AC') calcExpression = "";
    else if (val === 'DEL') {
        if (calcExpression.endsWith(' √ ')) calcExpression = calcExpression.slice(0, -3);
        else calcExpression = calcExpression.slice(0, -1);
    }
    else if (val === 'INSERT') {
        let res = evaluateExpression(calcExpression);
        if (res !== "Error") {
            inputField.value = res;
            lastCalcAnswer = parseFloat(res);
        }
    }
    else if (val === 'ANS') calcExpression += lastCalcAnswer;
    else if (val === 'ROOT') calcExpression += " √ ";
    else calcExpression += val;
    
    calcScreen.innerText = calcExpression || "0";
}

function evaluateExpression(expr) {
    try {
        // Handle Root logic: "27 √ 3"
        if (expr.includes(" √ ")) {
            let parts = expr.split(" √ ");
            if (parts.length === 2) {
                let b = eval(parts[0]);
                let r = eval(parts[1]);
                return Math.pow(b, 1/r).toFixed(4);
            }
        }
        let clean = expr.replace(/\^/g, '**').replace(/x/g, '*');
        let res = eval(clean);
        if (res % 1 !== 0) return res.toFixed(2);
        return res;
    } catch (e) { return "Error"; }
}
