import { globalScene } from "#app/global-scene";
import { BattlePhase } from "#phases/battle-phase";

export class NewBattlePhase extends BattlePhase {
  public readonly phaseName = "NewBattlePhase";
  start() {
    super.start();

    const beforeWave = globalScene.currentBattle.waveIndex;

    globalScene.phaseManager.removeAllPhasesOfType("NewBattlePhase");

    globalScene.newBattle();

    console.log("[NEW_BATTLE_AFTER_KECLEON]", {
      beforeWave,
      afterWave: globalScene.currentBattle.waveIndex,
    });

    this.end();
  }
}
