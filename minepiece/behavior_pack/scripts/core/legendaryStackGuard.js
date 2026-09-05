import { system, world } from "@minecraft/server";
import { NAMESPACE } from "./constants.js";

const LEGENDARY_WEAPON_IDS = new Set([`${NAMESPACE}:legendary_sword`, `${NAMESPACE}:legendary_saber`]);
const TICK_INTERVAL = 10;

/**
 * minecraft:max_stack_size: 1 is already declared on both legendary weapon items, but reports
 * kept coming back that they still stack to 64 in actual play with no reproducible cause found
 * in the item jsons themselves — so this enforces the same "only 1 per stack" rule directly in
 * script instead of only trusting the declarative component, the same way swordBoost.js reconciles
 * mainhand state every tick rather than assuming equipment stays as scripts left it. Any stack
 * found above 1, anywhere in a player's inventory or equipped slots, gets split down to singles.
 */
export function registerLegendaryStackGuard() {
  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      try {
        splitOversizedStacks(player);
      } catch (error) {
        console.error(`Minepiece: legendary stack guard threw: ${error}`);
      }
    }
  }, TICK_INTERVAL);
}

function splitOversizedStacks(player) {
  const container = player.getComponent("minecraft:inventory")?.container;
  if (container) {
    for (let slot = 0; slot < container.size; slot++) {
      const item = container.getItem(slot);
      if (item && LEGENDARY_WEAPON_IDS.has(item.typeId) && item.amount > 1) {
        const single = item.clone();
        single.amount = 1;
        container.setItem(slot, single);
        for (let i = 1; i < item.amount; i++) {
          container.addItem(single.clone());
        }
      }
    }
  }

  const equippable = player.getComponent("minecraft:equippable");
  for (const slotName of ["Mainhand", "Offhand"]) {
    const item = equippable?.getEquipment(slotName);
    if (item && LEGENDARY_WEAPON_IDS.has(item.typeId) && item.amount > 1) {
      const single = item.clone();
      single.amount = 1;
      equippable.setEquipment(slotName, single);
    }
  }
}
