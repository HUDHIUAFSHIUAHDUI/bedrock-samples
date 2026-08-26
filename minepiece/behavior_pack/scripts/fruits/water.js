import { system } from "@minecraft/server";
import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { traceBeam, getLookedAtEntity } from "../core/targeting.js";
import { spawnParticle, playSound } from "../core/vfx.js";

const PRISON_REVERT_TICKS = 20 * 4;

registerFruit({
  id: "water",
  displayName: "Water-Water Fruit",
  category: "logia",
  itemId: `${NAMESPACE}:fruit_water`,
  logiaWeaponOnlyDamage: true,
  // Devil Fruit water damage is overridden entirely for this fruit — see passive below.
  waterImmune: true,

  abilities: [
    {
      id: "water_jet",
      itemId: `${NAMESPACE}:ability_water_jet`,
      name: "Water Jet",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const origin = player.getHeadLocation();
        const forward = player.getViewDirection();
        const { points, entities } = traceBeam(dimension, origin, forward, 12, 1.5, player);

        for (const point of points) spawnParticle(dimension, "minecraft:water_wake_particle", point);
        playSound(dimension, "entity.generic.splash", origin);

        for (const entity of entities) {
          entity.applyKnockback({ x: forward.x * 3, z: forward.z * 3 }, 0.2);
        }
      },
    },
    {
      id: "water_prison",
      itemId: `${NAMESPACE}:ability_water_prison`,
      name: "Water Prison",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const target = getLookedAtEntity(player, 15);
        if (!target) return;

        const center = { x: Math.floor(target.location.x), y: Math.floor(target.location.y), z: Math.floor(target.location.z) };
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = 0; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
              const location = { x: center.x + dx, y: center.y + dy, z: center.z + dz };
              const block = dimension.getBlock(location);
              if (!block || !block.isAir) continue;

              dimension.setBlockType(location, "minecraft:water");
              system.runTimeout(() => dimension.setBlockType(location, "minecraft:air"), PRISON_REVERT_TICKS);
            }
          }
        }

        spawnParticle(dimension, "minecraft:water_splash_particle", target.location);
        playSound(dimension, "random.splash", target.location);
      },
    },
    {
      id: "tidal_crash",
      itemId: `${NAMESPACE}:ability_tidal_crash`,
      name: "Tidal Crash",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const origin = player.getHeadLocation();
        const forward = player.getViewDirection();
        const { points, entities } = traceBeam(dimension, origin, forward, 10, 4, player);

        for (const point of points) spawnParticle(dimension, "minecraft:water_splash_particle", point);
        playSound(dimension, "mob.dolphin.splash", origin);

        for (const entity of entities) {
          entity.applyKnockback({ x: forward.x * 2.5, z: forward.z * 2.5 }, 0.5);
        }
      },
    },
  ],

  passive: {
    onTick(player) {
      if (player.isInWater) {
        player.addEffect("dolphins_grace", 20 * 4, { amplifier: 0, showParticles: false });
      }
    },
  },
});
