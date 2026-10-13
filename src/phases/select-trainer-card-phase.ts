
import { globalScene } from "#app/global-scene";
import { UiMode } from "#enums/ui-mode";
import { TempExtraModifierModifier } from "#modifiers/modifier";
import { BattlePhase } from "#phases/battle-phase";
import { trainerCardManager } from "#system/trainer-card-manager";
import { allTrainerCards } from "#trainers/trainer-card/trainer-card";
import { NumberHolder, randSeedInt } from "#utils/common";

export class SelectTrainerCardPhase extends BattlePhase {
  public readonly phaseName = "SelectTrainerCardPhase";

  start(): void {
  super.start();

  const availableCards = [...allTrainerCards];

  console.log("[TRAINER_CARD_DEBUG]", {
    registeredCards: allTrainerCards.length,
    availableCards: availableCards.length,
    registeredIds: allTrainerCards.map(card => card.id),
    saveData: trainerCardManager.exportSaveData(),
  });

  if (availableCards.length === 0) {
    console.log("[TRAINER_CARD_NO_AVAILABLE]");
    this.end();
    return;
  }

    // 기본 선택지 3개 + 실버볼 효과
    const optionCount = new NumberHolder(3);

    globalScene.applyModifiers(
      TempExtraModifierModifier,
      true,
      optionCount,
    );

    // 기존 RNG를 이용한 카드 섞기
    const shuffled = [...availableCards];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randSeedInt(i + 1);
      [shuffled[i], shuffled[j]] = [
        shuffled[j],
        shuffled[i],
      ];
    }

    const cards = shuffled.slice(
      0,
      Math.max(1, Math.floor(optionCount.value)),
    );

    console.log("[TRAINER_CARD_OPTIONS]", {
      wave: globalScene.currentBattle.waveIndex,
      choices: cards.map(card => card.id),
    });

    globalScene.ui.setMode(UiMode.OPTION_SELECT, {
      noCancel: true,
      supportHover: true,
      options: cards.map(card => ({
        label: card.name,

        onHover: () => {
          globalScene.ui.showTooltip(
            card.name,
            card.description,
          );
        },

        handler: () => {
          const granted = trainerCardManager.grant(card.id);

          if (!granted) {
            globalScene.ui.playError();
            return false;
          }

          console.log("[TRAINER_CARD_GRANTED]", {
            card: card.id,
            category: card.category,
          });

          globalScene.ui.hideTooltip();
          globalScene.ui.setMode(UiMode.MESSAGE);

          globalScene.gameData.saveSystem();
          this.end();

          return true;
        },
      })),
    });
  }
}
