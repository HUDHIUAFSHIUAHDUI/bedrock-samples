import { world } from "@minecraft/server";
import { getFruitId } from "./playerState.js";
import { getFruitById } from "./fruitRegistry.js";

/**
 * Every Devil Fruit user can be hurt by anything, same as anyone else — this
 * handles two generic exceptions a fruit can opt into, neither of which
 * needs its own event subscription:
 *   - `cancelDamageCauses`: flatly cancels a specific damage cause (e.g.
 *     Slime-Slime's Slime Feet passive sets `cancelDamageCauses: ["fall"]`).
 *   - `cancelDamageFromTypeIds`: flatly cancels damage from specific
 *     attacker entity types (e.g. Pillager-Pillager's "Part of the Family"
 *     passive lists the illager family so they stop hurting the player —
 *     the actual mechanism behind "aren't hostile towards you anymore",
 *     since the Script API has no supported way to rewrite a vanilla mob's
 *     targeting AI at runtime).
 *
 * The Devil Fruit water-weakness tick (waterDamage.js) deliberately applies
 * its damage with cause "override" so it's never accidentally caught by
 * either cancel list.
 */
export function registerDamageRules() {
  world.beforeEvents.entityHurt.subscribe((event) => {
    try {
      const player = event.hurtEntity;
      if (player.typeId !== "minecraft:player") return;

      const cause = event.damageSource?.cause;
      if (cause === "override") return; // Devil Fruit water weakness always lands.

      const fruitId = getFruitId(player);
      if (!fruitId) return;

      const fruit = getFruitById(fruitId);
      if (!fruit) return;

      if (fruit.cancelDamageCauses?.includes(cause)) {
        event.cancel = true;
        return;
      }

      const attackerTypeId = event.damageSource?.damagingEntity?.typeId;
      if (attackerTypeId && fruit.cancelDamageFromTypeIds?.includes(attackerTypeId)) {
        event.cancel = true;
      }
    } catch (error) {
      console.error(`Minepiece: damage rules threw: ${error}`);
    }
  });
}
