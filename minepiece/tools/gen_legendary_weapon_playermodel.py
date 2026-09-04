"""
The real mechanism CraftyCraft used for Legendary Sword/Saber's 3D held model, found by reading
client/entity/player.entity.json in the original addon in full (not just grepping for
"attachable", which is why it was missed twice): this ISN'T a per-item attachable at all — it's
an override of minecraft:player's own client entity file, adding a second, always-present
geometry ("sword"/"saber") alongside the normal body, shown via a conditional render_controller
driven by `query.get_equipped_item_name('main_hand') == 'sword'` — Molang string comparison
against the item's own short identifier. This same query still exists and is used by real,
current vanilla files today (resource_pack/attachables/shield.entity.json,
resource_pack/render_controllers/player.render_controllers.json).

Two things in the original wiring were objectively broken, independent of any binding-mechanism
question:
  1. Its render controller (client/render_controllers/cc_sword.json) referenced
     "Geometry.sword"/"Material.default"/"Texture.sword" — capitalized. Molang property access is
     case-sensitive and no other Bedrock file (vanilla or in this pack) capitalizes these; every
     working example uses lowercase "geometry.x"/"material.x"/"texture.x". Fixed here.
  2. The geometry's own declared UV layout is 58x19 (sword) / 30x14 (saber), but the texture it
     was pointed at (textures/craftycraft/items/cc_sword.png) is only 16x5 — a completely
     different, tiny fragment, not a real match for that UV space. Generates a texture at the
     geometry's own real declared size instead, colored by cube role (handle/guard/blade) sampled
     from the recovered icon art, the same "flatten to a designed color" approach used everywhere
     else in this pack.

Everything else is lifted as-is from the source: the exact "tool" bone (pivot, rotation, full
cube list, unmodified) from client/models/entity/sword.geo.json / saber.geo.json, and the exact
first-person hold position/rotation from client/animations/cc_sword.json's
"animation.sword.first_person.hold" (the only animation of the pair that actually applies to our
bone list — the other, "animation.sword.hold", drives "inner_rotor"/"rotator" bones that don't
exist anywhere in this geometry, so it's dropped rather than carried over as dead weight).

This edits resource_pack/entity/player.entity.json, starting from an unmodified copy of current
vanilla's own file (not the outdated 2019-era copy bundled in the source addon) and adding only
new keys — every existing vanilla field is left untouched.
"""
import json
from PIL import Image

BASE = "/home/user/bedrock-samples/minepiece"
RP = f"{BASE}/resource_pack"
VANILLA_RP = "/home/user/bedrock-samples/resource_pack"
SCRATCH_ADDON = "/tmp/claude-0/-home-user-MinecraftForge/b54b4eaf-6474-53d3-acf4-fecab4d8460d/scratchpad/fresh_extract/client"

GOLD = (184, 140, 47, 255)
SILVER_BLADE = (178, 188, 189, 255)
BLUE_GEM = (49, 39, 174, 255)
DARK_GRIP = (40, 40, 40, 255)
RED_GRIP = (183, 51, 36, 255)
BLACK_BLADE = (40, 40, 40, 255)

WEAPON_CONFIGS = {
    "legendary_sword": {
        "source": "sword.geo.json",
        "short_name": "legendary_sword",
        "blade_color": SILVER_BLADE,
        "grip_color": DARK_GRIP,
        "handle_top_y": 20,
        "guard_top_y": 23,
        "accent_color": BLUE_GEM,
    },
    "legendary_saber": {
        "source": "saber.geo.json",
        "short_name": "legendary_saber",
        "blade_color": BLACK_BLADE,
        "grip_color": RED_GRIP,
        "handle_top_y": 11,
        "guard_top_y": 15,
        "accent_color": GOLD,
    },
}

FIRST_PERSON_HOLD = {"position": [0, 7, 0], "rotation": [5, 60, -82.5]}


def load_tool_bone(source_filename):
    doc = json.load(open(f"{SCRATCH_ADDON}/models/entity/{source_filename}"))
    geo = doc["minecraft:geometry"][0]
    return next(b for b in geo["bones"] if b["name"] == "tool")


def box_uv_footprint(size):
    sx, sy, sz = size
    return round(2 * (sz + sx)), round(sy + sz)


def classify_color(cube, config):
    origin_y = cube["origin"][1]
    size = cube["size"]
    is_small = size[0] <= 1 and size[1] <= 1 and size[2] <= 1
    rotated = cube.get("rotation", [0, 0, 0]) != [0, 0, 0]
    if rotated:
        return GOLD
    if origin_y < config["handle_top_y"]:
        return config["grip_color"]
    if origin_y < config["guard_top_y"]:
        return GOLD
    if is_small:
        return config["accent_color"]
    return config["blade_color"]


def build_geometry_and_texture(weapon_id, config):
    tool = load_tool_bone(config["source"])
    cubes = tool["cubes"]

    footprints = [box_uv_footprint(c["size"]) for c in cubes]
    tex_width = max(c["uv"][0] + w for c, (w, _h) in zip(cubes, footprints))
    tex_height = max(c["uv"][1] + h for c, (_w, h) in zip(cubes, footprints))

    canvas = Image.new("RGBA", (tex_width, tex_height), (0, 0, 0, 0))
    px = canvas.load()
    geo_cubes = []
    for cube, (fw, fh) in zip(cubes, footprints):
        color = classify_color(cube, config)
        u, v = cube["uv"]
        for y in range(fh):
            for x in range(fw):
                if 0 <= u + x < tex_width and 0 <= v + y < tex_height:
                    px[u + x, v + y] = color
        geo_cube = {"origin": cube["origin"], "size": cube["size"], "uv": cube["uv"]}
        if cube.get("pivot"):
            geo_cube["pivot"] = cube["pivot"]
        if cube.get("rotation") and cube["rotation"] != [0, 0, 0]:
            geo_cube["rotation"] = cube["rotation"]
        if cube.get("inflate"):
            geo_cube["inflate"] = cube["inflate"]
        geo_cubes.append(geo_cube)

    texture_path = f"{RP}/textures/entity/{weapon_id}_tool.png"
    canvas.save(texture_path)

    geo = {
        "format_version": "1.16.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": f"geometry.{weapon_id}_tool",
                    "texture_width": tex_width,
                    "texture_height": tex_height,
                },
                "bones": [
                    {
                        "name": "root",
                    },
                    {
                        "name": "waist",
                        "parent": "root",
                        "pivot": [0, 12, 0],
                    },
                    {
                        "name": "body",
                        "parent": "waist",
                        "pivot": [0, 24, 0],
                    },
                    {
                        "name": "rightarm",
                        "parent": "body",
                        "pivot": [-5, 22, 0],
                    },
                    {
                        "name": "tool",
                        "parent": "rightarm",
                        "pivot": tool["pivot"],
                        "rotation": tool["rotation"],
                        "cubes": geo_cubes,
                    },
                ],
            }
        ],
    }
    geo_path = f"{RP}/models/entity/{weapon_id}_tool.geo.json"
    with open(geo_path, "w") as f:
        json.dump(geo, f, indent=2)
        f.write("\n")
    print(f"{weapon_id}: {len(cubes)} real cubes, texture {tex_width}x{tex_height} -> {texture_path}")


def build_render_controllers():
    doc = {
        "format_version": "1.10.0",
        "render_controllers": {},
    }
    for weapon_id in WEAPON_CONFIGS:
        doc["render_controllers"][f"controller.render.{weapon_id}"] = {
            "geometry": f"geometry.{weapon_id}",
            "materials": [{"*": "material.default"}],
            "textures": [f"texture.{weapon_id}"],
        }
    path = f"{RP}/render_controllers/legendary_weapons.render_controllers.json"
    with open(path, "w") as f:
        json.dump(doc, f, indent=2)
        f.write("\n")
    print(f"wrote {path}")


def build_animations():
    doc = {"format_version": "1.8.0", "animations": {}}
    for weapon_id in WEAPON_CONFIGS:
        doc["animations"][f"animation.{weapon_id}.first_person.hold"] = {
            "loop": True,
            "bones": {"tool": FIRST_PERSON_HOLD},
        }
    path = f"{RP}/animations/legendary_weapons.animation.json"
    with open(path, "w") as f:
        json.dump(doc, f, indent=2)
        f.write("\n")
    print(f"wrote {path}")


def patch_player_entity():
    src = f"{VANILLA_RP}/entity/player.entity.json"
    dst = f"{RP}/entity/player.entity.json"
    doc = json.load(open(src))
    desc = doc["minecraft:client_entity"]["description"]

    for weapon_id, config in WEAPON_CONFIGS.items():
        desc["geometry"][weapon_id] = f"geometry.{weapon_id}_tool"
        desc["textures"][weapon_id] = f"textures/entity/{weapon_id}_tool"
        desc["animations"][f"{weapon_id}_first_person"] = f"animation.{weapon_id}.first_person.hold"
        desc["render_controllers"].append({f"controller.render.{weapon_id}": f"variable.{weapon_id}"})
        desc["scripts"]["pre_animation"].append(
            f"variable.{weapon_id} = query.get_equipped_item_name('main_hand') == '{config['short_name']}';"
        )
        desc["scripts"]["animate"].append(
            {f"{weapon_id}_first_person": f"variable.{weapon_id} && variable.is_first_person"}
        )

    with open(dst, "w") as f:
        json.dump(doc, f, indent=2)
        f.write("\n")
    print(f"wrote {dst}")


for weapon_id, config in WEAPON_CONFIGS.items():
    build_geometry_and_texture(weapon_id, config)
build_render_controllers()
build_animations()
patch_player_entity()
