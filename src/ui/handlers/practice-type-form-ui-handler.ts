import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { PokemonType } from "#enums/pokemon-type";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";

type PracticeTypeOption = {
  label: string;
  value: PokemonType | undefined;
};

const TYPE_OPTIONS: PracticeTypeOption[] = [
  { label: "없음", value: undefined },
  { label: "노말", value: PokemonType.NORMAL },
  { label: "격투", value: PokemonType.FIGHTING },
  { label: "비행", value: PokemonType.FLYING },
  { label: "독", value: PokemonType.POISON },
  { label: "땅", value: PokemonType.GROUND },
  { label: "바위", value: PokemonType.ROCK },
  { label: "벌레", value: PokemonType.BUG },
  { label: "고스트", value: PokemonType.GHOST },
  { label: "강철", value: PokemonType.STEEL },
  { label: "불꽃", value: PokemonType.FIRE },
  { label: "물", value: PokemonType.WATER },
  { label: "풀", value: PokemonType.GRASS },
  { label: "전기", value: PokemonType.ELECTRIC },
  { label: "에스퍼", value: PokemonType.PSYCHIC },
  { label: "얼음", value: PokemonType.ICE },
  { label: "드래곤", value: PokemonType.DRAGON },
  { label: "악", value: PokemonType.DARK },
  { label: "페어리", value: PokemonType.FAIRY },
  { label: "스텔라", value: PokemonType.STELLAR },
];

export class PracticeTypeFormUiHandler extends UiHandler {
  private container: Phaser.GameObjects.Container;
  private titleText: Phaser.GameObjects.Text;
  private helpText: Phaser.GameObjects.Text;
  private cursorObj: Phaser.GameObjects.Image;

  private type1ValueText: Phaser.GameObjects.Text;
  private type2ValueText: Phaser.GameObjects.Text;
  private type1LeftArrow: Phaser.GameObjects.Image;
  private type1RightArrow: Phaser.GameObjects.Image;
  private type2LeftArrow: Phaser.GameObjects.Image;
  private type2RightArrow: Phaser.GameObjects.Image;

  private slotCursor = 0; // 0 = 타입1, 1 = 타입2
  private type1Index = 1; // 기본 노말
  private type2Index = 0; // 기본 없음

  private buttonActions?: Array<(...args: any[]) => void>;

  constructor() {
    super(UiMode.PRACTICE_TYPE_FORM);
  }

  setup(): void {
    const ui = this.getUi();

    this.container = globalScene.add.container(0, -globalScene.scaledCanvas.height);
    this.container.setName("practice-type-form");
    this.container.setVisible(false);

    const bg = globalScene.add.rectangle(
      0,
      0,
      globalScene.scaledCanvas.width,
      globalScene.scaledCanvas.height,
      0x000000,
      0.65,
    ).setOrigin(0);

    const window = addWindow(58, 38, 204, 92);

    this.titleText = addTextObject(160, 46, "타입을 선택하시오", TextStyle.SUMMARY);
    this.titleText.setOrigin(0.5, 0);

    const type1Label = addTextObject(82, 72, "타입1", TextStyle.WINDOW);
    const type2Label = addTextObject(82, 94, "타입2", TextStyle.WINDOW);

    this.type1LeftArrow = globalScene.add.image(144, 73, "cursor_reverse").setScale(0.75);
    this.type1RightArrow = globalScene.add.image(220, 73, "cursor").setScale(0.75);
    this.type2LeftArrow = globalScene.add.image(144, 95, "cursor_reverse").setScale(0.75);
    this.type2RightArrow = globalScene.add.image(220, 95, "cursor").setScale(0.75);

    this.type1ValueText = addTextObject(182, 69, "", TextStyle.WINDOW);
    this.type1ValueText.setOrigin(0.5, 0);

    this.type2ValueText = addTextObject(182, 91, "", TextStyle.WINDOW);
    this.type2ValueText.setOrigin(0.5, 0);

    this.cursorObj = globalScene.add.image(70, 70, "select_cursor").setOrigin(0);

    this.helpText = addTextObject(
      160,
      114,
      "↑↓ 선택  ←→ 변경  Z 저장  X 취소",
      TextStyle.WINDOW,
    );
    this.helpText.setOrigin(0.5, 0);

    this.container.add([
      bg,
      window,
      this.titleText,
      type1Label,
      type2Label,
      this.type1LeftArrow,
      this.type1RightArrow,
      this.type2LeftArrow,
      this.type2RightArrow,
      this.type1ValueText,
      this.type2ValueText,
      this.cursorObj,
      this.helpText,
    ]);

    ui.add(this.container);
  }

  show(args: any[]): boolean {
    super.show(args);

    const config = args?.[0] as { buttonActions?: Array<(...args: any[]) => void> } | undefined;
    this.buttonActions = config?.buttonActions;

    const savedTypes =
      globalScene.gameData.practiceDummyConfig?.types ??
      [PokemonType.NORMAL];

    this.type1Index = this.findOptionIndex(savedTypes[0], false);
    this.type2Index = this.findOptionIndex(savedTypes[1], true);
    this.slotCursor = 0;

    this.container.setVisible(true);
    this.refreshText();

    return true;
  }

  processInput(button: Button): boolean {
    switch (button) {
      case Button.UP:
        this.slotCursor = this.slotCursor > 0 ? this.slotCursor - 1 : 1;
        this.refreshText();
        this.getUi().playSelect();
        return true;

      case Button.DOWN:
        this.slotCursor = this.slotCursor < 1 ? this.slotCursor + 1 : 0;
        this.refreshText();
        this.getUi().playSelect();
        return true;

      case Button.LEFT:
        this.changeCurrentType(-1);
        this.refreshText();
        this.getUi().playSelect();
        return true;

      case Button.RIGHT:
        this.changeCurrentType(1);
        this.refreshText();
        this.getUi().playSelect();
        return true;

      case Button.ACTION:
      case Button.SUBMIT:
        this.saveTypes();
        return true;

      case Button.CANCEL:
        this.cancel();
        return true;
    }

    return false;
  }

  private changeCurrentType(delta: number): void {
    if (this.slotCursor === 0) {
      this.type1Index = this.wrapIndex(this.type1Index + delta, 1, TYPE_OPTIONS.length - 1);
      return;
    }

    this.type2Index = this.wrapIndex(this.type2Index + delta, 0, TYPE_OPTIONS.length - 1);
  }

  private wrapIndex(value: number, min: number, max: number): number {
    if (value < min) {
      return max;
    }

    if (value > max) {
      return min;
    }

    return value;
  }

  private saveTypes(): void {
    const type1 = TYPE_OPTIONS[this.type1Index].value;
    const type2 = TYPE_OPTIONS[this.type2Index].value;

    if (type1 === undefined) {
      this.getUi().playError();
      return;
    }

    const finalTypes =
      type2 !== undefined && type2 !== type1
        ? [type1, type2]
        : [type1];

    globalScene.gameData.practiceDummyConfig ??= {};
    globalScene.gameData.practiceDummyConfig.types = finalTypes;
    globalScene.gameData.saveSystem();

    this.buttonActions?.[0]?.(finalTypes);

    this.getUi().playSelect();
    this.getUi().revertMode();
  }

  private cancel(): void {
    this.buttonActions?.[1]?.();

    this.getUi().playSelect();
    this.getUi().revertMode();
  }

  private refreshText(): void {
    const type1 = TYPE_OPTIONS[this.type1Index];
    const type2 = TYPE_OPTIONS[this.type2Index];

    this.type1ValueText.setText(type1.label);
    this.type2ValueText.setText(type2.label);

    this.cursorObj.setPosition(70, this.slotCursor === 0 ? 70 : 92);

    this.type1LeftArrow.setVisible(this.slotCursor === 0);
    this.type1RightArrow.setVisible(this.slotCursor === 0);
    this.type2LeftArrow.setVisible(this.slotCursor === 1);
    this.type2RightArrow.setVisible(this.slotCursor === 1);
  }

  private findOptionIndex(type: PokemonType | undefined, allowNone: boolean): number {
    if (type === undefined) {
      return allowNone ? 0 : 1;
    }

    const index = TYPE_OPTIONS.findIndex(option => option.value === type);

    if (index >= 0) {
      return index;
    }

    return allowNone ? 0 : 1;
  }

  clear(): void {
    super.clear();
    this.container.setVisible(false);
  }
}