import { globalScene } from "#app/global-scene";
import { kecleonShopManager } from "#data/kecleon-shop/kecleon-shop-manager";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { mysteryTimeManager } from "#data/mystery-time/mystery-time-manager";
import { BattleType } from "#enums/battle-type";
import { EncounterPhase } from "#phases/encounter-phase";

/**
 * The phase between defeating an encounter and starting another wild wave.
 * Handles generating, loading and preparing for it.
 */
export class NextEncounterPhase extends EncounterPhase {
  public readonly phaseName: "NextEncounterPhase" | "NewBiomeEncounterPhase" = "NextEncounterPhase";
  start() {
    const waveIndex = globalScene.currentBattle.waveIndex;

    // ========================================
    // 1순위: 캘리몬 추격전
    // ========================================
    if (kecleonShopManager.isTheftChaseWave(waveIndex)) {
      console.log("[KECLEON_THEFT_CHASE_WAVE]", { wave: waveIndex });

      globalScene.phaseManager.clearPhaseQueue(true);

      globalScene.phaseManager.pushNew("KecleonTheftBattlePhase");

      globalScene.phaseManager.shiftPhase();
      return;
    }

    // ========================================
    // 2순위: 이미 진행 중인 미스터리타임
    // 상점 / 소굴 신규 발생 금지
    // ========================================
    if (mysteryTimeManager.isActive()) {
      if (monsterHouseManager.isActive()) {
        console.warn("[MONSTER_HOUSE_CANCELLED_FOR_MYSTERY_TIME]", {
          wave: waveIndex,
        });

        monsterHouseManager.reset();
      }

      super.start();
      return;
    }

    // ========================================
    // 10층 단위에서는 일반 상점/소굴 발생 금지
    // ========================================
    if (waveIndex % 10 === 0) {
      super.start();
      return;
    }

    // ========================================
    // 트레이너전에서는 상점/소굴 발생 금지
    // ========================================
    if (globalScene.currentBattle.battleType === BattleType.TRAINER) {
      if (monsterHouseManager.isActive()) {
        console.log("[MONSTER_HOUSE_BLOCKED_TRAINER]", {
          wave: waveIndex,
        });
      }

      monsterHouseManager.reset();

      super.start();
      return;
    }

    // ========================================
    // 캘리몬 상점
    // ========================================
    const shopOptions = kecleonShopManager.tryGenerateShop(waveIndex);

    if (shopOptions.length > 0) {
      console.log("[KECLEON_SHOP_OVERRIDE_ENCOUNTER]", {
        wave: waveIndex,
      });

      globalScene.phaseManager.clearPhaseQueue(true);

      globalScene.phaseManager.pushNew("KecleonShopPhase");

      globalScene.phaseManager.shiftPhase();
      return;
    }

    // ========================================
    // 몬스터소굴
    // ========================================
    const monsterHouseSpawned = monsterHouseManager.checkSpawn({
      waveIndex,
    });

    if (monsterHouseSpawned) {
      const totalEnemies = globalScene.currentBattle.randSeedInt(30, 7);

      monsterHouseManager.start(totalEnemies);

      console.log("[MONSTER_HOUSE_DETECTED]", {
        waveIndex,
        totalEnemies,
      });
    }

    super.start();
  }

  doEncounter(): void {
    if (this.tryStartMysteryTimeCountdown(() => this.doEncounter())) {
      return;
    }

    this.playEncounterBgm();

    // Reset all player transient wave data/intel before starting a new wild encounter.
    // We exclusively reset wave data here as wild waves are considered one continuous "battle"
    // for lack of an arena transition.
    for (const pokemon of globalScene.getPlayerParty()) {
      if (pokemon) {
        pokemon.resetWaveData();
      }
    }

    globalScene.arenaNextEnemy.setBiome(globalScene.arena.biomeType);
    globalScene.arenaNextEnemy.setVisible(true);

    const enemyField = globalScene.getEnemyField();
    const moveTargets: any[] = [
      globalScene.arenaEnemy,
      globalScene.arenaNextEnemy,
      globalScene.currentBattle.trainer,
      enemyField,
      globalScene.lastEnemyTrainer,
    ];
    const lastEncounterVisuals = globalScene.lastMysteryEncounter?.introVisuals;
    if (lastEncounterVisuals) {
      moveTargets.push(lastEncounterVisuals);
    }
    const nextEncounterVisuals = globalScene.currentBattle.mysteryEncounter?.introVisuals;
    if (nextEncounterVisuals) {
      const enterFromRight = nextEncounterVisuals.enterFromRight;
      if (enterFromRight) {
        nextEncounterVisuals.x += 500;
        globalScene.tweens.add({
          targets: nextEncounterVisuals,
          x: "-=200",
          duration: 2000,
        });
      } else {
        moveTargets.push(nextEncounterVisuals);
      }
    }

    globalScene.tweens.add({
      targets: moveTargets.flat(),
      x: "+=300",
      duration: 2000,
      onComplete: () => {
        globalScene.arenaEnemy.setBiome(globalScene.arena.biomeType);
        globalScene.arenaEnemy.setX(globalScene.arenaNextEnemy.x);
        globalScene.arenaEnemy.setAlpha(1);
        globalScene.arenaNextEnemy.setX(globalScene.arenaNextEnemy.x - 300);
        globalScene.arenaNextEnemy.setVisible(false);
        if (globalScene.lastEnemyTrainer) {
          globalScene.lastEnemyTrainer.destroy();
        }
        if (lastEncounterVisuals) {
          globalScene.field.remove(lastEncounterVisuals, true);
          globalScene.lastMysteryEncounter!.introVisuals = undefined;
        }

        if (!this.tryOverrideForBattleSpec()) {
          this.doEncounterCommon();
        }
      },
    });
  }

  /**
   * Do nothing (since this is simply the next wave in the same biome).
   */
  trySetWeatherIfNewBiome(): void {}
}
