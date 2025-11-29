// =================== 基本 Canvas 設定 ===================

// 取得 Canvas 與 2D 畫圖 context（Canvas API 原生用法）
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // 使用 2D 繪圖 API

// 其他 DOM 元素
const menu = document.getElementById('menu');
const gameContainer = document.getElementById('game-container');
const backBtn = document.getElementById('backBtn');
const portraitBtn = document.getElementById('portraitBtn');
const landscapeBtn = document.getElementById('landscapeBtn');

const levelText = document.getElementById('levelText');
const healthText = document.getElementById('healthText');
const comboText = document.getElementById('comboText');
const storyText = document.getElementById('storyText');
const questionText = document.getElementById('questionText');
const answerArea = document.getElementById('answerArea');
const answerInput = document.getElementById('answerInput');
const calcToggleBtn = document.getElementById('calcToggleBtn');
const submitBtn = document.getElementById('submitBtn');
const bossChoices = document.getElementById('bossChoices');
const planABtn = document.getElementById('planABtn');
const planBBtn = document.getElementById('planBBtn');
const feedbackText = document.getElementById('feedbackText');

const calculator = document.getElementById('calculator');
const calcExpressionDiv = document.getElementById('calc-expression');
const calcResultDiv = document.getElementById('calc-result');
const calcButtonsContainer = document.getElementById('calc-buttons');
const calcUseBtn = document.getElementById('calcUseBtn');

const redFlash = document.getElementById('redFlash');

// =================== 遊戲整體狀態 ===================

let currentState = 'menu';         // 'menu' 或 'game'
let orientationMode = 'portrait';  // 'portrait' 或 'landscape'
let running = false;               // 是否在跑 gameLoop

// 遊戲進度
const MAX_LEVEL = 3;
const QUESTIONS_PER_LEVEL = 5;
const MAX_HEALTH = 5;

let currentLevel = 1;
let currentHealth = MAX_HEALTH;
let currentQuestionIndex = 0;
let currentQuestion = null;
let score = 0;

// Combo / Fever 模式
let streak = 0;         // 連續答對數
let feverReady = false; // 達到 3 連擊，下一題啟動雙倍攻擊
let feverActive = false;

// 偽 3D 動畫相關
let attackAnimating = false;
let attackTimer = 0;
const ATTACK_DURATION = 0.6; // 秒
let gridOffset = 0;

// 粒子特效（怪物死亡時的彩色方塊）
const particles = [];

// Canvas 內部的「指標」狀態（用來統一 mouse / touch）
const pointer = {
  x: 0,
  y: 0,
  isDown: false
};

// =================== 螢幕大小與 Canvas 自適應 ===================

/**
 * 依據視窗大小設定 canvas 寬高
 * Canvas 使用實際像素繪圖，讓畫面保持清晰
 */
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);

// =================== Mouse & Touch 事件整合 ===================

/**
 * 將滑鼠事件座標轉成畫布上的座標
 */
function updatePointerFromMouse(e) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = e.clientX - rect.left;
  pointer.y = e.clientY - rect.top;
}

/**
 * 將觸控事件座標轉成畫布上的座標
 * 並使用 preventDefault() 避免瀏覽器捲動與縮放
 */
function updatePointerFromTouch(e) {
  e.preventDefault(); // 阻止瀏覽器預設行為，避免畫面捲動
  const touch = e.touches[0] || e.changedTouches[0];
  if (!touch) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = touch.clientX - rect.left;
  pointer.y = touch.clientY - rect.top;
}

// 滑鼠事件
canvas.addEventListener('mousedown', (e) => {
  pointer.isDown = true;
  updatePointerFromMouse(e);
});

canvas.addEventListener('mousemove', (e) => {
  if (!pointer.isDown) return;
  updatePointerFromMouse(e);
});

canvas.addEventListener('mouseup', (e) => {
  pointer.isDown = false;
  updatePointerFromMouse(e);
});

// 觸控事件
canvas.addEventListener('touchstart', (e) => {
  pointer.isDown = true;
  updatePointerFromTouch(e);
});

canvas.addEventListener('touchmove', (e) => {
  if (!pointer.isDown) return;
  updatePointerFromTouch(e);
});

canvas.addEventListener('touchend', (e) => {
  pointer.isDown = false;
  updatePointerFromTouch(e);
});

// =================== 版面＆狀態切換（Menu <-> Game） ===================

portraitBtn.addEventListener('click', () => {
  orientationMode = 'portrait';
  startGame(false);
});

landscapeBtn.addEventListener('click', () => {
  orientationMode = 'landscape';
  startGame(false);
});

backBtn.addEventListener('click', () => {
  stopGame();
  showMenu();
});

/**
 * 顯示主選單
 */
function showMenu() {
  currentState = 'menu';
  menu.classList.remove('hidden');
  gameContainer.classList.add('hidden');
  // 清除 Fever 邊框／Shake 動畫
  gameContainer.classList.remove('fever-border', 'shake');
}

/**
 * 開始遊戲（若 loadSaved = true 則維持原本進度）
 */
function startGame(loadSaved) {
  currentState = 'game';
  menu.classList.add('hidden');
  gameContainer.classList.remove('hidden');

  // 標記直向或橫向，讓 CSS 可以有不同的 HUD 排列
  gameContainer.classList.toggle('portrait', orientationMode === 'portrait');
  gameContainer.classList.toggle('landscape', orientationMode === 'landscape');

  resizeCanvas();

  // 如非載入舊進度，重設數值
  if (!loadSaved) {
    currentLevel = 1;
    currentHealth = MAX_HEALTH;
    currentQuestionIndex = 0;
    score = 0;
    streak = 0;
    feverReady = false;
    feverActive = false;
  }

  loadNextQuestion();
  updateHUD();

  running = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

/**
 * 停止 gameLoop（回選單時用）
 */
function stopGame() {
  running = false;
}

// =================== localStorage 存檔／讀檔 ===================

const SAVE_KEY = 'interestWarriorSave_v1';

/**
 * 將目前進度存進 localStorage
 */
function saveProgress() {
  try {
    const data = {
      currentLevel,
      currentHealth,
      currentQuestionIndex,
      score,
      streak,
      feverReady
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    // 若瀏覽器禁用 storage，這裡就安靜失敗即可
  }
}

/**
 * 從 localStorage 讀取進度，若不存在則回傳 null
 */
function loadProgressFromStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * 啟動時檢查有沒有存檔
 */
window.addEventListener('load', () => {
  resizeCanvas();

  const data = loadProgressFromStorage();
  if (data) {
    const cont = window.confirm('偵測到上次遊戲進度，是否繼續？');
    if (cont) {
      currentLevel = data.currentLevel;
      currentHealth = data.currentHealth;
      currentQuestionIndex = data.currentQuestionIndex;
      score = data.score;
      streak = data.streak;
      feverReady = data.feverReady;
      orientationMode = 'portrait'; // 預設直向開始，可讓學生重新選一次
      startGame(true);
      return;
    }
  }
  showMenu();
});

// =================== 題目產生（簡化版題庫） ===================

/**
 * 在香港中三程度：金額四捨五入到 2 位小數
 */
function roundMoney(x) {
  return Math.round(x * 100) / 100;
}

/**
 * 產生關卡題目
 * level: 1 = 單利, 2 = 年複利, 3 = 多種複利（半年／季度／月／日）
 * index: 第幾題（0~4），index === 4 時當作 Boss 題（方案比較）
 */
function generateQuestion(level, index) {
  const isBoss = (index === QUESTIONS_PER_LEVEL - 1);
  const P = Math.floor(1000 + Math.random() * 9000); // 1000 - 9999
  const r = [2, 2.5, 3, 3.5, 4, 4.5][Math.floor(Math.random() * 6)]; // %
  const t = [1, 2, 3, 4, 5][Math.floor(Math.random() * 5)]; // 年

  // 日常情境
  const contexts = [
    `你把 $${P} 的利是錢存入銀行。`,
    `你想在 ${t} 年後買新手機，把 $${P} 存進銀行。`,
    `你打工賺到 $${P}，打算存 ${t} 年再用。`,
    `你準備買 PS5 Pro，先把 $${P} 存在銀行 ${t} 年。`,
    `你中獎得到 $${P}，暫時不花，放在銀行生利息。`
  ];
  const contextText = contexts[Math.floor(Math.random() * contexts.length)];

  if (isBoss) {
    // Boss 題：方案比較（Plan A: 單利, Plan B: 複利）
    const rateA = r;
    const rateB = r - 0.5; // 稍低利率的複利
    const interestA = roundMoney(P * (rateA / 100) * t);
    const amountA = roundMoney(P + interestA);
    const amountB = roundMoney(P * Math.pow(1 + rateB / 100, t));
    const interestB = roundMoney(amountB - P);
    const correctPlan = amountA > amountB ? 'A' : 'B';

    const text = `Boss 題：\n方案 A：${rateA}% 單利\n方案 B：${rateB}% 複利\n${t} 年後哪個計劃賺得較多利息？`;
    const explanation = `方案 A 最終金額約為 $${amountA}，方案 B 約為 $${amountB}，所以 ${correctPlan} 計劃較好。`;

    return {
      type: 'bossComparison',
      context: contextText,
      text,
      correctPlan,
      interestA,
      interestB,
      amountA,
      amountB,
      explanation
    };
  }

  // 一般題型：問利息或總額
  const askInterest = Math.random() < 0.5;
  let questionText = '';
  let correctValue = 0;
  let explanation = '';
  let freqLabel = '每年一次';

  if (level === 1) {
    // 單利 I = Prt
    const I = roundMoney(P * (r / 100) * t);
    const A = roundMoney(P + I);
    if (askInterest) {
      questionText = `銀行提供年利率 ${r}% 的單利，存 ${t} 年，\n請計算賺到多少利息（I）。`;
      correctValue = I;
      explanation = `單利 I = P × r × t = ${P} × ${r}% × ${t} 年 ≈ $${I}。`;
    } else {
      questionText = `銀行提供年利率 ${r}% 的單利，存 ${t} 年，\n請計算最後本利和（A）。`;
      correctValue = A;
      explanation = `先算單利 I ≈ $${I}，再加上本金 $${P}，所以本利和 A ≈ $${A}。`;
    }
    return {
      type: 'simpleInterest',
      context: contextText,
      text: questionText,
      P, r, t,
      correctValue,
      explanation
    };
  }

  if (level === 2) {
    // 年複利 A = P(1 + r)^t
    const A = roundMoney(P * Math.pow(1 + r / 100, t));
    const I = roundMoney(A - P);
    if (askInterest) {
      questionText = `銀行提供年利率 ${r}% 的年複利，存 ${t} 年，\n請計算賺到多少利息（I）。`;
      correctValue = I;
      explanation = `先算本利和 A = P(1 + r)^t ≈ $${A}，再減去本金 $${P}，利息約 $${I}。`;
    } else {
      questionText = `銀行提供年利率 ${r}% 的年複利，存 ${t} 年，\n請計算最後本利和（A）。`;
      correctValue = A;
      explanation = `套用 A = P(1 + r)^t = ${P}(1 + ${r}% )^${t} ≈ $${A}。`;
    }
    return {
      type: 'compoundYearly',
      context: contextText,
      text: questionText,
      P, r, t,
      correctValue,
      explanation
    };
  }

  if (level === 3) {
    // 多種複利頻率
    const freqOptions = [
      { label: '半年複利', m: 2 },
      { label: '每季複利', m: 4 },
      { label: '每月複利', m: 12 },
      { label: '每日複利', m: 365 }
    ];
    const chosen = freqOptions[Math.floor(Math.random() * freqOptions.length)];
    const m = chosen.m;
    freqLabel = chosen.label;

    const A = roundMoney(P * Math.pow(1 + (r / 100) / m, m * t));
    const I = roundMoney(A - P);

    if (askInterest) {
      questionText = `銀行提供年利率 ${r}% ，${freqLabel}，存 ${t} 年，\n請計算賺到多少利息（I）。`;
      correctValue = I;
      explanation = `套用 A = P(1 + r/m)^(m×t) ≈ $${A}，再減去本金 $${P}，利息約 $${I}。`;
    } else {
      questionText = `銀行提供年利率 ${r}% ，${freqLabel}，存 ${t} 年，\n請計算最後本利和（A）。`;
      correctValue = A;
      explanation = `A = P(1 + r/m)^(m×t) = ${P}(1 + ${r}% / ${m})^(${m}×${t}) ≈ $${A}。`;
    }
    return {
      type: 'compoundFreq',
      context: contextText,
      text: questionText,
      P, r, t, m, freqLabel,
      correctValue,
      explanation
    };
  }

  // 預防性回傳
  return null;
}

// =================== HUD 更新 ===================

function updateHUD() {
  levelText.textContent = `關卡：${currentLevel}/${MAX_LEVEL}`;
  healthText.textContent = `血量：${currentHealth}/${MAX_HEALTH}`;

  if (feverReady) {
    comboText.textContent = `Fever 準備！`;
    gameContainer.classList.add('fever-border');
  } else if (streak >= 1) {
    comboText.textContent = `連擊：${streak}`;
    gameContainer.classList.remove('fever-border');
  } else {
    comboText.textContent = '';
    gameContainer.classList.remove('fever-border');
  }

  if (currentQuestion) {
    storyText.textContent = currentQuestion.context || '';
    questionText.textContent = currentQuestion.text || '';
  } else {
    storyText.textContent = '';
    questionText.textContent = '';
  }
}

/**
 * 載入下一題（或進入下一關）
 */
function loadNextQuestion() {
  if (currentQuestionIndex >= QUESTIONS_PER_LEVEL) {
    // 一關完成
    currentLevel++;
    if (currentLevel > MAX_LEVEL) {
      // 通關
      feedbackText.textContent = '恭喜你打敗所有怪物！';
      currentLevel = MAX_LEVEL;
      // 不再產生新題，可以自行延伸「無限模式」等
      return;
    } else {
      currentQuestionIndex = 0;
      currentHealth = MAX_HEALTH;
      feedbackText.textContent = `進入第 ${currentLevel} 關！`;
    }
  }

  currentQuestion = generateQuestion(currentLevel, currentQuestionIndex);
  // Boss 題型要切換到 Plan A / B 按鈕
  if (currentQuestion && currentQuestion.type === 'bossComparison') {
    answerArea.classList.add('hidden');
    bossChoices.classList.remove('hidden');
  } else {
    answerArea.classList.remove('hidden');
    bossChoices.classList.add('hidden');
  }

  answerInput.value = '';
  feedbackText.textContent = '';
  updateHUD();
  saveProgress();
}

// =================== 答題判斷 ===================

/**
 * 統一處理正確答案
 */
function handleCorrectAnswer() {
  // 基本加分
  score += 10;

  // 連擊與 Fever 邏輯
  if (feverReady) {
    feverActive = true; // 這一擊雙倍傷害（目前做成「額外加分＋超多粒子」）
    score += 10;        // 額外加 10 分
    feverReady = false;
    streak = 0;
  } else {
    streak++;
    if (streak >= 3) {
      feverReady = true; // 下一題進入 Fever 狀態
    }
  }

  // 啟動攻擊動畫（假 3D 往前衝）
  startAttackAnimation(true);

  // 下題
  currentQuestionIndex++;
  loadNextQuestion();
  updateHUD();
}

/**
 * 統一處理錯誤答案
 */
function handleWrongAnswer(correctText) {
  // 減血
  currentHealth--;

  // 顯示正確解釋
  feedbackText.textContent = `答錯了！正確答案：${correctText}`;

  // 連擊重置
  streak = 0;
  feverReady = false;
  feverActive = false;
  gameContainer.classList.remove('fever-border');

  // Shake + 紅光閃爍
  triggerDamageEffects();

  if (currentHealth <= 0) {
    // 同關重來
    feedbackText.textContent = `血量歸零！你需要重新挑戰本關。`;
    currentHealth = MAX_HEALTH;
    currentQuestionIndex = 0;
  }

  loadNextQuestion();
  updateHUD();
}

/**
 * 一般題目送出答案（數值輸入）
 */
submitBtn.addEventListener('click', () => {
  if (!currentQuestion || currentQuestion.type === 'bossComparison') return;

  const value = parseFloat(answerInput.value);
  if (isNaN(value)) {
    feedbackText.textContent = '請先輸入數值答案。';
    return;
  }

  const correct = currentQuestion.correctValue;
  // 容許少量小數誤差（兩位小數內）
  const isCorrect = Math.abs(value - correct) <= 0.01;

  if (isCorrect) {
    feedbackText.textContent = '正確！你斬殺了一隻怪物！';
    handleCorrectAnswer();
  } else {
    // 顯示詳解文字
    handleWrongAnswer(`約 $${correct.toFixed(2)}。${currentQuestion.explanation}`);
  }
});

/**
 * Boss 題：Plan A / Plan B 選擇
 */
planABtn.addEventListener('click', () => handleBossChoice('A'));
planBBtn.addEventListener('click', () => handleBossChoice('B'));

function handleBossChoice(choice) {
  if (!currentQuestion || currentQuestion.type !== 'bossComparison') return;
  if (choice === currentQuestion.correctPlan) {
    feedbackText.textContent = '答對！你打倒了 Boss！';
    handleCorrectAnswer();
  } else {
    const correct = currentQuestion.correctPlan;
    const info = `方案 A 利息約 $${currentQuestion.interestA.toFixed(2)}，方案 B 約 $${currentQuestion.interestB.toFixed(2)}。`;
    handleWrongAnswer(`${info} 所以應選 ${correct}。`);
  }
}

// =================== 傷害特效：Shake + 紅閃 ===================

function triggerDamageEffects() {
  // Shake
  gameContainer.classList.remove('shake');
  void gameContainer.offsetWidth; // 重新觸發動畫的小技巧
  gameContainer.classList.add('shake');

  // 紅閃
  redFlash.classList.remove('hidden');
  setTimeout(() => {
    redFlash.classList.add('hidden');
  }, 150);
}

// =================== 偽 3D 場景與角色繪圖 ===================

/**
 * 畫背景與「跑步」用的格線
 * 用 fillRect 畫矩形，用 beginPath/lineTo/stroke 畫線條
 */
function drawBackground() {
  // 白天／黃昏／夜晚色系
  let skyTop = '#4c78ff';   // 第 1 關：藍天
  let skyBottom = '#72a1ff';
  if (currentLevel === 2) {
    skyTop = '#ff9a3c';     // 第 2 關：黃昏
    skyBottom = '#ffce73';
  } else if (currentLevel >= 3) {
    skyTop = '#020031';     // 第 3 關：夜晚
    skyBottom = '#080b3a';
  }

  const w = canvas.width;
  const h = canvas.height;

  // 簡易漸層天空
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, skyTop);
  grad.addColorStop(1, skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h); // fillRect(x, y, width, height) 畫出長方形

  // 地面（下半部）假 3D 網格
  const groundY = h * 0.55;
  ctx.fillStyle = '#111';
  ctx.fillRect(0, groundY, w, h - groundY);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, groundY, w, h - groundY);
  ctx.clip();

  ctx.strokeStyle = 'rgba(0,255,255,0.2)';
  ctx.lineWidth = 1;

  // 縱線（往遠處聚合）
  const cols = 10;
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols - 0.5) * w;
    ctx.beginPath();
    ctx.moveTo(w / 2 + x, h);              // 前方
    ctx.lineTo(w / 2 + x * 0.2, groundY);  // 遠方（收斂）
    ctx.stroke();
  }

  // 橫線：用 gridOffset 做「往前跑」效果
  const rowHeight = 30;
  for (let y = groundY + (gridOffset % rowHeight); y < h; y += rowHeight) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 畫主角勇者（簡單矩形＋圓形頭）
 */
function drawHero() {
  const w = canvas.width;
  const h = canvas.height;

  const baseX = w * 0.2;
  const baseY = h * 0.6;

  // 身體
  ctx.fillStyle = '#33ff55';
  ctx.fillRect(baseX - 20, baseY - 50, 40, 50);

  // 頭部（圓形）
  ctx.beginPath();
  ctx.arc(baseX, baseY - 60, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe0bd';
  ctx.fill();

  // 劍
  ctx.fillStyle = '#ddd';
  ctx.fillRect(baseX + 18, baseY - 50, 8, 40);
  ctx.fillStyle = '#999';
  ctx.fillRect(baseX + 16, baseY - 10, 12, 6);
}

/**
 * 畫怪物（根據 attackAnimating 放大／縮小）
 */
function drawMonster() {
  const w = canvas.width;
  const h = canvas.height;

  const centerX = w * 0.7;
  const baseY = h * 0.6;

  let scale = 1;
  if (attackAnimating) {
    const progress = attackTimer / ATTACK_DURATION;
    scale = 1 + progress * 0.6; // 往前衝變大
  }

  const monsterWidth = 60 * scale;
  const monsterHeight = 70 * scale;

  // 身體
  ctx.fillStyle = '#ff3355';
  ctx.fillRect(centerX - monsterWidth / 2, baseY - monsterHeight, monsterWidth, monsterHeight);

  // 眼睛
  ctx.fillStyle = '#fff';
  ctx.fillRect(centerX - 10 * scale, baseY - monsterHeight + 15 * scale, 8 * scale, 8 * scale);
  ctx.fillRect(centerX + 2 * scale, baseY - monsterHeight + 15 * scale, 8 * scale, 8 * scale);

  // 口
  ctx.fillStyle = '#000';
  ctx.fillRect(centerX - 12 * scale, baseY - monsterHeight + 34 * scale, 24 * scale, 6 * scale);

  // 若是 Boss 題，畫大一點的「皇冠」
  if (currentQuestion && currentQuestion.type === 'bossComparison') {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(centerX - 18 * scale, baseY - monsterHeight - 4 * scale);
    ctx.lineTo(centerX, baseY - monsterHeight - 18 * scale);
    ctx.lineTo(centerX + 18 * scale, baseY - monsterHeight - 4 * scale);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * 建立粒子（怪物死亡時用）
 */
function spawnParticles() {
  const w = canvas.width;
  const h = canvas.height;
  const centerX = w * 0.7;
  const baseY = h * 0.6;

  const count = feverActive ? 60 : 30;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: centerX,
      y: baseY - 30,
      vx: (Math.random() - 0.5) * 200,
      vy: (Math.random() - 0.5) * 200,
      size: 4 + Math.random() * 3,
      life: 0.6 + Math.random() * 0.4,
      age: 0,
      color: `hsl(${Math.random() * 360}, 80%, 60%)`
    });
  }
}

/**
 * 更新所有粒子
 */
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.life) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 400 * dt; // 模擬重力
  }
}

/**
 * 畫出所有粒子（彩色小方塊）
 */
function drawParticles() {
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
}

/**
 * 開始攻擊動畫：往前衝、網格快速往下、產生粒子
 */
function startAttackAnimation(spawn = true) {
  attackAnimating = true;
  attackTimer = 0;
  if (spawn) spawnParticles();
}

// =================== 主遊戲迴圈（requestAnimationFrame） ===================

let lastTime = 0;

function gameLoop(timestamp) {
  if (!running) return;

  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

/**
 * 更新遊戲邏輯
 */
function update(dt) {
  if (currentState !== 'game') return;

  // 背景網格向下移動：一般慢速，攻擊時快速
  const baseSpeed = attackAnimating ? 400 : 80;
  gridOffset += baseSpeed * dt;

  // 攻擊動畫時間控制
  if (attackAnimating) {
    attackTimer += dt;
    if (attackTimer >= ATTACK_DURATION) {
      attackAnimating = false;
      attackTimer = 0;
      feverActive = false; // 本次雙倍攻擊畫面結束
    }
  }

  // 粒子更新
  updateParticles(dt);
}

/**
 * 繪圖：先清空畫布，再根據模式與狀態畫背景、角色與 HUD
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (currentState !== 'game') return;

  drawBackground();
  drawHero();
  drawMonster();
  drawParticles();

  // 在 Canvas 上也畫一點 HUD（示範直向／橫向不同）
  ctx.fillStyle = '#fff';
  ctx.font = '12px "Press Start 2P", system-ui';

  if (orientationMode === 'portrait') {
    // 直向：文字在上方中間
    ctx.textAlign = 'left';
    ctx.fillText(`L${currentLevel} HP:${currentHealth}`, 10, 20);
  } else {
    // 橫向：文字靠右
    ctx.textAlign = 'right';
    ctx.fillText(`L${currentLevel} HP:${currentHealth}`, canvas.width - 10, 20);
  }
}

// =================== 計算機邏輯（含次方與 n 次根） ===================

let calcExpression = '';
let calcLastAnswer = 0;

/**
 * 重新整理計算機顯示
 */
function refreshCalcDisplay() {
  calcExpressionDiv.textContent = calcExpression || '0';
  calcResultDiv.textContent = calcLastAnswer.toString();
}

/**
 * 安全計算目前 expression
 * 支援：+ - * / ^ 以及 n√x（內部轉成 x^(1/n)）
 */
function evaluateExpression() {
  try {
    let expr = calcExpression;

    // 將 ^ 換成 Math.pow
    // 將 a^b 替換成 Math.pow(a,b)
    expr = expr.replace(/(\d+(\.\d+)?)(\s*)\^(\s*)(\d+(\.\d+)?)/g, 'Math.pow($1,$5)');

    // 處理 n√x：暫時在按鈕邏輯中轉成 "ROOT(n,x)" 再在這裡替換
    expr = expr.replace(/ROOT\(([^,]+),([^()]+)\)/g, 'Math.pow($2,1/($1))');

    // 最後用 eval 計算，僅允許數字與基本運算
    // （教學示範，小專題中可接受；正式產品建議寫自己的 parser）
    // eslint-disable-next-line no-eval
    const result = eval(expr);
    if (typeof result === 'number' && isFinite(result)) {
      calcLastAnswer = result;
    }
  } catch (e) {
    // 無效表達式就略過
  }
  refreshCalcDisplay();
}

/**
 * 處理計算機按鈕
 */
calcButtonsContainer.addEventListener('click', (e) => {
  const btn = e.target;
  if (!(btn instanceof HTMLButtonElement)) return;
  const key = btn.dataset.key;
  if (!key) return;

  switch (key) {
    case 'C':
      calcExpression = '';
      calcLastAnswer = 0;
      break;
    case 'DEL':
      calcExpression = calcExpression.slice(0, -1);
      break;
    case '=':
      evaluateExpression();
      break;
    case 'ANS':
      calcExpression += calcLastAnswer.toString();
      break;
    case '^':
      calcExpression += '^';
      break;
    case 'ROOT':
      // 用 ROOT(n,x) 的形式，等下在 evaluateExpression 中轉成 x^(1/n)
      // 使用方式：輸入 n ，按 n√x，再輸入 ,x
      if (!calcExpression.endsWith('ROOT(')) {
        calcExpression += 'ROOT(';
      }
      break;
    default:
      // 一般數字與 + - * / .
      calcExpression += key;
      break;
  }

  refreshCalcDisplay();
});

/**
 * 將計算結果填回答案輸入框
 */
calcUseBtn.addEventListener('click', () => {
  answerInput.value = calcLastAnswer.toFixed(2);
});

/**
 * 顯示／隱藏計算機
 */
calcToggleBtn.addEventListener('click', () => {
  calculator.classList.toggle('hidden');
  refreshCalcDisplay();
});

// 讓 Enter 也可以送出答案
answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    submitBtn.click();
  }
});
