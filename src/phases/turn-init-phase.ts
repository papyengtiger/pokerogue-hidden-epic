import { globalScene } from "#app/global-scene";
import { BattlerIndex } from "#enums/battler-index";
import { TurnInitEvent } from "#events/battle-scene";
import type { PlayerPokemon } from "#field/pokemon";
import {
  handleMysteryEncounterBattleStartEffects,
  handleMysteryEncounterTurnStartEffects,
} from "#mystery-encounters/encounter-phase-utils";
import { FieldPhase } from "#phases/field-phase";
import i18next from "i18next";

export class TurnInitPhase extends FieldPhase {
  public readonly phaseName = "TurnInitPhase";

  start() {
    super.start();

    // 1) 불법 진화 체크(기존 로직 유지)
    globalScene.getPlayerField().forEach(p => {
      if (p.isOnField() && !p.isAllowedInBattle()) {
        globalScene.phaseManager.queueMessage(
          i18next.t("challenges:illegalEvolution", { pokemon: p.name }),
          null,
          true,
        );

        const allowedPokemon = globalScene.getPokemonAllowedInBattle();

        if (!allowedPokemon.length) {
          globalScene.phaseManager.clearPhaseQueue();
          globalScene.phaseManager.unshiftNew("GameOverPhase");
        } else if (
          allowedPokemon.length >= globalScene.currentBattle.getBattlerCount() ||
          (globalScene.currentBattle.double && !allowedPokemon[0].isActive(true))
        ) {
          p.switchOut();
        } else {
          p.leaveField();
        }

        if (allowedPokemon.length === 1 && globalScene.currentBattle.double) {
          globalScene.phaseManager.unshiftNew("ToggleDoublePositionPhase", true);
        }
      }
    });

    globalScene.eventTarget.dispatchEvent(new TurnInitEvent());

    handleMysteryEncounterBattleStartEffects();

    // Mystery encounter가 턴시작을 가로채면 그대로 종료
    if (handleMysteryEncounterTurnStartEffects()) {
      this.end();
      return;
    }

    // ✅ 2) 먼저 turnData 초기화 + 참가자 등록만 해둠 (커맨드는 아직 생성 X)
    globalScene.getField().forEach((pokemon, i) => {
  if (!pokemon?.isActive()) return;

  if (pokemon.isPlayer()) {
    globalScene.currentBattle.addParticipant(pokemon as PlayerPokemon);
  }

  pokemon.resetTurnData();
});

// ✅ 배틀 시작 턴이면: 즉발 베리 페이즈만 먼저 실행하고 여기서 종료
const isBattleStartTurn = (globalScene.currentBattle?.turn ?? 0) <= 1;
if (isBattleStartTurn) {
  globalScene.phaseManager.pushNew("BattleStartImmediateBerryPhase");
  this.end();
  return;
}

// --- 여기부터는 기존 로직 그대로 (커맨드/턴스타트 큐잉) ---
globalScene.getField().forEach((pokemon, i) => {
  if (!pokemon?.isActive()) return;

  if (pokemon.isPlayer()) globalScene.phaseManager.pushNew("CommandPhase", i);
  else globalScene.phaseManager.pushNew("EnemyCommandPhase", i - BattlerIndex.ENEMY);
});

globalScene.phaseManager.pushNew("TurnStartPhase");
this.end();
  }
}
