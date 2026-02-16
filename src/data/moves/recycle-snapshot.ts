import { Pokemon } from "#app/field/pokemon";
import { PokemonHeldItemModifier } from "#modifiers/modifier";

export type RecycleSnapshot = {
  typeId: any;
  args?: any[];
};

export function recordRecycleSnapshot(
  pokemon: Pokemon,
  item: any, // PokemonHeldItemModifier 계열
  extra?: { args?: any[] },
) {
  pokemon.tempSummonData ??= new PokemonTempSummonData();

  // PokemonHeldItemModifier라면 보통 pokemonId/stackCount가 존재
  const pokemonId = (item as any).pokemonId ?? pokemon.id;
  const stackCount = (item as any).stackCount ?? 1;

  pokemon.tempSummonData.lastConsumedHeldItem = {
    typeId: item.type.id,
    // ✅ 복원에 필요한 기본 인자(포켓몬 귀속 + 스택) + 추가 args(베리타입 등)
    args: [pokemonId, stackCount, ...(extra?.args ?? [])],
  };
}

