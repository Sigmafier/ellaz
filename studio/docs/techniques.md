# Techniques: how frames are made

A style says how a sprite LOOKS; a technique says where its frames COME FROM.
The two are independent, and the gallery shows them independently: the
technique page renders the same robot through every sampled technique in
one style, so the only thing that differs across the row is the technique.

The list below is generated from `art/techniques/index.ts` and checked both
ways by `techniques.test.ts`: a technique in the code is a row here, and a
row here is a technique in the code.

| id | technique | frames come from | a new animation costs | M1 |
|---|---|---|---|---|
| `pixel-strings` | Pixel strings in code | a palette-indexed text grid per frame | one grid per frame, by hand | sample |
| `shape-dsl` | Shape DSL per frame | rect / circle / ellipse / polygon op lists | one op list per frame, by hand | sample (the slime's clips) |
| `parts-rig` | Parts rig (paper-doll bones) | parts in bone-local space + keyframed poses | two to four keyframes; frames are baked | sample (robot, knight) |
| `parametric` | Parametric character generator | a dozen knobs: height, heads, shapes, girth, colours | zero - every generated character shares the standard clips | sample (teddy) |
| `tool-svg` | SVG authored in a tool | flat-shape SVG files (rect, circle, ellipse, polygon) | one SVG per frame, saved from the tool | sample |
| `voxel` | Voxel model pre-rendered | a list of cubes with colours | one pose per clip frame; facing directions are free | sample |
| `sprite-stacking` | Sprite stacking | a stack of flat slices, each with a height | one stack; rotation is free, poses are new stacks | sample |
| `procedural-mask` | Procedural mask generator | a body-plan template + a seed + a palette | zero per sprite; animation by re-seeding or template swaps | sample (robot-shaped, never the robot) |
| `ai-cleaned` | AI-generated, then cleaned | an image model prompt batch, palette-snapped and hand-culled | one prompt batch per pose, plus the cull | card: needs a provider and licence |
| `kid-drawings` | Kid drawings, scanned | real crayon drawings, photographed and cut out | one drawing per frame (a child draws the walk) | card: needs photographs |
| `runtime-shader` | Runtime style shader | one neutral sprite; the style is applied at draw time | zero - the engine restyles every frame live | card: engine-specific |

## Choosing

- A hero with a face and a weapon: **parts rig**. New clips are cheap and
  the character stays itself.
- A blob, cloth, anything that squashes: **shape DSL per frame**.
- Ten enemies that are variations on one body plan: **parametric**.
- A swarm, props, debris: **procedural mask**, and re-seed per instance.
- An artist who will not touch code: **tool SVG**, with the parser's shape
  subset as the brief.
- A character that must turn in eight directions: **voxel** or **sprite
  stacking**, the second when it can afford to be round.
- Anything under 32 pixels tall: **pixel strings** are still the fastest.

## Where the samples are

`npm run render:techniques` writes `shots/techniques/<style>.png`, one strip
per style with the eight samples in the order above. `art/games/<gameId>.json`
records the technique a game chose.
