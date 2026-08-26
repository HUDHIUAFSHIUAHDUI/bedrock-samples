import json, os

NAMESPACE = "minepiece"
BP_ITEMS = "/home/user/bedrock-samples/minepiece/behavior_pack/items"
RP_TEXTURES = "/home/user/bedrock-samples/minepiece/resource_pack/textures"
RP_TEXTS = "/home/user/bedrock-samples/minepiece/resource_pack/texts"

os.makedirs(BP_ITEMS, exist_ok=True)
os.makedirs(RP_TEXTURES, exist_ok=True)
os.makedirs(RP_TEXTS, exist_ok=True)

FRUIT_IDS = [
    "sculk", "lava", "water", "arrow",
    "anvil", "core", "slime", "copper", "beacon", "trident",
]

# Ability/transform items use simple, honest placeholders: a pixelated "1"/"2"/"3" (by that
# ability's position in its fruit's list) or "T" for a transform — see gen_number_icons.py.
NUMBER_ICON = {
    1: "textures/items/number_1",
    2: "textures/items/number_2",
    3: "textures/items/number_3",
    "transform": "textures/items/number_transform",
}

# id, displayName, category, abilities: [(abilityKey, displayName)], transform: bool
FRUITS = [
    ("sculk", "Sculk-Sculk Fruit", "logia", [
        ("sculk_spikes", "Sculk Spikes"),
        ("sculk_sense", "Sculk Sense"),
        ("sculk_explosion", "Sculk Explosion"),
    ], False),
    ("lava", "Lava-Lava Fruit", "logia", [
        ("lava_fist", "Lava Fist"),
        ("lava_pool", "Lava Pool"),
        ("lava_meteor", "Lava Meteor"),
    ], False),
    ("water", "Water-Water Fruit", "logia", [
        ("water_jet", "Water Jet"),
        ("water_prison", "Water Prison"),
        ("tidal_crash", "Tidal Crash"),
    ], False),
    ("arrow", "Arrow-Arrow Fruit", "logia", [
        ("arrow_shot", "Arrow Shot"),
        ("arrow_barrage", "Arrow Barrage"),
        ("arrow_rain", "Arrow Rain"),
    ], False),
    ("anvil", "Anvil-Anvil Fruit", "paramecia", [
        ("anvil_drop", "Anvil Drop"),
        ("anvil_toss", "Anvil Toss"),
        ("anvil_slam", "Anvil Slam"),
    ], False),
    ("core", "Core-Core Fruit", "paramecia", [
        ("wind_burst", "Wind Burst"),
        ("heavy_punch", "Heavy Punch"),
        ("land_crash", "Land Crash"),
    ], False),
    ("slime", "Slime-Slime Fruit", "paramecia", [
        ("slime_shot", "Slime Shot"),
        ("slime_bounce", "Slime Bounce"),
        ("slime_trap", "Slime Trap"),
    ], False),
    ("copper", "Copper-Copper Fruit", "paramecia", [
        ("oxidize", "Oxidize"),
        ("copper_lightning_strike", "Lightning Strike"),
        ("copper_overload", "Copper Overload"),
    ], False),
    ("beacon", "Beacon-Beacon Fruit", "paramecia", [
        ("flashbang", "Flashbang"),
        ("beacon_beam", "Beacon Beam"),
        ("beacon_boost", "Beacon Boost"),
    ], False),
    ("trident", "Trident-Trident Fruit", "paramecia", [
        ("trident_throw", "Trident Throw"),
        ("trident_lightning_strike", "Lightning Strike"),
        ("whirlpool", "Whirlpool"),
    ], False),
]

texture_data = {}
lang_lines = []


def write_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def item_shell(identifier, components):
    return {
        "format_version": "1.21.80",
        "minecraft:item": {
            "description": {
                "identifier": identifier,
                "menu_category": {"category": "items", "group": "minepiece:minepiece"},
            },
            "components": components,
        },
    }


for number, path in NUMBER_ICON.items():
    texture_data[f"number_{number}"] = {"textures": path}

for fruit_id, display_name, category, abilities, has_transform in FRUITS:
    fruit_identifier = f"{NAMESPACE}:fruit_{fruit_id}"
    lang_lines.append(f"item.{fruit_identifier}.name={display_name}")

    write_json(
        os.path.join(BP_ITEMS, f"fruit_{fruit_id}.json"),
        item_shell(
            fruit_identifier,
            {
                "minecraft:display_name": {"value": f"item.{fruit_identifier}.name"},
                # No minecraft:icon here on purpose — exactly like a vanilla mob head, omitting it
                # makes block_placer render the placed block's own 3D geometry as the item's
                # inventory/hand appearance instead of a flat icon (see block_placer's schema note).
                "minecraft:max_stack_size": 1,
                "minecraft:food": {"nutrition": 4, "saturation_modifier": 0.3, "can_always_eat": True},
                "minecraft:use_animation": {"value": "eat"},
                "minecraft:use_modifiers": {"use_duration": 1.6, "movement_modifier": 0.35},
                "minecraft:tags": {"tags": ["minecraft:is_food"]},
                # Looking at a block face places the decorative 3D head (behavior_pack/blocks/head_<id>.json);
                # looking at open air/water falls back to the food "use" behavior (eating it) above.
                "minecraft:block_placer": {"block": f"{NAMESPACE}:head_{fruit_id}"},
            },
        ),
    )

    for ability_index, (ability_key, ability_name) in enumerate(abilities, start=1):
        ability_identifier = f"{NAMESPACE}:ability_{ability_key}"
        lang_lines.append(f"item.{ability_identifier}.name={ability_name}")

        write_json(
            os.path.join(BP_ITEMS, f"ability_{ability_key}.json"),
            item_shell(
                ability_identifier,
                {
                    "minecraft:display_name": {"value": f"item.{ability_identifier}.name"},
                    "minecraft:icon": {"textures": {"default": f"number_{ability_index}"}},
                    "minecraft:max_stack_size": 1,
                    # No hand_equipped: abilities are techniques, not weapons/tools — held with the
                    # plain small item pose instead of the big two-handed tool-hold animation.
                    "minecraft:cooldown": {"category": ability_identifier, "duration": 10, "type": "use"},
                },
            ),
        )

    if has_transform:
        transform_identifier = f"{NAMESPACE}:transform_{fruit_id}"
        transform_name = f"Transform: {display_name.split('-')[0]}"
        lang_lines.append(f"item.{transform_identifier}.name={transform_name}")

        write_json(
            os.path.join(BP_ITEMS, f"transform_{fruit_id}.json"),
            item_shell(
                transform_identifier,
                {
                    "minecraft:display_name": {"value": f"item.{transform_identifier}.name"},
                    "minecraft:icon": {"textures": {"default": "number_transform"}},
                    "minecraft:max_stack_size": 1,
                    # Not a real 10s ability cooldown (transforms are exempt) — just a tiny debounce
                    # so one physical click can't fire the toggle twice.
                    "minecraft:cooldown": {"category": transform_identifier, "duration": 0.5, "type": "use"},
                },
            ),
        )

# --- resource_pack/textures/item_texture.json ---
item_texture_json = {
    "resource_pack_name": "minepiece",
    "texture_name": "atlas.items",
    "texture_data": texture_data,
}
write_json(os.path.join(RP_TEXTURES, "item_texture.json"), item_texture_json)

# --- lang file ---
with open(os.path.join(RP_TEXTS, "en_US.lang"), "w") as f:
    f.write("\n".join(lang_lines) + "\n")

with open(os.path.join(RP_TEXTS, "languages.json"), "w") as f:
    json.dump(["en_US"], f, indent=2)

print(f"Wrote {len(FRUITS)} fruit items, {sum(len(a) for _,_,_,a,_ in FRUITS)} ability items, "
      f"{sum(1 for *_, t in FRUITS if t)} transform items, "
      f"{len(texture_data)} texture entries, {len(lang_lines)} lang lines.")
