import type { SpeciesId } from "#enums/species-id";
import { ExchangeCurrencyType } from "#enums/exchange-currency-type";

export interface ExchangeRule {
  inputAmount: number;
  outputRp: number;
}

export interface ExchangePreviewResult {
  success: boolean;
  source: ExchangeCurrencyType;
  requestedAmount: number;
  consumedAmount: number;
  remainderAmount: number;
  gainedRp: number;
  speciesId?: SpeciesId;
  reason?: string;
}

export const EXCHANGE_RULES_TO_RP: Record<ExchangeCurrencyType, ExchangeRule> = {
  [ExchangeCurrencyType.MONEY]: {
    inputAmount: 1000,
    outputRp: 1,
  },
  [ExchangeCurrencyType.CANDY]: {
    inputAmount: 10,
    outputRp: 1,
  },
  [ExchangeCurrencyType.VOUCHER_REGULAR]: {
    inputAmount: 1,
    outputRp: 15,
  },
  [ExchangeCurrencyType.VOUCHER_PLUS]: {
    inputAmount: 1,
    outputRp: 60,
  },
  [ExchangeCurrencyType.VOUCHER_PREMIUM]: {
    inputAmount: 1,
    outputRp: 250,
  },
  [ExchangeCurrencyType.VOUCHER_GOLD]: {
    inputAmount: 1,
    outputRp: 250, // 실제 상점 가격 기준이 2500이면 250, 5000이면 500으로 수정
  },
};

export function getExchangePreviewToRp(
  source: ExchangeCurrencyType,
  amount: number,
  speciesId?: SpeciesId,
): ExchangePreviewResult {
  const rule = EXCHANGE_RULES_TO_RP[source];

  if (!rule) {
    return {
      success: false,
      source,
      requestedAmount: amount,
      consumedAmount: 0,
      remainderAmount: amount,
      gainedRp: 0,
      speciesId,
      reason: "환전 규칙이 없습니다.",
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      source,
      requestedAmount: amount,
      consumedAmount: 0,
      remainderAmount: amount,
      gainedRp: 0,
      speciesId,
      reason: "수량은 1 이상이어야 합니다.",
    };
  }

  const unitCount = Math.floor(amount / rule.inputAmount);

  if (unitCount <= 0) {
    return {
      success: false,
      source,
      requestedAmount: amount,
      consumedAmount: 0,
      remainderAmount: amount,
      gainedRp: 0,
      speciesId,
      reason: `최소 ${rule.inputAmount}개부터 환전할 수 있습니다.`,
    };
  }

  const consumedAmount = unitCount * rule.inputAmount;
  const remainderAmount = amount - consumedAmount;
  const gainedRp = unitCount * rule.outputRp;

  return {
    success: true,
    source,
    requestedAmount: amount,
    consumedAmount,
    remainderAmount,
    gainedRp,
    speciesId,
  };
}

export function getExchangeCurrencyLabel(type: ExchangeCurrencyType): string {
  switch (type) {
    case ExchangeCurrencyType.MONEY:
      return "골드";
    case ExchangeCurrencyType.CANDY:
      return "포켓몬사탕";
    case ExchangeCurrencyType.VOUCHER_REGULAR:
      return "알바우처";
    case ExchangeCurrencyType.VOUCHER_PLUS:
      return "알바우처플러스";
    case ExchangeCurrencyType.VOUCHER_PREMIUM:
      return "알바우처프리미엄";
    case ExchangeCurrencyType.VOUCHER_GOLD:
      return "알바우처골드";
    default:
      return "알 수 없는 재화";
  }
}

export function getExchangeRateDescription(type: ExchangeCurrencyType): string {
  switch (type) {
    case ExchangeCurrencyType.MONEY:
      return "1000골드당 1 로그포인트로 환전합니다.";
    case ExchangeCurrencyType.CANDY:
      return "포켓몬사탕 10개당 1 로그포인트로 환전합니다.";
    case ExchangeCurrencyType.VOUCHER_REGULAR:
      return "알바우처 1장당 15 로그포인트로 환전합니다.";
    case ExchangeCurrencyType.VOUCHER_PLUS:
      return "알바우처플러스 1장당 60 로그포인트로 환전합니다.";
    case ExchangeCurrencyType.VOUCHER_PREMIUM:
      return "알바우처프리미엄 1장당 250 로그포인트로 환전합니다.";
    case ExchangeCurrencyType.VOUCHER_GOLD:
      return "알바우처골드 1장당 250 로그포인트로 환전합니다.";
    default:
      return "";
  }
}