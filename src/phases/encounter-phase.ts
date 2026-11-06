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
import { theOther300Story } from "#data/theother/theother-300-story";
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

// 디 아더 스토리 보스 층수별 첫 등장 종족.
// 25층 3대/55층 6대 및 전투 중 폭주·외피 파괴는 별도 전투 로직이 필요합니다.
const THEOTHER_MONSTER_WAVES: Partial<Record<number, MysteryMonsterId>> = {
  8: MysteryMonsterId.ROBOKID,
  95: MysteryMonsterId.MFO,
  145: MysteryMonsterId.MFO,
  195: MysteryMonsterId.MNO248,
};

export class EncounterPhase extends BattlePhase {
  // Union type is necessary as this is subclassed, and typescript will otherwise complain
  public readonly phaseName: "EncounterPhase" | "NextEncounterPhase" | "NewBiomeEncounterPhase" = "EncounterPhase";
  private loaded: boolean;
  private tutorialIntroShown = false;
  private tutorialStoryShown = false;
  private classicPrologueShown = false;
  private theOtherPrologueShown = false;
  private theOtherRobokidIntroShown = false;
  private theOtherMfoIntroShown = false;
  private theOtherMfo55IntroShown = false;
  private theOtherMfo95IntroShown = false;
  private theOtherMno248195IntroShown = false;
  private theOtherMfo145IntroShown = false;
  private theOtherZinnia245IntroShown = false;
  private theOtherZinnia295IntroShown = false;
  private theOtherZinnia300IntroShown = false;
  private theOtherMfo55OutroShown = false;

  private monsterHouseIntroVisuals: MonsterHouseIntroVisuals | null = null;

  /** 현재 조우에서 게이트 제안은 한 번만 처리합니다. */
  private mysteryGateDecisionResolved = false;

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

  private getHardDifficultyBoostStats(count: number): Stat[] {
    const candidates = [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];

    const selected: Stat[] = [];

    for (let i = 0; i < count && candidates.length > 0; i++) {
      const index = randSeedInt(candidates.length);
      selected.push(candidates.splice(index, 1)[0]);
    }

    return selected;
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

    // 미스터리게이트: 실제 적/세이브 초기화 전에 입장 여부를 선택합니다.
    // 거절해도 동일 웨이브에서 재추첨하거나 재질문하지 않습니다.
    const gateBattle = globalScene.currentBattle;
    if (
      !this.mysteryGateDecisionResolved
      && !this.loaded
      && gateBattle.battleType === BattleType.WILD
      && !gateBattle.isBattleMysteryEncounter()
      && !mysteryTimeManager.isActive()
      && !monsterHouseManager.isActive()
      && !kecleonShopManager.isTheftBattleActive()
      && mysteryTimeManager.shouldSpawn()
    ) {
      this.mysteryGateDecisionResolved = true;
      const resume = (enter: boolean) => {
        if (enter) {
          // 기존 등급/불길한 개체/보스/저장 로직을 그대로 사용합니다.
          // 5웨이브를 넘지 않으며 보호된 고정 전투 앞에서는 더 일찍 끝납니다.
          mysteryTimeManager.start(gateBattle.waveIndex, undefined, 5);
          console.log("[MYSTERY_GATE_ENTER]", {
            startWave: mysteryTimeManager.getStartWave(),
            endWave: mysteryTimeManager.getEndWave(),
          });
        } else {
          console.log("[MYSTERY_GATE_DECLINED]", { wave: gateBattle.waveIndex });
        }
        this.start();
      };

      void globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
        globalScene.ui.showText("미스터리게이트를 발견했다! 넘어가볼까?", null, () => {
          void globalScene.ui
            .setModeWithoutClear(
              UiMode.CONFIRM,
              () => resume(true),
              () => resume(false),
              null,
              null,
              null,
              300,
            )
            .then(() => globalScene.ui.getHandler().setCursor(1));
        });
      });
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

    // HARD 300층 확장 도중에는 정상 진행하도록 허용합니다.
    if (
      globalScene.gameMode.isClassic
      && globalScene.currentBattle.waveIndex > globalScene.gameMode.getClassicFinalWave()
    ) {
      globalScene.phaseManager.unshiftNew("GameOverPhase");
    }

    const loadEnemyAssets: Promise<void>[] = [];

    // 디 아더 8층: 로보키드 대화 초상화 리소스 준비.
    // 파일 위치: public/images/cg/robokid.png, public/images/cg/robokid_reckless.png
    // 폭주 그림은 이후 HP 50% 이하 이벤트에서 사용할 수 있도록 함께 등록합니다.
    if (globalScene.gameMode.modeId === GameModes.THEOTHER && wave === 8 && !this.loaded) {
      const portraits: [string, string][] = [
        ["theother_robokid_portrait", "/images/cg/robokid.png"],
        ["theother_robokid_reckless_portrait", "/images/cg/robokid_reckless.png"],
      ];
      const missing = portraits.filter(([key]) => !globalScene.textures.exists(key));
      if (missing.length > 0) {
        loadEnemyAssets.push(
          new Promise<void>(resolve => {
            globalScene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
            for (const [key, path] of missing) {
              globalScene.load.image(key, path);
            }
            if (!globalScene.load.isLoading()) {
              globalScene.load.start();
            }
          }),
        );
      }
    }

    // 디 아더 25층 M.F.O 첫 등장 CG (public/images/cg/m_f_o.png).
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && (wave === 25 || wave === 55 || wave === 95 || wave === 145)
      && !this.loaded
    ) {
      const portraitKey = "theother_mfo_portrait";
      if (!globalScene.textures.exists(portraitKey)) {
        loadEnemyAssets.push(
          new Promise<void>(resolve => {
            globalScene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
            globalScene.load.image(portraitKey, "/images/cg/m_f_o.png");
            if (!globalScene.load.isLoading()) {
              globalScene.load.start();
            }
          }),
        );
      }
    }

    // 145층 변신 및 승리 후 사용할 N.O.2.4.8 초상화 미리 로드.
    if (globalScene.gameMode.modeId === GameModes.THEOTHER && (wave === 145 || wave === 195) && !this.loaded) {
      const portraitKey = "theother_mno248_portrait";
      if (!globalScene.textures.exists(portraitKey)) {
        loadEnemyAssets.push(
          new Promise<void>(resolve => {
            globalScene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
            globalScene.load.image(portraitKey, "/images/cg/m_n_o_2_4_8.png");
            if (!globalScene.load.isLoading()) {
              globalScene.load.start();
            }
          }),
        );
      }
    }

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
      // 예정되어 있던 트레이너전을
      // 미스터리타임 야생전 형식으로 치환
      if (battle.battleType === BattleType.TRAINER) {
        console.log("[TRAINER_BATTLE_SUPPRESSED_BY_MYSTERY_TIME]", {
          wave: battle.waveIndex,
          loaded: this.loaded,
          enemyPartyLength: battle.enemyParty.length,
        });

        (battle as any).battleType = BattleType.WILD;
        (battle as any).trainer = undefined;
        (battle as any).double = false;

        // ========================================
        // 신규 진입일 때만 기존 트레이너 파티 제거
        // ========================================
        // 세이브 로드 상태에서는 game-data.ts가
        // 이미 미스터리언/데몬스터리를 복원했으므로
        // enemyParty를 절대 비우면 안 된다.
        if (!this.loaded) {
          if (battle.enemyLevels && battle.enemyLevels.length > 1) {
            (battle as any).enemyLevels = [battle.enemyLevels[0]];
          }

          battle.enemyParty.length = 0;

          console.log("[MYSTERY_TIME_TRAINER_PARTY_CLEARED]", {
            wave: battle.waveIndex,
          });
        } else {
          console.log("[MYSTERY_TIME_LOADED_PARTY_PRESERVED]", {
            wave: battle.waveIndex,
            enemyPartyLength: battle.enemyParty.length,
            enemies: battle.enemyParty.map(pokemon => pokemon?.name),
          });
        }
      }
    }

    // 미스터리타임 발생 판정은 start()의 게이트 입장 확인 단계에서 처리합니다.

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

    // 의뢰 도구(WILD_HELD) 대상은 더블배틀로 등장하지 않도록 싱글로 고정한다.
    // 적 생성/필드 배치 전에 적용해야 기술 선택 UI도 싱글 기준으로 초기화된다.
    const heldItemQuest = questManager.getActiveHeldItemFindQuest(battle.waveIndex);
    if (
      battle.battleType === BattleType.WILD
      && !battle.isBattleMysteryEncounter()
      && !monsterHouseManager.isActive()
      && !mysteryTimeManager.isMysteryTimeWave(battle.waveIndex)
      && heldItemQuest?.targetItemId
    ) {
      if (battle.double) {
        console.log("[QUEST_ITEM_FORCE_SINGLE]", {
          wave: battle.waveIndex,
          questId: heldItemQuest.id,
          loaded: this.loaded,
          previousEnemyLevels: battle.enemyLevels?.length ?? 0,
        });
      }

      (battle as any).double = false;

      // 새 조우는 중복 생성 자체를 막되, 로드된 포켓몬 데이터는 보존한다.
      if (!this.loaded && battle.enemyLevels && battle.enemyLevels.length > 1) {
        (battle as any).enemyLevels = [battle.enemyLevels[0]];
        battle.enemyParty.length = 0;
      }
    }

    // 디 아더 25층: M.F.O가 투입한 로보키드 3대를 한 마리씩 상대합니다.
    // 전투 시작 전에 전체 적 파티를 만들되, 필드에는 선두 한 마리만 등장합니다.
    if (globalScene.gameMode.modeId === GameModes.THEOTHER && battle.waveIndex === 25 && !this.loaded) {
      const firstLevel = battle.enemyLevels?.[0];
      if (firstLevel !== undefined) {
        (battle as any).enemyLevels = [firstLevel, firstLevel, firstLevel];
        battle.enemyParty.length = 0;
        console.log("[THEOTHER_MFO_DEPLOY_ROBOKIDS]", { wave: 25, count: 3, level: firstLevel });
      }
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

    // 구버전/불완전한 세션에서 야생 포켓몬 파티가 비어 있는 경우만 복구합니다.
    // 폼 변경이나 일반 신규 조우는 이 경로를 타지 않습니다.
    const restoreMissingWildEnemy =
      this.loaded
      && battle.battleType === BattleType.WILD
      && !battle.isBattleMysteryEncounter()
      && !monsterHouseManager.isActive()
      && !mysteryTimeManager.isMysteryTimeWave(battle.waveIndex)
      && !kecleonShopManager.isTheftBattleActive()
      && battle.enemyParty.length === 0
      && encounterEnemyLevels.length > 0;

    if (restoreMissingWildEnemy) {
      console.warn("[ENCOUNTER_RESTORE_MISSING_WILD_ENEMY]", {
        wave: battle.waveIndex,
        enemyLevels: encounterEnemyLevels,
      });
    } else if (this.loaded && battle.battleType === BattleType.WILD && battle.enemyParty.length === 0) {
      console.error("[ENCOUNTER_LOADED_WILD_WITHOUT_ENEMY_LEVELS]", {
        wave: battle.waveIndex,
        enemyLevels: encounterEnemyLevels,
        mysteryEncounter: battle.isBattleMysteryEncounter(),
        monsterHouse: monsterHouseManager.isActive(),
        mysteryTime: mysteryTimeManager.isMysteryTimeWave(battle.waveIndex),
      });
    }

    encounterEnemyLevels.every((level, e) => {
      if (battle.isBattleMysteryEncounter()) {
        return false;
      }

      if (!this.loaded || restoreMissingWildEnemy) {
        const isMysteryTime = mysteryTimeManager.isMysteryTimeWave(battle.waveIndex);

        const isMysteryTimeBoss = isMysteryTime && mysteryTimeManager.shouldSpawnBoss(battle.waveIndex);

        const isMonsterHouseBoss =
          !isMysteryTime && monsterHouseManager.isActive() && e === monsterHouseManager.getBossIndex();

        // ========================================
        // 어나더 모드: 로보키드 고정 보스
        // ========================================
        const otherMonsterId =
          globalScene.gameMode.modeId === GameModes.THEOTHER ? THEOTHER_MONSTER_WAVES[battle.waveIndex] : undefined;

        if (
          globalScene.gameMode.modeId === GameModes.THEOTHER
          && battle.waveIndex === 300
          && globalScene.theOther300Stage > 0
        ) {
          const enemy = globalScene.addEnemyPokemon(
            getPokemonSpecies(SpeciesId.RAYQUAZA),
            level,
            TrainerSlot.NONE,
            true,
          );
          enemy.setTheOtherRayquazaPhase(globalScene.theOther300Stage as 1 | 2);
          enemy.setBoss(true);
          enemy.initBattleInfo();
          battle.enemyParty[e] = enemy;
          console.log("[THEOTHER_RAYQUAZA_SPAWN]", {
            stage: globalScene.theOther300Stage,
            shiny: enemy.shiny,
            variant: enemy.variant,
            ivs: enemy.ivs,
          });
        } else if (otherMonsterId !== undefined) {
          const mysterySpecies = getMysteryMonster(otherMonsterId);
          const storyMonster = globalScene.addMysteryMonster(mysterySpecies, level, TrainerSlot.NONE, true);

          // 보스 HP 세그먼트는 개체 수나 페이즈 개수와 다릅니다.
          storyMonster.setBoss(true, battle.waveIndex === 25 ? 1 : 2);
          storyMonster.initBattleInfo();
          storyMonster.mark = MarkId.NONE;
          battle.enemyParty[e] = storyMonster;
          console.log("[THEOTHER_MONSTER_SPAWN]", {
            wave: battle.waveIndex,
            species: mysterySpecies.name,
            level,
          });
        }

        // ========================================
        // 기존 미스터리타임
        // ========================================
        else if (isMysteryTime) {
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
        globalScene.companionTrainerSprite,
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

  // 히든 에픽 스토리: 특정 층의 안내책자/여정 대사를 전투 전에 한 번만 표시합니다.
  private showTutorialWaveStory(wave: number, onComplete: () => void): void {
    const key = `tutorialStory:wave${String(wave).padStart(2, "0")}`;
    const pages = i18next.t(key).split("\n");
    const showPage = (index: number): void => {
      if (index >= pages.length) {
        onComplete();
        return;
      }
      globalScene.ui.showText(pages[index], null, () => showPage(index + 1), 0, true);
    };
    showPage(0);
  }

  /** 클래식 신규 1층: 튜토리얼을 마친 주인공의 탐사대 합류 심사. */
  private showClassicPrologue(onComplete: () => void): void {
    const femalePlayer = globalScene.gameData.gender === PlayerGender.FEMALE;
    // 미로는 남성 팀장, 미지는 여성 팀장. 남자 주인공: 미지·아이비 / 여자 주인공: 미로·핀.
    const leaderName = femalePlayer ? "미로" : "미지";
    const rivalName = femalePlayer ? "핀" : "아이비";
    const englishLeaderName = femalePlayer ? "Miro" : "Miji";
    const englishRivalName = femalePlayer ? "Finn" : "Ivy";
    const isKorean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");

    // 캡틴R의 비서는 현재 가칭 '페더'입니다. 별도 트레이너 스프라이트는 아직 사용하지 않습니다.
    const ko: [string, string][] = [
      ["캡틴R", "자네가 직접 이곳까지 찾아온 신입이군. 우선 어떤 일이 있었는지 들려주겠나?"],
      ["주인공", "눈을 떠 보니 낯선 곳이었어요. 포켓몬이라는 것도 처음 보는 거였고요."],
      ["페더", "포켓몬을 처음 본다고요? 정말 믿기 어려운 이야기네요."],
      ["캡틴R", "지금까지 구조한 사람들은 대개 이상현상에 휘말려 왔지. 그런데 자네는 스스로 이곳까지 왔다는 건가!"],
      ["페더", "안내서 하나에 의지해 여기까지 오다니, 경험이 부족하더라도 실력만큼은 확실하겠군요."],
      ["캡틴R", "나도 그렇게 생각하네. 마침 최근에 꾸려진 팀이 하나 있지. 아직 팀원이 둘뿐이야."],
      ["페더", `${leaderName}와 ${rivalName}의 팀 말씀이시죠?`],
      ["캡틴R", "맞네. 이 신입도 그 팀의 동료로 받아들이면 좋겠군. 두 사람을 불러 주겠나?"],
      [
        leaderName,
        femalePlayer ? "캡틴! 부르셨나요? 어, 처음 보는 얼굴인데?" : "캡틴, 부르셨어요? 어라, 처음 보는 분이네요!",
      ],
      ["캡틴R", `그래. ${leaderName}, ${rivalName}. 이 친구를 자네들 팀에 합류시키려고 하네.`],
      [
        leaderName,
        femalePlayer ? "새로운 동료요? 좋죠! 우리 팀에 온 걸 환영해!" : "새로운 동료라니 반가워요! 앞으로 잘 부탁해요!",
      ],
      [rivalName, "자, 잠깐만요! 팀원 추가는 저희와 먼저 상의하셨어야 하는 것 아닌가요?"],
      ["캡틴R", "음, 일리 있는 말이군. 그렇다면 자네에게 결정권을 맡기겠네."],
      [rivalName, "……저에게요?"],
      ["캡틴R", "이 신입이 함께 탐사할 만한 실력을 지녔는지, 직접 판단해 주게."],
      [rivalName, "알겠습니다. 그럼 제가 먼저 미지지방으로 떠나겠어요. 직접 확인해 볼게요."],
      [
        leaderName,
        femalePlayer
          ? "핀, 잠깐! 그렇게 서둘러 떠날 필요는 없잖아!"
          : "아이비, 잠깐! 그렇게 서둘러 떠날 필요는 없잖아!",
      ],
      [rivalName, "탐사는 장난이 아니니까. 신입, 정말 실력이 있다면 미지지방에서 만나자."],
      ["페더", "기어이 먼저 출발했네요. 신입에게 너무 부담이 되지 않았으면 좋겠는데……."],
      ["캡틴R", "허허, 좋은 시험이 되겠군. 다만 무리는 하지 말게. 도움이 필요하면 언제든 탐사대에 연락하고."],
      [
        leaderName,
        femalePlayer
          ? "나도 함께할게! 이제부터 잘 부탁해. 우리도 출발하자!"
          : "나도 함께할게요. 자, 우리도 힘내서 출발해 볼까요?",
      ],
    ];
    const en: [string, string][] = [
      ["Captain R", "So you're the newcomer who reached us on your own. Tell me what happened."],
      ["You", "I woke up somewhere unfamiliar. I'd never even seen a Pokemon before."],
      ["Feather", "You've never seen a Pokemon? That's extraordinary."],
      ["Captain R", "Most people we rescue were swept up in strange phenomena. Yet you found your own way here!"],
      ["Feather", "To make it here with just a guidebook takes remarkable potential."],
      ["Captain R", "Indeed. A new exploration team was recently formed, and it only has two members."],
      ["Feather", `${englishLeaderName} and ${englishRivalName}, you mean?`],
      ["Captain R", "Exactly. I'd like this newcomer to join them. Please call them in."],
      [englishLeaderName, "Captain! You wanted to see us? Oh, who's this?"],
      ["Captain R", `${englishLeaderName}, ${englishRivalName}, I'd like this newcomer to join your team.`],
      [englishLeaderName, "A new teammate? Wonderful! Welcome aboard!"],
      [englishRivalName, "W-wait! Shouldn't you have discussed adding a member with us first?"],
      ["Captain R", "A fair point. In that case, I'll leave the decision to you."],
      [englishRivalName, "...To me?"],
      ["Captain R", "See for yourself whether our newcomer is ready to explore alongside you."],
      [englishRivalName, "Understood. I'll head for the Unknown Region first and test their skills myself."],
      [englishLeaderName, `${englishRivalName}! You don't have to rush off like that!`],
      [englishRivalName, "Exploration isn't a game. Newcomer, if you're ready, meet me out there."],
      ["Feather", "Off they go. I hope the newcomer won't feel too pressured..."],
      ["Captain R", "Ha! It should be a fine test. Just don't overdo it, and call us if you need help."],
      [englishLeaderName, "I'll come along too! Let's get going, teammate!"],
    ];
    const lines = isKorean ? ko : en;
    const next = (index: number): void => {
      if (index >= lines.length) {
        onComplete();
        return;
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => next(index + 1));
    };
    next(0);
  }

  /** 디 아더 신규 1층: 이미 접수한 초코 구조 의뢰를 점검하고 수색에 착수합니다. */
  private showTheOtherPrologue(onComplete: () => void): void {
    const femalePlayer = globalScene.gameData.gender === PlayerGender.FEMALE;
    const isKorean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");

    // 남자 주인공: 미로(플레이어)·미지·아이비 / 여자 주인공: 미지(플레이어)·미로·핀
    // 의뢰 접수는 이전 장면에서 끝났으므로 여기서는 현장 수색 계획만 확인합니다.
    const ko: [string, string][] = femalePlayer
      ? [
          ["미로", "좋아! 이제 본격적으로 출발해 볼까?"],
          ["핀", "응! 바닐라가 부탁한 나옹, 초코를 찾는 거였지?"],
          ["미지", "맞아. 아직 어디에 있는지는 모르니까, 작은 단서라도 놓치지 말자."],
          ["미로", "그래. 괜히 서두르다가 중요한 걸 놓치면 안 되니까."],
          ["핀", "초코가 무사히 있었으면 좋겠다. 바닐라도 많이 걱정하고 있었잖아."],
          ["미지", "반드시 찾아보자. 우리 셋이 함께라면 할 수 있을 거야!"],
          ["미로", "좋아! 로그탐사대, 출발!"],
        ]
      : [
          ["미지", "자, 이제 본격적으로 출발하는 거네! 다들 준비됐지?"],
          ["아이비", "응. 바닐라가 부탁한 나옹, 초코를 찾는 거였지?"],
          ["미로", "그래. 아직 어디에 있는지도 모르니까 우선 단서부터 찾아보자."],
          ["미지", "그러게. 초코가 혼자 얼마나 무서워하고 있을지 걱정이야."],
          ["아이비", "걱정만 한다고 달라지는 건 없잖아? 얼른 움직이자."],
          ["미로", "좋아. 혹시 수상한 걸 발견하면 바로 알려줘."],
          ["미지", "알았어! 이번에도 셋이서 힘을 합쳐 보자!"],
        ];
    const en: [string, string][] = femalePlayer
      ? [
          ["Miro", "All right! Ready to get going?"],
          ["Finn", "Yeah! We're looking for Choco, the Meowth Vanilla asked us to find, right?"],
          ["Miji", "Right. We don't know where Choco is yet, so let's keep our eyes open for clues."],
          ["Miro", "Exactly. No point rushing past something important."],
          ["Finn", "I hope Choco's safe. Vanilla looked really worried."],
          ["Miji", "We'll find Choco. We can do this together!"],
          ["Miro", "Okay! Exploration team, let's go!"],
        ]
      : [
          ["Miji", "All right, we're finally heading out! Everyone ready?"],
          ["Ivy", "Yep. We're looking for Choco, the Meowth Vanilla asked us to find."],
          ["Miro", "Right. We don't know where Choco is, so let's look for clues first."],
          ["Miji", "I know. I hope Choco isn't too scared out there."],
          ["Ivy", "Worrying won't find Choco. Come on, let's move."],
          ["Miro", "Okay. Tell us right away if you spot anything strange."],
          ["Miji", "Got it! Let's work together, just like always!"],
        ];

    const lines = isKorean ? ko : en;
    const showLine = (index: number): void => {
      if (index >= lines.length) {
        console.log("[THEOTHER_1F_STORY_END]", { gender: globalScene.gameData.gender });
        onComplete();
        return;
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => showLine(index + 1));
    };
    console.log("[THEOTHER_1F_STORY_START]", { gender: globalScene.gameData.gender });
    showLine(0);
  }

  /** 디 아더 8층: 정체불명의 로보키드와 첫 조우. 전투 중 폭주/승리 후 대사는 별도 페이즈에서 처리. */
  private showTheOtherRobokidIntro(onComplete: () => void): void {
    const femalePlayer = globalScene.gameData.gender === PlayerGender.FEMALE;
    const isKorean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    const ko: [string, string][] = femalePlayer
      ? [
          ["미로", "잠깐, 미지! 저 앞에 뭔가 있어!"],
          ["핀", "어? 저건 뭐지? 처음 보는 포켓몬인데……."],
          ["미지", "포켓몬이 맞긴 한 걸까? 아무래도 기계처럼 생겼어."],
          ["미로", "누가 만든 건지는 몰라도, 분위기가 영 심상치 않은데."],
          ["핀", "자, 잠깐! 이쪽으로 오고 있어!"],
          ["로보키드", "삐빅…… 목표 확인. 전투 모드 가동."],
          ["미지", "조심해! 공격해 온다!"],
        ]
      : [
          ["미지", "잠깐! 미로, 저기 뭔가 있어!"],
          ["아이비", "뭐야, 저건? 포켓몬……은 아닌 것 같은데?"],
          ["미로", "처음 보는 녀석이네. 움직이는 걸 보니 기계 같은데……."],
          ["미지", "혹시 누가 조종하고 있는 걸까?"],
          ["아이비", "모르겠어. 그런데 아무래도 우리를 노리는 것 같아."],
          ["로보키드", "삐빅…… 목표 확인. 전투 모드 가동."],
          ["미로", "온다! 다들 조심해!"],
        ];
    const en: [string, string][] = femalePlayer
      ? [
          ["Miro", "Wait, Miji! Something's up ahead!"],
          ["Finn", "Huh? What's that? I've never seen a Pokemon like it..."],
          ["Miji", "Is it even a Pokemon? It looks more like a machine."],
          ["Miro", "I don't know who made it, but I've got a bad feeling about this."],
          ["Finn", "W-wait! It's coming this way!"],
          ["Robokid", "Beep... Target confirmed. Battle mode engaged."],
          ["Miji", "Watch out! It's attacking!"],
        ]
      : [
          ["Miji", "Wait! Miro, there's something over there!"],
          ["Ivy", "What is that? It doesn't look like a Pokemon..."],
          ["Miro", "Never seen anything like it. Looks mechanical..."],
          ["Miji", "Do you think someone's controlling it?"],
          ["Ivy", "No idea. But I think it's targeting us."],
          ["Robokid", "Beep... Target confirmed. Battle mode engaged."],
          ["Miro", "Here it comes! Everyone, be careful!"],
        ];

    const lines = isKorean ? ko : en;

    // 클래식 라이벌 등장과 같은 암전 오버레이 + 캐릭터 일러스트 연출.
    // fieldUI는 화면 하단에 기준점이 있으므로 Y는 음수 좌표를 사용합니다.
    // 이미지 자체를 전투 포켓몬으로 교체하거나 크기를 변경하지 않습니다.
    const portraitKey = "theother_robokid_portrait";
    let portrait: Phaser.GameObjects.Image | undefined;

    const showLine = (index: number): void => {
      if (index >= lines.length) {
        // 캐릭터를 먼저 퇴장시키고 클래식 라이벌과 동일하게 암전을 해제합니다.
        if (portrait) {
          globalScene.tweens.add({
            targets: portrait,
            alpha: 0,
            x: portrait.x + 24,
            duration: 250,
            onComplete: () => portrait?.destroy(),
          });
        }
        globalScene.hideFieldOverlay(250).then(() => {
          console.log("[THEOTHER_8F_ROBOKID_INTRO_END]");
          onComplete();
        });
        return;
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => showLine(index + 1));
    };

    console.log("[THEOTHER_8F_ROBOKID_INTRO_START]", { gender: globalScene.gameData.gender });
    globalScene.showFieldOverlay(500).then(() => {
      if (globalScene.textures.exists(portraitKey)) {
        // fieldOverlay보다 위에 있도록 동일한 fieldUI 컨테이너에 추가합니다.
        portrait = globalScene.add.image(globalScene.scaledCanvas.width * 0.71, -104, portraitKey);
        portrait.setOrigin(0.5, 0.5);
        portrait.setScale(1.05);
        portrait.setAlpha(0);
        globalScene.fieldUI.add(portrait);
        globalScene.tweens.add({ targets: portrait, alpha: 1, duration: 300 });
      } else {
        console.warn("[THEOTHER_8F_ROBOKID_PORTRAIT_MISSING]", portraitKey);
      }
      showLine(0);
    });
  }

  /** 디 아더 25층: M.F.O 첫 등장과 로보키드 3기 출격 전 대화. */
  private showTheOtherMfoIntro(onComplete: () => void): void {
    const femalePlayer = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    const ko: [string, string][] = femalePlayer
      ? [
          ["시스템", "일행의 앞에 정체불명의 존재가 나타났다."],
          ["미로", "어? 저 앞에 누가 있는데?"],
          ["핀", "뭐지? 처음 보는 녀석이야……."],
          ["미지", "일단 조심하자. 우리를 기다리고 있었던 것 같아."],
          ["M.F.O", "………."],
          ["M.F.O", "외부 개체 접근 확인."],
          ["M.F.O", "해당 구역의 탐색은 허가되지 않았다."],
          ["미지", "넌 누구야? 여기서 뭘 하고 있는 거지?"],
          ["핀", "혹시 초코가 어디 있는지 알아?"],
          ["미로", "영 대답할 생각이 없어 보이는데."],
          ["M.F.O", "탐색 지속 의사 확인."],
          ["M.F.O", "방해 개체 제거 절차를 실행한다."],
          ["시스템", "M.F.O의 뒤에서 낯익은 기계들이 나타났다!"],
          ["핀", "어!? 저 녀석들 어디서 본 것 같은데!?"],
          ["미로", "8층에서 싸웠던 그 기계들이야! 세 대나 있잖아!"],
          ["미지", "저 녀석이 기계들을 움직이고 있는 걸까……?"],
          ["M.F.O", "로보키드 3기, 가동."],
          ["M.F.O", "목표를 제압하라."],
          ["미지", "온다! 다들 조심해!"],
          ["시스템", "M.F.O가 로보키드 3대를 내보냈다!"],
        ]
      : [
          ["시스템", "일행의 앞에 정체불명의 존재가 나타났다."],
          ["미지", "잠깐! 저 앞에 누가 있어!"],
          ["아이비", "뭐야? 저 녀석도 처음 보는 녀석인데……."],
          ["미로", "조심해. 왠지 분위기가 심상치 않아."],
          ["M.F.O", "………."],
          ["M.F.O", "외부 개체 접근 확인."],
          ["M.F.O", "해당 구역의 탐색은 허가되지 않았다."],
          ["미로", "넌 누구지? 여기서 뭘 하고 있는 거야?"],
          ["미지", "혹시 초코에 대해 아는 거라도 있어?"],
          ["아이비", "대답할 생각이 없는 것 같은데."],
          ["M.F.O", "탐색 지속 의사 확인."],
          ["M.F.O", "방해 개체 제거 절차를 실행한다."],
          ["시스템", "M.F.O의 뒤에서 낯익은 기계들이 나타났다!"],
          ["미지", "어!? 저 녀석들……!"],
          ["아이비", "8층에서 싸웠던 그 기계잖아! 그것도 세 대나 있어!"],
          ["미로", "그렇다면 저 녀석이 기계들을 조종하는 건가……?"],
          ["M.F.O", "로보키드 3기, 가동."],
          ["M.F.O", "목표를 제압하라."],
          ["미로", "온다! 다들 준비해!"],
          ["시스템", "M.F.O가 로보키드 3대를 내보냈다!"],
        ];
    const en: [string, string][] = femalePlayer
      ? [
          ["System", "An unidentified figure appeared before the team."],
          ["Miro", "Huh? There's someone up ahead."],
          ["Finn", "Who is that? I've never seen them before..."],
          ["Miji", "Careful. It looks like it was waiting for us."],
          ["M.F.O", "........."],
          ["M.F.O", "External entities detected."],
          ["M.F.O", "Exploration of this sector is not authorized."],
          ["Miji", "Who are you? What are you doing here?"],
          ["Finn", "Do you know where Choco is?"],
          ["Miro", "Doesn't look like it wants to answer."],
          ["M.F.O", "Intent to continue exploration confirmed."],
          ["M.F.O", "Initiating removal procedure."],
          ["System", "Familiar machines appeared behind M.F.O!"],
          ["Finn", "Huh!? Haven't we seen those before!?"],
          ["Miro", "They're the machines we fought on floor eight! Three of them!"],
          ["Miji", "Could that thing be controlling them...?"],
          ["M.F.O", "Activating three Robokid units."],
          ["M.F.O", "Subdue the targets."],
          ["Miji", "Here they come! Everyone, be careful!"],
          ["System", "M.F.O deployed three Robokids!"],
        ]
      : [
          ["System", "An unidentified figure appeared before the team."],
          ["Miji", "Wait! There's someone up ahead!"],
          ["Ivy", "What? I've never seen that one before..."],
          ["Miro", "Be careful. Something feels off."],
          ["M.F.O", "........."],
          ["M.F.O", "External entities detected."],
          ["M.F.O", "Exploration of this sector is not authorized."],
          ["Miro", "Who are you? What are you doing here?"],
          ["Miji", "Do you know anything about Choco?"],
          ["Ivy", "Doesn't seem interested in answering."],
          ["M.F.O", "Intent to continue exploration confirmed."],
          ["M.F.O", "Initiating removal procedure."],
          ["System", "Familiar machines appeared behind M.F.O!"],
          ["Miji", "Huh!? Those things...!"],
          ["Ivy", "The machines from floor eight! There are three of them!"],
          ["Miro", "Does that mean it controls those machines...?"],
          ["M.F.O", "Activating three Robokid units."],
          ["M.F.O", "Subdue the targets."],
          ["Miro", "Here they come! Everyone, get ready!"],
          ["System", "M.F.O deployed three Robokids!"],
        ];
    const lines = korean ? ko : en;
    const key = "theother_mfo_portrait";
    let portrait: Phaser.GameObjects.Image | undefined;
    const showLine = (index: number): void => {
      if (index >= lines.length) {
        if (portrait) {
          globalScene.tweens.add({
            targets: portrait,
            alpha: 0,
            x: portrait.x + 24,
            duration: 250,
            onComplete: () => portrait?.destroy(),
          });
        }
        globalScene.hideFieldOverlay(250).then(onComplete);
        return;
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => showLine(index + 1));
    };
    globalScene.showFieldOverlay(500).then(() => {
      if (globalScene.textures.exists(key)) {
        portrait = globalScene.add.image(globalScene.scaledCanvas.width * 0.71, -104, key);
        portrait.setOrigin(0.5, 0.5);
        // 원본 CG는 가로 182px이므로 기존 로보키드 연출보다 약간 확대합니다.
        portrait.setScale(1.3);
        portrait.setAlpha(0);
        globalScene.fieldUI.add(portrait);
        globalScene.tweens.add({ targets: portrait, alpha: 1, duration: 300 });
      } else {
        console.warn("[THEOTHER_25F_MFO_PORTRAIT_MISSING]", key);
      }
      showLine(0);
    });
  }

  /** 디 아더 55층: M.F.O 두 번째 조우 / 로보키드 6기. */
  private showTheOtherMfo55Intro(onComplete: () => void): void {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const ko = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    const commonStart: [string, string][] = [
      ["시스템", "익숙한 기계음이 들려왔다……."],
      ["M.F.O", "………."],
      ["M.F.O", "대상 재확인. 이전 교전 기록과 일치."],
    ];
    const partners: [string, string][] = female
      ? [
          ["핀", "어!? 저 녀석, 전에 만났던 녀석이잖아!"],
          ["미로", "또 우리 앞을 가로막다니. 이번엔 뭐야?"],
          ["미지", "왜 계속 우리를 공격하는 거지?"],
        ]
      : [
          ["미지", "어!? 저 녀석, 25층에서 봤던……!"],
          ["아이비", "또 나타났네. 이번에도 우릴 방해할 생각이야?"],
          ["미로", "이번엔 무슨 볼일이지?"],
        ];
    const surprise: [string, string][] = female
      ? [
          ["핀", "서, 설마 이번에도 로보키드가 나오는 거야!?"],
          ["미로", "여섯 대나 있어!? 지난번보다 훨씬 많잖아!"],
          ["미지", "침착해! 하나씩 상대하면 돼!"],
        ]
      : [
          ["미지", "잠깐, 설마 또 그 로봇들이야!?"],
          ["아이비", "하나, 둘, 셋…… 여섯 대!? 지난번의 두 배잖아!"],
          ["미로", "숫자가 늘었다고 물러설 순 없지. 다들 준비해!"],
        ];
    const lines: [string, string][] = [
      ...commonStart,
      ...partners,
      ["M.F.O", "이전 전투 결과 분석 완료."],
      ["M.F.O", "대상의 전투 능력은 예상 기준을 초과했다."],
      ["M.F.O", "대응 전력을 증강한다."],
      ["시스템", "M.F.O의 주위에서 여섯 개의 기계음이 울려 퍼졌다!"],
      ...surprise,
      ["M.F.O", "로보키드 6기, 가동."],
      ["M.F.O", "전투 결과를 재검증한다."],
    ];
    const en: [string, string][] = [
      ["System", "A familiar mechanical noise echoed nearby..."],
      ["M.F.O", "........."],
      ["M.F.O", "Targets reacquired. Previous engagement records matched."],
      ...(female
        ? ([
            ["Finn", "It's that thing we met before!"],
            ["Miro", "Blocking our path again? What now?"],
            ["Miji", "Why do you keep attacking us?"],
          ] as [string, string][])
        : ([
            ["Miji", "It's the one from floor 25!"],
            ["Ivy", "You're back? Trying to stop us again?"],
            ["Miro", "What do you want this time?"],
          ] as [string, string][])),
      ["M.F.O", "Previous battle results analyzed."],
      ["M.F.O", "Target combat ability exceeded projections."],
      ["M.F.O", "Increasing response strength."],
      ["System", "Six mechanical sounds rang out around M.F.O!"],
      ...(female
        ? ([
            ["Finn", "D-don't tell me more Robokids!?"],
            ["Miro", "Six of them!? That's twice as many!"],
            ["Miji", "Stay calm! Take them one at a time!"],
          ] as [string, string][])
        : ([
            ["Miji", "Not those robots again!?"],
            ["Ivy", "One, two... six!? Twice as many as last time!"],
            ["Miro", "More of them won't stop us. Get ready!"],
          ] as [string, string][])),
      ["M.F.O", "Activating six Robokid units."],
      ["M.F.O", "Revalidating combat results."],
    ];
    this.showTheOtherMfo55Dialogue(ko ? lines : en, onComplete);
  }

  /** 55층 격파 뒤 이어지는 56층 진입 시의 후일담. 55층 전투 중에는 실행하지 않습니다. */
  private showTheOtherMfo55Outro(onComplete: () => void): void {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const ko = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    const lines: [string, string][] = [
      ["M.F.O", "………."],
      ["M.F.O", "로보키드 6기, 전투 불능."],
      ["M.F.O", "재검증 실패. 대상 전투 능력 재평가."],
      ...(female
        ? ([
            ["핀", "하아…… 이번엔 진짜 힘들었어!"],
            ["미로", "여섯 대를 상대했는데도 아직 부족하다는 거야?"],
            ["미지", "우리를 계속 시험하는 이유가 뭐지?"],
          ] as [string, string][])
        : ([
            ["미지", "하아…… 여섯 대나 상대하려니 정말 힘들었어."],
            ["아이비", "이 정도면 저 녀석도 포기할 때가 되지 않았어?"],
            ["미로", "넌 대체 뭘 확인하려는 거야?"],
          ] as [string, string][])),
      ["M.F.O", "현재 전력으로는 목표 달성 불가."],
      ["M.F.O", "다음 교전에서는 직접 대응한다."],
      ["시스템", "M.F.O는 다시 모습을 감췄다."],
      ...(female
        ? ([
            ["미로", "다음에는 직접 싸우겠다는 뜻인가?"],
            ["핀", "으으…… 벌써부터 불길한데."],
            ["미지", "경계하면서 움직이자. 초코도 계속 찾아야 하니까."],
          ] as [string, string][])
        : ([
            ["아이비", "직접 대응한다고……? 설마 다음엔 저 녀석이 싸우려는 거야?"],
            ["미지", "어쩐지 점점 더 위험해지는 것 같아……."],
            ["미로", "그래도 초코를 찾는 게 먼저야. 계속 가자."],
          ] as [string, string][])),
      ["시스템", "그러나 일행이 미처 눈치채지 못한 곳에서, 누군가가 그 광경을 지켜보고 있었다."],
      ["피아나", "………."],
      ["피아나", "저 녀석들…… 생각보다 제법인데?"],
      ["피아나", "후후, 재미있어지겠어."],
      ["시스템", "피아나는 아무런 기척도 남기지 않은 채 자리를 떠났다."],
    ];
    const en: [string, string][] = [
      ["M.F.O", "........."],
      ["M.F.O", "Six Robokid units incapacitated."],
      ["M.F.O", "Revalidation failed. Reassessing target capabilities."],
      ...(female
        ? ([
            ["Finn", "Phew... That was tough!"],
            ["Miro", "Six weren't enough either?"],
            ["Miji", "Why do you keep testing us?"],
          ] as [string, string][])
        : ([
            ["Miji", "Phew... Six was exhausting!"],
            ["Ivy", "Isn't it time that thing gave up?"],
            ["Miro", "What are you trying to find out?"],
          ] as [string, string][])),
      ["M.F.O", "Current forces insufficient."],
      ["M.F.O", "Next encounter: direct engagement."],
      ["System", "M.F.O disappeared again."],
      ...(female
        ? ([
            ["Miro", "So next time it'll fight us itself?"],
            ["Finn", "That sounds ominous..."],
            ["Miji", "Stay alert. We still need to find Choco."],
          ] as [string, string][])
        : ([
            ["Ivy", "Direct engagement...? Does that mean it'll fight us next time?"],
            ["Miji", "Things are getting dangerous..."],
            ["Miro", "Let's keep going. Finding Choco comes first."],
          ] as [string, string][])),
      ["System", "Unnoticed by the team, someone had been observing everything from the shadows."],
      ["Zinnia", "........."],
      ["Zinnia", "Those kids... better than I expected."],
      ["Zinnia", "Heh. Now this is getting interesting."],
      ["System", "Zinnia slipped away without a trace."],
    ];
    this.showTheOtherMfo55Dialogue(ko ? lines : en, onComplete);
  }

  /** 25층 CG를 55층에도 재사용. 대화가 종료되면 원래 조우 흐름으로 복귀. */
  private showTheOtherMfo55Dialogue(lines: [string, string][], onComplete: () => void): void {
    const key = "theother_mfo_portrait";
    let portrait: Phaser.GameObjects.Image | undefined;
    const advance = (i: number): void => {
      if (i >= lines.length) {
        portrait?.destroy();
        globalScene.hideFieldOverlay(250).then(onComplete);
        return;
      }
      const [speaker, message] = lines[i];
      // 피아나 등장 시 M.F.O 초상화는 숨기고, 관찰자 정체는 대사로만 알려줍니다.
      if ((speaker === "피아나" || speaker === "Zinnia") && portrait) {
        portrait.setVisible(false);
      }
      globalScene.ui.showDialogue(message, speaker, null, () => advance(i + 1));
    };
    globalScene.showFieldOverlay(500).then(() => {
      if (globalScene.textures.exists(key)) {
        portrait = globalScene.add.image(globalScene.scaledCanvas.width * 0.71, -104, key);
        portrait.setOrigin(0.5);
        portrait.setScale(1.3);
        globalScene.fieldUI.add(portrait);
      }
      advance(0);
    });
  }

  /** 디 아더 95층: M.F.O와 첫 직접 대결. */
  private showTheOtherMfo95Intro(onComplete: () => void): void {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    type Line = [string, string];
    const ko: Line[] = [
      ["시스템", "익숙한 기계음이 울려 퍼졌다."],
      ["M.F.O", "………."],
      ["M.F.O", "대상 발견. 세 번째 접촉을 확인했다."],
      ...(female
        ? ([
            ["핀", "저 목소리…… 또 나타났어!"],
            ["미로", "이번에는 로보키드를 몇 대나 데려온 거야?"],
            ["미지", "지난번에 직접 싸우겠다고 했었지?"],
          ] as Line[])
        : ([
            ["미지", "저 목소리…… 설마 또!?"],
            ["아이비", "역시 너였네. 이번엔 로보키드를 몇 대나 데려왔어?"],
            ["미로", "지난번에 직접 상대하겠다고 했었지."],
          ] as Line[])),
      ["M.F.O", "로보키드의 추가 투입은 불필요하다."],
      ["M.F.O", "두 차례의 교전 결과, 일반 전력으로는 제압할 수 없다고 판단했다."],
      ["M.F.O", "따라서 이번에는 내가 직접 상대한다."],
      ...(female
        ? ([
            ["핀", "뭐!? 이번에는 네가 직접 싸우겠다고!?"],
            ["미로", "로보키드를 보내는 건 그만뒀나 보네."],
            ["미지", "왜 계속 우리를 막아서는 거야?"],
          ] as Line[])
        : ([
            ["미지", "드디어 직접 나서겠다는 거야!?"],
            ["아이비", "좋아. 오히려 잘됐네. 더는 부하들 뒤에 숨을 필요 없잖아?"],
            ["미로", "우리를 계속 방해하는 이유부터 말해!"],
          ] as Line[])),
      ["M.F.O", "질문에 응답할 의무는 없다."],
      ["M.F.O", "전투 데이터 수집을 개시한다."],
      ["M.F.O", "직접 제압 절차…… 실행."],
    ];
    const en: Line[] = [
      ["System", "A familiar mechanical noise echoed."],
      ["M.F.O", "........."],
      ["M.F.O", "Targets found. Third contact confirmed."],
      ...(female
        ? ([
            ["Finn", "That voice... It's back!"],
            ["Miro", "How many Robokids this time?"],
            ["Miji", "You said you'd fight us yourself, didn't you?"],
          ] as Line[])
        : ([
            ["Miji", "That voice... Again!?"],
            ["Ivy", "It's you. How many Robokids did you bring?"],
            ["Miro", "You said you'd confront us yourself."],
          ] as Line[])),
      ["M.F.O", "Further Robokid deployment is unnecessary."],
      ["M.F.O", "Two encounters show conventional forces cannot subdue you."],
      ["M.F.O", "Therefore I will engage you directly."],
      ...(female
        ? ([
            ["Finn", "What!? You're fighting us yourself!?"],
            ["Miro", "No more hiding behind Robokids, then."],
            ["Miji", "Why do you keep stopping us?"],
          ] as Line[])
        : ([
            ["Miji", "You're finally going to fight!?"],
            ["Ivy", "Good. No more hiding behind your minions."],
            ["Miro", "Tell us why you keep interfering!"],
          ] as Line[])),
      ["M.F.O", "I am under no obligation to answer."],
      ["M.F.O", "Beginning combat data collection."],
      ["M.F.O", "Direct suppression procedure... execute."],
    ];
    this.showTheOtherMfo55Dialogue(korean ? ko : en, onComplete);
  }

  /** 디 아더 145층: 재구축된 M.F.O 재등장. */
  private showTheOtherMfo145Intro(onComplete: () => void): void {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    type Line = [string, string];
    const ko: Line[] = [
      ["시스템", "일행의 앞에 익숙한 기계음과 함께 M.F.O가 나타났다."],
      ["M.F.O", "………."],
      ["M.F.O", "대상 확인. 전투 데이터 분석 완료."],
      ...(female
        ? ([
            ["핀", "으악! 또 저 녀석이야!?"],
            ["미로", "지난번에 분명 쓰러뜨렸는데……."],
            ["미지", "아직도 우리를 방해하려는 거야?"],
          ] as Line[])
        : ([
            ["미지", "또 너야!? 정말 끈질기네!"],
            ["아이비", "이번에도 우리를 막으려고?"],
            ["미로", "지난번엔 패배했잖아. 아직도 싸울 생각이야?"],
          ] as Line[])),
      ["M.F.O", "이전 교전에서 발생한 전술적 결함 수정 완료."],
      ["M.F.O", "전투 알고리즘 최적화. 출력 제한 일부 해제."],
      ["M.F.O", "이번 교전에서의 패배 가능성…… 허용 범위 이내."],
      ...(female
        ? ([
            ["미로", "결국 더 강해져서 돌아왔다는 거네."],
            ["핀", "아아…… 역시 쉽게 지나가게 해주진 않는구나!"],
            ["미지", "몇 번을 나타나든 결과는 같을 거야."],
          ] as Line[])
        : ([
            ["아이비", "말은 여전히 어렵게 하네."],
            ["미지", "지난번보다 강해졌다는 뜻이지!?"],
            ["미로", "그렇다고 우리가 물러설 것 같아?"],
          ] as Line[])),
      ["M.F.O", "대상의 저항 의사 확인."],
      ["M.F.O", "강화 전투 절차를 실행한다."],
    ];
    const en: Line[] = [
      ["System", "A familiar mechanical sound echoed as M.F.O appeared before the team."],
      ["M.F.O", "........."],
      ["M.F.O", "Targets confirmed. Combat data analysis complete."],
      ...(female
        ? ([
            ["Finn", "Aah! That thing again!?"],
            ["Miro", "We defeated it last time..."],
            ["Miji", "Are you still trying to stop us?"],
          ] as Line[])
        : ([
            ["Miji", "You again!? You're persistent!"],
            ["Ivy", "Here to stop us again?"],
            ["Miro", "You lost last time. Still want to fight?"],
          ] as Line[])),
      ["M.F.O", "Tactical deficiencies from previous engagement corrected."],
      ["M.F.O", "Combat algorithm optimized. Output restrictions partially lifted."],
      ["M.F.O", "Probability of defeat... within acceptable parameters."],
      ...(female
        ? ([
            ["Miro", "So you've come back stronger."],
            ["Finn", "Of course you won't let us pass!"],
            ["Miji", "The outcome won't change."],
          ] as Line[])
        : ([
            ["Ivy", "Still talking in riddles, huh?"],
            ["Miji", "You're stronger than last time!?"],
            ["Miro", "You think that'll make us retreat?"],
          ] as Line[])),
      ["M.F.O", "Targets intend to resist."],
      ["M.F.O", "Commencing enhanced combat protocol."],
    ];
    this.showTheOtherMfo55Dialogue(korean ? ko : en, onComplete);
  }

  /** 디 아더 195층: N.O.2.4.8 재등장 (25% 폭주 이전). */
  private showTheOtherMno248195Intro(onComplete: () => void): void {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    type Line = [string, string];
    const ko: Line[] = [
      ["시스템", "거친 기계음과 함께 N.O.2.4.8이 일행의 앞을 가로막았다."],
      ["N.O.2.4.8", "대상 재포착. 최종 대응 프로토콜 활성화."],
      ...(female
        ? ([
            ["핀", "저 녀석이 또 나타났어!?"],
            ["미로", "145층에서 변신했던 그 녀석이잖아."],
            ["미지", "이번엔 또 뭘 하려는 거야?"],
          ] as Line[])
        : ([
            ["미지", "또 나타났어!?"],
            ["아이비", "지난번에 변신했던 그 기계야."],
            ["미로", "더는 우릴 방해하지 마!"],
          ] as Line[])),
      ["N.O.2.4.8", "이전 교전 기록 검토 완료."],
      ["N.O.2.4.8", "이번 교전에서 모든 가용 전력을 투입한다."],
      ["N.O.2.4.8", "목표 제압 절차…… 최종 실행."],
    ];
    const en: Line[] = [
      ["System", "A harsh mechanical noise sounded as N.O.2.4.8 blocked the team's path."],
      ["N.O.2.4.8", "Targets reacquired. Final response protocol enabled."],
      ...(female
        ? ([
            ["Finn", "It's back again!?"],
            ["Miro", "It transformed back on floor 145."],
            ["Miji", "What are you planning now?"],
          ] as Line[])
        : ([
            ["Miji", "It's back!?"],
            ["Ivy", "That machine transformed last time."],
            ["Miro", "Stop getting in our way!"],
          ] as Line[])),
      ["N.O.2.4.8", "Previous engagement records evaluated."],
      ["N.O.2.4.8", "Deploying all available force in this engagement."],
      ["N.O.2.4.8", "Final suppression procedure... execute."],
    ];
    const lines = korean ? ko : en;
    const key = "theother_mno248_portrait";
    let portrait: Phaser.GameObjects.Image | undefined;
    const finish = () => {
      portrait?.destroy();
      globalScene.hideFieldOverlay(250).then(onComplete);
    };
    const advance = (i: number) => {
      if (i >= lines.length) {
        return finish();
      }
      const [speaker, message] = lines[i];
      globalScene.ui.showDialogue(message, speaker, null, () => advance(i + 1));
    };
    globalScene.showFieldOverlay(500).then(() => {
      if (globalScene.textures.exists(key)) {
        portrait = globalScene.add.image(globalScene.scaledCanvas.width * 0.71, -104, key);
        portrait.setOrigin(0.5).setScale(1.15);
        globalScene.fieldUI.add(portrait);
      }
      advance(0);
    });
  }

  /** 디 아더 245층: 피아나와의 첫 정식 대면. 별도 CG를 요구하지 않습니다. */
  private showTheOtherZinnia245Intro(onComplete: () => void): void {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    type Line = [string, string];
    const ko: Line[] = [
      ["시스템", "길을 따라가던 일행의 앞에 낯선 여성이 모습을 드러냈다."],
      ["피아나", "어머, 여기까지 온 거야? 후후, 꽤 하는걸?"],
      ...(female
        ? ([
            ["핀", "엇? 누구세요?"],
            ["미로", "우리한테 볼일이라도 있어?"],
            ["미지", "혹시 이 근처에서 특별한 나옹을 본 적 있어?"],
          ] as Line[])
        : ([
            ["미지", "어? 누구세요?"],
            ["아이비", "우릴 기다리고 있었던 거야?"],
            ["미로", "혹시 이 근처에서 특별한 나옹을 본 적 있어?"],
          ] as Line[])),
      ["피아나", "나옹? 글쎄~ 그런 이야기는 나중에 하자고."],
      ["피아나", "그보다 너희, 제법 재미있는 여행을 하고 있네."],
      ...(female
        ? ([
            ["핀", "우리 여행이 재미있다고?"],
            ["미지", "우리에 대해 뭘 아는 거야?"],
          ] as Line[])
        : ([
            ["아이비", "무슨 뜻이지?"],
            ["미로", "우리한테 관심을 갖는 이유가 뭐야?"],
          ] as Line[])),
      ["피아나", "그냥 호기심이야. 너희가 얼마나 강한지 직접 보고 싶어졌거든."],
      ["피아나", "자, 한 판 어때? 내 이름은 피아나. 잘 부탁해!"],
      ...(female
        ? ([
            ["미로", "승부라면 피할 이유는 없지."],
            ["미지", "좋아. 대신 끝나면 질문에 대답해 줘!"],
          ] as Line[])
        : ([
            ["미지", "갑자기 승부라니…… 그래도 물러설 순 없겠네!"],
            ["미로", "좋아. 승부가 끝나면 우리 질문에 답해 줘!"],
          ] as Line[])),
      ["피아나", "후후! 어디, 실력 좀 보여 줘!"],
    ];
    const en: Line[] = [
      ["System", "A mysterious woman stepped into the team's path."],
      ["Zinnia", "Oh, you've made it this far? Not bad at all!"],
      ...(female
        ? ([
            ["Finn", "Huh? Who are you?"],
            ["Miro", "Need something from us?"],
            ["Miji", "Have you seen a special Meowth around here?"],
          ] as Line[])
        : ([
            ["Miji", "Who are you?"],
            ["Ivy", "Were you waiting for us?"],
            ["Miro", "Have you seen a special Meowth around here?"],
          ] as Line[])),
      ["Zinnia", "A Meowth? Hmm... Let's talk about that later."],
      ["Zinnia", "You're on quite an interesting adventure."],
      ...(female
        ? ([
            ["Finn", "Interesting?"],
            ["Miji", "What do you know about us?"],
          ] as Line[])
        : ([
            ["Ivy", "What's that supposed to mean?"],
            ["Miro", "Why are you interested in us?"],
          ] as Line[])),
      ["Zinnia", "Just curious. I want to see how strong you really are."],
      ["Zinnia", "How about a battle? Name's Zinnia. Nice to meet you!"],
      ...(female
        ? ([
            ["Miro", "No reason to turn down a battle."],
            ["Miji", "Fine. But answer our questions afterward!"],
          ] as Line[])
        : ([
            ["Miji", "A battle, out of nowhere? Fine!"],
            ["Miro", "Then answer our questions afterward!"],
          ] as Line[])),
      ["Zinnia", "Hehe! Show me what you've got!"],
    ];
    const lines = korean ? ko : en;
    const advance = (index: number): void => {
      if (index >= lines.length) {
        return onComplete();
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => advance(index + 1));
    };
    advance(0);
  }

  /** 디 아더 295층: 피아나와의 재회. 별도 CG 없이 기존 대화창을 사용합니다. */
  private showTheOtherZinnia295Intro(onComplete: () => void): void {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    type Line = [string, string];
    const ko: Line[] = [
      ["시스템", "익숙한 목소리가 일행의 발걸음을 멈춰 세웠다."],
      ["피아나", "어라? 다시 만났네! 후후, 여기까지 올 줄 알았어."],
      ...(female
        ? ([
            ["핀", "앗! 245층에서 만났던 그 사람이야!"],
            ["미로", "피아나였지? 또 승부하러 온 거야?"],
            ["미지", "우릴 기다리고 있었던 거야?"],
          ] as Line[])
        : ([
            ["미지", "어!? 전에 만났던 피아나잖아!"],
            ["아이비", "설마 또 우리랑 싸우려고?"],
            ["미로", "우릴 기다리고 있었던 거야?"],
          ] as Line[])),
      ["피아나", "기다렸다기보단…… 너희가 어디까지 해낼지 궁금했거든."],
      ["피아나", "그때보다 훨씬 단단해진 눈빛이네. 좋아, 이번엔 나도 진심으로 가 볼까?"],
      ...(female
        ? ([
            ["핀", "저번에도 충분히 강했는데, 이번엔 진심이라고!?"],
            ["미로", "어쩐지 분위기가 달라졌어."],
            ["미지", "좋아. 우리도 전력을 다할게."],
          ] as Line[])
        : ([
            ["미지", "저번에도 엄청 강했는데, 더 강해진다고!?"],
            ["아이비", "이번엔 농담하는 분위기가 아닌데."],
            ["미로", "좋아. 우리도 전력을 다하겠어."],
          ] as Line[])),
      ["피아나", "아, 그리고 너희가 찾는 그 나옹 말인데……."],
      ...(female
        ? ([["미지", "초코에 대해 뭔가 알아낸 거야?"]] as Line[])
        : ([["미로", "초코에 대해 뭔가 알고 있는 거야?"]] as Line[])),
      ["피아나", "지금은 답을 주기보다, 너희가 직접 끝까지 가서 확인했으면 해."],
      ["피아나", "그러려면 먼저 나부터 넘어야겠지? 자, 시작하자!"],
    ];
    const en: Line[] = [
      ["System", "A familiar voice brought the team to a halt."],
      ["Zinnia", "Well, look who it is! Hehe, I thought you'd make it this far."],
      ...(female
        ? ([
            ["Finn", "It's the woman we met on floor 245!"],
            ["Miro", "Zinnia, right? Another battle?"],
            ["Miji", "Were you waiting for us?"],
          ] as Line[])
        : ([
            ["Miji", "It's Zinnia again!"],
            ["Ivy", "Are you here to fight us again?"],
            ["Miro", "Were you waiting for us?"],
          ] as Line[])),
      ["Zinnia", "I was curious to see how far you could go."],
      ["Zinnia", "You've grown since last time. This time, I'll give it my all!"],
      ...(female
        ? ([
            ["Finn", "You weren't serious last time!?"],
            ["Miro", "She feels different now."],
            ["Miji", "Then we'll give it everything too."],
          ] as Line[])
        : ([
            ["Miji", "You were already so strong!"],
            ["Ivy", "She's not joking this time."],
            ["Miro", "Then we'll fight with everything we've got."],
          ] as Line[])),
      ["Zinnia", "Oh, and about that Meowth you're looking for..."],
      ...(female
        ? ([["Miji", "You found out something about Choco?"]] as Line[])
        : ([["Miro", "You know something about Choco?"]] as Line[])),
      ["Zinnia", "I'd rather you reach the end and find your own answers."],
      ["Zinnia", "But first, you'll have to get past me. Let's go!"],
    ];
    const lines = korean ? ko : en;
    const advance = (index: number): void => {
      if (index >= lines.length) {
        onComplete();
        return;
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => advance(index + 1));
    };
    advance(0);
  }

  /** 디 아더 300층: 피아나 최종전 도입. 레쿠쟈 연속전은 별도 전투 전환 연결이 필요합니다. */
  private showTheOtherZinnia300Intro(onComplete: () => void): void {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    type Line = [string, string];
    const ko: Line[] = [
      ["시스템", "마침내 길의 끝에 도착했다. 그곳에는 피아나가 기다리고 있었다."],
      ["피아나", "왔구나. 약속대로 마지막에 다시 만났네!"],
      ...(female
        ? ([
            ["핀", "정말 여기까지 왔어……!"],
            ["미로", "피아나, 이제 정말 이야기를 해 줄 거야?"],
            ["미지", "초코는 어디에 있어?"],
          ] as Line[])
        : ([
            ["미지", "정말 끝에 도착했네……!"],
            ["아이비", "피아나, 이제 숨기는 게 뭔지 말해 줘."],
            ["미로", "초코는 어디에 있는 거야?"],
          ] as Line[])),
      ["피아나", "너희가 얼마나 간절하게 찾아왔는지는 알아."],
      ["피아나", "하지만 마지막 답을 듣기 전에…… 나와 한 번만 더 승부해 줘."],
      ...(female
        ? ([
            ["핀", "또 승부!?"],
            ["미로", "이번엔 분위기가 완전히 달라."],
            ["미지", "좋아. 이번에야말로 끝을 보겠어!"],
          ] as Line[])
        : ([
            ["미지", "이제 마지막 승부구나!"],
            ["아이비", "평소보다 훨씬 진지해 보여."],
            ["미로", "좋아. 우리가 여기까지 온 이유를 보여 줄게!"],
          ] as Line[])),
      ["피아나", "후후…… 좋아. 너희의 모든 걸 보여 줘!"],
    ];
    const en: Line[] = [
      ["System", "At the end of the path, Zinnia was waiting."],
      ["Zinnia", "You made it. Just like we promised!"],
      ...(female
        ? ([
            ["Finn", "We really made it!"],
            ["Miro", "Will you finally tell us?"],
            ["Miji", "Where is Choco?"],
          ] as Line[])
        : ([
            ["Miji", "We reached the end!"],
            ["Ivy", "Stop hiding things, Zinnia."],
            ["Miro", "Where is Choco?"],
          ] as Line[])),
      ["Zinnia", "I know how hard you've searched."],
      ["Zinnia", "But before you hear the final answer... battle me one last time."],
      ...(female
        ? ([
            ["Finn", "Again!?"],
            ["Miro", "She's completely serious."],
            ["Miji", "Then let's finish this!"],
          ] as Line[])
        : ([
            ["Miji", "Our final battle!"],
            ["Ivy", "She seems serious."],
            ["Miro", "We'll show you why we came this far!"],
          ] as Line[])),
      ["Zinnia", "Hehe... Show me everything you've got!"],
    ];
    const lines = korean ? ko : en;
    const advance = (index: number): void => {
      if (index >= lines.length) {
        onComplete();
        return;
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => advance(index + 1));
    };
    advance(0);
  }

  doEncounterCommon(showEncounterMessage = true) {
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 300
      && globalScene.theOther300Stage > 0
      && !this.loaded
      && !this.theOtherZinnia300IntroShown
    ) {
      this.theOtherZinnia300IntroShown = true;
      const lines =
        globalScene.theOther300Stage === 1 ? theOther300Story.rayquazaIntro : theOther300Story.rayquazaPhaseTwo;
      const play = (idx: number): void => {
        if (idx >= lines.length) {
          this.doEncounterCommon(showEncounterMessage);
          return;
        }
        const [speaker, message] = lines[idx];
        globalScene.ui.showDialogue(message, speaker, null, () => play(idx + 1));
      };
      play(0);
      return;
    }

    // 300층 피아나 최종전: 새 전투에서 한 번만 전용 도입 대사 출력.
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 300
      && !this.loaded
      && globalScene.theOther300Stage === 0
      && !this.theOtherZinnia300IntroShown
    ) {
      this.theOtherZinnia300IntroShown = true;
      this.showTheOtherZinnia300Intro(() => this.doEncounterCommon(showEncounterMessage));
      return;
    }

    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 295
      && !this.loaded
      && !this.theOtherZinnia295IntroShown
    ) {
      this.theOtherZinnia295IntroShown = true;
      this.showTheOtherZinnia295Intro(() => this.doEncounterCommon(showEncounterMessage));
      return;
    }

    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 245
      && !this.loaded
      && !this.theOtherZinnia245IntroShown
    ) {
      this.theOtherZinnia245IntroShown = true;
      this.showTheOtherZinnia245Intro(() => this.doEncounterCommon(showEncounterMessage));
      return;
    }

    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 195
      && !this.loaded
      && !this.theOtherMno248195IntroShown
    ) {
      this.theOtherMno248195IntroShown = true;
      this.showTheOtherMno248195Intro(() => this.doEncounterCommon(showEncounterMessage));
      return;
    }

    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 145
      && !this.loaded
      && !this.theOtherMfo145IntroShown
    ) {
      this.theOtherMfo145IntroShown = true;
      this.showTheOtherMfo145Intro(() => this.doEncounterCommon(showEncounterMessage));
      return;
    }
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 95
      && !this.loaded
      && !this.theOtherMfo95IntroShown
    ) {
      this.theOtherMfo95IntroShown = true;
      this.showTheOtherMfo95Intro(() => this.doEncounterCommon(showEncounterMessage));
      return;
    }
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 55
      && !this.loaded
      && !this.theOtherMfo55IntroShown
    ) {
      this.theOtherMfo55IntroShown = true;
      this.showTheOtherMfo55Intro(() => this.doEncounterCommon(showEncounterMessage));
      return;
    }
    const isTutorialIntro =
      globalScene.gameMode.modeId === GameModes.TUTORIAL
      && globalScene.currentBattle.waveIndex === 1
      && !this.loaded
      && !this.tutorialIntroShown;

    if (isTutorialIntro) {
      this.tutorialIntroShown = true;

      const introMessages = [
        "tutorialStory:intro01",
        "tutorialStory:intro02",
        "tutorialStory:intro03",
        "tutorialStory:intro04",
        "tutorialStory:intro05",
        "tutorialStory:intro06",
        "tutorialStory:intro07",
        "tutorialStory:intro08",
      ];

      const showIntroMessage = (index: number): void => {
        if (index >= introMessages.length) {
          this.doEncounterCommon(showEncounterMessage);
          return;
        }

        globalScene.ui.showText(i18next.t(introMessages[index]), null, () => showIntroMessage(index + 1), 0, true);
      };

      showIntroMessage(0);
      return;
    }

    // 스토리 장면은 신규 진입 시에만 재생합니다. 로드한 전투에서는 건너뜁니다.
    const tutorialWave = globalScene.currentBattle.waveIndex;
    const tutorialStoryWaves = [5, 8, 10, 15, 16, 20, 22, 25, 26, 30, 32, 35, 36, 40, 45, 46, 48, 49];
    if (
      globalScene.gameMode.modeId === GameModes.TUTORIAL
      && !this.loaded
      && !this.tutorialStoryShown
      && tutorialStoryWaves.includes(tutorialWave)
    ) {
      this.tutorialStoryShown = true;
      this.showTutorialWaveStory(tutorialWave, () => this.doEncounterCommon(showEncounterMessage));
      return;
    }

    // 클래식 모드의 신규 시작(1층)에만 재생; 저장된 1층 전투를 로드하면 반복하지 않습니다.
    if (
      globalScene.gameMode.modeId === GameModes.CLASSIC
      && globalScene.currentBattle.waveIndex === 1
      && !this.loaded
      && !this.classicPrologueShown
    ) {
      this.classicPrologueShown = true;
      this.showClassicPrologue(() => this.doEncounterCommon(showEncounterMessage));
      return;
    }

    // 디 아더 신규 1층 스토리. 저장 데이터 로드 시 재생하지 않습니다.
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 1
      && !this.loaded
      && !this.theOtherPrologueShown
    ) {
      this.theOtherPrologueShown = true;
      this.showTheOtherPrologue(() => this.doEncounterCommon(showEncounterMessage));
      return;
    }

    // 디 아더 8층 로보키드 첫 조우: 신규 진입에서만 대화 후 기존 전투 흐름으로 복귀합니다.
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 8
      && !this.loaded
      && !this.theOtherRobokidIntroShown
    ) {
      this.theOtherRobokidIntroShown = true;
      this.showTheOtherRobokidIntro(() => this.doEncounterCommon(showEncounterMessage));
      return;
    }

    // 디 아더 25층 M.F.O 첫 등장: 전투 자체는 기존 3연전 구성을 유지합니다.
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 25
      && !this.loaded
      && !this.theOtherMfoIntroShown
    ) {
      this.theOtherMfoIntroShown = true;
      this.showTheOtherMfoIntro(() => this.doEncounterCommon(showEncounterMessage));
      return;
    }

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

        globalScene.ui.showText(
          encounterMessage,
          null,
          async () => {
            if (globalScene.gameMode.modeId === GameModes.TUTORIAL && !this.loaded) {
              const wave = globalScene.currentBattle.waveIndex;

              if (wave === 1) {
                await handleTutorial(Tutorial.HE_Battle);
              } else if (wave === 2) {
                await handleTutorial(Tutorial.HE_Capture);
              }
            }

            this.end();
          },
          1500,
        );
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

          const battle = globalScene.currentBattle;
          const enemyParty = globalScene.getEnemyParty();
          const availablePartyMembers = enemyParty.filter(pokemon => pokemon && !pokemon.isFainted()).length;

          const shouldSummonSecond = battle.double && availablePartyMembers > 1;

          console.log("[DOUBLE_SUMMON_CHECK]", {
            wave: battle.waveIndex,
            loaded: this.loaded,
            double: battle.double,
            battleType: battle.battleType,
            enemyLevels: battle.enemyLevels,
            enemyPartyLength: enemyParty.length,
            availablePartyMembers,
            enemyNames: enemyParty.map(p => p?.name),
            shouldSummonSecond,
          });

          // 기존 소환 순서는 유지
          globalScene.phaseManager.unshiftNew("SummonPhase", 0, false);

          if (shouldSummonSecond) {
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

    if (
      !this.loaded
      && globalScene.gameMode.difficulty === "HARD"
      && globalScene.currentBattle.battleType === BattleType.WILD
    ) {
      for (const enemy of globalScene.getEnemyField()) {
        if (!enemy) {
          continue;
        }

        const isFinalBoss = globalScene.currentBattle.battleSpec === BattleSpec.FINAL_BOSS;

        const rarityRank = this.getMonsterHouseRarityRank(enemy);

        const statCount = isFinalBoss ? 5 : !enemy.isBoss() ? 1 : rarityRank >= 3 ? 3 : 2;

        const selectedStats = isFinalBoss
          ? [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD]
          : this.getHardDifficultyBoostStats(statCount);

        globalScene.phaseManager.pushNew("StatStageChangePhase", enemy.getBattlerIndex(), true, selectedStats, 1, true);

        console.log("[HARD_WILD_STAT_BOOST]", {
          pokemon: enemy.name,
          boss: enemy.isBoss(),
          finalBoss: isFinalBoss,
          rarityRank,
          stats: selectedStats.map(stat => Stat[stat]),
          stages: 1,
        });
      }
    }
    // ======================================
    // 신규 Encounter일 때만 기존 초기화
    // ======================================
    const availablePartyMembers = globalScene.getPokemonAllowedInBattle();

    const companionParty = globalScene.getCompanionParty();

    const hasCompanion =
      !!globalScene.currentBattle.companionTrainer && companionParty.some(p => p.isAllowedInBattle());

    // 자연재해는 새로운 일반 조우에서만 한 번 추첨합니다.
    // 저장 데이터 로드 및 캘리몬 추격전에서는 재추첨하지 않습니다.
    if (
      !this.loaded
      && !(
        kecleonShopManager.isTheftBattleActive()
        && kecleonShopManager.isTheftChaseWave(globalScene.currentBattle.waveIndex)
      )
      && !globalScene.currentBattle.isBattleMysteryEncounter()
      && !mysteryTimeManager.isMysteryTimeWave(globalScene.currentBattle.waveIndex)
      && !monsterHouseManager.isActive()
    ) {
      globalScene.phaseManager.pushNew("NaturalDisasterPhase");
    }

    // 리셋/로드 후에도 함정 처리
    globalScene.phaseManager.pushNew("TrapPhase");

    if (!this.loaded || kecleonShopManager.isTheftBattleActive()) {
      if (!availablePartyMembers[0].isOnField()) {
        globalScene.phaseManager.pushNew("SummonPhase", 0);
      }

      if (globalScene.currentBattle.double) {
        globalScene.phaseManager.pushNew("ToggleDoublePositionPhase", true);

        if (hasCompanion) {
          const companionPokemon = companionParty.find(p => p.isAllowedInBattle());

          if (companionPokemon && !companionPokemon.isOnField()) {
            globalScene.phaseManager.pushNew("SummonPhase", 0, true, false, 1);
          }
        } else if (availablePartyMembers.length > 1 && !availablePartyMembers[1].isOnField()) {
          globalScene.phaseManager.pushNew("SummonPhase", 1);
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

        // 적이 전혀 없는 불완전한 세션에서 교체창만 뜨는 현상을 막습니다.
        // 정상적인 야생전의 교체 선택 기능은 그대로 유지됩니다.
        if (availablePartyMembers.length > minPartySize && globalScene.currentBattle.enemyParty.length > 0) {
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
