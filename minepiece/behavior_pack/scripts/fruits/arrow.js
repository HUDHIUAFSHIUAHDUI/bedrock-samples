import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { shootProjectile, rotateAroundY, getForwardPoint } from "../core/targeting.js";
import { PROJECTILE_FX } from "../core/projectileEffects.js";
import { playSound, spawnParticleBurst } from "../core/vfx.js";

const ARROW_SPEED = 3;

registerFruit({
  id: "arrow",
  displayName: "Arrow-Arrow Fruit",
  category: "logia",
  itemId: `${NAMESPACE}:fruit_arrow`,
  logiaWeaponOnlyDamage: true,
  waterImmune: false,

  abilities: [
    {
      id: "arrow_shot",
      itemId: `${NAMESPACE}:ability_arrow_shot`,
      name: "Arrow Shot",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        shootProjectile(dimension, "minecraft:arrow", player.getHeadLocation(), player.getViewDirection(), ARROW_SPEED, player, [
          PROJECTILE_FX.RANDOM_DEBUFF,
        ]);
        playSound(dimension, "random.bow", player.location);
      },
    },
    {
      id: "arrow_barrage",
      itemId: `${NAMESPACE}:ability_arrow_barrage`,
      name: "Arrow Barrage",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const origin = player.getHeadLocation();
        const forward = player.getViewDirection();
        const spreadAngles = [-20, -12, -4, 4, 12, 20];

        spawnParticleBurst(dimension, "minecraft:critical_hit_emitter", origin, 6, 0.4);
        for (const angle of spreadAngles) {
          shootProjectile(dimension, "minecraft:arrow", origin, rotateAroundY(forward, angle), ARROW_SPEED, player);
        }
        playSound(dimension, "random.bow", player.location);
      },
    },
    {
      id: "arrow_rain",
      itemId: `${NAMESPACE}:ability_arrow_rain`,
      name: "Arrow Rain",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const center = getForwardPoint(player, 15);
        const arrowCount = 10;
        const areaRadius = 4;

        spawnParticleBurst(dimension, "minecraft:critical_hit_emitter", center, 10, areaRadius);
        for (let i = 0; i < arrowCount; i++) {
          const offsetX = (Math.random() - 0.5) * 2 * areaRadius;
          const offsetZ = (Math.random() - 0.5) * 2 * areaRadius;
          const spawnPoint = { x: center.x + offsetX, y: center.y + 15, z: center.z + offsetZ };
          shootProjectile(dimension, "minecraft:arrow", spawnPoint, { x: 0, y: -1, z: 0 }, ARROW_SPEED, player);
        }
        playSound(dimension, "random.bow", player.location);
      },
    },
  ],

  passive: {
    onHurtAfter(player) {
      const dimension = player.dimension;
      const angle = Math.random() * Math.PI * 2;
      const direction = { x: Math.cos(angle), y: 0.1, z: Math.sin(angle) };
      shootProjectile(dimension, "minecraft:arrow", player.getHeadLocation(), direction, ARROW_SPEED, player);
    },
  },
});
