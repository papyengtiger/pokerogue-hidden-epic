/**
 * `BattlerTag`s are used to represent semi-persistent effects attached to individual Pokemon.
 *
 * During serialization, a new blank tag object is created, before its `loadTag` is called
 * with the object that was serialized. \
 * This makes it fairly straightforward to avoid serializing fields — anything not set in the class constructor
 * or the tag's `loadTag` method will not be serialized.
 *
 * Any battler tag that can persist across waves (meaning it lasts longer than 1 turn)
 * **must extend `SerializableBattlerTag`** in its class definition signature.
 *
 * `SerializableBattlerTag`s have strict requirements for their fields:
 * - Properties that are not necessary to reconstruct the tag **must not be serialized**
 *   This can be accomplished by using {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements | private elements}
 *   and/or {@link https://www.typescriptlang.org/docs/handbook/2/classes.html#getters--setters | `getters`}. \
 *   Note that `getter`s do not need to be tied to a class field, for example:
 *   ```ts
 *   class Example {
 *     public get thing(): number {
 *       return 5;
 *     }
 *   }
 *   ```
 *
 * - If a property that is intended to be "private" should be serialized, it **must**
 *   be declared as `public readonly` instead.
 *   Then, in the `loadTag` method (or any internal method that needs to adjust the property),
 *   use a cast to `Mutable<this>` (such as `(this as Mutable<this>).propertyName = value`). \
 *   This ensures that Typescript is aware of the shape of the serialized version of the class.
 *
 * - If any new serializable fields _are_ added, then the class **must** override the
 *   `loadTag` method to set the new fields. \
 *   Its signature must match the example below:
 *   ```ts
 *   class ExampleTag extends SerializableBattlerTag {
 *     // Example, if we add 2 new fields that should be serialized:
 *     public a: string;
 *     public b: number;
 *     // Then we must also define a loadTag method with one of the following signatures:
 *     // This signature should be used if the class has no subclasses:
 *     public override loadTag(source: BaseBattlerTag & Pick<ExampleTag, "tagType" | "a" | "b"): void;
 *     // This signature should be used if the class has any subclasses:
 *     public override loadTag<const T extends this>(source: BaseBattlerTag & Pick<T, "tagType" | "a" | "b">): void {
 *       this.a = source.a;
 *       this.b = source.b;
 *     }
 *   }
 *   ```
 * @module
 */

import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { blocksNonDirectDamage } from "#abilities/block-non-direct-damage";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import Overrides from "#app/overrides";
import { CommonBattleAnim, MoveChargeAnim } from "#data/battle-anims";
import { allAbilities, allMoves } from "#data/data-lists";
import { SpeciesFormChangeAbilityTrigger } from "#data/form-change-triggers";
import { getStatusEffectHealText } from "#data/status-effect";
import { TerrainType } from "#data/terrain";
import { AbilityId } from "#enums/ability-id";
import type { BattlerIndex } from "#enums/battler-index";
import { BattlerTagLapseType, type NonCustomBattlerTagLapseType } from "#enums/battler-tag-lapse-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { HitResult } from "#enums/hit-result";
import { ChargeAnim, CommonAnim } from "#enums/move-anims-common";
import { MoveCategory } from "#enums/move-category";
import { MoveFlags } from "#enums/move-flags";
import { MoveId } from "#enums/move-id";
import { MoveResult } from "#enums/move-result";
import { MoveUseMode } from "#enums/move-use-mode";
import { PokemonAnimType } from "#enums/pokemon-anim-type";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { type BattleStat, EFFECTIVE_STATS, type EffectiveStat, getStatKey, Stat } from "#enums/stat";
import { StatusEffect } from "#enums/status-effect";
import { WeatherType } from "#enums/weather-type";
import type { Pokemon } from "#field/pokemon";
import { applyMoveAttrs } from "#moves/apply-attrs";
import type { Move } from "#moves/move";
import type { MoveEffectPhase } from "#phases/move-effect-phase";
import type { MovePhase } from "#phases/move-phase";
import type { StatStageChangeCallback } from "#phases/stat-stage-change-phase";
import type {
  AbilityBattlerTagType,
  BattlerTagData,
  ContactSetStatusProtectedTagType,
  ContactStatStageChangeProtectedTagType,
  CritStageBoostTagType,
  DamageProtectedTagType,
  EndureTagType,
  HighestStatBoostTagType,
  MoveRestrictionBattlerTagType,
  RemovedTypeTagType,
  SemiInvulnerableTagType,
  TrappingBattlerTagType,
  TypeBoostTagType,
} from "#types/battler-tags";
import type { Mutable } from "#types/type-helpers";
import { coerceArray } from "#utils/array";
import { BooleanHolder, getFrameMs, NumberHolder, toDmgValue } from "#utils/common";
import { toCamelCase } from "#utils/strings";
import i18next from "i18next";
import {
  ExclusiveZMoveAccessModifier,
  GenericZMoveAccessModifier,
  MentalHerbModifier,
  PokemonMultiHitModifier,
  SpeciesStatBoosterModifier,
} from "../modifier/modifier";

/** Interface containing the serializable fields of `BattlerTag` */
interface BaseBattlerTag {
  /** The tag's remaining duration. */
  // TODO: Add support for omitting `turnCount`
  turnCount: number;
  /** The {@linkcode MoveId} that created this tag, or `undefined` if not set by a move. */
  sourceMove?: MoveId;
  /** The {@linkcode Pokemon.id | PID} of the Pokemon that added this tag, or `undefined` if not set by a Pokemon. */
  sourceId?: number;
}

/**
 * A {@linkcode BattlerTag} represents a semi-persistent effect that can be attached to a {@linkcode Pokemon}.
 * Tags can trigger various effects throughout a turn, and are cleared on switching out
 * or through their respective {@linkcode BattlerTag.lapse | lapse} methods.
 */
export class BattlerTag implements BaseBattlerTag {
  public readonly tagType: BattlerTagType;

  public turnCount: number;
  public sourceMove?: MoveId;
  public sourceId?: number;

  //#region non-serializable fields
  // Fields that should never be serialized, as they must not change after instantiation
  #isBatonPassable = false;
  public get isBatonPassable(): boolean {
    return this.#isBatonPassable;
  }

  #lapseTypes: readonly [BattlerTagLapseType, ...BattlerTagLapseType[]];
  /**
   * The set of lapse types that this tag can be automatically lapsed with.
   * If this is exclusively {@linkcode BattlerTagLapseType.CUSTOM}, then the tag can only ever be lapsed
   * manually via {@linkcode Pokemon.lapseTag} (or calling the tag's lapse method directly)
   */
  public get lapseTypes(): readonly BattlerTagLapseType[] {
    return this.#lapseTypes;
  }
  //#endregion non-serializable fields

  constructor(
    tagType: BattlerTagType,
    lapseType: BattlerTagLapseType | [NonCustomBattlerTagLapseType, ...NonCustomBattlerTagLapseType[]],
    turnCount: number,
    sourceMove?: MoveId,
    sourceId?: number,
    isBatonPassable = false,
  ) {
    this.tagType = tagType;
    this.#lapseTypes = coerceArray(lapseType);
    this.turnCount = turnCount;
    // We intentionally don't want to set source move to `MoveId.NONE` here, so a raw boolean comparison is OK.
    // TODO: Rework tags passing `MoveId.NONE` to instead pass `undefined` for consistency
    if (sourceMove) {
      this.sourceMove = sourceMove;
    }
    this.sourceId = sourceId;
    this.#isBatonPassable = isBatonPassable;
  }

  canAdd(_pokemon: Pokemon): boolean {
    return true;
  }

  /**
   * Apply effects that occur when the tag is added to a {@linkcode Pokemon}
   * @param _pokemon - The {@linkcode Pokemon} the tag was added to
   */
  onAdd(_pokemon: Pokemon): void {}

  onRemove(_pokemon: Pokemon): void {}

  onOverlap(_pokemon: Pokemon): void {}

  /**
   * Apply the battler tag's effects based on the lapse type
   *
   * @remarks
   * Generally, this involves ticking down the tag's duration. The tag also initiates the effects it is responsbile for
   * @param _pokemon - The {@linkcode Pokemon} whom this tag belongs to.
   * Unused by default but can be used by subclasses.
   * @param _lapseType - The {@linkcode BattlerTagLapseType} being lapsed.
   * Unused by default but can be used by subclasses.
   * @returns `true` if the tag should be kept (`turnCount` > 0`)
   */
  lapse(_pokemon: Pokemon, _lapseType: BattlerTagLapseType): boolean {
    return --this.turnCount > 0;
  }

  getDescriptor(): string {
    return "";
  }

  isSourceLinked(): boolean {
    return false;
  }

  getMoveName(): string | null {
    return this.sourceMove ? allMoves[this.sourceMove].name : null;
  }

  /**
   * Load the data for a given {@linkcode BattlerTag} or JSON representation thereof.
   * Should be inherited from by any battler tag with custom attributes.
   * @param source - An object containing the fields needed to reconstruct this tag
   */
  public loadTag<const T extends this>(source: BaseBattlerTag & Pick<T, "tagType">): void {
    this.turnCount = source.turnCount;
    this.sourceMove = source.sourceMove;
    this.sourceId = source.sourceId;
  }

  /**
   * Helper function that retrieves the source Pokemon object
   * @returns The source {@linkcode Pokemon}, or `undefined` if none is found
   */
  public getSourcePokemon(): Pokemon | undefined {
    return globalScene.getPokemonById(this.sourceId);
  }
}

export class SerializableBattlerTag extends BattlerTag {
  /**
   * Nonexistent, dummy field to allow typescript to distinguish this class from `BattlerTag`.
   *
   * @remarks
   * Does not exist at runtime, so must not be used!
   */
  private declare __SerializableBattlerTag: never;
}

/**
 * Interface for a generic serializable battler tag, i.e. one that does not have a
 * dedicated subclass.
 *
 * @remarks
 * Used to ensure type safety when serializing battler tags,
 * allowing Typescript to properly infer the type of the tag.
 * @see BattlerTagTypeMap
 */
interface GenericSerializableBattlerTag<T extends BattlerTagType> extends SerializableBattlerTag {
  tagType: T;
}

/**
 * Base class for tags that restrict the usage of moves. This effect is generally referred to as "disabling" a move
 * in-game (not to be confused with {@linkcode MoveId.DISABLE}).
 *
 * Descendants can override {@linkcode isMoveRestricted} to restrict moves that
 * match a condition. A restricted move gets cancelled before it is used.
 * Players and enemies should not be allowed to select restricted moves.
 * @todo Require descendant subclasses to inherit a `PRE_MOVE` lapse type
 */
export abstract class MoveRestrictionBattlerTag extends SerializableBattlerTag {
  public declare readonly tagType: MoveRestrictionBattlerTagType;
  override lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType !== BattlerTagLapseType.PRE_MOVE) {
      return super.lapse(pokemon, lapseType);
    }

    // Cancel the affected pokemon's selected move
    const phase = globalScene.phaseManager.getCurrentPhase() as MovePhase;
    const move = phase.move;

    if (this.isMoveRestricted(move.moveId, pokemon)) {
      if (this.interruptedText(pokemon, move.moveId)) {
        globalScene.phaseManager.queueMessage(this.interruptedText(pokemon, move.moveId));
      }
      phase.cancel();
    }

    return true;
  }

  /**
   * Determine whether a move's usage is restricted by this tag
   *
   * @param move - The {@linkcode MoveId} being checked
   * @param user - The {@linkcode Pokemon} involved
   * @returns `true` if the move is restricted by this tag, otherwise `false`.
   */
  public abstract isMoveRestricted(move: MoveId, user?: Pokemon): boolean;

  /**
   * Check if this tag is restricting a move based on a user's decisions during the target selection phase
   *
   * @param _move - {@linkcode MoveId} to check restriction for
   * @param _user - The user of the move
   * @param _target - The pokemon targeted by the move
   * @returns Whether the move is restricted by this tag
   */
  isMoveTargetRestricted(_move: MoveId, _user: Pokemon, _target: Pokemon): boolean {
    return false;
  }

  /**
   * Get the text to display when the player attempts to select a move that is restricted by this tag.
   *
   * @param pokemon - The pokemon for which the player is attempting to select the restricted move
   * @param move - The {@linkcode MoveId | ID} of the Move that is having its selection denied
   * @returns The text to display when the player attempts to select the restricted move
   */
  abstract selectionDeniedText(pokemon: Pokemon, move: MoveId): string;

  /**
   * Gets the text to display when a move's execution is prevented as a result of the restriction.
   * Because restriction effects also prevent selection of the move, this situation can only arise if a
   * pokemon first selects a move, then gets outsped by a pokemon using a move that restricts the selected move.
   *
   * @param _pokemon - The pokemon attempting to use the restricted move
   * @param _move - The {@linkcode MoveId | ID} of the move being interrupted
   * @returns The text to display when the move is interrupted
   */
  interruptedText(_pokemon: Pokemon, _move: MoveId): string {
    return "";
  }
}

/**
 * Tag representing the "Throat Chop" effect. Pokemon with this tag cannot use sound-based moves.
 * @see {@link https://bulbapedia.bulbagarden.net/wiki/Throat_Chop_(move) | Throat Chop}
 * @sealed
 */
export class ThroatChoppedTag extends MoveRestrictionBattlerTag {
  public override readonly tagType = BattlerTagType.THROAT_CHOPPED;
  constructor() {
    super(BattlerTagType.THROAT_CHOPPED, BattlerTagLapseType.TURN_END, 2, MoveId.THROAT_CHOP);
  }

  /**
   * Check if a move is restricted by Throat Chop.
   * @param move - The {@linkcode MoveId | ID } of the move to check for sound-based restriction
   * @returns Whether the move is sound based
   */
  override isMoveRestricted(move: MoveId): boolean {
    return allMoves[move].hasFlag(MoveFlags.SOUND_BASED);
  }

  /**
   * Shows a message when the player attempts to select a move that is restricted by Throat Chop.
   * @param _pokemon - The {@linkcode Pokemon} that is attempting to select the restricted move
   * @param move - The {@linkcode MoveId | move} that is being restricted
   * @returns The message to display when the player attempts to select the restricted move
   */
  override selectionDeniedText(_pokemon: Pokemon, move: MoveId): string {
    return i18next.t("battle:moveCannotBeSelected", {
      moveName: allMoves[move].name,
    });
  }

  /**
   * Shows a message when a move is interrupted by Throat Chop.
   * @param pokemon - The interrupted {@linkcode Pokemon}
   * @param _move - The {@linkcode MoveId | ID } of the move that was interrupted
   * @returns The message to display when the move is interrupted
   */
  override interruptedText(pokemon: Pokemon, _move: MoveId): string {
    return i18next.t("battle:throatChopInterruptedMove", {
      pokemonName: getPokemonNameWithAffix(pokemon),
    });
  }
}

export class BideTag extends SerializableBattlerTag {
  public damage = 0;
  public lastAttackerId: number | null = null;

  private processedTurn = -1;
  private processedCount = 0;
  private seenKeysByTurn: Map<number, Set<string>> = new Map();

  constructor(sourceMove?: MoveId, sourceId?: number) {
    super(
      BattlerTagType.BIDE,
      [BattlerTagLapseType.PRE_MOVE, BattlerTagLapseType.AFTER_HIT, BattlerTagLapseType.TURN_END],
      2,
      sourceMove ?? MoveId.BIDE,
      sourceId,
    );
  }

  public override loadTag<const T extends this>(
    source: BattlerTag & Pick<T, "tagType" | "damage" | "lastAttackerIndex">,
  ): void {
    super.loadTag(source);
    this.damage = (source as any).damage ?? 0;
    this.lastAttackerIndex = (source as any).lastAttackerIndex ?? null;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    // ✅ 지금 겪는 undefined 문제 “즉시” 차단
    if (this.turnCount == null) {
      console.log("[BIDE][ADD] turnCount was nullish -> force 2");
      this.turnCount = 2;
    }

    this.processedTurn = globalScene.currentBattle.turn;
    this.processedCount = 0;

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:bideOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );

    console.log(
      "[BIDE][ADD]",
      `turn=${globalScene.currentBattle.turn}`,
      `turnCount=${this.turnCount}`,
      `owner=${pokemon.getName()}`,
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    console.log(
      "[BIDE][LAPSE]",
      `pokemon=${pokemon.getName()}`,
      `type=${BattlerTagLapseType[lapseType]}`,
      `turn=${globalScene.currentBattle.turn}`,
      `turnCount(before)=${this.turnCount}`,
      `damage=${this.damage}`,
      `lastAttacker=${this.lastAttackerIndex}`,
    );

    if (lapseType === BattlerTagLapseType.PRE_MOVE) {
      const phase: any = globalScene.phaseManager.getCurrentPhase?.();
      console.log("[BIDE][PRE_MOVE] cancel", `phase=${phase?.phaseName}`);
      phase?.cancel?.();

      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:bideHolding", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );

      return true;
    }

    if (lapseType === BattlerTagLapseType.AFTER_HIT) {
      const curTurn = globalScene.currentBattle.turn;
      const attacks = pokemon.turnData.attacksReceived ?? [];

      // ✅ 턴이 바뀌면 processedCount 초기화
      if (this.processedTurn !== curTurn) {
        this.processedTurn = curTurn;
        this.processedCount = 0;
      }

      // ✅ "이번 AFTER_HIT 호출에서만" 중복 제거 (턴 누적은 정상 유지)
      const seenThisCall = new Set<string>();

      for (let i = this.processedCount; i < attacks.length; i++) {
        const atk: any = attacks[i];
        const dmg = atk?.damage ?? 0;
        if (dmg <= 0) {
          continue;
        }

        // 같은 턴의 같은 히트가 2번 들어오는 것만 제거
        const key = `${atk?.sourceId ?? "?"}|${atk?.move ?? "?"}|${dmg}|${atk?.result ?? "?"}`;

        if (seenThisCall.has(key)) {
          console.log("[BIDE][AFTER_HIT] dup skip", `turn=${curTurn}`, `key=${key}`, `idx=${i}`);
          continue;
        }
        seenThisCall.add(key);

        this.damage += dmg;
        this.lastAttackerId = atk?.sourceId ?? this.lastAttackerId;

        console.log(
          "[BIDE][AFTER_HIT] accumulate",
          `turn=${curTurn}`,
          `idx=${i}`,
          `+${dmg}`,
          `total=${this.damage}`,
          `attackerId=${this.lastAttackerId}`,
        );
      }

      this.processedCount = attacks.length;
      return true;
    }

    if (lapseType === BattlerTagLapseType.TURN_END) {
      const keep = super.lapse(pokemon, lapseType);

      console.log("[BIDE][TURN_END]", `turnCount(after)=${this.turnCount}`, `keep=${keep}`);

      if (!keep) {
        console.log("[BIDE][RELEASE_TRIGGER]");
        this.release(pokemon);
        return false;
      }

      return true;
    }

    return true;
  }

  private release(pokemon: Pokemon) {
    console.log("[BIDE][RELEASE] start", `damage=${this.damage}`, `lastAttackerId=${this.lastAttackerId}`);

    if (this.damage <= 0 || this.lastAttackerId == null) {
      return;
    }

    const target = globalScene.getPokemonById(this.lastAttackerId);
    if (!target || target.isFainted()) {
      return;
    }
    if (target.isOnField && !target.isOnField()) {
      return;
    }

    const base = toDmgValue(this.damage * 2);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:bideRelease", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );

    // -------------------------
    // ✅ 1) "반격 타수"와 "추가타 배율" 계산
    // -------------------------
    // strikeMultipliers[0] = 1 (첫타 100%), 이후는 추가타 배율들
    const strikeMultipliers: number[] = [1];

    // (A) 부자유친: 반격에만 2타째 추가
    //  - 당신 엔진에서 Parental Bond의 2타 배율이 무엇인지(0.25/0.5)는 여기 상수로 맞추거나,
    //    ability attr에서 읽어올 수 있으면 그걸 사용하세요.
    const hasParentalBond = pokemon.hasAbilityWithAttr?.("AddSecondStrikeAbAttr");
    if (hasParentalBond) {
      const PB_SECOND_MULT = 0.5; // ✅ 엔진 설정값에 맞춰 조정(본가 SM계열은 보통 0.25)
      strikeMultipliers.push(PB_SECOND_MULT);
    }

    // (B) 멀티렌즈(PokemonMultiHitModifier): 반격에만 추가타/배율 적용
    //  - 보통 이 modifier는 hitCount와 multiplier를 건드리므로, "반격용 가짜 hitCount"를 만들어 계산만 빼옵니다.
    const hitCount = new NumberHolder(1);
    const lensMultiplier = new NumberHolder(1);

    // PokemonMultiHitModifier가 hitCount를 늘려주는 구조라면, 아래처럼 호출
    globalScene.applyModifiers(
      PokemonMultiHitModifier,
      pokemon.isPlayer(),
      pokemon,
      MoveId.BIDE, // ✅ "반격"이 BIDE로 취급되게(아이템 판정용)
      hitCount,
      lensMultiplier,
    );

    // hitCount가 1보다 커졌다면, "추가타"를 더 넣어줌
    // - 여기서는 단순히 "추가된 타수만큼" 같은 배율(lensMultiplier)을 넣는 방식
    // - 만약 멀티렌즈가 타수별 배율이 다르다면, modifier 설계에 맞춰 분기해 주세요.
    if (hitCount.value > 1) {
      const extraHits = hitCount.value - 1;
      for (let i = 0; i < extraHits; i++) {
        strikeMultipliers.push(lensMultiplier.value);
      }
    }

    console.log("[BIDE][RELEASE] strikePlan", strikeMultipliers);

    // -------------------------
    // ✅ 2) 계획대로 여러 번 나눠서 반격
    // -------------------------
    for (let i = 0; i < strikeMultipliers.length; i++) {
      const mult = strikeMultipliers[i];
      const dmg = toDmgValue(base * mult);

      console.log(`[BIDE][RELEASE] hit#${i + 1}`, `mult=${mult}`, `dmg=${dmg}`);

      target.damageAndUpdate(dmg, {
        source: pokemon,
        result: HitResult.EFFECTIVE,
        ignoreSegments: true,
        // move를 넣고 싶으면:
        // move: allMoves[MoveId.BIDE],
        // moveType: PokemonType.NORMAL,
      });

      if (target.isFainted()) {
        break; // ✅ 중간에 기절하면 추가타 중단
      }
    }

    pokemon.clearStatus();
  }

  private getBattlerByIndex(index: number): Pokemon | undefined {
    const playerField = globalScene.getPlayerField() as (Pokemon | undefined)[];
    const enemyField = globalScene.getEnemyField() as (Pokemon | undefined)[];

    if (index < playerField.length) {
      return playerField[index];
    }
    const enemyIndex = index - playerField.length;
    return enemyField[enemyIndex];
  }
}

/**
 * Tag representing the "disabling" effect performed by {@linkcode MoveId.DISABLE} and {@linkcode AbilityId.CURSED_BODY}.
 * When the tag is added, the last-used move of the tag holder is set as the disabled move.
 *
 * @sealed
 */
export class DisabledTag extends MoveRestrictionBattlerTag {
  private moveId: Moves = MoveId.NONE;

  constructor(sourceId: number) {
    super(
      BattlerTagType.DISABLED,
      [BattlerTagLapseType.PRE_MOVE, BattlerTagLapseType.TURN_END],
      4,
      MoveId.DISABLE,
      sourceId,
    );
  }

  override canAdd(pokemon: Pokemon): boolean {
    return pokemon.canAddTag?.(BattlerTagType.DISABLED) ?? true;
  }

  override onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (!pokemon.getTag(BattlerTagType.DISABLED)) {
      return;
    }

    console.log("DisabledTag added to Pokemon:", getPokemonNameWithAffix(pokemon));

    const mentalHerb = pokemon.getHeldItems?.().find(item => item instanceof MentalHerbModifier) as
      | MentalHerbModifier
      | undefined;

    if (mentalHerb) {
      const removed = mentalHerb.apply(pokemon);
      if (removed) {
        return;
      }
    }

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:disabledOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        moveName: allMoves[this.moveId].name,
      }),
    );
  }

  override lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (ret && lapseType === BattlerTagLapseType.TURN_END) {
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:disabledLapse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          moveName: allMoves[this.moveId].name,
        }),
      );
    }

    return ret;
  }

  override selectionDeniedText(_pokemon: Pokemon, move: Moves): string {
    return i18next.t("battle:moveDisabled", { moveName: allMoves[move].name });
  }

  override interruptedText(pokemon: Pokemon, move: Moves): string {
    return i18next.t("battle:disableInterruptedMove", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      moveName: allMoves[move].name,
    });
  }

  override isMoveRestricted(moveId: Moves, pokemon?: Pokemon): boolean {
    return moveId === this.moveId;
  }

  override loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.moveId = source.moveId;
  }
}

/**
 * Tag used by Gorilla Tactics to restrict the user to using only one move.
 *
 * @sealed
 */
export class GorillaTacticsTag extends MoveRestrictionBattlerTag {
  public override readonly tagType = BattlerTagType.GORILLA_TACTICS;
  public readonly moveId: MoveId = MoveId.NONE;

  constructor() {
    super(BattlerTagType.GORILLA_TACTICS, BattlerTagLapseType.CUSTOM, 0);
  }

  private resolveMoveId(move: any): MoveId {
    return (move?.moveId ?? move?.move ?? move?.id ?? move) as MoveId;
  }

  override canAdd(_pokemon: Pokemon): boolean {
    return true;
  }

  override onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    console.log("[GORILLA_TAG_ADD_CALLED]", pokemon.name);

    const lastMove = pokemon.getLastNonVirtualMove?.();

    (this as Mutable<GorillaTacticsTag>).moveId = lastMove?.move ?? MoveId.NONE;

    console.log("[GORILLA_TAG_ADD]", {
      pokemon: pokemon.name,
      lockedMove: this.moveId,
    });
  }

  override isMoveRestricted(move: MoveId | any, _user?: Pokemon): boolean {
    const moveId = this.resolveMoveId(move);

    console.log("[GORILLA_CHECK]", {
      input: move,
      resolved: moveId,
      lockedMove: this.moveId,
    });

    if (!moveId || moveId === MoveId.NONE || moveId === MoveId.STRUGGLE) {
      return false;
    }

    if (this.moveId === MoveId.NONE) {
      (this as Mutable<GorillaTacticsTag>).moveId = moveId;

      console.log("[GORILLA_LOCKED]", {
        moveId,
        moveName: allMoves[moveId]?.name,
      });

      return false;
    }

    const restricted = moveId !== this.moveId;

    console.log("[GORILLA_RESTRICT_CHECK]", {
      inputMove: moveId,
      lockedMove: this.moveId,
      restricted,
    });

    return restricted;
  }

  override isMoveTargetRestricted(move: MoveId | any, _user: Pokemon, _target: Pokemon): boolean {
    return this.isMoveRestricted(move);
  }

  public override loadTag(source: BaseBattlerTag & Pick<GorillaTacticsTag, "tagType" | "moveId">): void {
    super.loadTag(source);
    (this as Mutable<GorillaTacticsTag>).moveId = source.moveId;
  }

  override selectionDeniedText(pokemon: Pokemon): string {
    return i18next.t("battle:canOnlyUseMove", {
      moveName: allMoves[this.moveId]?.name ?? "",
      pokemonName: getPokemonNameWithAffix(pokemon),
    });
  }
}

/**
 * BattlerTag that represents the "recharge" effects of moves like Hyper Beam.
 */
export class RechargingTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.RECHARGING;
  constructor(sourceMove: MoveId) {
    super(BattlerTagType.RECHARGING, [BattlerTagLapseType.PRE_MOVE, BattlerTagLapseType.TURN_END], 2, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    // Queue a placeholder move for the Pokemon to "use" next turn.
    pokemon.pushMoveQueue({ move: MoveId.NONE, targets: [], useMode: MoveUseMode.NORMAL });
  }

  /** Cancels the source's move this turn and queues a "__ must recharge!" message */
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.PRE_MOVE) {
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:rechargingLapse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );
      const currentPhase = globalScene.phaseManager.getCurrentPhase();
      if (currentPhase.is("MovePhase")) {
        currentPhase.cancel();
      }
      pokemon.getMoveQueue().shift();
    }
    return super.lapse(pokemon, lapseType);
  }
}

/**
 * BattlerTag representing the "charge phase" of Beak Blast.
 * Pokemon with this tag will inflict BURN status on any attacker that makes contact.
 * @see {@link https://bulbapedia.bulbagarden.net/wiki/Beak_Blast_(move) | Beak Blast}
 */
export class BeakBlastChargingTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.BEAK_BLAST_CHARGING;
  public declare readonly sourceMove: MoveId.BEAK_BLAST;
  constructor() {
    super(
      BattlerTagType.BEAK_BLAST_CHARGING,
      [BattlerTagLapseType.PRE_MOVE, BattlerTagLapseType.TURN_END, BattlerTagLapseType.AFTER_HIT],
      1,
      MoveId.BEAK_BLAST,
    );
  }

  onAdd(pokemon: Pokemon): void {
    // Play Beak Blast's charging animation
    new MoveChargeAnim(ChargeAnim.BEAK_BLAST_CHARGING, this.sourceMove, pokemon).play();

    // Queue Beak Blast's header message
    globalScene.phaseManager.queueMessage(
      i18next.t("moveTriggers:startedHeatingUpBeak", {
        pokemonName: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  /**
   * Inflicts `BURN` status on attackers that make contact, and causes this tag
   * to be removed after the source makes a move (or the turn ends, whichever comes first)
   * @param pokemon - The owner of this tag
   * @param lapseType - The type of functionality invoked in battle
   * @returns `true` if invoked with the `AFTER_HIT` lapse type
   */
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.AFTER_HIT) {
      const phaseData = getMoveEffectPhaseData(pokemon);
      if (
        phaseData?.move.doesFlagEffectApply({
          flag: MoveFlags.MAKES_CONTACT,
          user: phaseData.attacker,
          target: pokemon,
        })
      ) {
        phaseData.attacker.trySetStatus(StatusEffect.BURN, pokemon);
      }
      return true;
    }
    return super.lapse(pokemon, lapseType);
  }
}

/**
 * BattlerTag implementing Shell Trap's pre-move behavior.
 * Pokemon with this tag will act immediately after being hit by a physical move.
 * @see {@link https://bulbapedia.bulbagarden.net/wiki/Shell_Trap_(move) | Shell Trap}
 */
export class ShellTrapTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.SHELL_TRAP;
  public activated = false;

  constructor() {
    super(BattlerTagType.SHELL_TRAP, [BattlerTagLapseType.TURN_END, BattlerTagLapseType.AFTER_HIT], 1);
  }

  onAdd(pokemon: Pokemon): void {
    globalScene.phaseManager.queueMessage(
      i18next.t("moveTriggers:setUpShellTrap", {
        pokemonName: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  /**
   * "Activates" the shell trap, causing the tag owner to move next.
   * @param pokemon - The owner of this tag
   * @param lapseType - The type of functionality invoked in battle
   * @returns `true` if invoked with the `AFTER_HIT` lapse type
   */
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.AFTER_HIT) {
      const phaseData = getMoveEffectPhaseData(pokemon);

      // Trap should only be triggered by opponent's Physical moves
      if (phaseData?.move.category === MoveCategory.PHYSICAL && pokemon.isOpponent(phaseData.attacker)) {
        globalScene.phaseManager.forceMoveNext((phase: MovePhase) => phase.pokemon === pokemon);
        this.activated = true;
      }

      return true;
    }

    return super.lapse(pokemon, lapseType);
  }
}

export class TrappedTag extends SerializableBattlerTag {
  public declare readonly tagType: TrappingBattlerTagType;
  constructor(
    tagType: BattlerTagType,
    lapseType: BattlerTagLapseType,
    turnCount: number,
    sourceMove: MoveId,
    sourceId: number,
  ) {
    super(tagType, lapseType, turnCount, sourceMove, sourceId, true);
  }

  canAdd(pokemon: Pokemon): boolean {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for TrappedTag canAdd; id: ${this.sourceId}`);
      return false;
    }
    if (this.sourceMove && allMoves[this.sourceMove]?.hitsSubstitute(source, pokemon)) {
      return false;
    }
    const isGhost = pokemon.isOfType(PokemonType.GHOST);
    const isTrapped = pokemon.getTag(TrappedTag);

    return !isTrapped && !isGhost;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(this.getTrapMessage(pokemon));
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:trappedOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        moveName: this.getMoveName(),
      }),
    );
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:trappedDesc");
  }

  isSourceLinked(): boolean {
    return true;
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:trappedOnAdd", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
    });
  }
}

/**
 * BattlerTag implementing No Retreat's trapping effect.
 * This is treated separately from other trapping effects to prevent
 * Ghost-type Pokemon from being able to reuse the move.
 */
class NoRetreatTag extends TrappedTag {
  public override readonly tagType = BattlerTagType.NO_RETREAT;
  constructor(sourceId: number) {
    super(BattlerTagType.NO_RETREAT, BattlerTagLapseType.CUSTOM, 0, MoveId.NO_RETREAT, sourceId);
  }

  /** overrides {@linkcode TrappedTag.apply}, removing the Ghost-type condition */
  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.getTag(TrappedTag);
  }
}

/**
 * BattlerTag that represents the {@link https://bulbapedia.bulbagarden.net/wiki/Flinch Flinch} status condition
 */
export class FlinchedTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.FLINCHED;

  constructor(sourceMove: MoveId) {
    // ✅ PRE_MOVE로 변경
    super(BattlerTagType.FLINCHED, BattlerTagLapseType.TURN_END, 1, sourceMove);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.PRE_MOVE) {
      const currentPhase = globalScene.phaseManager.getCurrentPhase();
      if (currentPhase.is("MovePhase")) {
        currentPhase.cancel();
      }

      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:flinchedLapse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );

      applyAbAttrs("FlinchEffectAbAttr", { pokemon });

      // ✅ 발동했으니 태그 제거
      return false;
    }

    return super.lapse(pokemon, lapseType);
  }
}

export class SnatchReadyTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.SNATCH_READY;

  constructor(sourceMove: MoveId) {
    // TURN_END에 자동 제거, turnCount=1
    super(BattlerTagType.SNATCH_READY, BattlerTagLapseType.TURN_END, 1, sourceMove);
  }
}

export class MeFirstInterruptedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.CUSTOM_ME_FIRST_INTERRUPTED as any;

  constructor(
    public readonly interruptedMove: MoveId,
    public readonly snatcherBattlerIndex: number,
  ) {
    // ✅ TURN_END 말고 PRE_MOVE로!
    super(BattlerTagType.CUSTOM_ME_FIRST_INTERRUPTED as any, BattlerTagLapseType.PRE_MOVE, 1, MoveId.ME_FIRST);
  }

  override lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType !== BattlerTagLapseType.PRE_MOVE) {
      return true;
    }

    const phase = globalScene.phaseManager.getCurrentPhase();
    if (!phase?.is?.("MovePhase")) {
      return true;
    }

    const mp = phase as any as MovePhase;

    // 엔진에 따라 mp.move가 PokemonMove일 가능성이 높음:
    const moveId: MoveId | undefined = (mp.move?.moveId ?? mp.move?.move ?? mp.move?.id) as any;

    if (mp.pokemon?.id === pokemon.id && moveId === this.interruptedMove) {
      globalScene.phaseManager.queueMessage(i18next.t("battle:attackFailed"));

      // 네 엔진에서 있는 걸로 골라 써
      mp.fail?.();
      mp.cancel?.();
      mp.end?.();

      return false; // ✅ 발동 후 태그 제거
    }

    return true;
  }
}

export class InterruptedTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.INTERRUPTED;
  constructor(sourceMove: MoveId) {
    super(BattlerTagType.INTERRUPTED, BattlerTagLapseType.PRE_MOVE, 0, sourceMove);
  }

  canAdd(pokemon: Pokemon): boolean {
    return !!pokemon.getTag(BattlerTagType.FLYING);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.getMoveQueue().shift();
    pokemon.pushMoveHistory({
      move: MoveId.NONE,
      result: MoveResult.OTHER,
      targets: [],
      useMode: MoveUseMode.NORMAL,
    });
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const currentPhase = globalScene.phaseManager.getCurrentPhase();
    if (currentPhase.is("MovePhase")) {
      currentPhase.cancel();
    }
    return super.lapse(pokemon, lapseType);
  }
}

/**
 * BattlerTag that represents the {@link https://bulbapedia.bulbagarden.net/wiki/Confusion_(status_condition) Confusion} status condition
 */
export class ConfusedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.CONFUSED;

  private sourceId?: number; // ✅ 누가 혼란을 걸었는지

  constructor(turnCount: number, sourceMove: MoveId, sourceId?: number) {
    super(BattlerTagType.CONFUSED, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId, false);

    this.sourceId = sourceId;
  }

  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceId = source.sourceId;
  }

  canAdd(pokemon: Pokemon): boolean {
    const blockedByTerrain = pokemon.isGrounded() && globalScene.arena.terrain?.terrainType === TerrainType.MISTY;
    if (blockedByTerrain) {
      pokemon.queueStatusImmuneMessage(false, TerrainType.MISTY);
      return false;
    }
    return true;
  }

  onAdd(pokemon: Pokemon): void {
    const src = this.sourceId != null ? globalScene.getPokemonById(this.sourceId) : null;
    super.onAdd(pokemon);

    globalScene.phaseManager.unshiftNew("CommonAnimPhase", pokemon.getBattlerIndex(), undefined, CommonAnim.CONFUSION);
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:confusedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:confusedOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  onOverlap(pokemon: Pokemon): void {
    super.onOverlap(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:confusedOnOverlap", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  /**
   * Tick down the confusion duration and, if there are remaining turns, activate the confusion effect
   *
   * @remarks
   * Handles playing the confusion animation, displaying the message(s), rolling for self-damage, and cancelling the
   * move phase if the user hurts itself.
   * @param pokemon - The pokemon with this tag
   * @param lapseType - The lapse type
   * @returns `true` if the tag should remain active (i.e. `turnCount` > 0)
   */
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    // Duration is only ticked down for PRE_MOVE lapse type
    const shouldLapse = lapseType === BattlerTagLapseType.PRE_MOVE && super.lapse(pokemon, lapseType);

    if (!shouldLapse) {
      return false;
    }

    const phaseManager = globalScene.phaseManager;

    phaseManager.queueMessage(
      i18next.t("battlerTags:confusedLapse", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
    phaseManager.unshiftNew("CommonAnimPhase", pokemon.getBattlerIndex(), undefined, CommonAnim.CONFUSION);

    // ✅ defender = 혼란 상태인 포켓몬(=자해할 수 있는 포켓몬)
    const defender = pokemon;

    // ✅ 독/맹독 여부
    const eff = (defender as any).status?.effect ?? (defender as any).statusEffect;
    const isPoisoned = eff === StatusEffect.POISON || eff === StatusEffect.TOXIC;

    // ✅ 혼란을 건 포켓몬 찾기
    const source = this.sourceId != null ? globalScene.getPokemonById(this.sourceId) : null;

    // ✅ source가 환상복슝 들고 있는지 체크
    let hasMythicalPecha = false;
    if (source) {
      const srcMods = source.getHeldItems?.() ?? [];
      hasMythicalPecha = srcMods.some(
        m =>
          m instanceof SpeciesStatBoosterModifier
          && m.hasMatchingSpecies(source)
          && m.getKey?.() === "MYTHICAL_PECHA_BERRY",
      );
    }

    // ✅ 조건이 만족될 때만 강화 적용
    const pechaBoostActive = isPoisoned && hasMythicalPecha;

    // ✅ 자해 확률: (독/맹독 && 공격자 환상복슝) => 1/2, 아니면 1/3
    const denom = pechaBoostActive ? 2 : 3;

    const selfHit = defender.randBattleSeedInt(denom) === 0 || Overrides.CONFUSION_ACTIVATION_OVERRIDE === true;

    if (selfHit) {
      const atkCompare = defender.getCategoryCompareStat(Stat.ATK);
      const spaCompare = defender.getCategoryCompareStat(Stat.SPATK);

      const usePhysical = atkCompare >= spaCompare;

      const offenseStat = usePhysical ? defender.getEffectiveStat(Stat.ATK) : defender.getEffectiveStat(Stat.SPATK);

      const defenseStat = usePhysical ? defender.getEffectiveStat(Stat.DEF) : defender.getEffectiveStat(Stat.SPDEF);

      let damage = toDmgValue(
        ((((2 * defender.level) / 5 + 2) * 40 * offenseStat) / defenseStat / 50 + 2)
          * (defender.randBattleSeedIntRange(85, 100) / 100),
      );

      // ✅ 자해 대미지: (독/맹독 && 공격자 환상복슝)일 때만 ×2
      if (pechaBoostActive) {
        const before = damage;
        damage = toDmgValue(damage * 2);
      }

      phaseManager.queueMessage(i18next.t("battlerTags:confusedLapseHurtItself"));
      defender.damageAndUpdate(damage, { result: HitResult.CONFUSION });

      const currentPhase = phaseManager.getCurrentPhase();
      if (currentPhase.is("MovePhase") && currentPhase.pokemon === defender) {
        currentPhase.cancel();
      }
    }

    return true;
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:confusedDesc");
  }
}

/**
 * Tag applied to the {@linkcode Move.DESTINY_BOND} user.
 * @see {@linkcode apply}
 */
export class DestinyBondTag extends SerializableBattlerTag {
  public readonly tagType = BattlerTagType.DESTINY_BOND;
  constructor(sourceMove: MoveId, sourceId: number) {
    super(BattlerTagType.DESTINY_BOND, BattlerTagLapseType.PRE_MOVE, 1, sourceMove, sourceId, true);
  }

  /**
   * Lapses either before the user's move and does nothing
   * or after receiving fatal damage. When the damage is fatal,
   * the attacking Pokemon is taken down as well, unless it's a boss.
   *
   * @param pokemon - The Pokemon that is attacking the Destiny Bond user.
   * @param lapseType - CUSTOM or PRE_MOVE
   * @returns `false` if the tag source fainted or one turn has passed since the application
   */
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType !== BattlerTagLapseType.CUSTOM) {
      return super.lapse(pokemon, lapseType);
    }

    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for DestinyBondTag lapse; id: ${this.sourceId}`);
      return false;
    }

    // Destiny bond stays active until the user faints
    if (!source.isFainted()) {
      return true;
    }

    // Don't kill allies or opposing bosses.
    if (source.getAlly() === pokemon) {
      return false;
    }

    if (pokemon.isBossImmune()) {
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:destinyBondLapseIsBoss", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );
      return false;
    }

    // Drag the foe down with the user
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:destinyBondLapse", {
        pokemonNameWithAffix: getPokemonNameWithAffix(source),
        pokemonNameWithAffix2: getPokemonNameWithAffix(pokemon),
      }),
    );
    pokemon.damageAndUpdate(pokemon.hp, { result: HitResult.INDIRECT_KO, ignoreSegments: true });
    return false;
  }
}

// Technically serializable as in a double battle, a pokemon could be infatuated by its ally
export class InfatuatedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.INFATUATED;

  constructor(sourceMove: number, sourceId: number) {
    super(BattlerTagType.INFATUATED, BattlerTagLapseType.MOVE, 1, sourceMove, sourceId);
  }

  override canAdd(pokemon: Pokemon): boolean {
    if (!pokemon.canAddTag?.(BattlerTagType.INFATUATED)) {
      return false;
    }

    const source = this.getSourcePokemon();

    if (!source) {
      console.warn(`Failed to get source Pokemon for InfatuatedTag canAdd; id: ${this.sourceId}`);
      return false;
    }

    return pokemon.isOppositeGender(source);
  }

  override onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (!pokemon.getTag(BattlerTagType.INFATUATED)) {
      return;
    }

    console.log("InfatuatedTag added to Pokemon:", getPokemonNameWithAffix(pokemon));

    const mentalHerb = pokemon.getHeldItems?.().find(item => item instanceof MentalHerbModifier) as
      | MentalHerbModifier
      | undefined;

    if (mentalHerb) {
      const removed = mentalHerb.apply(pokemon);
      if (removed) {
        return;
      }
    }

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:infatuatedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        sourcePokemonName: getPokemonNameWithAffix(this.getSourcePokemon()!),
      }),
    );
  }

  override onOverlap(pokemon: Pokemon): void {
    super.onOverlap(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:infatuatedOnOverlap", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  override lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    // 멘탈허브 처리 제거 (onAdd에서 이미 처리)
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (!ret) {
      return false;
    }

    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for InfatuatedTag lapse; id: ${this.sourceId}`);
      return false;
    }

    const phaseManager = globalScene.phaseManager;
    phaseManager.queueMessage(
      i18next.t("battlerTags:infatuatedLapse", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        sourcePokemonName: getPokemonNameWithAffix(globalScene.getPokemonById(this.sourceId!) ?? undefined),
      }),
    );
    phaseManager.unshiftNew("CommonAnimPhase", pokemon.getBattlerIndex(), undefined, CommonAnim.ATTRACT);

    if (pokemon.randBattleSeedInt(2)) {
      phaseManager.queueMessage(
        i18next.t("battlerTags:infatuatedLapseImmobilize", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );
      (phaseManager.getCurrentPhase() as MovePhase).cancel();
    }

    return true;
  }

  override onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:infatuatedOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  override isSourceLinked(): boolean {
    return true;
  }

  override getDescriptor(): string {
    return i18next.t("battlerTags:infatuatedDesc");
  }
}

/**
 * Battler tag for the "Seeded" effect applied by {@linkcode MoveId.LEECH_SEED | Leech Seed} and
 * {@linkcode MoveId.SAPPY_SEED | Sappy Seed}
 *
 * @sealed
 */
export class SeedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.SEEDED;
  public readonly sourceIndex: BattlerIndex;

  constructor(sourceId: number) {
    super(BattlerTagType.SEEDED, BattlerTagLapseType.TURN_END, 1, MoveId.LEECH_SEED, sourceId, true);
  }

  public override loadTag(source: BaseBattlerTag & Pick<SeedTag, "tagType" | "sourceIndex">): void {
    super.loadTag(source);
    (this as Mutable<this>).sourceIndex = source.sourceIndex;
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isOfType(PokemonType.GRASS);
  }

  onAdd(pokemon: Pokemon): void {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for SeedTag onAdd; id: ${this.sourceId}`);
      return;
    }

    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:seededOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
    (this as Mutable<this>).sourceIndex = source.getBattlerIndex();
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (!ret) {
      return false;
    }

    const source = pokemon.getOpponents().find(o => o.getBattlerIndex() === this.sourceIndex);
    if (!source) {
      return true;
    }

    // ✅ 매직가드/새벽비드/스터디밀 등 “간접 데미지 면역”이면 씨뿌리기 틱 무효
    if (blocksNonDirectDamage(pokemon, false)) {
      return true;
    }

    globalScene.phaseManager.unshiftNew(
      "CommonAnimPhase",
      source.getBattlerIndex(),
      pokemon.getBattlerIndex(),
      CommonAnim.LEECH_SEED,
    );

    const damage = pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() / 8), { result: HitResult.INDIRECT });
    const reverseDrain = pokemon.hasAbilityWithAttr("ReverseDrainAbAttr", false);
    globalScene.phaseManager.unshiftNew(
      "PokemonHealPhase",
      source.getPhaseKey(),
      reverseDrain ? -damage : damage,
      i18next.t(reverseDrain ? "battlerTags:seededLapseShed" : "battlerTags:seededLapse", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
      false,
      true,
    );
    return true;
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:seedDesc");
  }
}

/**
 * BattlerTag representing the effects of {@link https://bulbapedia.bulbagarden.net/wiki/Powder_(move) | Powder}.
 * When the afflicted Pokemon uses a Fire-type move, the move is cancelled, and the
 * Pokemon takes damage equal to 1/4 of its maximum HP (rounded down).
 */
export class PowderTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.POWDER;
  constructor() {
    super(BattlerTagType.POWDER, BattlerTagLapseType.TURN_END, 1);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:powderOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.TURN_END) {
      return false;
    }
    const currentPhase = globalScene.phaseManager.getCurrentPhase();

    if (!currentPhase.is("MovePhase")) {
      return true;
    }

    const move = currentPhase.move.getMove();
    const weather = globalScene.arena.weather;
    if (
      pokemon.getMoveType(move) !== PokemonType.FIRE
      || (weather?.weatherType === WeatherType.HEAVY_RAIN && !weather.isEffectSuppressed())
    ) {
      return true;
    }

    currentPhase.fail();

    const idx = pokemon.getBattlerIndex();
    globalScene.phaseManager.unshiftNew("CommonAnimPhase", idx, idx, CommonAnim.POWDER);

    // ✅ 매직가드/새벽비드/스터디밀 등 “간접 데미지 면역”이면 Powder 데미지 무효
    if (!blocksNonDirectDamage(pokemon, false)) {
      pokemon.damageAndUpdate(Math.floor(pokemon.getMaxHp() / 4), { result: HitResult.INDIRECT });
    }

    globalScene.phaseManager.queueMessage(i18next.t("battlerTags:powderLapse", { moveName: move.name }));

    return true;
  }
}

export class NightmareTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.NIGHTMARE;

  private sourceId?: number;

  constructor(sourceId?: number) {
    super(
      BattlerTagType.NIGHTMARE,
      BattlerTagLapseType.TURN_END,
      1,
      MoveId.NIGHTMARE,
      sourceId, // ← 이게 핵심
    );
    this.sourceId = sourceId;
  }

  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceId = source.sourceId ?? this.sourceId;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:nightmareOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  onOverlap(pokemon: Pokemon): void {
    super.onOverlap(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:nightmareOnOverlap", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
    if (!ret) {
      return false;
    }

    const phaseManager = globalScene.phaseManager;

    phaseManager.queueMessage(
      i18next.t("battlerTags:nightmareLapse", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
    phaseManager.unshiftNew("CommonAnimPhase", pokemon.getBattlerIndex(), undefined, CommonAnim.CURSE);

    // ✅ 매직가드/새벽비드/스터디밀 등 “간접 데미지 면역”이면 악몽 틱 무효
    if (blocksNonDirectDamage(pokemon, false)) {
      return true;
    }

    const base = Math.max(Math.floor(pokemon.getMaxHp() / 4), 1);

    // ✅ 악몽의심볼이면(=다크라이가 걸었고, 대상이 수면이면) 도트 2배
    let dotMult = 1;

    const src = this.sourceId != null ? (globalScene as any).getPokemonById?.(this.sourceId) : null;

    if (src) {
      // (너 코드 스타일에 맞춰 최대한 안전하게)
      const hasNightmareSymbol = (src.getHeldItemModifiers?.() ?? []).some(
        m =>
          m instanceof SpeciesStatBoosterModifier
          && // 키 접근은 프로젝트마다 다르니 안전하게 여러 후보를 허용
          (m.getKey?.() ?? (m as any).key ?? (m as any).type?.key ?? (m as any).type?.id) === "NIGHTMARE_SYMBOLE"
          && m.hasMatchingSpecies?.(src),
      );

      const eff = (pokemon as any)?.status?.effect ?? (pokemon as any)?.statusEffect;
      const isSleeping = eff === StatusEffect.SLEEP || pokemon.hasAbility?.(AbilityId.COMATOSE);

      if (hasNightmareSymbol && isSleeping) {
        dotMult = 2;
      }
    }

    const dmg = Math.max(Math.floor(base * dotMult), 1);
    pokemon.damageAndUpdate(toDmgValue(dmg), { result: HitResult.INDIRECT });

    console.log("[NIGHTMARE_SYMBOLE][NIGHTMARE_TAG_DOT]", {
      source: src?.name,
      target: pokemon.name,
      base,
      dotMult,
      dmg,
    });

    return true;
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:nightmareDesc");
  }
}

export class FrenzyTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.FRENZY;
  constructor(turnCount: number, sourceMove: MoveId, sourceId: number) {
    super(BattlerTagType.FRENZY, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    if (this.turnCount < 2) {
      // Only add CONFUSED tag if a disruption occurs on the final confusion-inducing turn of FRENZY
      pokemon.addTag(BattlerTagType.CONFUSED, pokemon.randBattleSeedIntRange(2, 4));
    }
  }
}

export class UproarTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.UPROAR;

  constructor(turnCount: number, sourceMove: MoveId, sourceId: number) {
    super(BattlerTagType.UPROAR, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
    // 혼란 상태는 제거, 아무 동작도 하지 않음
  }
}

export class RolloutTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.ROLLOUT;

  // 위력 단계도 쓰려면 stage도 넣어야 함(아래 참고)
  public stage = 0;
  public curlBoost = false;

  constructor(turnCount: number, sourceMove: MoveId, sourceId: number) {
    super(BattlerTagType.ROLLOUT, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId);
  }

  override onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
  }
}

export class DefenseCurlTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.DEFENSE_CURL;
  constructor(sourceMove: MoveId, sourceId: number) {
    super(BattlerTagType.DEFENSE_CURL, BattlerTagLapseType.CUSTOM, 999, sourceMove, sourceId);
  }
}

/**
 * Applies the effects of {@linkcode MoveId.ENCORE} onto the target Pokemon.
 * Encore forces the target Pokemon to use its most-recent move for 3 turns.
 * @sealed
 */
export class EncoreTag extends MoveRestrictionBattlerTag {
  public moveId: Moves;

  constructor(sourceId: number) {
    super(
      BattlerTagType.ENCORE,
      [BattlerTagLapseType.CUSTOM, BattlerTagLapseType.AFTER_MOVE],
      3,
      MoveId.ENCORE,
      sourceId,
    );
  }

  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.moveId = source.moveId as Moves;
  }

  canAdd(pokemon: Pokemon): boolean {
    if (!pokemon.canAddTag?.(BattlerTagType.ENCORE)) {
      return false;
    }

    const lastMoves = pokemon.getLastXMoves(1);
    if (lastMoves.length === 0) {
      return false;
    }

    const repeatableMove = lastMoves[0];
    if (!repeatableMove.move || repeatableMove.virtual) {
      return false;
    }

    switch (repeatableMove.move) {
      case MoveId.MIMIC:
      case MoveId.MIRROR_MOVE:
      case MoveId.TRANSFORM:
      case MoveId.STRUGGLE:
      case MoveId.SKETCH:
      case MoveId.SLEEP_TALK:
      case MoveId.ENCORE:
        return false;
    }

    this.moveId = repeatableMove.move;
    return true;
  }

  override onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    console.log("EncoreTag added to Pokemon:", getPokemonNameWithAffix(pokemon));

    // ✅ 멘탈허브 보유 여부 확인
    const mentalHerb = globalScene
      .getModifiers(MentalHerbModifier, pokemon.isPlayer())
      .find(mod => mod instanceof MentalHerbModifier && mod.pokemonId === pokemon.id) as MentalHerbModifier | undefined;

    if (mentalHerb) {
      console.log("Mental Herb detected - removing Encore immediately");
      const removed = mentalHerb.apply(pokemon);
      if (removed) {
        console.log("Encore removed by Mental Herb");
        return; // 멘탈허브 발동 메시지가 apply() 내부에서 출력되므로 Encore 메시지는 생략
      }
    }

    // 멘탈허브 없을 때만 Encore 메시지 출력
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:encoreOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );

    // Encore 적용 시, 이미 선택된 기술을 강제로 반복하게 갱신
    const movePhase = globalScene.phaseManager.hasPhaseOfType(m => m.is("MovePhase") && m.pokemon === pokemon);
    if (movePhase) {
      const movesetMove = pokemon.getMoveset().find(m => m.moveId === this.moveId);
      const lastMove = pokemon.getLastXMoves(1)[0];

      if (movesetMove && lastMove) {
        globalScene.phaseManager.tryReplacePhase(
          m => m.is("MovePhase") && m.pokemon === pokemon,
          globalScene.phaseManager.create(
            "MovePhase",
            pokemon,
            lastMove.targets ?? [],
            movesetMove,
            MoveUseMode.NORMAL,
          ),
        );
      }
    }
  }

  override onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:encoreOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  override lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      const encoredMove = pokemon.getMoveset().find(m => m.moveId === this.moveId);
      return !!encoredMove && encoredMove.getPpRatio() > 0;
    }
    return super.lapse(pokemon, lapseType);
  }

  override isMoveRestricted(move: Moves, _user?: Pokemon): boolean {
    return move !== this.moveId;
  }

  override selectionDeniedText(_pokemon: Pokemon, move: Moves): string {
    return i18next.t("battle:moveDisabled", { moveName: allMoves[move].name });
  }
}

export class HelpingHandTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.HELPING_HAND;
  constructor(sourceId: number) {
    super(BattlerTagType.HELPING_HAND, BattlerTagLapseType.TURN_END, 1, MoveId.HELPING_HAND, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for HelpingHandTag onAdd; id: ${this.sourceId}`);
      return;
    }

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:helpingHandOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(source),
        pokemonName: getPokemonNameWithAffix(pokemon),
      }),
    );
  }
}

export class MeFirstPowerTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.CUSTOM_ME_FIRST_POWER;

  constructor(copiedMoveId: number) {
    // copiedMoveId를 sourceId로 저장 (HelpingHandTag랑 동일한 패턴)
    super(
      BattlerTagType.CUSTOM_ME_FIRST_POWER,
      BattlerTagLapseType.TURN_END, // 한 턴 내에서만 유효
      1,
      MoveId.ME_FIRST,
      copiedMoveId,
    );
  }

  onAdd(pokemon: Pokemon): void {
    // 원하면 메시지 출력도 가능 (도우미처럼)
    // globalScene.phaseManager.queueMessage(i18next.t("battlerTags:meFirstOnAdd", ...));
  }
}

/**
 * Applies the Ingrain tag to a pokemon
 */
export class IngrainTag extends TrappedTag {
  public override readonly tagType = BattlerTagType.INGRAIN;
  constructor(sourceId: number) {
    super(BattlerTagType.INGRAIN, BattlerTagLapseType.TURN_END, 1, MoveId.INGRAIN, sourceId);
  }

  /**
   * Check if the Ingrain tag can be added to the pokemon
   * @param pokemon - The pokemon to check if the tag can be added to
   * @returns boolean True if the tag can be added, false otherwise
   */
  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.getTag(BattlerTagType.TRAPPED);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "PokemonHealPhase",
        pokemon.getPhaseKey(),
        toDmgValue(pokemon.getMaxHp() / 16),
        i18next.t("battlerTags:ingrainLapse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
        true,
      );
    }

    return ret;
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:ingrainOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
    });
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:ingrainDesc");
  }
}

/**
 * Octolock traps the target pokemon and reduces its DEF and SPDEF by one stage at the
 * end of each turn.
 */
export class OctolockTag extends TrappedTag {
  public override readonly tagType = BattlerTagType.OCTOLOCK;
  constructor(sourceId: number) {
    super(BattlerTagType.OCTOLOCK, BattlerTagLapseType.TURN_END, 1, MoveId.OCTOLOCK, sourceId);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const shouldLapse = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (shouldLapse) {
      globalScene.phaseManager.unshiftNew(
        "StatStageChangePhase",
        pokemon.getBattlerIndex(),
        false,
        [Stat.DEF, Stat.SPDEF],
        -1,
      );
      return true;
    }

    return false;
  }
}

export class AquaRingTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.AQUA_RING;
  constructor() {
    super(BattlerTagType.AQUA_RING, BattlerTagLapseType.TURN_END, 1, MoveId.AQUA_RING, undefined, true);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:aquaRingOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "PokemonHealPhase",
        pokemon.getPhaseKey(),
        toDmgValue(pokemon.getMaxHp() / 16),
        i18next.t("battlerTags:aquaRingLapse", {
          moveName: this.getMoveName(),
          pokemonName: getPokemonNameWithAffix(pokemon),
        }),
        true,
      );
    }

    return ret;
  }
}

/** Tag used to allow moves that interact with {@link MoveId.MINIMIZE} to function */
export class MinimizeTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.MINIMIZED;
  constructor() {
    super(BattlerTagType.MINIMIZED, BattlerTagLapseType.TURN_END, 1, MoveId.MINIMIZE);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
  }
}

export class DrowsyTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.DROWSY;
  constructor() {
    super(BattlerTagType.DROWSY, BattlerTagLapseType.TURN_END, 2, MoveId.YAWN);
  }

  canAdd(pokemon: Pokemon): boolean {
    return globalScene.arena.terrain?.terrainType !== TerrainType.ELECTRIC || !pokemon.isGrounded();
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:drowsyOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (!super.lapse(pokemon, lapseType)) {
      pokemon.trySetStatus(StatusEffect.SLEEP);
      return false;
    }

    return true;
  }

  getDescriptor(): string {
    return i18next.t("battlerTags:drowsyDesc");
  }
}

export abstract class DamagingTrapTag extends TrappedTag {
  public declare readonly tagType: TrappingBattlerTagType;
  #commonAnim: CommonAnim;

  constructor(
    tagType: BattlerTagType,
    commonAnim: CommonAnim,
    turnCount: number,
    sourceMove: MoveId,
    sourceId: number,
  ) {
    super(tagType, BattlerTagLapseType.TURN_END, turnCount, sourceMove, sourceId);
    this.#commonAnim = commonAnim;
  }

  canAdd(pokemon: Pokemon): boolean {
    return !pokemon.getTag(TrappedTag) && !pokemon.getTag(BattlerTagType.SUBSTITUTE);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (ret) {
      const phaseManager = globalScene.phaseManager;
      phaseManager.queueMessage(
        i18next.t("battlerTags:damagingTrapLapse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          moveName: this.getMoveName(),
        }),
      );
      phaseManager.unshiftNew("CommonAnimPhase", pokemon.getBattlerIndex(), undefined, this.#commonAnim);

      // ✅ 매직가드/새벽비드/스터디밀 등 “간접 데미지 면역”이면 트랩 틱 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() / 8), { result: HitResult.INDIRECT });
      }
    }

    return ret;
  }
}

// TODO: Condense all these tags into 1 singular tag with a modified message func
export class BindTag extends DamagingTrapTag {
  public override readonly tagType = BattlerTagType.BIND;
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.BIND, CommonAnim.BIND, turnCount, MoveId.BIND, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for BindTag getTrapMessage; id: ${this.sourceId}`);
      return "ERROR - CHECK CONSOLE AND REPORT";
    }

    return i18next.t("battlerTags:bindOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      sourcePokemonName: getPokemonNameWithAffix(source),
      moveName: this.getMoveName(),
    });
  }
}

export class WrapTag extends DamagingTrapTag {
  public override readonly tagType = BattlerTagType.WRAP;
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.WRAP, CommonAnim.WRAP, turnCount, MoveId.WRAP, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for WrapTag getTrapMessage; id: ${this.sourceId}`);
      return "ERROR - CHECK CONSOLE AND REPORT";
    }

    return i18next.t("battlerTags:wrapOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      sourcePokemonName: getPokemonNameWithAffix(source),
      moveName: this.getMoveName(),
    });
  }
}

export abstract class VortexTrapTag extends DamagingTrapTag {
  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:vortexOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
    });
  }
}

export class FireSpinTag extends VortexTrapTag {
  public override readonly tagType = BattlerTagType.FIRE_SPIN;
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.FIRE_SPIN, CommonAnim.FIRE_SPIN, turnCount, MoveId.FIRE_SPIN, sourceId);
  }
}

export class WhirlpoolTag extends VortexTrapTag {
  public override readonly tagType = BattlerTagType.WHIRLPOOL;
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.WHIRLPOOL, CommonAnim.WHIRLPOOL, turnCount, MoveId.WHIRLPOOL, sourceId);
  }
}

export class ClampTag extends DamagingTrapTag {
  public override readonly tagType = BattlerTagType.CLAMP;
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.CLAMP, CommonAnim.CLAMP, turnCount, MoveId.CLAMP, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for ClampTag getTrapMessage; id: ${this.sourceId}`);
      return "ERROR - CHECK CONSOLE AND REPORT ASAP";
    }

    return i18next.t("battlerTags:clampOnTrap", {
      sourcePokemonNameWithAffix: getPokemonNameWithAffix(source),
      pokemonName: getPokemonNameWithAffix(pokemon),
    });
  }
}

export class SandTombTag extends DamagingTrapTag {
  public override readonly tagType = BattlerTagType.SAND_TOMB;
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.SAND_TOMB, CommonAnim.SAND_TOMB, turnCount, MoveId.SAND_TOMB, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:sandTombOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      moveName: this.getMoveName(),
    });
  }
}

export class MagmaStormTag extends DamagingTrapTag {
  public override readonly tagType = BattlerTagType.MAGMA_STORM;
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.MAGMA_STORM, CommonAnim.MAGMA_STORM, turnCount, MoveId.MAGMA_STORM, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:magmaStormOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
    });
  }
}

export class GrassBindTag extends DamagingTrapTag {
  public override readonly tagType = BattlerTagType.GRASS_BIND;
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.GRASS_BIND, CommonAnim.WRAP, turnCount, MoveId.GRASS_BIND, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:grassBindOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
    });
  }
}

export class SnapTrapTag extends DamagingTrapTag {
  public override readonly tagType = BattlerTagType.SNAP_TRAP;
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.SNAP_TRAP, CommonAnim.SNAP_TRAP, turnCount, MoveId.SNAP_TRAP, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    return i18next.t("battlerTags:snapTrapOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
    });
  }
}

export class ThunderCageTag extends DamagingTrapTag {
  public override readonly tagType = BattlerTagType.THUNDER_CAGE;
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.THUNDER_CAGE, CommonAnim.THUNDER_CAGE, turnCount, MoveId.THUNDER_CAGE, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for ThunderCageTag getTrapMessage; id: ${this.sourceId}`);
      return "ERROR - PLEASE REPORT ASAP";
    }

    return i18next.t("battlerTags:thunderCageOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      sourcePokemonNameWithAffix: getPokemonNameWithAffix(source),
    });
  }
}

export class InfestationTag extends DamagingTrapTag {
  public override readonly tagType = BattlerTagType.INFESTATION;
  constructor(turnCount: number, sourceId: number) {
    super(BattlerTagType.INFESTATION, CommonAnim.INFESTATION, turnCount, MoveId.INFESTATION, sourceId);
  }

  getTrapMessage(pokemon: Pokemon): string {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for InfestationTag getTrapMessage; id: ${this.sourceId}`);
      return "ERROR - CHECK CONSOLE AND REPORT";
    }

    return i18next.t("battlerTags:infestationOnTrap", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      sourcePokemonNameWithAffix: getPokemonNameWithAffix(source),
    });
  }
}

export class ProtectedTag extends BattlerTag {
  constructor(sourceMove: Moves, tagType: BattlerTagType = BattlerTagType.PROTECTED) {
    super(tagType, BattlerTagLapseType.TURN_END, 0, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:protectedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      new CommonBattleAnim(CommonAnim.PROTECT, pokemon).play();
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:protectedLapse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );

      const effectPhase = globalScene.phaseManager.getCurrentPhase();
      if (effectPhase?.is("MoveEffectPhase")) {
        effectPhase.stopMultiHit(pokemon);
      }
      return true;
    }
    return super.lapse(pokemon, lapseType);
  }

  applyProtectDamageAdjust(source: Pokemon | undefined, move: AttackMove, damage: number): number {
    console.log("ProtectedTag.applyProtectDamageAdjust 호출됨", damage);
    console.log("보호 피해 조절 전 피해:", damage);
    const adjustedDamage = protectTag.applyProtectDamageAdjust(source, move, damage);
    console.log("보호 피해 조절 후 피해:", adjustedDamage);
    damage = adjustedDamage;

    if (move.ignoresProtect()) {
      console.log("보호 무시 기술, 피해 그대로:", damage);
      return damage;
    }

    if (move.ignoresZProtect) {
      const rate = move.zMoveDamageRate ?? 0.25;
      const reducedDamage = damage * rate;
      console.log(`Z보호 무시 기술, 피해 ${rate * 100}% 적용:`, reducedDamage);
      return reducedDamage;
    }

    console.log("기본 보호, 피해 0으로 조정");
    return 0;
  }
}

export class MaxGuardProtectedTag extends ProtectedTag {
  constructor(sourceMove: Moves) {
    super(sourceMove, BattlerTagType.MAX_GUARD_PROTECTED);
  }

  override applyProtectDamageAdjust(source: Pokemon | undefined, move: AttackMove, damage: number): number {
    console.log("MaxGuardProtectedTag.applyProtectDamageAdjust 호출됨", damage);

    if (move.ignoresMaxGuard) {
      console.log("MAX 가드 관통 기술, 피해 그대로:", damage);
      return damage;
    }

    if (move.ignoresProtect()) {
      console.log("보호 무시 기술, 피해 그대로:", damage);
      return damage;
    }

    if (move.ignoresZProtect) {
      const rate = move.zMoveDamageRate ?? 0.25;
      const reducedDamage = damage * rate;
      console.log(`Z보호 무시 기술, 피해 ${rate * 100}% 적용:`, reducedDamage);
      return reducedDamage;
    }

    console.log("MAX 가드 보호, 피해 0으로 조정");
    return 0;
  }
}

/** Class for `BattlerTag`s that apply some effect when hit by a contact move */
export abstract class ContactProtectedTag extends ProtectedTag {
  /**
   * Function to call when a contact move hits the pokemon with this tag.
   * @param _attacker - The pokemon using the contact move
   * @param _user - The pokemon that is being attacked and has the tag
   */
  abstract onContact(_attacker: Pokemon, _user: Pokemon): void;

  /**
   * Lapse the tag and apply `onContact` if the move makes contact and
   * `lapseType` is custom, respecting the move's flags and the pokemon's
   * abilities, and whether the lapseType is custom.
   *
   * @param pokemon - The pokemon with the tag
   * @param lapseType - The type of lapse to apply. If this is not {@linkcode BattlerTagLapseType.CUSTOM CUSTOM}, no effect will be applied.
   * @returns Whether the tag continues to exist after the lapse.
   */
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    const moveData = getMoveEffectPhaseData(pokemon);
    if (
      lapseType === BattlerTagLapseType.CUSTOM
      && moveData
      && moveData.move.doesFlagEffectApply({ flag: MoveFlags.MAKES_CONTACT, user: moveData.attacker, target: pokemon })
    ) {
      this.onContact(moveData.attacker, pokemon);
    }

    return ret;
  }
}

/**
 * `BattlerTag` class for moves that block damaging moves damage the enemy if the enemy's move makes contact
 * Used by {@linkcode MoveId.SPIKY_SHIELD}
 *
 * @sealed
 */
export class ContactDamageProtectedTag extends ContactProtectedTag {
  public override readonly tagType = BattlerTagType.SPIKY_SHIELD;
  #damageRatio: number;

  constructor(sourceMove: MoveId, damageRatio: number) {
    super(sourceMove, BattlerTagType.SPIKY_SHIELD);
    this.#damageRatio = damageRatio;
  }

  override onContact(attacker: Pokemon, user: Pokemon): void {
    // ✅ 피해를 받는 쪽은 attacker (스파이키실드/니들가드 반사 데미지)
    // ✅ 매직가드/새벽비드/스터디밀 등 “간접 데미지 면역”이면 반사 데미지 무효
    if (blocksNonDirectDamage(attacker, false)) {
      return;
    }

    attacker.damageAndUpdate(toDmgValue(attacker.getMaxHp() * (1 / this.#damageRatio)), { result: HitResult.INDIRECT });
  }
}

/** Base class for `BattlerTag`s that block damaging moves but not status moves */
export abstract class DamageProtectedTag extends ContactProtectedTag {
  public declare readonly tagType: DamageProtectedTagType;
}

export class ContactSetStatusProtectedTag extends DamageProtectedTag {
  public declare readonly tagType: ContactSetStatusProtectedTagType;
  /** The status effect applied to attackers */
  #statusEffect: StatusEffect;
  /**
   * @param sourceMove - The move that caused the tag to be applied
   * @param tagType - The type of the tag
   * @param statusEffect - The status effect applied to attackers
   */
  constructor(sourceMove: MoveId, tagType: ContactSetStatusProtectedTagType, statusEffect: StatusEffect) {
    super(sourceMove, tagType);
    this.#statusEffect = statusEffect;
  }

  /**
   * Set the status effect on the attacker
   * @param attacker - The pokemon using the contact move
   * @param user - The pokemon that is being attacked and has the tag
   */
  override onContact(attacker: Pokemon, user: Pokemon): void {
    attacker.trySetStatus(this.#statusEffect, user);
  }
}

/**
 * `BattlerTag` class for moves that block damaging moves and lower enemy stats if the enemy's move makes contact
 * Used by {@linkcode MoveId.KINGS_SHIELD}, {@linkcode MoveId.OBSTRUCT}, {@linkcode MoveId.SILK_TRAP}
 */
export class ContactStatStageChangeProtectedTag extends DamageProtectedTag {
  public declare readonly tagType: ContactStatStageChangeProtectedTagType;
  #stat: BattleStat;
  #levels: number;

  constructor(sourceMove: MoveId, tagType: ContactStatStageChangeProtectedTagType, stat: BattleStat, levels: number) {
    super(sourceMove, tagType);

    this.#stat = stat;
    this.#levels = levels;
  }

  /**
   * Initiate the stat stage change on the attacker
   * @param attacker - The pokemon using the contact move
   * @param user - The pokemon that is being attacked and has the tag
   */
  override onContact(attacker: Pokemon, _user: Pokemon): void {
    globalScene.phaseManager.unshiftNew(
      "StatStageChangePhase",
      attacker.getBattlerIndex(),
      false,
      [this.#stat],
      this.#levels,
    );
  }
}

/**
 * `BattlerTag` class for effects that cause the affected Pokemon to survive lethal attacks at 1 HP.
 * Used for {@link https://bulbapedia.bulbagarden.net/wiki/Endure_(move) | Endure} and endure tokens.
 */
export class EnduringTag extends BattlerTag {
  public declare readonly tagType: EndureTagType;
  constructor(tagType: EndureTagType, lapseType: BattlerTagLapseType, sourceMove: MoveId) {
    super(tagType, lapseType, 0, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:enduringOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:enduringLapse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );
      return true;
    }

    return super.lapse(pokemon, lapseType);
  }
}

export class SturdyTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.STURDY;
  constructor(sourceMove: MoveId) {
    super(BattlerTagType.STURDY, BattlerTagLapseType.TURN_END, 0, sourceMove);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.CUSTOM) {
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:sturdyLapse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );
      return true;
    }

    return super.lapse(pokemon, lapseType);
  }
}

export class PerishSongTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.PERISH_SONG;
  constructor(turnCount: number) {
    super(BattlerTagType.PERISH_SONG, BattlerTagLapseType.TURN_END, turnCount, MoveId.PERISH_SONG, undefined, true);
  }

  override canAdd(pokemon: Pokemon): boolean {
    if (!pokemon.canAddTag?.(BattlerTagType.PERISH_SONG)) {
      return false;
    }

    return !pokemon.isBossImmune();
  }

  override onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (!pokemon.getTag(BattlerTagType.PERISH_SONG)) {
      return;
    }

    console.log("PerishSongTag added to Pokemon:", getPokemonNameWithAffix(pokemon));

    const mentalHerb = pokemon.getHeldItems?.().find(item => item instanceof MentalHerbModifier) as
      | MentalHerbModifier
      | undefined;

    if (mentalHerb) {
      const removed = mentalHerb.apply(pokemon);
      if (removed) {
        return;
      }
    }

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:perishSongOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        turnCount: this.turnCount,
      }),
    );
  }

  override lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (ret) {
      // 턴 카운트 줄어든 경우 메시지 출력
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:perishSongLapse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          turnCount: this.turnCount,
        }),
      );
    } else {
      // 카운트 0 → 즉시 기절
      pokemon.damageAndUpdate(pokemon.hp, {
        result: HitResult.INDIRECT_KO,
        ignoreSegments: true,
      });
    }

    return ret;
  }
}

/**
 * Applies the "Center of Attention" volatile status effect, the effect applied by Follow Me, Rage Powder, and Spotlight.
 * @see {@link https://bulbapedia.bulbagarden.net/wiki/Center_of_attention | Center of Attention}
 */
export class CenterOfAttentionTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.CENTER_OF_ATTENTION;
  public powder: boolean;

  constructor(sourceMove: MoveId) {
    super(BattlerTagType.CENTER_OF_ATTENTION, BattlerTagLapseType.TURN_END, 1, sourceMove);

    this.powder = this.sourceMove === MoveId.RAGE_POWDER;
  }

  /** "Center of Attention" can't be added if an ally is already the Center of Attention. */
  canAdd(pokemon: Pokemon): boolean {
    const activeTeam = pokemon.isPlayer() ? globalScene.getPlayerField() : globalScene.getEnemyField();

    return !activeTeam.find(p => p.getTag(BattlerTagType.CENTER_OF_ATTENTION));
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:centerOfAttentionOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }
}

export class ZCenterOfAttentionTag extends BattlerTag {
  public powder: boolean;

  constructor(sourceMove: Moves) {
    super(BattlerTagType.CENTER_OF_ATTENTION, BattlerTagLapseType.TURN_END, 1, sourceMove);

    this.powder = this.sourceMove === MoveId.RAGE_POWDER;
  }

  /** "Center of Attention" can't be added if an ally is already the Center of Attention. */
  canAdd(pokemon: Pokemon): boolean {
    const genericMods = globalScene.getModifiers(GenericZMoveAccessModifier);
    const exclusiveMods = globalScene.getModifiers(ExclusiveZMoveAccessModifier);
    const hasZAccess = genericMods.length > 0 || exclusiveMods.length > 0;

    if (!hasZAccess) {
      console.log("[CenterOfAttentionTag] Z링/파워링 없음 - 태그 추가 불가");
      return false;
    }

    const activeTeam = pokemon.isPlayer() ? globalScene.getPlayerField() : globalScene.getEnemyField();

    return !activeTeam.find(p => p.getTag(BattlerTagType.CENTER_OF_ATTENTION));
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:centerOfAttentionOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }
}

export class AbilityBattlerTag extends SerializableBattlerTag {
  public declare readonly tagType: AbilityBattlerTagType;
  #ability: AbilityId;
  /** The ability that the tag corresponds to */
  public get ability(): AbilityId {
    return this.#ability;
  }

  constructor(tagType: AbilityBattlerTagType, ability: AbilityId, lapseType: BattlerTagLapseType, turnCount: number) {
    super(tagType, lapseType, turnCount);

    this.#ability = ability;
  }
}

/**
 * Tag used by Unburden to double speed
 */
export class UnburdenTag extends AbilityBattlerTag {
  public override readonly tagType = BattlerTagType.UNBURDEN;
  constructor() {
    super(BattlerTagType.UNBURDEN, AbilityId.UNBURDEN, BattlerTagLapseType.CUSTOM, 1);
  }
  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
  }
  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
  }
}

export class TruantTag extends AbilityBattlerTag {
  public override readonly tagType = BattlerTagType.TRUANT;

  constructor() {
    super(BattlerTagType.TRUANT, AbilityId.TRUANT, BattlerTagLapseType.CUSTOM, 1);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (!pokemon.hasAbility(AbilityId.TRUANT)) {
      return super.lapse(pokemon, lapseType);
    }

    const lastMove = pokemon.getLastXMoves()[0];

    if (!lastMove || lastMove.move === MoveId.NONE) {
      return true;
    }

    // 게으름 발동 → 이번 행동 취소
    const passive = pokemon.getAbility().id !== AbilityId.TRUANT;

    const currentPhase = globalScene.phaseManager.getCurrentPhase();

    if (currentPhase.is("MovePhase")) {
      currentPhase.cancel();
    }

    globalScene.phaseManager.queueAbilityDisplay(pokemon, passive, true);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:truantLapse", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );

    // ✅ 게으름을 피우는 동안 최대 HP의 1/3 회복 + 상태이상 치료
    if (!pokemon.isFullHp() || pokemon.status) {
      globalScene.phaseManager.unshiftNew(
        "PokemonHealPhase",
        pokemon.getPhaseKey(),
        Math.max(1, Math.floor(pokemon.getMaxHp() / 3)),
        null,
        false, // showFullHpMessage
        false, // skipAnim
        false, // revive
        true, // healStatus
      );
    }

    globalScene.phaseManager.queueAbilityDisplay(pokemon, passive, false);

    return true;
  }
}

export class SlowStartTag extends AbilityBattlerTag {
  public override readonly tagType = BattlerTagType.SLOW_START;
  constructor() {
    super(BattlerTagType.SLOW_START, AbilityId.SLOW_START, BattlerTagLapseType.TURN_END, 5);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:slowStartOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (!pokemon.hasAbility(this.ability)) {
      this.turnCount = 1;
    }

    return super.lapse(pokemon, lapseType);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:slowStartOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
      null,
      false,
      null,
    );
  }
}

export class HighestStatBoostTag extends AbilityBattlerTag {
  public declare readonly tagType: HighestStatBoostTagType;
  public stat: EffectiveStat = Stat.ATK;
  public multiplier = 1.3;

  constructor(tagType: HighestStatBoostTagType, ability: AbilityId) {
    super(tagType, ability, BattlerTagLapseType.CUSTOM, 1);
  }

  /**
   * When given a battler tag or json representing one, load the data for it.
   * @param source - An object containing the fields needed to reconstruct this tag.
   */
  public override loadTag<T extends this>(source: BaseBattlerTag & Pick<T, "tagType" | "stat" | "multiplier">): void {
    super.loadTag(source);
    this.stat = source.stat;
    this.multiplier = source.multiplier;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    const highestStat = EFFECTIVE_STATS.reduce(
      (curr: [EffectiveStat, number], stat: EffectiveStat) => {
        const value = pokemon.getEffectiveStat(stat, undefined, undefined, true, true, true, false, true, true);
        if (value > curr[1]) {
          curr[0] = stat;
          curr[1] = value;
        }
        return curr;
      },
      [Stat.ATK, 0],
    )[0];

    this.stat = highestStat;

    this.multiplier = highestStat === Stat.SPD ? 1.5 : 1.3;
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:highestStatBoostOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        statName: i18next.t(getStatKey(highestStat)),
      }),
      null,
      false,
      null,
      false,
    );
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:highestStatBoostOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        abilityName: allAbilities[this.ability].name,
      }),
    );
  }
}

export class WeatherHighestStatBoostTag extends HighestStatBoostTag {
  readonly #weatherTypes: readonly WeatherType[];
  public get weatherTypes(): readonly WeatherType[] {
    return this.#weatherTypes;
  }

  constructor(tagType: HighestStatBoostTagType, ability: AbilityId, ...weatherTypes: WeatherType[]) {
    super(tagType, ability);
    this.#weatherTypes = weatherTypes;
  }
}

export class TerrainHighestStatBoostTag extends HighestStatBoostTag {
  readonly #terrainTypes: readonly TerrainType[];
  public get terrainTypes(): readonly TerrainType[] {
    return this.#terrainTypes;
  }

  constructor(tagType: HighestStatBoostTagType, ability: AbilityId, ...terrainTypes: TerrainType[]) {
    super(tagType, ability);
    this.#terrainTypes = terrainTypes;
  }
}

export class SemiInvulnerableTag extends SerializableBattlerTag {
  public declare readonly tagType: SemiInvulnerableTagType;
  constructor(tagType: BattlerTagType, turnCount: number, sourceMove: MoveId) {
    super(tagType, BattlerTagLapseType.MOVE_EFFECT, turnCount, sourceMove);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    pokemon.setVisible(false);
  }

  onRemove(pokemon: Pokemon): void {
    // Wait 2 frames before setting visible for battle animations that don't immediately show the sprite invisible
    globalScene.tweens.addCounter({
      duration: getFrameMs(2),
      onComplete: () => pokemon.setVisible(true),
    });
  }
}

export class SkyDropLiftedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.SKY_DROP_LIFTED;

  constructor(turnCount: number, sourceMove: MoveId, sourceId: number) {
    super(
      BattlerTagType.SKY_DROP_LIFTED,
      [BattlerTagLapseType.PRE_MOVE, BattlerTagLapseType.MOVE_EFFECT],
      turnCount,
      sourceMove,
      sourceId,
    );
  }

  override canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isOfType(PokemonType.FLYING);
  }

  override onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    pokemon.setVisible(false);
  }

  override lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    if (lapseType === BattlerTagLapseType.PRE_MOVE) {
      const phase: any = globalScene.phaseManager.getCurrentPhase?.();

      // ✅ 현재 MovePhase가 이 포켓몬의 턴일 때만 취소
      if (phase?.phaseName === "MovePhase" && phase?.pokemon === pokemon) {
        phase.cancel?.();
      }

      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:immobilizedBySkyDrop", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );

      return true;
    }

    return super.lapse(pokemon, lapseType);
  }

  override onRemove(pokemon: Pokemon): void {
    globalScene.tweens.addCounter({
      duration: getFrameMs(2),
      onComplete: () => pokemon.setVisible(true),
    });
  }
}

export class EmbargoTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.EMBARGO;

  constructor(turnCount: number, sourceMove: MoveId, sourceId: number) {
    super(BattlerTagType.EMBARGO, BattlerTagLapseType.TURN_END, turnCount, sourceMove, sourceId);
  }

  override onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:embargoStart", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  override onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:embargoEnd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }
}

export abstract class TypeImmuneTag extends SerializableBattlerTag {
  #immuneType: PokemonType;
  public get immuneType(): PokemonType {
    return this.#immuneType;
  }

  constructor(tagType: BattlerTagType, sourceMove: MoveId, immuneType: PokemonType, length = 1) {
    super(tagType, BattlerTagLapseType.TURN_END, length, sourceMove, undefined, true);

    this.#immuneType = immuneType;
  }
}

/**
 * Battler Tag that lifts the affected Pokemon into the air and provides immunity to Ground type moves.
 * @see {@link https://bulbapedia.bulbagarden.net/wiki/Magnet_Rise_(move) | MoveId.MAGNET_RISE}
 * @see {@link https://bulbapedia.bulbagarden.net/wiki/Telekinesis_(move) | MoveId.TELEKINESIS}
 */
export class FloatingTag extends TypeImmuneTag {
  public override readonly tagType = BattlerTagType.FLOATING;
  constructor(tagType: BattlerTagType, sourceMove: MoveId, turnCount: number) {
    super(tagType, sourceMove, PokemonType.GROUND, turnCount);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (this.sourceMove === MoveId.MAGNET_RISE) {
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:magnetRisenOnAdd", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );
    }
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
    if (this.sourceMove === MoveId.MAGNET_RISE) {
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:magnetRisenOnRemove", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );
    }
  }
}

export class TypeBoostTag extends SerializableBattlerTag {
  public declare readonly tagType: TypeBoostTagType;
  #boostedType: PokemonType;
  #boostValue: number;
  #oneUse: boolean;

  public get boostedType(): PokemonType {
    return this.#boostedType;
  }
  public get boostValue(): number {
    return this.#boostValue;
  }
  public get oneUse(): boolean {
    return this.#oneUse;
  }

  constructor(
    tagType: BattlerTagType,
    sourceMove: MoveId,
    boostedType: PokemonType,
    boostValue: number,
    oneUse: boolean,
  ) {
    super(tagType, BattlerTagLapseType.TURN_END, 1, sourceMove);

    this.#boostedType = boostedType;
    this.#boostValue = boostValue;
    this.#oneUse = oneUse;
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
  }

  override onAdd(pokemon: Pokemon): void {
    globalScene.phaseManager.queueMessage(
      i18next.t("abilityTriggers:typeImmunityPowerBoost", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        typeName: i18next.t(`pokemonInfo:type.${toCamelCase(PokemonType[this.boostedType])}`),
      }),
    );
  }

  override onOverlap(pokemon: Pokemon): void {
    globalScene.phaseManager.queueMessage(
      i18next.t("abilityTriggers:moveImmunity", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }),
    );
  }
}

export class CritBoostTag extends SerializableBattlerTag {
  public declare readonly tagType: CritStageBoostTagType;
  /** The number of stages boosted by this tag */
  public readonly critStages: number = 1;

  constructor(tagType: CritStageBoostTagType, sourceMove: MoveId) {
    super(tagType, BattlerTagLapseType.TURN_END, 1, sourceMove, undefined, true);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    // Dragon cheer adds +2 crit stages if the pokemon is a Dragon type when the tag is added
    if (this.tagType === BattlerTagType.DRAGON_CHEER && !pokemon.getTypes(true, true).includes(PokemonType.DRAGON)) {
      (this as Mutable<this>).critStages = 1;
    } else {
      (this as Mutable<this>).critStages = 2;
    }

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:critBoostOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:critBoostOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  public override loadTag(source: BaseBattlerTag & Pick<CritBoostTag, "tagType" | "critStages">): void {
    super.loadTag(source);
    // TODO: Remove the nullish coalescing once Zod Schemas come in
    // For now, this is kept for backwards compatibility with older save files
    (this as Mutable<this>).critStages = source.critStages ?? 1;
  }
}

export class CritStackingTag extends BattlerTag {
  private stackCount = 1;
  private static readonly MAX_STACK = 3;

  constructor(tagType: BattlerTagType, sourceMove: Moves) {
    super(tagType, BattlerTagLapseType.CUSTOM, -1, sourceMove, undefined, true);
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:critBoostOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  onOverlap(battler: PlayerPokemon) {
    if (this.stackCount < CritStackingTag.MAX_STACK) {
      this.stackCount++;
    }

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:critBoostOnOverlap", {
        pokemonNameWithAffix: getPokemonNameWithAffix(battler),
        stackCount: this.stackCount,
      }),
    );
  }

  getStackCount(): number {
    return this.stackCount;
  }

  getCritStage(): number {
    return Math.min(this.stackCount, CritStackingTag.MAX_STACK);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:critBoostOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }
}

export abstract class StatStageChangeTag extends BattlerTag {
  protected stat: Stat;
  protected stageChange: number;

  constructor(tagType: string, moveId: number, stat: Stat, stageChange = 1) {
    super(tagType, moveId);
    this.stat = stat;
    this.stageChange = stageChange;
  }

  /** 태그가 추가될 때 */
  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    console.log(`[StatStageChangeTag] 태그 추가됨 - ${pokemon.id}`);
    // 스탯 변경은 하지 않음 → StatStageChangePhase에서만 처리
  }

  /** 태그가 제거될 때 */
  onRemove(pokemon: Pokemon): void {
    console.log(`[StatStageChangeTag] 태그 제거됨 - ${pokemon.id}`);
    super.onRemove(pokemon);
  }
}

export class SplashZBoostTag extends BattlerTag {
  constructor() {
    super(BattlerTagType.SPLASH_Z_BOOST);
  }
  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    console.log(`[SplashZBoostTag] 태그 추가 - ${pokemon.id}`);
    // 스탯 변경 없음 (스탯업은 Phase에서만 처리)
  }
  onRemove(pokemon: Pokemon): void {
    console.log(`[SplashZBoostTag] 태그 제거 - ${pokemon.id}`);
    super.onRemove(pokemon);
  }
}

export class SplashZCritBoostTag extends BattlerTag {
  public readonly boostAmount: number;

  constructor(boostAmount = 2) {
    super(BattlerTagType.SPLASH_Z_CRIT_BOOST, BattlerTagLapseType.TURN_END, 1, MoveId.SPLASH, undefined, true);
    this.boostAmount = boostAmount;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    try {
      const name = getPokemonNameWithAffix(pokemon);
      console.log(`[SplashZCritBoostTag] ${name}에 급소율 +2 랭크 적용됨`);
    } catch (e) {
      console.warn(`[SplashZCritBoostTag] 포켓몬 이름 출력 실패 - ID: ${pokemon?.id}, 에러: ${e}`);
    }

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:splashZCritBoostOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );

    console.log(`[SplashZCritBoostTag] 급소율 ${this.boostAmount}랭크 상승 - 포켓몬 ID: ${pokemon.id}`);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    return lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:splashZCritBoostOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );

    console.log(`[SplashZCritBoostTag] 태그 제거됨 - 포켓몬 ID: ${pokemon.id}`);
  }
}

export class SaltCuredTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.SALT_CURED;
  constructor(sourceId: number) {
    super(BattlerTagType.SALT_CURED, BattlerTagLapseType.TURN_END, 1, MoveId.SALT_CURE, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for SaltCureTag onAdd; id: ${this.sourceId}`);
      return;
    }

    super.onAdd(pokemon);
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:saltCuredOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.SALT_CURE,
      );

      // ✅ 매직가드/새벽비드/스터디밀 등 “간접 데미지 면역”이면 소금절이 틱 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        const pokemonSteelOrWater = pokemon.isOfType(PokemonType.STEEL) || pokemon.isOfType(PokemonType.WATER);

        pokemon.damageAndUpdate(toDmgValue(pokemonSteelOrWater ? pokemon.getMaxHp() / 4 : pokemon.getMaxHp() / 8), {
          result: HitResult.INDIRECT,
        });

        globalScene.phaseManager.queueMessage(
          i18next.t("battlerTags:saltCuredLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            moveName: this.getMoveName(),
          }),
        );
      }
    }

    return ret;
  }
}

export class RockCursedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.ROCK_CURSE;

  constructor(sourceId: number) {
    super(BattlerTagType.ROCK_CURSE, BattlerTagLapseType.TURN_END, 1, MoveId.ROCK_CURSE, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for RockCursedTag onAdd; id: ${this.sourceId}`);
      return;
    }

    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:rockCursedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  /**
   * 바위 타입 상성 기반 턴당 대미지 비율 계산
   * 기본은 스텔스록과 동일한 1/8 * 상성배율
   * 단, 상한은 소금절이와 동일하게 1/4까지만 허용
   *
   * 예시:
   * 0배   -> 0
   * 0.25배 -> 1/32
   * 0.5배 -> 1/16
   * 1배   -> 1/8
   * 2배   -> 1/4
   * 4배   -> 원래 1/2지만, 상한 1/4로 캡
   */
  protected getDamageHpRatio(pokemon: Pokemon): number {
    const effectiveness = pokemon.getAttackTypeEffectiveness(PokemonType.ROCK, undefined, true);
    return Math.min(0.125 * effectiveness, 0.25);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.SALT_CURE, // 전용 애니메이션 있으면 CommonAnim.ROCK_CURSE로 교체
      );

      // 간접 대미지 면역이면 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        const damageHpRatio = this.getDamageHpRatio(pokemon);

        // 바위 면역(0배)면 대미지/메시지 생략
        if (damageHpRatio > 0) {
          pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() * damageHpRatio), { result: HitResult.INDIRECT });

          globalScene.phaseManager.queueMessage(
            i18next.t("battlerTags:rockCursedLapse", {
              pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
              moveName: this.getMoveName(),
            }),
          );
        }
      }
    }

    return ret;
  }
}

export class ColdCursedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.COLD_CURSE;

  constructor(sourceId: number) {
    super(BattlerTagType.COLD_CURSE, BattlerTagLapseType.TURN_END, 1, MoveId.COLD_CURSE, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for ColdCursedTag onAdd; id: ${this.sourceId}`);
      return;
    }

    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:iceCursedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  /**
   * 바위 타입 상성 기반 턴당 대미지 비율 계산
   * 기본은 스텔스록과 동일한 1/8 * 상성배율
   * 단, 상한은 소금절이와 동일하게 1/4까지만 허용
   *
   * 예시:
   * 0배   -> 0
   * 0.25배 -> 1/32
   * 0.5배 -> 1/16
   * 1배   -> 1/8
   * 2배   -> 1/4
   * 4배   -> 원래 1/2지만, 상한 1/4로 캡
   */
  protected getDamageHpRatio(pokemon: Pokemon): number {
    const effectiveness = pokemon.getAttackTypeEffectiveness(PokemonType.ICE, undefined, true);
    return Math.min(0.125 * effectiveness, 0.25);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.SALT_CURE, // 전용 애니메이션 있으면 CommonAnim.ROCK_CURSE로 교체
      );

      // 간접 대미지 면역이면 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        const damageHpRatio = this.getDamageHpRatio(pokemon);

        // 바위 면역(0배)면 대미지/메시지 생략
        if (damageHpRatio > 0) {
          pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() * damageHpRatio), { result: HitResult.INDIRECT });

          globalScene.phaseManager.queueMessage(
            i18next.t("battlerTags:iceCursedLapse", {
              pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
              moveName: this.getMoveName(),
            }),
          );
        }
      }
    }

    return ret;
  }
}

export class RustedCursedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.RUSTED_CURSE;

  constructor(sourceId: number) {
    super(BattlerTagType.RUSTED_CURSE, BattlerTagLapseType.TURN_END, 1, MoveId.RUSTED_CURSE, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for RustedCursedTag onAdd; id: ${this.sourceId}`);
      return;
    }

    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:rustedCursedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  /**
   * 바위 타입 상성 기반 턴당 대미지 비율 계산
   * 기본은 스텔스록과 동일한 1/8 * 상성배율
   * 단, 상한은 소금절이와 동일하게 1/4까지만 허용
   *
   * 예시:
   * 0배   -> 0
   * 0.25배 -> 1/32
   * 0.5배 -> 1/16
   * 1배   -> 1/8
   * 2배   -> 1/4
   * 4배   -> 원래 1/2지만, 상한 1/4로 캡
   */
  protected getDamageHpRatio(pokemon: Pokemon): number {
    const effectiveness = pokemon.getAttackTypeEffectiveness(PokemonType.STEEL, undefined, true);
    return Math.min(0.125 * effectiveness, 0.25);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.SALT_CURE, // 전용 애니메이션 있으면 CommonAnim.ROCK_CURSE로 교체
      );

      // 간접 대미지 면역이면 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        const damageHpRatio = this.getDamageHpRatio(pokemon);

        // 바위 면역(0배)면 대미지/메시지 생략
        if (damageHpRatio > 0) {
          pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() * damageHpRatio), { result: HitResult.INDIRECT });

          globalScene.phaseManager.queueMessage(
            i18next.t("battlerTags:rustedCursedLapse", {
              pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
              moveName: this.getMoveName(),
            }),
          );
        }
      }
    }

    return ret;
  }
}

export class KnowledgeCursedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.KNOWLEDGE_CURSE;

  constructor(sourceId: number) {
    super(BattlerTagType.KNOWLEDGE_CURSE, BattlerTagLapseType.TURN_END, 1, MoveId.KNOWLEDGE_CURSE, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for KnowledgeCursedTag onAdd; id: ${this.sourceId}`);
      return;
    }

    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:knowledgeCursedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  /**
   * 바위 타입 상성 기반 턴당 대미지 비율 계산
   * 기본은 스텔스록과 동일한 1/8 * 상성배율
   * 단, 상한은 소금절이와 동일하게 1/4까지만 허용
   *
   * 예시:
   * 0배   -> 0
   * 0.25배 -> 1/32
   * 0.5배 -> 1/16
   * 1배   -> 1/8
   * 2배   -> 1/4
   * 4배   -> 원래 1/2지만, 상한 1/4로 캡
   */
  protected getDamageHpRatio(pokemon: Pokemon): number {
    const effectiveness = pokemon.getAttackTypeEffectiveness(PokemonType.PSYCHIC, undefined, true);
    return Math.min(0.125 * effectiveness, 0.25);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.SALT_CURE, // 전용 애니메이션 있으면 CommonAnim.ROCK_CURSE로 교체
      );

      // 간접 대미지 면역이면 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        const damageHpRatio = this.getDamageHpRatio(pokemon);

        // 바위 면역(0배)면 대미지/메시지 생략
        if (damageHpRatio > 0) {
          pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() * damageHpRatio), { result: HitResult.INDIRECT });

          globalScene.phaseManager.queueMessage(
            i18next.t("battlerTags:knowledgeCursedLapse", {
              pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
              moveName: this.getMoveName(),
            }),
          );
        }
      }
    }

    return ret;
  }
}

export class DrownedCursedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.DROWNED_CURSE;

  constructor(sourceId: number) {
    super(BattlerTagType.DROWNED_CURSE, BattlerTagLapseType.TURN_END, 1, MoveId.DROWNED_CURSE, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for drownedCursedTag onAdd; id: ${this.sourceId}`);
      return;
    }

    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:drownedCursedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  /**
   * 바위 타입 상성 기반 턴당 대미지 비율 계산
   * 기본은 스텔스록과 동일한 1/8 * 상성배율
   * 단, 상한은 소금절이와 동일하게 1/4까지만 허용
   *
   * 예시:
   * 0배   -> 0
   * 0.25배 -> 1/32
   * 0.5배 -> 1/16
   * 1배   -> 1/8
   * 2배   -> 1/4
   * 4배   -> 원래 1/2지만, 상한 1/4로 캡
   */
  protected getDamageHpRatio(pokemon: Pokemon): number {
    const effectiveness = pokemon.getAttackTypeEffectiveness(PokemonType.WATER, undefined, true);
    return Math.min(0.125 * effectiveness, 0.25);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.SALT_CURE, // 전용 애니메이션 있으면 CommonAnim.ROCK_CURSE로 교체
      );

      // 간접 대미지 면역이면 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        const damageHpRatio = this.getDamageHpRatio(pokemon);

        // 바위 면역(0배)면 대미지/메시지 생략
        if (damageHpRatio > 0) {
          pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() * damageHpRatio), { result: HitResult.INDIRECT });

          globalScene.phaseManager.queueMessage(
            i18next.t("battlerTags:drownedCursedLapse", {
              pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
              moveName: this.getMoveName(),
            }),
          );
        }
      }
    }

    return ret;
  }
}

export class BeastStackTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.BEAST_STACK;

  /** 맹독처럼 누적되는 턴 수 */
  public stackTurnCount = 0;

  /** 상태에 걸려 있는 동안 고정으로 늘어나는 무게 */
  public weightAdded = 100;

  constructor(sourceId: number) {
    super(BattlerTagType.BEAST_STACK, BattlerTagLapseType.TURN_END, 1, MoveId.BEAST_STACK, sourceId);
  }

  onAdd(pokemon: Pokemon): void {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for beastStackTag onAdd; id: ${this.sourceId}`);
      return;
    }

    super.onAdd(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:beastStackOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  public override loadTag(
    source: BaseBattlerTag & Pick<BeastStackTag, "tagType" | "stackTurnCount" | "weightAdded">,
  ): void {
    super.loadTag(source);
    this.stackTurnCount = source.stackTurnCount ?? 0;
    this.weightAdded = source.weightAdded ?? 100;
  }

  protected getDamageValue(pokemon: Pokemon): number {
    return Math.max(Math.floor((pokemon.getMaxHp() / 16) * this.stackTurnCount), 1);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.SALT_CURE, // 전용 애니메이션 있으면 교체
      );

      // 맹독처럼 턴 수 누적
      this.stackTurnCount += 1;

      // 매턴 스피드 하락
      globalScene.phaseManager.unshiftNew("StatStageChangePhase", pokemon.getBattlerIndex(), false, [Stat.SPD], -1);

      // 간접 대미지 면역이면 도트만 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        pokemon.damageAndUpdate(this.getDamageValue(pokemon), { result: HitResult.INDIRECT });

        globalScene.phaseManager.queueMessage(
          i18next.t("battlerTags:beastStackLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            moveName: this.getMoveName(),
            turnCount: this.stackTurnCount,
          }),
        );
      }
    }

    return ret;
  }
}

export class GMaxWildfireBurnTag extends BattlerTag {
  private sourceIndex: number;

  constructor(sourceId: number) {
    super(BattlerTagType.G_MAX_WILDFIRE_BURN, BattlerTagLapseType.TURN_END, 4, MoveId.G_MAX_WILDFIRE, sourceId);
  }

  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceIndex = source.sourceIndex;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (pokemon.isOfType(PokemonType.FIRE)) {
      pokemon.removeBattlerTag(BattlerTagType.G_MAX_WILDFIRE_BURN);
      return;
    }

    this.sourceIndex = globalScene.getPokemonById(this.sourceId!)?.getBattlerIndex() ?? -1;

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:gMaxWildfireBurnOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.MAGMA_STORM,
      );

      // ✅ 간접 데미지 면역이면 틱 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() / 8), { result: HitResult.INDIRECT });

        globalScene.phaseManager.queueMessage(
          i18next.t("battlerTags:gMaxWildfireBurnLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            moveName: this.getMoveName(),
          }),
        );
      }
    }
    return ret;
  }
}

export class GMaxVineLashTag extends BattlerTag {
  private sourceIndex: number;

  constructor(sourceId: number) {
    super(BattlerTagType.G_MAX_VINE_LASH, BattlerTagLapseType.TURN_END, 4, MoveId.G_MAX_VINE_LASH, sourceId);
  }

  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceIndex = source.sourceIndex;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (pokemon.isOfType(PokemonType.GRASS)) {
      pokemon.removeBattlerTag(BattlerTagType.G_MAX_VINE_LASH);
      return;
    }

    this.sourceIndex = globalScene.getPokemonById(this.sourceId!)?.getBattlerIndex() ?? -1;

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:gMaxVineLashOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.VINE_WHIP,
      );

      // ✅ 간접 데미지 면역이면 틱 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() / 8), { result: HitResult.INDIRECT });

        globalScene.phaseManager.queueMessage(
          i18next.t("battlerTags:gMaxVineLashLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            moveName: this.getMoveName(),
          }),
        );
      }
    }
    return ret;
  }
}

export class GMaxCannonadeTag extends BattlerTag {
  private sourceIndex: number;

  constructor(sourceId: number) {
    super(BattlerTagType.G_MAX_CANNONADE, BattlerTagLapseType.TURN_END, 4, MoveId.G_MAX_CANNONADE, sourceId);
  }

  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceIndex = source.sourceIndex;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (pokemon.isOfType(PokemonType.WATER)) {
      pokemon.removeBattlerTag(BattlerTagType.G_MAX_CANNONADE);
      return;
    }

    this.sourceIndex = globalScene.getPokemonById(this.sourceId!)?.getBattlerIndex() ?? -1;

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:gMaxCannonadeOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.HYDRO_PUMP,
      );

      // ✅ 간접 데미지 면역이면 틱 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() / 8), { result: HitResult.INDIRECT });

        globalScene.phaseManager.queueMessage(
          i18next.t("battlerTags:gMaxCannonadeLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            moveName: this.getMoveName(),
          }),
        );
      }
    }
    return ret;
  }
}

export class GMaxVolcalithTag extends BattlerTag {
  private sourceIndex: number;

  constructor(sourceId: number) {
    super(BattlerTagType.G_MAX_VOLCALITH, BattlerTagLapseType.TURN_END, 4, MoveId.G_MAX_VOLCALITH, sourceId);
  }

  loadTag(source: BattlerTag | any): void {
    super.loadTag(source);
    this.sourceIndex = source.sourceIndex;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    // 바위 타입은 효과를 받지 않음
    if (pokemon.isOfType(PokemonType.ROCK)) {
      pokemon.removeBattlerTag(BattlerTagType.G_MAX_VOLCALITH);
      return;
    }

    this.sourceIndex = globalScene.getPokemonById(this.sourceId!)?.getBattlerIndex() ?? -1;

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:gMaxVolcalithOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);
    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.ROCK_SLIDE,
      );

      // ✅ 간접 데미지 면역이면 틱 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() / 6), { result: HitResult.INDIRECT });

        globalScene.phaseManager.queueMessage(
          i18next.t("battlerTags:gMaxVolcalithLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            moveName: this.getMoveName(),
          }),
        );
      }
    }
    return ret;
  }
}

export class CursedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.CURSED;
  constructor(sourceId: number) {
    super(BattlerTagType.CURSED, BattlerTagLapseType.TURN_END, 1, MoveId.CURSE, sourceId, true);
  }

  onAdd(pokemon: Pokemon): void {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for CursedTag onAdd; id: ${this.sourceId}`);
      return;
    }

    super.onAdd(pokemon);
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = lapseType !== BattlerTagLapseType.CUSTOM || super.lapse(pokemon, lapseType);

    if (ret) {
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.SALT_CURE,
      );

      // ✅ 간접 데미지 면역(매직가드/스터디밀/새벽비드 등)이면 저주 틱 무효
      if (!blocksNonDirectDamage(pokemon, false)) {
        pokemon.damageAndUpdate(toDmgValue(pokemon.getMaxHp() / 4), { result: HitResult.INDIRECT });

        globalScene.phaseManager.queueMessage(
          i18next.t("battlerTags:cursedLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          }),
        );
      }
    }

    return ret;
  }
}

/**
 * Battler tag for attacks that remove a type post use.
 */
export class RemovedTypeTag extends SerializableBattlerTag {
  public declare readonly tagType: RemovedTypeTagType;
  constructor(tagType: RemovedTypeTagType, lapseType: BattlerTagLapseType, sourceMove: MoveId) {
    super(tagType, lapseType, 1, sourceMove);
  }
}

/** Battler tag for effects that ground the source, allowing Ground-type moves to hit them. */
export class GroundedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.IGNORE_FLYING;
  constructor(tagType: BattlerTagType.IGNORE_FLYING, lapseType: BattlerTagLapseType, sourceMove: MoveId) {
    super(tagType, lapseType, 1, sourceMove);
  }
}

/** Removes flying type from a pokemon for a single turn */
export class RoostedTag extends BattlerTag {
  private isBaseFlying: boolean;
  private isBasePureFlying: boolean;

  constructor() {
    super(BattlerTagType.ROOSTED, BattlerTagLapseType.TURN_END, 1, MoveId.ROOST);
  }

  onRemove(pokemon: Pokemon): void {
    const currentTypes = pokemon.getTypes();
    const baseTypes = pokemon.getTypes(false, false, true);

    const forestsCurseApplied: boolean =
      currentTypes.includes(PokemonType.GRASS) && !baseTypes.includes(PokemonType.GRASS);
    const trickOrTreatApplied: boolean =
      currentTypes.includes(PokemonType.GHOST) && !baseTypes.includes(PokemonType.GHOST);

    if (this.isBaseFlying) {
      let modifiedTypes: PokemonType[] = [];
      if (this.isBasePureFlying) {
        if (forestsCurseApplied || trickOrTreatApplied) {
          modifiedTypes = currentTypes.filter(type => type !== PokemonType.NORMAL);
          modifiedTypes.push(PokemonType.FLYING);
        } else {
          modifiedTypes = [PokemonType.FLYING];
        }
      } else {
        modifiedTypes = [...currentTypes];
        modifiedTypes.push(PokemonType.FLYING);
      }
      pokemon.summonData.types = modifiedTypes;
      pokemon.updateInfo();
    }
  }

  onAdd(pokemon: Pokemon): void {
    const currentTypes = pokemon.getTypes();
    const baseTypes = pokemon.getTypes(false, false, true);

    const isOriginallyDualType = baseTypes.length === 2;
    const isCurrentlyDualType = currentTypes.length === 2;
    this.isBaseFlying = baseTypes.includes(PokemonType.FLYING);
    this.isBasePureFlying = baseTypes[0] === PokemonType.FLYING && baseTypes.length === 1;

    if (this.isBaseFlying) {
      let modifiedTypes: PokemonType[];
      if (this.isBasePureFlying && !isCurrentlyDualType) {
        modifiedTypes = [PokemonType.NORMAL];
      } else if (!!pokemon.getTag(RemovedTypeTag) && isOriginallyDualType && !isCurrentlyDualType) {
        modifiedTypes = [PokemonType.UNKNOWN];
      } else {
        modifiedTypes = currentTypes.filter(type => type !== PokemonType.FLYING);
      }
      pokemon.summonData.types = modifiedTypes;
      pokemon.updateInfo();
    }
  }
}

/** Common attributes of form change abilities that block damage */
export class FormBlockDamageTag extends SerializableBattlerTag {
  public declare readonly tagType: BattlerTagType.ICE_FACE | BattlerTagType.DISGUISE;
  constructor(tagType: BattlerTagType.ICE_FACE | BattlerTagType.DISGUISE) {
    super(tagType, BattlerTagLapseType.CUSTOM, 1);
  }

  /**
   * Determines if the tag can be added to the Pokémon.
   * @param pokemon - The Pokémon to which the tag might be added.
   * @returns `true` if the tag can be added, `false` otherwise.
   */
  canAdd(pokemon: Pokemon): boolean {
    return pokemon.formIndex === 0;
  }

  /**
   * Applies the tag to the Pokémon.
   * Triggers a form change if the Pokémon is not in its defense form.
   * @param pokemon The Pokémon to which the tag is added.
   */
  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (pokemon.formIndex !== 0) {
      globalScene.triggerPokemonFormChange(pokemon, SpeciesFormChangeAbilityTrigger);
    }
  }

  /**
   * Removes the tag from the Pokémon.
   * Triggers a form change when the tag is removed.
   * @param pokemon - The Pokémon from which the tag is removed.
   */
  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    globalScene.triggerPokemonFormChange(pokemon, SpeciesFormChangeAbilityTrigger);
  }
}

/** Provides the additional weather-based effects of the Ice Face ability */
export class IceFaceBlockDamageTag extends FormBlockDamageTag {
  public override readonly tagType = BattlerTagType.ICE_FACE;
  /**
   * Determines if the tag can be added to the Pokémon.
   * @param pokemon - The Pokémon to which the tag might be added.
   * @returns `true` if the tag can be added, `false` otherwise.
   */
  canAdd(pokemon: Pokemon): boolean {
    const weatherType = globalScene.arena.weather?.weatherType;
    const isWeatherSnowOrHail = weatherType === WeatherType.HAIL || weatherType === WeatherType.SNOW;

    return super.canAdd(pokemon) || isWeatherSnowOrHail;
  }
}

/**
 * Battler tag indicating a Tatsugiri with {@link https://bulbapedia.bulbagarden.net/wiki/Commander_(Ability) | Commander}
 * has entered the tagged Pokemon's mouth.
 * @sealed
 */
export class CommandedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.COMMANDED;
  public readonly tatsugiriFormKey: string = "curly";

  constructor(sourceId: number) {
    super(BattlerTagType.COMMANDED, BattlerTagLapseType.CUSTOM, 0, MoveId.NONE, sourceId);
  }

  /** Caches the Tatsugiri's form key and sharply boosts the tagged Pokemon's stats */
  override onAdd(pokemon: Pokemon): void {
    (this as Mutable<this>).tatsugiriFormKey = this.getSourcePokemon()?.getFormKey() ?? "curly";
    globalScene.phaseManager.unshiftNew(
      "StatStageChangePhase",
      pokemon.getBattlerIndex(),
      true,
      [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      2,
    );
  }

  /** Triggers an {@linkcode PokemonAnimType | animation} of the tagged Pokemon "spitting out" Tatsugiri */
  override onRemove(pokemon: Pokemon): void {
    if (this.getSourcePokemon()?.isActive(true)) {
      globalScene.triggerPokemonBattleAnim(pokemon, PokemonAnimType.COMMANDER_REMOVE);
    }
  }

  override loadTag(source: BaseBattlerTag & Pick<CommandedTag, "tagType" | "tatsugiriFormKey">): void {
    super.loadTag(source);
    (this as Mutable<this>).tatsugiriFormKey = source.tatsugiriFormKey;
  }
}

/**
 * Battler tag enabling the Stockpile mechanic. This tag handles:
 * - Stack tracking, including max limit enforcement (which is replicated in Stockpile for redundancy).
 *
 * - Stat changes on adding a stack. Adding a stockpile stack attempts to raise the pokemon's DEF and SPDEF by +1.
 *
 * - Stat changes on removal of (all) stacks.
 *   - Removing stacks decreases DEF and SPDEF, independently, by one stage for each stack that successfully changed
 *     the stat when added.
 * @sealed
 */
export class StockpilingTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.STOCKPILING;
  public stockpiledCount = 0;
  public statChangeCounts: { [Stat.DEF]: number; [Stat.SPDEF]: number } = {
    [Stat.DEF]: 0,
    [Stat.SPDEF]: 0,
  };

  constructor(sourceMove: MoveId = MoveId.NONE) {
    super(BattlerTagType.STOCKPILING, BattlerTagLapseType.CUSTOM, 1, sourceMove);
  }

  private onStatStagesChanged(_: Pokemon | null, statsChanged: BattleStat[], statChanges: number[]) {
    const defChange = statChanges[statsChanged.indexOf(Stat.DEF)] ?? 0;
    const spDefChange = statChanges[statsChanged.indexOf(Stat.SPDEF)] ?? 0;

    if (defChange) {
      this.statChangeCounts[Stat.DEF]++;
    }
    if (spDefChange) {
      this.statChangeCounts[Stat.SPDEF]++;
    }

    // Removed during bundling; used to ensure this method's signature retains parity
    // with the `StatStageChangeCallback` type.
    this.onStatStagesChanged satisfies StatStageChangeCallback;
  }

  public override loadTag(
    source: BaseBattlerTag & Pick<StockpilingTag, "tagType" | "stockpiledCount" | "statChangeCounts">,
  ): void {
    super.loadTag(source);
    this.stockpiledCount = source.stockpiledCount || 0;
    this.statChangeCounts = {
      [Stat.DEF]: source.statChangeCounts?.[Stat.DEF] ?? 0,
      [Stat.SPDEF]: source.statChangeCounts?.[Stat.SPDEF] ?? 0,
    };
  }

  /**
   * Adds a stockpile stack to a pokemon, up to a maximum of 3 stacks. Note that onOverlap defers to this method.
   *
   * If a stack is added, a message is displayed and the pokemon's DEF and SPDEF are increased by 1.
   * For each stat, an internal counter is incremented (by 1) if the stat was successfully changed.
   */
  onAdd(pokemon: Pokemon): void {
    if (this.stockpiledCount < 3) {
      this.stockpiledCount++;

      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:stockpilingOnAdd", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          stockpiledCount: this.stockpiledCount,
        }),
      );

      // Attempt to increase DEF and SPDEF by one stage, keeping track of successful changes.
      globalScene.phaseManager.unshiftNew(
        "StatStageChangePhase",
        pokemon.getBattlerIndex(),
        true,
        [Stat.SPDEF, Stat.DEF],
        1,
        true,
        false,
        true,
        this.onStatStagesChanged.bind(this),
      );
    }
  }

  onOverlap(pokemon: Pokemon): void {
    this.onAdd(pokemon);
  }

  /**
   * Removing the tag removes all stacks, and the pokemon's DEF and SPDEF are decreased by
   * one stage for each stack which had successfully changed that particular stat during onAdd.
   */
  onRemove(pokemon: Pokemon): void {
    const defChange = this.statChangeCounts[Stat.DEF];
    const spDefChange = this.statChangeCounts[Stat.SPDEF];

    if (defChange) {
      globalScene.phaseManager.unshiftNew(
        "StatStageChangePhase",
        pokemon.getBattlerIndex(),
        true,
        [Stat.DEF],
        -defChange,
        true,
        false,
        true,
      );
    }

    if (spDefChange) {
      globalScene.phaseManager.unshiftNew(
        "StatStageChangePhase",
        pokemon.getBattlerIndex(),
        true,
        [Stat.SPDEF],
        -spDefChange,
        true,
        false,
        true,
      );
    }
  }
}

/**
 * Battler tag for Gulp Missile used by Cramorant.
 */
export class GulpMissileTag extends SerializableBattlerTag {
  public declare readonly tagType: BattlerTagType.GULP_MISSILE_ARROKUDA | BattlerTagType.GULP_MISSILE_PIKACHU;
  constructor(tagType: BattlerTagType.GULP_MISSILE_ARROKUDA | BattlerTagType.GULP_MISSILE_PIKACHU, sourceMove: MoveId) {
    super(tagType, BattlerTagLapseType.HIT, 0, sourceMove);
  }

  override lapse(pokemon: Pokemon, _lapseType: BattlerTagLapseType): boolean {
    if (pokemon.getTag(BattlerTagType.UNDERWATER)) {
      return true;
    }

    const moveEffectPhase = globalScene.phaseManager.getCurrentPhase();
    if (moveEffectPhase.is("MoveEffectPhase")) {
      const attacker = moveEffectPhase.getUserPokemon();
      if (!attacker) {
        return false;
      }

      if (moveEffectPhase.move.hitsSubstitute(attacker, pokemon)) {
        return true;
      }

      // ✅ Gulp Missile의 “간접 데미지(1/4)”는 attacker가 받음
      // ✅ 매직가드/새벽비드/스터디밀 등 간접 데미지 면역이면 데미지 스킵
      if (!blocksNonDirectDamage(attacker, false)) {
        attacker.damageAndUpdate(Math.max(1, Math.floor(attacker.getMaxHp() / 4)), { result: HitResult.INDIRECT });
      }

      // (부가효과는 데미지 면역이어도 그대로 발동시키는 쪽이 보통 자연스럽습니다)
      if (this.tagType === BattlerTagType.GULP_MISSILE_ARROKUDA) {
        globalScene.phaseManager.unshiftNew("StatStageChangePhase", attacker.getBattlerIndex(), false, [Stat.DEF], -1);
      } else {
        attacker.trySetStatus(StatusEffect.PARALYSIS, pokemon);
      }
    }

    return false;
  }

  canAdd(pokemon: Pokemon): boolean {
    const isSurfOrDive = [MoveId.SURF, MoveId.DIVE].includes(this.sourceMove!);
    const isNormalForm =
      pokemon.formIndex === 0
      && !pokemon.getTag(BattlerTagType.GULP_MISSILE_ARROKUDA)
      && !pokemon.getTag(BattlerTagType.GULP_MISSILE_PIKACHU);
    const isCramorant = pokemon.species.speciesId === SpeciesId.CRAMORANT;

    return isSurfOrDive && isNormalForm && isCramorant;
  }

  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    globalScene.triggerPokemonFormChange(pokemon, SpeciesFormChangeAbilityTrigger);
  }

  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
    globalScene.triggerPokemonFormChange(pokemon, SpeciesFormChangeAbilityTrigger);
  }
}

/**
 * Tag that makes the target drop the immunities granted by a particular type
 * and all accuracy checks ignore its evasiveness stat.
 *
 * Applied by moves: {@linkcode MoveId.ODOR_SLEUTH | Odor Sleuth},
 * {@linkcode MoveId.MIRACLE_EYE | Miracle Eye} and {@linkcode MoveId.FORESIGHT | Foresight}.
 *
 * @see {@linkcode ignoreImmunity}
 */
export class ExposedTag extends SerializableBattlerTag {
  public declare readonly tagType: BattlerTagType.IGNORE_DARK | BattlerTagType.IGNORE_GHOST;
  #defenderType: PokemonType;
  #allowedTypes: readonly PokemonType[];

  constructor(
    tagType: BattlerTagType.IGNORE_DARK | BattlerTagType.IGNORE_GHOST,
    sourceMove: MoveId,
    defenderType: PokemonType,
    allowedTypes: PokemonType[],
  ) {
    super(tagType, BattlerTagLapseType.CUSTOM, 1, sourceMove);
    this.#defenderType = defenderType;
    this.#allowedTypes = allowedTypes;
  }

  /**
   * @param type - The defending type to check against
   * @param moveType - The pokemon type of the move being used
   * @returns `true` if the move should be allowed to target the defender.
   */
  ignoreImmunity(type: PokemonType, moveType: PokemonType): boolean {
    return type === this.#defenderType && this.#allowedTypes.includes(moveType);
  }
}

/**
 * Tag that prevents HP recovery from held items and move effects. It also blocks the usage of recovery moves.
 * Applied by moves:  {@linkcode MoveId.HEAL_BLOCK | Heal Block (5 turns)}, {@linkcode MoveId.PSYCHIC_NOISE | Psychic Noise (2 turns)}
 */
export class HealBlockTag extends MoveRestrictionBattlerTag {
  public override readonly tagType = BattlerTagType.HEAL_BLOCK;

  constructor(turnCount: number, sourceMove: MoveId) {
    super(
      BattlerTagType.HEAL_BLOCK,
      [BattlerTagLapseType.PRE_MOVE, BattlerTagLapseType.TURN_END],
      turnCount,
      sourceMove,
    );
  }

  override canAdd(pokemon: Pokemon): boolean {
    return pokemon.canAddTag?.(BattlerTagType.HEAL_BLOCK) ?? true;
  }

  // ✅ 여기 추가
  override onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (!pokemon.getTag(BattlerTagType.HEAL_BLOCK)) {
      return;
    }

    const mentalHerb = pokemon.getHeldItems?.().find(item => item instanceof MentalHerbModifier) as
      | MentalHerbModifier
      | undefined;

    if (mentalHerb) {
      const removed = mentalHerb.apply(pokemon);
      if (removed) {
        return;
      }
    }

    globalScene.phaseManager.queueMessage(
      i18next.t("battle:battlerTagsHealBlock", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  onActivation(pokemon: Pokemon): string {
    return i18next.t("battle:battlerTagsHealBlock", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
    });
  }

  /**
   * Checks if a move is disabled under Heal Block
   * @param move - {@linkcode MoveId | ID} of the move being used
   * @returns `true` if the move has a TRIAGE_MOVE flag and is a status move
   */
  override isMoveRestricted(move: MoveId): boolean {
    return allMoves[move].hasFlag(MoveFlags.TRIAGE_MOVE) && allMoves[move].category === MoveCategory.STATUS;
  }

  /**
   * Checks if a move is disabled under Heal Block because of its choice of target
   * Implemented b/c of Pollen Puff
   * @param move - {@linkcode MoveId | ID} of the move being used
   * @param user - The pokemon using the move
   * @param target - The target of the move
   * @returns `true` if the move cannot be used because the target is an ally
   */
  override isMoveTargetRestricted(move: MoveId, user: Pokemon, target: Pokemon) {
    const moveCategory = new NumberHolder(allMoves[move].category);
    applyMoveAttrs("StatusCategoryOnAllyAttr", user, target, allMoves[move], moveCategory);
    return allMoves[move].hasAttr("HealOnAllyAttr") && moveCategory.value === MoveCategory.STATUS;
  }

  /**
   * Uses its own unique selectionDeniedText() message
   */
  override selectionDeniedText(pokemon: Pokemon, move: MoveId): string {
    return i18next.t("battle:moveDisabledHealBlock", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      moveName: allMoves[move].name,
      healBlockName: allMoves[MoveId.HEAL_BLOCK].name,
    });
  }

  /**
   * @param pokemon - {@linkcode Pokemon} attempting to use the restricted move
   * @param move - {@linkcode MoveId | ID} of the move being interrupted
   * @returns Text to display when the move is interrupted
   */
  override interruptedText(pokemon: Pokemon, move: MoveId): string {
    return i18next.t("battle:moveDisabledHealBlock", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      moveName: allMoves[move].name,
      healBlockName: allMoves[MoveId.HEAL_BLOCK].name,
    });
  }

  override onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);

    globalScene.phaseManager.queueMessage(
      i18next.t("battle:battlerTagsHealBlockOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
      null,
      false,
      null,
    );
  }
}

/**
 * Tag that doubles the type effectiveness of Fire-type moves.
 */
export class TarShotTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.TAR_SHOT;
  constructor() {
    super(BattlerTagType.TAR_SHOT, BattlerTagLapseType.CUSTOM, 0);
  }

  /**
   * If the Pokemon is terastallized, the tag cannot be added.
   * @param pokemon - The pokemon to check
   * @returns Whether the tag can be added
   */
  override canAdd(pokemon: Pokemon): boolean {
    return !pokemon.isTerastallized;
  }

  override onAdd(pokemon: Pokemon): void {
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:tarShotOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }
}

/**
 * Battler Tag implementing the type-changing effect of {@link https://bulbapedia.bulbagarden.net/wiki/Electrify_(move) | Electrify}.
 * While this tag is in effect, the afflicted Pokemon's moves are changed to Electric type.
 */
export class ElectrifiedTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.ELECTRIFIED;
  constructor() {
    super(BattlerTagType.ELECTRIFIED, BattlerTagLapseType.TURN_END, 1, MoveId.ELECTRIFY);
  }

  override onAdd(pokemon: Pokemon): void {
    // "{pokemonNameWithAffix}'s moves have been electrified!"
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:electrifiedOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }
}

/**
 * Battler Tag that keeps track of how many times the user has Autotomized
 * Each count of Autotomization reduces the weight by 100kg
 */
export class AutotomizedTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.AUTOTOMIZED;
  public autotomizeCount = 0;
  constructor(sourceMove: MoveId = MoveId.AUTOTOMIZE) {
    super(BattlerTagType.AUTOTOMIZED, BattlerTagLapseType.CUSTOM, 1, sourceMove);
  }

  /**
   * Adds an autotomize count to the Pokemon. Each stack reduces weight by 100kg
   * If the Pokemon is over 0.1kg it also displays a message.
   * @param pokemon The Pokemon that is being autotomized
   */
  onAdd(pokemon: Pokemon): void {
    const minWeight = 0.1;
    if (pokemon.getWeight() > minWeight) {
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:autotomizeOnAdd", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );
    }
    this.autotomizeCount += 1;
  }

  onOverlap(pokemon: Pokemon): void {
    this.onAdd(pokemon);
  }

  public override loadTag(source: BaseBattlerTag & Pick<AutotomizedTag, "tagType" | "autotomizeCount">): void {
    super.loadTag(source);
    this.autotomizeCount = source.autotomizeCount;
  }
}

/**
 * Tag implementing the {@link https://bulbapedia.bulbagarden.net/wiki/Substitute_(doll)#Effect | Substitute Doll} effect,
 * for use with the moves Substitute and Shed Tail. Pokemon with this tag deflect most forms of received attack damage
 * onto the tag. This tag also grants immunity to most Status moves and several move effects.
 *
 * @sealed
 */
export class SubstituteTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.SUBSTITUTE;
  /** The substitute's remaining HP. If HP is depleted, the Substitute fades. */
  public hp: number;

  //#region non-serializable properties
  /** A reference to the sprite representing the Substitute doll */
  #sprite: Phaser.GameObjects.Sprite;
  /** A reference to the sprite representing the Substitute doll */
  public get sprite(): Phaser.GameObjects.Sprite {
    return this.#sprite;
  }
  public set sprite(value: Phaser.GameObjects.Sprite) {
    this.#sprite = value;
  }
  /** Is the source Pokemon "in focus," i.e. is it fully visible on the field? */
  #sourceInFocus: boolean;
  /** Is the source Pokemon "in focus," i.e. is it fully visible on the field? */
  public get sourceInFocus(): boolean {
    return this.#sourceInFocus;
  }
  public set sourceInFocus(value: boolean) {
    this.#sourceInFocus = value;
  }
  //#endregion non-serializable properties

  constructor(sourceMove: MoveId, sourceId: number) {
    super(
      BattlerTagType.SUBSTITUTE,
      [BattlerTagLapseType.MOVE, BattlerTagLapseType.AFTER_MOVE, BattlerTagLapseType.HIT],
      0,
      sourceMove,
      sourceId,
      true,
    );
  }

  /** Sets the Substitute's HP and queues an on-add battle animation that initializes the Substitute's sprite. */
  onAdd(pokemon: Pokemon): void {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for SubstituteTag onAdd; id: ${this.sourceId}`);
      return;
    }

    this.hp = Math.floor(source.getMaxHp() / 4);
    this.sourceInFocus = false;

    // Queue battle animation and message
    globalScene.triggerPokemonBattleAnim(pokemon, PokemonAnimType.SUBSTITUTE_ADD);
    if (this.sourceMove === MoveId.SHED_TAIL) {
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:shedTailOnAdd", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
        1500,
      );
    } else {
      globalScene.phaseManager.queueMessage(
        i18next.t("battlerTags:substituteOnAdd", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
        1500,
      );
    }

    // Remove any binding effects from the user
    pokemon.findAndRemoveTags(tag => tag instanceof DamagingTrapTag);
  }

  /** Queues an on-remove battle animation that removes the Substitute's sprite. */
  onRemove(pokemon: Pokemon): void {
    // Only play the animation if the cause of removal isn't from the source's own move
    if (!this.sourceInFocus) {
      globalScene.triggerPokemonBattleAnim(pokemon, PokemonAnimType.SUBSTITUTE_REMOVE, [this.sprite]);
    } else {
      this.sprite.destroy();
    }
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:substituteOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    switch (lapseType) {
      case BattlerTagLapseType.MOVE:
        this.onPreMove(pokemon);
        break;
      case BattlerTagLapseType.AFTER_MOVE:
        this.onAfterMove(pokemon);
        break;
      case BattlerTagLapseType.HIT:
        this.onHit(pokemon);
        break;
    }
    return lapseType !== BattlerTagLapseType.CUSTOM; // only remove this tag on custom lapse
  }

  /** Triggers an animation that brings the Pokemon into focus before it uses a move */
  onPreMove(pokemon: Pokemon): void {
    globalScene.triggerPokemonBattleAnim(pokemon, PokemonAnimType.SUBSTITUTE_PRE_MOVE, [this.sprite]);
    this.sourceInFocus = true;
  }

  /** Triggers an animation that brings the Pokemon out of focus after it uses a move */
  onAfterMove(pokemon: Pokemon): void {
    globalScene.triggerPokemonBattleAnim(pokemon, PokemonAnimType.SUBSTITUTE_POST_MOVE, [this.sprite]);
    this.sourceInFocus = false;
  }

  /** If the Substitute redirects damage, queue a message to indicate it. */
  onHit(pokemon: Pokemon): void {
    const moveEffectPhase = globalScene.phaseManager.getCurrentPhase();
    if (moveEffectPhase.is("MoveEffectPhase")) {
      const attacker = moveEffectPhase.getUserPokemon();
      if (!attacker) {
        return;
      }
      const move = moveEffectPhase.move;
      const firstHit = attacker.turnData.hitCount === attacker.turnData.hitsLeft;

      if (firstHit && move.hitsSubstitute(attacker, pokemon)) {
        globalScene.phaseManager.queueMessage(
          i18next.t("battlerTags:substituteOnHit", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          }),
        );
      }
    }
  }

  /**
   * When given a battler tag or json representing one, load the data for it.
   * @param source - An object containing the necessary properties to load the tag
   */
  public override loadTag(source: BaseBattlerTag & Pick<SubstituteTag, "tagType" | "hp">): void {
    super.loadTag(source);
    this.hp = source.hp;
  }
}

/**
 * Tag that adds extra post-summon effects to a battle for a specific Pokemon.
 * These post-summon effects are performed through {@linkcode Pokemon.mysteryEncounterBattleEffects},
 * and can be used to unshift special phases, etc.
 * Currently used only in MysteryEncounters to provide start of fight stat buffs.
 */
export class MysteryEncounterPostSummonTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.MYSTERY_ENCOUNTER_POST_SUMMON;
  constructor() {
    super(BattlerTagType.MYSTERY_ENCOUNTER_POST_SUMMON, BattlerTagLapseType.CUSTOM, 1);
  }

  /** Event when tag is added */
  onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
  }

  /** Performs post-summon effects through {@linkcode Pokemon.mysteryEncounterBattleEffects} */
  lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const ret = super.lapse(pokemon, lapseType);

    if (lapseType === BattlerTagLapseType.CUSTOM) {
      pokemon.mysteryEncounterBattleEffects?.(pokemon);
    }

    return ret;
  }

  /** Event when tag is removed */
  onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
  }
}

/**
 * Battle Tag that applies the move Torment to the target Pokemon
 * Torment restricts the use of moves twice in a row.
 * The tag is only removed if the target leaves the battle.
 * Torment does not interrupt the move if the move is performed consecutively in the same turn and right after Torment is applied
 */
export class TormentTag extends MoveRestrictionBattlerTag {
  constructor(sourceId: number) {
    super(BattlerTagType.TORMENT, BattlerTagLapseType.AFTER_MOVE, 1, MoveId.TORMENT, sourceId);
  }

  override canAdd(pokemon: Pokemon): boolean {
    return pokemon.canAddTag?.(BattlerTagType.TORMENT) ?? true;
  }

  override onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);

    if (!pokemon.getTag(BattlerTagType.TORMENT)) {
      return;
    }

    console.log("TormentTag added to Pokemon:", getPokemonNameWithAffix(pokemon));

    const mentalHerb = pokemon.getHeldItems?.().find(item => item instanceof MentalHerbModifier) as
      | MentalHerbModifier
      | undefined;

    if (mentalHerb) {
      const removed = mentalHerb.apply(pokemon);
      if (removed) {
        return;
      }
    }

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:tormentOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
      1500,
    );
  }

  override lapse(pokemon: Pokemon, _tagType: BattlerTagLapseType): boolean {
    // 토먼트는 배틀에서 나가기 전까지 유지
    return pokemon.isActive(true);
  }

  public override isMoveRestricted(move: MoveId, user: Pokemon): boolean {
    if (!user) {
      return false;
    }
    const lastMove = user.getLastXMoves(1)[0];
    if (!lastMove) {
      return false;
    }
    // This checks for locking / momentum moves like Rollout and Hydro Cannon + if the user is under the influence of BattlerTagType.FRENZY
    // Because Uproar's unique behavior is not implemented, it does not check for Uproar. Torment has been marked as partial in moves.ts
    const moveObj = allMoves[lastMove.move];
    const isUnaffected = moveObj.hasAttr("ConsecutiveUseDoublePowerAttr") || user.getTag(BattlerTagType.FRENZY);
    const validLastMoveResult = lastMove.result === MoveResult.SUCCESS || lastMove.result === MoveResult.MISS;
    return lastMove.move === move && validLastMoveResult && lastMove.move !== MoveId.STRUGGLE && !isUnaffected;
  }

  override selectionDeniedText(pokemon: Pokemon, _move: MoveId): string {
    return i18next.t("battle:moveDisabledTorment", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
    });
  }
}

/**
 * BattlerTag that applies the effects of Taunt to the target Pokemon
 * Taunt restricts the use of status moves.
 * The tag is removed after 4 turns.
 */
export class TauntTag extends MoveRestrictionBattlerTag {
  constructor() {
    super(BattlerTagType.TAUNT, [BattlerTagLapseType.PRE_MOVE, BattlerTagLapseType.AFTER_MOVE], 4, MoveId.TAUNT);
  }

  override canAdd(pokemon: Pokemon): boolean {
    return pokemon.canAddTag?.(BattlerTagType.TAUNT) ?? true;
  }

  override onAdd(pokemon: Pokemon): void {
    super.onAdd(pokemon);
    console.log("TauntTag added to Pokemon:", getPokemonNameWithAffix(pokemon));

    if (!pokemon.getTag(BattlerTagType.TAUNT)) {
      return;
    }

    // ✅ 멘탈허브 보유 여부 확인
    const mentalHerb = globalScene
      .getModifiers(MentalHerbModifier, pokemon.isPlayer())
      .find(mod => mod instanceof MentalHerbModifier && mod.pokemonId === pokemon.id) as MentalHerbModifier | undefined;

    if (mentalHerb) {
      console.log("Mental Herb detected - removing Taunt tag immediately");

      // 멘탈허브 발동 → 태그 제거 & 아이템 소모
      const removed = mentalHerb.apply(pokemon);
      if (removed) {
        console.log("Taunt removed by Mental Herb");
        return; // 메시지 출력 생략 (apply()에서 발동 메시지 출력)
      }
    }

    // 멘탈허브 없으면 기본 메시지 출력
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:tauntOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
      1500,
    );
  }

  public override onRemove(pokemon: Pokemon): void {
    super.onRemove(pokemon);
    console.log("onRemove called for Pokemon:", getPokemonNameWithAffix(pokemon));

    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:tauntOnRemove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  override isMoveRestricted(move: Moves): boolean {
    return allMoves[move].category === MoveCategory.STATUS;
  }

  override selectionDeniedText(pokemon: Pokemon, move: Moves): string {
    return i18next.t("battle:moveDisabledTaunt", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      moveName: allMoves[move].name,
    });
  }

  override interruptedText(pokemon: Pokemon, move: Moves): string {
    return i18next.t("battle:moveDisabledTaunt", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      moveName: allMoves[move].name,
    });
  }
}

/**
 * BattlerTag that applies the effects of Imprison to the target Pokemon
 * Imprison restricts the opposing side's usage of moves shared by the source-user of Imprison.
 * The tag is only removed when the source-user is removed from the field.
 */
export class ImprisonTag extends MoveRestrictionBattlerTag {
  public override readonly tagType = BattlerTagType.IMPRISON;
  constructor(sourceId: number) {
    super(BattlerTagType.IMPRISON, BattlerTagLapseType.AFTER_MOVE, 1, MoveId.IMPRISON, sourceId);
  }

  /**
   * Checks if the source of Imprison is still active
   * @param pokemon - The pokemon this tag is attached to
   * @returns `true` if the source is still active
   */
  public override lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType): boolean {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for ImprisonTag lapse; id: ${this.sourceId}`);
      return false;
    }
    if (lapseType === BattlerTagLapseType.PRE_MOVE) {
      return super.lapse(pokemon, lapseType) && source.isActive(true);
    }
    return source.isActive(true);
  }

  /**
   * Checks if the source of the tag has the parameter move in its moveset and that the source is still active
   * @param move - The move under investigation
   * @returns `false` if either condition is not met
   */
  public override isMoveRestricted(move: MoveId, _user: Pokemon): boolean {
    const source = this.getSourcePokemon();
    if (source) {
      const sourceMoveset = source.getMoveset().map(m => m.moveId);
      return sourceMoveset?.includes(move) && source.isActive(true);
    }
    return false;
  }

  override selectionDeniedText(pokemon: Pokemon, move: MoveId): string {
    return i18next.t("battle:moveDisabledImprison", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      moveName: allMoves[move].name,
    });
  }

  override interruptedText(pokemon: Pokemon, move: MoveId): string {
    return i18next.t("battle:moveDisabledImprison", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      moveName: allMoves[move].name,
    });
  }
}

/**
 * Battler Tag that applies the effects of Syrup Bomb to the target Pokemon.
 * For three turns, starting from the turn of hit, at the end of each turn, the target Pokemon's speed will decrease by 1.
 * The tag can also expire by taking the target Pokemon off the field, or the Pokemon that originally used the move.
 */
export class SyrupBombTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.SYRUP_BOMB;
  constructor(sourceId: number) {
    super(BattlerTagType.SYRUP_BOMB, BattlerTagLapseType.TURN_END, 3, MoveId.SYRUP_BOMB, sourceId);
  }

  /**
   * Adds the Syrup Bomb battler tag to the target Pokemon.
   * @param pokemon - The target {@linkcode Pokemon}
   */
  override onAdd(pokemon: Pokemon) {
    super.onAdd(pokemon);
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:syrupBombOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  /**
   * Applies the single-stage speed down to the target Pokemon and decrements the tag's turn count
   * @param pokemon - The target {@linkcode Pokemon}
   * @param _lapseType - N/A
   * @returns Whether the tag should persist (`turnsRemaining > 0` and source still on field)
   */
  override lapse(pokemon: Pokemon, _lapseType: BattlerTagLapseType): boolean {
    const source = this.getSourcePokemon();
    if (!source) {
      console.warn(`Failed to get source Pokemon for SyrupBombTag lapse; id: ${this.sourceId}`);
      return false;
    }

    // Syrup bomb clears immediately if source leaves field/faints
    if (!source.isActive(true)) {
      return false;
    }

    // Custom message in lieu of an animation in mainline
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:syrupBombLapse", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
    globalScene.phaseManager.unshiftNew(
      "StatStageChangePhase",
      pokemon.getBattlerIndex(),
      true,
      [Stat.SPD],
      -1,
      true,
      false,
      true,
    );
    return super.lapse(pokemon, _lapseType);
  }
}

/**
 * Telekinesis raises the target into the air for three turns and causes all moves used against the target (aside from OHKO moves) to hit the target unless the target is in a semi-invulnerable state from Fly/Dig.
 * The first effect is provided by {@linkcode FloatingTag}, the accuracy-bypass effect is provided by TelekinesisTag
 * The effects of Telekinesis can be baton passed to a teammate.
 * @see {@link https://bulbapedia.bulbagarden.net/wiki/Telekinesis_(move) | MoveId.TELEKINESIS}
 */
export class TelekinesisTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.TELEKINESIS;
  constructor(sourceMove: MoveId) {
    super(
      BattlerTagType.TELEKINESIS,
      [BattlerTagLapseType.PRE_MOVE, BattlerTagLapseType.AFTER_MOVE],
      3,
      sourceMove,
      undefined,
      true,
    );
  }

  override onAdd(pokemon: Pokemon) {
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:telekinesisOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }
}

/**
 * Tag that swaps the user's base ATK stat with its base DEF stat.
 */
export class PowerTrickTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.POWER_TRICK;
  constructor(sourceMove: MoveId, sourceId: number) {
    super(BattlerTagType.POWER_TRICK, BattlerTagLapseType.CUSTOM, 0, sourceMove, sourceId, true);
  }

  onAdd(pokemon: Pokemon): void {
    this.swapStat(pokemon);
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:powerTrickActive", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  onRemove(pokemon: Pokemon): void {
    this.swapStat(pokemon);
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:powerTrickActive", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  /**
   * Removes the Power Trick tag and reverts any stat changes if the tag is already applied.
   * @param pokemon - The {@linkcode Pokemon} that already has the Power Trick tag.
   */
  onOverlap(pokemon: Pokemon): void {
    pokemon.removeTag(this.tagType);
  }

  /**
   * Swaps the user's base ATK stat with its base DEF stat.
   * @param pokemon - The {@linkcode Pokemon} whose stats will be swapped.
   */
  swapStat(pokemon: Pokemon): void {
    const temp = pokemon.getStat(Stat.ATK, false);
    pokemon.setStat(Stat.ATK, pokemon.getStat(Stat.DEF, false), false);
    pokemon.setStat(Stat.DEF, temp, false);
  }
}

/**
 * Tag associated with the move Grudge.
 * If this tag is active when the bearer faints from an opponent's move, the tag reduces that move's PP to 0.
 * Otherwise, it lapses when the bearer makes another move.
 */
export class GrudgeTag extends SerializableBattlerTag {
  public override readonly tagType = BattlerTagType.GRUDGE;
  constructor() {
    super(BattlerTagType.GRUDGE, BattlerTagLapseType.PRE_MOVE, 1, MoveId.GRUDGE);
  }

  onAdd(pokemon: Pokemon) {
    super.onAdd(pokemon);
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:grudgeOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }

  /**
   * Activates Grudge's special effect on the attacking Pokemon and lapses the tag.
   * @param pokemon
   * @param lapseType
   * @param sourcePokemon - The source of the move that fainted the tag's bearer
   * @returns `false` if Grudge activates its effect or lapses
   */
  // TODO: Confirm whether this should interact with copying moves
  override lapse(pokemon: Pokemon, lapseType: BattlerTagLapseType, sourcePokemon?: Pokemon): boolean {
    if (!sourcePokemon || lapseType !== BattlerTagLapseType.CUSTOM) {
      return super.lapse(pokemon, lapseType);
    }
    if (sourcePokemon.isActive() && pokemon.isOpponent(sourcePokemon)) {
      const lastMove = pokemon.turnData.attacksReceived[0];
      const lastMoveData = sourcePokemon.getMoveset().find(m => m.moveId === lastMove.move);
      if (lastMoveData && lastMove.move !== MoveId.STRUGGLE) {
        lastMoveData.ppUsed = lastMoveData.getMovePp();
        globalScene.phaseManager.queueMessage(
          i18next.t("battlerTags:grudgeLapse", {
            pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            moveName: lastMoveData.getName(),
          }),
        );
      }
    }
    return false;
  }
}

/**
 * Tag to allow the affected Pokemon's move to go first in its priority bracket.
 * Used for {@link https://bulbapedia.bulbagarden.net/wiki/Quick_Draw_(Ability) | Quick Draw}
 * and {@link https://bulbapedia.bulbagarden.net/wiki/Quick_Claw | Quick Claw}.
 */
export class BypassSpeedTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.BYPASS_SPEED;

  constructor() {
    super(BattlerTagType.BYPASS_SPEED, BattlerTagLapseType.TURN_END, 1);
  }

  override canAdd(pokemon: Pokemon): boolean {
    const bypass = new BooleanHolder(true);
    applyAbAttrs("PreventBypassSpeedChanceAbAttr", { pokemon, bypass });
    return bypass.value;
  }
}

/**
 * Tag used to heal the user of Psycho Shift of its status effect if Psycho Shift succeeds in transferring its status effect to the target Pokemon
 */
export class PsychoShiftTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.PSYCHO_SHIFT;
  constructor() {
    super(BattlerTagType.PSYCHO_SHIFT, BattlerTagLapseType.AFTER_MOVE, 1, MoveId.PSYCHO_SHIFT);
  }

  /**
   * Heals Psycho Shift's user of its status effect after it uses a move
   * @returns `false` to expire the tag immediately
   */
  override lapse(pokemon: Pokemon, _lapseType: BattlerTagLapseType): boolean {
    if (pokemon.status && pokemon.isActive(true)) {
      globalScene.phaseManager.queueMessage(
        getStatusEffectHealText(pokemon.status.effect, getPokemonNameWithAffix(pokemon)),
      );
      pokemon.resetStatus();
      pokemon.updateInfo();
    }
    return false;
  }
}

/**
 * Tag associated with the move Magic Coat.
 */
export class MagicCoatTag extends BattlerTag {
  public override readonly tagType = BattlerTagType.MAGIC_COAT;
  constructor() {
    super(BattlerTagType.MAGIC_COAT, BattlerTagLapseType.TURN_END, 1, MoveId.MAGIC_COAT);
  }

  /**
   * Queues the "[PokemonName] shrouded itself with Magic Coat" message when the tag is added.
   * @param pokemon - The target {@linkcode Pokemon}
   */
  override onAdd(pokemon: Pokemon) {
    // "{pokemonNameWithAffix} shrouded itself with Magic Coat!"
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:magicCoatOnAdd", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      }),
    );
  }
}

/**
 * Tag associated with {@linkcode AbilityId.SUPREME_OVERLORD}
 */
export class SupremeOverlordTag extends AbilityBattlerTag {
  public override readonly tagType = BattlerTagType.SUPREME_OVERLORD;
  /** The number of faints at the time the user was sent out */
  public readonly faintCount: number;
  constructor() {
    super(BattlerTagType.SUPREME_OVERLORD, AbilityId.SUPREME_OVERLORD, BattlerTagLapseType.FAINT, 0);
  }

  public override onAdd(pokemon: Pokemon): boolean {
    (this as Mutable<this>).faintCount = Math.min(
      pokemon.isPlayer() ? globalScene.arena.playerFaints : globalScene.currentBattle.enemyFaints,
      5,
    );
    globalScene.phaseManager.queueMessage(
      i18next.t("battlerTags:supremeOverlordOnAdd", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }),
    );
    return true;
  }

  /**
   * @returns The damage multiplier for Supreme Overlord
   */
  public getBoost(): number {
    return 1 + 0.1 * this.faintCount;
  }

  public override loadTag(source: BaseBattlerTag & Pick<SupremeOverlordTag, "tagType" | "faintCount">): void {
    super.loadTag(source);
    (this as Mutable<this>).faintCount = source.faintCount;
  }
}

/**
 * Retrieves a {@linkcode BattlerTag} based on the provided tag type, turn count, source move, and source ID.
 * @param sourceId - The ID of the pokemon adding the tag
 * @returns The corresponding {@linkcode BattlerTag} object.
 */
export function getBattlerTag(
  tagType: BattlerTagType,
  turnCount: number,
  sourceMove: MoveId,
  sourceId: number,
): BattlerTag {
  switch (tagType) {
    case BattlerTagType.RECHARGING:
      return new RechargingTag(sourceMove);
    case BattlerTagType.BEAK_BLAST_CHARGING:
      return new BeakBlastChargingTag();
    case BattlerTagType.SHELL_TRAP:
      return new ShellTrapTag();
    case BattlerTagType.FLINCHED:
      return new FlinchedTag(sourceMove);
    case BattlerTagType.SNATCH_READY:
      return new SnatchReadyTag(sourceMove);
    case BattlerTagType.CUSTOM_ME_FIRST_INTERRUPTED:
      return new MeFirstInterruptedTag(sourceMove, sourceId);
    case BattlerTagType.INTERRUPTED:
      return new InterruptedTag(sourceMove);
    case BattlerTagType.CONFUSED:
      return new ConfusedTag(turnCount, sourceMove!, sourceId);
    case BattlerTagType.INFATUATED:
      return new InfatuatedTag(sourceMove, sourceId);
    case BattlerTagType.SEEDED:
      return new SeedTag(sourceId);
    case BattlerTagType.POWDER:
      return new PowderTag();
    case BattlerTagType.NIGHTMARE:
      return new NightmareTag();
    case BattlerTagType.FRENZY:
      return new FrenzyTag(turnCount, sourceMove, sourceId);
    case BattlerTagType.UPROAR:
      return new UproarTag(turnCount, sourceMove, sourceId);
    case BattlerTagType.ROLLOUT:
      return new RolloutTag(turnCount, sourceMove, sourceId);
    case BattlerTagType.DEFENSE_CURL:
      return new SerializableBattlerTag(
        BattlerTagType.DEFENSE_CURL,
        BattlerTagLapseType.CUSTOM,
        999,
        sourceMove,
        sourceId,
      );
    case BattlerTagType.CHARGING:
      return new SerializableBattlerTag(tagType, BattlerTagLapseType.CUSTOM, 1, sourceMove, sourceId);
    case BattlerTagType.ENCORE:
      return new EncoreTag(sourceId);
    case BattlerTagType.HELPING_HAND:
      return new HelpingHandTag(sourceId);
    case BattlerTagType.CUSTOM_ME_FIRST_POWER:
      return new MeFirstPowerTag(sourceId);
    case BattlerTagType.INGRAIN:
      return new IngrainTag(sourceId);
    case BattlerTagType.AQUA_RING:
      return new AquaRingTag();
    case BattlerTagType.DROWSY:
      return new DrowsyTag();
    case BattlerTagType.TRAPPED:
      return new TrappedTag(tagType, BattlerTagLapseType.CUSTOM, turnCount, sourceMove, sourceId);
    case BattlerTagType.NO_RETREAT:
      return new NoRetreatTag(sourceId);
    case BattlerTagType.BIND:
      return new BindTag(turnCount, sourceId);
    case BattlerTagType.WRAP:
      return new WrapTag(turnCount, sourceId);
    case BattlerTagType.FIRE_SPIN:
      return new FireSpinTag(turnCount, sourceId);
    case BattlerTagType.WHIRLPOOL:
      return new WhirlpoolTag(turnCount, sourceId);
    case BattlerTagType.CLAMP:
      return new ClampTag(turnCount, sourceId);
    case BattlerTagType.SAND_TOMB:
      return new SandTombTag(turnCount, sourceId);
    case BattlerTagType.GRASS_BIND:
      return new GrassBindTag(turnCount, sourceId);
    case BattlerTagType.MAGMA_STORM:
      return new MagmaStormTag(turnCount, sourceId);
    case BattlerTagType.SNAP_TRAP:
      return new SnapTrapTag(turnCount, sourceId);
    case BattlerTagType.THUNDER_CAGE:
      return new ThunderCageTag(turnCount, sourceId);
    case BattlerTagType.INFESTATION:
      return new InfestationTag(turnCount, sourceId);
    case BattlerTagType.PROTECTED:
      return new ProtectedTag(sourceMove);
    case BattlerTagType.MAX_GUARD_PROTECTED:
      return new MaxGuardProtectedTag(sourceMove);
    case BattlerTagType.G_MAX_VINE_LASH:
      return new GMaxVineLashTag(sourceMove);
    case BattlerTagType.G_MAX_WILDFIRE_BURN:
      return new GMaxWildfireBurnTag(sourceMove);
    case BattlerTagType.G_MAX_CANNONADE:
      return new GMaxCannonadeTag(sourceMove);
    case BattlerTagType.G_MAX_VOLCALITH:
      return new GMaxVolcalithTag(sourceMove);
    case BattlerTagType.SPIKY_SHIELD:
      return new ContactDamageProtectedTag(sourceMove, 8);
    case BattlerTagType.KINGS_SHIELD:
      return new ContactStatStageChangeProtectedTag(sourceMove, tagType, Stat.ATK, -1);
    case BattlerTagType.OBSTRUCT:
      return new ContactStatStageChangeProtectedTag(sourceMove, tagType, Stat.DEF, -2);
    case BattlerTagType.SILK_TRAP:
      return new ContactStatStageChangeProtectedTag(sourceMove, tagType, Stat.SPD, -1);
    case BattlerTagType.BANEFUL_BUNKER:
      return new ContactSetStatusProtectedTag(sourceMove, tagType, StatusEffect.POISON);
    case BattlerTagType.BURNING_BULWARK:
      return new ContactSetStatusProtectedTag(sourceMove, tagType, StatusEffect.BURN);
    case BattlerTagType.ENDURING:
      return new EnduringTag(tagType, BattlerTagLapseType.TURN_END, sourceMove);
    case BattlerTagType.ENDURE_TOKEN:
      return new EnduringTag(tagType, BattlerTagLapseType.AFTER_HIT, sourceMove);
    case BattlerTagType.STURDY:
      return new SturdyTag(sourceMove);
    case BattlerTagType.PERISH_SONG:
      return new PerishSongTag(turnCount);
    case BattlerTagType.CENTER_OF_ATTENTION:
      return new CenterOfAttentionTag(sourceMove);
    case BattlerTagType.Z_CENTER_OF_ATTENTION:
      return new ZCenterOfAttentionTag(sourceMove);
    case BattlerTagType.TRUANT:
      return new TruantTag();
    case BattlerTagType.SLOW_START:
      return new SlowStartTag();
    case BattlerTagType.PROTOSYNTHESIS:
      return new WeatherHighestStatBoostTag(
        tagType,
        AbilityId.PROTOSYNTHESIS,
        WeatherType.SUNNY,
        WeatherType.HARSH_SUN,
      );
    case BattlerTagType.PLUVIAFLUX:
      return new WeatherHighestStatBoostTag(tagType, AbilityId.PLUVIAFLUX, WeatherType.RAIN, WeatherType.HEAVY_RAIN);
    case BattlerTagType.NEURO_CHARGE:
      return new TerrainHighestStatBoostTag(tagType, AbilityId.NEURO_CHARGE, TerrainType.PSYCHIC);
    case BattlerTagType.QUARK_DRIVE:
      return new TerrainHighestStatBoostTag(tagType, AbilityId.QUARK_DRIVE, TerrainType.ELECTRIC);
    case BattlerTagType.CRYOSYNTHESIS:
      return new WeatherHighestStatBoostTag(tagType, AbilityId.CRYOSYNTHESIS, WeatherType.SNOW, WeatherType.HAIL);
    case BattlerTagType.PHYTONCIDE:
      return new TerrainHighestStatBoostTag(tagType, AbilityId.PHYTONCIDE, TerrainType.GRASS);
    case BattlerTagType.PSAMMOSYNTHESIS:
      return new WeatherHighestStatBoostTag(tagType, AbilityId.PSAMMOSYNTHESIS, WeatherType.SANDSTORM);
    case BattlerTagType.UNSEEN_FORCE:
      return new TerrainHighestStatBoostTag(tagType, AbilityId.UNSEEN_FORCE, TerrainType.MIST);
    case BattlerTagType.FLYING:
    case BattlerTagType.UNDERGROUND:
    case BattlerTagType.UNDERWATER:
    case BattlerTagType.HIDDEN:
      return new SemiInvulnerableTag(tagType, turnCount, sourceMove);
    case BattlerTagType.SKY_DROP_LIFTED:
      return new SkyDropLiftedTag(turnCount, sourceMove, sourceId);
    case BattlerTagType.FIRE_BOOST:
      return new TypeBoostTag(tagType, sourceMove, PokemonType.FIRE, 1.5, false);
    case BattlerTagType.CRIT_BOOST:
    case BattlerTagType.DRAGON_CHEER:
      return new CritBoostTag(tagType, sourceMove);
    case BattlerTagType.CRIT_STACKING_BOOST:
      return new CritStackingTag(tagType, sourceMove);
    case BattlerTagType.SPLASH_Z_BOOST:
      return new SplashZBoostTag();
    case BattlerTagType.SPLASH_Z_CRIT_BOOST:
      return new SplashZCritBoostTag();
    case BattlerTagType.ALWAYS_CRIT:
    case BattlerTagType.IGNORE_ACCURACY:
      return new SerializableBattlerTag(tagType, BattlerTagLapseType.TURN_END, 2, sourceMove);
    case BattlerTagType.EMBARGO:
      return new EmbargoTag(turnCount, sourceMove, sourceId);
    case BattlerTagType.ALWAYS_GET_HIT:
    case BattlerTagType.RECEIVE_DOUBLE_DAMAGE:
      return new SerializableBattlerTag(tagType, BattlerTagLapseType.PRE_MOVE, 1, sourceMove);
    case BattlerTagType.IGNORE_FLYING:
      return new GroundedTag(tagType, BattlerTagLapseType.CUSTOM, sourceMove);
    case BattlerTagType.ROOSTED:
      return new RoostedTag();
    case BattlerTagType.BURNED_UP:
      return new RemovedTypeTag(tagType, BattlerTagLapseType.CUSTOM, sourceMove);
    case BattlerTagType.DOUBLE_SHOCKED:
      return new RemovedTypeTag(tagType, BattlerTagLapseType.CUSTOM, sourceMove);
    case BattlerTagType.SALT_CURED:
      return new SaltCuredTag(sourceId);
    case BattlerTagType.ROCK_CURSE:
      return new RockCursedTag(sourceId);
    case BattlerTagType.COLD_CURSE:
      return new ColdCursedTag(sourceId);
    case BattlerTagType.RUSTED_CURSE:
      return new RustedCursedTag(sourceId);
    case BattlerTagType.KNOWLEDGE_CURSE:
      return new KnowledgeCursedTag(sourceId);
    case BattlerTagType.DROWNED_CURSE:
      return new DrownedCursedTag(sourceId);
    case BattlerTagType.BEAST_STACK:
      return new BeastStackTag(sourceId);
    case BattlerTagType.CURSED:
      return new CursedTag(sourceId);
    case BattlerTagType.CHARGED:
      return new TypeBoostTag(tagType, sourceMove, PokemonType.ELECTRIC, 2, true);
    case BattlerTagType.FLOATING:
      return new FloatingTag(tagType, sourceMove, turnCount);
    case BattlerTagType.MINIMIZED:
      return new MinimizeTag();
    case BattlerTagType.DESTINY_BOND:
      return new DestinyBondTag(sourceMove, sourceId);
    case BattlerTagType.ICE_FACE:
      return new IceFaceBlockDamageTag(tagType);
    case BattlerTagType.DISGUISE:
      return new FormBlockDamageTag(tagType);
    case BattlerTagType.COMMANDED:
      return new CommandedTag(sourceId);
    case BattlerTagType.STOCKPILING:
      return new StockpilingTag(sourceMove);
    case BattlerTagType.OCTOLOCK:
      return new OctolockTag(sourceId);
    case BattlerTagType.DISABLED:
      return new DisabledTag(sourceId);
    case BattlerTagType.BIDE:
      return new BideTag(sourceMove!, sourceId!);
    case BattlerTagType.IGNORE_GHOST:
      return new ExposedTag(tagType, sourceMove, PokemonType.GHOST, [PokemonType.NORMAL, PokemonType.FIGHTING]);
    case BattlerTagType.IGNORE_DARK:
      return new ExposedTag(tagType, sourceMove, PokemonType.DARK, [PokemonType.PSYCHIC]);
    case BattlerTagType.GULP_MISSILE_ARROKUDA:
    case BattlerTagType.GULP_MISSILE_PIKACHU:
      return new GulpMissileTag(tagType, sourceMove);
    case BattlerTagType.TAR_SHOT:
      return new TarShotTag();
    case BattlerTagType.ELECTRIFIED:
      return new ElectrifiedTag();
    case BattlerTagType.THROAT_CHOPPED:
      return new ThroatChoppedTag();
    case BattlerTagType.GORILLA_TACTICS:
      return new GorillaTacticsTag();
    case BattlerTagType.UNBURDEN:
      return new UnburdenTag();
    case BattlerTagType.SUBSTITUTE:
      return new SubstituteTag(sourceMove, sourceId);
    case BattlerTagType.AUTOTOMIZED:
      return new AutotomizedTag();
    case BattlerTagType.MYSTERY_ENCOUNTER_POST_SUMMON:
      return new MysteryEncounterPostSummonTag();
    case BattlerTagType.HEAL_BLOCK:
      return new HealBlockTag(turnCount, sourceMove);
    case BattlerTagType.TORMENT:
      return new TormentTag(sourceId);
    case BattlerTagType.TAUNT:
      return new TauntTag();
    case BattlerTagType.IMPRISON:
      return new ImprisonTag(sourceId);
    case BattlerTagType.SYRUP_BOMB:
      return new SyrupBombTag(sourceId);
    case BattlerTagType.TELEKINESIS:
      return new TelekinesisTag(sourceMove);
    case BattlerTagType.POWER_TRICK:
      return new PowerTrickTag(sourceMove, sourceId);
    case BattlerTagType.GRUDGE:
      return new GrudgeTag();
    case BattlerTagType.PSYCHO_SHIFT:
      return new PsychoShiftTag();
    case BattlerTagType.MAGIC_COAT:
      return new MagicCoatTag();
    case BattlerTagType.SUPREME_OVERLORD:
      return new SupremeOverlordTag();
    case BattlerTagType.BYPASS_SPEED:
      return new BypassSpeedTag();
  }
}

/**
 * When given a battler tag or json representing one, creates an actual BattlerTag object with the same data.
 * @param source - An object containing the data necessary to reconstruct the BattlerTag.
 * @returns The valid battler tag
 */
export function loadBattlerTag(source: BattlerTag | BattlerTagData): BattlerTag {
  // TODO: Remove this bang by fixing the signature of `getBattlerTag`
  // to allow undefined sourceIds and sourceMoves (with appropriate fallback for tags that require it)
  const tag = getBattlerTag(source.tagType, source.turnCount, source.sourceMove!, source.sourceId!);
  tag.loadTag(source);
  return tag;
}

/**
 * Helper function to verify that the current phase is a MoveEffectPhase and provide quick access to commonly used fields
 *
 * @param _pokemon - The Pokémon used to access the current phase (unused)
 * @returns `null` if current phase is not MoveEffectPhase, otherwise Object containing the {@linkcode MoveEffectPhase}, and its
 * corresponding {@linkcode Move} and user {@linkcode Pokemon}
 */
function getMoveEffectPhaseData(_pokemon: Pokemon): { phase: MoveEffectPhase; attacker: Pokemon; move: Move } | null {
  const phase = globalScene.phaseManager.getCurrentPhase();
  if (phase.is("MoveEffectPhase")) {
    return {
      phase,
      attacker: phase.getPokemon(),
      move: phase.move,
    };
  }
  return null;
}

/**
 * Map from {@linkcode BattlerTagType} to the corresponding {@linkcode BattlerTag} class.
 */
export type BattlerTagTypeMap = {
  [BattlerTagType.RECHARGING]: RechargingTag;
  [BattlerTagType.SHELL_TRAP]: ShellTrapTag;
  [BattlerTagType.FLINCHED]: FlinchedTag;
  [BattlerTagType.SNATCH_READY]: SnatchReadyTag;
  [BattlerTagType.CUSTOM_ME_FIRST_INTERRUPTED]: MeFirstInterruptedTag;
  [BattlerTagType.INTERRUPTED]: InterruptedTag;
  [BattlerTagType.CONFUSED]: ConfusedTag;
  [BattlerTagType.INFATUATED]: InfatuatedTag;
  [BattlerTagType.SEEDED]: SeedTag;
  [BattlerTagType.POWDER]: PowderTag;
  [BattlerTagType.NIGHTMARE]: NightmareTag;
  [BattlerTagType.FRENZY]: FrenzyTag;
  [BattlerTagType.UPROAR]: UproarTag;
  [BattlerTagType.ROLLOUT]: RolloutTag;
  [BattlerTagType.CHARGING]: GenericSerializableBattlerTag<BattlerTagType.CHARGING>;
  [BattlerTagType.ENCORE]: EncoreTag;
  [BattlerTagType.HELPING_HAND]: HelpingHandTag;
  [BattlerTagType.CUSTOM_ME_FIRST_POWER]: MeFirstPowerTag;
  [BattlerTagType.INGRAIN]: IngrainTag;
  [BattlerTagType.AQUA_RING]: AquaRingTag;
  [BattlerTagType.DROWSY]: DrowsyTag;
  [BattlerTagType.TRAPPED]: TrappedTag;
  [BattlerTagType.NO_RETREAT]: NoRetreatTag;
  [BattlerTagType.BIND]: BindTag;
  [BattlerTagType.WRAP]: WrapTag;
  [BattlerTagType.FIRE_SPIN]: FireSpinTag;
  [BattlerTagType.WHIRLPOOL]: WhirlpoolTag;
  [BattlerTagType.CLAMP]: ClampTag;
  [BattlerTagType.SAND_TOMB]: SandTombTag;
  [BattlerTagType.GRASS_BIND]: GrassBindTag;
  [BattlerTagType.MAGMA_STORM]: MagmaStormTag;
  [BattlerTagType.SNAP_TRAP]: SnapTrapTag;
  [BattlerTagType.THUNDER_CAGE]: ThunderCageTag;
  [BattlerTagType.INFESTATION]: InfestationTag;
  [BattlerTagType.PROTECTED]: ProtectedTag;
  [BattlerTagType.SPIKY_SHIELD]: ContactDamageProtectedTag;
  [BattlerTagType.KINGS_SHIELD]: ContactStatStageChangeProtectedTag;
  [BattlerTagType.OBSTRUCT]: ContactStatStageChangeProtectedTag;
  [BattlerTagType.SILK_TRAP]: ContactStatStageChangeProtectedTag;
  [BattlerTagType.BANEFUL_BUNKER]: ContactSetStatusProtectedTag;
  [BattlerTagType.MAX_GUARD_PROTECTED]: MaxGuardProtectedTag;
  [BattlerTagType.G_MAX_VINE_LASH]: GMaxVineLashTag;
  [BattlerTagType.G_MAX_WILDFIRE_BURN]: GMaxWildfireBurnTag;
  [BattlerTagType.G_MAX_CANNONADE]: GMaxCannonadeTa;
  [BattlerTagType.G_MAX_VOLCALITH]: GMaxVolcalithTag;
  [BattlerTagType.BURNING_BULWARK]: ContactSetStatusProtectedTag;
  [BattlerTagType.ENDURING]: EnduringTag;
  [BattlerTagType.ENDURE_TOKEN]: EnduringTag;
  [BattlerTagType.STURDY]: SturdyTag;
  [BattlerTagType.PERISH_SONG]: PerishSongTag;
  [BattlerTagType.CENTER_OF_ATTENTION]: CenterOfAttentionTag;
  [BattlerTagType.Z_CENTER_OF_ATTENTION]: ZCenterOfAttentionTag;
  [BattlerTagType.TRUANT]: TruantTag;
  [BattlerTagType.SLOW_START]: SlowStartTag;
  [BattlerTagType.HIGHEST_STAT_BOOST]: HighestStatBoostTag;
  [BattlerTagType.PROTOSYNTHESIS]: WeatherHighestStatBoostTag;
  [BattlerTagType.CRYOSYNTHESIS]: WeatherHighestStatBoostTag;
  [BattlerTagType.PSAMMOSYNTHESIS]: WeatherHighestStatBoostTag;
  [BattlerTagType.PLUVIAFLUX]: WeatherHighestStatBoostTag;
  [BattlerTagType.QUARK_DRIVE]: TerrainHighestStatBoostTag;
  [BattlerTagType.NEURO_CHARGE]: TerrainHighestStatBoostTag;
  [BattlerTagType.PHYTONCIDE]: TerrainHighestStatBoostTag;
  [BattlerTagType.UNSEEN_FORCE]: TerrainHighestStatBoostTag;
  [BattlerTagType.FLYING]: SemiInvulnerableTag;
  [BattlerTagType.UNDERGROUND]: SemiInvulnerableTag;
  [BattlerTagType.UNDERWATER]: SemiInvulnerableTag;
  [BattlerTagType.HIDDEN]: SemiInvulnerableTag;
  [BattlerTagType.SKY_DROP_LIFTED]: SkyDropLiftedTag;
  [BattlerTagType.EMBARGO]: EmbargoTag;
  [BattlerTagType.FIRE_BOOST]: TypeBoostTag;
  [BattlerTagType.CRIT_BOOST]: CritBoostTag;
  [BattlerTagType.CRIT_STACKING_BOOST]: CritStackingTag;
  [BattlerTagType.SPLASH_Z_BOOST]: SplashZBoostTag;
  [BattlerTagType.SPLASH_Z_CRIT_BOOST]: SplashZCritBoostTag;
  [BattlerTagType.DRAGON_CHEER]: CritBoostTag;
  [BattlerTagType.ALWAYS_CRIT]: GenericSerializableBattlerTag<BattlerTagType.ALWAYS_CRIT>;
  [BattlerTagType.IGNORE_ACCURACY]: GenericSerializableBattlerTag<BattlerTagType.IGNORE_ACCURACY>;
  [BattlerTagType.ALWAYS_GET_HIT]: GenericSerializableBattlerTag<BattlerTagType.ALWAYS_GET_HIT>;
  [BattlerTagType.RECEIVE_DOUBLE_DAMAGE]: GenericSerializableBattlerTag<BattlerTagType.RECEIVE_DOUBLE_DAMAGE>;
  [BattlerTagType.BYPASS_SLEEP]: BattlerTag;
  [BattlerTagType.IGNORE_FLYING]: GroundedTag;
  [BattlerTagType.ROOSTED]: RoostedTag;
  [BattlerTagType.BURNED_UP]: RemovedTypeTag;
  [BattlerTagType.DOUBLE_SHOCKED]: RemovedTypeTag;
  [BattlerTagType.SALT_CURED]: SaltCuredTag;
  [BattlerTagType.ROCK_CURSE]: RockCursedTag;
  [BattlerTagType.COLD_CURSE]: ColdCursedTag;
  [BattlerTagType.RUSTED_CURSE]: RustedCursedTag;
  [BattlerTagType.KNOWLEDGE_CURSE]: KnowledgeCursedTag;
  [BattlerTagType.DROWNED_CURSE]: DrownedCursedTag;
  [BattlerTagType.BEAST_STACK]: BeastStackTag;
  [BattlerTagType.CURSED]: CursedTag;
  [BattlerTagType.CHARGED]: TypeBoostTag;
  [BattlerTagType.FLOATING]: FloatingTag;
  [BattlerTagType.MINIMIZED]: MinimizeTag;
  [BattlerTagType.DESTINY_BOND]: DestinyBondTag;
  [BattlerTagType.ICE_FACE]: IceFaceBlockDamageTag;
  [BattlerTagType.DISGUISE]: FormBlockDamageTag;
  [BattlerTagType.COMMANDED]: CommandedTag;
  [BattlerTagType.STOCKPILING]: StockpilingTag;
  [BattlerTagType.OCTOLOCK]: OctolockTag;
  [BattlerTagType.DISABLED]: DisabledTag;
  [BattlerTagType.BIDE]: BideTag;
  [BattlerTagType.IGNORE_GHOST]: ExposedTag;
  [BattlerTagType.IGNORE_DARK]: ExposedTag;
  [BattlerTagType.GULP_MISSILE_ARROKUDA]: GulpMissileTag;
  [BattlerTagType.GULP_MISSILE_PIKACHU]: GulpMissileTag;
  [BattlerTagType.BEAK_BLAST_CHARGING]: BeakBlastChargingTag;
  [BattlerTagType.TAR_SHOT]: TarShotTag;
  [BattlerTagType.ELECTRIFIED]: ElectrifiedTag;
  [BattlerTagType.THROAT_CHOPPED]: ThroatChoppedTag;
  [BattlerTagType.GORILLA_TACTICS]: GorillaTacticsTag;
  [BattlerTagType.UNBURDEN]: UnburdenTag;
  [BattlerTagType.SUBSTITUTE]: SubstituteTag;
  [BattlerTagType.AUTOTOMIZED]: AutotomizedTag;
  [BattlerTagType.MYSTERY_ENCOUNTER_POST_SUMMON]: MysteryEncounterPostSummonTag;
  [BattlerTagType.HEAL_BLOCK]: HealBlockTag;
  [BattlerTagType.TORMENT]: TormentTag;
  [BattlerTagType.TAUNT]: TauntTag;
  [BattlerTagType.IMPRISON]: ImprisonTag;
  [BattlerTagType.SYRUP_BOMB]: SyrupBombTag;
  [BattlerTagType.TELEKINESIS]: TelekinesisTag;
  [BattlerTagType.POWER_TRICK]: PowerTrickTag;
  [BattlerTagType.GRUDGE]: GrudgeTag;
  [BattlerTagType.PSYCHO_SHIFT]: PsychoShiftTag;
  [BattlerTagType.MAGIC_COAT]: MagicCoatTag;
  [BattlerTagType.DEFENSE_CURL]: DefenseCurlTag;
};
