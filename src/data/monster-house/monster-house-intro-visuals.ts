import { globalScene } from "#app/global-scene";
import type { Pokemon } from "#field/pokemon";
import Phaser from "phaser";

/**
 * 몬스터소굴 첫 조우 시 표시되는 대표 3마리의 검은 실루엣 연출.
 *
 * - 왼쪽 / 오른쪽: 보호형 후보 또는 희귀 개체
 * - 가운데: 우두머리
 *
 * 실제 EnemyPokemon을 필드 전투원으로 추가하지 않고
 * 별도의 Phaser Sprite만 생성하므로 타겟팅/행동/특성 발동에는 관여하지 않는다.
 */
export class MonsterHouseIntroVisuals extends Phaser.GameObjects.Container {
  private readonly leftPokemon: Pokemon;
  private readonly bossPokemon: Pokemon;
  private readonly rightPokemon: Pokemon;

  private leftSprite: Phaser.GameObjects.Sprite | null = null;
  private bossSprite: Phaser.GameObjects.Sprite | null = null;
  private rightSprite: Phaser.GameObjects.Sprite | null = null;

  private initialized = false;

  constructor(leftPokemon: Pokemon, bossPokemon: Pokemon, rightPokemon: Pokemon) {
    // globalScene.field 내부 좌표계(320x240 기준)의 대략적인 중앙.
    super(globalScene, 230, 69);

    this.leftPokemon = leftPokemon;
    this.bossPokemon = bossPokemon;
    this.rightPokemon = rightPokemon;

    this.setName("monster-house-intro-visuals");
    this.setDepth(10);
    this.setAlpha(0);
  }

  /**
   * 대표 포켓몬의 스프라이트를 생성한다.
   * EncounterPhase에서 적 포켓몬들의 loadAssets()가 끝난 뒤 호출하는 것을 전제로 한다.
   */
  public init(): void {
    if (this.initialized) {
      return;
    }

    this.leftSprite = this.createSilhouette(this.leftPokemon, -42, 8, 0.92, "monster-house-left");

    this.bossSprite = this.createSilhouette(this.bossPokemon, 0, -6, 1.15, "monster-house-boss");

    this.rightSprite = this.createSilhouette(this.rightPokemon, 42, 8, 0.92, "monster-house-right");

    this.add([this.leftSprite, this.bossSprite, this.rightSprite]);

    this.initialized = true;

    console.log("[MONSTER_HOUSE_INTRO_INIT]", {
      left: this.leftPokemon.name,
      boss: this.bossPokemon.name,
      right: this.rightPokemon.name,
    });
  }

  /**
   * 검은 실루엣 Sprite 하나를 만든다.
   */
  private createSilhouette(
    pokemon: Pokemon,
    x: number,
    y: number,
    scale: number,
    name: string,
  ): Phaser.GameObjects.Sprite {
    /*
     * 해당 개체의 폼·성별·이로치 등이 반영된
     * 실제 전투 스프라이트 키를 사용한다.
     */
    const spriteKey = pokemon.getSpriteKey(true);

    const animationKey = pokemon.getBattleSpriteKey();

    const sprite = globalScene.addFieldSprite(x, y, spriteKey);

    sprite.setName(name);
    sprite.setOrigin(0.5, 1);
    sprite.setScale(scale);
    sprite.setTint(0x000000);

    if (globalScene.anims.exists(animationKey)) {
      sprite.play(animationKey);
    } else {
      console.warn("[MONSTER_HOUSE_SILHOUETTE_ANIM_MISSING]", {
        pokemon: pokemon.name,
        spriteKey,
      });
    }

    return sprite;
  }

  /**
   * 실루엣 3마리를 페이드 인한다.
   */
  public show(duration = 350): Promise<void> {
    if (!this.initialized) {
      this.init();
    }

    this.setVisible(true);

    return new Promise(resolve => {
      globalScene.tweens.add({
        targets: this,
        alpha: 1,
        duration,
        ease: "Sine.easeOut",
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * 실루엣 3마리를 페이드 아웃한다.
   */
  public hide(duration = 500): Promise<void> {
    return new Promise(resolve => {
      globalScene.tweens.add({
        // Container를 움직이면 실루엣 3마리가 함께 이동
        targets: this,

        x: this.x + 20,
        y: this.y - 8,

        alpha: 0,
        scaleX: 0.82,
        scaleY: 0.82,

        duration,
        ease: "Sine.easeIn",

        onComplete: () => {
          this.setVisible(false);
          resolve();
        },
      });
    });
  }

  /**
   * 지정 시간 동안 실루엣을 보여 준 뒤 자동으로 숨긴다.
   */
  public async play(holdDuration = 1100, fadeInDuration = 350, fadeOutDuration = 250): Promise<void> {
    await this.show(fadeInDuration);

    await new Promise<void>(resolve => {
      globalScene.time.delayedCall(holdDuration, () => resolve());
    });

    await this.hide(fadeOutDuration);
  }

  /**
   * 연출 종료 후 스프라이트와 Container를 함께 제거한다.
   */
  public cleanup(): void {
    if (this.scene) {
      this.destroy(true);
    }
  }
}
