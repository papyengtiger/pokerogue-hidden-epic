import { ModifierTier } from "#enums/modifier-tier";
import { allMoves } from "#data/data-lists";
import type { BattlerIndex } from "#enums/battler-index";
import { BattlerTagType } from "#enums/battler-tag-type";
import { MoveCategory, type MoveDamageCategory } from "#enums/move-category";
import type { MoveId } from "#enums/move-id";
import { MoveTarget } from "#enums/move-target";
import { PokemonType } from "#enums/pokemon-type";
import type { Pokemon } from "#field/pokemon";
import { applyMoveAttrs } from "#moves/apply-attrs";
import type { Move, MoveTargetSet, UserMoveConditionFunc } from "#moves/move";
import { NumberHolder } from "#utils/common";
import { areAllies } from "#utils/pokemon-utils";

// #moves/fling-utils.ts
export const flingPowerByTier: Record<ModifierTier, number> = {
  [ModifierTier.COMMON]: 40,
  [ModifierTier.GREAT]: 60,
  [ModifierTier.ULTRA]: 80,
  [ModifierTier.ROGUE]: 100,
  [ModifierTier.MASTER]: 120,
  [ModifierTier.LUXURY]: 120,
};

export function getFlingBasePowerFromItem(item: PokemonHeldItemModifier): number {
  const tier = item.type.tier ?? item.type.getOrInferTier?.() ?? ModifierTier.COMMON;
  return flingPowerByTier[tier] ?? 40;
}
