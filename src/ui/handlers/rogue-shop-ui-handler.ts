import { getGameMode } from "#app/game-mode";
import { globalScene } from "#app/global-scene";
import { getApricornName } from "#data/apricorn";
import { getBerryEffectDescription, getBerryName } from "#data/berry";
import { CraftingLocation } from "#data/crafting/crafting-manager";
import { modifierTypes } from "#data/data-lists";
import { getPokeballName } from "#data/pokeball";
import type { ApricornType } from "#enums/apricorn-type";
import { BankCurrencyType } from "#enums/bank-currency-type";
import { BerryType } from "#enums/berry-type";
import { Button } from "#enums/buttons";
import { ExchangeCurrencyType } from "#enums/exchange-currency-type";
import { GameModes } from "#enums/game-modes";
import { ModifierTier } from "#enums/modifier-tier";
import { PokeballType } from "#enums/pokeball";
import type { PokemonType } from "#enums/pokemon-type";
import type { SpeciesId } from "#enums/species-id";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { PokemonHeldItemModifier } from "#modifiers/modifier";
import type { ModifierTypeOption } from "#modifiers/modifier-type";
import { getModifierTypeById, type ModifierType, type ModifierTypeGenerator } from "#modifiers/modifier-type";
import { buildRogueShopListings } from "#modifiers/rogue-shop-utils";
import { type QuestEntry, questManager } from "#system/quest-manager";
import { VoucherType } from "#system/voucher";
import type { PracticePresetData, Starter } from "#types/save-data";
import { MessageUiHandler } from "#ui/message-ui-handler";
import { PracticePresetSlotUiMode } from "#ui/practice-preset-slot-select-ui-handler";
import { addTextObject } from "#ui/text";
import { addWindow } from "#ui/ui-theme";
import { getPokemonSpecies } from "#utils/pokemon-utils";

export type RogueShopTab = "SHOP" | "BANK" | "STORAGE" | "QUEST" | "PRACTICE" | "WORKSHOP" | "MINE";

export interface RogueShopBankData {
  roguePoints: number;
  gold: number;
  bankRoguePoints: number;
  bankGold: number;
}

export type QuestStatus = "AVAILABLE" | "ACCEPTED" | "COMPLETED" | "REPORTED";

export interface RogueShopStorageEntry {
  id: string;
  name: string;
  quantity: number;
  description: string;
  purchaseMode: "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT";
  option?: ModifierTypeOption;
}

export interface RogueShopUiArgs {
  onExit?: () => void;
  onStartRun?: () => void;

  source?: "TITLE" | "MENU" | "STARTER_SELECT";
  starters?: Starter[];

  limitedMode?: boolean;
  allowShop?: boolean;
  allowBank?: boolean;
  allowStorage?: boolean;
  allowQuest?: boolean;
  allowWorkshop?: boolean;
  allowPreRunPurchase?: boolean;
  allowRewardUse?: boolean;
  allowSendItems?: boolean;

  initialTab?: RogueShopTab;

  onPracticeStart?: () => void;

  onPracticePresetStart?: () => void;
}

type RogueBankActionEntry = {
  name: string;
  description: string;
  currency?: BankCurrencyType;
  exchangeCurrencyType?: ExchangeCurrencyType;
  mode: "DEPOSIT" | "WITHDRAW" | "EXCHANGE";
  amount?: number;
  useCustomAmount?: boolean;
};

type RogueBankCandySpeciesEntry = {
  speciesId: SpeciesId;
  name: string;
  candyCount: number;
};

type RogueWorkshopEntry = {
  recipeId: string;
  name: string;
  description: string;
};

export interface RogueShopListing {
  id: string;
  tier: ModifierTier;
  priceRp: number;
  stock: number;
  purchaseMode: "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT";
  option: ModifierTypeOption;

  specialAction?: "COUPON";
}

export class RogueShopUiHandler extends MessageUiHandler {
  private rootContainer: Phaser.GameObjects.Container;

  private titleText: Phaser.GameObjects.Text;
  private moneyWindow: Phaser.GameObjects.NineSlice;
  private mainListWindow: Phaser.GameObjects.NineSlice;
  private detailWindow: Phaser.GameObjects.NineSlice;
  private tabWindow: Phaser.GameObjects.NineSlice;
  private helpWindow: Phaser.GameObjects.NineSlice;

  private tabTexts: Phaser.GameObjects.Text[] = [];
  private tabCursorObj: Phaser.GameObjects.Image;
  private listCursorObj: Phaser.GameObjects.Image;

  private valueRoguePointText: Phaser.GameObjects.Text;
  private valueGoldText: Phaser.GameObjects.Text;

  private listTextObjects: Phaser.GameObjects.Text[] = [];
  private detailTitleText: Phaser.GameObjects.Text;
  private detailBodyText: Phaser.GameObjects.Text;
  private footerHelpText: Phaser.GameObjects.Text;

  private defaultHelpText = "";
  private noticeTimer?: Phaser.Time.TimerEvent;

  private currentTab: RogueShopTab = "SHOP";
  private tabCursor = 0;
  private listCursor = 0;
  private listScroll = 0;
  private readonly visibleRows = 8;

  private shopListings: RogueShopListing[] = [];
  private storageItems: RogueShopStorageEntry[] = [];
  private bankData: RogueShopBankData = {
    roguePoints: 0,
    gold: 5000,
    bankRoguePoints: 0,
    bankGold: 0,
  };

  private readonly visibleTabCount = 5;
  private tabScroll = 0;

  private readonly tabXPositions = [12, 70, 128, 186, 244];

  private uiArgs: RogueShopUiArgs | null = null;
  private enabledTabs: RogueShopTab[] = ["SHOP", "BANK", "STORAGE", "QUEST", "PRACTICE", "WORKSHOP", "MINE"];

  private selectingTarget = false;
  private pendingTargetListing: RogueShopListing | null = null;
  private targetCursor = 0;
  private starterIcons: Phaser.GameObjects.Sprite[] = [];
  private starterIconCursorObj: Phaser.GameObjects.Image;

  private starterPanelWindow: Phaser.GameObjects.NineSlice;
  private starterPanelTitleText: Phaser.GameObjects.Text;
  private starterIconsContainer: Phaser.GameObjects.Container;

  private selectingCandySpecies = false;
  private candySpeciesCursor = 0;
  private candySpeciesList: RogueBankCandySpeciesEntry[] = [];
  private pendingExchangeEntry: RogueBankActionEntry | null = null;
  private pendingStorageItem: RogueShopStorageEntry | null = null;

  private pendingStorageAmount = 1;
  private selectingStorageAmount = false;

  private storageApplyMode = false;

  private selectingStorageItem = false;
  private selectingStorageTarget = false;

  private storageCursor = 0;
  private storageScroll = 0;

  private starterCursor = 0;
  private selectedStorageAmount = 1;

  private selectedStorageEntry: RogueShopStorageEntry | null = null;

  private questFooterText: Phaser.GameObjects.Text;

  private pendingShopListing: RogueShopListing | null = null;
  private selectingShopDestination = false;

  private readonly workshopEntries: RogueWorkshopEntry[] = [
    {
      recipeId: "crafting_table",
      name: "제작대 사용",
      description: "3개의 재료 슬롯에 재료를 넣어 제작합니다.",
    },
  ];

  constructor() {
    super(UiMode.ROGUE_SHOP);
  }

  setup() {
    console.log("[ROGUE_SHOP] setup called");

    const ui = this.getUi();
    const sWidth = globalScene.scaledCanvas.width;
    const sHeight = globalScene.scaledCanvas.height;

    this.rootContainer = globalScene.add.container(0, -sHeight).setVisible(false);
    ui.add(this.rootContainer);

    const bg = globalScene.add.rectangle(0, 0, sWidth, sHeight, 0x103030).setOrigin(0);

    this.titleText = addTextObject(8, 6, "로그센터", TextStyle.SUMMARY);

    this.moneyWindow = addWindow(210, 4, 107, 28);
    this.moneyWindow.setInteractive(new Phaser.Geom.Rectangle(0, 0, 107, 28), Phaser.Geom.Rectangle.Contains);

    this.moneyWindow.on("pointerover", () => {
      const ownedRp = globalScene.gameData.roguePoints ?? 0;

      const bankRp = globalScene.gameData.bankRoguePoints ?? 0;

      const ownedGold = globalScene.money ?? 0;

      const bankGold = globalScene.gameData.bankMoney ?? 0;

      const tooltipText =
        "[현재 보유]\n"
        + `로그포인트: ${ownedRp.toLocaleString()} RP\n`
        + `골드: ${ownedGold.toLocaleString()} G\n\n`
        + "[은행 예치]\n"
        + `로그포인트: ${bankRp.toLocaleString()} RP\n`
        + `골드: ${bankGold.toLocaleString()} G`;

      globalScene.ui.showTooltip("로그센터 자산", tooltipText, true);
    });

    this.moneyWindow.on("pointerout", () => {
      globalScene.ui.hideTooltip();
    });
    this.tabWindow = addWindow(4, 20, 306, 18);
    this.mainListWindow = addWindow(4, 38, 140, 124);
    this.detailWindow = addWindow(146, 38, 171, 124);
    this.helpWindow = addWindow(4, 162, 313, 18);

    this.valueRoguePointText = addTextObject(216, 9, "RP: 0", TextStyle.WINDOW);

    this.valueGoldText = addTextObject(260, 9, "G: 0", TextStyle.WINDOW);
    const assetTooltipTargets = [this.moneyWindow, this.valueRoguePointText, this.valueGoldText];

    for (const target of assetTooltipTargets) {
      target.setInteractive();

      target.on("pointerover", () => {
        this.showAssetTooltip();
      });

      target.on("pointerout", () => {
        this.hideAssetTooltip();
      });
    }

    const tabLabels = ["상점", "은행", "창고", "의뢰소", "연습", "공방소", "로그광산"];

    for (let i = 0; i < this.visibleTabCount; i++) {
      const tabText = addTextObject(this.tabXPositions[i], 25, "", TextStyle.WINDOW);

      this.tabTexts.push(tabText);
    }

    this.tabCursorObj = globalScene.add.image(10, 23, "select_cursor").setOrigin(0);
    this.listCursorObj = globalScene.add.image(8, 44, "select_cursor").setOrigin(0);

    for (let i = 0; i < this.visibleRows; i++) {
      const rowText = addTextObject(16, 44 + i * 14, "", TextStyle.WINDOW);
      this.listTextObjects.push(rowText);
    }

    this.detailTitleText = addTextObject(152, 44, "", TextStyle.SUMMARY, {
      fontSize: 78,
      wordWrap: {
        width: 690,
        useAdvancedWrap: true,
      },
    });

    this.detailBodyText = addTextObject(152, 60, "", TextStyle.WINDOW, {
      fontSize: 72,
      maxLines: 6,
      wordWrap: {
        width: 690,
        useAdvancedWrap: true,
      },
    }).setInteractive(new Phaser.Geom.Rectangle(0, 0, 690, 420), Phaser.Geom.Rectangle.Contains);

    this.questFooterText = addTextObject(152, 132, "", TextStyle.WINDOW, {
      fontSize: 66,
      wordWrap: {
        width: 690,
        useAdvancedWrap: true,
      },
    }).setVisible(false);

    this.footerHelpText = addTextObject(8, 167, "←→ 탭 이동  ↑↓ 선택  Z 확인  X 취소", TextStyle.WINDOW);

    // 스타팅 패널 추가
    this.starterPanelWindow = addWindow(272, 44, 38, 104);
    this.starterPanelTitleText = addTextObject(291, 48, "스타팅", TextStyle.WINDOW).setOrigin(0.5, 0);
    this.starterIconsContainer = globalScene.add.container(0, 0);

    this.starterIcons = [];
    for (let i = 0; i < 6; i++) {
      const icon = globalScene.add
        .sprite(283, this.calcShopStarterIconY(i), "pokemon_icons_0", "unknown")
        .setScale(0.5)
        .setOrigin(0)
        .setVisible(false);

      this.starterIcons.push(icon);
      this.starterIconsContainer.add(icon);
    }

    this.starterIconCursorObj = globalScene.add
      .image(279, this.calcShopStarterIconY(0) - 1, "select_cursor_highlight")
      .setOrigin(0)
      .setVisible(false);

    this.starterIconsContainer.add(this.starterIconCursorObj);

    this.rootContainer.add([
      bg,
      this.moneyWindow,
      this.tabWindow,
      this.mainListWindow,
      this.detailWindow,
      this.helpWindow,
      this.titleText,
      this.valueRoguePointText,
      this.valueGoldText,
      ...this.tabTexts,
      this.tabCursorObj,
      this.listCursorObj,
      ...this.listTextObjects,
      this.detailTitleText,
      this.detailBodyText,
      this.footerHelpText,
      this.questFooterText,
      this.starterPanelWindow,
      this.starterPanelTitleText,
      this.starterIconsContainer,
    ]);
  }

  show(args: any[]): boolean {
    super.show(args);

    console.log("[ROGUE_SHOP] show called", args);

    this.uiArgs = args?.length > 0 ? (args[0] as RogueShopUiArgs) : null;

    console.log("[ROGUE_SHOP.show uiArgs]", {
      source: this.uiArgs?.source,
      startersLength: this.uiArgs?.starters?.length ?? 0,
    });

    this.rootContainer.setVisible(true);

    this.shopListings = buildRogueShopListings();
    console.table(
      this.shopListings
        .filter(l => l.id.startsWith("BERRY"))
        .map(l => ({
          id: l.id,
          name: this.getListingDisplayName(l),
          typeId: l.option?.type?.id,
        })),
    );

    this.shopListings.unshift({
      id: "COUPON_EXCHANGE",
      tier: ModifierTier.COMMON,
      priceRp: 0,
      stock: 1,
      purchaseMode: "INSTANT",

      // 특수 항목이라 실제 modifier는 사용하지 않음
      option: null as unknown as ModifierTypeOption,

      specialAction: "COUPON",
    });

    this.migrateLegacyBerryStorageItems();
    this.migrateBrokenGeneratedStorageItems();

    const storedItems = globalScene.gameData.getStorageItems();

    this.storageItems = this.buildStorageEntries();

    const quests = questManager.getQuests();

    const currentWave = globalScene.currentBattle?.waveIndex ?? 1;

    const currentBiomeIndex = questManager.getQuestBiomeIndex(currentWave);

    // 이전 바이옴에서 남은 미수락 의뢰 제거
    for (let i = quests.length - 1; i >= 0; i--) {
      const quest = quests[i];

      // 수락한 의뢰는 절대 유지
      if (quest.accepted) {
        continue;
      }

      // 완료 의뢰도 기존 처리 유지
      if (quest.completed) {
        continue;
      }

      // ★ 다른 바이옴 세대의 미수락 의뢰는 게시판에서 제거
      if (quest.generatedBiomeIndex === undefined || quest.generatedBiomeIndex !== currentBiomeIndex) {
        console.log("[QUEST_BOARD_REFRESH]", {
          questId: quest.id,
          oldIndex: quest.generatedBiomeIndex,
          newIndex: currentBiomeIndex,
          currentWave,
        });

        quests.splice(i, 1);
        continue;
      }

      let invalid = false;

      switch (quest.objectiveType) {
        case "CATCH_POKEMON":
          invalid = quest.targetSpeciesId === undefined || quest.targetCatchWave === undefined;
          break;

        case "FIND_ITEM":
          invalid = quest.targetItemId === undefined || quest.targetItemWave === undefined;
          break;

        case "FIND_TRAINER":
          invalid = quest.targetTrainerType === undefined || quest.targetTrainerWave === undefined;
          break;

        case "REACH_BIOME":
          invalid = quest.targetBiome === undefined;
          break;
      }

      if (invalid) {
        console.warn("[QUEST_BOARD_REMOVE_INVALID]", {
          questId: quest.id,
          objectiveType: quest.objectiveType,
        });

        quests.splice(i, 1);
      }
    }

    const canGenerateQuest = questManager.canGenerateQuestAtWave(currentWave);

    if (canGenerateQuest) {
      const testQuests = this.buildTestQuestList();

      for (const testQuest of testQuests) {
        const exists = quests.some(quest => quest.id === testQuest.id);

        if (exists) {
          continue;
        }

        questManager.setupQuest(testQuest, currentWave);

        // ★ 목표 생성에 실패한 의뢰는 게시판에 올리지 않음
        let setupSucceeded = true;

        switch (testQuest.objectiveType) {
          case "CATCH_POKEMON":
            setupSucceeded = testQuest.targetSpeciesId !== undefined && testQuest.targetCatchWave !== undefined;
            break;

          case "FIND_ITEM":
            setupSucceeded = testQuest.targetItemId !== undefined && testQuest.targetItemWave !== undefined;
            break;

          case "FIND_TRAINER":
            setupSucceeded = testQuest.targetTrainerType !== undefined && testQuest.targetTrainerWave !== undefined;
            break;

          case "REACH_BIOME":
            setupSucceeded = testQuest.targetBiome !== undefined;
            break;
        }

        if (!setupSucceeded) {
          console.warn("[QUEST_BOARD_SKIP_INVALID]", {
            questId: testQuest.id,
            objectiveType: testQuest.objectiveType,
            currentWave,
          });

          continue;
        }

        quests.push(testQuest);
      }
    }

    globalScene.gameData.saveSystem();

    const allowShop = this.uiArgs?.allowShop ?? true;
    const allowBank = this.uiArgs?.allowBank ?? true;
    const allowStorage = this.uiArgs?.allowStorage ?? true;
    const allowQuest = this.uiArgs?.allowQuest ?? true;
    const allowWorkshop = this.uiArgs?.allowWorkshop ?? true;

    const enabledTabs: RogueShopTab[] = [];

    if (allowShop) {
      enabledTabs.push("SHOP");
    }
    if (allowBank) {
      enabledTabs.push("BANK");
    }
    if (allowStorage) {
      enabledTabs.push("STORAGE");
    }
    if (allowQuest) {
      enabledTabs.push("QUEST");
    }

    enabledTabs.push("PRACTICE");

    if (allowWorkshop) {
      enabledTabs.push("WORKSHOP");
    }

    enabledTabs.push("MINE");

    this.enabledTabs = enabledTabs.length > 0 ? enabledTabs : ["PRACTICE"];

    const requestedInitialTab = this.uiArgs?.initialTab;

    const initialTabIndex = requestedInitialTab != null ? this.enabledTabs.indexOf(requestedInitialTab) : -1;

    this.tabCursor = initialTabIndex >= 0 ? initialTabIndex : 0;

    this.currentTab = this.enabledTabs[this.tabCursor];

    this.tabScroll = Phaser.Math.Clamp(
      this.tabCursor - this.visibleTabCount + 1,
      0,
      Math.max(0, this.enabledTabs.length - this.visibleTabCount),
    );

    this.listCursor = 0;
    this.listScroll = 0;

    this.selectingTarget = false;
    this.pendingTargetListing = null;
    this.targetCursor = 0;

    this.selectingCandySpecies = false;
    this.candySpeciesList = [];
    this.pendingExchangeEntry = null;

    this.syncBankDataWithGame();
    this.refreshMoneyTexts();
    this.refreshTabTexts();
    this.refreshStarterIcons();
    this.refreshTabCursor();
    this.refreshList();
    this.refreshDetail();
    this.refreshHelpText();

    this.defaultHelpText = this.footerHelpText.text;

    const hasStarters = (this.uiArgs?.starters?.length ?? 0) > 0;

    this.starterPanelWindow.setVisible(hasStarters);
    this.starterPanelTitleText.setVisible(hasStarters);
    this.starterIconsContainer.setVisible(hasStarters);

    return true;
  }

  private getButtonName(button: Button): string {
    return Button[button] ?? `UNKNOWN(${button})`;
  }

  private parseApricornTypeFromItemId(itemId: string): ApricornType | null {
    if (!itemId.startsWith("APRICORN_")) {
      return null;
    }

    const value = Number(itemId.replace("APRICORN_", ""));

    if (Number.isNaN(value)) {
      return null;
    }

    return value as ApricornType;
  }

  private showAssetTooltip(): void {
    const ownedRp = globalScene.gameData.roguePoints ?? 0;

    const bankRp = globalScene.gameData.bankRoguePoints ?? 0;

    const ownedGold = globalScene.money ?? 0;

    const bankGold = globalScene.gameData.bankMoney ?? 0;

    const tooltipText =
      "[현재 보유]\n"
      + `로그포인트: ${ownedRp.toLocaleString()} RP\n`
      + `골드: ${ownedGold.toLocaleString()} G\n\n`
      + "[은행 예치]\n"
      + `로그포인트: ${bankRp.toLocaleString()} RP\n`
      + `골드: ${bankGold.toLocaleString()} G`;

    globalScene.ui.showTooltip("로그센터 자산", tooltipText, true);
  }

  private hideAssetTooltip(): void {
    globalScene.ui.hideTooltip();
  }

  processInput(button: Button): boolean {
    console.log(
      "[ROGUE_SHOP] processInput",
      button,
      this.getButtonName(button),
      "tab=",
      this.currentTab,
      "selectingTarget=",
      this.selectingTarget,
    );

    if (this.storageApplyMode) {
      return this.processStorageApplyInput(button);
    }

    if (this.selectingShopDestination) {
      return this.processShopDestinationInput(button);
    }

    if (this.selectingTarget) {
      return this.processTargetSelectInput(button);
    }

    if (this.selectingCandySpecies) {
      return this.processCandySpeciesSelectInput(button);
    }

    let success = false;
    let playMoveSound = false;

    switch (button) {
      case Button.LEFT:
        success = this.moveTabCursor(-1);
        playMoveSound = success;
        break;

      case Button.RIGHT:
        success = this.moveTabCursor(1);
        playMoveSound = success;
        break;

      case Button.UP:
        success = this.moveListCursor(-1);
        playMoveSound = success;
        break;

      case Button.DOWN:
        success = this.moveListCursor(1);
        playMoveSound = success;
        break;

      case Button.SUBMIT:
      case Button.ACTION:
        console.log("[ROGUE_SHOP] confirm -> handleSubmit");
        success = this.handleSubmit();
        break;

      case Button.CANCEL:
        if (this.uiArgs?.source === "STARTER_SELECT") {
          console.log("[ROGUE_SHOP] cancel -> tryStartRun");
          this.tryStartRun();
        } else {
          console.log("[ROGUE_SHOP] cancel -> tryExit");
          this.tryExit();
        }
        return true;
    }

    if (playMoveSound) {
      this.getUi().playSelect();
    }

    if (success) {
      this.refreshMoneyTexts();
      this.refreshTabTexts();
      this.refreshStarterIcons();
      this.refreshTabCursor();
      this.refreshList();
      this.refreshDetail();
      this.refreshHelpText();
    }

    return success;
  }

  private getStorageItemIdFromListing(listing: RogueShopListing): string {
    const type = listing.option?.type as any;
    const id = type?.id ?? listing.id;

    // 생성형 타입은 type.id가 이미 ATTACK_TYPE_BOOSTER_1 형태로 완성되어 있음
    if (
      id.startsWith("ATTACK_TYPE_BOOSTER_")
      || id.startsWith("TYPE_SPECIFIC_MOVE_BOOSTER_")
      || id.startsWith("BERRY_")
      || id.startsWith("modifierType:SpeciesBoosterItem.")
    ) {
      return id;
    }

    const args = type?.getPregenArgs?.();
    if (id && Array.isArray(args) && args.length > 0) {
      return `${id}_${args.join("_")}`;
    }

    return id;
  }

  private buildTestQuestList(): QuestEntry[] {
    return [
      {
        id: "quest_001",
        category: "REQUEST",
        objectiveType: "CATCH_POKEMON",

        title: "포켓몬 포획 의뢰",
        description: "포획할 포켓몬을 확인해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_002",
        category: "REQUEST",
        objectiveType: "FIND_ITEM",

        title: "아이템을 찾아주세요!",
        description: "아이템을 1개 찾아주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_003",
        category: "REQUEST",
        objectiveType: "REACH_BIOME",

        title: "지역 탐사 의뢰",
        description: "탐사할 지역을 확인해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_004",
        category: "REQUEST",
        objectiveType: "FIND_TRAINER",

        title: "실종된 트레이너를 찾아주세요!",
        description: "실종된 트레이너를 찾아 구조해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_005",
        category: "REQUEST",
        objectiveType: "CATCH_POKEMON",

        title: "포켓몬 포획 의뢰 2",
        description: "지정된 포켓몬을 포획해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_006",
        category: "REQUEST",
        objectiveType: "FIND_ITEM",

        title: "아이템 수색 의뢰 2",
        description: "지정된 아이템을 찾아주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_007",
        category: "REQUEST",
        objectiveType: "REACH_BIOME",

        title: "지역 탐사 의뢰 2",
        description: "지정된 지역을 탐사해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_008",
        category: "REQUEST",
        objectiveType: "FIND_TRAINER",

        title: "트레이너 구조 의뢰 2",
        description: "실종된 트레이너를 찾아 구조해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_009",
        category: "REQUEST",
        objectiveType: "CATCH_POKEMON",

        title: "포켓몬 포획 의뢰 3",
        description: "지정된 포켓몬을 포획해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_010",
        category: "REQUEST",
        objectiveType: "FIND_ITEM",

        title: "아이템 수색 의뢰 3",
        description: "지정된 아이템을 찾아주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },
    ];
  }

  private resolveGeneratedStorageModifierType(itemId: string): ModifierType | null {
    const attackMatch = itemId.match(/^ATTACK_TYPE_BOOSTER_(\d+)(?:_\d+)?$/);
    if (attackMatch) {
      const moveType = Number(attackMatch[1]) as PokemonType;
      const gen = modifierTypes
        .ATTACK_TYPE_BOOSTER()
        .withIdFromFunc(modifierTypes.ATTACK_TYPE_BOOSTER) as ModifierTypeGenerator;
      return gen.generateType([], [moveType]) as ModifierType;
    }

    const gemMatch = itemId.match(/^TYPE_SPECIFIC_MOVE_BOOSTER_(\d+)(?:_\d+)?$/);
    if (gemMatch) {
      const moveType = Number(gemMatch[1]) as PokemonType;
      const gen = modifierTypes
        .TYPE_SPECIFIC_MOVE_BOOSTER()
        .withIdFromFunc(modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER) as ModifierTypeGenerator;
      return gen.generateType([], [moveType]) as ModifierType;
    }

    const speciesMatch = itemId.match(/^modifierType:SpeciesBoosterItem\.(.+)$/);
    if (speciesMatch) {
      const key = speciesMatch[1];
      const rareGen = modifierTypes
        .RARE_SPECIES_STAT_BOOSTER()
        .withIdFromFunc(modifierTypes.RARE_SPECIES_STAT_BOOSTER) as ModifierTypeGenerator;
      const normalGen = modifierTypes
        .SPECIES_STAT_BOOSTER()
        .withIdFromFunc(modifierTypes.SPECIES_STAT_BOOSTER) as ModifierTypeGenerator;

      return (
        (rareGen.generateType([], [key]) as ModifierType) ?? (normalGen.generateType([], [key]) as ModifierType) ?? null
      );
    }

    return null;
  }

  private processStorageApplyInput(button: Button): boolean {
    const storageList = this.getStorageList();
    const starterList = this.uiArgs?.starters ?? [];

    switch (button) {
      case Button.UP:
        if (this.selectingStorageItem) {
          if (this.storageCursor > 0) {
            this.storageCursor--;
            if (this.storageCursor < this.storageScroll) {
              this.storageScroll = this.storageCursor;
            }
            this.refreshStorageApplyUi();
            this.getUi().playSelect();
          }
          return true;
        }

        if (this.selectingStorageAmount) {
          if (this.selectedStorageEntry) {
            this.selectedStorageAmount = Math.min(this.selectedStorageEntry.quantity, this.selectedStorageAmount + 1);
            this.refreshStorageApplyUi();
            this.getUi().playSelect();
          }
          return true;
        }

        if (this.selectingStorageTarget) {
          if (this.starterCursor > 0) {
            this.starterCursor--;
            this.refreshStorageApplyUi();
            this.refreshStarterIcons();
            this.getUi().playSelect();
          }
          return true;
        }
        return true;

      case Button.DOWN:
        if (this.selectingStorageItem) {
          if (this.storageCursor < storageList.length - 1) {
            this.storageCursor++;
            const maxVisible = this.visibleRows ?? 8;
            if (this.storageCursor >= this.storageScroll + maxVisible) {
              this.storageScroll = this.storageCursor - maxVisible + 1;
            }
            this.refreshStorageApplyUi();
            this.getUi().playSelect();
          }
          return true;
        }

        if (this.selectingStorageAmount) {
          if (this.selectedStorageEntry) {
            this.selectedStorageAmount = Math.max(1, this.selectedStorageAmount - 1);
            this.refreshStorageApplyUi();
            this.getUi().playSelect();
          }
          return true;
        }

        if (this.selectingStorageTarget) {
          if (this.starterCursor < starterList.length - 1) {
            this.starterCursor++;
            this.refreshStorageApplyUi();
            this.refreshStarterIcons();
            this.getUi().playSelect();
          }
          return true;
        }
        return true;

      case Button.ACTION:
      case Button.SUBMIT:
        if (this.selectingStorageItem) {
          return this.handleStorageItemConfirm();
        }

        if (this.selectingStorageAmount) {
          return this.handleStorageAmountConfirm();
        }

        if (this.selectingStorageTarget) {
          return this.handleStorageTargetConfirm();
        }

        return true;

      case Button.CANCEL:
        return this.handleStorageApplyCancel();
    }

    return false;
  }

  private confirmShopDestinationSelection(): boolean {
    const listing = this.pendingShopListing;
    if (!listing) {
      return false;
    }

    const action = this.shopDestinationCursor;

    // 2 = 취소
    if (action === 2) {
      this.selectingShopDestination = false;
      this.pendingShopListing = null;
      this.shopDestinationCursor = 0;
      this.refreshDetail();
      this.refreshHelpText();
      this.setNotice("구매를 취소했습니다.");
      this.getUi().playSelect();
      return true;
    }

    // 1 = 창고 보관
    if (action === 1) {
      return this.purchaseListingToStorage(listing);
    }

    // 0 = 바로 적용 / 즉시 반영
    if (listing.purchaseMode === "TRAINER_LOADOUT") {
      return this.purchaseTrainerLoadoutDirectly(listing);
    }

    if (listing.purchaseMode === "SELECT_POKEMON") {
      const hasStarters = (this.uiArgs?.starters?.length ?? 0) > 0;
      if (!hasStarters) {
        this.setNotice("적용할 스타팅이 없습니다.");
        this.getUi().playError();
        return true;
      }

      this.selectingShopDestination = false;
      this.pendingTargetListing = listing;
      this.pendingShopListing = null;
      this.selectingTarget = true;
      this.targetCursor = 0;
      this.shopDestinationCursor = 0;

      this.refreshStarterIcons();
      this.refreshDetail();
      this.refreshHelpText();
      this.setNotice("적용할 스타팅을 선택하세요.");
      this.getUi().playSelect();
      return true;
    }

    // INSTANT
    return this.purchaseInstantListing(listing);
  }

  private shopDestinationCursor = 0; // 0: 바로 적용/즉시 반영, 1: 창고 보관, 2: 취소

  private addVoucherCount(voucherType: VoucherType, amount = 1): void {
    globalScene.gameData.voucherCounts ??= {
      [VoucherType.REGULAR]: 0,
      [VoucherType.PLUS]: 0,
      [VoucherType.PREMIUM]: 0,
      [VoucherType.GOLDEN]: 0,
    };

    globalScene.gameData.voucherCounts[voucherType] = (globalScene.gameData.voucherCounts[voucherType] ?? 0) + amount;

    globalScene.gameData.saveSystem();
  }

  private processShopDestinationInput(button: Button): boolean {
    const listing = this.pendingShopListing;
    if (!listing) {
      this.selectingShopDestination = false;
      return false;
    }

    switch (button) {
      case Button.UP:
      case Button.LEFT:
        this.shopDestinationCursor = this.shopDestinationCursor > 0 ? this.shopDestinationCursor - 1 : 2;
        this.refreshDetail();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.DOWN:
      case Button.RIGHT:
        this.shopDestinationCursor = this.shopDestinationCursor < 2 ? this.shopDestinationCursor + 1 : 0;
        this.refreshDetail();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.ACTION:
      case Button.SUBMIT:
        return this.confirmShopDestinationSelection();

      case Button.CANCEL:
        this.selectingShopDestination = false;
        this.pendingShopListing = null;
        this.shopDestinationCursor = 0;
        this.refreshDetail();
        this.refreshHelpText();
        this.setNotice("구매를 취소했습니다.");
        this.getUi().playSelect();
        return true;
    }

    return false;
  }

  private handleStorageItemConfirm(): boolean {
    const entry = this.storageItems[this.storageCursor];
    if (!entry) {
      this.getUi().playError();
      return true;
    }

    if (
      entry.id === "VOUCHER_GOLD"
      || entry.id === "VOUCHER_GOLDEN"
      || entry.id === "EGG_VOUCHER_GOLD"
      || entry.id === "EGG_VOUCHER_GOLDEN"
    ) {
      this.addVoucherCount(VoucherType.GOLDEN, entry.quantity);
      globalScene.gameData.removeFromStorage(entry.id, entry.quantity);

      this.storageItems = this.buildStorageEntries();
      this.refreshList();
      this.refreshDetail();
      this.refreshMoneyTexts();
      globalScene.gameData.saveSystem();

      this.setNotice(`알바우처골드 x${entry.quantity} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (entry.id === "VOUCHER" || entry.id === "VOUCHER_REGULAR" || entry.id === "EGG_VOUCHER") {
      this.addVoucherCount(VoucherType.REGULAR, entry.quantity);
      globalScene.gameData.removeFromStorage(entry.id, entry.quantity);

      this.storageItems = this.buildStorageEntries();
      this.refreshList();
      this.refreshDetail();
      this.refreshMoneyTexts();
      globalScene.gameData.saveSystem();

      this.setNotice(`알바우처 x${entry.quantity} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (entry.id === "VOUCHER_PLUS" || entry.id === "EGG_VOUCHER_PLUS") {
      this.addVoucherCount(VoucherType.PLUS, entry.quantity);
      globalScene.gameData.removeFromStorage(entry.id, entry.quantity);

      this.storageItems = this.buildStorageEntries();
      this.refreshList();
      this.refreshDetail();
      this.refreshMoneyTexts();
      globalScene.gameData.saveSystem();

      this.setNotice(`알바우처플러스 x${entry.quantity} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (entry.id === "VOUCHER_PREMIUM" || entry.id === "EGG_VOUCHER_PREMIUM") {
      this.addVoucherCount(VoucherType.PREMIUM, entry.quantity);
      globalScene.gameData.removeFromStorage(entry.id, entry.quantity);

      this.storageItems = this.buildStorageEntries();
      this.refreshList();
      this.refreshDetail();
      this.refreshMoneyTexts();
      globalScene.gameData.saveSystem();

      this.setNotice(`알바우처프리미엄 x${entry.quantity} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    // 이하 기존 코드 유지
    this.selectedStorageEntry = entry;
    this.selectedStorageAmount = 1;

    this.selectingStorageItem = false;
    this.selectingStorageAmount = true;
    this.selectingStorageTarget = false;

    this.refreshStorageApplyUi();
    this.setNotice("수량을 선택하세요.");
    this.getUi().playSelect();
    return true;
  }

  private handleStorageAmountConfirm(): boolean {
    if (!this.selectedStorageEntry) {
      this.getUi().playError();
      return true;
    }

    this.selectedStorageAmount = Phaser.Math.Clamp(this.selectedStorageAmount, 1, this.selectedStorageEntry.quantity);

    // 몬스터볼 같은 즉시 사용형
    if (this.selectedStorageEntry.purchaseMode === "INSTANT") {
      return this.handleStorageInstantDirectly();
    }

    // 트레이너 장비
    if (this.selectedStorageEntry.purchaseMode === "TRAINER_LOADOUT") {
      return this.handleStorageTrainerLoadoutDirectly();
    }

    // 포켓몬 지급형
    this.selectingStorageItem = false;
    this.selectingStorageAmount = false;
    this.selectingStorageTarget = true;
    this.starterCursor = 0;

    this.refreshStorageApplyUi();
    this.setNotice("적용할 스타팅을 선택하세요.");
    this.getUi().playSelect();

    return true;
  }

  private handleStorageInstantDirectly(): boolean {
    const entry = this.selectedStorageEntry;
    if (!entry) {
      this.getUi().playError();
      return true;
    }

    const amount = this.selectedStorageAmount;

    const ballType = this.parsePokeballTypeFromStorageId(entry.id);

    if (ballType !== null) {
      // 먼저 창고에서 선택한 만큼 제거
      if (!globalScene.gameData.removeFromStorage(entry.id, amount)) {
        this.setNotice("창고에서 몬스터볼을 꺼낼 수 없습니다.");
        this.getUi().playError();
        return true;
      }

      if (this.uiArgs?.source === "MENU") {
        // 진행 중인 런의 로그센터에서 꺼낸 경우:
        // 현재 런에 즉시 지급
        globalScene.pokeballCounts[ballType] = (globalScene.pokeballCounts[ballType] ?? 0) + amount;

        console.log("[ROGUE_SHOP_POKEBALL_APPLIED]", {
          itemId: entry.id,
          ballType,
          amount,
          total: globalScene.pokeballCounts[ballType],
        });
      } else {
        // 스타팅 선택 화면 등에서 꺼낸 경우:
        // 다음 런 시작 시 지급하도록 예약
        globalScene.gameData.pendingRunItems ??= [];

        for (let i = 0; i < amount; i++) {
          globalScene.gameData.pendingRunItems.push(entry.id);
        }

        console.log("[ROGUE_SHOP_POKEBALL_PENDING]", {
          itemId: entry.id,
          ballType,
          amount,
        });
      }

      this.storageItems = this.buildStorageEntries();

      this.selectedStorageEntry = null;
      this.selectedStorageAmount = 1;
      this.selectingStorageItem = true;
      this.selectingStorageAmount = false;
      this.selectingStorageTarget = false;

      globalScene.gameData.saveSystem();

      this.refreshStorageApplyUi();
      this.refreshList();
      this.refreshDetail();

      this.setNotice(
        this.uiArgs?.source === "MENU"
          ? `${entry.name} x${amount} 꺼내기 완료`
          : `${entry.name} x${amount} 다음 모험에 등록 완료`,
      );

      this.getUi().playSelect();
      return true;
    }

    return true;
  }

  private getPokeballTypeFromShopId(id: string): PokeballType | null {
    switch (id) {
      case "POKEBALL":
        return PokeballType.POKEBALL;
      case "GREAT_BALL":
        return PokeballType.GREAT_BALL;
      case "ULTRA_BALL":
        return PokeballType.ULTRA_BALL;
      case "ROGUE_BALL":
        return PokeballType.ROGUE_BALL;
      case "MASTER_BALL":
        return PokeballType.MASTER_BALL;
      case "QUICK_BALL":
        return PokeballType.QUICK_BALL;
      default:
        return null;
    }
  }

  private handleStorageTrainerLoadoutDirectly(): boolean {
    const entry = this.selectedStorageEntry;
    if (!entry) {
      this.getUi().playError();
      return true;
    }

    const amount = this.selectedStorageAmount;

    const modifierType = this.resolveModifierTypeFromStorageItemId(entry.id);
    if (!modifierType) {
      this.setNotice("도구 정보를 찾을 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    const maxStackCount = this.getTrainerItemMaxStackCount(modifierType);

    if (this.uiArgs?.source === "MENU") {
      const ownedCount = this.getOwnedTrainerItemCount(entry.id);

      if (ownedCount + amount > maxStackCount) {
        this.setNotice(`${entry.name}은(는) 최대 ${maxStackCount}개까지 보유할 수 있습니다.`);
        this.getUi().playError();
        return true;
      }

      let applied = 0;

      for (let i = 0; i < amount; i++) {
        const modifier = modifierType.newModifier();

        if (!modifier || !globalScene.addModifier(modifier, false, false)) {
          break;
        }

        applied++;
      }

      if (applied !== amount) {
        this.setNotice("트레이너 도구를 지급할 수 없습니다.");
        this.getUi().playError();
        return true;
      }

      globalScene.updateModifiers?.(true);
    } else {
      const added = this.addPendingRunItems(entry.id, amount, maxStackCount);

      if (!added) {
        this.setNotice(`${entry.name}은(는) 최대 ${maxStackCount}개까지만 예약할 수 있습니다.`);
        this.getUi().playError();
        return true;
      }
    }

    const moved = globalScene.gameData.moveStorageItemToRun(entry.id, amount);
    if (!moved) {
      this.setNotice("창고에서 아이템을 꺼낼 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    this.storageItems = this.buildStorageEntries();
    this.selectedStorageEntry = null;
    this.selectedStorageAmount = 1;
    this.selectingStorageItem = true;
    this.selectingStorageAmount = false;
    this.selectingStorageTarget = false;

    this.refreshStorageApplyUi();
    this.refreshStarterIcons();
    globalScene.gameData.saveSystem();

    this.setNotice(`${entry.name} x${amount} 즉시 반영 완료`);
    this.getUi().playSelect();
    return true;
  }

  private handleStorageTargetConfirm(): boolean {
    const entry = this.selectedStorageEntry;
    if (!entry) {
      this.getUi().playError();
      return true;
    }

    const starters = this.uiArgs?.starters ?? [];
    const starter = starters[this.starterCursor];

    if (!starter) {
      this.setNotice("스타팅이 없습니다.");
      this.getUi().playError();
      return true;
    }

    const amount = this.selectedStorageAmount;
    const itemName = entry.name;
    const starterName = getPokemonSpecies(starter.speciesId).name;

    // 1) 트레이너 아이템이면 포켓몬 선택 자체를 막고 바로 트레이너 지급/런 지급
    if (entry.purchaseMode === "TRAINER_LOADOUT") {
      const modifierType = this.resolveModifierTypeFromStorageItemId(entry.id);

      if (amount > 1) {
        this.setNotice("이 도구는 1개만 꺼낼 수 있습니다.");
        this.getUi().playError();
        return true;
      }

      const moved = globalScene.gameData.moveStorageItemToRun(entry.id, 1);
      if (!moved) {
        this.setNotice("창고에서 아이템을 꺼낼 수 없습니다.");
        this.getUi().playError();
        return true;
      }

      if (this.uiArgs?.source === "MENU") {
        if (!modifierType) {
          this.setNotice("도구 정보를 찾을 수 없습니다.");
          this.getUi().playError();
          return true;
        }

        const alreadyOwned = globalScene.findModifier(m => {
          const mid = (m as any)?.type?.id;
          return mid === entry.id;
        });

        if (alreadyOwned) {
          this.setNotice("이미 보유 중인 트레이너 도구입니다.");
          this.getUi().playError();
          return true;
        }

        const modifier = modifierType.newModifier();
        if (!modifier || !globalScene.addModifier(modifier, false, false)) {
          this.setNotice("트레이너 도구를 지급할 수 없습니다.");
          this.getUi().playError();
          return true;
        }
      } else {
        const added = this.addPendingRunItemOnce(entry.id);
        if (!added) {
          this.setNotice("이미 예약된 트레이너 도구입니다.");
          this.getUi().playError();
          return true;
        }
      }

      this.storageItems = this.buildStorageEntries();

      this.selectedStorageEntry = null;
      this.selectedStorageAmount = 1;
      this.selectingStorageItem = true;
      this.selectingStorageAmount = false;
      this.selectingStorageTarget = false;

      this.refreshStorageApplyUi();
      this.refreshStarterIcons();
      globalScene.updateModifiers?.(true);
      globalScene.gameData.saveSystem();

      this.setNotice(`${itemName} 지급 완료`);
      this.getUi().playSelect();
      return true;
    }

    // 2) 포켓몬 지급형만 기존 로직 유지
    if (entry.purchaseMode === "SELECT_POKEMON" && this.uiArgs?.source === "MENU") {
      const availableCapacity = this.getAvailableHeldItemCapacity(starter, entry);

      if (availableCapacity <= 0) {
        this.setNotice(`${starterName}은(는) 이미 ${itemName} 최대치입니다.`);
        this.getUi().playError();
        return true;
      }

      if (amount > availableCapacity) {
        this.setNotice(`${starterName}은(는) ${itemName}을(를) ${availableCapacity}개까지만 더 지닐 수 있습니다.`);
        this.getUi().playError();
        return true;
      }
    }

    let applied = false;

    if (this.uiArgs?.source === "MENU") {
      applied = this.applyStorageItemImmediatelyToPartyPokemon(starter, entry, amount);
    } else {
      (starter as any).preRunItems ??= [];
      for (let i = 0; i < amount; i++) {
        (starter as any).preRunItems.push(entry.id);
      }
      applied = true;
    }

    if (!applied) {
      this.setNotice("아이템을 적용할 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    const moved = globalScene.gameData.moveStorageItemToRun(entry.id, amount);
    if (!moved) {
      this.setNotice("창고에서 아이템을 꺼낼 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    this.storageItems = this.buildStorageEntries();

    this.setNotice(`${itemName} x${amount} → ${starterName} 적용 완료`);

    this.selectedStorageEntry = null;
    this.selectedStorageAmount = 1;
    this.selectingStorageItem = true;
    this.selectingStorageAmount = false;
    this.selectingStorageTarget = false;

    this.refreshStorageApplyUi();
    this.refreshStarterIcons();
    globalScene.updateModifiers?.(true);
    globalScene.gameData.saveSystem();
    this.getUi().playSelect();
    return true;
  }

  private applyStorageItemImmediatelyToPartyPokemon(
    starter: Starter,
    entry: RogueShopStorageEntry,
    amount: number,
  ): boolean {
    const party = globalScene.getPlayerParty();

    const targetPokemon = party.find(p => p.species.speciesId === starter.speciesId);
    if (!targetPokemon) {
      console.warn("[ROGUE_SHOP] target pokemon not found", starter);
      return false;
    }

    const modifierType = this.resolveModifierTypeFromStorageItemId(entry.id);
    if (!modifierType) {
      console.warn("[ROGUE_SHOP] modifierType not found by id", entry.id);
      return false;
    }

    console.log("[ROGUE_SHOP] immediate apply type check", {
      itemId: entry.id,
      purchaseMode: entry.purchaseMode,
      modifierTypeName: modifierType?.name,
      ctor: modifierType?.constructor?.name,
    });

    let applied = 0;

    for (let i = 0; i < amount; i++) {
      const modifier = modifierType.newModifier(targetPokemon);

      if (!modifier) {
        console.warn("[ROGUE_SHOP] failed to create modifier for", entry.id);
        break;
      }

      const result = globalScene.addModifier(modifier, false, false);
      if (!result) {
        console.warn("[ROGUE_SHOP] addModifier failed for", entry.id);
        break;
      }

      applied++;
    }

    if (applied > 0) {
      globalScene.updateModifiers?.(true);
    }

    return applied === amount;
  }

  private getAvailableHeldItemCapacity(starter: Starter, entry: RogueShopStorageEntry): number {
    if (entry.id === "BERRY") {
      console.warn("[ROGUE_SHOP] legacy BERRY entry detected, skipping capacity check", entry);
      return 99;
    }

    const targetPokemon = globalScene.getPlayerParty().find(p => p.species.speciesId === starter.speciesId);

    if (!targetPokemon) {
      console.warn("[ROGUE_SHOP] target pokemon not found for capacity check", {
        starterSpeciesId: starter.speciesId,
        itemId: entry.id,
      });
      return 0;
    }

    const modifierType = this.resolveModifierTypeFromStorageItemId(entry.id);
    if (!modifierType) {
      console.warn("[ROGUE_SHOP] modifierType not found for capacity check", entry.id);
      return 0;
    }

    const dummyModifier = modifierType.newModifier(targetPokemon);
    if (!dummyModifier) {
      console.warn("[ROGUE_SHOP] failed to create dummy modifier for capacity check", entry.id);
      return 0;
    }

    const matchingModifier = globalScene.findModifier(
      m => m instanceof PokemonHeldItemModifier && m.pokemonId === targetPokemon.id && m.matchType(dummyModifier),
    ) as PokemonHeldItemModifier | undefined;

    const maxStackCount =
      typeof (dummyModifier as any).getMaxStackCount === "function" ? (dummyModifier as any).getMaxStackCount() : 0;

    if (!maxStackCount) {
      return 0;
    }

    const currentStack = matchingModifier?.stackCount ?? 0;
    return Math.max(0, maxStackCount - currentStack);
  }

  private migrateLegacyBerryStorageItems(): void {
    const storedItems = globalScene.gameData.getStorageItems();
    let changed = false;

    for (const item of storedItems) {
      if (item.itemId === "BERRY") {
        item.itemId = `BERRY_${BerryType.SITRUS}`;
        changed = true;
      }
    }

    if (changed) {
      globalScene.gameData.saveSystem();
      console.log("[ROGUE_SHOP] migrated legacy BERRY storage items");
    }
  }

  private migrateBrokenGeneratedStorageItems(): void {
    const storedItems = globalScene.gameData.getStorageItems();
    let changed = false;

    const brokenIds = ["TYPE_SPECIFIC_MOVE_BOOSTER", "ATTACK_TYPE_BOOSTER"];

    for (const brokenId of brokenIds) {
      const item = storedItems.find(i => i.itemId === brokenId);
      if (!item) {
        continue;
      }

      globalScene.gameData.removeFromStorage(brokenId, item.quantity);
      changed = true;
    }

    if (changed) {
      globalScene.gameData.saveSystem();
      console.log("[ROGUE_SHOP] removed broken generated storage items");
    }
  }

  private applyStorageItemImmediately(starter: Starter, itemId: string): void {
    const party = globalScene.getPlayerParty();

    const targetPokemon = party.find(p => p.species.speciesId === starter.speciesId);

    if (!targetPokemon) {
      return;
    }

    const modifierType = modifierTypes[itemId];
    if (!modifierType) {
      return;
    }

    globalScene.addModifier(modifierType, false, targetPokemon, 1);
  }

  private handleStorageApplyCancel(): boolean {
    if (this.selectingStorageTarget) {
      this.selectingStorageTarget = false;
      this.selectingStorageAmount = true;
      this.refreshStorageApplyUi();
      this.setNotice("수량 선택으로 돌아갑니다.");
      this.getUi().playSelect();
      return true;
    }

    if (this.selectingStorageAmount) {
      this.selectingStorageAmount = false;
      this.selectingStorageItem = true;
      this.selectedStorageAmount = 1;
      this.selectedStorageEntry = null;
      this.refreshStorageApplyUi();
      this.setNotice("아이템 선택으로 돌아갑니다.");
      this.getUi().playSelect();
      return true;
    }

    if (this.selectingStorageItem) {
      this.closeStorageApplyMode();
      this.getUi().playSelect();
      return true;
    }

    return true;
  }

  private applyPreRunItemOption(entry: RogueShopStorageEntry, amount: number): boolean {
    const moved = globalScene.gameData.moveStorageItemToRun(entry.id, amount);
    if (!moved) {
      return false;
    }

    globalScene.gameData.pendingRunItems ??= [];
    for (let i = 0; i < amount; i++) {
      globalScene.gameData.pendingRunItems.push(entry.id);
    }

    return true;
  }

  private consumeStorageItem(entry: RogueShopStorageEntry, amount: number): void {
    const storageList = this.getStorageList();
    const idx = storageList.indexOf(entry);

    if (idx < 0) {
      return;
    }

    storageList[idx].quantity = Math.max(0, storageList[idx].quantity - amount);

    if (storageList[idx].quantity <= 0) {
      storageList.splice(idx, 1);

      if (this.storageCursor >= storageList.length) {
        this.storageCursor = Math.max(0, storageList.length - 1);
      }
      if (this.storageScroll > this.storageCursor) {
        this.storageScroll = this.storageCursor;
      }
    }
  }

  private refreshStorageApplyUi(): void {
    const storageList = this.getStorageList();
    const selectedEntry = storageList[this.storageCursor] ?? null;

    for (let i = 0; i < this.visibleRows; i++) {
      const index = this.storageScroll + i;
      const row = storageList[index];
      const textObj = this.listTextObjects[i];

      if (!textObj) {
        continue;
      }

      if (!row) {
        textObj.setText("");
        textObj.setAlpha(0);
        continue;
      }

      const cursor = index === this.storageCursor && this.selectingStorageItem ? "▶ " : "  ";
      textObj.setText(`${cursor}${row.name} x${row.quantity}`);
      textObj.setAlpha(1);
    }

    this.detailTitleText.setText(selectedEntry?.name ?? "창고");

    const starters = this.uiArgs?.starters ?? [];

    const starterLines = starters
      .map((starter, i) => {
        const cursor = this.selectingStorageTarget && i === this.starterCursor ? "▶ " : "  ";
        const starterName = getPokemonSpecies(starter.speciesId).name;
        const itemCount = (starter as any).preRunItems?.length ?? 0;
        return `${cursor}${starterName} (${itemCount})`;
      })
      .join("\n");

    const stepText = this.selectingStorageItem
      ? "아이템 선택 중"
      : this.selectingStorageAmount
        ? "수량 선택 중"
        : this.selectingStorageTarget
          ? "대상 스타팅 선택 중"
          : "";

    const amountText = this.selectedStorageEntry ? `선택 수량: ${this.selectedStorageAmount}` : "";

    this.detailBodyText.setText(`${stepText}\n\n${amountText}\n\n[스타팅]\n${starterLines}`);
  }

  private getStorageList(): RogueShopStorageEntry[] {
    return this.storageItems;
  }

  private requiresPokemonTarget(entry: RogueShopStorageEntry): boolean {
    return entry.purchaseMode === "SELECT_POKEMON";
  }

  private applyStorageItemToStarter(entry: RogueShopStorageEntry, starter: Starter, amount: number): number {
    const moved = globalScene.gameData.moveStorageItemToRun(entry.id, amount);
    if (!moved) {
      return 0;
    }

    (starter as any).preRunItems ??= [];
    for (let i = 0; i < amount; i++) {
      (starter as any).preRunItems.push(entry.id);
    }

    return amount;
  }

  private refreshStarterPanelSafe(): void {
    try {
      if ((this as any).refreshStarterPanel) {
        (this as any).refreshStarterPanel();
      }
    } catch (e) {
      console.warn("[ROGUE_SHOP] refreshStarterPanelSafe failed", e);
    }
  }

  private saveRogueDataSafe(): void {
    try {
      if (globalScene?.gameData?.saveSystem) {
        globalScene.gameData.saveSystem();
      }
    } catch (e) {
      console.warn("[ROGUE_SHOP] saveRogueDataSafe failed", e);
    }
  }

  private onStorageButtonPressed(): void {
    this.openStorageApplyMode();
  }

  private getCandySpeciesList(): RogueBankCandySpeciesEntry[] {
    const result: RogueBankCandySpeciesEntry[] = [];
    const starterData = globalScene.gameData.starterData ?? {};

    for (const speciesIdStr of Object.keys(starterData)) {
      const speciesId = Number(speciesIdStr) as SpeciesId;
      const candyCount = starterData[speciesId]?.candyCount ?? 0;

      if (candyCount >= 10) {
        result.push({
          speciesId,
          name: getPokemonSpecies(speciesId).name,
          candyCount,
        });
      }
    }

    result.sort((a, b) => b.candyCount - a.candyCount);
    return result;
  }

  private isPokemonTargetStorageItem(itemId: string): boolean {
    const modifierType = this.resolveGeneratedStorageModifierType(itemId) ?? getModifierTypeById(itemId);
    if (!modifierType) {
      return false;
    }

    const party = globalScene.getPlayerParty();
    const samplePokemon = party[0];

    if (!samplePokemon) {
      return false;
    }

    try {
      const modifier = modifierType.newModifier(samplePokemon);
      return !!modifier && modifier instanceof PokemonHeldItemModifier;
    } catch (e) {
      console.warn("[ROGUE_SHOP] isPokemonTargetStorageItem failed", { itemId, e });
      return false;
    }
  }

  private parsePokeballTypeFromStorageId(itemId: string): PokeballType | null {
    if (!itemId.startsWith("BALL_")) {
      return null;
    }

    const value = Number(itemId.substring(5));

    if (Number.isNaN(value)) {
      return null;
    }

    return value as PokeballType;
  }

  private buildStorageEntries(): RogueShopStorageEntry[] {
    const storedItems = globalScene.gameData.getStorageItems();

    console.log("[ROGUE_SHOP] raw storageItems", storedItems);

    return storedItems.map(item => {
      console.log("[ROGUE_SHOP] storage entry raw", item);

      const display = this.getStorageDisplayMeta(item.itemId);

      let purchaseMode: "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT" = (item as any).purchaseMode ?? "INSTANT";

      if (!(item as any).purchaseMode) {
        if (item.itemId.startsWith("BERRY_") || item.itemId === "BERRY") {
          purchaseMode = "SELECT_POKEMON";
        } else {
          const modifierType =
            this.resolveGeneratedStorageModifierType(item.itemId) ?? getModifierTypeById(item.itemId);

          if (modifierType && typeof (modifierType as any).getRogueShopPurchaseMode === "function") {
            purchaseMode = (modifierType as any).getRogueShopPurchaseMode();
          } else if (this.isPokemonTargetStorageItem(item.itemId)) {
            purchaseMode = "SELECT_POKEMON";
          }
        }
      }

      return {
        id: item.itemId,
        name: display.name,
        quantity: item.quantity,
        description: display.description,
        purchaseMode,
        option: undefined,
      };
    });
  }

  private getListingDisplayName(listing: RogueShopListing): string {
    return typeof (listing.option?.type as any)?.getSafeName === "function"
      ? (listing.option!.type as any).getSafeName()
      : (listing.option?.type?.name ?? listing.id ?? "이름없음");
  }

  private confirmCandySpeciesSelection(): boolean {
    const selected = this.candySpeciesList[this.listCursor];
    const entry = this.pendingExchangeEntry;

    if (!selected || !entry || !entry.exchangeCurrencyType) {
      this.getUi().playError();
      return false;
    }

    this.selectingCandySpecies = false;
    this.refreshHelpText();

    this.getUi().setOverlayMode(UiMode.BANK_AMOUNT_FORM, {
      buttonActions: [
        (amount: number) => {
          const result = globalScene.gameData.exchangeCurrencyToRoguePoints(
            entry.exchangeCurrencyType,
            amount,
            selected.speciesId,
          );

          if (result.success) {
            this.setNotice(`${selected.name} 사탕 ${result.consumedAmount} 사용 -> RP ${result.gainedRp}`);
            this.getUi().playSelect();
          } else {
            this.setNotice(result.reason ?? "환전에 실패했습니다.");
            this.getUi().playError();
          }

          this.candySpeciesList = this.getCandySpeciesList();
          this.pendingExchangeEntry = null;
          this.syncBankDataWithGame();
          this.refreshMoneyTexts();
          this.refreshTabCursor();
          this.refreshList();
          this.refreshDetail();
          globalScene.gameData.saveSystem();
          this.getUi().revertMode();
        },

        () => {
          this.pendingExchangeEntry = null;
          this.setNotice("환전을 취소했습니다.");
          this.getUi().playSelect();
          this.getUi().revertMode();
        },
      ],
    });

    return true;
  }

  private processCandySpeciesSelectInput(button: Button): boolean {
    if (this.candySpeciesList.length === 0) {
      this.selectingCandySpecies = false;
      this.pendingExchangeEntry = null;
      return false;
    }

    switch (button) {
      case Button.UP:
        this.moveListCursor(-1);
        this.refreshTabCursor();
        this.refreshList();
        this.refreshDetail();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.DOWN:
        this.moveListCursor(1);
        this.refreshTabCursor();
        this.refreshList();
        this.refreshDetail();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.ACTION:
      case Button.SUBMIT:
        return this.confirmCandySpeciesSelection();

      case Button.CANCEL:
        this.selectingCandySpecies = false;
        this.pendingExchangeEntry = null;
        this.candySpeciesList = [];
        this.listCursor = 0;
        this.listScroll = 0;
        this.refreshTabCursor();
        this.refreshList();
        this.refreshDetail();
        this.refreshHelpText();
        this.setNotice("사탕 포켓몬 선택을 취소했습니다.", 1000);
        return true;
    }

    return false;
  }

  private processTargetSelectInput(button: Button): boolean {
    const starters = this.uiArgs?.starters ?? [];

    if (starters.length === 0) {
      this.selectingTarget = false;
      this.pendingTargetListing = null;
      this.pendingStorageItem = null;
      return false;
    }

    switch (button) {
      case Button.UP:
        this.targetCursor = this.targetCursor > 0 ? this.targetCursor - 1 : starters.length - 1;
        this.refreshStarterIcons();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.DOWN:
        this.targetCursor = this.targetCursor < starters.length - 1 ? this.targetCursor + 1 : 0;
        this.refreshStarterIcons();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.ACTION:
      case Button.SUBMIT:
        return this.confirmTargetSelection();

      case Button.CANCEL:
        this.selectingTarget = false;
        this.pendingTargetListing = null;
        this.pendingStorageItem = null;
        this.refreshStarterIcons();
        this.refreshHelpText();
        this.setNotice("대상 선택을 취소했습니다.", 1000);
        return true;
    }

    return false;
  }

  private getExchangeList(): RogueBankActionEntry[] {
    return [
      {
        name: "골드 -> 로그포인트",
        description: "1000골드당 1 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.MONEY,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
      {
        name: "포켓몬사탕 -> 로그포인트",
        description: "포켓몬사탕 10개당 1 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.CANDY,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
      {
        name: "알바우처 -> 로그포인트",
        description: "알바우처 1장당 15 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.VOUCHER_REGULAR,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
      {
        name: "알바우처플러스 -> 로그포인트",
        description: "알바우처플러스 1장당 60 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.VOUCHER_PLUS,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
      {
        name: "알바우처프리미엄 -> 로그포인트",
        description: "알바우처프리미엄 1장당 250 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.VOUCHER_PREMIUM,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
      {
        name: "알바우처골드 -> 로그포인트",
        description: "알바우처골드 1장당 250 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.VOUCHER_GOLD,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
    ];
  }

  private confirmTargetSelection(): boolean {
    const starters = this.uiArgs?.starters ?? [];
    const starter = starters[this.targetCursor];

    if (!starter) {
      return false;
    }

    if (this.pendingStorageItem) {
      const item = this.pendingStorageItem;
      const amount = this.pendingStorageAmount || 1;

      const moved = globalScene.gameData.moveStorageItemToRun(item.id, amount);
      if (!moved) {
        this.setNotice("창고에서 아이템을 꺼낼 수 없습니다.");
        this.getUi().playError();
        return true;
      }

      (starter as any).preRunItems ??= [];
      for (let i = 0; i < amount; i++) {
        (starter as any).preRunItems.push(item.id);
      }

      this.pendingStorageItem = null;
      this.pendingStorageAmount = 1;
      this.selectingTarget = false;

      this.storageItems = this.buildStorageEntries();
      this.refreshStarterIcons();
      this.refreshList();
      this.refreshDetail();
      this.refreshHelpText();

      const speciesName = getPokemonSpecies(starter.speciesId).name;
      this.setNotice(`${item.name} ${amount}개를 ${speciesName}에게 지급 예정으로 등록했습니다.`);
      this.getUi().playSelect();
      return true;
    }

    const listing = this.pendingTargetListing;
    if (!listing) {
      return false;
    }

    const itemName = this.getListingDisplayName(listing);
    const speciesName = getPokemonSpecies(starter.speciesId).name;

    if (listing.purchaseMode === "SELECT_POKEMON" && this.uiArgs?.source === "MENU") {
      const fakeEntry: RogueShopStorageEntry = {
        id: listing.id,
        name: itemName,
        quantity: 1,
        description:
          typeof listing.option?.type?.getDescription === "function"
            ? listing.option.type.getDescription()
            : "설명이 없습니다.",
        purchaseMode: listing.purchaseMode,
        option: listing.option,
      };

      const availableCapacity = this.getAvailableHeldItemCapacity(starter, fakeEntry);
      if (availableCapacity <= 0) {
        this.setNotice(`${speciesName}은(는) 이미 ${itemName} 최대치입니다.`);
        this.getUi().playError();
        return true;
      }
    }

    if (!this.tryConsumeListingPurchase(listing)) {
      return true;
    }

    let applied = false;

    if (this.uiArgs?.source === "MENU") {
      const fakeEntry: RogueShopStorageEntry = {
        id: listing.id,
        name: itemName,
        quantity: 1,
        description:
          typeof listing.option?.type?.getDescription === "function"
            ? listing.option.type.getDescription()
            : "설명이 없습니다.",
        purchaseMode: listing.purchaseMode,
        option: listing.option,
      };

      applied = this.applyStorageItemImmediatelyToPartyPokemon(starter, fakeEntry, 1);
    } else {
      (starter as any).preRunItems ??= [];
      (starter as any).preRunItems.push(listing.id);
      applied = true;
    }

    if (!applied) {
      globalScene.gameData.addRoguePoints(listing.priceRp);
      listing.stock++;
      this.setNotice("아이템을 적용할 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    this.selectingTarget = false;
    this.pendingTargetListing = null;

    this.syncBankDataWithGame();
    this.refreshMoneyTexts();
    this.refreshStarterIcons();
    this.refreshList();
    this.refreshDetail();
    this.refreshHelpText();
    globalScene.gameData.saveSystem();

    this.setNotice(`${itemName}을(를) ${speciesName}에게 적용했습니다.`);
    this.getUi().playSelect();
    return true;
  }

  private syncBankDataWithGame(): void {
    this.bankData.roguePoints = globalScene.gameData.roguePoints ?? 0;
    this.bankData.gold = globalScene.money ?? 0;
    this.bankData.bankRoguePoints = globalScene.gameData.bankRoguePoints ?? 0;
    this.bankData.bankGold = globalScene.gameData.bankMoney ?? 0;
  }

  private handleSubmit(): boolean {
    switch (this.currentTab) {
      case "SHOP":
        return this.handleShopConfirm();
      case "BANK":
        return this.handleBankConfirm();
      case "STORAGE":
        return this.handleStorageConfirm();
      case "QUEST":
        return this.handleQuestConfirm();
      case "PRACTICE":
        return this.handlePracticeConfirm();
      case "WORKSHOP":
        return this.handleWorkshopConfirm();

      case "MINE":
        return this.handleMineConfirm();

      default:
        return false;
    }
  }

  private handleMineConfirm(): boolean {
    this.getUi().playSelect();

    void this.getUi().setMode(UiMode.ROGUE_MINE, {
      onExit: () => {
        void globalScene.ui.setMode(UiMode.ROGUE_SHOP, {
          ...this.uiArgs,
          initialTab: "MINE",
        });
      },
    });

    return true;
  }

  private handleWorkshopConfirm(): boolean {
    const entry = this.workshopEntries[this.listCursor];

    if (!entry) {
      this.getUi().playError();
      return false;
    }

    this.getUi().playSelect();

    void this.getUi().setMode(UiMode.CRAFTING, {
      returnMode: UiMode.ROGUE_SHOP,
      returnArgs: this.uiArgs ?? undefined,
      location: CraftingLocation.ROGUE_WORKSHOP,
    });

    return true;
  }

  private handleShopConfirm(): boolean {
    const listing = this.shopListings[this.listCursor];

    if (!listing) {
      return false;
    }

    // ★ 쿠폰 교환소
    if (listing.specialAction === "COUPON") {
      this.getUi().playSelect();
      this.getUi().setOverlayMode(UiMode.COUPON);
      return true;
    }

    // 이하 기존 상품 구매 로직
    if (listing.stock <= 0) {
      this.setNotice("매진된 상품입니다.");
      this.getUi().playError();
      return true;
    }

    const hasSelectedStarters = (this.uiArgs?.starters?.length ?? 0) > 0;

    /*
     * 스타팅을 고르기 전 로그센터로 바로 들어온 경우:
     * 적용 대상이 없으므로 목적지 선택창을 띄우지 않고
     * 구매 즉시 창고로 보낸다.
     */
    if (!hasSelectedStarters) {
      console.log("[ROGUE_SHOP] no starters -> auto storage", {
        id: listing.id,
        name: this.getListingDisplayName(listing),
        source: this.uiArgs?.source,
      });

      return this.purchaseListingToStorage(listing);
    }

    /*
     * 스타팅을 고른 뒤 로그센터에 들어온 경우:
     * 기존처럼 적용 / 창고 / 취소 중 하나를 선택한다.
     */
    this.pendingShopListing = listing;
    this.selectingShopDestination = true;
    this.shopDestinationCursor = 0;

    this.refreshDetail();
    this.refreshHelpText();
    this.getUi().playSelect();
    return true;
  }

  private handleBankConfirm(): boolean {
    const list = this.getCurrentList();
    const entry = list[this.listCursor] as RogueBankActionEntry;

    if (!entry) {
      return false;
    }

    if (entry.mode === "EXCHANGE" && entry.exchangeCurrencyType === ExchangeCurrencyType.CANDY) {
      this.candySpeciesList = this.getCandySpeciesList();

      if (this.candySpeciesList.length === 0) {
        this.setNotice("환전 가능한 포켓몬사탕이 없습니다.");
        this.getUi().playError();
        return true;
      }

      this.selectingCandySpecies = true;
      this.pendingExchangeEntry = entry;
      this.listCursor = 0;
      this.listScroll = 0;
      this.refreshTabCursor();

      this.refreshList();
      this.refreshDetail();
      this.refreshHelpText();
      this.setNotice("사탕을 사용할 포켓몬을 선택하세요.");
      return true;
    }

    if (entry.useCustomAmount) {
      this.getUi().setOverlayMode(UiMode.BANK_AMOUNT_FORM, {
        buttonActions: [
          (amount: number) => {
            if (entry.mode === "EXCHANGE") {
              const exchangeType = entry.exchangeCurrencyType;
              if (!exchangeType) {
                this.setNotice("환전 타입이 올바르지 않습니다.");
                this.getUi().playError();
                this.getUi().revertMode();
                return;
              }

              const result = globalScene.gameData.exchangeCurrencyToRoguePoints(exchangeType, amount);

              if (result.success) {
                this.setNotice(`${entry.name} / ${result.consumedAmount} 사용 -> RP ${result.gainedRp}`);
                this.getUi().playSelect();
              } else {
                this.setNotice(result.reason ?? "환전에 실패했습니다.");
                this.getUi().playError();
              }

              this.syncBankDataWithGame();
              this.refreshMoneyTexts();
              this.refreshDetail();
              globalScene.gameData.saveSystem();
              this.getUi().revertMode();
              return;
            }

            const bonus = Math.floor(amount / 100) * 10;

            const success =
              entry.mode === "DEPOSIT"
                ? globalScene.gameData.depositCurrency(entry.currency!, amount)
                : globalScene.gameData.withdrawCurrency(entry.currency!, amount);

            if (success) {
              const label = entry.currency === BankCurrencyType.ROGUE_POINTS ? "로그포인트" : "골드";

              if (entry.mode === "DEPOSIT") {
                this.setNotice(`${label} ${amount} 입금 (이자 +${bonus})`);
              } else {
                this.setNotice(`${label} ${amount} 출금`);
              }

              this.getUi().playSelect();
            } else {
              this.setNotice("잔액이 부족합니다.");
              this.getUi().playError();
            }

            this.syncBankDataWithGame();
            this.refreshMoneyTexts();
            this.refreshDetail();
            globalScene.gameData.saveSystem();
            this.getUi().revertMode();
          },

          () => {
            this.setNotice("작업을 취소했습니다.");
            this.getUi().playSelect();
            this.getUi().revertMode();
          },
        ],
      });

      return true;
    }

    if (typeof entry.amount !== "number") {
      return false;
    }

    if (entry.mode === "EXCHANGE") {
      const exchangeType = entry.exchangeCurrencyType;
      if (!exchangeType) {
        this.setNotice("환전 타입이 올바르지 않습니다.");
        this.getUi().playError();
        return true;
      }

      const result = globalScene.gameData.exchangeCurrencyToRoguePoints(exchangeType, entry.amount);

      if (result.success) {
        this.setNotice(`${entry.name} / ${result.consumedAmount} 사용 -> RP ${result.gainedRp}`);
        this.getUi().playSelect();
      } else {
        this.setNotice(result.reason ?? "환전에 실패했습니다.");
        this.getUi().playError();
      }

      this.syncBankDataWithGame();
      this.refreshMoneyTexts();
      this.refreshDetail();
      globalScene.gameData.saveSystem();
      return true;
    }

    const success =
      entry.mode === "DEPOSIT"
        ? globalScene.gameData.depositCurrency(entry.currency!, entry.amount)
        : globalScene.gameData.withdrawCurrency(entry.currency!, entry.amount);

    if (success) {
      this.getUi().playSelect();
    } else {
      this.getUi().playError();
    }

    this.syncBankDataWithGame();
    this.refreshMoneyTexts();
    this.refreshDetail();
    globalScene.gameData.saveSystem();
    return true;
  }

  private handleStorageConfirm(): boolean {
    const item = this.storageItems[this.listCursor];
    if (!item) {
      return false;
    }

    const hasStarters = (this.uiArgs?.starters?.length ?? 0) > 0;
    if (!hasStarters) {
      this.setNotice("적용할 스타팅이 없습니다.");
      this.getUi().playError();
      return true;
    }

    this.openStorageApplyMode();
    this.storageCursor = this.listCursor;
    this.storageScroll = this.listScroll;
    this.selectedStorageEntry = this.storageItems[this.storageCursor] ?? null;
    this.selectedStorageAmount = 1;

    this.refreshStorageApplyUi();
    this.refreshStarterIcons();
    this.refreshHelpText();
    this.setNotice("수량을 고른 뒤 적용할 스타팅을 선택하세요.");
    this.getUi().playSelect();
    return true;
  }

  private handleQuestConfirm(): boolean {
    const quest = questManager.getQuests()[this.listCursor];

    if (!quest) {
      this.getUi().playError();
      return false;
    }

    // 완료한 의뢰 → 보상 수령
    if (quest.completed) {
      // RP 지급
      globalScene.gameData.addRoguePoints(quest.rewardRp);

      // 골드 → 로그센터 은행
      globalScene.gameData.bankMoney = (globalScene.gameData.bankMoney ?? 0) + quest.rewardGold;

      // 아이템 → 로그센터 창고
      for (const rewardItem of quest.rewardItems ?? []) {
        globalScene.gameData.addToStorage(rewardItem.modifierTypeId, rewardItem.quantity);

        console.log("[QUEST_ITEM_REWARD]", {
          questId: quest.id,
          itemId: rewardItem.modifierTypeId,
          quantity: rewardItem.quantity,
        });
      }

      console.log("[QUEST_REWARD_CLAIMED]", {
        questId: quest.id,
        title: quest.title,
        rewardRp: quest.rewardRp,
        rewardGold: quest.rewardGold,
        rewardItems: quest.rewardItems,
      });

      globalScene.gameData.saveSystem();

      // 보상 수령 완료 후 완료 의뢰 제거
      questManager.removeCompletedQuests();

      // 창고 목록도 즉시 갱신
      this.storageItems = this.buildStorageEntries();

      this.listCursor = 0;
      this.listScroll = 0;

      this.refreshMoneyTexts();
      this.refreshList();
      this.refreshDetail();
      this.refreshHelpText();

      this.setNotice("의뢰 보상을 수령했습니다.");

      this.getUi().playSelect();

      return true;
    }

    // 이미 수락한 경우 → 수락 취소
    if (quest.accepted) {
      const cancelled = questManager.cancelQuest(quest.id);

      if (!cancelled) {
        this.setNotice("의뢰 수락을 취소할 수 없습니다.");

        this.getUi().playError();

        return true;
      }

      this.setNotice("의뢰 수락을 취소했습니다.");

      this.getUi().playSelect();

      this.refreshList();
      this.refreshDetail();
      this.refreshHelpText();

      return true;
    }

    // 최대 수락 개수 검사
    const acceptedCount = questManager.getAcceptedQuestCount();

    if (acceptedCount >= questManager.getMaxAcceptedQuests()) {
      this.setNotice(`의뢰는 최대 ${questManager.getMaxAcceptedQuests()}개까지 수락할 수 있습니다.`);

      this.getUi().playError();

      return true;
    }

    // 의뢰 수락
    const accepted = questManager.acceptQuest(quest.id);

    if (!accepted) {
      this.setNotice("의뢰를 수락할 수 없습니다.");

      this.getUi().playError();

      return true;
    }

    this.setNotice(`의뢰를 수락했습니다. (${acceptedCount + 1}/${questManager.getMaxAcceptedQuests()})`);

    this.getUi().playSelect();

    this.refreshList();
    this.refreshDetail();
    this.refreshHelpText();

    return true;
  }

  private moveListCursor(direction: 1 | -1): void {
    const list = this.getCurrentList();

    if (list.length === 0) {
      return;
    }

    const currentIndex = this.listScroll + this.cursor;

    let nextIndex = currentIndex + direction;

    // 맨 아래 → 맨 위
    if (nextIndex >= list.length) {
      nextIndex = 0;
    }

    // 맨 위 → 맨 아래
    if (nextIndex < 0) {
      nextIndex = list.length - 1;
    }

    // 다음 항목이 현재 표시 영역보다 아래
    if (nextIndex >= this.listScroll + this.visibleRows) {
      this.listScroll = nextIndex - this.visibleRows + 1;
    }

    // 다음 항목이 현재 표시 영역보다 위
    else if (nextIndex < this.listScroll) {
      this.listScroll = nextIndex;
    }

    // 순환해서 첫 번째로 돌아온 경우
    if (nextIndex === 0) {
      this.listScroll = 0;
    }

    // 순환해서 마지막으로 간 경우
    if (nextIndex === list.length - 1) {
      this.listScroll = Math.max(0, list.length - this.visibleRows);
    }

    this.cursor = nextIndex - this.listScroll;

    this.refreshList();
    this.updateCursor();
  }

  private handlePracticeConfirm(): boolean {
    switch (this.listCursor) {
      case 0:
        return this.startPracticeMode();

      case 1:
        this.openPracticeLevelMenu("dummy1");
        return true;

      case 2:
        this.openPracticeLevelMenu("dummy2");
        return true;

      case 3:
        this.openPracticeStatMenu("dummy1");
        return true;

      case 4:
        this.openPracticeStatMenu("dummy2");
        return true;

      case 5:
        this.openPracticeTypeMenu("dummy1");
        return true;

      case 6:
        this.openPracticeTypeMenu("dummy2");
        return true;

      case 7:
        this.openPracticeAbilityMenu("dummy1");
        return true;

      case 8:
        this.openPracticeAbilityMenu("dummy2");
        return true;

      case 9:
        this.openPracticePassiveMenu("dummy1");
        return true;

      case 10:
        this.openPracticePassiveMenu("dummy2");
        return true;

      case 11:
        return this.togglePracticeDummyCanAct();

      case 12:
        this.openPracticeDummy1MoveMenu();
        return true;

      case 13:
        this.openPracticeDummy2MoveMenu();
        return true;

      case 14:
        this.openPracticeDummy1RentalModifierMenu();
        return true;

      case 15:
        this.openPracticeDummy2RentalModifierMenu();
        return true;

      case 16:
        return this.togglePracticeExpReward();

      case 17:
        return this.togglePracticeMoneyReward();

      case 18:
        return this.togglePracticeRpReward();

      case 19:
        return this.togglePracticeDummyFaint();

      case 20:
        return this.togglePracticeAllyFaint();

      case 21:
        this.openPracticeBattleTypeMenu();
        return true;

      case 22:
        return this.resetPracticeDummyConfig();

      case 23:
        this.openPracticePresetSaveMenu();
        return true;

      case 24:
        this.openPracticePresetLoadMenu();
        return true;
    }

    return true;
  }

  private startPracticeMode(): boolean {
    globalScene.gameMode = getGameMode(GameModes.PRACTICE);

    this.rootContainer.setVisible(false);
    this.getUi().setMode(UiMode.MESSAGE);
    this.getUi().clearText();

    this.uiArgs?.onPracticeStart?.();
    return true;
  }

  private openPracticeLevelMenu(dummyKey: "dummy1" | "dummy2"): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_LEVEL_FORM, {
      dummyKey,
      buttonActions: [
        (level: number) => {
          this.setNotice(`${dummyKey === "dummy1" ? "대타1" : "대타2"} 레벨 ${level} 설정 완료`);

          this.getUi().revertMode();
        },

        () => {
          this.getUi().revertMode();
        },
      ],
    });
  }

  private openPracticeStatMenu(dummyKey: "dummy1" | "dummy2"): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_STAT_FORM, {
      dummyKey,
      buttonActions: [
        () => {
          this.setNotice(`${dummyKey === "dummy1" ? "대타1" : "대타2"} 능력치 설정 완료`);

          this.getUi().revertMode();
        },

        () => {
          this.getUi().revertMode();
        },
      ],
    });
  }

  private openPracticeTypeMenu(dummyKey: "dummy1" | "dummy2"): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_TYPE_FORM, {
      dummyKey,
      buttonActions: [
        () => {
          this.setNotice(`${dummyKey === "dummy1" ? "대타1" : "대타2"} 타입 설정 완료`);

          this.getUi().revertMode();
        },

        () => {
          this.getUi().revertMode();
        },
      ],
    });
  }

  private openPracticeAbilityMenu(dummyKey: "dummy1" | "dummy2"): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_ABILITY_FORM, {
      dummyKey,

      target: "ability",

      title: dummyKey === "dummy1" ? "대타1 특성을 선택하시오" : "대타2 특성을 선택하시오",
    });
  }

  private openPracticePassiveMenu(dummyKey: "dummy1" | "dummy2"): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_ABILITY_FORM, {
      dummyKey,

      target: "passive",

      title: dummyKey === "dummy1" ? "대타1 패시브를 선택하시오" : "대타2 패시브를 선택하시오",
    });
  }

  private openPracticeDummy1MoveMenu(): void {
    globalScene.ui.setOverlayMode(UiMode.PRACTICE_MOVE_FORM, {
      dummyKey: "dummy1",
    });
  }

  private openPracticeDummy2MoveMenu(): void {
    globalScene.ui.setOverlayMode(UiMode.PRACTICE_MOVE_FORM, {
      dummyKey: "dummy2",
    });
  }

  private openPracticeDummy1RentalModifierMenu(): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_RENTAL_MODIFIER_SELECT, {
      dummyKey: "dummy1",
    });
  }

  private openPracticeDummy2RentalModifierMenu(): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_RENTAL_MODIFIER_SELECT, {
      dummyKey: "dummy2",
    });
  }

  private togglePracticeDummyCanAct(): boolean {
    globalScene.gameData.practiceDummyConfig ??= {};

    const current = globalScene.gameData.practiceDummyConfig.canAct ?? false;

    globalScene.gameData.practiceDummyConfig.canAct = !current;

    console.log("[PRACTICE] toggle canAct", {
      before: current,
      after: !current,
      config: globalScene.gameData.practiceDummyConfig,
    });

    globalScene.gameData.saveSystem();

    this.setNotice(!current ? "대타출동이 행동하도록 설정했습니다." : "대타출동이 행동하지 않도록 설정했습니다.");

    this.getUi().playSelect();
    this.refreshDetail();
    return true;
  }

  private togglePracticeExpReward(): boolean {
    globalScene.gameData.practiceDummyConfig ??= {};
    globalScene.gameData.practiceDummyConfig.rewardFlags ??= {};

    const current = globalScene.gameData.practiceDummyConfig.rewardFlags.exp ?? false;

    globalScene.gameData.practiceDummyConfig.rewardFlags.exp = !current;

    globalScene.gameData.saveSystem();

    this.setNotice(!current ? "연습모드 경험치 지급 ON" : "연습모드 경험치 지급 OFF");

    this.refreshDetail();
    this.getUi().playSelect();
    return true;
  }

  private togglePracticeMoneyReward(): boolean {
    globalScene.gameData.practiceDummyConfig ??= {};
    globalScene.gameData.practiceDummyConfig.rewardFlags ??= {};

    const current = globalScene.gameData.practiceDummyConfig.rewardFlags.money ?? false;

    globalScene.gameData.practiceDummyConfig.rewardFlags.money = !current;

    globalScene.gameData.saveSystem();

    this.setNotice(!current ? "연습모드 골드 지급 ON" : "연습모드 골드 지급 OFF");

    this.refreshDetail();
    this.getUi().playSelect();
    return true;
  }

  private togglePracticeRpReward(): boolean {
    globalScene.gameData.practiceDummyConfig ??= {};
    globalScene.gameData.practiceDummyConfig.rewardFlags ??= {};

    const current = globalScene.gameData.practiceDummyConfig.rewardFlags.roguePoints ?? false;

    globalScene.gameData.practiceDummyConfig.rewardFlags.roguePoints = !current;

    globalScene.gameData.saveSystem();

    this.setNotice(!current ? "연습모드 로그포인트 지급 ON" : "연습모드 로그포인트 지급 OFF");

    this.refreshDetail();
    this.getUi().playSelect();
    return true;
  }

  private togglePracticeDummyFaint(): boolean {
    const cfg = (globalScene.gameData.practiceDummyConfig ??= {});
    cfg.rewardFlags ??= {};

    cfg.rewardFlags.allowDummyFaint = !cfg.rewardFlags.allowDummyFaint;

    this.refreshList();
    return true;
  }

  private togglePracticeAllyFaint(): boolean {
    const cfg = (globalScene.gameData.practiceDummyConfig ??= {});
    cfg.rewardFlags ??= {};

    cfg.rewardFlags.allowAllyFaint = !cfg.rewardFlags.allowAllyFaint;

    globalScene.gameData.saveSystem();

    this.setNotice(cfg.rewardFlags.allowAllyFaint ? "아군 기절 처리 ON" : "아군 기절 처리 OFF");

    this.refreshList();
    this.refreshDetail();
    this.getUi().playSelect();
    return true;
  }

  private openPracticeBattleTypeMenu(): void {
    this.getUi().setOverlayMode(UiMode.MENU_OPTION_SELECT, {
      options: [
        {
          label: "싱글배틀",
          handler: () => {
            const cfg = (globalScene.gameData.practiceDummyConfig ??= {});
            (cfg as any).battleType = "SINGLE";

            globalScene.gameData.saveSystem();

            this.setNotice("배틀 유형을 싱글배틀로 설정했습니다.");
            this.refreshList();
            this.refreshDetail();
            this.getUi().playSelect();
            return true;
          },
          keepOpen: false,
        },
        {
          label: "더블배틀",
          handler: () => {
            const cfg = (globalScene.gameData.practiceDummyConfig ??= {});
            (cfg as any).battleType = "DOUBLE";

            globalScene.gameData.saveSystem();

            this.setNotice("배틀 유형을 더블배틀로 설정했습니다.");
            this.refreshList();
            this.refreshDetail();
            this.getUi().playSelect();
            return true;
          },
          keepOpen: false,
        },
        {
          label: "취소",
          handler: () => true,
          keepOpen: false,
        },
      ],
      xOffset: 90,
      yOffset: 24,
      maxOptions: 3,
    });
  }

  private openPracticePresetSaveMenu(): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_PRESET_SLOT, PracticePresetSlotUiMode.SAVE, (slot: number) => {
      if (slot < 0) {
        return;
      }

      const preset: PracticePresetData = {
        name: `프리셋 ${slot + 1}`,

        config: structuredClone(globalScene.gameData.practiceDummyConfig),

        rentalModifiers: structuredClone(globalScene.gameData.practiceRentalModifiers ?? []),

        starters: structuredClone(globalScene.gameData.lastSelectedStarters ?? []),

        timestamp: Date.now(),
      };

      globalScene.gameData.savePracticePreset(slot, preset);
      this.setNotice(`프리셋 ${slot + 1} 저장 완료`);
      this.refreshList();
      this.refreshDetail();
    });
  }

  private openPracticePresetLoadMenu(): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_PRESET_SLOT, PracticePresetSlotUiMode.LOAD, (slot: number) => {
      if (slot < 0) {
        return;
      }

      const preset = globalScene.gameData.getPracticePreset(slot);

      if (!preset) {
        this.setNotice("불러올 프리셋이 없습니다.");
        this.getUi().playError();
        return;
      }

      globalScene.gameData.practiceDummyConfig = JSON.parse(JSON.stringify(preset.config ?? {}));

      globalScene.gameData.practiceRentalModifiers = (preset.rentalModifiers ?? []).map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
      }));

      const presetStarters = (preset.starters ?? []).map(starter => ({
        ...starter,
        preRunItems: [...(starter.preRunItems ?? [])],
      }));

      globalScene.gameData.lastSelectedStarters = presetStarters;

      globalScene.gameData.pendingPracticePresetStarters = presetStarters;

      globalScene.gameData.saveSystem();

      this.rootContainer.setVisible(false);
      this.uiArgs?.onPracticePresetStart?.();
    });
  }

  private openPracticeDummyConfig(): boolean {
    this.openPracticeLevelMenu();
    return true;
  }

  private resetPracticeDummyConfig(): boolean {
    globalScene.gameData.practiceDummyConfig = {
      rentalModifiers: [],
      battleType: "SINGLE",
    };

    globalScene.gameData.saveSystem();

    this.setNotice("대타출동 설정을 초기화했습니다.");
    this.getUi().playSelect();
    return true;
  }

  private openStorageAmountMenu(item: RogueShopStorageEntry): void {
    const max = Math.min(item.quantity, 9);

    globalScene.ui.setOverlayMode(UiMode.MENU_OPTION_SELECT, {
      options: new Array(max)
        .fill(null)
        .map((_, i) => {
          const amount = i + 1;
          return {
            label: `${amount}개 꺼내기`,
            handler: () => {
              this.pendingStorageAmount = amount;
              this.selectingTarget = true;
              this.targetCursor = 0;
              this.refreshStarterIcons();
              this.refreshHelpText();
              this.setNotice(`${item.name} ${amount}개를 줄 스타팅을 선택하세요.`);
              return true;
            },
            keepOpen: false,
          };
        })
        .concat([
          {
            label: "취소",
            handler: () => true,
            keepOpen: false,
          },
        ]),
      xOffset: 90,
      yOffset: 24,
      maxOptions: 6,
    });
  }

  private syncTabFromCursor(): void {
    this.currentTab = this.enabledTabs[this.tabCursor];
  }

  private resetListState(): void {
    this.listCursor = 0;
    this.listScroll = 0;
  }

  private moveTabCursor(delta: number): boolean {
    if (this.enabledTabs.length <= 1) {
      return false;
    }

    this.tabCursor = (this.tabCursor + delta + this.enabledTabs.length) % this.enabledTabs.length;

    if (this.tabCursor < this.tabScroll) {
      this.tabScroll = this.tabCursor;
    }

    if (this.tabCursor >= this.tabScroll + this.visibleTabCount) {
      this.tabScroll = this.tabCursor - this.visibleTabCount + 1;
    }

    // 끝에서 처음으로 순환했을 때
    if (this.tabCursor === 0) {
      this.tabScroll = 0;
    }

    // 처음에서 끝으로 역순환했을 때
    if (this.tabCursor === this.enabledTabs.length - 1) {
      this.tabScroll = Math.max(0, this.enabledTabs.length - this.visibleTabCount);
    }

    this.syncTabFromCursor();
    this.resetListState();

    return true;
  }

  private moveListCursor(delta: number): boolean {
    const maxIndex = this.getCurrentList().length - 1;
    if (maxIndex < 0) {
      return false;
    }

    let next = this.listCursor + delta;

    if (next < 0) {
      next = maxIndex;
    } else if (next > maxIndex) {
      next = 0;
    }

    this.listCursor = next;

    if (this.listCursor < this.listScroll) {
      this.listScroll = this.listCursor;
    } else if (this.listCursor >= this.listScroll + this.visibleRows) {
      this.listScroll = this.listCursor - this.visibleRows + 1;
    }

    return true;
  }

  private getCurrentList(): Array<
    | RogueShopListing
    | RogueShopStorageEntry
    | RogueBankActionEntry
    | RogueBankCandySpeciesEntry
    | RogueWorkshopEntry
    | QuestEntry
  > {
    if (this.selectingCandySpecies) {
      return this.candySpeciesList;
    }

    if (this.currentTab === "SHOP") {
      return this.shopListings;
    }

    if (this.currentTab === "BANK") {
      return [
        {
          name: "RP 입금",
          description: "원하는 양의 로그포인트를 은행에 입금합니다. 100마다 이자 +10",
          currency: BankCurrencyType.ROGUE_POINTS,
          mode: "DEPOSIT",
          useCustomAmount: true,
        },
        {
          name: "RP 출금",
          description: "원하는 양의 로그포인트를 은행에서 출금합니다.",
          currency: BankCurrencyType.ROGUE_POINTS,
          mode: "WITHDRAW",
          useCustomAmount: true,
        },
        {
          name: "골드 입금",
          description: "원하는 양의 골드를 은행에 입금합니다. 100마다 이자 +10",
          currency: BankCurrencyType.MONEY,
          mode: "DEPOSIT",
          useCustomAmount: true,
        },
        {
          name: "골드 출금",
          description: "원하는 양의 골드를 은행에서 출금합니다.",
          currency: BankCurrencyType.MONEY,
          mode: "WITHDRAW",
          useCustomAmount: true,
        },
        ...this.getExchangeList(),
      ];
    }

    if (this.currentTab === "QUEST") {
      return questManager.getQuests();
    }

    if (this.currentTab === "WORKSHOP") {
      return this.workshopEntries;
    }

    if (this.currentTab === "MINE") {
      return [
        {
          recipeId: "rogue_mine",
          name: "로그광산 입장",
          description: "광산에서 다양한 광물과 희귀 자원을 채굴합니다.",
        },
      ];
    }

    if (this.currentTab === "PRACTICE") {
      const cfg = globalScene.gameData.practiceDummyConfig ?? {};
      const rewards = cfg.rewardFlags ?? {};

      const dummyFaintText = rewards.allowDummyFaint ? "대타 기절 처리 [ON]" : "대타 기절 처리 [OFF]";

      const allyFaintText = rewards.allowAllyFaint ? "아군 기절 처리 [ON]" : "아군 기절 처리 [OFF]";

      const actText = cfg.canAct ? "대타출동 행동 설정 [행동]" : "대타출동 행동 설정 [정지]";

      const expText = rewards.exp ? "경험치 지급 설정 [ON]" : "경험치 지급 설정 [OFF]";

      const moneyText = rewards.money ? "골드 지급 설정 [ON]" : "골드 지급 설정 [OFF]";

      const rpText = rewards.roguePoints ? "로그포인트 지급 설정 [ON]" : "로그포인트 지급 설정 [OFF]";

      return [
        { name: "연습모드 시작", description: "연습장으로 이동합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
        {
          name: "대타1 레벨 설정",
          description: "첫 번째 대타출동 인형의 레벨을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 레벨 설정",
          description: "두 번째 대타출동 인형의 레벨을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타1 능력치 설정",
          description: "첫 번째 대타출동 인형의 능력치를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 능력치 설정",
          description: "두 번째 대타출동 인형의 능력치를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타1 타입 설정",
          description: "첫 번째 대타출동 인형의 타입을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 타입 설정",
          description: "두 번째 대타출동 인형의 타입을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타1 특성 설정",
          description: "첫 번째 대타출동 인형의 특성을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 특성 설정",
          description: "두 번째 대타출동 인형의 특성을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타1 패시브 설정",
          description: "첫 번째 대타출동 인형의 패시브를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 패시브 설정",
          description: "두 번째 대타출동 인형의 패시브를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: actText,
          description: "대타출동 인형이 행동할지 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: "대타1 기술 설정",
          description: "첫 번째 대타출동 인형의 기술 4개를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 기술 설정",
          description: "두 번째 대타출동 인형의 기술 4개를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타1 렌탈 아이템 설정",
          description: "첫 번째 대타출동 인형에게 연습용 렌탈 아이템을 지급합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 렌탈 아이템 설정",
          description: "두 번째 대타출동 인형에게 연습용 렌탈 아이템을 지급합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: expText,
          description: "연습모드에서 경험치 획득 여부를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: moneyText,
          description: "연습모드에서 골드 획득 여부를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: rpText,
          description: "연습모드에서 로그포인트 획득 여부를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: dummyFaintText,
          description: "대타출동 인형이 HP 0이 되어 기절할지 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: allyFaintText,
          description: "아군 포켓몬이 HP 0이 되어 기절할지 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: `배틀 유형 : ${((globalScene.gameData.practiceDummyConfig as any)?.battleType ?? "SINGLE") === "DOUBLE" ? "더블" : "싱글"}`,
          description: "연습전 배틀 유형을 변경합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        { name: "설정 초기화", description: "대타출동 설정을 초기화합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
        {
          name: "프리셋 저장",
          description: "현재 연습장 설정을 프리셋 슬롯에 저장합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: "프리셋 불러오기",
          description: "저장된 연습장 프리셋을 불러옵니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
      ];
    }

    return this.storageItems;
  }

  private refreshMoneyTexts(): void {
    if (this.currentTab === "BANK") {
      this.valueRoguePointText.setText(`RP: ${(globalScene.gameData.bankRoguePoints ?? 0).toLocaleString()}`);

      this.valueGoldText.setText(`G: ${(globalScene.gameData.bankMoney ?? 0).toLocaleString()}`);

      return;
    }

    this.valueRoguePointText.setText(`RP: ${(globalScene.gameData.roguePoints ?? 0).toLocaleString()}`);

    this.valueGoldText.setText(`G: ${(globalScene.money ?? 0).toLocaleString()}`);
  }

  private refreshTabCursor(): void {
    const visibleCursor = this.tabCursor - this.tabScroll;

    this.tabCursorObj.setPosition(this.tabXPositions[visibleCursor] - 4, 23);

    const list = this.getCurrentList();

    const listY = 44 + (this.listCursor - this.listScroll) * 14;

    this.listCursorObj.setPosition(8, listY);

    this.listCursorObj.setVisible(list.length > 0);
  }

  private refreshTabTexts(): void {
    const labels: Record<RogueShopTab, string> = {
      SHOP: "상점",
      BANK: "은행",
      STORAGE: "창고",
      QUEST: "의뢰소",
      PRACTICE: "연습",
      WORKSHOP: "공방소",
      MINE: "로그광산",
    };

    for (let i = 0; i < this.tabTexts.length; i++) {
      const visibleIndex = this.tabScroll + i;
      const tab = this.enabledTabs[visibleIndex];
      const textObj = this.tabTexts[i];

      if (!tab || i >= this.visibleTabCount) {
        textObj.setText("").setVisible(false);

        continue;
      }

      textObj.setVisible(true).setText(labels[tab]).setPosition(this.tabXPositions[i], 25);
    }
  }

  private refreshList(): void {
    const list = this.getCurrentList();

    for (let i = 0; i < this.visibleRows; i++) {
      const dataIndex = this.listScroll + i;
      const row = list[dataIndex];
      const textObj = this.listTextObjects[i];

      if (!row) {
        textObj.setText("");
        textObj.setAlpha(0);
        textObj.off("pointerover");
        textObj.off("pointerout");
        textObj.disableInteractive();
        continue;
      }

      textObj.setAlpha(1);

      // ✅ 사탕 선택 모드
      if (this.selectingCandySpecies) {
        const candyEntry = row as RogueBankCandySpeciesEntry;
        textObj.setText(`${candyEntry.name} - 사탕 ${candyEntry.candyCount}`);
      }

      // 상점
      else if (this.currentTab === "SHOP") {
        const listing = row as RogueShopListing;

        if (listing.specialAction === "COUPON") {
          textObj.setText("쿠폰 교환소");
          continue;
        }

        const soldOut = listing.stock <= 0 ? " [매진]" : "";

        console.log("[TYPE_NAME_DEBUG]", {
          id: listing.option?.type?.id,
          ctor: listing.option?.type?.constructor?.name,
          rawName: listing.option?.type?.name,
          safeName:
            typeof (listing.option?.type as any)?.getSafeName === "function"
              ? (listing.option!.type as any).getSafeName()
              : null,
          localeKey: (listing.option?.type as any)?.localeKey,
        });
        const itemName =
          typeof (listing.option?.type as any)?.getSafeName === "function"
            ? (listing.option!.type as any).getSafeName()
            : (listing.option?.type?.name ?? listing.id ?? "이름없음");
        textObj.setText(`${itemName} - ${listing.priceRp}RP${soldOut}`);
      }

      // 창고
      else if (this.currentTab === "STORAGE") {
        const storageItem = row as RogueShopStorageEntry;
        textObj.setText(`${storageItem.name} x${storageItem.quantity}`);
      }

      // 공방소
      else if (this.currentTab === "WORKSHOP") {
        const workshopEntry = row as RogueWorkshopEntry;
        textObj.setText(workshopEntry.name);
      } else if (this.currentTab === "MINE") {
        const mineEntry = row as RogueWorkshopEntry;
        textObj.setText(mineEntry.name);
      }

      // 의뢰
      else if (this.currentTab === "QUEST") {
        const quest = row as QuestEntry;

        const statusText = quest.completed ? "[완료]" : quest.accepted ? "[수락]" : "[게시]";

        textObj.setFontSize(72);

        const fullText = `${statusText} ${quest.title} (${quest.progress}/${quest.requirement})`;

        const maxLength = 20;

        const isTruncated = fullText.length > maxLength;

        const displayText = isTruncated ? `${fullText.slice(0, maxLength)}…` : fullText;

        textObj.setText(displayText);

        // 잘린 경우에만 마우스 툴팁
        if (isTruncated) {
          textObj.setInteractive(new Phaser.Geom.Rectangle(0, 0, 780, 80), Phaser.Geom.Rectangle.Contains);

          textObj.on("pointerover", () => {
            globalScene.ui.showTooltip(quest.title, fullText, true);
          });

          textObj.on("pointerout", () => {
            globalScene.ui.hideTooltip();
          });
        }
      }
      // 은행 / 연습
      else {
        textObj.setText((row as RogueBankActionEntry).name);
      }
    }

    this.listCursorObj.setVisible(list.length > 0);
  }

  private openStorageApplyMode(): void {
    this.storageApplyMode = true;

    this.selectingStorageItem = true;
    this.selectingStorageAmount = false;
    this.selectingStorageTarget = false;

    this.storageCursor = 0;
    this.storageScroll = 0;
    this.starterCursor = 0;
    this.selectedStorageAmount = 1;
    this.selectedStorageEntry = null;

    this.refreshStorageApplyUi();
    this.setNotice("창고에서 아이템을 선택하세요.");
  }

  private closeStorageApplyMode(): void {
    this.storageApplyMode = false;

    this.selectingStorageItem = false;
    this.selectingStorageAmount = false;
    this.selectingStorageTarget = false;

    this.selectedStorageEntry = null;
    this.selectedStorageAmount = 1;

    this.refreshList();
    this.refreshDetail();
    this.setNotice("아이템 선택으로 돌아갑니다.");
  }

  private refreshStarterIcons(): void {
    const starters = this.uiArgs?.starters ?? [];
    const hasStarterSelection = starters.length > 0;

    this.starterPanelWindow.setVisible(hasStarterSelection);
    this.starterPanelTitleText.setVisible(hasStarterSelection);
    this.starterIconsContainer.setVisible(hasStarterSelection);

    if (!hasStarterSelection) {
      this.starterIconCursorObj.setVisible(false);
      return;
    }

    for (let i = 0; i < this.starterIcons.length; i++) {
      const icon = this.starterIcons[i];
      const starter = starters[i];

      if (!starter) {
        icon.setVisible(false);
        icon.setTexture("pokemon_icons_0").setFrame("unknown");
        continue;
      }

      const species = getPokemonSpecies(starter.speciesId);
      const formIndex = starter.formIndex ?? 0;
      const shiny = !!starter.shiny;
      const variant = starter.variant ?? 0;
      const female = !!starter.female;

      icon
        .setTexture(species.getIconAtlasKey(formIndex, shiny, variant))
        .setFrame(species.getIconId(female, formIndex, shiny, variant))
        .setPosition(283, this.calcShopStarterIconY(i))
        .setVisible(true);
    }

    if ((this.selectingTarget || this.selectingStorageTarget) && starters.length > 0) {
      const cursorIndex = this.selectingStorageTarget ? this.starterCursor : this.targetCursor;

      this.starterIconCursorObj.setVisible(true).setPosition(279, this.calcShopStarterIconY(cursorIndex) - 1);
    } else {
      this.starterIconCursorObj.setVisible(false);
    }

    this.starterPanelWindow.setAlpha(this.selectingTarget || this.selectingStorageTarget ? 1 : 0.75);
    this.starterPanelTitleText.setAlpha(this.selectingTarget || this.selectingStorageTarget ? 1 : 0.75);
    this.starterPanelTitleText.setText(this.selectingTarget || this.selectingStorageTarget ? "대상 선택" : "스타팅");
  }

  private refreshDetail(): void {
    this.detailTitleText.setFontSize(96);
    this.detailBodyText.setFontSize(96);
    this.questFooterText.setVisible(false);

    const list = this.getCurrentList();
    const selected = list[this.listCursor];

    if (!selected) {
      this.detailTitleText.setText("");
      this.detailBodyText.setText("");
      return;
    }

    if (this.selectingCandySpecies) {
      const candyEntry = selected as RogueBankCandySpeciesEntry;
      this.detailTitleText.setText(candyEntry.name);
      this.detailBodyText.setText(
        `보유 사탕: ${candyEntry.candyCount}\n\n포켓몬사탕 10개당 1 로그포인트로 환전합니다.\n\n[확인] 이 포켓몬의 사탕 사용`,
      );
      return;
    }

    if (this.selectingShopDestination && this.pendingShopListing) {
      const listing = this.pendingShopListing;
      const itemName = this.getListingDisplayName(listing);
      const itemDesc =
        typeof listing.option?.type?.getDescription === "function"
          ? listing.option.type.getDescription()
          : "설명이 없습니다.";

      const firstLabel =
        listing.purchaseMode === "TRAINER_LOADOUT"
          ? "즉시 반영"
          : listing.purchaseMode === "SELECT_POKEMON"
            ? "포켓몬에게 적용"
            : "즉시 사용";

      const options = [
        `${this.shopDestinationCursor === 0 ? "▶" : "  "} ${firstLabel}`,
        `${this.shopDestinationCursor === 1 ? "▶" : "  "} 창고에 보관`,
        `${this.shopDestinationCursor === 2 ? "▶" : "  "} 취소`,
      ].join("\n");

      this.detailTitleText.setText(itemName);
      this.detailBodyText.setText(
        `가격: ${listing.priceRp} RP\n재고: ${listing.stock}\n\n${itemDesc}\n\n[구매 후 처리]\n${options}`,
      );
      return;
    }

    if (this.currentTab === "SHOP") {
      const listing = selected as RogueShopListing;

      // ★ 쿠폰 교환소는 일반 상품과 별도로 표시
      if (listing.specialAction === "COUPON") {
        this.detailTitleText.setText("쿠폰 교환소");
        this.detailBodyText.setText(
          "이벤트 및 기념 쿠폰 코드를\n" + "입력하여 특별한 보상을\n" + "받을 수 있습니다.\n\n" + "[확인] 쿠폰 입력",
        );
        return;
      }

      // 일반 상점 상품
      const itemName =
        typeof (listing.option?.type as any)?.getSafeName === "function"
          ? (listing.option!.type as any).getSafeName()
          : (listing.option?.type?.name ?? listing.id ?? "이름없음");

      const itemDesc =
        typeof listing.option?.type?.getDescription === "function"
          ? listing.option.type.getDescription()
          : "설명이 없습니다.";

      this.detailTitleText.setText(itemName);
      this.detailBodyText.setText(
        `등급: ${ModifierTier[listing.tier]}\n`
          + `가격: ${listing.priceRp} RP\n`
          + `재고: ${listing.stock}\n\n`
          + `${itemDesc}\n\n`
          + "[확인] 구매",
      );

      return;
    }

    if (this.currentTab === "BANK") {
      this.detailTitleText.setText(selected.name);
      this.detailBodyText.setText(
        `${selected.description}\n\n보유 RP: ${globalScene.gameData.roguePoints ?? 0}\n예치 RP: ${this.bankData.bankRoguePoints}\n보유 골드: ${globalScene.money ?? 0}\n예치 골드: ${this.bankData.bankGold}\n\n이자 시스템은 추후 연결`,
      );
      return;
    }

    if (this.currentTab === "QUEST") {
      const quest = selected as QuestEntry;

      this.detailBodyText.off("pointerover");
      this.detailBodyText.off("pointerout");

      const categoryText =
        quest.category === "REQUEST" ? "일반 의뢰" : quest.category === "BOUNTY" ? "현상수배" : "미션";

      const statusText = quest.completed ? "완료" : quest.accepted ? "수행 중" : "미수락";

      const actionText = quest.completed
        ? "완료된 의뢰입니다."
        : quest.accepted
          ? "[확인] 수락 취소"
          : `[확인] 의뢰 수락 (${questManager.getAcceptedQuestCount()}/${questManager.getMaxAcceptedQuests()})`;

      // 의뢰 상세창 전용 글씨 크기
      this.detailTitleText.setFontSize(78);
      this.detailBodyText.setFontSize(72);

      this.detailTitleText.setText(quest.title);

      this.detailBodyText.setText(
        `[${categoryText}] ${statusText} ${quest.progress}/${quest.requirement}\n\n` + `${quest.description}`,
      );

      // 마우스를 올리면 전체 의뢰 내용 표시
      const itemRewardText =
        (quest.rewardItems ?? []).length > 0
          ? (quest.rewardItems ?? [])
              .map(item => {
                const display = this.getStorageDisplayMeta(item.modifierTypeId);

                return `${display.name} x${item.quantity}`;
              })
              .join("\n")
          : "없음";

      const rewardTooltipText =
        `${quest.description}\n\n`
        + "[보상]\n"
        + `로그포인트: ${quest.rewardRp} RP\n`
        + `골드: ${quest.rewardGold} G\n`
        + `아이템:\n${itemRewardText}`;

      this.detailBodyText.on("pointerover", () => {
        globalScene.ui.showTooltip(quest.title, rewardTooltipText, true);
      });

      this.detailBodyText.on("pointerout", () => {
        globalScene.ui.hideTooltip();
      });

      this.questFooterText
        .setText(`[보상] ${quest.rewardRp} RP / ${quest.rewardGold} G\n` + `${actionText}`)
        .setVisible(true);

      return;
    }

    if (this.currentTab === "MINE") {
      const mineEntry = selected as RogueWorkshopEntry;

      this.detailTitleText.setText("로그광산");
      this.detailBodyText.setText(
        `${mineEntry.description}\n\n`
          + "곡괭이와 망치를 이용하여\n"
          + "암반 속 자원을 발굴합니다.\n\n"
          + "[확인] 로그광산 입장",
      );

      return;
    }

    if (this.currentTab === "WORKSHOP") {
      const entry = selected as RogueWorkshopEntry;

      this.detailTitleText.setText(entry.name);
      this.detailBodyText.setText(
        `${entry.description}\n\n`
          + "재료 슬롯 3칸에 원하는 재료를 넣으면\n"
          + "등록된 조합에 따라 결과물이 결정됩니다.\n\n"
          + "현재 공방소에서 만든 완성품은\n"
          + "자동으로 창고에 보관됩니다.\n\n"
          + "[확인] 제작대 열기",
      );
      return;
    }

    if (this.currentTab === "PRACTICE") {
      this.detailTitleText.setText("연습센터");
      this.detailBodyText.setText(
        "연습모드를 시작합니다.\n\n시작 바이옴은 TUTORIAL_ROOM으로 고정됩니다.\n보상과 진행은 추후 연습 전용 규칙으로 분리할 수 있습니다.\n\n[확인] 연습모드 시작",
      );
      return;
    }

    const storageItem = selected as RogueShopStorageEntry;
    this.detailTitleText.setText(storageItem.name);
    const canAssignToStarter = (this.uiArgs?.starters?.length ?? 0) > 0;

    const actionText =
      storageItem.purchaseMode === "SELECT_POKEMON"
        ? canAssignToStarter
          ? "[확인] 꺼내서 포켓몬에게 지급"
          : "[확인] 스타터 선택 단계에서만 장착 가능"
        : "[확인] 꺼내기";

    this.detailBodyText.setText(`보관 수량: ${storageItem.quantity}\n\n${storageItem.description}\n\n${actionText}`);
  }

  private setNotice(text: string, duration = 1200): void {
    this.footerHelpText.setText(text);

    if (this.noticeTimer) {
      this.noticeTimer.remove(false);
      this.noticeTimer = undefined;
    }

    this.noticeTimer = globalScene.time.delayedCall(duration, () => {
      this.refreshHelpText();
      this.noticeTimer = undefined;
    });
  }

  private calcShopStarterIconY(index: number): number {
    return 64 + index * 14;
  }

  private refreshHelpText(): void {
    if (this.selectingShopDestination) {
      this.footerHelpText.setText("←→ 또는 ↑↓ 선택  Z 확인  X 취소");
      return;
    }

    if (this.storageApplyMode) {
      this.footerHelpText.setText("↑↓ 선택  Z 확인  X 이전");
      return;
    }

    if (this.selectingTarget) {
      this.footerHelpText.setText("↑↓ 스타팅 선택  Z 확인  X 취소");
      return;
    }

    if (this.selectingCandySpecies) {
      this.footerHelpText.setText("↑↓ 포켓몬 선택  Z 확인  X 취소");
      return;
    }

    const hasStarterSelection = (this.uiArgs?.starters?.length ?? 0) > 0;
    const exitLabel = this.uiArgs?.source === "STARTER_SELECT" ? "X 출발" : "X 나가기";

    if (this.currentTab === "STORAGE" && hasStarterSelection) {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 창고 선택  Z 장착/꺼내기  ${exitLabel}`);
      return;
    }

    if (this.currentTab === "SHOP") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 상품 선택  Z 구매  ${exitLabel}`);
    } else if (this.currentTab === "BANK") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 항목 선택  Z 실행  ${exitLabel}`);
    } else if (this.currentTab === "QUEST") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 의뢰 선택  Z 확인  ${exitLabel}`);
    } else if (this.currentTab === "PRACTICE") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 설정 선택  Z 확인  ${exitLabel}`);
    } else if (this.currentTab === "WORKSHOP") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 선택  Z 제작대 열기  ${exitLabel}`);
    } else if (this.currentTab === "MINE") {
      this.footerHelpText.setText(`←→ 탭 이동  Z 로그광산 입장  ${exitLabel}`);
    } else {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 창고 선택  Z 조작  ${exitLabel}`);
    }
  }

  private tryConsumeListingPurchase(listing: RogueShopListing): boolean {
    if (listing.stock <= 0) {
      this.setNotice("매진된 상품입니다.");
      this.getUi().playError();
      return false;
    }

    const spent = globalScene.gameData.spendroguePoints(listing.priceRp);
    if (!spent) {
      this.setNotice("로그포인트가 부족합니다.");
      this.getUi().playError();
      return false;
    }

    listing.stock--;
    return true;
  }

  private finishShopPurchaseCleanup(): void {
    this.selectingShopDestination = false;
    this.pendingShopListing = null;
    this.shopDestinationCursor = 0;

    this.storageItems = this.buildStorageEntries();
    this.syncBankDataWithGame();
    this.refreshMoneyTexts();
    this.refreshList();
    this.refreshDetail();
    this.refreshHelpText();
    globalScene.gameData.saveSystem();
  }

  private parseBerryTypeFromItemId(itemId: string): BerryType | null {
    if (!itemId.startsWith("BERRY_")) {
      return null;
    }

    const berryIndex = Number(itemId.replace("BERRY_", ""));
    if (Number.isNaN(berryIndex)) {
      return null;
    }

    return berryIndex as BerryType;
  }

  private resolveModifierTypeFromStorageItemId(itemId: string): ModifierType | null {
    const generated = this.resolveGeneratedStorageModifierType(itemId);
    if (generated) {
      return generated;
    }

    const direct = getModifierTypeById(itemId);
    if (direct) {
      return direct;
    }

    const func = (modifierTypes as any)[itemId];
    if (typeof func === "function") {
      const type = func() as ModifierType;
      type.id = itemId;
      return type;
    }

    console.warn("[ROGUE_SHOP] modifierType not found by id", itemId);
    return null;

    if (itemId.startsWith("BERRY_")) {
      const berryType = Number(itemId.split("_")[1]) as BerryType;
      const gen = modifierTypes.BERRY().withIdFromFunc(modifierTypes.BERRY) as ModifierTypeGenerator;
      return gen.generateType([], [berryType]) as ModifierType;
    }

    if (itemId.startsWith("TYPE_SPECIFIC_MOVE_BOOSTER_")) {
      const type = Number(itemId.split("_").pop()) as PokemonType;
      const gen = modifierTypes
        .TYPE_SPECIFIC_MOVE_BOOSTER()
        .withIdFromFunc(modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER) as ModifierTypeGenerator;
      return gen.generateType([], [type]) as ModifierType;
    }

    if (itemId.startsWith("ATTACK_TYPE_BOOSTER_")) {
      const type = Number(itemId.split("_").pop()) as PokemonType;
      const gen = modifierTypes
        .ATTACK_TYPE_BOOSTER()
        .withIdFromFunc(modifierTypes.ATTACK_TYPE_BOOSTER) as ModifierTypeGenerator;
      return gen.generateType([], [type]) as ModifierType;
    }

    if (itemId.startsWith("modifierType:SpeciesBoosterItem.")) {
      const key = itemId.replace("modifierType:SpeciesBoosterItem.", "");

      const rareGen = modifierTypes
        .RARE_SPECIES_STAT_BOOSTER?.()
        ?.withIdFromFunc(modifierTypes.RARE_SPECIES_STAT_BOOSTER) as ModifierTypeGenerator | undefined;

      const normalGen = modifierTypes.SPECIES_STAT_BOOSTER?.()?.withIdFromFunc(modifierTypes.SPECIES_STAT_BOOSTER) as
        | ModifierTypeGenerator
        | undefined;

      return (
        (rareGen?.generateType([], [key]) as ModifierType)
        ?? (normalGen?.generateType([], [key]) as ModifierType)
        ?? null
      );
    }

    return getModifierTypeById(itemId) ?? null;
  }

  private purchaseListingToStorage(listing: RogueShopListing): boolean {
    if (!this.tryConsumeListingPurchase(listing)) {
      return true;
    }

    const ballType = this.getPokeballTypeFromShopId(listing.id);

    const storageItemId = ballType !== null ? `BALL_${ballType}` : this.getStorageItemIdFromListing(listing);

    // 몬스터볼류는 1회 구매당 5개
    const storageAmount = ballType !== null ? 5 : 1;

    const stored = globalScene.gameData.addToStorage(storageItemId, storageAmount, {
      purchaseMode: listing.purchaseMode,
    });

    if (!stored) {
      globalScene.gameData.addRoguePoints(listing.priceRp);
      listing.stock++;

      this.setNotice("창고 저장에 실패했습니다.");
      this.getUi().playError();
      return true;
    }

    const itemName = this.getListingDisplayName(listing);

    this.finishShopPurchaseCleanup();

    this.setNotice(
      ballType !== null
        ? `${itemName} x5 구매 완료! 창고에 저장했습니다.`
        : `${itemName} 구매 완료! 창고에 저장했습니다.`,
    );

    this.getUi().playSelect();
    return true;
  }

  private addPendingRunItemOnce(itemId: string): boolean {
    (globalScene.gameData as any).pendingRunItems ??= [];

    const pendingRunItems = (globalScene.gameData as any).pendingRunItems as string[];

    if (pendingRunItems.includes(itemId)) {
      console.warn("[ROGUE_SHOP] duplicate pendingRunItem blocked", itemId);
      return false;
    }

    pendingRunItems.push(itemId);
    console.log("[ROGUE_SHOP] pendingRunItem added", itemId, pendingRunItems);
    return true;
  }

  private getTrainerItemMaxStackCount(modifierType: any): number {
    const modifier = modifierType?.newModifier?.();

    if (modifier && typeof (modifier as any).getMaxStackCount === "function") {
      return Math.max(1, (modifier as any).getMaxStackCount());
    }

    if (typeof modifierType?.getMaxStackCount === "function") {
      return Math.max(1, modifierType.getMaxStackCount());
    }

    return 1;
  }

  private getOwnedTrainerItemCount(itemId: string): number {
    const existing = globalScene.findModifier(m => {
      const mid = (m as any)?.type?.id;
      return mid === itemId;
    }) as any;

    return existing?.stackCount ?? (existing ? 1 : 0);
  }

  private getPendingRunItemCount(itemId: string): number {
    const pendingRunItems = ((globalScene.gameData as any).pendingRunItems ?? []) as string[];
    return pendingRunItems.filter(id => id === itemId).length;
  }

  private addPendingRunItems(itemId: string, amount: number, maxStackCount: number): boolean {
    (globalScene.gameData as any).pendingRunItems ??= [];
    const pendingRunItems = (globalScene.gameData as any).pendingRunItems as string[];

    const current = this.getPendingRunItemCount(itemId);
    if (current + amount > maxStackCount) {
      return false;
    }

    for (let i = 0; i < amount; i++) {
      pendingRunItems.push(itemId);
    }

    return true;
  }

  private purchaseTrainerLoadoutDirectly(listing: RogueShopListing): boolean {
    const modifierType = listing.option?.type;
    if (!modifierType) {
      this.setNotice("도구 정보를 찾을 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    const alreadyOwned = globalScene.findModifier(m => {
      const mid = (m as any)?.type?.id;
      return mid === listing.id;
    });

    if (alreadyOwned) {
      this.setNotice("이미 보유 중인 트레이너 도구입니다.");
      this.getUi().playError();
      return true;
    }

    if (!this.tryConsumeListingPurchase(listing)) {
      return true;
    }

    if (this.uiArgs?.source === "MENU") {
      const modifier = modifierType.newModifier();
      if (!modifier || !globalScene.addModifier(modifier, false, false)) {
        globalScene.gameData.addRoguePoints(listing.priceRp);
        listing.stock++;
        this.setNotice("트레이너 도구를 지급할 수 없습니다.");
        this.getUi().playError();
        return true;
      }
      globalScene.updateModifiers?.(true);
    } else {
      const added = this.addPendingRunItemOnce(listing.id);
      if (!added) {
        globalScene.gameData.addRoguePoints(listing.priceRp);
        listing.stock++;
        this.setNotice("이미 예약된 트레이너 도구입니다.");
        this.getUi().playError();
        return true;
      }
    }

    const itemName = this.getListingDisplayName(listing);
    this.finishShopPurchaseCleanup();
    this.setNotice(`${itemName} 즉시 반영 완료`);
    this.getUi().playSelect();
    return true;
  }

  private purchaseInstantListing(listing: RogueShopListing): boolean {
    if (!this.tryConsumeListingPurchase(listing)) {
      return true;
    }

    const itemName = this.getListingDisplayName(listing);

    if (listing.id === "VOUCHER" || listing.id === "VOUCHER_REGULAR" || listing.id === "EGG_VOUCHER") {
      this.addVoucherCount(VoucherType.REGULAR, 1);
      this.finishShopPurchaseCleanup();
      this.setNotice(`${itemName} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (listing.id === "VOUCHER_PLUS" || listing.id === "EGG_VOUCHER_PLUS") {
      this.addVoucherCount(VoucherType.PLUS, 1);
      this.finishShopPurchaseCleanup();
      this.setNotice(`${itemName} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (listing.id === "VOUCHER_PREMIUM" || listing.id === "EGG_VOUCHER_PREMIUM") {
      this.addVoucherCount(VoucherType.PREMIUM, 1);
      this.finishShopPurchaseCleanup();
      this.setNotice(`${itemName} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (
      listing.id === "VOUCHER_GOLD"
      || listing.id === "VOUCHER_GOLDEN"
      || listing.id === "EGG_VOUCHER_GOLD"
      || listing.id === "EGG_VOUCHER_GOLDEN"
    ) {
      this.addVoucherCount(VoucherType.GOLDEN, 1);
      this.finishShopPurchaseCleanup();
      this.setNotice(`${itemName} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    const ballType = this.getPokeballTypeFromShopId(listing.id);

    if (ballType !== null) {
      const amount = 5;

      if (this.uiArgs?.source === "MENU") {
        // 진행 중인 런에서 구매
        globalScene.pokeballCounts[ballType] = (globalScene.pokeballCounts[ballType] ?? 0) + amount;
      } else {
        // 새 런 시작 전에 구매
        globalScene.gameData.pendingRunItems ??= [];

        const storageId = `BALL_${ballType}`;

        for (let i = 0; i < amount; i++) {
          globalScene.gameData.pendingRunItems.push(storageId);
        }
      }

      this.finishShopPurchaseCleanup();
      this.setNotice(`${this.getListingDisplayName(listing)} x${amount} 획득 완료`);
      this.getUi().playSelect();

      return true;
    }

    if (this.uiArgs?.source !== "MENU") {
      (globalScene.gameData as any).pendingRunItems ??= [];
      (globalScene.gameData as any).pendingRunItems.push(listing.id);
    }

    this.finishShopPurchaseCleanup();
    this.setNotice(`${itemName} 즉시 적용 완료`);
    this.getUi().playSelect();
    return true;
  }

  clearText(): void {
    if (this.noticeTimer) {
      this.noticeTimer.remove(false);
      this.noticeTimer = undefined;
    }

    this.refreshHelpText();
  }

  tryExit(): void {
    console.log("[ROGUE_SHOP] tryExit", this.uiArgs);

    this.selectingTarget = false;
    this.pendingTargetListing = null;
    this.pendingStorageItem = null;

    this.selectingCandySpecies = false;
    this.candySpeciesList = [];
    this.pendingExchangeEntry = null;
    this.listCursor = 0;
    this.listScroll = 0;

    if (this.noticeTimer) {
      this.noticeTimer.remove(false);
      this.noticeTimer = undefined;
    }

    this.rootContainer.setVisible(false);

    // 중요: 현재 핸들러 상태 정리
    this.clear();

    if (this.uiArgs?.onExit) {
      console.log("[ROGUE_SHOP] calling onExit");
      this.uiArgs.onExit();
      return;
    }

    // onExit가 없을 때만 기본 복귀
    this.getUi().setMode(UiMode.TITLE);
  }

  private getStorageDisplayMeta(itemId: string): { name: string; description: string } {
    const pokeballType = this.parsePokeballTypeFromStorageId(itemId);

    if (pokeballType !== null) {
      return {
        name: getPokeballName(pokeballType),
        description: "포켓몬을 포획할 때 사용하는 몬스터볼입니다.",
      };
    }

    const apricornType = this.parseApricornTypeFromItemId(itemId);

    if (apricornType !== null) {
      return {
        name: getApricornName(apricornType),
        description: "몬스터볼 제작 등에 사용하는 규토리입니다.",
      };
    }

    const berryType = this.parseBerryTypeFromItemId(itemId);

    if (berryType !== null) {
      return {
        name: getBerryName(berryType) ?? "열매",
        description: getBerryEffectDescription(berryType) ?? "열매 아이템입니다.",
      };
    }

    if (itemId === "BERRY") {
      return {
        name: "열매",
        description: "열매 아이템입니다.",
      };
    }

    const modifierType = this.resolveGeneratedStorageModifierType(itemId) ?? getModifierTypeById(itemId);
    if (modifierType) {
      const name =
        typeof (modifierType as any).getSafeName === "function"
          ? (modifierType as any).getSafeName()
          : (modifierType.name ?? itemId);

      const description =
        typeof modifierType.getDescription === "function"
          ? modifierType.getDescription()
          : "창고에 보관된 아이템입니다.";

      return { name, description };
    }

    return {
      name: itemId,
      description: "창고에 보관된 아이템입니다.",
    };
  }

  private tryStartRun(): void {
    console.log("[ROGUE_SHOP] tryStartRun", this.uiArgs);

    this.selectingTarget = false;
    this.pendingTargetListing = null;
    this.pendingStorageItem = null;

    this.selectingCandySpecies = false;
    this.candySpeciesList = [];
    this.pendingExchangeEntry = null;
    this.listCursor = 0;
    this.listScroll = 0;

    if (this.noticeTimer) {
      this.noticeTimer.remove(false);
      this.noticeTimer = undefined;
    }

    this.rootContainer.setVisible(false);

    // 중요: 현재 핸들러 상태 정리
    this.clear();

    if (this.uiArgs?.onStartRun) {
      this.uiArgs.onStartRun();
      return;
    }

    this.getUi().setMode(UiMode.MESSAGE);
  }

  clear(): void {
    super.clear();

    if (this.noticeTimer) {
      this.noticeTimer.remove(false);
      this.noticeTimer = undefined;
    }

    this.rootContainer?.setVisible(false);

    this.selectingTarget = false;
    this.pendingTargetListing = null;
    this.pendingStorageItem = null;

    this.selectingCandySpecies = false;
    this.candySpeciesList = [];
    this.pendingExchangeEntry = null;

    this.listCursor = 0;
    this.listScroll = 0;

    this.refreshHelpText();
  }
}
