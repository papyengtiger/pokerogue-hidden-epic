import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import Overrides from "#app/overrides";
import { initMoveAnim, loadMoveAnimAssets } from "#data/battle-anims";
import { allMoves } from "#data/data-lists";
import { SpeciesFormChangeMoveLearnedTrigger } from "#data/form-change-triggers";
import { LearnMoveType } from "#enums/learn-move-type";
import { MoveId } from "#enums/move-id";
import { UiMode } from "#enums/ui-mode";
import type { Pokemon } from "#field/pokemon";
import type { Move } from "#moves/move";
import { PlayerPartyMemberPokemonPhase } from "#phases/player-party-member-pokemon-phase";
import { EvolutionSceneUiHandler } from "#ui/evolution-scene-ui-handler";
import { SummaryUiMode } from "#ui/summary-ui-handler";
import i18next from "i18next";
import { PokemonHeldItemModifier } from "#modifiers/modifier";
import { PartyUiHandler, PartyUiMode } from "#ui/party-ui-handler";
import { getFlingBasePowerFromItem } from "#moves/fling-utils";
import { PartyOption } from "#ui/party-ui-handler";
import {
  CustomPokemonData,
  PokemonBattleData,
  PokemonSummonData,
  PokemonTempSummonData,
  PokemonTurnData,
  PokemonWaveData,
} from "#data/pokemon-data";
import { BerryModifier } from "#modifiers/modifier"; // 네 경로에 맞게
import { NATURAL_GIFT_BERRY_TO_MOVE, hasNaturalGiftMapping, getNaturalGiftCandidateBerries, getNaturalGiftMoveId, getNaturalGiftDisplayText } from "#moves/natural-gift-utils";

export class NaturalGiftBerrySelectPhase extends PlayerPartyMemberPokemonPhase {
  public readonly phaseName = "NaturalGiftBerrySelectPhase";
  private messageMode!: UiMode;

  start(): void {
    super.start();

    const user = this.getPokemon();
    if (!user) { super.end(); return; }

    const td: any = user.turnData;

    this.messageMode =
      globalScene.ui.getHandler() instanceof EvolutionSceneUiHandler
        ? UiMode.EVOLUTION_SCENE
        : UiMode.MESSAGE;

    globalScene.ui.setModeWithoutClear(
      UiMode.PARTY,
      PartyUiMode.NATURAL_GIFT_BERRY_SELECT,
      this.partyMemberIndex,
      (_slotIndex: number, itemIndexOrCancel: number) => {

        let returnFieldIndex = td._naturalGiftReturnFieldIndex;
        delete td._naturalGiftReturnFieldIndex;

        if (typeof returnFieldIndex !== "number" || returnFieldIndex < 0) {
          returnFieldIndex = globalScene.getPlayerField().findIndex(p => p.id === user.id);
          if (returnFieldIndex < 0) returnFieldIndex = 0;
        }

        const rollbackCommand = () => {
          user.turnData.acted = false;
          if (returnFieldIndex >= 0) {
            delete globalScene.currentBattle.turnCommands[returnFieldIndex];
            delete globalScene.currentBattle.preTurnCommands[returnFieldIndex];
          }
        };

        const cancelAndReturn = () => {
          td._autoConfirmNaturalGift = false;
          delete td._naturalGiftCmdPending;
          delete td.naturalGiftReservedBerry;
          delete td.naturalGiftReservedMoveId;

          rollbackCommand();

          globalScene.ui.setMode(this.messageMode).then(() => {
            globalScene.phaseManager.unshiftNew("CommandPhase", returnFieldIndex);
            super.end();
          });
        };

        // ✅ 취소(명시)
        if (itemIndexOrCancel === PartyOption.CANCEL || itemIndexOrCancel === -1) {
          cancelAndReturn();
          return;
        }

        // ✅ PartyUiHandler와 "완전히 동일한" 필터로 목록 구성
        const heldOwnerId = user.id;
        const mods = (globalScene.getModifiers(PokemonHeldItemModifier) as PokemonHeldItemModifier[])
          .filter(m => m.pokemonId === heldOwnerId)
          .filter(m =>
            m instanceof BerryModifier &&
            !(m as any).consumed &&
            ((m as any).stackCount ?? 1) > 0 &&
            NATURAL_GIFT_BERRY_TO_MOVE[(m as any).berryType] != null,
          );

        // ✅✅✅ 핵심: itemIndexOrCancel은 인덱스가 아닐 수 있다(ALL=1000 등)
        if (itemIndexOrCancel < 0 || itemIndexOrCancel >= mods.length) {
          cancelAndReturn();
          return;
        }

        const chosen = mods[itemIndexOrCancel] as any; // BerryModifier

        // ✅ 선택 성공: 예약값 저장
        td.naturalGiftReservedBerry = chosen.berryType;
        // td.naturalGiftReservedMoveId 는 사실 없어도 되지만, 네 구조 유지하려면 OK
        td.naturalGiftReservedMoveId = MoveId.NATURAL_GIFT;

        td._autoConfirmNaturalGift = true;

        globalScene.ui.setMode(this.messageMode).then(() => {
          globalScene.phaseManager.unshiftNew("CommandPhase", returnFieldIndex);
          super.end();
        });
      },
    );
  }
}
