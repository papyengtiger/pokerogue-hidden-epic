import { globalScene } from "#app/global-scene";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { ModifierTier } from "#enums/modifier-tier";
import { TrapCategory } from "#enums/trap-category";
import {
  getPlayerModifierTypeOptions,
  type ModifierTypeOption,
  regenerateModifierPoolThresholds,
} from "#modifiers/modifier-type";
import { randSeedInt } from "#utils/common";
import type { Trap } from "./trap";

/**
 * 함정 보상의 종류.
 *
 * 실제 지급 처리는 나중에 각각의 시스템과 연결한다.
 */
export enum TrapRewardType {
  MONEY,
  ROGUE_POINT,
  ITEM,
  EXP,
}

/**
 * 함정 보상의 등급.
 *
 * 함정 위험도가 높을수록 높은 등급이 나올 가능성이 커진다.
 */
export enum TrapRewardGrade {
  COMMON = 1,
  GREAT = 2,
  ULTRA = 3,
  MASTER = 4,
}

export interface TrapRewardEntry {
  type: TrapRewardType;
  grade: TrapRewardGrade;
  amount: number;

  itemTier?: ModifierTier;

  // ITEM 보상일 경우 실제 지급할 아이템
  item?: ModifierTypeOption;
}

export interface TrapReward {
  baseRewards: TrapRewardEntry[];
  disarmBonuses: TrapRewardEntry[];
}

/**
 * 함정 종류를 보고 기본적인 위험도를 반환한다.
 *
 * 이후 Trap 자체에 riskGrade를 넣게 되면
 * 이 함수는 제거하고 trap.riskGrade를 사용해도 된다.
 */
function getTrapRiskGrade(trap: Trap): TrapRewardGrade {
  switch (trap.category) {
    case TrapCategory.FIELD:
      return TrapRewardGrade.COMMON;

    case TrapCategory.DAMAGE:
      return TrapRewardGrade.GREAT;

    default:
      return TrapRewardGrade.COMMON;
  }
}

/**
 * 함정 위험도를 기준으로 실제 보상 등급을 결정한다.
 *
 * 기본적으로 함정 위험도와 같은 등급이 나오지만
 * 일정 확률로 한 단계 높은 보상이 등장한다.
 */
function rollRewardGrade(trap: Trap): TrapRewardGrade {
  const baseGrade = getTrapRiskGrade(trap);

  // 20% 확률로 한 등급 상승
  if (randSeedInt(100) < 20 && baseGrade < TrapRewardGrade.MASTER) {
    return (baseGrade + 1) as TrapRewardGrade;
  }

  return baseGrade;
}

function getModifierTierFromRewardGrade(grade: TrapRewardGrade): ModifierTier {
  switch (grade) {
    case TrapRewardGrade.COMMON:
      return ModifierTier.COMMON;

    case TrapRewardGrade.GREAT:
      return ModifierTier.GREAT;

    case TrapRewardGrade.ULTRA:
      return ModifierTier.ULTRA;

    case TrapRewardGrade.MASTER:
      return ModifierTier.MASTER;

    default:
      return ModifierTier.COMMON;
  }
}

/**
 * 보상 등급과 종류를 기준으로 수량 결정.
 */
function rollRewardAmount(type: TrapRewardType, grade: TrapRewardGrade): number {
  switch (type) {
    case TrapRewardType.MONEY:
      return rollMoneyAmount(grade);

    case TrapRewardType.ROGUE_POINT:
      return rollLogPointAmount(grade);

    case TrapRewardType.ITEM:
      // 아이템은 현재 1개.
      // 추후 itemId / modifierType 등을 별도로 결정한다.
      return 1;

    case TrapRewardType.EXP:
      return rollExpAmount(grade);

    default:
      return 1;
  }
}

function rollMoneyAmount(grade: TrapRewardGrade): number {
  switch (grade) {
    case TrapRewardGrade.COMMON:
      return 500 + randSeedInt(501);

    case TrapRewardGrade.GREAT:
      return 1500 + randSeedInt(1001);

    case TrapRewardGrade.ULTRA:
      return 4000 + randSeedInt(2001);

    case TrapRewardGrade.MASTER:
      return 10000 + randSeedInt(5001);

    default:
      return 500;
  }
}

function rollLogPointAmount(grade: TrapRewardGrade): number {
  switch (grade) {
    case TrapRewardGrade.COMMON:
      return 50 + randSeedInt(6);

    case TrapRewardGrade.GREAT:
      return 150 + randSeedInt(11);

    case TrapRewardGrade.ULTRA:
      return 300 + randSeedInt(21);

    case TrapRewardGrade.MASTER:
      return 750 + randSeedInt(26);

    default:
      return 50;
  }
}

function rollExpAmount(grade: TrapRewardGrade): number {
  switch (grade) {
    case TrapRewardGrade.COMMON:
      return 100 + randSeedInt(101);

    case TrapRewardGrade.GREAT:
      return 300 + randSeedInt(201);

    case TrapRewardGrade.ULTRA:
      return 750 + randSeedInt(501);

    case TrapRewardGrade.MASTER:
      return 2000 + randSeedInt(1001);

    default:
      return 100;
  }
}

function rollItemReward(grade: TrapRewardGrade): TrapRewardEntry {
  const tier = getModifierTierFromRewardGrade(grade);

  const party = globalScene.getPlayerParty();

  regenerateModifierPoolThresholds(party, ModifierPoolType.PLAYER, 0);

  let item: ModifierTypeOption | null = null;

  while (!item || item.type.id.includes("TM_") || item.type.id === "CANDY_JAR") {
    item = getPlayerModifierTypeOptions(1, party, [], {
      guaranteedModifierTiers: [tier],
      allowLuckUpgrades: false,
    })[0];
  }

  return {
    type: TrapRewardType.ITEM,
    grade,
    amount: 1,
    itemTier: tier,
    item,
  };
}

/**
 * 함정 하나에 대응하는 보상 하나 생성.
 */
export function rollTrapReward(trap: Trap): TrapReward {
  const baseGrade = rollRewardGrade(trap);
  const bonusGrade = rollRewardGrade(trap);

  const baseRewards: TrapRewardEntry[] = [
    {
      type: TrapRewardType.MONEY,
      grade: baseGrade,
      amount: rollRewardAmount(TrapRewardType.MONEY, baseGrade),
    },
    {
      type: TrapRewardType.ROGUE_POINT,
      grade: baseGrade,
      amount: rollRewardAmount(TrapRewardType.ROGUE_POINT, baseGrade),
    },
    rollItemReward(baseGrade),
    {
      type: TrapRewardType.EXP,
      grade: baseGrade,
      amount: rollRewardAmount(TrapRewardType.EXP, baseGrade),
    },
  ];

  const disarmBonuses: TrapRewardEntry[] = [
    {
      type: TrapRewardType.MONEY,
      grade: bonusGrade,
      amount: rollRewardAmount(TrapRewardType.MONEY, bonusGrade),
    },
    {
      type: TrapRewardType.ROGUE_POINT,
      grade: bonusGrade,
      amount: rollRewardAmount(TrapRewardType.ROGUE_POINT, bonusGrade),
    },
    rollItemReward(bonusGrade),
    {
      type: TrapRewardType.EXP,
      grade: bonusGrade,
      amount: rollRewardAmount(TrapRewardType.EXP, bonusGrade),
    },
  ];

  return {
    baseRewards,
    disarmBonuses,
  };
}
