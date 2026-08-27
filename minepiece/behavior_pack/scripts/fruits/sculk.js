import { system } from "@minecraft/server";
import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getHostileTargetsInRadius, safeApplyKnockback, safeApplyDamage, safeAddEffect } from "../core/targeting.js";
import { damageAndKnockbackArea } from "../core/projectileEffects.js";
import { spawnParticle, spawnParticleBurst, playSound } from "../core/vfx.js";

const SPIKE_BLOCK_REVERT_TICKS = 20 * 4;

function floorBlockLocation(location) {
  return { x: Math.floor(location.x), y: Math.floor(location.y) - 1, z: Math.floor(location.z) };
}

registerFruit({
  id: "sculk",
  displayName: "Sculk-Sculk Fruit",
  itemId: `${NAMESPACE}:fruit_sculk`,

  abilities: [
    {
      id: "sculk_spikes",
      itemId: `${NAMESPACE}:ability_sculk_spikes`,
      name: "Sculk Spikes",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const targets = getHostileTargetsInRadius(dimension, player.location, 8, player);
        playSound(dimension, "charge.sculk", player.location);

        for (const target of targets) {
          const blockLocation = floorBlockLocation(target.location);
          const block = dimension.getBlock(blockLocation);
          if (block && !block.isAir) {
            const previousTypeId = block.typeId;
            dimension.setBlockType(blockLocation, "minecraft:sculk");
            system.runTimeout(() => {
              try {
                dimension.setBlockType(blockLocation, previousTypeId);
              } catch (error) {
                console.error(`Minepiece: sculk spike revert threw: ${error}`);
              }
            }, SPIKE_BLOCK_REVERT_TICKS);
          }

          spawnParticleBurst(dimension, "minecraft:sculk_charge_particle", target.location, 6, 0.6);
          safeApplyDamage(target, 3, { cause: "magic", damagingEntity: player });
          safeApplyKnockback(target, { x: 0, z: 0 }, 0.5);
        }
      },
    },
    {
      id: "sculk_sense",
      itemId: `${NAMESPACE}:ability_sculk_sense`,
      name: "Sculk Sense",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        spawnParticleBurst(dimension, "minecraft:sculk_soul_particle", player.location, 8, 1.2);
        playSound(dimension, "use.sculk_sensor", player.location);

        for (const target of getHostileTargetsInRadius(dimension, player.location, 24, player)) {
          safeAddEffect(target, "glowing", 20 * 5, { amplifier: 0, showParticles: false });
        }
      },
    },
    {
      id: "sculk_explosion",
      itemId: `${NAMESPACE}:ability_sculk_explosion`,
      name: "Sculk Explosion",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const radius = 6;
        spawnParticleBurst(dimension, "minecraft:sculk_charge_pop_particle", player.location, 14, radius * 0.6);
        spawnParticleBurst(dimension, "minecraft:sculk_soul_particle", player.location, 8, radius * 0.4);
        playSound(dimension, "shriek.sculk_shrieker", player.location);

        damageAndKnockbackArea(dimension, player.location, radius, player, 6, 1.5, 0.4);

        // Permanently seeds sculk into the ground at the blast site, per the ability's spec.
        const center = { x: Math.floor(player.location.x), z: Math.floor(player.location.z) };
        for (let dx = -3; dx <= 3; dx++) {
          for (let dz = -3; dz <= 3; dz++) {
            if (dx * dx + dz * dz > 9) continue;
            const topBlock = dimension.getTopmostBlock({ x: center.x + dx, z: center.z + dz });
            if (topBlock && !topBlock.isAir) {
              dimension.setBlockType(topBlock.location, "minecraft:sculk");
            }
          }
        }
      },
    },
  ],

  passive: {
    onKillHostile(player, deadEntity) {
      const topBlock = player.dimension.getTopmostBlock({ x: deadEntity.location.x, z: deadEntity.location.z });
      if (topBlock && !topBlock.isAir) {
        player.dimension.setBlockType(topBlock.location, "minecraft:sculk_catalyst");
        spawnParticle(player.dimension, "minecraft:sculk_soul_particle", deadEntity.location);
        playSound(player.dimension, "bloom.sculk_catalyst", deadEntity.location);
      }
    },
  },
});
