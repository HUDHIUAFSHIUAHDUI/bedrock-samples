import { ItemStack } from "@minecraft/server";

/**
 * Keeps a player's "ability kit" — the set of ability items their current
 * fruit grants — present in their inventory. Called once right when a fruit
 * is eaten, and again periodically from passiveEngine.js so an item that
 * gets dropped, lost in lava, etc. quietly reappears instead of permanently
 * soft-locking that ability.
 */
export function ensureAbilityKit(player, fruit) {
  const inventory = player.getComponent("minecraft:inventory");
  const container = inventory?.container;
  if (!container) return;

  const requiredItemIds = fruit.abilities.map((ability) => ability.itemId);

  for (const itemId of requiredItemIds) {
    if (!containerHasItem(container, itemId)) {
      container.addItem(new ItemStack(itemId, 1));
    }
  }
}

function containerHasItem(container, typeId) {
  for (let slot = 0; slot < container.size; slot++) {
    if (container.getItem(slot)?.typeId === typeId) return true;
  }
  return false;
}
