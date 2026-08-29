import { world, ItemStack } from "@minecraft/server";
import { NAMESPACE } from "./constants.js";
import { knockbackAwayFrom, safeApplyDamage, safeAddEffect } from "./targeting.js";

/**
 * Custom "enchant books" for the Legendary Sword/Saber. Bedrock's Script API has no supported
 * hook into the real anvil UI, so these don't combine there like vanilla enchant books — instead,
 * using (right-click) a book while the matching weapon sits in the *other* hand applies it, and
 * using a Big Game Hunter I book while another Big Game Hunter I book sits in the other hand
 * combines them into a II. Everything each enchant actually does lives on the weapon ItemStack
 * itself as dynamic properties, read back out in the entityHurt handler at the bottom of this file.
 */

const SWORD_ID = `${NAMESPACE}:legendary_sword`;
const SABER_ID = `${NAMESPACE}:legendary_saber`;

const ENCHANT_PROPERTY = {
  CRITICAL_KNOCKBACK: `${NAMESPACE}:ench_critical_knockback`,
  BIG_GAME_HUNTER: `${NAMESPACE}:ench_big_game_hunter`,
  VAMPIRE_BLOOD: `${NAMESPACE}:ench_vampire_blood`,
  STRONGEST_SWORDSMAN: `${NAMESPACE}:ench_strongest_swordsman`,
};

const BOOK_ID = {
  CRITICAL_KNOCKBACK: `${NAMESPACE}:book_critical_knockback`,
  BIG_GAME_HUNTER_1: `${NAMESPACE}:book_big_game_hunter_1`,
  BIG_GAME_HUNTER_2: `${NAMESPACE}:book_big_game_hunter_2`,
  VAMPIRE_BLOOD: `${NAMESPACE}:book_vampire_blood`,
  STRONGEST_SWORDSMAN: `${NAMESPACE}:book_strongest_swordsman`,
};

// Single-level books: bookId -> { propertyKey, weaponId, loreLabel }. Big Game Hunter is handled
// separately below since it has two levels and a combine-from-offhand step.
const SINGLE_APPLY_BOOKS = {
  [BOOK_ID.CRITICAL_KNOCKBACK]: { propertyKey: ENCHANT_PROPERTY.CRITICAL_KNOCKBACK, weaponId: SABER_ID, loreLabel: "§bCritical Knockback" },
  [BOOK_ID.VAMPIRE_BLOOD]: { propertyKey: ENCHANT_PROPERTY.VAMPIRE_BLOOD, weaponId: SWORD_ID, loreLabel: "§5Vampire Blood" },
  [BOOK_ID.STRONGEST_SWORDSMAN]: { propertyKey: ENCHANT_PROPERTY.STRONGEST_SWORDSMAN, weaponId: SWORD_ID, loreLabel: "§cStrongest Swordsman" },
};

const BOSS_TYPE_IDS = new Set(["minecraft:ender_dragon", "minecraft:warden", "minecraft:elder_guardian", "minecraft:wither"]);

const CRITICAL_KNOCKBACK_HORIZONTAL = 1.3;
const CRITICAL_KNOCKBACK_VERTICAL = 0.45;
const VAMPIRE_BLOOD_REGEN_TICKS = 20 * 3;

export function registerCustomEnchants() {
  world.afterEvents.itemUse.subscribe((event) => {
    try {
      handleItemUse(event);
    } catch (error) {
      console.error(`Minepiece: custom enchant book use threw: ${error}`);
    }
  });

  world.afterEvents.entityHurt.subscribe((event) => {
    try {
      applyOnHitEffects(event);
    } catch (error) {
      console.error(`Minepiece: custom enchant on-hit effects threw: ${error}`);
    }
  });
}

function handleItemUse(event) {
  const player = event.source;
  if (player.typeId !== "minecraft:player") return;

  const usedId = event.itemStack.typeId;
  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;

  const singleBook = SINGLE_APPLY_BOOKS[usedId];
  if (singleBook) {
    applySingleBook(player, equippable, singleBook);
    return;
  }

  if (usedId === BOOK_ID.BIG_GAME_HUNTER_1) {
    handleBigGameHunterIUse(player, equippable);
    return;
  }

  if (usedId === BOOK_ID.BIG_GAME_HUNTER_2) {
    applyBigGameHunter(player, equippable, 2);
  }
}

function applySingleBook(player, equippable, book) {
  const weapon = equippable.getEquipment("Offhand");
  if (!weapon || weapon.typeId !== book.weaponId) {
    player.sendMessage(`§cHold the matching weapon in your other hand to apply this book.`);
    return;
  }
  if (weapon.getDynamicProperty(book.propertyKey) === true) {
    player.sendMessage("§cThat weapon already has this enchantment.");
    return;
  }

  weapon.setDynamicProperty(book.propertyKey, true);
  refreshCustomEnchantLore(weapon);
  equippable.setEquipment("Offhand", weapon);
  consumeOneMainhand(equippable);

  player.sendMessage(`§aApplied ${book.loreLabel}§a.`);
}

function handleBigGameHunterIUse(player, equippable) {
  const offhand = equippable.getEquipment("Offhand");

  if (offhand?.typeId === BOOK_ID.BIG_GAME_HUNTER_1) {
    // Combine two level-I books into one level-II book.
    consumeOneOffhand(equippable);
    consumeOneMainhand(equippable);
    const inventory = player.getComponent("minecraft:inventory")?.container;
    inventory?.addItem(new ItemStack(BOOK_ID.BIG_GAME_HUNTER_2, 1));
    player.sendMessage("§aCombined into a Big Game Hunter II book.");
    return;
  }

  if (offhand?.typeId === SABER_ID) {
    applyBigGameHunter(player, equippable, 1);
    return;
  }

  player.sendMessage("§cHold the Legendary Saber, or another Big Game Hunter I book, in your other hand.");
}

function applyBigGameHunter(player, equippable, level) {
  const weapon = equippable.getEquipment("Offhand");
  if (!weapon || weapon.typeId !== SABER_ID) {
    player.sendMessage("§cHold the Legendary Saber in your other hand to apply this book.");
    return;
  }

  const existingLevel = weapon.getDynamicProperty(ENCHANT_PROPERTY.BIG_GAME_HUNTER) ?? 0;
  if (existingLevel >= level) {
    player.sendMessage("§cThat weapon already has this level of Big Game Hunter or higher.");
    return;
  }

  weapon.setDynamicProperty(ENCHANT_PROPERTY.BIG_GAME_HUNTER, level);
  refreshCustomEnchantLore(weapon);
  equippable.setEquipment("Offhand", weapon);
  consumeOneMainhand(equippable);

  player.sendMessage(`§aApplied Big Game Hunter ${level === 2 ? "II" : "I"}§a.`);
}

function consumeOneMainhand(equippable) {
  const mainhand = equippable.getEquipment("Mainhand");
  if (!mainhand) return;
  if (mainhand.amount > 1) {
    const remaining = mainhand.clone();
    remaining.amount -= 1;
    equippable.setEquipment("Mainhand", remaining);
  } else {
    equippable.setEquipment("Mainhand", undefined);
  }
}

function consumeOneOffhand(equippable) {
  const offhand = equippable.getEquipment("Offhand");
  if (!offhand) return;
  if (offhand.amount > 1) {
    const remaining = offhand.clone();
    remaining.amount -= 1;
    equippable.setEquipment("Offhand", remaining);
  } else {
    equippable.setEquipment("Offhand", undefined);
  }
}

/** Rebuilds the weapon's lore from scratch off its current enchant flags, so re-applying never duplicates a line. */
function refreshCustomEnchantLore(weapon) {
  const lore = [];
  if (weapon.getDynamicProperty(ENCHANT_PROPERTY.CRITICAL_KNOCKBACK) === true) lore.push("§bCritical Knockback");
  const bghLevel = weapon.getDynamicProperty(ENCHANT_PROPERTY.BIG_GAME_HUNTER);
  if (bghLevel === 1) lore.push("§6Big Game Hunter I");
  if (bghLevel === 2) lore.push("§6Big Game Hunter II");
  if (weapon.getDynamicProperty(ENCHANT_PROPERTY.VAMPIRE_BLOOD) === true) lore.push("§5Vampire Blood");
  if (weapon.getDynamicProperty(ENCHANT_PROPERTY.STRONGEST_SWORDSMAN) === true) lore.push("§cStrongest Swordsman");
  weapon.setLore(lore);
}

function applyOnHitEffects(event) {
  if (event.damageSource?.cause === "override") return; // this file's own bonus-damage hits land through here too — never re-trigger on themselves.

  const attacker = event.damageSource?.damagingEntity;
  if (!attacker || attacker.typeId !== "minecraft:player") return;

  const mainhand = attacker.getComponent("minecraft:equippable")?.getEquipment("Mainhand");
  if (!mainhand) return;

  const target = event.hurtEntity;

  if (mainhand.typeId === SABER_ID) {
    if (mainhand.getDynamicProperty(ENCHANT_PROPERTY.CRITICAL_KNOCKBACK) === true) {
      knockbackAwayFrom(target, attacker.location, CRITICAL_KNOCKBACK_HORIZONTAL, CRITICAL_KNOCKBACK_VERTICAL);
    }

    const bghLevel = mainhand.getDynamicProperty(ENCHANT_PROPERTY.BIG_GAME_HUNTER);
    if (bghLevel && BOSS_TYPE_IDS.has(target.typeId)) {
      const multiplier = bghLevel === 2 ? 3 : 2;
      safeApplyDamage(target, event.damage * (multiplier - 1), { cause: "override", damagingEntity: attacker });
    }
    return;
  }

  if (mainhand.typeId === SWORD_ID) {
    if (mainhand.getDynamicProperty(ENCHANT_PROPERTY.VAMPIRE_BLOOD) === true) {
      safeAddEffect(attacker, "regeneration", VAMPIRE_BLOOD_REGEN_TICKS, { amplifier: 0, showParticles: false });
    }

    if (mainhand.getDynamicProperty(ENCHANT_PROPERTY.STRONGEST_SWORDSMAN) === true) {
      const targetMainhand = target.getComponent?.("minecraft:equippable")?.getEquipment("Mainhand");
      if (targetMainhand?.hasTag("minecraft:is_sword")) {
        safeApplyDamage(target, event.damage, { cause: "override", damagingEntity: attacker });
      }
    }
  }
}
