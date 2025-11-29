// ====== BASIC STATE ======
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const menu = document.getElementById('menu');
const gameContainer = document.getElementById('game-container');
const levelDisplay = document.getElementById('level-display');
const hpDisplay = document.getElementById('hp-display');
const questionText = document.getElementById('question-text');
const inputField = document.getElementById('answer-input');
const damageOverlay = document.getElementById('damage-overlay');
const comboOverlay = document.getElementById('combo-overlay');
const comboCountSpan = document.getElementById('combo-count');
const btnContinue = document.getElementById('btn-continue');

let currentState = 'MENU';      // MENU, PLAYING, RUNNING, WIN
let layoutMode = 'portrait';
let level = 1;
let health = 5;
let questionCount = 0;
let questionsNeeded = 5;
let currentQuestion = null;
let combo = 0;

let frameCount = 0;
let monsterScale = 0.35;
let gridSpeed = 0.5;
let animationTimer = 0;
let particles = [];

let calcExpression = "";
let lastCalcAnswer = 0;

// ====== RESIZE: match canvas to wrapper ======
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
window.addEventListener('resize', resizeCanvas);

// ====== SAVE / LOAD ======
function checkSaveGame() {
    const s = localStorage.getItem('interestWarrior');
    if (s) btnContinue.classList.remove('hidden');
}
function saveGame() {
    const s = { level, health, questionCount, combo, layoutMode };
    localStorage.setItem('interestWarrior', JSON.stringify(s));
}
function loadGame() {
    const s = localStorage.getItem('interestWarrior');
    if (!s) return;
    const obj = JSON.parse(s);
    level = obj.level;
    health = obj.health;
    questionCount = obj.questionCount;
    combo = obj.combo || 0;
    startGame(obj.layoutMode || 'portrait', true);
}

// ====== MENU BUTTONS ======
document.getElementById('btn-portrait').addEventListener('click', () => startGame('portrait', false));
document.getElementById('btn-landscape').addEventListener('click', () => startGame('landscape', false));
document.getElementById('backBtn').addEventListener('click', backToMenu);
btnContinue.addEventListener('click', loadGame);

function startGame(mode, fromSave) {
    layoutMode = mode;
    menu.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    gameContainer.className = mode === 'portrait' ? 'portrait-mode' : 'landscape-mode';

    resizeCanvas();

    if (!fromSave) {
        level = 1;
        health = 5;
        questionCount = 0;
        combo = 0;
        nextLevel(1);
    } else {
        updateHUD();
        newTurn();
    }
    currentState = 'PLAYING';
}

function backToMenu() {
    gameContainer.classList.add('hidden');
    menu.classList.remove('hidden');
    currentState = 'MENU';
    saveGame();
}

// ====== QUESTION GENERATOR (Real-life) ======
function generateQuestion(lvl) {
    const rInt = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
    const fmt = n => n.toLocaleString();

    let P = rInt(5,50)*1000;
    let R = rInt(3,12);
    let T = rInt(2,5);
    let askType = Math.random()<0.5?'I':'A';
    const stories = [
        "🧧 利是錢 Red Packet",
        "🎮 PS5 Pro Fund",
        "👟 暑期工 Summer Job",
        "📱 New iPhone Plan",
        "🏦 教育基金 Education Fund"
    ];
    let story = stories[rInt(0,stories.length-1)];
    let text, ans;

    if (lvl===1) {
        let I = P*(R/100)*T;
        let A = P+I;
        text = `[Level 1 單利息]<br>${story}<br>P=$${fmt(P)}, R=${R}%, T=${T}年<br>${askType==='I'?'求利息 I?':'求本利和 A?'}`
        ans = askType==='I'?I:A;
    } else if (lvl===2) {
        let A = P*Math.pow(1+R/100,T);
        let I = A-P;
        text = `[Level 2 複利息 年結]<br>${story}<br>P=$${fmt(P)}, R=${R}%, T=${T}年<br>${askType==='I'?'求利息 I
