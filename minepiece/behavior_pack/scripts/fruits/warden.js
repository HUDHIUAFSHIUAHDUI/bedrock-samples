import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { traceBeam, getEntitiesInRadius, getLookedAtEntity, safeApplyDamage, safeAddEffect } from "../core/targeting.js";
import { spawnParticle, spawnParticleBurst, playSound } from "../core/vfx.js";

const SUPER_HEARING_RADIUS = 20;
/** playerId -> Set<entityId> currently inside the Super Hearing radius, so we only announce new arrivals. */
const trackedNearby = new Map();

function friendlyName(entity) {
  if (entity.typeId === "minecraft:player") return entity.name;
  return entity.typeId.replace("minecraft:", "").replaceAll("_", " ");
}

registerFruit({
  id: "warden",
  displayName: "Warden-Warden Fruit",
  category: "zoan",
  itemId: `${NAMESPACE}:fruit_warden`,
  logiaWeaponOnlyDamage: false,
  waterImmune: false,

  abilities: [
    {
      id: "warden_sonic_boom",
      itemId: `${NAMESPACE}:ability_warden_sonic_boom`,
      name: "Warden Sonic Boom",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const origin = player.getHeadLocation();
        const { points, entities } = traceBeam(dimension, origin, player.getViewDirection(), 20, 2, player);

        spawnParticleBurst(dimension, "minecraft:sonic_explosion", origin, 10, 1);
        for (const point of points) spawnParticle(dimension, "minecraft:sonic_explosion", point);
        playSound(dimension, "mob.warden.sonic_boom", origin);

        for (const entity of entities) {
          safeApplyDamage(entity, 8, { cause: "sonicBoom", damagingEntity: player });
        }
      },
    },
    {
      id: "warden_blinding_punch",
      itemId: `${NAMESPACE}:ability_warden_blinding_punch`,
      name: "Blinding Punch",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const target = getLookedAtEntity(player, 4);
        playSound(dimension, "mob.warden.attack", player.location);
        if (!target) return;

        safeApplyDamage(target, 4, { cause: "entityAttack", damagingEntity: player });
        safeAddEffect(target, "blindness", 20 * 5, { amplifier: 0, showParticles: true });
        spawnParticleBurst(dimension, "minecraft:critical_hit_emitter", target.location, 8, 0.6);
      },
    },
  ],

  transform: {
    itemId: `${NAMESPACE}:transform_warden`,
    formEntityId: `${NAMESPACE}:form_warden`,
  },

  passive: {
    onTick(player) {
      const dimension = player.dimension;
      const nearby = getEntitiesInRadius(dimension, player.location, SUPER_HEARING_RADIUS, player).filter(
        (entity) => entity.typeId !== "minecraft:item" && entity.typeId !== "minecraft:xp_orb"
      );

      let seen = trackedNearby.get(player.id);
      if (!seen) {
        seen = new Set();
        trackedNearby.set(player.id, seen);
      }

      const currentIds = new Set(nearby.map((entity) => entity.id));
      for (const entity of nearby) {
        if (!seen.has(entity.id)) {
          player.sendMessage(`§7[Super Hearing] §fYou sense §e${friendlyName(entity)}§f nearby.`);
        }
      }

      for (const id of [...seen]) if (!currentIds.has(id)) seen.delete(id);
      for (const id of currentIds) seen.add(id);
    },
  },
});
