import { MoveId } from "#enums/move-id";
import { MysteryMonsterId } from "#enums/mystery-monster-id";

export type MysteryMonsterLevelMove = [number, MoveId];

export const mysteryMonsterLevelMoves: Partial<
  Record<MysteryMonsterId, MysteryMonsterLevelMove[]>
> = {
  [MysteryMonsterId.MYSTERIAN]: [
    [1, MoveId.LEER],
    [1, MoveId.POUND],
  ],
  [MysteryMonsterId.DEMONSTERY]: [
    [1, MoveId.LEER],
    [1, MoveId.POUND],
  ],
};