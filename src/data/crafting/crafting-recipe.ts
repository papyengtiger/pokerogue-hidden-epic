import { ApricornType } from "#enums/apricorn-type";
import { PokeballType } from "#enums/pokeball";

/**
 * 제작에 필요한 재료 하나.
 *
 * itemId는 창고(storageItems)에서 사용하는 ID를 그대로 사용합니다.
 */
export interface CraftingIngredient {
  itemId: string;
  amount: number;
}

/**
 * 제작 결과물.
 */
export interface CraftingResult {
  itemId: string;
  amount: number;
}

/**
 * 범용 제작 레시피.
 */
export interface CraftingRecipe {
  id: string;
  ingredients: CraftingIngredient[];
  result: CraftingResult;
}

/**
 * 현재 등록된 제작 레시피.
 *
 * 첫 레시피:
 * 갈색규토리 3개 -> 몬스터볼 10개
 */
export const craftingRecipes: CraftingRecipe[] = [
  {
    id: "poke_ball",
    ingredients: [
      {
        itemId: `APRICORN_${ApricornType.BROWN}`,
        amount: 3,
      },
    ],
    result: {
      itemId: `BALL_${PokeballType.POKEBALL}`,
      amount: 10,
    },
  },
];

/**
 * 레시피 ID로 제작법을 찾습니다.
 */
export function getCraftingRecipe(recipeId: string): CraftingRecipe | undefined {
  return craftingRecipes.find(recipe => recipe.id === recipeId);
}

/**
 * 3칸 제작대에 넣은 재료들로 레시피를 찾습니다.
 *
 * 슬롯 순서는 무시합니다.
 * 예:
 * 갈색 + 갈색 + 빨강
 * 갈색 + 빨강 + 갈색
 * 빨강 + 갈색 + 갈색
 * 모두 같은 조합으로 판정됩니다.
 */
export function findCraftingRecipeByItems(selectedItems: Array<string | null>): CraftingRecipe | undefined {
  const selectedCounts = new Map<string, number>();

  for (const itemId of selectedItems) {
    if (!itemId) {
      continue;
    }

    selectedCounts.set(itemId, (selectedCounts.get(itemId) ?? 0) + 1);
  }

  const selectedTotal = [...selectedCounts.values()].reduce((sum, amount) => sum + amount, 0);

  return craftingRecipes.find(recipe => {
    const recipeTotal = recipe.ingredients.reduce((sum, ingredient) => sum + ingredient.amount, 0);

    if (recipeTotal !== selectedTotal) {
      return false;
    }

    if (recipe.ingredients.length !== selectedCounts.size) {
      return false;
    }

    return recipe.ingredients.every(ingredient => selectedCounts.get(ingredient.itemId) === ingredient.amount);
  });
}

/**
 * 현재 레시피들에서 실제 제작 재료로 사용되는 itemId 목록.
 * 제작 슬롯의 재료 선택창에서 사용합니다.
 */
export function getCraftingIngredientItemIds(): string[] {
  return [...new Set(craftingRecipes.flatMap(recipe => recipe.ingredients.map(ingredient => ingredient.itemId)))];
}
