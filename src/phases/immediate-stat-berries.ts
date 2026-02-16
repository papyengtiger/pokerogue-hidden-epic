import { globalScene } from "#app/global-scene";
import { FieldPhase } from "#phases/field-phase";
import { BerryType } from "#enums/berry-type";
import { BerryModifier } from "#modifiers/modifier";
import { ModifierType } from "#app/modifier/modifier-type";
import { BattlerIndex } from "#enums/battler-index";

export class BattleStartImmediateBerryPhase extends FieldPhase {
  public readonly phaseName = "BattleStartImmediateBerryPhase";

  start() {
    super.start();

    const IMMEDIATE = new Set<BerryType>([
      BerryType.POMEG,
      BerryType.KELPSY,
      BerryType.QUALOT,
      BerryType.HONDEW,
      BerryType.GREPA,
      BerryType.TAMATO,
    ]);

    let anyQueued = false;

    for (const pokemon of globalScene.getField()) {
      if (!pokemon?.isActive?.()) continue;

      const bd: any = (pokemon as any).battleData ?? ((pokemon as any).battleData = {});
      const used: Record<number, boolean> = bd.immediateStartBerryUsed ?? (bd.immediateStartBerryUsed = {});

      // 1) 이 포켓몬에 달린 BerryModifier 전부 가져오기
      const mods = globalScene
        .getModifiers(BerryModifier, pokemon.isPlayer())
        .filter((m: any) => m instanceof BerryModifier && m.pokemonId === pokemon.id) as BerryModifier[];

      // 2) 디버그(필요하면 잠깐 켜두기)
       console.log(`[BSIB] ${pokemon.name} heldFromGetter=${pokemon.getHeldBerryType?.()} mods=[${mods.map(m => BerryType[m.berryType]).join(",")}]`);

      // 3) modifier들 중 "즉발 베리"면서 아직 타입별 1회 안 쓴 것 찾기
      let picked: BerryType | undefined =
        mods.find(m => IMMEDIATE.has(m.berryType) && !used[m.berryType])?.berryType;

      // 4) modifier로 못 찾았으면 held getter도 확인
      if (picked === undefined) {
        const held = pokemon.getHeldBerryType?.();
        if (held !== undefined && IMMEDIATE.has(held) && !used[held]) {
          picked = held;
        }
      }

      if (picked === undefined) continue;

      // 5) BerryPhase가 modifier 기반이면, 해당 타입 modifier가 없을 때만 주입
      const hasPickedMod = mods.some(m => m.berryType === picked);
      if (!hasPickedMod) {
        globalScene.addModifier(new BerryModifier(ModifierType.BERRY, pokemon.id, picked), pokemon.isPlayer());
        globalScene.updateModifiers(pokemon.isPlayer());
      }

      // 6) BerryPhase에 "즉발 모드로 이 타입만 1개 먹어라" 전달
      const td: any = pokemon.turnData as any;
      td.battleStartImmediateBerryMode = true;
      td.battleStartImmediateBerryType = picked;

      anyQueued = true;
    }

    // ✅ 먹을 대상이 있으면 BerryPhase가 "다음"으로 오도록 unshift
    if (anyQueued) {
      globalScene.phaseManager.unshiftNew("BerryPhase");
    }

    // ✅ 이제서야 커맨드/턴스타트를 큐잉 (먹고 시작)
    globalScene.getField().forEach((pokemon, i) => {
      if (!pokemon?.isActive?.()) return;

      if (pokemon.isPlayer()) {
        globalScene.phaseManager.pushNew("CommandPhase", i);
      } else {
        globalScene.phaseManager.pushNew("EnemyCommandPhase", i - BattlerIndex.ENEMY);
      }
    });

    globalScene.phaseManager.pushNew("TurnStartPhase");
    this.end();
  }
}
