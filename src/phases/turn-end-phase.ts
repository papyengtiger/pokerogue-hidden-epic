import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { TerrainType } from "#data/terrain";
import { BattlerTagLapseType } from "#enums/battler-tag-lapse-type";
import { WeatherType } from "#enums/weather-type";
import { TurnEndEvent } from "#events/battle-scene";
import type { Pokemon } from "#field/pokemon";
import {
  EnemyStatusEffectHealChanceModifier,
  EnemyTurnHealModifier,
  TurnHealModifier,
  TurnHeldItemTransferModifier,
  TurnStatusEffectModifier,
  MoodyItemModifier,
  WishingStarModifier,
  WeatherRockTrainerModifier,
  TerrainSeedTrainerModifier,
  SturdyMealModifier
} from "#modifiers/modifier";
import { FieldPhase } from "#phases/field-phase";
import i18next from "i18next";
import { type BattleStat, EFFECTIVE_STATS } from "#enums/stat";
import { StatStageChangePhase } from "#app/phases/stat-stage-change-phase";
import { areAllies, canSpeciesTera, willTerastallize } from "#utils/pokemon-utils";
import { MoveCategory } from "#enums/move-category";
import { BerryType } from "#enums/berry-type";
import { NumberHolder, randSeedInt, toDmgValue } from "#utils/common";
import { PracticeResultPhase } from "#phases/practice-result-phase";

export class TurnEndPhase extends FieldPhase {
  public readonly phaseName = "TurnEndPhase";

  start() {
    super.start();

    const endingTurn = globalScene.currentBattle.turn;
  globalScene.eventTarget.dispatchEvent(new TurnEndEvent(endingTurn));

    // 몬스터소굴 턴 카운트 증가
    if (globalScene.isMonsterHouseActive && globalScene.monsterHouseData) {
      globalScene.monsterHouseData.turnCount++;
    }

    globalScene.phaseManager.hideAbilityBar();

    // ✅ (1) handlePokemon 바깥: 헬퍼 함수 2개
    const sumDamageTakenThisTurn = (p: Pokemon) =>
      p.turnData.attacksReceived
        .filter(ar => {
          // ar.move 없으면(독/날씨/자해/반동 등) 제외
          if (ar.move == null) return false;

          const category = allMoves[ar.move].category;

          return (
            category !== MoveCategory.STATUS &&
            typeof ar.damage === "number" &&
            ar.damage > 0 &&
            // 자기 자신이 소스인 피해(반동/자해 등) 제외
            ar.sourceBattlerIndex !== p.getBattlerIndex() &&
            // 아군 제외
            !areAllies(p.getBattlerIndex(), ar.sourceBattlerIndex)
          );
        })
        .reduce((s, ar) => s + (ar.damage ?? 0), 0);

    const lastAttackerIndexThisTurn = (p: Pokemon): number | null => {
      const last = [...p.turnData.attacksReceived]
        .reverse()
        .find(ar => {
          if (ar.move == null) return false;

          const category = allMoves[ar.move].category;

          return (
            category !== MoveCategory.STATUS &&
            typeof ar.damage === "number" &&
            ar.damage > 0 &&
            ar.sourceBattlerIndex !== p.getBattlerIndex() &&
            !areAllies(p.getBattlerIndex(), ar.sourceBattlerIndex)
          );
        });

      return last?.sourceBattlerIndex ?? null;
    };

    const handlePokemon = (pokemon: Pokemon) => {
      // ✅ ✅ ✅ (A) 제일 먼저: BIDE 누적/감소/마지막 공격자 저장
const bd = pokemon.battleData as any;

if (bd.bideActive && (bd.bideTurnsLeft ?? 0) > 0) {
  const add = sumCounterableDamageThisTurn(pokemon); // 네가 가진 함수 사용
  bd.bideDamage = (bd.bideDamage ?? 0) + add;

  // 마지막 공격자 저장(있으면 갱신)
  const last = [...pokemon.turnData.attacksReceived]
    .reverse()
    .find(ar =>
      allMoves[ar.move].category !== MoveCategory.STATUS &&
      !areAllies(pokemon.getBattlerIndex(), ar.sourceBattlerIndex) &&
      typeof ar.damage === "number" &&
      ar.damage > 0
    );
  if (last) bd.bideLastAttackerIndex = last.sourceBattlerIndex;

  bd.bideTurnsLeft--;

  // ✅ 2턴 끝났으면 “다음 턴 방출” 플래그
  if (bd.bideTurnsLeft <= 0) {
    bd.bideReleasing = true;
  }
}

      if (!pokemon.switchOutStatus) {
        pokemon.lapseTags(BattlerTagLapseType.TURN_END);

        globalScene.applyModifiers(TurnHealModifier, pokemon.isPlayer(), pokemon);
        globalScene.applyModifiers(SturdyMealModifier, pokemon.isPlayer(), pokemon);

        // ✅ 그래시 필드 회복 효과
        if (globalScene.arena.terrain?.terrainType === TerrainType.GRASSY && pokemon.isGrounded()) {
          globalScene.phaseManager.unshiftNew(
            "PokemonHealPhase",
            pokemon.getBattlerIndex(),
            Math.max(pokemon.getMaxHp() >> 4, 1),
            i18next.t("battle:turnEndHpRestore", {
              pokemonName: getPokemonNameWithAffix(pokemon),
            }),
            true
          );
        }

        // ✅ 적 포켓몬용 회복 / 상태이상 회복 처리
        if (!pokemon.isPlayer()) {
          globalScene.applyModifiers(EnemyTurnHealModifier, false, pokemon);
          globalScene.applyModifier(EnemyStatusEffectHealChanceModifier, false, pokemon);
        }

        applyAbAttrs("PostTurnAbAttr", { pokemon });

        // ✅ Wishing Star 처리
        const wishingStarMods = globalScene.getModifiers(WishingStarModifier);
        for (const mod of wishingStarMods) {
          const poke = mod.getPokemon();
          if (!poke || !poke.isOnField()) continue;

          if (mod.isForbiddenSpecies(poke)) {
            console.log(`[WishingStar] 금지된 종 ${poke.name} 발견, 모디파이어 강제 제거`);
            globalScene.removeModifier(mod);
            continue;
          }

          mod.lapse();
        }
      }

      globalScene.applyModifiers(TurnStatusEffectModifier, pokemon.isPlayer(), pokemon);
      globalScene.applyModifiers(TurnHeldItemTransferModifier, pokemon.isPlayer(), pokemon);

      // ✅ MoodyItemModifier 처리 (TurnEndPhase)
// ✅ MoodyItemModifier 처리 (TurnEndPhase)
const moodyMod = globalScene
  .getModifiers(MoodyItemModifier, pokemon.isPlayer())
  .find(
    mod =>
      mod instanceof MoodyItemModifier &&
      mod.pokemonId === pokemon.id,
  ) as MoodyItemModifier | undefined;

if (moodyMod) {
  moodyMod.applyTurnEnd(pokemon, false, []);
}

// ✅ ✅ ✅ 여기! (turnCount 올리기 전에)
{
  const bd: any = (pokemon as any).battleData ??= new PokemonBattleData();

  // 커스타프 들고 있는지(소모/교체/기프트패스/트릭 등 반영 후 최종 상태)
  const held = pokemon.getHeldBerryTypes?.() ?? [];
  const hasCustap = held.includes(BerryType.CUSTAP);

  if (hasCustap && pokemon.hp > 0) {
    const hpRatioReq = new NumberHolder(0.25);
    applyAbAttrs("ReduceBerryUseThresholdAbAttr", { pokemon, hpRatioReq });

    // "전 턴 종료 시점에 25% 이하였는가"만 저장 (다음 턴 TurnStart에서 primed로 사용)
    bd.custapPrimed = pokemon.getHpRatio() <= hpRatioReq.value;
  } else {
    // 없거나 기절이면 primed 해제
    bd.custapPrimed = false;
  }
}

      pokemon.tempSummonData.turnCount++;
      pokemon.tempSummonData.waveTurnCount++;
    };

    this.executeForAll(handlePokemon);
    globalScene.arena.lapseTags();
    // ✅ 트레이너 락 여부 확인
    const hasTrainerWeatherLock = globalScene
      .getModifiers(WeatherRockTrainerModifier, true)
      .some(m => m instanceof WeatherRockTrainerModifier);

    const hasTrainerTerrainLock = globalScene
      .getModifiers(TerrainSeedTrainerModifier, true)
      .some(m => m instanceof TerrainSeedTrainerModifier);

    // ✅ 기본 lapse()는 트레이너 락이 없을 때만 실행
    if (!hasTrainerTerrainLock && globalScene.arena.terrain && !globalScene.arena.terrain.lapse()) {
      globalScene.arena.trySetTerrain(TerrainType.NONE);
    }

    if (!hasTrainerWeatherLock && globalScene.arena.weather && !globalScene.arena.weather.lapse()) {
      globalScene.arena.trySetWeather(WeatherType.NONE);
    }

    // ✅ 트레이너 락(WeatherRockTrainerModifier / TerrainSeedTrainerModifier) 턴 처리
    const weatherMods = globalScene
      .getModifiers(WeatherRockTrainerModifier, true)
      .filter(m => m instanceof WeatherRockTrainerModifier) as WeatherRockTrainerModifier[];
    const terrainMods = globalScene
      .getModifiers(TerrainSeedTrainerModifier, true)
      .filter(m => m instanceof TerrainSeedTrainerModifier) as TerrainSeedTrainerModifier[];

    for (const mod of weatherMods) mod.onTurnEnd();
    for (const mod of terrainMods) mod.onTurnEnd();

    globalScene.currentBattle.incrementTurn();

if ((globalScene.currentBattle as any)?.isPracticeBattle) {
  globalScene.phaseManager.pushNew("PracticeResultPhase");
}

this.end();
  }
}
