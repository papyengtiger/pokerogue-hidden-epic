/** Numeric-only initial card attributes. Integrate at the corresponding reward/damage call sites. */
export type CardNumericKind = "SUPER_EFFECTIVE_DAMAGE" | "CANDY_REWARD" | "COMPANION_EXP";

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

/** The harmony card amplifies only the BONUS above 1x, not the entire multiplier. */
export class HarmonyCardAttr extends CardAttr {
  readonly kind = "HARMONY" as const;
  constructor(public readonly bonusAmplifier = 1.2) {
    super();
  }
}

export function amplifyCardMultiplier(multiplier: number, harmonyEquipped: boolean): number {
  return harmonyEquipped ? 1 + (multiplier - 1) * 1.2 : multiplier;
}
