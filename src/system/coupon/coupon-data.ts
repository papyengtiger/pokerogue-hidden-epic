export type CouponReward =
  | {
      type: "ROGUE_POINTS";
      amount: number;
    }
  | {
      type: "BANK_GOLD";
      amount: number;
    }
  | {
      type: "STORAGE_ITEM";
      itemId: string;
      amount: number;
    };

export interface CouponData {
  /** 실제 입력할 쿠폰 코드 */
  code: string;

  /** 쿠폰 표시 이름 */
  name: string;

  /** 사용 가능 시작 시각 */
  startAt?: string;

  /** 사용 가능 종료 시각 */
  endAt?: string;

  /** 쿠폰 보상 */
  rewards: CouponReward[];
}

/**
 * 모든 쿠폰은 여기에 등록합니다.
 *
 * 날짜는 ISO 8601 형식을 사용합니다.
 * +09:00 = 한국 표준시(KST)
 */
export const coupons: Record<string, CouponData> = {
  CHUSEOK2026POKEROGUE: {
    code: "CHUSEOK2026POKEROGUE",
    name: "2026 추석 기념 쿠폰",

    startAt: "2026-09-23T00:00:00+09:00",
    endAt: "2026-10-09T23:59:59+09:00",

    rewards: [
      {
        type: "ROGUE_POINTS",
        amount: 30000,
      },
      {
        type: "BANK_GOLD",
        amount: 30000,
      },
      {
        type: "STORAGE_ITEM",
        itemId: "GOLDEN_EXP_CHARM",
        amount: 50,
      },
      {
        type: "STORAGE_ITEM",
        itemId: "SHINY_CHARM",
        amount: 40,
      },
      {
        type: "STORAGE_ITEM",
        itemId: "MARK_CHARM",
        amount: 40,
      },
      {
        type: "STORAGE_ITEM",
        itemId: "GOLDEN_EGG",
        amount: 40,
      },
      {
        type: "STORAGE_ITEM",
        itemId: "LUCKY_EGG",
        amount: 40,
      },
    ],
  },

  BANKTEST1: {
    code: "BANKTEST1",
    name: "은행 골드 테스트",

    rewards: [
      {
        type: "BANK_GOLD",
        amount: 30000,
      },
    ],
  },
};
