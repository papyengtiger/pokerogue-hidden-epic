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
    name: "자정의증표",
    title: "졸린",
    description: "밤에 발견한 포켓몬의 증표.",
  },

  [MarkId.ROWDY]: {
    id: MarkId.ROWDY,
    tier: MarkTier.ROGUE,
    name: "장난꾸러기증표",
    title: "난폭한",
    description: "유난히 기세가 강한 포켓몬에게 붙는 증표.",
  },

  [MarkId.WANDERER]: {
    id: MarkId.WANDERER,
    tier: MarkTier.ROGUE,
    name: "방랑의 증표",
    title: "떠도는",
    description: "오랜 시간 여러 곳을 떠돌아다닌 개체의 증표.",
  },

  [MarkId.MIRACLE]: {
    id: MarkId.MIRACLE,
    tier: MarkTier.EPIC,
    name: "기적의 증표",
    title: "기적의",
    description: "좀처럼 만날 수 없는 특별한 개체의 증표.",
  },

  [MarkId.DESTINY]: {
    id: MarkId.DESTINY,
    tier: MarkTier.RARE,
    name: "운명의증표",
    title: "운명을 느끼는",
    description: "생일에 만난 포켓몬에게 나타날 수 있는 증표.",
  },

  [MarkId.MYSTERY]: {
    id: MarkId.MYSTERY,
    tier: MarkTier.MYSTERY,
    name: "미지의 증표",
    title: "미지의",
    description: "미스터리몬스터에게만 부여되는 특수 증표.",
  },

  [MarkId.CLASSIC_CHAMPION]: {
    id: MarkId.CLASSIC_CHAMPION,
    tier: MarkTier.SPECIAL,
    name: "클래식 제패의 증표",
    title: "챔피언",
    description: "클래식 모드를 함께 클리어한 포켓몬에게 주어지는 증표.",
  },
  [MarkId.LUNCHTIME]: {
    id: MarkId.LUNCHTIME,
    tier: MarkTier.COMMON,
    name: "정오의증표",
    title: "배가 고픈",
    description: "낮에 발견한 포켓몬의 증표.",
  },

  [MarkId.DUSK]: {
    id: MarkId.DUSK,
    tier: MarkTier.COMMON,
    name: "황혼의증표",
    title: "슬슬 졸린",
    description: "해 질 무렵 발견한 포켓몬의 증표.",
  },

  [MarkId.DAWN]: {
    id: MarkId.DAWN,
    tier: MarkTier.COMMON,
    name: "새벽의증표",
    title: "일찍 일어난",
    description: "새벽에 발견한 포켓몬의 증표.",
  },

  [MarkId.CLOUDY]: {
    id: MarkId.CLOUDY,
    tier: MarkTier.COMMON,
    name: "흐림의증표",
    title: "구름을 바라보는",
    description: "흐린 날씨에 발견한 포켓몬의 증표.",
  },

  [MarkId.RAINY]: {
    id: MarkId.RAINY,
    tier: MarkTier.COMMON,
    name: "강우의증표",
    title: "비에 젖은",
    description: "비가 내리는 날씨에 발견한 포켓몬의 증표.",
  },

  [MarkId.STORMY]: {
    id: MarkId.STORMY,
    tier: MarkTier.COMMON,
    name: "우레의증표",
    title: "번개에 놀라는",
    description: "천둥번개가 치는 날씨에 발견한 포켓몬의 증표.",
  },

  [MarkId.SNOWY]: {
    id: MarkId.SNOWY,
    tier: MarkTier.COMMON,
    name: "강설의증표",
    title: "눈밭을 구르는",
    description: "눈이 내리는 날씨에 발견한 포켓몬의 증표.",
  },

  [MarkId.BLIZZARD]: {
    id: MarkId.BLIZZARD,
    tier: MarkTier.COMMON,
    name: "폭설의증표",
    title: "추위에 떠는",
    description: "눈보라 속에서 발견한 포켓몬의 증표.",
  },

  [MarkId.DRY]: {
    id: MarkId.DRY,
    tier: MarkTier.COMMON,
    name: "건조의증표",
    title: "목이 마른",
    description: "건조하고 햇볕이 강한 날씨에 발견한 포켓몬의 증표.",
  },

  [MarkId.SANDSTORM]: {
    id: MarkId.SANDSTORM,
    tier: MarkTier.COMMON,
    name: "모래먼지의증표",
    title: "모래투성이인",
    description: "모래바람 속에서 발견한 포켓몬의 증표.",
  },

  [MarkId.MISTY]: {
    id: MarkId.MISTY,
    tier: MarkTier.COMMON,
    name: "짙은안개의증표",
    title: "안개 속을 헤매는",
    description: "짙은 안개 속에서 발견한 포켓몬의 증표.",
  },

  [MarkId.FISHING]: {
    id: MarkId.FISHING,
    tier: MarkTier.COMMON,
    name: "낚아올린증표",
    title: "방금 낚아 팔팔한",
    description: "낚시로 잡은 포켓몬의 증표.",
  },

  [MarkId.CURRY]: {
    id: MarkId.CURRY,
    tier: MarkTier.SPECIAL,
    name: "카레의증표",
    title: "카레를 좋아하는",
    description: "카레를 만든 뒤 캠프를 찾아온 포켓몬의 증표.",
  },

  [MarkId.UNCOMMON]: {
    id: MarkId.UNCOMMON,
    tier: MarkTier.COMMON,
    name: "가끔보는증표",
    title: "사람을 따르는",
    description: "사람을 잘 따르는 포켓몬의 증표.",
  },

  [MarkId.RARE_MARK]: {
    id: MarkId.RARE_MARK,
    tier: MarkTier.LEGENDARY,
    name: "희귀의증표",
    title: "본 적 없는",
    description: "극히 드물게 발견되는 야생 포켓몬의 증표.",
  },

  [MarkId.ABSENT_MINDED]: {
    id: MarkId.ABSENT_MINDED,
    tier: MarkTier.ROGUE,
    name: "촐랑거리는증표",
    title: "아무 생각이 없는",
    description: "어딘가 멍한 포켓몬의 증표.",
  },

  [MarkId.JITTERY]: {
    id: MarkId.JITTERY,
    tier: MarkTier.ROGUE,
    name: "긴장의증표",
    title: "두근거리는",
    description: "긴장하는 포켓몬의 증표.",
  },

  [MarkId.EXCITED]: {
    id: MarkId.EXCITED,
    tier: MarkTier.ROGUE,
    name: "기대의증표",
    title: "기대에 찬",
    description: "무언가를 기대하는 포켓몬의 증표.",
  },

  [MarkId.CHARISMATIC]: {
    id: MarkId.CHARISMATIC,
    tier: MarkTier.ROGUE,
    name: "카리스마의증표",
    title: "오라가 느껴지는",
    description: "빛나는 존재감을 지닌 포켓몬의 증표.",
  },

  [MarkId.CALMNESS]: {
    id: MarkId.CALMNESS,
    tier: MarkTier.ROGUE,
    name: "냉정의증표",
    title: "쿨한",
    description: "침착한 포켓몬의 증표.",
  },

  [MarkId.INTENSE]: {
    id: MarkId.INTENSE,
    tier: MarkTier.ROGUE,
    name: "정열의증표",
    title: "적극적인",
    description: "열정적인 포켓몬의 증표.",
  },

  [MarkId.ZONED_OUT]: {
    id: MarkId.ZONED_OUT,
    tier: MarkTier.ROGUE,
    name: "방심의증표",
    title: "멍한",
    description: "멍하니 있는 포켓몬의 증표.",
  },

  [MarkId.JOYFUL]: {
    id: MarkId.JOYFUL,
    tier: MarkTier.ROGUE,
    name: "다행의증표",
    title: "행복해 보이는",
    description: "행복해 보이는 포켓몬의 증표.",
  },

  [MarkId.ANGRY]: {
    id: MarkId.ANGRY,
    tier: MarkTier.ROGUE,
    name: "분노의증표",
    title: "화가 난",
    description: "화가 난 포켓몬의 증표.",
  },

  [MarkId.SMILEY]: {
    id: MarkId.SMILEY,
    tier: MarkTier.ROGUE,
    name: "미소의증표",
    title: "생긋생긋 웃는",
    description: "웃는 얼굴의 포켓몬의 증표.",
  },

  [MarkId.TEARY]: {
    id: MarkId.TEARY,
    tier: MarkTier.ROGUE,
    name: "눈물의증표",
    title: "눈물이 많은",
    description: "눈물이 많은 포켓몬의 증표.",
  },

  [MarkId.UPBEAT]: {
    id: MarkId.UPBEAT,
    tier: MarkTier.ROGUE,
    name: "쾌조의증표",
    title: "기분이 좋은",
    description: "기분이 좋아 보이는 포켓몬의 증표.",
  },

  [MarkId.PEEVED]: {
    id: MarkId.PEEVED,
    tier: MarkTier.ROGUE,
    name: "격렬의증표",
    title: "기분이 나쁜",
    description: "심기가 불편한 포켓몬의 증표.",
  },

  [MarkId.INTELLECTUAL]: {
    id: MarkId.INTELLECTUAL,
    tier: MarkTier.ROGUE,
    name: "지적의증표",
    title: "똑똑한",
    description: "똑똑해 보이는 포켓몬의 증표.",
  },

  [MarkId.FEROCIOUS]: {
    id: MarkId.FEROCIOUS,
    tier: MarkTier.ROGUE,
    name: "본능의증표",
    title: "거칠게 날뛰는",
    description: "본능대로 날뛰는 포켓몬의 증표.",
  },

  [MarkId.CRAFTY]: {
    id: MarkId.CRAFTY,
    tier: MarkTier.ROGUE,
    name: "교활의증표",
    title: "빈틈을 노리는",
    description: "상대의 빈틈을 노리는 포켓몬의 증표.",
  },

  [MarkId.SCOWLING]: {
    id: MarkId.SCOWLING,
    tier: MarkTier.ROGUE,
    name: "두려움의증표",
    title: "엄격한",
    description: "엄격해 보이는 포켓몬의 증표.",
  },

  [MarkId.KINDLY]: {
    id: MarkId.KINDLY,
    tier: MarkTier.ROGUE,
    name: "상냥함의증표",
    title: "상냥한",
    description: "상냥한 포켓몬의 증표.",
  },

  [MarkId.FLUSTERED]: {
    id: MarkId.FLUSTERED,
    tier: MarkTier.ROGUE,
    name: "당황의증표",
    title: "쉽게 허둥대는",
    description: "쉽게 당황하는 포켓몬의 증표.",
  },

  [MarkId.PUMPED_UP]: {
    id: MarkId.PUMPED_UP,
    tier: MarkTier.ROGUE,
    name: "우쭐한증표",
    title: "투지가 넘치는",
    description: "투지가 넘치는 포켓몬의 증표.",
  },

  [MarkId.ZERO_ENERGY]: {
    id: MarkId.ZERO_ENERGY,
    tier: MarkTier.ROGUE,
    name: "권태의증표",
    title: "의욕이 없는",
    description: "의욕이 없는 포켓몬의 증표.",
  },

  [MarkId.PRIDEFUL]: {
    id: MarkId.PRIDEFUL,
    tier: MarkTier.ROGUE,
    name: "자신의증표",
    title: "거만한",
    description: "거만한 포켓몬의 증표.",
  },

  [MarkId.UNSURE]: {
    id: MarkId.UNSURE,
    tier: MarkTier.ROGUE,
    name: "불신의증표",
    title: "자신감이 없는",
    description: "자신감이 없는 포켓몬의 증표.",
  },

  [MarkId.HUMBLE]: {
    id: MarkId.HUMBLE,
    tier: MarkTier.ROGUE,
    name: "순박한증표",
    title: "순박한",
    description: "순박한 포켓몬의 증표.",
  },

  [MarkId.THORNY]: {
    id: MarkId.THORNY,
    tier: MarkTier.ROGUE,
    name: "불순의증표",
    title: "잘난 체하는",
    description: "잘난 체하는 포켓몬의 증표.",
  },

  [MarkId.VIGOR]: {
    id: MarkId.VIGOR,
    tier: MarkTier.ROGUE,
    name: "기력의증표",
    title: "기운이 넘치는",
    description: "기운이 넘치는 포켓몬의 증표.",
  },

  [MarkId.SLUMP]: {
    id: MarkId.SLUMP,
    tier: MarkTier.ROGUE,
    name: "피곤의증표",
    title: "어딘가 지쳐 보이는",
    description: "지쳐 보이는 포켓몬의 증표.",
  },

  [MarkId.JUMBO]: {
    id: MarkId.JUMBO,
    tier: MarkTier.LEGENDARY,
    name: "커다란증표",
    title: "커다란",
    description: "크기가 최댓값인 포켓몬에게 수여하는 증표.",
  },

  [MarkId.MINI]: {
    id: MarkId.MINI,
    tier: MarkTier.LEGENDARY,
    name: "조그만증표",
    title: "작은",
    description: "크기가 최솟값인 포켓몬에게 수여하는 증표.",
  },

  [MarkId.ITEMFINDER]: {
    id: MarkId.ITEMFINDER,
    tier: MarkTier.RARE,
    name: "습득의증표",
    title: "트레저헌터",
    description: "물건을 주워 획득한 포켓몬의 증표.",
  },

  [MarkId.PARTNER]: {
    id: MarkId.PARTNER,
    tier: MarkTier.RARE,
    name: "파트너의증표",
    title: "믿음직한 파트너",
    description: "높은 친밀도를 지닌 포켓몬의 증표.",
  },

  [MarkId.GOURMAND]: {
    id: MarkId.GOURMAND,
    tier: MarkTier.COMMON,
    name: "미식가의증표",
    title: "미식가",
    description: "음식을 즐기는 포켓몬의 증표.",
  },

  [MarkId.ALPHA]: {
    id: MarkId.ALPHA,
    tier: MarkTier.SPECIAL,
    name: "우두머리의증표",
    title: "우두머리였던",
    description: "우두머리 포켓몬에게 부여되는 증표.",
  },

  [MarkId.MIGHTIEST]: {
    id: MarkId.MIGHTIEST,
    tier: MarkTier.SPECIAL,
    name: "최강의증표",
    title: "최강의",
    description: "최강의 레이드 포켓몬에게 부여되는 증표.",
  },

  [MarkId.TITAN]: {
    id: MarkId.TITAN,
    tier: MarkTier.SPECIAL,
    name: "주인의증표",
    title: "주인이었던",
    description: "과거 주인이었던 포켓몬의 증표.",
  },
};

/** Optional encounter conditions. Omitted conditions never roll conditional marks. */
export interface MarkRollContext {
  /** Birthdays only (Scarlet/Violet). */
  isBirthday?: boolean;
  /** Encounter part of day. */
  time?: "dawn" | "day" | "dusk" | "night";
  /** Encounter weather; omit when unknown. */
  weather?: "cloudy" | "rain" | "thunder" | "snow" | "blizzard" | "sun" | "sandstorm" | "fog";
  /** True only for fishing encounters. */
  isFishing?: boolean;
}

const personalityMarks: readonly MarkId[] = [
  MarkId.ROWDY,
  MarkId.ABSENT_MINDED,
  MarkId.JITTERY,
  MarkId.EXCITED,
  MarkId.CHARISMATIC,
  MarkId.CALMNESS,
  MarkId.INTENSE,
  MarkId.ZONED_OUT,
  MarkId.JOYFUL,
  MarkId.ANGRY,
  MarkId.SMILEY,
  MarkId.TEARY,
  MarkId.UPBEAT,
  MarkId.PEEVED,
  MarkId.INTELLECTUAL,
  MarkId.FEROCIOUS,
  MarkId.CRAFTY,
  MarkId.SCOWLING,
  MarkId.KINDLY,
  MarkId.FLUSTERED,
  MarkId.PUMPED_UP,
  MarkId.ZERO_ENERGY,
  MarkId.PRIDEFUL,
  MarkId.UNSURE,
  MarkId.HUMBLE,
  MarkId.THORNY,
  MarkId.VIGOR,
  MarkId.SLUMP,
];

const timeMarks: Record<NonNullable<MarkRollContext["time"]>, MarkId> = {
  dawn: MarkId.DAWN,
  day: MarkId.LUNCHTIME,
  dusk: MarkId.DUSK,
  night: MarkId.SLEEPY,
};

const weatherMarks: Record<NonNullable<MarkRollContext["weather"]>, MarkId> = {
  cloudy: MarkId.CLOUDY,
  rain: MarkId.RAINY,
  thunder: MarkId.STORMY,
  snow: MarkId.SNOWY,
  blizzard: MarkId.BLIZZARD,
  sun: MarkId.DRY,
  sandstorm: MarkId.SANDSTORM,
  fog: MarkId.MISTY,
};

/**
 * Wild encounter marks only. Normal rates use main-series category odds.
 * Special, event and achievement marks are granted by their own systems.
 * An omitted context keeps legacy callers working without inventing time/weather.
 */
export function rollRandomMark(rateMultiplier = 1, context: MarkRollContext = {}): MarkId {
  const multiplier = Number.isFinite(rateMultiplier) && rateMultiplier > 0 ? rateMultiplier : 1;
  const roll = (baseRate: number) => !randSeedInt(Math.max(1, Math.floor(baseRate / multiplier)));

  if (context.isBirthday && roll(25)) {
    return MarkId.DESTINY;
  }
  if (roll(1000)) {
    return MarkId.RARE_MARK;
  }
  // 1/100 for the entire personality category; 1/2800 for any one personality.
  if (roll(100)) {
    return personalityMarks[randSeedInt(personalityMarks.length)];
  }
  if (roll(50)) {
    return MarkId.UNCOMMON;
  }
  if (context.weather && roll(50)) {
    return weatherMarks[context.weather];
  }
  if (context.time && roll(50)) {
    return timeMarks[context.time];
  }
  if (context.isFishing && roll(25)) {
    return MarkId.FISHING;
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
