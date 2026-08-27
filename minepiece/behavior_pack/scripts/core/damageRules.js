import { world } from "@minecraft/server";
import { getFruitId } from "./playerState.js";
import { getFruitById } from "./fruitRegistry.js";

/**
 * Every Devil Fruit user can be hurt by anything, same as anyone else — this
 * only handles the one generic exception a fruit can opt into: flatly
 * cancelling a specific damage cause for its user, via the optional
 * `cancelDamageCauses` list on a FruitDefinition (e.g. Slime-Slime's Slime
 * Feet passive sets `cancelDamageCauses: ["fall"]` instead of needing its
 * own event subscription).
 *
 * The Devil Fruit water-weakness tick (waterDamage.js) deliberately applies
 * its damage with cause "override" so it's never accidentally caught by a
 * fruit's own cancel list.
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
      }
    } catch (error) {
      console.error(`Minepiece: damage rules threw: ${error}`);
    }
  });
}
