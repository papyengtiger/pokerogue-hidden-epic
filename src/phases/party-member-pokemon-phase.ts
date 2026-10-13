import { globalScene } from "#app/global-scene";
import type { Pokemon } from "#field/pokemon";
import { FieldPhase } from "#phases/field-phase";

export abstract class PartyMemberPokemonPhase extends FieldPhase {
  protected partyMemberIndex: number;
  protected fieldIndex: number;
  protected player: boolean;

  constructor(
  partyMemberIndex: number,
  player: boolean,
  fieldIndex?: number,
) {
  super();

  this.partyMemberIndex = partyMemberIndex;
  this.fieldIndex =
    fieldIndex
    ?? (partyMemberIndex < globalScene.currentBattle.getBattlerCount()
      ? partyMemberIndex
      : -1);

  this.player = player;
}

  getParty(): Pokemon[] {
  if (this.player) {
    const isCompanionSlot =
      this.fieldIndex === 1
      && !!globalScene.currentBattle?.companionTrainer
      && !!globalScene.getCompanionParty?.().length;

    if (isCompanionSlot) {
      return globalScene.getCompanionParty();
    }

    return globalScene.getPlayerParty();
  }

  return globalScene.getEnemyParty();
}

  getPokemon(): Pokemon {
    return this.getParty()[this.partyMemberIndex];
  }
}
