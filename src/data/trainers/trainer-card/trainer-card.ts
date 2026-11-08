import { TrainerCardCategory, TrainerCardId } from "#enums/trainer-card-id";
import { ModifierTier } from "#enums/modifier-tier";
import type { Localizable } from "#types/locales";
import i18next from "i18next";
import { type CardAttr, CardMultiplierAttr, HarmonyCardAttr, LevelUpHealCardAttr, MarkExpCardAttr } from "./card-attrs";

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
    public readonly tier: ModifierTier = ModifierTier.COMMON,
  ) {
    this.attrs = attrs;
    this.localize();
  }

  localize(): void {
    const fallback: Record<string, { name: string; description: string }> = {
      joyOfGrowth: { name: "성장의 기쁨", description: "레벨업할 때마다 최대 HP의 10%를 회복한다. 기절한 포켓몬에게는 적용되지 않는다." },
      bettorsInstinct: { name: "승부사의 직감", description: "아군 공격 기술의 급소율이 1랭크 상승한다." },
      unyieldingSpirit: { name: "불굴의 투지", description: "HP 절반 이하일 때 공격 기술의 피해가 1.3배가 된다." },
      markOfGrowth: { name: "성장의 증표", description: "포켓몬 자신의 증표 등급에 따라 획득 경험치가 5~25% 증가한다. 미스터리 증표는 제외된다." },
      steadfastBond: { name: "굳건한 유대", description: "상태이상에 걸린 아군 포켓몬이 공격 기술로 받는 피해가 20% 감소한다." },
      miracleOfFriendship: { name: "우정의 기적", description: "교체로 등장한 아군 포켓몬의 HP를 최대 HP의 10% 회복한다. 최초 출전 및 기절한 포켓몬은 제외한다." },
      fatefulChoice: { name: "운명의 선택", description: "일반 아이템 보상의 등급 상승 성공 확률이 1.25배가 된다." },
    };
    const text = fallback[this.i18nKey];
    this.name = i18next.t(`trainerCard:${this.i18nKey}.name`, { defaultValue: text?.name ?? this.i18nKey });
    this.description = i18next.t(`trainerCard:${this.i18nKey}.description`, { defaultValue: text?.description ?? "" });
  }
}

export const allTrainerCards: readonly TrainerCard[] = [
  // Existing four cards -- preserved.
  new TrainerCard(TrainerCardId.SUPER_EFFECTIVE, TrainerCardCategory.BATTLE, "trainer_battle_card", "superEffective", [
    new CardMultiplierAttr("SUPER_EFFECTIVE_DAMAGE", 1.5),
  ], ModifierTier.ULTRA),
  new TrainerCard(TrainerCardId.SWEET_REWARD, TrainerCardCategory.GROWTH, "trainer_growth_card", "sweetReward", [
    new CardMultiplierAttr("CANDY_REWARD", 1.25),
  ], ModifierTier.GREAT),
  new TrainerCard(TrainerCardId.GROW_TOGETHER, TrainerCardCategory.FRIEND, "trainer_friend_card", "growTogether", [
    new CardMultiplierAttr("COMPANION_EXP", 1.5),
  ], ModifierTier.GREAT),
  new TrainerCard(TrainerCardId.HARMONY_OF_ALL, TrainerCardCategory.EPIC, "trainer_epic_card", "harmonyOfAll", [
    new HarmonyCardAttr(1.2),
  ], ModifierTier.MASTER),

  // Battle
  new TrainerCard(TrainerCardId.PP_SAVER, TrainerCardCategory.BATTLE, "trainer_battle_card", "ppSaver", [
    new CardMultiplierAttr("PP_SAVE_CHANCE", 0.5),
  ], ModifierTier.GREAT),
  new TrainerCard(
    TrainerCardId.NOT_VERY_EFFECTIVE_POWER,
    TrainerCardCategory.BATTLE,
    "trainer_battle_card",
    "notVeryEffectivePower",
    [new CardMultiplierAttr("NOT_VERY_EFFECTIVE_DAMAGE", 2), new CardMultiplierAttr("QUARTER_EFFECTIVE_DAMAGE", 4)],
    ModifierTier.ROGUE,
  ),

  // Battle: new cards
  new TrainerCard(TrainerCardId.BETTORS_INSTINCT, TrainerCardCategory.BATTLE, "trainer_battle_card", "bettorsInstinct", [
    new CardMultiplierAttr("CRIT_STAGE_BONUS", 1),
  ], ModifierTier.GREAT),
  new TrainerCard(TrainerCardId.UNYIELDING_SPIRIT, TrainerCardCategory.BATTLE, "trainer_battle_card", "unyieldingSpirit", [
    new CardMultiplierAttr("LOW_HP_ATTACK_DAMAGE", 1.3),
  ], ModifierTier.ROGUE),

  // Growth
  new TrainerCard(TrainerCardId.SMALL_PROFIT, TrainerCardCategory.GROWTH, "trainer_growth_card", "smallProfit", [
    new CardMultiplierAttr("EXP_GAIN", 1.25),
    new CardMultiplierAttr("GOLD_GAIN", 1.25),
    new CardMultiplierAttr("RP_GAIN", 1.25),
  ], ModifierTier.ULTRA),
  new TrainerCard(TrainerCardId.DILIGENT, TrainerCardCategory.GROWTH, "trainer_growth_card", "diligent", [
    new CardMultiplierAttr("EV_GAIN", 1.25),
  ], ModifierTier.GREAT),

  // Growth: newly added cards; retain the sixth constructor argument (tier).
  new TrainerCard(TrainerCardId.JOY_OF_GROWTH, TrainerCardCategory.GROWTH, "trainer_growth_card", "joyOfGrowth", [
    new LevelUpHealCardAttr(0.1),
  ], ModifierTier.ULTRA),
  new TrainerCard(TrainerCardId.MARK_OF_GROWTH, TrainerCardCategory.GROWTH, "trainer_growth_card", "markOfGrowth", [
    new MarkExpCardAttr(),
  ], ModifierTier.ULTRA),

  // Friend
  new TrainerCard(TrainerCardId.WE_ARE_FRIENDS, TrainerCardCategory.FRIEND, "trainer_friend_card", "weAreFriends", [
    new CardMultiplierAttr("CATCH_RATE", 1.25),
  ], ModifierTier.ULTRA),
  new TrainerCard(TrainerCardId.BEST_LOYALTY, TrainerCardCategory.FRIEND, "trainer_friend_card", "bestLoyalty", [
    new CardMultiplierAttr("INCOMING_DAMAGE", 0.75),
  ], ModifierTier.MASTER),

  // Friend: newly added cards.
  new TrainerCard(TrainerCardId.STEADFAST_BOND, TrainerCardCategory.FRIEND, "trainer_friend_card", "steadfastBond", [
    new CardMultiplierAttr("STATUS_DAMAGE_REDUCTION", 0.8),
  ], ModifierTier.ROGUE),
  new TrainerCard(TrainerCardId.MIRACLE_OF_FRIENDSHIP, TrainerCardCategory.FRIEND, "trainer_friend_card", "miracleOfFriendship", [
    new CardMultiplierAttr("SWITCH_IN_HEAL_FRACTION", 1.1),
  ], ModifierTier.ULTRA),

  // Epic: newly added card.
  new TrainerCard(TrainerCardId.FATEFUL_CHOICE, TrainerCardCategory.EPIC, "trainer_epic_card", "fatefulChoice", [
    new CardMultiplierAttr("ITEM_TIER_UPGRADE_CHANCE", 1.25),
  ], ModifierTier.MASTER),

  // Epic
  new TrainerCard(TrainerCardId.CAPTURE_TIME, TrainerCardCategory.EPIC, "trainer_epic_card", "captureTime", [
    new CardMultiplierAttr("BALL_REWARD_WEIGHT", 1.5),
  ], ModifierTier.ROGUE),
  new TrainerCard(TrainerCardId.ONE_MORE_ONE, TrainerCardCategory.EPIC, "trainer_epic_card", "oneMoreOne", [
    new CardMultiplierAttr("EXTRA_ITEM_CHOICE", 1),
  ], ModifierTier.MASTER),
  new TrainerCard(TrainerCardId.FRUGAL, TrainerCardCategory.EPIC, "trainer_epic_card", "frugal", [
    new CardMultiplierAttr("SHOP_PRICE", 0.9),
    new CardMultiplierAttr("HEALING_ITEM_PRICE", 0.9),
    new CardMultiplierAttr("REROLL_PRICE", 0.9),
  ], ModifierTier.ROGUE),
];

export const trainerCardById = new Map(allTrainerCards.map(card => [card.id, card]));
