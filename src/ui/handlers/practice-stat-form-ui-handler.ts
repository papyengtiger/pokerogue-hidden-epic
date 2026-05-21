import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { FormModalUiHandler } from "#ui/form-modal-ui-handler";
import type { InputFieldConfig, ModalConfig } from "#ui/form-modal-ui-handler";

export class PracticeStatFormUiHandler extends FormModalUiHandler {
  private modalConfig?: ModalConfig;

  getModalTitle(_config?: ModalConfig): string {
    return "능력치를 입력하시오";
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
    return [
      { label: "HP" },
      { label: "공격" },
      { label: "방어" },
      { label: "특공" },
      { label: "특방" },
      { label: "속도" },
    ];
  }

  show(args: any[]): boolean {
    if (!super.show(args)) {
      return false;
    }

    const config = args[0] as ModalConfig | undefined;
    this.modalConfig = config;

    const stats = globalScene.gameData.practiceDummyConfig?.baseStats ?? {
      hp: 999,
      atk: 255,
      def: 255,
      spa: 255,
      spd: 255,
      spe: 255,
    };

    const values = [
      stats.hp,
      stats.atk,
      stats.def,
      stats.spa,
      stats.spd,
      stats.spe,
    ];

    this.submitAction = () => {
      this.sanitizeInputs();

      const rawValues = this.inputs?.map(input => input.text?.trim?.() ?? "") ?? [];

      if (rawValues.some(v => !v.length)) {
        this.showPracticeError("모든 능력치를 입력하세요.");
        return false;
      }

      const numbers = rawValues.map(v => Number(v));

      if (numbers.some(n => !Number.isFinite(n) || n <= 0 || !Number.isInteger(n))) {
        this.showPracticeError("1 이상의 정수만 입력하세요.");
        return false;
      }

      const [hp, atk, def, spa, spd, spe] = numbers.map(n =>
        Phaser.Math.Clamp(n, 1, 999)
      );

      globalScene.gameData.practiceDummyConfig ??= {};
      globalScene.gameData.practiceDummyConfig.baseStats = {
        hp,
        atk,
        def,
        spa,
        spd,
        spe,
      };

      globalScene.gameData.saveSystem();

      config?.buttonActions?.[0]?.({
        hp,
        atk,
        def,
        spa,
        spd,
        spe,
      });

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