import { globalScene } from "#app/global-scene";
import { trainerCardManager } from "#system/trainer-card-manager";
import { TrainerCardId } from "#enums/trainer-card-id";
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
import { allMoves } from "#data/data-lists";

export class LevelUpPhase extends PlayerPartyMemberPokemonPhase {
  public readonly phaseName = "LevelUpPhase";
  protected lastLevel: number;
  protected level: number;
  protected pokemon: PlayerPokemon = this.getPlayerPokemon();

  constructor(partyMemberIndex: number, lastLevel: number, level: number) {
    super(partyMemberIndex);

    this.lastLevel = lastLevel;
    this.level = level;
  }

  public override start() {
    super.start();

    if (this.level > globalScene.gameData.gameStats.highestLevel) {
      globalScene.gameData.gameStats.highestLevel = this.level;
    }

    globalScene.validateAchvs(LevelAchv, new NumberHolder(this.level));

    const prevStats = this.pokemon.stats.slice(0);
this.pokemon.calculateStats();
// 성장의 기쁨: 실제 레벨 상승 횟수만큼 회복하며, 기절 상태는 부활시키지 않는다.
if (trainerCardManager.isEquipped(TrainerCardId.JOY_OF_GROWTH) && !this.pokemon.isFainted()) {
  const gainedLevels = Math.max(0, this.level - this.lastLevel);
  const maxHp = this.pokemon.getMaxHp();
  const healAmount = Math.floor(maxHp * 0.1 * gainedLevels);
  if (healAmount > 0) {
    const beforeHp = this.pokemon.hp;
    this.pokemon.hp = Math.min(maxHp, this.pokemon.hp + healAmount);
    console.log("[TRAINER_CARD_LEVEL_HEAL]", { pokemon: this.pokemon.name, gainedLevels, beforeHp, afterHp: this.pokemon.hp });
  }
}
this.pokemon.updateInfo();

// ✅ 레벨업 로그포인트
if (this.pokemon.isPlayer()) {
  globalScene.gameData.addRoguePoints(1);
  globalScene.updateroguePointText();
}

if (globalScene.expParty === ExpNotification.DEFAULT) {
      globalScene.playSound("level_up_fanfare");
      globalScene.ui.showText(
        i18next.t("battle:levelUp", {
          pokemonName: getPokemonNameWithAffix(this.pokemon),
          level: this.level,
        }),
        null,
        () =>
          globalScene.ui
            .getMessageHandler()
            .promptLevelUpStats(this.partyMemberIndex, prevStats, false)
            .then(() => this.end()),
        null,
        true,
      );
    } else if (globalScene.expParty === ExpNotification.SKIP) {
      this.end();
    } else {
      // we still want to display the stats if activated
      globalScene.ui
        .getMessageHandler()
        .promptLevelUpStats(this.partyMemberIndex, prevStats, false)
        .then(() => this.end());
    }
  }

  public override end() {
    if (this.lastLevel < 100) {
      // this feels like an unnecessary optimization
      const levelMoves = this.getPokemon().getLevelMoves(this.lastLevel + 1);
      for (const lm of levelMoves) {
        globalScene.phaseManager.unshiftNew("LearnMovePhase", this.partyMemberIndex, lm[1]);
      }
    }
    if (!this.pokemon.pauseEvolutions) {
      const evolution = this.pokemon.getEvolution();
      if (evolution) {
        this.pokemon.breakIllusion();
        globalScene.phaseManager.unshiftNew("EvolutionPhase", this.pokemon, evolution, this.lastLevel);
      }
    }
    return super.end();
  }
}