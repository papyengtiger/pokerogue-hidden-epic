import { globalScene } from "#app/global-scene";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { GameModes } from "#enums/game-modes";
import { SpikesTrapGrade } from "#enums/trap-category";
import type { Pokemon } from "#field/pokemon";
import { randSeedInt } from "#utils/common";
import { SpikesTrap, StealthRockTrap, type Trap } from "./trap";
import { rollTrapReward, type TrapReward, type TrapRewardEntry, TrapRewardType } from "./trap-reward";

export class TrapManager {
  private pendingTrap: Trap | null = null;

  private pendingReward: TrapReward | null = null;
  /**
   * 함정이 어느 진영에 작동할지 결정
   * PLAYER 40% / ENEMY 40% / BOTH 20%
   */
  private rollTargetSide(): ArenaTagSide {
    const roll = randSeedInt(100);

    if (roll < 40) {
      return ArenaTagSide.PLAYER;
    }

    if (roll < 80) {
      return ArenaTagSide.ENEMY;
    }

    return ArenaTagSide.BOTH;
  }

  private rollSpikesGrade(): SpikesTrapGrade {
    switch (randSeedInt(3)) {
      case 0:
        return SpikesTrapGrade.GRADE_1;

      case 1:
        return SpikesTrapGrade.GRADE_2;

      default:
        return SpikesTrapGrade.GRADE_3;
    }
  }

  /**
   * 발생할 함정 종류 결정
   */
  private rollTrapType(side: ArenaTagSide): Trap {
    switch (randSeedInt(2)) {
      case 0:
        return new StealthRockTrap(side);

      default:
        return new SpikesTrap(side, this.rollSpikesGrade());
    }
  }

  public getBaseRewards(): TrapRewardEntry[] {
    return this.pendingReward?.baseRewards ?? [];
  }

  public getDisarmBonuses(): TrapRewardEntry[] {
    return this.pendingReward?.disarmBonuses ?? [];
  }

  public prepareBattleTrap(): Trap | null {
    this.pendingTrap = null;
    this.pendingReward = null;

    const trap = this.tryTriggerTrap();

    if (!trap) {
      return null;
    }

    // 이미 같은 함정이 필드에 복원되어 있다면
    // 다시 설치하지 않는다.
    if (!trap.canTrigger()) {
      return null;
    }

    this.pendingTrap = trap;
    this.pendingReward = rollTrapReward(trap);

    return trap;
  }

  public getPendingTrap(): Trap | null {
    return this.pendingTrap;
  }

  public getPendingReward(): TrapReward | null {
    return this.pendingReward;
  }

  public async activatePreparedTrap(): Promise<boolean> {
    if (!this.pendingTrap) {
      return false;
    }

    await this.pendingTrap.apply();

    return true;
  }

  private getTrapChance(): number {
    const waveIndex = globalScene.currentBattle?.waveIndex ?? 0;

    const modeId = globalScene.gameMode.modeId;

    switch (modeId) {
      // 데일리: 20층부터 시작
      // 10층마다 2.5% 증가
      // 최대 12.5%
      case GameModes.DAILY:
        if (waveIndex < 20) {
          return 0;
        }

        return Math.min(5 + Math.floor((waveIndex - 20) / 10) * 2.5, 12.5);

      // 주간: 50층부터 시작
      // 25층마다 2.5% 증가
      // 최대 15%
      case GameModes.WEEKLY:
        if (waveIndex < 50) {
          return 0;
        }

        return Math.min(5 + Math.floor((waveIndex - 50) / 25) * 2.5, 15);

      // 월간: 50층부터 시작
      // 25층마다 2.5% 증가
      // 최대 20%
      case GameModes.MONTHLY:
        if (waveIndex < 50) {
          return 0;
        }

        return Math.min(5 + Math.floor((waveIndex - 50) / 25) * 2.5, 20);

      // 클래식: 50층부터 시작
      // 50층마다 2.5% 증가
      // 최대 12.5%
      case GameModes.CLASSIC:
        if (waveIndex < 50) {
          return 0;
        }

        return Math.min(5 + Math.floor((waveIndex - 50) / 50) * 2.5, 12.5);

      // 그 외 모드:
      // 50층 이전에는 등장하지 않고
      // 50층부터 기본 5%
      default:
        if (waveIndex < 50) {
          return 0;
        }

        return 5;
    }
  }

  public tryTriggerTrap(): Trap | null {
    // 1. 현재 층/모드에 따른 함정 발생 확률 계산
    const trapChance = this.getTrapChance();

    // 함정이 등장하지 않는 층
    if (trapChance <= 0) {
      return null;
    }

    // 2. 함정 발생 판정
    // 0.1% 단위로 계산하여 2.5%, 7.5% 등도 처리
    const roll = randSeedInt(1000);

    if (roll >= trapChance * 10) {
      return null;
    }

    // 3. 대상 진영 판정
    const side = this.rollTargetSide();

    // 4. 함정 종류 판정
    return this.rollTrapType(side);
  }

  public async setupBattleTraps(): Promise<Trap | null> {
    const trap = this.tryTriggerTrap();

    this.pendingTrap = null;
    this.pendingReward = null;

    if (!trap) {
      return null;
    }

    if (!trap.canTrigger()) {
      return null;
    }

    this.pendingTrap = trap;
    this.pendingReward = rollTrapReward(trap);

    await trap.apply();

    return trap;
  }

  public applyPendingTrap(pokemon: Pokemon): boolean {
    if (!this.pendingTrap) {
      return false;
    }

    return this.pendingTrap.applyToPokemon(pokemon);
  }

  public tryDisarmPreparedTrap(): boolean {
    if (!this.pendingTrap) {
      return false;
    }

    console.log("[TRAP_DISARM]", {
      trapType: this.pendingTrap.type,
      success: true,
    });

    return true;
  }

  public async grantBaseReward(): Promise<void> {
    const rewards = this.pendingReward?.baseRewards;

    if (!rewards) {
      return;
    }

    for (const reward of rewards) {
      await this.grantReward(reward);
    }
  }

  public async grantDisarmBonus(): Promise<void> {
    const rewards = this.pendingReward?.disarmBonuses;

    if (!rewards) {
      return;
    }

    for (const reward of rewards) {
      await this.grantReward(reward);
    }
  }

  private async grantReward(reward: TrapRewardEntry): Promise<void> {
    console.log("[TRAP_REWARD_GRANT_START]", {
      trapSide: this.pendingTrap?.targetSide,
      trapType: this.pendingTrap?.type,
      rewardType: reward.type,
      amount: reward.amount,
      itemTier: reward.itemTier,
    });

    switch (reward.type) {
      case TrapRewardType.MONEY:
        globalScene.addMoney(reward.amount);
        break;

      case TrapRewardType.ROGUE_POINT:
        globalScene.gameData.addRoguePoints(reward.amount);
        globalScene.updateroguePointText();
        break;

      case TrapRewardType.ITEM:
        this.grantItemReward(reward);
        break;

      case TrapRewardType.EXP:
        this.grantExpReward(reward.amount);
        break;
    }

    console.log("[TRAP_REWARD_GRANT_END]", {
      trapSide: this.pendingTrap?.targetSide,
      rewardType: reward.type,
    });
  }

  private grantItemReward(reward: TrapRewardEntry): void {
    const item = reward.item;

    if (!item) {
      console.warn("[TRAP_REWARD_ITEM_MISSING]", {
        tier: reward.itemTier,
      });
      return;
    }

    console.log("[TRAP_REWARD_ITEM_GRANTED]", {
      tier: reward.itemTier,
      itemId: item.type.id,
      itemName: item.type.name,
    });

    globalScene.phaseManager.unshiftNew("SelectModifierPhase", 0, undefined, {
      guaranteedModifierTypeOptions: [item],
      fillRemaining: false,
    });
  }

  private grantExpReward(amount: number): void {
    const party = globalScene.getPlayerParty().filter(pokemon => pokemon.isAllowedInBattle());

    if (party.length === 0) {
      return;
    }

    const participantIds = new Set(party.map(pokemon => pokemon.id));

    globalScene.phaseManager.unshiftNew("PartyExpPhase", amount, false, participantIds);

    console.log("[TRAP_REWARD_EXP]", {
      amount,
      participants: [...participantIds],
    });
  }

  public clearPendingTrap(): void {
    this.pendingTrap = null;
    this.pendingReward = null;
  }
}

export const trapManager = new TrapManager();
