// Suggested project path: src/trainers/trainer-strategy.ts
// First step: strategy definitions only. Effects are NOT applied by this file.
import i18next from "i18next";
import { toCamelCase } from "#utils/strings";
import type { Localizable } from "#types/locales";

export enum TrainingSlotType {
  BATTLE = "BATTLE",
  GROWTH = "GROWTH",
  FRIEND = "FRIEND",
  EPIC = "EPIC",
}

export enum TrainerStrategyId {
  ROOKIE = "ROOKIE",
  BATTLER = "BATTLER",
  BREEDER = "BREEDER",
  FRIENDLY = "FRIENDLY",
  COMMON = "COMMON",
  ELITE = "ELITE",
  EXPERT = "EXPERT",
  PERSUADER = "PERSUADER",
  VETERAN = "VETERAN",
  MEDIC = "MEDIC",
  LEADER = "LEADER",
  BATTLE_MASTER = "BATTLE_MASTER",
  GROWTH_MASTER = "GROWTH_MASTER",
  MASTER_LEADER = "MASTER_LEADER",
}

export type StrategySlots = Readonly<Record<TrainingSlotType, number>>;

/** Declarative effect ids. Gameplay integrations will be added separately. */
export type TrainerStrategyEffectId =
  | "DAMAGE_DEALT" | "DAMAGE_TAKEN" | "EXPERIENCE_GAIN" | "GOLD_GAIN"
  | "ROGUE_POINT_GAIN" | "CAPTURE_RATE" | "RECRUIT_RATE"
  | "PARTY_STATS" | "MOVE_POWER" | "RESISTED_MOVE_POWER"
  | "DOUBLE_RESISTED_MOVE_POWER" | "SUPER_EFFECTIVE_MOVE_POWER"
  | "HATCH_COUNT" | "BALL_RECYCLE_CHANCE" | "CANDY_GAIN"
  | "LOW_BST_STATS" | "FRIENDSHIP_EFFECT" | "ON_MOVE_FAIL_BEST_STAT_STAGE"
  | "GUARANTEED_LOW_CATCH_RATE" | "GUARANTEED_LOW_RECRUIT_RATE"
  | "END_TURN_HP_RECOVERY" | "END_TURN_STATUS_CURE"
  | "END_TURN_NEGATIVE_STAT_CURE" | "END_TURN_PP_RECOVERY";

export interface TrainerStrategyEffect {
  readonly id: TrainerStrategyEffectId;
  /** Multiplier, fractional chance, stat-stage count, or other value as documented by id. */
  readonly value: number;
  readonly threshold?: number;
  readonly note?: string;
}

export class TrainerStrategy implements Localizable {
  public name = "";
  public description = "";

  constructor(
    public readonly id: TrainerStrategyId,
    public readonly tier: number,
    public readonly requiredWave: number,
    public readonly slots: StrategySlots,
    public readonly effects: readonly TrainerStrategyEffect[],
  ) {
    this.localize();
  }

  localize(): void {
    const key = toCamelCase(this.id);
    this.name = i18next.t(`trainerStrategy:${key}.name`);
    this.description = i18next.t(`trainerStrategy:${key}.description`);
  }

  get slotCount(): number {
    return Object.values(this.slots).reduce((sum, count) => sum + count, 0);
  }
}

const slots = (battle: number, growth: number, friend: number, epic: number): StrategySlots => ({
  [TrainingSlotType.BATTLE]: battle,
  [TrainingSlotType.GROWTH]: growth,
  [TrainingSlotType.FRIEND]: friend,
  [TrainingSlotType.EPIC]: epic,
});
const effect = (id: TrainerStrategyEffectId, value: number, threshold?: number, note?: string): TrainerStrategyEffect => ({ id, value, threshold, note });

export const allTrainerStrategies: readonly TrainerStrategy[] = [
  new TrainerStrategy(TrainerStrategyId.ROOKIE, 0, 0, slots(1, 1, 0, 0), []),
  new TrainerStrategy(TrainerStrategyId.BATTLER, 1, 50, slots(2, 1, 0, 1), [effect("DAMAGE_DEALT", 1.1), effect("DAMAGE_TAKEN", 0.9)]),
  new TrainerStrategy(TrainerStrategyId.BREEDER, 1, 50, slots(0, 2, 1, 1), [effect("EXPERIENCE_GAIN", 1.1), effect("GOLD_GAIN", 1.1)]),
  new TrainerStrategy(TrainerStrategyId.FRIENDLY, 1, 50, slots(1, 0, 2, 1), [effect("CAPTURE_RATE", 1.5), effect("RECRUIT_RATE", 1.5)]),
  new TrainerStrategy(TrainerStrategyId.COMMON, 1, 50, slots(1, 1, 1, 1), [effect("ROGUE_POINT_GAIN", 1.3)]),
  new TrainerStrategy(TrainerStrategyId.ELITE, 2, 250, slots(2, 1, 1, 2), [effect("PARTY_STATS", 1.2), effect("RESISTED_MOVE_POWER", 1.5)]),
  new TrainerStrategy(TrainerStrategyId.EXPERT, 2, 250, slots(1, 2, 1, 2), [effect("EXPERIENCE_GAIN", 1.2), effect("GOLD_GAIN", 1.2), effect("ROGUE_POINT_GAIN", 1.2), effect("HATCH_COUNT", 0.9)]),
  new TrainerStrategy(TrainerStrategyId.PERSUADER, 2, 250, slots(1, 1, 2, 2), [effect("CAPTURE_RATE", 2), effect("RECRUIT_RATE", 2), effect("BALL_RECYCLE_CHANCE", 0.4)]),
  new TrainerStrategy(TrainerStrategyId.VETERAN, 3, 1000, slots(3, 1, 1, 3), [effect("PARTY_STATS", 1.5), effect("RESISTED_MOVE_POWER", 2), effect("DOUBLE_RESISTED_MOVE_POWER", 4), effect("SUPER_EFFECTIVE_MOVE_POWER", 1.5)]),
  new TrainerStrategy(TrainerStrategyId.MEDIC, 3, 1000, slots(1, 3, 1, 3), [effect("CANDY_GAIN", 2), effect("EXPERIENCE_GAIN", 1.5), effect("GOLD_GAIN", 1.5), effect("ROGUE_POINT_GAIN", 1.5), effect("LOW_BST_STATS", 1.3, 580, "BST < 580")]),
  new TrainerStrategy(TrainerStrategyId.LEADER, 3, 1000, slots(1, 1, 3, 3), [effect("CAPTURE_RATE", 3), effect("RECRUIT_RATE", 3), effect("BALL_RECYCLE_CHANCE", 0.5), effect("END_TURN_HP_RECOVERY", 1 / 16), effect("END_TURN_STATUS_CURE", 1), effect("END_TURN_PP_RECOVERY", 0, undefined, "Recovery amount not finalized")]),
  new TrainerStrategy(TrainerStrategyId.BATTLE_MASTER, 4, 2000, slots(4, 2, 2, 4), [effect("PARTY_STATS", 2), effect("MOVE_POWER", 1.5), effect("RESISTED_MOVE_POWER", 2), effect("DOUBLE_RESISTED_MOVE_POWER", 4), effect("SUPER_EFFECTIVE_MOVE_POWER", 2), effect("ON_MOVE_FAIL_BEST_STAT_STAGE", 2), effect("CAPTURE_RATE", 0.5, undefined, "Except Master Ball"), effect("RECRUIT_RATE", 0.5)]),
  new TrainerStrategy(TrainerStrategyId.GROWTH_MASTER, 4, 2000, slots(2, 4, 2, 4), [effect("CANDY_GAIN", 4), effect("EXPERIENCE_GAIN", 3), effect("GOLD_GAIN", 3), effect("ROGUE_POINT_GAIN", 3), effect("LOW_BST_STATS", 1.5, 580, "BST <= 580"), effect("FRIENDSHIP_EFFECT", 1.5), effect("MOVE_POWER", 0.5, undefined, "Direct attack moves only; reflected damage excluded")]),
  new TrainerStrategy(TrainerStrategyId.MASTER_LEADER, 4, 2000, slots(2, 2, 4, 4), [effect("GUARANTEED_LOW_CATCH_RATE", 1, 45, "Base catch rate <= 45; capture restrictions need validation"), effect("GUARANTEED_LOW_RECRUIT_RATE", 1, 0.5), effect("END_TURN_HP_RECOVERY", 4 / 16), effect("END_TURN_STATUS_CURE", 1), effect("END_TURN_NEGATIVE_STAT_CURE", 1), effect("END_TURN_PP_RECOVERY", 1, undefined, "Full PP each turn"), effect("EXPERIENCE_GAIN", 0.5), effect("GOLD_GAIN", 0.5), effect("MOVE_POWER", 0.5)]),
];

export function getTrainerStrategy(id: TrainerStrategyId): TrainerStrategy | undefined {
  return allTrainerStrategies.find(strategy => strategy.id === id);
}

export function getAvailableTrainerStrategies(wave: number, slotCount?: number): TrainerStrategy[] {
  return allTrainerStrategies.filter(strategy =>
    wave >= strategy.requiredWave && (slotCount === undefined || strategy.slotCount === slotCount)
  );
}

// Safeguard: validate slot layouts on module load during development.
for (const strategy of allTrainerStrategies) {
  const expected = strategy.tier === 0 ? 2 : strategy.tier === 4 ? 12 : strategy.tier * 2 + 2;
  if (strategy.slotCount !== expected) {
    throw new Error(`Invalid slots for ${strategy.id}: expected ${expected}, got ${strategy.slotCount}`);
  }
}
