"""
Uses the ACTUAL 3D sword/saber shapes from the CraftyCraft source pack
(client/models/entity/sword.geo.json, saber.geo.json) instead of an invented replacement blade.

Those files rig the blade as a "tool" bone hung off a full old-style player skeleton (root ->
waist -> body -> rightarm -> tool), but every ancestor bone (root/waist/body/rightarm) has
rotation [0, 0, 0] — a zero-rotation bone contributes nothing to its children's final transform,
pivot or not — so the *only* bone that actually matters is "tool" itself: its own pivot, rotation,
and cubes are the entire visual result. That means the real shape can be lifted verbatim (same
pivot, same rotation, same cube list, completely unmodified) into a single bone and given the
modern binding vanilla's own trident uses (resource_pack/attachables/trident.entity.json):
`"binding": "q.item_slot_to_bone_name(c.item_slot)"`, which auto-positions it into whichever hand
slot holds the item — no old-style multi-bone rig needed to reproduce the same result.

Neither weapon ever shipped a texture matching its own declared UV layout (58x19 for the sword,
30x14 for the saber) anywhere in the source addon, so there's nothing to sample real per-pixel
art from for this geometry (unlike the flat icon, which DID have real recoverable color data —
see fix_legendary_weapon_icons.py). Each cube gets a flat color instead, chosen by its own
origin_y (the low handle cubes are grip-colored, the mid cubes that form the crossguard are gold,
the tall upper cubes are the blade) — same "flatten to a designed/sampled color" approach already
used throughout this pack (mouth-sword plane textures, the bat fix, this same weapon's icon).
"""
import json
import math
from PIL import Image

BASE = "/home/user/bedrock-samples/minepiece"
RP = f"{BASE}/resource_pack"
SCRATCH_ADDON = "/tmp/claude-0/-home-user-MinecraftForge/b54b4eaf-6474-53d3-acf4-fecab4d8460d/scratchpad/addon0004/extracted"

GOLD = (184, 140, 47, 255)
SILVER_BLADE = (178, 188, 189, 255)
BLUE_GEM = (49, 39, 174, 255)
DARK_GRIP = (40, 40, 40, 255)
RED_GRIP = (183, 51, 36, 255)
BLACK_BLADE = (40, 40, 40, 255)

# Per weapon: source geo filename, the "tool" bone's cube-color classifier, grip color.
WEAPON_CONFIGS = {
    "legendary_sword": {
        "source": "sword.geo.json",
        "blade_color": SILVER_BLADE,
        "grip_color": DARK_GRIP,
        "handle_top_y": 20,   # cubes below this are the handle/grip
        "guard_top_y": 23,    # cubes from handle_top_y..guard_top_y are the crossguard
        "accent_color": BLUE_GEM,  # small (<=1x1x1) cubes inside the blade range get this
    },
    "legendary_saber": {
        "source": "saber.geo.json",
        "blade_color": BLACK_BLADE,
        "grip_color": RED_GRIP,
        "handle_top_y": 11,
        "guard_top_y": 15,
        "accent_color": GOLD,
    },
}


def load_tool_bone(source_filename):
    doc = json.load(open(f"{SCRATCH_ADDON}/client/models/entity/{source_filename}"))
    geo = doc["minecraft:geometry"][0]
    tool = next(b for b in geo["bones"] if b["name"] == "tool")
    return tool


def rotate_point(p, pivot, rotation):
    rx, ry, rz = [math.radians(-a) for a in rotation]
    px, py, pz = pivot
    x, y, z = p[0] - px, p[1] - py, p[2] - pz
    x, y = x * math.cos(rz) - y * math.sin(rz), x * math.sin(rz) + y * math.cos(rz)
    y, z = y * math.cos(rx) - z * math.sin(rx), y * math.sin(rx) + z * math.cos(rx)
    x, z = x * math.cos(ry) + z * math.sin(ry), -x * math.sin(ry) + z * math.cos(ry)
    return (x + px, y + py, z + pz)


def compute_visible_bounds(tool):
    """Same technique as close_lateral_gaps.py's ranges(): rotate every cube's 8 corners around
    its own pivot, then the whole result around the bone's pivot, before taking min/max — the
    *true* rendered bounding box, not the pre-rotation one. Needed because this blade is rotated
    -45/180/0 as a whole (per the tool bone itself) on top of individual cube rotations, so the
    raw origin/size box understates the real on-screen extent by a wide margin. Bedrock's default
    attachable visible_bounds is tuned for small vanilla items; leaving it unset for a blade this
    large risks the exact "disappears at some camera angles" bug fix_visible_bounds.py exists for.
    """
    bone_pivot, bone_rotation = tool["pivot"], tool["rotation"]
    pts = []
    for cube in tool["cubes"]:
        o, s = cube["origin"], cube["size"]
        cube_pivot = cube.get("pivot", bone_pivot)
        cube_rotation = cube.get("rotation", [0, 0, 0])
        for dx in (0, s[0]):
            for dy in (0, s[1]):
                for dz in (0, s[2]):
                    p = (o[0] + dx, o[1] + dy, o[2] + dz)
                    if cube_rotation != [0, 0, 0]:
                        p = rotate_point(p, cube_pivot, cube_rotation)
                    if bone_rotation != [0, 0, 0]:
                        p = rotate_point(p, bone_pivot, bone_rotation)
                    pts.append(p)
    xs, ys, zs = [p[0] for p in pts], [p[1] for p in pts], [p[2] for p in pts]
    width_px = max(max(xs) - min(xs), max(zs) - min(zs))
    height_px = max(ys) - min(ys)
    center_y_px = (min(ys) + max(ys)) / 2
    return {
        "visible_bounds_width": round(width_px / 16 + 0.3, 2),
        "visible_bounds_height": round(height_px / 16 + 0.3, 2),
        "visible_bounds_offset": [0, round(center_y_px / 16, 3), 0],
    }


def box_uv_footprint(size):
    sx, sy, sz = size
    return round(2 * (sz + sx)), round(sy + sz)


def classify_color(cube, config):
    origin_y = cube["origin"][1]
    size = cube["size"]
    is_small = size[0] <= 1 and size[1] <= 1 and size[2] <= 1
    rotated = cube.get("rotation", [0, 0, 0]) != [0, 0, 0]

    if rotated:
        return GOLD  # the crossguard's rotated horizontal bar, when present
    if origin_y < config["handle_top_y"]:
        return config["grip_color"]
    if origin_y < config["guard_top_y"]:
        return GOLD
    if is_small:
        return config["accent_color"]
    return config["blade_color"]


def build(weapon_id, config):
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
        geo_cube = {
            "origin": cube["origin"],
            "size": cube["size"],
            "uv": cube["uv"],
        }
        if cube.get("pivot"):
            geo_cube["pivot"] = cube["pivot"]
        if cube.get("rotation") and cube["rotation"] != [0, 0, 0]:
            geo_cube["rotation"] = cube["rotation"]
        if cube.get("inflate"):
            geo_cube["inflate"] = cube["inflate"]
        geo_cubes.append(geo_cube)

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
                    **compute_visible_bounds(tool),
                },
                "bones": [
                    {
                        "name": "root",
                        "binding": "q.item_slot_to_bone_name(c.item_slot)",
                        "pivot": tool["pivot"],
                        "rotation": tool["rotation"],
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

    print(f"{weapon_id}: {len(cubes)} real cubes from {config['source']}, texture {tex_width}x{tex_height}")


for weapon_id, config in WEAPON_CONFIGS.items():
    build(weapon_id, config)
