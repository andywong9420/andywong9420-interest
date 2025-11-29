/**
 * MAIN.JS - Interest Warrior
 * Fixed Resolution Version: 800x600 internal logic
 */

// --- Constants ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const TOTAL_LEVELS = 5;

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
let combo = 0;
let currentQuestion = null;
let calcExpression = ""; 
let lastCalcAnswer = 0;
let questionsNeeded = 5;

// Animation Vars
let frameCount = 0;
let monsterScale = 0.3; // Base scale
let gridSpeed = 0.5;
let animationTimer = 0;
let particles = []; 

// --- Initialization ---
function initGame() {
    // Force Fixed Resolution
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    checkSaveGame();
    requestAnimationFrame(gameLoop);
}
window.onload = initGame;

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
}

function goBackToMenu() {
    currentState = 'MENU';
    gameContainer.classList.add('hidden');
    menu.classList.remove('hidden');
    saveGame();
}

// --- Enhanced Math Generator ---
function generateQuestion(lvl) {
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const fmt = (num) => num.toLocaleString();

    let P, R, T, n, text, answer;
    let askType = Math.random() < 0.5 ? 'I' : 'A'; // Interest or Amount
    
    const contexts = [
        "🧧 利是錢 Red Packet", "🎮 PS5 Pro Fund", "👟 Summer Job", "📱 New iPhone", "🏦 Education Fund"
    ];
    let story = contexts[randInt(0, contexts.length - 1)];

    P = randInt(5, 50) * 1000; 
    R = randInt(3, 12);
    T = randInt(2, 5);

    switch(lvl) {
        case 1: 
            let simpleI = P * (R / 100) * T;
            let simpleA = P + simpleI;
            text = `[Level 1: 單利息 Simple]<br>Story: ${story}<br>P=$${fmt(P)}, R=${R}%, T=${T}yr<br>${askType==='I'?'Find Interest (I)?':'Find Amount (A)?'}`;
            answer = askType === 'I' ? simpleI : simpleA;
            break;

        case 2:
            let cA_Yr = P * Math.pow((1 + R / 100), T);
            let cI_Yr = cA_Yr - P;
            text = `[Level 2: 複利息 Compound]<br>Story: ${story}<br>Yearly (每年一結)<br>P=$${fmt(P)}, R=${R}%, T=${T}yr<br>${askType==='I'?'Find Interest (I)?':'Find Amount (A)?'}`;
            answer = askType === 'I' ? cI_Yr : cA_Yr;
            break;

        case 3: 
            let periods = [2, 4, 12]; 
            let names = ['Half-yr', 'Quarterly', 'Monthly'];
            let idx = randInt(0, 2); n = periods[idx];
            let cA_Pd = P * Math.pow((1 + (R / 100) / n), (n * T));
            let cI_Pd = cA_Pd - P;
            text = `[Level 3: ${names[idx]}]<br>Story: ${story}<br>P=$${fmt(P)}, R=${R}%, T=${T}yr<br>${askType==='I'?'Find Interest (I)?':'Find Amount (A)?'}`;
            answer = askType === 'I' ? cI_Pd : cA_Pd;
            break;
            
        case 4: // Reverse
            let revA = Math.round(P * Math.pow((1 + R / 100), T)); 
            text = `[Level 4: Reverse]<br>Target=$${fmt(revA)}<br>R=${R}%, T=${T}yr (Yearly)<br>Find Principal P (integer)?`;
            answer = Math.round(revA / Math.pow((1 + R/100), T)); 
            break;

        case 5: // Comparison
            let s_Amt = P * (1 + (R/100)*T);
            let c_Amt = P * Math.pow((1 + R/100), T);
            text = `[BOSS: Compare]<br>P=$${fmt(P)}, R=${R}%, T=${T}yr<br>Find: (Compound Amount) - (Simple Amount)?`;
            answer = c_Amt - s_Amt;
            break;
    }
    return { text, answer, level: lvl };
}

function nextLevel(lvl) {
    if (lvl > TOTAL_LEVELS) {
        alert("🎉 You Win! Game Over!");
        currentState = 'WIN';
        localStorage.removeItem('mathWarriorSave');
        return;
    }
    level = lvl;
    questionCount = 0;
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
    if (combo >= 3) document.getElementById('question-container').classList.add('fever-mode');
    else document.getElementById('question-container').classList.remove('fever-mode');
}

// --- Interactions ---
document.getElementById('submit-btn').addEventListener('click', checkAnswer);
document.getElementById('calc-toggle-btn').addEventListener('click', () => {
    document.getElementById('calculator').classList.toggle('hidden');
});

function checkAnswer() {
    if (currentState !== 'PLAYING') return;
    let userVal = parseFloat(inputField.value);
    if (isNaN(userVal)) { alert("Enter a number!"); return; }
    
    let correctVal = currentQuestion.answer;
    let isCorrect = Math.abs(userVal - correctVal) < (Math.abs(correctVal) * 0.01) || Math.round(userVal) === Math.round(correctVal);

    if (isCorrect) {
        combo++;
        showCombo();
        createParticles(GAME_WIDTH/2, GAME_HEIGHT/2);
        currentState = 'RUNNING';
        animationTimer = 60;
        questionCount++;
    } else {
        combo = 0;
        health--;
        updateHUD();
        triggerDamageEffect();
        if (health <= 0) {
            alert("💀 Game Over!");
            health = 5; combo = 0; questionCount = 0;
            newTurn();
        } else {
             alert(`❌ Wrong! Ans: ${correctVal.toFixed(2)}`);
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

// --- Canvas Logic ---
function gameLoop() {
    frameCount++;
    // Clear fixed resolution buffer
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Background
    let skyColor = (
