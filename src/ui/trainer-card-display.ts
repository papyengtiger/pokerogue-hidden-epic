/** Shared trainer-card naming and colors for card acquisition, inventory, and loadout UI. */
import { TrainerCardCategory } from "#enums/trainer-card-id";

const CATEGORY_NAMES: Record<TrainerCardCategory, string> = {
  [TrainerCardCategory.BATTLE]: "배틀",
  [TrainerCardCategory.GROWTH]: "육성",
  [TrainerCardCategory.FRIEND]: "프렌드",
  [TrainerCardCategory.EPIC]: "에픽",
};

// Brightened for readability against the game's dark window background.
const CATEGORY_COLORS: Record<TrainerCardCategory, number> = {
  [TrainerCardCategory.BATTLE]: 0xc44545,
  [TrainerCardCategory.GROWTH]: 0x59cfff,
  [TrainerCardCategory.FRIEND]: 0x32c76a,
  [TrainerCardCategory.EPIC]: 0x9b59d0,
};

export function getTrainerCardCategoryName(category: TrainerCardCategory): string {
  return CATEGORY_NAMES[category] ?? String(category);
}

export function getTrainerCardCategoryColor(category: TrainerCardCategory): number {
  return CATEGORY_COLORS[category] ?? 0xffffff;
}

export function formatTrainerCardLabel(card: { name: string; category: TrainerCardCategory }): string {
  return `${card.name}(${getTrainerCardCategoryName(card.category)})`;
}

export function applyTrainerCardCategoryColor(
  text: Phaser.GameObjects.Text,
  category: TrainerCardCategory,
): Phaser.GameObjects.Text {
  const color = getTrainerCardCategoryColor(category);
  return text.setColor(`#${color.toString(16).padStart(6, "0")}`);
}
