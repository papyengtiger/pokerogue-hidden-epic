/**
 * 공격형 아이템 효과만 추적하는 전투 1회용 집계기.
 * 별도의 상태 저장 없이 한 번의 getAttackDamage 안에서만 활성화됩니다.
 * 중요: 특성/랭크/자속/타입 상성은 기록하지 않습니다.
 */
import type { Pokemon } from "#field/pokemon";

type ItemOverloadState = { multiplier: number; breakdown: string[] };
const states = new WeakMap<Pokemon, ItemOverloadState>();

export function beginItemOverload(pokemon: Pokemon): void {
  states.set(pokemon, { multiplier: 1, breakdown: [] });
}

export function recordItemOverload(pokemon: Pokemon, before: number, after: number, label: string): void {
  const state = states.get(pokemon);
  // 0 이하, 감소, NaN 및 Infinity는 공격용 증폭으로 집계하지 않습니다.
  if (!state || !(before > 0) || !(after > before) || !Number.isFinite(after)) {
    return;
  }
  const factor = after / before;
  state.multiplier *= factor;
  state.breakdown.push(`${label}: x${factor.toFixed(3)}`);
}

export function finishItemOverload(pokemon: Pokemon, damage: number, cap: number, debug = false): number {
  const state = states.get(pokemon);
  states.delete(pokemon);
  if (!state || !(damage > 0) || !Number.isFinite(damage)) {
    return damage;
  }
  const multiplier = state.multiplier;
  if (!(multiplier > cap)) {
    return damage;
  }
  const corrected = Math.max(1, Math.floor((damage * cap) / multiplier));
  if (debug) {
    console.info("[ITEM_OVERLOAD]", {
      pokemon: pokemon.name,
      cap,
      multiplier,
      originalDamage: damage,
      correctedDamage: corrected,
      factors: state.breakdown,
    });
  }
  return corrected;
}
