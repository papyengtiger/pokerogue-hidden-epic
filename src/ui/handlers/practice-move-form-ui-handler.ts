import { globalScene } from "#app/global-scene";
import { allMoves } from "#data/data-lists";
import { Button } from "#enums/buttons";
import { MoveId } from "#enums/move-id";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { MessageUiHandler } from "#ui/message-ui-handler";
import { addTextObject } from "#ui/text";
import { addWindow } from "#ui/ui-theme";

const DEFAULT_DUMMY_MOVES: MoveId[] = [
  MoveId.TACKLE,
  MoveId.SPLASH,
  MoveId.NONE,
  MoveId.NONE,
];

export class PracticeMoveFormUiHandler extends MessageUiHandler {
  private rootContainer: Phaser.GameObjects.Container;
  private window: Phaser.GameObjects.NineSlice;
  private titleText: Phaser.GameObjects.Text;
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private cursorObj: Phaser.GameObjects.Image;

  private slotCursor = 0;

  private moveIds: MoveId[] = [];

  private selectingMove = false;
  private selectedSlotIndex = 0;
  private moveCursor = 0;
  private movePage = 0;
  private readonly pageSize = 8;
  private moveTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(UiMode.PRACTICE_MOVE_FORM);
  }

  setup(): void {
  const ui = this.getUi();

  this.rootContainer = globalScene.add.container(0, -globalScene.scaledCanvas.height);
  this.rootContainer.setName("practice-move-form");
  this.rootContainer.setVisible(false);

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

const moveListWindow = addWindow(210, 48, 100, 112);

  this.window = addWindow(48, 48, 160, 112);

this.titleText = addTextObject(132, 56, "보유 기술", TextStyle.SUMMARY);
this.titleText.setOrigin(0.5, 0);

  this.cursorObj = globalScene.add.image(82, 82, "select_cursor").setOrigin(0);

  for (let i = 0; i < 4; i++) {
    const text = addTextObject(96, 82 + i * 16, "", TextStyle.WINDOW);
    this.slotTexts.push(text);
  }

  for (let i = 0; i < this.pageSize; i++) {
  const text = addTextObject(222, 58 + i * 12, "", TextStyle.WINDOW);
  this.moveTexts.push(text);
}

  const helpText = addTextObject(
    130,
    140,
    "↑↓ 슬롯 선택  Z 기술 변경  X 취소",
    TextStyle.WINDOW,
  );
  helpText.setOrigin(0.5, 0);

  this.rootContainer.add([
  bg,
  this.window,
  moveListWindow,
  this.titleText,
  ...this.slotTexts,
  ...this.moveTexts,
  this.cursorObj,
  helpText,
]);

  ui.add(this.rootContainer);
}

  show(args: any[]): boolean {
  super.show(args);

  const saved = globalScene.gameData.practiceDummyConfig?.moveIds;

  this.moveIds = [
    ...(saved?.length ? saved : DEFAULT_DUMMY_MOVES),
  ].slice(0, 4);

  while (this.moveIds.length < 4) {
    this.moveIds.push(MoveId.NONE);
  }

  this.slotCursor = 0;
  this.rootContainer.setVisible(true);
  this.refreshUi();

  return true;
}

  processInput(button: Button): boolean {
  console.log("[PRACTICE_MOVE_FORM] input received", Button[button], button);
  console.log("[PRACTICE_MOVE_FORM] input", button, {
    slotCursor: this.slotCursor,
  });

  switch (button) {
    case Button.UP:
  if (this.selectingMove) {
    this.moveCursor = this.moveCursor > 0 ? this.moveCursor - 1 : this.getCurrentPageMoveIds().length - 1;
  } else {
    this.slotCursor = this.slotCursor > 0 ? this.slotCursor - 1 : 3;
  }
  this.refreshUi();
  this.getUi().playSelect();
  return true;

    case Button.DOWN:
  if (this.selectingMove) {
    const max = this.getCurrentPageMoveIds().length - 1;
    this.moveCursor = this.moveCursor < max ? this.moveCursor + 1 : 0;
  } else {
    this.slotCursor = this.slotCursor < 3 ? this.slotCursor + 1 : 0;
  }
  this.refreshUi();
  this.getUi().playSelect();
  return true;

case Button.LEFT:
  if (this.selectingMove && this.movePage > 0) {
    this.movePage--;
    this.moveCursor = 0;
    this.refreshUi();
    this.getUi().playSelect();
    return true;
  }
  return true;

case Button.RIGHT:
  if (this.selectingMove) {
    const maxPage = Math.ceil(this.getSelectableMoveIds().length / this.pageSize) - 1;
    if (this.movePage < maxPage) {
      this.movePage++;
      this.moveCursor = 0;
      this.refreshUi();
      this.getUi().playSelect();
    }
    return true;
  }
  return true;

    case Button.ACTION:
case Button.SUBMIT:
  if (!this.selectingMove) {
    this.selectingMove = true;
    this.selectedSlotIndex = this.slotCursor;
    this.moveCursor = 0;
    this.movePage = 0;

    this.refreshUi();
    this.getUi().playSelect();
    return true;
  }

  const moveId = this.getCurrentPageMoveIds()[this.moveCursor];

  if (moveId !== undefined) {
    this.moveIds[this.selectedSlotIndex] = moveId;
    this.saveMoves();

    this.selectingMove = false;

    this.refreshUi();
    this.getUi().playSelect();
  }

  return true;

    case Button.CANCEL:
  if (this.selectingMove) {
    this.selectingMove = false;
    this.refreshUi();
    this.getUi().playSelect();
    return true;
  }

  this.clear();
  this.getUi().revertMode();
  return true;
  }

  return false;
}

clear(): void {
  super.clear();
  this.rootContainer?.setVisible(false);
}

private getCurrentPageMoveIds(): MoveId[] {
  const selectable = this.getSelectableMoveIds();
  const start = this.movePage * this.pageSize;
  return selectable.slice(start, start + this.pageSize);
}

  private saveMoves(): void {
    globalScene.gameData.practiceDummyConfig ??= {};
    globalScene.gameData.practiceDummyConfig.moveIds = this.moveIds;
    globalScene.gameData.saveSystem();

    console.log("[PRACTICE] dummy moves saved", {
      moveIds: this.moveIds,
      names: this.moveIds.map(id => this.getMoveName(id)),
    });
  }

  private refreshUi(): void {
  for (let i = 0; i < 4; i++) {
    const cursor = i === this.slotCursor ? "▶ " : "  ";
    this.slotTexts[i].setText(`${cursor}${i + 1}: ${this.getMoveName(this.moveIds[i])}`);
  }

  this.cursorObj.setPosition(82, 82 + this.slotCursor * 16);

  const pageMoves = this.getCurrentPageMoveIds();

for (let i = 0; i < this.pageSize; i++) {
  const moveId = pageMoves[i];
  const text = this.moveTexts[i];

  if (!this.selectingMove || moveId === undefined) {
    text.setVisible(false);
    text.setText("");
    continue;
  }

  const cursor = i === this.moveCursor ? "▶ " : "  ";
  text.setVisible(true);
  text.setText(`${cursor}${this.getMoveName(moveId)}`);
}
}

  private getSelectableMoveIds(): MoveId[] {
  const ids: MoveId[] = [MoveId.NONE];

  for (let i = 0; i < allMoves.length; i++) {
    const move = allMoves[i];
    if (!move) continue;
    if (i === MoveId.NONE) continue;
    if (!move.name || move.name.trim() === "") continue;
    if (move.name.includes("(N)")) continue;

    ids.push(i as MoveId);
  }

  return ids;
}

  private getMoveName(moveId: MoveId): string {
    if (moveId === MoveId.NONE) {
      return "없음";
    }

    return allMoves[moveId]?.name ?? MoveId[moveId] ?? "알 수 없음";
  }
}