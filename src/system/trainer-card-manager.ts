import { TrainerCardCategory, type TrainerCardId } from "#enums/trainer-card-id";
import { trainerStrategyManager } from "#system/trainer-strategy-manager";
import { CardMultiplierAttr, type CardNumericKind, HarmonyCardAttr } from "#trainers/trainer-card/card-attrs";
import { trainerCardById } from "#trainers/trainer-card/trainer-card";
import { TrainingSlotType } from "#trainers/trainer-strategy";

export interface TrainerCardSaveData {
  owned: TrainerCardId[];
  equipped: (TrainerCardId | null)[];
}

/** Slot types are intentionally separate from cards so EPIC works as a wildcard. */
export class TrainerCardManager {
  private owned = new Set<TrainerCardId>();
  private slotTypes: TrainerCardCategory[] = [];
  private equipped: (TrainerCardId | null)[] = [];
  /** Saved equipment may arrive before strategy slots are initialized. */
  private pendingEquipped: (TrainerCardId | null)[] | null = null;

  configureSlots(types: readonly TrainerCardCategory[]): void {
    const previous = this.pendingEquipped ?? this.equipped;
    this.slotTypes = [...types];
    this.equipped = this.validateEquipped(previous);
    if (types.length > 0) {
      this.pendingEquipped = null;
    }
  }

  private validateEquipped(saved: readonly (TrainerCardId | null)[]): (TrainerCardId | null)[] {
    const seen = new Set<TrainerCardId>();
    return this.slotTypes.map((slot, index) => {
      const id = saved[index];
      if (!id || seen.has(id) || !this.owned.has(id)) {
        return null;
      }
      const card = trainerCardById.get(id);
      if (!card || (slot !== TrainerCardCategory.EPIC && slot !== card.category)) {
        return null;
      }
      seen.add(id);
      return id;
    });
  }

  syncSlotsWithStrategy(): void {
    const strategySlots = trainerStrategyManager.getSlots();

    const types: TrainerCardCategory[] = [
      ...new Array(strategySlots[TrainingSlotType.BATTLE]).fill(TrainerCardCategory.BATTLE),
      ...new Array(strategySlots[TrainingSlotType.GROWTH]).fill(TrainerCardCategory.GROWTH),
      ...new Array(strategySlots[TrainingSlotType.FRIEND]).fill(TrainerCardCategory.FRIEND),
      ...new Array(strategySlots[TrainingSlotType.EPIC]).fill(TrainerCardCategory.EPIC),
    ];

    this.configureSlots(types);
  }

  /** Starting a NEW run erases all run-owned cards and slot equipment. */
  resetRun(): void {
    this.owned.clear();
    this.pendingEquipped = null;
    this.syncSlotsWithStrategy();
    this.equipped = this.slotTypes.map(() => null);
  }

  grant(id: TrainerCardId): boolean {
    if (!trainerCardById.has(id)) {
      return false;
    }
    if (this.owned.has(id)) {
      return true;
    }
    this.owned.add(id);
    return true;
  }

  has(id: TrainerCardId): boolean {
    return this.owned.has(id);
  }
  isEquipped(id: TrainerCardId): boolean {
    return this.equipped.includes(id);
  }
  getSlotTypes(): readonly TrainerCardCategory[] {
    return [...this.slotTypes];
  }
  getEquipped(): readonly (TrainerCardId | null)[] {
    return [...this.equipped];
  }

  equip(slotIndex: number, id: TrainerCardId): boolean {
    const slot = this.slotTypes[slotIndex];
    const card = trainerCardById.get(id);
    if (!slot || !card || !this.owned.has(id)) {
      return false;
    }
    if (slot !== TrainerCardCategory.EPIC && slot !== card.category) {
      return false;
    }
    if (this.isEquipped(id)) {
      return false; // no double-equipping the same card
    }
    this.equipped[slotIndex] = id;
    return true;
  }

  unequip(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.equipped.length) {
      return false;
    }
    this.equipped[slotIndex] = null;
    return true;
  }

  /** Returns a card-only multiplier. Apply once per reward/damage calculation. */
  getMultiplier(kind: CardNumericKind): number {
    let multiplier = 1;
    for (const id of this.equipped) {
      const card = id && trainerCardById.get(id);
      for (const attr of card?.attrs ?? []) {
        if (attr instanceof CardMultiplierAttr && attr.kind === kind) {
          multiplier *= attr.multiplier;
        }
      }
    }
    const harmony = this.equipped.some(
      id => (id && trainerCardById.get(id)?.attrs.some(attr => attr instanceof HarmonyCardAttr)) || false,
    );
    return harmony ? 1 + (multiplier - 1) * 1.2 : multiplier;
  }

  exportSaveData(): TrainerCardSaveData {
    return { owned: [...this.owned], equipped: [...(this.pendingEquipped ?? this.equipped)] };
  }

  /** Replace in-memory card state with the selected session's state. */
  importSaveData(data?: Partial<TrainerCardSaveData> | null): void {
    this.owned = new Set((Array.isArray(data?.owned) ? data.owned : []).filter(id => trainerCardById.has(id)));
    this.pendingEquipped = Array.isArray(data?.equipped) ? [...data.equipped] : [];
    this.syncSlotsWithStrategy();
  }
}

export const trainerCardManager = new TrainerCardManager();
