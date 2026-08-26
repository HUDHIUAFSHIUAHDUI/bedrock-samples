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

/**
 * Spawns `count` copies of a particle scattered randomly within `spread` blocks of `center` —
 * a single spawnParticle call reads as a small puff; this reads as a proper burst/impact.
 * Used for the "big hit" moment abilities want to sell (an explosion, a slam, a cast-off).
 */
export function spawnParticleBurst(dimension, particleId, center, count = 8, spread = 1.5) {
  for (let i = 0; i < count; i++) {
    const point = {
      x: center.x + (Math.random() - 0.5) * 2 * spread,
      y: center.y + Math.random() * spread,
      z: center.z + (Math.random() - 0.5) * 2 * spread,
    };
    spawnParticle(dimension, particleId, point);
  }
}

/** @param {import("@minecraft/server").Dimension} dimension */
export function playSound(dimension, soundId, location, options) {
  try {
    dimension.playSound(soundId, location, options);
  } catch {
    // Same reasoning as spawnParticle: cosmetic-only, never worth breaking an ability over.
  }
}
