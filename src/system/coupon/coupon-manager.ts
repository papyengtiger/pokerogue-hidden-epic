import { globalScene } from "#app/global-scene";
import { type CouponData, type CouponReward, coupons } from "#system/coupon/coupon-data";

export enum CouponRedeemResult {
  SUCCESS = "SUCCESS",
  INVALID_CODE = "INVALID_CODE",
  NOT_STARTED = "NOT_STARTED",
  EXPIRED = "EXPIRED",
  ALREADY_USED = "ALREADY_USED",
  REWARD_FAILED = "REWARD_FAILED",
}

export interface CouponRedeemResponse {
  result: CouponRedeemResult;
  coupon?: CouponData;
  message: string;
}

export class CouponManager {
  /**
   * 입력된 쿠폰 번호를 정규화합니다.
   *
   * chuseok2026
   * CHUSEOK2026
   * " CHUSEOK2026 "
   *
   * 모두 CHUSEOK2026으로 처리됩니다.
   */
  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  /**
   * 쿠폰을 이미 사용했는지 확인합니다.
   */
  public hasUsedCoupon(code: string): boolean {
    const normalizedCode = this.normalizeCode(code);

    const usedCoupons = globalScene.gameData.usedCoupons ?? [];

    return usedCoupons.includes(normalizedCode);
  }

  /**
   * 쿠폰 자체가 현재 사용 가능한지 검사합니다.
   */
  public validateCoupon(code: string): CouponRedeemResponse {
    const normalizedCode = this.normalizeCode(code);

    if (!normalizedCode) {
      return {
        result: CouponRedeemResult.INVALID_CODE,
        message: "쿠폰 번호를 입력해주세요.",
      };
    }

    const coupon = coupons[normalizedCode];

    if (!coupon) {
      return {
        result: CouponRedeemResult.INVALID_CODE,
        message: "존재하지 않는 쿠폰 번호입니다.",
      };
    }

    if (this.hasUsedCoupon(normalizedCode)) {
      return {
        result: CouponRedeemResult.ALREADY_USED,
        coupon,
        message: "이미 사용한 쿠폰입니다.",
      };
    }

    const now = Date.now();

    if (coupon.startAt) {
      const startTime = new Date(coupon.startAt).getTime();

      if (now < startTime) {
        return {
          result: CouponRedeemResult.NOT_STARTED,
          coupon,
          message: "아직 사용할 수 없는 쿠폰입니다.",
        };
      }
    }

    if (coupon.endAt) {
      const endTime = new Date(coupon.endAt).getTime();

      if (now > endTime) {
        return {
          result: CouponRedeemResult.EXPIRED,
          coupon,
          message: "사용 기간이 만료된 쿠폰입니다.",
        };
      }
    }

    return {
      result: CouponRedeemResult.SUCCESS,
      coupon,
      message: "사용 가능한 쿠폰입니다.",
    };
  }

  /**
   * 실제 보상을 지급합니다.
   */
  private giveReward(reward: CouponReward): boolean {
    const gameData = globalScene.gameData;

    console.log("[COUPON REWARD]", reward);

    switch (reward.type) {
      case "ROGUE_POINTS":
        gameData.addRoguePoints(reward.amount);
        return true;

      case "BANK_GOLD": {
        const before = gameData.bankMoney;
        const result = gameData.addBankMoney(reward.amount);
        const after = gameData.bankMoney;

        console.log("[COUPON BANK GOLD]", {
          amount: reward.amount,
          before,
          after,
          result,
        });

        return result;
      }

      case "STORAGE_ITEM":
        return gameData.addToStorage(reward.itemId, reward.amount);

      default:
        console.warn("[COUPON UNKNOWN REWARD]", reward);
        return false;
    }
  }

  /**
   * 쿠폰을 실제로 사용합니다.
   */
  public async redeemCoupon(code: string): Promise<CouponRedeemResponse> {
    const normalizedCode = this.normalizeCode(code);

    const validation = this.validateCoupon(normalizedCode);

    if (validation.result !== CouponRedeemResult.SUCCESS || !validation.coupon) {
      return validation;
    }

    const coupon = validation.coupon;
    const gameData = globalScene.gameData;

    // 혹시 기존 세이브라 usedCoupons가 없다면 생성
    gameData.usedCoupons ??= [];

    for (const reward of coupon.rewards) {
      const success = this.giveReward(reward);

      if (!success) {
        return {
          result: CouponRedeemResult.REWARD_FAILED,
          coupon,
          message: "쿠폰 보상 지급에 실패했습니다.",
        };
      }
    }

    /*
     * 보상 지급이 끝난 뒤 사용 처리합니다.
     * 따라서 검증 단계에서 실패한 쿠폰은 기록되지 않습니다.
     */
    gameData.usedCoupons.push(normalizedCode);

    const saveSuccess = await gameData.saveSystem();

    if (!saveSuccess) {
      console.warn(`[COUPON] Save failed after redeeming ${normalizedCode}`);
    }

    return {
      result: CouponRedeemResult.SUCCESS,
      coupon,
      message: `${coupon.name} 보상을 받았습니다!`,
    };
  }
}

export const couponManager = new CouponManager();
