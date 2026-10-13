import { globalScene } from "#app/global-scene";
import { ExpGainsSpeed } from "#enums/exp-gains-speed";
import { ExpNotification } from "#enums/exp-notification";
import { ExpBoosterModifier } from "#modifiers/modifier";
import { PlayerPartyMemberPokemonPhase } from "#phases/player-party-member-pokemon-phase";
import { NumberHolder } from "#utils/common";

export class ShowPartyExpBarPhase extends PlayerPartyMemberPokemonPhase {
  public readonly phaseName = "ShowPartyExpBarPhase";

  private expValue: number;
  private companion: boolean;

  constructor(
    partyMemberIndex: number,
    expValue: number,
    companion = false,
  ) {
    super(partyMemberIndex);

    this.expValue = expValue;
    this.companion = companion;
  }

  start() {
    super.start();

    const pokemon = this.companion
      ? globalScene.getCompanionParty()[this.partyMemberIndex]
      : this.getPokemon();

    if (!pokemon) {
      console.warn("[SHOW_PARTY_EXP_BAR_NO_POKEMON]", {
        partyMemberIndex: this.partyMemberIndex,
        companion: this.companion,
        playerPartyLength: globalScene.getPlayerParty().length,
        companionPartyLength: globalScene.getCompanionParty().length,
      });

      this.end();
      return;
    }

    const exp = new NumberHolder(this.expValue);

    globalScene.applyModifiers(
      ExpBoosterModifier,
      true,
      exp,
    );

    exp.value = Math.floor(exp.value);

    const lastLevel = pokemon.level;

    pokemon.addExp(exp.value);

    const newLevel = pokemon.level;

    if (newLevel > lastLevel) {
  globalScene.phaseManager.unshiftNew(
    "LevelUpPhase",
    this.partyMemberIndex,
    lastLevel,
    newLevel,
    this.companion,
  );
}

    globalScene.phaseManager.unshiftNew(
      "HidePartyExpBarPhase",
    );

    pokemon.updateInfo();

    if (globalScene.expParty === ExpNotification.SKIP) {
      this.end();
    } else if (
      globalScene.expParty === ExpNotification.ONLY_LEVEL_UP
    ) {
      if (newLevel > lastLevel) {
        globalScene.partyExpBar
          .showPokemonExp(
            pokemon,
            exp.value,
            true,
            newLevel,
          )
          .then(() => {
            setTimeout(
              () => this.end(),
              800 / Math.pow(2, globalScene.expGainsSpeed),
            );
          });
      } else {
        this.end();
      }
    } else if (
      globalScene.expGainsSpeed < ExpGainsSpeed.SKIP
    ) {
      globalScene.partyExpBar
        .showPokemonExp(
          pokemon,
          exp.value,
          false,
          newLevel,
        )
        .then(() => {
          setTimeout(
            () => this.end(),
            500 / Math.pow(2, globalScene.expGainsSpeed),
          );
        });
    } else {
      this.end();
    }
  }
}