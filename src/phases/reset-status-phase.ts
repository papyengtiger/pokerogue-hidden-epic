import { globalScene } from "#app/global-scene";
import type { Pokemon } from "#field/pokemon";
import { BattlePhase } from "#phases/battle-phase";

export class ResetStatusPhase extends BattlePhase {
  public readonly phaseName = "ResetStatusPhase";

  private readonly pokemon: Pokemon;
  private readonly affectConfusion: boolean;
  private readonly reloadAssets: boolean;

  constructor(
    pokemon: Pokemon,
    affectConfusion: boolean,
    reloadAssets: boolean,
  ) {
    super();

    this.pokemon = pokemon;
    this.affectConfusion = affectConfusion;
    this.reloadAssets = reloadAssets;
  }

  public override start() {
    const pokemon = this.pokemon;

    const clear = () => {
      pokemon.clearStatus(
        this.affectConfusion,
        this.reloadAssets,
      );

      this.end();
    };

    const isCompanionPokemon =
      pokemon.isPlayer()
      && globalScene
        .getCompanionParty()
        .some(p => p.id === pokemon.id);

    if (
      isCompanionPokemon
      && !pokemon.isOnField()
    ) {
      pokemon.loadAssets(false).then(() => {
        console.log(
          "[COMPANION_RESET_STATUS_ASSETS_LOADED]",
          {
            pokemon: pokemon.getName(),
          },
        );

        clear();
      });

      return;
    }

    clear();
  }
}