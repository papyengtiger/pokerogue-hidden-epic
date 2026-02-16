// battle-start-immediate-berry-phase.ts
import { FieldPhase } from "#phases/field-phase";
import { BerryType } from "#enums/berry-type";
import { globalScene } from "#app/global-scene";
import { BerryModifier } from "#app/modifier/modifier";

const IMMEDIATE_STAT_BERRIES = new Set<BerryType>([
  BerryType.POMEG,
  BerryType.KELPSY,
  BerryType.QUALOT,
  BerryType.HONDEW,
  BerryType.GREPA,
  BerryType.TAMATO,
]);

export class BattleStartImmediateBerryPhase extends FieldPhase {
  public readonly phaseName = "BattleStartImmediateBerryPhase";

  start() {
    super.start();

    const turn = globalScene.currentBattle?.turn ?? 1;
    if (turn > 1) {
      this.end();
      return;
    }

    let queuedBerryPhase = false;

    for (const p of globalScene.getField()) {
      if (!p?.isActive?.()) continue;

      // held가 undefined인 환경도 있어서, modifier에서도 탐색
      let held: BerryType | undefined = p.getHeldBerryType?.();
      if (held === undefined) {
        const mods = globalScene
          .getModifiers(BerryModifier, p.isPlayer())
          .filter((m: any) => m instanceof BerryModifier && m.pokemonId === p.id) as BerryModifier[];
        if (mods.length) held = mods[0].berryType;
      }

      if (held === undefined || !IMMEDIATE_STAT_BERRIES.has(held)) continue;

      // battleData에 "이 배틀에서 이 베리타입을 배틀시작에 이미 먹었는지" 기록 (타입별 1회)
      const bd: any = (p as any).battleData ?? ((p as any).battleData = {});
      const used: Record<number, boolean> = bd.immediateStartBerryUsed ?? (bd.immediateStartBerryUsed = {});
      if (used[held]) continue;

      // ✅ 이번 BerryPhase에서 딱 1개만 먹게끔 지시
      (p.turnData as any).battleStartImmediateBerryMode = true;
      (p.turnData as any).battleStartImmediateBerryType = held;

      queuedBerryPhase = true;
    }

    if (queuedBerryPhase) {
      globalScene.phaseManager.unshiftNew("BerryPhase");
    }

    this.end();
  }
}
