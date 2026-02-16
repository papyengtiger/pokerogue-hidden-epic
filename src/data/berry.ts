import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { getStatusEffectHealText } from "#data/status-effect";
import { BattlerTagType } from "#enums/battler-tag-type";
import { BerryType } from "#enums/berry-type";
import { HitResult } from "#enums/hit-result";
import { type BattleStat, Stat } from "#enums/stat";
import type { Pokemon } from "#field/pokemon";
import { NumberHolder, randSeedInt, toDmgValue } from "#utils/common";
import i18next from "i18next";
import {getNatureStatMultiplier} from "/src/data/nature";
import type { BattleStat, EffectiveStat } from "#enums/stat";
import { PokemonType } from "#enums/pokemon-type";
import type { EnemyPokemon, Pokemon } from "#field/pokemon";
import { MoveId } from "#enums/move-id";
import { Move } from "#moves/move";
import { toCamelCase, toTitleCase } from "#utils/strings";
import { Command } from "#enums/command";
import { allAbilities, allMoves, allSpecies, modifierTypes } from "#data/data-lists";
import { MoveCategory } from "#enums/move-category";
import { PokemonTurnData } from "#data/pokemon-data";

export function getBerryName(berryType: BerryType): string {
  return i18next.t(`berry:${BerryType[berryType].toLowerCase()}.name`);
}

export function getBerryEffectDescription(berryType: BerryType): string {
  return i18next.t(`berry:${BerryType[berryType].toLowerCase()}.effect`);
}

// ============================================================
// 🧩 타입별 반감열매 매핑 (전역 정의 - 다른 함수에서도 참조 가능)
// ============================================================
export const berryResistTypeMap: Record<BerryType, Type> = {
  [BerryType.OCCA]: PokemonType.FIRE,
  [BerryType.PASSHO]: PokemonType.WATER,
  [BerryType.WACAN]: PokemonType.ELECTRIC,
  [BerryType.RINDO]: PokemonType.GRASS,
  [BerryType.YACHE]: PokemonType.ICE,
  [BerryType.CHOPLE]: PokemonType.FIGHTING,
  [BerryType.KEBIA]: PokemonType.POISON,
  [BerryType.SHUCA]: PokemonType.GROUND,
  [BerryType.COBA]: PokemonType.FLYING,
  [BerryType.PAYAPA]: PokemonType.PSYCHIC,
  [BerryType.TANGA]: PokemonType.BUG,
  [BerryType.CHARTI]: PokemonType.ROCK,
  [BerryType.KASIB]: PokemonType.GHOST,
  [BerryType.HABAN]: PokemonType.DRAGON,
  [BerryType.COLBUR]: PokemonType.DARK,
  [BerryType.BABIRI]: PokemonType.STEEL,
  [BerryType.CHILAN]: PokemonType.NORMAL,
  [BerryType.ROSELI]: PokemonType.FAIRY,
};

export const TYPE_PRIORITY_BERRIES = new Set([
  BerryType.CHERI, BerryType.CHESTO, BerryType.PECHA, BerryType.RAWST, BerryType.ASPEAR,
  BerryType.ORAN, BerryType.PERSIM, BerryType.WEPEAR, BerryType.BELUE, BerryType.CORNN,
  BerryType.MAGOST, BerryType.RABUTA, BerryType.NOMEL, BerryType.SPELON, BerryType.PAMTRE,
  BerryType.WATMEL, BerryType.DURIN, BerryType.PINAP
]);

export const TYPE_PRIORITY_TYPE_MAP: Record<BerryType, PokemonType> = {
  [BerryType.CHERI]: PokemonType.ELECTRIC,
  [BerryType.CHESTO]: PokemonType.FLYING,
  [BerryType.PECHA]: PokemonType.POISON,
  [BerryType.RAWST]: PokemonType.WATER,
  [BerryType.ASPEAR]: PokemonType.ICE,
  [BerryType.ORAN]: PokemonType.NORMAL,
  [BerryType.PERSIM]: PokemonType.PSYCHIC,
  [BerryType.WEPEAR]: PokemonType.GRASS,
  [BerryType.BELUE]: PokemonType.FAIRY,
  [BerryType.CORNN]: PokemonType.BUG,
  [BerryType.MAGOST]: PokemonType.GHOST,
  [BerryType.RABUTA]: PokemonType.DRAGON,
  [BerryType.NOMEL]: PokemonType.GROUND,
  [BerryType.SPELON]: PokemonType.FIRE,
  [BerryType.PAMTRE]: PokemonType.DARK,
  [BerryType.WATMEL]: PokemonType.FIGHTING,
  [BerryType.DURIN]: PokemonType.STEEL,
  [BerryType.PINAP]: PokemonType.ROCK,
};

export type BerryPredicate = (pokemon: Pokemon) => boolean;

export function getBerryPredicate(berryType: BerryType): BerryPredicate {
  switch (berryType) {
    case BerryType.SITRUS:
      return (pokemon: Pokemon) => pokemon.getHpRatio() < 0.5;
    case BerryType.LUM:
      return (pokemon: Pokemon) => !!pokemon.status || !!pokemon.getTag(BattlerTagType.CONFUSED);
    case BerryType.ENIGMA:
      return (pokemon: Pokemon) =>
        !!pokemon.turnData.attacksReceived.filter(a => a.result === HitResult.SUPER_EFFECTIVE).length;
    case BerryType.LIECHI:
    case BerryType.GANLON:
    case BerryType.PETAYA:
    case BerryType.APICOT:
    case BerryType.SALAC:
      return (pokemon: Pokemon) => {
        const hpRatioReq = new NumberHolder(0.25);
        // Offset BerryType such that LIECHI -> Stat.ATK = 1, GANLON -> Stat.DEF = 2, so on and so forth
        const stat: BattleStat = berryType - BerryType.ENIGMA;
        applyAbAttrs("ReduceBerryUseThresholdAbAttr", { pokemon, hpRatioReq });
        return pokemon.getHpRatio() < hpRatioReq.value && pokemon.getStatStage(stat) < 6;
      };
    case BerryType.MICLE:
    case BerryType.NICLE:
  return (pokemon: Pokemon) => {
    const hpRatioReq = new NumberHolder(0.25);
    applyAbAttrs("ReduceBerryUseThresholdAbAttr", { pokemon, hpRatioReq });
    return pokemon.getHpRatio() < hpRatioReq.value;
  };

    // 🧩 혼합맛 열매 (성격별 회복량 달라짐)
    case BerryType.FIGY:
    case BerryType.WIKI:
    case BerryType.MAGO:
    case BerryType.AGUAV:
    case BerryType.LAPAPA:
      // ✅ 체력 절반 이하일 때 먹도록 설정
      return (pokemon: Pokemon) => pokemon.getHpRatio() <= 0.5;
    case BerryType.POMEG:
case BerryType.KELPSY:
case BerryType.QUALOT:
case BerryType.HONDEW:
case BerryType.GREPA:
case BerryType.TAMATO:
  // ✅ 배틀 시작 직후 바로 발동시키는 즉시형 열매
  return (_p: Pokemon) => true;
   case BerryType.CHERI:
case BerryType.CHESTO:
case BerryType.PECHA:
case BerryType.RAWST:
case BerryType.ASPEAR:
case BerryType.ORAN:
case BerryType.PERSIM:
case BerryType.WEPEAR:
case BerryType.BELUE:
case BerryType.CORNN:
case BerryType.MAGOST:
case BerryType.RABUTA:
case BerryType.NOMEL:
case BerryType.SPELON:
case BerryType.PAMTRE:
case BerryType.WATMEL:
case BerryType.DURIN:
case BerryType.PINAP: {
  // ✅ "이 predicate가 검사 중인 열매" 기준으로 맵핑
  const mappedType = TYPE_PRIORITY_TYPE_MAP[berryType];

  return (pokemon: Pokemon) => {
    const cmd = globalScene.currentBattle.turnCommands[pokemon.getBattlerIndex()];
    if (!cmd || cmd.command !== Command.FIGHT || !cmd.move) return false;

    const move = allMoves[cmd.move.move];
    if (!move) return false;

    const ok = move.type === mappedType;

    return ok;
  };
}

    case BerryType.LANSAT:
      return (pokemon: Pokemon) => {
        const hpRatioReq = new NumberHolder(0.25);
        applyAbAttrs("ReduceBerryUseThresholdAbAttr", { pokemon, hpRatioReq });
        return pokemon.getHpRatio() < 0.25 && !pokemon.getTag(BattlerTagType.CRIT_BOOST);
      };
    case BerryType.STARF:
      return (pokemon: Pokemon) => {
        const hpRatioReq = new NumberHolder(0.25);
        applyAbAttrs("ReduceBerryUseThresholdAbAttr", { pokemon, hpRatioReq });
        return pokemon.getHpRatio() < 0.25;
      };
    case BerryType.LEPPA:
      return (pokemon: Pokemon) => {
        const hpRatioReq = new NumberHolder(0.25);
        applyAbAttrs("ReduceBerryUseThresholdAbAttr", { pokemon, hpRatioReq });
        return !!pokemon.getMoveset().find(m => !m.getPpRatio());
      };
   case BerryType.JABOCA:
case BerryType.ROWAP:
case BerryType.KEE:
case BerryType.MARANGA:
  return (pokemon: Pokemon) => {
    const td: any = pokemon.turnData as any;
    return td?.reactiveBerryForceType === berryType;
  };

   case BerryType.OCCA:
case BerryType.PASSHO:
case BerryType.WACAN:
case BerryType.RINDO:
case BerryType.YACHE:
case BerryType.CHOPLE:
case BerryType.KEBIA:
case BerryType.SHUCA:
case BerryType.COBA:
case BerryType.PAYAPA:
case BerryType.TANGA:
case BerryType.CHARTI:
case BerryType.KASIB:
case BerryType.HABAN:
case BerryType.COLBUR:
case BerryType.BABIRI:
case BerryType.CHILAN:
case BerryType.ROSELI:
  return (pokemon: Pokemon) => {
  const firstAttack = pokemon.turnData.attacksReceived[0];
  if (!firstAttack) return false;

  // ✅ Move 인스턴스면 바로 타입 읽기
  let moveType: PokemonType | null = null;
  if (firstAttack.move && typeof firstAttack.move === "object" && "type" in firstAttack.move) {
    moveType = (firstAttack.move as Move).type;
  }

  // ✅ moveId만 있으면 전역 move 데이터에서 검색
  else if (firstAttack.moveId !== undefined) {
    const moveData = globalScene.moveDex?.[firstAttack.moveId];
    if (moveData && moveData.type) moveType = moveData.type;
  }

  if (moveType === null) return false;

  const resistType = berryResistTypeMap[berryType];

  // 노말은 예외적으로 무조건 발동
  if (resistType === PokemonType.NORMAL && moveType === PokemonType.NORMAL) {
    return true;
  }

  // 해당 타입 공격에만 반응 + 효과가 굉장한 경우만
  return (
    moveType === resistType &&
    firstAttack.result === HitResult.SUPER_EFFECTIVE
  );
};
  }

  return (_p: Pokemon) => false;
  }

export type BerryEffectFunc = (consumer: Pokemon) => void;

export function getBerryEffectFunc(berryType: BerryType): BerryEffectFunc {
  return (consumer: Pokemon) => {
    // Apply an effect pertaining to what berry we're using
    switch (berryType) {
      case BerryType.SITRUS:
      case BerryType.ENIGMA: {
        const hpHealed = new NumberHolder(toDmgValue(consumer.getMaxHp() / 4));
        applyAbAttrs("DoubleBerryEffectAbAttr", { pokemon: consumer, effectValue: hpHealed });
        globalScene.phaseManager.unshiftNew(
          "PokemonHealPhase",
          consumer.getBattlerIndex(),
          hpHealed.value,
          i18next.t("battle:hpHealBerry", {
            pokemonNameWithAffix: getPokemonNameWithAffix(consumer),
            berryName: getBerryName(berryType),
          }),
          true,
        );
        break;
      }

      case BerryType.LUM: {
        if (consumer.status) {
          globalScene.phaseManager.queueMessage(
            getStatusEffectHealText(consumer.status.effect, getPokemonNameWithAffix(consumer)),
          );
        }
        consumer.resetStatus(true, true);
        consumer.updateInfo();
        break;
      }

      case BerryType.LIECHI:
      case BerryType.GANLON:
      case BerryType.PETAYA:
      case BerryType.APICOT:
      case BerryType.SALAC: {
        const stat: BattleStat = berryType - BerryType.ENIGMA;
        const statStages = new NumberHolder(1);
        applyAbAttrs("DoubleBerryEffectAbAttr", { pokemon: consumer, effectValue: statStages });
        globalScene.phaseManager.unshiftNew(
          "StatStageChangePhase",
          consumer.getBattlerIndex(),
          true,
          [stat],
          statStages.value,
        );
        break;
      }

      case BerryType.MICLE:
      case BerryType.NICLE: {
        const stat: BattleStat = berryType === BerryType.MICLE ? Stat.ACC : Stat.EVA;
        const statStages = new NumberHolder(1);
        applyAbAttrs("DoubleBerryEffectAbAttr", { pokemon: consumer, effectValue: statStages });
        globalScene.phaseManager.unshiftNew(
          "StatStageChangePhase",
          consumer.getBattlerIndex(),
          true,
          [stat],
          statStages.value,
        );
        break;
      }

      // 🔹 성격 기반 회복 열매
      case BerryType.FIGY:
      case BerryType.WIKI:
      case BerryType.MAGO:
      case BerryType.AGUAV:
      case BerryType.LAPAPA: {
        const berryStatMap: Record<BerryType, Stat> = {
          [BerryType.FIGY]: Stat.ATK,
          [BerryType.WIKI]: Stat.SPATK,
          [BerryType.MAGO]: Stat.SPD,
          [BerryType.AGUAV]: Stat.SPDEF,
          [BerryType.LAPAPA]: Stat.DEF,
        };
        const targetStat = berryStatMap[berryType];
        const mult = getNatureStatMultiplier(consumer.nature, targetStat);
        let ratio = mult > 1 ? 0.5 : mult < 1 ? 0.25 : 0.33;
        const hpHealed = new NumberHolder(toDmgValue(consumer.getMaxHp() * ratio));
        applyAbAttrs("DoubleBerryEffectAbAttr", { pokemon: consumer, effectValue: hpHealed });
        globalScene.phaseManager.unshiftNew(
          "PokemonHealPhase",
          consumer.getBattlerIndex(),
          hpHealed.value,
          i18next.t("battle:hpHealBerry", {
            pokemonNameWithAffix: getPokemonNameWithAffix(consumer),
            berryName: getBerryName(berryType),
          }),
          true,
        );
        break;
      }

      case BerryType.KELPSY:
      case BerryType.QUALOT:
      case BerryType.HONDEW:
      case BerryType.GREPA:
      case BerryType.TAMATO: {
        const stat: BattleStat = berryType - BerryType.KELPSY + 1;
        const statStages = new NumberHolder(1);
        applyAbAttrs("DoubleBerryEffectAbAttr", { pokemon: consumer, effectValue: statStages });
        globalScene.phaseManager.unshiftNew(
          "StatStageChangePhase",
          consumer.getBattlerIndex(),
          true,
          [stat],
          statStages.value,
        );
        break;
      }

      case BerryType.POMEG: {
        const randStat = randSeedInt(Stat.SPD, Stat.ATK);
        const stages = new NumberHolder(2);
        applyAbAttrs("DoubleBerryEffectAbAttr", { pokemon: consumer, effectValue: stages });
        globalScene.phaseManager.unshiftNew(
          "StatStageChangePhase",
          consumer.getBattlerIndex(),
          true,
          [randStat],
          stages.value,
        );
        break;
      }

      case BerryType.LANSAT: {
        consumer.addTag(BattlerTagType.CRIT_BOOST);
        break;
      }

      case BerryType.STARF: {
        const randStat = randSeedInt(Stat.SPD, Stat.ATK);
        const stages = new NumberHolder(2);
        applyAbAttrs("DoubleBerryEffectAbAttr", { pokemon: consumer, effectValue: stages });
        globalScene.phaseManager.unshiftNew(
          "StatStageChangePhase",
          consumer.getBattlerIndex(),
          true,
          [randStat],
          stages.value,
        );
        break;
      }
      case BerryType.CUSTAP:
  return (pokemon: Pokemon) => {
    const hpRatioReq = new NumberHolder(0.25);
    applyAbAttrs("ReduceBerryUseThresholdAbAttr", { pokemon, hpRatioReq });

    if (pokemon.getHpRatio() >= hpRatioReq.value) return false;

    const cmd = globalScene.currentBattle.turnCommands[pokemon.getBattlerIndex()];
    if (!cmd || cmd.command !== Command.FIGHT) return false;

    return true;
  };

     // 🧩 타입 선공 열매(18종 + BELUE)
case BerryType.CHERI:
case BerryType.CHESTO:
case BerryType.PECHA:
case BerryType.RAWST:
case BerryType.ASPEAR:
case BerryType.ORAN:
case BerryType.PERSIM:
case BerryType.WEPEAR:
case BerryType.BELUE:
case BerryType.CORNN:
case BerryType.MAGOST:
case BerryType.RABUTA:
case BerryType.NOMEL:
case BerryType.SPELON:
case BerryType.PAMTRE:
case BerryType.WATMEL:
case BerryType.DURIN:
case BerryType.PINAP: {
  // 🔹 열매 ↔ 타입 매핑
  const typeMap: Record<number, PokemonType> = {
    [BerryType.CHERI]: PokemonType.ELECTRIC,
    [BerryType.CHESTO]: PokemonType.FLYING,
    [BerryType.PECHA]: PokemonType.POISON,
    [BerryType.RAWST]: PokemonType.WATER,
    [BerryType.ASPEAR]: PokemonType.ICE,
    [BerryType.ORAN]: PokemonType.NORMAL,
    [BerryType.PERSIM]: PokemonType.PSYCHIC,
    [BerryType.WEPEAR]: PokemonType.GRASS,
    [BerryType.BELUE]: PokemonType.FAIRY,
    [BerryType.CORNN]: PokemonType.BUG,
    [BerryType.MAGOST]: PokemonType.GHOST,
    [BerryType.RABUTA]: PokemonType.DRAGON,
    [BerryType.NOMEL]: PokemonType.GROUND,
    [BerryType.SPELON]: PokemonType.FIRE,
    [BerryType.PAMTRE]: PokemonType.DARK,
    [BerryType.WATMEL]: PokemonType.FIGHTING,
    [BerryType.DURIN]: PokemonType.STEEL,
    [BerryType.PINAP]: PokemonType.ROCK,
  };

  // ✅ “먹는 베리”는 파라미터 berryType 그 자체
  const mappedType = typeMap[berryType];
  if (mappedType == null) break;

  // ✅ 어떤 기술로 발동했는지는 너의 예약값을 쓰는 게 제일 안전
  const td: any = consumer.turnData as any;
  const moveId = td?.priorityBerryReservedMoveId;
  const moveData = moveId ? allMoves?.[moveId] : undefined;
  const moveType = moveData?.type;

  // (선택) moveType이 실제 타입(특성으로 변경된 타입)까지 반영해야 하면
  // 너가 getPriority에서 계산한 actualType을 td에 저장해두고 그걸 쓰는 게 제일 정확함.

  if (moveType != null && moveType === mappedType) {
    // ✅ 메시지만 (소모는 이미 tryUseBerry -> berry.apply로 끝났음)
    globalScene.phaseManager.queueMessage(
      i18next.t("battle:berryActivatedPriorityType", {
        pokemonName: getPokemonNameWithAffix(consumer),
        typeName: i18next.t(`pokemonInfo:type.${PokemonType[moveType].toLowerCase()}`),
        berryName: getBerryName(berryType),
      }),
    );
  }

  break;
}

case BerryType.JABOCA:
case BerryType.ROWAP: {
  const td: any = consumer.turnData as any;
  const atkIdx: number | undefined = td?.reactiveBerryAttackerIndex;
  if (atkIdx == null) break;

  // ✅ battlerIndex -> Pokemon 얻기 (네 엔진에 맞는 걸 택1)
  const attacker =
    (globalScene.getPokemonByBattlerIndex?.(atkIdx) as Pokemon | undefined) ??
    (globalScene.getPlayerField?.().find((p: any) => p?.getBattlerIndex?.() === atkIdx) as Pokemon | undefined) ??
    (globalScene.getEnemyField?.().find((p: any) => p?.getBattlerIndex?.() === atkIdx) as Pokemon | undefined);

  if (!attacker) break;

  const dmg = Math.max(Math.floor(attacker.getMaxHp() / 8), 1);
  attacker.damageAndUpdate(dmg, { result: HitResult.INDIRECT });

  globalScene.phaseManager.queueMessage(
    i18next.t("battle:berryReactiveDamage", {
      pokemonNameWithAffix: getPokemonNameWithAffix(consumer),
      targetNameWithAffix: getPokemonNameWithAffix(attacker),
      berryName: getBerryName(berryType),
    }),
  );

  break;
}

case BerryType.KEE:
case BerryType.MARANGA: {
  const stat: BattleStat = berryType === BerryType.KEE ? Stat.DEF : Stat.SPDEF;
  const stages = new NumberHolder(1);
  applyAbAttrs("DoubleBerryEffectAbAttr", { pokemon: consumer, effectValue: stages });

  globalScene.phaseManager.unshiftNew(
  "StatStageChangePhase",
  consumer.getBattlerIndex(),
  true,
  [stat],
  stages.value,
);

  globalScene.phaseManager.queueMessage(
    i18next.t("battle:berryReactiveStatUp", {
      pokemonNameWithAffix: getPokemonNameWithAffix(consumer),
      berryName: getBerryName(berryType),
    }),
  );

  break;
}
case BerryType.CUSTAP: {
  const td: any = consumer.turnData as any;
  td.custapBypassSpeedThisTurn = true;

  // (선택) 표시 메시지
  globalScene.phaseManager.queueMessage(
    i18next.t("modifier:bypassSpeedChanceApply", {
      pokemonName: getPokemonNameWithAffix(consumer),
      itemName: i18next.t("berry:custap.name"), // 너의 키에 맞게 조정
    }),
  );
  break;
}

      case BerryType.LEPPA: {
        const ppRestoreMove =
          consumer.getMoveset().find(m => m.ppUsed === m.getMovePp()) ??
          consumer.getMoveset().find(m => m.ppUsed < m.getMovePp());
        if (ppRestoreMove) {
          ppRestoreMove.ppUsed = Math.max(ppRestoreMove.ppUsed - 10, 0);
          globalScene.phaseManager.queueMessage(
            i18next.t("battle:ppHealBerry", {
              pokemonNameWithAffix: getPokemonNameWithAffix(consumer),
              moveName: ppRestoreMove.getName(),
              berryName: getBerryName(berryType),
            }),
          );
        }
        break;
      }

      default:
        console.error("Incorrect BerryType %d passed to getBerryEffectFunc", berryType);
    }
  };
}
