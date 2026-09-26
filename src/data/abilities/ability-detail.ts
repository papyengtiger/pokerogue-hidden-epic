import { TerrainType } from "#data/terrain";
import { AbilityId } from "#enums/ability-id";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { MoveFlags } from "#enums/move-flags";
import { MoveFlags2 } from "#enums/move-flags-2";
import { PokemonType } from "#enums/pokemon-type";
import { getStatKey, type Stat } from "#enums/stat";
import { StatusEffect } from "#enums/status-effect";
import { WeatherType } from "#enums/weather-type";
import { toCamelCase } from "#utils/strings";
import i18next from "i18next";

type MoveFlagBoostInfo = {
  flag: MoveFlags | MoveFlags2;
  multiplier: number;
};

const moveFlagBoostTable: Partial<Record<AbilityId, MoveFlagBoostInfo>> = {
  [AbilityId.IRON_FIST]: { flag: MoveFlags.PUNCHING_MOVE, multiplier: 1.3 },
  [AbilityId.STRONG_JAW]: { flag: MoveFlags.BITING_MOVE, multiplier: 1.5 },
  [AbilityId.MEGA_LAUNCHER]: { flag: MoveFlags.PULSE_MOVE, multiplier: 1.5 },
  [AbilityId.SHARPNESS]: { flag: MoveFlags.SLICING_MOVE, multiplier: 1.5 },
  [AbilityId.RECKLESS]: { flag: MoveFlags.RECKLESS_MOVE, multiplier: 1.3 },
  [AbilityId.TOUGH_CLAWS]: { flag: MoveFlags.MAKES_CONTACT, multiplier: 1.3 },
};

type MoveFlagImmunityInfo = {
  flag: MoveFlags | MoveFlags2;
};

const moveFlagImmunityTable: Partial<Record<AbilityId, MoveFlagImmunityInfo>> = {
  [AbilityId.OVERCOAT]: { flag: MoveFlags.POWDER_MOVE },
};

export function getAbilityEffectLines(ability: any): string[] {
  if (!ability) {
    return ["• 효과 정보 없음"];
  }

  const override = getAbilityOverrideLines(ability.id as AbilityId);
  if (override) {
    return override;
  }

  const lines: string[] = [];

  const moveFlagBoost = moveFlagBoostTable[ability.id as AbilityId];
  const moveFlagImmunity = moveFlagImmunityTable[ability.id as AbilityId];

  if (moveFlagBoost) {
    lines.push(getMoveFlagBoostLine(moveFlagBoost.flag, moveFlagBoost.multiplier));
  }

  if (moveFlagImmunity) {
    lines.push(getMoveFlagImmunityLine(moveFlagImmunity.flag));
  }

  const skipAttrNames = new Set<string>();

  if (moveFlagBoost) {
    skipAttrNames.add("MovePowerBoostAbAttr");
  }

  if (moveFlagImmunity) {
    skipAttrNames.add("MoveImmunityAbAttr");
  }

  lines.push(
    ...(ability.attrs ?? [])
      .filter((attr: any) => !skipAttrNames.has(attr.constructor?.name))
      .map((attr: any) => `• ${getAttrDescription(attr.constructor?.name, attr)}`)
      .filter(line => line !== "• "),
  );

  return lines.length > 0 ? lines : ["• 상세 효과는 기본 설명을 참고하세요."];
}

function getAbilityOverrideLines(abilityId: AbilityId): string[] | null {
  switch (abilityId) {
    case AbilityId.TRANSISTOR:
      return ["• 전기타입 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.QUICK_FEET:
      return [
        "• 상태 이상이 되면 스피드가 1.5배 상승합니다.",
        "• 마비 상태일 경우 스피드가 2배 상승합니다.",
        "• 절대안깸 특성으로 잠든 상태처럼 취급되는 경우에도 적용됩니다.",
      ];

    case AbilityId.PRESSURE:
      return [
        "• 상대가 기술을 사용할 때 PP를 더 많이 소모시킵니다.",
        "• 등장했을 때 상대의 공격, 방어, 특수공격, 특수방어, 스피드를 0.9배로 낮춥니다.",
        "• 등장 시 전용 메시지가 출력됩니다.",
      ];

    case AbilityId.PRANKSTER:
      return ["• 변화 기술의 우선도가 1 상승합니다."];

    case AbilityId.INSOMNIA:
      return [
        "• 잠듦 상태가 되지 않습니다.",
        "• 등장했을 때 잠듦 상태를 즉시 해제합니다.",
        "• 졸음 상태가 되지 않습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.AROMA_VEIL:
      return [
        "• 자신과 같은 편이 헤롱헤롱, 도발, 사슬묶기, 트집, 회복봉인 상태를 받지 않습니다.",
        "• 이로치 등장 확률 보정값이 2배 상승합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.THICK_FAT:
      return ["• 불꽃타입 공격으로 받는 대미지가 0.5배가 됩니다.", "• 얼음타입 공격으로 받는 대미지가 0.5배가 됩니다."];

    case AbilityId.SHEER_FORCE:
      return [
        "• 추가 효과가 있는 공격 기술의 위력이 1.3배 상승합니다.",
        "• 위력이 상승한 기술은 추가 효과가 발동하지 않습니다.",
        "• 이 효과가 적용된 기술은 생명의구슬 반동 대미지를 받지 않습니다.",
      ];

    case AbilityId.MAGNET_PULL:
      return [
        "• 강철타입 상대를 도망치거나 교체할 수 없게 합니다.",
        "• 고스트타입 상대는 이 효과를 무시합니다.",
        "• 도주 특성, 연막탄, 도주 보조 효과가 있으면 이 효과를 무시합니다.",
      ];

    case AbilityId.ANALYTIC:
      return [
        "• 같은 턴의 다른 포켓몬이 모두 행동한 뒤 기술을 사용하면 위력이 1.3배 상승합니다.",
        "• 마지막으로 행동할수록 유리한 특성입니다.",
      ];

    case AbilityId.PLUS:
    case AbilityId.MINUS:
      return [
        "• 전기타입 기술의 위력이 1.3배 상승합니다.",
        "• 더블배틀에서 같은 편이 플러스 또는 마이너스 특성을 가지고 있으면 특수공격이 1.5배 상승합니다.",
      ];

    case AbilityId.POWER_SPOT:
      return ["• 같은 편의 물리/특수 공격 기술 위력이 1.3배 상승합니다.", "• 변화 기술에는 적용되지 않습니다."];

    case AbilityId.SURGE_SURFER:
      return ["• 일렉트릭필드 상태일 때 스피드가 2배 상승합니다."];

    case AbilityId.QUARK_DRIVE:
      return [
        "• 부스트에너지를 지니고 있거나 일렉트릭필드일 때 가장 높은 능력치가 상승합니다.",
        "• 일렉트릭필드가 전개되면 효과가 다시 확인됩니다.",
        "• 변신 계열 효과로 복사할 수 없습니다.",
      ];

    case AbilityId.NEURO_CHARGE:
      return [
        "• 사이코필드일 때 뉴런활성 상태가 됩니다.",
        "• 부스트에너지를 지니고 있어도 뉴런활성 상태가 됩니다.",
        "• 뉴런활성 상태에서는 가장 높은 능력치가 상승합니다.",
        "• 변신 계열 효과로 복사할 수 없습니다.",
      ];

    case AbilityId.BEAST_BOOST:
      return [
        "• 상대를 쓰러뜨리면 자신의 가장 높은 능력치가 1랭크 상승합니다.",
        "• 대상 능력치는 공격, 방어, 특수공격, 특수방어, 스피드 중 가장 높은 능력치입니다.",
      ];

    case AbilityId.OVERGROW:
      return ["• HP가 1/3 이하일 때 풀타입 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.BLAZE:
      return ["• HP가 1/3 이하일 때 불꽃타입 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.TORRENT:
      return ["• HP가 1/3 이하일 때 물타입 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.SWARM:
      return ["• HP가 1/3 이하일 때 벌레타입 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.TINTED_LENS:
      return ["• 효과가 별로인 기술의 대미지가 2배 상승합니다."];

    case AbilityId.MOLD_BREAKER:
      return ["• 자신의 기술은 상대의 방어용 특성을 무시하고 적용됩니다."];

    case AbilityId.ANTICIPATION:
      return [
        "• 등장했을 때 상대가 효과가 굉장한 기술이나 일격필살 기술을 가지고 있으면 긴장합니다.",
        "• 조건을 만족할 경우 전용 메시지가 출력됩니다.",
      ];

    case AbilityId.RATTLED:
      return [
        "• 악, 벌레, 고스트타입 공격 기술을 받으면 스피드가 2랭크 상승합니다.",
        "• 위협을 받으면 스피드가 1랭크 상승합니다.",
      ];

    case AbilityId.SOLID_ROCK:
      return [
        "• 효과가 굉장한 기술로 받는 대미지가 0.75배가 됩니다.",
        "• 바위타입 기술의 위력이 1.2배 상승합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.TELEPATHY:
      return [
        "• 같은 편의 공격 기술에 맞지 않습니다.",
        "• 에스퍼타입 기술의 위력이 1.3배 상승합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.PUNK_ROCK:
      return [
        "• 소리 기술의 위력이 1.3배 상승합니다.",
        "• 소리 기술로 받는 대미지가 0.5배가 됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.SWIFT_SWIM:
      return ["• 비 또는 강한 비일 때 스피드가 2배 상승합니다."];

    case AbilityId.CHLOROPHYLL:
      return ["• 쾌청 또는 강한 햇살일 때 스피드가 2배 상승합니다."];

    case AbilityId.SAND_RUSH:
      return ["• 모래바람일 때 스피드가 2배 상승합니다."];

    case AbilityId.SLUSH_RUSH:
      return ["• 싸라기눈, 설경일 때 스피드가 2배 상승합니다."];

    case AbilityId.WIND_RIDER:
      return [
        "• 바람 기술을 무효화하고 공격이 1랭크 상승합니다.",
        "• 순풍이 불고 있을 때 등장하면 공격이 1랭크 상승합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.GUARD_DOG:
      return [
        "• 위협을 받으면 공격이 1랭크 상승합니다.",
        "• 강제로 교체당하지 않습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.STAKEOUT:
      return ["• 그 턴에 교체되어 나온 상대에게 사용하는 기술의 위력이 2배 상승합니다."];

    case AbilityId.INNER_FOCUS:
      return [
        "• 풀죽음 상태가 되지 않습니다.",
        "• 위협의 효과를 받지 않습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.ORICHALCUM_PULSE:
      return [
        "• 등장했을 때 날씨를 쾌청으로 변경합니다.",
        "• 바이옴이 바뀔 때 날씨를 쾌청으로 변경합니다.",
        "• 쾌청 또는 강한 햇살일 때 공격이 1.33배 상승합니다.",
      ];

    case AbilityId.STEAM_ENGINE:
      return ["• 불꽃타입 또는 물타입 공격 기술을 받으면 공격, 특수공격, 스피드가 3랭크 상승합니다."];

    case AbilityId.GALE_WINGS:
      return ["• 비행타입 기술의 위력이 1.2배 상승합니다.", "• 비행타입 기술의 우선도가 1 상승합니다."];

    case AbilityId.SNIPER:
      return ["• 급소에 명중했을 때 대미지가 1.5배 증가합니다."];

    case AbilityId.FILTER:
      return [
        "• 효과가 굉장한 기술로 받는 대미지가 0.75배가 됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.PRISM_ARMOR:
      return ["• 효과가 굉장한 기술로 받는 대미지가 0.75배가 됩니다."];

    case AbilityId.NEUTRALIZING_GAS:
      return [
        "• 등장해 있는 동안 모든 포켓몬의 특성 효과를 무효화합니다.",
        "• 필드를 떠나면 무효화 효과가 사라집니다.",
        "• 변신 계열 효과로 복사할 수 없습니다.",
      ];

    case AbilityId.HEATPROOF:
      return ["• 불꽃타입 공격으로 받는 대미지가 0.5배가 됩니다.", "• 화상으로 받는 피해가 0.5배가 됩니다."];

    case AbilityId.MIRROR_ARMOR:
      return [
        "• 상대가 자신의 능력치를 낮추려 하면 그 효과를 무효화하고 상대에게 되돌립니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.SHIELDS_DOWN:
      return [
        "• HP가 절반보다 많으면 유성의 모습이 됩니다.",
        "• HP가 절반 이하가 되면 코어의 모습이 됩니다.",
        "• 유성의 모습일 때 상태이상에 걸리지 않습니다.",
        "• 합체 계열 효과를 받을 수 없습니다.",
      ];

    case AbilityId.UNAWARE:
      return [
        "• 공격 시 상대의 방어, 특수방어, 회피 랭크 변화를 무시합니다.",
        "• 방어 시 상대의 공격, 특수공격, 명중 랭크 변화를 무시합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.IRON_BARBS:
      return [
        "• 접촉 공격을 받았을 때 상대에게 최대 HP의 1/8만큼 피해를 줍니다.",
        "• 강철타입 기술의 위력이 1.2배 상승합니다.",
      ];

    case AbilityId.TRIAGE:
      return [
        "• 회복 효과가 있는 기술의 우선도가 3 상승합니다.",
        "• 흡수 기술, HP 회복 기술, 체력을 회복시키는 일부 기술에 적용됩니다.",
      ];

    case AbilityId.PURIFYING_SALT:
      return [
        "• 상태이상에 걸리지 않습니다.",
        "• 고스트타입 공격으로 받는 대미지가 0.5배가 됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.WEAK_ARMOR:
      return [
        "• 물리 공격 기술을 받으면 방어가 1랭크 하락합니다.",
        "• 물리 공격 기술을 받으면 스피드가 2랭크 상승합니다.",
      ];

    case AbilityId.SHELL_ARMOR:
      return [
        "• 상대의 공격이 급소에 맞지 않습니다.",
        "• 능력치가 하락했을 때 특수방어가 1랭크 상승합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.DEFIANT:
      return ["• 능력치가 하락했을 때 공격이 2랭크 상승합니다."];

    case AbilityId.COMPETITIVE:
      return ["• 능력치가 하락했을 때 특수공격이 2랭크 상승합니다."];

    case AbilityId.TECHNICIAN:
      return ["• 위력이 60 이하인 기술의 위력이 1.5배 상승합니다.", "• 기술의 실제 위력을 기준으로 판정합니다."];

    case AbilityId.HYPER_CUTTER:
      return [
        "• 공격 능력치가 하락하지 않습니다.",
        "• 접촉 기술의 위력이 1.2배 상승합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.WATER_BUBBLE:
      return [
        "• 물타입 기술의 위력이 2배 상승합니다.",
        "• 불꽃타입 공격으로 받는 대미지가 0.5배가 됩니다.",
        "• 화상 상태가 되지 않습니다.",
        "• 등장했을 때 화상 상태를 치료합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.HYDRATION:
      return ["• 비 또는 강한 비 상태일 때 턴 종료 시 상태이상을 치료합니다."];

    case AbilityId.TURBOBLAZE:
      return [
        "• 등장했을 때 전용 메시지가 출력됩니다.",
        "• 자신의 기술은 상대의 방어용 특성을 무시하고 적용됩니다.",
        "• 불꽃타입 기술의 위력이 1.5배 상승합니다.",
        "• 드래곤타입 기술의 위력이 1.5배 상승합니다.",
      ];

    case AbilityId.TERAVOLT:
      return [
        "• 등장했을 때 전용 메시지가 출력됩니다.",
        "• 자신의 기술은 상대의 방어용 특성을 무시하고 적용됩니다.",
        "• 드래곤타입 기술의 위력이 1.5배 상승합니다.",
        "• 전기타입 기술의 위력이 1.5배 상승합니다.",
      ];

    case AbilityId.ICE_SCALES:
      return ["• 특수 공격 기술로 받는 대미지가 0.5배가 됩니다.", "• 특정 특성 또는 효과에 의해 무시될 수 있습니다."];

    case AbilityId.TANGLED_FEET:
      return ["• 혼란 상태일 때 회피율이 2배 상승합니다.", "• 특정 특성 또는 효과에 의해 무시될 수 있습니다."];

    case AbilityId.PROPELLER_TAIL:
      return ["• 물타입 기술의 위력이 1.2배 상승합니다.", "• 물타입 기술의 우선도가 1 상승합니다."];

    case AbilityId.CONTRARY:
      return [
        "• 자신의 능력치 랭크 변화가 반대로 적용됩니다.",
        "• 능력치가 상승할 경우 같은 수치 만큼 하락하고, 하락할 경우 같은 수치 만큼 상승합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.OBLIVIOUS:
      return [
        "• 헤롱헤롱 상태가 되지 않습니다.",
        "• 도발 상태가 되지 않습니다.",
        "• 등장했을 때 헤롱헤롱, 도발 상태를 해제합니다.",
        "• 위협의 효과를 받지 않습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.OWN_TEMPO:
      return [
        "• 혼란 상태가 되지 않습니다.",
        "• 등장했을 때 혼란 상태를 해제합니다.",
        "• 위협의 효과를 받지 않습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.RIVALRY:
      return [
        "• 자신과 상대의 성별이 같으면 기술의 위력이 1.25배 상승합니다.",
        "• 자신과 상대의 성별이 다르면 기술의 위력이 0.75배가 됩니다.",
        "• 어느 한쪽이라도 무성별이면 적용되지 않습니다.",
      ];

    case AbilityId.POISON_HEAL:
      return [
        "• 독 또는 맹독 상태일 때 턴 종료 시 HP를 회복합니다.",
        "• 독 또는 맹독으로 인한 턴 종료 피해를 받지 않습니다.",
      ];

    case AbilityId.FLOWER_VEIL:
      return [
        "• 같은 편의 풀타입 포켓몬은 상태이상에 걸리지 않습니다.",
        "• 같은 편의 풀타입 포켓몬은 졸음 상태가 되지 않습니다.",
        "• 같은 편의 풀타입 포켓몬은 능력치가 하락하지 않습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.SYMBIOSIS:
      return [
        "• 같은 편의 지닌도구 효과를 함께 받을 수 있습니다.",
        "• 양쪽 모두 필드에 나와 있어야 적용됩니다.",
        "• 상대편과는 공유되지 않습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.TRACE:
      return ["• 등장했을 때 상대의 특성을 복사합니다.", "• 복사할 수 없는 특성은 제외됩니다."];

    case AbilityId.SWEET_VEIL:
      return [
        "• 자신과 같은 편은 잠듦 상태가 되지 않습니다.",
        "• 등장했을 때 자신과 같은 편의 잠듦 상태를 치료합니다.",
        "• 자신과 같은 편은 졸음 상태가 되지 않습니다.",
        "• 이로치 등장 확률 보정값이 2배 상승합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.ZEN_MODE:
      return [
        "• HP가 절반 이하가 되면 달마모드로 변신합니다.",
        "• HP가 절반을 초과하면 원래 모습으로 돌아옵니다.",
        "• 이 특성은 복사, 교체, 무효화할 수 없습니다.",
      ];

    case AbilityId.MULTISCALE:
      return [
        "• HP가 가득 차 있을 때 받는 기술의 대미지가 0.5배가 됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.GOOEY:
      return ["• 접촉 기술을 사용한 상대의 스피드가 1랭크 하락합니다."];

    case AbilityId.TRANSISTOR:
      return ["• 전기타입 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.DRAGONS_MAW:
      return ["• 드래곤타입 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.ROCKY_PAYLOAD:
      return ["• 바위타입 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.STEELWORKER:
      return ["• 강철타입 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.MUMMY:
      return [
        "• 접촉 기술을 받은 상대의 특성을 미라로 변경합니다.",
        "• 미라로 변경된 포켓몬도 같은 효과를 사용할 수 있습니다.",
        "• 고스트타입 기술의 위력이 1.3배 상승합니다.",
        "• 기절한 상태에서도 효과가 발동할 수 있습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.VESSEL_OF_RUIN:
      return [
        "• 필드에 있는 동안 다른 포켓몬의 특수공격이 0.75배가 됩니다.",
        "• 동일한 효과는 중첩되지 않습니다.",
        "• 등장 시 전용 메시지가 출력됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.SWORD_OF_RUIN:
      return [
        "• 필드에 있는 동안 다른 포켓몬의 방어가 0.75배가 됩니다.",
        "• 동일한 효과는 중첩되지 않습니다.",
        "• 등장 시 전용 메시지가 출력됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.TABLETS_OF_RUIN:
      return [
        "• 필드에 있는 동안 다른 포켓몬의 공격이 0.75배가 됩니다.",
        "• 동일한 효과는 중첩되지 않습니다.",
        "• 등장 시 전용 메시지가 출력됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.BEADS_OF_RUIN:
      return [
        "• 필드에 있는 동안 다른 포켓몬의 특수방어가 0.75배가 됩니다.",
        "• 동일한 효과는 중첩되지 않습니다.",
        "• 등장 시 전용 메시지가 출력됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.DISGUISE:
      return [
        "• 탈을 쓴 모습일 때 공격 기술로 받는 대미지를 1번 막습니다.",
        "• 효과가 없는 기술에는 발동하지 않습니다.",
        "• 발동 후 탈이 깨진 모습으로 변합니다.",
        "• 합체 계열 효과를 받을 수 없습니다.",
        "• 변신 계열 효과로 복사할 수 없습니다.",
      ];

    case AbilityId.SUPREME_OVERLORD:
      return [
        "• 기절한 같은 편의 수만큼 기술의 위력이 상승합니다.",
        "• 기절한 포켓몬 1마리당 위력이 1.1배가 됩니다.",
        "• 최대 5마리까지 적용되어 최대 1.5배가 됩니다.",
        "• 현재 구현 기준으로 필드에 있는 동안 효과가 적용됩니다.",
      ];

    case AbilityId.MARVEL_SCALE:
      return [
        "• 상태이상일 때 방어가 1.5배 상승합니다.",
        "• 절대안깸 특성으로 잠든 상태처럼 취급되는 경우에도 적용됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.JUSTIFIED:
      return [
        "• 악타입 공격 기술을 받으면 공격, 특수공격, 스피드가 1랭크 상승합니다.",
        "• 변화 기술에는 발동하지 않습니다.",
      ];

    case AbilityId.WIND_POWER:
      return [
        "• 바람 기술을 받으면 충전 상태가 됩니다.",
        "• 충전 상태에서는 다음 전기타입 기술의 위력이 2배가 됩니다.",
      ];

    case AbilityId.ICE_FACE:
      return [
        "• 아이스페이스 상태일 때 물리 공격으로 받는 대미지를 1번 무효화합니다.",
        "• 효과가 발동하면 아이스페이스가 깨집니다.",
        "• 싸라기눈 또는 설경 상태가 되면 아이스페이스가 복구됩니다.",
        "• 합체 계열 효과를 받을 수 없습니다.",
        "• 변신 계열 효과로 복사할 수 없습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.GRASS_PELT:
      return ["• 그래스필드 상태일 때 방어가 1.5배 상승합니다.", "• 특정 특성 또는 효과에 의해 무시될 수 있습니다."];

    case AbilityId.LIMBER:
      return [
        "• 마비 상태가 되지 않습니다.",
        "• 등장했을 때 마비 상태를 치료합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.STENCH:
      return [
        "• 공격 기술이 명중하면 10% 확률로 상대를 풀죽게 합니다.",
        "• 이미 풀죽음 효과가 있는 기술에는 적용되지 않습니다.",
        "• 대타출동에 막힌 경우에는 적용되지 않습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.THERMAL_EXCHANGE:
      return [
        "• 불꽃타입 공격 기술을 받으면 공격이 1랭크 상승합니다.",
        "• 변화 기술에는 발동하지 않습니다.",
        "• 화상 상태가 되지 않습니다.",
        "• 등장했을 때 화상 상태를 치료합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.HARVEST:
      return [
        "• 턴 종료 시 사용한 나무열매를 50% 확률로 다시 얻습니다.",
        "• 쾌청 또는 강한 햇살일 때는 반드시 다시 얻습니다.",
      ];

    case AbilityId.KLUTZ:
      return [
        "• 자신과 상대의 지닌도구 효과가 발동하지 않습니다.",
        "• 틀깨기벨트의 효과는 예외적으로 적용됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.BALL_FETCH:
      return ["• 사용한 볼을 다시 가져옵니다.", "• 전투당 1번만 발동합니다."];

    case AbilityId.TOXIC_BOOST:
      return ["• 독 또는 맹독 상태일 때 물리 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.FLARE_BOOST:
      return ["• 화상 상태일 때 특수 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.FLUFFY:
      return [
        "• 접촉 기술로 받는 피해가 50% 감소합니다.",
        "• 불꽃타입 기술로 받는 피해가 2배가 됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.WATER_VEIL:
      return [
        "• 화상 상태가 되지 않습니다.",
        "• 불꽃타입 기술로 받는 피해가 0.75배가 됩니다.",
        "• 물타입 기술의 위력이 1.5배 상승합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.BIG_PECKS:
      return [
        "• 방어가 하락하지 않습니다.",
        "• 접촉 기술로 받는 피해가 0.75배가 됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.CLOUD_NINE:
      return [
        "• 필드의 모든 날씨 효과를 무시합니다.",
        "• 강한 비, 강한 햇살, 난기류의 효과도 무시합니다.",
        "• 날씨에 따른 폼 변화가 적용되지 않습니다.",
        "• 이 특성을 가진 포켓몬이 기절하면 날씨 효과가 다시 적용됩니다.",
      ];

    case AbilityId.SCHOOLING:
      return [
        "• 레벨이 20 이상이고 HP가 1/4보다 많으면 군집의 모습이 됩니다.",
        "• 레벨이 20 미만이거나 HP가 1/4 이하이면 단독의 모습이 됩니다.",
        "• 턴 종료 시 조건을 다시 확인하여 모습이 바뀝니다.",
        "• 합체 계열 효과를 받을 수 없습니다.",
        "• 변신 계열 효과로 복사할 수 없습니다.",
      ];

    case AbilityId.SAND_FORCE:
      return [
        "• 모래바람일 때 바위, 땅, 강철타입 기술의 위력이 1.3배 상승합니다.",
        "• 모래바람으로 인한 피해를 받지 않습니다.",
        "• 모래바람 상태에서만 효과가 적용됩니다.",
      ];

    case AbilityId.POISON_TOUCH:
      return [
        "• 독타입 기술의 위력이 1.3배 상승합니다.",
        "• 접촉 기술로 공격했을 때 30% 확률로 상대를 독 상태로 만듭니다.",
      ];

    case AbilityId.MERCILESS:
      return ["• 독 또는 맹독 상태인 상대를 공격하면 반드시 급소에 맞습니다."];

    case AbilityId.TOXIC_DEBRIS:
      return ["• 물리 공격 기술을 받으면 상대 필드에 독압정을 설치합니다.", "• 쓰러져도 이 효과가 발동할 수 있습니다."];

    case AbilityId.WANDERING_SPIRIT:
      return [
        "• 접촉 공격을 받으면 공격한 상대와 특성을 서로 바꿉니다.",
        "• 고스트타입 기술의 위력이 1.3배 상승합니다.",
        "• 쓰러져도 이 효과가 발동할 수 있습니다.",
      ];

    case AbilityId.GOOD_AS_GOLD:
      return [
        "• 상대가 사용하는 변화 기술의 영향을 받지 않습니다.",
        "• 자신을 대상으로 하는 변화 기술만 무효화합니다.",
        "• 필드 전체를 대상으로 하는 변화 기술에는 적용되지 않습니다.",
        "• 전투 중 획득하는 돈이 증가합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.DEFEATIST:
      return [
        "• HP가 절반 이하일 때 공격과 특수공격이 0.5배가 됩니다.",
        "• HP가 절반 이하인 상태에서 회복을 받으면 전투당 1회 공격, 방어, 특수공격, 특수방어, 스피드가 1랭크 상승합니다.",
        "• 부활 회복에는 랭크 상승 효과가 발동하지 않습니다.",
      ];

    case AbilityId.ZERO_TO_HERO:
      return [
        "• 전투 시작 시 평범한 모습으로 등장합니다.",
        "• 쓰러지지 않은 상태로 교체되면 영웅의 모습으로 변신합니다.",
        "• 변신 상태는 전투가 끝날 때까지 유지됩니다.",
        "• 이 특성은 복사, 교체, 무효화할 수 없습니다.",
        "• 변신 및 합체 계열 효과를 받을 수 없습니다.",
      ];

    case AbilityId.FORECAST:
      return [
        "• 등장했을 때 현재 날씨에 따라 모습과 타입이 변화합니다.",
        "• 날씨가 바뀌면 그 날씨에 맞는 모습과 타입으로 다시 변화합니다.",
        "• 쾌청이면 불꽃타입, 비면 물타입, 싸라기눈/설경이면 얼음타입이 됩니다.",
        "• 날씨가 없거나 모래바람, 난기류, 안개일 때는 원래 모습으로 돌아옵니다.",
        "• 이 특성은 복사하거나 교체할 수 없습니다.",
        "• 합체 상태에서는 이 특성을 사용할 수 없습니다.",
      ];

    case AbilityId.MULTITYPE:
      return [
        "• 지니고 있는 플레이트에 따라 자신의 타입이 변화합니다.",
        "• 타입이 바뀌면 모습도 해당 타입에 맞게 변화합니다.",
        "• 자신의 타입과 일치하는 기술의 위력이 추가로 1.5배 상승합니다.",
        "• 합체 상태에서는 이 특성을 사용할 수 없습니다.",
        "• 이 특성은 복사, 교체, 무효화할 수 없습니다.",
      ];

    case AbilityId.TERA_SHIFT:
      return [
        "• 전투에 등장하면 테라폼으로 변신합니다.",
        "• 변신 상태는 전투가 끝날 때까지 유지됩니다.",
        "• 변신 계열 효과를 받을 수 없습니다.",
        "• 합체 상태에서는 이 특성을 사용할 수 없습니다.",
        "• 이 특성은 복사, 교체, 무효화할 수 없습니다.",
      ];

    case AbilityId.STANCE_CHANGE:
      return [
        "• 공격 기술을 사용하면 블레이드폼으로 변화합니다.",
        "• 킹실드를 사용하면 실드폼으로 변화합니다.",
        "• 합체 상태에서는 이 특성을 사용할 수 없습니다.",
        "• 이 특성은 복사, 교체, 무효화할 수 없습니다.",
      ];

    case AbilityId.RKS_SYSTEM:
      return [
        "• 지니고 있는 메모리에 따라 자신의 타입이 변화합니다.",
        "• 타입이 바뀌면 모습도 해당 타입에 맞게 변화합니다.",
        "• 자신의 타입과 일치하는 기술의 위력이 추가로 1.5배 상승합니다.",
        "• 합체 상태에서는 이 특성을 사용할 수 없습니다.",
        "• 이 특성은 복사, 교체, 무효화할 수 없습니다.",
      ];

    case AbilityId.SOUNDPROOF:
      return ["• 소리 기술의 영향을 받지 않습니다.", "• 특정 특성 또는 효과에 의해 무시될 수 있습니다."];

    case AbilityId.TRUANT:
      return ["• 행동한 다음 턴에는 게으름을 피워 행동할 수 없습니다."];

    case AbilityId.VITAL_SPIRIT:
      return [
        "• 잠듦 상태가 되지 않습니다.",
        "• 등장했을 때 잠듦 상태를 즉시 해제합니다.",
        "• 졸음 상태가 되지 않습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.AIR_LOCK:
      return [
        "• 필드에 있는 동안 모든 포켓몬이 날씨의 영향을 받지 않습니다.",
        "• 날씨로 인한 폼 변화도 적용되지 않습니다.",
        "• 이 특성이 사라지면 날씨에 따른 폼 변화가 다시 적용됩니다.",
        "• 등장했을 때 전용 메시지가 출력됩니다.",
        "• 쓰러져도 이 효과가 발동할 수 있습니다.",
      ];

    case AbilityId.TERAFORM_ZERO:
      return [
        "• 전투 중 1번만 발동합니다.",
        "• 쾌청, 비, 모래바람, 싸라기눈, 설경, 안개, 강한 비, 강한 햇살, 난기류를 제거합니다.",
        "• 미스트필드, 일렉트릭필드, 그래스필드, 사이코필드를 제거합니다.",
        "• 이 특성은 복사하거나 교체할 수 없습니다.",
      ];

    case AbilityId.DARK_AURA:
      return [
        "• 등장했을 때 전용 메시지가 출력됩니다.",
        "• 필드에 있는 동안 모든 포켓몬의 악타입 기술 위력이 4/3배 상승합니다.",
      ];

    case AbilityId.FAIRY_AURA:
      return [
        "• 등장했을 때 전용 메시지가 출력됩니다.",
        "• 필드에 있는 동안 모든 포켓몬의 페어리타입 기술 위력이 4/3배 상승합니다.",
      ];

    case AbilityId.AURA_BREAK:
      return [
        "• 다크오라가 있으면 악타입 기술 위력을 9/16배로 낮춥니다.",
        "• 페어리오라가 있으면 페어리타입 기술 위력을 9/16배로 낮춥니다.",
        "• 앙쥬오라가 있으면 모든 기술 위력을 9/16배로 낮춥니다.",
        "• 오라 계열 특성이 필드에 있으면 등장했을 때 전용 메시지가 출력됩니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.NORMALIZE:
      return ["• 사용하는 모든 기술이 노말타입이 됩니다.", "• 노말타입으로 변경된 기술의 위력이 2배 상승합니다."];

    case AbilityId.SLOW_START:
      return ["• 등장 후 3턴 동안 공격이 0.5배가 됩니다.", "• 등장 후 3턴 동안 방어와 특수방어가 2배 상승합니다."];

    case AbilityId.FUR_COAT:
      return ["• 물리 기술로 받는 대미지가 0.5배가 됩니다.", "• 특정 특성 또는 효과에 의해 무시될 수 있습니다."];

    case AbilityId.STAMINA:
      return ["• 공격 기술로 피해를 받으면 방어가 1랭크 상승합니다."];

    case AbilityId.WATER_COMPACTION:
      return ["• 물타입 공격 기술로 피해를 받으면 방어가 2랭크 상승합니다."];

    case AbilityId.BULLETPROOF:
      return ["• 탄환 및 폭탄 계열 기술의 영향을 받지 않습니다.", "• 특정 특성 또는 효과에 의해 무시될 수 있습니다."];

    case AbilityId.LIQUID_VOICE:
      return ["• 소리 기술이 물타입으로 변경됩니다."];

    case AbilityId.BATTLE_BOND:
      return [
        "• 전투 시작 시 기본 전투폼으로 등장합니다.",
        "• 상대를 쓰러뜨리면 유대변신 상태로 변화합니다.",
        "• 쓰러지면 원래 모습으로 돌아갑니다.",
        "• 합체 상태에서는 이 특성을 사용할 수 없습니다.",
        "• 이 특성은 복사, 교체, 무효화할 수 없습니다.",
        "• 쓰러져도 폼 변화 효과가 발동할 수 있습니다.",
      ];

    case AbilityId.BATTERY:
      return ["• 같은 편의 특수 기술 위력이 1.3배 상승합니다."];

    case AbilityId.RECEIVER:
      return [
        "• 같은 편이 쓰러지면 그 포켓몬의 특성을 이어받습니다.",
        "• 격투타입 기술의 위력이 1.3배 상승합니다.",
        "• 이 특성은 복사할 수 없습니다.",
      ];

    case AbilityId.POWER_OF_ALCHEMY:
      return [
        "• 같은 편이 쓰러지면 그 포켓몬의 특성을 이어받습니다.",
        "• 독타입 기술의 위력이 1.3배 상승합니다.",
        "• 이 특성은 복사할 수 없습니다.",
      ];

    case AbilityId.MIMICRY:
      return ["• 필드 상태에 따라 자신의 타입이 변화합니다.", "• 필드가 사라지면 원래 타입으로 돌아갑니다."];

    case AbilityId.COTTON_DOWN:
      return [
        "• 공격 기술로 피해를 받으면 상대의 스피드가 1랭크 하락합니다.",
        "• 여러 상대에게 동시에 적용될 수 있습니다.",
        "• 쓰러져도 이 효과가 발동할 수 있습니다.",
      ];

    case AbilityId.SHADOW_SHIELD:
      return ["• HP가 가득 찬 상태일 때 받는 기술의 대미지가 0.5배가 됩니다."];

    case AbilityId.NEUROFORCE:
      return ["• 효과가 굉장한 기술의 위력이 1.5배 상승합니다."];

    case AbilityId.GULP_MISSILE:
      return [
        "• 다이빙 또는 파도타기를 사용하면 먹이를 물고 있는 모습으로 변화합니다.",
        "• HP가 절반 이상이면 쏘아쿠다를, 절반 미만이면 피카츄를 물고 옵니다.",
        "• 먹이를 물고 있는 상태에서 공격을 받으면 상대에게 최대 HP의 1/4만큼 피해를 줍니다.",
        "• 쏘아쿠다를 발사하면 상대의 방어가 1랭크 하락합니다.",
        "• 피카츄를 발사하면 상대를 마비시킵니다.",
        "• 변신 및 합체 계열 효과를 받을 수 없습니다.",
        "• 이 특성은 복사, 교체, 무효화할 수 없습니다.",
      ];

    case AbilityId.PASTEL_VEIL:
      return [
        "• 등장했을 때 같은 편의 독과 맹독 상태를 치료합니다.",
        "• 같은 편은 독과 맹독 상태가 되지 않습니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.HUNGER_SWITCH:
      return [
        "• 턴 종료 시 배부른 모습과 배고픈 모습을 번갈아 변화합니다.",
        "• 테라스탈 상태에서는 모습이 변하지 않습니다.",
        "• 변신 및 합체 계열 효과를 받을 수 없습니다.",
        "• 이 특성은 복사하거나 교체할 수 없습니다.",
      ];

    case AbilityId.ANGER_SHELL:
      return [
        "• 공격 기술로 피해를 받아 HP가 절반 이하가 되면 공격, 특수공격, 스피드가 1랭크 상승합니다.",
        "• 동시에 방어와 특수방어가 1랭크 하락합니다.",
        "• 이 효과는 추가 효과 무효 조건이 적용된 공격에는 발동하지 않습니다.",
      ];

    case AbilityId.COMMANDER:
      return [
        "• 더블배틀에서 아군의 입 안으로 들어가 지휘 상태가 됩니다.",
        "• 지휘 중에는 직접 행동할 수 없지만 아군을 강화합니다.",
        "• 더블배틀에서만 발동할 수 있습니다.",
        "• 이 특성은 복사하거나 교체할 수 없습니다.",
      ];

    case AbilityId.STEELY_SPIRIT:
      return ["• 같은 편의 강철타입 기술 위력이 1.5배 상승합니다."];

    case AbilityId.GORILLA_TACTICS:
      return [
        "• 공격 기술의 위력이 1.5배 상승합니다.",
        "• 기술을 사용하면 해당 기술에 고정되어 다른 기술을 사용할 수 없게 됩니다.",
      ];

    case AbilityId.LINGERING_AROMA:
      return [
        "• 접촉 공격을 받으면 공격한 상대의 특성을 가시지않는향기로 바꿉니다.",
        "• 이로치 등장 확률 보정값이 2배 상승합니다.",
        "• 등장했을 때 상대 전체의 회피율을 1랭크 하락시킵니다.",
        "• 쓰러져도 이 효과가 발동할 수 있습니다.",
      ];

    case AbilityId.ELECTROMORPHOSIS:
      return [
        "• 공격 기술로 피해를 받으면 충전 상태가 됩니다.",
        "• 충전 상태에서는 다음 전기타입 기술의 위력이 2배 상승합니다.",
      ];

    case AbilityId.MYCELIUM_MIGHT:
      return [
        "• 변화 기술의 우선도가 낮아집니다.",
        "• 변화 기술 사용 시 스피드와 관계없이 나중에 행동합니다.",
        "• 변화 기술이 상대의 특성을 무시하고 적용됩니다.",
      ];

    case AbilityId.MINDS_EYE:
      return [
        "• 노말타입과 격투타입 기술이 고스트타입에게도 명중합니다.",
        "• 자신의 명중률이 하락하지 않습니다.",
        "• 상대의 회피율 변화를 무시합니다.",
        "• 특정 특성 또는 효과에 의해 무시될 수 있습니다.",
      ];

    case AbilityId.TOXIC_CHAIN:
      return ["• 공격 기술이 명중하면 100% 확률로 상대를 맹독 상태로 만듭니다."];

    case AbilityId.POISON_PUPPETEER:
      return ["• 상대가 독 또는 맹독 상태가 되면 혼란 상태로 만듭니다.", "• 이 특성은 복사하거나 교체할 수 없습니다."];

    case AbilityId.ANGE_AURA:
      return [
        "• 등장했을 때 전용 메시지가 출력됩니다.",
        "• 필드에 있는 동안 모든 포켓몬의 기술 위력이 상승합니다.",
        "• 기본적으로 기술 위력은 약 1.3배 상승합니다.",
        "• 앙쥬오브 효과에 따라 상승 배율이 달라질 수 있습니다.",
      ];

    case AbilityId.STALL:
      return ["• 사용하는 모든 기술의 우선도가 낮아집니다.", "• 가능한 한 나중에 행동합니다."];

    default:
      return null;
  }
}

function getAttrDescription(attrName: string, attr: any): string {
  switch (attrName) {
    case "StatusEffectImmunityAbAttr":
      return "특정 상태이상의 영향을 받지 않습니다.";
    case "PostSummonHealStatusAbAttr":
      return "등장했을 때 특정 상태이상을 치료합니다.";
    case "MoveTypePowerBoostAbAttr": {
      const typeText = getTypeName(attr.moveType);
      const multiplier = attr.multiplier ?? 1.5;

      return `${typeText}타입 기술의 위력이 ${multiplier}배 상승합니다.`;
    }
    case "AttackTypeImmunityAbAttr": {
      return attr.immuneType != null
        ? `${getTypeName(attr.immuneType)}타입 공격 기술을 무효화합니다.`
        : "특정 타입의 공격 기술을 무효화합니다.";
    }
    case "PostSummonTerrainChangeAbAttr":
      return `등장했을 때 필드를 ${getTerrainName(attr.terrainType)}로 변경합니다.`;

    case "PostBiomeChangeTerrainChangeAbAttr":
      return `바이옴이 바뀔 때 필드를 ${getTerrainName(attr.terrainType)}로 변경합니다.`;

    case "StatMultiplierAbAttr": {
      const statText = getStatNames(attr.stats).join(", ") || "특정 능력치";
      const multiplier = attr.multiplier;

      if (multiplier === 2) {
        return `${statText}이 2배가 됩니다.`;
      }

      return `${statText}이 ${multiplier.toFixed(2)}배 상승합니다.`;
    }
    case "AddSecondStrikeAbAttr":
      return typeof attr.damageMultiplier === "number"
        ? `공격 기술이 추가로 1회 더 발동합니다. 추가 공격의 위력은 ${attr.damageMultiplier}배입니다.`
        : "공격 기술이 추가로 1회 더 발동합니다.";
    case "PostSummonMessageAbAttr":
      return "등장했을 때 전용 메시지가 출력됩니다.";
    case "IgnoreTypeImmunityAbAttr":
      return attr.defenderType == null && attr.allowedMoveTypes == null
        ? "타입 상성으로 무효가 되는 상대에게도 공격 기술로 대미지를 줄 수 있습니다."
        : "일부 타입 상성 무효를 무시하고 공격할 수 있습니다.";
    case "SpeedBoostAbAttr":
      return "턴 종료 시 스피드가 1랭크 상승합니다.";
    case "PostBattleLootAbAttr":
      return "전투 종료 후 추가 아이템 또는 보상을 획득합니다.";
    case "ReduceBerryUseThresholdAbAttr":
      return "HP가 일정 이하가 되면 열매를 평소보다 일찍 사용합니다.";
    case "RunSuccessAbAttr":
      return "야생 포켓몬과의 배틀에서 반드시 도망칠 수 있습니다.";
    case "IncreasePpAbAttr":
      return "상대가 기술을 사용할 때 PP를 더 많이 소모시킵니다.";
    case "PreDefendFullHpEndureAbAttr":
      return "HP가 가득 찬 상태에서 일격에 쓰러질 공격을 받아도 HP 1로 버팁니다.";
    case "BlockOneHitKOAbAttr":
      return "일격필살 기술을 무효화합니다.";
    case "FriskAbAttr":
      return "등장했을 때 상대 포켓몬의 특성을 확인하고 공개합니다.";
    case "MoneyAbAttr":
      return "전투에서 승리하면 추가 돈을 획득합니다.";
    case "PassiveRegenAbAttr":
      return "턴 종료 시 HP를 회복합니다.";

    case "ShinyChanceAbAttr":
      return typeof attr.multiplier === "number"
        ? `이로치 등장 확률 보정값이 ${attr.multiplier}배 상승합니다.`
        : "이로치 등장 확률이 상승합니다.";
    case "PostSummonStatStageChangeAbAttr": {
      const statText = getStatNames(attr.stats).join(", ") || "특정 능력치";
      const targetText = (attr.selfTarget ?? true) ? "자신의" : "상대의";
      const stages = attr.stages ?? 0;
      return `등장했을 때 ${targetText} ${statText}이 ${Math.abs(stages)}랭크 ${
        stages > 0 ? "상승합니다" : "하락합니다"
      }.`;
    }
    case "BypassBurnDamageReductionAbAttr":
      return "화상 상태가 되어도 공격력 감소 효과를 받지 않습니다.";
    case "ReceivedTypeDamageMultiplierAbAttr":
      return typeof attr.damageMultiplier === "number"
        ? `조건에 맞는 타입 공격으로 받는 대미지가 ${attr.damageMultiplier}배가 됩니다.`
        : "조건에 맞는 타입 공격으로 받는 대미지가 감소합니다.";
    case "PostFaintContactDamageAbAttr":
      return typeof attr.damageRatio === "number"
        ? `접촉 공격을 받고 기절했을 때, 상대에게 최대 HP의 1/${attr.damageRatio}만큼 피해를 줍니다.`
        : "접촉 공격을 받고 기절했을 때 상대에게 피해를 줍니다.";
    case "TypeImmunityHealAbAttr":
      return attr.immuneType != null
        ? `${getTypeName(attr.immuneType)}타입 공격을 무효화하고 HP를 회복합니다.`
        : "특정 타입 공격을 무효화하고 HP를 회복합니다.";
    case "ArenaTrapAbAttr":
      return "조건에 맞는 상대를 도망치거나 교체할 수 없게 합니다.";
    case "PostDefendContactApplyStatusEffectAbAttr": {
      const effectText = (attr.effects ?? []).map(getStatusEffectName).join(", ") || "상태이상";
      return attr.chance === -1
        ? `접촉 공격을 받았을 때 조건이 맞으면 상대를 ${effectText} 상태로 만듭니다.`
        : `접촉 공격을 받았을 때 ${attr.chance}% 확률로 상대를 ${effectText} 상태로 만듭니다.`;
    }
    case "MovePowerBoostAbAttr":
      return typeof attr.powerMultiplier === "number"
        ? `조건에 맞는 기술의 위력이 ${attr.powerMultiplier}배 상승합니다.`
        : "조건에 맞는 기술의 위력이 상승합니다.";
    case "MoveEffectChanceMultiplierAbAttr":
      return attr.chanceMultiplier === 0
        ? "기술의 추가 효과가 발동하지 않게 됩니다."
        : `기술의 추가 효과 발동 확률이 ${attr.chanceMultiplier}배가 됩니다.`;
    case "RedirectTypeMoveAbAttr":
      return attr.type != null
        ? `${getTypeName(attr.type)}타입 기술을 자신에게 끌어옵니다.`
        : "특정 타입 기술을 자신에게 끌어옵니다.";
    case "TypeImmunityStatStageChangeAbAttr": {
      const typeText = attr.immuneType != null ? `${getTypeName(attr.immuneType)}타입 공격` : "특정 타입 공격";

      const stats = Array.isArray(attr.stats)
        ? attr.stats
        : Array.isArray(attr.stat)
          ? attr.stat
          : attr.stat != null
            ? [attr.stat]
            : [];

      const statText = stats.length > 0 ? stats.map((s: number) => i18next.t(getStatKey(s))).join(", ") : "특정 능력치";

      return `${typeText}을 무효화하고 ${statText}이 ${attr.stages ?? 1}랭크 상승합니다.`;
    }
    case "PostWeatherLapseHealAbAttr": {
      const weatherText = getWeatherNames(attr.weatherTypes).join(", ") || "특정 날씨";
      const healFactor = attr.healFactor ?? 1;
      return `${weatherText}일 때 턴 종료 시 최대 HP의 ${healFactor}/16만큼 회복합니다.`;
    }

    case "PostWeatherLapseDamageAbAttr": {
      const weatherText = getWeatherNames(attr.weatherTypes).join(", ") || "특정 날씨";
      const damageFactor = attr.damageFactor ?? 1;
      return `${weatherText}일 때 턴 종료 시 최대 HP의 ${damageFactor}/16만큼 피해를 받습니다.`;
    }
    case "PostSummonAddBattlerTagAbAttr":
      return getBattlerTagDescription(attr.tagType, "등장했을 때");

    case "PostWeatherChangeAddBattlerTagAttr": {
      const weatherText = getWeatherNames(attr.weatherTypes).join(", ") || "특정 날씨";
      return getBattlerTagDescription(attr.tagType, `${weatherText} 상태가 되었을 때`);
    }

    case "BoostEnergyTagAttr":
      return "부스트에너지를 지니고 있으면 가장 높은 능력치가 상승합니다.";

    case "NoTransformAbilityAbAttr":
      return "변신 계열 효과로 복사할 수 없습니다.";

    case "PokemonTypeChangeAbAttr":
      return attr.moveType === -1
        ? "기술을 사용하기 직전에 자신의 타입이 그 기술의 타입으로 변합니다."
        : `${getTypeName(attr.moveType)}타입으로 변합니다.`;

    case "BlockWeatherDamageAttr": {
      const weatherText = getWeatherNames(attr.weatherTypes).join(", ") || "특정 날씨";
      return `${weatherText}으로 인한 턴 종료 피해를 받지 않습니다.`;
    }

    case "DoubleBattleChanceAbAttr":
      return "야생 포켓몬과 만났을 때 더블배틀이 발생할 확률이 4배 상승합니다.";

    case "AlwaysHitAbAttr":
      return "자신의 기술과 자신을 대상으로 하는 기술은 반드시 명중합니다.";

    case "MoveTypeChangeAbAttr":
      return attr.newType != null
        ? `노말타입 기술이 ${getTypeName(attr.newType)}타입으로 변하며 위력이 ${attr.powerMultiplier ?? 1.2}배 상승합니다.`
        : "특정 타입의 기술이 다른 타입으로 변하며 위력이 상승합니다.";

    case "PostAttackStealHeldItemAbAttr":
      return "공격 기술이 명중했을 때 상대가 훔칠 수 있는 지닌도구를 가지고 있으면 그 도구를 훔칩니다.";

    case "DamageBoostAbAttr":
      return typeof attr.damageMultiplier === "number"
        ? `조건을 만족하면 기술의 대미지가 ${attr.damageMultiplier}배 상승합니다.`
        : "조건을 만족하면 기술의 대미지가 상승합니다.";

    case "ProtectStatAbAttr": {
      if (attr.protectedStat == null) {
        return "능력치가 하락하지 않습니다.";
      }

      const statText = i18next.t(getStatKey(attr.protectedStat));
      return `${statText}이 하락하지 않습니다.`;
    }

    case "MoveAbilityBypassAbAttr":
      return "조건에 맞는 기술이 상대의 특성을 무시하고 적용됩니다.";

    case "TypeImmunityAddBattlerTagAbAttr": {
      const typeText = attr.immuneType != null ? `${getTypeName(attr.immuneType)}타입` : "특정 타입";

      if (attr.tagType === "FIRE_BOOST") {
        return `${typeText} 공격을 무효화하고, 다음 불꽃타입 기술의 위력이 상승합니다.`;
      }

      return `${typeText} 공격을 무효화하고 특수한 강화 효과를 얻습니다.`;
    }

    case "BlockRecoilDamageAttr":
      return "반동 대미지를 받지 않습니다.";

    case "PostDefendStatStageChangeAbAttr": {
      const statText = getStatNames(attr.stats).join(", ") || "특정 능력치";
      const stages = attr.stages ?? 1;

      return `공격을 받은 뒤 조건을 만족하면 ${statText}이 ${Math.abs(stages)}랭크 ${
        stages > 0 ? "상승합니다" : "하락합니다"
      }.`;
    }

    case "PostIntimidateStatStageChangeAbAttr": {
      const statText = getStatNames(attr.stats).join(", ") || "특정 능력치";
      const stages = attr.stages ?? 1;

      return `위협을 받으면 ${statText}이 ${Math.abs(stages)}랭크 ${stages > 0 ? "상승합니다" : "하락합니다"}.`;
    }
    case "PostSummonAddArenaTagAbAttr":
      if (attr.tagType === "NEUTRALIZING_GAS") {
        return "등장했을 때 모든 포켓몬의 특성 효과를 무효화합니다.";
      }
      return "등장했을 때 필드에 특수한 효과를 부여합니다.";

    case "PreLeaveFieldRemoveSuppressAbilitiesSourceAbAttr":
      return "필드를 떠나면 특성 무효화 효과가 사라집니다.";

    case "ReceivedMoveDamageMultiplierAbAttr":
      return typeof attr.damageMultiplier === "number"
        ? `조건을 만족하는 기술로 받는 대미지가 ${attr.damageMultiplier}배가 됩니다.`
        : "조건을 만족하는 기술로 받는 대미지가 감소합니다.";

    case "PostDefendMoveDisableAbAttr":
      return typeof attr.chance === "number"
        ? `접촉 공격을 받았을 때 ${attr.chance}% 확률로 상대의 기술을 4턴 동안 사슬묶기 상태로 만듭니다.`
        : "접촉 공격을 받았을 때 상대의 기술을 사슬묶기 상태로 만듭니다.";

    case "PostKnockOutStatStageChangeAbAttr": {
      const statText = typeof attr.stat === "number" ? i18next.t(getStatKey(attr.stat)) : "특정 능력치";

      const stages = attr.stages ?? 1;

      return `상대를 쓰러뜨렸을 때 자신의 ${statText}이 ${Math.abs(stages)}랭크 ${
        stages > 0 ? "상승합니다" : "하락합니다"
      }.`;
    }

    case "PostItemLostApplyBattlerTagAbAttr": {
      if (attr.tagType === "UNBURDEN") {
        return "지닌도구를 잃으면 스피드가 2배 상승합니다.";
      }

      return "지닌도구를 잃으면 특수한 강화 효과가 발동합니다.";
    }

    case "MoveImmunityStatStageChangeAbAttr": {
      const statText = attr.stat != null ? i18next.t(getStatKey(attr.stat)) : "특정 능력치";
      const stages = attr.stages ?? 1;

      return `조건에 맞는 기술을 무효화하고 ${statText}이 ${Math.abs(stages)}랭크 ${
        stages > 0 ? "상승합니다" : "하락합니다"
      }.`;
    }

    case "PostSummonStatStageChangeOnArenaAbAttr": {
      const statText = getStatNames(attr.stats).join(", ") || "특정 능력치";
      const stages = attr.stages ?? 1;

      return `등장했을 때 필드 조건을 만족하면 ${statText}이 ${Math.abs(stages)}랭크 ${
        stages > 0 ? "상승합니다" : "하락합니다"
      }.`;
    }
    case "BlockNonDirectDamageAbAttr":
      return "공격 기술의 직접적인 대미지를 제외한 모든 피해를 받지 않습니다.";

    case "InfiltratorAbAttr":
      return "상대의 리플렉터, 빛의장막, 오로라베일, 신비의부적, 흰안개, 대타출동을 무시하고 기술을 사용합니다.";

    case "PostDefendStealHeldItemAbAttr":
      return "접촉 공격을 받았을 때 상대가 훔칠 수 있는 지닌도구를 가지고 있으면 그 도구를 훔칩니다.";

    case "ForceSwitchOutImmunityAbAttr":
      return "강제로 교체당하지 않습니다.";

    case "PostVictoryStatStageChangeAbAttr": {
      const statText = attr.stat != null ? i18next.t(getStatKey(attr.stat)) : "특정 능력치";

      const stages = attr.stages ?? 1;

      return `상대를 쓰러뜨렸을 때 ${statText}이 ${Math.abs(stages)}랭크 ${stages > 0 ? "상승합니다" : "하락합니다"}.`;
    }

    case "BattlerTagImmunityAbAttr": {
      const tagTypes = attr.immuneTagTypes ?? [];

      if (tagTypes.includes("FLINCHED")) {
        return "풀죽음 상태가 되지 않습니다.";
      }

      return "특정 상태 변화에 걸리지 않습니다.";
    }

    case "IntimidateImmunityAbAttr":
      return "위협의 효과를 받지 않습니다.";

    case "PostSummonWeatherChangeAbAttr":
      return attr.weatherType != null
        ? `등장했을 때 날씨를 ${getWeatherName(attr.weatherType)}으로 변경합니다.`
        : "등장했을 때 날씨를 변경합니다.";

    case "PostBiomeChangeWeatherChangeAbAttr":
      return attr.weatherType != null
        ? `바이옴이 바뀔 때 날씨를 ${getWeatherName(attr.weatherType)}으로 변경합니다.`
        : "바이옴이 바뀔 때 날씨를 변경합니다.";

    case "PreSwitchOutHealAbAttr":
      return "교체되면 최대 HP의 1/3을 회복합니다.";

    case "NonSuperEffectiveImmunityAbAttr":
      return "효과가 굉장한 공격 기술이 아니면 대미지를 받지 않습니다.";

    case "ForewarnAbAttr":
      return "등장했을 때 상대의 기술 중 가장 위력이 높은 기술을 감지하고 이름을 알려줍니다.";

    case "SyncEncounterNatureAbAttr":
      return "야생 포켓몬의 성격이 자신의 성격과 같아질 확률이 증가합니다.";

    case "SynchronizeStatusAbAttr":
      return "화상, 마비, 독, 맹독 상태가 되면 그 상태를 상대에게도 옮깁니다.";

    case "ReduceBurnDamageAbAttr":
      return "화상으로 받는 턴 종료 피해가 0.5배가 됩니다.";

    case "ReflectStatStageChangeAbAttr":
      return "상대가 자신의 능력치를 낮추려 하면 그 효과를 무효화하고 상대에게 되돌립니다.";

    case "PostBattleInitFormChangeAbAttr":
      return "전투 시작 시 조건에 따라 폼이 변합니다.";

    case "PostSummonFormChangeAbAttr":
      return "등장했을 때 조건에 따라 폼이 변합니다.";

    case "PostTurnFormChangeAbAttr":
      return "턴 종료 시 조건에 따라 폼이 변합니다.";

    case "PostDefendContactApplyTagChanceAbAttr": {
      const chance = attr.chance ?? 100;

      if (attr.tagType === "INFATUATED") {
        return `접촉 공격을 받았을 때 ${chance}% 확률로 상대를 헤롱헤롱 상태로 만듭니다.`;
      }

      return `접촉 공격을 받았을 때 ${chance}% 확률로 상대에게 특수한 상태 변화를 부여합니다.`;
    }

    case "IgnoreOpponentStatStagesAbAttr":
      return "상대의 능력치 변화 효과를 무시합니다.";

    case "StabBoostAbAttr":
      return "자신과 같은 타입의 기술(STAB)의 위력이 2배가 됩니다.";

    case "HealFromBerryUseAbAttr": {
      const percent = attr.healPercent ?? 0;

      if (Math.abs(percent - 1 / 3) < 0.001) {
        return "나무열매를 먹으면 추가로 최대 HP의 1/3을 회복합니다.";
      }

      return `나무열매를 먹으면 추가로 최대 HP의 ${Math.round(percent * 100)}%를 회복합니다.`;
    }

    case "PostDefendContactDamageAbAttr":
      return typeof attr.damageRatio === "number"
        ? `접촉 공격을 받았을 때 상대에게 최대 HP의 1/${attr.damageRatio}만큼 피해를 줍니다.`
        : "접촉 공격을 받았을 때 상대에게 피해를 줍니다.";

    case "PreventBerryUseAbAttr":
      return "상대가 나무열매를 사용할 수 없게 합니다.";

    case "MoodyAbAttr":
      return "턴 종료 시 공격, 방어, 특수공격, 특수방어, 스피드 중 무작위 능력치 하나가 2랭크 상승하고, 다른 하나가 1랭크 하락합니다.";

    case "EffectSporeAbAttr":
      return `접촉 공격을 받은 경우 ${attr.chance}% 확률로 상대를 독, 마비, 잠듦 상태 중 하나로 만듭니다.`;

    case "ChangeMovePriorityAbAttr":
      if (attr.changeAmount === 3) {
        return "회복 효과가 있는 기술의 우선도가 3 상승합니다.";
      }

      return typeof attr.changeAmount === "number"
        ? `조건에 맞는 기술의 우선도가 ${attr.changeAmount} 상승합니다.`
        : "조건에 맞는 기술의 우선도가 상승합니다.";

    case "BonusCritAbAttr":
      return "급소에 맞을 확률이 1단계 상승합니다.";

    case "StatStageChangeMultiplierAbAttr":
      return typeof attr.multiplier === "number"
        ? `능력치 랭크 변화량이 ${attr.multiplier}배 적용됩니다.`
        : "능력치 랭크 변화량이 변경됩니다.";

    case "BlockCritAbAttr":
      return "상대의 공격이 급소에 맞지 않습니다.";

    case "PostStatStageChangeStatStageChangeAbAttr": {
      const statText = getStatNames(attr.statsToChange).join(", ") || "특정 능력치";
      const stages = attr.stages ?? 0;

      return `조건을 만족하는 능력치 변화가 발생하면 ${statText}이 ${Math.abs(stages)}랭크 ${
        stages > 0 ? "상승합니다" : "하락합니다"
      }.`;
    }

    case "MaxMultiHitAbAttr":
      return "연속 공격 기술이 항상 최대 횟수로 명중합니다.";

    case "PostTurnResetStatusAbAttr": {
      const targetText = attr.allyTarget ? "같은 편의" : "자신의";

      if (attr.weatherTypes?.length > 0) {
        const weatherText = getWeatherNames(attr.weatherTypes).join(", ");

        return `${weatherText}일 때 턴 종료 시 ${targetText} 상태이상을 치료합니다.`;
      }

      return `턴 종료 시 ${targetText} 상태이상을 치료합니다.`;
    }

    case "PostReceiveCritStatStageChangeAbAttr": {
      const statText = attr.stat != null ? i18next.t(getStatKey(attr.stat)) : "특정 능력치";

      const stages = attr.stages ?? 1;

      return `급소에 맞았을 때 ${statText}이 ${Math.abs(stages)}랭크 상승합니다.`;
    }

    case "IgnoreMoveEffectsAbAttr":
      return "상대 기술의 추가 효과를 받지 않습니다.";

    case "PostSummonRemoveBattlerTagAbAttr": {
      const tagText = getBattlerTagNames(attr.immuneTags).join(", ") || "특정 상태 변화";
      return `등장했을 때 ${tagText} 상태를 해제합니다.`;
    }

    case "PostTurnStatusHealAbAttr": {
      const effectText = (attr.effects ?? []).map(getStatusEffectName).join(", ") || "특정 상태이상";
      return `${effectText} 상태일 때 턴 종료 시 HP를 회복합니다.`;
    }

    case "BlockStatusDamageAbAttr": {
      const effectText = (attr.effects ?? []).map(getStatusEffectName).join(", ") || "특정 상태이상";
      return `${effectText} 상태로 인한 턴 종료 피해를 받지 않습니다.`;
    }

    case "PostAttackContactApplyStatusEffectAbAttr": {
      const effectText = (attr.effects ?? []).map(getStatusEffectName).join(", ") || "상태이상";

      const chance = attr.chance ?? 100;

      return `접촉 기술이 명중했을 때 ${chance}% 확률로 상대를 ${effectText} 상태로 만듭니다.`;
    }

    case "IgnoreTypeStatusEffectImmunityAbAttr": {
      const effectText = (attr.statusEffect ?? []).map(getStatusEffectName).join(", ") || "상태이상";

      const typeText = (attr.defenderType ?? []).map(getTypeName).join(", ") || "특정 타입";

      return `${typeText}타입의 면역을 무시하고 ${effectText} 상태로 만들 수 있습니다.`;
    }

    case "ConditionalUserFieldStatusEffectImmunityAbAttr":
      return "조건을 만족하는 같은 편 포켓몬은 상태이상에 걸리지 않습니다.";

    case "ConditionalUserFieldBattlerTagImmunityAbAttr": {
      const tagText = getBattlerTagNames(attr.immuneTagTypes).join(", ") || "특정 상태 변화";
      return `조건을 만족하는 같은 편 포켓몬은 ${tagText} 상태가 되지 않습니다.`;
    }

    case "ConditionalUserFieldProtectStatAbAttr":
      return attr.protectedStat == null
        ? "조건을 만족하는 같은 편 포켓몬은 능력치가 하락하지 않습니다."
        : `조건을 만족하는 같은 편 포켓몬은 ${i18next.t(getStatKey(attr.protectedStat))}이 하락하지 않습니다.`;

    case "AllyHeldItemShareAbAttr":
      return "같은 편의 지닌도구 효과를 함께 받을 수 있습니다.";

    case "PostDancingMoveAbAttr":
      return "다른 포켓몬이 춤 기술을 사용하면 이어서 같은 기술을 사용합니다.";

    case "PostSummonCopyAbilityAbAttr":
      return "등장했을 때 상대의 특성을 복사합니다.";

    case "PreSwitchOutResetStatusAbAttr":
      return "교체되면 상태이상이 치료됩니다.";

    case "CudChewConsumeBerryAbAttr":
      return "나무열매를 먹은 다음 턴 종료 시 같은 나무열매를 한 번 더 먹습니다.";

    case "CudChewRecordBerryAbAttr":
      return "먹은 나무열매를 되새김질 대상으로 기록합니다.";

    case "FieldPriorityMoveImmunityAbAttr":
      return "상대의 우선도가 높은 기술이 자신과 같은 편에게 통하지 않습니다.";

    case "UserFieldStatusEffectImmunityAbAttr": {
      const effectText = (attr.immuneEffects ?? []).map(getStatusEffectName).join(", ") || "상태이상";
      return `자신과 같은 편은 ${effectText} 상태가 되지 않습니다.`;
    }

    case "PostSummonUserFieldRemoveStatusEffectAbAttr": {
      const effectText = (attr.statusEffect ?? []).map(getStatusEffectName).join(", ") || "상태이상";
      return `등장했을 때 자신과 같은 편의 ${effectText} 상태를 치료합니다.`;
    }

    case "UserFieldBattlerTagImmunityAbAttr": {
      const tagText = getBattlerTagNames(attr.immuneTagTypes).join(", ") || "특정 상태 변화";
      return `자신과 같은 편은 ${tagText} 상태가 되지 않습니다.`;
    }

    case "IgnoreProtectOnContactAbAttr":
      return "접촉 기술이 방어, 킹실드, 니들가드 등의 효과를 무시하고 명중합니다.";

    case "BypassSpeedChanceAbAttr":
      return `${attr.chance}% 확률로 스피드와 관계없이 먼저 행동합니다.`;

    case "PreLeaveFieldClearWeatherAbAttr":
      return "필드를 떠날 때 특성으로 생성한 날씨가 사라집니다.";

    case "ReverseDrainAbAttr":
      return "상대가 흡수 기술을 사용하면 회복하는 대신 같은 양의 피해를 받습니다.";

    case "PostDefendApplyBattlerTagAbAttr":
      return "바람 기술을 받으면 충전 상태가 됩니다.";

    case "FormBlockDamageAbAttr":
      return "조건을 만족하면 공격으로 받는 대미지를 1번 무효화합니다.";

    case "DownloadAbAttr":
      return "등장했을 때 상대의 방어와 특수방어를 비교하여 공격 또는 특수공격이 상승합니다.";

    case "AllyStatMultiplierAbAttr": {
      const multiplier = attr.multiplier ?? attr.statMultiplier ?? 1;
      const increase = Math.round((multiplier - 1) * 100);

      return `같은 편의 공격, 방어, 특수공격, 특수방어, 스피드, 명중, 회피가 ${multiplier}배 상승합니다. (+${increase}%)`;
    }

    case "BlockItemTheftAbAttr":
      return "상대에게 지닌도구를 빼앗기지 않습니다.";

    case "WonderSkinAbAttr":
      return "상대의 변화 기술 명중률이 50%가 됩니다.";

    case "PostDefendTerrainChangeAbAttr":
      return attr.terrainType != null
        ? `공격을 받으면 필드를 ${getTerrainName(attr.terrainType)}로 변경합니다.`
        : "공격을 받으면 필드를 변경합니다.";

    case "PostDefendWeatherChangeAbAttr":
      return attr.weatherType != null
        ? `공격을 받으면 날씨를 ${getWeatherName(attr.weatherType)}으로 변경합니다.`
        : "공격을 받으면 날씨를 변경합니다.";

    case "PostSummonTransformAbAttr":
      return "등장했을 때 상대 포켓몬으로 변신합니다.";

    case "FieldPreventExplosiveMovesAbAttr":
      return "필드의 모든 포켓몬은 자폭 기술을 사용할 수 없습니다.";

    case "PostAttackApplyBattlerTagAbAttr":
      return "공격이 명중하면 일정 확률로 특수 상태를 부여합니다.";

    case "PostTurnRestoreBerryAbAttr":
      return "턴 종료 시 사용한 나무열매를 다시 얻을 수 있습니다.";

    case "HeldItemBypassAbAttr":
      return "자신과 상대의 지닌도구 효과를 무효화합니다.";

    case "FetchBallAbAttr":
      return "사용한 볼을 다시 가져옵니다.";

    case "FlinchStatStageChangeAbAttr": {
      const statText = getStatNames(attr.stats).join(", ") || "특정 능력치";

      return `풀죽으면 ${statText}이(가) ${attr.stages}랭크 상승합니다.`;
    }

    case "SuppressWeatherEffectAbAttr":
      return "필드의 날씨 효과를 무시합니다.";

    case "PostSummonUnnamedMessageAbAttr":
      return "등장했을 때 특수한 효과가 발동합니다.";

    case "PostSummonWeatherSuppressedFormChangeAbAttr":
      return "등장했을 때 날씨 무효화에 따른 폼 변화를 적용합니다.";

    case "PostFaintUnsuppressedWeatherFormChangeAbAttr":
      return "기절하면 날씨 효과가 다시 적용되어 폼이 변화할 수 있습니다.";

    case "AlliedFieldDamageReductionAbAttr": {
      const reduction = Math.round((1 - (attr.damageMultiplier ?? 1)) * 100);

      return `같은 편이 받는 기술의 대미지가 ${attr.damageMultiplier}배가 됩니다. (${reduction}% 감소)`;
    }

    case "ConditionalCritAbAttr":
      return "조건을 만족하는 상대를 공격하면 반드시 급소에 맞습니다.";

    case "PostDefendApplyArenaTrapTagAbAttr": {
      const tagText = attr.arenaTagType === ArenaTagType.TOXIC_SPIKES ? "독압정" : "함정";

      return `조건을 만족하는 공격을 받으면 상대 필드에 ${tagText}을 설치합니다.`;
    }

    case "PostSummonAllyHealAbAttr": {
      const lines = [`등장했을 때 같은 편의 HP를 최대 HP의 1/${attr.healRatio}만큼 회복시킵니다.`];

      if (attr.activateOnGain) {
        lines.push("특성을 새로 얻었을 때도 효과가 발동합니다.");
      }

      return lines.join(" ");
    }

    case "IllusionPreSummonAbAttr":
      return "전투에 나올 때 사용 가능한 같은 편 포켓몬의 모습으로 변장합니다.";

    case "IllusionBreakAbAttr":
      return "조건을 만족하면 변장이 해제됩니다.";

    case "PostDefendIllusionBreakAbAttr":
      return "공격 기술로 피해를 받으면 변장이 해제됩니다.";

    case "IllusionPostBattleAbAttr":
      return "전투가 끝나면 다시 변장할 수 있습니다.";

    case "NoFusionAbilityAbAttr":
      return "합체 상태에서는 이 특성을 사용할 수 없습니다.";

    case "PostDefendHpGatedStatStageChangeAbAttr": {
      const hpText = `${Math.round((attr.hpGate ?? 0.5) * 100)}% 이하`;
      const statText = (attr.stats ?? []).map((s: number) => i18next.t(getStatKey(s))).join(", ") || "특정 능력치";

      return `공격 기술로 피해를 받아 HP가 ${hpText}가 되면 ${statText}이 ${attr.stages ?? 1}랭크 상승합니다.`;
    }

    case "PostTurnHurtIfSleepingAbAttr":
      return "턴 종료 시 잠든 상대 또는 절대안깸 특성의 상대에게 최대 HP의 1/8만큼 피해를 줍니다.";

    case "PostFaintHPDamageAbAttr":
      return "쓰러졌을 때 자신이 쓰러지기 전 남아 있던 HP만큼 상대에게 피해를 줍니다.";

    case "MoveImmunityAbAttr":
      return "조건을 만족하는 기술의 영향을 받지 않습니다.";

    case "DefeatistHealBonusAbAttr":
      return "HP가 절반 이하인 상태에서 회복을 받으면 전투당 1회 공격, 방어, 특수공격, 특수방어, 스피드가 1랭크 상승합니다.";

    case "PreSwitchOutFormChangeAbAttr":
      return "교체될 때 조건을 만족하면 폼이 변화합니다.";

    case "PostSummonFormChangeByWeatherAbAttr":
      return "등장했을 때 현재 날씨에 따라 모습이 변화합니다.";

    case "PostWeatherChangeFormChangeAbAttr":
      return "날씨가 바뀌면 현재 날씨에 맞는 모습으로 변화합니다.";

    case "ReduceStatusEffectDurationAbAttr":
      return `${getStatusEffectName(attr.statusEffect)} 상태의 지속 턴 수가 1턴 감소합니다.`;

    case "ClearWeatherAbAttr":
      return "현재 날씨를 제거합니다.";

    case "ClearTerrainAbAttr":
      return "현재 필드를 제거합니다.";

    case "FieldMoveTypePowerBoostAbAttr": {
      const typeText = getTypeName(attr.moveType ?? attr.type);
      const multiplier = attr.powerMultiplier ?? 1;

      return `필드에 있는 동안 모든 포켓몬의 ${typeText}타입 기술 위력이 ${multiplier}배가 됩니다.`;
    }

    case "FieldAllMovePowerBoostAbAttr": {
      const multiplier = attr.powerMultiplier ?? 1;

      return `필드에 있는 동안 모든 포켓몬의 기술 위력이 ${multiplier}배가 됩니다.`;
    }

    case "WeightMultiplierAbAttr":
      return `체중이 ${attr.multiplier}배가 됩니다.`;

    case "PostDamageForceSwitchAbAttr":
      return "피해를 받아 HP가 절반 이하가 되면 교체됩니다.";

    case "IgnoreContactAbAttr":
      return "접촉 기술을 사용해도 접촉한 것으로 판정되지 않습니다.";

    case "AllyMoveCategoryPowerBoostAbAttr": {
      const multiplier = attr.powerMultiplier ?? 1;

      return `같은 편이 조건을 만족하는 분류의 기술을 사용할 때 위력이 ${multiplier}배 상승합니다.`;
    }

    case "CopyFaintedAllyAbilityAbAttr":
      return "같은 편이 쓰러지면 그 포켓몬의 특성을 이어받습니다.";

    case "TerrainEventTypeChangeAbAttr":
      return "필드 상태에 따라 자신의 타입이 변화합니다.";

    case "BlockRedirectAbAttr":
      return "기술의 대상이 다른 포켓몬에게 변경되지 않습니다.";

    case "PostSummonUserFieldRemoveStatusEffectAbAttr":
      return "등장했을 때 같은 편의 특정 상태이상을 치료합니다.";

    case "UserFieldStatusEffectImmunityAbAttr":
      return "같은 편이 특정 상태이상에 걸리지 않게 합니다.";

    case "CommanderAbAttr":
      return "더블배틀에서 특정 아군을 지휘하는 상태가 됩니다.";

    case "DoubleBattleChanceAbAttr":
      return "더블배틀에서 발동할 수 있습니다.";

    case "DoubleBerryEffectAbAttr":
      return "나무열매의 효과가 2배가 됩니다.";

    case "PostSummonRemoveArenaTagAbAttr": {
      const tagNames = (attr.arenaTags ?? [])
        .map((tag: ArenaTagType) => {
          switch (tag) {
            case ArenaTagType.AURORA_VEIL:
              return "오로라베일";
            case ArenaTagType.LIGHT_SCREEN:
              return "빛의장막";
            case ArenaTagType.REFLECT:
              return "리플렉터";
            default:
              return null;
          }
        })
        .filter(Boolean);

      return `등장했을 때 ${tagNames.join(", ")}를 제거합니다.`;
    }

    case "PostDefendPerishSongAbAttr": {
      const turns = attr.turns ?? 4;

      return `접촉 공격을 받으면 자신과 공격한 상대에게 멸망의노래 상태를 부여하고 ${turns}턴 후 쓰러지게 합니다.`;
    }

    case "UserFieldMoveTypePowerBoostAbAttr": {
      const typeText = getTypeName(attr.moveType ?? attr.type);
      const multiplier = attr.powerMultiplier ?? attr.multiplier ?? 1.5;

      return `같은 편의 ${typeText}타입 기술 위력이 ${multiplier}배 상승합니다.`;
    }

    case "PostDefendAbilityGiveAbAttr":
      return "접촉 공격을 받으면 공격한 상대의 특성을 특정 특성으로 바꿉니다.";

    case "PostSummonClearAllyStatStagesAbAttr":
      return "등장했을 때 같은 편의 모든 능력치 변화를 초기화합니다.";

    case "PostSummonCopyAllyStatsAbAttr":
      return "더블배틀에서 등장했을 때 같은 편의 능력치 랭크 변화를 복사합니다.";

    case "StatStageChangeCopyAbAttr":
      return "상대의 능력치 상승을 그대로 따라 합니다.";

    case "PostAttackApplyStatusEffectAbAttr": {
      const chance = attr.chance ?? 100;
      const statusText = getStatusEffectName(attr.statusEffect);

      return `공격 기술이 명중하면 ${chance}% 확률로 상대를 ${statusText} 상태로 만듭니다.`;
    }

    case "ConfusionOnStatusEffectAbAttr": {
      const effects = (attr.statusEffects ?? []).map((s: StatusEffect) => getStatusEffectName(s)).join(", ");

      return `${effects} 상태가 된 포켓몬을 혼란 상태로 만듭니다.`;
    }

    default:
      console.log("[ABILITY_ATTR_DEBUG]", attrName, attr);
      return `효과 분석 중 (${attrName})`;
  }
}

function getBattlerTagNames(tagTypes: BattlerTagType[] = []): string[] {
  return tagTypes.map(getBattlerTagName);
}

function getBattlerTagName(tagType: BattlerTagType): string {
  switch (tagType) {
    case BattlerTagType.INFATUATED:
      return "헤롱헤롱";
    case BattlerTagType.TAUNT:
      return "도발";
    case BattlerTagType.FLINCHED:
      return "풀죽음";
    case BattlerTagType.CONFUSED:
      return "혼란";
    default:
      return BattlerTagType[tagType] ?? "특정 상태 변화";
  }
}

function getMoveFlagBoostLine(flag: MoveFlags | MoveFlags2, multiplier: number): string {
  return `• ${getMoveFlagName(flag)} 기술 분류의 위력이 ${multiplier}배 상승합니다.`;
}

function getMoveFlagImmunityLine(flag: MoveFlags | MoveFlags2): string {
  return `${getMoveFlagName(flag)} 기술을 무효화합니다.`;
}

function getBattlerTagDescription(tagType: string, conditionText: string): string {
  switch (tagType) {
    case "PROTOSYNTHESIS":
      return `${conditionText} 고대활성이 발동하여 가장 높은 능력치가 상승합니다.`;

    case "QUARK_DRIVE":
      return `${conditionText} 쿼크차지가 발동하여 가장 높은 능력치가 상승합니다.`;

    case "PLUVIAFLUX":
      return `${conditionText} 범람파워가 발동하여 가장 높은 능력치가 상승합니다.`;

    case "NEURO_CHARGE":
      return `${conditionText} 뉴런활성이 발동하여 가장 높은 능력치가 상승합니다.`;

    case "CRYOSYNTHESIS":
      return `${conditionText} 빙하활성이 발동하여 가장 높은 능력치가 상승합니다.`;

    case "PHYTONCIDE":
      return `${conditionText} 피톤치드가 발동하여 가장 높은 능력치가 상승합니다.`;

    case "PSAMMOSYNTHESIS":
      return `${conditionText} 사하라포스가 발동하여 가장 높은 능력치가 상승합니다.`;

    case "UNSEEN_FORCE":
      return `${conditionText} 미지의힘이 발동하여 가장 높은 능력치가 상승합니다.`;

    default:
      return `${conditionText} 특수한 강화 효과가 발동합니다.`;
  }
}

function getWeatherNames(weatherTypes: WeatherType[] = []): string[] {
  return weatherTypes.map(getWeatherName);
}

function getWeatherName(weatherType: WeatherType): string {
  switch (weatherType) {
    case WeatherType.SUNNY:
      return "쾌청";
    case WeatherType.HARSH_SUN:
      return "강한 햇살";
    case WeatherType.RAIN:
      return "비";
    case WeatherType.HEAVY_RAIN:
      return "폭우";
    case WeatherType.SANDSTORM:
      return "모래바람";
    case WeatherType.HAIL:
      return "싸라기눈";
    case WeatherType.SNOW:
      return "설경";
    case WeatherType.FOG:
      return "안개";
    case WeatherType.STRONG_WINDS:
      return "난기류";
    default:
      return WeatherType[weatherType] ?? "특정 날씨";
  }
}

function getMoveFlagName(flag: MoveFlags | MoveFlags2): string {
  switch (flag) {
    case MoveFlags.MAKES_CONTACT:
      return "접촉";
    case MoveFlags.PUNCHING_MOVE:
      return "펀치";
    case MoveFlags.BITING_MOVE:
      return "물기";
    case MoveFlags.PULSE_MOVE:
      return "파동";
    case MoveFlags.SLICING_MOVE:
      return "베기";
    case MoveFlags.RECKLESS_MOVE:
      return "반동";
    case MoveFlags.BALLBOMB_MOVE:
      return "구슬/폭탄";
    case MoveFlags.POWDER_MOVE:
      return "가루";
    case MoveFlags.DANCE_MOVE:
      return "춤";
    case MoveFlags.WIND_MOVE:
      return "바람";
    case MoveFlags.HEAD_MOVE:
      return "박치기";
    case MoveFlags.BEAM_MOVE:
      return "광선";
    case MoveFlags.ARROW_MOVE:
      return "화살";
    case MoveFlags.HORN_MOVE:
      return "뿔";
    case MoveFlags.KICK_MOVE:
      return "킥";
    case MoveFlags.BOOMERANG_MOVE:
      return "부메랑";
    case MoveFlags.SPEAR_MOVE:
      return "창";
    case MoveFlags.WING_MOVE:
      return "날개";
    case MoveFlags.HAMMER_MOVE:
      return "해머";
    case MoveFlags.CLAW_MOVE:
      return "발톱";
    case MoveFlags2.PINCH_MOVE:
      return "집게";
    case MoveFlags2.BEAK_MOVE:
      return "부리";
    case MoveFlags2.DASH_MOVE:
      return "대시";
    case MoveFlags2.SPIN_MOVE:
      return "스핀";
    case MoveFlags2.DRILL_MOVE:
      return "드릴";
    case MoveFlags2.WHIP_MOVE:
      return "휩";
    case MoveFlags2.WHEEL_MOVE:
      return "바퀴";
    case MoveFlags2.THROW_MOVE:
      return "던지기";
    case MoveFlags2.LIGHT_MOVE:
      return "빛";
    case MoveFlags2.TAIL_MOVE:
      return "꼬리";
    default:
      return "특정";
  }
}

function getTypeName(type: PokemonType): string {
  return i18next.t(`pokemonInfo:type.${toCamelCase(PokemonType[type])}`);
}

function getTerrainName(terrainType: TerrainType): string {
  return i18next.t(`terrain:${toCamelCase(TerrainType[terrainType])}`, {
    defaultValue: TerrainType[terrainType] ?? "특정 필드",
  });
}

function getStatNames(stats: Stat[] = []): string[] {
  return stats.map(s => i18next.t(getStatKey(s)));
}

function getStatusEffectName(effect: StatusEffect): string {
  switch (effect) {
    case StatusEffect.PARALYSIS:
      return "마비";
    case StatusEffect.POISON:
      return "독";
    case StatusEffect.TOXIC:
      return "맹독";
    case StatusEffect.BURN:
      return "화상";
    case StatusEffect.SLEEP:
      return "잠듦";
    case StatusEffect.FREEZE:
      return "얼음";
    case StatusEffect.FROSTBITE:
      return "동상";
    default:
      return StatusEffect[effect] ?? "상태이상";
  }
}
