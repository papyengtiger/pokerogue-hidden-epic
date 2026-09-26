import { globalScene } from "#app/global-scene";
import { BattlerIndex } from "#enums/battler-index";
import type { Pokemon } from "#field/pokemon";
import { FieldPhase } from "#phases/field-phase";

export abstract class PokemonPhase extends FieldPhase {
  /**
   * The battler index this phase refers to, or the pokemon ID if greater than 3.
   * TODO: Make this either use IDs or `BattlerIndex`es, not a weird mix of both
   */
  protected battlerIndex: BattlerIndex | number;
  public player: boolean;
  public fieldIndex: number;

  constructor(battlerIndex?: BattlerIndex | number) {
    super();

    battlerIndex =
      battlerIndex
      ?? globalScene
        .getField()
        .find(p => p?.isActive())
        ?.getBattlerIndex();
    if (battlerIndex === undefined) {
      // TODO: figure out a suitable fallback behavior
      console.warn("There are no Pokemon on the field!");
      battlerIndex = BattlerIndex.PLAYER;
    }

    this.battlerIndex = battlerIndex;
    this.player = battlerIndex < 2;
    this.fieldIndex = battlerIndex % 2;
  }

  getPokemon(): Pokemon {
    // Pokémon ID가 직접 전달된 경우
    if (this.battlerIndex > BattlerIndex.ENEMY_2) {
      return globalScene.getPokemonById(this.battlerIndex)!;
    }

    const field = globalScene.getField();

    // 기존 방식
    const directPokemon = field[this.battlerIndex];
    if (directPokemon) {
      return directPokemon;
    }

    // ✅ 소굴 / 복원전 등에서 field 배열 위치와 battlerIndex가
    // 일치하지 않는 경우 실제 battlerIndex로 재탐색
    const matchedPokemon = field.find(p => p?.getBattlerIndex?.() === this.battlerIndex);

    if (matchedPokemon) {
      console.debug("[POKEMON_PHASE_BATTLER_FALLBACK]", {
        battlerIndex: this.battlerIndex,
        pokemonId: matchedPokemon.id,
        pokemonName: matchedPokemon.name,
      });

      return matchedPokemon;
    }

    console.error("[POKEMON_PHASE_POKEMON_NOT_FOUND]", {
      battlerIndex: this.battlerIndex,
      field: field.map(p =>
        p
          ? {
              id: p.id,
              name: p.name,
              battlerIndex: p.getBattlerIndex?.(),
            }
          : null,
      ),
    });

    return undefined!;
  }
}
