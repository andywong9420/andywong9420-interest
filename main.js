// main.js
// -----------------------------------------------------------
// 這個檔案負責：
// - 建立 p5.js 畫布（全螢幕，隨視窗大小改變）
// - 控制遊戲狀態（選單、選關、作答、通關、失敗）
// - 區分直向（portrait）與橫向（landscape）兩種版面布局
// - 處理觸控與滑鼠點擊（touchStarted / mousePressed）
// - 控制 HTML 的答案輸入區與虛擬計算機
// -----------------------------------------------------------

// ====== DOM 元素參照：版面選擇畫面、返回按鈕、答案輸入區、計算機 ======
let layoutSelectDiv;      // HTML 中的版面選擇區塊
let backButtonElement;    // HTML 中的返回按鈕
let answerPanelElement;   // 下方答案輸入區
let answerInputElement;   // 答案輸入框
let calculatorPanel;      // 虛擬計算機整個面板
let calcDisplayElement;   // 計算機顯示區

// 計算機目前顯示的算式字串
let calcExpression = "";
let calcVisible = false;

// ====== 遊戲主要狀態變數 ======
let currentLayout = null; // "portrait" / "landscape" / null
let gamePhase = "menu";   // "menu" / "chooseLevel" / "playing" / "gameOver" / "levelClear"
let currentLevel = 1;     // 1, 2, 3

// 生命與關卡設定（老師可在這裡調整難度）
const MAX_HEALTH = 5;          // 每關生命數
const QUESTIONS_PER_LEVEL = 5; // 每次挑戰要答的題數
const POOL_SIZE_PER_LEVEL = 30;// 每一關預先產生的題目數（30 題題庫）

let health = MAX_HEALTH;
let score = 0;                 // 全部關卡的累積得分（答對題數）

// 題庫與當前題目狀態
let questionPools = {
  1: [],
  2: [],
  3: []
};
let questionOrder = [];        // 當前挑戰要用的題目索引（從題庫抽出的 5 題）
let questionIndexInRun = 0;    // 本輪目前是第幾題（0 ～ QUESTIONS_PER_LEVEL-1）
let currentQuestion = null;    // 目前顯示中的題目物件
let lastFeedback = "";         // "答對！" / "答錯了..." 等提示文字

// 方便調整 UI 用的顏色
const BG_COLOR = [15, 23, 42];
const CARD_COLOR = [30, 64, 175];
const CARD_ALT_COLOR = [22, 101, 52];
const TEXT_MAIN = [248, 250, 252];
const TEXT_SUB = [191, 219, 254];

// -----------------------------------------------------------
// p5.js 必要函式：setup() 只在載入時執行一次
// -----------------------------------------------------------
function setup() {
  // 建立與視窗同大小的畫布，適合手機與平板
  // windowWidth / windowHeight 會自動對應到瀏覽器可用區域。[web:21]
  let canvas = createCanvas(windowWidth, windowHeight);
  // 禁止在行動裝置上因為觸控而捲動或放大整個頁面，以免影響遊戲互動。[web:5]
  canvas.elt.style.touchAction = "none";

  // 取得 HTML 元素，控制顯示與隱藏
  layoutSelectDiv = document.getElementById("layout-select");
  backButtonElement = document.getElementById("backButton");
  answerPanelElement = document.getElementById("answer-panel");
  answerInputElement = document.getElementById("answerInput");
  calculatorPanel = document.getElementById("calculator-panel");
  calcDisplayElement = document.getElementById("calc-display");

  // 初始顯示為版面選擇畫面
  showMenuUI();

  textFont("system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft JhengHei', sans-serif");
  textAlign(CENTER, CENTER);

  // 建立三關的題庫（每關 30 題）
  buildAllQuestionPools();

  // 讓計算機顯示初始值
  updateCalcDisplay();
}

// -----------------------------------------------------------
// 當視窗大小改變時，自動調整畫布大小（保持全螢幕）[web:21]
// -----------------------------------------------------------
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// -----------------------------------------------------------
// p5.js 連續繪圖函式：每秒多次重畫畫面
// 根據 currentLayout 與 gamePhase 不同，畫出不同的版面
// -----------------------------------------------------------
function draw() {
  background(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);

  // 如果還在 HTML 選單畫面，就只畫一個淡淡背景
  if (gamePhase === "menu" || currentLayout === null) {
    drawMenuBackground();
    return;
  }

  if (currentLayout === "portrait") {
    drawPortraitLayout();
  } else if (currentLayout === "landscape") {
    drawLandscapeLayout();
  }
}

// ====== 畫面繪圖：背景與兩種版面共用的小工具 ======
function drawMenuBackground() {
  // 簡單的背景光暈，讓選單更有遊戲感
  noStroke();
  for (let r = Math.max(width, height); r > 0; r -= 40) {
    let alpha = map(r, 0, Math.max(width, height), 180, 0);
    fill(30, 64, 175, alpha);
    ellipse(width * 0.5, height * 0.3, r, r);
  }
}

// 共用的 HUD：關卡、生命、分數
function drawHUDTop(centeredForPortrait) {
  textAlign(LEFT, CENTER);
  textSize(Math.min(width, height) * 0.035);

  // 關卡與分數
  fill(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  let margin = 10;
  let lineH = textSize() + 2;

  text(`關卡：${currentLevel} / 3`, margin + 4, margin + lineH * 0.5);
  text(`分數：${score}`, margin + 4, margin + lineH * 1.5);

  // 生命（以小圓點代表）
  let cxStart = width - margin - 20;
  for (let i = 0; i < MAX_HEALTH; i++) {
    let filled = (i < health);
    if (filled) {
      fill(239, 68, 68);
    } else {
      noFill();
      stroke(148, 163, 184);
      strokeWeight(2);
    }
    ellipse(cxStart - i * 22, margin + lineH, 16, 16);
    noStroke();
  }

  // 回饋文字（答對／答錯）
  if (lastFeedback) {
    textAlign(CENTER, CENTER);
    fill(TEXT_SUB[0], TEXT_SUB[1], TEXT_SUB[2]);
    textSize(Math.min(width, height) * 0.03);
    let yPos = centeredForPortrait ? height * 0.78 : height * 0.9;
    text(lastFeedback, width * 0.5, yPos);
  }
}

// ====== 直向版面繪製 ======
function drawPortraitLayout() {
  if (gamePhase === "chooseLevel") {
    drawPortraitLevelSelect();
  } else if (gamePhase === "playing") {
    drawPortraitGameScreen();
  } else if (gamePhase === "gameOver") {
    drawPortraitGameOver();
  } else if (gamePhase === "levelClear") {
    drawPortraitLevelClear();
  }
}

// 直向：選關畫面（關卡 1～3）
function drawPortraitLevelSelect() {
  drawMenuBackground();
  textAlign(CENTER, CENTER);

  fill(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  textSize(Math.min(width, height) * 0.05);
  text("請選擇關卡", width * 0.5, height * 0.18);

  let btnW = width * 0.7;
  let btnH = height * 0.1;
  let startY = height * 0.32;
  let gap = btnH * 0.25;

  for (let lvl = 1; lvl <= 3; lvl++) {
    let y = startY + (lvl - 1) * (btnH + gap);
    drawButtonRect(width * 0.5 - btnW / 2, y, btnW, btnH,
      `第 ${lvl} 關`, lvl === 1 ? "簡單利息基礎" :
      lvl === 2 ? "簡單利息＋少量複利" :
      "複利為主（較難）");
  }

  textSize(Math.min(width, height) * 0.028);
  fill(TEXT_SUB[0], TEXT_SUB[1], TEXT_SUB[2]);
  text("提示：每關 5 題，5 點生命。可用下方答案欄輸入或開啟計算機。", width * 0.5, height * 0.8);
}

// 直向：遊戲作答畫面（題目＋提醒學生用下方答案區）
function drawPortraitGameScreen() {
  drawHUDTop(true);
  if (!currentQuestion) return;

  // 題目卡片
  let cardW = width * 0.85;
  let cardH = height * 0.34;
  let cardX = width * 0.5 - cardW / 2;
  let cardY = height * 0.18;

  drawQuestionCard(cardX, cardY, cardW, cardH, currentQuestion);

  // 題號顯示與提示
  textAlign(CENTER, CENTER);
  textSize(Math.min(width, height) * 0.03);
  fill(TEXT_SUB[0], TEXT_SUB[1], TEXT_SUB[2]);
  text(
    `第 ${questionIndexInRun + 1} 題 / 共 ${QUESTIONS_PER_LEVEL} 題  |  請用下方輸入答案或計算機`,
    width * 0.5,
    height * 0.55
  );
}

// 直向：失敗畫面
function drawPortraitGameOver() {
  drawMenuBackground();
  drawHUDTop(true);

  textAlign(CENTER, CENTER);
  fill(248, 113, 113);
  textSize(Math.min(width, height) * 0.06);
  text("挑戰失敗！", width * 0.5, height * 0.35);

  fill(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  textSize(Math.min(width, height) * 0.035);
  text(
    `第 ${currentLevel} 關還沒通過。\n輕觸螢幕任意位置重新挑戰本關。`,
    width * 0.5, height * 0.5
  );

  textSize(Math.min(width, height) * 0.028);
  fill(TEXT_SUB[0], TEXT_SUB[1], TEXT_SUB[2]);
  text("或按左上角「返回版面選擇」，改選版面再玩。", width * 0.5, height * 0.72);
}

// 直向：通關畫面
function drawPortraitLevelClear() {
  drawMenuBackground();
  drawHUDTop(true);

  textAlign(CENTER, CENTER);
  fill(52, 211, 153);
  textSize(Math.min(width, height) * 0.06);
  text(`恭喜通過第 ${currentLevel} 關！`, width * 0.5, height * 0.35);

  fill(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  textSize(Math.min(width, height) * 0.035);

  if (currentLevel < 3) {
    text(
      `你可以挑戰下一關（第 ${currentLevel + 1} 關）。\n輕觸螢幕任意位置繼續。`,
      width * 0.5, height * 0.5
    );
  } else {
    text(
      "已完成全部三關！\n輕觸螢幕任意位置重新挑戰第 3 關。",
      width * 0.5, height * 0.5
    );
  }

  textSize(Math.min(width, height) * 0.028);
  fill(TEXT_SUB[0], TEXT_SUB[1], TEXT_SUB[2]);
  text("也可以按左上角「返回版面選擇」，改選版面或給同學玩。", width * 0.5, height * 0.72);
}

// ====== 橫向版面繪製 ======
function drawLandscapeLayout() {
  if (gamePhase === "chooseLevel") {
    drawLandscapeLevelSelect();
  } else if (gamePhase === "playing") {
    drawLandscapeGameScreen();
  } else if (gamePhase === "gameOver") {
    drawLandscapeGameOver();
  } else if (gamePhase === "levelClear") {
    drawLandscapeLevelClear();
  }
}

// 橫向：選關畫面
function drawLandscapeLevelSelect() {
  drawMenuBackground();
  textAlign(CENTER, CENTER);

  fill(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  textSize(Math.min(width, height) * 0.055);
  text("請選擇關卡", width * 0.3, height * 0.25);

  textSize(Math.min(width, height) * 0.03);
  fill(TEXT_SUB[0], TEXT_SUB[1], TEXT_SUB[2]);
  text(
    "左邊為說明區，右邊為關卡按鈕。\n作答時使用下方答案輸入區與計算機。",
    width * 0.3, height * 0.48
  );

  let btnW = width * 0.32;
  let btnH = height * 0.18;
  let startX = width * 0.6;
  let startY = height * 0.2;
  let gap = height * 0.04;

  for (let lvl = 1; lvl <= 3; lvl++) {
    let x = startX;
    let y = startY + (lvl - 1) * (btnH + gap);
    drawButtonRect(x, y, btnW, btnH,
      `第 ${lvl} 關`,
      lvl === 1 ? "簡單利息基礎" :
      lvl === 2 ? "簡單利息＋少量複利" :
      "複利為主（較難）");
  }
}

// 橫向：遊戲作答畫面
function drawLandscapeGameScreen() {
  drawHUDTop(false);
  if (!currentQuestion) return;

  // 左側題目區
  let cardW = width * 0.5;
  let cardH = height * 0.65;
  let cardX = width * 0.05;
  let cardY = height * 0.18;

  drawQuestionCard(cardX, cardY, cardW, cardH, currentQuestion);

  // 右側提示區
  textAlign(CENTER, TOP);
  textSize(Math.min(width, height) * 0.03);
  fill(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  text(
    `第 ${questionIndexInRun + 1} 題 / 共 ${QUESTIONS_PER_LEVEL} 題\n\n請在下方輸入本利和，\n可按「開啟計算機」輔助計算（支援乘方）。`,
    width * 0.75,
    height * 0.28
  );
}

// 橫向：失敗畫面
function drawLandscapeGameOver() {
  drawMenuBackground();
  drawHUDTop(false);

  textAlign(CENTER, CENTER);
  fill(248, 113, 113);
  textSize(Math.min(width, height) * 0.055);
  text("挑戰失敗！", width * 0.3, height * 0.35);

  fill(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  textSize(Math.min(width, height) * 0.03);
  text(
    `第 ${currentLevel} 關尚未通過。\n輕觸螢幕重新挑戰同一關。`,
    width * 0.3, height * 0.55
  );

  textSize(Math.min(width, height) * 0.028);
  fill(TEXT_SUB[0], TEXT_SUB[1], TEXT_SUB[2]);
  text("右上角「返回版面選擇」可改用直向或橫向版面。", width * 0.3, height * 0.72);
}

// 橫向：通關畫面
function drawLandscapeLevelClear() {
  drawMenuBackground();
  drawHUDTop(false);

  textAlign(CENTER, CENTER);
  fill(52, 211, 153);
  textSize(Math.min(width, height) * 0.055);
  text(`恭喜通過第 ${currentLevel} 關！`, width * 0.3, height * 0.35);

  fill(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  textSize(Math.min(width, height) * 0.03);

  if (currentLevel < 3) {
    text(
      `可以繼續挑戰第 ${currentLevel + 1} 關。\n輕觸螢幕任意位置繼續。`,
      width * 0.3, height * 0.55
    );
  } else {
    text(
      "已完成全部三關！\n輕觸螢幕任意位置重新挑戰第 3 關。",
      width * 0.3, height * 0.55
    );
  }

  textSize(Math.min(width, height) * 0.028);
  fill(TEXT_SUB[0], TEXT_SUB[1], TEXT_SUB[2]);
  text("也可按左上角「返回版面選擇」，改選版面或給同學接力玩。", width * 0.3, height * 0.75);
}

// ====== 共用繪圖元件：題目卡片與按鈕 ======
function drawQuestionCard(x, y, w, h, q) {
  // 題目背景卡片
  noStroke();
  fill(CARD_COLOR[0], CARD_COLOR[1], CARD_COLOR[2], 230);
  rect(x, y, w, h, 18);

  // 題目文字
  fill(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  textAlign(LEFT, TOP);

  let padding = w * 0.08;
  let baseX = x + padding;
  let baseY = y + padding;
  let availableW = w - padding * 2;

  let sizeTitle = Math.min(width, height) * 0.035;
  let sizeBody = Math.min(width, height) * 0.03;

  textSize(sizeTitle);
  let typeLabel = q.type === "simple" ? "簡單利息" : "複利";
  text(`[${typeLabel}] 第 ${currentLevel} 關`, baseX, baseY);

  textSize(sizeBody);
  let line1 = `本金：$${q.principal}`;
  let line2 = `年利率：${q.rate}%`;
  let line3 = `年期：${q.years} 年`;
  let line4 = `題目：求最後的本利和（四捨五入至最接近整數）。`;

  let lh = sizeBody * 1.4;
  text(line1, baseX, baseY + sizeTitle * 1.6, availableW, lh);
  text(line2, baseX, baseY + sizeTitle * 1.6 + lh, availableW, lh);
  text(line3, baseX, baseY + sizeTitle * 1.6 + lh * 2, availableW, lh);
  text(line4, baseX, baseY + sizeTitle * 1.6 + lh * 3, availableW, lh * 2);
}

// 通用「矩形按鈕」繪製，用於選關按鈕
function drawButtonRect(x, y, w, h, title, sub) {
  noStroke();
  fill(CARD_ALT_COLOR[0], CARD_ALT_COLOR[1], CARD_ALT_COLOR[2], 235);
  rect(x, y, w, h, 16);

  textAlign(CENTER, CENTER);
  fill(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  textSize(Math.min(width, height) * 0.035);
  text(title, x + w / 2, y + h * 0.35);

  textSize(Math.min(width, height) * 0.028);
  fill(TEXT_SUB[0], TEXT_SUB[1], TEXT_SUB[2]);
  text(sub, x + w / 2, y + h * 0.7);
}

// ====== 題目生成與題庫建構 ======
// 老師如要調整難度，可以修改以下 generateQuestionForLevel() 內的金額、利率與年期範圍。
function buildAllQuestionPools() {
  for (let lvl = 1; lvl <= 3; lvl++) {
    questionPools[lvl] = [];
    for (let i = 0; i < POOL_SIZE_PER_LEVEL; i++) {
      questionPools[lvl].push(generateQuestionForLevel(lvl));
    }
  }
}

function generateQuestionForLevel(level) {
  // 使用原生 Math.random()，不依賴 p5.js random()
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  let principal, rate, years, type;
  if (level === 1) {
    type = "simple";               // 第一關只做簡單利息
    principal = randInt(1000, 9000) * 10; // 1 萬以下
    rate = randInt(2, 8);          // 2% ~ 8%
    years = randInt(1, 3);         // 1~3 年
  } else if (level === 2) {
    type = Math.random() < 0.6 ? "simple" : "compound";
    principal = randInt(3000, 20000) * 10;
    rate = randInt(2, 8);
    years = randInt(1, 4);
  } else {
    type = "compound";             // 第三關以複利為主
    principal = randInt(5000, 30000) * 10;
    rate = randInt(3, 10);
    years = randInt(2, 5);
  }

  let r = rate / 100;
  let amount;
  if (type === "simple") {
    let interest = Math.round(principal * r * years);
    amount = principal + interest;
  } else {
    // 使用乘方運算子 ** 或 Math.pow() 計算複利[web:30][web:28]
    amount = Math.round(principal * Math.pow(1 + r, years));
  }

  // 這裡仍保留選項產生，用於未來如要改回選擇題可以直接使用
  let options = makeOptionsAround(amount);
  return { level, type, principal, rate, years, amount, options };
}

// 產生含正確答案在內的三個選項（目前遊戲流程改為輸入題，但保留此功能供老師備用）
function makeOptionsAround(correct) {
  let opts = [correct];
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  while (opts.length < 3) {
    let offset = randInt(5, 25) * 100;   // 相差 500～2500 元
    let sign = Math.random() < 0.5 ? -1 : 1;
    let candidate = correct + sign * offset;
    if (candidate > 0 && !opts.includes(candidate)) {
      opts.push(candidate);
    }
  }

  // 打亂順序
  for (let i = opts.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

// 開始某一關卡前，從題庫中抽出 QUESTIONS_PER_LEVEL 題
function prepareRunForLevel(level) {
  let pool = questionPools[level];
  let used = new Set();
  questionOrder = [];

  while (questionOrder.length < QUESTIONS_PER_LEVEL && used.size < pool.length) {
    let idx = Math.floor(Math.random() * pool.length);
    if (!used.has(idx)) {
      used.add(idx);
      questionOrder.push(idx);
    }
  }

  questionIndexInRun = 0;
  health = MAX_HEALTH;
  lastFeedback = "";
  if (answerInputElement) answerInputElement.value = "";
  loadCurrentQuestion();
}

function loadCurrentQuestion() {
  let pool = questionPools[currentLevel];
  let idx = questionOrder[questionIndexInRun];
  currentQuestion = pool[idx];
}

// ====== 遊戲流程控制 ======
function startLevel(level) {
  currentLevel = level;
  prepareRunForLevel(level);
  gamePhase = "playing";
}

// 重新挑戰同一關
function restartCurrentLevel() {
  prepareRunForLevel(currentLevel);
  gamePhase = "playing";
}

// 處理一個數值型答案（已經四捨五入）
function checkNumericAnswer(roundedValue) {
  if (!currentQuestion || gamePhase !== "playing") return;

  if (roundedValue === currentQuestion.amount) {
    score++;
    lastFeedback = "答對！加油～";
  } else {
    health--;
    lastFeedback = `答錯了，正確本利和是 $${currentQuestion.amount}。`;
  }

  // 檢查是否死亡
  if (health <= 0) {
    gamePhase = "gameOver";
    return;
  }

  // 下一題或本關結束
  questionIndexInRun++;
  if (questionIndexInRun >= QUESTIONS_PER_LEVEL) {
    gamePhase = "levelClear";
  } else {
    if (answerInputElement) answerInputElement.value = "";
    loadCurrentQuestion();
  }
}

// 通關後，決定下一步
function proceedAfterLevelClear() {
  if (currentLevel < 3) {
    // 自動跳下一關
    startLevel(currentLevel + 1);
  } else {
    // 第 3 關結束後，再玩一次第 3 關
    startLevel(3);
  }
}

// ====== 觸控與滑鼠事件處理 ======
// 在手機／平板上，p5.js 會在觸控時更新 mouseX / mouseY，
// touchStarted() 會被自動呼叫，更適合處理行動裝置的點擊動作。[web:21][web:25]
function touchStarted() {
  handleTap(mouseX, mouseY);
  return false; // 阻止部分預設行為（例如雙指縮放）
}

// 讓桌機使用滑鼠時，也可以同樣邏輯處理
function mousePressed() {
  handleTap(mouseX, mouseY);
}

// 依照當前 gamePhase 解析點擊位置屬於哪個按鈕或畫面
function handleTap(px, py) {
  if (gamePhase === "menu" || currentLayout === null) {
    // HTML 選單畫面時，由 HTML 按鈕處理，不在畫布上處理
    return;
  }

  if (gamePhase === "chooseLevel") {
    let lvl = hitTestLevelButtons(px, py);
    if (lvl !== null) {
      startLevel(lvl);
    }
    return;
  }

  // playing 階段改由 HTML 的「提交答案」按鈕處理，不在畫布上偵測點擊

  if (gamePhase === "gameOver") {
    // 失敗畫面：任何點擊重新挑戰同一關
    restartCurrentLevel();
    return;
  }

  if (gamePhase === "levelClear") {
    // 通關畫面：任何點擊前往下一關或重玩第 3 關
    proceedAfterLevelClear();
    return;
  }
}

// 命中測試：選關按鈕
function hitTestLevelButtons(px, py) {
  if (currentLayout === "portrait") {
    let btnW = width * 0.7;
    let btnH = height * 0.1;
    let startY = height * 0.32;
    let gap = btnH * 0.25;
    let x = width * 0.5 - btnW / 2;

    for (let lvl = 1; lvl <= 3; lvl++) {
      let y = startY + (lvl - 1) * (btnH + gap);
      if (pointInRect(px, py, x, y, btnW, btnH)) return lvl;
    }
  } else {
    let btnW = width * 0.32;
    let btnH = height * 0.18;
    let startX = width * 0.6;
    let startY = height * 0.2;
    let gap = height * 0.04;

    for (let lvl = 1; lvl <= 3; lvl++) {
      let x = startX;
      let y = startY + (lvl - 1) * (btnH + gap);
      if (pointInRect(px, py, x, y, btnW, btnH)) return lvl;
    }
  }
  return null;
}

function pointInRect(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

// ====== HTML 與 p5 的互動：版面選擇與返回按鈕 ======
// 這些函式會被 index.html 裡的按鈕 onclick 呼叫

// 開始直向模式
function startPortraitLayout() {
  currentLayout = "portrait";
  gamePhase = "chooseLevel";
  hideMenuUI();
}

// 開始橫向模式
function startLandscapeLayout() {
  currentLayout = "landscape";
  gamePhase = "chooseLevel";
  hideMenuUI();
}

// 返回版面選擇畫面（Back 按鈕）
function goBackToMenu() {
  // 重設主要狀態
  currentLayout = null;
  gamePhase = "menu";
  currentLevel = 1;
  health = MAX_HEALTH;
  currentQuestion = null;
  questionOrder = [];
  questionIndexInRun = 0;
  lastFeedback = "";
  if (answerInputElement) answerInputElement.value = "";
  calcExpression = "";
  updateCalcDisplay();
  calcVisible = false;
  if (calculatorPanel) calculatorPanel.style.display = "none";

  showMenuUI();
}

// 顯示 HTML 選單，隱藏返回按鈕與答案輸入區
function showMenuUI() {
  if (layoutSelectDiv) layoutSelectDiv.style.display = "flex";
  if (backButtonElement) backButtonElement.style.display = "none";
  if (answerPanelElement) answerPanelElement.style.display = "none";
}

// 隱藏 HTML 選單，顯示返回按鈕與答案輸入區
function hideMenuUI() {
  if (layoutSelectDiv) layoutSelectDiv.style.display = "none";
  if (backButtonElement) backButtonElement.style.display = "block";
  if (answerPanelElement) answerPanelElement.style.display = "flex";
}

// ====== 答案輸入與提交邏輯（由 HTML 按鈕呼叫） ======
function submitTypedAnswer() {
  if (gamePhase !== "playing" || !currentQuestion || !answerInputElement) return;

  let raw = answerInputElement.value.trim();
  if (!raw) {
    lastFeedback = "請先輸入答案。";
    return;
  }

  // 允許輸入千位分隔逗號
  raw = raw.replace(/,/g, "");
  let num = parseFloat(raw);
  if (!isFinite(num)) {
    lastFeedback = "請輸入有效的數字。";
    return;
  }

  // 題目要求四捨五入至最接近整數
  let rounded = Math.round(num);
  checkNumericAnswer(rounded);
}

// ====== 虛擬計算機邏輯 ======
// 老師可以提醒學生：使用 ^ 作為乘方運算子，例如 10000*(1+0.05)^3
function toggleCalculator() {
  if (!calculatorPanel) return;
  calcVisible = !calcVisible;
  calculatorPanel.style.display = calcVisible ? "flex" : "none";
}

function updateCalcDisplay() {
  if (!calcDisplayElement) return;
  calcDisplayElement.textContent = calcExpression || "0";
}

function calcAppend(token) {
  calcExpression += token;
  updateCalcDisplay();
}

function calcClear() {
  calcExpression = "";
  updateCalcDisplay();
}

function calcBackspace() {
  if (!calcExpression) return;
  calcExpression = calcExpression.slice(0, -1);
  updateCalcDisplay();
}

// 計算機按「＝」時計算結果：
// 1. 把 ÷ 換成 /，× 換成 *
// 2. 把 ^ 換成 **（JS 的冪次運算子）[web:28]
// 3. 用 Function 包裝做簡單計算
function calcEvaluate() {
  if (!calcExpression) return;

  let expr = calcExpression.replace(/÷/g, "/").replace(/×/g, "*");
  // 只允許數字、小數點、加減乘除、括號與乘方符號，避免任意程式碼
  let safe = expr.replace(/[^0-9+\-*/.^() ]/g, "");
  safe = safe.replace(/\^/g, "**");

  let result = null;
  try {
    // 使用 Function 而不是直接 eval，並在 strict 模式下運算[web:28]
    // 只處理算術運算，不允許變數與其他語法。
    // eslint-disable-next-line no-new-func
    result = Function('"use strict";return (' + safe + ")")();
  } catch (e) {
    result = null;
  }

  if (typeof result === "number" && isFinite(result)) {
    // 限制顯示位數，避免太長
    let rounded = Math.round(result * 1000000) / 1000000;
    calcExpression = String(rounded);
  } else {
    calcExpression = "";
  }
  updateCalcDisplay();
}

// 把計算機上的結果填入答案輸入框，然後關閉計算機
function calcFillAnswer() {
  if (!answerInputElement) return;
  if (!calcExpression) return;
  answerInputElement.value = calcExpression;
  toggleCalculator();
}
