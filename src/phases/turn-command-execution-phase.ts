import { globalScene } from "#app/global-scene";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import type { BattlerIndex } from "#enums/battler-index";
import { BerryType } from "#enums/berry-type";
import { Command } from "#enums/command";
import { MoveId } from "#enums/move-id";
import { SwitchType } from "#enums/switch-type";
import type { Pokemon } from "#field/pokemon";
import { PokemonMove } from "#moves/pokemon-move";
import { FieldPhase } from "#phases/field-phase";

function tryReservePriorityBerry(pokemon: Pokemon, pMove: PokemonMove, useMode: MoveUseMode) {
  const user: any = pokemon;
  user.turnData ??= new PokemonTurnData(); // ✅ 절대 {} 쓰지 말기
  const td: any = user.turnData;

  if (td.priorityBerryReserved != null) {
    return;
  }

  const move = pMove.getMove();
  if (typeof (move as any).getPriority === "function") {
    (move as any).getPriority(pokemon, false); // simulated=false → 여기서 예약 찍혀야 함
  }

  console.log(
    "[PRIORITY_BERRY][TCE] after reserve",
    "user=",
    pokemon.name,
    "move=",
    MoveId[pMove.moveId as any] ?? pMove.moveId,
    "reserved=",
    td.priorityBerryReserved != null ? BerryType[td.priorityBerryReserved] : "none",
    "reservedMoveId=",
    td.priorityBerryReservedMoveId != null
      ? (MoveId[td.priorityBerryReservedMoveId] ?? td.priorityBerryReservedMoveId)
      : "none",
  );
}

export class TurnCommandExecutionPhase extends FieldPhase {
  public readonly phaseName = "TurnCommandExecutionPhase";

  constructor(
    private readonly moveOrder: BattlerIndex[],
    private index = 0,
  ) {
    super();
  }

  start() {
    super.start();
    const phaseManager = globalScene.phaseManager;

    // ✅ battlerIndex -> active pokemon map
    const active = globalScene.getField(true).filter(p => p?.isActive());
    const battlerToPokemon = new Map<number, Pokemon>();
    for (const p of active) {
      battlerToPokemon.set(p.getBattlerIndex(), p);
    }

    while (this.index < this.moveOrder.length) {
      const o = this.moveOrder[this.index++];

      const cmd = globalScene.currentBattle.turnCommands[o];
      const pokemon = globalScene.getField(true).find(p => p?.isActive() && p.getBattlerIndex() === o);
      // ✅ 여기!
      const turnCommand = globalScene.currentBattle.turnCommands[o];

      if (!pokemon || !turnCommand || turnCommand.skip) {
        continue;
      }

      if ((pokemon.turnData as any).skipTurnForImmediateBerry) {
        (pokemon.turnData as any).skipTurnForImmediateBerry = false;
        turnCommand.skip = true;
        continue;
      }

      const queueNextUnshift = () => phaseManager.unshiftNew("TurnCommandExecutionPhase", this.moveOrder, this.index);

      switch (turnCommand.command) {
        case Command.FIGHT: {
          const queuedMove = turnCommand.move;
          if (!queuedMove) {
            return this.end();
          }

          const pokemonMove =
            pokemon.getMoveset().find(m => m.moveId === queuedMove.move && m.ppUsed < m.getMovePp())
            ?? new PokemonMove(queuedMove.move);

          // ✅ MovePhase/헤더를 먼저
          phaseManager.unshiftNew(
            "MovePhase",
            pokemon,
            turnCommand.targets ?? queuedMove.targets,
            pokemonMove,
            queuedMove.useMode,
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

        case Command.BALL: {
          const pokeballType = turnCommand.cursor!;
          const targetIndex = turnCommand.targets![0] % 2;

          const monsterHousePokemonId = turnCommand.args?.[0] as number | undefined;

          /*
           * 소굴 일반 개체:
           * CommandPhase에서 이미 대상 선택 완료
           */
          if (monsterHouseManager.isActive() && monsterHousePokemonId != null) {
            phaseManager.unshiftNew("MonsterHouseCaptureTargetPhase", monsterHousePokemonId, pokeballType);

            return this.end();
          }

          /*
           * 일반 야생 포켓몬 또는
           * 실제 등장한 소굴 우두머리
           */
          phaseManager.unshiftNew("AttemptCapturePhase", targetIndex, pokeballType);

          queueNextUnshift();
          return this.end();
        }

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

    // ✅ 모든 실제 필드 행동 종료
    //
    // 몬스터소굴에서는 턴 종료 처리 전에
    // 대기 중인 소굴 개체들의 가상 행동을 먼저 실행한다.
    //
    // MonsterHouseVirtualActionPhase 내부에서 다음 가상 행동을
    // unshiftNew으로 이어 붙이므로, 아래 턴 종료 페이즈들보다
    // 모든 소굴 추가 행동이 먼저 처리된다.
    if (monsterHouseManager.isActive()) {
      phaseManager.pushNew("MonsterHouseVirtualActionPhase");
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
