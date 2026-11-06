import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { TextStyle } from "#enums/text-style";
import { TrainerCardCategory } from "#enums/trainer-card-id";
import { UiMode } from "#enums/ui-mode";
import { trainerCardManager } from "#system/trainer-card-manager";
import { allTrainerCards, type TrainerCard } from "#trainers/trainer-card/trainer-card";
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

const categoryColors: Record<TrainerCardCategory, number> = {
  [TrainerCardCategory.BATTLE]: 0xc44545,
  [TrainerCardCategory.EPIC]: 0x9b59d0,
  [TrainerCardCategory.FRIEND]: 0x32c76a,
  [TrainerCardCategory.GROWTH]: 0x59cfff,
};

type TrainerCardEntry = (typeof allTrainerCards)[number];
type UiRow = {
  text: string;
  color?: number;
};

interface TrainerCardRewardConfig {
  screen: "reward";
  cards: TrainerCard[];
  onSelect: (card: TrainerCard) => boolean;
  title?: string;
  descriptionTitle?: string;
  noCancel?: boolean;
}

/** Turn-free trainer-card UI. Supports loadout and reward selection. */
export class TrainerCardUiHandler extends UiHandler {
  private container: Phaser.GameObjects.Container;
  private contents: Phaser.GameObjects.Container;
  private fieldIndex = 0;

  // loadout state
  private view: "slots" | "cards" = "slots";
  private slotIndex = 0;
  private selectedRow = 0;

  // reward state
  private screen: "loadout" | "reward" = "loadout";
  private rewardCards: TrainerCard[] = [];
  private rewardSelectedIndex = 0;
  private rewardOnSelect: ((card: TrainerCard) => boolean) | null = null;
  private rewardTitle = "트레이너 카드 선택";
  private rewardDescriptionTitle = "카드 설명";
  private rewardNoCancel = true;

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

    if (!this.container) {
      console.warn("[TRAINER_CARD_UI] setup() 자동 실행");
      this.setup();
    }

    const firstArg = args[0];
    if (firstArg && typeof firstArg === "object" && firstArg.screen === "reward") {
      return this.showReward(firstArg as TrainerCardRewardConfig);
    }

    return this.showLoadout(args);
  }

  private showLoadout(args: any[]): boolean {
    this.screen = "loadout";
    this.fieldIndex = typeof args[0] === "number" ? args[0] : 0;
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

  private showReward(config: TrainerCardRewardConfig): boolean {
    this.screen = "reward";
    this.rewardCards = config.cards ?? [];
    this.rewardSelectedIndex = 0;
    this.rewardOnSelect = config.onSelect;
    this.rewardTitle = config.title ?? "트레이너 카드 선택";
    this.rewardDescriptionTitle = config.descriptionTitle ?? "카드 설명";
    this.rewardNoCancel = config.noCancel ?? true;

    if (this.rewardCards.length === 0 || !this.rewardOnSelect) {
      return false;
    }

    this.container.setVisible(true);
    this.render();
    return true;
  }

  private getCardChoices(): TrainerCardEntry[] {
    const slotType = trainerCardManager.getSlotTypes()[this.slotIndex];
    const equippedHere = trainerCardManager.getEquipped()[this.slotIndex];

    return allTrainerCards.filter(
      card =>
        trainerCardManager.has(card.id)
        && (slotType === TrainerCardCategory.EPIC || card.category === slotType)
        && (!trainerCardManager.isEquipped(card.id) || equippedHere === card.id),
    );
  }

  private getCategoryColor(category: TrainerCardCategory): number {
    return categoryColors[category] ?? 0xffffff;
  }

  private formatCardName(card: Pick<TrainerCard, "name" | "category">): string {
    return `${card.name}(${categoryNames[card.category]})`;
  }

  private applyTextTint(obj: Phaser.GameObjects.GameObject, color?: number): void {
    if (color == null) {
      return;
    }
    (obj as any).setTint?.(color);
    (obj as any).setColor?.(`#${color.toString(16).padStart(6, "0")}`);
  }

  private getRows(): UiRow[] {
    if (this.view === "slots") {
      return trainerCardManager.getSlotTypes().map((type, index) => {
        const id = trainerCardManager.getEquipped()[index];
        const card = id ? allTrainerCards.find(c => c.id === id) : undefined;

        if (card) {
          return {
            text: `${index + 1}. ${this.formatCardName(card)}`,
            color: this.getCategoryColor(card.category),
          };
        }

        return {
          text: `${index + 1}. 비어 있음(${categoryNames[type]} 슬롯)`,
          color: this.getCategoryColor(type),
        };
      });
    }

    const choices = this.getCardChoices();
    return [
      ...choices.map(card => ({
        text: this.formatCardName(card),
        color: this.getCategoryColor(card.category),
      })),
      ...(trainerCardManager.getEquipped()[this.slotIndex] ? [{ text: "장착 해제" }] : []),
      { text: "뒤로" },
    ];
  }

  private render(): void {
    this.contents.removeAll(true);
    if (this.screen === "reward") {
      this.renderRewardSelection();
      return;
    }
    this.renderLoadout();
  }

  private renderLoadout(): void {
    const rows = this.getRows();
    const slotType = trainerCardManager.getSlotTypes()[this.slotIndex];
    const titleText =
      this.view === "slots" ? "트레이닝 카드 / 장착 슬롯" : `슬롯 ${this.slotIndex + 1} / ${categoryNames[slotType]}`;
    const title = addTextObject(13, 13, titleText, TextStyle.WINDOW);
    if (this.view === "cards") {
      this.applyTextTint(title, this.getCategoryColor(slotType));
    }
    this.contents.add(title);

    const start = Math.max(0, Math.min(this.selectedRow - VISIBLE_ROWS + 1, rows.length - VISIBLE_ROWS));
    const first = Math.min(start, Math.max(0, rows.length - VISIBLE_ROWS));

    for (let i = first; i < Math.min(rows.length, first + VISIBLE_ROWS); i++) {
      const prefix = i === this.selectedRow ? "▶ " : "   ";
      const line = addTextObject(15, 34 + (i - first) * 17, `${prefix}${rows[i].text}`, TextStyle.WINDOW);
      this.applyTextTint(line, rows[i].color);
      this.contents.add(line);
    }

    if (rows.length === 0) {
      this.contents.add(addTextObject(15, 43, "장착할 카드가 없습니다.", TextStyle.WINDOW));
    }

    this.contents.add(addTextObject(13, 159, "↑↓ 선택   Z/Enter 확인   X/Esc 뒤로", TextStyle.WINDOW));

    if (this.view === "cards") {
      const current = this.getCardChoices()[this.selectedRow];
      if (current) {
        globalScene.ui.showTooltip(this.formatCardName(current), current.description);
      } else {
        globalScene.ui.hideTooltip();
      }
    } else {
      globalScene.ui.hideTooltip();
    }
  }

  /** Fit a Pokémon-style text object inside a fixed logical-pixel rectangle. */
  private fitRewardText(
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    maxHeight: number,
    color?: number,
  ): Phaser.GameObjects.GameObject {
    const text = addTextObject(x, y, value, TextStyle.WINDOW);
    // addTextObject uses a larger base font than the reward panel can hold.
    // Fit by BOTH dimensions, not by width alone.
    const baseWidth = Math.max(1, text.width);
    const baseHeight = Math.max(1, text.height);
    const scale = Math.min(1, maxWidth / baseWidth, maxHeight / baseHeight);
    text.setScale(scale);
    this.applyTextTint(text, color);
    this.contents.add(text);
    return text;
  }

  /** Wrap long Korean descriptions without relying on Phaser's post-scale wrap width. */
  private wrapRewardDescription(description: string, charsPerLine = 35, maxLines = 3): string[] {
    const chars = Array.from(description.replace(/\s+/g, " ").trim());
    const lines: string[] = [];
    while (chars.length > 0 && lines.length < maxLines) {
      let take = Math.min(charsPerLine, chars.length);
      if (take < chars.length) {
        // Prefer splitting at a space when one exists near the right side.
        const lastSpace = chars.slice(0, take).lastIndexOf(" ");
        if (lastSpace >= Math.floor(charsPerLine * 0.6)) {
          take = lastSpace;
        }
      }
      const line = chars.splice(0, take).join("").trim();
      while (chars[0] === " ") {
        chars.shift();
      }
      lines.push(line);
    }
    if (chars.length > 0 && lines.length > 0) {
      const last = lines.length - 1;
      lines[last] = `${lines[last].slice(0, Math.max(0, charsPerLine - 1))}…`;
    }
    return lines;
  }

  private renderRewardSelection(): void {
    const width = globalScene.scaledCanvas.width;
    const height = globalScene.scaledCanvas.height;

    this.fitRewardText(this.rewardTitle, 13, 10, width - 26, 12);
    this.fitRewardText("← → 카드 선택  Z/Enter 확인", 13, 25, width - 26, 9);

    const count = this.rewardCards.length;
    const visibleCount = Math.min(3, count);
    const start = Math.max(0, Math.min(this.rewardSelectedIndex - 1, count - visibleCount));
    const cellWidth = (width - 28) / visibleCount;
    const cardWidth = Math.min(79, cellWidth - 7);
    const imageY = 65;

    for (let vi = 0; vi < visibleCount; vi++) {
      const index = start + vi;
      const card = this.rewardCards[index];
      const selected = index === this.rewardSelectedIndex;
      const x = 14 + cellWidth * (vi + 0.5);
      const color = this.getCategoryColor(card.category);

      const frame = globalScene.add.graphics();
      frame.fillStyle(0x30283c, selected ? 1 : 0.82);
      frame.lineStyle(selected ? 2 : 1, selected ? 0xffd66b : 0x777088, 1);
      frame.fillRoundedRect(x - cardWidth / 2, 36, cardWidth, 68, 3);
      frame.strokeRoundedRect(x - cardWidth / 2, 36, cardWidth, 68, 3);
      this.contents.add(frame);

      if (globalScene.textures.exists(card.imageKey)) {
        const art = globalScene.add.image(x, imageY, card.imageKey);
        const factor = Math.min(35 / Math.max(1, art.width), 47 / Math.max(1, art.height));
        art.setScale(factor);
        art.setAlpha(selected ? 1 : 0.8);
        this.contents.add(art);
      } else {
        const fallback = globalScene.add.graphics();
        fallback.fillStyle(color, 1);
        fallback.fillRoundedRect(x - 17, imageY - 23, 34, 46, 2);
        this.contents.add(fallback);
      }

      // Card names use a fixed logical size and can never bleed into neighboring cards.
      this.fitRewardText(card.name, x - cardWidth / 2 + 3, 91, cardWidth - 6, 8, color);
    }

    if (count > visibleCount) {
      this.fitRewardText(`${this.rewardSelectedIndex + 1}/${count}`, width - 40, 25, 28, 8);
    }

    const selectedCard = this.rewardCards[this.rewardSelectedIndex];
    if (!selectedCard) {
      return;
    }

    const panelTop = 109;
    const panelHeight = Math.max(40, height - panelTop - 10);
    const panel = addWindow(10, panelTop, width - 20, panelHeight);
    panel.setOrigin(0, 0);
    this.contents.add(panel);

    const color = this.getCategoryColor(selectedCard.category);
    this.fitRewardText(this.formatCardName(selectedCard), 17, panelTop + 5, width - 36, 11, color);

    // Explicit line layout prevents an oversized description from escaping its panel.
    const lines = this.wrapRewardDescription(selectedCard.description, 35, 3);
    lines.forEach((line, i) => {
      this.fitRewardText(line, 17, panelTop + 21 + i * 11, width - 36, 9);
    });

    globalScene.ui.hideTooltip();
  }

  processInput(button: Button): boolean {
    if (this.screen === "reward") {
      return this.processRewardInput(button);
    }
    return this.processLoadoutInput(button);
  }

  private processLoadoutInput(button: Button): boolean {
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
      if (rows.length === 0) {
        return false;
      }
      const delta = button === Button.UP ? -1 : 1;
      this.selectedRow = (this.selectedRow + delta + rows.length) % rows.length;
      this.render();
      return true;
    }

    if (button !== Button.ACTION || rows.length === 0) {
      return false;
    }

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
      if (equipped === id) {
        return true;
      }
      if (equipped) {
        trainerCardManager.unequip(this.slotIndex);
      }
      if (!trainerCardManager.equip(this.slotIndex, id)) {
        if (equipped) {
          trainerCardManager.equip(this.slotIndex, equipped);
        }
        this.getUi().playError();
        return false;
      }
      console.log("[TRAINER_CARD_EQUIPPED]", { slot: this.slotIndex, card: id });
      void this.saveCardLoadout();
    } else if (equipped && this.selectedRow === choices.length) {
      trainerCardManager.unequip(this.slotIndex);
      void this.saveCardLoadout();
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

  private processRewardInput(button: Button): boolean {
    if (this.rewardCards.length === 0 || !this.rewardOnSelect) {
      return false;
    }

    if (button === Button.LEFT || button === Button.UP) {
      this.rewardSelectedIndex = (this.rewardSelectedIndex - 1 + this.rewardCards.length) % this.rewardCards.length;
      this.render();
      return true;
    }

    if (button === Button.RIGHT || button === Button.DOWN) {
      this.rewardSelectedIndex = (this.rewardSelectedIndex + 1) % this.rewardCards.length;
      this.render();
      return true;
    }

    if (button === Button.CANCEL) {
      if (this.rewardNoCancel) {
        return false;
      }
      this.getUi().revertMode();
      return true;
    }

    if (button !== Button.ACTION) {
      return false;
    }

    const card = this.rewardCards[this.rewardSelectedIndex];
    if (!card) {
      return false;
    }

    const success = this.rewardOnSelect(card);
    if (!success) {
      this.getUi().playError();
      return false;
    }

    // Reward callback handles the UI transition and ends the phase.
    // Reverting after it would restore the preceding mode over the message screen.
    return true;
  }

  /** Save the account loadout and the current session for compatibility. */
  private async saveCardLoadout(): Promise<void> {
    try {
      const success = await globalScene.gameData.saveAll(false, true);
      if (!success) {
        console.error("[TRAINER_CARD_SESSION_SAVE_FAILED]");
      }
    } catch (error) {
      console.error("[TRAINER_CARD_SESSION_SAVE_FAILED]", error);
    }
  }

  clear(): void {
    super.clear();
    if (this.container) {
      this.container.setVisible(false);
    }
    this.rewardCards = [];
    this.rewardSelectedIndex = 0;
    this.rewardOnSelect = null;
    this.getUi().hideTooltip();
  }
}
