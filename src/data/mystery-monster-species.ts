import { mysteryMonsterLevelMoves } from "#data/balance/mystery-monster-level-move";
import { AbilityId } from "#enums/ability-id";
import type { MysteryMonsterId } from "#enums/mystery-monster-id";
import type { PokemonType } from "#enums/pokemon-type";

export class MysteryMonsterSpecies {
  public readonly id: MysteryMonsterId;
  public readonly name: string;

  public readonly type1: PokemonType;
  public readonly type2: PokemonType | null;

  public readonly ability1: AbilityId;
  public readonly ability2: AbilityId;
  public readonly abilityHidden: AbilityId;

  public readonly baseStats: number[];

  public readonly spriteKey: string;
  public readonly frameCount: number;

  constructor(
    id: MysteryMonsterId,
    name: string,
    type1: PokemonType,
    type2: PokemonType | null,
    ability1: AbilityId,
    ability2: AbilityId,
    abilityHidden: AbilityId,
    baseHp: number,
    baseAtk: number,
    baseDef: number,
    baseSpatk: number,
    baseSpdef: number,
    baseSpd: number,
    spriteKey: string,
    frameCount: number,
  ) {
    this.id = id;
    this.name = name;

    this.type1 = type1;
    this.type2 = type2;

    this.ability1 = ability1;
    this.ability2 = ability2 === AbilityId.NONE ? ability1 : ability2;

    this.abilityHidden = abilityHidden;

    this.baseStats = [baseHp, baseAtk, baseDef, baseSpatk, baseSpdef, baseSpd];

    this.spriteKey = spriteKey;
    this.frameCount = frameCount;
  }

  getAbility(index: number): AbilityId {
    if (index === 0) {
      return this.ability1;
    }

    if (index === 1) {
      return this.ability2;
    }

    return this.abilityHidden;
  }

  getBaseStat(stat: number): number {
    return this.baseStats[stat];
  }

  getCryKey(): string {
    return `cry/mystery-monster/${this.spriteKey}`;
  }

  getBaseStatTotal(): number {
    return this.baseStats.reduce((total, stat) => total + stat, 0);
  }

  getLevelMoves(): MysteryMonsterLevelMove[] {
    return mysteryMonsterLevelMoves[this.id]?.slice() ?? [];
  }
}
