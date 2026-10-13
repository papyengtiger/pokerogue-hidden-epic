import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { TrainerCardCategory } from "#enums/trainer-card-id";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { trainerCardManager } from "#system/trainer-card-manager";
import { allTrainerCards } from "#trainers/trainer-card/trainer-card";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";

const VISIBLE_ROWS = 7;
const categoryNames: Record<TrainerCardCategory, string> = {
  [TrainerCardCategory.BATTLE]: "배틀",
  [TrainerCardCategory.GROWTH]: "육성",
  [TrainerCardCategory.FRIEND]: "프렌드",
  [TrainerCardCategory.EPIC]: "에픽",
};

/** Turn-free trainer-card loadout screen, opened from the battle command UI. */
export class TrainerCardUiHandler extends UiHandler {
  private container: Phaser.GameObjects.Container;
  private contents: Phaser.GameObjects.Container;
  private fieldIndex = 0;
  private view: "slots" | "cards" = "slots";
  private slotIndex = 0;
  private selectedRow = 0;

  constructor() {
    super(UiMode.TRAINER_CARD);
  }

  setup(): void {
    const ui = this.getUi();
    this.container = globalScene.add.container(0, -globalScene.scaledCanvas.height);
    this.container.setName("trainer-card-ui");
    this.container.setVisible(false);
    const width = globalScene.scaledCanvas.width;
    const height = globalScene.scaledCanvas.height;
    const bg = addWindow(6, 6, width - 12, height - 12);
    bg.setOrigin(0, 0);
    this.container.add(bg);
    this.contents = globalScene.add.container(0, 0);
    this.container.add(this.contents);
    ui.add(this.container);
  }

  show(args: any[]): boolean {
  super.show(args);

  // UI 컨테이너가 초기화되지 않았다면 생성
  if (!this.container) {
    console.warn("[TRAINER_CARD_UI] setup() 자동 실행");
    this.setup();
  }

  this.fieldIndex =
    typeof args[0] === "number" ? args[0] : 0;

  this.view = "slots";
  this.selectedRow = 0;

  trainerCardManager.syncSlotsWithStrategy();

  this.container.setVisible(true);
  this.render();

  console.log("[TRAINER_CARD_UI_OPEN]", {
    slots: trainerCardManager.getSlotTypes(),
    equipped: trainerCardManager.getEquipped(),
  });

  return true;
}

  private getCardChoices() {
    const slotType = trainerCardManager.getSlotTypes()[this.slotIndex];
    const equippedHere = trainerCardManager.getEquipped()[this.slotIndex];
    const choices = allTrainerCards.filter(card =>
      trainerCardManager.has(card.id)
      && (slotType === TrainerCardCategory.EPIC || card.category === slotType)
      && (!trainerCardManager.isEquipped(card.id) || equippedHere === card.id),
    );
    return choices;
  }

  private getRows(): string[] {
    if (this.view === "slots") {
      return trainerCardManager.getSlotTypes().map((type, index) => {
        const id = trainerCardManager.getEquipped()[index];
        const name = id ? allTrainerCards.find(card => card.id === id)?.name ?? id : "비어 있음";
        return `${index + 1}. [${categoryNames[type]}] ${name}`;
      });
    }
    const choices = this.getCardChoices();
    return [
      ...choices.map(card => card.name),
      ...(trainerCardManager.getEquipped()[this.slotIndex] ? ["장착 해제"] : []),
      "뒤로",
    ];
  }

  private render(): void {
    this.contents.removeAll(true);
    const rows = this.getRows();
    const title = this.view === "slots"
      ? "트레이닝 카드 / 장착 슬롯"
      : `슬롯 ${this.slotIndex + 1} / ${categoryNames[trainerCardManager.getSlotTypes()[this.slotIndex]]}`;
    this.contents.add(addTextObject(13, 13, title, TextStyle.WINDOW));
    const start = Math.max(0, Math.min(this.selectedRow - VISIBLE_ROWS + 1, rows.length - VISIBLE_ROWS));
    const first = Math.min(start, Math.max(0, rows.length - VISIBLE_ROWS));
    for (let i = first; i < Math.min(rows.length, first + VISIBLE_ROWS); i++) {
      const prefix = i === this.selectedRow ? "▶ " : "   ";
      const line = addTextObject(15, 34 + (i - first) * 17, `${prefix}${rows[i]}`, TextStyle.WINDOW);
      this.contents.add(line);
    }
    if (rows.length === 0) {
      this.contents.add(addTextObject(15, 43, "장착할 카드가 없습니다.", TextStyle.WINDOW));
    }
    this.contents.add(addTextObject(13, 159, "↑↓ 선택   Z/Enter 확인   X/Esc 뒤로", TextStyle.WINDOW));
    if (this.view === "cards") {
      const current = this.getCardChoices()[this.selectedRow];
      if (current) {
        globalScene.ui.showTooltip(current.name, current.description);
      } else {
        globalScene.ui.hideTooltip();
      }
    } else {
      globalScene.ui.hideTooltip();
    }
  }

  processInput(button: Button): boolean {
    const rows = this.getRows();
    if (button === Button.CANCEL) {
      if (this.view === "cards") {
        this.view = "slots";
        this.selectedRow = this.slotIndex;
        this.render();
      } else {
        globalScene.ui.setMode(UiMode.COMMAND, this.fieldIndex);
      }
      return true;
    }
    if (button === Button.UP || button === Button.DOWN) {
      if (!rows.length) return false;
      const delta = button === Button.UP ? -1 : 1;
      this.selectedRow = (this.selectedRow + delta + rows.length) % rows.length;
      this.render();
      return true;
    }
    if (button !== Button.ACTION || !rows.length) return false;
    if (this.view === "slots") {
      this.slotIndex = this.selectedRow;
      this.view = "cards";
      this.selectedRow = 0;
      this.render();
      return true;
    }
    const choices = this.getCardChoices();
    const equipped = trainerCardManager.getEquipped()[this.slotIndex];
    if (this.selectedRow < choices.length) {
      const id = choices[this.selectedRow].id;
      if (equipped === id) return true;
      if (equipped) trainerCardManager.unequip(this.slotIndex);
      if (!trainerCardManager.equip(this.slotIndex, id)) {
        if (equipped) trainerCardManager.equip(this.slotIndex, equipped);
        this.getUi().playError();
        return false;
      }
      console.log("[TRAINER_CARD_EQUIPPED]", { slot: this.slotIndex, card: id });
      void globalScene.gameData.saveSystem(); // TODO: switch to session saving along with trainer strategy.
    } else if (equipped && this.selectedRow === choices.length) {
      trainerCardManager.unequip(this.slotIndex);
      void globalScene.gameData.saveSystem();
      console.log("[TRAINER_CARD_UNEQUIPPED]", { slot: this.slotIndex });
    } else {
      this.view = "slots";
      this.selectedRow = this.slotIndex;
      this.render();
      return true;
    }
    this.view = "slots";
    this.selectedRow = this.slotIndex;
    this.render();
    return true;
  }

  clear(): void {
  super.clear();

  if (this.container) {
    this.container.setVisible(false);
  }

  this.getUi().hideTooltip();
}
}
