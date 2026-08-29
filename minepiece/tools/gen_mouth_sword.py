"""
Builds the Zoro-style "sword clenched in the mouth" visual for the sword-as-helmet system
(core/swordBoost.js) — one shared thin-plane geometry, sized/positioned/rotated to sit across
the jaw, plus one texture and one attachable per material so each worn sword shows its own icon.

Bedrock attachable geometry has no "flat quad" primitive, only box-UV cubes, so this uses the
standard trick for rendering a flat icon in 3D space: a cube thin enough on one axis to read as a
plane. Each material's real item icon is composited into that cube's front/back box-UV regions
(instead of using the icon's own raw layout, which isn't arranged for box-UV at all) with the
edges filled from the icon's own average color so the thin sides don't show raw/transparent pixels.
"""
import json
from PIL import Image

BASE = "/home/user/bedrock-samples/minepiece"
RP = f"{BASE}/resource_pack"

# Plane cube: square in x/y (matches the icon's own 1:1 aspect ratio), thin in z.
PLANE_W = 3.5
PLANE_H = 3.5
PLANE_D = 0.5


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
    # front face region: (d, d, w, h); back face region: (2d+w, d, w, h) per the standard box-UV layout.
    canvas.paste(icon_small, (d, d))
    canvas.paste(icon_small, (round(2 * d + PLANE_W), d))
    canvas.save(out_path)
    return fw, fh


GEO_PATH = f"{RP}/models/entity/mouth_sword.geo.json"


def write_geometry():
    geo = {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": "geometry.mouth_sword",
                    "texture_width": box_uv_footprint(PLANE_W, PLANE_H, PLANE_D)[0],
                    "texture_height": box_uv_footprint(PLANE_W, PLANE_H, PLANE_D)[1],
                    "visible_bounds_width": 2,
                    "visible_bounds_height": 1.5,
                    "visible_bounds_offset": [0, 0.75, 0],
                },
                "bones": [
                    {
                        "name": "head",
                        "pivot": [0, 24, 0],
                        "cubes": [
                            {
                                # Centered on the jaw/mouth (lower third of the head, which spans
                                # y 24-32), angled diagonally like a sword clenched in the teeth —
                                # origin/pivot in the same entity-space convention as the player's
                                # real head bone.
                                "origin": [-PLANE_W / 2, 24.3, -4.2],
                                "size": [PLANE_W, PLANE_H, PLANE_D],
                                "pivot": [0, 26.0, -4.2],
                                "rotation": [0, 0, 20],
                                "uv": [0, 0],
                            }
                        ],
                    }
                ],
            }
        ],
    }
    with open(GEO_PATH, "w") as f:
        json.dump(geo, f, indent=2)
        f.write("\n")


MATERIALS = {
    "wooden_sword": "vanilla_wood_sword",
    "copper_sword": "vanilla_copper_sword",
    "stone_sword": "vanilla_stone_sword",
    "golden_sword": "vanilla_gold_sword",
    "iron_sword": "vanilla_iron_sword",
    "diamond_sword": "vanilla_diamond_sword",
    "netherite_sword": "vanilla_netherite_sword",
    "legendary_sword": "legendary_sword",
    "legendary_saber": "legendary_saber",
}

ICON_FILES = {
    "vanilla_wood_sword": "vanilla_wood_sword.png",
    "vanilla_copper_sword": "vanilla_copper_sword.png",
    "vanilla_stone_sword": "vanilla_stone_sword.png",
    "vanilla_gold_sword": "vanilla_gold_sword.png",
    "vanilla_iron_sword": "vanilla_iron_sword.png",
    "vanilla_diamond_sword": "vanilla_diamond_sword.png",
    "vanilla_netherite_sword": "vanilla_netherite_sword.png",
    "legendary_sword": "legendary_sword.png",
    "legendary_saber": "legendary_saber.png",
}

write_geometry()

for material, icon_key in MATERIALS.items():
    icon_path = f"{RP}/textures/items/{ICON_FILES[icon_key]}"
    tex_out = f"{RP}/textures/attachables/mouth_sword_{material}.png"
    build_plane_texture(icon_path, tex_out)

    attachable = {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": f"minepiece:mouth_sword_{material}",
                "item": {f"minepiece:worn_sword_{material}": "query.owner_identifier == 'minecraft:player'"},
                "materials": {"default": "armor", "enchanted": "armor_enchanted"},
                "textures": {
                    "default": f"textures/attachables/mouth_sword_{material}",
                    "enchanted": "textures/misc/enchanted_item_glint",
                },
                "geometry": {"default": "geometry.mouth_sword"},
                "render_controllers": ["controller.render.armor"],
            }
        },
    }
    with open(f"{RP}/attachables/mouth_sword_{material}.json", "w") as f:
        json.dump(attachable, f, indent=2)
        f.write("\n")

print(f"Wrote geometry + {len(MATERIALS)} attachable/texture pairs.")
