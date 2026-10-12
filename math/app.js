/* 数学王国：10 以内 → 20 以内（凑十法 / 破十法），对标人教版一年级 */
const EMOJIS = ['🐱', '🐶', '🐰', '🐸', '🐥', '🐟', '🦋', '🍎', '🎈', '⭐'];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const emo = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function row(e, n, gone) { let s = ''; for (let i = 0; i < n; i++) s += (gone && i >= n - gone) ? `<span class="gone">${e}</span>` : e; return s; }

/* ---------- 十格框（凑十法、破十法的核心教具） ---------- */
// cells: 长度 10 的数组，元素为 'f'(红) / 'b'(蓝) / '' (空)，可附加 hl / x
function tf(cells) { return `<div class="tf">${cells.map(c => `<i class="${c}"></i>`).join('')}</div>`; }
function frame(n, o) { o = o || {}; const c = [];
  for (let i = 0; i < 10; i++) { let k = i < n ? (o.blueFrom !== undefined && i >= o.blueFrom ? 'b' : 'f') : '';
    if (i < n && o.cross && i >= n - o.cross) k += ' x';
    if (o.hl && i >= o.hl[0] && i < o.hl[1]) k += ' hl'; c.push(k); }
  return tf(c); }
const dots = (n, red) => n > 0 ? `<span class="dots${red ? ' r' : ''}">${'<i></i>'.repeat(n)}</span>` : '';
const teen = (n, o) => frame(Math.min(n, 10), o) + (n > 10 ? frame(n - 10, o && o.second) : '');
const vis = h => `<div class="q-visual tfw">${h}</div>`;
const formula = (s) => `<div class="q-formula">${s.replace('?', '<span class="qm">?</span>')}</div>`;

const SKILLS = [
  // 第一阶段：10 以内
  { id: 'c5', ic: '🐣', name: '数一数', sub: '5以内点数', need: 12, gen: () => genCount(5), st: 1 },
  { id: 'c10', ic: '🐥', name: '数一数', sub: '10以内点数', need: 12, gen: () => genCount(10), st: 1 },
  { id: 'cmp', ic: '⚖️', name: '比多少', sub: '哪边多，哪边少', need: 10, gen: genCompare, st: 1 },
  { id: 'd5', ic: '🦋', name: '分与合', sub: '5以内的组成', need: 12, gen: () => genComp(5), st: 1 },
  { id: 'd10', ic: '🦋', name: '分与合', sub: '10以内的组成', need: 15, gen: () => genComp(10), st: 1 },
  { id: 'a5', ic: '➕', name: '加法', sub: '5以内', need: 12, gen: () => genAdd(5), st: 1 },
  { id: 's5', ic: '➖', name: '减法', sub: '5以内', need: 12, gen: () => genSub(5), st: 1 },
  { id: 'a10', ic: '➕', name: '加法', sub: '10以内', need: 16, gen: () => genAdd(10), st: 1 },
  { id: 's10', ic: '➖', name: '减法', sub: '10以内', need: 16, gen: () => genSub(10), st: 1 },
  // 第二阶段：20 以内
  { id: 'n20', ic: '🔟', name: '认识11~20', sub: '几个十和几个一', need: 12, gen: genN20, st: 2 },
  { id: 'a20n', ic: '➕', name: '十几加几', sub: '不进位加法', need: 12, gen: genA20n, st: 2 },
  { id: 's20n', ic: '➖', name: '十几减几', sub: '不退位减法', need: 12, gen: genS20n, st: 2 },
  { id: 'mk10', ic: '🤝', name: '凑十朋友', sub: '几和几凑成 10', need: 12, gen: genMk10, st: 2, method: 'mk10' },
  { id: 'a20c', ic: '🧩', name: '凑十法', sub: '20以内进位加法', need: 24, gen: genA20c, st: 2, method: 'add' },
  { id: 's20b', ic: '🔨', name: '破十法', sub: '20以内退位减法', need: 24, gen: genS20b, st: 2, method: 'sub' },
  { id: 'mix20', ic: '⚡', name: '口算小达人', sub: '20以内加减混合', need: 20, gen: genMix20, st: 2 },
  { id: 'word20', ic: '📝', name: '看图列式', sub: '解决生活小问题', need: 12, gen: genWord20, st: 2 },
];
const SMAP = {}; SKILLS.forEach(s => SMAP[s.id] = s);

function numOpts(ans, max) {
  const set = new Set([ans]); let g = 0;
  while (set.size < 4 && g++ < 60) set.add(Math.max(0, Math.min(max + 2, ans + rnd(-3, 3))));
  let e = 0; while (set.size < 4) set.add(max + 3 + e++);
  return shuffle([...set]);
}

/* ---------- 第一阶段 ---------- */
function genCount(max) {
  const n = rnd(max === 5 ? 1 : 5, max), e = emo();
  return { sk: max === 5 ? 'c5' : 'c10', title: `数一数，有几个${e}？`, visual: `<div class="q-visual">${row(e, n)}</div>`, opts: numOpts(n, max), ans: n };
}
function genCompare() {
  const e1 = emo(); let e2 = emo(); while (e2 === e1) e2 = emo();
  const a = rnd(2, 8); let b = rnd(2, 8); while (b === a) b = rnd(2, 8);
  const more = Math.random() > .5;
  return { sk: 'cmp', title: `哪一排${more ? '多' : '少'}？点它！`, rows: true, visual: '', opts: [row(e1, a), row(e2, b)], ans: more ? (a > b ? 0 : 1) : (a < b ? 0 : 1) };
}
function genComp(max) {
  const t = rnd(3, max), p = rnd(1, t - 1), m = t - p;
  return { sk: max === 5 ? 'd5' : 'd10', title: `${t} 可以分成 ${p} 和几？`,
    visual: formula(`${t} = ${p} + ?`) + `<div class="q-visual" style="font-size:2rem">${row('🦋', p)}<span style="opacity:.35">${row('🦋', m)}</span></div>`, opts: numOpts(m, max), ans: m };
}
function genAdd(max) {
  const a = rnd(1, max - 1), b = rnd(1, max - a), e = emo();
  return { sk: max === 5 ? 'a5' : 'a10', title: '一共有几个？', visual: `<div class="q-visual" style="font-size:2.2rem">${row(e, a)} <b style="color:var(--green)">+</b> ${row(e, b)}</div>` + formula(`${a} + ${b} = ?`), opts: numOpts(a + b, max), ans: a + b };
}
function genSub(max) {
  const a = rnd(2, max), b = rnd(1, a - 1), e = emo();
  return { sk: max === 5 ? 's5' : 's10', title: `划掉的${e}走掉了，还剩几个？`, visual: `<div class="q-visual" style="font-size:2.2rem">${row(e, a, b)}</div>` + formula(`${a} − ${b} = ?`), opts: numOpts(a - b, max), ans: a - b };
}

/* ---------- 第二阶段：20 以内 ---------- */
function genN20() {
  const n = rnd(11, 20), u = n - 10, v = n === 20 ? 0 : rnd(0, 3);
  const pic = vis(n === 20 ? frame(10) + frame(10) : frame(10) + frame(u));
  if (v === 0) return { sk: 'n20', title: '一共有几个？（一个满框是 10 个）', visual: pic, opts: numOpts(n, 20), ans: n };
  if (v === 1) return { sk: 'n20', title: `1 个十和 ${u} 个一，合起来是几？`, visual: pic, opts: numOpts(n, 20), ans: n };
  if (v === 2) return { sk: 'n20', title: `${n} 里面有 1 个十和几个一？`, visual: pic, opts: numOpts(u, 10), ans: u };
  const k = rnd(11, 19), after = Math.random() > .5;
  return { sk: 'n20', title: `${k} ${after ? '后面' : '前面'}的一个数是几？`,
    visual: formula(after ? `${k}，?` : `?，${k}`), opts: numOpts(after ? k + 1 : k - 1, 20), ans: after ? k + 1 : k - 1 };
}
function genA20n() {
  const x = rnd(0, 8), a = 10 + x, b = rnd(1, 9 - x);
  return { sk: 'a20n', title: '一共有几个？', visual: vis(teen(a) + '<b style="color:var(--green)">+</b>' + dots(b)) + formula(`${a} + ${b} = ?`), opts: numOpts(a + b, 20), ans: a + b,
    hint: `${a} 是 1 个十和 ${x} 个一，<br>个位上 ${x} + ${b} = ${x + b}，<br>所以 ${a} + ${b} = <b>?</b>` };
}
function genS20n() {
  const x = rnd(1, 9), a = 10 + x, b = rnd(1, x);
  return { sk: 's20n', title: '划掉的走掉了，还剩几个？', visual: vis(frame(10) + frame(x, { cross: b })) + formula(`${a} − ${b} = ?`), opts: numOpts(a - b, 20), ans: a - b,
    hint: `个位上 ${x} − ${b} = ${x - b}，<br>再加上 1 个十，<br>所以 ${a} − ${b} = <b>?</b>` };
}
function genMk10() {
  const k = rnd(1, 9), v = rnd(0, 1);
  return { sk: 'mk10', title: v ? `${k} + ? = 10` : `${k} 和几凑成 10？`, visual: vis(frame(k)) + (v ? '' : formula(`${k} + ? = 10`)), opts: numOpts(10 - k, 10), ans: 10 - k,
    hint: '一九一九好朋友，二八二八手拉手，<br>三七三七真亲密，四六四六一起走，<br>五五凑成一双手' };
}
const addHint = (a, b) => { const need = 10 - a, rest = b - need;
  return `🧩 凑十法：看大数 ${a}，还差 ${need} 凑成 10<br>把 ${b} 分成 ${need} 和 ${rest}<br>${a} + ${need} = 10，10 + ${rest} = <b>?</b>`; };
const subHint = (a, b) => { const u = a - 10;
  return `🔨 破十法：把 ${a} 分成 10 和 ${u}<br>10 − ${b} = ${10 - b}，${10 - b} + ${u} = <b>?</b><br><span style="color:#7C8B7F">也可以想：${b} + ( ? ) = ${a}</span>`; };
function addQ(direct) {
  const a = pick([9, 9, 9, 8, 8, 8, 7, 7, 6, 5]), b = rnd(Math.max(2, 11 - a), 9), need = 10 - a, rest = b - need, t = direct ? 3 : rnd(0, 2);
  const base = { sk: 'a20c', hint: addHint(a, b) };
  if (t === 0) return { ...base, title: `${a} + ${b}：${a} 还差几就凑成 10？`, visual: vis(frame(a) + dots(b)) + formula(`${a} + ? = 10`), opts: numOpts(need, 10), ans: need };
  if (t === 1) return { ...base, title: `把 ${b} 分成 ${need} 和几？`, visual: vis(frame(a) + dots(b)) + `<div class="q-visual tfw"><span class="split">${b}<span class="v">↙ ↘</span>${need}　?</span></div>`, opts: numOpts(rest, 9), ans: rest };
  if (t === 2) return { ...base, title: `凑成 10 啦！还剩 ${rest} 个，一共是几？`, visual: vis(frame(10, { blueFrom: a }) + dots(rest)) + formula(`10 + ${rest} = ?`), opts: numOpts(a + b, 20), ans: a + b };
  return { ...base, title: '算一算', visual: formula(`${a} + ${b} = ?`), opts: numOpts(a + b, 20), ans: a + b };
}
function subQ(direct) {
  const a = rnd(11, 18), u = a - 10, b = rnd(u + 1, 9), t = direct ? 3 : rnd(0, 2);
  const base = { sk: 's20b', hint: subHint(a, b) };
  if (t === 0) return { ...base, title: `${a} − ${b}：个位 ${u} 不够减 ${b}，把 ${a} 分成 10 和几？`, visual: vis(frame(10) + frame(u)) + `<div class="q-visual tfw"><span class="split">${a}<span class="v">↙ ↘</span>10　?</span></div>`, opts: numOpts(u, 9), ans: u };
  if (t === 1) return { ...base, title: `从 10 里减去 ${b}，还剩几？`, visual: vis(frame(10, { cross: b }) + frame(u)) + formula(`10 − ${b} = ?`), opts: numOpts(10 - b, 10), ans: 10 - b };
  if (t === 2) return { ...base, title: `剩下的合起来是几？`, visual: vis(frame(10, { cross: b }) + frame(u)) + formula(`${10 - b} + ${u} = ?`), opts: numOpts(a - b, 20), ans: a - b };
  return { ...base, title: '算一算', visual: formula(`${a} − ${b} = ?`), opts: numOpts(a - b, 20), ans: a - b };
}
// 熟练度越高，直接口算题越多（先分步、后直接）
const directRate = id => Math.min(.85, (load().mastery[id] || 0) / 30 + .2);
function genA20c() { return addQ(Math.random() < directRate('a20c')); }
function genS20b() { return subQ(Math.random() < directRate('s20b')); }
function genMix20() {
  const q = pick([() => addQ(true), () => subQ(true), genA20n, genS20n])();
  return { ...q, sk: 'mix20', title: '算一算', visual: q.visual.includes('q-formula') ? q.visual.slice(q.visual.lastIndexOf('<div class="q-formula">')) : q.visual };
}
function genWord20() {
  const T = [
    { op: '+', e: '🐦', t: (a, b) => `树上有 ${a} 只小鸟，又飞来 ${b} 只，一共有几只？` },
    { op: '+', e: '🍓', t: (a, b) => `盒子里有 ${a} 个草莓，妈妈又放进 ${b} 个，现在有几个？` },
    { op: '-', e: '🍎', t: (a, b) => `盘子里有 ${a} 个苹果，吃掉了 ${b} 个，还剩几个？` },
    { op: '-', e: '🦆', t: (a, b) => `池塘里有 ${a} 只小鸭，游走了 ${b} 只，还剩几只？` },
    { op: 'c', e: '✏️', t: (a, b) => `小明有 ${a} 支铅笔，小红有 ${b} 支，小明比小红多几支？` },
  ];
  const T0 = pick(T); let a, b;
  if (T0.op === '+') { a = rnd(3, 12); b = rnd(2, Math.min(9, 20 - a)); } else { a = rnd(8, 18); b = rnd(2, Math.min(9, a - 1)); }
  const ans = T0.op === '+' ? a + b : a - b, f = T0.op === '+' ? `${a} + ${b}` : `${a} − ${b}`;
  const pic = `<div class="q-visual" style="font-size:1.5rem;letter-spacing:2px">${T0.op === '-' ? row(T0.e, a, b) : row(T0.e, a) + ' ' + (T0.op === '+' ? '<b style="color:var(--green)">+</b> ' + row(T0.e, b) : '<br>' + row(T0.e, b))}</div>`;
  if (Math.random() < .5) {
    const wrong = T0.op === '+' ? [`${a} − ${b}`, `${a} + ${b + 1}`, `${a + 1} + ${b}`] : [`${a} + ${b}`, `${a} − ${b + 1}`, `${a + 1} − ${b}`];
    return { sk: 'word20', title: T0.t(a, b) + '<br><span style="color:#E8620C">怎样列算式？</span>', visual: pic, opts: shuffle([f, ...wrong.slice(0, 3)]), ans: f, small: true };
  }
  return { sk: 'word20', title: T0.t(a, b), visual: pic, opts: numOpts(ans, 20), ans, hint: `列式：${f} = <b>?</b>` };
}

/* ---------- 方法演示（分步动画 + 朗读） ---------- */
const METHODS = {
  mk10: { name: '凑十朋友', steps: [
    { v: vis(frame(9) + '<b>+</b>' + frame(1, {})), t: '<b>9</b> 和 <b>1</b> 凑成 10', a: 'm_mk1' },
    { v: vis(frame(8) + '<b>+</b>' + frame(2)), t: '<b>8</b> 和 <b>2</b> 凑成 10', a: 'm_mk2' },
    { v: vis(frame(7) + '<b>+</b>' + frame(3)), t: '<b>7</b> 和 <b>3</b>、<b>6</b> 和 <b>4</b>、<b>5</b> 和 <b>5</b>，都能凑成 10', a: 'm_mk3' },
    { v: '<div class="rhyme">一九一九好朋友，二八二八手拉手，<br>三七三七真亲密，四六四六一起走，<br>五五凑成一双手</div>', t: '一起来念凑十歌！', a: 'm_mk4' }] },
  add: { name: '凑十法', steps: [
    { v: vis(frame(9) + '<b>+</b>' + dots(4)), t: '<b>9 + 4 = ?</b><br>框里有 9 个，再来 1 个就满 10 个啦', a: 'm_add1' },
    { v: vis(frame(10, { blueFrom: 9, hl: [9, 10] }) + dots(3)) + `<div class="q-visual tfw"><span class="split">4<span class="v">↙ ↘</span>1　3</span></div>`, t: '把 4 分成 <b>1</b> 和 <b>3</b><br>9 + 1 = <b>10</b>，凑成十！', a: 'm_add2' },
    { v: vis(frame(10, { blueFrom: 9 }) + dots(3)), t: '10 再加剩下的 3<br>10 + 3 = <b>13</b>', a: 'm_add3' },
    { v: formula('9 + 4 = 13') + '<div class="rhyme">看大数，拆小数，<br>凑成十，加余数</div>', t: '这就是<b>凑十法</b>！', a: 'm_add4' }] },
  sub: { name: '破十法', steps: [
    { v: vis(frame(10) + frame(3)), t: '<b>13 − 9 = ?</b><br>个位只有 3 个，不够减 9 个', a: 'm_sub1' },
    { v: vis(frame(10, { hl: [0, 10] }) + frame(3)) + `<div class="q-visual tfw"><span class="split">13<span class="v">↙ ↘</span>10　3</span></div>`, t: '把 13 分成 <b>10</b> 和 <b>3</b>', a: 'm_sub2' },
    { v: vis(frame(10, { cross: 9 }) + frame(3)), t: '从 10 里减去 9，还剩 1<br>10 − 9 = <b>1</b>', a: 'm_sub3' },
    { v: vis(frame(10, { cross: 9 }) + frame(3)), t: '剩下的 1 和 3 合起来<br>1 + 3 = <b>4</b>', a: 'm_sub4' },
    { v: formula('13 − 9 = 4') + '<div class="rhyme">破十法：先拆数，<br>十减去，再相加<br><span style="color:#7C8B7F">也可以想：9 + ( 4 ) = 13</span></div>', t: '这就是<b>破十法</b>！', a: 'm_sub5' }] },
};
const AUD = new Audio();
function say(k) { try { AUD.src = 'audio/' + k + '.m4a'; const p = AUD.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }

function showMethod(id, then) {
  const M = METHODS[id]; let i = 0;
  const step = () => {
    if (i >= M.steps.length) { load(); S.seen[id] = true; save(); return then(); }
    const st = M.steps[i];
    stage().innerHTML = `<div class="pbar"><i style="width:${i / M.steps.length * 100}%"></i></div>
      <div class="card"><div class="q-title">📖 学方法：${M.name}</div>${st.v}<div class="demo-text">${st.t}</div>
      <button class="speaker" id="spk">🔊</button></div>
      <button class="btn" id="nx">${i < M.steps.length - 1 ? '下一步 ➡️' : '我学会了，开始练习 ✍️'}</button>`;
    document.getElementById('spk').onclick = () => say(st.a);
    setTimeout(() => say(st.a), 300);
    document.getElementById('nx').onclick = () => { i++; step(); };
  };
  step();
}

/* ============ 存储 ============ */
const KEY = 'math_kingdom_v1';
let S = null;
function load() { if (S) return S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!S) S = {};
  S.mastery = S.mastery || {}; S.wrongQ = S.wrongQ || []; S.stars = S.stars || 0; S.done = S.done || {}; S.seen = S.seen || {};
  return S; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => ymd(new Date());
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return ymd(d); };
function curSkillIdx() { load();
  for (let i = 0; i < SKILLS.length; i++) if ((S.mastery[SKILLS[i].id] || 0) < SKILLS[i].need) return i;
  return SKILLS.length - 1; }

/* ============ 特效 ============ */
function sfx(ok) { try { const ctx = sfx._c || (sfx._c = new (window.AudioContext || window.webkitAudioContext)());
  (ok ? [[523, 0], [659, .12], [784, .24]] : [[300, 0], [240, .16]]).forEach(([f, d]) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination);
    o.type = ok ? 'sine' : 'triangle'; o.frequency.value = f; const t = ctx.currentTime + d;
    g.gain.setValueAtTime(ok ? .22 : .14, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); o.start(t); o.stop(t + .3); });
} catch (e) {} }
function coinBurst(anchor, n) { const dst = document.querySelector('.stars-chip'); if (!anchor || !dst) return;
  const s = anchor.getBoundingClientRect(), d = dst.getBoundingClientRect();
  for (let i = 0; i < (n || 3); i++) setTimeout(() => { sfx(true);
    const el = document.createElement('div'); el.className = 'coin-fly';
    const sx = s.left + s.width / 2 - 24 + (Math.random() * 70 - 35), sy = s.top + Math.min(s.height, 300) / 2 - 24;
    el.style.left = sx + 'px'; el.style.top = sy + 'px';
    el.style.setProperty('--tx', (d.left + d.width / 2 - sx - 24) + 'px'); el.style.setProperty('--ty', (d.top + d.height / 2 - sy - 24) + 'px');
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); dst.classList.remove('pop'); void dst.offsetWidth; dst.classList.add('pop'); }, 830);
  }, i * 170); }
function confetti() { const cols = ['#3FA25C', '#FF9F43', '#4D96FF', '#FF6B9D', '#FFD93D'];
  for (let i = 0; i < 30; i++) { const d = document.createElement('div');
    d.style.cssText = `position:fixed;top:-12px;left:${Math.random() * 100}vw;width:10px;height:10px;z-index:98;pointer-events:none;background:${cols[i % 5]};border-radius:${Math.random() > .5 ? '50%' : '2px'};transition:transform ${1.6 + Math.random()}s ease-in,opacity 2.2s;`;
    document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = `translateY(${100 + Math.random() * 15}vh) rotate(${Math.random() * 720}deg)`; d.style.opacity = '0'; });
    setTimeout(() => d.remove(), 2600); } }

/* ============ 界面 ============ */
const stage = () => document.getElementById('stage');
const N_PER_DAY = 10;
let session = [], qIdx = 0, right = 0, lock = false, curQ = null, nav = 0;

function home() {
  load(); nav++;
  document.getElementById('stars').textContent = S.stars;
  const ci = curSkillIdx(), cur = SKILLS[ci], doneToday = S.done[today()];
  try { localStorage.setItem('plan_hint_math', `${cur.ic} ${cur.name}（${cur.sub}）· ${N_PER_DAY} 道题`); } catch (e) {}
  const hero = doneToday
    ? `<div class="btn-hero" style="background:linear-gradient(135deg,#6FCB88,#A8E6B8);box-shadow:0 6px 0 #4CA866" id="hero">
        <div class="icon">🎉</div><div><div class="t">今天练完啦！</div><div class="d">还想玩？点我再来一轮</div></div></div>`
    : `<div class="btn-hero" id="hero"><div class="icon">▶️</div><div><div class="t">开始今天的练习</div><div class="d">${cur.ic} ${cur.name}（${cur.sub}）· ${N_PER_DAY} 道题</div></div></div>`;
  const methods = SKILLS.filter((s, i) => s.method && i <= ci);
  const rows = st => SKILLS.map((sk, i) => {
    if (sk.st !== st) return '';
    const m = Math.min(S.mastery[sk.id] || 0, sk.need);
    return `<div class="skill-row${i === ci ? ' now' : i > ci ? ' locked' : ''}">
      <div class="ic">${m >= sk.need ? '✅' : sk.ic}</div><div class="nm">${sk.name}<small>${sk.sub}</small></div>
      <div class="sbar"><i style="width:${(m / sk.need * 100).toFixed(0)}%"></i></div></div>`; }).join('');
  stage().innerHTML = `${hero}
    ${methods.length ? `<div class="card" style="padding:14px 18px"><div style="font-weight:800;margin-bottom:8px">📖 方法讲解（随时可以再看）</div>
      <div class="seg">${methods.map(s => `<button data-m="${s.method}">${s.ic} ${METHODS[s.method].name}</button>`).join('')}</div></div>` : ''}
    <div class="card"><div style="font-weight:800">🗺️ 闯关地图</div>
      <div class="sec">第一阶段 · 10 以内</div>${rows(1)}
      <div class="sec">第二阶段 · 20 以内（一年级重点）</div>${rows(2)}</div>
    <p class="muted" style="text-align:center">练熟一关自动开下一关 · 做错的题明天会再出现</p>
    <p style="text-align:center;margin-top:14px"><button class="hintbtn" id="parent" style="background:none;color:#A9B6AC">⚙️ 家长：调整进度</button></p>`;
  document.getElementById('hero').onclick = startSession;
  document.getElementById('parent').onclick = parentPanel;
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => showMethod(b.dataset.m, home));
}

function parentPanel() {
  load(); nav++;
  stage().innerHTML = `<div class="card"><div style="font-weight:900;font-size:1.1rem">⚙️ 调整进度</div>
    <p class="muted" style="margin:6px 0 10px">孩子已经会的关卡可以直接标记"已掌握"，练习会从下一关开始。已掌握的关卡仍会在练习中少量出现，用来巩固。</p>
    <button class="btn" id="skip10" style="margin-bottom:12px">✅ 已会 10 以内加减法 → 从"认识11~20"开始</button>
    ${SKILLS.map(sk => { const ok = (S.mastery[sk.id] || 0) >= sk.need;
      return `<div class="skill-row"><div class="ic">${sk.ic}</div><div class="nm">${sk.name}<small>${sk.sub}</small></div>
        <div class="seg"><button data-id="${sk.id}" data-v="1" class="${ok ? 'on' : ''}">已掌握</button><button data-id="${sk.id}" data-v="0" class="${ok ? '' : 'on'}">练习中</button></div></div>`; }).join('')}
    <button class="btn ghost" id="back" style="margin-top:14px">返回</button></div>`;
  const setM = (id, v) => { S.mastery[id] = v ? SMAP[id].need : Math.min(S.mastery[id] || 0, SMAP[id].need - 1); };
  document.querySelectorAll('[data-id]').forEach(b => b.onclick = () => { setM(b.dataset.id, b.dataset.v === '1'); save(); parentPanel(); });
  document.getElementById('skip10').onclick = () => { SKILLS.filter(s => s.st === 1).forEach(s => setM(s.id, true)); save(); home(); };
  document.getElementById('back').onclick = home;
}

function buildSession() {
  load();
  const t = today(), qs = [], due = S.wrongQ.filter(w => w.due <= t);
  due.slice(0, 3).forEach(w => { if (SMAP[w.sk]) qs.push(SMAP[w.sk].gen()); });
  S.wrongQ = S.wrongQ.filter(w => w.due > t).concat(due.slice(3)); save();
  const ci = curSkillIdx();
  while (qs.length < N_PER_DAY - 2) qs.push(SKILLS[ci].gen());
  // 已掌握的关卡做巩固（优先同阶段）
  const mastered = SKILLS.slice(0, ci), near = mastered.filter(s => s.st === SKILLS[ci].st);
  while (qs.length < N_PER_DAY) { const pool = near.length && Math.random() < .7 ? near : mastered; qs.push((pool.length ? pick(pool) : SKILLS[ci]).gen()); }
  return shuffle(qs);
}
function startSession() {
  const cur = SKILLS[curSkillIdx()];
  const go = () => { session = buildSession(); qIdx = 0; right = 0; renderQ(); };
  if (cur.method && !load().seen[cur.method]) showMethod(cur.method, go); else go();
}

function renderQ() {
  lock = false;
  if (qIdx >= session.length) return sessionDone();
  curQ = session[qIdx];
  const isRows = !!curQ.rows;
  stage().innerHTML = `<div class="pbar"><i style="width:${qIdx / session.length * 100}%"></i></div>
    <div class="card"><div class="q-title">${curQ.title}</div>${curQ.visual}
      <div class="opt-grid${isRows ? ' rows' : ''}">${curQ.opts.map((o, i) => `<div class="opt${isRows ? ' row-opt' : ''}" data-i="${i}" style="${curQ.small ? 'font-size:1.6rem' : ''}">${o}</div>`).join('')}</div>
      ${curQ.hint ? `<button class="hintbtn" id="hb">💡 提示</button><div id="hbox"></div>` : ''}
      <div class="fb" id="fb"></div></div>`;
  document.querySelectorAll('.opt').forEach(el => el.onclick = () => pickOpt(el, +el.dataset.i));
  if (curQ.hint) document.getElementById('hb').onclick = () => { document.getElementById('hbox').innerHTML = `<div class="hintbox">${curQ.hint}</div>`; curQ.usedHint = true; };
}
function pickOpt(el, i) {
  if (lock) return;
  const ok = curQ.rows ? i === curQ.ans : curQ.opts[i] === curQ.ans;
  if (ok) {
    lock = true; el.classList.add('right'); sfx(true); right++;
    load(); if (!curQ.marked) S.mastery[curQ.sk] = (S.mastery[curQ.sk] || 0) + 1; save();
    document.getElementById('fb').innerHTML = `<span style="color:var(--green-d)">${curQ.marked ? '改对啦！👍' : '答对啦！🎉'}</span>`;
    qIdx++; const my = nav; setTimeout(() => { if (my === nav) renderQ(); }, 900);
  } else {
    el.classList.add('wrong'); sfx(false); load();
    if (!curQ.marked) { curQ.marked = true; S.wrongQ.push({ sk: curQ.sk, due: tomorrow() }); save(); }
    document.getElementById('fb').innerHTML = `<span style="color:var(--red)">再想想～${curQ.hint ? '可以点"提示"看看方法' : '数一数再点'} 👆</span>`;
    if (curQ.hint && !curQ.usedHint) { const hb = document.getElementById('hbox'); if (hb) hb.innerHTML = `<div class="hintbox">${curQ.hint}</div>`; curQ.usedHint = true; }
    setTimeout(() => el.classList.remove('wrong'), 500);
  }
}
function sessionDone() {
  load(); let starMsg = '';
  if (!S.done[today()]) { S.done[today()] = true; S.stars++; starMsg = '得到一颗星星！'; }
  save(); document.getElementById('stars').textContent = S.stars;
  coinBurst(stage(), 3); confetti();
  const pct = Math.round(right / session.length * 100);
  stage().innerHTML = `<div class="card celebrate"><div class="big">${pct >= 90 ? '🏆' : '💪'}</div>
    <h2>完成 ${session.length} 道题！${starMsg}</h2><p>${pct >= 90 ? '你是数学小天才！' : '做错的题明天会再考你哦'}</p>
    <button class="btn" id="again">再来一轮 🔁</button><button class="btn ghost" id="toHome">回到王国 🏰</button></div>`;
  document.getElementById('again').onclick = startSession; document.getElementById('toHome').onclick = home;
}
home();
