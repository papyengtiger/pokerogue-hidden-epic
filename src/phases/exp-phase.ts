import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { ExpBoosterModifier } from "#modifiers/modifier";
import { PlayerPartyMemberPokemonPhase } from "#phases/player-party-member-pokemon-phase";
import { NumberHolder } from "#utils/common";
import { trainerCardManager } from "#system/trainer-card-manager";
import i18next from "i18next";

export class ExpPhase extends PlayerPartyMemberPokemonPhase {
  public readonly phaseName = "ExpPhase";

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

    if (
      (globalScene.currentBattle as any)?.isPracticeBattle
      && !globalScene.gameData.practiceDummyConfig?.rewardFlags?.exp
    ) {
      return this.end();
    }

    const pokemon = this.companion
      ? globalScene.getCompanionParty()[this.partyMemberIndex]
      : this.getPokemon();

    if (!pokemon) {
      this.end();
      return;
    }

    const exp = new NumberHolder(this.expValue);

    globalScene.applyModifiers(
  ExpBoosterModifier,
  true,
  exp,
);

// 트레이닝 카드: 동반성장
  const cardMultiplier = trainerCardManager.getMultiplier(
    "COMPANION_EXP",
  );

  if (cardMultiplier > 1) {
    const beforeExp = exp.value;

    exp.value *= cardMultiplier;

    console.log("[TRAINER_CARD_GROW_TOGETHER]", {
      pokemon: pokemon.name,
      beforeExp,
      cardMultiplier,
      afterExp: Math.floor(exp.value),
    });
  }

exp.value = Math.floor(exp.value);

    globalScene.ui.showText(
      i18next.t("battle:expGain", {
        pokemonName: getPokemonNameWithAffix(pokemon),
        exp: exp.value,
      }),
      null,
      () => {
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

        pokemon.updateInfo().then(() => this.end());
      },
      null,
      true,
    );
  }
}