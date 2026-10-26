import { MoveId } from "#enums/move-id";
import { MysteryMonsterId } from "#enums/mystery-monster-id";

export type MysteryMonsterLevelMove = [number, MoveId];

/**
 * 공개 베타용 기술 구성.
 * 미스터리언: 정신 교란과 기묘한 에너지 공격.
 * 데몬스터리: 특수공격 강화 후 정신·그림자·어둠 공격.
 * 신규 미스터리타입 전용기 추가 전까지 기존 기술을 사용한다.
 */
export const mysteryMonsterLevelMoves: Partial<
  Record<MysteryMonsterId, MysteryMonsterLevelMove[]>
> = {
  [MysteryMonsterId.MYSTERIAN]: [
    [1, MoveId.CONFUSE_RAY],
    [1, MoveId.PSYBEAM],
    [1, MoveId.NIGHT_SLASH],
    [1, MoveId.SHADOW_BALL],
  ],
  [MysteryMonsterId.DEMONSTERY]: [
    [1, MoveId.NASTY_PLOT],
    [1, MoveId.PSYCHIC],
    [1, MoveId.SHADOW_BALL],
    [1, MoveId.DARK_PULSE],
  ],
};
