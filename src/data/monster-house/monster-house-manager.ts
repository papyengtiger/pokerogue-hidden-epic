import { globalScene } from "#app/global-scene";
import { isGMaxMove, isMaxMove } from "#balance/trs";
import { isExclusiveZCrystal, zmovesSpecies } from "#balance/zmoves";
import { getMarkTier } from "#data/mark";
import { pokemonFormChanges, type SpeciesFormChange } from "#data/pokemon-forms";
import { BiomeId } from "#enums/biome-id";
import { GameModes } from "#enums/game-modes";
import { MarkId } from "#enums/mark-id";
import { MarkTier } from "#enums/mark-tier";
import { ModifierPoolType } from "#enums/modifier-pool-type";
import type { PokemonHeldItemModifier } from "#modifiers/modifier";
import {
  getEnemyModifierTypesForWave,
  type PokemonHeldItemModifierType,
  regenerateModifierPoolThresholds,
} from "#modifiers/modifier-type";

export enum MonsterHouseRank {
  RANK_1 = 1,
  RANK_2,
  RANK_3,
  RANK_4,
  RANK_5,
}

export interface MonsterHouseSpawnContext {
  waveIndex: number;
  forceSpawn?: boolean;
}

export interface MonsterHouseSaveData {
  active: boolean;
  waveIndex: number | null;

  rank: MonsterHouseRank;

  totalEnemies: number;
  defeatedEnemies: number;
  capturedEnemies: number;

  bossIndex: number | null;
  bossReleased: boolean;

  bossPokemonId: number | null;

  heldItemsGranted: boolean;

  /** 도망으로 소굴을 포기했는지 */
  escaped?: boolean;

  /** 소탕 보상을 이미 지급했는지 */
  clearRewardGranted?: boolean;

  showcaseLeftIndex?: number | null;
  showcaseCenterIndex?: number | null;
  showcaseRightIndex?: number | null;
}

export class MonsterHouseManager {
  private active = false;
  private waveIndex: number | null = null;

  private baseSpawnChance = 10;
  private readonly maxSpawnChance = 25;
  private readonly spawnChanceIncrease = 1;

  private currentSpawnChance = this.baseSpawnChance;

  // 소굴 구성
  private totalEnemies = 0;
  private defeatedEnemies = 0;
  private capturedEnemies = 0;

  private showcaseLeftIndex: number | null = null;
  private showcaseCenterIndex: number | null = null;
  private showcaseRightIndex: number | null = null;

  // 우두머리
  private bossIndex: number | null = null;
  private bossReleased = false;

  private spreadAttackResolving = false;

  // 몬스터소굴 생성 당시의 전체 멤버.
  // enemyParty의 순서가 SwitchSummonPhase에서 바뀌어도
  // 소굴 구성 자체는 이 배열을 기준으로 추적한다.
  private members: any[] = [];
  private bossPokemonId: number | null = null;

  private rank: MonsterHouseRank = MonsterHouseRank.RANK_1;

  private heldItemsGranted = false;

  private escaped = false;
  private clearRewardGranted = false;

  public reset(): void {
    this.active = false;
    this.waveIndex = null;

    this.totalEnemies = 0;
    this.defeatedEnemies = 0;
    this.capturedEnemies = 0;

    this.showcaseLeftIndex = null;
    this.showcaseCenterIndex = null;
    this.showcaseRightIndex = null;

    this.bossIndex = null;
    this.bossReleased = false;

    this.spreadAttackResolving = false;

    this.members = [];
    this.bossPokemonId = null;

    this.rank = MonsterHouseRank.RANK_1;

    this.heldItemsGranted = false;

    this.heldItemsGranted = false;
    this.escaped = false;
    this.clearRewardGranted = false;
  }

  public getSaveData(): MonsterHouseSaveData {
    return {
      active: this.active,
      waveIndex: this.waveIndex,

      totalEnemies: this.totalEnemies,
      defeatedEnemies: this.defeatedEnemies,
      capturedEnemies: this.capturedEnemies,

      bossIndex: this.bossIndex,
      bossReleased: this.bossReleased,

      bossPokemonId: this.bossPokemonId,

      rank: this.rank,

      heldItemsGranted: this.heldItemsGranted,

      escaped: this.escaped,

      clearRewardGranted: this.clearRewardGranted,

      showcaseLeftIndex: this.showcaseLeftIndex,

      showcaseCenterIndex: this.showcaseCenterIndex,

      showcaseRightIndex: this.showcaseRightIndex,
    };
  }

  public getBossPokemonId(): number | null {
    return this.bossPokemonId;
  }

  public restore(data: MonsterHouseSaveData, members: any[]): void {
    this.active = data.active;
    this.waveIndex = data.waveIndex;

    this.totalEnemies = data.totalEnemies;
    this.defeatedEnemies = data.defeatedEnemies;
    this.capturedEnemies = data.capturedEnemies;

    this.bossIndex = data.bossIndex;
    this.bossReleased = data.bossReleased;

    this.spreadAttackResolving = false;

    this.members = [...members];
    this.bossPokemonId = data.bossPokemonId;

    this.rank = data.rank ?? MonsterHouseRank.RANK_1;

    this.heldItemsGranted =
      data.heldItemsGranted ?? members.some(pokemon => (pokemon?.getHeldItems?.().length ?? 0) > 0);

    this.escaped = data.escaped ?? false;

    this.clearRewardGranted = data.clearRewardGranted ?? false;

    this.showcaseLeftIndex = data.showcaseLeftIndex ?? null;

    this.showcaseCenterIndex = data.showcaseCenterIndex ?? null;

    this.showcaseRightIndex = data.showcaseRightIndex ?? null;

    console.log("[MONSTER_HOUSE_RESTORE]", {
      waveIndex: this.waveIndex,
      totalEnemies: this.totalEnemies,
      defeatedEnemies: this.defeatedEnemies,
      capturedEnemies: this.capturedEnemies,
      bossReleased: this.bossReleased,
      bossPokemonId: this.bossPokemonId,
      members: this.members.length,
      showcase: {
        left: this.showcaseLeftIndex,
        center: this.showcaseCenterIndex,
        right: this.showcaseRightIndex,
      },
    });
  }

  public getMaxAttackersPerTurn(): number {
    switch (this.rank) {
      case MonsterHouseRank.RANK_1:
        return 2;

      case MonsterHouseRank.RANK_2:
      case MonsterHouseRank.RANK_3:
        return 3;

      case MonsterHouseRank.RANK_4:
        return 4;

      case MonsterHouseRank.RANK_5:
        return 5;

      default:
        return 1;
    }
  }

  private getMinimumSpawnWave(): number {
    switch (globalScene.gameMode.modeId) {
      case GameModes.DAILY:
        return 31;

      case GameModes.WEEKLY:
        return 91;

      case GameModes.MONTHLY:
        return 101;

      default:
        return 101;
    }
  }

  public getRank(): MonsterHouseRank {
    return this.rank;
  }

  public beginSpreadAttack(): void {
    if (!this.active) {
      return;
    }

    this.spreadAttackResolving = true;

    console.log("[MONSTER_HOUSE_SPREAD_BEGIN]", {
      waveIndex: this.waveIndex,
      remaining: this.getRemainingEnemies(),
    });
  }

  public endSpreadAttack(): void {
    if (!this.spreadAttackResolving) {
      return;
    }

    this.spreadAttackResolving = false;

    console.log("[MONSTER_HOUSE_SPREAD_END]", {
      waveIndex: this.waveIndex,
      remaining: this.getRemainingEnemies(),
    });
  }

  public isSpreadAttackResolving(): boolean {
    return this.active && this.spreadAttackResolving;
  }

  public setBaseSpawnChance(chance: number): void {
    this.baseSpawnChance = Math.max(0, Math.min(100, chance));

    this.currentSpawnChance = Math.max(this.baseSpawnChance, Math.min(this.maxSpawnChance, this.currentSpawnChance));
  }

  private async trySetBossEnhancedForm(boss: any): Promise<void> {
    if (boss?.species?.forms?.length === 0) {
      return;
    }

    const currentForm = boss.getSpeciesForm?.();

    if (!currentForm) {
      return;
    }

    const currentTotal = currentForm.getBaseStatTotal();

    const formChanges: SpeciesFormChange[] = pokemonFormChanges[boss.species.speciesId] ?? [];

    const candidates = formChanges.filter(formChange => {
      const targetForm = boss.species.forms.find((form: any) => form.formKey === formChange.formKey);

      if (!targetForm) {
        return false;
      }

      // 현재 폼과 동일한 폼 제외
      if (targetForm.formKey === currentForm.formKey) {
        return false;
      }

      // ★ 실제 종족값 총합이 더 높은 폼만
      return targetForm.getBaseStatTotal() > currentTotal;
    });

    if (candidates.length === 0) {
      console.log("[MONSTER_HOUSE_BOSS_FORM_NONE]", {
        pokemon: boss.name,
        formKey: currentForm.formKey,
        baseTotal: currentTotal,
      });

      return;
    }

    const selected = candidates[globalScene.currentBattle.randSeedInt(candidates.length)];

    console.log("[MONSTER_HOUSE_BOSS_FORM_SELECTED]", {
      pokemon: boss.name,
      from: currentForm.formKey,
      to: selected.formKey,
      candidates: candidates.map(change => change.formKey),
    });

    await boss.changeForm(selected);

    console.log("[MONSTER_HOUSE_BOSS_FORM_CHANGED]", {
      pokemon: boss.name,
      formIndex: boss.formIndex,
      formKey: boss.getSpeciesForm?.()?.formKey,
      baseTotal: boss.getSpeciesForm?.()?.getBaseStatTotal?.(),
    });
  }

  /**
   * 소굴 개체 한 마리에게 소지품을 실제로 등록한다.
   */
  private giveHeldItem(pokemon: any, modifierType: PokemonHeldItemModifierType, stackCount = 1): void {
    if (!pokemon || !modifierType) {
      return;
    }

    const modifier = modifierType.newModifier(pokemon) as PokemonHeldItemModifier;

    if (!modifier) {
      return;
    }

    modifier.pokemonId = pokemon.id;
    modifier.stackCount = Math.min(stackCount, modifier.getMaxStackCount());

    globalScene.addEnemyModifier(modifier, true, true);
  }

  /**
   * 일반 소굴 개체의 소지품 개수를 결정한다.
   *
   * 0개: 75%
   * 1개: 20%
   * 2개: 5%
   */
  private rollNormalHeldItemCount(): number {
    const roll = globalScene.currentBattle.randSeedInt(100);

    if (roll < 75) {
      return 0;
    }

    if (roll < 95) {
      return 1;
    }

    return 2;
  }

  /**
   * 우두머리는 소굴 등급에 따라 더 많은 소지품을 가진다.
   */
  private rollBossHeldItemCount(): number {
    switch (this.rank) {
      case MonsterHouseRank.RANK_1:
        return 1;

      case MonsterHouseRank.RANK_2:
        return 1 + globalScene.currentBattle.randSeedInt(2);

      case MonsterHouseRank.RANK_3:
        return 2;

      case MonsterHouseRank.RANK_4:
        return 2 + globalScene.currentBattle.randSeedInt(2);

      case MonsterHouseRank.RANK_5:
        return 3;

      default:
        return 1;
    }
  }

  /**
   * 우두머리 도구의 등급 상승 확률.
   *
   * 0: 승급 없음
   * 8: 1/8
   * 4: 1/4
   * 2: 1/2
   * 1: 확정
   */
  private getBossItemUpgradeChance(): number {
    switch (this.rank) {
      case MonsterHouseRank.RANK_1:
        return 0;

      case MonsterHouseRank.RANK_2:
        return 8;

      case MonsterHouseRank.RANK_3:
        return 4;

      case MonsterHouseRank.RANK_4:
        return 2;

      case MonsterHouseRank.RANK_5:
        return 1;

      default:
        return 0;
    }
  }

  /**
   * 특정 소굴 개체에게 야생 도구 풀 기반 아이템을 지급한다.
   */
  private giveRandomHeldItems(pokemon: any, itemCount: number, upgradeChance = 0): void {
    if (!pokemon || itemCount <= 0) {
      return;
    }

    const wave = this.waveIndex ?? globalScene.currentBattle.waveIndex;

    const itemTypes = getEnemyModifierTypesForWave(wave, itemCount, [pokemon], ModifierPoolType.WILD, upgradeChance);

    for (const type of itemTypes) {
      if (!type) {
        continue;
      }

      this.giveHeldItem(pokemon, type);
    }
  }

  /**
   * 소굴 전체 개체에게 소지품을 배분한다.
   */
  private giveMonsterHouseHeldItems(): void {
    if (this.heldItemsGranted || this.members.length === 0) {
      return;
    }

    this.heldItemsGranted = true;

    // 조건부 아이템이 소굴 전체 멤버를 검사할 수 있게
    // 멤버가 모두 생성된 뒤 threshold를 준비한다.
    regenerateModifierPoolThresholds(this.members, ModifierPoolType.WILD);

    for (const pokemon of this.members) {
      if (!pokemon) {
        continue;
      }

      const isBoss = this.isBossPokemon(pokemon);

      const itemCount = isBoss ? this.rollBossHeldItemCount() : this.rollNormalHeldItemCount();

      const upgradeChance = isBoss ? this.getBossItemUpgradeChance() : 0;

      this.giveRandomHeldItems(pokemon, itemCount, upgradeChance);
    }

    // 모든 적 modifier를 등록한 다음 한 번만 갱신한다.
    void globalScene.updateModifiers(false, true);

    console.log("[MONSTER_HOUSE_HELD_ITEMS_GRANTED]", {
      rank: this.rank,
      members: this.members.map(pokemon => ({
        id: pokemon.id,
        name: pokemon.name,
        boss: this.isBossPokemon(pokemon),
        heldItems:
          pokemon.getHeldItems?.().map((modifier: PokemonHeldItemModifier) => ({
            id: modifier.type.id,
            name: modifier.type.getSafeName(),
            stackCount: modifier.stackCount,
          })) ?? [],
      })),
    });
  }

  private syncBattleState(): void {
    const battle = globalScene.currentBattle as any;

    if (!battle) {
      return;
    }

    battle.monsterHouse = this.active ? this.getSaveData() : undefined;
  }

  /**
   * 몬스터소굴에서 광역기의 가상 공격 대상을 선정한다.
   *
   * - 적 전체 공격: 생존한 소굴 적의 50%
   * - 아군까지 휘말리는 전체 공격: 생존한 소굴 적의 75%
   * - 현재 실제 필드에 나온 적은 반드시 포함
   * - 우두머리는 해금 전까지 제외
   * - 일반 단일기는 null을 반환하여 기존 타깃 시스템을 그대로 사용
   */
  private getMonsterHouseSpreadTargets(user: Pokemon): Pokemon[] | null {
    // 몬스터소굴이 아니거나 적이 사용하는 기술이면 기존 처리
    if (!monsterHouseManager.isActive() || !user.isPlayer()) {
      return null;
    }

    let ratio: number | null = null;

    const moveId = this.move.id;

    // Z기술 여부
    const isZMove = Object.prototype.hasOwnProperty.call(zmovesSpecies, moveId);

    const isExclusiveZMove = isZMove && isExclusiveZCrystal(moveId);

    // 다이맥스 / 거다이맥스 기술 여부
    const isAnyMaxMove = isMaxMove(moveId);

    const isExclusiveGMaxMove = isAnyMaxMove && isGMaxMove(moveId);

    /*
     * 소굴 전용 특수 광역 판정
     *
     * 전용 Z / 전용 G-Max : 75%
     * 일반 Z / 일반 Max   : 50%
     */
    if (isExclusiveZMove || isExclusiveGMaxMove) {
      ratio = 0.75;
    } else if (isZMove || isAnyMaxMove) {
      ratio = 0.5;
    } else {
      // 일반 기술은 기존 moveTarget 판정 사용
      switch (this.move.moveTarget) {
        case MoveTarget.ALL_ENEMIES:
        case MoveTarget.ALL_NEAR_ENEMIES:
          ratio = 0.5;
          break;

        case MoveTarget.ALL_OTHERS:
        case MoveTarget.ALL_NEAR_OTHERS:
          ratio = 0.75;
          break;

        default:
          return null;
      }
    }

    const enemyParty = globalScene.getEnemyParty?.() ?? globalScene.currentBattle.enemyParty ?? [];

    const bossIndex = monsterHouseManager.getBossIndex();
    const bossReleased = monsterHouseManager.isBossReleased();

    // 현재 공격 대상으로 삼을 수 있는 생존 소굴 개체
    const eligible = enemyParty.filter((pokemon, index) => {
      if (!pokemon || pokemon.isFainted()) {
        return false;
      }

      // 우두머리는 해금되기 전까지 공격 대상에서 제외
      if (!bossReleased && index === bossIndex) {
        return false;
      }

      return true;
    });

    if (eligible.length === 0) {
      return [];
    }

    /*
     * 실제 필드에 나와 있는 적.
     * 몬스터소굴은 싱글이므로 원칙적으로 1마리.
     */
    const activeEnemy = eligible.find(pokemon => pokemon.isActive(true));

    // 비율에 따라 공격할 수 결정
    const targetCount = Math.max(1, Math.ceil(eligible.length * ratio));

    /*
     * 현재 필드의 적은 무조건 포함하고,
     * 나머지 후보만 seeded RNG로 섞는다.
     */
    const reserves = eligible.filter(pokemon => pokemon !== activeEnemy);

    // Fisher-Yates shuffle + 전투 seed RNG
    for (let i = reserves.length - 1; i > 0; i--) {
      const j = user.randBattleSeedInt(i + 1);

      [reserves[i], reserves[j]] = [reserves[j], reserves[i]];
    }

    const selected: Pokemon[] = [];

    if (activeEnemy) {
      selected.push(activeEnemy);
    }

    const remainingSlots = targetCount - selected.length;

    if (remainingSlots > 0) {
      selected.push(...reserves.slice(0, remainingSlots));
    }

    console.log("[MONSTER_HOUSE_SPREAD_TARGETS]", {
      move: this.move.id,
      moveTarget: this.move.moveTarget,
      ratio,
      eligible: eligible.length,
      targetCount,
      selected: selected.map(pokemon => ({
        id: pokemon.id,
        name: pokemon.name,
        active: pokemon.isActive(true),
      })),
    });

    return selected;
  }

  public setShowcaseIndices(left: number, center: number, right: number): void {
    this.showcaseLeftIndex = left;
    this.showcaseCenterIndex = center;
    this.showcaseRightIndex = right;
  }

  public getShowcaseIndices(): {
    left: number | null;
    center: number | null;
    right: number | null;
  } {
    return {
      left: this.showcaseLeftIndex,
      center: this.showcaseCenterIndex,
      right: this.showcaseRightIndex,
    };
  }

  public getBaseSpawnChance(): number {
    return this.baseSpawnChance;
  }

  private getPartyMarkEncounterBonus(): number {
    const party = globalScene.getPlayerParty?.() ?? [];

    let bonus = 0;

    for (const pokemon of party) {
      if (!pokemon || pokemon.mark === MarkId.NONE) {
        continue;
      }

      switch (getMarkTier(pokemon.mark)) {
        case MarkTier.COMMON:
          bonus += 1;
          break;

        case MarkTier.RARE:
          bonus += 2;
          break;

        case MarkTier.ROGUE:
          bonus += 3;
          break;

        case MarkTier.EPIC:
          bonus += 4;
          break;

        case MarkTier.LEGENDARY:
          bonus += 5;
          break;

        // 미스터리/특수 증표는 일반 희귀도와 별개
        case MarkTier.MYSTERY:
        case MarkTier.SPECIAL:
        default:
          break;
      }
    }

    // 파티 전체 증표 보너스 상한
    return Math.min(15, bonus);
  }

  public checkSpawn(context: MonsterHouseSpawnContext): boolean {
    /*
     * 이미 같은 wave의 소굴이 복원되어 있다면
     * 새 등장 판정을 다시 하지 않는다.
     */
    if (globalScene.arena?.biomeType === BiomeId.END) {
      if (this.active) {
        this.reset();
      }

      console.log("[MONSTER_HOUSE_BLOCKED_END_BIOME]", {
        wave: context.waveIndex,
      });

      return false;
    }

    if (this.active && this.waveIndex === context.waveIndex) {
      console.log("[MONSTER_HOUSE_KEEP_EXISTING]", {
        waveIndex: context.waveIndex,
        remaining: this.getRemainingEnemies(),
      });

      return true;
    }

    const minimumSpawnWave = this.getMinimumSpawnWave();

    if (context.forceSpawn !== true && context.waveIndex < minimumSpawnWave) {
      console.log("[MONSTER_HOUSE_BLOCKED_EARLY_WAVE]", {
        mode: GameModes[globalScene.gameMode.modeId],
        waveIndex: context.waveIndex,
        minimumSpawnWave,
      });

      return false;
    }

    this.reset();

    const markBonus = this.getPartyMarkEncounterBonus();

    const chanceUsed = Math.min(100, this.currentSpawnChance + markBonus);

    const roll = globalScene.currentBattle.randSeedInt(100);

    const shouldSpawn = context.forceSpawn === true || roll < chanceUsed;

    if (!shouldSpawn) {
      this.currentSpawnChance = Math.min(this.maxSpawnChance, this.currentSpawnChance + this.spawnChanceIncrease);

      console.log("[MONSTER_HOUSE_SPAWN_FAILED]", {
        waveIndex: context.waveIndex,
        roll,
        baseChance: this.currentSpawnChance,
        markBonus,
        chanceUsed,
        nextChance: this.currentSpawnChance,
      });

      return false;
    }

    // 등장에 성공했으므로 다음 판정은 다시 기본 10%
    this.currentSpawnChance = this.baseSpawnChance;

    this.active = true;
    this.waveIndex = context.waveIndex;

    this.syncBattleState();

    console.log("[MONSTER_HOUSE_SPAWN]", {
      waveIndex: context.waveIndex,
      roll,
      baseChance: this.baseSpawnChance,
      markBonus,
      chanceUsed,
      forced: context.forceSpawn === true,
    });

    return true;
  }

  public start(totalEnemies: number, rank?: MonsterHouseRank): void {
    this.rank = rank ?? this.rollRank();

    this.totalEnemies = Math.max(7, Math.min(36, Math.floor(totalEnemies)));

    this.defeatedEnemies = 0;
    this.capturedEnemies = 0;

    this.bossIndex = this.totalEnemies - 1;
    this.bossReleased = false;

    this.bossIndex = this.totalEnemies - 1;

    this.bossReleased = false;

    this.heldItemsGranted = false;
    this.escaped = false;
    this.clearRewardGranted = false;

    this.syncBattleState();

    this.heldItemsGranted = false;

    console.log("[MONSTER_HOUSE_START]", {
      waveIndex: this.waveIndex,
      rank: this.rank,
      totalEnemies: this.totalEnemies,
      normalEnemies: this.totalEnemies - 1,
      bossIndex: this.bossIndex,
    });
  }

  private rollRank(): MonsterHouseRank {
    const wave = this.waveIndex ?? 1;
    const roll = globalScene.currentBattle.randSeedInt(100);

    if (wave < 50) {
      if (roll < 70) {
        return MonsterHouseRank.RANK_1;
      }
      if (roll < 95) {
        return MonsterHouseRank.RANK_2;
      }
      return MonsterHouseRank.RANK_3;
    }

    if (wave < 100) {
      if (roll < 50) {
        return MonsterHouseRank.RANK_1;
      }
      if (roll < 80) {
        return MonsterHouseRank.RANK_2;
      }
      if (roll < 95) {
        return MonsterHouseRank.RANK_3;
      }
      return MonsterHouseRank.RANK_4;
    }

    if (wave < 150) {
      if (roll < 35) {
        return MonsterHouseRank.RANK_1;
      }
      if (roll < 65) {
        return MonsterHouseRank.RANK_2;
      }
      if (roll < 85) {
        return MonsterHouseRank.RANK_3;
      }
      if (roll < 97) {
        return MonsterHouseRank.RANK_4;
      }
      return MonsterHouseRank.RANK_5;
    }

    if (wave < 200) {
      if (roll < 20) {
        return MonsterHouseRank.RANK_1;
      }
      if (roll < 45) {
        return MonsterHouseRank.RANK_2;
      }
      if (roll < 70) {
        return MonsterHouseRank.RANK_3;
      }
      if (roll < 90) {
        return MonsterHouseRank.RANK_4;
      }
      return MonsterHouseRank.RANK_5;
    }

    if (wave < 250) {
      if (roll < 10) {
        return MonsterHouseRank.RANK_1;
      }
      if (roll < 30) {
        return MonsterHouseRank.RANK_2;
      }
      if (roll < 55) {
        return MonsterHouseRank.RANK_3;
      }
      if (roll < 80) {
        return MonsterHouseRank.RANK_4;
      }
      return MonsterHouseRank.RANK_5;
    }

    // 250층 이후
    if (roll < 5) {
      return MonsterHouseRank.RANK_1;
    }
    if (roll < 15) {
      return MonsterHouseRank.RANK_2;
    }
    if (roll < 35) {
      return MonsterHouseRank.RANK_3;
    }
    if (roll < 65) {
      return MonsterHouseRank.RANK_4;
    }
    return MonsterHouseRank.RANK_5;
  }

  public getEscapeChance(): number {
    switch (this.rank) {
      case MonsterHouseRank.RANK_1:
        return 80;

      case MonsterHouseRank.RANK_2:
        return 65;

      case MonsterHouseRank.RANK_3:
        return 50;

      case MonsterHouseRank.RANK_4:
        return 35;

      case MonsterHouseRank.RANK_5:
        return 20;

      default:
        return 50;
    }
  }

  public hasEscaped(): boolean {
    return this.escaped;
  }

  public hasClearRewardGranted(): boolean {
    return this.clearRewardGranted;
  }

  public canGrantClearReward(): boolean {
    return this.isCleared() && !this.escaped && !this.clearRewardGranted;
  }

  /**
   * 소탕 보상 지급권을 한 번만 확정한다.
   *
   * true가 반환된 호출만 보상 Phase를 등록해야 한다.
   */
  public claimClearReward(): boolean {
    if (!this.canGrantClearReward()) {
      return false;
    }

    this.clearRewardGranted = true;
    this.syncBattleState();

    console.log("[MONSTER_HOUSE_CLEAR_REWARD_CLAIMED]", {
      waveIndex: this.waveIndex,
      rank: this.rank,
      defeatedEnemies: this.defeatedEnemies,
      capturedEnemies: this.capturedEnemies,
    });

    return true;
  }

  public finishEscape(): void {
    if (!this.active) {
      return;
    }

    console.log("[MONSTER_HOUSE_ESCAPED]", {
      waveIndex: this.waveIndex,
      rank: this.rank,
      defeatedEnemies: this.defeatedEnemies,
      capturedEnemies: this.capturedEnemies,
      remainingEnemies: this.getRemainingEnemies(),
    });

    this.escaped = true;
    this.active = false;
    this.spreadAttackResolving = false;
    this.bossReleased = false;

    this.syncBattleState();
  }

  public setMembers(members: any[]): void {
    this.members = [...members];

    const bossIndex = this.bossIndex;

    if (bossIndex !== null && this.members[bossIndex]) {
      const boss = this.members[bossIndex];

      this.bossPokemonId = boss.id;

      void this.trySetBossEnhancedForm(boss);
    } else {
      this.bossPokemonId = null;
    }

    // 모든 멤버와 우두머리 ID가 확정된 다음 지급
    this.giveMonsterHouseHeldItems();

    this.syncBattleState();

    console.log("[MONSTER_HOUSE_MEMBERS_SET]", {
      total: this.members.length,
      bossIndex: this.bossIndex,
      bossPokemonId: this.bossPokemonId,
      members: this.members.map(pokemon => ({
        id: pokemon.id,
        name: pokemon.name,
      })),
    });
  }

  public getMembers(): any[] {
    return this.members;
  }

  public getAliveMembers(): any[] {
    return this.members.filter(pokemon => pokemon && !pokemon.isFainted());
  }

  public isBossPokemon(pokemon: any): boolean {
    return this.bossPokemonId !== null && pokemon?.id === this.bossPokemonId;
  }

  public registerEnemyDefeated(): void {
    if (!this.active) {
      return;
    }

    this.defeatedEnemies++;

    this.syncBattleState();

    console.log("[MONSTER_HOUSE_ENEMY_DEFEATED]", {
      defeated: this.defeatedEnemies,
      captured: this.capturedEnemies,
      remaining: this.getRemainingEnemies(),
    });
  }

  public registerEnemyCaptured(): void {
    if (!this.active) {
      return;
    }

    this.capturedEnemies++;

    this.syncBattleState();

    console.log("[MONSTER_HOUSE_ENEMY_CAPTURED]", {
      defeated: this.defeatedEnemies,
      captured: this.capturedEnemies,
      remaining: this.getRemainingEnemies(),
    });
  }

  public canReleaseBoss(): boolean {
    if (!this.active || this.bossReleased || this.bossIndex === null) {
      return false;
    }

    // 우두머리 자신만 남았으면 등장 가능
    return this.getRemainingEnemies() === 1;
  }

  public releaseBoss(): void {
    if (!this.canReleaseBoss()) {
      return;
    }

    this.bossReleased = true;

    const boss = this.members.find(pokemon => this.isBossPokemon(pokemon));

    if (boss) {
      boss.tempSummonData.monsterHouseFirstTurn = true;

      console.log("[MONSTER_HOUSE_BOSS_FIRST_TURN]", {
        pokemonId: boss.id,
        pokemon: boss.name,
      });
    }

    this.syncBattleState();

    console.log("[MONSTER_HOUSE_BOSS_RELEASED]", {
      waveIndex: this.waveIndex,
      bossIndex: this.bossIndex,
    });
  }

  public isCleared(): boolean {
    return this.active && !this.escaped && this.totalEnemies > 0 && this.getRemainingEnemies() === 0;
  }

  public getTotalEnemies(): number {
    return this.totalEnemies;
  }

  public getBossIndex(): number | null {
    return this.bossIndex;
  }

  public isBossReleased(): boolean {
    return this.bossReleased;
  }

  public getCapturedEnemies(): number {
    return this.capturedEnemies;
  }

  public isActive(): boolean {
    return this.active;
  }

  public getWaveIndex(): number | null {
    return this.waveIndex;
  }

  public getRemainingEnemies(): number {
    return Math.max(0, this.totalEnemies - this.defeatedEnemies - this.capturedEnemies);
  }

  public getDefeatedEnemies(): number {
    return this.defeatedEnemies;
  }
}

export const monsterHouseManager = new MonsterHouseManager();
