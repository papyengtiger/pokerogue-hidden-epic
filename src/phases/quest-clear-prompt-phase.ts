// src/phases/quest-clear-prompt-phase.ts

import { globalScene } from "#app/global-scene";
import { UiMode } from "#enums/ui-mode";
import { BattlePhase } from "#phases/battle-phase";
import { questManager } from "#system/quest-manager";

export class QuestClearPromptPhase extends BattlePhase {
  public readonly phaseName = "QuestClearPromptPhase";

  start(): void {
    super.start();

    globalScene.ui.showText("모든 의뢰를 해결했다!\n복귀하시겠습니까?", null, () => {
      globalScene.ui.setMode(
        UiMode.CONFIRM,

        // 예
        () => {
          globalScene.phaseManager.clearPhaseQueue();
          globalScene.phaseManager.pushNew("QuestClearRewardPhase");

          this.end();
          return true;
        },

        // 아니오
        () => {
          globalScene.ui.setMode(UiMode.MESSAGE);

          globalScene.ui.showText("계속 여행하기로 했다.", null, () => {
            // 해결된 의뢰 자동 정리
            questManager.removeCompletedQuests();

            globalScene.phaseManager.clearPhaseQueue();

            globalScene.phaseManager.pushNew("BattleEndPhase", false, true);

            globalScene.phaseManager.pushNew("NewBattlePhase");

            this.end();
          });

          return true;
        },
      );
    });
  }
}
