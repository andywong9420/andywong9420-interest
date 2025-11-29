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
        text = `[Level 2 複利息 年結]<br>${story}<br>P=$${fmt(P)}, R=${R}%, T=${T}年<br>${askType==='I'?'求利息 I?':'求本利和 A?'}`
        ans = askType==='I'?I:A;
    } else if (lvl===3) {
        const ns=[2,4,12];
        const names=['每半年 (Half-yearly)','每季 (Quarterly)','每月 (Monthly)'];
        let idx=rInt(0,2);
        let n=ns[idx];
        let A=P*Math.pow(1+(R/100)/n,n*T);
        let I=A-P;
        text = `[Level 3 複利息 ${names[idx]}]<br>${story}<br>P=$${fmt(P)}, R=${R}%, T=${T}年<br>${askType==='I'?'求利息 I?':'求本利和 A?'}`
        ans = askType==='I'?I:A;
    } else if (lvl===4) {
        let A=Math.round(P*Math.pow(1+R/100,T));
        text=`[Level 4 逆向]<br>Target Amount = $${fmt(A)}<br>R=${R}%, T=${T}年 (年結)<br>求本金 P (整數)?`;
        ans=Math.round(A/Math.pow(1+R/100,T));
    } else {
        let A_simple=P*(1+(R/100)*T);
        let A_comp=P*Math.pow(1+R/100,T);
        text=`[BOSS 比較]<br>P=$${fmt(P)}, R=${R}%, T=${T}年<br>求: 複利本利和 − 單利本利和`;
        ans=A_comp-A_simple;
    }
    return {text,answer:ans};
}

function nextLevel(lvl) {
    if (lvl>5) {
        alert("🎉 你已通關所有關卡!");
        localStorage.removeItem('interestWarrior');
        currentState='WIN';
        return;
    }
    level=lvl;
    questionCount=0;
    newTurn();
}

function newTurn() {
    currentQuestion = generateQuestion(level);
    questionText.innerHTML = `Level ${level} (Q${questionCount+1}/${questionsNeeded})<br>${currentQuestion.text}`;
    inputField.value='';
    monsterScale=0.35;
    currentState='PLAYING';
    updateHUD();
    saveGame();
}

function updateHUD() {
    levelDisplay.textContent = level;
    hpDisplay.textContent = "❤️".repeat(health);
    const qc = document.getElementById('question-container');
    if (combo>=3) qc.classList.add('fever-mode');
    else qc.classList.remove('fever-mode');
}

// ====== ANSWER CHECK ======
document.getElementById('submit-btn').addEventListener('click', checkAnswer);
document.getElementById('calc-toggle-btn').addEventListener('click', () => {
    document.getElementById('calculator').classList.toggle('hidden');
});

function checkAnswer() {
    if (currentState!=='PLAYING') return;
    const v = parseFloat(inputField.value);
    if (isNaN(v)) { alert("請輸入數字"); return; }

    const correct = currentQuestion.answer;
    let ok = Math.abs(v-correct) < Math.max(0.01, Math.abs(correct)*0.01) ||
             Math.round(v)===Math.round(correct);

    if (ok) {
        combo++;
        showCombo();
        createParticles(canvas.width/2, canvas.height/2);
        currentState='RUNNING';
        animationTimer=60;
        questionCount++;
    } else {
        combo=0;
        health--;
        updateHUD();
        damageOverlay.classList.add('damage-flash');
        gameContainer.classList.add('shake-effect');
        setTimeout(()=>{
            damageOverlay.classList.remove('damage-flash');
            gameContainer.classList.remove('shake-effect');
        },400);
        if (health<=0) {
            alert("💀 Game Over! 重新挑戰同一關。");
            health=5; questionCount=0; combo=0;
            newTurn();
        } else {
            alert("❌ 答錯了！");
        }
    }
}

function showCombo() {
    if (combo>1) {
        comboCountSpan.textContent = combo;
        comboOverlay.classList.add('combo-active');
        setTimeout(()=>comboOverlay.classList.remove('combo-active'),700);
    }
}

// ====== PARTICLES ======
class Particle {
    constructor(x,y,color){
        this.x=x;this.y=y;
        this.vx=(Math.random()-0.5)*12;
        this.vy=(Math.random()-0.5)*12;
        this.life=1;
        this.color=color;
    }
    update(){
        this.x+=this.vx;
        this.y+=this.vy;
        this.vy+=0.4;
        this.life-=0.03;
    }
    draw(ctx){
        ctx.globalAlpha=this.life;
        ctx.fillStyle=this.color;
        ctx.fillRect(this.x,this.y,10,10);
        ctx.globalAlpha=1;
    }
}
function createParticles(x,y){
    const cols=['#f1c40f','#e74c3c','#ffffff'];
    for(let i=0;i<25;i++){
        particles.push(new Particle(x,y,cols[i%cols.length]));
    }
}

// ====== GAME LOOP (Canvas) ======
function gameLoop() {
    frameCount++;
    resizeCanvas(); // keep canvas synced to layout

    const w = canvas.width;
    const h = canvas.height;
    const cx = w/2;
    const cy = h/2;

    ctx.clearRect(0,0,w,h);

    // background
    let sky = level>=4 ? '#2c3e50' : (level>=2 ? '#e67e22' : '#87CEEB');
    ctx.fillStyle=sky;
    ctx.fillRect(0,0,w,h/2);
    ctx.fillStyle= level>=4 ? '#145a32' : '#27ae60';
    ctx.fillRect(0,h/2,w,h/2);

    // grid
    let speed = currentState==='RUNNING' ? 8 : gridSpeed;
    if (currentState==='RUNNING') {
        monsterScale += 0.02;
        animationTimer--;
        if (animationTimer<=0){
            if (questionCount>=questionsNeeded) nextLevel(level+1);
            else newTurn();
        }
    }

    ctx.strokeStyle = level>=4 ? '#0b5345' : '#1e8449';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=-8;i<=8;i++){
        ctx.moveTo(cx,cy);
        ctx.lineTo(cx+i*cx*1.5,h);
    }
    let off=(frameCount*speed)%40;
    for(let i=0;i<10;i++){
        let dist=i*40+off;
        let y=cy + Math.pow(dist,1.2)*0.05;
        if (y>h) continue;
        ctx.moveTo(0,y);
        ctx.lineTo(w,y);
    }
    ctx.stroke();

    // monster
    let shakeX = currentState==='RUNNING' ? (Math.random()-0.5)*10 : 0;
    drawMonster(cx+shakeX, cy+80, monsterScale);

    // sword
    let swordY = h-20;
    if (currentState==='RUNNING') swordY += Math.sin(frameCount*0.5)*20;
    drawSword(cx + w*0.25, swordY);

    // particles
    for (let i=particles.length-1;i>=0;i--){
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life<=0) particles.splice(i,1);
    }

    requestAnimationFrame(gameLoop);
}

function drawMonster(x,y,scale){
    const base = Math.min(canvas.width, canvas.height)/5;
    const s = scale * (base/100);
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(s,s);
    ctx.translate(0,-50);

    ctx.fillStyle = level>=4 ? '#8e44ad' : '#9b59b6';
    ctx.beginPath();
    ctx.arc(0,0,50,Math.PI,0);
    ctx.bezierCurveTo(50,50,-50,50,-50,0);
    ctx.fill();
    ctx.strokeStyle='#000';
    ctx.lineWidth=2;
    ctx.stroke();

    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(-20,-10,12,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20,-10,12,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#e74c3c';
    ctx.beginPath(); ctx.arc(-20,-10,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20,-10,4,0,Math.PI*2); ctx.fill();

    ctx.restore();
}

function drawSword(x,y){
    const base = Math.min(canvas.width, canvas.height)/5;
    const s = base/120;
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(s,s);
    ctx.rotate(-0.5);

    ctx.fillStyle='#bdc3c7';
    ctx.fillRect(-10,-140,20,140);
    ctx.strokeStyle='#7f8c8d';
    ctx.strokeRect(-10,-140,20,140);
    ctx.fillStyle='#f1c40f';
    ctx.fillRect(-25,0,50,12);
    ctx.fillStyle='#8e44ad';
    ctx.fillRect(-7,12,14,40);

    ctx.restore();
}

// ====== CALCULATOR ======
const calcBtns = document.querySelectorAll('.calc-btn');
calcBtns.forEach(btn => btn.addEventListener('click', e=>handleCalcInput(e.target.dataset.val)));

function handleCalcInput(v){
    if (v==='AC') calcExpression="";
    else if (v==='DEL') {
        if (calcExpression.endsWith(' √ ')) calcExpression=calcExpression.slice(0,-3);
        else calcExpression=calcExpression.slice(0,-1);
    } else if (v==='INSERT') {
        const res = evaluateExpression(calcExpression);
        if (res!=="Error"){ inputField.value=res; lastCalcAnswer=parseFloat(res); }
    } else if (v==='ANS') calcExpression+=lastCalcAnswer;
    else if (v==='ROOT') calcExpression+=" √ ";
    else calcExpression+=v;

    calcScreen.textContent = calcExpression || "0";
}

function evaluateExpression(expr){
    try{
        if (expr.includes(" √ ")) {
            const [a,b] = expr.split(" √ ");
            const base = eval(a);
            const idx = eval(b);
            return Math.pow(base,1/idx).toFixed(4);
        }
        const clean = expr.replace(/\^/g,"**").replace(/x/g,"*");
        let res = eval(clean);
        if (isNaN(res)) return "Error";
        return (res%1!==0)?res.toFixed(2):String(res);
    }catch(e){ return "Error"; }
}

// start loop
checkSaveGame();
requestAnimationFrame(gameLoop);
