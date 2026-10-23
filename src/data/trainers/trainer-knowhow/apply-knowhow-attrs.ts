// src/trainers/apply-knowhow-attrs.ts

import { globalScene } from "#app/global-scene";
import { GameModes } from "#enums/game-modes";
import type { KnowhowAttr, KnowhowAttrBaseParams } from "./knowhow-attrs";
import type { TrainerKnowhow } from "./trainer-knowhow";

export function applyKnowhowAttrs<T extends KnowhowAttrBaseParams>(
  knowhow: TrainerKnowhow | undefined,
  AttrType: new (...args: any[]) => KnowhowAttr,
  params: T,
): void {
  // 튜토리얼에서는 트레이너 노하우 효과 비활성화
  if (globalScene.gameMode?.modeId === GameModes.TUTORIAL) {
    return;
  }

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
