import { globalScene } from "#app/global-scene";
import Overrides from "#app/overrides";
import { UiMode } from "#enums/ui-mode";
import { ModifierTier } from "#enums/modifier-tier";
import { getPartyMarkLuckValue } from "#modifiers/modifier-type";
import { ExtraTrainerCardModifier, HealShopCostModifier, LockTrainerCardTiersModifier } from "#modifiers/modifier";
import { BattlePhase } from "#phases/battle-phase";
import { trainerCardManager } from "#system/trainer-card-manager";
import { allTrainerCards, type TrainerCard } from "#trainers/trainer-card/trainer-card";
import { NumberHolder, randSeedInt } from "#utils/common";

/** Trainer-card luck uses the same raw mark points as the UI. */
function getPartyMarkLuck(): number {
  return getPartyMarkLuckValue(globalScene.getPlayerParty());
}

/** 아이템 보상과 동일한 1024분율 기본 등급 추첨. */
function rollBaseCardTier(): ModifierTier {
  const roll = randSeedInt(1024);
  if (roll > 255) return ModifierTier.COMMON;
  if (roll > 60) return ModifierTier.GREAT;
  if (roll > 12) return ModifierTier.ULTRA;
  return roll > 0 ? ModifierTier.ROGUE : ModifierTier.MASTER;
}

/**
 * 원본 modifier-type.ts의 아이템 등급 상승 공식과 일치시킨다.
 * 증표 럭 0: floor(128 / ((0+4)/4)) = 128, 4/128 = 3.125%.
 * 일반 아이템의 이로치 럭 계산에는 영향을 주지 않는다.
 */
function getCardUpgradeOdds(luck: number): number {
  const safeLuck = Math.max(0, Math.floor(Number.isFinite(luck) ? luck : 0));
  return Math.max(4, Math.floor(128 / ((safeLuck + 4) / 4)));
}

/** 등급이 MASTER에 도달하면 상승 종료; 각 단계마다 같은 럭 기반 판정. */
function rollCardTierUpgrade(initial: ModifierTier, luck: number): { targetTier: ModifierTier; upgrades: number } {
  const odds = getCardUpgradeOdds(luck);
  let tier = initial;
  while (tier < ModifierTier.MASTER && randSeedInt(odds) < 4) {
    tier = (tier + 1) as ModifierTier;
  }
  return { targetTier: tier, upgrades: tier - initial };
}

/** 해당 등급에 카드가 없으면 우선 상위 등급, 없으면 아래 등급에서 선택한다. */
function findAvailableTier(pool: readonly TrainerCard[], requested: ModifierTier): ModifierTier | null {
  const tiers = new Set(pool.map(card => card.tier));
  if (!tiers.size) return null;
  for (let tier = requested; tier <= ModifierTier.MASTER; tier++) {
    if (tiers.has(tier)) return tier;
  }
  for (let tier = requested - 1; tier >= ModifierTier.COMMON; tier--) {
    if (tiers.has(tier)) return tier;
  }
  return null;
}

interface CardRoll {
  card: TrainerCard;
  baseTier: ModifierTier;
  requestedTier: ModifierTier;
  finalTier: ModifierTier;
  upgradeCount: number;
}

/** 카드별 중복 없는 추첨. 럭은 '기본 등급'이 아닌 '등급 상승'에만 사용한다. */
function drawTrainerCards(
  available: readonly TrainerCard[],
  count: number,
  luck: number,
  lockedTiers?: readonly ModifierTier[],
): CardRoll[] {
  const pool = [...available];
  const results: CardRoll[] = [];
  while (pool.length && results.length < count) {
    const index = results.length;
    const lockedTier = lockedTiers?.[index];
    if (lockedTier !== undefined) {
      // 고정한 볼 등급을 절대로 바꾸지 않는다. 중복 없는 선택을 먼저 시도한다.
      const choicePool = pool.filter(card => card.tier === lockedTier);
      if (choicePool.length === 0) {
        // 같은 등급의 카드 수보다 선택 칸이 많으면 동일 카드 재등장은 불가피하다.
        // 등급 고정을 깨뜨리는 것보다는 동일 등급 중복을 허용한다.
        const repeatPool = available.filter(card => card.tier === lockedTier);
        if (!repeatPool.length) {
          console.warn("[TRAINER_CARD_LOCK_TIER_EMPTY]", ModifierTier[lockedTier]);
          break;
        }
        const card = repeatPool[randSeedInt(repeatPool.length)];
        results.push({ card, baseTier: lockedTier, requestedTier: lockedTier, finalTier: lockedTier, upgradeCount: 0 });
      } else {
        const card = choicePool[randSeedInt(choicePool.length)];
        pool.splice(pool.indexOf(card), 1);
        results.push({ card, baseTier: lockedTier, requestedTier: lockedTier, finalTier: lockedTier, upgradeCount: 0 });
      }
      continue;
    }
    const baseTier = rollBaseCardTier();
    const { targetTier, upgrades } = rollCardTierUpgrade(baseTier, luck);
    const finalTier = findAvailableTier(pool, targetTier);
    if (finalTier == null) break;
    const choices = pool.filter(card => card.tier === finalTier);
    const card = choices[randSeedInt(choices.length)];
    pool.splice(pool.indexOf(card), 1);
    results.push({ card, baseTier, requestedTier: targetTier, finalTier, upgradeCount: upgrades });
  }
  return results;
}

export class SelectTrainerCardPhase extends BattlePhase {
  public readonly phaseName = "SelectTrainerCardPhase";

  private rerollCount = 0;
  private currentRolls: CardRoll[] = [];
  private lockCardTiers = false;

  private hasCardRecord(): boolean {
    return !!globalScene.findModifier(m => m instanceof LockTrainerCardTiersModifier);
  }

  /** Matches ordinary LOCK_CAPSULE reroll price calculation. */
  private getLockedRerollBase(): number {
    const tierValues = [50, 125, 300, 750, 2000];
    return this.currentRolls.reduce((total, roll) => total + (tierValues[roll.card.tier] ?? 50), 0);
  }

  /** Same base reroll fee, wave scaling, difficulty, discounts and fee override as item rewards. */
  private getCardRerollCost(locked = this.lockCardTiers): number {
    if (Overrides.WAIVE_ROLL_FEE_OVERRIDE) return 0;
    const waveFactor = Math.max(1, Math.ceil(globalScene.currentBattle.waveIndex / 10));
    const baseCost = Math.min(Number.MAX_SAFE_INTEGER, waveFactor * (locked && this.hasCardRecord() ? this.getLockedRerollBase() : 250) * 2 ** this.rerollCount);
    const holder = new NumberHolder(baseCost);
    globalScene.applyModifier(HealShopCostModifier, true, holder);
    const difficulty = globalScene.gameMode.difficulty;
    const difficultyFactor = difficulty === "EASY" ? 0.75 : difficulty === "HARD" ? 1.5 : 1;
    return Math.max(0, Math.floor(holder.value * difficultyFactor * trainerCardManager.getMultiplier("REROLL_PRICE")));
  }

  start(): void {
    super.start();
    this.rerollCount = 0;
    this.lockCardTiers = false;

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

    const optionCount = new NumberHolder(3);
    globalScene.applyModifiers(ExtraTrainerCardModifier, true, optionCount);
    optionCount.value = Math.min(6, Math.max(3, optionCount.value));

    const markLuck = getPartyMarkLuck();
    const count = Math.max(1, Math.floor(optionCount.value));

    const rollOptions = (locked = false) => {
      const fixedTiers = locked && this.hasCardRecord() ? this.currentRolls.map(roll => roll.card.tier) : undefined;
      const rolls = drawTrainerCards(availableCards, count, markLuck, fixedTiers);
      this.currentRolls = rolls;
      console.log("[TRAINER_CARD_OPTIONS]", {
        wave: globalScene.currentBattle.waveIndex,
        rerollCount: this.rerollCount,
        tiersLocked: !!fixedTiers,
        rerollCost: this.getCardRerollCost(),
        markLuck,
        upgradeChancePerStep: `${(100 * 4 / getCardUpgradeOdds(markLuck)).toFixed(3)}%`,
        choices: rolls.map(roll => ({
          id: roll.card.id,
          baseTier: ModifierTier[roll.baseTier],
          requestedTier: ModifierTier[roll.requestedTier],
          finalTier: ModifierTier[roll.finalTier],
          upgradeCount: roll.upgradeCount,
        })),
      });
      return {
        cards: rolls.map(roll => roll.card),
        upgradeCounts: rolls.map(roll => roll.upgradeCount),
        rerollCost: this.getCardRerollCost(),
      };
    };

    const initial = rollOptions();
    globalScene.ui.setMode(UiMode.TRAINER_CARD, {
      screen: "reward",
      noCancel: true,
      title: "트레이너 카드를 선택하세요",
      descriptionTitle: "효과",
      lockAvailable: this.hasCardRecord(),
      lockEnabled: this.lockCardTiers,
      onToggleLock: (locked: boolean) => {
        this.lockCardTiers = locked && this.hasCardRecord();
        return this.getCardRerollCost();
      },
      ...initial,
      onReroll: (locked: boolean) => {
        this.lockCardTiers = locked && this.hasCardRecord();
        const cost = this.getCardRerollCost();
        if (!Number.isFinite(cost) || cost < 0 || (cost > globalScene.money && !Overrides.WAIVE_ROLL_FEE_OVERRIDE)) {
          globalScene.ui.playError();
          return null;
        }
        if (cost > 0) {
          globalScene.money -= cost;
          globalScene.updateMoneyText();
          globalScene.animateMoneyChanged(false);
        }
        globalScene.playSound("se/buy");
        this.rerollCount++;
        console.log("[TRAINER_CARD_REROLL]", { paid: cost, nextCost: this.getCardRerollCost(), count: this.rerollCount });
        return rollOptions(this.lockCardTiers);
      },
      onSelect: card => {
        const granted = trainerCardManager.grant(card.id);
        if (!granted) {
          globalScene.ui.playError();
          return false;
        }

        console.log("[TRAINER_CARD_GRANTED]", { card: card.id, category: card.category });
        globalScene.ui.hideTooltip();
        globalScene.ui.setMode(UiMode.MESSAGE);
        void globalScene.gameData.saveAll(false, true);
        this.end();
        return true;
      },
    });
  }
}
