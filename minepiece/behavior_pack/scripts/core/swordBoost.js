import { system, world, ItemStack } from "@minecraft/server";
import { NAMESPACE } from "./constants.js";
import { BOOSTABLE_MATERIAL_IDS, BONUS_BY_MATERIAL_ID, isBaseMaterialSword, baseMaterialOfVariant, variantId } from "./swordMaterials.js";

/**
 * Two related mechanics, reconciled together because they both ultimately fight over the same
 * thing — what's actually equipped in the mainhand slot:
 *
 *  - Offhand boost: a boostable sword sitting in the offhand adds to the mainhand sword's attack
 *    damage. Legendary Sword/Saber are excluded on both ends (can't be boosted, can't grant a
 *    boost) per spec.
 *  - Sword-as-helmet: sneak+use a sword to convert it into a wearable, indestructible, zero-
 *    protection head-slot item (visually a Zoro-style sword clenched in the mouth — see the
 *    attachables under resource_pack/attachables/mouth_sword_*.json) that also grants the same
 *    tier of bonus. Un-equipping it converts it straight back into the real sword.
 *
 * If both are active at once, the bonus is the *better* of the two, not their sum — the boosted
 * display-variant items (tools/gen_sword_boosts.py) only go up to +3, matching netherite's own
 * tier, so a combined total any higher would have nothing to display.
 */

const TICK_INTERVAL = 20;

const WORN_SWORD_PREFIX = `${NAMESPACE}:worn_sword_`;
// Legendary Sword/Saber can be worn as a helmet too (purely for the visual — "whichever sword is
// equipped" — since the user's boost table never defined a number for them, worn legendary
// weapons grant no additional bonus).
const LEGENDARY_IDS = [`${NAMESPACE}:legendary_sword`, `${NAMESPACE}:legendary_saber`];
const WEARABLE_SOURCE_IDS = [...BOOSTABLE_MATERIAL_IDS, ...LEGENDARY_IDS];

export function registerSwordBoost() {
  world.afterEvents.itemUse.subscribe((event) => {
    try {
      handleWearAsHelmet(event);
    } catch (error) {
      console.error(`Minepiece: sword-as-helmet conversion threw: ${error}`);
    }
  });

  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      try {
        reconcileMainhandBoost(player);
        reconcileUnwornHelmet(player);
      } catch (error) {
        console.error(`Minepiece: sword boost reconcile threw: ${error}`);
      }
    }
  }, TICK_INTERVAL);
}

// --- wearing / un-wearing ---------------------------------------------------

function handleWearAsHelmet(event) {
  const player = event.source;
  if (player.typeId !== "minecraft:player" || !player.isSneaking) return;

  // The item used might already be a boosted display variant (e.g. an offhand boost is active) —
  // resolve back to its real base material/legendary id before checking eligibility.
  const usedId = event.itemStack.typeId;
  const sourceId = baseMaterialOfVariant(usedId) ?? usedId;
  if (!WEARABLE_SOURCE_IDS.includes(sourceId)) return;

  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;

  const existingHelmet = equippable.getEquipment("Head");
  if (existingHelmet && existingHelmet.typeId.startsWith(WORN_SWORD_PREFIX)) {
    player.sendMessage("§cTake off your worn sword first.");
    return;
  }

  const mainhand = equippable.getEquipment("Mainhand");
  if (!mainhand || mainhand.typeId !== usedId) return; // "used" item should be the one actually in hand

  const worn = new ItemStack(wornHelmetId(sourceId), 1);
  copyDurabilityAndEnchants(mainhand, worn);

  equippable.setEquipment("Head", worn);
  consumeOneMainhandExact(equippable, mainhand);
  player.sendMessage("§aWorn as a helmet.");
}

/** If a worn-sword helmet gets removed by any means other than our own reconcile swap (dying, a
 * shift-click into a chest, etc.), convert it back into the real sword the next time we see it
 * sitting loose rather than on the player's head. */
function reconcileUnwornHelmet(player) {
  const equippable = player.getComponent("minecraft:equippable");
  const head = equippable?.getEquipment("Head");
  if (head && head.typeId.startsWith(WORN_SWORD_PREFIX)) return; // still worn, nothing to reconcile

  const inventory = player.getComponent("minecraft:inventory")?.container;
  if (!inventory) return;
  for (let slot = 0; slot < inventory.size; slot++) {
    const item = inventory.getItem(slot);
    if (item && item.typeId.startsWith(WORN_SWORD_PREFIX)) {
      const real = new ItemStack(sourceIdFromWornHelmet(item.typeId), 1);
      copyDurabilityAndEnchants(item, real);
      inventory.setItem(slot, real);
    }
  }
}

function shortIdOf(fullId) {
  return fullId.split(":")[1];
}

/** e.g. "minecraft:wooden_sword" -> "minepiece:worn_sword_wooden_sword" */
function wornHelmetId(sourceFullId) {
  return `${WORN_SWORD_PREFIX}${shortIdOf(sourceFullId)}`;
}

/** Reverses wornHelmetId — the short name alone doesn't say which namespace it came from
 * (vanilla materials vs. our own Legendary Sword/Saber), so check the legendary list first. */
function sourceIdFromWornHelmet(wornFullId) {
  const short = wornFullId.slice(WORN_SWORD_PREFIX.length);
  const legendaryMatch = LEGENDARY_IDS.find((id) => shortIdOf(id) === short);
  return legendaryMatch ?? `minecraft:${short}`;
}

// --- mainhand damage-display swap -------------------------------------------

function reconcileMainhandBoost(player) {
  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;

  const mainhand = equippable.getEquipment("Mainhand");
  if (!mainhand) return;

  const baseMaterialId = isBaseMaterialSword(mainhand.typeId) ? mainhand.typeId : baseMaterialOfVariant(mainhand.typeId);
  if (!baseMaterialId) return; // not a boostable sword at all — legendary weapons, tools, etc.

  const offhand = equippable.getEquipment("Offhand");
  const offhandBonus = offhand && BONUS_BY_MATERIAL_ID[offhand.typeId] ? BONUS_BY_MATERIAL_ID[offhand.typeId] : 0;

  const head = equippable.getEquipment("Head");
  const helmetBonus = head && head.typeId.startsWith(WORN_SWORD_PREFIX) ? BONUS_BY_MATERIAL_ID[sourceIdFromWornHelmet(head.typeId)] ?? 0 : 0;

  const bonus = Math.max(offhandBonus, helmetBonus);
  const desiredId = bonus > 0 ? variantId(baseMaterialId, bonus) : baseMaterialId;

  if (mainhand.typeId === desiredId) return;

  const swapped = new ItemStack(desiredId, mainhand.amount);
  copyDurabilityAndEnchants(mainhand, swapped);
  equippable.setEquipment("Mainhand", swapped);
}

// --- shared item-state cloning ----------------------------------------------

function copyDurabilityAndEnchants(from, to) {
  const fromDurability = from.getComponent("minecraft:durability");
  const toDurability = to.getComponent("minecraft:durability");
  if (fromDurability && toDurability) {
    toDurability.damage = Math.min(fromDurability.damage, toDurability.maxDurability);
  }

  const fromEnchantable = from.getComponent("minecraft:enchantable");
  const toEnchantable = to.getComponent("minecraft:enchantable");
  if (fromEnchantable && toEnchantable) {
    const enchantments = fromEnchantable.getEnchantments();
    if (enchantments.length > 0) toEnchantable.addEnchantments(enchantments);
  }

  if (from.nameTag) to.nameTag = from.nameTag;
}

function consumeOneMainhandExact(equippable, mainhand) {
  if (mainhand.amount > 1) {
    const remaining = mainhand.clone();
    remaining.amount -= 1;
    equippable.setEquipment("Mainhand", remaining);
  } else {
    equippable.setEquipment("Mainhand", undefined);
  }
}
