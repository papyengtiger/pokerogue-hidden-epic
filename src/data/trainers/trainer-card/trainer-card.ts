import { TrainerCardCategory, TrainerCardId } from "#enums/trainer-card-id";
import type { Localizable } from "#types/locales";
import i18next from "i18next";
import { CardMultiplierAttr, HarmonyCardAttr, type CardAttr } from "./card-attrs";

/** imageKey is the Phaser texture key; the PNGs must be loaded by the existing asset loader. */
export class TrainerCard implements Localizable {
  name = "";
  description = "";
  readonly attrs: CardAttr[];

  constructor(
    public readonly id: TrainerCardId,
    public readonly category: TrainerCardCategory,
    public readonly imageKey: string,
    public readonly i18nKey: string,
    attrs: CardAttr[],
  ) {
    this.attrs = attrs;
    this.localize();
  }

  localize(): void {
    this.name = i18next.t(`trainerCard:${this.i18nKey}.name`);
    this.description = i18next.t(`trainerCard:${this.i18nKey}.description`);
  }
}

export const allTrainerCards: readonly TrainerCard[] = [
  new TrainerCard(TrainerCardId.SUPER_EFFECTIVE, TrainerCardCategory.BATTLE,
    "trainer_battle_card", "superEffective", [new CardMultiplierAttr("SUPER_EFFECTIVE_DAMAGE", 1.5)]),
  new TrainerCard(TrainerCardId.SWEET_REWARD, TrainerCardCategory.GROWTH,
    "trainer_growth_card", "sweetReward", [new CardMultiplierAttr("CANDY_REWARD", 1.25)]),
  new TrainerCard(TrainerCardId.GROW_TOGETHER, TrainerCardCategory.FRIEND,
    "trainer_friend_card", "growTogether", [new CardMultiplierAttr("COMPANION_EXP", 1.5)]),
  new TrainerCard(TrainerCardId.HARMONY_OF_ALL, TrainerCardCategory.EPIC,
    "trainer_epic_card", "harmonyOfAll", [new HarmonyCardAttr(1.2)]),
];

export const trainerCardById = new Map(allTrainerCards.map(card => [card.id, card]));
