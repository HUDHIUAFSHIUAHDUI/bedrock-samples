import { PROPERTY } from "./constants.js";

/**
 * Thin, typed wrappers around Entity dynamic properties. Every other file
 * that needs to know "what fruit does this player have" or "are they
 * transformed right now" goes through here instead of touching
 * getDynamicProperty/setDynamicProperty directly, so the storage format can
 * change in one place if it ever needs to.
 */

/** @returns {string|undefined} the fruit id the player has eaten, or undefined. */
export function getFruitId(player) {
  const value = player.getDynamicProperty(PROPERTY.FRUIT_ID);
  return typeof value === "string" ? value : undefined;
}

export function setFruitId(player, fruitId) {
  player.setDynamicProperty(PROPERTY.FRUIT_ID, fruitId);
}

export function clearFruit(player) {
  player.setDynamicProperty(PROPERTY.FRUIT_ID, undefined);
  player.setDynamicProperty(PROPERTY.TRANSFORMED, undefined);
  player.setDynamicProperty(PROPERTY.TRANSFORM_ENTITY_ID, undefined);
  player.setDynamicProperty(PROPERTY.BEACON_BOOST_ACTIVE, undefined);
}

export function isTransformed(player) {
  return player.getDynamicProperty(PROPERTY.TRANSFORMED) === true;
}

export function setTransformed(player, transformed) {
  player.setDynamicProperty(PROPERTY.TRANSFORMED, transformed);
}

/** The persistent id of the currently-ridden transformation-form entity, if any. */
export function getTransformEntityId(player) {
  const value = player.getDynamicProperty(PROPERTY.TRANSFORM_ENTITY_ID);
  return typeof value === "string" ? value : undefined;
}

export function setTransformEntityId(player, entityId) {
  player.setDynamicProperty(PROPERTY.TRANSFORM_ENTITY_ID, entityId);
}

export function isBeaconBoostActive(player) {
  return player.getDynamicProperty(PROPERTY.BEACON_BOOST_ACTIVE) === true;
}

export function setBeaconBoostActive(player, active) {
  player.setDynamicProperty(PROPERTY.BEACON_BOOST_ACTIVE, active);
}

/** Packs a block position into a compact string so we can detect "did the player move to a new block". */
export function blockKey(location) {
  return `${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)}`;
}

export function getLastFootBlock(player) {
  const value = player.getDynamicProperty(PROPERTY.LAST_FOOT_BLOCK);
  return typeof value === "string" ? value : undefined;
}

export function setLastFootBlock(player, key) {
  player.setDynamicProperty(PROPERTY.LAST_FOOT_BLOCK, key);
}
