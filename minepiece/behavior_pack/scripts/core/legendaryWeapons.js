import { world } from "@minecraft/server";
import { NAMESPACE } from "./constants.js";
import { spawnParticleBurst } from "./vfx.js";

const LEGENDARY_SABER_ID = `${NAMESPACE}:legendary_saber`;
const LIGHTNING_PARTICLE_COUNT = 10;
const LIGHTNING_PARTICLE_SPREAD = 0.6;

/**
 * Legendary Saber's signature visual: every hit wreathes the blade in lightning particles. Saber
 * only, per spec — the Legendary Sword was never given this effect, only its own separate set of
 * custom enchant books (Vampire Blood, Strongest Swordsman). Standalone (not a fruit passive)
 * since the saber works for anyone holding it, with or without a Devil Fruit.
 */
export function registerLegendaryWeapons() {
  world.afterEvents.entityHitEntity.subscribe((event) => {
    try {
      const attacker = event.damagingEntity;
      if (attacker.typeId !== "minecraft:player") return;

      const mainhand = attacker.getComponent("minecraft:equippable")?.getEquipment("Mainhand");
      if (!mainhand || mainhand.typeId !== LEGENDARY_SABER_ID) return;

      spawnParticleBurst(attacker.dimension, `${NAMESPACE}:legendary_saber_lightning`, event.hitEntity.location, LIGHTNING_PARTICLE_COUNT, LIGHTNING_PARTICLE_SPREAD);
    } catch (error) {
      console.error(`Minepiece: legendary weapon lightning threw: ${error}`);
    }
  });
}
