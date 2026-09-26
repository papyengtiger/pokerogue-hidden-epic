import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { kecleonShopManager } from "#data/kecleon-shop/kecleon-shop-manager";
import { getSpriteKeysFromSpecies } from "#data/mystery-encounters/utils/encounter-pokemon-utils";
import { CustomPokemonData } from "#data/pokemon-data";
import { AbilityId } from "#enums/ability-id";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { TrainerSlot } from "#enums/trainer-slot";
import { UiMode } from "#enums/ui-mode";
import type { PlayerPokemon } from "#field/pokemon";
import type { Modifier } from "#modifiers/modifier";
import { type PersistentModifier, PokemonHeldItemModifier } from "#modifiers/modifier";
import {
  PokemonHeldItemModifierType,
  PokemonModifierType,
  PokemonMoveModifierType,
  PokemonPpRestoreModifierType,
  PokemonPpUpModifierType,
  RememberMoveModifierType,
  TmModifierType,
  TrModifierType,
  ZExclusiveCrystalMoveModifierType,
  ZGenericCrystalMoveModifierType,
} from "#modifiers/modifier-type";
import { PokemonMove } from "#moves/pokemon-move";
import { loadPokemonVariantAssets } from "#sprites/pokemon-sprite";
import { PartyOption, PartyUiMode } from "#ui/party-ui-handler";
import { getPokemonSpecies } from "#utils/pokemon-utils";

/**
 * 캘리몬 상점 조우 Phase 1차 버전.
 *
 * 현재 기능:
 * - 캘리몬 상점 등장 판정
 * - 상품 생성
 * - 등장하지 않으면 즉시 종료
 * - 등장하면 생성된 상품을 콘솔에 출력
 * - 간단한 메시지로 상점 발견 알림
 *
 * 이후 추가 예정:
 * - 전용 KecleonShopUiHandler
 * - 상품 커서 이동
 * - 구매/취소
 * - 구매 대상 포켓몬 선택
 * - 돈 차감
 * - 도둑질
 */
export class KecleonShopPhase extends Phase {
  public readonly phaseName = "KecleonShopPhase";

  private shopKeeperSprite?: Phaser.GameObjects.Sprite;
  private displayItemSprites: Phaser.GameObjects.Sprite[] = [];
  private shopContainer?: Phaser.GameObjects.Container;

  public override start(): void {
    super.start();

    const waveIndex = globalScene.currentBattle.waveIndex;

    console.log("[KECLEON_SHOP_PHASE_START]", {
      wave: waveIndex,
    });

    const shopOptions = kecleonShopManager.getShopOptions();

    if (shopOptions.length === 0) {
      this.end();
      return;
    }

    // 이전 트레이너전의 적 트레이너 비주얼 제거
    if (globalScene.lastEnemyTrainer) {
      globalScene.lastEnemyTrainer.destroy();
      globalScene.lastEnemyTrainer = null;
    }

    globalScene.playBgm("kecleon_shop", true);

    console.log("[KECLEON_SHOP_FOUND]", {
      wave: waveIndex,
      items: shopOptions,
    });

    void this.startShopVisuals();
  }

  private restoreShopFieldVisuals(): void {
    const biome = globalScene.arena.biomeType;

    console.log("[KECLEON_SHOP_RESTORE_FIELD]", {
      biome,
    });

    // 현재 바이옴 텍스처 재적용
    globalScene.arenaPlayer.setBiome(biome);
    globalScene.arenaEnemy.setBiome(biome);

    // 필드 컨테이너
    globalScene.field.setVisible(true);
    globalScene.field.setAlpha(1);

    // 아레나 컨테이너
    globalScene.arenaPlayer.setVisible(true);
    globalScene.arenaPlayer.setAlpha(1);

    globalScene.arenaEnemy.setVisible(true);
    globalScene.arenaEnemy.setAlpha(1);

    // ★ 실제 바닥 스프라이트 자체 복원
    globalScene.arenaPlayer.base.setVisible(true);
    globalScene.arenaPlayer.base.setAlpha(1);

    globalScene.arenaEnemy.base.setVisible(true);
    globalScene.arenaEnemy.base.setAlpha(1);

    // 정상 전투 최종 위치
    globalScene.arenaPlayer.setPosition(0, 0);
    globalScene.arenaEnemy.setPosition(20, 0);

    // 전환용 아레나는 숨김
    globalScene.arenaNextEnemy.setVisible(false);
    globalScene.arenaPlayerTransition.setVisible(false);
    globalScene.arenaBgTransition.setVisible(false);

    console.log("[KECLEON_BATTLE_ARENA_RESTORED]", {
      playerContainerVisible: globalScene.arenaPlayer.visible,
      playerBaseVisible: globalScene.arenaPlayer.base.visible,

      enemyContainerVisible: globalScene.arenaEnemy.visible,
      enemyBaseVisible: globalScene.arenaEnemy.base.visible,

      playerX: globalScene.arenaPlayer.x,
      enemyX: globalScene.arenaEnemy.x,
    });
  }

  private async startShopVisuals(): Promise<void> {
    this.restoreShopFieldVisuals();

    this.createShopContainer();
    this.showDisplayItems();

    await this.showShopKeeper();

    // 캘리몬 상점도 일반 Encounter와 마찬가지로
    // 현재 wave 상태를 세션에 저장한다.
    const battle = globalScene.currentBattle;

    const success = await globalScene.gameData.saveAll(
      true,
      battle.waveIndex % 5 === 1 || (globalScene.lastSavePlayTime ?? 0) >= 300,
    );

    if (!success) {
      globalScene.reset(true);
      return;
    }

    console.log("[KECLEON_SHOP_SESSION_SAVED]", {
      wave: battle.waveIndex,
    });

    await this.showShopEncounter();

    globalScene.resetSeed();
  }

  /**
   * 1차 테스트용 상점 발견 연출.
   *
   * 전용 UI가 완성되기 전까지는
   * 상점 발견 사실과 상품 목록만 메시지로 보여준다.
   */
  private async showShopEncounter(): Promise<void> {
    await globalScene.ui.setMode(UiMode.MESSAGE);

    const options = kecleonShopManager.getShopOptions();

    if (options.length === 0) {
      this.end();
      return;
    }

    const itemText = options
      .map((option, index) => {
        const tierName = ModifierTier[option.type.tier];

        return (
          `${index + 1}. ` + `${option.type.getSafeName()} ` + `[${tierName}] ` + `${option.cost.toLocaleString()}G`
        );
      })
      .join("\n");

    globalScene.ui.showText(
      "캘리몬 상점을 발견했다!",
      null,
      () => {
        globalScene.ui.showText(
          "어서오세요!",
          null,
          () => {
            this.openShopUi();
          },
          null,
          true,
        );
      },
      null,
      true,
    );
  }

  private handleUnpaidExit(): void {
    const paymentDue = kecleonShopManager.getPaymentDue();

    const money = globalScene.money;

    console.log("[KECLEON_SHOP_THEFT_TRIGGER]", {
      paymentDue,
      money,
      shortage: paymentDue - money,
    });

    void globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
      globalScene.ui.showText(
        "도둑이다! 저놈 붙잡아라!",
        null,
        () => {
          void this.startKecleonTheftBattle();
        },
        null,
        true,
      );
    });
  }

  private async startKecleonTheftBattle(): Promise<void> {
    const wave = globalScene.currentBattle.waveIndex;

    kecleonShopManager.startTheftChase(wave);

    globalScene.playBgm("stop!-thief", true);

    this.clearShopSprites();

    console.log("[KECLEON_THEFT_START]", {
      wave,
      startWave: kecleonShopManager.getTheftStartWave(),
      endWave: kecleonShopManager.getTheftEndWave(),
    });

    globalScene.phaseManager.clearPhaseQueue(true);

    globalScene.phaseManager.unshiftNew("KecleonTheftBattlePhase");

    super.end();
  }

  private openShopUi(): void {
    const options = kecleonShopManager.getShopOptions();

    void globalScene.ui.setMode(
      UiMode.KECLEON_SHOP,
      options,
      (index: number) => {
        console.log("[KECLEON_SHOP_UI_SELECT]", {
          index,
        });

        // B / 취소
        if (index < 0) {
          const paymentDue = kecleonShopManager.getPaymentDue();

          // 아무것도 가져가지 않았다면 그냥 정상 퇴장
          if (paymentDue <= 0) {
            void globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
              globalScene.ui.showText(
                "또 와주세요!",
                null,
                () => {
                  this.end();
                },
                null,
                true,
              );
            });

            return true;
          }

          // 지불할 금액이 있다면 확인창
          this.openPaymentConfirm();

          return true;
        }

        // 아직 구매 기능 전이므로 선택만 확인
        const selected = options[index];

        if (!selected) {
          return false;
        }

        const placed = kecleonShopManager.getPlacedItem(index);

        // 원래 상품을 가져갔고,
        // 새로 놓은 상품도 없다면 진짜 빈칸
        if (kecleonShopManager.isItemTaken(index) && !placed) {
          globalScene.ui.playError();
          return false;
        }

        console.log("[KECLEON_SHOP_ITEM_SELECTED]", {
          index,
          name: selected.type.getSafeName(),
          cost: selected.cost,
        });

        this.takeShopItem(index);

        return true;
      },
      // 두기
      (index: number) => {
        this.putKecleonItem(index);
        return true;
      },

      // 교환하기
      (index: number) => {
        this.exchangeKecleonItem(index);
        return true;
      },
    );
  }

  private openPaymentConfirm(): void {
    const paymentDue = kecleonShopManager.getPaymentDue();

    const canPay = globalScene.money >= paymentDue;

    void globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
      globalScene.ui.showText(
        `금액은 총 ${paymentDue.toLocaleString()}G입니다.\n결제하시겠습니까?`,
        null,
        () => {
          globalScene.ui.setModeWithoutClear(UiMode.MENU_OPTION_SELECT, {
            options: [
              ...(canPay
                ? [
                    {
                      label: "예",
                      handler: () => {
                        this.payAndLeaveShop();
                        return true;
                      },
                      keepOpen: true,
                    },
                  ]
                : []),

              {
                label: "아니오",
                handler: () => {
                  this.handleUnpaidExit();
                  return true;
                },
                keepOpen: true,
              },
            ],

            xOffset: 0,
            yOffset: 0,
            maxOptions: 2,
          });
        },
        null,
        true,
      );
    });
  }

  private takeShopItem(index: number): void {
    const placed = kecleonShopManager.getPlacedItem(index);

    // ★ 새로 놓은 도구가 있으면 원래 상품보다 우선
    if (placed) {
      this.takePlacedItem(index, placed.modifier);
      return;
    }

    if (kecleonShopManager.isItemTaken(index)) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    const selected = kecleonShopManager.getShopOptions()[index];

    if (!selected) {
      return;
    }

    const modifierType = selected.type;

    if (modifierType instanceof PokemonModifierType) {
      this.openKecleonPokemonMenu(index, modifierType);
      return;
    }

    const modifier = modifierType.newModifier();

    if (!modifier) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    this.obtainKecleonItem(index, modifier, selected.cost);
  }

  private takePlacedItem(index: number, placedModifier: PersistentModifier): void {
    const modifier = placedModifier.clone();

    modifier.stackCount = 1;

    const result = globalScene.addModifier(modifier, false, true);

    if (!result) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    // 이 도구를 둘 때 받았던 크레딧
    const placedValue = kecleonShopManager.getPlacedItemValue(placedModifier);

    // 진열된 플레이어 도구 제거
    kecleonShopManager.removePlacedItem(index);

    // ★ 도로 가져갔으므로 받았던 크레딧 취소
    kecleonShopManager.addPaymentDue(placedValue);

    console.log("[KECLEON_SHOP_PLACED_ITEM_TAKEN_BACK]", {
      index,
      name: placedModifier.type.getSafeName(),
      restoredValue: placedValue,
      paymentDue: kecleonShopManager.getPaymentDue(),
    });

    this.refreshShopDisplay();
    this.openShopUi();
  }

  private putKecleonItem(index: number): void {
    const selected = kecleonShopManager.getShopOptions()[index];

    if (!selected) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    const type = selected.type;

    if (type instanceof PokemonHeldItemModifierType) {
      console.log("[KECLEON_SHOP_PUT_OPEN_POKEMON_ITEMS]", {
        index,
        name: type.getSafeName(),
      });

      this.openPokemonItemPutMenu(index);
      return;
    }

    if (type.isTrainerLoadoutItem()) {
      console.log("[KECLEON_SHOP_PUT_OPEN_TRAINER_ITEMS]", {
        index,
        name: type.getSafeName(),
      });

      this.openTrainerItemPutMenu(index);
      return;
    }

    globalScene.ui.playError();
    this.openShopUi();
  }

  private exchangeKecleonItem(index: number): void {
    const placed = kecleonShopManager.getPlacedItem(index);

    // 완전히 빈 슬롯은 교환할 대상이 없음
    if (kecleonShopManager.isItemTaken(index) && !placed) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    const selected = kecleonShopManager.getShopOptions()[index];

    if (!selected) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    // 실제 현재 슬롯에 진열된 도구
    const type = placed?.modifier.type ?? selected.type;

    if (type instanceof PokemonHeldItemModifierType) {
      console.log("[KECLEON_SHOP_EXCHANGE_OPEN_POKEMON_ITEMS]", {
        index,
        name: type.getSafeName(),
      });

      this.openPokemonItemExchangeMenu(index, type);
      return;
    }

    if (type.isTrainerLoadoutItem()) {
      console.log("[KECLEON_SHOP_EXCHANGE_OPEN_TRAINER_ITEMS]", {
        index,
        name: type.getSafeName(),
      });

      this.openTrainerItemExchangeMenu(index);
      return;
    }

    globalScene.ui.playError();
    this.openShopUi();
  }

  private openPokemonItemExchangeMenu(shopIndex: number, shopType: PokemonHeldItemModifierType): void {
    void globalScene.ui.setMode(
      UiMode.PARTY,
      PartyUiMode.KECLEON_PUT_ITEM_SELECT,
      -1,
      (slotIndex: number, itemIndex: number) => {
        const pokemon = globalScene.getPlayerParty()[slotIndex];

        if (!pokemon) {
          globalScene.ui.playError();
          this.openShopUi();
          return;
        }

        const items = globalScene.findModifiers(
          m => m.is("PokemonHeldItemModifier") && m.isTransferable && m.pokemonId === pokemon.id,
          true,
        ) as PokemonHeldItemModifier[];

        const offeredModifier = items[itemIndex];

        if (!offeredModifier) {
          globalScene.ui.playError();
          this.openShopUi();
          return;
        }

        this.exchangePokemonHeldItem(shopIndex, pokemon, offeredModifier, shopType);
      },
    );
  }

  private exchangePokemonHeldItem(
    shopIndex: number,
    pokemon: PlayerPokemon,
    offeredModifier: PokemonHeldItemModifier,
    shopType: PokemonHeldItemModifierType,
  ): void {
    const selected = kecleonShopManager.getShopOptions()[shopIndex];

    if (!selected) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    // ★ 이 선언이 필요합니다.
    const previousPlaced = kecleonShopManager.getPlacedItem(shopIndex);

    const receivedModifier = previousPlaced ? previousPlaced.modifier.clone() : shopType.newModifier(pokemon);

    if (!receivedModifier) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    receivedModifier.stackCount = 1;

    if (receivedModifier instanceof PokemonHeldItemModifier) {
      receivedModifier.pokemonId = pokemon.id;
    }
    // 먼저 상점 상품을 정상적으로 받을 수 있는지 처리
    const result = globalScene.addModifier(receivedModifier, false, true);

    if (!result) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    // 내가 내놓을 도구 복제
    const placedModifier = offeredModifier.clone() as PokemonHeldItemModifier;

    placedModifier.stackCount = 1;

    // 내 포켓몬에게서 1개 제거
    if (offeredModifier.stackCount > 1) {
      offeredModifier.stackCount--;
    } else {
      pokemon.loseHeldItem(offeredModifier);
    }

    const offeredValue = kecleonShopManager.getPlacedItemValue(placedModifier);

    // 원래 캘리몬 상품을 받은 경우에만 원래 가격 추가
    if (!previousPlaced) {
      kecleonShopManager.markItemTaken(shopIndex);

      kecleonShopManager.addPaymentDue(selected.cost);
    }

    // 내가 준 물건 가격만큼 지불액 감소
    kecleonShopManager.subtractPaymentDue(offeredValue);

    // 같은 슬롯을 내가 내놓은 물건으로 교체
    kecleonShopManager.replaceShopSlotWithPlacedItem(shopIndex, {
      modifier: placedModifier,
      source: "pokemon",
      originalPokemonId: pokemon.id,
    });

    globalScene.updateModifiers(true);
    pokemon.updateInfo();

    console.log("[KECLEON_SHOP_POKEMON_ITEM_EXCHANGED]", {
      shopIndex,
      received: receivedModifier.type.getSafeName(),
      offered: placedModifier.type.getSafeName(),
      offeredValue,
      paymentDue: kecleonShopManager.getPaymentDue(),
    });

    this.refreshShopDisplay();
    this.openShopUi();
  }

  // ★ 바로 여기에
  private openPokemonItemPutMenu(shopIndex: number): void {
    void globalScene.ui.setMode(
      UiMode.PARTY,
      PartyUiMode.KECLEON_PUT_ITEM_SELECT,
      -1,
      (slotIndex: number, itemIndex: number) => {
        const pokemon = globalScene.getPlayerParty()[slotIndex];

        if (!pokemon) {
          globalScene.ui.playError();
          this.openShopUi();
          return;
        }

        const items = globalScene.findModifiers(
          m => m.is("PokemonHeldItemModifier") && m.isTransferable && m.pokemonId === pokemon.id,
          true,
        ) as PokemonHeldItemModifier[];

        const modifier = items[itemIndex];

        if (!modifier) {
          globalScene.ui.playError();
          this.openShopUi();
          return;
        }

        this.placePokemonHeldItem(shopIndex, pokemon, modifier);

        this.openShopUi();
      },
    );
  }

  private refreshShopDisplay(): void {
    for (const sprite of this.displayItemSprites) {
      sprite.destroy();
    }

    this.displayItemSprites = [];

    this.showDisplayItems();
  }

  private placePokemonHeldItem(shopIndex: number, pokemon: PlayerPokemon, modifier: PokemonHeldItemModifier): void {
    const placedModifier = modifier.clone() as PokemonHeldItemModifier;

    placedModifier.stackCount = 1;

    // 플레이어에게서 1개 제거
    if (modifier.stackCount > 1) {
      modifier.stackCount--;
    } else {
      pokemon.loseHeldItem(modifier);
    }

    const placedValue = kecleonShopManager.getPlacedItemValue(placedModifier);

    kecleonShopManager.replaceShopSlotWithPlacedItem(shopIndex, {
      modifier: placedModifier,
      source: "pokemon",
      originalPokemonId: pokemon.id,
    });

    kecleonShopManager.subtractPaymentDue(placedValue);

    globalScene.updateModifiers(true);
    pokemon.updateInfo();

    console.log("[KECLEON_SHOP_POKEMON_ITEM_PLACED]", {
      shopIndex,
      pokemon: pokemon.name,
      name: placedModifier.type.getSafeName(),
      placedValue,
      paymentDue: kecleonShopManager.getPaymentDue(),
    });

    this.refreshShopDisplay();
  }

  private openKecleonPokemonMenu(index: number, modifierType: PokemonModifierType): void {
    const party = globalScene.getPlayerParty();

    const isMoveModifier = modifierType instanceof PokemonMoveModifierType;

    const isTmModifier = modifierType instanceof TmModifierType;

    const isTrModifier = modifierType instanceof TrModifierType;

    const isRememberMoveModifier = modifierType instanceof RememberMoveModifierType;

    const isZGeneric = modifierType instanceof ZGenericCrystalMoveModifierType;

    const isZExclusive = modifierType instanceof ZExclusiveCrystalMoveModifierType;

    const isPpRestore =
      modifierType instanceof PokemonPpRestoreModifierType || modifierType instanceof PokemonPpUpModifierType;

    const partyUiMode = isMoveModifier
      ? PartyUiMode.MOVE_MODIFIER
      : isTmModifier || isTrModifier || isZGeneric || isZExclusive
        ? PartyUiMode.TM_MODIFIER
        : isRememberMoveModifier
          ? PartyUiMode.REMEMBER_MOVE_MODIFIER
          : PartyUiMode.MODIFIER;

    const tmMoveId = isTmModifier ? modifierType.moveId : undefined;

    globalScene.ui.setModeWithoutClear(
      UiMode.PARTY,
      partyUiMode,
      -1,
      (slotIndex: number, option: PartyOption) => {
        if (slotIndex >= 6) {
          this.openShopUi();
          return;
        }

        const pokemon = party[slotIndex];

        const modifier = isMoveModifier
          ? modifierType.newModifier(pokemon, option - PartyOption.MOVE_1)
          : isRememberMoveModifier
            ? modifierType.newModifier(pokemon, option as number)
            : modifierType.newModifier(pokemon);

        if (!modifier) {
          globalScene.ui.playError();
          this.openShopUi();
          return;
        }

        const selected = kecleonShopManager.getShopOptions()[index];

        if (!selected) {
          return;
        }

        this.obtainKecleonItem(index, modifier, selected.cost);
      },
      modifierType.selectFilter,
      modifierType instanceof PokemonMoveModifierType ? modifierType.moveSelectFilter : undefined,
      tmMoveId,
      isPpRestore,
    );
  }

  private obtainKecleonItem(index: number, modifier: Modifier, cost: number): void {
    const result = globalScene.addModifier(modifier, false, true);

    if (!result) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    kecleonShopManager.markItemTaken(index);
    kecleonShopManager.addPaymentDue(cost);

    console.log("[KECLEON_SHOP_ITEM_OBTAINED]", {
      index,
      cost,
      paymentDue: kecleonShopManager.getPaymentDue(),
    });

    this.openShopUi();
  }

  private removeOneModifier(modifier: PersistentModifier): void {
    if (modifier.stackCount > 1) {
      modifier.stackCount--;
    } else {
      globalScene.removeModifier(modifier);
    }

    globalScene.updateModifiers(true);
  }

  private placeTrainerItem(shopIndex: number, modifier: PersistentModifier): void {
    const placedModifier = modifier.clone() as PersistentModifier;

    placedModifier.stackCount = 1;

    const placedValue = kecleonShopManager.getPlacedItemValue(placedModifier);

    // 플레이어 엔트리에서 1개 제거
    this.removeOneModifier(modifier);

    // 선택한 상점 슬롯에 배치
    kecleonShopManager.replaceShopSlotWithPlacedItem(shopIndex, {
      modifier: placedModifier,
      source: "trainer",
    });

    // 판매가만큼 지불 예정액 감소
    kecleonShopManager.subtractPaymentDue(placedValue);

    console.log("[KECLEON_SHOP_TRAINER_ITEM_PLACED]", {
      shopIndex,
      name: placedModifier.type.getSafeName(),
      placedValue,
      paymentDue: kecleonShopManager.getPaymentDue(),
    });

    this.refreshShopDisplay();
    this.openShopUi();
  }

  private getTrainerLoadoutItems(): PersistentModifier[] {
    const all = globalScene.findModifiers(() => true, true) as PersistentModifier[];

    console.log(
      "[KECLEON_TRAINER_ALL_MODIFIERS]",
      all.map(m => ({
        name: m.type?.getSafeName?.(),
        id: m.type?.id,
        group: m.type?.group,
        isTrainer: m.type?.isTrainerLoadoutItem?.(),
        className: m.constructor.name,
        stackCount: m.stackCount,
      })),
    );

    const items = all.filter(m => m.type?.isTrainerLoadoutItem?.() === true);

    console.log(
      "[KECLEON_TRAINER_ITEMS]",
      items.map(m => ({
        name: m.type.getSafeName(),
        id: m.type.id,
        group: m.type.group,
        stackCount: m.stackCount,
      })),
    );

    return items;
  }

  private openTrainerItemPutMenu(shopIndex: number): void {
    const items = this.getTrainerLoadoutItems();

    console.log("[KECLEON_TRAINER_PUT_MENU]", {
      shopIndex,
      count: items.length,
      items: items.map(m => m.type.getSafeName()),
    });

    if (items.length === 0) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    globalScene.ui.setModeWithoutClear(UiMode.MENU_OPTION_SELECT, {
      options: [
        ...items.map(modifier => ({
          label: modifier.type.getSafeName(),
          handler: () => {
            this.placeTrainerItem(shopIndex, modifier);

            return true;
          },
          keepOpen: true,
        })),

        {
          label: "취소",
          handler: () => {
            this.openShopUi();
            return true;
          },
          keepOpen: true,
        },
      ],

      xOffset: 0,
      yOffset: 0,
      maxOptions: 6,
    });
  }

  private openTrainerItemExchangeMenu(shopIndex: number): void {
    const items = this.getTrainerLoadoutItems();

    console.log("[KECLEON_TRAINER_EXCHANGE_MENU]", {
      shopIndex,
      count: items.length,
      items: items.map(m => m.type.getSafeName()),
    });

    if (items.length === 0) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    globalScene.ui.setModeWithoutClear(UiMode.MENU_OPTION_SELECT, {
      options: [
        ...items.map(modifier => ({
          label: modifier.type.getSafeName(),
          handler: () => {
            this.exchangeTrainerItem(shopIndex, modifier);

            return true;
          },
          keepOpen: true,
        })),

        {
          label: "취소",
          handler: () => {
            this.openShopUi();
            return true;
          },
          keepOpen: true,
        },
      ],

      xOffset: 0,
      yOffset: 0,
      maxOptions: 6,
    });
  }

  private exchangeTrainerItem(shopIndex: number, offeredModifier: PersistentModifier): void {
    const selected = kecleonShopManager.getShopOptions()[shopIndex];

    if (!selected) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    const previousPlaced = kecleonShopManager.getPlacedItem(shopIndex);

    // 현재 상점에 실제로 진열되어 있는 도구
    const receivedModifier = previousPlaced
      ? (previousPlaced.modifier.clone() as PersistentModifier)
      : (selected.type.newModifier() as PersistentModifier);

    if (!receivedModifier) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    receivedModifier.stackCount = 1;

    // 먼저 상점 도구를 받을 수 있는지 확인
    const result = globalScene.addModifier(receivedModifier, false, true);

    if (!result) {
      globalScene.ui.playError();
      this.openShopUi();
      return;
    }

    // 내가 내놓을 트레이너 도구
    const placedModifier = offeredModifier.clone() as PersistentModifier;

    placedModifier.stackCount = 1;

    const offeredValue = kecleonShopManager.getPlacedItemValue(placedModifier);

    // 기존에 플레이어가 놓았던 상품을 다시 받는 교환이라면
    // 그 상품을 놓을 때 받았던 크레딧을 먼저 취소
    if (previousPlaced) {
      const previousPlacedValue = kecleonShopManager.getPlacedItemValue(previousPlaced.modifier);

      kecleonShopManager.addPaymentDue(previousPlacedValue);
    } else {
      // 원래 캘리몬 상품을 받은 경우
      kecleonShopManager.markItemTaken(shopIndex);

      kecleonShopManager.addPaymentDue(selected.cost);
    }

    // 플레이어 엔트리에서 내놓은 도구 제거
    this.removeOneModifier(offeredModifier);

    // 내놓은 도구의 판매가만큼 차감
    kecleonShopManager.subtractPaymentDue(offeredValue);

    // 같은 슬롯에 플레이어 도구 배치
    kecleonShopManager.replaceShopSlotWithPlacedItem(shopIndex, {
      modifier: placedModifier,
      source: "trainer",
    });

    console.log("[KECLEON_SHOP_TRAINER_ITEM_EXCHANGED]", {
      shopIndex,
      received: receivedModifier.type.getSafeName(),
      offered: placedModifier.type.getSafeName(),
      offeredValue,
      paymentDue: kecleonShopManager.getPaymentDue(),
    });

    this.refreshShopDisplay();
    this.openShopUi();
  }

  private showDisplayItems(): void {
    const options = kecleonShopManager.getShopOptions();

    const positions = [
      { x: -20, y: 16 },
      { x: 0, y: 20 },
      { x: 20, y: 16 },
    ];

    for (let index = 0; index < Math.min(3, options.length); index++) {
      const pos = positions[index];

      const placed = kecleonShopManager.getPlacedItem(index);

      // 내가 새로 둔 도구가 있으면 그것을 표시
      if (placed) {
        const sprite = globalScene.add.sprite(pos.x, pos.y, "items", placed.modifier.type.iconImage);

        sprite.setOrigin(0.5, 1);
        sprite.setScale(0.75);

        sprite.setPipeline(globalScene.spritePipeline, {
          tone: [0, 0, 0, 0],
          hasShadow: false,
        });

        this.shopContainer?.add(sprite);
        this.displayItemSprites.push(sprite);

        continue;
      }

      // 가져간 슬롯이면 빈칸
      if (kecleonShopManager.isItemTaken(index)) {
        continue;
      }

      // 그 외에는 원래 캘리몬 상품 표시
      const option = options[index];

      if (!option) {
        continue;
      }

      const sprite = globalScene.add.sprite(pos.x, pos.y, "items", option.type.iconImage);

      sprite.setOrigin(0.5, 1);
      sprite.setScale(0.75);

      sprite.setPipeline(globalScene.spritePipeline, {
        tone: [0, 0, 0, 0],
        hasShadow: false,
      });

      this.shopContainer?.add(sprite);
      this.displayItemSprites.push(sprite);
    }
  }

  private clearShopSprites(): void {
    this.shopKeeperSprite?.destroy();
    this.shopKeeperSprite = undefined;

    this.shopContainer?.destroy(true);
    this.shopContainer = undefined;

    this.displayItemSprites = [];
  }

  private createShopContainer(): void {
    this.shopContainer = globalScene.add.container(230, 69);

    globalScene.field.add(this.shopContainer);
  }

  private createTheftKecleon(level: number) {
    const species = getPokemonSpecies(SpeciesId.KECLEON);

    const kecleon = globalScene.addEnemyPokemon(species, level, TrainerSlot.NONE, false);

    kecleon.customBaseStats = [60, 255, 255, 255, 255, 255];

    kecleon.customPokemonData = new CustomPokemonData({
      ability: AbilityId.PROTEAN,
      passive: AbilityId.SUPREME_OVERLORD,
    });

    kecleon.passive = true;

    kecleon.moveset = [
      new PokemonMove(MoveId.WIDE_IMPACT),
      new PokemonMove(MoveId.PRECIPICE_BLADES),
      new PokemonMove(MoveId.GLACIAL_LANCE),
      new PokemonMove(MoveId.MAX_AIRSTREAM),
    ];

    kecleon.summonData.moveset = kecleon.moveset;

    kecleon.calculateStats();
    kecleon.hp = kecleon.getMaxHp();

    kecleon.shiny = true;
    kecleon.variant = 2;

    kecleon.generateName();

    return kecleon;
  }

  private payAndLeaveShop(): void {
    const paymentDue = kecleonShopManager.getPaymentDue();

    if (paymentDue <= 0) {
      this.end();
      return;
    }

    if (globalScene.money < paymentDue) {
      globalScene.ui.playError();
      return;
    }

    const beforeMoney = globalScene.money;

    globalScene.addMoney(-paymentDue);

    kecleonShopManager.setPaymentDue(0);

    console.log("[KECLEON_SHOP_PAYMENT_COMPLETE]", {
      paymentDue,
      beforeMoney,
      remainingMoney: globalScene.money,
    });

    this.end();
  }

  private async showShopKeeper(): Promise<void> {
    const { spriteKey, fileRoot } = getSpriteKeysFromSpecies(SpeciesId.KECLEON, false, 0, true, 2);

    globalScene.loadPokemonAtlas(spriteKey, fileRoot);

    const variantPromise = loadPokemonVariantAssets(spriteKey, fileRoot, 2);

    await new Promise<void>(resolve => {
      globalScene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());

      if (!globalScene.load.isLoading()) {
        globalScene.load.start();
      }
    });

    await variantPromise;

    const sprite = globalScene.addFieldSprite(230, 69, spriteKey);

    sprite.setOrigin(0.5, 1);

    sprite.setPipeline(globalScene.spritePipeline, {
      tone: [0, 0, 0, 0],
      hasShadow: true,
    });

    sprite.setPipelineData("spriteKey", spriteKey);
    sprite.setPipelineData("shiny", true);
    sprite.setPipelineData("variant", 2);

    globalScene.field.add(sprite);

    this.shopKeeperSprite = sprite;

    if (!globalScene.anims.exists(spriteKey)) {
      const originalWarn = console.warn;
      console.warn = () => {};

      const frames = globalScene.anims.generateFrameNames(spriteKey, {
        zeroPad: 4,
        suffix: ".png",
        start: 1,
        end: 128,
      });

      console.warn = originalWarn;

      globalScene.anims.create({
        key: spriteKey,
        frames,
        frameRate: 10,
        repeat: -1,
      });
    }

    if (sprite.texture.frameTotal > 1) {
      sprite.play(spriteKey);
    }
  }

  public override end(): void {
    this.clearShopSprites();

    console.log("[KECLEON_SHOP_END_ENTER]");

    console.log("[KECLEON_SHOP_PHASE_END]", {
      wave: globalScene.currentBattle.waveIndex,
      generatedWave: kecleonShopManager.getGeneratedWave(),
      hasShop: kecleonShopManager.hasShop(),
    });

    const oldWave = globalScene.currentBattle.waveIndex;

    console.log("[KECLEON_SHOP_EXIT_BEFORE_NEW_BATTLE]", {
      oldWave,
    });

    kecleonShopManager.clearShop();

    // 정상 전투 종료와 동일하게
    // 바이옴 전환이 필요한 층이면 먼저 SelectBiomePhase
    if (globalScene.gameMode.hasRandomBiomes || globalScene.isNewBiome()) {
      globalScene.phaseManager.unshiftNew("SelectBiomePhase");

      globalScene.phaseManager.unshiftNew("NewBattlePhase");
    } else {
      globalScene.phaseManager.unshiftNew("NewBattlePhase");
    }

    super.end();
  }
}
