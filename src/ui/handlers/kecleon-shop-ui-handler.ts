import { globalScene } from "#app/global-scene";
import { kecleonShopManager } from "#data/kecleon-shop/kecleon-shop-manager";
import { Button } from "#enums/buttons";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import type { ModifierTypeOption } from "#modifiers/modifier-type";
import { AwaitableUiHandler } from "#ui/awaitable-ui-handler";
import { addTextObject, getModifierTierTextTint, getTextColor } from "#ui/text";
import { formatMoney } from "#utils/common";
import Phaser from "phaser";

export type KecleonShopSelectCallback = (index: number) => boolean;

export type KecleonShopPutCallback = (index: number) => boolean;

export type KecleonShopExchangeCallback = (index: number) => boolean;

export class KecleonShopUiHandler extends AwaitableUiHandler {
  private modifierContainer!: Phaser.GameObjects.Container;
  private options: KecleonShopOption[] = [];
  private cursorObj: Phaser.GameObjects.Image | null = null;
  private onSelect: KecleonShopSelectCallback | null = null;
  private onPut: KecleonShopPutCallback | null = null;
  private onExchange: KecleonShopExchangeCallback | null = null;

  private paymentDueText!: Phaser.GameObjects.Text;
  private paymentDue = 0;

  constructor() {
    super(UiMode.KECLEON_SHOP);
  }

  setup(): void {
    const ui = this.getUi();

    this.modifierContainer = globalScene.add.container(0, 0);
    this.modifierContainer.setName("kecleon-shop-options");
    this.modifierContainer.setVisible(false);

    this.paymentDueText = addTextObject(
      globalScene.scaledCanvas.width - 8,
      -globalScene.scaledCanvas.height + 8,
      "",
      TextStyle.MONEY,
      { align: "right" },
    );

    this.paymentDueText.setOrigin(1, 0);
    this.paymentDueText.setVisible(false);

    this.modifierContainer.add(this.paymentDueText);

    ui.add(this.modifierContainer);
  }

  show(args: any[]): boolean {
    if (args.length < 2 || !Array.isArray(args[0]) || !(args[1] instanceof Function)) {
      console.warn("[KECLEON_SHOP_UI_INVALID_ARGS]", args);
      return false;
    }

    super.show(args);

    this.clearOptionsOnly();
    this.getUi().clearText();

    const typeOptions = args[0] as ModifierTypeOption[];

    this.onSelect = args[1] as KecleonShopSelectCallback;

    this.onPut = args[2] instanceof Function ? (args[2] as KecleonShopPutCallback) : null;

    this.onExchange = args[3] instanceof Function ? (args[3] as KecleonShopExchangeCallback) : null;

    if (typeOptions.length === 0) {
      console.warn("[KECLEON_SHOP_UI_EMPTY]");
      return false;
    }

    this.modifierContainer.setVisible(true);

    const columns = 5;
    const rows = 5;

    const spacingX = 26;
    const spacingY = 24;

    const centerX = globalScene.scaledCanvas.width / 2;

    const centerY = -globalScene.scaledCanvas.height / 2 - 20;

    const startX = centerX - ((columns - 1) * spacingX) / 2;

    const startY = centerY - ((rows - 1) * spacingY) / 2;

    const slotCount = kecleonShopManager.getShopSlotCount();

    for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
      const itemIndex = kecleonShopManager.getItemIndexAtSlot(slotIndex);

      const column = slotIndex % columns;

      const row = Math.floor(slotIndex / columns);

      const option = new KecleonShopOption(
        startX + column * spacingX,
        startY + row * spacingY,

        itemIndex >= 0 ? typeOptions[itemIndex] : null,

        itemIndex,
      );

      option.setScale(0.5);

      globalScene.add.existing(option);
      this.modifierContainer.add(option);
      this.options.push(option);
    }

    this.cursor = -1;
    this.setCursor(0);

    this.awaitingActionInput = true;

    this.setPaymentDue(kecleonShopManager.getPaymentDue());

    console.log("[KECLEON_SHOP_UI_OPEN]", {
      count: this.options.length,
      items: typeOptions.map(o => ({
        name: o.type.getSafeName(),
        cost: o.cost,
      })),
    });

    return true;
  }

  private openItemActionMenu(): void {
    const slotIndex = this.cursor;

    if (slotIndex < 0 || slotIndex >= this.options.length) {
      return;
    }

    const selected = this.options[slotIndex];

    if (!selected || selected.shopIndex < 0 || !selected.modifierTypeOption) {
      this.getUi().showText("아무것도 놓여 있지 않다.");

      return;
    }

    // 실제 shopOptions 배열의 인덱스
    const itemIndex = selected.shopIndex;

    this.awaitingActionInput = false;

    globalScene.ui.setOverlayMode(UiMode.OPTION_SELECT, {
      options: [
        {
          label: "가져가기",
          handler: () => {
            globalScene.ui.revertMode();
            this.awaitingActionInput = true;

            if (this.onSelect) {
              this.onSelect(itemIndex);
            }

            return true;
          },
        },
        {
          label: "교환하기",
          handler: () => {
            globalScene.ui.revertMode();
            this.awaitingActionInput = true;

            if (this.onExchange) {
              return this.onExchange(itemIndex);
            }

            return true;
          },
        },
        {
          label: "두기",
          handler: () => {
            globalScene.ui.revertMode();
            this.awaitingActionInput = true;

            if (this.onPut) {
              return this.onPut(itemIndex);
            }

            return true;
          },
        },
        {
          label: "취소",
          handler: () => {
            globalScene.ui.revertMode();
            this.awaitingActionInput = true;
            return true;
          },
        },
      ],
      delay: 0,
    });
  }

  processInput(button: Button): boolean {
    if (!this.awaitingActionInput || this.options.length === 0) {
      return false;
    }

    let success = false;

    switch (button) {
      case Button.LEFT: {
        const column = this.cursor % 5;

        if (column > 0) {
          success = this.setCursor(this.cursor - 1);
        }

        break;
      }

      case Button.RIGHT: {
        const column = this.cursor % 5;

        if (column < 4) {
          success = this.setCursor(this.cursor + 1);
        }

        break;
      }

      case Button.UP: {
        if (this.cursor >= 5) {
          success = this.setCursor(this.cursor - 5);
        }

        break;
      }

      case Button.DOWN: {
        if (this.cursor + 5 < this.options.length) {
          success = this.setCursor(this.cursor + 5);
        }

        break;
      }

      case Button.ACTION: {
        this.openItemActionMenu();
        success = true;
        break;
      }

      case Button.CANCEL: {
        if (this.onSelect) {
          success = this.onSelect(-1);
        }
        break;
      }
    }

    if (success) {
      this.getUi().playSelect();
    }

    return success;
  }

  setCursor(cursor: number): boolean {
    if (this.options.length === 0) {
      return false;
    }

    const ret = super.setCursor(cursor);

    if (!this.cursorObj) {
      this.cursorObj = globalScene.add.image(0, 0, "cursor");
      this.cursorObj.setName("kecleon-shop-cursor");
      this.modifierContainer.add(this.cursorObj);
    }

    const selected = this.options[cursor];

    if (!selected) {
      return ret;
    }

    // 빈칸이든 상품칸이든 커서는 먼저 이동
    this.cursorObj.setPosition(selected.x - 12, selected.y + 2);

    if (selected.shopIndex < 0 || !selected.modifierTypeOption) {
      this.getUi().showText("아무것도 놓여 있지 않다.");

      return ret;
    }

    const itemIndex = selected.shopIndex;

    const placed = kecleonShopManager.getPlacedItem(itemIndex);

    if (kecleonShopManager.isItemTaken(itemIndex) && !placed) {
      this.getUi().showText("아무것도 놓여 있지 않다.");

      return ret;
    }

    const type = placed?.modifier.type ?? selected.modifierTypeOption.type;

    this.getUi().showText(
      `${type.getDescription()}\n${formatMoney(globalScene.moneyFormat, selected.modifierTypeOption.cost)}`,
    );

    return ret;
  }

  public setPaymentDue(amount: number): void {
    this.paymentDue = Math.max(0, amount);

    const insufficient = this.paymentDue > globalScene.money;

    const textStyle = insufficient ? TextStyle.PARTY_RED : TextStyle.MONEY;

    const warning = insufficient ? " !" : "";

    this.paymentDueText.setText(`지불 예정: ${formatMoney(globalScene.moneyFormat, this.paymentDue)}${warning}`);

    this.paymentDueText.setColor(getTextColor(textStyle, false));

    this.paymentDueText.setShadowColor(getTextColor(textStyle, true));

    this.paymentDueText.setVisible(true);
  }

  public updateCostText(): void {
    for (const option of this.options) {
      option.updateCostText();
    }
  }

  clear(): void {
    super.clear();

    this.awaitingActionInput = false;
    this.onSelect = null;
    this.onPut = null;
    this.onExchange = null;

    this.getUi().clearText();
    this.clearOptionsOnly();

    this.modifierContainer.setVisible(false);

    this.paymentDue = 0;
    this.paymentDueText.setText("");
    this.paymentDueText.setVisible(false);

    console.log("[KECLEON_SHOP_UI_CLEAR]");
  }

  private clearOptionsOnly(): void {
    if (this.cursorObj) {
      this.cursorObj.destroy();
      this.cursorObj = null;
    }

    for (const option of this.options) {
      option.destroy();
    }

    this.options = [];
    this.cursor = 0;
  }
}

class KecleonShopOption extends Phaser.GameObjects.Container {
  public readonly modifierTypeOption: ModifierTypeOption | null;

  private item!: Phaser.GameObjects.Sprite;
  private itemText!: Phaser.GameObjects.Text;
  private itemCostText!: Phaser.GameObjects.Text;

  public readonly shopIndex: number;

  constructor(x: number, y: number, modifierTypeOption: ModifierTypeOption | null, shopIndex: number) {
    super(globalScene, x, y);

    this.modifierTypeOption = modifierTypeOption;
    this.shopIndex = shopIndex;

    this.setup();
  }

  private setup(): void {
    if (this.shopIndex < 0 || !this.modifierTypeOption) {
      this.setupEmptySlot();
      return;
    }
    const placed = kecleonShopManager.getPlacedItem(this.shopIndex);

    const taken = kecleonShopManager.isItemTaken(this.shopIndex);

    const type = placed?.modifier.type ?? this.modifierTypeOption.type;

    // 가져간 뒤 아무것도 두지 않은 슬롯 = 빈칸
    if (taken && !placed) {
      this.setupEmptySlot();
      return;
    }

    this.item = globalScene.add.sprite(0, 0, "items", type.iconImage);

    this.add(this.item);

    this.itemText = addTextObject(0, 25, type.getSafeName(), TextStyle.PARTY, { align: "center" });

    this.itemText.setOrigin(0.5, 0);

    if (type.tier != null) {
      this.itemText.setTint(getModifierTierTextTint(type.tier));
    }

    this.add(this.itemText);

    this.itemCostText = addTextObject(0, 35, "", TextStyle.MONEY, { align: "center" });

    this.itemCostText.setOrigin(0.5, 0);
    this.add(this.itemCostText);

    this.updateCostText();
  }

  private setupEmptySlot(): void {
    this.itemText = addTextObject(0, 0, "-", TextStyle.PARTY, { align: "center" });

    this.itemText.setOrigin(0.5);
    this.add(this.itemText);

    this.itemCostText = addTextObject(0, 35, "", TextStyle.MONEY, { align: "center" });

    this.itemCostText.setOrigin(0.5, 0);
    this.add(this.itemCostText);
  }

  public updateCostText(): void {
    if (this.shopIndex < 0 || !this.modifierTypeOption) {
      this.itemCostText?.setText("");
      return;
    }

    const placed = kecleonShopManager.getPlacedItem(this.shopIndex);

    const taken = kecleonShopManager.isItemTaken(this.shopIndex);

    if (taken && !placed) {
      this.itemCostText?.setText("");
      return;
    }

    const cost = this.modifierTypeOption.cost;

    const textStyle = cost <= globalScene.money ? TextStyle.MONEY : TextStyle.PARTY_RED;

    this.itemCostText.setText(formatMoney(globalScene.moneyFormat, cost));

    this.itemCostText.setColor(getTextColor(textStyle, false));

    this.itemCostText.setShadowColor(getTextColor(textStyle, true));
  }
}
