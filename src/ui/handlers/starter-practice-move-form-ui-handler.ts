import { globalScene } from "#app/global-scene";
import { allMoves } from "#data/data-lists";
import { Button } from "#enums/buttons";
import { MoveId } from "#enums/move-id";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import type { StarterMoveset } from "#types/save-data";
import { MessageUiHandler } from "#ui/message-ui-handler";
import { addTextObject } from "#ui/text";
import { addWindow } from "#ui/ui-theme";

export interface StarterPracticeMoveFormArgs {
  moveset: StarterMoveset | MoveId[];
  title?: string;
  onChange: (slotIndex: number, newMove: MoveId, previousMove: MoveId) => void;
  onClose?: () => void;
}

export class StarterPracticeMoveFormUiHandler extends MessageUiHandler {
  private rootContainer: Phaser.GameObjects.Container;
  private slotWindow: Phaser.GameObjects.NineSlice;
  private moveListWindow: Phaser.GameObjects.NineSlice;
  private titleText: Phaser.GameObjects.Text;
  private helpText: Phaser.GameObjects.Text;
  private pageText: Phaser.GameObjects.Text;
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private moveTexts: Phaser.GameObjects.Text[] = [];
  private cursorObj: Phaser.GameObjects.Image;

  private slotCursor = 0;
  private moveIds: MoveId[] = [];

  private selectingMove = false;
  private selectedSlotIndex = 0;
  private moveCursor = 0;
  private movePage = 0;
  private readonly pageSize = 8;

  private onChange?: (slotIndex: number, newMove: MoveId, previousMove: MoveId) => void;
  private onClose?: () => void;

  constructor() {
    super(UiMode.STARTER_PRACTICE_MOVE_FORM);
  }

  setup(): void {
    const ui = this.getUi();
    const sHeight = globalScene.scaledCanvas.height;
    const sWidth = globalScene.scaledCanvas.width;

    this.rootContainer = globalScene.add.container(0, -sHeight);
    this.rootContainer.setName("starter-practice-move-form");
    this.rootContainer.setVisible(false);

    const bg = globalScene.add
      .rectangle(0, 0, sWidth, sHeight, 0x000000, 0.65)
      .setOrigin(0);

    this.slotWindow = addWindow(34, 38, 166, 122);
    this.moveListWindow = addWindow(202, 38, 112, 122);

    this.titleText = addTextObject(117, 46, "기술 배치", TextStyle.SUMMARY);
    this.titleText.setOrigin(0.5, 0);

    this.cursorObj = globalScene.add.image(66, 72, "select_cursor").setOrigin(0);

    for (let i = 0; i < 4; i++) {
      const text = addTextObject(80, 72 + i * 16, "", TextStyle.WINDOW);
      this.slotTexts.push(text);
    }

    for (let i = 0; i < this.pageSize; i++) {
      const text = addTextObject(214, 50 + i * 12, "", TextStyle.WINDOW);
      this.moveTexts.push(text);
    }

    this.pageText = addTextObject(258, 146, "", TextStyle.WINDOW);
    this.pageText.setOrigin(0.5, 0);

    this.helpText = addTextObject(
      160,
      164,
      "↑↓ 선택  ←→ 페이지  Z 결정  X 취소",
      TextStyle.WINDOW,
    );
    this.helpText.setOrigin(0.5, 0);

    this.rootContainer.add([
      bg,
      this.slotWindow,
      this.moveListWindow,
      this.titleText,
      ...this.slotTexts,
      ...this.moveTexts,
      this.cursorObj,
      this.pageText,
      this.helpText,
    ]);

    ui.add(this.rootContainer);
  }

  show(args: any[]): boolean {
    super.show(args);

    const config = args?.[0] as StarterPracticeMoveFormArgs | undefined;
    if (!config?.moveset || !config.onChange) {
      console.warn("[STARTER_PRACTICE_MOVE_FORM] invalid args", args);
      return false;
    }

    this.onChange = config.onChange;
    this.onClose = config.onClose;

    this.moveIds = [...config.moveset].slice(0, 4) as MoveId[];
    while (this.moveIds.length < 4) {
      this.moveIds.push(MoveId.NONE);
    }

    this.titleText.setText(config.title ?? "기술 배치");

    this.slotCursor = 0;
    this.selectedSlotIndex = 0;
    this.moveCursor = 0;
    this.movePage = 0;
    this.selectingMove = false;

    this.rootContainer.setVisible(true);
    this.refreshUi();

    return true;
  }

  processInput(button: Button): boolean {
    switch (button) {
      case Button.UP:
        if (this.selectingMove) {
          const pageMoves = this.getCurrentPageMoveIds();
          this.moveCursor = this.moveCursor > 0 ? this.moveCursor - 1 : Math.max(0, pageMoves.length - 1);
        } else {
          this.slotCursor = this.slotCursor > 0 ? this.slotCursor - 1 : 3;
        }
        this.refreshUi();
        this.getUi().playSelect();
        return true;

      case Button.DOWN:
        if (this.selectingMove) {
          const max = Math.max(0, this.getCurrentPageMoveIds().length - 1);
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
        }
        return true;

      case Button.RIGHT:
        if (this.selectingMove) {
          const maxPage = this.getMaxPage();
          if (this.movePage < maxPage) {
            this.movePage++;
            this.moveCursor = 0;
            this.refreshUi();
            this.getUi().playSelect();
          }
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

        return this.confirmMoveSelection();

      case Button.CANCEL:
        if (this.selectingMove) {
          this.selectingMove = false;
          this.refreshUi();
          this.getUi().playSelect();
          return true;
        }

        this.clear();
        this.getUi().revertMode();
        this.onClose?.();
        return true;
    }

    return false;
  }

  clear(): void {
    super.clear();
    this.rootContainer?.setVisible(false);
    this.onChange = undefined;
    this.onClose = undefined;
  }

  private confirmMoveSelection(): boolean {
    const moveId = this.getCurrentPageMoveIds()[this.moveCursor];
    if (moveId === undefined) {
      this.getUi().playError();
      return true;
    }

    const previousMove = this.moveIds[this.selectedSlotIndex] ?? MoveId.NONE;

    this.moveIds[this.selectedSlotIndex] = moveId;
    this.onChange?.(this.selectedSlotIndex, moveId, previousMove);

    this.selectingMove = false;
    this.refreshUi();
    this.getUi().playSelect();

    return true;
  }

  private getCurrentPageMoveIds(): MoveId[] {
    const selectable = this.getSelectableMoveIds();
    const start = this.movePage * this.pageSize;
    return selectable.slice(start, start + this.pageSize);
  }

  private getMaxPage(): number {
    return Math.max(0, Math.ceil(this.getSelectableMoveIds().length / this.pageSize) - 1);
  }

  private refreshUi(): void {
    for (let i = 0; i < 4; i++) {
      const cursor = !this.selectingMove && i === this.slotCursor ? "▶ " : "  ";
      this.slotTexts[i].setText(`${cursor}${i + 1}: ${this.getMoveName(this.moveIds[i])}`);
    }

    this.cursorObj.setVisible(!this.selectingMove);
    this.cursorObj.setPosition(66, 72 + this.slotCursor * 16);

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

    this.pageText.setVisible(this.selectingMove);
    this.pageText.setText(`${this.movePage + 1}/${this.getMaxPage() + 1}`);
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
