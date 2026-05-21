import { globalScene } from "#app/global-scene";
import { BattlePhase } from "#phases/battle-phase";
import { StatusEffect } from "#enums/status-effect";

export class PracticeDummyResetPhase extends BattlePhase {
  public readonly phaseName = "PracticeDummyResetPhase";

  start() {
    super.start();

    console.log("[PRACTICE_DUMMY_RESET_ENTER]");

    const battle = globalScene.currentBattle as any;
    const dummy = battle.practiceDummy;

    if (dummy) {
      if (dummy.hp <= 0) {
  dummy.hp = dummy.getMaxHp?.() ?? dummy.maxHp ?? 100;
}

      dummy.doSetStatus?.(StatusEffect.NONE);
      dummy.status = null;

      dummy.resetTurnData?.();
      dummy.resetSummonData?.();

      dummy.setVisible(true);
      dummy.setAlpha(1);
      dummy.y -= dummy.y > 150 ? 150 : 0;
      dummy.showInfo?.();
      dummy.updateInfo?.();
      dummy.updateHpBar?.();
    }

    battle.enemyFaints = 0;
    battle.enemyFaintsHistory = [];

    this.end();
  }
}