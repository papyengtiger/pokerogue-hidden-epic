import { globalScene } from "#app/global-scene";
import { FieldPosition } from "#enums/field-position";
import { BattlePhase } from "#phases/battle-phase";

export class ToggleDoublePositionPhase extends BattlePhase {
  public readonly phaseName = "ToggleDoublePositionPhase";
  private double: boolean;

  constructor(double: boolean) {
    super();

    this.double = double;
  }

  start() {
  super.start();

  const playerPokemon = globalScene
    .getPlayerField()
    .find(p => p.isActive(true));

  const hasCompanion =
  !!globalScene.currentBattle.companionTrainer
  && globalScene
    .getCompanionParty()
    .some(p => p.isAllowedInBattle());

  if (playerPokemon) {
    playerPokemon
      .setFieldPosition(
        this.double
          && (
            hasCompanion
            || globalScene.getPokemonAllowedInBattle().length > 1
          )
          ? FieldPosition.LEFT
          : FieldPosition.CENTER,
        500,
      )
      .then(() => {
        if (playerPokemon.getFieldIndex() === 1) {
          const party = globalScene.getPlayerParty();
          party[1] = party[0];
          party[0] = playerPokemon;
        }

        this.end();
      });
  } else {
    this.end();
  }
}
}
