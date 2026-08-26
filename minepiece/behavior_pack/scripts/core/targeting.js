/**
 * Small, reusable spatial-query helpers so individual abilities don't each
 * reimplement "who's near me" or "what am I looking at".
 */

/**
 * All entities within `radius` blocks of `location`, excluding the caster itself.
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} location
 * @param {number} radius
 * @param {import("@minecraft/server").Entity} exclude usually the caster
 * @param {import("@minecraft/server").EntityQueryOptions} [extraOptions]
 */
export function getEntitiesInRadius(dimension, location, radius, exclude, extraOptions = {}) {
  const found = dimension.getEntities({
    location,
    maxDistance: radius,
    ...extraOptions,
  });
  return exclude ? found.filter((entity) => entity.id !== exclude.id) : found;
}

/** Same as {@link getEntitiesInRadius} but restricted to hostile-ish targets (players + non-player mobs, never the caster). */
export function getHostileTargetsInRadius(dimension, location, radius, caster) {
  return getEntitiesInRadius(dimension, location, radius, caster).filter(
    (entity) => entity.typeId !== "minecraft:item" && entity.typeId !== "minecraft:xp_orb"
  );
}

/** The first entity directly in front of `player`'s crosshair within `maxDistance`, if any. */
export function getLookedAtEntity(player, maxDistance = 20) {
  const hits = player.getEntitiesFromViewDirection({ maxDistance });
  return hits.length > 0 ? hits[0].entity : undefined;
}

/** A point `distance` blocks in front of the player's eyes, along their view direction. */
export function getForwardPoint(player, distance) {
  const eye = player.getHeadLocation();
  const dir = player.getViewDirection();
  return {
    x: eye.x + dir.x * distance,
    y: eye.y + dir.y * distance,
    z: eye.z + dir.z * distance,
  };
}

/** The player's view direction flattened onto the horizontal plane and re-normalized (no up/down component). */
export function getFlatForward(player) {
  const dir = player.getViewDirection();
  const length = Math.sqrt(dir.x * dir.x + dir.z * dir.z) || 1;
  return { x: dir.x / length, y: 0, z: dir.z / length };
}

/**
 * Samples points every block along a straight beam from `origin` in
 * `direction` for `length` blocks, and collects every entity within `width`
 * blocks of any sampled point. Used by every "shoots a beam/stream/breath in
 * a straight line" ability (Warden Sonic Boom, Water Jet, Beacon Beam,
 * Dragon Breath) so each one doesn't reinvent line-tracing.
 * @returns {{points: import("@minecraft/server").Vector3[], entities: import("@minecraft/server").Entity[]}}
 */
export function traceBeam(dimension, origin, direction, length, width, exclude) {
  const points = [];
  const hitIds = new Set();
  const entities = [];

  for (let step = 1; step <= length; step++) {
    const point = add(origin, scale(direction, step));
    points.push(point);

    for (const entity of getEntitiesInRadius(dimension, point, width, exclude)) {
      if (!hitIds.has(entity.id)) {
        hitIds.add(entity.id);
        entities.push(entity);
      }
    }
  }

  return { points, entities };
}

export function scale(vector, factor) {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/** Rotates a direction vector around the vertical (Y) axis by `degrees`. Used for spread-shot abilities. */
export function rotateAroundY(direction, degrees) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: direction.x * cos - direction.z * sin,
    y: direction.y,
    z: direction.x * sin + direction.z * cos,
  };
}

/**
 * Spawns and fires a real vanilla projectile entity (arrow, fireball,
 * thrown_trident, etc.) from `origin` toward `direction` at `speed`,
 * attributing hits to `owner` and tagging it so projectileEffects.js can
 * give it special on-impact behavior.
 * @returns {import("@minecraft/server").Entity} the spawned projectile
 */
export function shootProjectile(dimension, projectileEntityId, origin, direction, speed, owner, tags = []) {
  const projectile = dimension.spawnEntity(projectileEntityId, origin);
  for (const tag of tags) projectile.addTag(tag);

  const projectileComponent = projectile.getComponent("minecraft:projectile");
  if (projectileComponent) {
    projectileComponent.owner = owner;
    projectileComponent.shoot(scale(direction, speed));
  }
  return projectile;
}

/** Knocks `entity` directly away from `sourceLocation` on the horizontal plane. */
export function knockbackAwayFrom(entity, sourceLocation, horizontalStrength, verticalStrength) {
  const dx = entity.location.x - sourceLocation.x;
  const dz = entity.location.z - sourceLocation.z;
  const length = Math.sqrt(dx * dx + dz * dz) || 1;
  try {
    entity.applyKnockback({ x: (dx / length) * horizontalStrength, z: (dz / length) * horizontalStrength }, verticalStrength);
  } catch {
    // Some entities (e.g. other Zoan mounts) can reject knockback; never let VFX/CC break the rest of an ability.
  }
}
