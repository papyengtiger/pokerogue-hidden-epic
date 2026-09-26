import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { CommonBattleAnim } from "#data/battle-anims";
import { SpeciesFormChangeStatusEffectTrigger } from "#data/form-change-triggers";
import { getStatusEffectObtainText } from "#data/status-effect";
import type { BattlerIndex } from "#enums/battler-index";
import { CommonAnim } from "#enums/move-anims-common";
import { StatusEffect } from "#enums/status-effect";
import type { Pokemon } from "#field/pokemon";
import { PokemonPhase } from "#phases/pokemon-phase";

export class ObtainStatusEffectPhase extends PokemonPhase {
  public readonly phaseName = "ObtainStatusEffectPhase";

  /**
   * @param battlerIndex - The {@linkcode BattlerIndex} of the Pokemon obtaining the status effect.
   * @param statusEffect - The {@linkcode StatusEffect} being applied.
   * @param sourcePokemon - The {@linkcode Pokemon} applying the status effect to the target,
   * or `null` if the status is applied from a non-Pokemon source (hazards, etc.); default `null`.
   * @param sleepTurnsRemaining - The number of turns to set {@linkcode StatusEffect.SLEEP} for;
   * defaults to a random number between 2 and 4 and is unused for non-Sleep statuses.
   * @param sourceText - The text to show for the source of the status effect, if any; default `null`.
   * @param statusMessage - A string containing text to be displayed upon status setting;
   * defaults to normal key for status if empty or omitted.
   */
  constructor(
    battlerIndex: BattlerIndex,
    private statusEffect: StatusEffect,
    private sourcePokemon: Pokemon | null = null,
    private sleepTurnsRemaining?: number,
    sourceText: string | null = null, // TODO: This should take `undefined` instead of `null`
    private statusMessage = "",
  ) {
    super(battlerIndex);

    this.statusMessage ||= getStatusEffectObtainText(
      statusEffect,
      getPokemonNameWithAffix(this.getPokemon()),
      sourceText ?? undefined,
    );
  }

  start() {
    const pokemon = this.getPokemon();

    // ✅ Phase가 실행되기 전에 대상이 필드에서 사라졌을 수 있음
    if (!pokemon) {
      console.warn("[STATUS_PHASE_TARGET_MISSING]", {
        statusEffect: this.statusEffect,
        sourcePokemon: this.sourcePokemon?.name,
      });

      this.end();
      return;
    }

    pokemon.doSetStatus(this.statusEffect, this.sleepTurnsRemaining);

    if (pokemon.status && (this.statusEffect === StatusEffect.POISON || this.statusEffect === StatusEffect.TOXIC)) {
      pokemon.status.sourcePokemonId = this.sourcePokemon?.id;
    }

    pokemon.updateInfo(true);

    new CommonBattleAnim(CommonAnim.POISON + (this.statusEffect - 1), pokemon).play(false, () => {
      globalScene.phaseManager.queueMessage(this.statusMessage);

      if (this.statusEffect && this.statusEffect !== StatusEffect.FAINT) {
        globalScene.triggerPokemonFormChange(pokemon, SpeciesFormChangeStatusEffectTrigger, true);

        globalScene.arena.setIgnoreAbilities(false);

        applyAbAttrs("PostSetStatusAbAttr", {
          pokemon,
          effect: this.statusEffect,
          sourcePokemon: this.sourcePokemon ?? undefined,
        });
      }

      this.end();
    });
  }
}
