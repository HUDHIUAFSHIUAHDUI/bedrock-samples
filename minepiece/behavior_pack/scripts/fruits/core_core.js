import { system } from "@minecraft/server";
import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getLookedAtEntity, shootProjectile, safeApplyDamage } from "../core/targeting.js";
import { damageAndKnockbackArea } from "../core/projectileEffects.js";
import { spawnParticle, spawnParticleBurst, playSound } from "../core/vfx.js";

const HOMETOWN_LINK_DURATION_TICKS = 1_000_000;
const LAND_CRASH_MIN_AIR_TICKS = 10;
const LAND_CRASH_TIMEOUT_TICKS = 100;

registerFruit({
  id: "core",
  displayName: "Core-Core Fruit",
  itemId: `${NAMESPACE}:fruit_core`,

  abilities: [
    {
      id: "wind_burst",
      itemId: `${NAMESPACE}:ability_wind_burst`,
      name: "Wind Burst",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        // The real vanilla Breeze wind charge — its own impact explosion/knockback is vanilla-native.
        spawnParticleBurst(dimension, "minecraft:wind_explosion_emitter", player.getHeadLocation(), 4, 0.4);
        shootProjectile(dimension, "minecraft:wind_charge_projectile", player.getHeadLocation(), player.getViewDirection(), 1.5, player);
        playSound(dimension, "mob.breeze.shoot", player.location);
      },
    },
    {
      id: "heavy_punch",
      itemId: `${NAMESPACE}:ability_heavy_punch`,
      name: "Heavy Punch",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const target = getLookedAtEntity(player, 4);
        if (!target) return;

        safeApplyDamage(target, 15, { cause: "entityAttack", damagingEntity: player });
        spawnParticleBurst(dimension, "minecraft:critical_hit_emitter", target.location, 10, 0.7);
        spawnParticle(dimension, "minecraft:knockback_roar_particle", target.location);
      },
    },
    {
      id: "land_crash",
      itemId: `${NAMESPACE}:ability_land_crash`,
      name: "Land Crash",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        spawnParticle(dimension, "minecraft:wind_explosion_emitter", player.location);
        try {
          player.applyImpulse({ x: 0, y: 1.4, z: 0 });
        } catch (error) {
          console.error(`Minepiece: land_crash applyImpulse threw: ${error}`);
        }

        let ticksWaited = 0;
        const intervalId = system.runInterval(() => {
          try {
            ticksWaited++;
            const landed = ticksWaited > LAND_CRASH_MIN_AIR_TICKS && player.isOnGround;
            if (landed || ticksWaited > LAND_CRASH_TIMEOUT_TICKS) {
              system.clearRun(intervalId);
              spawnParticleBurst(dimension, "minecraft:smash_ground_particle", player.location, 14, 2.5);
              spawnParticleBurst(dimension, "minecraft:wind_explosion_emitter", player.location, 6, 1.5);
              playSound(dimension, "mob.breeze.land", player.location);
              // Excludes the player themselves — they take no self-damage from their own slam.
              damageAndKnockbackArea(dimension, player.location, 4, player, 9, 1.5, 0.4);
            }
          } catch (error) {
            // A scheduled callback like this runs outside abilityEngine's try/catch around the
            // original execute() call, so it needs its own — otherwise a throw here would be a
            // silent, unreported failure well after "Land Crash failed" would have made any sense.
            system.clearRun(intervalId);
            console.error(`Minepiece: land_crash landing check threw: ${error}`);
          }
        }, 2);
      },
    },
  ],

  passive: {
    onTick(player) {
      player.addEffect("bad_omen", HOMETOWN_LINK_DURATION_TICKS, { amplifier: 0, showParticles: false });
      player.addEffect("wind_charged", HOMETOWN_LINK_DURATION_TICKS, { amplifier: 0, showParticles: false });
    },
  },
});
