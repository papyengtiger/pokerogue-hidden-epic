import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import Overrides from "#app/overrides";
import { initMoveAnim, loadMoveAnimAssets } from "#data/battle-anims";
import { allMoves } from "#data/data-lists";
import { SpeciesFormChangeMoveLearnedTrigger, SpeciesFormChangeZMoveKnownTrigger } from "#data/form-change-triggers";
import { LearnMoveType } from "#enums/learn-move-type";
import { MoveId } from "#enums/move-id";
import { UiMode } from "#enums/ui-mode";
import type { Pokemon } from "#field/pokemon";
import type { Move } from "#moves/move";
import { PlayerPartyMemberPokemonPhase } from "#phases/player-party-member-pokemon-phase";
import { EvolutionSceneUiHandler } from "#ui/evolution-scene-ui-handler";
import { SummaryUiMode } from "#ui/summary-ui-handler";
import { trPoolTiers } from "#app/data/balance/trs";
import { ModifierTier } from "#enums/modifier-tier";
import i18next from "i18next";
import { SpeciesId } from "#enums/species-id";

export class LearnMovePhase extends PlayerPartyMemberPokemonPhase {
  public readonly phaseName = "LearnMovePhase";
  private moveId: MoveId;
  private messageMode: UiMode;
  private learnMoveType: LearnMoveType;
  private cost: number;

  constructor(
    partyMemberIndex: number,
    moveId: MoveId,
    learnMoveType: LearnMoveType = LearnMoveType.LEARN_MOVE,
    cost = -1,
  ) {
    super(partyMemberIndex);
    this.moveId = moveId;
    this.learnMoveType = learnMoveType;
    this.cost = cost;
  }

  start() {
  console.log("[DEBUG] LearnMovePhase.start() moveId:", this.moveId);
  console.log("[DEBUG] move from allMoves:", allMoves[this.moveId]);
  
  super.start();

  const pokemon = this.getPokemon();
  console.log("[DEBUG] compatibleTrs:", pokemon.compatibleTrs);

  const move = allMoves[this.moveId];
  if (!move) {
    console.warn("[DEBUG] move not found, aborting LearnMovePhase");
    return this.end();
  }
  
  const currentMoveset = pokemon.getMoveset();

    // 1) 이미 해당 기술을 가지고 있다면 종료
    const hasMoveAlready = currentMoveset.some(m => m.moveId === move.id) && this.moveId !== MoveId.SKETCH;
    if (hasMoveAlready) {
      console.log("[ZMove] 이미 기술 있음, 종료됨");
      return this.end();
    }

    // 메시지 모드 설정
    this.messageMode =
      globalScene.ui.getHandler() instanceof EvolutionSceneUiHandler ? UiMode.EVOLUTION_SCENE : UiMode.MESSAGE;
    globalScene.ui.setMode(this.messageMode);

    // 배우기 진행
    if (currentMoveset.length < 4) {
      this.learnMove(currentMoveset.length, move, pokemon);
    } else {
      this.replaceMoveCheck(move, pokemon);
    }
  }

  private getTrLearnRoguePoints(moveId: MoveId): number {
  const tier = trPoolTiers[moveId];

  switch (tier) {
    case ModifierTier.COMMON:
      // 일반 다이맥스기술
      return 10;

    case ModifierTier.RARE:
      // 거다이맥스기술
      return 20;

    default:
      return 0;
  }
}

private getZLearnRoguePoints(learnMoveType: LearnMoveType): number {
  switch (learnMoveType) {
    case LearnMoveType.Z_EXCLUSIVE:
      return 20;
    case LearnMoveType.Z_GENERIC:
      return 10;
    default:
      return 0;
  }
}

  async replaceMoveCheck(move: Move, pokemon: Pokemon) {
    const learnMovePrompt = i18next.t("battle:learnMovePrompt", {
      pokemonName: getPokemonNameWithAffix(pokemon),
      moveName: move.name,
    });
    const moveLimitReached = i18next.t("battle:learnMoveLimitReached", {
      pokemonName: getPokemonNameWithAffix(pokemon),
    });
    const shouldReplaceQ = i18next.t("battle:learnMoveReplaceQuestion", {
      moveName: move.name,
    });

    const preQText = [learnMovePrompt, moveLimitReached].join("$");
    await globalScene.ui.showTextPromise(preQText);
    await globalScene.ui.showTextPromise(shouldReplaceQ, undefined, false);

    await globalScene.ui.setModeWithoutClear(
      UiMode.CONFIRM,
      () => this.forgetMoveProcess(move, pokemon), // Yes
      () => {
        globalScene.ui.setMode(this.messageMode);
        this.rejectMoveAndEnd(move, pokemon);
      },
    );
  }

  async forgetMoveProcess(move: Move, pokemon: Pokemon) {
    globalScene.ui.setMode(this.messageMode);
    await globalScene.ui.showTextPromise(i18next.t("battle:learnMoveForgetQuestion"), undefined, true);

    await globalScene.ui.setModeWithoutClear(
      UiMode.SUMMARY,
      pokemon,
      SummaryUiMode.LEARN_MOVE,
      move,
      (moveIndex: number) => {
        if (moveIndex === 4) {
          globalScene.ui.setMode(this.messageMode).then(() => this.rejectMoveAndEnd(move, pokemon));
          return;
        }
        const forgetSuccessText = i18next.t("battle:learnMoveForgetSuccess", {
          pokemonName: getPokemonNameWithAffix(pokemon),
          moveName: pokemon.moveset[moveIndex]!.getName(),
        });
        const fullText = [i18next.t("battle:countdownPoof"), forgetSuccessText, i18next.t("battle:learnMoveAnd")].join("$");

        globalScene.ui.setMode(this.messageMode).then(() =>
          this.learnMove(moveIndex, move, pokemon, fullText),
        );
      },
    );
  }

  async rejectMoveAndEnd(move: Move, pokemon: Pokemon) {
    await globalScene.ui.showTextPromise(
      i18next.t("battle:learnMoveStopTeaching", { moveName: move.name }),
      undefined,
      false,
    );
    globalScene.ui.setModeWithoutClear(
      UiMode.CONFIRM,
      () => {
        globalScene.ui.setMode(this.messageMode);
        globalScene.ui
          .showTextPromise(
            i18next.t("battle:learnMoveNotLearned", {
              pokemonName: getPokemonNameWithAffix(pokemon),
              moveName: move.name,
            }),
            undefined,
            true,
          )
          .then(() => this.end());
      },
      () => {
        globalScene.ui.setMode(this.messageMode);
        this.replaceMoveCheck(move, pokemon);
      },
    );
  }

  async learnMove(index: number, move: Move, pokemon: Pokemon, textMessage?: string) {
// ✅ 무조건 찍히게: 맨 위
  console.log("[LearnMove] type=", this.learnMoveType, "name=", LearnMoveType[this.learnMoveType]);
  console.log("[LearnMove] moveId=", this.moveId, "move=", allMoves[this.moveId]?.name);

    if (this.learnMoveType === LearnMoveType.TM) {
  pokemon.usedTMs ??= [];
  if (!pokemon.usedTMs.includes(this.moveId)) pokemon.usedTMs.push(this.moveId);
  globalScene.phaseManager.tryRemovePhase(phase => phase.is("SelectModifierPhase"));

} else if (this.learnMoveType === LearnMoveType.TR) {
  pokemon.usedTRs ??= [];

  const wasKnownTR = pokemon.usedTRs.includes(this.moveId);
  if (!wasKnownTR) {
    pokemon.usedTRs.push(this.moveId);
  }

  globalScene.phaseManager.tryRemovePhase(phase => phase.is("SelectModifierPhase"));

  // ✅ TR로 배우는 맥스기술 / 거다이맥스기술 로그포인트
  if (!wasKnownTR) {
    const gainedRp = this.getTrLearnRoguePoints(this.moveId);
    if (gainedRp > 0) {
      globalScene.gameData.addRoguePoints(gainedRp);
      globalScene.updateroguePointText();
    }
  }

} else if (
  this.learnMoveType === LearnMoveType.Z_EXCLUSIVE ||
  this.learnMoveType === LearnMoveType.Z_GENERIC
) {
  pokemon.usedZMoves ??= [];

  const wasKnownZMove = pokemon.usedZMoves.includes(this.moveId);
  if (!wasKnownZMove) {
    pokemon.usedZMoves.push(this.moveId);
  }

  const anyP: any = pokemon as any;
  if (anyP.data) {
    anyP.data.usedZMoves ??= [];
    if (!anyP.data.usedZMoves.includes(this.moveId)) {
      anyP.data.usedZMoves.push(this.moveId);
    }
  }

  globalScene.phaseManager.tryRemovePhase(phase => phase.is("SelectModifierPhase"));

  // ✅ Z기술 학습 로그포인트
  if (!wasKnownZMove) {
    const gainedRp = this.getZLearnRoguePoints(this.learnMoveType);
    if (gainedRp > 0) {
      globalScene.gameData.addroguePoints(gainedRp);
      globalScene.updateroguePointText();
    }
  }
} else if (this.learnMoveType === LearnMoveType.MEMORY) {
  if (this.cost !== -1) {
    if (!Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
      globalScene.money -= this.cost;
      globalScene.updateMoneyText();
      globalScene.animateMoneyChanged(false);
    }
    globalScene.playSound("se/buy");
  } else {
    globalScene.phaseManager.tryRemovePhase("SelectModifierPhase");
  }
}
    pokemon.setMove(index, this.moveId);
    globalScene.triggerPokemonFormChange(pokemon, SpeciesFormChangeMoveLearnedTrigger, false, false);

    initMoveAnim(this.moveId).then(() => {
      loadMoveAnimAssets([this.moveId], true);
    });
    globalScene.ui.setMode(this.messageMode);
    const learnMoveText = i18next.t("battle:learnMove", {
      pokemonName: getPokemonNameWithAffix(pokemon),
      moveName: move.name,
    });
    if (textMessage) {
      await globalScene.ui.showTextPromise(textMessage);
    }
    globalScene.playSound("level_up_fanfare"); // Sound loaded into game as is
    globalScene.ui.showText(
  learnMoveText,
  null,
  () => {

    this.end();
  },
  this.messageMode === UiMode.EVOLUTION_SCENE ? 1000 : undefined,
  true,
);
  }
}
