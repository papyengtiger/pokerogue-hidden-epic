import { VoucherType } from "#system/voucher";
import { ModifierTier } from "#enums/modifier-tier";
import {
  PokemonHeldItemModifier,
  PersistentModifier
} from "#modifiers/modifier";
import { ModifierTypeOption, type WeightedModifierType, type RogueShopPurchaseMode, ModifierTypeGenerator, BaseStatBoosterModifierType, AttackTypeBoosterModifierType, TypeSpecificMoveBoosterModifierType, PokemonHeldItemModifierType, ShopPersistentModifierType, PersistentModifierType } from "#modifiers/modifier-type";
import { modifierPool, wildModifierPool, dailyStarterModifierPool } from "#modifiers/modifier-pools";
import type { RogueShopListing } from "#ui/rogue-shop-ui-handler";
import { modifierTypes } from "#data/data-lists";
import type { PermanentStat, TempBattleStat } from "#enums/stat";
import { getStatKey, Stat, TEMP_BATTLE_STATS } from "#enums/stat";
import { PokemonType } from "#enums/pokemon-type";
import { TYPE_BOOST_ITEM_BOOST_PERCENT } from "#app/constants";
import { getBerryEffectDescription, getBerryName } from "#data/berry";
import { BerryType } from "#enums/berry-type";

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

function buildVoucherShopListings(): RogueShopListing[] {
  const entries = [
    {
      key: "VOUCHER",
      tier: getVoucherShopTier(VoucherType.REGULAR),
      purchaseMode: "INSTANT" as RogueShopPurchaseMode,
    },
    {
      key: "VOUCHER_PLUS",
      tier: getVoucherShopTier(VoucherType.PLUS),
      purchaseMode: "INSTANT" as RogueShopPurchaseMode,
    },
    {
      key: "VOUCHER_PREMIUM",
      tier: getVoucherShopTier(VoucherType.PREMIUM),
      purchaseMode: "INSTANT" as RogueShopPurchaseMode,
    },
    {
      key: "VOUCHER_GOLDEN",
      tier: getVoucherShopTier(VoucherType.GOLDEN),
      purchaseMode: "INSTANT" as RogueShopPurchaseMode,
    },

    // 로그센터 상점 전용 상품
    {
      key: "GOLDEN_EXP_CHARM",
      tier: ModifierTier.LUXURY,
      purchaseMode: "TRAINER_LOADOUT" as RogueShopPurchaseMode,
    },
  ];

  return entries.map(entry => {
    const func = (modifierTypes as Record<string, () => any>)[entry.key];
    const type = func().withIdFromFunc(func);

    return createListing(
      entry.key,
      entry.tier,
      new ModifierTypeOption(type, 1, 0),
      entry.purchaseMode,
      99,
    );
  });
}

function buildBerryListings(): RogueShopListing[] {
  const berries = Object.values(BerryType).filter(v => typeof v === "number") as BerryType[];

  const berryFunc = modifierTypes.BERRY;
  const berryGenerator = berryFunc().withIdFromFunc(berryFunc) as ModifierTypeGenerator;

  const berryTier = ModifierTier.GREAT; // 전부 동일 등급
  const berryPrice = 150; // 전부 동일 가격

  return berries
    .map(berryType => {
      const type = berryGenerator.generateType([], [berryType]);
      if (!type) {
        return null;
      }

      type.setTier(berryTier);

      return {
        id: `${type.id}_${berryType}`,
        tier: berryTier,
        priceRp: berryPrice,
        stock: 99,
        purchaseMode: "SELECT_POKEMON" as RogueShopPurchaseMode,
        option: new ModifierTypeOption(type, 1, 0),
      };
    })
    .filter((listing): listing is RogueShopListing => listing !== null);
}

function expandGeneratorForShop(type: ModifierType): ModifierType[] {
  switch (type.id) {
    case "BASE_STAT_BOOSTER": {
      const gen = modifierTypes.BASE_STAT_BOOSTER().withIdFromFunc(modifierTypes.BASE_STAT_BOOSTER);
      return [
        gen.generateType([], [Stat.HP]),
        gen.generateType([], [Stat.ATK]),
        gen.generateType([], [Stat.DEF]),
        gen.generateType([], [Stat.SPATK]),
        gen.generateType([], [Stat.SPDEF]),
        gen.generateType([], [Stat.SPD]),
      ].filter(Boolean) as ModifierType[];
    }

    case "ATTACK_TYPE_BOOSTER": {
      const gen = modifierTypes.ATTACK_TYPE_BOOSTER().withIdFromFunc(modifierTypes.ATTACK_TYPE_BOOSTER);
      return [
        gen.generateType([], [PokemonType.NORMAL]),
        gen.generateType([], [PokemonType.FIGHTING]),
        gen.generateType([], [PokemonType.FLYING]),
        gen.generateType([], [PokemonType.POISON]),
        gen.generateType([], [PokemonType.GROUND]),
        gen.generateType([], [PokemonType.ROCK]),
        gen.generateType([], [PokemonType.BUG]),
        gen.generateType([], [PokemonType.GHOST]),
        gen.generateType([], [PokemonType.STEEL]),
        gen.generateType([], [PokemonType.FIRE]),
        gen.generateType([], [PokemonType.WATER]),
        gen.generateType([], [PokemonType.GRASS]),
        gen.generateType([], [PokemonType.ELECTRIC]),
        gen.generateType([], [PokemonType.PSYCHIC]),
        gen.generateType([], [PokemonType.ICE]),
        gen.generateType([], [PokemonType.DRAGON]),
        gen.generateType([], [PokemonType.DARK]),
        gen.generateType([], [PokemonType.FAIRY]),
      ].filter(Boolean) as ModifierType[];
    }

    case "TYPE_SPECIFIC_MOVE_BOOSTER": {
      const gen = modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER().withIdFromFunc(modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER);
      return [
        gen.generateType([], [PokemonType.NORMAL]),
        gen.generateType([], [PokemonType.FIGHTING]),
        gen.generateType([], [PokemonType.FLYING]),
        gen.generateType([], [PokemonType.POISON]),
        gen.generateType([], [PokemonType.GROUND]),
        gen.generateType([], [PokemonType.ROCK]),
        gen.generateType([], [PokemonType.BUG]),
        gen.generateType([], [PokemonType.GHOST]),
        gen.generateType([], [PokemonType.STEEL]),
        gen.generateType([], [PokemonType.FIRE]),
        gen.generateType([], [PokemonType.WATER]),
        gen.generateType([], [PokemonType.GRASS]),
        gen.generateType([], [PokemonType.ELECTRIC]),
        gen.generateType([], [PokemonType.PSYCHIC]),
        gen.generateType([], [PokemonType.ICE]),
        gen.generateType([], [PokemonType.DRAGON]),
        gen.generateType([], [PokemonType.DARK]),
        gen.generateType([], [PokemonType.FAIRY]),
      ].filter(Boolean) as ModifierType[];
    }

    default:
       return [type];
  }
}

function shouldShowInShop(type: ModifierType): boolean {
  return type.isRogueShopCandidate?.() ?? false;
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
      const expandedTypes = expandGeneratorForShop(entry.modifierType);

      for (const type of expandedTypes) {
  const id = type.id;
  if (!id) continue;

  if (!shouldShowInShop(type)) continue;

  listings.push(
          createListing(
            id,
            tier,
            new ModifierTypeOption(type, 1, 0),
            type.getRogueShopPurchaseMode?.() ?? "INSTANT",
            99,
          ),
        );
      }
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
  const berryListings = buildBerryListings();

  const wildListings = buildListingsFromPool(wildModifierPool);
  const dailyStarterListings = buildListingsFromPool(dailyStarterModifierPool);
  const normalListings = buildListingsFromPool(modifierPool);

  return dedupeListings([
    ...voucherListings,
    ...berryListings,
    ...wildListings,
    ...dailyStarterListings,
    ...normalListings,
  ]);
}