import { MysteryMonsterSpecies } from "#data/mystery-monster-species";
import { AbilityId } from "#enums/ability-id";
import { MysteryMonsterId } from "#enums/mystery-monster-id";
import { PokemonType } from "#enums/pokemon-type";

export const allMysteryMonsters: MysteryMonsterSpecies[] = [
  new MysteryMonsterSpecies(
  MysteryMonsterId.ROBOKID,
  "Robokid",
  PokemonType.MYSTERY,
  null,

  AbilityId.DOWNLOAD,
  AbilityId.NONE,
  AbilityId.NONE,

  80, // HP
  80, // 공격
  80, // 방어
  80, // 특수공격
  80, // 특수방어
  80, // 스피드

  "robokid",
  52,
),
  // 디 아더: 로보키드 폭주형 (HP 50% 이하 시 전환 예정)
  new MysteryMonsterSpecies(
  MysteryMonsterId.ROBOKID_BERSERK,
  "Robokid (Berserk)",
  PokemonType.MYSTERY,
  null,
  AbilityId.DOWNLOAD,
  AbilityId.NONE,
  AbilityId.NONE,
  120, 120, 120, 120, 120, 120,
  "robokid_berserk",
  45,
),
  // 디 아더: M.F.O 외피형
  new MysteryMonsterSpecies(
    MysteryMonsterId.MFO, "M.F.O",
    PokemonType.MYSTERY, null,
    AbilityId.LEVITATE, AbilityId.NONE, AbilityId.NONE,
    115, 115, 115, 115, 115, 115,
    "mfo", 52, // 실제 스프라이트 키 및 프레임 개수 확인 필요
  ),
  // 디 아더: M.N.O.2.4.8 일반형 (종족값 합계 800)
  new MysteryMonsterSpecies(
    MysteryMonsterId.MNO248, "M.N.O.2.4.8",
    PokemonType.MYSTERY, null,
    AbilityId.CLEAR_BODY, AbilityId.NONE, AbilityId.NONE,
    100, 184, 160, 95, 160, 101,
    "mno248", 52, // 실제 스프라이트 키 및 프레임 개수 확인 필요
  ),
  // 디 아더: M.N.O.2.4.8 폭주형 (입력 능력치 합계는 899)
  new MysteryMonsterSpecies(
    MysteryMonsterId.MNO248_BERSERK, "M.N.O.2.4.8 (Berserk)",
    PokemonType.MYSTERY, null,
    AbilityId.CLEAR_BODY, AbilityId.NONE, AbilityId.NONE,
    100, 200, 160, 95, 160, 184,
    "mno248-berserk", 52, // 실제 스프라이트 키 및 프레임 개수 확인 필요
  ),
  new MysteryMonsterSpecies(
    MysteryMonsterId.MYSTERIAN,
    "Mysterian",
    PokemonType.MYSTERY,
    null,

    AbilityId.PRESSURE,
    AbilityId.NONE,
    AbilityId.NONE,

    80, // HP
    80, // 공격
    80, // 방어
    80, // 특수공격
    80, // 특수방어
    80, // 스피드

    "mysterian",
    52,
  ),
  new MysteryMonsterSpecies(
  MysteryMonsterId.DEMONSTERY,
  "Demonstery",
  PokemonType.MYSTERY,
  null,

  AbilityId.PRESSURE, // 임시. 나중에 전용 특성으로 교체
  AbilityId.NONE,
  AbilityId.NONE,

  200, 200, 200, 200, 200, 200, // 임시 능력치

  "demonstery",
  128,
),
];

export function getMysteryMonster(
  id: MysteryMonsterId,
): MysteryMonsterSpecies {
  const monster =
    allMysteryMonsters.find(m => m.id === id);

  if (!monster) {
    throw new Error(
      `Mystery Monster not found: ${id}`,
    );
  }

  return monster;
}