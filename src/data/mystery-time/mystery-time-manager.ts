import { globalScene } from "#app/global-scene";
import { GameModes } from "#enums/game-modes";
import { MarkId } from "#enums/mark-id";

/**
 * 미스터리타임의 등급.
 *
 * 우선 1~5등급으로 만들어 두고,
 * 이후 등급에 따라
 * - 등장 미스터리언
 * - 특수개체 등장률
 * - 보스
 * - 보상
 * 등을 다르게 설정할 수 있다.
 */
export enum MysteryTimeRank {
  RANK_1 = 1,
  RANK_2,
  RANK_3,
  RANK_4,
  RANK_5,
}

export interface MysteryTimeSaveData {
  active: boolean;

  /** 미스터리타임이 시작된 층 */
  startWave: number | null;

  /** 미스터리타임의 마지막 층 */
  endWave: number | null;

  /** 미스터리타임 등급 */
  rank: MysteryTimeRank;

  ominousSpawned: boolean;

  ominousSpawnWave: number | null;
  /**
   * "불길한 기운이 감도는" 미스터리언을
   * 쓰러뜨렸는지 여부.
   */
  ominousDefeated: boolean;

  /**
   * 보스가 각성했는지 여부.
   * ominousDefeated와 분리해 두면
   * 이후 연출/저장 복구에 사용하기 편하다.
   */
  bossAwakened: boolean;

  /** 미스터리타임 보스를 쓰러뜨렸는지 */
  bossDefeated: boolean;

  /** 클리어 보상을 이미 지급했는지 */
  rewardGranted: boolean;

  /** 미스터리타임 재발동 금지 마지막 층 */
  cooldownUntilWave: number;

  currentSpawnChance?: number;
}

export class MysteryTimeManager {
  private active = false;

  private startWave: number | null = null;
  private endWave: number | null = null;

  private rank: MysteryTimeRank = MysteryTimeRank.RANK_1;

  private ominousSpawnWave: number | null = null;
  private ominousSpawned = false;
  private ominousDefeated = false;
  private bossAwakened = false;
  private bossDefeated = false;

  private rewardGranted = false;

  /**
   * 우선 테스트하기 쉽도록 기본 발생률을
   * 별도 값으로 관리한다.
   *
   * 나중에 증표/이로치/아이템 등에 의해
   * 발생률을 보정하기도 쉬워진다.
   */
  private baseSpawnChance = 10;

  private readonly maxSpawnChance = 25;
  private readonly spawnChanceIncrease = 1;

  private currentSpawnChance = this.baseSpawnChance;

  private cooldownUntilWave = 0;

  /** 종료 후 다시 발생할 수 있기까지의 층 수 */
  private readonly respawnCooldownWaves = 10;

  public reset(): void {
    this.active = false;

    this.startWave = null;
    this.endWave = null;

    this.rank = MysteryTimeRank.RANK_1;

    this.ominousSpawnWave = null;
    this.ominousSpawned = false;
    this.ominousDefeated = false;
    this.bossAwakened = false;
    this.bossDefeated = false;

    this.rewardGranted = false;
  }

  public isActive(): boolean {
    return this.active;
  }

  public getStartWave(): number | null {
    return this.startWave;
  }

  public getEndWave(): number | null {
    return this.endWave;
  }

  public getRank(): MysteryTimeRank {
    return this.rank;
  }

  public hasDefeatedOminous(): boolean {
    return this.ominousDefeated;
  }

  public isBossAwakened(): boolean {
    return this.bossAwakened;
  }

  public isBossDefeated(): boolean {
    return this.bossDefeated;
  }

  public isRewardGranted(): boolean {
    return this.rewardGranted;
  }

  /**
   * 미스터리타임 마지막 층 계산.
   *
   * 예:
   * 32층 시작 -> 40층
   * 43층 시작 -> 원래 50층이지만
   *              50층은 기존 중요 전투층이므로 49층
   *
   * 10의 배수 구간 끝을 기본 종료층으로 삼되,
   * 50의 배수는 피한다.
   */
  private calculateEndWave(startWave: number): number {
    let endWave = Math.floor((startWave - 1) / 10) * 10 + 10;

    if (endWave % 50 === 0) {
      endWave -= 1;
    }

    return Math.max(startWave, endWave);
  }

  private getMinimumSpawnWave(): number {
    return globalScene.gameMode.isDaily ? 21 : 101;
  }

  /**
   * 현재 층에서 미스터리타임을 시작한다.
   */
  public start(waveIndex = globalScene.currentBattle.waveIndex, rank: MysteryTimeRank = MysteryTimeRank.RANK_1): void {
    const minimumSpawnWave = this.getMinimumSpawnWave();

    if (waveIndex < minimumSpawnWave) {
      console.warn("[MYSTERY_TIME_START_BLOCKED_EARLY_WAVE]", {
        wave: waveIndex,
        minimumSpawnWave,
        modeId: globalScene.gameMode.modeId,
        isDaily: globalScene.gameMode.isDaily,
        isClassic: globalScene.gameMode.isClassic,
      });

      return;
    }

    this.active = true;

    this.startWave = waveIndex;
    this.endWave = this.calculateEndWave(waveIndex);

    this.rank = rank;

    this.ominousSpawned = false;
    this.ominousDefeated = false;
    this.bossAwakened = false;
    this.bossDefeated = false;

    this.rewardGranted = false;

    // ========================================
    // 특수 미스터리언 출현층 결정
    // 마지막층은 반드시 제외
    // ========================================
    if (this.startWave !== null && this.endWave !== null && this.startWave < this.endWave) {
      const possibleWaveCount = this.endWave - this.startWave;

      this.ominousSpawnWave = this.startWave + globalScene.currentBattle.randSeedInt(possibleWaveCount);
    } else {
      this.ominousSpawnWave = null;
    }

    console.log("[MYSTERY_TIME_STARTED]", {
      startWave: this.startWave,
      endWave: this.endWave,
      ominousSpawnWave: this.ominousSpawnWave,
      rank: this.rank,
    });
  }

  /**
   * 현재 층이 미스터리타임 구간인지 확인.
   */
  public isMysteryTimeWave(waveIndex: number): boolean {
    if (!this.active || this.startWave === null || this.endWave === null) {
      return false;
    }

    return waveIndex >= this.startWave && waveIndex <= this.endWave;
  }

  /**
   * 현재 층이 미스터리타임 마지막 층인지 확인.
   */
  public isFinalWave(waveIndex: number): boolean {
    return this.active && this.endWave !== null && waveIndex === this.endWave;
  }

  /**
   * 현재 마지막 층에서 보스전을 발생시켜야 하는지.
   */
  public shouldSpawnBoss(waveIndex: number): boolean {
    return this.isFinalWave(waveIndex) && this.bossAwakened && !this.bossDefeated;
  }

  /**
   * 이번 미스터리타임에서
   * 미스터리 증표를 가진 특수 미스터리언을
   * 아직 출현시키지 않았는지 확인.
   */
  public shouldSpawnOminousMonster(waveIndex = globalScene.currentBattle.waveIndex): boolean {
    return (
      this.active
      && this.ominousSpawnWave !== null
      && waveIndex === this.ominousSpawnWave
      && !this.ominousSpawned
      && !this.ominousDefeated
      && !this.bossAwakened
      && !this.isFinalWave(waveIndex)
    );
  }

  /**
   * 미스터리 증표 미스터리언이 실제로 생성됐을 때 호출.
   * 한 미스터리타임에 단 1마리만 생성되도록 잠근다.
   */
  public markOminousMonsterSpawned(): void {
    if (!this.active || this.ominousSpawned) {
      return;
    }

    this.ominousSpawned = true;

    console.log("[MYSTERY_TIME_OMINOUS_SPAWNED]", {
      wave: globalScene.currentBattle.waveIndex,
      startWave: this.startWave,
      endWave: this.endWave,
    });
  }

  /**
   * "불길한 기운이 감도는" 미스터리언을
   * 쓰러뜨렸을 때 호출.
   */
  public defeatOminousMonster(): void {
    if (!this.active || this.ominousDefeated || !this.ominousSpawned || this.ominousSpawnWave === null) {
      return;
    }

    const wave = globalScene.currentBattle.waveIndex;

    // 특수 미스터리언이 나온 바로 그 층에서만 인정
    if (wave !== this.ominousSpawnWave) {
      console.warn("[MYSTERY_TIME_OMINOUS_DEFEAT_REJECTED_WRONG_WAVE]", {
        wave,
        ominousSpawnWave: this.ominousSpawnWave,
      });

      return;
    }

    // 실제 MYSTERY 증표 개체가 존재하며
    // 정말 기절했는지 재검증
    const ominousMonster = globalScene.getEnemyParty().find(pokemon => pokemon && pokemon.mark === MarkId.MYSTERY);

    if (!ominousMonster || !ominousMonster.isFainted()) {
      console.warn("[MYSTERY_TIME_OMINOUS_DEFEAT_REJECTED]", {
        wave,
        found: !!ominousMonster,
        fainted: ominousMonster?.isFainted() ?? false,
      });

      return;
    }

    this.ominousDefeated = true;
    this.bossAwakened = true;

    console.log("[MYSTERY_TIME_BOSS_AWAKENED]", {
      wave,
      startWave: this.startWave,
      endWave: this.endWave,
      rank: this.rank,
    });
  }

  /**
   * 보스 격파 처리.
   */
  public defeatBoss(): void {
    if (!this.active) {
      return;
    }

    this.bossDefeated = true;

    console.log("[MYSTERY_TIME_BOSS_DEFEATED]", {
      wave: globalScene.currentBattle.waveIndex,
      rank: this.rank,
    });
  }

  public markRewardGranted(): void {
    this.rewardGranted = true;
  }

  /**
   * 미스터리타임 종료.
   */
  public finish(): void {
    const finishedWave = globalScene.currentBattle.waveIndex;

    this.cooldownUntilWave = finishedWave + this.respawnCooldownWaves;

    console.log("[MYSTERY_TIME_FINISHED]", {
      startWave: this.startWave,
      endWave: this.endWave,
      rank: this.rank,
      ominousDefeated: this.ominousDefeated,
      bossAwakened: this.bossAwakened,
      bossDefeated: this.bossDefeated,
      finishedWave,
      cooldownUntilWave: this.cooldownUntilWave,
    });

    this.reset();
  }

  /**
   * 테스트용 발생 확률.
   *
   * 실제 연결 단계에서
   * encounter-phase 쪽에서 호출한다.
   */
  public shouldSpawn(): boolean {
    if (this.active) {
      return false;
    }

    const wave = globalScene.currentBattle.waveIndex;

    // ========================================
    // 최소 등장층 제한
    // ========================================
    const minimumSpawnWave = this.getMinimumSpawnWave();

    if (wave < minimumSpawnWave) {
      console.log("[MYSTERY_TIME_BLOCKED_EARLY_WAVE]", {
        mode: GameModes[globalScene.gameMode.modeId],
        wave,
        minimumSpawnWave,
      });

      return false;
    }

    // ========================================
    // 구간 마지막층에서는 시작 금지
    // ========================================
    const prospectiveEndWave = this.calculateEndWave(wave);

    if (wave >= prospectiveEndWave) {
      console.log("[MYSTERY_TIME_BLOCKED_FINAL_WAVE]", {
        wave,
        prospectiveEndWave,
      });

      return false;
    }

    // ========================================
    // 종료 후 10웨이브 쿨다운
    // ========================================
    if (wave <= this.cooldownUntilWave) {
      console.log("[MYSTERY_TIME_COOLDOWN]", {
        wave,
        cooldownUntilWave: this.cooldownUntilWave,
        remaining: this.cooldownUntilWave - wave + 1,
      });

      return false;
    }

    // ========================================
    // 실제 등장 판정
    // ========================================
    const chanceUsed = this.currentSpawnChance;

    const roll = globalScene.currentBattle.randSeedInt(100);

    const spawned = roll < chanceUsed;

    if (!spawned) {
      this.currentSpawnChance = Math.min(this.maxSpawnChance, this.currentSpawnChance + this.spawnChanceIncrease);

      console.log("[MYSTERY_TIME_SPAWN_FAILED]", {
        wave,
        roll,
        chanceUsed,
        nextChance: this.currentSpawnChance,
      });

      return false;
    }

    this.currentSpawnChance = this.baseSpawnChance;

    console.log("[MYSTERY_TIME_SPAWN_SUCCESS]", {
      wave,
      roll,
      chanceUsed,
      nextChance: this.currentSpawnChance,
    });

    return true;
  }

  public setBaseSpawnChance(chance: number): void {
    this.baseSpawnChance = Math.max(0, Math.min(100, chance));
  }

  public getSaveData(): MysteryTimeSaveData {
    return {
      active: this.active,

      startWave: this.startWave,
      endWave: this.endWave,

      rank: this.rank,

      ominousSpawnWave: this.ominousSpawnWave,

      ominousSpawned: this.ominousSpawned,
      ominousDefeated: this.ominousDefeated,
      bossAwakened: this.bossAwakened,
      bossDefeated: this.bossDefeated,

      rewardGranted: this.rewardGranted,

      cooldownUntilWave: this.cooldownUntilWave,

      currentSpawnChance: this.currentSpawnChance,
    };
  }

  public restore(data: MysteryTimeSaveData): void {
    const minimumSpawnWave = this.getMinimumSpawnWave();

    if (data.active && data.startWave !== null && data.startWave < minimumSpawnWave) {
      console.warn("[MYSTERY_TIME_INVALID_SAVE_RESET]", {
        startWave: data.startWave,
        minimumSpawnWave,
        modeId: globalScene.gameMode.modeId,
      });

      this.reset();
      return;
    }

    this.active = data.active;

    this.startWave = data.startWave;
    this.endWave = data.endWave;

    this.rank = data.rank ?? MysteryTimeRank.RANK_1;

    this.ominousSpawnWave = data.ominousSpawnWave ?? null;

    this.ominousSpawned = data.ominousSpawned ?? false;

    this.ominousDefeated = data.ominousDefeated ?? false;

    this.bossAwakened = data.bossAwakened ?? false;

    this.bossDefeated = data.bossDefeated ?? false;

    this.rewardGranted = data.rewardGranted ?? false;

    this.cooldownUntilWave = data.cooldownUntilWave ?? 0;

    this.currentSpawnChance = data.currentSpawnChance ?? this.baseSpawnChance;

    console.log("[MYSTERY_TIME_RESTORE]", {
      active: this.active,
      startWave: this.startWave,
      endWave: this.endWave,
      rank: this.rank,
      ominousDefeated: this.ominousDefeated,
      bossAwakened: this.bossAwakened,
      bossDefeated: this.bossDefeated,
      rewardGranted: this.rewardGranted,
    });
  }
}

export const mysteryTimeManager = new MysteryTimeManager();
