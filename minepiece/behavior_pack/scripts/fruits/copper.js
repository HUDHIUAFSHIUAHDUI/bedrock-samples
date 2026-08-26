import { NAMESPACE } from "../core/constants.js";
import { registerFruit } from "../core/fruitRegistry.js";
import { getLookedAtEntity, shootProjectile, safeApplyDamage, safeAddEffect } from "../core/targeting.js";
import { PROJECTILE_FX, damageAndKnockbackArea } from "../core/projectileEffects.js";
import { spawnParticle, playSound } from "../core/vfx.js";

registerFruit({
  id: "copper",
  displayName: "Copper-Copper Fruit",
  category: "paramecia",
  itemId: `${NAMESPACE}:fruit_copper`,
  logiaWeaponOnlyDamage: false,
  waterImmune: false,

  abilities: [
    {
      id: "oxidize",
      itemId: `${NAMESPACE}:ability_oxidize`,
      name: "Oxidize",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        const target = getLookedAtEntity(player, 4);
        if (!target) return;

        safeApplyDamage(target, 3, { cause: "entityAttack", damagingEntity: player });
        safeAddEffect(target, "slowness", 20 * 5, { amplifier: 0, showParticles: true });
        safeAddEffect(target, "nausea", 20 * 5, { amplifier: 0, showParticles: true });
        spawnParticle(dimension, "minecraft:critical_hit_emitter", target.location);
      },
    },
    {
      id: "copper_lightning_strike",
      itemId: `${NAMESPACE}:ability_copper_lightning_strike`,
      name: "Lightning Strike",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        shootProjectile(dimension, "minecraft:arrow", player.getHeadLocation(), player.getViewDirection(), 2.5, player, [
          PROJECTILE_FX.LIGHTNING,
        ]);
        spawnParticle(dimension, "minecraft:electric_spark_particle", player.getHeadLocation());
      },
    },
    {
      id: "copper_overload",
      itemId: `${NAMESPACE}:ability_copper_overload`,
      name: "Copper Overload",
      cooldownSeconds: 10,
      execute({ player, dimension }) {
        spawnParticle(dimension, "minecraft:electric_spark_particle", player.location);
        playSound(dimension, "ambient.weather.lightning.impact", player.location);
        damageAndKnockbackArea(dimension, player.location, 5, player, 7, 1, 0.3);
      },
    },
  ],

  passive: {
    // "Derusting": whatever's in the main hand never loses durability.
    onTick(player) {
      const equippable = player.getComponent("minecraft:equippable");
      const heldItem = equippable?.getEquipment("Mainhand");
      if (!heldItem) return;

      const durability = heldItem.getComponent("minecraft:durability");
      if (durability && durability.damage > 0) {
        durability.damage = 0;
        equippable.setEquipment("Mainhand", heldItem);
      }
    },
  },
});
