// src/system/trainer-strategy-manager.ts
// Run-scoped state for the player's selected training strategy.
import {
  allTrainerStrategies,
  getTrainerStrategy,
  TrainerStrategyId,
  type TrainerStrategy,
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
    return getTrainerStrategy(this.selectedId)
      ?? allTrainerStrategies[0];
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
    if (!target || waveIndex < target.requiredWave) return false;
    this.selectedId = target.id;
    return true;
  }

  reset(): void {
    this.selectedId = TrainerStrategyId.ROOKIE;
  }

  exportSaveData(): TrainerStrategySaveData {
    return { selectedStrategyId: this.selectedId };
  }

  importSaveData(data?: Partial<TrainerStrategySaveData> | null, waveIndex = 0): void {
    this.reset();
    const id = data?.selectedStrategyId;
    if (id && getTrainerStrategy(id)) {
      this.selectStrategy(id, waveIndex);
    }
  }
}

export const trainerStrategyManager = new TrainerStrategyManager();
