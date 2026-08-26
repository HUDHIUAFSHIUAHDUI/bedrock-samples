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
 * blocks of any sampled point. Used by every "shoots a beam/stream in a
 * straight line" ability (Water Jet, Beacon Beam) so each one doesn't
 * reinvent line-tracing.
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
 *
 * Swallows and logs any failure to spawn (e.g. an unloaded chunk at an
 * unusual spawn point, like Arrow Rain's high-altitude spawn points) rather
 * than throwing — this is called in loops that fire several projectiles per
 * ability, and one bad spawn point should never cancel the rest of them.
 * @returns {import("@minecraft/server").Entity | undefined} the spawned projectile, or undefined on failure
 */
export function shootProjectile(dimension, projectileEntityId, origin, direction, speed, owner, tags = []) {
  try {
    const projectile = dimension.spawnEntity(projectileEntityId, origin);
    for (const tag of tags) projectile.addTag(tag);

    const projectileComponent = projectile.getComponent("minecraft:projectile");
    if (projectileComponent) {
      projectileComponent.owner = owner;
      projectileComponent.shoot(scale(direction, speed));
    }
    return projectile;
  } catch (error) {
    console.error(`Minepiece: shootProjectile(${projectileEntityId}) threw: ${error}`);
    return undefined;
  }
}

/**
 * Applies damage to `entity`, swallowing any throw (e.g. the entity became invalid between being
 * queried and being hit, in the same tick). Every ability that damages more than one entity per
 * cast should loop with this instead of calling entity.applyDamage directly, so one bad entity in
 * a crowd can't cut the rest of that crowd out of the ability.
 */
export function safeApplyDamage(entity, amount, options) {
  try {
    entity.applyDamage(amount, options);
  } catch (error) {
    console.error(`Minepiece: applyDamage threw: ${error}`);
  }
}

/** Same reasoning as {@link safeApplyDamage}, for entity.addEffect. */
export function safeAddEffect(entity, effectType, duration, options) {
  try {
    entity.addEffect(effectType, duration, options);
  } catch (error) {
    console.error(`Minepiece: addEffect(${effectType}) threw: ${error}`);
  }
}

/**
 * Applies knockback to `entity`, swallowing any throw. Some entities (e.g. Zoan mount entities, or
 * an entity that just became invalid) can reject applyKnockback — every knockback call in this add-on
 * goes through here (or {@link knockbackAwayFrom}) instead of calling entity.applyKnockback directly,
 * so one troublesome entity in a crowd can never abort the rest of an ability partway through.
 */
export function safeApplyKnockback(entity, horizontalForce, verticalStrength) {
  try {
    entity.applyKnockback(horizontalForce, verticalStrength);
  } catch {
    // Best-effort; not every entity accepts knockback.
  }
}

/** Knocks `entity` directly away from `sourceLocation` on the horizontal plane. */
export function knockbackAwayFrom(entity, sourceLocation, horizontalStrength, verticalStrength) {
  const dx = entity.location.x - sourceLocation.x;
  const dz = entity.location.z - sourceLocation.z;
  const length = Math.sqrt(dx * dx + dz * dz) || 1;
  safeApplyKnockback(entity, { x: (dx / length) * horizontalStrength, z: (dz / length) * horizontalStrength }, verticalStrength);
}
