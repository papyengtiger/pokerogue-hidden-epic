import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import {
  CommanderAbAttr,
  PostSummonAbAttr,
  PostTerrainChangeAddBattlerTagAttr,
  PostWeatherChangeAddBattlerTagAttr,
  BoostEnergyTagAttr,
} from "#app/data/abilities/ability";
import { globalScene } from "#app/global-scene";
import { EntryHazardTag } from "#data/arena-tag";
import {
  MysteryEncounterPostSummonTag,
  HighestStatBoostTag,
  WeatherHighestStatBoostTag,
  TerrainHighestStatBoostTag,
} from "#data/battler-tags";
import { BattlerTagType } from "#enums/battler-tag-type";
import { StatusEffect } from "#enums/status-effect";
import { PokemonPhase } from "#phases/pokemon-phase";
import { DynamaxPhase } from "#app/phases/dynamax-phase";
import {
  BoostEnergyModifier,
  WishingStarModifier,
  WeatherRockTrainerModifier,
  TerrainSeedTrainerModifier,
  BeastBoostStartStatBoostModifier,
  PreserveItemModifier,
} from "#app/modifier/modifier";
import { SpeciesId } from "#enums/species-id";
import { EFFECTIVE_STATS } from "#enums/stat"; // 네 코드에서 사용 중
import { WeatherType } from "#app/enums/weather-type";
import { TerrainType } from "#data/terrain";
import type { Pokemon } from "#field/pokemon";
import { BATTLE_STATS, type PermanentStat, Stat, TEMP_BATTLE_STATS, type TempBattleStat, EFFECTIVE_STATS, type BattleStat, Stat } from "#enums/stat";
import { BooleanHolder, NumberHolder } from "#utils/common";
import { recordRecycleSnapshot } from "#moves/recycle-snapshot";
import i18next from "i18next";
import { getPokemonNameWithAffix } from "#app/messages";

export class PostSummonPhase extends PokemonPhase {
  public readonly phaseName = "PostSummonPhase";

  start() {
    super.start();

    const pokemon = this.getPokemon();
    console.debug(`[PostSummonPhase] Start for ${pokemon.name}`);
    console.log("[POST_SUMMON_START]", {
    name: pokemon.name,
    ability: pokemon.getAbility?.()?.name,
    abilityId: pokemon.abilityId,
    isPlayer: pokemon.isPlayer(),
  });
    // 맹독 카운트 초기화
    if (pokemon.status?.effect === StatusEffect.TOXIC) {
      pokemon.status.toxicTurnCount = 0;
    }

    // ✅ 엔트리 해저드 처리
    globalScene.arena.applyTags(EntryHazardTag, false, pokemon);

    // ✅ Mystery Encounter Post Summon 처리(기존 유지)
    if (
      globalScene.currentBattle.isBattleMysteryEncounter() &&
      pokemon.findTags(t => t instanceof MysteryEncounterPostSummonTag).length > 0
    ) {
      pokemon.lapseTag(BattlerTagType.MYSTERY_ENCOUNTER_POST_SUMMON);
    }

    // ✅ Boost Energy 발동 로직(기존 유지)
console.log(
  "[BOOST_CALL_BEFORE]",
  pokemon.name,
);

this.applyBoostEnergyTag(pokemon);

// ✅ 울트라에너지(기존 유지)
this.applyUltraEnergyStartBoost(pokemon);

// ✅ BoostEnergyTagAttr 강제 실행(기존 유지)
console.debug(`[PostSummonPhase] BoostEnergyTagAttr 실행 시도`);
applyAbAttrs("BoostEnergyTagAttr", pokemon);

// ✅ Commander 처리(기존 유지)
const field = pokemon.isPlayer() ? globalScene.getPlayerField() : globalScene.getEnemyField();
for (const p of field) {
  applyAbAttrs("CommanderAbAttr", { pokemon: p });
}

    // ✅ Wishing Star Dynamax 처리(기존 유지)
    const modifiers = globalScene.getModifiers(WishingStarModifier);
    const forbiddenSpecies = new Set([SpeciesId.ZACIAN, SpeciesId.ZAMAZENTA]);

    for (const mod of modifiers) {
      const modPokemon = mod.getPokemon?.();
      if (!modPokemon) continue;
      if (forbiddenSpecies.has(modPokemon.speciesId)) continue;
      if (!modPokemon.isOnField?.()) continue;

      if (!modPokemon.isDynamaxed && !modPokemon.isMax?.()) {
        globalScene.phaseManager.unshiftPhase(new DynamaxPhase(modPokemon, globalScene));
      }
    }

    // ✅ 트레이너 날씨 락 적용(기존 유지)
    const trainerWeatherMods = globalScene
      .getModifiers(WeatherRockTrainerModifier, true)
      .filter(m => m instanceof WeatherRockTrainerModifier) as WeatherRockTrainerModifier[];

    if (trainerWeatherMods.length > 0 && globalScene.arena) {
      for (const mod of trainerWeatherMods) {
        const weatherType = (mod as any)["weatherType"];
        const currentWeather = globalScene.arena.weather?.weatherType ?? WeatherType.NONE;
        const turnsLeft = globalScene.arena.weather?.turnsLeft ?? 0;
        const savedTurns = mod.getRemainingTurns();

        if (currentWeather === weatherType && turnsLeft > 0) {
          console.log(`[PostSummonPhase] ${WeatherType[weatherType]} 이미 유지 중 (남은 턴 ${turnsLeft}) → 스킵`);
          continue;
        }

        console.log(`[PostSummonPhase] WeatherRockTrainerModifier 감지됨 → ${WeatherType[weatherType]} 새로 적용 시도`);
        const success = globalScene.arena.trySetWeather(weatherType);

        if (success && globalScene.arena.weather) {
          if (savedTurns > 0 && savedTurns < mod.getMaxBattles()) {
            globalScene.arena.weather.turnsLeft = savedTurns;
            console.log(`[PostSummonPhase] ${WeatherType[weatherType]} 재적용 (남은 턴 ${savedTurns})`);
          } else {
            globalScene.arena.weather.turnsLeft = mod.getMaxBattles();
            mod.setRemainingTurns(globalScene.arena.weather.turnsLeft);
            console.log(`[PostSummonPhase] ${WeatherType[weatherType]} 새로 설정됨 (턴 ${mod.getMaxBattles()})`);
          }
        }
      }
    } else {
      console.log("[PostSummonPhase] WeatherRockTrainerModifier 없음 → 날씨 변경 생략");
    }

    // ✅ 트레이너 필드 락 적용(기존 유지)
    const trainerTerrainMods = globalScene
      .getModifiers(TerrainSeedTrainerModifier, true)
      .filter(m => m instanceof TerrainSeedTrainerModifier) as TerrainSeedTrainerModifier[];

    if (trainerTerrainMods.length > 0 && globalScene.arena) {
      for (const mod of trainerTerrainMods) {
        const terrainType = (mod as any)["terrainType"];
        const currentTerrain = globalScene.arena.terrain?.terrainType ?? TerrainType.NONE;
        const turnsLeft = globalScene.arena.terrain?.turnsLeft ?? 0;
        const savedTurns = mod.getRemainingTurns();

        if (currentTerrain === terrainType && turnsLeft > 0) {
          console.log(`[PostSummonPhase] ${TerrainType[terrainType]} 이미 유지 중 (남은 턴 ${turnsLeft}) → 스킵`);
          continue;
        }

        console.log(`[PostSummonPhase] TerrainSeedTrainerModifier 감지됨 → ${TerrainType[terrainType]} 새로 적용 시도`);
        const success = globalScene.arena.trySetTerrain(terrainType);

        if (success && globalScene.arena.terrain) {
          if (savedTurns > 0 && savedTurns < mod.getMaxBattles()) {
            globalScene.arena.terrain.turnsLeft = savedTurns;
            console.log(`[PostSummonPhase] ${TerrainType[terrainType]} 재적용 (남은 턴 ${savedTurns})`);
          } else {
            globalScene.arena.terrain.turnsLeft = mod.getMaxBattles();
            mod.setRemainingTurns(globalScene.arena.terrain.turnsLeft);
            console.log(`[PostSummonPhase] ${TerrainType[terrainType]} 새로 설정됨 (턴 ${mod.getMaxBattles()})`);
          }
        }
      }
    } else {
      console.log("[PostSummonPhase] TerrainSeedTrainerModifier 없음 → 필드 변경 생략");
    }

    // ✅ ❌ 즉발 능력치 베리(유석/시마) 관련 로직은 여기서 절대 처리하지 않음
    //    (TurnInitPhase → BattleStartImmediateBerryPhase → BerryPhase에서만 처리)

    this.end();
  }

  protected applyBoostEnergyTag(pokemon: Pokemon) {
  const normalBoostEnergyItem = globalScene
  .getModifiers(BoostEnergyModifier, pokemon.isPlayer())
  .find(mod => mod.pokemonId === pokemon.id) as BoostEnergyModifier | undefined;

const practiceBoostEnergyItem = ((globalScene as any).practiceRentalModifiers ?? [])
  .find((mod: any) =>
    mod instanceof BoostEnergyModifier &&
    mod.pokemonId === pokemon.id
  ) as BoostEnergyModifier | undefined;

const boostEnergyItem =
  normalBoostEnergyItem ??
  practiceBoostEnergyItem;

console.log("[BOOST_ITEM_FOUND]", {
  name: pokemon.name,
  isPlayer: pokemon.isPlayer(),
  pokemonId: pokemon.id,
  normalFound: !!normalBoostEnergyItem,
  practiceFound: !!practiceBoostEnergyItem,
});

if (!boostEnergyItem) {
  return;
}

  let highestStat: BattleStat | null = null;
  let highestValue =
    Number.NEGATIVE_INFINITY;

  for (const stat of EFFECTIVE_STATS) {
    const value =
      pokemon.getEffectiveStat(
        stat,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );

    if (
      value >
      highestValue
    ) {
      highestValue =
        value;

      highestStat =
        stat as BattleStat;
    }
  }

  if (
    highestStat ===
    null
  ) {
    return;
  }

  const boostMultiplier =
  highestStat === Stat.SPD
    ? 1.5
    : 1.3;

  const applied = boostEnergyItem.apply(
    pokemon,
    [highestStat],
    boostMultiplier,
  );

  console.log("[BOOST_APPLIED]", {
    pokemon: pokemon.name,
    highestStat,
    highestValue,
    boostMultiplier,
    applied,
  });

  if (!applied) {
    return;
  }

  // ✅ 부스터에너지 소모 처리
  const preserve = new BooleanHolder(false);

  globalScene.applyModifiers(
    PreserveItemModifier,
    pokemon.isPlayer(),
    pokemon,
    preserve,
    "item",
  );

  if (!preserve.value) {
  recordRecycleSnapshot(
    pokemon,
    boostEnergyItem,
    { args: [] },
  );

  // ✅ 지닌도구 제거
  pokemon.loseHeldItem(boostEnergyItem);

  globalScene.phaseManager.queueMessage(
    i18next.t("modifier:boostEnergyItemUsed", {
      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
      itemName:
        boostEnergyItem.type?.name ??
        "부스터에너지",
    }),
  );
}

  globalScene.updateModifiers(
    pokemon.isPlayer(),
  );

  pokemon.updateInfo?.();
}

  private activateProtosynthesis(pokemon: Pokemon) {
    if (!pokemon.summonData?.tags) {
      console.warn(`[PostSummonPhase] ${pokemon.name} tag container not ready, skipping Protosynthesis`);
      return;
    }

    const added = pokemon.addTag(BattlerTagType.PROTOSYNTHESIS, 0);
    if (added) console.log("[PostSummonPhase] Protosynthesis activated (Boost Energy or Sun)");
    else console.warn("[PostSummonPhase] Failed to add Protosynthesis tag");
  }

  private activateQuarkDrive(pokemon: Pokemon) {
    if (!pokemon.summonData?.tags) {
      console.warn(`[PostSummonPhase] ${pokemon.name} tag container not ready, skipping Quark Drive`);
      return;
    }

    const added = pokemon.addTag(BattlerTagType.QUARK_DRIVE, 0);
    if (added) console.log("[PostSummonPhase] Quark Drive activated (Boost Energy or Electric Terrain)");
    else console.warn("[PostSummonPhase] Failed to add Quark Drive tag");
  }

  public getPriority() {
    return 0;
  }

private applyUltraEnergyStartBoost(pokemon: Pokemon) {
  const appliedAny = globalScene.applyModifiers(
    BeastBoostStartStatBoostModifier,
    pokemon.isPlayer(),
    pokemon,
    1,
  );
  if (appliedAny) globalScene.updateModifiers(pokemon.isPlayer());
  }
}
