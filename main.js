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
    
    // 注意：這裡改用 let 宣告並給初始空值，避免 const 錯誤
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
            qText = `${context}<br>本金 $${P}，年利率 ${r}%，複利息(每年一結)存款 ${t} 年。<br>求利息。`;
            formulaStr = `I = A - P <br>= (${P}(1 + ${r}%)^${t}) - ${P}`;
            ans = I;
        }
    }
    // Level 3: 複利息 (不同期數)
    else if (level === 3) {
        const periods = [
            { n: 2, name: "每半年(Half-yearly)" },
            { n: 4, name: "每季(Quarterly)" },
            { n: 12, name: "每月(Monthly)" },
            { n: 365, name: "每日(Daily)" }
        ];
        const pObj = randItem(periods);
        n = pObj.n;
        A = P * Math.pow((1 + r/100/n), n*t);
        qText = `${context}<br>本金 $${P}，年利率 ${r}%，複利息 <b>${pObj.name}</b> 一結，存款 ${t} 年。<br>求本利和。`;
        formulaStr = `A = P(1 + r%/n)^(n×t) <br>= ${P}(1 + ${r}%/${n})^(${n}×${t})`;
        ans = A;
    }
    // Level 4: 逆向 (單利息/複利息 找 P, r, t)
    else if (level === 4) {
        const type = Math.random() > 0.6 ? 'simple' : 'compound_P'; 
        
        if (type === 'simple') {
            I = (P * r * t) / 100;
            const missing = randItem(['P', 'r', 't']);
            if (missing === 'P') {
                qText = `${context}<br>單利息存款，年利率 ${r}%，存期 ${t} 年，獲得利息 $${I}。<br>求本金 (Principal)。`;
                formulaStr = `P = (I × 100) / (R × T)`;
                ans = P;
            } else if (missing === 'r') {
                qText = `${context}<br>單利息存款，本金 $${P}，存期 ${t} 年，獲得利息 $${I}。<br>求年利率 (R%)。(只輸入數字)`;
                formulaStr = `R = (I × 100) / (P × T)`;
                ans = r;
            } else {
                qText = `${context}<br>單利息存款，本金 $${P}，年利率 ${r}%，獲得利息 $${I}。<br>求年期 (T)。`;
                formulaStr = `T = (I × 100) / (P × R)`;
                ans = t;
            }
        } else {
            // Find P in Compound
            A = P * Math.pow((1 + r/100), t);
            A = round2(A);
            qText = `${context}<br>複利息(每年一結)，年利率 ${r}%，存期 ${t} 年，本利和為 $${A}。<br>求本金 (Principal) (取整數)。`;
            formulaStr = `P = A / (1 + r%)^n`;
            ans = Math.round(A / Math.pow((1 + r/100), t));
        }
    }
    // Level 5: 逆向 (複利息 + 期數)
    else {
        const periods = [{n:4, name:'每季'}, {n:12, name:'每月'}];
        const pObj = randItem(periods);
        n = pObj.n;
        A = P * Math.pow((1 + r/100/n), n*t);
        A = round2(A);
        qText = `${context}<br>複利息 <b>${pObj.name}</b> 一結，年利率 ${r}%，存期 ${t} 年，本利和 $${A}。<br>求本金 (Principal) (取整數)。`;
        formulaStr = `P = A / (1 + r%/n)^(n×t)`;
        ans = Math.round(A / Math.pow((1 + r/100/n), n*t));
    }

    return {
        text: qText,
        answer: round2(ans),
        formula: formulaStr
    };
}

// === 粒子系統 (Game Juice) ===
let particles = [];
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 15;
        this.vy = (Math.random() - 0.5) * 15;
        this.life = 1.0;
        this.color = color;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.03;
        this.vy += 0.5; // 重力
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 8, 8);
        ctx.globalAlpha = 1.0;
    }
}

// === 繪圖邏輯 ===
// 天空顏色 [早晨, 下午, 晚上, 深夜, 虛空]
const SKY_COLORS = ['#87CEEB', '#FFA500', '#191970', '#4B0082', '#220000'];

let gridOffset = 0;
let monsterScale = 1.0; 

function drawGame() {
    // 1. 背景 (Day/Night Cycle)
    const skyColor = SKY_COLORS[Math.min(state.level - 1, 4)];
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 偽 3D 地板格線
    const horizon = canvas.height * 0.5;
    ctx.fillStyle = '#222'; 
    ctx.fillRect(0, horizon, canvas.width, canvas.height / 2);

    ctx.strokeStyle = state.isFever ? '#FFD700' : '#00FF00'; 
    ctx.lineWidth = 2;
    ctx.beginPath();

    const centerX = canvas.width / 2;
    for (let i = -10; i <= 10; i++) {
        ctx.moveTo(centerX, horizon);
        ctx.lineTo(centerX + i * (canvas.width / 2), canvas.height);
    }

    gridOffset = (gridOffset + (state.isFever ? 4 : 1)) % 50;
    for (let y = horizon; y < canvas.height; y += 50) {
        let drawY = y + gridOffset;
        if (drawY > canvas.height) drawY -= (canvas.height - horizon);
        ctx.moveTo(0, drawY);
        ctx.lineTo(canvas.width, drawY);
    }
    ctx.stroke();

    // 3. 怪物 (Emoji 繪製，更生動)
    monsterScale = 1 + Math.sin(Date.now() / 500) * 0.1;
    const mx = canvas.width / 2;
    const my = canvas.height / 2 + 30;
    const size = 150 * monsterScale;

    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const monsters = ['👾', '👹', '🤖', '🐲', '💀'];
    ctx.fillText(monsters[state.level - 1] || '👽', mx, my);

    // 4. 粒子效果
    particles.forEach((p, index) => {
        p.update();
        p.draw(ctx);
        if (p.life <= 0) particles.splice(index, 1);
    });
}

function gameLoop() {
    if (state.mode === 'menu') return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGame();
    animationId = requestAnimationFrame(gameLoop);
}

// === 遊戲流程控制 ===
function initGame(layoutMode) {
    state.mode = layoutMode;
    state.level = 1;
    state.health = 5;
    state.score = 0;
    state.combo = 0;
    state.questionsInLevel = 0;
    state.isFever = false;
    updateUI();

    document.getElementById('menu').classList.add('hidden');
    const container = document.getElementById('game-container');
    container.classList.remove('hidden');
    container.className = layoutMode === 'portrait' ? '' : 'landscape-mode';

    resize();
    nextLevel();
    gameLoop();
}

function nextLevel() {
    state.questionsInLevel = 0;
    updateUI();
    nextQuestion();
}

function nextQuestion() {
    state.question = generateQuestion(state.level);
    document.getElementById('story-text').innerHTML = state.question.text;
    document.getElementById('math-text').innerText = ""; 
    document.getElementById('answer-input').value = "";
}

function checkAnswer() {
    const inputVal = parseFloat(document.getElementById('answer-input').value);
    const correctVal = state.question.answer;
    
    if (Math.abs(inputVal - correctVal) < 0.15) {
        handleCorrect();
    } else {
        handleWrong(correctVal);
    }
}

function handleCorrect() {
    state.score += 100 + (state.combo * 20);
    state.combo++;
    state.questionsInLevel++;
    
    if (state.combo >= 3) {
        state.isFever = true;
        document.getElementById('game-container').classList.add('combo-active');
        document.getElementById('combo-msg').classList.remove('hidden');
    }

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for(let i=0; i<30; i++) {
        particles.push(new Particle(cx, cy, `hsl(${Math.random()*360}, 100%, 50%)`));
    }

    if (state.questionsInLevel >= state.maxQuestions) {
        state.level++;
        if (state.level > 5) {
            alert("恭喜！你已完成所有訓練！是時候考 DSE 了！");
            resetToMenu();
            return;
        }
        alert(`LEVEL ${state.level - 1} 完成！進入下一關！`);
        nextLevel();
    } else {
        nextQuestion();
    }
    updateUI();
}

function handleWrong(correctAnswer) {
    state.health--;
    state.combo = 0;
    state.isFever = false;
    document.getElementById('game-container').classList.remove('combo-active');
    document.getElementById('combo-msg').classList.add('hidden');

    const container = document.getElementById('game-container');
    container.classList.add('shake-effect');
    document.getElementById('feedback-overlay').classList.add('damage-flash');
    
    setTimeout(() => {
        container.classList.remove('shake-effect');
        document.getElementById('feedback-overlay').classList.remove('damage-flash');
    }, 500);

    // 顯示公式
    document.getElementById('math-text').innerHTML = 
        `❌ 錯誤！<br>正確答案: ${correctAnswer}<br>參考公式: <span style="color:#ffcc00">${state.question.formula}</span><br>生命值 -1`;

    if (state.health <= 0) {
        alert("💀 勇者倒下了... 請重新挑戰本關！");
        state.health = 5;
        state.score = Math.max(0, state.score - 500);
        state.questionsInLevel = 0; 
    }
    
    updateUI();
    setTimeout(nextQuestion, 4000); // 延長時間讓學生看公式
}

function updateUI() {
    let hearts = "";
    for(let i=0; i<5; i++) {
        hearts += i < state.health ? "❤️" : "🖤";
    }
    document.getElementById('health-display').innerText = hearts;
    document.getElementById('score-display').innerText = `分數: ${state.score}`;
    
    const times = ["早晨", "下午", "晚上", "深夜", "虛空"];
    document.getElementById('level-display').innerText = `Level ${state.level} (${times[state.level-1] || '?'})`;
}

function resetToMenu() {
    state.mode = 'menu';
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    cancelAnimationFrame(animationId);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if(state.mode !== 'menu') drawGame();
}

// === 計算機邏輯 (仿 Casio) ===
let calcStr = "0";
const screen = document.getElementById('calc-screen');

function updateCalcScreen() {
    screen.innerText = calcStr;
}

function calcInput(val) {
    if (calcStr === "0" && !['+', '-', '*', '/', '^', 'root', '%', ')'].includes(val)) {
        calcStr = val;
    } else {
        if (val === 'root') calcStr += '^(1/'; 
        else calcStr += val;
    }
    updateCalcScreen();
}

function calculateResult() {
    try {
        // 支援隱藏乘號 (Implicit Multiplication)
        let evalStr = calcStr
            .replace(/(\d)\(/g, '$1*(') // 5(2) -> 5*(2)
            .replace(/\)(\d)/g, ')*$1') // )5 -> )*5
            .replace(/x\^y/g, '**')
            .replace(/\^/g, '**')
            .replace(/×/g, '*')
            .replace(/÷/g, '/');
            
        let res = eval(evalStr); 
        
        state.lastCalcAns = res;
        calcStr = res.toString();
        updateCalcScreen();
    } catch (e) {
        calcStr = "Error";
        updateCalcScreen();
        setTimeout(() => { calcStr = "0"; updateCalcScreen(); }, 1000);
    }
}

// === 事件監聽器 ===
window.addEventListener('resize', resize);
window.addEventListener('load', resize);

document.getElementById('btn-portrait').addEventListener('click', () => initGame('portrait'));
document.getElementById('btn-landscape').addEventListener('click', () => initGame('landscape'));
document.getElementById('backBtn').addEventListener('click', resetToMenu);

document.getElementById('submit-btn').addEventListener('click', checkAnswer);

document.getElementById('toggle-calc-btn').addEventListener('click', () => {
    document.getElementById('calculator').classList.toggle('hidden');
});

document.querySelector('.calc-grid').addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    
    const val = e.target.dataset.val;
    const id = e.target.id;

    if (id === 'calc-equals') {
        calculateResult();
    } else if (id === 'calc-ans') {
        calcInput(state.lastCalcAns.toString());
    } else if (val === 'C') {
        calcStr = "0";
        updateCalcScreen();
    } else if (val === 'DEL') {
        calcStr = calcStr.length > 1 ? calcStr.slice(0, -1) : "0";
        updateCalcScreen();
    } else if (val) {
        calcInput(val);
    }
});

document.getElementById('use-ans-btn').addEventListener('click', () => {
    document.getElementById('answer-input').value = parseFloat(calcStr).toFixed(2);
});
