import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { ExpNotification } from "#enums/exp-notification";
import type { PlayerPokemon } from "#field/pokemon";
import { PlayerPartyMemberPokemonPhase } from "#phases/player-party-member-pokemon-phase";
import { LevelAchv } from "#system/achv";
import { NumberHolder } from "#utils/common";
import i18next from "i18next";
import { UiMode } from "#enums/ui-mode";
import {
  FusionSpeciesFormEvolution,
  pokemonEvolutions,
  pokemonPrevolutions,
  validateShedinjaEvo,
  levelUpAndEvolveTotallyRandom,
} from "#balance/pokemon-evolutions";
import { LearnMoveType } from "#enums/learn-move-type";

export class LevelUpPhase extends PlayerPartyMemberPokemonPhase {
  public readonly phaseName = "LevelUpPhase";

  protected lastLevel: number;
  protected level: number;

  private companion: boolean;
  protected pokemon: PlayerPokemon;

  constructor(
    partyMemberIndex: number,
    lastLevel: number,
    level: number,
    companion = false,
  ) {
    super(partyMemberIndex);

    this.lastLevel = lastLevel;
    this.level = level;
    this.companion = companion;

    const pokemon = companion
      ? globalScene.getCompanionParty()[partyMemberIndex]
      : this.getPlayerPokemon();

    if (!pokemon) {
      throw new Error(
        `[LEVEL_UP_NO_POKEMON] index=${partyMemberIndex} companion=${companion}`,
      );
    }

    this.pokemon = pokemon;
  }

  public override start() {
    super.start();

    if (this.level > globalScene.gameData.gameStats.highestLevel) {
      globalScene.gameData.gameStats.highestLevel =
        this.level;
    }

    globalScene.validateAchvs(
      LevelAchv,
      new NumberHolder(this.level),
    );

    const prevStats =
      this.pokemon.stats.slice(0);

    this.pokemon.calculateStats();
    this.pokemon.updateInfo();

    // 동료도 레벨업 자체는 정상 처리
    if (this.pokemon.isPlayer()) {
      globalScene.gameData.addRoguePoints(1);
      globalScene.updateroguePointText();
    }

    // 동료는 플레이어용 스탯 팝업을 띄우지 않음
    if (this.companion) {
      this.end();
      return;
    }

    if (
      globalScene.expParty
      === ExpNotification.DEFAULT
    ) {
      globalScene.playSound(
        "level_up_fanfare",
      );

      globalScene.ui.showText(
        i18next.t("battle:levelUp", {
          pokemonName:
            getPokemonNameWithAffix(
              this.pokemon,
            ),
          level: this.level,
        }),
        null,
        () =>
          globalScene.ui
            .getMessageHandler()
            .promptLevelUpStats(
              this.partyMemberIndex,
              prevStats,
              false,
            )
            .then(() => this.end()),
        null,
        true,
      );
    } else if (
      globalScene.expParty
      === ExpNotification.SKIP
    ) {
      this.end();
    } else {
      globalScene.ui
        .getMessageHandler()
        .promptLevelUpStats(
          this.partyMemberIndex,
          prevStats,
          false,
        )
        .then(() => this.end());
    }
  }

  public override end() {
    if (this.lastLevel < 100) {
      const levelMoves =
        this.pokemon.getLevelMoves(
          this.lastLevel + 1,
        );

      for (const lm of levelMoves) {
  globalScene.phaseManager.unshiftNew(
    "LearnMovePhase",
    this.partyMemberIndex,
    lm[1],
    LearnMoveType.LEARN_MOVE,
    -1,
    this.companion,
  );
}
    }

    if (!this.pokemon.pauseEvolutions) {
      const evolution =
        this.pokemon.getEvolution();

      if (evolution) {
        this.pokemon.breakIllusion();

        globalScene.phaseManager.unshiftNew(
          "EvolutionPhase",
          this.pokemon,
          evolution,
          this.lastLevel,
        );
      }
    }

    return super.end();
  }
}