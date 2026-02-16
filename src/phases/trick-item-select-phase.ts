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

export class TrickItemSelectPhase extends PlayerPartyMemberPokemonPhase {
  public readonly phaseName = "TrickItemSelectPhase";
  private messageMode!: UiMode;
  private targetBattlerIndex: number;

  constructor(partyMemberIndex: number, targetBattlerIndex: number) {
    super(partyMemberIndex);
    this.targetBattlerIndex = targetBattlerIndex;
  }

  start(): void {
    super.start();

    const user = this.getPokemon();
    if (!user) { super.end(); return; }

    const td: any = user.turnData;

    this.messageMode =
      globalScene.ui.getHandler() instanceof EvolutionSceneUiHandler
        ? UiMode.EVOLUTION_SCENE
        : UiMode.MESSAGE;

    let returnFieldIndex = td._trickReturnFieldIndex;
    delete td._trickReturnFieldIndex;

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

    const cancelOut = () => {
      td.trickItemSelectedThisTurn = false;

      // ✅ tempSummonData 정리 (스코프 밖 변수 사용 금지!)
      user.tempSummonData.trickGiveItem = undefined;
      user.tempSummonData.trickTakeItem = undefined;
      user.tempSummonData.trickTargetBattlerIndex = undefined;

      td._autoConfirmTrick = false;
      delete td._trickCmdPending;

      rollbackCommand();

      globalScene.ui.setMode(this.messageMode).then(() => {
        globalScene.phaseManager.unshiftNew("CommandPhase", returnFieldIndex);
        super.end();
      });
    };

    this.openGiveSelect(user, cancelOut, returnFieldIndex);
  }

  private openGiveSelect(user: Pokemon, cancelOut: () => void, returnFieldIndex: number) {
    globalScene.ui.setModeWithoutClear(
      UiMode.PARTY,
      PartyUiMode.TRICK_GIVE_SELECT,
      this.partyMemberIndex,
      (_slotIndex: number, itemIndexOrCancel: number) => {
        if (itemIndexOrCancel === PartyOption.CANCEL || itemIndexOrCancel === -1) {
          cancelOut();
          return;
        }

        const handler = globalScene.ui.getHandler() as PartyUiHandler;

        // ✅ GIVE는 내 아이템
        const mods = handler.getItemModifiers(user);
        const chosenGive = mods[itemIndexOrCancel];

        if (!chosenGive) {
          cancelOut();
          return;
        }

        // ✅ tempSummonData 저장
        user.tempSummonData.trickGiveItem = chosenGive;
        user.tempSummonData.trickTargetBattlerIndex = this.targetBattlerIndex;

        this.openTakeSelect(user, cancelOut, returnFieldIndex);
      },
    );
  }

  private openTakeSelect(user: Pokemon, cancelOut: () => void, returnFieldIndex: number) {
    const target = globalScene.getField()[this.targetBattlerIndex];
    if (!target) {
      cancelOut();
      return;
    }

    // ✅ 콜백을 변수로 빼서 “강제 show 갱신”에도 동일하게 사용
    const takeCallback = (_slotIndex: number, itemIndexOrCancel: number) => {
      if (itemIndexOrCancel === PartyOption.CANCEL || itemIndexOrCancel === -1) {
        cancelOut();
        return;
      }

      const handler = globalScene.ui.getHandler() as PartyUiHandler;

      // ✅ TAKE는 상대 아이템 목록이어야 함
      // (너가 ownerId 기반으로 구현했다면 getItemModifiers(user)여도 ownerId로 target을 보게 할 수 있지만,
      //  안전하게 target을 직접 넘기는 버전이 더 확실함)
      const mods = handler.getItemModifiers(target);
      const chosenTake = mods[itemIndexOrCancel];

      if (!chosenTake) {
        cancelOut();
        return;
      }

      user.tempSummonData.trickTakeItem = chosenTake;

      const td: any = user.turnData;
      td.trickItemSelectedThisTurn = true;
      td._autoConfirmTrick = true;

      globalScene.ui.setMode(this.messageMode).then(() => {
        globalScene.phaseManager.unshiftNew("CommandPhase", returnFieldIndex);
        super.end();
      });
    };

    // ✅ TAKE 모드로 전환 + ownerId 전달(네 UI가 ownerId 지원하는 경우)
    globalScene.ui.setModeWithoutClear(
      UiMode.PARTY,
      PartyUiMode.TRICK_TAKE_SELECT,
      this.partyMemberIndex,
      takeCallback,
      target.id, // ownerId
    );

    // ✅ PARTY가 active여도 TAKE 모드로 “강제 갱신”
    const handler = globalScene.ui.getHandler() as PartyUiHandler;
    handler.show([PartyUiMode.TRICK_TAKE_SELECT, this.partyMemberIndex, takeCallback, target.id]);
  }
}
