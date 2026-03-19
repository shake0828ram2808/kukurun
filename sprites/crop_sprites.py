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

TARGET_W = 71
TARGET_H = 89

def crop_sheet(sheet_path, kinds, col_names, prefix, target_w=TARGET_W, target_h=TARGET_H):
    img = Image.open(sheet_path).convert("RGBA")
    W, H = img.size
    rows = len(kinds)
    cols = len(col_names)
    cell_w = W // cols
    cell_h = H // rows
    print(f"{sheet_path}: {W}x{H}, cell={cell_w}x{cell_h}")

    for r, kind in enumerate(kinds):
        for c, col in enumerate(col_names):
            box = (c * cell_w, r * cell_h, (c + 1) * cell_w, (r + 1) * cell_h)
            cell = img.crop(box)
            # 透明ピクセルを除いたバウンディングボックス
            bbox = cell.getbbox()
            if bbox:
                cell = cell.crop(bbox)
            # ターゲットサイズにリサイズ（アスペクト比維持でフィット）
            cell.thumbnail((target_w, target_h), Image.LANCZOS)
            # 透明背景キャンバスに中央配置
            canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
            x = (target_w - cell.width) // 2
            y = (target_h - cell.height) // 2
            canvas.paste(cell, (x, y), cell)
            out_path = os.path.join(SCRIPT_DIR, f"{prefix}_{kind}_{col}.png")
            canvas.save(out_path)
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
        target_w=120,
        target_h=150,
    )
else:
    print(f"[SKIP] {char_sheet} が見つかりません")

print("完了！")
