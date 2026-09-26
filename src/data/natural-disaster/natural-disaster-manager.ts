import { globalScene } from "#app/global-scene";
import { GameModes } from "#enums/game-modes";
import { randSeedInt } from "#utils/common";
import { EarthquakeDisaster, type NaturalDisaster, NaturalDisasterGrade } from "./natural-disaster";

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

  /**
   * 자연재해 종류 결정.
   *
   * 처음에는 지진 하나만.
   */
  private rollDisaster(): NaturalDisaster {
    const grade = this.rollGrade();

    return new EarthquakeDisaster(grade);
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
