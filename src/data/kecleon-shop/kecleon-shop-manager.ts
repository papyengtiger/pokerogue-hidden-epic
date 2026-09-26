import { globalScene } from "#app/global-scene";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import { ModifierTier } from "#enums/modifier-tier";
import type { PersistentModifier } from "#modifiers/modifier";
import {
  type GeneratedPersistentModifierType,
  getModifierTypeFuncById,
  type ModifierType,
  ModifierTypeGenerator,
  ModifierTypeOption,
  type WeightedModifierType,
} from "#modifiers/modifier-type";
import type { KecleonShopSaveData } from "#types/save-data";
import { randSeedInt } from "#utils/common";
import { getModifierPoolForType } from "#utils/modifier-utils";

export interface KecleonShopConfig {
  minWave: number;
  spawnChancePercent: number;

  /** 최소 판매 상품 수 */
  minItemCount: number;

  /** 최대 판매 상품 수 */
  maxItemCount: number;

  /** 상점의 총 슬롯 수 */
  slotCount: number;

  priceMultiplier: number;
  duplicateRetryCount: number;
}

export interface KecleonPlacedItem {
  modifier: PersistentModifier;
  source: "trainer" | "pokemon";
  originalPokemonId?: number;
}

const DEFAULT_CONFIG: KecleonShopConfig = {
  minWave: 51,
  spawnChancePercent: 15,
  minItemCount: 5,
  maxItemCount: 25,
  slotCount: 25,
  priceMultiplier: 1,
  duplicateRetryCount: 20,
};

/**
 * 캘리몬 상점 1차 매니저.
 *
 * 현재 목표:
 * - PLAYER modifier pool을 그대로 활용
 * - 기존 weight 조건을 존중
 * - ModifierTypeGenerator 지원
 * - 캘리몬 상점 후보만 필터링
 * - 같은 아이템/그룹 중복 최소화
 * - 층수에 비례한 가격 부여
 *
 * 아직 포함하지 않는 것:
 * - 전용 UI
 * - 실제 구매 처리
 * - 도둑질 판정
 * - 바이옴별 등장 제한
 * - 특성/아이템에 따른 등장률 보정
 */
export class KecleonShopManager {
  private readonly config: KecleonShopConfig;
  private shopOptions: ModifierTypeOption[] = [];
  private generatedWave = -1;
  private lastShopWave = -1;

  private paymentDue = 0;
  private takenItemIndexes = new Set<number>();

  private placedItems = new Map<number, KecleonPlacedItem>();

  private pendingLegacyRegenerate = false;
  private pendingLegacyItemCount = 0;

  private shopSlotIndexes: number[] = [];

  private theftBattleActive = false;

  // 도둑질이 시작된 층
  private theftStartWave = -1;

  // 추격전 마지막 층
  private theftEndWave = -1;

  private pendingTheftRestore = false;

  public isTheftBattleActive(): boolean {
    return this.theftBattleActive;
  }

  public startTheftChase(startWave: number): void {
    this.theftBattleActive = true;
    this.theftStartWave = startWave;
    this.theftEndWave = this.calculateTheftChaseEndWave(startWave);

    console.log("[KECLEON_THEFT_CHASE_STARTED]", {
      startWave: this.theftStartWave,
      endWave: this.theftEndWave,
    });
  }

  public isTheftChaseWave(wave: number): boolean {
    return this.theftBattleActive && wave >= this.theftStartWave && wave <= this.theftEndWave;
  }

  public getTheftStartWave(): number {
    return this.theftStartWave;
  }

  public getTheftEndWave(): number {
    return this.theftEndWave;
  }

  public finishTheftChase(): void {
    console.log("[KECLEON_THEFT_CHASE_FINISHED]", {
      startWave: this.theftStartWave,
      endWave: this.theftEndWave,
    });

    this.theftBattleActive = false;
    this.theftStartWave = -1;
    this.theftEndWave = -1;
    this.pendingTheftRestore = false;
  }

  public markTheftRestorePending(): void {
    this.pendingTheftRestore = true;
  }

  public consumeTheftRestorePending(): boolean {
    if (!this.pendingTheftRestore) {
      return false;
    }

    this.pendingTheftRestore = false;
    return true;
  }

  private calculateTheftChaseEndWave(startWave: number): number {
    /**
     * 캘리몬 추격전 종료 규칙
     *
     * - 추격전은 현재 10층 구간을 넘지 않는다.
     *
     * 예:
     *  1~10층에서 시작  -> 10층 종료
     * 11~20층에서 시작  -> 20층 종료
     * 21~30층에서 시작  -> 30층 종료
     *
     * - 단, 종료 예정층이 50의 배수인 경우
     *   보스전에 침범하지 않도록 바로 전 층에서 종료한다.
     *
     * 예:
     * 41~49층에서 시작   -> 49층 종료
     * 91~99층에서 시작   -> 99층 종료
     * 141~149층에서 시작 -> 149층 종료
     *
     * 즉:
     * 4층 시작  -> 10층
     * 17층 시작 -> 20층
     * 44층 시작 -> 49층
     * 97층 시작 -> 99층
     */

    // 현재 startWave가 속한 10층 구간의 마지막 층
    let endWave = Math.ceil(startWave / 10) * 10;

    // 50 / 100 / 150 / 200 ... 은 보스층이므로
    // 바로 이전의 9층대에서 추격 종료
    if (endWave % 50 === 0) {
      endWave -= 1;
    }

    // 혹시 특수한 상황으로 보스층 자체에서 추격이 시작된 경우
    // 종료층이 시작층보다 작아지는 것을 방지한다.
    if (endWave < startWave) {
      const nextTenWave = Math.ceil((startWave + 1) / 10) * 10;

      endWave = nextTenWave % 50 === 0 ? nextTenWave - 1 : nextTenWave;
    }

    return endWave;
  }

  constructor(config: Partial<KecleonShopConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * 현재 층에서 캘리몬 상점이 등장할지 결정한다.
   *
   * 주의:
   * 특수층/보스층 예외는 아직 넣지 않았다.
   * 다음 단계에서 gameMode / arena 정보를 보고 추가하는 것을 권장.
   */
  public shouldSpawnShop(waveIndex = globalScene.currentBattle.waveIndex): boolean {
    // 추격 종료층을 이미 벗어났는데 상태가 남아 있다면
    // 추격 상태를 완전히 종료한다.
    if (this.theftBattleActive && this.theftEndWave >= 0 && waveIndex > this.theftEndWave) {
      console.log("[KECLEON_THEFT_AUTO_FINISH]", {
        wave: waveIndex,
        startWave: this.theftStartWave,
        endWave: this.theftEndWave,
      });

      this.finishTheftChase();
    }

    // 실제 추격전 진행 중일 때만 상점 금지
    if (this.theftBattleActive) {
      return false;
    }

    // 최소 등장층 이전
    if (waveIndex < this.config.minWave) {
      return false;
    }

    // 같은 층 중복 생성 방지
    if (this.lastShopWave === waveIndex) {
      return false;
    }

    const roll = randSeedInt(100);

    const spawned = roll < this.config.spawnChancePercent;

    console.log("[KECLEON_SHOP_SPAWN_ROLL]", {
      wave: waveIndex,
      roll,
      chance: this.config.spawnChancePercent,
      spawned,
    });

    return spawned;
  }

  public getShopSlotIndex(itemIndex: number): number {
    return this.shopSlotIndexes[itemIndex] ?? itemIndex;
  }

  public getItemIndexAtSlot(slotIndex: number): number {
    return this.shopSlotIndexes.indexOf(slotIndex);
  }

  public getShopSlotCount(): number {
    return this.config.slotCount;
  }

  /**
   * 상점 상품을 새로 생성한다.
   *
   * @param waveIndex 현재 층
   * @param itemCount 생성할 상품 수
   */
  public generateShopOptions(
    waveIndex = globalScene.currentBattle.waveIndex,
    itemCount?: number,
  ): ModifierTypeOption[] {
    const party = globalScene.getPlayerParty();

    this.shopOptions = [];
    this.generatedWave = waveIndex;

    this.paymentDue = 0;
    this.takenItemIndexes.clear();
    this.placedItems.clear();

    const count =
      itemCount != null
        ? Math.max(0, Math.floor(itemCount))
        : this.config.minItemCount + randSeedInt(this.config.maxItemCount - this.config.minItemCount + 1);

    for (let i = 0; i < count; i++) {
      let option: ModifierTypeOption | null = null;

      for (let retry = 0; retry <= this.config.duplicateRetryCount; retry++) {
        const tier = this.rollTier();
        const candidate = this.rollCandidateFromTier(tier);

        if (!candidate) {
          continue;
        }

        if (this.isDuplicate(candidate) && retry < this.config.duplicateRetryCount) {
          continue;
        }

        const price = this.calculatePrice(candidate, waveIndex);

        option = new ModifierTypeOption(candidate, 0, price);

        break;
      }

      if (option) {
        this.shopOptions.push(option);
      }
    }

    // 최소 5개 보장
    let minimumRetry = 0;
    const minimumRetryLimit = 100;

    while (this.shopOptions.length < this.config.minItemCount && minimumRetry < minimumRetryLimit) {
      minimumRetry++;

      const tier = this.rollTier();
      const candidate = this.rollCandidateFromTier(tier);

      if (!candidate) {
        continue;
      }

      const price = this.calculatePrice(candidate, waveIndex);

      this.shopOptions.push(new ModifierTypeOption(candidate, 0, price));
    }

    this.shopSlotIndexes = [];

    const availableSlots = Array.from({ length: this.config.slotCount }, (_, index) => index);

    for (let i = availableSlots.length - 1; i > 0; i--) {
      const j = randSeedInt(i + 1);

      [availableSlots[i], availableSlots[j]] = [availableSlots[j], availableSlots[i]];
    }

    this.shopSlotIndexes = availableSlots.slice(0, this.shopOptions.length);

    console.log("[KECLEON_SHOP_GENERATED]", {
      wave: waveIndex,
      count: this.shopOptions.length,
      items: this.shopOptions.map(option => ({
        id: option.type.id,
        name: option.type.getSafeName(),
        tier: ModifierTier[option.type.tier],
        group: option.type.group,
        purchaseMode: option.type.getRogueShopPurchaseMode(),
        cost: option.cost,
      })),
    });

    return [...this.shopOptions];
  }

  /**
   * 테스트용 편의 메서드.
   * 등장 판정에 성공하면 바로 상품을 생성한다.
   */
  public tryGenerateShop(waveIndex = globalScene.currentBattle.waveIndex): ModifierTypeOption[] {
    if (!this.shouldSpawnShop(waveIndex)) {
      this.clearShop();

      console.log("[KECLEON_SHOP_SKIP]", {
        wave: waveIndex,
      });

      return [];
    }

    console.log("[KECLEON_SHOP_SPAWN]", {
      wave: waveIndex,
    });

    return this.generateShopOptions(waveIndex);
  }

  public getShopOptions(): readonly ModifierTypeOption[] {
    return this.shopOptions;
  }

  public getGeneratedWave(): number {
    return this.generatedWave;
  }

  public hasShop(): boolean {
    return this.shopOptions.length > 0;
  }

  public getPaymentDue(): number {
    return this.paymentDue;
  }

  public getPlacedItem(index: number): KecleonPlacedItem | undefined {
    return this.placedItems.get(index);
  }

  public replaceShopSlotWithPlacedItem(index: number, item: KecleonPlacedItem): void {
    this.placedItems.set(index, item);

    console.log("[KECLEON_SHOP_SLOT_REPLACED]", {
      index,
      name: item.modifier.type.getSafeName(),
      source: item.source,
    });
  }

  public getPlacedItems(): ReadonlyMap<number, KecleonPlacedItem> {
    return this.placedItems;
  }

  public addPaymentDue(amount: number): void {
    this.paymentDue = Math.max(0, this.paymentDue + Math.max(0, amount));

    console.log("[KECLEON_SHOP_PAYMENT_DUE]", {
      paymentDue: this.paymentDue,
      money: globalScene.money,
    });
  }

  public subtractPaymentDue(amount: number): void {
    const credit = Math.max(0, amount);

    this.paymentDue = Math.max(0, this.paymentDue - credit);

    console.log("[KECLEON_SHOP_PAYMENT_CREDIT]", {
      credit,
      paymentDue: this.paymentDue,
      money: globalScene.money,
    });
  }

  public getPlacedItemValue(modifier: PersistentModifier): number {
    const shopPrice = this.calculatePrice(modifier.type, this.generatedWave);

    // 판매가는 상점가의 절반
    return Math.max(1, Math.floor(shopPrice / 2));
  }

  public isItemTaken(index: number): boolean {
    return this.takenItemIndexes.has(index);
  }

  public regeneratePendingLegacyShop(): boolean {
    if (!this.pendingLegacyRegenerate) {
      return false;
    }

    if (!globalScene.currentBattle) {
      console.warn("[KECLEON_SHOP_LEGACY_REGEN_WAIT_NO_BATTLE]");
      return false;
    }

    const wave = this.generatedWave >= 0 ? this.generatedWave : globalScene.currentBattle.waveIndex;

    const count = this.pendingLegacyItemCount || this.config.minItemCount;

    console.log("[KECLEON_SHOP_LEGACY_REGENERATE]", {
      wave,
      count,
    });

    this.pendingLegacyRegenerate = false;
    this.pendingLegacyItemCount = 0;

    this.generateShopOptions(wave, count);

    this.lastShopWave = wave;

    return this.hasShop();
  }

  public markItemTaken(index: number): boolean {
    if (index < 0 || index >= this.shopOptions.length || this.takenItemIndexes.has(index)) {
      return false;
    }

    this.takenItemIndexes.add(index);

    console.log("[KECLEON_SHOP_ITEM_TAKEN]", {
      index,
      name: this.shopOptions[index]?.type.getSafeName(),
      cost: this.shopOptions[index]?.cost,
    });

    return true;
  }

  public getSaveData(): KecleonShopSaveData | undefined {
    if (!this.hasShop() && !this.theftBattleActive) {
      return;
    }

    console.log("[KECLEON_SHOP_SAVE_ITEMS]", {
      items: this.shopOptions.map((option, index) => ({
        index,
        id: option.type.id,
        name: option.type.getSafeName(),
        constructor: option.type.constructor.name,
        tier: option.type.tier,
      })),
    });

    console.log("[KECLEON_SHOP_BEFORE_SAVE]", {
      items: this.shopOptions.map((option, index) => ({
        index,
        id: option.type.id,
        name: option.type.getSafeName(),
        constructor: option.type.constructor.name,
        tier: option.type.tier,
      })),
    });

    return {
      active: this.hasShop(),
      generatedWave: this.generatedWave,
      paymentDue: this.paymentDue,

      theftBattleActive: this.theftBattleActive,
      theftStartWave: this.theftStartWave,
      theftEndWave: this.theftEndWave,

      items: this.shopOptions.map((option, index) => {
        const generatedType = option.type as Partial<GeneratedPersistentModifierType>;

        const pregenArgs =
          typeof generatedType.getPregenArgs === "function" ? generatedType.getPregenArgs() : undefined;

        return {
          typeId: option.type.id,
          tier: option.type.tier,
          cost: option.cost,
          taken: this.takenItemIndexes.has(index),
          pregenArgs,
        };
      }),
    };
  }

  public loadSaveData(data?: KecleonShopSaveData): void {
    this.clearShop();

    if (!data) {
      console.log("[KECLEON_SHOP_LOAD_NONE]");
      return;
    }

    // 추격 상태부터 복원
    this.theftBattleActive = !!data.theftBattleActive;

    this.theftStartWave = Number.isFinite(data.theftStartWave) ? Number(data.theftStartWave) : -1;

    this.theftEndWave = Number.isFinite(data.theftEndWave) ? Number(data.theftEndWave) : -1;

    if (this.theftBattleActive) {
      this.markTheftRestorePending();
    }

    console.log("[KECLEON_THEFT_LOAD_STATE]", {
      active: this.theftBattleActive,
      startWave: this.theftStartWave,
      endWave: this.theftEndWave,
      currentWave: globalScene.currentBattle?.waveIndex,
    });

    // 상점 데이터가 없으면 추격 상태만 복원하고 종료
    if (!data.active || !Array.isArray(data.items) || data.items.length === 0) {
      return;
    }

    // ↓ 여기부터 기존 상점 복원 코드
    // 상점 데이터 복원
    this.generatedWave = data.generatedWave ?? -1;
    this.lastShopWave = this.generatedWave;

    this.paymentDue = Math.max(0, Number(data.paymentDue ?? 0));

    const hasValidTypeIds = data.items.every(item => typeof item.typeId === "string" && item.typeId.length > 0);

    if (!hasValidTypeIds) {
      console.warn("[KECLEON_SHOP_LEGACY_SAVE_PENDING]", {
        wave: data.generatedWave,
        count: data.items.length,
      });

      this.pendingLegacyRegenerate = true;
      this.pendingLegacyItemCount = data.items.length > 0 || this.config.minItemCount;

      return;
    }

    for (let index = 0; index < data.items.length; index++) {
      const savedItem = data.items[index];

      const modifierTypeFunc = getModifierTypeFuncById(savedItem.typeId);

      let type = modifierTypeFunc?.();

      console.log("[KECLEON_SHOP_LOAD_TYPE]", {
        index,
        typeId: savedItem.typeId,
        hasFunc: !!modifierTypeFunc,
        pregenArgs: savedItem.pregenArgs,
      });

      if (!type) {
        console.warn("[KECLEON_SHOP_LOAD_ITEM_FAILED]", {
          index,
          typeId: savedItem.typeId,
          savedItem,
        });
        continue;
      }

      if (type instanceof ModifierTypeGenerator) {
        type = type.generateType(globalScene.getPlayerParty(), savedItem.pregenArgs);

        if (!type) {
          console.warn("[KECLEON_SHOP_LOAD_GENERATOR_FAILED]", {
            index,
            typeId: savedItem.typeId,
            pregenArgs: savedItem.pregenArgs,
          });
          continue;
        }
      }

      type.setTier(savedItem.tier as ModifierTier);

      const option = new ModifierTypeOption(type, 0, Math.max(1, Number(savedItem.cost ?? 1)));

      const restoredIndex = this.shopOptions.length;

      this.shopOptions.push(option);

      if (savedItem.taken) {
        this.takenItemIndexes.add(restoredIndex);
      }
    }

    console.log("[KECLEON_SHOP_LOADED]", {
      wave: this.generatedWave,
      paymentDue: this.paymentDue,
      count: this.shopOptions.length,
      taken: [...this.takenItemIndexes],
      items: this.shopOptions.map((option, index) => ({
        index,
        id: option.type.id,
        name: option.type.getSafeName(),
        tier: ModifierTier[option.type.tier],
        cost: option.cost,
        taken: this.takenItemIndexes.has(index),
      })),
    });
  }

  public setPaymentDue(amount: number): void {
    this.paymentDue = Math.max(0, amount);

    console.log("[KECLEON_SHOP_PAYMENT_DUE_SET]", {
      paymentDue: this.paymentDue,
    });
  }

  public removePlacedItem(index: number): KecleonPlacedItem | undefined {
    const item = this.placedItems.get(index);

    if (!item) {
      return;
    }

    this.placedItems.delete(index);

    console.log("[KECLEON_SHOP_PLACED_ITEM_REMOVED]", {
      index,
      name: item.modifier.type.getSafeName(),
    });

    return item;
  }

  public clearShop(resetLastShopWave = false): void {
    this.shopOptions = [];
    this.generatedWave = -1;

    this.paymentDue = 0;
    this.takenItemIndexes.clear();

    this.placedItems.clear();

    this.shopSlotIndexes = [];

    if (resetLastShopWave) {
      this.lastShopWave = -1;
    }
  }

  private isTrainerItemAtMaxStack(type: ModifierType): boolean {
    if (type.group !== "trainer") {
      return false;
    }

    const candidateModifier = type.newModifier() as PersistentModifier;

    if (!candidateModifier) {
      return false;
    }

    const existingModifiers = globalScene.findModifiers(
      modifier => modifier.type?.id === type.id,
      true,
    ) as PersistentModifier[];

    if (existingModifiers.length === 0) {
      return false;
    }

    const totalOwned = existingModifiers.reduce((sum, modifier) => sum + modifier.getStackCount(), 0);

    const maxStack = candidateModifier.getMaxStackCount();

    const atMax = totalOwned >= maxStack;

    if (atMax) {
      console.log("[KECLEON_SHOP_TRAINER_ITEM_MAX]", {
        id: type.id,
        name: type.getSafeName(),
        owned: totalOwned,
        max: maxStack,
      });
    }

    return atMax;
  }

  /**
   * PLAYER 풀에서 해당 등급의 후보 하나를 weight 기반으로 뽑는다.
   *
   * Generator 타입은 실제 ModifierType으로 생성한 뒤
   * 캘리몬 상점 후보 판정을 수행한다.
   */
  private rollCandidateFromTier(tier: ModifierTier): ModifierType | null {
    const pool = getModifierPoolForType(ModifierPoolType.PLAYER);
    const tierPool = pool[tier];

    if (tierPool?.length === 0) {
      return this.rollCandidateFromLowerTier(tier);
    }

    const party = globalScene.getPlayerParty();

    const candidates: Array<{
      type: ModifierType;
      weight: number;
    }> = [];

    for (const entry of tierPool as WeightedModifierType[]) {
      const weight = entry.weight instanceof Function ? entry.weight(party, 0) : entry.weight;

      if (!weight || weight <= 0) {
        continue;
      }

      let type: ModifierType | null = entry.modifierType;

      const sourceId = type.id;

      if (type instanceof ModifierTypeGenerator) {
        type = type.generateType(party);

        if (!type) {
          continue;
        }

        // 생성된 타입에 id가 없다면 Generator의 id 계승
        if (!type.id && sourceId) {
          type.id = sourceId;
        }
      }

      if (!type.id) {
        console.warn("[KECLEON_SHOP_CANDIDATE_NO_ID]", {
          name: type.getSafeName(),
          constructor: type.constructor.name,
          iconImage: type.iconImage,
          group: type.group,
          tier,
          sourceId,
        });

        continue;
      }

      type.setTier(tier);

      if (!this.isKecleonShopCandidate(type)) {
        continue;
      }

      // 이미 최대 소지한 트레이너 도구는 진열하지 않음
      if (this.isTrainerItemAtMaxStack(type)) {
        console.log("[KECLEON_SHOP_SKIP_MAX_STACK]", {
          id: type.id,
          name: type.getSafeName(),
        });

        continue;
      }

      if (!type.id) {
        console.warn("[KECLEON_SHOP_CANDIDATE_NO_ID]", {
          name: type.getSafeName(),
          constructor: type.constructor.name,
          iconImage: type.iconImage,
          group: type.group,
          tier,
        });

        continue;
      }

      candidates.push({
        type,
        weight,
      });
    }

    if (candidates.length === 0) {
      return this.rollCandidateFromLowerTier(tier);
    }

    const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);

    if (totalWeight <= 0) {
      return null;
    }

    let value = randSeedInt(totalWeight);

    for (const candidate of candidates) {
      if (value < candidate.weight) {
        return candidate.type;
      }

      value -= candidate.weight;
    }

    return candidates[candidates.length - 1]?.type ?? null;
  }

  /**
   * 현재 modifier-type.ts에 이미 존재하는 상점 후보 규칙을 사용한다.
   *
   * 현재 규칙:
   * - PokemonHeldItemModifierType
   * - group === "trainer"
   *
   * 나중에 캘리몬 상점에서 소비 아이템/TM/열매 등을
   * 판매하고 싶다면 이 함수만 수정하면 된다.
   */
  private isKecleonShopCandidate(type: ModifierType): boolean {
    // 캘리몬 상점 전용 추가 상품
    if (type.id === "LUCKY_EGG" || type.id === "GOLDEN_EGG") {
      return true;
    }

    return type.isRogueShopCandidate();
  }

  /**
   * 해당 등급에 유효 후보가 없을 경우 한 단계씩 내려간다.
   */
  private rollCandidateFromLowerTier(tier: ModifierTier): ModifierType | null {
    let fallbackTier = Number(tier) - 1;

    while (fallbackTier >= Number(ModifierTier.COMMON)) {
      const candidate = this.rollCandidateFromTier(fallbackTier as ModifierTier);

      if (candidate) {
        return candidate;
      }

      fallbackTier--;
    }

    return null;
  }

  /**
   * 기존 보상 풀과 같은 기본 등급 확률:
   * COMMON 75%
   * GREAT 약 19%
   * ULTRA 약 4.7%
   * ROGUE 약 1.1%
   * MASTER 약 0.1%
   *
   * 캘리몬 전용 확률은 차후 여기만 수정하면 된다.
   */
  private rollTier(): ModifierTier {
    const tierValue = randSeedInt(1024);

    if (tierValue > 255) {
      return ModifierTier.COMMON;
    }

    if (tierValue > 60) {
      return ModifierTier.GREAT;
    }

    if (tierValue > 12) {
      return ModifierTier.ULTRA;
    }

    if (tierValue) {
      return ModifierTier.ROGUE;
    }

    return ModifierTier.MASTER;
  }

  /**
   * 우선 등급별 단순 배율로 가격을 정한다.
   *
   * 일반 상점처럼 wave money를 기준으로 하므로
   * 게임 진행도에 따라 자연스럽게 가격이 증가한다.
   */
  private calculatePrice(type: ModifierType, _waveIndex: number): number {
    const baseCost = globalScene.getWaveMoneyAmount(1);

    let tierMultiplier = 1;

    switch (type.tier) {
      case ModifierTier.COMMON:
        tierMultiplier = 0.5;
        break;

      case ModifierTier.GREAT:
        tierMultiplier = 1;
        break;

      case ModifierTier.ULTRA:
        tierMultiplier = 2;
        break;

      case ModifierTier.ROGUE:
        tierMultiplier = 4;
        break;

      case ModifierTier.MASTER:
        tierMultiplier = 8;
        break;
    }

    return Math.max(1, Math.round(baseCost * tierMultiplier * this.config.priceMultiplier));
  }

  /**
   * 같은 id, 이름 또는 group의 상품이 이미 진열되어 있는지 확인한다.
   * 기존 보상 생성의 중복 억제 방식과 비슷하게 동작한다.
   */
  private isDuplicate(type: ModifierType): boolean {
    return this.shopOptions.some(option => {
      const existing = option.type;

      if (type.id && existing.id === type.id) {
        return true;
      }

      if (existing.name === type.name) {
        return true;
      }

      return !!type.group && existing.group === type.group;
    });
  }
}

export const kecleonShopManager = new KecleonShopManager();
