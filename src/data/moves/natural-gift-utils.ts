import { BerryType } from "#enums/berry-type";        // 네 경로에 맞게
import { MoveId } from "#enums/move-id";
import { allMoves } from "#data/data-lists";
import type { Pokemon } from "#field/pokemon";
import { BerryModifier } from "#modifiers/modifier"; // 네 경로에 맞게

// ✅ 핵심: 열매 -> 발동 기술 매핑
export const NATURAL_GIFT_BERRY_TO_MOVE: Partial<Record<BerryType, MoveId>> = {
  [BerryType.ORAN]: MoveId.BOOMBURST, // 네 예시: 오랭 -> 폭음파
  [BerryType.SITRUS]: MoveId.WIDE_IMPACT,
  [BerryType.LUM]: MoveId.DRAGON_ENERGY,
  [BerryType.ENIGMA]: MoveId.DRAGON_LANCE,
  [BerryType.LIECHI]: MoveId.COLLISION_COURSE,
  [BerryType.GANLON]: MoveId.MIGHTY_BURST,
  [BerryType.PETAYA]: MoveId.PRECIPICE_BLADES,
  [BerryType.APICOT]: MoveId.SAND_HURRICANE,
  [BerryType.SALAC]: MoveId.WICKED_BLOW,
  [BerryType.LANSAT]: MoveId.FIERY_WRATH,
  [BerryType.STARF]: MoveId.BIO_ENERGY,
  [BerryType.LEPPA]: MoveId.RED_IMPACT,
  [BerryType.FIGY]: MoveId.ANCIENT_SPEAR,
  [BerryType.WIKI]: MoveId.MINERAL_BURST,
  [BerryType.MAGO]: MoveId.ASTRAL_BURST,
  [BerryType.AGUAV]: MoveId.SPECTER_LANCE,
  [BerryType.LAPAPA]: MoveId.AEROBURST,
  [BerryType.POMEG]: MoveId.SKY_LANCE,
  [BerryType.KELPSY]: MoveId.OCEAN_SPEAR,
  [BerryType.QUALOT]: MoveId.WATER_SPOUT,
  [BerryType.HONDEW]: MoveId.THUNDER_SPEAR,
  [BerryType.GREPA]: MoveId.CHARGE_BURST,
  [BerryType.TAMATO]: MoveId.BIO_LANCE,
  [BerryType.OCCA]: MoveId.SPARKLING_SOUL,
  [BerryType.PASSHO]: MoveId.OVERGROWTH,
  [BerryType.WACAN]: MoveId.POWER_WHIP,
  [BerryType.RINDO]: MoveId.LOCUST,
  [BerryType.YACHE]: MoveId.MEGAHORN,
  [BerryType.CHOPLE]: MoveId.TOXIC_SPOUT,
  [BerryType.KEBIA]: MoveId.GUNK_SHOT,
  [BerryType.SHUCA]: MoveId.MAGNET_SPOUT,
  [BerryType.COBA]: MoveId.IRON_KICK,
  [BerryType.PAYAPA]: MoveId.GLACIAL_LANCE,
  [BerryType.TANGA]: MoveId.COLD_SPOUT,
  [BerryType.CHARTI]: MoveId.BLAZE_LANCE,
  [BerryType.KASIB]: MoveId.ERUPTION,
  [BerryType.HABAN]: MoveId.NIHIL_LIGHT,
  [BerryType.COLBUR]: MoveId.THOUSAND_ARROWS,
  [BerryType.BABIRI]: MoveId.IRON_LANCE,
  [BerryType.CHILAN]: MoveId.MULTI_ATTCK,
  [BerryType.ROSELI]: MoveId.SPARKLY_SWIRL,
  [BerryType.MICLE]: MoveId.THOUSAND_ARROWS,
  [BerryType.NICLE]: MoveId.DIAMOND_STORM,
  [BerryType.CHERI]: MoveId.MALIGNANT_CHAIN,
  [BerryType.CHESTO]: MoveId.SEED_FLARE,
  [BerryType.PECHA]: MoveId.DOUBLE_IRON_BASH,
  [BerryType.RAWST]: MoveId.ORIGIN_PULSE,
  [BerryType.ASPEAR]: MoveId.AEROBLAST,
  [BerryType.PERSIM]: MoveId.ASTRAL_BARRAGE,
  [BerryType.WEPEAR]: MoveId.SECRET_SWORD,
  [BerryType.BELUE]: MoveId.DARKEST_LARIAT,
  [BerryType.CORNN]: MoveId.BUG_BUZZ,
  [BerryType.MAGOST]: MoveId.GLACIATE,
  [BerryType.NOMEL]: MoveId.THUNDEROUS_KICK,
  [BerryType.SPELON]: MoveId.BLUE_FLARE,
  [BerryType.PAMTRE]: MoveId.BOLT_STRIKE,
  [BerryType.WATMEL]: MoveId.FISHIOUS_REND,
  [BerryType.DURIN]: MoveId.TACHYON_CUTTER,
  [BerryType.PINAP]: MoveId.STELLAR_ENERGY,
  [BerryType.JABOCA]: MoveId.SALT_CURE,
  [BerryType.ROWAP]: MoveId.SAPPY_SEED,
  [BerryType.KEE]: MoveId.MIGHTY_CLEAVE,
  [BerryType.MARANGA]: MoveId.DARK_BARRAGE,
  [BerryType.CUSTAP]: MoveId.MATCHA_GOTCHA,
};

// (선택) 매핑 없는 열매 방지용
export function hasNaturalGiftMapping(bt: BerryType): boolean {
  return NATURAL_GIFT_BERRY_TO_MOVE[bt] != null;
}

// ✅ 현재 포켓몬이 가진 열매들 중 자연의은혜에 쓸 수 있는 목록 추출(플레이어/AI 공용)
export function getNaturalGiftCandidateBerries(
  pokemon: Pokemon,
  allHeldMods: any[], // 너 엔진에선 globalScene.findModifiers 결과
): BerryModifier[] {
  return allHeldMods.filter(m =>
    m instanceof BerryModifier &&
    m.pokemonId === pokemon.id &&
    !m.consumed &&
    (m.stackCount ?? 1) > 0 &&
    hasNaturalGiftMapping(m.berryType)
  ) as BerryModifier[];
}

// ✅ 선택된 열매로 실제 발동할 기술 ID
export function getNaturalGiftMoveId(berryType: BerryType): MoveId {
  return NATURAL_GIFT_BERRY_TO_MOVE[berryType] ?? MoveId.NONE;
}

// (선택) UI 표시용: "열매명 → 기술명"
export function getNaturalGiftDisplayText(berryType: BerryType): string {
  const mid = getNaturalGiftMoveId(berryType);
  const name = mid !== MoveId.NONE ? allMoves[mid].name : "???";
  return `${BerryType[berryType]} → ${name}`;
}
