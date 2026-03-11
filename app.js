
/* ════════════════════════════════
   SPRITE SYSTEM
   卵: green/pink/blue × intact/crack1/crack2/hatch
   キャラ: green/pink/blue × newborn/baby/child/adult
   ステージ決定: renshuClears（6割クリア回数）
     0→intact, 1→crack1, 2→crack2, 3→hatch→newborn,
     4→baby, 5→child, 6→adult
════════════════════════════════ */

// ステージ番号からスプライトを取得
function getEggSprite(kind, n) {
  if (n <= 0) return SPRITES.egg[kind].intact;
  if (n === 1) return SPRITES.egg[kind].crack1;
  if (n === 2) return SPRITES.egg[kind].crack2;
  return SPRITES.egg[kind].hatch; // 孵化直前（3）
}
function getCharSprite(kind, n) {
  // n = renshuClears - 3 (孵化後のステップ数)
  if (n <= 0) return SPRITES.char[kind].newborn;
  if (n === 1) return SPRITES.char[kind].baby;
  if (n === 2) return SPRITES.char[kind].child;
  return SPRITES.char[kind].adult;
}
function isHatched(n) { return n >= 3; } // renshuClears >= 3 で孵化済み

// charStage: null=卵, 'newborn','baby','child','adult'
function getCharStage(n) {
  if (n < 3) return null;
  const after = n - 3;
  if (after === 0) return 'newborn';
  if (after === 1) return 'baby';
  if (after === 2) return 'child';
  return 'adult';
}

// ホーム画面・クリア画面の表示を更新
function updateCreature() {
  if (!S.selectedEgg && S.adultCharacters.length === 0) return;
  
  // 表示対象を決定：成人キャラがあればそれを表示、なければ現在の卵を表示
  let displayKind = S.selectedEgg;
  let displayClears = S.renshuClears;
  
  // 成人キャラがあれば、最後の成人キャラを表示
  if (S.adultCharacters.length > 0) {
    displayKind = S.adultCharacters[S.adultCharacters.length - 1];
    displayClears = S.charClears[displayKind] || 0;
  }
  
  const n = displayClears;
  const kind = displayKind;
  const charStage = getCharStage(n);
  const homeWrap = document.getElementById('home-creature-wrap');
  if (homeWrap) homeWrap.style.display = 'flex';

  const homeEgg = document.getElementById('home-egg-img');
  if (homeEgg) {
    if (charStage) {
      homeEgg.src = getCharSprite(kind, n - 3);
      homeEgg.style.height = charStage === 'newborn' ? '45px'
                           : charStage === 'baby'    ? '50px'
                           : charStage === 'child'   ? '55px' : '60px';
    } else {
      homeEgg.src = getEggSprite(kind, n);
      homeEgg.style.height = '50px';
    }
  }
  // ヒビSVGオーバーレイは使わない（画像差し替えで表現）
  const homeCrackSvg = document.getElementById('home-crack-svg');
  if (homeCrackSvg) homeCrackSvg.style.display = 'none';

  const stageNames = {newborn:'うまれたて',baby:'あかちゃん',child:'こども',adult:'おとな'};
  const homeLabel = document.getElementById('home-stage-label');
  if (homeLabel) {
    if (charStage) homeLabel.textContent = stageNames[charStage] + 'になったよ！';
    else homeLabel.textContent = 'はなまる ' + KD.fw(S.hanamaruCount) + ' こ';
  }

  // アニメ制御
  charAnim.updateStage(charStage, n);

  // suffix画面
  const dinSufEl = document.getElementById('dino-suffix');
  if (dinSufEl) dinSufEl.src = charStage
    ? getCharSprite(kind, n - 3)
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
    // n = renshuClears
    if (n <= 0) return null; // 揺れなし
    if (n === 1) return { interval: [4000, 8000], deg: 5, dur: 600 };
    if (n === 2) return { interval: [2000, 5000], deg: 9, dur: 700 };
    return           { interval: [800, 2000],  deg: 14, dur: 800 }; // 孵化直前
  }

  function wobble() {
    const wrap = document.getElementById('home-egg-wrap');
    if (!wrap || isHatched(S.renshuClears)) { timer = null; return; }
    const params = wobbleParams(S.renshuClears);
    if (!params) { timer = setTimeout(wobble, 2000); return; }

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
      const params = wobbleParams(S.renshuClears);
      if (!params || isHatched(S.renshuClears)) return;
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
  function ac() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    return _ctx;
  }
  function run(fn) {
    const c = ac();
    (c.state === 'suspended' ? c.resume() : Promise.resolve()).then(fn).catch(() => {});
  }
  function beep(freq, t, dur, vol = 0.3, type = 'sine', c = null) {
    const ctx = c || ac();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    tap()      { run(() => beep(600, ac().currentTime, 0.06, 0.1)); },
    click()    { run(() => beep(1200, ac().currentTime, 0.025, 0.055, 'square')); },
    pingpong() { run(() => { const c = ac(), now = c.currentTime; beep(880, now, .24, .34, 'sine', c); beep(1047, now + .3, .24, .34, 'sine', c); }); },
    miss()     { run(() => { const c = ac(), now = c.currentTime; beep(440, now, .17, .12, 'sine', c); beep(370, now + .1, .17, .08, 'sine', c); }); }
  };
})();
function tapSnd() { Snd.click(); }

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
      u.lang = 'ja-JP'; u.rate = rate; u.pitch = 1.2;
      const v = speechSynthesis.getVoices().find(x => x.lang.startsWith('ja'));
      if (v) u.voice = v;
      if (onend) u.onend = onend;
      speechSynthesis.speak(u);
    }
  };
})();
function speak(t, r) { Spk.say(t, r); }
function speakThen(t, r, cb) { Spk.say(t, r, cb); }

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
  _isAdultEggSelected: false,  // 成人後に卵を再選択したか
  isFirstAccess: true  // 初回アクセスか
};
const fullName = () => S.name + S.suffix;

/* ════════════════════════════════
   SCREEN NAV
════════════════════════════════ */
function showScreen(id) {
  if (id === 'screen-home') {
    const label = document.getElementById('debug-clears-label');
    if (label) label.textContent = S.renshuClears + 'かい';
  }
  if (id === 'screen-oboeru') {
    _updateOboeruReadSelectedBtn();
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

/* ════════════════════════════════
   KANA GRID
   方向: rtl + grid-auto-flow:column
   → 右端があ行、左へかきくけこ…
════════════════════════════════ */
let KANA_ROWS = [];
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
  speak(S.name + '、よびかたをえらんでね');
}
// sufixから卵選択へ
function goEggSelect() {
  Snd.tap(); S.suffix = S.selSuffix;
  buildEggSelectGrid();
  // dino-egg-sel は現状なし（まだ卵未選択）
  showScreen('screen-egg-select');
  speak('すきなたまごをえらんでね！');
}
function goHome() {
  Snd.tap();
  const nm = fullName();
  const greetingText = nm + '、こんにちは！';
  document.getElementById('greeting-text').textContent = greetingText;
  // くくるんの吹き出しにも反映
  const balloonText = document.getElementById('balloon-text');
  if (balloonText) balloonText.textContent = greetingText;
  updateCreature();
  buildDanGrid(); showScreen('screen-home');
  speak(nm + '、くくるんへようこそ！');
}
function goHomeFromEgg() {
  Snd.tap();
  updateCreature();
  eggWobble.start();
  goHome();
}

/* ════════════════════════════════
   DAN GRID
════════════════════════════════ */
const MEDAL_CLR = { bronze:'#CD7F32', silver:'#B8C0CC', gold:'#FFD700' };
function medalBadge(dan) {
  const m = S.medals[dan];
  const medals = ['bronze', 'silver', 'gold'];
  const medalEmojis = { bronze: '🥉', silver: '🥈', gold: '🥇' };
  
  let html = '<div style="position:absolute;top:4px;right:3px;display:flex;flex-direction:column;gap:1px;font-size:14px;line-height:1;">';
  
  medals.forEach(level => {
    const hasMedal = m && medals.indexOf(m) >= medals.indexOf(level);
    html += `<span style="filter:drop-shadow(0 1px 1px rgba(0,0,0,.35));">${hasMedal ? medalEmojis[level] : '　'}</span>`;
  });
  
  html += '</div>';
  return html;
}
function buildDanGrid() {
  const g = document.getElementById('dan-grid'); g.innerHTML = '';
  for (let d = 1; d <= 9; d++) {
    const b = document.createElement('button'); b.className = `dan-btn d${d}`;
    b.style.position = 'relative';
    b.innerHTML = `<span class="dn">${KD.fw(d)}</span><span class="dl">のだん</span>${medalBadge(d)}`;
    b.id = `dan-btn-${d}`;
    b.onclick = () => { Snd.tap(); selDan(d); };
    g.appendChild(b);
  }
}
function refreshDanBadge(dan) {
  const b = document.getElementById(`dan-btn-${dan}`);
  if (!b) return;
  // メダルバッジだけ更新（古いバッジを削除）
  const existing = b.querySelector('div[style*="position:absolute"]');
  if (existing) existing.remove();
  
  // 新しいバッジを追加
  const badgeHtml = medalBadge(dan);
  const temp = document.createElement('div');
  temp.innerHTML = badgeHtml;
  b.appendChild(temp.firstChild);
}
function selDan(dan) {
  S.dan = dan;
  const lbl = dan === 'random' ? 'らんだむ' : KD.fw(dan) + 'のだん';
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
  showScreen('screen-mode'); speak(lbl + 'をえらんだね！');
}

/* ════════════════════════════════
   OBOERU
════════════════════════════════ */
function startOboeru() {
  let problems;
  if (S.dan === 'random') {
    // 全9段から問題を集める
    problems = [];
    for (let d = 1; d <= 9; d++) {
      problems = problems.concat(KD.problems(d));
    }
    // Fisher-Yatesシャッフル
    for (let i = problems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [problems[i], problems[j]] = [problems[j], problems[i]];
    }
  } else {
    problems = KD.problems(S.dan);
  }
  S._oboeruProblems = problems;  // 問題リストを保存
  S._oboeruMode = S._oboeruMode || 'auto';  // 初期値: じどうで　ぜんぶ
  S._oboeruSelected = [];  // manualモードの選択状態リセット
  const label = S.dan === 'random' ? 'らんだむ' : KD.danLabel(S.dan);
  document.getElementById('oboeru-dan-label').textContent = label;
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
      <span class="kuku-read">${p.reading.includes('が') ? p.reading.replace('が', '\u3000が\u3000') : p.reading}</span>
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
  // autoモードのみ自動進行; manualモードは読み上げのみ
  speakThen(p.reading, 0.86, () => {
    document.getElementById(`kc-${i}`).textContent = '✓';
    if ((S._oboeruMode || 'auto') === 'auto') {
      const waitMs = Math.max(1200, p.reading.length * 130);
      const probs = S._oboeruProblems;
      if (i + 1 < probs.length) {
        setTimeout(() => hlRow(i + 1, probs[i + 1]), waitMs);
      }
    }
  });
}
function speakRow(i) { speak(S._oboeruProblems[i].reading); }

// ── おぼえるモード切り替え ──
function setOboeruMode(mode) {
  S._oboeruMode = mode;
  S._oboeruSelected = [];  // 選択リセット
  _updateOboeruSwitch();
  // 全行の選択状態をリセット
  document.querySelectorAll('.kuku-row').forEach(r => {
    r.classList.remove('selected');
    r.classList.remove('current');
  });
  document.querySelectorAll('.kuku-check').forEach(el => el.textContent = '');
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
    speakThen(p.reading, 0.86, () => {
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
    // 全9段から問題をランダムに抽出
    probs = [];
    for (let d = 1; d <= 9; d++) {
      probs = probs.concat(KD.problems(d));
    }
    // Fisher-Yatesシャッフル
    for (let i = probs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [probs[i], probs[j]] = [probs[j], probs[i]];
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

  const bDel = document.createElement('button');
  bDel.className = 'ans-btn ans-del'; bDel.textContent = 'けす';
  bDel.onclick = () => deleteDigit(); g.appendChild(bDel);

  const bSp = document.createElement('div'); // spacer
  bSp.style.cssText = 'visibility:hidden;'; g.appendChild(bSp);

  // ── 2〜4行目: 1-9 ──
  for (let n = 1; n <= 9; n++) {
    const b = document.createElement('button');
    b.className = 'ans-btn'; b.textContent = KD.fw(n); b.dataset.val = n;
    b.onclick = () => inputDigit(String(n)); g.appendChild(b);
  }
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
    speakThen(p.reading, 0.86, () => {
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
  document.getElementById('renshu-hint').textContent = p.answer >= 10 ? '８びょう　たつと　こたえが　でるよ' : '５びょう　たつと　こたえが　でるよ';
  document.getElementById('renshu-next-btn').style.display = 'none';
  document.querySelectorAll('.ans-btn').forEach(b => { b.classList.remove('correct','wrong'); b.disabled = false; });
  S.ansShown = false; S.ansInput = '';
  updateQSlotInput();
  // 音声：「が」で終わる場合はそのまま「が？」、それ以外は読みだけ＋「？」
  const speechQ = p.questionRead + '？';
  speak(speechQ);
  const waitTime = p.answer >= 10 ? 8000 : 5000;
  rT = setTimeout(showAns, waitTime);
}
function showAnsEl(p) {
  // ？マークを答えで置き換え（赤・ポップイン、全角数字）
  const slot = document.getElementById('q-slot');
  if (slot) {
    slot.textContent = KD.fw(p.answer);
    slot.className = 'ans-revealed';
  }
  // 上段の読みを完全版に（が前後スペース）
  const fullFmt = p.reading.includes('が')
    ? p.reading.replace('が', '\u3000が\u3000')
    : p.reading;
  document.getElementById('renshu-reading').textContent = fullFmt;
  document.getElementById('renshu-hint').textContent = '';
  document.getElementById('renshu-next-btn').style.display = 'block';
}
function showAns() {
  if (rT) clearTimeout(rT);
  if (S.ansShown) return;
  S.ansShown = true;
  const p = S.probs[S.idx];
  showAnsEl(p); speak(p.reading);
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
    speakThen(p.reading, 0.86, () => {
      setTimeout(() => nextRenshu(), 1000);
    });
  } else {
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 400);
    setTimeout(() => Snd.miss(), 150);
  }
}

function debugClears(delta) {
  if (delta === null) {
    S.renshuClears = 0;
  } else {
    S.renshuClears = Math.max(0, S.renshuClears + delta);
  }
  save();
  // 卵未選択時はgreen決め打ちでプレビュー
  if (!S.selectedEgg) {
    S.selectedEgg = 'green';
    const homeWrap = document.getElementById('home-creature-wrap');
    if (homeWrap) homeWrap.style.display = 'flex';
  }
  // 成長度を charClears に記録
  S.charClears[S.selectedEgg] = S.renshuClears;
  
  // 成人状態に遷移したら卵選択フラグをリセット（デバッグで確認できるように）
  const n = S.renshuClears;
  const stage = getCharStage(n);
  if (stage === 'adult') {
    S._isAdultEggSelected = false;
    // 成人になったなら記録
    if (!S.adultCharacters.includes(S.selectedEgg)) {
      S.adultCharacters.push(S.selectedEgg);
    }
  }
  // ── デバッグパネル内プレビュー更新 ──
  const kind = S.selectedEgg;
  const stageNames = {newborn:'うまれたて',baby:'あかちゃん',child:'こども',adult:'おとな'};
  const previewImg = document.getElementById('debug-preview-img');
  if (previewImg) {
    previewImg.src = stage ? getCharSprite(kind, n - 3) : getEggSprite(kind, n);
    previewImg.style.display = 'block';
  }
  const label = document.getElementById('debug-clears-label');
  if (label) label.textContent = n + 'かい';
  const stageLabel = document.getElementById('debug-stage-label');
  if (stageLabel) {
    stageLabel.textContent = stage ? stageNames[stage] : 'たまご (' + n + '/3)';
  }
  // ホーム画面も更新（表示中なら反映される）
  updateCreature();
  eggWobble.restart();
}
function debugShowClear() {
  if (!S.selectedEgg) { S.selectedEgg = 'green'; }
  
  const charStage = getCharStage(S.renshuClears);
  
  // 成人になったなら記録
  if (charStage === 'adult' && !S.adultCharacters.includes(S.selectedEgg)) {
    S.adultCharacters.push(S.selectedEgg);
  }
  
  updateClearScreen();
  const title = document.getElementById('clear-title');
  if (title) title.textContent = '🔧 デバッグ確認';
  
  // 成人状態かつ未選択なら卵選択画面へ
  if (charStage === 'adult' && S.selectedEgg && !S._isAdultEggSelected) {
    S._isAdultEggSelected = true;
    setTimeout(() => {
      showScreen('screen-egg-select');
      buildEggSelectGrid();
      speak('また　あらたまごを　えらんでね！');
    }, 1000);
    return;
  }
  
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

function nextRenshu() {
  S.idx++;
  if (S.idx >= S.probs.length) doneDan();
  else showProb();
}
function doneDan() {
  if (S.dan !== 'random') {
    S.done[S.dan] = true;
  }
  // 正答率6割以上ならrenshuClears+1（成長トリガー）
  const total = S.probs.length;
  const correct = S.hanamaruCount - (S._hanamaruAtStart || 0);
  if (correct / total >= 0.6) {
    S.renshuClears++;
    S.charClears[S.selectedEgg] = S.renshuClears;  // 現在の卵の成長度を更新
    eggWobble.restart(); // ステージ変化→揺れ周期更新
  }
  
  const charStage = getCharStage(S.renshuClears);
  
  // 成人になったなら記録
  if (charStage === 'adult' && S.selectedEgg && !S.adultCharacters.includes(S.selectedEgg)) {
    S.adultCharacters.push(S.selectedEgg);
  }
  
  updateCreature();
  // クリア画面の卵・恐竜を更新
  updateClearScreen();
  const clearTitle = S.dan === 'random' ? 'らんだむが　できたね！' : KD.fw(S.dan) + 'のだんが　できたね！';
  document.getElementById('clear-title').textContent = clearTitle;
  
  // 大人になった直後なら卵選択画面へ遷移
  if (charStage === 'adult' && S.selectedEgg && !S._isAdultEggSelected) {
    S._isAdultEggSelected = true;
    setTimeout(() => {
      showScreen('screen-egg-select');
      buildEggSelectGrid();
      speak('また　あらたまごを　えらんでね！');
    }, 1500);
    return;
  }
  
  showScreen('screen-clear');
  confetti();
  speak('やったー！ぜんもんできたよ！すごい！');
}

function updateClearScreen() {
  if (!S.selectedEgg) return;
  const n = S.renshuClears;
  const kind = S.selectedEgg;
  const charStage = getCharStage(n);
  const stageNames = {newborn:'うまれたて',baby:'あかちゃん',child:'こども',adult:'おとな'};
  const clearEgg = document.getElementById('clear-egg-img');
  const clearLabel = document.getElementById('clear-stage-label');
  const crackSvg = document.getElementById('clear-crack-svg');
  if (crackSvg) crackSvg.style.display = 'none'; // SVGヒビは使わない

  if (charStage) {
    if (clearEgg) {
      clearEgg.src = getCharSprite(kind, n - 3);
      clearEgg.style.height = '90px';
    }
    if (clearLabel) clearLabel.textContent = 'せいちょう\u3000したね！';
  } else {
    if (clearEgg) {
      clearEgg.src = getEggSprite(kind, n);
      clearEgg.style.height = '90px';
    }
    if (clearLabel) clearLabel.textContent = 'はなまる ' + KD.fw(S.hanamaruCount) + ' こ';
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

const NEXT_MEDAL = { null: 'bronze', bronze: 'silver', silver: 'gold', gold: 'gold' };

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
  S._testProbs   = shuffled;
  S._testIdx     = 0;
  S._testCorrect = 0;
  S._testShown   = false;
  S._testInput   = '';
  const testLabel = S.dan === 'random' ? 'らんだむ　テスト' : KD.danLabel(S.dan) + '　テスト';
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
  const speechQ = p.questionRead.endsWith('が') ? p.questionRead + '？' : p.questionRead + '\u3000わ？';
  speak(speechQ);
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
    const fullFmt = p.reading.includes('が') ? p.reading.replace('が', '\u3000が\u3000') : p.reading;
    document.getElementById('test-reading').textContent = fullFmt;
    speakThen(p.reading, 0.86, () => {
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

  if (cleared && dan !== 'random') {
    const cur  = S.medals[dan] || null;
    const next = NEXT_MEDAL[cur];
    S.medals[dan] = next;
    refreshDanBadge(dan);
    
    // 大人になった直後（renshuClears >= 6）で、かつこれが1回目のテストクリアなら
    // たまご選択画面へ戻す
    const charStage = getCharStage(S.renshuClears);
    if (charStage === 'adult' && S.selectedEgg && !S._isAdultEggSelected) {
      S._isAdultEggSelected = true;
      setTimeout(() => {
        showScreen('screen-egg-select');
        buildEggSelectGrid();
        speak('また　あらたまごを　えらんでね！');
      }, 1500);
      return;
    }
  }

  // 結果画面
  const medal = dan !== 'random' ? S.medals[dan] : null;
  const medalEm = medal === 'gold' ? '🥇' : medal === 'silver' ? '🥈' : medal === 'bronze' ? '🥉' : '';
  document.getElementById('test-result-medal').textContent = cleared ? medalEm || '⭐' : '😢';
  document.getElementById('test-result-label').textContent =
    cleared ? (medal ? MEDAL_NAMES[medal] + 'メダル　ゲット！' : 'クリア！') : 'もう　いちど！';
  const titleText = dan === 'random' 
    ? (cleared ? 'らんだむ　クリア！' : 'らんだむ　もう　すこし！')
    : (cleared ? KD.fw(dan) + 'のだん　クリア！' : KD.fw(dan) + 'のだん　もう　すこし！');
  document.getElementById('test-result-title').textContent = titleText;
  document.getElementById('test-result-score').textContent =
    KD.fw(total) + 'もん中　' + KD.fw(correct) + 'もん　せいかい！';

  showScreen('screen-test-result');
  if (cleared) { confetti(); speak('やったー！メダルゲット！'); }
  else { speak('もう　いちど　ちゃれんじして　ね！'); }
}
const MEDAL_NAMES = { bronze:'ブロンズ', silver:'ぎん', gold:'きん' };


/* ════════════════════════════════
   EGG SELECT — 3種から選ぶ（green/pink/blue）
════════════════════════════════ */
const EGG_KINDS = ['green','pink','blue'];
function buildEggSelectGrid() {
  const g = document.getElementById('egg-select-grid'); g.innerHTML = '';
  EGG_KINDS.forEach(kind => {
    const btn = document.createElement('button');
    btn.className = 'egg-sel-btn';
    btn.dataset.egg = kind;
    const img = document.createElement('img');
    img.src = SPRITES.egg[kind].intact;
    img.alt = kind;
    btn.appendChild(img);
    btn.onclick = () => {
      Snd.tap();
      // 前の卵の成長度を保存
      if (S.selectedEgg) {
        S.charClears[S.selectedEgg] = S.renshuClears;
      }
      // 新しい卵を選択
      document.querySelectorAll('.egg-sel-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      S.selectedEgg = kind;
      // 選んだ卵の成長度を復元
      S.renshuClears = S.charClears[kind] || 0;
      const okBtn = document.getElementById('egg-ok-btn');
      okBtn.disabled = false; okBtn.style.opacity = '1';
      speak('このたまごにする！');
    };
    g.appendChild(btn);
  });
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
    debugTapCount = 0; // リセット
  } else {
    // 2秒以内に次のタップがなければリセット
    debugTapTimer = setTimeout(() => {
      debugTapCount = 0;
    }, 2000);
  }
}

// データJSON一括ロード後に初期化
Promise.all([
  fetch('kana.json').then(r => r.json()),
  fetch('messages.json').then(r => r.json()),
]).then(([kana, msg]) => {
  KANA_ROWS      = kana.kanaRows;
  SUFFIXES       = kana.suffixes;
  kukurunMessages = msg.kukurunMessages;
  kukurunScripts  = msg.kukurunScripts;
  // kukurun.js側のメッセージも更新
  if (typeof HOME_KUKURUN_MESSAGES !== 'undefined') {
    HOME_KUKURUN_MESSAGES.splice(0, HOME_KUKURUN_MESSAGES.length, ...msg.homeMessages);
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
  kukurunMessages = ['どれを　やる？','がんばろうね！','すごーい！','天才だよ！'];
  kukurunScripts  = [
    {text:'どれを　やる？', sequence:['O','E','O','A','U']},
    {text:'がんばろうね！', sequence:['A','I','O','O','U']},
  ];
  buildKanaGrid();
});

initDinos();

initKukurun();

// イントロアニメーション再生
playIntroAnimation();

// iOS: 初回タッチでAudioContext起動
document.addEventListener('touchstart', () => { try { Snd.tap(); } catch(e) {} }, { once: true, passive: true });
