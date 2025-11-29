// main.js

let currentLayout = null;
let gamePhase = "menu";
let currentLevel = 1;

// 玩家數據
let playerHP = 5;
const MAX_HP = 5;
let monstersDefeated = 0;
const MONSTERS_PER_LEVEL = 5;

// 題目與關卡邏輯
let currentQuestion = null;
let questionBatch = []; // 儲存本關 5 題的類型序列

// 計算機記憶
let calcLastAns = 0; // 儲存上一次 Ans
let calcExpression = "";
let calcVisible = false;

// 視覺與動畫
let walkAnim = 0;
let isWalking = false;
let hurtFlash = 0;
let attackEffect = 0;

// DOM 參照
let layoutSelectDiv, backBtn, answerPanel, answerInput, calcPanel, calcDisplay;

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

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

function draw() {
  if (gamePhase === "menu") {
    background(0);
    // 簡單的網格背景
    stroke(30);
    for(let i=0; i<width; i+=50) line(i, 0, i, height);
    for(let i=0; i<height; i+=50) line(0, i, width, i);
    return;
  }

  // 偽 3D 場景
  drawFake3DWorld();

  // 怪物
  if (gamePhase === "playing" && !isWalking && currentQuestion) {
    drawMonster(width/2, height/2 + Math.sin(frameCount * 0.05) * 10);
  }

  // UI
  if (gamePhase === "playing") {
    drawHUD();
    if (!isWalking) drawQuestionBoard();
  }

  // 轉場特效
  if (isWalking) updateWalkAnimation();
  if (hurtFlash > 0) {
    fill(255, 0, 0, hurtFlash);
    noStroke();
    rect(0, 0, width, height);
    hurtFlash -= 10;
  }
  if (attackEffect > 0) {
    fill(255, 255, 255, attackEffect);
    noStroke();
    ellipse(width/2, height/2, width * (attackEffect/255));
    attackEffect -= 15;
  }

  // 結束畫面
  if (gamePhase === "gameOver" || gamePhase === "levelClear") {
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    textAlign(CENTER, CENTER);
    textSize(40);
    fill(gamePhase === "levelClear" ? "#4ade80" : "#f87171");
    text(gamePhase === "levelClear" ? "🏆 通關成功！" : "💀 挑戰失敗...", width/2, height * 0.4);
    textSize(20); fill(200);
    text("點擊畫面回到選單", width/2, height * 0.6);
  }
}

// ====== 關卡與題目生成 ======

function startLevel(lvl) {
  currentLevel = lvl;
  playerHP = MAX_HP;
  monstersDefeated = 0;
  
  // 預先生成本關 5 題的「題型」，確保分佈均勻
  generateQuestionBatch(lvl);
  
  gamePhase = "playing";
  isWalking = true;
  walkAnim = 0;
  
  if (answerPanel) answerPanel.style.display = "flex";
  answerInput.value = "";
}

function generateQuestionBatch(lvl) {
  questionBatch = [];
  
  if (lvl < 4) {
    // Lv1-3 都是求本利和 (FindA)
    for(let i=0; i<5; i++) questionBatch.push("FindA");
  } 
  else if (lvl === 4) {
    // Lv4: 簡單/複利混合，求 P, r, t (確保各出現一次)
    let types = ["FindP", "FindR", "FindT"];
    // 剩下 2 題隨機
    types.push(["FindP", "FindR", "FindT"][Math.floor(Math.random()*3)]);
    types.push(["FindP", "FindR", "FindT"][Math.floor(Math.random()*3)]);
    
    // 洗牌
    shuffleArray(types);
    questionBatch = types;
  }
  else if (lvl === 5) {
    // Lv5: 複雜複利，求 P, r, t
    let types = ["FindP", "FindR", "FindT"];
    types.push(["FindP", "FindR", "FindT"][Math.floor(Math.random()*3)]);
    types.push(["FindP", "FindR", "FindT"][Math.floor(Math.random()*3)]);
    shuffleArray(types);
    questionBatch = types;
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function generateNewQuestion() {
  // 從批次中取出一種類型
  let type = questionBatch[monstersDefeated];
  let q = {};
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // 參數生成
  let P = rand(1, 20) * 10000;
  let r = rand(3, 12);
  let t = rand(2, 6); // 年期
  
  // 根據關卡調整計算方式
  if (currentLevel === 1) {
    // 簡單利息
    let I = P * r * t / 100;
    q.text = `[Lv1 史萊姆] 簡單利息\nP=$${P}, r=${r}%, t=${t}年\n求單利息 I？`;
    q.answer = I;
  } 
  else if (currentLevel === 2) {
    // 年複利
    let A = Math.round(P * Math.pow(1 + r/100, t));
    q.text = `[Lv2 骷髏] 每年複利\nP=$${P}, r=${r}%, t=${t}年\n求本利和 A？`;
    q.answer = A;
  }
  else if (currentLevel === 3) {
    // 分期複利 (Find A)
    let n = Math.random() > 0.5 ? 12 : 4;
    let A = Math.round(P * Math.pow(1 + (r/100)/n, n*t));
    let period = n===12 ? "每月" : "每季";
    q.text = `[Lv3 石像鬼] ${period}複利\nP=$${P}, r=${r}%, t=${t}年\n求本利和 A？`;
    q.answer = A;
  }
  else if (currentLevel === 4) {
    // 簡單/複利混合，逆運算
    // 隨機決定這題是 Simple 還是 Compound
    let isSimple = Math.random() > 0.5;
    
    if (isSimple) {
      // I = Prt/100, A = P + I
      let I = P * r * t / 100;
      let A = P + I;
      
      if (type === "FindP") {
        q.text = `[Lv4 惡龍] 簡單利息\nI=$${I}, r=${r}%, t=${t}年\n求本金 P？`;
        q.answer = P;
      } else if (type === "FindR") {
        q.text = `[Lv4 惡龍] 簡單利息\nP=$${P}, I=$${I}, t=${t}年\n求利率 r (%)？`;
        q.answer = r;
      } else { // FindT
        q.text = `[Lv4 惡龍] 簡單利息\nP=$${P}, I=$${I}, r=${r}%\n求年期 t (年)？`;
        q.answer = t;
      }
    } else {
      // 複利 A = P(1+r%)^t
      let A = Math.round(P * Math.pow(1 + r/100, t));
      
      if (type === "FindP") {
        q.text = `[Lv4 惡龍] 每年複利\nA=$${A}, r=${r}%, t=${t}年\n求本金 P？`;
        q.answer = P;
      } else if (type === "FindR") {
        q.text = `[Lv4 惡龍] 每年複利\nP=$${P}, A=$${A}, t=${t}年\n求利率 r (%)？\n提示：利用 ˣ√`;
        q.answer = r;
      } else { // FindT
        q.text = `[Lv4 惡龍] 每年複利\nP=$${P}, A=$${A}, r=${r}%\n求年期 t (年)？`;
        q.answer = t;
      }
    }
  }
  else if (currentLevel === 5) {
    // Lv5: 複雜複利 A = P(1 + r/n)^(nt)
    // 隨機 n: 半年(2), 季(4), 月(12), 日(365)
    let options = [2, 4, 12, 365];
    let n = options[Math.floor(Math.random() * options.length)];
    let nName = {2:"半年", 4:"每季", 12:"每月", 365:"每日"}[n];
    
    // 重新微調參數避免數字太醜
    // 如果是每日，年期短一點
    if (n === 365) t = rand(1, 2);
    
    let A = Math.round(P * Math.pow(1 + (r/100)/n, n*t));
    
    if (type === "FindP") {
      q.text = `[Lv5 魔王] ${nName}複利\nA=$${A}, r=${r}%, t=${t}年\n求本金 P？`;
      q.answer = P;
    } else if (type === "FindR") {
      q.text = `[Lv5 魔王] ${nName}複利\nP=$${P}, A=$${A}, t=${t}年\n求年利率 r (%)？`;
      q.answer = r;
    } else { // FindT
      q.text = `[Lv5 魔王] ${nName}複利\nP=$${P}, A=$${A}, r=${r}%\n求年期 t (年)？`;
      q.answer = t;
    }
  }
  
  currentQuestion = q;
}

// ====== 3D 繪圖 (簡化版) ======
function drawFake3DWorld() {
  let bobY = isWalking ? Math.sin(walkAnim * 0.5) * 15 : 0;
  let h = height/2 + bobY;
  
  background(20);
  fill(40); noStroke();
  rect(0, h, width, height-h); // 地板
  
  // 盡頭
  let vw = width * 0.15, vh = height * 0.15;
  let vx = (width-vw)/2, vy = h - vh/2;
  
  // 牆壁透視線
  stroke(60); strokeWeight(2);
  line(0, 0, vx, vy);
  line(width, 0, vx+vw, vy);
  line(0, height, vx, vy+vh);
  line(width, height, vx+vw, vy+vh);
  
  fill(0); noStroke();
  rect(vx, vy, vw, vh);
}

function drawMonster(x, y) {
  // 根據關卡畫簡單怪獸圖示
  let s = 200;
  push(); translate(x, y);
  textAlign(CENTER, CENTER); textSize(s);
  if (currentLevel===1) text("💧", 0, 0);
  else if (currentLevel===2) text("💀", 0, 0);
  else if (currentLevel===3) text("👿", 0, 0);
  else if (currentLevel===4) text("🐲", 0, 0);
  else text("👹", 0, 0);
  pop();
}

// ====== 互動邏輯 ======

function submitTypedAnswer() {
  if (!currentQuestion || isWalking) return;
  let val = parseFloat(answerInput.value.replace(/,/g, ''));
  if (isNaN(val)) return;
  
  // 驗算：Lv4/Lv5 逆運算容許較大誤差 (因為 A 是四捨五入後的)
  // 如果是 P (本金)，誤差可容許 10 左右；如果是 r 或 t，容許 0.5
  let margin = 1;
  if (currentLevel >= 4) {
    // 簡單判斷：如果答案很大(>100)可能是本金，容許誤差大點
    if (currentQuestion.answer > 100) margin = 50; 
    else margin = 0.5;
  }
  
  if (Math.abs(val - currentQuestion.answer) <= margin) {
    monstersDefeated++;
    attackEffect = 255;
    if (monstersDefeated >= MONSTERS_PER_LEVEL) {
      gamePhase = "levelClear";
      answerPanel.style.display = "none";
    } else {
      isWalking = true; walkAnim = 0;
      currentQuestion = null;
      answerInput.value = "";
    }
  } else {
    playerHP--;
    hurtFlash = 150;
    if (playerHP <= 0) {
      gamePhase = "gameOver";
      answerPanel.style.display = "none";
    }
  }
}

function updateWalkAnimation() {
  walkAnim++;
  if (walkAnim > 40) {
    isWalking = false;
    generateNewQuestion();
  }
}

// ====== 計算機核心邏輯 ======

function toggleCalculator() {
  calcVisible = !calcVisible;
  calcPanel.style.display = calcVisible ? "block" : "none";
}

function calcAppend(val) {
  calcExpression += val;
  updateCalcDisplay();
}

function calcAppendAns() {
  calcExpression += "Ans";
  updateCalcDisplay();
}

function calcClear() { calcExpression = ""; updateCalcDisplay(); }
function calcBackspace() { calcExpression = calcExpression.slice(0, -1); updateCalcDisplay(); }

function updateCalcDisplay() {
  calcDisplay.textContent = calcExpression || "0";
}

function calcEvaluate() {
  try {
    let expr = calcExpression;
    
    // 1. 替換 Ans
    expr = expr.replace(/Ans/g, calcLastAns);
    
    // 2. 處理 Casio ˣ√ (例如 3ˣ√8 -> 8^(1/3))
    // 正則：找 (數字)ˣ√(數字)
    // 注意：簡單實作，不支援巢狀括號內的 ˣ√，只支援簡單數字或小數
    // 我們先處理 ˣ√，將 Aˣ√B 轉為 Math.pow(B, 1/A)
    // 這裡做一個簡單的替換：
    // 假設使用者輸入格式良好，例如 "3ˣ√8" 或 "(1+2)ˣ√8" 比較難解
    // 這裡採用簡單策略：把 ˣ√ 換成特殊的運算邏輯
    
    // 為了讓 eval 執行，我們先把常見符號換掉
    expr = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/\^/g, "**");
    expr = expr.replace(/log/g, "Math.log10");
    
    // 處理 ˣ√ : 找到 `a ˣ√ b` 模式
    // 由於 JS regex 不支援由右向左運算，我們簡單將 split
    if (expr.includes("ˣ√")) {
      let parts = expr.split("ˣ√");
      if (parts.length === 2) {
        // 假設只有一個 root 運算
        let root = parts[0];
        let base = parts[1];
        // 這裡假設 root 和 base 都是可 eval 的表達式
        expr = `Math.pow(${base}, 1/(${root}))`;
      }
    }
    
    let result = eval(expr);
    
    if (isFinite(result)) {
      calcLastAns = result; // 存入 Ans
      // 四捨五入顯示
      calcExpression = String(Math.round(result * 100000) / 100000);
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

// UI 選單控制 (覆蓋上一版)
function startPortraitLayout() { currentLayout = "portrait"; enterLevelSelect(); }
function startLandscapeLayout() { currentLayout = "landscape"; enterLevelSelect(); }

function enterLevelSelect() {
  gamePhase = "chooseLevel";
  layoutSelectDiv.style.display = "none";
}

// 覆寫 draw 處理選單
let _draw = draw;
draw = function() {
  if (gamePhase === "chooseLevel") {
    background(10);
    textAlign(CENTER); fill(255); textSize(30);
    text("選擇樓層", width/2, height*0.15);
    
    let btnH = height * 0.12;
    for(let i=1; i<=5; i++) {
      let y = height * 0.2 + (i-1)*(btnH + 10);
      fill(40); stroke(100); rect(width*0.1, y, width*0.8, btnH, 10);
      fill(255); noStroke();
      text(`Level ${i}`, width/2, y + btnH/2 + 8);
    }
    return;
  }
  _draw();
}

function mousePressed() { handleInput(mouseX, mouseY); }
function touchStarted() { handleInput(mouseX, mouseY); return false; }

function handleInput(x, y) {
  if (gamePhase === "chooseLevel") {
    let btnH = height * 0.12;
    for(let i=1; i<=5; i++) {
      let by = height * 0.2 + (i-1)*(btnH + 10);
      if (y > by && y < by + btnH) startLevel(i);
    }
  } else if (gamePhase === "gameOver" || gamePhase === "levelClear") {
    gamePhase = "chooseLevel"; answerPanel.style.display = "none";
  }
}

function drawHUD() {
  fill(0, 255, 0); textSize(16); textAlign(LEFT, TOP);
  text(`HP: ${playerHP}`, 20, 20);
  text(`LV: ${currentLevel}`, 80, 20);
}

function drawQuestionBoard() {
  let h = height * 0.35;
  fill(0,0,0,200); stroke(0,255,0); rect(width*0.05, height*0.1, width*0.9, h, 10);
  fill(255); noStroke(); textAlign(LEFT, TOP); textSize(18);
  if (currentQuestion) text(currentQuestion.text, width*0.08, height*0.12, width*0.84);
}

function goBackToMenu() {
  gamePhase = "menu";
  layoutSelectDiv.style.display = "flex";
  backBtn.style.display = "none";
  answerPanel.style.display = "none";
}
