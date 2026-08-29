/**
 * The shared "which vanilla sword materials give what bonus" table behind both the offhand boost
 * system (core/offhandBoost.js) and the sword-helmet system (core/helmetSword.js) — kept in one
 * place so the two systems can never disagree about tiers. Mirrors tools/gen_sword_boosts.py,
 * which is what actually generates the `{material}_plusN` display-variant items this table refers
 * to; if a material is added here, it needs a matching entry there too, and vice versa.
 */

export const BOOSTABLE_MATERIAL_IDS = [
  "minecraft:wooden_sword",
  "minecraft:copper_sword",
  "minecraft:stone_sword",
  "minecraft:golden_sword",
  "minecraft:iron_sword",
  "minecraft:diamond_sword",
  "minecraft:netherite_sword",
];

const BASE_MATERIAL_ID_SET = new Set(BOOSTABLE_MATERIAL_IDS);

/** How much bonus damage this material grants when it's the one sitting in the offhand/helmet slot. */
export const BONUS_BY_MATERIAL_ID = {
  "minecraft:wooden_sword": 1,
  "minecraft:copper_sword": 1,
  "minecraft:stone_sword": 1,
  "minecraft:golden_sword": 1,
  "minecraft:iron_sword": 1,
  "minecraft:diamond_sword": 2,
  "minecraft:netherite_sword": 3,
};

/** True for a plain base-material sword id (not a boosted variant, not some unrelated item). */
export function isBaseMaterialSword(typeId) {
  return BASE_MATERIAL_ID_SET.has(typeId);
}

/** For a `{material}_plusN` variant id, the plain base material id it stands in for; undefined for anything else. */
export function baseMaterialOfVariant(typeId) {
  for (const materialId of BOOSTABLE_MATERIAL_IDS) {
    const short = materialId.split(":")[1];
    if (typeId === `minepiece:${short}_plus1` || typeId === `minepiece:${short}_plus2` || typeId === `minepiece:${short}_plus3`) {
      return materialId;
    }
  }
  return undefined;
}

/** The `{material}_plusN` variant item id for a given base material id and bonus tier (1-3). */
export function variantId(baseMaterialId, bonus) {
  const short = baseMaterialId.split(":")[1];
  return `minepiece:${short}_plus${bonus}`;
}
