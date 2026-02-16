import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { CommonBattleAnim } from "#data/battle-anims";
import { getStatusEffectActivationText } from "#data/status-effect";
import { BattleSpec } from "#enums/battle-spec";
import type { BattlerIndex } from "#enums/battler-index";
import { CommonAnim } from "#enums/move-anims-common";
import { StatusEffect } from "#enums/status-effect";
import { PokemonPhase } from "#phases/pokemon-phase";
import { BooleanHolder, NumberHolder } from "#utils/common";
import { SpeciesStatBoosterModifier } from "#app/modifier/modifier";
import { blocksNonDirectDamage } from "#abilities/block-non-direct-damage";

export class PostTurnStatusEffectPhase extends PokemonPhase {
  public readonly phaseName = "PostTurnStatusEffectPhase";

  constructor(battlerIndex: BattlerIndex) {
    super(battlerIndex);
  }

  start() {
    const pokemon = this.getPokemon();

    if (!pokemon?.isActive(true) || !pokemon.status || !pokemon.status.isPostTurn() || pokemon.switchOutStatus) {
      return this.end();
    }

    pokemon.status.incrementTurn();

    const cancelled = new BooleanHolder(false);

    // 1) 상태도트 전용 차단(예: Immunity류 / 특정 면역 로직이 여기로 들어옴)
    applyAbAttrs("BlockStatusDamageAbAttr", { pokemon, cancelled });

    // 2) ✅ 매직가드/아이템 포함 “간접 데미지” 차단이면 상태도트도 같이 막힘
    if (!cancelled.value && blocksNonDirectDamage(pokemon, false)) {
      cancelled.value = true;
    }

    if (cancelled.value) {
      return this.end();
    }

    globalScene.phaseManager.queueMessage(
      getStatusEffectActivationText(pokemon.status.effect, getPokemonNameWithAffix(pokemon)),
    );

    const damage = new NumberHolder(0);

    switch (pokemon.status.effect) {
      case StatusEffect.POISON:
        damage.value = Math.max(pokemon.getMaxHp() >> 3, 1);
        break;

      case StatusEffect.TOXIC:
        damage.value = Math.max(Math.floor((pokemon.getMaxHp() / 16) * pokemon.status.toxicTurnCount), 1);
        break;

      case StatusEffect.BURN:
        damage.value = Math.max(pokemon.getMaxHp() >> 4, 1);
        applyAbAttrs("ReduceBurnDamageAbAttr", { pokemon, burnDamage: damage });
        break;

      case StatusEffect.FROSTBITE:
        damage.value = Math.max(pokemon.getMaxHp() >> 4, 1);
        break;
    }

    // ✅ MYTHICAL_PECHA_BERRY: 가해자가 소지 시 독/맹독 도트 2배
    if (
      damage.value &&
      (pokemon.status.effect === StatusEffect.POISON || pokemon.status.effect === StatusEffect.TOXIC)
    ) {
      const srcId = (pokemon.status as any).sourcePokemonId;
      const source =
        typeof srcId === "number" ? (globalScene as any).getPokemonById?.(srcId) : null;

      if (source) {
        const sceneAny: any = (globalScene as any).sys?.scene ?? (globalScene as any);
        const allMods: any[] = sceneAny?.modifiers ?? [];

        const hasMythicalPecha = allMods.some(m => {
          if (m?.pokemonId !== source.id) return false;
          if (!(m instanceof SpeciesStatBoosterModifier)) return false;
          const k = m?.type?.key ?? m?.type?.id ?? m?.key;
          return k === "MYTHICAL_PECHA_BERRY";
        });

        if (hasMythicalPecha) {
          damage.value = Math.max(Math.floor(damage.value * 2), 1);
          console.log("[PECHA_DOT_X2]", { target: pokemon.name, source: source.name, dmg: damage.value });
        }
      }
    }

    if (damage.value) {
      globalScene.damageNumberHandler.add(this.getPokemon(), pokemon.damage(damage.value, false, true));
      pokemon.updateInfo();
      applyAbAttrs("PostDamageAbAttr", { pokemon, damage: damage.value });
    }

    new CommonBattleAnim(CommonAnim.POISON + (pokemon.status.effect - 1), pokemon).play(false, () => this.end());
  }

  override end() {
    if (globalScene.currentBattle.battleSpec === BattleSpec.FINAL_BOSS) {
      globalScene.initFinalBossPhaseTwo(this.getPokemon());
    } else {
      super.end();
    }
  }
}