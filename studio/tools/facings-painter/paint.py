"""The knight facing the viewer (down) and facing away (up), for the dungeon demo.

Throwaway (spike, 2026-09-11). Same palette letters and craft rules as
studio/art/characters/knight/pixels48.ts: indigo outline, three-tone ramps lit
from the upper-left, clusters not dots. Painted as layers on a 40x52 grid,
feet on row 51, then emitted as a sheet + atlas + manifest in the studio's
export shape (10 px per cell, pivot at the soles).

  python paint.py <out_dir> [--preview preview.png]
"""
import json, sys
from pathlib import Path
from PIL import Image

PAL = {
    "O": "#1a1230", "P": "#e4eaf4", "p": "#b4bed0", "q": "#7c86a0", "Q": "#4e5670",
    "C": "#e0407a", "c": "#c2185b", "x": "#7a1040",
    "S": "#5e86ff", "s": "#2b5cff", "z": "#1b3ab0",
    "G": "#ffe680", "g": "#ffd23f", "h": "#c9932a",
    "B": "#f4f8ff", "b": "#c8d2e6", "F": "#ffd9b3", "f": "#d9a87a", "K": "#1a1a2e",
    "M": "#ff4d8d", "V": "#6c7890", "v": "#3e4870", "T": "#2a2438", "t": "#4a4260",
    "W": "#fff6d8",  # slash arc light
}
W, H = 40, 52


class Grid:
    def __init__(self):
        self.g = [["."] * W for _ in range(H)]
        self.oy = 0  # the upper body's bob: every paint above the legs lands this many rows lower

    def paint(self, col, row, rows):
        """Paint strings top-down from (col, row); '.' leaves what is under it."""
        for dy, s in enumerate(rows):
            for dx, ch in enumerate(s):
                x, y = col + dx, row + dy + self.oy
                if ch != "." and 0 <= x < W and 0 <= y < H:
                    self.g[y][x] = ch

    def dot(self, x, y, ch):
        y += self.oy
        if 0 <= x < W and 0 <= y < H:
            self.g[y][x] = ch

    def shift(self, y0, y1, dy):
        """Move rows y0..y1 by dy (negative = up); vacated rows go transparent."""
        band = [row[:] for row in self.g[y0:y1 + 1]]
        for y in range(y0, y1 + 1):
            self.g[y] = ["."] * W
        for i, row in enumerate(band):
            y = y0 + i + dy
            if 0 <= y < H:
                for x, ch in enumerate(row):
                    if ch != ".":
                        self.g[y][x] = ch


def line_cells(x0, y0, x1, y1):
    cells, dx, dy = [], abs(x1 - x0), -abs(y1 - y0)
    sx, sy, err = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1), abs(x1 - x0) - abs(y1 - y0)
    while True:
        cells.append((x0, y0))
        if x0 == x1 and y0 == y1:
            return cells
        e2 = 2 * err
        if e2 >= dy:
            err += dy; x0 += sx
        if e2 <= dx:
            err += dx; y0 += sy


def stroke(grid, pts, edge, flat, outline=True):
    """A two-pixel stroke (edge colour on the lit side, flat beside it), outlined in ink."""
    cells = set()
    for a, b in zip(pts, pts[1:]):
        for (x, y) in line_cells(*a, *b):
            cells.add((x, y, edge))
            cells.add((x, y + 1, flat) if abs(b[0] - a[0]) > abs(b[1] - a[1]) else (x + 1, y, flat))
    occupied = {(x, y) for x, y, _ in cells}
    if outline:
        for x, y in occupied:
            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + ox, y + oy)
                ny = n[1] + grid.oy
                if n not in occupied and 0 <= n[0] < W and 0 <= ny < H and grid.g[ny][n[0]] in ".xcC":
                    grid.dot(*n, "O")
    for x, y, ch in cells:
        grid.dot(x, y, ch)


# ---- shared lower body ---------------------------------------------------------

def legs(g, lift=None):
    """Greaves and boots. lift='L' or 'R' raises that leg two rows (the passing pose)."""
    bob, g.oy = g.oy, 0
    for side, col, leg, boot in (("L", 15, "OVVvO", ["OTTTtO", "OtTTTO", "OtTTtO", "OtTTTO", ".OOOO."]),
                                 ("R", 20, "OVvvO", ["OTTTtO", "OtTTTO", "OtTTtO", "OtTTTO", ".OOOO."])):
        up = 2 if lift == side else 0
        n = 12 - up
        g.paint(col, 35, [leg] * n)
        g.dot(col + 2, 35 + n // 2, "v")  # knee
        g.paint(col - (1 if side == "L" else 0), 35 + n, boot)
    g.oy = bob


# ---- facing the viewer -----------------------------------------------------------

HELM_FRONT = [
    "...OMMO...",   # 4 plume
    "..OMMcMO..",
    "..OOOOOO..",   # 6
    ".OPPPPppO.",
    "OPPPPpppqO",
    "OPPPppppqO",
    "OPpppppqqO",
    "OOOOOOOOOO",   # 11 visor band
    "OFKFFFFKfO",
    "OffffffffO",
    "OOOOOOOOOO",
    "OpppppqqqO",   # 15 chin guard
    ".OppppqqO.",
    "..OOOOOO..",
]
TORSO_FRONT = [
    "OOOOOOOOOOOO",  # 19
    "OPPPPPpppqqO",
    "OPPPPPpppqqO",
    "OPPPPppppqqO",
    "OPPPPppppqqO",
    "OPPPpppppqqO",
    "OPPPpppppqqO",
    "OPPppppppqqO",
    "OpPppppppqqO",
    "OpppppppqqqO",
    "OpppppqqqqqO",
    "OhGGGGhhhhhO",  # 30 belt
    "OqhhhhhhhhqO",
    "OqppppppqqqO",  # 32 fauld
    "OqppppppqqqO",
    "OqqpppqqqqQO",
    "OOqqqqqqqqOO",  # 35
]
SHIELD_FACE = [
    ".OOOOOOOOOO.",
    "OSSSSSSSsszO",
    "OSSSSSSssszO",
    "OSSSSGgssszO",
    "OSSSGGGgsszO",
    "OSSGGGGGhszO",
    "OSSSGGGhsszO",
    "OSSSSGhssszO",
    "OSSsssssszzO",
    ".OSsssssszO.",
    ".OssssssszO.",
    "..OssssszO..",
    "..OsssszzO..",
    "...OsszzO...",
    "....OzzO....",
    ".....OO.....",
]


def front(g, lift=None, pose="idle", t=0):
    """pose: idle | attack (t = 0 wind-up, 1 strike, 2 follow-through)."""
    # cape behind, both edges showing
    g.paint(12, 23, ["OC", "OCc", "OCc", "OCc", "OCcx", "OCcx", "OCcx", "OCcx", ".OcxO", ".OcxO", ".OcxO", ".OcxO", "..OxO", "..OxO", "...O"])
    g.paint(25, 30, ["xcO", "xcO", "xcO", "xxO", "xxO", "xxO", "xxO", "xO", "xO", "O"])
    legs(g, lift)
    g.paint(14, 19, TORSO_FRONT)
    g.paint(15, 4, HELM_FRONT)
    g.paint(17, 18, ["OqqqqO"])
    # pauldrons
    g.paint(10, 19, [".OOOO", "OPPPp", "OPPpp", "OPppq", ".OOOO"])
    g.paint(25, 19, ["OOOO.", "pqqqO", "pqqqO", "qqqQO", "OOOO."])
    if pose != "idle":
        g.paint(24, 21, SHIELD_FACE)  # the sword arm crosses in front of the shield
    if pose == "idle":
        # sword upright in the right hand (screen left), arm down to the grip
        stroke(g, [(8, 3), (8, 25)], "B", "b")
        g.dot(8, 2, "O"); g.dot(9, 2, "O")
        g.paint(10, 24, ["OpqO", "OpqO", "OpqO"])
        g.paint(5, 26, ["OGgggggGO"])
        g.paint(7, 27, ["OQQQhO", ".OQQhO"])
        g.paint(8, 29, ["OGGO", ".OO."])
    else:
        arms = {
            0: ((12, 21), (9, 12), [(9, 11), (4, 1)]),      # raised over the right shoulder
            1: ((13, 23), (21, 29), [(22, 29), (38, 31)]),  # the strike, flat across the front
            2: ((13, 23), (24, 33), [(25, 34), (35, 46)]),  # follow-through, blade low and out
        }[t]
        (sx, sy), (hx, hy), blade = arms
        if t >= 1:  # the arc of the swing, under the arm and blade
            arc = [(3, 19), (7, 27), (13, 32), (21, 35), (31, 36)] if t == 1 else [(14, 36), (20, 41), (27, 45)]
            stroke(g, arc, "W", "B")
        stroke(g, [(sx, sy), (hx, hy)], "p", "q")
        stroke(g, blade, "B", "b")
        g.paint(hx - 2, hy - 1, ["OGggGO", "OQQQhO", ".OOOO."])
    if pose == "idle":
        g.paint(24, 21, SHIELD_FACE)


# ---- facing away -------------------------------------------------------------------

HELM_BACK = [
    "...OMMO...",
    "..OMMcMO..",
    "..OOOOOO..",
    ".OPPPppqO.",
    "OPPPpppqqO",
    "OPPppppqqO",
    "OPppPpqqqO",   # a raised ridge down the back, lit on its left
    "OpppPqqqqO",
    "OpppPqqqqO",
    "OqppqqqqqO",
    "OqqqqqqqQO",
    "OqqqqqqQQO",
    ".OqqqqQQO.",
    "..OOOOOO..",
]
CAPE_BACK = [
    "OOOOOOOOOOOOOO",  # 19 shoulders
    "OCCCCCCccccxxO",
    "OCCCCCcccccxxO",
    "OCCCCCcccccxxO",
    "OCCCCccccccxxO",
    "OCCCCcccccxxxO",
    "OCCCcccccccxxO",
    "OCCCcccccccxxO",
    "OCCcccccccxxxO",
    "OCCcccccccxxxO",
    "OCccccccccxxxO",
    "OCccccccccxxxO",
    "OCcccccccxxxxO",
    "OcccccccxxxxxO",
    "OcccccccxxxxxO",
    "OccccccxxxxxxO",
    "OccxcccxxcxxxO",  # 35 the hem, a little ragged
    ".OxOccxOxxOxO.",
    "..O.OxO.OO.O..",
]
SHIELD_BACK = [
    ".OOOOOOOOOO.",
    "OzzzzzzzzzsO",
    "OzQhhhhhhQsO",   # the strap across
    "OzzzzzzzzzsO",
    "OzzzQQQzzzsO",
    "OzzzQhQzzzsO",   # the grip
    "OzzzQQQzzzsO",
    "OzzzzzzzzzsO",
    "OzQhhhhhhQsO",
    ".OzzzzzzzsO.",
    ".OzzzzzzzsO.",
    "..OzzzzzsO..",
    "..OzzzzzsO..",
    "...OzzzsO...",
    "....OzsO....",
    ".....OO.....",
]


def back(g, lift=None, pose="idle", t=0):
    legs(g, lift)
    # the sword first when it is held low or upright, so the cape covers the arm
    if pose == "idle":
        stroke(g, [(31, 3), (31, 25)], "B", "b")
        g.dot(31, 2, "O"); g.dot(32, 2, "O")
        g.paint(28, 26, ["OGgggggGO"])
        g.paint(29, 27, ["OhQQQO", "OhQQO."])
        g.paint(30, 29, ["OGGO", ".OO."])
    g.paint(13, 19, CAPE_BACK)
    g.paint(15, 5, HELM_BACK)
    g.paint(10, 19, [".OOOO", "OPPPp", "OPPpp", "OPppq", ".OOOO"])
    g.paint(26, 19, ["OOOO.", "pqqqO", "pqqqO", "qqqQO", "OOOO."])
    if pose == "idle":
        g.paint(27, 24, ["OpqO", "OpqO"])
    else:
        arms = {
            0: ((27, 22), (32, 13), [(33, 12), (37, 1)]),   # raised behind the right shoulder
            1: ((27, 22), (23, 13), [(22, 12), (17, 0)]),   # the chop, blade up and away from us
            2: ((27, 23), (21, 17), [(20, 16), (9, 11)]),   # follow-through, the blade swinging left
        }[t]
        (sx, sy), (hx, hy), blade = arms
        if t >= 1:
            arc = [(37, 12), (33, 5), (26, 1), (19, 1)] if t == 1 else [(30, 5), (22, 4), (14, 6), (7, 10)]
            stroke(g, arc, "W", "B")
        stroke(g, blade, "B", "b")
        stroke(g, [(sx, sy), (hx, hy)], "p", "q")
        g.paint(hx - 2, hy - 1, ["OGggGO", "OhQQQO", ".OOOO."])
    g.paint(5, 21, SHIELD_BACK)


# ---- frames, sheet, atlas, manifest ------------------------------------------------

def build(face, clip, i):
    g = Grid()
    draw = front if face == "down" else back
    if clip == "idle":
        g.oy = 1 if i == 1 else 0  # breathe: everything above the legs settles a row
        draw(g)
    elif clip == "walk":
        g.oy = -1 if i in (1, 3) else 0  # the body rises on the passing frames
        draw(g, lift=[None, "L", None, "R"][i])
    elif clip == "attack":
        draw(g, pose="attack", t=i)
    return g


CLIPS = [("idle", 2, 4, True), ("walk", 4, 8, True), ("attack", 3, 12, False)]
CELL, FW, FH, OX, OY = 10, 60, 60, 10, 4   # frame 60x60 cells; the 40x52 grid sits at (10, 4)


def render_frame(g):
    im = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(g.g):
        for x, ch in enumerate(row):
            if ch != ".":
                c = PAL[ch]
                px[OX + x, OY + y] = (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), 255)
    return im


def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    frames = []
    for face in ("down", "up"):
        for clip, n, fps, loop in CLIPS:
            for i in range(n):
                g = build(face, clip, i)
                for row in g.g:
                    for ch in row:
                        assert ch == "." or ch in PAL, f"not in palette: {ch}"
                frames.append((f"knight-facings_{clip}_{face}_{i:04d}", render_frame(g), clip, face, fps, loop))
    cols = 6
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * FW * CELL, rows * FH * CELL), (0, 0, 0, 0))
    atlas, anims = {}, {}
    for k, (name, im, clip, face, fps, loop) in enumerate(frames):
        x, y = (k % cols) * FW * CELL, (k // cols) * FH * CELL
        sheet.paste(im.resize((FW * CELL, FH * CELL), Image.NEAREST), (x, y))
        w, h = FW * CELL, FH * CELL
        atlas[name] = {"frame": {"x": x, "y": y, "w": w, "h": h}, "rotated": False, "trimmed": False,
                       "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h},
                       "pivot": {"x": 0.5, "y": (OY + H) / FH}}
        anims.setdefault(f"{clip}_{face}", {"fps": fps, "loop": loop, "frames": []})["frames"].append(name)
    sheet.save(out / "knight-facings.png")
    json.dump({"frames": atlas, "meta": {"image": "knight-facings.png", "size": {"w": sheet.width, "h": sheet.height},
               "note": "painted front/back facings, spike 2026-09-11"}}, open(out / "knight-facings.atlas.json", "w"), indent=1)
    json.dump({"character": "knight-facings", "style": "snes16", "scale": 2, "frameSize": {"w": FW * CELL, "h": FH * CELL},
               "pivot": {"x": FW * CELL // 2, "y": (OY + H) * CELL}, "animations": anims},
              open(out / "knight-facings.manifest.json", "w"), indent=1)
    if "--preview" in sys.argv:
        # a strip at 4x per cell on a light ground, one row per facing
        prev = Image.new("RGBA", (9 * FW * 4, 2 * FH * 4), (244, 220, 168, 255))
        for k, (name, im, *_rest) in enumerate(frames):
            prev.alpha_composite(im.resize((FW * 4, FH * 4), Image.NEAREST), ((k % 9) * FW * 4, (k // 9) * FH * 4))
        prev.save(sys.argv[sys.argv.index("--preview") + 1])
    print(f"{len(frames)} frames, sheet {sheet.size}, clips {sorted(anims)}")


if __name__ == "__main__":
    main()
