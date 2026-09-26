import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { TYPE_PRIORITY_BERRIES } from "#data/berry";
import { BerryType } from "#enums/berry-type";
import { CommonAnim } from "#enums/move-anims-common";
import { BerryUsedEvent } from "#events/battle-scene";
import type { Pokemon } from "#field/pokemon";
import { BerryModifier, PreventBerryUseItemModifier } from "#modifiers/modifier";
import { FieldPhase } from "#phases/field-phase";
import { BooleanHolder } from "#utils/common";
import i18next from "i18next";

export class BerryPhase extends FieldPhase {
  public readonly phaseName = "BerryPhase";

  start() {
    super.start();

    this.executeForAll(pokemon => {
      this.eatBerries(pokemon);
      applyAbAttrs("CudChewConsumeBerryAbAttr", { pokemon });
    });

    this.end();
  }

  eatBerries(pokemon: Pokemon): void {
    // ✅ 즉발 모드 플래그
    const td: any = pokemon.turnData as any;
    const immediateMode = td.battleStartImmediateBerryMode === true;
    const immediateType: BerryType | undefined = td.battleStartImmediateBerryType;

    // ---- (A) "먹을 수 있는 열매"가 있는지 먼저 확인 (shouldApply 기준) ----
    const mods = globalScene
      .getModifiers(BerryModifier, pokemon.isPlayer())
      .filter(
        (m: any) =>
          m instanceof BerryModifier
          && !TYPE_PRIORITY_BERRIES.has(m.berryType)
          && m.berryType !== BerryType.CUSTAP
          && m.shouldApply(pokemon),
      ) as BerryModifier[];

    if (mods.length === 0) {
      // ✅ 즉발 모드 플래그 정리
      delete td.battleStartImmediateBerryMode;
      delete td.battleStartImmediateBerryType;
      return;
    }

    // ---- (B) 열매 사용 방해 체크들 (원본 BerryPhase 로직 유지) ----

    // 상대가 PreventBerryUseItemModifier를 들고 있으면 방해
    const opponents = pokemon.getOpponents();
    const hasPreventBerryUseItem = opponents.some(opp =>
      globalScene.getModifiers(PreventBerryUseItemModifier).some(mod => mod.pokemonId === opp.id),
    );

    if (hasPreventBerryUseItem) {
      globalScene.phaseManager.queueMessage(
        i18next.t("abilityTriggers:preventBerryUse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );
      // 즉발 모드 플래그 정리
      delete td.battleStartImmediateBerryMode;
      delete td.battleStartImmediateBerryType;
      return;
    }

    // 긴장감/긴장감류(PreventBerryUseAbAttr) 체크
    const cancelled = new BooleanHolder(false);
    opponents.forEach(opp => applyAbAttrs("PreventBerryUseAbAttr", { pokemon: opp, cancelled }));

    if (cancelled.value) {
      globalScene.phaseManager.queueMessage(
        i18next.t("abilityTriggers:preventBerryUse", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        }),
      );
      // 즉발 모드 플래그 정리
      delete td.battleStartImmediateBerryMode;
      delete td.battleStartImmediateBerryType;
      return;
    }

    // ---- (C) 즉발 모드: "지정한 타입 1개만" 먹고 종료 ----
    if (immediateMode) {
      // immediateType이 없으면 그냥 플래그 정리하고 종료
      if (immediateType === undefined) {
        delete td.battleStartImmediateBerryMode;
        delete td.battleStartImmediateBerryType;
        return;
      }

      // ✅ 배틀당 "타입별 1회" 기록
      const bd: any = (pokemon as any).battleData ?? ((pokemon as any).battleData = {});
      const used: Record<number, boolean> = bd.immediateStartBerryUsed ?? (bd.immediateStartBerryUsed = {});

      // 이미 이 타입 즉발을 배틀에서 썼으면 종료(애니메이션도 안 함)
      if (used[immediateType]) {
        delete td.battleStartImmediateBerryMode;
        delete td.battleStartImmediateBerryType;
        return;
      }

      const target = mods.find(m => m.berryType === immediateType);
      if (!target) {
        // 해당 타입 베리가 “지금 먹을 수 있는 상태”가 아니면 종료
        delete td.battleStartImmediateBerryMode;
        delete td.battleStartImmediateBerryType;
        return;
      }

      // ✅ 여기서부터는 실제로 먹을 게 확정이므로 애니메이션
      globalScene.phaseManager.unshiftNew(
        "CommonAnimPhase",
        pokemon.getBattlerIndex(),
        pokemon.getBattlerIndex(),
        CommonAnim.USE_ITEM,
      );

      // ✅ 딱 1개만 적용
      target.apply(pokemon);

      // consumed면 아이템 제거(원본 흐름과 동일)
      if (target.consumed) {
        target.consumed = false;
        pokemon.loseHeldItem(target);
      }

      globalScene.eventTarget.dispatchEvent(new BerryUsedEvent(target));
      globalScene.updateModifiers(pokemon.isPlayer());
      applyAbAttrs("HealFromBerryUseAbAttr", { pokemon });

      // ✅ 타입별 1회 기록
      used[immediateType] = true;

      // ✅ 즉발 모드에서는 "다른 베리 연쇄 섭취" 방지하고 종료
      delete td.battleStartImmediateBerryMode;
      delete td.battleStartImmediateBerryType;
      return;
    }

    // ---- (D) 일반 모드: 기존처럼 한 번에 가능한 베리들 처리 ----
    globalScene.phaseManager.unshiftNew(
      "CommonAnimPhase",
      pokemon.getBattlerIndex(),
      pokemon.getBattlerIndex(),
      CommonAnim.USE_ITEM,
    );

    for (const berryModifier of globalScene.applyModifiers(BerryModifier, pokemon.isPlayer(), pokemon)) {
      if (berryModifier.consumed) {
        berryModifier.consumed = false;
        pokemon.loseHeldItem(berryModifier);
      }
      globalScene.eventTarget.dispatchEvent(new BerryUsedEvent(berryModifier));
    }
    globalScene.updateModifiers(pokemon.isPlayer());

    applyAbAttrs("HealFromBerryUseAbAttr", { pokemon });

    // 혹시 남아있을 수 있는 플래그 정리
    delete td.battleStartImmediateBerryMode;
    delete td.battleStartImmediateBerryType;
  }
}
