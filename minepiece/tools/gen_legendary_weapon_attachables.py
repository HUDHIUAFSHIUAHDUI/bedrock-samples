"""
Legendary Sword/Saber's real 3D held model: the exact same "thin box-UV plane with the real
icon composited onto it" technique already proven working in tools/gen_mouth_sword.py, just
bound for the hand instead of the head.

Turns out custom (behavior-pack-defined) items don't get an automatic "flat icon extruded into a
thin 3D shape" render the way vanilla's own hardcoded items do — an item with only minecraft:icon
and no attachable renders as nothing at all when held. An attachable is required; the mistake
last time wasn't building one, it was building the wrong SHAPE (the old CraftyCraft "tool" bone
cube rig, colored with invented flat colors instead of the real recovered icon art).

Binds to whichever hand slot holds the item via the same modern technique vanilla's own trident
uses (resource_pack/attachables/trident.entity.json): a single bone bound with
`q.item_slot_to_bone_name(c.item_slot)`, and an attachable identifier equal to the item's own
identifier — no "item" binding block needed (that's only for cross-binding an attachable to a
*different* item, like mouth_sword_* binding to worn_sword_* — see gen_mouth_sword.py).

The plane's origin sits with its low corner at the bone's pivot and extends toward +x/+y from
there, so the icon's own hilt corner (bottom-left of the square icon, matching vanilla's sword-icon
convention) lands right at the hand attachment point and the blade (top-right of the icon) reads
as pointing up and away — no extra geometry rotation needed, the icon's own diagonal art supplies it.
"""
import json
from PIL import Image

BASE = "/home/user/bedrock-samples/minepiece"
RP = f"{BASE}/resource_pack"

PLANE_W = 14
PLANE_H = 14
PLANE_D = 0.5

WEAPONS = ["legendary_sword", "legendary_saber"]


def box_uv_footprint(w, h, d):
    return round(2 * d + 2 * w), round(h + d)


def average_color(img):
    px = img.load()
    w, h = img.size
    tot = [0, 0, 0, 0]
    n = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0:
                tot[0] += r; tot[1] += g; tot[2] += b; tot[3] += a
                n += 1
    return tuple(round(c / n) for c in tot) if n else (150, 150, 150, 255)


def build_plane_texture(icon_path, out_path):
    icon = Image.open(icon_path).convert("RGBA")
    edge_color = average_color(icon)
    icon_small = icon.resize((round(PLANE_W), round(PLANE_H)), Image.LANCZOS)

    fw, fh = box_uv_footprint(PLANE_W, PLANE_H, PLANE_D)
    canvas = Image.new("RGBA", (fw, fh), edge_color)
    d = round(PLANE_D)
    canvas.paste(icon_small, (d, d))
    canvas.paste(icon_small, (round(2 * d + PLANE_W), d))
    canvas.save(out_path)


for weapon_id in WEAPONS:
    icon_path = f"{RP}/textures/items/{weapon_id}.png"
    tex_out_rel = f"textures/entity/{weapon_id}_held"
    tex_out = f"{RP}/{tex_out_rel}.png"
    build_plane_texture(icon_path, tex_out)

    fw, fh = box_uv_footprint(PLANE_W, PLANE_H, PLANE_D)
    geo = {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": f"geometry.{weapon_id}_held",
                    "texture_width": fw,
                    "texture_height": fh,
                    "visible_bounds_width": 1.5,
                    "visible_bounds_height": 1.5,
                    "visible_bounds_offset": [0, 0.5, 0],
                },
                "bones": [
                    {
                        "name": "root",
                        "binding": "q.item_slot_to_bone_name(c.item_slot)",
                        "pivot": [0, 24, 0],
                        "cubes": [
                            {
                                "origin": [0, 24, -PLANE_D / 2],
                                "size": [PLANE_W, PLANE_H, PLANE_D],
                                "pivot": [0, 24, 0],
                                "rotation": [0, 0, 0],
                                "uv": [0, 0],
                            }
                        ],
                    }
                ],
            }
        ],
    }
    geo_path = f"{RP}/models/entity/{weapon_id}_held.geo.json"
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
                    "default": tex_out_rel,
                    "enchanted": "textures/misc/enchanted_item_glint",
                },
                "geometry": {"default": f"geometry.{weapon_id}_held"},
                "render_controllers": ["controller.render.item_default"],
            }
        },
    }
    attachable_path = f"{RP}/attachables/{weapon_id}.entity.json"
    with open(attachable_path, "w") as f:
        json.dump(attachable, f, indent=2)
        f.write("\n")

    print(f"{weapon_id}: plane {fw}x{fh} -> {tex_out}, {geo_path}, {attachable_path}")
