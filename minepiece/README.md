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
4. Give yourself a fruit with `/give @s minepiece:fruit_sculk` (swap the id for
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

Every fruit item **is its actual 3D head model** — in the inventory, in
hand, on the ground, and placed — using the exact same trick every vanilla
mob head item (zombie head, skeleton skull, etc.) uses: the item has a
`minecraft:block_placer` component and *no* `minecraft:icon` override, so
the game falls back to rendering the placed block's own geometry as the
item's appearance everywhere. The block it places
(`behavior_pack/blocks/head_<id>.json`) uses the real 3D geometry + full
skin texture pulled straight from the supplied "CraftyCraft" head pack
(`resource_pack/models/blocks/`, `resource_pack/textures/blocks/`) — not a
flat icon standing in for it. That geometry's coordinates needed re-basing
from "worn on a player's head bone" space into "sitting on the floor of one
block" space first (see the comment atop `tools/rebase_head_geometry.py`),
since the source pack built these heads to be worn, not placed.

Each fruit item is both of these at once, same as a vanilla mob head:
- **Eat it** (hold to consume, same as any vanilla food) to gain that Devil
  Fruit's power.
- **Place it** (use the item while looking at a block face) as a small
  decorative head.

Ability items don't have a block to fall back on, so they're still flat
icons — currently a plain pixelated "1"/"2"/"3" (that ability's position in
its fruit's list) (`tools/gen_number_icons.py`), deliberately simple rather
than trying to guess real art for them.

## Fruit list

| Fruit | Type | Abilities (10s cooldown each) | Passive |
|---|---|---|---|
| Sculk-Sculk | Logia | Sculk Spikes, Sculk Sense, Sculk Explosion | Sculk Catalyst on hostile kill |
| Lava-Lava | Logia | Lava Fist, Lava Pool, Lava Meteor | Magma-walker (frost walker, but magma) |
| Water-Water | Logia | Water Jet, Water Prison, Tidal Crash | Immune to water damage + Dolphin's Grace in water |
| Arrow-Arrow | Logia | Arrow Shot, Arrow Barrage, Arrow Rain | Arrow Instinct (auto-fires an arrow when hurt) |
| Anvil-Anvil | Paramecia | Anvil Drop, Anvil Toss, Anvil Slam | Heavy (infinite knockback resistance) |
| Core-Core | Paramecia | Wind Burst, Heavy Punch, Land Crash | Hometown Link (permanent Bad Omen + Wind Charged) |
| Slime-Slime | Paramecia | Slime Shot, Slime Bounce, Slime Trap | Slime Feet (no fall damage) |
| Copper-Copper | Paramecia | Oxidize, Lightning Strike, Copper Overload | Derusting (held weapon durability always full) |
| Beacon-Beacon | Paramecia | Flashbang, Beacon Beam, Beacon Boost | Light Producer (always emits light) |
| Trident-Trident | Paramecia | Trident Throw, Lightning Strike, Whirlpool | Immune to water damage + bonus damage to aquatic mobs |

**Logia** users only take damage from weapon-based sources (melee/projectile
attacks); everything else (fall, fire, drowning, explosions, etc.) is
cancelled while their fruit is active. **All fruit users take periodic damage
while standing in water**, unless the table above says otherwise (their
signature Devil Fruit weakness) — Water-Water and Trident-Trident are the two
explicit exceptions.

## Architecture (for adding an 11th fruit later)

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
                             — currently unused (no fruit sets a `transform`), kept as
                             ready-to-use infra if a Zoan fruit is added back later
    damageRules.js          Logia weapon-only-damage filter (world.beforeEvents.entityHurt)
    waterDamage.js          periodic Devil Fruit water-weakness tick
  fruits/
    sculk.js, lava.js, water.js, arrow.js,
    anvil.js, core_core.js, slime.js, copper.js, beacon.js, trident.js
```

A fruit module is a single plain object describing itself (id, category,
item ids, ability list with `execute(player, ability)` functions, an optional
`passive` object, and an optional `transform` object for Zoan fruits) that it
hands to `registerFruit()`. None of the engine files know anything about any
specific fruit — they only read the shape of `FruitDefinition`. Adding a new
fruit means: add one `fruits/<id>.js` file, register its items in
`behavior_pack/items/`, and import it once in `main.js`. No engine code
changes. (The Zoan `transform` path — mount a `minepiece:form_*` entity,
reuse a vanilla mob's model/texture/geometry for it — is exactly how the
three Zoan fruits this add-on shipped with earlier worked; that pattern is
gone from `fruits/` now but the engine support for it is still there.)

## How abilities are triggered

Each ability (and each Zoan transform) is its own inventory item ("emblem")
that is granted automatically once a player eats that fruit, and is silently
re-granted if it's ever missing from their inventory (so it can't be
permanently lost by dropping it). Using the item (right-click / trigger)
fires the matching ability. Cooldowns show as the normal Bedrock item-cooldown
swirl animation, backed by an authoritative server-side timer so it can't be
bypassed by switching item stacks.

## Known limitations / assumptions

- **Zoan transformation**: the Warden-Warden, Dragon-Dragon, and Ghast-Ghast
  fruits (the three that had a `transform`) have been removed, so nothing
  in the current fruit list uses this path. `core/transformEngine.js` still
  implements it generically — hide the player (Invisibility effect) and
  mount them, as the rider, on a purpose-built `minepiece:form_*` entity
  that has no AI and is steered entirely by the riding player's input, the
  same mechanism vanilla uses for riding a horse or boat — so a future Zoan
  fruit just needs its own `behavior_pack/entities/form_<id>.json` (reusing
  a real vanilla mob's model/texture/geometry, e.g. copying the flight
  component recipe from `behavior_pack/entities/happy_ghast.json` for a
  flying form) and a `transform` block in its fruit module; no engine code
  changes required.
- Particle and sound effects use existing **vanilla** particle/sound
  identifiers (e.g. `minecraft:critical_hit_emitter`, `random.explode`)
  rather than new custom particle files, in keeping with the "placeholder
  now, polish later" brief — they're already thematically matched per
  ability, so this may be all you ever need.
