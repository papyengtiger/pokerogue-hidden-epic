import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { FormModalUiHandler } from "#ui/form-modal-ui-handler";
import type { InputFieldConfig, ModalConfig } from "#ui/form-modal-ui-handler";

export class PracticeLevelFormUiHandler extends FormModalUiHandler {
  private modalConfig?: ModalConfig;

  getModalTitle(_config?: ModalConfig): string {
    return "레벨을 입력하시오";
  }

  getWidth(_config?: ModalConfig): number {
    return 176;
  }

  getMargin(_config?: ModalConfig): [number, number, number, number] {
    return [0, 0, 48, 0];
  }

  getButtonLabels(_config?: ModalConfig): string[] {
    return ["확인", "취소"];
  }

  override getInputFieldConfigs(): InputFieldConfig[] {
    return [{ label: "레벨" }];
  }

  show(args: any[]): boolean {
    if (!super.show(args)) {
      return false;
    }

    const config = args[0] as ModalConfig | undefined;
    this.modalConfig = config;

    if (this.inputs?.length > 0) {
      const currentLevel = globalScene.gameData.practiceDummyConfig?.level ?? 1;
      this.inputs[0].text = String(currentLevel);
    }

    this.submitAction = () => {
      this.sanitizeInputs();

      const raw = this.inputs?.[0]?.text?.trim?.() ?? "";
      const level = Number(raw);

      if (!raw.length) {
        this.showPracticeError("레벨을 입력하세요.");
        return false;
      }

      if (!Number.isFinite(level) || level <= 0 || !Number.isInteger(level)) {
        this.showPracticeError("1 이상의 정수를 입력하세요.");
        return false;
      }

      const clampedLevel = Phaser.Math.Clamp(level, 1, 999);

      globalScene.gameData.practiceDummyConfig ??= {};
      globalScene.gameData.practiceDummyConfig.level = clampedLevel;
      globalScene.gameData.saveSystem();

      config?.buttonActions?.[0]?.(clampedLevel);

      return true;
    };

    return true;
  }

  override processInput(button: Button): boolean {
    if (button === Button.CANCEL) {
      this.runCancelAction();
      return true;
    }

    if (button === Button.ACTION) {
      const selectedButtonIndex =
        (this as any).buttonCursor ?? (this as any).cursor ?? 0;

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

  private showPracticeError(message: string): void {
    this.errorMessage = message;
    this.updateErrorText();
    this.getUi().playError();
  }
}