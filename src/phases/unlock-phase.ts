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
      const alreadyUnlocked = globalScene.gameData.unlocks[this.unlockable] === true;
      globalScene.gameData.unlocks[this.unlockable] = true;

      // 튜토리얼 완료 처리에서 이미 일괄 해금/저장했다면 중복 POST를 보내지 않습니다.
      if (!alreadyUnlocked) {
        void globalScene.gameData
          .saveSystem()
          .then(saved => {
            if (!saved) {
              console.error("[UNLOCK_PHASE] 해금 데이터 저장 실패:", this.unlockable);
            }
          })
          .catch(error => {
            console.error("[UNLOCK_PHASE] 해금 데이터 저장 오류:", error);
          });
      }

      let ended = false;
      const finish = () => {
        if (ended) {
          return;
        }
        ended = true;
        globalScene.time.delayedCall(1500, () => globalScene.arenaBg.setVisible(true));
        console.log("[UNLOCK_PHASE] 종료:", this.unlockable);
        this.end();
      };

      globalScene.playSound("level_up_fanfare");
      globalScene.ui.setMode(UiMode.MESSAGE);
      globalScene.ui.showText(
        i18next.t("battle:unlockedSomething", {
          unlockedThing: getUnlockableName(this.unlockable),
        }),
        null,
        finish,
        null,
        true,
        1500,
      );

      // 메시지 입력/콜백이 동작하지 않는 경우에도 게임 진행을 막지 않습니다.
      globalScene.time.delayedCall(10000, () => {
        if (!ended) {
          console.warn("[UNLOCK_PHASE] 메시지 콜백 지연 - 진행 복구:", this.unlockable);
          finish();
        }
      });
    });
  }
}
