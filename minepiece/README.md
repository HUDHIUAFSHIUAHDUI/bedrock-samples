# Minepiece

A Minecraft **Bedrock Edition** add-on: a One Piece-inspired Devil Fruit ability
system built entirely on the `@minecraft/server` Script API.

This folder is self-contained and does not touch the vanilla `behavior_pack/` /
`resource_pack/` folders elsewhere in this repository — those are Mojang's
vanilla reference packs and are used only as a reference while building this.

## Install

1. Copy `minepiece/behavior_pack` into `com.mojang/development_behavior_packs/Minepiece BP`.
2. Copy `minepiece/resource_pack` into `com.mojang/development_resource_packs/Minepiece RP`.
3. Enable both packs on a world, and turn on the **Beta APIs** experimental toggle
   (required for `@minecraft/server` scripting).
4. Give yourself a fruit with `/give @s minepiece:fruit_warden` (swap the id for
   any fruit below) and eat it.

## If nothing seems to happen

Every place scripts run — starting up, using an ability, eating a fruit,
transforming — is wrapped so a failure reports itself instead of just doing
nothing: watch chat for a red `[Minepiece] ... failed: ...` message, and
check the content log (`console.error` output) for the same. If eating a
fruit or using an ability produces *no* message at all, not even an error,
the scripts aren't running — almost always because the **Beta APIs**
experimental toggle (step 3 above) isn't on for that world. It generally has
to be enabled when the world is created; toggling it later on an existing
world may not take effect. If you do see a red error message, that's the
real bug — send it over and it's fixable directly instead of guessing.

## Fruit art

Every fruit's item icon, its abilities' icons, and its Zoan transform icon
(where it has one) are all real crops taken directly from a supplied 3D head
model pack ("CraftyCraft") — specifically from each fruit's own head *skin
texture*, using the same UV unfold Minecraft itself uses to turn a cube into
a flat texture sheet. `scratchpad`-side script `derive_icons.py` reads each
head's `.geo.json` to find its cube's real UV rectangle, so it crops the
literal front/top/side faces of that 3D model, not a hand-picked guess. One
fruit's whole item set (fruit + abilities + transform) is therefore always a
set of *different views of the same head*, not unrelated art.

Each fruit item is **eatable, placeable, and (once placed) a real 3D
model**:
- Eating it (hold to consume, same as any vanilla food) grants that Devil
  Fruit's power — unchanged from before.
- Looking at a block and using the item instead **places it** as a small
  decorative head block (`behavior_pack/blocks/head_<id>.json`), rendered
  with the actual 3D geometry + full skin texture from the same head pack
  (`resource_pack/models/blocks/`, `resource_pack/textures/blocks/`) —
  not a flat icon. The geometry's coordinates are re-based from "worn on a
  player's head bone" space into "sitting on the floor of one block" space
  (see the comment atop `rebase_head_geometry.py`) so it doesn't render
  floating above the block.
- There's no supported way in the current data-driven item format to make
  the *held/dropped* item itself render as a 3D model the way vanilla's
  hardcoded trident/shield do (no `minecraft:geometry` item component
  exists) — only the wearable/armor attachable system gets real 3D
  rendering, and combining that with `minecraft:food` risks breaking
  eating outright, so it isn't used here. In hand, the fruit shows its
  derived 2D icon; the real 3D model appears once it's placed.

The three Zoan transformation forms (Warden, Ender Dragon, Ghast) are a
separate thing from the fruit heads above — they reuse the **real vanilla
mob models and textures** for the player's transformed body, since that
should look like the actual animal/mob, not a stylized head.

## Fruit list

| Fruit | Type | Abilities (10s cooldown each) | Transform | Passive |
|---|---|---|---|---|
| Warden-Warden | Zoan | Sonic Boom, Blinding Punch | → Warden (1/3 HP) | Super Hearing (chat alert on nearby entities) |
| Dragon-Dragon | Zoan | Dragon Breath, Dragon Roar | → Ender Dragon (flight only, no attack) | Health Boost (2x max HP) |
| Ghast-Ghast | Zoan | Ghast Fireball, Ghast Barrage | → Ghast (2x HP) | Permanent Fire Resistance |
| Sculk-Sculk | Logia | Sculk Spikes, Sculk Sense, Sculk Explosion | — | Sculk Catalyst on hostile kill |
| Lava-Lava | Logia | Lava Fist, Lava Pool, Lava Meteor | — | Magma-walker (frost walker, but magma) |
| Water-Water | Logia | Water Jet, Water Prison, Tidal Crash | — | Immune to water damage + Dolphin's Grace in water |
| Arrow-Arrow | Logia | Arrow Shot, Arrow Barrage, Arrow Rain | — | Arrow Instinct (auto-fires an arrow when hurt) |
| Anvil-Anvil | Paramecia | Anvil Drop, Anvil Toss, Anvil Slam | — | Heavy (infinite knockback resistance) |
| Core-Core | Paramecia | Wind Burst, Heavy Punch, Land Crash | — | Hometown Link (permanent Bad Omen + Wind Charged) |
| Slime-Slime | Paramecia | Slime Shot, Slime Bounce, Slime Trap | — | Slime Feet (no fall damage) |
| Copper-Copper | Paramecia | Oxidize, Lightning Strike, Copper Overload | — | Derusting (held weapon durability always full) |
| Beacon-Beacon | Paramecia | Flashbang, Beacon Beam, Beacon Boost | — | Light Producer (always emits light) |
| Trident-Trident | Paramecia | Trident Throw, Lightning Strike, Whirlpool | — | Immune to water damage + bonus damage to aquatic mobs |

**Logia** users only take damage from weapon-based sources (melee/projectile
attacks); everything else (fall, fire, drowning, explosions, etc.) is
cancelled while their fruit is active. **All fruit users take periodic damage
while standing in water**, unless the table above says otherwise (their
signature Devil Fruit weakness) — Water-Water and Trident-Trident are the two
explicit exceptions.

## Architecture (for adding a 14th fruit later)

Everything gameplay-related lives in `behavior_pack/scripts/`:

```
scripts/
  main.js                 entry point — imports core systems + every fruit module
  core/
    constants.js           shared ids, namespaces, tick rates
    playerState.js          dynamic-property helpers (which fruit, transformed?, toggle states)
    cooldowns.js            generic 10s-cooldown system (dynamic property + vanilla item cooldown UI)
    targeting.js            reusable raycast / area-of-effect / forward-direction helpers
    vfx.js                  small wrappers around spawnParticle / playSound
    fruitRegistry.js        the data-driven table every fruit module registers itself into
    abilityEngine.js        listens for itemUse, resolves it to a fruit+ability, runs it
    passiveEngine.js        runs each fruit's passive on a fixed interval + exposes event hooks
    transformEngine.js      generic Zoan transform toggle (mount/dismount, invisibility, attack-lock)
    damageRules.js          Logia weapon-only-damage filter (world.beforeEvents.entityHurt)
    waterDamage.js          periodic Devil Fruit water-weakness tick
  fruits/
    warden.js, dragon.js, ghast.js, sculk.js, lava.js, water.js, arrow.js,
    anvil.js, core_core.js, slime.js, copper.js, beacon.js, trident.js
```

A fruit module is a single plain object describing itself (id, category,
item ids, ability list with `execute(player, ability)` functions, an optional
`passive` object, and an optional `transform` object for Zoan fruits) that it
hands to `registerFruit()`. None of the engine files know anything about any
specific fruit — they only read the shape of `FruitDefinition`. Adding a new
fruit means: add one `fruits/<id>.js` file, register its items in
`behavior_pack/items/`, and import it once in `main.js`. No engine code
changes.

## How abilities are triggered

Each ability (and each Zoan transform) is its own inventory item ("emblem")
that is granted automatically once a player eats that fruit, and is silently
re-granted if it's ever missing from their inventory (so it can't be
permanently lost by dropping it). Using the item (right-click / trigger)
fires the matching ability. Cooldowns show as the normal Bedrock item-cooldown
swirl animation, backed by an authoritative server-side timer so it can't be
bypassed by switching item stacks.

## Known limitations / assumptions

- **Zoan transformation** is implemented as: hide the player (Invisibility
  effect) and mount them, as the rider, on a purpose-built `minepiece:form_*`
  entity that has no AI and is steered entirely by the riding player's input —
  the same mechanism vanilla uses for riding a horse or boat. The Dragon and
  Warden/Ghast forms reuse the real vanilla model/texture/geometry for their
  entity so they look correct without any new art. This is a well-established
  Bedrock add-on pattern, but it means the "form" is a separate ridden entity
  rather than the Player entity itself literally changing type (the Script API
  has no way to change a `Player`'s entity type).
- Flight for the Dragon and Ghast forms uses the exact same component recipe
  as the vanilla Happy Ghast mount (`minecraft:can_fly` + zero-gravity
  physics + `minecraft:rideable` + `minecraft:free_camera_controlled` +
  `minecraft:behavior.player_ride_tamed`), copied straight from
  `resource_pack/../behavior_pack/entities/happy_ghast.json` in this same
  repo — it's how Bedrock's own flying mount works, not a guess.
- The three form entities reuse the real vanilla Warden/Ender Dragon/Ghast
  **geometry, texture, and material**, but not their full animation rigs —
  those are driven by long, model-specific Molang scripts (idle bob, wing
  flap, vibration response, etc.) tied to bone names this add-on doesn't
  inspect. So each form renders correctly and recognizably, just in a
  simplified, mostly-static pose rather than fully animated. Wiring up the
  real animation controllers is a good next step once the placeholder pass
  is done.
- Particle and sound effects use existing **vanilla** particle/sound
  identifiers (e.g. `minecraft:sonic_explosion`, `mob.warden.sonic_boom`)
  rather than new custom particle files, in keeping with the "placeholder
  now, polish later" brief — they're already thematically matched per
  ability, so this may be all you ever need.
