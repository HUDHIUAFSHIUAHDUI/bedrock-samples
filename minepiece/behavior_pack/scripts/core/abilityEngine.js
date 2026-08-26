import { world } from "@minecraft/server";
import { DEFAULT_COOLDOWN_SECONDS } from "./constants.js";
import { getFruitId, isTransformed } from "./playerState.js";
import { getAbilityByItemId } from "./fruitRegistry.js";
import { getRemainingSeconds, isOnCooldown, startCooldown } from "./cooldowns.js";

/**
 * The generic ability dispatcher. Every ability in the game is triggered the
 * same way — using its item — so this is the only place that needs to know
 * about itemUse events. Individual fruit modules never subscribe to events
 * themselves; they just describe what their ability does.
 */
export function registerAbilityEngine() {
  world.afterEvents.itemUse.subscribe((event) => {
    const player = event.source;
    if (player.typeId !== "minecraft:player") return;

    const match = getAbilityByItemId(event.itemStack.typeId);
    if (!match) return;

    const { fruit, ability } = match;

    if (getFruitId(player) !== fruit.id) {
      player.sendMessage(`§cYou don't have the power of the ${fruit.displayName}.`);
      return;
    }

    if (fruit.transform?.blocksAbilitiesWhileTransformed && isTransformed(player)) {
      player.sendMessage(`§cYou can only fly while transformed.`);
      return;
    }

    if (isOnCooldown(player, ability.id)) {
      player.sendMessage(`§c${ability.name} is on cooldown (${getRemainingSeconds(player, ability.id)}s).`);
      return;
    }

    try {
      ability.execute({
        player,
        dimension: player.dimension,
        itemStack: event.itemStack,
        fruit,
        ability,
      });
    } catch (error) {
      // Surface the failure instead of the ability silently doing nothing — see main.js for why
      // this matters: a throw here would otherwise look identical to "nothing happened".
      console.error(`Minepiece: ability "${ability.id}" threw: ${error}`);
      player.sendMessage(`§c${ability.name} failed: ${error}`);
      return;
    }

    startCooldown(player, ability.id, ability.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS, ability.itemId);
  });
}
