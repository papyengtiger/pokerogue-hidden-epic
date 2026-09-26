import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";

export class BerryPlanterLapsePhase extends Phase {
  public readonly phaseName = "BerryPlanterLapsePhase";

  start(): void {
    super.start();

    const slots = globalScene.gameData.berryPlanterSlots ?? [];
    let changed = false;

    for (const slot of slots) {
      if (slot.state === "EMPTY" || slot.state === "READY" || slot.growthWaves == null) {
        continue;
      }

      const before = slot.growthWaves;

      slot.growthWaves = Math.max(slot.growthWaves - 1, 0);

      if (slot.growthWaves <= 0) {
        slot.growthStage = 4;
        slot.state = "READY";
      } else if (slot.growthWaves <= 5) {
        slot.growthStage = 3;
        slot.state = "GROWING";
      } else if (slot.growthWaves <= 10) {
        slot.growthStage = 2;
        slot.state = "GROWING";
      } else if (slot.growthWaves <= 15) {
        slot.growthStage = 1;
        slot.state = "GROWING";
      } else {
        slot.growthStage = 0;
        slot.state = "PLANTED";
      }

      console.log("[BERRY_PLANTER_LAPSE]", {
        cropId: slot.cropId,
        before,
        after: slot.growthWaves,
        stage: slot.growthStage,
        state: slot.state,
      });

      changed = true;
    }

    if (changed) {
      void globalScene.gameData.saveSystem();
    }

    this.end();
  }
}
