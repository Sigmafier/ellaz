"""Shared painter for the roster: a text grid, range fills, shading wedges, the auto ring, a preview, and the emitters."""
import math, sys, json
from PIL import Image

class Grid:
    def __init__(s, w, h): s.w, s.h = w, h; s.g = [["."] * w for _ in range(h)]
    def at(s, c, r): return s.g[r][c] if 0 <= c < s.w and 0 <= r < s.h else "."
    def px(s, c, r, ch):
        if 0 <= c < s.w and 0 <= r < s.h: s.g[r][c] = ch
    def rect(s, c0, r0, c1, r1, ch):
        for r in range(r0, r1 + 1):
            for c in range(c0, c1 + 1): s.px(c, r, ch)
    def ellipse(s, cx, cy, rx, ry, ch):
        for r in range(s.h):
            for c in range(s.w):
                if ((c + .5 - cx) / rx) ** 2 + ((r + .5 - cy) / ry) ** 2 <= 1: s.px(c, r, ch)
    def circle(s, cx, cy, rad, ch): s.ellipse(cx, cy, rad, rad, ch)
    def poly(s, pts, ch):
        n = len(pts)
        for r in range(s.h):
            for c in range(s.w):
                x, y, inside = c + .5, r + .5, False
                for i in range(n):
                    (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
                    if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0: inside = not inside
                if inside: s.px(c, r, ch)
    def line(s, c0, r0, c1, r1, ch, w=1):
        n = max(abs(c1 - c0), abs(r1 - r0), 1)
        for i in range(n + 1):
            c, r = round(c0 + (c1 - c0) * i / n), round(r0 + (r1 - r0) * i / n)
            for k in range(w): s.px(c + k, r, ch)
    def shade(s, frm, to, pred, box=None):
        c0, r0, c1, r1 = box or (0, 0, s.w - 1, s.h - 1)
        for r in range(r0, r1 + 1):
            for c in range(c0, c1 + 1):
                if s.g[r][c] == frm and pred(c, r): s.g[r][c] = to
    def ring(s, ch="O"):
        add = []
        for r in range(s.h):
            for c in range(s.w):
                if s.g[r][c] == "." and any(s.at(c + dc, r + dr) not in ".O" for dc, dr in ((1,0),(-1,0),(0,1),(0,-1))):
                    add.append((c, r))
        for c, r in add: s.px(c, r, ch)
    def rows(s): return ["".join(r) for r in s.g]
    def ink_rows(s): return [i for i, r in enumerate(s.rows()) if any(ch != "." for ch in r)]

def hx(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))

def preview(items, out, Z=5):
    """items: list of (name, grid, palette)"""
    W = sum(g.w * Z + 30 for _, g, _ in items) + 30; H = max(g.h for _, g, _ in items) * Z + 60
    im = Image.new("RGB", (W, H), (232, 238, 247)); x = 30
    for name, g, pal in items:
        for r, row in enumerate(g.rows()):
            for c, ch in enumerate(row):
                if ch in pal:
                    col = hx(pal[ch])
                    for dy in range(Z):
                        for dx in range(Z): im.putpixel((x + c * Z + dx, 30 + r * Z + dy), col)
        x += g.w * Z + 30
    im.save(out)

def check(name, g, pal, parts):
    """parts: list of (id, regions[[r0,r1,c0,c1]], only) in claim order. Reports unclaimed ink."""
    bad = {ch for row in g.rows() for ch in row if ch != "." and ch not in pal}
    assert not bad, (name, "not in palette", bad)
    hexes = list(pal.values()); assert len(hexes) == len(set(hexes)), (name, "two chars share a hex")
    claimed = set(); per = {}
    for pid, regions, only in parts:
        n = 0
        for r0, r1, c0, c1 in regions:
            for r in range(r0, r1 + 1):
                for c in range(c0, c1 + 1):
                    ch = g.at(c, r)
                    if ch == "." or (only and ch not in only) or (c, r) in claimed: continue
                    claimed.add((c, r)); n += 1
        per[pid] = n
    ink = {(c, r) for r, row in enumerate(g.rows()) for c, ch in enumerate(row) if ch != "."}
    left = sorted(ink - claimed)
    return per, left

def emit_pixels(root, name, K, fn, desc, g, pal):
    palette = "\n".join(f'  {ch}: "{h}",' for ch, h in pal.items())
    rows = "\n".join(f'  "{r}",' for r in g.rows())
    open(f"{root}{name}/{fn}.ts", "w").write(f"""// {desc}
//
// Painted 2026-09-06 with the craft rules the knight set (see
// docs/pixel-characters.md): native size by role, clusters not dots, one
// light, hue-shifted ramps, its own selective outline. {g.w} wide x {g.h} tall,
// feet on the last row. rig{fn[6:]}.ts cuts it into parts.

export const {K}_W = {g.w};
export const {K}_H = {g.h};

export const {K}_PALETTE: Record<string, string> = {{
{palette}
}};

export const {K}_GRID: string[] = [
{rows}
];
""")
