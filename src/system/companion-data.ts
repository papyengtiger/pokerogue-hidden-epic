import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#enums/trainer-variant";
import type { Gender } from "#data/gender";
import type { SpeciesId } from "#enums/species-id";
import type { TimeOfDay } from "#enums/time-of-day";
import { TrainerKnowhowId } from "#enums/trainer-knowhow-id";

export type CompanionTransformPolicy =
  | "AUTO"
  | "NONE"
  | "FORCED";

export interface CompanionPokemonDefinition {
  speciesId: SpeciesId;

  /** 가장 먼저 출전하는 에이스 */
  ace?: boolean;

  /** 파트너폼, 지역폼 등 기본 폼 고정용 */
  formKey?: string;

  /**
   * 동료 전용 진화 목표.
   * 예: 이브이 → 블래키, 랄토스 → 엘레이드
   */
  evolutionTarget?: SpeciesId;

  /**
   * 진화 조건상 성별 고정이 필요한 경우.
   * 예: 엘레이드용 랄토스 = 수컷
   */
  forcedGender?: Gender;

  /**
   * 진화가 일어나야 하는 선호 시간대.
   * 예: 에브이 = 낮, 블래키 = 밤
   */
  preferredEvolutionTime?: TimeOfDay[];

  /**
   * 진화 전에 확보해야 할 최소 친밀도.
   * 예: 에브이/블래키 = 120
   */
  friendshipFloor?: number;

  evolutionTargetFormKey?: string;
  /**
   * AUTO:
   * 메가/거다이 등 가능한 강화폼 중 하나 자동 선택
   *
   * NONE:
   * 강화폼 사용 안 함
   *
   * FORCED:
   * forcedTransformKey의 폼 강제
   */
  transformPolicy?: CompanionTransformPolicy;

  forcedTransformKey?: string;
}

/**
 * Static definition for a recruitable trainer companion.
 *
 * Keep permanent character/config data here. Recruitment state itself is
 * managed by CompanionManager so save data and static configuration stay
 * separate.
 */
export interface CompanionDefinition {
  trainerType: TrainerType;
  variant: TrainerVariant;

  generation?: number;

  /** 동료가 보유하는 6마리 파티 */
  pokemonTeam?: CompanionPokemonDefinition[];

  backSpriteKey?: string;

  /** 동료카페 / 만남의광장에 표시할 정면 스프라이트 */
  frontSpriteKey?: string;

  knowhowId?: TrainerKnowhowId;
  trainingCardIds?: string[];
}

/**
 * Minimal persistent state for the companion system.
 * This is deliberately small so it can be embedded into the existing save
 * structure later without coupling it to Phaser runtime objects.
 */
export interface CompanionSaveData {
  availableTrainerTypes: TrainerType[];
  recruitedTrainerTypes: TrainerType[];
  activeTrainerType: TrainerType | null;
}

export const DEFAULT_COMPANION_BACK_SPRITES = {
  male: "trainer_m_back_pb",
  female: "trainer_f_back_pb",
} as const;

/**
 * Resolve the back sprite used by a companion.
 * Dedicated character sprites override the generic fallback.
 */
export function getCompanionBackSpriteKey(definition: CompanionDefinition): string {
  if (definition.backSpriteKey) {
    return definition.backSpriteKey;
  }

  return definition.variant === TrainerVariant.FEMALE
    ? DEFAULT_COMPANION_BACK_SPRITES.female
    : DEFAULT_COMPANION_BACK_SPRITES.male;
}
