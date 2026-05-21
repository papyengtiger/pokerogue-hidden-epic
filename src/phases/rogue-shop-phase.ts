import { Phase } from "#app/phase";
import { globalScene } from "#app/global-scene";
import { UiMode } from "#enums/ui-mode";
import type { Starter } from "#types/save-data";
import { SelectStarterPhase } from "./select-starter-phase";

type RogueShopPhaseSource = "TITLE" | "STARTER_SELECT";

type RogueShopPhaseOptions = {
  source?: RogueShopPhaseSource;
  starters?: Starter[];
  onStartRun?: () => void;
  onCancel?: () => void;
  onPracticeStart?: () => void;
};

export class RogueShopPhase extends Phase {
  public readonly phaseName = "RogueShopPhase";

  constructor(private options: RogueShopPhaseOptions = {}) {
    super();
  }

  start() {
  super.start();

  // 스타팅 선택 단계에서 로그상점을 새로 열면 이전 런 예약분 초기화
  if (this.options.source === "STARTER_SELECT") {
    (globalScene.gameData as any).pendingRunItems = [];
  }

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

    globalScene.ui.clearText();
    globalScene.ui.setMode(UiMode.MESSAGE);

    this.options.onStartRun?.();
  },

  onExit: () => {
    console.log("[RogueShopPhase] onExit");

    globalScene.ui.clearText();
    globalScene.ui.setMode(UiMode.MESSAGE);

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

  onPracticeStart: () => {
    console.log("[RogueShopPhase] onPracticeStart");

    globalScene.ui.clearText();
    globalScene.ui.setMode(UiMode.MESSAGE);

    if (this.options.onPracticeStart) {
      this.options.onPracticeStart();
    } else {
      globalScene.phaseManager.clearPhaseQueue();
      globalScene.phaseManager.pushNew("SelectStarterPhase");
    }

    this.end();
  },
});
}
}