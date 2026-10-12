/* 学习乐园 · 每日学习计划（所有页面共用）
 * 门户页：提供数据接口，由门户渲染"今日计划 / 打卡日历 / 家长设置"
 * 模块页：<script src="../common/plan.js" data-module="hanzi"></script>
 *        自动计时（只在页面可见时计）、到计划时长提醒、到上限（默认 20 分钟）提示休息、完成任务时提示回去打卡
 */
(function () {
  const PKEY = 'study_plan_v1';
  const MODS = {
    hanzi:   { name: '识字岛',     icon: '🏝️', url: 'hanzi/',                  color: '#FF9F43' },
    pinyin:  { name: '拼音星球',   icon: '🚀', url: 'pinyin/',                 color: '#7B61FF' },
    math:    { name: '数学王国',   icon: '🔢', url: 'math/',                   color: '#3FA25C' },
    english: { name: '英语乐园',   icon: '🦉', url: 'english/sightwords.html', color: '#7C3AED' },
    explore: { name: '探索博物馆', icon: '🔭', url: 'explore/',                color: '#3E6FE0' },
  };
  const ORDER = ['hanzi', 'pinyin', 'math', 'english', 'explore'];
  // 默认每周计划：每天 3 项；识字、拼音靠每日复习维持记忆，所以出现得最多
  const DEFAULT = {
    week: { 1: ['hanzi', 'pinyin', 'math'], 2: ['hanzi', 'pinyin', 'english'], 3: ['hanzi', 'pinyin', 'math'],
            4: ['hanzi', 'pinyin', 'english'], 5: ['hanzi', 'pinyin', 'math'], 6: ['hanzi', 'math', 'explore'],
            0: ['pinyin', 'english', 'explore'] },
    mins: { hanzi: 15, pinyin: 15, math: 15, english: 15, explore: 15 },
    cap: 20,
  };

  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => ymd(new Date());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const shift = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

  let P = null;
  function load(force) {
    if (P && !force) return P;
    P = read(PKEY) || {};
    P.settings = P.settings || JSON.parse(JSON.stringify(DEFAULT));
    P.settings.week = P.settings.week || DEFAULT.week;
    P.settings.mins = Object.assign({}, DEFAULT.mins, P.settings.mins || {});
    P.settings.cap = P.settings.cap || DEFAULT.cap;
    P.time = P.time || {};      // date -> {mod: 秒}
    P.manual = P.manual || {};  // date -> {mod: true}  家长手动打卡
    P.days = P.days || {};      // date -> {planned:[], done:[]}  打卡记录
    P.flags = P.flags || {};    // date -> {mod_done_toast: true ...}
    P.since = P.since || today(); // 开始使用计划的日期，之前的日子不计入打卡
    return P;
  }
  function save() { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {} }

  const planFor = date => (load().settings.week[parse(date).getDay()] || []).filter(m => MODS[m]);

  /* ---------- 各模块"今天完成了没有" ---------- */
  function srsDue(s, filter) {
    if (!s || !s.srs) return 0; const t = today();
    return Object.keys(s.srs).filter(k => (!filter || filter(k)) && !s.srs[k].k && s.srs[k].lv <= 5 && s.srs[k].due && s.srs[k].due <= t).length;
  }
  const DETECT = {
    hanzi: d => { const s = read('hanzi_island_v1'); const x = s && s.done && s.done[d]; return !!(x && (x.learn || (x.review && x.read))); },
    pinyin: d => { const s = read('pinyin_planet_v1'); return !!(s && s.day && s.day.date === d && (s.day.lessons > 0 || (Object.keys(s.done || {}).length >= 32 && s.day.review))); },
    math: d => { const s = read('math_kingdom_v1'); return !!(s && s.done && s.done[d]); },
    english: d => { const s = read('sight_words_v1'); const x = s && s.done && s.done[d]; return !!(x && (x.learn || x.review)); },
    explore: d => { const s = read('museum_day_v1'); return !!(s && s.date === d && (s.cards >= 3 || s.quiz)); },
  };
  function isDone(mod, date) {
    date = date || today(); load();
    if (P.manual[date] && P.manual[date][mod]) return true;
    if (date !== today()) { const r = P.days[date]; return !!(r && r.done.includes(mod)); }
    return DETECT[mod] ? DETECT[mod](date) : false;
  }
  const seconds = (mod, date) => { load(); const t = P.time[date || today()]; return t && t[mod] || 0; };

  /* ---------- 有针对性的"今天学什么" ---------- */
  function hint(mod) {
    const h = localStorage.getItem('plan_hint_' + mod) || '';
    if (mod === 'hanzi') {
      const s = read('hanzi_island_v1'), due = Math.min(srsDue(s), (s && s.settings && s.settings.reviewCap) || 20);
      const nn = (s && s.settings && s.settings.newPerDay) || 3;
      return (due ? `复习 ${due} 个字 + ` : '') + `学 ${nn} 个新字 · 每日一读`;
    }
    if (mod === 'pinyin') {
      const s = read('pinyin_planet_v1'), due = Math.min(srsDue(s), 12);
      return (due ? `复习 ${due} 个 + ` : '') + (h || '第 1 关');
    }
    if (mod === 'english') {
      const s = read('sight_words_v1'), due = Math.min(srsDue(s), 15);
      return (due ? `复习 ${due} 个单词 + ` : '') + '学 3 个新单词';
    }
    if (mod === 'math') return h || '10 道练习题';
    if (mod === 'explore') return h || '读 3 张知识卡';
    return h;
  }

  /* ---------- 打卡记录 ---------- */
  function syncToday() {
    load(); const d = today(), planned = planFor(d);
    const done = planned.filter(m => isDone(m, d));
    P.days[d] = { planned, done };
    save(); return P.days[d];
  }
  function dayState(date) {   // 'full' | 'part' | 'none' | 'rest' | 'pre'
    load(); if (date < P.since) return 'pre';
    const r = date === today() ? syncToday() : P.days[date];
    if (!r || !r.planned.length) return date === today() || !r ? (planFor(date).length ? 'none' : 'rest') : 'rest';
    if (r.done.length >= r.planned.length) return 'full';
    return r.done.length ? 'part' : 'none';
  }
  function streak() {
    load(); let d = today(), n = 0;
    if (dayState(d) !== 'full') d = shift(d, -1);
    for (let i = 0; i < 400; i++) { const st = dayState(d); if (st === 'full') n++; else if (st !== 'rest') break; d = shift(d, -1); }
    return n;
  }
  function addSeconds(mod, sec) {
    load(); const d = today(); P.time[d] = P.time[d] || {}; P.time[d][mod] = (P.time[d][mod] || 0) + sec; save();
  }
  function setManual(mod, on, date) {
    load(); date = date || today(); P.manual[date] = P.manual[date] || {};
    if (on) P.manual[date][mod] = true; else delete P.manual[date][mod];
    save(); if (date === today()) syncToday();
  }
  function setHint(mod, text) { try { localStorage.setItem('plan_hint_' + mod, text); } catch (e) {} }

  /* ---------- 爸爸妈妈录的鼓励语音：每完成一个环节随机播一句 ---------- */
  const SELF = document.currentScript && document.currentScript.src;
  const CHEER_N = 5;
  const cheerUrl = k => (SELF ? new URL('cheer/', SELF).href : 'common/cheer/') + 'cheer_' + k + '.m4a';
  const cheerAud = new Audio();
  let lastCheer = 0, lastCheerAt = 0, pendingCheer = 0, cheerUnlocked = false;
  function playCheer(k) {
    try { cheerAud.src = cheerUrl(k); const p = cheerAud.play(); if (p && p.catch) p.catch(() => { pendingCheer = k; }); } catch (e) { pendingCheer = k; }
  }
  // iOS/安卓：在手指第一次点屏幕时解锁这个播放器，之后的鼓励语音才能自动播放；被拦下的语音在下一次点击时补播
  function onTouch() {
    if (!cheerUnlocked) { cheerUnlocked = true;
      if (!pendingCheer) try { cheerAud.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; const p = cheerAud.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
    if (pendingCheer) { const k = pendingCheer; pendingCheer = 0; playCheer(k); }
  }
  document.addEventListener('pointerdown', onTouch, true);
  document.addEventListener('touchstart', onTouch, { capture: true, passive: true });
  function cheer(delay, which) {
    load(); if (P.settings.cheer === false && !which) return;
    if (!which && Date.now() - lastCheerAt < 4000) return;      // 同一个庆祝画面只说一句
    lastCheerAt = Date.now();
    let k = which;
    if (!k) { do { k = 1 + Math.floor(Math.random() * CHEER_N); } while (k === lastCheer && CHEER_N > 1); }
    lastCheer = k;
    setTimeout(() => playCheer(k), delay == null ? 900 : delay);   // 等金币"叮叮"声过去再说
  }

  window.StudyPlan = { MODS, ORDER, DEFAULT, load, save, today, shift, parse, planFor, isDone, seconds, hint,
                       syncToday, dayState, streak, setManual, setHint, addSeconds, cheer, CHEER_N, reload: () => load(true), get data() { return load(); } };

  /* ================= 模块页：计时小标签 + 休息提醒 ================= */
  const me = document.currentScript && document.currentScript.dataset.module;
  if (!me || !MODS[me]) return;

  const css = `
  .sp-chip{position:fixed;left:12px;bottom:12px;z-index:400;background:rgba(43,42,68,.86);color:#fff;border-radius:999px;
    padding:7px 13px;font:700 13px -apple-system,"PingFang SC",sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.18);cursor:pointer;user-select:none}
  .sp-chip.warn{background:#F5A623}.sp-chip.over{background:#E05555}
  .sp-mask{position:fixed;inset:0;z-index:500;background:rgba(30,28,50,.55);display:flex;align-items:center;justify-content:center;padding:20px}
  .sp-box{background:#fff;border-radius:24px;max-width:360px;width:100%;padding:26px 22px;text-align:center;
    font-family:-apple-system,"PingFang SC",sans-serif;color:#2B2A44;box-shadow:0 10px 40px rgba(0,0,0,.25)}
  .sp-box .big{font-size:4rem}.sp-box h3{font-size:1.3rem;margin:8px 0}.sp-box p{color:#7A7896;line-height:1.6;margin-bottom:16px}
  .sp-btn{display:block;width:100%;border:none;border-radius:16px;padding:15px;font-size:1.1rem;font-weight:800;color:#fff;
    background:#FF9F43;box-shadow:0 5px 0 #DC8228;cursor:pointer;font-family:inherit}
  .sp-sub{margin-top:14px;background:none;border:none;color:#B3AECB;font-size:.85rem;cursor:pointer;font-family:inherit;user-select:none}
  .sp-toast{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:450;background:#3FB27F;color:#fff;border-radius:18px;
    padding:12px 16px;font:700 15px -apple-system,"PingFang SC",sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.2);display:flex;gap:10px;align-items:center;width:min(92vw,400px)}
  .sp-toast span{flex:1;min-width:0;line-height:1.4}
  .sp-toast button{border:none;background:#fff;color:#2A8A5F;border-radius:999px;padding:7px 12px;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const fmt = s => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  let chip = null, extra = 0, capShown = false, planShown = false;
  const capOf = () => { load(); return (P.settings.cap * 60) + extra; };
  const planOf = () => { load(); return Math.min(P.settings.mins[me] || 15, P.settings.cap) * 60; };
  const inPlan = () => planFor(today()).includes(me);

  function render() {
    if (!document.body) return;
    if (!chip) {
      chip = document.createElement('div'); chip.className = 'sp-chip'; document.body.appendChild(chip);
      chip.onclick = () => {
        const s = seconds(me), m = Math.round(s / 60);
        alertBox('⏱️', `今天${MODS[me].name}已学 ${m} 分钟`,
          `${inPlan() ? `计划 ${planOf() / 60} 分钟，` : ''}最多 ${P.settings.cap} 分钟。<br>学一会儿记得看看远处，休息眼睛哦。`, '继续学习', null);
      };
    }
    const s = seconds(me);
    chip.textContent = `⏱ ${fmt(s)}${inPlan() ? ' / ' + fmt(planOf()) : ''}`;
    chip.className = 'sp-chip' + (s >= capOf() ? ' over' : s >= planOf() ? ' warn' : '');
  }
  function alertBox(icon, title, text, btn, onBtn, withParent) {
    const m = document.createElement('div'); m.className = 'sp-mask';
    m.innerHTML = `<div class="sp-box"><div class="big">${icon}</div><h3>${title}</h3><p>${text}</p>
      <button class="sp-btn">${btn}</button>${withParent ? '<button class="sp-sub">家长：按住 2 秒，再学 5 分钟</button>' : ''}</div>`;
    document.body.appendChild(m);
    m.querySelector('.sp-btn').onclick = () => { m.remove(); if (onBtn) onBtn(); };
    const sub = m.querySelector('.sp-sub');
    if (sub) {
      let t = null;
      const start = e => { e.preventDefault(); sub.textContent = '继续按住…'; t = setTimeout(() => { extra += 5 * 60; capShown = false; m.remove(); render(); }, 2000); };
      const stop = () => { clearTimeout(t); sub.textContent = '家长：按住 2 秒，再学 5 分钟'; };
      sub.addEventListener('mousedown', start); sub.addEventListener('touchstart', start, { passive: false });
      ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev => sub.addEventListener(ev, stop));
    }
  }
  function toast(html, btn, onBtn) {
    const t = document.createElement('div'); t.className = 'sp-toast';
    t.innerHTML = `<span>${html}</span>${btn ? `<button>${btn}</button>` : ''}`;
    document.body.appendChild(t);
    if (btn) t.querySelector('button').onclick = () => { t.remove(); onBtn(); };
    setTimeout(() => t.remove(), 9000);
  }
  const goHome = () => { location.href = '../'; };

  const TICK = 5;
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    addSeconds(me, TICK);
    const s = seconds(me);
    render();
    if (!planShown && inPlan() && s >= planOf() && s < capOf()) {
      planShown = true;
      toast(`⏰ ${MODS[me].name}的计划时间到啦，做完这一题就可以休息～`);
    }
    if (!capShown && s >= capOf()) {
      capShown = true;
      alertBox('🌙', `今天的${MODS[me].name}时间到啦！`, '已经学了很久，眼睛要休息一下啦。<br>去远处看看绿色的东西吧 👀', '回到学习乐园', goHome, true);
    }
    // 任务完成提醒（每天每个模块一次）
    load(); const d = today(); P.flags[d] = P.flags[d] || {};
    if (inPlan() && !P.flags[d][me] && DETECT[me] && DETECT[me](d)) {
      P.flags[d][me] = true; save(); syncToday();
      toast(`✅ 今天的${MODS[me].name}任务完成啦！`, '回去打卡 ✨', goHome);
    }
  }, TICK * 1000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
