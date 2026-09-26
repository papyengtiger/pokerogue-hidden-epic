import { MoveId } from "#enums/move-id";
import type { Pokemon } from "#field/pokemon";
import { applyMoveAttrs } from "#moves/apply-attrs";
import type { PokemonMove } from "#moves/pokemon-move";
import { BattlePhase } from "#phases/battle-phase";

export class MoveHeaderPhase extends BattlePhase {
  public readonly phaseName = "MoveHeaderPhase";
  public pokemon: Pokemon;
  public move: PokemonMove;

  constructor(pokemon: Pokemon, move: PokemonMove) {
    super();

    this.pokemon = pokemon;
    this.move = move;
  }

  canMove(): boolean {
    if (!this.pokemon.isActive(true) || !this.move.isUsable(this.pokemon)) {
      return false;
    }

    if (this.move.moveId === MoveId.FOCUS_PUNCH && this.pokemon.turnData.attacksReceived?.some(r => r.damage > 0)) {
      return false;
    }

    return true;
  }

  start() {
    super.start();

    if (this.canMove()) {
      applyMoveAttrs("MoveHeaderAttr", this.pokemon, null, this.move.getMove());
    }
    this.end();
  }
}
