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
  private ownedGoldText!: Phaser.GameObjects.Text;
  private paymentDue = 0;
  /** Cursor in the physical 5x5 shelf, retained when the UI is rebuilt. */
  private lastShelfSlot = 0;

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

    this.ownedGoldText = addTextObject(
      globalScene.scaledCanvas.width - 8,
      -globalScene.scaledCanvas.height + 20,
      "",
      TextStyle.MONEY,
      { align: "right" },
    );
    this.ownedGoldText.setOrigin(1, 0);
    this.ownedGoldText.setVisible(false);
    this.modifierContainer.add(this.ownedGoldText);

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

    // Physical 5x5 display slots; some are intentionally empty.
    const visibleSlots = kecleonShopManager.getShopSlotCount();
    const columns = 5;
    const spacingX = 53;
    const spacingY = 37;
    const originX = globalScene.scaledCanvas.width / 2 - ((columns - 1) * spacingX) / 2;
    const originY = -globalScene.scaledCanvas.height + 43;

    for (let slot = 0; slot < visibleSlots; slot++) {
      const itemIndex = kecleonShopManager.getItemIndexAtSlot(slot);
      const option = new KecleonShopOption(
        originX + (slot % columns) * spacingX,
        originY + Math.floor(slot / columns) * spacingY,
        itemIndex >= 0 ? typeOptions[itemIndex] : null,
        itemIndex,
        slot,
      );
      option.setScale(0.5);
      globalScene.add.existing(option);
      this.modifierContainer.add(option);
      this.options.push(option);
    }

    this.cursor = -1;
    this.setCursor(Math.min(this.lastShelfSlot, this.options.length - 1));

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

  /**
   * 골드 부족 경고 이후 선택을 한 번 더 확인합니다.
   * 여기서는 물품을 가져갈지만 확정하며 도둑질 판정이나 결제는 하지 않습니다.
   * 도둑질 판정은 상점 퇴장 시 최종 결제 처리에서만 수행해야 합니다.
   */
  private openOverBudgetConfirmation(selectedIndex: number): void {
    this.awaitingActionInput = false;
    // 기존 OPTION_SELECT의 handler가 끝나기 전에 또 다른 OPTION_SELECT를 열면
    // 기존 메뉴 종료 후처리가 새 메뉴까지 닫아 버릴 수 있으므로 다음 프레임에 엽니다.
    globalScene.time.delayedCall(0, () => {
      if (!this.modifierContainer?.visible) {
        return;
      }
      globalScene.ui.showText(
        "경고! 이 물품까지 가져가면 현재 소지한 골드로는 지불할 수 없습니다!\n정말 고르시겠습니까?",
      );
      globalScene.ui.setOverlayMode(UiMode.OPTION_SELECT, {
        options: [
          {
            label: "예",
            handler: () => {
              globalScene.ui.revertMode();
              // 경고창이 열려 있는 동안 선택된 물건의 상태가 바뀌었을 가능성 방지
              if (kecleonShopManager.isItemTaken(selectedIndex) && !kecleonShopManager.getPlacedItem(selectedIndex)) {
                globalScene.ui.playError();
                this.refreshShelf();
                return true;
              }
              this.onSelect?.(selectedIndex);
              return true;
            },
          },
          {
            label: "아니오",
            handler: () => {
              globalScene.ui.revertMode();
              // 선택만 취소. 물품 지급, 결제, 캘리몬 분노 모두 발생하지 않습니다.
              this.refreshShelf();
              return true;
            },
          },
        ],
        delay: 0,
      });
    });
  }

  private openItemActionMenu(): void {
    const physicalSlot = this.cursor;
    const selectedIndex = kecleonShopManager.getItemIndexAtSlot(physicalSlot);
    const isEmptySlot = selectedIndex < 0;
    const placedAtSlot = kecleonShopManager.getPlacedItemAtSlot(physicalSlot);
    const hasPlacedEmptyItem = isEmptySlot && !!placedAtSlot;
    const alreadyTaken = !isEmptySlot && kecleonShopManager.isItemTaken(selectedIndex) && !placedAtSlot;
    const callbackIndex = isEmptySlot ? -physicalSlot - 2 : selectedIndex;

    if (physicalSlot < 0 || physicalSlot >= this.options.length) {
      return;
    }

    this.awaitingActionInput = false;

    globalScene.ui.setOverlayMode(UiMode.OPTION_SELECT, {
      options: [
        ...(!isEmptySlot && !alreadyTaken
          ? [
              {
                label: "가져가기",
                handler: () => {
                  globalScene.ui.revertMode();

                  this.awaitingActionInput = false;
                  if (
                    kecleonShopManager.isItemTaken(selectedIndex)
                    && !kecleonShopManager.getPlacedItem(selectedIndex)
                  ) {
                    globalScene.ui.playError();
                    this.awaitingActionInput = true;
                    this.refreshShelf();
                    return true;
                  }

                  const candidate = this.options[physicalSlot].modifierTypeOption;
                  const newDue = kecleonShopManager.getPaymentDue() + (candidate?.cost ?? 0);
                  if (candidate && newDue > globalScene.money && this.onSelect) {
                    this.openOverBudgetConfirmation(selectedIndex);
                  } else {
                    this.onSelect?.(selectedIndex);
                  }
                  return true;
                },
              },
            ]
          : []),
        ...(!isEmptySlot || hasPlacedEmptyItem
          ? [
              {
                label: hasPlacedEmptyItem ? "놓은 물건 되가져오기" : "교환하기",
                handler: () => {
                  globalScene.ui.revertMode();

                  this.awaitingActionInput = true;

                  console.log("[KECLEON_SHOP_EXCHANGE_ITEM]", {
                    index: selectedIndex,
                  });

                  if (this.onExchange) {
                    return this.onExchange(callbackIndex);
                  }

                  return true;
                },
              },
            ]
          : []),
        ...(!hasPlacedEmptyItem
          ? [
              {
                label: "두기",
                handler: () => {
                  globalScene.ui.revertMode();

                  this.awaitingActionInput = true;

                  console.log("[KECLEON_SHOP_PUT_ITEM]", {
                    index: selectedIndex,
                  });

                  if (this.onPut) {
                    return this.onPut(callbackIndex);
                  }

                  return true;
                },
              },
            ]
          : []),
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
      case Button.LEFT:
      case Button.RIGHT:
      case Button.UP:
      case Button.DOWN: {
        const columns = 5;
        const count = this.options.length;
        const rowStart = Math.floor(this.cursor / columns) * columns;
        const rowLength = Math.min(columns, count - rowStart);
        const column = this.cursor % columns;
        let next = this.cursor;

        if (button === Button.LEFT) {
          next = rowStart + ((column - 1 + rowLength) % rowLength);
        } else if (button === Button.RIGHT) {
          next = rowStart + ((column + 1) % rowLength);
        } else {
          const rowCount = Math.ceil(count / columns);
          const row = Math.floor(this.cursor / columns);
          const nextRow = (row + (button === Button.DOWN ? 1 : -1) + rowCount) % rowCount;
          next = Math.min(nextRow * columns + column, count - 1);
        }

        success = this.setCursor(next);
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

    this.lastShelfSlot = cursor;
    this.cursorObj.setPosition(selected.x - 12, selected.y + 2);

    const itemIndex = kecleonShopManager.getItemIndexAtSlot(cursor);
    const placed = kecleonShopManager.getPlacedItemAtSlot(cursor);
    if (itemIndex < 0 && !placed) {
      this.getUi().showText("빈 진열대. 어떤 종류의 물건이든 놓을 수 있다.");
      return ret;
    }

    if (itemIndex >= 0 && kecleonShopManager.isItemTaken(itemIndex) && !placed) {
      this.getUi().showText("아무것도 놓여 있지 않다.");
      return ret;
    }

    const type = placed?.modifier.type ?? selected.modifierTypeOption?.type;

    if (!type) {
      this.getUi().showText("빈 진열대.");
      return ret;
    }

    const cost = selected.modifierTypeOption?.cost;
    this.getUi().showText(
      cost == null ? type.getDescription() : `${type.getDescription()}\n${formatMoney(globalScene.moneyFormat, cost)}`,
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
    this.ownedGoldText.setText(`보유 골드: ${formatMoney(globalScene.moneyFormat, globalScene.money)}`);
    this.ownedGoldText.setVisible(true);
  }

  /** Rebuild the displayed goods without changing the current shop mode or cursor. */
  public refreshShelf(): void {
    if (this.options.length === 0) {
      return;
    }
    const slot = Math.max(0, Math.min(this.cursor, this.options.length - 1));
    const options = kecleonShopManager.getShopOptions();
    this.clearOptionsOnly();
    const columns = 5;
    const spacingX = 53;
    const spacingY = 37;
    const originX = globalScene.scaledCanvas.width / 2 - ((columns - 1) * spacingX) / 2;
    const originY = -globalScene.scaledCanvas.height + 43;
    for (let physicalSlot = 0; physicalSlot < kecleonShopManager.getShopSlotCount(); physicalSlot++) {
      const itemIndex = kecleonShopManager.getItemIndexAtSlot(physicalSlot);
      const option = new KecleonShopOption(
        originX + (physicalSlot % columns) * spacingX,
        originY + Math.floor(physicalSlot / columns) * spacingY,
        itemIndex >= 0 ? options[itemIndex] : null,
        itemIndex,
        physicalSlot,
      );
      option.setScale(0.5);
      globalScene.add.existing(option);
      this.modifierContainer.add(option);
      this.options.push(option);
    }
    if (this.options.length > 0) {
      this.cursor = -1;
      this.setCursor(Math.min(slot, this.options.length - 1));
    }
    this.setPaymentDue(kecleonShopManager.getPaymentDue());
    this.awaitingActionInput = true;
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
    this.lastShelfSlot = 0;
    this.paymentDueText.setText("");
    this.paymentDueText.setVisible(false);
    this.ownedGoldText.setText("");
    this.ownedGoldText.setVisible(false);

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

  private readonly shopIndex: number;
  private readonly physicalSlot: number;

  constructor(
    x: number,
    y: number,
    modifierTypeOption: ModifierTypeOption | null,
    shopIndex: number,
    physicalSlot: number,
  ) {
    super(globalScene, x, y);

    this.modifierTypeOption = modifierTypeOption;
    this.shopIndex = shopIndex;
    this.physicalSlot = physicalSlot;

    this.setup();
  }

  private setup(): void {
    const placed = kecleonShopManager.getPlacedItemAtSlot(this.physicalSlot);
    const taken = this.shopIndex < 0 || kecleonShopManager.isItemTaken(this.shopIndex);
    const type = placed?.modifier.type ?? this.modifierTypeOption?.type;

    // 가져간 뒤 아무것도 두지 않은 슬롯 = 빈칸
    if ((taken || !type) && !placed) {
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
    this.itemText = addTextObject(0, 25, "-", TextStyle.PARTY, { align: "center" });

    this.itemText.setOrigin(0.5, 0);
    this.add(this.itemText);

    this.itemCostText = addTextObject(0, 35, "", TextStyle.MONEY, { align: "center" });

    this.itemCostText.setOrigin(0.5, 0);
    this.add(this.itemCostText);
  }

  public updateCostText(): void {
    const placed = kecleonShopManager.getPlacedItemAtSlot(this.physicalSlot);
    const taken = this.shopIndex < 0 || kecleonShopManager.isItemTaken(this.shopIndex);

    if (taken && !placed) {
      this.itemCostText?.setText("");
      return;
    }
    if (this.shopIndex < 0 && placed) {
      this.itemCostText?.setText("두기");
      return;
    }

    const cost = this.modifierTypeOption?.cost ?? 0;

    const textStyle = cost <= globalScene.money ? TextStyle.MONEY : TextStyle.PARTY_RED;

    this.itemCostText.setText(formatMoney(globalScene.moneyFormat, cost));

    this.itemCostText.setColor(getTextColor(textStyle, false));

    this.itemCostText.setShadowColor(getTextColor(textStyle, true));
  }
}
