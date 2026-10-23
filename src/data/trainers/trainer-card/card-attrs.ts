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
  | "INCOMING_DAMAGE"
  | "EXTRA_ITEM_CHOICE"
  | "SHOP_PRICE"
  | "HEALING_ITEM_PRICE"
  | "REROLL_PRICE";

export abstract class CardAttr {
  abstract readonly kind: CardNumericKind | "HARMONY";
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
