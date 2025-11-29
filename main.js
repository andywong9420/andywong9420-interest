/**
 * GameApp: 負責遊戲邏輯與 DOM 操作
 */
var GameApp = {
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
    var menu = document.getElementById("menu-screen");
    var gameUI = document.getElementById("game-ui");
    if(menu) menu.classList.add("hidden");
    if(gameUI) gameUI.classList.remove("hidden");
    
    loop(); 
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
    
    noLoop();
  },

  // 開始關卡
  startLevel: function(lvl) {
    this.level = lvl;
    this.hp = 5;
    this.monstersKilled = 0;
    this.updateHUD();
    this.generateQuestionList(lvl);
    this.nextQuestion();
    
    this.state = "playing";
    this.isWalking = true;
    this.walkFrame = 0;
    
    var input = document.getElementById("ans-input");
    if(input) input.value = "";
    this.calcClear(); 
  },

  updateHUD: function() {
    var hpEl = document.getElementById("hp-display");
    var lvlEl = document.getElementById("lvl-display");
    if(hpEl) hpEl.innerText = "HP " + this.hp;
    if(lvlEl) lvlEl.innerText = "Lv " + this.level;
  },

  generateQuestionList: function(lvl) {
    var types = [];
    if (lvl < 4) types = ["FindA", "FindA", "FindA", "FindA", "FindA"];
    else if (lvl === 4) types = ["FindP", "FindR", "FindT", "FindP", "FindR"];
    else types = ["FindP", "FindR", "FindT", "FindR", "FindT"];
    
    this.questionList = types.sort(function() { return 0.5 - Math.random() });
  },

  nextQuestion: function() {
    this.calcClear(); 

    var type = this.questionList[this.monstersKilled] || "FindA";
    var q = { text: "", answer: 0 };
    
    function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    var P = rand(1, 20) * 10000;
    var r = rand(3, 12);
    var t = rand(2, 5);

    if (this.level === 1) {
      var I = P * r * t / 100;
      q.text = "[Lv1] Simple Interest\nP=" + P + ", r=" + r + "%, t=" + t + "yr\nFind I?";
      q.answer = I;
    } else if (this.level === 2) {
      var A = Math.round(P * Math.pow(1 + r/100, t));
      q.text = "[Lv2] Compound(Yearly)\nP=" + P + ", r=" + r + "%, t=" + t + "yr\nFind A?";
      q.answer = A;
    } else if (this.level === 3) {
      var n = Math.random() > 0.5 ? 12 : 4;
      var period = (n === 12) ? "Monthly" : "Quarterly";
      var A = Math.round(P * Math.pow(1 + (r/100)/n, n*t));
      q.text = "[Lv3] " + period + "\nP=" + P + ", r=" + r + "%, t=" + t + "yr\nFind A?";
      q.answer = A;
    } else {
      var A = Math.round(P * Math.pow(1 + r/100, t));
      if (type === "FindP") {
         q.text = "[Lv" + this.level + "] Reverse\nA=" + A + ", r=" + r + "%, t=" + t + "yr\nFind P?";
         q.answer = P;
      } else if (type === "FindR") {
         q.text = "[Lv" + this.level + "] Reverse\nP=" + P + ", A=" + A + ", t=" + t + "yr\nFind r(%)?";
         q.answer = r;
      } else {
         q.text = "[Lv" + this.level + "] Reverse\nP=" + P + ", A=" + A + ", r=" + r + "%\nFind t(yr)?";
         q.answer = t;
      }
    }
    this.question = q;
  },

  submitAnswer: function() {
    if (this.isWalking || !this.question) return;
    
    var inputEl = document.getElementById("ans-input");
    if(!inputEl) return;
    
    var inputStr = inputEl.value.replace(/,/g, '');
    if (!inputStr) return;
    
    var val = parseFloat(inputStr);
    var margin = (this.question.answer > 1000) ? 100 : 1;
    
    if (Math.abs(val - this.question.answer) <= margin) {
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
      this.hp--;
      this.hurtFlash = 150;
      this.updateHUD();
      if (this.hp <= 0) this.state = "gameOver";
    }
  },

  // === Calculator ===
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
      // 這裡一定要用標準 ASCII 字元替換，絕對不要用 unicode 特殊符號
      var expr = this.calcExp;
      expr = expr.split("Ans").join(this.calcLastAns);
      expr = expr.split("\u00D7").join("*"); // 如果之前有存乘號
      expr = expr.split("\u00F7").join("/"); // 如果之前有存除號
      expr = expr.split("^").join("**"); // 次方

      // 處理 root (Root 鍵輸入的是 'Root')
      // 我們約定輸入格式是 A Root B 代表 B^(1/A)
      if (expr.indexOf("Root") !== -1) {
         var parts = expr.split("Root");
         if (parts.length === 2) {
           expr = "Math.pow(" + parts[1] + ", 1/" + parts[0] + ")";
         }
      }

      var res = eval(expr);
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

// === P5.js ===
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
  if (GameApp.isWalking) horizon += Math.sin(GameApp.walkFrame * 0.5) * 15;

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

function draw
