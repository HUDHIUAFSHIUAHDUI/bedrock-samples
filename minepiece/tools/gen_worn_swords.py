"""
Generates the "worn as a helmet" sword items behind core/swordBoost.js's sneak+use conversion —
a real minecraft:wearable head-slot item with no minecraft:armor component (no protection) and a
minecraft:durability component that's never actually touched in play (armor slots don't take
combat damage the way held items do), matching "doesn't provide any protection nor does it take
damage". Each one pairs with a Zoro-style mouth attachable (resource_pack/attachables/mouth_sword_
*.json) sharing one geometry (resource_pack/models/entity/mouth_sword.geo.json) but its own texture.

Run after tools/gen_sword_boosts.py (appends to en_US.lang the same way).
"""
import json, os

NAMESPACE = "minepiece"
BASE = "/home/user/bedrock-samples/minepiece"
BP_ITEMS = f"{BASE}/behavior_pack/items"
RP_TEXTS = f"{BASE}/resource_pack/texts"

# source sword id -> (real durability, display name, icon texture key, attachable material key)
WORN_SOURCES = {
    "minecraft:wooden_sword":    {"durability": 59,   "name": "Wooden Sword",    "icon": "vanilla_wood_sword",    "material": "wood"},
    "minecraft:copper_sword":    {"durability": 131,  "name": "Copper Sword",    "icon": "vanilla_copper_sword",  "material": "copper"},
    "minecraft:stone_sword":     {"durability": 131,  "name": "Stone Sword",     "icon": "vanilla_stone_sword",   "material": "stone"},
    "minecraft:golden_sword":    {"durability": 32,   "name": "Golden Sword",    "icon": "vanilla_gold_sword",    "material": "gold"},
    "minecraft:iron_sword":      {"durability": 250,  "name": "Iron Sword",      "icon": "vanilla_iron_sword",    "material": "iron"},
    "minecraft:diamond_sword":   {"durability": 1561, "name": "Diamond Sword",   "icon": "vanilla_diamond_sword", "material": "diamond"},
    "minecraft:netherite_sword": {"durability": 2031, "name": "Netherite Sword", "icon": "vanilla_netherite_sword", "material": "netherite"},
    "minepiece:legendary_sword": {"durability": 2031, "name": "Legendary Sword", "icon": "legendary_sword",       "material": "legendary_sword"},
    "minepiece:legendary_saber": {"durability": 2031, "name": "Legendary Saber", "icon": "legendary_saber",       "material": "legendary_saber"},
}


def write_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


lang_lines = []

for source_id, info in WORN_SOURCES.items():
    short = source_id.split(":")[1]
    worn_id = f"{NAMESPACE}:worn_sword_{short}"
    write_json(
        f"{BP_ITEMS}/worn_sword_{short}.json",
        {
            "format_version": "1.21.80",
            "minecraft:item": {
                "description": {
                    "identifier": worn_id,
                    "menu_category": {"category": "none"},
                },
                "components": {
                    "minecraft:display_name": {"value": f"item.{worn_id}.name"},
                    "minecraft:icon": {"textures": {"default": info["icon"]}},
                    "minecraft:max_stack_size": 1,
                    "minecraft:wearable": {"slot": "slot.armor.head", "dispensable": True},
                    "minecraft:durability": {"max_durability": info["durability"]},
                    "minecraft:enchantable": {"slot": "armor_head", "value": 15},
                },
            },
        },
    )
    lang_lines.append(f"item.{worn_id}.name={info['name']} (worn)")

with open(f"{RP_TEXTS}/en_US.lang", "a") as f:
    f.write("\n".join(lang_lines) + "\n")

print(f"Wrote {len(WORN_SOURCES)} worn-sword helmet items.")
