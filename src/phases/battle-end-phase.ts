import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { kecleonShopManager } from "#data/kecleon-shop/kecleon-shop-manager";
import {
  LapsingPersistentModifier,
  LapsingPokemonHeldItemModifier,
  PostBattleLootItemModifier,
} from "#modifiers/modifier";
import { BattlePhase } from "#phases/battle-phase";

export class BattleEndPhase extends BattlePhase {
  public readonly phaseName = "BattleEndPhase";
  /** If true, will increment battles won */
  isVictory: boolean;

  constructor(
    isVictory: boolean,
    private readonly isQuestRescue = false,
  ) {
    super();
    this.isVictory = isVictory;
  }

  start() {
    super.start();

    const isKecleonTheftVictory = this.isVictory && kecleonShopManager.isTheftBattleActive();

    if (isKecleonTheftVictory) {
      const wave = globalScene.currentBattle.waveIndex;
      const endWave = kecleonShopManager.getTheftEndWave();

      console.log("[KECLEON_THEFT_WAVE_CLEARED]", {
        wave,
        endWave,
      });

      if (wave >= endWave) {
        console.log("[KECLEON_THEFT_CHASE_COMPLETE]", {
          wave,
          startWave: kecleonShopManager.getTheftStartWave(),
          endWave,
        });

        kecleonShopManager.finishTheftChase();
      }
    }

    // 기존 BattleEnd 처리 계속
    this.isVictory ||= globalScene.phaseManager.hasPhaseOfType(
      "BattleEndPhase",
      (phase: BattleEndPhase) => phase.isVictory,
    );
    globalScene.phaseManager.removeAllPhasesOfType("BattleEndPhase");

    globalScene.gameData.gameStats.battles++;
    if (
      globalScene.gameMode.isEndless
      && globalScene.currentBattle.waveIndex + 1 > globalScene.gameData.gameStats.highestEndlessWave
    ) {
      globalScene.gameData.gameStats.highestEndlessWave = globalScene.currentBattle.waveIndex + 1;
    }

    if (!this.isQuestRescue) {
      globalScene.gameData.gameStats.battles++;

      if (
        globalScene.gameMode.isEndless
        && globalScene.currentBattle.waveIndex + 1 > globalScene.gameData.gameStats.highestEndlessWave
      ) {
        globalScene.gameData.gameStats.highestEndlessWave = globalScene.currentBattle.waveIndex + 1;
      }
    }

    if (this.isVictory && !this.isQuestRescue) {
      globalScene.currentBattle.addBattleScore();

      if (globalScene.currentBattle.trainer) {
        globalScene.gameData.gameStats.trainersDefeated++;
      }
    }

    // Endless graceful end
    if (globalScene.gameMode.isEndless && globalScene.currentBattle.waveIndex >= 5850) {
      globalScene.phaseManager.clearPhaseQueue();
      globalScene.phaseManager.unshiftNew("GameOverPhase", true);
    }

    // 🔹 새로 추가: 승리 시 소환된 포켓몬들의 waveTurnCount 초기화
    if (this.isVictory) {
      for (const pokemon of globalScene.getField()) {
        if (pokemon?.battleSummonData) {
          pokemon.battleSummonData.waveTurnCount = 1;
        }
      }
    }

    for (const pokemon of globalScene.getPokemonAllowedInBattle()) {
      // 기존 방식 (어빌리티 후처리)
      applyAbAttrs("PostBattleAbAttr", { pokemon, victory: this.isVictory });

      // 🔹 새로 추가: PostBattleLootItemModifier 처리
      const postBattleLootItem = globalScene
        .getModifiers(PostBattleLootItemModifier)
        .find(mod => mod.pokemonId === pokemon.id);

      if (postBattleLootItem instanceof PostBattleLootItemModifier) {
        try {
          postBattleLootItem.applyPostBattleIfPossible(pokemon, this.isVictory);
        } catch (e) {
          console.error("[PostBattleLootItemModifier] 적용 중 오류", e);
        }
      }
    }

    if (globalScene.currentBattle.moneyScattered) {
      globalScene.currentBattle.pickUpScatteredMoney();
    }

    globalScene.clearEnemyHeldItemModifiers();
    for (const p of globalScene.getEnemyParty()) {
      try {
        p.destroy();
      } catch {
        console.warn("Unable to destroy stale pokemon object in BattleEndPhase:", p);
      }
    }

    const lapsingModifiers = globalScene.findModifiers(
      m => m instanceof LapsingPersistentModifier || m instanceof LapsingPokemonHeldItemModifier,
    ) as (LapsingPersistentModifier | LapsingPokemonHeldItemModifier)[];
    for (const m of lapsingModifiers) {
      const args: any[] = [];
      if (m instanceof LapsingPokemonHeldItemModifier) {
        args.push(globalScene.getPokemonById(m.pokemonId));
      }
      if (!m.lapse(...args)) {
        globalScene.removeModifier(m);
      }
    }

    globalScene.updateModifiers();
    this.end();
  }
}
