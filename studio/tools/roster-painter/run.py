import sys, json, os
from pathlib import Path
from lib import preview, check, emit_pixels
from kids import bunny, crab, owl
from teen import ninja, wizard, bat
from adult import brawler, golem
ALL = [("bunny", bunny), ("crab", crab), ("owl", owl), ("ninja", ninja), ("wizard", wizard), ("bat", bat), ("brawler", brawler), ("golem", golem)]
SIZE = {"bunny": 48, "crab": 32, "owl": 64, "ninja": 48, "wizard": 48, "bat": 32, "brawler": 48, "golem": 64}
DESC = {
 "bunny": "The bunny at 48 pixels (hero size): a round white bunny with tall pink-lined ears, a cream belly, big feet, and a carrot held up in the right paw.",
 "crab": "The crab at 32 pixels (small-enemy size): a wide orange shell lit from the upper-left, eyes on stalks, two claws, three legs a side.",
 "owl": "The Owl King at 64 pixels (boss size): a big brown ovoid with huge yellow eyes, a gold crown, ear tufts, folded wings and orange talons.",
 "ninja": "The ninja at 48 pixels (hero size): lean, in navy, a hooded mask with an eye slit, a red scarf trailing back, a short blade held forward.",
 "wizard": "The wizard at 48 pixels (hero size): a purple robe that flares to the boots, a tall pointed hat with a star, a white beard, a staff with a glowing orb.",
 "bat": "The bat at 32 pixels (small-enemy size): purple, wings spread, yellow eyes, two fangs, claws on the ground line.",
 "brawler": "The brawler at 48 pixels (hero size): a boxer - red headband, dark hair, blue singlet, white shorts, one glove down and one thrown forward.",
 "golem": "The golem at 64 pixels (boss size): a stone brute - a small head sunk between huge shoulders, arms like pillars with fists at its sides, glowing cracks, moss.",
}
sel = [a for a in sys.argv[2:] if not a.startswith("--")] or [n for n, _ in ALL]
items = []
for name, fn in ALL:
    if name not in sel: continue
    g, pal, parts = fn()
    per, left = check(name, g, pal, parts)
    ink = g.ink_rows()
    print(f"{name:8} {g.w}x{g.h} ink rows {ink[0]}-{ink[-1]} ({len(ink)}, need >= {SIZE[name]*0.7:.0f})  parts {per}  UNCLAIMED {len(left)} {left[:8]}")
    items.append((name, g, pal, parts))
preview([(n, g, p) for n, g, p, _ in items], sys.argv[1])
if "--emit" in sys.argv:
    from rigs import emit_rig
    # the characters tree, relative to this file; ROSTER_ROOT overrides it (the reproduce test emits into a scratch dir)
    ROOT = os.environ.get("ROSTER_ROOT") or str(Path(__file__).resolve().parents[2] / "art" / "characters") + "/"
    if not ROOT.endswith("/"): ROOT += "/"
    for name, g, pal, parts in items:
        H = SIZE[name]; os.makedirs(ROOT + name, exist_ok=True)
        emit_pixels(ROOT, name, f"{name.upper()}{H}", f"pixels{H}", DESC[name], g, pal)
        emit_rig(ROOT, name, H, parts)
        print("emitted", name)
