// === 全域變數 ===
let isGameActive = false; // 控制 Canvas 是否繪製
let gamePhase = "menu";   // menu, playing, levelClear, gameOver
let currentLevel = 1;
let playerHP = 5;
let monstersKilled = 0;
let currentQuestion = null;
let questionList = []; // 該關卡的題目序列

// 動畫相關
let walkAnim = 0;
let isWalking = false;
let hurtFlash = 0;
let attackFlash = 0;

// 計算機相關
let calcExpression = "";

// DOM 元素快取
let elMenu, elGameUI, elCalc, elHp, elLvl, elAnsInput, elCalcScreen;

// p5.js Setup
function setup() {
  // 1. 建立 Canvas 但先設為 display:none 或置於底層
  let c = createCanvas(windowWidth, windowHeight);
  c.id("game-canvas");
  c.elt.style.position = "absolute";
  c.elt.style.top = "0";
  c.elt.style.left = "0";
  c.elt.style.zIndex = "1"; // 低於 UI
  
  // 2. 抓取 DOM
  elMenu = select("#menu-screen");
  elGameUI = select("#game-ui");
  elCalc = select("#calc-panel");
  elHp = select("#hp-display");
  elLvl = select("#level-display");
  elAnsInput = select("#ans-input");
  elCalcScreen = select("#calc-screen");
  
  // 3. 初始化
  noLoop(); // 選單時不重繪 Canvas，節省資源
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// p5.js Draw Loop (只有遊戲開始後才跑)
function draw() {
  if (!isGameActive) return;
  
  background(20); // 清空背景
  
  // 1. 繪製 3D 場景
  draw3DScene();
  
  // 2. 繪製怪物 (若沒在走路且有題目)
  if (!isWalking && currentQuestion) {
    drawMonster();
  }
  
  // 3. 繪製題目板 (3D 場景之上)
  if (!isWalking && currentQuestion) {
    drawQuestionBoard();
  }
  
  // 4. 特效
  handleEffects();
  
  // 5. 結束畫面覆蓋層
  if (gamePhase === "levelClear" || gamePhase === "gameOver") {
    drawEndOverlay();
  }
}

// === 遊戲控制 ===

// HTML 按鈕呼叫此函數開始遊戲
function startGame(layoutMode) {
  console.log("Game Start: " + layoutMode);
  
  // 隱藏選單，顯示遊戲 UI
  elMenu.addClass("hidden");
  elGameUI.removeClass("hidden");
  
  // 重置狀態
  isGameActive = true;
  currentLevel = 1;
  startLevel(1);
  
  loop(); // 開始 p5.js 繪圖
}

function backToMenu() {
  isGameActive = false;
  noLoop();
  
  elMenu.removeClass("hidden");
  elGameUI.addClass("hidden");
  elCalc.addClass("hidden");
  
  gamePhase = "menu";
}

function startLevel(lvl) {
  currentLevel = lvl;
  playerHP = 5;
  monstersKilled = 0;
  updateHUD();
  
  // 產生該關卡題目序列
  generateQuestionList(lvl);
  
  gamePhase = "playing";
  isWalking = true; // 開場先走一段
  walkAnim = 0;
  
  elAnsInput.value(""); // 清空輸入
}

function updateHUD() {
  elHp.html(`❤️ HP: ${playerHP}`);
  elLvl.html(`Lv: ${currentLevel}`);
}

// === 題目邏輯 ===

function generateQuestionList(lvl) {
  questionList = [];
  // 簡單設定：每關 5 題，這裡只存題型字串，具體題目在生成時算
  // Lv4, Lv5 需要混合題型
  let types = [];
  if (lvl < 4) types = ["FindA", "FindA", "FindA", "FindA", "FindA"];
  else if (lvl === 4) types = ["FindP", "FindR", "FindT", "FindP", "FindR"];
  else types = ["FindP", "FindR", "FindT", "FindR", "FindT"];
  
  // 洗牌
  types = shuffle(types);
  questionList = types;
}

function generateNextQuestion() {
  let type = questionList[monstersKilled];
  let q = { text: "", answer: 0 };
  
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  let P = rand(1, 20) * 10000;
  let r = rand(3, 12);
  let t = rand(2, 5);
  
  // 根據關卡生成題目
  if (currentLevel === 1) { // 簡單利息
    let I = P * r * t / 100;
    q.text = `[Lv1] 簡單利息\nP=$${P}, r=${r}%, t=${t}年\n求利息 I？`;
    q.answer = I;
  } 
  else if (currentLevel === 2) { // 年複利
    let A = Math.round(P * Math.pow(1 + r/100, t));
    q.text = `[Lv2] 每年複利\nP=$${P}, r=${r}%, t=${t}年\n求本利和 A？`;
    q.answer = A;
  }
  else if (currentLevel === 3) { // 分期複利
    let n = random() > 0.5 ? 12 : 4;
    let period = n===12 ? "每月" : "每季";
    let A = Math.round(P * Math.pow(1 + (r/100)/n, n*t));
    q.text = `[Lv3] ${period}複利\nP=$${P}, r=${r}%, t=${t}年\n求本利和 A？`;
    q.answer = A;
  }
  else { 
    // Lv4 & Lv5 逆算邏輯 (簡化版)
    // 先算一個標準答案 A
    let A = Math.round(P * Math.pow(1 + r/100, t));
    if (type === "FindP") {
       q.text = `[Lv${currentLevel}] 複利逆算\nA=$${A}, r=${r}%, t=${t}年\n求本金 P？`;
       q.answer = P;
    } else if (type === "FindR") {
       q.text = `[Lv${currentLevel}] 複利逆算\nP=$${P}, A=$${A}, t=${t}年\n求利率 r (%)？`;
       q.answer = r;
    } else {
       q.text = `[Lv${currentLevel}] 複利逆算\nP=$${P}, A=$${A}, r=${r}%\n求年期 t (年)？`;
       q.answer = t;
    }
  }
  
  currentQuestion = q;
}

function submitAnswer() {
  if (gamePhase !== "playing" || isWalking || !currentQuestion) return;
  
  let val = parseFloat(elAnsInput.value().replace(/,/g, ''));
  if (isNaN(val)) return;
  
  // 寬容度
  let margin = (currentQuestion.answer > 1000) ? 100 : 1;
  
  if (Math.abs(val - currentQuestion.answer) <= margin) {
    // 答對
    monstersKilled++;
    attackFlash = 150; // 白光特效
    
    if (monstersKilled >= 5) {
      gamePhase = "levelClear";
    } else {
      isWalking = true;
      walkAnim = 0;
      currentQuestion = null;
      elAnsInput.value("");
    }
  } else {
    // 答錯
    playerHP--;
    updateHUD();
    hurtFlash = 150; // 紅光特效
    if (playerHP <= 0) {
      gamePhase = "gameOver";
    }
  }
}

// === 繪圖函數 ===

function draw3DScene() {
  // 簡單的透視線條
  let horizon = height / 2;
  if (isWalking) {
    horizon += Math.sin(walkAnim * 0.5) * 10; // 走路晃動
  }
  
  // 天與地
  noStroke();
  fill(20); rect(0, 0, width, horizon);
  fill(40); rect(0, horizon, width, height - horizon);
  
  // 盡頭
  let cx = width / 2;
  let cy = horizon;
  let size = width * 0.2;
  
  fill(0);
  rectMode(CENTER);
  rect(cx, cy, size, size);
  rectMode(CORNER);
  
  // 線條
  stroke(80); strokeWeight(2);
  line(0, 0, cx - size/2, cy - size/2);
  line(width, 0, cx + size/2, cy - size/2);
  line(0, height, cx - size/2, cy + size/2);
  line(width, height, cx + size/2, cy + size/2);
}

function drawMonster() {
  push();
  translate(width/2, height/2);
  textAlign(CENTER, CENTER);
  textSize(150);
  let icon = ["🦠", "💀", "👹", "🐲", "😈"][currentLevel - 1] || "👾";
  text(icon, 0, 20);
  pop();
}

function drawQuestionBoard() {
  // 半透明黑底
  fill(
