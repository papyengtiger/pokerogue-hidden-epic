import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import type { TurnCommand } from "#app/battle";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { TrickRoomTag } from "#data/arena-tag";
import { allMoves } from "#data/data-lists";
import { TYPE_PRIORITY_BERRIES, TYPE_PRIORITY_TYPE_MAP } from "#data/berry";
import { BattlerIndex } from "#enums/battler-index";
import { Command } from "#enums/command";
import { PokemonType } from "#enums/pokemon-type";
import { Stat } from "#enums/stat";
import { SwitchType } from "#enums/switch-type";
import type { Pokemon } from "#field/pokemon";
import { AlwaysMoveLastModifier, BerryModifier, BypassSpeedChanceModifier } from "#modifiers/modifier";
import { PokemonMove } from "#moves/pokemon-move";
import { FieldPhase } from "#phases/field-phase";
import { BooleanHolder, NumberHolder, randSeedShuffle } from "#utils/common";
import i18next from "i18next";
import { MoveId } from "#enums/move-id";
import { BerryType } from "#enums/berry-type";

function tryReservePriorityBerry(pokemon: Pokemon, pMove: PokemonMove, useMode: MoveUseMode) {
  const user: any = pokemon;
  user.turnData ??= new PokemonTurnData(); // ✅ 절대 {} 쓰지 말기
  const td: any = user.turnData;

  if (td.priorityBerryReserved != null) return;

  const move = pMove.getMove();
  if (typeof (move as any).getPriority === "function") {
    (move as any).getPriority(pokemon, false); // simulated=false → 여기서 예약 찍혀야 함
  }

  console.log(
    "[PRIORITY_BERRY][TCE] after reserve",
    "user=", pokemon.name,
    "move=", MoveId[pMove.moveId as any] ?? pMove.moveId,
    "reserved=", td.priorityBerryReserved != null ? BerryType[td.priorityBerryReserved] : "none",
    "reservedMoveId=", td.priorityBerryReservedMoveId != null ? (MoveId[td.priorityBerryReservedMoveId] ?? td.priorityBerryReservedMoveId) : "none",
  );
}

export class TurnCommandExecutionPhase extends FieldPhase {
  public readonly phaseName = "TurnCommandExecutionPhase";

  constructor(
    private readonly moveOrder: BattlerIndex[],
    private index: number = 0,
  ) {
    super();
  }

  start() {
    super.start();
    const phaseManager = globalScene.phaseManager;

    // ✅ battlerIndex -> active pokemon map
    const active = globalScene.getField(true).filter(p => p?.isActive());
    const battlerToPokemon = new Map<number, Pokemon>();
    for (const p of active) battlerToPokemon.set(p.getBattlerIndex(), p);

    while (this.index < this.moveOrder.length) {
      const o = this.moveOrder[this.index++];

const cmd = globalScene.currentBattle.turnCommands[o];
const pokemon = globalScene.getField(true).find(p => p?.isActive() && p.getBattlerIndex() === o);
                 // ✅ 여기!
      const turnCommand = globalScene.currentBattle.turnCommands[o];

      if (!pokemon || !turnCommand || turnCommand.skip) continue;

      if ((pokemon.turnData as any).skipTurnForImmediateBerry) {
        (pokemon.turnData as any).skipTurnForImmediateBerry = false;
        turnCommand.skip = true;
        continue;
      }

      const queueNextUnshift = () =>
        phaseManager.unshiftNew("TurnCommandExecutionPhase", this.moveOrder, this.index);

      switch (turnCommand.command) {
        case Command.FIGHT: {
  const queuedMove = turnCommand.move;
  if (!queuedMove) return this.end();

  const pokemonMove =
    pokemon.getMoveset().find(m => m.moveId === queuedMove.move && m.ppUsed < m.getMovePp()) ??
    new PokemonMove(queuedMove.move);

  // ✅ MovePhase/헤더를 먼저
  phaseManager.unshiftNew(
    "MovePhase",
    pokemon,
    turnCommand.targets ?? queuedMove.targets,
    pokemonMove,
    queuedMove.useMode
  );

  if (pokemonMove.getMove().hasAttr("MoveHeaderAttr")) {
    phaseManager.unshiftNew("MoveHeaderPhase", pokemon, pokemonMove);
  }

  // 예약만
  tryReservePriorityBerry(pokemon, pokemonMove, queuedMove.useMode);

  // ✅ 다음 TCE는 push로 (덮어쓰기 방지)
  phaseManager.pushNew("TurnCommandExecutionPhase", this.moveOrder, this.index);

  return this.end();
}

        case Command.BALL:
          phaseManager.unshiftNew("AttemptCapturePhase", turnCommand.targets![0] % 2, turnCommand.cursor!);
          queueNextUnshift();
          return this.end();

        case Command.POKEMON: {
          (pokemon.turnData as any).isSwitching = true;

          const sideKey = pokemon.isPlayer() ? "player" : "enemy";
          (globalScene.currentBattle as any).pendingSwitchOut ??= {};
          (globalScene.currentBattle as any).pendingSwitchOut[sideKey] = pokemon.getBattlerIndex();

          phaseManager.unshiftNew(
            "SwitchSummonPhase",
            turnCommand.args?.[0] ? SwitchType.BATON_PASS : SwitchType.SWITCH,
            pokemon.getFieldIndex(),
            turnCommand.cursor!,
            true,
            pokemon.isPlayer(),
          );

          // ✅ 교체 이후 이어서 처리: push 유지 OK
          phaseManager.pushNew("TurnCommandExecutionPhase", this.moveOrder, this.index);

          return this.end();
        }

        case Command.RUN:
          phaseManager.unshiftNew("AttemptRunPhase");
          return this.end();
      }
    }

    // ✅ 모든 행동 끝 → 턴 종료 페이즈 1회만
    phaseManager.pushNew("CheckInterludePhase");
    phaseManager.pushNew("WeatherEffectPhase");
    phaseManager.pushNew("BerryPhase");
    phaseManager.pushNew("CheckStatusEffectPhase", this.moveOrder);
    phaseManager.pushNew("PositionalTagPhase");
    phaseManager.pushNew("TurnEndPhase");

    this.end();
  }
}
