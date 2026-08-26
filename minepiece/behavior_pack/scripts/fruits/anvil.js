import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getLookedAtEntity, getForwardPoint } from "../core/targeting.js";
import { damageAndKnockbackArea } from "../core/projectileEffects.js";
import { spawnParticle, playSound } from "../core/vfx.js";

/** Drops a real vanilla anvil block above a point — vanilla's own gravity-block physics does the
 * falling and the "anvil" landing damage, so no manual damage/knockback call is needed here. */
function dropAnvilAbove(dimension, groundLocation, heightAboveGround, caster) {
  const spawnPoint = {
    x: Math.floor(groundLocation.x),
    y: Math.floor(groundLocation.y) + heightAboveGround,
    z: Math.floor(groundLocation.z),
  };
  const block = dimension.getBlock(spawnPoint);
  if (block?.isAir) {
    dimension.setBlockType(spawnPoint, "minecraft:anvil");
  } else if (caster) {
    // The drop point is obstructed (ceiling, another block, etc.) — say so instead of the
    // ability silently doing nothing with zero feedback.
    caster.sendMessage("§cNo room to drop an anvil there.");
  }
}

registerFruit({
  id: "anvil",
  displayName: "Anvil-Anvil Fruit",
  category: "paramecia",
  itemId: `${NAMESPACE}:fruit_anvil`,
  logiaWeaponOnlyDamage: false,
  waterImmune: false,

  abilities: [
    {
      id: "anvil_drop",
      itemId: `${NAMESPACE}:ability_anvil_drop`,
      name: "Anvil Drop",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const target = getLookedAtEntity(player, 20);
        const groundLocation = target ? target.location : getForwardPoint(player, 12);
        dropAnvilAbove(dimension, groundLocation, 12, player);
      },
    },
    {
      id: "anvil_toss",
      itemId: `${NAMESPACE}:ability_anvil_toss`,
      name: "Anvil Toss",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        // A true horizontally-thrown falling block isn't exposed by the Script API, so this
        // materializes the anvil a short distance in front of the player at chest height instead —
        // it still lands on whatever's directly ahead of you, just via a short vertical drop rather
        // than a long thrown arc.
        const forwardPoint = getForwardPoint(player, 5);
        dropAnvilAbove(dimension, { x: forwardPoint.x, y: player.getHeadLocation().y, z: forwardPoint.z }, 2, player);
      },
    },
    {
      id: "anvil_slam",
      itemId: `${NAMESPACE}:ability_anvil_slam`,
      name: "Anvil Slam",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        spawnParticle(dimension, "minecraft:smash_ground_particle", player.location);
        playSound(dimension, "random.anvil_land", player.location);
        damageAndKnockbackArea(dimension, player.location, 5, player, 4, 1.8, 0.3);
      },
    },
  ],

  passive: {
    // "Heavy": no attribute in the Script API lets us set knockback resistance directly, so this
    // reactively zeroes out the velocity vanilla's own hit-knockback just applied, the instant it lands.
    onHurtAfter(player) {
      player.clearVelocity();
    },
  },
});
