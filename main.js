// main.js

// ====== 全域變數與 DOM ======
let layoutSelectDiv, backBtn, answerPanel, answerInput, calcPanel, calcDisplay;
let calcExpression = "";
let calcVisible = false;

// 遊戲狀態
let currentLayout = null; // "portrait" | "landscape"
let gamePhase = "menu";   // "menu", "chooseLevel", "playing", "gameOver", "levelClear"
let currentLevel = 1;

// RPG 數值
const MAX_PLAYER_HP = 5;
const MONSTER_MAX_HP = 5; // 每關 5 題 = 怪獸 5 滴血
let playerHP = MAX_PLAYER_HP;
let monsterHP = MONSTER_MAX_HP;

// 題目系統
let currentQuestion = null;
let lastFeedback = "";     // 戰鬥訊息 (e.g. "造成 1 點傷害！")
let feedbackTimer = 0;     // 控制訊息顯示時間
let shakeAmount = 0;       // 受傷震動特效

// 視覺設定
const COLORS = {
  bg: [15, 23, 42],
  player: [59, 130, 246], // 藍色勇者
  monster: [239, 68, 68], // 紅色怪獸
  monster2: [168, 85, 247], // 紫色 (Lv2)
  monster3: [234, 179, 8],  // 黃色 (Lv3)
  monster4: [16, 185, 129], // 綠色 (Lv4)
  uiBg: [30, 41, 59],
  text: [241, 245, 249]
};

function setup() {
  let c = createCanvas(windowWidth, windowHeight);
  c.elt.style.touchAction = "none"; // 禁止 iOS 預設觸控

  // 綁定 HTML
  layoutSelectDiv = document.getElementById("layout-select");
  backBtn = document.getElementById("backButton");
  answerPanel = document.getElementById("answer-panel");
  answerInput = document.getElementById("answerInput");
  calcPanel = document.getElementById("calculator-panel");
  calcDisplay = document.getElementById("calc-display");

  textFont("Segoe UI, sans-serif");
  showMenuUI();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(COLORS.bg);

  if (shakeAmount > 0) {
    translate(random(-shakeAmount, shakeAmount), random(-shakeAmount, shakeAmount));
    shakeAmount *= 0.9;
    if (shakeAmount < 0.5) shakeAmount = 0;
  }

  if (gamePhase === "menu") {
    drawMenuEffect(); // 背景特效
    return;
  }

  if (gamePhase === "chooseLevel") {
    drawLevelSelect();
  } else if (gamePhase === "playing") {
    drawBattleScene();
  } else if (gamePhase === "gameOver" || gamePhase === "levelClear") {
    drawEndScreen();
  }
}

// ====== 繪圖邏輯 ======

function drawMenuEffect() {
  noStroke();
  fill(255, 255, 255, 20);
  for (let i = 0; i < 10; i++) {
    let r = (frameCount * 2 + i * 100) % width;
    ellipse(width/2, height/2, r, r * 0.6);
  }
}

function drawLevelSelect() {
  textAlign(CENTER, CENTER);
  fill(COLORS.text);
  textSize(min(width, height) * 0.05);
  
  let titleY = currentLayout === "portrait" ? height * 0.15 : height * 0.1;
  text("選擇討伐目標", width * 0.5, titleY);

  // 根據直向/橫向排列按鈕
  // 這裡其實主要靠 HTML/CSS 處理，但我們可以在 Canvas 上畫一些裝飾
  // 為了簡單，選關邏輯我們用 Canvas 畫按鈕，讓體驗更統一
  
  let levels = [
    { id: 1, name: "Lv1 史萊姆", desc: "簡單利息" },
    { id: 2, name: "Lv2 雙頭狼", desc: "年複利" },
    { id: 3, name: "Lv3 奇美拉", desc: "非年複利" },
    { id: 4, name: "Lv4 惡龍王", desc: "求 P/R/T" }
  ];

  let startY = currentLayout === "portrait" ? height * 0.25 : height * 0.2;
  let btnH = currentLayout === "portrait" ? height * 0.12 : height * 0.15;
  let gap = 15;
  let btnW = currentLayout === "portrait" ? width * 0.8 : width * 0.4;
  
  // 如果是橫向，做 2x2 排列；直向做 1x4
  if (currentLayout === "landscape") {
    for (let i = 0; i < levels.length; i++) {
      let col = i % 2;
      let row = Math.floor(i / 2);
      let x = width * 0.3 + col * (btnW + gap); // 偏右一點
      let y = startY + row * (btnH + gap);
      drawLevelButton(x, y, btnW, btnH, levels[i]);
    }
    // 左側說明
    textSize(height * 0.04);
    textAlign(LEFT);
    text("請點擊怪獸\n開始戰鬥！", width * 0.05, height * 0.4);
  } else {
    for (let i = 0; i < levels.length; i++) {
      let x = width * 0.1;
      let y = startY + i * (btnH + gap);
      drawLevelButton(x, y, btnW, btnH, levels[i]);
    }
  }
}

function drawLevelButton(x, y, w, h, levelData) {
  fill(COLORS.uiBg);
  stroke(100);
  strokeWeight(2);
  rect(x, y, w, h, 10);
  
  noStroke();
  fill(COLORS.text);
  textAlign(LEFT, TOP);
  textSize(min(w, h) * 0.25);
  text(levelData.name, x + 20, y + 15);
  
  textSize(min(w, h) * 0.18);
  fill(150, 160, 180);
  text(levelData.desc, x + 20, y + h * 0.55);
}

function drawBattleScene() {
  // 1. 畫 HUD (血條)
  drawHUD();

  // 2. 畫角色
  drawEntities();

  // 3. 畫題目板
  if (currentQuestion) {
    drawQuestionBoard();
  }

  // 4. 戰鬥回饋文字
  if (lastFeedback && frameCount < feedbackTimer) {
    textAlign(CENTER, CENTER);
    textSize(30);
    fill(255, 255, 0);
    stroke(0);
    strokeWeight(4);
    text(lastFeedback, width/2, height/2);
  }
}

function drawHUD() {
  let barH = 20;
  let margin = 20;
  
  // 玩家 HP (藍色)
  fill(COLORS.text);
  noStroke();
  textSize(16);
  textAlign(LEFT, BOTTOM);
  text(`勇者 HP: ${playerHP}/${MAX_PLAYER_HP}`, margin, margin + 30);
  
  fill(50);
  rect(margin, margin + 35, 150, barH); // 底
  fill(COLORS.player);
  rect(margin, margin + 35, 150 * (playerHP / MAX_PLAYER_HP), barH); // 血

  // 怪獸 HP (紅色)
  let mX = width - margin - 150;
  textAlign(RIGHT, BOTTOM);
  fill(COLORS.text);
  text(`怪獸 HP: ${monsterHP}/${MONSTER_MAX_HP}`, width - margin, margin + 30);
  
  fill(50);
  rect(mX, margin + 35, 150, barH);
  let mColor = getMonsterColor(currentLevel);
  fill(mColor);
  rect(mX, margin + 35, 150 * (monsterHP / MONSTER_MAX_HP), barH);
}

function getMonsterColor(lvl) {
  if(lvl == 2) return COLORS.monster2;
  if(lvl == 3) return COLORS.monster3;
  if(lvl == 4) return COLORS.monster4;
  return COLORS.monster;
}

function drawEntities() {
  // 簡單的幾何圖形代表角色
  let pX, pY, mX, mY, size;
  
  if (currentLayout === "portrait") {
    size = width * 0.2;
    pX = width * 0.25; pY = height * 0.65; // 勇者在左下
    mX = width * 0.75; mY = height * 0.25; // 怪獸在右上
  } else {
    size = height * 0.25;
    pX = width * 0.15; pY = height * 0.5;
    mX = width * 0.85; mY = height * 0.5;
  }

  // 勇者
  fill(COLORS.player);
  stroke(255);
  strokeWeight(3);
  rectMode(CENTER);
  rect(pX, pY, size, size, 10);
  fill(255); noStroke();
  textAlign(CENTER, CENTER); textSize(size*0.5); text("⚔️", pX, pY);

  // 怪獸
  let mColor = getMonsterColor(currentLevel);
  fill(mColor);
  stroke(255);
  rect(mX, mY, size * 1.2, size * 1.2, 20);
  fill(255); noStroke();
  text("🐲", mX, mY);
  
  rectMode(CORNER); // reset
}

function drawQuestionBoard() {
  // 根據 layout 決定題目板位置
  let qx, qy, qw, qh;
  
  if (currentLayout === "portrait") {
    qx = width * 0.05;
    qy = height * 0.35;
    qw = width * 0.9;
    qh = height * 0.25;
  } else {
    qx = width * 0.25;
    qy = height * 0.15;
    qw = width * 0.5;
    qh = height * 0.6;
  }

  fill(COLORS.uiBg);
  stroke(100);
  strokeWeight(2);
  rect(qx, qy, qw, qh, 15);

  // 顯示題目文字
  fill(COLORS.text);
  noStroke();
  textAlign(LEFT, TOP);
  
  let pad = 20;
  let content = currentQuestion.text;
  
  textSize(min(width, height) * 0.035); // 動態字體大小
  text(content, qx + pad, qy + pad, qw - pad*2, qh - pad*2);
}

function drawEndScreen() {
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  textAlign(CENTER, CENTER);
  if (gamePhase === "levelClear") {
    textSize(50); fill(50, 255, 50);
    text("🎉 討伐成功！", width/2, height * 0.4);
    textSize(20); fill(255);
    text("點擊任意處繼續...", width/2, height * 0.6);
  } else {
    textSize(50); fill(255, 50, 50);
    text("💀 勇者倒下了...", width/2, height * 0.4);
    textSize(20); fill(255);
    text("點擊任意處復活重試", width/2, height * 0.6);
  }
}

// ====== 邏輯控制 ======

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
  hideMenuUI();
  if (backBtn) backBtn.style.display = "block";
}

function startLevel(lvl) {
  currentLevel = lvl;
  playerHP = MAX_PLAYER_HP;
  monsterHP = MONSTER_MAX_HP;
  generateNewQuestion();
  gamePhase = "playing";
  if (answerPanel) answerPanel.style.display = "flex";
  if (answerInput) answerInput.value = "";
}

function generateNewQuestion() {
  // 核心數學題目生成
  let q = {};
  let P, r, t, n, A, I;
  
  // 隨機輔助
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  // 為了讓題目數字「漂亮」一點，我們盡量湊整
  if (currentLevel === 1) {
    // Lv1: 簡單利息 I = Prt
    P = rand(1, 50) * 1000; // 1000 - 50000
    r = rand(2, 10);        // 2% - 10%
    t = rand(1, 5);         // 1 - 5 年
    I = P * (r/100) * t;
    A = P + I;
    
    // 隨機問 I 或 A
    if (Math.random() > 0.5) {
      q.text = `[簡單利息]\n本金 $${P}\n年利率 ${r}%\n年期 ${t} 年\n\n求【利息】是多少？`;
      q.answer = I;
    } else {
      q.text = `[簡單利息]\n本金 $${P}\n年利率 ${r}%\n年期 ${t} 年\n\n求【本利和】是多少？`;
      q.answer = A;
    }
  } 
  else if (currentLevel === 2) {
    // Lv2: 年複利 A = P(1+r)^t
    P = rand(1, 20) * 2000;
    r = rand(3, 12);
    t = rand(2, 4);
    A = P * Math.pow(1 + r/100, t);
    
    q.text = `[複利 (每年)]\n本金 $${P}\n年利率 ${r}%\n年期 ${t} 年\n\n求【本利和】(四捨五入至整數)？`;
    q.answer = Math.round(A);
  }
  else if (currentLevel === 3) {
    // Lv3: 不同期複利
    P = rand(1, 10) * 5000;
    r = rand(4, 12); // rate per annum
    t = rand(1, 3);  // years
    
    let types = [
      { name: "半年", n: 2 },
      { name: "每季", n: 4 },
      { name: "每月", n: 12 },
      { name: "每日 (假設一年365日)", n: 365 } // 每日比較難，挑戰用
    ];
    let type = types[Math.floor(Math.random() * types.length)];
    n = type.n;
    
    A = P * Math.pow(1 + (r/100)/n, n*t);
    
    q.text = `[複利 (${type.name}計息)]\n本金 $${P}\n年利率 ${r}%\n年期 ${t} 年\n\n求【本利和】(四捨五入至整數)？`;
    q.answer = Math.round(A);
  }
  else if (currentLevel === 4) {
    // Lv4: 逆向問題 (Find P, r, t)
    // 混合簡單與複利
    let isCompound = Math.random() > 0.5;
    let target = Math.random(); // 0-0.33: Find P, 0.33-0.66: Find r, 0.66-1: Find t
    
    P = rand(1, 20) * 5000;
    r = rand(2, 10);
    t = rand(2, 5);
    
    if (!isCompound) {
      // Simple Interest Reverse
      I = P * (r/100) * t;
      A = P + I;
      
      if (target < 0.33) {
        // Find P
        q.text = `[簡單利息 - 求本金]\n利息 $${I}\n年利率 ${r}%\n年期 ${t} 年\n\n求【本金】(四捨五入至整數)？`;
        q.answer = Math.round(P);
      } else if (target < 0.66) {
        // Find r
        q.text = `[簡單利息 - 求利率]\n本金 $${P}\n利息 $${I}\n年期 ${t} 年\n\n求【年利率】(%)？`;
        q.answer = r; 
      } else {
        // Find t
        q.text = `[簡單利息 - 求年期]\n本金 $${P}\n利息 $${I}\n年利率 ${r}%\n\n求【年期】(年)？`;
        q.answer = t;
      }
    } else {
      // Compound Interest Reverse
      // 為了讓數字好算，先算出 A
      A = P * Math.pow(1 + r/100, t);
      let roundedA = Math.round(A); 
      // 注意：因為四捨五入 A，逆算回去可能會有誤差，我們允許誤差範圍
      
      if (target < 0.5) {
        // Find P (Most common in S3)
        q.text = `[複利 - 求本金]\n本利和 $${roundedA}\n年利率 ${r}%\n年期 ${t} 年\n\n求【本金】(四捨五入至整數)？`;
        q.answer = P; // 檢查時我們會允許 +/- 誤差
      } else {
        // Find r or t (Harder)
        // S3 學生通常用 Trial & Error 或是計算機暴力解
        // 為了避免太難，我們提示 "整數"
        if (Math.random() > 0.5) {
           // Find t
           q.text = `[複利 - 求年期]\n本金 $${P}\n本利和 $${roundedA}\n年利率 ${r}%\n\n求【年期】(整數年)？`;
           q.answer = t;
        } else {
           // Find r
           q.text = `[複利 - 求利率]\n本金 $${P}\n本利和 $${roundedA}\n年期 ${t} 年\n\n求【年利率】(整數%)？`;
           q.answer = r;
        }
      }
    }
  }
  
  currentQuestion = q;
}

// ====== 答案提交 ======
function submitTypedAnswer() {
  if (gamePhase !== "playing" || !currentQuestion) return;
  
  let val = parseFloat(answerInput.value.replace(/,/g, ''));
  if (isNaN(val)) {
    alert("請輸入數字！");
    return;
  }
  
  // 判斷對錯 (允許小誤差，特別是 Level 4 逆運算)
  let correct = currentQuestion.answer;
  let isCorrect = Math.abs(val - correct) <= 1; // 容許差 1
  
  // 如果是 Level 4 且是求利率/年期，且答案很小，容許誤差可能要小一點？
  // 但我們的設計是整數答案，所以 abs <= 0.5 其實就夠，<=1 很寬容
  
  if (isCorrect) {
    // 攻擊成功
    monsterHP--;
    lastFeedback = "🔥 攻擊命中！";
    shakeAmount = 5;
    if (monsterHP <= 0) {
      gamePhase = "levelClear";
      if (answerPanel) answerPanel.style.display = "none";
    } else {
      generateNewQuestion();
      answerInput.value = "";
    }
  } else {
    // 攻擊失敗，受傷
    playerHP--;
    lastFeedback = "💔 攻擊失誤！勇者受傷！\n正確答案: " + correct;
    shakeAmount = 20;
    if (playerHP <= 0) {
      gamePhase = "gameOver";
      if (answerPanel) answerPanel.style.display = "none";
    }
  }
  
  feedbackTimer = frameCount + 90; // 顯示 1.5 秒 (60fps * 1.5)
}

// ====== 互動事件 ======

function touchStarted() {
  handleInput(mouseX, mouseY);
  return false; // 避免 double tap zoom
}

function mousePressed() {
  handleInput(mouseX, mouseY);
}

function handleInput(x, y) {
  if (gamePhase === "chooseLevel") {
    // 簡單的按鈕點擊判定
    let levels = 4;
    let startY = currentLayout === "portrait" ? height * 0.25 : height * 0.2;
    let btnH = currentLayout === "portrait" ? height * 0.12 : height * 0.15;
    let gap = 15;
    let btnW = currentLayout === "portrait" ? width * 0.8 : width * 0.4;
    
    // 這裡要跟 drawLevelSelect 的座標邏輯一致
    if (currentLayout === "landscape") {
       for (let i = 0; i < levels; i++) {
        let col = i % 2;
        let row = Math.floor(i / 2);
        let bx = width * 0.3 + col * (btnW + gap);
        let by = startY + row * (btnH + gap);
        if (x > bx && x < bx + btnW && y > by && y < by + btnH) {
          startLevel(i + 1);
          return;
        }
      }
    } else {
      for (let i = 0; i < levels; i++) {
        let bx = width * 0.1;
        let by = startY + i * (btnH + gap);
        if (x > bx && x < bx + btnW && y > by && y < by + btnH) {
          startLevel(i + 1);
          return;
        }
      }
    }
  }
  else if (gamePhase === "levelClear" || gamePhase === "gameOver") {
    // 點擊任意處重置
    if (gamePhase === "levelClear" && currentLevel < 4) {
      startLevel(currentLevel + 1); // 下一關
    } else {
      // 回選單
      gamePhase = "chooseLevel"; 
      if (answerPanel) answerPanel.style.display = "none";
    }
  }
}

function goBackToMenu() {
  gamePhase = "menu";
  showMenuUI();
}

function showMenuUI() {
  if (layoutSelectDiv) layoutSelectDiv.style.display = "flex";
  if (backBtn) backBtn.style.display = "none";
  if (answerPanel) answerPanel.style.display = "none";
  if (calcPanel) calcPanel.style.display = "none";
}

function hideMenuUI() {
  if (layoutSelectDiv) layoutSelectDiv.style.display = "none";
}

// ====== 計算機邏輯 ======
function toggleCalculator() {
  calcVisible = !calcVisible;
  calcPanel.style.display = calcVisible ? "block" : "none";
}
function calcAppend(val) {
  calcExpression += val;
  updateCalcDisplay();
}
function calcClear() {
  calcExpression = "";
  updateCalcDisplay();
}
function calcBackspace() {
  calcExpression = calcExpression.slice(0, -1);
  updateCalcDisplay();
}
function updateCalcDisplay() {
  calcDisplay.textContent = calcExpression || "0";
}
function calcEvaluate() {
  try {
    // 替換符號以符合 JS 語法
    // 支援 log(x) -> Math.log10(x) 或 Math.log(x)? 通常學校用 log10
    // 這裡簡單實作把 log 換成 Math.log10
    let jsExpr = calcExpression
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/\^/g, "**")
      .replace(/log/g, "Math.log10"); 
      
    let res = eval(jsExpr); // 簡單 eval，注意安全性 (但在純前端小遊戲尚可)
    // 格式化顯示 (最多 4 位小數)
    if (!isNaN(res)) {
        let rounded = Math.round(res * 10000) / 10000;
        calcExpression = rounded.toString();
    } else {
        calcExpression = "Error";
    }
  } catch (e) {
    calcExpression = "Error";
  }
  updateCalcDisplay();
}
function calcFillAnswer() {
  answerInput.value = calcExpression;
  toggleCalculator();
}
