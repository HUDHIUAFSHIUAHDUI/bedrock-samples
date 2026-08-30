"""
Legendary Sword/Saber were shipping as flat 2D icons only. The CraftyCraft source pack actually
included real 3D held-item assets (client/models/entity/sword.geo.json, saber.geo.json + render
controllers + animations) for these two, built on the old pre-1.10 "full player rig with a tool
bone" technique — but that rig's cube coordinates are meaningless without also reproducing its
exact multi-bone parent chain (root -> waist -> body -> rightarm -> tool, with the tool bone's
own -45/180/0 rotation baked in on top), and there was never a matching UV texture for it (its
own texture_width/height, 58x19, doesn't match any texture file anywhere in the source addon).
Reverse-engineering that chain is fragile and unverifiable without a live client to check against.

Vanilla's own trident (resource_pack/attachables/trident.entity.json + models/entity/trident.geo.json)
proves the current, correct, much simpler way to do this: a single bone with
`"binding": "q.item_slot_to_bone_name(c.item_slot)"` — the modern replacement for that whole old
rig, since the engine now positions/orients the bone into whichever slot (mainhand/offhand) holds
the item automatically — plus an attachable file whose own identifier is set to literally the
same id as the item, which is all Bedrock needs to auto-bind an attachable to an item (confirmed:
trident's own behavior-pack item file doesn't reference the attachable at all — no vanilla item
json exists for it — the identifier match is the entire link).

This builds a simple 4-5 cube blade (handle, guard, blade, pommel, +accent gem for the sword)
using that same modern single-bone pattern, textured with flat colors sampled from the real
recovered artwork (tools/fix_legendary_weapon_icons.py) so both weapons keep their established
color identity: sword = gold hilt / silver blade / blue gem, saber = gold guard / red-wrapped
grip / near-black blade.
"""
import json
from PIL import Image

BASE = "/home/user/bedrock-samples/minepiece"
RP = f"{BASE}/resource_pack"

GOLD = (184, 140, 47, 255)
SILVER = (178, 188, 189, 255)
BLUE_GEM = (49, 39, 174, 255)
DARK_GRIP = (40, 40, 40, 255)
RED_GRIP = (183, 51, 36, 255)
NEAR_BLACK_BLADE = (40, 40, 40, 255)

# Each cube: (name, origin, size, color)
WEAPONS = {
    "legendary_sword": [
        ("pommel", (-0.75, 16, -0.75), (1.5, 1, 1.5), GOLD),
        ("handle", (-0.5, 17, -0.5), (1, 6, 1), DARK_GRIP),
        ("guard", (-2, 23, -0.5), (4, 1, 1), GOLD),
        ("gem", (-0.5, 23.3, -0.62), (1, 0.4, 0.12), BLUE_GEM),
        ("blade", (-0.5, 24, -0.5), (1, 11, 1), SILVER),
    ],
    "legendary_saber": [
        ("pommel", (-0.75, 16, -0.75), (1.5, 1, 1.5), GOLD),
        ("handle", (-0.5, 17, -0.5), (1, 6, 1), RED_GRIP),
        ("guard", (-2, 23, -0.5), (4, 1, 1), GOLD),
        ("blade", (-0.5, 24, -0.5), (1, 11, 1), NEAR_BLACK_BLADE),
    ],
}


def box_uv_footprint(size):
    sx, sy, sz = size
    return round(2 * (sz + sx)), round(sy + sz)


def build_geometry_and_texture(weapon_id, cubes):
    # Lay out each cube's box-UV footprint left-to-right in one row, filled with its flat color.
    footprints = [box_uv_footprint(size) for _name, _origin, size, _color in cubes]
    tex_width = sum(w for w, _h in footprints)
    tex_height = max(h for _w, h in footprints)

    canvas = Image.new("RGBA", (tex_width, tex_height), (0, 0, 0, 0))
    px = canvas.load()

    geo_cubes = []
    cursor_x = 0
    for (name, origin, size, color), (fw, fh) in zip(cubes, footprints):
        for y in range(fh):
            for x in range(fw):
                px[cursor_x + x, y] = color
        geo_cubes.append({
            "origin": list(origin),
            "size": list(size),
            "uv": [cursor_x, 0],
        })
        cursor_x += fw

    texture_path = f"{RP}/textures/entity/{weapon_id}.png"
    canvas.save(texture_path)

    geo = {
        "format_version": "1.16.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": f"geometry.{weapon_id}",
                    "texture_width": tex_width,
                    "texture_height": tex_height,
                },
                "bones": [
                    {
                        "name": "root",
                        "binding": "q.item_slot_to_bone_name(c.item_slot)",
                        "pivot": [0.0, 24.0, 0.0],
                        "cubes": geo_cubes,
                    }
                ],
            }
        ],
    }
    geo_path = f"{RP}/models/entity/{weapon_id}.geo.json"
    with open(geo_path, "w") as f:
        json.dump(geo, f, indent=2)
        f.write("\n")

    attachable = {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": f"minepiece:{weapon_id}",
                "materials": {
                    "default": "entity_alphatest",
                    "enchanted": "entity_alphatest_glint",
                },
                "textures": {
                    "default": f"textures/entity/{weapon_id}",
                    "enchanted": "textures/misc/enchanted_item_glint",
                },
                "geometry": {"default": f"geometry.{weapon_id}"},
                "render_controllers": ["controller.render.item_default"],
            }
        },
    }
    attachable_path = f"{RP}/attachables/{weapon_id}.entity.json"
    with open(attachable_path, "w") as f:
        json.dump(attachable, f, indent=2)
        f.write("\n")

    print(f"{weapon_id}: {len(cubes)} cubes, texture {tex_width}x{tex_height} -> {texture_path}, {geo_path}, {attachable_path}")


for weapon_id, cubes in WEAPONS.items():
    build_geometry_and_texture(weapon_id, cubes)
