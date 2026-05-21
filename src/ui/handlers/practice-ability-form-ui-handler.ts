import { globalScene } from "#app/global-scene";
import { allAbilities } from "#data/data-lists";
import { Button } from "#enums/buttons";
import { AbilityId } from "#enums/ability-id";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";

type PracticeAbilityTarget = "ability" | "passive";

type PracticeAbilityFormConfig = {
  target?: PracticeAbilityTarget;
  title?: string;
  buttonActions?: Array<(...args: any[]) => void>;
};

export class PracticeAbilityFormUiHandler extends UiHandler {
  private container: Phaser.GameObjects.Container;
  private titleText: Phaser.GameObjects.Text;
  private abilityValueText: Phaser.GameObjects.Text;
  private helpText: Phaser.GameObjects.Text;
  private leftArrow: Phaser.GameObjects.Image;
  private rightArrow: Phaser.GameObjects.Image;

  private abilityIndex = 0;
  private target: PracticeAbilityTarget = "ability";
  private buttonActions?: Array<(...args: any[]) => void>;

  constructor() {
    super(UiMode.PRACTICE_ABILITY_FORM);
  }

  setup(): void {
    const ui = this.getUi();

    this.container = globalScene.add.container(0, -globalScene.scaledCanvas.height);
    this.container.setName("practice-ability-form");
    this.container.setVisible(false);

    const bg = globalScene.add
      .rectangle(
        0,
        0,
        globalScene.scaledCanvas.width,
        globalScene.scaledCanvas.height,
        0x000000,
        0.65,
      )
      .setOrigin(0);

    const window = addWindow(58, 48, 204, 74);

    this.titleText = addTextObject(160, 56, "특성을 선택하시오", TextStyle.SUMMARY);
    this.titleText.setOrigin(0.5, 0);

    const abilityLabel = addTextObject(82, 82, "특성", TextStyle.WINDOW);

    this.leftArrow = globalScene.add.image(130, 83, "cursor_reverse").setScale(0.75);
    this.rightArrow = globalScene.add.image(230, 83, "cursor").setScale(0.75);

    this.abilityValueText = addTextObject(180, 79, "", TextStyle.WINDOW);
    this.abilityValueText.setOrigin(0.5, 0);

    this.helpText = addTextObject(
      160,
      104,
      "←→ 변경  Z 저장  X 취소",
      TextStyle.WINDOW,
    );
    this.helpText.setOrigin(0.5, 0);

    this.container.add([
      bg,
      window,
      this.titleText,
      abilityLabel,
      this.leftArrow,
      this.rightArrow,
      this.abilityValueText,
      this.helpText,
    ]);

    ui.add(this.container);
  }

  show(args: any[]): boolean {
    super.show(args);

    const config = args?.[0] as PracticeAbilityFormConfig | undefined;

    this.target = config?.target ?? "ability";
    this.buttonActions = config?.buttonActions;

    this.titleText.setText(
      config?.title ??
        (this.target === "passive"
          ? "패시브를 선택하시오"
          : "특성을 선택하시오"),
    );

    const savedAbilityId =
      this.target === "passive"
        ? globalScene.gameData.practiceDummyConfig?.passiveAbilityId
        : globalScene.gameData.practiceDummyConfig?.abilityId;

    this.abilityIndex = this.findAbilityIndex(savedAbilityId);

    this.container.setVisible(true);
    this.refreshText();

    return true;
  }

  processInput(button: Button): boolean {
    switch (button) {
      case Button.LEFT:
        this.changeAbility(-1);
        this.refreshText();
        this.getUi().playSelect();
        return true;

      case Button.RIGHT:
        this.changeAbility(1);
        this.refreshText();
        this.getUi().playSelect();
        return true;

      case Button.ACTION:
      case Button.SUBMIT:
        this.saveAbility();
        return true;

      case Button.CANCEL:
        this.cancel();
        return true;
    }

    return false;
  }

  private changeAbility(delta: number): void {
    const max = allAbilities.length - 1;

    do {
      this.abilityIndex += delta;

      if (this.abilityIndex < 0) {
        this.abilityIndex = max;
      } else if (this.abilityIndex > max) {
        this.abilityIndex = 0;
      }
    } while (!allAbilities[this.abilityIndex]);
  }

  private saveAbility(): void {
  const ability = allAbilities[this.abilityIndex];

  if (!ability) {
    this.getUi().playError();
    return;
  }

  if (this.buttonActions?.[0]) {
    this.buttonActions[0](ability.id);
    this.getUi().playSelect();
    return;
  }

  globalScene.gameData.practiceDummyConfig ??= {};

  if (this.target === "passive") {
    globalScene.gameData.practiceDummyConfig.passiveAbilityId = ability.id;
  } else {
    globalScene.gameData.practiceDummyConfig.abilityId = ability.id;
  }

  globalScene.gameData.saveSystem();

  this.getUi().playSelect();
  this.getUi().revertMode();
}

  private cancel(): void {
    this.buttonActions?.[1]?.();

    this.getUi().playSelect();
    this.getUi().revertMode();
  }

  private refreshText(): void {
    const ability = allAbilities[this.abilityIndex];

    this.abilityValueText.setText(ability?.name ?? "없음");
  }

  private findAbilityIndex(abilityId?: AbilityId): number {
    if (abilityId !== undefined && allAbilities[abilityId]) {
      return abilityId;
    }

    const firstIndex = allAbilities.findIndex(ability => !!ability);
    return firstIndex >= 0 ? firstIndex : 0;
  }

  clear(): void {
    super.clear();
    this.container.setVisible(false);
  }
}