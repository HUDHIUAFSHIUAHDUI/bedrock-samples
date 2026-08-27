import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { shootProjectile, getLookedAtEntity, getEntitiesInRadius, safeApplyDamage, safeAddEffect } from "../core/targeting.js";
import { spawnParticle, spawnParticleBurst, playSound } from "../core/vfx.js";

const SNOWBALL_SPEED = 3;

registerFruit({
  id: "snow",
  displayName: "Snow-Snowball Fruit",
  itemId: `${NAMESPACE}:fruit_snow`,

  abilities: [
    {
      id: "snowball_shot",
      itemId: `${NAMESPACE}:ability_snowball_shot`,
      name: "Snowball Shot",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        // Vanilla snowballs already knock back whatever they hit, so a fast one thrown by hand does the job.
        shootProjectile(dimension, "minecraft:snowball", player.getHeadLocation(), player.getViewDirection(), SNOWBALL_SPEED, player);
        playSound(dimension, "block.powder_snow.hit", player.location);
      },
    },
    {
      id: "snowstorm",
      itemId: `${NAMESPACE}:ability_snowstorm`,
      name: "Snowstorm",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const target = getLookedAtEntity(player, 20);
        const center = target ? target.location : player.getHeadLocation();
        const snowballCount = 12;
        const spreadRadius = 5;

        spawnParticleBurst(dimension, "minecraft:snowflake_particle", center, 12, spreadRadius);
        for (let i = 0; i < snowballCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spawnPoint = {
            x: center.x + Math.cos(angle) * spreadRadius,
            y: center.y + 3 + Math.random() * 2,
            z: center.z + Math.sin(angle) * spreadRadius,
          };
          const direction = {
            x: center.x - spawnPoint.x,
            y: center.y - spawnPoint.y,
            z: center.z - spawnPoint.z,
          };
          shootProjectile(dimension, "minecraft:snowball", spawnPoint, direction, SNOWBALL_SPEED, player);
        }
        playSound(dimension, "block.powder_snow.place", player.location);
      },
    },
    {
      id: "blizzard",
      itemId: `${NAMESPACE}:ability_blizzard`,
      name: "Blizzard",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const radius = 6;
        spawnParticleBurst(dimension, "minecraft:snowflake_particle", player.location, 24, radius);
        playSound(dimension, "block.powder_snow.break", player.location);

        for (const entity of getEntitiesInRadius(dimension, player.location, radius, player)) {
          safeApplyDamage(entity, 3, { cause: "entityAttack", damagingEntity: player });
          safeAddEffect(entity, "slowness", 20 * 4, { amplifier: 2, showParticles: true });
          spawnParticle(dimension, "minecraft:snowflake_particle", entity.location);
        }
      },
    },
  ],

  // "One with the snow": freezing damage (powder snow, frozen biomes) never lands.
  cancelDamageCauses: ["freezing"],
});
