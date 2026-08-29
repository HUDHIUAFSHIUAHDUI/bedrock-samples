"""
Generates the "boosted" display-variant sword items behind the offhand and
helmet damage-boost systems (core/offhandBoost.js, core/helmetSword.js).

Bedrock's displayed attack-damage number comes from an item's own static
minecraft:damage component — there's no way to make that number update live
from script. So instead of applying the bonus invisibly, each base sword
material gets three extra "shadow" variants, one per possible bonus tier
(+1/+2/+3), each carrying real components for damage/durability/enchant slot
matching its base material but with the bonus baked into minecraft:damage.
The runtime scripts swap the mainhand item to whichever variant currently
matches the player's offhand/helmet contents, cloning durability-used and
enchantments across the swap so nothing is lost — see reconcile() in each
script for exactly when that swap happens.

These variants are never meant to be picked up directly (menu_category
"none" keeps them out of the creative inventory) — they only ever exist
because a script put them there.
"""
import json, os

NAMESPACE = "minepiece"
BASE = "/home/user/bedrock-samples/minepiece"
BP_ITEMS = f"{BASE}/behavior_pack/items"
RP_TEXTS = f"{BASE}/resource_pack/texts"

# vanilla material id -> (damage digit i.e. total attack minus the innate fist point, real
# durability, display name, icon texture key already registered in tools/gen_items.py). Copper's
# durability is an estimate (positioned between stone and iron, matching its "+1" tier grouping
# with wood/stone/gold/iron) since the true value isn't available from any file in this repo —
# flagged here for the user to correct if it's off.
MATERIALS = {
    "minecraft:wooden_sword":    {"damage": 3, "durability": 59,   "name": "Wooden Sword",    "icon": "vanilla_wood_sword"},
    "minecraft:copper_sword":    {"damage": 3, "durability": 131,  "name": "Copper Sword",    "icon": "vanilla_copper_sword"},  # estimated durability
    "minecraft:stone_sword":     {"damage": 3, "durability": 131,  "name": "Stone Sword",     "icon": "vanilla_stone_sword"},
    "minecraft:golden_sword":    {"damage": 3, "durability": 32,   "name": "Golden Sword",    "icon": "vanilla_gold_sword"},
    "minecraft:iron_sword":      {"damage": 3, "durability": 250,  "name": "Iron Sword",      "icon": "vanilla_iron_sword"},
    "minecraft:diamond_sword":   {"damage": 6, "durability": 1561, "name": "Diamond Sword",   "icon": "vanilla_diamond_sword"},
    "minecraft:netherite_sword": {"damage": 7, "durability": 2031, "name": "Netherite Sword", "icon": "vanilla_netherite_sword"},
}

BONUS_TIERS = [1, 2, 3]


def write_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


lang_lines = []
count = 0

for material_id, info in MATERIALS.items():
    short = material_id.split(":")[1]
    for bonus in BONUS_TIERS:
        variant_id = f"{NAMESPACE}:{short}_plus{bonus}"
        write_json(
            f"{BP_ITEMS}/{short}_plus{bonus}.json",
            {
                "format_version": "1.21.80",
                "minecraft:item": {
                    "description": {
                        "identifier": variant_id,
                        "menu_category": {"category": "none"},
                    },
                    "components": {
                        "minecraft:display_name": {"value": f"item.{variant_id}.name"},
                        "minecraft:icon": {"textures": {"default": info["icon"]}},
                        "minecraft:max_stack_size": 1,
                        "minecraft:hand_equipped": True,
                        "minecraft:allow_off_hand": False,
                        "minecraft:damage": info["damage"] + bonus,
                        "minecraft:durability": {"max_durability": info["durability"]},
                        "minecraft:enchantable": {"slot": "sword", "value": 15},
                        "minecraft:tags": {"tags": ["minecraft:is_sword"]},
                    },
                },
            },
        )
        lang_lines.append(f"item.{variant_id}.name={info['name']} (+{bonus})")
        count += 1

with open(f"{RP_TEXTS}/en_US.lang", "a") as f:
    f.write("\n".join(lang_lines) + "\n")

print(f"Wrote {count} boosted sword variants.")
