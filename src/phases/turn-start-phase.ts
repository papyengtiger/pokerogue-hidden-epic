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

export class TurnStartPhase extends FieldPhase {
  public readonly phaseName = "TurnStartPhase";

  /**
   * Speed order of all on-field active Pokemon (with Trick Room handling).
   */
  getSpeedOrder(): BattlerIndex[] {
    const playerField = globalScene.getPlayerField().filter(p => p.isActive());
    const enemyField = globalScene
  .getEnemyField()
  .filter(p => p.isActive());

    // Shuffle first so speed ties are deterministic random per turn
    let orderedTargets = (playerField as Pokemon[]).concat(enemyField);
    globalScene.executeWithSeedOffset(
      () => {
        orderedTargets = randSeedShuffle(orderedTargets);
      },
      globalScene.currentBattle.turn,
      globalScene.waveSeed,
    );

    // Trick Room check
    const speedReversed = new BooleanHolder(false);
globalScene.arena.applyTags(TrickRoomTag, speedReversed);

    orderedTargets.sort((a: Pokemon, b: Pokemon) => {
      const aSpeed = a.getEffectiveStat(Stat.SPD);
      const bSpeed = b.getEffectiveStat(Stat.SPD);
      return speedReversed.value ? aSpeed - bSpeed : bSpeed - aSpeed;
    });

    return orderedTargets.map(t => t.getFieldIndex() + (t.isEnemy() ? BattlerIndex.ENEMY : BattlerIndex.PLAYER));
  }

  /**
   * Command order = speed order + command priority + bypassSpeed + alwaysLast + your type-priority berries.
   */
  getCommandOrder(): BattlerIndex[] {
  const baseSpeedOrder = this.getSpeedOrder();
  const moveOrder = baseSpeedOrder.slice();

  // ✅ 이번 턴 실제로 행동하는(= active) 포켓몬만
  const activeField = globalScene.getField(true).filter(p => p?.isActive());

  // battlerIndex -> pokemon cache
  const battlerToPokemon = new Map<number, Pokemon>();
  for (const p of activeField) {
    battlerToPokemon.set(p.getBattlerIndex(), p);
  }

  // stable tie-break index based on base speed order
  const baseIndex: Record<number, number> = {};
  baseSpeedOrder.forEach((b, i) => (baseIndex[b] = i));

  // per-battler flags
  const battlerBypassSpeed: Record<number, BooleanHolder> = {};
  const battlerAlwaysLast: Record<number, BooleanHolder> = {};

  // --- helper: 안전하게 "들고 있는 베리" 하나를 가져오기 (상태변화 없음)
  const getAnyHeldBerryType = (p: Pokemon): BerryType | undefined => {
    const mods = globalScene
      .getModifiers(BerryModifier, p.isPlayer())
      .filter((m: any) => m instanceof BerryModifier && m.pokemonId === p.id && !m.consumed) as BerryModifier[];
    return mods[0]?.berryType;
  };

  // --- helper: "이번 턴 커맨드의 기술"로부터 실제 타입(시뮬레이션)을 계산
  const getSimulatedMoveType = (p: Pokemon, moveId: number): PokemonType | undefined => {
    const moveData = allMoves?.[moveId];
    if (!moveData) return undefined;

    const typeHolder = new NumberHolder(moveData.type ?? PokemonType.NONE);
    const powerHolder = new NumberHolder(moveData.power ?? 1);

    applyAbAttrs("MoveTypeChangeAbAttr", {
      pokemon: p,
      simulated: true,
      move: moveData as any,
      moveType: typeHolder,
      power: powerHolder,
    });

    return typeHolder.value as PokemonType;
  };

  // ✅ flags 계산 (active만)
  activeField.forEach(p => {
    const bypassSpeed = new BooleanHolder(false);
    const alwaysLast = new BooleanHolder(false);
    const canCheckHeldItems = new BooleanHolder(true);

    const bi = p.getBattlerIndex();
    const cmd = globalScene.currentBattle.turnCommands[bi];

    // --- bypassSpeed(퀵클로/특성 등) 기본 로직
    applyAbAttrs("BypassSpeedChanceAbAttr", { pokemon: p, bypass: bypassSpeed });
    applyAbAttrs("PreventBypassSpeedChanceAbAttr", { pokemon: p, bypass: bypassSpeed, canCheckHeldItems });

    if (canCheckHeldItems.value) {
      globalScene.applyModifiers(BypassSpeedChanceModifier, p.isPlayer(), p, bypassSpeed);
    }

    // ✅ 네 커스텀: 타입-우선 베리 (FIGHT일 때만 의미가 있으니 guard)
    if (cmd?.command === Command.FIGHT) {
      const berryType = getAnyHeldBerryType(p);

      if (berryType !== undefined && TYPE_PRIORITY_BERRIES.has(berryType)) {
        const moveId = cmd?.move?.move;

        if (moveId != null) {
          const mappedType = TYPE_PRIORITY_TYPE_MAP[berryType];
          const moveType = getSimulatedMoveType(p, moveId);

          if (mappedType !== undefined && moveType !== undefined && moveType === mappedType) {
            // ✅ 순서만 앞당김 (소모/메시지는 MovePhase에서)
            bypassSpeed.value = true;
          }
        }
      }

      // ✅ 커스타프(애슈열매): primed + 체력 조건이면 순서만 앞당김
      {
        const held = p.getHeldBerryTypes?.() ?? [];
        const hasCustap = held.includes(BerryType.CUSTAP);

        if (hasCustap) {
          const bd: any = (p as any).battleData;
          const primed = !!bd?.custapPrimed;

          if (primed) {
            const hpRatioReq = new NumberHolder(0.25);
            applyAbAttrs("ReduceBerryUseThresholdAbAttr", { pokemon: p, hpRatioReq });

            const stillLow = p.hp > 0 && p.getHpRatio() <= hpRatioReq.value;
            if (stillLow) {
              bypassSpeed.value = true; // ✅ 순서만 앞당김
            }
          }
        }
      }
    }

    // ✅ 원작: 느림보꼬리/만복향로(alwaysLast)는 "기술 사용(FIGHT)"일 때만 적용
    if (cmd?.command === Command.FIGHT) {
      globalScene.applyModifiers(AlwaysMoveLastModifier, p.isPlayer(), p, alwaysLast);
    } else {
      alwaysLast.value = false;
    }

    battlerBypassSpeed[bi] = bypassSpeed;
    battlerAlwaysLast[bi] = alwaysLast;
  });

  // defaults for safety
  for (const b of moveOrder) {
    battlerBypassSpeed[b] ??= new BooleanHolder(false);
    battlerAlwaysLast[b] ??= new BooleanHolder(false);
  }

  // ✅ 정렬
  moveOrder.sort((a, b) => {
    const aCommand = globalScene.currentBattle.turnCommands[a];
    const bCommand = globalScene.currentBattle.turnCommands[b];

    // command missing/null => fallback base order
    if (!aCommand && !bCommand) return (baseIndex[a] ?? 0) - (baseIndex[b] ?? 0);
    if (!aCommand) return 1;
    if (!bCommand) return -1;

    const aFight = aCommand.command === Command.FIGHT;
    const bFight = bCommand.command === Command.FIGHT;

    // 1) 커맨드 종류 우선 (네 기존 정책 유지)
    //    - FIGHT는 다른 커맨드(스위치/볼/런 등)보다 뒤로
    if (aCommand.command !== bCommand.command) {
      if (aFight) return 1;
      if (bFight) return -1;
      // 둘 다 FIGHT가 아니고 서로 다른 커맨드면 base로
      return (baseIndex[a] ?? 0) - (baseIndex[b] ?? 0);
    }

    // 2) 둘 다 FIGHT일 때: 기술 priority 비교
    let aPriority = 0;
    let bPriority = 0;

    if (aFight && bFight) {
      const aUser = battlerToPokemon.get(a);
      const bUser = battlerToPokemon.get(b);
      if (!aUser || !bUser) return (baseIndex[a] ?? 0) - (baseIndex[b] ?? 0);

      const aMoveId = aCommand.move?.move;
      const bMoveId = bCommand.move?.move;

      const aMoveObj = aMoveId ? aUser.getMoveset().find(m => m.moveId === aMoveId) : undefined;
      const bMoveObj = bMoveId ? bUser.getMoveset().find(m => m.moveId === bMoveId) : undefined;

      // ✅ simulated=true (사이드이펙트 방지)
      aPriority = aMoveObj?.getMove().getPriority(aUser, true) ?? 0;
      bPriority = bMoveObj?.getMove().getPriority(bUser, true) ?? 0;

      if (aPriority !== bPriority) {
        return aPriority < bPriority ? 1 : -1;
      }

      // 3) (원작) alwaysLast: 둘 다 FIGHT + priority 동일일 때만 적용
      if (battlerAlwaysLast[a].value !== battlerAlwaysLast[b].value) {
        return battlerAlwaysLast[a].value ? 1 : -1;
      }

      // 4) bypassSpeed: "같은 priority 브라켓"에서만 속도 무시로 앞당김
      //    (priority가 정확히 같으니 브라켓도 같다고 봐도 되지만,
      //     혹시 네 시스템에서 priority가 0.5 같은 값이 있을 수 있으면 브라켓 체크 유지 가능)
      const sameBracket = Math.ceil(aPriority) === Math.ceil(bPriority);
      if (sameBracket && battlerBypassSpeed[a].value !== battlerBypassSpeed[b].value) {
        return battlerBypassSpeed[a].value ? -1 : 1;
      }

      // 5) 마지막 tie-break: base speed order
      return (baseIndex[a] ?? 0) - (baseIndex[b] ?? 0);
    }

    // 둘 다 FIGHT가 아닌 같은 커맨드면 (스위치끼리 등)
    // 기본 speed order로만 정렬 (원래 네 정책 유지)
    return (baseIndex[a] ?? 0) - (baseIndex[b] ?? 0);
  });
  console.table(moveOrder.map(i => {
  const p = globalScene.getField(true).find(pp => pp?.isActive() && pp.getBattlerIndex() === i);
  const cmd = globalScene.currentBattle.turnCommands[i];
  return {
    i,
    name: p?.getName?.(),
    command: cmd?.command,
    skip: cmd?.skip,
    alwaysLast: battlerAlwaysLast[i]?.value,
    bypass: battlerBypassSpeed[i]?.value,
    base: baseIndex[i],
  };
}));
console.log("[CMD_ORDER_FINAL_RAW]", moveOrder);

  return moveOrder;
}

  start() {
    super.start();

    const field = globalScene.getField();
    const moveOrder = this.getCommandOrder();

    // ✅ preTurnCommands (tera etc.) - NULL SAFE
    for (const o of this.getSpeedOrder()) {
      const pokemon = field[o];
      const preTurnCommand = globalScene.currentBattle.preTurnCommands[o];

      if (!pokemon || !preTurnCommand || preTurnCommand.skip || preTurnCommand.command == null) continue;

      switch (preTurnCommand.command) {
        case Command.TERA:
          globalScene.phaseManager.pushNew("TeraPhase", pokemon);
          break;
      }
    }

    const phaseManager = globalScene.phaseManager;

// ✅ 행동 실행은 드라이버 Phase가 “한 개씩” 처리
globalScene.phaseManager.pushNew("TurnCommandExecutionPhase", moveOrder);

this.end();
}

  private handleTurnCommand(turnCommand: TurnCommand, pokemon: Pokemon) {
    // ✅ NULL SAFE (혹시라도)
    if (!turnCommand || turnCommand.command == null) return;

    switch (turnCommand.command) {
      case Command.FIGHT:
        this.handleFightCommand(turnCommand, pokemon);
        break;

      case Command.BALL:
        globalScene.phaseManager.unshiftNew("AttemptCapturePhase", turnCommand.targets![0] % 2, turnCommand.cursor!);
        break;

      case Command.POKEMON:
        globalScene.phaseManager.unshiftNew(
          "SwitchSummonPhase",
          turnCommand.args?.[0] ? SwitchType.BATON_PASS : SwitchType.SWITCH,
          pokemon.getFieldIndex(),
          turnCommand.cursor!,
          true,
          pokemon.isPlayer(),
        );
        break;

      case Command.RUN:
        globalScene.phaseManager.unshiftNew("AttemptRunPhase");
        break;
    }
  }

  private handleFightCommand(turnCommand: TurnCommand, pokemon: Pokemon) {
  const queuedMove = turnCommand.move;
  if (!queuedMove) return;

  const move =
    pokemon.getMoveset().find(m => m.moveId === queuedMove.move && m.ppUsed < m.getMovePp()) ??
    new PokemonMove(queuedMove.move);

  // ✅ MovePhase는 unshift (즉시 실행)
  globalScene.phaseManager.unshiftNew(
    "MovePhase",
    pokemon,
    turnCommand.targets ?? queuedMove.targets,
    move,
    queuedMove.useMode,
  );
  
  // ✅ 헤더는 MovePhase보다 먼저 떠야 하니 더 앞에 unshift
  if (move.getMove().hasAttr("MoveHeaderAttr")) {
    globalScene.phaseManager.unshiftNew("MoveHeaderPhase", pokemon, move);
    }
  }
}
