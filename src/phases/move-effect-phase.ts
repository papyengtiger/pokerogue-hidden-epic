import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import {
  AbilityGuardItemModifier,
  BerryModifier,
  ContactDamageModifier,
  ContactHeldItemTransferChanceModifier,
  DamageMoneyRewardModifier,
  EnemyAttackStatusEffectChanceModifier,
  EnemyEndureChanceModifier,
  FlinchChanceModifier,
  HitHealModifier,
  IgnoreMoveEffectsItemModifier,
  MaxMultiHitModifier,
  MissEffectModifier,
  PokemonHeldItemModifier,
  PokemonMultiHitModifier,
  SoundBasedMoveSpecialAttackBoostModifier,
  SpeciesStatBoosterModifier,
  StackingRiskyPowerBoosterModifier,
  TypeImmunityModifier,
  TypeSpecificMoveBoosterModifier,
  UrshifuGloveAbilityBypassModifier,
} from "#app/modifier/modifier";
import type { Phase } from "#app/phase";
import { ConditionalProtectTag } from "#data/arena-tag";
import { isGMaxMove, isMaxMove } from "#data/balance/trs";
import { isExclusiveZCrystal, zmovesSpecies } from "#data/balance/zmoves";
import { MoveAnim } from "#data/battle-anims";
import { DamageProtectedTag, ProtectedTag, SemiInvulnerableTag, SubstituteTag, TypeBoostTag } from "#data/battler-tags";
import { SpeciesFormChangePostMoveTrigger } from "#data/form-change-triggers";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import type { TypeDamageMultiplier } from "#data/type";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { ArenaTagType } from "#enums/arena-tag-type";
import { BattlerIndex } from "#enums/battler-index";
import { BattlerTagLapseType } from "#enums/battler-tag-lapse-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { BerryType } from "#enums/berry-type";
import { HitCheckResult } from "#enums/hit-check-result";
import { HitResult } from "#enums/hit-result";
import { MoveCategory } from "#enums/move-category";
import { MoveEffectTrigger } from "#enums/move-effect-trigger";
import { MoveFlags } from "#enums/move-flags";
import { MoveId } from "#enums/move-id";
import { MoveResult } from "#enums/move-result";
import { MoveTarget } from "#enums/move-target";
import { isReflected, MoveUseMode } from "#enums/move-use-mode";
import { MultiHitType } from "#enums/multi-hit-type";
import { PokemonType } from "#enums/pokemon-type";
import { Stat } from "#enums/stat";
import { BerryUsedEvent } from "#events/battle-scene";
import type { Pokemon } from "#field/pokemon";
import { applyFilteredMoveAttrs, applyMoveAttrs } from "#moves/apply-attrs";
import type { Move, MoveAttr } from "#moves/move";
import { getMoveTargets, isFieldTargeted } from "#moves/move-utils";
import { PokemonMove } from "#moves/pokemon-move";
import { recordRecycleSnapshot } from "#moves/recycle-snapshot";
import { PokemonPhase } from "#phases/pokemon-phase";
import { DamageAchv } from "#system/achv";
import type { DamageResult } from "#types/damage-result";
import type { TurnMove } from "#types/turn-move";
import type { nil } from "#utils/common";
import { BooleanHolder, NumberHolder } from "#utils/common";
import i18next from "i18next";

export type HitCheckEntry = [HitCheckResult, TypeDamageMultiplier];

export class MoveEffectPhase extends PokemonPhase {
  public readonly phaseName = "MoveEffectPhase";
  public move: Move;
  protected targets: BattlerIndex[];
  protected useMode: MoveUseMode;

  /** The result of the hit check against each target */
  private hitChecks: HitCheckEntry[];

  private monsterHouseSpreadTargets: Pokemon[] | null = null;

  /**
   * Log to be entered into the user's move history once the move result is resolved.

   * Note that `result` logs whether the move was successfully
   * used in the sense of "Does it have an effect on the user?".
   */
  private moveHistoryEntry: TurnMove;

  /** Is this the first strike of a move? */
  private firstHit: boolean;
  /** Is this the last strike of a move? */
  private lastHit: boolean;

  /**
   * Phases queued during moves; used to add a new MovePhase for reflected moves after triggering.
   * TODO: Remove this and move the reflection logic to ability-side
   */
  private queuedPhases: Phase[] = [];

  /**
   * @param useMode - The {@linkcode MoveUseMode} corresponding to how this move was used.
   */
  constructor(
    battlerIndex: BattlerIndex,
    targets: BattlerIndex[] | any,
    move: Move,
    useMode: MoveUseMode = MoveUseMode.NORMAL,
    reflected = false,
    virtual = false,
  ) {
    super(battlerIndex);

    this.move = move;
    this.useMode = useMode;
    this.reflected = reflected;
    this.virtual = virtual;

    if (!Array.isArray(targets)) {
      console.warn("MoveEffectPhase constructor - invalid targets, resetting to []:", targets);
      this.targets = [];
    } else {
      if (targets.includes(battlerIndex) && this.move.moveTarget === MoveTarget.ALL_NEAR_OTHERS) {
        const i = targets.indexOf(battlerIndex);
        targets.splice(i, 1);
      }
      this.targets = targets;
    }

    this.hitChecks = new Array(this.targets.length).fill([HitCheckResult.PENDING, 0]);
  }

  private isMonsterHouseSpreadTarget(target: Pokemon): boolean {
    return this.monsterHouseSpreadTargets?.some(pokemon => pokemon.id === target.id) ?? false;
  }

  private getMonsterHouseSpreadTargets(user: Pokemon): Pokemon[] | null {
    // 이미 선정했다면 같은 대상을 그대로 사용
    if (this.monsterHouseSpreadTargets !== null) {
      return this.monsterHouseSpreadTargets;
    }

    if (!monsterHouseManager.isActive() || !user.isPlayer()) {
      return null;
    }

    let ratio: number | null = null;

    const moveId = this.move.id;

    // Z기술
    const isZMove = Object.prototype.hasOwnProperty.call(zmovesSpecies, moveId);

    const isExclusiveZMove = isZMove && isExclusiveZCrystal(moveId);

    // 다이맥스 / 거다이맥스 기술
    const isAnyMaxMove = isMaxMove(moveId);
    const isExclusiveGMaxMove = isAnyMaxMove && isGMaxMove(moveId);

    // 전용 Z / 전용 거다이맥스 → 75%
    if (isExclusiveZMove || isExclusiveGMaxMove) {
      ratio = 0.75;
    }
    // 일반 Z / 일반 다이맥스 → 50%
    else if (isZMove || isAnyMaxMove) {
      ratio = 0.5;
    }
    // 그 외 기존 광역기
    else {
      switch (this.move.moveTarget) {
        case MoveTarget.ALL_ENEMIES:
        case MoveTarget.ALL_NEAR_ENEMIES:
          ratio = 0.5;
          break;

        case MoveTarget.ALL_OTHERS:
        case MoveTarget.ALL_NEAR_OTHERS:
          ratio = 0.75;
          break;

        default:
          return null;
      }
    }

    const enemyParty = globalScene.getEnemyParty?.() ?? globalScene.currentBattle.enemyParty ?? [];

    const bossIndex = monsterHouseManager.getBossIndex();

    const bossReleased = monsterHouseManager.isBossReleased();

    const eligible = enemyParty.filter(pokemon => {
      if (!pokemon || pokemon.isFainted()) {
        return false;
      }

      if (!bossReleased && monsterHouseManager.isBossPokemon(pokemon)) {
        return false;
      }

      return true;
    });

    if (eligible.length === 0) {
      this.monsterHouseSpreadTargets = [];
      return this.monsterHouseSpreadTargets;
    }

    // 실제 필드에 있는 적은 반드시 포함
    const activeEnemy = eligible.find(pokemon => pokemon.isActive(true));

    const targetCount = eligible.length <= 3 ? eligible.length : Math.max(3, Math.ceil(eligible.length * ratio));

    const reserves = eligible.filter(pokemon => pokemon !== activeEnemy);

    // 전투 Seed를 사용하는 Fisher-Yates 셔플
    for (let i = reserves.length - 1; i > 0; i--) {
      const j = user.randBattleSeedInt(i + 1);

      [reserves[i], reserves[j]] = [reserves[j], reserves[i]];
    }

    const selected: Pokemon[] = [];

    if (activeEnemy) {
      selected.push(activeEnemy);
    }

    const remainingSlots = targetCount - selected.length;

    if (remainingSlots > 0) {
      selected.push(...reserves.slice(0, remainingSlots));
    }

    this.monsterHouseSpreadTargets = selected;

    console.log("[MONSTER_HOUSE_SPREAD_TARGETS]", {
      move: this.move.id,
      ratio,
      eligible: eligible.length,
      selected: selected.length,
      targets: selected.map(pokemon => ({
        id: pokemon.id,
        name: pokemon.name,
        active: pokemon.isActive(true),
      })),
    });

    return this.monsterHouseSpreadTargets;
  }

  /**
   * Compute targets and the results of hit checks of the invoked move against all targets,
   * organized by battler index.
   *
   * **This is *not* a pure function**; it has the following side effects
   * - `this.hitChecks` - The results of the hit checks against each target
   * - `this.moveHistoryEntry` - Sets success or failure based on the hit check results
   * - user.turnData.hitCount and user.turnData.hitsLeft - Both set to 1 if the
   *   move was unsuccessful against all targets
   *
   * @returns The targets of the invoked move
   * @see {@linkcode hitCheck}
   */
  private conductHitChecks(user: Pokemon, fieldMove: boolean): Pokemon[] {
    if (!this.moveHistoryEntry) {
      this.moveHistoryEntry = { result: MoveResult.FAIL } as any;
    }
    let anySuccess = false;
    let allMiss = true;

    const monsterHouseTargets = this.getMonsterHouseSpreadTargets(user);

    let targets = monsterHouseTargets ?? this.getTargets();

    // ✅ Dragon Darts: 히트마다 타겟을 1명으로 다시 고정하고 hitChecks 길이 동기화
    if (this.move?.id === MoveId.DRAGON_DARTS && !fieldMove) {
      const chosen = this.pickDragonDartsTarget(user);
      targets = chosen ? [chosen] : [];
      this.targets = targets.map(t => t.getBattlerIndex()); // 내부 battlerIndex 타겟도 동기화
      this.hitChecks = new Array(targets.length).fill([HitCheckResult.PENDING, 0]); // ✅ 길이 동기화
    }
    console.log(
      "[DD][conductHitChecks] hitCount/hitsLeft=",
      user.turnData.hitCount,
      user.turnData.hitsLeft,
      "targets=",
      targets.map(t => t.name),
    );

    for (const [i, target] of targets.entries()) {
      // ✅ 0) 타겟이 “회피반사 아이템(= SpeciesStatBoosterModifier 기반 옵션)”을 갖고 있는지
      const evMods = globalScene
        .getModifiers(SpeciesStatBoosterModifier)
        .filter(m => m.pokemonId === target.id) as SpeciesStatBoosterModifier[];

      // ✅ ODD_JAR만
      const hasOddJar = evMods.some(m => (m as any).getKey?.() === "ODD_JAR");

      const hasEvasionItem = hasOddJar;

      // ✅ 1) MISS 대비: "맞았다고 가정한" 프리뷰 데미지 계산 (회피 아이템 있을 때만)
      let previewDamage = 0;
      if (hasOddJar && this.move && this.move.category !== MoveCategory.STATUS) {
        try {
          const preview = target.getAttackDamage({
            source: user,
            move: this.move,
            simulated: true, // ✅ 프리뷰(부작용 최소)
            ignoreAbility: false,
            ignoreSourceAbility: false,
            ignoreAllyAbility: false,
            ignoreSourceAllyAbility: false,
            isCritical: false,
          });

          previewDamage = preview?.damage ?? 0;
          (target as any)._evasionReflectPreviewDamage = previewDamage;
        } catch (e) {
          console.error("[EVASION_REFLECT] preview damage calc failed", e);
          previewDamage = 0;
          delete (target as any)._evasionReflectPreviewDamage;
        }
      }

      const hitCheck = this.hitCheck(target);

      if ((globalScene.currentBattle as any)?.isPracticeBattle) {
        const practiceResult = (globalScene as any).practiceTurnResult;

        if (practiceResult) {
          const accuracyFactors: string[] = [];

          if (hitCheck[0] === HitCheckResult.MISS) {
            accuracyFactors.push("빗나감");

            if (user.isPlayer?.()) {
              practiceResult.playerMissCount++;
            } else {
              practiceResult.enemyMissCount++;
            }
          }

          if (hitCheck[0] === HitCheckResult.NO_EFFECT) {
            accuracyFactors.push("효과 없음");
          }

          if (hitCheck[0] === HitCheckResult.PROTECTED) {
            accuracyFactors.push("방어됨");
          }

          if (hitCheck[0] === HitCheckResult.REFLECTED) {
            accuracyFactors.push("반사됨");
          }

          if (accuracyFactors.length > 0) {
            if (user.isPlayer?.()) {
              practiceResult.playerAccuracyFactors ??= [];
              practiceResult.playerAccuracyFactors.push(...accuracyFactors);
            } else {
              practiceResult.enemyAccuracyFactors ??= [];
              practiceResult.enemyAccuracyFactors.push(...accuracyFactors);
            }
          }
        }
      }

      // ✅ 2) MISS면 반사: "프리뷰 데미지의 1/2"를 공격자에게 간접 데미지로
      if (hitCheck[0] === HitCheckResult.MISS && hasEvasionItem) {
        const stored = (target as any)._evasionReflectPreviewDamage ?? previewDamage;

        if (typeof stored === "number" && stored > 0) {
          const reflect = Math.max(1, Math.floor(stored / 2));

          // ✅ 메시지는 먼저 큐에 넣고
          globalScene.phaseManager.queueMessage(
            i18next.t("moveTriggers:evasionReflect", {
              pokemonName: getPokemonNameWithAffix(target),
              attackerName: getPokemonNameWithAffix(user),
            }),
          );

          // ✅ 안전하게 데미지 적용
          // - damageAndUpdate가 가끔 "기절/컨텍스트 없음"에서 예외를 던질 수 있어 fallback 처리
          try {
            // 기절이 날 정도면 damageAndUpdate가 더 위험한 경우가 많아서 우선 damage() 시도
            if (user.hp <= reflect && typeof (user as any).damage === "function") {
              (user as any).damage(reflect, { result: HitResult.INDIRECT });
            } else {
              user.damageAndUpdate(reflect, { result: HitResult.INDIRECT });
            }
          } catch (e) {
            console.error("[EVASION_REFLECT] damageAndUpdate crashed; fallback to damage()", e);
            try {
              if (typeof (user as any).damage === "function") {
                (user as any).damage(reflect, { result: HitResult.INDIRECT });
              } else {
                // 최후 fallback: 그래도 죽지 않게만(테스트용)
                user.hp = Math.max(0, user.hp - reflect);
              }
            } catch (e2) {
              console.error("[EVASION_REFLECT] fallback damage() also failed", e2);
            }
          }

          // 통계 누적이 필요하면
          user.turnData.damageTaken += reflect;
        }

        delete (target as any)._evasionReflectPreviewDamage;
      }

      // (기존 로직 그대로)
      if (fieldMove && hitCheck[0] === HitCheckResult.REFLECTED) {
        targets = [target];
        this.hitChecks = [hitCheck];
        break;
      }

      if (hitCheck[0] === HitCheckResult.HIT) {
        anySuccess = true;
      } else {
        allMiss ||= hitCheck[0] === HitCheckResult.MISS;
      }
      this.hitChecks[i] = hitCheck;
    }

    if (anySuccess) {
      this.moveHistoryEntry.result = MoveResult.SUCCESS;

      if (globalScene.arena.ignoreAbilities) {
        for (const target of targets) {
          // 1) target이 가진 AbilityGuard(들) 중에서
          const guards = target
            .getHeldItems()
            .filter(it => it instanceof AbilityGuardItemModifier) as AbilityGuardItemModifier[];

          if (guards.length === 0) {
            continue;
          }

          // 2) "공통 정책 통과"하는 가드가 하나라도 있으면 발동
          const hasActiveGuard = guards.some(g => g.shouldApply(target, target, false /* simulated */));

          console.log(`[DEBUG] ${target.name} AbilityGuard check`, {
            ignoreAbilities: globalScene.arena.ignoreAbilities,
            guardCount: guards.length,
            hasActiveGuard,
            magicRoom: globalScene.arena.hasTag(ArenaTagType.MAGIC_ROOM),
          });

          if (hasActiveGuard) {
            console.debug(`[DEBUG] ${target.name}의 AbilityGuard(유효) 발동 → ignoreAbilities 해제`);
            globalScene.arena.setIgnoreAbilities(false, user.getBattlerIndex());
            break;
          }
        }
      }
    } else {
      user.turnData.hitCount = 1;
      user.turnData.hitsLeft = 1;
      this.moveHistoryEntry.result = allMiss ? MoveResult.MISS : MoveResult.FAIL;
    }

    return targets;
  }

  /**
   * Queue the phaes that should occur when the target reflects the move back to the user
   * @param user - The {@linkcode Pokemon} using this phase's invoked move
   * @param target - The {@linkcode Pokemon} that is reflecting the move
   * TODO: Rework this to use `onApply` of Magic Coat
   */
  private queueReflectedMove(user: Pokemon, target: Pokemon): void {
    const newTargets = this.move.isMultiTarget()
      ? getMoveTargets(target, this.move.id).targets
      : [user.getBattlerIndex()];
    // TODO: ability displays should be handled by the ability
    if (!target.getTag(BattlerTagType.MAGIC_COAT)) {
      this.queuedPhases.push(
        globalScene.phaseManager.create(
          "ShowAbilityPhase",
          target.getBattlerIndex(),
          target.getPassiveAbility().hasAttr("ReflectStatusMoveAbAttr"),
        ),
      );
      this.queuedPhases.push(globalScene.phaseManager.create("HideAbilityPhase"));
    }

    this.queuedPhases.push(
      globalScene.phaseManager.create(
        "MovePhase",
        target,
        newTargets,
        new PokemonMove(this.move.id),
        MoveUseMode.REFLECTED,
      ),
    );
  }

  private applyToTargets(user: Pokemon, targets: Pokemon[]): void {
    let firstHit = true;

    for (const [i, target] of targets.entries()) {
      const [hitCheckResult, effectiveness] = this.hitChecks[i];

      switch (hitCheckResult) {
        case HitCheckResult.HIT: {
          this.applyMoveEffects(target, effectiveness, firstHit);

          // ✅ FLING 후처리: 맞았으면 아이템 소모
          if (this.move.id === MoveId.FLING) {
            const td: any = user.turnData;
            const flingItem = td?.flingItem as PokemonHeldItemModifier | undefined;

            if (flingItem) {
              user.loseHeldItem(flingItem, true);
            }

            td.flingItem = undefined;
            td.flingPower = 0;
            td.flingItemSelectedThisTurn = false;
            delete td._flingPending;
            td._flingCancelled = false;
            td._flingSelecting = false;
          }

          firstHit = false;
          if (isFieldTargeted(this.move)) {
            return;
          }
          break;
        }

        case HitCheckResult.NO_EFFECT:
          globalScene.phaseManager.queueMessage(
            i18next.t(this.move.id === MoveId.SHEER_COLD ? "battle:hitResultImmune" : "battle:hitResultNoEffect", {
              pokemonName: getPokemonNameWithAffix(target),
            }),
          );
        // fallthrough
        case HitCheckResult.NO_EFFECT_NO_MESSAGE:
        case HitCheckResult.PROTECTED:
        case HitCheckResult.TARGET_NOT_ON_FIELD:
          applyMoveAttrs("NoEffectAttr", user, target, this.move);
          break;

        case HitCheckResult.MISS:
          globalScene.phaseManager.queueMessage(
            i18next.t("battle:attackMissed", { pokemonNameWithAffix: getPokemonNameWithAffix(target) }),
          );
          applyMoveAttrs("MissEffectAttr", user, target, this.move);

          // ✅ MissEffectModifier (허탕보험)
          // ✅ MissEffectModifier (허탕보험)
          for (const modifier of globalScene.getModifiers(MissEffectModifier, user.isPlayer())) {
            if (modifier instanceof MissEffectModifier && modifier.pokemonId === user.id) {
              const success = modifier.apply(user, this.move);

              if (success) {
                globalScene.updateModifiers(user.isPlayer());
                user.updateInfo();
              }
            }
          }
          break;

        case HitCheckResult.REFLECTED:
          this.queueReflectedMove(user, target);
          break;

        case HitCheckResult.PENDING:
        case HitCheckResult.ERROR:
          throw new Error("Unexpected hit check result");
      }
    }
  }

  private getOpposingActiveBattlers(user: Pokemon): Pokemon[] {
    const list = user.isPlayer()
      ? (globalScene.getEnemyParty?.() ?? globalScene.currentBattle.enemyParty ?? [])
      : (globalScene.getPlayerParty?.() ?? globalScene.currentBattle.playerParty ?? []);

    return (list ?? []).filter(p => p?.isActive?.(true) && !p.isFainted());
  }

  private canBeDragonDartsTarget(user: Pokemon, target: Pokemon): boolean {
    const move = this.move;
    if (!move) {
      return false;
    }

    const fieldTargeted = isFieldTargeted(move);
    if (fieldTargeted) {
      return true;
    }

    // 1) 필드에 없으면 제외
    if (!target.isActive(true)) {
      return false;
    }

    // 2) 더블에서 커맨더로 인해 무조건 MISS 처리되는 케이스 제외
    if (
      globalScene.currentBattle.double
      && target.getAlly()?.getTag(BattlerTagType.COMMANDED)?.getSourcePokemon() === target
    ) {
      return false;
    }

    // 3) 반무적(공중날기/다이브/디그/고스트다이브 등) 제외
    const bypassAccAndInvuln = this.checkBypassAccAndInvuln(target);
    const semiInvulnerableTag = target.getTag(SemiInvulnerableTag);
    if (semiInvulnerableTag && !bypassAccAndInvuln && !this.checkBypassSemiInvuln(semiInvulnerableTag)) {
      return false;
    }

    // 4) 보호류 제외
    if (this.protectedCheck(user, target)) {
      return false;
    }

    // 5) 완전 무효(타입/특성/기타 면역) 제외
    const cancelNoEffectMessage = new BooleanHolder(false);
    const eff = target.getMoveEffectiveness(user, move, false, false, cancelNoEffectMessage);
    if (eff === 0) {
      return false;
    }

    // ✅ 여기까지면 “그 턴에 맞을 수는 있는 대상”
    return true;
  }

  private pickDragonDartsTarget(user: Pokemon): Pokemon | null {
    const td: any = user.turnData;
    const currentHit = user.turnData.hitCount - user.turnData.hitsLeft + 1;

    const candidates = this.getOpposingActiveBattlers(user);
    if (candidates.length === 0) {
      return null;
    }

    const canHitThisTurn = (t: Pokemon) => this.canBeDragonDartsTarget(user, t);

    const valid = candidates.filter(canHitThisTurn);
    if (valid.length === 0) {
      return null;
    }

    const firstIdx: number | undefined = td.dragonDartsFirstTargetIndex;

    // ✅ 2타 이후: 다른 쪽이 유효하면 무조건 다른 쪽 우선
    if (currentHit >= 2 && firstIdx != null && candidates.length >= 2) {
      const other = valid.find(p => p.getBattlerIndex() !== firstIdx);

      if (other) {
        if (currentHit === user.turnData.hitCount) {
          delete td.dragonDartsFirstTargetIndex;
        }
        return other;
      }

      // 다른 쪽이 무효/방어/반무적이면 같은 쪽 2타 허용
      const same = valid.find(p => p.getBattlerIndex() === firstIdx) ?? valid[0];

      if (currentHit === user.turnData.hitCount) {
        delete td.dragonDartsFirstTargetIndex;
      }

      return same;
    }

    // ✅ 1타: 선택된 대상이 유효하면 그 대상 우선, 아니면 유효 후보 첫 번째
    const preferred = this.getFirstTarget();
    const preferredOk = preferred && valid.some(p => p.id === preferred.id) ? preferred : null;

    const chosen = preferredOk ?? valid[0];

    if (currentHit === 1 && chosen) {
      td.dragonDartsFirstTargetIndex = chosen.getBattlerIndex();
    }

    return chosen;
  }

  public override start(): void {
    super.start();

    const user = this.getUserPokemon();
    if (!user) {
      this.end();
      return;
    }

    const move = this.move;
    const battleTurn = globalScene.currentBattle.turn;
    const td: any = user.turnData;

    // ✅ Dragon Darts: 한 "사용"당 최대 2번만 처리하도록 가드
    if (move?.id === MoveId.DRAGON_DARTS) {
      // 이번 턴/이번 사용에서 카운터 초기화
      // (hitsLeft가 리셋돼도 ddShotsDone으로 막아버림)
      if (td.ddTurn !== battleTurn || td.ddMoveId !== MoveId.DRAGON_DARTS) {
        td.ddTurn = battleTurn;
        td.ddMoveId = MoveId.DRAGON_DARTS;
        td.ddShotsDone = 0;
      }

      // 이미 2발 처리했으면: 추가로 큐잉된 MoveEffectPhase는 그냥 종료
      if (td.ddShotsDone >= 2) {
        console.warn("[DD] extra MoveEffectPhase ignored", {
          hitCount: td.hitCount,
          hitsLeft: td.hitsLeft,
          shotsDone: td.ddShotsDone,
        });
        this.end();
        return;
      }

      td.ddShotsDone++;

      // (선택) 여기서도 hitsLeft를 강제로 맞춰주면 더 안정적입니다
      // td.hitCount = 2;
      // td.hitsLeft = 2 - (td.ddShotsDone - 1);
    }

    const fieldMove = isFieldTargeted(this.move);

    const isMonsterHouseSpread =
      monsterHouseManager.isActive()
      && user.isPlayer()
      && (this.move.moveTarget === MoveTarget.ALL_ENEMIES
        || this.move.moveTarget === MoveTarget.ALL_NEAR_ENEMIES
        || this.move.moveTarget === MoveTarget.ALL_OTHERS
        || this.move.moveTarget === MoveTarget.ALL_NEAR_OTHERS);

    if (isMonsterHouseSpread && !monsterHouseManager.isSpreadAttackResolving()) {
      monsterHouseManager.beginSpreadAttack();
    }

    // ✅ moveHistoryEntry 방어
    if (!this.moveHistoryEntry) {
      this.moveHistoryEntry = { result: MoveResult.FAIL } as any;
    }

    // ✅ Dragon Darts 멀티히트 보정 (hitCount/hitsLeft가 0/-1로 들어오는 케이스 대응)
    if (this.move?.id === MoveId.DRAGON_DARTS) {
      if (!user.turnData.hitCount || user.turnData.hitCount <= 0) {
        user.turnData.hitCount = 2;
      }
      if (!user.turnData.hitsLeft || user.turnData.hitsLeft <= 0) {
        user.turnData.hitsLeft = user.turnData.hitCount;
      }
    }

    // ✅ Dragon Darts: 이번 히트 대상 1명으로 강제 (hitChecks 만들기 전에!)
    if (this.move?.id === MoveId.DRAGON_DARTS && !fieldMove) {
      const chosen = this.pickDragonDartsTarget(user);
      this.targets = chosen ? [chosen.getBattlerIndex()] : [];
      this.hitChecks = new Array(this.targets.length).fill([HitCheckResult.PENDING, 0] as any);
    }

    console.log("[MEP] start begin", {
      move: this.move?.id,
      targets: this.targets,
      hitCount: user.turnData?.hitCount,
      hitsLeft: user.turnData?.hitsLeft,
      fieldMove,
    });

    const resolvedTargets = this.conductHitChecks(user, fieldMove);

    if (resolvedTargets.length === 0) {
      this.end();
      return;
    }

    /** If an enemy used this move, set this as last enemy that used move or ability */
    if (!user.isPlayer()) {
      globalScene.currentBattle.lastEnemyInvolved = this.fieldIndex;
    } else {
      globalScene.currentBattle.lastPlayerInvolved = this.fieldIndex;
    }

    // ✅ move 유효성 체크 (가장 위에서!)
    if (!move || typeof (move as any).getAttrs !== "function") {
      console.warn("[MoveEffectPhase.start] move is undefined/invalid", {
        move,
        fieldIndex: this.fieldIndex,
        useMode: this.useMode,
        userId: user.id,
        lastMove: user.getLastXMoves?.(1)?.[0],
        turnMove: (user as any)?.turnData?.move,
      });
      this.end();
      return;
    }

    /**
     * Does an effect from this move override other effects on this turn?
     * e.g. Charging moves (Fly, etc.) on their first turn of use.
     */
    const overridden = new BooleanHolder(false);

    // Apply effects to override a move effect.
    // Assuming single target here works as this is (currently)
    // only used for Future Sight, calling and Pledge moves.
    // TODO: change if any other move effect overrides are introduced
    applyMoveAttrs("OverrideMoveEffectAttr", user, this.getFirstTarget() ?? null, move, overridden, this.useMode);

    // If other effects were overriden, stop this phase before they can be applied
    if (overridden.value) {
      this.end();
      return;
    }

    // Lapse `MOVE_EFFECT` effects (i.e. semi-invulnerability) when applicable
    user.lapseTags(BattlerTagLapseType.MOVE_EFFECT);

    // If the user is acting again (such as due to Instruct or Dancer), reset hitsLeft/hitCount and
    // recalculate hit count for multi-hit moves.
    if (user.turnData.hitsLeft === 0 && user.turnData.hitCount > 0 && user.turnData.extraTurns > 0) {
      user.turnData.hitsLeft = -1;
      user.turnData.hitCount = 0;
      user.turnData.extraTurns--;
    }

    /**
     * If this phase is for the first hit of the invoked move,
     * resolve the move's total hit count. This block combines the
     * effects of the move itself, Parental Bond, and Multi-Lens to do so.
     */
    if (user.turnData.hitsLeft === -1) {
      const hitCount = new NumberHolder(1);

      // ✅ Dragon Darts 특례: 타겟 모드에 따라 hitCount를 고정한다
      if (move.id === MoveId.DRAGON_DARTS) {
        const foes: Pokemon[] = user.isPlayer()
          ? (globalScene.currentBattle.enemyParty ?? []).filter(p => p?.isActive?.(true) && !p.isFainted())
          : (globalScene.currentBattle.playerParty ?? []).filter(p => p?.isActive?.(true) && !p.isFainted());

        const valid = foes.filter(t => {
          const cancel = new BooleanHolder(false);
          return t.getMoveEffectiveness(user, move, false, false, cancel) !== 0;
        });

        // 더블 + 유효 2명 이상이면: “광역(타겟2명)”이므로 hitCount는 1만
        // 아니면: 단일이므로 2발
        hitCount.value = globalScene.currentBattle.double && valid.length >= 2 ? 1 : 2;

        user.turnData.hitCount = hitCount.value;
        user.turnData.hitsLeft = hitCount.value;
        return; // ✅ 아래 일반 멀티히트/부모사랑/멀티렌즈 로직이 끼지 않게 여기서 끊는 게 핵심
      }

      // 1️⃣ MultiHitAttr 적용 (랜덤 타수 결정)
      applyMoveAttrs("MultiHitAttr", user, this.getFirstTarget() ?? null, move, hitCount);

      // 2️⃣ Parental Bond 적용
      applyAbAttrs("AddSecondStrikeAbAttr", { pokemon: user, move, hitCount });

      // 3️⃣ MaxMultiHitModifier / Loaded Dice 여부 먼저 확인
      const loadedDice = globalScene.getModifiers(MaxMultiHitModifier).find(mod => mod.pokemonId === user.id);

      if (loadedDice) {
        // 속임수주사위 → MultiHitAttr 최대치로 강제
        const multiHitAttr = move.getAttrs("MultiHitAttr")[0];
        if (multiHitAttr) {
          // getMaxHitCount() 메서드가 있으면 그걸 쓰고, 아니면 직접 계산
          const maxHits = multiHitAttr.getMaxHitCount
            ? multiHitAttr.getMaxHitCount()
            : multiHitAttr.getMultiHitType() === MultiHitType._2_TO_5
              ? 5
              : hitCount.value;

          console.debug(`[DEBUG] Loaded Dice 발동: 랜덤타격 → ${maxHits}회로 고정`);
          hitCount.value = maxHits;
        }
      } else {
        // 4️⃣ Loaded Dice 없을 때만 MultiHitModifier 적용
        globalScene.applyModifiers(PokemonMultiHitModifier, user.isPlayer(), user, move.id, hitCount);
      }

      // 5️⃣ 최종 타격 횟수 확정
      user.turnData.hitCount = hitCount.value;
      user.turnData.hitsLeft = hitCount.value;
    }

    this.moveHistoryEntry = {
      move: this.move.id,
      targets: this.targets,
      result: MoveResult.PENDING,
      useMode: this.useMode,
    };

    // ✅ Dragon Darts: hit-by-hit 단일 타겟팅을 먼저 확정
    if (move.id === MoveId.DRAGON_DARTS && !fieldMove) {
      const chosen = this.pickDragonDartsTarget(user); // (아래에 함수 예시)
      this.targets = chosen ? [chosen.getBattlerIndex()] : [];
    }

    // 이제 “현재 this.targets” 기준으로 hitCheck를 다시 만든다
    const targets = this.conductHitChecks(user, fieldMove);

    this.firstHit = user.turnData.hitCount === user.turnData.hitsLeft;
    this.lastHit = user.turnData.hitsLeft === 1 || !targets.some(t => t.isActive(true));

    // Play the animation if the move was successful against any of its targets or it has a POST_TARGET effect (like self destruct)
    // ✅ 먼저 move 유효성 체크
    if (!move || typeof move.getAttrs !== "function") {
      console.warn("[MoveEffectPhase.start] move is invalid or missing getAttrs, skipping phase", move);
      this.end();
      return;
    }

    if (
      this.moveHistoryEntry.result === MoveResult.SUCCESS
      || (Array.isArray(move.getAttrs("MoveEffectAttr"))
        && move.getAttrs("MoveEffectAttr").some(attr => attr.trigger === MoveEffectTrigger.POST_TARGET))
    ) {
      // ✅ 주얼 메시지: 실제 기술 실행 직전에만 출력
      if (this.firstHit && this.move.category !== MoveCategory.STATUS) {
        const moveType = user.getMoveType(this.move, true);

        const booster = globalScene
          .getModifiers(TypeSpecificMoveBoosterModifier, user.isPlayer())
          .find(mod => mod.pokemonId === user.id && mod.moveType === moveType) as
          | TypeSpecificMoveBoosterModifier
          | undefined;

        const hasHitTarget = this.hitChecks.some(([result]) => result === HitCheckResult.HIT);

        if (booster && hasHitTarget && !(user.turnData as any).typeSpecificMoveBoosterMessageShown) {
          (user.turnData as any).typeSpecificMoveBoosterMessageShown = true;

          globalScene.phaseManager.queueMessage(
            i18next.t("modifier:typeSpecificMoveBoostApply", {
              pokemonNameWithAffix: getPokemonNameWithAffix(user),
              itemName: booster.type.name,
            }),
          );
        }
      }

      const firstTarget = this.getFirstTarget();
      const currentMove = move; // ✅ move를 안전하게 캡처

      new MoveAnim(
        currentMove.id as Moves,
        user,
        firstTarget?.getBattlerIndex() ?? BattlerIndex.ATTACKER,
        // Field moves and some moves used in mystery encounters should be played even on an empty field
        fieldMove || (globalScene.currentBattle?.mysteryEncounter?.hasBattleAnimationsWithoutTargets ?? false),
      ).play(
        currentMove.hitsSubstitute(user, firstTarget),
        () => this.postAnimCallback(user, targets, currentMove), // ✅ 캡처한 move 전달
      );

      return;
    }

    // move 유효하지만 조건에 해당하지 않으면 그냥 후처리 콜백 호출
    this.postAnimCallback(user, targets, move);
  }

  /**
   * Callback to be called after the move animation is played
   */
  private postAnimCallback(user: Pokemon, targets: Pokemon[]) {
    // (기존) 히스토리 푸시
    if (this.firstHit && this.useMode !== MoveUseMode.DELAYED_ATTACK) {
      user.pushMoveHistory(this.moveHistoryEntry);
      applyAbAttrs("ExecutedMoveAbAttr", { pokemon: user });
    }

    try {
      this.applyToTargets(user, targets);
    } catch (e: any) {
      console.warn("[MoveEffectPhase] crashed:", e);
      console.warn(e?.stack);
      this.end();
      return;
    }

    // ✅ (중요) 멀티히트 이어가기 - 드래곤애로는 타겟을 매번 재선정해야 함
    if (this.move.id === MoveId.DRAGON_DARTS) {
      const hitsLeft = user.turnData?.hitsLeft ?? 0;

      // hitsLeft가 1이면 "다음 타(2타)가 남아있음"인 엔진이 많음
      // 지금 로그에서도 KO 직후 hitsLeft=1이었음.
      if (hitsLeft > 0) {
        const enemies = user.isPlayer()
          ? (globalScene.getEnemyField?.(true)
            ?? globalScene.getEnemyParty?.()
            ?? globalScene.currentBattle.enemyParty
            ?? [])
          : (globalScene.getPlayerField?.(true)
            ?? globalScene.getPlayerParty?.()
            ?? globalScene.currentBattle.playerParty
            ?? []);

        const hasAlive = enemies.some(p => p?.isActive?.(true) && !p.isFainted?.());

        if (hasAlive) {
          // 다음 히트용 MoveEffectPhase를 즉시 이어서 실행
          globalScene.phaseManager.unshiftNew(
            "MoveEffectPhase",
            user.getBattlerIndex(),
            this.targets,
            this.move,
            this.useMode,
            this.reflected,
            this.virtual,
          );

          this.end();
          return;
        }
      }
    }

    // (기존) 스텔라 타입 처리 등
    const moveType = user.getMoveType(this.move, true);
    if (this.move.category !== MoveCategory.STATUS && !user.stellarTypesBoosted.includes(moveType)) {
      user.stellarTypesBoosted.push(moveType);
    }

    if (this.lastHit) {
      this.triggerMoveEffects(MoveEffectTrigger.POST_TARGET, user, null);
    }

    this.updateSubstitutes();

    // 몬스터소굴 광역 공격의 모든 대상 적용이 끝났으면
    // 기절 처리 이후 실행될 마무리 Phase를 예약
    if (monsterHouseManager.isActive() && monsterHouseManager.isSpreadAttackResolving() && this.lastHit) {
      const alreadyQueued = globalScene.phaseManager.hasPhaseOfType("MonsterHouseSpreadEndPhase");

      if (!alreadyQueued) {
        globalScene.phaseManager.pushNew("MonsterHouseSpreadEndPhase");

        console.log("[MONSTER_HOUSE_SPREAD_END_QUEUED]", {
          move: this.move.id,
          remaining: monsterHouseManager.getRemainingEnemies(),
        });
      }
    }
    this.end();
  }

  public override end(): void {
    const user = this.getUserPokemon();
    if (!user) {
      super.end();
      return;
    }

    /**
     * If this phase isn't for the invoked move's last strike (and we still have something to hit),
     * unshift another MoveEffectPhase for the next strike before ending this phase.
     */
    if (--user.turnData.hitsLeft >= 1 && this.getFirstTarget()) {
      this.addNextHitPhase();
      super.end();
      return;
    }

    /**
     * All hits of the move have resolved by now.
     * Queue message for multi-strike moves before applying Shell Bell heals & proccing Dancer-like effects.
     */
    const hitsTotal = user.turnData.hitCount - Math.max(user.turnData.hitsLeft, 0);
    if (hitsTotal > 1 || user.turnData.hitsLeft > 0) {
      // Queue message if multiple hits occurred or were slated to occur (such as a Triple Axel miss)
      globalScene.phaseManager.queueMessage(i18next.t("battle:attackHitsCount", { count: hitsTotal }));
    }

    globalScene.applyModifiers(HitHealModifier, this.player, user);
    this.getTargets().forEach(target => {
      target.turnData.moveEffectiveness = null;
    });
    super.end();
  }

  /**
   * Applies reactive effects that occur when a Pokémon is hit.
   * (i.e. Effect Spore, Disguise, Liquid Ooze, Beak Blast)
   * @param user - The {@linkcode Pokemon} using this phase's invoked move
   * @param target - {@linkcode Pokemon} the current target of this phase's invoked move
   * @param hitResult - The {@linkcode HitResult} of the attempted move
   * @param damage - The amount of damage dealt to the target in the interaction
   * @param wasCritical - `true` if the move was a critical hit
   */
  protected applyOnGetHitAbEffects(
    user: Pokemon,
    target: Pokemon,
    hitResult: HitResult,
    damage: number,
    wasCritical = false,
  ): void {
    const move = this.move;

    // ✅ 접촉 여부(“판정”)는 항상 계산
    const isContact = !!move && move.doesFlagEffectApply({ flag: MoveFlags.MAKES_CONTACT, user, target });

    /**
     * ✅ “접촉 반응”만 억제하는 플래그
     * - 미라/정전기/불꽃몸/거친피부/철가시/울퉁불퉁멧 같은 것들만 막고 싶을 때 사용
     * - (네 목표) 방어/판별 상태일 때 보이지않는주먹 발동 + 접촉반응만 무시
     */
    let suppressContactReactions = false;

    if (isContact) {
      // 1) 우라오스 글러브(혹은 보호패드류)로 “항상” 접촉반응 무시하고 싶다면
      const glove = user
        .getHeldItems()
        .find((i): i is UrshifuGloveAbilityBypassModifier => i instanceof UrshifuGloveAbilityBypassModifier);
      const gloveActive = glove?.shouldIgnoreContactPenalty(user) ?? false;

      // 2) 또는 “전투태세/보이지않는주먹 발동 조건”일 때만 선택적으로 무시하고 싶다면
      const unseenForceActive = /* 예: target이 Protect/Detect 류 태그/상태일 때 && 네 전투태세 발동 조건일 때 */ false;

      suppressContactReactions = gloveActive || unseenForceActive;
    }

    // ✅ 1) 방어측 "특성 반응" (미라 같은 게 여기서 발동)
    if (!target.isFainted() || target.canApplyAbility()) {
      const params = {
        pokemon: target,
        opponent: user,
        move,
        hitResult,
        damage,
        isContact,
        suppressContactReactions, // ✅ 핵심: PostDefend 쪽이 이걸 보고 canApply에서 차단
      };

      applyAbAttrs("PostDefendAbAttr", params);

      // ✅ 2) 접촉 페널티(아이템/상태이상 등)도 같은 플래그로 차단
      if (isContact && !suppressContactReactions) {
        const holderIsPlayer = target.isPlayer();

        const rockyHelmet = globalScene
          .getModifiers(ContactDamageModifier, holderIsPlayer)
          .find(mod => mod.pokemonId === target.id);

        if (rockyHelmet) {
          const recoil = Math.max(Math.floor(user.getMaxHp() / 6), 1);

          user.damageAndUpdate(recoil, HitResult.INDIRECT);

          globalScene.phaseManager.queueMessage(
            i18next.t("modifier:contactDamageApplied", {
              pokemonNameWithAffix: getPokemonNameWithAffix(user),
              itemName: "울퉁불퉁멧",
            }),
          );
        }

        // TODO: 거친피부/철가시/불꽃몸/정전기 등
      }
    }

    // ✅ 반응형 베리(자보/애터/악키/타라프) - 피격 즉시 발동
    do {
      if (!move) {
        break;
      }

      const td: any = target.turnData as any;

      // ✅ 피해를 실제로 받았을 때만
      if (!(damage > 0)) {
        break;
      }

      // (옵션) 대타 맞았으면 발동안
      if (move.hitsSubstitute?.(user, target)) {
        break;
      }

      // (옵션) 기절했으면 발동안
      if (target.isFainted?.()) {
        break;
      }

      // 4) 베리 모디파이어들(소모 안 된 것만)
      const berryMods = globalScene
        .getModifiers(BerryModifier, target.isPlayer())
        .filter(m => m instanceof BerryModifier && m.pokemonId === target.id && !m.consumed) as BerryModifier[];

      if (berryMods.length === 0) {
        break;
      }

      // ✅ cat 정규화
      const rawCat =
        (move as any).getCategory?.(user, target) ?? (move as any).getMoveCategory?.(user, target) ?? move.category;

      const cat = typeof rawCat === "string" ? (MoveCategory as any)[rawCat] : rawCat;

      const isPhys = cat === MoveCategory.PHYSICAL;
      const isSpec = cat === MoveCategory.SPECIAL;

      // ✅ 턴당 1회(카테고리별) 락: bit1=물리, bit2=특수
      td.reactiveBerryUsedMask ??= 0;
      if (isPhys && td.reactiveBerryUsedMask & 1) {
        break;
      }
      if (isSpec && td.reactiveBerryUsedMask & 2) {
        break;
      }

      // ✅ 이번 피격에서 발동할 “목록” (최대 2개: 반사딜 + 랭업)
      const triggers: BerryModifier[] = [];

      if (isPhys) {
        const jaboca = berryMods.find(m => m.berryType === BerryType.JABOCA);
        const kee = berryMods.find(m => m.berryType === BerryType.KEE);
        if (jaboca) {
          triggers.push(jaboca);
        }
        if (kee) {
          triggers.push(kee);
        }
      } else if (isSpec) {
        const rowap = berryMods.find(m => m.berryType === BerryType.ROWAP);
        const maranga = berryMods.find(m => m.berryType === BerryType.MARANGA);
        if (rowap) {
          triggers.push(rowap);
        }
        if (maranga) {
          triggers.push(maranga);
        }
      } else {
        break;
      }

      if (triggers.length === 0) {
        break;
      }

      const attackerIdx = user.getBattlerIndex();

      for (const chosen of triggers) {
        // ✅ 바들바들향로·긴장감 등으로 베리 사용이 막혔으면 발동하지 않음
        if (typeof (chosen as any).shouldApply === "function" && !(chosen as any).shouldApply(target)) {
          continue;
        }

        td.reactiveBerryForceType = chosen.berryType;

        if (chosen.berryType === BerryType.JABOCA || chosen.berryType === BerryType.ROWAP) {
          td.reactiveBerryAttackerIndex = attackerIdx;
        } else {
          delete td.reactiveBerryAttackerIndex;
        }

        const applied = chosen.apply(target);

        delete td.reactiveBerryForceType;

        // ✅ 실제 발동에 실패했으면 사용·소모 후처리도 하지 않음
        if (applied === false) {
          delete td.reactiveBerryAttackerIndex;
          continue;
        }

        if (chosen.consumed) {
          chosen.consumed = false;
          target.loseHeldItem(chosen);
        }

        globalScene.eventTarget.dispatchEvent(new BerryUsedEvent(chosen));
        globalScene.updateModifiers(target.isPlayer());
        applyAbAttrs("HealFromBerryUseAbAttr", { pokemon: target });
      }

      if (isPhys) {
        td.reactiveBerryUsedMask |= 1;
      }
      if (isSpec) {
        td.reactiveBerryUsedMask |= 2;
      }

      delete td.reactiveBerryAttackerIndex;
      delete td.reactiveBerryForceType;
    } while (false);

    // TypeImmunityModifier 제거 및 풍선 처리
    if (damage > 0) {
      const balloonMods = [
        ...globalScene.getModifiers(TypeImmunityModifier, true),
        ...globalScene.getModifiers(TypeImmunityModifier, false),
        ...((globalScene.currentBattle as any)?.isPracticeBattle
          ? ((globalScene as any).practiceRentalModifiers ?? []).filter((m: any) => m instanceof TypeImmunityModifier)
          : []),
      ].filter(
        mod =>
          mod.pokemonId === target.id
          && ((mod as any).sourceItem?.name === "air_balloon"
            || (mod as any).type?.id === "AIR_BALLOON"
            || (mod as any).type?.name === "풍선"
            || (mod as any).name === "air_balloon"),
      ) as TypeImmunityModifier[];

      if (balloonMods.length > 0) {
        for (const mod of balloonMods) {
          globalScene.removeModifier(mod);
        }

        globalScene.phaseManager.queueMessage(
          i18next.t("modifier:balloonPopped", {
            pokemonNameWithAffix: getPokemonNameWithAffix(target),
            itemName: balloonMods[0].type?.name ?? "풍선",
          }),
        );

        const heldBalloon = target
          .getHeldItems?.()
          .find(
            i =>
              i === balloonMods[0]
              || (i as any).sourceItem?.name === "air_balloon"
              || (i as any).type?.id === "AIR_BALLOON"
              || (i as any).type?.name === "풍선",
          );

        if (heldBalloon) {
          target.loseHeldItem(heldBalloon);
        }

        globalScene.updateModifiers(true);
        globalScene.updateModifiers(false);
        console.log("[BALLOON_AFTER_POP]", {
          target: target.name,
          heldItems: target.getHeldItems?.().map(i => ({
            ctor: i.constructor?.name,
            pokemonId: (i as any).pokemonId,
            sourceItemName: (i as any).sourceItem?.name,
            typeId: (i as any).type?.id,
            typeName: (i as any).type?.name,
            name: (i as any).name,
          })),
          playerTypeImmunity: globalScene
            .getModifiers(TypeImmunityModifier, true)
            .filter(m => m.pokemonId === target.id),
          enemyTypeImmunity: globalScene
            .getModifiers(TypeImmunityModifier, false)
            .filter(m => m.pokemonId === target.id),
        });
        target.turnData.moveEffectiveness = null;
      }
    }

    // 🔹 치명타 특성 효과 처리
    if (wasCritical) {
      const critParams = { pokemon: target, opponent: user, move, hitResult, damage: 0 };
      applyAbAttrs("PostReceiveCritStatStageChangeAbAttr", critParams);
    }

    // 🔹 AFTER_HIT 태그 소멸
    target.lapseTags(BattlerTagLapseType.AFTER_HIT);
  }

  /**
   * Handles checking for and applying Flinches
   * @param user - The {@linkcode Pokemon} using this phase's invoked move
   * @param target - {@linkcode Pokemon} the current target of this phase's invoked move
   * @param dealsDamage - `true` if the attempted move successfully dealt damage
   */
  protected applyHeldItemFlinchCheck(user: Pokemon, target: Pokemon, dealsDamage: boolean): void {
    if (this.move.hasAttr("FlinchAttr")) {
      return;
    }

    if (
      dealsDamage
      && !target.hasAbilityWithAttr("IgnoreMoveEffectsAbAttr")
      && !this.move.hitsSubstitute(user, target)
    ) {
      // 플린치 여부 변수
      const flinched = new BooleanHolder(false);

      // 🔹 아이템 효과: 플린치 무효화 아이템 적용 (ex. 은밀망토)
      globalScene.applyModifiers(IgnoreMoveEffectsItemModifier, user.isPlayer(), user, target, null, false, flinched);

      // 🔸 CovertCloak(은밀망토) 보유 여부 확인
      const existingCovertCloak = globalScene
        .getModifiers(IgnoreMoveEffectsItemModifier)
        .find(mod => mod.pokemonId === target.id);

      const hasCovertCloak =
        !!existingCovertCloak
        || (target.isPlayer()
          && (globalScene.applyModifier(IgnoreMoveEffectsItemModifier, target.player, target) as CovertCloak | null));

      // ❌ 추가효과 무효 아이템이 적용되어 있으면 플린치 차단
      if (hasCovertCloak) {
        return;
      }

      // 🔹 실제 플린치 확률 적용
      globalScene.applyModifiers(FlinchChanceModifier, user.isPlayer(), user, flinched);

      // 🔸 플린치 상태 부여
      if (flinched.value) {
        target.addTag(BattlerTagType.FLINCHED, undefined, this.move.id, user.id);
      }
    }
  }

  /** Return whether the target is protected by protect or a relevant conditional protection
   * @param user - The {@linkcode Pokemon} using this phase's invoked move
   * @param target - {@linkcode Pokemon} the target to check for protection
   * @param move - The {@linkcode Move} being used
   * @returns Whether the pokemon was protected
   */
  private protectedCheck(user: Pokemon, target: Pokemon): boolean {
    /** The {@linkcode ArenaTagSide} to which the target belongs */
    const targetSide = target.isPlayer() ? ArenaTagSide.PLAYER : ArenaTagSide.ENEMY;
    /** Has the invoked move been cancelled by conditional protection (e.g Quick Guard)? */
    const hasConditionalProtectApplied = new BooleanHolder(false);
    /** Does the applied conditional protection bypass Protect-ignoring effects? */
    const bypassIgnoreProtect = new BooleanHolder(false);
    /** If the move is not targeting a Pokemon on the user's side, try to apply conditional protection effects */
    if (!this.move.isAllyTarget()) {
      globalScene.arena.applyTagsForSide(
        ConditionalProtectTag,
        targetSide,
        false,
        hasConditionalProtectApplied,
        user,
        target,
        this.move.id,
        bypassIgnoreProtect,
      );
    }

    // TODO: Break up this chunky boolean to make it more palatable
    return (
      ![MoveTarget.ENEMY_SIDE, MoveTarget.BOTH_SIDES].includes(this.move.moveTarget)
      && (bypassIgnoreProtect.value || !this.move.doesFlagEffectApply({ flag: MoveFlags.IGNORE_PROTECT, user, target }))
      && (hasConditionalProtectApplied.value
        || (target.findTags(t => t instanceof DamageProtectedTag).length === 0
          && target.findTags(t => t instanceof ProtectedTag).some(t => target.lapseTag(t.tagType)))
        || (this.move.category !== MoveCategory.STATUS
          && target.findTags(t => t instanceof DamageProtectedTag).some(t => target.lapseTag(t.tagType))))
    );
  }

  /**
   * Conduct the hit check and type effectiveness for this move against the target
   *
   * Checks occur in the following order:
   * 1. if the move is self-target
   * 2. if the target is on the field
   * 3. if the target is hidden by the effects of its commander ability
   * 4. if the target is in an applicable semi-invulnerable state
   * 5. if the target has an applicable protection effect
   * 6. if the move is reflected by magic coat or magic bounce
   * 7. type effectiveness calculation, including immunities from abilities and typing
   * 9. if accuracy is checked, whether the roll passes the accuracy check
   * @param target - The {@linkcode Pokemon} targeted by the invoked move
   * @returns a {@linkcode HitCheckEntry} containing the attack's {@linkcode HitCheckResult}
   *  and {@linkcode TypeDamageMultiplier | effectiveness} against the target.
   */
  public hitCheck(target: Pokemon): HitCheckEntry {
    const user = this.getUserPokemon();
    const move = this.move;

    if (!user) {
      return [HitCheckResult.ERROR, 0];
    }

    // Moves targeting the user bypass all checks
    if (move.moveTarget === MoveTarget.USER) {
      return [HitCheckResult.HIT, 1];
    }

    const fieldTargeted = isFieldTargeted(move);

    const isMonsterHouseVirtualTarget =
      monsterHouseManager.isActive() && user.isPlayer() && this.isMonsterHouseSpreadTarget(target);

    if (!target.isActive(true) && !fieldTargeted && !isMonsterHouseVirtualTarget) {
      return [HitCheckResult.TARGET_NOT_ON_FIELD, 0];
    }

    // Commander causes moves used against the target to miss
    if (
      !fieldTargeted
      && globalScene.currentBattle.double
      && target.getAlly()?.getTag(BattlerTagType.COMMANDED)?.getSourcePokemon() === target
    ) {
      return [HitCheckResult.MISS, 0];
    }

    /** Whether both accuracy and invulnerability checks can be skipped */
    const bypassAccAndInvuln = fieldTargeted || this.checkBypassAccAndInvuln(target);
    const semiInvulnerableTag = target.getTag(SemiInvulnerableTag);

    if (semiInvulnerableTag && !bypassAccAndInvuln && !this.checkBypassSemiInvuln(semiInvulnerableTag)) {
      return [HitCheckResult.MISS, 0];
    }

    if (!fieldTargeted && this.protectedCheck(user, target)) {
      return [HitCheckResult.PROTECTED, 0];
    }

    // Reflected moves cannot be reflected again
    if (!isReflected(this.useMode) && move.doesFlagEffectApply({ flag: MoveFlags.REFLECTABLE, user, target })) {
      return [HitCheckResult.REFLECTED, 0];
    }

    // After the magic bounce check, field targeted moves are always successful
    if (fieldTargeted) {
      return [HitCheckResult.HIT, 1];
    }

    const cancelNoEffectMessage = new BooleanHolder(false);

    /**
     * The effectiveness of the move against the given target.
     * Accounts for type and move immunities from defensive typing, abilities, and other effects.
     */
    const effectiveness = target.getMoveEffectiveness(user, move, false, false, cancelNoEffectMessage);
    if (effectiveness === 0) {
      return [
        cancelNoEffectMessage.value ? HitCheckResult.NO_EFFECT_NO_MESSAGE : HitCheckResult.NO_EFFECT,
        effectiveness,
      ];
    }

    const moveAccuracy = move.calculateBattleAccuracy(user, target);

    // Strikes after the first in a multi-strike move are guaranteed to hit,
    // unless the move is flagged to check all hits and the user does not have Skill Link.
    if (
      user.turnData.hitsLeft < user.turnData.hitCount
      && (!move.hasFlag(MoveFlags.CHECK_ALL_HITS) || user.hasAbilityWithAttr("MaxMultiHitAbAttr"))
    ) {
      return [HitCheckResult.HIT, effectiveness];
    }

    const bypassAccuracy =
      bypassAccAndInvuln
      || target.getTag(BattlerTagType.ALWAYS_GET_HIT)
      || (target.getTag(BattlerTagType.TELEKINESIS) && !this.move.hasAttr("OneHitKOAttr"));

    if (moveAccuracy === -1 || bypassAccuracy) {
      return [HitCheckResult.HIT, effectiveness];
    }

    const accuracyMultiplier = user.getAccuracyMultiplier(target, this.move);
    const rand = user.randBattleSeedInt(100);

    if (rand < moveAccuracy * accuracyMultiplier) {
      return [HitCheckResult.HIT, effectiveness];
    }

    return [HitCheckResult.MISS, 0];
  }

  /**
   * Check whether the move should bypass *both* the accuracy *and* semi-invulnerable states.
   * @param target - The {@linkcode Pokemon} targeted by the invoked move
   * @returns `true` if the move should bypass accuracy and semi-invulnerability
   *
   * Accuracy and semi-invulnerability can be bypassed by:
   * - An ability like {@linkcode AbilityId.NO_GUARD | No Guard}
   * - A poison type using {@linkcode MoveId.TOXIC | Toxic}
   * - A move like {@linkcode MoveId.LOCK_ON | Lock-On} or {@linkcode MoveId.MIND_READER | Mind Reader}.
   * - A field-targeted move like spikes
   *
   * Does *not* check against effects {@linkcode MoveId.GLAIVE_RUSH | Glaive Rush} status (which
   * should not bypass semi-invulnerability), or interactions like Earthquake hitting against Dig,
   * (which should not bypass the accuracy check).
   *
   * @see {@linkcode hitCheck}
   */
  public checkBypassAccAndInvuln(target: Pokemon) {
    const user = this.getUserPokemon();
    if (!user) {
      return false;
    }

    // ✅ ME FIRST(선취)로 "이번에 복사해서 쓰는 기술"이면 명중/반무적 판정 우회
    // - meFirstNoAccuracyCheck: 네가 만든 플래그
    // - meFirstCopiedMove: "어떤 move.id에만 적용"을 더 안전하게 걸고 싶을 때
    if (
      user.turnData?.meFirstNoAccuracyCheck
      && (user.turnData?.meFirstCopiedMove == null || user.turnData.meFirstCopiedMove === this.move.id)
    ) {
      return true;
    }

    if (user.hasAbilityWithAttr("AlwaysHitAbAttr") || target.hasAbilityWithAttr("AlwaysHitAbAttr")) {
      return true;
    }
    if (this.move.hasAttr("ToxicAccuracyAttr") && user.isOfType(PokemonType.POISON)) {
      return true;
    }
    // TODO: Fix lock on / mind reader check.
    if (
      user.getTag(BattlerTagType.IGNORE_ACCURACY)
      && (user.getLastXMoves().find(() => true)?.targets || []).indexOf(target.getBattlerIndex()) !== -1
    ) {
      return true;
    }
    if (isFieldTargeted(this.move)) {
      return true;
    }

    return false; // (원래 코드가 여기 return이 없으면 꼭 넣어줘)
  }

  /**
   * Check whether the move is able to ignore the given `semiInvulnerableTag`
   * @param semiInvulnerableTag - The semiInvulnerable tag to check against
   * @returns `true` if the move can ignore the semi-invulnerable state
   */
  public checkBypassSemiInvuln(semiInvulnerableTag: SemiInvulnerableTag | nil): boolean {
    if (!semiInvulnerableTag) {
      return false;
    }
    const move = this.move;
    return move.getAttrs("HitsTagAttr").some(hta => hta.tagType === semiInvulnerableTag.tagType);
  }

  /** @returns The {@linkcode Pokemon} using this phase's invoked move */
  public getUserPokemon(): Pokemon | null {
    // TODO: Make this purely a battler index
    if (this.battlerIndex > BattlerIndex.ENEMY_2) {
      return globalScene.getPokemonById(this.battlerIndex);
    }
    return (this.player ? globalScene.getPlayerField() : globalScene.getEnemyField())[this.fieldIndex];
  }

  /**
   * @returns An array of {@linkcode Pokemon} that are:
   * - On-field and active
   * - Non-fainted
   * - Targeted by this phase's invoked move
   */
  public getTargets(): Pokemon[] {
    // targets가 배열인지 체크
    if (!Array.isArray(this.targets)) {
      console.warn("MoveEffectPhase.getTargets() - this.targets is invalid:", this.targets);
      this.targets = [];
    }

    // globalScene.getField(true) 체크
    const field = globalScene.getField?.(true);
    if (!Array.isArray(field)) {
      console.warn("MoveEffectPhase.getTargets() - globalScene.getField(true) returned invalid:", field);
      return [];
    }

    // 안전하게 필터링
    return field.filter(p => this.targets.includes(p.getBattlerIndex()));
  }

  /** @returns The first active, non-fainted target of this phase's invoked move. */
  public getFirstTarget(): Pokemon | undefined {
    return this.getTargets()[0];
  }

  /**
   * Removes the given {@linkcode Pokemon} from this phase's target list
   * @param target - The {@linkcode Pokemon} to be removed
   */
  protected removeTarget(target: Pokemon): void {
    const targetIndex = this.targets.indexOf(target.getBattlerIndex());
    if (targetIndex !== -1) {
      this.targets.splice(this.targets.indexOf(target.getBattlerIndex()), 1);
    }
  }

  /**
   * Prevents subsequent strikes of this phase's invoked move from occurring
   * @param target - If defined, only stop subsequent strikes against this {@linkcode Pokemon}
   */
  public stopMultiHit(target?: Pokemon): void {
    // If given a specific target, remove the target from subsequent strikes
    if (target) {
      this.removeTarget(target);
    }
    const user = this.getUserPokemon();
    if (!user) {
      return;
    }
    // If no target specified, or the specified target was the last of this move's
    // targets, completely cancel all subsequent strikes.
    if (!target || this.targets.length === 0) {
      user.turnData.hitCount = 1;
      user.turnData.hitsLeft = 1;
    }
  }

  /**
   * Unshifts a new `MoveEffectPhase` with the same properties as this phase.
   * Used to queue the next hit of multi-strike moves.
   */
  protected addNextHitPhase(): void {
    globalScene.phaseManager.unshiftNew("MoveEffectPhase", this.battlerIndex, this.targets, this.move, this.useMode);
  }

  /** Removes all substitutes that were broken by this phase's invoked move */
  protected updateSubstitutes(): void {
    const targets = this.getTargets();
    for (const target of targets) {
      const substitute = target.getTag(SubstituteTag);
      if (substitute && substitute.hp <= 0) {
        target.lapseTag(BattlerTagType.SUBSTITUTE);
      }
    }
  }

  /**
   * Triggers move effects of the given move effect trigger.
   * @param triggerType The {@linkcode MoveEffectTrigger} being applied
   * @param user The {@linkcode Pokemon} using the move
   * @param target The {@linkcode Pokemon} targeted by the move
   * @param firstTarget Whether the target is the first to be hit by the current strike
   * @param selfTarget If defined, limits the effects triggered to either self-targeted
   *  effects (if set to `true`) or targeted effects (if set to `false`).
   */
  protected triggerMoveEffects(
    triggerType: MoveEffectTrigger,
    user: Pokemon,
    target: Pokemon | null,
    firstTarget?: boolean | null,
    selfTarget?: boolean,
  ): void {
    applyFilteredMoveAttrs(
      (attr: MoveAttr) =>
        attr.is("MoveEffectAttr")
        && attr.trigger === triggerType
        && (selfTarget == null || attr.selfTarget === selfTarget)
        && (!attr.firstHitOnly || this.firstHit)
        && (!attr.lastHitOnly || this.lastHit)
        && (!attr.firstTargetOnly || (firstTarget ?? true)),
      user,
      target,
      this.move,
    );
  }

  /**
   * Applies all move effects that trigger in the event of a successful hit:
   *
   * - {@linkcode MoveEffectTrigger.PRE_APPLY | PRE_APPLY} effects`
   * - Applying damage to the target
   * - {@linkcode MoveEffectTrigger.POST_APPLY | POST_APPLY} effects
   * - Invoking {@linkcode applyOnTargetEffects} if the move does not hit a substitute
   * - Triggering form changes and emergency exit / wimp out if this is the last hit
   *
   * @param target - the {@linkcode Pokemon} hit by this phase's move.
   * @param effectiveness - The effectiveness of the move (as previously evaluated in {@linkcode hitCheck})
   * @param firstTarget - Whether this is the first target successfully struck by the move
   */
  protected applyMoveEffects(target: Pokemon, effectiveness: TypeDamageMultiplier, firstTarget: boolean): void {
    const user = this.getUserPokemon();
    if (user == null) {
      return;
    }

    this.triggerMoveEffects(MoveEffectTrigger.PRE_APPLY, user, target);

    const [hitResult, wasCritical, dmg] = this.applyMove(user, target, effectiveness);

    // Apply effects to the user (always) and the target (if not blocked by substitute).
    this.triggerMoveEffects(MoveEffectTrigger.POST_APPLY, user, target, firstTarget, true);
    if (!this.move.hitsSubstitute(user, target)) {
      this.applyOnTargetEffects(user, target, hitResult, firstTarget, dmg, wasCritical);
    }
    if (this.lastHit) {
      globalScene.triggerPokemonFormChange(user, SpeciesFormChangePostMoveTrigger);

      // Multi-hit check for Wimp Out/Emergency Exit
      if (user.turnData.hitCount > 1) {
        // TODO: Investigate why 0 is being passed for damage amount here
        // and then determing if refactoring `applyMove` to return the damage dealt is appropriate.
        applyAbAttrs("PostDamageAbAttr", { pokemon: target, damage: 0, source: user });
      }
    }
  }

  /**
   * Sub-method of for {@linkcode applyMoveEffects} that applies damage to the target.
   *
   * @param user - The {@linkcode Pokemon} using this phase's invoked move
   * @param target - The {@linkcode Pokemon} targeted by the move
   * @param effectiveness - The effectiveness of the move against the target
   * @returns The {@linkcode HitResult} of the move against the target, a boolean indicating whether the target was crit, and the amount of damage dealt
   */
  protected applyMoveDamage(
    user: Pokemon,
    target: Pokemon,
    effectiveness: TypeDamageMultiplier,
  ): [result: HitResult, critical: boolean, damage: number] {
    console.log("[APPLY_MOVE_DAMAGE_ENTER]", {
      move: this.move?.id,
      user: user.getName?.(),
      target: target.getName?.(),
    });
    const isCritical = target.getCriticalHitResult(user, this.move);

    /*
     * Apply stat changes from {@linkcode move} and gives it to {@linkcode source}
     * before damage calculation
     */
    applyMoveAttrs("StatChangeBeforeDmgCalcAttr", user, target, this.move);

    const {
      result,
      damage: dmg,
      roguePointGain,
    } = target.getAttackDamage({
      source: user,
      move: this.move,
      ignoreAbility: false,
      ignoreSourceAbility: false,
      ignoreAllyAbility: false,
      ignoreSourceAllyAbility: false,
      simulated: false,
      effectiveness,
      isCritical,
    });

    const typeBoost = user.findTag(
      t => t instanceof TypeBoostTag && t.boostedType === user.getMoveType(this.move),
    ) as TypeBoostTag;
    if (typeBoost?.oneUse) {
      user.removeTag(typeBoost.tagType);
    }

    const isOneHitKo = result === HitResult.ONE_HIT_KO;

    if (!dmg) {
      return [result, false, 0];
    }

    target.lapseTags(BattlerTagLapseType.HIT);

    const substitute = target.getTag(SubstituteTag);
    const isBlockedBySubstitute = substitute && this.move.hitsSubstitute(user, target);
    if (isBlockedBySubstitute) {
      user.turnData.totalDamageDealt += Math.min(dmg, substitute.hp);
      substitute.hp -= dmg;
    } else if (!target.isPlayer() && dmg >= target.hp) {
      globalScene.applyModifiers(EnemyEndureChanceModifier, false, target);
    }

    const damage = isBlockedBySubstitute
      ? 0
      : target.damageAndUpdate(dmg, {
          result: result as DamageResult,
          ignoreFaintPhase: true,
          ignoreSegments: isOneHitKo,
          isCritical,
          source: user,
          move: this.move,
          moveType: user.getMoveType(this.move),
          movePower: dmg,
          roguePointGain: roguePointGain ?? 0, // ✅ 추가
        });

    console.log("[AFTER_DAMAGE_AND_UPDATE]", {
      dmg,
      damage,
      user: user.getName?.(),
      target: target.getName?.(),
      held: user.getHeldItems?.().map(i => i.constructor.name),
    });

    if (damage > 0) {
      const riskyMod = globalScene
        .getModifiers(StackingRiskyPowerBoosterModifier, user.isPlayer())
        .find(mod => mod.pokemonId === user.id);

      riskyMod?.applyHpLossIfNeeded(user, this.move.id, globalScene.currentBattle.turn);
    }

    if (isCritical) {
      globalScene.phaseManager.queueMessage(i18next.t("battle:hitResultCriticalHit"));
    }

    if (damage <= 0) {
      return [result, isCritical, damage];
    }

    if (user.isPlayer() && target.isEnemy()) {
      globalScene.applyModifiers(DamageMoneyRewardModifier, true, user, new NumberHolder(damage));
    }

    if (user.isPlayer()) {
      globalScene.validateAchvs(DamageAchv, new NumberHolder(damage));

      if (damage > globalScene.gameData.gameStats.highestDamage) {
        globalScene.gameData.gameStats.highestDamage = damage;
      }
    }

    user.turnData.totalDamageDealt += damage;
    user.turnData.singleHitDamageDealt = damage;
    target.battleData.hitCount++;
    target.turnData.damageTaken += damage;

    target.turnData.attacksReceived.unshift({
      move: this.move.id,
      result: result as DamageResult,
      damage,
      critical: isCritical,
      sourceId: user.id,
      sourceBattlerIndex: user.getBattlerIndex(),
    });

    const battle = globalScene.currentBattle as any;

    return [result, isCritical, damage];
  }

  /**
   * Sub-method of {@linkcode applyMove} that handles the event of a target fainting.
   * @param user - The {@linkcode Pokemon} using this phase's invoked move
   * @param target - The {@linkcode Pokemon} that fainted
   */
  protected onFaintTarget(user: Pokemon, target: Pokemon): void {
    const isMonsterHouseVirtualTarget =
      monsterHouseManager.isActive() && user.isPlayer() && target.isEnemy() && !target.isOnField();

    if (isMonsterHouseVirtualTarget) {
      /*
       * 실제 배틀 슬롯이 없는 몬스터소굴 예비 개체.
       * BattlerIndex 기반 FaintPhase를 사용하지 않는다.
       */
      globalScene.phaseManager.pushNew("MonsterHouseVirtualFaintPhase", target.id);

      console.log("[MONSTER_HOUSE_VIRTUAL_FAINT_QUEUED]", {
        pokemon: target.name,
        pokemonId: target.id,
        hp: target.hp,
      });
    } else {
      /*
       * 실제 필드에 나와 있는 포켓몬은
       * 기존 FaintPhase를 그대로 사용.
       */
      globalScene.phaseManager.queueFaintPhase(target.getBattlerIndex(), false, user);
    }

    target.destroySubstitute();
    target.lapseTag(BattlerTagType.COMMANDED);

    if (!this.lastHit && user.turnData.hitsLeft > 1) {
      this.lastHit = true;
    }
  }

  /**
   * Sub-method of {@linkcode applyMove} that queues the hit-result message
   * on the final strike of the move against a target
   * @param result - The {@linkcode HitResult} of the move
   */
  protected queueHitResultMessage(result: HitResult) {
    let msg: string | undefined;
    switch (result) {
      case HitResult.SUPER_EFFECTIVE:
        msg = i18next.t("battle:hitResultSuperEffective");
        break;
      case HitResult.NOT_VERY_EFFECTIVE:
        msg = i18next.t("battle:hitResultNotVeryEffective");
        break;
      case HitResult.ONE_HIT_KO:
        msg = i18next.t("battle:hitResultOneHitKO");
        break;
      case HitResult.EXTREMELY_EFFECTIVE:
        msg = i18next.t("battle:hitResultExtremelyEffective");
        break;
      case HitResult.MOSTLY_INEFFECTIVE:
        msg = i18next.t("battle:hitResultMostlyIneffective");
        break;
    }
    if (msg) {
      globalScene.phaseManager.queueMessage(msg);
    }
  }

  /** Apply the result of this phase's move to the given target
   * @param user - The {@linkcode Pokemon} using this phase's invoked move
   * @param target - The {@linkcode Pokemon} struck by the move
   * @param effectiveness - The effectiveness of the move against the target
   * @returns The {@linkcode HitResult} of the move against the target, a boolean indicating whether the target was crit, and the amount of damage dealt
   */
  protected applyMove(
    user: Pokemon,
    target: Pokemon,
    effectiveness: TypeDamageMultiplier,
  ): [HitResult, critical: boolean, damage: number] {
    const moveCategory = user.getMoveCategory(target, this.move);

    if (moveCategory === MoveCategory.STATUS) {
      return [HitResult.STATUS, false, 0];
    }

    const result = this.applyMoveDamage(user, target, effectiveness);

    if (user.turnData.hitsLeft === 1 || target.isFainted()) {
      this.queueHitResultMessage(result[0]);
    }

    if (target.isFainted()) {
      this.onFaintTarget(user, target);
    }

    return result;
  }

  /**
   * Applies all effects aimed at the move's target.
   * To be used when the target is successfully and directly hit by the move.
   * @param user - The {@linkcode Pokemon} using the move
   * @param target - The {@linkcode Pokemon} targeted by the move
   * @param hitResult - The {@linkcode HitResult} obtained from applying the move
   * @param firstTarget - `true` if the target is the first Pokemon hit by the attack
   * @param damage - The amount of damage dealt to the target in the interaction
   * @param wasCritical - `true` if the move was a critical hit
   */
  protected applyOnTargetEffects(
    user: Pokemon,
    target: Pokemon,
    hitResult: HitResult,
    firstTarget: boolean,
    damage: number,
    wasCritical = false,
  ): void {
    console.debug("[applyOnTargetEffects] 호출됨", {
      user: user.name,
      target: target.name,
      hitResult,
      damage,
      move: this.move.id,
      moveClass: this.move.constructor.name,
      isAttackMove: this.move.is("AttackMove"),
    });
    /** Does {@linkcode hitResult} indicate that damage was dealt to the target? */
    const dealsDamage = [
      HitResult.EFFECTIVE,
      HitResult.SUPER_EFFECTIVE,
      HitResult.NOT_VERY_EFFECTIVE,
      HitResult.ONE_HIT_KO,
      HitResult.EXTREMELY_EFFECTIVE,
      HitResult.MOSTLY_INEFFECTIVE,
    ].includes(hitResult);

    // 기존 효과 처리
    this.triggerMoveEffects(MoveEffectTrigger.POST_APPLY, user, target, firstTarget, false);
    this.applyHeldItemFlinchCheck(user, target, dealsDamage);
    this.applyOnGetHitAbEffects(user, target, hitResult, damage, wasCritical);
    applyAbAttrs("PostAttackAbAttr", {
      pokemon: user,
      opponent: target,
      move: this.move,
      hitResult,
      damage,
    });

    {
      const pendingBooster = (user.turnData as any).pendingTypeSpecificMoveBooster as
        | TypeSpecificMoveBoosterModifier
        | undefined;

      const successHit =
        hitResult !== HitResult.MISS
        && hitResult !== HitResult.NO_EFFECT
        && hitResult !== HitResult.NO_EFFECT_NO_MESSAGE
        && hitResult !== (HitResult as any).FAIL;

      if (pendingBooster && successHit && damage > 0) {
        recordRecycleSnapshot(user, pendingBooster, { args: [] });

        if (pendingBooster.stackCount > 1) {
          pendingBooster.stackCount--;
        } else {
          user.loseHeldItem(pendingBooster);
        }

        delete (user.turnData as any).pendingTypeSpecificMoveBooster;

        globalScene.updateModifiers(user.isPlayer());
        user.updateInfo();
      }
    }

    // ✅ TRICK: 선택한 아이템을 실제로 교환
    if (this.move.id === MoveId.TRICK && !this.move.hitsSubstitute(user, target)) {
      const td: any = user.turnData;

      // 턴당 1회만
      if (!td._trickSwapped && td.trickItemSelectedThisTurn) {
        const success =
          hitResult !== HitResult.MISS && hitResult !== HitResult.NO_EFFECT && hitResult !== (HitResult as any).FAIL; // FAIL이 없을 수도 있어서 안전 처리

        if (success) {
          td._trickSwapped = true;

          const give = user.tempSummonData?.trickGiveItem;
          const take = user.tempSummonData?.trickTakeItem;

          if (give && take) {
            // 1) 원래 자리에서 제거
            globalScene.removeModifier(give, false); // player side (user 쪽)
            globalScene.removeModifier(take, true); // enemy side (target 쪽)

            // 2) 반대편으로 "복제"해서 붙이기 (pokemonId 반드시 바꿔야 함!)
            const giveToEnemy = (give as any).clone?.() ?? give;
            (giveToEnemy as any).pokemonId = target.id;

            const takeToPlayer = (take as any).clone?.() ?? take;
            (takeToPlayer as any).pokemonId = user.id;

            // 3) 추가
            globalScene.addModifier(
              takeToPlayer as any,
              /*ignoreUpdate*/ true,
              /*playSound*/ false,
              /*virtual*/ false,
              /*instant*/ true,
            );
            globalScene.addEnemyModifier(giveToEnemy as any, /*ignoreUpdate*/ true, /*instant*/ true);

            // 4) 양쪽 갱신 (한 번만)
            globalScene.updateModifiers(true, true);
            globalScene.updateModifiers(false, true);

            // 5) 정리
            user.tempSummonData.trickGiveItem = undefined;
            user.tempSummonData.trickTakeItem = undefined;
            user.tempSummonData.trickTargetBattlerIndex = undefined;

            td.trickItemSelectedThisTurn = false;
          }
        }
      }
    }

    // ✅ 소리 기반 기술일 때 특수공격력 상승 처리
    const existingPhase = globalScene.phaseManager.hasPhaseOfType(
      p => p instanceof MoveEffectPhase && p.battlerIndex === this.battlerIndex,
    );

    if (!(existingPhase instanceof MoveEffectPhase) && this.move.hasFlag(MoveFlags.SOUND_BASED)) {
      user.currentMove = this.move;

      const modifiers = globalScene.getModifiers(SoundBasedMoveSpecialAttackBoostModifier);

      if (modifiers.length > 0) {
        for (const modifier of modifiers) {
          if (modifier instanceof SoundBasedMoveSpecialAttackBoostModifier) {
            // apply() 호출 시도
            const success = modifier.apply(user, this.move.type, this.move.power);

            if (success) {
              // 특수공격력 상승 적용
              globalScene.phaseManager.unshiftPhase(new MoveEffectPhase(user.getBattlerIndex(), true, [Stat.SPATK], 1));

              // 아이템 소모
              user.loseHeldItem(modifier);
              globalScene.updateModifiers(this.player);
            }
          }
        }
      }
    }

    // ✅ SpeciesStatBoosterModifier: 명중 시 확정 독/맹독 (악독한사슬)
    {
      const successHit =
        hitResult !== HitResult.MISS && hitResult !== HitResult.NO_EFFECT && hitResult !== (HitResult as any).FAIL;

      const hitSub = this.move.hitsSubstitute?.(user, target) ?? false;

      if (successHit && !hitSub && this.move.is("AttackMove")) {
        const attackerHeldMods = globalScene.findModifiers(
          m => m instanceof PokemonHeldItemModifier && m.pokemonId === user.id,
        );

        const sbMods = attackerHeldMods.filter(m => m instanceof SpeciesStatBoosterModifier) as any[];

        for (const m of sbMods) {
          // ✅ 인스턴스 key 말고 "타입의 pregen args"에서 key를 뽑기
          const typeObj: any = m.type;
          const typeKey = typeObj?.key ?? typeObj?.getPregenArgs?.()?.[0] ?? typeObj?.id; // 마지막 보험
          console.log("[MCHAIN][CALL_PRE]", {
            typeKey,
            hasFn: typeof (m as any).applyGuaranteedPoisonOnHit,
            user: user?.name,
            target: target?.name,
          });

          (m as any).applyGuaranteedPoisonOnHit?.(user, target, false);

          if (typeKey !== "MALIGNANT_CHAINS") {
            continue;
          }

          m.applyGuaranteedPoisonOnHit?.(user, target, false);
          break;
        }
      }
    }

    // ✅ 적 포켓몬만 EnemyAttackStatusEffectChanceModifier 적용
    if (!user.isPlayer() && this.move.is("AttackMove")) {
      globalScene.applyShuffledModifiers(EnemyAttackStatusEffectChanceModifier, false, target);
    }

    // Apply Grip Claw's chance to steal an item from the target
    if (this.move.is("AttackMove")) {
      console.debug("[applyOnTargetEffects] ContactHeldItemTransferChanceModifier 적용 시도");
      globalScene.applyModifiers(ContactHeldItemTransferChanceModifier, this.player, user, target);
    }
  }
}
