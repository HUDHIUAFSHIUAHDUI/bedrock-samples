import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { shootProjectile, rotateAroundY } from "../core/targeting.js";
import { spawnParticleBurst, playSound } from "../core/vfx.js";

const FIRE_RESISTANCE_DURATION_TICKS = 1_000_000;

registerFruit({
  id: "ghast",
  displayName: "Ghast-Ghast Fruit",
  category: "zoan",
  itemId: `${NAMESPACE}:fruit_ghast`,
  logiaWeaponOnlyDamage: false,
  waterImmune: false,

  abilities: [
    {
      id: "ghast_fireball",
      itemId: `${NAMESPACE}:ability_ghast_fireball`,
      name: "Ghast Fireball",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        spawnParticleBurst(dimension, "minecraft:basic_flame_particle", player.getHeadLocation(), 6, 0.5);
        shootProjectile(dimension, "minecraft:fireball", player.getHeadLocation(), player.getViewDirection(), 1.3, player);
        playSound(dimension, "mob.ghast.fireball", player.location);
      },
    },
    {
      id: "ghast_barrage",
      itemId: `${NAMESPACE}:ability_ghast_barrage`,
      name: "Ghast Barrage",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const origin = player.getHeadLocation();
        const forward = player.getViewDirection();

        spawnParticleBurst(dimension, "minecraft:basic_flame_particle", origin, 10, 0.7);
        for (const spreadDegrees of [-15, 0, 15]) {
          shootProjectile(dimension, "minecraft:small_fireball", origin, rotateAroundY(forward, spreadDegrees), 1.3, player);
        }
        playSound(dimension, "mob.ghast.charge", player.location);
      },
    },
  ],

  transform: {
    itemId: `${NAMESPACE}:transform_ghast`,
    formEntityId: `${NAMESPACE}:form_ghast`,
  },

  passive: {
    onFirstEquip(player) {
      player.addEffect("fire_resistance", FIRE_RESISTANCE_DURATION_TICKS, { amplifier: 0, showParticles: false });
    },
    onTick(player) {
      player.addEffect("fire_resistance", FIRE_RESISTANCE_DURATION_TICKS, { amplifier: 0, showParticles: false });
    },
  },
});
