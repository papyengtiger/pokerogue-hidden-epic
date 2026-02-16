import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { BooleanHolder } from "#utils/common";
import type { Pokemon } from "#field/pokemon";
import { SturdyMealModifier, DawnWingsBeadModifier } from "#modifiers/modifier";

export function blocksNonDirectDamage(p: Pokemon, simulated: boolean): boolean {
  const cancelled = new BooleanHolder(false);
  applyAbAttrs("BlockNonDirectDamageAbAttr", { pokemon: p, simulated, cancelled });
  if (cancelled.value) return true;

  const held = p.getHeldItems?.() ?? [];
  return held.some(i => i instanceof SturdyMealModifier || i instanceof DawnWingsBeadModifier);
}