"""
Replaces the Legendary Sword/Saber's in-hand texture with one that actually matches the
geometry's own declared UV size (58x19 for the sword, 30x14 for the saber), instead of the
source addon's cc_sword.png/cc_saber.png (16x5 / 16x7 — a tiny, wrong-sized fragment that Bedrock
just stretches across the whole model, which is why the in-game result was flat, undetailed, and
the saber in particular read as a nearly featureless black slab with no visible guard).

Geometry itself (resource_pack/models/entity/sword.geo.json / saber.geo.json) and the pivot/
rotation that determine where the weapon sits in hand are NOT touched by this — same exact cube
list as the source addon, verbatim, unchanged. Only the texture painted onto that same UV layout
changes, using real colors matched to the recovered icon art's established identity for each
weapon (gold hilt / silver blade / blue gem for the sword; gold guard / red-wrapped grip / near-
black blade for the saber) instead of one flat color per whole cube, and with an explicit color
per cube (identified by inspecting each cube's actual origin/size/role) rather than a Y-threshold
guess, so the guard reads as a distinct, visible piece on both weapons — not just the sword.
"""
import json
from PIL import Image

BASE = "/home/user/bedrock-samples/minepiece"
RP = f"{BASE}/resource_pack"

GOLD = (184, 140, 47, 255)
SILVER_BLADE = (200, 208, 210, 255)
SILVER_BLADE_DARK = (150, 160, 163, 255)
BLUE_GEM = (49, 39, 174, 255)
DARK_GRIP = (35, 30, 28, 255)
RED_GRIP = (150, 35, 28, 255)
BLACK_BLADE = (30, 30, 32, 255)
BLACK_BLADE_DARK = (15, 15, 16, 255)

# Explicit per-cube-index colors, identified by each cube's own origin/size in the real geometry
# (see the module docstring in the earlier player-model tool for the full per-cube breakdown).
# A (primary, edge) pair gives the cube's box-UV faces a *little* shading instead of one flat
# tone, without needing per-pixel art that doesn't exist for this geometry.
SWORD_CUBE_COLORS = [
    DARK_GRIP,        # 0: handle shaft, y10-20
    GOLD,             # 1: guard piece, y20
    GOLD,             # 2: guard piece, y20 (mirror)
    BLUE_GEM,         # 3: blade accent/gem, y27
    BLUE_GEM,         # 4: blade accent/gem, y27 (mirror)
    SILVER_BLADE,     # 5: main blade, y21-37
    SILVER_BLADE,     # 6: blade tip, y38-40
    SILVER_BLADE_DARK,# 7: blade, y37-38
    BLUE_GEM,         # 8: tip accent, y40-42
    GOLD,             # 9: guard prong, y19-22 (+z)
    GOLD,             # 10: guard prong, y19-22 (-z)
    GOLD,             # 11: crossguard bar (rotated)
]

SABER_CUBE_COLORS = [
    RED_GRIP,          # 0: handle shaft, y10-16
    BLACK_BLADE,       # 1: main blade, y15.5-27.5
    BLACK_BLADE_DARK,  # 2: secondary/back blade edge, y18-26
    BLACK_BLADE,       # 3: blade tip, y27.5-28.5
    GOLD,              # 4: guard prong, y11-14
    GOLD,              # 5: pommel/base, y10.5-11.5
    GOLD,              # 6: guard detail, y13.5-14.5
]

WEAPONS = {
    "sword": {"geo_file": "sword.geo.json", "colors": SWORD_CUBE_COLORS},
    "saber": {"geo_file": "saber.geo.json", "colors": SABER_CUBE_COLORS},
}


def box_uv_footprint(size):
    sx, sy, sz = size
    return round(2 * (sz + sx)), round(sy + sz)


def load_tool_cubes(geo_file):
    doc = json.load(open(f"{RP}/models/entity/{geo_file}"))
    tool = next(b for b in doc["minecraft:geometry"][0]["bones"] if b["name"] == "tool")
    return tool["cubes"]


for weapon_id, config in WEAPONS.items():
    cubes = load_tool_cubes(config["geo_file"])
    colors = config["colors"]
    assert len(cubes) == len(colors), f"{weapon_id}: {len(cubes)} cubes but {len(colors)} colors"

    footprints = [box_uv_footprint(c["size"]) for c in cubes]
    tex_width = max(c["uv"][0] + w for c, (w, _h) in zip(cubes, footprints))
    tex_height = max(c["uv"][1] + h for c, (_w, h) in zip(cubes, footprints))

    canvas = Image.new("RGBA", (tex_width, tex_height), (0, 0, 0, 0))
    px = canvas.load()
    for cube, color, (fw, fh) in zip(cubes, colors, footprints):
        u, v = cube["uv"]
        for y in range(fh):
            for x in range(fw):
                if 0 <= u + x < tex_width and 0 <= v + y < tex_height:
                    # Subtle vertical shading within each cube's own footprint (lighter near the
                    # top edge) so faces don't read as flat, uniform paint-swatches.
                    shade = 1.0 - (y / max(fh - 1, 1)) * 0.12
                    shaded = tuple(min(255, round(c * shade)) if i < 3 else c for i, c in enumerate(color))
                    px[u + x, v + y] = shaded

    out_path = f"{RP}/textures/entity/legendary_{weapon_id}_design.png"
    canvas.save(out_path)
    print(f"{weapon_id}: {tex_width}x{tex_height} -> {out_path}")
