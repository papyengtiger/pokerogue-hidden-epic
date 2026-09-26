import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { GameModes } from "#enums/game-modes";
import { UiMode } from "#enums/ui-mode";
import type { PracticePresetData, Starter } from "#types/save-data";
import { SaveSlotUiMode } from "#ui/handlers/save-slot-select-ui-handler";
import { PracticePresetSlotUiMode } from "#ui/practice-preset-slot-select-ui-handler";
import { RogueShopPhase } from "./rogue-shop-phase";
import { StartRunPhase } from "./start-run-phase";

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

      if (globalScene.gameMode.modeId === GameModes.PRACTICE) {
        globalScene.ui.setMode(UiMode.PRACTICE_PRESET_SLOT, PracticePresetSlotUiMode.SAVE, (slotId: number) => {
          if (slotId === -1) {
            globalScene.phaseManager.toTitleScreen();
            this.end();
            return;
          }

          const preset: PracticePresetData = {
            name: `프리셋 ${slotId + 1}`,

            config: JSON.parse(JSON.stringify(globalScene.gameData.practiceDummyConfig ?? {})),

            rentalModifiers: (globalScene.gameData.practiceRentalModifiers ?? []).map(item => ({
              itemId: item.itemId,
              quantity: item.quantity,
            })),

            starters: (globalScene.gameData.lastSelectedStarters ?? []).map(starter => ({
              ...starter,
              preRunItems: [...(starter.preRunItems ?? [])],
            })),

            timestamp: Date.now(),
          };

          globalScene.gameData.savePracticePreset(slotId, preset);

          globalScene.newArena(globalScene.gameMode.getStartingBiome());
          globalScene.phaseManager.unshiftPhase(new StartRunPhase(starters));

          this.end();
        });

        return;
      }

      globalScene.ui.setMode(UiMode.SAVE_SLOT, SaveSlotUiMode.SAVE, (slotId: number) => {
        // cancel 누르면 타이틀로 복귀
        if (slotId === -1) {
          globalScene.phaseManager.toTitleScreen();
          this.end();
          return;
        }

        globalScene.sessionSlotId = slotId;

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
            onPracticePresetStart: () => {
              globalScene.phaseManager.clearPhaseQueue();

              globalScene.phaseManager.unshiftPhase(new StartRunPhase(globalScene.gameData.lastSelectedStarters));

              this.end();
            },
          }),
        );

        this.end();
      });
    });
  }
}
