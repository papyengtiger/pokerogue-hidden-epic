import type { AbilityId } from "#enums/ability-id";
import type { MysteryMonsterId } from "#enums/mystery-monster-id";
import type { PokemonType } from "#enums/pokemon-type";

export interface MysteryMonsterData {
  id: MysteryMonsterId;
  name: string;

  type1: PokemonType;
  type2: PokemonType | null;

  baseStats: [hp: number, atk: number, def: number, spatk: number, spdef: number, spd: number];

  ability1: AbilityId;
  ability2: AbilityId;
  abilityHidden: AbilityId;

  spriteKey: string;
}
