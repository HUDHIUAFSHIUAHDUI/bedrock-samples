/**
 * Minepiece entry point.
 *
 * Registration order matters a little: the engines (damage rules, ability
 * dispatch, passives, projectile effects, fruit-eating) must be wired up
 * before anything can use them, and every fruit module registers itself
 * into the shared registry purely as a side effect of being imported — so
 * importing the fruit modules is what actually populates the game with
 * content. Adding another fruit later means one new file in `fruits/` and
 * one new import line below; nothing else in this file changes.
 */

import { registerDamageRules } from "./core/damageRules.js";
import { registerWaterDamage } from "./core/waterDamage.js";
import { registerAbilityEngine } from "./core/abilityEngine.js";
import { registerPassiveEngine } from "./core/passiveEngine.js";
import { registerProjectileEffects } from "./core/projectileEffects.js";
import { registerFruitConsumption } from "./core/fruitConsumption.js";

import "./fruits/sculk.js";
import "./fruits/lava.js";
import "./fruits/water.js";
import "./fruits/arrow.js";
import "./fruits/anvil.js";
import "./fruits/core_core.js";
import "./fruits/slime.js";
import "./fruits/copper.js";
import "./fruits/beacon.js";
import "./fruits/trident.js";
import "./fruits/snow.js";
import "./fruits/potion.js";
import "./fruits/goat.js";
import "./fruits/shulker.js";

import { world } from "@minecraft/server";

/**
 * Registers one engine, and if it throws, reports the error loudly instead
 * of silently taking every other engine down with it. A thrown error inside
 * a plain function call like these doesn't normally propagate any further
 * than this catch, but this guarantees it: one broken engine never prevents
 * the rest of Minepiece from working, and the failure is actually visible
 * (in the content log AND in chat, once a player is online to see it)
 * instead of presenting as "nothing happens" with zero explanation.
 */
function registerEngine(name, registerFn) {
  try {
    registerFn();
  } catch (error) {
    console.error(`Minepiece: "${name}" failed to start: ${error}`);
    world.afterEvents.playerSpawn.subscribe((event) => {
      if (event.initialSpawn) {
        event.player.sendMessage(`§c[Minepiece] "${name}" failed to start: ${error}`);
      }
    });
  }
}

registerEngine("damage rules", registerDamageRules);
registerEngine("water damage", registerWaterDamage);
registerEngine("ability engine", registerAbilityEngine);
registerEngine("passive engine", registerPassiveEngine);
registerEngine("projectile effects", registerProjectileEffects);
registerEngine("fruit consumption", registerFruitConsumption);
