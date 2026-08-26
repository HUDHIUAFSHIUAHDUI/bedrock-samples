import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { shootProjectile } from "../core/targeting.js";
import { PROJECTILE_FX } from "../core/projectileEffects.js";
import { spawnParticle, spawnParticleBurst, playSound } from "../core/vfx.js";

registerFruit({
  id: "trident",
  displayName: "Trident-Trident Fruit",
  category: "paramecia",
  itemId: `${NAMESPACE}:fruit_trident`,
  logiaWeaponOnlyDamage: false,
  // "Underwater attacker": not damaged by water, unlike every other fruit.
  waterImmune: true,

  abilities: [
    {
      id: "trident_throw",
      itemId: `${NAMESPACE}:ability_trident_throw`,
      name: "Trident Throw",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        shootProjectile(dimension, "minecraft:thrown_trident", player.getHeadLocation(), player.getViewDirection(), 2.2, player);
        playSound(dimension, "item.trident.throw", player.location);
      },
    },
    {
      id: "trident_lightning_strike",
      itemId: `${NAMESPACE}:ability_trident_lightning_strike`,
      name: "Lightning Strike",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        shootProjectile(dimension, "minecraft:arrow", player.getHeadLocation(), player.getViewDirection(), 2.5, player, [
          PROJECTILE_FX.LIGHTNING,
        ]);
        spawnParticleBurst(dimension, "minecraft:electric_spark_particle", player.getHeadLocation(), 6, 0.4);
      },
    },
    {
      id: "whirlpool",
      itemId: `${NAMESPACE}:ability_whirlpool`,
      name: "Whirlpool",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        spawnParticleBurst(dimension, "minecraft:water_splash_particle", player.location, 14, 1.5);
        playSound(dimension, "item.trident.riptide_2", player.location);
        // Riptide's launch, without needing to actually be standing in water.
        try {
          player.applyImpulse({ x: 0, y: 2.2, z: 0 });
        } catch (error) {
          console.error(`Minepiece: whirlpool applyImpulse threw: ${error}`);
        }
      },
    },
  ],

  passive: {
    // Extra damage against anything that breathes water (guardians, drowned, dolphins, fish, etc.).
    onHitEntity(player, hitEntity) {
      const breathable = hitEntity.getComponent("minecraft:breathable");
      if (breathable?.breathesWater) {
        hitEntity.applyDamage(4, { cause: "entityAttack", damagingEntity: player });
        spawnParticle(player.dimension, "minecraft:water_splash_particle", hitEntity.location);
      }
    },
  },
});
