/*
 * Contains modifier pools for different contexts in the game.
 * Can be safely imported without worrying about circular dependencies.
 */

import type { ModifierTier } from "#enums/modifier-tier";
import { WeightedModifierType } from "#modifiers/modifier-type";
import type { ModifierPool, ModifierTypeFunc, WeightedModifierTypeWeightFunc } from "#types/modifier-types";

export const modifierPool: ModifierPool = {};

export const wildModifierPool: ModifierPool = {};

export const trainerModifierPool: ModifierPool = {};

export const enemyBuffModifierPool: ModifierPool = {};

export const dailyStarterModifierPool: ModifierPool = {};

export const weeklyStarterModifierPool: ModifierPool = {};

export const monthlyStarterModifierPool: ModifierPool = {};

// ✅ modifier pool builder helper
function W(
  tier: ModifierTier,
  modifierTypeFunc: ModifierTypeFunc,
  weight: number | WeightedModifierTypeWeightFunc,
  maxWeight?: number | WeightedModifierTypeWeightFunc,
): WeightedModifierType {
  const w = new WeightedModifierType(modifierTypeFunc, weight, maxWeight);
  w.setTier(tier); // ✅ 여기서 "이 아이템의 티어"를 확정
  return w;
}
