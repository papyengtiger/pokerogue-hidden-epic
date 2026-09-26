import { FixedBattleConfig } from "#app/battle";
import { CHALLENGE_MODE_MYSTERY_ENCOUNTER_WAVES, CLASSIC_MODE_MYSTERY_ENCOUNTER_WAVES } from "#app/constants";
import { globalScene } from "#app/global-scene";
import Overrides from "#app/overrides";
import { allChallenges, type Challenge, copyChallenge } from "#data/challenge";
import {
  getDailyEventSeedBoss,
  getDailyForcedWaveSpecies,
  getDailyStartingBiome,
  getDailyStartingMoney,
} from "#data/daily-seed/daily-run";
import { parseDailySeed } from "#data/daily-seed/daily-seed-utils";
import { allSpecies } from "#data/data-lists";
import type { PokemonSpecies } from "#data/pokemon-species";
import { monthlyFixedBattles } from "#data/trainers/fixed-battle-configs";
import { BiomeId } from "#enums/biome-id";
import { ChallengeType } from "#enums/challenge-type";
import { Challenges } from "#enums/challenges";
import { GameModes } from "#enums/game-modes";
import { SpeciesId } from "#enums/species-id";
import type { Arena } from "#field/arena";
import { classicFixedBattles, type FixedBattleConfigs } from "#trainers/fixed-battle-configs";
import { applyChallenges } from "#utils/challenge-utils";
import { BooleanHolder, randSeedInt, randSeedItem } from "#utils/common";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import i18next from "i18next";

interface GameModeConfig {
  isClassic?: boolean;
  isEndless?: boolean;
  isDaily?: boolean;
  hasTrainers?: boolean;
  hasNoShop?: boolean;
  hasShortBiomes?: boolean;
  hasRandomBiomes?: boolean;
  hasRandomBosses?: boolean;
  isSplicedOnly?: boolean;
  isChallenge?: boolean;
  hasMysteryEncounters?: boolean;
}

export class GameMode implements GameModeConfig {
  public modeId: GameModes;
  public isClassic: boolean;
  public isEndless: boolean;
  public isDaily: boolean;
  public hasTrainers: boolean;
  public hasNoShop: boolean;
  public hasShortBiomes: boolean;
  public hasRandomBiomes: boolean;
  public hasRandomBosses: boolean;
  public isSplicedOnly: boolean;
  public isChallenge: boolean;
  public challenges: Challenge[];
  public battleConfig: FixedBattleConfigs;
  public hasMysteryEncounters: boolean;
  public minMysteryEncounterWave: number;
  public maxMysteryEncounterWave: number;

  constructor(modeId: GameModes, config: GameModeConfig, battleConfig?: FixedBattleConfigs) {
    this.modeId = modeId;
    this.challenges = [];
    Object.assign(this, config);
    if (this.isChallenge) {
      this.challenges = allChallenges.map(c => copyChallenge(c));
    }
    this.battleConfig = battleConfig || {};
  }

  /**
   * Enables challenges if they are disabled and sets the specified challenge's value
   * @param challenge The challenge to set
   * @param value The value to give the challenge. Impact depends on the specific challenge
   */
  setChallengeValue(challenge: Challenges, value: number) {
    if (!this.isChallenge) {
      this.isChallenge = true;
      this.challenges = allChallenges.map(c => copyChallenge(c));
    }
    this.challenges.filter((chal: Challenge) => chal.id === challenge).map((chal: Challenge) => (chal.value = value));
  }

  /**
   * Helper function to see if a GameMode has a specific challenge type
   * @param challenge the Challenges it looks for
   * @returns true if the game mode has that challenge
   */
  hasChallenge(challenge: Challenges): boolean {
    return this.challenges.some(c => c.id === challenge && c.value !== 0);
  }

  /**
   * Helper function to see if a GameMode has any challenges, needed in tests
   * @returns true if the game mode has at least one challenge
   */
  hasAnyChallenges(): boolean {
    return this.challenges.length > 0;
  }

  /**
   * Helper function to see if the game mode is using fresh start
   * @returns true if a fresh start challenge is being applied
   */
  isFreshStartChallenge(): boolean {
    return this.hasChallenge(Challenges.FRESH_START);
  }

  /**
   * Helper function to see if the game mode is using fresh start
   * @returns true if a fresh start challenge is being applied
   */
  isFullFreshStartChallenge(): boolean {
    for (const challenge of this.challenges) {
      if (challenge.id === Challenges.FRESH_START && challenge.value === 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Helper function to get starting level for game mode.
   * @returns either:
   * - starting level override from Overrides.ts
   * - 20 for Daily Runs
   * - 5 for all other modes
   */
  getStartingLevel(): number {
    if (Overrides.STARTING_LEVEL_OVERRIDE > 0) {
      return Overrides.STARTING_LEVEL_OVERRIDE;
    }
    switch (this.modeId) {
      case GameModes.DAILY:
        return 20;
      case GameModes.WEEKLY:
        return 50;
      case GameModes.MONTHLY:
        return 100;
      case GameModes.PRACTICE:
        return 100;
      default:
        return 5;
    }
  }

  /**
   * @returns either:
   * - override from Overrides.ts
   * - 1000
   */
  getStartingMoney(): number {
    if (Overrides.STARTING_MONEY_OVERRIDE > 0) {
      return Overrides.STARTING_MONEY_OVERRIDE;
    }

    switch (this.modeId) {
      // biome-ignore lint/suspicious/noFallthroughSwitchClause: Intentional
      case GameModes.DAILY: {
        const dailyStartingMoney = getDailyStartingMoney();
        if (dailyStartingMoney != null) {
          return dailyStartingMoney;
        }

        return 9999999;
      }

      case GameModes.WEEKLY:
        return 9999999;

      case GameModes.MONTHLY:
        return 9999999;

      case GameModes.PRACTICE:
        return 9999999;

      default:
        return 1000;
    }
  }

  /**
   * @returns either:
   * - override from Overrides.ts
   * - random biome for Daily mode
   * - Town
   */
  getStartingBiome(): BiomeId {
    if (Overrides.STARTING_BIOME_OVERRIDE != null) {
      return Overrides.STARTING_BIOME_OVERRIDE;
    }

    switch (this.modeId) {
      case GameModes.DAILY:
      case GameModes.WEEKLY:
      case GameModes.MONTHLY:
        return getDailyStartingBiome();
      case GameModes.PRACTICE:
        return BiomeId.TUTORIAL_ROOM;
      default:
        return BiomeId.TOWN;
    }
  }

  getWaveForDifficulty(waveIndex: number, ignoreCurveChanges = false): number {
    switch (this.modeId) {
      case GameModes.DAILY:
        return waveIndex + 30 + (!ignoreCurveChanges ? Math.floor(waveIndex / 5) : 0);
      default:
        return waveIndex;
    }
  }

  /**
   * Determines whether or not to generate a trainer
   * @param waveIndex the current floor the player is on (trainer sprites fail to generate on X1 floors)
   * @param arena the current {@linkcode Arena}
   * @returns `true` if a trainer should be generated, `false` otherwise
   */
  isWaveTrainer(waveIndex: number, arena: Arena): boolean {
    /**
     * Daily spawns trainers on floors 5, 15, 20, 25, 30, 35, 40, and 45
     */
    if (this.isDaily) {
      return waveIndex % 10 === 5 || (!(waveIndex % 10) && waveIndex > 10 && !this.isWaveFinal(waveIndex));
    }

    // =========================
    // 주간 모드
    // =========================
    if (this.modeId === GameModes.WEEKLY) {
      const weeklyGymWaves = [10, 30, 50, 70, 90, 110, 130, 149];

      // 관장층은 무조건 트레이너전
      if (weeklyGymWaves.includes(waveIndex)) {
        return true;
      }

      // 일반 트레이너는 5층 단위
      return waveIndex % 10 === 5 && !this.isWaveFinal(waveIndex);
    }

    // =========================
    // 월간 모드
    // =========================
    if (this.modeId === GameModes.MONTHLY) {
      const monthlyGymWaves = [30, 50, 70, 90, 110, 130, 150, 170];

      const monthlyEliteFourWaves = [192, 194, 196, 198];

      const monthlyChampionWave = 199;

      // 관장 / 사천왕 / 챔피언은 무조건 트레이너전
      if (
        monthlyGymWaves.includes(waveIndex)
        || monthlyEliteFourWaves.includes(waveIndex)
        || waveIndex === monthlyChampionWave
      ) {
        return true;
      }

      // 200층은 야생 최종보스
      if (this.isWaveFinal(waveIndex)) {
        return false;
      }

      // 일반 트레이너는 190층 이전까지만 5층 단위
      return waveIndex % 10 === 5 && waveIndex < 190;
    }

    // =========================
    // 기존 일반 모드 로직
    // =========================
    if (waveIndex % 30 === (globalScene.offsetGym ? 0 : 20) && !this.isWaveFinal(waveIndex)) {
      return true;
    }

    if (waveIndex % 10 !== 1 && waveIndex % 10) {
      const trainerChance = arena.getTrainerChance();
      let allowTrainerBattle = true;

      if (trainerChance) {
        const waveBase = Math.floor(waveIndex / 10) * 10;

        for (let w = Math.max(waveIndex - 2, waveBase + 2); w <= Math.min(waveIndex + 2, waveBase + 9); w++) {
          if (w === waveIndex) {
            continue;
          }

          if (w % 30 === (globalScene.offsetGym ? 0 : 20) || this.isFixedBattle(w)) {
            allowTrainerBattle = false;
            break;
          }

          if (w < waveIndex) {
            globalScene.executeWithSeedOffset(() => {
              const waveTrainerChance = arena.getTrainerChance();

              if (!randSeedInt(waveTrainerChance)) {
                allowTrainerBattle = false;
              }
            }, w);

            if (!allowTrainerBattle) {
              break;
            }
          }
        }
      }

      return Boolean(allowTrainerBattle && trainerChance && !randSeedInt(trainerChance));
    }

    return false;
  }

  isTrainerBoss(waveIndex: number, biomeType: BiomeId, offsetGym: boolean): boolean {
    switch (this.modeId) {
      case GameModes.DAILY:
        return waveIndex > 10 && waveIndex < 50 && !(waveIndex % 10);

      case GameModes.WEEKLY:
        return [10, 30, 50, 70, 90, 110, 130, 149].includes(waveIndex);

      case GameModes.MONTHLY:
        return [
          // 월간 관장 8명
          30, 50, 70, 90, 110, 130, 150, 170,

          // 사천왕 4명
          192, 194, 196, 198,

          // 챔피언
          199,
        ].includes(waveIndex);

      default:
        return (
          waveIndex % 30 === (offsetGym ? 0 : 20)
          && (biomeType !== BiomeId.END || this.isClassic || this.isWaveFinal(waveIndex))
        );
    }
  }

  getOverrideSpecies(waveIndex: number): PokemonSpecies | null {
    // ================================
    // 데일리 최종보스
    // ================================
    if (this.modeId === GameModes.DAILY && this.isWaveFinal(waveIndex)) {
      const eventBoss = getDailyEventSeedBoss();

      if (eventBoss?.speciesId != null) {
        return getPokemonSpecies(eventBoss.speciesId);
      }

      const dailyFinalBosses = allSpecies.filter(
        s =>
          (s.subLegendary || s.legendary || s.mythical)
          && s.baseTotal >= 580
          && s.speciesId !== SpeciesId.ETERNATUS
          && s.speciesId !== SpeciesId.ARCEUS,
      );

      return randSeedItem(dailyFinalBosses);
    }

    // ================================
    // 주간 150층 최종보스
    // - 무한다이노 / 아르세우스 참전
    // ================================
    if (this.modeId === GameModes.WEEKLY && this.isWaveFinal(waveIndex)) {
      const weeklyFinalBosses = allSpecies.filter(s => (s.legendary || s.mythical) && s.baseTotal >= 580);

      return randSeedItem(weeklyFinalBosses);
    }

    // ================================
    // 월간 200층 최종보스
    //
    // 여기는 "강화폼의 기본 종"을 뽑습니다.
    // 실제 강화폼 변경은 EncounterPhase에서 합니다.
    //
    // 후보는 이후 계속 추가 가능
    // ================================
    if (this.modeId === GameModes.MONTHLY && this.isWaveFinal(waveIndex)) {
      const monthlyFinalBossIds: SpeciesId[] = [
        SpeciesId.MEWTWO,
        SpeciesId.LATIAS,
        SpeciesId.LATIOS,
        SpeciesId.KYOGRE, // → 원시가이오가
        SpeciesId.GROUDON,
        SpeciesId.RAYQUAZA,
        SpeciesId.DEOXYS,
        SpeciesId.DIALGA, // → 오리진폼
        SpeciesId.PALKIA,
        SpeciesId.HEATRAN,
        SpeciesId.GIRATINA,
        SpeciesId.DARKRAI,
        SpeciesId.SHAYMIN,
        SpeciesId.ARCEUS,
        SpeciesId.TORNADUS,
        SpeciesId.THUNDURUS,
        SpeciesId.LANDORUS,
        SpeciesId.KYUREM,
        SpeciesId.KELDEO,
        SpeciesId.MELOETTA,
        SpeciesId.GENESECT,
        SpeciesId.XERNEAS,
        SpeciesId.ZYGARDE,
        SpeciesId.DIANCIE,
        SpeciesId.HOOPA,
        SpeciesId.NECROZMA,
        SpeciesId.MAGEARNA,
        SpeciesId.ZERAORA,
        SpeciesId.MELMETAL,
        SpeciesId.ZACIAN,
        SpeciesId.ZAMAZENTA,
        SpeciesId.ETERNATUS,
        SpeciesId.URSHIFU,
        SpeciesId.ZARUDE,
        SpeciesId.CALYREX, // → 흑마렉스
        SpeciesId.ENAMORUS,
        SpeciesId.OGERPON,
        SpeciesId.TERAPAGOS,
        SpeciesId.BATTLE_BOND_GRENINJA,
        SpeciesId.ETERNAL_FLOETTE,
        SpeciesId.BLOODMOON_URSALUNA,
      ];

      return getPokemonSpecies(randSeedItem(monthlyFinalBossIds));
    }

    // 데일리 강제 웨이브는 기존대로 유지
    if (this.modeId === GameModes.DAILY) {
      return getDailyForcedWaveSpecies(waveIndex);
    }

    return null;
  }

  /**
   * Checks if wave provided is the final for current or specified game mode
   * @param waveIndex
   * @param modeId game mode
   * @returns if the current wave is final for classic or daily OR a minor boss in endless
   */
  isWaveFinal(waveIndex: number, modeId: GameModes = this.modeId): boolean {
    switch (modeId) {
      case GameModes.CLASSIC:
      case GameModes.CHALLENGE:
      case GameModes.MONTHLY:
        return waveIndex === 200;
      case GameModes.ENDLESS:
      case GameModes.SPLICED_ENDLESS:
        return !(waveIndex % 250);
      case GameModes.DAILY:
        return waveIndex === 50;
      case GameModes.WEEKLY:
        return waveIndex === 150;
    }
  }

  /**
   * Every 10 waves is a boss battle
   * @returns true if waveIndex is a multiple of 10
   */
  isBoss(waveIndex: number): boolean {
    return waveIndex % 10 === 0;
  }

  /**
   * @returns `true` if the current battle is against classic mode's final boss
   */
  isBattleClassicFinalBoss(waveIndex: number): boolean {
    return (this.modeId === GameModes.CLASSIC || this.modeId === GameModes.CHALLENGE) && this.isWaveFinal(waveIndex);
  }

  /**
   * Every 50 waves of an Endless mode is a boss
   * At this time it is paradox pokemon
   * @returns true if waveIndex is a multiple of 50 in Endless
   */
  isEndlessBoss(waveIndex: number): boolean {
    return waveIndex % 50 === 0 && (this.modeId === GameModes.ENDLESS || this.modeId === GameModes.SPLICED_ENDLESS);
  }

  /**
   * Every 250 waves of an Endless mode is a minor boss
   * At this time it is Eternatus
   * @returns true if waveIndex is a multiple of 250 in Endless
   */
  isEndlessMinorBoss(waveIndex: number): boolean {
    return waveIndex % 250 === 0 && (this.modeId === GameModes.ENDLESS || this.modeId === GameModes.SPLICED_ENDLESS);
  }

  /**
   * Every 1000 waves of an Endless mode is a major boss
   * At this time it is Eternamax Eternatus
   * @returns true if waveIndex is a multiple of 1000 in Endless
   */
  isEndlessMajorBoss(waveIndex: number): boolean {
    return waveIndex % 1000 === 0 && (this.modeId === GameModes.ENDLESS || this.modeId === GameModes.SPLICED_ENDLESS);
  }

  /**
   * Checks whether there is a fixed battle on this gamemode on a given wave.
   * @param waveIndex The wave to check.
   * @returns If this game mode has a fixed battle on this wave
   */
  isFixedBattle(waveIndex: number): boolean {
    const dummyConfig = new FixedBattleConfig();
    return (
      this.battleConfig.hasOwnProperty(waveIndex)
      || applyChallenges(ChallengeType.FIXED_BATTLES, waveIndex, dummyConfig)
    );
  }

  /**
   * Returns the config for the fixed battle for a particular wave.
   * @param waveIndex The wave to check.
   * @returns The fixed battle for this wave.
   */
  getFixedBattle(waveIndex: number): FixedBattleConfig {
    const challengeConfig = new FixedBattleConfig();
    if (applyChallenges(ChallengeType.FIXED_BATTLES, waveIndex, challengeConfig)) {
      return challengeConfig;
    }
    return this.battleConfig[waveIndex];
  }

  /**
   * Check if the current game mode has the shop enabled or not
   * @returns Whether the shop is available in the current mode
   */
  public getShopStatus(): boolean {
    const status = new BooleanHolder(!this.hasNoShop);
    applyChallenges(ChallengeType.SHOP, status);
    return status.value;
  }

  getClearScoreBonus(): number {
    switch (this.modeId) {
      case GameModes.CLASSIC:
        return 5000;
      case GameModes.DAILY:
        return 7500;
      case GameModes.CHALLENGE:
        return 5000;
      case GameModes.WEEKLY:
        return 10000;
      case GameModes.MONTHLY:
        return 50000;
      default:
        return 0;
    }
  }

  getEnemyModifierChance(isBoss: boolean): number {
    switch (this.modeId) {
      case GameModes.CLASSIC:
      case GameModes.CHALLENGE:
      case GameModes.DAILY:
        return !isBoss ? 18 : 6;
      case GameModes.WEEKLY:
        return !isBoss ? 16 : 5;
      case GameModes.MONTHLY:
        return !isBoss ? 12 : 3;
      case GameModes.ENDLESS:
      case GameModes.SPLICED_ENDLESS:
        return !isBoss ? 12 : 4;
    }
  }

  getName(): string {
    switch (this.modeId) {
      case GameModes.CLASSIC:
        return i18next.t("gameMode:classic");
      case GameModes.ENDLESS:
        return i18next.t("gameMode:endless");
      case GameModes.SPLICED_ENDLESS:
        return i18next.t("gameMode:endlessSpliced");
      case GameModes.DAILY:
        return i18next.t("gameMode:dailyRun");
      case GameModes.WEEKLY:
        return i18next.t("gameMode:weeklyRun");
      case GameModes.MONTHLY:
        return i18next.t("gameMode:monthlyRun");
      case GameModes.CHALLENGE:
        return i18next.t("gameMode:challenge");
      case GameModes.PRACTICE:
        return i18next.t("gameMode:practice");
    }
  }

  /**
   * Returns the wave range where MEs can spawn for the game mode [min, max]
   */
  getMysteryEncounterLegalWaves(): [number, number] {
    switch (this.modeId) {
      case GameModes.CLASSIC:
        return CLASSIC_MODE_MYSTERY_ENCOUNTER_WAVES;
      case GameModes.CHALLENGE:
        return CHALLENGE_MODE_MYSTERY_ENCOUNTER_WAVES;
      default:
        return [0, 0];
    }
  }

  /**
   * Sets the daily config if the seed is a custom seed.
   * @param seed - The seed to check
   * @returns The seed to use.
   * @remarks
   * If it is not a custom seed, it will return the original seed.
   */
  public trySetCustomDailyConfig(seed: string): string {
    this.dailyConfig = parseDailySeed(seed);
    return this.dailyConfig?.seed ?? seed;
  }

  static getModeName(modeId: GameModes): string {
    switch (modeId) {
      case GameModes.CLASSIC:
        return i18next.t("gameMode:classic");
      case GameModes.ENDLESS:
        return i18next.t("gameMode:endless");
      case GameModes.SPLICED_ENDLESS:
        return i18next.t("gameMode:endlessSpliced");
      case GameModes.DAILY:
        return i18next.t("gameMode:dailyRun");
      case GameModes.WEEKLY:
        return i18next.t("gameMode:weeklyRun");
      case GameModes.MONTHLY:
        return i18next.t("gameMode:monthlyRun");
      case GameModes.CHALLENGE:
        return i18next.t("gameMode:challenge");
    }
  }
}

export function getGameMode(gameMode: GameModes): GameMode {
  switch (gameMode) {
    case GameModes.CLASSIC:
      return new GameMode(
        GameModes.CLASSIC,
        { isClassic: true, hasTrainers: true, hasMysteryEncounters: true },
        classicFixedBattles,
      );
    case GameModes.ENDLESS:
      return new GameMode(GameModes.ENDLESS, {
        isEndless: true,
        hasShortBiomes: true,
        hasRandomBosses: true,
      });
    case GameModes.SPLICED_ENDLESS:
      return new GameMode(GameModes.SPLICED_ENDLESS, {
        isEndless: true,
        hasShortBiomes: true,
        hasRandomBosses: true,
        isSplicedOnly: true,
      });
    case GameModes.DAILY:
      return new GameMode(GameModes.DAILY, {
        isDaily: true,
        hasTrainers: true,
        hasNoShop: true,
      });
    case GameModes.WEEKLY:
      return new GameMode(GameModes.WEEKLY, {
        isDaily: false,
        hasTrainers: true,
        hasNoShop: false,
        hasRandomBosses: true,
        hasMysteryEncounters: false,
      });
    case GameModes.MONTHLY:
      return new GameMode(
        GameModes.MONTHLY,
        {
          isDaily: false,
          hasTrainers: true,
          hasNoShop: false,
          hasRandomBosses: true,
          hasMysteryEncounters: false,
        },
        monthlyFixedBattles,
      );
    case GameModes.CHALLENGE:
      return new GameMode(
        GameModes.CHALLENGE,
        {
          isClassic: true,
          hasTrainers: true,
          isChallenge: true,
          hasMysteryEncounters: true,
        },
        classicFixedBattles,
      );
    case GameModes.PRACTICE:
      return new GameMode(GameModes.PRACTICE, {
        hasNoShop: true,
        hasRandomBiomes: false,
        hasTrainers: false,
      });
  }
}
