# Arc 4, 2026-09-02: validates the eight entries in docs/outreach/osgameclones.md against the LIVE osgameclones schema.
# Usage: python3 scripts/repro/osgc-validate.py <dir holding osgc-entries.yaml + originals.txt>
import yaml, re, sys, urllib.request, datetime
S = sys.argv[1]
schema = yaml.safe_load(urllib.request.urlopen("https://raw.githubusercontent.com/opengaming/osgameclones/master/schema/games.yaml").read())
game = schema["schema;game"]["mapping"]
enum = lambda k: set(game[k]["enum"]) if "enum" in game[k] else None
plats = set(schema["schema;platforms"]["enum"]); lic = set(schema["schema;licenses"]["enum"])
originals = set()
for f in open(S + "/originals.txt").read().split():
    for o in yaml.safe_load(urllib.request.urlopen("https://raw.githubusercontent.com/opengaming/osgameclones/master/originals/" + f).read()) or []:
        originals.add(str(o["name"]))
entries = yaml.safe_load(open(S + "/osgc-entries.yaml"))
bad = []
for e in entries:
    for k in game:
        if game[k].get("required") and k not in e: bad.append((e["name"], "missing " + k))
    for k in e:
        if k not in game: bad.append((e["name"], "unknown key " + k))
    for k in ("type", "development", "status", "content"):
        if k in e and e[k] not in enum(k): bad.append((e["name"], f"{k}={e[k]} not in enum"))
    for p in e.get("platforms", []):
        if p not in plats: bad.append((e["name"], f"platform {p}"))
    for l in e["licenses"]:
        if l not in lic: bad.append((e["name"], f"license {l}"))
    for o in e["originals"]:
        if str(o) not in originals: bad.append((e["name"], f"original {o!r} not in originals/"))
    for d in ("added", "updated"):
        if not isinstance(e[d], datetime.date): bad.append((e["name"], f"{d} not a date"))
    if not isinstance(e.get("ai", False), bool): bad.append((e["name"], "ai not bool"))
# control: a planted bad entry must be caught
ctrl = dict(entries[0]); ctrl["originals"] = ["2048 Deluxe"]; ctrl["type"] = "port"
cbad = [x for x in [("control", "original") if "2048 Deluxe" not in originals else None, ("control", "type") if ctrl["type"] not in enum("type") else None] if x]
print(f"population: {len(entries)} entries checked against {len(game)} schema keys, {len(originals)} originals")
print(f"positive control (planted bad original + bad type): {'FIRED' if len(cbad)==2 else 'ABSENT - DO NOT TRUST'}")
print("problems:", bad if bad else "none")
sys.exit(1 if bad or len(cbad) != 2 else 0)
