import { globalScene } from "#app/global-scene";
import Overrides from "#app/overrides";
import { Phase } from "#app/phase";
import type { Egg } from "#data/egg";
import { EGG_SEED } from "#data/egg";
import { EggHatchData } from "#data/egg-hatch-data";
import { UiMode } from "#enums/ui-mode";
import type { PlayerPokemon } from "#field/pokemon";
import { achvs } from "#system/achv";
import i18next from "i18next";
import { EggHatchSpeedUpModifier } from "#app/modifier/modifier";
import { EggTier } from "#enums/egg-type";

/**
 * Phase that handles updating eggs, and hatching any ready eggs
 * Also handles prompts for skipping animation, and calling the egg summary phase
 */
export class EggLapsePhase extends Phase {
  public readonly phaseName = "EggLapsePhase";
  private eggHatchData: EggHatchData[] = [];
  private readonly minEggsToSkip: number = 2;

  start() {
  super.start();

  const currentWave = globalScene.currentBattle?.waveIndex ?? 0;
  const speedUpMods = globalScene.findModifiers(
    m => m instanceof EggHatchSpeedUpModifier
  ) as EggHatchSpeedUpModifier[];

  // 스택 -> 0,1,2,3만 인정
  const stacks = Math.min(speedUpMods?.[0]?.stackCount ?? 0, 3);
  const reductionFactor = 1 - 0.3 * stacks; // 0스택=1.0, 1스택=0.7, 2스택=0.4, 3스택=0.1

  if (stacks > 0) {
    console.log(`[EggLapsePhase] 속도업: stacks=${stacks}, factor=${reductionFactor}`);
  }

  // 1) 기본치 세팅 + "한 번만" 속도업 초기화
  globalScene.gameData.eggs.forEach(egg => {
    // 기본치 없으면 티어 기준으로 세팅
    if (egg.originalHatchWaves === undefined) {
      switch (egg.tier) {
        case EggTier.COMMON:    egg.originalHatchWaves = 10; break;
        case EggTier.RARE:      egg.originalHatchWaves = 25; break;
        case EggTier.EPIC:      egg.originalHatchWaves = 50; break;
        case EggTier.LEGENDARY: egg.originalHatchWaves = 100; break;
        default:                egg.originalHatchWaves = 20;
      }
    }

    // ✅ "초기화 여부"를 기본치 비교로 판단
    //   - 새로 생성된 알은 보통 hatchWaves 가 기본치와 같음(10/25/50/100)
    //   - 이미 진행 중이거나 세이브에서 불러온 알은 보통 더 작음
    if (
      egg.hatchWaves === undefined ||
      egg.hatchWaves === egg.originalHatchWaves
    ) {
      const target = Math.max(Math.floor(egg.originalHatchWaves * reductionFactor), 1);
      egg.hatchWaves = target;
      console.log(
        `[EggLapsePhase] ${egg.tier} 초기화: ${egg.originalHatchWaves} → ${egg.hatchWaves}` +
        (stacks ? ` (x${reductionFactor.toFixed(2)})` : "")
      );
    } else {
      console.log(`[EggLapsePhase] ${egg.tier} 진행 유지: 남은 ${egg.hatchWaves}`);
    }
  });

  // 2) 매 웨이브마다 1 감소 & 부화 체크
  const eggsToHatch: Egg[] = [];
  globalScene.gameData.eggs.forEach(egg => {
    egg.hatchWaves = Math.max(egg.hatchWaves - 1, 0);

    if (egg.hatchWaves <= 0 || Overrides.EGG_IMMEDIATE_HATCH_OVERRIDE) {
      eggsToHatch.push(egg);
      console.log(`[EggLapsePhase] ${egg.tier} 부화!`);
    } else {
      const expectedWave = currentWave + egg.hatchWaves;
      console.log(`[EggLapsePhase] ${egg.tier} 남은 웨이브: ${egg.hatchWaves} (현재 ${currentWave} / 목표 ${expectedWave})`);
    }
  });

  // 3) 이후 로직은 그대로
  const eggsToHatchCount = eggsToHatch.length;
  this.eggHatchData = [];

  if (eggsToHatchCount > 0) {
    if (eggsToHatchCount >= this.minEggsToSkip && globalScene.eggSkipPreference === 1) {
      globalScene.ui.showText(i18next.t("battle:eggHatching"), 0, () => {
        globalScene.ui.showText(i18next.t("battle:eggSkipPrompt", { eggsToHatch: eggsToHatchCount }), 0);
        globalScene.ui.setModeWithoutClear(
          UiMode.CONFIRM,
          () => { this.hatchEggsSkipped(eggsToHatch); this.showSummary(); },
          () => { this.hatchEggsRegular(eggsToHatch); this.end(); },
          null, null, null, 1000, true
        );
      }, 100, true);
    } else if (eggsToHatchCount >= this.minEggsToSkip && globalScene.eggSkipPreference === 2) {
      globalScene.phaseManager.queueMessage(i18next.t("battle:eggHatching"));
      this.hatchEggsSkipped(eggsToHatch);
      this.showSummary();
    } else {
      globalScene.phaseManager.queueMessage(i18next.t("battle:eggHatching"));
      this.hatchEggsRegular(eggsToHatch);
      this.end();
    }
  } else {
    this.end();
  }
}

  hatchEggsRegular(eggsToHatch: Egg[]) {
    let eggsToHatchCount = eggsToHatch.length;
    for (const egg of eggsToHatch) {
      globalScene.phaseManager.unshiftNew("EggHatchPhase", this, egg, eggsToHatchCount);
      eggsToHatchCount--;
    }
  }

  hatchEggsSkipped(eggsToHatch: Egg[]) {
    for (const egg of eggsToHatch) this.hatchEggSilently(egg);
  }

  showSummary() {
    globalScene.phaseManager.unshiftNew("EggSummaryPhase", this.eggHatchData);
    this.end();
  }

  hatchEggSilently(egg: Egg) {
    const eggIndex = globalScene.gameData.eggs.findIndex(e => e.id === egg.id);
    if (eggIndex === -1) return this.end();
    globalScene.gameData.eggs.splice(eggIndex, 1);

    const data = this.generatePokemon(egg);
    const pokemon = data.pokemon;
    if (pokemon.fusionSpecies) pokemon.clearFusionSpecies();

    if (pokemon.species.subLegendary) globalScene.validateAchv(achvs.HATCH_SUB_LEGENDARY);
    if (pokemon.species.legendary) globalScene.validateAchv(achvs.HATCH_LEGENDARY);
    if (pokemon.species.mythical) globalScene.validateAchv(achvs.HATCH_MYTHICAL);
    if (pokemon.isShiny()) globalScene.validateAchv(achvs.HATCH_SHINY);
  }

  generatePokemon(egg: Egg): EggHatchData {
    let ret: PlayerPokemon;
    let newHatchData: EggHatchData;
    globalScene.executeWithSeedOffset(
      () => {
        ret = egg.generatePlayerPokemon();
        newHatchData = new EggHatchData(ret, egg.eggMoveIndex);
        newHatchData.setDex();
        this.eggHatchData.push(newHatchData);
      },
      egg.id,
      EGG_SEED.toString(),
    );
    return newHatchData!;
  }
}
