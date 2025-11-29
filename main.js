// main.js - 整合修正版

// 遊戲全域變數
let gamePhase = "menu"; // menu, chooseLevel, playing, gameOver, levelClear
let currentLayout = null; // portrait, landscape
let currentLevel = 1;

// 玩家與怪物狀態
let playerHP = 5;
const MAX_HP = 5;
let monstersDefeated = 0;
const MONSTERS_PER_LEVEL = 5;

// 題目系統
let currentQuestion = null;
let questionBatch = [];

// 動畫變數
let walkAnim = 0;
let isWalking = false;
let hurtFlash = 0;
let attackEffect = 0;

// 計算機變數
let calcExpression = "";
let calcLastAns = 0;
let calcVisible = false;

// DOM 元素
let layoutSelectDiv, backBtn, answerPanel, answerInput, calcPanel, calcDisplay;

function setup() {
  let c = createCanvas(windowWidth, windowHeight);
  c.elt.style.touchAction = "none";

  // 綁定 HTML 元素
  layoutSelectDiv = document.getElementById("layout-select");
  backBtn = document.getElementById("backButton");
  answerPanel = document.getElementById("answer-panel");
  answerInput = document.getElementById("answerInput");
  calcPanel = document.getElementById("calculator-panel");
  calcDisplay = document.getElementById("calc-display");

  // 確保初始狀態正確
  goBackToMenu();
  textFont("sans-serif");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 核心繪圖迴圈 - 統一處理所有狀態
function draw() {
  background(20); // 清空畫面

  // 1. 選單狀態 (HTML 覆蓋，Canvas 畫背景裝飾)
  if (gamePhase === "menu") {
    drawGridBackground();
    return;
  }

  // 2. 選關狀態 (Canvas 繪製選關按鈕)
  if (gamePhase === "chooseLevel") {
    drawLevelSelection();
    return;
  }

  // 3. 遊戲進行狀態 (偽 3D 迷宮)
  if (gamePhase === "playing") {
    drawFake3DWorld();

    // 畫怪物
    if (!isWalking && currentQuestion) {
      drawMonster(width / 2, height / 2 + Math.sin(frameCount * 0.05) * 10);
    }

    // 畫 UI
    drawHUD();
    if (!isWalking) {
      drawQuestionBoard();
    }

    // 處理動畫與特效
    handleEffects();
    return;
  }

  // 4. 結束畫面
  if (gamePhase === "gameOver" || gamePhase === "levelClear") {
    // 保持背景是迷宮，疊加半透明層
    drawFake3DWorld();
    fill(0, 0, 0, 220);
    rect(0, 0, width, height);
    
    textAlign(CENTER, CENTER);
    textSize(40);
    if (gamePhase === "levelClear") {
      fill(50, 255, 100);
      text("🏆 任務完成！", width / 2, height * 0.4);
    } else {
      fill(255, 50, 50);
      text("💀 你被打倒了...", width / 2, height * 0.4);
    }
    
    textSize(20);
    fill(200);
    text("點擊任意處返回", width / 2, height * 0.6);
  }
}

// ====== 繪圖子函數 ======

function drawGridBackground() {
  stroke(40);
  strokeWeight(1);
  for (let i = 0; i < width; i += 40) line(i, 0, i, height);
  for (let j = 0; j < height; j += 40) line(0, j, width, j);
}

function drawLevelSelection() {
  textAlign(CENTER, CENTER);
  fill(255);
  textSize(32);
  text("選擇樓層", width / 2, height * 0.15);

  // 繪製 5 個關卡按鈕
  let btnH = height * 0.12;
  let gap = 10;
  let startY = height * 0.22;

  for (let i = 1; i <= 5; i++) {
    let y = startY + (i - 1) * (btnH + gap);
    
    // 按鈕底
    fill(40);
    stroke(100);
    if (mouseY > y && mouseY < y + btnH && mouseX > width * 0.1 && mouseX < width * 0.9) {
      fill(60); // Hover 效果
      stroke(200);
    }
    rect(width * 0.1, y, width * 0.8, btnH, 10);

    // 文字
    fill(255);
    noStroke();
    textSize(24);
    let title = `Level ${i}`;
    let desc = ["簡單利息", "每年複利", "分期複利", "逆向工程 (P/r/t)", "魔王級 (非年逆算)"][i-1];
    text(title, width / 2, y + btnH * 0.35);
    
    fill(180);
    textSize(16);
    text(desc, width / 2, y + btnH * 0.7);
  }
}

function drawFake3DWorld() {
  // 走路視角搖晃
  let bobY = isWalking ? Math.sin(walkAnim * 0.5) * 15 : 0;
  let horizon = height / 2 + bobY;

  // 地板與天花板
  noStroke();
  fill(20); // 天花板
  rect(0, 0, width, horizon);
  fill(35); // 地板
  rect(0, horizon, width, height - horizon);

  // 透視點 (盡頭)
  let vw = width * 0.2;
  let vh = height * 0.2;
  let vx = (width - vw) / 2;
  let vy = horizon - vh / 2;

  // 牆壁線條
  stroke(60);
  strokeWeight(2);
  line(0, 0, vx, vy);
  line(width, 0, vx + vw, vy);
  line(0, height, vx, vy + vh);
  line(width, height, vx + vw, vy + vh);

  // 盡頭黑洞
  fill(0);
  noStroke();
  rect(vx, vy, vw, vh);
}

function drawMonster(x, y) {
  // 簡單畫出不同關卡的怪獸
  push();
  translate(x, y);
  textAlign(CENTER, CENTER);
  textSize(180); // 用 Emoji 當怪獸最省資源且效果好
  let icon = ["🦠", "💀", "👹", "🐲", "😈"][currentLevel - 1] || "👾";
  text(icon, 0, 0);
  pop();
}

function drawHUD() {
  fill(0, 255, 0);
  textSize(18);
  textAlign(LEFT, TOP);
  text(`HP: ${playerHP} / ${MAX_HP}`, 20, 20);
  
  textAlign(RIGHT, TOP);
  text(`討伐: ${monstersDefeated} / ${MONSTERS_PER_LEVEL}`, width - 20, 20);
}

function drawQuestionBoard() {
  let boardH = height * 0.35;
  let boardY = height * 0.1;
  
  // 半透明黑底板
  fill(0, 0, 0, 220);
  stroke(0, 255, 0);
  strokeWeight(2);
  rect(width * 0.05, boardY, width * 0.9, boardH, 12);

  // 題目文字
  if (currentQuestion) {
    fill(255);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(Math.min(width, height) * 0.04);
    text(currentQuestion.text, width * 0.08, boardY + 20, width * 0.84);
  }
}

function handleEffects() {
  // 走路動畫
  if (isWalking) {
    walkAnim++;
    if (walkAnim > 45) { // 走完
      isWalking = false;
      generateNewQuestion();
    }
  }

  // 受傷紅閃
  if (hurtFlash > 0) {
    fill(255, 0, 0, hurtFlash);
    noStroke();
    rect(0, 0, width, height);
    hurtFlash -= 10;
  }

  // 攻擊白閃
  if (attackEffect > 0) {
    fill(255, 255, 255, attackEffect);
    noStroke();
    ellipse(width / 2, height / 2, width * (attackEffect / 200));
    attackEffect -= 20;
  }
}

// ====== 互動邏輯 ======

function touchStarted() {
  handleInput(mouseX, mouseY);
  return false; // 防止預設行為
}

function mousePressed() {
  handleInput(mouseX, mouseY);
}

function handleInput(x, y) {
  // 選關邏輯
  if (gamePhase === "chooseLevel") {
    let btnH = height * 0.12;
    let gap = 10;
    let startY = height * 0.22;
    
    for (let i = 1; i <= 5; i++) {
      let by = startY + (i - 1) * (btnH + gap);
      if (y > by && y < by + btnH && x > width * 0.1 && x < width * 0.9) {
        startLevel(i);
        return;
      }
    }
  }
  // 結束畫面邏輯
  else if (gamePhase === "gameOver" || gamePhase === "levelClear") {
    enterLevelSelect();
  }
}

// ====== 遊戲流程控制 ======

function startPortraitLayout() {
  currentLayout = "portrait";
  enterLevelSelect();
}

function startLandscapeLayout() {
  currentLayout = "landscape";
  enterLevelSelect();
}

function enterLevelSelect() {
  gamePhase = "chooseLevel";
  layoutSelectDiv.style.display = "none";
  backBtn.style.display = "block";
  answerPanel.style.display = "none";
}

function goBackToMenu() {
  gamePhase = "menu";
  layoutSelectDiv.style.display = "flex";
  backBtn.style.display = "none";
  answerPanel.style.display = "none";
  calcPanel.style.display = "none";
}

function startLevel(lvl) {
  currentLevel = lvl;
  playerHP = MAX_HP;
  monstersDefeated = 0;
  
  // 生成該關題型分佈
  generateQuestionBatch(lvl);
  
  gamePhase = "playing";
  isWalking = true; // 開場先走路
  walkAnim = 0;
  
  answerPanel.style.display = "flex";
  answerInput.value = "";
}

// ====== 題目生成系統 ======

function generateQuestionBatch(lvl) {
  questionBatch = [];
  // Lv1-3: 求本利和 (FindA)
  if (lvl < 4) {
    for(let i=0; i<5; i++) questionBatch.push("FindA");
  }
  // Lv4: 混合求 P, r, t (簡單/年複利)
  else if (lvl === 4) {
    let types = ["FindP", "FindR", "FindT", "FindP", "FindR"]; // 確保多樣性
    shuffleArray(types);
    questionBatch = types;
  }
  // Lv5: 混合求 P, r, t (分期複利)
  else if (lvl === 5) {
    let types = ["FindP", "FindR", "FindT", "FindR", "FindT"];
    shuffleArray(types);
    questionBatch = types;
  }
}

function shuffleArray(arr) {
  arr.sort(() => Math.random() - 0.5);
}

function generateNewQuestion() {
  let type = questionBatch[monstersDefeated];
  let q = {};
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  let P = rand(1, 20) * 10000;
  let r = rand(2, 10);
  let t = rand(2, 6);

  // Lv1: 簡單利息
  if (currentLevel === 1) {
    let I = P * r * t / 100;
    q.text = `[Lv1] 簡單利息\nP=$${P}, r=${r}%, t=${t}年\n求利息 I？`;
    q.answer = I;
  }
  // Lv2: 年複利
  else if (currentLevel === 2) {
    let A = Math.round(P * Math.pow(1 + r/100, t));
    q.text = `[Lv2] 每年複利\nP=$${P}, r=${r}%, t=${t}年\n求本利和 A？`;
    q.answer = A;
  }
  // Lv3: 分期複利
  else if (currentLevel === 3) {
    let n = Math.random() > 0.5 ? 12 : 4; // 月或季
    let period = n === 12 ? "每月" : "每季";
    let A = Math.round(P * Math.pow(1 + (r/100)/n, n*t));
    q.text = `[Lv3] ${period}複利\nP=$${P}, r=${r}%, t=${t}年\n求本利和 A？`;
    q.answer = A;
  }
  // Lv4: 逆向 (簡單 or 年複利)
  else if (currentLevel === 4) {
    let isSimple = Math.
