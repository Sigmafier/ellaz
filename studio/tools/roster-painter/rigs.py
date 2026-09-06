"""Per-character rig data and the rig<H>.ts emitter."""
K = {"bunny":0.7,"crab":0.46,"owl":0.95,"ninja":0.7,"wizard":0.7,"bat":0.46,"brawler":0.7,"golem":0.95}
RIG = {
 "bunny": dict(origin=[16,48], bones={"torso":[16,41],"head":[16,28],"armL":[7,29],"armR":[24,27],"legL":[11,41],"legR":[21,41]},
   sockets={"hand":["armR",[31,22]],"head":["head",[16,0]]}, hitbox=[8,0,24,47],
   hurt="editGrid(editGrid(G, { 19: [12, \"ff\"], 20: [12, \"KK\"] }), { 19: [18, \"ff\"], 20: [18, \"KK\"] })",
   ko="editGrid(editGrid(G, { 19: [12, \"Kf\"], 20: [12, \"fK\"] }), { 19: [18, \"Kf\"], 20: [18, \"fK\"] })",
   eyes="eyes: K 2x2 at rows 19-20, cols 12-13 and 18-19, a W glint at the top-left of each", effect=("star", "armR", 8, -5, 4, 1.8, "W"), z={"legL":1,"legR":1,"armL":0,"head":3,"armR":4,"torso":2}),
 "crab": dict(ko_end='{ root: { rot: Math.PI, dy: -30 * U } }', walk='{ id: "walk", frames: 6, fps: 10, loop: true, keys: [{ at: 0, pose: { legL: { dx: -5 }, legR: { dx: 5 }, torso: { dy: -3 } } }, { at: 3, pose: { legL: { dx: 5 }, legR: { dx: -5 }, torso: { dy: -3 } } }] }', origin=[20,32], bones={"torso":[20,27],"head":[20,11],"armL":[9,18],"armR":[31,18],"legL":[14,27],"legR":[26,27]},
   sockets={"hand":["armR",[39,16]],"head":["head",[20,3]]}, hitbox=[7,2,33,31],
   hurt="editGrid(editGrid(G, { 5: [15, \"WW\"], 6: [15, \"KK\"] }), { 5: [25, \"WW\"], 6: [25, \"KK\"] })",
   ko="editGrid(editGrid(G, { 5: [15, \"KW\"], 6: [15, \"WK\"] }), { 5: [25, \"KW\"], 6: [25, \"WK\"] })",
   eyes="eyes: on the stalks, K at rows 5-6, cols 15-16 and 25-26, a W glint at the top-left", effect=None, z={"legL":1,"legR":1,"clawL":3,"clawR":3,"head":4,"torso":2}),
 "owl": dict(ko_end='{ root: { rot: -Math.PI / 2, dy: -28 * U } }', walk='{ id: "walk", frames: 6, fps: 10, loop: true, keys: [{ at: 0, pose: { legL: { dx: -3 }, legR: { dx: 3 }, torso: { dy: -2 }, armL: { rot: 0.35 }, armR: { rot: -0.35 } } }, { at: 3, pose: { legL: { dx: 3 }, legR: { dx: -3 }, torso: { dy: -2 }, armL: { rot: -0.35 }, armR: { rot: 0.35 } } }] }', origin=[28,64], bones={"torso":[28,58],"head":[28,34],"armL":[8,27],"armR":[48,27],"legL":[21,58],"legR":[35,58]},
   sockets={"hand":["armR",[53,40]],"head":["head",[28,0]]}, hitbox=[12,0,44,63],
   hurt="editGrid(editGrid(G, { 23: [17, \"yyyyyyy\"], 24: [17, \"yyyyyyy\"], 25: [17, \"yyyyyyy\"], 26: [17, \"KKKKKKK\"], 27: [17, \"yyyyyyy\"], 28: [17, \"yyyyyyy\"], 29: [17, \"yyyyyyy\"] }), { 23: [33, \"yyyyyyy\"], 24: [33, \"yyyyyyy\"], 25: [33, \"yyyyyyy\"], 26: [33, \"KKKKKKK\"], 27: [33, \"yyyyyyy\"], 28: [33, \"yyyyyyy\"], 29: [33, \"yyyyyyy\"] })",
   ko="editGrid(editGrid(G, { 23: [17, \"KyyyyyK\"], 24: [17, \"yKyyyKy\"], 25: [17, \"yyKyKyy\"], 26: [17, \"yyyKyyy\"], 27: [17, \"yyKyKyy\"], 28: [17, \"yKyyyKy\"], 29: [17, \"KyyyyyK\"] }), { 23: [33, \"KyyyyyK\"], 24: [33, \"yKyyyKy\"], 25: [33, \"yyKyKyy\"], 26: [33, \"yyyKyyy\"], 27: [33, \"yyKyKyy\"], 28: [33, \"yKyyyKy\"], 29: [33, \"KyyyyyK\"] })",
   eyes="eyes: K pupils 7 wide at rows 23-29, cols 17-23 and 33-39, inside the yellow irises", effect=None, z={"legL":1,"legR":1,"wingL":3,"wingR":3,"head":4,"torso":2}),
 "ninja": dict(origin=[16,48], bones={"torso":[16,29],"head":[16,13],"armL":[8,17],"armR":[22,19],"legL":[13,31],"legR":[19,31]},
   sockets={"hand":["armR",[33,20]],"head":["head",[16,1]]}, hitbox=[9,1,24,47],
   hurt="editGrid(editGrid(G, { 7: [13, \"FF\"], 8: [13, \"KK\"] }), { 7: [18, \"FF\"], 8: [18, \"KK\"] })",
   ko="editGrid(editGrid(G, { 7: [13, \"KF\"], 8: [13, \"FK\"] }), { 7: [18, \"KF\"], 8: [18, \"FK\"] })",
   eyes="eyes: K at rows 7-8, cols 13-14 and 18-19, in the mask's slit", effect=("arc", "armR", 12, 1.5, 0, 0, "B"), z={"legL":1,"legR":1,"armL":0,"armR":4,"head":3,"torso":2}),
 "wizard": dict(walk='{ id: "walk", frames: 6, fps: 10, loop: true, keys: [{ at: 0, pose: { legL: { dx: -3 }, legR: { dx: 3 }, torso: { dy: -2, rot: 0.03 }, armL: { rot: 0.25 }, armR: { rot: -0.15 } } }, { at: 3, pose: { legL: { dx: 3 }, legR: { dx: -3 }, torso: { dy: -2, rot: -0.03 }, armL: { rot: -0.25 }, armR: { rot: 0.15 } } }] }', origin=[16,48], bones={"torso":[16,44],"head":[16,20],"armL":[8,22],"armR":[25,23],"legL":[11,44],"legR":[21,44]},
   sockets={"hand":["armR",[30,6]],"head":["head",[17,0]]}, hitbox=[6,0,27,47],
   hurt="editGrid(editGrid(G, { 16: [14, \"FF\"], 17: [14, \"KK\"] }), { 16: [18, \"FF\"], 17: [18, \"KK\"] })",
   ko="editGrid(editGrid(G, { 16: [14, \"KF\"], 17: [14, \"FK\"] }), { 16: [18, \"KF\"], 17: [18, \"FK\"] })",
   eyes="eyes: K at rows 16-17, cols 14-15 and 18-19, under the brim", effect=("star", "armR", 5, -17, 6, 2.6, "S"), z={"legL":1,"legR":1,"armL":0,"head":3,"armR":4,"torso":2}),
 "bat": dict(ko_end='{ root: { rot: Math.PI, dy: -27 * U } }', origin=[20,32], bones={"torso":[20,27],"head":[20,16],"armL":[15,14],"armR":[25,14],"legL":[17,27],"legR":[22,27]},
   sockets={"head":["head",[20,5]]}, hitbox=[13,5,27,31], hops=True,
   hurt="editGrid(editGrid(G, { 13: [17, \"pp\"], 14: [17, \"YY\"] }), { 13: [21, \"pp\"], 14: [21, \"YY\"] })",
   ko="editGrid(editGrid(G, { 13: [17, \"Kp\"], 14: [17, \"pK\"] }), { 13: [21, \"Kp\"], 14: [21, \"pK\"] })",
   eyes="eyes: Y at rows 13-14, cols 17-18 and 21-22, a K pupil at the lower-right of each", effect=None, z={"legL":1,"legR":1,"wingL":0,"wingR":0,"head":3,"torso":2},
   walk='{ id: "walk", frames: 6, fps: 10, loop: true, keys: [{ at: 0, pose: { armL: { rot: -0.5 }, armR: { rot: 0.5 }, root: { dy: -2 } } }, { at: 3, pose: { armL: { rot: 0.5 }, armR: { rot: -0.5 }, root: { dy: -5 } } }] }'),
 "brawler": dict(origin=[16,48], bones={"torso":[16,34],"head":[16,13],"armL":[6,16],"armR":[23,17],"legL":[12,35],"legR":[20,35]},
   sockets={"hand":["armR",[34,19]],"head":["head",[16,1]]}, hitbox=[8,0,24,47],
   hurt="editGrid(editGrid(G, { 9: [13, \"dd\"] }), { 9: [18, \"dd\"] })",
   ko="editGrid(editGrid(G, { 8: [13, \"KF\"], 9: [13, \"FK\"] }), { 8: [18, \"KF\"], 9: [18, \"FK\"] })",
   eyes="eyes: K at row 9, cols 13-14 and 18-19", effect=("star", "armR", 13, 2, 5, 2.4, "W"), z={"legL":1,"legR":1,"armL":0,"armR":4,"head":3,"torso":2}),
 "golem": dict(attack='{ id: "attack", frames: 6, fps: 12, loop: false, swaps: { spark: [SPARK_RIM, SPARK] }, keys: [{ at: 0, pose: { armR: { rot: 0.9, dx: -2 }, torso: { rot: -0.1 } } }, { at: 2, pose: { armR: { rot: -0.35, dx: 2 }, torso: { rot: 0.15, dx: 2 } } }, { at: 5, pose: {} }] }', ko_end='{ root: { rot: -Math.PI / 2, dy: -28 * U } }', walk='{ id: "walk", frames: 6, fps: 10, loop: true, keys: [{ at: 0, pose: { legL: { dx: -3 }, legR: { dx: 3 }, torso: { dy: -3 }, armL: { rot: 0.2 }, armR: { rot: -0.2 } } }, { at: 3, pose: { legL: { dx: 3 }, legR: { dx: -3 }, torso: { dy: -1 }, armL: { rot: -0.2 }, armR: { rot: 0.2 } } }] }', origin=[28,64], bones={"torso":[28,46],"head":[28,15],"armL":[5,16],"armR":[50,16],"legL":[20,46],"legR":[36,46]},
   sockets={"hand":["armR",[50,50]],"head":["head",[28,4]]}, hitbox=[10,3,45,63],
   hurt="editGrid(editGrid(G, { 9: [24, \"sss\"], 10: [24, \"yyy\"] }), { 9: [29, \"sss\"], 10: [29, \"yyy\"] })",
   ko="editGrid(editGrid(G, { 9: [24, \"qqq\"], 10: [24, \"qqq\"] }), { 9: [29, \"qqq\"], 10: [29, \"qqq\"] })",
   eyes="eyes: glowing y at rows 9-10, cols 24-26 and 29-31, a Y spark at the top-left", effect=("star", "armR", 6, 20, 7, 3, "Y"), z={"legL":1,"legR":1,"armL":3,"armR":3,"head":4,"torso":2}),
}
NAME = {"bunny":"Bunny","crab":"Crab","owl":"Owl King","ninja":"Ninja","wizard":"Wizard","bat":"Bat","brawler":"Brawler","golem":"Golem"}
BLURB = {
 "bunny": "The 48px bunny on the rig: pixels48.ts cut along the standard bones. The\n// ears turn with the head; the carrot is the right paw's, so it swings on\n// attack, with a small star at its tip.",
 "crab": "The 32px crab on the rig: pixels32.ts cut along the standard bones. The\n// claws are the arms, the eye stalks are the head, three legs a side share a\n// hip so the standard walk scuttles.",
 "owl": "The 64px Owl King on the rig: pixels64.ts cut along the standard bones. The\n// crown, tufts, eyes and beak turn with the head; the wings are the arms and\n// pivot at the shoulder; the talons are the legs.",
 "ninja": "The 48px ninja on the rig: pixels48.ts cut along the standard bones. The\n// blade rides the right arm and draws a thin crescent on attack; the scarf\n// stays with the torso.",
 "wizard": "The 48px wizard on the rig: pixels48.ts cut along the standard bones. The\n// hat and beard turn with the head; the staff and orb ride the right arm, and\n// the orb throws a star on attack.",
 "bat": "The 32px bat on the rig: pixels32.ts cut along the standard bones. The\n// wings are the arms; its own walk flaps them and lifts off the ground\n// (`hops`), because a bat does not walk.",
 "brawler": "The 48px brawler on the rig: pixels48.ts cut along the standard bones. The\n// forward glove throws a star on attack; the hanging glove is the left arm.",
 "golem": "The 64px golem on the rig: pixels64.ts cut along the standard bones. The\n// arms hang as pillars and swing on attack with a burst at the fist; the head\n// takes only the stone and glow characters of its rows, the shoulders stay.",
}

def effect_ts(eff):
    if not eff: return "", ""
    kind, bone, cx, cy, r1, r2, colour = eff
    if kind == "star":
        code = f'''const star = (cx: number, cy: number, r1: number, r2: number, n = 5): [number, number][] =>
  Array.from({{ length: n * 2 }}, (_, i) => {{ const a = -Math.PI / 2 + (i * Math.PI) / n; const r = i % 2 === 0 ? r1 : r2; return [(cx + Math.cos(a) * r) * U, (cy + Math.sin(a) * r) * U]; }});
const SPARK_RIM = P(star({cx}, {cy}, {r1 + 1}, {r2 + 0.6}), PAL.O);
const SPARK = P(star({cx}, {cy}, {r1}, {r2}), PAL.{colour});
'''
        return code, "attack: { spark: [SPARK_RIM, SPARK] },\n  "
    code = f'''const arc = (r: number, a0: number, a1: number, n = 9): [number, number][] =>
  Array.from({{ length: n }}, (_, i) => {{ const a = a0 + ((a1 - a0) * i) / (n - 1); return [({cx} + Math.cos(a) * r) * U, ({cy} + Math.sin(a) * r) * U]; }});
const SLASH_RIM = P([...arc(9, -1.3, 0.3), ...arc(5, 0.3, -1.3)], PAL.O);
const SLASH = P([...arc(8, -1.25, 0.25), ...arc(6, 0.25, -1.25)], PAL.{colour});
'''
    return code, "attack: { slash: [SLASH_RIM, SLASH] },\n  "

def emit_rig(root, name, H, parts):
    d = RIG[name]; U = 5
    eff_code, eff_swap = effect_ts(d["effect"])
    bones = "\n".join(f'    {b}: {{ at: [{a[0]}, {a[1]}], parent: "{"torso" if b in ("head","armL","armR") else "root"}" }},' for b, a in d["bones"].items())
    part_bone = {"legL":"legL","legR":"legR","armL":"armL","armR":"armR","clawL":"armL","clawR":"armR","wingL":"armL","wingR":"armR","head":"head","torso":"torso"}
    ps = "\n".join(f'    {{ id: "{pid}", bone: "{part_bone[pid]}", z: {d["z"][pid]}, regions: {json.dumps(regions)}' + (f', only: "{only}"' if only else "") + " }," for pid, regions, only in parts)
    if d["effect"]:
        ps += f'\n    {{ id: "{"slash" if d["effect"][0] == "arc" else "spark"}", bone: "{d["effect"][1]}", z: 5, regions: [] }},'
    socks = ", ".join(f'{k}: {{ bone: "{b}", at: [{a[0]}, {a[1]}] }}' for k, (b, a) in d["sockets"].items())
    hops = "  hops: true,\n" if d.get("hops") else ""
    if d.get("walk"):
        clips = f'''const clips = standardClips({{
  {eff_swap}hurt: {{ head: built.swap("head", HURT_HEAD) }},
  ko: {{ head: built.swap("head", KO_HEAD) }},
}});
clips[1] = {d["walk"]};{("" if not d.get("attack") else chr(10) + "// a lunge on the standard's legR swing would dip these long legs; the arm does the work" + chr(10) + "clips[2] = " + d["attack"] + ";")}
built.rig.clips = scaleClipTranslations(clips, U * {K[name]}, U);'''
    else:
        clips = f'''built.rig.clips = scaleClipTranslations(standardClips({{
  {eff_swap}hurt: {{ head: built.swap("head", HURT_HEAD) }},
  ko: {{ head: built.swap("head", KO_HEAD) }},
}}), U * {K[name]}, U);'''
    if d.get("ko_end"):
        clips += f"\n// the standard tumble would stand this body on end; it lies down its own way\nbuilt.rig.clips[4].keys[1].pose = {d['ko_end']};"
    Kc = f"{name.upper()}{H}"
    open(f"{root}{name}/rig{H}.ts", "w").write(f'''// {BLURB[name]}

{'import { P } from "../../scene-ops";' + chr(10) if d["effect"] else ""}import {{ buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec }} from "../../techniques/pixel-parts";
import {{ standardClips }} from "../clips";
import {{ {Kc}_GRID as G, {Kc}_PALETTE as PAL }} from "./pixels{H}";

export const {Kc}_UNIT = 5;
const U = {Kc}_UNIT;

// {d["eyes"]}
const HURT_HEAD = {d["hurt"]};
const KO_HEAD = {d["ko"]};

{eff_code}export const {Kc}_SPEC: PixelRigSpec = {{
  id: "{name}",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [{d["origin"][0]}, {d["origin"][1]}],
  bones: {{
{bones}
  }},
  parts: [
{ps}
  ],
  sockets: {{ {socks} }},
  hitbox: [{", ".join(map(str, d["hitbox"]))}],
{hops}  clips: [],
}};

const built = buildPixelRig({Kc}_SPEC);
{clips}

export const {name}{H} = built;
export const {name}{H}Rig = built.rig;
''')
import json
