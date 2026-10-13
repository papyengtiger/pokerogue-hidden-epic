import { globalScene } from "#app/global-scene";
import { biomeLinks } from "#balance/biomes";
import { BiomeId } from "#enums/biome-id";
import { ChallengeType } from "#enums/challenge-type";
import { GameModes } from "#enums/game-modes";
import { UiMode } from "#enums/ui-mode";
import { MapModifier, MoneyInterestModifier } from "#modifiers/modifier";
import { BattlePhase } from "#phases/battle-phase";
import { trainerStrategyManager } from "#system/trainer-strategy-manager";
import { trainerCardManager } from "#system/trainer-card-manager";
import { allTrainerStrategies } from "#trainers/trainer-strategy";
import type { OptionSelectItem } from "#ui/abstract-option-select-ui-handler";
import { applyChallenges } from "#utils/challenge-utils";
import { BooleanHolder, getBiomeName, randSeedInt } from "#utils/common";

export class SelectBiomePhase extends BattlePhase {
  public readonly phaseName = "SelectBiomePhase";
  start() {
    super.start();

    globalScene.resetSeed();

    const gameMode = globalScene.gameMode;
    const currentBiome = globalScene.arena.biomeType;
    const currentWaveIndex = globalScene.currentBattle.waveIndex;
    const nextWaveIndex = currentWaveIndex + 1;

    const proceedToNextBiome = (nextBiome: BiomeId) => {
  if (nextWaveIndex % 10 === 1) {
    globalScene.applyModifiers(MoneyInterestModifier, true);

    const healStatus = new BooleanHolder(true);
    applyChallenges(ChallengeType.PARTY_HEAL, healStatus);

    if (healStatus.value) {
      globalScene.phaseManager.unshiftNew("PartyHealPhase", false);
    } else {
      globalScene.phaseManager.unshiftNew(
        "SelectModifierPhase",
        undefined,
        undefined,
        gameMode.isFixedBattle(currentWaveIndex)
          ? gameMode.getFixedBattle(currentWaveIndex).customModifierRewardSettings
          : undefined,
      );
    }
  }

  globalScene.phaseManager.unshiftNew("SwitchBiomePhase", nextBiome);
  this.end();
};

const setNextBiome = (nextBiome: BiomeId) => {
  // 전략 해금 기준: 클리어한 층수
  const strategyTierByWave: Record<number, number> = {
    50: 1,
    250: 2,
    1000: 3,
    2000: 4,
  };

  const tier = strategyTierByWave[currentWaveIndex];

  // 해금 이벤트가 없는 층에서는 기존 처리
  if (!tier) {
    proceedToNextBiome(nextBiome);
    return;
  }

  const strategies = allTrainerStrategies.filter(
    strategy =>
      strategy.tier === tier
      && strategy.requiredWave <= currentWaveIndex,
  );

  if (strategies.length === 0) {
    proceedToNextBiome(nextBiome);
    return;
  }

  console.log("[TRAINER_STRATEGY_UNLOCK]", {
    wave: currentWaveIndex,
    tier,
    strategies: strategies.map(strategy => strategy.id),
  });

  globalScene.ui.setMode(UiMode.OPTION_SELECT, {
    noCancel: true,
    options: strategies.map(strategy => ({
      label: strategy.name,
      handler: () => {
        const selected = trainerStrategyManager.selectStrategy(
          strategy.id,
          currentWaveIndex,
        );

        if (!selected) {
          return false;
        }

        // 선택한 트레이너 전략에 맞춰 카드 슬롯 갱신
trainerCardManager.syncSlotsWithStrategy();

console.log("[TRAINER_CARD_SLOTS_SYNCED]", {
  strategy: strategy.id,
  slots: trainerCardManager.getSlotTypes(),
  equipped: trainerCardManager.getEquipped(),
});

        console.log("[TRAINER_STRATEGY_SELECTED]", {
          wave: currentWaveIndex,
          strategy: strategy.id,
          slots: trainerStrategyManager.getSlots(),
        });

        globalScene.ui.setMode(UiMode.MESSAGE);
        proceedToNextBiome(nextBiome);

        return true;
      },
      onHover: () => {
        globalScene.ui.showTooltip(
          strategy.name,
          strategy.description,
        );
      },
    })),
    supportHover: true,
  });
};

    if (
      (gameMode.isClassic && gameMode.isWaveFinal(nextWaveIndex + 9))
      || (gameMode.isDaily && gameMode.isWaveFinal(nextWaveIndex))
      || ((gameMode.modeId === GameModes.WEEKLY || gameMode.modeId === GameModes.MONTHLY)
        && gameMode.isWaveFinal(nextWaveIndex))
      || (gameMode.hasShortBiomes && !(nextWaveIndex % 50))
    ) {
      setNextBiome(BiomeId.END);
    } else if (gameMode.hasRandomBiomes) {
      setNextBiome(this.generateNextBiome(nextWaveIndex));
    } else if (Array.isArray(biomeLinks[currentBiome])) {
      const biomes: BiomeId[] = (biomeLinks[currentBiome] as (BiomeId | [BiomeId, number])[])
        .filter(b => !Array.isArray(b) || !randSeedInt(b[1]))
        .map(b => (!Array.isArray(b) ? b : b[0]));

      if (biomes.length > 1 && globalScene.findModifier(m => m instanceof MapModifier)) {
        const biomeSelectItems = biomes.map(b => {
          const ret: OptionSelectItem = {
            label: getBiomeName(b),
            handler: () => {
              globalScene.ui.setMode(UiMode.MESSAGE);
              setNextBiome(b);
              return true;
            },
          };
          return ret;
        });
        globalScene.ui.setMode(UiMode.OPTION_SELECT, {
          options: biomeSelectItems,
          delay: 1000,
        });
      } else {
        // TODO: should this use `randSeedItem`?
        setNextBiome(biomes[randSeedInt(biomes.length)]);
      }
    } else if (biomeLinks.hasOwnProperty(currentBiome)) {
      setNextBiome(biomeLinks[currentBiome] as BiomeId);
    } else {
      setNextBiome(this.generateNextBiome(nextWaveIndex));
    }
  }

  generateNextBiome(waveIndex: number): BiomeId {
    return waveIndex % 50 === 0 ? BiomeId.END : globalScene.generateRandomBiome(waveIndex);
  }
}
