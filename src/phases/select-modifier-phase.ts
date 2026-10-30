import { globalScene } from "#app/global-scene";
import { ChangeAbilityPhase, ChangeAbilityType } from "#app/phases/change-ability-phase";
import { RegisterAbilityPhase, RegisterAbilityType } from "#app/phases/register-ability-phase";
import Overrides from "#app/overrides";
import type { BerryType } from "#enums/berry-type";
import { GameModes } from "#enums/game-modes";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { ModifierTier } from "#enums/modifier-tier";
import { TrainerCardId } from "#enums/trainer-card-id";
import { UiMode } from "#enums/ui-mode";
import type { Modifier } from "#modifiers/modifier";
import {
  ChangeAbilityModifier,
  RegisterAbilityModifier,
  ExtraModifierModifier,
  HealShopCostModifier,
  PokemonHeldItemModifier,
  TempExtraModifierModifier,
} from "#modifiers/modifier";
import type { CustomModifierSettings, ModifierType, ModifierTypeOption } from "#modifiers/modifier-type";
import {
  BerryModifierType,
  ChangeAbilityModifierType,
  FusePokemonModifierType,
  getModifierTypeById,
  getPlayerModifierTypeOptions,
  getPlayerShopModifierTypeOptionsForWave,
  PokemonModifierType,
  PokemonMoveModifierType,
  PokemonPpRestoreModifierType,
  PokemonPpUpModifierType,
  RememberMoveModifierType,
  regenerateModifierPoolThresholds,
  TmModifierType,
  TrModifierType,
  ZExclusiveCrystalMoveModifierType,
  ZGenericCrystalMoveModifierType,
} from "#modifiers/modifier-type";
import { BattlePhase } from "#phases/battle-phase";
import { questManager } from "#system/quest-manager";
import { trainerCardManager } from "#system/trainer-card-manager";
import type { ModifierSelectUiHandler } from "#ui/modifier-select-ui-handler";
import { SHOP_OPTIONS_ROW_LIMIT } from "#ui/modifier-select-ui-handler";
import { PartyOption, PartyUiHandler, PartyUiMode } from "#ui/party-ui-handler";
import { NumberHolder } from "#utils/common";
import i18next from "i18next";

export type ModifierSelectCallback = (rowCursor: number, cursor: number) => boolean;

export class SelectModifierPhase extends BattlePhase {
  public readonly phaseName = "SelectModifierPhase";
  private rerollCount: number;
  private modifierTiers?: ModifierTier[];
  private customModifierSettings?: CustomModifierSettings;
  private isCopy: boolean;

  private typeOptions: ModifierTypeOption[];

  private remainingRewardChoices = 1;
  private initialRewardChoices = 1;
  private pendingRewardOption?: ModifierTypeOption;
  private rewardSelectCallback?: ModifierSelectCallback;
  private rewardCompleted = false;

  constructor(
    rerollCount = 0,
    modifierTiers?: ModifierTier[],
    customModifierSettings?: CustomModifierSettings,
    isCopy = false,
  ) {
    super();

    this.rerollCount = rerollCount;
    this.modifierTiers = modifierTiers;
    this.customModifierSettings = customModifierSettings;
    this.isCopy = isCopy;
  }

  start() {
    super.start();

    if (!this.isPlayer()) {
      return false;
    }

    if (!this.rerollCount && !this.isCopy) {
      this.updateSeed();
    } else if (this.rerollCount) {
      globalScene.reroll = false;
    }

    const party = globalScene.getPlayerParty();
    if (!this.isCopy) {
      regenerateModifierPoolThresholds(party, this.getPoolType(), this.rerollCount);
    }
    const modifierCount = this.getModifierCount();

    this.typeOptions = this.getModifierTypeOptions(modifierCount);

    // 원모어원: 보상 아이템을 최대 2개 선택 가능
    this.remainingRewardChoices = !this.isCopy && trainerCardManager.isEquipped(TrainerCardId.ONE_MORE_ONE) ? 2 : 1;

    this.initialRewardChoices = this.remainingRewardChoices;
    this.pendingRewardOption = undefined;
    this.rewardCompleted = false;

    console.log("[TRAINER_CARD_ONE_MORE_ONE_INIT]", {
      equipped: trainerCardManager.isEquipped(TrainerCardId.ONE_MORE_ONE),
      remainingChoices: this.remainingRewardChoices,
    });

    // ★ REWARD 방식 물건 찾기 의뢰
    const rewardItemQuest = questManager.getActiveRewardItemFindQuest(globalScene.currentBattle.waveIndex);

    if (rewardItemQuest && rewardItemQuest.targetItemId) {
      const questModifierType = getModifierTypeById(rewardItemQuest.targetItemId);

      if (questModifierType) {
        this.typeOptions = [
          {
            type: questModifierType,
            upgradeCount: 0,
            cost: 0,
          } as ModifierTypeOption,
        ];

        console.log("[QUEST_REWARD_ITEM_FORCED]", {
          questId: rewardItemQuest.id,
          wave: globalScene.currentBattle.waveIndex,
          itemId: rewardItemQuest.targetItemId,
          itemName: rewardItemQuest.targetItemName,
        });
      } else {
        console.warn("[QUEST_REWARD_ITEM_TYPE_NOT_FOUND]", {
          questId: rewardItemQuest.id,
          itemId: rewardItemQuest.targetItemId,
        });
      }
    }

    const modifierSelectCallback = (rowCursor: number, cursor: number) => {
      if (rowCursor < 0 || cursor < 0) {
        globalScene.ui.showText(i18next.t("battle:skipItemQuestion"), null, () => {
          globalScene.ui.setOverlayMode(
            UiMode.CONFIRM,
            () => {
              globalScene.ui.revertMode();
              globalScene.ui.setMode(UiMode.MESSAGE);
              this.finishRewardSelection();
            },
            () => {
              globalScene.ui.revertMode(); // 핵심
              this.resetModifierSelect(modifierSelectCallback);
            },
          );
        });
        return false;
      }

      switch (rowCursor) {
        // Execute one of the options from the bottom row
        case 0:
          switch (cursor) {
            case 0:
              return this.rerollModifiers();

            case 1:
              return this.openModifierTransferScreen(modifierSelectCallback);

            case 2:
              globalScene.ui.setModeWithoutClear(UiMode.ROGUE_SHOP, {
                source: "MENU",
                allowShop: false,
                allowBank: true,
                allowStorage: false,
                initialTab: "BANK",
                onExit: () => {
                  this.resetModifierSelect(modifierSelectCallback);
                },
              });
              return true;

            case 3: {
              const starters = globalScene.getPlayerParty().map(p => ({
                speciesId: p.species.speciesId,
                formIndex: p.formIndex ?? 0,
                shiny: !!p.shiny,
                variant: p.variant ?? 0,
                female: !!p.female,
              }));

              console.log("[SELECT_MODIFIER] open storage", {
                starters,
                length: starters.length,
              });

              globalScene.ui.setModeWithoutClear(UiMode.ROGUE_SHOP, {
                source: "MENU",
                starters,
                allowShop: false,
                allowBank: false,
                allowStorage: true,
                initialTab: "STORAGE",
                onExit: () => {
                  this.resetModifierSelect(modifierSelectCallback);
                },
              });
              return true;
            }

            case 4:
              globalScene.ui.setModeWithoutClear(UiMode.PARTY, PartyUiMode.CHECK, -1, () => {
                this.resetModifierSelect(modifierSelectCallback);
              });
              return true;

            case 5:
              return this.toggleRerollLock();

            default:
              return false;
          }

        // Pick a reward, or proceed if the encounter provided no reward choices.
        case 1:
          if (this.typeOptions.length === 0) {
            this.finishRewardSelection();
            return true;
          }
          return this.selectRewardModifierOption(cursor, modifierSelectCallback);
        // Pick an option from the shop
        default: {
          return this.selectShopModifierOption(rowCursor, cursor, modifierSelectCallback);
        }
      }
    };

    this.rewardSelectCallback = modifierSelectCallback;
    this.resetModifierSelect(modifierSelectCallback);
  }

  private openRewardActionMenu(cursor: number, modifierSelectCallback: ModifierSelectCallback): boolean {
    const typeOption = this.typeOptions[cursor];
    const modifierType = typeOption?.type;

    if (!modifierType) {
      return false;
    }

    globalScene.ui.setOverlayMode(UiMode.MENU_OPTION_SELECT, {
      options: [
        {
          label: "포켓몬에게 지니게 한다",
          handler: () => {
            globalScene.ui.revertMode(); // 오버레이만 먼저 닫기
            return this.applyRewardToPokemon(cursor, modifierSelectCallback);
          },
          keepOpen: true,
        },
        {
          label: "창고로 보낸다",
          handler: () => {
            globalScene.ui.revertMode(); // 오버레이만 먼저 닫기
            return this.sendRewardToStorage(cursor, modifierSelectCallback);
          },
          keepOpen: true,
        },
        {
          label: "취소",
          handler: () => {
            globalScene.ui.revertMode(); // 오버레이만 닫기
            return true;
          },
          keepOpen: true,
        },
      ],
      xOffset: 0,
      yOffset: 48,
      maxOptions: 3,
    });

    console.log("NEW MENU CODE");
    return false;
  }

  private finishRewardSelection(): void {
    if (this.rewardCompleted) {
      return;
    }

    this.rewardCompleted = true;
    this.pendingRewardOption = undefined;

    globalScene.ui.clearText();
    globalScene.ui.setMode(UiMode.MESSAGE);

    if (!this.isCopy && globalScene.gameMode.modeId !== GameModes.TUTORIAL) {
      console.log("[TRAINER_CARD_PHASE_QUEUED]");

      globalScene.phaseManager.unshiftNew("SelectTrainerCardPhase");
    }

    super.end();
  }

  private completeRewardSelection(
    selectedOption: ModifierTypeOption,
    modifierSelectCallback: ModifierSelectCallback,
  ): void {
    if (this.rewardCompleted) {
      return;
    }

    // 획득한 선택지만 제거한다.
    const index = this.typeOptions.indexOf(selectedOption);

    if (index < 0) {
      console.warn("[ONE_MORE_ONE_OPTION_NOT_FOUND]");
      return;
    }

    this.typeOptions.splice(index, 1);
    this.remainingRewardChoices--;
    this.pendingRewardOption = undefined;

    console.log("[TRAINER_CARD_ONE_MORE_ONE_REWARD]", {
      item: selectedOption.type?.getSafeName(),
      remainingChoices: this.remainingRewardChoices,
      remainingOptions: this.typeOptions.length,
    });

    if (this.remainingRewardChoices > 0 && this.typeOptions.length > 0) {
      // 동일 MODIFIER_SELECT 모드 안에서 setMode를 다시 호출하면
      // 선택 입력 상태가 복구되지 않을 수 있다. 모드를 한 번 전환한다.
      globalScene.ui.clearText();
      globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
        if (!this.rewardCompleted) {
          this.resetModifierSelect(modifierSelectCallback);
        }
      });
      return;
    }

    // 두 번째 보상까지 획득하면 정상 종료
    this.finishRewardSelection();
  }

  // Pick a modifier from among the rewards and apply it
  private selectRewardModifierOption(cursor: number, modifierSelectCallback: ModifierSelectCallback): boolean {
    const selectedOption = this.typeOptions[cursor];
    const modifierType = selectedOption?.type;

    if (!modifierType || this.rewardCompleted) {
      return false;
    }

    // 비동기 지급 처리에서도 같은 아이템을 식별하도록 저장
    this.pendingRewardOption = selectedOption;

    // 포켓몬 대상 아이템은 기존 메뉴 사용
    if (modifierType instanceof PokemonModifierType) {
      return this.openRewardActionMenu(cursor, modifierSelectCallback);
    }

    // 즉시 적용 아이템
    return this.applyChosenModifier(modifierType, -1, modifierSelectCallback);
  }

  private applyRewardToPokemon(cursor: number, modifierSelectCallback: ModifierSelectCallback): boolean {
    const modifierType = this.typeOptions[cursor]?.type;
    if (!modifierType) {
      return false;
    }

    if (!(modifierType instanceof PokemonModifierType)) {
      globalScene.ui.showText("이 아이템은 포켓몬에게 지니게 할 수 없습니다.", 1000, () => {
        this.resetModifierSelect(modifierSelectCallback);
      });
      return true;
    }

    return this.applyChosenModifier(modifierType, -1, modifierSelectCallback);
  }

  private sendRewardToStorage(cursor: number, modifierSelectCallback: ModifierSelectCallback): boolean {
    const modifierType = this.typeOptions[cursor]?.type;
    if (!modifierType) {
      return false;
    }

    let itemId = modifierType.id;

    if (modifierType instanceof BerryModifierType) {
      const berryType = (modifierType as any).berryType as BerryType;
      itemId = `BERRY_${berryType}`;
    }

    if (!itemId) {
      globalScene.ui.showText("창고로 보낼 수 없는 아이템입니다.", 1000);
      return true;
    }

    let purchaseMode: "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT";

    if (modifierType instanceof PokemonModifierType) {
      purchaseMode = "SELECT_POKEMON";
    } else {
      purchaseMode = "TRAINER_LOADOUT";
    }

    const selectedOption = this.typeOptions[cursor];

    const stored = globalScene.gameData.addToStorage(itemId, 1, {
      purchaseMode,
    });

    if (!stored) {
      globalScene.ui.showText("창고 저장에 실패했습니다.");
      return true;
    }

    const completedQuests = questManager.onItemObtained(itemId, 1);

    if (completedQuests.length > 0 && questManager.isAcceptedQuestClear()) {
      globalScene.phaseManager.unshiftNew("QuestClearPromptPhase");
    }

    globalScene.gameData.saveSystem();

    globalScene.ui.showText(`${modifierType.name}을(를) 창고로 보냈습니다.`, undefined, () => {
      this.completeRewardSelection(selectedOption, modifierSelectCallback);
    });

    return true;
  }

  // Pick a modifier from the shop and apply it
  private selectShopModifierOption(
    rowCursor: number,
    cursor: number,
    modifierSelectCallback: ModifierSelectCallback,
  ): boolean {
    const shopOptions = getPlayerShopModifierTypeOptionsForWave(
      globalScene.currentBattle.waveIndex,
      globalScene.getWaveMoneyAmount(1),
    );
    const shopOption =
      shopOptions[
        rowCursor > 2 || shopOptions.length <= SHOP_OPTIONS_ROW_LIMIT ? cursor : cursor + SHOP_OPTIONS_ROW_LIMIT
      ];
    const modifierType = shopOption.type;
    // Apply Black Sludge to healing item cost
    const healingItemCost = new NumberHolder(shopOption.cost);
    globalScene.applyModifier(HealShopCostModifier, true, healingItemCost);
    const cost = healingItemCost.value;

    if (globalScene.money < cost && !Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
      globalScene.ui.playError();
      return false;
    }

    return this.applyChosenModifier(modifierType, cost, modifierSelectCallback);
  }

  // Apply a chosen modifier: do an effect or open the party menu
  private applyChosenModifier(
    modifierType: ModifierType,
    cost: number,
    modifierSelectCallback: ModifierSelectCallback,
  ): boolean {
    if (modifierType instanceof PokemonModifierType) {
      if (modifierType instanceof FusePokemonModifierType) {
        this.openFusionMenu(modifierType, cost, modifierSelectCallback);
      } else {
        this.openModifierMenu(modifierType, cost, modifierSelectCallback);
      }
    } else {
      this.applyModifier(modifierType.newModifier()!, cost);
    }
    return cost === -1;
  }

  // Reroll rewards
  private rerollModifiers() {
    if (this.remainingRewardChoices < this.initialRewardChoices) {
      globalScene.ui.playError();
      console.log("[ONE_MORE_ONE_REROLL_BLOCKED]");
      return false;
    }

    const rerollCost = this.getRerollCost(globalScene.lockModifierTiers);
    if (rerollCost < 0 || globalScene.money < rerollCost) {
      globalScene.ui.playError();
      return false;
    }
    globalScene.reroll = true;
    globalScene.phaseManager.unshiftNew(
      "SelectModifierPhase",
      this.rerollCount + 1,
      this.typeOptions.map(o => o.type?.tier).filter(t => t !== undefined) as ModifierTier[],
    );
    globalScene.ui.clearText();
    globalScene.ui.setMode(UiMode.MESSAGE).then(() => super.end());
    if (!Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
      globalScene.money -= rerollCost;
      globalScene.updateMoneyText();
      globalScene.animateMoneyChanged(false);
    }
    globalScene.playSound("se/buy");
    return true;
  }

  // Transfer modifiers among party pokemon
  private openModifierTransferScreen(modifierSelectCallback: ModifierSelectCallback) {
    const party = globalScene.getPlayerParty();

    globalScene.ui.setModeWithoutClear(
      UiMode.PARTY,
      PartyUiMode.MODIFIER_TRANSFER,
      -1,
      (fromSlotIndex: number, itemIndex: number, itemQuantity: number, toSlotIndex: number) => {
        if (fromSlotIndex < 6 && itemIndex > -1) {
          const itemModifiers = globalScene.findModifiers(
            m => m instanceof PokemonHeldItemModifier && m.isTransferable && m.pokemonId === party[fromSlotIndex].id,
          ) as PokemonHeldItemModifier[];

          const itemModifier = itemModifiers[itemIndex];
          if (!itemModifier) {
            this.resetModifierSelect(modifierSelectCallback);
            return;
          }

          // 창고로 보내기
          if (toSlotIndex === -2) {
            let itemId = itemModifier.type?.id;

            if (itemModifier.type instanceof BerryModifierType) {
              const berryType = (itemModifier.type as any).berryType as BerryType;
              itemId = `BERRY_${berryType}`;
            }

            if (!itemId) {
              globalScene.ui.showText("창고로 보낼 수 없는 아이템입니다.", 1000);
              this.resetModifierSelect(modifierSelectCallback);
              return;
            }

            const stored = globalScene.gameData.addToStorage(itemId, itemQuantity);
            if (!stored) {
              globalScene.ui.showText("창고 저장에 실패했습니다.", 1000);
              this.resetModifierSelect(modifierSelectCallback);
              return;
            }

            if (itemQuantity >= itemModifier.stackCount) {
              globalScene.removeModifier(itemModifier);
            } else {
              itemModifier.stackCount -= itemQuantity;
            }

            globalScene.updateModifiers(true);
            globalScene.gameData.saveSystem();
            globalScene.ui.showText(`${itemModifier.type.name}을(를) 창고로 보냈습니다.`, 1000);
            this.resetModifierSelect(modifierSelectCallback);
            return;
          }

          // 기존 포켓몬끼리 이동
          if (toSlotIndex !== undefined && toSlotIndex < 6 && fromSlotIndex !== toSlotIndex) {
            globalScene.tryTransferHeldItemModifier(
              itemModifier,
              party[toSlotIndex],
              true,
              itemQuantity,
              undefined,
              undefined,
              false,
            );
          } else {
            this.resetModifierSelect(modifierSelectCallback);
          }
        } else {
          this.resetModifierSelect(modifierSelectCallback);
        }
      },
      PartyUiHandler.FilterItemMaxStacks,
    );
  }

  // Toggle reroll lock
  private toggleRerollLock() {
    const rerollCost = this.getRerollCost(globalScene.lockModifierTiers);
    if (rerollCost < 0) {
      // Reroll lock button is also disabled when reroll is disabled
      globalScene.ui.playError();
      return false;
    }
    globalScene.lockModifierTiers = !globalScene.lockModifierTiers;
    const uiHandler = globalScene.ui.getHandler() as ModifierSelectUiHandler;
    uiHandler.setRerollCost(this.getRerollCost(globalScene.lockModifierTiers));
    uiHandler.updateLockRaritiesText();
    uiHandler.updateRerollCostText();
    return false;
  }

  private getModifierTierRoguePoints(tier?: ModifierTier): number {
    switch (tier) {
      case ModifierTier.COMMON:
        return 10;
      case ModifierTier.GREAT:
        return 20;
      case ModifierTier.ULTRA:
        return 40;
      case ModifierTier.ROGUE:
        return 70;
      case ModifierTier.MASTER:
        return 120;
      default:
        return 0;
    }
  }

  /**
   * Apply the effects of the chosen modifier
   * @param modifier - The modifier to apply
   * @param cost - The cost of the modifier if it was purchased, or -1 if selected as the modifier reward
   * @param playSound - Whether the 'obtain modifier' sound should be played when adding the modifier.
   */
  private applyModifier(modifier: Modifier, cost = -1, playSound = false): void {
    // 캡슐/패치는 선택 확정 후에만 보상/구매를 처리한다.
    // 취소는 기술머신과 같이 기존 보상 목록/상점으로 돌아간다.
    if (modifier instanceof ChangeAbilityModifier || modifier instanceof RegisterAbilityModifier) {
      const pendingOption = this.pendingRewardOption;
      const callback = this.rewardSelectCallback;
      modifier.onSelectionComplete = (confirmed: boolean) => {
        if (!confirmed) {
          if (cost === -1) this.pendingRewardOption = undefined;
          if (callback) this.returnToModifierSelect(callback);
          return;
        }
        const itemId = modifier.type?.id;
        if (cost === -1) {
          if (itemId) questManager.onItemObtained(itemId, 1);
          const gainedRp = this.getModifierTierRoguePoints(modifier.type?.tier);
          if (gainedRp > 0) globalScene.gameData.addRoguePoints(gainedRp);
          if (pendingOption && callback) this.completeRewardSelection(pendingOption, callback);
          else this.finishRewardSelection();
        } else {
          if (!Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
            globalScene.money -= cost;
            globalScene.updateMoneyText();
            globalScene.animateMoneyChanged(false);
          }
          globalScene.playSound("se/buy");
          if (callback) this.returnToModifierSelect(callback);
        }
      };
      // 기존 addModifier()는 phaseManager에 예약만 하므로 아이템 메뉴가
      // 활성화된 동안 선택 화면이 열리지 않는다. 직접 UI를 열어 처리한다.
      const partyIndex = globalScene.getPlayerParty().findIndex(p => p.id === modifier.pokemonId);
      if (partyIndex < 0) {
        globalScene.ui.playError();
        if (callback) this.returnToModifierSelect(callback);
        return;
      }
      if (modifier instanceof ChangeAbilityModifier) {
        new ChangeAbilityPhase(partyIndex, modifier.changeAbilityType, cost, modifier.onSelectionComplete).showSelectionDirect();
      } else {
        new RegisterAbilityPhase(partyIndex, RegisterAbilityType.ABILITY_PATCH, cost, modifier.onSelectionComplete).showSelectionDirect();
      }
      return;
    }
    const result = globalScene.addModifier(modifier, false, playSound, undefined, undefined, cost);

    if (result && cost === -1) {
      const itemId = modifier.type?.id;
      const amount = (modifier as any).stackCount ?? 1;

      if (itemId) {
        const completedQuests = questManager.onItemObtained(itemId, amount);

        if (completedQuests.length > 0) {
          for (const quest of completedQuests) {
            console.log("[QUEST_ITEM_COMPLETE]", quest.title);
          }

          if (questManager.isAcceptedQuestClear()) {
            console.log("[QUEST_ALL_ACCEPTED_CLEAR]");

            globalScene.phaseManager.unshiftNew("QuestClearPromptPhase");
          }
        }
      }
    }

    const shouldTrackRunItem = modifier instanceof PokemonHeldItemModifier && !(modifier as any).isPracticeRental;

    if (result && shouldTrackRunItem) {
      const itemId = modifier.type?.id;
      const amount = (modifier as any).stackCount ?? 1;

      if (itemId) {
        globalScene.gameData.addRunStorageItem(itemId, amount);
      }
    }

    if (result) {
      const gainedRp = this.getModifierTierRoguePoints(modifier.type?.tier);

      if (gainedRp > 0) {
        globalScene.gameData.addRoguePoints(gainedRp);
        globalScene.updateroguePointText();
      }
    }

    if (
      cost !== -1
      && (modifier.type instanceof RememberMoveModifierType
        || modifier.type instanceof TmModifierType
        || modifier.type instanceof TrModifierType
        || modifier.type instanceof ZGenericCrystalMoveModifierType
        || modifier.type instanceof ZExclusiveCrystalMoveModifierType)
    ) {
      globalScene.phaseManager.unshiftPhase(this.copy());
    }

    if (cost !== -1 && !(modifier.type instanceof RememberMoveModifierType)) {
      if (result) {
        if (!Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
          globalScene.money -= cost;
          globalScene.updateMoneyText();
          globalScene.animateMoneyChanged(false);
        }
        globalScene.playSound("se/buy");
        (globalScene.ui.getHandler() as ModifierSelectUiHandler).updateCostText();
      } else {
        globalScene.ui.playError();
      }
    } else {
      // 보상 아이템 획득
      if (cost === -1) {
        if (!result) {
          globalScene.ui.playError();

          if (this.rewardSelectCallback) {
            const callback = this.rewardSelectCallback;
            globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
              if (!this.rewardCompleted) {
                this.resetModifierSelect(callback);
              }
            });
          }
          return;
        }

        if (this.pendingRewardOption && this.rewardSelectCallback) {
          this.completeRewardSelection(this.pendingRewardOption, this.rewardSelectCallback);
        } else {
          // 기존 선택 기록이 없는 특수 보상 경로
          this.finishRewardSelection();
        }

        return;
      }

      // 기존 유료 아이템 관련 예외 처리
      globalScene.ui.clearText();
      globalScene.ui.setMode(UiMode.MESSAGE);
      super.end();
    }
  }

  // Opens the party menu specifically for fusions
  private openFusionMenu(
    modifierType: PokemonModifierType,
    cost: number,
    modifierSelectCallback: ModifierSelectCallback,
  ): void {
    const party = globalScene.getPlayerParty();
    globalScene.ui.setModeWithoutClear(
      UiMode.PARTY,
      PartyUiMode.SPLICE,
      -1,
      (fromSlotIndex: number, spliceSlotIndex: number) => {
        if (
          spliceSlotIndex !== undefined
          && fromSlotIndex < 6
          && spliceSlotIndex < 6
          && fromSlotIndex !== spliceSlotIndex
        ) {
          globalScene.ui.setMode(UiMode.MODIFIER_SELECT, this.isPlayer()).then(() => {
            const modifier = modifierType.newModifier(party[fromSlotIndex], party[spliceSlotIndex])!; //TODO: is the bang correct?
            this.applyModifier(modifier, cost, true);
          });
        } else {
          this.resetModifierSelect(modifierSelectCallback);
        }
      },
      modifierType.selectFilter,
    );
  }

  // Opens the party menu to apply one of various modifiers
  private openModifierMenu(
    modifierType: PokemonModifierType,
    cost: number,
    modifierSelectCallback: ModifierSelectCallback,
  ): void {
    const party = globalScene.getPlayerParty();
    const pokemonModifierType = modifierType as PokemonModifierType;
    const isMoveModifier = modifierType instanceof PokemonMoveModifierType;
    const isTmModifier = modifierType instanceof TmModifierType;
    const isTrModifier = modifierType instanceof TrModifierType;
    const isRememberMoveModifier = modifierType instanceof RememberMoveModifierType;
    const isFusePokemonModifier = modifierType instanceof FusePokemonModifierType;
    const isChangeAbilityModifier = modifierType instanceof ChangeAbilityModifierType;
    const isZGenericCrystalMoveModifier = modifierType instanceof ZGenericCrystalMoveModifierType;
    const isZExclusiveCrystalMoveModifier = modifierType instanceof ZExclusiveCrystalMoveModifierType;
    const isPpRestoreModifier =
      modifierType instanceof PokemonPpRestoreModifierType || modifierType instanceof PokemonPpUpModifierType;
    const partyUiMode = isMoveModifier
      ? PartyUiMode.MOVE_MODIFIER
      : isTmModifier || isTrModifier || isZGenericCrystalMoveModifier || isZExclusiveCrystalMoveModifier
        ? PartyUiMode.TM_MODIFIER
        : isRememberMoveModifier
          ? PartyUiMode.REMEMBER_MOVE_MODIFIER
          : PartyUiMode.MODIFIER;
    const tmMoveId = isTmModifier ? (modifierType as TmModifierType).moveId : undefined;
    // 캡슐/패치는 선택을 확정하기 전까지 보상은 유지하지만,
    // 화면 자체는 반드시 닫아야 한다. setModeWithoutClear는 보상 UI를 남긴다.
    const isAbilityItem = modifierType.id === "ABILITY_CAPSULE" || modifierType.id === "ABILITY_PATCH";
    const openParty = isAbilityItem
      ? globalScene.ui.setMode.bind(globalScene.ui)
      : globalScene.ui.setModeWithoutClear.bind(globalScene.ui);
    openParty(
      UiMode.PARTY,
      partyUiMode,
      -1,
      (slotIndex: number, option: PartyOption) => {
        // Cancelling a TM/TR or move-selection menu must not consume the item.
        if (slotIndex >= 0 && slotIndex < party.length && option !== PartyOption.CANCEL) {
          // 특성캡슐/패치: 아이템 선택창을 다시 켜지 않고 PARTY를 닫은 뒤
          // OPTION_SELECT를 표시한다. MODIFIER_SELECT를 활성화하면 두 화면이 겹친다.
          const abilityItem = modifierType.id === "ABILITY_CAPSULE" || modifierType.id === "ABILITY_PATCH";
          const nextMode = abilityItem ? UiMode.MESSAGE : UiMode.MODIFIER_SELECT;
          // PARTY (교체 확인창 포함) 전환이 완료된 후 옵션 화면 표시
          globalScene.ui.clearText();
          globalScene.ui.setMode(nextMode, ...(abilityItem ? [] : [this.isPlayer()])).then(() => {
            const modifier = !isMoveModifier
              ? !isRememberMoveModifier
                ? modifierType.newModifier(party[slotIndex])
                : modifierType.newModifier(party[slotIndex], option as number)
              : modifierType.newModifier(party[slotIndex], option - PartyOption.MOVE_1);
            if (!modifier) {
              this.returnToModifierSelect(modifierSelectCallback);
              return;
            }
            this.applyModifier(modifier, cost, true);
          });
        } else {
          // Leave PARTY first so the modifier selection is shown with a fresh callback.
          this.returnToModifierSelect(modifierSelectCallback);
        }
      },
      pokemonModifierType.selectFilter,
      modifierType instanceof PokemonMoveModifierType
        ? (modifierType as PokemonMoveModifierType).moveSelectFilter
        : undefined,
      tmMoveId,
      isPpRestoreModifier,
    );
  }

  // Function that determines how many reward slots are available
  private getModifierCount(): number {
    const difficulty = globalScene.gameMode.difficulty;

    const baseModifierCount = difficulty === "EASY" ? 4 : difficulty === "HARD" ? 2 : 3;

    const modifierCountHolder = new NumberHolder(baseModifierCount);
    globalScene.applyModifiers(ExtraModifierModifier, true, modifierCountHolder);
    globalScene.applyModifiers(TempExtraModifierModifier, true, modifierCountHolder);

    // If custom modifiers are specified, overrides default item count
    if (this.customModifierSettings) {
      const newItemCount =
        (this.customModifierSettings.guaranteedModifierTiers?.length ?? 0)
        + (this.customModifierSettings.guaranteedModifierTypeOptions?.length ?? 0)
        + (this.customModifierSettings.guaranteedModifierTypeFuncs?.length ?? 0);
      if (this.customModifierSettings.fillRemaining) {
        const originalCount = modifierCountHolder.value;
        modifierCountHolder.value = originalCount > newItemCount ? originalCount : newItemCount;
      } else {
        modifierCountHolder.value = newItemCount;
      }
    }

    return modifierCountHolder.value;
  }

  /** Restore the reward screen after cancelling a party or move-item selection. */
  private returnToModifierSelect(modifierSelectCallback: ModifierSelectCallback): void {
    globalScene.ui.clearText();
    globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
      if (!this.rewardCompleted) {
        this.resetModifierSelect(modifierSelectCallback);
      }
    });
  }

  // Function that resets the reward selection screen,
  // e.g. after pressing cancel in the party ui or while learning a move
  private resetModifierSelect(modifierSelectCallback: ModifierSelectCallback) {
    globalScene.ui.setMode(
      UiMode.MODIFIER_SELECT,
      this.isPlayer(),
      this.typeOptions,
      modifierSelectCallback,
      this.getRerollCost(globalScene.lockModifierTiers),
    );
  }

  updateSeed(): void {
    globalScene.resetSeed();
  }

  isPlayer(): boolean {
    return true;
  }

  getRerollCost(lockRarities: boolean): number {
    let baseValue = 0;
    if (Overrides.WAIVE_ROLL_FEE_OVERRIDE) {
      return baseValue;
    }
    if (lockRarities) {
      const tierValues = [50, 125, 300, 750, 2000];
      for (const opt of this.typeOptions) {
        baseValue += tierValues[opt.type.tier ?? 0];
      }
    } else {
      baseValue = 250;
    }

    let multiplier = 1;
    if (this.customModifierSettings?.rerollMultiplier != null) {
      if (this.customModifierSettings.rerollMultiplier < 0) {
        // Completely overrides reroll cost to -1 and early exits
        return -1;
      }

      // Otherwise, continue with custom multiplier
      multiplier = this.customModifierSettings.rerollMultiplier;
    }

    const baseMultiplier = Math.min(
      Math.ceil(globalScene.currentBattle.waveIndex / 10) * baseValue * 2 ** this.rerollCount * multiplier,
      Number.MAX_SAFE_INTEGER,
    );

    // Apply Black Sludge to reroll cost
    const modifiedRerollCost = new NumberHolder(baseMultiplier);

    globalScene.applyModifier(HealShopCostModifier, true, modifiedRerollCost);

    // 난이도별 리롤 비용 보정
    const difficulty = globalScene.gameMode.difficulty;

    const difficultyMultiplier = difficulty === "EASY" ? 0.75 : difficulty === "HARD" ? 1.5 : 1;

    const frugalMultiplier = trainerCardManager.getMultiplier("REROLL_PRICE");

    const finalCost = Math.floor(modifiedRerollCost.value * difficultyMultiplier * frugalMultiplier);

    console.log("[TRAINER_CARD_FRUGAL_REROLL]", {
      difficulty,
      frugalMultiplier,
      finalCost,
    });

    console.log("[DIFFICULTY_REROLL_COST]", {
      difficulty,
      beforeCost: modifiedRerollCost.value,
      multiplier: difficultyMultiplier,
      afterCost: finalCost,
    });

    return finalCost;
  }

  getPoolType(): ModifierPoolType {
    return ModifierPoolType.PLAYER;
  }

  getModifierTypeOptions(modifierCount: number): ModifierTypeOption[] {
    return getPlayerModifierTypeOptions(
      modifierCount,
      globalScene.getPlayerParty(),
      globalScene.lockModifierTiers ? this.modifierTiers : undefined,
      this.customModifierSettings,
    );
  }

  copy(): SelectModifierPhase {
    return globalScene.phaseManager.create(
      "SelectModifierPhase",
      this.rerollCount,
      this.modifierTiers,
      {
        guaranteedModifierTypeOptions: this.typeOptions,
        rerollMultiplier: this.customModifierSettings?.rerollMultiplier,
        allowLuckUpgrades: false,
      },
      true,
    );
  }

  addModifier(modifier: Modifier): boolean {
    return globalScene.addModifier(modifier, false, true);
  }
}
