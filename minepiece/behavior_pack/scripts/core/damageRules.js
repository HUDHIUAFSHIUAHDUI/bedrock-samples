import { world } from "@minecraft/server";
import { WEAPON_DAMAGE_CAUSES } from "./constants.js";
import { getFruitId } from "./playerState.js";
import { getFruitById } from "./fruitRegistry.js";

/**
 * Enforces the Logia rule: a Logia user only takes damage from weapon-based
 * sources (melee hits, projectiles). Everything else — fall damage, fire,
 * drowning, explosions, the void, starvation, etc. — passes right through
 * them, same as a Devil Fruit user's body turning to smoke/sand/flame in the
 * source material.
 *
 * The Devil Fruit water-weakness tick (waterDamage.js) deliberately applies
 * its damage with cause "override" — sea water negates Devil Fruit powers
 * entirely, Logia intangibility included, so that specific cause always
 * lands no matter what. Every other non-weapon cause is what gets cancelled
 * for a Logia user.
 *
 * This is also the one place any fruit can flatly cancel a specific damage
 * cause for its user, via the optional `cancelDamageCauses` list on a
 * FruitDefinition — e.g. Slime-Slime's Slime Feet passive (no fall damage)
 * sets `cancelDamageCauses: ["fall"]` instead of needing its own event
 * subscription.
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

      if (fruit.logiaWeaponOnlyDamage && !WEAPON_DAMAGE_CAUSES.has(cause)) {
        event.cancel = true;
      }
    } catch (error) {
      console.error(`Minepiece: damage rules threw: ${error}`);
    }
  });
}
