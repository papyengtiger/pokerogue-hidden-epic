import type { BattlerTag } from "#data/battler-tags";
import { loadBattlerTag, SerializableBattlerTag } from "#data/battler-tags";
import type { Gender } from "#data/gender";
import { PokemonMove } from "#data/moves/pokemon-move";
import type { PokemonSpeciesForm } from "#data/pokemon-species";
import type { TypeDamageMultiplier } from "#data/type";
import type { AbilityId } from "#enums/ability-id";
import type { BerryType } from "#enums/berry-type";
import type { MoveId } from "#enums/move-id";
import type { Nature } from "#enums/nature";
import type { PokemonType } from "#enums/pokemon-type";
import type { SpeciesId } from "#enums/species-id";
import { StatusEffect } from "#enums/status-effect";
import type { AttackMoveResult } from "#types/attack-move-result";
import type { IllusionData } from "#types/illusion-data";
import type { SerializedSpeciesForm } from "#types/pokemon-common";
import type { TurnMove } from "#types/turn-move";
import type { CoerceNullPropertiesToUndefined } from "#types/type-helpers";
import { getPokemonSpecies, getPokemonSpeciesForm } from "#utils/pokemon-utils";
import { recordRecycleSnapshot } from "#moves/recycle-snapshot";
import type { RecycleSnapshot } from "#moves/recycle-snapshot";
import { SpeciesId } from "#enums/species-id";

/**
 * Permanent data that can customize a Pokemon in non-standard ways from its Species.
 * Includes abilities, nature, changed types, etc.
 */
export class CustomPokemonData {
  // TODO: Change the default value for all these from -1 to something a bit more sensible
  /**
   * The scale at which to render this Pokemon's sprite.
   */
  public spriteScale = -1;
  public ability: AbilityId | -1;
  public passive: AbilityId | -1;
  public nature: Nature | -1;
  public types: PokemonType[];
  /** Deprecated but needed for session save migration */
  // TODO: Remove this once pre-session migration is implemented
  public hitsRecCount: number | null = null;

  constructor(data?: CustomPokemonData | Partial<CustomPokemonData>) {
    this.spriteScale = data?.spriteScale ?? -1;
    this.ability = data?.ability ?? -1;
    this.passive = data?.passive ?? -1;
    this.nature = data?.nature ?? -1;
    this.types = data?.types ?? [];
    this.hitsRecCount = data?.hitsRecCount ?? null;
  }
}

/**
 * Deserialize a pokemon species form from an object containing `id` and `formIdx` properties.
 * @param value - The value to deserialize
 * @returns The `PokemonSpeciesForm` or `null` if the fields could not be properly discerned
 */
function deserializePokemonSpeciesForm(value: SerializedSpeciesForm | PokemonSpeciesForm): PokemonSpeciesForm | null {
  // @ts-expect-error: We may be deserializing a PokemonSpeciesForm, but we catch later on
  let { id, formIdx } = value;

  if (id == null || formIdx == null) {
    // @ts-expect-error: Typescript doesn't know that in block, `value` must be a PokemonSpeciesForm
    id = value.speciesId;
    // @ts-expect-error: Same as above (plus we are accessing a protected property)
    formIdx = value._formIndex;
  }
  // If for some reason either of these fields are null/undefined, we cannot reconstruct the species form
  if (id == null || formIdx == null) {
    return null;
  }
  return getPokemonSpeciesForm(id, formIdx);
}

interface SerializedIllusionData extends Omit<IllusionData, "fusionSpecies"> {
  /** The id of the illusioned fusion species, or `undefined` if not a fusion */
  fusionSpecies?: SpeciesId;
}

interface SerializedPokemonSummonData {
  statStages: number[];
  moveQueue: TurnMove[];
  tags: BattlerTag[];
  abilitySuppressed: boolean;
  speciesForm?: SerializedSpeciesForm;
  fusionSpeciesForm?: SerializedSpeciesForm;
  ability?: AbilityId;
  passiveAbility?: AbilityId;
  gender?: Gender;
  fusionGender?: Gender;
  stats: number[];
  moveset?: PokemonMove[];
  types: PokemonType[];
  addedType?: PokemonType;
  illusion?: SerializedIllusionData;
  illusionBroken: boolean;
  berriesEatenLast: BerryType[];
  moveHistory: TurnMove[];
}

/**
 * Persistent in-battle data for a {@linkcode Pokemon}.
 * Resets on switch or new battle.
 *
 * @sealed
 */
export class PokemonSummonData {
  /** [Atk, Def, SpAtk, SpDef, Spd, Acc, Eva] */
  public statStages: number[] = [0, 0, 0, 0, 0, 0, 0];
  /**
   * A queue of moves yet to be executed, used by charging, recharging and frenzy moves.
   * So long as this array is nonempty, this Pokemon's corresponding `CommandPhase` will be skipped over entirely
   * in favor of using the queued move.
   * TODO: Clean up a lot of the code surrounding the move queue.
   */
  public moveQueue: TurnMove[] = [];
  public tags: BattlerTag[] = [];
  public abilitySuppressed = false;

  // Overrides for transform.
  // TODO: Move these into a separate class & add rage fist hit count
  public speciesForm: PokemonSpeciesForm | null = null;
  public fusionSpeciesForm: PokemonSpeciesForm | null = null;
  public ability: AbilityId | undefined;
  public passiveAbility: AbilityId | undefined;
  public gender: Gender | undefined;
  public fusionGender: Gender | undefined;
  public stats: number[] = [0, 0, 0, 0, 0, 0];
  public moveset: PokemonMove[] | null;

  public types: PokemonType[] = [];
  public addedType: PokemonType | null = null;

  /** Data pertaining to this pokemon's Illusion, if it has one. */
  public illusion: IllusionData | null = null;
  /**
   * Whether this Pokemon's illusion has been broken since switching out.
   * @defaultValue `false`
   */
  // TODO: Since Illusion applies on switch in, and this entire class is reset on switch-in,
  // this may be replaceable with a check for `pokemon.summonData.illusionData !== null`
  public illusionBroken = false;

  /** Array containing all berries eaten in the last turn; used by {@linkcode AbilityId.CUD_CHEW} */
  public berriesEatenLast: BerryType[] = [];

  /**
   * An array of all moves this pokemon has used since entering the battle.
   * Used for most moves and abilities that check prior move usage or copy already-used moves.
   */
  // TODO: Rework this into a sort of "global move history" that also allows checking execution order (for Fusion Bolt/Flare)
  public moveHistory: TurnMove[] = [];

  constructor(source?: PokemonSummonData | SerializedPokemonSummonData) {
    if (source == null) {
      return;
    }

    // TODO: Rework this into an actual generic function for use elsewhere
    for (const [key, value] of Object.entries(source)) {
      if (value == null && this.hasOwnProperty(key)) {
        continue;
      }

      if (key === "speciesForm" || key === "fusionSpeciesForm") {
        this[key] = deserializePokemonSpeciesForm(value);
        continue;
      }

      if (key === "illusion" && typeof value === "object") {
        // Make a copy so as not to mutate provided value
        const illusionData = {
          ...value,
        };
        if (illusionData.fusionSpecies != null) {
          switch (typeof illusionData.fusionSpecies) {
            case "object":
              illusionData.fusionSpecies = getPokemonSpecies(illusionData.fusionSpecies.speciesId);
              break;
            case "number":
              illusionData.fusionSpecies = getPokemonSpecies(illusionData.fusionSpecies);
              break;
            default:
              illusionData.fusionSpecies = undefined;
          }
        }
        this[key] = illusionData as IllusionData;
        continue;
      }

      if (key === "moveset") {
        this.moveset = value?.map((m: any) => PokemonMove.loadMove(m));
        continue;
      }

      if (key === "tags" && Array.isArray(value)) {
        // load battler tags, discarding any that are not serializable
        this.tags = value
          .map((t: SerializableBattlerTag) => loadBattlerTag(t))
          .filter((t): t is SerializableBattlerTag => t instanceof SerializableBattlerTag);
        continue;
      }
      this[key] = value;
    }
  }

  /**
   * Serialize this PokemonSummonData to JSON, converting {@linkcode PokemonSpeciesForm} and {@linkcode IllusionData.fusionSpecies}
   * into simpler types instead of serializing all of their fields.
   *
   * @remarks
   * - `IllusionData.fusionSpecies` is serialized as just the species ID
   * - `PokemonSpeciesForm` and `PokemonSpeciesForm.fusionSpeciesForm` are converted into {@linkcode SerializedSpeciesForm} objects
   */
  public toJSON(): SerializedPokemonSummonData {
    // Pokemon species forms are never saved, only the species ID.
    const illusion = this.illusion;
    const speciesForm = this.speciesForm;
    const fusionSpeciesForm = this.fusionSpeciesForm;
    const illusionSpeciesForm = illusion?.fusionSpecies;
    const t = {
      // the "as omit" is required to avoid TS resolving the overwritten properties to "never"
      // We coerce null to undefined in the type, as the for loop below replaces `null` with `undefined`
      ...(this as Omit<
        CoerceNullPropertiesToUndefined<PokemonSummonData>,
        "speciesForm" | "fusionSpeciesForm" | "illusion"
      >),
      speciesForm: speciesForm == null ? undefined : { id: speciesForm.speciesId, formIdx: speciesForm.formIndex },
      fusionSpeciesForm:
        fusionSpeciesForm == null
          ? undefined
          : { id: fusionSpeciesForm.speciesId, formIdx: fusionSpeciesForm.formIndex },
      illusion:
        illusion == null
          ? undefined
          : {
              ...(this.illusion as Omit<typeof illusion, "fusionSpecies">),
              fusionSpecies: illusionSpeciesForm?.speciesId,
            },
    };
    // Replace `null` with `undefined`, as `undefined` never gets serialized
    for (const [key, value] of Object.entries(t)) {
      if (value === null) {
        t[key] = undefined;
      }
    }
    return t;
  }
}

// TODO: Merge this inside `summmonData` but exclude from save if/when a save data serializer is added
export class PokemonTempSummonData {
  /**
   * The number of turns this pokemon has spent without switching out.
   * Only currently used for positioning the battle cursor.
   */
  turnCount = 1;
  /**
   * The number of turns this pokemon has spent in the active position since the start of the wave
   * without switching out.
   * Reset on switch and new wave, but not stored in `SummonData` to avoid being written to the save file.

   * Used to evaluate "first turn only" conditions such as
   * {@linkcode MoveId.FAKE_OUT | Fake Out} and {@linkcode MoveId.FIRST_IMPRESSION | First Impression}).
   */
  waveTurnCount = 1;
// ✅ FLING 임시 컨텍스트 (세이브에 안 남음)
  flingItem?: PersistentModifier;
  flingPowerOverride?: number;
  flingTypes?: PokemonType[];
  flingStabOverride?: number;
  // ✅ TRICK 임시 컨텍스트 (세이브에 안 남음)
  trickGiveItem?: PokemonHeldItemModifier;     // 또는 PersistentModifier / 너가 쓰는 타입에 맞게
  trickTakeItem?: PokemonHeldItemModifier;
  trickTargetBattlerIndex?: number;
  // ✅ BESTOW(기프트패스) 임시 컨텍스트
  bestowItem?: PokemonHeldItemModifier;
  bestowTargetBattlerIndex?: number;
  lastConsumedHeldItem?: RecycleSnapshot;
}

/**
 * Persistent data for a {@linkcode Pokemon}.
 * Resets at the start of a new battle (but not on switch).
 */
export class PokemonBattleData {
  public hitCount = 0;
  public hasEatenBerry = false;
  public berriesEaten: BerryType[] = [];
  
  // ✅ Bide(참기)용 누적 피해
  public bideDamage = 0;
  public bideTurnsLeft = 0;
  public bideLastAttackerIndex: number | null = null;
  public bideActive = false;
  public bideReleasing = false;
  public necrozmaUltraBaseForm: "dawn-wings" | "dusk-mane" | null = null;

  constructor(source?: PokemonBattleData | Partial<PokemonBattleData>) {
    if (source != null) {
      this.hitCount = source.hitCount ?? 0;
      this.hasEatenBerry = source.hasEatenBerry ?? false;
      this.berriesEaten = source.berriesEaten ?? [];

      this.bideDamage = source.bideDamage ?? 0;
      this.bideTurnsLeft = source.bideTurnsLeft ?? 0;
      this.bideLastAttackerIndex = (source as any).bideLastAttackerIndex ?? null;
      this.bideActive = (source as any).bideActive ?? false;
      this.bideReleasing = (source as any).bideReleasing ?? false;
    }
  }
}

/**
 * Temporary data for a {@linkcode Pokemon}.
 * Resets on new wave/battle start (but not on switch).
 */
export class PokemonWaveData {
  /** Whether the pokemon has endured due to a {@linkcode BattlerTagType.ENDURE_TOKEN} */
  public endured = false;
  /**
   * A set of all the abilities this {@linkcode Pokemon} has used in this wave.
   * Used to track once per battle conditions, as well as (hopefully) by the updated AI for move effectiveness.
   */
  public abilitiesApplied: Set<AbilityId> = new Set<AbilityId>();
  /** Whether the pokemon's ability has been revealed or not */
  public abilityRevealed = false;
}

/**
 * Temporary data for a {@linkcode Pokemon}.
 * Resets at the start of a new turn, as well as on switch.
 */
export class PokemonTurnData {
  public acted = false;
  /** How many times the current move should hit the target(s) */
  public hitCount = 0;
  /**
   * - `-1`: Calculate how many hits are left
   * - `0`: Move is finished
   * - `>0`: Move is in process of hitting targets
   * @defaultValue `-1`
   */
  public hitsLeft = -1;
  public totalDamageDealt = 0;
  public singleHitDamageDealt = 0;
  public damageTaken = 0;
  public attacksReceived: AttackMoveResult[] = [];
  public order: number;
  public statStagesIncreased = false;
  public statStagesDecreased = false;
  public moveEffectiveness: TypeDamageMultiplier | null = null;
  public combiningPledge?: MoveId;
  /** The Pokemon was brought in this turn by a switch action (not an intial encounter/summon) */
  public switchedInThisTurn = false;
  public summonedThisTurn = false;
  public failedRunAway = false;
  public joinedRound = false;
  /**
   * Tracker for a pending status effect.
   *
   * @remarks
   * Set whenever {@linkcode Pokemon#trySetStatus} succeeds in order to prevent subsequent status effects
   * from being applied. \
   * Necessary because the status is not actually set until the {@linkcode ObtainStatusEffectPhase} runs,
   * which may not happen before another status effect is attempted to be applied.
   * @defaultValue `StatusEffect.NONE`
   */
  public pendingStatus: StatusEffect = StatusEffect.NONE;
  /**
   * All berries eaten by this pokemon in this turn.
   * Saved into {@linkcode PokemonSummonData | SummonData} by {@linkcode AbilityId.CUD_CHEW} on turn end.
   * @see {@linkcode PokemonSummonData.berriesEatenLast}
   */
  public berriesEaten: BerryType[] = [];
  public meFirstNoAccuracyCheck?: boolean;
  public meFirstCopiedMove?: MoveId;        // 혹은 PokemonMove / MoveId 중 네가 실제로 저장하는 타입
  public meFirstPowerBoost?: number;        // 1.5 같은 배율 or +50% 등 네 설계대로
// ============================
  // ✅ 반응형 베리(자보/애터/악키/타라프)용
  // ============================
  /** 이번 턴에 반응형 베리를 이미 발동했는지(중복 방지) */
  public reactiveBerryUsedThisTurn?: boolean;

  /** 자보/애터 반사딜 대상(공격자) battlerIndex */
  public reactiveBerryAttackerIndex?: number;

  /** ✅ (선택) apply 내부에서 shouldApply를 강제로 통과시키고 싶을 때 */
  public reactiveBerryForceType?: BerryType;

  // ============================
  // ✅ 배틀 시작 즉발 베리(BattleStartImmediateBerryPhase)용
  // ============================
  public battleStartImmediateBerryMode?: boolean;
  public battleStartImmediateBerryType?: BerryType;

  // ============================
  // ✅ 타입 선공 베리(너가 예약값 쓰는 로직)용
  // ============================
  public priorityBerryReservedMoveId?: MoveId;
    // ============================
// ✅ 선공(우선도) 베리 예약용 (타입 선공열매 / 커스타프 등)
// ============================
/** 이번 턴에 "선공 베리"를 먹기로 예약된 베리 타입 */
  public priorityBerryReserved?: BerryType;
  public custapPrimed = false;
  public naturalGiftReservedBerry?: BerryType;
  public naturalGiftReservedMoveId?: MoveId;
  // ✅ Legend Plate 캐시(이번 턴/이번 공격 중 재호출 고정용)
  public legendPlateMoveId?: MoveId;
  public legendPlateTargetBattlerIndex?: number; // target.id 대신 battlerIndex 추천
  public legendPlateChosenType?: PokemonType;
}