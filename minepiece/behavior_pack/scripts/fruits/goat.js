import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getLookedAtEntity, getEntitiesInRadius, safeApplyDamage, knockbackAwayFrom } from "../core/targeting.js";
import { spawnParticleBurst, playSound } from "../core/vfx.js";

registerFruit({
  id: "goat",
  displayName: "Goat Horn-Goat Horn Fruit",
  itemId: `${NAMESPACE}:fruit_goat`,

  abilities: [
    {
      id: "horn_blast",
      itemId: `${NAMESPACE}:ability_horn_blast`,
      name: "Horn Blast",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        playSound(dimension, "horn.call.0", player.location);
        spawnParticleBurst(dimension, "minecraft:knockback_roar_particle", player.location, 10, 2);

        for (const entity of getEntitiesInRadius(dimension, player.location, 6, player)) {
          knockbackAwayFrom(entity, player.location, 1.6, 0.4);
        }
      },
    },
    {
      id: "horn_punch",
      itemId: `${NAMESPACE}:ability_horn_punch`,
      name: "Horn Punch",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const target = getLookedAtEntity(player, 4);
        if (!target) return;

        safeApplyDamage(target, 1, { cause: "entityAttack", damagingEntity: player });
        knockbackAwayFrom(target, player.location, 3.5, 1.2);
        spawnParticleBurst(dimension, "minecraft:critical_hit_emitter", target.location, 6, 0.5);
        playSound(dimension, "mob.goat.ram_impact", target.location);
      },
    },
    {
      id: "war_horn",
      itemId: `${NAMESPACE}:ability_war_horn`,
      name: "War Horn",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        playSound(dimension, "horn.call.1", player.location);
        spawnParticleBurst(dimension, "minecraft:knockback_roar_particle", player.location, 20, 4);

        for (const entity of getEntitiesInRadius(dimension, player.location, 10, player)) {
          safeApplyDamage(entity, 2, { cause: "entityAttack", damagingEntity: player });
          knockbackAwayFrom(entity, player.location, 2.5, 0.5);
        }
      },
    },
  ],

  passive: {
    // "Goat Legs": constant Speed I.
    onTick(player) {
      player.addEffect("speed", 40, { amplifier: 0, showParticles: false });
    },
  },
});
