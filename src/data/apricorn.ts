import { ApricornType } from "#enums/apricorn-type";
import i18next from "i18next";

const APRICORN_FALLBACK_NAMES: Record<ApricornType, string> = {
  [ApricornType.RED]: "빨강규토리",
  [ApricornType.BLUE]: "파랑규토리",
  [ApricornType.YELLOW]: "노랑규토리",
  [ApricornType.GREEN]: "초록규토리",
  [ApricornType.PINK]: "분홍규토리",
  [ApricornType.WHITE]: "하양규토리",
  [ApricornType.BLACK]: "검정규토리",
  [ApricornType.BROWN]: "갈색규토리",
};

export function getApricornName(apricornType: ApricornType): string {
  const key = ApricornType[apricornType].toLowerCase();

  return i18next.t(`apricorn:${key}.name`, {
    defaultValue: APRICORN_FALLBACK_NAMES[apricornType],
  });
}
