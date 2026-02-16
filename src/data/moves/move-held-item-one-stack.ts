import { Pokemon } from "#app/field/pokemon";
import { PokemonHeldItemModifier } from "#modifiers/modifier";
import { globalScene } from "#app/global-scene";

export function isPlayerPokemon(p: Pokemon): boolean {
  return (
    globalScene.getPlayerParty().some(x => x.id === p.id) ||
    globalScene.getPlayerField().some(x => x?.id === p.id)
  );
}

/** 플레이어/적 modifiers 풀을 고려해서 "실제 지닌도구 modifier"를 가져옴 */
export function getHeldItemsSided(p: Pokemon): PokemonHeldItemModifier[] {
  const isPlayer = isPlayerPokemon(p);
  return globalScene.findModifiers(
    m => m instanceof PokemonHeldItemModifier && (m as any).pokemonId === p.id,
    isPlayer
  ) as PokemonHeldItemModifier[];
}

/** stale reference 방지: modifier 객체가 해당 소유자의 현재 풀에 실제로 존재하는지 */
export function hasModifierSided(owner: Pokemon, mod: PokemonHeldItemModifier): boolean {
  return getHeldItemsSided(owner).includes(mod);
}

// 기존 함수 (건드리지 마세요)
export function moveHeldItemOneStack(
  from: Pokemon,
  to: Pokemon,
  item: PokemonHeldItemModifier,
) {
  if (!item || item.pokemonId !== from.id) return;

  const stack = item.stackCount ?? 1;

  if (stack > 1) {
    item.stackCount -= 1;
    const newItem = item.clone?.() ?? new (item.constructor as any)(
      item.type,
      to.id,
      1,
      ...(item as any).args ?? [],
    );
    newItem.pokemonId = to.id;
    newItem.stackCount = 1;
    to.addHeldItem(newItem);
    return;
  }

  from.removeHeldItem(item);
  item.pokemonId = to.id;
  item.stackCount = 1;
  to.addHeldItem(item);
}

// (생략) moveHeldItemOneStack 동일

export async function moveHeldItemOneStack_Sided(
  from: Pokemon,
  to: Pokemon,
  item: PokemonHeldItemModifier,
) {
  if (!item) return;
  if ((item as any).pokemonId !== from.id) return;

  const fromIsPlayer = isPlayerPokemon(from);
  const toIsPlayer = isPlayerPokemon(to);

  const stack = (item as any).stackCount ?? 1;

  const makeOne = (): PokemonHeldItemModifier => {
    const one =
      item.clone?.() ??
      new (item.constructor as any)(
        item.type,
        to.id,
        1,
        ...((item as any).args ?? []),
      );

    (one as any).pokemonId = to.id;
    (one as any).stackCount = 1;
    return one;
  };

  // 1) from에서 1스택 제거
  if (stack > 1) {
    (item as any).stackCount = stack - 1;
    globalScene.updateModifiers(fromIsPlayer, true);
  } else {
    globalScene.removeModifier(item as any, !fromIsPlayer);
    globalScene.updateModifiers(fromIsPlayer, true);
  }

  // 2) to에 1스택 추가
  const oneItem = makeOne();

  if (toIsPlayer) {
    globalScene.addModifier(oneItem as any, false, false, false, true);
  } else {
    await globalScene.addEnemyModifier(oneItem as any, false, true);
  }

  // ✅ 보강: to쪽도 갱신
  globalScene.updateModifiers(toIsPlayer, true);

  globalScene.ui?.refreshModifierIcons?.();
}
