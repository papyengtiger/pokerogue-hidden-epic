import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { MOVE_COLOR } from "#app/constants/colors";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import {
  BerryModifier,
  DanceMoveModifier,
  LegendPlateModifier,
  PreventBerryUseItemModifier,
} from "#app/modifier/modifier";
import Overrides from "#app/overrides";
import { PokemonPhase } from "#app/phases/pokemon-phase";
import { BideTag, CenterOfAttentionTag, FlinchedTag } from "#data/battler-tags";
import { getBerryName, TYPE_PRIORITY_BERRIES, TYPE_PRIORITY_TYPE_MAP } from "#data/berry";
import { SpeciesFormChangePreMoveTrigger } from "#data/form-change-triggers";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { getStatusEffectActivationText } from "#data/status-effect";
import { getTerrainBlockMessage } from "#data/terrain";
import { AbilityId } from "#enums/ability-id";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerIndex } from "#enums/battler-index";
import { BattlerTagLapseType } from "#enums/battler-tag-lapse-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { BerryType } from "#enums/berry-type";
import { ChallengeType } from "#enums/challenge-type";
import { CommonAnim } from "#enums/move-anims-common";
import { MoveCategory } from "#enums/move-category";
import { MoveFlags } from "#enums/move-flags";
import { MoveId } from "#enums/move-id";
import { MovePhaseTimingModifier } from "#enums/move-phase-timing-modifier";
import { MoveResult } from "#enums/move-result";
import { isIgnorePP, isIgnoreStatus, isReflected, isVirtual, MoveUseMode } from "#enums/move-use-mode";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { StatusEffect } from "#enums/status-effect";
import { BerryUsedEvent, MoveUsedEvent } from "#events/battle-scene";
import type { Pokemon } from "#field/pokemon";
import { applyMoveAttrs } from "#moves/apply-attrs";
import { frenzyMissFunc } from "#moves/move-utils";
import { NATURAL_GIFT_BERRY_TO_MOVE } from "#moves/natural-gift-utils";
import type { PokemonMove } from "#moves/pokemon-move";
import type { Move, PreUseInterruptAttr } from "#types/move-types";
import type { TurnMove } from "#types/turn-move";
import { applyChallenges } from "#utils/challenge-utils";
import { BooleanHolder, NumberHolder } from "#utils/common";
import { enumValueToKey } from "#utils/enums";
import { inSpeedOrder } from "#utils/speed-order-generator";
import i18next from "i18next";

export class MovePhase extends PokemonPhase {
  public readonly phaseName = "MovePhase";
  protected _pokemon: Pokemon;
  public move: PokemonMove;
  protected _targets: BattlerIndex[];
  public readonly useMode: MoveUseMode; // Made public for quash
  /** The timing modifier of the move (used by Quash and to force called moves to the front of their queue) */
  public timingModifier: MovePhaseTimingModifier;
  /** Whether the current move should fail but still use PP. */
  protected failed = false;
  /** Whether the current move should fail and retain PP. */
  protected cancelled = false;

  /** Flag set to `true` during {@linkcode checkFreeze} that indicates that the pokemon will thaw if it passes the failure conditions */
  private declare thaw?: boolean;
  private preUseInterruptMessageShown = false;
  private readonly monsterHouseVirtualUser: boolean;
  private endPhaseOnly(): void {
    super.end(); // MoveEndPhase 없이 종료
  }

  private consumeReservedPriorityBerry(): void {
    const user: any = this.pokemon;
    const td: any = user?.turnData;
    if (!td?.priorityBerryReserved) {
      return;
    }

    const moveId = this.move?.getMove?.().id ?? this.move?.moveId;
    if (td.priorityBerryReservedMoveId !== moveId) {
      delete td.priorityBerryReserved;
      delete td.priorityBerryReservedMoveId;
      return;
    }

    const berryType: BerryType = td.priorityBerryReserved;

    const opponents = user.getOpponents?.() ?? [];

    const hasPreventBerryUseItem = opponents.some((opp: any) =>
      globalScene
        .getModifiers(PreventBerryUseItemModifier, opp.isPlayer?.())
        .some((mod: any) => mod.pokemonId === opp.id),
    );

    const cancelled = new BooleanHolder(false);
    opponents.forEach((opp: any) => applyAbAttrs("PreventBerryUseAbAttr", { pokemon: opp, cancelled }));

    if (hasPreventBerryUseItem || cancelled.value) {
      delete td.priorityBerryReserved;
      delete td.priorityBerryReservedMoveId;
      return;
    }

    const target = globalScene
      .getModifiers(BerryModifier, user.isPlayer())
      .find(
        (m: any) => m instanceof BerryModifier && m.pokemonId === user.id && !m.consumed && m.berryType === berryType,
      ) as BerryModifier | undefined;

    if (!target) {
      delete td.priorityBerryReserved;
      delete td.priorityBerryReservedMoveId;
      return;
    }

    td.priorityItemActivated = true;
    td.priorityItemType = "PRIORITY_BERRY";
    td.forceActFirstThisTurn = true;

    const stack = target.stackCount ?? 1;

    if (stack > 1) {
      target.stackCount = stack - 1;
    } else {
      user.loseHeldItem(target);
    }

    globalScene.eventTarget.dispatchEvent(new BerryUsedEvent(target));
    globalScene.updateModifiers(user.isPlayer());

    delete td.priorityBerryReserved;
    delete td.priorityBerryReservedMoveId;

    // ✅ 메시지는 "지금 당장"이 아니라, 턴 메시지 큐에만 적재(OK)
    // queueMessage는 보통 안전하지만, 이것도 순서 꼬이면 MoveEndPhase로 미루는 게 더 안전
    if (berryType === BerryType.CUSTAP) {
      globalScene.phaseManager.queueMessage(
        i18next.t("battle:berryActivatedPriority", {
          pokemonName: getPokemonNameWithAffix(user),
          berryName: getBerryName(berryType),
        }),
      );
    } else if (TYPE_PRIORITY_BERRIES.has(berryType)) {
      const mappedType = TYPE_PRIORITY_TYPE_MAP[berryType];
      if (mappedType != null) {
        globalScene.phaseManager.queueMessage(
          i18next.t("battle:berryActivatedPriorityType", {
            pokemonName: getPokemonNameWithAffix(user),
            typeName: i18next.t(`pokemonInfo:type.${PokemonType[mappedType].toLowerCase()}`),
            berryName: getBerryName(berryType),
          }),
        );
      }
    }

    td.priorityBerryReserved = undefined;
    td.priorityBerryReservedMoveId = undefined;
  }

  /** The move history entry object that is pushed to the pokemon's move history
   *
   * @remarks
   * Can be edited _after_ being pushed to the history to adjust the result, targets, etc, for this move phase.
   */
  protected readonly moveHistoryEntry: TurnMove;

  public get pokemon(): Pokemon {
    return this._pokemon;
  }

  // TODO: Do we need public getters but only protected setters?
  protected set pokemon(pokemon: Pokemon) {
    this._pokemon = pokemon;
  }

  public get targets(): BattlerIndex[] {
    return this._targets;
  }

  protected set targets(targets: BattlerIndex[]) {
    this._targets = targets;
  }

  /**
   * Create a new MovePhase for using moves.
   * @param pokemon - The {@linkcode Pokemon} using the move
   * @param move - The {@linkcode PokemonMove} to use
   * @param useMode - The {@linkcode MoveUseMode} corresponding to this move's means of execution (usually `MoveUseMode.NORMAL`).
   * Not marked optional to ensure callers correctly pass on `useModes`.
   * @param timingModifier - The {@linkcode MovePhaseTimingModifier} for the move; Default {@linkcode MovePhaseTimingModifier.NORMAL}
   */
  constructor(
    pokemon: Pokemon,
    targets: BattlerIndex[],
    move: PokemonMove,
    useMode: MoveUseMode,
    timingModifier: MovePhaseTimingModifier = MovePhaseTimingModifier.NORMAL,
    monsterHouseVirtualUser = false,
  ) {
    const isMonsterHouseVirtualUser = monsterHouseManager.isActive() && !pokemon.isPlayer() && !pokemon.isActive(true);

    super(isMonsterHouseVirtualUser ? pokemon.id : pokemon.getBattlerIndex());

    this.pokemon = pokemon;
    this.targets = targets;
    this.move = move;
    this.useMode = useMode;
    this.timingModifier = timingModifier;
    this.monsterHouseVirtualUser = monsterHouseVirtualUser;

    this.moveHistoryEntry = {
      move: MoveId.NONE,
      targets,
      useMode,
    };
  }

  //#region Phase Start
  public start(): void {
    super.start();
    console.log("### MOVE_PHASE_START_MARKER_20260103 ###");
    console.log("[MovePhase START]", this.pokemon?.getName?.(), this.pokemon?.getBattlerIndex?.());

    // ✅ PURSUIT 교체 인터셉트: 교체가 먼저 일어나도 타겟을 "원래 나갈 포켓몬"으로 되돌림
    if (this.move?.moveId === MoveId.PURSUIT) {
      const battle: any = globalScene.currentBattle;
      const pending = battle.pendingSwitchOut ?? {};

      // Pursuit 사용자는 상대를 치므로, "상대편" pending을 봐야 함
      const opponentKey = this.pokemon.isPlayer() ? "player" : "enemy";
      const outgoingBI = pending[opponentKey];

      if (typeof outgoingBI === "number") {
        // ✅ 타겟을 교체 전 포켓몬으로 강제
        this.targets = [outgoingBI];

        // 디버그
        const outMon = globalScene.getField(true).find(p => p.getBattlerIndex() === outgoingBI);
        console.log("[PURSUIT][OVERRIDE] forced target battlerIndex=", outgoingBI, "name=", outMon?.getName?.());
      }
    }

    const user = this.pokemon;

    const isMonsterHouseVirtualUser = monsterHouseManager.isActive() && !user.isPlayer() && !user.isActive(true);

    if (!isMonsterHouseVirtualUser && !user.isActive(true)) {
      this.endPhaseOnly();
      return;
    }

    if (isMonsterHouseVirtualUser && user.isFainted()) {
      this.endPhaseOnly();
      return;
    }

    if (this.monsterHouseVirtualUser && (user.isFainted() || user.hp <= 0)) {
      this.endPhaseOnly();
      return;
    }

    // ✅ (1) 메탈버스트/카운터가 참고하는 "맞은 기록"이 남아있는지 확인
    console.log(
      "[DEBUG] attacksReceived=",
      user.turnData.attacksReceived?.map(a => ({
        move: a.move,
        damage: a.damage,
        sourceId: a.sourceId,
        sourceBI: a.sourceBattlerIndex,
      })),
    );

    // ✅ BIDE: 타겟/상태 확정은 어떤 resolve보다 먼저!
    if (this.move?.id === MoveId.BIDE) {
      const tag = user.getTag(BideTag);

      // 발사 턴: 마지막 공격자
      if (tag?.releasing && tag.lastAttackerIndex != null) {
        this.targets = [tag.lastAttackerIndex];
        console.log("[BIDE][MovePhase] pre-override targets ->", this.targets);
      } else {
        // 대기 턴(태그 붙이는 턴/참는 턴): 자기 자신으로 고정
        this.targets = [user.getBattlerIndex()];
      }
    }

    this.resolveRedirectTarget();
    this.resolveCounterAttackTarget();

    console.log("[DEBUG] raw this.targets=", JSON.stringify(this.targets));

    // ✅ (3) 이제 getActiveTargetPokemon() 호출해도 안전 (위에서 resolve 했으니까)
    const targets = this.getActiveTargetPokemon();
    console.log(
      "[DEBUG] activeTargets=",
      targets.map(t => ({ name: t.name, bi: t.getBattlerIndex() })),
    );

    const target0 = targets[0];

    const move = this.move.getMove();

    console.log(
      "[DEBUG] (start) user=",
      user.name,
      "cancelled=",
      this.cancelled,
      "user hasFlinch(enum)=",
      !!user.getTag(BattlerTagType.FLINCHED),
      "user hasFlinch(class)=",
      !!user.getTag(FlinchedTag),
    );

    console.log(
      "[DEBUG] (start) target0=",
      target0?.name,
      "target0 hasFlinch(enum)=",
      target0 ? !!target0.getTag(BattlerTagType.FLINCHED) : "no target",
      "target0 hasFlinch(class)=",
      target0 ? !!target0.getTag(FlinchedTag) : "no target",
    );

    const { useMode } = this;
    const ignoreStatus = isIgnoreStatus(useMode);
    const isFollowUp = useMode === MoveUseMode.FOLLOW_UP;

    console.log(
      `%cUser: ${user.name}`
        + `\nMove: ${MoveId[this.move.moveId]}`
        + `\nUse Mode: ${enumValueToKey(MoveUseMode, this.useMode)}`,
      `color:${MOVE_COLOR}`,
    );

    // Removing Glaive Rush's two flags happens before everything else
    user.removeTag(BattlerTagType.ALWAYS_GET_HIT);
    user.removeTag(BattlerTagType.RECEIVE_DOUBLE_DAMAGE);

    if (!ignoreStatus) {
      this.firstFailureCheck();
      console.log(
        "[DEBUG] after firstFailureCheck (post-check) user=",
        user.name,
        "cancelled=",
        this.cancelled,
        "hasFlinch=",
        !!user.getTag(BattlerTagType.FLINCHED),
      );

      user.lapseTags(BattlerTagLapseType.PRE_MOVE);
    } else if (isFollowUp) {
      this.followUpMoveFirstFailureCheck();
    }

    if (this.cancelled) {
      // (선택) 예약 정리
      const td: any = (this.pokemon as any).turnData;
      if (td) {
        td.priorityBerryReserved = undefined;
        td.priorityBerryReservedMoveId = undefined;
      }

      this.handlePreMoveFailures();
      this.endPhaseOnly();
      return;
    }

    applyMoveAttrs("MoveHeaderAttr", user, target0, move);

    console.log(
      "[PRIORITY_BERRY][MovePhase]",
      "before consume",
      "user=",
      user.name,
      "reserved=",
      (user as any).turnData?.priorityBerryReserved,
      "reservedMoveId=",
      (user as any).turnData?.priorityBerryReservedMoveId,
      "thisMove=",
      MoveId[this.move.moveId],
    );

    // ✅ 여기서만 소모
    this.consumeReservedPriorityBerry();

    if (!isFollowUp) {
      this.doThawCheck();
    }

    const pokemonMove = this.move;

    if (
      pokemonMove.getMove().doesFlagEffectApply({
        flag: MoveFlags.IGNORE_ABILITIES,
        user,
        isFollowUp: isVirtual(useMode),
      })
    ) {
      globalScene.arena.setIgnoreAbilities(true, user.getBattlerIndex());
    }

    // ✅ 기존 코드 흐름 유지 (중복 호출이어도 OK)
    this.resolveRedirectTarget();
    this.resolveCounterAttackTarget();

    const isChargingMove = move.isChargingMove();
    const charging = isChargingMove && !user.getTag(BattlerTagType.CHARGING);
    const releasing = isChargingMove && !charging;

    if (!move.hasAttr("CopyMoveAttr") && !isReflected(useMode)) {
      globalScene.currentBattle.lastMove = move.id;
    }

    if (!releasing) {
      this.usePP();
    }

    if (!isFollowUp) {
      globalScene.triggerPokemonFormChange(user, SpeciesFormChangePreMoveTrigger);
    }

    this.showMoveText();

    if (this.secondFailureCheck()) {
      this.handlePreMoveFailures();
      this.endPhaseOnly();
      return;
    }

    console.log("[PLAYER_BEFORE_USE_MOVE]", {
      user: user.getName?.(),
      move: this.move?.getName?.(),
      targets: this.targets,
      activeTargets: this.getActiveTargetPokemon().map(p => p.getName?.()),
      cancelled: this.cancelled,
      failed: this.failed,
    });

    if (!this.resolveFinalPreMoveCancellationChecks()) {
      user.turnData.acted = true;
      this.useMove(charging);
    }

    // ✅ BIDE(참기) 강제 유지: 태그 있으면 2턴 동안 어떤 기술을 골라도 행동 불가
    const bide = user.getTag(BideTag);
    if (bide && !bide.releasing && !bide.releaseDone) {
      const curTurn = globalScene.currentBattle.turn;
      const elapsed = curTurn - bide.startTurn;

      // startTurn(0) = 기술 사용한 턴
      // elapsed 1,2 = "참는 턴" → 무조건 행동 취소
      if (elapsed >= 1 && elapsed <= 2) {
        console.log("[BIDE][MovePhase] FORCE HOLD -> cancel this MovePhase");
        this.cancel();
        this.endPhaseOnly();
        return;
      }
    }

    // ✅ FLING 관련 플래그는 여기서 만지지 않는다
    // (턴 입력/선택은 CommandPhase에서만 처리)

    this.end();
  }
  //#endregion

  //#endregion Phase Start

  //#region First Failure Check

  /**
   * Perform the first round of move failure checks, occurring before move usage text is displayed
   * and PP is deducted.
   * @returns Whether the move failed during the check
   * @remarks
   * Based on battle mechanics research conducted primarily by Smogon, checks happen in the following order (as of Gen 9):
   * 1. Sleep/Freeze
   * 2. Disobedience due to overleveled (not implemented in Pokerogue)
   * 3. Insufficient PP after being selected
   * 4. (Pokerogue specific) Moves disabled because they are not implemented / prevented from a challenge / somehow have no targets
   * 5. Sky battle (see {@linkcode https://github.com/pagefaultgames/pokerogue/pull/5983 | PR#5983})
   * 6. Truant
   * 7. Focus Punch's loss of focus
   * 8. Flinch
   * 9. Move was disabled after being selected
   * 10. Healing move with heal block
   * 11. Sound move with throat chop
   * 12. Failure due to gravity
   * 13. Move lock from choice items / gorilla tactics
   * 14. Failure from taunt
   * 15. Failure from imprison
   * 16. Failure from confusion
   * 17. Failure from paralysis
   * 18. Failure from infatuation
   */
  protected firstFailureCheck(): boolean {
    // A big if statement will handle the checks (that each have side effects!) in the correct order
    return (
      this.checkSleep()
      || this.checkFreeze()
      || this.checkPP()
      || this.checkValidity()
      || this.checkTagCancel(BattlerTagType.TRUANT)
      || this.checkPreUseInterrupt()
      || this.checkTagCancel(BattlerTagType.FLINCHED)
      || this.checkTagCancel(BattlerTagType.DISABLED)
      || this.checkTagCancel(BattlerTagType.HEAL_BLOCK)
      || this.checkTagCancel(BattlerTagType.THROAT_CHOPPED)
      || this.checkGravity()
      || this.checkTagCancel(BattlerTagType.TAUNT)
      || this.checkTagCancel(BattlerTagType.IMPRISON)
      || this.checkTagCancel(BattlerTagType.CONFUSED)
      || this.checkPara()
      || this.checkTagCancel(BattlerTagType.INFATUATED)
    );
  }

  /**
   * Perform a subset of the checks done in {@linkcode firstFailureCheck}
   * for called moves.
   * @returns Whether the called move should fail
   *
   * @remarks
   * Based on smogon battle mechanics research, checks happen in the following order:
   * 1. Invalid move (skipped in pokerogue)
   * 2. Move prevented by heal block
   * 3. Move prevented by throat chop
   * 4. Gravity
   * 5. Sky Battle (See {@link https://github.com/pagefaultgames/pokerogue/pull/5983 | PR#5983})
   */
  protected followUpMoveFirstFailureCheck(): boolean {
    return (
      this.checkTagCancel(BattlerTagType.HEAL_BLOCK)
      || this.checkTagCancel(BattlerTagType.THROAT_CHOPPED)
      || this.checkGravity()
    );
  }

  /**
   * Handle the sleep check
   * @returns Whether the move was cancelled due to sleep
   */
  protected checkSleep(): boolean {
    const user = this.pokemon;
    if (user.status?.effect !== StatusEffect.SLEEP) {
      return false;
    }

    // For some reason, dancer will immediately wake its user from sleep when triggering
    if (this.useMode === MoveUseMode.INDIRECT) {
      user.resetStatus(false);
      return false;
    }

    user.status.incrementTurn();
    const turnsRemaining = new NumberHolder(user.status.sleepTurnsRemaining ?? 0);
    applyAbAttrs("ReduceStatusEffectDurationAbAttr", {
      pokemon: user,
      statusEffect: user.status.effect,
      duration: turnsRemaining,
    });

    user.status.sleepTurnsRemaining = turnsRemaining.value;
    if (user.status.sleepTurnsRemaining <= 0) {
      user.cureStatus(StatusEffect.SLEEP);
      return false;
    }

    const bypassSleepHolder = new BooleanHolder(false);
    applyMoveAttrs("BypassSleepAttr", this.pokemon, null, this.move.getMove(), bypassSleepHolder);
    const cancel = !bypassSleepHolder.value;
    this.triggerStatus(StatusEffect.SLEEP, cancel);
    return cancel;
  }

  /**
   * Handle the freeze status effect check
   *
   * @remarks
   * Responsible for the following
   * - Checking if the pokemon is frozen
   * - Checking if the pokemon will thaw from random chance, OR from a thawing move.
   *    Thawing from a freeze move is not applied until AFTER all other failure checks.
   * - Activating the freeze status effect (cancelling the move, playing the message, and displaying the animation)
   * @returns Whether the move was cancelled due to the pokemon being frozen
   */
  protected checkFreeze(): boolean {
    const pokemon = this.pokemon;
    if (pokemon.status?.effect !== StatusEffect.FREEZE) {
      return false;
    }

    // For some reason, dancer will immediately thaw its user
    if (this.useMode === MoveUseMode.INDIRECT) {
      pokemon.resetStatus(false);
      return false;
    }

    if (Overrides.STATUS_ACTIVATION_OVERRIDE) {
      return false;
    }

    // Check if the move will heal
    const move = this.move.getMove();
    if (
      move.findAttr(attr => attr.selfTarget && attr.is("HealStatusEffectAttr") && attr.isOfEffect(StatusEffect.FREEZE))
      && (move.id !== MoveId.BURN_UP || pokemon.isOfType(PokemonType.FIRE, true, true))
    ) {
      this.thaw = true;
      return false;
    }
    if (
      Overrides.STATUS_ACTIVATION_OVERRIDE === false
      || this.move
        .getMove()
        .findAttr(attr => attr.selfTarget && attr.is("HealStatusEffectAttr") && attr.isOfEffect(StatusEffect.FREEZE))
      || (!pokemon.randBattleSeedInt(5) && Overrides.STATUS_ACTIVATION_OVERRIDE !== true)
    ) {
      pokemon.cureStatus(StatusEffect.FREEZE);
      return false;
    }

    this.triggerStatus(StatusEffect.FREEZE);
    return true;
  }

  /**
   * Check if the move is usable based on PP
   * @returns Whether the move was cancelled due to insufficient PP
   */
  protected checkPP(): boolean {
    const move = this.move;
    if (move.getMove().pp !== -1 && !isIgnorePP(this.useMode) && move.ppUsed >= move.getMovePp()) {
      this.cancel();
      this.showFailedText();
      return true;
    }
    return false;
  }

  /**
   * Check if the move is valid and not in an error state
   *
   * @remarks
   * Checks occur in the following order
   * 1. Move is not implemented
   * 2. Move is somehow invalid (it is {@linkcode MoveId.NONE} or {@linkcode targets} is somehow empty)
   * 3. Move cannot be used by the player due to a challenge
   *
   * @returns Whether the move was cancelled due to being invalid
   */
  protected checkValidity(): boolean {
    const move = this.move;
    const moveId = move.moveId;
    const moveName = move.getName();
    let failedText: string | undefined;
    const usability = new BooleanHolder(false);
    if (moveName.endsWith(" (N)")) {
      failedText = i18next.t("battle:moveNotImplemented", { moveName: moveName.replace(" (N)", "") });
    } else if (moveId === MoveId.NONE || this.targets.length === 0) {
      this.cancel();

      const pokemonName = this.pokemon.name;
      const warningText =
        moveId === MoveId.NONE
          ? `${pokemonName} is attempting to use MoveId.NONE`
          : `${pokemonName} is attempting to use a move with no targets`;

      console.warn(warningText);

      return true;
    } else if (
      this.pokemon.isPlayer()
      && applyChallenges(ChallengeType.POKEMON_MOVE, moveId, usability) // check the value inside of usability after calling applyChallenges
      && !usability.value
    ) {
      failedText = i18next.t("battle:moveCannotUseChallenge", { moveName });
    } else {
      return false;
    }

    this.cancel();
    this.showFailedText(failedText);
    return true;
  }

  /**
   * Trigger a specific `BattlerTag` to conditionally cancel move execution.
   * Used by the first failure check to trigger certain kinds of interruptions before others.
   * @param tagType - The `BattlerTagType` to trigger; will be lapsed with `BattlerTagLapseType.PRE_MOVE`
   * @returns Whether the move was cancelled due to a `BattlerTag` effect
   */
  private checkTagCancel(tag: BattlerTagType): boolean {
    this.pokemon.lapseTag(tag, BattlerTagLapseType.PRE_MOVE);
    return this.cancelled;
  }

  /**
   * Check cancellations from a move's pre-use condition.
   * @returns Whether the move was cancelled due to a pre-use condition.
   * @remarks
   * Currently only used for Focus Punch.
   * @see {@linkcode PreUseInterruptAttr}
   */
  private checkPreUseInterrupt(): boolean {
    const move = this.move.getMove();
    const user = this.pokemon;
    const target = this.getActiveTargetPokemon()[0];

    if (!target) {
      return false;
    }

    for (const attr of move.getAttrs("PreUseInterruptAttr")) {
      if (attr.apply(user, target, move)) {
        if (!this.preUseInterruptMessageShown) {
          const failedText = (attr as any).getInterruptText?.(user, target, move);

          if (failedText) {
            globalScene.phaseManager.queueMessage(failedText);
          }

          this.preUseInterruptMessageShown = true;
        }

        this.cancel();
        return true;
      }
    }

    return false;
  }

  /**
   * Handle move failures due to Gravity.
   * @returns Whether the move was cancelled due to Gravity
   */
  private checkGravity(): boolean {
    const move = this.move.getMove();
    if (!globalScene.arena.hasTag(ArenaTagType.GRAVITY) || !move.hasFlag(MoveFlags.GRAVITY)) {
      return false;
    }

    this.showFailedText(
      i18next.t("battle:moveDisabledGravity", {
        pokemonNameWithAffix: getPokemonNameWithAffix(this.pokemon),
        moveName: move.name,
      }),
    );
    return true;
  }

  /**
   * Handle checking and activating the user's Paralysis status condition.
   * @returns Whether the move was cancelled due to the user being fully paralyzed.
   * Returns `false` if `user` is not paralyzed
   */
  private checkPara(): boolean {
    const user = this.pokemon;
    if (user.status?.effect !== StatusEffect.PARALYSIS) {
      return false;
    }

    const proc = Overrides.STATUS_ACTIVATION_OVERRIDE ?? user.randBattleSeedInt(4) === 0;
    if (!proc) {
      return false;
    }

    this.triggerStatus(StatusEffect.PARALYSIS);
    return true;
  }

  //#endregion First Failure Check

  //#region Second Failure Check

  /**
   * Attempt to thaw the user if it successfully uses a self-thawing move.
   */
  private doThawCheck(): void {
    const user = this.pokemon;

    if (isIgnoreStatus(this.useMode)) {
      return;
    }
    if (this.thaw) {
      user.cureStatus(
        StatusEffect.FREEZE,
        i18next.t("statusEffect:freeze.healByMove", {
          pokemonNameWithAffix: getPokemonNameWithAffix(user),
          moveName: this.move.getMove().name,
        }),
      );
    }
  }

  /**
   * Modify `this.targets` in place based on move redirection effects.
   */
  protected resolveRedirectTarget(): void {
    if (this.targets.length !== 1) {
      // Spread moves cannot be redirected
      return;
    }

    const currentTarget = this.targets[0];
    const redirectTarget = new NumberHolder(currentTarget);

    // check move redirection abilities of every pokemon *except* the user.
    // TODO: Make storm drain, lightning rod, etc, redirect at this point for type changing moves
    for (const pokemon of inSpeedOrder(ArenaTagSide.BOTH)) {
      if (pokemon !== this.pokemon) {
        applyAbAttrs("RedirectMoveAbAttr", {
          pokemon,
          moveId: this.move.moveId,
          targetIndex: redirectTarget,
          sourcePokemon: this.pokemon,
        });
      }
    }

    /** `true` if an Ability is responsible for redirecting the move to another target; `false` otherwise */
    let redirectedByAbility = currentTarget !== redirectTarget.value;

    // check for center-of-attention tags (note that this will override redirect abilities)
    this.pokemon.getOpponents(true).forEach(p => {
      const redirectTag = p.getTag(CenterOfAttentionTag);

      // TODO: don't hardcode this interaction.
      // Handle interaction between the rage powder center-of-attention tag and moves used by grass types/overcoat-havers (which are immune to RP's redirect)
      if (
        redirectTag
        && (!redirectTag.powder
          || (!this.pokemon.isOfType(PokemonType.GRASS) && !this.pokemon.hasAbility(AbilityId.OVERCOAT)))
      ) {
        redirectTarget.value = p.getBattlerIndex();
        redirectedByAbility = false;
      }
    });

    // TODO: Don't hardcode these ability interactions
    if (currentTarget !== redirectTarget.value) {
      const bypassRedirectAttrs = this.move.getMove().getAttrs("BypassRedirectAttr");
      bypassRedirectAttrs.forEach(attr => {
        if (!attr.abilitiesOnly || redirectedByAbility) {
          redirectTarget.value = currentTarget;
        }
      });

      if (this.pokemon.hasAbilityWithAttr("BlockRedirectAbAttr")) {
        redirectTarget.value = currentTarget;
        // TODO: Ability displays should be handled by the ability
        globalScene.phaseManager.queueAbilityDisplay(
          this.pokemon,
          this.pokemon.getPassiveAbility().hasAttr("BlockRedirectAbAttr"),
          true,
        );
        globalScene.phaseManager.queueAbilityDisplay(
          this.pokemon,
          this.pokemon.getPassiveAbility().hasAttr("BlockRedirectAbAttr"),
          false,
        );
      }

      this.targets[0] = redirectTarget.value;
    }
  }

  /**
   * Update the targets of any counter-attacking moves with `[`{@linkcode BattlerIndex.ATTACKER}`]` set
   * to reflect the actual battler index of the user's last attacker.
   *
   * If there is no last attacker or they are no longer on the field, a message is displayed and the
   * move is marked for failure
   */
  protected resolveCounterAttackTarget(): void {
    const targets = this.targets;
    if (targets.length !== 1 || targets[0] !== BattlerIndex.ATTACKER) {
      return;
    }

    const moveId = this.move.moveId;

    // ✅ BIDE 특례 처리
    if (moveId === MoveId.BIDE) {
      const tag = this.pokemon.getTag(BideTag) as BideTag | undefined;

      // 시작턴(태그 없거나 releasing=false): 태그를 붙이기 위해 "자기 자신"을 타겟으로
      if (!tag || !tag.releasing) {
        targets[0] = this.pokemon.getBattlerIndex();
        return;
      }

      // 방출턴(releasing=true): 마지막으로 때린 상대를 타겟으로
      const desired = tag.lastAttackerIndex;
      if (desired != null && desired !== this.pokemon.getBattlerIndex()) {
        targets[0] = desired;
        return;
      }

      // 공격자 못 찾으면 실패
      this.fail();
      return;
    }

    // ✅ 기존 CounterRedirectAttr 로직
    const targetHolder = new NumberHolder(BattlerIndex.ATTACKER);
    applyMoveAttrs("CounterRedirectAttr", this.pokemon, null, this.move.getMove(), targetHolder);
    targets[0] = targetHolder.value;

    if (targets[0] === BattlerIndex.ATTACKER) {
      this.fail();
    }
  }

  /**
   * Deduct PP from the move being used, accounting for Pressure and other effects.
   */
  protected usePP(): void {
    const battle = globalScene.currentBattle as any;

    if (battle?.isPracticeBattle && battle.practiceNoPpCost && this.pokemon?.isPlayer?.()) {
      console.log("[PRACTICE] PP use blocked");
      return;
    }

    if (!isIgnorePP(this.useMode)) {
      const move = this.move;
      const ppUsed = 1 + this.getPpIncreaseFromPressure(this.getActiveTargetPokemon());
      move.usePp(ppUsed);

      globalScene.eventTarget.dispatchEvent(new MoveUsedEvent(this.pokemon.id, move.getMove(), move.ppUsed));
    }
  }

  /**
   * Apply PP increasing abilities (currently only {@linkcode AbilityId.PRESSURE | Pressure})
   * on all target Pokemon.
   * @param targets - An array containing all active Pokemon targeted by this Phase's move
   * @returns The amount of extra PP consumed due to Pressure
   */
  // TODO: This hardcodes the PP increase at 1 per opponent, rather than deferring to the ability.
  // This is likely due to said ability being a stub...
  public getPpIncreaseFromPressure(targets: Pokemon[]): number {
    const foesWithPressure = this.pokemon
      .getOpponents(true)
      .filter(opponent => targets.includes(opponent) && opponent.hasAbilityWithAttr("IncreasePpAbAttr"));
    return foesWithPressure.length;
  }

  /**
   * Displays the move's usage text to the player as applicable for the move being used.
   */
  public showMoveText(): void {
    const pokemonMove = this.move;
    const moveId = pokemonMove.moveId;
    const pokemon = this.pokemon;
    if (
      moveId === MoveId.NONE
      || pokemon.getTag(BattlerTagType.RECHARGING)
      || pokemon.getTag(BattlerTagType.INTERRUPTED)
    ) {
      return;
    }
    // Showing move text always adjusts the move history entry's move id
    this.moveHistoryEntry.move = moveId;

    // TODO: This should be done by the move...
    globalScene.phaseManager.queueMessage(
      i18next.t(isReflected(this.useMode) ? "battle:magicCoatActivated" : "battle:useMove", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        moveName: pokemonMove.getName(),
      }),
      500,
    );

    // Moves with pre-use messages (Magnitude, Chilly Reception, Fickle Beam, etc.) always display their messages even on failure
    // TODO: This assumes single target for message funcs - is this sustainable?
    applyMoveAttrs("PreMoveMessageAttr", pokemon, this.getActiveTargetPokemon()[0], pokemonMove.getMove());
  }

  /**
   * Second failure check that occurs after the "Pokemon used move" text is shown but BEFORE the move has been registered
   * as being the last move used (for the purposes of something like Copycat)
   *
   * @remarks
   * Other than powder, each failure condition is mutually exclusive (as they are tied to specific moves), so order does not matter.
   * Notably, this failure check only includes failure conditions intrinsic to the move itself, other than Powder (which marks the end of this failure check)
   *
   *
   * - Pollen puff used on an ally that is under effect of heal block
   * - Burn up / Double shock when the user does not have the required type
   * - No Retreat while already under its effects
   * - Failure due to primal weather
   * - (on cart, not applicable to Pokerogue) Moves that fail if used ON a raid / special boss: selfdestruct/explosion/imprision/power split / guard split
   * - (on cart, not applicable to Pokerogue) Moves that fail during a "co-op" battle (like when Arven helps during raid boss): ally switch / teatime
   *
   * After all checks, Powder causing the user to explode
   */
  protected secondFailureCheck(): boolean {
    const move = this.move.getMove();
    const user = this.pokemon;
    const arena = globalScene.arena;

    const t0 = this.getActiveTargetPokemon()[0];

    console.log("[SEQ2][ENTER]", MoveId[move.id], "user=", user?.name, "t0=", t0?.name);

    const isDelayedAttackMove = move.id === MoveId.FUTURE_SIGHT || move.id === MoveId.DOOM_DESIRE;

    const okSeq2 = isDelayedAttackMove ? true : move.applyConditions(user, t0, 2);

    if (!okSeq2) {
      console.warn("[SEQ2][FAIL]", MoveId[move.id], "user=", user?.name, "t0=", t0?.name);
      this.failed = true;
    } else if (!isDelayedAttackMove && arena.isMoveWeatherCancelled(user, move)) {
      console.warn("[SEQ2][WEATHER_CANCEL]", MoveId[move.id], "weather=", arena.getWeatherType?.());
      this.failed = true;
    } else {
      user.lapseTag(BattlerTagType.POWDER, BattlerTagLapseType.PRE_MOVE);
      console.log("[SEQ2][PASS]", MoveId[move.id]);
      return this.failed;
    }

    if (this.failed) {
      this.showFailedText();
      return true;
    }

    return false;
  }

  //#endregion Second Failure Check

  //#region Move Execution

  /**
   * Check for cancellation edge cases - no targets remaining, or `MoveId.NONE` is in the queue
   * @returns Whether the move failed due to an edge case
   */
  // TODO: The first part of this check seems already covered in `checkValidity`...
  protected resolveFinalPreMoveCancellationChecks(): boolean {
    const targets = this.getActiveTargetPokemon();
    const moveQueue = this.pokemon.getMoveQueue();

    if (
      (targets.length === 0 && !this.move.getMove().hasAttr("AddArenaTrapTagAttr"))
      || (moveQueue.length > 0 && moveQueue[0].move === MoveId.NONE)
    ) {
      this.showFailedText();
      this.fail();
      // clear out 2 turn moves
      // TODO: Make a helper for this atp
      this.pokemon.getMoveQueue().shift();
      this.pokemon.pushMoveHistory(this.moveHistoryEntry);
      return true;
    }
    this.pokemon.lapseTags(BattlerTagLapseType.MOVE);
    return false;
  }

  /**
   * Clear out two turn moves, then schedule the move to be used if it passes
   * the third failure check.
   */
  protected useMove(charging = false): void {
    const user = this.pokemon;

    /* Clear out any two turn moves once they've been used.
    TODO: Refactor move queues and remove this assignment;
    Move queues should be handled by the calling `CommandPhase` or a manager for it */

    // @ts-expect-error - useMode is readonly and shouldn't normally be assigned to
    this.useMode = user.getMoveQueue().shift()?.useMode ?? this.useMode;

    if (!charging && user.getTag(BattlerTagType.CHARGING)?.sourceMove === this.move.moveId) {
      user.lapseTag(BattlerTagType.CHARGING);
    }

    if (this.thirdFailureCheck()) {
      return;
    }

    /*
    At this point, delayed moves (future sight, wish, doom desire) are issued, and, if they occur, the move animations are played.
    Then, combined pledge moves are checked for. Interestingly, the "wasMoveEffective" flag is set to false if the combined technique
    In either case, the phase should end here without proceeding
    */

    const move = this.move.getMove();
    const opponent = this.getActiveTargetPokemon()[0];

    /*
    After the third failure check, the move is "locked in"
    The following things now occur on cartridge
    - Heal Bell / Aromatherapy's custom message is queued (but displayed after the move text)
    - The message for combined pledge moves is queued
    - The custom message for fickle beam is queued
    - Gulp missile's form change is triggered IF the user is using dive (surf happens later)
    - Protean / Libero trigger the type change and flyout
    */

    // Currently, we only do the libero/protean type change here

    applyAbAttrs("PokemonTypeChangeAbAttr", { pokemon: user, move, opponent });
    // ✅ Legend Plate: 아이템(Modifier) 조회는 getHeldItems() 말고 getModifiers()로
    this.applyLegendPlateIfNeeded(user, move, opponent);

    // ✅ Legend Plate (PLA): Judgment 사용 시 move.type + Arceus 타입 변경
    this.applyLegendPlateIfNeeded(user, move, opponent);
    // TODO: Move this to the Move effect phase where it belongs.
    // Fourth failure check happens _after_ protean
    if (!move.applyConditions(user, opponent, 4)) {
      this.failMove();
      return;
    }

    if (charging) {
      this.chargeMove();
    } else {
      this.executeMove();
    }
  }

  /**
   * Third failure check is from moves and abilities themselves
   *
   * @returns Whether the move failed
   *
   * @remarks
   * - Anything in {@linkcode Move.conditionsSeq3}
   * - Weather blocking the move
   * - Terrain blocking the move
   * - Queenly Majesty / Dazzling
   * - Damp (which is handled by move conditions in pokerogue rather than the ability, like queenly majesty / dazzling)
   *
   * The rest of the failure conditions are marked as sequence 4 and *should* happen in the move effect phase (though happen here for now)
   */
  protected thirdFailureCheck(): boolean {
    /**
     * Move conditions assume the move has a single target
     * TODO: is this sustainable?
     */
    const move = this.move.getMove();
    const targets = this.getActiveTargetPokemon();
    const arena = globalScene.arena;
    const user = this.pokemon;

    const failsConditions = !move.applyConditions(user, targets[0], 3);
    const failedDueToTerrain = arena.isMoveTerrainCancelled(user, this.targets, move);
    let failed = failsConditions || failedDueToTerrain;

    // Apply queenly majesty / dazzling
    if (!failed) {
      const defendingSidePlayField = user.isPlayer() ? globalScene.getEnemyField() : globalScene.getPlayerField();
      const cancelled = new BooleanHolder(false);
      defendingSidePlayField.forEach((pokemon: Pokemon) => {
        applyAbAttrs("FieldPriorityMoveImmunityAbAttr", {
          pokemon,
          opponent: user,
          move,
          cancelled,
        });
      });
      failed = cancelled.value;
    }

    if (failed) {
      this.failMove(failedDueToTerrain);
      return true;
    }

    return false;
  }

  private trySnatchIntercept(user: Pokemon, move: Move, targets: BattlerIndex[]): boolean {
    if (!this.isSnatchableNow(user, move, targets)) {
      return false;
    }

    const snatcher = inSpeedOrder(ArenaTagSide.BOTH).find(
      p => p && p.isActive(true) && !p.isFainted() && p.id !== user.id && !!p.getTag(BattlerTagType.SNATCH_READY),
    );

    if (!snatcher) {
      return false;
    }

    // 소모
    snatcher.removeTag?.(BattlerTagType.SNATCH_READY);

    // 메시지
    globalScene.phaseManager.queueMessage(
      i18next.t("battle:snatch", { pokemonNameWithAffix: getPokemonNameWithAffix(snatcher) }),
    );

    // ✅ 원래 사용자: "기술은 가로채여서 실행되지 않음" → 실패 메시지는 X
    this.moveHistoryEntry.result = MoveResult.FAIL;
    user.pushMoveHistory(this.moveHistoryEntry);

    // ✅ snatcher가 기술 실행 (PP 소모 X)
    globalScene.phaseManager.unshiftNew(
      "MoveEffectPhase",
      snatcher.getBattlerIndex(),
      [snatcher.getBattlerIndex()],
      move,
      MoveUseMode.REFLECTED /* 없으면 IGNORE_PP */,
    );

    return true;
  }

  private isSnatchableNow(user: Pokemon, move: Move, targets: BattlerIndex[]): boolean {
    // 변화기만
    if (move.category !== MoveCategory.STATUS) {
      return false;
    }

    // 자기 자신 대상만 (targets가 유저 자기 자신으로 고정되어야 함)
    if (targets.length !== 1 || targets[0] !== user.getBattlerIndex()) {
      return false;
    }

    // 제외 목록(최소)
    switch (move.id) {
      case MoveId.SNATCH:
      case MoveId.PROTECT:
      case MoveId.DETECT:
      case MoveId.KING_S_SHIELD:
      case MoveId.SPIKY_SHIELD:
      case MoveId.BANEFUL_BUNKER:
        return false;
    }

    return true;
  }

  /** Execute the current move and apply its effects. */
  private executeMove() {
    const user = this.pokemon;

    // ✅ FOLLOW_UP 같은 "같은 턴 안의 추가 MovePhase"를 위해 멀티히트 카운터 초기화
    if (user?.turnData) {
      user.turnData.hitCount = 0;
      user.turnData.hitsLeft = -1;
      user.turnData.totalDamageDealt = 0;
      user.turnData.singleHitDamageDealt = 0;
    }

    // ✅ ME FIRST 차단 태그가 있으면 여기서 실패 처리
    const block = user.getTag?.(BattlerTagType.CUSTOM_ME_FIRST_INTERRUPTED as any) as MeFirstInterruptedTag | undefined;
    if (block && block.interruptedMove === MoveId.id) {
      globalScene.phaseManager.queueMessage(
        i18next.t("battle:meFirstBlocked", {
          pokemonNameWithAffix: getPokemonNameWithAffix(user),
        }),
      );

      // PP는 이미 usePP()에서 빠졌으니 fail이 자연스러움
      this.failMove(); // ✅ 실패 메시지/히스토리/태그정리까지 엔진 방식으로 처리
      return;
    }

    let move = this.move.getMove(); // ✅ const → let
    const targets = this.targets;

    // ✅ NATURAL GIFT면 여기서 proxy move로 바꾼 뒤 실행
    move = this.resolveNaturalGiftProxyMove(user, move);

    // ✅ 스내치는 "실제로 실행될 기술" 기준으로 판정하는 게 자연스러움
    if (this.trySnatchIntercept(user, move, targets)) {
      return; // 원래 사용자의 MoveEffectPhase는 실행 안 함
    }

    globalScene.phaseManager.unshiftNew("MoveEffectPhase", this.battlerIndex, targets, move, this.useMode);

    // Handle Dancer, which triggers immediately after a move is used (rather than waiting on `this.end()`).
    // Note the MoveUseMode check here prevents an infinite Dancer loop.
    // TODO: This needs to go at the end of `MoveEffectPhase` to check move results
    const dancerModes: MoveUseMode[] = [MoveUseMode.INDIRECT, MoveUseMode.REFLECTED] as const;
    if (this.move.getMove().hasFlag(MoveFlags.DANCE_MOVE) && !dancerModes.includes(this.useMode)) {
      globalScene.getField(true).forEach(pokemon => {
        // ✅ 무희 특성 (기존)
        applyAbAttrs("PostMoveUsedAbAttr", { pokemon, move: this.move, source: this.pokemon, targets: this.targets });

        // ✅ DanceMoveModifier (도구 버전)
        const mods = globalScene.findModifiers(
          m => m instanceof DanceMoveModifier && m.pokemonId === pokemon.id,
        ) as DanceMoveModifier[];

        for (const mod of mods) {
          mod.onPostMoveUsed({
            source: this.pokemon, // 춤을 쓴 쪽
            pokemon, // 따라 추는 쪽
            move: this.move, // 원본 기술
            targets: this.targets, // 대상
            simulated: false,
          });
        }
      });
    }
  }

  /**
   * Queue a {@linkcode MoveChargePhase} for this phase's invoked move.
   */
  protected chargeMove() {
    globalScene.phaseManager.unshiftNew(
      "MoveChargePhase",
      this.battlerIndex,
      this.targets[0],
      this.move,
      this.useMode === MoveUseMode.NORMAL ? MoveUseMode.IGNORE_PP : this.useMode,
    );
  }

  /**
   * Queue a {@linkcode MoveEndPhase} and then end this phase.
   */
  public end(): void {
    const td: any = (this.pokemon as any).turnData;
    if (td) {
      delete td._naturalGiftResolved;
      delete td._naturalGiftResolvedMoveId;
    }

    globalScene.phaseManager.unshiftNew(
      "MoveEndPhase",
      this.battlerIndex,
      this.getActiveTargetPokemon(),
      isVirtual(this.useMode),
    );

    super.end();
  }

  //#endregion Move Execution

  //#region Helpers

  /**
   * Handles the case where the move was cancelled or failed:
   * - Uses PP if the move failed (not cancelled) and should use PP (failed moves are not affected by {@linkcode AbilityId.PRESSURE | Pressure})
   * - Records a cancelled OR failed move in move history, so abilities like {@linkcode AbilityId.TRUANT | Truant} don't trigger on the
   *   next turn and soft-lock.
   * - Lapses `MOVE_EFFECT` tags:
   *   - Semi-invulnerable battler tags (Fly/Dive/etc.) are intended to lapse on move effects, but also need
   *     to lapse on move failure/cancellation.
   *
   *     TODO: ...this seems weird.
   * - Lapses `AFTER_MOVE` tags:
   *   - This handles the effects of {@linkcode MoveId.SUBSTITUTE | Substitute}
   * - Removes the second turn of charge moves
   */
  protected handlePreMoveFailures(): void {
    if (!this.cancelled && !this.failed) {
      return;
    }

    const pokemon = this.pokemon;

    if (this.cancelled && pokemon.summonData.tags.some(t => t.tagType === BattlerTagType.FRENZY)) {
      frenzyMissFunc(pokemon, this.move.getMove());
    }

    const moveHistoryEntry = this.moveHistoryEntry;
    // TODO: probably redundant; everything that sets `failed/cancelled` changes the history entry
    moveHistoryEntry.result = MoveResult.FAIL;
    pokemon.pushMoveHistory(moveHistoryEntry);

    pokemon.lapseTags(BattlerTagLapseType.MOVE_EFFECT);
    pokemon.lapseTags(BattlerTagLapseType.AFTER_MOVE);

    // This clears out 2 turn moves after they've been used
    // TODO: Remove post move queue refactor
    pokemon.getMoveQueue().shift();
  }

  /** Signifies the current move should fail but still use PP */
  public fail(): void {
    this.failed = true;
    this.moveHistoryEntry.result = MoveResult.FAIL;
  }

  /** Signifies the current move should cancel and retain PP */
  public cancel(): void {
    this.cancelled = true;
    this.moveHistoryEntry.result = MoveResult.FAIL;
  }

  /** @returns An array containing all on-field `Pokemon` targeted by this Phase's invoked move. */
  public getActiveTargetPokemon(): Pokemon[] {
    return globalScene.getField(true).filter(p => this.targets.includes(p.getBattlerIndex()));
  }

  /**
   * Display the text for a move failing to execute.
   * @param failedText - The failure text to display; defaults to `"battle:attackFailed"` locale key
   * ("But it failed!" in english)
   */
  public showFailedText(failedText = i18next.t("battle:attackFailed")): void {
    globalScene.phaseManager.queueMessage(failedText);
  }

  /**
   * Fail the move currently being used.
   * Handles failure messages, pushing to move history, etc.
   * @param failedDueToTerrain - Whether the move failed due to terrain (default `false`)
   */
  protected failMove(failedDueToTerrain = false) {
    const move = this.move.getMove();
    const targets = this.getActiveTargetPokemon();
    const pokemon = this.pokemon;

    // DO NOT CHANGE THE ORDER OF OPERATIONS HERE!
    // Protean is supposed to trigger its effects first, _then_ move text is displayed,
    // _then_ any blockage messages are shown.

    // Roar, Whirlwind, Trick-or-Treat, and Forest's Curse will trigger Protean/Libero
    // even on failure, as will all moves blocked by terrain.
    // TODO: Verify if this also applies to primal weather failures
    if (
      failedDueToTerrain
      || [MoveId.ROAR, MoveId.WHIRLWIND, MoveId.TRICK_OR_TREAT, MoveId.FORESTS_CURSE].includes(this.move.moveId)
    ) {
      applyAbAttrs("PokemonTypeChangeAbAttr", {
        pokemon,
        move,
        opponent: targets[0],
      });
    }

    pokemon.pushMoveHistory({
      move: move.id,
      targets: this.targets,
      result: MoveResult.FAIL,
      useMode: this.useMode,
    });

    // Use move-specific failure messages if present before checking terrain/weather blockage
    // and falling back to the classic "But it failed!".
    const failureMessage =
      move.getFailedText(pokemon, targets[0], move)
      || (failedDueToTerrain
        ? getTerrainBlockMessage(targets[0], globalScene.arena.getTerrainType())
        : i18next.t("battle:attackFailed"));

    this.showFailedText(failureMessage);

    // Remove the user from its semi-invulnerable state (if applicable)
    pokemon.lapseTags(BattlerTagLapseType.MOVE_EFFECT);
  }

  /**
   * Queue animations and messages for the user's status effect triggering,
   * optionally cancelling the move as well.
   * @param effect - The effect being triggered
   * @param cancel - Whether to additionally cancel the current move usage; default `true`.
   *   Used by sleep-bypassing moves
   */
  private triggerStatus(effect: StatusEffect, cancel = true): void {
    const pokemon = this.pokemon;
    globalScene.phaseManager.queueMessage(getStatusEffectActivationText(effect, getPokemonNameWithAffix(pokemon)));
    globalScene.phaseManager.unshiftNew(
      "CommonAnimPhase",
      pokemon.getBattlerIndex(),
      undefined,
      CommonAnim.POISON + (effect - 1), // offset anim # by effect #
    );
    if (cancel) {
      this.cancelled = true;
    }
  }

  private applyLegendPlateIfNeeded(user: Pokemon, move: Move, opponent?: Pokemon): void {
    if (!opponent) {
      return;
    }

    // 아르세우스 + 심판만
    if (user.getSpeciesForm(true).speciesId !== SpeciesId.ARCEUS) {
      return;
    }
    if (move.id !== MoveId.JUDGMENT) {
      return;
    }

    // 아이템 보유 확인
    const held = user.getHeldItems?.() ?? [];
    const plate = held.find(i => i instanceof LegendPlateModifier && i.type === ModifierType.LEGEND_PLATE) as
      | LegendPlateModifier
      | undefined;

    if (!plate) {
      return;
    }

    // moveType holder로 계산해서 move.type에 반영
    const moveTypeHolder = new NumberHolder(move.type);

    plate.tryApplyLegendPlate({
      user,
      target: opponent,
      move,
      moveTypeHolder,
      simulated: false, // 실제 실행 타이밍
    });

    // ✅ Move 객체 타입을 실제로 바꿔줘야 MoveEffectPhase/데미지 쪽이 그대로 따라감
    move.type = moveTypeHolder.value as PokemonType;
  }

  private resolveNaturalGiftProxyMove(user: Pokemon, baseMove: Move): Move {
    if (baseMove.id !== MoveId.NATURAL_GIFT) {
      return baseMove;
    }

    const td: any = user.turnData ?? (user.turnData = {});
    if (td._naturalGiftResolved) {
      // 같은 MovePhase 내 다중호출 방지
      const cached = td._naturalGiftResolvedMoveId;
      return cached ? (allMoves[cached] ?? baseMove) : baseMove;
    }
    td._naturalGiftResolved = true;

    const berryType: BerryType | undefined = td.naturalGiftReservedBerry;
    if (berryType == null) {
      this.failMove(); // or this.fail();
      return baseMove;
    }

    const mappedMoveId: MoveId | undefined = NATURAL_GIFT_BERRY_TO_MOVE[berryType];
    if (mappedMoveId == null || mappedMoveId === MoveId.NONE) {
      this.failMove();
      return baseMove;
    }

    // ✅ 실제로 그 베리를 들고 있는지 확인 (플레이어/적 pool 정확히)
    const berryMod = globalScene
      .getModifiers(BerryModifier, user.isPlayer())
      .find(
        (m: any) =>
          m instanceof BerryModifier
          && m.pokemonId === user.id
          && !m.consumed
          && (m.stackCount ?? 1) > 0
          && m.berryType === berryType,
      ) as BerryModifier | undefined;

    if (!berryMod) {
      this.failMove();
      return baseMove;
    }

    // ✅ 효과 발동 없이 1스택 소모
    const stack = berryMod.stackCount ?? 1;
    if (stack > 1) {
      berryMod.stackCount = stack - 1;
      globalScene.updateModifiers(user.isPlayer());
    } else {
      user.loseHeldItem(berryMod); // BerryModifier 제거
      globalScene.updateModifiers(user.isPlayer());
    }

    // ✅ 1회성 예약값 정리
    delete td.naturalGiftReservedBerry;
    delete td.naturalGiftReservedMoveId;

    // (선택) 디버그/캐시
    td._naturalGiftResolvedMoveId = mappedMoveId;

    return allMoves[mappedMoveId] ?? baseMove;
  }

  //#endregion Helpers
}
