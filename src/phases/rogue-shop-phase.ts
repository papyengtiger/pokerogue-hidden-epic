import { Phase } from "#app/phase";
import { globalScene } from "#app/global-scene";
import { UiMode } from "#enums/ui-mode";
import type { Starter } from "#types/save-data";

type RogueShopPhaseSource = "TITLE" | "STARTER_SELECT";

type RogueShopPhaseOptions = {
  source?: RogueShopPhaseSource;
  starters?: Starter[];
  onStartRun?: () => void;
  onCancel?: () => void;
};

export class RogueShopPhase extends Phase {
  public readonly phaseName = "RogueShopPhase";

  constructor(private options: RogueShopPhaseOptions = {}) {
    super();
  }

  start() {
    super.start();
    console.log("[RogueShopPhase] start");

    globalScene.playBgm("menu");

    globalScene.ui.setMode(UiMode.ROGUE_SHOP, {
      source: this.options.source ?? "TITLE",
      starters: this.options.starters,
      limitedMode: false,
      allowShop: true,
      allowBank: true,
      allowStorage: true,
      allowPreRunPurchase: true,
      allowRewardUse: false,
      allowSendItems: false,

      onStartRun: () => {
        console.log("[RogueShopPhase] onStartRun");
        this.options.onStartRun?.();
        // this.end(); 제거
      },

      onExit: () => {
        console.log("[RogueShopPhase] onExit");

        if (this.options.source === "STARTER_SELECT") {
          this.options.onCancel?.();
        } else {
          if (this.options.onCancel) {
            this.options.onCancel();
          } else {
            globalScene.phaseManager.toTitleScreen();
          }
        }

        this.end();
      },
    });
  }
}