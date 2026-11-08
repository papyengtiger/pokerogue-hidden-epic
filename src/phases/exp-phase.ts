import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { ExpBoosterModifier } from "#modifiers/modifier";
import { PlayerPartyMemberPokemonPhase } from "#phases/player-party-member-pokemon-phase";
import { NumberHolder } from "#utils/common";
import { trainerCardManager } from "#system/trainer-card-manager";
import { TrainerCardId } from "#enums/trainer-card-id";
import { MarkId } from "#enums/mark-id";
import { MarkTier } from "#enums/mark-tier";
import { markData } from "#data/mark";
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

// 성장의 증표: 경험치를 받는 개별 포켓몬의 증표만 확인한다.
    if (trainerCardManager.isEquipped(TrainerCardId.MARK_OF_GROWTH)) {
      const markedPokemon = pokemon as typeof pokemon & { mark?: MarkId; markId?: MarkId };
      const markId = markedPokemon.mark ?? markedPokemon.markId ?? MarkId.NONE;
      const tier = markId !== MarkId.NONE ? markData[markId]?.tier : undefined;
      const bonusByTier: Partial<Record<MarkTier, number>> = {
        [MarkTier.COMMON]: 0.05,
        [MarkTier.RARE]: 0.1,
        [MarkTier.ROGUE]: 0.15,
        [MarkTier.EPIC]: 0.2,
        [MarkTier.LEGENDARY]: 0.25,
        [MarkTier.SPECIAL]: 0.2,
        [MarkTier.MYSTERY]: 0,
      };
      const bonus = tier === undefined ? 0 : (bonusByTier[tier] ?? 0);
      if (bonus > 0) {
        const beforeExp = exp.value;
        exp.value *= 1 + bonus;
        console.log("[TRAINER_CARD_MARK_EXP]", { pokemon: pokemon.name, markId, tier, beforeExp, bonus, afterExp: exp.value });
      }
    }

    // 난이도별 경험치 획득량 보정
    const difficultyMultiplier =
      globalScene.gameMode.getPlayerExpMultiplier();

    const beforeDifficultyExp = exp.value;

    exp.value = Math.floor(
      exp.value * difficultyMultiplier,
    );

    console.log("[DIFFICULTY_EXP]", {
      difficulty: globalScene.gameMode.difficulty,
      pokemon: pokemon.name,
      companion: this.companion,
      beforeExp: Math.floor(beforeDifficultyExp),
      multiplier: difficultyMultiplier,
      afterExp: exp.value,
    });

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