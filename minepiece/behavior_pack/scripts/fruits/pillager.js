import { ItemStack } from "@minecraft/server";
import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getLookedAtEntity, getFlatForward, getForwardPoint, knockbackAwayFrom, safeApplyDamage, add, scale } from "../core/targeting.js";
import { spawnParticleBurst, playSound } from "../core/vfx.js";

const EVOKER_FANG_COUNT = 10;
const EVOKER_FANG_SPACING = 1;
const PILLAGER_ROB_RANGE = 4;
const PILLAGER_ROB_DAMAGE = 9;
const RAVAGER_SPAWN_DISTANCE = 2;

// Real vanilla identifiers, matched exactly so the passive below actually catches every source
// of illager damage (melee and ranged alike — the damage source's attacker is the shooter, not
// the projectile, so this list doesn't need a separate entry for pillager crossbow bolts etc.).
const FRIENDLY_ILLAGER_TYPE_IDS = [
  "minecraft:pillager",
  "minecraft:vex",
  "minecraft:ravager",
  "minecraft:evocation_illager",
  "minecraft:vindicator",
];

registerFruit({
  id: "pillager",
  displayName: "Pillager-Pillager Fruit",
  itemId: `${NAMESPACE}:fruit_pillager`,
  cancelDamageFromTypeIds: FRIENDLY_ILLAGER_TYPE_IDS,

  abilities: [
    {
      id: "evoker_spell",
      itemId: `${NAMESPACE}:ability_evoker_spell`,
      name: "Evoker Spell",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const forward = getFlatForward(player);
        playSound(dimension, "mob.evoker.castspell", player.location);
        for (let step = 1; step <= EVOKER_FANG_COUNT; step++) {
          const point = add(player.location, scale(forward, step * EVOKER_FANG_SPACING));
          try {
            dimension.spawnEntity("minecraft:evocation_fang", point);
          } catch (error) {
            console.error(`Minepiece: evoker spell fang spawn threw: ${error}`);
          }
        }
      },
    },
    {
      id: "pillager_rob",
      itemId: `${NAMESPACE}:ability_pillager_rob`,
      name: "Pillager Rob",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const target = getLookedAtEntity(player, PILLAGER_ROB_RANGE);
        if (!target) {
          player.sendMessage("§cNo target in range.");
          return;
        }

        safeApplyDamage(target, PILLAGER_ROB_DAMAGE, { cause: "magic", damagingEntity: player });
        knockbackAwayFrom(target, player.location, 1.2, 0.3);
        spawnParticleBurst(dimension, "minecraft:critical_hit_emitter", target.location, 8, 0.5);
        playSound(dimension, "mob.pillager.celebrate", target.location);

        if (target.typeId === "minecraft:villager_v2" || target.typeId === "minecraft:villager") {
          try {
            dimension.spawnItem(new ItemStack("minecraft:emerald", 1), target.location);
          } catch (error) {
            console.error(`Minepiece: pillager rob emerald drop threw: ${error}`);
          }
        }
      },
    },
    {
      id: "ravager_ride",
      itemId: `${NAMESPACE}:ability_ravager_ride`,
      name: "Ravager Ride",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const spawnPoint = getForwardPoint(player, RAVAGER_SPAWN_DISTANCE);
        let ravager;
        try {
          ravager = dimension.spawnEntity(`${NAMESPACE}:mount_ravager`, spawnPoint);
        } catch (error) {
          console.error(`Minepiece: ravager ride spawn threw: ${error}`);
          player.sendMessage("§cCouldn't summon a ravager here.");
          return;
        }

        const rideable = ravager.getComponent("minecraft:rideable");
        const mounted = rideable?.addRider(player) ?? false;
        if (!mounted) {
          player.sendMessage("§cCouldn't mount the ravager.");
        }
        playSound(dimension, "mob.ravager.roar", spawnPoint);
      },
    },
  ],

  // "Part of the Family" is implemented entirely via cancelDamageFromTypeIds above (no passive
  // hook needed) — the Script API has no supported way to rewrite a vanilla mob's targeting AI
  // at runtime, so these mobs still notice and "attack" the player, they just can never actually
  // land a hit.
});
