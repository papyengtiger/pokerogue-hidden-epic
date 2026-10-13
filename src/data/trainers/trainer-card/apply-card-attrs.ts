import type { CardNumericKind } from "./card-attrs";
import { trainerCardManager } from "#system/trainer-card-manager";

/** Simple adapter for future call sites; do not apply twice. */
export function getCardMultiplier(kind: CardNumericKind): number {
  return trainerCardManager.getMultiplier(kind);
}
