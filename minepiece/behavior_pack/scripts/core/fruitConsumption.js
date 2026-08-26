import { world } from "@minecraft/server";
import { getFruitId, setFruitId } from "./playerState.js";
import { getFruitByFruitItemId } from "./fruitRegistry.js";
import { ensureAbilityKit } from "./kit.js";

/**
 * Handles eating a Devil Fruit item. Fruit items are defined as vanilla
 * "food" items in their item JSON (see behavior_pack/items/fruit_*.json) so
 * they go through the normal eat animation, and afterEvents.itemCompleteUse
 * fires the moment that finishes.
 */
export function registerFruitConsumption() {
  world.afterEvents.itemCompleteUse.subscribe((event) => {
    const player = event.source;
    if (player.typeId !== "minecraft:player") return;

    const fruit = getFruitByFruitItemId(event.itemStack.typeId);
    if (!fruit) return;

    if (getFruitId(player)) {
      player.sendMessage("§cYou can't eat another Devil Fruit — you've already awakened one power.");
      return;
    }

    try {
      setFruitId(player, fruit.id);
      ensureAbilityKit(player, fruit);
      fruit.passive?.onFirstEquip?.(player);
      player.sendMessage(`§d§lYou ate the ${fruit.displayName}!§r §7You now have the power of the ${fruit.displayName.split("-")[0]}.`);
    } catch (error) {
      console.error(`Minepiece: eating "${fruit.id}" threw: ${error}`);
      player.sendMessage(`§c[Minepiece] Eating the ${fruit.displayName} failed: ${error}`);
    }
  });
}
