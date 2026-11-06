import { globalScene } from "#app/global-scene";
// src/system/trainer-strategy-manager.ts
// Run-scoped state for the player's selected training strategy.
import {
  allTrainerStrategies,
  getTrainerStrategy,
  type TrainerStrategy,
  TrainerStrategyId,
  type TrainingSlotType,
} from "#trainers/trainer-strategy";

export interface TrainerStrategySaveData {
  selectedStrategyId: TrainerStrategyId;
}

export class TrainerStrategyManager {
  private selectedId: TrainerStrategyId = TrainerStrategyId.ROOKIE;

  get currentId(): TrainerStrategyId {
    return this.selectedId;
  }

  get currentStrategy(): TrainerStrategy {
    return getTrainerStrategy(this.selectedId) ?? allTrainerStrategies[0];
  }

  getSlots(): Readonly<Record<TrainingSlotType, number>> {
    return this.currentStrategy.slots;
  }

  getAvailableStrategies(waveIndex: number): TrainerStrategy[] {
    const wave = Math.max(0, Math.floor(waveIndex));
    return allTrainerStrategies.filter(s => s.requiredWave <= wave);
  }

  selectStrategy(id: TrainerStrategyId, waveIndex: number): boolean {
    const target = getTrainerStrategy(id);
    if (!target || waveIndex < target.requiredWave) {
      return false;
    }
    this.selectedId = target.id;
    // Strategy selection must be saved with the current run, not account data.
    if (globalScene.gameData && globalScene.currentBattle) {
      void globalScene.gameData.saveAll(false, true);
    }
    return true;
  }

  reset(): void {
    this.selectedId = TrainerStrategyId.ROOKIE;
  }

  exportSaveData(): TrainerStrategySaveData {
    return { selectedStrategyId: this.selectedId };
  }

  importSaveData(data?: Partial<TrainerStrategySaveData> | null, _waveIndex = 0): void {
    this.reset();
    const id = data?.selectedStrategyId;
    // An existing save can have a strategy unlocked at a later wave.
    // Restoration is not a new selection and must not save again.
    if (id && getTrainerStrategy(id)) {
      this.selectedId = id;
    }
  }
}

export const trainerStrategyManager = new TrainerStrategyManager();
