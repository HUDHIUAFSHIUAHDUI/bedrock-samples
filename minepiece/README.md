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

If you're updating an install that's already running (not a fresh copy), fully
quit Minecraft and relaunch before testing — Bedrock caches resource pack
content (textures, geometry) per-world, and copying new files into
`com.mojang` while the app is still open, or without a full restart, can keep
serving the old cached version even though the files on disk are current.

## If nothing seems to happen

Every place scripts run — starting up, using an ability, eating a fruit — is
wrapped so a failure reports itself instead of just doing nothing: watch chat
for a red `[Minepiece] ... failed: ...` message, and check the content log
(`console.error` output) for the same. If eating a fruit or using an ability
produces *no* message at all, not even an error, the scripts aren't running —
almost always because the **Beta APIs** experimental toggle (step 3 above)
isn't on for that world. It generally has to be enabled when the world is
created; toggling it later on an existing world may not take effect. If you
do see a red error message, that's the real bug — send it over and it's
fixable directly instead of guessing.

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
flat icon standing in for it. That geometry needed two fixes before it was
usable as a *block* rather than a *worn accessory* — see `tools/rebase_head_geometry.py`
and `tools/fix_block_geometry_coordinate_space.py` for the full story:
1. **Vertical position**: the source pack built these heads to be worn on a
   player's head bone (pivot ~24-28 units up out of ~32), not to sit on a
   block — reused as-is they'd render floating well above wherever they were
   placed. Re-based so each head sits just above the floor of its own block.
2. **Horizontal centering**: custom block geometry in Bedrock is horizontally
   *centered* on the block (x/z run roughly -8 to 8), not corner-anchored
   like entity geometry (0-16) — confirmed against Microsoft's own
   custom-block example, which uses cube origins like `[-6, 0, -3]`. The
   first pass got this wrong (centered at x=8/z=8, the entity convention),
   which put every head exactly half a block off to one side instead of
   centered — re-centered at x=0/z=0 to match.

A few of the heads also had actual holes in them — the source models are
built from stacked cube "bands," and in several fruits two adjacent bands
didn't quite touch, leaving a real gap you could see/fall through in the
middle of the head. `tools/close_geometry_gaps.py` detects every such gap and
stretches the band below it up to meet the one above, closing it.

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

Every fruit works the same way — there's no Logia/Paramecia/Zoan split.
Every fruit user can be hurt by anything (no damage-type immunity), and every
fruit user takes periodic damage while standing in water (the signature
Devil Fruit weakness), no exceptions.

| Fruit | Abilities (10s cooldown each) | Passive |
|---|---|---|
| Sculk-Sculk | Sculk Spikes, Sculk Sense, Sculk Explosion | Sculk Catalyst on hostile kill |
| Lava-Lava | Lava Fist, Lava Pool, Lava Meteor | Magma-walker (frost walker, but magma) |
| Water-Water | Water Jet, Water Prison, Tidal Crash | Dolphin's Grace while in water |
| Arrow-Arrow | Arrow Shot, Arrow Barrage, Arrow Rain | Arrow Instinct (auto-fires an arrow when hurt) |
| Anvil-Anvil | Anvil Drop, Anvil Toss, Anvil Slam | Heavy (infinite knockback resistance) |
| Core-Core | Wind Burst, Heavy Punch, Land Crash | Hometown Link (permanent Bad Omen + Wind Charged) |
| Slime-Slime | Slime Shot, Slime Bounce, Slime Trap | Slime Feet (no fall damage) |
| Copper-Copper | Oxidize, Lightning Strike, Copper Overload | Derusting (held weapon durability always full) |
| Beacon-Beacon | Flashbang, Beacon Beam, Beacon Boost | Light Producer (always emits light) |
| Trident-Trident | Trident Throw, Lightning Strike, Whirlpool | Bonus damage to aquatic mobs |
| Snow-Snowball | Snowball Shot, Snowstorm, Blizzard | One with the Snow (immune to freezing/powder snow damage) |
| Potion-Potion | Health Potion, Extra Jump Potion, Bloodlust Potion | Natural Cleaning (never get a negative potion effect) |
| Goat Horn-Goat Horn | Horn Blast, Horn Punch, War Horn | Goat Legs (constant Speed I) |
| Shulker-Shulker | Shulker Shot, Ender Pearl, Levitate | Shulker Sense (a hit taken at full health teleports you 10 blocks away) |

## Architecture (for adding a 15th fruit later)

Everything gameplay-related lives in `behavior_pack/scripts/`:

```
scripts/
  main.js                 entry point — imports core systems + every fruit module
  core/
    constants.js           shared ids, namespaces, tick rates
    playerState.js          dynamic-property helpers (which fruit, toggle states)
    cooldowns.js            generic 10s-cooldown system (dynamic property + vanilla item cooldown UI)
    targeting.js            reusable raycast / area-of-effect / forward-direction helpers
    vfx.js                  small wrappers around spawnParticle / playSound
    fruitRegistry.js        the data-driven table every fruit module registers itself into
    abilityEngine.js        listens for itemUse, resolves it to a fruit+ability, runs it
    passiveEngine.js        runs each fruit's passive on a fixed interval + exposes event hooks
    damageRules.js          the one place a fruit can flatly cancel a specific damage cause
                             for itself (e.g. Slime's no-fall-damage, Snow's no-freezing-damage)
    waterDamage.js          periodic Devil Fruit water-weakness tick (applies to every fruit)
  fruits/
    sculk.js, lava.js, water.js, arrow.js, anvil.js, core_core.js, slime.js,
    copper.js, beacon.js, trident.js, snow.js, potion.js, goat.js, shulker.js
```

A fruit module is a single plain object describing itself (id, item id,
ability list with `execute(player, ability)` functions, and an optional
`passive` object) that it hands to `registerFruit()`. None of the engine
files know anything about any specific fruit — they only read the shape of
`FruitDefinition`. Adding a new fruit means: add one `fruits/<id>.js` file,
register its items in `behavior_pack/items/`, and import it once in
`main.js`. No engine code changes.

## How abilities are triggered

Each ability is its own inventory item ("emblem") that is granted
automatically once a player eats that fruit, and is silently re-granted if
it's ever missing from their inventory (so it can't be permanently lost by
dropping it). Using the item (right-click / trigger) fires the matching
ability. Cooldowns show as the normal Bedrock item-cooldown swirl animation,
backed by an authoritative server-side timer so it can't be bypassed by
switching item stacks.

## Known limitations / assumptions

- Particle and sound effects use existing **vanilla** particle/sound
  identifiers (e.g. `minecraft:critical_hit_emitter`, `random.explode`)
  rather than new custom particle files, in keeping with the "placeholder
  now, polish later" brief — they're already thematically matched per
  ability, so this may be all you ever need.
- **Shulker Shot**'s tracking is a hand-rolled approximation: the Script API
  doesn't expose vanilla's real homing-missile AI for a manually spawned
  projectile, so `fruits/shulker.js` instead re-aims the bullet at the
  nearest non-player entity every few ticks for a few seconds after it's
  fired. It reads as "tracks the nearest enemy" in practice, but it's a
  polling re-aim, not true homing steering.
