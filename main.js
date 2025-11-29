// === 遊戲狀態管理 ===
const state = {
    mode: 'menu', // 'menu', 'portrait', 'landscape'
    level: 1,
    health: 5,
    score: 0,
    combo: 0,
    questionsInLevel: 0,
    maxQuestions: 30, // 每關30題
    question: null,
    lastCalcAns: 0,
    isFever: false
};

// === Canvas 設定 ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let animationId;

// === 數學題目生成器 (核心邏輯) ===
// 隨機整數 [min, max]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
// 隨機選取陣列元素
const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
// 四捨五入到小數後兩位
const round2 = (num) => Math.round(num * 100) / 100;

const HK_CONTEXTS = [
    "你儲起咗新年嘅利是錢。",
    "你想兩年後買部 PS5 Pro。",
    "你在麥當勞兼職儲了一筆錢。",
    "你打算去日本旅行儲旅費。",
    "爸爸給你一筆錢作大學基金。"
];

function generateQuestion(level) {
    let P, r, t, n, A, I, ans, qText, type;
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
            ans = I;
        } else {
            qText = `${context}<br>本金 $${P}，年利率 ${r}%，單利息存款 ${t} 年。<br>求本利和 (Amount)。`;
            ans = A;
        }
    }
    // Level 2: 複利息 (每年)
    else if (level === 2) {
        A = P * Math.pow((1 + r/100), t);
        I = A - P;
        if (Math.random() > 0.5) {
            qText = `${context}<br>本金 $${P}，年利率 ${r}%，複利息(每年一結)存款 ${t} 年。<br>求本利和。`;
            ans = A;
        } else {
            qText = `${context}<br>本金 $${P}，年利率 ${r}%，複利息(每年一結)存款 ${t} 年。<br>求利息。`;
            ans = I;
        }
    }
    // Level 3: 複利息 (不同期數: 半年, 季, 月, 日)
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
        ans = A;
    }
    // Level 4: 逆向 (單利息/複利息 找 P, r, t)
    else if (level === 4) {
        // 簡化：主要集中在單利息逆向，或簡單複利息
        const type = Math.random() > 0.6 ? 'simple' : 'compound_P'; 
        
        if (type === 'simple') {
            I = (P * r * t) / 100;
            const missing = randItem(['P', 'r', 't']);
            if (missing === 'P') {
                qText = `${context}<br>單利息存款，年利率 ${r}%，存期 ${t} 年，獲得利息 $${I}。<br>求本金 (Principal)。`;
                ans = P;
            } else if (missing === 'r') {
                qText = `${context}<br>單利息存款，本金 $${P}，存期 ${t} 年，獲得利息 $${I}。<br>求年利率 (R%)。(只輸入數字)`;
                ans = r;
            } else {
                qText = `${context}<br>單利息存款，本金 $${P}，年利率 ${r}%，獲得利息 $${I}。<br>求年期 (T)。`;
                ans = t;
            }
        } else {
            // Find P in Compound
            A = P * Math.pow((1 + r/100), t);
            A = round2(A); // 模擬真實題目給出的近似值
            qText = `${context}<br>複利息(每年一結)，年利率 ${r}%，存期 ${t} 年，本利和為 $${A}。<br>求本金 (Principal) (取整數)。`;
            ans = Math.round(A / Math.pow((1 + r/100), t)); // 反推
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
        ans = Math.round(A / Math.pow((1 + r/100/n), n*t));
    }

    return {
        text: qText,
        answer: round2(ans)
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
        ctx.fillRect(this.x, this.y, 8, 8); // 方塊粒子
        ctx.globalAlpha = 1.0;
    }
}

// === 繪圖邏輯 ===
// 天空顏色 [早晨, 下午, 晚上, 深夜, 虛空]
const SKY_COLORS = ['#87CEEB', '#FFA500', '#191970', '#4B0082', '#220000'];

let gridOffset = 0;
let monsterScale = 1.0; // 呼吸效果

function drawGame() {
    // 1. 背景 (Day/Night Cycle)
    const skyColor = SKY_COLORS[Math.min(state.level - 1, 4)];
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 偽 3D 地板格線
    const horizon = canvas.height * 0.5;
    ctx.fillStyle = '#222'; // 地板色
    ctx.fillRect(0, horizon, canvas.width, canvas.height / 2);

    ctx.strokeStyle = state.isFever ? '#FFD700' : '#00FF00'; // Fever時變金色
    ctx.lineWidth = 2;
    ctx.beginPath();

    // 垂直線 (透視)
    const centerX = canvas.width / 2;
    for (let i = -10; i <= 10; i++) {
        ctx.moveTo(centerX, horizon);
        ctx.lineTo(centerX + i * (canvas.width / 2), canvas.height);
    }

    // 水平線 (移動效果)
    gridOffset = (gridOffset + (state.isFever ? 4 : 1)) % 50;
    for (let y = horizon; y < canvas.height; y += 50) {
        let drawY = y + gridOffset;
        if (drawY > canvas.height) drawY -= (canvas.height - horizon);
        ctx.moveTo(0, drawY);
        ctx.lineTo(canvas.width, drawY);
    }
    ctx.stroke();

    // 3. 怪物 (偽 3D 幾何體)
    monsterScale = 1 + Math.sin(Date.now() / 500) * 0.1; // 呼吸動畫
    const mx = canvas.width / 2;
    const my = canvas.height / 2 + 50;
    const size = 100 * monsterScale;

    ctx.fillStyle = state.level % 2 === 0 ? '#FF4444' : '#AA44FF';
    // 簡單繪製一個像怪物的形狀
    ctx.beginPath();
    ctx.moveTo(mx, my - size);
    ctx.lineTo(mx - size/2, my);
    ctx.lineTo(mx, my + size);
    ctx.lineTo(mx + size/2, my);
    ctx.closePath();
    ctx.fill();
    
    // 怪物眼睛
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(mx - 20, my - 20, 15, 0, Math.PI*2);
    ctx.arc(mx + 20, my - 20, 15, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(mx - 20, my - 20, 5, 0, Math.PI*2);
    ctx.arc(mx + 20, my - 20, 5, 0, Math.PI*2);
    ctx.fill();

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

    // 切換 DOM 顯示
    document.getElementById('menu').classList.add('hidden');
    const container = document.getElementById('game-container');
    container.classList.remove('hidden');
    
    // 設定 CSS 模式類別 (影響佈局)
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
    
    // 容許誤差 0.1
    if (Math.abs(inputVal - correctVal) < 0.15) {
        // Correct
        handleCorrect();
    } else {
        // Wrong
        handleWrong(correctVal);
    }
}

function handleCorrect() {
    state.score += 100 + (state.combo * 20);
    state.combo++;
    state.questionsInLevel++;
    
    // Fever Mode Check
    if (state.combo >= 3) {
        state.isFever = true;
        document.getElementById('game-container').classList.add('combo-active');
        document.getElementById('combo-msg').classList.remove('hidden');
    }

    // Spawn Particles
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for(let i=0; i<30; i++) {
        particles.push(new Particle(cx, cy, `hsl(${Math.random()*360}, 100%, 50%)`));
    }

    // Check Level Progress
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

    // Shake & Flash
    const container
