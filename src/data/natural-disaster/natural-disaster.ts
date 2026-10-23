import { globalScene } from "#app/global-scene";
import { AbilityId } from "#enums/ability-id";
import { HitResult } from "#enums/hit-result";
import { MoveId } from "#enums/move-id";
import { PokemonType } from "#enums/pokemon-type";
import type { Pokemon } from "#field/pokemon";
import { randSeedInt } from "#utils/common";

export enum NaturalDisasterType {
  EARTHQUAKE,
  FLOOD,
  ROCKSLIDE,
  LIGHTNING,
  ERUPTION,
  TYPHOON,
}

export enum NaturalDisasterGrade {
  GRADE_1 = 1,
  GRADE_2 = 2,
  GRADE_3 = 3,
  GRADE_4 = 4,
  GRADE_5 = 5,
}

/**
 * 도구/기술/특성 시스템에서 등록하는 추가 감면 판정.
 * 반환값: 0 = 면역, 0.5 = 피해 절반, 1 = 감면 없음.
 * 여러 효과가 있으면 곱연산으로 중첩된다.
 * 주의: 실제 도구 및 기술 판정은 호출 측에서 연결해야 한다.
 */
export type DisasterProtectionResolver = (pokemon: Pokemon, disaster: NaturalDisaster, reserve: boolean) => number;

const disasterProtectionResolvers = new Set<DisasterProtectionResolver>();

/** 호출 시 등록 해제 함수를 반환한다. */
export function registerDisasterProtectionResolver(resolver: DisasterProtectionResolver): () => void {
  disasterProtectionResolvers.add(resolver);
  return () => disasterProtectionResolvers.delete(resolver);
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
  protected calculateDamage(pokemon: Pokemon, reserve = false): number {
    const baseDamage = Math.max(1, Math.floor(pokemon.getMaxHp() * this.getDamageRatio()));
    // 자연재해는 기술 공격이 아닌 간접 피해다.
    // 매직가드와 사용자 지정 특성별 재해 면역을 먼저 적용한다.
    if (this.hasDisasterImmunityAbility(pokemon)) {
      return 0;
    }
    // 미스터리 조우처럼 진영 내 생존 포켓몬이 보호 기술을 보유했다면 모두 보호.
    if (this.hasDisasterProtectionMoveInParty(pokemon)) {
      return 0;
    }
    const typeMultiplier = this.getTypeDamageMultiplier(pokemon);
    if (typeMultiplier === 0) {
      return 0;
    }

    // 실제 소지 도구를 확인한다. 파손되어 목록에서 제거된 풍선은 적용되지 않는다.
    const heldItems = pokemon.getHeldItems();
    const itemIds = new Set(heldItems.map(item => item.type?.id));
    if (this.type === NaturalDisasterType.EARTHQUAKE && itemIds.has("AIR_BALLOON")) {
      return 0;
    }
    if (this.type === NaturalDisasterType.TYPHOON && itemIds.has("UTILITY_UMBRELLA")) {
      return 0;
    }

    let modifier = typeMultiplier;
    for (const resolver of disasterProtectionResolvers) {
      const result = resolver(pokemon, this, reserve);
      // 잘못된 반환값이 HP를 증가시키거나 피해를 증폭하지 않도록 제한
      if (Number.isFinite(result)) {
        modifier *= Math.max(0, Math.min(1, result));
      }
    }
    // 면역이면 0, 감면 중 살아남은 피해는 최소 1
    return modifier === 0 ? 0 : Math.max(1, Math.floor(baseDamage * modifier));
  }

  /**
   * 기술을 실제로 사용하지 않아도, 같은 진영의 생존 포켓몬 중
   * 대응 기술을 보유한 포켓몬이 하나라도 있으면 그 진영 전체를 보호한다.
   * 기술을 배울 수 있기만 한 경우는 제외하고 실제 기술칸을 검사한다.
   * 지진/홍수/태풍 외 재해는 여기서 보호하지 않는다.
   */
  protected hasDisasterProtectionMoveInParty(pokemon: Pokemon): boolean {
    const escapeMoves = [MoveId.SHADOW_FORCE, MoveId.PHANTOM_FORCE];
    const specificMoves: Partial<Record<NaturalDisasterType, MoveId[]>> = {
      [NaturalDisasterType.EARTHQUAKE]: [MoveId.FLY, MoveId.BOUNCE, MoveId.SKY_DROP],
      [NaturalDisasterType.FLOOD]: [MoveId.DIVE],
      [NaturalDisasterType.TYPHOON]: [MoveId.DIG],
    };
    const protectedMoves = [...escapeMoves, ...(specificMoves[this.type] ?? [])];
    // 사전에 정한 세 재해가 아닌 경우 섀도다이브도 별도 적용하지 않는다.
    if (![NaturalDisasterType.EARTHQUAKE, NaturalDisasterType.FLOOD, NaturalDisasterType.TYPHOON].includes(this.type)) {
      return false;
    }
    const party = pokemon.isPlayer() ? globalScene.getPlayerParty() : globalScene.getEnemyParty();
    return party.some(
      member => member && !member.isFainted() && member.getMoveset().some(move => protectedMoves.includes(move.moveId)),
    );
  }

  /** 특성별 자연재해 면역. Pokemon.hasAbility()로 현재 특성을 판정한다. */
  protected hasDisasterImmunityAbility(pokemon: Pokemon): boolean {
    if (pokemon.hasAbility(AbilityId.MAGIC_GUARD)) {
      return true;
    }
    switch (this.type) {
      case NaturalDisasterType.EARTHQUAKE:
        // 천정부지의 실제 AbilityId가 확인되면 부유와 함께 면역에 추가하세요.
        return pokemon.hasAbility(AbilityId.LEVITATE);
      case NaturalDisasterType.FLOOD:
        return pokemon.hasAbility(AbilityId.STORM_DRAIN) || pokemon.hasAbility(AbilityId.WATER_ABSORB);
      case NaturalDisasterType.TYPHOON:
        return pokemon.hasAbility(AbilityId.WIND_POWER) || pokemon.hasAbility(AbilityId.WIND_RIDER);
      default:
        return false;
    }
  }

  /** 재해별 타입 면역/감면. 복합 타입이라도 같은 감면은 한 번만 적용. */
  protected getTypeDamageMultiplier(pokemon: Pokemon): number {
    const types = pokemon.getTypes();
    const has = (type: PokemonType) => types.includes(type);
    switch (this.type) {
      case NaturalDisasterType.EARTHQUAKE:
        if (has(PokemonType.FLYING)) {
          return 0;
        }
        if (has(PokemonType.GROUND) || has(PokemonType.STEEL)) {
          return 0.5;
        }
        return 1;
      case NaturalDisasterType.FLOOD:
        if (has(PokemonType.WATER)) {
          return 0;
        }
        if (has(PokemonType.GRASS) || has(PokemonType.DRAGON)) {
          return 0.5;
        }
        return 1;
      case NaturalDisasterType.TYPHOON:
        if (has(PokemonType.FLYING)) {
          return 0;
        }
        if (has(PokemonType.ROCK) || has(PokemonType.STEEL)) {
          return 0.5;
        }
        return 1;
      default:
        return 1;
    }
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

    const damage = this.calculateDamage(pokemon, reserve);

    if (damage === 0) {
      console.log("[NATURAL_DISASTER_IMMUNE]", { type: this.type, pokemon: pokemon.getName() });
      return false;
    }

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

/** 홍수와 태풍은 기존 지진과 동일한 규모/대기 피해 규칙을 공유한다. */
export class FloodDisaster extends NaturalDisaster {
  public readonly type = NaturalDisasterType.FLOOD;
}

export class TyphoonDisaster extends NaturalDisaster {
  public readonly type = NaturalDisasterType.TYPHOON;
}
