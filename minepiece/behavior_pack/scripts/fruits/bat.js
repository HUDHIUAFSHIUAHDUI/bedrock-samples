import { world } from "@minecraft/server";
import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getLookedAtEntity } from "../core/targeting.js";
import { safeApplyDamage, safeAddEffect } from "../core/targeting.js";
import { isNightVisionActive, setNightVisionActive } from "../core/playerState.js";
import { spawnParticleBurst, playSound } from "../core/vfx.js";

const BAT_STORM_COUNT = 40;
const BAT_STORM_RADIUS = 4;
const VAMPIRE_BITE_RANGE = 4;
const VAMPIRE_BITE_DAMAGE = 10;
const VAMPIRE_BITE_NAUSEA_TICKS = 20 * 3;
const NIGHT_VISION_REFRESH_TICKS = 20 * 12; // reapplied every passive tick (see PASSIVE_TICK_INTERVAL), long enough to never visibly flicker
const NOCTURNAL_EFFECT_TICKS = 20 * 2;
// Bedrock's own day/night boundary (mob-spawning window), same convention used for "is it night" everywhere else in vanilla.
const NIGHT_START_TICKS = 13000;
const NIGHT_END_TICKS = 23000;

registerFruit({
  id: "bat",
  displayName: "Bat-Bat Fruit",
  itemId: `${NAMESPACE}:fruit_bat`,

  abilities: [
    {
      id: "bat_storm",
      itemId: `${NAMESPACE}:ability_bat_storm`,
      name: "Bat Storm",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        playSound(dimension, "mob.bat.takeoff", player.location);
        for (let i = 0; i < BAT_STORM_COUNT; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 1 + Math.random() * BAT_STORM_RADIUS;
          const spawnPoint = {
            x: player.location.x + Math.cos(angle) * radius,
            y: player.location.y + Math.random() * 3,
            z: player.location.z + Math.sin(angle) * radius,
          };
          try {
            dimension.spawnEntity("minecraft:bat", spawnPoint);
          } catch (error) {
            console.error(`Minepiece: bat storm spawn threw: ${error}`);
          }
        }
      },
    },
    {
      id: "vampire_bite",
      itemId: `${NAMESPACE}:ability_vampire_bite`,
      name: "Vampire Bite",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const target = getLookedAtEntity(player, VAMPIRE_BITE_RANGE);
        if (!target) {
          player.sendMessage("§cNo target in range.");
          return;
        }

        safeApplyDamage(target, VAMPIRE_BITE_DAMAGE, { cause: "magic", damagingEntity: player });
        safeAddEffect(target, "nausea", VAMPIRE_BITE_NAUSEA_TICKS, { amplifier: 0, showParticles: false });
        spawnParticleBurst(dimension, "minecraft:critical_hit_emitter", target.location, 8, 0.5);
        playSound(dimension, "mob.bat.hurt", target.location);
      },
    },
    {
      id: "night_vision",
      itemId: `${NAMESPACE}:ability_night_vision`,
      name: "Night Vision",
      // The one ability in the whole mod with no cooldown — see ABILITY_COOLDOWN_OVERRIDES
      // in tools/gen_items.py for the matching item-side cooldown of 0.
      cooldownSeconds: 0,
      execute({ player, dimension }) {
        const turningOn = !isNightVisionActive(player);
        setNightVisionActive(player, turningOn);

        if (turningOn) {
          playSound(dimension, "mob.bat.takeoff", player.location);
          player.sendMessage("§5§lNight Vision activated.");
        } else {
          player.removeEffect("night_vision");
          playSound(dimension, "mob.bat.hurt", player.location);
          player.sendMessage("§7Night Vision deactivated.");
        }
      },
    },
  ],

  passive: {
    // Nocturnal: reapplies every passive tick so neither effect ever expires early, and swaps
    // cleanly between the two states as the world clock crosses the day/night boundary.
    onTick(player) {
      if (isNightVisionActive(player)) {
        player.addEffect("night_vision", NIGHT_VISION_REFRESH_TICKS, { amplifier: 0, showParticles: false });
      }

      const isNight = isNightTime();
      if (isNight) {
        player.addEffect("strength", NOCTURNAL_EFFECT_TICKS, { amplifier: 2, showParticles: false });
        player.removeEffect("weakness");
      } else {
        player.addEffect("weakness", NOCTURNAL_EFFECT_TICKS, { amplifier: 0, showParticles: false });
        player.removeEffect("strength");
      }
    },
  },
});

function isNightTime() {
  const time = world.getTimeOfDay();
  return time >= NIGHT_START_TICKS && time < NIGHT_END_TICKS;
}
