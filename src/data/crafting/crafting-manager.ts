import { globalScene } from "#app/global-scene";
import { PokeballType } from "#enums/pokeball";
import {
  type CraftingIngredient,
  type CraftingRecipe,
  type CraftingResult,
  getCraftingRecipe,
} from "./crafting-recipe";

export enum CraftingDestination {
  INVENTORY = "INVENTORY",
  STORAGE = "STORAGE",
}

export enum CraftingLocation {
  NORMAL = "NORMAL",
  ROGUE_WORKSHOP = "ROGUE_WORKSHOP",
}

export interface CraftingCheckResult {
  success: boolean;
  reason?: string;
  recipe?: CraftingRecipe;
}

export interface PendingCraftingResult {
  recipeId: string;
  result: CraftingResult;
  craftedTimes: number;
  consumedIngredients: CraftingIngredient[];
}

export interface CraftingActionResult {
  success: boolean;
  reason?: string;
  pending?: PendingCraftingResult;
}

/**
 * 범용 제작 시스템 관리자.
 *
 * 역할:
 * - 레시피 조회
 * - 재료 보유량 확인
 * - 재료 차감
 * - 제작 결과 임시 보관
 * - 창고 / 인벤토리 지급
 * - 로그센터 공방소 제작 시 창고 자동 지급
 *
 * 현재 인벤토리 직접 지급은 몬스터볼 계열만 연결되어 있습니다.
 * 이후 자원, 음식, 장비 등의 지급 방식은 addResultToInventory()에
 * 분기만 추가하면 됩니다.
 */
export class CraftingManager {
  private pendingCrafting: PendingCraftingResult | null = null;

  /**
   * 현재 지급 대기 중인 제작물이 있는지 확인합니다.
   */
  public hasPendingCrafting(): boolean {
    return this.pendingCrafting !== null;
  }

  /**
   * 현재 지급 대기 중인 제작물을 반환합니다.
   */
  public getPendingCrafting(): PendingCraftingResult | null {
    return this.pendingCrafting;
  }

  /**
   * 창고에 들어 있는 특정 itemId의 수량을 반환합니다.
   */
  public getStoredAmount(itemId: string): number {
    return globalScene.gameData.getStorageItems().find(item => item.itemId === itemId)?.quantity ?? 0;
  }

  /**
   * 해당 레시피를 지정 횟수만큼 제작할 수 있는지 확인합니다.
   */
  public canCraft(recipeId: string, times = 1): CraftingCheckResult {
    const recipe = getCraftingRecipe(recipeId);

    if (!recipe) {
      return {
        success: false,
        reason: `존재하지 않는 제작 레시피입니다: ${recipeId}`,
      };
    }

    const craftTimes = Math.floor(times);

    if (craftTimes <= 0) {
      return {
        success: false,
        reason: "제작 횟수는 1 이상이어야 합니다.",
        recipe,
      };
    }

    for (const ingredient of recipe.ingredients) {
      const requiredAmount = ingredient.amount * craftTimes;
      const ownedAmount = this.getStoredAmount(ingredient.itemId);

      if (ownedAmount < requiredAmount) {
        return {
          success: false,
          reason: `${ingredient.itemId}이(가) 부족합니다. ` + `(필요 ${requiredAmount} / 보유 ${ownedAmount})`,
          recipe,
        };
      }
    }

    return {
      success: true,
      recipe,
    };
  }

  /**
   * 제작을 시작합니다.
   *
   * 재료를 차감하고 결과물을 pending 상태로 둡니다.
   * 일반 제작에서는 이후 UI에서
   * "인벤토리에 추가한다 / 창고로 보낸다"를 선택한 뒤
   * completePendingCrafting()을 호출하면 됩니다.
   */
  public beginCraft(recipeId: string, times = 1): CraftingActionResult {
    if (this.pendingCrafting) {
      return {
        success: false,
        reason: "아직 지급하지 않은 제작물이 있습니다.",
        pending: this.pendingCrafting,
      };
    }

    const check = this.canCraft(recipeId, times);

    if (!check.success || !check.recipe) {
      return {
        success: false,
        reason: check.reason,
      };
    }

    const recipe = check.recipe;
    const craftTimes = Math.floor(times);
    const consumedIngredients: CraftingIngredient[] = [];

    /*
     * 재료를 하나씩 차감합니다.
     * 중간에 실패하면 이미 차감한 재료를 모두 돌려줍니다.
     */
    for (const ingredient of recipe.ingredients) {
      const amount = ingredient.amount * craftTimes;

      const removed = globalScene.gameData.removeFromStorage(ingredient.itemId, amount);

      if (!removed) {
        this.refundIngredients(consumedIngredients);

        return {
          success: false,
          reason: "제작 재료 차감에 실패했습니다.",
        };
      }

      consumedIngredients.push({
        itemId: ingredient.itemId,
        amount,
      });
    }

    this.pendingCrafting = {
      recipeId: recipe.id,
      result: {
        itemId: recipe.result.itemId,
        amount: recipe.result.amount * craftTimes,
      },
      craftedTimes: craftTimes,
      consumedIngredients,
    };

    return {
      success: true,
      pending: this.pendingCrafting,
    };
  }

  /**
   * 지급 대기 중인 제작물을 선택한 목적지로 보냅니다.
   */
  public completePendingCrafting(destination: CraftingDestination): CraftingActionResult {
    const pending = this.pendingCrafting;

    if (!pending) {
      return {
        success: false,
        reason: "지급 대기 중인 제작물이 없습니다.",
      };
    }

    let delivered = false;

    switch (destination) {
      case CraftingDestination.STORAGE:
        delivered = this.addResultToStorage(pending.result);
        break;

      case CraftingDestination.INVENTORY:
        delivered = this.addResultToInventory(pending.result);
        break;
    }

    if (!delivered) {
      return {
        success: false,
        reason: "제작물 지급에 실패했습니다.",
        pending,
      };
    }

    this.pendingCrafting = null;

    /*
     * 재료 차감 및 창고 지급 등의 시스템 데이터를 저장합니다.
     * 현재 모험 인벤토리(예: pokeballCounts)는 기존 세션 저장 흐름을 따릅니다.
     */
    void globalScene.gameData.saveSystem();

    return {
      success: true,
    };
  }

  /**
   * 로그센터 공방소 전용.
   *
   * 제작 즉시 창고로 보냅니다.
   * 별도의 목적지 선택 UI가 필요하지 않습니다.
   */
  public craftAtRogueWorkshop(recipeId: string, times = 1): CraftingActionResult {
    const started = this.beginCraft(recipeId, times);

    if (!started.success) {
      return started;
    }

    const completed = this.completePendingCrafting(CraftingDestination.STORAGE);

    /*
     * 창고 지급에 실패했다면 재료가 사라지지 않도록 되돌립니다.
     */
    if (!completed.success) {
      this.cancelPendingCrafting();
      return completed;
    }

    return completed;
  }

  /**
   * 제작 결과를 받기 전에 취소할 경우
   * 소비한 재료를 전부 돌려줍니다.
   */
  public cancelPendingCrafting(): boolean {
    if (!this.pendingCrafting) {
      return false;
    }

    this.refundIngredients(this.pendingCrafting.consumedIngredients);

    this.pendingCrafting = null;
    void globalScene.gameData.saveSystem();

    return true;
  }

  private refundIngredients(ingredients: CraftingIngredient[]): void {
    for (const ingredient of ingredients) {
      globalScene.gameData.addToStorage(ingredient.itemId, ingredient.amount);
    }
  }

  private addResultToStorage(result: CraftingResult): boolean {
    return globalScene.gameData.addToStorage(result.itemId, result.amount);
  }

  /**
   * 현재 모험의 인벤토리로 직접 지급합니다.
   *
   * 우선 몬스터볼 계열만 구현합니다.
   * 다른 제작품을 추가할 때 이 함수에 종류별 분기를 추가하면 됩니다.
   */
  private addResultToInventory(result: CraftingResult): boolean {
    if (result.itemId.startsWith("BALL_")) {
      return this.addBallToInventory(result);
    }

    return false;
  }

  private addBallToInventory(result: CraftingResult): boolean {
    const rawBallType = result.itemId.slice("BALL_".length);
    const ballType = Number(rawBallType);

    if (!Number.isInteger(ballType) || PokeballType[ballType] == null) {
      return false;
    }

    const typedBallType = ballType as PokeballType;

    globalScene.pokeballCounts[typedBallType] = (globalScene.pokeballCounts[typedBallType] ?? 0) + result.amount;

    return true;
  }
}

export const craftingManager = new CraftingManager();
