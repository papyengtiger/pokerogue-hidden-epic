import { TYPE_BOOST_ITEM_BOOST_PERCENT } from "#app/constants";
import { initSpeciesZMoves, getSpeciesZMoves, isExclusiveZCrystal, zmovesSpecies } from "#app/data/balance/zmoves";
import { timedEventManager } from "#app/global-event-manager";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import Overrides from "#app/overrides";
import { EvolutionItem, pokemonEvolutions } from "#balance/pokemon-evolutions";
import { tmSpecies } from "#balance/tm-species-map";
import { tmPoolTiers } from "#balance/tms";
import { getBerryEffectDescription, getBerryName } from "#data/berry";
import { getDailyEventSeedLuck } from "#data/daily-run";
import { allMoves, modifierTypes } from "#data/data-lists";
import { SpeciesFormChangeItemTrigger } from "#data/form-change-triggers";
import { getNatureName, getNatureStatMultiplier } from "#data/nature";
import { getPokeballCatchMultiplier, getPokeballName } from "#data/pokeball";
import { pokemonFormChanges, SpeciesFormChangeCondition } from "#data/pokemon-forms";
import { getStatusEffectDescriptor } from "#data/status-effect";
import { BattlerTagType } from "#enums/battler-tag-type";
import { BerryType } from "#enums/berry-type";
import { ChallengeType } from "#enums/challenge-type";
import { FormChangeItem } from "#enums/form-change-item";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveId } from "#enums/move-id";
import { Nature } from "#enums/nature";
import { PokeballType } from "#enums/pokeball";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesFormKey } from "#enums/species-form-key";
import { SpeciesId } from "#enums/species-id";
import type { PermanentStat, TempBattleStat } from "#enums/stat";
import { getStatKey, Stat, TEMP_BATTLE_STATS } from "#enums/stat";
import { StatusEffect } from "#enums/status-effect";
import type { EnemyPokemon, PlayerPokemon, Pokemon } from "#field/pokemon";
import {
  AddPokeballModifier,
  AddVoucherModifier,
  AttackTypeBoosterModifier,
  BaseStatModifier,
  BerryModifier,
  BoostBugSpawnModifier,
  BypassSpeedChanceModifier,
  ContactHeldItemTransferChanceModifier,
  CritBoosterModifier,
  CriticalCatchChanceBoosterModifier,
  DamageMoneyRewardModifier,
  DoubleBattleChanceBoosterModifier,
  EnemyAttackStatusEffectChanceModifier,
  EnemyDamageBoosterModifier,
  EnemyDamageReducerModifier,
  EnemyEndureChanceModifier,
  EnemyFusionChanceModifier,
  type EnemyPersistentModifier,
  EnemyStatusEffectHealChanceModifier,
  EnemyTurnHealModifier,
  EvolutionItemModifier,
  EvolutionStatBoosterModifier,
  EvoTrackerModifier,
  ExpBalanceModifier,
  ExpBoosterModifier,
  ExpShareModifier,
  ExtraModifierModifier,
  FieldEffectModifier,
  FlinchChanceModifier,
  FusePokemonModifier,
  GigantamaxAccessModifier,
  HealingBoosterModifier,
  HealShopCostModifier,
  HiddenAbilityRateBoosterModifier,
  HitHealModifier,
  IvScannerModifier,
  LevelIncrementBoosterModifier,
  LockModifierTiersModifier,
  MapModifier,
  MegaEvolutionAccessModifier,
  type Modifier,
  MoneyInterestModifier,
  MoneyMultiplierModifier,
  MoneyRewardModifier,
  EggHatchSpeedUpModifier,
  type PersistentModifier,
  PokemonAllMovePpRestoreModifier,
  PokemonBaseStatFlatModifier,
  PokemonBaseStatTotalModifier,
  PokemonExpBoosterModifier,
  PokemonFormChangeItemModifier,
  PokemonFriendshipBoosterModifier,
  PokemonHeldItemModifier,
  PokemonHpRestoreModifier,
  PokemonIncrementingStatModifier,
  PokemonInstantReviveModifier,
  PokemonLevelIncrementModifier,
  PokemonMoveAccuracyBoosterModifier,
  PokemonMultiHitModifier,
  PokemonNatureChangeModifier,
  PokemonNatureWeightModifier,
  PokemonPpRestoreModifier,
  PokemonPpUpModifier,
  PokemonStatusHealModifier,
  PreserveBerryModifier,
  RememberMoveModifier,
  ResetNegativeStatStageModifier,
  ShinyRateBoosterModifier,
  SpeciesCritBoosterModifier,
  SpeciesFormHeldItemModifier,
  UrshifuGloveAbilityBypassModifier,
  SpeciesStatBoosterModifier,
  SurviveDamageModifier,
  SwitchEffectTransferModifier,
  TempCritBoosterModifier,
  TempExtraModifierModifier,
  TempStatStageBoosterModifier,
  TerastallizeAccessModifier,
  TerastallizeModifier,
  TmModifier,
  TurnHealModifier,
  TurnHeldItemTransferModifier,
  TurnStatusEffectModifier,
  StatBoostModifier,
  StackingRiskyPowerBoosterModifier,
  StackingPowerBoosterModifier,
  RunSuccessModifier,
  SuperEffectiveBoosterModifier,
  EvasiveItemModifier,
  LegendPlateModifier,
  IgnoreContactItemModifier,
  GuaranteedSurviveDamageModifier,
  ContactDamageModifier,
  WeaknessTypeModifier,
  PokemonDefensiveStatModifier,
  SpeedStatModifier,
  SpAtkStatModifier,
  AtkStatModifier,
  ProtectStatModifier,
  OvercoatModifier,
  PunchingGloveModifier,
  IgnoreMoveEffectsItemModifier,
  MaxMultiHitModifier,
  TypeSpecificMoveBoosterModifier,
  SoundBasedMoveSpecialAttackBoostModifier,
  AlwaysMoveLastModifier,
  IgnoreWeatherEffectsItemModifier,
  WeakenMoveScreenModifier,
  BoostEnergyModifier,
  PowerUpDiskModifier,
  VictoryBadgeModifier,
  BeastBoostStartStatBoostModifier,
  CalyrexReinsUnifiedModifier,
  AngeOrbeModifier,
  CursedRuinModifier,
  PreserveItemModifier,
  StatStageChangeCopyModifier,
  PostBattleLootItemModifier,
  MentalHerbModifier,
  TypeImmunityModifier,
  InstantChargeItemModifier,
  CritDamageBoostModifier,
  NotEffectiveBoostModifier,
  MovePowerBoostItemModifier,
  RecoilBoosterModifier,
  MoveAbilityBypassModifier,
  VictoryStatBoostModifier,
  UnawareItemModifier,
  StatStageChangeBoostModifier,
  PreventBerryUseItemModifier,
  PreventExplosionItemModifier,
  PreventPriorityMoveItemModifier,
  MoveEffectChanceMultiplierItemModifier,
  IgnoreTypeImmunityModifier,
  SheerForceItemModifier,
  GoldenBodyItemModifier,
  AromaIncenseItemModifier,
  DuskManeBeadModifier,
  DawnWingsBeadModifier,
  UltraBeadModifier,
  AdaptabilityItemModifier,
  TelepathyItemModifier,
  StatStageChangeReverseModifier,
  EvolutionIncenseModifier,
  SturdystoneItemModifier,
  SturdyMealModifier,
  MoodyItemModifier,
  RoomServiceModifier,
  AbilityGuardItemModifier,
  MissEffectModifier,
  MaxIvModifier,
  ChangeAbilityModifier,
  MaxAllIvModifier,
  RegisterAbilityModifier,
  GenericZMoveAccessModifier,
  ExclusiveZMoveAccessModifier,
  ZCrystalMoveModifier,
  PokemonZMovePpRestoreModifier,
  WishingStarModifier,
  MaxMoveAccessModifier,
  TrModifier,
  PokemonMaxMovePpRestoreModifier,
  DynamaxMovePpUpModifier,
  SlicingMoveModifier,
  BitingMoveModifier,
  HeadMoveModifier,
  HornMoveModifier,
  KickMoveModifier,
  SpearMoveModifier,
  WingMoveModifier,
  HammerMoveModifier,
  ClawMoveModifier,
  PinchMoveModifier,
  BeakMoveModifier,
  DashMoveModifier,
  SpinMoveModifier,
  DrillMoveModifier,
  WhipMoveModifier,
  WheelMoveModifier,
  TailMoveModifier,
  ArrowMoveModifier,
  BallBombMoveModifier,
  BoomerangMoveModifier,
  ThrowMoveModifier,
  PulseMoveModifier,
  BeamMoveModifier,
  LightMoveModifier,
  SoundMoveModifier,
  WindMoveModifier,
  DanceMoveModifier,
  DrainMoveModifier,
  SpeciesHealingBellModifier,
  WeatherRockTrainerModifier,
  TerrainSeedTrainerModifier,
  BlockCritItemModifier,
  StatusBoostItemModifier,
  CategoryPowerBoostModifier,
  GenesectDriveKind
} from "#modifiers/modifier";
import type { PokemonMove } from "#moves/pokemon-move";
import { getVoucherTypeIcon, getVoucherTypeName, VoucherType } from "#system/voucher";
import type { ModifierTypeFunc, WeightedModifierTypeWeightFunc } from "#types/modifier-types";
import type { PokemonMoveSelectFilter, PokemonSelectFilter } from "#ui/party-ui-handler";
import { PartyUiHandler } from "#ui/party-ui-handler";
import { getModifierTierTextTint } from "#ui/text";
import { applyChallenges } from "#utils/challenge-utils";
import { BooleanHolder, formatMoney, NumberHolder, padInt, randSeedInt, randSeedItem } from "#utils/common";import { getEnumKeys, getEnumValues } from "#utils/enums";
import { getModifierPoolForType, getModifierType } from "#utils/modifier-utils";
import { toCamelCase } from "#utils/strings";
import i18next from "i18next";
import { trPoolTiers, maxmovesSpecies } from "#app/data/balance/trs";
import { DynamaxPhase } from "#app/phases/dynamax-phase";
import {getStatKey, PERMANENT_STATS} from "/src/enums/stat";
import { WeatherType } from "#app/enums/weather-type";
import { TerrainType } from "#data/terrain";
import { MoveCategory } from "#enums/move-category";

const outputModifierData = false;
const useMaxWeightForOutput = false;

type NewModifierFunc = (type: ModifierType, args: any[]) => Modifier;

export class ModifierType {
  public id: string;
  public localeKey: string;
  public iconImage: string;
  public group: string;
  public soundName: string;
  public tier: ModifierTier;
  protected newModifierFunc: NewModifierFunc | null;

  /**
   * Checks if the modifier type is of a specific type
   * @param modifierType - The type to check against
   * @return Whether the modifier type is of the specified type
   */
  public is<K extends ModifierTypeString>(modifierType: K): this is ModifierTypeInstanceMap[K] {
    const targetType = ModifierTypeConstructorMap[modifierType];
    if (!targetType) {
      return false;
    }
    return this instanceof targetType;
  }

  constructor(
    localeKey: string | null,
    iconImage: string | null,
    newModifierFunc: NewModifierFunc | null,
    group?: string,
    soundName?: string,
  ) {
    this.localeKey = localeKey!; // TODO: is this bang correct?
    this.iconImage = iconImage!; // TODO: is this bang correct?
    this.group = group!; // TODO: is this bang correct?
    this.soundName = soundName ?? "se/restore";
    this.newModifierFunc = newModifierFunc;
  }

  get name(): string {
    return i18next.t(`${this.localeKey}.name` as any);
  }

  getDescription(): string {
    return i18next.t(`${this.localeKey}.description` as any);
  }

  setTier(tier: ModifierTier): void {
    this.tier = tier;
  }

  getOrInferTier(poolType: ModifierPoolType = ModifierPoolType.PLAYER): ModifierTier | null {
    if (this.tier) {
      return this.tier;
    }
    if (!this.id) {
      return null;
    }
    let poolTypes: ModifierPoolType[];
    switch (poolType) {
      case ModifierPoolType.PLAYER:
        poolTypes = [poolType, ModifierPoolType.TRAINER, ModifierPoolType.WILD];
        break;
      case ModifierPoolType.WILD:
        poolTypes = [poolType, ModifierPoolType.PLAYER, ModifierPoolType.TRAINER];
        break;
      case ModifierPoolType.TRAINER:
        poolTypes = [poolType, ModifierPoolType.PLAYER, ModifierPoolType.WILD];
        break;
      default:
        poolTypes = [poolType];
        break;
    }
    // Try multiple pool types in case of stolen items
    for (const type of poolTypes) {
      const pool = getModifierPoolForType(type);
      for (const tier of getEnumValues(ModifierTier)) {
        if (!pool.hasOwnProperty(tier)) {
          continue;
        }
        if (pool[tier].find(m => (m as WeightedModifierType).modifierType.id === this.id)) {
          return (this.tier = tier);
        }
      }
    }
    return null;
  }

  /**
   * Populates item id for ModifierType instance
   * @param func
   */
  withIdFromFunc(func: ModifierTypeFunc): ModifierType {
    this.id = Object.keys(modifierTypeInitObj).find(k => modifierTypeInitObj[k] === func)!; // TODO: is this bang correct?
    return this;
  }

  /**
   * Populates item tier for ModifierType instance
   * Tier is a necessary field for items that appear in player shop (determines the Pokeball visual they use)
   * To find the tier, this function performs a reverse lookup of the item type in modifier pools
   * It checks the weight of the item and will use the first tier for which the weight is greater than 0
   * This is to allow items to be in multiple item pools depending on the conditions, for example for events
   * If all tiers have a weight of 0 for the item, the first tier where the item was found is used
   * @param poolType Default 'ModifierPoolType.PLAYER'. Which pool to lookup item tier from
   * @param party optional. Needed to check the weight of modifiers with conditional weight (see {@linkcode WeightedModifierTypeWeightFunc})
   *  if not provided or empty, the weight check will be ignored
   * @param rerollCount Default `0`. Used to check the weight of modifiers with conditional weight (see {@linkcode WeightedModifierTypeWeightFunc})
   */
  withTierFromPool(
    poolType: ModifierPoolType = ModifierPoolType.PLAYER,
    party?: PlayerPokemon[],
    rerollCount = 0,
  ): ModifierType {
    let defaultTier: undefined | ModifierTier;
    for (const tier of Object.values(getModifierPoolForType(poolType))) {
      for (const modifier of tier) {
        if (this.id === modifier.modifierType.id) {
          let weight: number;
          if (modifier.weight instanceof Function) {
            weight = party ? modifier.weight(party, rerollCount) : 0;
          } else {
            weight = modifier.weight;
          }
          if (weight > 0) {
            this.tier = modifier.modifierType.tier;
            return this;
          }
          if (isNullOrUndefined(defaultTier)) {
            // If weight is 0, keep track of the first tier where the item was found
            defaultTier = modifier.modifierType.tier;
          }
        }
      }
    }

    // Didn't find a pool with weight > 0, fallback to first tier where the item was found, if any
    if (defaultTier) {
      this.tier = defaultTier;
    }

    return this;
  }

  newModifier(...args: any[]): Modifier | null {
    // biome-ignore lint/complexity/useOptionalChain: Changing to optional would coerce null return into undefined
    return this.newModifierFunc && this.newModifierFunc(this, args);
  }
}

type ModifierTypeGeneratorFunc = (party: Pokemon[], pregenArgs?: any[]) => ModifierType | null;

export class ModifierTypeGenerator extends ModifierType {
  private genTypeFunc: ModifierTypeGeneratorFunc;

  constructor(genTypeFunc: ModifierTypeGeneratorFunc) {
    super(null, null, null);
    this.genTypeFunc = genTypeFunc;
  }

  generateType(party: Pokemon[], pregenArgs?: any[]) {
    const ret = this.genTypeFunc(party, pregenArgs);
    if (ret) {
      ret.id = this.id;
      ret.setTier(this.tier);
    }
    return ret;
  }
}

export interface GeneratedPersistentModifierType {
  getPregenArgs(): any[];
}

export class AddPokeballModifierType extends ModifierType {
  private pokeballType: PokeballType;
  private count: number;

  constructor(iconImage: string, pokeballType: PokeballType, count: number) {
    super("", iconImage, (_type, _args) => new AddPokeballModifier(this, pokeballType, count), "pb", "se/pb_bounce_1");
    this.pokeballType = pokeballType;
    this.count = count;
  }

  get name(): string {
    return i18next.t("modifierType:ModifierType.AddPokeballModifierType.name", {
      modifierCount: this.count,
      pokeballName: getPokeballName(this.pokeballType),
    });
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.AddPokeballModifierType.description", {
      modifierCount: this.count,
      pokeballName: getPokeballName(this.pokeballType),
      catchRate:
        getPokeballCatchMultiplier(this.pokeballType) > -1
          ? `${getPokeballCatchMultiplier(this.pokeballType)}x`
          : "100%",
      pokeballAmount: `${globalScene.pokeballCounts[this.pokeballType]}`,
    });
  }
}

export class AddVoucherModifierType extends ModifierType {
  private voucherType: VoucherType;
  private count: number;

  constructor(voucherType: VoucherType, count: number) {
    super(
      "",
      getVoucherTypeIcon(voucherType),
      (_type, _args) => new AddVoucherModifier(this, voucherType, count),
      "voucher",
    );
    this.count = count;
    this.voucherType = voucherType;
  }

  get name(): string {
    return i18next.t("modifierType:ModifierType.AddVoucherModifierType.name", {
      modifierCount: this.count,
      voucherTypeName: getVoucherTypeName(this.voucherType),
    });
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.AddVoucherModifierType.description", {
      modifierCount: this.count,
      voucherTypeName: getVoucherTypeName(this.voucherType),
    });
  }
}

export class PokemonModifierType extends ModifierType {
  public selectFilter: PokemonSelectFilter | undefined;

  constructor(
    localeKey: string,
    iconImage: string,
    newModifierFunc: NewModifierFunc,
    selectFilter?: PokemonSelectFilter,
    group?: string,
    soundName?: string,
  ) {
    super(localeKey, iconImage, newModifierFunc, group, soundName);

    this.selectFilter = selectFilter;
  }
}

export class PokemonHeldItemModifierType extends PokemonModifierType {
  constructor(
    localeKey: string,
    iconImage: string,
    newModifierFunc: NewModifierFunc,
    group?: string,
    soundName?: string,
  ) {
    super(
      localeKey,
      iconImage,
      newModifierFunc,
      (pokemon: PlayerPokemon) => {
  // ─────────────────────────────────────────────
  // ✅ SBOO 예외: 엔진 구조상 heldItems에만 있고 modifiers에는 없을 수 있음
  // ─────────────────────────────────────────────
  try {
    const tid = (this as any)?.id ?? (this as any)?.localeKey;
    const isSbooType = typeof tid === "string" && tid.startsWith("modifierType:SpeciesBoosterItem.");

    if (isSbooType) {
      const held = pokemon.getHeldItems?.() ?? [];
      const hasAlready = held.some(m => {
        const mid = (m as any)?.type?.id ?? (m as any)?.type?.localeKey;
        return typeof mid === "string" && mid === tid; // 같은 타입 id면 같은 아이템
      });

      console.log("[SBOO_SELECTFILTER]", {
        pokemon: pokemon.name,
        tid,
        heldLen: held.length,
        hasAlready,
        heldTypeHead: held.slice(0, 5).map(m => (m as any)?.type?.id ?? (m as any)?.type?.localeKey ?? null),
      });

      if (hasAlready) {
        return i18next.t("modifierType:ModifierType.PokemonHeldItemModifierType.extra.tooMany", {
          pokemonName: getPokemonNameWithAffix(pokemon),
        });
      }

      return null;
    }
  } catch {}

  // ─────────────────────────────────────────────
  // ✅ 기존 로직 그대로
  // ─────────────────────────────────────────────
  const dummyModifier = this.newModifier(pokemon);
  const matchingModifier = globalScene.findModifier(
    m => m instanceof PokemonHeldItemModifier && m.pokemonId === pokemon.id && m.matchType(dummyModifier),
  ) as PokemonHeldItemModifier;

  const maxStackCount = dummyModifier.getMaxStackCount();
  if (!maxStackCount) {
    return i18next.t("modifierType:ModifierType.PokemonHeldItemModifierType.extra.inoperable", {
      pokemonName: getPokemonNameWithAffix(pokemon),
    });
  }
  if (matchingModifier && matchingModifier.stackCount === maxStackCount) {
    return i18next.t("modifierType:ModifierType.PokemonHeldItemModifierType.extra.tooMany", {
      pokemonName: getPokemonNameWithAffix(pokemon),
    });
  }
  return null;
},
      group,
      soundName,
    );
  }

  newModifier(...args: any[]): PokemonHeldItemModifier {
    return super.newModifier(...args) as PokemonHeldItemModifier;
  }
}

export class TerastallizeModifierType extends PokemonModifierType {
  private teraType: PokemonType;

  constructor(teraType: PokemonType) {
    super(
      "",
      `${PokemonType[teraType].toLowerCase()}_tera_shard`,
      (type, args) => new TerastallizeModifier(type as TerastallizeModifierType, (args[0] as Pokemon).id, teraType),
      (pokemon: PlayerPokemon) => {
        if (
          [pokemon.species.speciesId, pokemon.fusionSpecies?.speciesId].filter(
            s => s === SpeciesId.TERAPAGOS || s === SpeciesId.OGERPON || s === SpeciesId.SHEDINJA,
          ).length > 0
        ) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
      "tera_shard",
    );

    this.teraType = teraType;
  }

  get name(): string {
    return i18next.t("modifierType:ModifierType.TerastallizeModifierType.name", {
      teraType: i18next.t(`pokemonInfo:type.${toCamelCase(PokemonType[this.teraType])}`),
    });
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.TerastallizeModifierType.description", {
      teraType: i18next.t(`pokemonInfo:type.${toCamelCase(PokemonType[this.teraType])}`),
    });
  }

  getPregenArgs(): any[] {
    return [this.teraType];
  }
}

export const typeToZMoveMap: Partial<Record<PokemonType, Moves>> = {
  [PokemonType.NORMAL]: MoveId.BREAKNECK_BLITZ,
  [PokemonType.FIGHTING]: MoveId.ALL_OUT_PUMMELING,
  [PokemonType.FLYING]: MoveId.SUPERSONIC_SKYSTRIKE,
  [PokemonType.POISON]: MoveId.ACID_DOWNPOUR,
  [PokemonType.GROUND]: MoveId.TECTONIC_RAGE,
  [PokemonType.ROCK]: MoveId.CONTINENTAL_CRUSH,
  [PokemonType.BUG]: MoveId.SAVAGE_SPIN_OUT,
  [PokemonType.GHOST]: MoveId.NEVER_ENDING_NIGHTMARE,
  [PokemonType.STEEL]: MoveId.CORKSCREW_CRASH,
  [PokemonType.FIRE]: MoveId.INFERNO_OVERDRIVE,
  [PokemonType.WATER]: MoveId.HYDRO_VORTEX,
  [PokemonType.GRASS]: MoveId.BLOOM_DOOM,
  [PokemonType.ELECTRIC]: MoveId.GIGAVOLT_HAVOC,
  [PokemonType.PSYCHIC]: MoveId.SHATTERED_PSYCHE,
  [PokemonType.ICE]: MoveId.SUBZERO_SLAMMER,
  [PokemonType.DRAGON]: MoveId.DEVASTATING_DRAKE,
  [PokemonType.DARK]: MoveId.BLACK_HOLE_ECLIPSE,
  [PokemonType.FAIRY]: MoveId.TWINKLE_TACKLE,
};
export const exclusiveZMoveToSpeciesMap: Partial<Record<Moves, Species[]>> = {
  [MoveId.CATASTROPIKA]: [SpeciesId.PICHU, SpeciesId.PIKACHU, SpeciesId.RAICHU, SpeciesId.ALOLA_RAICHU],
[MoveId.SINISTER_ARROW_RAID]: [SpeciesId.ROWLET, SpeciesId.DARTRIX, SpeciesId.DECIDUEYE, SpeciesId.HISUI_DECIDUEYE],
[MoveId.MALICIOUS_MOONSAULT]: [SpeciesId.LITTEN, SpeciesId.TORRACAT, SpeciesId.INCINEROAR],
[MoveId.OCEANIC_OPERETTA]: [SpeciesId.POPPLIO, SpeciesId.BRIONNE, SpeciesId.PRIMARINA],
[MoveId.GUARDIAN_OF_ALOLA]: [SpeciesId.TAPU_KOKO, SpeciesId.TAPU_LELE, SpeciesId.TAPU_BULU, SpeciesId.TAPU_FINI],
[MoveId.SOUL_STEALING_7_STAR_STRIKE]: [SpeciesId.MARSHADOW],
[MoveId.STOKED_SPARKSURFER]: [SpeciesId.PICHU, SpeciesId.PIKACHU, SpeciesId.RAICHU, SpeciesId.ALOLA_RAICHU],
[MoveId.PULVERIZING_PANCAKE]: [SpeciesId.MUNCHLAX, SpeciesId.SNORLAX],
[MoveId.EXTREME_EVOBOOST]: [
  SpeciesId.EEVEE,
  SpeciesId.VAPOREON,
  SpeciesId.JOLTEON,
  SpeciesId.FLAREON,
  SpeciesId.ESPEON,
  SpeciesId.UMBREON,
  SpeciesId.LEAFEON,
  SpeciesId.GLACEON,
  SpeciesId.SYLVEON,
],
[MoveId.GENESIS_SUPERNOVA]: [SpeciesId.MEW, SpeciesId.MEWTWO],
[MoveId.TEN_MILLION_VOLT_THUNDERBOLT]: [SpeciesId.PICHU, SpeciesId.PIKACHU, SpeciesId.RAICHU, SpeciesId.ALOLA_RAICHU],
[MoveId.LIGHT_THAT_BURNS_THE_SKY]: [SpeciesId.NECROZMA],
[MoveId.SEARING_SUNRAZE_SMASH]: [SpeciesId.COSMOG, SpeciesId.COSMOEM, SpeciesId.SOLGALEO, SpeciesId.NECROZMA],
[MoveId.MENACING_MOONRAZE_MAELSTROM]: [SpeciesId.COSMOG, SpeciesId.COSMOEM, SpeciesId.LUNALA, SpeciesId.NECROZMA],
[MoveId.LETS_SNUGGLE_FOREVER]: [SpeciesId.MIMIKYU],
[MoveId.SPLINTERED_STORMSHARDS]: [
  SpeciesId.ROCKRUFF,
  [SpeciesId.LYCANROC, "midnight"],
  [SpeciesId.LYCANROC, "dusk"],
  [SpeciesId.LYCANROC, "dusk"],
  SpeciesId.LYCANROC,
],
[MoveId.CLANGOROUS_SOULBLAZE]: [SpeciesId.JANGMO_O, SpeciesId.HAKAMO_O, SpeciesId.KOMMO_O],
};
export const zCrystalPrefixesByMove: Record<Moves, string> = {
  [MoveId.CATASTROPIKA]: "pikanium",
  [MoveId.SINISTER_ARROW_RAID]: "decidium",
  [MoveId.MALICIOUS_MOONSAULT]: "incinium",
  [MoveId.OCEANIC_OPERETTA]: "primarium",
  [MoveId.GUARDIAN_OF_ALOLA]: "tapunium",
  [MoveId.SOUL_STEALING_7_STAR_STRIKE]: "marshadium",
  [MoveId.STOKED_SPARKSURFER]: "aloraichium",
  [MoveId.PULVERIZING_PANCAKE]: "snorlium",
  [MoveId.EXTREME_EVOBOOST]: "eevium",
  [MoveId.GENESIS_SUPERNOVA]: "mewnium",
  [MoveId.TEN_MILLION_VOLT_THUNDERBOLT]: "pikashunium",
  [MoveId.LIGHT_THAT_BURNS_THE_SKY]: "ultranecrozium",
  [MoveId.SEARING_SUNRAZE_SMASH]: "solium",
  [MoveId.MENACING_MOONRAZE_MAELSTROM]: "lunarium",
  [MoveId.LETS_SNUGGLE_FOREVER]: "mimikium",
  [MoveId.SPLINTERED_STORMSHARDS]: "lycanium",
  [MoveId.CLANGOROUS_SOULBLAZE]: "kommonium",
};

// 위의 맵핑을 기반으로 반대 방향 맵 생성
export const zMoveToTypeMap: Partial<Record<Moves, PokemonType>> = Object.entries(typeToZMoveMap).reduce(
  (acc, [typeKey, moveId]) => {
    const typeNum = Number(typeKey);
    if (moveId !== undefined) {
      acc[moveId] = typeNum;
    }
    return acc;
  },
  {} as Partial<Record<Moves, PokemonType>>,
);

function getExclusiveZMoveFromCrystal(zCrystalId: string): Moves | null {
  return zCrystalToExclusiveZMoveMap[zCrystalId.toLowerCase()] ?? null;
}

export function getZMoveFromType(type: PokemonType): Moves {
  const moveId = typeToZMoveMap[type];
  if (!moveId) {
    return MoveId.BREAKNECK_BLITZ;
  }
  return moveId;
}

function getExclusiveZMoveForSpecies(species: Species): Moves | null {
  for (const [move, speciesList] of Object.entries(exclusiveZMoveToSpeciesMap)) {
    if (speciesList.includes(species)) {
      return Number(move) as Moves;
    }
  }
  return null;
}

export function getTypeFromZMove(moveId: Moves): PokemonType {
  const type = zMoveToTypeMap[moveId];
  if (type === undefined) {
    return PokemonType.NORMAL;
  }
  return type;
}

function checkZMoveCondition(pokemon, moveId) {
  const compatibleZMoves = Array.isArray(pokemon.compatibleZMoves) ? pokemon.compatibleZMoves : [];
  if (!compatibleZMoves.includes(moveId)) {
    return "NoEffect";
  }
  if (pokemon.getMoveset().some(m => m.moveId === moveId)) {
    return "NoEffect";
  }
  return null;
}

export class ZCrystalMoveModifierType extends PokemonModifierType {
  public moveId: Moves;
  public isUniversal: boolean;

  constructor(moveId: Moves, isUniversal: boolean) {
    const move = allMoves[moveId];
    const type = move?.type ?? PokemonType.NORMAL;
    const typeName = PokemonType[type]?.toLowerCase?.() ?? "unknown";

    const id = isUniversal ? `${typeName}_z` : (getZCrystalIdByMove(moveId) ?? `${typeName}_z`);

    super(
      move?.name ?? "Unknown Move",
      id,

      (_type, args) => {
        const pokemon = args?.[0] as PlayerPokemon;
        if (!pokemon || typeof pokemon.id !== "number") {
          return null;
        }
        return new ZCrystalMoveModifier(_type as ZCrystalMoveModifierType, pokemon.id, isUniversal);
      },

      (pokemon: PlayerPokemon) => {
        if (!pokemon.compatibleZMoves?.includes(moveId)) return PartyUiHandler.NoEffectMessage;
        if (pokemon.getMoveset().some(m => m.moveId === moveId)) return PartyUiHandler.NoEffectMessage;
        return null;
      },

      "z",
    );

    this.moveId = moveId;
    this.isUniversal = isUniversal;
  }
}

export class ZGenericCrystalMoveModifierType extends PokemonModifierType {
  public moveId: Moves;

  constructor(moveId: Moves) {
    const move = allMoves[moveId];
    const type = move?.type ?? PokemonType.NORMAL;
    const typeName = PokemonType[type]?.toLowerCase?.() ?? "unknown";

    const modifierTypeId = `${typeName}_z`;

    super(
      move?.name ?? "Unknown Move",
      modifierTypeId,

      (_type, args) => {
        const pokemon = args?.[0] as PlayerPokemon;
        if (!pokemon || typeof pokemon.id !== "number") {
          console.warn("ZGenericCrystalMoveModifier 생성 실패: args[0]이 PlayerPokemon이 아님", args);
          return null;
        }
        return new ZCrystalMoveModifier(_type as ZGenericCrystalMoveModifierType, pokemon.id, true);
      },

      (pokemon: PlayerPokemon) => {
        const compatibleZMoves = Array.isArray(pokemon.compatibleZMoves) ? pokemon.compatibleZMoves : [];
        if (!compatibleZMoves.includes(this.moveId)) {
          return PartyUiHandler.NoEffectMessage;
        }
        if (pokemon.getMoveset().some(m => m.moveId === this.moveId)) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },

      "z",
    );

    this.moveId = moveId;
  }

  get name(): string {
    const move = allMoves[this.moveId];
    const teraType = move?.type ?? PokemonType.NORMAL;
    return i18next.t("modifierType:ModifierType.ZGenericCrystalMoveModifierType.name", {
      moveType: i18next.t(`pokemonInfo:type.${toCamelCase(PokemonType[teraType])}`),
    });
  }

  getDescription(): string {
    const move = allMoves[this.moveId];
    const teraType = move?.type ?? PokemonType.NORMAL;
    return i18next.t("modifierType:ModifierType.ZGenericCrystalMoveModifierType.description", {
      moveType: i18next.t(`pokemonInfo:type.${toCamelCase(PokemonType[teraType])}`),
    });
  }
}

export class ZExclusiveCrystalMoveModifierType extends PokemonModifierType {
  public moveId: Moves;

  constructor(moveId: Moves) {
    const move = allMoves[moveId];
    const prefix = zCrystalPrefixesByMove[moveId];
    const moveIdKey = prefix ? `${prefix}_z` : null;
    const imageId = moveIdKey ?? "unknown_z"; // 이미지 ID 및 modifier ID 용도

    super(
      move?.name ?? "Unknown Move",
      imageId,
      (_type, args) => {
        const pokemon = args?.[0] as PlayerPokemon;
        if (!pokemon || typeof pokemon.id !== "number") {
          console.warn("ZExclusiveCrystalMoveModifier 생성 실패: args[0]이 PlayerPokemon이 아님", args);
          return null;
        }
        return new ZCrystalMoveModifier(this, pokemon.id, false);
      },
      (pokemon: PlayerPokemon) => {
        const compatibleZMoves = Array.isArray(pokemon.compatibleZMoves) ? pokemon.compatibleZMoves : [];
        if (!compatibleZMoves.includes(this.moveId)) {
          return PartyUiHandler.NoEffectMessage;
        }
        if (pokemon.getMoveset().some(m => m.moveId === this.moveId)) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
      "z",
    );

    this.moveId = moveId;
  }

  static getZCrystalIdByMove(moveId: Moves): string | null {
    const prefix = zCrystalPrefixesByMove[moveId];
    return prefix ? `${prefix}_z` : null;
  }

  get name(): string {
    const moveIdKey = ZExclusiveCrystalMoveModifierType.getZCrystalIdByMove(this.moveId);

    if (moveIdKey && i18next.exists(`modifierType:exclusiveZMoves.${moveIdKey}`)) {
      return i18next.t(`modifierType:exclusiveZMoves.${moveIdKey}`);
    }

    const move = allMoves[this.moveId];
    const moveTypeName = i18next.t(`pokemonInfo:Type.${PokemonType[move?.type ?? -1] ?? "???"}`);
    return i18next.t("modifierType:ModifierType.ZExclusiveCrystalMoveModifierType.name", {
      moveType: moveTypeName,
    });
  }

  getDescription(): string {
    const moveIdKey = ZExclusiveCrystalMoveModifierType.getZCrystalIdByMove(this.moveId);

    if (moveIdKey && i18next.exists(`modifierType:exclusiveZMovesDescriptions.${moveIdKey}`)) {
      return i18next.t(`modifierType:exclusiveZMovesDescriptions.${moveIdKey}`);
    }

    const move = allMoves[this.moveId];
    const name = move?.name ?? "알 수 없는 기술";
    return i18next.t("modifierType:ZExclusiveCrystalMoveModifierType.exclusiveDescription", { name });
  }
}

export class PokemonHpRestoreModifierType extends PokemonModifierType {
  protected restorePoints: number;
  protected restorePercent: number;
  protected healStatus: boolean;

  constructor(
    localeKey: string,
    iconImage: string,
    restorePoints: number,
    restorePercent: number,
    healStatus = false,
    newModifierFunc?: NewModifierFunc,
    selectFilter?: PokemonSelectFilter,
    group?: string,
  ) {
    super(
      localeKey,
      iconImage,
      newModifierFunc ||
        ((_type, args) =>
          new PokemonHpRestoreModifier(
            this,
            (args[0] as PlayerPokemon).id,
            this.restorePoints,
            this.restorePercent,
            this.healStatus,
            false,
          )),
      selectFilter ||
        ((pokemon: PlayerPokemon) => {
          if (
            !pokemon.hp ||
            (pokemon.isFullHp() && (!this.healStatus || (!pokemon.status && !pokemon.getTag(BattlerTagType.CONFUSED))))
          ) {
            return PartyUiHandler.NoEffectMessage;
          }
          return null;
        }),
      group || "potion",
    );

    this.restorePoints = restorePoints;
    this.restorePercent = restorePercent;
    this.healStatus = healStatus;
  }

  getDescription(): string {
    return this.restorePoints
      ? i18next.t("modifierType:ModifierType.PokemonHpRestoreModifierType.description", {
          restorePoints: this.restorePoints,
          restorePercent: this.restorePercent,
        })
      : this.healStatus
        ? i18next.t("modifierType:ModifierType.PokemonHpRestoreModifierType.extra.fullyWithStatus")
        : i18next.t("modifierType:ModifierType.PokemonHpRestoreModifierType.extra.fully");
  }
}

export class PokemonReviveModifierType extends PokemonHpRestoreModifierType {
  constructor(localeKey: string, iconImage: string, restorePercent: number) {
    super(
      localeKey,
      iconImage,
      0,
      restorePercent,
      false,
      (_type, args) =>
        new PokemonHpRestoreModifier(this, (args[0] as PlayerPokemon).id, 0, this.restorePercent, false, true),
      (pokemon: PlayerPokemon) => {
        if (!pokemon.isFainted()) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
      "revive",
    );

    this.selectFilter = (pokemon: PlayerPokemon) => {
      const selectStatus = new BooleanHolder(pokemon.hp !== 0);
      applyChallenges(ChallengeType.PREVENT_REVIVE, selectStatus);
      if (selectStatus.value) {
        return PartyUiHandler.NoEffectMessage;
      }
      return null;
    };
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.PokemonReviveModifierType.description", {
      restorePercent: this.restorePercent,
    });
  }
}

export class PokemonStatusHealModifierType extends PokemonModifierType {
  constructor(localeKey: string, iconImage: string) {
    super(
      localeKey,
      iconImage,
      (_type, args) => new PokemonStatusHealModifier(this, (args[0] as PlayerPokemon).id),
      (pokemon: PlayerPokemon) => {
        if (!pokemon.hp || (!pokemon.status && !pokemon.getTag(BattlerTagType.CONFUSED))) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
    );
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.PokemonStatusHealModifierType.description");
  }
}

export abstract class PokemonMoveModifierType extends PokemonModifierType {
  public moveSelectFilter: PokemonMoveSelectFilter | undefined;

  constructor(
    localeKey: string,
    iconImage: string,
    newModifierFunc: NewModifierFunc,
    selectFilter?: PokemonSelectFilter,
    moveSelectFilter?: PokemonMoveSelectFilter,
    group?: string,
  ) {
    super(localeKey, iconImage, newModifierFunc, selectFilter, group);

    this.moveSelectFilter = moveSelectFilter;
  }
}

const allZMoveIds: Set<Moves> = new Set(Object.keys(zmovesSpecies).map(Number));
const allMaxMoveIds: Set<Moves> = new Set(Object.keys(maxmovesSpecies).map(Number));

export class PokemonPpRestoreModifierType extends PokemonMoveModifierType {
  protected restorePoints: number;

  constructor(localeKey: string, iconImage: string, restorePoints: number) {
    super(
      localeKey,
      iconImage,
      (_type, args) =>
        new PokemonPpRestoreModifier(this, (args[0] as PlayerPokemon).id, args[1] as number, this.restorePoints),
      (_pokemon: PlayerPokemon) => null,
      (pokemonMove: PokemonMove) => {
        if (allZMoveIds.has(pokemonMove.moveId) || allMaxMoveIds.has(pokemonMove.moveId)) {
          return PartyUiHandler.NoEffectMessage;
        }
        if (!pokemonMove.ppUsed) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
      "ether",
    );

    this.restorePoints = restorePoints;
  }

  getDescription(): string {
    return this.restorePoints > -1
      ? i18next.t("modifierType:ModifierType.PokemonPpRestoreModifierType.description", {
          restorePoints: this.restorePoints,
        })
      : i18next.t("modifierType:ModifierType.PokemonPpRestoreModifierType.extra.fully");
  }
}

export class PokemonAllMovePpRestoreModifierType extends PokemonModifierType {
  protected restorePoints: number;

  constructor(localeKey: string, iconImage: string, restorePoints: number) {
    super(
      localeKey,
      iconImage,
      (_type, args) => new PokemonAllMovePpRestoreModifier(this, (args[0] as PlayerPokemon).id, this.restorePoints),
      (pokemon: PlayerPokemon) => {
        const moveset = pokemon.getMoveset();
        const hasRestorableMove = moveset.some(
          m => m.ppUsed && !allZMoveIds.has(m.moveId) && !allMaxMoveIds.has(m.moveId),
        );
        if (!hasRestorableMove) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
      "elixir",
    );

    this.restorePoints = restorePoints;
  }

  getDescription(): string {
    return this.restorePoints > -1
      ? i18next.t("modifierType:ModifierType.PokemonAllMovePpRestoreModifierType.description", {
          restorePoints: this.restorePoints,
        })
      : i18next.t("modifierType:ModifierType.PokemonAllMovePpRestoreModifierType.extra.fully");
  }
}

export class PokemonZMovePpRestoreModifierType extends PokemonModifierType {
  constructor() {
    super(
      "ModifierType.PokemonZMovePpRestoreModifierType", // localeKey
      "z_drink", // iconImage
      (_type, args) => new PokemonZMovePpRestoreModifier(_type, (args[0] as PlayerPokemon).id),
      (pokemon: PlayerPokemon) => {
        const hasUsedZMove = pokemon.getMoveset().some(m => allZMoveIds.has(m.moveId) && m.ppUsed > 0);

        if (!hasUsedZMove) {
          return PartyUiHandler.NoEffectMessage;
        }

        return null;
      },
      "elixir",
    );
  }

  get name(): string {
    return i18next.t("modifierType:ModifierType.PokemonZMovePpRestoreModifierType.name");
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.PokemonZMovePpRestoreModifierType.description");
  }
}

export class PokemonMaxMovePpRestoreModifierType extends PokemonModifierType {
  constructor() {
    super(
      "ModifierType.PokemonMaxMovePpRestoreModifierType", // localeKey
      "gigantamix", // 아이템 아이콘 이름
      (_type, args) => new PokemonMaxMovePpRestoreModifier(_type, (args[0] as PlayerPokemon).id),
      (pokemon: PlayerPokemon) => {
        const hasUsedMaxMove = pokemon.getMoveset().some(m => allMaxMoveIds.has(m.moveId) && m.ppUsed > 0);

        if (!hasUsedMaxMove) {
          return PartyUiHandler.NoEffectMessage;
        }

        return null;
      },
      "elixir",
    );
  }

  get name(): string {
    return i18next.t("modifierType:ModifierType.PokemonMaxMovePpRestoreModifierType.name");
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.PokemonMaxMovePpRestoreModifierType.description");
  }
}

export class PokemonPpUpModifierType extends PokemonMoveModifierType {
  protected upPoints: number;

  constructor(localeKey: string, iconImage: string, upPoints: number) {
    super(
      localeKey,
      iconImage,
      (_type, args) => new PokemonPpUpModifier(this, (args[0] as PlayerPokemon).id, args[1] as number, this.upPoints),
      (_pokemon: PlayerPokemon) => null,
      (pokemonMove: PokemonMove) => {
        if (allZMoveIds.has(pokemonMove.moveId) || allMaxMoveIds.has(pokemonMove.moveId)) {
          return PartyUiHandler.NoEffectMessage; // Z무브/Max무브에는 효과 없음
        }
        if (pokemonMove.getMove().pp < 5 || pokemonMove.ppUp >= 3 || pokemonMove.maxPpOverride) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
      "ppUp",
    );

    this.upPoints = upPoints;
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.PokemonPpUpModifierType.description", {
      upPoints: this.upPoints,
    });
  }
}

export class DynamaxMovePpUpModifierType extends PokemonMoveModifierType {
  protected upPoints: number;

  constructor(localeKey: string, iconImage: string, upPoints: number) {
    super(
      localeKey,
      iconImage,
      (_type, args) =>
        new DynamaxMovePpUpModifier(this, (args[0] as PlayerPokemon).id, args[1] as number, this.upPoints),
      (_pokemon: PlayerPokemon) => null,
      (pokemonMove: PokemonMove) => {
        // 다이맥스 기술만 효과 있음
        if (!allMaxMoveIds.has(pokemonMove.moveId)) {
          return PartyUiHandler.NoEffectMessage; // 다이맥스 기술 아니면 효과 없음
        }
        if (pokemonMove.getMove().pp < 5 || pokemonMove.ppUp >= 3 || pokemonMove.maxPpOverride) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
      "ppUp",
    );

    this.upPoints = upPoints;
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.DynamaxMovePpUpModifierType.description", {
      upPoints: this.upPoints,
    });
  }
}

export class PokemonNatureChangeModifierType extends PokemonModifierType {
  protected nature: Nature;

  constructor(nature: Nature) {
    super(
      "",
      `mint_${
        getEnumKeys(Stat)
          .find(s => getNatureStatMultiplier(nature, Stat[s]) > 1)
          ?.toLowerCase() || "neutral"
      }`,
      (_type, args) => new PokemonNatureChangeModifier(this, (args[0] as PlayerPokemon).id, this.nature),
      (pokemon: PlayerPokemon) => {
        if (pokemon.getNature() === this.nature) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
      "mint",
    );

    this.nature = nature;
  }

  get name(): string {
    return i18next.t("modifierType:ModifierType.PokemonNatureChangeModifierType.name", {
      natureName: getNatureName(this.nature),
    });
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.PokemonNatureChangeModifierType.description", {
      natureName: getNatureName(this.nature, true, true, true),
    });
  }
}

export class RememberMoveModifierType extends PokemonModifierType {
  constructor(localeKey: string, iconImage: string, group?: string) {
    super(
      localeKey,
      iconImage,
      (type, args) => new RememberMoveModifier(type, (args[0] as PlayerPokemon).id, args[1] as number),
      (pokemon: PlayerPokemon) => {
        if (!pokemon.getLearnableLevelMoves().length) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
      group,
    );
  }
}

export class MaxIvModifierType extends PokemonModifierType {
  private readonly stat: Stat;

  constructor(localeKey: string, iconImage: string, stat: Stat, group?: string) {
    super(
      localeKey,
      iconImage,
      (type, args) => new MaxIvModifier(type, (args[0] as PlayerPokemon).id, stat),
      (pokemon: PlayerPokemon): string | null => {
        return pokemon.ivs[stat] < 31 ? null : PartyUiHandler.NoEffectMessage;
      },
      group,
    );

    this.stat = stat;
  }

  get name(): string {
    return i18next.t("modifierType:ModifierType.MaxIvModifierType.name", {
      stat: i18next.t(getStatKey(this.stat)), // 혹은 stat 이름을 직접 넘김
    });
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.MaxIvModifierType.description", {
      stat: i18next.t(getStatKey(this.stat), { context: "josa-ga" }), // 조사 포함
    });
  }
}

export class MaxAllIvModifierType extends PokemonModifierType {
  constructor(localeKey: string, iconImage: string, group?: string) {
    super(
      localeKey,
      iconImage,
      (type, args) => new MaxAllIvModifier(type, (args[0] as PlayerPokemon).id),
      (pokemon: PlayerPokemon): string | null => {
        // 모든 스탯이 이미 31이면 효과 없음
        const hasBelowMaxIv = PERMANENT_STATS.some(stat => pokemon.ivs[stat] < 31);
        return hasBelowMaxIv ? null : PartyUiHandler.NoEffectMessage;
      },
      group,
    );
  }

  get name(): string {
    return i18next.t("modifierType:ModifierType.MaxAllIvModifierType.name");
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.MaxAllIvModifierType.description");
  }
}

export class ChangeAbilityModifierType extends PokemonModifierType {
  constructor(localeKey: string, iconImage: string, group?: string) {
    super(
      localeKey,
      iconImage,
      (type, args) => {
        if (!args[0]) {
          throw new Error("ChangeAbilityModifierType: 포켓몬이 선택되지 않았습니다.");
        }
        return new ChangeAbilityModifier(type, (args[0] as PlayerPokemon).id);
      },
      (_pokemon: PlayerPokemon): string | null => null,
      group,
    );
  }

  get name(): string {
    return i18next.t("modifierType:ModifierType.ChangeAbilityModifierType.name");
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.ChangeAbilityModifierType.description");
  }
}

export class RegisterAbilityModifierType extends PokemonModifierType {
  constructor(localeKey: string, iconImage: string, group?: string) {
    super(
      localeKey,
      iconImage,
      // Modifier 생성 함수
      (type, args) => new RegisterAbilityModifier(type, (args[0] as PlayerPokemon).id, args[1] as ChangeAbilityType),

      // isDisabled 함수: 항상 적용 가능하게 설정
      (_pokemon: PlayerPokemon): string | null => null,

      group,
    );
  }

  get name(): string {
    // i18next.t()로 로컬라이징된 텍스트가 제대로 반환되는지 로그로 확인
    const localizedName = i18next.t("modifierType:ModifierType.RegisterAbilityModifierType.name");
    return localizedName;
  }

  getDescription(): string {
    // i18next.t()로 로컬라이징된 설명이 제대로 반환되는지 로그로 확인
    const localizedDescription = i18next.t("modifierType:ModifierType.RegisterAbilityModifierType.description");
    return localizedDescription;
  }
}

export class DoubleBattleChanceBoosterModifierType extends ModifierType {
  private maxBattles: number;

  constructor(localeKey: string, iconImage: string, maxBattles: number) {
    super(localeKey, iconImage, (_type, _args) => new DoubleBattleChanceBoosterModifier(this, maxBattles), "lure");

    this.maxBattles = maxBattles;
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.DoubleBattleChanceBoosterModifierType.description", {
      battleCount: this.maxBattles,
    });
  }
}

export class WeatherRockTrainerModifierType
  extends ModifierType
  implements GeneratedPersistentModifierType
{
  private weatherType: WeatherType;
  private nameKey: string;
  private duration: number;

  constructor(weatherType: WeatherType) {
    const nameKey = WeatherRockTrainerModifierTypeGenerator.items[weatherType];
    super(
      "weather_rock_trainer",
      nameKey,
      (_type, _args) => new WeatherRockTrainerModifier(_type, weatherType, 10),
      "trainer",
    );

    this.weatherType = weatherType;
    this.nameKey = nameKey;
    this.duration = 10;
  }

  getMaxStackCount() {
    return 1;
  }

  get name(): string {
    return i18next.t(`modifierType:WeatherRockTrainer.${this.nameKey}`);
  }

  getDescription(): string {
  const weatherNameKeyMap: Record<WeatherType, string> = {
    [WeatherType.SUNNY]: "sunny",
    [WeatherType.RAIN]: "rain",
    [WeatherType.SANDSTORM]: "sandstorm",
    [WeatherType.SNOW]: "snow",
    [WeatherType.NONE]: "none",
  };

  const weatherNameKey = weatherNameKeyMap[this.weatherType] ?? "none";
  const translatedWeather = i18next.t(`arenaFlyout:${weatherNameKey}`); // ✅ 정식 경로

  console.log("weather key:", weatherNameKey);
  console.log("translated weather:", translatedWeather);

  return i18next.t("modifierType:ModifierType.WeatherRockTrainerModifierType.description", {
    weather: translatedWeather,
    turns: this.duration,
  });
}

  getPregenArgs(): any[] {
    return [this.weatherType];
  }
}

export class TerrainSeedTrainerModifierType
  extends ModifierType
  implements GeneratedPersistentModifierType
{
  private terrainType: TerrainType;
  private nameKey: string;
  private duration: number;

  constructor(terrainType: TerrainType) {
    const nameKey = TerrainSeedTrainerModifierTypeGenerator.items[terrainType];
    super(
      "terrain_seed_trainer",
      nameKey,
      (_type, _args) => new TerrainSeedTrainerModifier(_type, terrainType, 10),
      "trainer",
    );

    this.terrainType = terrainType;
    this.nameKey = nameKey;
    this.duration = 10;
  }

  getMaxStackCount() {
    return 1;
  }

  get name(): string {
    return i18next.t(`modifierType:TerrainSeedTrainer.${this.nameKey}`);
  }

  getDescription(): string {
    const terrainNameKeyMap: Record<TerrainType, string> = {
      [TerrainType.MISTY]: "misty",
      [TerrainType.ELECTRIC]: "electric",
      [TerrainType.GRASSY]: "grassy",
      [TerrainType.PSYCHIC]: "psychic",
      [TerrainType.NONE]: "none",
    };

    const terrainNameKey = terrainNameKeyMap[this.terrainType] ?? "none";
    const translatedTerrain = i18next.t(`arenaFlyout:${terrainNameKey}`);

    console.log("terrain key:", terrainNameKey);
    console.log("translated terrain:", translatedTerrain);

    return i18next.t("modifierType:ModifierType.TerrainSeedTrainerModifierType.description", {
      terrain: translatedTerrain,
      turns: this.duration,
    });
  }

  getPregenArgs(): any[] {
    return [this.terrainType];
  }
}

export class TempStatStageBoosterModifierType extends ModifierType implements GeneratedPersistentModifierType {
  private stat: TempBattleStat;
  private nameKey: string;
  private quantityKey: string;

  constructor(stat: TempBattleStat) {
    const nameKey = TempStatStageBoosterModifierTypeGenerator.items[stat];
    super("", nameKey, (_type, _args) => new TempStatStageBoosterModifier(this, this.stat, 5));

    this.stat = stat;
    this.nameKey = nameKey;
    this.quantityKey = stat !== Stat.ACC ? "percentage" : "stage";
  }

  get name(): string {
    return i18next.t(`modifierType:TempStatStageBoosterItem.${this.nameKey}`);
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.TempStatStageBoosterModifierType.description", {
      stat: i18next.t(getStatKey(this.stat)),
      amount: i18next.t(`modifierType:ModifierType.TempStatStageBoosterModifierType.extra.${this.quantityKey}`),
    });
  }

  getPregenArgs(): any[] {
    return [this.stat];
  }
}

export class BerryModifierType extends PokemonHeldItemModifierType implements GeneratedPersistentModifierType {
  private berryType: BerryType;

  constructor(berryType: BerryType) {
    super(
      "",
      `${BerryType[berryType].toLowerCase()}_berry`,
      (type, args) => new BerryModifier(type, (args[0] as Pokemon).id, berryType),
      "berry",
    );

    this.berryType = berryType;
    this.id = "BERRY"; // needed to prevent harvest item deletion; remove after modifier rework
  }

  get name(): string {
    return getBerryName(this.berryType);
  }

  getDescription(): string {
    return getBerryEffectDescription(this.berryType);
  }

  getPregenArgs(): any[] {
    return [this.berryType];
  }
}

enum AttackTypeBoosterItem {
  SILK_SCARF,
  BLACK_BELT,
  SHARP_BEAK,
  POISON_BARB,
  SOFT_SAND,
  HARD_STONE,
  SILVER_POWDER,
  SPELL_TAG,
  METAL_COAT,
  CHARCOAL,
  MYSTIC_WATER,
  MIRACLE_SEED,
  MAGNET,
  TWISTED_SPOON,
  NEVER_MELT_ICE,
  DRAGON_FANG,
  BLACK_GLASSES,
  FAIRY_FEATHER,
}

export class AttackTypeBoosterModifierType
  extends PokemonHeldItemModifierType
  implements GeneratedPersistentModifierType
{
  public moveType: PokemonType;
  public boostPercent: number;

  constructor(moveType: PokemonType, boostPercent: number) {
    super(
      "",
      `${AttackTypeBoosterItem[moveType]?.toLowerCase()}`,
      (_type, args) => new AttackTypeBoosterModifier(this, (args[0] as Pokemon).id, moveType, boostPercent),
    );

    this.moveType = moveType;
    this.boostPercent = boostPercent;
  }

  get name(): string {
    return i18next.t(`modifierType:AttackTypeBoosterItem.${AttackTypeBoosterItem[this.moveType]?.toLowerCase()}`);
  }

  getDescription(): string {
    // TODO: Need getTypeName?
    return i18next.t("modifierType:ModifierType.AttackTypeBoosterModifierType.description", {
      moveType: i18next.t(`pokemonInfo:type.${toCamelCase(PokemonType[this.moveType])}`),
    });
  }

  getPregenArgs(): any[] {
    return [this.moveType];
  }
}

enum TypeSpecificMoveBoosterItem {
  NORMAL_GEM,
  FIGHTING_GEM,
  FLYING_GEM,
  POISON_GEM,
  GROUND_GEM,
  ROCK_GEM,
  BUG_GEM,
  GHOST_GEM,
  STEEL_GEM,
  FIRE_GEM,
  WATER_GEM,
  GRASS_GEM,
  ELECTRIC_GEM,
  PSYCHIC_GEM,
  ICE_GEM,
  DRAGON_GEM,
  DARK_GEM,
  FAIRY_GEM,
}

export class TypeSpecificMoveBoosterModifierType
  extends PokemonHeldItemModifierType
  implements GeneratedPersistentModifierType
{
  public moveType: Type;
  public boostPercent: number;

  constructor(moveType: Type, boostPercent: number) {
    super(
      "",
      `${TypeSpecificMoveBoosterItem[moveType]?.toLowerCase()}`,
      (_type, args) => new TypeSpecificMoveBoosterModifier(this, (args[0] as Pokemon).id, moveType, boostPercent),
    );

    this.moveType = moveType;
    this.boostPercent = boostPercent;
  }

  get name(): string {
    return i18next.t(
      `modifierType:TypeSpecificMoveBoosterItem.${TypeSpecificMoveBoosterItem[this.moveType]?.toLowerCase()}`,
    );
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.TypeSpecificMoveBoosterModifierType.description", {
      moveType: i18next.t(`pokemonInfo:Type.${PokemonType[this.moveType]}`),
    });
  }

  getPregenArgs(): any[] {
    return [this.moveType];
  }
}

export class CategoryPowerBoostModifierType extends PokemonHeldItemModifierType
  implements GeneratedPersistentModifierType {
  public category: MoveCategory;
  public multiplier: number;

  constructor(category: MoveCategory, multiplier: number = 2) {
    super(
      "",
      `cat_power_${MoveCategory[category].toLowerCase()}`,
      (_type, args) => new CategoryPowerBoostModifier(this, (args[0] as Pokemon).id, category, multiplier),
    );

    this.category = category;
    this.multiplier = multiplier;
  }

  get name(): string {
    // 번역키는 너 프로젝트에 맞춰 조정
    return i18next.t("modifierType:CategoryPowerBoost.name", {
      category: i18next.t(`moveCategory:${MoveCategory[this.category].toLowerCase()}`),
    });
  }

  getDescription(): string {
    return i18next.t("modifierType:CategoryPowerBoost.description", {
      category: i18next.t(`moveCategory:${MoveCategory[this.category].toLowerCase()}`),
      multiplier: this.multiplier,
    });
  }

  getPregenArgs(): any[] {
    return [this.category, this.multiplier];
  }
}

export type SpeciesStatBoosterItem = keyof typeof SpeciesStatBoosterModifierTypeGenerator.items;

/**
 * Modifier type for {@linkcode SpeciesStatBoosterModifier}
 * @extends PokemonHeldItemModifierType
 * @implements GeneratedPersistentModifierType
 */
export class SpeciesStatBoosterModifierType
  extends PokemonHeldItemModifierType
  implements GeneratedPersistentModifierType
{
  public key: SpeciesStatBoosterItem;

  constructor(key: SpeciesStatBoosterItem) {
    const item = SpeciesStatBoosterModifierTypeGenerator.items[key];

    super(
  `modifierType:SpeciesBoosterItem.${key}`,
  key.toLowerCase(),
  (type, args) => {
        console.error("[SBOO_FACTORY_TYPE]", {
          ctorKeyParam: key,
          type_ctor: type?.constructor?.name,
          type_id: (type as any)?.id,
          type_localeKey: (type as any)?.localeKey,
          type_keyProp: (type as any)?.key,
          type_pregen0: (type as any)?.getPregenArgs?.()?.[0],
          argsLen: Array.isArray(args) ? args.length : null,
        });

        const normalizeSbooKey = (raw: any): SpeciesStatBoosterItem | undefined => {
          if (typeof raw !== "string") return undefined;
          const marker = "modifierType:SpeciesBoosterItem.";
          let s = raw;
          if (s.startsWith(marker)) s = s.slice(marker.length);
          if (s.includes(".")) s = s.split(".").pop()!;
          return s as SpeciesStatBoosterItem;
        };

        // ✅ NEW PATH
        const a0: any = args?.[0];
        if (a0 && typeof a0 === "object" && "id" in a0) {
          const pokemon = a0 as Pokemon;
          const stackCount = args?.[1] as number | undefined;

          return new SpeciesStatBoosterModifier(
            type,
            pokemon.id,
            item.stats,
            item.multiplier,
            item.species,
            item.postSummon,
            item.windMoveMult,
            item.effectChanceMult,
            item.poisonedTargetMoveMult,
            item.guaranteedPoisonOnHit,
            item.guaranteedPoisonType,
            key,
            undefined,
            stackCount,
            undefined,
          );
        }

        // ✅ RESTORE PATH
        const arr = Array.isArray(args) ? args : [];

        const keyFromArgs =
          typeof arr[11] === "string" ? normalizeSbooKey(arr[11]) : undefined;

        const rawKeyFromType =
          (type as any)?.key ??
          (type as any)?.getPregenArgs?.()?.[0] ??
          (type as any)?.id;

        const keyFromType = normalizeSbooKey(rawKeyFromType);

        const finalKey = (keyFromArgs ?? keyFromType ?? key) as SpeciesStatBoosterItem;

        const pokemonId  = arr[0] as number;
        const stats      = arr[1] as Stat[];
        const mult       = arr[2] as number;
        const stackCount = arr[3] as number | undefined;

        const species    = arr[4] as SpeciesId[];
        const postSummon = arr[5] as any;
        const wind       = arr[6] as number | undefined;
        const effChance  = arr[7] as number | undefined;
        const pMult      = arr[8] as number | undefined;
        const gOnHit     = arr[9] as boolean | undefined;
        const gType      = arr[10] as StatusEffect | undefined;

        const evasiveFromArgs =
          typeof arr[12] === "number" ? (arr[12] as number) : undefined;

        const critFlagFromArgs =
          typeof arr[13] === "boolean" ? (arr[13] as boolean) : undefined;

        return new SpeciesStatBoosterModifier(
  type,
  pokemonId,
  item.stats,
  item.multiplier,
  item.species,
  item.postSummon,
  item.windMoveMult,
  item.effectChanceMult,
  item.poisonedTargetMoveMult,
  item.guaranteedPoisonOnHit,
  item.guaranteedPoisonType,
  key,
  item.evasiveAccDebuffPercent,

  item.allMovePowerMult,          // ✅ 여기로 전달

  item.poisonedTargetCritDamageMult,
  stackCount,
  item.poisonedTargetGuaranteedCrit,
  item.confusionSelfDamageMult,
);
      },
    );
    (this as any).id = `modifierType:SpeciesBoosterItem.${key}`;
    this.key = key;
  }

  getPregenArgs(): any[] {
    return [this.key];
  }
}

export class PokemonLevelIncrementModifierType extends PokemonModifierType {
  constructor(localeKey: string, iconImage: string) {
    super(
      localeKey,
      iconImage,
      (_type, args) => new PokemonLevelIncrementModifier(this, (args[0] as PlayerPokemon).id),
      (_pokemon: PlayerPokemon) => null,
    );
  }

  getDescription(): string {
    let levels = 1;
    const hasCandyJar = globalScene.modifiers.find(modifier => modifier instanceof LevelIncrementBoosterModifier);
    if (hasCandyJar) {
      levels += hasCandyJar.stackCount;
    }
    return i18next.t("modifierType:ModifierType.PokemonLevelIncrementModifierType.description", { levels });
  }
}

export class AllPokemonLevelIncrementModifierType extends ModifierType {
  constructor(localeKey: string, iconImage: string) {
    super(localeKey, iconImage, (_type, _args) => new PokemonLevelIncrementModifier(this, -1));
  }

  getDescription(): string {
    let levels = 1;
    const hasCandyJar = globalScene.modifiers.find(modifier => modifier instanceof LevelIncrementBoosterModifier);
    if (hasCandyJar) {
      levels += hasCandyJar.stackCount;
    }
    return i18next.t("modifierType:ModifierType.AllPokemonLevelIncrementModifierType.description", { levels });
  }
}

export class BaseStatBoosterModifierType
  extends PokemonHeldItemModifierType
  implements GeneratedPersistentModifierType
{
  private stat: PermanentStat;
  private key: string;

  constructor(stat: PermanentStat) {
    const key = BaseStatBoosterModifierTypeGenerator.items[stat];
    super("", key, (_type, args) => new BaseStatModifier(this, (args[0] as Pokemon).id, this.stat));

    this.stat = stat;
    this.key = key;
  }

  get name(): string {
    return i18next.t(`modifierType:BaseStatBoosterItem.${this.key}`);
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.BaseStatBoosterModifierType.description", {
      stat: i18next.t(getStatKey(this.stat)),
    });
  }

  getPregenArgs(): any[] {
    return [this.stat];
  }
}

/**
 * Shuckle Juice item
 */
export class PokemonBaseStatTotalModifierType
  extends PokemonHeldItemModifierType
  implements GeneratedPersistentModifierType
{
  private readonly statModifier: 10 | -15;

  constructor(statModifier: 10 | -15) {
    super(
      statModifier > 0
        ? "modifierType:ModifierType.MYSTERY_ENCOUNTER_SHUCKLE_JUICE_GOOD"
        : "modifierType:ModifierType.MYSTERY_ENCOUNTER_SHUCKLE_JUICE_BAD",
      statModifier > 0 ? "berry_juice_good" : "berry_juice_bad",
      (_type, args) => new PokemonBaseStatTotalModifier(this, (args[0] as Pokemon).id, statModifier),
    );
    this.statModifier = statModifier;
  }

  override getDescription(): string {
    return this.statModifier > 0
      ? i18next.t("modifierType:ModifierType.MYSTERY_ENCOUNTER_SHUCKLE_JUICE_GOOD.description")
      : i18next.t("modifierType:ModifierType.MYSTERY_ENCOUNTER_SHUCKLE_JUICE_BAD.description");
  }

  public getPregenArgs(): any[] {
    return [this.statModifier];
  }
}

class AllPokemonFullHpRestoreModifierType extends ModifierType {
  private descriptionKey: string;

  constructor(localeKey: string, iconImage: string, descriptionKey?: string, newModifierFunc?: NewModifierFunc) {
    super(
      localeKey,
      iconImage,
      newModifierFunc || ((_type, _args) => new PokemonHpRestoreModifier(this, -1, 0, 100, false)),
    );

    this.descriptionKey = descriptionKey!; // TODO: is this bang correct?
  }

  getDescription(): string {
    return i18next.t(
      `${this.descriptionKey || "modifierType:ModifierType.AllPokemonFullHpRestoreModifierType"}.description` as any,
    );
  }
}

class AllPokemonFullReviveModifierType extends AllPokemonFullHpRestoreModifierType {
  constructor(localeKey: string, iconImage: string) {
    super(
      localeKey,
      iconImage,
      "modifierType:ModifierType.AllPokemonFullReviveModifierType",
      (_type, _args) => new PokemonHpRestoreModifier(this, -1, 0, 100, false, true),
    );
    this.group = "revive";
  }
}

export class MoneyRewardModifierType extends ModifierType {
  private moneyMultiplier: number;
  private moneyMultiplierDescriptorKey: string;

  constructor(localeKey: string, iconImage: string, moneyMultiplier: number, moneyMultiplierDescriptorKey: string) {
    super(localeKey, iconImage, (_type, _args) => new MoneyRewardModifier(this, moneyMultiplier), "money", "se/buy");

    this.moneyMultiplier = moneyMultiplier;
    this.moneyMultiplierDescriptorKey = moneyMultiplierDescriptorKey;
  }

  getDescription(): string {
    const moneyAmount = new NumberHolder(globalScene.getWaveMoneyAmount(this.moneyMultiplier));
    globalScene.applyModifiers(MoneyMultiplierModifier, true, moneyAmount);
    const formattedMoney = formatMoney(globalScene.moneyFormat, moneyAmount.value);

    return i18next.t("modifierType:ModifierType.MoneyRewardModifierType.description", {
      moneyMultiplier: i18next.t(this.moneyMultiplierDescriptorKey as any),
      moneyAmount: formattedMoney,
    });
  }
}

export class ExpBoosterModifierType extends ModifierType {
  private boostPercent: number;

  constructor(localeKey: string, iconImage: string, boostPercent: number) {
    super(localeKey, iconImage, () => new ExpBoosterModifier(this, boostPercent));

    this.boostPercent = boostPercent;
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.ExpBoosterModifierType.description", {
      boostPercent: this.boostPercent,
    });
  }
}

export class PokemonExpBoosterModifierType extends PokemonHeldItemModifierType {
  private boostPercent: number;

  constructor(localeKey: string, iconImage: string, boostPercent: number) {
    super(
      localeKey,
      iconImage,
      (_type, args) => new PokemonExpBoosterModifier(this, (args[0] as Pokemon).id, boostPercent),
    );

    this.boostPercent = boostPercent;
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.PokemonExpBoosterModifierType.description", {
      boostPercent: this.boostPercent,
    });
  }
}

export class PokemonFriendshipBoosterModifierType extends PokemonHeldItemModifierType {
  constructor(localeKey: string, iconImage: string) {
    super(localeKey, iconImage, (_type, args) => new PokemonFriendshipBoosterModifier(this, (args[0] as Pokemon).id));
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.PokemonFriendshipBoosterModifierType.description");
  }
}

export class PokemonMoveAccuracyBoosterModifierType extends PokemonHeldItemModifierType {
  private amount: number;

  constructor(localeKey: string, iconImage: string, amount: number, group?: string, soundName?: string) {
    super(
      localeKey,
      iconImage,
      (_type, args) => new PokemonMoveAccuracyBoosterModifier(this, (args[0] as Pokemon).id, amount),
      group,
      soundName,
    );

    this.amount = amount;
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.PokemonMoveAccuracyBoosterModifierType.description", {
      accuracyAmount: this.amount,
    });
  }
}

export class PokemonMultiHitModifierType extends PokemonHeldItemModifierType {
  constructor(localeKey: string, iconImage: string) {
    super(
      localeKey,
      iconImage,
      (type, args) => new PokemonMultiHitModifier(type as PokemonMultiHitModifierType, (args[0] as Pokemon).id),
    );
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.PokemonMultiHitModifierType.description");
  }
}

export class TmModifierType extends PokemonModifierType {
  public moveId: MoveId;

  constructor(moveId: MoveId) {
    super(
      "",
      `tm_${PokemonType[allMoves[moveId].type].toLowerCase()}`,
      (_type, args) => new TmModifier(this, (args[0] as PlayerPokemon).id),
      (pokemon: PlayerPokemon) => {
        if (
          pokemon.compatibleTms.indexOf(moveId) === -1 ||
          pokemon.getMoveset().filter(m => m.moveId === moveId).length
        ) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
      "tm",
    );

    this.moveId = moveId;
  }

  get name(): string {
    return i18next.t("modifierType:ModifierType.TmModifierType.name", {
      moveId: padInt(Object.keys(tmSpecies).indexOf(this.moveId.toString()) + 1, 3),
      moveName: allMoves[this.moveId].name,
    });
  }

  getDescription(): string {
    return i18next.t(
      globalScene.enableMoveInfo
        ? "modifierType:ModifierType.TmModifierTypeWithInfo.description"
        : "modifierType:ModifierType.TmModifierType.description",
      { moveName: allMoves[this.moveId].name },
    );
  }
}

export class TrModifierType extends PokemonModifierType {
  public moveId: MoveId;

  constructor(moveId: MoveId) {
    super(
      "",
      `tr_${PokemonType[allMoves[moveId].type].toLowerCase()}`,
      (_type, args) => new TrModifier(this, (args[0] as PlayerPokemon).id),
      (pokemon: PlayerPokemon) => {
        // 🔧 compatibleTrs는 maxmovesSpecies 기반으로 세팅되어 있어야 함
        if (
          pokemon.compatibleTrs.indexOf(moveId) === -1 ||
          pokemon.getMoveset().some(m => m.moveId === moveId)
        ) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
      "tr",
    );
    this.moveId = moveId;
  }

  get name(): string {
    return i18next.t("modifierType:ModifierType.TrModifierType.name", {
      moveId: padInt(Object.keys(maxmovesSpecies).indexOf(this.moveId.toString()) + 1, 3),
      moveName: allMoves[this.moveId].name,
    });
  }

  getDescription(): string {
    return i18next.t(
      globalScene.enableMoveInfo
        ? "modifierType:ModifierType.TrModifierTypeWithInfo.description"
        : "modifierType:ModifierType.TrModifierType.description",
      { moveName: allMoves[this.moveId].name },
    );
  }
}

export class EvolutionItemModifierType extends PokemonModifierType implements GeneratedPersistentModifierType {
  public evolutionItem: EvolutionItem;

  constructor(evolutionItem: EvolutionItem) {
    super(
      "",
      EvolutionItem[evolutionItem].toLowerCase(),
      (_type, args) => new EvolutionItemModifier(this, (args[0] as PlayerPokemon).id),
      (pokemon: PlayerPokemon) => {
        if (
          pokemonEvolutions.hasOwnProperty(pokemon.species.speciesId) &&
          pokemonEvolutions[pokemon.species.speciesId].filter(e => e.validate(pokemon, false, this.evolutionItem))
            .length &&
          pokemon.getFormKey() !== SpeciesFormKey.GIGANTAMAX
        ) {
          return null;
        }
        if (
          pokemon.isFusion() &&
          pokemon.fusionSpecies &&
          pokemonEvolutions.hasOwnProperty(pokemon.fusionSpecies.speciesId) &&
          pokemonEvolutions[pokemon.fusionSpecies.speciesId].filter(e => e.validate(pokemon, true, this.evolutionItem))
            .length &&
          pokemon.getFusionFormKey() !== SpeciesFormKey.GIGANTAMAX
        ) {
          return null;
        }

        return PartyUiHandler.NoEffectMessage;
      },
    );

    this.evolutionItem = evolutionItem;
  }

  get name(): string {
    return i18next.t(`modifierType:EvolutionItem.${EvolutionItem[this.evolutionItem]}`);
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.EvolutionItemModifierType.description");
  }

  getPregenArgs(): any[] {
    return [this.evolutionItem];
  }
}

/**
 * Class that represents form changing items
 */
export class FormChangeItemModifierType extends PokemonModifierType implements GeneratedPersistentModifierType {
  public formChangeItem: FormChangeItem;

  constructor(formChangeItem: FormChangeItem) {
    super(
      "",
      FormChangeItem[formChangeItem].toLowerCase(),
      (_type, args) => new PokemonFormChangeItemModifier(this, (args[0] as PlayerPokemon).id, formChangeItem, true),
      (pokemon: PlayerPokemon) => {
        // Make sure the Pokemon has alternate forms
        if (
          pokemonFormChanges.hasOwnProperty(pokemon.species.speciesId) &&
          // Get all form changes for this species with an item trigger, including any compound triggers
          pokemonFormChanges[pokemon.species.speciesId]
            .filter(
              fc => fc.trigger.hasTriggerType(SpeciesFormChangeItemTrigger) && fc.preFormKey === pokemon.getFormKey(),
            )
            // Returns true if any form changes match this item
            .flatMap(fc => fc.findTrigger(SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger)
            .flatMap(fc => fc.item)
            .includes(this.formChangeItem)
        ) {
          return null;
        }

        return PartyUiHandler.NoEffectMessage;
      },
    );

    this.formChangeItem = formChangeItem;
  }

  get name(): string {
    return i18next.t(`modifierType:FormChangeItem.${FormChangeItem[this.formChangeItem]}`);
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.FormChangeItemModifierType.description");
  }

  getPregenArgs(): any[] {
    return [this.formChangeItem];
  }
}

export class FusePokemonModifierType extends PokemonModifierType {
  constructor(localeKey: string, iconImage: string) {
    super(
      localeKey,
      iconImage,
      (_type, args) => new FusePokemonModifier(this, (args[0] as PlayerPokemon).id, (args[1] as PlayerPokemon).id),
      (pokemon: PlayerPokemon) => {
        const selectStatus = new BooleanHolder(pokemon.isFusion());
        applyChallenges(ChallengeType.POKEMON_FUSION, pokemon, selectStatus);
        if (selectStatus.value) {
          return PartyUiHandler.NoEffectMessage;
        }
        return null;
      },
    );
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.FusePokemonModifierType.description");
  }
}

class AttackTypeBoosterModifierTypeGenerator extends ModifierTypeGenerator {
  constructor() {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length === 1 && pregenArgs[0] in PokemonType) {
        return new AttackTypeBoosterModifierType(pregenArgs[0] as PokemonType, TYPE_BOOST_ITEM_BOOST_PERCENT);
      }

      const attackMoveTypes = party.flatMap(p =>
        p
          .getMoveset()
          .map(m => m.getMove())
          .filter(m => m.is("AttackMove"))
          .map(m => m.type),
      );
      if (!attackMoveTypes.length) {
        return null;
      }

      const attackMoveTypeWeights = new Map<PokemonType, number>();
      let totalWeight = 0;
      for (const t of attackMoveTypes) {
        if (attackMoveTypeWeights.has(t)) {
          if (attackMoveTypeWeights.get(t)! < 3) {
            // attackMoveTypeWeights.has(t) was checked before
            attackMoveTypeWeights.set(t, attackMoveTypeWeights.get(t)! + 1);
          } else {
            continue;
          }
        } else {
          attackMoveTypeWeights.set(t, 1);
        }
        totalWeight++;
      }

      if (!totalWeight) {
        return null;
      }

      let type: PokemonType;

      const randInt = randSeedInt(totalWeight);
      let weight = 0;

      for (const t of attackMoveTypeWeights.keys()) {
        const typeWeight = attackMoveTypeWeights.get(t)!; // guranteed to be defined
        if (randInt <= weight + typeWeight) {
          type = t;
          break;
        }
        weight += typeWeight;
      }

      return new AttackTypeBoosterModifierType(type!, TYPE_BOOST_ITEM_BOOST_PERCENT);
    });
  }
}

class TypeSpecificMoveBoosterModifierTypeGenerator extends ModifierTypeGenerator {
  constructor() {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      // pregenArgs로 타입이 주어지면 해당 타입을 적용하여 보정 생성
      if (pregenArgs && pregenArgs.length === 1 && pregenArgs[0] in PokemonType) {
        return new TypeSpecificMoveBoosterModifierType(pregenArgs[0] as PokemonType, 20);
      }

      const attackMoveTypes = party.flatMap(p =>
        p
          .getMoveset()
          .map(m => m?.getMove())
          .filter(m => m.is("AttackMove"))
          .map(m => m.type),
      );

      if (!attackMoveTypes.length) {
        return null;
      }

      const attackMoveTypeWeights = new Map<Type, number>();
      let totalWeight = 0;

      // 공격 타입별 가중치 계산
      for (const t of attackMoveTypes) {
        if (attackMoveTypeWeights.has(t)) {
          if (attackMoveTypeWeights.get(t)! < 3) {
            // 각 타입 최대 3번까지만 카운트
            attackMoveTypeWeights.set(t, attackMoveTypeWeights.get(t)! + 1);
          } else {
            continue;
          }
        } else {
          attackMoveTypeWeights.set(t, 1);
        }
        totalWeight++;
      }

      if (!totalWeight) {
        return null;
      }

      let type: Type;

      // 랜덤 타입 선택
      const randInt = randSeedInt(totalWeight);
      let weight = 0;

      for (const t of attackMoveTypeWeights.keys()) {
        const typeWeight = attackMoveTypeWeights.get(t)!;
        if (randInt <= weight + typeWeight) {
          type = t;
          break;
        }
        weight += typeWeight;
      }

      // 해당 타입에 맞는 TypeSpecificMoveBoosterModifier 반환
      return new TypeSpecificMoveBoosterModifierType(type!, 20);
    });
  }
}

class BaseStatBoosterModifierTypeGenerator extends ModifierTypeGenerator {
  public static readonly items: Record<PermanentStat, string> = {
    [Stat.HP]: "hp_up",
    [Stat.ATK]: "protein",
    [Stat.DEF]: "iron",
    [Stat.SPATK]: "calcium",
    [Stat.SPDEF]: "zinc",
    [Stat.SPD]: "carbos",
  };

  constructor() {
    super((_party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs) {
        return new BaseStatBoosterModifierType(pregenArgs[0]);
      }
      const randStat: PermanentStat = randSeedInt(Stat.SPD + 1);
      return new BaseStatBoosterModifierType(randStat);
    });
  }
}

export class WeatherRockTrainerModifierTypeGenerator extends ModifierTypeGenerator {
  public static readonly items: Record<WeatherType, string> = {
    [WeatherType.SUNNY]: "heat_rock",
    [WeatherType.RAIN]: "damp_rock",
    [WeatherType.SANDSTORM]: "smooth_rock",
    [WeatherType.SNOW]: "icy_rock",
  };

  constructor() {
    super((_party, pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length === 1 && typeof pregenArgs[0] === "number") {
        return new WeatherRockTrainerModifierType(pregenArgs[0] as WeatherType);
      }

      const weatherTypes = Object.keys(WeatherRockTrainerModifierTypeGenerator.items)
        .map(Number)
        .filter(v => v > 0);
      const randType = weatherTypes[Math.floor(Math.random() * weatherTypes.length)] as WeatherType;
      return new WeatherRockTrainerModifierType(randType);
    });
  }
}

export class TerrainSeedTrainerModifierTypeGenerator extends ModifierTypeGenerator {
  public static readonly items: Record<TerrainType, string> = {
    [TerrainType.MISTY]: "misty_seed",
    [TerrainType.ELECTRIC]: "electric_seed",
    [TerrainType.GRASSY]: "grassy_seed",
    [TerrainType.PSYCHIC]: "psychic_seed",
  };

  constructor() {
    super((_party, pregenArgs?: any[]) => {
      // 🎯 미리 지정된 TerrainType이 있을 경우 해당 타입 사용
      if (pregenArgs && pregenArgs.length === 1 && typeof pregenArgs[0] === "number") {
        return new TerrainSeedTrainerModifierType(pregenArgs[0] as TerrainType);
      }

      // 🎲 랜덤 TerrainType 선택
      const terrainTypes = Object.keys(TerrainSeedTrainerModifierTypeGenerator.items)
        .map(Number)
        .filter(v => v > 0);
      const randType = terrainTypes[Math.floor(Math.random() * terrainTypes.length)] as TerrainType;

      return new TerrainSeedTrainerModifierType(randType);
    });
  }
}

class TempStatStageBoosterModifierTypeGenerator extends ModifierTypeGenerator {
  public static readonly items: Record<TempBattleStat, string> = {
    [Stat.ATK]: "x_attack",
    [Stat.DEF]: "x_defense",
    [Stat.SPATK]: "x_sp_atk",
    [Stat.SPDEF]: "x_sp_def",
    [Stat.SPD]: "x_speed",
    [Stat.ACC]: "x_accuracy",
  };

  constructor() {
    super((_party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length === 1 && TEMP_BATTLE_STATS.includes(pregenArgs[0])) {
        return new TempStatStageBoosterModifierType(pregenArgs[0]);
      }
      const randStat: TempBattleStat = randSeedInt(Stat.ACC, Stat.ATK);
      return new TempStatStageBoosterModifierType(randStat);
    });
  }
}

// ✅ 1) items 데이터 구조 타입을 먼저 선언 (파일 최상단 or Generator 클래스 위)
type SpeciesStatBoosterItemData = {
  stats: Stat[];
  multiplier: number;
  species: SpeciesId[];
  rare: boolean;
  postSummon?: { stats: Stat[]; stages: number };
};

/**
 * Modifier type generator for {@linkcode SpeciesStatBoosterModifierType}, which
 * encapsulates the logic for weighting the most useful held item from
 * the current list of {@linkcode items}.
 * @extends ModifierTypeGenerator
 */
class SpeciesStatBoosterModifierTypeGenerator extends ModifierTypeGenerator {
  /** Object comprised of the currently available species-based stat boosting held items */
  public static readonly items = {
    LIGHT_BALL: {
      stats: [Stat.ATK, Stat.SPATK],
      multiplier: 2,
      species: [SpeciesId.PIKACHU],
      rare: true,
    },
    THICK_CLUB: {
      stats: [Stat.ATK],
      multiplier: 2,
      species: [SpeciesId.CUBONE, SpeciesId.MAROWAK, SpeciesId.ALOLA_MAROWAK],
      rare: true,
    },
    RARE_BONE: {
      stats: [Stat.SPD],
      multiplier: 2,
      species: [SpeciesId.CUBONE, SpeciesId.MAROWAK, SpeciesId.ALOLA_MAROWAK],
      rare: true,
    },
    METAL_POWDER: {
      stats: [Stat.DEF],
      multiplier: 2,
      species: [SpeciesId.DITTO],
      rare: true,
    },
    QUICK_POWDER: {
      stats: [Stat.SPD],
      multiplier: 2,
      species: [SpeciesId.DITTO],
      rare: true,
    },
    DEEP_SEA_SCALE: {
      stats: [Stat.SPDEF],
      multiplier: 2,
      species: [SpeciesId.CLAMPERL],
      rare: false,
    },
    DEEP_SEA_TOOTH: {
      stats: [Stat.SPATK],
      multiplier: 2,
      species: [SpeciesId.CLAMPERL],
      rare: false,
    },
    ADAMANT_ORB: {
      stats: [Stat.DEF, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.DIALGA],
      rare: false,
    },
    LUSTROUS_ORB: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.PALKIA],
      rare: false,
    },
    GRISEOUS_ORB: {
      stats: [Stat.ATK, Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.GIRATINA],
      rare: false,
    },
    HELIX_FOSSIL: {
      stats: [Stat.SPATK, Stat.SPDEF],
      multiplier: 1.5,
      species: [SpeciesId.OMANYTE, SpeciesId.OMASTAR],
      rare: true,
    },
    DOME_FOSSIL: {
      stats: [Stat.ATK, Stat.DEF],
      multiplier: 1.5,
      species: [SpeciesId.KABUTO, SpeciesId.KABUTOPS],
      rare: true,
    },
    OLD_AMBER: {
      stats: [Stat.ATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.AERODACTYL],
      rare: true,
    },
    ROOT_FOSSIL: {
      stats: [Stat.DEF, Stat.SPDEF],
      multiplier: 1.5,
      species: [SpeciesId.LILEEP, SpeciesId.CRADILY],
      rare: true,
    },
    CLAW_FOSSIL: {
      stats: [Stat.ATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ANORITH, SpeciesId.ARMALDO],
      rare: true,
    },
    SKULL_FOSSIL: {
      stats: [Stat.ATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.CRANIDOS, SpeciesId.RAMPARDOS],
      rare: true,
    },
    ARMOR_FOSSIL: {
      stats: [Stat.DEF, Stat.SPDEF],
      multiplier: 1.5,
      species: [SpeciesId.SHIELDON, SpeciesId.BASTIODON],
      rare: true,
    },
    COVER_FOSSIL: {
      stats: [Stat.ATK, Stat.DEF],
      multiplier: 1.5,
      species: [SpeciesId.TIRTOUGA, SpeciesId.CARRACOSTA],
      rare: true,
    },
    PLUME_FOSSIL: {
      stats: [Stat.ATK, Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ARCHEN, SpeciesId.ARCHEOPS],
      rare: true,
    },
    JAW_FOSSIL: {
      stats: [Stat.ATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.TYRUNT, SpeciesId.TYRANTRUM],
      rare: true,
    },
    SAIL_FOSSIL: {
      stats: [Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.AMAURA, SpeciesId.AURORUS],
      rare: true,
    },
    FOSSILIZED_BIRD: {
      stats: [Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.DRACOZOLT, SpeciesId.ARCTOZOLT],
      rare: true,
    },
    FOSSILIZED_DINO: {
      stats: [Stat.ATK],
      multiplier: 1.5,
      species: [SpeciesId.DRACOZOLT, SpeciesId.DRACOVISH],
      rare: true,
    },
    FOSSILIZED_DRAKE: {
      stats: [Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ARCTOVISH, SpeciesId.DRACOVISH], 
      rare: true,
    },
    FOSSILIZED_FISH: {
      stats: [Stat.ATK],
      multiplier: 1.5,
      species: [SpeciesId.ARCTOVISH, SpeciesId.ARCTOZOLT],
      rare: true,
    },
    LIGHT_STONE: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.RESHIRAM],
      rare: false,
    },
    DARK_STONE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ZEKROM],
      rare: false,
    },
    GOD_STONE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.KYUREM],
      rare: false,
    },
    ODD_KEYSTONE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF],
      multiplier: 1.5,
      species: [SpeciesId.SPIRITOMB],
      rare: true,
    },
    MOON_FLUTE: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.LUNALA],
      rare: false,
    },
    SUN_FLUTE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.SOLGALEO],
      rare: false,
    },
    SILVER_WING: {
      stats: [Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.LUGIA],
      rare: false,
    },
    RAINBOW_WING: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.HO_OH],
      rare: false,
    },
    SOUL_DEW: {
      stats: [Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.LATIAS, SpeciesId.LATIOS],
      rare: false,
    },
    MAGMA_STONE: {
      stats: [Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.HEATRAN],
      rare: false,
    },
    LIFES_FLOWER: {
      stats: [Stat.ATK, Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.XERNEAS],
      rare: false,
    },
    OBLIVION_WINGS: {
      stats: [Stat.ATK, Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.YVELTAL],
      rare: false,
    },
    ZYGARDE_CUBE: {
      stats: [Stat.ATK, Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ZYGARDE],
      rare: false,
    },
    ENIGMA_STONE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.DIANCIE],
      rare: false,
    },
    ALPHA_SAPPHIRE: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.KYOGRE],
      rare: false,
    },
    OMEGA_RUBY: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.GROUDON],
      rare: false,
    },
    DELTA_FLUTE: {
      stats: [Stat.ATK, Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.RAYQUAZA],
      rare: false,
    },
    ICEROOT_CARROT: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.GLASTRIER],
      rare: false,
    },
    SHADEROOT_CARROT: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.SPECTRIER],
      rare: false,
    },
    METEORITE_SHARD: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.JIRACHI],
      rare: false,
    },
    METEORITE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.DEOXYS],
      rare: false,
    },
    NORMAL_MEMORY: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.TYPE_NULL, SpeciesId.SILVALLY],
      rare: false,
    },
    BLANK_PLATE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ARCEUS],
      rare: false,
    },
    RADIANT_PETAL: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.CALYREX],
      rare: false,
    },
    BLIZZARD_FEATHER: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ARTICUNO],
      rare: false,
    },
    THUNDER_FEATHER: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ZAPDOS],
      rare: false,
    },
    BLAZE_FEATHER: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.MOLTRES],
      rare: false,
    },
    MUTATION_SAMPLE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.MEWTWO],
      rare: false,
    },
    NEO_SAMPLE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.MEW],
      rare: false,
    },
    LIGHTNING_MANE: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.RAIKOU],
      rare: false,
    },
    MAGMA_MANE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ENTEI],
      rare: false,
    },
    AURORA_MANE: {
      stats: [Stat.DEF, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.SUICUNE],
      rare: false,
    },
    GREEN_WATCH: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.CELEBI],
      rare: false,
    },
    ROCK_MILESTONE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPDEF],
      multiplier: 1.5,
      species: [SpeciesId.REGIROCK],
      rare: false,
    },
    ICE_MILESTONE: {
      stats: [Stat.DEF, Stat.SPATK, Stat.SPDEF],
      multiplier: 1.5,
      species: [SpeciesId.REGICE],
      rare: false,
    },
    STEEL_MILESTONE: {
      stats: [Stat.DEF, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.REGISTEEL],
      rare: false,
    },
    KNOWLEDGE_GEM: {
      stats: [Stat.DEF, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.UXIE],
      rare: false,
    },
    EMOTION_GEM: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.MESPRIT],
      rare: false,
    },
    WILLPOWER_GEM: {
      stats: [Stat.ATK, Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.AZELF],
      rare: false,
    },
    GIANT_MILESTONE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.REGIGIGAS],
      rare: false,
    },
    LUNAR_WING: {
      stats: [Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.CRESSELIA],
      rare: false,
    },
    RAPIDS_SYMBOL: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.PHIONE],
      rare: false,
    },
    WAVE_SYMBOL: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.MANAPHY],
      rare: false,
    },
    NIGHTMARE_SYMBOLE: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.DARKRAI],
      rare: false,
      sleepingTargetMoveMult: 1.3,
    },
    COBALT_SWORD: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.COBALION],
      rare: false,
    },
    TERRACOTTA_AXE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.TERRAKION],
      rare: false,
    },
    VIRIDIAN_KNIFE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.VIRIZION],
      rare: false,
    },
    RESOLVE_BLADE: {
      stats: [Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.KELDEO],
      rare: false,
    },
    CYCLONE_FAN: {
      stats: [Stat.ATK, Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.TORNADUS],
      rare: false,
      postSummon: { mode: "HIGHEST", stages: 1 },
      windMoveMult: 1.5,
    },
    BOLT_STRIKE_FAN: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.THUNDURUS],
      rare: false,
      postSummon: { mode: "HIGHEST", stages: 1 },
      windMoveMult: 1.5,
    },
    ABUNDANCE_FAN: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.LANDORUS],
      rare: false,
      postSummon: { mode: "HIGHEST", stages: 1 },
      windMoveMult: 1.5,
    },
    SPRINGTIDE_FAN: {
      stats: [Stat.DEF, Stat.SPATK, Stat.SPDEF],
      multiplier: 1.5,
      species: [SpeciesId.ENAMORUS],
      rare: false,
      postSummon: { mode: "HIGHEST", stages: 1 },
      windMoveMult: 1.5,
    },
    MELODY_SYMBOL: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.MELOETTA],
      rare: false,
    },
    GENE_DRIVE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.GENESECT],
      rare: false,
    },
    VOLCANIC_RING: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.VOLCANION],
      rare: false,
    },
    KOKO_FLOWER: {
      stats: [Stat.ATK, Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.TAPU_KOKO],
      rare: false,
    },
    LELE_FLOWER: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.TAPU_LELE],
      rare: false,
    },
    BULU_FLOWER: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.TAPU_BULU],
      rare: false,
    },
    FINI_FLOWER: {
      stats: [Stat.DEF, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.TAPU_FINI],
      rare: false,
    },
    PRISM_CORE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.NECROZMA],
      rare: false,
    },
    ANTIQUE_GEAR: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.MAGEARNA],
      rare: false,
    },
    SHADE_CAPE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.MARSHADOW],
      rare: false,
    },
    THUNDERCLAP_CLAW: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ZERAORA],
      rare: false,
    },
    ANTIQUE_NUT: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.MELTAN, SpeciesId.MELMETAL],
      rare: false,
    },
    WARRIOR_SWORD: {
  stats: [Stat.ATK, Stat.DEF, Stat.SPD],
  multiplier: 1.5,
  species: [SpeciesId.ZACIAN],
  rare: false,

  // ✅ 추가: 등장 시 1랭 상승 (이번 소환 1회)
  postSummon: { stats: [Stat.SPD], stages: 1 },
},

WARRIOR_SHIELD: {
  stats: [Stat.DEF, Stat.SPDEF, Stat.SPD],
  multiplier: 1.5,
  species: [SpeciesId.ZAMAZENTA],
  rare: false,

  // ✅ 추가: 등장 시 1랭 상승 (이번 소환 1회)
  postSummon: { stats: [Stat.SPDEF], stages: 1 },
},
    ETERNAL_HOLE: {
      stats: [Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ETERNATUS],
      rare: false,
    },
    WUSHU_BELT: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.URSHIFU],
      rare: false,
    },
    JUNGLE_CAPE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.ZARUDE],
      rare: false,
    },
    ELEKI_MILESTONE: {
      stats: [Stat.ATK, Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.REGIELEKI],
      rare: false,
    },
    DRAGO_MILESTONE: {
      stats: [Stat.ATK, Stat.SPATK, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.REGIDRAGO],
      rare: false,
    },
    SCALET_SCALE: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.KORAIDON],
      rare: false,
    },
    HADRON_SCALE: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.MIRAIDON],
      rare: false,
    },
    MALIGNANT_CHAINS: {
  stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
  multiplier: 1.5,
  species: [SpeciesId.OKIDOGI, SpeciesId.MUNKIDORI, SpeciesId.FEZANDIPITI],
  rare: false,

  // ✅ 추가
  poisonedTargetMoveMult: 1.3,
  guaranteedPoisonOnHit: true,
  guaranteedPoisonType: StatusEffect.TOXIC, // 네 enum명이 다르면 그 이름으로
},
    CRYSTAL_CLUSTER: {
  stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
  multiplier: 1.5,
  species: [SpeciesId.TERAPAGOS],
  allMovePowerMult: 2,      // ✅ 추가
  ignoreTypeImmunity: true, // ✅ 관통
  rare: false,
},
    REDMOON_STONE: {
      stats: [Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.BLOODMOON_URSALUNA],
      rare: false,
    },
    CRUEL_FEATHER: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.GALAR_ARTICUNO],
      rare: false,
    },
    STRONG_FEATHER: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.GALAR_ZAPDOS],
      rare: false,
    },
    MALEVOLENT_FEATHER: {
      stats: [Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.GALAR_MOLTRES],
      rare: false,
    },
    ODD_JAR: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.HOOPA],
      rare: false,
    },
    MYTHICAL_PECHA_BERRY: {
      stats: [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      multiplier: 1.5,
      species: [SpeciesId.PECHARUNT],
      rare: false,
    },
  };

  constructor(rare: boolean) {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      const items = SpeciesStatBoosterModifierTypeGenerator.items;
      if (pregenArgs && pregenArgs.length === 1 && pregenArgs[0] in items) {
        return new SpeciesStatBoosterModifierType(pregenArgs[0] as SpeciesStatBoosterItem);
      }

      // Get a pool of items based on the rarity.
      const keys: (keyof SpeciesStatBoosterItem)[] = [];
      const values: (typeof items)[keyof typeof items][] = [];
      const weights: number[] = [];
      for (const [key, val] of Object.entries(SpeciesStatBoosterModifierTypeGenerator.items)) {
        if (val.rare !== rare) {
          continue;
        }
        values.push(val);
        keys.push(key as keyof SpeciesStatBoosterItem);
        weights.push(0);
      }

      for (const p of party) {
        const speciesId = p.getSpeciesForm(true).speciesId;
        const fusionSpeciesId = p.isFusion() ? p.getFusionSpeciesForm(true).speciesId : null;
        // TODO: Use commented boolean when Fling is implemented
        const hasFling = false; /* p.getMoveset(true).some(m => m.moveId === MoveId.FLING) */

        for (const i in values) {
  const curKey = keys[i];  // ✅ 이 스코프의 키
  const checkedSpecies = values[i].species;
  const checkedStats = values[i].stats;

  const hasItem = p.getHeldItems().some(
    m => m instanceof SpeciesStatBoosterModifier
      && (m as any).getKey?.() === curKey
  );

          if (!hasItem) {
  if (checkedSpecies.includes(speciesId) || (!!fusionSpeciesId && checkedSpecies.includes(fusionSpeciesId))) {
    weights[i]++;
  } else if (checkedSpecies.includes(SpeciesId.PIKACHU) && hasFling) {
    weights[i]++;
  }
}
        }
      }

      let totalWeight = 0;
      for (const weight of weights) {
        totalWeight += weight;
      }

      if (totalWeight !== 0) {
        const randInt = randSeedInt(totalWeight, 1);
        let weight = 0;

        for (const i in weights) {
          if (weights[i] !== 0) {
            const curWeight = weight + weights[i];
            if (randInt <= weight + weights[i]) {
              return new SpeciesStatBoosterModifierType(keys[i] as SpeciesStatBoosterItem);
            }
            weight = curWeight;
          }
        }
      }

      return null;
    });
  }
}

class TmModifierTypeGenerator extends ModifierTypeGenerator {
  constructor(tier: ModifierTier) {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length === 1 && pregenArgs[0] in MoveId) {
        return new TmModifierType(pregenArgs[0] as MoveId);
      }
      const partyMemberCompatibleTms = party.map(p => {
        const previousLevelMoves = p.getLearnableLevelMoves();
        return (p as PlayerPokemon).compatibleTms.filter(
          tm => !p.moveset.find(m => m.moveId === tm) && !previousLevelMoves.find(lm => lm === tm),
        );
      });
      const tierUniqueCompatibleTms = partyMemberCompatibleTms
        .flat()
        .filter(tm => tmPoolTiers[tm] === tier)
        .filter(tm => !allMoves[tm].name.endsWith(" (N)"))
        .filter((tm, i, array) => array.indexOf(tm) === i);
      if (!tierUniqueCompatibleTms.length) {
        return null;
      }
      // TODO: should this use `randSeedItem`?
      const randTmIndex = randSeedInt(tierUniqueCompatibleTms.length);
      return new TmModifierType(tierUniqueCompatibleTms[randTmIndex]);
    });
  }
}

export class TrModifierTypeGenerator extends ModifierTypeGenerator {
  constructor(tier: ModifierTier) {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      console.log("TrModifierTypeGenerator called with tier:", tier);

      // pregenArgs 검사
      if (pregenArgs && pregenArgs.length === 1 && pregenArgs[0] in MoveId) {
        console.log("Using pregenArgs move:", pregenArgs[0]);
        return new TrModifierType(pregenArgs[0] as MoveId);
      }

      // 호환 가능한 TR 목록 수집
      const partyMemberCompatibleTrs = party.map(p => {
        const playerPokemon = p as PlayerPokemon;
        console.log(`compatibleTrs for ${playerPokemon.name}:`, playerPokemon.compatibleTrs);
        return playerPokemon.compatibleTrs.filter(tr => !playerPokemon.moveset.some(m => m.moveId === tr));
      });

      const flattened = partyMemberCompatibleTrs.flat();
      console.log("Flattened compatible TRs:", flattened);

      const filteredByTier = flattened.filter(tr => {
        const tierMatch = trPoolTiers[tr] === tier;
        return tierMatch;
      });
      console.log("Filtered by tier:", filteredByTier);

      const filteredByName = filteredByTier.filter(tr => !allMoves[tr].name.endsWith(" (N)"));
      console.log("Filtered by name:", filteredByName);

      const tierUniqueCompatibleTrs = filteredByName.filter((tr, index, arr) => arr.indexOf(tr) === index);
      console.log("Unique compatible TRs:", tierUniqueCompatibleTrs);

      if (!tierUniqueCompatibleTrs.length) {
        console.warn("No TRs found for tier", tier);
        return null;
      }

      const randTrIndex = randSeedInt(tierUniqueCompatibleTrs.length);
      const selectedTr = tierUniqueCompatibleTrs[randTrIndex];
      console.log("Selected TR index:", randTrIndex, "TR:", selectedTr);

      return new TrModifierType(selectedTr as MoveId);
    });
  }
}

export class ZCrystalMoveModifierTypeGenerator extends ModifierTypeGenerator {
  private isExclusive: boolean;

  constructor(isExclusive: boolean) {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      // 명시적 moveId가 들어온 경우
      if (pregenArgs && pregenArgs.length === 1 && typeof pregenArgs[0] === "number") {
        const moveId = pregenArgs[0] as Moves;
        return isExclusive
          ? new ZExclusiveCrystalMoveModifierType(moveId)
          : new ZGenericCrystalMoveModifierType(moveId);
      }

      // Z링 보유 여부 확인
      const hasAccess = isExclusive
        ? globalScene.getModifiers(ExclusiveZMoveAccessModifier).length > 0
        : globalScene.getModifiers(GenericZMoveAccessModifier).length > 0;

      if (!hasAccess) {
        console.warn(`[Z_${isExclusive ? "EXCLUSIVE" : "GENERIC"}] 액세스 모디파이어가 없어 생성 불가`);
        return null;
      }

      const speciesZMoves = getSpeciesZMoves();
      // 호환되는 Z기술 추출
      const allCompatibleZMoves = party
        .flatMap(p => {
          const speciesId = p.getSpeciesForm().speciesId;
          return speciesZMoves[speciesId] ?? [];
        })
        .map(entry => (Array.isArray(entry) ? entry[1] : entry))
        .filter((moveId): moveId is Moves => typeof moveId === "number")
        .filter(moveId => isExclusive === isExclusiveZCrystal(moveId));

      const uniqueZMoves = [...new Set(allCompatibleZMoves)];
      if (uniqueZMoves.length === 0) return null;

      const chosenMove = uniqueZMoves[randSeedInt(uniqueZMoves.length)];
      return isExclusive
        ? new ZExclusiveCrystalMoveModifierType(chosenMove)
        : new ZGenericCrystalMoveModifierType(chosenMove);
    });

    this.isExclusive = isExclusive;
  }
}

export class WishingStarModifierType extends PokemonHeldItemModifierType {
  constructor() {
    super(
      "modifierType:ModifierType.WISHING_STAR",
      "wishing_star",
      (type, args) => {
        const pokemon = args?.[0] as Pokemon;
        return new WishingStarModifier(type, pokemon?.id ?? -1); // ✅ fallback -1
      },
      "wishing_star_group",
    );
  }
}

// 아이템 사용 시 호출하는 함수

function tryApplyWishingStar(pokemon: PlayerPokemon): boolean {
  const wishingStarType = globalScene.getModifierType("wishing_star") as WishingStarModifierType;

  if (!wishingStarType) {
    console.error("[tryApplyWishingStar] WishingStarModifierType을 찾을 수 없습니다.");
    return false;
  }

  const checkResult = wishingStarType.check(pokemon);
  if (checkResult !== null) {
    globalScene.showMessage(checkResult);
    return false;
  }

  const modifier = wishingStarType.newModifier(pokemon);
  const success = globalScene.addModifier(modifier);

  if (!success) {
    console.warn(`[tryApplyWishingStar] ${pokemon.name}에게 소원의별 적용 실패`);
    globalScene.showMessage(
      i18next.t("modifierType:ModifierType.WISHING_STAR.failed", {
        pokemonName: getPokemonNameWithAffix(pokemon),
      }),
    );
    return false;
  }

  console.debug(`[tryApplyWishingStar] ${pokemon.name}에게 소원의별 적용 성공`);
  globalScene.showMessage(
    i18next.t("modifierType:ModifierType.WISHING_STAR.applied", {
      pokemonName: getPokemonNameWithAffix(pokemon),
    }),
  );
  return true;
}

class EvolutionItemModifierTypeGenerator extends ModifierTypeGenerator {
  constructor(rare: boolean) {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length === 1 && pregenArgs[0] in EvolutionItem) {
        return new EvolutionItemModifierType(pregenArgs[0] as EvolutionItem);
      }

      const evolutionItemPool = [
        party
          .filter(
            p =>
              pokemonEvolutions.hasOwnProperty(p.species.speciesId) &&
              (!p.pauseEvolutions ||
                p.species.speciesId === SpeciesId.SLOWPOKE ||
                p.species.speciesId === SpeciesId.EEVEE ||
                p.species.speciesId === SpeciesId.KIRLIA ||
                p.species.speciesId === SpeciesId.SNORUNT),
          )
          .flatMap(p => {
            const evolutions = pokemonEvolutions[p.species.speciesId];
            return evolutions.filter(e => e.isValidItemEvolution(p));
          }),
        party
          .filter(
            p =>
              p.isFusion() &&
              p.fusionSpecies &&
              pokemonEvolutions.hasOwnProperty(p.fusionSpecies.speciesId) &&
              (!p.pauseEvolutions ||
                p.fusionSpecies.speciesId === SpeciesId.SLOWPOKE ||
                p.fusionSpecies.speciesId === SpeciesId.EEVEE ||
                p.fusionSpecies.speciesId === SpeciesId.KIRLIA ||
                p.fusionSpecies.speciesId === SpeciesId.SNORUNT),
          )
          .flatMap(p => {
            const evolutions = pokemonEvolutions[p.fusionSpecies!.speciesId];
            return evolutions.filter(e => e.isValidItemEvolution(p, true));
          }),
      ]
        .flat()
        .flatMap(e => e.evoItem)
        .filter(i => !!i && i > 50 === rare);

      if (!evolutionItemPool.length) {
        return null;
      }

      // TODO: should this use `randSeedItem`?
      return new EvolutionItemModifierType(evolutionItemPool[randSeedInt(evolutionItemPool.length)]!); // TODO: is the bang correct?
    });
  }
}

export class FormChangeItemModifierTypeGenerator extends ModifierTypeGenerator {
  constructor(isRareFormChangeItem: boolean) {
    super((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length === 1 && pregenArgs[0] in FormChangeItem) {
        return new FormChangeItemModifierType(pregenArgs[0] as FormChangeItem);
      }

      const formChangeItemPool = [
        ...new Set(
          party
            .filter(p => pokemonFormChanges.hasOwnProperty(p.species.speciesId))
            .flatMap(p => {
              const formChanges = pokemonFormChanges[p.species.speciesId];
              let formChangeItemTriggers = formChanges
                .filter(
                  fc =>
                    ((fc.formKey.indexOf(SpeciesFormKey.MEGA) === -1 &&
                      fc.formKey.indexOf(SpeciesFormKey.PRIMAL) === -1) ||
                      globalScene.getModifiers(MegaEvolutionAccessModifier).length) &&
                    ((fc.formKey.indexOf(SpeciesFormKey.GIGANTAMAX) === -1 &&
                      fc.formKey.indexOf(SpeciesFormKey.ETERNAMAX) === -1) ||
                      globalScene.getModifiers(GigantamaxAccessModifier).length) &&
                    (!fc.conditions.length ||
                      fc.conditions.filter(cond => cond instanceof SpeciesFormChangeCondition && cond.predicate(p))
                        .length) &&
                    fc.preFormKey === p.getFormKey(),
                )
                .map(fc => fc.findTrigger(SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger)
                .filter(
                  t =>
                    t?.active &&
                    !globalScene.findModifier(
                      m =>
                        m instanceof PokemonFormChangeItemModifier &&
                        m.pokemonId === p.id &&
                        m.formChangeItem === t.item,
                    ),
                );

              if (p.species.speciesId === SpeciesId.NECROZMA) {
                // technically we could use a simplified version and check for formChanges.length > 3, but in case any code changes later, this might break...
                let foundULTRA_Z = false,
                  foundN_LUNA = false,
                  foundN_SOLAR = false;
                formChangeItemTriggers.forEach((fc, _i) => {
                  console.log("Checking ", fc.item);
                  switch (fc.item) {
                    case FormChangeItem.ULTRANECROZIUM_Z:
                      foundULTRA_Z = true;
                      break;
                    case FormChangeItem.N_LUNARIZER:
                      foundN_LUNA = true;
                      break;
                    case FormChangeItem.N_SOLARIZER:
                      foundN_SOLAR = true;
                      break;
                  }
                });
                if (foundULTRA_Z && foundN_LUNA && foundN_SOLAR) {
                  // all three items are present -> user hasn't acquired any of the N_*ARIZERs -> block ULTRANECROZIUM_Z acquisition.
                  formChangeItemTriggers = formChangeItemTriggers.filter(
                    fc => fc.item !== FormChangeItem.ULTRANECROZIUM_Z,
                  );
                } else {
                  console.log("DID NOT FIND ");
                }
              }
              return formChangeItemTriggers;
            }),
        ),
      ]
        .flat()
        .flatMap(fc => fc.item)
        .filter(i => (i && i < 100) === isRareFormChangeItem);
      // convert it into a set to remove duplicate values, which can appear when the same species with a potential form change is in the party.

      if (!formChangeItemPool.length) {
        return null;
      }

      // TODO: should this use `randSeedItem`?
      return new FormChangeItemModifierType(formChangeItemPool[randSeedInt(formChangeItemPool.length)]);
    });
  }
}

export class ContactHeldItemTransferChanceModifierType extends PokemonHeldItemModifierType {
  private chancePercent: number;

  constructor(localeKey: string, iconImage: string, chancePercent: number, group?: string, soundName?: string) {
    super(
      localeKey,
      iconImage,
      (type, args) => new ContactHeldItemTransferChanceModifier(type, (args[0] as Pokemon).id, chancePercent),
      group,
      soundName,
    );

    this.chancePercent = chancePercent;
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.ContactHeldItemTransferChanceModifierType.description", {
      chancePercent: this.chancePercent,
    });
  }
}

export class TurnHeldItemTransferModifierType extends PokemonHeldItemModifierType {
  constructor(localeKey: string, iconImage: string, group?: string, soundName?: string) {
    super(
      localeKey,
      iconImage,
      (type, args) => new TurnHeldItemTransferModifier(type, (args[0] as Pokemon).id),
      group,
      soundName,
    );
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.TurnHeldItemTransferModifierType.description");
  }
}

export class MoveAbilityBypassModifierType extends PokemonHeldItemModifierType {
  constructor(localeKey: string, iconImage: string, group?: string, soundName?: string) {
    super(
      localeKey,
      iconImage,
      // Modifier 생성자 정의
      (type, args) =>
        new MoveAbilityBypassModifier(
          type,
          (args[0] as Pokemon).id,
          args[1] as (pokemon: Pokemon, move: Move) => boolean, // 선택적으로 커스터마이징
        ),
      group,
      soundName,
    );
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.MoveAbilityBypassModifierType.description");
  }
}

export class EnemyAttackStatusEffectChanceModifierType extends ModifierType {
  private chancePercent: number;
  private effect: StatusEffect;

  constructor(localeKey: string, iconImage: string, chancePercent: number, effect: StatusEffect, stackCount?: number) {
    super(
      localeKey,
      iconImage,
      (type, _args) => new EnemyAttackStatusEffectChanceModifier(type, effect, chancePercent, stackCount),
      "enemy_status_chance",
    );

    this.chancePercent = chancePercent;
    this.effect = effect;
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.EnemyAttackStatusEffectChanceModifierType.description", {
      chancePercent: this.chancePercent,
      statusEffect: getStatusEffectDescriptor(this.effect),
    });
  }
}

export class EnemyEndureChanceModifierType extends ModifierType {
  private chancePercent: number;

  constructor(localeKey: string, iconImage: string, chancePercent: number) {
    super(localeKey, iconImage, (type, _args) => new EnemyEndureChanceModifier(type, chancePercent), "enemy_endure");

    this.chancePercent = chancePercent;
  }

  getDescription(): string {
    return i18next.t("modifierType:ModifierType.EnemyEndureChanceModifierType.description", {
      chancePercent: this.chancePercent,
    });
  }
}

export class WeightedModifierType {
  public modifierType: ModifierType;
  public weight: number | WeightedModifierTypeWeightFunc;
  public maxWeight: number | WeightedModifierTypeWeightFunc;

  constructor(
    modifierTypeFunc: ModifierTypeFunc,
    weight: number | WeightedModifierTypeWeightFunc,
    maxWeight?: number | WeightedModifierTypeWeightFunc,
  ) {
    this.modifierType = modifierTypeFunc();
    this.modifierType.id = Object.keys(modifierTypeInitObj).find(k => modifierTypeInitObj[k] === modifierTypeFunc)!; // TODO: is this bang correct?
    this.weight = weight;
    this.maxWeight = maxWeight || (!(weight instanceof Function) ? weight : 0);
  }

  setTier(tier: ModifierTier) {
    this.modifierType.setTier(tier);
  }
}

type BaseModifierOverride = {
  name: Exclude<ModifierTypeKeys, GeneratorModifierOverride["name"]>;
  count?: number;
};

/** Type for modifiers and held items that are constructed via {@linkcode ModifierTypeGenerator}. */
export type GeneratorModifierOverride = {
  count?: number;
} & (
  | {
      name: keyof Pick<typeof modifierTypeInitObj, "SPECIES_STAT_BOOSTER" | "RARE_SPECIES_STAT_BOOSTER">;
      type?: SpeciesStatBoosterItem;
    }
  | {
      name: keyof Pick<typeof modifierTypeInitObj, "TEMP_STAT_STAGE_BOOSTER">;
      type?: TempBattleStat;
    }
  | {
      name: keyof Pick<typeof modifierTypeInitObj, "BASE_STAT_BOOSTER">;
      type?: Stat;
    }
  | {
      name: keyof Pick<typeof modifierTypeInitObj, "MINT">;
      type?: Nature;
    }
  | {
      name: keyof Pick<typeof modifierTypeInitObj, "ATTACK_TYPE_BOOSTER" | "TERA_SHARD">;
      type?: PokemonType;
    }
  | {
      name: keyof Pick<typeof modifierTypeInitObj, "BERRY">;
      type?: BerryType;
    }
  | {
      name: keyof Pick<typeof modifierTypeInitObj, "EVOLUTION_ITEM" | "RARE_EVOLUTION_ITEM">;
      type?: EvolutionItem;
    }
  | {
      name: keyof Pick<typeof modifierTypeInitObj, "FORM_CHANGE_ITEM" | "RARE_FORM_CHANGE_ITEM">;
      type?: FormChangeItem;
    }
  | {
      name: keyof Pick<typeof modifierTypeInitObj, "TM_COMMON" | "TM_GREAT" | "TM_ULTRA">;
      type?: MoveId;
    }
  | {
      name: keyof Pick<typeof modifierTypes, "BOTTLE_CAP">;
      type?: Stat; // 소문자 stat → Stat 으로 수정 (대문자)
    }
);

/** Type used to construct modifiers and held items for overriding purposes. */
export type ModifierOverride = GeneratorModifierOverride | BaseModifierOverride;

export type ModifierTypeKeys = keyof typeof modifierTypeInitObj;

const modifierTypeInitObj = Object.freeze({
  POKEBALL: () => new AddPokeballModifierType("pb", PokeballType.POKEBALL, 5),
  GREAT_BALL: () => new AddPokeballModifierType("gb", PokeballType.GREAT_BALL, 5),
  ULTRA_BALL: () => new AddPokeballModifierType("ub", PokeballType.ULTRA_BALL, 5),
  ROGUE_BALL: () => new AddPokeballModifierType("rb", PokeballType.ROGUE_BALL, 5),
  MASTER_BALL: () => new AddPokeballModifierType("mb", PokeballType.MASTER_BALL, 5),

  RARE_CANDY: () => new PokemonLevelIncrementModifierType("modifierType:ModifierType.RARE_CANDY", "rare_candy"),
  RARER_CANDY: () => new AllPokemonLevelIncrementModifierType("modifierType:ModifierType.RARER_CANDY", "rarer_candy"),

  EVOLUTION_ITEM: () => new EvolutionItemModifierTypeGenerator(false),
  RARE_EVOLUTION_ITEM: () => new EvolutionItemModifierTypeGenerator(true),
  FORM_CHANGE_ITEM: () => new FormChangeItemModifierTypeGenerator(false),
  RARE_FORM_CHANGE_ITEM: () => new FormChangeItemModifierTypeGenerator(true),

  EVOLUTION_TRACKER_GIMMIGHOUL: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.EVOLUTION_TRACKER_GIMMIGHOUL",
      "relic_gold",
      (type, args) =>
        new EvoTrackerModifier(type, (args[0] as Pokemon).id, SpeciesId.GIMMIGHOUL, 10, (args[1] as number) ?? 1),
    ),

  MEGA_BRACELET: () =>
    new ModifierType(
      "modifierType:ModifierType.MEGA_BRACELET",
      "mega_bracelet",
      (type, _args) => new MegaEvolutionAccessModifier(type),
    ),
  DYNAMAX_BAND: () =>
    new ModifierType(
      "modifierType:ModifierType.DYNAMAX_BAND",
      "dynamax_band",
      (type, _args) => new GigantamaxAccessModifier(type),
    ),
  WISHING_STAR: () =>
    new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
      // DYNAMAX_BAND 모디파이어가 있는지 확인
      const hasDynamaxBand = globalScene.getModifiers(GigantamaxAccessModifier).length > 0;
      if (!hasDynamaxBand) {
        console.warn("[WISHING_STAR] 다이맥스 밴드가 없으므로 Wishing Star 모디파이어 생성 불가");
        return null; // 생성하지 않음
      }

      // 기본 생성자 호출
      return new WishingStarModifierType();
    }),
  
  TERA_ORB: () =>
    new ModifierType(
      "modifierType:ModifierType.TERA_ORB",
      "tera_orb",
      (type, _args) => new TerastallizeAccessModifier(type),
    ),
  Z_RING: () =>
    new ModifierType(
      "modifierType:ModifierType.Z_RING",
      "z_ring",
      (type, _args) => new GenericZMoveAccessModifier(type),
    ),

  Z_POWER_RING: () =>
    new ModifierType(
      "modifierType:ModifierType.Z_POWER_RING",
      "z_power_ring",
      (type, _args) => new ExclusiveZMoveAccessModifier(type),
    ),

  Z_EXCLUSIVE: () => new ZCrystalMoveModifierTypeGenerator(true),

  Z_GENERIC: () =>
    new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length === 1 && typeof pregenArgs[0] === "number") {
        return new ZGenericCrystalMoveModifierType(pregenArgs[0] as Moves);
      }

      // Z링 보유 여부 확인
      if (!globalScene.getModifiers(GenericZMoveAccessModifier).length) {
        console.warn("[Z_GENERIC] 트레이너가 Z링을 가지고 있지 않아 Z크리스탈을 생성하지 않습니다.");
        return null;
      }

      // 파티 타입 추출
      const partyTypes = party
        .map(p => p.getSpeciesForm().type1)
        .concat(party.map(p => p.getSpeciesForm().type2))
        .filter((t): t is PokemonType => t !== undefined && t !== PokemonType.UNKNOWN);

      // 하나의 타입만 있다면 제외
      let excludedType = PokemonType.UNKNOWN;
      if (partyTypes.length > 0 && partyTypes.every(t => t === partyTypes[0])) {
        excludedType = partyTypes[0];
      }

      // 가능한 타입 목록
      const possibleTypes = Object.values(PokemonType).filter(
        t => typeof t === "number" && t !== excludedType,
      ) as PokemonType[];

      if (possibleTypes.length === 0) {
        possibleTypes.push(...(Object.values(PokemonType).filter(t => typeof t === "number") as PokemonType[]));
      }

      const randomType = possibleTypes[randSeedInt(possibleTypes.length)];
      const zMoveId = getZMoveFromType(randomType);

      return new ZGenericCrystalMoveModifierType(zMoveId);
    }),

  ARMORITE_ORE: () =>
    new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
      // DYNAMAX_BAND 모디파이어가 있는지 확인
      const hasDynamaxBand = globalScene.getModifiers(GigantamaxAccessModifier).length > 0;
      if (!hasDynamaxBand) {
        console.warn("[ARMORITE_ORE] 다이맥스 밴드가 없으므로 Armorite Ore 모디파이어 생성 불가");
        return null; // 생성하지 않음
      }

      // 기본 생성자 호출
      return new ModifierType(
        "modifierType:ModifierType.ARMORITE_ORE",
        "armorite_ore",
        (type, _args) => new MaxMoveAccessModifier(type),
      );
    }),

  MAP: () => new ModifierType("modifierType:ModifierType.MAP", "map", (type, _args) => new MapModifier(type)),

  POTION: () => new PokemonHpRestoreModifierType("modifierType:ModifierType.POTION", "potion", 20, 10),
  SUPER_POTION: () =>
    new PokemonHpRestoreModifierType("modifierType:ModifierType.SUPER_POTION", "super_potion", 50, 25),
  HYPER_POTION: () =>
    new PokemonHpRestoreModifierType("modifierType:ModifierType.HYPER_POTION", "hyper_potion", 200, 50),
  MAX_POTION: () => new PokemonHpRestoreModifierType("modifierType:ModifierType.MAX_POTION", "max_potion", 0, 100),
  FULL_RESTORE: () =>
    new PokemonHpRestoreModifierType("modifierType:ModifierType.FULL_RESTORE", "full_restore", 0, 100, true),

  REVIVE: () => new PokemonReviveModifierType("modifierType:ModifierType.REVIVE", "revive", 50),
  MAX_REVIVE: () => new PokemonReviveModifierType("modifierType:ModifierType.MAX_REVIVE", "max_revive", 100),

  FULL_HEAL: () => new PokemonStatusHealModifierType("modifierType:ModifierType.FULL_HEAL", "full_heal"),

  SACRED_ASH: () => new AllPokemonFullReviveModifierType("modifierType:ModifierType.SACRED_ASH", "sacred_ash"),

  REVIVER_SEED: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.REVIVER_SEED",
      "reviver_seed",
      (type, args) => new PokemonInstantReviveModifier(type, (args[0] as Pokemon).id),
    ),
  WHITE_HERB: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.WHITE_HERB",
      "white_herb",
      (type, args) => new ResetNegativeStatStageModifier(type, (args[0] as Pokemon).id),
    ),

  MIRROR_HERB: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.MIRROR_HERB",
      "mirror_herb",
      (type, args) => new StatStageChangeCopyModifier(type, (args[0] as Pokemon).id),
    ),

  POWER_HERB: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_HERB",
      "power_herb",
      (type, args) => new InstantChargeItemModifier(type, (args[0] as Pokemon).id),
    ),

  MENTAL_HERB: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.MENTAL_HERB",
      "mental_herb",
      (type, args) => new MentalHerbModifier(type, (args[0] as Pokemon).id),
    ),

  AIR_BALLOON: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.AIR_BALLOON",
      "air_balloon",
      (type, args) => new TypeImmunityModifier(type, (args[0] as Pokemon).id, PokemonType.GROUND),
    ),

  BOOSTER_ENERGY: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.BOOSTER_ENERGY",
      "booster_energy",
      (type, args) => new BoostEnergyModifier(type, (args[0] as Pokemon).id),
    ),

  POWER_UP_DISK: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_UP_DISK",
      "indigo_disk",
      (type, args) => new PowerUpDiskModifier(type, (args[0] as Pokemon).id),
    ),

  ULTRA_ENERGY: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.ULTRA_ENERGY",
      "ultra_energy",
      (type, args) => new BeastBoostStartStatBoostModifier(type, (args[0] as Pokemon).id),
    ),

  VICTORY_SYMBOL: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.VICTORY_SYMBOL",
      "victory_symbol",
      (type, args) => new VictoryBadgeModifier(type, (args[0] as Pokemon).id),
    ),

  ANGE_ORB: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.ANGE_ORB",
      "eternal_orb",
      (type, args) => new AngeOrbeModifier(type, (args[0] as Pokemon).id),
    ),

  CURSED_BOWL: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.CURSED_BOWL",
    "cursed_bowl",
    (type, args) => new CursedRuinModifier(type, (args[0] as Pokemon).id),
  ),

CURSED_SWORD: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.CURSED_SWORD",
    "cursed_sword",
    (type, args) => new CursedRuinModifier(type, (args[0] as Pokemon).id),
  ),

CURSED_BOOK: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.CURSED_BOOK",
    "cursed_book",
    (type, args) => new CursedRuinModifier(type, (args[0] as Pokemon).id),
  ),

CURSED_BEAD: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.CURSED_BEAD",
    "cursed_bead",
    (type, args) => new CursedRuinModifier(type, (args[0] as Pokemon).id),
  ),

  BLACK_MANE_HAIR: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.BLACK_MANE_HAIR",
      "black_mane_hair",
      (type, args) => new CalyrexReinsUnifiedModifier(type, (args[0] as Pokemon).id, 1),
    ),

  WHITE_MANE_HAIR: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.WHITE_MANE_HAIR",
      "white_mane_hair",
      (type, args) => new CalyrexReinsUnifiedModifier(type, (args[0] as Pokemon).id, 1),
    ),

  FOCUS_SASH: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.FOCUS_SASH",
      "focus_sash",
      (type, args) => new GuaranteedSurviveDamageModifier(type, (args[0] as Pokemon).id),
    ),

  WEAKNESS_POLICY: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.WEAKNESS_POLICY",
      "weakness_policy",
      (type, args) => new WeaknessTypeModifier(type, (args[0] as Pokemon).id),
    ),

  THROAT_SPRAY: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.THROAT_SPRAY",
      "throat_spray",
      (type, args) => new SoundBasedMoveSpecialAttackBoostModifier(type, (args[0] as Pokemon).id),
    ),

  ROOM_SERVICE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.ROOM_SERVICE",
      "room_service",
      (type, args) => new RoomServiceModifier(type, (args[0] as Pokemon).id),
    ),

  BLUNDER_POLICY: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.BLUNDER_POLICY",
      "blunder_policy",
      (type, args) => new MissEffectModifier(type, (args[0] as Pokemon).id),
    ),

  ETHER: () => new PokemonPpRestoreModifierType("modifierType:ModifierType.ETHER", "ether", 10),
  MAX_ETHER: () => new PokemonPpRestoreModifierType("modifierType:ModifierType.MAX_ETHER", "max_ether", -1),

  ELIXIR: () => new PokemonAllMovePpRestoreModifierType("modifierType:ModifierType.ELIXIR", "elixir", 10),
  MAX_ELIXIR: () => new PokemonAllMovePpRestoreModifierType("modifierType:ModifierType.MAX_ELIXIR", "max_elixir", -1),

  Z_DRINK: () => new PokemonZMovePpRestoreModifierType("modifierType:ModifierType.Z_DRINK", "z_drink", -1),

  MAX_DRINK: () => new PokemonMaxMovePpRestoreModifierType("modifierType:ModifierType.MAX_DRINK", "gigantamix", -1),

  PP_UP: () => new PokemonPpUpModifierType("modifierType:ModifierType.PP_UP", "pp_up", 1),
  PP_MAX: () => new PokemonPpUpModifierType("modifierType:ModifierType.PP_MAX", "pp_max", 3),
  DYNAMAX_CANDY: () => new DynamaxMovePpUpModifierType("modifierType:ModifierType.DYNAMAX_CANDY", "dynamax_candy", 1),

  /*REPEL: () => new DoubleBattleChanceBoosterModifierType('Repel', 5),
  SUPER_REPEL: () => new DoubleBattleChanceBoosterModifierType('Super Repel', 10),
  MAX_REPEL: () => new DoubleBattleChanceBoosterModifierType('Max Repel', 25),*/

  LURE: () => new DoubleBattleChanceBoosterModifierType("modifierType:ModifierType.LURE", "lure", 10),
  SUPER_LURE: () => new DoubleBattleChanceBoosterModifierType("modifierType:ModifierType.SUPER_LURE", "super_lure", 15),
  MAX_LURE: () => new DoubleBattleChanceBoosterModifierType("modifierType:ModifierType.MAX_LURE", "max_lure", 30),

  TEMP_WEATHER_ROCK: () => new WeatherRockTrainerModifierTypeGenerator(),

  TEMP_TERRAIN_SEED: () => new TerrainSeedTrainerModifierTypeGenerator(),

  SPECIES_STAT_BOOSTER: () => new SpeciesStatBoosterModifierTypeGenerator(false),
  RARE_SPECIES_STAT_BOOSTER: () => new SpeciesStatBoosterModifierTypeGenerator(true),

  TEMP_STAT_STAGE_BOOSTER: () => new TempStatStageBoosterModifierTypeGenerator(),

  DIRE_HIT: () =>
    new (class extends ModifierType {
      getDescription(): string {
        return i18next.t("modifierType:ModifierType.TempStatStageBoosterModifierType.description", {
          stat: i18next.t("modifierType:ModifierType.DIRE_HIT.extra.raises"),
          amount: i18next.t("modifierType:ModifierType.TempStatStageBoosterModifierType.extra.stage"),
        });
      }
    })("modifierType:ModifierType.DIRE_HIT", "dire_hit", (type, _args) => new TempCritBoosterModifier(type, 5)),

  BASE_STAT_BOOSTER: () => new BaseStatBoosterModifierTypeGenerator(),

  ATTACK_TYPE_BOOSTER: () => new AttackTypeBoosterModifierTypeGenerator(),

  TYPE_SPECIFIC_MOVE_BOOSTER: () => new TypeSpecificMoveBoosterModifierTypeGenerator(),

  MINT: () =>
    new ModifierTypeGenerator((_party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length === 1 && pregenArgs[0] in Nature) {
        return new PokemonNatureChangeModifierType(pregenArgs[0] as Nature);
      }
      return new PokemonNatureChangeModifierType(randSeedItem(getEnumValues(Nature)));
    }),

  BOTTLE_CAP: () =>
    new ModifierTypeGenerator((_party: Pokemon[], pregenArgs?: any[]) => {
      const validStats = getEnumValues(Stat).filter(stat => stat !== Stat.ACC && stat !== Stat.EVA);

      if (
        pregenArgs &&
        pregenArgs.length === 1 &&
        typeof pregenArgs[0] === "number" &&
        validStats.includes(pregenArgs[0])
      ) {
        return new MaxIvModifierType(
          "MaxIvModifierType.name." + Stat[pregenArgs[0] as Stat],
          "bottle_cap",
          pregenArgs[0] as Stat,
          "bottlecap",
        );
      }

      const randomStat = validStats[randSeedInt(validStats.length)];
      return new MaxIvModifierType("MaxIvModifierType.name." + Stat[randomStat], "bottle_cap", randomStat, "bottlecap");
    }),

  GOLD_BOTTLE_CAP: () =>
    new ModifierTypeGenerator((_party: Pokemon[], _pregenArgs?: any[]) => {
      return new MaxAllIvModifierType(
        "MaxAllIvModifierType.name", // i18n 키
        "gold_bottle_cap", // 이미지 파일 이름
        "bottlecap", // 그룹명 (기존 그룹 재사용 가능)
      );
    }),

  ABILITY_CAPSULE: () =>
    new ChangeAbilityModifierType("modifierType:ModifierType.ChangeAbilityModifierType", "ability_capsule"),

  ABILITY_PATCH: () =>
    new ModifierTypeGenerator((_party: Pokemon[], pregenArgs?: any[]) => {
      const selectedPokemon = _party[0] as PlayerPokemon;
      const abilities: Ability[] = [];

      // 선택된 포켓몬의 능력치 추가
      if (selectedPokemon.species.ability) abilities.push(selectedPokemon.species.ability);
      if (selectedPokemon.species.ability2) abilities.push(selectedPokemon.species.ability2);

      // 특성 패치에서 바꿀 특성을 선택
      const targetAbility =
        (pregenArgs?.[0] as Ability) ?? abilities.find(a => a.index !== selectedPokemon.abilityIndex);
      if (!targetAbility) {
        return null; // 변경할 특성이 없다면 null 반환
      }

      // 특성 패치를 위한 ModifierType 생성
      return new RegisterAbilityModifierType(
        "RegisterAbilityModifierType.name." + targetAbility.name, // 이름 로컬라이징
        "ability_patch", // 아이콘 이미지 또는 텍스트
        targetAbility.index, // 특성 인덱스
      );
    }),

  MYSTICAL_ROCK: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.MYSTICAL_ROCK",
      "mystical_rock",
      (type, args) => new FieldEffectModifier(type, (args[0] as Pokemon).id),
    ),

  TERA_SHARD: () =>
    new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length === 1 && pregenArgs[0] in PokemonType) {
        return new TerastallizeModifierType(pregenArgs[0] as PokemonType);
      }
      if (!globalScene.getModifiers(TerastallizeAccessModifier).length) {
        return null;
      }
      const teraTypes: PokemonType[] = [];
      for (const p of party) {
        if (
          !(p.hasSpecies(SpeciesId.TERAPAGOS) || p.hasSpecies(SpeciesId.OGERPON) || p.hasSpecies(SpeciesId.SHEDINJA))
        ) {
          teraTypes.push(p.teraType);
        }
      }
      let excludedType = PokemonType.UNKNOWN;
      if (teraTypes.length > 0 && teraTypes.filter(t => t === teraTypes[0]).length === teraTypes.length) {
        excludedType = teraTypes[0];
      }
      let shardType = randSeedInt(64) ? (randSeedInt(18) as PokemonType) : PokemonType.STELLAR;
      while (shardType === excludedType) {
        shardType = randSeedInt(64) ? (randSeedInt(18) as PokemonType) : PokemonType.STELLAR;
      }
      return new TerastallizeModifierType(shardType);
    }),

  BERRY: () =>
    new ModifierTypeGenerator((_party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs && pregenArgs.length === 1 && pregenArgs[0] in BerryType) {
        return new BerryModifierType(pregenArgs[0] as BerryType);
      }
      const berryTypes = getEnumValues(BerryType);
      let randBerryType: BerryType;
      const rand = randSeedInt(12);
      if (rand < 2) {
        randBerryType = BerryType.SITRUS;
      } else if (rand < 4) {
        randBerryType = BerryType.LUM;
      } else if (rand < 6) {
        randBerryType = BerryType.LEPPA;
      } else {
        randBerryType = berryTypes[randSeedInt(berryTypes.length - 2) + 2];
      }
      return new BerryModifierType(randBerryType);
    }),

  TM_COMMON: () => new TmModifierTypeGenerator(ModifierTier.COMMON),
  TM_GREAT: () => new TmModifierTypeGenerator(ModifierTier.GREAT),
  TM_ULTRA: () => new TmModifierTypeGenerator(ModifierTier.ULTRA),

  TR_COMMON: () =>
    new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
      if (!globalScene.getModifiers(MaxMoveAccessModifier).length) {
        return null;
      }
      const generator = new TrModifierTypeGenerator(ModifierTier.COMMON);
      return generator.generateType(party, pregenArgs);
    }),

  TR_RARE: () =>
    new ModifierTypeGenerator((party: Pokemon[], pregenArgs?: any[]) => {
      if (!globalScene.getModifiers(MaxMoveAccessModifier).length) {
        return null;
      }
      const generator = new TrModifierTypeGenerator(ModifierTier.RARE);
      return generator.generateType(party, pregenArgs);
    }),

  MEMORY_MUSHROOM: () => new RememberMoveModifierType("modifierType:ModifierType.MEMORY_MUSHROOM", "big_mushroom"),

  EXP_SHARE: () =>
    new ModifierType("modifierType:ModifierType.EXP_SHARE", "exp_share", (type, _args) => new ExpShareModifier(type)),
  EXP_BALANCE: () =>
    new ModifierType(
      "modifierType:ModifierType.EXP_BALANCE",
      "exp_balance",
      (type, _args) => new ExpBalanceModifier(type),
    ),

  OVAL_CHARM: () =>
    new ModifierType(
      "modifierType:ModifierType.OVAL_CHARM",
      "oval_charm",
      (type, _args) => new EggHatchSpeedUpModifier(type),
    ),

  EXP_CHARM: () => new ExpBoosterModifierType("modifierType:ModifierType.EXP_CHARM", "exp_charm", 25),
  SUPER_EXP_CHARM: () => new ExpBoosterModifierType("modifierType:ModifierType.SUPER_EXP_CHARM", "super_exp_charm", 60),
  GOLDEN_EXP_CHARM: () =>
    new ExpBoosterModifierType("modifierType:ModifierType.GOLDEN_EXP_CHARM", "golden_exp_charm", 100),

  LUCKY_EGG: () => new PokemonExpBoosterModifierType("modifierType:ModifierType.LUCKY_EGG", "lucky_egg", 40),
  GOLDEN_EGG: () => new PokemonExpBoosterModifierType("modifierType:ModifierType.GOLDEN_EGG", "golden_egg", 100),

  SOOTHE_BELL: () => new PokemonFriendshipBoosterModifierType("modifierType:ModifierType.SOOTHE_BELL", "soothe_bell"),

  SCOPE_LENS: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.SCOPE_LENS",
      "scope_lens",
      (type, args) => new CritBoosterModifier(type, (args[0] as Pokemon).id, 1),
    ),
  LEEK: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.LEEK",
      "leek",
      (type, args) =>
        new SpeciesCritBoosterModifier(type, (args[0] as Pokemon).id, 2, [
          SpeciesId.FARFETCHD,
          SpeciesId.GALAR_FARFETCHD,
          SpeciesId.SIRFETCHD,
        ]),
    ),

  TIDAL_BELL: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.TIDAL_BELL",
    "tidal_bell",
    (type, args) =>
      new SpeciesHealingBellModifier(
        type,
        (args[0] as Pokemon).id,
        [
          SpeciesId.LUGIA
        ]
      ),
  ),

  LEGEND_PLATE: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.LEGEND_PLATE",
    "legend_plate",
    (type, args) => {
      const p = args[0] as Pokemon;
      // ✅ 옛 포맷: [pokemonId, [493]] 같은 게 들어올 수도 있으니 안전 처리
      const stack = typeof args[1] === "number" ? args[1] : 1;
      return new LegendPlateModifier(type, p.id, stack);
    },
  ),

  WICKED_GLOVE: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.WICKED_GLOVE",
    "wicked_glove",
    (type, args) => new UrshifuGloveAbilityBypassModifier(type, (args[0] as Pokemon).id, 1),
  ),

SURGING_GLOVE: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.SURGING_GLOVE",
    "surging_glove",
    (type, args) => new UrshifuGloveAbilityBypassModifier(type, (args[0] as Pokemon).id, 1),
  ),

  DUSK_BEAD: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.DUSK_BEAD",
    "dusk_flute",
    (type, args) => {
      const p = args[0] as Pokemon;
      const stack = typeof args[1] === "number" ? args[1] : 1;
      return new DuskManeBeadModifier(type, p.id, 1, stack); // stages=1
    },
  ),

DAWN_BEAD: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.DAWN_BEAD",
    "dawn_flute",
    (type, args) => {
      const p = args[0] as Pokemon;
      const stack = typeof args[1] === "number" ? args[1] : 1;
      return new DawnWingsBeadModifier(type, p.id, 1, stack); // stages=1
    },
  ),

BLIGHT_BEAD: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.BLIGHT_BEAD",
    "bright_flute",
    (type, args) => {
      const p = args[0] as Pokemon;
      const stack = typeof args[1] === "number" ? args[1] : 1;
      return new UltraBeadModifier(type, p.id, 2, 1, stack); // notEffectiveMult=2, stages=1
    },
  ),

  TREASURE_POUCH: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.TREASURE_POUCH",
    "forage_bag",
    (type, args) => new PostBattleLootItemModifier(type, (args[0] as Pokemon).id, 1), // ✅ 숫자 1만 전달
  ),

  MUSCLE_BAND: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.MUSCLE_BAND",
      "muscle_band",
      (type, args) => new StatBoostModifier(type, (args[0] as Pokemon).id, 1),
    ),
  WISE_GLASSES: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.WISE_GLASSES",
      "wise_glasses",
      (type, args) => new StatBoostModifier(type, (args[0] as Pokemon).id, 1),
    ),

  EVIOLITE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.EVIOLITE",
      "eviolite",
      (type, args) => new EvolutionStatBoosterModifier(type, (args[0] as Pokemon).id, [Stat.DEF, Stat.SPDEF], 1.5),
    ),

  EVOLUTION_INCENSE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.EVOLUTION_INCENSE",
      "sea_incense",
      (type, args) => new EvolutionIncenseModifier(type, (args[0] as Pokemon).id, [Stat.ATK, Stat.SPA, Stat.SPE], 1.5),
    ),

  MIND_ORB: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.MIND_ORB",
      "mind_orb",
      (type, args) => new PokemonNatureWeightModifier(type, (args[0] as Pokemon).id),
    ),

  NUGGET: () =>
    new MoneyRewardModifierType(
      "modifierType:ModifierType.NUGGET",
      "nugget",
      1,
      "modifierType:ModifierType.MoneyRewardModifierType.extra.small",
    ),
  BIG_NUGGET: () =>
    new MoneyRewardModifierType(
      "modifierType:ModifierType.BIG_NUGGET",
      "big_nugget",
      2.5,
      "modifierType:ModifierType.MoneyRewardModifierType.extra.moderate",
    ),
  RELIC_GOLD: () =>
    new MoneyRewardModifierType(
      "modifierType:ModifierType.RELIC_GOLD",
      "relic_gold",
      10,
      "modifierType:ModifierType.MoneyRewardModifierType.extra.large",
    ),

  AMULET_COIN: () =>
    new ModifierType(
      "modifierType:ModifierType.AMULET_COIN",
      "amulet_coin",
      (type, _args) => new MoneyMultiplierModifier(type),
    ),
  GOLDEN_PUNCH: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.GOLDEN_PUNCH",
      "golden_punch",
      (type, args) => new DamageMoneyRewardModifier(type, (args[0] as Pokemon).id),
    ),
  COIN_CASE: () =>
    new ModifierType(
      "modifierType:ModifierType.COIN_CASE",
      "coin_case",
      (type, _args) => new MoneyInterestModifier(type),
    ),

  LOCK_CAPSULE: () =>
    new ModifierType(
      "modifierType:ModifierType.LOCK_CAPSULE",
      "lock_capsule",
      (type, _args) => new LockModifierTiersModifier(type),
    ),

  GRIP_CLAW: () =>
    new ContactHeldItemTransferChanceModifierType("modifierType:ModifierType.GRIP_CLAW", "grip_claw", 10),
  WIDE_LENS: () => new PokemonMoveAccuracyBoosterModifierType("modifierType:ModifierType.WIDE_LENS", "wide_lens", 5),

  MULTI_LENS: () => new PokemonMultiHitModifierType("modifierType:ModifierType.MULTI_LENS", "zoom_lens"),

  HEALING_CHARM: () =>
    new ModifierType(
      "modifierType:ModifierType.HEALING_CHARM",
      "healing_charm",
      (type, _args) => new HealingBoosterModifier(type, 1.1),
    ),
  CANDY_JAR: () =>
    new ModifierType(
      "modifierType:ModifierType.CANDY_JAR",
      "candy_jar",
      (type, _args) => new LevelIncrementBoosterModifier(type),
    ),

  BERRY_POUCH: () =>
    new ModifierType(
      "modifierType:ModifierType.BERRY_POUCH",
      "berry_pouch",
      (type, _args) => new PreserveBerryModifier(type),
    ),

  STRANGE_BOX: () =>
    new ModifierType(
      "modifierType:ModifierType.STRANGE_BOX",
      "lens_case",
      (type, _args) => new PreserveItemModifier(type),
    ),

  FOCUS_BAND: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.FOCUS_BAND",
      "focus_band",
      (type, args) => new SurviveDamageModifier(type, (args[0] as Pokemon).id),
    ),

  QUICK_CLAW: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.QUICK_CLAW",
      "quick_claw",
      (type, args) => new BypassSpeedChanceModifier(type, (args[0] as Pokemon).id),
    ),

  KINGS_ROCK: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.KINGS_ROCK",
      "kings_rock",
      (type, args) => new FlinchChanceModifier(type, (args[0] as Pokemon).id),
    ),

  LEFTOVERS: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.LEFTOVERS",
      "leftovers",
      (type, args) => new TurnHealModifier(type, (args[0] as Pokemon).id),
    ),
  SHELL_BELL: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.SHELL_BELL",
      "shell_bell",
      (type, args) => new HitHealModifier(type, (args[0] as Pokemon).id),
    ),

  BATON: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.BATON",
      "baton",
      (type, args) => new SwitchEffectTransferModifier(type, (args[0] as Pokemon).id),
    ),

  METRONOME: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.METRONOME",
      "metronome",
      (type, args) => new StackingPowerBoosterModifier(type, (args[0] as Pokemon).id),
    ),

  ASSAULT_VEST: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.ASSAULT_VEST",
      "assault_vest",
      (type, args) => new PokemonDefensiveStatModifier(type, (args[0] as Pokemon).id),
    ),

  CHOICE_SCARF: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.CHOICE_SCARF",
      "choice_scarf",
      (type, args) => new SpeedStatModifier(type, (args[0] as Pokemon).id),
    ),

  CHOICE_SPECS: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.CHOICE_SPECS",
      "choice_specs",
      (type, args) => new SpAtkStatModifier(type, (args[0] as Pokemon).id),
    ),

  CHOICE_BAND: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.CHOICE_BAND",
      "choice_band",
      (type, args) => new AtkStatModifier(type, (args[0] as Pokemon).id),
    ),

  ROCKY_HELMET: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.ROCKY_HELMET",
      "rocky_helmet",
      (type, args) => new ContactDamageModifier(type, (args[0] as Pokemon).id, 10),
    ),

  CLEAR_AMULET: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.CLEAR_AMULET",
      "clear_amulet",
      (type, args) => new ProtectStatModifier(type, (args[0] as Pokemon).id),
    ),

  LIFE_ORB: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.LIFE_ORB",
      "life_orb",
      (type, args) => new StackingRiskyPowerBoosterModifier(type, (args[0] as Pokemon).id, 1),
    ),

  EXPERT_BELT: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.EXPERT_BELT",
      "expert_belt",
      (type, args) => new SuperEffectiveBoosterModifier(type, (args[0] as Pokemon).id, 1),
    ),

  BRIGHT_POWDER: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.BRIGHT_POWDER",
      "bright_powder",
      (type, args) => new EvasiveItemModifier(type, (args[0] as Pokemon).id, 1),
    ),

  PROTECTIVE_PADS: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.PROTECTIVE_PADS",
      "protective_pads",
      (type, args) => new IgnoreContactItemModifier(type, (args[0] as Pokemon).id, 1),
    ),

  PUNCHING_GLOVE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.PUNCHING_GLOVE",
      "punching_glove",
      (type, args) => new PunchingGloveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  SHARPNESS_SWORD: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.SHARPNESS_SWORD",
      "sword_1",
      (type, args) => new SlicingMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_TEETH: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_TEETH",
      "gold_teeth",
      (type, args) => new BitingMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_HELMET: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_HELMET",
      "helmet",
      (type, args) => new HeadMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),
  
  HORN_HELMET: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.HORN_HELMET",
      "biking_helmet",
      (type, args) => new HornMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_PROTECTOR: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_PROTECTOR",
      "power_protector",
      (type, args) => new KickMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  SPIKE_SPEAR: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.SPIKE_SPEAR",
      "sharp_spear",
      (type, args) => new SpearMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_FEATHER: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_FEATHER",
      "pretty_wing",
      (type, args) => new WingMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  MIGHTY_HAMMER: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.MIGHTY_HAMMER",
      "mighty_hammer",
      (type, args) => new HammerMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),
 
  POWER_CLAW: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_CLAW",
      "power_claw",
      (type, args) => new ClawMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_PINCH: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_PINCH",
      "power_pinch",
      (type, args) => new PinchMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  HARDEN_BEAK: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.HARDEN_BEAK",
      "harden_beak",
      (type, args) => new BeakMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  FAST_BOOTS: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.FAST_BOOTS",
      "fast_boots",
      (type, args) => new DashMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  SPIN_TOP: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.SPIN_TOP",
      "spin_top",
      (type, args) => new SpinMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_DRILL: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_DRILL",
      "power_drill",
      (type, args) => new DrillMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_ROPE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_ROPE",
      "power_rope",
      (type, args) => new WhipMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_WHEEL: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_WHEEL",
      "power_wheel",
      (type, args) => new WheelMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_TAIL: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_TAIL",
      "power_tail",
      (type, args) => new TailMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_BOW: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_BOW",
      "power_bow",
      (type, args) => new ArrowMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_BEADS: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_BEADS",
      "power_beads",
      (type, args) => new BallBombMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_BOOMERANG: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_BOOMERANG",
      "power_boomerang",
      (type, args) => new BoomerangMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  THROW_GLOVE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.THROW_GLOVE",
      "throw_glove",
      (type, args) => new ThrowMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  PULSE_ORB: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.PULSE_ORB",
      "pulse_orb",
      (type, args) => new PulseMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  RAZORPOINTER: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.RAZORPOINTER",
      "razorpointer",
      (type, args) => new BeamMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_LANTERN: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_LANTERN",
      "power_lantern",
      (type, args) => new LightMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  PUNK_MIKE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.PUNK_MIKE",
      "standmike",
      (type, args) => new SoundMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  POWER_FAN: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_FAN",
      "power_fan",
      (type, args) => new WindMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  HULAHULA_SKIRT: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.HULAHULA_SKIRT",
      "hulahula_skirt",
      (type, args) => new DanceMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  BIG_ROOT: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.BIG_ROOT",
      "big_root",
      (type, args) => new DrainMoveModifier(type, (args[0] as Pokemon).id, 1),
    ),

  COVERT_CLOAK: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.COVERT_CLOAK",
      "covert_cloak",
      (type, args) => new IgnoreMoveEffectsItemModifier(type, (args[0] as Pokemon).id, 1),
    ),

  LOADED_DICE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.LOADED_DICE",
      "loaded_dice",
      (type, args) => new MaxMultiHitModifier(type, (args[0] as Pokemon).id, 1),
    ),

  LAGGING_TAIL: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.LAGGING_TAIL",
      "lagging_tail",
      (type, args) => new AlwaysMoveLastModifier(type, (args[0] as Pokemon).id, 1),
    ),

  UTILITY_UMBRELLA: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.UTILITY_UMBRELLA",
      "utility_umbrella",
      (type, args) => new IgnoreWeatherEffectsItemModifier(type, (args[0] as Pokemon).id, 1),
    ),

  CRITICAL_BAND: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.CRITICAL_BAND",
      "red_scarf",
      (type, args) => new CritDamageBoostModifier(type, (args[0] as Pokemon).id, 1.5),
    ),

  COLORFUL_LENS: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.COLORFUL_LENS",
      "power_lens",
      (type, args) => new NotEffectiveBoostModifier(type, (args[0] as Pokemon).id, 2.0),
    ),

  TECHNIC_ANKLET: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.TECHNIC_ANKLET",
      "power_anklet",
      (type, args) => new MovePowerBoostItemModifier(type, (args[0] as Pokemon).id, 1.5),
    ),

  RECOIL_BELT: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.RECOIL_BELT",
      "power_belt",
      (type, args) => new RecoilBoosterModifier(type, (args[0] as Pokemon).id, 1.3),
    ),

  MOLD_BREAKER_BRACER: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.MOLD_BREAKER_BRACER",
      "power_bracer",
      (type, args) => new MoveAbilityBypassModifier(type, (args[0] as Pokemon).id),
    ),

  POWER_UP_WEIGHT: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_UP_WEIGHT",
      "power_weight",
      (type, args) => new VictoryStatBoostModifier(type, (args[0] as Pokemon).id, 1),
    ),

  MYSTIC_SCALE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.MYSTIC_SCALE",
      "mystic_scale",
      (type, args) => new StatusBoostItemModifier(type, (args[0] as Pokemon).id, 1),
    ),

  CHAMPION_BELT: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.CHAMPION_BELT",
    "champion_belt",
    (type, args) =>
      new CategoryPowerBoostModifier(
        type,
        (args[0] as Pokemon).id,
        MoveCategory.PHYSICAL, // ✅ 물리기술만
        2.0                    // ✅ 2배
      ),
  ),

SCHOLAR_TOME: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.SCHOLAR_TOME",
    "book",
    (type, args) =>
      new CategoryPowerBoostModifier(
        type,
        (args[0] as Pokemon).id,
        MoveCategory.SPECIAL,  // ✅ 특수기술만
        2.0                    // ✅ 2배
      ),
  ),

  MOODY_BAND: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.MOODY_BAND",
      "moody_band",
      (type, args) => new MoodyItemModifier(type, (args[0] as Pokemon).id),
    ),

  UNAWARE_BAND: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.UNAWARE_BAND",
      "yellow_scarf",
      (type, args) => new UnawareItemModifier(type, (args[0] as Pokemon).id),
    ),

  ABILITY_SHIELD: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.ABILITY_SHIELD",
      "ability_shield",
      (type, args) => new AbilityGuardItemModifier(type, (args[0] as Pokemon).id),
    ),

  SIMPLE_BAND: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.SIMPLE_BAND",
      "green_scarf",
      (type, args) => new StatStageChangeBoostModifier(type, (args[0] as Pokemon).id, 2),
    ),

  UNNERVE_INCENSE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.UNNERVE_INCENSE",
      "full_incense",
      (type, args) => new PreventBerryUseItemModifier(type, (args[0] as Pokemon).id),
    ),

  DAMP_INCENSE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.DAMP_INCENSE",
      "wave_incense",
      (type, args) => new PreventExplosionItemModifier(type, (args[0] as Pokemon).id),
    ),

  ODD_INCENSE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.ODD_INCENSE",
      "odd_incense",
      (type, args) => new PreventPriorityMoveItemModifier(type, (args[0] as Pokemon).id),
    ),

  POWER_SHELL: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.POWER_SHELL",
      "power_shell",
      (type, args) => new BlockCritItemModifier(type, (args[0] as Pokemon).id),
    ),

  SILVER_INCENSE: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.SILVER_INCENSE",
    "pure_incense",
    (type, args) => new MoveEffectChanceMultiplierItemModifier(type, (args[0] as Pokemon).id),
  ),

  GOLDEN_INCENSE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.GOLDEN_INCENSE",
      "luck_incense",
      (type, args) =>
        new GoldenBodyItemModifier(
          type,
          (args[0] as Pokemon).id,
          (move: Move) => move.category === MoveCategory.STATUS || move.category === MoveCategory.CHANGE,
        ),
    ),

  AROMA_INCENSE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.AROMA_INCENSE",
      "rose_incense",
      (type, args) => new AromaIncenseItemModifier(type, (args[0] as Pokemon).id),
    ),

  ENIGMA_INCENSE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.ENIGMA_INCENSE",
      "lax_incense",
      (type, args) => new TelepathyItemModifier(type, (args[0] as Pokemon).id),
    ),

  STURDYSTONE_INCENSE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.STURDYSTONE_INCENSE",
      "rock_incense",
      (type, args) => new SturdystoneItemModifier(type, (args[0] as Pokemon).id),
    ),

  CLEAR_BELL: () =>
  new PokemonHeldItemModifierType(
    "modifierType:ModifierType.CLEAR_BELL",
    "clear_bell",
    (type, args) =>
      new SturdyMealModifier(
        type,
        (args[0] as Pokemon).id,
        [
          SpeciesId.HO_OH
        ]
      ),
  ),

  SCRAPPY_BELT: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.SCRAPPY_BELT",
      "power_band",
      (type, args) => new IgnoreTypeImmunityModifier(type, (args[0] as Pokemon).id),
    ),

  SHEER_FORCE_BAND: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.SHEER_FORCE_BAND",
      "blue_scarf",
      (type, args) => new SheerForceItemModifier(type, (args[0] as Pokemon).id),
      1.3,
    ),

  ADAPTABILITY_BAND: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.ADAPTABILITY_BAND",
      "pink_scarf",
      (type, args) => new AdaptabilityItemModifier(type, (args[0] as Pokemon).id),
    ),

  STAT_STAGE_CHANGE_REVERSE_BAND: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.STAT_STAGE_CHANGE_REVERSE_BAND",
      "esrever_band",
      (type, args) => new StatStageChangeReverseModifier(type, (args[0] as Pokemon).id),
    ),

  LIGHT_CLAY: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.LIGHT_CLAY",
      "light_clay",
      (type, args) => new WeakenMoveScreenModifier(type, (args[0] as Pokemon).id, 1),
    ),

  TOXIC_ORB: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.TOXIC_ORB",
      "toxic_orb",
      (type, args) => new TurnStatusEffectModifier(type, (args[0] as Pokemon).id),
    ),
  FLAME_ORB: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.FLAME_ORB",
      "flame_orb",
      (type, args) => new TurnStatusEffectModifier(type, (args[0] as Pokemon).id),
    ),
  FREEZE_ORB: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.FREEZE_ORB",
      "freeze_orb",
      (type, args) => new TurnStatusEffectModifier(type, (args[0] as Pokemon).id),
    ),
  SMOKE_BALL: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.SMOKE_BALL",
      "smoke_ball",
      (type, args) => new RunSuccessModifier(type, (args[0] as Pokemon).id),
    ),

  SAFETY_GOGGLES: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.SAFETY_GOGGLES",
      "safety_goggles",
      (type, args) => new OvercoatModifier(type, (args[0] as Pokemon).id, true, true),
    ),

  SHINY_CHARM: () =>
    new ModifierType(
      "modifierType:ModifierType.SHINY_CHARM",
      "shiny_charm",
      (type, _args) => new ShinyRateBoosterModifier(type),
    ),
  ABILITY_CHARM: () =>
    new ModifierType(
      "modifierType:ModifierType.ABILITY_CHARM",
      "ability_charm",
      (type, _args) => new HiddenAbilityRateBoosterModifier(type),
    ),
  CATCHING_CHARM: () =>
    new ModifierType(
      "modifierType:ModifierType.CATCHING_CHARM",
      "catching_charm",
      (type, _args) => new CriticalCatchChanceBoosterModifier(type),
    ),

  IV_SCANNER: () =>
    new ModifierType("modifierType:ModifierType.IV_SCANNER", "scanner", (type, _args) => new IvScannerModifier(type)),

  DNA_SPLICERS: () => new FusePokemonModifierType("modifierType:ModifierType.DNA_SPLICERS", "dna_splicers"),

  MINI_BLACK_HOLE: () =>
    new TurnHeldItemTransferModifierType("modifierType:ModifierType.MINI_BLACK_HOLE", "mini_black_hole"),

  VOUCHER: () => new AddVoucherModifierType(VoucherType.REGULAR, 1),
  VOUCHER_PLUS: () => new AddVoucherModifierType(VoucherType.PLUS, 1),
  VOUCHER_PREMIUM: () => new AddVoucherModifierType(VoucherType.PREMIUM, 1),

  GOLDEN_POKEBALL: () =>
    new ModifierType(
      "modifierType:ModifierType.GOLDEN_POKEBALL",
      "pb_gold",
      (type, _args) => new ExtraModifierModifier(type),
      undefined,
      "se/pb_bounce_1",
    ),
  SILVER_POKEBALL: () =>
    new ModifierType(
      "modifierType:ModifierType.SILVER_POKEBALL",
      "pb_silver",
      (type, _args) => new TempExtraModifierModifier(type, 100),
      undefined,
      "se/pb_bounce_1",
    ),

  ENEMY_DAMAGE_BOOSTER: () =>
    new ModifierType(
      "modifierType:ModifierType.ENEMY_DAMAGE_BOOSTER",
      "wl_item_drop",
      (type, _args) => new EnemyDamageBoosterModifier(type, 5),
    ),
  ENEMY_DAMAGE_REDUCTION: () =>
    new ModifierType(
      "modifierType:ModifierType.ENEMY_DAMAGE_REDUCTION",
      "wl_guard_spec",
      (type, _args) => new EnemyDamageReducerModifier(type, 2.5),
    ),
  //ENEMY_SUPER_EFFECT_BOOSTER: () => new ModifierType('Type Advantage Token', 'Increases damage of super effective attacks by 30%', (type, _args) => new EnemySuperEffectiveDamageBoosterModifier(type, 30), 'wl_custom_super_effective'),
  ENEMY_HEAL: () =>
    new ModifierType(
      "modifierType:ModifierType.ENEMY_HEAL",
      "wl_potion",
      (type, _args) => new EnemyTurnHealModifier(type, 2, 10),
    ),
  ENEMY_ATTACK_POISON_CHANCE: () =>
    new EnemyAttackStatusEffectChanceModifierType(
      "modifierType:ModifierType.ENEMY_ATTACK_POISON_CHANCE",
      "wl_antidote",
      5,
      StatusEffect.POISON,
      10,
    ),
  ENEMY_ATTACK_PARALYZE_CHANCE: () =>
    new EnemyAttackStatusEffectChanceModifierType(
      "modifierType:ModifierType.ENEMY_ATTACK_PARALYZE_CHANCE",
      "wl_paralyze_heal",
      2.5,
      StatusEffect.PARALYSIS,
      10,
    ),
  ENEMY_ATTACK_BURN_CHANCE: () =>
    new EnemyAttackStatusEffectChanceModifierType(
      "modifierType:ModifierType.ENEMY_ATTACK_BURN_CHANCE",
      "wl_burn_heal",
      5,
      StatusEffect.BURN,
      10,
    ),
  ENEMY_STATUS_EFFECT_HEAL_CHANCE: () =>
    new ModifierType(
      "modifierType:ModifierType.ENEMY_STATUS_EFFECT_HEAL_CHANCE",
      "wl_full_heal",
      (type, _args) => new EnemyStatusEffectHealChanceModifier(type, 2.5, 10),
    ),
  ENEMY_ENDURE_CHANCE: () =>
    new EnemyEndureChanceModifierType("modifierType:ModifierType.ENEMY_ENDURE_CHANCE", "wl_reset_urge", 2),
  ENEMY_FUSED_CHANCE: () =>
    new ModifierType(
      "modifierType:ModifierType.ENEMY_FUSED_CHANCE",
      "wl_custom_spliced",
      (type, _args) => new EnemyFusionChanceModifier(type, 1),
    ),

  MYSTERY_ENCOUNTER_SHUCKLE_JUICE: () =>
    new ModifierTypeGenerator((_party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs) {
        return new PokemonBaseStatTotalModifierType(pregenArgs[0] as 10 | -15);
      }
      return new PokemonBaseStatTotalModifierType(10);
    }),
  MYSTERY_ENCOUNTER_OLD_GATEAU: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.MYSTERY_ENCOUNTER_OLD_GATEAU",
      "old_gateau",
      (type, args) => new PokemonBaseStatFlatModifier(type, (args[0] as Pokemon).id),
    ),
  MYSTERY_ENCOUNTER_BLACK_SLUDGE: () =>
    new ModifierTypeGenerator((_party: Pokemon[], pregenArgs?: any[]) => {
      if (pregenArgs) {
        return new ModifierType(
          "modifierType:ModifierType.MYSTERY_ENCOUNTER_BLACK_SLUDGE",
          "black_sludge",
          (type, _args) => new HealShopCostModifier(type, pregenArgs[0] as number),
        );
      }
      return new ModifierType(
        "modifierType:ModifierType.MYSTERY_ENCOUNTER_BLACK_SLUDGE",
        "black_sludge",
        (type, _args) => new HealShopCostModifier(type, 2.5),
      );
    }),
  MYSTERY_ENCOUNTER_MACHO_BRACE: () =>
    new PokemonHeldItemModifierType(
      "modifierType:ModifierType.MYSTERY_ENCOUNTER_MACHO_BRACE",
      "macho_brace",
      (type, args) => new PokemonIncrementingStatModifier(type, (args[0] as Pokemon).id),
    ),
  MYSTERY_ENCOUNTER_GOLDEN_BUG_NET: () =>
    new ModifierType(
      "modifierType:ModifierType.MYSTERY_ENCOUNTER_GOLDEN_BUG_NET",
      "golden_net",
      (type, _args) => new BoostBugSpawnModifier(type),
    ),
});
(window as any).modifierTypeInitObj = modifierTypeInitObj;
/**
 * The initial set of modifier types, used to generate the modifier pool.
 */
export type ModifierTypes = typeof modifierTypeInitObj;

export interface ModifierPool {
  [tier: string]: WeightedModifierType[];
}

let modifierPoolThresholds = {};
let ignoredPoolIndexes = {};

let dailyStarterModifierPoolThresholds = {};
// biome-ignore lint/correctness/noUnusedVariables: TODO explain why this is marked as OK
let ignoredDailyStarterPoolIndexes = {};

let enemyModifierPoolThresholds = {};
// biome-ignore lint/correctness/noUnusedVariables: TODO explain why this is marked as OK
let enemyIgnoredPoolIndexes = {};

let enemyBuffModifierPoolThresholds = {};
// biome-ignore lint/correctness/noUnusedVariables: TODO explain why this is marked as OK
let enemyBuffIgnoredPoolIndexes = {};

const tierWeights = [768 / 1024, 195 / 1024, 48 / 1024, 12 / 1024, 1 / 1024];
/**
 * Allows a unit test to check if an item exists in the Modifier Pool. Checks the pool directly, rather than attempting to reroll for the item.
 */
export const itemPoolChecks: Map<ModifierTypeKeys, boolean | undefined> = new Map();

export function regenerateModifierPoolThresholds(party: Pokemon[], poolType: ModifierPoolType, rerollCount = 0) {
  const pool = getModifierPoolForType(poolType);
  itemPoolChecks.forEach((_v, k) => {
    itemPoolChecks.set(k, false);
  });

  const ignoredIndexes = {};
  const modifierTableData = {};
  const thresholds = Object.fromEntries(
    new Map(
      Object.keys(pool).map(t => {
        ignoredIndexes[t] = [];
        const thresholds = new Map();
        const tierModifierIds: string[] = [];
        let tierMaxWeight = 0;
        let i = 0;
        pool[t].reduce((total: number, modifierType: WeightedModifierType) => {
          const weightedModifierType = modifierType as WeightedModifierType;
          const existingModifiers = globalScene.findModifiers(
            m => m.type.id === weightedModifierType.modifierType.id,
            poolType === ModifierPoolType.PLAYER,
          );
          const itemModifierType =
            weightedModifierType.modifierType instanceof ModifierTypeGenerator
              ? weightedModifierType.modifierType.generateType(party)
              : weightedModifierType.modifierType;
          const weight =
            !existingModifiers.length ||
            itemModifierType instanceof PokemonHeldItemModifierType ||
            itemModifierType instanceof FormChangeItemModifierType ||
            existingModifiers.find(m => m.stackCount < m.getMaxStackCount(true))
              ? weightedModifierType.weight instanceof Function
                ? // biome-ignore lint/complexity/noBannedTypes: TODO: refactor to not use Function type
                  (weightedModifierType.weight as Function)(party, rerollCount)
                : (weightedModifierType.weight as number)
              : 0;
          if (weightedModifierType.maxWeight) {
            const modifierId = weightedModifierType.modifierType.id;
            tierModifierIds.push(modifierId);
            const outputWeight = useMaxWeightForOutput ? weightedModifierType.maxWeight : weight;
            modifierTableData[modifierId] = {
              weight: outputWeight,
              tier: Number.parseInt(t),
              tierPercent: 0,
              totalPercent: 0,
            };
            tierMaxWeight += outputWeight;
          }
          if (weight) {
            total += weight;
          } else {
            ignoredIndexes[t].push(i++);
            return total;
          }
          if (itemPoolChecks.has(modifierType.modifierType.id as ModifierTypeKeys)) {
            itemPoolChecks.set(modifierType.modifierType.id as ModifierTypeKeys, true);
          }
          thresholds.set(total, i++);
          return total;
        }, 0);
        for (const id of tierModifierIds) {
          modifierTableData[id].tierPercent = Math.floor((modifierTableData[id].weight / tierMaxWeight) * 10000) / 100;
        }
        return [t, Object.fromEntries(thresholds)];
      }),
    ),
  );
  for (const id of Object.keys(modifierTableData)) {
    modifierTableData[id].totalPercent =
      Math.floor(modifierTableData[id].tierPercent * tierWeights[modifierTableData[id].tier] * 100) / 100;
    modifierTableData[id].tier = ModifierTier[modifierTableData[id].tier];
  }
  if (outputModifierData) {
    console.table(modifierTableData);
  }
  switch (poolType) {
    case ModifierPoolType.PLAYER:
      modifierPoolThresholds = thresholds;
      ignoredPoolIndexes = ignoredIndexes;
      break;
    case ModifierPoolType.WILD:
    case ModifierPoolType.TRAINER:
      enemyModifierPoolThresholds = thresholds;
      enemyIgnoredPoolIndexes = ignoredIndexes;
      break;
    case ModifierPoolType.ENEMY_BUFF:
      enemyBuffModifierPoolThresholds = thresholds;
      enemyBuffIgnoredPoolIndexes = ignoredIndexes;
      break;
    case ModifierPoolType.DAILY_STARTER:
      dailyStarterModifierPoolThresholds = thresholds;
      ignoredDailyStarterPoolIndexes = ignoredIndexes;
      break;
  }
}

export interface CustomModifierSettings {
  /** If specified, will override the next X items to be the specified tier. These can upgrade with luck. */
  guaranteedModifierTiers?: ModifierTier[];
  /** If specified, will override the first X items to be specific modifier options (these should be pre-genned). */
  guaranteedModifierTypeOptions?: ModifierTypeOption[];
  /** If specified, will override the next X items to be auto-generated from specific modifier functions (these don't have to be pre-genned). */
  guaranteedModifierTypeFuncs?: ModifierTypeFunc[];
  /**
   * If set to `true`, will fill the remainder of shop items that were not overridden by the 3 options above, up to the `count` param value.
   * @example
   * ```ts
   * count = 4;
   * customModifierSettings = { guaranteedModifierTiers: [ModifierTier.GREAT], fillRemaining: true };
   * ```
   * The first item in the shop will be `GREAT` tier, and the remaining `3` items will be generated normally.
   *
   * If `fillRemaining: false` in the same scenario, only 1 `GREAT` tier item will appear in the shop (regardless of the value of `count`).
   * @defaultValue `false`
   */
  fillRemaining?: boolean;
  /** If specified, can adjust the amount of money required for a shop reroll. If set to a negative value, the shop will not allow rerolls at all. */
  rerollMultiplier?: number;
  /**
   * If `false`, will prevent set item tiers from upgrading via luck.
   * @defaultValue `true`
   */
  allowLuckUpgrades?: boolean;
}

export function getModifierTypeFuncById(id: string): ModifierTypeFunc {
  return modifierTypeInitObj[id];
}

/**
 * Generates modifier options for a {@linkcode SelectModifierPhase}
 * @param count - Determines the number of items to generate
 * @param party - Party is required for generating proper modifier pools
 * @param modifierTiers - (Optional) If specified, rolls items in the specified tiers. Commonly used for tier-locking with Lock Capsule.
 * @param customModifierSettings - See {@linkcode CustomModifierSettings}
 */
export function getPlayerModifierTypeOptions(
  count: number,
  party: PlayerPokemon[],
  modifierTiers?: ModifierTier[],
  customModifierSettings?: CustomModifierSettings,
): ModifierTypeOption[] {
  const options: ModifierTypeOption[] = [];
  const retryCount = Math.min(count * 5, 50);
  if (!customModifierSettings) {
    for (let i = 0; i < count; i++) {
      const tier = modifierTiers && modifierTiers.length > i ? modifierTiers[i] : undefined;
      options.push(getModifierTypeOptionWithRetry(options, retryCount, party, tier));
    }
  } else {
    // Guaranteed mod options first
    if (
      customModifierSettings?.guaranteedModifierTypeOptions &&
      customModifierSettings.guaranteedModifierTypeOptions.length > 0
    ) {
      options.push(...customModifierSettings.guaranteedModifierTypeOptions!);
    }

    // Guaranteed mod functions second
    if (
      customModifierSettings.guaranteedModifierTypeFuncs &&
      customModifierSettings.guaranteedModifierTypeFuncs.length > 0
    ) {
      customModifierSettings.guaranteedModifierTypeFuncs!.forEach((mod, _i) => {
        const modifierId = Object.keys(modifierTypeInitObj).find(k => modifierTypeInitObj[k] === mod) as string;
        let guaranteedMod: ModifierType = modifierTypeInitObj[modifierId]?.();

        // Populates item id and tier
        guaranteedMod = guaranteedMod
          .withIdFromFunc(modifierTypeInitObj[modifierId])
          .withTierFromPool(ModifierPoolType.PLAYER, party);

        const modType =
          guaranteedMod instanceof ModifierTypeGenerator ? guaranteedMod.generateType(party) : guaranteedMod;
        if (modType) {
          const option = new ModifierTypeOption(modType, 0);
          options.push(option);
        }
      });
    }

    // Guaranteed tiers third
    if (customModifierSettings.guaranteedModifierTiers && customModifierSettings.guaranteedModifierTiers.length > 0) {
      const allowLuckUpgrades = customModifierSettings.allowLuckUpgrades ?? true;
      for (const tier of customModifierSettings.guaranteedModifierTiers) {
        options.push(getModifierTypeOptionWithRetry(options, retryCount, party, tier, allowLuckUpgrades));
      }
    }

    // Fill remaining
    if (options.length < count && customModifierSettings.fillRemaining) {
      while (options.length < count) {
        options.push(getModifierTypeOptionWithRetry(options, retryCount, party, undefined));
      }
    }
  }

  overridePlayerModifierTypeOptions(options, party);

  return options;
}

/**
 * Will generate a {@linkcode ModifierType} from the {@linkcode ModifierPoolType.PLAYER} pool, attempting to retry duplicated items up to retryCount
 * @param existingOptions Currently generated options
 * @param retryCount How many times to retry before allowing a dupe item
 * @param party Current player party, used to calculate items in the pool
 * @param tier If specified will generate item of tier
 * @param allowLuckUpgrades `true` to allow items to upgrade tiers (the little animation that plays and is affected by luck)
 */
function getModifierTypeOptionWithRetry(
  existingOptions: ModifierTypeOption[],
  retryCount: number,
  party: PlayerPokemon[],
  tier?: ModifierTier,
  allowLuckUpgrades?: boolean,
): ModifierTypeOption {
  allowLuckUpgrades = allowLuckUpgrades ?? true;
  let candidate = getNewModifierTypeOption(party, ModifierPoolType.PLAYER, tier, undefined, 0, allowLuckUpgrades);
  const candidateValidity = new BooleanHolder(true);
  applyChallenges(ChallengeType.WAVE_REWARD, candidate, candidateValidity);
  let r = 0;
  while (
    (existingOptions.length &&
      ++r < retryCount &&
      existingOptions.filter(o => o.type.name === candidate?.type.name || o.type.group === candidate?.type.group)
        .length) ||
    !candidateValidity.value
  ) {
    candidate = getNewModifierTypeOption(
      party,
      ModifierPoolType.PLAYER,
      candidate?.type.tier ?? tier,
      candidate?.upgradeCount,
      0,
      allowLuckUpgrades,
    );
    applyChallenges(ChallengeType.WAVE_REWARD, candidate, candidateValidity);
  }
  return candidate!;
}

/**
 * Replaces the {@linkcode ModifierType} of the entries within {@linkcode options} with any
 * {@linkcode ModifierOverride} entries listed in {@linkcode Overrides.ITEM_REWARD_OVERRIDE}
 * up to the smallest amount of entries between {@linkcode options} and the override array.
 * @param options Array of naturally rolled {@linkcode ModifierTypeOption}s
 * @param party Array of the player's current party
 */
export function overridePlayerModifierTypeOptions(options: ModifierTypeOption[], party: PlayerPokemon[]) {
  const minLength = Math.min(options.length, Overrides.ITEM_REWARD_OVERRIDE.length);
  for (let i = 0; i < minLength; i++) {
    const override: ModifierOverride = Overrides.ITEM_REWARD_OVERRIDE[i];
    const modifierFunc = modifierTypeInitObj[override.name];
    let modifierType: ModifierType | null = modifierFunc();

    if (modifierType instanceof ModifierTypeGenerator) {
      const pregenArgs = "type" in override && override.type !== null ? [override.type] : undefined;
      modifierType = modifierType.generateType(party, pregenArgs);
    }

    if (modifierType) {
      options[i].type = modifierType.withIdFromFunc(modifierFunc).withTierFromPool(ModifierPoolType.PLAYER, party);
    }
  }
}

export function getPlayerShopModifierTypeOptionsForWave(waveIndex: number, baseCost: number): ModifierTypeOption[] {
  if (!(waveIndex % 10)) {
    return [];
  }

  const options = [
    [
      new ModifierTypeOption(modifierTypes.POTION(), 0, baseCost * 0.2),
      new ModifierTypeOption(modifierTypes.ETHER(), 0, baseCost * 0.4),
      new ModifierTypeOption(modifierTypes.REVIVE(), 0, baseCost * 2),
    ],
    [
      new ModifierTypeOption(modifierTypes.SUPER_POTION(), 0, baseCost * 0.45),
      new ModifierTypeOption(modifierTypes.FULL_HEAL(), 0, baseCost),
    ],
    [
      new ModifierTypeOption(modifierTypes.ELIXIR(), 0, baseCost),
      new ModifierTypeOption(modifierTypes.MAX_ETHER(), 0, baseCost),
    ],
    [
      new ModifierTypeOption(modifierTypes.HYPER_POTION(), 0, baseCost * 0.8),
      new ModifierTypeOption(modifierTypes.MAX_REVIVE(), 0, baseCost * 2.75),
      new ModifierTypeOption(modifierTypes.MEMORY_MUSHROOM(), 0, baseCost * 2),
      new ModifierTypeOption(modifierTypes.ABILITY_CAPSULE(), 0, baseCost * 3),
    ],
    [
      new ModifierTypeOption(modifierTypes.MAX_POTION(), 0, baseCost * 1.5),
      new ModifierTypeOption(modifierTypes.MAX_ELIXIR(), 0, baseCost * 2.5),
    ],
    [new ModifierTypeOption(modifierTypes.FULL_RESTORE(), 0, baseCost * 2.25)],
    [new ModifierTypeOption(modifierTypes.SACRED_ASH(), 0, baseCost * 10)],
  ];

  return options
    .slice(0, Math.ceil(Math.max(waveIndex + 10, 0) / 30))
    .flat()
    .filter(shopItem => {
      const status = new BooleanHolder(true);
      applyChallenges(ChallengeType.SHOP_ITEM, shopItem, status);
      return status.value;
    });
}

export function getEnemyBuffModifierForWave(
  tier: ModifierTier,
  enemyModifiers: PersistentModifier[],
): EnemyPersistentModifier | undefined {
  let tierStackCount: number;
  switch (tier) {
    case ModifierTier.ULTRA:
      tierStackCount = 5;
      break;
    case ModifierTier.GREAT:
      tierStackCount = 3;
      break;
    default:
      tierStackCount = 1;
      break;
  }

  const retryCount = 50;
  let candidate = getNewModifierTypeOption([], ModifierPoolType.ENEMY_BUFF, tier);
  let r = 0;
  let matchingModifier: PersistentModifier | undefined;

  while (
    ++r < retryCount &&
    (matchingModifier = enemyModifiers.find(m => m.type.id === candidate?.type?.id)) &&
    matchingModifier.getMaxStackCount() < matchingModifier.stackCount + (r < 10 ? tierStackCount : 1)
  ) {
    candidate = getNewModifierTypeOption([], ModifierPoolType.ENEMY_BUFF, tier);
  }

  // 후보 없음 → 아무 변화 없음
  if (!candidate?.type) {
    return undefined;
  }

  // 이미 풀스택 → 아무 변화 없음
  if (
    matchingModifier &&
    matchingModifier.stackCount >= matchingModifier.getMaxStackCount()
  ) {
    return undefined;
  }

  const modifier = candidate.type.newModifier?.() as EnemyPersistentModifier | undefined;
  if (!modifier) {
    return undefined;
  }

  modifier.stackCount = tierStackCount;
  return modifier;
}

export function getEnemyModifierTypesForWave(
  waveIndex: number,
  count: number,
  party: EnemyPokemon[],
  poolType: ModifierPoolType.WILD | ModifierPoolType.TRAINER,
  upgradeChance = 0,
): PokemonHeldItemModifierType[] {
  const ret = new Array(count)
    .fill(0)
    .map(
      () =>
        getNewModifierTypeOption(party, poolType, undefined, upgradeChance && !randSeedInt(upgradeChance) ? 1 : 0)
          ?.type as PokemonHeldItemModifierType,
    );
  if (!(waveIndex % 1000)) {
    ret.push(getModifierType(modifierTypeInitObj.MINI_BLACK_HOLE) as PokemonHeldItemModifierType);
  }
  return ret;
}

export function getDailyRunStarterModifiers(party: PlayerPokemon[]): PokemonHeldItemModifier[] {
  const ret: PokemonHeldItemModifier[] = [];
  for (const p of party) {
    for (let m = 0; m < 3; m++) {
      const tierValue = randSeedInt(64);

      let tier: ModifierTier;
      if (tierValue > 25) {
        tier = ModifierTier.COMMON;
      } else if (tierValue > 12) {
        tier = ModifierTier.GREAT;
      } else if (tierValue > 4) {
        tier = ModifierTier.ULTRA;
      } else if (tierValue) {
        tier = ModifierTier.ROGUE;
      } else {
        tier = ModifierTier.MASTER;
      }

      const modifier = getNewModifierTypeOption(party, ModifierPoolType.DAILY_STARTER, tier)?.type?.newModifier(
        p,
      ) as PokemonHeldItemModifier;
      ret.push(modifier);
    }
  }

  return ret;
}

/**
 * Generates a ModifierType from the specified pool
 * @param party party of the trainer using the item
 * @param poolType PLAYER/WILD/TRAINER
 * @param tier If specified, will override the initial tier of an item (can still upgrade with luck)
 * @param upgradeCount If defined, means that this is a new ModifierType being generated to override another via luck upgrade. Used for recursive logic
 * @param retryCount Max allowed tries before the next tier down is checked for a valid ModifierType
 * @param allowLuckUpgrades Default true. If false, will not allow ModifierType to randomly upgrade to next tier
 */
function getNewModifierTypeOption(
  party: Pokemon[],
  poolType: ModifierPoolType,
  tier?: ModifierTier,
  upgradeCount?: number,
  retryCount = 0,
  allowLuckUpgrades = true,
): ModifierTypeOption | null {
  const player = !poolType;
  const pool = getModifierPoolForType(poolType);
  let thresholds: object;
  switch (poolType) {
    case ModifierPoolType.PLAYER:
      thresholds = modifierPoolThresholds;
      break;
    case ModifierPoolType.WILD:
      thresholds = enemyModifierPoolThresholds;
      break;
    case ModifierPoolType.TRAINER:
      thresholds = enemyModifierPoolThresholds;
      break;
    case ModifierPoolType.ENEMY_BUFF:
      thresholds = enemyBuffModifierPoolThresholds;
      break;
    case ModifierPoolType.DAILY_STARTER:
      thresholds = dailyStarterModifierPoolThresholds;
      break;
  }
  if (tier === undefined) {
    const tierValue = randSeedInt(1024);
    if (!upgradeCount) {
      upgradeCount = 0;
    }
    if (player && tierValue && allowLuckUpgrades) {
      const partyLuckValue = getPartyLuckValue(party);
      const upgradeOdds = Math.floor(128 / ((partyLuckValue + 4) / 4));
      let upgraded = false;
      do {
        upgraded = randSeedInt(upgradeOdds) < 4;
        if (upgraded) {
          upgradeCount++;
        }
      } while (upgraded);
    }

    if (tierValue > 255) {
      tier = ModifierTier.COMMON;
    } else if (tierValue > 60) {
      tier = ModifierTier.GREAT;
    } else if (tierValue > 12) {
      tier = ModifierTier.ULTRA;
    } else if (tierValue) {
      tier = ModifierTier.ROGUE;
    } else {
      tier = ModifierTier.MASTER;
    }

    tier += upgradeCount;
    while (tier && (!pool.hasOwnProperty(tier) || !pool[tier].length)) {
      tier--;
      if (upgradeCount) {
        upgradeCount--;
      }
    }
  } else if (upgradeCount === undefined && player) {
    upgradeCount = 0;
    if (tier < ModifierTier.MASTER && allowLuckUpgrades) {
      const partyLuckValue = getPartyLuckValue(party);
      const upgradeOdds = Math.floor(128 / ((partyLuckValue + 4) / 4));
      while (pool.hasOwnProperty(tier + upgradeCount + 1) && pool[tier + upgradeCount + 1].length) {
        if (randSeedInt(upgradeOdds) < 4) {
          upgradeCount++;
        } else {
          break;
        }
      }
      tier += upgradeCount;
    }
  } else if (retryCount >= 100 && tier) {
    retryCount = 0;
    tier--;
  }

  const tierThresholds = Object.keys(thresholds[tier]);
  const totalWeight = Number.parseInt(tierThresholds[tierThresholds.length - 1]);
  const value = randSeedInt(totalWeight);
  let index: number | undefined;
  for (const t of tierThresholds) {
    const threshold = Number.parseInt(t);
    if (value < threshold) {
      index = thresholds[tier][threshold];
      break;
    }
  }

  if (index === undefined) {
    return null;
  }

  if (player) {
    console.log(index, ignoredPoolIndexes[tier].filter(i => i <= index).length, ignoredPoolIndexes[tier]);
  }
  let modifierType: ModifierType | null = pool[tier][index].modifierType;
  if (modifierType instanceof ModifierTypeGenerator) {
    modifierType = (modifierType as ModifierTypeGenerator).generateType(party);
    if (modifierType === null) {
      if (player) {
        console.log(ModifierTier[tier], upgradeCount);
      }
      return getNewModifierTypeOption(party, poolType, tier, upgradeCount, ++retryCount);
    }
  }

  console.log(modifierType, !player ? "(enemy)" : "");

  return new ModifierTypeOption(modifierType as ModifierType, upgradeCount!); // TODO: is this bang correct?
}

export function getDefaultModifierTypeForTier(tier: ModifierTier): ModifierType {
  const modifierPool = getModifierPoolForType(ModifierPoolType.PLAYER);
  let modifierType: ModifierType | WeightedModifierType = modifierPool[tier || ModifierTier.COMMON][0];
  if (modifierType instanceof WeightedModifierType) {
    modifierType = (modifierType as WeightedModifierType).modifierType;
  }
  return modifierType;
}

export function getModifierTypeById(typeId: any): ModifierType | null {
  const pool = getModifierPoolForType(ModifierPoolType.PLAYER);

  for (const tier of Object.values(ModifierTier)) {
    const list = pool[tier as ModifierTier];
    if (!list) continue;

    for (const entry of list) {
      const type = entry instanceof WeightedModifierType ? entry.modifierType : entry;
      if (type.id === typeId) {
        return type;
      }
    }
  }

  return null;
}

export class ModifierTypeOption {
  public type: ModifierType;
  public upgradeCount: number;
  public cost: number;

  constructor(type: ModifierType, upgradeCount: number, cost = 0) {
    this.type = type;
    this.upgradeCount = upgradeCount;
    this.cost = Math.min(Math.round(cost), Number.MAX_SAFE_INTEGER);
  }
}

/**
 * Calculates the team's luck value.
 * @param party The player's party.
 * @returns A number between 0 and 14 based on the party's total luck value, or a random number between 0 and 14 if the player is in Daily Run mode.
 */
export function getPartyLuckValue(party: Pokemon[]): number {
  if (globalScene.gameMode.isDaily) {
    const DailyLuck = new NumberHolder(0);
    globalScene.executeWithSeedOffset(
      () => {
        const eventLuck = getDailyEventSeedLuck(globalScene.seed);
        if (!isNullOrUndefined(eventLuck)) {
          DailyLuck.value = eventLuck;
          return;
        }

        DailyLuck.value = randSeedInt(15); // Random number between 0 and 14
      },
      0,
      globalScene.seed,
    );
    return DailyLuck.value;
  }

  const eventSpecies = timedEventManager.getEventLuckBoostedSpecies();
  const luck = Phaser.Math.Clamp(
    party
      .map(p => (p.isAllowedInBattle() ? p.getLuck() + (eventSpecies.includes(p.species.speciesId) ? 1 : 0) : 0))
      .reduce((total: number, value: number) => (total += value), 0),
    0,
    14,
  );
  return Math.min(timedEventManager.getEventLuckBoost() + (luck ?? 0), 14);
}

export function getLuckString(luckValue: number): string {
  return ["D", "C", "C+", "B-", "B", "B+", "A-", "A", "A+", "A++", "S", "S+", "SS", "SS+", "SSS"][luckValue];
}

export function getLuckTextTint(luckValue: number): number {
  let modifierTier: ModifierTier;
  if (luckValue > 11) {
    modifierTier = ModifierTier.LUXURY;
  } else if (luckValue > 9) {
    modifierTier = ModifierTier.MASTER;
  } else if (luckValue > 5) {
    modifierTier = ModifierTier.ROGUE;
  } else if (luckValue > 2) {
    modifierTier = ModifierTier.ULTRA;
  } else if (luckValue) {
    modifierTier = ModifierTier.GREAT;
  } else {
    modifierTier = ModifierTier.COMMON;
  }
  return getModifierTierTextTint(modifierTier);
}

export function initModifierTypes() {
  for (const [key, value] of Object.entries(modifierTypeInitObj)) {
    modifierTypes[key] = value;
  }
}

// TODO: If necessary, add the rest of the modifier types here.
// For now, doing the minimal work until the modifier rework lands.
const ModifierTypeConstructorMap = Object.freeze({
  ModifierTypeGenerator,
  PokemonHeldItemModifierType,
});

/**
 * Map of of modifier type strings to their constructor type
 */
export type ModifierTypeConstructorMap = typeof ModifierTypeConstructorMap;

/**
 * Map of modifier type strings to their instance type
 */
export type ModifierTypeInstanceMap = {
  [K in keyof ModifierTypeConstructorMap]: InstanceType<ModifierTypeConstructorMap[K]>;
};

export type ModifierTypeString = keyof ModifierTypeConstructorMap;
(window as any).ModifierType = ModifierType;

