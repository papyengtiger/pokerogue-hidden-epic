import { BattlePhase } from "./battle-phase";
import { globalScene } from "#app/global-scene";
import type { Pokemon } from "#app/pokemon";
import { BlockOneHitKOAbAttr } from "#app/data/abilities/ability";
import { WeightPowerAttr, CompareWeightPowerAttr } from "#app/data/moves/move";
import type * as Utils from "#app/utils";
import { EndEvolutionPhase } from "./end-evolution-phase";
import { SpeciesFormKey } from "#enums/species-form-key";
import type Phaser from "phaser";
import { SpeciesId } from "#enums/species-id";

export class DynamaxPhase extends BattlePhase {
  private pokemon: Pokemon;
  private originalMaxHp: number;
  private originalHp: number;
  private pokemonSprite?: Phaser.GameObjects.Sprite;
  private pokemonEvoTintSprite?: Phaser.GameObjects.Sprite;
  private pokemonEvoSprite?: Phaser.GameObjects.Sprite;
  private field?: Phaser.GameObjects.Container;

  constructor(pokemon: Pokemon, scene: Phaser.Scene) {
    super();
    this.pokemon = pokemon;
    this.scene = scene;

    // 다이맥스 전 체력과 최대체력 저장
    this.originalMaxHp = pokemon.getMaxHp(false); // forceDynamaxState = false로 다이맥스 효과 제외
    this.originalHp = pokemon.hp;
  }

  start() {
    const speciesId = this.pokemon.speciesId;

    if (speciesId === SpeciesId.ZACIAN || speciesId === SpeciesId.ZAMAZENTA) {
      console.warn(`[DynamaxPhase] ${this.pokemon.name}은 다이맥스를 사용할 수 없는 포켓몬입니다.`);
      globalScene.playSound("se/error");
      this.end(); // 적절한 종료 처리
      return;
    }
    super.start();

    this.pokemon.isDynamaxed = true;
    this.pokemon.dynamaxPhase = this;

    const field = (this.scene as any).field as Phaser.GameObjects.Container;
    this.field = field;

    if (!field) {
      console.warn("[DynamaxPhase] field not found");
      return;
    }

    const gigantamaxForms = [
      SpeciesFormKey.GIGANTAMAX,
      SpeciesFormKey.GIGANTAMAX_SINGLE,
      SpeciesFormKey.GIGANTAMAX_RAPID,
      SpeciesFormKey.ETERNAMAX,
    ];

    const isGigantamax = gigantamaxForms.includes(this.pokemon.formKey);

    const newMaxHp = this.pokemon.getMaxHp();

    const ratioRaw = this.originalMaxHp > 0 ? this.originalHp / this.originalMaxHp : 1;
    const ratio = Math.min(ratioRaw, 1);

    if (ratio >= 1) {
      this.pokemon.hp = newMaxHp;
    } else {
      const hpIncrease = newMaxHp - this.originalMaxHp;
      this.pokemon.hp = Math.min(Math.floor(newMaxHp * ratio + hpIncrease), newMaxHp);
    }

    // 4. UI 스케일 등 업데이트
    this.pokemon.updateScale();
    this.pokemon.updateHpBar?.();

    // 4. 스케일 등 UI 업데이트
    this.pokemon.updateScale();

    // [3] 거다이맥스 연출
    globalScene.time.delayedCall(300, () => {
      globalScene.playSound("se/beam");
      this.doArcDownward?.();

      const centerX = this.scene.scale.width / 2;
      const centerY = this.scene.scale.height / 2;

      const bounds = this.field.getBounds();
      const fieldCenterX = bounds.x + bounds.width / 2;
      const fieldCenterY = bounds.y + bounds.height / 2;

      const newScale = isGigantamax ? 3.5 : 4;

      // 위치 보정 계산 (스케일 변화를 고려하여 위치를 미리 조정)
      const deltaX = centerX - (fieldCenterX * newScale) / this.field.scaleX - 546;
      const deltaY = centerY - (fieldCenterY * newScale) / this.field.scaleY + 96; // 여기 -42를 -126으로 바꾸세요
      const sprite = this.pokemon.getSprite();

      this.scene.tweens.add({
        targets: this.field,
        scale: newScale,
        x: this.field.x + deltaX,
        y: this.field.y + deltaY,
        duration: 1000,
        ease: "Sine.easeInOut",
        onComplete: () => {
          const finalBounds = this.field.getBounds();
        },
      });

      globalScene.time.delayedCall(1000, () => {
        this.pokemonEvoTintSprite?.setScale(0.25);
        this.pokemonEvoTintSprite?.setVisible(true);

        this.doCycle?.(1, 1).then(() => {
          globalScene.playSound("se/sparkle");
          this.pokemonEvoSprite?.setVisible(true);
          this.doCircleInward?.();

          globalScene.time.delayedCall(900, () => {
            globalScene.tweens.add({
              targets: this.pokemon.getSprite(),
              scale: this.pokemon.getSpriteScale(), // 최종 확대 스케일로 적용
              duration: 500,
              ease: "Sine.easeInOut",
              onComplete: () => {
                this.pokemon.cry(this.pokemon.getHpRatio() > 0.25 ? undefined : { rate: 0.85 });
                this.pokemon.getSprite().clearTint();

                if (this.pokemon.summonData.speciesForm) {
                  this.pokemon.loadAssets(false);
                }

                globalScene.phaseManager.unshiftNew("EndEvolutionPhase");
                this.end();
              },
            });
          });
        });
      });
    });
  }

  adjustHpChange(amount: number): number {
    const adjusted = Math.floor(amount / 2);
    console.log(`[DynamaxPhase] adjustHpChange called: original amount=${amount}, adjusted=${adjusted}`);
    return adjusted;
  }

  isForceSwitchImmunity(causedByOpponent: boolean): boolean {
    const immunity = this.pokemon.isDynamaxed && causedByOpponent;
    console.log(
      `[DynamaxPhase] isForceSwitchImmunity called: causedByOpponent=${causedByOpponent}, result=${immunity}`,
    );
    return immunity;
  }

  applyAbAttrs(type: any, pokemon: Pokemon, cancelled: Utils.BooleanHolder, ...args: any[]): void {
    if (!this.pokemon.isDynamaxed) {
      console.log("[DynamaxPhase] applyAbAttrs called but Pokemon is not Dynamaxed, skipping.");
      return;
    }

    if (type === BlockOneHitKOAbAttr) {
      console.log("[DynamaxPhase] Applying BlockOneHitKOAbAttr to block One-Hit KO moves.");
      const attr = new BlockOneHitKOAbAttr();
      attr.apply(pokemon, false, false, cancelled, args);
      return;
    }

    if (type === WeightPowerAttr) {
      let cancelled = args.find(arg => arg instanceof BooleanHolder) as BooleanHolder | undefined;
      if (!cancelled) {
        cancelled = new BooleanHolder(false);
        args.push(cancelled);
      }
      cancelled.value = true;
      console.log("[DynamaxPhase] WeightPowerAttr move cancelled set to true");
      return;
    }

    if (type === CompareWeightPowerAttr) {
      let cancelled = args.find(arg => arg instanceof BooleanHolder) as BooleanHolder | undefined;
      if (!cancelled) {
        cancelled = new BooleanHolder(false);
        args.push(cancelled);
      }
      cancelled.value = true;

      return;
    }

    if (type === PreApplyBattlerTagAbAttr) {
      console.log("[DynamaxPhase] Applying Dynamax immunity attributes.");
      pokemon.addBattleAttribute(
        new PreApplyBattlerTagImmunityAbAttr([
          BattlerTagType.TAUNT,
          BattlerTagType.TORMENT,
          BattlerTagType.HEAL_BLOCK,
          BattlerTagType.INFATUATED,
          BattlerTagType.DISABLED,
          BattlerTagType.ENCORE,
          BattlerTagType.PERISH_SONG,
          BattlerTagType.DESTINY_BOND,
        ]),
      );
    }
  }

  // 시각 효과용 함수 정의
  private doArcDownward() {
    console.log("[DynamaxPhase] doArcDownward() called.");
  }
  private doCycle(a: number, b: number): Promise<void> {
    return Promise.resolve();
  }
  private doCircleInward() {}
}
