/* ════════════════════════════════
   SPRITE SYSTEM — スプライト管理
   卵: green/pink/blue × intact/crack1/crack2/hatch
   キャラ: green/pink/blue × newborn/baby/child/adult
   ステージ決定: renshuClears（6割クリア回数）
     0→intact, 1→crack1, 2→crack2, 3→hatch（卵3/3）,
     4,5→newborn, 6,7→baby, 8,9→child, 10+→adult（各2クリア）
════════════════════════════════ */

// ステージ番号からスプライトを取得
function getEggSprite(kind, n) {
  if (n <= 0) return SPRITES.egg[kind].intact;
  if (n === 1) return SPRITES.egg[kind].crack1;
  if (n === 2) return SPRITES.egg[kind].crack2;
  return SPRITES.egg[kind].hatch; // 孵化直前（3）
}
function getCharSprite(kind, idx) {
  // idx = charStageIdx(renshuClears)  0:newborn 1:baby 2:child 3:adult
  if (idx <= 0) return SPRITES.char[kind].newborn;
  if (idx === 1) return SPRITES.char[kind].baby;
  if (idx === 2) return SPRITES.char[kind].child;
  return SPRITES.char[kind].adult;
}
function isHatched(n) { return n >= 4; } // renshuClears >= 4 で孵化済み（3はhatch卵）

// charStageIdx: null=卵, 0=newborn, 1=baby, 2=child, 3=adult（各ステージ2クリア）
function charStageIdx(n) {
  if (n < 4) return null;
  return Math.min(3, Math.floor((n - 4) / 2));
}
// charStage: null=卵（hatch含む）, 'newborn','baby','child','adult'
function getCharStage(n) {
  const idx = charStageIdx(n);
  return idx === null ? null : ['newborn','baby','child','adult'][idx];
}

// ホーム画面・クリア画面の表示を更新
function updateCreature() {
  if (!S.selectedEgg && S.adultCharacters.length === 0) return;
  
  // 成長レベルはメダル合計から計算（1段スパム防止）
  const n = S.renshuClears;
  const kind = S.selectedEgg || (S.adultCharacters.length > 0 ? S.adultCharacters[S.adultCharacters.length - 1] : 'green');
  const charStage = getCharStage(n);
  // アニメ制御
  charAnim.updateStage(charStage, n);

  // suffix画面
  const dinSufEl = document.getElementById('dino-suffix');
  if (dinSufEl) dinSufEl.src = charStage
    ? getCharSprite(kind, charStageIdx(n))
    : getEggSprite(kind, n);
}


/* ════════════════════════════════
   EGG WOBBLE — ヒビ度合いに応じて揺れを強化
   renshuClears=0: ゆらゆらなし
   =1: 低頻度・小幅
   =2: 中頻度・中幅
   =3（孵化直前）: 高頻度・大幅
════════════════════════════════ */
const eggWobble = (() => {
  let timer = null;
  let running = false;

  function wobbleParams(n) {
    // n = growthClears（成長スコア）
    // 卵ステージ（0-3）は全てゆれる。段階が進むほど頻度・角度が大きくなる
    if (n <= 0) return { interval: [8000, 16000], deg: 2, dur: 500 };
    if (n === 1) return { interval: [4000, 8000], deg: 5, dur: 600 };
    if (n === 2) return { interval: [2000, 5000], deg: 9, dur: 700 };
    return              { interval: [800, 2000],  deg: 14, dur: 800 }; // 孵化直前
  }

  function wobble() {
    const wrap = document.getElementById('home-egg-wrap');
    if (!wrap || isHatched(S.renshuClears)) { timer = null; return; }
    const params = wobbleParams(S.renshuClears);

    wrap.classList.remove('egg-wobble');
    wrap.style.setProperty('--wobble-deg', params.deg + 'deg');
    void wrap.offsetWidth;
    wrap.classList.add('egg-wobble');
    setTimeout(() => wrap && wrap.classList.remove('egg-wobble'), params.dur + 50);

    const next = params.interval[0] + Math.random() * (params.interval[1] - params.interval[0]);
    timer = setTimeout(wobble, next);
  }

  return {
    start() {
      if (running) return;
      running = true;
      timer = setTimeout(wobble, 1500 + Math.random() * 2000);
    },
    restart() {
      // ステージ変更時に周期を再設定
      if (timer) clearTimeout(timer);
      if (isHatched(S.renshuClears)) return;
      const params = wobbleParams(S.renshuClears);
      const next = params.interval[0] * 0.3;
      timer = setTimeout(wobble, next);
    }
  };
})();


/* ════════════════════════════════
   CHAR ANIMATION — うろうろ・ひらひら
   赤ちゃん以下: 地上を歩く
   子ども以上: 空中を飛ぶ
   成長するほど速くなる
════════════════════════════════ */
const charAnim = (() => {
  // ホーム画面の表示エリア(px) — 実際はcontainer幅に依存
  const AREA_W = 300, AREA_H = 80;
  const state = {
    x: AREA_W / 2, y: AREA_H / 2,
    vx: 0, vy: 0,
    tx: AREA_W / 2, ty: AREA_H / 2,
    tTimer: 0,
    facingLeft: false,
    stage: null,   // null=卵, 'newborn','baby','child','adult'
    canFly: false,
    speed: 0,
    rafId: null,
  };

  function speedFor(stage) {
    return { newborn:0.3, baby:0.6, child:1.1, adult:1.7 }[stage] || 0;
  }

  function tick() {
    state.rafId = requestAnimationFrame(tick);
    if (!state.stage || state.speed === 0) return;

    state.tTimer--;
    if (state.tTimer <= 0) {
      // 新しい目標を設定
      const margin = 20;
      state.tx = margin + Math.random() * (AREA_W - margin * 2);
      // 飛べる場合は縦にも動く、地上のみは下半分
      state.ty = state.canFly
        ? margin + Math.random() * (AREA_H - margin * 2)
        : AREA_H * 0.6 + Math.random() * (AREA_H * 0.3);
      state.tTimer = Math.floor(80 + Math.random() * 120);
    }

    const dx = state.tx - state.x, dy = state.ty - state.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const spd = state.speed;
    if (dist > 1) {
      state.vx += dx / dist * spd * 0.06;
      state.vy += dy / dist * spd * 0.04;
    }
    const damp = 0.88;
    state.vx *= damp; state.vy *= damp;
    state.x += state.vx; state.y += state.vy;

    // 境界クランプ
    state.x = Math.max(10, Math.min(AREA_W - 10, state.x));
    state.y = Math.max(5, Math.min(AREA_H - 5, state.y));

    if (Math.abs(state.vx) > 0.05) state.facingLeft = state.vx < 0;

    const el = document.getElementById('home-egg-img');
    if (el && state.stage) {
      const flip = state.facingLeft ? 'scaleX(-1)' : 'scaleX(1)';
      el.style.transform = `${flip} translate(${(state.x - AREA_W/2).toFixed(1)}px, ${(state.y - AREA_H/2).toFixed(1)}px)`;
    }
  }

  return {
    updateStage(stage, n) {
      state.stage = stage;
      state.canFly = (stage === 'child' || stage === 'adult');
      state.speed = speedFor(stage);
      // 卵のときは位置リセット
      if (!stage) {
        state.x = AREA_W/2; state.y = AREA_H/2;
        state.vx = 0; state.vy = 0;
        const el = document.getElementById('home-egg-img');
        if (el) el.style.transform = '';
      }
      if (!state.rafId) tick();
    }
  };
})();


// 初期化
function initDinos() {
  updateCreature();
}


/* ════════════════════════════════
   DOMAIN
════════════════════════════════ */

/* ════════════════════════════════
   AUDIO
════════════════════════════════ */
const Snd = (() => {
  let _ctx = null;
  function getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    return _ctx;
  }
  // iOS Safari: サイレントバッファ再生でAudioContextをアンロック
  function unlock() {
    const ctx = getCtx();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(ctx.destination); src.start(0);
    ctx.resume();
  }
  function beep(freq, dur, vol, type = 'sine') {
    try {
      const ctx = getCtx();
      const t = ctx.currentTime + 0.04; // 40ms先にスケジュール（resume遅延対策）
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur + 0.01);
    } catch(e) {}
  }
  return {
    unlock,
    tap()      { beep(660, 0.07, 0.22); },
    click()    { beep(880, 0.06, 0.30); },
    pingpong() { beep(880, .24, .34); setTimeout(() => beep(1047, .24, .34), 300); },
    miss()     { beep(440, .17, .15); setTimeout(() => beep(370, .17, .10), 100); }
  };
})();
function tapSnd() { Snd.click(); }

// 読み表示用フォーマット：問題部分と答えの間に全角スペースを入れる
function fmtReading(p) {
  if (p.reading.includes('が')) return p.reading.replace('が', '\u3000が\u3000');
  return (p.questionRead || '') + '\u3000' + KD.numYomi(p.answer);
}

/* ════════════════════════════════
   SPEECH
════════════════════════════════ */
const Spk = (() => {
  if (window.speechSynthesis) { speechSynthesis.onvoiceschanged = () => {}; speechSynthesis.getVoices(); }
  return {
    say(text, rate = 0.86, onend = null) {
      if (!window.speechSynthesis) { if (onend) setTimeout(onend, 800); return; }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP'; u.rate = rate; u.pitch = 1.3;
      const v = speechSynthesis.getVoices().find(x => x.lang.startsWith('ja'));
      if (v) u.voice = v;
      if (onend) u.onend = onend;
      speechSynthesis.speak(u);
    }
  };
})();
function speak(t, r) { if (S.speechEnabled !== false) Spk.say(t, r); }
function speakThen(t, r, cb) {
  if (S.speechEnabled !== false) { Spk.say(t, r, cb); }
  else if (cb) setTimeout(cb, 50);
}
// 九九の読みをTTSに渡す前に「は」を「ハ」へ変換する。
// 日本語TTSは助詞の「は」を「わ」と読むため、カタカナのハ（常に「は」）で回避する。
// ただし「はち」の一部である「は」（後ろに「ち」が続く）は対象外。
function kukuTts(t) { return t.replace(/は(?!ち)/g, 'ハ'); }

/* ════════════════════════════════
   STATE
════════════════════════════════ */
const S = {
  name: '', suffix: '', selSuffix: '',
  dan: 1, probs: [], idx: 0, ansShown: false, ansInput: '',
  hanamaruCount: 0,   // 累計花丸数（表示用）
  renshuClears: 0,    // 練習クリア回数（正答率6割以上）→ヒビ・成長トリガー
  selectedEgg: null,  // 選んだ卵の種類
  charClears: { green: 0, pink: 0, blue: 0 },  // 各キャラの成長度
  adultCharacters: [],  // 成人になったキャラリスト
  done: {},           // クリア済み段
  medals: {},         // メダル: null|'bronze'|'silver'|'gold'
  certificates: {},   // しょうじょう取得日: { oboeru: 'YYYYねん...', renshu, bronze, silver, gold }
  _growthBase: 0,       // 現在のキャラの成長ベース（卒業ごとに加算）
  _pendingGraduation: false,  // 卒業遷移中フラグ
  isFirstAccess: true,  // 初回アクセスか
  speechEnabled: true,  // 音声読み上げon/off
  renshuAnsTime: 10,    // れんしゅう自動回答まで秒数（0=まつ）
  testAnsTime: 0,       // てすと自動回答まで秒数（0=まつ）
};
const fullName = () => S.name + S.suffix;

/* ════════════════════════════════
   PERSISTENCE — LocalStorage
════════════════════════════════ */
const SAVE_KEY = 'kukurun_state';
function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      name: S.name, suffix: S.suffix,
      speechEnabled: S.speechEnabled,
      medals: S.medals,
      adultCharacters: S.adultCharacters,
      selectedEgg: S.selectedEgg,
      _growthBase: S._growthBase,
      renshuClears: S.renshuClears,
      done: S.done,
      hanamaruCount: S.hanamaruCount,
      isFirstAccess: S.isFirstAccess,
      renshuAnsTime: S.renshuAnsTime,
      testAnsTime: S.testAnsTime,
      certificates: S.certificates,
    }));
  } catch(e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    ['name','suffix','speechEnabled','medals','adultCharacters',
     'selectedEgg','_growthBase','renshuClears','done','hanamaruCount','isFirstAccess',
     'renshuAnsTime','testAnsTime','certificates']
      .forEach(k => { if (d[k] !== undefined) S[k] = d[k]; });
  } catch(e) {}
}
function restoreSession() {
  if (S.isFirstAccess || !S.name) return;
  // イントロ表示中もバックグラウンドでホーム状態を準備
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-home').classList.add('active');
  const greetingText = '　' + fullName() + '、おかえり♪';
  const balloonText = document.getElementById('balloon-text');
  if (balloonText) balloonText.textContent = greetingText;
  buildDanGrid();
  const cr = document.getElementById('cert-btn-row');
  if (cr) cr.style.display = 'flex';
  updateCreature();
  eggWobble.start();
}

/* ════════════════════════════════
   SCREEN NAV
════════════════════════════════ */
// 直前の画面IDを記録（せってい・せいちょうの「もどる」に使用）
let _prevScreenId = 'screen-home';

function updateBottomBar(which) {
  ['home', 'settings', 'growth'].forEach(k => {
    document.getElementById('bottom-btn-' + k)
      ?.classList.toggle('bottom-btn--active', k === which);
  });
}

function showScreen(id) {
  // 画面が切り替わるたびに読み上げを止める
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (id === 'screen-home') {
    const label = document.getElementById('debug-clears-label');
    if (label) label.textContent = S.renshuClears + 'かい';
    updateBottomBar('home');
  }
  if (id === 'screen-oboeru') {
    _updateOboeruReadSelectedBtn();
  }
  // 遷移前の画面を記録（settings/growthへ行くときのみ意味を持つ）
  const cur = document.querySelector('.screen.active');
  if (cur && cur.id !== id) _prevScreenId = cur.id;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const bb = document.getElementById('bottom-bar');
  const noChrome = ['screen-name', 'screen-suffix', 'screen-egg-select'].includes(id);
  if (bb) bb.style.display = noChrome ? 'none' : '';
  const cr = document.getElementById('cert-btn-row');
  if (cr) cr.style.display = id === 'screen-home' ? 'flex' : 'none';
  window.scrollTo(0, 0);
}

function goBack() {
  // せってい・せいちょうから直前画面へ戻る
  const target = _prevScreenId || 'screen-home';
  if (target === 'screen-growth') stopGrowthAnim();
  showScreen(target);
}

/* ════════════════════════════════
   KANA GRID
   方向: rtl + grid-auto-flow:column
   → 右端があ行、左へかきくけこ…
════════════════════════════════ */
let KANA_ROWS = [];
let HOKA_SECTIONS = [];
function buildKanaGrid() {
  const g = document.getElementById('kana-grid');
  KANA_ROWS.forEach(row =>
    row.forEach(k => {
      const b = document.createElement('button');
      b.className = 'kana-btn'; b.textContent = k;
      b.onclick = () => { Snd.tap(); speak(k, 1.1); addKana(k); };
      g.appendChild(b);
    })
  );
  // 削除ボタンはグリッド上のHTMLボタンに移動済み
}
function clearKana() {
  const nd = document.getElementById('name-display');
  nd.innerHTML = '<span class="name-placeholder">ここに　でるよ</span>';
  const ok = document.getElementById('name-ok-btn');
  ok.disabled = true; ok.style.opacity = '.4';
}
function getCurName() {
  const el = document.getElementById('name-display');
  return el.querySelector('.name-placeholder') ? '' : el.textContent;
}
function addKana(k) {
  const cur = getCurName(); if (cur.length >= 8) return;
  const nd = document.getElementById('name-display');
  nd.innerHTML = '';
  const t = cur + k;
  [...t].forEach((c, i) => {
    const s = document.createElement('span');
    s.className = 'char'; s.style.animationDelay = `${i * .04}s`; s.textContent = c;
    nd.appendChild(s);
  });
  const ok = document.getElementById('name-ok-btn');
  ok.disabled = false; ok.style.opacity = '1';
}
function delKana() {
  const cur = getCurName(); if (!cur) return;
  const t = cur.slice(0, -1);
  const nd = document.getElementById('name-display');
  if (!t) {
    nd.innerHTML = '<span class="name-placeholder">ここに　でるよ</span>';
    const ok = document.getElementById('name-ok-btn');
    ok.disabled = true; ok.style.opacity = '.4';
    return;
  }
  nd.textContent = t;
}

/* ════════════════════════════════
   HOKA MODAL (ほかのもじ)
════════════════════════════════ */
let hokaBuilt = false;
function buildHokaModal() {
  if (hokaBuilt) return;
  hokaBuilt = true;
  const body = document.getElementById('hoka-modal-body');

  const allRows = [];
  HOKA_SECTIONS.forEach((sec, si) => {
    if (si > 0) allRows.push(null); // スペーサー列
    sec.rows.forEach(col => allRows.push(col));
  });

  const colCount = allRows.length;
  const grid = document.createElement('div');
  grid.className = 'hoka-grid';
  grid.style.gridTemplateColumns = `repeat(${colCount}, 1fr)`;
  grid.style.gridTemplateRows = 'repeat(5, auto)';
  grid.style.gridAutoFlow = 'column';
  grid.style.direction = 'rtl';

  allRows.forEach(col => {
    if (col === null) {
      for (let r = 0; r < 5; r++) {
        const sp = document.createElement('div');
        sp.className = 'hoka-col-spacer';
        grid.appendChild(sp);
      }
    } else {
      col.forEach(k => {
        const b = document.createElement('button');
        b.className = 'hoka-kana-btn';
        b.textContent = k;
        b.onclick = () => { Snd.tap(); speak(k, 1.1); addKana(k); };
        grid.appendChild(b);
      });
    }
  });

  body.appendChild(grid);
}

function openHokaModal() {
  buildHokaModal();
  const overlay = document.getElementById('hoka-overlay');
  const modal   = document.getElementById('hoka-modal');
  overlay.style.display = 'block';
  modal.style.display   = 'flex';
  requestAnimationFrame(() => {
    overlay.classList.add('visible');
    modal.classList.add('visible');
  });
}

function closeHokaModal() {
  const overlay = document.getElementById('hoka-overlay');
  const modal   = document.getElementById('hoka-modal');
  overlay.classList.remove('visible');
  modal.classList.remove('visible');
  setTimeout(() => {
    overlay.style.display = 'none';
    modal.style.display   = 'none';
  }, 220);
}

/* ════════════════════════════════
   SUFFIX SELECT
════════════════════════════════ */
let SUFFIXES = [];
function buildSuffixGrid() {
  const g = document.getElementById('suffix-grid'); g.innerHTML = '';
  SUFFIXES.forEach(sf => {
    const b = document.createElement('button');
    b.className = 'suffix-btn' + (sf.v === '' ? ' selected' : '');
    b.textContent = sf.l;
    b.onclick = () => {
      Snd.tap();
      document.querySelectorAll('.suffix-btn').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      S.selSuffix = sf.v;
      const pv = S.name + sf.v;
      document.getElementById('suffix-preview').textContent = pv || S.name;
      speak(pv || S.name, 1.0);
    };
    g.appendChild(b);
  });
}
function goSuffix() {
  Snd.tap();
  S.name = getCurName();
  buildSuffixGrid(); S.selSuffix = '';
  document.getElementById('suffix-preview').textContent = S.name;
  showScreen('screen-suffix');
}
// sufixから卵選択へ（名前変更時は卵選択をスキップして設定へ戻る）
function goEggSelect() {
  Snd.tap(); S.suffix = S.selSuffix;
  saveState();
  if (_skipEggSelect) {
    _skipEggSelect = false;
    openSettings();
    return;
  }
  buildEggSelectGrid();
  showScreen('screen-egg-select');
}
function goHome() {
  Snd.tap();
  const nm = fullName();
  document.getElementById('greeting-text').textContent = '　' + nm + '、こんにちは♪';
  S.isFirstAccess = false;
  saveState();
  updateCreature();
  buildDanGrid(); showScreen('screen-home');
}
function goHomeFromEgg() {
  try { Snd.tap(); } catch(e) {}
  S.isFirstAccess = false;
  try { saveState(); } catch(e) {}
  try { updateCreature(); } catch(e) {}
  try { eggWobble.start(); } catch(e) {}
  try { buildDanGrid(); } catch(e) {}
  showScreen('screen-home');
}

/* ════════════════════════════════
   DAN GRID
════════════════════════════════ */
/* MEDAL_CLR / CERT_TYPES / MEDAL_NAMES / NEXT_MEDAL は medals.js で定義 */

/* ── メダルヘルパー ──
   S.medals[dan] = { oboeru: bool, renshu: bool, test: null|'bronze'|'silver'|'gold' }
   growthLevel(): 全段のメダル合計（max 30）→ 成長ドライバー（1段スパム防止）
   メダル種類に関わらず1つにつき+1 */
function getMedals(dan) {
  if (!S.medals[dan] || typeof S.medals[dan] !== 'object') {
    S.medals[dan] = { oboeru: false, renshu: false, test: null };
  }
  return S.medals[dan];
}
function growthLevel() {
  let score = 0;
  for (let d = 1; d <= 9; d++) {
    const m = S.medals[d];
    if (!m || typeof m !== 'object') continue;
    if (m.oboeru) score++;
    if (m.renshu) score++;
    if (m.test) score++;
  }
  // ばらばらのだんのメダルも加算
  const rm = S.medals['random'];
  if (rm && typeof rm === 'object') {
    if (rm.oboeru) score++;
    if (rm.renshu) score++;
    if (rm.test) score++;
  }
  return score; // 0-30（9段+ばらばら各: oboeru1+renshu1+test1）
}
function getGrowthClears() {
  // たまご: 1点/ステージ（0=intact, 1=crack1, 2=crack2, 3=hatch）
  // キャラ: 2点/ステージ（4-5=newborn, 6-7=baby, 8-9=child, 10-11=adult）
  // 12点以上でadult卒業 → 新卵選択
  return growthLevel() - S._growthBase;
}
function updateGrowthFromMedals() {
  const newClears = getGrowthClears();
  if (newClears !== S.renshuClears) {
    S.renshuClears = newClears;
    S.charClears[S.selectedEgg || 'green'] = newClears;
    eggWobble.restart();
  }
  checkGraduation();
  checkCertificates();
}
function checkCertificates() {
  const t = new Date();
  const dateStr = `${t.getFullYear()}ねん${t.getMonth()+1}がつ${t.getDate()}にち`;
  const dans = [1,2,3,4,5,6,7,8,9];
  CERT_TYPES.forEach(ct => {
    if (S.certificates[ct.id]) return;
    const earned = ct.isKukuMaster
      ? dans.every(d => { const m = S.medals[d]; return m && m.oboeru && m.renshu && m.test === 'gold'; })
      : dans.every(d => ct.check(S.medals[d]));
    if (earned) { S.certificates[ct.id] = dateStr; buildCertBtns(); }
  });
}
function buildCertBtns() {
  const row = document.getElementById('cert-btn-row');
  if (!row) return;
  row.innerHTML = '';
  CERT_TYPES.forEach(ct => {
    const isEarned = !!S.certificates[ct.id];
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm cert-icon-btn';
    if (isEarned) {
      btn.style.cssText = `background:${ct.btnColor};color:${ct.btnText};border-color:${ct.btnShadow};box-shadow:0 4px 0 ${ct.btnShadow},var(--sh);flex:1;min-width:0;`;
      btn.innerHTML = ct.iconStyle ? `<span style="${ct.iconStyle}">${ct.icon}</span>` : ct.icon;
      btn.onclick = () => { tapSnd(); showCertificate(ct.id); };
    } else {
      btn.style.cssText = `background:#ddd;color:#999;border-color:#ccc;box-shadow:0 4px 0 #bbb,var(--sh);flex:1;min-width:0;`;
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
      btn.onclick = () => {
        tapSnd();
        if (_certTooltipAnchor === btn) { hideCertTooltip(); } else { showCertTooltip(btn, ct.label + 'マスターの\nしょうじょうだよ'); }
      };
    }
    row.appendChild(btn);
  });
}
let _certTooltipTimer = null;
let _certTooltipAnchor = null;
function hideCertTooltip() {
  const tip = document.getElementById('cert-tooltip');
  if (tip) tip.style.opacity = '0';
  clearTimeout(_certTooltipTimer);
  _certTooltipAnchor = null;
}
document.addEventListener('click', (e) => {
  if (_certTooltipAnchor && e.target !== _certTooltipAnchor) hideCertTooltip();
}, true);
function showCertTooltip(anchorEl, msg) {
  let tip = document.getElementById('cert-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'cert-tooltip';
    document.body.appendChild(tip);
  }
  _certTooltipAnchor = anchorEl;
  tip.textContent = msg;
  const rect = anchorEl.getBoundingClientRect();
  tip.style.cssText = `position:fixed;left:50%;transform:translateX(-50%);top:${Math.max(rect.top - 70, 8)}px;background:rgba(40,40,60,.92);color:#fff;font-size:13px;padding:8px 14px;border-radius:12px;line-height:1.6;max-width:88vw;text-align:center;z-index:9999;pointer-events:none;white-space:pre-wrap;`;
  tip.style.opacity = '1';
  clearTimeout(_certTooltipTimer);
  _certTooltipTimer = setTimeout(() => { hideCertTooltip(); }, 2800);
}
function showCertificate(id) {
  const ct = CERT_TYPES.find(c => c.id === id);
  if (!ct) return;
  const dateStr = S.certificates[id] || '';
  const nameOnly = S.name;
  const paper = document.getElementById('cert-paper');
  paper.innerHTML = `
    <span class="cert-corner tl">✦</span>
    <span class="cert-corner tr">✦</span>
    <span class="cert-corner bl">✦</span>
    <span class="cert-corner br">✦</span>
    <div class="cert-deco">── ✦ ── ✦ ── ✦ ──</div>
    <div class="cert-title">しょうじょう</div>
    <div class="cert-master">${ct.label}　マスター</div>
    <div class="cert-name">${nameOnly}　どの</div>
    <div class="cert-body">${nameOnly}どのは　${ct.mLabel}を　すべて　あつめることが　できました。そのえいよを　たたえるとともに　どりょくを　ここに　しょうします。これからも　くくを　たのしんで　おぼえてください。</div>
    <div class="cert-date">${dateStr}</div>
    <div class="cert-issuer">くくるん</div>
    <div class="cert-deco bot">── ✦ ── ✦ ── ✦ ──</div>
  `;
  showScreen('screen-cert');
  certSparkle(ct.isKukuMaster);
}
function certSparkle(isKukuMaster) {
  const glyphs = ['⭐︎','✦','✸','✺'];
  const count  = isKukuMaster ? 100 : 50;
  const maxSz  = isKukuMaster ? 36  : 22;
  const maxDly = isKukuMaster ? 2.2 : 1.4;
  // くくマスターは2波に分けて豪華に
  const waves  = isKukuMaster ? 2 : 1;
  for (let w = 0; w < waves; w++) {
    const wDelay = w * 1.6;
    for (let i = 0; i < count / waves; i++) {
      const el    = document.createElement('span');
      const dur   = 2.4 + Math.random() * 2.6;
      const delay = wDelay + Math.random() * maxDly;
      el.className = isKukuMaster ? 'cert-sparkle colorful' : 'cert-sparkle';
      el.textContent = glyphs[~~(Math.random() * glyphs.length)];
      el.style.cssText = [
        `left:${Math.random()*100}vw`,
        `font-size:${10 + Math.random()*maxSz}px`,
        `animation-duration:${dur}s`,
        `animation-delay:${delay}s`,
      ].join(';');
      document.body.appendChild(el);
      setTimeout(() => el.remove(), (dur + delay + 0.3) * 1000);
    }
  }
}
function checkGraduation() {
  if (!S.selectedEgg || S._pendingGraduation) return;
  if (getGrowthClears() < 12) return;
  S._pendingGraduation = true;
  if (!S.adultCharacters.includes(S.selectedEgg)) {
    S.adultCharacters.push(S.selectedEgg);
  }
  S._growthBase = growthLevel(); // 次のキャラはここから
  saveState();
  updateCreature();
  setTimeout(() => {
    S._pendingGraduation = false;
    S.selectedEgg = null;
    saveState();
    buildEggSelectGrid();
    showScreen('screen-egg-select');
  }, 1500);
}
function refreshModeMedals() {
  const m = getMedals(S.dan);
  const ob = document.getElementById('mode-medal-oboeru');
  const rs = document.getElementById('mode-medal-renshu');
  const ts = document.getElementById('mode-medal-test');
  if (ob) ob.innerHTML = m.oboeru ? ctIcon('oboeru') : '';
  if (rs) rs.innerHTML = m.renshu ? ctIcon('renshu') : '';
  if (ts) ts.innerHTML = m.test ? ctIcon(m.test) : '';
}

function medalBadge(dan) {
  const m = (S.medals[dan] && typeof S.medals[dan] === 'object') ? S.medals[dan] : {};
  const shadow = 'drop-shadow(0 1px 1px rgba(0,0,0,.35))';
  const withShadow = (style) => style
    ? style.replace(/;\s*$/, ` ${shadow};`)
    : `filter:${shadow};`;
  // テストメダルは累積表示（bronze以上→🥉, silver以上→🥈, gold→🥇）
  const items = [
    ...['oboeru', 'renshu'].map(id => {
      const ct = CERT_TYPES.find(t => t.id === id);
      return (id === 'oboeru' ? m.oboeru : m.renshu)
        ? `<span style="${withShadow(ct.iconStyle)}">${ct.icon}</span>` : '';
    }),
    ...['bronze', 'silver', 'gold'].map(id => {
      const ct = CERT_TYPES.find(t => t.id === id);
      return ct.check(m) ? `<span style="${withShadow(ct.iconStyle)}">${ct.icon}</span>` : '';
    }),
  ].filter(s => s).join('');
  if (!items) return '';
  return `<div class="dan-medal-row">${items}</div>`;
}
function buildDanGrid() {
  const g = document.getElementById('dan-grid'); g.innerHTML = '';
  for (let d = 1; d <= 9; d++) {
    const b = document.createElement('button'); b.className = `dan-btn d${d}`;
    b.style.position = 'relative';
    const badge = medalBadge(d);
    b.innerHTML = `${badge}<div class="dan-main"><span class="dn">${KD.fw(d)}</span><span class="dl">のだん</span></div>`;
    b.classList.toggle('has-medals', !!badge);
    b.id = `dan-btn-${d}`;
    b.onclick = () => { Snd.tap(); selDan(d); };
    g.appendChild(b);
  }
  refreshDanBadge('random');
  buildCertBtns();
}
function refreshDanBadge(dan) {
  const b = document.getElementById(dan === 'random' ? 'dan-btn-random' : `dan-btn-${dan}`);
  if (!b) return;
  // メダルバッジだけ更新（古いバッジを削除）
  const existing = b.querySelector('.dan-medal-row');
  if (existing) existing.remove();

  // 新しいバッジを先頭に挿入（メダルがある場合のみ）
  const badgeHtml = medalBadge(dan);
  if (badgeHtml) {
    const temp = document.createElement('div');
    temp.innerHTML = badgeHtml;
    b.insertBefore(temp.firstChild, b.firstChild);
  }
  b.classList.toggle('has-medals', !!badgeHtml);
}
function selDan(dan) {
  S.dan = dan;
  if (dan === 'random') {
    // ここで問題を生成・固定し、おぼえる／れんしゅうで同じ問題を使う
    let probs = [];
    for (let d = 1; d <= 9; d++) probs = probs.concat(KD.problems(d));
    for (let i = probs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [probs[i], probs[j]] = [probs[j], probs[i]];
    }
    S._oboeruProblems = probs.slice(0, 10);
  }
  const lbl = dan === 'random' ? 'ばらばらのだん' : KD.fw(dan) + 'のだん';
  document.getElementById('mode-dan-label').textContent = lbl;
  // テストボタン ロック/解除
  const testRow = document.getElementById('mode-test-row');
  const testLocked = document.getElementById('mode-test-locked');
  const testOpen = document.getElementById('mode-test-open');
  if (testRow) {
    const unlocked = S.done[dan];
    if (testLocked) testLocked.style.display = unlocked ? 'none' : 'flex';
    if (testOpen)   testOpen.style.display   = unlocked ? 'flex' : 'none';
  }
  showScreen('screen-mode');
  refreshModeMedals();
  speak(lbl + 'をえらんだね！');
}

/* ════════════════════════════════
   OBOERU
════════════════════════════════ */
function awardOboeruMedal() {
  const m = getMedals(S.dan);
  if (!m.oboeru) {
    m.oboeru = true;
    updateGrowthFromMedals();
    refreshDanBadge(S.dan);
    refreshModeMedals();
    saveState();
  }
}
function showOboeruClear() {
  if (S._oboeruClearShown) return;
  S._oboeruClearShown = true;
  const checks = document.querySelectorAll('.kuku-check');
  const allChecked = checks.length > 0 && Array.from(checks).every(el => el.textContent === '✓');
  if (!allChecked) {
    // 全部見ていなくてもれんしゅうには進める
    startRenshu();
    return;
  }
  const alreadyHad = getMedals(S.dan).oboeru;
  awardOboeruMedal();
  const danLabel = S.dan === 'random' ? 'ばらばらのだん' : KD.fw(S.dan) + 'のだん';
  const obMedalEl = document.getElementById('oboeru-clear-medal');
  obMedalEl.innerHTML = ctIcon('oboeru');
  document.getElementById('oboeru-clear-title').textContent = danLabel + '　おぼえたね！';
  document.getElementById('oboeru-clear-msg').textContent =
    alreadyHad ? 'メダルは　もう　もってるよ！' : 'メダルを　もらえたよ！';
  showScreen('screen-oboeru-clear');
  confetti();
  speak(alreadyHad ? 'メダルは　もう　もってるよ！' : 'やったー！メダルを　もらえたよ！');
}
function startOboeru() {
  S._oboeruClearShown = false;
  let problems;
  if (S.dan === 'random') {
    problems = S._oboeruProblems;  // selDanで固定済みの問題を使う
  } else {
    problems = KD.problems(S.dan);
  }
  S._oboeruProblems = problems;
  S._oboeruMode = S._oboeruMode || 'auto';  // 初期値: じどうで　ぜんぶ
  S._oboeruSelected = [];  // manualモードの選択状態リセット
  // スイッチ表示を現在のモードに合わせる
  _updateOboeruSwitch();
  const list = document.getElementById('kuku-list'); list.innerHTML = '';
  problems.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'kuku-row'; row.id = `kr-${i}`;
    const eq = `${KD.fw(p.dan)}×${KD.fw(p.multiplier)}＝`;
    row.innerHTML = `
      <button class="speak-btn"
        onclick="event.stopPropagation();Snd.tap();speakRow(${i})">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      </button>
      <span class="kuku-eq">${eq}</span>
      <span class="kuku-ans">${KD.fw(p.answer)}</span>
      <span class="kuku-read">${fmtReading(p)}</span>
      <span class="kuku-check" id="kc-${i}"></span>`;
    row.onclick = () => {
      Snd.tap();
      if ((S._oboeruMode || 'auto') === 'manual') {
        toggleSelectRow(i, p);
      } else {
        hlRow(i, p);
      }
    };
    list.appendChild(row);
  });
  _updateOboeruReadSelectedBtn();
  showScreen('screen-oboeru');
  if (S._oboeruMode === 'auto') {
    const speechLabel = S.dan === 'random' ? 'ランダム！みて、きいて、おぼえよう' : KD.danLabel(S.dan) + '！みて、きいて、おぼえよう';
    speak(speechLabel);
    setTimeout(() => hlRow(0, problems[0]), 1400);
  }
}
function hlRow(i, p) {
  document.querySelectorAll('.kuku-row').forEach(r => r.classList.remove('current'));
  const row = document.getElementById(`kr-${i}`);
  if (!row) return;
  row.classList.add('current');
  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById(`kc-${i}`).textContent = '✓'; // タップ直後につける
  // 全チェック済みならメダル付与 → クリア画面へ
  const total = S._oboeruProblems ? S._oboeruProblems.length : 0;
  const checked = document.querySelectorAll('.kuku-check').length > 0
    ? Array.from(document.querySelectorAll('.kuku-check')).filter(el => el.textContent === '✓').length
    : 0;
  if (total > 0 && checked === total) {
    setTimeout(() => showOboeruClear(), (S._oboeruMode || 'auto') === 'auto' ? 800 : 300);
    return;
  }
  // autoモードのみ自動進行; manualモードは読み上げのみ
  speakThen(kukuTts(p.reading), 0.86, () => {
    if ((S._oboeruMode || 'auto') === 'auto') {
      const waitMs = Math.max(1200, p.reading.length * 130);
      const probs = S._oboeruProblems;
      if (i + 1 < probs.length) {
        setTimeout(() => hlRow(i + 1, probs[i + 1]), waitMs);
      }
    }
  });
}
function speakRow(i) { speak(kukuTts(S._oboeruProblems[i].reading)); }

// ── おぼえるモード切り替え ──
function setOboeruMode(mode) {
  S._oboeruMode = mode;
  S._oboeruSelected = [];  // 選択リセット
  _updateOboeruSwitch();
  document.querySelectorAll('.kuku-row').forEach(r => {
    r.classList.remove('selected');
    r.classList.remove('current');
  });
  _updateOboeruReadSelectedBtn();
  if (mode === 'auto') {
    // autoに切り替えたら先頭から再生
    const probs = S._oboeruProblems;
    if (probs.length > 0) setTimeout(() => hlRow(0, probs[0]), 400);
  }
}
function toggleSelectRow(i, p) {
  // じぶんでえらぶ: タップするたびにhlRowで読み上げ+✓（じどうと同じUI）
  hlRow(i, p);
}
function _updateOboeruReadSelectedBtn() {
  const wrap = document.getElementById('oboeru-read-selected-wrap');
  if (!wrap) return;
  const isManual = (S._oboeruMode || 'auto') === 'manual';
  const hasSelected = isManual && S._oboeruSelected && S._oboeruSelected.length > 0;
  wrap.style.display = (isManual) ? 'block' : 'none';
  const btn = wrap.querySelector('button');
  if (btn) {
    if (hasSelected) {
      btn.textContent = `☑ えらんだ ${S._oboeruSelected.length}こを　よむ`;
      btn.style.opacity = '1';
    } else {
      btn.textContent = '☑ えらんだものを　よむ';
      btn.style.opacity = '0.5';
    }
  }
}
function readSelectedRows() {
  if (!S._oboeruSelected || S._oboeruSelected.length === 0) return;
  const probs = KD.problems(S.dan);
  const selected = [...S._oboeruSelected].sort((a, b) => a - b);
  let qi = 0;
  function readNext() {
    if (qi >= selected.length) return;
    const i = selected[qi++];
    const p = probs[i];
    if (!p) { readNext(); return; }
    // ハイライト
    document.querySelectorAll('.kuku-row').forEach(r => r.classList.remove('current'));
    const row = document.getElementById(`kr-${i}`);
    if (row) { row.classList.add('current'); row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    speakThen(kukuTts(p.reading), 0.86, () => {
      const waitMs = Math.max(1000, p.reading.length * 120);
      setTimeout(readNext, waitMs);
    });
  }
  readNext();
}
function _updateOboeruSwitch() {
  const mode = S._oboeruMode || 'auto';
  const ab = document.getElementById('oboeru-auto-btn');
  const mb = document.getElementById('oboeru-manual-btn');
  if (!ab || !mb) return;
  if (mode === 'auto') {
    ab.style.background = 'var(--theme)'; ab.style.color = '#fff';
    mb.style.background = 'transparent'; mb.style.color = 'var(--text2)';
  } else {
    mb.style.background = 'var(--theme)'; mb.style.color = '#fff';
    ab.style.background = 'transparent'; ab.style.color = 'var(--text2)';
  }
}

/* ════════════════════════════════
   RENSHU
════════════════════════════════ */
let rT = null;

function startRenshu() {
  let probs;
  if (S.dan === 'random') {
    // おぼえるで生成した同じ10問を再利用（なければ新規生成）
    if (S._oboeruProblems && S._oboeruProblems.length) {
      probs = S._oboeruProblems;
    } else {
      probs = [];
      for (let d = 1; d <= 9; d++) probs = probs.concat(KD.problems(d));
      for (let i = probs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [probs[i], probs[j]] = [probs[j], probs[i]];
      }
      probs = probs.slice(0, 10);
    }
  } else {
    probs = KD.problems(S.dan);
  }
  S.probs = probs;
  S.idx = 0;
  S.ansShown = false;
  S.ansInput = '';
  S._hanamaruAtStart = S.hanamaruCount;
  buildAnsGrid();
  showScreen('screen-renshu');
  showProb();
}
function buildAnsGrid() {
  const g = document.getElementById('number-grid'); g.innerHTML = '';
  S.ansInput = '';

  // ── 1行目: [０] [けす] (空セル) ──
  const b0 = document.createElement('button');
  b0.className = 'ans-btn'; b0.textContent = KD.fw(0); b0.dataset.val = 0;
  b0.onclick = () => inputDigit('0'); g.appendChild(b0);

  const bHint = document.createElement('button');
  bHint.className = 'ans-btn ans-del'; bHint.textContent = 'ヒント';
  bHint.onclick = () => showFruitHint(); g.appendChild(bHint);

  const bDel = document.createElement('button');
  bDel.className = 'ans-btn ans-erase'; bDel.textContent = 'けす';
  bDel.onclick = () => deleteDigit(); g.appendChild(bDel);

  // ── 2〜4行目: 1-9 ──
  for (let n = 1; n <= 9; n++) {
    const b = document.createElement('button');
    b.className = 'ans-btn'; b.textContent = KD.fw(n); b.dataset.val = n;
    b.onclick = () => inputDigit(String(n)); g.appendChild(b);
  }
}

function showFruitHint() {
  const p = S.probs[S.idx];
  if (!p) return;
  Snd.tap();
  // 箱を p.multiplier 個、各箱に p.dan 個の🍬
  const sweets = ['🍬', '🍩', '🍰'];
  const candy = sweets[Math.floor(Math.random() * sweets.length)];
  let boxes = '';
  for (let i = 0; i < p.multiplier; i++) {
    const candies = `<span style="font-size:20px;letter-spacing:1px;">${candy.repeat(p.dan)}</span>`;
    boxes += `<div style="display:inline-flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:2px;
                           border:2px solid #aac;border-radius:8px;padding:6px 8px;margin:4px;
                           min-width:40px;background:#f4f0ff;">${candies}</div>`;
  }
  document.getElementById('fruit-hint-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'fruit-hint-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px 20px 20px;min-width:220px;max-width:320px;position:relative;text-align:center;font-family:var(--font);">
      <button onclick="document.getElementById('fruit-hint-overlay').remove()"
              style="position:absolute;top:10px;right:10px;background:var(--surface2);border:1px solid var(--border);border-radius:20px;font-size:14px;padding:6px 14px;cursor:pointer;color:var(--text2);font-family:var(--font);">とじる</button>
      <div style="font-size:20px;margin-bottom:12px;color:var(--theme);">${KD.fw(p.dan)}×${KD.fw(p.multiplier)}</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;">${boxes}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:10px;">${KD.fw(p.dan)}こずつが　${KD.fw(p.multiplier)}こ</div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function deleteDigit() {
  if (S.ansShown) return;
  Snd.tap();
  S.ansInput = S.ansInput.slice(0, -1);
  updateQSlotInput();
}

function updateQSlotInput() {
  const slot = document.getElementById('q-slot');
  if (!slot) return;
  if (S.ansInput === '') {
    slot.textContent = '？'; slot.className = 'q-mark';
  } else {
    slot.textContent = KD.fw(parseInt(S.ansInput, 10));
    slot.className = 'q-typing';
  }
}

function inputDigit(d) {
  if (S.ansShown) return;
  const p = S.probs[S.idx];
  Snd.tap();
  S.ansInput = (S.ansInput || '') + d;
  const n = parseInt(S.ansInput, 10);
  // 入力値が81より大きくなったらリセット
  if (n > 81) { S.ansInput = d; updateQSlotInput(); return; }
  updateQSlotInput();
  // 正解チェック
  if (n === p.answer) {
    if (rT) clearTimeout(rT);
    S.ansShown = true;
    S.hanamaruCount++;
    setTimeout(() => { Snd.pingpong(); showHanamaru(); }, 180);
    showAnsEl(p);
    speakThen(kukuTts(p.reading), 0.86, () => {
      setTimeout(() => { nextRenshu(); S.ansInput = ''; }, 1000);
    });
  } else if (p.answer < 10 || S.ansInput.length >= 2) {
    // ミス：一桁問題で違う、または二桁入力完了で不正解
    document.querySelectorAll('.ans-btn').forEach(b => {
      if (b.dataset.val === d) { b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 400); }
    });
    setTimeout(() => Snd.miss(), 150);
    S.ansInput = '';
    updateQSlotInput();
  }
}
function showProb() {
  if (rT) clearTimeout(rT);
  const p = S.probs[S.idx];
  const pct = (S.idx / S.probs.length) * 100;
  document.getElementById('renshu-progress').style.width = pct + '%';
  document.getElementById('renshu-counter').textContent = `${S.idx + 1} / ${S.probs.length}`;
  // 上段：答えを除いた読みを「が」前後スペースで整形
  const qRead = p.questionRead;
  const readingFmt = qRead.includes('が')
    ? qRead.replace('が', '\u3000が\u3000')
    : qRead;
  document.getElementById('renshu-reading').textContent = readingFmt;
  // 式：２×３＝？
  document.getElementById('renshu-problem').innerHTML =
    `${KD.fw(p.dan)}×${KD.fw(p.multiplier)}＝<span class="q-mark" id="q-slot" style="display:inline-block;min-width:${p.answer >= 10 ? '2em' : '1.2em'};text-align:center;">？</span>`;
  { const t = S.renshuAnsTime;
    document.getElementById('renshu-hint').textContent = t === 0 ? 'こたえは　じどうでは　でないよ'
      : `${t === 5 ? '５' : t === 10 ? '１０' : '１５'}びょう　たつと　こたえが　でるよ`; }
  document.getElementById('renshu-next-btn').style.display = 'none';
  document.querySelectorAll('.ans-btn').forEach(b => { b.classList.remove('correct','wrong'); b.disabled = false; });
  S.ansShown = false; S.ansInput = '';
  updateQSlotInput();
  // 音声：「が」で終わる場合はそのまま「が？」、それ以外は読みだけ＋「？」
  const speechQ = kukuTts(p.questionRead) + '？';
  speak(speechQ);
  if (S.renshuAnsTime > 0) rT = setTimeout(showAns, S.renshuAnsTime * 1000);
}
function showAnsEl(p) {
  // ？マークを答えで置き換え（赤・ポップイン、全角数字）
  const slot = document.getElementById('q-slot');
  if (slot) {
    slot.textContent = KD.fw(p.answer);
    slot.className = 'ans-revealed';
  }
  // 上段の読みを完全版に（問題と答えの間にスペース）
  document.getElementById('renshu-reading').textContent = fmtReading(p);
  document.getElementById('renshu-hint').textContent = '';
  document.getElementById('renshu-next-btn').style.display = 'block';
}
function showAns() {
  if (rT) clearTimeout(rT);
  if (S.ansShown) return;
  S.ansShown = true;
  const p = S.probs[S.idx];
  showAnsEl(p); speak(kukuTts(p.reading));
}
function checkAns(n, btn) {
  if (S.ansShown) return;
  const p = S.probs[S.idx];
  Snd.tap(); speak(KD.numYomi(n), 1.05);
  if (n === p.answer) {
    if (rT) clearTimeout(rT);
    S.ansShown = true;
    btn.classList.add('correct');
    S.hanamaruCount++;
    setTimeout(() => { Snd.pingpong(); showHanamaru(); }, 180);
    showAnsEl(p);
    // 読み上げ終了後1秒で自動次問
    speakThen(kukuTts(p.reading), 0.86, () => {
      setTimeout(() => nextRenshu(), 1000);
    });
  } else {
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 400);
    setTimeout(() => Snd.miss(), 150);
  }
}

function debugClears(delta) {
  // デバッグ: S.renshuClears を直接操作して成長確認
  if (delta === null) {
    S.renshuClears = 0;
  } else {
    S.renshuClears = Math.max(0, S.renshuClears + delta);
  }
  if (!S.selectedEgg) {
    S.selectedEgg = 'green';
  }
  // デバッグ時は renshuClears を直接使って表示（growthLevel は使わない）
  const n = S.renshuClears;
  const stage = getCharStage(n);
  const kind = S.selectedEgg;
  const stageNames = {newborn:'うまれたて',baby:'あかちゃん',child:'こども',adult:'おとな'};
  const previewImg = document.getElementById('debug-preview-img');
  if (previewImg) {
    previewImg.src = stage ? getCharSprite(kind, charStageIdx(n)) : getEggSprite(kind, n);
    previewImg.style.display = 'block';
  }
  const label = document.getElementById('debug-clears-label');
  if (label) label.textContent = 'スコア:' + growthLevel() + '/30\n' + n + 'clears';
  const stageLabel = document.getElementById('debug-stage-label');
  if (stageLabel) stageLabel.textContent = stage ? stageNames[stage] : 'たまご (' + n + '/10)';
  // adult到達 かつ 卒業前 → 卒業フローへ
  if (stage === 'adult' && S.selectedEgg && !S._pendingGraduation) {
    if (!S.adultCharacters.includes(S.selectedEgg)) S.adultCharacters.push(S.selectedEgg);
    S._pendingGraduation = true;
    updateCreature();
    setTimeout(() => {
      S._pendingGraduation = false;
      S.renshuClears = 0;
      S._growthBase = growthLevel();
      S.selectedEgg = null;
      buildEggSelectGrid();
      showScreen('screen-egg-select');
    }, 1000);
    return;
  }
  updateCreature();
  eggWobble.restart();
  // せいちょう画面が表示中なら画像とアニメを連動更新
  if (document.getElementById('screen-growth').classList.contains('active')) {
    _refreshGrowthScreen();
  }
}
function debugShowClear() {
  if (!S.selectedEgg) { S.selectedEgg = 'green'; }
  updateClearScreen();
  const title = document.getElementById('clear-title');
  if (title) title.textContent = '🔧 デバッグ確認';
  showScreen('screen-clear');
  confetti();
}
function debugGoHome() {
  if (!S.selectedEgg) { S.selectedEgg = 'green'; }
  // くくるんの吹き出しを初期化
  const balloonText = document.getElementById('balloon-text');
  if (balloonText) balloonText.textContent = 'こんにちは！';
  showScreen('screen-home');
  updateCreature();
}
function debugBuildCertBtns() {
  const row = document.getElementById('debug-cert-btns');
  if (!row) return;
  row.innerHTML = '';
  CERT_TYPES.forEach(ct => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm cert-icon-btn';
    btn.style.cssText = `background:${ct.btnColor};color:${ct.btnText};border-color:${ct.btnShadow};box-shadow:0 4px 0 ${ct.btnShadow},var(--sh);flex:1;min-width:0;`;
    btn.innerHTML = ct.iconStyle ? `<span style="${ct.iconStyle}">${ct.icon}</span>` : ct.icon;
    btn.onclick = () => {
      tapSnd();
      const t = new Date();
      const tmp = `${t.getFullYear()}ねん${t.getMonth()+1}がつ${t.getDate()}にち`;
      const prev = S.certificates[ct.id];
      if (!prev) S.certificates[ct.id] = tmp;
      showCertificate(ct.id);
      if (!prev) delete S.certificates[ct.id];
    };
    row.appendChild(btn);
  });
}

/* ════════════════════════════════
   GROWTH SCREEN — せいちょうをみる
════════════════════════════════ */
let _growthRaf = null;

function _refreshGrowthScreen() {
  const n = S.renshuClears;
  const kind = S.selectedEgg || 'green';
  const charStage = getCharStage(n);
  const img = document.getElementById('growth-char-img');
  if (charStage) {
    img.src = getCharSprite(kind, charStageIdx(n));
    img.style.height = ({ newborn: 40, baby: 47, child: 57, adult: 67 }[charStage] || 47) + 'px';
  } else if (S.selectedEgg) {
    img.src = getEggSprite(kind, n);
    img.style.height = (n >= 3 ? '65' : '53') + 'px';
  }
  stopGrowthAnim();
  _startGrowthAnim(charStage);
}

function showGrowthScreen() {
  updateBottomBar('growth');
  const n = S.renshuClears;
  const kind = S.selectedEgg || 'green';
  const charStage = getCharStage(n);

  const img = document.getElementById('growth-char-img');

  if (charStage) {
    img.src = getCharSprite(kind, charStageIdx(n));
    const sz = { newborn: 40, baby: 47, child: 57, adult: 67 }[charStage] || 47;
    img.style.height = sz + 'px';
  } else if (S.selectedEgg) {
    img.src = getEggSprite(kind, n);
    // hatch(crack3)は欠片が広がり視覚的に小さく見えるため補正
    img.style.height = (n >= 3 ? '65' : '53') + 'px';
  } else {
    img.src = '';
  }

  const medalCount = Object.values(S.medals).filter(v => v).length;
  const el = document.getElementById('growth-medal-count');
  if (el) el.textContent = medalCount;

  showScreen('screen-growth');
  _startGrowthAnim(charStage);
}

let _growthTouchAnim = null;

function _startGrowthAnim(charStage) {
  stopGrowthAnim();
  _growthTouchAnim = null;
  const area = document.getElementById('growth-area');
  if (!area) return;

  // 以前のadultキャラimgと星空キャンバスを削除
  area.querySelectorAll('.growth-adult-img').forEach(e => e.remove());
  const _oldCanvas = document.getElementById('growth-stars-canvas');
  if (_oldCanvas) _oldCanvas.remove();

  // 星空キャンバス（最背面）
  const starsCanvas = document.createElement('canvas');
  starsCanvas.id = 'growth-stars-canvas';
  starsCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
  area.insertBefore(starsCanvas, area.firstChild);
  // py を二乗分布にして上に行くほど密集させ、上位10%に収める
  const _stars = [
    ...Array.from({length: 80}, () => ({
      px: Math.random(), py: Math.pow(Math.random(), 2) * 0.10,
      r: 0.3 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      spd: 0.0015 + Math.random() * 0.004,
    })),
    ...Array.from({length: 10}, () => ({
      px: Math.random(), py: Math.pow(Math.random(), 2) * 0.10,
      r: 0.15 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
      spd: 0.004 + Math.random() * 0.006,
    })),
    // 上位10〜20%に追加（全星の半数相当）
    ...Array.from({length: 45}, () => ({
      px: Math.random(), py: 0.10 + Math.random() * 0.10,
      r: 0.3 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      spd: 0.0015 + Math.random() * 0.004,
    })),
    // 上位20〜35%に追加（全星の約15%）
    ...Array.from({length: 20}, () => ({
      px: Math.random(), py: 0.20 + Math.random() * 0.15,
      r: 0.3 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      spd: 0.0015 + Math.random() * 0.004,
    })),
    // 上位35〜45%に追加
    ...Array.from({length: 10}, () => ({
      px: Math.random(), py: 0.35 + Math.random() * 0.10,
      r: 0.3 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      spd: 0.0015 + Math.random() * 0.004,
    })),
  ];
  const _nebulae = [
    { px: 0.22, py: 0.10, pr: 0.26, rgb: '130,55,220' },
    { px: 0.78, py: 0.06, pr: 0.18, rgb: '55,90,240'  },
    { px: 0.50, py: 0.30, pr: 0.16, rgb: '200,70,170' },
    { px: 0.10, py: 0.40, pr: 0.14, rgb: '80,130,210' },
  ];

  const mainImg = document.getElementById('growth-char-img');
  let eggImg = null;

  // アニメーション対象のキャラリスト
  const chars = [];

  if (charStage && mainImg) {
    mainImg.style.width = 'auto';
    // adult: なめらか飛行+ゆらゆら / child: ゆっくり歩き / baby: 地面を左右のみ
    const isAdult = charStage === 'adult';
    const spd = { newborn: 0.15, baby: 0.25, child: 0.35, adult: 0.75 }[charStage] || 0.25;
    const stageH = { newborn: 37, baby: 47, child: 60, adult: 73 }[charStage] || 73;
    mainImg.style.height = stageH + 'px';
    chars.push({
      img: mainImg,
      x: 80, y: 200,
      vx: spd * (Math.random() > .5 ? 1 : -1), vy: isAdult ? spd * .4 : 0,
      spd, canFly: isAdult, groundOnly: !isAdult,
      facingLeft: false,
      walk: true,
      walkPeriod: { newborn: 500, baby: 400, child: 300, adult: 220 }[charStage] || 300,
      walkAngle: { newborn: 5, baby: 6, child: 7, adult: 7 }[charStage] || 5,
    });
  } else if (mainImg) {
    // 卵は下寄り固定、ゆれアニメはJSで管理
    mainImg.style.left = '50%'; mainImg.style.top = '74%';
    mainImg.style.transform = 'translate(-50%,-60%)';
    eggImg = mainImg;
  }

  // タッチ判定とハート
  function _spawnHearts(x, y) {
    const offsets = [[-10, -8], [8, -4]];
    offsets.forEach(([dx, dy]) => {
      const el = document.createElement('span');
      el.className = 'growth-heart';
      el.textContent = '💕';
      el.style.left = (x + dx) + 'px';
      el.style.top  = (y + dy) + 'px';
      area.appendChild(el);
      setTimeout(() => el.remove(), 1600);
    });
  }

  area.addEventListener('click', (e) => {
    const areaRect = area.getBoundingClientRect();
    const clickX = e.clientX - areaRect.left;
    const clickY = e.clientY - areaRect.top;

    // 卵の近接判定（getBoundingClientRectで実際の描画位置を取得）
    if (eggImg) {
      const er = eggImg.getBoundingClientRect();
      const ex = er.left - areaRect.left + er.width  / 2;
      const ey = er.top  - areaRect.top  + er.height / 2;
      if (Math.hypot(clickX - ex, clickY - ey) < er.height / 2 + 50) {
        tapSnd();
        _growthTouchAnim = { type: 'egg', born: Date.now() };
        _spawnHearts(ex, ey - er.height * 0.4);
        return;
      }
    }

    // キャラの近接判定（c.x / c.y はフレームループで更新される実座標）
    for (const c of chars) {
      const iW = c.img.offsetWidth || 50;
      const iH = c.img.offsetHeight || 50;
      const cx = c.x + iW / 2;
      const cy = c.y + iH / 2;
      if (Math.hypot(clickX - cx, clickY - cy) < iH + 60) {
        tapSnd();
        if (Math.random() < 0.5) { c.shakeStart = Date.now(); }
        else                      { c.spinStart  = Date.now(); }
        _spawnHearts(cx, cy - iH * 0.4);
        return;
      }
    }
  });

  // 以前に育てたadultキャラをうろうろ（なめらか飛行）
  S.adultCharacters.forEach(adultKind => {
    const adultImg = document.createElement('img');
    adultImg.className = 'growth-adult-img';
    adultImg.src = SPRITES.char[adultKind].adult;
    adultImg.style.cssText = 'position:absolute;height:53px;image-rendering:pixelated;';
    area.appendChild(adultImg);
    const spd = 0.5 + Math.random() * 0.35;
    chars.push({
      img: adultImg,
      x: 40 + Math.random() * 180, y: 150 + Math.random() * 60,
      vx: spd * (Math.random() > .5 ? 1 : -1), vy: (Math.random() - .5) * spd,
      spd, canFly: true,
      facingLeft: Math.random() > .5,
      walk: true,
      walkPeriod: 220, walkAngle: 7,
    });
  });

  if (chars.length === 0 && !eggImg) return;


  // 草地の煌めき（下部の緑エリア）
  const grassSparkles = Array.from({length: 60}, () => ({
    px: Math.random(), py: 0.70 + Math.random() * 0.30,
    r: 0.4 + Math.random() * 1.0,
    phase: Math.random() * Math.PI * 2,
    spd: 0.0008 + Math.random() * 0.0025,
  }));

  const startTime = Date.now();

  function frame() {
    const W = area.clientWidth, H = area.clientHeight;
    const t = Date.now() - startTime;

    // 星空描画
    const sCtx = starsCanvas.getContext('2d');
    if (starsCanvas.width !== W || starsCanvas.height !== H) {
      starsCanvas.width = W; starsCanvas.height = H;
    }
    sCtx.clearRect(0, 0, W, H);
    _nebulae.forEach(n => {
      const grd = sCtx.createRadialGradient(n.px*W, n.py*H, 0, n.px*W, n.py*H, n.pr*W);
      grd.addColorStop(0, `rgba(${n.rgb},0.13)`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      sCtx.fillStyle = grd;
      sCtx.fillRect(0, 0, W, H);
    });
    _stars.forEach(s => {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.spd + s.phase));
      sCtx.beginPath();
      sCtx.arc(s.px * W, s.py * H, s.r, 0, Math.PI * 2);
      sCtx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      sCtx.fill();
    });
    // 草地の煌めき
    grassSparkles.forEach(s => {
      const alpha = 0.15 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.spd + s.phase));
      sCtx.beginPath();
      sCtx.arc(s.px * W, s.py * H, s.r, 0, Math.PI * 2);
      sCtx.fillStyle = `rgba(210,255,220,${alpha.toFixed(2)})`;
      sCtx.fill();
    });

    // 卵のゆれ（ランダム間欠 + タッチぐらぐら）
    if (eggImg) {
      const n = S.renshuClears;
      const wobbleAngle = [2, 5, 9, 14][Math.min(n, 3)];
      const period      = [6000, 4000, 2500, 1500][Math.min(n, 3)];
      const wobbleDur   = [600, 700, 800, 900][Math.min(n, 3)];
      let rot = 0;
      if (_growthTouchAnim && _growthTouchAnim.type === 'egg') {
        const age = Date.now() - _growthTouchAnim.born;
        const shakeDur = 750;
        if (age < shakeDur) {
          rot = Math.sin((age / shakeDur) * Math.PI * 7) * 22 * (1 - age / shakeDur);
        } else {
          _growthTouchAnim = null;
        }
      } else {
        const phase = t % period;
        rot = phase < wobbleDur
          ? Math.sin((phase / wobbleDur) * Math.PI * 2) * wobbleAngle
          : 0;
      }
      eggImg.style.transform = `translate(-50%,-60%) rotate(${rot.toFixed(2)}deg)`;
    }

    chars.forEach(c => {
      const iW = c.img.offsetWidth || 60, iH = c.img.offsetHeight || 60;
      const floor = c.canFly ? 20 : H * 0.6;
      c.x += c.vx;
      if (c.groundOnly) {
        // 赤ちゃんは地面を左右のみ
        c.y = H - iH - 10;
        c.vy = 0;
      } else {
        c.y += c.vy;
        if (Math.random() < 0.015) c.vy += (Math.random() - .5) * c.spd * (c.canFly ? .3 : .1);
        const maxVy = c.spd * 2;
        if (Math.abs(c.vy) > maxVy) c.vy = Math.sign(c.vy) * maxVy;
        if (c.y < floor)       { c.y = floor;      c.vy =  Math.abs(c.vy); }
        if (c.y > H - iH - 10) { c.y = H - iH-10; c.vy = -Math.abs(c.vy); }
      }
      if (Math.random() < 0.015) c.vx += (Math.random() - .5) * c.spd * .5;
      const maxV = c.spd * 2;
      if (Math.abs(c.vx) > maxV) c.vx = Math.sign(c.vx) * maxV;
      if (c.x < 0)           { c.x = 0;         c.vx =  Math.abs(c.vx); }
      if (c.x > W - iW)      { c.x = W - iW;    c.vx = -Math.abs(c.vx); }
      c.facingLeft = c.vx < -0.1 ? true : c.vx > 0.1 ? false : c.facingLeft;
      const flipX = c.facingLeft ? -1 : 1;
      let tfm;
      if (c.spinStart) {
        const age = Date.now() - c.spinStart;
        const dur = 560;
        if (age < dur) {
          const eased = 1 - Math.pow(1 - age / dur, 2);
          tfm = `scaleX(${flipX}) rotate(${(eased * 360).toFixed(1)}deg)`;
        } else {
          c.spinStart = null;
          tfm = `scaleX(${flipX})`;
        }
      } else if (c.shakeStart) {
        const age = Date.now() - c.shakeStart;
        if (age < 650) {
          const p = age / 650;
          const shakeRot = Math.sin(p * Math.PI * 9) * 18 * (1 - p);
          const shakeX   = Math.sin(p * Math.PI * 11) * 5 * (1 - p);
          tfm = `scaleX(${flipX}) rotate(${shakeRot.toFixed(2)}deg) translateX(${shakeX.toFixed(1)}px)`;
        } else {
          c.shakeStart = null;
          tfm = `scaleX(${flipX})`;
        }
      } else if (c.walk) {
        // カタカタ歩き: 速度があるときだけ揺れる
        const moving = Math.abs(c.vx) > 0.2;
        const walkRot = moving ? Math.sin(t / c.walkPeriod) * c.walkAngle : 0;
        tfm = `scaleX(${flipX}) rotate(${walkRot.toFixed(2)}deg)`;
      } else {
        tfm = `scaleX(${flipX})`;
      }
      c.img.style.left = c.x.toFixed(1) + 'px';
      c.img.style.top  = c.y.toFixed(1) + 'px';
      c.img.style.transform = tfm;
    });

    // キャラ同士の重なりを解消
    for (let i = 0; i < chars.length; i++) {
      for (let j = i + 1; j < chars.length; j++) {
        const ci = chars[i], cj = chars[j];
        const wiW = ci.img.offsetWidth || 60, wiH = ci.img.offsetHeight || 60;
        const wjW = cj.img.offsetWidth || 60, wjH = cj.img.offsetHeight || 60;
        const dx = (ci.x + wiW / 2) - (cj.x + wjW / 2);
        const dy = (ci.y + wiH / 2) - (cj.y + wjH / 2);
        const minDist = (wiW + wjW) / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < minDist) {
          const push = (minDist - dist) / 2;
          const nx = dx / dist, ny = dy / dist;
          ci.x += nx * push; ci.y += ny * push;
          cj.x -= nx * push; cj.y -= ny * push;
          ci.vx += nx * 0.1; cj.vx -= nx * 0.1;
        }
      }
    }

    // 卵とキャラの重なりを解消
    if (eggImg) {
      const eW = eggImg.offsetWidth || 50, eH = eggImg.offsetHeight || 60;
      const eCx = W * 0.5, eCy = H * 0.74 - eH * 0.1;
      chars.forEach(c => {
        const cW = c.img.offsetWidth || 60, cH = c.img.offsetHeight || 60;
        const cCx = c.x + cW / 2, cCy = c.y + cH / 2;
        const dx = cCx - eCx, dy = cCy - eCy;
        const minDist = (eW + cW) / 2 * 0.85;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < minDist) {
          const push = minDist - dist;
          const nx = dx / dist;
          c.x += nx * push;
          c.vx += nx * 0.2;
        }
      });
    }

    _growthRaf = requestAnimationFrame(frame);
  }
  _growthRaf = requestAnimationFrame(frame);
}

function stopGrowthAnim() {
  if (_growthRaf) { cancelAnimationFrame(_growthRaf); _growthRaf = null; }
}

function nextRenshu() {
  S.idx++;
  if (S.idx >= S.probs.length) doneDan();
  else showProb();
}
function doneDan() {
  if (S.dan !== 'random') {
    S.done[S.dan] = true;
  }
  const growthBefore = getGrowthClears();
  // 正答率6割以上なら れんしゅうメダル を付与（成長トリガー）
  const total = S.probs.length;
  const correct = S.hanamaruCount - (S._hanamaruAtStart || 0);
  const passedRenshu = correct / total >= 0.6;
  const alreadyHadRenshu = getMedals(S.dan).renshu;
  if (passedRenshu) {
    getMedals(S.dan).renshu = true;
    updateGrowthFromMedals();
    refreshDanBadge(S.dan);
    refreshModeMedals();
    saveState();
  }

  updateCreature();
  if (S._pendingGraduation) return;

  const grew = getGrowthClears() > growthBefore;
  updateClearScreen(grew);
  document.getElementById('clear-title').textContent = grew
    ? 'せいちょう　したよ！'
    : (S.dan === 'random' ? 'ばらばらのだんが　できたね！' : KD.fw(S.dan) + 'のだんが　できたね！');
  const medalMsgEl = document.getElementById('clear-medal-msg');
  if (medalMsgEl) {
    medalMsgEl.textContent = passedRenshu
      ? (alreadyHadRenshu ? 'メダルは　もう　もってるよ！' : 'メダルを　もらえたよ！')
      : '';
  }
  showScreen('screen-clear');
  confetti();
  speak(grew ? 'せいちょうしたよ！やったね！' : 'やったー！ぜんもんできたよ！すごい！');
}

function updateClearScreen(grew = false) {
  if (!S.selectedEgg) return;
  const n = S.renshuClears;
  const kind = S.selectedEgg;
  const charStage = getCharStage(n);
  const clearEgg = document.getElementById('clear-egg-img');
  const clearLabel = document.getElementById('clear-stage-label');
  const crackSvg = document.getElementById('clear-crack-svg');
  if (crackSvg) crackSvg.style.display = 'none';

  if (charStage) {
    if (clearEgg) { clearEgg.src = getCharSprite(kind, charStageIdx(n)); clearEgg.style.height = '90px'; }
  } else {
    if (clearEgg) { clearEgg.src = getEggSprite(kind, n); clearEgg.style.height = '90px'; }
  }
  if (clearLabel) {
    clearLabel.textContent = grew
      ? (charStage ? 'せいちょう　したよ！🎉' : 'たまごが　かわったよ！🎉')
      : 'つぎのメダルで　せいちょうするよ';
  }
}

/* ════════════════════════════════
   花丸オーバーレイ
   クラス付け外しで stroke-dashoffset アニメを再トリガー。
   要素をクローンして差し替えることで確実に再生。
════════════════════════════════ */
function showHanamaru() {
  const ov = document.getElementById('hanamaru-ov');

  // クラスをリセット
  ov.className = '';
  void ov.offsetWidth; // reflow

  ov.classList.add('show');

  // 1000ms後にフェードアウト
  setTimeout(() => {
    ov.classList.remove('show');
    ov.classList.add('hide');
    setTimeout(() => { ov.className = ''; }, 320);
  }, 1000);
}

/* ════════════════════════════════
   CONFETTI
════════════════════════════════ */
function confetti() {
  const cols = ['#5C5FE8','#E03030','#3EA0DC','#22AA66','#FFCC44'];
  for (let i = 0; i < 65; i++) {
    const p = document.createElement('div'); p.className = 'confetti-piece';
    p.style.cssText = `left:${Math.random()*100}vw;background:${cols[~~(Math.random()*cols.length)]};
      width:${6+Math.random()*7}px;height:${6+Math.random()*7}px;
      border-radius:${Math.random()>.5?'50%':'3px'};
      animation-duration:${1.5+Math.random()*2}s;animation-delay:${Math.random()*.7}s;`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }
}




/* ════════════════════════════════
   TEST MODE
   ・問題をシャッフルして出題
   ・数字グリッドで回答（れんしゅうと同じUI）
   ・8問中6問以上でクリア（75%）
   ・メダル：初回=ブロンズ、2回目=銀、3回目以降=金
════════════════════════════════ */


function startTest() {
  let all;
  if (S.dan === 'random') {
    // 全9段から問題を集める
    all = [];
    for (let d = 1; d <= 9; d++) {
      all = all.concat(KD.problems(d));
    }
  } else {
    all = KD.problems(S.dan);
  }
  // シャッフル（Fisher-Yates）
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  S._testProbs   = S.dan === 'random' ? shuffled.slice(0, 10) : shuffled;
  S._testIdx     = 0;
  S._testCorrect = 0;
  S._testShown   = false;
  S._testInput   = '';
  const testLabel = S.dan === 'random' ? 'ばらばらのだん　テスト' : KD.danLabel(S.dan) + '　テスト';
  document.getElementById('test-dan-label').textContent = testLabel;
  buildTestGrid();
  showScreen('screen-test');
  const speechLabel = S.dan === 'random' ? 'ランダムの　テスト　はじめるよ！' : KD.danLabel(S.dan) + 'の　テスト　はじめるよ！';
  speak(speechLabel);
  showTestProb();
}

function buildTestGrid() {
  const g = document.getElementById('test-grid'); g.innerHTML = '';
  // 0キー
  const b0 = document.createElement('button');
  b0.className = 'ans-btn'; b0.textContent = KD.fw(0); b0.dataset.val = 0;
  b0.onclick = () => testInputDigit('0'); g.appendChild(b0);
  // けす
  const bDel = document.createElement('button');
  bDel.className = 'ans-btn ans-del'; bDel.textContent = 'けす';
  bDel.onclick = () => testDeleteDigit(); g.appendChild(bDel);
  // spacer
  const bSp = document.createElement('div'); bSp.style.cssText = 'visibility:hidden;'; g.appendChild(bSp);
  // 1-9
  for (let n = 1; n <= 9; n++) {
    const b = document.createElement('button');
    b.className = 'ans-btn'; b.textContent = KD.fw(n); b.dataset.val = n;
    b.onclick = () => testInputDigit(String(n)); g.appendChild(b);
  }
}

let tT = null;
function showTestProb() {
  if (tT) clearTimeout(tT);
  const probs = S._testProbs;
  const i = S._testIdx;
  const pct = (i / probs.length) * 100;
  document.getElementById('test-progress').style.width = pct + '%';
  document.getElementById('test-counter').textContent = `${i + 1} / ${probs.length}`;
  const p = probs[i];
  const qRead = p.questionRead;
  const readingFmt = qRead.includes('が') ? qRead.replace('が', '\u3000が\u3000') : qRead;
  document.getElementById('test-reading').textContent = readingFmt;
  document.getElementById('test-problem').innerHTML =
    `${KD.fw(p.dan)}×${KD.fw(p.multiplier)}＝<span class="q-mark" id="tq-slot" style="display:inline-block;min-width:${p.answer>=10?'2em':'1.2em'};text-align:center;">？</span>`;
  document.getElementById('test-hint').textContent = '';
  document.querySelectorAll('#test-grid .ans-btn').forEach(b => { b.classList.remove('correct','wrong','test-btn-correct','test-btn-wrong'); b.disabled = false; });
  S._testShown = false; S._testInput = '';
  updateTestSlot();
  const speechQ = p.questionRead.endsWith('が') ? kukuTts(p.questionRead) + '？' : kukuTts(p.questionRead) + '\u3000わ？';
  speak(speechQ);
  if (S.testAnsTime > 0) tT = setTimeout(testAutoReveal, S.testAnsTime * 1000);
}

function testAutoReveal() {
  if (S._testShown) return;
  S._testShown = true;
  const p = S._testProbs[S._testIdx];
  const slot = document.getElementById('tq-slot');
  if (slot) { slot.textContent = KD.fw(p.answer); slot.className = 'ans-revealed'; }
  document.getElementById('test-reading').textContent = fmtReading(p);
  document.getElementById('test-hint').textContent = 'じかんぎれ　だよ';
  speak(kukuTts(p.reading));
  setTimeout(() => { S._testInput = ''; testNextProb(); }, 2000);
}

function updateTestSlot() {
  const slot = document.getElementById('tq-slot');
  if (!slot) return;
  if (S._testInput === '') { slot.textContent = '？'; slot.className = 'q-mark'; }
  else { slot.textContent = KD.fw(parseInt(S._testInput, 10)); slot.className = 'q-typing'; }
}

function testDeleteDigit() {
  if (S._testShown) return;
  Snd.tap();
  S._testInput = S._testInput.slice(0, -1);
  updateTestSlot();
}

function testInputDigit(d) {
  if (S._testShown) return;
  const p = S._testProbs[S._testIdx];
  Snd.tap();
  S._testInput = (S._testInput || '') + d;
  const n = parseInt(S._testInput, 10);
  if (n > 81) { S._testInput = d; updateTestSlot(); return; }
  updateTestSlot();
  if (n === p.answer) {
    if (tT) clearTimeout(tT);
    S._testShown = true;
    S._testCorrect++;
    S.hanamaruCount++;
    setTimeout(() => { Snd.pingpong(); showHanamaru(); }, 180);
    // ？を答えで置換
    const slot = document.getElementById('tq-slot');
    if (slot) { slot.textContent = KD.fw(p.answer); slot.className = 'ans-revealed'; }
    document.getElementById('test-reading').textContent = fmtReading(p);
    speakThen(kukuTts(p.reading), 0.86, () => {
      setTimeout(() => { S._testInput = ''; testNextProb(); }, 800);
    });
  } else if (p.answer < 10 || S._testInput.length >= 2) {
    document.querySelectorAll('#test-grid .ans-btn').forEach(b => {
      if (b.dataset.val === d) { b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 400); }
    });
    setTimeout(() => Snd.miss(), 150);
    S._testInput = '';
    updateTestSlot();
  }
}

function testNextProb() {
  S._testIdx++;
  if (S._testIdx >= S._testProbs.length) {
    doneTest();
  } else {
    showTestProb();
  }
}

function doneTest() {
  const total   = S._testProbs.length;
  const correct = S._testCorrect;
  const pct     = correct / total;
  const dan     = S.dan;
  const cleared = pct >= 0.75;  // 75%以上でクリア
  const growthBefore = getGrowthClears();
  const preAwardMedal = getMedals(dan).test;  // 付与前のメダル状態を保存

  if (cleared) {
    const m = getMedals(dan);
    const cur  = m.test;
    const next = NEXT_MEDAL[cur];
    m.test = next;
    updateGrowthFromMedals();
    refreshDanBadge(dan);
    refreshModeMedals();
    saveState();
    if (S._pendingGraduation) return; // 卒業遷移中は結果画面をスキップ
  }

  const grew = getGrowthClears() > growthBefore;
  // 結果画面
  const medal = getMedals(dan).test;
  document.getElementById('test-result-medal').innerHTML = cleared ? (medal ? ctIcon(medal) : '⭐') : '😢';
  document.getElementById('test-result-label').textContent =
    cleared ? (medal ? MEDAL_NAMES[medal] + (preAwardMedal === 'gold' ? 'メダル' : 'メダル　ゲット！') : 'クリア！') : 'もう　いちど！';
  const titleText = dan === 'random'
    ? (cleared ? 'ばらばらのだん　クリア！' : 'ばらばらのだん　もう　すこし！')
    : (cleared ? KD.fw(dan) + 'のだん　クリア！' : KD.fw(dan) + 'のだん　もう　すこし！');
  document.getElementById('test-result-title').textContent = titleText;
  document.getElementById('test-result-score').textContent =
    KD.fw(total) + 'もん中　' + KD.fw(correct) + 'もん　せいかい！';
  const growthEl = document.getElementById('test-result-growth');
  if (growthEl) {
    growthEl.textContent = cleared
      ? (grew ? 'せいちょう　したよ！🎉' : 'つぎのメダルで　せいちょうするよ')
      : '';
  }
  const testMedalMsgEl = document.getElementById('test-medal-msg');
  if (testMedalMsgEl) {
    testMedalMsgEl.textContent = cleared
      ? (preAwardMedal === 'gold' ? 'メダルは　もう　もってるよ！' : 'メダルを　もらえたよ！')
      : '';
  }

  showScreen('screen-test-result');
  if (cleared) { confetti(); speak(grew ? 'せいちょうしたよ！メダルゲット！' : 'やったー！メダルゲット！'); }
  else { speak('もう　いちど　ちゃれんじして　ね！'); }
}



/* ════════════════════════════════
   EGG SELECT — 初回3種(green/pink/blue)、2回目以降6種からランダム3つ
════════════════════════════════ */
const EGG_KINDS_FIRST  = ['green','pink','blue'];
const EGG_KINDS_ALL    = ['green','pink','blue','purple','orange','silver'];

function _pickEggChoices() {
  // 初回（卵を一度も選んでいない）: 元の3種固定
  if (S.adultCharacters.length === 0) return EGG_KINDS_FIRST;
  // 2回目以降: 6種からランダムで3つ
  const pool = EGG_KINDS_ALL.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

function buildEggSelectGrid() {
  const g = document.getElementById('egg-select-grid'); g.innerHTML = '';
  // OKボタンを毎回 disabled 状態にリセット（前回の enabled 状態が残らないよう）
  const okBtn = document.getElementById('egg-ok-btn');
  if (okBtn) { okBtn.disabled = true; okBtn.style.opacity = '.4'; }
  const choices = _pickEggChoices();
  choices.forEach(kind => {
    const btn = document.createElement('button');
    btn.className = 'egg-sel-btn' + (S.selectedEgg === kind ? ' selected' : '');
    btn.dataset.egg = kind;
    const img = document.createElement('img');
    img.src = SPRITES.egg[kind].intact;
    img.alt = kind;
    btn.appendChild(img);
    btn.onclick = () => {
      Snd.tap();
      document.querySelectorAll('.egg-sel-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      S.selectedEgg = kind;
      const okBtn = document.getElementById('egg-ok-btn');
      okBtn.disabled = false; okBtn.style.opacity = '1';
      speak('このたまごにする！');
    };
    g.appendChild(btn);
  });
  // 既に選択済みの卵があればOKボタンを有効化
  if (okBtn && S.selectedEgg) { okBtn.disabled = false; okBtn.style.opacity = '1'; }
}


/* ════════════════════════════════
   KUKURUN CHARACTER LOGIC
════════════════════════════════ */

/* ════════════════════════════════
   ZENBUKESUS TRIPLE TAP DEBUG TOGGLE
   「ぜんぶ　けす」を3回連続タップでデバッグパネル表示/非表示
════════════════════════════════ */
let debugTapCount = 0;
let debugTapTimer = null;

function handleZenbukesus() {
  debugTapCount++;
  
  // 前のタイマーをクリア
  if (debugTapTimer) clearTimeout(debugTapTimer);
  
  // 3回連続タップで表示/非表示を切り替え
  if (debugTapCount === 3) {
    const debugPanel = document.getElementById('debug-panel');
    debugPanel.classList.toggle('visible');
    if (debugPanel.classList.contains('visible')) debugBuildCertBtns();
    debugTapCount = 0; // リセット
  } else {
    // 2秒以内に次のタップがなければリセット
    debugTapTimer = setTimeout(() => {
      debugTapCount = 0;
    }, 2000);
  }
}

/* ════════════════════════════════
   SETTINGS
════════════════════════════════ */
function openSettings() {
  const nameLabel = document.getElementById('settings-name-label');
  if (nameLabel) nameLabel.textContent = fullName() || '（なし）';
  const toggle = document.getElementById('speech-toggle');
  if (toggle) toggle.classList.toggle('on', S.speechEnabled !== false);
  updateTimeSelUI('renshu-time-sel', S.renshuAnsTime);
  updateTimeSelUI('test-time-sel', S.testAnsTime);
  updateBottomBar('settings');
  showScreen('screen-settings');
}
function updateTimeSelUI(id, val) {
  const grp = document.getElementById(id);
  if (!grp) return;
  grp.querySelectorAll('button').forEach(b => {
    b.classList.toggle('selected', parseInt(b.dataset.val, 10) === val);
  });
}
function setRenshuTime(t) { tapSnd(); S.renshuAnsTime = t; saveState(); updateTimeSelUI('renshu-time-sel', t); }
function setTestTime(t)   { tapSnd(); S.testAnsTime   = t; saveState(); updateTimeSelUI('test-time-sel',   t); }

function toggleSpeech() {
  S.speechEnabled = !S.speechEnabled;
  const toggle = document.getElementById('speech-toggle');
  if (toggle) toggle.classList.toggle('on', S.speechEnabled);
  saveState();
}

function goChangeName() {
  // 名前入力画面へ（現在の名前をクリア）
  _skipEggSelect = true;
  const nd = document.getElementById('name-display');
  if (nd) nd.innerHTML = '<span class="name-placeholder">ここに　でるよ</span>';
  const ok = document.getElementById('name-ok-btn');
  if (ok) { ok.disabled = true; ok.style.opacity = '.4'; }
  showScreen('screen-name');
  speak('あたらしい　なまえを　おしえてね');
}

let _skipEggSelect = false;
let _confirmType = null;
function openConfirm(type) {
  _confirmType = type;
  const title = document.getElementById('confirm-title');
  const msg = document.getElementById('confirm-msg');
  const okBtn = document.getElementById('confirm-ok-btn');
  if (type === 'name') {
    if (title) title.textContent = 'なまえを　かえる';
    if (msg) msg.textContent = 'なまえを　かえると　はじめから\nいれなおすよ。\nほんとうに　かえる？';
    if (okBtn) okBtn.textContent = 'かえる';
  } else if (type === 'medal') {
    if (title) title.textContent = 'めだると　せいちょうを　けす';
    if (msg) msg.textContent = 'めだると　せいちょうが　ぜんぶ　きえるよ。\nほんとうに　けす？';
    if (okBtn) okBtn.textContent = 'けす';
  } else {
    if (title) title.textContent = 'ぜんぶ　けして　はじめから　やる';
    if (msg) msg.textContent = 'なまえや　めだるが　ぜんぶ　きえて\nはじめから　やりなおしになるよ。\nほんとうに　けす？';
    if (okBtn) okBtn.textContent = 'けす';
  }
  const overlay = document.getElementById('confirm-overlay');
  if (overlay) overlay.style.display = 'flex';
  requestAnimationFrame(() => {
    const cancel = document.getElementById('confirm-cancel-btn');
    if (cancel) cancel.focus();
  });
}
function closeConfirm() {
  const overlay = document.getElementById('confirm-overlay');
  if (overlay) overlay.style.display = 'none';
  _confirmType = null;
}
function executeConfirm() {
  if (_confirmType === 'name') {
    closeConfirm();
    goChangeName();
  } else if (_confirmType === 'medal') {
    S.medals = {};
    S.certificates = {};
    S._growthBase = 0;
    S.adultCharacters = [];
    S.selectedEgg = null;
    S.renshuClears = 0;
    S.done = {};
    S.hanamaruCount = 0;
    saveState();
    closeConfirm();
    buildDanGrid();
    updateCreature();
    showScreen('screen-home');
    speak('メダルを　リセットしたよ');
  } else if (_confirmType === 'app') {
    try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
    location.reload();
  }
}

// データJSON一括ロード後に初期化
Promise.all([
  fetch('kana.json').then(r => r.json()),
  fetch('messages.json').then(r => r.json()),
  fetch('kana_hoka.json').then(r => r.json()),
  fetch('balloon_messages.json').then(r => r.ok ? r.json() : {}).catch(() => ({})),
]).then(([kana, msg, hoka, balloon]) => {
  KANA_ROWS      = kana.kanaRows;
  SUFFIXES       = kana.suffixes;
  HOKA_SECTIONS  = hoka.hokaSections;
  kukurunMessages = msg.kukurunMessages;
  kukurunScripts  = msg.kukurunScripts;
  // kukurun.js側のメッセージも更新
  if (typeof HOME_KUKURUN_MESSAGES !== 'undefined') {
    HOME_KUKURUN_MESSAGES.splice(0, HOME_KUKURUN_MESSAGES.length, ...msg.homeMessages);
  }
  // 吹き出しメッセージをJSONで上書き
  if (typeof SCREEN_MESSAGES !== 'undefined') {
    Object.assign(SCREEN_MESSAGES, balloon);
  }
  buildKanaGrid();
}).catch(err => {
  console.warn('JSON load failed, using fallback:', err);
  KANA_ROWS = [
    ['あ','い','う','え','お'],['か','き','く','け','こ'],
    ['さ','し','す','せ','そ'],['た','ち','つ','て','と'],
    ['な','に','ぬ','ね','の'],['は','ひ','ふ','へ','ほ'],
    ['ま','み','む','め','も'],['や','ゆ','よ','わ','ん'],
    ['ら','り','る','れ','ろ'],
  ];
  SUFFIXES = [{l:'なし',v:''},{l:'さん',v:'さん'},{l:'くん',v:'くん'},{l:'ちゃん',v:'ちゃん'}];
  HOKA_SECTIONS = [
    {title:'だくてん・はんだくてん',rows:[['が','ぎ','ぐ','げ','ご'],['ざ','じ','ず','ぜ','ぞ'],['だ','ぢ','づ','で','ど'],['ば','び','ぶ','べ','ぼ'],['ぱ','ぴ','ぷ','ぺ','ぽ']]},
    {title:'ちいさいかな・のばすおと',rows:[['っ','ゃ','ゅ','ょ','ー']]},
  ];
  kukurunMessages = ['どれを　やる？','がんばろうね！','すごーい！','天才だよ！'];
  kukurunScripts  = [
    {text:'どれを　やる？', sequence:['O','E','O','A','U']},
    {text:'がんばろうね！', sequence:['A','I','O','O','U']},
  ];
  buildKanaGrid();
});

loadState();
initDinos();

initKukurun();

restoreSession();

// イントロアニメーション（毎回表示）
playIntroAnimation();

// iOS: 初回タッチでAudioContextをアンロック（サイレント再生）
document.addEventListener('touchstart', () => Snd.unlock(), { once: true, passive: true });

// ══ グローバルタップエフェクト ══
(function initTapFx() {
  const cvs = document.getElementById('tap-fx-canvas');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const effects = [];
  let raf = null;

  function resize() {
    cvs.width  = window.innerWidth;
    cvs.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function addEffect(x, y) {
    const r = cvs.getBoundingClientRect();
    const sx = r.width  ? cvs.width  / r.width  : 1;
    const sy = r.height ? cvs.height / r.height : 1;
    effects.push({ x: x * sx, y: y * sy, born: Date.now() });
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function loop() {
    const now = Date.now();
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (let i = effects.length - 1; i >= 0; i--) {
      const ef = effects[i];
      const age = now - ef.born;
      const dur = 520;
      if (age > dur) { effects.splice(i, 1); continue; }
      const p = age / dur;
      const ease = 1 - p * p;
      // 中心フラッシュ（序盤のみ）
      if (p < 0.25) {
        const fp = p / 0.25;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, 8 * (1 - fp), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,230,${((1 - fp) * 0.7).toFixed(2)})`;
        ctx.fill();
      }
      // 外輪
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, 6 + p * 34, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,235,140,${(ease * 0.85).toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // 内輪
      ctx.beginPath();
      ctx.arc(ef.x, ef.y, 3 + p * 9, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${(ease * 0.75).toFixed(2)})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    raf = effects.length ? requestAnimationFrame(loop) : null;
  }

  let _lastTouch = 0;
  document.addEventListener('touchstart', e => {
    _lastTouch = Date.now();
    addEffect(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  document.addEventListener('click', e => {
    if (Date.now() - _lastTouch > 400) addEffect(e.clientX, e.clientY);
  });
})();
