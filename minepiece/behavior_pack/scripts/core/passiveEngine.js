import { system, world } from "@minecraft/server";
import { PASSIVE_TICK_INTERVAL } from "./constants.js";
import { getFruitId } from "./playerState.js";
import { getFruitById } from "./fruitRegistry.js";
import { ensureAbilityKit } from "./kit.js";

/**
 * Passive abilities are, per the design brief, "basically always running".
 * This file is the only place that drives them:
 *   - a fixed-interval tick loop calls every active fruit's passive.onTick
 *     for every online player that has that fruit (Health Boost, Fire
 *     Resistance, Super Hearing scans, magma/light foot placement, etc.)
 *   - it also re-subscribes the two passives that are naturally event-driven
 *     instead of tick-driven (Arrow Instinct on being hurt, Sculk Catalyst
 *     on killing a hostile mob) so fruit modules never touch world events
 *     directly.
 */
export function registerPassiveEngine() {
  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      const fruitId = getFruitId(player);
      if (!fruitId) continue;

      const fruit = getFruitById(fruitId);
      if (!fruit) continue;

      ensureAbilityKit(player, fruit);
      fruit.passive?.onTick?.(player);
    }
  }, PASSIVE_TICK_INTERVAL);

  world.afterEvents.entityHurt.subscribe((event) => {
    const player = event.hurtEntity;
    if (player.typeId !== "minecraft:player") return;

    const fruitId = getFruitId(player);
    if (!fruitId) return;

    const fruit = getFruitById(fruitId);
    fruit?.passive?.onHurtAfter?.(player, event);
  });

  world.afterEvents.entityHitEntity.subscribe((event) => {
    const attacker = event.damagingEntity;
    if (attacker.typeId !== "minecraft:player") return;

    const fruitId = getFruitId(attacker);
    if (!fruitId) return;

    const fruit = getFruitById(fruitId);
    fruit?.passive?.onHitEntity?.(attacker, event.hitEntity);
  });

  world.afterEvents.entityDie.subscribe((event) => {
    const killer = event.damageSource?.damagingEntity;
    if (!killer || killer.typeId !== "minecraft:player") return;

    const fruitId = getFruitId(killer);
    if (!fruitId) return;

    const fruit = getFruitById(fruitId);
    if (!fruit?.passive?.onKillHostile) return;

    const isHostile = event.deadEntity.getComponent("minecraft:type_family")?.hasTypeFamily("monster") ?? false;
    if (isHostile) fruit.passive.onKillHostile(killer, event.deadEntity);
  });
}
