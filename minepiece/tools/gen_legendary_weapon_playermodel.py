"""
Wires the Legendary Sword/Saber 3D model into the player entity, using the exact geometry,
render controller, and animation files copied byte-for-byte from the source addon (see
resource_pack/models/entity/sword.geo.json, saber.geo.json; render_controllers/cc_sword.json,
cc_saber.json; animations/cc_sword.json, cc_saber.json; textures/craftycraft/items/cc_sword.png,
cc_saber.png — none of those are touched by this script, they're a straight copy, not generated).

The only thing that can't be a verbatim copy: the original checked
`query.get_equipped_item_name('main_hand') == 'sword'` because the source addon's own item was
literally named "cc:sword" (short name "sword"). Our item is "minepiece:legendary_sword" (short
name "legendary_sword"), so the trigger string has to match our actual item instead — everything
else (which bones move, which geometry/texture/render controller get used) is exactly theirs.

This edits resource_pack/entity/player.entity.json starting from an unmodified copy of current
vanilla's own file (not the outdated copy bundled in the source addon) and only adds new keys —
every existing vanilla field is left untouched, confirmed by diffing against vanilla after.
"""
import json

BASE = "/home/user/bedrock-samples/minepiece"
RP = f"{BASE}/resource_pack"
VANILLA_RP = "/home/user/bedrock-samples/resource_pack"

# weapon_id -> (short item name to match, geometry key/id, texture path, render controller id,
#               third-person animation id, first-person animation id)
WEAPONS = {
    "sword": {
        "item_short_name": "legendary_sword",
        "geometry_id": "geometry.sword",
        "texture_path": "textures/craftycraft/items/cc_sword",
        "render_controller": "controller.render.sword",
        "animation_hold": "animation.sword.hold",
        "animation_first_person": "animation.sword.first_person.hold",
    },
    "saber": {
        "item_short_name": "legendary_saber",
        "geometry_id": "geometry.saber",
        "texture_path": "textures/craftycraft/items/cc_saber",
        "render_controller": "controller.render.saber",
        "animation_hold": "animation.saber.hold",
        "animation_first_person": "animation.saber.first_person.hold",
    },
}


def patch_player_entity():
    src = f"{VANILLA_RP}/entity/player.entity.json"
    dst = f"{RP}/entity/player.entity.json"
    doc = json.load(open(src))
    desc = doc["minecraft:client_entity"]["description"]

    for key, w in WEAPONS.items():
        desc["geometry"][key] = w["geometry_id"]
        desc["textures"][key] = w["texture_path"]
        desc["animations"][key] = w["animation_hold"]
        desc["animations"][f"{key}_first_person"] = w["animation_first_person"]
        desc["render_controllers"].append({w["render_controller"]: f"variable.{key}"})
        desc["scripts"]["pre_animation"].append(
            f"variable.{key} = query.get_equipped_item_name('main_hand') == '{w['item_short_name']}';"
        )

    # Match the original addon's exact animate-list ordering and shape.
    desc["scripts"]["animate"].append({"saber_first_person": "variable.saber && variable.is_first_person"})
    desc["scripts"]["animate"].append({"saber": "variable.saber"})
    desc["scripts"]["animate"].append({"sword_first_person": "variable.sword && variable.is_first_person"})
    desc["scripts"]["animate"].append({"sword": "variable.sword"})

    with open(dst, "w") as f:
        json.dump(doc, f, indent=2)
        f.write("\n")
    print(f"wrote {dst}")


patch_player_entity()
