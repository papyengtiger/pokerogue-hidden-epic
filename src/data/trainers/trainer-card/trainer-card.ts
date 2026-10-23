import { TrainerCardCategory, TrainerCardId } from "#enums/trainer-card-id";
import type { Localizable } from "#types/locales";
import i18next from "i18next";
import { type CardAttr, CardMultiplierAttr, HarmonyCardAttr } from "./card-attrs";

/** imageKey is a Phaser texture key; its PNG must be loaded separately. */
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
  // Existing four cards -- preserved.
  new TrainerCard(TrainerCardId.SUPER_EFFECTIVE, TrainerCardCategory.BATTLE, "trainer_battle_card", "superEffective", [
    new CardMultiplierAttr("SUPER_EFFECTIVE_DAMAGE", 1.5),
  ]),
  new TrainerCard(TrainerCardId.SWEET_REWARD, TrainerCardCategory.GROWTH, "trainer_growth_card", "sweetReward", [
    new CardMultiplierAttr("CANDY_REWARD", 1.25),
  ]),
  new TrainerCard(TrainerCardId.GROW_TOGETHER, TrainerCardCategory.FRIEND, "trainer_friend_card", "growTogether", [
    new CardMultiplierAttr("COMPANION_EXP", 1.5),
  ]),
  new TrainerCard(TrainerCardId.HARMONY_OF_ALL, TrainerCardCategory.EPIC, "trainer_epic_card", "harmonyOfAll", [
    new HarmonyCardAttr(1.2),
  ]),

  // Battle
  new TrainerCard(TrainerCardId.PP_SAVER, TrainerCardCategory.BATTLE, "trainer_battle_card", "ppSaver", [
    new CardMultiplierAttr("PP_SAVE_CHANCE", 0.5),
  ]),
  new TrainerCard(
    TrainerCardId.NOT_VERY_EFFECTIVE_POWER,
    TrainerCardCategory.BATTLE,
    "trainer_battle_card",
    "notVeryEffectivePower",
    [new CardMultiplierAttr("NOT_VERY_EFFECTIVE_DAMAGE", 2), new CardMultiplierAttr("QUARTER_EFFECTIVE_DAMAGE", 4)],
  ),

  // Growth
  new TrainerCard(TrainerCardId.SMALL_PROFIT, TrainerCardCategory.GROWTH, "trainer_growth_card", "smallProfit", [
    new CardMultiplierAttr("EXP_GAIN", 1.25),
    new CardMultiplierAttr("GOLD_GAIN", 1.25),
    new CardMultiplierAttr("RP_GAIN", 1.25),
  ]),
  new TrainerCard(TrainerCardId.DILIGENT, TrainerCardCategory.GROWTH, "trainer_growth_card", "diligent", [
    new CardMultiplierAttr("EV_GAIN", 1.25),
  ]),

  // Friend
  new TrainerCard(TrainerCardId.WE_ARE_FRIENDS, TrainerCardCategory.FRIEND, "trainer_friend_card", "weAreFriends", [
    new CardMultiplierAttr("CATCH_RATE", 1.25),
  ]),
  new TrainerCard(TrainerCardId.BEST_LOYALTY, TrainerCardCategory.FRIEND, "trainer_friend_card", "bestLoyalty", [
    new CardMultiplierAttr("INCOMING_DAMAGE", 0.75),
  ]),

  // Epic
  new TrainerCard(TrainerCardId.ONE_MORE_ONE, TrainerCardCategory.EPIC, "trainer_epic_card", "oneMoreOne", [
    new CardMultiplierAttr("EXTRA_ITEM_CHOICE", 1),
  ]),
  new TrainerCard(TrainerCardId.FRUGAL, TrainerCardCategory.EPIC, "trainer_epic_card", "frugal", [
    new CardMultiplierAttr("SHOP_PRICE", 0.9),
    new CardMultiplierAttr("HEALING_ITEM_PRICE", 0.9),
    new CardMultiplierAttr("REROLL_PRICE", 0.9),
  ]),
];

export const trainerCardById = new Map(allTrainerCards.map(card => [card.id, card]));
