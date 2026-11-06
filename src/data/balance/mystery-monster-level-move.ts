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
  // 디아더 8·25·55층: 일반 로보키드 — 초반에는 기본 공격 위주
  [MysteryMonsterId.ROBOKID]: [
    [1, MoveId.TACKLE],
    [1, MoveId.THUNDER_SHOCK],
    [1, MoveId.METAL_CLAW],
    [1, MoveId.SWIFT],
  ],
  // HP 절반에서 전환되는 폭주형 — 고위력 기술을 과도하게 주지 않음
  [MysteryMonsterId.ROBOKID_BERSERK]: [
    [1, MoveId.SPARK],
    [1, MoveId.METAL_CLAW],
    [1, MoveId.SWIFT],
    [1, MoveId.TRI_ATTACK],
  ],
  // M.F.O.: 공중 기동과 에너지 포격
  [MysteryMonsterId.MFO]: [
    [1, MoveId.AIR_SLASH],
    [1, MoveId.FLASH_CANNON],
    [1, MoveId.THUNDERBOLT],
    [1, MoveId.DARK_PULSE],
  ],
  // M.N.O.2.4.8: 물리·특수 혼합형
  [MysteryMonsterId.MNO248]: [
    [1, MoveId.IRON_HEAD],
    [1, MoveId.PSYCHIC],
    [1, MoveId.EARTH_POWER],
    [1, MoveId.DARK_PULSE],
  ],
  // M.N.O.2.4.8 폭주형: 강화된 공격력과 최후의 대포격
  [MysteryMonsterId.MNO248_BERSERK]: [
    [1, MoveId.IRON_HEAD],
    [1, MoveId.PSYCHIC],
    [1, MoveId.FLASH_CANNON],
    [1, MoveId.HYPER_BEAM],
  ],
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
