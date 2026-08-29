import { world } from "@minecraft/server";
import { NAMESPACE } from "./constants.js";
import { spawnParticleBurst } from "./vfx.js";

const LEGENDARY_WEAPON_ITEM_IDS = new Set([`${NAMESPACE}:legendary_sword`, `${NAMESPACE}:legendary_saber`]);
const LIGHTNING_PARTICLE_COUNT = 10;
const LIGHTNING_PARTICLE_SPREAD = 0.6;

/**
 * Legendary Sword/Saber's signature visual: every hit wreathes the blade in
 * lightning particles. Standalone (not a fruit passive) since these weapons
 * work for anyone holding them, with or without a Devil Fruit.
 */
export function registerLegendaryWeapons() {
  world.afterEvents.entityHitEntity.subscribe((event) => {
    try {
      const attacker = event.damagingEntity;
      if (attacker.typeId !== "minecraft:player") return;

      const mainhand = attacker.getComponent("minecraft:equippable")?.getEquipment("Mainhand");
      if (!mainhand || !LEGENDARY_WEAPON_ITEM_IDS.has(mainhand.typeId)) return;

      spawnParticleBurst(attacker.dimension, `${NAMESPACE}:legendary_saber_lightning`, event.hitEntity.location, LIGHTNING_PARTICLE_COUNT, LIGHTNING_PARTICLE_SPREAD);
    } catch (error) {
      console.error(`Minepiece: legendary weapon lightning threw: ${error}`);
    }
  });
}
