import { system } from "@minecraft/server";
import { PROPERTY } from "./constants.js";

/**
 * A single, centralized cooldown system every ability goes through.
 *
 * Two layers, both driven from the same call:
 *  - A dynamic property stores the tick `system.currentTick` the cooldown
 *    ends at. This is the authoritative check — it survives item-stack
 *    swapping/dropping/re-granting, which the client-side item cooldown
 *    alone would not.
 *  - `player.startItemCooldown(category, ticks)` additionally drives the
 *    familiar swirling cooldown icon in the hotbar for that item's cooldown
 *    category, purely as UI polish.
 */

function propertyKey(abilityId) {
  return `${PROPERTY.COOLDOWN_PREFIX}${abilityId}`;
}

/** @returns {number} seconds remaining on the given ability's cooldown (0 if ready). */
export function getRemainingSeconds(player, abilityId) {
  const readyAtTick = player.getDynamicProperty(propertyKey(abilityId));
  if (typeof readyAtTick !== "number") return 0;
  const remainingTicks = readyAtTick - system.currentTick;
  return remainingTicks > 0 ? Math.ceil(remainingTicks / 20) : 0;
}

export function isOnCooldown(player, abilityId) {
  return getRemainingSeconds(player, abilityId) > 0;
}

/**
 * Starts (or restarts) an ability's cooldown.
 * @param {number} seconds
 * @param {string} [itemCooldownCategory] the `minecraft:cooldown` category on the ability's
 *   item, if it has one, so the hotbar swirl animation lines up with the real cooldown.
 */
export function startCooldown(player, abilityId, seconds, itemCooldownCategory) {
  const ticks = Math.round(seconds * 20);
  player.setDynamicProperty(propertyKey(abilityId), system.currentTick + ticks);
  if (itemCooldownCategory) {
    player.startItemCooldown(itemCooldownCategory, ticks);
  }
}
