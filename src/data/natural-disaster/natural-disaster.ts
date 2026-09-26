import { globalScene } from "#app/global-scene";
import { HitResult } from "#enums/hit-result";
import type { Pokemon } from "#field/pokemon";
import { randSeedInt } from "#utils/common";

export enum NaturalDisasterType {
  EARTHQUAKE,
  FLOOD,
  ROCKSLIDE,
  LIGHTNING,
  ERUPTION,
}

export enum NaturalDisasterGrade {
  GRADE_1 = 1,
  GRADE_2 = 2,
  GRADE_3 = 3,
  GRADE_4 = 4,
  GRADE_5 = 5,
}

export abstract class NaturalDisaster {
  public abstract readonly type: NaturalDisasterType;

  /**
   * 자연재해 규모.
   * 1~5.
   */
  constructor(public readonly grade: NaturalDisasterGrade) {}

  /**
   * 규모에 따른 기본 최대 HP 피해 비율.
   *
   * 1 = 5%
   * 2 = 10%
   * 3 = 15%
   * 4 = 20%
   * 5 = 25%
   */
  protected getDamageRatio(): number {
    switch (this.grade) {
      case NaturalDisasterGrade.GRADE_1:
        return 0.05;

      case NaturalDisasterGrade.GRADE_2:
        return 0.1;

      case NaturalDisasterGrade.GRADE_3:
        return 0.15;

      case NaturalDisasterGrade.GRADE_4:
        return 0.2;

      case NaturalDisasterGrade.GRADE_5:
        return 0.25;

      default:
        return 0.05;
    }
  }

  /**
   * 볼 안의 대기 포켓몬이 피해를 받을 확률.
   *
   * 규모 1~2:
   *   필드만 피해.
   *
   * 규모 3:
   *   대기 포켓몬 각각 40%.
   *
   * 규모 4:
   *   각각 70%.
   *
   * 규모 5:
   *   전원.
   */
  protected getReserveHitChance(): number {
    switch (this.grade) {
      case NaturalDisasterGrade.GRADE_1:
      case NaturalDisasterGrade.GRADE_2:
        return 0;

      case NaturalDisasterGrade.GRADE_3:
        return 40;

      case NaturalDisasterGrade.GRADE_4:
        return 70;

      case NaturalDisasterGrade.GRADE_5:
        return 100;

      default:
        return 0;
    }
  }

  /**
   * 실제 피해량 계산.
   */
  protected calculateDamage(pokemon: Pokemon): number {
    return Math.max(1, Math.floor(pokemon.getMaxHp() * this.getDamageRatio()));
  }

  /**
   * 자연재해 피해를 받을 수 있는지.
   *
   * 이후 여기에
   * - 매직가드
   * - 방진
   * - 타입 면역
   * - 자연재해 면역 특성
   * - 재난 관련 아이템
   *
   * 등을 추가하면 됨.
   */
  protected canDamagePokemon(pokemon: Pokemon): boolean {
    if (!pokemon) {
      return false;
    }

    if (pokemon.isFainted()) {
      return false;
    }

    return true;
  }

  /**
   * 포켓몬 한 마리에게 자연재해 피해 적용.
   */
  protected applyDamageToPokemon(pokemon: Pokemon, reserve = false): boolean {
    if (!this.canDamagePokemon(pokemon)) {
      return false;
    }

    const damage = this.calculateDamage(pokemon);

    console.log("[NATURAL_DISASTER_DAMAGE]", {
      type: this.type,
      grade: this.grade,
      pokemon: pokemon.getName(),
      reserve,
      damage,
      hpBefore: pokemon.hp,
    });

    if (reserve) {
      // 대기 포켓몬은 필드에 없으므로
      // DamageAnimPhase를 발생시키지 않고 HP만 직접 감소
      pokemon.hp = Math.max(0, pokemon.hp - damage);
    } else {
      // 필드 포켓몬은 기존 피해 처리 사용
      pokemon.damageAndUpdate(damage, {
        result: HitResult.INDIRECT,
        ignoreSegments: true,
      });
    }

    console.log("[NATURAL_DISASTER_DAMAGE_END]", {
      pokemon: pokemon.getName(),
      hpAfter: pokemon.hp,
    });

    return true;
  }

  /**
   * 필드 위 모든 포켓몬에게 피해.
   */
  protected applyToFieldPokemon(): void {
    const playerField = globalScene.getPlayerField();

    const enemyField = globalScene.getEnemyField();

    const targets: Pokemon[] = [...playerField, ...enemyField];

    const processedIds = new Set<number>();

    for (const pokemon of targets) {
      if (!pokemon) {
        continue;
      }

      if (processedIds.has(pokemon.id)) {
        continue;
      }

      processedIds.add(pokemon.id);

      this.applyDamageToPokemon(pokemon, false);
    }
  }

  /**
   * 해당 규모에서 대기 포켓몬이 피해 대상이 되는지 판정.
   */
  protected rollReserveHit(): boolean {
    const chance = this.getReserveHitChance();

    if (chance <= 0) {
      return false;
    }

    if (chance >= 100) {
      return true;
    }

    return randSeedInt(100) < chance;
  }

  /**
   * 볼 안에 있는 플레이어/적 대기 포켓몬에게 피해.
   *
   * 현재 필드에 있는 포켓몬은 제외.
   */
  protected applyToReservePokemon(): void {
    const playerParty = globalScene.getPlayerParty();

    const enemyParty = globalScene.getEnemyParty();

    const targets: Pokemon[] = [...playerParty, ...enemyParty];

    const fieldIds = new Set<number>();

    for (const pokemon of globalScene.getPlayerField()) {
      if (pokemon) {
        fieldIds.add(pokemon.id);
      }
    }

    for (const pokemon of globalScene.getEnemyField()) {
      if (pokemon) {
        fieldIds.add(pokemon.id);
      }
    }

    const processedIds = new Set<number>();

    for (const pokemon of targets) {
      if (!pokemon) {
        continue;
      }

      // 필드 포켓몬 중복 피해 방지
      if (fieldIds.has(pokemon.id)) {
        continue;
      }

      if (processedIds.has(pokemon.id)) {
        continue;
      }

      processedIds.add(pokemon.id);

      if (!this.rollReserveHit()) {
        continue;
      }

      this.applyDamageToPokemon(pokemon, true);
    }
  }

  /**
   * 실제 자연재해 실행.
   *
   * 기본적으로 필드 전원은 반드시 피해.
   * 규모 3 이상부터 대기 포켓몬도 영향.
   */
  public async apply(): Promise<void> {
    console.log("[NATURAL_DISASTER_START]", {
      type: this.type,
      grade: this.grade,
    });

    this.applyToFieldPokemon();

    if (this.grade >= NaturalDisasterGrade.GRADE_3) {
      this.applyToReservePokemon();
    }

    console.log("[NATURAL_DISASTER_END]", {
      type: this.type,
      grade: this.grade,
    });
  }
}

export class EarthquakeDisaster extends NaturalDisaster {
  public readonly type = NaturalDisasterType.EARTHQUAKE;
}
