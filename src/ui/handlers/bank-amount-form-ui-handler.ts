import { Button } from "#enums/buttons";
import { FormModalUiHandler } from "#ui/form-modal-ui-handler";
import type { InputFieldConfig, ModalConfig } from "#ui/form-modal-ui-handler";

export class BankAmountFormUiHandler extends FormModalUiHandler {
  private modalConfig?: ModalConfig;

  getModalTitle(_config?: ModalConfig): string {
    return "금액 입력";
  }

  getWidth(_config?: ModalConfig): number {
    return 160;
  }

  getMargin(_config?: ModalConfig): [number, number, number, number] {
    return [0, 0, 48, 0];
  }

  getButtonLabels(_config?: ModalConfig): string[] {
    return ["확인", "취소"];
  }

  override getInputFieldConfigs(): InputFieldConfig[] {
    return [{ label: "금액" }];
  }

  show(args: any[]): boolean {
    if (!super.show(args)) {
      return false;
    }

    const config = args[0] as ModalConfig;
    this.modalConfig = config;

    if (this.inputs?.length > 0) {
      this.inputs.forEach(input => {
        input.text = "";
      });
    }

    this.submitAction = () => {
      this.sanitizeInputs();

      const raw = this.inputs?.[0]?.text?.trim?.() ?? "";
      const amount = Number(raw);

      if (!raw.length) {
        this.showBankError("금액을 입력하세요.");
        return false;
      }

      if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
        this.showBankError("1 이상의 정수를 입력하세요.");
        return false;
      }

      config.buttonActions?.[0]?.(amount);
      return true;
    };

    return true;
  }

  override processInput(button: Button): boolean {
    if (button === Button.CANCEL) {
      this.runCancelAction();
      return true;
    }

    /**
     * 중요:
     * FormModalUiHandler가 취소 버튼 선택 후 ACTION을 자동 처리하지 않는 경우를 대비해
     * 취소 버튼이 선택된 상태에서 ACTION을 눌렀을 때도 직접 취소 처리합니다.
     *
     * 아래의 this.cursor / this.buttonCursor 는
     * 실제 FormModalUiHandler 내부에서 쓰는 이름에 맞게 하나만 사용하세요.
     */
    if (button === Button.ACTION) {
  const selectedButtonIndex =
    (this as any).buttonCursor ?? (this as any).cursor ?? 0;

  console.log("[BANK_AMOUNT_FORM] selectedButtonIndex =", selectedButtonIndex);

  if (selectedButtonIndex === 1) {
    this.runCancelAction();
    return true;
  }
}

    return super.processInput(button);
  }

  private runCancelAction(): void {
    this.modalConfig?.buttonActions?.[1]?.();
    this.getUi().playSelect();
    this.getUi().revertMode();
  }

  private showBankError(message: string): void {
    this.errorMessage = message;
    this.updateErrorText();
    this.getUi().playError();
  }
}