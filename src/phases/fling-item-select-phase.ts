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

export class FlingItemSelectPhase extends PlayerPartyMemberPokemonPhase {
  public readonly phaseName = "FlingItemSelectPhase";
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
      PartyUiMode.FLING_ITEM_SELECT,
      this.partyMemberIndex,
      (_slotIndex: number, itemIndexOrCancel: number) => {

        // ✅ 돌아갈 fieldIndex: _flingReturnFieldIndex 우선, 없으면 fallback
        let returnFieldIndex = td._flingReturnFieldIndex;
        delete td._flingReturnFieldIndex;

        if (typeof returnFieldIndex !== "number" || returnFieldIndex < 0) {
          returnFieldIndex = globalScene.getPlayerField().findIndex(p => p.id === user.id);
          if (returnFieldIndex < 0) returnFieldIndex = 0;
        }

        // ✅ 공통: 혹시 남아있을 수 있는 acted / 커맨드 흔적 정리 함수
        const rollbackCommand = () => {
          user.turnData.acted = false;
          if (returnFieldIndex >= 0) {
            delete globalScene.currentBattle.turnCommands[returnFieldIndex];
            delete globalScene.currentBattle.preTurnCommands[returnFieldIndex];
          }
        };

        // ✅ 취소
        if (itemIndexOrCancel === PartyOption.CANCEL || itemIndexOrCancel === -1) {
          td.flingItemSelectedThisTurn = false;
          td.flingItem = undefined;
          td.flingPower = 0;

          td._autoConfirmFling = false;
          delete td._flingCmdPending;

          rollbackCommand();

          // ✅ 입력으로 복귀
          globalScene.ui.setMode(this.messageMode).then(() => {
            globalScene.phaseManager.unshiftNew("CommandPhase", returnFieldIndex);
            super.end();
          });
          return;
        }

        // ✅ "현재 포켓몬"의 지닌도구만 대상으로
        const heldOwnerId = user.id;
        const mods = (globalScene.getModifiers(PokemonHeldItemModifier) as PokemonHeldItemModifier[])
          .filter(m => m.pokemonId === heldOwnerId);

        // ⚠️ 이 정렬은 PartyUiHandler의 표시 정렬과 반드시 같아야 인덱스 불일치가 안 남.
        // 일단 임시로 type.id 정렬 유지
        mods.sort((a, b) => (a.type?.id ?? 0) - (b.type?.id ?? 0));

        const chosen = itemIndexOrCancel >= 0 ? mods[itemIndexOrCancel] : undefined;

        // ✅ 인덱스 이상이면 취소 취급
        if (!chosen) {
          td.flingItemSelectedThisTurn = false;
          td.flingItem = undefined;
          td.flingPower = 0;

          td._autoConfirmFling = false;
          delete td._flingCmdPending;

          rollbackCommand();

          globalScene.ui.setMode(this.messageMode).then(() => {
            globalScene.phaseManager.unshiftNew("CommandPhase", returnFieldIndex);
            super.end();
          });
          return;
        }

        // ✅ 선택 성공: turnData에 저장
        td.flingItemSelectedThisTurn = true;
        // ✅ turnData는 턴/페이즈 전환에서 리셋될 수 있음 → persistent에 저장
(user.summonData as any).flingItem = chosen;

// (선택) 디버그
console.log("[FLING] stored persistent flingItem", chosen?.type?.id);

        td.flingPower = getFlingBasePowerFromItem(chosen);

        // ✅ CommandPhase.start에서 pending을 사용해 "같은 턴에" 커맨드를 확정하도록 트리거
        td._autoConfirmFling = true;

        globalScene.ui.setMode(this.messageMode).then(() => {
          // ✅ 같은 턴에 바로 확정되도록 CommandPhase를 최상단에 올림
          globalScene.phaseManager.unshiftNew("CommandPhase", returnFieldIndex);
          super.end();
        });
      },
    );
  }
}
