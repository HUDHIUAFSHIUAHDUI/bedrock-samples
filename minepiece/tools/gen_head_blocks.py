import json, os, glob

NAMESPACE = "minepiece"
BASE = "/home/user/bedrock-samples/minepiece"
BP_BLOCKS = f"{BASE}/behavior_pack/blocks"
RP = f"{BASE}/resource_pack"

os.makedirs(BP_BLOCKS, exist_ok=True)

FRUIT_IDS = ["sculk", "lava", "water", "arrow",
             "anvil", "core", "slime", "copper", "beacon", "trident",
             "snow", "potion", "goat", "shulker", "bat", "pillager"]


def write_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def bounding_box(fruit_id):
    """Reads the (already block-space-rebased) head geometry and returns a center-origin
    collision/selection box {origin: [x,y,z], size: [x,y,z]} covering it. Block geometry cubes
    and collision/selection boxes both use the same -8..8 (x/z) / 0..24 (y) block-local
    convention, so this is a direct min/max read with no coordinate conversion needed."""
    geo = json.load(open(f"{RP}/models/blocks/{fruit_id}_{fruit_id}_fruit.geo.json"))
    cubes = geo["minecraft:geometry"][0]["bones"][0]["cubes"]
    min_x = min(c["origin"][0] for c in cubes)
    max_x = max(c["origin"][0] + c["size"][0] for c in cubes)
    min_y = min(c["origin"][1] for c in cubes)
    max_y = max(c["origin"][1] + c["size"][1] for c in cubes)
    min_z = min(c["origin"][2] for c in cubes)
    max_z = max(c["origin"][2] + c["size"][2] for c in cubes)

    # Bedrock's collision/selection box components are constrained by the engine to
    # origin+size within Vec3(-8,0,-8)..Vec3(8,24,8). A couple of these heads (arrow,
    # beacon) have tall decorative pieces reaching well past y=24 in block-geometry
    # coordinates; left uncapped the box is out of bounds and the engine silently
    # falls back to a mismatched default hitbox, which is exactly what produces a
    # "the head doesn't place right" feel (visible model in one spot, collision/
    # selection outline in another). Clamp the top so the box stays valid — this only
    # affects the invisible hit/selection box, not the visible geometry.
    size_y = min(max_y - min_y, 24 - min_y)
    return {
        "origin": [round(min_x, 3), round(min_y, 3), round(min_z, 3)],
        "size": [round(max_x - min_x, 3), round(size_y, 3), round(max_z - min_z, 3)],
    }


terrain_texture_data = {}
blocks_json_entries = {}

for fruit_id in FRUIT_IDS:
    identifier = f"{NAMESPACE}:head_{fruit_id}"
    geometry_id = f"geometry.{fruit_id}_{fruit_id}_fruit"
    texture_key = f"head_{fruit_id}"
    box = bounding_box(fruit_id)

    write_json(
        f"{BP_BLOCKS}/head_{fruit_id}.json",
        {
            "format_version": "1.21.80",
            "minecraft:block": {
                "description": {
                    "identifier": identifier,
                    "menu_category": {"category": "none"},
                },
                "components": {
                    "minecraft:geometry": geometry_id,
                    "minecraft:material_instances": {
                        "*": {"texture": texture_key, "render_method": "alpha_test"}
                    },
                    "minecraft:collision_box": box,
                    "minecraft:selection_box": box,
                    "minecraft:destructible_by_mining": {"seconds_to_destroy": 1},
                    "minecraft:light_dampening": 0,
                    "minecraft:map_color": "#8a8a8a",
                    # The geometry assumes it's sitting upright on a floor (see rebase_head_geometry.py)
                    # — placing it against a wall or ceiling would render it sideways/embedded, so
                    # restrict placement to the top face of whatever block it's placed against.
                    "minecraft:placement_filter": {"conditions": [{"allowed_faces": ["up"]}]},
                },
            },
        },
    )

    terrain_texture_data[texture_key] = {"textures": f"textures/blocks/{texture_key}"}
    blocks_json_entries[identifier] = {"sound": "stone", "textures": texture_key}

write_json(
    f"{RP}/textures/terrain_texture.json",
    {
        "resource_pack_name": "minepiece",
        "texture_name": "atlas.terrain",
        "padding": 8,
        "num_mip_levels": 4,
        "texture_data": terrain_texture_data,
    },
)

write_json(f"{RP}/blocks.json", blocks_json_entries)

print(f"Wrote {len(FRUIT_IDS)} block definitions, {len(terrain_texture_data)} terrain texture entries.")
