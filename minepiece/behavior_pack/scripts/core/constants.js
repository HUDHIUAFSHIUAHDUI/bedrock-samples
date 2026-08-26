/**
 * Shared literals used across the whole add-on. Keeping these in one place
 * means renaming the namespace, tuning the cooldown default, or changing the
 * water-damage tick rate never requires touching more than this file.
 */

/** Every item/entity identifier in this add-on is under this namespace. */
export const NAMESPACE = "minepiece";

/** Default ability cooldown, in seconds, per the design brief (10s, except Zoan transforms). */
export const DEFAULT_COOLDOWN_SECONDS = 10;

/** How often (in ticks) the passive-ability loop runs for each online player. 20 ticks = 1 second. */
export const PASSIVE_TICK_INTERVAL = 20;

/** How often (in ticks) the Devil Fruit water-weakness check runs. */
export const WATER_DAMAGE_TICK_INTERVAL = 20;

/** Damage dealt per water-damage tick to a non-immune fruit user standing in water. */
export const WATER_DAMAGE_AMOUNT = 1;

/** How often (in ticks) Super Hearing / Sculk Sense / other radius scans run. */
export const RADIUS_SCAN_TICK_INTERVAL = 20;

/** Dynamic property keys stored on the Player entity. See core/playerState.js for accessors. */
export const PROPERTY = {
  /** The fruit id (e.g. "sculk") the player has eaten, or undefined if none. */
  FRUIT_ID: `${NAMESPACE}:fruit_id`,
  /** "1" while the player is currently transformed (Zoan fruits only). */
  TRANSFORMED: `${NAMESPACE}:transformed`,
  /** Id of the currently-ridden transformation-form entity, so it can be found again/cleaned up. */
  TRANSFORM_ENTITY_ID: `${NAMESPACE}:transform_entity_id`,
  /** "1" while an infinite-duration toggle ability (e.g. Beacon Boost) is active. */
  BEACON_BOOST_ACTIVE: `${NAMESPACE}:beacon_boost_active`,
  /** Tick timestamp (system.currentTick) a per-ability cooldown ends at. Suffixed with the ability id. */
  COOLDOWN_PREFIX: `${NAMESPACE}:cd_`,
  /** Tracks the last block position a foot-effect (magma walker / light producer) was placed at. */
  LAST_FOOT_BLOCK: `${NAMESPACE}:last_foot_block`,
};

/** Entity damage causes the game itself already treats as "a weapon hit". */
export const WEAPON_DAMAGE_CAUSES = new Set(["entityAttack", "projectile"]);
