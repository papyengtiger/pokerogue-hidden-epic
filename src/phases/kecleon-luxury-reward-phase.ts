import { globalScene } from "#app/global-scene";
import { modifierTypes } from "#data/data-lists";
import {
  ExpBoosterModifier,
  MoneyInterestModifier,
  MoneyMultiplierModifier,
  type PersistentModifier,
} from "#modifiers/modifier";
import { BattlePhase } from "#phases/battle-phase";

export class KecleonLuxuryRewardPhase extends BattlePhase {
  public readonly phaseName = "KecleonLuxuryRewardPhase";

  start(): void {
    super.start();

    let goldenVoucherCount = 1;

    /*
     * ─────────────────────────────────────
     * 1. 골드 바우처 기본 1장
     * ─────────────────────────────────────
     *
     * 실제 지급은 아래에서 대체분까지 전부 계산한 뒤
     * 한꺼번에 지급한다.
     */

    /*
     * ─────────────────────────────────────
     * 2. 마스터볼 20개
     * ─────────────────────────────────────
     *
     * MASTER_BALL modifier 1회 = 5개이므로
     * 4회 적용.
     */
    for (let i = 0; i < 4; i++) {
      const masterBallType = modifierTypes.MASTER_BALL();
      masterBallType.withIdFromFunc(modifierTypes.MASTER_BALL);

      const modifier = masterBallType.newModifier();

      modifier?.apply();
    }

    /*
     * ─────────────────────────────────────
     * 3. 황금경험치부적 3개
     * ─────────────────────────────────────
     */
    this.addPersistentModifier(modifierTypes.GOLDEN_EXP_CHARM, ExpBoosterModifier, 3);

    /*
     * ─────────────────────────────────────
     * 4. 부적금화
     *
     * 원래 보상량: 5개
     * 최대 스택: 5
     *
     * 받을 수 있는 만큼 지급하고,
     * 못 받은 수량은 골드 바우처로 교환.
     * ─────────────────────────────────────
     */
    goldenVoucherCount += this.fillModifierAndReturnOverflow(modifierTypes.AMULET_COIN, MoneyMultiplierModifier, 5);

    /*
     * ─────────────────────────────────────
     * 5. 동전케이스
     *
     * 원래 보상량: 3개
     * 최대 스택: 3
     *
     * 받을 수 없는 수량은 골드 바우처로 교환.
     * ─────────────────────────────────────
     */
    goldenVoucherCount += this.fillModifierAndReturnOverflow(modifierTypes.COIN_CASE, MoneyInterestModifier, 3);

    /*
     * ─────────────────────────────────────
     * 6. 골드 바우처 지급
     * ─────────────────────────────────────
     */
    for (let i = 0; i < goldenVoucherCount; i++) {
      const voucherType = modifierTypes.VOUCHER_GOLDEN();
      voucherType.withIdFromFunc(modifierTypes.VOUCHER_GOLDEN);

      const modifier = voucherType.newModifier();

      modifier?.apply();
    }

    /*
     * 차후 추가 예정
     *
     * - 황금학습장치 ×1
     * - VIP티켓 ×1
     * - VIP엠블럼 ×1
     */

    globalScene.updateModifiers(true);

    globalScene.phaseManager.queueMessage("캘리몬들을 모두 쓰러뜨렸다!\n호화보상을 획득했다!");

    this.end();
  }

  /**
   * 일반적인 지속형 Modifier를 지정 수량만큼 추가한다.
   *
   * 현재 보유량 + 지급량이 최대치를 넘는 경우에는
   * 최대치까지만 지급한다.
   */
  private addPersistentModifier<T extends PersistentModifier>(
    modifierFunc: () => any,
    modifierClass: new (...args: any[]) => T,
    amount: number,
  ): number {
    const existingModifier = globalScene.findModifier(m => m instanceof modifierClass, true) as T | undefined;

    const type = modifierFunc();
    type.withIdFromFunc(modifierFunc);

    const dummyModifier = type.newModifier() as T | null;

    if (!dummyModifier) {
      return 0;
    }

    const currentCount = existingModifier?.getStackCount() ?? 0;

    const maxCount = existingModifier?.getMaxStackCount() ?? dummyModifier.getMaxStackCount();

    const addCount = Math.min(amount, Math.max(0, maxCount - currentCount));

    if (addCount <= 0) {
      return 0;
    }

    dummyModifier.stackCount = addCount;

    globalScene.addModifier(dummyModifier, true, false, false, true);

    return addCount;
  }

  /**
   * 지정된 보상 수량 중 받을 수 있는 만큼 지급하고,
   * 받지 못한 나머지 수량을 반환한다.
   *
   * 반환값은 골드 바우처 대체 지급량으로 사용.
   */
  private fillModifierAndReturnOverflow<T extends PersistentModifier>(
    modifierFunc: () => any,
    modifierClass: new (...args: any[]) => T,
    rewardAmount: number,
  ): number {
    const addedCount = this.addPersistentModifier(modifierFunc, modifierClass, rewardAmount);

    return rewardAmount - addedCount;
  }
}
