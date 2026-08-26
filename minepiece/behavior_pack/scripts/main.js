/**
 * Minepiece entry point.
 *
 * Registration order matters a little: the engines (damage rules, ability
 * dispatch, passives, transforms, projectile effects, fruit-eating) must be
 * wired up before anything can use them, and every fruit module registers
 * itself into the shared registry purely as a side effect of being
 * imported — so importing the fruit modules is what actually populates the
 * game with content. Adding fruit #14 later means one new file in
 * `fruits/` and one new import line below; nothing else in this file changes.
 */

import { registerDamageRules } from "./core/damageRules.js";
import { registerWaterDamage } from "./core/waterDamage.js";
import { registerAbilityEngine } from "./core/abilityEngine.js";
import { registerPassiveEngine } from "./core/passiveEngine.js";
import { registerTransformEngine } from "./core/transformEngine.js";
import { registerProjectileEffects } from "./core/projectileEffects.js";
import { registerFruitConsumption } from "./core/fruitConsumption.js";

import "./fruits/warden.js";
import "./fruits/dragon.js";
import "./fruits/ghast.js";
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

registerDamageRules();
registerWaterDamage();
registerAbilityEngine();
registerPassiveEngine();
registerTransformEngine();
registerProjectileEffects();
registerFruitConsumption();
