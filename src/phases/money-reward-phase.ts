import { globalScene } from "#app/global-scene";
import { ArenaTagType } from "#enums/arena-tag-type";
import { MoneyMultiplierModifier } from "#modifiers/modifier";
import { BattlePhase } from "#phases/battle-phase";
import { trainerCardManager } from "#system/trainer-card-manager";
import { NumberHolder } from "#utils/common";
import i18next from "i18next";

export class MoneyRewardPhase extends BattlePhase {
  public readonly phaseName = "MoneyRewardPhase";
  private moneyMultiplier: number;

  constructor(moneyMultiplier: number) {
    super();
    this.moneyMultiplier = moneyMultiplier;
  }

  start() {
    const moneyAmount = new NumberHolder(globalScene.getWaveMoneyAmount(this.moneyMultiplier));

    globalScene.applyModifiers(MoneyMultiplierModifier, true, moneyAmount);

    if (globalScene.arena.getTag(ArenaTagType.HAPPY_HOUR)) {
      moneyAmount.value *= 2;
    }

    // 트레이너 카드: 소소한이득
    const beforeMoney = moneyAmount.value;
    const profitMultiplier = trainerCardManager.getMultiplier("GOLD_GAIN");

    moneyAmount.value = Math.floor(beforeMoney * profitMultiplier);

    console.log("[TRAINER_CARD_SMALL_PROFIT_GOLD]", {
      beforeMoney,
      profitMultiplier,
      afterMoney: moneyAmount.value,
    });

    globalScene.addMoney(moneyAmount.value);

    const userLocale = navigator.language || "en-US";
    const formattedMoneyAmount = moneyAmount.value.toLocaleString(userLocale);

    const message = i18next.t("battle:moneyWon", {
      moneyAmount: formattedMoneyAmount,
    });

    globalScene.ui.showText(message, null, () => this.end(), null, true);
  }
}
