import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { blocksNonDirectDamage } from "#abilities/block-non-direct-damage";
import {
  BoostEnergyTagAttr,
  FieldPreventExplosiveMovesAbAttr,
  FieldPriorityMoveImmunityAbAttr,
  HeldItemBypassAbAttr,
  IgnoreOpponentStatStagesAbAttr,
  MoveEffectChanceMultiplierAbAttr,
  MoveImmunityAbAttr,
  PreApplyBattlerTagAbAttr,
  PreDefendAbAttr,
  PreventBerryUseAbAttr,
  ReceivedMoveDamageMultiplierAbAttr,
  StatStageChangeMultiplierAbAttr,
  UserFieldBattlerTagImmunityAbAttr
} from "#app/data/abilities/ability";
import { maxmovesSpecies } from "#app/data/balance/trs";
import { zmovesSpecies } from "#app/data/balance/zmoves";
import {
  InstantChargeAttr,
  MissEffectAttr,
  MultiHitAttr,
  NeutralDamageAgainstFlyingTypeMultiplierAttr,
  RecoilAttr,
} from "#app/data/moves/move";
import { WeatherType } from "#app/enums/weather-type";
import { Pokemon } from "#app/field/pokemon";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import Overrides from "#app/overrides";
import { ChangeAbilityPhase, type ChangeAbilityType } from "#app/phases/change-ability-phase";
import { RegisterAbilityPhase, type RegisterAbilityType } from "#app/phases/register-ability-phase";
import { StatStageChangePhase } from "#app/phases/stat-stage-change-phase";
import { FusionSpeciesFormEvolution, pokemonEvolutions } from "#balance/pokemon-evolutions";
import { FRIENDSHIP_GAIN_FROM_RARE_CANDY } from "#balance/starters";
import { getBerryEffectFunc, getBerryPredicate } from "#data/berry";
import { allMoves, modifierTypes } from "#data/data-lists";
import { getLevelTotalExp } from "#data/exp";
import { SpeciesFormChangeItemTrigger } from "#data/form-change-triggers";
import { MAX_PER_TYPE_POKEBALLS } from "#data/pokeball";
import { getStatusEffectHealText } from "#data/status-effect";
import { TerrainType } from "#data/terrain";
import { getTypeDamageMultiplier, } from "#data/type";
import { AbilityId } from "#enums/ability-id";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { BerryType } from "#enums/berry-type";
import { Color, ShadowColor } from "#enums/color";
import { Command } from "#enums/command";
import { FormChangeItem } from "#enums/form-change-item";
import { HitResult } from "#enums/hit-result";
import { LearnMoveType } from "#enums/learn-move-type";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveCategory } from "#enums/move-category";
import { MoveFlags } from "#enums/move-flags";
import { MoveFlags2 } from "#enums/move-flags-2";
import type { MoveId } from "#enums/move-id";
import { MoveId } from "#enums/move-id";
import { MoveUseMode } from "#enums/move-use-mode";
import type { Nature } from "#enums/nature";
import type { PokeballType } from "#enums/pokeball";
import type { PokemonType } from "#enums/pokemon-type";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesFormKey } from "#enums/species-form-key";
import { SpeciesId } from "#enums/species-id";
import type { EffectiveStat } from "#enums/stat";
import { BATTLE_STATS, type BattleStat, EFFECTIVE_STATS, type PermanentStat, Stat, TEMP_BATTLE_STATS, type TempBattleStat, Stat } from "#enums/stat";
import { StatusEffect } from "#enums/status-effect";
import { TextStyle } from "#enums/text-style";
import type { PlayerPokemon, Pokemon } from "#field/pokemon";
import type {
  DoubleBattleChanceBoosterModifierType,
  EvolutionItemModifierType,
  FormChangeItemModifierType,
  ModifierOverride,
  ModifierType,
  PokemonBaseStatTotalModifierType,
  PokemonExpBoosterModifierType,
  PokemonFriendshipBoosterModifierType,
  PokemonMoveAccuracyBoosterModifierType,
  PokemonMultiHitModifierType,
  TerastallizeModifierType,
  TmModifierType,
} from "#modifiers/modifier-type";
import type { Move } from "#moves/move";
import { recordRecycleSnapshot } from "#moves/recycle-snapshot";
import type { VoucherType } from "#system/voucher";
import type { ModifierInstanceMap, ModifierString, SpeciesStatBoosterItem } from "#types/modifier-types";
import { addTextObject } from "#ui/text";
import { BooleanHolder, hslToHex, NumberHolder, randSeedFloat, toDmgValue } from "#utils/common";
import { getModifierType } from "#utils/modifier-utils";
import i18next from "i18next";
import {PERMANENT_STATS} from "/src/enums/stat";

export type ModifierPredicate = (modifier: Modifier) => boolean;

const iconOverflowIndex = 24;

export const modifierSortFunc = (a: Modifier, b: Modifier): number => {
  const itemNameMatch = a.type.name.localeCompare(b.type.name);
  const typeNameMatch = a.constructor.name.localeCompare(b.constructor.name);
  const aId = a instanceof PokemonHeldItemModifier ? a.pokemonId : -1;
  const bId = b instanceof PokemonHeldItemModifier ? b.pokemonId : -1;

  // First sort by pokemon ID, then by item type and then name
  return aId - bId || typeNameMatch || itemNameMatch;
};

export class ModifierBar extends Phaser.GameObjects.Container {
  private player: boolean;
  private modifierCache: PersistentModifier[];

  constructor(enemy?: boolean) {
    super(globalScene, 1 + (enemy ? 302 : 0), 2);

    this.player = !enemy;
    this.setScale(0.5);
  }

  /**
   * Method to update content displayed in {@linkcode ModifierBar}
   * @param {PersistentModifier[]} modifiers - The list of modifiers to be displayed in the {@linkcode ModifierBar}
   * @param {boolean} hideHeldItems - If set to "true", only modifiers not assigned to a Pokémon are displayed
   */
  updateModifiers(modifiers: PersistentModifier[], hideHeldItems = false) {
    this.removeAll(true);

    const visibleIconModifiers = modifiers.filter(m => m.isIconVisible());
    const nonPokemonSpecificModifiers = visibleIconModifiers
      .filter(m => !(m as PokemonHeldItemModifier).pokemonId)
      .sort(modifierSortFunc);
    const pokemonSpecificModifiers = visibleIconModifiers
      .filter(m => (m as PokemonHeldItemModifier).pokemonId)
      .sort(modifierSortFunc);

    const normalizeTypeIdForTier = (id?: string): string | undefined => {
  if (!id) {
    return ;
  }

  // TYPE_SPECIFIC_MOVE_BOOSTER_15 → TYPE_SPECIFIC_MOVE_BOOSTER
  if (id.startsWith("TYPE_SPECIFIC_MOVE_BOOSTER_")) {
    return "TYPE_SPECIFIC_MOVE_BOOSTER";
  }

  // ATTACK_TYPE_BOOSTER_15 같은 타입별 도구도 대비
  if (id.startsWith("ATTACK_TYPE_BOOSTER_")) {
    return "ATTACK_TYPE_BOOSTER";
  }

  return id;
};

const getTierRank = (item: any): number => {
  let tier =
    item.type?.tier
    ?? item.type?.getOrInferTier?.();

  if (tier == null) {
    const normalizedId = normalizeTypeIdForTier(item.type?.id);

    if (normalizedId === "TYPE_SPECIFIC_MOVE_BOOSTER") {
      tier = ModifierTier.GREAT;
    } else if (normalizedId === "ATTACK_TYPE_BOOSTER") {
      tier = ModifierTier.ULTRA;
    }
  }

  switch (tier) {
    case ModifierTier.MASTER:
      return 5;
    case ModifierTier.ROGUE:
      return 4;
    case ModifierTier.ULTRA:
      return 3;
    case ModifierTier.GREAT:
      return 2;
    case ModifierTier.COMMON:
      return 1;
    default:
      return 0;
  }
};

const getItemKey = (item: any): string => {
  return [
    item.type?.id ?? "",
    item.type?.iconImage ?? "",
    item.type?.localeKey ?? "",
    item.type?.getPregenArgs?.()?.join("_") ?? "",
  ].join("|");
};

const playerOwnedItemKeys = new Set(
  globalScene.findModifiers(m => m instanceof PokemonHeldItemModifier, true)
    .map(m => getItemKey(m))
);

const sortedPokemonSpecificModifiers = !this.player
  ? pokemonSpecificModifiers.slice().sort((a, b) => {
      const tierDiff = getTierRank(b) - getTierRank(a);

      // 1순위: 등급 높은 순
      if (tierDiff !== 0) {
        return tierDiff;
      }

      const aOwned = playerOwnedItemKeys.has(getItemKey(a));
      const bOwned = playerOwnedItemKeys.has(getItemKey(b));

      // 2순위: 같은 등급이면 아군에게 없는 아이템 먼저
      if (aOwned !== bOwned) {
        return aOwned ? 1 : -1;
      }

      // 3순위: 이름순
      return (a.type?.name ?? "").localeCompare(b.type?.name ?? "");
    })
  : pokemonSpecificModifiers;

const sortedVisibleIconModifiers = hideHeldItems
  ? nonPokemonSpecificModifiers
  : nonPokemonSpecificModifiers.concat(sortedPokemonSpecificModifiers);

const getTierLabel = (item: any): string => {
  switch (getTierRank(item)) {
    case 5:
      return "MASTER";
    case 4:
      return "ROGUE";
    case 3:
      return "ULTRA";
    case 2:
      return "GREAT";
    case 1:
      return "COMMON";
    default:
      return "UNKNOWN";
  }
};

if (!this.player) {
  console.log("[ENEMY_HELD_ITEM_BAR_ORDER]", sortedPokemonSpecificModifiers.map((m, index) => ({
    index,
    name: m.type?.name,
    id: m.type?.id,
    tier: getTierLabel(m),
    tierRank: getTierRank(m),
    ownedByPlayer: globalScene.findModifiers(
      pm => pm.type?.id === m.type?.id,
      true,
    ).length > 0,
    pokemonId: (m as PokemonHeldItemModifier).pokemonId,
  })));
}

console.log("[ITEM_SORT_CHECK]",
  sortedPokemonSpecificModifiers.map(i => ({
    name: i.type.name,
    tier: getTierLabel(i),
    owned: playerOwnedItemKeys.has(getItemKey(i))
  }))
);

const displayModifiers = hideHeldItems
  ? nonPokemonSpecificModifiers
  : this.player
    ? nonPokemonSpecificModifiers.concat(sortedPokemonSpecificModifiers)
    : nonPokemonSpecificModifiers.concat(sortedPokemonSpecificModifiers.slice().reverse());

    displayModifiers.forEach((modifier: PersistentModifier, i: number) => {
      const icon = modifier.getIcon();
      if (i >= iconOverflowIndex) {
        icon.setVisible(false);
      }
      this.add(icon);
      this.setModifierIconPosition(icon, displayModifiers.length);
      icon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 32, 24), Phaser.Geom.Rectangle.Contains);
      icon.on("pointerover", () => {
        globalScene.ui.showTooltip(modifier.type.name, modifier.type.getDescription());
        
      });
      icon.on("pointerout", () => {
        globalScene.ui.hideTooltip();
      });
    });

    for (const icon of this.getAll()) {
      this.sendToBack(icon);
    }

    this.modifierCache = modifiers;
  }

  updateModifierOverflowVisibility(ignoreLimit: boolean) {
    const modifierIcons = this.getAll().reverse() as Phaser.GameObjects.Container[];
    for (const modifier of modifierIcons.slice(iconOverflowIndex)) {
      modifier.setVisible(ignoreLimit);
    }
  }

  setModifierIconPosition(icon: Phaser.GameObjects.Container, modifierCount: number) {
    const rowIcons: number = 12 + 6 * Math.max(Math.ceil(Math.min(modifierCount, 24) / 12) - 2, 0);

    const x = ((this.getIndex(icon) % rowIcons) * 26) / (rowIcons / 12);
    const y = Math.floor(this.getIndex(icon) / rowIcons) * 20;

    icon.setPosition(this.player ? x : -x, y);
  }
}

export abstract class Modifier {
  public type: ModifierType;

  constructor(type: ModifierType) {
    this.type = type;
  }

  getPracticeLogName(): string {
  return this.type?.name
    ?? (this.type as any)?.id
    ?? this.constructor.name;
}

  /**
   * Return whether this modifier is of the given class
   *
   * @remarks
   * Used to avoid requiring the caller to have imported the specific modifier class, avoiding circular dependencies.
   *
   * @param modifier - The modifier to check against
   * @returns Whether the modiifer is an instance of the given type
   */
  public is<T extends ModifierString>(modifier: T): this is ModifierInstanceMap[T] {
    const targetModifier = ModifierClassMap[modifier];
    if (!targetModifier) {
      return false;
    }
    return this instanceof targetModifier;
  }

  match(_modifier: Modifier): boolean {
    return false;
  }

  /**
   * Checks if {@linkcode Modifier} should be applied
   * @param _args parameters passed to {@linkcode Modifier.apply}
   * @returns always `true` by default
   */
  shouldApply(..._args: Parameters<this["apply"]>): boolean {
    return true;
  }

  /**
   * Handles applying of {@linkcode Modifier}
   * @param args collection of all passed parameters
   */
  abstract apply(...args: unknown[]): boolean;
}

export abstract class PersistentModifier extends Modifier {
  public stackCount: number;
  public virtualStackCount: number;

  /** This field does not exist at runtime and must not be used.
   * Its sole purpose is to ensure that typescript is able to properly narrow when the `is` method is called.
   */
  private declare _: never;

  constructor(type: ModifierType, stackCount = 1) {
    super(type);
    this.stackCount = stackCount;
    this.virtualStackCount = 0;
  }

  add(modifiers: PersistentModifier[], virtual: boolean): boolean {
    for (const modifier of modifiers) {
      if (this.match(modifier)) {
        return modifier.incrementStack(this.stackCount, virtual);
      }
    }

    if (virtual) {
      this.virtualStackCount += this.stackCount;
      this.stackCount = 0;
    }
    modifiers.push(this);
    return true;
  }

  abstract clone(): PersistentModifier;

  getArgs(): any[] {
    return [];
  }

  incrementStack(amount: number, virtual: boolean): boolean {
    if (this.getStackCount() + amount <= this.getMaxStackCount()) {
      if (!virtual) {
        this.stackCount += amount;
      } else {
        this.virtualStackCount += amount;
      }
      return true;
    }

    return false;
  }

  getStackCount(): number {
    return this.stackCount + this.virtualStackCount;
  }

  abstract getMaxStackCount(forThreshold?: boolean): number;

  getCountUnderMax(): number {
    return this.getMaxStackCount() - this.getStackCount();
  }

  isIconVisible(): boolean {
    return true;
  }

  getIcon(_forSummary?: boolean): Phaser.GameObjects.Container | null {
  const iconFrame = this.type?.iconImage;

  // ✅ 프레임이 없으면 아이콘 자체를 만들지 않거나(추천)
  if (!iconFrame) {
    return null;
  }

  const container = globalScene.add.container(0, 0);

  const item = globalScene.add.sprite(0, 12, "items");
  item.setFrame(iconFrame);
  item.setOrigin(0, 0.5);
  container.add(item);

  const stackText = this.getIconStackText();
  if (stackText) { container.add(stackText); }

  const virtualStackText = this.getIconStackText(true);
  if (virtualStackText) { container.add(virtualStackText); }

  return container;
}

  getIconStackText(virtual?: boolean): Phaser.GameObjects.BitmapText | null {
    if (this.getMaxStackCount() === 1 || (virtual && !this.virtualStackCount)) {
      return null;
    }

    const text = globalScene.add.bitmapText(10, 15, "item-count", this.stackCount.toString(), 11);
    text.letterSpacing = -0.5;
    if (this.getStackCount() >= this.getMaxStackCount()) {
      text.setTint(0xf89890);
    }
    text.setOrigin(0, 0);

    return text;
  }
}

export abstract class ConsumableModifier extends Modifier {
  add(_modifiers: Modifier[]): boolean {
    return true;
  }
}

export class AddPokeballModifier extends ConsumableModifier {
  private pokeballType: PokeballType;
  private count: number;

  constructor(type: ModifierType, pokeballType: PokeballType, count: number) {
    super(type);

    this.pokeballType = pokeballType;
    this.count = count;
  }

  /**
   * Applies {@linkcode AddPokeballModifier}
   * @param battleScene {@linkcode BattleScene}
   * @returns always `true`
   */
  override apply(): boolean {
    const pokeballCounts = globalScene.pokeballCounts;
    pokeballCounts[this.pokeballType] = Math.min(
      pokeballCounts[this.pokeballType] + this.count,
      MAX_PER_TYPE_POKEBALLS,
    );

    return true;
  }
}

export class AddVoucherModifier extends ConsumableModifier {
  private voucherType: VoucherType;
  private count: number;

  constructor(type: ModifierType, voucherType: VoucherType, count: number) {
    super(type);

    this.voucherType = voucherType;
    this.count = count;
  }

  /**
   * Applies {@linkcode AddVoucherModifier}
   * @param battleScene {@linkcode BattleScene}
   * @returns always `true`
   */
  override apply(): boolean {
    const voucherCounts = globalScene.gameData.voucherCounts;
    voucherCounts[this.voucherType] += this.count;

    return true;
  }
}

/**
 * Modifier used for party-wide or passive items that start an initial
 * {@linkcode battleCount} equal to {@linkcode maxBattles} that, for every
 * battle, decrements. Typically, when {@linkcode battleCount} reaches 0, the
 * modifier will be removed. If a modifier of the same type is to be added, it
 * will reset {@linkcode battleCount} back to {@linkcode maxBattles} of the
 * existing modifier instead of adding that modifier directly.
 * @extends PersistentModifier
 * @abstract
 * @see {@linkcode add}
 */
export abstract class LapsingPersistentModifier extends PersistentModifier {
  /** The maximum amount of battles the modifier will exist for */
  private maxBattles: number;
  /** The current amount of battles the modifier will exist for */
  private battleCount: number;

  constructor(type: ModifierType, maxBattles: number, battleCount?: number, stackCount?: number) {
    super(type, stackCount);

    this.maxBattles = maxBattles;
    this.battleCount = battleCount ?? this.maxBattles;
  }

  /**
   * Goes through existing modifiers for any that match the selected modifier,
   * which will then either add it to the existing modifiers if none were found
   * or, if one was found, it will refresh {@linkcode battleCount}.
   * @param modifiers {@linkcode PersistentModifier} array of the player's modifiers
   * @param _virtual N/A
   * @param _scene N/A
   * @returns `true` if the modifier was successfully added or applied, false otherwise
   */
  add(modifiers: PersistentModifier[], _virtual: boolean): boolean {
    for (const modifier of modifiers) {
      if (this.match(modifier)) {
        const modifierInstance = modifier as LapsingPersistentModifier;
        if (modifierInstance.getBattleCount() < modifierInstance.getMaxBattles()) {
          modifierInstance.resetBattleCount();
          globalScene.playSound("se/restore");
          return true;
        }
        // should never get here
        return false;
      }
    }

    modifiers.push(this);
    return true;
  }

  /**
   * Lapses the {@linkcode battleCount} by 1.
   * @param _args passed arguments (not in use here)
   * @returns `true` if the {@linkcode battleCount} is greater than 0
   */
  public lapse(..._args: unknown[]): boolean {
    this.battleCount--;
    return this.battleCount > 0;
  }

  getIcon(): Phaser.GameObjects.Container {
    const container = super.getIcon();

    // Linear interpolation on hue
    const hue = Math.floor(120 * (this.battleCount / this.maxBattles) + 5);

    // Generates the color hex code with a constant saturation and lightness but varying hue
    const typeHex = hslToHex(hue, 0.5, 0.9);
    const strokeHex = hslToHex(hue, 0.7, 0.3);

    const battleCountText = addTextObject(27, 0, this.battleCount.toString(), TextStyle.PARTY, {
      fontSize: "66px",
      color: typeHex,
    });
    battleCountText.setShadow(0, 0);
    battleCountText.setStroke(strokeHex, 16);
    battleCountText.setOrigin(1, 0);
    container.add(battleCountText);

    return container;
  }

  getIconStackText(_virtual?: boolean): Phaser.GameObjects.BitmapText | null {
    return null;
  }

  getBattleCount(): number {
    return this.battleCount;
  }

  resetBattleCount(): void {
    this.battleCount = this.maxBattles;
  }

  /**
   * Updates an existing modifier with a new `maxBattles` and `battleCount`.
   */
  setNewBattleCount(count: number): void {
    this.maxBattles = count;
    this.battleCount = count;
  }

  getMaxBattles(): number {
    return this.maxBattles;
  }

  getArgs(): any[] {
    return [this.maxBattles, this.battleCount];
  }

  getMaxStackCount(_forThreshold?: boolean): number {
    // Must be an abitrary number greater than 1
    return 2;
  }
}

/**
 * Modifier used for passive items, specifically lures, that
 * temporarily increases the chance of a double battle.
 * @extends LapsingPersistentModifier
 * @see {@linkcode apply}
 */
export class DoubleBattleChanceBoosterModifier extends LapsingPersistentModifier {
  public declare type: DoubleBattleChanceBoosterModifierType;

  match(modifier: Modifier): boolean {
    return modifier instanceof DoubleBattleChanceBoosterModifier && modifier.getMaxBattles() === this.getMaxBattles();
  }

  clone(): DoubleBattleChanceBoosterModifier {
    return new DoubleBattleChanceBoosterModifier(
      this.type,
      this.getMaxBattles(),
      this.getBattleCount(),
      this.stackCount,
    );
  }

  /**
   * Increases the chance of a double battle occurring
   * @param doubleBattleChance {@linkcode NumberHolder} for double battle chance
   * @returns true
   */
  override apply(doubleBattleChance: NumberHolder): boolean {
    // This is divided because the chance is generated as a number from 0 to doubleBattleChance.value using randSeedInt
    // A double battle will initiate if the generated number is 0
    doubleBattleChance.value /= 4;

    return true;
  }
}

export class WeatherRockTrainerModifier extends LapsingPersistentModifier {
  private readonly weatherType: WeatherType;
  private readonly duration: number;
  private remainingTurns: number;

  constructor(
    type: ModifierType,
    weatherType: WeatherType,
    duration = 10,
    battleCount?: number,
    stackCount?: number,
    remainingTurns = 10 // 🟢 기본 10턴
  ) {
    super(type, duration, battleCount, stackCount);
    this.weatherType = weatherType;
    this.duration = duration;
    this.remainingTurns = remainingTurns;
  }

  getRemainingTurns(): number {
    return this.remainingTurns;
  }

  setRemainingTurns(turns: number): void {
    this.remainingTurns = Math.max(turns, 0);
  }

  override match(modifier: Modifier): boolean {
    return modifier instanceof WeatherRockTrainerModifier && modifier.weatherType === this.weatherType;
  }

  override clone(): WeatherRockTrainerModifier {
    return new WeatherRockTrainerModifier(
      this.type,
      this.weatherType,
      this.getMaxBattles(),
      this.getBattleCount(),
      this.stackCount,
      this.remainingTurns
    );
  }

  override getArgs(): any[] {
    return [this.weatherType, this.getMaxBattles(), this.getBattleCount(), this.stackCount, this.remainingTurns];
  }

  /** ✅ 전투 시작 시 날씨 설정 */
  override onBattleStart(): void {
    const arena = globalScene.arena;
    if (!arena) { return; }

    const trainerPokemon = globalScene.getPlayerParty()?.[0];
    const currentWeather = arena.weather?.weatherType ?? WeatherType.NONE;
    const turnsLeft = arena.weather?.turnsLeft ?? 0;

    // ✅ 이미 같은 날씨가 유지 중이면 다시 설정하지 않음
    if (currentWeather === this.weatherType && turnsLeft > 0) {
      console.log(`[WeatherRockTrainerModifier] ${WeatherType[this.weatherType]} 이미 유지 중 (남은 턴: ${turnsLeft}) → 스킵`);
      return;
    }

    if (arena.weather?.isImmutable?.()) { return; }

    const success = arena.trySetWeather(this.weatherType, trainerPokemon);
    if (success && arena.weather) {
      // ✅ 이전 저장된 턴이 있다면 그대로 복원
      if (this.remainingTurns > 0 && this.remainingTurns < this.duration) {
        arena.weather.turnsLeft = this.remainingTurns;
        console.log(`[WeatherRockTrainerModifier] ${WeatherType[this.weatherType]} 재적용 (남은 턴: ${this.remainingTurns})`);
      } else {
        // 새로 설정할 때만 초기화
        arena.weather.turnsLeft = this.duration;
        this.remainingTurns = this.duration;
        console.log(`[WeatherRockTrainerModifier] ${WeatherType[this.weatherType]} 새로 설정됨 (${this.duration}턴)`);
      }

      const msg = i18next.t("modifier:weatherRockTrainerApply", {
        pokemonNameWithAffix: getPokemonNameWithAffix(trainerPokemon),
        weatherName: WeatherType[this.weatherType],
        turns: arena.weather.turnsLeft,
      });
      globalScene.phaseManager.queueMessage(msg);
    }
  }

  /** ✅ 턴 종료 시 자동으로 턴 수 감소 및 종료 처리 */
  override onTurnEnd(): void {
    const arena = globalScene.arena;
    if (!arena?.weather || arena.weather.weatherType !== this.weatherType) { return; }

    // 🔹 턴 감소
    if (arena.weather.turnsLeft > 0) {
      arena.weather.turnsLeft--;
      this.remainingTurns = arena.weather.turnsLeft; // 🟢 남은 턴 저장
    }

    console.log(`[WeatherRockTrainerModifier] ${WeatherType[this.weatherType]} 남은 턴: ${arena.weather.turnsLeft}`);

    // 🔹 날씨 종료 처리
    if (arena.weather.turnsLeft <= 0) {
      const weatherName = WeatherType[this.weatherType];
      console.log(`[WeatherRockTrainerModifier] ${weatherName} 종료 → 날씨 초기화 및 Modifier 제거`);

      const endMessages: Record<WeatherType, string> = {
        [WeatherType.SUNNY]: i18next.t("weather:sunnyEndMessage"),
        [WeatherType.RAIN]: i18next.t("weather:rainEndMessage"),
        [WeatherType.SANDSTORM]: i18next.t("weather:sandstormEndMessage"),
        [WeatherType.SNOW]: i18next.t("weather:snowEndMessage"),
        [WeatherType.NONE]: "",
      };

      const msg = endMessages[this.weatherType] ?? "";
      if (msg) { globalScene.phaseManager.queueMessage(msg); }

      // 🔹 날씨 해제 및 완전 제거
      arena.trySetWeather(WeatherType.NONE);
      globalScene.removeModifier(this, true);
    }
  }

  override getMaxStackCount(): number {
    return 1;
  }
}

export class TerrainSeedTrainerModifier extends LapsingPersistentModifier {
  private readonly terrainType: TerrainType;
  private readonly duration: number;
  private remainingTurns: number;

  constructor(
    type: ModifierType,
    terrainType: TerrainType,
    duration = 10,
    battleCount?: number,
    stackCount?: number,
    remainingTurns = 10 // 🟢 기본 10턴
  ) {
    super(type, duration, battleCount, stackCount);
    this.terrainType = terrainType;
    this.duration = duration;
    this.remainingTurns = remainingTurns;
  }

  getRemainingTurns(): number {
    return this.remainingTurns;
  }

  setRemainingTurns(turns: number): void {
    this.remainingTurns = Math.max(turns, 0);
  }

  override match(modifier: Modifier): boolean {
    return modifier instanceof TerrainSeedTrainerModifier && modifier.terrainType === this.terrainType;
  }

  override clone(): TerrainSeedTrainerModifier {
    return new TerrainSeedTrainerModifier(
      this.type,
      this.terrainType,
      this.getMaxBattles(),
      this.getBattleCount(),
      this.stackCount,
      this.remainingTurns
    );
  }

  override getArgs(): any[] {
    return [this.terrainType, this.getMaxBattles(), this.getBattleCount(), this.stackCount, this.remainingTurns];
  }

  /** ✅ 전투 시작 시 필드 설정 */
  override onBattleStart(): void {
    const arena = globalScene.arena;
    if (!arena) { return; }

    const trainerPokemon = globalScene.getPlayerParty()?.[0];
    const currentTerrain = arena.terrain?.terrainType ?? TerrainType.NONE;
    const turnsLeft = arena.terrain?.turnsLeft ?? 0;

    // ✅ 이미 같은 필드가 유지 중이면 다시 설정하지 않음
    if (currentTerrain === this.terrainType && turnsLeft > 0) {
      console.log(`[TerrainSeedTrainerModifier] ${TerrainType[this.terrainType]} 이미 유지 중 (남은 턴: ${turnsLeft}) → 스킵`);
      return;
    }

    const success = arena.trySetTerrain(this.terrainType, trainerPokemon);
    if (success && arena.terrain) {
      // ✅ 이전 저장된 턴 복원
      if (this.remainingTurns > 0 && this.remainingTurns < this.duration) {
        arena.terrain.turnsLeft = this.duration; // 강제 10턴
  this.remainingTurns = this.duration;
        console.log(`[TerrainSeedTrainerModifier] ${TerrainType[this.terrainType]} 재적용 (남은 턴: ${this.remainingTurns})`);
      } else {
        arena.terrain.turnsLeft = this.duration;
        this.remainingTurns = this.duration;
        console.log(`[TerrainSeedTrainerModifier] ${TerrainType[this.terrainType]} 새로 설정됨 (${this.duration}턴)`);
      }

      const msg = i18next.t("modifier:terrainRockTrainerApply", {
        pokemonNameWithAffix: getPokemonNameWithAffix(trainerPokemon),
        terrainName: TerrainType[this.terrainType],
        turns: arena.terrain.turnsLeft,
      });
      globalScene.phaseManager.queueMessage(msg);
    }
  }

  /** ✅ 턴 종료 시 자동 감소 및 해제 처리 */
  override onTurnEnd(): void {
    const arena = globalScene.arena;
    if (!arena?.terrain || arena.terrain.terrainType !== this.terrainType) { return; }

    if (arena.terrain.turnsLeft > 0) {
      arena.terrain.turnsLeft--;
      this.remainingTurns = arena.terrain.turnsLeft;
    }

    console.log(`[TerrainSeedTrainerModifier] ${TerrainType[this.terrainType]} 남은 턴: ${arena.terrain.turnsLeft}`);

    if (arena.terrain.turnsLeft <= 0) {
  const terrainName = TerrainType[this.terrainType];
  console.log(`[TerrainSeedTrainerModifier] ${terrainName} 종료 → 필드 초기화 및 Modifier 제거`);

  const endMessages: Record<TerrainType, string> = {
    [TerrainType.MISTY]: i18next.t("terrain:mistyEndMessage"),
    [TerrainType.ELECTRIC]: i18next.t("terrain:electricEndMessage"),
    [TerrainType.GRASSY]: i18next.t("terrain:grassyEndMessage"),
    [TerrainType.PSYCHIC]: i18next.t("terrain:psychicEndMessage"),
    [TerrainType.NONE]: "",
  };

  const msg = endMessages[this.terrainType] ?? "";
  if (msg) { globalScene.phaseManager.queueMessage(msg); }

  // 🔹 시도 1: 정상 해제
  const cleared = arena.trySetTerrain(TerrainType.NONE);

  // 🔹 시도 2: 실패 시 강제 초기화
  if (!cleared) {
    console.warn(`[TerrainSeedTrainerModifier] ${terrainName} 필드 해제 실패 → 강제 초기화`);
    if (arena.terrain) {
      arena.terrain.terrainType = TerrainType.NONE;
      arena.terrain.turnsLeft = 0;
    }
  }

  globalScene.removeModifier(this, true);
}
  }

  override getMaxStackCount(): number {
    return 1;
  }
}

/**
 * Modifier used for party-wide items, specifically the X items, that
 * temporarily increases the stat stage multiplier of the corresponding
 * {@linkcode TempBattleStat}.
 * @extends LapsingPersistentModifier
 * @see {@linkcode apply}
 */
export class TempStatStageBoosterModifier extends LapsingPersistentModifier {
  /** The stat whose stat stage multiplier will be temporarily increased */
  private stat: TempBattleStat;
  /** The amount by which the stat stage itself or its multiplier will be increased by */
  private boost: number;

  constructor(type: ModifierType, stat: TempBattleStat, maxBattles: number, battleCount?: number, stackCount?: number) {
    super(type, maxBattles, battleCount, stackCount);

    this.stat = stat;
    // Note that, because we want X Accuracy to maintain its original behavior,
    // it will increment as it did previously, directly to the stat stage.
    this.boost = stat !== Stat.ACC ? 0.3 : 1;
  }

  match(modifier: Modifier): boolean {
    if (modifier instanceof TempStatStageBoosterModifier) {
      const modifierInstance = modifier as TempStatStageBoosterModifier;
      return modifierInstance.stat === this.stat;
    }
    return false;
  }

  clone() {
    return new TempStatStageBoosterModifier(
      this.type,
      this.stat,
      this.getMaxBattles(),
      this.getBattleCount(),
      this.stackCount,
    );
  }

  getArgs(): any[] {
    return [this.stat, ...super.getArgs()];
  }

  /**
   * Checks if {@linkcode args} contains the necessary elements and if the
   * incoming stat is matches {@linkcode stat}.
   * @param tempBattleStat {@linkcode TempBattleStat} being affected
   * @param statLevel {@linkcode NumberHolder} that holds the resulting value of the stat stage multiplier
   * @returns `true` if the modifier can be applied, false otherwise
   */
  override shouldApply(tempBattleStat?: TempBattleStat, statLevel?: NumberHolder): boolean {
    return (
      !!tempBattleStat && !!statLevel && TEMP_BATTLE_STATS.includes(tempBattleStat) && tempBattleStat === this.stat
    );
  }

  /**
   * Increases the incoming stat stage matching {@linkcode stat} by {@linkcode boost}.
   * @param _tempBattleStat {@linkcode TempBattleStat} N/A
   * @param statLevel {@linkcode NumberHolder} that holds the resulting value of the stat stage multiplier
   */
  override apply(_tempBattleStat: TempBattleStat, statLevel: NumberHolder): boolean {
    statLevel.value += this.boost;
    return true;
  }
}

/**
 * Modifier used for party-wide items, namely Dire Hit, that
 * temporarily increments the critical-hit stage
 * @extends LapsingPersistentModifier
 * @see {@linkcode apply}
 */
export class TempCritBoosterModifier extends LapsingPersistentModifier {
  clone() {
    return new TempCritBoosterModifier(this.type, this.getMaxBattles(), this.getBattleCount(), this.stackCount);
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof TempCritBoosterModifier;
  }

  /**
   * Checks if {@linkcode args} contains the necessary elements.
   * @param critLevel {@linkcode NumberHolder} that holds the resulting critical-hit level
   * @returns `true` if the critical-hit stage boost applies successfully
   */
  override shouldApply(critLevel?: NumberHolder): boolean {
    return !!critLevel;
  }

  /**
   * Increases the current critical-hit stage value by 1.
   * @param critLevel {@linkcode NumberHolder} that holds the resulting critical-hit level
   * @returns `true` if the critical-hit stage boost applies successfully
   */
  override apply(critLevel: NumberHolder): boolean {
    critLevel.value++;
    return true;
  }
}

export class MapModifier extends PersistentModifier {
  clone(): MapModifier {
    return new MapModifier(this.type, this.stackCount);
  }

  override apply(..._args: unknown[]): boolean {
    return true;
  }

  getMaxStackCount(): number {
    return 1;
  }
}

export class MegaEvolutionAccessModifier extends PersistentModifier {
  clone(): MegaEvolutionAccessModifier {
    return new MegaEvolutionAccessModifier(this.type, this.stackCount);
  }

  override apply(..._args: unknown[]): boolean {
    return true;
  }

  getMaxStackCount(): number {
    return 1;
  }
}

export class GigantamaxAccessModifier extends PersistentModifier {
  clone(): GigantamaxAccessModifier {
    return new GigantamaxAccessModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode GigantamaxAccessModifier}
   * @param _args N/A
   * @returns always `true`
   */
  apply(..._args: unknown[]): boolean {
    return true;
  }

  getMaxStackCount(): number {
    return 1;
  }
}

export class TerastallizeAccessModifier extends PersistentModifier {
  clone(): TerastallizeAccessModifier {
    return new TerastallizeAccessModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode TerastallizeAccessModifier}
   * @param _args N/A
   * @returns always `true`
   */
  override apply(..._args: unknown[]): boolean {
    return true;
  }

  getMaxStackCount(): number {
    return 1;
  }
}

export class GenericZMoveAccessModifier extends PersistentModifier {
  clone(): GenericZMoveAccessModifier {
    return new GenericZMoveAccessModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode GenericZMoveAccessModifier}
   * 범용 Z기술 사용 가능
   * @param _args N/A
   * @returns always `true`
   */
  override apply(..._args: unknown[]): boolean {
    return true;
  }

  getMaxStackCount(): number {
    return 1;
  }
}
window.GenericZMoveAccessModifier = GenericZMoveAccessModifier;

// 전용 Z기술 접근 Modifier
export class ExclusiveZMoveAccessModifier extends PersistentModifier {
  clone(): ExclusiveZMoveAccessModifier {
    return new ExclusiveZMoveAccessModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode ExclusiveZMoveAccessModifier}
   * 포켓몬 전용 Z기술 사용 가능
   * @param _args N/A
   * @returns always `true`
   */
  override apply(..._args: unknown[]): boolean {
    return true;
  }

  getMaxStackCount(): number {
    return 1;
  }
}
window.ExclusiveZMoveAccessModifier = ExclusiveZMoveAccessModifier;

// 다이맥스 및 G-Max 기술 접근 Modifier
export class MaxMoveAccessModifier extends PersistentModifier {
  clone(): MaxMoveAccessModifier {
    return new MaxMoveAccessModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode MaxMoveAccessModifier}
   * 범용 다이맥스 및 전용 G-Max 기술 사용 가능
   * @param _args N/A
   * @returns always `true`
   */
  override apply(..._args: unknown[]): boolean {
    return true;
  }

  getMaxStackCount(): number {
    return 1;
  }
}

export abstract class PokemonHeldItemModifier extends PersistentModifier {
  public pokemonId: number;
  public isTransferable = true;
  public isPracticeRental = false;

  private maxBattles?: number;
  private battleCount?: number;
  private isGlobalKlutzActive(): boolean {
  const fieldMons = [
    ...globalScene.getPlayerField().filter(p => p?.isActive()),
    ...globalScene.getEnemyField().filter(p => p?.isActive()),
  ] as Pokemon[];

  // 필드 위에 "서투름이 적용 가능한 상태"인 포켓몬이 1마리라도 있으면 true
  return fieldMons.some(p => p.isOnField() && p.hasAbility(AbilityId.KLUTZ, true));
}

private isGlobalCommensalActive(): boolean {
  const fieldMons = [
    ...globalScene.getPlayerField().filter(p => p?.isActive()),
    ...globalScene.getEnemyField().filter(p => p?.isActive()),
  ] as Pokemon[];

  return fieldMons.some(p => p.isOnField() && p.hasAbilityWithAttr("AllyHeldItemShareAbAttr" as AbAttrString, true));
}

private isPokemonLike(x: any): x is Pokemon {
  return !!x
    && typeof x === "object"
    && typeof x.isOnField === "function"
    && typeof x.isActive === "function"
    && typeof x.isPlayer === "function"   // Pokemon이면 보통 isPlayer()가 있음
    && typeof x.id === "number";
}

private extractTarget(first: any, args: any[]): Pokemon | undefined {
  if (this.isPokemonLike(first)) { return first; }
  const found = args.find(a => this.isPokemonLike(a));
  return found as Pokemon | undefined;
}

private isEmbargoActiveOn(pokemon: Pokemon): boolean {
  return !!pokemon.getTag?.(BattlerTagType.EMBARGO);
}

private isMagicRoomActive(): boolean {
  const has = globalScene.arena.hasTag(ArenaTagType.MAGIC_ROOM);
  return has;
}

  constructor(type: ModifierType, pokemonId: number, stackCount?: number, maxBattles?: number, battleCount?: number) {
    super(type, stackCount);

    this.pokemonId = pokemonId;

    if (maxBattles !== undefined) {
      this.maxBattles = maxBattles;
      this.battleCount = battleCount ?? maxBattles;
    }
  }

  public hasTurnLimit(): boolean {
    return this.maxBattles !== undefined && this.battleCount !== undefined;
  }

  public getMaxBattles(): number | undefined {
    return this.maxBattles;
  }

  public getBattleCount(): number | undefined {
    return this.battleCount;
  }

  public decrementBattleCount(): boolean {
    if (this.battleCount !== undefined) {
      this.battleCount--;
      return this.battleCount > 0;
    }
    return true;
  }

  public resetBattleCount(): void {
    if (this.maxBattles !== undefined) {
      this.battleCount = this.maxBattles;
    }
  }

  override clone(): PokemonHeldItemModifier {
    throw new Error("Must override clone method in subclass when adding turn limit");
  }

  abstract matchType(_modifier: Modifier): boolean;

  match(modifier: Modifier) {
    return this.matchType(modifier) && (modifier as PokemonHeldItemModifier).pokemonId === this.pokemonId;
  }

  getArgs(): any[] {
    return this.hasTurnLimit() ? [this.pokemonId, this.maxBattles, this.battleCount] : [this.pokemonId];
  }

  abstract override apply(pokemon: Pokemon, ...args: unknown[]): boolean;

  override shouldApply(pokemon?: any, ...args: unknown[]): boolean {
  // ✅ 실제 타겟 포켓몬을 인자들에서 찾아냄
  const target = this.extractTarget(pokemon, args as any[]);
if (!target) {
  return false;
}

const owner = this.getPokemon();
if (!owner) { return false; }

  const isOwnerTarget = (this.pokemonId === -1 || target.id === this.pokemonId);

  const isSharedToAlly =
    !isOwnerTarget &&
    owner.isPlayer() === target.isPlayer() &&
    owner.isOnField() &&
    target.isOnField() &&
    this.isGlobalCommensalActive();

  if (!isOwnerTarget && !isSharedToAlly) { return false; }

    // 서투름
if (this.isGlobalKlutzActive() && this.type.id !== ModifierType.MOLD_BREAKER_BELT) {
  return false;
}

// 매직룸
const magicRoom = this.isMagicRoomActive();

if (magicRoom) {
  console.log(`[HeldItem] BLOCKED by MAGIC_ROOM | item=${this.type.id}`);
  return false;
}

// 금제
if (this.isEmbargoActiveOn(target) && this.type.id !== ModifierType.MOLD_BREAKER_BELT) {
  return false;
}

const cancelled = new BooleanHolder(false);
let blockedReason: "SELF" | "FOE" | null = null;
let blockedBy: string | null = null;

// (A) target 자신 요인
applyAbAttrs("HeldItemBypassAbAttr", { pokemon: target, modifier: this, cancelled });
if (cancelled.value) {
  blockedReason = "SELF";
  blockedBy = target.name;
}

if (!cancelled.value) {
  const foes = globalScene
    .getField(true)
    .filter(p => p?.isOnField?.() && p.isPlayer() !== target.isPlayer()) as Pokemon[];

  for (const foe of foes) {
    if (cancelled.value) { break; }

    const mods = foe.getHeldItems?.() ?? [];
    for (const mod of mods) {
      if (cancelled.value) { break; }

      const getter = (mod as any).getAbilityAttrs;
      if (typeof getter !== "function") { continue; }

      const attrs = getter.call(mod, "HeldItemBypassAbAttr") as AbAttr[];
      for (const attr of attrs) {
        if (cancelled.value) { break; }

        if (attr.canApply({ pokemon: target, modifier: this, cancelled } as any)) {
          attr.apply({ pokemon: target, modifier: this, cancelled, simulated: false } as any);

          if (cancelled.value) {
            blockedReason = "FOE";
            blockedBy = `${foe.name} / ${(mod as any)?.type?.id ?? "UNKNOWN_ITEM"}`;
          }
        }
      }
    }
  }
}

if (cancelled.value) {
  return false;
}
// 최종 통과
return true;
}

  isIconVisible(): boolean {
    return !!this.getPokemon()?.isOnField();
  }

  getIcon(forSummary?: boolean): Phaser.GameObjects.Container {
    const container = forSummary ? super.getIcon() : globalScene.add.container(0, 0);

    if (forSummary) {
      container.setScale(0.5);
    } else {
      const pokemon = this.getPokemon();
      if (pokemon) {
        const pokemonIcon = globalScene.addPokemonIcon(pokemon, -2, 10, 0, 0.5, undefined, true);
        container.add(pokemonIcon);
        container.setName(pokemon.id.toString());
      }

      const item = globalScene.add.sprite(16, this.virtualStackCount ? 8 : 16, "items");
      item.setScale(0.5);
      item.setOrigin(0, 0.5);
      item.setTexture("items", this.type.iconImage);
      container.add(item);

      const stackText = this.getIconStackText();
      if (stackText) {
        container.add(stackText);
      }

      const virtualStackText = this.getIconStackText(true);
      if (virtualStackText) {
        container.add(virtualStackText);
      }
    }

    return container;
  }

  getPokemon(): Pokemon | undefined {
  return this.pokemonId !== undefined && this.pokemonId !== null
    ? (globalScene.getPokemonById(this.pokemonId) ?? undefined)
    : undefined;
}

  getScoreMultiplier(): number {
    return 1;
  }

  getSpecies(): SpeciesId | null {
    return null;
  }

  getMaxStackCount(forThreshold?: boolean): number {
    const pokemon = this.getPokemon();
    if (!pokemon) {
      return 0;
    }
    if (pokemon.isPlayer() && forThreshold) {
      return globalScene
        .getPlayerParty()
        .map(p => this.getMaxHeldItemCount(p))
        .reduce((stackCount: number, maxStackCount: number) => Math.max(stackCount, maxStackCount), 0);
    }
    return this.getMaxHeldItemCount(pokemon);
  }

  abstract getMaxHeldItemCount(pokemon?: Pokemon): number;
}

export abstract class LapsingPokemonHeldItemModifier extends PokemonHeldItemModifier {
  protected battlesLeft: number;
  public isTransferable = false;

  constructor(type: ModifierType, pokemonId: number, battlesLeft?: number, stackCount?: number) {
    super(type, pokemonId, stackCount);

    this.battlesLeft = battlesLeft!; // TODO: is this bang correct?
  }

  /**
   * Lapse the {@linkcode battlesLeft} counter (reduce it by 1)
   * @param _args arguments passed (not used here)
   * @returns `true` if {@linkcode battlesLeft} is not null
   */
  public lapse(..._args: unknown[]): boolean {
    return !!--this.battlesLeft;
  }

  /**
   * Retrieve the {@linkcode Modifier | Modifiers} icon as a {@linkcode Phaser.GameObjects.Container | Container}
   * @param forSummary `true` if the icon is for the summary screen
   * @returns the icon as a {@linkcode Phaser.GameObjects.Container | Container}
   */
  public getIcon(forSummary?: boolean): Phaser.GameObjects.Container {
    const container = super.getIcon(forSummary);

    if (this.getPokemon()?.isPlayer()) {
      const battleCountText = addTextObject(27, 0, this.battlesLeft.toString(), TextStyle.PARTY, {
        fontSize: "66px",
        color: Color.PINK,
      });
      battleCountText.setShadow(0, 0);
      battleCountText.setStroke(ShadowColor.RED, 16);
      battleCountText.setOrigin(1, 0);
      container.add(battleCountText);
    }

    return container;
  }

  getBattlesLeft(): number {
    return this.battlesLeft;
  }

  getMaxStackCount(_forThreshold?: boolean): number {
    return 1;
  }
}

/**
 * Modifier used for held items, specifically vitamins like Carbos, Hp Up, etc., that
 * increase the value of a given {@linkcode PermanentStat}.
 * @extends PokemonHeldItemModifier
 * @see {@linkcode apply}
 */
export class BaseStatModifier extends PokemonHeldItemModifier {
  protected stat: PermanentStat;
  public isTransferable = false;

  constructor(type: ModifierType, pokemonId: number, stat: PermanentStat, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.stat = stat;
  }

  matchType(modifier: Modifier): boolean {
    if (modifier instanceof BaseStatModifier) {
      return (modifier as BaseStatModifier).stat === this.stat;
    }
    return false;
  }

  clone(): PersistentModifier {
    return new BaseStatModifier(this.type, this.pokemonId, this.stat, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.stat);
  }

  /**
   * Checks if {@linkcode BaseStatModifier} should be applied to the specified {@linkcode Pokemon}.
   * @param _pokemon the {@linkcode Pokemon} to be modified
   * @param baseStats the base stats of the {@linkcode Pokemon}
   * @returns `true` if the {@linkcode Pokemon} should be modified
   */
  override shouldApply(_pokemon?: Pokemon, baseStats?: number[]): boolean {
    return super.shouldApply(_pokemon, baseStats) && Array.isArray(baseStats);
  }

  /**
   * Applies the {@linkcode BaseStatModifier} to the specified {@linkcode Pokemon}.
   * @param _pokemon the {@linkcode Pokemon} to be modified
   * @param baseStats the base stats of the {@linkcode Pokemon}
   * @returns always `true`
   */
  override apply(_pokemon: Pokemon, baseStats: number[]): boolean {
    baseStats[this.stat] = Math.floor(baseStats[this.stat] * (1 + this.getStackCount() * 0.1));
    return true;
  }

  getScoreMultiplier(): number {
    return 1.1;
  }

  getMaxHeldItemCount(pokemon: Pokemon): number {
    return pokemon.ivs[this.stat];
  }
}

export class EvoTrackerModifier extends PokemonHeldItemModifier {
  protected species: SpeciesId;
  protected required: number;
  public isTransferable = false;

  constructor(type: ModifierType, pokemonId: number, species: SpeciesId, required: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.species = species;
    this.required = required;
  }

  matchType(modifier: Modifier): boolean {
    return (
      modifier instanceof EvoTrackerModifier && modifier.species === this.species && modifier.required === this.required
    );
  }

  clone(): PersistentModifier {
    return new EvoTrackerModifier(this.type, this.pokemonId, this.species, this.required, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat([this.species, this.required]);
  }

  /**
   * Applies the {@linkcode EvoTrackerModifier}
   * @returns always `true`
   */
  override apply(): boolean {
    return true;
  }

  getIconStackText(_virtual?: boolean): Phaser.GameObjects.BitmapText | null {
    const pokemon = this.getPokemon();

    const count = (pokemon?.getPersistentTreasureCount() || 0) + this.getStackCount();

    const text = globalScene.add.bitmapText(10, 15, "item-count", count.toString(), 11);
    text.letterSpacing = -0.5;
    if (count >= this.required) {
      text.setTint(0xf89890);
    }
    text.setOrigin(0, 0);

    return text;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 999;
  }

  override getSpecies(): SpeciesId {
    return this.species;
  }
}

/**
 * Currently used by Shuckle Juice item
 */
export class PokemonBaseStatTotalModifier extends PokemonHeldItemModifier {
  public declare type: PokemonBaseStatTotalModifierType;
  public isTransferable = false;
  public statModifier: 10 | -15;

  constructor(type: PokemonBaseStatTotalModifierType, pokemonId: number, statModifier: 10 | -15, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.statModifier = statModifier;
  }

  override matchType(modifier: Modifier): boolean {
    return modifier instanceof PokemonBaseStatTotalModifier && this.statModifier === modifier.statModifier;
  }

  override clone(): PersistentModifier {
    return new PokemonBaseStatTotalModifier(this.type, this.pokemonId, this.statModifier, this.stackCount);
  }

  override getArgs(): any[] {
    return super.getArgs().concat(this.statModifier);
  }

  /**
   * Checks if {@linkcode PokemonBaseStatTotalModifier} should be applied to the specified {@linkcode Pokemon}.
   * @param pokemon the {@linkcode Pokemon} to be modified
   * @param baseStats the base stats of the {@linkcode Pokemon}
   * @returns `true` if the {@linkcode Pokemon} should be modified
   */
  override shouldApply(pokemon?: Pokemon, baseStats?: number[]): boolean {
    return super.shouldApply(pokemon, baseStats) && Array.isArray(baseStats);
  }

  /**
   * Applies the {@linkcode PokemonBaseStatTotalModifier}
   * @param _pokemon the {@linkcode Pokemon} to be modified
   * @param baseStats the base stats of the {@linkcode Pokemon}
   * @returns always `true`
   */
  override apply(_pokemon: Pokemon, baseStats: number[]): boolean {
    // Modifies the passed in baseStats[] array
    baseStats.forEach((v, i) => {
      // HP is affected by half as much as other stats
      const newVal = i === 0 ? Math.floor(v + this.statModifier / 2) : Math.floor(v + this.statModifier);
      baseStats[i] = Math.min(Math.max(newVal, 1), 999999);
    });

    return true;
  }

  override getScoreMultiplier(): number {
    return 1.2;
  }

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 2;
  }
}

/**
 * Currently used by Old Gateau item
 */
export class PokemonBaseStatFlatModifier extends PokemonHeldItemModifier {
  public isTransferable = false;

  override matchType(modifier: Modifier): boolean {
    return modifier instanceof PokemonBaseStatFlatModifier;
  }

  override clone(): PersistentModifier {
    return new PokemonBaseStatFlatModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Checks if the {@linkcode PokemonBaseStatFlatModifier} should be applied to the {@linkcode Pokemon}.
   * @param pokemon The {@linkcode Pokemon} that holds the item
   * @param baseStats The base stats of the {@linkcode Pokemon}
   * @returns `true` if the {@linkcode PokemonBaseStatFlatModifier} should be applied
   */
  override shouldApply(pokemon?: Pokemon, baseStats?: number[]): boolean {
    return super.shouldApply(pokemon, baseStats) && Array.isArray(baseStats);
  }

  /**
   * Applies the {@linkcode PokemonBaseStatFlatModifier}
   * @param _pokemon The {@linkcode Pokemon} that holds the item
   * @param baseStats The base stats of the {@linkcode Pokemon}
   * @returns always `true`
   */
  override apply(pokemon: Pokemon, baseStats: number[]): boolean {
    // Modifies the passed in baseStats[] array by a flat value, only if the stat is specified in this.stats
    const stats = this.getStats(pokemon);
    const statModifier = 20;
    baseStats.forEach((v, i) => {
      if (stats.includes(i)) {
        const newVal = Math.floor(v + statModifier);
        baseStats[i] = Math.min(Math.max(newVal, 1), 999999);
      }
    });

    return true;
  }

  /**
   * Get the lowest of HP/Spd, lowest of Atk/SpAtk, and lowest of Def/SpDef
   * @returns Array of 3 {@linkcode Stat}s to boost
   */
  getStats(pokemon: Pokemon): Stat[] {
    const stats: Stat[] = [];
    const baseStats = pokemon.getSpeciesForm().baseStats.slice(0);
    // HP or Speed
    stats.push(baseStats[Stat.HP] < baseStats[Stat.SPD] ? Stat.HP : Stat.SPD);
    // Attack or SpAtk
    stats.push(baseStats[Stat.ATK] < baseStats[Stat.SPATK] ? Stat.ATK : Stat.SPATK);
    // Def or SpDef
    stats.push(baseStats[Stat.DEF] < baseStats[Stat.SPDEF] ? Stat.DEF : Stat.SPDEF);
    return stats;
  }

  override getScoreMultiplier(): number {
    return 1.1;
  }

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * Currently used by Macho Brace item
 */
export class PokemonIncrementingStatModifier extends PokemonHeldItemModifier {
  public isTransferable = false;

  matchType(modifier: Modifier): boolean {
    return modifier instanceof PokemonIncrementingStatModifier;
  }

  clone(): PokemonIncrementingStatModifier {
    return new PokemonIncrementingStatModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Checks if the {@linkcode PokemonIncrementingStatModifier} should be applied to the {@linkcode Pokemon}.
   * @param pokemon The {@linkcode Pokemon} that holds the item
   * @param stat The affected {@linkcode Stat}
   * @param statHolder The {@linkcode NumberHolder} that holds the stat
   * @returns `true` if the {@linkcode PokemonBaseStatFlatModifier} should be applied
   */
  override shouldApply(pokemon?: Pokemon, stat?: Stat, statHolder?: NumberHolder): boolean {
    return super.shouldApply(pokemon, stat, statHolder) && !!statHolder;
  }

  /**
   * Applies the {@linkcode PokemonIncrementingStatModifier}
   * @param _pokemon The {@linkcode Pokemon} that holds the item
   * @param stat The affected {@linkcode Stat}
   * @param statHolder The {@linkcode NumberHolder} that holds the stat
   * @returns always `true`
   */
  override apply(_pokemon: Pokemon, stat: Stat, statHolder: NumberHolder): boolean {
    // Modifies the passed in stat number holder by +2 per stack for HP, +1 per stack for other stats
    // If the Macho Brace is at max stacks (50), adds additional 10% to total HP and 5% to other stats
    const isHp = stat === Stat.HP;

    if (isHp) {
      statHolder.value += 2 * this.stackCount;
      if (this.stackCount === this.getMaxHeldItemCount()) {
        statHolder.value = Math.floor(statHolder.value * 1.1);
      }
    } else {
      statHolder.value += this.stackCount;
      if (this.stackCount === this.getMaxHeldItemCount()) {
        statHolder.value = Math.floor(statHolder.value * 1.05);
      }
    }

    return true;
  }

  getScoreMultiplier(): number {
    return 1.2;
  }

  getMaxHeldItemCount(_pokemon?: Pokemon): number {
    return 50;
  }
}

/**
 * Modifier used for held items that Applies {@linkcode Stat} boost(s)
 * using a multiplier.
 * @extends PokemonHeldItemModifier
 * @see {@linkcode apply}
 */
export class StatBoosterModifier extends PokemonHeldItemModifier {
  protected stats: Stat[];
  protected boostMultiplier: number;

  constructor(type: ModifierType, pokemonId: number, stats: Stat[], boostPercent: number, stackCount?: number) {
    super(type, pokemonId, stackCount);

    this.stats = stats;
    this.boostMultiplier = boostPercent * 0.01;
  }

  clone() {
    return new StatBoosterModifier(
      this.type,
      this.pokemonId,
      this.stats,
      this.boostMultiplier * 100,
      this.stackCount,
    );
  }

  getArgs(): any[] {
    return [...super.getArgs(), this.stats, this.boostMultiplier * 100];
  }

  matchType(modifier: Modifier): boolean {
    return (
      modifier instanceof StatBoosterModifier
      && modifier.boostMultiplier === this.boostMultiplier
      && modifier.stats.length === this.stats.length
      && modifier.stats.every((s, i) => s === this.stats[i])
    );
  }

  override shouldApply(pokemon: Pokemon, stat: Stat, statValue: NumberHolder): boolean {
    return super.shouldApply(pokemon, stat, statValue) && this.stats.includes(stat);
  }

  override apply(_pokemon: Pokemon, _stat: Stat, statValue: NumberHolder): boolean {
    statValue.value = Math.floor(
      statValue.value * (1 + this.getStackCount() * this.boostMultiplier),
    );

    return true;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 5;
  }

  getMaxStackCount(_forThreshold?: boolean): number {
    return 5;
  }
}

/**
 * Modifier used for held items, specifically Eviolite, that apply
 * {@linkcode Stat} boost(s) using a multiplier if the holder can evolve.
 * @extends StatBoosterModifier
 * @see {@linkcode apply}
 */
export class EvolutionStatBoosterModifier extends StatBoosterModifier {
  matchType(modifier: Modifier): boolean {
    return modifier instanceof EvolutionStatBoosterModifier;
  }

  /**
   * Checks if the stat boosts can apply and if the holder is not currently
   * Gigantamax'd.
   * @param pokemon {@linkcode Pokemon} that holds the held item
   * @param stat {@linkcode Stat} The {@linkcode Stat} to be boosted
   * @param statValue {@linkcode NumberHolder} that holds the resulting value of the stat
   * @returns `true` if the stat boosts can be applied, false otherwise
   */
  override shouldApply(pokemon: Pokemon, stat: Stat, statValue: NumberHolder): boolean {
    return super.shouldApply(pokemon, stat, statValue) && !pokemon.isMax();
  }

  /**
   * Boosts the incoming stat value by a {@linkcode EvolutionStatBoosterModifier.multiplier} if the holder
   * can evolve. Note that, if the holder is a fusion, they will receive
   * only half of the boost if either of the fused members are fully
   * evolved. However, if they are both unevolved, the full boost
   * will apply.
   * @param pokemon {@linkcode Pokemon} that holds the item
   * @param _stat {@linkcode Stat} The {@linkcode Stat} to be boosted
   * @param statValue{@linkcode NumberHolder} that holds the resulting value of the stat
   * @returns `true` if the stat boost applies successfully, false otherwise
   * @see shouldApply
   */
  override apply(pokemon: Pokemon, stat: Stat, statValue: NumberHolder): boolean {
    const isUnevolved = pokemon.getSpeciesForm(true).speciesId in pokemonEvolutions;

    if (pokemon.isFusion() && pokemon.getFusionSpeciesForm(true).speciesId in pokemonEvolutions !== isUnevolved) {
      // Half boost applied if pokemon is fused and either part of fusion is fully evolved
      statValue.value *= 1 + (this.multiplier - 1) / 2;
      return true;
    }
    if (isUnevolved) {
      // Full boost applied if holder is unfused and unevolved or, if fused, both parts of fusion are unevolved
      return super.apply(pokemon, stat, statValue);
    }

    return false;
  }
}

export class EvolutionIncenseModifier extends StatBoosterModifier {
  clone() {
    return super.clone() as EvolutionIncenseModifier;
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof EvolutionIncenseModifier;
  }

  override shouldApply(pokemon: Pokemon, stat: Stat, statValue: NumberHolder): boolean {
    // Only apply to specific stats and if not Dynamaxed
    return (
      (stat === Stat.ATK || stat === Stat.SPA || stat === Stat.SPE) &&
      super.shouldApply(pokemon, stat, statValue) &&
      !pokemon.isMax()
    );
  }

  override apply(pokemon: Pokemon, stat: Stat, statValue: NumberHolder): boolean {
    const isUnevolved = pokemon.getSpeciesForm(true).speciesId in pokemonEvolutions;

    if (pokemon.isFusion()) {
      const fusion = pokemon.getFusionSpeciesForm(true);
      const isFusionUnevolved = fusion.speciesId in pokemonEvolutions;

      // Half boost if only one of the fusion members is unevolved
      if (isFusionUnevolved !== isUnevolved) {
        statValue.value *= 1 + (this.multiplier - 1) / 2;
        return true;
      }
    }

    if (isUnevolved) {
      // Full boost
      return super.apply(pokemon, stat, statValue);
    }

    return false;
  }
}

export type PostSummonBoost =
  | { stats: Stat[]; stages: number }
  | { mode: "HIGHEST"; stages: number };

/**
 * Modifier used for held items that Applies {@linkcode Stat} boost(s) using a
 * multiplier if the holder is of a specific {@linkcode SpeciesId}.
 * @extends StatBoosterModifier
 * @see {@linkcode apply}
 */
export class SpeciesStatBoosterModifier extends StatBoosterModifier {
  private species: SpeciesId[];

  private windMoveMult?: number;
  private postSummon?: PostSummonBoost;
  private effectChanceMult?: number;

  private poisonedTargetMoveMult?: number; // e.g. 1.3
  private guaranteedPoisonOnHit?: boolean;
  private guaranteedPoisonType?: StatusEffect;

  private key?: SpeciesStatBoosterItem;

  // ✅ 추가: 회피(=상대 명중률 감소) 퍼센트. 예: 10, 20, 30 ...
  private evasiveAccDebuffPercent?: number;

  private poisonDotMult?: number;
  private poisonedTargetGuaranteedCrit?: boolean;
  private poisonedTargetCritDamageMult?: number; // e.g. 2
  private confusionSelfDamageMult?: number; // e.g. 2
  private allMovePowerMult?: number; // e.g. 2
  private stabBoostAdd?: number; // e.g. 0.5
  private ignoreTypeImmunity?: boolean; // ✅ 관통(면역 무시) on/off
  private sleepingTargetMoveMult?: number; // e.g. 1.3

  constructor(
  type: ModifierType,
  pokemonId: number,
  stats: Stat[],
  multiplier: number,
  species: SpeciesId[],
  postSummon?: PostSummonBoost,
  windMoveMult?: number,
  effectChanceMult?: number,
  poisonedTargetMoveMult?: number,
  guaranteedPoisonOnHit?: boolean,
  guaranteedPoisonType?: StatusEffect,
  key?: SpeciesStatBoosterItem,
  evasiveAccDebuffPercent?: number,

  allMovePowerMult?: number,              // ✅ 추가 (여기!)

  poisonedTargetCritDamageMult?: number,
  stackCount?: number,
  poisonedTargetGuaranteedCrit?: boolean,
  confusionSelfDamageMult?: number,
  ignoreTypeImmunity?: boolean, // ✅ 추가
  sleepingTargetMoveMult?: number,
) {
  super(type, pokemonId, stats, multiplier, stackCount);
  this.key = key;

  this.species = species;
  this.postSummon = postSummon;
  this.windMoveMult = windMoveMult;
  this.effectChanceMult = effectChanceMult;
  this.poisonedTargetMoveMult = poisonedTargetMoveMult;

  this.guaranteedPoisonOnHit = guaranteedPoisonOnHit;
  this.guaranteedPoisonType = guaranteedPoisonType;

  this.evasiveAccDebuffPercent = evasiveAccDebuffPercent;

  this.allMovePowerMult = allMovePowerMult; // ✅ 추가

  this.poisonedTargetCritDamageMult = poisonedTargetCritDamageMult;
  this.poisonedTargetGuaranteedCrit = poisonedTargetGuaranteedCrit;

  this.confusionSelfDamageMult = confusionSelfDamageMult; // ✅ (원래 누락돼있어서 같이 넣는게 안전)
  this.ignoreTypeImmunity = ignoreTypeImmunity; // ✅ 추가 (생성자 마지막쯤)
  this.sleepingTargetMoveMult = sleepingTargetMoveMult;
}

  clone() {
  return new SpeciesStatBoosterModifier(
    this.type,
    this.pokemonId,
    this.stats,
    this.multiplier,
    this.species,
    this.postSummon,
    this.windMoveMult,
    this.effectChanceMult,
    this.poisonedTargetMoveMult,
    this.guaranteedPoisonOnHit,
    this.guaranteedPoisonType,
    this.key,
    this.evasiveAccDebuffPercent,

    this.allMovePowerMult,              // ✅ 추가

    this.poisonedTargetCritDamageMult,
    this.stackCount,
    this.poisonedTargetGuaranteedCrit,
    this.confusionSelfDamageMult,
    this.ignoreTypeImmunity, // ✅
    this.sleepingTargetMoveMult,
  );
}

override getArgs(): any[] {
  return [
    ...super.getArgs(),
    this.species,
    this.postSummon,
    this.windMoveMult,
    this.effectChanceMult,
    this.poisonedTargetMoveMult,
    this.guaranteedPoisonOnHit,
    this.guaranteedPoisonType,
    this.key,
    this.evasiveAccDebuffPercent,

    this.allMovePowerMult,              // ✅ 추가

    this.poisonedTargetCritDamageMult,
    this.poisonedTargetGuaranteedCrit,
    this.confusionSelfDamageMult,
    this.ignoreTypeImmunity, // ✅
    this.sleepingTargetMoveMult,
  ];
}

  // ✅ 타겟이 잠듦인지
private isTargetSleeping(target: Pokemon | null | undefined): boolean {
  if (!target) { return false; }
  const eff = (target as any).status?.effect ?? (target as any).statusEffect;
  return eff === StatusEffect.SLEEP;
}

  public readonly __SBOO = true;

  public getKey(): SpeciesStatBoosterItem | undefined {
  if (this.key) { return this.key; }

  const typeObj: any = (this as any).type;
  let k =
    typeObj?.key ??
    typeObj?.getPregenArgs?.()?.[0] ??
    typeObj?.id;

  if (typeof k !== "string") { return ; }

  // ✅ id가 "modifierType:SpeciesBoosterItem.X" 형태면 X만 추출
  const marker = "modifierType:SpeciesBoosterItem.";
  if (k.startsWith(marker)) { k = k.slice(marker.length); }

  // 혹시 ".MYTHICAL_PECHA_BERRY"처럼 점으로 끝에 붙는 경우도 커버
  if (k.includes(".")) { k = k.split(".").pop()!; }

  return k as SpeciesStatBoosterItem;
}

  public getStabBoostAdd(): number | undefined {
  const v = this.stabBoostAdd;
  if (typeof v === "number") { return v; }

  const typeObj: any = (this as any).type;
  const typeKey =
    this.getKey?.()
    ?? (this as any).key
    ?? typeObj?.key
    ?? typeObj?.getPregenArgs?.()?.[0]
    ?? typeObj?.id;

  // 감청빛크리스탈: STAB +0.5 (StabBoostAbAttr와 동일)
  if (typeKey === "CRYSTAL_CLUSTER") { return 0.5; }

  return ;
}

  public getIgnoreTypeImmunity(): boolean | undefined {
  // 1) 생성자로 들어온 값 우선
  if (typeof this.ignoreTypeImmunity === "boolean") { return this.ignoreTypeImmunity; }

  // 2) 구세이브/키 기반 복구
  const key = this.getKey?.();
  if (key === "CRYSTAL_CLUSTER") { return true; }

  return ;
}

  public getPoisonedTargetGuaranteedCrit(): boolean | undefined {
  const v = this.poisonedTargetGuaranteedCrit;
  if (typeof v === "boolean") { return v; }

  // ✅ 구세이브 호환: key/typeKey로 복구
  const typeObj: any = (this as any).type;
  const typeKey =
    this.getKey?.()
    ?? (this as any).key
    ?? typeObj?.key
    ?? typeObj?.id;

  // 환상복슝(=MYTHICAL_PECHA_BERRY)일 때만 true
  if (typeKey === "MYTHICAL_PECHA_BERRY") { return true; }

  return ;
}

  // ✅ 배율 getter (구세이브 호환용 키 복구까지 포함)
public getSleepingTargetMoveMult(): number | undefined {
  const v = this.sleepingTargetMoveMult;
  if (typeof v === "number") { return v; }

  const typeObj: any = (this as any).type;
  const typeKey =
    this.getKey?.()
    ?? (this as any).key
    ?? typeObj?.key
    ?? typeObj?.getPregenArgs?.()?.[0]
    ?? typeObj?.id;

  // ✅ 나이트메어 전용(다크라이): 수면 상대에게 x1.3
  if (typeKey === "NIGHTMARE_SYMBOLE") { return 1.3; }

  return ;
}

// ✅ 파워(위력/데미지 전 단계) 배율 적용 훅
public applySleepingTargetMovePowerBoost(
  user: Pokemon,
  target: Pokemon | null | undefined,
  power: NumberHolder,
  simulated: boolean,
): boolean {
  if (!user || !target) { return false; }

  // 전용템 컨셉: 종족 조건 유지(다크라이만)
  if (!this.hasMatchingSpecies(user)) { return false; }

  // 타겟이 잠들어 있지 않으면 스킵
  if (!this.isTargetSleeping(target)) { return false; }

  const mult = this.getSleepingTargetMoveMult();
  if (typeof mult !== "number") { return false; }

  power.value *= mult;

  if (!simulated) {
    console.log("[SPECIES_BOOSTER][SLEEP_TARGET_MOVE] applied", {
      user: user.name,
      target: target.name,
      key: this.getKey?.() ?? (this.type as any)?.id ?? this.type,
      mult,
      powerAfter: power.value,
    });
  }

  return true;
}
  
  public getConfusionSelfDamageMult(): number | undefined {
  const v = this.confusionSelfDamageMult;
  if (typeof v === "number") { return v; }

  // ✅ 구세이브 호환: key/typeKey로 복구
  const typeObj: any = (this as any).type;
  const typeKey =
    this.getKey?.()
    ?? (this as any).key
    ?? typeObj?.key
    ?? typeObj?.getPregenArgs?.()?.[0]
    ?? typeObj?.id;

  // 예: 환상복슝만 혼란 자해 2배라면
  if (typeKey === "MYTHICAL_PECHA_BERRY") { return 2; }

  return ;
}


  public getAllMovePowerMult(): number | undefined {
  const v = this.allMovePowerMult;
  if (typeof v === "number") { return v; }

  // ✅ 구세이브 호환: 키로 복구
  const typeObj: any = (this as any).type;
  const typeKey =
    this.getKey?.()
    ?? (this as any).key
    ?? typeObj?.key
    ?? typeObj?.getPregenArgs?.()?.[0]
    ?? typeObj?.id;

  // CRYSTAL_CLUSTER면 x2로 복구
  if (typeKey === "CRYSTAL_CLUSTER") { return 2; }

  return ;
}

  // ✅ 외부(명중 계산부)에서 읽을 getter
  public getEvasiveAccDebuffPercent(): number | undefined {
    const v = this.evasiveAccDebuffPercent;
    if (typeof v === "number") { return v; }

    // ✅ 구세이브 호환: key/typeKey로 기본값 복구(원하면 여기서 특정 아이템 키 대응)
    const typeObj: any = (this as any).type;
    const typeKey =
      this.getKey?.()
      ?? (this as any).key
      ?? typeObj?.key
      ?? typeObj?.getPregenArgs?.()?.[0]
      ?? typeObj?.id;

    // 예: 반짝가루가 SpeciesStatBoosterItem 안에 들어가 있다면 키로 복구 가능
    const isBrightPowder = typeKey === "BRIGHT_POWDER" || typeKey === 999; // 네 키에 맞게 수정
    if (isBrightPowder) { return 10; // 기본 10%
}

    return ;
  }

  public getPoisonedTargetCritDamageMult(): number | undefined {
  const v = this.poisonedTargetCritDamageMult;
  if (typeof v === "number") { return v; }

  // ✅ 구세이브 호환: key/typeKey로 복구
  const typeObj: any = (this as any).type;
  const typeKey =
    this.getKey?.()
    ?? (this as any).key
    ?? typeObj?.key
    ?? typeObj?.getPregenArgs?.()?.[0]
    ?? typeObj?.id;

  // 예: 환상복슝(MYTHICAL_PECHA_BERRY)만 2배로 쓰고 싶다면
  if (typeKey === "MYTHICAL_PECHA_BERRY") { return 2; }

  return ;
}

  public applyPoisonedTargetCritDamageBoost(
  user: Pokemon,
  target: Pokemon | null | undefined,
  critMult: NumberHolder,
  simulated: boolean,
): boolean {
  if (simulated) { return false; }
  if (!user || !target) { return false; }

  // 급소가 아닐 때는 스킵 (CritDamageBoostModifier / MultCritAbAttr와 동일한 관점)
  if (critMult.value <= 1) { return false; }

  // 종족 조건 (전용템/전용부스터 컨셉 유지)
  if (!this.hasMatchingSpecies(user)) { return false; }

  // 타겟 독/맹독 조건
  if (!this.isTargetPoisoned(target)) { return false; }

  const mult = this.getPoisonedTargetCritDamageMult();
  if (typeof mult !== "number") { return false; }

  critMult.value *= mult;

  console.log("[SPECIES_BOOSTER][POISONED_TARGET_CRIT_DMG] applied", {
    user: user.name,
    target: target.name,
    itemType: (this.type as any)?.id ?? this.type,
    mult,
    critMultAfter: critMult.value,
  });

  return true;
}

  public getPoisonedTargetMoveMult(): number | undefined {
  const v = this.poisonedTargetMoveMult;
  if (typeof v === "number") { return v; }

  // ✅ 구세이브 호환: key/typeKey로 기본값 복구
  const typeObj: any = (this as any).type;
  const typeKey =
    this.getKey?.()
    ?? (this as any).key
    ?? typeObj?.key
    ?? typeObj?.getPregenArgs?.()?.[0]
    ?? typeObj?.id;

  const isMalignantChains = typeKey === "MALIGNANT_CHAINS" || typeKey === 1;
  if (isMalignantChains) { return 1.3; }

  return ;
}

  // ✅ 타겟이 독/맹독인지 체크 헬퍼 (엔진 상태명에 맞춰 수정)
  public isTargetPoisoned(target: Pokemon | null | undefined): boolean {
  if (!target) { return false; }
  const eff = (target as any).status?.effect ?? (target as any).statusEffect;
  return eff === StatusEffect.POISON || eff === StatusEffect.TOXIC;
}

  // ✅ 외부(데미지 계산)에서 사용하기 위한 getter 2개 추천
  public getWindMoveMult(): number | undefined {
    return this.windMoveMult;
  }

  public hasMatchingSpecies(p: Pokemon): boolean {
    const sid = p.getSpeciesForm(true).speciesId;
    const fsid = p.isFusion() ? p.getFusionSpeciesForm(true).speciesId : null;
    return this.species.includes(sid) || (!!fsid && this.species.includes(fsid));
  }

  public getPoisonDotMult(): number | undefined {
  const typeObj: any = (this as any).type;
  const typeKey =
    this.getKey?.()
    ?? (this as any).key
    ?? typeObj?.key
    ?? typeObj?.id;

  if (typeKey === "MYTHICAL_PECHA_BERRY") { return 2; }

  return this.poisonDotMult;
}

  // SpeciesStatBoosterModifier 내부에 추가 (아무 위치나 OK)
public applyIgnoreTypeImmunity(
  user: Pokemon,
  moveType: PokemonType,
  defenderType: PokemonType,
  typeMultiplier: NumberHolder,
  simulated: boolean,
): boolean {
  // 0배가 아니면 관통할 게 없음
  if (!typeMultiplier || typeMultiplier.value !== 0) { return false; }

  // 전용템/전용부스터 컨셉: 종족 조건
  if (!this.hasMatchingSpecies(user)) { return false; }

  // 아이템 자체가 관통 옵션을 켜고 있는지
  const pass = this.getIgnoreTypeImmunity?.();
  if (pass !== true) { return false; }

  // ✅ 관통: 0배 → 1배
  typeMultiplier.value = 1;

  if (!simulated) {
    console.log("[SBOO][IGNORE_IMMUNITY] applied", {
      user: user.name,
      key: this.getKey?.() ?? (this.type as any)?.id ?? this.type,
      moveType,
      defenderType,
      multiplierAfter: typeMultiplier.value,
    });
  }

  return true;
}

  /**
   * ✅ 명중 후 호출: 확정 독/맹독 부여
   * - "100% 확정"이라도, 엔진의 면역/세이프가드/이미 상태이상 등은 최소한 존중하는 게 안전함
   * - 정말로 '면역 무시'까지 원하면 아래에 대체 루트를 추가해둠(코멘트 참고)
   */
  public applyGuaranteedPoisonOnHit(user: Pokemon, target: Pokemon, simulated: boolean): void {
  const typeObj: any = (this as any).type;

  // ✅ 인스턴스 key가 비어도 "타입"에서 복구
  const typeKey =
    (this as any).getKey?.()
    ?? (this as any).key
    ?? typeObj?.key
    ?? typeObj?.getPregenArgs?.()?.[0]
    ?? typeObj?.id;

  if (simulated) { return; }
  if (!target) { return; }

  if (!this.hasMatchingSpecies(user)) {
    return;
  }

  // ✅ MALIGNANT_CHAINS 키 판정(문자/숫자 모두 허용)
const isMalignantChains =
  typeKey === "MALIGNANT_CHAINS" || typeKey === 1;

// ✅ 구버전 세이브/복원에서 guaranteedPoisonOnHit가 undefined일 수 있으니
const enabled =
  (this as any).guaranteedPoisonOnHit === true || isMalignantChains;

if (!enabled) {
  return;
}

const desired =
  (this as any).guaranteedPoisonType
  ?? (isMalignantChains ? StatusEffect.TOXIC : StatusEffect.TOXIC);

  const ok1 = target.trySetStatus?.(desired, user) ?? false;

  if (!ok1 && desired !== StatusEffect.POISON) {
    const ok2 = target.trySetStatus?.(StatusEffect.POISON, user) ?? false;
  }
}

  public getEffectChanceMult(): number | undefined {
  return this.effectChanceMult;
}

  matchType(modifier: Modifier): boolean {
  const m: any = modifier as any;

  if (m?.__SBOO === true) {
    const sp: SpeciesId[] | undefined = m.species; // private라도 any로 접근 가능
    if (Array.isArray(sp) && sp.length === this.species.length) {
      return super.matchType(modifier) && sp.every((e, i) => e === this.species[i]);
    }
  }
  return false;
}

  override shouldApply(pokemon: Pokemon, stat: Stat, statValue: NumberHolder): boolean {
    return (
      super.shouldApply(pokemon, stat, statValue) &&
      (this.species.includes(pokemon.getSpeciesForm(true).speciesId) ||
        (pokemon.isFusion() && this.species.includes(pokemon.getFusionSpeciesForm(true).speciesId)))
    );
  }

  // ✅ 추가: 이번 소환에서 이미 발동했는지
  private hasActivatedThisSummon(pokemon: Pokemon): boolean {
    const sd: any = (pokemon as any).summonData;
    const typeKey = (this.type as any)?.id ?? this.type; // 안전
    return !!sd?.speciesBoosterPostSummonUsed?.[typeKey];
  }

  private setActivatedThisSummon(pokemon: Pokemon): void {
    const sd: any = (pokemon as any).summonData ??= {};
    sd.speciesBoosterPostSummonUsed ??= {};
    const typeKey = (this.type as any)?.id ?? this.type;
    sd.speciesBoosterPostSummonUsed[typeKey] = true;
  }

  private getHighestStatForSummon(pokemon: Pokemon): Stat | null {
  // BeastBoost랑 똑같이 "현재 유효 스탯" 기준으로 최고치 뽑으면 됨
  // 너가 이미 getHighestBeastBoostStat(pokemon) 만들어뒀으니 그걸 재사용하는 게 최단.
  return getHighestBeastBoostStat(pokemon); // 이름이 마음에 안 들면 공용 함수로 rename 추천
}

onPostSummon(pokemon: Pokemon, simulated: boolean): void {
  if (simulated) { return; }
  if (!pokemon) { return; }

  const ps = this.postSummon;
  if (!ps || typeof (ps as any).stages !== "number") { return; }

  // 종족 조건
  const okSpecies =
    this.species.includes(pokemon.getSpeciesForm(true).speciesId) ||
    (pokemon.isFusion() && this.species.includes(pokemon.getFusionSpeciesForm(true).speciesId));
  if (!okSpecies) { return; }

  // 이번 소환 1회
  if (this.hasActivatedThisSummon(pokemon)) { return; }
  this.setActivatedThisSummon(pokemon);

  // ✅ stats 결정
  let statsToBoost: Stat[] = [];
  if ("mode" in ps && ps.mode === "HIGHEST") {
    const s = this.getHighestStatForSummon(pokemon);
    if (s == null) { return; }
    statsToBoost = [s];
  } else {
    if (ps.stats?.length === 0) { return; }
    statsToBoost = ps.stats;
  }

  globalScene.phaseManager.unshiftNew(
    "StatStageChangePhase",
    pokemon.getBattlerIndex(),
    true,
    statsToBoost,
    ps.stages,
  );

  console.log("[SPECIES_BOOSTER][POST_SUMMON] applied", {
    pokemon: pokemon.name,
    itemType: (this.type as any)?.id ?? this.type,
    stats: statsToBoost,
    stages: ps.stages,
  });
}

  contains(speciesId: SpeciesId, stat: Stat): boolean {
    return this.species.includes(speciesId) && this.stats.includes(stat);
  }
}

export class SuperEffectiveBoosterModifier extends PokemonHeldItemModifier {
  private readonly baseBoostPercent: number = 6; // 1중첩당 위력 증가량 (20%)
  private static readonly maxStack: number = 5; // 최대 중첩 개수 (5개)

  constructor(type: ModifierType, pokemonId: number, stackCount = 1) {
    super(type, pokemonId, stackCount);
  }

  clone() {
    return new SuperEffectiveBoosterModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat([this.stackCount]);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof SuperEffectiveBoosterModifier;
  }

  /**
   * 동일 아이템이 다시 적용되었을 때 중첩 개수 증가
   */
  onApply(pokemon: Pokemon): void {
    this.stackCount = Math.min(this.stackCount + 1, SuperEffectiveBoosterModifier.maxStack);
  }

  /**
   * 기술 피해에 보너스 적용 (아이템 효과)
   */
  applyMovePowerBoost(
    move: Move,
    attacker: Pokemon,
    defender: Pokemon,
    power: number,
    battleContext: BattleContext,
  ): number {
    const currentStack = this.getStackCount(); // 현재 중첩 개수 (최대 5)

    // 위력 증가 계산 (0.2배씩 증가)
    const boostMultiplier = 1 + (this.baseBoostPercent / 100) * currentStack;
    const newPower = Math.floor(power * boostMultiplier);

    return newPower;
  }

  /**
   * 포켓몬이 장착할 수 있는 아이템 최대 개수 (5로 제한, 표시값도 5)
   */
  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return SuperEffectiveBoosterModifier.maxStack;
  }

  /**
   * 타입 배율 > 1일 때만 효과 적용
   */
  override shouldApply(pokemon?: Pokemon, move?: Move, typeMultiplier?: number): boolean {
    return super.shouldApply(pokemon) && typeMultiplier > 1;
  }
}

export class StackingRiskyPowerBoosterModifier extends PokemonHeldItemModifier {
  private readonly baseBoostPercent = 30;
  private static readonly maxStack = 3;

  private lastAppliedTurn = -1;
  private lastAppliedMoveId: number | null = null;

  constructor(type: ModifierType, pokemonId: number, stackCount = 1) {
    super(type, pokemonId, stackCount);
  }

  clone() {
    return new StackingRiskyPowerBoosterModifier(this.type, this.pokemonId, this.stackCount);
  }

  // SuperEffectiveBoosterModifier 스타일로 변경
  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof StackingRiskyPowerBoosterModifier;
  }

  // 중첩 적용 함수 (아이템이 다시 적용될 때 호출)
  onApply(pokemon: Pokemon): void {
    this.stackCount = Math.min(this.stackCount + 1, StackingRiskyPowerBoosterModifier.maxStack);
  }

  applyHpLossIfNeeded(attacker: Pokemon, moveId: number, currentTurn: number) {
  const MAGIC_GUARD = AbilityId.MAGIC_GUARD;
  const SHEER_FORCE = AbilityId.SHEER_FORCE;

  const hasSheerForceItem = globalScene
    .getModifiers(SheerForceItemModifier, attacker.isPlayer())
    .some(mod => mod.pokemonId === attacker.id);

  // ✅ 0) 새벽의비드/매직가드류(간접 피해 무효)면 반동 무시
  //    (새벽의비드/스터디밀/매직가드 특성까지 통합)
  if (blocksNonDirectDamage(attacker, false)) {
    console.log(`[RiskyBooster] blocksNonDirectDamage로 반동 피해 무시 - Pokemon ID ${attacker.id}`);
    return;
  }

  // ✅ 1) 기존: 매직가드(특성), 우격다짐(특성), 우격다짐 아이템이면 반동 피해 무시
  //    (위에서 blocksNonDirectDamage가 매직가드도 커버한다면 이 블록은 사실상 중복이지만,
  //     너가 "우격다짐도 반동 무시"를 원하니 유지)
  if (attacker.hasAbility(MAGIC_GUARD, false) || attacker.hasAbility(SHEER_FORCE, false) || hasSheerForceItem) {
    console.log(
      `[RiskyBooster] 매직가드/우격다짐 능력 또는 우격다짐 아이템으로 반동 피해 무시 - Pokemon ID ${attacker.id}`,
    );
    return;
  }

  const percents = [0.1, 0.06, 0.02];
  const hpLoss = toDmgValue(attacker.getMaxHp() * percents[Math.min(this.stackCount - 1, 2)]);
  console.log(`[RiskyBooster] 반동 피해 적용: ${hpLoss} to Pokemon ID ${attacker.id}`);
  attacker.damageAndUpdate(hpLoss, {
  result: HitResult.INDIRECT,
  indirect: true,
  source: attacker,
  recordAttacksReceived: false,
  accumulateBide: false,
});
}

  applyMovePowerBoost(move, attacker, defender, power, battleContext): number {
    const currentStack = this.getStackCount();
    const boostMultiplier = 1 + (this.baseBoostPercent / 100) * currentStack;

    const currentTurn = battleContext?.turn ?? attacker.battle?.turnCount ?? 0;
    const moveId = move?.id;

    if (typeof power !== "number" || isNaN(power)) {
      console.error("[RiskyBooster] Invalid power:", power);
      return power || 0;
    }

    return Math.floor(power * boostMultiplier);
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return StackingRiskyPowerBoosterModifier.maxStack;
  }
}

export class StackingPowerBoosterModifier extends PokemonHeldItemModifier {
  private readonly baseBoostPercent: number = 10; // Each stack increases power by 10%

  constructor(type: ModifierType, pokemonId: number, stackCount = 1) {
    super(type, pokemonId, stackCount);
  }

  clone(): StackingPowerBoosterModifier {
    return new StackingPowerBoosterModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat([this.stackCount]);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof StackingPowerBoosterModifier;
  }

  /**
   * Applies the power boost to the move based on the stack count
   */
  applyMovePowerBoost(
    move: Move,
    attacker: Pokemon,
    defender: Pokemon,
    power: number,
    battleContext: BattleContext,
  ): number {
    const currentStack = this.getStackCount(); // Get current stack count (max 20)

    // Calculate the power boost based on the stack count
    const boostMultiplier = 1 + (this.baseBoostPercent / 100) * currentStack;
    const newPower = Math.floor(power * boostMultiplier);

    // After applying the power boost, increment the stack count (up to max 20)
    this.incrementStackCount(); // Increment stack count method

    return newPower;
  }

  /**
   * Increments the stack count, capping at the maximum allowed.
   */
  incrementStackCount() {
    this.stackCount = Math.min(this.stackCount + 1, this.getMaxHeldItemCount());
  }

  /**
   * Applies the power boost based on the stack count.
   * For other stats, increase by +2 per stack.
   * If max stacks (20), apply additional percentage boost (10%).
   */
  applyStatBoost(stat: Stat, statHolder: NumberHolder): boolean {
    // Only applies to move power
    statHolder.value += 2 * this.stackCount; // Increase move power (by +2 per stack)

    // If max stack reached, apply 10% additional bonus
    if (this.stackCount === this.getMaxHeldItemCount()) {
      statHolder.value = Math.floor(statHolder.value * 1.1); // 10% bonus
    }

    // **시각적으로 중복된 효과 표시** (UI나 다른 로직을 통해 중복된 효과처럼 보이게 처리)
    this.displayStackEffect(stat, statHolder); // 여기에 중복 효과를 표시하는 로직 추가 가능

    return true;
  }

  /**
   * Displays the effect of stack count (for UI or log purposes)
   */
  private displayStackEffect(stat: Stat, statHolder: NumberHolder): void {
    // 템플릿 리터럴을 백틱으로 감싸고 변수를 ${}로 감싸야 합니다.
    console.log(`${stat} stat increased by ${this.stackCount * 2} due to ${this.stackCount} stack(s).`);
    // 여기에 스택 수와 그에 따른 변화가 중복처럼 표시되게 하는 로직을 추가할 수 있습니다.
  }

  /**
   * Returns the maximum count of the item that a Pokémon can hold (1 in this case)
   */
  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 10; // Always 10 max stacks
  }

  /**
   * Returns the current stack count
   */
  getStackCount(): number {
    return this.stackCount;
  }
}

export class RunSuccessModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId);
  }

  clone(): RunSuccessModifier {
    return new RunSuccessModifier(this.type, this.pokemonId);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof RunSuccessModifier;
  }

  /**
   * 연막탄 효과 적용 - 100% 도망 가능
   */
  apply(
  pokemon: Pokemon,
  passive: boolean,
  simulated: boolean,
  escapeChance?: NumberHolder, // optional
  cancelled?: Utils.BooleanHolder
): boolean {
  if (!pokemon.battleData) { return false; }

  if (!pokemon.arena?.hasTag(ArenaTagType.NEUTRALIZING_GAS)) {
    pokemon.battleData.escapeChance = 256;

    if (escapeChance) {
      escapeChance.value = 256;
    }

    console.log("[DEBUG] 연막탄 효과 적용됨 - Neutralizing Gas 없음");
  }

  if (!simulated) {
    globalScene.phaseManager.queueMessage(
      i18next.t("modifier:runSuccessApply", {
        pokemonName: getPokemonNameWithAffix(pokemon),
        itemName: i18next.t("modifierType:ModifierType.SMOKE_BALL.name"),
      }),
    );
  }

  return true;
}

  /**
   * 연막탄은 소모되지 않는 아이템이므로 항상 1개만 소지 가능
   */
  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class EvasiveItemModifier extends PokemonHeldItemModifier {
  private static readonly maxStack: number = 3;
  private readonly accDebuffPercent: number = 10;

  constructor(type: ModifierType, pokemonId: number, stackCount = 1) {
    super(type, pokemonId, stackCount);
  }

  clone(): EvasiveItemModifier {
    return new EvasiveItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat([this.stackCount]);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof EvasiveItemModifier;
  }

  getStackCount(): number {
    return this.stackCount ?? 1;
  }

  /**
   * 명중률 디버프 적용 (자신이 아니라 상대에게 영향)
   */
  override apply(pokemon: Pokemon): boolean {
    if (pokemon.id !== this.pokemonId) { return false; }

    const debuffPercent = this.getStackCount() * this.accDebuffPercent;

    if (typeof pokemon.setAccuracyDebuffToEnemiesFromItem === "function") {
      pokemon.setAccuracyDebuffToEnemiesFromItem(debuffPercent);
    } else {
      // 예비 fallback: 속성으로 강제로 박아 넣기
      (pokemon as any)._accDebuffFromItem = debuffPercent;
    }

    return true;
  }

  override onApply(pokemon: Pokemon): void {
    this.stackCount = Math.min(this.stackCount + 1, EvasiveItemModifier.maxStack);
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return EvasiveItemModifier.maxStack;
  }

  override shouldApply(pokemon: Pokemon, _statHolder?: NumberHolder): boolean {
    return super.shouldApply(pokemon, _statHolder) && this.stackCount < EvasiveItemModifier.maxStack;
  }
}

// Legend Plate (PLA) - Arceus 전용
export class LegendPlateModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount = 1) {
    super(type, pokemonId, stackCount);
  }

  clone(): LegendPlateModifier {
    return new LegendPlateModifier(this.type, this.pokemonId, this.stackCount);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof LegendPlateModifier;
  }

  override apply(pokemon: Pokemon): boolean {
    return pokemon.id === this.pokemonId && pokemon.getSpeciesForm(true).speciesId === SpeciesId.ARCEUS;
  }

  override getArgs(): any[] {
  return super.getArgs().concat([this.stackCount]);
}

  // ✅ MovePhase에서 호출할 엔트리 포인트
  public tryApplyLegendPlate(params: {
  user: Pokemon;
  target: Pokemon;
  move: Move;
  moveTypeHolder: NumberHolder;
  simulated: boolean;
}) {
  const { user, target, move, moveTypeHolder, simulated } = params;

  if (user.id !== this.pokemonId) { return; }
  if (user.getSpeciesForm(true).speciesId !== SpeciesId.ARCEUS) { return; }
  if (user.isTerastallized) { return; }
  if (move.id !== MoveId.JUDGMENT) { return; }

  const td = user.turnData;           // ✅ 엔진이 주는 turnData 사용
  if (!td) { return;                    // (안전)
}

  const targetKey = target.id;        // ✅ 교체되면 바뀌는 값

  // ✅ "이전 값" 로그를 원하면 업데이트 전에 저장
  const prev = {
    move: td.legendPlateMoveId,
    target: td.legendPlateTargetPokemonId,
    type: td.legendPlateChosenType,
  };

  const sameKey =
    td.legendPlateMoveId === move.id &&
    td.legendPlateTargetPokemonId === targetKey &&
    td.legendPlateChosenType != null;

  const bestType = sameKey
    ? td.legendPlateChosenType!
    : this.getLegendPlateBestType(user, target, move, simulated);

  if (!sameKey) {
    td.legendPlateMoveId = move.id;
    td.legendPlateTargetPokemonId = targetKey;
    td.legendPlateChosenType = bestType;
  }

  // ✅ 계산 반영(이게 “심판 타입” 최종값이 됨)
  moveTypeHolder.value = bestType;

  // ✅ 커밋은 실전에서만
  if (!simulated) {
    user.summonData.types = [bestType];
    user.updateInfo();
  }

  console.log("[LP_CACHE_KEY]", {
    move: MoveId[move.id],
    targetId: targetKey,
    prevMove: prev.move != null ? MoveId[prev.move] : undefined,
    prevTargetId: prev.target,
    prevType: prev.type != null ? PokemonType[prev.type] : undefined,
    sameKey,
    chosen: PokemonType[bestType],
  });
}

  // ─────────────────────────────────────────────
  // PLA식 타입 선택 (이전 답변 로직을 그대로 옮기면 됨)
  // ─────────────────────────────────────────────

  private static readonly ATTACK_TYPES: PokemonType[] = [
    PokemonType.NORMAL, PokemonType.FIRE, PokemonType.WATER, PokemonType.ELECTRIC,
    PokemonType.GRASS, PokemonType.ICE, PokemonType.FIGHTING, PokemonType.POISON,
    PokemonType.GROUND, PokemonType.FLYING, PokemonType.PSYCHIC, PokemonType.BUG,
    PokemonType.ROCK, PokemonType.GHOST, PokemonType.DRAGON, PokemonType.DARK,
    PokemonType.STEEL, PokemonType.FAIRY,
  ];

  private resistScore(mult: number): number {
    if (mult === 0) { return 2;  // 면역
}
    if (mult < 1) { return 1;    // 반감
}
    return 0;
  }

  private getLegendPlateBestType(user: Pokemon, target: Pokemon, move: Move, simulated: boolean): PokemonType {
    const defTypes = target.getTypes(true, true, undefined, false);
    const primary = defTypes[0];
    const secondary = defTypes[1];

    type Candidate = {
      atkType: PokemonType;
      mult: number;
      resistPrimary: number;
      resistSecondary: number;
    };

    const candidates: Candidate[] = [];

    for (const atkType of LegendPlateModifier.ATTACK_TYPES) {
      // ✅ 듀얼 포함 실제 상성은 네 엔진 함수로
      const mult = target.getAttackTypeEffectiveness(
        atkType,
        user,
        false,
        true,
        move,
        false,
      ) as unknown as number;

      // ✅ 타이브레이커: 상대 주/부타입이 "그 타입(=아르세우스가 변할 타입)"에게 얼마나 먹히는지
      const primVsNewType = primary != null ? getTypeDamageMultiplier(primary, atkType) : 1;
      const secVsNewType = secondary != null ? getTypeDamageMultiplier(secondary, atkType) : 1;

      candidates.push({
        atkType,
        mult,
        resistPrimary: this.resistScore(primVsNewType),
        resistSecondary: this.resistScore(secVsNewType),
      });
    }

    // 1) 굉장한 타입만
    let pool = candidates.filter(c => c.mult > 1);
    if (pool.length === 0) {
      const best = Math.max(...candidates.map(c => c.mult));
      pool = candidates.filter(c => c.mult === best);
    }

    // 2) 4배 우선
    if (pool.some(c => c.mult === 4)) { pool = pool.filter(c => c.mult === 4); }

    // 3) 주타입 저항 우선(면역>반감>그 외)
    const bestPrim = Math.max(...pool.map(c => c.resistPrimary));
    pool = pool.filter(c => c.resistPrimary === bestPrim);

    // 4) 부타입 저항 우선
    const bestSec = Math.max(...pool.map(c => c.resistSecondary));
    pool = pool.filter(c => c.resistSecondary === bestSec);

    // 5) 랜덤
    return pool[Math.floor(Math.random() * pool.length)].atkType;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1; // 사용 가능한 최대 개수
  }
}

export class IgnoreContactItemModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 장착 가능 아이템 수량

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1); // 기본적으로 1번 적용
  }

  clone() {
    return new IgnoreContactItemModifier(this.type, this.pokemonId);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof IgnoreContactItemModifier;
  }

  /**
   * 비접촉 처리 및 위력 증가 적용
   * @param pokemon 적용 대상 포켓몬
   */
  override apply(
  pokemon: Pokemon,
  moveType: Type,
  movePower: NumberHolder,
): boolean {
  const move = pokemon.currentMove;

  if (!move || !(movePower instanceof NumberHolder)) {
    return false;
  }

  // 현재 기술이 접촉 기술인지 체크
  if (!this.checkIfMoveMakesContact(pokemon)) {
    return false;
  }

  // 비접촉 처리
  move.setFlag(MoveFlags.MAKES_CONTACT, false);

  // 연습 결과창 라벨
  (movePower as any).__practiceLabel = "방호패드";

  // 위력 1.3배
  movePower.value = Math.floor(movePower.value * 1.3);

  return true;
}

  /**
   * 기술이 접촉 기술인지 체크
   * @param user 기술을 사용하는 포켓몬
   * @returns true if the move makes contact
   */
  checkIfMoveMakesContact(user: Pokemon): boolean {
  const move = user.currentMove;
  if (!move) { return false; }

  return move.hasFlag(MoveFlags.MAKES_CONTACT);
}

  /**
   * 포켓몬이 장착할 수 있는 아이템 최대 개수 (1로 제한)
   */
  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return IgnoreContactItemModifier.maxHeldItemCount; // 최대 1개만 장착 가능
  }
}

export class GuaranteedSurviveDamageModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount = 1) {
    super(type, pokemonId);
    this.stackCount = stackCount; // 기본적으로 stackCount를 설정
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof GuaranteedSurviveDamageModifier;
  }

  clone() {
    return new GuaranteedSurviveDamageModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Applies {@linkcode GuaranteedSurviveDamageModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that consumes the item
   * @param surviveDamage {@linkcode BooleanHolder} that holds the survive damage
   * @returns `true` if the survive damage has been applied
   */
  override apply(playerPokemon: PlayerPokemon, surviveDamage: BooleanHolder, damageValue?: number): boolean {
    if (
      !surviveDamage.value &&
      playerPokemon.isFullHp() &&
      typeof damageValue === "number" &&
      damageValue >= playerPokemon.hp &&
      playerPokemon.getMaxHp() > 1
    ) {
      const preserve = new BooleanHolder(false);

      // preserve 적용. berry 아님을 명시
      globalScene.applyModifiers(PreserveItemModifier, playerPokemon.isPlayer(), playerPokemon, preserve, "item");

      surviveDamage.value = true;
      playerPokemon.hp = 1;
 
      globalScene.phaseManager.queueMessage(
        i18next.t("modifier:guaranteedSurviveDamageApply", {
          pokemonNameWithAffix: getPokemonNameWithAffix(playerPokemon),
          typeName: this.type.name,
        }),
      );

      playerPokemon.hp = 1;

      if (!preserve.value) {
  // ✅ 소모 확정 → 리사이클 기록
  recordRecycleSnapshot(playerPokemon, this, { args: [] });

  if (this.stackCount > 1) {
    this.stackCount--;
  } else {
    globalScene.removeModifier(this);
  }
}

      // UI 갱신 등 필요 시 호출
      globalScene.updateModifiers(playerPokemon);

      return true;
    }

    return false;
  }

  getMaxHeldItemCount(playerPokemon: PlayerPokemon): number {
    return 3; // 사용 가능한 최대 개수
  }

  getStackCount(): number {
    return this.stackCount;
  }
}

export class ContactDamageModifier extends PokemonHeldItemModifier {
  private damageRatio: number;

  constructor(type: ModifierType, pokemonId: number, damageRatio = 6) {
    super(type, pokemonId, 1);
    this.damageRatio = damageRatio;
  }

  clone(): this {
    return new ContactDamageModifier(this.type, this.pokemonId, this.damageRatio) as this;
  }

  getArgs(): any[] {
    return [this.pokemonId, this.damageRatio];
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof ContactDamageModifier;
  }

  override apply(
    pokemon: Pokemon,
    move: Move,
    targetPokemon: Pokemon | null,
    passive: boolean,
    simulated: boolean,
    cancelled: Utils.BooleanHolder,
  ): boolean {
    if (!move || !targetPokemon) { return false; }

    // 접촉 기술 여부 확인
    const isContact = move.checkFlag(MoveFlags.MAKES_CONTACT, pokemon, targetPokemon);
    const hitsSubstitute = move.hitsSubstitute(pokemon, targetPokemon); // 대타 상태 확인

    if (isContact && !hitsSubstitute) {
      const damage = Math.max(Math.floor(pokemon.getMaxHp() / this.damageRatio), 1); // 최소 1 피해
      pokemon.damageAndUpdate(damage, HitResult.INDIRECT); // 피해 적용

      if (cancelled?.set) {
        cancelled.set(true);
      }

      if (globalScene) {
        globalScene.phaseManager.queueMessage(
          i18next.t("modifier:contactDamageApplied", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            itemName: "울퉁불퉁멧",
          }),
        );
      }

      return true;
    }

    return false;
  }

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class ResetMoveRestrictionModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  matchType(modifier: Modifier) {
    return modifier instanceof ResetMoveRestrictionModifier;
  }

  clone() {
    return new ResetMoveRestrictionModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Goes through the holder's status tags and, if any match the predefined set,
   * removes them (or resets them).
   * @param pokemon {@linkcode Pokemon} that holds the item
   * @returns `true` if any status tags were removed, false otherwise
   */
  override apply(pokemon: Pokemon): boolean {
    let statusTagsRemoved = false;

    // 상태 태그 목록
    const statusTags = new Set([
      TauntTag, // 트집
      TormentTag, // 트집
      HealBlockTag, // 회복봉인
      EncoreTag, // 앙코르
      DisabledTag, // 능력치 제한
      InfatuatedTag, // 사랑에 빠진 상태
      PerishSongTag, // 멸망의 노래
    ]);

    // 포켓몬의 상태 태그 확인 (battlerTags가 undefined인 경우 빈 배열로 초기화)
    const pokemonTags = pokemon.battlerTags || [];

    // 상태 태그가 비어있다면, 상태 태그가 적용되지 않은 상태입니다.
    if (pokemonTags.length === 0) {
      console.log("No tags applied to the pokemon.");
    }

    console.log("Current battlerTags:", pokemonTags); // 상태 태그 목록 출력

    for (const tagInstance of pokemonTags) {
      console.log("Checking tag:", tagInstance.constructor.name); // 상태 태그 종류 출력

      if (statusTags.has(tagInstance.constructor)) {
        console.log("Removing tag:", tagInstance.constructor.name);
        tagInstance.clear(pokemon); // 상태 태그 제거
        statusTagsRemoved = true;
      }
    }

    // 상태 태그 제거된 경우 true 반환
    return statusTagsRemoved;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 10; // 최대 소지 개수
  }
}

export class ProtectStatModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  matchType(modifier: Modifier) {
    return modifier instanceof ProtectStatModifier;
  }

  clone() {
    return new ProtectStatModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * 능력치 감소 보호 기능 적용
   * @param pokemon 능력치가 변화하는 포켓몬
   * @param stat 변경될 능력치
   * @param newStage 적용될 새로운 능력치 단계
   * @returns 보호된 경우 원래 단계 유지, 아니면 변경된 값 반환
   */
  applyStatChange(pokemon: Pokemon, stat: BattleStat, newStage: number): number {
    const currentStage = pokemon.getStatStage(stat);
    console.log("[DEBUG] ProtectStatModifier apply 호출됨", { stat, currentStage, newStage });

    // 🛑 클리어참 효과: 상대방이 능력치를 낮출 때만 보호 (자기 효과는 허용)
    if (newStage < currentStage && pokemon.id === this.pokemonId && this.isEnemyEffect(pokemon)) {
      return currentStage; // 능력치 감소 차단
    }

    return newStage;
  }

  /**
   * 능력치 감소가 상대 효과인지 확인
   * @param pokemon 능력치 변경 대상 포켓몬
   * @returns 상대방 효과 여부 (true면 보호)
   */
  private isEnemyEffect(pokemon: Pokemon): boolean {
    return !globalScene.isPlayerPokemon(pokemon); // 플레이어가 아닌 포켓몬이면 보호
  }

  override apply(pokemon: Pokemon): boolean {
    let statProtected = false;

    for (const s of BATTLE_STATS) {
      const currentStage = pokemon.getStatStage(s);

      // 🛑 능력치가 0보다 낮아지는 경우만 보호
      if (pokemon.id === this.pokemonId && currentStage < 0) {
        statProtected = true;
      }
    }

    if (statProtected) {
      globalScene.phaseManager.queueMessage(
        i18next.t("modifier:protectStatStageApply", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          typeName: this.type.name,
        }),
      );
    }

    return statProtected;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1; // 한 포켓몬에 하나만 적용
  }
}

export class WeaknessTypeModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount = 1) {
    super(type, pokemonId);
    this.stackCount = stackCount;
  }

  override matchType(modifier: Modifier): boolean {
    return modifier instanceof WeaknessTypeModifier;
  }

  override clone(): WeaknessTypeModifier {
    return new WeaknessTypeModifier(this.type, this.pokemonId, this.stackCount);
  }

  canApply(pokemon: Pokemon): boolean {
    return true;
  }

  override apply(
    pokemon: Pokemon,
    moveType: Type,
    movePower: number,
    result: HitResult,
    source: Pokemon
  ): boolean {
    if (!this.canApply(pokemon)) {
      console.log("canApply returned false");
      return false;
    }

    const isWeaknessHit =
      result === HitResult.SUPER_EFFECTIVE ||
      result === HitResult.EXTREMELY_EFFECTIVE;

    // 결과가 약점 공격(2배 / 4배)인 경우에만 처리
    if (isWeaknessHit && source) {
      globalScene.phaseManager.unshiftNew(
        "StatStageChangePhase",
        pokemon.getBattlerIndex(),
        true,
        [Stat.ATK, Stat.SPATK],
        2,
        true,
      );

      const preserve = new BooleanHolder(false);
      globalScene.applyModifiers(
        PreserveItemModifier,
        pokemon.isPlayer(),
        pokemon,
        preserve,
        "item"
      );

      if (!preserve.value) {
  recordRecycleSnapshot(pokemon, this, { args: [] });

  if (this.stackCount > 1) {
    this.stackCount--;
  } else {
    pokemon.loseHeldItem(this);
  }

  globalScene.updateModifiers(pokemon.isPlayer());
  pokemon.updateInfo();
}

      return true;
    }

    return false;
  }

  getMaxHeldItemCount(pokemon: Pokemon): number {
    return 10;
  }
}

/**
 * Item that increases the holder's Defense and Special Defense when an opposing Pokemon is knocked out by an attack move.
 */
export class PokemonDefensiveStatModifier extends PokemonHeldItemModifier {
  public isTransferable = false;

  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof PokemonDefensiveStatModifier;
  }

  clone(): PokemonDefensiveStatModifier {
    return new PokemonDefensiveStatModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  /**
   * Checks if the {@linkcode PokemonDefensiveStatModifier} should be applied to the {@linkcode Pokemon}.
   * @param pokemon The {@linkcode Pokemon} that holds the item
   * @param stat The affected {@linkcode Stat}
   * @param statHolder The {@linkcode NumberHolder} that holds the stat
   * @returns `true` if the modifier should be applied
   */
  override shouldApply(pokemon?: Pokemon, stat?: Stat, statHolder?: NumberHolder): boolean {
    return super.shouldApply(pokemon, stat, statHolder) && !!statHolder;
  }

  /**
   * Applies the {@linkcode PokemonDefensiveStatModifier} when an opponent's Pokemon is knocked out.
   * @param _pokemon The {@linkcode Pokemon} that holds the item
   * @param stat The affected {@linkcode Stat}
   * @param statHolder The {@linkcode NumberHolder} that holds the stat
   * @returns always `true`
   */
  override apply(_pokemon: Pokemon, stat: Stat, statHolder: NumberHolder): boolean {
    // Modifies the passed in stat number holder by +30% per stack for Defense and Special Defense
    const isDefense = stat === Stat.DEF;
    const isSpecialDefense = stat === Stat.SPDEF;

    if (isDefense || isSpecialDefense) {
      // Apply the stat increase based on the number of stacks
      statHolder.value += Math.floor(statHolder.value * (0.3 * this.stackCount));
    }

    return true;
  }

  /**
   * This function is called to determine the score multiplier for the item.
   * @returns The score multiplier
   */
  getScoreMultiplier(): number {
    return 1.3; // Example multiplier
  }

  /**
   * Gets the maximum number of stacks the item can have.
   * @param pokemon The Pokemon holding the item (optional)
   * @returns Maximum stack count
   */
  getMaxHeldItemCount(pokemon?: Pokemon): number {
    return 5; // Maximum stacks allowed, now limited to 5
  }
}

export class SpeedStatModifier extends PokemonHeldItemModifier {
  public isTransferable = false;

  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount ?? 1); // 기본 1스택 시작
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof SpeedStatModifier;
  }

  clone(): SpeedStatModifier {
    return new SpeedStatModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  /**
   * 상대를 쓰러뜨릴 때마다 스택 증가
   */
  onKnockout(pokemon: Pokemon) {
    if (this.stackCount < this.getMaxHeldItemCount()) {
      this.stackCount++;
      console.log(`SpeedStatModifier: 스택 증가! 현재 스택: ${this.stackCount}`);
    }
  }

  /**
   * 스피드 적용 (스택당 30%씩 증가)
   */
  override apply(pokemon: Pokemon, stat: Stat, statHolder: NumberHolder): boolean {
    if (stat !== Stat.SPD) { return false; }

    const speedMultiplier = 1 + this.stackCount * 0.3; // 스택당 30% 증가
    statHolder.value = Math.floor(statHolder.value * speedMultiplier);

    return true;
  }

  getScoreMultiplier(): number {
    return 1.3;
  }

  getMaxHeldItemCount(): number {
    return 5; // 최대 5스택 (최대 2.5배)
  }
}

export class SpAtkStatModifier extends PokemonHeldItemModifier {
  public isTransferable = false;

  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount ?? 1); // 기본 1스택 시작
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof SpAtkStatModifier;
  }

  clone(): SpAtkStatModifier {
    return new SpAtkStatModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  /**
   * 상대를 쓰러뜨릴 때마다 스택 증가
   */
  onKnockout(pokemon: Pokemon) {
    if (this.stackCount < this.getMaxHeldItemCount()) {
      this.stackCount++;
      console.log(`SpAtkStatModifier: 스택 증가! 현재 스택: ${this.stackCount}`);
    }
  }

  /**
   * 특수공격력 적용 (스택당 30%씩 증가)
   */
  override apply(pokemon: Pokemon, stat: Stat, statHolder: NumberHolder): boolean {
    if (stat !== Stat.SPATK) { return false; // SPD 대신 SPATK로 변경
}

    const specialAttackMultiplier = 1 + this.stackCount * 0.3; // 스택당 30% 증가
    statHolder.value = Math.floor(statHolder.value * specialAttackMultiplier);

    return true;
  }

  getScoreMultiplier(): number {
    return 1.3;
  }

  getMaxHeldItemCount(): number {
    return 5; // 최대 5스택 (최대 2.5배)
  }
}

export class AtkStatModifier extends PokemonHeldItemModifier {
  public isTransferable = false;

  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount ?? 1); // 기본 1스택 시작
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof AtkStatModifier;
  }

  clone(): AtkStatModifier {
    return new AtkStatModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  /**
   * 상대를 쓰러뜨릴 때마다 스택 증가
   */
  onKnockout(pokemon: Pokemon) {
    if (this.stackCount < this.getMaxHeldItemCount()) {
      this.stackCount++;
      console.log(`AtkStatModifier: 스택 증가! 현재 스택: ${this.stackCount}`);
    }
  }

  /**
   * 공격력 적용 (스택당 30%씩 증가)
   */
  override apply(pokemon: Pokemon, stat: Stat, statHolder: NumberHolder): boolean {
    if (stat !== Stat.ATK) { return false; // SPD 대신 ATK로 변경
}

    const attackMultiplier = 1 + this.stackCount * 0.3; // 스택당 30% 증가
    statHolder.value = Math.floor(statHolder.value * attackMultiplier);

    return true;
  }

  getScoreMultiplier(): number {
    return 1.3;
  }

  getMaxHeldItemCount(): number {
    return 5; // 최대 5스택 (최대 2.5배)
  }
}

export class OvercoatModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 장착 가능 개수

  protected negatesWeatherDamage: boolean;
  protected negatesPowderMoves: boolean;
  protected weatherTypes: WeatherType[];

  constructor(
    type: ModifierType,
    pokemonId: number,
    negatesWeatherDamage: boolean,
    negatesPowderMoves: boolean,
    weatherTypes: WeatherType[],
    stackCount?: number,
  ) {
    super(type, pokemonId, stackCount);

    this.negatesWeatherDamage = negatesWeatherDamage;
    this.negatesPowderMoves = negatesPowderMoves;
    this.weatherTypes = weatherTypes;
  }

  clone() {
    return new OvercoatModifier(
      this.type,
      this.pokemonId,
      this.negatesWeatherDamage,
      this.negatesPowderMoves,
      this.weatherTypes,
      this.stackCount,
    );
  }

  getArgs(): any[] {
    return super.getArgs().concat([this.negatesWeatherDamage, this.negatesPowderMoves, this.weatherTypes]);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof OvercoatModifier;
  }

  apply(_pokemon: Pokemon, move: any, weatherType: WeatherType): boolean {
    const currentWeatherType = weatherType ?? WeatherType.NONE;

    if (currentWeatherType === WeatherType.NONE) {
      console.error("날씨 타입이 올바르게 설정되지 않았습니다!");
      return true;
    }

    // 날씨 피해 무효화 조건
    if (this.negatesWeatherDamage && this.weatherTypes.includes(currentWeatherType) && _pokemon.id === this.pokemonId) {
        console.log("이 포켓몬은 날씨 피해를 무효화합니다");
        return false; // 날씨 피해를 무효화
      }

    // 가루계열 기술 무효화 조건
    if (this.negatesPowderMoves && move.hasFlag(MoveFlags.POWDER_MOVE) && _pokemon.id === this.pokemonId) {
        console.log("이 포켓몬은 가루계열 기술의 영향을 받지 않습니다.");
        // 가루 계열 기술을 사용하는 경우, move가 실행되지 않도록 막음
        move.setFlag(MoveFlags.POWDER_MOVE, false); // 해당 기술이 가루 계열 기술 플래그를 제거
        return false; // 기술을 더 이상 진행하지 않도록 함
      }

    // 가루 계열 기술 보호 메시지 출력
    if (this.negatesPowderMoves && this.checkIfMoveIsPowderMove(_pokemon)) {
      // 이 포켓몬은 가루계열 기술의 영향을 보호하고 있다는 메시지를 큐에 추가
      globalScene.phaseManager.queueMessage(
        i18next.t("modifier:protectPowderMoveApply", {
          pokemonNameWithAffix: getPokemonNameWithAffix(_pokemon),
          typeName: this.type.name,
        }),
      );

      // 가루 계열 기술의 영향을 무효화
      move.setFlag(MoveFlags.POWDER_MOVE, false);
      return false; // 기술을 더 이상 진행하지 않도록 막음
    }

    return true;
  }

  // 기술이 가루 계열 기술인지 체크
  checkIfMoveIsPowderMove(user: Pokemon): boolean {
    const move = user.currentMove;
    return move?.checkFlag(MoveFlags.POWDER_MOVE, user, null) ?? false;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return OvercoatModifier.maxHeldItemCount; // 최대 1개만 장착 가능
  }
}

export class PunchingGloveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1;

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new PunchingGloveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof PunchingGloveModifier;
  }

  /**
   * ✅ 펀치 계열 기술의 위력 1.2배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 펀치 기술일 때만 적용
    if (!move || !this.isPunchingMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[PunchingGloveModifier] ${move.name} → 펀치 기술 1.2배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 펀치 기술 판정 함수
   */
  private isPunchingMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.PUNCHING_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return PunchingGloveModifier.maxHeldItemCount;
  }
}

/**
 * 🪓 베기 기술 위력 1.3배 & 비접촉 처리 아이템
 * SlicingCharmModifier
 * 예: "칼날부적" 또는 "베기부적"
 */
export class SlicingMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new SlicingMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof SlicingMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!move || !this.isSlicingMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[SlicingCharmModifier] ${move.name} → 베기 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isSlicingMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.SLICING_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return SlicingMoveModifier.maxHeldItemCount;
  }
}

/**
 * 🪓 물기 기술 위력 1.3배 & 비접촉 처리 아이템
 * BitingMoveModifier
 * 예: "튼튼한틀니"
 */
export class BitingMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new BitingMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof BitingMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!move || !this.isBitingMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[BitingMoveModifier] ${move.name} → 물기 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isBitingMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.BITING_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return BitingMoveModifier.maxHeldItemCount;
  }
}

export class HeadMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new HeadMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof HeadMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!move || !this.isHeadMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[HeadMoveModifier] ${move.name} → 박치기 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isHeadMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.HEAD_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return HeadMoveModifier.maxHeldItemCount;
  }
}

export class HornMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new HornMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof HornMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!move || !this.isHornMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[HornMoveModifier] ${move.name} → 박치기 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isHornMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.HORN_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return HornMoveModifier.maxHeldItemCount;
  }
}

export class KickMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new KickMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof KickMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!move || !this.isKickMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[KickMoveModifier] ${move.name} → 발치기, 킥 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isKickMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.KICK_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return KickMoveModifier.maxHeldItemCount;
  }
}

export class SpearMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new SpearMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof SpearMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!move || !this.isSpearMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[SpearMoveModifier] ${move.name} → 창, 찌르기 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isSpearMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.SPEAR_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return SpearMoveModifier.maxHeldItemCount;
  }
}

export class WingMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new WingMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof WingMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!move || !this.isWingMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[WingMoveModifier] ${move.name} → 날개 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isWingMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.WING_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return WingMoveModifier.maxHeldItemCount;
  }
}

export class HammerMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new HammerMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof HammerMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!move || !this.isHammerMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[HammerMoveModifier] ${move.name} → 망치, 둔기 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isHammerMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.HAMMER_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return HammerMoveModifier.maxHeldItemCount;
  }
}

export class ClawMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new ClawMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof ClawMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!move || !this.isClawMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[ClawMoveModifier] ${move.name} → 할퀴기 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isClawMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.CLAW_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return ClawMoveModifier.maxHeldItemCount;
  }
}

export class PinchMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new PinchMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof PinchMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!(this instanceof PinchMoveModifier)) { return false; }
    if (!move || !this.isPinchMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[PinchMoveModifier] ${move.name} → 찝기, 가위 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isPinchMove(move: Move): boolean {
    return move.hasFlag(MoveFlags2.PINCH_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return PinchMoveModifier.maxHeldItemCount;
  }
}

export class BeakMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new BeakMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof BeakMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!(this instanceof BeakMoveModifier)) { return false; }
    if (!move || !this.isBeakMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[BeakMoveModifier] ${move.name} → 부리, 쪼기 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isBeakMove(move: Move): boolean {
    return move.hasFlag(MoveFlags2.BEAK_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return BeakMoveModifier.maxHeldItemCount;
  }
}

export class DashMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new DashMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof DashMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!(this instanceof DashMoveModifier)) { return false; }
    if (!move || !this.isDashMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[DashMoveModifier] ${move.name} → 질주 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isDashMove(move: Move): boolean {
    return move.hasFlag(MoveFlags2.DASH_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return DashMoveModifier.maxHeldItemCount;
  }
}

export class SpinMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new SpinMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof SpinMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!(this instanceof SpinMoveModifier)) { return false; }
    if (!move || !this.isSpinMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[SpinMoveModifier] ${move.name} → 스핀 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isSpinMove(move: Move): boolean {
    return move.hasFlag(MoveFlags2.SPIN_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return SpinMoveModifier.maxHeldItemCount;
  }
}

export class DrillMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new DrillMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof DrillMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!(this instanceof DrillMoveModifier)) { return false; }
    if (!move || !this.isDrillMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[DrillMoveModifier] ${move.name} → 드릴 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isDrillMove(move: Move): boolean {
    return move.hasFlag(MoveFlags2.DRILL_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return DrillMoveModifier.maxHeldItemCount;
  }
}

export class WhipMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new WhipMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof WhipMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!(this instanceof WhipMoveModifier)) { return false; }
    if (!move || !this.isWhipMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[WhipMoveModifier] ${move.name} → 채찍 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isWhipMove(move: Move): boolean {
    return move.hasFlag(MoveFlags2.WHIP_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return WhipMoveModifier.maxHeldItemCount;
  }
}

export class WheelMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new WheelMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof WheelMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!(this instanceof WheelMoveModifier)) { return false; }
    if (!move || !this.isWheelMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[WheelMoveModifier] ${move.name} → 바퀴, 구르기 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isWheelMove(move: Move): boolean {
    return move.hasFlag(MoveFlags2.WHEEL_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return WheelMoveModifier.maxHeldItemCount;
  }
}

export class TailMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new TailMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof TailMoveModifier;
  }

  /**
   * ✅ 베기 계열 기술의 위력 1.3배 및 비접촉 처리
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 베기 기술일 때만 적용
    if (!(this instanceof TailMoveModifier)) { return false; }
    if (!move || !this.isTailMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    // 비접촉 처리
    move.setFlag(MoveFlags.MAKES_CONTACT, false);

    console.log(`[TailMoveModifier] ${move.name} → 꼬리 기술 1.3배 & 비접촉 처리`);

    return true;
  }

  /**
   * ✅ 베기 기술 판정 함수
   */
  private isTailMove(move: Move): boolean {
    return move.hasFlag(MoveFlags2.TAIL_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return TailMoveModifier.maxHeldItemCount;
  }
}

export class ArrowMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new ArrowMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof ArrowMoveModifier;
  }

  /**
   * ✅ 꼬리 계열 기술의 위력 1.3배 증가
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 꼬리 기술일 때만 적용
    if (!(this instanceof ArrowMoveModifier)) { return false; }
    if (!move || !this.isArrowMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    console.log(`[ArrowMoveModifier] ${move.name} → 화살 기술 1.3배 적용`);

    return true;
  }

  /**
   * ✅ 꼬리 기술 판정 함수
   */
  private isArrowMove(move: Move): boolean {
    return move.hasFlag(MoveFlags2.ARROW_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return ArrowMoveModifier.maxHeldItemCount;
  }
}

export class BallBombMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new BallBombMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof BallBombMoveModifier;
  }

  /**
   * ✅ 꼬리 계열 기술의 위력 1.3배 증가
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 꼬리 기술일 때만 적용
    if (!(this instanceof BallBombMoveModifier)) { return false; }
    if (!move || !this.isBallBombMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    console.log(`[BallBombMoveModifier] ${move.name} → 구슬, 폭탄류 기술 1.3배 적용`);

    return true;
  }

  /**
   * ✅ 꼬리 기술 판정 함수
   */
  private isBallBombMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.BALLBOMB_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return BallBombMoveModifier.maxHeldItemCount;
  }
}

export class BoomerangMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new BoomerangMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof BoomerangMoveModifier;
  }

  /**
   * ✅ 꼬리 계열 기술의 위력 1.3배 증가
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 꼬리 기술일 때만 적용
    if (!(this instanceof BoomerangMoveModifier)) { return false; }
    if (!move || !this.isBoomerangMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    console.log(`[BoomerangMoveModifier] ${move.name} → 부메랑 기술 1.3배 적용`);

    return true;
  }

  /**
   * ✅ 꼬리 기술 판정 함수
   */
  private isBoomerangMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.BOOMERANG_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return BoomerangMoveModifier.maxHeldItemCount;
  }
}

export class ThrowMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new ThrowMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof ThrowMoveModifier;
  }

  /**
   * ✅ 꼬리 계열 기술의 위력 1.3배 증가
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 꼬리 기술일 때만 적용
    if (!(this instanceof ThrowMoveModifier)) { return false; }
    if (!move || !this.isThrowMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    console.log(`[ThrowMoveModifier] ${move.name} → 떨구기 던지기 기술 1.3배 적용`);

    return true;
  }

  /**
   * ✅ 꼬리 기술 판정 함수
   */
  private isThrowMove(move: Move): boolean {
    return move.hasFlag(MoveFlags2.THROW_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return ThrowMoveModifier.maxHeldItemCount;
  }
}

export class PulseMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new PulseMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof PulseMoveModifier;
  }

  /**
   * ✅ 꼬리 계열 기술의 위력 1.3배 증가
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 꼬리 기술일 때만 적용
    if (!(this instanceof PulseMoveModifier)) { return false; }
    if (!move || !this.isPulseMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    console.log(`[PulseMoveModifier] ${move.name} → 파동 기술 1.3배 적용`);

    return true;
  }

  /**
   * ✅ 꼬리 기술 판정 함수
   */
  private isPulseMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.PULSE_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return PulseMoveModifier.maxHeldItemCount;
  }
}

export class BeamMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new BeamMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof BeamMoveModifier;
  }

  /**
   * ✅ 꼬리 계열 기술의 위력 1.3배 증가
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 꼬리 기술일 때만 적용
    if (!(this instanceof BeamMoveModifier)) { return false; }
    if (!move || !this.isBeamMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    console.log(`[BeamMoveModifier] ${move.name} → 빔, 광선 기술 1.3배 적용`);

    return true;
  }

  /**
   * ✅ 꼬리 기술 판정 함수
   */
  private isBeamMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.BEAM_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return BeamMoveModifier.maxHeldItemCount;
  }
}

export class LightMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new LightMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof LightMoveModifier;
  }

  /**
   * ✅ 꼬리 계열 기술의 위력 1.3배 증가
   * @param pokemon 기술을 사용하는 포켓몬
   * @param simulated 시뮬레이션 여부
   * @param damage 현재 대미지(NumberHolder)
   * @param move 기술 객체
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    // 조건: 기술 존재 + 꼬리 기술일 때만 적용
    if (!(this instanceof LightMoveModifier)) { return false; }
    if (!move || !this.isLightMove(move)) { return false; }

    // 위력 증가
    damage.value = Math.floor(damage.value * 1.3);

    console.log(`[LightMoveModifier] ${move.name} → 빛 기술 1.3배 적용`);

    return true;
  }

  /**
   * ✅ 꼬리 기술 판정 함수
   */
  private isLightMove(move: Move): boolean {
    return move.hasFlag(MoveFlags2.LIGHT_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return LightMoveModifier.maxHeldItemCount;
  }
}

/**
 * ✅ 꼬리 장식 아이템 — 꼬리 기술 강화 + 특정 MoveFlags 피해 반감
 * - 자신이 사용하는 꼬리 기술의 위력은 1.3배
 * - 자신이 받는 특정 MoveFlags 기술의 피해는 0.5배
 */
export class SoundMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  // ✅ 받는 피해를 줄이는 기술 플래그들 (예: 베기 기술)
  private static readonly reducedFlags: MoveFlags[] = [MoveFlags.SLICING_MOVE];

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new SoundMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof SoundMoveModifier;
  }

  /**
   * ✅ 공격 시: 꼬리 계열 기술의 위력 1.3배 증가
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    if (!(this instanceof SoundMoveModifier)) { return false; }
    if (!move || !this.isSoundMove(move)) { return false; }

    damage.value = Math.floor(damage.value * 1.3);
    console.log(`[SoundMoveModifier] ${move.name} → 꼬리 기술 1.3배 적용`);
    return true;
  }

  /**
   * ✅ 방어 시: 특정 MoveFlags 기술의 피해를 0.5배로 감소
   */
  override preDefendModifyDamage(params: PreDefendModifyDamageItemModifierParams): boolean {
    const { move, damage } = params;
    if (!move) { return false; }

    for (const flag of SoundMoveModifier.reducedFlags) {
      if (move.hasFlag(flag)) {
        damage.value = toDmgValue(damage.value * 0.5);
        console.log(`[SoundMoveModifier] ${move.name} → ${MoveFlags[flag]} 플래그로 인해 받는 피해 0.5배 감소`);
        return true;
      }
    }

    return false;
  }

  /**
   * ✅ 꼬리 기술 판정 함수
   */
  private isSoundMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.SOUND_BASED);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return SoundMoveModifier.maxHeldItemCount;
  }
}

export class WindMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능

  // ✅ 받는 피해를 줄이는 기술 플래그들 (예: 베기 기술)
  private static readonly reducedFlags: MoveFlags[] = [MoveFlags.SLICING_MOVE];

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new WindMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof WindMoveModifier;
  }

  /**
   * ✅ 공격 시: 꼬리 계열 기술의 위력 1.3배 증가
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    if (!(this instanceof WindMoveModifier)) { return false; }
    if (!move || !this.isWindMove(move)) { return false; }

    damage.value = Math.floor(damage.value * 1.3);
    console.log(`[WindMoveModifier] ${move.name} → 바람 기술 1.3배 적용`);
    return true;
  }

  /**
   * ✅ 방어 시: 특정 MoveFlags 기술의 피해를 0.5배로 감소
   */
  override preDefendModifyDamage(params: PreDefendModifyDamageItemModifierParams): boolean {
    const { move, damage } = params;
    if (!move) { return false; }

    for (const flag of WindMoveModifier.reducedFlags) {
      if (move.hasFlag(flag)) {
        damage.value = toDmgValue(damage.value * 0.5);
        console.log(`[WindMoveModifier] ${move.name} → ${MoveFlags[flag]} 플래그로 인해 받는 피해 0.5배 감소`);
        return true;
      }
    }

    return false;
  }

  /**
   * ✅ 꼬리 기술 판정 함수
   */
  private isWindMove(move: Move): boolean {
    return move.hasFlag(MoveFlags.WIND_MOVE);
  }

  /**
   * ✅ 포켓몬이 장착 가능한 최대 개수 (1개 제한)
   */
  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return WindMoveModifier.maxHeldItemCount;
  }
}

/**
 * ✅ DanceMoveModifier — 무희(춤 기술 복제) + 춤기술 1.3배 아이템
 * - 자신이 사용하는 DANCE_MOVE 기술 위력 1.3배
 * - 다른 포켓몬이 춤 기술을 사용하면 자동 복사 (무희 특성 효과)
 * - PokemonMove / Move 타입 모두 안전 대응
 */
export class DanceMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1;

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new DanceMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof DanceMoveModifier;
  }

  /**
   * ✅ 춤 기술 위력 1.3배
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move | any): boolean {
    const baseMove = this.toBaseMove(move);
    if (!baseMove || !this.isDanceMove(baseMove)) { return false; }

    damage.value = Math.floor(damage.value * 1.3);
    console.log(`[DanceMoveModifier] ${baseMove.name} → 춤 기술 1.3배 적용`);
    return true;
  }

  /**
   * ✅ 다른 포켓몬이 춤 기술을 사용했을 때 복사 실행 (무희 로직)
   */
  override onPostMoveUsed({
    source,
    move,
    targets,
    simulated,
  }: PostMoveUsedModifierParams): void {
    if (simulated) { return; }

    const baseMove = this.toBaseMove(move);
    if (!baseMove || !this.isDanceMove(baseMove)) { return; }

    const dancer = globalScene.getPokemonById(this.pokemonId);
    if (!dancer || dancer.isFainted()) { return; }

    // 자신이 시전자면 복제 방지
    if (source.id === this.pokemonId) { return; }

    // 비활성/무효 상태 예외
    const forbiddenTags = [
      BattlerTagType.FLYING,
      BattlerTagType.UNDERWATER,
      BattlerTagType.UNDERGROUND,
      BattlerTagType.HIDDEN,
    ];
    if (dancer.summonData.tags.some(tag => forbiddenTags.includes(tag.tagType))) { return; }

    console.log(`[DanceMoveModifier] ${dancer.getName()}이(가) ${source.getName()}의 ${baseMove.name}을(를) 따라 춤춥니다!`);

    dancer.turnData.extraTurns++;

    // 공격기/보조기
    if (typeof baseMove.is === "function" && (baseMove.is("AttackMove") || baseMove.is("StatusMove"))) {
      const target = this.getTarget(dancer, source, targets);
      globalScene.phaseManager.unshiftNew("MovePhase", dancer, target, move, MoveUseMode.INDIRECT);
    }
    // 자가버프(SelfStatusMove)
    else if (typeof baseMove.is === "function" && baseMove.is("SelfStatusMove")) {
      globalScene.phaseManager.unshiftNew(
        "MovePhase",
        dancer,
        [dancer.getBattlerIndex()],
        move,
        MoveUseMode.INDIRECT,
      );
    }
  }

  /**
   * ✅ Move / PokemonMove 타입 구분 없이 안전하게 Move 반환
   */
  private toBaseMove(move: any): Move | null {
    if (!move) { return null; }
    if (typeof move.getMove === "function") { return move.getMove(); // PokemonMove
}
    return move; // Move
  }

  /**
   * ✅ 춤 기술 판정 (PokemonMove / Move 모두 처리)
   */
  private isDanceMove(move: any): boolean {
    const baseMove = this.toBaseMove(move);
    return !!(baseMove && typeof baseMove.hasFlag === "function" && baseMove.hasFlag(MoveFlags.DANCE_MOVE));
  }

  /**
   * ✅ 무희 로직용 타겟 판정
   */
  private getTarget(dancer: Pokemon, source: Pokemon, targets: BattlerIndex[]): BattlerIndex[] {
    if (dancer.isPlayer()) {
      return source.isPlayer() ? targets : [source.getBattlerIndex()];
    }
    return source.isPlayer() ? [source.getBattlerIndex()] : targets;
  }

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return DanceMoveModifier.maxHeldItemCount;
  }
}

export class DrainMoveModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount: number = 1; // 최대 1개만 장착 가능
  private static readonly damageBoost: number = 1.5;    // 대미지 배율
  private static readonly healBoost: number = 1.5;      // 흡수량 배율

  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId, 1);
  }

  clone() {
    return new DrainMoveModifier(this.type, this.pokemonId);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof DrainMoveModifier;
  }

  /**
   * ✅ 흡수 기술의 위력 1.5배 증가
   */
  override apply(pokemon: Pokemon, simulated: boolean, damage: NumberHolder, move?: Move): boolean {
    if (!move || !this.isDrainMove(move)) { return false; }

    // 대미지 증가
    damage.value = Math.floor(damage.value * DrainMoveModifier.damageBoost);

    console.log(`[DrainMoveModifier] ${move.name} → 흡수 기술 위력 ${DrainMoveModifier.damageBoost}배 적용`);
    return true;
  }

  /**
   * ✅ 흡수 기술 판정 함수
   * (HitHealAttr을 가진 기술일 경우)
   */
  private isDrainMove(move: Move): boolean {
    return move.hasAttr(HitHealAttr);
  }

  /**
   * ✅ 흡수량 1.5배 증가 처리
   * PostMoveUsed 이벤트에서 발동
   */
  override onPostMoveUsed({ source, move, simulated }: PostMoveUsedModifierParams): void {
    if (simulated || !move || !this.isDrainMove(move)) { return; }

    const lastDamage = source.turnData.singleHitDamageDealt ?? 0;
    const healAmount = Math.floor(lastDamage * (DrainMoveModifier.healBoost - 1) * 0.5);

    if (healAmount > 0) {
      source.heal(healAmount);
      console.log(`[DrainMoveModifier] ${move.name} → 추가 회복 ${healAmount} 적용`);
    }
  }

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return DrainMoveModifier.maxHeldItemCount;
  }
}

// 해명의방울 (루기아 전용)
// - 회복기 우선도 +2
// - HealAttr(자체회복) 회복량 x1.5
// - HitHealAttr(흡수기) : 추가 회복(기본 흡수 1/2 가정 시 "회복량 x1.5" 맞추기용)

export interface ChangeMovePriorityItemParams extends ModifierParams {
  pokemon: Pokemon;
  move: Move;
  priority: NumberHolder;
  simulated: boolean;
}

export interface ModifyHealAmountItemParams extends ModifierParams {
  pokemon: Pokemon;
  move: Move | null;          // HealAttr에서 넣어주면 좋음
  heal: NumberHolder;         // 실제 회복량(HP 단위)
  simulated: boolean;
}

export class SpeciesHealingBellModifier extends PokemonHeldItemModifier {
  private static readonly maxHeldItemCount = 1;

  // ✅ 원하는 수치로 조절
  private static readonly priorityBonus = 3;   // 회복기 우선도 +2
  private static readonly healMultiplier = 1.5; // 회복량 x1.5

  /** 전용 종족 (루기아) */
  private species: SpeciesId[];

  constructor(type: ModifierType, pokemonId: number, species: SpeciesId[] = [SpeciesId.LUGIA]) {
    super(type, pokemonId, 1);
    this.species = species;
  }

  clone() {
    return new SpeciesHealingBellModifier(this.type, this.pokemonId, this.species);
  }

  getArgs(): any[] {
    return [...super.getArgs(), this.species];
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof SpeciesHealingBellModifier;
  }

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return SpeciesHealingBellModifier.maxHeldItemCount;
  }

  /** ✅ 루기아(또는 융합 종족) 체크: SpeciesCritBoosterModifier 방식 그대로 */
  private isAllowedSpecies(pokemon: Pokemon): boolean {
    return (
      this.species.includes(pokemon.getSpeciesForm(true).speciesId) ||
      (pokemon.isFusion() && this.species.includes(pokemon.getFusionSpeciesForm(true).speciesId))
    );
  }

  /** ✅ “회복기” 판정 기준: 네가 이미 쓰는 기준(힐링시프트) 그대로 재사용 추천 */
  private isHealingMove(move: Move): boolean {
    // 회복기 플래그를 이미 TRIAGE_MOVE로 관리하고 있다면 이게 제일 깔끔함
    return move.hasFlag(MoveFlags.TRIAGE_MOVE);
  }

  /** ✅ 흡수기(드레인) 판정: DrainMoveModifier처럼 HitHealAttr 기반 */
  private isDrainMove(move: Move): boolean {
    return move.hasAttr(HitHealAttr);
  }

  // ============================================================
  // 1) 회복기 우선도 상승 (MovePhase에서 priority 계산할 때 호출되도록 연결)
  // ============================================================
  onChangeMovePriority({ pokemon, move, priority, simulated }: ChangeMovePriorityItemParams): void {
    if (simulated) { return; }
    if (!this.isAllowedSpecies(pokemon)) { return; }
    if (!this.isHealingMove(move)) { return; }

    priority.value += SpeciesHealingBellModifier.priorityBonus;

    console.log(
      `[SpeciesHealingBell] ${move.name} → 우선도 +${SpeciesHealingBellModifier.priorityBonus}`
    );
  }

  // ============================================================
  // 2) HealAttr 계열 “즉시회복” 회복량 증가 (HealAttr에서 healAmount 계산할 때 호출되도록 연결)
  // ============================================================
  onModifyHealAmount({ pokemon, move, heal, simulated }: ModifyHealAmountItemParams): void {
    if (simulated) { return; }
    if (!this.isAllowedSpecies(pokemon)) { return; }

    // HealAttr에서 move를 넘겨주면 "회복기일 때만" 강화 가능
    if (move && !this.isHealingMove(move)) { return; }

    heal.value = Math.floor(heal.value * SpeciesHealingBellModifier.healMultiplier);

    console.log(
      `[SpeciesHealingBell] heal → x${SpeciesHealingBellModifier.healMultiplier} 적용 (${heal.value})`
    );
  }

  // ============================================================
  // 3) 흡수기(드레인) 회복량 증가
  //    - 엔진에 "드레인 healAmount 훅"이 없다면 차선책으로 PostMoveUsed에 추가 회복을 얹음
  //    - ⚠️ 기본 흡수비율 1/2(=50%) 가정으로 "회복량 x1.5" 맞추는 방식
  // ============================================================
  override onPostMoveUsed({ source, move, simulated }: PostMoveUsedModifierParams): void {
    if (simulated || !move) { return; }
    if (!this.isAllowedSpecies(source)) { return; }
    if (!this.isDrainMove(move)) { return; }

    const lastDamage = source.turnData.singleHitDamageDealt ?? 0;
    if (lastDamage <= 0) { return; }

    // 기본 드레인 회복량 = lastDamage * 0.5 라고 가정할 때,
    // 회복량 x1.5를 만들려면 "추가로 0.25 * lastDamage" 더 회복하면 됨
    const extraHeal = Math.floor(lastDamage * 0.25);

    if (extraHeal > 0) {
      source.heal(extraHeal);
      console.log(`[SpeciesHealingBell] ${move.name} → 드레인 추가회복 ${extraHeal}`);
    }
  }
}

/**
 * Modifies item effects to ignore additional move effects from tools.
 * @extends PokemonHeldItemModifier
 */
export class IgnoreMoveEffectsItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  matchType(modifier: Modifier) {
    return modifier instanceof IgnoreMoveEffectsItemModifier;
  }

  override clone() {
    return new IgnoreMoveEffectsItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * 부가효과(secondary effect)만 무효화하도록 변경
   */
  applyMoveEffect(pokemon: Pokemon, attacker: Pokemon, move: Move, args: [NumberHolder]): void {
    const effectChance = args[0];

    // 🟢 NumberHolder이고 확률이 0보다 큰 경우만 무효화
    // 즉, 순수 변화기(100% 고정효과)는 여기서 막지 않음
    if (effectChance instanceof NumberHolder && effectChance.value > 0) {
      effectChance.value = 0;
      console.debug(`[IgnoreMoveEffectsItemModifier] ${pokemon.name}의 부가효과 무효화`);
    }
  }

  canApplyMoveEffect(pokemon: Pokemon, attacker: Pokemon, move: Move, args: [NumberHolder]): boolean {
    const effectChance = args[0];
    return effectChance instanceof NumberHolder && effectChance.value > 0;
  }

  override shouldApply(pokemon?: Pokemon, moveType?: Type, movePower?: NumberHolder): boolean {
    return (
      super.shouldApply(pokemon, moveType, movePower) &&
      typeof moveType === "number" &&
      movePower instanceof NumberHolder
    );
  }

  override getMaxHeldItemCount(pokemon: Pokemon): number {
    return 1;
  }
}

export class MaxMultiHitModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  matchType(modifier: Modifier) {
    return modifier instanceof MaxMultiHitModifier;
  }

  clone() {
    return new MaxMultiHitModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * 다단히트 기술의 공격 횟수를 최대치로 설정
   * @param pokemon 공격하는 포켓몬
   * @param move 사용된 기술
   * @param hitCount 기본 공격 횟수
   * @returns 속임수주사위 효과가 적용되면 최대 횟수(5), 아니면 기존 값 유지
   */
  applyMultiHit(pokemon: Pokemon, move: Move, hitCount: number): number {
    console.log("[DEBUG] MaxMultiHitModifier 적용됨", { moveId: move.id, originalHitCount: hitCount });

    // 속임수주사위가 적용된 포켓몬이 MultiHitAttr을 가진 경우, 최대 히트 수로 설정
    const multiHitAttr = move.getAttrs(MultiHitAttr)[0];
    if (pokemon.id === this.pokemonId && multiHitAttr) {
      return multiHitAttr.getMaxHitCount(); // 5회 공격 보장
    }

    return hitCount;
  }

  override apply(pokemon: Pokemon): boolean {
    let multiHitBoosted = false;

    if (pokemon.id === this.pokemonId) {
      multiHitBoosted = true;
    }

    return multiHitBoosted;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1; // 한 포켓몬에 하나만 적용
  }
}

/**
 * Modifier used for held items that boost special attack when using a sound-based move.
 * Triggers after using a sound-based move, increasing special attack by 1 stage.
 * @extends PokemonHeldItemModifier
 */
export class SoundBasedMoveSpecialAttackBoostModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount = 1) {
    super(type, pokemonId);
    this.stackCount = stackCount;
  }

  /**
   * Checks if the modifier matches another modifier of the same type and stack count.
   * @param modifier The modifier to compare
   * @returns `true` if modifiers are of the same type and stack count, `false` otherwise
   */
  matchType(modifier: Modifier): boolean {
    return modifier instanceof SoundBasedMoveSpecialAttackBoostModifier;
  }

  /**
   * Clones the modifier.
   * @returns A new instance of SoundBasedMoveSpecialAttackBoostModifier
   */
  clone(): SoundBasedMoveSpecialAttackBoostModifier {
    return new SoundBasedMoveSpecialAttackBoostModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Checks if the modifier can be applied to the given Pokémon.
   * @param pokemon The Pokémon to check
   * @returns `true` if the modifier can be applied, `false` otherwise
   */
  canApply(pokemon: Pokemon): boolean {
    if (!pokemon.currentMove) {
      return false;
    }

    if (!pokemon.currentMove.hasFlag(MoveFlags.SOUND_BASED)) {
      console.debug("[DEBUG] 소리 기반 기술이 아닙니다.");
      return false;
    }

    // 🔽 이 줄을 이렇게 바꿔야 함!
    const hasExistingModifier = pokemon.getHeldItems(SoundBasedMoveSpecialAttackBoostModifier);

    return hasExistingModifier; // 갖고 있어야만 발동됨
  }

  /**
   * Applies the effect of Throat Spray when a sound-based move is used.
   * Increases the special attack by 1 stage.
   * @param pokemon The Pokémon using the move
   * @param moveType The type of the move being used
   * @param movePower The power of the move
   * @returns `true` if the effect was applied, `false` otherwise
   */
  override apply(pokemon: Pokemon, moveType: Type, movePower: NumberHolder): boolean {
    if (!this.canApply(pokemon)) {
      return false;
    }

    // 특수공격 상승 효과 적용
    globalScene.phaseManager.unshiftNew(
  "StatStageChangePhase",
  pokemon.getBattlerIndex(),
  true,              // 아군/적 여부
  [Stat.SPATK],      // 스탯 배열
  1,                 // 단계 수 (+1)
  true,              // 메시지 표시 여부
);

    // preserve 적용 - 아이템이 소모되지 않도록 할 수 있는지 체크
const preserve = new BooleanHolder(false);
globalScene.applyModifiers(PreserveItemModifier, pokemon.isPlayer(), pokemon, preserve, "item");

// preserve가 false일 경우만 아이템을 소모
if (!preserve.value) {
  // ✅ 실제 소모 확정 → 리사이클 기록
  recordRecycleSnapshot(pokemon, this, { args: [] });

  if (this.stackCount > 1) {
    this.stackCount--;
  } else {
    globalScene.removeModifier(this);
  }
}

    return true;
  }

  /**
   * Returns the maximum number of this item that can be held by a Pokémon.
   * @param pokemon The Pokémon holding the item
   * @returns The maximum number of items that can be held
   */
  getMaxHeldItemCount(pokemon: Pokemon): number {
    return 6; // 최대 6개까지 장착 가능
  }

  /**
   * Returns the current stack count of this modifier.
   * @returns The stack count
   */
  getStackCount(): number {
    return this.stackCount;
  }
}

export class AlwaysMoveLastModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  matchType(modifier: Modifier) {
    return modifier instanceof AlwaysMoveLastModifier;
  }

  clone() {
    return new AlwaysMoveLastModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Forces the holder to always move last
   * @param pokemon the {@linkcode Pokemon} that holds the item
   * @param doBypassSpeed {@linkcode BooleanHolder} that determines if speed should be ignored
   * @returns `true` if {@linkcode AlwaysMoveLastModifier} has been applied
   */
 override apply(pokemon: Pokemon, alwaysLast: BooleanHolder): boolean {
  alwaysLast.value = true;
  return true;
}

  getMaxHeldItemCount(pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * Modifies item effects to ignore weather effects on the Pokémon.
 * @extends PokemonHeldItemModifier
 */
export class IgnoreWeatherEffectsItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  matchType(modifier: Modifier) {
    return modifier instanceof IgnoreWeatherEffectsItemModifier;
  }

  /**
   * Deep copy (clone) of the modifier instance.
   * @returns A new instance of IgnoreWeatherEffectsItemModifier.
   */
  override clone() {
    return new IgnoreWeatherEffectsItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Applies the modification to ignore weather effects for the held item.
   * @param pokemon The Pokémon that is holding the item.
   * @param weather The current weather condition.
   * @param cancelled A BooleanHolder to determine if the effect should be cancelled.
   */
  applyWeatherEffect(pokemon: Pokemon, weather: Weather, cancelled: Utils.BooleanHolder): void {
    cancelled.value = true; // Cancel any weather effect for this Pokémon
  }

  /**
   * Determines whether the modifier applies to the given scenario.
   * @param pokemon The Pokémon whose item is being evaluated.
   * @param weather The current weather condition.
   * @returns True if the modifier can be applied.
   */
  canApplyWeatherEffect(pokemon: Pokemon, weather: Weather): boolean {
    // Check if this item should be applied based on whether weather is present
    return !!weather; // Apply if there is a weather condition
  }

  /**
   * Determines whether the modifier should apply based on the Pokémon and the weather.
   * @param pokemon The Pokémon whose item is being evaluated.
   * @param weather The current weather condition.
   * @returns True if the modifier should apply.
   */
  override shouldApply(pokemon?: Pokemon, weather?: Weather): boolean {
    if (!pokemon || !weather) { return false; }
    return this.pokemonId === pokemon.id;
  }

  /**
   * Gets the maximum number of items this modifier can be applied to.
   * @param pokemon The Pokémon using the item.
   * @returns Maximum number of items allowed.
   */
  override getMaxHeldItemCount(pokemon: Pokemon): number {
    return 1; // Only one item modifier can be applied to a Pokémon
  }
}

/**
 * Modifier used for held items, namely Light Clay, that extend the duration
 * of Reflect, Light Screen, and Aurora Veil effects.
 * @extends PokemonHeldItemModifier
 * @see {@linkcode apply}
 */
export class WeakenMoveScreenModifier extends PokemonHeldItemModifier {
  /**
   * Extends the duration of specific protective screen effects by 2 turns.
   * @param pokemon {@linkcode Pokemon} that holds the held item
   * @param screenDuration {@linkcode NumberHolder} that stores the current screen effect duration
   * @param tagType {@linkcode ArenaTagType} of the effect being modified
   * @returns `true` if the screen duration extension was applied successfully
   */
  override apply(_pokemon: Pokemon, screenDuration: NumberHolder, tagType: ArenaTagType): boolean {
    // ArenaTagType을 정확하게 비교해야 함
    if (
      tagType === ArenaTagType.REFLECT ||
      tagType === ArenaTagType.LIGHT_SCREEN ||
      tagType === ArenaTagType.AURORA_VEIL
    ) {
      screenDuration.value += 2; // 빛의점토 효과로 2턴 연장
      return true;
    }
    return false;
  }

  override matchType(modifier: Modifier): boolean {
    return modifier instanceof WeakenMoveScreenModifier;
  }

  override clone(): WeakenMoveScreenModifier {
    return new WeakenMoveScreenModifier(this.type, this.pokemonId, this.stackCount);
  }

  override getMaxHeldItemCount(_pokemon?: Pokemon): number {
    return 2; // 최대 2개까지 소지 가능
  }
}

export class BoostEnergyModifier extends PokemonHeldItemModifier {
  private boostedStats: { statList: BattleStat[]; multiplier: number }[] = [];

  constructor(type: string, pokemonId: number, stackCount: number) {
    super(type, pokemonId, stackCount);
  }

  private areStatListsEqual(a: BattleStat[], b: BattleStat[]): boolean {
    if (a.length !== b.length) { return false; }
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }

  override apply(pokemon: Pokemon, ...args: any[]): boolean {
    const ability =
  pokemon.abilityId ??
  pokemon.getAbility?.()?.id;

    // Boost Energy로 발동 가능한 특성 목록
    const allowedAbilities = [
      AbilityId.PROTOSYNTHESIS,
      AbilityId.QUARK_DRIVE,
      AbilityId.PLUVIAFLUX,
      AbilityId.CRYOSYNTHESIS,
      AbilityId.PHYTONCIDE,
      AbilityId.PSAMMOSYNTHESIS,
      AbilityId.UNSEEN_FORCE,
      AbilityId.NEURO_CHARGE,
    ];

    if (!allowedAbilities.includes(ability)) {
      console.log(`[BoostEnergyModifier] ${pokemon.name}은 Boost Energy 대상 특성이 아님 (${ability}).`);
      return false;
    }

    const statList = args[0] as BattleStat[];
    const multiplier = args[1] as number;
    if (statList?.length === 0|| multiplier == null || multiplier <= 0) { return false; }

    for (const { statList: existingStatList } of this.boostedStats) {
      if (this.areStatListsEqual(existingStatList, statList)) { return false; }
    }

    this.boostedStats.push({ statList, multiplier });
console.log("[BOOST_ENERGY_ABILITY_CHECK]", {
  pokemon: pokemon.name,
  ability,
  rawAbilityId: pokemon.abilityId,
  getAbilityId: pokemon.getAbility?.()?.id,
  abilityName: pokemon.getAbility?.()?.name,
});
    // 특성별 태그 타입 결정
    let tagType: BattlerTagType;
    switch (ability) {
      case AbilityId.PROTOSYNTHESIS:
        tagType = BattlerTagType.PROTOSYNTHESIS;
        break;
      case AbilityId.QUARK_DRIVE:
        tagType = BattlerTagType.QUARK_DRIVE;
        break;
      case AbilityId.PLUVIAFLUX:
        tagType = BattlerTagType.PLUVIAFLUX;
        break;
      case AbilityId.CRYOSYNTHESIS:
        tagType = BattlerTagType.CRYOSYNTHESIS;
        break;
      case AbilityId.PHYTONCIDE:
        tagType = BattlerTagType.PHYTONCIDE;
        break;
      case AbilityId.PSAMMOSYNTHESIS:
        tagType = BattlerTagType.PSAMMOSYNTHESIS;
        break;
      case AbilityId.UNSEEN_FORCE:
        tagType = BattlerTagType.UNSEEN_FORCE;
        break;
      case AbilityId.NEURO_CHARGE:
        tagType = BattlerTagType.NEURO_CHARGE;
        break;
      default:
        tagType = BattlerTagType.HIGHEST_STAT_BOOST;
        break;
    }

    // 태그 부여
    new BoostEnergyTagAttr(tagType).apply({
  pokemon,
  simulated: false,
  passive: false,
});

return true;
  }

  override onTurnEnd(): void {
    const pokemon = this.getPokemon();
    if (!pokemon || this.boostedStats.length === 0) { return; }

    // 저장된 능력치 부스트 적용
    for (const { statList, multiplier } of this.boostedStats) {
      globalScene.phaseManager.unshiftNew(
        "StatStageChangePhase",
        pokemon.getBattlerIndex(),
        true,
        statList,
        multiplier,
        true,
        false,
        false,
      );
    }

    // 상태 초기화 (소모는 apply()에서 이미 처리됨)
    this.boostedStats = [];
  }

  override shouldApply(pokemon?: Pokemon, statList?: BattleStat[], multiplier?: number): boolean {
    return !!pokemon && statList?.length > 0 && (multiplier ?? 0) > 0;
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof BoostEnergyModifier;
  }

  clone() {
    return new BoostEnergyModifier(this.type, this.pokemonId, this.stackCount);
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 10;
  }
}

export class PowerUpDiskModifier extends PokemonHeldItemModifier {
  constructor(type: string, pokemonId: number, stackCount: number) {
    super(type, pokemonId, stackCount);
  }

  override shouldApply(pokemon?: Pokemon, stat?: BattleStat, statVal?: NumberHolder): boolean {
    return !!pokemon && stat != null && !!statVal;
  }

  override apply(pokemon: Pokemon, ...args: any[]): boolean {
  const stat = args[0] as BattleStat;
  const statVal = args[1] as NumberHolder;

  if (!this.shouldApply(pokemon, stat, statVal)) { return false; }

  const ability = pokemon.abilityId;

  // ✅ 특성별 추가 스탯/배율 결정 (abilityId 직접 참조 X)
let extraStat: BattleStat | null = null;
let mult = 1;

if (pokemon.hasAbility(AbilityId.AQUA_HEART, false, true) || pokemon.hasAbility(AbilityId.BIO_PULSE, false, true)) {
  extraStat = Stat.SPATK;
  mult = 4 / 3;
} else if (
  pokemon.hasAbility(AbilityId.TUNDRA_SPIRIT, false, true) ||
  pokemon.hasAbility(AbilityId.NATURAL_SOUL, false, true) ||
  pokemon.hasAbility(AbilityId.MIRACLE_FOG, false, true) ||
  pokemon.hasAbility(AbilityId.ORICHALCUM_PULSE, false, true) ||
  pokemon.hasAbility(AbilityId.HADRON_ENGINE, false, true)
) {
  extraStat = Stat.SPD;
  mult = 3 / 2;
} else if (pokemon.hasAbility(AbilityId.DESERT_MIRACLE, false, true)) {
  extraStat = Stat.ATK;
  mult = 4 / 3;
} else {
  return false;
}

if (stat !== extraStat) { return false; }
statVal.value *= mult;
return true;
}

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof PowerUpDiskModifier;
  }

  clone() {
    return new PowerUpDiskModifier(this.type, this.pokemonId, this.stackCount);
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class VictoryBadgeModifier extends PokemonHeldItemModifier {
  constructor(type: string, pokemonId: number, stackCount: number) {
    super(type, pokemonId, stackCount);
  }

  override apply(pokemon: Pokemon, ...args: any[]): boolean {
  const statVal = args[0] as NumberHolder | undefined;

  if (!statVal) { return false; }

  const before = statVal.value;
  statVal.value *= (1.6 / 1.3);

  return true;
}

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof VictoryBadgeModifier;
  }

  clone() {
    return new VictoryBadgeModifier(this.type, this.pokemonId, this.stackCount);
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class BeastBoostStartStatBoostModifier extends PokemonHeldItemModifier {
  private stages: number;
  private usedThisBattle = false; // ✅ 보존(Prevent consume)되더라도 "전투 1회"만 발동

  constructor(type: ModifierType, pokemonId: number, stages = 1, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.stages = stages;
  }

  clone(): BeastBoostStartStatBoostModifier {
    const m = new BeastBoostStartStatBoostModifier(this.type, this.pokemonId, this.stages, this.stackCount);
    m.usedThisBattle = this.usedThisBattle;
    return m;
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.stages);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof BeastBoostStartStatBoostModifier && modifier.stages === this.stages;
  }

  override shouldApply(pokemon: Pokemon, stages = this.stages): boolean {
  console.log("[BB_START] check", {
  name: pokemon.name,
  abilityId: pokemon.abilityId,
  hasBeastBoost: pokemon.hasAbility(AbilityId.BEAST_BOOST, false, true),
  usedThisBattle: this.usedThisBattle,
});
  if (!pokemon) { return false; }
  if (this.usedThisBattle) { return false; }

  // ✅ 패시브 포함 체크
  if (!pokemon.hasAbility(AbilityId.BEAST_BOOST, false, true)) { return false; }

  return super.shouldApply(pokemon, stages);
}

override apply(pokemon: Pokemon, ...args: any[]): boolean {
  // ✅ stages 파싱 안전화
  const raw = args?.[0] ?? this.stages;
  const stages = Array.isArray(raw) ? raw[0] : raw;
  if (typeof stages !== "number" || stages <= 0) { return false; }

  if (!this.shouldApply(pokemon, stages)) { return false; }

    const statToBoost = getHighestBeastBoostStat(pokemon);
    if (statToBoost == null) { return false; }

    const currentStage = pokemon.getStatStage(statToBoost);
    if (currentStage >= 6) {
      this.usedThisBattle = true; // “사용 시도”로 처리할지 여부는 취향인데, 보통은 true 권장
      return false;
    }

    // ✅ 1) 즉시 랭크 상승 연출 (등장 직후처럼 보이게 unshift)
    globalScene.phaseManager.unshiftNew(
      "StatStageChangePhase",
      pokemon.getBattlerIndex(),
      true,
      [statToBoost],
      stages,
    );

    // ✅ 2) "전투 1회" 플래그
    this.usedThisBattle = true;

    // ✅ 3) PreserveItemModifier 체크 후 소모 처리
    const preserve = new BooleanHolder(false);
    globalScene.applyModifiers(PreserveItemModifier, pokemon.isPlayer(), pokemon, preserve, "item");

    if (!preserve.value) {
      // 리사이클 기록
      recordRecycleSnapshot(pokemon, this, { args: [] });

      // 메시지 (원하는 키로 바꿔도 됨)
      globalScene.phaseManager.queueMessage(
        i18next.t("modifier:ultraEnergyItemUsed", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          itemName: "Beast Boost Energy", // <- 네 아이템 이름으로
        }),
      );

      if (this.stackCount > 1) { this.stackCount--; }
      else { globalScene.removeModifier(this); }
    }

    return true;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 10;
  }
}

// ============================================================
// 검은갈기 / 하얀갈기 (버드렉스 Ice/Shadow 폼 전용템)
// 1) 등장(전투 1회): 혼연일체로 오를 스탯(백마 ATK / 흑마 SPATK) 미리 +stages
// 2) 상대 처치 시: 같은 스탯 추가 +stages
// 3) 상대는 지닌 도구를 사용할 수 없다: HeldItemBypassAbAttr로 “상대 도구 발동” 취소
//    ※ 도구 발동부에서 HeldItemBypassAbAttr 체크를 “상대 필드”까지 보도록 연결 필요(아래 하단 패치 참고)
// ============================================================

export class CalyrexReinsUnifiedModifier extends PokemonHeldItemModifier {
  private stages: number;
  private usedThisBattle = false; // ✅ 등장 선버프(전투 1회)

  constructor(type: ModifierType, pokemonId: number, stages = 1, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.stages = stages;
  }

  clone(): CalyrexReinsUnifiedModifier {
    const m = new CalyrexReinsUnifiedModifier(this.type, this.pokemonId, this.stages, this.stackCount);
    m.usedThisBattle = this.usedThisBattle;
    return m;
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.stages);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof CalyrexReinsUnifiedModifier && modifier.stages === this.stages;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }

  // ------------------------------------------------------------
  // (공통) 올릴 스탯 결정: 폼키(ice/shadow) 우선, 없으면 능력으로 폴백
  // ------------------------------------------------------------
  private getReinsTargetStat(pokemon: Pokemon): Stat | null {
    // 1) 폼키 기반 (네 데이터: "ice" / "shadow")
    const formKey =
      (pokemon as any).formKey ??
      (pokemon as any).form?.formKey ??
      (pokemon as any).species?.formKey ??
      (pokemon as any).species?.form?.formKey ??
      (pokemon as any).form?.variant ??
      null;

    if (formKey === "ice") { return Stat.ATK; }
    if (formKey === "shadow") { return Stat.SPATK; }

    // 2) 폴백: As One 능력 기반
    if (pokemon.hasAbility?.(AbilityId.AS_ONE_GLASTRIER, false, true)) { return Stat.ATK; }
    if (pokemon.hasAbility?.(AbilityId.AS_ONE_SPECTRIER, false, true)) { return Stat.SPATK; }

    return null;
  }

  private isValidForm(pokemon: Pokemon): boolean {
    const st = this.getReinsTargetStat(pokemon);
    return st != null;
  }

  // ------------------------------------------------------------
  // (1) 등장 선버프: 전투 1회 (BeastBoostStartStatBoostModifier 패턴)
  // ------------------------------------------------------------
  private hasActivatedThisSummon(pokemon: Pokemon): boolean {
  const sd: any = (pokemon as any).summonData;
  const typeKey = (this.type as any)?.id ?? this.type;
  return !!sd?.reinsPostSummonUsed?.[typeKey];
}

private setActivatedThisSummon(pokemon: Pokemon): void {
  const sd: any = (pokemon as any).summonData ??= {};
  sd.reinsPostSummonUsed ??= {};
  const typeKey = (this.type as any)?.id ?? this.type;
  sd.reinsPostSummonUsed[typeKey] = true;
}

applyPostSummon(pokemon: Pokemon, simulated: boolean): void {
  if (simulated) { return; }
  if (!pokemon) { return; }
  if (!this.isValidForm(pokemon)) { return; }

  // ✅ 이번 소환 1회 (교체 후 재등장하면 summonData가 리셋되어 다시 발동)
  if (this.hasActivatedThisSummon(pokemon)) { return; }
  this.setActivatedThisSummon(pokemon);

  const stages = this.stages;
  if (typeof stages !== "number" || stages <= 0) { return; }

  const statToBoost = this.getReinsTargetStat(pokemon);
  if (statToBoost == null) { return; }

  if (pokemon.getStatStage(statToBoost) >= 6) { return; }

  globalScene.phaseManager.unshiftNew(
    "StatStageChangePhase",
    pokemon.getBattlerIndex(),
    true,
    [statToBoost],
    stages,
  );
}

  // ✅ 변경 포인트: 처치(혼연일체 발동) 때
//   1) 기존(폼별 ATK/SPATK) +stages
//   2) 추가로 SPD +stages  (백마/흑마 공통)

applyPostVictory(attacker: Pokemon, _defender: Pokemon, _move: Move | undefined, simulated: boolean): void {
  if (simulated) { return; }
  if (!attacker) { return; }
  if (!this.isValidForm(attacker)) { return; }

  const stages = this.stages;
  if (typeof stages !== "number" || stages <= 0) { return; }

  const mainStat = this.getReinsTargetStat(attacker);
  if (mainStat == null) { return; }

  // ✅ 추가 스탯: 스피드(백마/흑마 공통)
  if (attacker.getStatStage(Stat.SPD) < 6) {
    globalScene.phaseManager.unshiftNew(
      "StatStageChangePhase",
      attacker.getBattlerIndex(),
      true,
      [Stat.SPD],
      stages,
    );
  }
}

  // ------------------------------------------------------------
  // (3) 상대 도구 봉인: HeldItemBypassAbAttr 제공
  //  - 상대의 도구 발동 루틴에서 이 Attr을 “적 필드(상대)”까지 포함해 체크하면
  //    cancelled=true가 되어 도구 발동이 전부 막힘
  // ------------------------------------------------------------
  getAbilityAttrs(attrId: string): AbAttr[] {
    if (attrId !== "HeldItemBypassAbAttr") { return []; }

    return [
      new HeldItemBypassAbAttr((_pokemonTryingToUseItem: Pokemon, _modifier?: Modifier) => {
        // 여기서는 “적이 도구를 발동하려고 할 때” true면 막음
        // 전용템이 착용되어 있는 한: 상대 도구 전면 봉인
        return true;
      }),
    ];
  }
}

/**
 * ✅ 앙쥬오브 (영원의꽃 플라엣테 전용)
 * - 소모 X (항상 패시브)
 * - 보유 최대 1개
 * - 앙쥬오라 배율: 4/3 → 5/3 증폭
 * - 오라브레이크 무시 판정용 헬퍼 제공
 */
export class AngeOrbeModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.stackCount = 1;
  }

  clone(): AngeOrbeModifier {
    return new AngeOrbeModifier(this.type, this.pokemonId, 1);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof AngeOrbeModifier;
  }

  private static isEternalFlowerFloette(p: Pokemon): boolean {
    return true; // 너 환경에 맞게 교체
  }

  /** ✅ 기본 4/3, 앙쥬오브 있으면 +30% (즉 4/3 * 1.3) */
  static hasAngeOrbe(owner: Pokemon): boolean {
  // 1) pokemon 내부 held modifiers
  const mods = owner.getHeldItemModifiers?.() ?? [];
  const byMethod = mods.some(m =>
    (m as any)?.type === ModifierType.ANGE_ORBE ||
    (m as any)?.typeId === ModifierType.ANGE_ORBE ||
    (m as any)?.modifierType === ModifierType.ANGE_ORBE ||
    m?.constructor?.name === "AngeOrbeModifier"
  );
  if (byMethod) { return true; }

  // 2) globalScene fallback
  const sceneMods = (globalScene.getModifiers?.(AngeOrbeModifier) ?? []) as any[];

  return sceneMods.some(m =>
    (
      m?.pokemonId === owner.id ||
      m?.pokemonId === owner.getPokemonId?.()   // ← 여기만 고치면 끝
    ) &&
    (m?.getStackCount?.() ?? m?.stackCount ?? 1) > 0
  );
}

static getAngelAuraMultiplier(owner: Pokemon): number {
  const hasOrbe = AngeOrbeModifier.hasAngeOrbe(owner);
  return hasOrbe ? 5 / 3 : 4 / 3;
}
  /** ✅ 앙쥬오브 들고 있는 개체가 필드에 있으면 오라브레이크 무시 */
  static shouldIgnoreAuraBreak(fieldMons: Pokemon[]): boolean {
    return fieldMons.some(p => {
      if (!AngeOrbeModifier.isEternalFlowerFloette(p)) { return false; }
      const mods = p.getHeldItemModifiers?.() ?? [];
      return mods.some(m => m instanceof AngeOrbeModifier);
    });
  }

  override apply({ pokemon: source, auraOwner, simulated, power }: any): void {
  const realOwner = auraOwner ?? source; // ✅ 오라 제공자 우선
  const mult = this.multFn(realOwner);
  power.value *= mult;

  if (!simulated) {
    console.log("[ANGE_AURA_DYNAMIC_APPLY]", realOwner.name, "mult=", mult);
  }
}

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }

  static hasOnField(): boolean {
    return globalScene.getField(true).some(p => {
      const mods = p.getHeldItemModifiers?.() ?? [];
      return mods.some(m => m instanceof AngeOrbeModifier);
    });
  }
}

// ✅ 저주받은 시리즈(재앙 특성 강화) 아이템
export class CursedRuinModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.stackCount = 1;
  }

  clone(): CursedRuinModifier {
    return new CursedRuinModifier(this.type, this.pokemonId, 1);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof CursedRuinModifier;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }

  private static isRuinAbilityOwner(p: Pokemon): boolean {
  return !!(
    p?.hasAbility?.(AbilityId.SWORD_OF_RUIN, false, true) ||
    p?.hasAbility?.(AbilityId.BEADS_OF_RUIN, false, true) ||
    p?.hasAbility?.(AbilityId.TABLETS_OF_RUIN, false, true) ||
    p?.hasAbility?.(AbilityId.VESSEL_OF_RUIN, false, true)
  );
}

  static hasCursedRuin(owner: Pokemon): boolean {
    const mods = owner.getHeldItemModifiers?.() ?? [];
    const byMethod = mods.some(m =>
      (m as any)?.type === ModifierType.CURSED_RUIN ||
      (m as any)?.typeId === ModifierType.CURSED_RUIN ||
      (m as any)?.modifierType === ModifierType.CURSED_RUIN ||
      m?.constructor?.name === "CursedRuinModifier"
    );
    if (byMethod) { return true; }

    const sceneMods = (globalScene.getModifiers?.(CursedRuinModifier) ?? []) as any[];
    return sceneMods.some(m =>
      (
        m?.pokemonId === owner.id ||
        m?.pokemonId === owner.getPokemonId?.()
      ) &&
      (m?.getStackCount?.() ?? m?.stackCount ?? 1) > 0
    );
  }

  static amplifyRuinMultiplier(baseMult: number): number {
    const doubledReduction = 1 - (1 - baseMult) * 2; // 0.75 -> 0.50
    return Math.max(0.1, Math.min(1.0, doubledReduction));
  }

  static getEffectiveRuinMultiplier(ruinOwner: Pokemon, baseMult: number): number {
    if (!ruinOwner) { return baseMult; }
    if (!CursedRuinModifier.isRuinAbilityOwner(ruinOwner)) { return baseMult; }

    return CursedRuinModifier.hasCursedRuin(ruinOwner)
      ? CursedRuinModifier.amplifyRuinMultiplier(baseMult)
      : baseMult;
  }

  static hasBoostedRuinOnField(): boolean {
    return globalScene.getField(true).some(p => {
      if (!CursedRuinModifier.isRuinAbilityOwner(p)) { return false; }
      const mods = p.getHeldItemModifiers?.() ?? [];
      return mods.some(m => m instanceof CursedRuinModifier);
    });
  }
}

/**
 * 비스트부스트용 "가장 높은 스탯" 선택
 * - HP 제외
 * - 공/방/특공/특방/스핏만 비교
 */
function getHighestBeastBoostStat(pokemon: Pokemon): BattleStat | null {
  const candidates: BattleStat[] = [
    Stat.ATK,
    Stat.DEF,
    Stat.SPATK,
    Stat.SPDEF,
    Stat.SPD,
  ];

  let best: BattleStat | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (const s of candidates) {
    const v = pokemon.getStat(s as any, false); // 네 프로젝트 시그니처에 맞게 (simulate/ignore?) 조정
    if (v > bestValue) {
      bestValue = v;
      best = s;
    }
  }

  return best;
}

export class PreserveItemModifier extends PersistentModifier {
  match(modifier: Modifier) {
    return modifier instanceof PreserveItemModifier;
  }

  clone() {
    return new PreserveItemModifier(this.type, this.stackCount);
  }

  override shouldApply(pokemon?: Pokemon, doPreserve?: BooleanHolder, itemType?: string): boolean {
    // 열매면 적용하지 않음
    return !!pokemon && !!doPreserve && itemType !== "berry";
  }

  override apply(pokemon: Pokemon, doPreserve: BooleanHolder, itemType?: string): boolean {
    // 열매면 무조건 소모되게 처리
    if (itemType === "berry") { return true; }

    // Preserve logic: 30%/60%/90% based on stack count
    if (!doPreserve.value) {
      const chance = this.getStackCount() * 30;
      doPreserve.value = pokemon.randBattleSeedInt(100) < chance;
    }

    return true;
  }

  getMaxStackCount(): number {
    return 3;
  }
}

export class StatStageChangeCopyModifier extends PokemonHeldItemModifier {
  private copiedStats: { statList: BattleStat[]; stage: number }[] = []; // 복사된 능력치 저장
  private applied = false; // ✅ 중복 방지용 플래그

  override apply(pokemon: Pokemon, ...args: any[]): boolean {
    const statList = args[0] as BattleStat[];
    const stage = args[1] as number;

    // 능력치 리스트가 비어있거나 스테이지가 0 이하인 경우 처리 안함
    if (statList?.length === 0|| stage == null || stage <= 0) {
      return false;
    }

    // 중복된 능력치가 복사되지 않도록 체크 (복사된 능력치 중복 방지)
    for (const { statList: existingStatList, stage: existingStage } of this.copiedStats) {
      if (existingStatList === statList && existingStage === stage) {
        return false; // 이미 복사된 능력치라면 중복 적용 방지
      }
    }

    // 중복을 방지하고 능력치 누적
    this.copiedStats.push({ statList, stage });

    const preserve = new BooleanHolder(false);
globalScene.applyModifiers(PreserveItemModifier, pokemon.isPlayer(), pokemon, preserve, "item");

// 능력치를 적용 (이건 preserve와 무관하게 실행되는 게 자연스러움)
globalScene.phaseManager.unshiftNew(
  "StatStageChangePhase",
  pokemon.getBattlerIndex(),
  true,
  statList,
  stage,
  true,
  false,
  false,
);

if (!preserve.value) {
  // ✅ 보존 실패 → 실제 소모될 때만 리사이클 기록
  recordRecycleSnapshot(pokemon, this, { args: [] });

  if (this.stackCount > 1) {
    this.stackCount--;
  } else {
    globalScene.removeModifier(this);
  }
}

    return true; // 성공적으로 적용됨
  }

  override onTurnEnd(): void {
    const pokemon = this.getPokemon();
    if (!pokemon || this.copiedStats.length === 0) { return; }

    const preserve = new BooleanHolder(false);
globalScene.applyModifiers(PreserveItemModifier, pokemon.isPlayer(), pokemon, preserve, "item");

// 복사된 능력치를 한 번에 처리
for (const { statList, stage } of this.copiedStats) {
  globalScene.phaseManager.unshiftNew(
    "StatStageChangePhase",
    pokemon.getBattlerIndex(),
    true,
    statList,
    stage,
    true,
    false,
    false,
  );
}

// 아이템 소모 처리
if (!preserve.value) {
  // ✅ 보존 실패 → 실제 소모될 때만 리사이클 기록
  recordRecycleSnapshot(pokemon, this, { args: [] });

  if (this.stackCount > 1) {
    this.stackCount--;
  } else {
    globalScene.removeModifier(this);
  }
}

    // 복사된 능력치 초기화
    this.copiedStats = [];
  }

  override shouldApply(pokemon?: Pokemon, statList?: BattleStat[], stage?: number): boolean {
    return !!pokemon && statList?.length > 0 && (stage ?? 0) > 0;
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof StatStageChangeCopyModifier;
  }

  clone() {
    return new StatStageChangeCopyModifier(this.type, this.pokemonId, this.stackCount);
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 10;
  }
}

export class PostBattleLootItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): PostBattleLootItemModifier {
    return new PostBattleLootItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof PostBattleLootItemModifier;
  }

  // 배열에서 랜덤 아이템 가져오기 
  private getRandomItemFromArray<T>(arr: T[]): T | null {
    if (!arr || arr.length === 0) { return null;  }
    const index = Math.floor(Math.random() * arr.length); 
    return arr[index]; 
  }

  override applyPostBattle(pokemon: Pokemon, passive: boolean, simulated: boolean, args: any[]): void {
    const postBattleLoot = globalScene.currentBattle.postBattleLoot;
    const randItem = this.getRandomItemFromArray(postBattleLoot);

    if (!randItem) { return; }

    const success = globalScene.tryTransferHeldItemModifier(randItem, pokemon, true, 1, true, undefined, false);

    if (success) {
      postBattleLoot.splice(postBattleLoot.indexOf(randItem), 1);
      globalScene.phaseManager.queueMessage(
        i18next.t("modifier:treasureBagLoot", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          itemName: randItem.type.name,
        }),
      );
    }
  }

  override hasPostBattleEffect(): boolean {
    return true;
  }

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1; // ✅ 무조건 1개만
  }

  applyPostBattleIfPossible(pokemon: Pokemon, didWin: boolean): void {
    const postBattleLoot = globalScene.currentBattle.postBattleLoot;
    const simulated = false;

    if (!didWin || postBattleLoot.length === 0) {
      return;
    }

    let canTransfer = false;
    for (const item of postBattleLoot) {
      if (globalScene.canTransferHeldItemModifier(item, pokemon, 1)) { canTransfer = true; }
    }

    if (canTransfer) {
      this.applyPostBattle(pokemon, false, simulated, [didWin]);
    }
  }
}

export class TypeImmunityModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId);
    this.stackCount = 1; // 풍선은 최대 1개만 소지 가능
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof TypeImmunityModifier;
  }

  clone() {
    return new TypeImmunityModifier(this.type, this.pokemonId);
  }

  /**
   * 배틀 시작 시: 풍선이 있다면 FLOATING 태그 부여 및 메시지 출력
   */
  onBattleStart(playerPokemon: PlayerPokemon): void {
    const heldItem = playerPokemon.getHeldItem();

    if (heldItem?.name === "Air Balloon") {
      playerPokemon.addTag(BattlerTagType.FLOATING); // 부유 상태 부여
      globalScene.phaseManager.queueMessage(
        i18next.t("modifier:airBalloonActivated", {
          pokemonNameWithAffix: getPokemonNameWithAffix(playerPokemon),
        }),
      );
    }
  }

  /**
   * 피해를 입기 전: 풍선의 효과 적용
   */
  applyPreDefend(
    playerPokemon: PlayerPokemon,
    passive: boolean,
    simulated: boolean,
    attacker: Pokemon,
    move: Move,
    cancelled: Utils.BooleanHolder,
    args: any[],
  ): boolean {
    const heldItem = playerPokemon.getHeldItem();
    if (!heldItem || heldItem.name !== "Air Balloon") {
      return false;
    }

    // ① 땅타입 기술 무효화 (단, 사우전드애로우는 무효화 불가)
    if (
      move.type === PokemonType.GROUND &&
      move.category !== MoveCategory.STATUS &&
      !move.hasAttr(NeutralDamageAgainstFlyingTypeMultiplierAttr)
    ) {
      cancelled.value = true; // 피해 무효화
      return true;
    }

    // ② 땅 타입이 아닌 공격 기술을 맞은 경우 → 풍선 소모 처리
    if (
      move.type !== PokemonType.GROUND &&
      move.category !== MoveCategory.STATUS &&
      move.hasAttr(NeutralDamageAgainstFlyingTypeMultiplierAttr)
    ) {
      const preserve = new BooleanHolder(false);
globalScene.applyModifiers(PreserveItemModifier, playerPokemon.isPlayer(), playerPokemon, preserve, "item");

if (!preserve.value) {
  // ✅ 풍선이 실제로 터져서 사라질 때만 리사이클 기록
  // heldItem이 Modifier라면:
  recordRecycleSnapshot(playerPokemon, heldItem, { args: [] });

  this.loseHeldItem(heldItem); // 풍선 제거
  globalScene.updateModifiers(playerPokemon); // 모디파이어 업데이트
  playerPokemon.removeTag(BattlerTagType.FLOATING); // 부유 상태 제거

  globalScene.phaseManager.queueMessage(
    i18next.t("modifier:balloonPopped", {
      pokemonNameWithAffix: getPokemonNameWithAffix(playerPokemon),
      itemName: heldItem.name,
    }),
  );
}
    }

    return false;
  }

  getMaxHeldItemCount(playerPokemon: PlayerPokemon): number {
    return 1;
  }

  /**
   * apply 시에도 FLOATING 태그를 부여하여 안정성 확보
   */
  apply(pokemon: Pokemon): boolean {
    if (pokemon.id !== this.pokemonId) { return false; }

    pokemon.addTag(BattlerTagType.FLOATING);
    return true;
  }
}

export class MentalHerbModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount = 1) {
    super(type, pokemonId, stackCount);
  }

  clone(): MentalHerbModifier {
    return new MentalHerbModifier(this.type, this.pokemonId, this.stackCount);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof MentalHerbModifier;
  }

  getStackCount(): number {
    return this.stackCount;
  }

  /**
   * 턴 시작 시, 이미 걸려 있는 특정 상태를 1회 해제합니다. (보존 가능성 반영)
   */
  apply(pokemon: Pokemon): boolean {
    if (pokemon.id !== this.pokemonId) { return false; }

    const removableTags: BattlerTagType[] = [
      BattlerTagType.TAUNT,
      BattlerTagType.TORMENT,
      BattlerTagType.ENCORE,
      BattlerTagType.INFATUATED,
      BattlerTagType.HEAL_BLOCK,
      BattlerTagType.DISABLED,
      BattlerTagType.PERISH_SONG,
    ];

    let tagRemoved = false;

    for (const tag of removableTags) {
      if (pokemon.getTag(tag)) {
        pokemon.removeTag(tag); // 실제로 제거
        tagRemoved = true;

        globalScene.phaseManager.queueMessage(
          i18next.t("modifier:itemMentalHerbTauntRemoved", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            typeName: this.type.name,
          }),
        );
      }
    }

    if (tagRemoved) {
      const preserve = new BooleanHolder(false);
globalScene.applyModifiers(PreserveItemModifier, pokemon.isPlayer(), pokemon, preserve, "item");

if (!preserve.value) {
  // ✅ 실제 소모 확정 → 리사이클 기록
  recordRecycleSnapshot(pokemon, this, { args: [] });

  if (this.stackCount > 1) {
    this.stackCount--;
  } else {
    pokemon.loseHeldItem(this);
  }
}

globalScene.updateModifiers(pokemon.isPlayer());
pokemon.updateInfo();
    }

    return tagRemoved; // 상태 제거가 있었는지 여부를 반환
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 10; // 멘탈허브는 최대 10개까지 들 수 있음 (이 부분은 수정할 필요가 있을 수 있습니다)
  }
}

export class InstantChargeItemModifier extends PokemonHeldItemModifier {
  override apply(pokemon: Pokemon): boolean {
    const move = pokemon.currentMove;

    if (!move || !(move instanceof ChargingMove)) { return false; }

    // 이미 충전 효과가 적용되었으면 다시 적용하지 않음
    if (move.hasChargeAttr(InstantChargeAttr)) { return false; }

    // 아이템 효과 적용 (즉시 충전)
    move.chargeAttr = new InstantChargeAttr(() => true);

    // 아이템 보존 여부 확인
    const preserve = new BooleanHolder(false);
globalScene.applyModifiers(PreserveItemModifier, pokemon.isPlayer(), pokemon, preserve, "item");

// ✅ 효과 발동 메시지는 항상
globalScene.phaseManager.queueMessage(
  i18next.t("modifier:instantChargeItemUsed", {
    pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
    itemName: "Powerful Herb",
  }),
);

if (!preserve.value) {
  // ✅ 실제 소모 확정 → 리사이클 기록
  recordRecycleSnapshot(pokemon, this, { args: [] });

  if (this.stackCount > 1) {
    this.stackCount--;
  } else {
    globalScene.removeModifier(this);
  }
}

    return true;
  }

  override shouldApply(pokemon?: Pokemon): boolean {
    if (!pokemon) {
      console.log("No pokemon provided");
      return false;
    }

    const move = pokemon.currentMove;
    if (!move) {
      console.log("No current move set for this Pokemon.");
      return false;
    }

    console.log("Checking if current move is ChargingMove for pokemon: ", move);

    // move가 ChargingAttackMove 또는 ChargingSelfStatusMove일 경우에만 true
    return move instanceof ChargingMove;
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof InstantChargeItemModifier;
  }

  clone() {
    return new InstantChargeItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 10;
  }
}

/**
 * Modifier used for held items that increase critical-hit damage multiplier.
 * Applies only when a critical hit occurs.
 * @extends PokemonHeldItemModifier
 * @see {@linkcode apply}
 */
export class CritDamageBoostModifier extends PokemonHeldItemModifier {
  /** Multiplier applied to the critical-hit damage (e.g., 1.3 for 30% boost) */
  protected critMultiplier: number;

  constructor(type: ModifierType, pokemonId: number, critMultiplier: number, stackCount?: number) {
    super(type, pokemonId, stackCount);

    this.critMultiplier = critMultiplier;
  }

  clone() {
    return new CritDamageBoostModifier(this.type, this.pokemonId, this.critMultiplier, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.critMultiplier);
  }

  matchType(modifier: Modifier): boolean {
    if (modifier instanceof CritDamageBoostModifier) {
      return (modifier as CritDamageBoostModifier).critMultiplier === this.critMultiplier;
    }

    return false;
  }

  /**
   * Multiplies the critical-hit damage by {@linkcode critMultiplier} if a critical hit occurs.
   * @param _pokemon {@linkcode Pokemon} N/A
   * @param critDamageMult {@linkcode NumberHolder} that holds the resulting critical-hit damage multiplier
   * @returns `true` if the multiplier was applied
   */
  override apply(_pokemon: Pokemon, critDamageMult: NumberHolder): boolean {
    if (critDamageMult.value > 1) {
      critDamageMult.value *= this.critMultiplier;
      return true;
    }
    return false;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class NotEffectiveBoostModifier extends PokemonHeldItemModifier {
  private multiplier: number;

  constructor(type: ModifierType, pokemonId: number, multiplier: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.multiplier = multiplier;
  }

  clone() {
    return new NotEffectiveBoostModifier(this.type, this.pokemonId, this.multiplier, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.multiplier);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof NotEffectiveBoostModifier && modifier.multiplier === this.multiplier;
  }

  /**
   * 효과가 별로인 기술인지 판별하는 로직을 추가
   */
  override shouldApply(pokemon?: Pokemon, move?: Move, typeMultiplier?: number): boolean {
    return super.shouldApply(pokemon) && typeMultiplier < 1; // 효과가 별로인 경우에만 적용
  }

  /**
   * 기술 피해에 보너스 적용 (아이템 효과)
   */
  override apply(pokemon: Pokemon, attrList: PreAttackAbAttr[]): boolean {
    // `shouldApply`에서 `true`일 때만 이 코드가 실행될 것입니다.
    attrList.push(
      new DamageBoostAbAttr(this.multiplier, (user, target, move) => {
        return (target?.getMoveEffectiveness(user!, move) ?? 1) <= 0.5;
      }),
    );
    return true;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * Modifier used for held items that increase the power of moves with 60 or less power.
 * Applies only when the move power is 60 or less.
 * @extends PokemonHeldItemModifier
 * @see {@linkcode apply}
 */
export class MovePowerBoostItemModifier extends PokemonHeldItemModifier {
  /** Multiplier applied to the move's power (e.g., 1.5 for 50% boost) */
  protected powerMultiplier: number;

  constructor(type: ModifierType, pokemonId: number, powerMultiplier: number, stackCount?: number) {
    super(type, pokemonId, stackCount);

    this.powerMultiplier = powerMultiplier;
  }

  clone() {
    return new MovePowerBoostItemModifier(this.type, this.pokemonId, this.powerMultiplier, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.powerMultiplier);
  }

  matchType(modifier: Modifier): boolean {
    if (modifier instanceof MovePowerBoostItemModifier) {
      return (modifier as MovePowerBoostItemModifier).powerMultiplier === this.powerMultiplier;
    }

    return false;
  }

  /**
   * Multiplies the move power by {@linkcode powerMultiplier} if the move power is 60 or less.
   * @param _pokemon {@linkcode Pokemon} N/A
   * @param move {@linkcode Move} The move being used
   * @param power {@linkcode NumberHolder} that holds the resulting move power
   * @returns `true` if the multiplier was applied
   */
  override apply(_pokemon: Pokemon, move: Move, power: NumberHolder): boolean {
    // Check if the move's power is 60 or less
    if (move.power <= 60) {
      // Apply the power multiplier
      power.value *= this.powerMultiplier;
      return true;
    }
    return false;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1; // Only one item can be held at a time
  }
}

/**
 * Modifier used for held items that boost recoil move power and block recoil damage.
 * @extends PokemonHeldItemModifier
 * @see {@linkcode applyMovePower} and {@linkcode applyBlockRecoil}
 */
export class RecoilBoosterModifier extends PokemonHeldItemModifier {
  /** The multiplier applied to the recoil move's power */
  protected powerMultiplier: number;

  constructor(type: ModifierType, pokemonId: number, powerMultiplier: number, stackCount?: number) {
    super(type, pokemonId, stackCount);

    this.powerMultiplier = powerMultiplier;
  }

  clone(): RecoilBoosterModifier {
    return new RecoilBoosterModifier(this.type, this.pokemonId, this.powerMultiplier, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.powerMultiplier);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof RecoilBoosterModifier && modifier.powerMultiplier === this.powerMultiplier;
  }

  /**
   * Boosts the power of recoil moves.
   * @param _pokemon The Pokémon using the move
   * @param move The move being used
   * @param powerHolder A holder for the current power value
   * @returns true if applied
   */
  apply(_pokemon: Pokemon, damage: NumberHolder, move: Move): boolean {
    if (move.hasAttr(RecoilAttr)) {
      damage.value = Math.floor(damage.value * this.powerMultiplier);
    }
    return true;
  }

  /**
   * Cancels recoil damage if the move has recoil.
   * Called in RecoilAttr.apply() through applyItemAttrs.
   * @param _pokemon The Pokémon that would take recoil
   * @param _passive Unused
   * @param _simulated Unused
   * @param cancelled BooleanHolder that will be set to true to block recoil
   * @returns void
   */
  applyBlockRecoil(cancelled: Utils.BooleanHolder): void {
    cancelled.value = true;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class MoveAbilityBypassModifier extends PokemonHeldItemModifier {
  // 특정 조건에서만 특성을 무시하도록 커스텀 함수
  moveIgnoreFunc: (user: Pokemon, target: Pokemon, move: Move) => boolean;

  constructor(type: ModifierType, pokemonId: number, stackCount: number) {
    super(type, pokemonId, stackCount);
    // 기본값: 모든 공격에서 상대 특성을 무시
    this.moveIgnoreFunc = () => true;
  }

  /**
   * 공격 시 호출되는 apply
   * bypass.value를 true로 설정하면 상대 특성을 무시
   */
  override apply(user: Pokemon, target: Pokemon, move: Move, bypass: Utils.BooleanHolder): boolean {
  if (this.moveIgnoreFunc(user, target, move)) {
    bypass.value = true;
    return true;
  }
  return false;
}

  override matchType(modifier: Modifier): boolean {
    return modifier instanceof MoveAbilityBypassModifier;
  }

  override clone(): MoveAbilityBypassModifier {
    const clone = new MoveAbilityBypassModifier(this.type, this.pokemonId, this.stackCount);
    clone.moveIgnoreFunc = this.moveIgnoreFunc;
    return clone;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class VictoryStatBoostModifier extends PokemonHeldItemModifier {
  protected stages: number;

  constructor(type: ModifierType, pokemonId: number, stages: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.stages = stages;
  }

  clone(): VictoryStatBoostModifier {
    return new VictoryStatBoostModifier(this.type, this.pokemonId, this.stages, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.stages);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof VictoryStatBoostModifier && modifier.stages === this.stages;
  }

  /**
   * 이 Modifier가 적용 가능한지 판단하는 함수
   * applyModifier(...) 내에서 자동으로 호출됨
   */
  override shouldApply(pokemon: Pokemon, stages: number): boolean {
  console.log("[VictoryStatBoostModifier] shouldApply 호출됨", pokemon.name, stages);
  return super.shouldApply(pokemon, stages);
}

  /**
   * apply 메서드 정의
   * 이 메서드는 능력치 상승을 실제로 적용하는 메서드입니다.
   * @param pokemon 포켓몬
   * @param stages 능력치 상승 단계
   * @returns 성공 여부
   */
  apply(pokemon: Pokemon, stages: number): boolean {
  const statToBoost = this.getHighestEffectiveStat(pokemon);
  if (statToBoost === null) { return false; }

  const currentStage = pokemon.getStatStage(statToBoost);
  if (currentStage >= 6) { return false; }

  globalScene.phaseManager.unshiftNew(
    "StatStageChangePhase",
    pokemon.getBattlerIndex(),
    true,
    [statToBoost],
    stages
  );

  return true;
}

  /**
   * 능력치 중 가장 효율적인 능력치를 선택하는 헬퍼 함수
   * @param pokemon 포켓몬
   * @returns 가장 높은 효율적인 능력치
   */
  private getHighestEffectiveStat(pokemon: Pokemon): EffectiveStat | null {
    let highestStat: EffectiveStat | null = null;
    let highestValue = Number.NEGATIVE_INFINITY;

    for (const stat of EFFECTIVE_STATS) {
      const value = pokemon.getStat(stat, false);
      if (value > highestValue) {
        highestValue = value;
        highestStat = stat;
      }
    }

    return highestStat;
  }

  /**
   * 승리 후 능력치 변화 처리
   */
  applyPostVictory(attacker: Pokemon, _defender: Pokemon, _move: Move | undefined, simulated: boolean): void {
  if (simulated) { return; }

  const allies = attacker.isPlayer()
    ? (globalScene.getPlayerField().filter(p => p?.isActive()) as Pokemon[])
    : (globalScene.getEnemyField().filter(p => p?.isActive()) as Pokemon[]);

  for (const ally of allies) {
  if (!ally) { continue; }
  if (ally.id === attacker.id) { continue; // ✅ attacker 제외 (중복 방지)
}

  globalScene.applyModifiers(VictoryStatBoostModifier, attacker.isPlayer(), ally, this.stages);
  }
}

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class CategoryPowerBoostModifier extends PokemonHeldItemModifier {
  public readonly category: MoveCategory;     // PHYSICAL or SPECIAL
  public readonly multiplier: number;         // 예: 2.0

  constructor(
    type: ModifierType,
    pokemonId: number,
    category: MoveCategory,
    multiplier = 2.0,
    stackCount?: number
  ) {
    super(type, pokemonId, stackCount);
    this.category = category;
    this.multiplier = multiplier;
  }

  clone(): CategoryPowerBoostModifier {
    return new CategoryPowerBoostModifier(
      this.type,
      this.pokemonId,
      this.category,
      this.multiplier,
      this.stackCount
    );
  }

  getArgs(): any[] {
    return [this.pokemonId, this.category, this.multiplier, this.stackCount];
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof CategoryPowerBoostModifier
      && modifier.category === this.category
      && modifier.multiplier === this.multiplier;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * 상태이상일 때 가장 높은 능력치가 1.5배로 강화되는 아이템
 * (근성/열폭주/이상한비늘 유사 효과)
 */
export class StatusBoostItemModifier extends PokemonHeldItemModifier {
  private multiplier: number;
  
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.multiplier = 1.5;
  }

  clone(): StatusBoostItemModifier {
    return new StatusBoostItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof StatusBoostItemModifier;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }

 // ✅ WeakSet은 클래스 필드가 아닌, 안전한 정적 getter로 초기화
  private static _calculatingMap: WeakMap<typeof StatusBoostItemModifier, WeakSet<Pokemon>> = new WeakMap();

  private static get calculating(): WeakSet<Pokemon> {
    if (!StatusBoostItemModifier._calculatingMap.has(StatusBoostItemModifier)) {
      StatusBoostItemModifier._calculatingMap.set(StatusBoostItemModifier, new WeakSet<Pokemon>());
    }
    return StatusBoostItemModifier._calculatingMap.get(StatusBoostItemModifier)!;
  }

  private getHighestEffectiveStat(pokemon: Pokemon): Stat {
  const calculating = (StatusBoostItemModifier as any).calculating as WeakSet<Pokemon>;
  if (calculating.has(pokemon)) {
    console.debug(`[StatusBoostItemModifier] 재귀 감지: ${pokemon.name}, 무시`);
    return Stat.ATK;
  }

  calculating.add(pokemon);

  const stats: [Stat, number][] = PERMANENT_STATS.map(stat => [
    stat,
    pokemon.getEffectiveStat(stat, undefined, undefined, true, true, true, false, true),
  ]);

  calculating.delete(pokemon);

  stats.sort((a, b) => b[1] - a[1]);
  const highest = stats[0][0];
  console.debug(`[StatusBoostItemModifier] 최고 능력치 판정 완료: ${Stat[highest]}`);
  return highest;
}

  /**
   * 능력치 계산 중 호출되어 배율을 반영
   * (랭크 상승이 아닌 단순 배율 곱)
   */
  override apply(
  pokemon: Pokemon,
  simulated: boolean,
  stat: BattleStat,
  statVal: Utils.NumberHolder
): boolean {
if (pokemon.modifiers && Array.isArray(pokemon.modifiers)) {
  console.debug(`[TEST] ${pokemon.name} 모디파이어 목록:`, pokemon.modifiers.map(m => m.constructor.name));
} else {
  console.debug(`[TEST] ${pokemon.name} modifiers가 아직 초기화되지 않음`);
}
  console.debug(
    `[StatusBoostItemModifier] apply() 호출됨 - ${pokemon.name}, status=${StatusEffect[pokemon.status]}, simulated=${simulated}`
  );
  console.debug(`[StatusBoostItemModifier] 현재 상태: ${StatusEffect[pokemon.status]} (${pokemon.status})`);
  
  if (pokemon.status === StatusEffect.NONE) {
  console.debug("[StatusBoostItemModifier] 상태이상 아님, 적용 안됨");
  return false;
}

// 최고 능력치 계산
console.debug(`[StatusBoostItemModifier] status=${StatusEffect[pokemon.status]}, stat=${Stat[stat]}(${stat})`);
const highestStat = this.getHighestEffectiveStat(pokemon);
console.debug(`[StatusBoostItemModifier] highestStat=${highestStat} (${highestStat !== null ? Stat[highestStat] : "null"})`);

console.debug(`[StatusBoostItemModifier] 최고 능력치=${Stat[highestStat]}, 비교 stat=${Stat[stat]}`);
console.debug(`[StatusBoostItemModifier] highestStat=${highestStat}, Stat.ATK=${Stat.ATK}`);

  // BattleStat과 EffectiveStat 비교
  const battleStatMatches = highestStat === (stat as unknown as Stat);

  console.debug(`[StatusBoostItemModifier] battleStatMatches=${battleStatMatches}`);

  // 일치할 경우 1.5배 적용
  if (battleStatMatches) {
    const before = statVal.value;
    statVal.value *= this.multiplier;
    console.debug(
      `[StatusBoostItemModifier] 적용됨! ${pokemon.name} (${StatusEffect[pokemon.status]}) 상태에서 ${Stat[stat]}: ${before} → ${statVal.value}`
    );
    return true;
  }

  return false;
  }
}
(window as any).StatusBoostItemModifier = StatusBoostItemModifier;

/**
 * Modifier used for held items that ignore the opponent's stat changes (except Speed).
 * Implements the effect of the Unaware Band item.
 * @extends PokemonHeldItemModifier
 */
export class UnawareItemModifier extends PokemonHeldItemModifier {
  protected ignoredStats: readonly BattleStat[];

  constructor(
    type: ModifierType,
    pokemonId: number,
    ignoredStats: BattleStat[],
    stackCount?: number,
  ) {
    super(type, pokemonId, stackCount);
    this.ignoredStats = Array.isArray(ignoredStats) ? ignoredStats : [];

    const attr = new IgnoreOpponentStatStagesAbAttr(this.ignoredStats);
    this.attributes ??= [];
    this.attributes.push(attr);
  }

  clone(): UnawareItemModifier {
    return new UnawareItemModifier(
      this.type,
      this.pokemonId,
      [...this.ignoredStats],
      this.stackCount,
    );
  }

  getArgs(): any[] {
  const ignoredStats = Array.isArray(this.ignoredStats)
    ? [...this.ignoredStats]
    : [];

  return super.getArgs().concat([ignoredStats, this.stackCount]);
}

  matchType(modifier: Modifier): boolean {
    return modifier instanceof UnawareItemModifier;
  }

  override apply(
  pokemon: Pokemon,
  stat: BattleStat,
  holder: Utils.BooleanHolder,
): boolean {
  if (pokemon.id !== this.pokemonId) {
    return false;
  }

  // 추가
  if (!this.ignoredStats || !Array.isArray(this.ignoredStats)) {
    console.warn(
      "[UNAWARE_ITEM] ignoredStats missing",
      this,
    );
    return false;
  }

  if (this.ignoredStats.includes(stat)) {
    holder.value = true;

    console.log(
      "[UNAWARE_ITEM_APPLY]",
      pokemon.name,
      Stat[stat],
    );

    return true;
  }

  return false;
}

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * Modifier for held items that double the stat stage changes.
 * Functions similarly to the "Simple" ability, but as an item effect.
 * @extends PokemonHeldItemModifier
 */
export class StatStageChangeBoostModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): StatStageChangeBoostModifier {
    return new StatStageChangeBoostModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof StatStageChangeBoostModifier;
  }

  /**
   * Applies the StatStageChangeMultiplierAbAttr to the Pokémon, doubling the stat stage changes.
   */
  applyAbAttrs(type: any, _pokemon: Pokemon, cancelled: Utils.BooleanHolder, ..._args: any[]) {
    if (type === StatStageChangeMultiplierAbAttr) {
      cancelled.value = true; // Prevents the default behavior and applies custom multiplier.
      (args[0] as Utils.NumberHolder).value *= 2; // Multiplies the stat change by 2.
    }
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1; // Only one "Stat Stage Change Boost" item can be held by a Pokémon at a time.
  }
}

/**
 * Modifier for held items that reverse stat stage changes.
 * Functions similarly to the "Contrary" ability, but as an item effect.
 * @extends PokemonHeldItemModifier
 */
export class StatStageChangeReverseModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): StatStageChangeReverseModifier {
    return new StatStageChangeReverseModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof StatStageChangeReverseModifier;
  }

  /**
   * Applies the StatStageChangeMultiplierAbAttr to the Pokémon, reversing the stat stage changes.
   */
  applyAbAttrs(type: any, _pokemon: Pokemon, cancelled: Utils.BooleanHolder, ...args: any[]) {
    if (type === StatStageChangeMultiplierAbAttr) {
      cancelled.value = true; // Prevents the default behavior and applies custom multiplier.
      (args[0] as Utils.NumberHolder).value *= -1; // Multiplies the stat change by -1 to reverse it.
    }
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1; // Only one "Stat Stage Change Reverse" item can be held by a Pokémon at a time.
  }
}

export class PreventBerryUseItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): PreventBerryUseItemModifier {
    return new PreventBerryUseItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof PreventBerryUseItemModifier;
  }

  /**
   * Applies the PreventBerryUseAbAttr to opposing Pokémon during the berry phase.
   */
  applyAbAttrs(type: any, _pokemon: Pokemon, cancelled: Utils.BooleanHolder, ..._args: any[]) {
    if (type === PreventBerryUseAbAttr) {
      cancelled.value = true;
    }
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * Modifier for held items that prevent explosive moves (like Self-Destruct or Explosion) from being used by opponents.
 * Functions similarly to the "Damp" ability, but as an item effect.
 * @extends PokemonHeldItemModifier
 */
export class PreventExplosionItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): PreventExplosionItemModifier {
    return new PreventExplosionItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof PreventExplosionItemModifier;
  }

  /**
   * Applies the FieldPreventExplosiveMovesAbAttr during move condition checks.
   */
  applyAbAttrs(type: any, _pokemon: Pokemon, cancelled: Utils.BooleanHolder, ..._args: any[]) {
    if (type === FieldPreventExplosiveMovesAbAttr) {
      cancelled.value = true;
    }
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * Modifier for held items that prevent priority moves from being used by opponents.
 * Functions similarly to the "FieldPriorityMoveImmunityAbAttr", but as an item effect.
 * @extends PokemonHeldItemModifier
 */
export class PreventPriorityMoveItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): PreventPriorityMoveItemModifier {
    return new PreventPriorityMoveItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof PreventPriorityMoveItemModifier;
  }

  /**
   * 헬퍼 함수: 우선도 기술인지 확인
   */
  private isPriorityMove(move: any): boolean {
    return move && typeof move.priority === "number" && move.priority > 0;
  }

  /**
   * ✅ 핵심: apply() 추가 — applyModifiers() 호출 대응
   */
  override apply(
  cancelledHolder: BooleanHolder,
  source: Pokemon,
  move: Move
): boolean {
  // ✅ 타입 필터 — 다른 아이템이면 무시
  if (this.type.id !== "prevent_priority_item") {
    return false;
  }

  // ✅ 실제 조건
  if (source && source.id !== this.pokemonId && this.isPriorityMove(move)) {
    console.log(
      `[PreventPriorityMoveItemModifier] ${move.name} (priority ${move.priority}) 차단!`
    );
    cancelledHolder.value = true;
    return true;
  }
  return false;
}

  /**
   * 기존 applyAbAttrs()는 별도의 시스템 호출용
   */
  applyAbAttrs(
    type: any,
    pokemon: Pokemon,
    cancelled: Utils.BooleanHolder,
    ...args: any[]
  ) {
    const target = args[0];
    const move = args[1];
    const isStatusMove = move && move.category === MoveCategory.STATUS;
    const isAlly = target?.team === 1;

    if ((type === FieldPriorityMoveImmunityAbAttr || type === PreventPriorityMoveItemModifier) && !isAlly && !isStatusMove && this.isPriorityMove(move)) {
        cancelled.value = true;
      }
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}
(window as any).PreventPriorityMoveItemModifier = PreventPriorityMoveItemModifier;

export class MoveEffectChanceMultiplierItemModifier extends PokemonHeldItemModifier {
  private chanceMultiplier: number;

  constructor(
    type: ModifierType,
    pokemonId: number,
    chanceMultiplier: number,
    stackCount?: number,
  ) {
    super(type, pokemonId, stackCount);
    this.chanceMultiplier = chanceMultiplier;
  }

  clone(): MoveEffectChanceMultiplierItemModifier {
    return new MoveEffectChanceMultiplierItemModifier(
      this.type,
      this.pokemonId,
      this.chanceMultiplier,
      this.stackCount,
    );
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof MoveEffectChanceMultiplierItemModifier;
  }

  /**
   * Item version of MoveEffectChanceMultiplierAbAttr
   * - 착용자가 사용한 기술의 추가효과 발동률을 배율만큼 증가
   * - AbAttr의 canApply/apply 규칙을 그대로 사용
   */
  applyAbAttrs(
    type: any,
    params: ModifyMoveEffectChanceAbAttrParams & { pokemon?: Pokemon },
  ): void {
    const { chance, move, pokemon } = params ?? ({} as any);
    if (!chance || !move || !pokemon) { return; }

    // ✅ 착용자가 사용한 기술일 때만
    if (pokemon.id !== this.pokemonId) { return; }

    // ✅ AbAttr 로직 그대로 재사용
    const attr = new MoveEffectChanceMultiplierAbAttr(this.chanceMultiplier);

    if (!attr.canApply({ chance, move })) {
      console.debug(
        `[DEBUG][MoveEffectChanceMultiplierItemModifier] NOT applied (canApply=false) | user=${pokemon.name} move=${move.name} chance=${chance.value}`
      );
      return;
    }

    const before = chance.value;
    attr.apply({ chance, move });

    console.debug(
      `[DEBUG][MoveEffectChanceMultiplierItemModifier] APPLIED x${this.chanceMultiplier} | ${before} -> ${chance.value} | user=${pokemon.name} move=${move.name}`,
    );
  }

  getMaxHeldItemCount(): number {
    return 1;
  }
}

export class BlockCritItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): BlockCritItemModifier {
    return new BlockCritItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof BlockCritItemModifier;
  }

  override apply(pokemon: Pokemon, simulated: boolean, ...args: any[]): boolean {
    const blockCrit = args[0] as BooleanHolder;
    console.debug(`[BlockCritItemModifier] 호출됨 simulated=${simulated}, blockCrit=`, blockCrit);

    if (simulated) { return false; }
    if (blockCrit instanceof BooleanHolder) {
      blockCrit.value = true;
      console.debug(`[BlockCritItemModifier] ${pokemon.name} → 급소 무효화 적용됨`);
      return true;
    }

    console.warn("[BlockCritItemModifier] blockCrit이 BooleanHolder가 아님:", blockCrit);
    return false;
  }

  getMaxHeldItemCount(): number {
    return 1;
  }
}

export class IgnoreTypeImmunityModifier extends PokemonHeldItemModifier {
  clone(): IgnoreTypeImmunityModifier {
    return new IgnoreTypeImmunityModifier(this.type, this.pokemonId, this.stackCount);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof IgnoreTypeImmunityModifier;
  }

  applyAbAttrs(_type: any, _pokemon: Pokemon, cancelled: Utils.BooleanHolder, ...args: any[]): void {
    // args 예상: [moveType, defType, multiplierHolder]
    const multiplier = args[2] as NumberHolder | undefined;

    // ✅ "타입상성 때문에 효과가 없다(0배)"인 경우에만 1배로 변경
    if (multiplier?.value === 0) {
      cancelled.value = true;   // (네 엔진에서 이 플래그가 필요한 경우 유지)
      multiplier.value = 1;
    }
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class SheerForceItemModifier extends PokemonHeldItemModifier {
  // ✅ 예외 기술은 Set으로 (빠르고 중복 방지)
  static readonly EXCEPT_MOVES = new Set<MoveId>([
    MoveId.ORDER_UP,
    MoveId.ELECTRO_SHOT,
    MoveId.MAX_FLARE,
    MoveId.MAX_FLUTTERBY,
    MoveId.MAX_LIGHTNING,
    MoveId.MAX_STRIKE,
    MoveId.MAX_KNUCKLE,
    MoveId.MAX_PHANTASM,
    MoveId.MAX_HAILSTORM,
    MoveId.MAX_OOZE,
    MoveId.MAX_GEYSER,
    MoveId.MAX_AIRSTREAM,
    MoveId.MAX_STARFALL,
    MoveId.MAX_WYRMWIND,
    MoveId.MAX_MINDSTORM,
    MoveId.MAX_ROCKFALL,
    MoveId.MAX_QUAKE,
    MoveId.MAX_DARKNESS,
    MoveId.MAX_OVERGROWTH,
    MoveId.MAX_STEELSPIKE,
    MoveId.G_MAX_WILDFIRE,
    MoveId.G_MAX_BEFUDDLE,
    MoveId.G_MAX_VOLT_CRASH,
    MoveId.G_MAX_GOLD_RUSH,
    MoveId.G_MAX_CHI_STRIKE,
    MoveId.G_MAX_TERROR,
    MoveId.G_MAX_RESONANCE,
    MoveId.G_MAX_CUDDLE,
    MoveId.G_MAX_REPLENISH,
    MoveId.G_MAX_MALODOR,
    MoveId.G_MAX_STONESURGE,
    MoveId.G_MAX_WIND_RAGE,
    MoveId.G_MAX_STUN_SHOCK,
    MoveId.G_MAX_FINALE,
    MoveId.G_MAX_DEPLETION,
    MoveId.G_MAX_GRAVITAS,
    MoveId.G_MAX_VOLCALITH,
    MoveId.G_MAX_SANDBLAST,
    MoveId.G_MAX_SNOOZE,
    MoveId.G_MAX_TARTNESS,
    MoveId.G_MAX_SWEETNESS,
    MoveId.G_MAX_SMITE,
    MoveId.G_MAX_STEELSURGE,
    MoveId.G_MAX_MELTDOWN,
    MoveId.G_MAX_FOAM_BURST,
    MoveId.G_MAX_CENTIFERNO,
    MoveId.G_MAX_VINE_LASH,
    MoveId.G_MAX_CANNONADE,
    MoveId.G_MAX_DRUM_SOLO,
    MoveId.G_MAX_FIREBALL,
    MoveId.G_MAX_HYDROSNIPE,
    MoveId.G_MAX_ONE_BLOW,
    MoveId.G_MAX_RAPID_FLOW,
    MoveId.SOLAR_BEAM,
    MoveId.SOLAR_BLADE,
  ]);

  static isExceptMove(move: Move): boolean {
    return SheerForceItemModifier.EXCEPT_MOVES.has(move.id);
  }

  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): SheerForceItemModifier {
    return new SheerForceItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof SheerForceItemModifier;
  }

  // ✅ (핵심) args가 "객체 1개"로 오든, "(chance, move)"로 오든 안전하게 추출
  private extractMoveChance(args: any[]): { move?: Move; chance?: Utils.NumberHolder } {
    // 1) { move, chance, ... } 객체 1개로 오는 경우 (너 getMoveChance가 이 방식)
    if (args.length === 1 && args[0] && typeof args[0] === "object") {
      const p = args[0] as any;
      if (p.move && p.chance) { return { move: p.move as Move, chance: p.chance as Utils.NumberHolder }; }
    }

    // 2) (chance, move) 또는 (move, chance)
    const a0 = args[0] as any;
    const a1 = args[1] as any;

    const isChance = (x: any) => x && typeof x === "object" && typeof x.value === "number";
    const isMove = (x: any) => x && typeof x === "object" && typeof x.id === "number";

    if (isChance(a0) && isMove(a1)) { return { chance: a0, move: a1 }; }
    if (isMove(a0) && isChance(a1)) { return { move: a0, chance: a1 }; }

    // 3) fallback 탐색
    const chance = args.find(isChance) as Utils.NumberHolder | undefined;
    const move = args.find(isMove) as Move | undefined;
    return { move, chance };
  }

  // ✅ SheerForce가 "부가효과 제거/위력 증가"를 적용해도 되는지 최종 판정
  private shouldSheerForceAffect(move: Move, chance: Utils.NumberHolder): boolean {
    if (!move || !chance) { return false; }
    if (chance.value <= 0) { return false; }
    if (SheerForceItemModifier.isExceptMove(move)) { return false; }

    // 너 규칙: 공격기면 적용(STATUS 제외), power>0 체크는 일부러 안 함
    if (move.category === MoveCategory.STATUS) { return false; }

    return true;
  }

  override canApply(_pokemon: Pokemon, _passive: boolean, _simulated: boolean, args: any[]): boolean {
    const { move, chance } = this.extractMoveChance(args);
    if (!move || !chance) { return false; }
    return this.shouldSheerForceAffect(move, chance);
  }

  /**
   * - MoveEffectChanceMultiplierAbAttr: 부가효과 확률을 0으로
   * - MovePowerBoostAbAttr: 위력 1.3배
   */
  applyAbAttrs(type: any, pokemon: Pokemon, cancelled: Utils.BooleanHolder, ...args: any[]): void {
  void cancelled;

  const typeName = typeof type === "string" ? type : (type?.name ?? type);

  // 공통: args에서 move / numberholder 뽑기
  const findMove = (xs: any[]) =>
    xs.find(a => a && typeof a === "object" && typeof a.id === "number" && "category" in a) as Move | undefined;

  const findNumberHolders = (xs: any[]) =>
    xs.filter(a => a && typeof a === "object" && typeof a.value === "number") as Utils.NumberHolder[];

  if (typeName === "MoveEffectChanceMultiplierAbAttr") {
    // 여기서는 params 객체 1개로 들어오는 케이스도 처리
    const p = args.length === 1 && args[0] && typeof args[0] === "object" ? (args[0] as any) : null;
    const move = p?.move ?? findMove(args);
    const chance = p?.chance ?? findNumberHolders(args)[0];

    if (!move || !chance) { return; }

    // 예외기술은 건드리지 않음
    if (SheerForceItemModifier.isExceptMove(move)) { return; }

    // 공격기 + 부가효과 있는 경우만 제거
    if (move.category !== MoveCategory.STATUS && move.chance > 0 && chance.value > 0) {
      chance.value = 0;
    }
    return;
  }

  if (typeName === "MovePowerBoostAbAttr") {
    // ✅ 여기서도 params 객체 1개로 들어올 수 있음
    const p = args.length === 1 && args[0] && typeof args[0] === "object" ? (args[0] as any) : null;
    const move = p?.move ?? findMove(args);

    if (!move) { return; }

    // 예외기술은 위력 증가도 안 함
    if (SheerForceItemModifier.isExceptMove(move)) { return; }

    // 공격기 + 부가효과 있는 경우만 1.3배
    if (move.category !== MoveCategory.STATUS && move.chance > 0) {
      // 🔥 핵심: damage가 아니라 "power 쪽 NumberHolder"를 찾아서 올려야 [POWER]에 반영됨
      // 여러 홀더가 있을 수 있으니, move.chance 건드릴 때처럼 "첫 NumberHolder"가 아니라
      // 'power'처럼 쓰이는 걸 찾아야 함. 보통 params.power가 있으면 그걸 우선.
      const power: Utils.NumberHolder | undefined = p?.power ?? p?.damage ?? findNumberHolders(args)[0];
      if (!power) { return; }

      power.value = Math.floor(power.value * 1.3);
    }
    return;
  }
}

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class GoldenBodyItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): GoldenBodyItemModifier {
    return new GoldenBodyItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof GoldenBodyItemModifier;
  }

  apply(type: any, ...args: any[]): boolean {
    const [pokemon, cancelled, ...rest] = args;
    this.applyAbAttrs(type, pokemon, cancelled, ...rest);
    return true;
  }

  applyAbAttrs(type: any, pokemon: Pokemon, cancelled: Utils.BooleanHolder, source: Pokemon, move: Move): void {
    if (type === PreDefendAbAttr) {
      const isImmune =
        pokemon !== source &&
        move.category === MoveCategory.STATUS &&
        ![MoveTarget.ENEMY_SIDE, MoveTarget.BOTH_SIDES, MoveTarget.USER_SIDE].includes(move.moveTarget);

      if (isImmune) {
        cancelled.value = true;
      }
    }

    // 기존 PreApplyBattlerTagAbAttr는 남겨도 됨
    if (type === PreApplyBattlerTagAbAttr) {
      pokemon.addBattleAttribute(
        new MoveImmunityAbAttr(
          (pokemon, attacker, move) =>
            pokemon !== attacker &&
            move.category === MoveCategory.STATUS &&
            ![MoveTarget.ENEMY_SIDE, MoveTarget.BOTH_SIDES, MoveTarget.USER_SIDE].includes(move.moveTarget),
        ),
      );
    }
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class AromaIncenseItemModifier extends PokemonHeldItemModifier {
  public static readonly IMMUNE_TAGS: BattlerTagType[] = [
    BattlerTagType.TAUNT,
    BattlerTagType.TORMENT,
    BattlerTagType.HEAL_BLOCK,
    BattlerTagType.INFATUATED,
    BattlerTagType.DISABLED,
    BattlerTagType.ENCORE,
    BattlerTagType.PERISH_SONG,
  ];

  private immunityAttr?: UserFieldBattlerTagImmunityAbAttr;

  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): AromaIncenseItemModifier {
    return new AromaIncenseItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof AromaIncenseItemModifier;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }

  /** ✅ 전투 시작/장착 시: 아군 필드 면역 AbAttr 부여 */
  override onApply(pokemon: Pokemon): void {
    super.onApply(pokemon);

    const alreadyHas = pokemon.battleAttributes?.some(
      attr =>
        attr instanceof UserFieldBattlerTagImmunityAbAttr &&
        this.sameImmuneSet(
          (attr as UserFieldBattlerTagImmunityAbAttr)['immuneTagTypes'],
          AromaIncenseItemModifier.IMMUNE_TAGS
        )
    );
    if (alreadyHas) { return; }

    this.immunityAttr = new UserFieldBattlerTagImmunityAbAttr(AromaIncenseItemModifier.IMMUNE_TAGS);
    pokemon.addBattleAttribute(this.immunityAttr);

    console.debug(`[AromaIncense] ${pokemon.name} → 태그 면역 AbAttr 부여: ${AromaIncenseItemModifier.IMMUNE_TAGS.map(t => BattlerTagType[t]).join(', ')}`);
  }

  /** 🔧 태그 부착 직전 직접 호출될 경우 처리 */
  override apply(
  defender: Pokemon,
  passiveOrCancelled?: boolean | BooleanHolder,
  simulatedOrArg?: boolean | any,
  cancelledArg?: BooleanHolder,
  args?: any[],
): boolean {
  let cancelled: BooleanHolder | undefined;
  let tag: BattlerTag | undefined;

  // 직접 호출: apply(defender, cancelled, tag)
  if (passiveOrCancelled instanceof BooleanHolder) {
    cancelled = passiveOrCancelled;
    tag = simulatedOrArg;
  }

  // applyModifier식 호출: apply(defender, passive, simulated, cancelled, [tag])
  else if (cancelledArg instanceof BooleanHolder) {
    cancelled = cancelledArg;
    tag = args?.[0];
  }

  if (!cancelled || !tag) {
    return false;
  }

  const tagType = tag.tagType ?? tag.type ?? tag;

  if (AromaIncenseItemModifier.IMMUNE_TAGS.includes(tagType)) {
  cancelled.value = true;

  globalScene.phaseManager.queueMessage(
    i18next.t("modifier:aromaIncenseBlocked", {
      pokemonNameWithAffix: getPokemonNameWithAffix(defender),
      itemName: this.type.name,
    }),
  );

  console.debug(
    `[AromaIncense] ${defender.name} → ${BattlerTagType[tagType]} 면역 발동`,
  );

  return true;
}

  return false;
}

  override onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
    if (this.immunityAttr) {
      pokemon.removeBattleAttribute?.(this.immunityAttr);
      console.debug(`[AromaIncense] ${pokemon.name} → 태그 면역 해제`);
      this.immunityAttr = undefined;
    }
  }

  private sameImmuneSet(a: BattlerTagType[] | undefined, b: BattlerTagType[]): boolean {
    if (!a || a.length !== b.length) { return false; }
    const set = new Set(a);
    return b.every(x => set.has(x));
  }
}

export class SturdystoneItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): SturdystoneItemModifier {
    return new SturdystoneItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof SturdystoneItemModifier;
  }

  /**
   * Applies conditional damage reduction when HP is full and move is super effective.
   */
  applyAbAttrs(type: any, pokemon: Pokemon, cancelled: Utils.BooleanHolder, ...args: any[]): void {
    if (type === PreDefendAbAttr) {
      const condition: PokemonDefendCondition = (target, attacker, move) => {
        return target.hp === target.maxHp && move && move.getEffectiveness(target) > 1;
      };

      const DAMAGE_REDUCTION = 0.75;

      pokemon.addBattleAttribute(new ReceivedMoveDamageMultiplierAbAttr(condition, DAMAGE_REDUCTION));

      console.log("[Sturdystone] Applied conditional damage reduction (HP full + SE move).");
    }
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class SturdyMealModifier extends PokemonHeldItemModifier {
  // ✅ 같은 배틀에서 중복 부착 방지
  private appliedDamageAttrThisBattle = false; // (기존: 풀피 약점기 경감용)
  private appliedNonDirectBlockThisBattle = false; // ✅ 추가: 비공격 데미지 무효용
  private lastBattleKey: any = null;

  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): SturdyMealModifier {
    const m = new SturdyMealModifier(this.type, this.pokemonId, this.stackCount);
    m.appliedDamageAttrThisBattle = this.appliedDamageAttrThisBattle;
    m.appliedNonDirectBlockThisBattle = this.appliedNonDirectBlockThisBattle; // ✅
    m.lastBattleKey = this.lastBattleKey;
    return m;
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof SturdyMealModifier;
  }

  // ✅ 배틀 키 동기화 헬퍼
  private syncBattleKey(): void {
    const battleKey =
      (globalScene as any)?.currentBattle?.id ??
      (globalScene as any)?.battle?.id ??
      (globalScene as any)?.battleId ??
      globalScene;

    if (this.lastBattleKey !== battleKey) {
      this.lastBattleKey = battleKey;
      this.appliedDamageAttrThisBattle = false;
      this.appliedNonDirectBlockThisBattle = false; // ✅
    }
  }

  // ─────────────────────────────────────────────
  // ✅ 멧집향로 파트: 풀피 + 약점기 데미지 경감
  // ─────────────────────────────────────────────
  applyAbAttrs(type: any, pokemon: Pokemon, cancelled: Utils.BooleanHolder, ...args: any[]): void {
    if (type !== PreDefendAbAttr) { return; }

    this.syncBattleKey();
    if (this.appliedDamageAttrThisBattle) { return; }

    const condition: PokemonDefendCondition = (target, attacker, move) => {
      return target.hp === target.maxHp && !!move && move.getEffectiveness(target) > 1;
    };

    const DAMAGE_REDUCTION = 0.5;

    pokemon.addBattleAttribute(new ReceivedMoveDamageMultiplierAbAttr(condition, DAMAGE_REDUCTION));

    this.appliedDamageAttrThisBattle = true;
    console.log("[SturdyMeal] Applied SE-at-full-HP damage reduction.");
  }

  // ─────────────────────────────────────────────
  // ✅ 먹밥 파트 + ✅ 비공격 데미지 무효(여기서 부착)
  // ─────────────────────────────────────────────
  override apply(pokemon: Pokemon): boolean {
    this.syncBattleKey();

    // ✅ 턴 종료 회복
    if (!pokemon.isFullHp()) {
      globalScene.phaseManager.unshiftNew(
        "PokemonHealPhase",
        pokemon.getBattlerIndex(),
        toDmgValue(pokemon.getMaxHp() / 8),
        i18next.t("modifier:turnHealApply", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          typeName: this.type.name,
        }),
        true,
      );
      return true;
    }

    return false;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

// ─────────────────────────────────────────────
// 🌆 황혼의비드로 (dusk-mane)
// - 능력치 감소 가드
// - KO 시 최고 스탯 +1 (비스트부스트 동일)
// ─────────────────────────────────────────────
export class DuskManeBeadModifier extends PokemonHeldItemModifier {
  private stages: number;

  constructor(type: ModifierType, pokemonId: number, stages = 1, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.stages = stages;
  }

  override clone(): DuskManeBeadModifier {
    return new DuskManeBeadModifier(this.type, this.pokemonId, this.stages, this.stackCount);
  }

  override matchType(modifier: Modifier): boolean {
    return modifier instanceof DuskManeBeadModifier && modifier.stages === this.stages;
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.stages);
  }

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }

  private isActive(user: Pokemon): boolean {
    if (user.id !== this.pokemonId) { return false; }
    if (user.getSpeciesForm(true).speciesId !== SpeciesId.NECROZMA) { return false; }
    return user.getFormKey() === "dusk-mane";
  }

  // ✅ 능력치 감소 가드 (현재는 '감소면 전부 차단' 버전)
  public applyStatChange(pokemon: Pokemon, stat: BattleStat, newStage: number, source?: Pokemon): number {
    if (!this.isActive(pokemon)) { return newStage; }

    const cur = pokemon.getStatStage(stat);
    if (newStage >= cur) { return newStage; }

    // (업그레이드 포인트) source를 넘길 수 있으면 "상대발만" 허용/차단 가능
    // if (source && source.isPlayer() === pokemon.isPlayer()) return newStage;

    globalScene.phaseManager.queueMessage(
      i18next.t("modifier:protectStatStageApply", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        typeName: this.type.name,
      }),
    );
    return cur;
  }

  // ✅ KO 시 최고 스탯 +1
  public applyPostVictory(attacker: Pokemon, _defender: Pokemon, _move: Move | undefined, simulated: boolean): void {
    if (simulated) { return; }
    if (!this.isActive(attacker)) { return; }
    if (this.stages <= 0) { return; }

    const statToBoost = this.getHighestEffectiveStat(attacker);
    if (statToBoost == null) { return; }

    const currentStage = attacker.getStatStage(statToBoost as any);
    if (currentStage >= 6) { return; }

    globalScene.phaseManager.unshiftNew(
      "StatStageChangePhase",
      attacker.getBattlerIndex(),
      true,
      [statToBoost as any],
      this.stages,
    );
  }

  private getHighestEffectiveStat(pokemon: Pokemon): EffectiveStat | null {
    let highest: EffectiveStat | null = null;
    let best = Number.NEGATIVE_INFINITY;

    for (const s of EFFECTIVE_STATS) {
      const v = pokemon.getStat(s, false);
      if (v > best) {
        best = v;
        highest = s;
      }
    }
    return highest;
  }

  override apply(_pokemon: Pokemon): boolean {
    return false;
  }
}


// ─────────────────────────────────────────────
// 🌅 새벽의비드로 (dawn-wings)
// - 매직가드(비공격 데미지 무효) 부착
// - KO 시 최고 스탯 +1
// ─────────────────────────────────────────────
export class DawnWingsBeadModifier extends PokemonHeldItemModifier {
  private stages: number;

  private appliedMagicGuardThisBattle = false;
  private lastBattleKey: any = null;

  constructor(type: ModifierType, pokemonId: number, stages = 1, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.stages = stages;
  }

  override clone(): DawnWingsBeadModifier {
    const m = new DawnWingsBeadModifier(this.type, this.pokemonId, this.stages, this.stackCount);
    m.appliedMagicGuardThisBattle = this.appliedMagicGuardThisBattle;
    m.lastBattleKey = this.lastBattleKey;
    return m;
  }

  override matchType(modifier: Modifier): boolean {
    return modifier instanceof DawnWingsBeadModifier && modifier.stages === this.stages;
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.stages);
  }

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }

  private isActive(user: Pokemon): boolean {
    if (user.id !== this.pokemonId) { return false; }
    if (user.getSpeciesForm(true).speciesId !== SpeciesId.NECROZMA) { return false; }
    return user.getFormKey() === "dawn-wings";
  }

  private syncBattleKey(): void {
    const battleKey =
      (globalScene as any)?.currentBattle?.id ??
      (globalScene as any)?.battle?.id ??
      (globalScene as any)?.battleId ??
      globalScene;

    if (this.lastBattleKey !== battleKey) {
      this.lastBattleKey = battleKey;
      this.appliedMagicGuardThisBattle = false;
    }
  }

  public applyMagicGuardIfNeeded(pokemon: Pokemon): void {
    if (!this.isActive(pokemon)) { return; }

    this.syncBattleKey();
    if (this.appliedMagicGuardThisBattle) { return; }

    // ✅ 여기 1줄을 네 프로젝트 "매직가드 attribute"로 교체
    // pokemon.addBattleAttribute(new NonDirectDamageBlockAbAttr());
    // 또는 pokemon.addBattleAttribute(new ReceivedNonDirectDamageMultiplierAbAttr(0));

    this.appliedMagicGuardThisBattle = true;
  }

  override apply(pokemon: Pokemon): boolean {
    this.applyMagicGuardIfNeeded(pokemon);
    return false;
  }

  public applyPostVictory(attacker: Pokemon, _defender: Pokemon, _move: Move | undefined, simulated: boolean): void {
    if (simulated) { return; }
    if (!this.isActive(attacker)) { return; }
    if (this.stages <= 0) { return; }

    const statToBoost = this.getHighestEffectiveStat(attacker);
    if (statToBoost == null) { return; }

    const currentStage = attacker.getStatStage(statToBoost as any);
    if (currentStage >= 6) { return; }

    globalScene.phaseManager.unshiftNew(
      "StatStageChangePhase",
      attacker.getBattlerIndex(),
      true,
      [statToBoost as any],
      this.stages,
    );
  }

  private getHighestEffectiveStat(pokemon: Pokemon): EffectiveStat | null {
    let highest: EffectiveStat | null = null;
    let best = Number.NEGATIVE_INFINITY;

    for (const s of EFFECTIVE_STATS) {
      const v = pokemon.getStat(s, false);
      if (v > best) {
        best = v;
        highest = s;
      }
    }
    return highest;
  }
}


// ─────────────────────────────────────────────
// 🌟 광명의비드로 (ultra)
// - 적응력(STAB 2.0)
// - 색안경(비효과 x2)
// - KO 시 최고 스탯 +1
// ─────────────────────────────────────────────
export class UltraBeadModifier extends PokemonHeldItemModifier {
  private stabBonus = 0.5;
  private notEffectiveMult: number;
  private stages: number;

  constructor(type: ModifierType, pokemonId: number, notEffectiveMult = 2, stages = 1, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.notEffectiveMult = notEffectiveMult;
    this.stages = stages;
  }

  override clone(): UltraBeadModifier {
    return new UltraBeadModifier(this.type, this.pokemonId, this.notEffectiveMult, this.stages, this.stackCount);
  }

  override matchType(modifier: Modifier): boolean {
    return modifier instanceof UltraBeadModifier
      && modifier.notEffectiveMult === this.notEffectiveMult
      && modifier.stages === this.stages;
  }

  getArgs(): any[] {
    return super.getArgs().concat([this.notEffectiveMult, this.stages]);
  }

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }

  private isActive(user: Pokemon): boolean {
    if (user.id !== this.pokemonId) { return false; }
    if (user.getSpeciesForm(true).speciesId !== SpeciesId.NECROZMA) { return false; }
    return user.getFormKey() === "ultra";
  }

  // ✅ 적응력(STAB 2.0)
  public applyStabMultiplier(user: Pokemon, stabMult: NumberHolder): boolean {
    if (!this.isActive(user)) { return false; }

    if (stabMult.value > 1) {
      stabMult.value += this.stabBonus; // 1.5 -> 2.0
      return true;
    }
    return false;
  }

  // ✅ 색안경(비효과 x2)
  public applyNotEffectiveBoost(user: Pokemon, attrList: PreAttackAbAttr[]): boolean {
    if (!this.isActive(user)) { return false; }

    attrList.push(
      new DamageBoostAbAttr(this.notEffectiveMult, (attacker, target, move) => {
        return (target?.getMoveEffectiveness(attacker!, move) ?? 1) <= 0.5;
      }),
    );
    return true;
  }

  // ✅ KO 시 최고 스탯 +1
  public applyPostVictory(attacker: Pokemon, _defender: Pokemon, _move: Move | undefined, simulated: boolean): void {
    if (simulated) { return; }
    if (!this.isActive(attacker)) { return; }
    if (this.stages <= 0) { return; }

    const statToBoost = this.getHighestEffectiveStat(attacker);
    if (statToBoost == null) { return; }

    const currentStage = attacker.getStatStage(statToBoost as any);
    if (currentStage >= 6) { return; }

    globalScene.phaseManager.unshiftNew(
      "StatStageChangePhase",
      attacker.getBattlerIndex(),
      true,
      [statToBoost as any],
      this.stages,
    );
  }

  private getHighestEffectiveStat(pokemon: Pokemon): EffectiveStat | null {
    let highest: EffectiveStat | null = null;
    let best = Number.NEGATIVE_INFINITY;

    for (const s of EFFECTIVE_STATS) {
      const v = pokemon.getStat(s, false);
      if (v > best) {
        best = v;
        highest = s;
      }
    }
    return highest;
  }

  // ✅ "관통(상성무시)" : 타입상성 0배만 1배로 바꾼다
  // 엔진에서 아이템 applyAbAttrs 훅을 호출하는 지점이 있다면 여기로 들어옴
  override applyAbAttrs(_type: any, pokemon: Pokemon, cancelled: BooleanHolder, ...args: any[]): void {
    // Ultra form + Necrozma만
    if (!this.isActive(pokemon)) { return; }

    // args 예상: [moveType, defType, multiplierHolder]
    const multiplier = args[2] as NumberHolder | undefined;

    // ✅ "타입 상성 무효(0배)"인 경우에만 1배로
    if (multiplier?.value === 0) {
      cancelled.value = true; // (엔진이 이 플래그를 쓰는 경우를 위해 유지)
      multiplier.value = 1;
    }
  }

  override apply(_pokemon: Pokemon): boolean {
    return false;
  }
}

/**
 * Modifier for held items that increase STAB bonus from 1.5x to 2.0x.
 * Functions similarly to the "Adaptability" ability, but as an item effect.
 * @extends PokemonHeldItemModifier
 */
export class AdaptabilityItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): AdaptabilityItemModifier {
    return new AdaptabilityItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof AdaptabilityItemModifier;
  }

  // ✅ STAB 계산에서 직접 +0.5 (1.5 -> 2.0)
  override apply(_pokemon: Pokemon, multiplier: NumberHolder): boolean {
    if (multiplier.value > 1) {
      multiplier.value += 0.5;
      return true;
    }
    return false;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class TelepathyItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): TelepathyItemModifier {
    return new TelepathyItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  // 🔑 matchType는 "클래스" 비교여야 매칭됩니다.
  matchType(modifier: Modifier): boolean {
    return modifier instanceof TelepathyItemModifier;
  }

  // ✅ PreDefend 트리거로 불릴 때 실행될 핸들러
  applyAbAttrs(
    type: string,
    params: {
      pokemon: Pokemon;            // 방어자(this)
      opponent: Pokemon;           // 공격자(source)
      move: Move;
      cancelled: Utils.BooleanHolder;
      simulated: boolean;
      typeMultiplier: Utils.NumberHolder;
    }
  ): void {
    if (type !== "PreDefendAbAttr") { return; }

    const { pokemon, opponent, move, cancelled } = params;

    // 안전 가드
    if (!opponent || typeof opponent.isPlayer !== "function") { return; }
    if (!move || typeof (move as any).is !== "function") { return; }

    // 본가 텔레파시: "아군이 쏜 공격기"면 피해 면역
    const isAlly = pokemon !== opponent && pokemon.isPlayer() === opponent.isPlayer();
    const isAttack = (move as any).is("AttackMove");

    // 디버그: 호출 확인
    console.debug("[Telepathy] applyAbAttrs(PreDefend) called", {
      defender: pokemon.name,
      attacker: opponent.name,
      isAlly, isAttack, alreadyCancelled: cancelled.value
    });

    if (isAlly && isAttack) {
      cancelled.value = true; // ✅ 여기서 무효화 신호
      console.debug("[Telepathy] cancelled.value = true (telepathy immunity)");
    }
  }

  // NOTE: PreDefend 경로를 쓰므로 apply()는 굳이 없어도 됩니다.
  // 남겨두고 싶다면 그대로 두세요. (엔진은 PreDefend에서 applyAbAttrs를 먼저 본다고 보면 됩니다.)

  getMaxHeldItemCount(_: Pokemon): number {
    return 1;
  }
}

/**
 * Modifier used for held items that apply the Moody effect after each turn.
 * Randomly increases one stat's stage by 2 and decreases another stat's stage by 1.
 * @extends PokemonHeldItemModifier
 */
export class MoodyItemModifier extends PokemonHeldItemModifier {
  protected stagesIncrease = 2;
  protected stagesDecrease = -1;

  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): MoodyItemModifier {
    return new MoodyItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof MoodyItemModifier;
  }

  /**
   * ✅ 핵심: 무디 적용 가능 여부는 "super.shouldApply"로 통일
   * - MAGIC_ROOM / EMBARGO / KLUTZ / commensal 공유 등
   *   네가 PokemonHeldItemModifier.shouldApply에 넣은 정책을 그대로 탄다
   */
  override shouldApply(pokemon: Pokemon, ...args: any[]): boolean {
  return super.shouldApply(pokemon, ...args);
}

  /**
   * (필수 abstract) - 여기서는 안 쓰면 false로 둬도 OK
   */
  apply(..._args: any[]): boolean {
    return false;
  }

  applyTurnEnd(pokemon: Pokemon, simulated: boolean, _args: any[]): void {
    // ✅ 반드시 shouldApply를 먼저 탄다
    if (!this.shouldApply(pokemon, pokemon, simulated, _args)) {
      console.log("[MoodyItemModifier] TURN_END blocked by shouldApply()");
      return;
    }

    if (simulated) { return; }

    console.log("[MoodyItemModifier] TURN_END apply start");

    const canRaise = EFFECTIVE_STATS.filter(s => pokemon.getStatStage(s) < 6);
    let canLower = EFFECTIVE_STATS.filter(s => pokemon.getStatStage(s) > -6);

    if (canRaise.length > 0) {
      const raisedStat = canRaise[pokemon.randBattleSeedInt(canRaise.length)];
      canLower = canLower.filter(s => s !== raisedStat);

      globalScene.phaseManager.unshiftNew(
        "StatStageChangePhase",
        pokemon.getBattlerIndex(),
        true,
        [raisedStat],
        this.stagesIncrease
      );
    }

    if (canLower.length > 0) {
      const loweredStat = canLower[pokemon.randBattleSeedInt(canLower.length)];

      globalScene.phaseManager.unshiftNew(
        "StatStageChangePhase",
        pokemon.getBattlerIndex(),
        true,
        [loweredStat],
        this.stagesDecrease
      );
    }
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * Modifier used for Room Service item.
 * Triggers when Trick Room activates and lowers the Speed stat by 1 stage.
 * @extends PokemonHeldItemModifier
 */
export class RoomServiceModifier extends PokemonHeldItemModifier {
  constructor(
    type: ModifierType,
    pokemonId: number,
    private stackCount = 1,
  ) {
    super(type, pokemonId);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof RoomServiceModifier;
  }

  clone(): RoomServiceModifier {
    return new RoomServiceModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Called when Trick Room is added to the arena.
   * This must be called by the system that applies arena tags like TrickRoomTag.
   */
  onTrickRoomActivated(pokemon: Pokemon): boolean {
    if (!this.canApply(pokemon)) { return false; }

    // 스피드 능력치를 1단계 낮춤
    globalScene.phaseManager.unshiftNew(
  "StatStageChangePhase",
  pokemon.getBattlerIndex(),
  true,
  [Stat.SPD],
  -1,
  true,
);

    // 아이템 보존 여부 확인
    const preserve = new BooleanHolder(false);
globalScene.applyModifiers(PreserveItemModifier, pokemon.isPlayer(), pokemon, preserve, "item");

if (!preserve.value) {
  // ✅ 실제 소모 확정 → 리사이클 기록
  recordRecycleSnapshot(pokemon, this, { args: [] });

  if (this.stackCount > 1) {
  this.stackCount--;
} else {
  pokemon.loseHeldItem(this);
}

globalScene.updateModifiers(pokemon.isPlayer());
pokemon.updateInfo();
}

    return true;
  }

  /**
   * Apply the modifier effect, triggered when Trick Room is activated.
   */
  apply(pokemon: Pokemon): boolean {
    // Trick Room이 활성화되었을 때, RoomServiceModifier가 적용됨
    return this.onTrickRoomActivated(pokemon);
  }

  canApply(pokemon: Pokemon): boolean {
    return pokemon != null && pokemon.isActive();
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 10;
  }

  getStackCount(): number {
    return this.stackCount;
  }
}

export class AbilityGuardItemModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
  }

  clone(): AbilityGuardItemModifier {
    return new AbilityGuardItemModifier(this.type, this.pokemonId, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs();
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof AbilityGuardItemModifier;
  }

  /** MoveAbilityBypassAbAttr로부터 특성을 보호할지 여부 */
  public protectsFromAbilityBypass(): boolean {
    return true;
  }

  apply(..._args: any[]): boolean {
    return false;
  }

  // ✅ 여기서는 "자체 매직룸/금제/서투름 체크" 절대 하지 않음
  // ✅ 공통 정책은 전부 PokemonHeldItemModifier.shouldApply()에 맡김
  override shouldApply(pokemon?: any, ...args: any[]): boolean {

    return super.shouldApply(pokemon, ...args);
  }

  applyPostTurn(pokemon: Pokemon, _passive: boolean, simulated: boolean, _args: any[]): void {

    if (simulated) { return; }

    // (1) Neutralizing Gas 처리 (태그 기반)
    const hasSuppressAbilities = globalScene.arena.hasTag(ArenaTagType.NEUTRALIZING_GAS);
    console.log("[AbilityGuardItemModifier] hasSuppressAbilities:", hasSuppressAbilities);

    if (hasSuppressAbilities) {
      globalScene.phaseManager.queueMessage(
        i18next.t("modifier:abilityGuardPrevented", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          typeName: this.type.name,
        }),
      );
      return;
    }

    // (2) 기타 “특성 억제/교체” 상태 확인
    const suppressed = pokemon.isAbilitySuppressed();
    const replaced = pokemon.isAbilityReplaced();
    console.log("[AbilityGuardItemModifier] suppressed/replaced:", { suppressed, replaced });

    if (!suppressed && !replaced) {
      globalScene.phaseManager.queueMessage(
        i18next.t("modifier:abilityGuardPrevented", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          typeName: this.type.name,
        }),
      );
      return;
    }

    // 억제/교체 상태라면 복구
    pokemon.restoreOriginalAbility();
    console.log("[AbilityGuardItemModifier] restored original ability");
  }

  applyTurnEnd(pokemon: Pokemon, simulated: boolean, _args: any[]): void {
    console.log("[AbilityGuardItemModifier] applyTurnEnd called", {
      pokemon: pokemon.name,
      simulated,
    });

    // ✅ shouldApply는 베이스 정책만 타게 한다.
    // ✅ 인자 꼬임 방지: "대상 pokemon"만 넘겨서 베이스가 target 추출하도록 둠
    if (!this.shouldApply(pokemon, simulated, _args)) {
      console.log("[AbilityGuardItemModifier] TURN_END blocked by shouldApply()");
      return;
    }

    this.applyPostTurn(pokemon, false, simulated, _args);
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * Modifier used for Miss Effect item (허탕보험).
 * Triggers when a move misses and increases the user's Speed stat.
 * @extends PokemonHeldItemModifier
 */
export class MissEffectModifier extends PokemonHeldItemModifier {
  constructor(
    type: ModifierType,
    pokemonId: number,
    private stackCount = 1,
  ) {
    super(type, pokemonId);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof MissEffectModifier;
  }

  clone(): MissEffectModifier {
    return new MissEffectModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Called when a move misses. This method applies the effect of the item.
   * This should be called by the system that tracks move accuracy.
   */
  onMoveMissed(pokemon: Pokemon, move: Move): boolean {
    if (!this.canApply(pokemon)) { return false; }

    // Create the MissEffectAttr and apply it (this triggers the speed boost)
    const missEffectAttr = new MissEffectAttr((user, move) => {
  globalScene.phaseManager.unshiftPhase(
  new StatStageChangePhase(
    user.getBattlerIndex(),
    false,
    [Stat.SPD],
    2
  )
);
});

    // Apply the MissEffectAttr
    missEffectAttr.apply(pokemon, null, move, []);

    // Check for item usage and decrement stack or remove item if necessary
    const preserve = new BooleanHolder(false);
globalScene.applyModifiers(PreserveItemModifier, pokemon.isPlayer(), pokemon, preserve, "item");

if (!preserve.value) {
  recordRecycleSnapshot(pokemon, this, { args: [] });

  if (this.stackCount > 1) {
    this.stackCount--;
  } else {
    pokemon.loseHeldItem(this);
  }

  globalScene.updateModifiers(pokemon.isPlayer());
  pokemon.updateInfo();
}
    return true;
  }

  /**
   * Apply the modifier effect, triggered when a move misses.
   */
  apply(pokemon: Pokemon, move: Move): boolean {
    // Trigger MissEffectModifier when the move misses
    return this.onMoveMissed(pokemon, move);
  }

  canApply(pokemon: Pokemon): boolean {
    return pokemon != null && pokemon.isActive();
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 10;
  }

  getStackCount(): number {
    return this.stackCount;
  }
}

/**
 * Modifier used for held items that apply critical-hit stage boost(s).
 * @extends PokemonHeldItemModifier
 * @see {@linkcode apply}
 */
export class CritBoosterModifier extends PokemonHeldItemModifier {
  /** The amount of stages by which the held item increases the current critical-hit stage value */
  protected stageIncrement: number;

  constructor(type: ModifierType, pokemonId: number, stageIncrement: number, stackCount?: number) {
    super(type, pokemonId, stackCount);

    this.stageIncrement = stageIncrement;
  }

  clone() {
    return new CritBoosterModifier(this.type, this.pokemonId, this.stageIncrement, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.stageIncrement);
  }

  matchType(modifier: Modifier): boolean {
    if (modifier instanceof CritBoosterModifier) {
      return (modifier as CritBoosterModifier).stageIncrement === this.stageIncrement;
    }

    return false;
  }

  /**
   * Increases the current critical-hit stage value by {@linkcode stageIncrement}.
   * @param _pokemon {@linkcode Pokemon} N/A
   * @param critStage {@linkcode NumberHolder} that holds the resulting critical-hit level
   * @returns always `true`
   */
  override apply(_pokemon: Pokemon, critStage: NumberHolder): boolean {
    critStage.value += this.stageIncrement;
    return true;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * Modifier used for held items that apply critical-hit stage boost(s)
 * if the holder is of a specific {@linkcode SpeciesId}.
 * @extends CritBoosterModifier
 * @see {@linkcode shouldApply}
 */
export class SpeciesCritBoosterModifier extends CritBoosterModifier {
  /** The species that the held item's critical-hit stage boost applies to */
  private species: SpeciesId[];

  constructor(
    type: ModifierType,
    pokemonId: number,
    stageIncrement: number,
    species: SpeciesId[],
    stackCount?: number,
  ) {
    super(type, pokemonId, stageIncrement, stackCount);

    this.species = species;
  }

  clone() {
    return new SpeciesCritBoosterModifier(
      this.type,
      this.pokemonId,
      this.stageIncrement,
      this.species,
      this.stackCount,
    );
  }

  getArgs(): any[] {
    return [...super.getArgs(), this.species];
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof SpeciesCritBoosterModifier;
  }

  /**
   * Checks if the holder's {@linkcode SpeciesId} (or its fused species) is listed
   * in {@linkcode species}.
   * @param pokemon {@linkcode Pokemon} that holds the held item
   * @param critStage {@linkcode NumberHolder} that holds the resulting critical-hit level
   * @returns `true` if the critical-hit level can be incremented, false otherwise
   */
  override shouldApply(pokemon: Pokemon, critStage: NumberHolder): boolean {
    return (
      super.shouldApply(pokemon, critStage) &&
      (this.species.includes(pokemon.getSpeciesForm(true).speciesId) ||
        (pokemon.isFusion() && this.species.includes(pokemon.getFusionSpeciesForm(true).speciesId)))
    );
  }
}

function isUrshifuSingleForm(p: Pokemon): boolean {
  if (p.getSpeciesForm(true).speciesId !== SpeciesId.URSHIFU) { return false; }
  const k = p.getFormKey();
  return k === "single-strike" || k === SpeciesFormKey.GIGANTAMAX_SINGLE;
}

function isUrshifuRapidForm(p: Pokemon): boolean {
  if (p.getSpeciesForm(true).speciesId !== SpeciesId.URSHIFU) { return false; }
  const k = p.getFormKey();
  return k === "rapid-strike" || k === SpeciesFormKey.GIGANTAMAX_RAPID;
}

export class SpeciesFormHeldItemModifier extends PokemonHeldItemModifier {
  /** Allowed species ids (supports fusion via getSpeciesForm/getFusionSpeciesForm pattern) */
  protected species: SpeciesId[];
  /** Allowed form keys on the *actual holder* (not fusion part). */
  protected formKeys: (string)[];

  constructor(type: ModifierType, pokemonId: number, species: SpeciesId[], formKeys: string[], stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.species = species;
    this.formKeys = formKeys;
  }

  clone(): SpeciesFormHeldItemModifier {
    return new SpeciesFormHeldItemModifier(this.type, this.pokemonId, this.species, this.formKeys, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat([this.species, this.formKeys]);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof SpeciesFormHeldItemModifier;
  }

  protected isSpeciesAllowed(pokemon: Pokemon): boolean {
    return (
      this.species.includes(pokemon.getSpeciesForm(true).speciesId) ||
      (pokemon.isFusion?.() && this.species.includes(pokemon.getFusionSpeciesForm(true).speciesId))
    );
  }

  protected isFormAllowed(pokemon: Pokemon): boolean {
    const k = pokemon.getFormKey?.() ?? "";
    return this.formKeys.includes(k);
  }

  /** "착용자에게 이 아이템 효과가 활성인가?" */
  isActive(pokemon: Pokemon): boolean {
    return this.isSpeciesAllowed(pokemon) && this.isFormAllowed(pokemon);
  }
}

export class UrshifuGloveAbilityBypassModifier extends PokemonHeldItemModifier {
  constructor(type: ModifierType, pokemonId: number, stackCount: number) {
    super(type, pokemonId, stackCount);
  }

  override clone(): UrshifuGloveAbilityBypassModifier {
    return new UrshifuGloveAbilityBypassModifier(this.type, this.pokemonId, this.stackCount);
  }

  override matchType(modifier: Modifier): boolean {
    return modifier instanceof UrshifuGloveAbilityBypassModifier;
  }

  public shouldIgnoreContactPenalty(user: Pokemon): boolean {
  return this.isActive(user);
}

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }

  /** 글러브가 "우라오스 + 폼(일격/연격) + 글러브 종류"와 일치할 때만 활성 */
  private isActive(user: Pokemon): boolean {
  if (user.getSpeciesForm(true).speciesId !== SpeciesId.URSHIFU) { return false; }

  const k = user.getFormKey(); // "gigantamax-single" 등

  const isSingle = k === "single-strike" || k === "gigantamax-single";
  const isRapid  = k === "rapid-strike"  || k === "gigantamax-rapid";

  const typeId = (this.type as any)?.id ?? this.type; // 안전장치(대부분 this.type.id가 있음)

  switch (typeId) {
    case "WICKED_GLOVE":
    case "SINGLE_STRIKE_GLOVE":
      return isSingle;

    case "SURGING_GLOVE":
    case "RAPID_STRIKE_GLOVE":
      return isRapid;

    default:
      return false;
  }
}

/** ✅ 급소 대미지 1.5배 추가(크리티컬일 때만) */
applyCritDamageBoost(user: Pokemon, critDamageMult: NumberHolder): boolean {
  // ✅ 우라오스 + 폼 + 글러브 활성 아닐 때는 발동안
  if (!this.isActive(user)) { return false; }

  // ✅ 크리티컬일 때만(critDamageMult.value > 1) 1.5배 추가
  if (critDamageMult.value > 1) {
    critDamageMult.value *= 2;
    return true;
  }
  return false;
}
  /**
   * 공격 시 호출되는 apply
   * bypass.value를 true로 설정하면 상대 특성을 무시(= 틀깨기 동일)
   */
  override apply(
    user: Pokemon,
    target: Pokemon,
    move: Move,
    bypass: Utils.BooleanHolder,
  ): boolean {
   console.log("[GLOVE APPLY]", "type=", this.type, "formKey=", user.getFormKey(), "active=", this.isActive(user));
    // ✅ 폼/글러브 일치 + 우라오스일 때만 능력 무시
    if (this.isActive(user)) {
      bypass.value = true;
      return true;
    }
    return false;
  }
}

export class TypeSpecificMoveBoosterModifier extends PokemonHeldItemModifier {
  public moveType: Type;
  private boostMultiplier: number;

  private static readonly maxStack: number = 10; // 최대 스택 수
  private static readonly maxHeldItemCount: number = 10; // 최대 장착 가능 아이템 수량

  constructor(type: ModifierType, pokemonId: number, moveType: Type, boostPercent = 50, stackCount = 1) {
    super(type, pokemonId, stackCount);
    this.moveType = moveType;

    // boostPercent가 150이면 boostMultiplier는 1.5가 되어야 합니다.
    this.boostMultiplier = 1 + boostPercent / 100; // 150%라면 1.5로 계산됩니다
  }

  clone() {
    return new TypeSpecificMoveBoosterModifier(
      this.type,
      this.pokemonId,
      this.moveType,
      (this.boostMultiplier - 1) * 100,
      this.stackCount,
    );
  }

  getArgs(): any[] {
    return super.getArgs().concat([this.moveType, this.boostMultiplier * 100, this.stackCount]);
  }

  matchType(modifier: PokemonHeldItemModifier): boolean {
    return modifier instanceof TypeSpecificMoveBoosterModifier && modifier.moveType === this.moveType;
  }

  getStackCount(): number {
    return this.stackCount ?? 1; // 기본적으로 최소 1스택
  }

  override shouldApply(pokemon?: Pokemon, moveType?: Type, movePower?: NumberHolder): boolean {
    const result =
      super.shouldApply(pokemon, moveType, movePower) &&
      moveType === this.moveType &&
      movePower instanceof NumberHolder;

    console.debug("shouldApply called", {
      pokemonId: this.pokemonId,
      expectedType: this.moveType,
      actualMoveType: moveType,
      result,
    });

    return result;
  }

  override apply(pokemon: Pokemon, moveType: Type, movePower: NumberHolder): boolean {
  if (moveType !== this.moveType || movePower.value < 1) {
    return false;
  }

  const preserve = new BooleanHolder(false);

  globalScene.applyModifiers(
    PreserveItemModifier,
    pokemon.isPlayer(),
    pokemon,
    preserve,
    "item",
  );

  (movePower as any).__practiceLabel = this.type.name;

  movePower.value = Math.floor(
    movePower.value * this.boostMultiplier,
  );

  if (pokemon.getMetadata && !pokemon.getMetadata("originalHeldItemCount")) {
    pokemon.setMetadata("originalHeldItemCount", pokemon.getHeldItemCount());
  }

// 소모 예약만
if (!preserve.value) {
  (pokemon.turnData as any).pendingTypeSpecificMoveBooster = this;
}

  return true;
}

  override reset(pokemon: Pokemon): void {
    const originalCount = pokemon.getMetadata("originalHeldItemCount");

    if (originalCount !== undefined) {
      pokemon.setHeldItemCount(originalCount); // 원래 개수로 복구
      pokemon.removeMetadata("originalHeldItemCount"); // 메타데이터 삭제
    }
    return false;
  }

  /**
   * 최대 아이템 장착 수량을 반환
   * @param pokemon 포켓몬
   * @returns 최대 장착 가능 아이템 수
   */
  getMaxHeldItemCount(pokemon: Pokemon): number {
    return TypeSpecificMoveBoosterModifier.maxHeldItemCount; // 최대 5개의 아이템만 장착 가능
  }
}

/**
 * Applies Specific Type item boosts (e.g., Magnet)
 */
export class AttackTypeBoosterModifier extends PokemonHeldItemModifier {
  public moveType: PokemonType;
  private boostMultiplier: number;

  constructor(type: ModifierType, pokemonId: number, moveType: PokemonType, boostPercent: number, stackCount?: number) {
    super(type, pokemonId, stackCount);

    this.moveType = moveType;
    this.boostMultiplier = boostPercent * 0.01;
  }

  matchType(modifier: Modifier): boolean {
    if (modifier instanceof AttackTypeBoosterModifier) {
      const attackTypeBoosterModifier = modifier as AttackTypeBoosterModifier;
      return (
        attackTypeBoosterModifier.moveType === this.moveType &&
        attackTypeBoosterModifier.boostMultiplier === this.boostMultiplier
      );
    }

    return false;
  }

  clone() {
    return new AttackTypeBoosterModifier(
      this.type,
      this.pokemonId,
      this.moveType,
      this.boostMultiplier * 100,
      this.stackCount,
    );
  }

  getArgs(): any[] {
    return super.getArgs().concat([this.moveType, this.boostMultiplier * 100]);
  }

  /**
   * Checks if {@linkcode AttackTypeBoosterModifier} should be applied
   * @param pokemon the {@linkcode Pokemon} that holds the held item
   * @param moveType the {@linkcode PokemonType} of the move being used
   * @param movePower the {@linkcode NumberHolder} that holds the power of the move
   * @returns `true` if boosts should be applied to the move.
   */
  override shouldApply(pokemon?: Pokemon, moveType?: PokemonType, movePower?: NumberHolder): boolean {
    return (
      super.shouldApply(pokemon, moveType, movePower) &&
      typeof moveType === "number" &&
      movePower instanceof NumberHolder &&
      this.moveType === moveType
    );
  }

  /**
   * Applies {@linkcode AttackTypeBoosterModifier}
   * @param pokemon {@linkcode Pokemon} that holds the held item
   * @param moveType {@linkcode PokemonType} of the move being used
   * @param movePower {@linkcode NumberHolder} that holds the power of the move
   * @returns `true` if boosts have been applied to the move.
   */
  override apply(_pokemon: Pokemon, moveType: PokemonType, movePower: NumberHolder): boolean {
    if (moveType === this.moveType && movePower.value >= 1) {
      (movePower as NumberHolder).value = Math.floor(
        (movePower as NumberHolder).value * (1 + this.getStackCount() * this.boostMultiplier),
      );
      return true;
    }

    return false;
  }

  getScoreMultiplier(): number {
    return 1.2;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 99;
  }
}

export class SurviveDamageModifier extends PokemonHeldItemModifier {
  matchType(modifier: Modifier): boolean {
    return modifier instanceof SurviveDamageModifier;
  }

  clone() {
    return new SurviveDamageModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Checks if the {@linkcode SurviveDamageModifier} should be applied
   * @param pokemon the {@linkcode Pokemon} that holds the item
   * @param surviveDamage {@linkcode BooleanHolder} that holds the survive damage
   * @returns `true` if the {@linkcode SurviveDamageModifier} should be applied
   */
  override shouldApply(pokemon?: Pokemon, surviveDamage?: BooleanHolder): boolean {
    return super.shouldApply(pokemon, surviveDamage) && !!surviveDamage;
  }

  /**
   * Applies {@linkcode SurviveDamageModifier}
   * @param pokemon the {@linkcode Pokemon} that holds the item
   * @param surviveDamage {@linkcode BooleanHolder} that holds the survive damage
   * @returns `true` if the survive damage has been applied
   */
  override apply(pokemon: Pokemon, surviveDamage: BooleanHolder): boolean {
    if (!surviveDamage.value && pokemon.randBattleSeedInt(10) < this.getStackCount()) {
      surviveDamage.value = true;

      globalScene.phaseManager.queueMessage(
        i18next.t("modifier:surviveDamageApply", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          typeName: this.type.name,
        }),
      );
      return true;
    }

    return false;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 5;
  }
}

export class BypassSpeedChanceModifier extends PokemonHeldItemModifier {
  matchType(modifier: Modifier) {
    return modifier instanceof BypassSpeedChanceModifier;
  }

  clone() {
    return new BypassSpeedChanceModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Checks if {@linkcode BypassSpeedChanceModifier} should be applied
   * @param pokemon the {@linkcode Pokemon} that holds the item
   * @param doBypassSpeed {@linkcode BooleanHolder} that is `true` if speed should be bypassed
   * @returns `true` if {@linkcode BypassSpeedChanceModifier} should be applied
   */
  override shouldApply(pokemon?: Pokemon, doBypassSpeed?: BooleanHolder): boolean {
    return super.shouldApply(pokemon, doBypassSpeed) && !!doBypassSpeed;
  }

  /**
   * Applies {@linkcode BypassSpeedChanceModifier}
   * @param pokemon the {@linkcode Pokemon} that holds the item
   * @param doBypassSpeed {@linkcode BooleanHolder} that is `true` if speed should be bypassed
   * @returns `true` if {@linkcode BypassSpeedChanceModifier} has been applied
   */
  override apply(pokemon: Pokemon, doBypassSpeed: BooleanHolder): boolean {
    if (!doBypassSpeed.value && pokemon.randBattleSeedInt(10) < this.getStackCount()) {
      doBypassSpeed.value = true;
      const isCommandFight =
        globalScene.currentBattle.turnCommands[pokemon.getBattlerIndex()]?.command === Command.FIGHT;
      const hasQuickClaw = this.type.is("PokemonHeldItemModifierType") && this.type.id === "QUICK_CLAW";

      if (isCommandFight && hasQuickClaw) {
        globalScene.phaseManager.queueMessage(
          i18next.t("modifier:bypassSpeedChanceApply", {
            pokemonName: getPokemonNameWithAffix(pokemon),
            itemName: i18next.t("modifierType:ModifierType.QUICK_CLAW.name"),
          }),
        );
      }
      return true;
    }

    return false;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 3;
  }
}

/**
 * Class for Pokemon held items like King's Rock
 * Because King's Rock can be stacked in PokeRogue, unlike mainline, it does not receive a boost from AbilityId.SERENE_GRACE
 */
export class FlinchChanceModifier extends PokemonHeldItemModifier {
  private chance: number;
  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);

    this.chance = 20;
  }

  matchType(modifier: Modifier) {
    return modifier instanceof FlinchChanceModifier;
  }

  clone() {
    return new FlinchChanceModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Checks if {@linkcode FlinchChanceModifier} should be applied
   * @param pokemon the {@linkcode Pokemon} that holds the item
   * @param flinched {@linkcode BooleanHolder} that is `true` if the pokemon flinched
   * @returns `true` if {@linkcode FlinchChanceModifier} should be applied
   */
  override shouldApply(pokemon?: Pokemon, flinched?: BooleanHolder): boolean {
    return super.shouldApply(pokemon, flinched) && !!flinched;
  }

  /**
   * Applies {@linkcode FlinchChanceModifier} to randomly flinch targets hit.
   * @param pokemon - The {@linkcode Pokemon} that holds the item
   * @param flinched - A {@linkcode BooleanHolder} holding whether the pokemon has flinched
   * @returns `true` if {@linkcode FlinchChanceModifier} was applied successfully
   */
  override apply(pokemon: Pokemon, flinched: BooleanHolder): boolean {
    // The check for pokemon.summonData is to ensure that a crash doesn't occur when a Pokemon with King's Rock procs a flinch
    // TODO: Since summonData is always defined now, we can probably remove this
    if (pokemon.summonData && !flinched.value && pokemon.randBattleSeedInt(100) < this.getStackCount() * this.chance) {
      flinched.value = true;
      return true;
    }

    return false;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 3;
  }
}

export class TurnHealModifier extends PokemonHeldItemModifier {
  matchType(modifier: Modifier) {
    return modifier instanceof TurnHealModifier;
  }

  clone() {
    return new TurnHealModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Applies {@linkcode TurnHealModifier}
   * @param pokemon The {@linkcode Pokemon} that holds the item
   * @returns `true` if the {@linkcode Pokemon} was healed
   */
  override apply(pokemon: Pokemon): boolean {
    if (!pokemon.isFullHp()) {
      globalScene.phaseManager.unshiftNew(
        "PokemonHealPhase",
        pokemon.getBattlerIndex(),
        toDmgValue(pokemon.getMaxHp() / 16) * this.stackCount,
        i18next.t("modifier:turnHealApply", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          typeName: this.type.name,
        }),
        true,
      );
      return true;
    }

    return false;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 4;
  }
}

/**
 * Modifier used for held items, namely Toxic Orb and Flame Orb, that apply a
 * set {@linkcode StatusEffect} at the end of a turn.
 * @extends PokemonHeldItemModifier
 * @see {@linkcode apply}
 */
export class TurnStatusEffectModifier extends PokemonHeldItemModifier {
  /** The status effect to be applied by the held item */
  private effect: StatusEffect;

  constructor(type: ModifierType, pokemonId: number, stackCount?: number) {
    super(type, pokemonId, stackCount);

    switch (type.id) {
      case "TOXIC_ORB":
        this.effect = StatusEffect.TOXIC;
        break;
      case "FLAME_ORB":
        this.effect = StatusEffect.BURN;
        break;
      case "FREEZE_ORB":
        this.effect = StatusEffect.FROSTBITE;
        break;
    }
  }

  /**
   * Checks if {@linkcode modifier} is an instance of this class,
   * intentionally ignoring potentially different {@linkcode effect}s
   * to prevent held item stockpiling since the item obtained first
   * would be the only item able to {@linkcode apply} successfully.
   * @override
   * @param modifier {@linkcode Modifier} being type tested
   * @return `true` if {@linkcode modifier} is an instance of
   * TurnStatusEffectModifier, false otherwise
   */
  matchType(modifier: Modifier): boolean {
    return modifier instanceof TurnStatusEffectModifier;
  }

  clone() {
    return new TurnStatusEffectModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Attempt to inflict the holder with the associated {@linkcode StatusEffect}.
   * @param pokemon - The {@linkcode Pokemon} holding the item
   * @returns `true` if the status effect was applied successfully
   */
  override apply(pokemon: Pokemon): boolean {
    return pokemon.trySetStatus(this.effect, pokemon, undefined, this.type.name);
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }

  getStatusEffect(): StatusEffect {
    return this.effect;
  }
}

export class HitHealModifier extends PokemonHeldItemModifier {
  matchType(modifier: Modifier) {
    return modifier instanceof HitHealModifier;
  }

  clone() {
    return new HitHealModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Applies {@linkcode HitHealModifier}
   * @param pokemon The {@linkcode Pokemon} that holds the item
   * @returns `true` if the {@linkcode Pokemon} was healed
   */
  override apply(pokemon: Pokemon): boolean {
  const total = pokemon.turnData.totalDamageDealt;

  // 실제로 힐이 일어날 때만 true를 반환하는 게 정상 동작(로그도 정확해짐)
  if (!total || pokemon.isFullHp()) {
    return false;
  }

  const healAmountRaw = (Number(total) / 8) * this.stackCount;
  const healAmount = toDmgValue(healAmountRaw);

  // 🔎 혹시 total이 숫자가 아니거나 toDmgValue가 이상값을 반환하는 경우 방어
  if (healAmount == null || Number.isNaN(Number(healAmount))) {
    console.warn("[HitHealModifier] invalid healAmount", {
      totalDamageDealt: total,
      healAmountRaw,
      stackCount: this.stackCount,
      type: this.type,
    });
    return false;
  }

  const pokemonNameWithAffix = String(getPokemonNameWithAffix(pokemon) ?? pokemon.getName?.() ?? "???");
  const typeName = String(this.type?.name ?? this.type?.id ?? "???");

  // i18next 결과도 혹시 모르게 방어
  const msg = String(
    i18next.t("modifier:hitHealApply", { pokemonNameWithAffix, typeName }) ?? ""
  );

  globalScene.phaseManager.unshiftNew(
    "PokemonHealPhase",
    pokemon.getBattlerIndex(),
    healAmount,
    msg,
    true,
  );

  return true;
}

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 4;
  }
}

export class LevelIncrementBoosterModifier extends PersistentModifier {
  match(modifier: Modifier) {
    return modifier instanceof LevelIncrementBoosterModifier;
  }

  clone() {
    return new LevelIncrementBoosterModifier(this.type, this.stackCount);
  }

  /**
   * Checks if {@linkcode LevelIncrementBoosterModifier} should be applied
   * @param count {@linkcode NumberHolder} holding the level increment count
   * @returns `true` if {@linkcode LevelIncrementBoosterModifier} should be applied
   */
  override shouldApply(count: NumberHolder): boolean {
    return !!count;
  }

  /**
   * Applies {@linkcode LevelIncrementBoosterModifier}
   * @param count {@linkcode NumberHolder} holding the level increment count
   * @returns always `true`
   */
  override apply(count: NumberHolder): boolean {
    count.value += this.getStackCount();

    return true;
  }

  getMaxStackCount(_forThreshold?: boolean): number {
    return 99;
  }
}

export class BerryModifier extends PokemonHeldItemModifier {
  public berryType: BerryType;
  public consumed: boolean;

  constructor(type: ModifierType, pokemonId: number, berryType: BerryType, stackCount?: number) {
    super(type, pokemonId, stackCount);

    this.berryType = berryType;
    this.consumed = false;
  }

  matchType(modifier: Modifier) {
    return modifier instanceof BerryModifier && (modifier as BerryModifier).berryType === this.berryType;
  }

  clone() {
    return new BerryModifier(this.type, this.pokemonId, this.berryType, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.berryType);
  }

  /**
   * Checks if {@linkcode BerryModifier} should be applied
   * @param pokemon The {@linkcode Pokemon} that holds the berry
   * @returns `true` if {@linkcode BerryModifier} should be applied
   */
  override shouldApply(pokemon: Pokemon): boolean {
  // 능력치 상승형 열매는 항상 즉시 발동 가능하도록 허용
  if (
    [
      BerryType.POMEG,
      BerryType.KELPSY,
      BerryType.QUALOT,
      BerryType.HONDEW,
      BerryType.GREPA,
      BerryType.TAMATO
    ].includes(this.berryType)
  ) {
    return !this.consumed && getBerryPredicate(this.berryType)(pokemon);
  }

  return !this.consumed && super.shouldApply(pokemon) && getBerryPredicate(this.berryType)(pokemon);
}

  /**
   * Applies {@linkcode BerryModifier}
   * @param pokemon The {@linkcode Pokemon} that holds the berry
   * @returns always `true`
   */
  override apply(pokemon: Pokemon): boolean {
  const preserve = new BooleanHolder(false);
  globalScene.applyModifiers(PreserveBerryModifier, pokemon.isPlayer(), pokemon, preserve);
  this.consumed = !preserve.value;

  // ✅ 실제로 열매가 "먹혀서 소모"될 때만 리사이클 기록
  if (this.consumed) {
    recordRecycleSnapshot(pokemon, this, { args: [this.berryType] });
  }

  // munch the berry and trigger unburden-like effects
  getBerryEffectFunc(this.berryType)(pokemon);
  applyAbAttrs("PostItemLostAbAttr", { pokemon });

  // Update berry eaten trackers for Belch, Harvest, Cud Chew, etc.
  // Don't recover it if we proc berry pouch (no item duplication)
  pokemon.recordEatenBerry(this.berryType, this.consumed);

  return true;
}

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    if ([BerryType.LUM, BerryType.LEPPA, BerryType.SITRUS, BerryType.ENIGMA].includes(this.berryType)) {
      return 2;
    }
    return 3;
  }
}

export class PreserveBerryModifier extends PersistentModifier {
  match(modifier: Modifier) {
    return modifier instanceof PreserveBerryModifier;
  }

  clone() {
    return new PreserveBerryModifier(this.type, this.stackCount);
  }

  /**
   * Checks if all prequired conditions are met to apply {@linkcode PreserveBerryModifier}
   * @param pokemon {@linkcode Pokemon} that holds the berry
   * @param doPreserve {@linkcode BooleanHolder} that is `true` if the berry should be preserved
   * @returns `true` if {@linkcode PreserveBerryModifier} should be applied
   */
  override shouldApply(pokemon?: Pokemon, doPreserve?: BooleanHolder): boolean {
    return !!pokemon && !!doPreserve;
  }

  /**
   * Applies {@linkcode PreserveBerryModifier}
   * @param pokemon The {@linkcode Pokemon} that holds the berry
   * @param doPreserve {@linkcode BooleanHolder} that is `true` if the berry should be preserved
   * @returns always `true`
   */
  override apply(pokemon: Pokemon, doPreserve: BooleanHolder): boolean {
    doPreserve.value ||= pokemon.randBattleSeedInt(10) < this.getStackCount() * 3;

    return true;
  }

  getMaxStackCount(): number {
    return 3;
  }
}

export class PokemonInstantReviveModifier extends PokemonHeldItemModifier {
  matchType(modifier: Modifier) {
    return modifier instanceof PokemonInstantReviveModifier;
  }

  clone() {
    return new PokemonInstantReviveModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Applies {@linkcode PokemonInstantReviveModifier}
   * @param pokemon The {@linkcode Pokemon} that holds the item
   * @returns always `true`
   */
  override apply(pokemon: Pokemon): boolean {
    // Restore the Pokemon to half HP
    globalScene.phaseManager.unshiftNew(
      "PokemonHealPhase",
      pokemon.getBattlerIndex(),
      toDmgValue(pokemon.getMaxHp() / 2),
      i18next.t("modifier:pokemonInstantReviveApply", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        typeName: this.type.name,
      }),
      false,
      false,
      true,
    );

    // Remove the Pokemon's FAINT status
    pokemon.resetStatus(true, false, true, false);

    // Reapply Commander on the Pokemon's side of the field, if applicable
    const field = pokemon.isPlayer() ? globalScene.getPlayerField() : globalScene.getEnemyField();
    for (const p of field) {
      applyAbAttrs("CommanderAbAttr", { pokemon: p });
    }
    return true;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * Modifier used for held items, namely White Herb, that restore adverse stat
 * stages in battle.
 * @extends PokemonHeldItemModifier
 * @see {@linkcode apply}
 */
export class ResetNegativeStatStageModifier extends PokemonHeldItemModifier {
  matchType(modifier: Modifier) {
    return modifier instanceof ResetNegativeStatStageModifier;
  }

  clone() {
    return new ResetNegativeStatStageModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Goes through the holder's stat stages and, if any are negative, resets that
   * stat stage back to 0.
   * @param pokemon {@linkcode Pokemon} that holds the item
   * @returns `true` if any stat stages were reset, false otherwise
   */
  override apply(pokemon: Pokemon): boolean {
    let statRestored = false;

    for (const s of BATTLE_STATS) {
      if (pokemon.getStatStage(s) < 0) {
        pokemon.setStatStage(s, 0);
        statRestored = true;
      }
    }

    if (statRestored) {
      globalScene.phaseManager.queueMessage(
        i18next.t("modifier:resetNegativeStatStageApply", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          typeName: this.type.name,
        }),
      );
    }    

  const preserve = new BooleanHolder(false);
globalScene.applyModifiers(PreserveItemModifier, pokemon.isPlayer(), pokemon, preserve, "item");

if (!preserve.value) {
  // ✅ 보존 실패 → 실제로 소모될 때만 리사이클 기록
  recordRecycleSnapshot(pokemon, this, { args: [pokemon] });

  if (this.stackCount > 1) {
    this.stackCount--;
  } else {
    console.log("[RECYCLE SNAPSHOT SET]", pokemon.summonData?.lastConsumedHeldItem);
  }
}

    return statRestored;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 10;
  }
}

/**
 * Modifier used for held items, namely Mystical Rock, that extend the
 * duration of weather and terrain effects.
 * @extends PokemonHeldItemModifier
 * @see {@linkcode apply}
 */
export class FieldEffectModifier extends PokemonHeldItemModifier {
  /**
   * Provides two more turns per stack to any weather or terrain effect caused
   * by the holder.
   * @param pokemon {@linkcode Pokemon} that holds the held item
   * @param fieldDuration {@linkcode NumberHolder} that stores the current field effect duration
   * @returns `true` if the field effect extension was applied successfully
   */
  override apply(_pokemon: Pokemon, fieldDuration: NumberHolder): boolean {
    fieldDuration.value += 2 * this.stackCount;
    return true;
  }

  override matchType(modifier: Modifier): boolean {
    return modifier instanceof FieldEffectModifier;
  }

  override clone(): FieldEffectModifier {
    return new FieldEffectModifier(this.type, this.pokemonId, this.stackCount);
  }

  override getMaxHeldItemCount(_pokemon?: Pokemon): number {
    return 2;
  }
}

export abstract class ConsumablePokemonModifier extends ConsumableModifier {
  public pokemonId: number;

  constructor(type: ModifierType, pokemonId: number) {
    super(type);

    this.pokemonId = pokemonId;
  }

  /**
   * Checks if {@linkcode ConsumablePokemonModifier} should be applied
   * @param playerPokemon The {@linkcode PlayerPokemon} that consumes the item
   * @param _args N/A
   * @returns `true` if {@linkcode ConsumablePokemonModifier} should be applied
   */
  override shouldApply(playerPokemon?: PlayerPokemon, ..._args: unknown[]): boolean {
    return !!playerPokemon && (this.pokemonId === -1 || playerPokemon.id === this.pokemonId);
  }

  /**
   * Applies {@linkcode ConsumablePokemonModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that consumes the item
   * @param args Additional arguments passed to {@linkcode ConsumablePokemonModifier.apply}
   */
  abstract override apply(playerPokemon: PlayerPokemon, ...args: unknown[]): boolean;

  getPokemon() {
    return globalScene.getPlayerParty().find(p => p.id === this.pokemonId);
  }
}

export class TerastallizeModifier extends ConsumablePokemonModifier {
  public declare type: TerastallizeModifierType;
  public teraType: PokemonType;

  constructor(type: TerastallizeModifierType, pokemonId: number, teraType: PokemonType) {
    super(type, pokemonId);

    this.teraType = teraType;
  }

  /**
   * Checks if {@linkcode TerastallizeModifier} should be applied
   * @param playerPokemon The {@linkcode PlayerPokemon} that consumes the item
   * @returns `true` if the {@linkcode TerastallizeModifier} should be applied
   */
  override shouldApply(playerPokemon?: PlayerPokemon): boolean {
    return (
      super.shouldApply(playerPokemon) &&
      [playerPokemon?.species.speciesId, playerPokemon?.fusionSpecies?.speciesId].filter(
        s => s === SpeciesId.TERAPAGOS || s === SpeciesId.OGERPON || s === SpeciesId.SHEDINJA,
      ).length === 0
    );
  }

  /**
   * Applies {@linkcode TerastallizeModifier}
   * @param pokemon The {@linkcode PlayerPokemon} that consumes the item
   * @returns `true` if hp was restored
   */
  override apply(pokemon: Pokemon): boolean {
  pokemon.teraType = this.teraType;

  if (pokemon.isPlayer()) {
    const unlocked = globalScene.gameData.unlockSpeciesTeraType(pokemon.species, this.teraType);

    console.log("[TERA_UNLOCK]", {
      species: pokemon.species.speciesId,
      teraType: this.teraType,
      unlocked,
      teraTypeAttr: globalScene.gameData.starterData[pokemon.species.speciesId]?.teraTypeAttr,
    });

    if (unlocked) {
      const gainedRp = this.teraType === PokemonType.STELLAR ? 50 : 10;
      globalScene.gameData.addRoguePoints(gainedRp);
      globalScene.updateroguePointText();
    }
  }

  return true;
  }
}

export class WishingStarModifier extends PokemonHeldItemModifier {
  private maxBattles = 10;
  private battleCount: number;

  constructor(type: ModifierType, pokemonId: number, maxBattles?: number, battleCount?: number) {
    super(type, pokemonId);
    this.maxBattles = maxBattles ?? 10;
    this.battleCount = battleCount ?? this.maxBattles;
  }

  clone(): WishingStarModifier {
    return new WishingStarModifier(this.type, this.pokemonId, this.maxBattles, this.battleCount);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof WishingStarModifier && modifier.type === this.type;
  }

  /** 장착 적용 시 실행 (실제 효과는 applyToStat에서 처리) */
  override apply(playerPokemon: PlayerPokemon): boolean {
    if (this.isForbiddenSpecies(playerPokemon)) {
      console.log(`[WishingStarModifier] ${playerPokemon.name}은 금지된 종이라 적용되지 않습니다.`);
      return false;
    }

    console.log(`[WishingStarModifier] ${playerPokemon.name}에게 소원의별 장착 완료`);
    return true;
  }

  override shouldApply(pokemon?: Pokemon): boolean {
  if (!pokemon) { return false; }
  if (this.isForbiddenSpecies(pokemon)) {
    console.log(`[WishingStarModifier] ${pokemon.name}은 금지된 종입니다.`);
    return false;
  }
  // ✅ 조건 완화 → 무조건 true 반환 (자시안·자마젠타만 예외)
  return true;
}

  /** 스탯 보정 (예: 기가맥스면 1.3배 보너스) */
  applyToStat(pokemon: Pokemon, stat: Stat, multiplier: NumberHolder): void {
    if (this.isForbiddenSpecies(pokemon)) { return; }

    if (this.isGigantamaxForm(pokemon)) {
      multiplier.value *= 1.3;
      console.log(`[WishingStarModifier] ${pokemon.name} 기가맥스폼 → ${Stat[stat]} x1.3`);
    }
  }

  /** 기가맥스 여부 판정 */
  private isGigantamaxForm(pokemon: any): boolean {
    if (!(pokemon instanceof Pokemon)) { return false; }

    const formKey = pokemon.getFormKey();
    return (
      formKey === SpeciesFormKey.GIGANTAMAX ||
      formKey === SpeciesFormKey.GIGANTAMAX_SINGLE ||
      formKey === SpeciesFormKey.GIGANTAMAX_RAPID ||
      formKey === SpeciesFormKey.ETERNAMAX
    );
  }

  /** 남은 배틀 수 감소 및 자동 해제 */
  lapse(): boolean {
    this.battleCount--;
    if (this.battleCount <= 0) {
      const pokemon = this.getPokemon?.();
      if (pokemon) {
        pokemon.isDynamaxed = false;
        pokemon.maxHp = pokemon.getMaxHp();
        pokemon.hp = Math.min(pokemon.hp, pokemon.maxHp);
        pokemon.updateHpBar?.();
      }
      globalScene.removeModifier(this);
      return false;
    }
    return true;
  }

  /** 아이콘 + 남은 배틀 수 표시 */
  override getIcon(): Phaser.GameObjects.Container {
    const container = super.getIcon();
    const hue = Math.floor(120 * (this.battleCount / this.maxBattles) + 5);
    const typeHex = hslToHex(hue, 0.5, 0.9);
    const strokeHex = hslToHex(hue, 0.7, 0.3);

    const battleCountText = addTextObject(27, 0, this.battleCount.toString(), TextStyle.PARTY, {
      fontSize: "66px",
      color: typeHex,
    });
    battleCountText.setShadow(0, 0);
    battleCountText.setStroke(strokeHex, 16);
    battleCountText.setOrigin(1, 0);
    container.add(battleCountText);

    return container;
  }

  /** 적용 금지 포켓몬 */
  private isForbiddenSpecies(pokemonOrId?: Pokemon | number | null): boolean {
    if (!pokemonOrId) { return false; }

    let id: number;
    if (typeof pokemonOrId === "number") {
      id = pokemonOrId;
    } else {
      id =
        pokemonOrId.speciesId ??
        pokemonOrId.species?.speciesId ??
        pokemonOrId.speciesData?.speciesId ??
        pokemonOrId.speciesData?.id;
    }

    return id === SpeciesId.ZACIAN || id === SpeciesId.ZAMAZENTA;
  }

  override getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * 소원의별 적용 시도 함수 (성공/실패 모두 메시지 출력)
 */
function tryApplyWishingStar(type: ModifierType, pokemon: Pokemon): boolean {
  if (pokemon.speciesId === SpeciesId.ZACIAN || pokemon.speciesId === SpeciesId.ZAMAZENTA) {
    globalScene.showMessage(`${pokemon.name}에게 소원의별을 사용할 수 없습니다.`);
    return false;
  }

  const modifier = new WishingStarModifier(type, pokemon.id);
  const result = globalScene.addModifier(modifier);

  if (!result) {
    console.warn(`[tryApplyWishingStar] ${pokemon.name} → addModifier 실패`);
    globalScene.showMessage(`${pokemon.name}에게 소원의별을 적용할 수 없습니다.`);
    return false;
  }

  console.debug(`[tryApplyWishingStar] ${pokemon.name}에게 소원의별 적용 성공`);
  globalScene.showMessage(`${pokemon.name}에게 소원의별이 적용되었습니다!`);
  return true;
}

export class ZCrystalMoveModifier extends ConsumablePokemonModifier {
  constructor(
    public readonly type: PokemonModifierType,
    public readonly pokemonId: number,
    public readonly isUniversal: boolean,
  ) {
    super(type, pokemonId);
  }

  override apply(playerPokemon: PlayerPokemon): boolean {
  console.warn(
    `[ZMove] ${this.isUniversal ? "Generic" : "Exclusive"} LearnMovePhase 삽입`,
    this.type,
  );

  const learnType = this.isUniversal ? LearnMoveType.Z_GENERIC : LearnMoveType.Z_EXCLUSIVE;

  globalScene.phaseManager.unshiftNew(
    "LearnMovePhase",
    globalScene.getPlayerParty().indexOf(playerPokemon),
    this.type.moveId,
    learnType,                 // ✅ 이거 추가
  );

  return true;
  }
}

export class ZGenericCrystalMoveModifier extends ZCrystalMoveModifier {
  public declare type: ZGenericCrystalMoveModifierType;

  /**
   * Applies {@linkcode TmModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that should learn the TM
   * @returns always `true`
   */
  override apply(playerPokemon: PlayerPokemon): boolean {
    globalScene.phaseManager.unshiftNew(
      "LearnMovePhase",
      globalScene.getPlayerParty().indexOf(playerPokemon),
      this.type.moveId,
      LearnMoveType.Z_GENERIC,
    );

    return true;
  }
}

export class ZExclusiveCrystalMoveModifier extends ZCrystalMoveModifier {
  public declare type: ZExclusiveCrystalMoveModifierType;

  /**
   * Applies {@linkcode TmModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that should learn the TM
   * @returns always `true`
   */
  override apply(playerPokemon: PlayerPokemon): boolean {
    globalScene.phaseManager.unshiftNew(
      "LearnMovePhase",
      globalScene.getPlayerParty().indexOf(playerPokemon),
      this.type.moveId,
      LearnMoveType.Z_EXCLUSIVE,
    );

    return true;
  }
}

export class PokemonHpRestoreModifier extends ConsumablePokemonModifier {
  private restorePoints: number;
  private restorePercent: number;
  private healStatus: boolean;
  public fainted: boolean;

  constructor(
    type: ModifierType,
    pokemonId: number,
    restorePoints: number,
    restorePercent: number,
    healStatus: boolean,
    fainted?: boolean,
  ) {
    super(type, pokemonId);

    this.restorePoints = restorePoints;
    this.restorePercent = restorePercent;
    this.healStatus = healStatus;
    this.fainted = !!fainted;
  }

  /**
   * Checks if {@linkcode PokemonHpRestoreModifier} should be applied
   * @param playerPokemon The {@linkcode PlayerPokemon} that consumes the item
   * @param multiplier The multiplier of the hp restore
   * @returns `true` if the {@linkcode PokemonHpRestoreModifier} should be applied
   */
  override shouldApply(playerPokemon?: PlayerPokemon, multiplier?: number): boolean {
    return super.shouldApply(playerPokemon) && (this.fainted || (multiplier != null && typeof multiplier === "number"));
  }

  /**
   * Applies {@linkcode PokemonHpRestoreModifier}
   * @param pokemon The {@linkcode PlayerPokemon} that consumes the item
   * @param multiplier The multiplier of the hp restore
   * @returns `true` if hp was restored
   */
  override apply(pokemon: Pokemon, multiplier: number): boolean {
    if (!pokemon.hp === this.fainted) {
      let restorePoints = this.restorePoints;
      if (!this.fainted) {
        restorePoints = Math.floor(restorePoints * multiplier);
      }
      if (this.fainted || this.healStatus) {
        pokemon.resetStatus(true, true, false, false);
      }
      pokemon.hp = Math.min(
        pokemon.hp
          + Math.max(
            Math.ceil(Math.max(Math.floor(this.restorePercent * 0.01 * pokemon.getMaxHp()), restorePoints)),
            1,
          ),
        pokemon.getMaxHp(),
      );
      return true;
    }
    return false;
  }
}

export class PokemonStatusHealModifier extends ConsumablePokemonModifier {
  /**
   * Applies {@linkcode PokemonStatusHealModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that gets healed from the status
   * @returns always `true`
   */
  override apply(playerPokemon: PlayerPokemon): boolean {
    playerPokemon.resetStatus(true, true, false, false);
    return true;
  }
}

export abstract class ConsumablePokemonMoveModifier extends ConsumablePokemonModifier {
  public moveIndex: number;

  constructor(type: ModifierType, pokemonId: number, moveIndex: number) {
    super(type, pokemonId);

    this.moveIndex = moveIndex;
  }
}

const allZMoveIds: Set<Moves> = new Set(Object.keys(zmovesSpecies).map(Number));
const allMaxMoveIds: Set<Moves> = new Set(Object.keys(maxmovesSpecies).map(Number));

export class PokemonPpRestoreModifier extends ConsumablePokemonMoveModifier {
  private restorePoints: number;

  constructor(type: ModifierType, pokemonId: number, moveIndex: number, restorePoints: number) {
    super(type, pokemonId, moveIndex);
    this.restorePoints = restorePoints;
  }

  override canApply(playerPokemon: PlayerPokemon): boolean {
    const move = playerPokemon.getMoveset()[this.moveIndex];
    return !!move && !allZMoveIds.has(move.moveId);
  }

  override apply(playerPokemon: PlayerPokemon): boolean {
    const move = playerPokemon.getMoveset()[this.moveIndex];

    if (!move || allZMoveIds.has(move.moveId)) {
      console.log(`PP 회복 실패: Z기술 ${move?.moveId}는 대상 아님`);
      return false;
    }

    move.ppUsed = this.restorePoints > -1 ? Math.max(move.ppUsed - this.restorePoints, 0) : 0;

    return true;
  }
}

export class DynamaxMovePpUpModifier extends ConsumablePokemonMoveModifier {
  private upPoints: number;

  constructor(type: ModifierType, pokemonId: number, moveIndex: number, upPoints: number) {
    super(type, pokemonId, moveIndex);
    this.upPoints = upPoints;
  }

  override apply(playerPokemon: PlayerPokemon): boolean {
    const move = playerPokemon.getMoveset()[this.moveIndex];

    if (move && allMaxMoveIds.has(move.moveId) && !move.maxPpOverride) {
      move.ppUp = Math.min(move.ppUp + this.upPoints, 3);
      return true;
    }

    return false;
  }
}

export class PokemonAllMovePpRestoreModifier extends ConsumablePokemonModifier {
  private restorePoints: number;

  constructor(type: ModifierType, pokemonId: number, restorePoints: number) {
    super(type, pokemonId);

    this.restorePoints = restorePoints;
  }

  /**
   * Applies {@linkcode PokemonAllMovePpRestoreModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that should get all move pp restored
   * @returns always `true`
   */
  override apply(playerPokemon: PlayerPokemon): boolean {
    for (const move of playerPokemon.getMoveset()) {
      if (move) {
        move.ppUsed = this.restorePoints > -1 ? Math.max(move.ppUsed - this.restorePoints, 0) : 0;
      }
    }

    return true;
  }
}

export class PokemonZMovePpRestoreModifier extends ConsumablePokemonModifier {
  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId);
  }

  override apply(playerPokemon: PlayerPokemon): boolean {
    let recovered = 0;

    for (const move of playerPokemon.getMoveset()) {
      if (move && allZMoveIds.has(move.moveId) && move.ppUsed > 0) {
          move.ppUsed = 0;
          recovered++;
        }
    }

    if (recovered > 0) {
      globalScene.ui.showText(`Z기술 ${recovered}개의 기력이 회복되었습니다!`);
    } else {
      globalScene.ui.showText("회복할 Z기술의 기력이 없습니다.");
    }

    return true;
  }
}

export class PokemonMaxMovePpRestoreModifier extends ConsumablePokemonModifier {
  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId);
  }

  override apply(playerPokemon: PlayerPokemon): boolean {
    let recovered = 0;

    for (const move of playerPokemon.getMoveset()) {
      if (move && allMaxMoveIds.has(move.moveId) && move.ppUsed > 0) {
          move.ppUsed = 0;
          recovered++;
        }
    }

    if (recovered > 0) {
      globalScene.ui.showText(`다이맥스 기술 ${recovered}개의 기력이 회복되었습니다!`);
    } else {
      globalScene.ui.showText("회복할 다이맥스 기술의 기력이 없습니다.");
    }

    return true;
  }
}

export class PokemonPpUpModifier extends ConsumablePokemonMoveModifier {
  private upPoints: number;

  constructor(type: ModifierType, pokemonId: number, moveIndex: number, upPoints: number) {
    super(type, pokemonId, moveIndex);

    this.upPoints = upPoints;
  }

  /**
   * Applies {@linkcode PokemonPpUpModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that gets a pp up on move-slot {@linkcode moveIndex}
   * @returns
   */
  override apply(playerPokemon: PlayerPokemon): boolean {
    const move = playerPokemon.getMoveset()[this.moveIndex];

    if (move && !move.maxPpOverride) {
      move.ppUp = Math.min(move.ppUp + this.upPoints, 3);
    }

    return true;
  }
}

export class PokemonNatureChangeModifier extends ConsumablePokemonModifier {
  public nature: Nature;

  constructor(type: ModifierType, pokemonId: number, nature: Nature) {
    super(type, pokemonId);

    this.nature = nature;
  }

  /**
   * Applies {@linkcode PokemonNatureChangeModifier}
   * @param playerPokemon {@linkcode PlayerPokemon} to apply the {@linkcode Nature} change to
   * @returns
   */
  override apply(playerPokemon: PlayerPokemon): boolean {
    playerPokemon.setCustomNature(this.nature);
    globalScene.gameData.unlockSpeciesNature(playerPokemon.species, this.nature);

    return true;
  }
}

export class PokemonLevelIncrementModifier extends ConsumablePokemonModifier {
  /**
   * Applies {@linkcode PokemonLevelIncrementModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that should get levels incremented
   * @param levelCount The amount of levels to increment
   * @returns always `true`
   */
  override apply(playerPokemon: PlayerPokemon, levelCount: NumberHolder = new NumberHolder(1)): boolean {
    globalScene.applyModifiers(LevelIncrementBoosterModifier, true, levelCount);

    playerPokemon.level += levelCount.value;
    if (playerPokemon.level <= globalScene.getMaxExpLevel(true)) {
      playerPokemon.exp = getLevelTotalExp(playerPokemon.level, playerPokemon.species.growthRate);
      playerPokemon.levelExp = 0;
    }

    playerPokemon.addFriendship(FRIENDSHIP_GAIN_FROM_RARE_CANDY, true);

    globalScene.phaseManager.unshiftNew(
      "LevelUpPhase",
      globalScene.getPlayerParty().indexOf(playerPokemon),
      playerPokemon.level - levelCount.value,
      playerPokemon.level,
    );

    return true;
  }
}

export class TmModifier extends ConsumablePokemonModifier {
  public declare type: TmModifierType;

  /**
   * Applies {@linkcode TmModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that should learn the TM
   * @returns always `true`
   */
  override apply(playerPokemon: PlayerPokemon): boolean {
    globalScene.phaseManager.unshiftNew(
      "LearnMovePhase",
      globalScene.getPlayerParty().indexOf(playerPokemon),
      this.type.moveId,
      LearnMoveType.TM,
    );

    return true;
  }
}

export class TrModifier extends ConsumablePokemonModifier {
  public declare type: TrModifierType;

  /**
   * Applies {@linkcode TmModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that should learn the TM
   * @returns always `true`
   */
  override apply(playerPokemon: PlayerPokemon): boolean {
    globalScene.phaseManager.unshiftNew(
      "LearnMovePhase",
      globalScene.getPlayerParty().indexOf(playerPokemon),
      this.type.moveId,
      LearnMoveType.TR,
    );

    return true;
  }
}

export class RememberMoveModifier extends ConsumablePokemonModifier {
  public levelMoveIndex: number;

  constructor(type: ModifierType, pokemonId: number, levelMoveIndex: number) {
    super(type, pokemonId);

    this.levelMoveIndex = levelMoveIndex;
  }

  /**
   * Applies {@linkcode RememberMoveModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that should remember the move
   * @returns always `true`
   */
  override apply(playerPokemon: PlayerPokemon, cost?: number): boolean {
    globalScene.phaseManager.unshiftNew(
      "LearnMovePhase",
      globalScene.getPlayerParty().indexOf(playerPokemon),
      playerPokemon.getLearnableLevelMoves()[this.levelMoveIndex],
      LearnMoveType.MEMORY,
      cost,
    );

    return true;
  }
}

export class MaxIvModifier extends ConsumablePokemonModifier {
  public statIndex: number; // 0: HP, 1: Atk, ..., 5: Speed

  constructor(type: ModifierType, pokemonId: number, statIndex: number) {
    super(type, pokemonId);

    // statIndex가 유효한 값인지 확인
    if (statIndex === undefined || statIndex < 0 || statIndex > 5) {
      throw new Error(`Invalid statIndex value: ${statIndex}`);
    }
    this.statIndex = statIndex;
  }

  /**
   * Applies MaxIvModifier
   * @param pokemonData The PokemonData instance whose IV will be maxed
   * @returns always `true`
   */
  override async apply(pokemon: PlayerPokemon): Promise<boolean> {
    const statKey = PERMANENT_STATS[this.statIndex];
    const currentIv = pokemon.ivs[statKey];

    if (currentIv < 31) {
      const newIvs = [...pokemon.ivs];
      newIvs[this.statIndex] = 31;

      console.log("[MaxIvModifier] Before:", {
        ivs: pokemon.ivs,
        stats: pokemon.stats,
      });

      pokemon.setCustomIVs(newIvs);
      pokemon.calculateStats();

      console.log("[MaxIvModifier] After:", {
        ivs: pokemon.ivs,
        stats: pokemon.stats,
      });

      // 도감 등록 시도
      await globalScene.gameData.setPokemonCaught(pokemon, true);

      const speciesRootForm = pokemon.species.getRootSpeciesId(true);
      if (speciesRootForm) {
        console.log("[DEBUG] Root Species ID:", speciesRootForm);
        globalScene.gameData.updateSpeciesDexIvs(speciesRootForm, newIvs); // ← 여기 핵심
      }
    }

    // 스타터 포켓몬인 경우 추가로 보장
    if (pokemon.isStarter) {
      await globalScene.gameData.setPokemonCaught(pokemon, true);
    }

    return true;
  }
}

export class MaxAllIvModifier extends ConsumablePokemonModifier {
  constructor(type: ModifierType, pokemonId: number) {
    super(type, pokemonId);
  }

  /**
   * Applies MaxAllIvModifier - sets all IVs to 31
   * @param pokemon The PlayerPokemon instance
   * @returns always `true`
   */
  override async apply(pokemon: PlayerPokemon): Promise<boolean> {
    const newIvs = [...pokemon.ivs].map(() => 31);

    console.log("[MaxAllIvModifier] Before:", {
      ivs: pokemon.ivs,
      stats: pokemon.stats,
    });

    pokemon.setCustomIVs(newIvs);
    pokemon.calculateStats();

    console.log("[MaxAllIvModifier] After:", {
      ivs: pokemon.ivs,
      stats: pokemon.stats,
    });

    // 도감 등록 시도
    await globalScene.gameData.setPokemonCaught(pokemon, true);

    const speciesRootForm = pokemon.species.getRootSpeciesId(true);
    if (speciesRootForm) {
      console.log("[DEBUG] Root Species ID:", speciesRootForm);
      globalScene.gameData.updateSpeciesDexIvs(speciesRootForm, newIvs);
    }

    // 스타터 포켓몬이라면 추가 등록
    if (pokemon.isStarter) {
      await globalScene.gameData.setPokemonCaught(pokemon, true);
    }

    return true;
  }
}

export class ChangeAbilityModifier extends ConsumablePokemonModifier {
  public readonly changeAbilityType: ChangeAbilityType;

  constructor(type: ModifierType, pokemonId: number, changeAbilityType: ChangeAbilityType) {
    super(type, pokemonId);
    this.changeAbilityType = changeAbilityType;
  }

  override apply(playerPokemon: PlayerPokemon, cost?: number): boolean {
    globalScene.phaseManager.unshiftPhase(
      new ChangeAbilityPhase(
        globalScene.getPlayerParty().indexOf(playerPokemon),
        this.changeAbilityType, // 여기도 this로 변경!
        cost,
      ),
    );

    return true;
  }
}

export class RegisterAbilityModifier extends ConsumablePokemonModifier {
  public readonly registerAbilityType: RegisterAbilityType;

  constructor(type: ModifierType, pokemonId: number, registerAbilityType: RegisterAbilityType) {
    super(type, pokemonId);
    this.registerAbilityType = registerAbilityType;
  }

  override apply(playerPokemon: PlayerPokemon, cost?: number): boolean {
    globalScene.phaseManager.unshiftPhase(
      new RegisterAbilityPhase(
        globalScene.getPlayerParty().indexOf(playerPokemon),
        this.registerAbilityType, // 여기도 this로 변경!
        cost,
      ),
    );

    return true;
  }
}

export class EvolutionItemModifier extends ConsumablePokemonModifier {
  public declare type: EvolutionItemModifierType;
  /**
   * Applies {@linkcode EvolutionItemModifier}
   * @param playerPokemon The {@linkcode PlayerPokemon} that should evolve via item
   * @returns `true` if the evolution was successful
   */
  override apply(playerPokemon: PlayerPokemon): boolean {
    let matchingEvolution = pokemonEvolutions.hasOwnProperty(playerPokemon.species.speciesId)
      ? pokemonEvolutions[playerPokemon.species.speciesId].find(
          e => e.evoItem === this.type.evolutionItem && e.validate(playerPokemon, false, e.item!),
        )
      : null;

    if (!matchingEvolution && playerPokemon.isFusion()) {
      matchingEvolution = pokemonEvolutions[playerPokemon.fusionSpecies!.speciesId].find(
        e => e.evoItem === this.type.evolutionItem && e.validate(playerPokemon, true, e.item!),
      );
      if (matchingEvolution) {
        matchingEvolution = new FusionSpeciesFormEvolution(playerPokemon.species.speciesId, matchingEvolution);
      }
    }

    if (matchingEvolution) {
      globalScene.phaseManager.unshiftNew("EvolutionPhase", playerPokemon, matchingEvolution, playerPokemon.level - 1);
      return true;
    }

    return false;
  }
}

export class FusePokemonModifier extends ConsumablePokemonModifier {
  public fusePokemonId: number;

  constructor(type: ModifierType, pokemonId: number, fusePokemonId: number) {
    super(type, pokemonId);

    this.fusePokemonId = fusePokemonId;
  }

  /**
   * Checks if {@linkcode FusePokemonModifier} should be applied
   * @param playerPokemon {@linkcode PlayerPokemon} that should be fused
   * @param playerPokemon2 {@linkcode PlayerPokemon} that should be fused with {@linkcode playerPokemon}
   * @returns `true` if {@linkcode FusePokemonModifier} should be applied
   */
  override shouldApply(playerPokemon?: PlayerPokemon, playerPokemon2?: PlayerPokemon): boolean {
    return (
      super.shouldApply(playerPokemon, playerPokemon2) && !!playerPokemon2 && this.fusePokemonId === playerPokemon2.id
    );
  }

  /**
   * Applies {@linkcode FusePokemonModifier}
   * @param playerPokemon {@linkcode PlayerPokemon} that should be fused
   * @param playerPokemon2 {@linkcode PlayerPokemon} that should be fused with {@linkcode playerPokemon}
   * @returns always Promise<true>
   */
  override apply(playerPokemon: PlayerPokemon, playerPokemon2: PlayerPokemon): boolean {
    playerPokemon.fuse(playerPokemon2);
    return true;
  }
}

export class EggHatchSpeedUpModifier extends PersistentModifier {
  tier: number; // 티어 정보 추가

  constructor(type: ModifierType, stackCount = 1, tier = 1) {
    super(type, stackCount);
    this.tier = tier;
  }

  getMaxStackCount(): number {
    return 3;
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof EggHatchSpeedUpModifier && modifier.tier === this.tier;
  }

  apply(): boolean {
    return true;
  }

  clone(): EggHatchSpeedUpModifier {
    return new EggHatchSpeedUpModifier(this.type, this.stackCount, this.tier);
  }

  getHatchTurnMultiplier(): number {
    const stacks = Math.min(this.stackCount, 3);
    return 1 - 0.3 * stacks;
  }
}

export class HealingBoosterModifier extends PersistentModifier {
  private multiplier: number;

  constructor(type: ModifierType, multiplier: number, stackCount?: number) {
    super(type, stackCount);

    this.multiplier = multiplier;
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof HealingBoosterModifier;
  }

  clone(): HealingBoosterModifier {
    return new HealingBoosterModifier(this.type, this.multiplier, this.stackCount);
  }

  getArgs(): any[] {
    return [this.multiplier];
  }

  /**
   * Applies {@linkcode HealingBoosterModifier}
   * @param healingMultiplier the multiplier to apply to the healing
   * @returns always `true`
   */
  override apply(healingMultiplier: NumberHolder): boolean {
    healingMultiplier.value *= 1 + (this.multiplier - 1) * this.getStackCount();

    return true;
  }

  getMaxStackCount(): number {
    return 5;
  }
}

export class ExpBoosterModifier extends PersistentModifier {
  private boostMultiplier: number;

  constructor(type: ModifierType, boostPercent: number, stackCount?: number) {
    super(type, stackCount);

    this.boostMultiplier = boostPercent * 0.01;
  }

  match(modifier: Modifier): boolean {
    if (modifier instanceof ExpBoosterModifier) {
      const expModifier = modifier as ExpBoosterModifier;
      return expModifier.boostMultiplier === this.boostMultiplier;
    }
    return false;
  }

  clone(): ExpBoosterModifier {
    return new ExpBoosterModifier(this.type, this.boostMultiplier * 100, this.stackCount);
  }

  getArgs(): any[] {
    return [this.boostMultiplier * 100];
  }

  /**
   * Applies {@linkcode ExpBoosterModifier}
   * @param boost {@linkcode NumberHolder} holding the boost value
   * @returns always `true`
   */
  override apply(boost: NumberHolder): boolean {
    boost.value = Math.floor(boost.value * (1 + this.getStackCount() * this.boostMultiplier));

    return true;
  }

  getMaxStackCount(_forThreshold?: boolean): number {
    return this.boostMultiplier < 1 ? (this.boostMultiplier < 0.6 ? 99 : 30) : 10;
  }
}

export class PokemonExpBoosterModifier extends PokemonHeldItemModifier {
  public declare type: PokemonExpBoosterModifierType;

  private boostMultiplier: number;

  constructor(type: PokemonExpBoosterModifierType, pokemonId: number, boostPercent: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.boostMultiplier = boostPercent * 0.01;
  }

  matchType(modifier: Modifier): boolean {
    if (modifier instanceof PokemonExpBoosterModifier) {
      const pokemonExpModifier = modifier as PokemonExpBoosterModifier;
      return pokemonExpModifier.boostMultiplier === this.boostMultiplier;
    }
    return false;
  }

  clone(): PersistentModifier {
    return new PokemonExpBoosterModifier(this.type, this.pokemonId, this.boostMultiplier * 100, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.boostMultiplier * 100);
  }

  /**
   * Checks if {@linkcode PokemonExpBoosterModifier} should be applied
   * @param pokemon The {@linkcode Pokemon} to apply the exp boost to
   * @param boost {@linkcode NumberHolder} holding the exp boost value
   * @returns `true` if {@linkcode PokemonExpBoosterModifier} should be applied
   */
  override shouldApply(pokemon: Pokemon, boost: NumberHolder): boolean {
    return super.shouldApply(pokemon, boost) && !!boost;
  }

  /**
   * Applies {@linkcode PokemonExpBoosterModifier}
   * @param _pokemon The {@linkcode Pokemon} to apply the exp boost to
   * @param boost {@linkcode NumberHolder} holding the exp boost value
   * @returns always `true`
   */
  override apply(_pokemon: Pokemon, boost: NumberHolder): boolean {
    boost.value = Math.floor(boost.value * (1 + this.getStackCount() * this.boostMultiplier));

    return true;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 99;
  }
}

export class ExpShareModifier extends PersistentModifier {
  match(modifier: Modifier): boolean {
    return modifier instanceof ExpShareModifier;
  }

  clone(): ExpShareModifier {
    return new ExpShareModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode ExpShareModifier}
   * @returns always `true`
   */
  override apply(): boolean {
    return true;
  }

  getMaxStackCount(): number {
    return 5;
  }
}

export class ExpBalanceModifier extends PersistentModifier {
  match(modifier: Modifier): boolean {
    return modifier instanceof ExpBalanceModifier;
  }

  clone(): ExpBalanceModifier {
    return new ExpBalanceModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode ExpBalanceModifier}
   * @returns always `true`
   */
  override apply(): boolean {
    return true;
  }

  getMaxStackCount(): number {
    return 4;
  }
}

export class PokemonFriendshipBoosterModifier extends PokemonHeldItemModifier {
  public declare type: PokemonFriendshipBoosterModifierType;

  matchType(modifier: Modifier): boolean {
    return modifier instanceof PokemonFriendshipBoosterModifier;
  }

  clone(): PersistentModifier {
    return new PokemonFriendshipBoosterModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Applies {@linkcode PokemonFriendshipBoosterModifier}
   * @param _pokemon The {@linkcode Pokemon} to apply the friendship boost to
   * @param friendship {@linkcode NumberHolder} holding the friendship boost value
   * @returns always `true`
   */
  override apply(_pokemon: Pokemon, friendship: NumberHolder): boolean {
    friendship.value = Math.floor(friendship.value * (1 + 0.5 * this.getStackCount()));

    return true;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 3;
  }
}

export class PokemonNatureWeightModifier extends PokemonHeldItemModifier {
  matchType(modifier: Modifier): boolean {
    return modifier instanceof PokemonNatureWeightModifier;
  }

  clone(): PersistentModifier {
    return new PokemonNatureWeightModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Applies {@linkcode PokemonNatureWeightModifier}
   * @param _pokemon The {@linkcode Pokemon} to apply the nature weight to
   * @param multiplier {@linkcode NumberHolder} holding the nature weight
   * @returns `true` if multiplier was applied
   */
  override apply(_pokemon: Pokemon, multiplier: NumberHolder): boolean {
    if (multiplier.value !== 1) {
      multiplier.value += 0.1 * this.getStackCount() * (multiplier.value > 1 ? 1 : -1);
      return true;
    }

    return false;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 10;
  }
}

export class PokemonMoveAccuracyBoosterModifier extends PokemonHeldItemModifier {
  public declare type: PokemonMoveAccuracyBoosterModifierType;
  private accuracyAmount: number;

  constructor(type: PokemonMoveAccuracyBoosterModifierType, pokemonId: number, accuracy: number, stackCount?: number) {
    super(type, pokemonId, stackCount);
    this.accuracyAmount = accuracy;
  }

  matchType(modifier: Modifier): boolean {
    if (modifier instanceof PokemonMoveAccuracyBoosterModifier) {
      const pokemonAccuracyBoosterModifier = modifier as PokemonMoveAccuracyBoosterModifier;
      return pokemonAccuracyBoosterModifier.accuracyAmount === this.accuracyAmount;
    }
    return false;
  }

  clone(): PersistentModifier {
    return new PokemonMoveAccuracyBoosterModifier(this.type, this.pokemonId, this.accuracyAmount, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.accuracyAmount);
  }

  /**
   * Checks if {@linkcode PokemonMoveAccuracyBoosterModifier} should be applied
   * @param pokemon The {@linkcode Pokemon} to apply the move accuracy boost to
   * @param moveAccuracy {@linkcode NumberHolder} holding the move accuracy boost
   * @returns `true` if {@linkcode PokemonMoveAccuracyBoosterModifier} should be applied
   */
  override shouldApply(pokemon?: Pokemon, moveAccuracy?: NumberHolder): boolean {
    return super.shouldApply(pokemon, moveAccuracy) && !!moveAccuracy;
  }

  /**
   * Applies {@linkcode PokemonMoveAccuracyBoosterModifier}
   * @param _pokemon The {@linkcode Pokemon} to apply the move accuracy boost to
   * @param moveAccuracy {@linkcode NumberHolder} holding the move accuracy boost
   * @returns always `true`
   */
  override apply(_pokemon: Pokemon, moveAccuracy: NumberHolder): boolean {
    moveAccuracy.value += this.accuracyAmount * this.getStackCount();

    return true;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 3;
  }
}

export class PokemonMultiHitModifier extends PokemonHeldItemModifier {
  public declare type: PokemonMultiHitModifierType;

  matchType(modifier: Modifier): boolean {
    return modifier instanceof PokemonMultiHitModifier;
  }

  clone(): PersistentModifier {
    return new PokemonMultiHitModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * For each stack, converts 25 percent of attack damage into an additional strike.
   * @param pokemon The {@linkcode Pokemon} using the move
   * @param moveId The {@linkcode MoveId | identifier} for the move being used
   * @param count {@linkcode NumberHolder} holding the move's hit count for this turn
   * @param damageMultiplier {@linkcode NumberHolder} holding a damage multiplier applied to a strike of this move
   * @returns always `true`
   */
  override apply(
    pokemon: Pokemon,
    moveId: MoveId,
    count: NumberHolder | null = null,
    damageMultiplier: NumberHolder | null = null,
  ): boolean {
    const move = allMoves[moveId];
    /**
     * The move must meet Parental Bond's restrictions for this item
     * to apply. This means
     * - Only attacks are boosted
     * - Multi-strike moves, charge moves, and self-sacrificial moves are not boosted
     *   (though Multi-Lens can still affect moves boosted by Parental Bond)
     * - Multi-target moves are not boosted *unless* they can only hit a single Pokemon
     * - Fling, Uproar, Rollout, Ice Ball, and Endeavor are not boosted
     */
    if (!move.canBeMultiStrikeEnhanced(pokemon)) {
      return false;
    }

    if (count != null) {
      return this.applyHitCountBoost(count);
    }
    if (damageMultiplier != null) {
      return this.applyDamageModifier(pokemon, damageMultiplier);
    }

    return false;
  }

  /** Adds strikes to a move equal to the number of stacked Multi-Lenses */
  private applyHitCountBoost(count: NumberHolder): boolean {
    count.value += this.getStackCount();
    return true;
  }

  /**
   * If applied to the first hit of a move, sets the damage multiplier
   * equal to (1 - the number of stacked Multi-Lenses).
   * Additional strikes beyond that are given a 0.25x damage multiplier
   */
  private applyDamageModifier(pokemon: Pokemon, damageMultiplier: NumberHolder): boolean {
    if (pokemon.turnData.hitsLeft === pokemon.turnData.hitCount) {
      // Reduce first hit by 25% for each stack count
      damageMultiplier.value *= 1 - 0.25 * this.getStackCount();
      return true;
    }

    if (pokemon.turnData.hitCount - pokemon.turnData.hitsLeft !== this.getStackCount() + 1) {
      // Deal 25% damage for each remaining Multi Lens hit
      damageMultiplier.value *= 0.25;
      return true;
    }
    // An extra hit not caused by Multi Lens -- assume it is Parental Bond
    return false;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 2;
  }
}

export enum GenesectDriveKind {
  SHOCK = "SHOCK",
  BURN  = "BURN",
  CHILL = "CHILL",
  DOUSE = "DOUSE",
}

export const GENESECT_DRIVE_DATA: Record<GenesectDriveKind, {
  type: PokemonType;
  stat: Stat;
}> = {
  [GenesectDriveKind.SHOCK]: {
    type: PokemonType.ELECTRIC,
    stat: Stat.SPD,
  },
  [GenesectDriveKind.BURN]: {
    type: PokemonType.FIRE,
    stat: Stat.ATK,
  },
  [GenesectDriveKind.CHILL]: {
    type: PokemonType.ICE,
    stat: Stat.SPATK,
  },
  [GenesectDriveKind.DOUSE]: {
    type: PokemonType.WATER,
    stat: Stat.SPDEF,
  },
};

// ✅ (파일 상단/클래스 바깥) 드라이브(FormChangeItem) → GenesectDriveKind 매핑
const FORM_ITEM_TO_DRIVE: Partial<Record<FormChangeItem, GenesectDriveKind>> = {
  [FormChangeItem.SHOCK_DRIVE]: GenesectDriveKind.SHOCK,
  [FormChangeItem.BURN_DRIVE]:  GenesectDriveKind.BURN,
  [FormChangeItem.CHILL_DRIVE]: GenesectDriveKind.CHILL,
  [FormChangeItem.DOUSE_DRIVE]: GenesectDriveKind.DOUSE,
};

function getDriveKindFromFormItem(item: FormChangeItem): GenesectDriveKind | null {
  return FORM_ITEM_TO_DRIVE[item] ?? null;
}

export class PokemonFormChangeItemModifier extends PokemonHeldItemModifier {
  public declare type: FormChangeItemModifierType;
  public formChangeItem: FormChangeItem;
  public active: boolean;
  public isTransferable = false;

  constructor(
    type: FormChangeItemModifierType,
    pokemonId: number,
    formChangeItem: FormChangeItem,
    active: boolean,
    stackCount?: number,
  ) {
    super(type, pokemonId, stackCount);
    this.formChangeItem = formChangeItem;
    this.active = active;
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof PokemonFormChangeItemModifier && modifier.formChangeItem === this.formChangeItem;
  }

  clone(): PersistentModifier {
    return new PokemonFormChangeItemModifier(
      this.type,
      this.pokemonId,
      this.formChangeItem,
      this.active,
      this.stackCount,
    );
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.formChangeItem, this.active);
  }

  // ✅ 드라이브인지(= GenesectDriveKind를 가지는지) 외부에서 확인용
  getDriveKindIfAny(): GenesectDriveKind | null {
    return getDriveKindFromFormItem(this.formChangeItem);
  }

  /**
   * Applies {@linkcode PokemonFormChangeItemModifier}
   * @param pokemon The {@linkcode Pokemon} to apply the form change item to
   * @param active `true` if the form change item is active
   * @returns `true` if the form change item was applied
   */
  override apply(pokemon: Pokemon, active: boolean): boolean {
    const switchActive = this.active && !active;

    if (switchActive) {
      this.active = false;
    }

    const ret = globalScene.triggerPokemonFormChange(pokemon, SpeciesFormChangeItemTrigger);

    if (switchActive) {
      this.active = true;
    }

    return ret;
  }

  // ✅ "이번 소환" 1회 체크(위협/불요의검처럼: 교체 후 재등장하면 다시 발동)
  private hasActivatedThisSummon(pokemon: Pokemon): boolean {
    const sd: any = (pokemon as any).summonData;
    return !!sd?.genesectDriveActivated;
  }

  private setActivatedThisSummon(pokemon: Pokemon): void {
    const sd: any = (pokemon as any).summonData ??= {};
    sd.genesectDriveActivated = true;
  }

  // ✅ 게노세크트 드라이브: 등장 시 +1랭 (이번 소환 1회)
  applyGenesectDrivePostSummon(pokemon: Pokemon, simulated: boolean): void {
    if (simulated) { return; }
    if (!pokemon) { return; }
    if (pokemon.species?.speciesId !== SpeciesId.GENESECT) { return; }

    const driveKind = this.getDriveKindIfAny();
    if (!driveKind) { return; }

    // ✅ "이번 소환"에서 1회만 (교체 후 재등장하면 다시 발동)
    if (this.hasActivatedThisSummon(pokemon)) { return; }
    this.setActivatedThisSummon(pokemon);

    const stat = GENESECT_DRIVE_DATA[driveKind]?.stat;
if (stat == null) {
  console.warn("[GENESECT_DRIVE] stat missing", { driveKind });
  return;
}

globalScene.phaseManager.unshiftNew(
  "StatStageChangePhase",
  pokemon.getBattlerIndex(),
  true,
  [stat],
  1,
);
  }

  // ✅ 게노세크트 드라이브: 최종 타입 기준 위력 1.5배 (상시)
  applyGenesectDrivePowerBoost(
    pokemon: Pokemon,
    finalType: PokemonType,
    power: NumberHolder,
    simulated: boolean,
  ): void {
    if (!pokemon) { return; }
    if (pokemon.species?.speciesId !== SpeciesId.GENESECT) { return; }

    const driveKind = this.getDriveKindIfAny();
    if (!driveKind) { return; }

    const driveType = GENESECT_DRIVE_DATA[driveKind].type;

    if (finalType === driveType) {
      const before = power.value;
      power.value *= 1.5;

      if (!simulated) {
        console.log("[FORM_DRIVE_POWER] applied", {
          pokemon: pokemon.name,
          formChangeItem: FormChangeItem[this.formChangeItem],
          driveKind,
          driveType,
          finalType,
          powerBefore: before,
          powerAfter: power.value,
        });
      }
    }
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

export class MoneyRewardModifier extends ConsumableModifier {
  private moneyMultiplier: number;

  constructor(type: ModifierType, moneyMultiplier: number) {
    super(type);

    this.moneyMultiplier = moneyMultiplier;
  }

  /**
   * Applies {@linkcode MoneyRewardModifier}
   * @returns always `true`
   */
  override apply(): boolean {
    const moneyAmount = new NumberHolder(globalScene.getWaveMoneyAmount(this.moneyMultiplier));

    globalScene.applyModifiers(MoneyMultiplierModifier, true, moneyAmount);

    globalScene.addMoney(moneyAmount.value);

    globalScene.getPlayerParty().map(p => {
      if (p.species?.speciesId === SpeciesId.GIMMIGHOUL || p.fusionSpecies?.speciesId === SpeciesId.GIMMIGHOUL) {
        const factor = Math.min(Math.floor(this.moneyMultiplier), 3);
        const modifier = getModifierType(modifierTypes.EVOLUTION_TRACKER_GIMMIGHOUL).newModifier(
          p,
          factor,
        ) as EvoTrackerModifier;
        globalScene.addModifier(modifier);
      }
    });

    return true;
  }
}

export class MoneyMultiplierModifier extends PersistentModifier {
  match(modifier: Modifier): boolean {
    return modifier instanceof MoneyMultiplierModifier;
  }

  clone(): MoneyMultiplierModifier {
    return new MoneyMultiplierModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode MoneyMultiplierModifier}
   * @param multiplier {@linkcode NumberHolder} holding the money multiplier value
   * @returns always `true`
   */
  override apply(multiplier: NumberHolder): boolean {
    multiplier.value += Math.floor(multiplier.value * 0.2 * this.getStackCount());

    return true;
  }

  getMaxStackCount(): number {
    return 5;
  }
}

export class DamageMoneyRewardModifier extends PokemonHeldItemModifier {
  matchType(modifier: Modifier): boolean {
    return modifier instanceof DamageMoneyRewardModifier;
  }

  clone(): DamageMoneyRewardModifier {
    return new DamageMoneyRewardModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Applies {@linkcode DamageMoneyRewardModifier}
   * @param pokemon The {@linkcode Pokemon} attacking
   * @param multiplier {@linkcode NumberHolder} holding the multiplier value
   * @returns always `true`
   */
  override apply(_pokemon: Pokemon, multiplier: NumberHolder): boolean {
    const moneyAmount = new NumberHolder(Math.floor(multiplier.value * (0.5 * this.getStackCount())));
    globalScene.applyModifiers(MoneyMultiplierModifier, true, moneyAmount);
    if ((globalScene.currentBattle as any)?.isPracticeBattle) {
  const result =
    (globalScene as any).practiceTurnResult;

  if (result) {
    result.moneyFactors ??= [];

    const gained =
      Math.floor(moneyAmount.value);

    if (gained > 0) {
      result.moneyFactors.push(
        `골든펀치 +${gained}`,
      );

      result.moneyGained =
        Number.isFinite(
          Number(result.moneyGained),
        )
          ? Number(result.moneyGained)
          : 0;

      result.moneyGained += gained;
    }
  }
}
    globalScene.addMoney(moneyAmount.value);

    return true;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 5;
  }
}

export class MoneyInterestModifier extends PersistentModifier {
  match(modifier: Modifier): boolean {
    return modifier instanceof MoneyInterestModifier;
  }

  /**
   * Applies {@linkcode MoneyInterestModifier}
   * @returns always `true`
   */
  override apply(): boolean {
    const interestAmount = Math.floor(globalScene.money * 0.1 * this.getStackCount());
    globalScene.addMoney(interestAmount);

    const userLocale = navigator.language || "en-US";
    const formattedMoneyAmount = interestAmount.toLocaleString(userLocale);
    const message = i18next.t("modifier:moneyInterestApply", {
      moneyAmount: formattedMoneyAmount,
      typeName: this.type.name,
    });
    globalScene.phaseManager.queueMessage(message, undefined, true);

    return true;
  }

  clone(): MoneyInterestModifier {
    return new MoneyInterestModifier(this.type, this.stackCount);
  }

  getMaxStackCount(): number {
    return 3;
  }
}

export class HiddenAbilityRateBoosterModifier extends PersistentModifier {
  match(modifier: Modifier): boolean {
    return modifier instanceof HiddenAbilityRateBoosterModifier;
  }

  clone(): HiddenAbilityRateBoosterModifier {
    return new HiddenAbilityRateBoosterModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode HiddenAbilityRateBoosterModifier}
   * @param boost {@linkcode NumberHolder} holding the boost value
   * @returns always `true`
   */
  override apply(boost: NumberHolder): boolean {
    boost.value *= Math.pow(2, -1 - this.getStackCount());

    return true;
  }

  getMaxStackCount(): number {
    return 4;
  }
}

export class ShinyRateBoosterModifier extends PersistentModifier {
  match(modifier: Modifier): boolean {
    return modifier instanceof ShinyRateBoosterModifier;
  }

  clone(): ShinyRateBoosterModifier {
    return new ShinyRateBoosterModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode ShinyRateBoosterModifier}
   * @param boost {@linkcode NumberHolder} holding the boost value
   * @returns always `true`
   */
  override apply(boost: NumberHolder): boolean {
    boost.value *= Math.pow(2, 1 + this.getStackCount());

    return true;
  }

  getMaxStackCount(): number {
    return 4;
  }
}

export class MarkRateBoosterModifier extends PersistentModifier {
  match(modifier: Modifier): boolean {
    return modifier instanceof MarkRateBoosterModifier;
  }

  clone(): MarkRateBoosterModifier {
    return new MarkRateBoosterModifier(
      this.type,
      this.stackCount,
    );
  }

  /**
   * 증표가 붙은 야생 포켓몬의 출현 확률을 증가시킨다.
   *
   * 1개 = 2배
   * 2개 = 4배
   * 3개 = 8배
   * 4개 = 16배
   */
  override apply(boost: NumberHolder): boolean {
    boost.value *= Math.pow(
      2,
      this.getStackCount(),
    );

    return true;
  }

  getMaxStackCount(): number {
    return 4;
  }
}

export class CriticalCatchChanceBoosterModifier extends PersistentModifier {
  match(modifier: Modifier): boolean {
    return modifier instanceof CriticalCatchChanceBoosterModifier;
  }

  clone(): CriticalCatchChanceBoosterModifier {
    return new CriticalCatchChanceBoosterModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode CriticalCatchChanceBoosterModifier}
   * @param boost {@linkcode NumberHolder} holding the boost value
   * @returns always `true`
   */
  override apply(boost: NumberHolder): boolean {
    // 1 stack: 2x
    // 2 stack: 2.5x
    // 3 stack: 3x
    boost.value *= 1.5 + this.getStackCount() / 2;

    return true;
  }

  getMaxStackCount(): number {
    return 3;
  }
}

export class LockModifierTiersModifier extends PersistentModifier {
  match(modifier: Modifier): boolean {
    return modifier instanceof LockModifierTiersModifier;
  }

  /**
   * Applies {@linkcode LockModifierTiersModifier}
   * @returns always `true`
   */
  override apply(): boolean {
    return true;
  }

  clone(): LockModifierTiersModifier {
    return new LockModifierTiersModifier(this.type, this.stackCount);
  }

  getMaxStackCount(): number {
    return 1;
  }
}

/**
 * Black Sludge item
 */
export class HealShopCostModifier extends PersistentModifier {
  public readonly shopMultiplier: number;

  constructor(type: ModifierType, shopMultiplier: number, stackCount?: number) {
    super(type, stackCount);

    this.shopMultiplier = shopMultiplier ?? 2.5;
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof HealShopCostModifier;
  }

  clone(): HealShopCostModifier {
    return new HealShopCostModifier(this.type, this.shopMultiplier, this.stackCount);
  }

  /**
   * Applies {@linkcode HealShopCostModifier}
   * @param cost {@linkcode NumberHolder} holding the heal shop cost
   * @returns always `true`
   */
  apply(moneyCost: NumberHolder): boolean {
    moneyCost.value = Math.floor(moneyCost.value * this.shopMultiplier);

    return true;
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.shopMultiplier);
  }

  getMaxStackCount(): number {
    return 1;
  }
}

export class BoostBugSpawnModifier extends PersistentModifier {
  match(modifier: Modifier): boolean {
    return modifier instanceof BoostBugSpawnModifier;
  }

  clone(): BoostBugSpawnModifier {
    return new BoostBugSpawnModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode BoostBugSpawnModifier}
   * @returns always `true`
   */
  override apply(): boolean {
    return true;
  }

  getMaxStackCount(): number {
    return 1;
  }
}

export class SwitchEffectTransferModifier extends PokemonHeldItemModifier {
  matchType(modifier: Modifier): boolean {
    return modifier instanceof SwitchEffectTransferModifier;
  }

  clone(): SwitchEffectTransferModifier {
    return new SwitchEffectTransferModifier(this.type, this.pokemonId, this.stackCount);
  }

  /**
   * Applies {@linkcode SwitchEffectTransferModifier}
   * @returns always `true`
   */
  override apply(): boolean {
    return true;
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }
}

/**
 * Abstract class for held items that steal other Pokemon's items.
 * @see {@linkcode TurnHeldItemTransferModifier}
 * @see {@linkcode ContactHeldItemTransferChanceModifier}
 */
export abstract class HeldItemTransferModifier extends PokemonHeldItemModifier {
  /**
   * Determines the targets to transfer items from when this applies.
   * @param pokemon the {@linkcode Pokemon} holding this item
   * @param _args N/A
   * @returns the opponents of the source {@linkcode Pokemon}
   */
  getTargets(pokemon?: Pokemon, ..._args: unknown[]): Pokemon[] {
    return pokemon?.getOpponents?.() ?? [];
  }

  /**
   * Steals an item, chosen randomly, from a set of target Pokemon.
   * @param pokemon The {@linkcode Pokemon} holding this item
   * @param target The {@linkcode Pokemon} to steal from (optional)
   * @param _args N/A
   * @returns `true` if an item was stolen; false otherwise.
   */
  override apply(pokemon: Pokemon, target?: Pokemon, ..._args: unknown[]): boolean {
    const opponents = this.getTargets(pokemon, target);

    if (opponents.length === 0) {
      return false;
    }

    const targetPokemon = opponents[pokemon.randBattleSeedInt(opponents.length)];

    const transferredItemCount = this.getTransferredItemCount();
    if (!transferredItemCount) {
      return false;
    }

    const transferredModifierTypes: ModifierType[] = [];
    const itemModifiers = globalScene.findModifiers(
      m => m instanceof PokemonHeldItemModifier && m.pokemonId === targetPokemon.id && m.isTransferable,
      targetPokemon.isPlayer(),
    ) as PokemonHeldItemModifier[];

    for (let i = 0; i < transferredItemCount; i++) {
      if (itemModifiers.length === 0) {
        break;
      }
      const randItemIndex = pokemon.randBattleSeedInt(itemModifiers.length);
      const randItem = itemModifiers[randItemIndex];
      if (globalScene.tryTransferHeldItemModifier(randItem, pokemon, false)) {
        transferredModifierTypes.push(randItem.type);
        itemModifiers.splice(randItemIndex, 1);
      }
    }

    for (const mt of transferredModifierTypes) {
      globalScene.phaseManager.queueMessage(this.getTransferMessage(pokemon, targetPokemon, mt));
    }

    return  transferredModifierTypes.length > 0;
  }

  abstract getTransferredItemCount(): number;

  abstract getTransferMessage(pokemon: Pokemon, targetPokemon: Pokemon, item: ModifierType): string;
}

/**
 * Modifier for held items that steal items from the enemy at the end of
 * each turn.
 * @see {@linkcode modifierTypes[MINI_BLACK_HOLE]}
 */
export class TurnHeldItemTransferModifier extends HeldItemTransferModifier {
  isTransferable = true;

  matchType(modifier: Modifier): boolean {
    return modifier instanceof TurnHeldItemTransferModifier;
  }

  clone(): TurnHeldItemTransferModifier {
    return new TurnHeldItemTransferModifier(this.type, this.pokemonId, this.stackCount);
  }

  getTransferredItemCount(): number {
    return this.getStackCount();
  }

  getTransferMessage(pokemon: Pokemon, targetPokemon: Pokemon, item: ModifierType): string {
    return i18next.t("modifier:turnHeldItemTransferApply", {
      pokemonNameWithAffix: getPokemonNameWithAffix(targetPokemon),
      itemName: item.name,
      pokemonName: pokemon.getNameToRender(),
      typeName: this.type.name,
    });
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 1;
  }

  setTransferrableFalse(): void {
    this.isTransferable = false;
  }
}

/**
 * Modifier for held items that add a chance to steal items from the target of a
 * successful attack.
 * @see {@linkcode modifierTypes[GRIP_CLAW]}
 * @see {@linkcode HeldItemTransferModifier}
 */
export class ContactHeldItemTransferChanceModifier extends HeldItemTransferModifier {
  public readonly chance: number;

  constructor(type: ModifierType, pokemonId: number, chancePercent: number, stackCount?: number) {
    super(type, pokemonId, stackCount);

    this.chance = chancePercent / 100;
  }

  /**
   * Determines the target to steal items from when this applies.
   * @param _holderPokemon The {@linkcode Pokemon} holding this item
   * @param targetPokemon The {@linkcode Pokemon} the holder is targeting with an attack
   * @returns The target {@linkcode Pokemon} as array for further use in `apply` implementations
   */
  override getTargets(_holderPokemon: Pokemon, targetPokemon: Pokemon): Pokemon[] {
    return targetPokemon ? [targetPokemon] : [];
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof ContactHeldItemTransferChanceModifier;
  }

  clone(): ContactHeldItemTransferChanceModifier {
    return new ContactHeldItemTransferChanceModifier(this.type, this.pokemonId, this.chance * 100, this.stackCount);
  }

  getArgs(): any[] {
    return super.getArgs().concat(this.chance * 100);
  }

  getTransferredItemCount(): number {
    return randSeedFloat() <= this.chance * this.getStackCount() ? 1 : 0;
  }

  getTransferMessage(pokemon: Pokemon, targetPokemon: Pokemon, item: ModifierType): string {
    return i18next.t("modifier:contactHeldItemTransferApply", {
      pokemonNameWithAffix: getPokemonNameWithAffix(targetPokemon),
      itemName: item.name,
      pokemonName: getPokemonNameWithAffix(pokemon),
      typeName: this.type.name,
    });
  }

  getMaxHeldItemCount(_pokemon: Pokemon): number {
    return 5;
  }
}

export class IvScannerModifier extends PersistentModifier {
  constructor(type: ModifierType, _stackCount?: number) {
    super(type);
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof IvScannerModifier;
  }

  clone(): IvScannerModifier {
    return new IvScannerModifier(this.type);
  }

  /**
   * Applies {@linkcode IvScannerModifier}
   * @returns always `true`
   */
  override apply(): boolean {
    return true; //Dude are you kidding me
  }

  getMaxStackCount(): number {
    return 1;
  }
}

export class ExtraModifierModifier extends PersistentModifier {
  match(modifier: Modifier): boolean {
    return modifier instanceof ExtraModifierModifier;
  }

  clone(): ExtraModifierModifier {
    return new ExtraModifierModifier(this.type, this.stackCount);
  }

  /**
   * Applies {@linkcode ExtraModifierModifier}
   * @param count {NumberHolder} holding the count value
   * @returns always `true`
   */
  override apply(count: NumberHolder): boolean {
    count.value += this.getStackCount();

    return true;
  }

  getMaxStackCount(): number {
    return 3;
  }
}

/**
 * Modifier used for timed boosts to the player's shop item rewards.
 * @extends LapsingPersistentModifier
 * @see {@linkcode apply}
 */
export class TempExtraModifierModifier extends LapsingPersistentModifier {
  /**
   * Goes through existing modifiers for any that match Silver Pokeball,
   * which will then add the max count of the new item to the existing count of the current item.
   * If no existing Silver Pokeballs are found, will add a new one.
   * @param modifiers {@linkcode PersistentModifier} array of the player's modifiers
   * @param _virtual N/A
   * @returns true if the modifier was successfully added or applied, false otherwise
   */
  add(modifiers: PersistentModifier[], _virtual: boolean): boolean {
    for (const modifier of modifiers) {
      if (this.match(modifier)) {
        const modifierInstance = modifier as TempExtraModifierModifier;
        const newBattleCount = this.getMaxBattles() + modifierInstance.getBattleCount();

        modifierInstance.setNewBattleCount(newBattleCount);
        globalScene.playSound("se/restore");
        return true;
      }
    }

    modifiers.push(this);
    return true;
  }

  clone() {
    return new TempExtraModifierModifier(this.type, this.getMaxBattles(), this.getBattleCount(), this.stackCount);
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof TempExtraModifierModifier;
  }

  /**
   * Increases the current rewards in the battle by the `stackCount`.
   * @returns `true` if the shop reward number modifier applies successfully
   * @param count {@linkcode NumberHolder} that holds the resulting shop item reward count
   */
  apply(count: NumberHolder): boolean {
    count.value += this.getStackCount();
    return true;
  }
}

export abstract class EnemyPersistentModifier extends PersistentModifier {
  getMaxStackCount(): number {
    return 5;
  }
}

abstract class EnemyDamageMultiplierModifier extends EnemyPersistentModifier {
  protected damageMultiplier: number;

  constructor(type: ModifierType, damageMultiplier: number, stackCount?: number) {
    super(type, stackCount);

    this.damageMultiplier = damageMultiplier;
  }

  /**
   * Applies {@linkcode EnemyDamageMultiplierModifier}
   * @param multiplier {NumberHolder} holding the multiplier value
   * @returns always `true`
   */
  override apply(multiplier: NumberHolder): boolean {
    multiplier.value = toDmgValue(multiplier.value * Math.pow(this.damageMultiplier, this.getStackCount()));

    return true;
  }

  getMaxStackCount(): number {
    return 99;
  }
}

export class EnemyDamageBoosterModifier extends EnemyDamageMultiplierModifier {
  constructor(type: ModifierType, _boostPercent: number, stackCount?: number) {
    //super(type, 1 + ((boostPercent || 10) * 0.01), stackCount);
    super(type, 1.05, stackCount); // Hardcode multiplier temporarily
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof EnemyDamageBoosterModifier;
  }

  clone(): EnemyDamageBoosterModifier {
    return new EnemyDamageBoosterModifier(this.type, (this.damageMultiplier - 1) * 100, this.stackCount);
  }

  getArgs(): any[] {
    return [(this.damageMultiplier - 1) * 100];
  }

  getMaxStackCount(): number {
    return 20;
  }
}

export class EnemyDamageReducerModifier extends EnemyDamageMultiplierModifier {
  constructor(type: ModifierType, _reductionPercent: number, stackCount?: number) {
    //super(type, 1 - ((reductionPercent || 5) * 0.01), stackCount);
    super(type, 0.975, stackCount); // Hardcode multiplier temporarily
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof EnemyDamageReducerModifier;
  }

  clone(): EnemyDamageReducerModifier {
    return new EnemyDamageReducerModifier(this.type, (1 - this.damageMultiplier) * 100, this.stackCount);
  }

  getArgs(): any[] {
    return [(1 - this.damageMultiplier) * 100];
  }

  getMaxStackCount(): number {
  return 40;
  }
}

export class EnemyTurnHealModifier extends EnemyPersistentModifier {
  public healPercent: number;

  constructor(type: ModifierType, _healPercent: number, stackCount?: number) {
    super(type, stackCount);

    // Hardcode temporarily
    this.healPercent = 2;
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof EnemyTurnHealModifier;
  }

  clone(): EnemyTurnHealModifier {
    return new EnemyTurnHealModifier(this.type, this.healPercent, this.stackCount);
  }

  getArgs(): any[] {
    return [this.healPercent];
  }

  /**
   * Applies {@linkcode EnemyTurnHealModifier}
   * @param enemyPokemon The {@linkcode Pokemon} to heal
   * @returns `true` if the {@linkcode Pokemon} was healed
   */
  override apply(enemyPokemon: Pokemon): boolean {
    if (!enemyPokemon.isFullHp()) {
      globalScene.phaseManager.unshiftNew(
        "PokemonHealPhase",
        enemyPokemon.getBattlerIndex(),
        Math.max(Math.floor(enemyPokemon.getMaxHp() / (100 / this.healPercent)) * this.stackCount, 1),
        i18next.t("modifier:enemyTurnHealApply", {
          pokemonNameWithAffix: getPokemonNameWithAffix(enemyPokemon),
        }),
        true,
        false,
        false,
        false,
        true,
      );
      return true;
    }

    return false;
  }

  getMaxStackCount(): number {
    return 10;
  }
}

export class EnemyAttackStatusEffectChanceModifier extends EnemyPersistentModifier {
  public effect: StatusEffect;
  public chance: number;

  constructor(type: ModifierType, effect: StatusEffect, _chancePercent: number, stackCount?: number) {
    super(type, stackCount);

    this.effect = effect;
    // Hardcode temporarily
    this.chance = 0.025 * (this.effect === StatusEffect.BURN || this.effect === StatusEffect.POISON ? 2 : 1);
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof EnemyAttackStatusEffectChanceModifier && modifier.effect === this.effect;
  }

  clone(): EnemyAttackStatusEffectChanceModifier {
    return new EnemyAttackStatusEffectChanceModifier(this.type, this.effect, this.chance * 100, this.stackCount);
  }

  getArgs(): any[] {
    return [this.effect, this.chance * 100];
  }

  /**
   * Applies {@linkcode EnemyAttackStatusEffectChanceModifier}
   * @param enemyPokemon {@linkcode Pokemon} to apply the status effect to
   * @returns `true` if the {@linkcode Pokemon} was affected
   */
  override apply(enemyPokemon: Pokemon): boolean {
    if (randSeedFloat() <= this.chance * this.getStackCount()) {
      return enemyPokemon.trySetStatus(this.effect);
    }

    return false;
  }

  getMaxStackCount(): number {
    return 10;
  }
}

export class EnemyStatusEffectHealChanceModifier extends EnemyPersistentModifier {
  public chance: number;

  constructor(type: ModifierType, _chancePercent: number, stackCount?: number) {
    super(type, stackCount);

    //Hardcode temporarily
    this.chance = 0.025;
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof EnemyStatusEffectHealChanceModifier;
  }

  clone(): EnemyStatusEffectHealChanceModifier {
    return new EnemyStatusEffectHealChanceModifier(this.type, this.chance * 100, this.stackCount);
  }

  getArgs(): any[] {
    return [this.chance * 100];
  }

  /**
   * Applies {@linkcode EnemyStatusEffectHealChanceModifier} to randomly heal status.
   * @param enemyPokemon - The {@linkcode Pokemon} to heal
   * @returns `true` if the {@linkcode Pokemon} was healed
   */
  override apply(enemyPokemon: Pokemon): boolean {
    if (!enemyPokemon.status || randSeedFloat() > this.chance * this.getStackCount()) {
      return false;
    }

    globalScene.phaseManager.queueMessage(
      getStatusEffectHealText(enemyPokemon.status.effect, getPokemonNameWithAffix(enemyPokemon)),
    );
    enemyPokemon.resetStatus();
    enemyPokemon.updateInfo();
    return true;
  }

  getMaxStackCount(): number {
    return 10;
  }
}

export class EnemyEndureChanceModifier extends EnemyPersistentModifier {
  public chance: number;

  constructor(type: ModifierType, _chancePercent?: number, stackCount?: number) {
    super(type, stackCount || 10);

    //Hardcode temporarily
    this.chance = 0;
  }

  match(modifier: Modifier) {
    return modifier instanceof EnemyEndureChanceModifier;
  }

  clone() {
    return new EnemyEndureChanceModifier(this.type, this.chance, this.stackCount);
  }

  getArgs(): any[] {
    return [this.chance];
  }

  /**
   * Applies a chance of enduring a lethal hit of an attack
   * @param target the {@linkcode Pokemon} to apply the {@linkcode BattlerTagType.ENDURING} chance to
   * @returns `true` if {@linkcode Pokemon} endured
   */
  override apply(target: Pokemon): boolean {
    if (target.waveData.endured || target.randBattleSeedInt(100) >= this.chance * this.getStackCount()) {
      return false;
    }

    target.addTag(BattlerTagType.ENDURE_TOKEN, 1);

    target.waveData.endured = true;

    return true;
  }

  getMaxStackCount(): number {
    return 10;
  }
}

export class EnemyFusionChanceModifier extends EnemyPersistentModifier {
  private chance: number;

  constructor(type: ModifierType, chancePercent: number, stackCount?: number) {
    super(type, stackCount);

    this.chance = chancePercent / 100;
  }

  match(modifier: Modifier) {
    return modifier instanceof EnemyFusionChanceModifier && modifier.chance === this.chance;
  }

  clone() {
    return new EnemyFusionChanceModifier(this.type, this.chance * 100, this.stackCount);
  }

  getArgs(): any[] {
    return [this.chance * 100];
  }

  /**
   * Applies {@linkcode EnemyFusionChanceModifier}
   * @param isFusion {@linkcode BooleanHolder} that will be set to `true` if the {@linkcode EnemyPokemon} is a fusion
   * @returns `true` if the {@linkcode EnemyPokemon} is a fusion
   */
  override apply(isFusion: BooleanHolder): boolean {
    if (randSeedFloat() > this.chance * this.getStackCount()) {
      return false;
    }

    isFusion.value = true;

    return true;
  }

  getMaxStackCount(): number {
    return 10;
  }
}

/**
 * Uses either `MODIFIER_OVERRIDE` in overrides.ts to set {@linkcode PersistentModifier}s for either:
 *  - The player
 *  - The enemy
 * @param isPlayer {@linkcode boolean} for whether the player (`true`) or enemy (`false`) is being overridden
 */
export function overrideModifiers(isPlayer = true): void {
  const modifiersOverride: ModifierOverride[] = isPlayer
    ? Overrides.STARTING_MODIFIER_OVERRIDE
    : Overrides.ENEMY_MODIFIER_OVERRIDE;
  if (!modifiersOverride || modifiersOverride.length === 0 || !globalScene) {
    return;
  }

  // If it's the opponent, clear all of their current modifiers to avoid stacking
  if (!isPlayer) {
    globalScene.clearEnemyModifiers();
  }

  for (const item of modifiersOverride) {
    const modifierFunc = modifierTypes[item.name];
    let modifierType: ModifierType | null = modifierFunc();

    if (modifierType.is("ModifierTypeGenerator")) {
      const pregenArgs = "type" in item && item.type !== null ? [item.type] : undefined;
      modifierType = modifierType.generateType([], pregenArgs);
    }

    const modifier = modifierType && (modifierType.withIdFromFunc(modifierFunc).newModifier() as PersistentModifier);
    if (modifier) {
      modifier.stackCount = item.count || 1;

      if (isPlayer) {
        globalScene.addModifier(modifier, true, false, false, true);
      } else {
        globalScene.addEnemyModifier(modifier, true, true);
      }
    }
  }
}

/**
 * Uses either `HELD_ITEMS_OVERRIDE` in overrides.ts to set {@linkcode PokemonHeldItemModifier}s for either:
 *  - The first member of the player's team when starting a new game
 *  - An enemy {@linkcode Pokemon} being spawned in
 * @param pokemon {@linkcode Pokemon} whose held items are being overridden
 * @param isPlayer {@linkcode boolean} for whether the {@linkcode pokemon} is the player's (`true`) or an enemy (`false`)
 */
export function overrideHeldItems(pokemon: Pokemon, isPlayer = true): void {
  const heldItemsOverride: ModifierOverride[] = isPlayer
    ? Overrides.STARTING_HELD_ITEMS_OVERRIDE
    : Overrides.ENEMY_HELD_ITEMS_OVERRIDE;
  if (!heldItemsOverride || heldItemsOverride.length === 0 || !globalScene) {
    return;
  }

  if (!isPlayer) {
    globalScene.clearEnemyHeldItemModifiers(pokemon);
  }

  for (const item of heldItemsOverride) {
    const modifierFunc = modifierTypes[item.name];
    let modifierType: ModifierType | null = modifierFunc();
    const qty = item.count || 1;

    if (modifierType.is("ModifierTypeGenerator")) {
      const pregenArgs = "type" in item && item.type !== null ? [item.type] : undefined;
      modifierType = modifierType.generateType([], pregenArgs);
    }

    const heldItemModifier =
      modifierType && (modifierType.withIdFromFunc(modifierFunc).newModifier(pokemon) as PokemonHeldItemModifier);
    if (heldItemModifier) {
      heldItemModifier.pokemonId = pokemon.id;
      heldItemModifier.stackCount = qty;
      if (isPlayer) {
        globalScene.addModifier(heldItemModifier, true, false, false, true);
      } else {
        globalScene.addEnemyModifier(heldItemModifier, true, true);
      }
    }
  }
}

/**
 * Private map from modifier strings to their constructors.
 *
 * @remarks
 * Used for {@linkcode Modifier.is} to check if a modifier is of a certain type without
 * requiring modifier types to be imported in every file.
 */
export const ModifierClassMap = Object.freeze({
  PersistentModifier,
  ConsumableModifier,
  AddPokeballModifier,
  AddVoucherModifier,
  LapsingPersistentModifier,
  DoubleBattleChanceBoosterModifier,
  TempStatStageBoosterModifier,
  TempCritBoosterModifier,
  MapModifier,
  MegaEvolutionAccessModifier,
  GigantamaxAccessModifier,
  TerastallizeAccessModifier,
  PokemonHeldItemModifier,
  LapsingPokemonHeldItemModifier,
  BaseStatModifier,
  EvoTrackerModifier,
  PokemonBaseStatTotalModifier,
  PokemonBaseStatFlatModifier,
  PokemonIncrementingStatModifier,
  StatBoosterModifier,
  SpeciesStatBoosterModifier,
  CritBoosterModifier,
  SpeciesCritBoosterModifier,
  SpeciesFormHeldItemModifier,
  UrshifuGloveAbilityBypassModifier,
  SurviveDamageModifier,
  BypassSpeedChanceModifier,
  FlinchChanceModifier,
  TurnHealModifier,
  TurnStatusEffectModifier,
  HitHealModifier,
  LevelIncrementBoosterModifier,
  BerryModifier,
  PreserveBerryModifier,
  PokemonInstantReviveModifier,
  ResetNegativeStatStageModifier,
  FieldEffectModifier,
  ConsumablePokemonModifier,
  TerastallizeModifier,
  PokemonHpRestoreModifier,
  PokemonStatusHealModifier,
  ConsumablePokemonMoveModifier,
  PokemonPpRestoreModifier,
  PokemonAllMovePpRestoreModifier,
  PokemonPpUpModifier,
  PokemonNatureChangeModifier,
  PokemonLevelIncrementModifier,
  TmModifier,
  RememberMoveModifier,
  EvolutionItemModifier,
  FusePokemonModifier,
  EggHatchSpeedUpModifier,
  HealingBoosterModifier,
  ExpBoosterModifier,
  PokemonExpBoosterModifier,
  ExpShareModifier,
  ExpBalanceModifier,
  PokemonFriendshipBoosterModifier,
  PokemonNatureWeightModifier,
  PokemonMoveAccuracyBoosterModifier,
  PokemonMultiHitModifier,
  PokemonFormChangeItemModifier,
  MoneyRewardModifier,
  DamageMoneyRewardModifier,
  MoneyInterestModifier,
  HiddenAbilityRateBoosterModifier,
  ShinyRateBoosterModifier,
  MarkRateBoosterModifier,
  CriticalCatchChanceBoosterModifier,
  LockModifierTiersModifier,
  HealShopCostModifier,
  BoostBugSpawnModifier,
  SwitchEffectTransferModifier,
  HeldItemTransferModifier,
  TurnHeldItemTransferModifier,
  ContactHeldItemTransferChanceModifier,
  IvScannerModifier,
  ExtraModifierModifier,
  TempExtraModifierModifier,
  EnemyPersistentModifier,
  EnemyDamageMultiplierModifier,
  EnemyDamageBoosterModifier,
  EnemyDamageReducerModifier,
  EnemyTurnHealModifier,
  EnemyAttackStatusEffectChanceModifier,
  EnemyStatusEffectHealChanceModifier,
  EnemyEndureChanceModifier,
  EnemyFusionChanceModifier,
  MoneyMultiplierModifier,
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
  AttackTypeBoosterModifier
});

export type ModifierConstructorMap = typeof ModifierClassMap;
