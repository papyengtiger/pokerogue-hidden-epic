import { globalScene } from "#app/global-scene";
import Overrides from "#app/overrides";
import { Phase } from "#app/phase";
import { SpeciesFormChangeMoveLearnedTrigger } from "#data/form-change-triggers";
import { Gender } from "#data/gender";
import { ChallengeType } from "#enums/challenge-type";
import { overrideHeldItems, overrideModifiers } from "#modifiers/modifier";
import type { Starter } from "#types/save-data";
import { applyChallenges } from "#utils/challenge-utils";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import { allMoves, allSpecies, biomeDepths, modifierTypes } from "#data/data-lists";
import {
  ConsumableModifier,
  ConsumablePokemonModifier,
  DoubleBattleChanceBoosterModifier,
  ExpBalanceModifier,
  ExpShareModifier,
  FusePokemonModifier,
  HealingBoosterModifier,
  ModifierBar,
  PersistentModifier,
  PokemonExpBoosterModifier,
  PokemonFormChangeItemModifier,
  PokemonHeldItemModifier,
  PokemonHpRestoreModifier,
  PokemonIncrementingStatModifier,
  RememberMoveModifier,
  StackingPowerBoosterModifier,
  PokemonDefensiveStatModifier,
  SpeedStatModifier,
  SpAtkStatModifier,
  AtkStatModifier,
} from "#modifiers/modifier";
import {
  getDefaultModifierTypeForTier,
  getEnemyModifierTypesForWave,
  getLuckString,
  getLuckTextTint,
  getPartyLuckValue,
  type ModifierType,
  PokemonHeldItemModifierType,
  getModifierTypeById,
} from "#modifiers/modifier-type";
import SoundFade from "phaser3-rex-plugins/plugins/soundfade";
import { GameModes } from "#enums/game-modes";
import { PokemonMove } from "#moves/pokemon-move";

export class StartRunPhase extends Phase {
  public readonly phaseName = "StartRunPhase";

  constructor(private starters: Starter[]) {
    super();
  }

  // ✅ 여기 1
  // ✅ 여기 2
 private applyPreRunItems(starter: Starter, starterPokemon: Pokemon): void {
  const preRunItems = (starter.preRunItems ?? []) as ModifierType[];

  for (const raw of preRunItems) {
  if (!raw) {
    console.warn("[START_RUN] invalid preRun item", raw);
    continue;
  }

  let modifierType: any = raw;

  if (typeof raw === "string") {
    modifierType = getModifierTypeById(raw);

    if (typeof modifierType === "function") {
      modifierType = modifierType();
    }
  }

  if (!modifierType?.newModifier) {
    console.warn("[START_RUN] cannot resolve preRun item", {
      raw,
      resolved: modifierType,
    });
    continue;
  }

  let modifier: any = null;

  if (modifierType instanceof PokemonHeldItemModifierType) {
    modifier = modifierType.newModifier(starterPokemon);

    if (
      modifier &&
      "pokemonId" in modifier &&
      (modifier.pokemonId == null || modifier.pokemonId === -1)
    ) {
      modifier.pokemonId = starterPokemon.id;
    }
  } else {
    modifier = modifierType.newModifier();
  }

  const result = globalScene.addModifier(
    modifier,
    false,
    true,
  );

  console.log("[PRERUN_HELD_DEBUG]", {
    raw,
    modifier: modifierType.id,
    pokemon: starterPokemon.name,
    pokemonId: starterPokemon.id,
    result,
  });
}
}

private applyPendingRunItems(): void {
  const pendingRunItems = (globalScene.gameData.pendingRunItems ?? []) as Array<
    string | {
      itemId: string;
      purchaseMode?: "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT";
      targetSpeciesId?: number;
    }
  >;
  console.log("[START_RUN] pendingRunItems", globalScene.gameData.pendingRunItems);

  const party = globalScene.getPlayerParty();

  for (const pending of pendingRunItems) {
    const itemId = typeof pending === "string" ? pending : pending.itemId;
    let purchaseMode =
      typeof pending === "string" ? undefined : pending.purchaseMode;
    const targetSpeciesId =
      typeof pending === "string" ? undefined : pending.targetSpeciesId;

    let modifierType: any = getModifierTypeById(itemId);

if (typeof modifierType === "function") {
  modifierType = modifierType();
}

if (!modifierType) {
  console.warn("[START_RUN] no modifierType for pendingRunItem", itemId);
  continue;
}

    if (typeof modifierType === "function") {
      modifierType = modifierType();
    }

    if (!purchaseMode) {
  if (modifierType instanceof PokemonHeldItemModifierType) {
    purchaseMode = "SELECT_POKEMON";
  } else {
    purchaseMode = "TRAINER_LOADOUT";
  }
}

    let modifier: any = null;

    if (purchaseMode === "SELECT_POKEMON") {
  const targetPokemon =
    targetSpeciesId != null
      ? party.find(p => p.species.speciesId === targetSpeciesId)
      : party[0];

  if (!targetPokemon) {
    console.warn("[START_RUN] target pokemon not found for pendingRunItem", {
      itemId,
      targetSpeciesId,
    });
    continue;
  }

  if (typeof modifierType?.newModifier === "function") {
    modifier = modifierType.newModifier(targetPokemon);
  } else {
    modifier = modifierType;
  }

  if (
    modifier instanceof PokemonHeldItemModifier &&
    (modifier.pokemonId == null || modifier.pokemonId === -1)
  ) {
    modifier.pokemonId = targetPokemon.id;
  }
} else {
      if (typeof modifierType?.newModifier === "function") {
        modifier = modifierType.newModifier();
      } else {
        modifier = modifierType;
      }
    }

    if (!modifier) {
      console.warn("[START_RUN] failed to create pendingRun modifier for", itemId);
      continue;
    }

    if (modifier.type && !modifier.type.id) {
      modifier.type.id = itemId;
    }

    const result = globalScene.addModifier(modifier, false, true);

    if (!result) {
      console.warn("[START_RUN] failed to add pendingRun modifier for", itemId, modifier);
      continue;
    }

    console.log("[START_RUN] applied pendingRunItem", itemId, modifier);
  }

  globalScene.gameData.pendingRunItems = [];
}

  start() {
    super.start();

    const party = globalScene.getPlayerParty();
    const loadPokemonAssets: Promise<void>[] = [];

    this.starters.forEach((starter: Starter, i: number) => {
      if (!i && Overrides.STARTER_SPECIES_OVERRIDE) {
        starter.speciesId = Overrides.STARTER_SPECIES_OVERRIDE;
      }

      const species = getPokemonSpecies(starter.speciesId);
      let starterFormIndex = starter.formIndex;

      if (
        starter.speciesId in Overrides.STARTER_FORM_OVERRIDES
        && Overrides.STARTER_FORM_OVERRIDES[starter.speciesId] != null
        && species.forms[Overrides.STARTER_FORM_OVERRIDES[starter.speciesId]!]
      ) {
        starterFormIndex = Overrides.STARTER_FORM_OVERRIDES[starter.speciesId]!;
      }

      let starterGender =
        species.malePercent !== null ? (!starter.female ? Gender.MALE : Gender.FEMALE) : Gender.GENDERLESS;

      if (Overrides.GENDER_OVERRIDE !== null) {
        starterGender = Overrides.GENDER_OVERRIDE;
      }

      console.log("[START_RUN_STARTER_VARIANT]", {
  speciesId: starter.speciesId,
  name: species.name,
  shiny: starter.shiny,
  variant: starter.variant,
  formIndex: starter.formIndex,
  starterFormIndex,
});

      const starterPokemon = globalScene.addPlayerPokemon(
        species,
        globalScene.gameMode.getStartingLevel(),
        starter.abilityIndex,
        starterFormIndex,
        starterGender,
        starter.shiny,
        starter.variant,
        starter.ivs,
        starter.nature,
      );

     if ((starter as any).practiceAbilityId !== undefined) {
  const abilityId = (starter as any).practiceAbilityId;

  (starterPokemon as any).practiceAbilityId = abilityId;

  // 실제 getAbility가 반드시 이걸 보게 함
  starterPokemon.customPokemonData.ability = abilityId;

  // 혹시 소환 직후 로직이 summonData를 먼저 보면 이것도 같이
  starterPokemon.summonData.ability = abilityId;

  console.log("[PRACTICE_ABILITY_FORCE_SET]", {
    name: starterPokemon.name,
    abilityId,
    abilityName: starterPokemon.getAbility?.()?.name,
    custom: starterPokemon.customPokemonData.ability,
    summon: starterPokemon.summonData.ability,
  });
}

if ((starter as any).practicePassiveAbilityId !== undefined) {
  (starterPokemon as any).practicePassiveAbilityId = (starter as any).practicePassiveAbilityId;
}

console.log("[PRACTICE_ABILITY_APPLIED_TO_POKEMON]", {
  name: starterPokemon.name,
  ability: (starterPokemon as any).practiceAbilityId,
  passive: (starterPokemon as any).practicePassiveAbilityId,
});

      if (starter.moveset?.length) {
  if (globalScene.gameMode.modeId === GameModes.PRACTICE) {
    starterPokemon.moveset = starter.moveset.map(
      moveId => new PokemonMove(moveId),
    );

    console.log("[PRACTICE_FORCE_MOVESET]", {
      speciesId: starter.speciesId,
      moves: starterPokemon.moveset.map(m => ({
        moveId: m.moveId,
        name: allMoves[m.moveId]?.name,
      })),
    });
  } else {
    starterPokemon.tryPopulateMoveset(starter.moveset);
  }
}

      if (starter.passive) {
        starterPokemon.passive = true;
      }

      starterPokemon.luck = globalScene.gameData.getDexAttrLuck(
        globalScene.gameData.dexData[species.speciesId].caughtAttr,
      );

      if (starter.pokerus) {
        starterPokemon.pokerus = true;
      }

      if (starter.nickname) {
        starterPokemon.nickname = starter.nickname;
      }

      if (starter.teraType != null) {
        starterPokemon.teraType = starter.teraType;
      } else {
        starterPokemon.teraType = starterPokemon.species.type1;
      }

      if (globalScene.gameMode.isSplicedOnly || Overrides.STARTER_FUSION_OVERRIDE) {
        starterPokemon.generateFusionSpecies(true);
      }

      starterPokemon.setVisible(false);

      const chalApplied = applyChallenges(ChallengeType.STARTER_MODIFY, starterPokemon);
      party.push(starterPokemon);

      // 여기서 로그센터 지정 아이템 적용
      // 여기서 로그센터 지정 아이템 적용
this.applyPreRunItems(starter, starterPokemon);

      if (chalApplied) {
        loadPokemonAssets.push(starterPokemon.updateInfo());
      }

      loadPokemonAssets.push(starterPokemon.loadAssets());
    });

    Promise.all(loadPokemonAssets).then(() => {
      SoundFade.fadeOut(globalScene, globalScene.sound.get("menu"), 500, true);
      globalScene.time.delayedCall(500, () => globalScene.playBgm());

      if (globalScene.gameMode.modeId === GameModes.PRACTICE) {
  // 연습모드는 일반 세션 카운트 증가 제외
} else if (globalScene.gameMode.isClassic) {
  globalScene.gameData.gameStats.classicSessionsPlayed++;
} else {
  globalScene.gameData.gameStats.endlessSessionsPlayed++;
}

console.log("[START_RUN] before newBattle", {
  modeId: globalScene.gameMode.modeId,
  currentBattle: globalScene.currentBattle,
  arena: globalScene.arena,
  fieldVisible: globalScene.field?.visible,
});

// ✅ 여기에 넣기
this.applyPendingRunItems();

overrideModifiers();

if (Overrides.HELD_ITEMS_OVERRIDE?.length) {
  overrideHeldItems(party[0]);
}

globalScene.newBattle();

console.log("[START_RUN] after newBattle", {
  currentBattle: globalScene.currentBattle,
  waveIndex: globalScene.currentBattle?.waveIndex,
  battleType: globalScene.currentBattle?.battleType,
  started: globalScene.currentBattle?.started,
  enemyParty: globalScene.currentBattle?.enemyParty,
});

globalScene.arena.init();

console.log("[START_RUN] after arena.init", {
  arenaBiome: globalScene.arena?.biomeType,
  arenaBgVisible: globalScene.arenaBg?.visible,
  arenaEnemyVisible: globalScene.arenaEnemy?.visible,
  arenaPlayerVisible: globalScene.arenaPlayer?.visible,
  fieldVisible: globalScene.field?.visible,
});

globalScene.sessionPlayTime = 0;
globalScene.lastSavePlayTime = 0;

globalScene.getPlayerParty().forEach(p => {
  globalScene.triggerPokemonFormChange(p, SpeciesFormChangeMoveLearnedTrigger);
});

// ✅ 연습모드면 일반 EncounterPhase 대신 대타출동 인형 Phase
if (globalScene.gameMode.modeId === GameModes.PRACTICE) {
  globalScene.phaseManager.pushNew("PracticeEncounterPhase");
}

this.end();
    });
  }
}