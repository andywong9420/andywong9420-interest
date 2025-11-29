// === 遊戲狀態管理 ===
const state = {
    mode: 'menu', // 'menu', 'portrait', 'landscape'
    level: 1,
    health: 5,
    score: 0,
    combo: 0,
    questionsInLevel: 0,
    maxQuestions: 30,
    question: null,
    lastCalcAns: 0,
    isFever: false
};

// === Canvas 設定 ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let animationId;

// === 防止 iOS Safari 雙擊縮放 ===
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

// === 數學題目生成器 (核心邏輯) ===
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const round2 = (num) => Math.round(num * 100) / 100;

const HK_CONTEXTS = [
    "你儲起咗新年嘅利是錢。",
    "你想兩年後買部 PS5 Pro。",
    "你在麥當勞兼職儲了一筆錢。",
    "你打算去日本旅行儲旅費。",
    "爸爸給你一筆錢作大學基金。"
];

function generateQuestion(level) {
    let P, r, t, n, A, I, ans, qText;
    
    // 注意：這裡改用 let 宣告並給初始空值
    let formulaStr = ""; 
    
    const context = randItem(HK_CONTEXTS);
    
    // 難度參數
    P = randInt(10, 100) * 100; // 1000 - 10000
    r = randInt(2, 15); // 2% - 15%
    t = randInt(1, 5); // 年份

    // Level 1: 單利息 (找 I 或 A)
    if (level === 1) {
        I = (P * r * t) / 100;
        A = P + I;
        if (Math.random() > 0.5) {
            qText = `${context}<br>本金 $${P}，年利率 ${r}%，單利息存款 ${t} 年。<br>求利息 (Interest)。`;
            formulaStr = `I = P × R% × T <br>= ${P} × ${r}% × ${t}`;
            ans = I;
        } else {
            qText = `${context}<br>本金 $${P}，年利率 ${r}%，單利息存款 ${t} 年。<br>求本利和 (Amount)。`;
            formulaStr = `A = P + I = P + (P × R% × T) <br>= ${P} + (${P} × ${r}% × ${t})`;
            ans = A;
        }
    }
    // Level 2: 複利息 (每年)
    else if (level === 2) {
        A = P * Math.pow((1 + r/100), t);
        I = A - P;
        if (Math.random() > 0.5) {
            qText = `${context}<br>本金 $${P}，年利率 ${r}%，複利息(每年一結)存款 ${t} 年。<br>求本利和。`;
            formulaStr = `A = P(1 + r%)^n <br>= ${P}(1 + ${r}%)^${t}`;
            ans = A;
        } else {
            qText = `${context}<br>本金 $${P}，年利率 ${r}%，複利息(每年一結)存款
