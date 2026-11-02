import { timedEventManager } from "#app/global-event-manager";
import { globalScene } from "#app/global-scene";
import { modifierTypes } from "#data/data-lists";
import { MonsterHouseRank, monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { mysteryTimeManager } from "#data/mystery-time/mystery-time-manager";
import { BattleType } from "#enums/battle-type";
import type { BattlerIndex } from "#enums/battler-index";
import { ClassicFixedBossWaves } from "#enums/fixed-boss-waves";
import { GameModes } from "#enums/game-modes";
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

      // 디 아더 미스터리몬스터 야생 보스 클리어 골드 보상.
      // 25·55층 트레이너전은 trainer-config.ts의 moneyMultiplier로 처리합니다.
      // 적 파티를 모두 쓰러뜨린 시점에서만 실행되므로 중간 격파에는 지급하지 않습니다.
      // 트레이너전은 TrainerVictoryPhase에서 이미 골드를 지급하므로 중복 지급을 막습니다.
      if (gameMode.modeId === GameModes.THEOTHER && globalScene.currentBattle.battleType === BattleType.WILD) {
        const bossGoldMultipliers: Partial<Record<number, number>> = {
          8: 2,
          95: 8,
          145: 12,
          195: 20,
        };
        const goldMultiplier = bossGoldMultipliers[currentWaveIndex];
        if (goldMultiplier !== undefined) {
          globalScene.phaseManager.pushNew("MoneyRewardPhase", goldMultiplier);
          console.log("[THEOTHER_BOSS_GOLD_REWARD_QUEUED]", {
            wave: currentWaveIndex,
            multiplier: goldMultiplier,
          });
        }
      }

      // 디 아더 300층: 피아나 → 레쿠쟈 1페이즈 → 레쿠쟈 2페이즈.
      // 각 전투는 완전 승리 후 다음 전투로 넘어가며 2페이즈 종료 시에만 클리어 처리.
      if (gameMode.modeId === GameModes.THEOTHER && currentWaveIndex === 300 && globalScene.theOther300Stage < 2) {
        globalScene.theOther300Stage = (globalScene.theOther300Stage + 1) as 1 | 2;
        console.log("[THEOTHER_300_STAGE_ADVANCE]", globalScene.theOther300Stage);
        globalScene.phaseManager.pushNew("NewBattlePhase");
        this.end();
        return;
      }

      if (gameMode.isEndless || !gameMode.isWaveFinal(currentWaveIndex)) {
        globalScene.phaseManager.pushNew("EggLapsePhase");
        globalScene.phaseManager.pushNew("BerryPlanterLapsePhase");
        // 디 아더 전용 스토리 보상. 클래식의 지급 로직과 분리하여 다른 모드에 영향을 주지 않습니다.
        // EXP_SHARE(학습장치), EXP_CHARM(경험부적), SUPER_EXP_CHARM(좋은경험부적).
        if (gameMode.modeId === GameModes.THEOTHER) {
          const giveReward = (type: typeof modifierTypes.MAP, count = 1): void => {
            for (let i = 0; i < count; i++) {
              globalScene.phaseManager.pushNew("ModifierRewardPhase", type);
            }
          };
          // 해금성 도구는 이미 갖고 있다면 중복 지급하지 않습니다.
          const giveUniqueReward = (type: typeof modifierTypes.MAP): void => {
            if (!globalScene.findModifier(m => m.type?.id === type.id)) {
              giveReward(type);
            }
          };

          switch (currentWaveIndex) {
            case 8:
              // 로보키드는 야생 보스이므로 트레이너전 판정이 필요하지 않습니다.
              giveReward(modifierTypes.EXP_SHARE);
              giveUniqueReward(modifierTypes.MAP);
              giveReward(modifierTypes.EXP_CHARM);
              break;
            case 25:
              giveUniqueReward(modifierTypes.TERA_ORB);
              giveReward(modifierTypes.SUPER_EXP_CHARM, 2);
              giveReward(modifierTypes.EXP_CHARM);
              giveReward(modifierTypes.EXP_SHARE);
              break;
            case 55:
              giveUniqueReward(modifierTypes.MEGA_BRACELET);
              giveUniqueReward(modifierTypes.DYNAMAX_BAND);
              giveReward(modifierTypes.SUPER_EXP_CHARM, 3);
              giveReward(modifierTypes.EXP_CHARM, 3);
              giveReward(modifierTypes.EXP_SHARE);
              break;
            case 95:
              giveUniqueReward(modifierTypes.Z_RING);
              giveUniqueReward(modifierTypes.Z_POWER_RING);
              giveReward(modifierTypes.EXP_SHARE);
              giveReward(modifierTypes.EXP_CHARM, 3);
              giveReward(modifierTypes.SUPER_EXP_CHARM, 3);
              break;
            case 145:
              // 디 아더 145층 M.F.O / N.O.2.4.8 보스전 승리 보상.
              if (globalScene.currentBattle.battleType === BattleType.TRAINER) {
                giveReward(modifierTypes.EXP_SHARE);
                giveReward(modifierTypes.SUPER_EXP_CHARM, 5);
                giveReward(modifierTypes.EXP_CHARM, 5);
              }
              break;
          }
        }

        if (gameMode.isClassic) {
          // 히든에픽 클래식: 특정 라이벌 승리 시 전용 도구 확정 지급
          // 이미 보유한 도구는 건너뛴다. 실제 지급은 ModifierRewardPhase에서 처리한다.
          if (globalScene.currentBattle.battleType === BattleType.TRAINER) {
            const queueUniqueReward = (type: typeof modifierTypes.MAP): void => {
              if (!globalScene.findModifier(m => m.type?.id === type.id)) {
                globalScene.phaseManager.pushNew("ModifierRewardPhase", type);
              }
            };

            switch (currentWaveIndex) {
              case 8:
                queueUniqueReward(modifierTypes.MAP);
                break;
              case 25:
                queueUniqueReward(modifierTypes.TERA_ORB);
                break;
              case 55:
                queueUniqueReward(modifierTypes.MEGA_BRACELET);
                queueUniqueReward(modifierTypes.DYNAMAX_BAND);
                break;
              case 95:
                queueUniqueReward(modifierTypes.Z_RING);
                queueUniqueReward(modifierTypes.Z_POWER_RING);
                break;
            }
          }

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
          if ((gameMode.isEndless || gameMode.modeId === GameModes.ANOTHER) && currentWaveIndex === 10) {
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
