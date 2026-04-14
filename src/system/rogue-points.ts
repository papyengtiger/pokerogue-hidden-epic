// system/log-points/log-point-utils.ts

import { globalScene } from "#app/global-scene";
import { HitResult } from "#enums/hit-result";
import { SpeciesFormKey } from "#enums/species-form-key";
import { ModifierTier } from "#modifiers/modifier-tier";

export interface RoguePointRewardContext {
  hitResult?: HitResult;
  isCritical?: boolean;
  formKey?: SpeciesFormKey | null;
  itemTier?: ModifierTier | null;

  didEvolve?: boolean;
  didFaintEnemy?: boolean;
  didCatchNewSpecies?: boolean;
  didUnlockNewAbility?: boolean;
  didUnlockNewNature?: boolean;
  didUnlockNewForm?: boolean;
  didReachMaxFriendship?: boolean;
  didClearMode?: boolean;

  modeClearReward?: number;
}

export interface RoguePointBreakdown {
  hitResult: number;
  critical: number;
  formChange: number;
  itemTier: number;
  evolve: number;
  faintEnemy: number;
  catchNewSpecies: number;
  unlockNewAbility: number;
  unlockNewNature: number;
  unlockNewForm: number;
  maxFriendship: number;
  modeClear: number;
  total: number;
}

export const ROGUE_POINT_VALUES = {
  SUPER_EFFECTIVE: 2,
  EXTREMELY_EFFECTIVE: 5,
  NOT_VERY_EFFECTIVE: 1,
  NO_EFFECT: 1,
  ONE_HIT_KO: 10,
  CRITICAL: 3,

  EVOLVE: 20,
  FAINT_ENEMY: 1,
  CATCH_NEW_SPECIES: 10,
  UNLOCK_NEW_ABILITY: 15,
  UNLOCK_NEW_NATURE: 10,
  UNLOCK_NEW_FORM: 20,
  MAX_FRIENDSHIP: 20,

  FORM_DEFAULT: 5,
  FORM_MEGA: 20,
  FORM_PRIMAL: 25,
  FORM_GIGANTAMAX: 15,
  FORM_ETERNAMAX: 50,

  ITEM_COMMON: 1,
  ITEM_GREAT: 2,
  ITEM_ULTRA: 4,
  ITEM_ROGUE: 7,
  ITEM_MASTER: 12,

  MODE_CLEAR_DEFAULT: 300,
} as const;

export function getHitResultRoguePoints(result?: HitResult): number {
  switch (result) {
    case HitResult.SUPER_EFFECTIVE:
      return LOG_POINT_VALUES.SUPER_EFFECTIVE;
    case HitResult.EXTREMELY_EFFECTIVE:
      return LOG_POINT_VALUES.EXTREMELY_EFFECTIVE;
    case HitResult.NOT_VERY_EFFECTIVE:
      return LOG_POINT_VALUES.NOT_VERY_EFFECTIVE;
    case HitResult.NO_EFFECT:
      return LOG_POINT_VALUES.NO_EFFECT;
    case HitResult.ONE_HIT_KO:
      return LOG_POINT_VALUES.ONE_HIT_KO;
    default:
      return 0;
  }
}

export function getFormChangeRoguePoints(formKey?: SpeciesFormKey | null): number {
  switch (formKey) {
    case SpeciesFormKey.MEGA:
    case SpeciesFormKey.MEGA_X:
    case SpeciesFormKey.MEGA_Y:
    case SpeciesFormKey.MEGA_Z:
    case SpeciesFormKey.MEGA_ORIGINAL:
    case SpeciesFormKey.MEGA_CURLY:
    case SpeciesFormKey.MEGA_DROOPY:
    case SpeciesFormKey.MEGA_STRETCHY:
      return LOG_POINT_VALUES.FORM_MEGA;

    case SpeciesFormKey.PRIMAL:
      return LOG_POINT_VALUES.FORM_PRIMAL;

    case SpeciesFormKey.GIGANTAMAX:
    case SpeciesFormKey.GIGANTAMAX_SINGLE:
    case SpeciesFormKey.GIGANTAMAX_RAPID:
      return LOG_POINT_VALUES.FORM_GIGANTAMAX;

    case SpeciesFormKey.ETERNAMAX:
      return LOG_POINT_VALUES.FORM_ETERNAMAX;

    case SpeciesFormKey.ORIGIN:
    case SpeciesFormKey.INCARNATE:
    case SpeciesFormKey.THERIAN:
      return LOG_POINT_VALUES.FORM_DEFAULT;

    default:
      return 0;
  }
}

export function getItemTierRoguePoints(tier?: ModifierTier | null): number {
  switch (tier) {
    case ModifierTier.COMMON:
      return LOG_POINT_VALUES.ITEM_COMMON;
    case ModifierTier.GREAT:
      return LOG_POINT_VALUES.ITEM_GREAT;
    case ModifierTier.ULTRA:
      return LOG_POINT_VALUES.ITEM_ULTRA;
    case ModifierTier.ROGUE:
      return LOG_POINT_VALUES.ITEM_ROGUE;
    case ModifierTier.MASTER:
      return LOG_POINT_VALUES.ITEM_MASTER;
    default:
      return 0;
  }
}

export function calculateRoguePointBreakdown(ctx: RoguePointRewardContext): RoguePointBreakdown {
  const hitResult = getHitResultRoguePoints(ctx.hitResult);
  const critical = ctx.isCritical ? LOG_POINT_VALUES.CRITICAL : 0;
  const formChange = getFormChangeRoguePoints(ctx.formKey);
  const itemTier = getItemTierRoguePoints(ctx.itemTier);

  const evolve = ctx.didEvolve ? LOG_POINT_VALUES.EVOLVE : 0;
  const faintEnemy = ctx.didFaintEnemy ? LOG_POINT_VALUES.FAINT_ENEMY : 0;
  const catchNewSpecies = ctx.didCatchNewSpecies ? LOG_POINT_VALUES.CATCH_NEW_SPECIES : 0;
  const unlockNewAbility = ctx.didUnlockNewAbility ? LOG_POINT_VALUES.UNLOCK_NEW_ABILITY : 0;
  const unlockNewNature = ctx.didUnlockNewNature ? LOG_POINT_VALUES.UNLOCK_NEW_NATURE : 0;
  const unlockNewForm = ctx.didUnlockNewForm ? LOG_POINT_VALUES.UNLOCK_NEW_FORM : 0;
  const maxFriendship = ctx.didReachMaxFriendship ? LOG_POINT_VALUES.MAX_FRIENDSHIP : 0;
  const modeClear = ctx.didClearMode
    ? Math.max(0, Math.floor(ctx.modeClearReward ?? LOG_POINT_VALUES.MODE_CLEAR_DEFAULT))
    : 0;

  const total =
    hitResult +
    critical +
    formChange +
    itemTier +
    evolve +
    faintEnemy +
    catchNewSpecies +
    unlockNewAbility +
    unlockNewNature +
    unlockNewForm +
    maxFriendship +
    modeClear;

  return {
    hitResult,
    critical,
    formChange,
    itemTier,
    evolve,
    faintEnemy,
    catchNewSpecies,
    unlockNewAbility,
    unlockNewNature,
    unlockNewForm,
    maxFriendship,
    modeClear,
    total,
  };
}

export function grantRoguePoints(ctx: RoguePointRewardContext, showMessage = false): number {
  const breakdown = calculateRoguePointBreakdown(ctx);

  if (breakdown.total <= 0) {
    return 0;
  }

  globalScene.gameData.addRoguePoints(breakdown.total);
  globalScene.updateRoguePointText?.();

  if (showMessage) {
    globalScene.phaseManager.queueMessage(`+${breakdown.total} RP`);
  }

  return breakdown.total;
}