// Godot 4: a SpriteFrames resource (.tres) generated from the manifest and
// atlas - one animation per clip, one AtlasTexture sub-resource per frame.
//
// STUB, deliberately: the text below follows Godot 4's documented .tres
// shape for SpriteFrames + AtlasTexture, but no Godot project in this repo
// has loaded it. Until one does, treat the output as a starting point, not
// an artifact - the plan defers a real Godot adapter to the first game
// that wants one. The generator is still tested for shape, so a manifest
// change that would break it is caught here rather than in Godot.

import type { Atlas, Manifest } from "../manifest";

export function godotSpriteFrames(manifest: Manifest, atlas: Atlas, sheetResPath: string): string {
  const names = Object.values(manifest.animations).flatMap((a) => a.frames);
  const idOf = new Map(names.map((n, i) => [n, i + 1]));
  const subs = names.map((n) => {
    const r = atlas.frames[n].frame;
    return `[sub_resource type="AtlasTexture" id="AtlasTexture_${idOf.get(n)}"]\natlas = ExtResource("1_sheet")\nregion = Rect2(${r.x}, ${r.y}, ${r.w}, ${r.h})\n`;
  });
  const anims = Object.entries(manifest.animations).map(([clip, a]) => {
    const frames = a.frames.map((n) => `{\n"duration": 1.0,\n"texture": SubResource("AtlasTexture_${idOf.get(n)}")\n}`).join(", ");
    return `{\n"frames": [${frames}],\n"loop": ${a.loop},\n"name": &"${clip}",\n"speed": ${a.fps}.0\n}`;
  });
  return [
    `[gd_resource type="SpriteFrames" load_steps=${names.length + 2} format=3]`,
    ``,
    `[ext_resource type="Texture2D" path="${sheetResPath}" id="1_sheet"]`,
    ``,
    ...subs,
    `[resource]`,
    `animations = [${anims.join(", ")}]`,
    ``,
  ].join("\n");
}
