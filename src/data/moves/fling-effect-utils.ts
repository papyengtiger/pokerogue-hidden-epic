import { ModifierTier } from "#enums/modifier-tier";
import { allMoves } from "#data/data-lists";
import type { BattlerIndex } from "#enums/battler-index";
import { BattlerTagType } from "#enums/battler-tag-type";
import { MoveCategory, type MoveDamageCategory } from "#enums/move-category";
import type { MoveId } from "#enums/move-id";
import { MoveTarget } from "#enums/move-target";
import { PokemonType } from "#enums/pokemon-type";
import type { Pokemon } from "#field/pokemon";
import { applyMoveAttrs } from "#moves/apply-attrs";
import type { Move, MoveTargetSet, UserMoveConditionFunc } from "#moves/move";
import { NumberHolder } from "#utils/common";
import { areAllies } from "#utils/pokemon-utils";
import { getRandomStatus, getStatusEffectOverlapText, Status } from "#data/status-effect";
import { StatusEffect } from "#enums/status-effect";

export function applyFlingExtraEffect(
  user: Pokemon,
  target: Pokemon,
  mod: PokemonHeldItemModifier,
): void {
  const id = mod.type?.id;
  console.log("[FLING][extra] apply start", {
    id,
    user: user.getName?.(),
    target: target.getName?.(),
  });

  switch (id) {
    case "FREEZE_ORB": {
      // quiet=false로 해야 면역/실패 메시지도 보이고 디버깅 편함
      const ok = target.trySetStatus(StatusEffect.FROSTBITE, user, undefined, null, false, false);
      console.log("[FLING][extra] frostbite ok=", ok, "pending=", target.turnData.pendingStatus, "statusNow=", target.status?.effect);
      return;
    }

    case "FLAME_ORB": {
      const ok = target.trySetStatus(StatusEffect.BURN, user, undefined, null, false, false);
      console.log("[FLING][extra] burn ok=", ok, "pending=", target.turnData.pendingStatus, "statusNow=", target.status?.effect);
      return;
    }

    case "TOXIC_ORB": {
      const ok = target.trySetStatus(StatusEffect.TOXIC, user, undefined, null, false, false);
      console.log("[FLING][extra] toxic ok=", ok, "pending=", target.turnData.pendingStatus, "statusNow=", target.status?.effect);
      return;
    }
  }
}
