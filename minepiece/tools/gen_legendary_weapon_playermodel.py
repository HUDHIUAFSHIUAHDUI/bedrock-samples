"""
Wires the Legendary Sword/Saber 3D model into the player entity. The geometry
(resource_pack/models/entity/sword.geo.json / saber.geo.json) is still the exact, byte-for-byte
copy from the source addon — untouched, including the pivot/rotation that decides where it sits
in hand, per instruction not to change that. Two things beyond the original addon's own wiring:

1. Texture: tools/gen_legendary_weapon_texture.py's properly-sized, per-cube-colored art
   (legendary_sword_design.png / legendary_saber_design.png) instead of the source's own
   cc_sword.png/cc_saber.png, which are a 16x5 / 16x7 fragment nowhere near the geometry's real
   58x19 / 30x14 UV size and stretched flat across it, in-game — that mismatch (not any fault of
   the geometry itself) is why the saber in particular read as a nearly featureless black slab.
2. A swing animation. The source addon never had one — animation.sword.hold only spins two bones
   ("inner_rotor"/"rotator") that don't exist anywhere in this geometry, so the blade would always
   render frozen in its rest pose even mid-attack. Added a new animation.legendary_weapons.attack
   driven by the same variable.attack_time vanilla's own animation.player.attack.rotations already
   uses, so the swing is in sync with the real attack timing rather than inventing its own —
   applied to the "tool" bone (as an offset on top of its existing static pose, not a replacement
   of it) rather than "rightarm": this geometry's root/waist/body/rightarm/tool chain shares those
   *names* with the player's own real body bones purely because it's copied from an old rig built
   the same way, but they're two separate bone trees. Bedrock resolves an "animate" rotation by
   bone name across every currently-visible geometry, so targeting "rightarm" here would have also
   re-applied to the player's own actual arm — already being swung by vanilla's own animation —
   doubling that rotation for every player, every attack, with any item in hand. "tool" only
   exists in this geometry, so it can't collide with anything.

The only thing that can't be a verbatim copy of the ORIGINAL wiring: the trigger condition, since
the source checked for its own item's name ("sword"/"saber") and ours has to check for
minepiece:legendary_sword/legendary_saber instead to fire at all.

Edits resource_pack/entity/player.entity.json starting from an unmodified copy of current
vanilla's own file (not the outdated copy bundled in the source addon) and only adds new keys —
every existing vanilla field is left untouched, confirmed by diffing against vanilla after.
"""
import json

BASE = "/home/user/bedrock-samples/minepiece"
RP = f"{BASE}/resource_pack"
VANILLA_RP = "/home/user/bedrock-samples/resource_pack"

WEAPONS = {
    "sword": {
        "item_short_name": "legendary_sword",
        "geometry_id": "geometry.sword",
        "texture_path": "textures/entity/legendary_sword_design",
        "render_controller": "controller.render.sword",
        "animation_hold": "animation.sword.hold",
        "animation_first_person": "animation.sword.first_person.hold",
    },
    "saber": {
        "item_short_name": "legendary_saber",
        "geometry_id": "geometry.saber",
        "texture_path": "textures/entity/legendary_saber_design",
        "render_controller": "controller.render.saber",
        "animation_hold": "animation.saber.hold",
        "animation_first_person": "animation.saber.first_person.hold",
    },
}

# Driven by the same variable.attack_time vanilla's own animation.player.attack.rotations uses
# (resource_pack/animations/player.animation.json), so timing matches the real attack swing, but
# applied to "tool" — this geometry's own unique bone — as an additive offset on its existing
# pose, not vanilla's exact formula/bone (see the module docstring for why "rightarm" is unsafe
# to touch here).
SWING_ROTATION_Z = "math.sin((1 - math.pow((1 - variable.attack_time), 4)) * 180) * 35.0"


def write_attack_animation():
    doc = {
        "format_version": "1.8.0",
        "animations": {
            "animation.legendary_weapons.attack": {
                "loop": True,
                "bones": {"tool": {"rotation": [0.0, 0.0, SWING_ROTATION_Z]}},
            }
        },
    }
    path = f"{RP}/animations/legendary_weapons_attack.animation.json"
    with open(path, "w") as f:
        json.dump(doc, f, indent=2)
        f.write("\n")
    print(f"wrote {path}")


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

    desc["animations"]["legendary_weapons_attack"] = "animation.legendary_weapons.attack"

    # Match the original addon's exact animate-list ordering and shape, plus the new swing
    # animation (applies to both geometries' shared "rightarm" bone name, gated on either being
    # visible so it's a no-op — and free — the rest of the time).
    desc["scripts"]["animate"].append({"saber_first_person": "variable.saber && variable.is_first_person"})
    desc["scripts"]["animate"].append({"saber": "variable.saber"})
    desc["scripts"]["animate"].append({"sword_first_person": "variable.sword && variable.is_first_person"})
    desc["scripts"]["animate"].append({"sword": "variable.sword"})
    desc["scripts"]["animate"].append({"legendary_weapons_attack": "variable.sword || variable.saber"})

    with open(dst, "w") as f:
        json.dump(doc, f, indent=2)
        f.write("\n")
    print(f"wrote {dst}")


write_attack_animation()
patch_player_entity()
