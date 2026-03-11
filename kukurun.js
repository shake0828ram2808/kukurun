'use strict';

/* ════════════════════════════════
   ✨ タップアニメーション定義
   ここを変えるだけで動きが変わる！
════════════════════════════════ */
const TAP_ANIMATIONS = [
  { name: 'kukuTateBoyo', duration: 650, easing: 'ease-in-out', origin: 'center bottom',
    frames: [
      { at: '0%',   transform: 'scaleX(1)    scaleY(1)' },
      { at: '18%',  transform: 'scaleX(0.75) scaleY(1.48)' },
      { at: '38%',  transform: 'scaleX(1.18) scaleY(0.80)' },
      { at: '55%',  transform: 'scaleX(0.90) scaleY(1.14)' },
      { at: '72%',  transform: 'scaleX(1.06) scaleY(0.94)' },
      { at: '88%',  transform: 'scaleX(0.98) scaleY(1.03)' },
      { at: '100%', transform: 'scaleX(1)    scaleY(1)' },
    ]},
  { name: 'kukuYokoBoyo', duration: 650, easing: 'ease-in-out', origin: 'center center',
    frames: [
      { at: '0%',   transform: 'scaleX(1)    scaleY(1)' },
      { at: '18%',  transform: 'scaleX(1.48) scaleY(0.75)' },
      { at: '38%',  transform: 'scaleX(0.80) scaleY(1.18)' },
      { at: '55%',  transform: 'scaleX(1.14) scaleY(0.90)' },
      { at: '72%',  transform: 'scaleX(0.94) scaleY(1.06)' },
      { at: '88%',  transform: 'scaleX(1.03) scaleY(0.98)' },
      { at: '100%', transform: 'scaleX(1)    scaleY(1)' },
    ]},
  { name: 'kukuYuraYura', duration: 700, easing: 'ease-in-out', origin: 'center bottom',
    frames: [
      { at: '0%',   transform: 'rotate(0deg)' },
      { at: '15%',  transform: 'rotate(-15deg)' },
      { at: '35%',  transform: 'rotate(12deg)' },
      { at: '52%',  transform: 'rotate(-8deg)' },
      { at: '68%',  transform: 'rotate(5deg)' },
      { at: '82%',  transform: 'rotate(-2deg)' },
      { at: '100%', transform: 'rotate(0deg)' },
    ]},
  { name: 'kukuPyon', duration: 600, easing: 'cubic-bezier(0.33,0,0.66,1)', origin: 'center bottom',
    frames: [
      { at: '0%',   transform: 'translateY(0)     scaleX(1)    scaleY(1)' },
      { at: '15%',  transform: 'translateY(0)     scaleX(1.18) scaleY(0.78)' },
      { at: '42%',  transform: 'translateY(-44px) scaleX(0.88) scaleY(1.12)' },
      { at: '65%',  transform: 'translateY(0)     scaleX(1.22) scaleY(0.72)' },
      { at: '80%',  transform: 'translateY(-12px) scaleX(0.94) scaleY(1.06)' },
      { at: '100%', transform: 'translateY(0)     scaleX(1)    scaleY(1)' },
    ]},
  { name: 'kukuSpin', duration: 800, easing: 'cubic-bezier(0.4,0,0.2,1)', origin: 'center center',
    frames: [
      { at: '0%',   transform: 'rotate(0deg)   scale(1)' },
      { at: '10%',  transform: 'rotate(20deg)  scale(0.95)' },
      { at: '30%',  transform: 'rotate(120deg) scale(0.88)' },
      { at: '50%',  transform: 'rotate(200deg) scale(0.92)' },
      { at: '70%',  transform: 'rotate(300deg) scale(1.06)' },
      { at: '85%',  transform: 'rotate(345deg) scale(1.02)' },
      { at: '93%',  transform: 'rotate(358deg) scale(0.99)' },
      { at: '100%', transform: 'rotate(360deg) scale(1)' },
    ]},
  { name: 'kukuPuru', duration: 500, easing: 'linear', origin: 'center center',
    frames: [
      { at: '0%',   transform: 'translateX(0)' },
      { at: '12%',  transform: 'translateX(-7px)' },
      { at: '25%',  transform: 'translateX(7px)' },
      { at: '37%',  transform: 'translateX(-5px)' },
      { at: '50%',  transform: 'translateX(5px)' },
      { at: '62%',  transform: 'translateX(-3px)' },
      { at: '75%',  transform: 'translateX(3px)' },
      { at: '87%',  transform: 'translateX(-1px)' },
      { at: '100%', transform: 'translateX(0)' },
    ]},
];

let _kukurunStyleEl = null;
function _getKukurunStyleEl() {
  if (!_kukurunStyleEl) {
    _kukurunStyleEl = document.createElement('style');
    _kukurunStyleEl.id = 'kukurun-tap-keyframes';
    document.head.appendChild(_kukurunStyleEl);
    _kukurunStyleEl.textContent = TAP_ANIMATIONS.map(a => {
      const steps = a.frames.map(f => `  ${f.at} { transform: ${f.transform}; }`).join('\n');
      return `@keyframes ${a.name} {\n${steps}\n}`;
    }).join('\n\n');
  }
  return _kukurunStyleEl;
}

function playKukurunTapAnim(svg, animName) {
  if (!svg || svg._kukuAnimating) return;
  _getKukurunStyleEl();
  const anim = animName
    ? TAP_ANIMATIONS.find(a => a.name === animName) || TAP_ANIMATIONS[0]
    : TAP_ANIMATIONS[Math.floor(Math.random() * TAP_ANIMATIONS.length)];
  svg._kukuAnimating = true;
  svg.style.transformOrigin = anim.origin || 'center bottom';
  svg.style.animation = 'none';
  void svg.offsetWidth;
  svg.style.animation = `${anim.name} ${anim.duration}ms ${anim.easing} forwards`;

  // ぴょーんのとき床の影も連動
  if (anim.name === 'kukuPyon') {
    const shadowId = svg.id.replace('-svg', '').replace('-kukurun', '') + '-floor-shadow';
    // home-kukurun-svg → home-floor-shadow
    const shadow = document.getElementById('home-floor-shadow');
    if (shadow) {
      shadow.style.animation = 'none';
      void shadow.offsetWidth;
      shadow.style.animation = `shadowPyon ${anim.duration}ms ${anim.easing} forwards`;
    }
  }

  svg.addEventListener('animationend', () => {
    svg.style.animation = '';
    svg.style.transformOrigin = '';
    svg._kukuAnimating = false;
  }, { once: true });
}


/* ════════════════════════════════
   KUKURUN — 共通キャラクター制御
   状態・口・目・アニメーション・全画面分
════════════════════════════════ */

let kukurunState = {
  isJumping: false,
  mouthState: 'munyu',
  isSmiling: false
};

let kukurunMessages = [];

const kukurunMouthSequences = {
  idle:  { path: "M 46,60 Q 50,62 54,60" },
  munyu: { path: "M 45,60 C 46,62 48,62 50,60 C 52,62 54,62 55,60" },
  A: { path: "M 44,59 C 44,66 56,66 56,59 C 56,57 44,57 44,59 Z", tongue: true },
  I: { path: "M 44,60 C 44,63 56,63 56,60 C 56,58 44,58 44,60 Z", tongue: false },
  U: { path: "M 48,60 A 2.5,3.5 0 1 0 52,60 A 2.5,3.5 0 1 0 48,60 Z", tongue: true },
  E: { path: "M 44,59 C 44,64 56,64 56,59 C 56,57 44,57 44,59 Z", tongue: true },
  O: { path: "M 46,59 A 4,6 0 1 0 54,59 A 4,6 0 1 0 46,59 Z", tongue: true },
};

let kukurunScripts  = [];

/* ── ホーム画面 ── */
function setKukurunMouth(state) {
  const mouthPath = document.getElementById('kukurun-mouth-fill');
  const tongue    = document.getElementById('kukurun-tongue');
  const mouth     = kukurunMouthSequences[state];
  if (!mouth) return;
  if (mouthPath) {
    mouthPath.setAttribute('d', mouth.path);
    mouthPath.setAttribute('fill', mouth.path.includes('Z') ? '#442222' : 'none');
  }
  if (tongue) tongue.style.display = mouth.tongue ? 'block' : 'none';
}

function setKukurunSmile(isSmiling) {
  const eyes = document.getElementById('kukurun-eyes');
  if (!eyes) return;
  eyes.querySelectorAll('g').forEach((eye, i) => {
    eye.innerHTML = isSmiling
      ? '<path d="M -5,-1 Q 0,-3 5,-1" fill="none" stroke="#222" stroke-width="2.8" stroke-linecap="round" />'
      : `<circle r="5.8" fill="url(#kukurunEyeGrad)" /><circle cx="${i===0?'1.4':'-1.4'}" cy="-1.8" r="1.8" fill="white" />`;
  });
}

async function kukurunTalk() {
  if (kukurunState.isJumping) return;
  kukurunState.isJumping = true;
  const svg = document.getElementById('kukurun-svg');
  playKukurunTapAnim(svg);
  const script = kukurunScripts[Math.floor(Math.random() * kukurunScripts.length)];
  const balloonText = document.getElementById('balloon-text');
  balloonText.textContent = script.text;
  for (let m of script.sequence) { setKukurunMouth(m); await new Promise(r => setTimeout(r, 120)); }
  kukurunState.isSmiling = true;
  setKukurunSmile(true);
  setKukurunMouth('munyu');
  setTimeout(() => {
    kukurunState.isSmiling = false;
    setKukurunSmile(false);
    kukurunState.isJumping = false;
    setKukurunMouth('munyu');
  }, 800);
}

/* ════════════════════════════════
   各画面のメッセージ定義
   5秒おき＆タップで順番に切り替わる
════════════════════════════════ */
const SCREEN_MESSAGES = {
  name: [
    'こんにちは　ぼくは　くくるん！',
    'きみの　なまえを　おしえて！',
  ],
  suffix: [
    'よびかたを　おしえて！',
    'いっしょに　がんばろうね！',
  ],
  egg: [
    'どれを　そだてたい？',
    'くくを　おぼえて　そだてよう！',
  ],
  home: [
    // インデックス0はdynamic（ユーザー名入り）、JS側で生成
    'きてくれて　ありがとう！',
  ],
};

// 各画面の現在インデックス
const _msgIdx = { name: 0, suffix: 0, egg: 0, home: 0 };
// 各画面のタイマー
const _msgTimers = {};

/** 指定画面の吹き出しテキストを次のメッセージに切り替え */
function _nextBalloonMsg(screen) {
  const msgs = _buildMsgs(screen);
  _msgIdx[screen] = (_msgIdx[screen] + 1) % msgs.length;
  _setBalloon(screen, msgs[_msgIdx[screen]]);
}

/** ユーザー名込みのメッセージリストを返す */
function _buildMsgs(screen) {
  if (screen === 'home') {
    const name = (typeof fullName === 'function') ? fullName() : '';
    const greeting = name ? 'どれを　やる？' + name + '！' : 'どれを　やる？';
    return [greeting, ...SCREEN_MESSAGES.home];
  }
  return SCREEN_MESSAGES[screen] || [];
}

/** 指定画面の吹き出し要素にテキストをセット */
function _setBalloon(screen, text) {
  const idMap = {
    name:   'name-balloon-text',
    suffix: 'suffix-balloon-text',
    egg:    'egg-balloon-text',
    home:   'balloon-text',
  };
  const el = document.getElementById(idMap[screen]);
  if (el) el.textContent = text;
}

/** 5秒タイマーを開始（画面遷移時に呼ぶ） */
function startBalloonTimer(screen) {
  stopBalloonTimer(screen);
  // まず最初のメッセージを表示
  _msgIdx[screen] = 0;
  _setBalloon(screen, _buildMsgs(screen)[0]);
  // 5秒ごとに切り替え
  _msgTimers[screen] = setInterval(() => _nextBalloonMsg(screen), 5000);
}

/** タイマーを停止（画面を離れるとき） */
function stopBalloonTimer(screen) {
  if (_msgTimers[screen]) {
    clearInterval(_msgTimers[screen]);
    _msgTimers[screen] = null;
  }
}

/* ── ホーム画面タップ ── */
let HOME_KUKURUN_MESSAGES = []; // 後方互換のため残す

async function homeKukurunTalk() {
  if (kukurunState.isJumping) return;
  kukurunState.isJumping = true;
  const svg = document.getElementById('home-kukurun-svg');
  playKukurunTapAnim(svg);
  // タップで次のメッセージへ
  _nextBalloonMsg('home');
  Snd.tap();
  for (let m of ['O', 'A', 'I', 'U', 'O']) { setKukurunMouth(m); await new Promise(r => setTimeout(r, 120)); }
  setKukurunSmile(true);
  setKukurunMouth('munyu');
  await new Promise(r => setTimeout(r, 800));
  setKukurunSmile(false);
  setKukurunMouth('munyu');
  kukurunState.isJumping = false;
}

/* ── 名前入力画面 ── */
function setKukurunMouthSmall(state) {
  const mouthPath = document.getElementById('name-kukurun-mouth-fill');
  const tongue    = document.getElementById('name-kukurun-tongue');
  const mouth     = kukurunMouthSequences[state];
  if (!mouth) return;
  if (mouthPath) {
    mouthPath.setAttribute('d', mouth.path);
    mouthPath.setAttribute('fill', mouth.path.includes('Z') ? '#442222' : 'none');
  }
  if (tongue) tongue.style.display = mouth.tongue ? 'block' : 'none';
}

function setKukurunSmileSmall(isSmiling) {
  const eyes = document.getElementById('name-kukurun-eyes');
  if (!eyes) return;
  eyes.querySelectorAll('g').forEach((eye, i) => {
    eye.innerHTML = isSmiling
      ? '<path d="M -5,-1 Q 0,-3 5,-1" fill="none" stroke="#222" stroke-width="2.8" stroke-linecap="round" />'
      : `<circle r="5.8" fill="url(#nameEyeGrad)" /><circle cx="${i===0?'1.4':'-1.4'}" cy="-1.8" r="1.8" fill="white" />`;
  });
}

async function kukurunNameIntro() {
  const svg = document.getElementById('name-kukurun-svg');
  playKukurunTapAnim(svg);
  // タップで次のメッセージへ（タイマーもリセット）
  _nextBalloonMsg('name');
  for (let m of ['O', 'I', 'A', 'I', 'U', 'O']) { setKukurunMouthSmall(m); await new Promise(r => setTimeout(r, 120)); }
  setKukurunSmileSmall(true);
  setKukurunMouthSmall('munyu');
  await new Promise(r => setTimeout(r, 800));
  setKukurunSmileSmall(false);
  setKukurunMouthSmall('munyu');
  if (S.isFirstAccess) S.isFirstAccess = false;
}

/* ── 呼称選択画面 ── */
function setKukurunMouthSuffix(state) {
  const mouthPath = document.getElementById('suffix-kukurun-mouth-fill');
  const tongue    = document.getElementById('suffix-kukurun-tongue');
  const mouth     = kukurunMouthSequences[state];
  if (!mouth) return;
  if (mouthPath) {
    mouthPath.setAttribute('d', mouth.path);
    mouthPath.setAttribute('fill', mouth.path.includes('Z') ? '#442222' : 'none');
  }
  if (tongue) tongue.style.display = mouth.tongue ? 'block' : 'none';
}

function setKukurunSmileSuffix(isSmiling) {
  const eyes = document.getElementById('suffix-kukurun-eyes');
  if (!eyes) return;
  eyes.querySelectorAll('g').forEach((eye, i) => {
    eye.innerHTML = isSmiling
      ? '<path d="M -5,-1 Q 0,-3 5,-1" fill="none" stroke="#222" stroke-width="2.8" stroke-linecap="round" />'
      : `<circle r="5.8" fill="url(#suffixEyeGrad)" /><circle cx="${i===0?'1.4':'-1.4'}" cy="-1.8" r="1.8" fill="white" />`;
  });
}

/* ── 卵選択画面 ── */
function setKukurunMouthEgg(state) {
  const mouthPath = document.getElementById('egg-kukurun-mouth-fill');
  const tongue    = document.getElementById('egg-kukurun-tongue');
  const mouth     = kukurunMouthSequences[state];
  if (!mouth) return;
  if (mouthPath) {
    mouthPath.setAttribute('d', mouth.path);
    mouthPath.setAttribute('fill', mouth.path.includes('Z') ? '#442222' : 'none');
  }
  if (tongue) tongue.style.display = mouth.tongue ? 'block' : 'none';
}

function setKukurunSmileEgg(isSmiling) {
  const eyes = document.getElementById('egg-kukurun-eyes');
  if (!eyes) return;
  eyes.querySelectorAll('g').forEach((eye, i) => {
    eye.innerHTML = isSmiling
      ? '<path d="M -5,-1 Q 0,-3 5,-1" fill="none" stroke="#222" stroke-width="2.8" stroke-linecap="round" />'
      : `<circle r="5.8" fill="url(#eggEyeGrad)" /><circle cx="${i===0?'1.4':'-1.4'}" cy="-1.8" r="1.8" fill="white" />`;
  });
}

async function kukurunTalkSmall() {
  if (kukurunState.isJumping) return;
  kukurunState.isJumping = true;
  // suffix と egg 画面どちらのタップか判定
  const activeSuffix = document.getElementById('screen-suffix')?.classList.contains('active');
  const screen = activeSuffix ? 'suffix' : 'egg';
  const svgId  = activeSuffix ? 'suffix-kukurun-svg' : 'egg-kukurun-svg';
  const svg = document.getElementById(svgId);
  playKukurunTapAnim(svg);
  _nextBalloonMsg(screen);
  const mouthFns = activeSuffix
    ? { set: setKukurunMouthSuffix, smile: setKukurunSmileSuffix }
    : { set: setKukurunMouthEgg,    smile: setKukurunSmileEgg    };
  for (let m of ['O', 'I', 'A', 'U']) { mouthFns.set(m); await new Promise(r => setTimeout(r, 120)); }
  mouthFns.smile(true);
  mouthFns.set('munyu');
  await new Promise(r => setTimeout(r, 800));
  mouthFns.smile(false);
  mouthFns.set('munyu');
  kukurunState.isJumping = false;
}

/* ── イントロモーダル ── */
function closeIntroModal(e) {
  const modal = document.getElementById('intro-modal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => { modal.style.display = 'none'; showScreen('screen-name'); }, 300);
  }
}

function setIntroKukurunMouth(state) {
  const mouthPath = document.getElementById('intro-kukurun-mouth-fill');
  const tongue    = document.getElementById('intro-kukurun-tongue');
  const mouth     = kukurunMouthSequences[state];
  if (!mouth || !mouthPath) return;
  mouthPath.setAttribute('d', mouth.path);
  mouthPath.setAttribute('fill', mouth.path.includes('Z') ? '#442222' : 'none');
  if (tongue) tongue.style.display = mouth.tongue ? 'block' : 'none';
}

function playIntroAnimation() {
  const svg = document.getElementById('intro-kukurun-svg');
  if (!svg) return;
  playKukurunTapAnim(svg);
  (async () => {
    for (let m of ['O', 'I', 'A', 'U', 'O']) { setIntroKukurunMouth(m); await new Promise(r => setTimeout(r, 120)); }
    setIntroKukurunMouth('munyu');
  })();
}


/* ════════════════════════════════
   画面遷移フック
   .screen.active の変化を監視してタイマーを切り替える
════════════════════════════════ */
function _initScreenWatcher() {
  const SCREEN_TIMER_MAP = {
    'screen-name':   'name',
    'screen-suffix': 'suffix',
    'screen-egg-select': 'egg',
    'screen-home':   'home',
  };
  let _currentScreen = null;

  const observer = new MutationObserver(() => {
    const active = document.querySelector('.screen.active');
    if (!active || active.id === _currentScreen) return;
    // 旧タイマー停止
    if (_currentScreen && SCREEN_TIMER_MAP[_currentScreen]) {
      stopBalloonTimer(SCREEN_TIMER_MAP[_currentScreen]);
    }
    _currentScreen = active.id;
    // 新タイマー開始
    const screen = SCREEN_TIMER_MAP[_currentScreen];
    if (screen) startBalloonTimer(screen);
  });

  observer.observe(document.getElementById('app') || document.body, {
    subtree: true, attributes: true, attributeFilter: ['class']
  });
}

/* ── 初期化 ── */
function initKukurun() {
  _getKukurunStyleEl();
  // 吹き出しは1行表示（折り返しなし）
  const balloonStyle = document.createElement('style');
  balloonStyle.textContent = `
    .balloon-text {
      white-space: nowrap !important;
      width: auto !important;
      min-width: unset !important;
      max-width: unset !important;
      display: inline-block !important;
    }
  `;
  document.head.appendChild(balloonStyle);
  setKukurunMouth('munyu');
  setKukurunSmile(false);
  // 画面遷移を監視してタイマー自動切り替え
  _initScreenWatcher();
  setInterval(() => {
    if (!kukurunState.isJumping) {
      setKukurunMouth(Math.random() < 0.7 ? 'munyu' : 'idle');
    }
  }, 2500);
}
