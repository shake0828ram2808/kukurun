/* ════════════════════════════════
   medals.js — メダル・しょうじょう静的データ
   ════════════════════════════════ */

const MEDAL_CLR = { bronze:'#CD7F32', silver:'#B8C0CC', gold:'#FFD700' };
const MEDAL_NAMES = { bronze:'どう', silver:'ぎん', gold:'きん' };
const NEXT_MEDAL = { null: 'bronze', bronze: 'silver', silver: 'gold', gold: 'gold' };

/* ── しょうじょう種別 ── */
const CERT_TYPES = [
  { id:'oboeru',  label:'おぼえる',  mLabel:'おぼえる　メダル',  icon:'🎖️',
    iconStyle:'filter:grayscale(100%) sepia(100%) hue-rotate(190deg) saturate(300%) brightness(0.8);',
    btnColor:'#c4e8d4', btnShadow:'#8ec4a8', btnText:'#1a4230', check:(m)=>m&&m.oboeru },
  { id:'renshu',  label:'れんしゅう', mLabel:'れんしゅう　メダル', icon:'🎖️',
    iconStyle:'filter:grayscale(100%) sepia(100%) hue-rotate(80deg) saturate(200%) brightness(0.7);',
    btnColor:'#f5d4a8', btnShadow:'#c07830', btnText:'#4a2800', check:(m)=>m&&m.renshu },
  { id:'bronze',  label:'どう',      mLabel:'どう　メダル',      icon:'🥉',
    btnColor:'#edd8b4', btnShadow:'#c09058', btnText:'#5a3210', check:(m)=>m&&m.test },
  { id:'silver',  label:'ぎん',      mLabel:'ぎん　メダル',      icon:'🥈',
    btnColor:'#dde0e8', btnShadow:'#aab0bc', btnText:'#363c48', check:(m)=>m&&(m.test==='silver'||m.test==='gold') },
  { id:'gold',    label:'きん',      mLabel:'きん　メダル',      icon:'🥇',
    btnColor:'#fce89a', btnShadow:'#d4a830', btnText:'#4a3200', check:(m)=>m&&m.test==='gold' },
  { id:'kukumaster', label:'くく',   mLabel:'すべての　メダル',  icon:'👑',
    btnColor:'#e8ccf5', btnShadow:'#c088e0', btnText:'#3a1050',
    check: null, isKukuMaster: true },
];
