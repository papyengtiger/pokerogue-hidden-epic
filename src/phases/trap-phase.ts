import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import type { Trap } from "#data/trap/trap";
import { trapManager } from "#data/trap/trap-manager";
import { type TrapReward, type TrapRewardEntry, TrapRewardGrade, TrapRewardType } from "#data/trap/trap-reward";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { UiMode } from "#enums/ui-mode";
import type { OptionSelectConfig, OptionSelectItem } from "#ui/abstract-option-select-ui-handler";
import Phaser from "phaser";

const TRAP_TEXTURE_FOLDER = "trap";

const PLAYER_TRAP_POSITION = {
  x: 106,
  y: 116,
};

const ENEMY_TRAP_POSITION = {
  x: 234,
  y: 78,
};

const TRAP_SCALE = 1;
const TRAP_DISPLAY_TIME = 500;
const TRAP_FADE_TIME = 500;

export class TrapPhase extends Phase {
  public readonly phaseName = "TrapPhase";

  private trapImages: Phaser.GameObjects.Image[] = [];

  public override start(): void {
    super.start();

    // 1. 이번 조우의 자연 함정 결정
    trapManager.prepareBattleTrap();

    const trap = trapManager.getPendingTrap();

    if (!trap) {
      this.end();
      return;
    }

    const textureKey = trap.imageKey;

    // 2. 해당 함정 이미지를 아직 로드하지 않았다면 로드
    if (!globalScene.textures.exists(textureKey)) {
      globalScene.loadImage(textureKey, TRAP_TEXTURE_FOLDER);

      globalScene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        console.log("[TRAP_TEXTURE_AFTER_LOAD]", {
          key: textureKey,
          loaded: globalScene.textures.exists(textureKey),
        });

        this.showTrap();
      });

      if (!globalScene.load.isLoading()) {
        globalScene.load.start();
      }

      return;
    }

    this.showTrap();
  }

  private getRewardGradeName(grade: TrapRewardGrade): string {
    switch (grade) {
      case TrapRewardGrade.COMMON:
        return "커먼";

      case TrapRewardGrade.GREAT:
        return "그레이트";

      case TrapRewardGrade.ULTRA:
        return "울트라";

      case TrapRewardGrade.MASTER:
        return "마스터";

      default:
        return "커먼";
    }
  }

  private async activateTrap(): Promise<void> {
    await globalScene.ui.setMode(UiMode.MESSAGE);

    try {
      await trapManager.activatePreparedTrap();
    } catch (error) {
      console.error("[TRAP_ACTIVATE_ERROR]", error);
    } finally {
      // 상대편 함정 적용 과정에서 무슨 일이 생겨도
      // 선택한 기본 보상은 반드시 처리
      await trapManager.grantBaseReward();

      await this.clearTrapImages();

      trapManager.clearPendingTrap();
      this.end();
    }
  }

  private async tryDisarmTrap(): Promise<void> {
    const success = trapManager.tryDisarmPreparedTrap();

    await globalScene.ui.setMode(UiMode.MESSAGE);

    if (success) {
      await trapManager.grantBaseReward();
      await trapManager.grantDisarmBonus();

      await this.clearTrapImages();

      trapManager.clearPendingTrap();
      this.end();
      return;
    }

    try {
      await trapManager.activatePreparedTrap();
    } catch (error) {
      console.error("[TRAP_ACTIVATE_ERROR]", error);
    } finally {
      await trapManager.grantBaseReward();

      await this.clearTrapImages();

      trapManager.clearPendingTrap();
      this.end();
    }
  }

  private async openDisarmConfirm(reward: TrapReward): Promise<void> {
    await globalScene.ui.setMode(UiMode.MESSAGE);

    const disarmRewardText = this.getCombinedRewardText(reward.baseRewards, reward.disarmBonuses);

    globalScene.ui.showText(
      "정말 함정을 해제하시겠습니까?\n" + `해제시 보상: ${disarmRewardText}`,
      null,
      () => {
        this.openDisarmConfirmMenu(reward);
      },
      null,
      true,
    );
  }

  private openDisarmConfirmMenu(reward: TrapReward): void {
    const options: OptionSelectItem[] = [
      {
        label: "예",
        keepOpen: true,

        handler: () => {
          void this.tryDisarmTrap();
          return true;
        },
      },

      {
        label: "아니오",
        keepOpen: true,

        handler: () => {
          void this.returnToTrapChoice(reward);
          return true;
        },
      },
    ];

    const config: OptionSelectConfig = {
      options,
      maxOptions: 2,
      yOffset: 0,
    };

    globalScene.ui.setMode(UiMode.OPTION_SELECT, config);
  }

  private async openActivateConfirm(reward: TrapReward): Promise<void> {
    await globalScene.ui.setMode(UiMode.MESSAGE);

    const activateRewardText = this.getRewardText(reward.baseRewards);

    globalScene.ui.showText(
      "정말 함정을 작동시키시겠습니까?\n" + `작동시 보상: ${activateRewardText}`,
      null,
      () => {
        this.openActivateConfirmMenu(reward);
      },
      null,
      true,
    );
  }

  private getCombinedRewardText(baseRewards: TrapRewardEntry[], bonusRewards: TrapRewardEntry[]): string {
    const getAmount = (rewards: TrapRewardEntry[], type: TrapRewardType): number => {
      return rewards.find(r => r.type === type)?.amount ?? 0;
    };

    const money = getAmount(baseRewards, TrapRewardType.MONEY) + getAmount(bonusRewards, TrapRewardType.MONEY);

    const rp = getAmount(baseRewards, TrapRewardType.ROGUE_POINT) + getAmount(bonusRewards, TrapRewardType.ROGUE_POINT);

    const exp = getAmount(baseRewards, TrapRewardType.EXP) + getAmount(bonusRewards, TrapRewardType.EXP);

    const baseItem = baseRewards.find(r => r.type === TrapRewardType.ITEM);

    const bonusItem = bonusRewards.find(r => r.type === TrapRewardType.ITEM);

    const items = [
      baseItem?.item ? `${baseItem.item.type.name} (${this.getRewardGradeName(baseItem.grade)})` : null,

      bonusItem?.item ? `${bonusItem.item.type.name} (${this.getRewardGradeName(bonusItem.grade)})` : null,
    ]
      .filter(Boolean)
      .join(" + ");

    return [`${money}G`, `${rp} RP`, items || null, `${exp} EXP`].filter(Boolean).join(" / ");
  }

  private openActivateConfirmMenu(reward: TrapReward): void {
    const options: OptionSelectItem[] = [
      {
        label: "예",
        keepOpen: true,

        handler: () => {
          void this.activateTrap();
          return true;
        },
      },

      {
        label: "아니오",
        keepOpen: true,

        handler: () => {
          void this.returnToTrapChoice(reward);
          return true;
        },
      },
    ];

    const config: OptionSelectConfig = {
      options,
      maxOptions: 2,
      yOffset: 0,
    };

    globalScene.ui.setMode(UiMode.OPTION_SELECT, config);
  }

  private async returnToTrapChoice(reward: TrapReward): Promise<void> {
    await globalScene.ui.setMode(UiMode.MESSAGE);

    globalScene.ui.showText(
      "함정을 발견했다!\n행동을 선택해 주세요.",
      null,
      () => {
        this.openTrapChoiceMenu(reward);
      },
      null,
      true,
    );
  }

  private openTrapChoiceMenu(reward: TrapReward): void {
    const options: OptionSelectItem[] = [
      {
        label: "함정을 작동시킨다",
        keepOpen: true,

        handler: () => {
          void this.openActivateConfirm(reward);
          return true;
        },
      },

      {
        label: "함정을 해제한다",
        keepOpen: true,

        handler: () => {
          void this.openDisarmConfirm(reward);
          return true;
        },
      },
    ];

    const config: OptionSelectConfig = {
      options,
      maxOptions: 2,
      yOffset: 0,
    };

    globalScene.ui.setMode(UiMode.OPTION_SELECT, config);
  }

  private getRewardText(rewards: TrapRewardEntry[]): string {
    const money = rewards.find(r => r.type === TrapRewardType.MONEY);

    const rp = rewards.find(r => r.type === TrapRewardType.ROGUE_POINT);

    const item = rewards.find(r => r.type === TrapRewardType.ITEM);

    const exp = rewards.find(r => r.type === TrapRewardType.EXP);

    return [
      money ? `${money.amount}G` : null,
      rp ? `${rp.amount} RP` : null,

      item?.item ? `${item.item.type.name} (${this.getRewardGradeName(item.grade)})` : null,

      exp ? `${exp.amount} EXP` : null,
    ]
      .filter(Boolean)
      .join(" / ");
  }

  private showActivateRewardInfo(reward: TrapReward): void {
    const baseText = this.getRewardText(reward.baseRewards);

    globalScene.ui.showText("함정을 작동시킨다.\n" + `획득 보상: ${baseText}`, null, undefined, null, true);
  }

  private showDisarmRewardInfo(reward: TrapReward): void {
    const baseText = this.getRewardText(reward.baseRewards);

    const bonusText = this.getRewardText(reward.disarmBonuses);

    globalScene.ui.showText(
      "함정을 해제한다.\n" + `획득 보상: ${baseText}\n` + `해제 추가 보상: ${bonusText}`,
      null,
      undefined,
      null,
      true,
    );
  }

  private showTrapChoice(trap: Trap, reward: TrapReward): void {
    // ===== 기본 보상 =====

    const money = reward.baseRewards.find(r => r.type === TrapRewardType.MONEY);

    const roguePoint = reward.baseRewards.find(r => r.type === TrapRewardType.ROGUE_POINT);

    const item = reward.baseRewards.find(r => r.type === TrapRewardType.ITEM);

    const exp = reward.baseRewards.find(r => r.type === TrapRewardType.EXP);

    const rewardText = [
      money ? `${money.amount}G` : null,
      roguePoint ? `${roguePoint.amount} RP` : null,
      item?.item ? `${item.item.type.name} (${this.getRewardGradeName(item.grade)})` : null,
      exp ? `${exp.amount} EXP` : null,
    ]
      .filter(Boolean)
      .join(" / ");

    // ===== 해체 성공 추가 보상 =====

    const bonusMoney = reward.disarmBonuses.find(r => r.type === TrapRewardType.MONEY);

    const bonusRp = reward.disarmBonuses.find(r => r.type === TrapRewardType.ROGUE_POINT);

    const bonusItem = reward.disarmBonuses.find(r => r.type === TrapRewardType.ITEM);

    const bonusExp = reward.disarmBonuses.find(r => r.type === TrapRewardType.EXP);

    const bonusText = [
      bonusMoney ? `+${bonusMoney.amount}G` : null,
      bonusRp ? `+${bonusRp.amount} RP` : null,
      bonusItem?.item ? `+${bonusItem.item.type.name} (${this.getRewardGradeName(bonusItem.grade)})` : null,
      bonusExp ? `+${bonusExp.amount} EXP` : null,
    ]
      .filter(Boolean)
      .join(" / ");

    console.log("[TRAP_FOUND]", {
      trapType: trap.type,
      baseRewards: reward.baseRewards,
      disarmBonuses: reward.disarmBonuses,
    });

    globalScene.ui.showText(
      "함정을 발견했다!\n행동을 선택해 주세요.",
      null,
      () => {
        this.openTrapChoiceMenu(reward);
      },
      null,
      true,
    );
  }

  /**
   * 함정 이미지를 표시하고 실제 효과를 발동한다.
   */
  private showTrap(): void {
    const trap = trapManager.getPendingTrap();
    const reward = trapManager.getPendingReward();

    if (!trap || !reward) {
      this.end();
      return;
    }

    const textureKey = trap.imageKey;

    const createTrapImage = (x: number, y: number): void => {
      const image = globalScene.add.image(x, y, textureKey);

      image.setOrigin(0.5).setScale(TRAP_SCALE);

      globalScene.field.add(image);
      this.trapImages.push(image);
    };

    // 3. 대상 진영에 따라 이미지 표시
    switch (trap.targetSide) {
      case ArenaTagSide.PLAYER:
        createTrapImage(PLAYER_TRAP_POSITION.x, PLAYER_TRAP_POSITION.y);
        break;

      case ArenaTagSide.ENEMY:
        createTrapImage(ENEMY_TRAP_POSITION.x, ENEMY_TRAP_POSITION.y);
        break;

      case ArenaTagSide.BOTH:
        createTrapImage(PLAYER_TRAP_POSITION.x, PLAYER_TRAP_POSITION.y);

        createTrapImage(ENEMY_TRAP_POSITION.x, ENEMY_TRAP_POSITION.y);
        break;
    }

    this.showTrapChoice(trap, reward);
  }
  private clearTrapImages(): Promise<void> {
    return new Promise(resolve => {
      if (this.trapImages.length === 0) {
        resolve();
        return;
      }

      let remaining = this.trapImages.length;

      for (const image of this.trapImages) {
        globalScene.tweens.add({
          targets: image,
          alpha: 0,
          duration: TRAP_FADE_TIME,

          onComplete: () => {
            image.destroy();

            remaining--;

            if (remaining <= 0) {
              this.trapImages = [];
              resolve();
            }
          },
        });
      }
    });
  }
}
