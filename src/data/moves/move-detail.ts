import { isMaxMove } from "#balance/trs";
import { TerrainType } from "#data/terrain";
import { AbilityId } from "#enums/ability-id";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { MoveCategory } from "#enums/move-category";
import { MoveFlags } from "#enums/move-flags";
import { MoveFlags2 } from "#enums/move-flags-2";
import { MoveId } from "#enums/move-id";
import { MoveTarget } from "#enums/move-target";
import { MultiHitType } from "#enums/multi-hit-type";
import { PokemonType } from "#enums/pokemon-type";
import { getStatKey, Stat } from "#enums/stat";
import { StatusEffect } from "#enums/status-effect";
import { SwitchType } from "#enums/switch-type";
import { WeatherType } from "#enums/weather-type";
import * as MoveModule from "#moves/move";
import { toCamelCase } from "#utils/strings";
import i18next from "i18next";

/**
 * 기술 세부설명. 배치 위치: src/data/move-detail.ts
 *
 * ability-detail.ts와 동일하게 각 줄 앞에 "• "를 붙여 반환합니다.
 * Move 또는 PokemonMove를 받습니다. 기술 선택/도감 UI에서 호출하세요.
 * move.ts 자체에서는 이 모듈을 import하지 마세요(순환 참조 방지).
 *
 * 수치는 기술의 기본 설정입니다. 전투 중 특성/도구 보정은 계산하지 않습니다.
 * apply/getMoveChance/getCondition/위력 콜백을 실행하지 않으므로
 * 설명 창을 열어도 난수, HP, PP, 전투 페이즈에 영향을 주지 않습니다.
 */
export type MoveDetailInput = MoveModule.Move | { getMove(): MoveModule.Move } | null | undefined;

export interface MoveDetailOptions {
  /** 기본 정보(타입/분류/위력/명중/PP/우선도/대상). 기본 true. */
  includeBasic?: boolean;
  /** 접촉/펀치/소리 등 분류와 방어 관통 플래그. 기본 true. */
  includeFlags?: boolean;
  /** 기존 번역 설명을 항상 함께 표시. 기본 false(미지원 효과가 있을 때만 표시). */
  includeBaseDescription?: boolean;
}

/** 수동 설명은 일반 효과만 대체합니다. 충전 효과와 플래그는 별도로 유지됩니다. */
export type MoveDetailOverride = readonly string[] | ((move: MoveModule.Move) => readonly string[]);
const overrides = new Map<MoveId, MoveDetailOverride>();

export function registerMoveDetailOverride(id: MoveId, description: MoveDetailOverride): void {
  overrides.set(id, description);
}

export function removeMoveDetailOverride(id: MoveId): void {
  overrides.delete(id);
}

/** 기존 getAbilityEffectLines(ability)에 대응하는 함수. */
export function getMoveEffectLines(input: MoveDetailInput, options: MoveDetailOptions = {}): string[] {
  const move = resolveMove(input);
  if (!move || move.id === MoveId.NONE) {
    return ["• 효과 정보 없음"];
  }

  const state = move as unknown as AttrData;
  const marker = `${state.nameAppend ?? ""} ${move.name ?? ""}`;
  if (marker.includes("(N)")) {
    return ["• 아직 구현되지 않아 사용할 수 없는 기술입니다."];
  }

  const lines: string[] = [];
  const manual = overrides.get(move.id);
  let needsBase = marker.includes("(P)");
  if (needsBase) {
    lines.push("일부 효과만 구현된 기술입니다.");
  }
  if (manual !== undefined) {
    lines.push(...(typeof manual === "function" ? manual(move) : manual));
  } else {
    for (const attr of move.attrs ?? []) {
      const result = describeAttr(attr, move);
      lines.push(...result.lines);
      needsBase ||= result.needsBase;
    }
    if (isMaxMove(move.id)) {
      lines.push("다이맥스 상태에서는 다이맥스 기술의 공통 위력 보정 1.5배가 별도로 적용됩니다.");
    }
    // condition/restriction 콜백 자체는 호출하지 않습니다.
    lines.push(...(MOVE_CONDITIONS[moveKey(move)] ?? []));
    needsBase ||=
      (array(state.conditions).length > 0 || array(state.restrictions).length > 0) && !MOVE_CONDITIONS[moveKey(move)];
  }

  if (move.isChargingMove()) {
    lines.unshift("첫 턴에 준비하고 다음 턴에 기술을 사용합니다.");
    for (const attr of move.chargeAttrs ?? []) {
      const result = describeAttr(attr, move);
      lines.push(...result.lines.map(line => `[충전] ${line}`));
      needsBase ||= result.needsBase;
    }
  }

  const base = cleanBaseDescription(move.effect);
  if ((options.includeBaseDescription || needsBase || lines.length === 0) && base) {
    lines.push(`기본 설명: ${base}`);
  }
  if (needsBase && !base) {
    lines.push("일부 특수 효과의 세부 설명은 아직 등록되지 않았습니다.");
  }
  if (lines.length === 0) {
    lines.push(move.category === MoveCategory.STATUS ? "기술의 기본 설명을 참고하세요." : "대상에게 피해를 줍니다.");
  }
  return bullets(lines);
}

/** 도감/기술 상세창용 전체 설명. */
export function getMoveDetailLines(input: MoveDetailInput, options: MoveDetailOptions = {}): string[] {
  const move = resolveMove(input);
  if (!move || move.id === MoveId.NONE) {
    return ["• 기술 정보 없음"];
  }
  return bullets([
    ...(options.includeBasic === false ? [] : getMoveBasicLines(move)),
    ...getMoveEffectLines(move, options),
    ...(options.includeFlags === false ? [] : getMoveFlagLines(move)),
  ]);
}

export function getMoveDetailText(input: MoveDetailInput, options: MoveDetailOptions = {}): string {
  return getMoveDetailLines(input, options).join("\n");
}

export function getMoveBasicLines(input: MoveDetailInput): string[] {
  const move = resolveMove(input);
  if (!move || move.id === MoveId.NONE) {
    return ["• 기술 정보 없음"];
  }
  const category = CATEGORY_NAMES[enumKey(MoveCategory, move.category)] ?? "분류 미상";
  const power =
    move.category === MoveCategory.STATUS ? "—" : move.power < 0 ? "조건에 따라 결정" : numberText(move.power);
  const accuracy = move.accuracy < 0 ? "필중(명중률 판정 생략)" : `${numberText(move.accuracy)}%`;
  const priority = move.priority > 0 ? `+${numberText(move.priority)}` : numberText(move.priority);
  return bullets([
    `기본 타입·분류: ${typeName(move.type)} / ${category}`,
    `기본 위력: ${power} / 기본 명중률: ${accuracy}`,
    `기본 PP: ${numberText(move.pp)} / 기본 우선도: ${priority}`,
    `기본 대상: ${targetName(move.moveTarget)}`,
  ]);
}

export function getMoveFlagLines(input: MoveDetailInput): string[] {
  const move = resolveMove(input);
  if (!move || move.id === MoveId.NONE) {
    return [];
  }
  const labels: string[] = [];
  for (const [key, label] of Object.entries(FLAG_NAMES)) {
    if (hasFlag(move, key)) {
      labels.push(label);
    }
  }
  const lines: string[] = labels.length > 0 ? [`기술 분류: ${labels.join(" / ")}`] : [];
  for (const [key, line] of Object.entries(FLAG_EFFECTS)) {
    if (hasFlag(move, key)) {
      lines.push(line);
    }
  }
  return bullets(lines);
}

function resolveMove(input: MoveDetailInput): MoveModule.Move | undefined {
  if (!input) {
    return;
  }
  return "getMove" in input && typeof input.getMove === "function" ? input.getMove() : (input as MoveModule.Move);
}

// TypeScript private/protected 필드도 실제 인스턴스에 저장되어 있습니다.
// 동적 읽기는 이 설명 모듈 내부로 한정하고, 그 값을 수정하지 않습니다.
type AttrData = Record<string, any>;
type Result = { lines: string[]; needsBase: boolean };
const described = (...lines: string[]): Result => ({ lines, needsBase: false });
const partial = (...lines: string[]): Result => ({ lines, needsBase: true });

// constructor.name 문자열만 사용하면 배포 빌드의 이름 축약에 취약합니다.
// export 이름 -> 실제 생성자 참조로 구분하여 미등록 MoveAttrs도 지원합니다.
let constructorNames: Map<Function, string> | undefined;
function attrKind(attr: object): string {
  if (!constructorNames) {
    constructorNames = new Map();
    for (const [name, value] of Object.entries(MoveModule)) {
      if (typeof value === "function" && /Attr(?:OnHit)?$/.test(name)) {
        constructorNames.set(value, name);
      }
    }
  }
  return constructorNames.get(attr.constructor) ?? "";
}

/** 기본 효과 확률. 실전 getMoveChance()의 특성/도구 보정은 적용하지 않습니다. */
function effectChance(attr: AttrData, move: MoveModule.Move, mode: "normal" | "tag" | "arena" = "normal"): number {
  const override = attr.effectChanceOverride ?? attr.options?.effectChanceOverride;
  if (mode === "arena") {
    return move.chance < 0 ? 100 : move.chance;
  }
  if (mode === "tag") {
    if (override == null && !(move.chance > 0)) {
      return 100;
    }
    const value = override ?? move.chance;
    // 첨부 AddBattlerTagAttr.apply는 override < 0도 <= 0 검사에서 종료합니다.
    return value <= 0 ? 0 : value;
  }
  const value = override ?? move.chance;
  if (value < 0 || (value === 0 && override == null && move.category === MoveCategory.STATUS)) {
    return 100;
  }
  return value;
}

function probabilistic(
  attr: AttrData,
  move: MoveModule.Move,
  text: string,
  mode: "normal" | "tag" | "arena" = "normal",
): Result {
  const chance = effectChance(attr, move, mode);
  const condition = typeof attr.options?.condition === "function" ? "추가 조건을 만족하면 " : "";
  if (chance === 0) {
    return described(`기본 발동 확률 0%: ${condition}${text}`);
  }
  const prefix = chance >= 100 ? "" : `기본 ${numberText(chance)}% 확률로 `;
  return { lines: [`${condition}${prefix}${text}`], needsBase: !!condition };
}

function describeAttr(raw: object, move: MoveModule.Move, depth = 0): Result {
  if (!raw || typeof raw !== "object" || depth > 4) {
    return partial();
  }
  const a = raw as AttrData;
  const kind = attrKind(raw);
  const who = a.selfTarget ? "자신" : "대상";
  const statChange = (target = who) => `${target}의 ${statNames(a.stats)} ${rankChange(a.stages)}`;

  if (IGNORED_ATTRS.has(kind)) {
    return described();
  }
  switch (kind) {
    case "ZMoveEffectAttr": {
      const result = describeAttr(a.effect, move, depth + 1);
      return { ...result, lines: result.lines.map(line => `${Z_PREFIX}${line}`) };
    }
    case "ZStatStageChangeAttr":
      return {
        lines: [
          `${Z_PREFIX}효과를 받는 포켓몬이 플레이어 측일 때, ${a.options?.condition ? "추가 조건을 만족하면 " : ""}${statChange()}`,
        ],
        needsBase: !!a.options?.condition,
      };
    case "StatStageChangeAttr":
      return probabilistic(a, move, statChange());
    case "MultiStatStageChangeAttr": {
      const side =
        a.moveTarget === MoveTarget.USER_SIDE
          ? "필드의 같은 편 전체"
          : a.moveTarget === MoveTarget.ENEMY_SIDE
            ? "필드의 상대편 전체"
            : "대상";
      return probabilistic(a, move, statChange(side));
    }
    case "HighestStatStageChangeAttr":
      return probabilistic(
        a,
        move,
        `${who}의 공격·방어·특수공격·특수방어·스피드 중 가장 높은 능력치의 ${rankChange(a.stages).replace(/^능력치가 /, "랭크가 ")}`,
      );
    case "GrowthStatStageChangeAttr":
      return probabilistic(a, move, "자신의 공격과 특수공격이 1랭크 상승하며, 햇살 강화 조건에서는 2랭크 상승합니다.");
    case "CutHpStatStageBoostAttr": {
      const result = probabilistic(a, move, statChange("자신"));
      return {
        ...result,
        lines: [`자신의 최대 HP에서 ${ratioText(1 / a.cutRatio)}만큼을 소모합니다.`, ...result.lines],
      };
    }
    case "PostVictoryStatStageChangeAttr":
      return a.condition
        ? partial(`이 기술로 상대를 쓰러뜨리고 추가 조건을 만족하면 ${statChange("자신")}`)
        : described(`이 기술로 상대를 쓰러뜨리면 ${statChange("자신")}`);
    case "CopyStatsAttr":
      return described("대상의 능력치 랭크 변화를 자신에게 복사합니다.");
    case "InvertStatsAttr":
      return described("대상의 능력치 랭크 상승과 하락을 반대로 뒤집습니다.");
    case "ResetStatsAttr":
    case "ZResetStatsAttr":
      return described(
        `${kind === "ZResetStatsAttr" ? Z_PREFIX : ""}${a.targetAllPokemon ? "필드의 모든 포켓몬" : "대상"}의 능력치 랭크를 0으로 되돌립니다.`,
      );
    case "SwapStatStagesAttr":
      return described(`자신과 대상의 ${statNames(a.stats)} 랭크 변화를 서로 바꿉니다.`);
    case "SwapStatAttr":
      return described(`자신과 대상의 ${statNames([a.stat])} 능력치 실수치를 서로 바꿉니다.`);
    case "ShiftStatAttr":
      return described(
        `자신의 ${statNames([a.statToSwitch])}과 ${statNames([a.statToSwitchWith])} 능력치 실수치를 서로 바꿉니다.`,
      );
    case "AverageStatsAttr":
      return described(`자신과 대상의 ${statNames(a.stats)} 능력치 실수치를 각각 두 포켓몬의 평균값으로 맞춥니다.`);
    case "StatusEffectAttr":
      // 첨부 StatusEffectAttr.apply는 selfTarget과 무관하게 target.trySetStatus를 호출합니다.
      return probabilistic(a, move, `기술의 대상을 ${statusName(a.effect)} 상태로 만듭니다.`);
    case "MultiStatusEffectAttr":
      return probabilistic(
        a,
        move,
        `기술의 대상을 ${array(a.effects).map(statusName).join(" / ")} 중 무작위 상태 하나로 만듭니다.`,
      );
    case "HealStatusEffectAttr":
      return described(`${who}의 ${array(a.effects).map(statusName).join(" / ")} 상태를 치료합니다.`);
    case "RestAttr":
      return described(
        `자신의 HP를 전부 회복하고 기존 상태이상을 해제한 뒤 ${numberText(a.duration)}턴 동안 잠듭니다.`,
      );
    case "HealAttr":
      return described(`${who}의 HP를 최대 HP의 ${ratioText(a.healRatio)}만큼 회복합니다.`);
    case "HealOnAllyAttr":
      return described(`같은 편을 대상으로 사용하면 ${who}의 HP를 최대 HP의 ${ratioText(a.healRatio)}만큼 회복합니다.`);
    case "BoostHealAttr":
      return partial(
        `대상의 HP를 최대 HP의 ${ratioText(a.normalHealRatio)}만큼 회복하며, ${moveKey(move) === "FLORAL_HEALING" ? "그래스필드" : "강화 조건"}에서는 ${ratioText(a.boostedHealRatio)}만큼 회복합니다.`,
      );
    case "PlantHealAttr":
      return described(
        "자신의 HP를 기본 1/2 회복합니다. 햇살 강화 조건에서는 2/3, 비·폭우·모래바람·싸라기눈·설경·안개에서는 1/4을 회복합니다.",
      );
    case "SandHealAttr":
      return described("자신의 HP를 기본 1/2 회복하며, 모래바람에서는 2/3을 회복합니다.");
    case "HitHealAttr":
      return a.healStat != null
        ? described(`대상의 실제 ${statNames([a.healStat])} 수치만큼 자신의 HP를 흡수하여 회복합니다.`)
        : described(`매 타격으로 준 피해의 ${ratioText(a.healRatio)}만큼 자신의 HP를 회복합니다.`);
    case "ZHealBeforeMoveAttr": {
      const nested = a.cutHpStatStageBoostAttr;
      const result = nested && typeof nested === "object" ? describeAttr(nested, move, depth + 1) : partial();
      return {
        lines: [
          `${Z_PREFIX}기술 효과에 앞서 자신의 HP를 전부 회복합니다.`,
          ...result.lines.map(line => `${Z_PREFIX}회복 후 ${line}`),
        ],
        needsBase: result.needsBase,
      };
    }
    case "RecoilAttr":
      return described(
        `자신이 ${a.useHp ? "자신의 최대 HP" : "이번 기술로 준 총 피해"}의 ${ratioText(a.damageRatio)}만큼 반동 피해를 받습니다.`,
      );
    case "SacrificialAttr":
      return described("기술 사용 시 자신의 남은 HP를 전부 소모합니다.");
    case "SacrificialAttrOnHit":
      return described("기술이 명중하면 자신의 남은 HP를 전부 소모합니다.");
    case "HalfSacrificialAttr":
      return described("자신의 최대 HP의 1/2만큼 피해를 받습니다. 간접 피해 면역 효과로 막을 수 있습니다.");
    case "SacrificialFullRestoreAttr":
    case "ZSacrificialFullRestoreAttr":
      return partial(
        `${kind === "ZSacrificialFullRestoreAttr" ? Z_PREFIX : "자신을 기절시키고 "}다음에 교대해 나오는 포켓몬의 HP${a.restorePP ? "와 PP" : ""}를 회복합니다.`,
      );
    case "AddSubstituteAttr":
      return described(`최대 HP의 ${ratioText(a.hpCost)}를 소모하여 자신의 분신을 만듭니다.`);
    case "FixedDamageAttr":
      return described(`대상에게 ${numberText(a.damage)}의 고정 피해를 줍니다.`);
    case "TargetFractionHpDamageAttr":
      return described(`대상의 현재 HP의 ${ratioText(a.fraction)}만큼 피해를 줍니다.`);
    case "CounterDamageAttr": {
      const category = CATEGORY_NAMES[enumKey(MoveCategory, a.moveFilter)];
      return described(
        `이번 턴에 상대에게 받은 ${category ? `${category} ` : "공격 "}피해를 기준으로 ${numberText(a.multiplier)}배의 피해를 되돌립니다.`,
      );
    }
    case "DoublePowerChanceAttr":
      return described(`기본 ${numberText(a.chance)}% 확률로 위력이 2배가 됩니다.`);
    case "MovePowerMultiplierAttr":
      return multiplierDescription(a, move);
    case "FriendshipPowerAttr":
      return described(`친밀도가 ${a.invert ? "낮을수록" : "높을수록"} 위력이 높아집니다(위력 1~102).`);
    case "OpponentHighHpPowerAttr":
      return described(`대상의 남은 HP 비율이 높을수록 위력이 높아집니다(최대 ${numberText(a.maxBasePower)}).`);
    case "SpitUpPowerAttr":
      return described(`비축 횟수에 따라 위력이 결정됩니다(비축 횟수 × ${numberText(a.multiplier)}).`);
    case "LastMoveDoublePowerAttr":
      return described(`직전에 사용된 기술이 ${moveName(a.move)}이면 위력이 2배가 됩니다.`);
    case "MultiHitPowerIncrementAttr":
      return described(
        `연속 타격할수록 위력이 기본 위력의 1배, 2배…${numberText(a.maxHits)}배로 증가하며, 추가 타격은 다시 1배부터 반복합니다.`,
      );
    case "MultiHitAttr": {
      const key = enumKey(MultiHitType, a.intrinsicMultiHitType ?? a.multiHitType);
      const counts: Record<string, string> = { _2: "2", _3: "3", _10: "10", _2_TO_5: "2~5" };
      return key === "BEAT_UP"
        ? described("참여 조건을 만족하는 파티원 수만큼 연속 공격합니다.")
        : counts[key]
          ? described(`한 번 사용하면 ${counts[key]}회 연속 공격합니다. 표시 위력은 1타 기준입니다.`)
          : partial("한 번 사용하면 여러 차례 연속 공격합니다.");
    }
    case "MultiHitSmartTargetAttr":
      return described(`총 ${numberText(a.hits)}회 공격을 상대편 대상들에게 순서대로 분배합니다.`);
    case "IncrementMovePriorityAttr":
      return partial(`조건을 만족하면 기술 우선도가 ${numberText(a.increaseAmount)} 상승합니다.`);
    case "WeatherChangeAttr":
    case "ExclusiveWeatherChangeAttr":
      return described(
        `날씨를 ${weatherName(a.weatherType)} 상태로 바꿉니다.${kind === "ExclusiveWeatherChangeAttr" ? " 전용 날씨 설정을 적용합니다." : ""}`,
      );
    case "ClearWeatherAttr":
      return described(`${weatherName(a.weatherType)} 상태를 해제합니다.`);
    case "TerrainChangeAttr":
    case "ExclusiveTerrainChangeAttr":
      return described(
        `${terrainName(a.terrainType)}를 전개합니다.${kind === "ExclusiveTerrainChangeAttr" ? " 전용 필드 설정을 적용합니다." : ""}`,
      );
    case "IgnoreWeatherTypeDebuffAttr":
      return described(`${weatherName(a.weather)}로 인해 이 기술의 위력이 감소하지 않습니다.`);
    case "WeatherInstantChargeAttr":
      return partial("지정된 날씨 조건이 충족되면 준비 턴을 생략할 수 있습니다.");
    case "TerrainInstantChargeAttr":
      return partial("지정된 필드 조건이 충족되면 준비 턴을 생략할 수 있습니다.");
    case "InstantChargeAttr":
      return partial("도구 등 지정된 조건이 충족되면 준비 턴을 생략할 수 있습니다.");
    case "AddBattlerTagAttr":
    case "FlinchAttr":
    case "ConfuseAttr":
    case "RechargeAttr":
    case "TrapAttr":
    case "ProtectAttr":
    case "MaxGuardProtectAttr":
    case "LeechSeedAttr":
    case "FallDownAttr":
    case "ExposedMoveAttr": {
      let line: string;
      if (kind === "FlinchAttr") {
        line = "아직 행동하지 않은 대상을 풀죽게 만듭니다.";
      } else if (kind === "ConfuseAttr") {
        line = `${who}을 ${turnRange(a)} 동안 혼란 상태로 만듭니다.`;
      } else if (kind === "RechargeAttr") {
        line = "기술 사용 후 다음 턴에는 반동으로 행동할 수 없습니다.";
      } else if (kind === "TrapAttr") {
        line = `대상을 ${turnRange(a)} 동안 붙잡아 교체·도주를 제한하고 지속 피해를 주는 상태로 만듭니다.`;
      } else if (kind === "ProtectAttr" || kind === "MaxGuardProtectAttr") {
        line = `자신에게 ${battlerTagName(a.tagType)} 효과를 적용합니다. 연속 사용 시 성공률이 낮아집니다.`;
      } else if (kind === "LeechSeedAttr") {
        line = "대상에게 씨를 심어 지속적으로 HP를 흡수하는 상태로 만듭니다.";
      } else if (kind === "FallDownAttr") {
        line = "대상을 지면으로 떨어뜨려 비행으로 인한 면역을 무시할 수 있게 합니다.";
      } else {
        line = `${who}에게 ${battlerTagName(a.tagType)} 효과를 부여합니다.`;
      }
      const result = probabilistic(a, move, line, "tag");
      if (!BATTLER_TAG_NAMES[enumKey(BattlerTagType, a.tagType)] || kind === "AddBattlerTagAttr") {
        result.needsBase = true;
      }
      return result;
    }
    case "AddBattlerTagHeaderAttr":
      return partial(`행동 순서를 처리하기 전에 자신에게 ${battlerTagName(a.tagType)} 효과를 부여합니다.`);
    case "SemiInvulnerableAttr":
      return described(
        `준비 중 ${battlerTagName(a.tagType)} 상태가 되어 대부분의 공격을 피합니다. 해당 상태를 맞힐 수 있는 기술은 예외입니다.`,
      );
    case "HitsTagAttr":
    case "HitsTagForDoubleDamageAttr":
      return described(
        `${battlerTagName(a.tagType)} 상태의 대상도 맞힐 수 있습니다.${a.doubleDamage ? " 해당 상태의 대상에게 주는 피해는 2배입니다." : ""}`,
      );
    case "LapseBattlerTagAttr":
    case "RemoveBattlerTagAttr":
      return described(
        `${who}의 ${array(a.tagTypes).map(battlerTagName).join(" / ")} 효과를 ${kind === "LapseBattlerTagAttr" ? "종료 처리" : "제거"}합니다.`,
      );
    case "AddArenaTagAttr":
    case "AddArenaTrapTagAttr":
    case "AddArenaTrapTagHitAttr":
    case "ZMoveOnlyArenaTagAttr":
    case "AddPledgeEffectAttr": {
      const key = enumKey(ArenaTagType, a.tagType);
      const whole = WHOLE_FIELD_TAGS.has(key);
      const selfSide = a.selfSideTarget || [MoveTarget.USER, MoveTarget.USER_SIDE].includes(move.moveTarget);
      const side = whole ? "전장에" : selfSide ? "자신의 진영에" : "대상의 진영에";
      const duration = a.turnCount > 0 ? ` 기본 ${numberText(a.turnCount)}턴 동안 유지됩니다.` : "";
      const prefix =
        kind === "ZMoveOnlyArenaTagAttr"
          ? Z_PREFIX
          : kind === "AddPledgeEffectAttr"
            ? `${moveName(a.requiredPledge)}과 조합되면 `
            : "";
      const result = probabilistic(
        a,
        move,
        `${prefix}${side} ${arenaTagName(a.tagType)} 효과를 설치합니다.${duration}`,
        kind === "AddArenaTrapTagHitAttr" ? "normal" : "arena",
      );
      // 태그의 내부 피해율/층수별 변화는 arena-tag.ts에서 관리합니다.
      result.needsBase = true;
      return result;
    }
    case "RemoveArenaTagsAttr":
      return described(
        `${a.selfSideTarget ? "자신" : "대상"}의 진영에서 ${array(a.tagTypes).map(arenaTagName).join(" / ")} 효과를 제거합니다.`,
      );
    case "RemoveArenaTrapAttr":
      return described(`${a.targetBothSides ? "양쪽 진영" : "자신의 진영"}의 설치형 함정을 제거합니다.`);
    case "RemoveScreensAttr":
      return described(`${a.targetBothSides ? "양쪽 진영" : "대상의 진영"}의 방어 장벽을 제거합니다.`);
    case "SwapArenaTagsAttr":
      return described(`양쪽 진영의 ${array(a.SwapTags).map(arenaTagName).join(" / ")} 효과를 서로 바꿉니다.`);
    case "StealHeldItemChanceAttr":
      return described(`기본 ${numberText(a.chance)}% 확률로 대상의 옮길 수 있는 도구를 빼앗습니다.`);
    case "RemoveHeldItemAttr":
      return described(`대상이 지닌 ${a.berriesOnly ? "나무열매" : "제거 가능한 도구"}를 제거합니다.`);
    case "EatBerryAttr":
      return described(`${who}이 지닌 나무열매를 먹게 합니다.`);
    case "ForceSwitchOutAttr":
      return described(
        a.selfSwitch
          ? `기술 사용 후 자신을 다른 포켓몬과 교체합니다.${enumKey(SwitchType, a.switchType) === "BATON_PASS" ? " 인계 가능한 효과를 다음 포켓몬에게 넘깁니다." : ""}`
          : "대상을 강제로 교체시키거나 야생 전투를 종료합니다. 강제 교체가 금지된 대상에게는 적용되지 않습니다.",
      );
    case "RemoveTypeAttr":
      return described(`기술 사용 후 자신의 ${typeName(a.removedType)}타입을 잃습니다.`);
    case "ChangeTypeAttr":
      return described(`대상의 타입을 ${typeName(a.type)}타입으로 바꿉니다.`);
    case "AddTypeAttr":
      return described(`대상에게 ${typeName(a.type)}타입을 추가합니다.`);
    case "AbilityChangeAttr":
      return described(
        `${who}의 특성을 ${abilityName(a.ability)}(으)로 바꿉니다. 변경 불가 특성에는 적용되지 않습니다.`,
      );
    case "AbilityCopyAttr":
      return described(
        a.copyToPartner
          ? "자신과 같은 편이 대상의 특성을 복사합니다. 복사 불가 특성은 제외됩니다."
          : "대상의 특성을 자신에게 복사합니다. 복사 불가 특성은 제외됩니다.",
      );
    case "RandomMovesetMoveAttr":
      return described(
        `${a.includeParty ? "자신을 제외한 파티원들이 배운" : "자신이 배운"} 기술 중 호출 가능한 기술을 무작위로 사용합니다.`,
      );
    case "CopyMoveAttr":
      return described(
        a.mirrorMove
          ? "대상이 마지막으로 사용한 기술을 따라 합니다. 복사 불가 기술은 제외됩니다."
          : "전투에서 마지막으로 사용된 기술을 따라 합니다. 복사 불가 기술은 제외됩니다.",
      );
    case "ReducePpMoveAttr":
    case "AttackReducePpMoveAttr":
      return described(`대상이 마지막으로 사용한 기술의 PP를 ${numberText(a.reduction)} 줄입니다.`);
    case "BypassRedirectAttr":
      return described(
        a.abilitiesOnly
          ? "특성에 의한 공격 대상 변경을 무시합니다."
          : "공격 대상을 다른 포켓몬으로 돌리는 효과를 무시합니다.",
      );
    case "FollowAttackAttr":
      return partial(`연계 공격 효과에 ${numberText(a.multiplier)}배 배율을 적용합니다.`);
    case "AddBattlerTagIfBoostedAttr":
      return partial(`강화 조건을 만족하면 대상에게 ${battlerTagName(a.tagType)} 효과를 부여합니다.`);
    case "StatusIfBoostedAttr":
      return partial(`강화 조건을 만족하면 ${statusName(a.effect)} 상태이상을 부여합니다.`);
    case "MissEffectAttr":
    case "NoEffectAttr":
      return partial(); // crashDamageFunc 등은 실행하거나 문자열로 파싱하지 않습니다.
    case "VariableTargetAttr":
      return partial("조건에 따라 공격 대상 또는 공격 범위가 바뀝니다.");
    case "SecretPowerAttr":
      return probabilistic(a, move, "필드나 바이옴에 따라 상태이상 또는 능력치 변화 효과를 부여합니다.");
    case "NaturalGiftAttr":
      return partial(
        "예약된 나무열매 1스택을 소모하여 그 열매에 연결된 기술로 바꿔 사용합니다. 열매의 일반 섭취 효과는 발동하지 않습니다.",
      );
    case "PreUseInterruptAttr":
      return partial("사용 직전에 별도의 성공 조건을 확인합니다.");
    case "ZMoveAttr":
      return described("기술 사용 시 Z기술용 방어 관통 효과를 활성화합니다.");
    default: {
      const lines = SIMPLE_ATTR_LINES[kind];
      return lines ? { lines: [...lines], needsBase: PARTIAL_ATTRS.has(kind) } : partial();
    }
  }
}

function multiplierDescription(a: AttrData, move: MoveModule.Move): Result {
  const describeValue = (value: unknown, label: string): string =>
    typeof value === "number" && Number.isFinite(value)
      ? `${label} 위력 배율은 ${numberText(value)}배입니다.`
      : typeof value === "function"
        ? `${label} 조건에 따라 위력 배율이 달라집니다.`
        : `${label} 이 효과의 위력 배율은 1배입니다.`;
  const lines = [
    describeValue(a.basePowerMultiplier, "일반 상태에서"),
    describeValue(a.dynamaxPowerMultiplier, "다이맥스 상태에서"),
  ];
  const hint = POWER_CONDITIONS[moveKey(move)];
  if (hint && typeof a.basePowerMultiplier === "function") {
    lines[0] = `일반 상태에서 ${hint}`;
  }
  return {
    lines,
    needsBase: !hint && (typeof a.basePowerMultiplier === "function" || typeof a.dynamaxPowerMultiplier === "function"),
  };
}

function hasFlag(move: MoveModule.Move, name: string): boolean {
  const first = (MoveFlags as unknown as Record<string, unknown>)[name];
  const second = (MoveFlags2 as unknown as Record<string, unknown>)[name];
  const flag = first ?? second;
  return flag != null && move.hasFlag(flag as MoveFlags | MoveFlags2);
}

function enumKey(enumeration: object, value: unknown): string {
  if (value == null) {
    return "";
  }
  const table = enumeration as Record<string, string | number>;
  const reverse = table[String(value)];
  if (typeof reverse === "string" && /^[_A-Z0-9]+$/.test(reverse)) {
    return reverse;
  }
  if (typeof value === "string" && Object.prototype.hasOwnProperty.call(table, value)) {
    return value;
  }
  return Object.keys(table).find(key => !/^\d+$/.test(key) && table[key] === value) ?? "";
}

function translated(key: string, fallback: string): string {
  const text = i18next.t(key, { defaultValue: fallback });
  return typeof text === "string" && text && text !== key ? text : fallback;
}
function typeName(type: unknown): string {
  const key = enumKey(PokemonType, type);
  return translated(`pokemonInfo:type.${toCamelCase(key)}`, TYPE_NAMES[key] ?? "특수");
}
function statNames(stats: unknown): string {
  return (
    array(stats)
      .map(stat => {
        const fallback = STAT_NAMES[enumKey(Stat, stat)] ?? "특정";
        return typeof stat === "number" ? translated(getStatKey(stat as Stat), fallback) : fallback;
      })
      .join("·") || "특정"
  );
}
function statusName(value: unknown): string {
  return STATUS_NAMES[enumKey(StatusEffect, value)] ?? "특수 상태이상";
}
function weatherName(value: unknown): string {
  return WEATHER_NAMES[enumKey(WeatherType, value)] ?? "특수 날씨";
}
function terrainName(value: unknown): string {
  return TERRAIN_NAMES[enumKey(TerrainType, value)] ?? "특수 필드";
}
function battlerTagName(value: unknown): string {
  return BATTLER_TAG_NAMES[enumKey(BattlerTagType, value)] ?? "특수 상태 변화";
}
function arenaTagName(value: unknown): string {
  return ARENA_TAG_NAMES[enumKey(ArenaTagType, value)] ?? "특수 전장";
}
function targetName(value: unknown): string {
  return TARGET_NAMES[enumKey(MoveTarget, value)] ?? "특수 대상";
}
function moveKey(move: MoveModule.Move): string {
  return enumKey(MoveId, move.id);
}
function moveName(value: unknown): string {
  return translated(`move:${toCamelCase(enumKey(MoveId, value))}.name`, "지정된 기술");
}
function abilityName(value: unknown): string {
  return translated(`ability:${toCamelCase(enumKey(AbilityId, value))}.name`, "지정된 특성");
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}
function numberText(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(Math.round(value * 10000) / 10000) : "미정";
}
function rankChange(stages: number): string {
  if (stages >= 12) {
    return "랭크를 최대(+6)까지 올립니다.";
  }
  if (stages <= -12) {
    return "랭크를 최저(−6)까지 내립니다.";
  }
  if (stages === 0) {
    return "랭크 변화량은 0입니다.";
  }
  return `능력치가 ${numberText(Math.abs(stages))}랭크 ${stages > 0 ? "상승" : "하락"}합니다.`;
}
function ratioText(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "정해진 비율";
  }
  // 0.33을 1/3으로 바꾸면 실제 설정과 달라지므로 정확히 같은 비율만 분수로 표시합니다.
  for (const [n, d] of [
    [1, 2],
    [1, 3],
    [2, 3],
    [1, 4],
    [3, 4],
    [1, 8],
    [1, 16],
  ]) {
    if (Math.abs(value - n / d) < 1e-9) {
      return `${n}/${d}`;
    }
  }
  return `${numberText(value * 100)}%`;
}
function turnRange(a: AttrData): string {
  const min = a.turnCountMin;
  const max = a.turnCountMax ?? min;
  return min === max ? `${numberText(min)}턴` : `${numberText(min)}~${numberText(max)}턴`;
}
function cleanBaseDescription(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const text = value.trim();
  if (!text || /^move:[\w.]+(?:\s*\([NPE]\))?$/.test(text)) {
    return "";
  }
  return text;
}
function bullets(lines: readonly string[]): string[] {
  return [...new Set(lines.map(line => line.replace(/^\s*•\s*/, "").trim()).filter(Boolean))].map(line => `• ${line}`);
}

const Z_PREFIX = "[Z링 또는 Z파워링 보유 시] ";
const CATEGORY_NAMES: Record<string, string> = { PHYSICAL: "물리", SPECIAL: "특수", STATUS: "변화" };
const STAT_NAMES: Record<string, string> = {
  HP: "HP",
  ATK: "공격",
  DEF: "방어",
  SPATK: "특수공격",
  SPDEF: "특수방어",
  SPD: "스피드",
  ACC: "명중률",
  EVA: "회피율",
  RAND: "무작위 능력치",
};
const TYPE_NAMES: Record<string, string> = {
  NORMAL: "노말",
  FIRE: "불꽃",
  WATER: "물",
  ELECTRIC: "전기",
  GRASS: "풀",
  ICE: "얼음",
  FIGHTING: "격투",
  POISON: "독",
  GROUND: "땅",
  FLYING: "비행",
  PSYCHIC: "에스퍼",
  BUG: "벌레",
  ROCK: "바위",
  GHOST: "고스트",
  DRAGON: "드래곤",
  DARK: "악",
  STEEL: "강철",
  FAIRY: "페어리",
  STELLAR: "스텔라",
  MYSTERY: "미스터리",
};
const STATUS_NAMES: Record<string, string> = {
  NONE: "상태이상 없음",
  PARALYSIS: "마비",
  POISON: "독",
  TOXIC: "맹독",
  BURN: "화상",
  SLEEP: "잠듦",
  FREEZE: "얼음",
  FROSTBITE: "동상",
  FAINT: "기절",
};
const WEATHER_NAMES: Record<string, string> = {
  NONE: "날씨 없음",
  SUNNY: "쾌청",
  HARSH_SUN: "강한 햇살",
  RAIN: "비",
  HEAVY_RAIN: "폭우",
  SANDSTORM: "모래바람",
  HAIL: "싸라기눈",
  SNOW: "설경",
  FOG: "안개",
  STRONG_WINDS: "난기류",
};
const TERRAIN_NAMES: Record<string, string> = {
  NONE: "필드가 없는 상태",
  ELECTRIC: "일렉트릭필드",
  GRASSY: "그래스필드",
  MISTY: "미스트필드",
  PSYCHIC: "사이코필드",
};
const TARGET_NAMES: Record<string, string> = {
  USER: "자신",
  NEAR_OTHER: "인접한 다른 포켓몬 1마리",
  NEAR_ENEMY: "인접한 상대 1마리",
  NEAR_ALLY: "인접한 같은 편 1마리",
  ALLY: "같은 편 1마리",
  USER_OR_NEAR_ALLY: "자신 또는 인접한 같은 편",
  RANDOM_NEAR_ENEMY: "인접한 상대 중 무작위 1마리",
  ALL_NEAR_ENEMIES: "인접한 상대 전체",
  ALL_ENEMIES: "상대 전체",
  ALL_NEAR_OTHERS: "자신을 제외한 인접 포켓몬 전체(같은 편 포함)",
  ALL_OTHERS: "자신을 제외한 전체(같은 편 포함)",
  USER_AND_ALLIES: "자신과 같은 편 전체",
  ALL: "필드의 모든 포켓몬",
  USER_SIDE: "자신의 진영",
  ENEMY_SIDE: "상대 진영",
  BOTH_SIDES: "양쪽 진영",
  PARTY: "자신의 파티",
  ATTACKER: "자신을 공격한 포켓몬",
  CURSE: "자신의 타입에 따라 변경",
};
const FLAG_NAMES: Record<string, string> = {
  MAKES_CONTACT: "접촉",
  SOUND_BASED: "소리",
  PUNCHING_MOVE: "펀치",
  BITING_MOVE: "물기",
  PULSE_MOVE: "파동",
  SLICING_MOVE: "베기",
  RECKLESS_MOVE: "반동",
  BALLBOMB_MOVE: "구슬/폭탄",
  POWDER_MOVE: "가루",
  DANCE_MOVE: "춤",
  WIND_MOVE: "바람",
  TRIAGE_MOVE: "회복 우선도 보정 대상",
  HEAD_MOVE: "박치기",
  BEAM_MOVE: "광선",
  ARROW_MOVE: "화살",
  HORN_MOVE: "뿔",
  KICK_MOVE: "킥",
  BOOMERANG_MOVE: "부메랑",
  SPEAR_MOVE: "창",
  WING_MOVE: "날개",
  HAMMER_MOVE: "해머",
  CLAW_MOVE: "발톱",
  PINCH_MOVE: "집게",
  BEAK_MOVE: "부리",
  DASH_MOVE: "대시",
  SPIN_MOVE: "스핀",
  DRILL_MOVE: "드릴",
  WHIP_MOVE: "휩",
  WHEEL_MOVE: "바퀴",
  THROW_MOVE: "던지기",
  LIGHT_MOVE: "빛",
  TAIL_MOVE: "꼬리",
  ROPE_MOVE: "밧줄",
};
const FLAG_EFFECTS: Record<string, string> = {
  IGNORE_PROTECT: "방어 계열 효과를 무시하도록 설정된 기술입니다.",
  IGNORE_SUBSTITUTE: "대상의 대타출동을 무시합니다.",
  IGNORE_ABILITIES: "대상의 방어용 특성을 무시하도록 설정된 기술입니다.",
  IGNORE_MAX_GUARD: "다이월을 무시하도록 설정된 기술입니다.",
  IGNORE_Z_PROTECT: "Z기술용 방어 관통 판정을 사용합니다.",
  CHECK_ALL_HITS: "연속 공격의 각 타격마다 명중 여부를 판정합니다.",
  REFLECTABLE: "매직코트 등 기술 반사 효과의 대상이 됩니다.",
  POWDER_MOVE: "풀타입이나 가루 기술 면역 효과가 있는 대상에게는 막힐 수 있습니다.",
};

const IGNORED_ATTRS = new Set([
  "MoveAttr",
  "MoveEffectAttr",
  "MoveHeaderAttr",
  "MessageHeaderAttr",
  "MessageAttr",
  "PreMoveMessageAttr",
  "VariablePowerAttr",
  "VariableAccuracyAttr",
  "VariableMoveCategoryAttr",
  "VariableMoveTypeAttr",
  "VariableAtkAttr",
  "VariableDefAttr",
  "VariableMoveTypeMultiplierAttr",
  "VariableMoveTypeChartAttr",
  "ModifiedDamageAttr",
  "StatChangeBeforeDmgCalcAttr",
  "ChangeMultiHitTypeAttr",
  "OverrideMoveEffectAttr",
  "CounterRedirectAttr",
  "BideRedirectAttr",
  "RolloutProgressAttr",
  "FlingConsumeAttr",
  "GiftPassPrepareAttr",
]);

const WHOLE_FIELD_TAGS = new Set(["GRAVITY", "TRICK_ROOM", "MAGIC_ROOM", "WONDER_ROOM", "ION_DELUGE", "FAIRY_LOCK"]);

const ARENA_TAG_NAMES: Record<string, string> = {
  GRAVITY: "중력",
  WATER_FIRE_PLEDGE: "물·불꽃의서약 조합",
  GRASS_WATER_PLEDGE: "풀·물의서약 조합",
  FIRE_GRASS_PLEDGE: "불꽃·풀의서약 조합",
  REFLECT: "리플렉터",
  LIGHT_SCREEN: "빛의장막",
  AURORA_VEIL: "오로라베일",
  MARINE_BARRIER: "마린배리어",
  SAND_BARRIER: "샌드배리어",
  FLORA_VEIL: "플로라베일",
  SPIKES: "압정뿌리기",
  TOXIC_SPIKES: "독압정",
  STEALTH_ROCK: "스텔스록",
  ICE_SPIKE: "얼음압정",
  METAL_SPIKE: "금속압정",
  STICKY_WEB: "끈적끈적네트",
  MIST: "흰안개",
  SAFEGUARD: "신비의부적",
  IMPRISON: "봉인",
  MUD_SPORT: "흙놀이",
  WATER_SPORT: "물놀이",
  QUICK_GUARD: "퍼스트가드",
  WIDE_GUARD: "와이드가드",
  MAT_BLOCK: "마룻바닥세워막기",
  CRAFTY_SHIELD: "트릭가드",
  TAILWIND: "순풍",
  TRICK_ROOM: "트릭룸",
  WONDER_ROOM: "원더룸",
  MAGIC_ROOM: "매직룸",
  ION_DELUGE: "플라스마샤워",
  FAIRY_LOCK: "페어리록",
  HAPPY_HOUR: "해피타임",
  G_MAX_STEELSURGE: "거다이강철진",
  RIPTIDE: "급류 장판",
};

const BATTLER_TAG_NAMES: Record<string, string> = {
  SUBSTITUTE: "대타출동",
  MAGIC_COAT: "매직코트",
  COMMANDED: "사령탑",
  FRENZY: "난동",
  PROTECTED: "방어",
  MAX_GUARD_PROTECTED: "다이월",
  BEAK_BLAST_CHARGING: "부리캐논 준비",
  BIDE: "참기",
  PSYCHO_SHIFT: "사이코시프트",
  BYPASS_SLEEP: "수면 중 행동",
  FLINCHED: "풀죽음",
  CRIT_BOOST: "급소율 상승",
  EMBARGO: "금제",
  MINIMIZED: "작아지기",
  IGNORE_FLYING: "비행 면역 해제",
  UPROAR: "소란",
  ROLLOUT: "구르기",
  DEFENSE_CURL: "웅크리기",
  SKY_DROP_LIFTED: "프리폴에 붙잡힘",
  RECHARGING: "반동 대기",
  PERISH_SONG: "멸망의노래",
  CONFUSED: "혼란",
  INFATUATED: "헤롱헤롱",
  NIGHTMARE: "악몽",
  DROWSY: "졸음",
  DISABLED: "사슬묶기",
  HEAL_BLOCK: "회복봉인",
  RECEIVE_DOUBLE_DAMAGE: "받는 피해 증가",
  SEEDED: "씨뿌리기",
  SALT_CURED: "소금절이",
  CURSED: "저주",
  TRAPPED: "교체·도주 제한",
  BIND: "조이기",
  WRAP: "김밥말이",
  FIRE_SPIN: "회오리불꽃",
  WHIRLPOOL: "바다회오리",
  CLAMP: "껍질끼우기",
  SAND_TOMB: "모래지옥",
  MAGMA_STORM: "마그마스톰",
  SNAP_TRAP: "집게덫",
  THUNDER_CAGE: "썬더프리즌",
  INFESTATION: "엉겨붙기",
  ENCORE: "앵콜",
  ALWAYS_GET_HIT: "피격 시 필중",
  INGRAIN: "뿌리박기",
  IGNORE_ACCURACY: "명중 판정 무시",
  AQUA_RING: "아쿠아링",
  FLYING: "공중",
  UNDERWATER: "물속",
  UNDERGROUND: "땅속",
  HIDDEN: "모습을 숨김",
  ALWAYS_CRIT: "확정 급소",
  GULP_MISSILE_ARROKUDA: "먹이 비축",
  GULP_MISSILE_PIKACHU: "피카츄 비축",
  CUSTOM_ME_FIRST_POWER: "선취 위력 증가",
  DESTINY_BOND: "길동무",
  IGNORE_GHOST: "고스트 면역 해제",
  SPLASH_Z_CRIT_BOOST: "Z 급소율 상승",
  Z_CENTER_OF_ATTENTION: "Z 주목",
  ENDURING: "버티기",
  STOCKPILING: "비축",
  TORMENT: "트집",
  CENTER_OF_ATTENTION: "주목",
  CHARGED: "충전",
  TAUNT: "도발",
  HELPING_HAND: "도우미",
  FLOATING: "부유",
  GRUDGE: "원념",
  SNATCH_READY: "가로채기 준비",
  ROOSTED: "날개쉬기",
  IGNORE_DARK: "악타입 면역 해제",
  POWER_TRICK: "파워트릭",
  AUTOTOMIZED: "바디퍼지",
  TELEKINESIS: "텔레키네시스",
  INTERRUPTED: "행동 방해",
  ELECTRIFIED: "송전",
  KINGS_SHIELD: "킹실드",
  SPIKY_SHIELD: "니들가드",
  POWDER: "분진",
  BANEFUL_BUNKER: "토치카",
  THROAT_CHOPPED: "소리 기술 봉쇄",
  BURNED_UP: "불꽃타입 상실",
  SHELL_TRAP: "트랩셸 준비",
  NO_RETREAT: "배수의진",
  TAR_SHOT: "타르샷",
  OCTOLOCK: "문어굳히기",
  OBSTRUCT: "블로킹",
  G_MAX_WILDFIRE_BURN: "거다이옥염",
  CRIT_STACKING_BOOST: "급소 강화 누적",
  G_MAX_VOLCALITH: "거다이분석",
  G_MAX_VINE_LASH: "거다이편달",
  G_MAX_CANNONADE: "거다이포격",
  SILK_TRAP: "스레드트랩",
  DOUBLE_SHOCKED: "전기타입 상실",
  SYRUP_BOMB: "시럽봄",
  BURNING_BULWARK: "화염의수호",
  DRAGON_CHEER: "드래곤옐",
  FROST_STORM: "서리 폭풍",
  ELECTRIC_STORM: "전기 폭풍",
  DRAGON_RISING: "드래곤 강화",
  WAVE_GUARD: "파도 방어",
  GRASS_BIND: "풀 속박",
  ROCK_CURSE: "바위 저주",
  COLD_CURSE: "냉기 저주",
  RUSTED_CURSE: "부식 저주",
  KNOWLEDGE_CURSE: "지식 저주",
  DROWNED_CURSE: "침수 저주",
  BEAST_STACK: "비스트 강화 누적",
};

// 아래 두 표는 전달받은 move.ts의 구현에 맞춘 보충 설명입니다.
// 함수로 저장된 효과의 조건은 실행 없이 자동 복원할 수 없으므로 별도로 관리합니다.
const POWER_CONDITIONS: Record<string, string> = {
  EARTHQUAKE: "그래스필드에서 지면에 있는 대상을 공격하면 이 효과의 위력 배율이 0.5배가 됩니다.",
  MAGNITUDE: "그래스필드에서 지면에 있는 대상을 공격하면 이 효과의 위력 배율이 0.5배가 됩니다.",
  BULLDOZE: "그래스필드에서 지면에 있는 대상을 공격하면 이 효과의 위력 배율이 0.5배가 됩니다.",
  FACADE: "자신이 화상·독·맹독·마비 상태이면 이 효과의 위력 배율이 2배가 됩니다.",
  SMELLING_SALTS: "대상이 마비 상태이면 이 효과의 위력 배율이 2배가 됩니다.",
  KNOCK_OFF: "대상이 옮길 수 있는 도구를 지녔다면 이 효과의 위력 배율이 1.5배가 됩니다.",
  WEATHER_BALL:
    "효과가 유효한 쾌청·비·폭우·모래바람·싸라기눈·설경·안개 또는 햇살 강화 조건에서 이 효과의 위력 배율이 2배가 됩니다.",
  WAKE_UP_SLAP: "대상이 잠들었거나 잠든 것으로 취급되는 조건이면 이 효과의 위력 배율이 2배가 됩니다.",
  BRINE: "대상의 HP가 절반 미만이면 이 효과의 위력 배율이 2배가 됩니다.",
  PAYBACK: "대상이 이미 행동했거나 볼 사용 명령이 있으면 이 효과의 위력 배율이 2배가 됩니다.",
  ASSURANCE: "대상이 이번 턴에 이미 피해를 받았다면 이 효과의 위력 배율이 2배가 됩니다.",
  VENOSHOCK: "대상이 독·맹독 상태이면 이 효과의 위력 배율이 2배가 됩니다.",
  HEX: "대상이 상태이상이거나 절대안깸 특성이면 이 효과의 위력 배율이 2배가 됩니다.",
  ACROBATICS: "옮길 수 있는 도구의 총 스택 수가 0이면 2배, 스택마다 0.2배씩 감소하며 최저 1배가 됩니다.",
  RETALIATE: "같은 편이 바로 전 턴에 기절했다면 이 효과의 위력 배율이 2배가 됩니다.",
  STOMPING_TANTRUM: "직전 기술이 빗나가거나 실패했다면 이 효과의 위력 배율이 2배가 됩니다.",
  DYNAMAX_CANNON:
    "대상 레벨이 현재 층의 최대 경험치 레벨을 초과하면 위력이 증가하며, 5% 이상 초과하면 이 효과의 위력 배율이 2배가 됩니다.",
  BOLT_BEAK: "대상이 아직 행동하지 않았다면 이 효과의 위력 배율이 2배가 됩니다.",
  FISHIOUS_REND: "대상이 아직 행동하지 않았다면 이 효과의 위력 배율이 2배가 됩니다.",
  GRAV_APPLE: "중력 상태이면 이 효과의 위력 배율이 1.5배가 됩니다.",
  EXPANDING_FORCE: "사이코필드에서 자신이 지면에 있으면 이 효과의 위력 배율이 1.5배가 됩니다.",
};

const MOVE_CONDITIONS: Record<string, readonly string[]> = {
  JUMP_KICK: ["공격이 빗나가거나 무효화되면 실패 반동 피해를 받을 수 있습니다."],
  HIGH_JUMP_KICK: ["공격이 빗나가거나 무효화되면 실패 반동 피해를 받을 수 있습니다."],
  FAKE_OUT: ["등장 직후 또는 새 웨이브 시작 직후의 첫 턴에만 성공합니다."],
  FIRST_IMPRESSION: ["등장 직후 또는 새 웨이브 시작 직후의 첫 턴에만 성공합니다."],
  UPPER_HAND: ["대상이 아직 행동하지 않았고 우선도가 양수인 공격 기술을 선택했을 때만 성공합니다."],
};

const PARTIAL_ATTRS = new Set([
  "BideStartAttr",
  "FlingPrepareAttr",
  "TrickSwapAttr",
  "RecycleAttr",
  "GiftPassApplyAttr",
  "EmbargoAttr",
  "CorrosiveGasAttr",
  "ConsecutiveUseDoublePowerAttr",
  "ConsecutiveUseMultiBasePowerAttr",
  "RageFistPowerAttr",
  "PresentPowerAttr",
  "WaterShurikenPowerAttr",
  "PositiveStatStagePowerAttr",
  "PunishmentPowerAttr",
  "SwallowHealAttr",
  "CombinedPledgePowerAttr",
  "RoundPowerAttr",
  "FormChangeItemTypeAttr",
  "TechnoBlastTypeAttr",
  "AuraWheelTypeAttr",
  "RagingBullTypeAttr",
  "IvyCudgelTypeAttr",
  "WeatherBallTypeAttr",
  "TerrainPulseTypeAttr",
  "FrenzyAttr",
  "UproarAttr",
  "RolloutAttr",
  "RolloutPowerAttr",
  "BeakBlastHeaderAttr",
  "RevivalBlessingAttr",
  "GulpMissileTagAttr",
  "ZCurseAttr",
  "MoneyAttr",
  "DestinyBondAttr",
]);

const SIMPLE_ATTR_LINES: Record<string, readonly string[]> = {
  RespectAttackTypeImmunityAttr: ["변화 기술이지만 공격 타입의 무효 상성을 판정합니다."],
  IgnoreOpponentStatStagesAttr: ["공격 시 상대의 능력치 랭크 변화를 무시합니다."],
  HighCritAttr: ["급소에 맞을 확률이 1단계 높습니다."],
  CritOnlyAttr: ["급소를 막는 효과가 없다면 반드시 급소에 맞습니다."],
  UserHpDamageAttr: ["자신의 현재 HP와 같은 양의 피해를 줍니다."],
  TargetHalfHpDamageAttr: ["대상의 현재 HP의 1/2만큼 피해를 줍니다."],
  MatchHpAttr: ["대상의 HP를 자신의 현재 HP와 같은 수치까지 낮춥니다. 자신의 HP가 더 높으면 실패합니다."],
  LevelDamageAttr: ["자신의 레벨과 같은 양의 고정 피해를 줍니다."],
  RandomLevelDamageAttr: ["자신의 레벨에 0.5~1.5배의 무작위 배율을 적용한 피해를 줍니다."],
  SurviveDamageAttr: ["이 기술의 피해로 대상의 HP가 1 미만이 되지 않습니다."],
  BideStartAttr: ["2턴 동안 참는 상태에 들어가며 다음 턴의 참기 행동이 자동으로 예약됩니다."],
  PartyStatusCureAttr: [
    "자신의 파티에 있는 포켓몬의 상태이상을 치료합니다. 필드의 같은 편은 면역 특성에 따라 제외될 수 있습니다.",
  ],
  FlameBurstAttr: ["대상의 같은 편에게 그 포켓몬 최대 HP의 1/16만큼 추가 피해를 줍니다. 간접 피해 면역은 적용됩니다."],
  PsychoShiftEffectAttr: ["자신의 상태이상을 대상에게 옮기고, 성공하면 자신의 상태이상을 치료합니다."],
  TrickSwapAttr: ["자신과 대상 사이에서 교환 가능한 도구를 서로 교환합니다."],
  RecycleAttr: ["사용한 도구의 기록을 바탕으로 재활용 가능한 도구를 복구합니다."],
  GiftPassApplyAttr: ["자신의 전달 가능한 도구를 대상에게 넘깁니다."],
  FlingPrepareAttr: ["지닌 도구를 던집니다. 선택된 도구에 따라 위력과 추가 효과가 달라집니다."],
  StealEatBerryAttr: ["대상의 나무열매를 빼앗아 자신이 먹습니다."],
  BypassSleepAttr: ["잠든 상태에서도 이 기술을 사용할 수 있습니다."],
  BypassBurnDamageReductionAttr: ["화상으로 인한 물리 기술 피해 감소를 무시합니다."],
  BypassFreezeDamageReductionAttr: ["얼음·동상 계열 상태의 기술 피해 감소를 무시하는 판정을 적용합니다."],
  ClearTerrainAttr: ["현재 전개된 필드를 해제합니다."],
  OneHitKOAttr: [
    "자신의 레벨이 대상 이상이고 일격필살 면역이 없다면 일격필살 판정을 시도합니다. 보스 면역 대상은 일격필살 효과가 적용되지 않습니다.",
  ],
  OneHitKOAccuracyAttr: [
    "대상 레벨이 더 높으면 명중률 0%. 그 외에는 30 + 100 × (1 − 대상 레벨 / 자신의 레벨)%이며 최대 100%입니다.",
  ],
  SheerColdAccuracyAttr: [
    "대상 레벨이 더 높으면 명중률 0%. 그 외에는 얼음타입 사용자는 기본 30%, 나머지는 20%에 100 × (1 − 대상 레벨 / 자신의 레벨)%를 더합니다(최대 100%).",
  ],
  DelayedAttackAttr: ["대상의 자리에 지연 공격을 예약합니다. 사용 턴을 포함한 3턴 카운트 뒤 해당 자리를 공격합니다."],
  WishAttr: ["대상의 자리에 회복을 예약합니다. 사용 턴을 포함한 2턴 카운트 뒤 사용자 최대 HP의 1/2만큼 회복합니다."],
  AcupressureStatStageChangeAttr: ["무작위 능력치 하나를 2랭크 올립니다."],
  OrderUpStatBoostAttr: ["사령탑 효과와 함께 사용하면 싸리용의 폼에 따라 자신의 능력치가 상승합니다."],
  HpSplitAttr: ["자신과 대상의 현재 HP를 평균내어 나눕니다. 각자의 최대 HP는 넘지 않습니다."],
  LessPPMorePowerAttr: ["판정 시 남은 PP가 0/1/2/3/4 이상이면 위력은 각각 200/80/60/50/40입니다."],
  PursuitSwitchPowerMultiplierAttr: ["대상이 교체 중이면 이 효과의 위력 배율이 2배가 됩니다."],
  PursuitInterceptAttr: [
    "대상이 교체하기 직전에 먼저 공격하는 효과가 있으며, 해당 처리에서 위력이 2배, 우선도가 3 증가합니다.",
  ],
  BeatUpAttr: ["각 타격의 위력은 참여하는 파티원의 공격 종족값 / 10 + 5로 결정됩니다."],
  ConsecutiveUseDoublePowerAttr: ["연속 사용 횟수에 따라 위력이 1배, 2배, 4배…로 증가합니다."],
  ConsecutiveUseMultiBasePowerAttr: ["연속 사용 횟수에 따라 위력이 1배, 2배, 3배…로 증가합니다."],
  WeightPowerAttr: [
    "대상의 몸무게가 무거울수록 위력이 증가합니다(20/40/60/80/100/120). 경계 몸무게는 10/25/50/100/200kg입니다.",
  ],
  CompareWeightPowerAttr: ["대상보다 자신이 무거울수록 위력이 높아집니다(40~120)."],
  ElectroBallPowerAttr: ["자신이 대상보다 빠를수록 위력이 높아집니다(40/60/80/120/150)."],
  GyroBallPowerAttr: [
    "자신이 대상보다 느릴수록 위력이 높아집니다. 위력은 25 × 대상 스피드 / 자신의 스피드 + 1을 내림한 값이며 최대 150입니다.",
  ],
  LowHpPowerAttr: ["자신의 남은 HP 비율이 낮을수록 위력이 높아집니다(20/40/80/100/150/200)."],
  HpPowerAttr: ["위력은 150 × 자신의 남은 HP 비율로 결정됩니다."],
  TurnDamagedDoublePowerAttr: ["이번 턴에 이 기술의 대상으로부터 먼저 피해를 받았다면 위력이 2배가 됩니다."],
  MagnitudePowerAttr: ["무작위 규모에 따라 위력이 10/30/50/70/90/100/110 중 하나로 결정됩니다."],
  AntiSunlightPowerDecreaseAttr: [
    "비·폭우·모래바람·싸라기눈·설경·안개에서는 위력이 0.5배가 됩니다. 햇살 강화 조건에서는 이 감소를 받지 않습니다.",
  ],
  RageFistPowerAttr: ["공격을 받은 횟수가 많을수록 위력이 높아집니다."],
  EmbargoAttr: ["대상에게 금제를 적용하여 도구 효과를 제한합니다."],
  CorrosiveGasAttr: ["대상의 도구를 부식시키는 효과를 적용합니다."],
  SideChangeAttr: ["자신과 같은 편의 필드 위치를 바꿉니다."],
  PositiveStatStagePowerAttr: ["자신에게 쌓인 양수 능력치 랭크가 많을수록 위력이 높아집니다."],
  PunishmentPowerAttr: ["대상에게 쌓인 양수 능력치 랭크가 많을수록 위력이 높아집니다."],
  PresentPowerAttr: ["무작위로 위력이 달라지거나 대상을 회복시킵니다."],
  WaterShurikenPowerAttr: ["유대변화 개굴닌자의 지정된 폼에서는 위력이 달라집니다."],
  WaterShurikenMultiHitTypeAttr: ["유대변화 개굴닌자의 지정된 폼에서는 3회 공격합니다."],
  SwallowHealAttr: ["비축 횟수에 따라 HP를 회복합니다."],
  AwaitCombinedPledgeAttr: ["같은 편이 다른 서약 기술을 사용하면 합동 공격을 위해 행동을 기다릴 수 있습니다."],
  CombinedPledgePowerAttr: ["다른 서약 기술과 합동 공격하면 위력이 증가합니다."],
  CombinedPledgeStabBoostAttr: ["합동 서약 공격에 타입 일치 보정을 적용합니다."],
  CombinedPledgeTypeAttr: ["합동 서약 공격에서는 조합에 따라 공격 타입이 결정됩니다."],
  RoundPowerAttr: ["같은 턴에 돌림노래가 이어지면 위력이 증가합니다."],
  CueNextRoundAttr: ["같은 편의 돌림노래가 이어서 사용되도록 행동 순서를 조정합니다."],
  SpectralThiefAttr: ["피해를 계산하기 전에 대상의 상승한 능력치 랭크를 빼앗습니다."],
  TargetAtkUserAtkAttr: ["자신의 공격 대신 대상의 공격 능력치를 사용하여 피해를 계산합니다."],
  DefAtkAttr: ["자신의 공격 대신 자신의 방어 능력치를 사용하여 피해를 계산합니다."],
  SpdefSpatkAttr: ["자신의 특수공격 대신 자신의 특수방어 능력치를 사용하여 피해를 계산합니다."],
  DefOrSpdefAtkAttr: ["자신의 방어와 특수방어를 비교하여 공격에 사용할 능력치를 결정합니다."],
  DefDefAttr: ["대상의 특수방어 대신 방어 능력치를 사용하여 피해를 계산합니다."],
  ThunderAccuracyAttr: ["비·폭우에서는 필중이며, 햇살 강화 조건에서는 기본 명중률이 50%가 됩니다."],
  StormAccuracyAttr: ["효과가 유효한 비·폭우에서는 필중입니다."],
  ColdLightningAccuracyAttr: ["햇살 강화 조건에서는 필중입니다."],
  VolcanicBoltAccuracyAttr: ["햇살 강화 조건에서는 필중입니다."],
  SandTornadoAccuracyAttr: ["효과가 유효한 모래바람에서는 필중입니다."],
  AlwaysHitMinimizeAttr: ["작아지기 상태의 대상에게는 필중입니다."],
  ToxicAccuracyAttr: ["독타입 포켓몬이 사용하면 필중입니다."],
  BlizzardAccuracyAttr: ["효과가 유효한 싸라기눈·설경에서는 필중입니다."],
  SplashZBoostAccuracyAttr: [`${Z_PREFIX}필중입니다.`],
  PhotonGeyserCategoryAttr: ["자신의 공격과 특수공격을 비교하여 물리/특수 분류를 결정합니다."],
  DefOrSpdefCategoryAttr: ["자신의 방어와 특수방어를 비교하여 물리/특수 분류를 결정합니다."],
  TeraMoveCategoryAttr: ["테라스탈 상태에서는 자신의 공격과 특수공격을 비교하여 물리/특수 분류를 결정합니다."],
  TeraBlastPowerAttr: ["스텔라 테라스탈 상태에서는 위력이 100으로 바뀝니다."],
  StatusCategoryOnAllyAttr: ["같은 편을 대상으로 하면 변화 기술로 처리됩니다."],
  ShellSideArmCategoryAttr: ["자신과 대상의 능력치를 비교하여 더 유리한 물리/특수 분류를 결정합니다."],
  FormChangeItemTypeAttr: ["지닌 폼 변화 도구에 따라 기술 타입이 바뀝니다."],
  TechnoBlastTypeAttr: ["지닌 카세트에 따라 기술 타입이 바뀝니다."],
  AuraWheelTypeAttr: ["자신의 폼에 따라 기술 타입이 바뀝니다."],
  RagingBullTypeAttr: ["켄타로스의 폼에 따라 기술 타입이 바뀝니다."],
  IvyCudgelTypeAttr: ["오거폰의 폼에 따라 기술 타입이 바뀝니다."],
  WeatherBallTypeAttr: ["효과가 유효한 날씨에 따라 기술 타입이 바뀝니다."],
  TerrainPulseTypeAttr: ["자신이 지면에 있으면 현재 필드에 따라 기술 타입이 바뀝니다."],
  HiddenPowerTypeAttr: ["자신의 개체값을 바탕으로 기술 타입이 결정됩니다."],
  TeraBlastTypeAttr: ["테라스탈 상태에서는 자신의 테라스타입으로 기술 타입이 바뀝니다."],
  TeraStarstormTypeAttr: ["테라파고스의 지정된 폼에서는 기술 타입이 스텔라로 바뀝니다."],
  MatchUserTypeAttr: ["자신의 타입에 맞춰 기술 타입이 바뀝니다."],
  NeutralDamageAgainstFlyingTypeMultiplierAttr: ["비행타입의 타입 상성 무효를 해제하는 판정을 적용합니다."],
  NeutralDamageAgainstDarkTypeMultiplierAttr: ["악타입의 타입 상성 무효를 해제하는 판정을 적용합니다."],
  NeutralDamageAgainstFairyTypeMultiplierAttr: ["페어리타입의 타입 상성 무효를 해제하는 판정을 적용합니다."],
  NeutralDamageAgainstGroundTypeMultiplierAttr: ["땅타입의 타입 상성 무효를 해제하는 판정을 적용합니다."],
  IceNoEffectTypeAttr: ["얼음타입 대상에게는 효과가 없습니다."],
  WaterNoEffectTypeAttr: ["물타입 대상에게는 효과가 없습니다."],
  FlyingTypeMultiplierAttr: ["비행타입의 상성을 추가로 반영하여 피해를 계산합니다."],
  DragonTypeMultiplierAttr: ["드래곤타입의 상성을 추가로 반영하여 피해를 계산합니다."],
  FreezeDryAttr: ["물타입을 효과가 굉장한 상성으로 판정합니다."],
  TypelessAttr: ["타입이 없는 공격으로 처리하는 효과를 적용합니다."],
  FrenzyAttr: ["여러 턴 동안 같은 기술을 계속 사용하는 난동 상태에 들어갑니다."],
  UproarAttr: ["여러 턴 동안 소란을 피우는 상태에 들어갑니다."],
  RolloutAttr: ["연속으로 구르기 계열 기술을 사용하는 상태에 들어갑니다."],
  RolloutPowerAttr: ["구르기 연속 사용 및 웅크리기 효과에 따라 위력이 증가합니다."],
  DefenseCurlAttr: ["웅크리기 효과를 남겨 구르기 계열 기술의 위력을 강화합니다."],
  SkyDropLiftTargetAttr: ["대상을 공중에 붙잡아 두는 프리폴 효과를 적용합니다."],
  BeakBlastHeaderAttr: ["행동하기 전부터 부리캐논 준비 상태가 됩니다."],
  GulpMissileTagAttr: ["윽우지의 먹이 비축 상태를 갱신합니다."],
  JawLockAttr: ["자신과 대상 모두에게 교체·도주 제한 상태를 적용합니다."],
  CurseAttr: [
    "Z링·Z파워링이 없을 때: 고스트타입이면 최대 HP의 1/2을 소모해 대상을 저주합니다. 그 외에는 자신의 공격·방어 +1랭크, 스피드 −1랭크.",
  ],
  ZCurseAttr: [
    `${Z_PREFIX}고스트타입이면 대상을 저주하고 자신의 HP를 전부 회복합니다. 그 외에는 공격·방어·특수공격·특수방어 +2랭크, 스피드 −2랭크.`,
  ],
  RemoveAllSubstitutesAttr: ["필드에 있는 대타출동을 제거합니다."],
  RevivalBlessingAttr: ["기절한 파티원 1마리를 부활시킵니다."],
  ChillyReceptionAttr: ["설경을 전개한 뒤 자신을 교체합니다."],
  CopyTypeAttr: ["대상의 타입을 복사하여 자신의 타입을 바꿉니다."],
  CopyBiomeTypeAttr: ["현재 바이옴에 따라 자신의 타입을 바꿉니다."],
  FirstMoveTypeAttr: ["자신이 배운 첫 번째 기술의 타입으로 자신의 타입을 바꿉니다."],
  RandomMoveAttr: ["호출 가능한 기술 중 하나를 무작위로 사용합니다."],
  NaturePowerAttr: ["바이옴이나 필드에 따라 정해진 기술로 공격합니다."],
  MeFirstAttr: ["대상보다 먼저 행동해 대상이 사용하려는 공격 기술을 복사하고 강화하여 사용합니다."],
  RepeatMoveAttr: ["대상이 마지막으로 사용한 기술을 다시 사용하게 합니다. 재사용 불가 기술은 제외됩니다."],
  MovesetCopyMoveAttr: ["대상이 사용한 기술을 자신의 기술 목록에 일시적으로 복사합니다."],
  SketchAttr: ["대상이 사용한 복사 가능한 기술을 자신의 기술로 배웁니다."],
  AbilityGiveAttr: ["자신의 특성을 대상에게 넘깁니다. 변경 불가 특성에는 적용되지 않습니다."],
  SwitchAbilitiesAttr: ["자신과 대상의 특성을 서로 바꿉니다. 교환 불가 특성에는 적용되지 않습니다."],
  SuppressAbilitiesAttr: ["대상의 특성 효과를 억제합니다. 억제 불가 특성에는 적용되지 않습니다."],
  SuppressAbilitiesIfActedAttr: [
    "대상이 이번 턴에 이미 행동했다면 특성 억제 효과를 적용합니다. 억제 불가 특성은 제외됩니다.",
  ],
  GMaxSmashAttr: ["대상의 특성을 억제합니다. 억제 불가 또는 이미 억제된 특성은 건너뛰며 기술 자체는 계속 처리합니다."],
  TransformAttr: ["대상의 모습을 복사하여 변신합니다. 변신 불가 대상에는 적용되지 않습니다."],
  MoneyAttr: ["기술 사용으로 추가 돈을 얻는 효과를 적용합니다."],
  DestinyBondAttr: ["자신을 쓰러뜨린 상대를 함께 기절시키는 길동무 상태가 됩니다."],
  LastResortAttr: ["자신이 배운 다른 기술이 최소 1개 있고, 그 다른 기술들을 모두 한 번 이상 사용했을 때만 성공합니다."],
  AfterYouAttr: ["대상이 바로 다음에 행동하도록 행동 순서를 조정합니다."],
  ForceLastAttr: ["대상을 이번 턴의 마지막에 행동하도록 미룹니다."],
  HitsSameTypeAttr: ["자신과 같은 타입을 하나 이상 가진 대상에게만 효과가 있습니다."],
  ResistLastMoveTypeAttr: ["대상이 마지막으로 사용한 기술에 저항하는 타입으로 자신의 타입을 바꿉니다."],
};
