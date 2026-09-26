import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { PLAYER_PARTY_MAX_SIZE, WEIGHT_INCREMENT_ON_SPAWN_MISS } from "#app/constants";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import Overrides from "#app/overrides";
import { handleTutorial, Tutorial } from "#app/tutorial";
import { biomePokemonPools } from "#data/balance/biomes";
import { getMysteryMonster } from "#data/balance/mystery-monster-species-list";
import { BASE_HIDDEN_ABILITY_CHANCE, BASE_SHINY_CHANCE } from "#data/balance/rates";
import { initEncounterAnims, loadEncounterAnimAssets } from "#data/battle-anims";
import { getCharVariantFromDialogue } from "#data/dialogue";
import { kecleonShopManager } from "#data/kecleon-shop/kecleon-shop-manager";
import { MonsterHouseIntroVisuals } from "#data/monster-house/monster-house-intro-visuals";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { mysteryTimeManager } from "#data/mystery-time/mystery-time-manager";
import { getNatureName } from "#data/nature";
import { getRandomWeatherType } from "#data/weather";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattleSpec } from "#enums/battle-spec";
import { BattleType } from "#enums/battle-type";
import { BattlerIndex } from "#enums/battler-index";
import { BiomeId } from "#enums/biome-id";
import { BiomePoolTier } from "#enums/biome-pool-tier";
import { FieldPosition } from "#enums/field-position";
import { GameModes } from "#enums/game-modes";
import { MarkId } from "#enums/mark-id";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { MoveId } from "#enums/move-id";
import { MysteryEncounterMode } from "#enums/mystery-encounter-mode";
import { MysteryMonsterId } from "#enums/mystery-monster-id";
import { PlayerGender } from "#enums/player-gender";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { TimeOfDay } from "#enums/time-of-day";
import { TrainerSlot } from "#enums/trainer-slot";
import { UiMode } from "#enums/ui-mode";
import { EncounterPhaseEvent } from "#events/battle-scene";
import type { EnemyPokemon, MysteryMonster, Pokemon } from "#field/pokemon";
import {
  BoostBugSpawnModifier,
  IvScannerModifier,
  overrideHeldItems,
  overrideModifiers,
  type PokemonHeldItemModifier,
  TurnHeldItemTransferModifier,
} from "#modifiers/modifier";
import {
  getModifierTypeFuncById,
  PokemonHeldItemModifierType,
  regenerateModifierPoolThresholds,
} from "#modifiers/modifier-type";
import { getEncounterText } from "#mystery-encounters/encounter-dialogue-utils";
import { doTrainerExclamation } from "#mystery-encounters/encounter-phase-utils";
import { getGoldenBugNetSpecies } from "#mystery-encounters/encounter-pokemon-utils";
import { BattlePhase } from "#phases/battle-phase";
import { achvs } from "#system/achv";
import { type QuestEntry, questManager } from "#system/quest-manager";
import { randSeedInt, randSeedItem } from "#utils/common";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import i18next from "i18next";

export class EncounterPhase extends BattlePhase {
  // Union type is necessary as this is subclassed, and typescript will otherwise complain
  public readonly phaseName: "EncounterPhase" | "NextEncounterPhase" | "NewBiomeEncounterPhase" = "EncounterPhase";
  private loaded: boolean;

  private monsterHouseIntroVisuals: MonsterHouseIntroVisuals | null = null;

  /**
   * biomePokemonPools의 엔트리 안에 특정 speciesId가 포함되어 있는지 재귀적으로 검사합니다.
   * 진화 레벨별 오브젝트/배열 구조도 함께 처리합니다.
   */
  private monsterHousePoolContainsSpecies(value: unknown, speciesId: SpeciesId): boolean {
    if (typeof value === "number") {
      return value === speciesId;
    }

    if (Array.isArray(value)) {
      return value.some(v => this.monsterHousePoolContainsSpecies(v, speciesId));
    }

    if (value && typeof value === "object") {
      return Object.values(value).some(v => this.monsterHousePoolContainsSpecies(v, speciesId));
    }

    return false;
  }

  private collectMonsterHouseBossSpecies(value: any, level: number, result: SpeciesId[]): void {
    if (typeof value === "number") {
      result.push(value as SpeciesId);
      return;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        this.collectMonsterHouseBossSpecies(entry, level, result);
      }

      return;
    }

    if (value && typeof value === "object") {
      const levels = Object.keys(value)
        .map(Number)
        .filter(requiredLevel => requiredLevel <= level)
        .sort((a, b) => b - a);

      if (levels.length === 0) {
        return;
      }

      const selectedLevel = levels[0];

      this.collectMonsterHouseBossSpecies(value[selectedLevel], level, result);
    }
  }

  private getMonsterHouseBossSpecies(level: number) {
    const biomePool = (biomePokemonPools as any)[globalScene.arena.biomeType];

    if (!biomePool) {
      return globalScene.randomSpecies(globalScene.currentBattle.waveIndex, level, true);
    }

    const rank = monsterHouseManager.getRank();

    /*
     * 소굴 등급에 따라 접근 가능한 최고 보스 티어를 결정.
     *
     * RANK_1 : BOSS
     * RANK_2 : BOSS_RARE
     * RANK_3 : BOSS_SUPER_RARE
     * RANK_4 : BOSS_ULTRA_RARE
     * RANK_5 : BOSS_ULTRA_RARE
     *
     * 목표 티어가 비어 있으면 한 단계씩 아래로 내려갑니다.
     */
    const bossTierPriority: BiomePoolTier[] =
      rank >= 4
        ? [BiomePoolTier.BOSS_ULTRA_RARE, BiomePoolTier.BOSS_SUPER_RARE, BiomePoolTier.BOSS_RARE, BiomePoolTier.BOSS]
        : rank === 3
          ? [BiomePoolTier.BOSS_SUPER_RARE, BiomePoolTier.BOSS_RARE, BiomePoolTier.BOSS]
          : rank === 2
            ? [BiomePoolTier.BOSS_RARE, BiomePoolTier.BOSS]
            : [BiomePoolTier.BOSS];

    const timeOfDay = globalScene.arena.getTimeOfDay?.() ?? TimeOfDay.ALL;

    /*
     * 가장 높은 유효 보스 티어 하나만 사용합니다.
     */
    for (const tier of bossTierPriority) {
      const tierPool = biomePool[tier];

      if (!tierPool) {
        continue;
      }

      const entries = [...(tierPool[timeOfDay] ?? []), ...(tierPool[TimeOfDay.ALL] ?? [])];

      const candidates: SpeciesId[] = [];

      this.collectMonsterHouseBossSpecies(entries, level, candidates);

      if (candidates.length === 0) {
        continue;
      }

      const speciesId = candidates[globalScene.currentBattle.randSeedInt(candidates.length)];

      console.log("[MONSTER_HOUSE_BOSS_POOL_SELECTED]", {
        rank,
        tier: BiomePoolTier[tier],
        candidates,
        selected: SpeciesId[speciesId],
      });

      return getPokemonSpecies(speciesId);
    }

    /*
     * 해당 바이옴에 사용 가능한 보스 풀이 전혀 없다면
     * 일반 풀에서 가장 높은 희귀도부터 탐색합니다.
     */
    const normalTierPriority = [
      BiomePoolTier.ULTRA_RARE,
      BiomePoolTier.SUPER_RARE,
      BiomePoolTier.RARE,
      BiomePoolTier.UNCOMMON,
      BiomePoolTier.COMMON,
    ];

    for (const tier of normalTierPriority) {
      const tierPool = biomePool[tier];

      if (!tierPool) {
        continue;
      }

      const entries = [...(tierPool[timeOfDay] ?? []), ...(tierPool[TimeOfDay.ALL] ?? [])];

      const candidates: SpeciesId[] = [];

      this.collectMonsterHouseBossSpecies(entries, level, candidates);

      if (candidates.length === 0) {
        continue;
      }

      const speciesId = candidates[globalScene.currentBattle.randSeedInt(candidates.length)];

      console.log("[MONSTER_HOUSE_BOSS_FALLBACK_SELECTED]", {
        rank,
        tier: BiomePoolTier[tier],
        candidates,
        selected: SpeciesId[speciesId],
      });

      return getPokemonSpecies(speciesId);
    }

    /*
     * 정말 아무 후보도 찾지 못했을 때만
     * 기존 랜덤 생성으로 최종 fallback.
     */
    console.warn("[MONSTER_HOUSE_BOSS_POOL_COMPLETELY_EMPTY]", {
      biome: globalScene.arena.biomeType,
      level,
      rank,
    });

    return globalScene.randomSpecies(globalScene.currentBattle.waveIndex, level, true);
  }

  /**
   * 현재 바이옴에서의 희귀도 순위를 반환합니다.
   * 숫자가 높을수록 희귀합니다.
   */
  private getMonsterHouseRarityRank(pokemon: Pokemon): number {
    const biomePool = (biomePokemonPools as any)[globalScene.arena.biomeType];

    if (!biomePool) {
      return 0;
    }

    const rarityOrder = [
      BiomePoolTier.COMMON,
      BiomePoolTier.UNCOMMON,
      BiomePoolTier.RARE,
      BiomePoolTier.SUPER_RARE,
      BiomePoolTier.ULTRA_RARE,
    ];

    let bestRank = 0;

    rarityOrder.forEach((tier, rank) => {
      const tierPool = biomePool[tier];

      if (tierPool && this.monsterHousePoolContainsSpecies(tierPool, pokemon.species.speciesId)) {
        bestRank = Math.max(bestRank, rank);
      }
    });

    return bestRank;
  }

  /**
   * 피뢰침/마중물류의 공격 유도 특성 또는
   * 와이드가드/마룻바닥세워막기류 광역 방어기를 가진 개체인지 판정합니다.
   */
  private isMonsterHouseProtector(pokemon: Pokemon): boolean {
    const ability = pokemon.getAbility();
    const passiveAbility = pokemon.hasPassive() ? pokemon.getPassiveAbility() : null;

    const hasRedirectAbility =
      ability.hasAttr("RedirectTypeMoveAbAttr") || !!passiveAbility?.hasAttr("RedirectTypeMoveAbAttr");

    const groupGuardMoves = [MoveId.QUICK_GUARD, MoveId.WIDE_GUARD, MoveId.MAT_BLOCK, MoveId.CRAFTY_SHIELD];

    const hasGroupGuardMove = pokemon.getMoveset().some(move => groupGuardMoves.includes(move.moveId));

    return hasRedirectAbility || hasGroupGuardMove;
  }

  /**
   * 가운데는 우두머리, 양옆은 보호형 개체를 우선 선정합니다.
   * 보호형이 부족하면 현재 바이옴에서 더 희귀한 개체를 우선합니다.
   */
  private selectMonsterHouseShowcaseIndices(): void {
    const party = globalScene.getEnemyParty();
    const bossIndex = monsterHouseManager.getBossIndex();

    if (bossIndex === null || !party[bossIndex] || party.length < 3) {
      return;
    }

    const candidates = party
      .map((pokemon, index) => ({
        pokemon,
        index,
        protector: index !== bossIndex && this.isMonsterHouseProtector(pokemon),
        rarity: index !== bossIndex ? this.getMonsterHouseRarityRank(pokemon) : -1,
        tieBreaker: randSeedInt(1_000_000),
      }))
      .filter(entry => entry.index !== bossIndex)
      .sort((a, b) => {
        if (a.protector !== b.protector) {
          return Number(b.protector) - Number(a.protector);
        }

        if (a.rarity !== b.rarity) {
          return b.rarity - a.rarity;
        }

        return a.tieBreaker - b.tieBreaker;
      });

    if (candidates.length < 2) {
      return;
    }

    monsterHouseManager.setShowcaseIndices(candidates[0].index, bossIndex, candidates[1].index);

    console.log("[MONSTER_HOUSE_SHOWCASE_SELECTED]", {
      left: {
        index: candidates[0].index,
        pokemon: candidates[0].pokemon.name,
        protector: candidates[0].protector,
        rarity: candidates[0].rarity,
      },
      center: {
        index: bossIndex,
        pokemon: party[bossIndex].name,
      },
      right: {
        index: candidates[1].index,
        pokemon: candidates[1].pokemon.name,
        protector: candidates[1].protector,
        rarity: candidates[1].rarity,
      },
    });
  }

  /**
   * 몬스터소굴 실루엣 연출이 끝난 뒤 실제 전투 포켓몬을 공개합니다.
   */
  private revealMonsterHouseBattle(enemyField: Pokemon[]): void {
    for (const enemyPokemon of enemyField) {
      enemyPokemon.setVisible(true);
      enemyPokemon.setAlpha(1);
      enemyPokemon.untint(100, "Sine.easeOut");

      enemyPokemon.cry();
      enemyPokemon.showInfo();

      if (enemyPokemon.isShiny()) {
        globalScene.validateAchv(achvs.SEE_SHINY);
      }
    }

    globalScene.updateFieldScale();
    this.end();
  }

  /**
   * 월간 최종보스의 강화폼을 지정합니다.
   *
   * KYOGRE  → Primal
   * DIALGA  → Origin
   * CALYREX → Shadow Rider
   */
  private applyMonthlyFinalBossForm(pokemon: Pokemon): void {
    if (
      globalScene.gameMode.modeId !== GameModes.MONTHLY
      || !globalScene.gameMode.isWaveFinal(globalScene.currentBattle.waveIndex)
    ) {
      return;
    }

    let formIndex: number | null = null;

    switch (pokemon.species.speciesId) {
      case SpeciesId.KYOGRE:
        // 0 Normal / 1 Primal
        formIndex = 1;
        break;

      case SpeciesId.DIALGA:
        // 0 Normal / 1 Origin Forme
        formIndex = 1;
        break;

      case SpeciesId.CALYREX:
        // 0 Normal / 1 Ice / 2 Shadow
        formIndex = 2;
        break;
    }

    if (formIndex == null) {
      return;
    }

    pokemon.formIndex = formIndex;

    // 폼에 맞춰 이름 / 기술 / 능력치 / 크기 갱신
    pokemon.generateName();
    pokemon.generateAndPopulateMoveset(formIndex);
    pokemon.calculateStats();
    pokemon.updateScale();

    console.log("[MONTHLY_FINAL_BOSS_FORM]", {
      species: SpeciesId[pokemon.species.speciesId],
      formIndex,
    });
  }

  /**
   * 주간 / 월간 최종보스 시작 보정
   *
   * WEEKLY:
   * - 공격/방어/특공/특방/스피드 중 하나 +1
   *
   * MONTHLY:
   * - 위 5능력치 중 2회 독립 추첨
   * - 각각 +1
   * - 중복 허용
   *   ex) 특공 +1 + 특공 +1 = 특공 +2
   * - 추가로 적 진영 이로운 ArenaTag 2종
   */
  private applyGeneratedFinalBossStartBuffs(): void {
    console.log("[FINAL_BOSS_BUFF] 함수 진입");

    const mode = globalScene.gameMode.modeId;
    const waveIndex = globalScene.currentBattle.waveIndex;

    console.log({
      mode,
      waveIndex,
      isFinal: globalScene.gameMode.isWaveFinal(waveIndex),
    });

    if (!globalScene.gameMode.isWaveFinal(waveIndex) || (mode !== GameModes.WEEKLY && mode !== GameModes.MONTHLY)) {
      return;
    }

    const boss = globalScene.getEnemyField()[0];

    console.log("[FINAL_BOSS]", boss);

    if (!boss) {
      return;
    }

    const boostStats = [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];

    // ================================
    // 주간
    // 무작위 능력치 1개 +1
    // ================================
    if (mode === GameModes.WEEKLY) {
      const selectedStat = randSeedItem(boostStats);

      globalScene.phaseManager.pushNew("StatStageChangePhase", boss.getBattlerIndex(), true, [selectedStat], 1, true);

      console.log("[WEEKLY_FINAL_BOSS_BUFF]", {
        boss: boss.name,
        stat: Stat[selectedStat],
        stages: 1,
      });

      return;
    }

    // ================================
    // 월간
    // 무작위 능력치 2회 +1
    //
    // 일부러 독립적으로 두 번 뽑아서
    // 같은 능력치 중복 가능
    // ================================
    const firstStat = randSeedItem(boostStats);
    const secondStat = randSeedItem(boostStats);

    globalScene.phaseManager.pushNew("StatStageChangePhase", boss.getBattlerIndex(), true, [firstStat], 1, true);

    globalScene.phaseManager.pushNew("StatStageChangePhase", boss.getBattlerIndex(), true, [secondStat], 1, true);

    // ================================
    // 월간 추가 필드 버프
    // 현재는 서로 다른 효과 2개
    // ================================
    const monthlyFieldBuffs = [
      ArenaTagType.TAILWIND,
      ArenaTagType.REFLECT,
      ArenaTagType.LIGHT_SCREEN,
      ArenaTagType.AURORA_VEIL,
      ArenaTagType.SAFEGUARD,
      ArenaTagType.NO_CRIT,
    ];

    const firstFieldBuff = randSeedItem(monthlyFieldBuffs);

    // 필드 효과 쪽은 중복하지 않게 두 번째 추첨
    const remainingFieldBuffs = monthlyFieldBuffs.filter(buff => buff !== firstFieldBuff);

    const secondFieldBuff = randSeedItem(remainingFieldBuffs);

    const selectedFieldBuffs = [firstFieldBuff, secondFieldBuff];

    for (const buff of selectedFieldBuffs) {
      const added = globalScene.arena.addTag(
        buff,
        5,
        undefined,
        buff === ArenaTagType.TAILWIND ? undefined : boss.id,
        ArenaTagSide.ENEMY,
      );

      const installedTag = globalScene.arena.getTagOnSide(buff, ArenaTagSide.ENEMY);

      console.log("[MONTHLY_FIELD_BUFF_CHECK]", {
        buff: ArenaTagType[buff],
        installed: !!installedTag,
        tag: installedTag,
      });

      console.log("[MONTHLY_FIELD_BUFF]", {
        buff: ArenaTagType[buff],
        added,
        side: "ENEMY",
        turns: 5,
      });

      switch (buff) {
        case ArenaTagType.TAILWIND:
          globalScene.phaseManager.queueMessage("상대편에 순풍이 불기 시작했다!");
          break;

        case ArenaTagType.REFLECT:
          globalScene.phaseManager.queueMessage("상대편에 리플렉터가 펼쳐졌다!");
          break;

        case ArenaTagType.LIGHT_SCREEN:
          globalScene.phaseManager.queueMessage("상대편에 빛의장막이 펼쳐졌다!");
          break;

        case ArenaTagType.AURORA_VEIL:
          globalScene.phaseManager.queueMessage("상대편에 오로라베일이 펼쳐졌다!");
          break;

        case ArenaTagType.SAFEGUARD:
          globalScene.phaseManager.queueMessage("상대편이 신비의부적에 둘러싸였다!");
          break;

        case ArenaTagType.NO_CRIT:
          globalScene.phaseManager.queueMessage("상대편은 급소 공격을 받지 않게 되었다!");
          break;
      }
    }

    console.log("[MONTHLY_FINAL_BOSS_BUFF]", {
      boss: boss.name,

      stats: [Stat[firstStat], Stat[secondStat]],

      arenaBuffs: selectedFieldBuffs.map(buff => ArenaTagType[buff]),
    });
  }

  constructor(loaded = false) {
    super();

    this.loaded = loaded;
  }

  start() {
    const wave = globalScene.currentBattle.waveIndex;

    // ★ 저장 후 로드된 캘리몬 추격전 복원
    if (this.loaded && kecleonShopManager.isTheftChaseWave(wave) && kecleonShopManager.consumeTheftRestorePending()) {
      console.log("[ENCOUNTER_RESTORE_KECLEON_THEFT]", {
        wave,
        startWave: kecleonShopManager.getTheftStartWave(),
        endWave: kecleonShopManager.getTheftEndWave(),
      });

      globalScene.phaseManager.clearPhaseQueue(true);
      globalScene.phaseManager.pushNew("KecleonTheftBattlePhase");
      globalScene.phaseManager.shiftPhase();

      return;
    }

    // 기존 상점 복원
    if (
      this.loaded
      && kecleonShopManager.hasShop()
      && !kecleonShopManager.isTheftBattleActive()
      && kecleonShopManager.getGeneratedWave() === wave
    ) {
      console.log("[ENCOUNTER_RESTORE_KECLEON_OVERRIDE]", {
        wave: globalScene.currentBattle.waveIndex,
      });

      globalScene.phaseManager.clearPhaseQueue(true);
      globalScene.phaseManager.pushNew("KecleonShopPhase");
      globalScene.phaseManager.shiftPhase();
      return;
    }

    super.start();

    globalScene.updateGameInfo();
    globalScene.initSession();

    // ========================================
    // 미스터리타임 로드 복구
    // ========================================
    if (
      this.loaded
      && mysteryTimeManager.isActive()
      && mysteryTimeManager.isMysteryTimeWave(globalScene.currentBattle.waveIndex)
    ) {
      /*
       * 로드된 Arena/스프라이트가 모두 세팅된 뒤
       * 런타임 연출을 다시 구성한다.
       */
      globalScene.time.delayedCall(0, () => {
        globalScene.restoreMysteryTimePresentation();
      });
    }

    globalScene.eventTarget.dispatchEvent(new EncounterPhaseEvent());

    // Failsafe if players somehow skip floor 200 in classic mode
    if (globalScene.gameMode.isClassic && globalScene.currentBattle.waveIndex > 200) {
      globalScene.phaseManager.unshiftNew("GameOverPhase");
    }

    const loadEnemyAssets: Promise<void>[] = [];

    const battle = globalScene.currentBattle;

    // ========================================
    // 캘리몬 추격전 여부
    // 캘리몬 레이드는 다른 특수 조우보다 최우선
    // ========================================
    const isKecleonRaid =
      kecleonShopManager.isTheftBattleActive() && kecleonShopManager.isTheftChaseWave(battle.waveIndex);

    // ========================================
    // 캘리몬 레이드 보호
    // ========================================
    if (isKecleonRaid) {
      // 소굴 상태가 혹시 남아 있으면 제거
      if (monsterHouseManager.isActive()) {
        console.warn("[MONSTER_HOUSE_REMOVED_BY_KECLEON_RAID]", {
          wave: battle.waveIndex,
        });

        monsterHouseManager.reset();
      }

      // 캘리몬 레이드는
      // 1:1 야생전 형식으로 고정
      (battle as any).battleType = BattleType.WILD;

      (battle as any).double = false;

      // ★ 중요:
      // enemyParty / enemyLevels는 건드리지 않는다.
      // 캘리몬 6마리가 순차 출전해야 하기 때문.
      console.log("[KECLEON_RAID_ENCOUNTER_PROTECTED]", {
        wave: battle.waveIndex,
        enemyPartyCount: battle.enemyParty.length,
        enemyLevelCount: battle.enemyLevels?.length ?? 0,
      });
    }

    // ========================================
    // 미스터리타임은 캘리몬 레이드가 아닐 때만
    // 기존 트레이너/소굴보다 우선
    // ========================================
    else if (mysteryTimeManager.isMysteryTimeWave(battle.waveIndex)) {
      // 잘못 남은 소굴 상태 제거
      if (monsterHouseManager.isActive()) {
        console.warn("[MONSTER_HOUSE_REMOVED_BY_MYSTERY_TIME]", {
          wave: battle.waveIndex,
        });

        monsterHouseManager.reset();
      }

      // 예정되어 있던 트레이너전을 야생전으로 치환
      if (battle.battleType === BattleType.TRAINER) {
        console.log("[TRAINER_BATTLE_SUPPRESSED_BY_MYSTERY_TIME]", {
          wave: battle.waveIndex,
        });

        (battle as any).battleType = BattleType.WILD;

        (battle as any).trainer = undefined;

        (battle as any).double = false;

        if (battle.enemyLevels && battle.enemyLevels.length > 1) {
          (battle as any).enemyLevels = [battle.enemyLevels[0]];
        }

        battle.enemyParty.length = 0;
      }
    }

    // ========================================
    // 미스터리타임 발생 판정
    // ========================================
    if (
      !this.loaded
      && battle.battleType === BattleType.WILD
      && !battle.isBattleMysteryEncounter()
      && !mysteryTimeManager.isActive()
      && !monsterHouseManager.isActive()
      && !kecleonShopManager.isTheftBattleActive()
      && mysteryTimeManager.shouldSpawn()
    ) {
      mysteryTimeManager.start(battle.waveIndex);

      console.log("[MYSTERY_TIME_TRIGGERED]", {
        wave: battle.waveIndex,
        startWave: mysteryTimeManager.getStartWave(),
        endWave: mysteryTimeManager.getEndWave(),
        rank: mysteryTimeManager.getRank(),
      });
    }

    // 트레이너전에서는 몬스터소굴 상태가 절대 유지되지 않도록 한다.
    if (battle.battleType === BattleType.TRAINER && monsterHouseManager.isActive()) {
      console.warn("[MONSTER_HOUSE_CANCELLED_FOR_TRAINER]", {
        wave: battle.waveIndex,
      });

      monsterHouseManager.reset();
    }

    // 몬스터소굴은 항상 싱글배틀로 진행합니다.
    // 이전 웨이브가 더블이었거나 원래 더블 야생전 판정이었더라도
    // 소굴에 진입한 순간 1:1 전투로 고정합니다.
    if (monsterHouseManager.isActive() && battle.battleType === BattleType.WILD) {
      (battle as any).double = false;

      globalScene.playBgm("monster-house", true);

      console.log("[MONSTER_HOUSE_FORCE_SINGLE]", {
        wave: battle.waveIndex,
      });
    }

    // Generate and Init Mystery Encounter
    if (battle.isBattleMysteryEncounter() && !battle.mysteryEncounter) {
      globalScene.executeWithSeedOffset(() => {
        const currentSessionEncounterType = battle.mysteryEncounterType;
        battle.mysteryEncounter = globalScene.getMysteryEncounter(currentSessionEncounterType);
      }, battle.waveIndex * 16);
    }
    const mysteryEncounter = battle.mysteryEncounter;
    if (mysteryEncounter) {
      // If ME has an onInit() function, call it
      // Usually used for calculating rand data before initializing anything visual
      // Also prepopulates any dialogue tokens from encounter/option requirements
      globalScene.executeWithSeedOffset(() => {
        if (mysteryEncounter.onInit) {
          mysteryEncounter.onInit();
        }
        mysteryEncounter.populateDialogueTokensFromRequirements();
      }, battle.waveIndex);

      // Add any special encounter animations to load
      if (mysteryEncounter.encounterAnimations && mysteryEncounter.encounterAnimations.length > 0) {
        loadEnemyAssets.push(
          initEncounterAnims(mysteryEncounter.encounterAnimations).then(() => loadEncounterAnimAssets(true)),
        );
      }

      // Add intro visuals for mystery encounter
      mysteryEncounter.initIntroVisuals();
      globalScene.field.add(mysteryEncounter.introVisuals!);
    }

    let totalBst = 0;

    let encounterEnemyLevels = battle.enemyLevels ? [...battle.enemyLevels] : [];

    if (!isKecleonRaid && mysteryTimeManager.shouldSpawnBoss(battle.waveIndex) && encounterEnemyLevels.length > 1) {
      encounterEnemyLevels = [encounterEnemyLevels[0]];

      (battle as any).double = false;
    }

    if (
      monsterHouseManager.isActive()
      && battle.battleType === BattleType.WILD
      && !battle.isBattleMysteryEncounter()
      && !this.loaded
      && globalScene.arena.biomeType !== BiomeId.END
    ) {
      globalScene.playBgm("monster-house", true);

      if (monsterHouseManager.getTotalEnemies() <= 0) {
        monsterHouseManager.start(randSeedInt(30, 7));
      }

      const totalEnemies = monsterHouseManager.getTotalEnemies();

      const baseLevel = encounterEnemyLevels[0];

      if (baseLevel !== undefined) {
        encounterEnemyLevels = Array.from({ length: totalEnemies }, () => baseLevel);

        // 기존 1~2마리 야생 파티가 남아 있을 가능성을 제거하고
        // 소굴 전체를 새로 구성합니다.
        battle.enemyParty.length = 0;

        console.log("[MONSTER_HOUSE_GENERATE]", {
          wave: battle.waveIndex,
          totalEnemies,
          baseLevel,
          bossIndex: monsterHouseManager.getBossIndex(),
        });
      }
    }

    encounterEnemyLevels.every((level, e) => {
      if (battle.isBattleMysteryEncounter()) {
        return false;
      }

      if (!this.loaded) {
        const isMysteryTime = mysteryTimeManager.isMysteryTimeWave(battle.waveIndex);

        const isMysteryTimeBoss = isMysteryTime && mysteryTimeManager.shouldSpawnBoss(battle.waveIndex);

        const isMonsterHouseBoss =
          !isMysteryTime && monsterHouseManager.isActive() && e === monsterHouseManager.getBossIndex();

        // ========================================
        // 1순위: 미스터리타임
        // ========================================
        if (isMysteryTime) {
          const mysterySpecies = getMysteryMonster(
            isMysteryTimeBoss ? MysteryMonsterId.DEMONSTERY : MysteryMonsterId.MYSTERIAN,
          );

          const mysteryMonster = globalScene.addMysteryMonster(
            mysterySpecies,
            level,
            TrainerSlot.NONE,
            isMysteryTimeBoss,
          );

          // 미스터리타임에서는
          // 일반 증표 제거
          mysteryMonster.mark = MarkId.NONE;

          // 특수 Mysterian 판정
          const isOminous = !isMysteryTimeBoss && mysteryTimeManager.shouldSpawnOminousMonster(battle.waveIndex);

          if (isOminous) {
            mysteryMonster.mark = MarkId.MYSTERY;

            mysteryTimeManager.markOminousMonsterSpawned();
          }

          battle.enemyParty[e] = mysteryMonster;

          console.log("[MYSTERY_TIME_MONSTER_GENERATED]", {
            wave: battle.waveIndex,
            id: MysteryMonsterId[mysterySpecies.id],
            name: mysterySpecies.name,
            boss: isMysteryTimeBoss,
            ominous: isOminous,
          });
        }

        // ========================================
        // 2순위: 트레이너
        // ========================================
        else if (battle.battleType === BattleType.TRAINER) {
          battle.enemyParty[e] = battle.trainer?.genPartyMember(e)!;
        }

        // ========================================
        // 3순위: 일반 야생 / 몬스터소굴
        // ========================================
        else {
          let enemySpecies = isMonsterHouseBoss
            ? this.getMonsterHouseBossSpecies(level)
            : globalScene.randomSpecies(battle.waveIndex, level, true);

          if (
            !isMonsterHouseBoss
            && globalScene.findModifier(m => m instanceof BoostBugSpawnModifier)
            && !globalScene.gameMode.isBoss(battle.waveIndex)
            && globalScene.arena.biomeType !== BiomeId.END
            && randSeedInt(10) === 0
          ) {
            enemySpecies = getGoldenBugNetSpecies(level);
          }

          const shouldBeBoss =
            isMonsterHouseBoss || !!globalScene.getEncounterBossSegments(battle.waveIndex, level, enemySpecies);

          battle.enemyParty[e] = globalScene.addEnemyPokemon(enemySpecies, level, TrainerSlot.NONE, shouldBeBoss);

          if (isMonsterHouseBoss) {
            this.applyMonsterHouseBossQuality(battle.enemyParty[e]);
          }
        }

        console.log("[ENEMY_GENERATED]", {
          index: e,
          species: battle.enemyParty[e]?.name,
          mysteryTime: isMysteryTime,
          mysteryTimeBoss: isMysteryTimeBoss,
          monsterHouseBoss: isMonsterHouseBoss,
          boss: battle.enemyParty[e]?.isBoss(),
        });

        if (globalScene.currentBattle.battleSpec === BattleSpec.FINAL_BOSS) {
          battle.enemyParty[e].ivs = new Array(6).fill(31);
        }

        globalScene
          .getPlayerParty()
          .slice(0, !battle.double ? 1 : 2)
          .reverse()
          .forEach(playerPokemon => {
            applyAbAttrs("SyncEncounterNatureAbAttr", {
              pokemon: playerPokemon,
              target: battle.enemyParty[e],
            });
          });
      }

      const enemyPokemon = globalScene.getEnemyParty()[e];

      if (!enemyPokemon) {
        console.error("[ENEMY_GENERATION_MISSING]", {
          e,
          level,
          enemyPartyLength: battle.enemyParty.length,
          monsterHouse: monsterHouseManager.isActive(),
          bossIndex: monsterHouseManager.getBossIndex(),
        });

        return false;
      }

      // 월간 최종보스 강화폼 적용
      if (!this.loaded) {
        this.applyMonthlyFinalBossForm(enemyPokemon);
      }

      if (e < (battle.double ? 2 : 1)) {
        enemyPokemon.setX(-66 + enemyPokemon.getFieldPositionOffset()[0]);
        enemyPokemon.fieldSetup(true);
      }

      if (!this.loaded && !enemyPokemon.isMysteryMonster()) {
        globalScene.gameData.setPokemonSeen(
          enemyPokemon,
          true,
          battle.battleType === BattleType.TRAINER
            || battle?.mysteryEncounter?.encounterMode === MysteryEncounterMode.TRAINER_BATTLE,
        );
      }

      if (!enemyPokemon.isMysteryMonster() && enemyPokemon.species.speciesId === SpeciesId.ETERNATUS) {
        if (
          globalScene.gameMode.isClassic
          && (battle.battleSpec === BattleSpec.FINAL_BOSS || globalScene.gameMode.isWaveFinal(battle.waveIndex))
        ) {
          if (battle.battleSpec !== BattleSpec.FINAL_BOSS) {
            enemyPokemon.formIndex = 1;
            enemyPokemon.updateScale();
          }
          enemyPokemon.setBoss();
        } else if (!(battle.waveIndex % 1000)) {
          enemyPokemon.formIndex = 1;
          enemyPokemon.updateScale();
        }
      }

      totalBst += enemyPokemon.isMysteryMonster()
        ? (enemyPokemon as MysteryMonster).getBaseStatTotal()
        : enemyPokemon.getSpeciesForm().baseTotal;

      loadEnemyAssets.push(enemyPokemon.loadAssets());

      const stats: string[] = [
        `HP: ${enemyPokemon.stats[0]} (${enemyPokemon.ivs[0]})`,
        ` Atk: ${enemyPokemon.stats[1]} (${enemyPokemon.ivs[1]})`,
        ` Def: ${enemyPokemon.stats[2]} (${enemyPokemon.ivs[2]})`,
        ` Spatk: ${enemyPokemon.stats[3]} (${enemyPokemon.ivs[3]})`,
        ` Spdef: ${enemyPokemon.stats[4]} (${enemyPokemon.ivs[4]})`,
        ` Spd: ${enemyPokemon.stats[5]} (${enemyPokemon.ivs[5]})`,
      ];
      const moveset: string[] = [];
      for (const move of enemyPokemon.getMoveset()) {
        moveset.push(move.getName());
      }

      console.log(
        `Pokemon: ${getPokemonNameWithAffix(enemyPokemon)}`,
        `| Species ID: ${enemyPokemon.species.speciesId}`,
        `| Level: ${enemyPokemon.level}`,
        `| Nature: ${getNatureName(enemyPokemon.nature, true, true, true)}`,
      );
      console.log(`Stats (IVs): ${stats}`);
      console.log(
        `Ability: ${enemyPokemon.getAbility().name}`,
        `| Passive Ability${enemyPokemon.hasPassive() ? "" : " (inactive)"}: ${enemyPokemon.getPassiveAbility().name}`,
        `${enemyPokemon.isBoss() ? `| Boss Bars: ${enemyPokemon.bossSegments}` : ""}`,
      );
      console.log("Moveset:", moveset);
      return true;
    });

    if (
      monsterHouseManager.isActive()
      && battle.battleType === BattleType.WILD
      && !battle.isBattleMysteryEncounter()
      && !this.loaded
    ) {
      monsterHouseManager.setMembers(battle.enemyParty);

      this.selectMonsterHouseShowcaseIndices();
    }

    if (globalScene.getPlayerParty().filter(p => p.isShiny()).length === PLAYER_PARTY_MAX_SIZE) {
      globalScene.validateAchv(achvs.SHINY_PARTY);
    }

    if (battle.battleType === BattleType.TRAINER) {
      loadEnemyAssets.push(battle.trainer?.loadAssets().then(() => battle.trainer?.initSprite())!); // TODO: is this bang correct?
    } else if (battle.isBattleMysteryEncounter()) {
      if (battle.mysteryEncounter?.introVisuals) {
        loadEnemyAssets.push(
          battle.mysteryEncounter.introVisuals
            .loadAssets()
            .then(() => battle.mysteryEncounter!.introVisuals!.initSprite()),
        );
      }
      if (battle.mysteryEncounter?.loadAssets && battle.mysteryEncounter.loadAssets.length > 0) {
        loadEnemyAssets.push(...battle.mysteryEncounter.loadAssets);
      }
      // Load Mystery Encounter Exclamation bubble and sfx
      loadEnemyAssets.push(
        new Promise<void>(resolve => {
          globalScene.loadSe("GEN8- Exclaim", "battle_anims", "GEN8- Exclaim.wav");
          globalScene.loadImage("encounter_exclaim", "mystery-encounters");
          globalScene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
          if (!globalScene.load.isLoading()) {
            globalScene.load.start();
          }
        }),
      );
    } else {
      const overridedBossSegments = Overrides.ENEMY_HEALTH_SEGMENTS_OVERRIDE > 1;
      // for double battles, reduce the health segments for boss Pokemon unless there is an override
      if (!overridedBossSegments && battle.enemyParty.filter(p => p.isBoss()).length > 1) {
        for (const enemyPokemon of battle.enemyParty) {
          // If the enemy pokemon is a boss and wasn't populated from data source, then update the number of segments
          if (enemyPokemon.isBoss() && !enemyPokemon.isPopulatedFromDataSource) {
            enemyPokemon.setBoss(
              true,
              Math.ceil(enemyPokemon.bossSegments * (enemyPokemon.getSpeciesForm().baseTotal / totalBst)),
            );
            enemyPokemon.initBattleInfo();
          }
        }
      }
    }

    Promise.all(loadEnemyAssets).then(() => {
      if (monsterHouseManager.isActive() && battle.battleType === BattleType.WILD) {
        let showcase = monsterHouseManager.getShowcaseIndices();

        const showcaseMissing =
          showcase.left === null
          || showcase.center === null
          || showcase.right === null
          || !battle.enemyParty[showcase.left]
          || !battle.enemyParty[showcase.center]
          || !battle.enemyParty[showcase.right];

        if (showcaseMissing) {
          console.log("[MONSTER_HOUSE_SHOWCASE_RESELECT_AFTER_LOAD]", {
            loaded: this.loaded,
            previous: showcase,
            partySize: battle.enemyParty.length,
          });

          this.selectMonsterHouseShowcaseIndices();

          showcase = monsterHouseManager.getShowcaseIndices();
        }

        if (
          showcase.left !== null
          && showcase.center !== null
          && showcase.right !== null
          && battle.enemyParty[showcase.left]
          && battle.enemyParty[showcase.center]
          && battle.enemyParty[showcase.right]
        ) {
          this.monsterHouseIntroVisuals = new MonsterHouseIntroVisuals(
            battle.enemyParty[showcase.left],
            battle.enemyParty[showcase.center],
            battle.enemyParty[showcase.right],
          );

          this.monsterHouseIntroVisuals.init();

          globalScene.field.add(this.monsterHouseIntroVisuals);
        }
      }

      battle.enemyParty.every((enemyPokemon, e) => {
        if (battle.isBattleMysteryEncounter()) {
          return false;
        }
        if (e < (battle.double ? 2 : 1)) {
          if (battle.battleType === BattleType.WILD) {
            for (const pokemon of globalScene.getField()) {
              applyAbAttrs("PreSummonAbAttr", { pokemon });
            }
            globalScene.field.add(enemyPokemon);
            battle.seenEnemyPartyMemberIds.add(enemyPokemon.id);
            if (monsterHouseManager.isActive()) {
              enemyPokemon.setVisible(false);
            }
            const playerPokemon = globalScene.getPlayerPokemon();
            if (playerPokemon?.isOnField()) {
              globalScene.field.moveBelow(enemyPokemon as Pokemon, playerPokemon);
            }
            enemyPokemon.tint(0, 0.5);
          } else if (battle.battleType === BattleType.TRAINER) {
            enemyPokemon.setVisible(false);
            globalScene.currentBattle.trainer?.tint(0, 0.5);
          }
          if (battle.double) {
            enemyPokemon.setFieldPosition(e ? FieldPosition.RIGHT : FieldPosition.LEFT);
          }
        }
        return true;
      });

      if (!this.loaded && battle.battleType !== BattleType.MYSTERY_ENCOUNTER) {
        // generate modifiers for MEs, overriding prior ones as applicable
        regenerateModifierPoolThresholds(
          globalScene.getEnemyField(),
          battle.battleType === BattleType.TRAINER ? ModifierPoolType.TRAINER : ModifierPoolType.WILD,
        );
        globalScene.generateEnemyModifiers();
        overrideModifiers(false);

        for (const enemy of globalScene.getEnemyField()) {
          overrideHeldItems(enemy, false);
        }
        const itemQuest = questManager.getActiveHeldItemFindQuest(battle.waveIndex);

        if (itemQuest && battle.battleType === BattleType.WILD && itemQuest.targetItemId) {
          const enemy = globalScene.getEnemyField()[0];

          if (enemy) {
            const itemFunc = getModifierTypeFuncById(itemQuest.targetItemId);

            const itemType = itemFunc?.();

            if (itemType instanceof PokemonHeldItemModifierType) {
              itemType.withIdFromFunc(itemFunc);

              const modifier = itemType.newModifier(enemy) as PokemonHeldItemModifier;

              modifier.pokemonId = enemy.id;

              globalScene.addEnemyModifier(modifier, false, true);

              console.log("[QUEST_ITEM_HELD_GRANTED]", {
                questId: itemQuest.id,

                wave: battle.waveIndex,

                pokemon: enemy.name,

                pokemonId: enemy.id,

                itemId: itemQuest.targetItemId,

                itemName: itemQuest.targetItemName,
              });
            } else {
              console.warn("[QUEST_ITEM_HELD_INVALID_TYPE]", {
                itemId: itemQuest.targetItemId,
              });
            }
          }
        }
      }

      if (battle.battleType === BattleType.TRAINER && globalScene.currentBattle.trainer) {
        globalScene.currentBattle.trainer.genAI(globalScene.getEnemyParty());
      }

      globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
        const shouldSave = !this.loaded || kecleonShopManager.isTheftBattleActive();

        if (shouldSave) {
          globalScene.gameData
            .saveAll(true, battle.waveIndex % 5 === 1 || (globalScene.lastSavePlayTime ?? 0) >= 300)
            .then(success => {
              globalScene.disableMenu = false;

              if (!success) {
                globalScene.reset(true);
                return;
              }

              this.doEncounter();
              globalScene.resetSeed();
            });
        } else {
          this.doEncounter();
          globalScene.resetSeed();
        }
      });
    });
  }

  // ========================================
  // 미스터리타임 시작 카운트다운 공통 처리
  // ========================================
  protected tryStartMysteryTimeCountdown(onComplete: () => void): boolean {
    const currentWave = globalScene.currentBattle.waveIndex;

    const shouldPlayMysteryTimeCountdown =
      !this.loaded
      && !this.mysteryTimeCountdownPlayed
      && mysteryTimeManager.isActive()
      && mysteryTimeManager.getStartWave() === currentWave;

    if (!shouldPlayMysteryTimeCountdown) {
      return false;
    }

    this.mysteryTimeCountdownPlayed = true;

    const countdownPhase = globalScene.phaseManager.create("MysteryTimeCountdownPhase", () => {
      // 3 → 2 → 1이 완전히 끝난 순간
      // 미스터리타임 흑백 연출 시작
      globalScene.toggleMysteryTimeGrayscale(true);

      console.log("[MYSTERY_TIME_VISUAL_STARTED]", {
        wave: currentWave,
      });

      onComplete();
    });

    const overridden = globalScene.phaseManager.overridePhase(countdownPhase);

    if (overridden) {
      console.log("[MYSTERY_TIME_COUNTDOWN_QUEUED]", {
        wave: currentWave,
        phase: this.phaseName,
      });

      return true;
    }

    console.warn("[MYSTERY_TIME_COUNTDOWN_OVERRIDE_FAILED]", {
      wave: currentWave,
      phase: this.phaseName,
    });

    return false;
  }

  protected playEncounterBgm(): void {
    const battle = globalScene.currentBattle;

    if (kecleonShopManager.isTheftBattleActive()) {
      globalScene.playBgm("stop!-thief", true);

      return;
    }

    if (monsterHouseManager.isActive() && battle.battleType === BattleType.WILD) {
      globalScene.playBgm("monster-house", true);

      return;
    }

    globalScene.playBgm(undefined, true);
  }

  doEncounter() {
    if (this.tryStartMysteryTimeCountdown(() => this.doEncounter())) {
      return;
    }

    this.playEncounterBgm();

    const enemyField = globalScene.getEnemyField();

    // 이하 기존 코드 그대로

    globalScene.updateModifiers(false);
    globalScene.setFieldScale(1);

    const { battleType, waveIndex } = globalScene.currentBattle;
    if (
      globalScene.isMysteryEncounterValidForWave(battleType, waveIndex)
      && !globalScene.currentBattle.isBattleMysteryEncounter()
    ) {
      // Increment ME spawn chance if an ME could have spawned but did not
      // Only do this AFTER session has been saved to avoid duplicating increments
      globalScene.mysteryEncounterSaveData.encounterSpawnChance += WEIGHT_INCREMENT_ON_SPAWN_MISS;
    }

    for (const pokemon of globalScene.getPlayerParty()) {
      // Currently, a new wave is not considered a new battle if there is no arena reset
      // Therefore, we only reset wave data here
      if (pokemon) {
        pokemon.resetWaveData();
      }
    }

    globalScene.tweens.add({
      targets: [
        globalScene.arenaEnemy,
        globalScene.currentBattle.trainer,
        enemyField,
        globalScene.arenaPlayer,
        globalScene.trainer,
      ].flat(),
      x: (_target, _key, value, fieldIndex: number) => (fieldIndex < 2 + enemyField.length ? value + 300 : value - 300),
      duration: 2000,
      onComplete: () => {
        if (!this.tryOverrideForBattleSpec()) {
          this.doEncounterCommon();
        }
      },
    });

    const encounterIntroVisuals = globalScene.currentBattle?.mysteryEncounter?.introVisuals;
    if (encounterIntroVisuals) {
      const enterFromRight = encounterIntroVisuals.enterFromRight;
      if (enterFromRight) {
        encounterIntroVisuals.x += 500;
      }
      globalScene.tweens.add({
        targets: encounterIntroVisuals,
        x: enterFromRight ? "-=200" : "+=300",
        duration: 2000,
      });
    }
  }

  private applyMonsterHouseBossQuality(boss: EnemyPokemon): void {
    const rank = monsterHouseManager.getRank();

    const qualityMultipliers = [0, 2, 2.5, 3, 3.5, 4];

    const guaranteedPerfectIvs = [0, 3, 4, 4, 5, 6];

    const multiplier = qualityMultipliers[rank];

    /*
     * 생성자에서 기본 확률 판정을 이미 한 번 했으므로
     * 증가분만 추가 추첨한다.
     */
    const additionalMultiplier = multiplier - 1;

    boss.trySetShinySeed(Math.round(BASE_SHINY_CHANCE * additionalMultiplier));

    /*
     * 일반 야생 포켓몬의 최초 숨특 확률은
     * 1 / BASE_HIDDEN_ABILITY_CHANCE 방식이다.
     *
     * 최초 판정을 이미 마쳤으므로 목표 배율에 도달하는 데
     * 필요한 추가 성공 확률만 계산한다.
     */
    const baseHiddenAbilityProbability = 1 / BASE_HIDDEN_ABILITY_CHANCE;

    const targetHiddenAbilityProbability = Math.min(1, baseHiddenAbilityProbability * multiplier);

    const additionalHiddenAbilityProbability =
      (targetHiddenAbilityProbability - baseHiddenAbilityProbability) / (1 - baseHiddenAbilityProbability);

    const hiddenAbilityThreshold = Math.round(additionalHiddenAbilityProbability * 65536);

    boss.tryRerollHiddenAbilitySeed(hiddenAbilityThreshold);

    const targetPerfectIvs = guaranteedPerfectIvs[rank];

    const improvedIvs = boss.ivs.slice();

    let currentPerfectIvs = improvedIvs.filter(iv => iv === 31).length;

    const candidates = improvedIvs
      .map((iv, index) => ({
        iv,
        index,
      }))
      .filter(entry => entry.iv < 31)
      .map(entry => entry.index);

    // 같은 능력치를 중복 선택하지 않도록 섞는다.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = globalScene.currentBattle.randSeedInt(i + 1);

      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    while (currentPerfectIvs < targetPerfectIvs && candidates.length > 0) {
      const index = candidates.pop();

      if (index === undefined) {
        break;
      }

      improvedIvs[index] = 31;
      currentPerfectIvs++;
    }

    boss.setCustomIVs(improvedIvs);

    console.log("[MONSTER_HOUSE_BOSS_QUALITY]", {
      name: boss.name,
      rank,
      multiplier,
      shiny: boss.isShiny(),
      abilityIndex: boss.abilityIndex,
      hiddenAbility: boss.abilityIndex === 2,
      hiddenAbilityThreshold,
      guaranteedPerfectIvs: targetPerfectIvs,
      actualPerfectIvs: boss.ivs.filter(iv => iv === 31).length,
      ivs: boss.ivs,
    });
  }

  private handleTrainerRescueEncounter(
    trainer: NonNullable<typeof globalScene.currentBattle.trainer>,
    quest: QuestEntry,
  ): void {
    const trainerName = trainer.getName(TrainerSlot.NONE, true);

    console.log("[QUEST_TRAINER_RESCUE_EVENT]", {
      questId: quest.id,
      questTitle: quest.title,
      trainerName,
      trainerType: trainer.config.trainerType,
    });

    globalScene.ui.setMode(UiMode.MESSAGE);

    // 1. 구조 대상 발견 메시지
    globalScene.ui.showText(
      i18next.t("battle:questTrainerFound", {
        trainerName,
      }),
      null,
      () => {
        // 2. 구조 대상 트레이너의 감사 대사
        globalScene.ui.showDialogue(i18next.t("battle:questTrainerThanks"), trainerName, null, () => {
          console.log("[QUEST_TRAINER_RESCUE_DIALOGUE_END]", {
            questId: quest.id,
            trainerName,
          });

          // 3. 구조 대상 트레이너 퇴장
          globalScene.tweens.add({
            targets: trainer,
            x: trainer.x + 300,
            duration: 750,
            ease: "Sine.easeIn",

            onComplete: () => {
              trainer.setVisible(false);

              console.log("[QUEST_TRAINER_RESCUE_DEPARTED]", {
                questId: quest.id,
                trainerName,
              });

              globalScene.phaseManager.unshiftNew("QuestClearPromptPhase");

              this.end();
            },
          });
        });
      },
      1500,
      true,
    );
  }

  getEncounterMessage(): string {
    const enemyField = globalScene.getEnemyField();

    if (monsterHouseManager.isActive() && globalScene.currentBattle.battleType === BattleType.WILD) {
      return "몬스터소굴이다!";
    }

    if (enemyField.length === 0) {
      console.warn("[ENCOUNTER_MESSAGE_NO_ENEMY]", {
        wave: globalScene.currentBattle.waveIndex,
        battleType: globalScene.currentBattle.battleType,
      });

      return "";
    }

    if (globalScene.currentBattle.battleSpec === BattleSpec.FINAL_BOSS) {
      return i18next.t("battle:bossAppeared", {
        bossName: getPokemonNameWithAffix(enemyField[0]),
      });
    }

    if (globalScene.currentBattle.battleType === BattleType.TRAINER) {
      if (globalScene.currentBattle.double) {
        return i18next.t("battle:trainerAppearedDouble", {
          trainerName: globalScene.currentBattle.trainer?.getName(TrainerSlot.NONE, true),
        });
      }
      return i18next.t("battle:trainerAppeared", {
        trainerName: globalScene.currentBattle.trainer?.getName(TrainerSlot.NONE, true),
      });
    }

    return enemyField.length === 1
      ? i18next.t("battle:singleWildAppeared", {
          pokemonName: enemyField[0].getNameToRender(),
        })
      : i18next.t("battle:multiWildAppeared", {
          pokemonName1: enemyField[0].getNameToRender(),
          pokemonName2: enemyField[1].getNameToRender(),
        });
  }

  doEncounterCommon(showEncounterMessage = true) {
    const enemyField = globalScene.getEnemyField();

    if (globalScene.currentBattle.battleType === BattleType.WILD) {
      if (monsterHouseManager.isActive() && this.monsterHouseIntroVisuals && showEncounterMessage) {
        const intro = this.monsterHouseIntroVisuals;

        intro.show().then(() => {
          globalScene.ui.showText(
            "몬스터소굴이다!",
            null,
            () => {
              intro.hide().then(() => {
                intro.cleanup();
                this.monsterHouseIntroVisuals = null;
                this.revealMonsterHouseBattle(enemyField);
              });
            },
            1500,
            true,
          );
        });

        return;
      }

      for (const enemyPokemon of enemyField) {
        enemyPokemon.untint(100, "Sine.easeOut");
        enemyPokemon.cry();
        enemyPokemon.showInfo();
        if (enemyPokemon.isShiny()) {
          globalScene.validateAchv(achvs.SEE_SHINY);
        }
      }
      globalScene.updateFieldScale();
      if (showEncounterMessage) {
        const enemyPokemon = enemyField[0];

        const isQuestCatchTarget =
          enemyPokemon
          && questManager.isActiveCatchQuestTarget(enemyPokemon.species.speciesId, globalScene.currentBattle.waveIndex);

        const encounterMessage = isQuestCatchTarget
          ? `의뢰 대상인 ${enemyPokemon.getNameToRender()}을 발견했다!`
          : this.getEncounterMessage();

        if (isQuestCatchTarget) {
          console.log("[QUEST_CATCH_TARGET_FOUND]", {
            speciesId: enemyPokemon.species.speciesId,
            speciesName: enemyPokemon.getNameToRender(),
            wave: globalScene.currentBattle.waveIndex,
          });
        }

        globalScene.ui.showText(encounterMessage, null, () => this.end(), 1500);
      } else {
        this.end();
      }
    } else if (globalScene.currentBattle.battleType === BattleType.TRAINER) {
      const trainer = globalScene.currentBattle.trainer;

      const rescueQuest = questManager.getActiveTrainerRescueQuest(globalScene.currentBattle.waveIndex);

      if (!this.loaded && trainer && rescueQuest && rescueQuest.targetTrainerType === trainer.config.trainerType) {
        const completedTrainerQuests = questManager.onTrainerRescued(
          trainer.config.trainerType,
          globalScene.currentBattle.waveIndex,
        );

        if (completedTrainerQuests.length > 0) {
          console.log(
            "[QUEST_TRAINER_FOUND_COMPLETED]",
            completedTrainerQuests.map(quest => ({
              id: quest.id,
              title: quest.title,
            })),
          );

          this.handleTrainerRescueEncounter(trainer, completedTrainerQuests[0]);

          return;
        }
      }

      trainer?.untint(100, "Sine.easeOut");
      trainer?.playAnim();

      const doSummon = () => {
        globalScene.currentBattle.started = true;
        globalScene.playBgm(undefined);
        globalScene.pbTray.showPbTray(globalScene.getPlayerParty());
        globalScene.pbTrayEnemy.showPbTray(globalScene.getEnemyParty());
        const doTrainerSummon = () => {
          this.hideEnemyTrainer();
          const availablePartyMembers = globalScene.getEnemyParty().filter(p => !p.isFainted()).length;
          globalScene.phaseManager.unshiftNew("SummonPhase", 0, false);
          if (globalScene.currentBattle.double && availablePartyMembers > 1) {
            globalScene.phaseManager.unshiftNew("SummonPhase", 1, false);
          }
          this.end();
        };
        if (showEncounterMessage) {
          globalScene.ui.showText(this.getEncounterMessage(), null, doTrainerSummon, 1500, true);
        } else {
          doTrainerSummon();
        }
      };

      const encounterMessages = globalScene.currentBattle.trainer?.getEncounterMessages();

      if (encounterMessages?.length === 0) {
        doSummon();
      } else {
        let message: string;
        globalScene.executeWithSeedOffset(
          () => (message = randSeedItem(encounterMessages)),
          globalScene.currentBattle.waveIndex,
        );
        message = message!; // tell TS compiler it's defined now
        const showDialogueAndSummon = () => {
          globalScene.ui.showDialogue(message, trainer?.getName(TrainerSlot.NONE, true), null, () => {
            globalScene.charSprite.hide().then(() => globalScene.hideFieldOverlay(250).then(() => doSummon()));
          });
        };
        if (globalScene.currentBattle.trainer?.config.hasCharSprite && !globalScene.ui.shouldSkipDialogue(message)) {
          globalScene
            .showFieldOverlay(500)
            .then(() =>
              globalScene.charSprite
                .showCharacter(trainer?.getKey()!, getCharVariantFromDialogue(encounterMessages[0]))
                .then(() => showDialogueAndSummon()),
            ); // TODO: is this bang correct?
        } else {
          showDialogueAndSummon();
        }
      }
    } else if (globalScene.currentBattle.isBattleMysteryEncounter() && globalScene.currentBattle.mysteryEncounter) {
      const encounter = globalScene.currentBattle.mysteryEncounter;
      const introVisuals = encounter.introVisuals;
      introVisuals?.playAnim();

      if (encounter.onVisualsStart) {
        encounter.onVisualsStart();
      } else if (encounter.spriteConfigs && introVisuals) {
        // If the encounter doesn't have any special visual intro, show sparkle for shiny Pokemon
        introVisuals.playShinySparkles();
      }

      const doEncounter = () => {
        const doShowEncounterOptions = () => {
          globalScene.ui.clearText();
          globalScene.ui.getMessageHandler().hideNameText();

          globalScene.phaseManager.unshiftNew("MysteryEncounterPhase");
          this.end();
        };

        if (showEncounterMessage) {
          const introDialogue = encounter.dialogue.intro;
          if (!introDialogue) {
            doShowEncounterOptions();
          } else {
            const FIRST_DIALOGUE_PROMPT_DELAY = 750;
            let i = 0;
            const showNextDialogue = () => {
              const nextAction = i === introDialogue.length - 1 ? doShowEncounterOptions : showNextDialogue;
              const dialogue = introDialogue[i];
              const title = getEncounterText(dialogue?.speaker);
              const text = getEncounterText(dialogue.text)!;
              i++;
              if (title) {
                globalScene.ui.showDialogue(
                  text,
                  title,
                  null,
                  nextAction,
                  0,
                  i === 1 ? FIRST_DIALOGUE_PROMPT_DELAY : 0,
                );
              } else {
                globalScene.ui.showText(text, null, nextAction, i === 1 ? FIRST_DIALOGUE_PROMPT_DELAY : 0, true);
              }
            };

            if (introDialogue.length > 0) {
              showNextDialogue();
            }
          }
        } else {
          doShowEncounterOptions();
        }
      };

      const encounterMessage = i18next.t("battle:mysteryEncounterAppeared");

      if (!encounterMessage) {
        doEncounter();
      } else {
        doTrainerExclamation();
        globalScene.ui.showDialogue(encounterMessage, "???", null, () => {
          globalScene.charSprite.hide().then(() => globalScene.hideFieldOverlay(250).then(() => doEncounter()));
        });
      }
    }
  }

  end() {
    console.log("[ENCOUNTER_END_TEST]", {
      loaded: this.loaded,
      mode: GameModes[globalScene.gameMode.modeId],
      wave: globalScene.currentBattle.waveIndex,
    });

    const enemyField = globalScene.getEnemyField();

    enemyField.forEach((enemyPokemon, e) => {
      if (enemyPokemon.isShiny(true)) {
        globalScene.phaseManager.unshiftNew("ShinySparklePhase", BattlerIndex.ENEMY + e);
      }

      /** This sets Eternatus' held item to be untransferrable, preventing it from being stolen */
      if (
        enemyPokemon.species.speciesId === SpeciesId.ETERNATUS
        && (globalScene.gameMode.isBattleClassicFinalBoss(globalScene.currentBattle.waveIndex)
          || globalScene.gameMode.isEndlessMajorBoss(globalScene.currentBattle.waveIndex))
      ) {
        const enemyMBH = globalScene.findModifier(
          m => m instanceof TurnHeldItemTransferModifier,
          false,
        ) as TurnHeldItemTransferModifier;

        if (enemyMBH) {
          globalScene.removeModifier(enemyMBH, true);
          enemyMBH.setTransferrableFalse();
          globalScene.addEnemyModifier(enemyMBH);
        }
      }
    });

    if (![BattleType.TRAINER, BattleType.MYSTERY_ENCOUNTER].includes(globalScene.currentBattle.battleType)) {
      const ivScannerModifier = globalScene.findModifier(m => m instanceof IvScannerModifier);

      if (ivScannerModifier) {
        enemyField.map(p => globalScene.phaseManager.pushNew("ScanIvsPhase", p.getBattlerIndex()));
      }
    }

    // ======================================
    // 주간 / 월간 최종보스 시작 기믹
    // loaded 여부와 관계없이 실행
    // ======================================
    console.log("[ENCOUNTER_END] 버프 호출 직전");

    this.applyGeneratedFinalBossStartBuffs();

    console.log("[ENCOUNTER_END] 버프 호출 완료");

    // ======================================
    // 신규 Encounter일 때만 기존 초기화
    // ======================================
    const availablePartyMembers = globalScene.getPokemonAllowedInBattle();

    // 리셋/로드 후에도 자연재해 처리
    globalScene.phaseManager.pushNew("NaturalDisasterPhase");

    // 리셋/로드 후에도 함정 처리
    globalScene.phaseManager.pushNew("TrapPhase");

    if (!this.loaded || kecleonShopManager.isTheftBattleActive()) {
      if (!availablePartyMembers[0].isOnField()) {
        globalScene.phaseManager.pushNew("SummonPhase", 0);
      }

      if (globalScene.currentBattle.double) {
        if (availablePartyMembers.length > 1) {
          globalScene.phaseManager.pushNew("ToggleDoublePositionPhase", true);

          if (!availablePartyMembers[1].isOnField()) {
            globalScene.phaseManager.pushNew("SummonPhase", 1);
          }
        }
      } else {
        if (availablePartyMembers.length > 1 && availablePartyMembers[1].isOnField()) {
          globalScene.phaseManager.pushNew("ReturnPhase", 1);
        }

        globalScene.phaseManager.pushNew("ToggleDoublePositionPhase", false);
      }

      if (
        globalScene.currentBattle.battleType !== BattleType.TRAINER
        && (globalScene.currentBattle.waveIndex > 1 || !globalScene.gameMode.isDaily)
      ) {
        const minPartySize = globalScene.currentBattle.double ? 2 : 1;

        if (availablePartyMembers.length > minPartySize) {
          globalScene.phaseManager.pushNew("CheckSwitchPhase", 0, globalScene.currentBattle.double);

          if (globalScene.currentBattle.double) {
            globalScene.phaseManager.pushNew("CheckSwitchPhase", 1, globalScene.currentBattle.double);
          }
        }
      }
    }

    handleTutorial(Tutorial.Access_Menu).then(() => super.end());

    globalScene.phaseManager.pushNew("InitEncounterPhase");
  }

  tryOverrideForBattleSpec(): boolean {
    switch (globalScene.currentBattle.battleSpec) {
      case BattleSpec.FINAL_BOSS: {
        const enemy = globalScene.getEnemyPokemon();
        globalScene.ui.showText(
          this.getEncounterMessage(),
          null,
          () => {
            const localizationKey = "battleSpecDialogue:encounter";
            if (globalScene.ui.shouldSkipDialogue(localizationKey)) {
              // Logging mirrors logging found in dialogue-ui-handler
              console.log(`Dialogue ${localizationKey} skipped`);
              this.doEncounterCommon(false);
            } else {
              const count = 5643853 + globalScene.gameData.gameStats.classicSessionsPlayed;
              // The line below checks if an English ordinal is necessary or not based on whether an entry for encounterLocalizationKey exists in the language or not.
              const ordinalUsed =
                !i18next.exists(localizationKey, { fallbackLng: [] }) || i18next.resolvedLanguage === "en"
                  ? i18next.t("battleSpecDialogue:key", {
                      count,
                      ordinal: true,
                    })
                  : "";
              const cycleCount = count.toLocaleString() + ordinalUsed;
              const genderIndex = globalScene.gameData.gender ?? PlayerGender.UNSET;
              const genderStr = PlayerGender[genderIndex].toLowerCase();
              const encounterDialogue = i18next.t(localizationKey, {
                context: genderStr,
                cycleCount,
              });
              if (!globalScene.gameData.getSeenDialogues()[localizationKey]) {
                globalScene.gameData.saveSeenDialogue(localizationKey);
              }
              globalScene.ui.showDialogue(encounterDialogue, enemy?.species.name, null, () => {
                this.doEncounterCommon(false);
              });
            }
          },
          1500,
          true,
        );
        return true;
      }
    }
    return false;
  }

  /**
   * Set biome weather if and only if this encounter is the start of a new biome.
   *
   * By using function overrides, this should happen if and only if this phase
   * is exactly a NewBiomeEncounterPhase or an EncounterPhase (to account for
   * Wave 1 of a Daily Run), but NOT NextEncounterPhase (which starts the next
   * wave in the same biome).
   */
  trySetWeatherIfNewBiome(): void {
    if (!this.loaded) {
      globalScene.arena.trySetWeather(getRandomWeatherType(globalScene.arena));
    }
  }
}
