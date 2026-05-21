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
  getModifierTypeById,
  type ModifierType,
  PokemonHeldItemModifierType,
  ModifierTypeGenerator,
  BerryModifierType,
} from "#modifiers/modifier-type";
import { buildRogueShopListings } from "#modifiers/rogue-shop-utils";
import { BankCurrencyType } from "#enums/bank-currency-type";
import type { RogueBankExchangeEntry } from "ui/rogue-bank-exchange-types";
import type { SpeciesId } from "#enums/species-id";
import { getBerryName, getBerryEffectDescription } from "#data/berry";
import { BerryType } from "#enums/berry-type";
import { GameModes } from "#enums/game-modes";
import { getGameMode } from "#app/game-mode";
import { SelectStarterPhase } from "#phases/select-starter-phase";
import { VoucherType, vouchers } from "#system/voucher";
import { PokemonType } from "#enums/pokemon-type";
import { allAbilities } from "#data/data-lists";

export type RogueShopTab = "SHOP" | "BANK" | "STORAGE" | "PRACTICE";

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
  allowPreRunPurchase?: boolean;
  allowRewardUse?: boolean;
  allowSendItems?: boolean;

  initialTab?: RogueShopTab;

  onPracticeStart?: () => void;
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
  private enabledTabs: RogueShopTab[] = [
 "SHOP",
 "BANK",
 "STORAGE",
 "PRACTICE"
];

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

  private pendingShopListing: RogueShopListing | null = null;
  private selectingShopDestination = false;

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

  this.moneyWindow = addWindow(214, 4, 103, 28);
  this.tabWindow = addWindow(4, 20, 206, 18);
  this.mainListWindow = addWindow(4, 38, 140, 124);
  this.detailWindow = addWindow(146, 38, 171, 124);
  this.helpWindow = addWindow(4, 162, 313, 18);

  this.valueRoguePointText = addTextObject(220, 9, "RP: 0", TextStyle.WINDOW);
  this.valueGoldText = addTextObject(270, 9, "G: 0", TextStyle.WINDOW);

  const tabLabels = ["상점", "은행", "창고", "연습"];
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
    }))
);

    this.migrateLegacyBerryStorageItems();
    this.migrateBrokenGeneratedStorageItems();

    const storedItems = globalScene.gameData.getStorageItems();

    this.storageItems = this.buildStorageEntries();

    const allowShop = this.uiArgs?.allowShop ?? true;
    const allowBank = this.uiArgs?.allowBank ?? true;
    const allowStorage = this.uiArgs?.allowStorage ?? true;

    const enabledTabs: RogueShopTab[] = [];
if (allowShop) enabledTabs.push("SHOP");
if (allowBank) enabledTabs.push("BANK");
if (allowStorage) enabledTabs.push("STORAGE");
enabledTabs.push("PRACTICE");

this.enabledTabs = enabledTabs.length ? enabledTabs : ["PRACTICE"];

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

const hasStarters = (this.uiArgs?.starters?.length ?? 0) > 0;

this.starterPanelWindow.setVisible(hasStarters);
this.starterPanelTitleText.setVisible(hasStarters);
this.starterIconsContainer.setVisible(hasStarters);

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
    id.startsWith("ATTACK_TYPE_BOOSTER_") ||
    id.startsWith("TYPE_SPECIFIC_MOVE_BOOSTER_") ||
    id.startsWith("BERRY_") ||
    id.startsWith("modifierType:SpeciesBoosterItem.")
  ) {
    return id;
  }

  const args = type?.getPregenArgs?.();
  if (id && Array.isArray(args) && args.length > 0) {
    return `${id}_${args.join("_")}`;
  }

  return id;
}

private resolveGeneratedStorageModifierType(itemId: string): ModifierType | null {
  const attackMatch = itemId.match(/^ATTACK_TYPE_BOOSTER_(\d+)(?:_\d+)?$/);
  if (attackMatch) {
    const moveType = Number(attackMatch[1]) as PokemonType;
    const gen = modifierTypes.ATTACK_TYPE_BOOSTER().withIdFromFunc(modifierTypes.ATTACK_TYPE_BOOSTER) as ModifierTypeGenerator;
    return gen.generateType([], [moveType]) as ModifierType;
  }

  const gemMatch = itemId.match(/^TYPE_SPECIFIC_MOVE_BOOSTER_(\d+)(?:_\d+)?$/);
  if (gemMatch) {
    const moveType = Number(gemMatch[1]) as PokemonType;
    const gen = modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER().withIdFromFunc(modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER) as ModifierTypeGenerator;
    return gen.generateType([], [moveType]) as ModifierType;
  }

  const speciesMatch = itemId.match(/^modifierType:SpeciesBoosterItem\.(.+)$/);
  if (speciesMatch) {
    const key = speciesMatch[1];
    const rareGen = modifierTypes.RARE_SPECIES_STAT_BOOSTER().withIdFromFunc(modifierTypes.RARE_SPECIES_STAT_BOOSTER) as ModifierTypeGenerator;
    const normalGen = modifierTypes.SPECIES_STAT_BOOSTER().withIdFromFunc(modifierTypes.SPECIES_STAT_BOOSTER) as ModifierTypeGenerator;

    return (
      rareGen.generateType([], [key]) as ModifierType
    ) ?? (
      normalGen.generateType([], [key]) as ModifierType
    ) ?? null;
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
          this.selectedStorageAmount = Math.min(
            this.selectedStorageEntry.quantity,
            this.selectedStorageAmount + 1
          );
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
          this.selectedStorageAmount = Math.max(
            1,
            this.selectedStorageAmount - 1
          );
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

  globalScene.gameData.voucherCounts[voucherType] =
    (globalScene.gameData.voucherCounts[voucherType] ?? 0) + amount;

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

  if (entry.id === "VOUCHER_GOLD" || entry.id === "VOUCHER_GOLDEN" || entry.id === "EGG_VOUCHER_GOLD" || entry.id === "EGG_VOUCHER_GOLDEN") {
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

  this.selectedStorageAmount = Phaser.Math.Clamp(
    this.selectedStorageAmount,
    1,
    this.selectedStorageEntry.quantity
  );

  if (this.selectedStorageEntry.purchaseMode === "TRAINER_LOADOUT") {
    return this.handleStorageTrainerLoadoutDirectly();
  }

  this.selectingStorageItem = false;
  this.selectingStorageAmount = false;
  this.selectingStorageTarget = true;
  this.starterCursor = 0;

  this.refreshStorageApplyUi();
  this.setNotice("적용할 스타팅을 선택하세요.");
  this.getUi().playSelect();
  return true;
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
    this.setNotice(
      `${starterName}은(는) ${itemName}을(를) ${availableCapacity}개까지만 더 지닐 수 있습니다.`
    );
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
  amount: number
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

private getAvailableHeldItemCapacity(
  starter: Starter,
  entry: RogueShopStorageEntry
): number {
  if (entry.id === "BERRY") {
    console.warn("[ROGUE_SHOP] legacy BERRY entry detected, skipping capacity check", entry);
    return 99;
  }

  const targetPokemon = globalScene
    .getPlayerParty()
    .find(p => p.species.speciesId === starter.speciesId);

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
    m =>
      m instanceof PokemonHeldItemModifier &&
      m.pokemonId === targetPokemon.id &&
      m.matchType(dummyModifier)
  ) as PokemonHeldItemModifier | undefined;

  const maxStackCount =
    typeof (dummyModifier as any).getMaxStackCount === "function"
      ? (dummyModifier as any).getMaxStackCount()
      : 0;

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

  const brokenIds = [
    "TYPE_SPECIFIC_MOVE_BOOSTER",
    "ATTACK_TYPE_BOOSTER",
  ];

  for (const brokenId of brokenIds) {
    const item = storedItems.find(i => i.itemId === brokenId);
    if (!item) continue;

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

  const targetPokemon = party.find(
    p => p.species.speciesId === starter.speciesId
  );

  if (!targetPokemon) {
    return;
  }

  const modifierType = modifierTypes[itemId];
  if (!modifierType) {
    return;
  }

  globalScene.addModifier(
    modifierType,
    false,
    targetPokemon,
    1
  );
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

    if (!textObj) continue;

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
      const itemCount = ((starter as any).preRunItems?.length ?? 0);
      return `${cursor}${starterName} (${itemCount})`;
    })
    .join("\n");

  const stepText =
    this.selectingStorageItem ? "아이템 선택 중" :
    this.selectingStorageAmount ? "수량 선택 중" :
    this.selectingStorageTarget ? "대상 스타팅 선택 중" :
    "";

  const amountText =
    this.selectedStorageEntry ? `선택 수량: ${this.selectedStorageAmount}` : "";

  this.detailBodyText.setText(
    `${stepText}\n\n${amountText}\n\n[스타팅]\n${starterLines}`
  );
}

private getStorageList(): RogueShopStorageEntry[] {
  return this.storageItems;
}

private requiresPokemonTarget(entry: RogueShopStorageEntry): boolean {
  return entry.purchaseMode === "SELECT_POKEMON";
}

private applyStorageItemToStarter(
  entry: RogueShopStorageEntry,
  starter: Starter,
  amount: number
): number {
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
  const modifierType =
  this.resolveGeneratedStorageModifierType(itemId)
  ?? getModifierTypeById(itemId);
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

private buildStorageEntries(): RogueShopStorageEntry[] {
  const storedItems = globalScene.gameData.getStorageItems();

  console.log("[ROGUE_SHOP] raw storageItems", storedItems);

  return storedItems.map(item => {
    console.log("[ROGUE_SHOP] storage entry raw", item);

    const display = this.getStorageDisplayMeta(item.itemId);

    let purchaseMode: "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT" = "INSTANT";

    if (item.itemId.startsWith("BERRY_") || item.itemId === "BERRY") {
      purchaseMode = "SELECT_POKEMON";
    } else {
      const modifierType =
  this.resolveGeneratedStorageModifierType(item.itemId)
  ?? getModifierTypeById(item.itemId);
      if (modifierType && typeof (modifierType as any).getRogueShopPurchaseMode === "function") {
        purchaseMode = (modifierType as any).getRogueShopPurchaseMode();
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
    case "PRACTICE":
      return this.handlePracticeConfirm();
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

  private handlePracticeConfirm(): boolean {
  switch (this.listCursor) {
    case 0:
      return this.startPracticeMode();

    case 1:
      this.openPracticeLevelMenu();
      return true;

    case 2:
      this.openPracticeStatMenu();
      return true;

    case 3:
      this.openPracticeTypeMenu();
      return true;

    case 4:
      this.openPracticeAbilityMenu();
      return true;

    case 5:
      this.openPracticePassiveMenu();
      return true;

    case 6:
      return this.togglePracticeDummyCanAct();

    case 7:
      this.openPracticeMoveMenu();
      return true;

    case 8:
      this.openPracticeRentalModifierMenu();
      return true;

    case 9:
      return this.togglePracticeExpReward();

    case 10:
      return this.togglePracticeMoneyReward();

    case 11:
      return this.togglePracticeRpReward();

    case 12:
  return this.togglePracticeDummyFaint();

case 13:
  return this.resetPracticeDummyConfig();
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

private openPracticeLevelMenu(): void {
  this.getUi().setOverlayMode(UiMode.PRACTICE_LEVEL_FORM, {
    buttonActions: [
      (level: number) => {
        this.setNotice(`대타출동 레벨 ${level} 설정 완료`);
        this.getUi().revertMode();
      },
      () => {
        this.getUi().revertMode();
      },
    ],
  });
}

private openPracticeStatMenu(): void {
  this.getUi().setOverlayMode(UiMode.PRACTICE_STAT_FORM, {
    buttonActions: [
      () => {
        this.setNotice("대타출동 능력치 설정 완료");
        this.getUi().revertMode();
      },
      () => {
        this.getUi().revertMode();
      },
    ],
  });
}

private openPracticeTypeMenu(): void {
  this.getUi().setOverlayMode(UiMode.PRACTICE_TYPE_FORM, {
    buttonActions: [
      () => {
        this.setNotice("대타출동 타입 설정 완료");
        this.getUi().revertMode();
      },
      () => {
        this.getUi().revertMode();
      },
    ],
  });
}

private openPracticeAbilityMenu(): void {
  this.getUi().setOverlayMode(UiMode.PRACTICE_ABILITY_FORM, {
    target: "ability",
    title: "특성을 선택하시오",
  });
}

private openPracticePassiveMenu(): void {
  this.getUi().setOverlayMode(UiMode.PRACTICE_ABILITY_FORM, {
    target: "passive",
    title: "패시브를 선택하시오",
  });
}

private openPracticeMoveMenu(): void {
  globalScene.ui.setOverlayMode(UiMode.PRACTICE_MOVE_FORM);
}

private openPracticeRentalModifierMenu(): void {
  this.getUi().setOverlayMode(
    UiMode.PRACTICE_RENTAL_MODIFIER_SELECT
  );
}

private togglePracticeDummyCanAct(): boolean {
  globalScene.gameData.practiceDummyConfig ??= {};

  const current =
    globalScene.gameData.practiceDummyConfig.canAct ?? false;

  globalScene.gameData.practiceDummyConfig.canAct = !current;

  console.log("[PRACTICE] toggle canAct", {
    before: current,
    after: !current,
    config: globalScene.gameData.practiceDummyConfig,
  });

  globalScene.gameData.saveSystem();

  this.setNotice(
    !current
      ? "대타출동이 행동하도록 설정했습니다."
      : "대타출동이 행동하지 않도록 설정했습니다."
  );

  this.getUi().playSelect();
  this.refreshDetail();
  return true;
}

private togglePracticeExpReward(): boolean {
  globalScene.gameData.practiceDummyConfig ??= {};
  globalScene.gameData.practiceDummyConfig.rewardFlags ??= {};

  const current =
    globalScene.gameData.practiceDummyConfig.rewardFlags.exp ?? false;

  globalScene.gameData.practiceDummyConfig.rewardFlags.exp = !current;

  globalScene.gameData.saveSystem();

  this.setNotice(
    !current
      ? "연습모드 경험치 지급 ON"
      : "연습모드 경험치 지급 OFF"
  );

  this.refreshDetail();
  this.getUi().playSelect();
  return true;
}

private togglePracticeMoneyReward(): boolean {
  globalScene.gameData.practiceDummyConfig ??= {};
  globalScene.gameData.practiceDummyConfig.rewardFlags ??= {};

  const current =
    globalScene.gameData.practiceDummyConfig.rewardFlags.money ?? false;

  globalScene.gameData.practiceDummyConfig.rewardFlags.money = !current;

  globalScene.gameData.saveSystem();

  this.setNotice(
    !current
      ? "연습모드 골드 지급 ON"
      : "연습모드 골드 지급 OFF"
  );

  this.refreshDetail();
  this.getUi().playSelect();
  return true;
}

private togglePracticeRpReward(): boolean {
  globalScene.gameData.practiceDummyConfig ??= {};
  globalScene.gameData.practiceDummyConfig.rewardFlags ??= {};

  const current =
    globalScene.gameData.practiceDummyConfig.rewardFlags.roguePoints ?? false;

  globalScene.gameData.practiceDummyConfig.rewardFlags.roguePoints = !current;

  globalScene.gameData.saveSystem();

  this.setNotice(
    !current
      ? "연습모드 로그포인트 지급 ON"
      : "연습모드 로그포인트 지급 OFF"
  );

  this.refreshDetail();
  this.getUi().playSelect();
  return true;
}

private togglePracticeDummyFaint(): boolean {
  const cfg = globalScene.gameData.practiceDummyConfig ??= {};
  cfg.rewardFlags ??= {};

  cfg.rewardFlags.allowDummyFaint =
    !cfg.rewardFlags.allowDummyFaint;

  this.refreshList();
  return true;
}

private openPracticeDummyConfig(): boolean {
  this.openPracticeLevelMenu();
  return true;
}

  private resetPracticeDummyConfig(): boolean {
  globalScene.gameData.practiceDummyConfig = {
    rentalModifiers: [],
  };

  globalScene.gameData.saveSystem();

  this.setNotice("대타출동 설정을 초기화했습니다.");
  this.getUi().playSelect();
  return true;
}

  private openStorageAmountMenu(item: RogueShopStorageEntry): void {
  const max = Math.min(item.quantity, 9);

  globalScene.ui.setOverlayMode(UiMode.MENU_OPTION_SELECT, {
    options: new Array(max).fill(null).map((_, i) => {
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
    }).concat([
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
  
  if (this.currentTab === "PRACTICE") {
  const cfg = globalScene.gameData.practiceDummyConfig ?? {};
 const rewards = cfg.rewardFlags ?? {};

const dummyFaintText =
  rewards.allowDummyFaint
    ? "대타 기절 처리 [ON]"
    : "대타 기절 처리 [OFF]";

  const actText = cfg.canAct
    ? "대타출동 행동 설정 [행동]"
    : "대타출동 행동 설정 [정지]";

  const expText = rewards.exp
    ? "경험치 지급 설정 [ON]"
    : "경험치 지급 설정 [OFF]";

  const moneyText = rewards.money
    ? "골드 지급 설정 [ON]"
    : "골드 지급 설정 [OFF]";

  const rpText = rewards.roguePoints
    ? "로그포인트 지급 설정 [ON]"
    : "로그포인트 지급 설정 [OFF]";

  return [
    { name: "연습모드 시작", description: "연습장으로 이동합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: "대타출동 레벨 설정", description: "대타출동 인형의 레벨을 설정합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: "대타출동 능력치 설정", description: "대타출동 인형의 능력치를 설정합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: "대타출동 타입 설정", description: "대타출동 인형의 타입을 설정합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: "대타출동 특성 설정", description: "대타출동 인형의 특성을 설정합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: "대타출동 패시브 설정", description: "대타출동 인형의 패시브를 설정합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: actText, description: "대타출동 인형이 행동할지 설정합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: "대타출동 기술 설정", description: "대타출동 인형의 기술 4개를 설정합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: "렌탈 아이템 설정", description: "연습용 렌탈 아이템을 지급합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: expText, description: "연습모드에서 경험치 획득 여부를 설정합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: moneyText, description: "연습모드에서 골드 획득 여부를 설정합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: rpText, description: "연습모드에서 로그포인트 획득 여부를 설정합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: dummyFaintText, description: "대타출동 인형이 HP 0이 되어 기절할지 설정합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
    { name: "설정 초기화", description: "대타출동 설정을 초기화합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
  ];
}

  return this.storageItems;
}

  private refreshMoneyTexts(): void {
    this.valueRoguePointText.setText(`RP: ${globalScene.gameData.roguePoints ?? 0}`);
    this.valueGoldText.setText(`G: ${globalScene.money ?? 0}`);
  }

  private refreshTabCursor(): void {
    const tabXPositions = [10, 52, 94, 136];
    this.tabCursorObj.setPosition(tabXPositions[this.tabCursor] ?? 10, 23);

    const list = this.getCurrentList();
    const listY = 44 + (this.listCursor - this.listScroll) * 14;
    this.listCursorObj.setPosition(8, listY);
    this.listCursorObj.setVisible(list.length > 0);
  }

  private refreshTabTexts(): void {
    const allTabs: RogueShopTab[] = ["SHOP", "BANK", "STORAGE", "PRACTICE"];
const labels: Record<RogueShopTab, string> = {
  SHOP: "상점",
  BANK: "은행",
  STORAGE: "창고",
  PRACTICE: "연습",
};

const xPositions = [16, 58, 100, 142];

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

    // 은행 기본
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

  this.starterIconCursorObj
    .setVisible(true)
    .setPosition(279, this.calcShopStarterIconY(cursorIndex) - 1);
} else {
  this.starterIconCursorObj.setVisible(false);
}

this.starterPanelWindow.setAlpha(this.selectingTarget || this.selectingStorageTarget ? 1 : 0.75);
this.starterPanelTitleText.setAlpha(this.selectingTarget || this.selectingStorageTarget ? 1 : 0.75);
this.starterPanelTitleText.setText(
  this.selectingTarget || this.selectingStorageTarget ? "대상 선택" : "스타팅"
);
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
    `가격: ${listing.priceRp} RP\n재고: ${listing.stock}\n\n${itemDesc}\n\n[구매 후 처리]\n${options}`
  );
  return;
}

    if (this.currentTab === "SHOP") {
      const listing = selected as RogueShopListing;
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

    if (this.currentTab === "PRACTICE") {
  this.detailTitleText.setText("연습센터");
  this.detailBodyText.setText(
    "연습모드를 시작합니다.\n\n시작 바이옴은 TUTORIAL_ROOM으로 고정됩니다.\n보상과 진행은 추후 연습 전용 규칙으로 분리할 수 있습니다.\n\n[확인] 연습모드 시작"
  );
  return;
}

    const storageItem = selected as RogueShopStorageEntry;
    this.detailTitleText.setText(storageItem.name);
    const canAssignToStarter =
  (this.uiArgs?.starters?.length ?? 0) > 0;

const actionText =
  storageItem.purchaseMode === "SELECT_POKEMON"
    ? canAssignToStarter
      ? "[확인] 꺼내서 포켓몬에게 지급"
      : "[확인] 스타터 선택 단계에서만 장착 가능"
    : "[확인] 꺼내기";

this.detailBodyText.setText(
  `보관 수량: ${storageItem.quantity}\n\n${storageItem.description}\n\n${actionText}`,
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
  if (itemId.startsWith("BERRY_")) {
    const berryType = Number(itemId.split("_")[1]) as BerryType;
    const gen = modifierTypes.BERRY().withIdFromFunc(modifierTypes.BERRY) as ModifierTypeGenerator;
    return gen.generateType([], [berryType]) as ModifierType;
  }

  if (itemId.startsWith("TYPE_SPECIFIC_MOVE_BOOSTER_")) {
    const type = Number(itemId.split("_").pop()) as PokemonType;
    const gen = modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER()
      .withIdFromFunc(modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER) as ModifierTypeGenerator;
    return gen.generateType([], [type]) as ModifierType;
  }

  if (itemId.startsWith("ATTACK_TYPE_BOOSTER_")) {
    const type = Number(itemId.split("_").pop()) as PokemonType;
    const gen = modifierTypes.ATTACK_TYPE_BOOSTER()
      .withIdFromFunc(modifierTypes.ATTACK_TYPE_BOOSTER) as ModifierTypeGenerator;
    return gen.generateType([], [type]) as ModifierType;
  }

  if (itemId.startsWith("modifierType:SpeciesBoosterItem.")) {
    const key = itemId.replace("modifierType:SpeciesBoosterItem.", "");

    const rareGen = modifierTypes.RARE_SPECIES_STAT_BOOSTER?.()
      ?.withIdFromFunc(modifierTypes.RARE_SPECIES_STAT_BOOSTER) as ModifierTypeGenerator | undefined;

    const normalGen = modifierTypes.SPECIES_STAT_BOOSTER?.()
      ?.withIdFromFunc(modifierTypes.SPECIES_STAT_BOOSTER) as ModifierTypeGenerator | undefined;

    return (
      rareGen?.generateType([], [key]) as ModifierType
    ) ?? (
      normalGen?.generateType([], [key]) as ModifierType
    ) ?? null;
  }

  return getModifierTypeById(itemId) ?? null;
}

private purchaseListingToStorage(listing: RogueShopListing): boolean {
  if (!this.tryConsumeListingPurchase(listing)) {
    return true;
  }

  const storageItemId = this.getStorageItemIdFromListing(listing);

const stored = globalScene.gameData.addToStorage(storageItemId, 1);

if (!stored) {
  globalScene.gameData.addRoguePoints(listing.priceRp);
  listing.stock++;

  this.setNotice("창고 저장에 실패했습니다.");
  this.getUi().playError();
  return true;
}

  const itemName = this.getListingDisplayName(listing);
  this.finishShopPurchaseCleanup();
  this.setNotice(`${itemName} 구매 완료! 창고에 저장했습니다.`);
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

  if (
    listing.id === "VOUCHER" ||
    listing.id === "VOUCHER_REGULAR" ||
    listing.id === "EGG_VOUCHER"
  ) {
    this.addVoucherCount(VoucherType.REGULAR, 1);
    this.finishShopPurchaseCleanup();
    this.setNotice(`${itemName} 획득 완료`);
    this.getUi().playSelect();
    return true;
  }

  if (
    listing.id === "VOUCHER_PLUS" ||
    listing.id === "EGG_VOUCHER_PLUS"
  ) {
    this.addVoucherCount(VoucherType.PLUS, 1);
    this.finishShopPurchaseCleanup();
    this.setNotice(`${itemName} 획득 완료`);
    this.getUi().playSelect();
    return true;
  }

  if (
    listing.id === "VOUCHER_PREMIUM" ||
    listing.id === "EGG_VOUCHER_PREMIUM"
  ) {
    this.addVoucherCount(VoucherType.PREMIUM, 1);
    this.finishShopPurchaseCleanup();
    this.setNotice(`${itemName} 획득 완료`);
    this.getUi().playSelect();
    return true;
  }

  if (
    listing.id === "VOUCHER_GOLD" ||
    listing.id === "VOUCHER_GOLDEN" ||
    listing.id === "EGG_VOUCHER_GOLD" ||
    listing.id === "EGG_VOUCHER_GOLDEN"
  ) {
    this.addVoucherCount(VoucherType.GOLDEN, 1);
    this.finishShopPurchaseCleanup();
    this.setNotice(`${itemName} 획득 완료`);
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
  this.getUi().setMode(UiMode.MESSAGE);
}

private getStorageDisplayMeta(itemId: string): { name: string; description: string } {
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

  const modifierType =
  this.resolveGeneratedStorageModifierType(itemId)
  ?? getModifierTypeById(itemId);
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