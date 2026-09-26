import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import {
  CalyrexReinsUnifiedModifier,
  PokemonFormChangeItemModifier,
  SpeciesStatBoosterModifier,
} from "#app/modifier/modifier";
import type { BattlerIndex } from "#enums/battler-index";
import { Stat } from "#enums/stat";
import { PostSummonPhase } from "#phases/post-summon-phase";

/**
 * Helper to {@linkcode PostSummonPhase} which applies abilities
 */
export class PostSummonActivateAbilityPhase extends PostSummonPhase {
  private readonly priority: number;
  private readonly passive: boolean;

  constructor(battlerIndex: BattlerIndex, priority: number, passive: boolean) {
    super(battlerIndex);
    this.priority = priority;
    this.passive = passive;
  }

  start() {
    const pokemon = this.getPokemon();

    if (!pokemon) {
      console.warn("[POST_SUMMON_ABILITY_NO_POKEMON]", {
        battlerIndex: this.battlerIndex,
        passive: this.passive,
      });

      this.end();
      return;
    }

    applyAbAttrs("PostSummonAbAttr", {
      pokemon,
      passive: this.passive,
    });

    if ((pokemon as any).isPracticeDummy) {
      globalScene.time.delayedCall(1, () => {
        (pokemon as any).keepDummySpriteVisible?.();
      });

      globalScene.time.delayedCall(100, () => {
        (pokemon as any).keepDummySpriteVisible?.();
      });
    }

    if (this.passive) {
      this.end();
      return;
    }

    this.applyBoostEnergyTag(pokemon);

    const boosters = pokemon
      .getHeldItems()
      .filter(i => i instanceof SpeciesStatBoosterModifier) as SpeciesStatBoosterModifier[];

    for (const m of boosters) {
      m.onPostSummon(pokemon, false);
    }

    const formItems = pokemon
      .getHeldItems()
      .filter(i => i instanceof PokemonFormChangeItemModifier) as PokemonFormChangeItemModifier[];

    for (const m of formItems) {
      m.applyGenesectDrivePostSummon(pokemon, false);
    }

    const reins = pokemon
      .getHeldItems()
      .filter(i => i instanceof CalyrexReinsUnifiedModifier) as CalyrexReinsUnifiedModifier[];

    for (const m of reins) {
      m.applyPostSummon(pokemon, false);
    }

    this.end();
  }

  public override getPriority() {
    return this.priority;
  }
}
