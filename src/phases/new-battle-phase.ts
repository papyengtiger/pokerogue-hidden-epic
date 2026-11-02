import { globalScene } from "#app/global-scene";
import { BattleType } from "#enums/battle-type";
import { GameModes } from "#enums/game-modes";
import { BattlePhase } from "#phases/battle-phase";

export class NewBattlePhase extends BattlePhase {
  public readonly phaseName = "NewBattlePhase";
  start() {
    super.start();

    const beforeWave = globalScene.currentBattle.waveIndex;

    globalScene.phaseManager.removeAllPhasesOfType("NewBattlePhase");

    if (globalScene.gameMode.modeId === GameModes.THEOTHER && beforeWave === 300 && globalScene.theOther300Stage > 0) {
      globalScene.newBattle(300, BattleType.WILD, undefined, false);
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
