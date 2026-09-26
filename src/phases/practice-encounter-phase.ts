import { globalScene } from "#app/global-scene";
import { allAbilities, modifierTypes } from "#data/data-lists";
import { BattlerIndex } from "#enums/battler-index";
import { BiomeId } from "#enums/biome-id";
import { FieldPosition } from "#enums/field-position";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { StatusEffect } from "#enums/status-effect";
import { TrainerSlot } from "#enums/trainer-slot";
import { UiMode } from "#enums/ui-mode";
import type { Pokemon } from "#field/pokemon";
import { getModifierTypeById, type ModifierTypeGenerator, PokemonHeldItemModifierType } from "#modifiers/modifier-type";
import { PokemonMove } from "#moves/pokemon-move";
import { BattlePhase } from "#phases/battle-phase";
import { getPokemonSpecies } from "#utils/pokemon-utils";

export class PracticeEncounterPhase extends BattlePhase {
  public readonly phaseName = "PracticeEncounterPhase";

  async start() {
    super.start();

    globalScene.phaseManager.clearPhaseQueue();

    globalScene.newArena(BiomeId.TUTORIAL_ROOM);

    const battle = globalScene.currentBattle as any;

    const battleType = (globalScene.gameData.practiceDummyConfig as any)?.battleType ?? "SINGLE";

    battle.double = battleType === "DOUBLE";

    battle.isPracticeBattle = true;

    // 대타 행동 설정
    battle.skipEnemyBattleTurns = !(globalScene.gameData.practiceDummyConfig?.canAct ?? false);

    // 초기화 로그
    battle.turnCommands = [];
    battle.preTurnCommands = [];
    battle.commandPhase = null;
    battle.cancelledMove = false;
    battle.started = false;
    battle.enemySwitchCounter = 0;

    console.log("[PRACTICE_START]", {
      isPractice: battle.isPracticeBattle,
      canAct: globalScene.gameData.practiceDummyConfig?.canAct,
      skipEnemyBattleTurns: battle.skipEnemyBattleTurns,
      turnCommands: battle.turnCommands?.length,
      preTurnCommands: battle.preTurnCommands?.length,
    });

    console.log("[PRACTICE] battle config", {
      canAct: globalScene.gameData.practiceDummyConfig?.canAct,

      skipEnemyBattleTurns: battle.skipEnemyBattleTurns,

      types: globalScene.gameData.practiceDummyConfig?.types,

      abilityId: globalScene.gameData.practiceDummyConfig?.abilityId,

      passiveId: globalScene.gameData.practiceDummyConfig?.passiveId,

      moveIds: globalScene.gameData.practiceDummyConfig?.moveIds,
    });

    battle.practiceNoRewards = true;
    battle.enemyParty = [];
    battle.seenEnemyPartyMemberIds.clear();

    for (const p of globalScene.getPlayerParty()) {
      p.hp = p.getMaxHp();
      p.status = null;
      p.doSetStatus?.(StatusEffect.NONE);
      p.resetTurnData?.();
      p.updateInfo?.();
    }

    console.log("[PRACTICE_PLAYER_RESTORE]", {
      party: globalScene.getPlayerParty().map((p: any) => ({
        name: p.getName?.(),
        hp: p.hp,
        maxHp: p.getMaxHp?.(),
        fainted: p.isFainted?.(),
        active: p.isActive?.(),
        onField: p.isOnField?.(),
        fieldIndex: p.getFieldIndex?.(),
        battlerIndex: p.getBattlerIndex?.(),
      })),
    });

    const playerParty = globalScene.getPlayerParty();

    if (battle.double && playerParty.length < 2) {
      battle.double = false;
    }

    const player1 = playerParty[0];
    const player2 = battle.double ? playerParty[1] : null;

    const starterCfg = globalScene.gameData.practiceDummyConfig?.starter;

    if (starterCfg && player1) {
      const abilityId = starterCfg.practiceAbilityId ?? starterCfg.abilityId;

      if (abilityId !== undefined) {
        player1.practiceAbilityId = abilityId;
        player1.abilityId = abilityId;
        player1.customPokemonData.ability = abilityId;
        player1.summonData.ability = abilityId;

        player1.getAbility = () => allAbilities[abilityId];
        player1.hasAbility = (id: number) => id === abilityId;
      }

      const passiveId = starterCfg.practicePassiveAbilityId ?? starterCfg.passiveAbilityId ?? starterCfg.passiveId;

      if (passiveId !== undefined) {
        player1.passive = true;
        player1.practicePassiveAbilityId = passiveId;
        player1.practicePassiveId = passiveId;
        player1.passiveAbilityId = passiveId;

        player1.getPassiveAbility = () => allAbilities[passiveId];
        player1.hasPassive = () => true;
      }

      console.log("[PRACTICE_PLAYER_ABILITY_APPLIED]", {
        name: player1.getName?.(),
        abilityId,
        ability: player1.getAbility?.()?.name,
        passiveId,
        passive: player1.getPassiveAbility?.()?.name,
      });
    }

    if (player1) {
      player1.hp = Math.max(1, player1.hp);
      player1.doSetStatus?.(StatusEffect.NONE);
      player1.updateInfo?.();
      player1.setVisible(true);
      player1.setAlpha(1);
      player1.showInfo();

      if (!player1.parentContainer) {
        globalScene.field.add(player1);
      }

      player1?.setFieldPosition(battle.double ? FieldPosition.LEFT : FieldPosition.CENTER, 0);

      if (player2) {
        player2.hp = Math.max(1, player2.hp);
        player2.doSetStatus?.(StatusEffect.NONE);
        player2.updateInfo?.();

        if (!player2.parentContainer) {
          globalScene.field.add(player2);
        }

        player2.setFieldPosition(FieldPosition.RIGHT, 1);
        player2.setVisible(true);
        player2.setAlpha(1);
        player2.getSprite()?.setVisible(true);
        player2.getSprite()?.setAlpha(1);
        player2.playAnim();
        player2.showInfo();
      }
    }
    const dummySpecies = getPokemonSpecies(SpeciesId.WOBBUFFET);

    const dummyLevel = Phaser.Math.Clamp(globalScene.gameData.practiceDummyConfig?.level ?? 1, 1, 999);

    const dummy = globalScene.addEnemyPokemon(dummySpecies, dummyLevel, TrainerSlot.NONE, false, true) as any;

    battle.enemyParty = [dummy];

    battle.practiceDummy = dummy;

    let dummy2: any = null;

    if (battle.double) {
      dummy2 = globalScene.addEnemyPokemon(dummySpecies, dummyLevel, TrainerSlot.NONE, false, true) as any;

      dummy2.isOnField = () => true;
      dummy2.isActive = () => true;
      dummy2.isAllowedInBattle = () => true;
      dummy2.isFainted = () => dummy2.hp <= 0 || dummy2.status?.effect === StatusEffect.FAINT;
      dummy2.isEnemy = () => true;
      dummy2.isPlayer = () => false;
      dummy2.getFieldIndex = () => 1;

      dummy2.canApplyStatus = () => false;
      dummy2.tryApplyStatus = () => false;
      dummy2.doSetStatus = () => {};
      dummy2.setStatus = () => {};
      dummy2.hasStatus = () => false;
      dummy2.getStatus = () => null;

      dummy2.getName = () => "대타출동 인형";
      dummy2.getNameToRender = () => "대타출동 인형";
      dummy2.getNameWithAffix = () => "대타출동 인형";
      dummy2.getNickname = () => "대타출동 인형";
      dummy2.name = "대타출동 인형";
      dummy2.nickname = "대타출동 인형";

      dummy2.isPracticeDummy = true;

      this.applyPracticeDummyConfig(dummy2, "dummy2");

      this.applyPracticeDummyRentalModifiers(dummy2);

      battle.practiceDummy2 = dummy2;

      battle.enemyParty.push(dummy2);

      dummy2.getFieldIndex = () => 1;
    }

    dummy.isPracticeDummy = true;

    this.applyPracticeDummyConfig(dummy, "dummy1");

    this.applyPracticeDummyRentalModifiers(dummy);

    dummy.isOnField = () => true;
    dummy.isActive = () => true;
    dummy.isAllowedInBattle = () => true;
    dummy.isFainted = () => dummy.hp <= 0 || dummy.status?.effect === StatusEffect.FAINT;
    dummy.isEnemy = () => true;
    dummy.isPlayer = () => false;
    dummy.setFieldPosition(battle.double ? FieldPosition.LEFT : FieldPosition.CENTER, 0);

    if (dummy2) {
      dummy2.setFieldPosition(FieldPosition.RIGHT, 1);
    }

    dummy.showInfo?.();
    dummy2?.showInfo?.();

    if (battle.practiceDummy2) {
      battle.practiceDummy2.setFieldPosition(FieldPosition.RIGHT, 1);
    }

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
    dummy.isBoss = () => !!dummy.getPassiveAbility?.();

    if (!globalScene.gameData.practiceDummyConfig?.baseStats) {
      dummy.hp = 999;
      dummy.maxHp = 999;
      dummy.stats = [999, 255, 255, 255, 255, 255];
    }

    Promise.all([dummy.loadAssets(), dummy2 ? dummy2.loadAssets() : Promise.resolve()]).then(() => {
      const setupPracticeDummySprite = (
        target: any,
        battlerIndex: BattlerIndex,
        fieldIndex: number,
        position: FieldPosition,
      ) => {
        target.isPracticeDummy = true;

        target.isEnemy = () => true;
        target.isPlayer = () => false;
        target.isOnEnemySide = () => true;
        target.isOnPlayerSide = () => false;
        target.isOnField = () => true;
        target.isActive = () => true;
        target.isAllowedInBattle = () => true;

        target.getFieldIndex = () => fieldIndex;
        target.getBattlerIndex = () => battlerIndex;

        target.fieldSetup(true);

        if (!target.parentContainer) {
          globalScene.field.add(target);
        }

        const subSprite = globalScene.add.sprite(0, 0, "pkmn__sub");
        subSprite.setFrame(0);
        subSprite.stop();
        subSprite.setScale(1);
        subSprite.setOrigin(0.5, 1);
        subSprite.setVisible(true);
        subSprite.setAlpha(1);

        target.add(subSprite);
        target.dummySprite = subSprite;

        target.getSprite = () => target.dummySprite;
        target.getSpriteKey = () => "pkmn__sub";
        target.getBattleSpriteKey = () => "pkmn__sub";

        const keepVisible = () => {
          target.setVisible(true);
          target.setAlpha(1);

          target.children?.each?.((child: any) => {
            if (child !== target.dummySprite) {
              child.setVisible?.(false);
              child.setAlpha?.(0);
            }
          });

          target.dummySprite?.setPosition(0, 0);
          target.dummySprite?.setVisible(true);
          target.dummySprite?.setAlpha(1);
        };

        const originalPlayAnim = target.playAnim?.bind(target);
        target.playAnim = (...args: any[]) => {
          const ret = originalPlayAnim?.(...args);
          keepVisible();
          return ret;
        };

        const originalTint = target.tint?.bind(target);
        target.tint = (...args: any[]) => {
          const ret = originalTint?.(...args);
          keepVisible();
          return ret;
        };

        const originalClearTint = target.clearTint?.bind(target);
        target.clearTint = (...args: any[]) => {
          const ret = originalClearTint?.(...args);
          keepVisible();
          return ret;
        };

        target.setFieldPosition(position, fieldIndex);
        keepVisible();

        target.updateInfo?.();
        target.showInfo?.();

        battle.seenEnemyPartyMemberIds.add(target.id);
      };

      setupPracticeDummySprite(dummy, BattlerIndex.ENEMY, 0, battle.double ? FieldPosition.LEFT : FieldPosition.CENTER);

      if (dummy2) {
        setupPracticeDummySprite(dummy2, BattlerIndex.ENEMY_2, 1, FieldPosition.RIGHT);
      }

      globalScene.setFieldScale(1);

      const currentPlayerPokemon = globalScene.getPlayerPokemon();
      if (currentPlayerPokemon?.isOnField()) {
        globalScene.field.moveBelow(dummy, currentPlayerPokemon);
        if (dummy2) {
          globalScene.field.moveBelow(dummy2, currentPlayerPokemon);
        }
      }

      const enemyField = globalScene.getEnemyField();

      // 여기부터 기존 arena/tween/onComplete 코드는 이어서 유지

      globalScene.arenaPlayer.setVisible(true);
      globalScene.arenaPlayer.setAlpha(1);
      globalScene.arenaPlayer.setVisible(true);
      globalScene.arenaPlayer.setAlpha(1);

      if (battle.double) {
        globalScene.arenaPlayer.setPosition(0, 0);
      } else {
        globalScene.arenaPlayer.setPosition(300, 0);
      }
      globalScene.arenaEnemy.setVisible(true);
      globalScene.arenaEnemy.setAlpha(1);
      globalScene.arenaEnemy.setPosition(-280, 0);

      globalScene.arenaNextEnemy.setVisible(false);
      globalScene.arenaPlayerTransition.setVisible(false);
      globalScene.arenaBgTransition.setVisible(false);

      globalScene.tweens.add({
        targets: [globalScene.arenaEnemy, globalScene.arenaPlayer].flat(),

        x: (_target, _key, value, fieldIndex: number) =>
          fieldIndex < 1 + enemyField.length ? value + 300 : value - 300,

        duration: 2000,

        onComplete: () => {
          globalScene.arenaPlayer.setVisible(true);
          globalScene.arenaPlayer.setAlpha(1);

          if (battle.double) {
            globalScene.arenaPlayer.setPosition(0, 0);
          }
          globalScene.arenaEnemy.setVisible(true);
          globalScene.arenaEnemy.setAlpha(1);

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

  private applyPracticeDummyRentalModifiers(dummy: Pokemon, dummyKey: "dummy1" | "dummy2"): void {
    const config = globalScene.gameData.practiceDummyConfig as any;
    const rentals = config?.rentalModifiers ?? [];

    if (rentals.length === 0) {
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
        globalScene.givePracticeRentalModifierType(dummy, modifierType, 1);
      }
    }

    config.rentalModifiers = validRentals;
    globalScene.gameData.saveSystem();

    // ★ dummy에도 직접 연결
    (dummy as any).practiceRentalModifiers = (globalScene as any).practiceRentalModifiers ?? [];

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
      const gen = modifierTypes
        .TYPE_SPECIFIC_MOVE_BOOSTER()
        .withIdFromFunc(modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER) as ModifierTypeGenerator;

      modifierType = gen.generateType([], [moveType]);

      return modifierType instanceof PokemonHeldItemModifierType ? modifierType : null;
    }

    const attackTypeMatch = itemId.match(/^ATTACK_TYPE_BOOSTER_(\d+)$/);
    if (attackTypeMatch) {
      const moveType = Number(attackTypeMatch[1]) as PokemonType;
      const gen = modifierTypes
        .ATTACK_TYPE_BOOSTER()
        .withIdFromFunc(modifierTypes.ATTACK_TYPE_BOOSTER) as ModifierTypeGenerator;

      modifierType = gen.generateType([], [moveType]);

      return modifierType instanceof PokemonHeldItemModifierType ? modifierType : null;
    }

    return null;
  }

  private applyPracticeDummyConfig(dummy: Pokemon, dummyKey: "dummy1" | "dummy2"): void {
    const rootCfg = globalScene.gameData.practiceDummyConfig;

    const cfg = {
      ...(rootCfg ?? {}),
      ...((rootCfg as any)?.[dummyKey] ?? {}),
    };

    if (!cfg) {
      return;
    }

    if (typeof cfg.level === "number") {
      dummy.level = Phaser.Math.Clamp(cfg.level, 1, 999);
      dummy.calculateStats?.();
      dummy.updateInfo?.();
    }

    if (cfg.baseStats) {
      dummy.stats = [
        cfg.baseStats.hp ?? 999,
        cfg.baseStats.atk ?? 255,
        cfg.baseStats.def ?? 255,
        cfg.baseStats.spa ?? 255,
        cfg.baseStats.spd ?? 255,
        cfg.baseStats.spe ?? 255,
      ];

      dummy.maxHp = dummy.stats[0];
      dummy.hp = dummy.maxHp;
    }

    if (Array.isArray(cfg.types)) {
      dummy.getTypes = () => cfg.types;
    }

    const abilityId = (cfg as any).practiceAbilityId ?? (cfg as any).abilityId;

    if (abilityId !== undefined) {
      dummy.practiceAbilityId = abilityId;
      dummy.abilityId = abilityId;
      dummy.customPokemonData.ability = abilityId;
      dummy.summonData.ability = abilityId;

      dummy.getAbility = () => allAbilities[abilityId];
      dummy.hasAbility = (id: number) => id === abilityId;
    }

    const passiveId =
      (cfg as any).practicePassiveAbilityId
      ?? (cfg as any).practicePassiveId
      ?? (cfg as any).passiveAbilityId
      ?? (cfg as any).passiveId;

    if (passiveId !== undefined) {
      dummy.passive = true;

      dummy.practicePassiveAbilityId = passiveId;
      dummy.practicePassiveId = passiveId;
      dummy.passiveAbilityId = passiveId;

      dummy.getPassiveAbility = () => allAbilities[passiveId];
      dummy.hasPassive = () => true;
    }

    const moveIds = (
      Array.isArray(cfg.moveIds) && cfg.moveIds.length > 0 ? cfg.moveIds : [MoveId.TACKLE, MoveId.SPLASH]
    ).filter((moveId: MoveId) => moveId !== MoveId.NONE);

    dummy.moveset = moveIds.map((moveId: MoveId) => new PokemonMove(moveId));

    console.log("[PRACTICE_DUMMY_MOVESET_APPLIED]", {
      dummyKey,
      moveIds,
      moveset: dummy.moveset.map((m: any) => m.moveId),
    });

    if (cfg.name) {
      dummy.name = cfg.name;
      dummy.nickname = cfg.name;
      dummy.getName = () => cfg.name;
      dummy.getNameToRender = () => cfg.name;
      dummy.getNameWithAffix = () => cfg.name;
      dummy.getNickname = () => cfg.name;
    }

    (dummy as any).practiceMoveCursor = 0;

    (dummy as any).getNextMoveIndex = () => {
      const usableMoves = dummy.moveset
        .map((m: any, index: number) => ({ m, index }))
        .filter(({ m }: any) => m && m.moveId !== MoveId.NONE);

      if (usableMoves.length === 0) {
        return 0;
      }

      const selected = usableMoves[(dummy as any).practiceMoveCursor % usableMoves.length];

      (dummy as any).practiceMoveCursor++;

      console.log("[PRACTICE_DUMMY_NEXT_MOVE]", {
        dummyKey,
        selectedIndex: selected.index,
        moveId: selected.m.moveId,
      });

      return selected.index;
    };
  }
}
