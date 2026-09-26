import { globalScene } from "#app/global-scene";
import { BerryType } from "#enums/berry-type";
import { Button } from "#enums/buttons";
import { ModifierTier } from "#enums/modifier-tier";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import {
  BerryModifierType,
  PokemonHeldItemModifierType,
  SpeciesStatBoosterModifierType,
  SpeciesStatBoosterModifierTypeGenerator,
} from "#modifiers/modifier-type";
import { buildRogueShopListings } from "#modifiers/rogue-shop-utils";
import { AwaitableUiHandler } from "#ui/awaitable-ui-handler";
import type { RogueShopListing } from "#ui/rogue-shop-ui-handler";
import { addTextObject, getModifierTierTextTint } from "#ui/text";
import { addWindow } from "#ui/ui-theme";
import Phaser from "phaser";

const PAGE_SIZE = 16;
const ROWS_PER_COL = 8;

export class PracticeRentalModifierSelectUiHandler extends AwaitableUiHandler {
  private container: Phaser.GameObjects.Container;
  private cursorObj: Phaser.GameObjects.Image | null = null;

  private listings: RogueShopListing[] = [];
  private options: PracticeRentalModifierOption[] = [];

  private cursor = 0;
  private page = 0;

  private windowObj: Phaser.GameObjects.NineSlice | null = null;

  private titleText: Phaser.GameObjects.Text | null = null;
  private pageText: Phaser.GameObjects.Text | null = null;

  private selectingTarget = false;
  private pendingListing: RogueShopListing | null = null;
  private targetCursor = 0;

  private targets: any[] = [];
  private onSelect?: (modifierType: PokemonHeldItemModifierType) => void;

  private dummyKey: "dummy1" | "dummy2" = "dummy1";

  constructor() {
    super(UiMode.CONFIRM);
  }

  setup(): void {
    const ui = this.getUi();

    this.container = globalScene.add.container(0, 0);
    this.container.setName("practice-rental-modifier-select");
    ui.add(this.container);
  }

  show(args: any[]): boolean {
    if (this.active) {
      return false;
    }

    super.show(args);

    const config = args?.[0] as { dummyKey?: "dummy1" | "dummy2"; onSelect?: any } | undefined;

    this.dummyKey = config?.dummyKey ?? "dummy1";
    this.onSelect = config?.onSelect;

    this.windowObj = addWindow(60, -globalScene.scaledCanvas.height + 30, 220, 150);

    this.windowObj.setName("practice-rental-modifier-window");
    this.container.add(this.windowObj);

    this.getUi().clearText();
    this.cursor = 0;
    this.page = 0;

    const shopListings = buildRogueShopListings().filter(listing => {
      const type = listing.option.type;
      const id = type?.id ?? listing.id;

      return (
        type instanceof PokemonHeldItemModifierType && typeof id === "string" && !id.startsWith("BASE_STAT_BOOSTER")
      );
    });

    const berryListings = Object.entries(BerryType)
      .filter(([key, value]) => Number.isNaN(Number(key)) && typeof value === "number")
      .map(([_, berry]) => {
        const type = new BerryModifierType(berry as BerryType);

        return {
          id: `BERRY_${berry}`,
          option: { type },
        } as RogueShopListing;
      });

    const speciesBoosterListings = Object.keys(SpeciesStatBoosterModifierTypeGenerator.items).map(key => {
      const type = new SpeciesStatBoosterModifierType(
        key as keyof typeof SpeciesStatBoosterModifierTypeGenerator.items,
      );

      type.setTier(
        SpeciesStatBoosterModifierTypeGenerator.items[key as keyof typeof SpeciesStatBoosterModifierTypeGenerator.items]
          .rare
          ? ModifierTier.ROGUE
          : ModifierTier.ULTRA,
      );

      return {
        id: type.id,
        option: { type },
      } as RogueShopListing;
    });

    const seen = new Set<string>();

    this.listings = [
      ...shopListings.filter(l => !(l.option.type instanceof BerryModifierType)),
      ...berryListings,
      ...speciesBoosterListings,
    ].filter(listing => {
      const id = listing.id ?? listing.option.type?.id;

      if (!id || seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    });

    this.renderPage();
    this.awaitingActionInput = true;
  }

  processInput(button: Button): boolean {
    if (!this.awaitingActionInput) {
      return false;
    }

    let success = false;

    switch (button) {
      case Button.UP:
        success = this.selectingTarget ? this.setTargetCursor(this.targetCursor - 1) : this.setCursor(this.cursor - 1);
        break;

      case Button.DOWN:
        success = this.selectingTarget ? this.setTargetCursor(this.targetCursor + 1) : this.setCursor(this.cursor + 1);
        break;

      case Button.LEFT:
        success = this.changePage(-1);
        break;

      case Button.RIGHT:
        success = this.changePage(1);
        break;

      case Button.ACTION:
        success = true;

        if (this.selectingTarget) {
          this.confirmTarget();
        } else {
          this.confirm();
        }

        break;

      case Button.CANCEL:
        success = true;
        this.closeAndReturn();
        break;
    }

    if (success) {
      this.getUi().playSelect();
    }

    return success;
  }

  private getPageListings(): RogueShopListing[] {
    return this.listings.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);
  }

  private closeAndReturn(): void {
    this.clear();
    this.getUi().revertMode();
  }

  private renderPage(): void {
    this.clearOptions();
    this.eraseCursor();

    const pageListings = this.getPageListings();

    const windowX = 60;
    const windowY = -globalScene.scaledCanvas.height + 30;

    const titleX = windowX + 12;
    const titleY = windowY + 10;

    const startX1 = windowX + 22;
    const startX2 = windowX + 122;
    const startY = windowY + 38;
    const gapY = 15;

    this.titleText = addTextObject(titleX, titleY, "렌탈 모디파이어 선택", TextStyle.SUMMARY);
    this.titleText.setName("practice-rental-title");
    this.container.add(this.titleText);

    this.pageText = addTextObject(
      windowX + 156,
      titleY + 2,
      `${this.page + 1}/${this.getMaxPage() + 1}`,
      TextStyle.WINDOW,
    );
    this.pageText.setName("practice-rental-page");
    this.container.add(this.pageText);

    pageListings.forEach((listing, index) => {
      const col = index >= ROWS_PER_COL ? 1 : 0;
      const row = index % ROWS_PER_COL;

      const x = col === 0 ? startX1 : startX2;
      const y = startY + row * gapY;

      const option = new PracticeRentalModifierOption(x, y, listing);

      globalScene.add.existing(option);
      this.container.add(option);
      this.options.push(option);
    });

    this.setCursor(0);
  }

  private getMaxPage(): number {
    return Math.max(0, Math.ceil(this.listings.length / PAGE_SIZE) - 1);
  }

  private changePage(delta: number): boolean {
    const maxPage = this.getMaxPage();
    this.page = Math.max(0, Math.min(maxPage, this.page + delta));
    this.cursor = 0;
    this.renderPage();
    return true;
  }

  private confirm(): void {
    const listing = this.getPageListings()[this.cursor];
    const type = listing.option.type;

    if (!(type instanceof PokemonHeldItemModifierType)) {
      console.warn("[PRACTICE_RENTAL_NOT_HELD_MODIFIER]", type?.id);
      return;
    }

    if (this.onSelect) {
      this.onSelect(type);
      this.closeAndReturn();
      return;
    }

    this.pendingListing = listing;
    this.confirmDummyReservedModifier();
  }

  private confirmDummyReservedModifier(): void {
    if (!this.pendingListing) {
      return;
    }

    const type = this.pendingListing.option.type;

    if (!(type instanceof PokemonHeldItemModifierType)) {
      console.warn("[PRACTICE_RENTAL_NOT_HELD_MODIFIER]", type?.id);
      return;
    }

    const rootCfg = (globalScene.gameData.practiceDummyConfig ??= {});
    rootCfg.dummy1 ??= {};
    rootCfg.dummy2 ??= {};

    const dummyCfg = (rootCfg[this.dummyKey] ??= {});
    dummyCfg.rentalModifiers ??= [];

    const existing = dummyCfg.rentalModifiers.find((m: any) => m.itemId === type.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      dummyCfg.rentalModifiers.push({
        itemId: type.id,
        quantity: 1,
      });
    }

    globalScene.gameData.saveSystem();

    console.log("[PRACTICE_RENTAL_DUMMY_RESERVED]", {
      dummyKey: this.dummyKey,
      modifier: type.id,
      quantity: existing?.quantity ?? 1,
    });

    this.closeAndReturn();
  }

  private confirmTarget(): void {
    if (!this.pendingListing) {
      return;
    }

    const target = this.targets[this.targetCursor];

    if (!target || typeof target.id !== "number") {
      console.warn("[PRACTICE_RENTAL_INVALID_TARGET]", target);
      this.getUi().playError();
      return;
    }

    const type = this.pendingListing.option.type;

    if (!(type instanceof PokemonHeldItemModifierType)) {
      return;
    }

    globalScene.givePracticeRentalModifierType(target, type, 1);

    console.log("[PRACTICE_RENTAL_GRANTED]", {
      target: target.name,
      modifier: type.id,
    });

    this.closeAndReturn();
  }

  private renderTargetSelect(): void {
    this.getUi().showText(this.targets.map((t, i) => `${i === this.targetCursor ? "▶ " : "   "}${t.name}`).join("\n"));
  }

  private setTargetCursor(cursor: number): boolean {
    if (this.targets.length === 0) {
      return false;
    }

    const len = this.targets.length;
    this.targetCursor = (cursor + len) % len;

    this.renderTargetSelect();

    return true;
  }

  private setCursor(cursor: number): boolean {
    if (this.options.length === 0) {
      return false;
    }

    const len = this.options.length;
    this.cursor = (cursor + len) % len;

    if (!this.cursorObj) {
      this.cursorObj = globalScene.add.image(0, 0, "cursor");
      this.cursorObj.setName("practice-rental-cursor");
      this.container.add(this.cursorObj);
    }

    const option = this.options[this.cursor];
    this.cursorObj.setPosition(option.x - 13, option.y - 1);
    this.cursorObj.setScale(0.65);

    this.getUi().showText(option.getDescription());

    return true;
  }

  clear(): void {
    super.clear();

    this.awaitingActionInput = false;
    this.getUi().clearText();

    this.eraseCursor();
    this.clearOptions();

    if (this.windowObj) {
      this.windowObj.destroy();
      this.windowObj = null;
    }
  }

  private clearOptions(): void {
    for (const option of this.options) {
      option.destroy();
    }

    this.options = [];

    this.titleText?.destroy();
    this.titleText = null;

    this.pageText?.destroy();
    this.pageText = null;
  }

  private eraseCursor(): void {
    if (this.cursorObj) {
      this.cursorObj.destroy();
      this.cursorObj = null;
    }
  }
}

class PracticeRentalModifierOption extends Phaser.GameObjects.Container {
  constructor(
    x: number,
    y: number,
    private listing: RogueShopListing,
  ) {
    super(globalScene, x, y);
    this.setup();
  }

  private setup(): void {
    const type = this.listing.option.type;

    const icon = globalScene.add.sprite(0, 0, "items", type.iconImage);
    icon.setScale(0.38);
    this.add(icon);

    const nameText = addTextObject(12, -6, type.getSafeName?.() ?? type.name ?? type.id, TextStyle.PARTY, {
      fontSize: "42px",
    });

    nameText.setOrigin(0, 0);

    if (type.tier !== undefined) {
      nameText.setTint(getModifierTierTextTint(type.tier));
    }

    this.add(nameText);
  }

  public getDescription(): string {
    const type = this.listing.option.type;
    return type.getDescription?.() ?? "";
  }
}
