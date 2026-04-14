import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { ExchangeCurrencyType } from "#enums/exchange-currency-type";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { ModifierTier } from "#enums/modifier-tier";
import type { Starter } from "#types/save-data";
import { MessageUiHandler } from "#ui/message-ui-handler";
import { addTextObject } from "#ui/text";
import { addWindow } from "#ui/ui-theme";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import type { ModifierTypeOption } from "#modifiers/modifier-type";
import { allMoves, allSpecies, biomeDepths, modifierTypes } from "#data/data-lists";
import {
  ConsumableModifier,
  ConsumablePokemonModifier,
  DoubleBattleChanceBoosterModifier,
  ExpBalanceModifier,
  ExpShareModifier,
  FusePokemonModifier,
  HealingBoosterModifier,
  ModifierBar,
  PersistentModifier,
  PokemonExpBoosterModifier,
  PokemonFormChangeItemModifier,
  PokemonHeldItemModifier,
  PokemonHpRestoreModifier,
  PokemonIncrementingStatModifier,
  RememberMoveModifier,
  StackingPowerBoosterModifier,
  PokemonDefensiveStatModifier,
  SpeedStatModifier,
  SpAtkStatModifier,
  AtkStatModifier,
} from "#modifiers/modifier";
import {
  getDefaultModifierTypeForTier,
  getEnemyModifierTypesForWave,
  getLuckString,
  getLuckTextTint,
  getPartyLuckValue,
  type ModifierType,
  PokemonHeldItemModifierType,
} from "#modifiers/modifier-type";
import { buildRogueShopListings } from "#modifiers/rogue-shop-utils";
import { BankCurrencyType } from "#enums/bank-currency-type";
import type { RogueBankExchangeEntry } from "ui/rogue-bank-exchange-types";
import type { SpeciesId } from "#enums/species-id";

export type RogueShopTab = "SHOP" | "BANK" | "STORAGE";

export interface RogueShopBankData {
  roguePoints: number;
  gold: number;
  bankRoguePoints: number;
  bankGold: number;
}

export interface RogueShopStorageEntry {
  id: string;
  name: string;
  quantity: number;
  description: string;
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
  allowPreRunPurchase?: boolean;
  allowRewardUse?: boolean;
  allowSendItems?: boolean;

  initialTab?: RogueShopTab;
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

export interface RogueShopListing {
  id: string;
  tier: ModifierTier;
  priceRp: number;
  stock: number;
  purchaseMode: "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT";
  option: ModifierTypeOption;
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

  private uiArgs: RogueShopUiArgs | null = null;
  private enabledTabs: RogueShopTab[] = ["SHOP", "BANK", "STORAGE"];

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

  this.titleText = addTextObject(8, 6, "로그상점", TextStyle.SUMMARY);

  this.moneyWindow = addWindow(214, 4, 103, 28);
  this.tabWindow = addWindow(4, 20, 206, 18);
  this.mainListWindow = addWindow(4, 38, 140, 124);
  this.detailWindow = addWindow(146, 38, 171, 124);
  this.helpWindow = addWindow(4, 162, 313, 18);

  this.valueRoguePointText = addTextObject(220, 9, "RP: 0", TextStyle.WINDOW);
  this.valueGoldText = addTextObject(270, 9, "G: 0", TextStyle.WINDOW);

  const tabLabels = ["상점", "은행", "창고"];
  for (let i = 0; i < tabLabels.length; i++) {
    const tabText = addTextObject(16 + i * 42, 25, tabLabels[i], TextStyle.WINDOW);
    this.tabTexts.push(tabText);
  }

  this.tabCursorObj = globalScene.add.image(10, 23, "select_cursor").setOrigin(0);
  this.listCursorObj = globalScene.add.image(8, 44, "select_cursor").setOrigin(0);

  for (let i = 0; i < this.visibleRows; i++) {
    const rowText = addTextObject(16, 44 + i * 14, "", TextStyle.WINDOW);
    this.listTextObjects.push(rowText);
  }

  this.detailTitleText = addTextObject(152, 44, "", TextStyle.SUMMARY);
  this.detailBodyText = addTextObject(152, 60, "", TextStyle.WINDOW, { maxLines: 7 });
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
    this.starterPanelWindow,
    this.starterPanelTitleText,
    this.starterIconsContainer,
  ]);
}

  show(args: any[]): boolean {
    super.show(args);

    console.log("[ROGUE_SHOP] show called", args);

    this.uiArgs = args?.length ? (args[0] as RogueShopUiArgs) : null;
    this.rootContainer.setVisible(true);

    this.shopListings = buildRogueShopListings();

    const storedItems = globalScene.gameData.getStorageItems();

this.storageItems = storedItems.map(item => ({
  id: item.itemId,
  name: item.itemId,
  quantity: item.quantity,
  description: "창고에 보관된 아이템입니다.",
}));

    const allowShop = this.uiArgs?.allowShop ?? true;
    const allowBank = this.uiArgs?.allowBank ?? true;
    const allowStorage = this.uiArgs?.allowStorage ?? true;

    const enabledTabs: RogueShopTab[] = [];
    if (allowShop) enabledTabs.push("SHOP");
    if (allowBank) enabledTabs.push("BANK");
    if (allowStorage) enabledTabs.push("STORAGE");
    this.enabledTabs = enabledTabs.length ? enabledTabs : ["SHOP"];

    const requestedInitialTab = this.uiArgs?.initialTab;
    const initialTabIndex = requestedInitialTab != null ? this.enabledTabs.indexOf(requestedInitialTab) : -1;

    this.tabCursor = initialTabIndex >= 0 ? initialTabIndex : 0;
    this.currentTab = this.enabledTabs[this.tabCursor];
    this.listCursor = 0;
    this.listScroll = 0;

    this.selectingTarget = false;
    this.pendingTargetListing = null;
    this.targetCursor = 0;

    this.selectingCandySpecies = false;
this.candySpeciesList = [];
this.pendingExchangeEntry = null;
this.listCursor = 0;
this.listScroll = 0;

this.syncBankDataWithGame();
this.refreshMoneyTexts();
this.refreshTabTexts();
this.refreshStarterIcons();
this.refreshTabCursor();
this.refreshList();
this.refreshDetail();
this.refreshHelpText();

this.defaultHelpText = this.footerHelpText.text;

    return true;
  }

  private getButtonName(button: Button): string {
  return Button[button] ?? `UNKNOWN(${button})`;
}

processInput(button: Button): boolean {
  console.log(
    "[ROGUE_SHOP] processInput",
    button,
    this.getButtonName(button),
    "tab=",
    this.currentTab,
    "selectingTarget=",
    this.selectingTarget
  );

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
  console.log("[ROGUE_SHOP] submit -> tryStartRun");
  this.tryStartRun();
  return true;

case Button.ACTION:
  console.log("[ROGUE_SHOP] action -> handleSubmit");
  success = this.handleSubmit();
  break;

case Button.CANCEL:
  console.log("[ROGUE_SHOP] cancel -> tryExit");
  this.tryExit();
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
          this.setNotice(
            `${selected.name} 사탕 ${result.consumedAmount} 사용 -> RP ${result.gainedRp}`
          );
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
  if (!this.candySpeciesList.length) {
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

  if (!starters.length) {
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

  // 창고 아이템 지급
  if (this.pendingStorageItem) {
    const item = this.pendingStorageItem;

    const moved = globalScene.gameData.moveStorageItemToRun(item.id, 1);
    if (!moved) {
      this.setNotice("창고에서 아이템을 꺼낼 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    (starter as any).preRunItems ??= [];
    (starter as any).preRunItems.push(item.id);

    this.pendingStorageItem = null;
    this.selectingTarget = false;

    const storedItems = globalScene.gameData.getStorageItems();
    this.storageItems = storedItems.map(entry => ({
      id: entry.itemId,
      name: entry.itemId,
      quantity: entry.quantity,
      description: "창고에 보관된 아이템입니다.",
    }));

    this.refreshStarterIcons();
    this.refreshList();
    this.refreshDetail();
    this.refreshHelpText();

    const speciesName = getPokemonSpecies(starter.speciesId).name;
    this.setNotice(`${item.name}을(를) ${speciesName}에게 지급 예정으로 등록했습니다.`, 1500);
    this.getUi().playSelect();
    return true;
  }

  // 기존 상점 상품 지급
  const listing = this.pendingTargetListing;
  if (!listing) {
    return false;
  }

  if (listing.stock <= 0) {
    this.setNotice("매진된 상품입니다.");
    this.getUi().playError();
    return true;
  }

  const spent = globalScene.gameData.spendroguePoints(listing.priceRp);
  if (!spent) {
    this.setNotice("로그포인트가 부족합니다.");
    this.getUi().playError();
    return true;
  }

  listing.stock--;

  (starter as any).preRunItems ??= [];
  (starter as any).preRunItems.push(listing.id);

  this.selectingTarget = false;
  this.pendingTargetListing = null;

  this.syncBankDataWithGame();
  this.refreshMoneyTexts();
  this.refreshStarterIcons();
  this.refreshHelpText();

  const speciesName = getPokemonSpecies(starter.speciesId).name;
  this.setNotice(`${listing.option.type.name}을(를) ${speciesName}에게 지급 예정으로 등록했습니다.`, 1500);
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
    default:
      return false;
  }
}

  private handleShopConfirm(): boolean {
  const listing = this.shopListings[this.listCursor];
  if (!listing) {
    return false;
  }

  if (listing.stock <= 0) {
    this.setNotice("매진된 상품입니다.");
    this.getUi().playError();
    return true;
  }

  const spent = globalScene.gameData.spendroguePoints(listing.priceRp);
  if (!spent) {
    this.setNotice("로그포인트가 부족합니다.");
    this.getUi().playError();
    return true;
  }

  const stored = globalScene.gameData.addToStorage(listing.id, 1);

  if (!stored) {
    globalScene.gameData.addRoguePoints(listing.priceRp);
    this.setNotice("창고 저장에 실패했습니다.");
    this.getUi().playError();
    return true;
  }

  listing.stock--;

  const storedItems = globalScene.gameData.getStorageItems();
  this.storageItems = storedItems.map(item => ({
    id: item.itemId,
    name: item.itemId,
    quantity: item.quantity,
    description: "창고에 보관된 아이템입니다.",
  }));

  this.syncBankDataWithGame();
  this.refreshMoneyTexts();
  this.refreshList();
  this.refreshDetail();
  globalScene.gameData.saveSystem();

  this.setNotice(`${listing.option.type.name} 구매 완료! 창고에 저장했습니다.`);
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

  if (!this.candySpeciesList.length) {
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
  this.setNotice("사탕을 사용할 포켓몬을 선택하세요.", 1500);
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

            const result = globalScene.gameData.exchangeCurrencyToRoguePoints(
              exchangeType,
              amount,
            );

            if (result.success) {
              this.setNotice(
                `${entry.name} / ${result.consumedAmount} 사용 -> RP ${result.gainedRp}`
              );
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
            const label =
              entry.currency === BankCurrencyType.ROGUE_POINTS
                ? "로그포인트"
                : "골드";

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

    const result = globalScene.gameData.exchangeCurrencyToRoguePoints(
      exchangeType,
      entry.amount,
    );

    if (result.success) {
      this.setNotice(
        `${entry.name} / ${result.consumedAmount} 사용 -> RP ${result.gainedRp}`
      );
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

  const starters = this.uiArgs?.starters ?? [];
  if (!starters.length) {
    this.setNotice("선택된 스타팅이 없습니다.");
    this.getUi().playError();
    return true;
  }

  this.selectingTarget = true;
  this.pendingStorageItem = item;
  this.targetCursor = 0;
  this.refreshStarterIcons();
  this.refreshHelpText();
  this.setNotice(`${item.name}을(를) 줄 스타팅을 선택하세요.`, 2000);
  return true;
}

  private syncTabFromCursor(): void {
    this.currentTab = this.enabledTabs[this.tabCursor];
  }

  private resetListState(): void {
    this.listCursor = 0;
    this.listScroll = 0;
  }

  private moveTabCursor(delta: number): boolean {
    const next = this.tabCursor + delta;
    if (next < 0 || next >= this.enabledTabs.length) {
      return false;
    }

    this.tabCursor = next;
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

  private getCurrentList(): Array<RogueShopListing | RogueShopStorageEntry | RogueBankActionEntry | RogueBankCandySpeciesEntry> {

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

  return this.storageItems;
}

  private refreshMoneyTexts(): void {
    this.valueRoguePointText.setText(`RP: ${globalScene.gameData.roguePoints ?? 0}`);
    this.valueGoldText.setText(`G: ${globalScene.money ?? 0}`);
  }

  private refreshTabCursor(): void {
    const tabXPositions = [10, 52, 94];
    this.tabCursorObj.setPosition(tabXPositions[this.tabCursor] ?? 10, 23);

    const list = this.getCurrentList();
    const listY = 44 + (this.listCursor - this.listScroll) * 14;
    this.listCursorObj.setPosition(8, listY);
    this.listCursorObj.setVisible(list.length > 0);
  }

  private refreshTabTexts(): void {
    const allTabs: RogueShopTab[] = ["SHOP", "BANK", "STORAGE"];
    const labels: Record<RogueShopTab, string> = {
      SHOP: "상점",
      BANK: "은행",
      STORAGE: "창고",
    };

    const xPositions = [16, 58, 100];

    for (let i = 0; i < this.tabTexts.length; i++) {
      const tab = allTabs[i];
      const enabledIndex = this.enabledTabs.indexOf(tab);

      if (enabledIndex >= 0) {
        this.tabTexts[i].setVisible(true);
        this.tabTexts[i].setText(labels[tab]);
        this.tabTexts[i].setPosition(xPositions[enabledIndex], 25);
        this.tabTexts[i].setAlpha(1);
      } else {
        this.tabTexts[i].setVisible(false);
      }
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
      const soldOut = listing.stock <= 0 ? " [매진]" : "";
      const itemName = listing.option?.type?.name ?? listing.id ?? "이름없음";
      textObj.setText(`${itemName} - ${listing.priceRp}RP${soldOut}`);
    }

    // 창고
    else if (this.currentTab === "STORAGE") {
      const storageItem = row as RogueShopStorageEntry;
      textObj.setText(`${storageItem.name} x${storageItem.quantity}`);
    }

    // 은행 기본
    else {
      textObj.setText((row as RogueBankActionEntry).name);
    }
  }

  this.listCursorObj.setVisible(list.length > 0);
}

  private refreshStarterIcons(): void {
  const starters = this.uiArgs?.starters ?? [];

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

  if (this.selectingTarget && starters.length > 0) {
    this.starterIconCursorObj
      .setVisible(true)
      .setPosition(279, this.calcShopStarterIconY(this.targetCursor) - 1);
  } else {
    this.starterIconCursorObj.setVisible(false);
  }

  this.starterPanelWindow.setAlpha(this.selectingTarget ? 1 : 0.75);
  this.starterPanelTitleText.setAlpha(this.selectingTarget ? 1 : 0.75);
  this.starterPanelTitleText.setText(this.selectingTarget ? "대상 선택" : "스타팅");
}

  private refreshDetail(): void {
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
      `보유 사탕: ${candyEntry.candyCount}\n\n포켓몬사탕 10개당 1 로그포인트로 환전합니다.\n\n[확인] 이 포켓몬의 사탕 사용`
    );
    return;
  }

    if (this.currentTab === "SHOP") {
      const listing = selected as RogueShopListing;
      const itemName = listing.option?.type?.name ?? listing.id ?? "이름없음";
      const itemDesc =
        typeof listing.option?.type?.getDescription === "function"
          ? listing.option.type.getDescription()
          : "설명이 없습니다.";

      this.detailTitleText.setText(itemName);
      this.detailBodyText.setText(
        `등급: ${ModifierTier[listing.tier]}\n가격: ${listing.priceRp} RP\n재고: ${listing.stock}\n\n${itemDesc}\n\n[확인] 구매`,
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

    const storageItem = selected as RogueShopStorageEntry;
    this.detailTitleText.setText(storageItem.name);
    this.detailBodyText.setText(
      `보관 수량: ${storageItem.quantity}\n\n${storageItem.description}\n\n[확인] 아이템 조작`,
    );
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

    if (this.selectingCandySpecies) {
  this.footerHelpText.setText("↑↓ 포켓몬 선택  Z 결정  X 취소");
  return;
}

    if (this.selectingTarget) {
      this.footerHelpText.setText("↑↓ 대상 선택  Z 지급  X 취소");
      return;
    }

    const exitLabel = this.uiArgs?.source === "STARTER_SELECT" ? "X 출발" : "X 나가기";

    if (this.currentTab === "SHOP") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 상품 선택  Z 구매  ${exitLabel}`);
    } else if (this.currentTab === "BANK") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 항목 선택  Z 실행  ${exitLabel}`);
    } else {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 창고 선택  Z 조작  ${exitLabel}`);
    }
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

  this.rootContainer.setVisible(false);

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

  if (this.uiArgs?.onExit) {
    console.log("[ROGUE_SHOP] calling onExit");
    this.uiArgs.onExit();
  }
}

private tryStartRun(): void {
  console.log("[ROGUE_SHOP] tryStartRun", this.uiArgs);

  this.rootContainer.setVisible(false);

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

  this.uiArgs?.onStartRun?.();
  }
}