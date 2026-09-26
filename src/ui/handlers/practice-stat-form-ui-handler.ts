import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import type { InputFieldConfig, ModalConfig } from "#ui/form-modal-ui-handler";
import { FormModalUiHandler } from "#ui/form-modal-ui-handler";

export class PracticeStatFormUiHandler extends FormModalUiHandler {
  private modalConfig?: ModalConfig;
  private dummyKey: "dummy1" | "dummy2" = "dummy1";

  getModalTitle(_config?: ModalConfig): string {
    return this.dummyKey === "dummy1" ? "대타1 능력치를 입력하시오" : "대타2 능력치를 입력하시오";
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
    const config = args[0] as ModalConfig | undefined;
    this.modalConfig = config;
    this.dummyKey = config?.dummyKey ?? "dummy1";

    if (!super.show(args)) {
      return false;
    }

    const rootCfg = (globalScene.gameData.practiceDummyConfig ??= {});
    rootCfg.dummy1 ??= {};
    rootCfg.dummy2 ??= {};

    const stats = rootCfg[this.dummyKey]?.baseStats
      ?? rootCfg.baseStats ?? {
        hp: 999,
        atk: 255,
        def: 255,
        spa: 255,
        spd: 255,
        spe: 255,
      };

    const values = [stats.hp, stats.atk, stats.def, stats.spa, stats.spd, stats.spe];

    for (let i = 0; i < values.length; i++) {
      if (this.inputs?.[i]) {
        this.inputs[i].text = String(values[i]);
      }
    }

    this.submitAction = () => {
      this.sanitizeInputs();

      const rawValues = this.inputs?.map(input => input.text?.trim?.() ?? "") ?? [];

      if (rawValues.some(v => v.length === 0)) {
        this.showPracticeError("모든 능력치를 입력하세요.");
        return false;
      }

      const numbers = rawValues.map(v => Number(v));

      if (numbers.some(n => !Number.isFinite(n) || n <= 0 || !Number.isInteger(n))) {
        this.showPracticeError("1 이상의 정수만 입력하세요.");
        return false;
      }

      const [hp, atk, def, spa, spd, spe] = numbers.map(n => Phaser.Math.Clamp(n, 1, 999));

      const cfg = (globalScene.gameData.practiceDummyConfig ??= {});
      cfg.dummy1 ??= {};
      cfg.dummy2 ??= {};

      cfg[this.dummyKey]!.baseStats = {
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
      const selectedButtonIndex = (this as any).buttonCursor ?? (this as any).cursor ?? 0;

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
