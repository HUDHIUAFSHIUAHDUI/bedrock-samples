import { system, world } from "@minecraft/server";
import { WATER_DAMAGE_AMOUNT, WATER_DAMAGE_TICK_INTERVAL } from "./constants.js";
import { getFruitId, isTransformed } from "./playerState.js";
import { getFruitById } from "./fruitRegistry.js";

/**
 * The signature Devil Fruit weakness: any fruit user standing in water takes
 * periodic damage, unless their fruit says otherwise (Water-Water,
 * Trident-Trident). Uses damage cause "override" so it always lands even
 * through the Logia weapon-only-damage filter — see damageRules.js.
 *
 * A transformed Zoan user is riding their form entity rather than standing
 * in water themselves, so the check is skipped while transformed (the
 * mount, e.g. the Ghast or Ender Dragon form, isn't swimming in water to
 * begin with).
 */
export function registerWaterDamage() {
  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      const fruitId = getFruitId(player);
      if (!fruitId) continue;

      const fruit = getFruitById(fruitId);
      if (!fruit || fruit.waterImmune) continue;
      if (isTransformed(player)) continue;

      if (player.isInWater) {
        player.applyDamage(WATER_DAMAGE_AMOUNT, { cause: "override" });
      }
    }
  }, WATER_DAMAGE_TICK_INTERVAL);
}
