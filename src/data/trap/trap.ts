import { globalScene } from "#app/global-scene";
import { getArenaTag } from "#data/arena-tag";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattleType } from "#enums/battle-type";
import { MoveId } from "#enums/move-id";
import { SpikesTrapGrade, TrapCategory } from "#enums/trap-category";
import { TrapType } from "#enums/trap-type";
import { applyDamageToPokemon } from "#mystery-encounters/encounter-pokemon-utils";

export abstract class Trap {
  public abstract readonly type: TrapType;
  public abstract readonly category: TrapCategory;
  public abstract readonly imageKey: string;

  public weight = 100;

  private readonly triggeredPokemonIds = new Set<number>();

  constructor(public readonly targetSide: ArenaTagSide) {}

  public canTrigger(): boolean {
    return true;
  }

  public canBeDetected(): boolean {
    return true;
  }

  public canBePrevented(): boolean {
    return true;
  }

  protected getTargetSides(): ArenaTagSide[] {
    return this.targetSide === ArenaTagSide.BOTH ? [ArenaTagSide.PLAYER, ArenaTagSide.ENEMY] : [this.targetSide];
  }

  protected hasTriggered(pokemon: Pokemon): boolean {
    return this.triggeredPokemonIds.has(pokemon.id);
  }

  protected markTriggered(pokemon: Pokemon): void {
    this.triggeredPokemonIds.add(pokemon.id);
  }

  public abstract applyToPokemon(pokemon: Pokemon): boolean;

  public abstract apply(): Promise<void> | void;
}

export class StealthRockTrap extends Trap {
  public readonly type = TrapType.STEALTH_ROCK;
  public readonly category = TrapCategory.FIELD;

  public readonly imageKey = "stealth-rock";
  /**
   * 특정 포켓몬 한 마리에게 자연 스텔스록 적용
   */
  public applyToPokemon(pokemon: Pokemon): boolean {
    // 이미 이번 자연함정을 밟았다면 다시 발동하지 않음
    if (this.hasTriggered(pokemon)) {
      return false;
    }

    const side = pokemon.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;

    if (this.targetSide !== ArenaTagSide.BOTH && this.targetSide !== side) {
      return false;
    }

    const tag = getArenaTag(ArenaTagType.STEALTH_ROCK, 0, MoveId.STEALTH_ROCK, undefined, side);

    if (!tag) {
      return false;
    }

    const applied = !!tag.apply(false, pokemon);

    if (applied) {
      this.markTriggered(pokemon);
    }

    return applied;
  }

  /**
   * 조우 시작 시 이미 필드에 존재하는 포켓몬에게 적용
   */
  public apply(): void {
    for (const side of this.getTargetSides()) {
      const field = side === ArenaTagSide.PLAYER ? globalScene.getPlayerField() : globalScene.getEnemyField();

      for (const pokemon of field) {
        if (!pokemon || pokemon.isFainted()) {
          continue;
        }

        // 이미 필드에 나와 있는 플레이어 포켓몬
        if (side === ArenaTagSide.PLAYER && pokemon.isOnField()) {
          this.applyToPokemon(pokemon);
        }

        // 이미 생성되어 있는 야생 포켓몬
        if (side === ArenaTagSide.ENEMY && globalScene.currentBattle.battleType === BattleType.WILD) {
          this.applyToPokemon(pokemon);
        }
      }
    }
  }
}

export class SpikesTrap extends Trap {
  public readonly type = TrapType.SPIKES;
  public readonly category = TrapCategory.FIELD;

  constructor(
    targetSide: ArenaTagSide,
    public readonly grade: SpikesTrapGrade,
  ) {
    super(targetSide);
  }

  public get imageKey(): string {
    switch (this.grade) {
      case SpikesTrapGrade.GRADE_1:
        return "spike-trap1";

      case SpikesTrapGrade.GRADE_2:
        return "spike-trap2";

      case SpikesTrapGrade.GRADE_3:
        return "spike-trap3";
    }
  }

  public applyToPokemon(pokemon: Pokemon): boolean {
    if (this.hasTriggered(pokemon)) {
      return false;
    }

    const side = pokemon.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;

    if (this.targetSide !== ArenaTagSide.BOTH && this.targetSide !== side) {
      return false;
    }

    const tag = getArenaTag(ArenaTagType.SPIKES, 0, MoveId.SPIKES, undefined, side);

    if (!tag) {
      return false;
    }

    // 1등급은 기본 1레이어.
    // 2등급은 한 번 중첩.
    // 3등급은 두 번 중첩.
    for (let i = 1; i < this.grade; i++) {
      tag.onOverlap();
    }

    const applied = !!tag.apply(false, pokemon);

    if (applied) {
      this.markTriggered(pokemon);
    }

    return applied;
  }

  public apply(): void {
    for (const side of this.getTargetSides()) {
      const field = side === ArenaTagSide.PLAYER ? globalScene.getPlayerField() : globalScene.getEnemyField();

      for (const pokemon of field) {
        if (!pokemon || pokemon.isFainted()) {
          continue;
        }

        if (side === ArenaTagSide.PLAYER && pokemon.isOnField()) {
          this.applyToPokemon(pokemon);
        }

        if (side === ArenaTagSide.ENEMY && globalScene.currentBattle.battleType === BattleType.WILD) {
          this.applyToPokemon(pokemon);
        }
      }
    }
  }
}

export class ExplosionTrap extends Trap {
  public readonly type = TrapType.EXPLOSION;
  public readonly category = TrapCategory.DAMAGE;

  public applyToPokemon(pokemon: Pokemon): boolean {
    if (pokemon.isFainted()) {
      return false;
    }

    const side = pokemon.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;

    if (this.targetSide !== ArenaTagSide.BOTH && this.targetSide !== side) {
      return false;
    }

    const damage = Math.max(1, Math.floor(pokemon.getMaxHp() / 8));

    applyDamageToPokemon(pokemon, damage);

    return true;
  }

  public apply(): void {
    // 나중에 자연 폭발함정용으로 정식 구현
  }
}
