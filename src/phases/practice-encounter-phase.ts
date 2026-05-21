import { globalScene } from "#app/global-scene";
import { BiomeId } from "#enums/biome-id";
import { FieldPosition } from "#enums/field-position";
import { SpeciesId } from "#enums/species-id";
import { TrainerSlot } from "#enums/trainer-slot";
import type { Pokemon } from "#field/pokemon";
import { BattlePhase } from "#phases/battle-phase";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import { PostSummonActivateAbilityPhase } from "#phases/post-summon-activate-ability-phase";
import { allAbilities } from "#data/data-lists";
import { UiMode } from "#enums/ui-mode";
import { MoveId } from "#enums/move-id";
import { PokemonMove } from "#moves/pokemon-move";
import { ModifierTypeGenerator, getModifierTypeById, PokemonHeldItemModifierType } from "#modifiers/modifier-type";
import { allMoves, allSpecies, biomeDepths, modifierTypes } from "#data/data-lists";

export class PracticeEncounterPhase extends BattlePhase {
  public readonly phaseName = "PracticeEncounterPhase";

  start() {
    super.start();

    globalScene.phaseManager.clearPhaseQueue(true);

    const battle = globalScene.currentBattle as any;

    battle.isPracticeBattle = true;
    battle.skipEnemyBattleTurns =
  !(globalScene.gameData.practiceDummyConfig?.canAct ?? false);

console.log("[PRACTICE] battle config", {
  canAct:
    globalScene.gameData.practiceDummyConfig?.canAct,

  skipEnemyBattleTurns:
    battle.skipEnemyBattleTurns,

  types:
    globalScene.gameData.practiceDummyConfig?.types,

  abilityId:
    globalScene.gameData.practiceDummyConfig?.abilityId,

  passiveId:
    globalScene.gameData.practiceDummyConfig?.passiveId,

  moveIds:
    globalScene.gameData.practiceDummyConfig?.moveIds,
});

battle.practiceNoRewards = true;
    battle.enemyParty = [];
    battle.seenEnemyPartyMemberIds.clear();

    const playerPokemon = globalScene.getPlayerPokemon() as Pokemon | undefined;

    if (playerPokemon) {
      if (!playerPokemon.parentContainer) {
        globalScene.field.add(playerPokemon);
      }

      playerPokemon.setFieldPosition(FieldPosition.CENTER, 0);
      playerPokemon.setVisible(true);
      playerPokemon.setAlpha(1);
      playerPokemon.getSprite()?.setVisible(true);
      playerPokemon.playAnim();
      playerPokemon.showInfo();
    }

    const dummySpecies = getPokemonSpecies(SpeciesId.WOBBUFFET);

    const dummyLevel =
  Phaser.Math.Clamp(globalScene.gameData.practiceDummyConfig?.level ?? 1, 1, 999);

const dummy = globalScene.addEnemyPokemon(
  dummySpecies,
  dummyLevel,
  TrainerSlot.NONE,
  false,
  true,
) as any;

    battle.enemyParty = [dummy];
battle.practiceDummy = dummy;

dummy.isPracticeDummy = true;

this.applyPracticeDummyConfig(dummy);
this.applyPracticeDummyRentalModifiers(dummy);

console.log("[DUMMY_ID]", dummy.id);

console.log(
  "[DUMMY_RENTALS_DIRECT]",
  (globalScene as any).practiceRentalModifiers?.map((m: any) => ({
    pokemonId: m.pokemonId,
    type: m.type?.id,
    ctor: m.constructor.name,
  })),
);

console.log("[DUMMY_BST]", {
  hp: dummy.getMaxHp?.(),
  atk: dummy.getStat?.(1),
  def: dummy.getStat?.(2),
  spa: dummy.getStat?.(3),
  spd: dummy.getStat?.(4),
  spe: dummy.getStat?.(5),
  rawStats: dummy.stats,
});

console.log("[PRACTICE_DUMMY_FINAL]", {
  level: dummy.level,
  types: dummy.getTypes?.(),
  ability: dummy.getAbility?.()?.name,
  passive: dummy.getPassiveAbility?.()?.name,
  moves: dummy.moveset?.map((m: any) => m?.getName?.()),
});

    dummy.isOnField = () => true;
    dummy.isActive = () => true;
    dummy.isAllowedInBattle = () => true;
    dummy.isFainted = () => false;
    dummy.isEnemy = () => true;
    dummy.isPlayer = () => false;
    dummy.getFieldIndex = () => 0;

    dummy.canApplyStatus = () => false;
    dummy.tryApplyStatus = () => false;
    dummy.doSetStatus = () => {};
    dummy.setStatus = () => {};
    dummy.hasStatus = () => false;
    dummy.getStatus = () => null;
    dummy.setFrameRate = () => {};

    dummy.getName = () => "대타출동 인형";
    dummy.getNameToRender = () => "대타출동 인형";
    dummy.getNameWithAffix = () => "대타출동 인형";
    dummy.getNickname = () => "대타출동 인형";
    dummy.name = "대타출동 인형";
    dummy.nickname = "대타출동 인형";

    dummy.addFriendship = () => {};
    dummy.addExp = () => {};
    dummy.getExpValue = () => 0;
    dummy.getBattleStatExp = () => 0;

    dummy.faintCry = (callback?: () => void) => {
      callback?.();
      return { totalDuration: 0 };
    };

    dummy.cry = (callback?: () => void) => {
      callback?.();
      return { totalDuration: 0 };
    };

    dummy.isShiny = () => false;
    dummy.isBoss = () => false;

    if (!globalScene.gameData.practiceDummyConfig?.baseStats) {
  dummy.hp = 999;
  dummy.maxHp = 999;
  dummy.stats = [999, 255, 255, 255, 255, 255];
}

    dummy.loadAssets().then(() => {
      dummy.setX(-66 + dummy.getFieldPositionOffset()[0]);
      dummy.fieldSetup(true);

      globalScene.setFieldScale(1);

      if (!dummy.parentContainer) {
        globalScene.field.add(dummy);
      }

      battle.seenEnemyPartyMemberIds.add(dummy.id);

      const currentPlayerPokemon = globalScene.getPlayerPokemon();
      if (currentPlayerPokemon?.isOnField()) {
        globalScene.field.moveBelow(dummy, currentPlayerPokemon);
      }

      dummy.species.name = "대타출동 인형";

      const dummySprite = globalScene.add.sprite(0, 0, "pkmn__sub");
dummySprite.setFrame(0);
dummySprite.stop();
dummySprite.setScale(1);
dummySprite.setOrigin(0.5, 1);
dummySprite.setVisible(true);
dummySprite.setAlpha(1);

dummy.add(dummySprite);
dummy.dummySprite = dummySprite;

const originalGetSprite = dummy.getSprite?.bind(dummy);

dummy.getSprite = () => dummy.dummySprite;
dummy.getSpriteKey = () => "pkmn__sub";
dummy.getBattleSpriteKey = () => "pkmn__sub";

const hideRealDummySprites = () => {
  dummy.setVisible(true);
  dummy.setAlpha(1);

  dummy.children?.each?.((child: any) => {
    if (child !== dummy.dummySprite) {
      child.setVisible?.(false);
      child.setAlpha?.(0);
    }
  });

  dummy.dummySprite?.setPosition(0, 0);
  dummy.dummySprite?.setVisible(true);
  dummy.dummySprite?.setAlpha(1);
};

      hideRealDummySprites();

      const originalPlayAnim = dummy.playAnim?.bind(dummy);
      dummy.playAnim = (...args: any[]) => {
        const ret = originalPlayAnim?.(...args);
        hideRealDummySprites();
        return ret;
      };

      const originalTint = dummy.tint?.bind(dummy);
      dummy.tint = (...args: any[]) => {
        const ret = originalTint?.(...args);
        hideRealDummySprites();
        return ret;
      };

      const originalClearTint = dummy.clearTint?.bind(dummy);
      dummy.clearTint = (...args: any[]) => {
        const ret = originalClearTint?.(...args);
        hideRealDummySprites();
        return ret;
      };

      const enemyField = globalScene.getEnemyField();

      globalScene.tweens.add({
        targets: [
          globalScene.arenaEnemy,
          enemyField,
          globalScene.arenaPlayer,
        ].flat(),
        x: (_target, _key, value, fieldIndex: number) =>
          fieldIndex < 1 + enemyField.length ? value + 300 : value - 300,
        duration: 2000,
        onComplete: () => {
  hideRealDummySprites();

  dummy.showInfo();
  battle.started = true;
  battle.waveIndex = 1;
  globalScene.arena.biomeType = BiomeId.TUTORIAL_ROOM;

  (globalScene as any).biomeWaveText?.setText?.(`연습장 - ${battle.waveIndex}`);
  (globalScene as any).biomeWaveText?.setVisible?.(true);
  (globalScene as any).biomeWaveText?.setAlpha?.(1);

  globalScene.moneyText?.setVisible?.(true);
  globalScene.roguePointText?.setVisible?.(true);

  globalScene.updateUIPositions?.();

globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
  globalScene.ui.showText(
    "대타출동 인형이 나타났다!",
    null,
    () => {
      globalScene.phaseManager.pushNew("PracticeDummySummonPhase", dummy);
      this.end();
    },
    1500,
    true,
  );
});
},
      });
    });
}

private applyPracticeDummyRentalModifiers(dummy: Pokemon): void {
  const config = globalScene.gameData.practiceDummyConfig as any;
  const rentals = config?.rentalModifiers ?? [];

  if (!rentals.length) {
    return;
  }

  // 연습장 시작 시 초기화
  (globalScene as any).practiceRentalModifiers = [];

  const validRentals: any[] = [];

  for (const rental of rentals) {
    const modifierType = this.resolvePracticeRentalModifierType(rental.itemId);

    if (!(modifierType instanceof PokemonHeldItemModifierType)) {
      console.warn("[PRACTICE_DUMMY_RENTAL_INVALID_REMOVED]", rental);
      continue;
    }

    validRentals.push(rental);

    for (let i = 0; i < (rental.quantity ?? 1); i++) {
      globalScene.givePracticeRentalModifierType(
        dummy,
        modifierType,
        1,
      );
    }
  }

  config.rentalModifiers = validRentals;
  globalScene.gameData.saveSystem();

  // ★ dummy에도 직접 연결
  (dummy as any).practiceRentalModifiers =
    (globalScene as any).practiceRentalModifiers ?? [];

  console.log("[DUMMY_MODS_SET]", {
    dummyId: dummy.id,
    mods: (dummy as any).practiceRentalModifiers.map((m: any) => ({
      pokemonId: m.pokemonId,
      type: m.type?.id,
      ctor: m.constructor.name,
    })),
  });

  console.log("[PRACTICE_DUMMY_RENTALS_APPLIED]", validRentals);
}

private resolvePracticeRentalModifierType(itemId: string): PokemonHeldItemModifierType | null {
  let modifierType = getModifierTypeById(itemId);

  if (modifierType instanceof PokemonHeldItemModifierType) {
    return modifierType;
  }

  const typeSpecificMatch = itemId.match(/^TYPE_SPECIFIC_MOVE_BOOSTER_(\d+)$/);
  if (typeSpecificMatch) {
    const moveType = Number(typeSpecificMatch[1]) as PokemonType;
    const gen = modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER()
      .withIdFromFunc(modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER) as ModifierTypeGenerator;

    modifierType = gen.generateType([], [moveType]);

    return modifierType instanceof PokemonHeldItemModifierType
      ? modifierType
      : null;
  }

  const attackTypeMatch = itemId.match(/^ATTACK_TYPE_BOOSTER_(\d+)$/);
  if (attackTypeMatch) {
    const moveType = Number(attackTypeMatch[1]) as PokemonType;
    const gen = modifierTypes.ATTACK_TYPE_BOOSTER()
      .withIdFromFunc(modifierTypes.ATTACK_TYPE_BOOSTER) as ModifierTypeGenerator;

    modifierType = gen.generateType([], [moveType]);

    return modifierType instanceof PokemonHeldItemModifierType
      ? modifierType
      : null;
  }

  return null;
}

private applyPracticeDummyConfig(dummy: any): void {
    const config = globalScene.gameData.practiceDummyConfig;

    if (!config) {
      return;
    }

    if (typeof config.level === "number") {
  dummy.level = Phaser.Math.Clamp(config.level, 1, 999);

  dummy.calculateStats?.();
  dummy.updateInfo?.();
}

    if (config.baseStats) {
      dummy.stats = [
        config.baseStats.hp ?? 999,
        config.baseStats.atk ?? 255,
        config.baseStats.def ?? 255,
        config.baseStats.spa ?? 255,
        config.baseStats.spd ?? 255,
        config.baseStats.spe ?? 255,
      ];

      dummy.maxHp = dummy.stats[0];
      dummy.hp = dummy.maxHp;
    }

    if (Array.isArray(config.types)) {
      dummy.getTypes = () => config.types;
    }

    if (config.abilityId !== undefined) {
  dummy.abilityId = config.abilityId;
  dummy.getAbility = () => allAbilities[config.abilityId];
  dummy.hasAbility = (abilityId: number) => config.abilityId === abilityId;
}

if (config.passiveAbilityId !== undefined) {
  dummy.passiveAbilityId = config.passiveAbilityId;
  dummy.getPassiveAbility = () => allAbilities[config.passiveAbilityId];
  dummy.hasPassive = () => true;
}

const moveIds =
  config.moveIds?.length
    ? config.moveIds
    : [
        MoveId.TACKLE,
        MoveId.SPLASH,
        MoveId.NONE,
        MoveId.NONE,
      ];

dummy.moveset = moveIds.map(moveId => new PokemonMove(moveId));

    if (config.name) {
      dummy.name = config.name;
      dummy.nickname = config.name;
      dummy.getName = () => config.name;
      dummy.getNameToRender = () => config.name;
      dummy.getNameWithAffix = () => config.name;
      dummy.getNickname = () => config.name;
    }
  }
}