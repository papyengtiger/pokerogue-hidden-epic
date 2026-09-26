import { globalScene } from "#app/global-scene";
import { allMoves } from "#data/data-lists";
import type { BattlerIndex } from "#enums/battler-index";
import { Command } from "#enums/command";
import { UiMode } from "#enums/ui-mode";
import { PokemonPhase } from "#phases/pokemon-phase";
import { questManager } from "#system/quest-manager";
import i18next from "i18next";

export class SelectTargetPhase extends PokemonPhase {
  public readonly phaseName = "SelectTargetPhase";
  // biome-ignore lint/complexity/noUselessConstructor: This makes `fieldIndex` required
  constructor(fieldIndex: number) {
    super(fieldIndex);
  }

  start() {
    super.start();

    const turnCommand = globalScene.currentBattle.turnCommands[this.fieldIndex];

    const move = turnCommand?.move?.move;

    globalScene.ui.setMode(UiMode.TARGET_SELECT, this.fieldIndex, move, (targets: BattlerIndex[]) => {
      globalScene.ui.setMode(UiMode.MESSAGE);

      const fieldSide = globalScene.getField();
      const fullField = globalScene.getField(true);

      const user = fieldSide[this.fieldIndex];
      const moveObject = allMoves[move!];

      const target = fullField.find(p => p?.getBattlerIndex?.() === targets[0]);

      const waveIndex = globalScene.currentBattle.waveIndex;

      const isHeldItemQuestTarget = target && questManager.isActiveHeldItemQuestPokemon(target.id, waveIndex);

      const isCatchQuestTarget = target && questManager.isActiveCatchQuestTarget(target.species.speciesId, waveIndex);

      if (isHeldItemQuestTarget || isCatchQuestTarget) {
        globalScene.phaseManager.queueMessage(
          isHeldItemQuestTarget
            ? "의뢰 물품을 지닌 포켓몬이라 공격할 수 없다!"
            : "의뢰 대상 포켓몬이라 공격할 수 없다!",
          0,
          true,
        );

        targets = [];
      }

      if (
        targets.length > 0
        && moveObject
        && user
        && target
        && user.isMoveTargetRestricted(moveObject.id, user, target)
      ) {
        const errorMessage = user.getRestrictingTag(move!, user, target)!.selectionDeniedText(user, moveObject.id);

        globalScene.phaseManager.queueMessage(
          i18next.t(errorMessage, {
            moveName: moveObject.name,
          }),
          0,
          true,
        );

        targets = [];
      }

      if (targets.length === 0) {
        globalScene.currentBattle.turnCommands[this.fieldIndex] = null;
        globalScene.phaseManager.unshiftNew("CommandPhase", this.fieldIndex);
      } else {
        turnCommand!.targets = targets;
      }

      if (turnCommand?.command === Command.BALL && this.fieldIndex) {
        globalScene.currentBattle.turnCommands[this.fieldIndex - 1]!.skip = true;
      }

      this.end();
    });
  }
}
