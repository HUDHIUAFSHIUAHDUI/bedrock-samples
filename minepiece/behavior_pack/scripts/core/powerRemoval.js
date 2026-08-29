import { world } from "@minecraft/server";
import { NAMESPACE } from "./constants.js";
import { getFruitId, clearFruit } from "./playerState.js";
import { getFruitById } from "./fruitRegistry.js";

const POWER_REMOVAL_ITEM_ID = `${NAMESPACE}:power_removal_apple`;

/**
 * Eating the Devil Fruit Removal Apple strips whatever fruit the player currently has.
 * Clearing the stored fruit id alone already makes every ability item inert —
 * abilityEngine.js checks getFruitId(player) === fruit.id before running anything, and
 * passiveEngine.js's tick loop skips a player with no fruit id entirely — but the ability
 * items themselves would otherwise sit dead in the player's inventory forever, so this also
 * sweeps them out the same way kit.js adds them, just in reverse.
 */
export function registerPowerRemoval() {
  world.afterEvents.itemCompleteUse.subscribe((event) => {
    const player = event.source;
    if (player.typeId !== "minecraft:player") return;
    if (event.itemStack.typeId !== POWER_REMOVAL_ITEM_ID) return;

    const fruitId = getFruitId(player);
    if (!fruitId) {
      player.sendMessage("§7You don't have any Devil Fruit powers to remove.");
      return;
    }

    const fruit = getFruitById(fruitId);
    removeAbilityKit(player, fruit);
    clearFruit(player);
    player.sendMessage(`§bYour power over the ${fruit?.displayName ?? fruitId} has been washed away.`);
  });
}

function removeAbilityKit(player, fruit) {
  if (!fruit) return;
  const container = player.getComponent("minecraft:inventory")?.container;
  if (!container) return;

  const abilityItemIds = new Set(fruit.abilities.map((ability) => ability.itemId));
  for (let slot = 0; slot < container.size; slot++) {
    if (abilityItemIds.has(container.getItem(slot)?.typeId)) {
      container.setItem(slot, undefined);
    }
  }
}
