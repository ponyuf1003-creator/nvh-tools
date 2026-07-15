/* 小小识字岛 —— 核心：数据 / 存储 / 遗忘曲线 / 语音 */

/* ---------- 数据 ---------- */
const AppData = {
  chars: [],            // [{c,p,u,w,s?,e?}]
  map: {},              // c -> entry
  async load() {
    if (this.chars.length) return this.chars;
    if (window.CHARS_DATA) {
      this.chars = window.CHARS_DATA;          // data/chars.js 以 <script> 方式载入，file:// 下也可用
    } else {
      const res = await fetch('data/chars.json');
      this.chars = await res.json();
    }
    this.chars.forEach(e => this.map[e.c] = e);
    return this.chars;
  }
};

/* ---------- 存储 ---------- */
const Store = {
  KEY: 'hanzi_island_v1',
  state: null,
  load() {
    if (this.state) return this.state;
    try { this.state = JSON.parse(localStorage.getItem(this.KEY)); } catch (e) {}
    if (!this.state) this.state = {};
    const s = this.state;
    s.srs = s.srs || {};          // char -> {lv, due, wrong, k?}
    s.stars = s.stars || 0;
    s.log = s.log || {};          // date -> {new:[], rev:0, stars:0}
    s.done = s.done || {};        // date -> {learn,review,game}
    s.settings = Object.assign({ newPerDay: 3, reviewCap: 20, speechRate: 0.6 }, s.settings || {});
    return s;
  },
  save() { localStorage.setItem(this.KEY, JSON.stringify(this.state)); },
  today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  todayLog() {
    const s = this.load(), t = this.today();
    s.log[t] = s.log[t] || { new: [], rev: 0, stars: 0 };
    return s.log[t];
  },
  todayDone() {
    const s = this.load(), t = this.today();
    s.done[t] = s.done[t] || {};
    return s.done[t];
  },
  addStar(n) {
    const s = this.load();
    s.stars += n;
    this.todayLog().stars += n;
    this.save();
  },
  streak() {
    const s = this.load();
    let n = 0, d = this.today();
    // 今天有记录也算
    if (!s.log[d] || (!s.log[d].new.length && !s.log[d].rev)) d = this.addDays(d, -1);
    while (s.log[d] && (s.log[d].new.length || s.log[d].rev)) { n++; d = this.addDays(d, -1); }
    return n;
  }
};

/* ---------- 遗忘曲线（简化 SM-2 / Leitner） ---------- */
const SRS = {
  INTERVALS: [1, 2, 4, 7, 15, 30],   // 级别0..5 → 下次间隔天数；答完级别5 = 毕业
  entry(c) { return Store.load().srs[c]; },
  isKnown(c) { const e = this.entry(c); return e && e.k; },
  isLearned(c) { return !!this.entry(c); },   // 学过（含已认识/毕业）

  /* 今日到期复习 */
  dueList() {
    const t = Store.today(), s = Store.load();
    return Object.keys(s.srs).filter(c => {
      const e = s.srs[c];
      return !e.k && e.lv <= 5 && e.due && e.due <= t;
    });
  },
  /* 今日新字：按字表顺序取还没学过的 */
  newList(n) {
    const s = Store.load();
    const out = [];
    for (const e of AppData.chars) {
      if (!s.srs[e.c]) { out.push(e.c); if (out.length >= n) break; }
    }
    return out;
  },
  /* 学会一个新字 → 明天首次复习 */
  onLearned(c) {
    const s = Store.load();
    if (!s.srs[c]) s.srs[c] = { lv: 0, due: Store.addDays(Store.today(), 1), wrong: 0 };
    Store.save();
  },
  /* 复习一次 */
  onReview(c, correct) {
    const s = Store.load(), e = s.srs[c];
    if (!e || e.k) return;
    if (correct) {
      if (e.lv >= 5) { e.lv = 6; e.due = ''; }          // 毕业
      else { e.due = Store.addDays(Store.today(), this.INTERVALS[e.lv]); e.lv += 1; }
    } else {
      e.wrong = (e.wrong || 0) + 1;
      e.lv = Math.max(0, e.lv - 1);
      e.due = Store.addDays(Store.today(), 1);
    }
    Store.save();
  },
  /* 家长摸底：标记已认识/取消 */
  setKnown(c, known) {
    const s = Store.load();
    if (known) s.srs[c] = { lv: 6, due: '', wrong: 0, k: 1 };
    else delete s.srs[c];
    Store.save();
  },
  /* 学习字池（游戏用）：所有学过的字 */
  pool() {
    const s = Store.load();
    return Object.keys(s.srs);
  },
  stats() {
    const s = Store.load();
    let known = 0, learning = 0, grad = 0;
    for (const c in s.srs) {
      const e = s.srs[c];
      if (e.k) known++;
      else if (e.lv >= 6) grad++;
      else learning++;
    }
    return { known, learning, grad, total: AppData.chars.length || 1000,
             met: known + learning + grad, due: this.dueList().length };
  }
};

/* ---------- 语音（Web Speech API） ---------- */
const Speech = {
  voice: null,
  init() {
    const pick = () => {
      const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.replace('_', '-').startsWith('zh'));
      // 按自然度优先：Google 普通话 > 婷婷(苹果) > Siri > 其他中文
      this.voice =
        vs.find(v => /Google/i.test(v.name) && /CN|普通话/i.test(v.name + v.lang)) ||
        vs.find(v => /Tingting|婷婷/i.test(v.name)) ||
        vs.find(v => /Siri/i.test(v.name)) ||
        vs.find(v => v.lang.replace('_', '-') === 'zh-CN') || vs[0] || null;
    };
    pick();
    if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = pick;
  },
  _audio: null,
  /* 预录音频优先（各设备统一标准普通话），TTS 兜底 */
  speak(text, rate) {
    if (this._audio) { try { this._audio.pause(); } catch (e) {} this._audio = null; }
    try { speechSynthesis.cancel(); } catch (e) {}
    const a = new Audio('audio/' + encodeURIComponent(text) + '.m4a');
    // 语速设置映射为播放速率（音频本身已按慢速录制）
    const r = (rate || Store.load().settings.speechRate || 0.6) / 0.6;
    a.playbackRate = Math.max(0.8, Math.min(1.3, r));
    this._audio = a;
    a.onerror = () => { this._audio = null; this.tts(text, rate); };
    a.play().catch(() => { this._audio = null; this.tts(text, rate); });
  },
  tts(text, rate) {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      if (this.voice) u.voice = this.voice;
      u.rate = rate || Store.load().settings.speechRate || 0.6;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
};
Speech.init();

/* ---------- 奖励：星星换小动物 ---------- */
const ANIMALS = [
  ['🐣','小鸡毛毛'],['🐰','兔子跳跳'],['🐱','猫咪咪咪'],['🐶','小狗汪汪'],['🐼','熊猫团团'],
  ['🦊','狐狸红红'],['🐨','考拉抱抱'],['🐷','小猪噜噜'],['🐸','青蛙呱呱'],['🦁','狮子王王'],
  ['🐯','老虎条条'],['🐵','猴子淘淘'],['🐧','企鹅摇摇'],['🦉','猫头鹰博士'],['🦄','独角兽仙仙'],
  ['🐬','海豚蓝蓝'],['🐢','乌龟慢慢'],['🦋','蝴蝶飞飞'],['🐿️','松鼠果果'],['🦒','长颈鹿高高'],
  ['🐘','大象壮壮'],['🦜','鹦鹉巧巧'],['🐳','鲸鱼泡泡'],['🦔','刺猬球球'],['🐉','小龙隆隆'],
];
const STAR_PER_ANIMAL = 15;
function unlockedAnimals() { return Math.min(ANIMALS.length, Math.floor(Store.load().stars / STAR_PER_ANIMAL)); }

/* ---------- 小工具 ---------- */
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function sample(a, n, exclude) {
  const ex = new Set(exclude || []);
  return shuffle(a.filter(x => !ex.has(x))).slice(0, n);
}
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}
/* 金币奖励特效：从 anchor 飞向右上角星星栏 */
function coinDing(delay) {
  try {
    const ctx = coinDing._ctx || (coinDing._ctx = new (window.AudioContext || window.webkitAudioContext)());
    [880, 1174].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f;
      const t = ctx.currentTime + (delay || 0) + i * 0.09;
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.start(t); o.stop(t + 0.3);
    });
  } catch (e) {}
}
function coinBurst(anchor, n) {
  n = n || 3;
  const dst = document.querySelector('.stars-chip');
  if (!anchor || !dst) return;
  const s = anchor.getBoundingClientRect(), d = dst.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      coinDing(0);
      const el = document.createElement('div');
      el.className = 'coin-fly';
      const sx = s.left + s.width / 2 - 24 + (Math.random() * 70 - 35);
      const sy = s.top + s.height / 2 - 24 + (Math.random() * 30 - 15);
      el.style.left = sx + 'px'; el.style.top = sy + 'px';
      el.style.setProperty('--tx', (d.left + d.width / 2 - sx - 24) + 'px');
      el.style.setProperty('--ty', (d.top + d.height / 2 - sy - 24) + 'px');
      document.body.appendChild(el);
      setTimeout(() => {
        el.remove();
        dst.classList.remove('pop'); void dst.offsetWidth; dst.classList.add('pop');
      }, 830);
    }, i * 170);
  }
}

/* 简易彩带 */
function confetti() {
  const colors = ['#FF9F43','#6BCB77','#4D96FF','#FF6B9D','#FFD93D'];
  for (let i = 0; i < 36; i++) {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;top:-12px;left:${Math.random()*100}vw;width:10px;height:10px;z-index:98;pointer-events:none;
      background:${colors[i%colors.length]};border-radius:${Math.random()>.5?'50%':'2px'};
      transition:transform ${1.6+Math.random()}s ease-in, opacity 2.2s;`;
    document.body.appendChild(d);
    requestAnimationFrame(() => {
      d.style.transform = `translateY(${100+Math.random()*15}vh) rotate(${Math.random()*720}deg)`;
      d.style.opacity = '0';
    });
    setTimeout(() => d.remove(), 2600);
  }
}
