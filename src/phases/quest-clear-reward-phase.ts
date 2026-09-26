import { globalScene } from "#app/global-scene";
import { UiMode } from "#enums/ui-mode";
import { getModifierTypeFuncById } from "#modifiers/modifier-type";
import { BattlePhase } from "#phases/battle-phase";
import { type QuestEntry, questManager } from "#system/quest-manager";

export class QuestClearRewardPhase extends BattlePhase {
  public readonly phaseName = "QuestClearRewardPhase";

  private completedQuests: QuestEntry[] = [];
  private currentQuestIndex = 0;

  constructor(private readonly endRunAfterReward = true) {
    super();

    this.completedQuests = questManager.getCompletedQuests().map(quest => ({ ...quest }));
  }

  start(): void {
    super.start();

    console.log("[QUEST_CLEAR_REWARD_START]", {
      completedQuests: this.completedQuests,
    });

    globalScene.ui.setMode(UiMode.MESSAGE);

    if (this.completedQuests.length === 0) {
      console.warn("[QUEST_CLEAR_REWARD] 완료된 의뢰가 없습니다.");
      this.finishRewardSequence();
      return;
    }

    this.currentQuestIndex = 0;

    this.showCurrentQuestResult();
  }

  /**
   * 현재 의뢰의 해결 메시지를 보여줍니다.
   */
  private showCurrentQuestResult(): void {
    const quest = this.completedQuests[this.currentQuestIndex];

    if (!quest) {
      this.finishRewardSequence();
      return;
    }

    globalScene.ui.showText(
      `「${quest.title}」 의뢰를 해결했다!`,
      null,
      () => {
        this.giveCurrentQuestReward(quest);
      },
      null,
      true,
    );
  }

  /**
   * 현재 의뢰의 보상을 지급하고 메시지를 표시합니다.
   */
  private giveCurrentQuestReward(quest: QuestEntry): void {
    // RP 지급
    globalScene.gameData.addRoguePoints(quest.rewardRp);

    // 골드는 은행으로
    globalScene.gameData.bankMoney = (globalScene.gameData.bankMoney ?? 0) + quest.rewardGold;

    // 아이템은 로그센터 창고로
    for (const rewardItem of quest.rewardItems ?? []) {
      globalScene.gameData.addToStorage(rewardItem.modifierTypeId, rewardItem.quantity);

      console.log("[QUEST_ITEM_REWARD]", {
        questId: quest.id,
        itemId: rewardItem.modifierTypeId,
        quantity: rewardItem.quantity,
      });
    }

    globalScene.gameData.saveSystem();

    console.log("[QUEST_REWARD_GRANTED]", {
      questId: quest.id,
      title: quest.title,
      rewardRp: quest.rewardRp,
      rewardGold: quest.rewardGold,
      rewardItems: quest.rewardItems,
    });

    this.showRewardMessage(quest);
  }

  private showRewardMessage(quest: QuestEntry): void {
    const itemLines = (quest.rewardItems ?? [])
      .map(item => `${this.getRewardItemName(item.modifierTypeId)} x${item.quantity}`)
      .join("\n");

    const text =
      `그에 대한 보답으로 ${quest.rewardRp} RP를 받았다!\n`
      + `${quest.rewardGold}G가 로그센터 은행에 입금되었다!`
      + (itemLines ? `\n${itemLines}이(가) 로그센터 창고에 보관되었다!` : "");

    globalScene.ui.showText(
      text,
      null,
      () => {
        this.currentQuestIndex++;
        this.showCurrentQuestResult();
      },
      null,
      true,
    );
  }

  private getRewardItemName(itemId: string): string {
    const modifierFunc = getModifierTypeFuncById(itemId);

    if (!modifierFunc) {
      return itemId;
    }

    try {
      const type = modifierFunc();

      if (!type) {
        return itemId;
      }

      if (typeof type.getSafeName === "function") {
        return type.getSafeName();
      }

      return type.name ?? itemId;
    } catch {
      return itemId;
    }
  }
  /**
   * 모든 의뢰 정산이 끝난 뒤 처리합니다.
   */
  private finishRewardSequence(): void {
    console.log("[QUEST_CLEAR_REWARD_FINISH]");

    // 모든 의뢰 보상 정산 완료
    questManager.clearQuestBoard();

    globalScene.gameData.saveSystem();

    globalScene.ui.showText(
      "모든 의뢰의 보상을 받았다!",
      null,
      () => {
        // ★ 의뢰 클리어 방식으로 런 종료
        if (this.endRunAfterReward) {
          globalScene.phaseManager.pushNew("GameOverPhase", true, "QUEST");
        }

        this.end();
      },
      null,
      true,
    );
  }
}
