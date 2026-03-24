"""
スプライトシートから個別スプライトを切り出すスクリプト。

使い方:
  1. egg_sheet.png   (卵シート: 3行×4列) を sprites/ フォルダに置く
  2. char_sheet.png  (キャラシート: 3行×4列) を sprites/ フォルダに置く
  3. python3 sprites/crop_sprites.py を実行する

行の順番 (上から):
  egg_sheet:   0=purple, 1=orange, 2=silver
  char_sheet:  0=purple(wolf), 1=orange(phoenix), 2=silver(fox)

列の順番 (左から):
  0=intact/newborn, 1=crack1/baby, 2=crack2/child, 3=hatch/adult
"""

from PIL import Image
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

TARGET_W = 74
TARGET_H = 92
ALPHA_THRESHOLD = 10  # alpha <= この値は透明とみなす


def get_content_bbox(img, threshold=ALPHA_THRESHOLD):
    """alpha > threshold のピクセルのバウンディングボックスを返す。"""
    w, h = img.size
    pixels = img.load()
    min_x, min_y, max_x, max_y = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            if pixels[x, y][3] > threshold:
                if x < min_x: min_x = x
                if y < min_y: min_y = y
                if x > max_x: max_x = x
                if y > max_y: max_y = y
                found = True
    return (min_x, min_y, max_x + 1, max_y + 1) if found else None


def col_opaque_count(img, x, threshold=ALPHA_THRESHOLD):
    """指定列で alpha > threshold のピクセル数を返す。"""
    pixels = img.load()
    _, h = img.size
    return sum(1 for y in range(h) if pixels[x, y][3] > threshold)


def find_bleed_amount(prev_cell):
    """前セルの右端からgapを探し、はみ出し量(px)を返す。見つからなければ0。"""
    w, _ = prev_cell.size
    for bx in range(w - 1, -1, -1):
        if col_opaque_count(prev_cell, bx) == 0:
            return w - bx - 1
    return 0


def crop_sheet(sheet_path, kinds, col_names, prefix, target_w=TARGET_W, target_h=TARGET_H, tight=False):
    img = Image.open(sheet_path).convert("RGBA")
    W, H = img.size
    rows = len(kinds)
    cols = len(col_names)
    cell_w = W // cols
    cell_h = H // rows
    print(f"{sheet_path}: {W}x{H}, cell={cell_w}x{cell_h}")

    # --- パス1: 各列間のbleed量を検出 ---
    # bleed[(r, c)] = c列の左端が (c-1) 列からはみ出している量 (px)
    bleed = {}
    for r in range(rows):
        for c in range(1, cols):
            cell = img.crop((c * cell_w, r * cell_h, (c + 1) * cell_w, (r + 1) * cell_h))
            if col_opaque_count(cell, 0) > 5:
                prev_cell = img.crop(((c - 1) * cell_w, r * cell_h, c * cell_w, (r + 1) * cell_h))
                amount = find_bleed_amount(prev_cell)
                if amount > 0:
                    bleed[(r, c)] = amount
                    print(f"  [{kinds[r]}_{col_names[c]}] bleed検出: 左へ{amount}px (前セルからのはみ出し)")

    # --- パス2: 切り出し・リサイズ・保存 ---
    for r, kind in enumerate(kinds):
        for c, col in enumerate(col_names):
            x0 = c * cell_w
            y0 = r * cell_h
            x1 = x0 + cell_w
            y1 = y0 + cell_h

            # 左拡張: このセルが前セルからbleedを受けている場合
            expand_left = bleed.get((r, c), 0)
            # 右トリム: 次のセルがこのセルからbleedを受けている場合
            trim_right = bleed.get((r, c + 1), 0)

            crop_x0 = x0 - expand_left
            crop_x1 = x1 - trim_right

            cell = img.crop((crop_x0, y0, crop_x1, y1))

            if expand_left:
                print(f"  [{kind}_{col}] 左へ{expand_left}px拡張")
            if trim_right:
                print(f"  [{kind}_{col}] 右を{trim_right}px削除")

            # alpha閾値ベースのバウンディングボックスでトリム
            bbox = get_content_bbox(cell)
            if bbox:
                cell = cell.crop(bbox)

            # ターゲットサイズにリサイズ（アスペクト比維持でフィット）
            cell.thumbnail((target_w, target_h), Image.LANCZOS)
            if tight:
                # パディングなし: タイトなbboxのまま保存
                out = cell
            else:
                # 透明背景キャンバスに中央配置
                canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
                x = (target_w - cell.width) // 2
                y = (target_h - cell.height) // 2
                canvas.paste(cell, (x, y), cell)
                out = canvas
            out_path = os.path.join(SCRIPT_DIR, f"{prefix}_{kind}_{col}.png")
            out.save(out_path)
            print(f"  -> {out_path}")


# --- 卵スプライト ---
egg_sheet = os.path.join(SCRIPT_DIR, "egg_sheet.png")
if os.path.exists(egg_sheet):
    crop_sheet(
        egg_sheet,
        kinds=["purple", "orange", "silver"],
        col_names=["intact", "crack1", "crack2", "hatch"],
        prefix="egg",
    )
else:
    print(f"[SKIP] {egg_sheet} が見つかりません")

# --- キャラスプライト (ホームで使う分のサイズは少し大きめ) ---
char_sheet = os.path.join(SCRIPT_DIR, "char_sheet.png")
if os.path.exists(char_sheet):
    crop_sheet(
        char_sheet,
        kinds=["purple", "orange", "silver"],
        col_names=["newborn", "baby", "child", "adult"],
        prefix="char",
        target_w=200,
        target_h=200,
        tight=True,
    )
else:
    print(f"[SKIP] {char_sheet} が見つかりません")

# --- 後処理: 紫wolfから橙羽先を色マスクで除去 ---
def remove_orange_pixels(path):
    img = Image.open(path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    changed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a > 10 and r > 140 and max(g, 1) > 0 and max(b, 1) > 0:
                if r / max(g, 1) > 1.6 and r / max(b, 1) > 2.8:
                    pixels[x, y] = (0, 0, 0, 0)
                    changed += 1
    if changed:
        img.save(path)
        print(f"  橙汚染除去: {changed}px → {path}")

remove_orange_pixels(os.path.join(SCRIPT_DIR, "char_purple_adult.png"))
remove_orange_pixels(os.path.join(SCRIPT_DIR, "char_purple_child.png"))

print("完了！")
