import { system, world } from "@minecraft/server";
import { PASSIVE_TICK_INTERVAL } from "./constants.js";
import {
  getFruitId,
  isTransformed,
  setTransformed,
  getTransformEntityId,
  setTransformEntityId,
} from "./playerState.js";
import { getFruitByTransformItemId } from "./fruitRegistry.js";

const INVISIBILITY_DURATION_TICKS = 1_000_000; // effectively "until we remove it ourselves"

/**
 * Generic Zoan transform toggle, shared by every Zoan fruit.
 *
 * The Script API has no way to change a Player's own entity type, so a
 * "transformation" is implemented the same way vanilla lets you ride a
 * horse or boat: the player is made invisible and mounted, as the rider, on
 * a purpose-built, AI-less `minepiece:form_*` entity. Riding-input steering
 * (the same mechanism horses/boats use) is what makes the form entity move
 * under the player's normal WASD/look controls — see the relevant
 * behavior_pack/entities/*.json for the movement/rideable components.
 */
export function registerTransformEngine() {
  world.afterEvents.itemUse.subscribe((event) => {
    const player = event.source;
    if (player.typeId !== "minecraft:player") return;

    const fruit = getFruitByTransformItemId(event.itemStack.typeId);
    if (!fruit?.transform) return;

    if (getFruitId(player) !== fruit.id) {
      player.sendMessage(`§cYou don't have the power of the ${fruit.displayName}.`);
      return;
    }

    try {
      if (isTransformed(player)) {
        revertTransform(player);
      } else {
        applyTransform(player, fruit);
      }
    } catch (error) {
      console.error(`Minepiece: transform "${fruit.id}" threw: ${error}`);
      player.sendMessage(`§cTransforming failed: ${error}`);
    }
  });

  // Safety net: if a transformed player's form entity is ever removed out from
  // under them (killed, chunk unload edge case, etc.), don't leave them stuck
  // invisible and un-ridden forever.
  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      try {
        if (!isTransformed(player)) continue;
        const entityId = getTransformEntityId(player);
        if (!entityId || !world.getEntity(entityId)) {
          setTransformed(player, false);
          setTransformEntityId(player, undefined);
          player.removeEffect("invisibility");
        }
      } catch (error) {
        console.error(`Minepiece: transform safety-net tick threw: ${error}`);
      }
    }
  }, PASSIVE_TICK_INTERVAL);
}

function applyTransform(player, fruit) {
  const mount = player.dimension.spawnEntity(fruit.transform.formEntityId, player.location);
  const rideable = mount.getComponent("minecraft:rideable");
  rideable?.addRider(player);

  player.addEffect("invisibility", INVISIBILITY_DURATION_TICKS, { amplifier: 0, showParticles: false });
  setTransformed(player, true);
  setTransformEntityId(player, mount.id);

  player.sendMessage(`§d§lYou transform into the ${fruit.displayName.split("-")[0]}!`);
}

function revertTransform(player) {
  const entityId = getTransformEntityId(player);
  const mount = entityId ? world.getEntity(entityId) : undefined;
  mount?.getComponent("minecraft:rideable")?.ejectRider(player);
  mount?.remove();

  player.removeEffect("invisibility");
  setTransformed(player, false);
  setTransformEntityId(player, undefined);

  player.sendMessage("§7You revert to your human form.");
}
