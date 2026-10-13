// src/trainers/apply-knowhow-attrs.ts

import type {
  KnowhowAttr,
  KnowhowAttrBaseParams,
} from "./knowhow-attrs";
import type { TrainerKnowhow } from "./trainer-knowhow";

export function applyKnowhowAttrs<
  T extends KnowhowAttrBaseParams,
>(
  knowhow: TrainerKnowhow | undefined,
  AttrType: new (...args: any[]) => KnowhowAttr,
  params: T,
): void {
  if (!knowhow) {
    return;
  }

  for (const attr of knowhow.attrs) {
    if (!(attr instanceof AttrType)) {
      continue;
    }

    if (!attr.canApply(params)) {
      continue;
    }

    attr.apply(params);
  }
}