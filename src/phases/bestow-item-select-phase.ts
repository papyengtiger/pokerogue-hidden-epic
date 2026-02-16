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
import type { moveHeldItemOneStack } from "#moves/move-held-item-one-stack";
import {
  getHeldItemsSided,
  hasModifierSided,
  moveHeldItemOneStack_Sided,
} from "#moves/move-held-item-one-stack";
import { PartyOption } from "#ui/party-ui-handler";
import {
  CustomPokemonData,
  PokemonBattleData,
  PokemonSummonData,
  PokemonTempSummonData,
  PokemonTurnData,
  PokemonWaveData,
} from "#data/pokemon-data";

// PartyUiHandler.getItemModifiers()와 동일한 필터/순서가 되게끔 "정렬은 하지 말기"
function getBestowUiList(user: Pokemon): PokemonHeldItemModifier[] {
  const ownerId = user.id;

  const isPlayerOwner =
    globalScene.getPlayerParty().some(p => p.id === ownerId) ||
    globalScene.getPlayerField().some(p => p?.id === ownerId);

  const all = globalScene.findModifiers(
    m => m instanceof PokemonHeldItemModifier && (m as any).pokemonId === ownerId,
    isPlayerOwner,
  ) as PokemonHeldItemModifier[];

  // ✅ BESTOW는 transferable만
  return all.filter(m => m.isTransferable);
}

export class BestowItemSelectPhase extends PlayerPartyMemberPokemonPhase {
  public readonly phaseName = "BestowItemSelectPhase";
  private messageMode!: UiMode;

  start(): void {
    super.start();

    const user0 = this.getPokemon();
    if (!user0) { super.end(); return; }

    this.messageMode =
      globalScene.ui.getHandler() instanceof EvolutionSceneUiHandler
        ? UiMode.EVOLUTION_SCENE
        : UiMode.MESSAGE;

    globalScene.ui.setModeWithoutClear(
      UiMode.PARTY,
      PartyUiMode.BESTOW_ITEM_SELECT,
      this.partyMemberIndex,
      (_slotIndex: number, itemIndexOrCancel: number) => {

        // ✅ 콜백 내부에서 다시 가져오기(중요)
        const user = this.getPokemon();
        if (!user) { super.end(); return; }

        const td: any = user.turnData;

        // ✅ 복귀 fieldIndex
        let returnFieldIndex = td._bestowReturnFieldIndex;
        delete td._bestowReturnFieldIndex;

        if (typeof returnFieldIndex !== "number" || returnFieldIndex < 0) {
          returnFieldIndex = globalScene.getPlayerField().findIndex(p => p.id === user.id);
          if (returnFieldIndex < 0) returnFieldIndex = 0;
        }

        const rollbackCommand = () => {
          user.turnData.acted = false;
          delete globalScene.currentBattle.turnCommands[returnFieldIndex];
          delete globalScene.currentBattle.preTurnCommands[returnFieldIndex];
        };

        // ✅ 취소
        if (itemIndexOrCancel === PartyOption.CANCEL || itemIndexOrCancel === -1) {
          delete (user.summonData as any).bestowItem;
          td._autoConfirmBestow = false;
          delete td._bestowCmdPending;
          rollbackCommand();

          globalScene.ui.setMode(this.messageMode).then(() => {
            globalScene.phaseManager.unshiftNew("CommandPhase", returnFieldIndex);
            super.end();
          });
          return;
        }

        // ✅ UI랑 동일한 리스트(정렬 금지!)
        const mods = getBestowUiList(user);
        const chosen = itemIndexOrCancel >= 0 ? mods[itemIndexOrCancel] : undefined;

        if (!chosen) {
          delete (user.summonData as any).bestowItem;
          td._autoConfirmBestow = false;
          delete td._bestowCmdPending;
          rollbackCommand();

          globalScene.ui.setMode(this.messageMode).then(() => {
            globalScene.phaseManager.unshiftNew("CommandPhase", returnFieldIndex);
            super.end();
          });
          return;
        }

        // ✅ 선택 저장(핵심): summonData
        (user.summonData as any).bestowItem = chosen;
        td._autoConfirmBestow = true;

        // (선택) 로그
        console.log("[BESTOW][SELECT]", {
          user: user.name,
          chosen: chosen.type?.id,
          returnFieldIndex,
        });

        globalScene.ui.setMode(this.messageMode).then(() => {
          globalScene.phaseManager.unshiftNew("CommandPhase", returnFieldIndex);
          super.end();
        });
      },
    );
  }
}
