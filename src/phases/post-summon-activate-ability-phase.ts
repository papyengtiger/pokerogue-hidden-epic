import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import type { BattlerIndex } from "#enums/battler-index";
import { PostSummonPhase } from "#phases/post-summon-phase";
import { SpeciesStatBoosterModifier, PokemonFormChangeItemModifier, CalyrexReinsUnifiedModifier } from "#app/modifier/modifier";
import { AbilityId } from "#enums/ability-id";

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

  applyAbAttrs("PostSummonAbAttr", { pokemon, passive: this.passive });

  // ✅ passive 패스에서는 아이템 발동 금지
  if (this.passive) {
    this.end();
    return;
  }

  // SpeciesStatBooster
const boosters = pokemon.getHeldItems().filter(i => i instanceof SpeciesStatBoosterModifier) as SpeciesStatBoosterModifier[];
for (const m of boosters) m.onPostSummon(pokemon, false);

// FormChangeItem
const formItems = pokemon.getHeldItems().filter(i => i instanceof PokemonFormChangeItemModifier) as PokemonFormChangeItemModifier[];
for (const m of formItems) m.applyGenesectDrivePostSummon(pokemon, false);

// 🔥 검은갈기/하얀갈기
const reins = pokemon.getHeldItems().filter(
  i => i instanceof CalyrexReinsUnifiedModifier
) as CalyrexReinsUnifiedModifier[];

for (const m of reins) m.applyPostSummon(pokemon, false);

  this.end();
}

  public override getPriority() {
    return this.priority;
  }
}