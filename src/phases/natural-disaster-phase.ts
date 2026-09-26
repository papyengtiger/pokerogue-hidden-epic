import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { naturalDisasterManager } from "#data/natural-disaster/natural-disaster-manager";
import { UiMode } from "#enums/ui-mode";

export class NaturalDisasterPhase extends Phase {
  public readonly phaseName = "NaturalDisasterPhase";

  public override start(): void {
    super.start();

    // 이번 층의 자연재해 발생 판정
    naturalDisasterManager.prepareDisaster();

    const disaster = naturalDisasterManager.getPendingDisaster();

    if (!disaster) {
      this.end();
      return;
    }

    void this.activateDisaster();
  }

  private async activateDisaster(): Promise<void> {
    await globalScene.ui.setMode(UiMode.MESSAGE);

    try {
      globalScene.ui.showText(
        "자연재해가 발생했다!",
        null,
        () => {
          void this.applyDisaster();
        },
        null,
        true,
      );
    } catch (error) {
      console.error("[NATURAL_DISASTER_PHASE_ERROR]", error);

      naturalDisasterManager.clearPendingDisaster();
      this.end();
    }
  }

  private async applyDisaster(): Promise<void> {
    try {
      await naturalDisasterManager.activatePreparedDisaster();
    } catch (error) {
      console.error("[NATURAL_DISASTER_ACTIVATE_ERROR]", error);
    } finally {
      naturalDisasterManager.clearPendingDisaster();
      this.end();
    }
  }
}
