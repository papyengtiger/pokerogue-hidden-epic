import { TrainerCardCategory, TrainerCardId } from "#enums/trainer-card-id";
import { CardMultiplierAttr, HarmonyCardAttr, type CardNumericKind } from "#trainers/trainer-card/card-attrs";
import { trainerCardById } from "#trainers/trainer-card/trainer-card";
import { trainerStrategyManager } from "#system/trainer-strategy-manager";
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

  configureSlots(types: readonly TrainerCardCategory[]): void {
    this.slotTypes = [...types];
    this.equipped = types.map((type, index) => {
      const id = this.equipped[index];
      const card = id && trainerCardById.get(id);
      return card && (type === TrainerCardCategory.EPIC || card.category === type) ? id : null;
    });
  }

  syncSlotsWithStrategy(): void {
  const strategySlots = trainerStrategyManager.getSlots();

  const types: TrainerCardCategory[] = [
    ...Array(strategySlots[TrainingSlotType.BATTLE]).fill(
      TrainerCardCategory.BATTLE,
    ),
    ...Array(strategySlots[TrainingSlotType.GROWTH]).fill(
      TrainerCardCategory.GROWTH,
    ),
    ...Array(strategySlots[TrainingSlotType.FRIEND]).fill(
      TrainerCardCategory.FRIEND,
    ),
    ...Array(strategySlots[TrainingSlotType.EPIC]).fill(
      TrainerCardCategory.EPIC,
    ),
  ];

  this.configureSlots(types);
}

  grant(id: TrainerCardId): boolean {
    if (!trainerCardById.has(id)) return false;
    this.owned.add(id);
    return true;
  }

  has(id: TrainerCardId): boolean { return this.owned.has(id); }
  isEquipped(id: TrainerCardId): boolean { return this.equipped.includes(id); }
  getSlotTypes(): readonly TrainerCardCategory[] { return [...this.slotTypes]; }
  getEquipped(): readonly (TrainerCardId | null)[] { return [...this.equipped]; }

  equip(slotIndex: number, id: TrainerCardId): boolean {
    const slot = this.slotTypes[slotIndex];
    const card = trainerCardById.get(id);
    if (!slot || !card || !this.owned.has(id)) return false;
    if (slot !== TrainerCardCategory.EPIC && slot !== card.category) return false;
    if (this.isEquipped(id)) return false; // no double-equipping the same card
    this.equipped[slotIndex] = id;
    return true;
  }

  unequip(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.equipped.length) return false;
    this.equipped[slotIndex] = null;
    return true;
  }

  /** Returns a card-only multiplier. Apply once per reward/damage calculation. */
  getMultiplier(kind: CardNumericKind): number {
    let multiplier = 1;
    for (const id of this.equipped) {
      const card = id && trainerCardById.get(id);
      for (const attr of card?.attrs ?? []) {
        if (attr instanceof CardMultiplierAttr && attr.kind === kind) multiplier *= attr.multiplier;
      }
    }
    const harmony = this.equipped.some(id =>
      (id && trainerCardById.get(id)?.attrs.some(attr => attr instanceof HarmonyCardAttr)) || false,
    );
    return harmony ? 1 + (multiplier - 1) * 1.2 : multiplier;
  }

  exportSaveData(): TrainerCardSaveData {
    return { owned: [...this.owned], equipped: [...this.equipped] };
  }

  importSaveData(data?: Partial<TrainerCardSaveData>): void {
    this.owned = new Set((data?.owned ?? []).filter(id => trainerCardById.has(id)));
    this.equipped = this.slotTypes.map((slot, i) => {
      const id = data?.equipped?.[i];
      const card = id && trainerCardById.get(id);
      if (!id || !this.owned.has(id) || !card) return null;
      if (slot !== TrainerCardCategory.EPIC && slot !== card.category) return null;
      if (data?.equipped?.indexOf(id) !== i) return null;
      return id;
    });
  }
}

export const trainerCardManager = new TrainerCardManager();
