import { MarkId } from "#enums/mark-id";
import { MarkTier } from "#enums/mark-tier";
import { randSeedInt } from "#utils/common";

export interface MarkData {
  id: MarkId;
  tier: MarkTier;
  name: string;
  title: string;
  description: string;
}

export const markData: Record<MarkId, MarkData> = {
  [MarkId.NONE]: {
    id: MarkId.NONE,
    tier: MarkTier.COMMON,
    name: "",
    title: "",
    description: "",
  },

  [MarkId.SLEEPY]: {
    id: MarkId.SLEEPY,
    tier: MarkTier.COMMON,
    name: "졸음의 증표",
    title: "꾸벅꾸벅 잠에 드는",
    description: "졸려 보이는 포켓몬에게 붙는 증표.",
  },

  [MarkId.ROWDY]: {
    id: MarkId.ROWDY,
    tier: MarkTier.RARE,
    name: "난폭한 증표",
    title: "혈기왕성한",
    description: "유난히 기세가 강한 포켓몬에게 붙는 증표.",
  },

  [MarkId.WANDERER]: {
    id: MarkId.WANDERER,
    tier: MarkTier.ROGUE,
    name: "방랑의 증표",
    title: "길을 떠도는",
    description: "오랜 시간 여러 곳을 떠돌아다닌 개체의 증표.",
  },

  [MarkId.MIRACLE]: {
    id: MarkId.MIRACLE,
    tier: MarkTier.EPIC,
    name: "기적의 증표",
    title: "기적을 불러오는",
    description: "좀처럼 만날 수 없는 특별한 개체의 증표.",
  },

  [MarkId.DESTINY]: {
    id: MarkId.DESTINY,
    tier: MarkTier.LEGENDARY,
    name: "운명의 증표",
    title: "운명에 선택받은",
    description: "극히 희귀한 개체에게만 나타나는 증표.",
  },

  [MarkId.MYSTERY]: {
    id: MarkId.MYSTERY,
    tier: MarkTier.MYSTERY,
    name: "미지의 증표",
    title: "정체를 알 수 없는",
    description: "미스터리몬스터에게만 부여되는 특수 증표.",
  },

  [MarkId.CLASSIC_CHAMPION]: {
    id: MarkId.CLASSIC_CHAMPION,
    tier: MarkTier.SPECIAL,
    name: "클래식 제패의 증표",
    title: "클래식을 제패한",
    description: "클래식 모드를 함께 클리어한 포켓몬에게 주어지는 증표.",
  },
};

export function rollRandomMark(rateMultiplier = 1): MarkId {
  const roll = (baseRate: number) => !randSeedInt(Math.max(1, Math.floor(baseRate / rateMultiplier)));

  if (roll(1000)) {
    return MarkId.DESTINY;
  }
  if (roll(500)) {
    return MarkId.MIRACLE;
  }
  if (roll(250)) {
    return MarkId.WANDERER;
  }
  if (roll(100)) {
    return MarkId.ROWDY;
  }
  if (roll(10)) {
    return MarkId.SLEEPY;
  }

  return MarkId.NONE;
}

export function getMarkData(mark: MarkId): MarkData {
  return markData[mark];
}

export function getMarkTier(mark: MarkId): MarkTier {
  return markData[mark].tier;
}

export function getMarkTitle(mark: MarkId): string {
  return markData[mark].title;
}
