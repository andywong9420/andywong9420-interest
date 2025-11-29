/**
 * MAIN.JS
 * Handles Game Loop, Canvas Rendering, Math Logic, and Calculator
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

// --- Game State ---
let currentState = 'MENU'; // MENU, PLAYING, GAMEOVER, WIN
let layoutMode = 'portrait'; // portrait, landscape
let level = 1;
let health = 5;
let questionCount = 0; // Questions answered correctly in current level
let currentQuestion = null; // Object { text, answer }
let calcExpression = ""; // String for calculator
let lastCalcAnswer = 0;
let questionsNeeded = 5;

// Animation State
let frameCount = 0;
let monsterScale = 0.1; // 0.1 (far) to 1.0 (near)
let playerState = 'IDLE'; // IDLE, ATTACK, WALK
let animationTimer = 0;

// --- Constants ---
const TOTAL_LEVELS = 5;

// --- Initialization & Resize ---
function resize() {
    // Canvas resolution matches display size for sharpness
    const rect = document.getElementById('canvas-wrapper').getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

window.addEventListener('resize', resize);
window.onload = () => {
    resize();
    requestAnimationFrame(gameLoop);
};

// --- Input Handling (Touch/Mouse) ---
// We use native click events for buttons, but Canvas interaction is minimal 
// except for visual feedback. Prevent default gestures on canvas.
canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// --- Layout & Menu Logic ---
document.getElementById('btn-portrait').onclick = () => startGame('portrait');
document.getElementById('btn-landscape').onclick = () => startGame('landscape');
document.getElementById('backBtn').onclick = goBackToMenu;

function startGame(mode) {
    layoutMode = mode;
    currentState = 'PLAYING';
    
    // Toggle Classes
    menu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    gameContainer.className = mode === 'portrait' ? 'portrait-mode' : 'landscape-mode';
    
    // Reset Game Data
    level = 1;
    health = 5;
    questionCount = 0;
    lastCalcAnswer = 0;
    
    resize(); // Force resize to fit new container
    nextLevel(1);
}

function goBackToMenu() {
    currentState = 'MENU';
    gameContainer.classList.add('hidden');
    menu.classList.remove('hidden');
}

// --- Math Question Generator ---
function generateQuestion(lvl) {
    let P, R, T, A, n, text, answer;
    
    // Random helpers
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    // Round to 2 decimals
    const round2 = (num) => Math.round(num * 100) / 100;

    // Common variables
    P = randInt(1, 100) * 1000; // 1000 to 100000
    R = randInt(2, 15); // 2% to 15%
    T = randInt(2, 10); // 2 to 10 years

    switch(lvl) {
        case 1: // Level 1: Simple Interest (Calculate Interest or Amount)
            // Formula: I = P * R% * T
            let I = P * (R/100) * T;
            A = P + I;
            text = `[單利息 Simple Interest]<br>P(本金) = $${P}<br>R(年利率) = ${R}%<br>T(年期) = ${T} 年<br>求本利和 (Amount)?`;
            answer = A;
            break;

        case 2: // Level 2: Compound Interest (Annual)
            // Formula: A = P * (1 + R%)^T
            A = P * Math.pow((1 + R/100), T);
            text = `[複利息 Compound Interest]<br>每年一結 (Yearly)<br>P = $${P}, R = ${R}%, T = ${T} 年<br>求本利和 (Amount)?`;
            answer = A;
            break;

        case 3: // Level 3: CI with different periods
            // n can be 2, 4, 12, 365
            let periods = [2, 4, 12]; 
            let type = ['每半年 (Half-yearly)', '每季 (Quarterly)', '每月 (Monthly)'];
            let idx = randInt(0, 2);
            n = periods[idx];
            
            // A = P * (1 + r/n)^(n*t)
            A = P * Math.pow((1 + (R/100)/n), (n*T));
            text = `[複利息 Compound]<br>${type[idx]}一結<br>P = $${P}, R = ${R}%, T = ${T} 年<br>求本利和 (Amount)?`;
            answer = A;
            break;

        case 4: // Level 4: Find P, R, or T (SI or CI)
            // Simple Interest Reverse
            let missing = randInt(0, 2); // 0=P, 1=R, 2=T
            let simpleI = P * (R/100) * T;
            let simpleA = P + simpleI;
            
            if (missing === 0) { // Find P
                text = `[單利息 Simple]<br>R = ${R}%, T = ${T} 年, I(利息) = $${simpleI}<br>求本金 P?`;
                answer = P;
            } else if (missing === 1) { // Find R
                text = `[單利息 Simple]<br>P = $${P}, T = ${T} 年, I = $${simpleI}<br>求年利率 R (%)?`;
                answer = R;
            } else { // Find T
                text = `[單利息 Simple]<br>P = $${P}, R = ${R}%, I = $${simpleI}<br>求年期 T?`;
                answer = T;
            }
            break;

        case 5: // Level 5: Reverse Compound (Usually Find P)
            // Finding R or T in CI without log is hard/messy, usually S3 focuses on finding P for CI
            // Prompt asks for P, R, T. We will stick to Finding P for complexity management or simple R.
            // Let's do Find P with monthly/quarterly compounding.
            let pPeriods = [2, 4];
            let pType = ['每半年', '每季'];
            let pIdx = randInt(0, 1);
            n = pPeriods[pIdx];
            
            let totalAmount = P * Math.pow((1 + (R/100)/n), (n*T));
            totalAmount = round2(totalAmount); // Give them the rounded amount
            
            text = `[複利息 Compound Reverse]<br>${pType[pIdx]}一結<br>R = ${R}%, T = ${T} 年, Amount = $${totalAmount}<br>求本金 P (準確至整數)?`;
            answer = Math.floor(totalAmount / Math.pow((1 + (R/100)/n), (n*T))); 
            // Note: slightly tricky due to rounding, we accept integer range in check
            break;
    }
    
    return { text, answer, level: lvl };
}

function nextLevel(lvl) {
    if (lvl > TOTAL_LEVELS) {
        questionText.innerHTML = "恭喜！你已擊敗所有怪獸！<br>Game Completed!";
        currentState = 'WIN';
        return;
    }
    level = lvl;
    health = 5;
    questionCount = 0;
    monsterScale = 0.3;
    updateHUD();
    newTurn();
}

function newTurn() {
    currentQuestion = generateQuestion(level);
    questionText.innerHTML = `Level ${level} (Q${questionCount+1}/${questionsNeeded})<br>${currentQuestion.text}`;
    inputField.value = '';
    monsterScale = 0.3; // Reset monster distance
    playerState = 'IDLE';
}

function updateHUD() {
    levelDisplay.innerText = level;
    let hearts = "";
    for(let i=0; i<health; i++) hearts += "❤️";
    hpDisplay.innerText = hearts;
}

// --- Game Logic & Interaction ---

document.getElementById('submit-btn').addEventListener('click', checkAnswer);
document.getElementById('calc-toggle-btn').addEventListener('click', () => {
    document.getElementById('calculator').classList.toggle('hidden');
});

function checkAnswer() {
    if (currentState !== 'PLAYING') return;
    
    let userVal = parseFloat(inputField.value);
    let correctVal = currentQuestion.answer;
    
    // Tolerance for floating point and currency
    let isCorrect = false;
    if (Math.abs(userVal - correctVal) < 0.1) isCorrect = true;
    // For integer answers
    if (Math.round(userVal) === Math.round(correctVal)) isCorrect = true;

    if (isCorrect) {
        // Correct Animation
        playerState = 'ATTACK';
        animationTimer = 30; // 0.5 sec at 60fps
        questionCount++;
        setTimeout(() => {
            if (questionCount >= questionsNeeded) {
                alert("Level Complete! Next Level.");
                nextLevel(level + 1);
            } else {
                newTurn();
            }
        }, 1000);
    } else {
        // Wrong
        health--;
        updateHUD();
        alert(`錯了！正確答案是: ${correctVal.toFixed(2)}\nWrong! Monster attacks you!`);
        if (health <= 0) {
            alert("Game Over! Try Level " + level + " again.");
            nextLevel(level); // Restart level
        }
    }
}

// --- Canvas Rendering (The "Fake 3D") ---
function gameLoop() {
    if (currentState !== 'PLAYING' && currentState !== 'WIN') {
        requestAnimationFrame(gameLoop);
        return;
    }

    frameCount++;
    
    // Clear background
    ctx.fillStyle = '#87CEEB'; // Sky
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
    ctx.fillStyle = '#27ae60'; // Grass
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

    // Draw Fake 3D Grid Lines
    ctx.strokeStyle = '#1e8449';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // Radiating lines
    for (let i = -5; i <= 5; i++) {
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + (i * cx * 1.5), canvas.height);
    }
    // Horizontal lines (moving effect)
    let offset = (frameCount % 60) / 60 * (canvas.height/2);
    for (let y = cy; y < canvas.height; y += (y-cy)*0.2 + 10) {
       // Simple perspective approximation
       ctx.moveTo(0, y);
       ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Draw Monster
    if (playerState !== 'ATTACK' || frameCount % 10 < 5) { // Flash if attacked
        drawMonster(cx, cy + 50, monsterScale);
    }
    
    // Idle Animation (Breathing)
    if (playerState === 'IDLE') {
        monsterScale = 0.3 + Math.sin(frameCount * 0.05) * 0.02;
    } else if (playerState === 'ATTACK') {
        monsterScale -= 0.01; // Shrink/Die
        animationTimer--;
    }

    // Draw Player Weapon (Sword)
    drawSword();

    requestAnimationFrame(gameLoop);
}

function drawMonster(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * (canvas.height/300), scale * (canvas.height/300)); // Responsive scaling
    
    // Monster Body (Slime shape)
    ctx.fillStyle = 'purple';
    ctx.beginPath();
    ctx.arc(0, 0, 50, Math.PI, 0); // Top half
    ctx.bezierCurveTo(50, 50, -50, 50, -50, 0); // Bottom squish
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(-20, -10, 12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, -10, 12, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = 'red';
    ctx.beginPath(); ctx.arc(-20, -10, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, -10, 4, 0, Math.PI*2); ctx.fill();

    ctx.restore();
}

function drawSword() {
    ctx.save();
    // Position sword based on Attack animation
    let swing = 0;
    if (playerState === 'ATTACK') {
        swing = (30 - animationTimer) * 0.1; // Swing arc
    }
    
    const swX = canvas.width * 0.8;
    const swY = canvas.height;

    ctx.translate(swX, swY);
    ctx.rotate(-0.5 - swing); // Resting position

    // Blade
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(-10, -200, 20, 200);
    ctx.beginPath(); ctx.moveTo(-10, -200); ctx.lineTo(0, -230); ctx.lineTo(10, -200); ctx.fill();
    
    // Handle
    ctx.fillStyle = '#8e44ad';
    ctx.fillRect(-15, 0, 30, 10); // Guard
    ctx.fillStyle = '#34495e';
    ctx.fillRect(-5, 10, 10, 40); // Grip

    ctx.restore();
}

// --- Calculator Logic ---
const calcBtns = document.querySelectorAll('.calc-btn');
calcBtns.forEach(btn => {
    btn.addEventListener('click', (e) => handleCalcInput(e.target.dataset.val));
});

function handleCalcInput(val) {
    if (val === 'AC') {
        calcExpression = "";
    } else if (val === 'DEL') {
        calcExpression = calcExpression.slice(0, -1);
    } else if (val === 'ENTER') {
        // Evaluate result and put in input box
        try {
            // Replace math symbols for JS
            let evalStr = calcExpression
                .replace(/\^/g, '**')
                .replace(/x√/g, 'Math.pow'); 
            // Special handling for Nth root button logic is tricky in string stream
            // Simple implementation: allow user to type 27^(1/3)
            
            let result = eval(evalStr); // Note: eval used for simplicity in local static app
            lastCalcAnswer = result;
            inputField.value = parseFloat(result.toFixed(4)); // Fill game input
            calcExpression = String(result);
        } catch (e) {
            calcExpression = "Error";
        }
    } else if (val === 'ANS') {
        calcExpression += lastCalcAnswer;
    } else if (val === 'SQRT') {
        // Nth root helper: user types x, then hits this, then y -> x^(1/y)
        // Actually easier to just provide Power and let them do ^(1/3).
        // The user wanted Nth root. 
        // Let's make this button insert "^(1/"
        calcExpression += "^(1/";
    } else {
        calcExpression += val;
    }
    calcScreen.innerText = calcExpression || "0";
}
