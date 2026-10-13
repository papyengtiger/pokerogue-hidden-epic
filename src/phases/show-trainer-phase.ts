import { globalScene } from "#app/global-scene";
import { PlayerGender } from "#enums/player-gender";
import { BattlePhase } from "#phases/battle-phase";

export class ShowTrainerPhase extends BattlePhase {
  public readonly phaseName = "ShowTrainerPhase";

  start() {
    super.start();

    const trainer = globalScene.trainer;

    trainer.setTexture(
      `trainer_${
        globalScene.gameData.gender === PlayerGender.FEMALE
          ? "f"
          : "m"
      }_back`,
    );

    trainer.setVisible(true);

    const companion =
      globalScene.currentBattle?.companionTrainer
        ? globalScene.companionTrainerSprite
        : null;

    if (companion) {
      companion.setTexture(
        globalScene.gameData.gender === PlayerGender.FEMALE
          ? "trainer_m_back"
          : "trainer_f_back",
      );

      companion.setPosition(
        trainer.x + 28,
        trainer.y,
      );

      companion.setVisible(true);

      globalScene.tweens.add({
        targets: trainer,
        x: 94,
        duration: 1000,
      });

      globalScene.tweens.add({
        targets: companion,
        x: 122,
        duration: 1000,
        onComplete: () => this.end(),
      });

      return;
    }

    globalScene.tweens.add({
      targets: trainer,
      x: 106,
      duration: 1000,
      onComplete: () => this.end(),
    });
  }
}