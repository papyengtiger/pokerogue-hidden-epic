import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { UiMode } from "#enums/ui-mode";
import type { Starter } from "#types/save-data";
import { SaveSlotUiMode } from "#ui/handlers/save-slot-select-ui-handler";
import { RogueShopPhase } from "./rogue-shop-phase";
import { StartRunPhase } from "./start-run-phase";
import { GameModes } from "#enums/game-modes";

export class SelectStarterPhase extends Phase {
  public readonly phaseName = "SelectStarterPhase";

  start() {
    console.log("[PHASE] SelectStarterPhase start", globalScene.gameMode?.modeId);
    super.start();

    globalScene.playBgm("menu");

    globalScene.ui.setMode(UiMode.STARTER_SELECT, (starters: Starter[]) => {
      globalScene.ui.clearText();

      globalScene.gameData.lastSelectedStarters = starters.map(starter => ({
    ...starter,
    preRunItems: [...(starter.preRunItems ?? [])],
  }));

      globalScene.ui.setMode(UiMode.SAVE_SLOT, SaveSlotUiMode.SAVE, (slotId: number) => {
        // cancel 누르면 타이틀로 복귀
        if (slotId === -1) {
          globalScene.phaseManager.toTitleScreen();
          this.end();
          return;
        }

        globalScene.sessionSlotId = slotId;

if (globalScene.gameMode.modeId === GameModes.PRACTICE) {
  globalScene.newArena(globalScene.gameMode.getStartingBiome());
  globalScene.phaseManager.unshiftPhase(new StartRunPhase(starters));
  this.end();
  return;
}

globalScene.phaseManager.unshiftPhase(
  new RogueShopPhase({
    source: "STARTER_SELECT",
    starters,
    onStartRun: () => {
      globalScene.phaseManager.unshiftPhase(new StartRunPhase(starters));
      this.end();
    },
    onCancel: () => {
      globalScene.phaseManager.toTitleScreen();
    },
  }),
);

        this.end();
      });
    });
  }
}