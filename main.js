// main.js

// ====== 變數 ======
let layoutSelectDiv, backBtn, answerPanel, answerInput, calcPanel, calcDisplay;
let calcExpression = "";
let calcVisible = false;

let currentLayout = null; 
let gamePhase = "menu"; 
let currentLevel = 1;

// 玩家狀態
let playerHP = 5;
const MAX_HP = 5;

// 關卡進度
let monstersDefeated = 0;
const MONSTERS_PER_LEVEL = 5;

// 3D / 動畫狀態
let walkAnim = 0;        // 走路動畫計數器
let isWalking = false;   // 是否正在前往下一隻怪獸
let monsterScale = 0;    // 怪獸大小 (0=遠, 1=面前)
let hurtFlash = 0;       // 受傷時畫面變紅
let attackEffect = 0;    // 攻擊特效

// 當前題目
let currentQuestion = null;
let lastFeedback = "";

// 顏色設定
const C_CEILING = [20, 20, 25];
const C_FLOOR = [40, 40, 50];
const C_WALL = [30, 30, 35];
const C_WALL_LIGHT = [40, 40, 45];

function setup() {
  let c = createCanvas(windowWidth, windowHeight);
  c.elt.style.touchAction = "none";

  layoutSelectDiv = document.getElementById("layout-select");
  backBtn = document.getElementById("backButton");
  answerPanel = document.getElementById("answer-panel");
  answerInput = document.getElementById("answerInput");
  calcPanel = document.getElementById("calculator-panel");
  calcDisplay = document.getElementById("calc-display");

  showMenuUI();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  if (gamePhase === "menu") {
    background(0);
    drawRetroGrid();
    return;
  }

  // 1. 繪製 3D 場景 (背景)
  drawFake3DWorld();

  // 2. 繪製怪獸 (如果不在走路狀態且未通關)
  if (gamePhase === "playing" && !isWalking && currentQuestion) {
    drawMonster(width/2, height/2 + Math.sin(frameCount * 0.05) * 10);
  }

  // 3. 繪製 UI (血量、題目)
  if (gamePhase === "playing") {
    drawHUD();
    if (!isWalking) drawQuestionBoard();
  }

  // 4. 轉場/特效
  if (isWalking) updateWalkAnimation();
  if (hurtFlash > 0) {
    fill(255, 0, 0, hurtFlash);
    rect(0, 0, width, height);
    hurtFlash -= 10;
  }
  if (attackEffect > 0) {
    fill(255, 255, 255, attackEffect);
    noStroke();
    ellipse(width/2, height/2, width * (attackEffect/255));
    attackEffect -= 15;
  }

  // 5. 遊戲結束/通關畫面
  if (gamePhase === "gameOver" || gamePhase === "levelClear") {
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    textAlign(CENTER, CENTER);
    textSize(40);
    fill(gamePhase === "levelClear" ? "#4ade80" : "#f87171");
    text(gamePhase === "levelClear" ? "🏆 迷宮突破！" : "💀 你被打倒了...", width/2, height * 0.4);
    textSize(20);
    fill(200);
    text("點擊畫面繼續", width/2, height * 0.6);
  }
}

// ====== 偽 3D 繪圖引擎 ======
function drawFake3DWorld() {
  // 視角晃動 (走路時)
  let bobY = isWalking ? Math.sin(walkAnim * 0.5) * 20 : 0;
  
  // 地平線
  let horizon = height / 2 + bobY;
  
  // 天花板
  background(C_CEILING);
  
  // 地板
  fill(C_FLOOR);
  noStroke();
  rect(0, horizon, width, height - horizon);

  // 遠處的盡頭 (透視點)
  let vanishW = width * 0.1;
  let vanishH = height * 0.1;
  let vanishX = (width - vanishW) / 2;
  let vanishY = (height - vanishH) / 2 + bobY;

  // 牆壁 (左右梯形)
  fill(C_WALL);
  // 左牆
  quad(0, 0, vanishX, vanishY, vanishX, vanishY + vanishH, 0, height);
  // 右牆
  quad(width, 0, vanishX + vanishW, vanishY, vanishX + vanishW, vanishY + vanishH, width, height);

  // 畫透視線增加速度感
  stroke(C_WALL_LIGHT);
  strokeWeight(2);
  
  // 走路時線條會移動
  let speedOffset = isWalking ? (walkAnim * 20) % width : 0;
  
  // 地板線
  for (let i = 0; i < 10; i++) {
    let y = horizon + (i * 20 + speedOffset) * (height/200); // 簡單模擬
    // 這裡簡化處理，只畫放射線
    // 真正簡單的做法：畫幾條從中心射出的線
    let lx = width/2 + (i - 5) * width * 0.4;
    line(width/2, horizon, lx, height);
  }
  
  // 盡頭黑洞
  fill(0);
  noStroke();
  rect(vanishX, vanishY, vanishW, vanishH);
}

function drawMonster(x, y) {
  // 怪獸大小：剛生成時可能小一點，這裡假設已經走到面前
  let scale = 1; 
  // 如果剛走路結束，可以做個放大動畫
  
  push();
  translate(x, y);
  
  // 根據關卡畫不同怪獸
  noStroke();
  if (currentLevel === 1) {
    // 史萊姆 (綠色圓形)
    fill(50, 200, 50);
    ellipse(0, 50, 200 * scale, 160 * scale);
    fill(255); // 眼白
    ellipse(-40, 30, 40, 40);
    ellipse(40, 30, 40, 40);
    fill(0); // 眼珠
    ellipse(-40, 30, 15, 15);
    ellipse(40, 30, 15, 15);
  } else if (currentLevel === 2) {
    // 骷髏 (灰色方形)
    fill(180);
    rectMode(CENTER);
    rect(0, 0, 180, 220, 20);
    fill(0);
    ellipse(-40, -20, 50, 50); // 眼窩
    ellipse(40, -20, 50, 50);
    rect(0, 60, 100, 20); // 嘴
  } else if (currentLevel === 3) {
    // 石像鬼 (紫色三角)
    fill(120, 50, 180);
    triangle(0, -150, -120, 100, 120, 100);
    fill(255, 255, 0);
    ellipse(-30, -20, 30, 50);
    ellipse(30, -20, 30, 50);
  } else {
    // 惡龍 (紅色大圓 + 角)
    fill(200, 30, 30);
    ellipse(0, 0, 280, 300);
    fill(50); // 角
    triangle(-80, -120, -120, -200, -40, -140);
    triangle(80, -120, 120, -200, 40, -140);
    fill(255, 200, 0); // 眼
    ellipse(-60, -30, 40, 60);
    ellipse(60, -30, 40, 60);
    fill(0);
    rect(0, 0, 10, 40); // 瞳孔
  }
  
  pop();
}

function drawHUD() {
  // 抬頭顯示器
  fill(0, 255, 0);
  textSize(16);
  textAlign(LEFT, TOP);
  text(`HP: ${playerHP}/${MAX_HP}`, 20, 20);
  
  textAlign(RIGHT, TOP);
  text(`MONSTERS: ${monstersDefeated}/${MONSTERS_PER_LEVEL}`, width - 20, 20);
  
  // 畫生命條
  noStroke();
  fill(100, 0, 0);
  rect(20, 45, 150, 10);
  fill(0, 200, 0);
  rect(20, 45, 150 * (playerHP/MAX_HP), 10);
}

function drawQuestionBoard() {
  // 題目板顯示在畫面下方或半透明浮動
  let bw = width * 0.9;
  let bh = height * 0.35;
  let bx = width * 0.05;
  let by = height * 0.15; // 顯示在上方，避免擋住怪獸

  fill(0, 0, 0, 200);
  stroke(0, 255, 0);
  strokeWeight(2);
  rect(bx, by, bw, bh, 10);

  fill(0, 255, 0);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(min(width, height) * 0.035);
  
  let pad = 20;
  if (currentQuestion) {
    text(currentQuestion.text, bx + pad, by + pad, bw - pad*2, bh - pad*2);
  }
  
  // 狀態訊息
  if (lastFeedback) {
    textAlign(CENTER, BOTTOM);
    fill(255, 255, 0);
    text(lastFeedback, width/2, by + bh + 30);
  }
}

function drawRetroGrid() {
  stroke(0, 50, 0);
  for(let i=0; i<width; i+=40) line(i, 0, i, height);
  for(let i=0; i<height; i+=40) line(0, i, width, i);
}

// ====== 遊戲邏輯 ======

function updateWalkAnimation() {
  walkAnim++;
  if (walkAnim > 60) { // 走 1 秒
    isWalking = false;
    walkAnim = 0;
    generateNewQuestion();
    answerInput.focus();
  }
}

function startPortraitLayout() { currentLayout = "portrait"; startGame(); }
function startLandscapeLayout() { currentLayout = "landscape"; startGame(); }

function startGame() {
  gamePhase = "chooseLevel"; // 其實這裡應該直接進選關，但為求簡化，我們預設跳出 1-4 關按鈕
  // 為了符合上一版的結構，我們先做一個簡單的關卡選單
  // 但因為要求 "Forward"，這裡設計成：點按鈕選關 -> 進迷宮 -> 殺 5 隻
  
  // 重用上一版的 HTML/Canvas 混合選單邏輯會比較亂，這裡直接用 Canvas 畫選單
}

// 複寫 draw 裡的 menu 邏輯，這裡簡單處理：
// 如果 gamePhase 是 chooseLevel，顯示 4 個按鈕
// 為了代碼簡潔，我們將 chooseLevel 整合進 drawFake3DWorld 上層

// 為了讓 index.html 裡的按鈕生效，我們需要：
// 1. 隱藏 HTML 選單
// 2. 顯示關卡選擇 (Canvas)

function enterLevelSelect() {
  gamePhase = "chooseLevel";
  hideMenuUI();
  if (backBtn) backBtn.style.display = "block";
}

// 修正 index.html 按鈕呼叫
window.startPortraitLayout = function() { currentLayout = "portrait"; enterLevelSelect(); };
window.startLandscapeLayout = function() { currentLayout = "landscape"; enterLevelSelect(); };

// 關卡選擇繪製 (在 draw 裡呼叫)
// 這裡我們用 draw 的邏輯來蓋掉
let originalDraw = draw;
draw = function() {
  if (gamePhase === "chooseLevel") {
    background(0);
    textAlign(CENTER);
    fill(255);
    textSize(30);
    text("選擇樓層", width/2, height * 0.2);
    
    let btnH = height * 0.15;
    for(let i=1; i<=4; i++) {
      let y = height * 0.3 + (i-1)*(btnH + 10);
      fill(40); stroke(255);
      rect(width*0.1, y, width*0.8, btnH, 10);
      fill(255); noStroke();
      text(`Level ${i}`, width/2, y + btnH/2 + 10);
    }
    return;
  }
  originalDraw();
};

// 處理點擊選關
function mousePressed() {
  handleInput(mouseX, mouseY);
}
function touchStarted() {
  handleInput(mouseX, mouseY);
  return false;
}

function handleInput(x, y) {
  if (gamePhase === "chooseLevel") {
    let btnH = height * 0.15;
    for(let i=1; i<=4; i++) {
      let by = height * 0.3 + (i-1)*(btnH + 10);
      if (y > by && y < by + btnH) {
        startLevel(i);
      }
    }
  } else if (gamePhase === "gameOver" || gamePhase === "levelClear") {
    // 重置
    gamePhase = "chooseLevel";
    if (answerPanel) answerPanel.style.display = "none";
  }
}

function startLevel(lvl) {
  currentLevel = lvl;
  playerHP = MAX_HP;
  monstersDefeated = 0;
  monstersToKill = 5;
  gamePhase = "playing";
  isWalking = true; // 一開始先走一段路
  walkAnim = 0;
  if (answerPanel) answerPanel.style.display = "flex";
  if (answerInput) answerInput.value = "";
}

function generateNewQuestion() {
  // 題目生成邏輯 (與上一版類似，但加入 Nth Root 提示)
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  let q = {};
  let P, r, t, A, I;

  if (currentLevel === 1) { // 簡單利息
    P = rand(1, 20) * 1000; r = rand(2, 8); t = rand(1, 5);
    I = P * r * t / 100;
    q.text = `[Lv1 史萊姆]\n本金 $${P}, 年利率 ${r}%, ${t}年\n求單利息 I？`;
    q.answer = I;
  } else if (currentLevel === 2) { // 年複利
    P = rand(2, 10) * 5000; r = rand(2, 10); t = rand(2, 4);
    A = Math.round(P * Math.pow(1 + r/100, t));
    q.text = `[Lv2 骷髏]\n本金 $${P}, ${r}%, ${t}年 (每年複利)\n求本利和 A？`;
    q.answer = A;
  } else if (currentLevel === 3) { // 複利 (月/季)
    P = rand(5, 20) * 1000; r = rand(4, 12); t = rand(1, 3);
    let n = Math.random()>0.5 ? 12 : 4;
    A = Math.round(P * Math.pow(1 + (r/100)/n, n*t));
    let period = n==12 ? "每月" : "每季";
    q.text = `[Lv3 石像鬼]\n本金 $${P}, ${r}%, ${t}年\n(${period}計息)\n求本利和 A？`;
    q.answer = A;
  } else { // 逆向工程
    // 為了讓 Nth Root 有用，我們出一題求利率 r 的
    // A = P(1+r)^t  =>  1+r = (A/P)^(1/t) => r = (A/P)^(1/t) - 1
    P = rand(1, 10) * 10000;
    r = rand(3, 10); // 答案是整數
    t = rand(2, 5);
    A = Math.round(P * Math.pow(1 + r/100, t)); // 因為四捨五入 A，逆算會有小誤差
    
    q.text = `[Lv4 惡龍]\n本金 $${P}, 本利和 $${A}, ${t}年\n(每年複利)\n求年利率 r (%)？\n提示：利用計算機的 ⁿ√x`;
    q.answer = r;
  }
  currentQuestion = q;
}

function submitTypedAnswer() {
  if (!currentQuestion || isWalking) return;
  
  let val = parseFloat(answerInput.value);
  if (isNaN(val)) return;
  
  // 容錯
  let correct = currentQuestion.answer;
  let isCorrect = Math.abs(val - correct) <= (currentLevel === 4 ? 0.5 : 1);
  
  if (isCorrect) {
    // 殺怪
    attackEffect = 255; // 閃白光
    monstersDefeated++;
    lastFeedback = "擊殺！";
    
    if (monstersDefeated >= MONSTERS_PER_LEVEL) {
      gamePhase = "levelClear";
      if (answerPanel) answerPanel.style.display = "none";
    } else {
      isWalking = true; // 前進動畫
      walkAnim = 0;
      currentQuestion = null; // 清空題目等待下一隻
      answerInput.value = "";
    }
  } else {
    // 受傷
    playerHP--;
    hurtFlash = 150; // 閃紅光
    lastFeedback = `錯誤！再試一次。`;
    if (playerHP <= 0) {
      gamePhase = "gameOver";
      if (answerPanel) answerPanel.style.display = "none";
    }
  }
}

// 計算機功能
function toggleCalculator() {
  calcVisible = !calcVisible;
  calcPanel.style.display = calcVisible ? "block" : "none";
}
function calcAppend(v) { calcExpression += v; updateCalc(); }
function calcClear() { calcExpression = ""; updateCalc(); }
function calcBackspace() { calcExpression = calcExpression.slice(0,-1); updateCalc(); }
function updateCalc() { calcDisplay.textContent = calcExpression || "0"; }
function calcEvaluate() {
  try {
    // 處理 Nth Root: 其實就是 ^(1/n)
    // 介面上我們讓使用者輸入 ^(1/n) 
    // 所以這裡只需要處理標準 JS 運算
    let expr = calcExpression.replace(/×/g, "*").replace(/÷/g, "/").replace(/\^/g, "**");
    let res = eval(expr);
    calcExpression = String(Math.round(res * 10000) / 10000);
  } catch(e) {
    calcExpression = "Error";
  }
  updateCalc();
}
function calcFillAnswer() {
  answerInput.value = calcExpression;
  toggleCalculator();
}

// HTML UI 控制
function hideMenuUI() { layoutSelectDiv.style.display = "none"; }
function showMenuUI() { layoutSelectDiv.style.display = "flex"; backBtn.style.display = "none"; answerPanel.style.display="none"; }
function goBackToMenu() { gamePhase="menu"; showMenuUI(); }
