import { globalScene } from "#app/global-scene";
import { BattlePhase } from "#phases/battle-phase";

export class NewBattlePhase extends BattlePhase {
  public readonly phaseName = "NewBattlePhase";
  start() {
    super.start();

    const beforeWave = globalScene.currentBattle.waveIndex;

    globalScene.phaseManager.removeAllPhasesOfType("NewBattlePhase");

    // 테스트 전용: 개발자 콘솔에서 지정한 층으로 다음 배틀 생성 시 1회 이동한다.
    // 사용: globalScene.debugNextWave = 182
    // 배포 전 이 블록을 제거하거나 비활성화할 것.
    const debugScene = globalScene as typeof globalScene & { debugNextWave?: number };
    const requestedWave = debugScene.debugNextWave;
    // 1회성 예약은 성공/실패 여부와 무관하게 반드시 해제한다.
    delete debugScene.debugNextWave;

    const isValidWave =
      Number.isInteger(requestedWave)
      && requestedWave! >= 1
      && requestedWave! <= 200;

    if (requestedWave !== undefined && (!globalScene.gameMode.isClassic || !isValidWave)) {
      console.warn("[DEBUG_WAVE_JUMP_REJECTED]", {
        requestedWave,
        isClassic: globalScene.gameMode.isClassic,
      });
    }

    if (globalScene.gameMode.isClassic && isValidWave) {
      console.warn("[DEBUG_WAVE_JUMP]", { from: beforeWave, to: requestedWave });
      globalScene.newBattle(requestedWave);
    } else {
      globalScene.newBattle();
    }

    console.log("[NEW_BATTLE_AFTER_KECLEON]", {
      beforeWave,
      afterWave: globalScene.currentBattle.waveIndex,
    });

    this.end();
  }
}
