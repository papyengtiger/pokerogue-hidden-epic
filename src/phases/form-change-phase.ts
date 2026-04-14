import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { getSpeciesFormChangeMessage } from "#data/form-change-triggers";
import type { SpeciesFormChange } from "#data/pokemon-forms";
import { BattlerTagType } from "#enums/battler-tag-type";
import { SpeciesFormKey } from "#enums/species-form-key";
import { UiMode } from "#enums/ui-mode";
import type { PlayerPokemon, Pokemon } from "#field/pokemon";
import { EvolutionPhase } from "#phases/evolution-phase";
import { achvs } from "#system/achv";
import type { PartyUiHandler } from "#ui/party-ui-handler";
import { fixedInt } from "#utils/common";
import { WishingStarModifier } from "../modifier/modifier";
import type {
  DoubleBattleChanceBoosterModifierType,
  EvolutionItemModifierType,
  FormChangeItemModifierType,
  ModifierOverride,
  ModifierType,
  PokemonBaseStatTotalModifierType,
  PokemonExpBoosterModifierType,
  PokemonFriendshipBoosterModifierType,
  PokemonMoveAccuracyBoosterModifierType,
  PokemonMultiHitModifierType,
  TerastallizeModifierType,
  TmModifierType,
  WishingStarModifierType
} from "#modifiers/modifier-type";

export class FormChangePhase extends EvolutionPhase {
  public readonly phaseName = "FormChangePhase";
  private formChange: SpeciesFormChange;
  private modal: boolean;

  constructor(pokemon: PlayerPokemon, formChange: SpeciesFormChange, modal: boolean) {
    super(pokemon, null, 0);

    this.formChange = formChange;
    this.modal = modal;
  }

  validate(): boolean {
    return !!this.formChange;
  }

  setMode(): Promise<void> {
    if (!this.modal) {
      return super.setMode();
    }
    return globalScene.ui.setOverlayMode(UiMode.EVOLUTION_SCENE);
  }

  /**
   * Commence the tweens that play after the form change animation finishes
   * @param transformedPokemon - The Pokemon after the evolution
   * @param preName - The name of the Pokemon before the evolution
   */
  private postFormChangeTweens(transformedPokemon: Pokemon, preName: string): void {
    console.log("[FormChange] postFormChangeTweens start",
    !!this.evolutionOverlay, !!this.evolutionBgOverlay, !!this.pokemonEvoTintSprite);
    globalScene.tweens.chain({
      targets: null,
      tweens: [
        {
          targets: this.evolutionOverlay,
          alpha: 1,
          duration: 250,
          easing: "Sine.easeIn",
          onComplete: () => {
            this.evolutionBgOverlay.setAlpha(1);
            this.evolutionBg.setVisible(false);
          },
        },
        {
          targets: [this.evolutionOverlay, this.pokemonEvoTintSprite],
          alpha: 0,
          duration: 2000,
          delay: 150,
          easing: "Sine.easeIn",
        },
        {
          targets: this.evolutionBgOverlay,
          alpha: 0,
          duration: 250,
          completeDelay: 250,
          onComplete: () => this.pokemon.cry(),
        },
      ],
      // 1.25 seconds after the pokemon cry
      completeDelay: 1250,
      onComplete: () => {
        let playEvolutionFanfare = false;
        if (this.formChange.formKey.indexOf(SpeciesFormKey.MEGA) > -1) {
          globalScene.validateAchv(achvs.MEGA_EVOLVE);
          playEvolutionFanfare = true;
        } else if (
          this.formChange.formKey.indexOf(SpeciesFormKey.GIGANTAMAX) > -1 ||
          this.formChange.formKey.indexOf(SpeciesFormKey.ETERNAMAX) > -1
        ) {
          globalScene.validateAchv(achvs.GIGANTAMAX);
          playEvolutionFanfare = true;
        }

        const delay = playEvolutionFanfare ? 4000 : 1750;
        globalScene.playSoundWithoutBgm(playEvolutionFanfare ? "evolution_fanfare" : "minor_fanfare");
        transformedPokemon.destroy();
        globalScene.ui.showText(
          getSpeciesFormChangeMessage(this.pokemon, this.formChange, preName),
          null,
          () => this.end(),
          null,
          true,
          fixedInt(delay),
        );
        globalScene.time.delayedCall(fixedInt(delay + 250), () => globalScene.playBgm());
      },
    });
  }

  /**
   * Commence the animations that occur once the form change evolution cycle ({@linkcode doCycle}) is complete
   *
   * @privateRemarks
   * This would prefer {@linkcode doCycle} to be refactored and de-promisified so this can be moved into {@linkcode beginTweens}
   * @param preName - The name of the Pokemon before the evolution
   * @param transformedPokemon - The Pokemon being transformed into
   */
  private afterCycle(preName: string, transformedPokemon: Pokemon): void {
    globalScene.playSound("se/sparkle");
    this.pokemonEvoSprite.setVisible(true);
    this.doCircleInward();

    globalScene.time.delayedCall(900, () => {
      console.log("[폼체인지] changeForm 호출 직전", {
  speciesId: 800,
  currentFormKey: this.pokemon.getSpeciesForm?.()?.formKey, // ✅
  currentFormIndex: this.pokemon.formIndex,
  targetFormKey: this.formChange.formKey,
  preFormKey: (this.formChange as any).preFormKey,
});

console.log("[DEBUG] summonData.speciesForm =", this.pokemon.summonData?.speciesForm);
console.log("[DEBUG] typeof =", typeof this.pokemon.summonData?.speciesForm);
console.log("[DEBUG] hasKey =", (this.pokemon.summonData?.speciesForm as any)?.key);
console.log("[DEBUG] realFromIndex =",
  (this.pokemon.species as any).forms?.[this.pokemon.formIndex]?.formKey // ✅
);
console.log("[DEBUG] form obj =", this.pokemon.getSpeciesForm?.());
console.log("[DEBUG] form keys =", Object.keys(this.pokemon.getSpeciesForm?.() ?? {}));

      this.pokemon.changeForm(this.formChange).then(() => {

      // ✅ 로그포인트 지급 (폼체인지 성공)
const gainedRp = this.getFormChangeRoguePoints(this.formChange);

if (gainedRp > 0) {
  globalScene.gameData.addRoguePoints(gainedRp);
  globalScene.updateroguePointText();
}
        console.log("[폼체인지] ✅ changeForm 완료", {
  speciesId: this.pokemon.species.speciesId,
  newFormKey: this.pokemon.getSpeciesForm?.()?.formKey, // ✅
  newFormIndex: this.pokemon.formIndex,
});

        console.log("[UI][AFTER FORM CHANGE]", {
    mode: globalScene.ui.getMode(),
    overlay: globalScene.ui.getOverlayMode?.(),
    transitioning: (globalScene.ui as any).transitioning,
  });
        console.log("[폼체인지] 직전", {
  name: this.pokemon.name,
  species: (this.pokemon as any).species,
  formIndex: (this.pokemon as any).formIndex,
  shiny: (this.pokemon as any).shiny,
  variant: (this.pokemon as any).variant,
  speciesForm: this.pokemon.getSpeciesForm?.()?.key,
});

        // ✅ Gigantamax / Dynamax 여부 확인 후 플래그 설정
        const maxForms = [
          SpeciesFormKey.GIGANTAMAX,
          SpeciesFormKey.GIGANTAMAX_SINGLE,
          SpeciesFormKey.GIGANTAMAX_RAPID,
          SpeciesFormKey.ETERNAMAX,
        ];
        this.pokemon.isDynamaxed = maxForms.includes(this.pokemon.formKey);
        console.log(`[폼체인지] isDynamaxed=${this.pokemon.isDynamaxed}`);

        // ✅ WishingStarModifier 자동 적용
        if (!globalScene.hasModifier(WishingStarModifier, this.pokemon.instanceId)) {
          console.debug(`[폼체인지] ${this.pokemon.name}에게 WishingStarModifier 적용`);
          globalScene.addModifier(WishingStarModifier, this.pokemon.instanceId);
        }

        // ✅ 폼 변경 후 리소스 재로딩
        if (this.pokemon.summonData?.speciesForm) {
          console.log("[폼체인지] loadAssets 호출 (폼 변경 후 리소스 재로딩)");
          this.pokemon.loadAssets(false);
        }

        if (!this.modal) {
          globalScene.phaseManager.unshiftNew("EndEvolutionPhase");
        }

        globalScene.playSound("se/shine");
        this.doSpray();
        this.postFormChangeTweens(transformedPokemon, preName);
      });
    });
  }

  private getFormChangeRoguePoints(formChange: SpeciesFormChange): number {
  const key = formChange.formKey;

  // 메가진화
  if (key.indexOf(SpeciesFormKey.MEGA) > -1) return 20;

  // 무한다이맥스 (에터나맥스)
  if (key.indexOf(SpeciesFormKey.ETERNAMAX) > -1) return 40;

  // 거다이맥스
  if (key.indexOf(SpeciesFormKey.GIGANTAMAX) > -1) return 20;

  // 원시회귀
  if (key === SpeciesFormKey.PRIMAL) return 40;

  // 폼체인지
  if (
    key === SpeciesFormKey.ORIGIN ||
    key === SpeciesFormKey.THERIAN ||
    key === SpeciesFormKey.INCARNATE
  ) return 30;

  return 3;
}

  /**
   * Commence the sequence of tweens and events that occur during the evolution animation
   * @param preName The name of the Pokemon before the evolution
   * @param transformedPokemon The Pokemon after the evolution
   */
  private beginTweens(preName: string, transformedPokemon: Pokemon): void {
    globalScene.tweens.chain({
      // Starts 250ms after sprites have been configured
      targets: null,
      tweens: [
        // Step 1: Fade in the background overlay
        {
          delay: 250,
          targets: this.evolutionBgOverlay,
          alpha: 1,
          duration: 1500,
          ease: "Sine.easeOut",
          // We want the backkground overlay to fade out after it fades in
          onComplete: () => {
            globalScene.tweens.add({
              targets: this.evolutionBgOverlay,
              alpha: 0,
              duration: 250,
              delay: 1000,
            });
            this.evolutionBg.setVisible(true).play();
          },
        },
        // Step 2: Play the sounds and fade in the tint sprite
        {
          targets: this.pokemonTintSprite,
          alpha: { from: 0, to: 1 },
          duration: 2000,
          onStart: () => {
            globalScene.playSound("se/charge");
            this.doSpiralUpward();
          },
          onComplete: () => {
            this.pokemonSprite.setVisible(false);
          },
        },
      ],

      // Step 3: Commence the form change animation via doCycle then continue the animation chain with afterCycle
      completeDelay: 1100,
      onComplete: () => {
        globalScene.playSound("se/beam");
        this.doArcDownward();
        globalScene.time.delayedCall(1000, () => {
          this.pokemonEvoTintSprite.setScale(0.25).setVisible(true);
          this.doCycle(1, 1, () => this.afterCycle(preName, transformedPokemon));
        });
      },
    });
  }

  doEvolution(): void {
    const preName = getPokemonNameWithAffix(this.pokemon, false);

    this.pokemon.getPossibleForm(this.formChange).then(transformedPokemon => {
      this.configureSprite(transformedPokemon, this.pokemonEvoSprite, false);
      this.configureSprite(transformedPokemon, this.pokemonEvoTintSprite, false);
      this.beginTweens(preName, transformedPokemon);
    });
  }

  end(): void {
    this.pokemon.findAndRemoveTags(t => t.tagType === BattlerTagType.AUTOTOMIZED);
    if (this.modal) {
      globalScene.ui.revertMode().then(() => {
        if (globalScene.ui.getMode() === UiMode.PARTY) {
          const partyUiHandler = globalScene.ui.getHandler() as PartyUiHandler;
          partyUiHandler.clearPartySlots();
          partyUiHandler.populatePartySlots();
        }

        super.end();
      });
    } else {
      super.end();
    }
  }
}