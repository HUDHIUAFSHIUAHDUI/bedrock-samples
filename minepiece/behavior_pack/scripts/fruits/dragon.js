import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getEntitiesInRadius, knockbackAwayFrom, shootProjectile } from "../core/targeting.js";
import { spawnParticleBurst, playSound } from "../core/vfx.js";

const HEALTH_BOOST_DURATION_TICKS = 1_000_000; // refreshed every passive tick anyway; just needs to outlast one tick

registerFruit({
  id: "dragon",
  displayName: "Dragon-Dragon Fruit",
  category: "zoan",
  itemId: `${NAMESPACE}:fruit_dragon`,
  logiaWeaponOnlyDamage: false,
  waterImmune: false,

  abilities: [
    {
      id: "dragon_breath",
      itemId: `${NAMESPACE}:ability_dragon_breath`,
      name: "Dragon Breath",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        // The Ender Dragon's own projectile: on impact it leaves a lingering damage cloud, exactly
        // like the boss fight attack this ability is named after — vanilla handles all of that for us.
        spawnParticleBurst(dimension, "minecraft:dragon_breath_trail", player.getHeadLocation(), 6, 0.5);
        shootProjectile(dimension, "minecraft:dragon_fireball", player.getHeadLocation(), player.getViewDirection(), 1.5, player);
        playSound(dimension, "mob.enderdragon.growl", player.location);
      },
    },
    {
      id: "dragon_roar",
      itemId: `${NAMESPACE}:ability_dragon_roar`,
      name: "Dragon Roar",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const radius = 6;
        spawnParticleBurst(dimension, "minecraft:knockback_roar_particle", player.location, 10, 2);
        playSound(dimension, "mob.enderdragon.growl", player.location);

        for (const entity of getEntitiesInRadius(dimension, player.location, radius, player)) {
          knockbackAwayFrom(entity, player.location, 2.5, 0.5);
        }
      },
    },
  ],

  transform: {
    itemId: `${NAMESPACE}:transform_dragon`,
    formEntityId: `${NAMESPACE}:form_dragon`,
    // "Turns into an ender dragon but cannot attack, only can fly" — the form entity itself also
    // carries no attack component, this just also stops the player's Dragon Breath/Roar items working.
    blocksAbilitiesWhileTransformed: true,
  },

  passive: {
    onFirstEquip(player) {
      player.addEffect("health_boost", HEALTH_BOOST_DURATION_TICKS, { amplifier: 4, showParticles: false });
    },
    onTick(player) {
      // Amplifier 4 = +20 max HP, doubling the player's default 20 max HP. Refreshed every tick so it
      // can never silently expire or be milk-bucket-cleared out from under the player.
      player.addEffect("health_boost", HEALTH_BOOST_DURATION_TICKS, { amplifier: 4, showParticles: false });
    },
  },
});
