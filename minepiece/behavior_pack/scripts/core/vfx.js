/**
 * Every "strong attack" particle/sound call in this add-on goes through here.
 * Centralizing it means a bad location (e.g. an unloaded chunk on the world
 * border) can't crash an ability halfway through — it just skips that one
 * effect — and it gives one place to swap vanilla particle ids for custom
 * ones later.
 */

/** @param {import("@minecraft/server").Dimension} dimension */
export function spawnParticle(dimension, particleId, location, molangVariables) {
  try {
    dimension.spawnParticle(particleId, location, molangVariables);
  } catch {
    // Particle ids can silently fail to resolve in an unloaded chunk; never let VFX break gameplay.
  }
}

/** Convenience for spawning the same particle at several points, e.g. a trail. */
export function spawnParticleTrail(dimension, particleId, points) {
  for (const point of points) spawnParticle(dimension, particleId, point);
}

/** @param {import("@minecraft/server").Dimension} dimension */
export function playSound(dimension, soundId, location, options) {
  try {
    dimension.playSound(soundId, location, options);
  } catch {
    // Same reasoning as spawnParticle: cosmetic-only, never worth breaking an ability over.
  }
}
