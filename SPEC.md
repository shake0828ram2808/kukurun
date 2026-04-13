# くくるん — ファイル構成と管理内容

九九を練習する子ども向けアプリ。名前入力 → たまごを育てる → 九九練習、という流れで構成されるシングルページアプリ。

---

## ファイル一覧

### HTML

| ファイル | 管理内容 |
|---|---|
| `index.html` | アプリ全体のDOM構造。全画面・モーダルのHTMLを1ファイルにまとめたSPA |
| `kana_keyboard_mock.html` | かなキーボードの単体動作確認用モック。本番には組み込まれていない |

#### index.html に含まれる画面

| 画面ID | 内容 |
|---|---|
| `screen-name` | 名前入力（かなキーボード・「ほかのもじ」モーダル） |
| `screen-suffix` | 名前のよびかた選択（さん / くん / ちゃん / なし） |
| `screen-egg-select` | たまごの色選択（みどり / ピンク / あお） |
| `screen-home` | ホーム画面。キャラ表示・だん選択・モード選択 |
| `screen-mode` | 学習モード選択（おぼえる / れんしゅう / テスト） |
| `screen-oboeru` | おぼえるモード。問題を見て読み上げ |
| `screen-renshu` | れんしゅうモード。答えをボタンで入力 |
| `screen-test` | テストモード。メダル判定あり |
| `screen-test-result` | テスト結果表示 |
| `screen-clear` | 成長マイルストーン祝福画面 |
| `screen-growth` | せいちょうをみる画面（キャラ・星空アニメ） |
| `screen-cert` | しょうじょう画面（金縁賞状デザイン） |

---

### JavaScript

| ファイル | 管理内容 |
|---|---|
| `app.js` | **アプリの中核。** ゲーム状態・画面遷移・各モードのロジック全般 |
| `kukurun.js` | くくるんキャラのアニメーション・口パク・フキダシメッセージ |
| `questions.js` | 九九の問題データ・日本語読み・段ラベルなどのデータ生成ロジック |
| `sprites.js` | スプライト画像のパス定義（たまご3色×4段階、キャラ3色×4段階） |
| `medals.js` | メダル・しょうじょう静的データ（`CERT_TYPES` / `MEDAL_CLR` / `MEDAL_NAMES` / `NEXT_MEDAL`） |

#### app.js の主要な責務

| 分類 | 主な変数・関数 |
|---|---|
| ゲーム状態 | `S`（グローバル状態オブジェクト）: `name` / `dan` / `renshuClears` / `medals` / `certificates` など |
| しょうじょう | `CERT_TYPES`（medals.js）/ `checkCertificates()` / `buildCertBtns()` / `showCertificate(id)` |
| スプライト制御 | `getEggSprite()` / `getCharSprite()` / `updateCreature()` |
| たまご揺れ | `eggWobble`（IIFEモジュール）|
| キャラ移動 | `charAnim`（IIFEモジュール・RAFループ） |
| 効果音 | `Snd`（IIFEモジュール・Web Audio API） |
| 読み上げ | `Spk` / `speak()` / `speakThen()`（Web Speech API） |
| 名前入力 | `buildKanaGrid()` / `addKana()` / `delKana()` / `clearKana()` |
| ほかのもじ | `buildHokaModal()` / `openHokaModal()` / `closeHokaModal()` |
| おぼえるモード | `startOboeru()` / `setOboeruMode()` / `readSelectedRows()` |
| れんしゅうモード | `startRenshu()` / `checkAns()` / `doneDan()` |
| テストモード | `startTest()` / `doneTest()` / `medalBadge()` |
| ご褒美演出 | `showHanamaru()` / `confetti()` |
| 画面遷移 | `showScreen()` / `goHome()` / `goSuffix()` など |

#### kukurun.js の主要な責務

| 分類 | 主な変数・関数 |
|---|---|
| タップアニメーション | `TAP_ANIMATIONS`（6種定義） / `playKukurunTapAnim()` |
| 口パク | `kukurunMouthSequences`（母音ごとのSVGパス） / `setKukurunMouth()` |
| 笑顔制御 | `setKukurunSmile()` |
| フキダシ | `SCREEN_MESSAGES` / `startBalloonTimer()` / `stopBalloonTimer()` |
| 画面監視 | `_initScreenWatcher()`（MutationObserver） |
| 初期化 | `initKukurun()` |

#### questions.js の主要な責務

| 分類 | 主な変数・関数 |
|---|---|
| 問題生成 | `KD.problems(dan)` → `{ dan, multiplier, answer, reading, questionRead }[]` |
| 日本語読み | `KD.reading(a, b)` / `KD.questionRead(a, b)` |
| 数の読み | `KD.numYomi(n)` |
| 段ラベル | `KD.danLabel(d)` |
| 全角変換 | `KD.fw(n)` |

---

### CSS

| ファイル | 管理内容 |
|---|---|
| `app.css` | アプリ全体のスタイル・アニメーション定義 |

#### app.css の主要なセクション

| 分類 | 内容 |
|---|---|
| デザイントークン | `--theme` / `--bg` / `--surface` / `--text` / `--r` など CSS変数 |
| 画面レイアウト | `.screen` / `.screen.active` / `@keyframes fadeUp` |
| キャラ表示 | `.kukurun-wrap` / `.kukurun-balloon` / `@keyframes kukurunIdle` |
| ボタン共通 | `.btn` / `.btn-primary` / `.btn-outline` / `.dan-btn` |
| 名前入力 | `.kana-grid` / `.kana-btn` / `.kana-del-row` |
| ほかのもじ | `.hoka-modal` / `.hoka-grid` / `.hoka-kana-btn` |
| 問題表示 | `.prob-card` / `.prob-eq` / `.ans-grid` / `.ans-btn` |
| ご褒美演出 | `@keyframes hanamaru` / `.confetti-piece` / `@keyframes confettiFall` |

---

### JSON（静的データ）

| ファイル | 管理内容 |
|---|---|
| `kana.json` | ひらがな一覧（`kanaRows`）と名前のよびかた選択肢（`suffixes`） |
| `kana_hoka.json` | だくてん・はんだくてん・ちいさいかな の拡張かなデータ（`hokaSections`） |
| `messages.json` | くくるんのセリフ・読み上げスクリプト・画面別メッセージ |
| `balloon_messages.json` | 各画面のフキダシメッセージ（`{name}` プレースホルダでユーザー名を埋め込み） |

---

### スプライト画像（`sprites/` ディレクトリ）

| 種類 | ファイル命名規則 | 内容 |
|---|---|---|
| たまご | `egg_[color]_[stage].png` | color: green/pink/blue、stage: intact/crack1/crack2/hatch |
| キャラ | `char_[color]_[stage].png` | color: green/pink/blue、stage: newborn/baby/child/adult |

---

### 設定・ビルド

| ファイル | 管理内容 |
|---|---|
| `.claude/settings.json` | Claude Code のフック設定。ファイル編集時に `index.html` のバージョンバッジを自動更新 |
| `package.json` | npm依存関係。Capacitor（iOSネイティブアプリ変換）の定義 |
| `capacitor.config.json` | Capacitor設定。Bundle ID（`com.shakeram389.kukurun`）・webDir（`www/`）を定義 |
| `codemagic.yaml` | Codemagic CI/CDビルド定義。App Store向けiOSビルドワークフロー |
| `www/` | Capacitorのwebアセット同期先（gitignore対象・`npm run build`で自動生成） |
| `ios/` | CapacitorのiOS Xcodeプロジェクト（Codemagicビルド時に初回生成） |

---

## 画面遷移フロー

```
イントロ → 名前入力 → よびかた選択 → たまご選択 → ホーム
                                                    │
                                               モード選択
                                           ┌────────────────┐
                                        おぼえる  れんしゅう  テスト
                                                    │
                                            [成長・クリア画面]
```

## 成長の仕組み

`S.renshuClears`（れんしゅうで60%以上正解しただんの数）により段階が変化する。

| renshuClears | たまご状態 | キャラ状態 |
|---|---|---|
| 0 | intact（ひびなし） | — |
| 1 | crack1 | — |
| 2 | crack2 | — |
| 3 | hatch | newborn（孵化） |
| 4 | — | baby |
| 5 | — | child |
| 6以上 | — | adult（クリア） |
