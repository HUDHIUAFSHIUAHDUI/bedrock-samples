import { system } from "@minecraft/server";
import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getLookedAtEntity, shootProjectile } from "../core/targeting.js";
import { spawnParticle, playSound } from "../core/vfx.js";

const SLIME_TRAP_REVERT_TICKS = 20 * 5;

registerFruit({
  id: "slime",
  displayName: "Slime-Slime Fruit",
  category: "paramecia",
  itemId: `${NAMESPACE}:fruit_slime`,
  logiaWeaponOnlyDamage: false,
  waterImmune: false,
  // "Slime feet": no fall damage, ever.
  cancelDamageCauses: ["fall"],

  abilities: [
    {
      id: "slime_shot",
      itemId: `${NAMESPACE}:ability_slime_shot`,
      name: "Slime Shot",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        // Vanilla snowballs deal no damage but do knock back on hit — an exact match for
        // "a slimeball that knocks enemies back" with zero extra scripting needed.
        shootProjectile(dimension, "minecraft:snowball", player.getHeadLocation(), player.getViewDirection(), 1.5, player);
        playSound(dimension, "mob.slime.small", player.location);
      },
    },
    {
      id: "slime_bounce",
      itemId: `${NAMESPACE}:ability_slime_bounce`,
      name: "Slime Bounce",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        player.applyImpulse({ x: 0, y: 1.8, z: 0 });
        spawnParticle(dimension, "minecraft:egg_destroy_emitter", player.location);
        playSound(dimension, "mob.slime.jump", player.location);
      },
    },
    {
      id: "slime_trap",
      itemId: `${NAMESPACE}:ability_slime_trap`,
      name: "Slime Trap",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const target = getLookedAtEntity(player, 15);
        if (!target) return;

        const blockLocation = { x: Math.floor(target.location.x), y: Math.floor(target.location.y) - 1, z: Math.floor(target.location.z) };
        const block = dimension.getBlock(blockLocation);
        if (block && !block.isAir) {
          const previousTypeId = block.typeId;
          dimension.setBlockType(blockLocation, "minecraft:slime");
          system.runTimeout(() => dimension.setBlockType(blockLocation, previousTypeId), SLIME_TRAP_REVERT_TICKS);
        }

        target.applyKnockback({ x: 0, z: 0 }, 1.2);
        spawnParticle(dimension, "minecraft:egg_destroy_emitter", target.location);
        playSound(dimension, "mob.slime.big", target.location);
      },
    },
  ],
});
