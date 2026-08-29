/**
 * The single data-driven table every fruit module registers itself into.
 *
 * @typedef {Object} Ability
 * @property {string} id                 unique within its fruit, e.g. "sonic_boom"
 * @property {string} itemId             the item that triggers this ability when used
 * @property {string} name               display name, used in cooldown/feedback messages
 * @property {number} cooldownSeconds    defaults to DEFAULT_COOLDOWN_SECONDS if omitted
 * @property {(ctx: AbilityContext) => void} execute
 *
 * @typedef {Object} AbilityContext
 * @property {import("@minecraft/server").Player} player
 * @property {import("@minecraft/server").Dimension} dimension
 * @property {import("@minecraft/server").ItemStack} itemStack
 * @property {FruitDefinition} fruit
 * @property {Ability} ability
 *
 * @typedef {Object} Passive
 * @property {(player: import("@minecraft/server").Player) => void} [onTick] runs every PASSIVE_TICK_INTERVAL while the fruit is active
 * @property {(player: import("@minecraft/server").Player, event: import("@minecraft/server").EntityHurtAfterEvent) => void} [onHurtAfter]
 * @property {(player: import("@minecraft/server").Player, deadEntity: import("@minecraft/server").Entity) => void} [onKillHostile]
 * @property {(player: import("@minecraft/server").Player, hitEntity: import("@minecraft/server").Entity) => void} [onHitEntity] runs whenever this player melee-hits anything
 * @property {(player: import("@minecraft/server").Player) => void} [onFirstEquip] runs once, the moment the fruit is eaten
 *
 * @typedef {Object} FruitDefinition
 * @property {string} id                 e.g. "sculk"
 * @property {string} displayName        e.g. "Sculk-Sculk Fruit"
 * @property {string} itemId             the fruit item eaten to gain this power
 * @property {string[]} [cancelDamageCauses] EntityDamageCause values to flatly cancel for this fruit's user (e.g. ["fall"])
 * @property {string[]} [cancelDamageFromTypeIds] attacker entity typeIds whose damage is flatly cancelled for this fruit's user (e.g. ["minecraft:pillager"])
 * @property {Ability[]} abilities
 * @property {Passive} [passive]
 */

/** @type {Map<string, FruitDefinition>} */
const fruitsById = new Map();
/** @type {Map<string, FruitDefinition>} keyed by the fruit's own edible item id */
const fruitsByItemId = new Map();
/** @type {Map<string, {fruit: FruitDefinition, ability: Ability}>} keyed by ability item id */
const abilitiesByItemId = new Map();

/** @param {FruitDefinition} fruit */
export function registerFruit(fruit) {
  if (fruitsById.has(fruit.id)) {
    throw new Error(`Minepiece: duplicate fruit id "${fruit.id}"`);
  }
  fruitsById.set(fruit.id, fruit);
  fruitsByItemId.set(fruit.itemId, fruit);

  for (const ability of fruit.abilities) {
    if (abilitiesByItemId.has(ability.itemId)) {
      throw new Error(`Minepiece: duplicate ability item id "${ability.itemId}"`);
    }
    abilitiesByItemId.set(ability.itemId, { fruit, ability });
  }
}

export function getFruitById(id) {
  return fruitsById.get(id);
}

export function getFruitByFruitItemId(itemId) {
  return fruitsByItemId.get(itemId);
}

export function getAbilityByItemId(itemId) {
  return abilitiesByItemId.get(itemId);
}

export function getAllFruits() {
  return [...fruitsById.values()];
}
