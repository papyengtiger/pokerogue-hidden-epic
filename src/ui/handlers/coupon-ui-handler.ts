import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { UiMode } from "#enums/ui-mode";
import { CouponRedeemResult, couponManager } from "#system/coupon/coupon-manager";
import { AwaitableUiHandler } from "#ui/awaitable-ui-handler";

/**
 * 쿠폰 입력 UI.
 *
 * 실제 문자열 입력은 기존 TEST_DIALOGUE UI를 재사용하고,
 * 이 Handler는 쿠폰 화면 진입 / 결과 처리 / 복귀를 담당합니다.
 */
export class CouponUiHandler extends AwaitableUiHandler {
  private processing = false;

  constructor() {
    super(UiMode.COUPON);
  }

  setup(): void {
    // 별도의 Phaser 오브젝트를 만들 필요는 없음.
    // 실제 입력창은 TEST_DIALOGUE를 사용한다.
  }

  show(args: any[]): boolean {
    super.show(args);

    this.processing = false;
    this.awaitingActionInput = true;

    this.openCouponInput();

    return true;
  }

  private openCouponInput(): void {
    this.awaitingActionInput = false;

    const buttonAction = async (code: string) => {
      if (this.processing) {
        return;
      }

      let trimmedCode = "";

      try {
        trimmedCode = decodeURIComponent(escape(atob(code ?? ""))).trim();
      } catch (error) {
        console.error("[COUPON_DECODE_ERROR]", error);
        trimmedCode = "";
      }

      if (!trimmedCode) {
        globalScene.ui.playError();

        globalScene.ui.showText("쿠폰 번호를 입력해주세요.", null, () => {
          this.openCouponInput();
        });

        return;
      }

      this.processing = true;

      try {
        const response = await couponManager.redeemCoupon(trimmedCode);

        this.processing = false;

        switch (response.result) {
          case CouponRedeemResult.SUCCESS:
            globalScene.ui.playSelect();
            break;

          case CouponRedeemResult.INVALID_CODE:
          case CouponRedeemResult.NOT_STARTED:
          case CouponRedeemResult.EXPIRED:
          case CouponRedeemResult.ALREADY_USED:
          case CouponRedeemResult.REWARD_FAILED:
            globalScene.ui.playError();
            break;
        }

        /*
         * TEST_DIALOGUE가 현재 위에 올라와 있으므로
         * 먼저 쿠폰 UI로 돌아온다.
         */
        await globalScene.ui.revertMode();

        globalScene.ui.showText(response.message, null, () => {
          this.awaitingActionInput = true;
        });
      } catch (error) {
        console.error("[COUPON_REDEEM_ERROR]", error);

        this.processing = false;

        await globalScene.ui.revertMode();

        globalScene.ui.playError();

        globalScene.ui.showText("쿠폰 처리 중 오류가 발생했습니다.", null, () => {
          this.awaitingActionInput = true;
        });
      }
    };

    /*
     * 기존 TEST_DIALOGUE를 입력창으로 사용.
     *
     * setOverlayMode를 사용해야
     *
     * COUPON
     *   ↓
     * TEST_DIALOGUE
     *
     * 형태로 modeChain에 COUPON이 남는다.
     */
    // ✅ 수정
    this.getUi().setOverlayMode(
      UiMode.TEST_DIALOGUE,
      {
        buttonActions: [
          buttonAction,
          () => {
            this.getUi().revertMode();
            this.awaitingActionInput = true;
          },
        ],
      },
      "",
    );
  }

  processInput(button: Button): boolean {
    if (this.processing) {
      return false;
    }

    switch (button) {
      case Button.ACTION:
        this.openCouponInput();
        return true;

      case Button.CANCEL:
        this.closeCouponUi();
        return true;
    }

    return false;
  }

  private async closeCouponUi(): Promise<void> {
    this.awaitingActionInput = false;

    const reverted = await globalScene.ui.revertMode();

    /*
     * COUPON 자체가 setMode()로 열린 경우에는
     * modeChain에 이전 화면이 없을 수도 있다.
     *
     * 메뉴에서 열 때는 setOverlayMode(UiMode.COUPON)를
     * 사용하는 것을 권장한다.
     */
    if (!reverted) {
      await globalScene.ui.setMode(UiMode.MENU);
    }
  }

  clear(): void {
    super.clear();

    this.processing = false;
    this.awaitingActionInput = false;

    this.getUi().clearText();
  }
}
