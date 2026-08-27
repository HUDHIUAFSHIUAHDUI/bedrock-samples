import { system, world } from "@minecraft/server";
import { WATER_DAMAGE_AMOUNT, WATER_DAMAGE_TICK_INTERVAL } from "./constants.js";
import { getFruitId } from "./playerState.js";
import { getFruitById } from "./fruitRegistry.js";

/**
 * The signature Devil Fruit weakness: any fruit user standing in water takes
 * periodic damage, no exceptions. Uses damage cause "override" so it always
 * lands regardless of anything else going on with that player.
 */
export function registerWaterDamage() {
  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      try {
        const fruitId = getFruitId(player);
        if (!fruitId) continue;
        if (!getFruitById(fruitId)) continue;

        if (player.isInWater) {
          player.applyDamage(WATER_DAMAGE_AMOUNT, { cause: "override" });
        }
      } catch (error) {
        console.error(`Minepiece: water damage tick threw: ${error}`);
      }
    }
  }, WATER_DAMAGE_TICK_INTERVAL);
}
