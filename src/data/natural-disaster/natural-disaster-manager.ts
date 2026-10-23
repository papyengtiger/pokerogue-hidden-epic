import { globalScene } from "#app/global-scene";
import { BiomeId } from "#enums/biome-id";
import { GameModes } from "#enums/game-modes";
import { randSeedInt } from "#utils/common";
import {
  EarthquakeDisaster,
  FloodDisaster,
  type NaturalDisaster,
  NaturalDisasterGrade,
  TyphoonDisaster,
} from "./natural-disaster";

export class NaturalDisasterManager {
  private pendingDisaster: NaturalDisaster | null = null;

  /**
   * 규모 결정.
   *
   * 현재는 단순 랜덤.
   * 이후 층수/바이옴/특성/아이템으로 가중치 적용.
   */
  private rollGrade(): NaturalDisasterGrade {
    const roll = randSeedInt(100);

    if (roll < 40) {
      return NaturalDisasterGrade.GRADE_1;
    }

    if (roll < 70) {
      return NaturalDisasterGrade.GRADE_2;
    }

    if (roll < 87) {
      return NaturalDisasterGrade.GRADE_3;
    }

    if (roll < 97) {
      return NaturalDisasterGrade.GRADE_4;
    }

    return NaturalDisasterGrade.GRADE_5;
  }

  /** 실제 biomes.ts에 존재하는 바이옴만 사용합니다.
   * 가중치는 재해가 발생한 경우 종류를 정하는 비율입니다.
   */
  private getDisasterWeights(): [number, number, number] {
    const biome = globalScene.arena.biomeType;

    // 실내·이공간·최종 지역은 자연재해가 발생하지 않습니다.
    const excluded = new Set<BiomeId>([
      BiomeId.TOWN,
      BiomeId.METROPOLIS,
      BiomeId.DOJO,
      BiomeId.FACTORY,
      BiomeId.LABORATORY,
      BiomeId.AMUSEMENT_PARK,
      BiomeId.CASTLE,
      BiomeId.ABANDONED_CASTLE,
      BiomeId.DESERTED_HOUSE,
      BiomeId.SPACE,
      BiomeId.END,
      BiomeId.TUTORIAL_ROOM,
    ]);
    if (excluded.has(biome)) {
      return [0, 0, 0];
    }

    const quakeHigh = new Set<BiomeId>([
      BiomeId.CAVE,
      BiomeId.LOG_CAVE,
      BiomeId.SPARK_CAVE,
      BiomeId.POLLUTED_CAVE,
      BiomeId.SAND_CAVE,
      BiomeId.ICE_CAVE,
      BiomeId.FAIRY_CAVE,
      BiomeId.MAGMA_CAVERN,
      BiomeId.VORTEX_CAVE,
      BiomeId.MOUNTAIN,
      BiomeId.THUNDER_MOUNTAIN,
      BiomeId.SNOW_MOUNTAIN,
      BiomeId.BLACK_MOUNTAIN,
      BiomeId.STAR_MOUNTAIN,
      BiomeId.GREEN_MOUNTAIN,
      BiomeId.WYVERN_MOUNTAIN,
      BiomeId.VOLCANO,
      BiomeId.CANYON,
      BiomeId.RUINS,
      BiomeId.BADLANDS,
      BiomeId.ABYSS,
    ]);
    const floodHigh = new Set<BiomeId>([
      BiomeId.RIVER,
      BiomeId.POLLUTED_RIVER,
      BiomeId.LAKE,
      BiomeId.GLACIER_LAKE,
      BiomeId.DRAKE_LAKE,
      BiomeId.SWAMP,
      BiomeId.SEWER,
      BiomeId.BEACH,
      BiomeId.SEA,
      BiomeId.SEABED,
    ]);
    const floodLow = new Set<BiomeId>([
      BiomeId.CANYON,
      BiomeId.PLAINS,
      BiomeId.FOREST,
      BiomeId.JUNGLE,
      BiomeId.FAIRY_FOREST,
      BiomeId.BAMBOO_FOREST,
      BiomeId.GRASS,
      BiomeId.TALL_GRASS,
      BiomeId.MEADOW,
      BiomeId.MUSHROOM_FOREST,
      BiomeId.ISLAND,
      BiomeId.GHOST_SHIP,
    ]);
    const typhoonHigh = new Set<BiomeId>([BiomeId.SEA, BiomeId.BEACH, BiomeId.SKY, BiomeId.ISLAND, BiomeId.GHOST_SHIP]);
    const typhoonLow = new Set<BiomeId>([
      BiomeId.PLAINS,
      BiomeId.GRASS,
      BiomeId.TALL_GRASS,
      BiomeId.MEADOW,
      BiomeId.RIVER,
      BiomeId.LAKE,
      BiomeId.POLLUTED_RIVER,
      BiomeId.GLACIER_LAKE,
      BiomeId.DRAKE_LAKE,
      BiomeId.SNOWY_FIELD,
      BiomeId.LIGHTNING_FIELD,
      BiomeId.SHARP_FIELD,
      BiomeId.BLACK_FIELD,
      BiomeId.VORTEX_CAVE,
    ]);

    const earthquake = quakeHigh.has(biome) ? 6 : 1;
    const flood = floodHigh.has(biome) ? 7 : floodLow.has(biome) ? 2 : 0;
    const typhoon = typhoonHigh.has(biome) ? 7 : typhoonLow.has(biome) ? 2 : 0;
    return [earthquake, flood, typhoon];
  }

  /** 해당 바이옴에서 가능한 재해만 추첨합니다. */
  private rollDisaster(): NaturalDisaster | null {
    const [earthquake, flood, typhoon] = this.getDisasterWeights();
    const total = earthquake + flood + typhoon;
    if (total <= 0) {
      return null;
    }
    const grade = this.rollGrade();
    const roll = randSeedInt(total);
    if (roll < earthquake) {
      return new EarthquakeDisaster(grade);
    }
    if (roll < earthquake + flood) {
      return new FloodDisaster(grade);
    }
    return new TyphoonDisaster(grade);
  }

  private getDisasterChance(): number {
    const mode = globalScene.gameMode.modeId;
    const wave = globalScene.currentBattle.waveIndex;

    let startWave: number;

    switch (mode) {
      case GameModes.DAILY:
        startWave = 31;
        break;

      case GameModes.WEEKLY:
        startWave = 71;
        break;

      default:
        startWave = 101;
        break;
    }

    if (wave < startWave) {
      return 0;
    }

    return 50;
  }

  /**
   * 테스트용.
   *
   * 나중에 실제 발생확률 판정을 여기에 추가.
   */
  public prepareDisaster(): NaturalDisaster | null {
    this.pendingDisaster = null;

    const chance = this.getDisasterChance();

    if (chance <= 0) {
      return null;
    }

    const roll = randSeedInt(100);

    if (roll >= chance) {
      return null;
    }

    const disaster = this.rollDisaster();

    if (!disaster) {
      return null;
    }

    this.pendingDisaster = disaster;

    console.log("[NATURAL_DISASTER_PREPARED]", {
      type: disaster.type,
      grade: disaster.grade,
      chance,
    });

    return disaster;
  }

  public getPendingDisaster(): NaturalDisaster | null {
    return this.pendingDisaster;
  }

  public async activatePreparedDisaster(): Promise<boolean> {
    if (!this.pendingDisaster) {
      return false;
    }

    await this.pendingDisaster.apply();

    return true;
  }

  public clearPendingDisaster(): void {
    this.pendingDisaster = null;
  }
}

export const naturalDisasterManager = new NaturalDisasterManager();
