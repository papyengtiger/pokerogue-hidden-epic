import { globalScene } from "#app/global-scene";
import { isBeta, isDev } from "#constants/app-constants";
import { Button } from "#enums/buttons";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import type { PracticePresetData } from "#types/save-data";
import type { OptionSelectConfig } from "#ui/abstract-option-select-ui-handler";
import { MessageUiHandler } from "#ui/message-ui-handler";
import { addTextObject } from "#ui/text";
import { addWindow } from "#ui/ui-theme";
import { fixedInt } from "#utils/common";
import i18next from "i18next";

const PRACTICE_PRESET_SLOTS_COUNT = 10;
const SLOTS_ON_SCREEN = 4;

export enum PracticePresetSlotUiMode {
  LOAD,
  SAVE,
}

export type PracticePresetSlotSelectCallback = (cursor: number) => void;

export class PracticePresetSlotSelectUiHandler extends MessageUiHandler {
  private presetSlotSelectContainer: Phaser.GameObjects.Container;
  private presetSlotsContainer: Phaser.GameObjects.Container;
  private presetSlotSelectMessageBox: Phaser.GameObjects.NineSlice;
  private presetSlotSelectMessageBoxContainer: Phaser.GameObjects.Container;
  private presetSlots: PracticePresetSlot[];

  private uiMode: PracticePresetSlotUiMode;
  private presetSlotSelectCallback: PracticePresetSlotSelectCallback | null;
  protected manageDataConfig: OptionSelectConfig;

  private scrollCursor = 0;
  private cursorObj: Phaser.GameObjects.Container | null;
  private presetSlotsContainerInitialY: number;

  constructor() {
    // TODO: UiMode.PRACTICE_PRESET_SLOT 같은 전용 UiMode를 추가한 뒤 교체 권장
    super(UiMode.PRACTICE_PRESET_SLOT);
  }

  setup(): void {
    const ui = this.getUi();

    this.presetSlotSelectContainer = globalScene.add.container(0, 0);
    this.presetSlotSelectContainer.setVisible(false);
    ui.add(this.presetSlotSelectContainer);

    const bg = globalScene.add.rectangle(
      0,
      0,
      globalScene.scaledCanvas.width,
      -globalScene.scaledCanvas.height,
      0x006860,
    );
    bg.setOrigin(0, 0);
    this.presetSlotSelectContainer.add(bg);

    this.presetSlotsContainerInitialY = -globalScene.scaledCanvas.height + 8;

    this.presetSlotsContainer = globalScene.add.container(8, this.presetSlotsContainerInitialY);
    this.presetSlotSelectContainer.add(this.presetSlotsContainer);

    this.presetSlotSelectMessageBoxContainer = globalScene.add.container(0, 0);
    this.presetSlotSelectMessageBoxContainer.setVisible(false);
    this.presetSlotSelectContainer.add(this.presetSlotSelectMessageBoxContainer);

    this.presetSlotSelectMessageBox = addWindow(1, -1, 318, 28);
    this.presetSlotSelectMessageBox.setOrigin(0, 1);
    this.presetSlotSelectMessageBoxContainer.add(this.presetSlotSelectMessageBox);

    this.message = addTextObject(8, 8, "", TextStyle.WINDOW, { maxLines: 2 });
    this.message.setOrigin(0, 0);
    this.presetSlotSelectMessageBoxContainer.add(this.message);

    this.presetSlots = [];
  }

  show(args: any[]): boolean {
    if (args.length < 2 || !(args[1] instanceof Function)) {
      return false;
    }

    super.show(args);

    this.uiMode = args[0] as PracticePresetSlotUiMode;
    this.presetSlotSelectCallback = args[1] as PracticePresetSlotSelectCallback;

    this.eraseCursor();
    this.clearPresetSlots();
    this.scrollCursor = 0;

    this.presetSlotSelectContainer.setVisible(true);
    this.populatePresetSlots();

    this.setScrollCursor(0);
    this.setCursor(0);

    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();
    const manageDataOptions: any[] = [];

    let success = false;
    let error = false;

    if (button === Button.ACTION || button === Button.CANCEL) {
      const originalCallback = this.presetSlotSelectCallback;

      if (button === Button.ACTION) {
        const cursor = this.cursor + this.scrollCursor;
        const presetSlot = this.presetSlots[cursor];

        if (this.uiMode === PracticePresetSlotUiMode.LOAD && !presetSlot.hasData) {
          error = true;
        } else {
          switch (this.uiMode) {
            case PracticePresetSlotUiMode.LOAD:
              manageDataOptions.push({
                label: "불러오기",
                handler: () => {
                  globalScene.ui.revertMode();
                  originalCallback?.(cursor);
                  return true;
                },
                keepOpen: false,
              });

              manageDataOptions.push({
                label: "삭제",
                handler: () => {
                  globalScene.ui.revertMode();
                  ui.showText("이 프리셋을 삭제할까요?", null, () => {
                    ui.setOverlayMode(
                      UiMode.CONFIRM,
                      () => {
                        const ok = globalScene.gameData.deletePracticePreset(cursor);
                        if (!ok) {
                          ui.playError();
                          ui.revertMode();
                          return;
                        }

                        this.clearPresetSlots();
                        this.cursorObj = null;
                        this.populatePresetSlots();
                        this.setScrollCursor(0);
                        this.setCursor(0);
                        ui.revertMode();
                      },
                      () => {
                        ui.revertMode();
                      },
                      false,
                      0,
                      19,
                      isBeta || isDev ? 300 : 2000,
                    );
                  });
                  return true;
                },
                keepOpen: false,
              });

              manageDataOptions.push({
                label: i18next.t("menuUiHandler:cancel"),
                handler: () => {
                  globalScene.ui.revertMode();
                  return true;
                },
                keepOpen: true,
              });

              this.manageDataConfig = {
                xOffset: 0,
                yOffset: 48,
                options: manageDataOptions,
                maxOptions: 4,
              };

              ui.setOverlayMode(UiMode.MENU_OPTION_SELECT, this.manageDataConfig);
              break;

            case PracticePresetSlotUiMode.SAVE: {
              const saveAndCallback = async () => {
                this.presetSlotSelectCallback = null;

                await ui.revertMode();

                originalCallback?.(cursor);
              };

              if (presetSlot.hasData) {
                ui.showText("기존 프리셋을 덮어쓸까요?", null, () => {
                  ui.setOverlayMode(
                    UiMode.CONFIRM,
                    () => {
                      saveAndCallback();
                    },
                    () => {
                      ui.revertMode();
                    },
                    false,
                    0,
                    19,
                    isBeta || isDev ? 300 : 2000,
                  );
                });
              } else {
                saveAndCallback();
              }

              break;
            }
          }

          success = true;
        }
      } else {
        this.presetSlotSelectCallback = null;

        ui.revertMode().then(() => {
          originalCallback?.(-1);
        });

        success = true;
      }
    } else {
      const cursorPosition = this.cursor + this.scrollCursor;

      switch (button) {
        case Button.UP:
          if (this.cursor) {
            success = this.cursor === 0 ? this.setCursor(this.cursor) : this.setCursor(this.cursor - 1, cursorPosition);
          } else if (this.scrollCursor) {
            success = this.setScrollCursor(this.scrollCursor - 1, cursorPosition);
          } else if (this.cursor === 0 && this.scrollCursor === 0) {
            this.setScrollCursor(PRACTICE_PRESET_SLOTS_COUNT - SLOTS_ON_SCREEN);
            this.revertPresetSlot(PRACTICE_PRESET_SLOTS_COUNT - SLOTS_ON_SCREEN);
            this.setCursor(SLOTS_ON_SCREEN - 1);
            success = true;
          }
          break;

        case Button.DOWN:
          if (this.cursor < SLOTS_ON_SCREEN - 1) {
            success = this.setCursor(this.cursor + 1, cursorPosition);
          } else if (this.scrollCursor < PRACTICE_PRESET_SLOTS_COUNT - SLOTS_ON_SCREEN) {
            success = this.setScrollCursor(this.scrollCursor + 1, cursorPosition);
          } else if (
            this.cursor === SLOTS_ON_SCREEN - 1
            && this.scrollCursor === PRACTICE_PRESET_SLOTS_COUNT - SLOTS_ON_SCREEN
          ) {
            this.setScrollCursor(0);
            this.revertPresetSlot(SLOTS_ON_SCREEN - 1);
            this.setCursor(0);
            success = true;
          }
          break;
      }
    }

    if (success) {
      ui.playSelect();
    } else if (error) {
      ui.playError();
    }

    return success || error;
  }

  populatePresetSlots(): void {
    for (let s = 0; s < PRACTICE_PRESET_SLOTS_COUNT; s++) {
      const presetSlot = new PracticePresetSlot(s);
      globalScene.add.existing(presetSlot);
      this.presetSlotsContainer.add(presetSlot);
      this.presetSlots.push(presetSlot);
      presetSlot.load();
    }
  }

  showText(
    text: string,
    delay?: number,
    callback?: () => void,
    callbackDelay?: number,
    prompt?: boolean,
    promptDelay?: number,
  ): void {
    super.showText(text, delay, callback, callbackDelay, prompt, promptDelay);

    if (text?.indexOf("\n") === -1) {
      this.presetSlotSelectMessageBox.setSize(318, 28);
      this.message.setY(-22);
    } else {
      this.presetSlotSelectMessageBox.setSize(318, 42);
      this.message.setY(-37);
    }

    this.presetSlotSelectMessageBoxContainer.setVisible(text?.length > 0);
  }

  override setCursor(cursor: number, prevSlotIndex?: number): boolean {
    const changed = super.setCursor(cursor);

    if (!this.cursorObj) {
      this.cursorObj = globalScene.add.container(0, 0);
      const cursorBox = globalScene.add.nineslice(
        0,
        15,
        "select_cursor_highlight_thick",
        undefined,
        294,
        60,
        6,
        6,
        6,
        6,
      );
      this.cursorObj.add(cursorBox);
      this.presetSlotsContainer.add(this.cursorObj);
    }

    const cursorPosition = cursor + this.scrollCursor;
    const cursorIncrement = cursorPosition * 76;

    if (this.presetSlots[cursorPosition] && this.cursorObj) {
      const presetSlot = this.presetSlots[cursorPosition];
      const hasData = presetSlot.hasData;

      if (!hasData) {
        this.cursorObj.setPosition(151, 20 + cursorIncrement);
        presetSlot.setPosition(0, cursorIncrement);
      } else {
        this.cursorObj.setPosition(145, 20 + cursorIncrement);
        presetSlot.setPosition(-6, cursorIncrement);
      }
    }

    if (prevSlotIndex != null) {
      this.revertPresetSlot(prevSlotIndex);
    }

    return changed;
  }

  revertPresetSlot(slotIndex: number): void {
    const presetSlot = this.presetSlots[slotIndex];
    if (presetSlot) {
      presetSlot.setPosition(0, slotIndex * 76);
    }
  }

  setScrollCursor(scrollCursor: number, prevSlotIndex?: number): boolean {
    const changed = scrollCursor !== this.scrollCursor;

    if (changed) {
      this.scrollCursor = scrollCursor;
      this.setCursor(this.cursor, prevSlotIndex);
      globalScene.tweens.add({
        targets: this.presetSlotsContainer,
        y: this.presetSlotsContainerInitialY - 76 * scrollCursor,
        duration: fixedInt(325),
        ease: "Sine.easeInOut",
      });
    }

    return changed;
  }

  clear(): void {
    super.clear();
    this.presetSlotSelectContainer.setVisible(false);
    this.setScrollCursor(0);
    this.eraseCursor();
    this.presetSlotSelectCallback = null;
    this.clearPresetSlots();
  }

  eraseCursor(): void {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }

  clearPresetSlots(): void {
    this.presetSlots.splice(0, this.presetSlots.length);
    this.presetSlotsContainer.removeAll(true);
  }
}

class PracticePresetSlot extends Phaser.GameObjects.Container {
  public slotId: number;
  public hasData = false;
  public presetData: PracticePresetData | null = null;

  private slotWindow: Phaser.GameObjects.NineSlice;
  private loadingLabel: Phaser.GameObjects.Text;

  constructor(slotId: number) {
    super(globalScene, 0, slotId * 76);

    this.slotId = slotId;
    this.setup();
  }

  setup(): void {
    this.slotWindow = addWindow(0, 0, 304, 70);
    this.add(this.slotWindow);

    this.loadingLabel = addTextObject(152, 33, "불러오는 중…", TextStyle.WINDOW);
    this.loadingLabel.setOrigin(0.5, 0.5);
    this.add(this.loadingLabel);
  }

  setupEmpty(): void {
    this.loadingLabel.setText(`프리셋 ${this.slotId + 1}: 비어 있음`);
  }

  setupWithData(data: PracticePresetData): void {
    this.remove(this.loadingLabel, true);

    const nameLabel = addTextObject(8, 5, data.name || `프리셋 ${this.slotId + 1}`, TextStyle.WINDOW);
    this.add(nameLabel);

    const battleType = data.config?.battleType ?? "SINGLE";
    const battleTypeLabel = addTextObject(8, 21, `배틀: ${battleType}`, TextStyle.WINDOW);
    this.add(battleTypeLabel);

    const dummyCount = [data.config?.dummy1, data.config?.dummy2].filter(
      dummy => dummy && Object.keys(dummy).length > 0,
    ).length;
    const dummyLabel = addTextObject(8, 37, `더미 설정: ${dummyCount}개`, TextStyle.WINDOW);
    this.add(dummyLabel);

    const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleString() : "저장일 없음";
    const timestampLabel = addTextObject(8, 53, timestamp, TextStyle.WINDOW);
    this.add(timestampLabel);
  }

  load(): boolean {
    const presetData = globalScene.gameData.getPracticePreset(this.slotId);

    this.hasData = !!presetData;
    this.presetData = presetData;

    if (!presetData) {
      this.setupEmpty();
      return false;
    }

    this.setupWithData(presetData);
    return true;
  }
}
