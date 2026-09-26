import { globalScene } from "#app/global-scene";
import Overrides from "#app/overrides";
import { Phase } from "#app/phase";
import { allAbilities, allMoves, modifierTypes } from "#data/data-lists";
import { SpeciesFormChangeMoveLearnedTrigger } from "#data/form-change-triggers";
import { Gender } from "#data/gender";
import { BiomeId } from "#enums/biome-id";
import { ChallengeType } from "#enums/challenge-type";
import { GameModes } from "#enums/game-modes";
import { MarkId } from "#enums/mark-id";
import { PokeballType } from "#enums/pokeball";
import type { PokemonType } from "#enums/pokemon-type";
import { overrideHeldItems, overrideModifiers, PokemonHeldItemModifier } from "#modifiers/modifier";
import {
  getModifierTypeById,
  type ModifierType,
  type ModifierTypeGenerator,
  PokemonHeldItemModifierType,
} from "#modifiers/modifier-type";
import { PokemonMove } from "#moves/pokemon-move";
import type { Starter } from "#types/save-data";
import { applyChallenges } from "#utils/challenge-utils";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import SoundFade from "phaser3-rex-plugins/plugins/soundfade";

export class StartRunPhase extends Phase {
  public readonly phaseName = "StartRunPhase";

  constructor(private starters: Starter[]) {
    super();
  }

  private resolvePreRunModifierType(itemId: string): any {
    let modifierType: any = getModifierTypeById(itemId);

    if (typeof modifierType === "function") {
      modifierType = modifierType();
    }

    if (modifierType) {
      return modifierType;
    }

    const typeSpecificMatch = itemId.match(/^TYPE_SPECIFIC_MOVE_BOOSTER_(\d+)$/);

    if (typeSpecificMatch) {
      const moveType = Number(typeSpecificMatch[1]) as PokemonType;

      const gen = modifierTypes
        .TYPE_SPECIFIC_MOVE_BOOSTER()
        .withIdFromFunc(modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER) as ModifierTypeGenerator;

      return gen.generateType([], [moveType]);
    }

    const attackTypeMatch = itemId.match(/^ATTACK_TYPE_BOOSTER_(\d+)$/);

    if (attackTypeMatch) {
      const moveType = Number(attackTypeMatch[1]) as PokemonType;

      const gen = modifierTypes
        .ATTACK_TYPE_BOOSTER()
        .withIdFromFunc(modifierTypes.ATTACK_TYPE_BOOSTER) as ModifierTypeGenerator;

      return gen.generateType([], [moveType]);
    }

    const direct = (modifierTypes as any)[itemId];

    if (typeof direct === "function") {
      const generated = direct();
      if (generated) {
        return generated;
      }
    }

    if (direct) {
      return direct;
    }

    return null;
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

      const itemId = typeof raw === "string" ? raw : ((raw as any).itemId ?? (raw as any).id);

      if (!itemId) {
        console.warn("[START_RUN] preRun item has no itemId", raw);
        continue;
      }

      let modifierType: any =
        typeof raw !== "string" && typeof (raw as any).newModifier === "function"
          ? raw
          : this.resolvePreRunModifierType(itemId);

      if (typeof modifierType === "function") {
        modifierType = modifierType();
      }

      if (!modifierType && typeof raw !== "string") {
        modifierType = raw;
      }

      console.log("[PRERUN_ITEM_RESOLVE]", {
        raw,
        itemId,
        modifierTypeId: modifierType?.id,
        ctor: modifierType?.constructor?.name,
      });

      if (!modifierType?.newModifier) {
        console.warn("[START_RUN] cannot resolve preRun item", {
          raw,
          itemId,
          resolved: modifierType,
        });
        continue;
      }

      let modifier: any = null;

      if (modifierType instanceof PokemonHeldItemModifierType) {
        modifier = modifierType.newModifier(starterPokemon);

        if (modifier && "pokemonId" in modifier && (modifier.pokemonId == null || modifier.pokemonId === -1)) {
          modifier.pokemonId = starterPokemon.id;
        }
      } else {
        modifier = modifierType.newModifier();
      }

      const result = globalScene.addModifier(modifier, false, true);

      console.log("[PRERUN_HELD_DEBUG]", {
        raw,
        itemId,
        modifier: modifierType.id,
        pokemon: starterPokemon.name,
        pokemonId: starterPokemon.id,
        result,
      });
    }
  }

  private applyPendingRunItems(): void {
    const pendingRunItems = (globalScene.gameData.pendingRunItems ?? []) as Array<
      | string
      | {
          itemId: string;
          purchaseMode?: "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT";
          targetSpeciesId?: number;
        }
    >;

    console.log("[START_RUN] pendingRunItems", globalScene.gameData.pendingRunItems);

    const party = globalScene.getPlayerParty();

    for (const pending of pendingRunItems) {
      const itemId = typeof pending === "string" ? pending : pending.itemId;

      let purchaseMode = typeof pending === "string" ? undefined : pending.purchaseMode;

      const targetSpeciesId = typeof pending === "string" ? undefined : pending.targetSpeciesId;

      // ★ 몬스터볼류 특별 처리
      if (itemId.startsWith("BALL_")) {
        const ballTypeValue = Number(itemId.substring(5));

        if (!Number.isNaN(ballTypeValue) && PokeballType[ballTypeValue] !== undefined) {
          const ballType = ballTypeValue as PokeballType;

          globalScene.pokeballCounts[ballType] = (globalScene.pokeballCounts[ballType] ?? 0) + 1;

          console.log("[START_RUN_POKEBALL_APPLIED]", {
            itemId,
            ballType,
            count: globalScene.pokeballCounts[ballType],
          });
        } else {
          console.warn("[START_RUN_INVALID_POKEBALL]", itemId);
        }

        continue;
      }

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
          targetSpeciesId != null ? party.find(p => p.species.speciesId === targetSpeciesId) : party[0];

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

        if (modifier instanceof PokemonHeldItemModifier && (modifier.pokemonId == null || modifier.pokemonId === -1)) {
          modifier.pokemonId = targetPokemon.id;
        }
      } else if (typeof modifierType?.newModifier === "function") {
        modifier = modifierType.newModifier();
      } else {
        modifier = modifierType;
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

    console.log(
      "[START_RUN_PRESET]",
      this.starters.map(s => ({
        speciesId: s.speciesId,
        items: s.preRunItems,
      })),
    );

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

      starterPokemon.mark = starter.mark ?? MarkId.NONE;

      if ((starter as any).practiceAbilityId !== undefined) {
        const abilityId = (starter as any).practiceAbilityId;

        (starterPokemon as any).practiceAbilityId = abilityId;
        (starterPokemon as any).abilityId = abilityId;

        starterPokemon.customPokemonData.ability = abilityId;
        starterPokemon.summonData.ability = abilityId;

        starterPokemon.getAbility = () => allAbilities[abilityId];
        starterPokemon.hasAbility = (id: number) => id === abilityId;
      }

      const practicePassiveId =
        (starter as any).practicePassiveAbilityId
        ?? (starter as any).practicePassiveId
        ?? (starter as any).passiveAbilityId
        ?? (starter as any).passiveId;

      if (practicePassiveId !== undefined) {
        const passiveId = practicePassiveId;

        starterPokemon.passive = true;

        starterPokemon.customPokemonData.passive = passiveId;

        (starterPokemon as any).practicePassiveAbilityId = passiveId;
        (starterPokemon as any).practicePassiveId = passiveId;
        (starterPokemon as any).passiveAbilityId = passiveId;

        starterPokemon.getPassiveAbility = () => allAbilities[passiveId];

        starterPokemon.hasPassive = () => true;

        console.log("[PRACTICE_PASSIVE_FORCE_SET]", {
          pokemon: starterPokemon.name,
          passiveId,
          passiveName: starterPokemon.getPassiveAbility?.()?.name,
          passiveFlag: starterPokemon.passive,
          customPassive: starterPokemon.customPokemonData.passive,
        });
      }

      console.log("[PRACTICE_ABILITY_APPLIED_TO_POKEMON]", {
        name: starterPokemon.name,
        ability: (starterPokemon as any).practiceAbilityId,
        abilityName: starterPokemon.getAbility?.()?.name,
        passiveAbilityId: (starterPokemon as any).practicePassiveAbilityId,
        passiveId: (starterPokemon as any).practicePassiveId,
        passiveName: starterPokemon.getPassiveAbility?.()?.name,
      });

      if (starter.moveset?.length > 0) {
        if (globalScene.gameMode.modeId === GameModes.PRACTICE) {
          starterPokemon.moveset = starter.moveset.map(moveId => new PokemonMove(moveId));

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

      if (Overrides.HELD_ITEMS_OVERRIDE?.length > 0) {
        overrideHeldItems(party[0]);
      }

      // StartRunPhase 안에서
      if (globalScene.gameMode.modeId === GameModes.PRACTICE) {
        globalScene.newArena(BiomeId.TUTORIAL_ROOM);
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
