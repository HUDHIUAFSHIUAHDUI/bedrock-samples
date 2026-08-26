import { BlockPermutation } from "@minecraft/server";
import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getEntitiesInRadius, traceBeam, safeApplyDamage, safeAddEffect } from "../core/targeting.js";
import { blockKey, getLastFootBlock, setLastFootBlock, isBeaconBoostActive, setBeaconBoostActive } from "../core/playerState.js";
import { spawnParticle, spawnParticleBurst, playSound } from "../core/vfx.js";

const BEACON_BOOST_EFFECTS = ["speed", "haste", "resistance", "jump_boost", "strength"];
const BEACON_BOOST_DURATION_TICKS = 1_000_000;

// Resolved lazily (on first use, not at module load) and cached — calling BlockPermutation.resolve()
// at module scope has been known to throw before the world is fully ready, which would take the
// entire script bundle down with it since this file is imported before any engine gets registered.
let cachedLitBlockPermutation;
function getLitBlockPermutation() {
  if (!cachedLitBlockPermutation) {
    cachedLitBlockPermutation = BlockPermutation.resolve("minecraft:light_block", { block_light_level: 15 });
  }
  return cachedLitBlockPermutation;
}

registerFruit({
  id: "beacon",
  displayName: "Beacon-Beacon Fruit",
  category: "paramecia",
  itemId: `${NAMESPACE}:fruit_beacon`,
  logiaWeaponOnlyDamage: false,
  waterImmune: false,

  abilities: [
    {
      id: "flashbang",
      itemId: `${NAMESPACE}:ability_flashbang`,
      name: "Flashbang",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        spawnParticleBurst(dimension, "minecraft:totem_particle", player.location, 16, 2.5);
        playSound(dimension, "random.totem", player.location);

        for (const target of getEntitiesInRadius(dimension, player.location, 8, player)) {
          safeAddEffect(target, "blindness", 20 * 2, { amplifier: 0, showParticles: false });
          safeAddEffect(target, "nausea", 20 * 2, { amplifier: 0, showParticles: false });
        }
      },
    },
    {
      id: "beacon_beam",
      itemId: `${NAMESPACE}:ability_beacon_beam`,
      name: "Beacon Beam",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const origin = player.getHeadLocation();
        const { points, entities } = traceBeam(dimension, origin, player.getViewDirection(), 30, 1.5, player);

        for (const point of points) spawnParticle(dimension, "minecraft:totem_particle", point);
        playSound(dimension, "beacon.power", origin);

        for (const entity of entities) {
          safeApplyDamage(entity, 12, { cause: "magic", damagingEntity: player });
          spawnParticleBurst(dimension, "minecraft:critical_hit_emitter", entity.location, 6, 0.6);
        }
      },
    },
    {
      id: "beacon_boost",
      itemId: `${NAMESPACE}:ability_beacon_boost`,
      name: "Beacon Boost",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const turningOn = !isBeaconBoostActive(player);
        setBeaconBoostActive(player, turningOn);

        if (turningOn) {
          spawnParticle(dimension, "minecraft:totem_particle", player.location);
          playSound(dimension, "beacon.activate", player.location);
          player.sendMessage("§b§lBeacon Boost activated.");
        } else {
          for (const effect of BEACON_BOOST_EFFECTS) player.removeEffect(effect);
          playSound(dimension, "beacon.deactivate", player.location);
          player.sendMessage("§7Beacon Boost deactivated.");
        }
      },
    },
  ],

  passive: {
    onTick(player) {
      // Beacon Boost: reapplied every tick for as long as it's toggled on, so it never expires early.
      if (isBeaconBoostActive(player)) {
        for (const effect of BEACON_BOOST_EFFECTS) {
          player.addEffect(effect, BEACON_BOOST_DURATION_TICKS, { amplifier: 1, showParticles: false });
        }
      }

      // Light Producer: keeps exactly one light source under the player's feet, moving with them.
      const dimension = player.dimension;
      const currentBlock = { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) };
      const currentKey = blockKey(currentBlock);
      const lastKey = getLastFootBlock(player);
      if (currentKey === lastKey) return;

      if (lastKey) {
        const [x, y, z] = lastKey.split(",").map(Number);
        const lastBlock = dimension.getBlock({ x, y, z });
        if (lastBlock?.typeId === "minecraft:light_block") dimension.setBlockType({ x, y, z }, "minecraft:air");
      }

      const block = dimension.getBlock(currentBlock);
      if (block?.isAir) block.setPermutation(getLitBlockPermutation());
      setLastFootBlock(player, currentKey);
    },
  },
});
