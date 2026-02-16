import { timedEventManager } from "#app/global-event-manager";
import { globalScene } from "#app/global-scene";
import { modifierTypes } from "#data/data-lists";
import { getCharVariantFromDialogue } from "#data/dialogue";
import { BiomeId } from "#enums/biome-id";
import { TrainerSlot } from "#enums/trainer-slot";
import { TrainerType } from "#enums/trainer-type";
import { BattlePhase } from "#phases/battle-phase";
import { achvs } from "#system/achv";
import { vouchers } from "#system/voucher";
import { randSeedItem } from "#utils/common";
import i18next from "i18next";

export class TrainerVictoryPhase extends BattlePhase {
  public readonly phaseName = "TrainerVictoryPhase";

  start() {
  console.log("[TrainerVictoryPhase] START");

  const trainer = globalScene.currentBattle.trainer;
  if (!trainer) {
    console.warn("[TrainerVictoryPhase] trainer is null -> end()");
    this.end();
    return;
  }

  globalScene.disableMenu = true;

  globalScene.playBgm(trainer.config.victoryBgm);

  globalScene.phaseManager.unshiftNew("MoneyRewardPhase", trainer.config.moneyMultiplier);

  const modifierRewardFuncs = trainer.config.modifierRewardFuncs ?? [];
  console.log("[TrainerVictoryPhase] modifierRewardFuncs count =", modifierRewardFuncs.length);

  for (const [i, modifierRewardFunc] of modifierRewardFuncs.entries()) {
    console.log(`[TrainerVictoryPhase] enqueue ModifierRewardPhase #${i}`);
    globalScene.phaseManager.unshiftNew("ModifierRewardPhase", modifierRewardFunc);
  }

  const trainerType = trainer.config.trainerType;

    console.log("[TrainerVictoryPhase] trainerType =", TrainerType[trainerType]);
    console.log("[TrainerVictoryPhase] isBoss =", trainer?.config.isBoss);

    if (vouchers.hasOwnProperty(TrainerType[trainerType])) {
      const voucher = vouchers[TrainerType[trainerType]];
      console.log("[TrainerVictoryPhase] voucher entry found:", voucher);

      const valid = globalScene.validateVoucher(voucher);
      console.log("[TrainerVictoryPhase] voucher valid =", valid);

      if (!valid && trainer?.config.isBoss) {
        const upgraded = timedEventManager.getUpgradeUnlockedVouchers();
        console.log(
          "[TrainerVictoryPhase] grant voucher | upgraded =",
          upgraded,
        );

        const voucherType = voucher.voucherType;
        const reward = upgraded
          ? [
              modifierTypes.VOUCHER_PLUS,
              modifierTypes.VOUCHER_PLUS,
              modifierTypes.VOUCHER_PLUS,
              modifierTypes.VOUCHER_PREMIUM,
            ][voucherType]
          : [
              modifierTypes.VOUCHER,
              modifierTypes.VOUCHER,
              modifierTypes.VOUCHER_PLUS,
              modifierTypes.VOUCHER_PREMIUM,
            ][voucherType];

        console.log(
          "[TrainerVictoryPhase] enqueue voucher reward =",
          reward,
        );

        globalScene.phaseManager.unshiftNew(
          "ModifierRewardPhase",
          reward,
        );
      }
    }

    // 🛰️ Achievement check
    if (
      globalScene.arena.biomeType === BiomeId.SPACE &&
      (trainerType === TrainerType.BREEDER ||
        trainerType === TrainerType.EXPERT_POKEMON_BREEDER)
    ) {
      console.log("[TrainerVictoryPhase] Achv: BREEDERS_IN_SPACE");
      globalScene.validateAchv(achvs.BREEDERS_IN_SPACE);
    }

    // 🗨️ Victory dialogue
    const trainerName = trainer?.getName(TrainerSlot.NONE, true);
    console.log("[TrainerVictoryPhase] trainerDefeated text trainerName =", trainerName);

    globalScene.ui.showText(
      i18next.t("battle:trainerDefeated", { trainerName }),
      null,
      () => {
        const victoryMessages = trainer?.getVictoryMessages()!;
        console.log(
          "[TrainerVictoryPhase] victoryMessages =",
          victoryMessages,
        );

        let message: string;
        globalScene.executeWithSeedOffset(
          () => {
            message = randSeedItem(victoryMessages);
            console.log(
              "[TrainerVictoryPhase] selected victory message =",
              message,
            );
          },
          globalScene.currentBattle.waveIndex,
        );

        const showMessage = () => {
          console.log("[TrainerVictoryPhase] showDialogue");
          const originalFunc = showMessageOrEnd;
          showMessageOrEnd = () =>
            globalScene.ui.showDialogue(
              message,
              trainer?.getName(TrainerSlot.TRAINER, true),
              null,
              originalFunc,
            );
          showMessageOrEnd();
        };

        let showMessageOrEnd = () => {
          console.log("[TrainerVictoryPhase] END");
          this.end();
        };

        if (victoryMessages?.length) {
          const hasSprite = trainer?.config.hasCharSprite;
          const skip = globalScene.ui.shouldSkipDialogue(message);

          console.log(
            "[TrainerVictoryPhase] hasCharSprite =",
            hasSprite,
            "skipDialogue =",
            skip,
          );

          if (hasSprite && !skip) {
            const originalFunc = showMessageOrEnd;
            showMessageOrEnd = () =>
              globalScene.charSprite
                .hide()
                .then(() =>
                  globalScene.hideFieldOverlay(250).then(() => originalFunc()),
                );

            globalScene
              .showFieldOverlay(500)
              .then(() =>
                globalScene.charSprite
                  .showCharacter(
                    trainer?.getKey()!,
                    getCharVariantFromDialogue(victoryMessages[0]),
                  )
                  .then(() => showMessage()),
              );
          } else {
            showMessage();
          }
        } else {
          showMessageOrEnd();
        }
      },
      null,
      true,
    );

    this.showEnemyTrainer();
  }
}
