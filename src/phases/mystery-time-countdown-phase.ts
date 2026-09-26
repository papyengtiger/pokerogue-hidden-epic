import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { TextStyle } from "#enums/text-style";
import { addTextObject } from "#ui/text";

/**
 * 미스터리타임 시작 시 3 -> 2 -> 1 카운트다운을 표시하는 연출 Phase.
 *
 * 이 Phase는 연출만 담당한다.
 * 미스터리타임의 활성화/등급/종료층 등의 상태는 MysteryTimeManager가 관리한다.
 */
export class MysteryTimeCountdownPhase extends Phase {
  public readonly phaseName = "MysteryTimeCountdownPhase";

  /** 숫자 하나의 전체 연출 시간(ms) */
  private readonly numberDuration = 850;

  /** 숫자 등장 확대 시간(ms) */
  private readonly appearDuration = 180;

  /** 숫자 퇴장 시간(ms) */
  private readonly disappearDuration = 250;

  private countdownText: Phaser.GameObjects.Text | null = null;

  /**
   * EncounterPhase를 잠시 override해서 실행할 때,
   * 카운트다운 종료 후 원래 조우 흐름을 재개하기 위한 콜백.
   */
  private readonly onComplete?: () => void;

  constructor(onComplete?: () => void) {
    super();
    this.onComplete = onComplete;
  }

  start(): void {
    super.start();

    console.log("[MYSTERY_TIME_COUNTDOWN_START]", {
      wave: globalScene.currentBattle.waveIndex,
    });

    const camera = globalScene.cameras.main;

    this.countdownText = addTextObject(camera.centerX, camera.centerY, "3", TextStyle.WINDOW_ALT, {
      fontSize: "96px",
      align: "center",
    });

    this.countdownText.setOrigin(0.5, 0.5).setDepth(10000).setAlpha(0).setScale(0.55);

    this.playNumber(3);
  }

  /**
   * 지정한 숫자를 한 번 재생한다.
   * 3 -> 2 -> 1 순으로 재귀 호출한다.
   */
  private playNumber(number: number): void {
    const text = this.countdownText;

    if (!text) {
      this.finishCountdown();
      return;
    }

    text.setText(number.toString()).setAlpha(0).setScale(0.55);

    // 숫자가 빠르게 화면 앞으로 튀어나오는 느낌.
    globalScene.tweens.add({
      targets: text,
      alpha: 1,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: this.appearDuration,
      ease: "Back.easeOut",
      onComplete: () => {
        const holdDuration = Math.max(0, this.numberDuration - this.appearDuration - this.disappearDuration);

        // 잠시 유지한 뒤 커지면서 사라진다.
        globalScene.tweens.add({
          targets: text,
          alpha: 0,
          scaleX: 1.45,
          scaleY: 1.45,
          delay: holdDuration,
          duration: this.disappearDuration,
          ease: "Sine.easeIn",
          onComplete: () => {
            if (number > 1) {
              this.playNumber(number - 1);
              return;
            }

            this.finishCountdown();
          },
        });
      },
    });
  }

  /** 카운트다운 오브젝트를 정리하고 다음 Phase로 진행한다. */
  private finishCountdown(): void {
    if (this.countdownText) {
      globalScene.tweens.killTweensOf(this.countdownText);
      this.countdownText.destroy();
      this.countdownText = null;
    }

    console.log("[MYSTERY_TIME_COUNTDOWN_END]", {
      wave: globalScene.currentBattle.waveIndex,
    });

    // overridePhase로 대기 중이던 EncounterPhase를 먼저 복원한다.
    this.end();

    // 복원된 EncounterPhase의 조우 흐름을 이어서 실행한다.
    this.onComplete?.();
  }
}
