import type { TurnCommand } from "#app/battle";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { speciesStarterCosts } from "#balance/starters";
import { TrappedTag } from "#data/battler-tags";
import { AbilityId } from "#enums/ability-id";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattleType } from "#enums/battle-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { BiomeId } from "#enums/biome-id";
import { Command } from "#enums/command";
import { FieldPosition } from "#enums/field-position";
import { MoveId } from "#enums/move-id";
import { isIgnorePP, isVirtual, MoveUseMode } from "#enums/move-use-mode";
import { MysteryEncounterMode } from "#enums/mystery-encounter-mode";
import { PokeballType } from "#enums/pokeball";
import { UiMode } from "#enums/ui-mode";
import type { PlayerPokemon } from "#field/pokemon";
import type { MoveTargetSet } from "#moves/move";
import { getMoveTargets } from "#moves/move-utils";
import { FieldPhase } from "#phases/field-phase";
import type { TurnMove } from "#types/turn-move";
import i18next from "i18next";

export class CommandPhase extends FieldPhase {
  public readonly phaseName = "CommandPhase";
  protected fieldIndex: number;

  /**
   * Whether the command phase is handling a switch command
   */
  private isSwitch = false;

  constructor(fieldIndex: number) {
    super();

    this.fieldIndex = fieldIndex;
  }

  /**
   * Resets the cursor to the position of {@linkcode Command.FIGHT} if any of the following are true
   * - The setting to remember the last action is not enabled
   * - This is the first turn of a mystery encounter, trainer battle, or the END biome
   * - The cursor is currently on the POKEMON command
   */
  private resetCursorIfNeeded(): void {
    const commandUiHandler = globalScene.ui.handlers[UiMode.COMMAND];
    const { arena, commandCursorMemory, currentBattle } = globalScene;
    const { battleType, turn } = currentBattle;
    const { biomeType } = arena;

    // If one of these conditions is true, we always reset the cursor to Command.FIGHT
    const cursorResetEvent =
      battleType === BattleType.MYSTERY_ENCOUNTER || battleType === BattleType.TRAINER || biomeType === BiomeId.END;

    if (!commandUiHandler) {
      return;
    }
    if (
      (turn === 1 && (!commandCursorMemory || cursorResetEvent))
      || commandUiHandler.getCursor() === Command.POKEMON
    ) {
      commandUiHandler.setCursor(Command.FIGHT);
    }
  }

  /**
   * Submethod of {@linkcode start} that validates field index logic for nonzero field indices.
   * Must only be called if the field index is nonzero.
   */
  private handleFieldIndexLogic(): void {
    // If we somehow are attempting to check the right pokemon but there's only one pokemon out
    // Switch back to the center pokemon. This can happen rarely in double battles with mid turn switching
    // TODO: Prevent this from happening in the first place
    if (globalScene.getPlayerField().filter(p => p.isActive()).length === 1) {
      this.fieldIndex = FieldPosition.CENTER;
      return;
    }

    const allyCommand = globalScene.currentBattle.turnCommands[this.fieldIndex - 1];
    if (allyCommand?.command === Command.BALL || allyCommand?.command === Command.RUN) {
      globalScene.currentBattle.turnCommands[this.fieldIndex] = {
        command: allyCommand?.command,
        skip: true,
      };
    }
  }

  /**
   * Submethod of {@linkcode start} that sets the turn command to skip if this pokemon
   * is commanding its ally via {@linkcode AbilityId.COMMANDER}.
   */
  private checkCommander(): void {
    // If the Pokemon has applied Commander's effects to its ally, skip this command
    if (
      globalScene.currentBattle?.double
      && this.getPokemon().getAlly()?.getTag(BattlerTagType.COMMANDED)?.getSourcePokemon() === this.getPokemon()
    ) {
      globalScene.currentBattle.turnCommands[this.fieldIndex] = {
        command: Command.FIGHT,
        move: { move: MoveId.NONE, targets: [], useMode: MoveUseMode.NORMAL },
        skip: true,
      };
    }
  }

  /**
   * Clear out all unusable moves in front of the currently acting pokemon's move queue.
   */
  // TODO: Refactor move queue handling to ensure that this method is not necessary.
  private clearUnusableMoves(): void {
    const playerPokemon = this.getPokemon();
    const moveQueue = playerPokemon.getMoveQueue();
    if (moveQueue.length === 0) {
      return;
    }

    let entriesToDelete = 0;
    const moveset = playerPokemon.getMoveset();
    for (const queuedMove of moveQueue) {
      const movesetQueuedMove = moveset.find(m => m.moveId === queuedMove.move);
      if (
        queuedMove.move !== MoveId.NONE
        && !isVirtual(queuedMove.useMode)
        && !movesetQueuedMove?.isUsable(playerPokemon, isIgnorePP(queuedMove.useMode), true)
      ) {
        entriesToDelete++;
      } else {
        break;
      }
    }
    if (entriesToDelete) {
      moveQueue.splice(0, entriesToDelete);
    }
  }

  /**
   * Attempt to execute the first usable move in this Pokemon's move queue
   * @returns Whether a queued move was successfully set to be executed.
   */
  private tryExecuteQueuedMove(): boolean {
    this.clearUnusableMoves();
    const playerPokemon = globalScene.getPlayerField()[this.fieldIndex];
    const moveQueue = playerPokemon.getMoveQueue();

    if (moveQueue.length === 0) {
      return false;
    }

    const queuedMove = moveQueue[0];
    if (queuedMove.move === MoveId.NONE) {
      this.handleCommand(Command.FIGHT, -1);
      return true;
    }
    const moveIndex = playerPokemon.getMoveset().findIndex(m => m.moveId === queuedMove.move);
    if (!isVirtual(queuedMove.useMode) && moveIndex === -1) {
      globalScene.ui.setMode(UiMode.COMMAND, this.fieldIndex);
    } else {
      this.handleCommand(Command.FIGHT, moveIndex, queuedMove.useMode, queuedMove);
    }

    return true;
  }

  public override start(): void {
  super.start();

  const playerPokemon = this.getPokemon();
  const td: any = playerPokemon.turnData;

  // ✅ FLING 자동 확정
  if (td._autoConfirmFling) {
    td._autoConfirmFling = false;

    const pending = td._flingCmdPending;
    delete td._flingCmdPending;

    if (pending && td.flingItemSelectedThisTurn) {
      this.handleFightCommand(
        pending.command,
        pending.cursor,
        pending.useMode,
        pending.move,
      );
    }

    this.end();
    return;
  }

    if (td._autoConfirmBestow) {
  td._autoConfirmBestow = false;

  const pending = td._bestowCmdPending;
  delete td._bestowCmdPending;

  // ✅ 이 CommandPhase의 포켓몬을 기준으로 다시 잡기(안전)
  const playerPokemon = this.getPokemon();
  const selected = (playerPokemon.summonData as any).bestowItem as PokemonHeldItemModifier | undefined;

  // 선택이 없으면 그냥 입력으로 복귀
  if (!pending || !selected) {
    globalScene.ui.setMode(UiMode.FIGHT, this.fieldIndex);
    return;
  }

  // ✅ 여기서 handleFightCommand는 "다시 선택창 띄우면 안 됨"
  const ok = this.handleFightCommand(pending.command, pending.cursor, pending.useMode, pending.move);

  if (ok) {
    this.end();
  } else {
    // 실패면 선택값을 날려서 루프 방지 + 입력 복귀
    delete (playerPokemon.summonData as any).bestowItem;
    globalScene.ui.setMode(UiMode.FIGHT, this.fieldIndex);
  }

  return;
}

  // ✅✅✅ TRICK 자동 확정 (여기 추가)
  if (td._autoConfirmTrick) {
    td._autoConfirmTrick = false;

    const pending = td._trickCmdPending;
    delete td._trickCmdPending;

    if (pending && td.trickItemSelectedThisTurn) {
      this.handleFightCommand(
        pending.command,
        pending.cursor,
        pending.useMode,
        pending.move,
      );
    }

    this.end();
    return;
  }

  // ✅ NATURAL GIFT 자동 확정
if (td._autoConfirmNaturalGift) {
  td._autoConfirmNaturalGift = false;

  const pending = td._naturalGiftCmdPending;
  delete td._naturalGiftCmdPending;

  const hasPick = td.naturalGiftReservedBerry != null;

  // 선택이 없거나 pending이 없으면 입력 복귀
  if (!pending || !hasPick) {
    globalScene.ui.setMode(UiMode.FIGHT, this.fieldIndex);
    return;
  }

  const ok = this.handleFightCommand(
    pending.command,
    pending.cursor,
    pending.useMode,
    pending.move,
  );

  if (ok) {
    this.end();
  } else {
    // 실패면 예약값 날리고 루프 방지 + 입력 복귀
    delete td.naturalGiftReservedBerry;
    delete td.naturalGiftReservedMoveId;
    globalScene.ui.setMode(UiMode.FIGHT, this.fieldIndex);
  }

  return;
}

  globalScene.updateGameInfo();
  this.resetCursorIfNeeded();

  if (this.fieldIndex) {
    this.handleFieldIndexLogic();
  }

  this.checkCommander();

  playerPokemon.lapseTag(BattlerTagType.ENCORE);

  if (globalScene.currentBattle.turnCommands[this.fieldIndex]?.skip) {
    this.end();
    return;
  }

  if (this.tryExecuteQueuedMove()) {
    return;
  }

  if ((globalScene.currentBattle as any)?.isPracticeBattle) {
  globalScene.ui.clearText();
  globalScene.ui.setMode(UiMode.FIGHT, this.fieldIndex);
}
else if (
  globalScene.currentBattle.isBattleMysteryEncounter()
  && globalScene.currentBattle.mysteryEncounter?.skipToFightInput
) {
  globalScene.ui.clearText();
  globalScene.ui.setMode(UiMode.FIGHT, this.fieldIndex);
} else {
  globalScene.ui.setMode(UiMode.COMMAND, this.fieldIndex);
}
}

  /**
   * Submethod of {@linkcode handleFightCommand} responsible for queuing the provided error message when the move cannot be used
   * @param msg - The reason why the move cannot be used
   */
  private queueFightErrorMessage(msg: string): void {
  const ui = globalScene.ui;
  ui.setMode(UiMode.MESSAGE);
  ui.showText(
    msg,
    null,
    () => {
      ui.clearText();
      ui.setMode(UiMode.FIGHT, this.fieldIndex);
    },
    null,
    true,
  );
}

  /**
   * Helper method for {@linkcode handleFightCommand} that returns the moveID for the phase
   * based on the move passed in or the cursor.
   *
   * Does not check if the move is usable or not, that should be handled by the caller.
   */
  private computeMoveId(playerPokemon: PlayerPokemon, cursor: number, move: TurnMove | undefined): MoveId {
    return move?.move ?? (cursor > -1 ? playerPokemon.getMoveset()[cursor]?.moveId : MoveId.NONE);
  }

  /**
   * Process the logic for executing a fight-related command
   *
   * @remarks
   * - Validates whether the move can be used, using struggle if not
   * - Constructs the turn command and inserts it into the battle's turn commands
   *
   * @param command - The command to handle (FIGHT or TERA)
   * @param cursor - The index that the cursor is placed on, or -1 if no move can be selected.
   * @param ignorePP - Whether to ignore PP when checking if the move can be used.
   * @param move - The move to force the command to use, if any.
   */
  private handleFightCommand(
  command: Command.FIGHT | Command.TERA,
  cursor: number,
  useMode: MoveUseMode = MoveUseMode.NORMAL,
  move?: TurnMove,
): boolean {
  const playerPokemon = this.getPokemon();
  const ignorePP = isIgnorePP(useMode);
  const [canUse, reason] = cursor === -1 ? [true, ""] : playerPokemon.trySelectMove(cursor, ignorePP);

  const useStruggle = canUse
    ? false
    : cursor > -1 && !playerPokemon.getMoveset().some(m => m.isUsable(playerPokemon, ignorePP, true)[0]);

  if (!canUse && !useStruggle) {
    console.error("Cannot use move:", reason);
    this.queueFightErrorMessage(reason);
    return false;
  }

  const moveId = useStruggle ? MoveId.STRUGGLE : this.computeMoveId(playerPokemon, cursor, move);

  // ✅ FLING: 아이템 선택이 먼저다 (turnCommands 확정 전에!)
  if (moveId === MoveId.FLING) {
    const td: any = playerPokemon.turnData;

    // 아직 선택 안 했으면: 선택창 띄우고 커맨드 확정은 보류
    if (!td.flingItemSelectedThisTurn) {
      td._flingCmdPending = { command, cursor, useMode, move };
      td._flingReturnFieldIndex = this.fieldIndex;

      // ✅ 안전빵: 혹시 남아있을지 모르는 흔적 제거
      playerPokemon.turnData.acted = false;
      delete globalScene.currentBattle.turnCommands[this.fieldIndex];
      delete globalScene.currentBattle.preTurnCommands[this.fieldIndex];

      const partyIndex = globalScene.getPlayerParty().findIndex(p => p.id === playerPokemon.id);
      if (partyIndex >= 0) {
        globalScene.phaseManager.unshiftNew("FlingItemSelectPhase", partyIndex);

        // ✅ 중요: 현재 CommandPhase는 종료(선택 끝나면 새 CommandPhase를 다시 올릴 거니까)
        this.end();
        return false;
      }

      // 파티 인덱스 못 찾으면 그냥 실패 취급
      return false;
    }
  }

    if (moveId === MoveId.BESTOW) {
  const td: any = playerPokemon.turnData;

  // ✅ 플래그 말고 "실제 선택된 아이템" 기준
  const chosen = (playerPokemon.summonData as any).bestowItem as PokemonHeldItemModifier | undefined;

  if (!chosen) {
    td._bestowCmdPending = { command, cursor, useMode, move };
    td._bestowReturnFieldIndex = this.fieldIndex;

    playerPokemon.turnData.acted = false;
    delete globalScene.currentBattle.turnCommands[this.fieldIndex];
    delete globalScene.currentBattle.preTurnCommands[this.fieldIndex];

    const partyIndex = globalScene.getPlayerParty().findIndex(p => p.id === playerPokemon.id);
    if (partyIndex >= 0) {
      globalScene.phaseManager.unshiftNew("BestowItemSelectPhase", partyIndex);
      this.end();
      return false;
    }
    return false;
  }
}

  if (moveId === MoveId.TRICK) {
  const td: any = playerPokemon.turnData;

  if (!td.trickItemSelectedThisTurn) {
    td._trickCmdPending = { command, cursor, useMode, move };
    td._trickReturnFieldIndex = this.fieldIndex;

    // 흔적 제거
    playerPokemon.turnData.acted = false;
    delete globalScene.currentBattle.turnCommands[this.fieldIndex];
    delete globalScene.currentBattle.preTurnCommands[this.fieldIndex];

    const partyIndex = globalScene.getPlayerParty().findIndex(p => p.id === playerPokemon.id);
    if (partyIndex >= 0) {
      // ✅ getMoveTargets() 쓰지 말고 "상대 활성"에서 직접 고르기
      const enemies = globalScene.getEnemyField().filter(p => p?.isActive(true));
      const targetPokemon = enemies[0]; // 가장 앞 활성 1마리
      const targetIndex = targetPokemon?.getBattlerIndex();

      if (typeof targetIndex === "number") {
        globalScene.phaseManager.unshiftNew("TrickItemSelectPhase", partyIndex, targetIndex);
        this.end();
        return false;
      }

      // 타겟이 진짜 없으면 그냥 실패 처리
      this.end();
      return false;
    }

    return false;
  }
}

if (moveId === MoveId.NATURAL_GIFT) {
  const td: any = playerPokemon.turnData;

  const hasPick = td.naturalGiftReservedBerry != null; // + 필요하면 moveId까지 체크

  if (!hasPick) {
    td._naturalGiftCmdPending = { command, cursor, useMode, move };
    td._naturalGiftReturnFieldIndex = this.fieldIndex;

    playerPokemon.turnData.acted = false;
    delete globalScene.currentBattle.turnCommands[this.fieldIndex];
    delete globalScene.currentBattle.preTurnCommands[this.fieldIndex];

    const partyIndex = globalScene.getPlayerParty().findIndex(p => p.id === playerPokemon.id);
    if (partyIndex >= 0) {
      globalScene.phaseManager.unshiftNew("NaturalGiftBerrySelectPhase", partyIndex);
      this.end();
      return false;
    }

    return false;
  }
}

  // ---- 이하 기존 로직 그대로 ----
  const turnCommand: TurnCommand = {
    command: Command.FIGHT,
    cursor,
    move: { move: moveId, targets: [], useMode },
    args: [useMode, move],
  };
  const preTurnCommand: TurnCommand = {
    command,
    targets: [this.fieldIndex],
    skip: command === Command.FIGHT,
  };

  const moveTargets: MoveTargetSet =
    move === undefined
      ? getMoveTargets(playerPokemon, moveId)
      : {
          targets: move.targets,
          multiple: move.targets.length > 1,
        };

  if (moveId === MoveId.NONE) {
    turnCommand.targets = [this.fieldIndex];
  }

  if (moveTargets.targets.length > 1 && moveTargets.multiple) {
    globalScene.phaseManager.unshiftNew("SelectTargetPhase", this.fieldIndex);
  }

  if (turnCommand.move && (moveTargets.targets.length <= 1 || moveTargets.multiple)) {
    turnCommand.move.targets = moveTargets.targets;
  } else if (
    turnCommand.move
    && playerPokemon.getTag(BattlerTagType.CHARGING)
    && playerPokemon.getMoveQueue().length > 0
  ) {
    turnCommand.move.targets = playerPokemon.getMoveQueue()[0].targets;
  } else {
    globalScene.phaseManager.unshiftNew("SelectTargetPhase", this.fieldIndex);
  }

  globalScene.currentBattle.preTurnCommands[this.fieldIndex] = preTurnCommand;
  globalScene.currentBattle.turnCommands[this.fieldIndex] = turnCommand;
  if ((globalScene.currentBattle as any)?.isPracticeBattle) {
  console.log("[PRACTICE] player command set", {
    fieldIndex: this.fieldIndex,
    command: globalScene.currentBattle.turnCommands[this.fieldIndex],
  });
}
  return true;
}

  /**
   * Set the mode in preparation to show the text, and then show the text.
   * Only works for parameterless i18next keys.
   * @param key - The i18next key for the text to show
   */
  private queueShowText(key: string): void {
    globalScene.ui.setMode(UiMode.COMMAND, this.fieldIndex);
    globalScene.ui.setMode(UiMode.MESSAGE);

    globalScene.ui.showText(
      i18next.t(key),
      null,
      () => {
        globalScene.ui.showText("", 0);
        globalScene.ui.setMode(UiMode.COMMAND, this.fieldIndex);
      },
      null,
      true,
    );
  }

  /**
   * Helper method for {@linkcode handleBallCommand} that checks if a pokeball can be thrown
   * and displays the appropriate error message.
   *
   * @remarks
   * The pokeball may not be thrown if any of the following are true:
   * - It is a trainer battle
   * - The player is in the {@linkcode BiomeId.END | End} biome and
   *   - it is not classic mode; or
   *   - the player has not caught the target before and the player is still missing more than one starter
   * - The player is in a mystery encounter that disallows catching the pokemon
   * @returns Whether a pokeball can be thrown
   */
  private checkCanUseBall(): boolean {
    const { arena, currentBattle, gameData, gameMode } = globalScene;
    const { battleType } = currentBattle;
    const { biomeType } = arena;
    const { isClassic, isEndless, isDaily } = gameMode;
    const { dexData } = gameData;

    const isClassicFinalBoss = gameMode.isBattleClassicFinalBoss(globalScene.currentBattle.waveIndex);
    const isEndlessMinorBoss = gameMode.isEndlessMinorBoss(globalScene.currentBattle.waveIndex);
    const isFullFreshStart = gameMode.isFullFreshStartChallenge();
    const someUncaughtSpeciesOnField = globalScene
      .getEnemyField()
      .some(p => p.isActive() && !dexData[p.species.speciesId].caughtAttr);
    const missingMultipleStarters =
      gameData.getStarterCount(d => !!d.caughtAttr) < Object.keys(speciesStarterCosts).length - 1;

    if (biomeType === BiomeId.END && battleType === BattleType.WILD) {
      if (
        (isClassic && !isClassicFinalBoss && someUncaughtSpeciesOnField)
        || (isFullFreshStart && !isClassicFinalBoss)
        || (isEndless && !isEndlessMinorBoss)
      ) {
        // Uncatchable paradox mons in classic and endless
        this.queueShowText("battle:noPokeballForce");
      } else if (
        (isClassic && isClassicFinalBoss && missingMultipleStarters)
        || (isFullFreshStart && isClassicFinalBoss)
        || (isEndless && isEndlessMinorBoss)
        || isDaily
      ) {
        // Uncatchable final boss in classic, endless and daily
        this.queueShowText("battle:noPokeballForceFinalBoss");
      } else {
        return true;
      }
    } else if (battleType === BattleType.TRAINER) {
      this.queueShowText("battle:noPokeballTrainer");
    } else if (currentBattle.isBattleMysteryEncounter() && !currentBattle.mysteryEncounter!.catchAllowed) {
      this.queueShowText("battle:noPokeballMysteryEncounter");
    } else {
      return true;
    }

    return false;
  }

  /**
   * Helper method for {@linkcode handleCommand} that handles the logic when the selected command is to use a pokeball.
   *
   * @param cursor - The index of the pokeball to use
   * @returns Whether the command was successfully initiated
   */
  private handleBallCommand(cursor: number): boolean {
    const targets = globalScene
      .getEnemyField()
      .filter(p => p.isActive(true))
      .map(p => p.getBattlerIndex());

    if (!this.checkCanUseBall()) {
      return false;
    }

    if (targets.length > 1) {
      this.queueShowText("battle:noPokeballMulti");
      return false;
    }

    const isChallengeActive = globalScene.gameMode.hasAnyChallenges();
    const isFinalBoss = globalScene.gameMode.isBattleClassicFinalBoss(globalScene.currentBattle.waveIndex);

    const numBallTypes = 5;
    if (cursor < numBallTypes) {
      const targetPokemon = globalScene.getEnemyPokemon(false);
      if (
        targetPokemon?.isBoss()
        && targetPokemon?.bossSegmentIndex >= 1 // TODO: Decouple this hardcoded exception for wonder guard and just check the target...
        && !targetPokemon?.hasAbility(AbilityId.WONDER_GUARD, false, true)
      ) {
        // When facing the final boss, it must be weakened unless a Master Ball is used AND no challenges are active.
        // The message is customized for the final boss.
        if (
          isFinalBoss
          && (cursor < PokeballType.MASTER_BALL || (cursor === PokeballType.MASTER_BALL && isChallengeActive))
        ) {
          this.queueShowText("battle:noPokeballForceFinalBossCatchable");
          return false;
        }
        // When facing any other boss, Master Ball can always be used, and we use the standard message.
        if (cursor < PokeballType.MASTER_BALL) {
          this.queueShowText("battle:noPokeballStrong");
          return false;
        }
      }

      globalScene.currentBattle.turnCommands[this.fieldIndex] = {
        command: Command.BALL,
        cursor,
      };
      globalScene.currentBattle.turnCommands[this.fieldIndex]!.targets = targets;
      if (this.fieldIndex) {
        globalScene.currentBattle.turnCommands[this.fieldIndex - 1]!.skip = true;
      }
      return true;
    }

    return false;
  }

  /**
   * Submethod of {@linkcode tryLeaveField} to handle the logic for effects that prevent the pokemon from leaving the field
   * due to trapping abilities or effects.
   *
   * This method queues the proper messages in the case of trapping abilities or effects.
   *
   * @returns Whether the pokemon is currently trapped
   */
  private handleTrap(): boolean {
    const playerPokemon = this.getPokemon();
    const trappedAbMessages: string[] = [];
    const isSwitch = this.isSwitch;
    if (!playerPokemon.isTrapped(trappedAbMessages)) {
      return false;
    }
    if (trappedAbMessages.length > 0) {
      if (isSwitch) {
        globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
          globalScene.ui.showText(
            trappedAbMessages[0],
            null,
            () => {
              globalScene.ui.showText("", 0);
              if (isSwitch) {
                globalScene.ui.setMode(UiMode.COMMAND, this.fieldIndex);
              }
            },
            null,
            true,
          );
        });
      }
    } else {
      const trapTag = playerPokemon.getTag(TrappedTag);
      const fairyLockTag = globalScene.arena.getTagOnSide(ArenaTagType.FAIRY_LOCK, ArenaTagSide.PLAYER);

      if (!isSwitch) {
        globalScene.ui.setMode(UiMode.COMMAND, this.fieldIndex);
        globalScene.ui.setMode(UiMode.MESSAGE);
      }
      if (trapTag) {
        this.showNoEscapeText(trapTag, false);
      } else if (fairyLockTag) {
        this.showNoEscapeText(fairyLockTag, false);
      }
    }

    return true;
  }

  /**
   * Common helper method that attempts to have the pokemon leave the field.
   * Checks for trapping abilities and effects.
   *
   * @param cursor - The index of the option that the cursor is on
   * @returns Whether the pokemon is able to leave the field, indicating the command phase should end
   */
  private tryLeaveField(cursor?: number, isBatonSwitch = false): boolean {
    const currentBattle = globalScene.currentBattle;

    if (isBatonSwitch || !this.handleTrap()) {
      currentBattle.turnCommands[this.fieldIndex] = this.isSwitch
        ? {
            command: Command.POKEMON,
            cursor,
            args: [isBatonSwitch],
          }
        : {
            command: Command.RUN,
          };
      if (!this.isSwitch && this.fieldIndex) {
        currentBattle.turnCommands[this.fieldIndex - 1]!.skip = true;
      }
      return true;
    }

    return false;
  }

  /**
   * Helper method for {@linkcode handleCommand} that handles the logic when the selected command is RUN.
   *
   * @remarks
   * Checks if the player is allowed to flee, and if not, queues the appropriate message.
   *
   * The player cannot flee if:
   * - The player is in the {@linkcode BiomeId.END | End} biome
   * - The player is in a trainer battle
   * - The player is in a mystery encounter that disallows fleeing
   * - The player's pokemon is trapped by an ability or effect
   * @returns Whether the pokemon is able to leave the field, indicating the command phase should end
   */
  private handleRunCommand(): boolean {
    const { currentBattle, arena } = globalScene;
    const mysteryEncounterFleeAllowed = currentBattle.mysteryEncounter?.fleeAllowed ?? true;
    if (arena.biomeType === BiomeId.END || !mysteryEncounterFleeAllowed) {
      this.queueShowText("battle:noEscapeForce");
      return false;
    }
    if (
      currentBattle.battleType === BattleType.TRAINER
      || currentBattle.mysteryEncounter?.encounterMode === MysteryEncounterMode.TRAINER_BATTLE
    ) {
      this.queueShowText("battle:noEscapeTrainer");
      return false;
    }

    const success = this.tryLeaveField();

    return success;
  }

  /**
   * Show a message indicating that the pokemon cannot escape, and then return to the command phase.
   */
  private showNoEscapeText(tag: any, isSwitch: boolean): void {
    globalScene.ui.showText(
      i18next.t("battle:noEscapePokemon", {
        pokemonName:
          tag.sourceId && globalScene.getPokemonById(tag.sourceId)
            ? getPokemonNameWithAffix(globalScene.getPokemonById(tag.sourceId)!)
            : "",
        moveName: tag.getMoveName(),
        escapeVerb: i18next.t(isSwitch ? "battle:escapeVerbSwitch" : "battle:escapeVerbFlee"),
      }),
      null,
      () => {
        globalScene.ui.showText("", 0);
        if (!isSwitch) {
          globalScene.ui.setMode(UiMode.COMMAND, this.fieldIndex);
        }
      },
      null,
      true,
    );
  }

  // Overloads for handleCommand to provide a more specific signature for the different options
  /**
   * Process the command phase logic based on the selected command
   *
   * @param command - The kind of command to handle
   * @param cursor - The index of option that the cursor is on, or -1 if no option is selected
   * @param useMode - The mode to use for the move, if applicable. For switches, a boolean that specifies whether the switch is a Baton switch.
   * @param move - For {@linkcode Command.FIGHT}, the move to use
   * @returns Whether the command was successful
   */
  handleCommand(command: Command.FIGHT | Command.TERA, cursor: number, useMode?: MoveUseMode, move?: TurnMove): boolean;
  handleCommand(command: Command.POKEMON, cursor: number, useBaton: boolean): boolean;
  handleCommand(command: Command.BALL | Command.RUN, cursor: number): boolean;
  handleCommand(command: Command, cursor: number, useMode?: boolean | MoveUseMode, move?: TurnMove): boolean;

  public handleCommand(
    command: Command,
    cursor: number,
    useMode: boolean | MoveUseMode = false,
    move?: TurnMove,
  ): boolean {
    let success = false;

    switch (command) {
      case Command.TERA:
      case Command.FIGHT:
        success = this.handleFightCommand(command, cursor, typeof useMode === "boolean" ? undefined : useMode, move);
        break;
      case Command.BALL:
        success = this.handleBallCommand(cursor);
        break;
      case Command.POKEMON:
        this.isSwitch = true;
        success = this.tryLeaveField(cursor, typeof useMode === "boolean" ? useMode : undefined);
        this.isSwitch = false;
        break;
      case Command.RUN:
        success = this.handleRunCommand();
    }

    if (success) {
      this.end();
    }

    return success;
  }

  cancel() {
    if (this.fieldIndex) {
      globalScene.phaseManager.unshiftNew("CommandPhase", 0);
      globalScene.phaseManager.unshiftNew("CommandPhase", 1);
      this.end();
    }
  }

  getFieldIndex(): number {
    return this.fieldIndex;
  }

  getPokemon(): PlayerPokemon {
    return globalScene.getPlayerField()[this.fieldIndex];
  }

  end() {
    globalScene.ui.setMode(UiMode.MESSAGE).then(() => super.end());
  }
}
