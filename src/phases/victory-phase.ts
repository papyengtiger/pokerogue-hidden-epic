import { timedEventManager } from "#app/global-event-manager";
import { globalScene } from "#app/global-scene";
import { modifierTypes } from "#data/data-lists";
import { MonsterHouseRank, monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { mysteryTimeManager } from "#data/mystery-time/mystery-time-manager";
import { BattleType } from "#enums/battle-type";
import type { BattlerIndex } from "#enums/battler-index";
import { ClassicFixedBossWaves } from "#enums/fixed-boss-waves";
import { ModifierTier } from "#enums/modifier-tier";
import { handleMysteryEncounterVictory } from "#mystery-encounters/encounter-phase-utils";
import { PokemonPhase } from "#phases/pokemon-phase";

export class VictoryPhase extends PokemonPhase {
  public readonly phaseName = "VictoryPhase";
  /** If true, indicates that the phase is intended for EXP purposes only, and not to continue a battle to next phase */
  isExpOnly: boolean;

  constructor(battlerIndex: BattlerIndex | number, isExpOnly = false) {
    super(battlerIndex);

    this.isExpOnly = isExpOnly;
  }

  start() {
    super.start();

    const isMysteryEncounter = globalScene.currentBattle.isBattleMysteryEncounter();

    if (!isMysteryEncounter || !globalScene.currentBattle.mysteryEncounter?.preventGameStatsUpdates) {
      globalScene.gameData.gameStats.pokemonDefeated++;
    }

    const pokemon = this.getPokemon();

    if (!pokemon) {
      console.warn("[VICTORY_PHASE_POKEMON_NOT_FOUND]", {
        battlerIndex: (this as any).battlerIndex,
        isExpOnly: this.isExpOnly,
      });

      return this.end();
    }

    const expValue = pokemon.getExpValue();
    globalScene.applyPartyExp(expValue, true);

    if (this.isExpOnly) {
      return this.end();
    }

    if (isMysteryEncounter) {
      handleMysteryEncounterVictory(false, this.isExpOnly);
      return this.end();
    }

    if (
      !globalScene
        .getEnemyParty()
        .find(p => (globalScene.currentBattle.battleType === BattleType.WILD ? p.isOnField() : !p?.isFainted(true)))
    ) {
      /*
       * BattleEndPhase가 소굴 상태를 초기화할 수 있으므로
       * 큐에 넣기 전에 등급과 보상 지급 여부를 확정한다.
       */
      const monsterHouseRank = monsterHouseManager.getRank();

      const grantMonsterHouseReward = monsterHouseManager.claimClearReward();

      console.log("[MYSTERY_TIME_REWARD_CHECK]", {
        wave: globalScene.currentBattle.waveIndex,
        active: mysteryTimeManager.isActive(),
        bossDefeated: mysteryTimeManager.isBossDefeated(),
        rewardGranted: mysteryTimeManager.isRewardGranted(),
        rank: mysteryTimeManager.getRank(),
      });
      /*
       * 미스터리타임 보스 격파 보상 여부.
       *
       * BattleEndPhase에서 미스터리타임 상태가 변경되기 전에
       * 여기서 먼저 확정한다.
       */
      const grantMysteryTimeReward =
        mysteryTimeManager.isActive() && mysteryTimeManager.isBossDefeated() && !mysteryTimeManager.isRewardGranted();

      globalScene.phaseManager.pushNew("BattleEndPhase", true);

      if (grantMysteryTimeReward) {
        console.log("[MYSTERY_TIME_REWARD_QUEUED]", {
          wave: globalScene.currentBattle.waveIndex,
          rank: mysteryTimeManager.getRank(),
          bossDefeated: mysteryTimeManager.isBossDefeated(),
        });

        globalScene.phaseManager.pushNew("MysteryTimeRewardPhase");
      }

      if (grantMonsterHouseReward) {
        /*
         * 경험치·골드·로그포인트 지급.
         *
         * 이 Phase의 생성자가 현재 소굴 정보를 즉시
         * 복사하므로 BattleEndPhase 이후 실행되어도 안전하다.
         */
        globalScene.phaseManager.pushNew("MonsterHouseClearRewardPhase");

        const rewardTiers: ModifierTier[] = (() => {
          switch (monsterHouseRank) {
            case MonsterHouseRank.RANK_1:
              return [ModifierTier.GREAT, ModifierTier.GREAT, ModifierTier.GREAT];

            case MonsterHouseRank.RANK_2:
              return [ModifierTier.GREAT, ModifierTier.GREAT, ModifierTier.ULTRA];

            case MonsterHouseRank.RANK_3:
              return [ModifierTier.ULTRA, ModifierTier.ULTRA, ModifierTier.ULTRA];

            case MonsterHouseRank.RANK_4:
              return [ModifierTier.ULTRA, ModifierTier.ULTRA, ModifierTier.ROGUE];

            case MonsterHouseRank.RANK_5:
              return [ModifierTier.ROGUE, ModifierTier.ROGUE, ModifierTier.MASTER];

            default:
              return [ModifierTier.GREAT, ModifierTier.GREAT, ModifierTier.GREAT];
          }
        })();

        /*
         * 소굴 아이템 후보 3개 중 하나를 선택한다.
         */
        console.log("[MONSTER_HOUSE_CLEAR_REWARD_QUEUED]", {
          rank: monsterHouseRank,
          rewardTiers: rewardTiers.map(tier => ModifierTier[tier]),
        });
      }

      if (globalScene.currentBattle.battleType === BattleType.TRAINER) {
        globalScene.phaseManager.pushNew("TrainerVictoryPhase");
      }

      const gameMode = globalScene.gameMode;
      const currentWaveIndex = globalScene.currentBattle.waveIndex;

      if (gameMode.isEndless || !gameMode.isWaveFinal(currentWaveIndex)) {
        globalScene.phaseManager.pushNew("EggLapsePhase");
        globalScene.phaseManager.pushNew("BerryPlanterLapsePhase");
        if (gameMode.isClassic) {
          switch (currentWaveIndex) {
            case ClassicFixedBossWaves.RIVAL_1:
            case ClassicFixedBossWaves.RIVAL_2:
              // Get event modifiers for this wave
              timedEventManager
                .getFixedBattleEventRewards(currentWaveIndex)
                .map(r => globalScene.phaseManager.pushNew("ModifierRewardPhase", modifierTypes[r]));
              break;
            case ClassicFixedBossWaves.EVIL_BOSS_2:
              // Should get Lock Capsule on 165 before shop phase so it can be used in the rewards shop
              globalScene.phaseManager.pushNew("ModifierRewardPhase", modifierTypes.LOCK_CAPSULE);
              break;
          }
        }
        if (currentWaveIndex % 10) {
          globalScene.phaseManager.pushNew(
            "SelectModifierPhase",
            undefined,
            undefined,
            gameMode.isFixedBattle(currentWaveIndex)
              ? gameMode.getFixedBattle(currentWaveIndex).customModifierRewardSettings
              : undefined,
          );
        } else if (gameMode.isDaily) {
          globalScene.phaseManager.pushNew("ModifierRewardPhase", modifierTypes.EXP_CHARM);
          if (currentWaveIndex > 10 && !gameMode.isWaveFinal(currentWaveIndex)) {
            globalScene.phaseManager.pushNew("ModifierRewardPhase", modifierTypes.GOLDEN_POKEBALL);
          }
        } else {
          const superExpWave = !gameMode.isEndless ? (globalScene.offsetGym ? 0 : 20) : 10;
          if (gameMode.isEndless && currentWaveIndex === 10) {
            globalScene.phaseManager.pushNew("ModifierRewardPhase", modifierTypes.EXP_SHARE);
          }
          if (currentWaveIndex <= 750 && (currentWaveIndex <= 500 || currentWaveIndex % 30 === superExpWave)) {
            globalScene.phaseManager.pushNew(
              "ModifierRewardPhase",
              currentWaveIndex % 30 !== superExpWave || currentWaveIndex > 250
                ? modifierTypes.EXP_CHARM
                : modifierTypes.SUPER_EXP_CHARM,
            );
          }
          if (currentWaveIndex <= 150 && !(currentWaveIndex % 50)) {
            globalScene.phaseManager.pushNew("ModifierRewardPhase", modifierTypes.GOLDEN_POKEBALL);
          }
          if (gameMode.isEndless && !(currentWaveIndex % 50)) {
            globalScene.phaseManager.pushNew(
              "ModifierRewardPhase",
              !(currentWaveIndex % 250) ? modifierTypes.VOUCHER_PREMIUM : modifierTypes.VOUCHER_PLUS,
            );
            globalScene.phaseManager.pushNew("AddEnemyBuffModifierPhase");
          }
        }

        if (gameMode.hasRandomBiomes || globalScene.isNewBiome()) {
          globalScene.phaseManager.pushNew("SelectBiomePhase");
        }

        globalScene.phaseManager.pushNew("NewBattlePhase");
      } else {
        globalScene.currentBattle.battleType = BattleType.CLEAR;
        globalScene.score += gameMode.getClearScoreBonus();
        globalScene.updateScoreText();
        globalScene.phaseManager.pushNew("GameOverPhase", true);
      }
    }

    this.end();
  }
}
