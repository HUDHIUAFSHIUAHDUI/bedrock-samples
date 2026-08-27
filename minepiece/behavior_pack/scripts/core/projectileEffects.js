import { world } from "@minecraft/server";
import { getEntitiesInRadius, knockbackAwayFrom } from "./targeting.js";

/**
 * Tags a fired projectile can carry so a single shared listener can give it
 * special on-impact behavior, instead of every ability that wants "hits
 * summon lightning" or "hits apply a random debuff" writing its own
 * projectileHit subscription. Any fruit can reuse these tags on any
 * projectile entity it spawns.
 */
export const PROJECTILE_FX = {
  /** Summons a real lightning bolt at the impact point (Copper & Trident "Lightning Strike"). */
  LIGHTNING: "minepiece:fx_lightning",
  /** Applies one random negative status effect to whatever entity it hits (Arrow-Arrow "Arrow Shot"). */
  RANDOM_DEBUFF: "minepiece:fx_random_debuff",
};

/** Shared "these are the bad ones" list — reused by Arrow-Arrow's random debuff and Potion-Potion's negative-effect cleanse. */
export const NEGATIVE_EFFECTS = [
  "poison",
  "slowness",
  "weakness",
  "nausea",
  "blindness",
  "mining_fatigue",
  "wither",
  "hunger",
  "instant_damage",
];

function randomNegativeEffect() {
  return NEGATIVE_EFFECTS[Math.floor(Math.random() * NEGATIVE_EFFECTS.length)];
}

export function registerProjectileEffects() {
  world.afterEvents.projectileHitBlock.subscribe((event) => {
    try {
      handleImpact(event, event.location);
    } catch (error) {
      console.error(`Minepiece: projectileHitBlock threw: ${error}`);
    }
  });

  world.afterEvents.projectileHitEntity.subscribe((event) => {
    try {
      handleImpact(event, event.location);

      if (event.projectile.hasTag(PROJECTILE_FX.RANDOM_DEBUFF)) {
        const hitEntity = event.getEntityHit().entity;
        hitEntity?.addEffect(randomNegativeEffect(), 20 * 6, { amplifier: 1 });
      }
    } catch (error) {
      console.error(`Minepiece: projectileHitEntity threw: ${error}`);
    }
  });
}

function handleImpact(event, location) {
  if (event.projectile.hasTag(PROJECTILE_FX.LIGHTNING)) {
    event.dimension.spawnEntity("minecraft:lightning_bolt", location);
  }
}

/** Convenience for abilities that just want "damage + knock back everything within radius of a point". */
export function damageAndKnockbackArea(dimension, center, radius, exclude, damage, horizontalKnockback, verticalKnockback) {
  for (const entity of getEntitiesInRadius(dimension, center, radius, exclude)) {
    try {
      entity.applyDamage(damage, { cause: "entityAttack", damagingEntity: exclude });
    } catch (error) {
      // One entity rejecting damage (e.g. mid-removal) must never stop the rest of the crowd
      // from taking damage/knockback.
      console.error(`Minepiece: damageAndKnockbackArea applyDamage threw: ${error}`);
    }
    knockbackAwayFrom(entity, center, horizontalKnockback, verticalKnockback);
  }
}
