import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { modifierTypes } from "#data/data-lists";
import { kecleonShopManager } from "#data/kecleon-shop/kecleon-shop-manager";
import { CustomPokemonData } from "#data/pokemon-data";
import { AbilityId } from "#enums/ability-id";
import { BattleType } from "#enums/battle-type";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { TrainerSlot } from "#enums/trainer-slot";
import { PokemonHeldItemModifier } from "#modifiers/modifier";
import {
  getEnemyModifierTypesForWave,
  type PokemonHeldItemModifierType,
  regenerateModifierPoolThresholds,
} from "#modifiers/modifier-type";
import { PokemonMove } from "#moves/pokemon-move";
import { randSeedInt } from "#utils/common";
import { getPokemonSpecies } from "#utils/pokemon-utils";

/**
 * 캘리몬 도둑질 추격전의 각 층을 준비하는 Phase.
 *
 * - 일반 야생 포켓몬 대신 캘리몬 6마리를 생성
 * - 첫 캘리몬만 전투에 등장
 * - 나머지 5마리는 FaintPhase -> SwitchSummonPhase를 통해 순차 등장
 * - 6마리를 전부 쓰러뜨린 뒤에만 다음 층으로 진행
 */
export class KecleonTheftBattlePhase extends Phase {
  public readonly phaseName = "KecleonTheftBattlePhase";

  public override start(): void {
    super.start();

    const battle = globalScene.currentBattle;
    const wave = battle.waveIndex;

    console.log("[KECLEON_THEFT_BATTLE_PHASE_START]", {
      wave,
      startWave: kecleonShopManager.getTheftStartWave(),
      endWave: kecleonShopManager.getTheftEndWave(),
    });

    globalScene.trainer.setVisible(false);

    if (globalScene.lastEnemyTrainer) {
      globalScene.lastEnemyTrainer.setVisible(false);
    }

    /*
     * 추격전 범위가 아니면 일반 전투로 복귀
     */
    if (!kecleonShopManager.isTheftChaseWave(wave)) {
      console.warn("[KECLEON_THEFT_BATTLE_INVALID_WAVE]", {
        wave,
        startWave: kecleonShopManager.getTheftStartWave(),
        endWave: kecleonShopManager.getTheftEndWave(),
      });

      globalScene.phaseManager.clearPhaseQueue(true);
      globalScene.phaseManager.unshiftNew("EncounterPhase");

      super.end();
      return;
    }

    /*
     * ★ 리셋/세션 로드로 이미 캘리몬 6마리가 복원된 경우
     * 다시 생성하지 않고 그대로 전투 재개
     */
    const restoredKecleonBattle =
      battle.enemyParty?.length === 6
      && battle.enemyParty.every(pokemon => pokemon.species.speciesId === SpeciesId.KECLEON);

    if (restoredKecleonBattle) {
      console.log("[KECLEON_THEFT_BATTLE_RESTORED]", {
        wave,
        count: battle.enemyParty.length,
      });

      battle.battleType = BattleType.WILD;
      battle.double = false;

      for (const kecleon of battle.enemyParty) {
        if (!Array.isArray(kecleon.customBaseStats) || kecleon.customBaseStats.length !== 6) {
          this.restoreTheftKecleonData(kecleon);
        }

        this.restoreFixedKecleonItems(kecleon);
      }

      void globalScene.updateModifiers(false, true);

      console.log("[KECLEON_RESTORE_COMPLETED]", {
        pokemonCount: battle.enemyParty.length,
        enemyModifiers: globalScene
          .findModifiers(() => true, false)
          .map(modifier => ({
            pokemonId: modifier instanceof PokemonHeldItemModifier ? modifier.pokemonId : undefined,
            typeId: modifier.type.id,
            name: modifier.type.getSafeName(),
            className: modifier.constructor.name,
          })),
      });

      this.restoreBattleArena();

      globalScene.phaseManager.clearPhaseQueue(true);
      globalScene.phaseManager.unshiftNew("EncounterPhase", true);

      super.end();
      return;
    }

    globalScene.playBgm("stop!-thief", true);

    /*
     * 이전 층의 적 제거
     */
    for (const enemy of globalScene.getEnemyParty()) {
      if (enemy.isOnField()) {
        enemy.leaveField(true, true, true);
      }
    }

    battle.enemyParty = [];

    /*
     * 추격전은 1:1 야생전 형식.
     * enemyParty에는 6마리를 넣고
     * 실제로는 한 마리씩 순차 등장.
     */
    battle.battleType = BattleType.WILD;
    battle.double = false;

    const level = battle.getLevelForWave();

    const kecleons = Array.from({ length: 6 }, () => this.createTheftKecleon(level));

    // 1. 먼저 적 파티 등록
    battle.enemyLevels = new Array(6).fill(level);
    battle.enemyParty = kecleons;

    // 2. 야생 도구 풀 준비
    regenerateModifierPoolThresholds(kecleons, ModifierPoolType.WILD);

    // 3. 각 캘리몬에게 고정 + 랜덤 도구 지급
    for (const kecleon of kecleons) {
      this.giveTheftKecleonItems(kecleon);
    }

    // 4. 적 modifier 갱신
    void globalScene.updateModifiers(false, true);

    console.log("[KECLEON_THEFT_BATTLE_PARTY_CREATED]", {
      wave,
      level,
      count: kecleons.length,
    });

    /*
     * 전투 진입 직전 바닥 복원
     */
    this.restoreBattleArena();

    /*
     * 적 파티는 이미 생성했으므로
     * EncounterPhase는 loaded=true
     */
    globalScene.phaseManager.clearPhaseQueue(true);
    globalScene.phaseManager.unshiftNew("EncounterPhase", true);

    super.end();
  }

  private restoreBattleArena(): void {
    const biome = globalScene.arena.biomeType;

    globalScene.arenaPlayer.setBiome(biome);
    globalScene.arenaEnemy.setBiome(biome);

    globalScene.field.setVisible(true);
    globalScene.field.setAlpha(1);

    globalScene.arenaPlayer.setVisible(true);
    globalScene.arenaPlayer.setAlpha(1);

    globalScene.arenaEnemy.setVisible(true);
    globalScene.arenaEnemy.setAlpha(1);

    globalScene.arenaPlayer.base.setVisible(true);
    globalScene.arenaPlayer.base.setAlpha(1);

    globalScene.arenaEnemy.base.setVisible(true);
    globalScene.arenaEnemy.base.setAlpha(1);

    globalScene.arenaPlayer.setPosition(300, 0);
    globalScene.arenaEnemy.setPosition(-280, 0);

    globalScene.arenaNextEnemy.setVisible(false);
    globalScene.arenaPlayerTransition.setVisible(false);
    globalScene.arenaBgTransition.setVisible(false);

    console.log("[KECLEON_THEFT_ARENA_RESTORED]", {
      biome,
      playerVisible: globalScene.arenaPlayer.visible,
      playerBaseVisible: globalScene.arenaPlayer.base.visible,
      enemyVisible: globalScene.arenaEnemy.visible,
      enemyBaseVisible: globalScene.arenaEnemy.base.visible,
    });

    console.log("[KECLEON_THEFT_ARENA_PARENT_CHECK]", {
      playerParent: globalScene.arenaPlayer.parentContainer?.constructor?.name ?? "none",

      enemyParent: globalScene.arenaEnemy.parentContainer?.constructor?.name ?? "none",

      playerBaseParent: globalScene.arenaPlayer.base.parentContainer === globalScene.arenaPlayer,

      enemyBaseParent: globalScene.arenaEnemy.base.parentContainer === globalScene.arenaEnemy,

      fieldChildren: globalScene.field.list.map((obj: any, index: number) => ({
        index,
        type: obj.constructor?.name,
        name: obj.name,
        visible: obj.visible,
        alpha: obj.alpha,
        depth: obj.depth,
      })),
    });

    console.log(
      "[KECLEON_FIELD_CHILDREN_ORDER]",
      globalScene.field.list.map((obj: any, index: number) => ({
        index,
        type: obj.constructor?.name,
        name: obj.name,
        visible: obj.visible,
        alpha: obj.alpha,
        depth: obj.depth,
        x: obj.x,
        y: obj.y,
      })),
    );

    console.log("[KECLEON_ARENA_INDEX]", {
      playerIndex: globalScene.field.getIndex(globalScene.arenaPlayer),

      enemyIndex: globalScene.field.getIndex(globalScene.arenaEnemy),

      playerBaseIndex: globalScene.arenaPlayer.getIndex(globalScene.arenaPlayer.base),

      enemyBaseIndex: globalScene.arenaEnemy.getIndex(globalScene.arenaEnemy.base),
    });

    console.log("[KECLEON_ARENA_BASE_TEXTURE]", {
      player: {
        texture: globalScene.arenaPlayer.base.texture?.key,
        frame: globalScene.arenaPlayer.base.frame?.name,
        width: globalScene.arenaPlayer.base.displayWidth,
        height: globalScene.arenaPlayer.base.displayHeight,
        x: globalScene.arenaPlayer.base.x,
        y: globalScene.arenaPlayer.base.y,
        scaleX: globalScene.arenaPlayer.base.scaleX,
        scaleY: globalScene.arenaPlayer.base.scaleY,
      },

      enemy: {
        texture: globalScene.arenaEnemy.base.texture?.key,
        frame: globalScene.arenaEnemy.base.frame?.name,
        width: globalScene.arenaEnemy.base.displayWidth,
        height: globalScene.arenaEnemy.base.displayHeight,
        x: globalScene.arenaEnemy.base.x,
        y: globalScene.arenaEnemy.base.y,
        scaleX: globalScene.arenaEnemy.base.scaleX,
        scaleY: globalScene.arenaEnemy.base.scaleY,
      },
    });

    console.log(
      "[KECLEON_FIELD_CHILDREN_JSON]",
      JSON.stringify(
        globalScene.field.list.map((obj: any, index: number) => ({
          index,
          type: obj.constructor?.name,
          name: obj.name,
          visible: obj.visible,
          alpha: obj.alpha,
          depth: obj.depth,
          x: obj.x,
          y: obj.y,
        })),
        null,
        2,
      ),
    );
  }

  private giveHeldItem(
    kecleon: ReturnType<typeof globalScene.addEnemyPokemon>,
    modifierType: PokemonHeldItemModifierType,
    stackCount = 1,
  ): void {
    if (!modifierType) {
      return;
    }

    const modifier = modifierType.newModifier(kecleon) as PokemonHeldItemModifier;

    if (!modifier) {
      return;
    }

    modifier.pokemonId = kecleon.id;
    modifier.stackCount = Math.min(stackCount, modifier.getMaxStackCount());

    globalScene.addEnemyModifier(modifier, true, true);
  }

  private giveFixedKecleonItems(kecleon: ReturnType<typeof globalScene.addEnemyPokemon>): void {
    const leftoversType = modifierTypes.LEFTOVERS();

    const lifeOrbType = modifierTypes.LIFE_ORB();

    leftoversType.id = "LEFTOVERS";
    lifeOrbType.id = "LIFE_ORB";

    const fixedTypes = [leftoversType, lifeOrbType];

    for (const type of fixedTypes) {
      this.giveHeldItem(kecleon, type as PokemonHeldItemModifierType);

      console.log("[KECLEON_FIXED_ITEM_GRANTED]", {
        pokemonId: kecleon.id,
        typeId: type.id,
        name: type.getSafeName(),
      });
    }
  }

  private restoreFixedKecleonItems(kecleon: ReturnType<typeof globalScene.addEnemyPokemon>): void {
    const leftoversType = modifierTypes.LEFTOVERS();

    const lifeOrbType = modifierTypes.LIFE_ORB();

    leftoversType.id = "LEFTOVERS";
    lifeOrbType.id = "LIFE_ORB";

    const fixedTypes = [leftoversType, lifeOrbType];

    for (const type of fixedTypes) {
      const alreadyHeld =
        globalScene.findModifiers(
          modifier =>
            modifier instanceof PokemonHeldItemModifier
            && modifier.pokemonId === kecleon.id
            && modifier.type.id === type.id,
          false,
        ).length > 0;

      if (alreadyHeld) {
        continue;
      }

      this.giveHeldItem(kecleon, type as PokemonHeldItemModifierType);

      console.log("[KECLEON_FIXED_ITEM_RESTORED]", {
        pokemonId: kecleon.id,
        typeId: type.id,
        name: type.getSafeName(),
      });
    }
  }

  private giveRandomKecleonItems(kecleon: ReturnType<typeof globalScene.addEnemyPokemon>): void {
    const roll = randSeedInt(100);

    let randomItemCount = 0;

    if (roll < 40) {
      randomItemCount = 0;
    } else if (roll < 75) {
      randomItemCount = 1;
    } else if (roll < 95) {
      randomItemCount = 2;
    } else {
      randomItemCount = 3;
    }

    if (randomItemCount <= 0) {
      return;
    }

    const wave = globalScene.currentBattle.waveIndex;

    // 캘리몬 전용 야생 도구 풀 threshold 준비

    const types = getEnemyModifierTypesForWave(wave, randomItemCount, [kecleon], ModifierPoolType.WILD);

    for (const type of types) {
      if (!type) {
        continue;
      }

      this.giveHeldItem(kecleon, type);
    }
  }

  private giveTheftKecleonItems(kecleon: ReturnType<typeof globalScene.addEnemyPokemon>): void {
    // 1. 반드시 갖는 장비
    this.giveFixedKecleonItems(kecleon);

    // 2. 일반 야생 풀 기반 추가 장비
    this.giveRandomKecleonItems(kecleon);
  }

  private restoreTheftKecleonData(kecleon: ReturnType<typeof globalScene.addEnemyPokemon>): void {
    const wasFainted = kecleon.hp <= 0;

    const previousMaxHp = Math.max(1, kecleon.getMaxHp());

    const hpRatio = Math.max(0, kecleon.hp) / previousMaxHp;

    kecleon.customBaseStats = [60, 255, 255, 255, 255, 255];

    kecleon.customPokemonData = new CustomPokemonData({
      ability: AbilityId.PROTEAN,
      passive: AbilityId.SUPREME_OVERLORD,
    });

    kecleon.passive = true;

    kecleon.calculateStats();

    kecleon.hp = wasFainted ? 0 : Math.max(1, Math.min(kecleon.getMaxHp(), Math.round(kecleon.getMaxHp() * hpRatio)));

    console.log("[KECLEON_LEGACY_STATS_RESTORED]", {
      id: kecleon.id,
      customBaseStats: [...kecleon.customBaseStats],
      stats: [...kecleon.stats],
      hp: kecleon.hp,
    });
  }

  /**
   * 추격전 전용 캘리몬 생성.
   *
   * 일반 캘리몬 종족 데이터에는 영향을 주지 않고
   * 이 전투에서 생성되는 개체만 강화한다.
   */
  private createTheftKecleon(level: number) {
    const species = getPokemonSpecies(SpeciesId.KECLEON);

    const kecleon = globalScene.addEnemyPokemon(species, level, TrainerSlot.NONE, false);

    /*
     * HP / 공격 / 방어 / 특공 / 특방 / 스피드
     */
    kecleon.customBaseStats = [60, 255, 255, 255, 255, 255];

    kecleon.customPokemonData = new CustomPokemonData({
      ability: AbilityId.PROTEAN,
      passive: AbilityId.SUPREME_OVERLORD,
    });

    kecleon.passive = true;

    kecleon.moveset = [
      new PokemonMove(MoveId.WIDE_IMPACT),
      new PokemonMove(MoveId.PRECIPICE_BLADES),
      new PokemonMove(MoveId.GLACIAL_LANCE),
      new PokemonMove(MoveId.MAX_AIRSTREAM),
    ];

    kecleon.summonData.moveset = kecleon.moveset;

    kecleon.calculateStats();
    kecleon.hp = kecleon.getMaxHp();

    /*
     * Epic Shiny
     */
    kecleon.shiny = true;
    kecleon.variant = 2;

    kecleon.generateName();

    return kecleon;
  }
}
