/**
 * GameApp: 負責遊戲邏輯與 DOM 操作
 */
const GameApp = {
  // 遊戲狀態
  state: "menu", // menu, playing, levelClear, gameOver
  level: 1,
  hp: 5,
  monstersKilled: 0,
  
  // 題目
  question: null,
  questionList: [],
  
  // 動畫狀態
  isWalking: false,
  walkFrame: 0,
  hurtFlash: 0,
  attackFlash: 0,

  // 計算機
  calcExp: "",
  calcLastAns: 0,

  // 啟動遊戲
  startGame: function() {
    // 切換 DOM
    var menu = document.getElementById("menu-screen");
    var gameUI = document.getElementById("game-ui");
    if(menu) menu.classList.add("hidden");
    if(gameUI) gameUI.classList.remove("hidden");
    
    // 開始 p5.js 繪圖迴圈
    loop(); 
    
    // 進入第一關
    this.startLevel(1);
  },

  // 返回選單
  backToMenu: function() {
    this.state = "menu";
    var menu = document.getElementById("menu-screen");
    var gameUI = document.getElementById("game-ui");
    var calcPanel = document.getElementById("calc-panel");

    if(menu) menu.classList.remove("hidden");
    if(gameUI) gameUI.classList.add("hidden");
    if(calcPanel) calcPanel.classList.add("hidden");
    
    // 停止 p5.js 繪圖以節省資源
    noLoop();
  },

  // 開始關卡
  startLevel: function(lvl) {
    this.level = lvl;
    this.hp = 5;
    this.monstersKilled = 0;
    this.updateHUD();
    
    // 產生題目序列
    this.generateQuestionList(lvl);
    this.nextQuestion();
    
    this.state = "playing";
    this.isWalking = true; // 開場先走路
    this.walkFrame = 0;
    
    // 清空輸入框與計算機
    var input = document.getElementById("ans-input");
    if(input) input.value = "";
    this.calcClear(); 
  },

  updateHUD: function() {
    var hpEl = document.getElementById("hp-display");
    var lvlEl = document.getElementById("lvl-display");
    if(hpEl) hpEl.innerText = "❤️ " + this.hp;
    if(lvlEl) lvlEl.innerText = "Lv " + this.level;
  },

  // 產生題目序列 (洗牌題型)
  generateQuestionList: function(lvl) {
    var types = [];
    if (lvl < 4) types = ["FindA", "FindA", "FindA", "FindA", "FindA"];
    else if (lvl === 4) types = ["FindP", "FindR", "FindT", "FindP", "FindR"];
    else types = ["FindP", "FindR", "FindT", "FindR", "FindT"];
    
    // 簡單洗牌
    this.questionList = types.sort(function() { return 0.5 - Math.random() });
  },

  // 產生下一題
  nextQuestion: function() {
    // 重置計算機
    this.calcClear(); 

    var type = this.questionList[this.monstersKilled] || "FindA";
    var q = { text: "", answer: 0 };
    
    // Helper: random integer
    function rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    var P = rand(1, 20) * 10000;
    var r = rand(3, 12);
    var t = rand(2, 5);

    if (this.level === 1) {
      var I = P * r * t / 100;
      q.text = "[Lv1] 簡單利息\nP=$" + P + ", r=" + r + "%, t=" + t + "年\n求利息 I？";
      q.answer = I;
    } else if (this.level === 2) {
      var A = Math.round(P * Math.pow(1 + r/100, t));
      q.text = "[Lv2] 每年複利\nP=$" + P + ", r=" + r + "%, t=" + t + "年\n求本利和 A？";
      q.answer = A;
    } else if (this.level === 3) {
      var n = Math.random() > 0.5 ? 12 : 4;
      var period = (n === 12) ? "每月" : "每季";
      var A = Math.round(P * Math.pow(1 + (r/100)/n, n*t));
      q.text = "[Lv3] " + period + "複利\nP=$" + P + ", r=" + r + "%, t=" + t + "年\n求本利和 A？";
      q.answer = A;
    } else {
      // Lv4 & Lv5 (逆算)
      var A = Math.round(P * Math.pow(1 + r/100, t));
      if (type === "FindP") {
         q.text = "[Lv" + this.level + "] 複利逆算\nA=$" + A + ", r=" + r + "%, t=" + t + "年\n求本金 P？";
         q.answer = P;
      } else if (type === "FindR") {
         q.text = "[Lv" + this.level + "] 複利逆算\nP=$" + P + ", A=$" + A + ", t=" + t + "年\n求利率 r (%)？";
         q.answer = r;
      } else {
         q.text = "[Lv" + this.level + "] 複利逆算\nP=$" + P + ", A=$" + A + ", r=" + r + "%\n求年期 t (年)？";
         q.answer = t;
      }
    }
    this.question = q;
  },

  // 提交答案
  submitAnswer: function() {
    if (this.isWalking || !this.question) return;
    
    var inputEl = document.getElementById("ans-input");
    if(!inputEl) return;
    
    var inputStr = inputEl.value.replace(/,/g, '');
    if (!inputStr) return;
    
    var val = parseFloat(inputStr);
    var margin = (this.question.answer > 1000) ? 100 : 1;
    
    if (Math.abs(val - this.question.answer) <= margin) {
      // 答對
      this.monstersKilled++;
      this.attackFlash = 150;
      
      if (this.monstersKilled >= 5) {
        this.state = "levelClear";
      } else {
        this.isWalking = true;
        this.walkFrame = 0;
        this.question = null;
        inputEl.value = "";
      }
    } else {
      // 答錯
      this.hp--;
      this.hurtFlash = 150;
      this.updateHUD();
      if (this.hp <= 0) this.state = "gameOver";
    }
  },

  // === 計算機邏輯 ===
  toggleCalc: function() {
    var el = document.getElementById("calc-panel");
    if(el) el.classList.toggle("hidden");
  },
  calcAppend: function(v) { this.calcExp += v; this.updateCalcScreen(); },
  calcClear: function() { this.calcExp = ""; this.updateCalcScreen(); },
  calcDel: function() { this.calcExp = this.calcExp.slice(0, -1); this.updateCalcScreen(); },
  calcAns: function() { this.calcExp += "Ans"; this.updateCalcScreen(); },
  
  updateCalcScreen: function() {
    var el = document.getElementById("calc-screen");
    if(el) el.innerText = this.calcExp || "0";
  },
  
  calcEqual: function() {
    try {
      // 使用 Unicode 編碼替換符號，避免編碼錯誤
      // \u00D7 是乘號，\u00F7 是除號
      var e = this.calcExp
        .replace(/Ans/g, this.calcLastAns)
        .replace(/\u00D7/g, "*") 
        .replace(/\u00F7/g, "/")
        .replace(/\^/g, "**");
      
      // 處理 Nth root (例如 3ˣ√8 => Math.pow(8, 1/3))
      // 使用 Unicode \u02e3\u221a 代表 ˣ√
      if (e.indexOf("\u02e3\u221a") !== -1) {
        var parts = e.split("\u02e3\u221a");
        if (parts.length === 2) e = "Math.pow(" + parts[1] + ", 1/" + parts[0] + ")";
      } 
      // 相容舊寫法
      else if (e.indexOf("ˣ√") !== -1) {
        var parts = e.split("ˣ√");
        if (parts.length === 2) e = "Math.pow(" + parts[1] + ", 1/" + parts[0] + ")";
      }
      
      var res = eval(e); 
      this.calcLastAns = res;
      this.calcExp = String(Math.round(res * 10000) / 10000);
    } catch(err) {
      this.calcExp = "Error";
    }
    this.updateCalcScreen();
  },
  
  fillAns: function() {
    var el = document.getElementById("ans-input");
    if(el) el.value = this.calcExp;
    this.toggleCalc();
  }
};

/**
 * p5.js 繪圖區
 */
function setup() {
  var c = createCanvas(windowWidth, windowHeight);
  c.parent("canvas-container");
  c.style("display", "block");
  c.style("position", "absolute");
  c.style("top", "0");
  c.style("left", "0");
  c.style("z-index", "-1");
  
  noLoop();
  
  var gameUI = document.getElementById("game-ui");
  var calcPanel = document.getElementById("calc-panel");
  if(gameUI) gameUI.classList.add("hidden");
  if(calcPanel) calcPanel.classList.add("hidden");
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(20);

  draw3DScene();

  if (GameApp.state === "playing" && !GameApp.isWalking && GameApp.question) {
    drawMonster();
    drawQuestionBoard();
  }

  handleEffects();

  if (GameApp.state === "levelClear" || GameApp.state === "gameOver") {
    drawEndScreen();
  }
}

function draw3DScene() {
  var horizon = height / 2;
  if (GameApp.isWalking) {
    horizon += Math.sin(GameApp.walkFrame * 0.5) * 15;
  }

  noStroke();
  fill(30); rect(0, 0, width, horizon);
  fill(50); rect(0, horizon, width, height - horizon);

  var size = width * 0.2;
  var cx = width / 2;
  var cy = horizon;

  fill(10);
  rectMode(CENTER);
  rect(cx, cy, size, size);
  rectMode(CORNER);

  stroke(80); strokeWeight(2);
  line(0, 0, cx - size/2, cy - size/2);
  line(width, 0, cx + size/2, cy - size/2);
  line(0, height, cx - size/2, cy + size/2);
  line(width, height, cx + size/2, cy + size/2);
}

function drawMonster() {
  push();
  translate(width / 2, height / 2);
  textAlign(CENTER, CENTER);
  
  var monsters = ["🦠", "💀", "👹", "🐲", "😈"];
  var icon = monsters[GameApp.level - 1] || "👾";
  
  textSize(Math.min(width, height) * 0.25);
  text(icon, 0, 20);
  pop();
}

function drawQuestionBoard() {
  var bw = Math.min(600, width * 0.9);
  var bh = height * 0.35;
  
  fill(0, 0, 0, 200);
  stroke(255);
  strokeWeight(2);
  rect((width - bw) / 2, height * 0.15, bw, bh, 10);

  fill(255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(Math.min(width, height) * 0.045);
  text(GameApp.question.text, (width - bw) / 2 + 20, height * 0.15 + 20);
}

function handleEffects() {
  if (GameApp.isWalking) {
    GameApp.walkFrame++;
    if (GameApp.walkFrame > 45) {
      GameApp.isWalking = false;
      GameApp.nextQuestion();
    }
  }
  if (GameApp.hurtFlash > 0) {
    fill(255, 0, 0, GameApp.hurtFlash);
    noStroke();
    rect(0, 0, width, height);
    GameApp.hurtFlash -= 10;
  }
  if (GameApp.attackFlash > 0) {
    fill(255, 255, 255, GameApp.attackFlash);
    noStroke();
    rect(0, 0, width, height);
    GameApp.attackFlash -= 10;
  }
}

function drawEndScreen() {
  fill(0, 0, 0, 220);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  textSize(40);
  if (GameApp.state === "levelClear") {
    fill(100, 255, 100);
    text("🎉 任務完成！", width / 2, height / 2);
  } else {
    fill(255, 100, 100);
    text("💀 挑戰失敗...", width / 2, height / 2);
  }

  textSize(20);
  fill(200);
  text("點擊任意處返回選單", width / 2, height / 2 + 60);
}

function mousePressed() {
  if (GameApp.state === "levelClear" || GameApp.state === "gameOver") {
    GameApp.backToMenu();
  }
}
