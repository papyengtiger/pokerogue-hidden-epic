import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { UiMode } from "#enums/ui-mode";
import type { Unlockables } from "#enums/unlockables";
import { getUnlockableName } from "#system/unlockables";
import i18next from "i18next";

export class UnlockPhase extends Phase {
  public readonly phaseName = "UnlockPhase";
  private unlockable: Unlockables;

  constructor(unlockable: Unlockables) {
    super();

    this.unlockable = unlockable;
  }

  start(): void {
    globalScene.time.delayedCall(2000, () => {
      globalScene.gameData.unlocks[this.unlockable] = true;

      // 해금 상태를 시스템 데이터에 저장
      void globalScene.gameData.saveSystem().then(saved => {
        if (!saved) {
          console.error("[UNLOCK_PHASE] 해금 데이터 저장 실패:", this.unlockable);
        }
      });
      // Sound loaded into game as is
      globalScene.playSound("level_up_fanfare");
      globalScene.ui.setMode(UiMode.MESSAGE);
      globalScene.ui.showText(
        i18next.t("battle:unlockedSomething", {
          unlockedThing: getUnlockableName(this.unlockable),
        }),
        null,
        () => {
          globalScene.time.delayedCall(1500, () => globalScene.arenaBg.setVisible(true));
          this.end();
        },
        null,
        true,
        1500,
      );
    });
  }
}
