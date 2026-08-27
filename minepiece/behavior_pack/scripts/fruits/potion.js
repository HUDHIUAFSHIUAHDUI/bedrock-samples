import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { NEGATIVE_EFFECTS } from "../core/projectileEffects.js";
import { spawnParticleBurst, playSound } from "../core/vfx.js";

registerFruit({
  id: "potion",
  displayName: "Potion-Potion Fruit",
  itemId: `${NAMESPACE}:fruit_potion`,

  abilities: [
    {
      id: "health_potion",
      itemId: `${NAMESPACE}:ability_health_potion`,
      name: "Health Potion",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        // Same as drinking a real Instant Health II potion.
        player.addEffect("instant_health", 1, { amplifier: 1, showParticles: true });
        spawnParticleBurst(dimension, "minecraft:heart_particle", player.location, 8, 0.6);
        playSound(dimension, "random.drink", player.location);
      },
    },
    {
      id: "extra_jump_potion",
      itemId: `${NAMESPACE}:ability_extra_jump_potion`,
      name: "Extra Jump Potion",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        player.addEffect("jump_boost", 20 * 6, { amplifier: 5, showParticles: true });
        spawnParticleBurst(dimension, "minecraft:totem_particle", player.location, 8, 0.6);
        playSound(dimension, "random.drink", player.location);
      },
    },
    {
      id: "bloodlust_potion",
      itemId: `${NAMESPACE}:ability_bloodlust_potion`,
      name: "Bloodlust Potion",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        player.addEffect("strength", 20 * 5, { amplifier: 4, showParticles: true });
        spawnParticleBurst(dimension, "minecraft:critical_hit_emitter", player.location, 8, 0.6);
        playSound(dimension, "random.drink", player.location);
      },
    },
  ],

  passive: {
    // "Natural Cleaning": strips off any negative potion effect the moment it lands.
    onTick(player) {
      for (const effectType of NEGATIVE_EFFECTS) {
        if (player.getEffect(effectType)) player.removeEffect(effectType);
      }
    },
  },
});
