import { Phase } from "#app/phase";
import { globalScene } from "#app/global-scene";
import { UiMode } from "#enums/ui-mode";

export class RogueShopPhase extends Phase {
  public readonly phaseName = "RogueShopPhase";

  start() {
    super.start();

    globalScene.playBgm("menu");

    globalScene.ui.setMode(UiMode.ROGUE_SHOP, {
      onExit: () => {
        globalScene.phaseManager.toTitleScreen();
        this.end();
      },
      source: "TITLE",
      limitedMode: false,
      allowShop: true,
      allowBank: true,
      allowStorage: true,
      allowPreRunPurchase: true,
      allowRewardUse: false,
      allowSendItems: false,
    });
  }
}