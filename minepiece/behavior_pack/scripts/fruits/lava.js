import { system } from "@minecraft/server";
import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getLookedAtEntity, getEntitiesInRadius, knockbackAwayFrom, safeApplyDamage } from "../core/targeting.js";
import { spawnParticle, spawnParticleBurst, playSound } from "../core/vfx.js";

const POOL_REVERT_TICKS = 20 * 6;
const MAGMA_WALKER_REVERT_TICKS = 20 * 5;
const MAGMA_WALKER_RADIUS = 1;

/** Fills a small disc of blocks with lava, remembering what was there so it can revert later. */
function createTemporaryLavaPool(dimension, center, radius, durationTicks) {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (dx * dx + dz * dz > radius * radius) continue;
      const location = { x: center.x + dx, y: center.y, z: center.z + dz };
      const block = dimension.getBlock(location);
      if (!block || !block.isAir) continue;

      dimension.setBlockType(location, "minecraft:lava");
      system.runTimeout(() => {
        try {
          dimension.setBlockType(location, "minecraft:air");
        } catch (error) {
          console.error(`Minepiece: lava pool revert threw: ${error}`);
        }
      }, durationTicks);
    }
  }
}

registerFruit({
  id: "lava",
  displayName: "Lava-Lava Fruit",
  category: "logia",
  itemId: `${NAMESPACE}:fruit_lava`,
  logiaWeaponOnlyDamage: true,
  waterImmune: false,

  abilities: [
    {
      id: "lava_fist",
      itemId: `${NAMESPACE}:ability_lava_fist`,
      name: "Lava Fist",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const forward = player.getViewDirection();
        const eye = player.getHeadLocation();

        for (let step = 1; step <= 4; step++) {
          const point = { x: eye.x + forward.x * step, y: eye.y + forward.y * step, z: eye.z + forward.z * step };
          spawnParticle(dimension, "minecraft:basic_flame_particle", point);
        }
        playSound(dimension, "liquid.lavapop", player.location);

        const target = getLookedAtEntity(player, 4);
        if (!target) return;
        spawnParticleBurst(dimension, "minecraft:basic_flame_particle", target.location, 8, 0.6);
        safeApplyDamage(target, 5, { cause: "entityAttack", damagingEntity: player });
        target.setOnFire(3, true);
      },
    },
    {
      id: "lava_pool",
      itemId: `${NAMESPACE}:ability_lava_pool`,
      name: "Lava Pool",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const hit = player.getBlockFromViewDirection({ maxDistance: 20 });
        if (!hit) return;

        const center = { x: hit.block.location.x, y: hit.block.location.y + 1, z: hit.block.location.z };
        createTemporaryLavaPool(dimension, center, 2, POOL_REVERT_TICKS);
        spawnParticleBurst(dimension, "minecraft:lava_particle", center, 10, 2);
        playSound(dimension, "bucket.empty_lava", center);
      },
    },
    {
      id: "lava_meteor",
      itemId: `${NAMESPACE}:ability_lava_meteor`,
      name: "Lava Meteor",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const hit = player.getBlockFromViewDirection({ maxDistance: 25 });
        if (!hit) return;
        const targetGround = { x: hit.block.location.x, y: hit.block.location.y + 1, z: hit.block.location.z };
        const skyStart = { x: targetGround.x + 0.5, y: targetGround.y + 15, z: targetGround.z + 0.5 };

        playSound(dimension, "mob.ghast.charge", targetGround);

        const fallSteps = 10;
        for (let i = 0; i <= fallSteps; i++) {
          system.runTimeout(() => {
            try {
              const progress = i / fallSteps;
              const point = {
                x: skyStart.x,
                y: skyStart.y - (skyStart.y - targetGround.y) * progress,
                z: skyStart.z,
              };
              spawnParticle(dimension, "minecraft:lava_particle", point);

              if (i === fallSteps) {
                spawnParticle(dimension, "minecraft:large_explosion", targetGround);
                spawnParticleBurst(dimension, "minecraft:lava_particle", targetGround, 16, 3);
                spawnParticleBurst(dimension, "minecraft:basic_flame_particle", targetGround, 10, 2.5);
                playSound(dimension, "random.explode", targetGround);
                for (const entity of getEntitiesInRadius(dimension, targetGround, 3, player)) {
                  entity.applyDamage(7, { cause: "magic", damagingEntity: player });
                  knockbackAwayFrom(entity, targetGround, 1, 0.3);
                }
                createTemporaryLavaPool(dimension, targetGround, 2, POOL_REVERT_TICKS);
              }
            } catch (error) {
              // Scheduled callbacks run outside abilityEngine's try/catch around the original
              // execute() call, so each needs its own — otherwise a throw here is unreported.
              console.error(`Minepiece: lava_meteor step ${i} threw: ${error}`);
            }
          }, i * 2);
        }
      },
    },
  ],

  passive: {
    onTick(player) {
      const dimension = player.dimension;
      const feet = player.location;

      for (let dx = -MAGMA_WALKER_RADIUS; dx <= MAGMA_WALKER_RADIUS; dx++) {
        for (let dz = -MAGMA_WALKER_RADIUS; dz <= MAGMA_WALKER_RADIUS; dz++) {
          const location = { x: Math.floor(feet.x) + dx, y: Math.floor(feet.y) - 1, z: Math.floor(feet.z) + dz };
          const block = dimension.getBlock(location);
          if (!block || block.typeId !== "minecraft:water") continue;

          dimension.setBlockType(location, "minecraft:magma");
          system.runTimeout(() => {
            try {
              const current = dimension.getBlock(location);
              if (current?.typeId === "minecraft:magma") dimension.setBlockType(location, "minecraft:water");
            } catch (error) {
              console.error(`Minepiece: magma walker revert threw: ${error}`);
            }
          }, MAGMA_WALKER_REVERT_TICKS);
        }
      }
    },
  },
});
