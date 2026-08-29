# Rewrites resource_pack/texts/en_US.lang from scratch — run this BEFORE tools/gen_sword_boosts.py,
# which appends its own lines to that same file rather than owning the whole thing.
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
    "snow", "potion", "goat", "shulker", "bat", "pillager",
]

# Ability items use simple, honest placeholders: a pixelated "1"/"2"/"3" (by that ability's
# position in its fruit's list) — see gen_number_icons.py.
NUMBER_ICON = {
    1: "textures/items/number_1",
    2: "textures/items/number_2",
    3: "textures/items/number_3",
}

# id, displayName, abilities: [(abilityKey, displayName)]
FRUITS = [
    ("sculk", "Sculk-Sculk Fruit", [
        ("sculk_spikes", "Sculk Spikes"),
        ("sculk_sense", "Sculk Sense"),
        ("sculk_explosion", "Sculk Explosion"),
    ]),
    ("lava", "Lava-Lava Fruit", [
        ("lava_fist", "Lava Fist"),
        ("lava_pool", "Lava Pool"),
        ("lava_meteor", "Lava Meteor"),
    ]),
    ("water", "Water-Water Fruit", [
        ("water_jet", "Water Jet"),
        ("water_prison", "Water Prison"),
        ("tidal_crash", "Tidal Crash"),
    ]),
    ("arrow", "Arrow-Arrow Fruit", [
        ("arrow_shot", "Arrow Shot"),
        ("arrow_barrage", "Arrow Barrage"),
        ("arrow_rain", "Arrow Rain"),
    ]),
    ("anvil", "Anvil-Anvil Fruit", [
        ("anvil_drop", "Anvil Drop"),
        ("anvil_toss", "Anvil Toss"),
        ("anvil_slam", "Anvil Slam"),
    ]),
    ("core", "Core-Core Fruit", [
        ("wind_burst", "Wind Burst"),
        ("heavy_punch", "Heavy Punch"),
        ("land_crash", "Land Crash"),
    ]),
    ("slime", "Slime-Slime Fruit", [
        ("slime_shot", "Slime Shot"),
        ("slime_bounce", "Slime Bounce"),
        ("slime_trap", "Slime Trap"),
    ]),
    ("copper", "Copper-Copper Fruit", [
        ("oxidize", "Oxidize"),
        ("copper_lightning_strike", "Lightning Strike"),
        ("copper_overload", "Copper Overload"),
    ]),
    ("beacon", "Beacon-Beacon Fruit", [
        ("flashbang", "Flashbang"),
        ("beacon_beam", "Beacon Beam"),
        ("beacon_boost", "Beacon Boost"),
    ]),
    ("trident", "Trident-Trident Fruit", [
        ("trident_throw", "Trident Throw"),
        ("trident_lightning_strike", "Lightning Strike"),
        ("whirlpool", "Whirlpool"),
    ]),
    ("snow", "Snow-Snowball Fruit", [
        ("snowball_shot", "Snowball Shot"),
        ("snowstorm", "Snowstorm"),
        ("blizzard", "Blizzard"),
    ]),
    ("potion", "Potion-Potion Fruit", [
        ("health_potion", "Health Potion"),
        ("extra_jump_potion", "Extra Jump Potion"),
        ("bloodlust_potion", "Bloodlust Potion"),
    ]),
    ("goat", "Goat Horn-Goat Horn Fruit", [
        ("horn_blast", "Horn Blast"),
        ("horn_punch", "Horn Punch"),
        ("war_horn", "War Horn"),
    ]),
    ("shulker", "Shulker-Shulker Fruit", [
        ("shulker_shot", "Shulker Shot"),
        ("ender_pearl_toss", "Ender Pearl"),
        ("levitate", "Levitate"),
    ]),
    ("bat", "Bat-Bat Fruit", [
        ("bat_storm", "Bat Storm"),
        ("vampire_bite", "Vampire Bite"),
        ("night_vision", "Night Vision"),
    ]),
    ("pillager", "Pillager-Pillager Fruit", [
        ("evoker_spell", "Evoker Spell"),
        ("pillager_rob", "Pillager Rob"),
        ("ravager_ride", "Ravager Ride"),
    ]),
]

# ability_key -> item cooldown duration override, in seconds. Anything not listed here defaults
# to 10. Night Vision is explicitly the mod's one no-cooldown ability.
ABILITY_COOLDOWN_OVERRIDES = {
    "night_vision": 0,
}

# Hand-written items (weapons, enchant books, offhand/helmet sword variants) keep their own JSON
# files — their components don't fit the generic fruit/ability shells above — but still need a
# texture_data entry and a lang line, and this script is the single place both get regenerated
# from, so every hand-written item registers itself here instead of editing item_texture.json or
# en_US.lang directly.
# (texture_key, texture_path, display_name)
EXTRA_ITEMS = [
    ("legendary_sword", "textures/items/legendary_sword", "Legendary Sword"),
    ("legendary_saber", "textures/items/legendary_saber", "Legendary Saber"),
]

# Reused vanilla textures (copied into this pack rather than referenced by vanilla's own texture_data
# key, which isn't guaranteed to exist under a matching name) that back items generated elsewhere
# (tools/gen_sword_boosts.py, the enchant books above) instead of a fruit/ability/weapon here — texture
# only, no matching item of this exact id exists, so no lang line.
EXTRA_TEXTURES_ONLY = [
    ("book_enchanted", "textures/items/vanilla_book_enchanted"),
    ("vanilla_wood_sword", "textures/items/vanilla_wood_sword"),
    ("vanilla_copper_sword", "textures/items/vanilla_copper_sword"),
    ("vanilla_stone_sword", "textures/items/vanilla_stone_sword"),
    ("vanilla_gold_sword", "textures/items/vanilla_gold_sword"),
    ("vanilla_iron_sword", "textures/items/vanilla_iron_sword"),
    ("vanilla_diamond_sword", "textures/items/vanilla_diamond_sword"),
    ("vanilla_netherite_sword", "textures/items/vanilla_netherite_sword"),
]

# Hand-written items whose icon reuses a texture that's already registered elsewhere (vanilla's
# own "book_enchanted", or one of the EXTRA_ITEMS/fruit icons above) — these only need a lang
# line, not a new texture_data entry.
# (item_id_suffix, display_name)
EXTRA_LANG_ONLY_ITEMS = [
    ("book_critical_knockback", "Critical Knockback Book"),
    ("book_big_game_hunter_1", "Big Game Hunter I Book"),
    ("book_big_game_hunter_2", "Big Game Hunter II Book"),
    ("book_vampire_blood", "Vampire Blood Book"),
    ("book_strongest_swordsman", "Strongest Swordsman Book"),
]

texture_data = {}
lang_lines = []

for texture_key, texture_path, _display_name in EXTRA_ITEMS:
    texture_data[texture_key] = {"textures": texture_path}
for texture_key, _texture_path, display_name in EXTRA_ITEMS:
    lang_lines.append(f"item.{NAMESPACE}:{texture_key}.name={display_name}")
for texture_key, texture_path in EXTRA_TEXTURES_ONLY:
    texture_data[texture_key] = {"textures": texture_path}
for item_id_suffix, display_name in EXTRA_LANG_ONLY_ITEMS:
    lang_lines.append(f"item.{NAMESPACE}:{item_id_suffix}.name={display_name}")


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

for fruit_id, display_name, abilities in FRUITS:
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

        # Night Vision (Bat-Bat) is the one ability in the whole mod with no cooldown — a bare
        # infinite toggle, so its item's own cooldown swirl must match (0 duration = no visible
        # cooldown), matching the ability's own cooldownSeconds: 0 in behavior_pack/scripts/fruits/bat.js.
        cooldown_duration = ABILITY_COOLDOWN_OVERRIDES.get(ability_key, 10)

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
                    "minecraft:cooldown": {"category": ability_identifier, "duration": cooldown_duration, "type": "use"},
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

print(f"Wrote {len(FRUITS)} fruit items, {sum(len(a) for _, _, a in FRUITS)} ability items, "
      f"{len(texture_data)} texture entries, {len(lang_lines)} lang lines.")
