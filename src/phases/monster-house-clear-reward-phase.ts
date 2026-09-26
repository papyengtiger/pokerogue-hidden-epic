import { globalScene } from "#app/global-scene";
import { type MonsterHouseRank, monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { ArenaTagType } from "#enums/arena-tag-type";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { ModifierTier } from "#enums/modifier-tier";
import { MoneyMultiplierModifier } from "#modifiers/modifier";
import {
  getPlayerModifierTypeOptions,
  type ModifierType,
  type ModifierTypeOption,
  PokemonModifierType,
  regenerateModifierPoolThresholds,
} from "#modifiers/modifier-type";
import { BattlePhase } from "#phases/battle-phase";
import { NumberHolder } from "#utils/common";

/**
 * 몬스터소굴 완전 소탕 시 경험치·골드·로그포인트를 지급한다.
 *
 * 이 Phase는 큐에 추가되는 순간 소굴 정보를 복사한다.
 * 따라서 앞선 BattleEndPhase 등에서 소굴 매니저가 초기화되더라도
 * 계산에 필요한 등급과 경험치 정보가 사라지지 않는다.
 *
 * 아이템 선택 보상은 VictoryPhase에서 이 Phase 다음에
 * SelectModifierPhase를 큐에 추가하여 별도로 처리한다.
 */
export class MonsterHouseClearRewardPhase extends BattlePhase {
  public readonly phaseName = "MonsterHouseClearRewardPhase";

  private readonly rank: MonsterHouseRank;
  private readonly totalEnemies: number;
  private readonly defeatedEnemies: number;
  private readonly capturedEnemies: number;
  private readonly baseExpValue: number;

  constructor() {
    super();

    this.rank = monsterHouseManager.getRank();
    this.totalEnemies = monsterHouseManager.getTotalEnemies();
    this.defeatedEnemies = monsterHouseManager.getDefeatedEnemies();
    this.capturedEnemies = monsterHouseManager.getCapturedEnemies();

    this.baseExpValue = monsterHouseManager
      .getMembers()
      .reduce((total, pokemon) => total + Math.max(0, Number(pokemon?.getExpValue?.() ?? 0)), 0);
  }

  public start(): void {
    super.start();

    const expBonusRates = [0, 0.25, 0.35, 0.5, 0.7, 1] as const;

    const moneyMultipliers = [0, 2, 3, 4, 6, 10] as const;

    const roguePointRewards = [0, 50, 100, 200, 350, 500] as const;

    const expBonusRate = expBonusRates[this.rank] ?? 0;

    const moneyMultiplier = moneyMultipliers[this.rank] ?? 0;

    const roguePoints = roguePointRewards[this.rank] ?? 0;

    const bonusExp = Math.max(0, Math.round(this.baseExpValue * expBonusRate));

    const moneyAmount = new NumberHolder(globalScene.getWaveMoneyAmount(moneyMultiplier));

    globalScene.applyModifiers(MoneyMultiplierModifier, true, moneyAmount);

    if (globalScene.arena.getTag(ArenaTagType.HAPPY_HOUR)) {
      moneyAmount.value *= 2;
    }

    if (bonusExp > 0) {
      globalScene.applyPartyExp(bonusExp, true);
    }

    if (moneyAmount.value > 0) {
      globalScene.addMoney(moneyAmount.value);
    }

    if (roguePoints > 0) {
      globalScene.gameData.addRoguePoints(roguePoints);

      globalScene.updateroguePointText();
    }

    const itemRewards = this.generateItemRewards();

    const itemRewardNames = this.grantAllItemRewards(itemRewards);

    const userLocale = navigator.language || "ko-KR";

    const formattedExp = bonusExp.toLocaleString(userLocale);

    const formattedMoney = moneyAmount.value.toLocaleString(userLocale);

    const formattedRoguePoints = roguePoints.toLocaleString(userLocale);

    console.log("[MONSTER_HOUSE_CLEAR_REWARD]", {
      rank: this.rank,
      totalEnemies: this.totalEnemies,
      defeatedEnemies: this.defeatedEnemies,
      capturedEnemies: this.capturedEnemies,
      baseExpValue: this.baseExpValue,
      expBonusRate,
      bonusExp,
      moneyMultiplier,
      money: moneyAmount.value,
      roguePoints,
    });

    const itemRewardText = itemRewardNames.length > 0 ? `아이템: ${itemRewardNames.join(", ")}` : "아이템 보상 없음";

    globalScene.ui.showText(
      [
        `몬스터소굴 ${this.rank}등급을 완전히 소탕했다!`,
        `추가 경험치 ${formattedExp}`,
        `골드 ${formattedMoney}`,
        `로그포인트 ${formattedRoguePoints} RP`,
        itemRewardText,
      ].join("\n"),
      null,
      () => this.end(),
      null,
      true,
    );
  }
  private getItemRewardTiers(): ModifierTier[] {
    switch (this.rank) {
      case 1:
        return [ModifierTier.GREAT, ModifierTier.GREAT, ModifierTier.GREAT];

      case 2:
        return [ModifierTier.GREAT, ModifierTier.GREAT, ModifierTier.ULTRA];

      case 3:
        return [ModifierTier.ULTRA, ModifierTier.ULTRA, ModifierTier.ULTRA];

      case 4:
        return [ModifierTier.ULTRA, ModifierTier.ULTRA, ModifierTier.ROGUE];

      case 5:
        return [ModifierTier.ROGUE, ModifierTier.ROGUE, ModifierTier.MASTER];

      default:
        return [];
    }
  }

  private isExcludedMonsterHouseReward(modifierType: ModifierType | undefined): boolean {
    if (!modifierType) {
      return true;
    }

    // 몬스터소굴 자동 보상에서 제외할 아이템
    // - 코롱 3종
    // - 유전자쐐기
    // - 소원의별
    const excludedIds = new Set(["LURE", "SUPER_LURE", "MAX_LURE", "DNA_SPLICERS", "WISHING_STAR"]);

    return excludedIds.has(modifierType.id);
  }

  private generateItemRewards(): ModifierTypeOption[] {
    const party = globalScene.getPlayerParty();
    const tiers = this.getItemRewardTiers();

    if (tiers.length === 0) {
      return [];
    }

    /*
     * getPlayerModifierTypeOptions()에서 사용하는
     * PLAYER 보상 풀의 가중치와 제외 목록을 먼저 생성한다.
     */
    regenerateModifierPoolThresholds(party, ModifierPoolType.PLAYER, 0);

    // 제외 아이템이 하나라도 섞이면 같은 등급 구성으로 다시 추첨한다.
    // 이렇게 해야 보상 개수(3개)와 등급 구성이 줄어들지 않는다.
    const maxAttempts = 50;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const rewards = getPlayerModifierTypeOptions(tiers.length, party, undefined, {
        guaranteedModifierTiers: tiers,
        fillRemaining: false,
        allowLuckUpgrades: false,
      });

      const excludedReward = rewards.find(reward => this.isExcludedMonsterHouseReward(reward.type));

      if (!excludedReward) {
        return rewards;
      }

      console.log("[MONSTER_HOUSE_REWARD_REROLL_EXCLUDED]", {
        attempt,
        item: excludedReward.type?.name,
        id: excludedReward.type?.id,
      });
    }

    console.warn("[MONSTER_HOUSE_REWARD_REROLL_LIMIT] 제외 아이템 없는 보상 생성에 실패했습니다.", {
      rank: this.rank,
      tiers,
    });

    return [];
  }

  private grantReward(modifierType: ModifierType): number {
    const mode = modifierType.getRogueShopPurchaseMode();

    /*
     * 포켓몬 지닌물건:
     * 파티원마다 동일한 아이템을 각각 지급한다.
     */
    if (modifierType instanceof PokemonModifierType) {
      let grantedCount = 0;

      for (const pokemon of globalScene.getPlayerParty()) {
        const filterMessage = modifierType.selectFilter?.(pokemon);

        if (filterMessage) {
          console.log("[MONSTER_HOUSE_HELD_REWARD_SKIPPED]", {
            item: modifierType.name,
            pokemon: pokemon.name,
            reason: filterMessage,
          });

          continue;
        }

        const modifier = modifierType.newModifier(pokemon);

        if (modifier && globalScene.addModifier(modifier, true, false, false, true)) {
          grantedCount++;
        }
      }

      return grantedCount;
    }

    /*
     * 트레이너 도구:
     * 파티 공용이므로 modifier를 한 번 추가한다.
     */
    if (mode === "TRAINER_LOADOUT") {
      const modifier = modifierType.newModifier();

      if (!modifier) {
        return 0;
      }

      const added = globalScene.addModifier(modifier, true, false, false, true);

      return added ? 1 : 0;
    }

    /*
     * 몬스터볼·바우처 등 즉시 지급 아이템
     */
    const modifier = modifierType.newModifier();

    if (!modifier) {
      return 0;
    }

    const added = globalScene.addModifier(modifier, true, false, false, true);

    return added ? 1 : 0;
  }

  private grantAllItemRewards(rewards: ModifierTypeOption[]): string[] {
    const rewardNames: string[] = [];

    for (const reward of rewards) {
      const modifierType = reward.type;

      if (!modifierType) {
        continue;
      }

      const grantedCount = this.grantReward(modifierType);

      if (grantedCount > 0) {
        rewardNames.push(modifierType.name);
      }

      console.log("[MONSTER_HOUSE_ITEM_REWARD]", {
        rank: this.rank,
        item: modifierType.name,
        mode: modifierType.getRogueShopPurchaseMode(),
        grantedCount,
      });
    }

    globalScene.updateModifiers(true);

    return rewardNames;
  }
}
