import { globalScene } from "#app/global-scene";
import { getApricornName } from "#data/apricorn";
import { CraftingDestination, CraftingLocation, craftingManager } from "#data/crafting/crafting-manager";
import {
  type CraftingRecipe,
  type CraftingResult,
  findCraftingRecipeByItems,
  getCraftingIngredientItemIds,
} from "#data/crafting/crafting-recipe";
import { getPokeballName } from "#data/pokeball";
import { ApricornType } from "#enums/apricorn-type";
import { Button } from "#enums/buttons";
import { PokeballType } from "#enums/pokeball";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";

type CraftingUiConfig = {
  returnMode?: UiMode;

  /**
   * 이전 UI를 다시 열 때 넘겨줄 원래 인자.
   * 로그센터에서 들어온 경우 source/onExit 등의 문맥을 보존합니다.
   */
  returnArgs?: unknown;

  location?: CraftingLocation;
};

/**
 * 3칸 제작대 UI.
 *
 * 슬롯 순서는 레시피 판정에 영향을 주지 않습니다.
 * 각 슬롯에는 재료 1개가 들어가며,
 * 같은 재료를 여러 칸에 넣을 수도 있습니다.
 */
export class CraftingUiHandler extends UiHandler {
  private rootContainer: Phaser.GameObjects.Container;

  private titleText: Phaser.GameObjects.Text;

  private slotWindows: Phaser.GameObjects.NineSlice[] = [];
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private plusTexts: Phaser.GameObjects.Text[] = [];

  private resultWindow: Phaser.GameObjects.NineSlice;
  private resultText: Phaser.GameObjects.Text;

  private craftText: Phaser.GameObjects.Text;
  private messageText: Phaser.GameObjects.Text;
  private helpText: Phaser.GameObjects.Text;

  private returnMode: UiMode = UiMode.MENU;
  private returnArgs: unknown = undefined;

  private craftingLocation: CraftingLocation = CraftingLocation.NORMAL;

  /**
   * 각 슬롯은 itemId 하나를 보관합니다.
   * null이면 빈 슬롯입니다.
   */
  private selectedIngredients: Array<string | null> = [null, null, null];

  /**
   * 0~2 = 재료 슬롯
   * 3 = 제작하기
   */
  private cursor = 0;
  private lastSlotCursor = 0;

  constructor() {
    super(UiMode.CRAFTING);
  }

  setup(): void {
    const ui = this.getUi();
    const width = globalScene.scaledCanvas.width;
    const height = globalScene.scaledCanvas.height;

    this.rootContainer = globalScene.add.container(0, -height).setName("crafting-ui").setVisible(false);

    const mainWindow = addWindow(8, 10, width - 16, height - 20);

    this.titleText = addTextObject(width / 2, 18, "제작", TextStyle.SUMMARY).setOrigin(0.5, 0);

    /**
     * 3개의 재료 슬롯.
     * 320px 기준으로 78px 슬롯 3개가 들어가도록 배치합니다.
     */
    const slotXs = [14, 121, 228];

    for (let i = 0; i < 3; i++) {
      const slotWindow = addWindow(slotXs[i], 48, 78, 42);

      const slotText = addTextObject(slotXs[i] + 39, 55, "", TextStyle.WINDOW, {
        wordWrap: {
          width: 410,
          useAdvancedWrap: true,
        },
      }).setOrigin(0.5, 0);

      this.slotWindows.push(slotWindow);
      this.slotTexts.push(slotText);
    }

    this.plusTexts = [
      addTextObject(106, 61, "+", TextStyle.SUMMARY).setOrigin(0.5, 0),

      addTextObject(213, 61, "+", TextStyle.SUMMARY).setOrigin(0.5, 0),
    ];

    this.resultWindow = addWindow(width / 2 - 66, 96, 132, 30);

    this.resultText = addTextObject(width / 2, 102, "", TextStyle.WINDOW).setOrigin(0.5, 0);

    this.craftText = addTextObject(width / 2, 130, "", TextStyle.SUMMARY).setOrigin(0.5, 0);

    this.messageText = addTextObject(18, 146, "", TextStyle.WINDOW);

    this.helpText = addTextObject(18, 162, "←→ 슬롯 이동  Z 선택/제작  X 나가기", TextStyle.WINDOW);

    this.rootContainer.add([
      mainWindow,
      this.titleText,
      ...this.slotWindows,
      ...this.slotTexts,
      ...this.plusTexts,
      this.resultWindow,
      this.resultText,
      this.craftText,
      this.messageText,
      this.helpText,
    ]);

    ui.add(this.rootContainer);
  }

  show(args: any[]): boolean {
    super.show(args);

    const config = args?.[0] as CraftingUiConfig | undefined;

    this.returnMode = config?.returnMode ?? UiMode.MENU;

    this.returnArgs = config?.returnArgs;

    this.craftingLocation = config?.location ?? CraftingLocation.NORMAL;

    this.selectedIngredients = [null, null, null];

    this.cursor = 0;
    this.lastSlotCursor = 0;

    this.getUi().bringToTop(this.rootContainer);
    this.rootContainer.setVisible(true);

    this.refresh();

    return true;
  }

  clear(): void {
    super.clear();

    if (craftingManager.hasPendingCrafting()) {
      craftingManager.cancelPendingCrafting();
    }

    this.rootContainer.setVisible(false);
  }

  processInput(button: Button): boolean {
    switch (button) {
      case Button.LEFT:
        this.moveCursorLeft();
        this.getUi().playSelect();
        this.refresh();
        return true;

      case Button.RIGHT:
        this.moveCursorRight();
        this.getUi().playSelect();
        this.refresh();
        return true;

      case Button.UP:
        if (this.cursor === 3) {
          this.cursor = this.lastSlotCursor;
          this.getUi().playSelect();
          this.refresh();
        }
        return true;

      case Button.DOWN:
        if (this.cursor < 3) {
          this.lastSlotCursor = this.cursor;
          this.cursor = 3;
          this.getUi().playSelect();
          this.refresh();
        }
        return true;

      case Button.ACTION:
      case Button.SUBMIT:
        this.getUi().playSelect();

        if (this.cursor < 3) {
          this.openIngredientSelect(this.cursor);
        } else {
          this.tryCraft();
        }

        return true;

      case Button.CANCEL: {
        if (craftingManager.hasPendingCrafting()) {
          craftingManager.cancelPendingCrafting();
        }

        const returnMode = this.returnMode;
        const returnArgs = this.returnArgs;

        this.getUi().playSelect();

        if (returnArgs !== undefined) {
          void this.getUi().setMode(returnMode, returnArgs);
        } else {
          void this.getUi().setMode(returnMode);
        }

        return true;
      }

      default:
        return false;
    }
  }

  private moveCursorLeft(): void {
    if (this.cursor === 3) {
      this.cursor = 2;
      this.lastSlotCursor = 2;
      return;
    }

    this.cursor = this.cursor > 0 ? this.cursor - 1 : 2;

    this.lastSlotCursor = this.cursor;
  }

  private moveCursorRight(): void {
    if (this.cursor === 3) {
      this.cursor = 0;
      this.lastSlotCursor = 0;
      return;
    }

    this.cursor = this.cursor < 2 ? this.cursor + 1 : 0;

    this.lastSlotCursor = this.cursor;
  }

  /**
   * 재료 슬롯을 눌렀을 때 창고에 있는 제작 재료를 보여줍니다.
   */
  private openIngredientSelect(slotIndex: number): void {
    const ingredientIds = getCraftingIngredientItemIds();

    const currentItem = this.selectedIngredients[slotIndex];

    const options: Array<{
      label: string;
      handler: () => boolean;
    }> = [];

    for (const itemId of ingredientIds) {
      const owned = craftingManager.getStoredAmount(itemId);

      const usedInOtherSlots = this.selectedIngredients.reduce(
        (count, selected, index) => (index !== slotIndex && selected === itemId ? count + 1 : count),
        0,
      );

      const selectableAmount = Math.max(0, owned - usedInOtherSlots);

      /**
       * 현재 슬롯에 이미 들어 있는 재료는
       * 보유량이 전부 다른 슬롯에 잡혀 있어도 표시합니다.
       */
      if (selectableAmount <= 0 && currentItem !== itemId) {
        continue;
      }

      options.push({
        label: `${this.getItemDisplayName(itemId)} ` + `(보유 ${owned})`,

        handler: () => {
          const latestOwned = craftingManager.getStoredAmount(itemId);

          const latestUsedElsewhere = this.selectedIngredients.reduce(
            (count, selected, index) => (index !== slotIndex && selected === itemId ? count + 1 : count),
            0,
          );

          if (latestOwned <= latestUsedElsewhere) {
            this.getUi().playError();

            this.messageText.setText("해당 재료의 보유량이 부족합니다.");

            return true;
          }

          this.selectedIngredients[slotIndex] = itemId;

          this.refresh();
          return true;
        },
      });
    }

    if (currentItem) {
      options.push({
        label: "이 슬롯 비우기",
        handler: () => {
          this.selectedIngredients[slotIndex] = null;

          this.refresh();
          return true;
        },
      });
    }

    options.push({
      label: "취소",
      handler: () => true,
    });

    if (options.length === 1) {
      this.getUi().playError();

      this.messageText.setText("사용할 수 있는 제작 재료가 없습니다.");

      return;
    }

    void this.getUi().setOverlayMode(UiMode.OPTION_SELECT, {
      options,
      maxOptions: Math.min(8, options.length),
      xOffset: 8,
      yOffset: 24,
    });
  }

  /**
   * 선택된 3칸으로 현재 레시피를 판정합니다.
   */
  private getMatchedRecipe(): CraftingRecipe | undefined {
    return findCraftingRecipeByItems(this.selectedIngredients);
  }

  private refresh(): void {
    for (let i = 0; i < 3; i++) {
      const itemId = this.selectedIngredients[i];

      const name = itemId ? this.getItemDisplayName(itemId) : "비어 있음";

      const selectedMark = this.cursor === i ? "▶ " : "";

      this.slotTexts[i].setText(`${selectedMark}재료 ${i + 1}\n${name}`);
    }

    const recipe = this.getMatchedRecipe();

    if (recipe) {
      this.resultText.setText(`→ ${this.getResultDisplayName(recipe.result)}`);
    } else {
      const filledCount = this.selectedIngredients.filter(item => item !== null).length;

      this.resultText.setText(filledCount === 3 ? "→ ???" : "→ ?");
    }

    this.craftText.setText(this.cursor === 3 ? "▶ [ 제작하기 ]" : "[ 제작하기 ]");

    this.refreshMessage(recipe);
  }

  private refreshMessage(recipe: CraftingRecipe | undefined): void {
    if (!recipe) {
      const filledCount = this.selectedIngredients.filter(item => item !== null).length;

      if (filledCount === 0) {
        this.messageText.setText("3개의 슬롯에 제작 재료를 넣어주세요.");
      } else if (filledCount < 3) {
        this.messageText.setText(`${filledCount}/3 슬롯 선택됨`);
      } else {
        this.messageText.setText("알 수 없는 조합입니다.");
      }

      return;
    }

    const check = craftingManager.canCraft(recipe.id);

    if (!check.success) {
      this.messageText.setText(check.reason ?? "재료가 부족합니다.");
      return;
    }

    if (this.craftingLocation === CraftingLocation.ROGUE_WORKSHOP) {
      this.messageText.setText("제작하면 완성품이 창고로 바로 보내집니다.");
    } else {
      this.messageText.setText("제작 가능한 조합입니다.");
    }
  }

  private tryCraft(): void {
    const recipe = this.getMatchedRecipe();

    if (!recipe) {
      this.getUi().playError();

      this.messageText.setText("이 조합으로 만들 수 있는 물건이 없습니다.");

      return;
    }

    if (this.craftingLocation === CraftingLocation.ROGUE_WORKSHOP) {
      this.craftAtWorkshop(recipe);
      return;
    }

    const started = craftingManager.beginCraft(recipe.id);

    if (!started.success) {
      this.getUi().playError();

      this.messageText.setText(started.reason ?? "제작할 수 없습니다.");

      this.refresh();
      return;
    }

    this.openDestinationSelect(recipe);
  }

  /**
   * 일반 제작:
   * 인벤토리 / 창고 중 하나를 선택합니다.
   */
  private openDestinationSelect(recipe: CraftingRecipe): void {
    const resultName = this.getResultDisplayName(recipe.result);

    this.messageText.setText(`${resultName} 완성! 어디에 둘까요?`);

    void this.getUi().setOverlayMode(UiMode.OPTION_SELECT, {
      options: [
        {
          label: "인벤토리에 추가한다",
          handler: () => {
            const completed = craftingManager.completePendingCrafting(CraftingDestination.INVENTORY);

            if (!completed.success) {
              this.getUi().playError();

              this.messageText.setText(completed.reason ?? "인벤토리 지급에 실패했습니다.");

              return true;
            }

            this.messageText.setText(`${resultName}을(를) 인벤토리에 추가했습니다!`);

            this.afterCraft();
            return true;
          },
        },
        {
          label: "창고로 보낸다",
          handler: () => {
            const completed = craftingManager.completePendingCrafting(CraftingDestination.STORAGE);

            if (!completed.success) {
              this.getUi().playError();

              this.messageText.setText(completed.reason ?? "창고 전송에 실패했습니다.");

              return true;
            }

            this.messageText.setText(`${resultName}을(를) 창고로 보냈습니다!`);

            this.afterCraft();
            return true;
          },
        },
        {
          label: "취소",
          handler: () => {
            craftingManager.cancelPendingCrafting();

            this.messageText.setText("제작을 취소하고 재료를 돌려받았습니다.");

            this.refresh();
            return true;
          },
        },
      ],
      maxOptions: 3,
      xOffset: 8,
      yOffset: 24,
    });
  }

  /**
   * 로그센터 공방소:
   * 제작 즉시 창고로 지급합니다.
   */
  private craftAtWorkshop(recipe: CraftingRecipe): void {
    const result = craftingManager.craftAtRogueWorkshop(recipe.id);

    if (!result.success) {
      this.getUi().playError();

      this.messageText.setText(result.reason ?? "제작에 실패했습니다.");

      this.refresh();
      return;
    }

    this.messageText.setText(`${this.getResultDisplayName(recipe.result)}을(를) 제작해 창고로 보냈습니다!`);

    this.afterCraft();
  }

  /**
   * 1회 제작 후 슬롯은 유지합니다.
   *
   * 재료가 더 남아 있다면 같은 조합을
   * 연속해서 제작할 수 있습니다.
   * 부족해지면 refresh()에서 바로 표시됩니다.
   */
  private afterCraft(): void {
    this.refresh();
  }

  private getItemDisplayName(itemId: string): string {
    if (itemId.startsWith("APRICORN_")) {
      const value = Number(itemId.slice("APRICORN_".length));

      if (Number.isInteger(value) && ApricornType[value] != null) {
        return getApricornName(value as ApricornType);
      }
    }

    if (itemId.startsWith("BALL_")) {
      const value = Number(itemId.slice("BALL_".length));

      if (Number.isInteger(value) && PokeballType[value] != null) {
        return getPokeballName(value as PokeballType);
      }
    }

    return itemId;
  }

  private getResultDisplayName(result: CraftingResult): string {
    return `${this.getItemDisplayName(result.itemId)} ×${result.amount}`;
  }
}
