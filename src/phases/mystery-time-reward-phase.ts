import { globalScene } from "#app/global-scene";
import { modifierTypes } from "#data/data-lists";
import { type MysteryTimeRank, mysteryTimeManager } from "#data/mystery-time/mystery-time-manager";
import { ArenaTagType } from "#enums/arena-tag-type";
import {
  ExpBoosterModifier,
  MarkRateBoosterModifier,
  MoneyMultiplierModifier,
  type PersistentModifier,
  ShinyRateBoosterModifier,
} from "#modifiers/modifier";
import { type ModifierType, PokemonModifierType } from "#modifiers/modifier-type";
import { BattlePhase } from "#phases/battle-phase";
import { NumberHolder } from "#utils/common";

/**
 * 미스터리타임 보스(Demonstery) 격파 보상.
 *
 * 보상:
 * - 등급별 대량의 골드
 * - 등급별 로그포인트
 * - 황금경험치부적 ×5
 * - 빛나는부적 ×2
 * - 증표의부적 ×2
 * - 행복의알 ×3 (파티원 전원)
 * - 황금의알 ×3 (파티원 전원)
 */
export class MysteryTimeRewardPhase extends BattlePhase {
  public readonly phaseName = "MysteryTimeRewardPhase";

  private readonly rank: MysteryTimeRank;

  constructor() {
    super();

    /*
     * Phase가 실행되기 전에 MysteryTimeManager가 초기화될 가능성에
     * 대비해서 큐에 들어가는 시점의 등급을 복사한다.
     */
    this.rank = mysteryTimeManager.getRank();
  }

  public start(): void {
    super.start();

    /*
     * 중복 지급 방지.
     */
    if (mysteryTimeManager.isRewardGranted()) {
      console.warn("[MYSTERY_TIME_REWARD_ALREADY_GRANTED]", {
        rank: this.rank,
      });

      this.end();
      return;
    }

    /*
     * ========================================
     * 1. 골드 / 로그포인트
     * ========================================
     *
     * 몬스터소굴보다 조금 높은 보상.
     */
    const moneyMultipliers = [0, 3, 5, 7, 10, 15] as const;

    const roguePointRewards = [0, 100, 200, 350, 500, 750] as const;

    const moneyMultiplier = moneyMultipliers[this.rank] ?? 3;

    const roguePoints = roguePointRewards[this.rank] ?? 100;

    const moneyAmount = new NumberHolder(globalScene.getWaveMoneyAmount(moneyMultiplier));

    globalScene.applyModifiers(MoneyMultiplierModifier, true, moneyAmount);

    /*
     * 해피아워도 정상 적용.
     */
    if (globalScene.arena.getTag(ArenaTagType.HAPPY_HOUR)) {
      moneyAmount.value *= 2;
    }

    if (moneyAmount.value > 0) {
      globalScene.addMoney(moneyAmount.value);
    }

    if (roguePoints > 0) {
      globalScene.gameData.addRoguePoints(roguePoints);

      globalScene.updateroguePointText();
    }

    /*
     * ========================================
     * 2. 파티 공용 부적
     * ========================================
     */

    const goldenExpCharmCount = this.addPersistentModifier(modifierTypes.GOLDEN_EXP_CHARM, ExpBoosterModifier, 5);

    const shinyCharmCount = this.addPersistentModifier(modifierTypes.SHINY_CHARM, ShinyRateBoosterModifier, 2);

    const markCharmCount = this.addPersistentModifier(modifierTypes.MARK_CHARM, MarkRateBoosterModifier, 2);

    /*
     * ========================================
     * 3. 파티원 전원에게 알 지급
     * ========================================
     */

    const luckyEggCount = this.grantHeldItemToEntireParty(modifierTypes.LUCKY_EGG(), 3);

    const goldenEggCount = this.grantHeldItemToEntireParty(modifierTypes.GOLDEN_EGG(), 3);

    /*
     * Modifier 표시 갱신
     */
    globalScene.updateModifiers(true);

    /*
     * 보상 지급 완료 플래그.
     */
    mysteryTimeManager.markRewardGranted();

    const userLocale = navigator.language || "ko-KR";

    const formattedMoney = moneyAmount.value.toLocaleString(userLocale);

    const formattedRoguePoints = roguePoints.toLocaleString(userLocale);

    console.log("[MYSTERY_TIME_BOSS_REWARD]", {
      rank: this.rank,
      moneyMultiplier,
      money: moneyAmount.value,
      roguePoints,

      goldenExpCharmCount,
      shinyCharmCount,
      markCharmCount,

      luckyEggCount,
      goldenEggCount,
    });

    globalScene.ui.showText(
      [
        "데몬스터리를 쓰러뜨렸다!",
        "",
        `미스터리타임 ${this.rank}등급 보상을 획득했다!`,
        `골드 ${formattedMoney}`,
        `로그포인트 ${formattedRoguePoints} RP`,
        `황금경험치부적 ×${goldenExpCharmCount}`,
        `빛나는부적 ×${shinyCharmCount}`,
        `증표의부적 ×${markCharmCount}`,
        "행복의알 ×3 · 파티원 전원",
        "황금의알 ×3 · 파티원 전원",
      ].join("\n"),
      null,
      () => {
        const countdownPhase = globalScene.phaseManager.create("MysteryTimeCountdownPhase", () => {
          console.log("[MYSTERY_TIME_EXIT_COUNTDOWN_COMPLETE]", {
            wave: globalScene.currentBattle.waveIndex,
          });

          globalScene.toggleMysteryTimeGrayscale(false);

          // 카운트다운이 완전히 끝난 뒤
          // 미스터리타임 상태 종료
          mysteryTimeManager.finish();

          // 미스터리타임 BGM 잠금 해제 후
          // 현재 바이옴 BGM으로 복귀
          globalScene.playBgm(undefined, true);

          // 기존 보상 Phase 종료
          this.end();
        });

        const overridden = globalScene.phaseManager.overridePhase(countdownPhase);

        if (overridden) {
          console.log("[MYSTERY_TIME_EXIT_COUNTDOWN_START]", {
            wave: globalScene.currentBattle.waveIndex,
          });

          return;
        }

        /*
         * 예외적으로 override 실패 시
         * 게임 진행이 막히지 않도록 바로 종료.
         */
        console.warn("[MYSTERY_TIME_EXIT_COUNTDOWN_OVERRIDE_FAILED]", {
          wave: globalScene.currentBattle.waveIndex,
        });

        mysteryTimeManager.finish();

        globalScene.playBgm(undefined, true);

        this.end();
      },
      null,
      true,
    );
  }

  /**
   * 파티 공용 PersistentModifier를
   * 최대 스택을 넘지 않는 범위에서 지급한다.
   */
  private addPersistentModifier<T extends PersistentModifier>(
    modifierFunc: () => any,
    modifierClass: new (...args: any[]) => T,
    amount: number,
  ): number {
    const existingModifier = globalScene.findModifier(m => m instanceof modifierClass, true) as T | undefined;

    const type = modifierFunc();

    type.withIdFromFunc(modifierFunc);

    const dummyModifier = type.newModifier() as T | null;

    if (!dummyModifier) {
      return 0;
    }

    const currentCount = existingModifier?.getStackCount() ?? 0;

    const maxCount = existingModifier?.getMaxStackCount() ?? dummyModifier.getMaxStackCount();

    const addCount = Math.min(amount, Math.max(0, maxCount - currentCount));

    if (addCount <= 0) {
      return 0;
    }

    dummyModifier.stackCount = addCount;

    globalScene.addModifier(dummyModifier, true, false, false, true);

    return addCount;
  }

  /**
   * 동일한 지닌도구를 파티원 전원에게 지급한다.
   *
   * amount = 각 파티원이 받는 개수.
   */
  private grantHeldItemToEntireParty(modifierType: ModifierType, amount: number): number {
    if (!(modifierType instanceof PokemonModifierType)) {
      console.warn("[MYSTERY_TIME_INVALID_HELD_ITEM]", {
        item: modifierType.name,
      });

      return 0;
    }

    let totalGranted = 0;

    for (const pokemon of globalScene.getPlayerParty()) {
      const filterMessage = modifierType.selectFilter?.(pokemon);

      if (filterMessage) {
        console.log("[MYSTERY_TIME_HELD_ITEM_SKIPPED]", {
          item: modifierType.name,
          pokemon: pokemon.name,
          reason: filterMessage,
        });

        continue;
      }

      /*
       * 같은 포켓몬에게 amount번 지급.
       *
       * 기존 Modifier가 존재하면
       * addModifier()의 스택 병합 로직을 사용한다.
       */
      for (let i = 0; i < amount; i++) {
        const modifier = modifierType.newModifier(pokemon);

        if (modifier && globalScene.addModifier(modifier, true, false, false, true)) {
          totalGranted++;
        }
      }
    }

    return totalGranted;
  }
}
