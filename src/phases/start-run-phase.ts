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
} from "#modifiers/modifier-type";
import SoundFade from "phaser3-rex-plugins/plugins/soundfade";

export class StartRunPhase extends Phase {
  public readonly phaseName = "StartRunPhase";

  constructor(private starters: Starter[]) {
    super();
  }

  // ✅ 여기 1
  private getModifierTypeForPreRunItem(itemId: string) {
  return modifierTypes[itemId] ?? null;
}

  // ✅ 여기 2
 private applyPreRunItems(starter: Starter, starterPokemon: Pokemon): void {
  const preRunItems = starter.preRunItems ?? [];

  for (const itemId of preRunItems) {
    let modifierType = this.getModifierTypeForPreRunItem(itemId);

    if (!modifierType) {
      console.warn("[START_RUN] no modifierType for", itemId);
      continue;
    }

    if (typeof modifierType === "function") {
      modifierType = modifierType();
    }

    let modifier: any = null;

    // 1) 포켓몬이 지니는 아이템
    if (modifierType instanceof PokemonHeldItemModifierType) {
      modifier = modifierType.newModifier(starterPokemon);

      if (!modifier) {
        console.warn("[START_RUN] failed to create held item modifier for", itemId);
        continue;
      }

      // 저장/로드용 type.id 보정
      if (modifier.type && !modifier.type.id) {
        modifier.type.id = itemId;
      }

      // 혹시 pokemonId가 비어 있으면 보정
      if ("pokemonId" in modifier && (modifier.pokemonId == null || modifier.pokemonId === -1)) {
        modifier.pokemonId = starterPokemon.id;
      }
    }

    // 2) 트레이너/전역 아이템
    else if (typeof modifierType?.newModifier === "function") {
      modifier = modifierType.newModifier();

      if (!modifier) {
        console.warn("[START_RUN] failed to create modifier for", itemId);
        continue;
      }

      if (modifier.type && !modifier.type.id) {
        modifier.type.id = itemId;
      }
    }

    // 3) 이미 modifier 인스턴스인 경우
    else {
      modifier = modifierType;

      if ("pokemonId" in modifier && (modifier.pokemonId == null || modifier.pokemonId === -1)) {
        modifier.pokemonId = starterPokemon.id;
      }

      if (modifier.type && !modifier.type.id) {
        modifier.type.id = itemId;
      }
    }

    const result = globalScene.addModifier(modifier, false, true);

    console.log(
      "[PRERUN_HELD_DEBUG]",
      itemId,
      modifier?.constructor?.name,
      modifier?.type?.id,
      starterPokemon.id,
      result,
      globalScene.findModifiers?.(() => true)?.map(m => ({
        name: m.constructor?.name,
        typeId: m.type?.id,
        pokemonId: (m as any).pokemonId,
        stackCount: (m as any).stackCount,
      })),
    );

    if (!result) {
      console.warn("[START_RUN] failed to add modifier for", itemId, modifier);
      continue;
    }

    console.log("[START_RUN] applied", itemId, "to", starterPokemon.name, modifier);
  }
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

      if (starter.moveset) {
        starterPokemon.tryPopulateMoveset(starter.moveset);
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
      this.applyPreRunItems(starter, starterPokemon);

      if (chalApplied) {
        loadPokemonAssets.push(starterPokemon.updateInfo());
      }

      loadPokemonAssets.push(starterPokemon.loadAssets());
    });

    overrideModifiers();
    overrideHeldItems(party[0]);

    Promise.all(loadPokemonAssets).then(() => {
      SoundFade.fadeOut(globalScene, globalScene.sound.get("menu"), 500, true);
      globalScene.time.delayedCall(500, () => globalScene.playBgm());

      if (globalScene.gameMode.isClassic) {
        globalScene.gameData.gameStats.classicSessionsPlayed++;
      } else {
        globalScene.gameData.gameStats.endlessSessionsPlayed++;
      }

      globalScene.newBattle();
      globalScene.arena.init();
      globalScene.sessionPlayTime = 0;
      globalScene.lastSavePlayTime = 0;

      globalScene.getPlayerParty().forEach(p => {
        globalScene.triggerPokemonFormChange(p, SpeciesFormChangeMoveLearnedTrigger);
      });

      this.end();
    });
  }
}