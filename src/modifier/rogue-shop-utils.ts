import { VoucherType } from "#system/voucher";
import { ModifierTier } from "#enums/modifier-tier";
import { ModifierTypeOption, type WeightedModifierType } from "#modifiers/modifier-type";
import { modifierPool, wildModifierPool, dailyStarterModifierPool } from "#modifiers/modifier-pools";
import type { RogueShopListing } from "#ui/rogue-shop-ui-handler";
import { modifierTypes } from "#data/data-lists";

export type RogueShopPurchaseMode = "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT";

export function getVoucherShopTier(v: VoucherType): ModifierTier {
  switch (v) {
    case VoucherType.REGULAR:
      return ModifierTier.GREAT;
    case VoucherType.PLUS:
      return ModifierTier.ROGUE;
    case VoucherType.PREMIUM:
      return ModifierTier.MASTER;
    case VoucherType.GOLDEN:
      return ModifierTier.LUXURY;
    default:
      return ModifierTier.GREAT;
  }
}

export const ROGUE_SHOP_TIER_PRICES: Record<ModifierTier, number> = {
  [ModifierTier.COMMON]: 50,
  [ModifierTier.GREAT]: 150,
  [ModifierTier.ULTRA]: 300,
  [ModifierTier.ROGUE]: 600,
  [ModifierTier.MASTER]: 2500,
  [ModifierTier.LUXURY]: 5000,
};

function createListing(
  id: string,
  tier: ModifierTier,
  option: ModifierTypeOption,
  purchaseMode: RogueShopPurchaseMode,
  stock = 99,
): RogueShopListing {
  return {
    id,
    tier,
    priceRp: ROGUE_SHOP_TIER_PRICES[tier],
    stock,
    purchaseMode,
    option,
  };
}

function shouldExcludeFromRogueShop(id: string): boolean {
  return [
    // 회복 아이템류
    "POTION",
    "SUPER_POTION",
    "HYPER_POTION",
    "MAX_POTION",
    "FULL_RESTORE",
    "FULL_HEAL",
    "REVIVE",
    "MAX_REVIVE",
    "SACRED_ASH",

    // PP 회복류
    "ETHER",
    "MAX_ETHER",
    "ELIXIR",
    "MAX_ELIXIR",
    "PP_UP",
    "Z_DRINK",
    "MAX_DRINK",

    // 열매/즉석 소모성 회복류 성격이 강한 것들은 필요시 추가
    "BERRY",
  ].includes(id);
}

function inferPurchaseMode(id: string): RogueShopPurchaseMode {
  if (
    [
      "MEGA_BRACELET",
      "DYNAMAX_BAND",
      "Z_RING",
      "Z_POWER_RING",
      "WISHING_STAR",
      "LOCK_CAPSULE",
      "MAP",
      "DNA_SPLICERS",
    ].includes(id)
  ) {
    return "TRAINER_LOADOUT";
  }

  if (
    [
      "KINGS_ROCK",
      "POWER_HERB",
      "WHITE_HERB",
      "MENTAL_HERB",
      "FOCUS_BAND",
      "QUICK_CLAW",
      "LUCKY_EGG",
      "GOLDEN_EGG",
      "LEFTOVERS",
      "SHELL_BELL",
      "LIFE_ORB",
      "ABILITY_SHIELD",
      "MOLD_BREAKER_BRACER",
      "GOLDEN_INCENSE",
      "MUSCLE_BAND",
      "WISE_GLASSES",
      "CLEAR_AMULET",
      "EXPERT_BELT",
      "SCOPE_LENS",
      "FOCUS_SASH",
      "ASSAULT_VEST",
      "CHOICE_BAND",
      "CHOICE_SPECS",
      "CHOICE_SCARF",
      "AIR_BALLOON",
      "BLUNDER_POLICY",
      "ROOM_SERVICE",
      "THROAT_SPRAY",
      "LOADED_DICE",
      "ROCKY_HELMET",
      "WIDE_LENS",
    ].includes(id)
  ) {
    return "SELECT_POKEMON";
  }

  return "INSTANT";
}

function buildVoucherShopListings(): RogueShopListing[] {
  const types = [
    { type: VoucherType.REGULAR, key: "VOUCHER" },
    { type: VoucherType.PLUS, key: "VOUCHER_PLUS" },
    { type: VoucherType.PREMIUM, key: "VOUCHER_PREMIUM" },
    { type: VoucherType.GOLDEN, key: "VOUCHER_GOLDEN" }, // 실제 키가 다르면 수정
  ];

  return types.map(t => {
    const tier = getVoucherShopTier(t.type);
    const func = (modifierTypes as Record<string, () => any>)[t.key];
    const type = func().withIdFromFunc(func);

    return createListing(
      t.key,
      tier,
      new ModifierTypeOption(type, 1, 0),
      "INSTANT",
      99,
    );
  });
}

function buildListingsFromPool(
  pool: Record<number, WeightedModifierType[]>,
  allowedTiers?: ModifierTier[],
): RogueShopListing[] {
  const listings: RogueShopListing[] = [];

  for (const tierKey of Object.keys(pool)) {
    const tier = Number(tierKey) as ModifierTier;

    if (allowedTiers && !allowedTiers.includes(tier)) {
      continue;
    }

    const entries = pool[tier] ?? [];
    for (const entry of entries) {
      const type = entry.modifierType; // ✅ 이미 ModifierType 객체
      const id = type.id;

      if (!id) {
        continue;
      }

      if (shouldExcludeFromRogueShop(id)) {
        continue;
      }

      listings.push(
        createListing(
          id,
          tier,
          new ModifierTypeOption(type, 1, 0),
          inferPurchaseMode(id),
          99,
        ),
      );
    }
  }

  return listings;
}

function dedupeListings(listings: RogueShopListing[]): RogueShopListing[] {
  const seen = new Set<string>();
  const result: RogueShopListing[] = [];

  for (const listing of listings) {
    if (seen.has(listing.id)) {
      continue;
    }
    seen.add(listing.id);
    result.push(listing);
  }

  return result;
}

export function buildRogueShopListings(): RogueShopListing[] {
  const voucherListings = buildVoucherShopListings();

  const wildListings = buildListingsFromPool(wildModifierPool);
  const dailyStarterListings = buildListingsFromPool(dailyStarterModifierPool);
  const normalListings = buildListingsFromPool(modifierPool);

  return dedupeListings([
    ...voucherListings,
    ...wildListings,
    ...dailyStarterListings,
    ...normalListings,
  ]);
}