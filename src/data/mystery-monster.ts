import type { AbilityId } from "#enums/ability-id";
import type { MoveId } from "#enums/move-id";
import type { MysteryMonsterId } from "#enums/mystery-monster-id";

export interface MysteryMonsterData {
  id: MysteryMonsterId;
  name: string;

  baseStats: [hp: number, atk: number, def: number, spatk: number, spdef: number, spd: number];

  ability: AbilityId;
  moves: MoveId[];
  spriteKey: string;

  rank: "minion" | "boss";
}
