import { globalScene } from "#app/global-scene";
import { getPokeballAtlasKey } from "#data/pokeball";
import { getPartyLuckValue, getPartyMarkLuckValue, getMarkLuckDisplayValue, getLuckString, getLuckTextTint } from "#modifiers/modifier-type";
import { Button } from "#enums/buttons";
import type { PokeballType } from "#enums/pokeball";
import { TextStyle } from "#enums/text-style";
import { TrainerCardCategory } from "#enums/trainer-card-id";
import { ModifierTier } from "#enums/modifier-tier";
import { UiMode } from "#enums/ui-mode";
import { trainerCardManager } from "#system/trainer-card-manager";
import { allTrainerCards, type TrainerCard } from "#trainers/trainer-card/trainer-card";
import { addTextObject, getModifierTierTextTint } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";

const VISIBLE_ROWS = 7;

/** Card rarity is independent of its BATTLE/GROWTH/FRIEND/EPIC category. */
const cardTierLabels: Partial<Record<ModifierTier, string>> = {
  [ModifierTier.COMMON]: "COMMON",
  [ModifierTier.GREAT]: "GREAT",
  [ModifierTier.ULTRA]: "ULTRA",
  [ModifierTier.ROGUE]: "ROGUE",
  [ModifierTier.MASTER]: "MASTER",
};

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
  tier?: ModifierTier;
};

interface TrainerCardRerollResult {
  cards: TrainerCard[];
  upgradeCounts: number[];
  rerollCost: number;
}

interface TrainerCardRewardConfig {
  screen: "reward";
  cards: TrainerCard[];
  upgradeCounts?: number[];
  rerollCost?: number;
  onReroll?: (lockTiers: boolean) => TrainerCardRerollResult | null;
  lockAvailable?: boolean;
  lockEnabled?: boolean;
  onToggleLock?: (locked: boolean) => number;
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
  private rewardUpgradeCounts: number[] = [];
  private rewardUpgradeProgress = 0;
  private rewardUpgradeGeneration = 0;
  private rewardAnimating = false;
  /** Card fronts remain hidden until the complete tier-up animation finishes. */
  private rewardRevealComplete = false;
  private rewardFlipRoots: Phaser.GameObjects.Container[] = [];
  private rewardFlipFronts: Phaser.GameObjects.Container[] = [];
  private rewardFlipBacks: Phaser.GameObjects.Container[] = [];
  private rewardSelectedIndex = 0;
  private rewardOnSelect: ((card: TrainerCard) => boolean) | null = null;
  private rewardTitle = "트레이너 카드 선택";
  private rewardDescriptionTitle = "카드 설명";
  private rewardNoCancel = true;
  private rewardRerollCost = 0;
  private rewardOnReroll: ((lockTiers: boolean) => TrainerCardRerollResult | null) | null = null;
  private rewardLockAvailable = false;
  private rewardLockEnabled = false;
  private rewardOnToggleLock: ((locked: boolean) => number) | null = null;
  private rewardRerollSelected = false;

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
    this.rewardUpgradeCounts = this.rewardCards.map((_, index) => Math.max(0, Math.floor(config.upgradeCounts?.[index] ?? 0)));
    this.rewardUpgradeProgress = 0;
    this.rewardRevealComplete = false;
    this.rewardAnimating = true;
    const generation = ++this.rewardUpgradeGeneration;
    const maxUpgrades = Math.max(0, ...this.rewardUpgradeCounts);
    this.rewardSelectedIndex = 0;
    this.rewardOnSelect = config.onSelect;
    this.rewardTitle = config.title ?? "트레이너 카드 선택";
    this.rewardDescriptionTitle = config.descriptionTitle ?? "카드 설명";
    this.rewardNoCancel = config.noCancel ?? true;
    this.rewardRerollCost = config.rerollCost ?? 0;
    this.rewardOnReroll = config.onReroll ?? null;
    this.rewardLockAvailable = !!config.lockAvailable;
    this.rewardLockEnabled = !!config.lockEnabled && this.rewardLockAvailable;
    this.rewardOnToggleLock = config.onToggleLock ?? null;
    this.rewardRerollSelected = false;

    if (this.rewardCards.length === 0 || !this.rewardOnSelect) return false;

    this.container.setVisible(true);
    this.render();

    const advance = () => {
      if (generation !== this.rewardUpgradeGeneration || this.screen !== "reward") return;
      if (this.rewardUpgradeProgress < maxUpgrades) {
        this.rewardUpgradeProgress++;
        // Only rarity balls change during this phase. All card faces stay hidden.
        this.render();
        globalScene.time.delayedCall(350, advance);
      } else {
        globalScene.time.delayedCall(320, () => this.revealRewardCards(generation));
      }
    };
    globalScene.time.delayedCall(450, advance);
    return true;
  }

  /** Perform a horizontal 'card flip' after the tier balls finish upgrading. */
  private revealRewardCards(generation: number): void {
    if (generation !== this.rewardUpgradeGeneration || this.screen !== "reward") return;
    let index = 0;
    const flipNext = () => {
      if (generation !== this.rewardUpgradeGeneration || this.screen !== "reward") return;
      if (index >= this.rewardCards.length) {
        this.rewardRevealComplete = true;
        this.rewardAnimating = false;
        this.render();
        console.log("[TRAINER_CARD_REVEALED]", this.rewardCards.map(card => card.id));
        return;
      }
      const root = this.rewardFlipRoots[index];
      const front = this.rewardFlipFronts[index];
      const back = this.rewardFlipBacks[index];
      index++;
      if (!root || !front || !back) {
        flipNext();
        return;
      }
      globalScene.tweens.add({
        targets: root,
        scaleX: 0.025,
        duration: 170,
        ease: "Sine.In",
        onComplete: () => {
          if (generation !== this.rewardUpgradeGeneration || this.screen !== "reward") return;
          back.setVisible(false);
          front.setVisible(true);
          globalScene.tweens.add({
            targets: root,
            scaleX: 1,
            duration: 190,
            ease: "Sine.Out",
            onComplete: () => globalScene.time.delayedCall(110, flipNext),
          });
        },
      });
    };
    flipNext();
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

  private formatCardName(card: Pick<TrainerCard, "name" | "category" | "tier">): string {
    return `${card.name}(${categoryNames[card.category]})`;
  }

  private getCardTierLabel(card: TrainerCard): string {
    return cardTierLabels[card.tier] ?? "COMMON";
  }

  /** Use the same Poké Ball atlas and tier mapping as regular modifier rewards. */
  private getDisplayedRewardTier(card: TrainerCard, index: number): ModifierTier {
    const remaining = Math.max(0, (this.rewardUpgradeCounts[index] ?? 0) - this.rewardUpgradeProgress);
    return Math.max(ModifierTier.COMMON, card.tier - remaining) as ModifierTier;
  }

  private addTierBall(tier: ModifierTier, x: number, y: number, size = 10): void {
    const frame = getPokeballAtlasKey(tier as number as PokeballType);
    if (!globalScene.textures.exists("pb") || !globalScene.textures.get("pb").has(frame)) {
      return;
    }
    const ball = globalScene.add.image(x, y, "pb", frame);
    const scale = Math.min(size / Math.max(1, ball.width), size / Math.max(1, ball.height));
    ball.setScale(scale);
    this.contents.add(ball);
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
            text: this.formatCardName(card),
            color: this.getCategoryColor(card.category),
            tier: card.tier,
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
        tier: card.tier,
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
      const y = 34 + (i - first) * 17;
      const prefix = i === this.selectedRow ? "▶ " : "   ";
      const row = rows[i];
      if (row.tier !== undefined) {
        // Reserve separate space for the ball so text never overlaps its sprite.
        const nameX = this.view === "slots" ? 55 : 44;
        const ballX = nameX - 7;
        if (this.view === "slots") {
          this.contents.add(addTextObject(15, y, `${prefix}${i + 1}.`, TextStyle.WINDOW));
        } else {
          this.contents.add(addTextObject(15, y, prefix, TextStyle.WINDOW));
        }
        this.addTierBall(row.tier, ballX, y + 6, 10);
        const line = addTextObject(nameX, y, row.text, TextStyle.WINDOW);
        this.applyTextTint(line, row.color);
        this.contents.add(line);
      } else {
        const line = addTextObject(15, y, `${prefix}${row.text}`, TextStyle.WINDOW);
        this.applyTextTint(line, row.color);
        this.contents.add(line);
      }
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

  /** Display the supplied pixel-art card back without distorting its aspect ratio. */
  private createRewardCardBack(parent: Phaser.GameObjects.Container, cardWidth: number, cardHeight: number): void {
    if (globalScene.textures.exists("trainer_card_back")) {
      const back = globalScene.add.image(0, 0, "trainer_card_back");
      // Preserve the original 180:268 aspect ratio and pixel-art appearance.
      const scale = Math.min((cardWidth - 4) / Math.max(1, back.width), cardHeight / Math.max(1, back.height));
      back.setScale(scale);
      parent.add(back);
      return;
    }

    // Fallback only if the image did not load.
    console.warn("[TRAINER_CARD_BACK_MISSING] public/images/card/trainer_card_back.png");
    const fallback = globalScene.add.graphics();
    fallback.fillStyle(0x28334c, 1);
    fallback.lineStyle(1, 0xffc36b, 1);
    fallback.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 2);
    fallback.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 2);
    parent.add(fallback);
  }


  private getRewardGridColumns(): number {
    return Math.min(3, Math.max(1, this.rewardCards.length));
  }

  private getRewardGridRows(): number {
    return Math.max(1, Math.ceil(this.rewardCards.length / this.getRewardGridColumns()));
  }

  private getRewardRowLength(row: number): number {
    const cols = this.getRewardGridColumns();
    const start = row * cols;
    return Math.max(0, Math.min(cols, this.rewardCards.length - start));
  }

  private getRewardCardCell(index: number): {
    x: number;
    centerY: number;
    cardWidth: number;
    ballY: number;
  } {
    const width = globalScene.scaledCanvas.width;
    const cols = this.getRewardGridColumns();
    const rows = this.getRewardGridRows();
    const row = Math.floor(index / cols);
    const col = index % cols;
    const rowLength = this.getRewardRowLength(row);
    const rowWidth = width - 28;
    const cellWidth = rowWidth / Math.max(1, rowLength);
    const cardWidth = rows > 1 ? Math.min(60, cellWidth - 8) : Math.min(79, cellWidth - 7);
    const x = 14 + ((width - 28) / 3) * (col + 0.5);
    const centerY = rows > 1 ? (row === 0 ? 53 : 91) : 68;
    const ballY = centerY + (rows > 1 ? 20 : 39);
    return { x, centerY, cardWidth, ballY };
  }

  /** Show both luck grades in the card reward window, independent of the field overlay. */
  private renderRewardLuck(): void {
    const party = globalScene.getPlayerParty();
    const shiny = getPartyLuckValue(party);
    const mark = getMarkLuckDisplayValue(getPartyMarkLuckValue(party));
    const width = globalScene.scaledCanvas.width;
    // Reserve the right side of the title/instruction area for two compact lines.
    this.fitRewardText(`행운 ${getLuckString(shiny)}`, width - 74, 9, 62, 9, getLuckTextTint(shiny));
    this.fitRewardText(`증표 ${getLuckString(mark)}`, width - 74, 19, 62, 9, getLuckTextTint(mark));
  }

  private renderRewardSelection(): void {
    const width = globalScene.scaledCanvas.width;
    const height = globalScene.scaledCanvas.height;
    this.rewardFlipRoots = [];
    this.rewardFlipFronts = [];
    this.rewardFlipBacks = [];

    this.fitRewardText(this.rewardTitle, 13, 10, width - 95, 12);
    this.renderRewardLuck();
    this.fitRewardText(
      this.rewardRevealComplete
        ? (this.rewardRerollSelected ? "▶ 카드 섞기  ↓ 카드로 돌아가기" : "←→ 카드 선택  ↑ 카드 섞기  Z 확인")
        : "등급 확인 중 · 카드 공개를 기다리세요",
      13,
      25,
      width - 95,
      9,
    );

    const count = this.rewardCards.length;
    const rows = this.getRewardGridRows();
    const panelTop = rows > 1 ? 121 : 117;

    for (let index = 0; index < count; index++) {
      const card = this.rewardCards[index];
      const selected = index === this.rewardSelectedIndex;
      const color = this.getCategoryColor(card.category);
      const { x, centerY, cardWidth, ballY } = this.getRewardCardCell(index);

      const root = globalScene.add.container(x, centerY);
      const back = globalScene.add.container(0, 0);
      const front = globalScene.add.container(0, 0);
      const cardHeight = rows > 1 ? 29 : 62;
      this.createRewardCardBack(back, cardWidth, cardHeight);

      const artFrame = globalScene.add.graphics();
      artFrame.fillStyle(0x30283c, 1);
      artFrame.lineStyle(1, color, 1);
      artFrame.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 3);
      artFrame.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 3);
      front.add(artFrame);

      if (globalScene.textures.exists(card.imageKey)) {
        const art = globalScene.add.image(0, rows > 1 ? -4 : -5, card.imageKey);
        art.setScale(Math.min(28 / Math.max(1, art.width), (rows > 1 ? 17 : 30) / Math.max(1, art.height)));
        front.add(art);
      } else {
        const fallback = globalScene.add.graphics();
        fallback.fillStyle(color, 1);
        fallback.fillRoundedRect(-14, rows > 1 ? -13 : -19, 28, rows > 1 ? 20 : 34, 2);
        front.add(fallback);
      }
      const name = addTextObject(0, rows > 1 ? 9 : 14, card.name, TextStyle.WINDOW);
      const nameScale = Math.min(1, (cardWidth - 6) / Math.max(1, name.width), 8 / Math.max(1, name.height));
      name.setOrigin(0.5, 0);
      name.setScale(nameScale);
      this.applyTextTint(name, color);
      front.add(name);

      const outline = globalScene.add.graphics();
      outline.lineStyle(selected ? 2 : 1, selected ? 0xffd66b : 0x777088, 1);
      outline.strokeRoundedRect(-cardWidth / 2 - 2, -cardHeight / 2 - 2, cardWidth + 4, cardHeight + 4, 3);
      outline.setPosition(x, centerY);
      this.contents.add(outline);

      root.add(back);
      root.add(front);
      back.setVisible(!this.rewardRevealComplete);
      front.setVisible(this.rewardRevealComplete);
      this.contents.add(root);
      this.rewardFlipRoots[index] = root;
      this.rewardFlipFronts[index] = front;
      this.rewardFlipBacks[index] = back;

      this.addTierBall(this.getDisplayedRewardTier(card, index), x, ballY, 12);
    }

    if (count > 0) {
      this.fitRewardText(`${count}장`, width - 34, 25, 24, 8);
    }

    const panelHeight = Math.max(40, height - panelTop - 10);
    const panel = addWindow(10, panelTop, width - 20, panelHeight);
    panel.setOrigin(0, 0);
    this.contents.add(panel);

    if (!this.rewardRevealComplete) {
      this.fitRewardText("등급 상승 및 카드 공개 중...", 17, panelTop + 12, width - 34, 12);
      globalScene.ui.hideTooltip();
      return;
    }

    if (this.rewardOnReroll) {
      const costText = `${this.rewardRerollCost.toLocaleString("ko-KR")}G`;
      const label = this.rewardRerollSelected ? `▶ 카드 섞기  ${costText}` : `↑ 카드 섞기  ${costText}`;
      this.fitRewardText(label, 17, panelTop + 4, width - 34, 11, this.rewardRerollSelected ? 0xffd66b : undefined);
    }
    if (this.rewardRerollSelected) {
      if (this.rewardLockAvailable) {
        this.fitRewardText(
          `←→ 등급 고정: ${this.rewardLockEnabled ? "ON" : "OFF"} (카드 기록)`,
          17, panelTop + 18, width - 34, 10, this.rewardLockEnabled ? 0xffd66b : undefined,
        );
      }
      this.fitRewardText("현재 카드 후보를 버리고 다시 추첨합니다.", 17, panelTop + 22, width - 34, 10);
      this.fitRewardText(
        this.rewardLockEnabled ? "각 위치의 등급은 유지하고 카드만 다시 섞습니다." : "등급 및 상승 판정도 새로 진행됩니다.",
        17, panelTop + 34, width - 34, 10,
      );
      globalScene.ui.hideTooltip();
      return;
    }
    const selectedCard = this.rewardCards[this.rewardSelectedIndex];
    if (!selectedCard) return;
    const color = this.getCategoryColor(selectedCard.category);
    const rarityName = this.getCardTierLabel(selectedCard);
    const rarityColor = getModifierTierTextTint(selectedCard.tier);
    const detailOffset = this.rewardOnReroll ? 12 : 0;
    this.addTierBall(selectedCard.tier, 22, panelTop + 10 + detailOffset, 10);
    this.fitRewardText(this.formatCardName(selectedCard), 31, panelTop + 5 + detailOffset, width - 130, 11, color);
    this.fitRewardText(`[${rarityName}]`, width - 95, panelTop + 5 + detailOffset, 77, 11, rarityColor);
    const lines = this.wrapRewardDescription(selectedCard.description, 35, 3);
    lines.forEach((line, i) => {
      this.fitRewardText(line, 17, panelTop + 21 + detailOffset + i * 11, width - 36, 9);
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
    if (this.rewardCards.length === 0 || !this.rewardOnSelect || this.rewardAnimating) {
      return false;
    }

    const count = this.rewardCards.length;
    const cols = this.getRewardGridColumns();
    const row = Math.floor(this.rewardSelectedIndex / cols);
    const col = this.rewardSelectedIndex % cols;
    const rowLength = this.getRewardRowLength(row);

    if (button === Button.UP && this.rewardOnReroll && !this.rewardRerollSelected && row === 0) {
      this.rewardRerollSelected = true;
      this.render();
      return true;
    }
    if (button === Button.DOWN && this.rewardRerollSelected) {
      this.rewardRerollSelected = false;
      this.render();
      return true;
    }
    if (this.rewardRerollSelected && (button === Button.LEFT || button === Button.RIGHT)) {
      if (this.rewardLockAvailable && this.rewardOnToggleLock) {
        this.rewardLockEnabled = !this.rewardLockEnabled;
        this.rewardRerollCost = this.rewardOnToggleLock(this.rewardLockEnabled);
        this.render();
        return true;
      }
      this.rewardRerollSelected = false;
    }

    if (button === Button.LEFT) {
      if (col > 0) {
        this.rewardSelectedIndex--;
      } else {
        this.rewardSelectedIndex += Math.max(0, rowLength - 1);
      }
      this.render();
      return true;
    }

    if (button === Button.RIGHT) {
      if (col + 1 < rowLength) {
        this.rewardSelectedIndex++;
      } else {
        this.rewardSelectedIndex -= Math.max(0, rowLength - 1);
      }
      this.render();
      return true;
    }

    if (button === Button.UP) {
      if (row > 0) {
        this.rewardSelectedIndex -= cols;
        this.render();
        return true;
      }
      return false;
    }

    if (button === Button.DOWN) {
      const nextIndex = this.rewardSelectedIndex + cols;
      if (nextIndex < count) {
        this.rewardSelectedIndex = nextIndex;
        this.render();
        return true;
      }
      return false;
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

    if (this.rewardRerollSelected && this.rewardOnReroll) {
      const result = this.rewardOnReroll(this.rewardLockEnabled);
      if (!result) return false;
      return this.showReward({
        screen: "reward",
        cards: result.cards,
        upgradeCounts: result.upgradeCounts,
        rerollCost: result.rerollCost,
        onReroll: this.rewardOnReroll,
        lockAvailable: this.rewardLockAvailable,
        lockEnabled: this.rewardLockEnabled,
        onToggleLock: this.rewardOnToggleLock,
        onSelect: this.rewardOnSelect,
        title: this.rewardTitle,
        descriptionTitle: this.rewardDescriptionTitle,
        noCancel: this.rewardNoCancel,
      });
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
    ++this.rewardUpgradeGeneration;
    this.rewardAnimating = false;
    this.rewardRevealComplete = false;
    this.rewardFlipRoots = [];
    this.rewardFlipFronts = [];
    this.rewardFlipBacks = [];
    this.rewardUpgradeCounts = [];
    this.rewardCards = [];
    this.rewardSelectedIndex = 0;
    this.rewardOnSelect = null;
    this.rewardOnReroll = null;
    this.rewardOnToggleLock = null;
    this.rewardLockAvailable = false;
    this.rewardLockEnabled = false;
    this.rewardRerollSelected = false;
    this.getUi().hideTooltip();
  }
}
