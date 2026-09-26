import { globalScene } from "#app/global-scene";
import { BattlerIndex } from "#enums/battler-index";
import { TurnInitEvent } from "#events/battle-scene";
import type { PlayerPokemon } from "#field/pokemon";
import {
  handleMysteryEncounterBattleStartEffects,
  handleMysteryEncounterTurnStartEffects,
} from "#mystery-encounters/encounter-phase-utils";
import { FieldPhase } from "#phases/field-phase";
import i18next from "i18next";

export class TurnInitPhase extends FieldPhase {
  public readonly phaseName = "TurnInitPhase";

  start() {
    super.start();

    if (!globalScene.currentBattle) {
      console.warn("[TURN_INIT_SKIP_NO_BATTLE]");
      globalScene.phaseManager.clearPhaseQueue();
      return;
    }

    if ((globalScene.currentBattle as any)?.isPracticeBattle) {
      (globalScene as any).practiceTurnResult = {
        damageDealt: 0,
        damageTaken: 0,

        playerHitCount: 0,
        enemyHitCount: 0,
        playerMissCount: 0,
        enemyMissCount: 0,
        playerCriticalCount: 0,
        enemyCriticalCount: 0,

        effectivenessText: "",

        playerDamageFactors: [] as string[],
        enemyDamageFactors: [] as string[],

        playerDamageDetails: [] as string[],
        enemyDamageDetails: [] as string[],

        playerAccuracyFactors: [] as string[],
        enemyAccuracyFactors: [] as string[],

        playerCritFactors: [] as string[],
        enemyCritFactors: [] as string[],

        playerRewardFactors: [] as string[],
        enemyRewardFactors: [] as string[],

        expGained: 0,
        moneyGained: 0,
        roguePointsGained: 0,

        expFactors: [] as string[],
        moneyFactors: [] as string[],
        roguePointFactors: [] as string[],

        expRewardEnabled: globalScene.gameData.practiceDummyConfig?.rewardFlags?.exp ?? false,

        moneyRewardEnabled: globalScene.gameData.practiceDummyConfig?.rewardFlags?.money ?? false,

        rpRewardEnabled: globalScene.gameData.practiceDummyConfig?.rewardFlags?.roguePoints ?? false,
      };
    }

    // 1) 불법 진화 체크(기존 로직 유지)
    globalScene.getPlayerField().forEach(p => {
      if (p.isOnField() && !p.isAllowedInBattle()) {
        globalScene.phaseManager.queueMessage(
          i18next.t("challenges:illegalEvolution", { pokemon: p.name }),
          null,
          true,
        );

        const allowedPokemon = globalScene.getPokemonAllowedInBattle();

        if (allowedPokemon.length === 0) {
          globalScene.phaseManager.clearPhaseQueue();
          globalScene.phaseManager.unshiftNew("GameOverPhase");
        } else if (
          allowedPokemon.length >= globalScene.currentBattle.getBattlerCount()
          || (globalScene.currentBattle.double && !allowedPokemon[0].isActive(true))
        ) {
          p.switchOut();
        } else {
          p.leaveField();
        }

        if (allowedPokemon.length === 1 && globalScene.currentBattle.double) {
          globalScene.phaseManager.unshiftNew("ToggleDoublePositionPhase", true);
        }
      }
    });

    globalScene.eventTarget.dispatchEvent(new TurnInitEvent());

    if (!(globalScene.currentBattle as any)?.isPracticeBattle) {
      handleMysteryEncounterBattleStartEffects();

      if (handleMysteryEncounterTurnStartEffects()) {
        this.end();
        return;
      }
    }

    // ✅ 2) 먼저 turnData 초기화 + 참가자 등록만 해둠 (커맨드는 아직 생성 X)
    globalScene.getField().forEach((pokemon, i) => {
      if (!pokemon?.isActive()) {
        return;
      }

      if (pokemon.isPlayer()) {
        globalScene.currentBattle.addParticipant(pokemon as PlayerPokemon);
      }

      pokemon.resetTurnData();

      (pokemon as any).turnData.movePowerMultiplier = 1;
      (pokemon as any).turnData.lastPowerBoostName = undefined;
    });

    // ✅ 배틀 시작 턴이면: 즉발 베리 페이즈만 먼저 실행하고 여기서 종료

    console.log("[PRACTICE] turn start", {
      wave: globalScene.currentBattle?.waveIndex,
      turn: globalScene.currentBattle?.turn ?? "unknown",
    });

    const isBattleStartTurn = (globalScene.currentBattle?.turn ?? 0) <= 1;
    if (isBattleStartTurn) {
      globalScene.phaseManager.pushNew("BattleStartImmediateBerryPhase");
      this.end();
      return;
    }

    // --- 여기부터는 기존 로직 그대로 (커맨드/턴스타트 큐잉) ---
    globalScene.getField().forEach((pokemon, i) => {
      console.log("[PRACTICE][TURN_QUEUE_CHECK]", {
        i,
        name: pokemon?.getName?.(),
        isActive: pokemon?.isActive?.(),
        isPlayer: pokemon?.isPlayer?.(),
        isEnemy: pokemon?.isEnemy?.(),
        battlerIndex: pokemon?.getBattlerIndex?.(),
      });

      if (!pokemon?.isActive()) {
        return;
      }

      if (pokemon.isPlayer()) {
        globalScene.phaseManager.pushNew("CommandPhase", i);
      } else {
        globalScene.phaseManager.pushNew("EnemyCommandPhase", i - BattlerIndex.ENEMY);
      }
    });
    globalScene.phaseManager.pushNew("TurnStartPhase");
    this.end();
  }
}
