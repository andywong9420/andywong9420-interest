<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>利息迷宮 3D (修復版)</title>
  <!-- 引入 p5.js 核心 -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>

  <style>
    /* === CSS 樣式區 === */
    html, body {
      margin: 0; padding: 0;
      width: 100%; height: 100%;
      background-color: #111; color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden; touch-action: none;
      user-select: none; -webkit-user-select: none;
    }

    /* 通用工具 class */
    .hidden { display: none !important; }

    /* 1. 選單畫面 */
    #menu-screen {
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      background: linear-gradient(135deg, #111 0%, #222 100%);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      z-index: 100; text-align: center;
    }
    h1 { color: #fbbf24; margin: 0 0 10px 0; text-shadow: 0 0 15px #b45309; font-size: 2.5rem; }
    .subtitle { color: #aaa; margin-bottom: 30px; font-size: 1rem; }
    
    .menu-btn {
      width: 280px; padding: 16px; margin: 10px;
      font-size: 1.1rem; font-weight: bold;
      background: #1f2937; color: #fbbf24;
      border: 2px solid #4b5563; border-radius: 12px;
      cursor: pointer; transition: transform 0.1s;
    }
    .menu-btn:active { transform: scale(0.95); background: #fbbf24; color: #000; }

    .info-box {
      margin-top: 20px; background: rgba(0,0,0,0.5);
      padding: 15px; border-radius: 8px; color: #999; font-size: 0.85rem;
      text-align: left; width: 260px;
    }
    .info-box ul { padding-left: 20px; margin: 5px 0; }

    /* 2. 遊戲介面 (覆蓋在 Canvas 之上) */
    #game-ui {
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none; /* 讓點擊能穿透到 Canvas */
      z-index: 10;
    }
    /* 恢復 UI 內部按鈕的可點擊性 */
    #game-ui button, #game-ui input { pointer-events: auto; }

    /* HUD */
    #top-hud {
      position: absolute; top: 0; left: 0; width: 100%;
      padding: 15px; box-sizing: border-box;
      display: flex; justify-content: space-between; align-items: flex-start;
    }
    #back-btn {
      background: #dc2626; color: white; border: none;
      padding: 8px 16px; border-radius: 6px; font-weight: bold;
    }
    .status-text { font-size: 1.2rem; font-weight: bold; text-shadow: 2px 2px 0 #000; }

    /* 底部控制區 */
    #bottom-panel {
      position: absolute; bottom: 0; left: 0; width: 100%;
      background: rgba(17, 24, 39, 0.9);
      padding: 15px; box-sizing: border-box;
      display: flex; gap: 10px; justify-content: center;
      border-top: 1px solid #374151;
    }
    #ans-input {
      width: 120px; padding: 12px; font-size: 1.1rem;
      border-radius: 8px; border: 1px solid #4b5563;
      background: #000; color: #fff; text-align: center;
    }
    #attack-btn {
      background: linear-gradient(to bottom, #16a34a, #15803d);
      color: white; border: none; padding: 0 24px;
      border-radius: 8px; font-weight: bold; font-size: 1rem;
      box-shadow: 0 4px 0 #14532d;
    }
    #attack-btn:active { transform: translateY(4px); box-shadow: none; }
    
    #calc-toggle-btn {
      background: #2563eb; color: white; border: none;
      padding: 0 16px; border-radius: 8px; font-size: 1.5rem;
    }

    /* 計算機 */
    #calc-panel {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 320px; background: #1f2937;
      border: 2px solid #4b5563; border-radius: 12px;
      z-index: 50; padding: 15px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.9);
    }
    .calc-header { display: flex; justify-content: space-between; color: #9ca3af; margin-bottom: 10px; }
    #calc-screen {
      background: #000; color: #22c55e; font-family: monospace;
      font-size: 1.8rem; text-align: right; padding: 15px;
      margin-bottom: 15px; border-radius: 6px; overflow: hidden;
    }
    .calc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .calc-btn {
      padding: 15px 0; font-size: 1.1rem;
      background: #374151; color: white; border: none; border-radius: 6px;
    }
    .calc-btn:active { background: #4b5563; }
    .bg-red { background: #7f1d1d !important; }
    .bg-green { background: #14532d !important; }
    .w-full { width: 100%; margin-top: 10px; padding: 12px; background: #0891b2; border: none; border-radius: 6px; color: white; font-weight: bold; }

  </style>
</head>
<body>

  <!-- 錯誤偵測器 (若 JS 崩潰，顯示錯誤給使用者) -->
  <script>
    window.onerror = function(msg, url, line) {
      alert("遊戲發生錯誤，請截圖給老師：\n" + msg + "\nLine: " + line);
      return false;
    };
  </script>

  <!-- 1. 主選單 -->
  <div id="menu-screen">
    <h1>🏰 利息迷宮 3D 🏰</h1>
    <p class="subtitle">擊敗守衛，深入地下城！</p>

    <button class="menu-btn" onclick="app.startGame()">⚔️ 開始冒險 (Start)</button>

    <div class="info-box">
      <strong>關卡資訊：</strong>
      <ul>
        <li>Lv1: 簡單利息 (史萊姆)</li>
        <li>Lv2: 每年複利 (骷髏兵)</li>
        <li>Lv3: 分期複利 (石像鬼)</li>
        <li>Lv4: 逆向工程 (惡龍)</li>
        <li>Lv5: 魔王級 (非年逆算)</li>
      </ul>
    </div>
  </div>

  <!-- 2. 遊戲介面 -->
  <div id="game-ui" class="hidden">
    <div id="top-hud">
      <button id="back-btn" onclick="app.backToMenu()">🏃 逃跑</button>
      <div>
        <div id="hp-display" class="status-text" style="color:#ef4444">❤️ 5</div>
        <div id="lvl-display" class="status-text" style="color:#fbbf24">Lv 1</div>
      </div>
    </div>

    <div id="bottom-panel">
      <input id="ans-input" type="number" inputmode="decimal" placeholder="輸入答案">
      <button id="attack-btn" onclick="app.submitAnswer()">⚔️ 攻擊</button>
      <button id="calc-toggle-btn" onclick="app.toggleCalc()">🧮</button>
    </div>
  </div>

  <!-- 3. 計算機 -->
  <div id="calc-panel" class="hidden">
    <div class="calc-header">
      <span>RPG Calculator</span>
      <button onclick="app.toggleCalc()" style="background:none;border:none;color:white;font-size:1.2rem">✕</button>
    </div>
    <div id="calc-screen">0</div>
    <div class="calc-grid">
      <button class="calc-btn bg-red" onclick="app.calcClear()">AC</button>
      <button class="calc-btn bg-red" onclick="app.calcDel()">DEL</button>
      <button class="calc-btn" onclick="app.calcAppend('(')">(</button>
      <button class="calc-btn" onclick="app.calcAppend(')')">)</button>

      <button class="calc-btn" onclick="app.calcAppend('^')">xʸ</button>
      <button class="calc-btn" onclick="app.calcAppend('ˣ√')">ˣ√</button> 
      <button class="calc-btn" onclick="app.calcAppend('÷')">÷</button>
      <button class="calc-btn" onclick="app.calcAppend('×')">×</button>

      <button class="calc-btn" onclick="app.calcAppend('7')">7</button>
      <button class="calc-btn" onclick="app.calcAppend('8')">8</button>
      <button class="calc-btn" onclick="app.calcAppend('9')">9</button>
      <button class="calc-btn" onclick="app.calcAppend('-')">−</button>

      <button class="calc-btn" onclick="app.calcAppend('4')">4</button>
      <button class="calc-btn" onclick="app.calcAppend('5')">5</button>
      <button class="calc-btn" onclick="app.calcAppend('6')">6</button>
      <button class="calc-btn" onclick="app.calcAppend('+')">+</button>

      <button class="calc-btn" onclick="app.calcAppend('1')">1</button>
      <button class="calc-btn" onclick="app.calcAppend('2')">2</button>
      <button class="calc-btn" onclick="app.calcAppend('3')">3</button>
      <button class="calc-btn bg-green" onclick="app.calcEqual()">=</button>

      <button class="calc-btn" onclick="app.calcAppend('0')" style="grid-column: span 2">0</button>
      <button class="calc-btn" onclick="app.calcAppend('.')">.</button>
      <button class="calc-btn" style="background:#2563eb" onclick="app.calcAns()">Ans</button>
    </div>
    <button class="w-full" onclick="app.fillAns()">填入答案</button>
  </div>

  <!-- === 核心邏輯區 (JS) === -->
  <script>
    // 將邏輯封裝在 app 物件中，避免變數汙染
    const app = {
      state: "menu", // menu, playing, levelClear, gameOver
      level: 1,
      hp: 5,
      monstersKilled: 0,
      question: null,
      questionList: [],
      
      // 動畫
      isWalking: false,
      walkFrame: 0,
      hurtFlash: 0,
      attackFlash: 0,

      // 計算機
      calcExp: "",
      calcLastAns: 0,

      // 初始化
      init: function() {
        // 隱藏計算機與遊戲介面
        document.getElementById('game-ui').classList.add('hidden');
        document.getElementById('calc-panel').classList.add('hidden');
      },

      startGame: function() {
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');
        this.startLevel(1);
        loop(); // p5 loop start
      },

      backToMenu: function() {
        this.state = "menu";
        document.getElementById('menu-screen').classList.remove('hidden');
        document.getElementById('game-ui').classList.add('hidden');
        document.getElementById('calc-panel').classList.add('hidden');
        noLoop();
      },

      startLevel: function(lvl) {
        this.level = lvl;
        this.hp = 5;
        this.monstersKilled = 0;
        this.updateHUD();
        this.generateQuestions(lvl);
        this.nextQuestion();
        
        this.state = "playing";
        this.isWalking = true;
        this.walkFrame = 0;
        
        document.getElementById('ans-input').value = "";
      },

      updateHUD: function() {
        document.getElementById('hp-display').innerText = `❤️ ${this.hp}`;
        document.getElementById('lvl-display').innerText = `Lv ${this.level}`;
      },

      generateQuestions: function(lvl) {
        // 預先決定 5 題題型
        let types = [];
        if (lvl < 4) types = ["FindA","FindA","FindA","FindA","FindA"];
        else types = ["FindP","FindR","FindT","FindP","FindR"];
        
        // 洗牌
        this.questionList = types.sort(() => Math.random() - 0.5);
      },

      nextQuestion: function() {
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
          // 逆算
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

      submitAnswer: function() {
        if (this.isWalking || !this.question) return;
        let inputVal = document.getElementById('ans-input').value.replace(/,/g, '');
        if (!inputVal) return;
        let val = parseFloat(inputVal);
        
        let margin = (this.question.answer > 1000) ? 100 : 1;
        
        if (Math.abs(val - this.question.answer) <= margin) {
          // Correct
          this.monstersKilled++;
          this.attackFlash = 150;
          if (this.monstersKilled >= 5) {
            this.state = "levelClear";
          } else {
            this.isWalking = true;
            this.walkFrame = 0;
            this.question = null;
            document.getElementById('ans-input').value = "";
          }
        } else {
          // Wrong
          this.hp--;
          this.hurtFlash = 150;
          this.updateHUD();
          if (this.hp <= 0) this.state = "gameOver";
        }
      },

      // 計算機功能
      toggleCalc: function() {
        let el = document.getElementById('calc-panel');
        if (el.classList.contains('hidden')) el.classList.remove('hidden');
        else el.classList.add('hidden');
      },
      calcAppend: function(v) { this.calcExp += v; this.updateCalc(); },
      calcClear: function() { this.calcExp = ""; this.updateCalc(); },
      calcDel: function() { this.calcExp = this.calcExp.slice(0,-1); this.updateCalc(); },
      calcAns: function() { this.calcExp += "Ans"; this.updateCalc(); },
      updateCalc: function() { document.getElementById('calc-screen').innerText = this.calcExp || "0"; },
      calcEqual: function() {
        try {
          let e = this.calcExp.replace(/Ans/g, this.calcLastAns).replace(/×/g,"*").replace(/÷/g,"/").replace(/\^/g,"**");
          if (e.includes("ˣ√")) {
             let parts = e.split("ˣ√");
             if(parts.length===2) e = `Math.pow(${parts[1]}, 1/${parts[0]})`;
          }
          let res = eval(e);
          this.calcLastAns = res;
          this.calcExp = String(Math.round(res*10000)/10000);
        } catch(err) { this.calcExp = "Error"; }
        this.updateCalc();
      },
      fillAns: function() {
        document.getElementById('ans-input').value = this.calcExp;
        this.toggleCalc();
      }
    };

    // === P5.js 繪圖區 ===
    function setup() {
      let c = createCanvas(windowWidth, windowHeight);
      c.elt.style.position = "absolute";
      c.elt.style.top = "0";
      c.elt.style.left = "0";
      c.elt.style.zIndex = "1"; // Canvas 在底層
      noLoop(); // 初始選單不重繪
      
      app.init();
    }

    function windowResized() { resizeCanvas(windowWidth, windowHeight); }

    function draw() {
      background(20);

      // 1. 繪製 3D 場景
      draw3D();

      // 2. 繪製怪物
      if (app.state === "playing" && !app.isWalking && app.question) {
        push();
        translate(width/2, height/2);
        textAlign(CENTER, CENTER);
        textSize(min(width,height)*0.3);
        let icon = ["🦠","💀","👹","🐲","😈"][app.level-1] || "👾";
        text(icon, 0, 0);
        pop();
      }

      // 3. 繪製題目板
      if (app.state === "playing" && !app.isWalking && app.question) {
        fill(0,0,0,200); stroke(255); strokeWeight(2);
        let bw = min(600, width*0.9);
        let bh = height * 0.3;
        rect((width-bw)/2, height*0.15, bw, bh, 10);
        
        fill(255); noStroke(); textAlign(LEFT, TOP);
        textSize(min(width,height)*0.045);
        text(app.question.text, (width-bw)/2 + 20, height*0.15 + 20);
      }

      // 4. 特效
      if (app.isWalking) {
        app.walkFrame++;
        if (app.walkFrame > 40) {
          app.isWalking = false;
          app.nextQuestion();
        }
      }
      if (app.hurtFlash > 0) {
        fill(255,0,0,app.hurtFlash); noStroke(); rect(0,0,width,height);
        app.hurtFlash -= 10;
      }
      if (app.attackFlash > 0) {
        fill(255,255,255,app.attackFlash); noStroke(); rect(0,0,width,height);
        app.attackFlash -= 10;
      }

      // 5. 結束畫面
      if (app.state === "levelClear" || app.state === "gameOver") {
        fill(0,0,0,220); rect(0,0,width,height);
        fill(255); textAlign(CENTER, CENTER); textSize(40);
        let msg = (app.state === "levelClear") ? "🎉 任務完成！" : "💀 挑戰失敗...";
        text(msg, width/2, height/2);
        textSize(20); fill(200);
        text("點擊畫面返回選單", width/2, height/2 + 50);
      }
    }

    function draw3D() {
      let horizon = height/2;
      if (app.isWalking) horizon += Math.sin(app.walkFrame * 0.5) * 15;
      
      noStroke();
      fill(30); rect(0,0,width,horizon); // 天
      fill(50); rect(0,horizon,width,height-horizon); // 地
      
      // 遠處盡頭
      let size = width * 0.15;
      fill(0); rect((width-size)/2, horizon-size/2, size, size);
      
      stroke(100); strokeWeight(2);
      line(0,0, (width-size)/2, horizon-size/2);
      line(width,0, (width+size)/2, horizon-size/2);
      line(0,height, (width-size)/2, horizon+size/2);
      line(width,height, (width+size)/2, horizon+size/2);
    }

    function mousePressed() {
      if (app.state === "levelClear" || app.state === "gameOver") {
        app.backToMenu();
      }
    }
  </script>
</body>
</html>
