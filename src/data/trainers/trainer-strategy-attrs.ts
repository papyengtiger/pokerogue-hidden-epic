// Suggested project path: src/trainers/trainer-strategy-attrs.ts
// Pure strategy-effect calculations. Gameplay call sites are connected in a later step.
import {
  type TrainerStrategy,
  type TrainerStrategyEffect,
  type TrainerStrategyEffectId,
} from "./trainer-strategy";

/** Only the selected strategy contributes effects (earlier tiers do not stack). */
export function getStrategyEffect(
  strategy: TrainerStrategy | null | undefined,
  id: TrainerStrategyEffectId,
): TrainerStrategyEffect | undefined {
  return strategy?.effects.find(effect => effect.id === id);
}

export function getStrategyMultiplier(
  strategy: TrainerStrategy | null | undefined,
  id: TrainerStrategyEffectId,
): number {
  return getStrategyEffect(strategy, id)?.value ?? 1;
}

export type StrategyRewardKind =
  | "EXPERIENCE_GAIN"
  | "GOLD_GAIN"
  | "ROGUE_POINT_GAIN"
  | "CANDY_GAIN";

/** Calculate a nonnegative, integer reward; call BEFORE adding the reward. */
export function applyStrategyRewardMultiplier(
  strategy: TrainerStrategy | null | undefined,
  kind: StrategyRewardKind,
  amount: number,
): number {
  return Math.max(0, Math.floor(amount * getStrategyMultiplier(strategy, kind)));
}

/** The original stat is passed in by the battle system. Exclude HP at the call site if desired. */
export function applyStrategyStatMultiplier(
  strategy: TrainerStrategy | null | undefined,
  statValue: number,
  options: { isAlly: boolean; baseStatTotal: number },
): number {
  if (!options.isAlly) return statValue;
  let multiplier = getStrategyMultiplier(strategy, "PARTY_STATS");
  const bstEffect = getStrategyEffect(strategy, "LOW_BST_STATS");
  if (bstEffect) {
    // Medic: < 580, Growth Master: <= 580. The latter is identified explicitly
    // by its note in trainer-strategy.ts; avoid accidentally changing the rule.
    const inclusive = bstEffect.note?.includes("<=") ?? false;
    const eligible = inclusive
      ? options.baseStatTotal <= (bstEffect.threshold ?? 580)
      : options.baseStatTotal < (bstEffect.threshold ?? 580);
    if (eligible) multiplier *= bstEffect.value;
  }
  return Math.max(0, Math.floor(statValue * multiplier));
}

export type StrategyTypeEffectiveness = 0 | 0.25 | 0.5 | 1 | 2 | 4;

/**
 * Modifies MOVE POWER, not type effectiveness. Apply once, before regular damage
 * calculation. For multi-hit moves, make sure not to reapply at each damage stage.
 * 'directAttack' excludes reflected/fixed damage (e.g. Metal Burst).
 */
export function applyStrategyMovePowerMultiplier(
  strategy: TrainerStrategy | null | undefined,
  basePower: number,
  options: {
    isAlly: boolean;
    isDamagingMove: boolean;
    directAttack: boolean;
    typeEffectiveness: number;
  },
): number {
  if (!options.isAlly || !options.isDamagingMove) return basePower;
  let factor = 1;
  const general = getStrategyEffect(strategy, "MOVE_POWER");
  // Growth Master penalty applies only to direct attacks; other strategies'
  // universal power bonus applies to damaging moves.
  if (general && (general.value >= 1 || options.directAttack)) {
    factor *= general.value;
  }
  const effectiveness = options.typeEffectiveness;
  if (effectiveness === 0.25) {
    factor *= getStrategyMultiplier(strategy, "DOUBLE_RESISTED_MOVE_POWER");
  } else if (effectiveness === 0.5) {
    factor *= getStrategyMultiplier(strategy, "RESISTED_MOVE_POWER");
  } else if (effectiveness >= 2) {
    factor *= getStrategyMultiplier(strategy, "SUPER_EFFECTIVE_MOVE_POWER");
  }
  return Math.max(0, Math.floor(basePower * factor));
}

/** The base capture probability is a fraction between 0 and 1. */
export function applyStrategyCaptureProbability(
  strategy: TrainerStrategy | null | undefined,
  originalProbability: number,
  options: {
    baseCatchRate: number;
    isMasterBall: boolean;
    captureAllowed: boolean;
  },
): number {
  if (!options.captureAllowed) return 0;
  if (options.isMasterBall) return Math.max(0, Math.min(1, originalProbability));
  const guaranteed = getStrategyEffect(strategy, "GUARANTEED_LOW_CATCH_RATE");
  if (guaranteed && options.baseCatchRate <= (guaranteed.threshold ?? 45)) return 1;
  return Math.max(0, Math.min(1,
    originalProbability * getStrategyMultiplier(strategy, "CAPTURE_RATE"),
  ));
}

/** Recruit probability is a fraction between 0 and 1. */
export function applyStrategyRecruitProbability(
  strategy: TrainerStrategy | null | undefined,
  originalProbability: number,
  options: { recruitmentAllowed: boolean },
): number {
  if (!options.recruitmentAllowed) return 0;
  const guaranteed = getStrategyEffect(strategy, "GUARANTEED_LOW_RECRUIT_RATE");
  if (guaranteed && originalProbability <= (guaranteed.threshold ?? 0.5)) return 1;
  return Math.max(0, Math.min(1,
    originalProbability * getStrategyMultiplier(strategy, "RECRUIT_RATE"),
  ));
}

/** Pass a seeded RNG roll in [0,1). Do not use Math.random in seeded battles. */
export function shouldRecycleStrategyBall(
  strategy: TrainerStrategy | null | undefined,
  roll: number,
): boolean {
  const chance = getStrategyEffect(strategy, "BALL_RECYCLE_CHANCE")?.value ?? 0;
  return roll >= 0 && roll < Math.min(1, Math.max(0, chance));
}

/** Egg hatch counter is not allowed to go below 1. */
export function applyStrategyHatchCount(
  strategy: TrainerStrategy | null | undefined,
  remainingCount: number,
): number {
  if (remainingCount <= 0) return remainingCount;
  return Math.max(1, Math.ceil(remainingCount * getStrategyMultiplier(strategy, "HATCH_COUNT")));
}

export function applyStrategyFriendshipEffect(
  strategy: TrainerStrategy | null | undefined,
  effectAmount: number,
): number {
  return effectAmount * getStrategyMultiplier(strategy, "FRIENDSHIP_EFFECT");
}

/** Battle hook result, not the actual stat-change operation. */
export function getStrategyMissOrFailStatBoost(
  strategy: TrainerStrategy | null | undefined,
  options: { isAlly: boolean; moveMissedOrFailed: boolean },
): number {
  if (!options.isAlly || !options.moveMissedOrFailed) return 0;
  return getStrategyEffect(strategy, "ON_MOVE_FAIL_BEST_STAT_STAGE")?.value ?? 0;
}

export interface StrategyTurnRecovery {
  /** HP to restore at end of turn. */
  hp: number;
  /** Remove major status condition. */
  cureStatus: boolean;
  /** Remove negative stat stage changes. */
  cureNegativeStatStages: boolean;
  /** Remaining PP to restore per move; 0 means none. */
  ppPerMove: number;
}

/**
 * Calculate, do not perform, end-of-turn recovery. Caller decides which
 * party members qualify, and applies it exactly once per turn.
 * A PP recovery effect with value 0 is intentionally unimplemented for LEADER.
 */
export function getStrategyTurnRecovery(
  strategy: TrainerStrategy | null | undefined,
  options: { isAlly: boolean; maxHp: number; currentPp: number; maxPp: number },
): StrategyTurnRecovery {
  const empty: StrategyTurnRecovery = {
    hp: 0, cureStatus: false, cureNegativeStatStages: false, ppPerMove: 0,
  };
  if (!options.isAlly) return empty;
  const hpFraction = getStrategyEffect(strategy, "END_TURN_HP_RECOVERY")?.value ?? 0;
  const ppFraction = getStrategyEffect(strategy, "END_TURN_PP_RECOVERY")?.value ?? 0;
  return {
    hp: hpFraction > 0 ? Math.max(1, Math.floor(options.maxHp * hpFraction)) : 0,
    cureStatus: !!getStrategyEffect(strategy, "END_TURN_STATUS_CURE"),
    cureNegativeStatStages: !!getStrategyEffect(strategy, "END_TURN_NEGATIVE_STAT_CURE"),
    ppPerMove: ppFraction > 0
      ? Math.min(Math.max(0, options.maxPp - options.currentPp),
          Math.max(1, Math.ceil(options.maxPp * ppFraction)))
      : 0,
  };
}
