import { MysteryMonsterSpecies } from "#data/mystery-monster-species";
import { AbilityId } from "#enums/ability-id";
import { MysteryMonsterId } from "#enums/mystery-monster-id";
import { PokemonType } from "#enums/pokemon-type";

export const allMysteryMonsters: MysteryMonsterSpecies[] = [];

export function initMysteryMonsters(): void {
  allMysteryMonsters.push(
    new MysteryMonsterSpecies(
      MysteryMonsterId.MYSTERIAN,
      "Mysterian",
      PokemonType.MYSTERY,
      null,

      AbilityId.PRESSURE,
      AbilityId.NONE,
      AbilityId.NONE,

      100, // HP
      100, // 공격
      100, // 방어
      100, // 특수공격
      100, // 특수방어
      100, // 스피드

      "mysterian",
    ),
  );
}

export function getMysteryMonster(
  id: MysteryMonsterId,
): MysteryMonsterSpecies {
  const monster = allMysteryMonsters.find(m => m.id === id);

  if (!monster) {
    throw new Error(`Mystery Monster not found: ${id}`);
  }

  return monster;
}