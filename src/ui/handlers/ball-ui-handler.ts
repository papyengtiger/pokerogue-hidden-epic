import { globalScene } from "#app/global-scene";
import { getPokeballName } from "#data/pokeball";
import { Button } from "#enums/buttons";
import { Command } from "#enums/command";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import type { CommandPhase } from "#phases/command-phase";
import { addTextObject, getTextStyleOptions } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";
import i18next from "i18next";

export class BallUiHandler extends UiHandler {
  private pokeballSelectContainer: Phaser.GameObjects.Container;
  private pokeballSelectBg: Phaser.GameObjects.NineSlice;
  private optionsText: Phaser.GameObjects.Text;
  private countsText: Phaser.GameObjects.Text;

  private cursorObj: Phaser.GameObjects.Image | null;

  private scale = 0.1666666667;

  /**
   * 화면에 동시에 표시할 행 수.
   * 몬스터볼 종류가 이 수를 넘으면 커서를 따라 자동 스크롤한다.
   * "취소" 항목도 하나의 행으로 취급한다.
   */
  private readonly visibleRows = 6;

  /**
   * 현재 화면에 표시되는 목록의 첫 번째 전체 인덱스.
   * 0 ~ (전체 항목 수 - visibleRows)
   */
  private scrollOffset = 0;

  constructor() {
    super(UiMode.BALL);
  }

  setup() {
    const ui = this.getUi();

    this.scale = getTextStyleOptions(TextStyle.WINDOW).scale;

    const pokeballTypeCount = this.getPokeballTypeCount();

    // 창 너비 계산용으로 전체 이름을 한 번 만든다.
    const allOptionsTextContent = [
      ...Array.from({ length: pokeballTypeCount }, (_, pb) => getPokeballName(pb)),
      i18next.t("commandUiHandler:ballCancel"),
    ].join("\n");

    this.optionsText = addTextObject(0, 0, allOptionsTextContent, TextStyle.WINDOW, {
      align: "right",
      maxLines: this.visibleRows,
    });

    const optionsTextWidth = this.optionsText.displayWidth;

    this.pokeballSelectContainer = globalScene.add.container(
      globalScene.scaledCanvas.width - 51 - Math.max(64, optionsTextWidth),
      -49,
    );
    this.pokeballSelectContainer.setVisible(false);
    ui.add(this.pokeballSelectContainer);

    // 창 높이는 항상 visibleRows만큼만 유지한다.
    this.pokeballSelectBg = addWindow(
      0,
      0,
      50 + Math.max(64, optionsTextWidth),
      32 + this.visibleRows * 80 * this.scale,
    );
    this.pokeballSelectBg.setOrigin(0, 1);
    this.pokeballSelectContainer.add(this.pokeballSelectBg);

    this.pokeballSelectContainer.add(this.optionsText);
    this.optionsText.setOrigin(0, 0);
    this.optionsText.setPositionRelative(this.pokeballSelectBg, 42, 9);
    this.optionsText.setLineSpacing(this.scale * 72);

    this.countsText = addTextObject(0, 0, "", TextStyle.WINDOW, {
      maxLines: this.visibleRows,
    });
    this.countsText.setPositionRelative(this.pokeballSelectBg, 18, 9);
    this.countsText.setLineSpacing(this.scale * 72);
    this.pokeballSelectContainer.add(this.countsText);

    this.scrollOffset = 0;
    this.setCursor(0);
  }

  show(args: any[]): boolean {
    super.show(args);

    this.pokeballSelectContainer.setVisible(true);

    // 볼 종류/개수가 바뀐 경우까지 반영한다.
    this.ensureCursorVisible();
    this.updateVisibleList();
    this.setCursor(this.cursor);

    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;

    const pokeballTypeCount = this.getPokeballTypeCount();

    if (button === Button.ACTION || button === Button.CANCEL) {
      const commandPhase = globalScene.phaseManager.getCurrentPhase() as CommandPhase;

      success = true;

      if (button === Button.ACTION && this.cursor < pokeballTypeCount) {
        if (globalScene.pokeballCounts[this.cursor]) {
          if (commandPhase.handleCommand(Command.BALL, this.cursor)) {
            globalScene.ui.setMode(UiMode.COMMAND, commandPhase.getFieldIndex());
            globalScene.ui.setMode(UiMode.MESSAGE);
            success = true;
          }
        } else {
          ui.playError();
          success = false;
        }
      } else {
        // CANCEL 버튼 또는 목록 맨 아래 "취소" 선택
        ui.setMode(UiMode.COMMAND, commandPhase.getFieldIndex());
        success = true;
      }
    } else {
      switch (button) {
        case Button.UP:
          // 0에서 위를 누르면 마지막 "취소" 항목으로 순환
          success = this.setCursor(this.cursor ? this.cursor - 1 : pokeballTypeCount);
          break;

        case Button.DOWN:
          // 마지막 "취소"에서 아래를 누르면 0번 볼로 순환
          success = this.setCursor(this.cursor < pokeballTypeCount ? this.cursor + 1 : 0);
          break;
      }
    }

    if (success) {
      ui.playSelect();
    }

    return success;
  }

  /**
   * 현재 등록된 몬스터볼 종류 수.
   * "취소"는 포함하지 않는다.
   */
  private getPokeballTypeCount(): number {
    return Object.keys(globalScene.pokeballCounts).length;
  }

  /**
   * 몬스터볼 + 취소를 합친 전체 메뉴 항목 수.
   */
  private getTotalEntryCount(): number {
    return this.getPokeballTypeCount() + 1;
  }

  /**
   * 현재 커서가 화면 범위 밖으로 나갔다면 scrollOffset을 이동한다.
   */
  private ensureCursorVisible(): void {
    const totalEntries = this.getTotalEntryCount();
    const maxScrollOffset = Math.max(0, totalEntries - this.visibleRows);

    if (this.cursor < this.scrollOffset) {
      this.scrollOffset = this.cursor;
    } else if (this.cursor >= this.scrollOffset + this.visibleRows) {
      this.scrollOffset = this.cursor - this.visibleRows + 1;
    }

    this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, maxScrollOffset);
  }

  /**
   * 현재 scrollOffset 기준으로 화면에 보일 이름/보유 개수만 갱신한다.
   */
  private updateVisibleList(): void {
    const pokeballTypeCount = this.getPokeballTypeCount();
    const totalEntries = this.getTotalEntryCount();

    const endIndex = Math.min(totalEntries, this.scrollOffset + this.visibleRows);

    const optionLines: string[] = [];
    const countLines: string[] = [];

    for (let index = this.scrollOffset; index < endIndex; index++) {
      if (index < pokeballTypeCount) {
        optionLines.push(getPokeballName(index));
        countLines.push(`×${globalScene.pokeballCounts[index] ?? 0}`);
      } else {
        // 마지막 인덱스는 취소
        optionLines.push(i18next.t("commandUiHandler:ballCancel"));

        // 취소 행에는 개수를 표시하지 않는다.
        countLines.push("");
      }
    }

    this.optionsText.setText(optionLines.join("\n"));
    this.countsText.setText(countLines.join("\n"));
  }

  /**
   * 외부에서 볼 개수만 갱신하고 싶을 때도
   * 현재 스크롤 범위만 다시 그린다.
   */
  updateCounts() {
    this.updateVisibleList();
  }

  setCursor(cursor: number): boolean {
    const ret = super.setCursor(cursor);

    this.ensureCursorVisible();
    this.updateVisibleList();

    if (!this.cursorObj) {
      this.cursorObj = globalScene.add.image(0, 0, "cursor");
      this.pokeballSelectContainer.add(this.cursorObj);
    }

    const visibleCursor = this.cursor - this.scrollOffset;

    this.cursorObj.setScale(this.scale * 6);

    // 전체 cursor가 아니라 화면에 보이는 행 번호를 기준으로 배치한다.
    this.cursorObj.setPositionRelative(this.pokeballSelectBg, 12, 15 + (6 + visibleCursor * 96) * this.scale);

    return ret;
  }

  clear() {
    super.clear();
    this.pokeballSelectContainer.setVisible(false);
    this.eraseCursor();
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }

    this.cursorObj = null;
  }
}
