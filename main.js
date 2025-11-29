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
    document.getElementById("menu-screen").classList.add("hidden");
    document.getElementById("game-ui").classList.remove("hidden");
    
    // 開始 p5.js 繪圖迴圈
    loop(); 
    
    // 進入第一關
    this.startLevel(1);
  },

  // 返回選單
  backToMenu: function() {
    this.state = "menu";
    document.getElementById("menu-screen").classList.remove("hidden");
    document.getElementById("game-ui").classList.add("hidden");
    document.getElementById("calc-panel").classList.add("hidden");
    
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
    document.getElementById("ans-input").value = "";
    this.calcClear(); 
  },

  updateHUD: function() {
    document.getElementById("hp-display").innerText = `❤️ ${this.hp}`;
    document.getElementById("lvl-display").innerText = `Lv ${this.level}`;
  },

  // 產生題目序列 (洗牌題型)
  generateQuestionList: function(lvl) {
    let types = [];
    if (lvl < 4) types = ["FindA", "FindA", "FindA", "FindA", "FindA"];
    else if (lvl === 4) types = ["FindP", "FindR", "FindT", "FindP", "FindR"];
    else types = ["FindP", "FindR", "FindT", "FindR", "FindT"];
    
    // 簡單洗牌
    this.questionList = types.sort(() => Math.random() - 0.5);
  },

  // 產生下一題
  nextQuestion: function() {
    // 重置計算機
    this.calcClear(); 

    let type = this.questionList[this.monstersKilled] || "FindA";
    let q = { text: "", answer: 0 };
    
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    let P = rand(1, 20) * 10000;
    let r = rand(3, 12);
    let t = rand(2, 5);

    if (this.level === 1) {
      let I = P * r * t / 100;
      q.text = `[Lv1] 簡單利息\nP=$${P}, r=${r}%, t=${t}年\n求利息 I？`;
      q.answer = I;
    } else if (this.level === 2) {
      let A = Math.round(P * Math.pow(1 + r/100, t));
      q.text = `[Lv2] 每年複利\nP=$${P}, r=${r}%, t=${t}年\n求本利和 A？`;
      q.answer = A;
    } else if (this.level === 3) {
      let n = Math.random() > 0.5 ? 12 : 4;
      let period = n === 12 ? "每月" : "每季";
      let A = Math.round(P * Math.pow(1 + (r/100)/n, n*t));
      q.text = `[Lv3] ${period}複利\nP=$${P}, r=${r}%, t=${t}年\n求本利和 A？`;
      q.answer = A;
    } else {
      // Lv4 & Lv5 (逆算)
      let A = Math.round(P * Math.pow(1 + r/100, t));
      if (type === "FindP") {
         q.text = `[Lv${this.level}] 複利逆算\nA=$${A}, r=${r}%, t=${t}年\n求本金 P？`;
         q.answer = P;
      } else if (type === "FindR") {
         q.text = `[Lv${this.level}] 複利逆算\nP=$${P}, A=$${A}, t=${t}年\n求利率 r (%)？`;
         q.answer = r;
      } else {
         q.text = `[Lv${this.level}] 複利逆算\nP=$${P}, A=$${A}, r=${r}%\n求年期 t (年)？`;
         q.answer = t;
      }
    }
    this.question = q;
  },

  // 提交答案
  submitAnswer: function() {
    if (this.isWalking || !this.question) return;
    
    let inputStr = document.getElementById("ans-input").value.replace(/,/g, '');
    if (!inputStr) return;
    
    let val = parseFloat(inputStr);
    let margin = (this.question.answer > 1000) ? 100 : 1;
    
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
        document.getElementById("ans-input").value = "";
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
    let el = document.getElementById("
