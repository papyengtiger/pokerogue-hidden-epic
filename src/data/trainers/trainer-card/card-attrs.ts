/** Trainer card declarations. Effects are applied by their respective gameplay call sites. */
export type CardNumericKind =
  | "SUPER_EFFECTIVE_DAMAGE"
  | "CANDY_REWARD"
  | "COMPANION_EXP"
  | "PP_SAVE_CHANCE"
  | "NOT_VERY_EFFECTIVE_DAMAGE"
  | "QUARTER_EFFECTIVE_DAMAGE"
  | "EXP_GAIN"
  | "GOLD_GAIN"
  | "RP_GAIN"
  | "EV_GAIN"
  | "CATCH_RATE"
  | "BALL_REWARD_WEIGHT"
  | "INCOMING_DAMAGE"
  | "EXTRA_ITEM_CHOICE"
  | "SHOP_PRICE"
  | "HEALING_ITEM_PRICE"
  | "REROLL_PRICE"
  | "CRIT_STAGE_BONUS"
  | "LOW_HP_ATTACK_DAMAGE"
  | "STATUS_DAMAGE_REDUCTION"
  | "SWITCH_IN_HEAL_FRACTION"
  | "ITEM_TIER_UPGRADE_CHANCE";

export abstract class CardAttr {
  abstract readonly kind: CardNumericKind | "HARMONY" | "LEVEL_UP_HEAL" | "MARK_EXP_BONUS";
}

export class CardMultiplierAttr extends CardAttr {
  constructor(
    public readonly kind: CardNumericKind,
    public readonly multiplier: number,
  ) {
    super();
  }
}

export class HarmonyCardAttr extends CardAttr {
  readonly kind = "HARMONY" as const;
  constructor(public readonly bonusAmplifier = 1.2) {
    super();
  }
}

export function amplifyCardMultiplier(multiplier: number, harmonyEquipped: boolean): number {
  return harmonyEquipped ? 1 + (multiplier - 1) * 1.2 : multiplier;
}


/** Restores 10% of maximum HP per level gained (living Pokémon only). */
export class LevelUpHealCardAttr extends CardAttr {
  readonly kind = "LEVEL_UP_HEAL" as const;
  constructor(public readonly healFraction = 0.1) { super(); }
}

/** EXP increase by the highest grade of a Pokémon's own mark. */
export class MarkExpCardAttr extends CardAttr {
  readonly kind = "MARK_EXP_BONUS" as const;
}
