import { system } from "@minecraft/server";
import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getHostileTargetsInRadius } from "../core/targeting.js";
import { damageAndKnockbackArea } from "../core/projectileEffects.js";
import { spawnParticle, playSound } from "../core/vfx.js";

const SPIKE_BLOCK_REVERT_TICKS = 20 * 4;

function floorBlockLocation(location) {
  return { x: Math.floor(location.x), y: Math.floor(location.y) - 1, z: Math.floor(location.z) };
}

registerFruit({
  id: "sculk",
  displayName: "Sculk-Sculk Fruit",
  category: "logia",
  itemId: `${NAMESPACE}:fruit_sculk`,
  logiaWeaponOnlyDamage: true,
  waterImmune: false,

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
            system.runTimeout(() => dimension.setBlockType(blockLocation, previousTypeId), SPIKE_BLOCK_REVERT_TICKS);
          }

          spawnParticle(dimension, "minecraft:sculk_charge_particle", target.location);
          target.applyDamage(3, { cause: "magic", damagingEntity: player });
          target.applyKnockback({ x: 0, z: 0 }, 0.5);
        }
      },
    },
    {
      id: "sculk_sense",
      itemId: `${NAMESPACE}:ability_sculk_sense`,
      name: "Sculk Sense",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        spawnParticle(dimension, "minecraft:sculk_soul_particle", player.location);
        playSound(dimension, "use.sculk_sensor", player.location);

        for (const target of getHostileTargetsInRadius(dimension, player.location, 24, player)) {
          target.addEffect("glowing", 20 * 5, { amplifier: 0, showParticles: false });
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
        spawnParticle(dimension, "minecraft:sculk_charge_pop_particle", player.location);
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
