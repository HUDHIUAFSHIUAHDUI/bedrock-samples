import { system } from "@minecraft/server";
import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { shootProjectile, getNearestNonPlayerEntity, scale } from "../core/targeting.js";
import { spawnParticle, spawnParticleBurst, playSound } from "../core/vfx.js";

const SHULKER_BULLET_SPEED = 1.5;
const HOMING_RETARGET_TICKS = 4;
const HOMING_DURATION_TICKS = 20 * 4;
const HOMING_SEARCH_RADIUS = 20;

registerFruit({
  id: "shulker",
  displayName: "Shulker-Shulker Fruit",
  itemId: `${NAMESPACE}:fruit_shulker`,

  abilities: [
    {
      id: "shulker_shot",
      itemId: `${NAMESPACE}:ability_shulker_shot`,
      name: "Shulker Shot",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const origin = player.getHeadLocation();
        const firstTarget = getNearestNonPlayerEntity(dimension, origin, HOMING_SEARCH_RADIUS, player);
        const initialDirection = firstTarget ? normalizedDirectionTo(origin, firstTarget.location) : player.getViewDirection();

        const bullet = shootProjectile(dimension, "minecraft:shulker_bullet", origin, initialDirection, SHULKER_BULLET_SPEED, player);
        playSound(dimension, "mob.shulker.shoot", player.location);
        if (bullet) retarget(dimension, bullet, player, 0);
      },
    },
    {
      id: "ender_pearl_toss",
      itemId: `${NAMESPACE}:ability_ender_pearl_toss`,
      name: "Ender Pearl",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        shootProjectile(dimension, "minecraft:ender_pearl", player.getHeadLocation(), player.getViewDirection(), 2.5, player);
        playSound(dimension, "mob.endermen.portal", player.location);
        spawnParticleBurst(dimension, "minecraft:portal_particle", player.getHeadLocation(), 6, 0.4);
      },
    },
    {
      id: "levitate",
      itemId: `${NAMESPACE}:ability_levitate`,
      name: "Levitate",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        player.addEffect("levitation", 20 * 3, { amplifier: 0, showParticles: true });
        spawnParticleBurst(dimension, "minecraft:endrod_particle", player.location, 10, 0.6);
        playSound(dimension, "mob.shulker.teleport", player.location);
      },
    },
  ],

  passive: {
    // "Shulker Sense": a hit taken at full health teleports the player 10 blocks away — never seen it coming.
    onHurtAfter(player, event) {
      const health = player.getComponent("minecraft:health");
      if (!health) return;

      const wasFullHealth = health.currentValue + event.damage >= health.effectiveMax;
      if (!wasFullHealth) return;

      const angle = Math.random() * Math.PI * 2;
      const destination = {
        x: player.location.x + Math.cos(angle) * 10,
        y: player.location.y,
        z: player.location.z + Math.sin(angle) * 10,
      };
      try {
        player.teleport(destination);
        spawnParticleBurst(player.dimension, "minecraft:portal_particle", player.location, 10, 0.6);
        playSound(player.dimension, "mob.shulker.teleport", destination);
      } catch (error) {
        console.error(`Minepiece: shulker sense teleport threw: ${error}`);
      }
    },
  },
});

/** Unit vector from `from` to `to`; falls back to straight up if the two points coincide (avoids a divide-by-zero). */
function normalizedDirectionTo(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < 0.0001) return { x: 0, y: 1, z: 0 };
  return { x: dx / length, y: dy / length, z: dz / length };
}

/** Nudges an in-flight shulker bullet toward the nearest non-player entity every few ticks, for a limited time — a lightweight stand-in for vanilla's homing AI, which isn't available for a manually spawned projectile via the Script API. */
function retarget(dimension, bullet, caster, elapsedTicks) {
  system.runTimeout(() => {
    try {
      if (!bullet.isValid) return;
      if (elapsedTicks >= HOMING_DURATION_TICKS) return;

      const target = getNearestNonPlayerEntity(dimension, bullet.location, HOMING_SEARCH_RADIUS, caster);
      if (target) {
        const aimPoint = { x: target.location.x, y: target.location.y + 1, z: target.location.z };
        const direction = normalizedDirectionTo(bullet.location, aimPoint);
        const projectileComponent = bullet.getComponent("minecraft:projectile");
        projectileComponent?.shoot(scale(direction, SHULKER_BULLET_SPEED));
        spawnParticle(dimension, "minecraft:portal_particle", bullet.location);
      }

      retarget(dimension, bullet, caster, elapsedTicks + HOMING_RETARGET_TICKS);
    } catch (error) {
      console.error(`Minepiece: shulker bullet retarget threw: ${error}`);
    }
  }, HOMING_RETARGET_TICKS);
}
