import type { PokeballCounts } from "#app/battle-scene";
import type { Tutorial } from "#app/tutorial";
import type { MonsterHouseSaveData } from "#data/monster-house/monster-house-manager";
import type { MysteryTimeSaveData } from "#data/mystery-time/mystery-time-manager";
import type { BattleType } from "#enums/battle-type";
import type { GameModes } from "#enums/game-modes";
import type { MarkId } from "#enums/mark-id";
import type { MoveId } from "#enums/move-id";
import type { MysteryEncounterType } from "#enums/mystery-encounter-type";
import type { Nature } from "#enums/nature";
import type { PlayerGender } from "#enums/player-gender";
import type { PokemonType } from "#enums/pokemon-type";
import type { SpeciesId } from "#enums/species-id";
import type { MysteryEncounterSaveData } from "#mystery-encounters/mystery-encounter-save-data";
import type { Variant } from "#sprites/variant";
import type { ArenaData } from "#system/arena-data";
import type { ChallengeData } from "#system/challenge-data";
import type { EggData } from "#system/egg-data";
import type { GameStats } from "#system/game-stats";
import type { ModifierData } from "#system/modifier-data";
import type { PokemonData } from "#system/pokemon-data";
import type { QuestEntry } from "#system/quest-manager";
import type { TrainerData } from "#system/trainer-data";
import type { DexData } from "./dex-data";

export interface StoredItemData {
  itemId: string;
  quantity: number;
}

export interface PracticeDummyData {
  level?: number;

  baseStats?: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };

  types?: PokemonType[];

  abilityId?: string;
  passiveId?: string;

  canAct?: boolean;

  moveIds?: MoveId[];

  heldItemIds?: string[];

  statusEffect?: number;

  statStages?: {
    atk?: number;
    def?: number;
    spa?: number;
    spd?: number;
    spe?: number;
    acc?: number;
    eva?: number;
  };
}

export interface PracticeDummyConfig {
  dummy1?: PracticeDummyData;

  dummy2?: PracticeDummyData;

  battleType?: "SINGLE" | "DOUBLE";

  rewardBase?: {
    exp?: number;
    money?: number;
    roguePoints?: number;
  };

  rewardFlags?: {
    exp?: boolean;
    money?: boolean;
    roguePoints?: boolean;

    allowDummyFaint?: boolean;
  };
}

export interface RunItemData {
  itemId: string;
  quantity: number;
}

export interface KecleonShopItemSaveData {
  typeId: string;
  tier: number;
  cost: number;
  taken: boolean;

  /** Generator 기반 아이템의 세부 타입 복원용 */
  pregenArgs?: any[];
}

export interface KecleonShopSaveData {
  active: boolean;
  generatedWave: number;
  paymentDue: number;
  items: KecleonShopItemSaveData[];

  // 캘리몬 도둑질 추격전
  theftBattleActive?: boolean;
  theftStartWave?: number;
  theftEndWave?: number;
}

export interface PracticePresetData {
  name: string;
  config: PracticeDummyConfig;
  rentalModifiers?: RunItemData[];
  starters?: Starter[];
  timestamp: number;
}

export type BerryPlanterState = "EMPTY" | "PLANTED" | "GROWING" | "READY";

export type BerryPlanterCropCategory = "BERRY" | "APRICORN";

export interface BerryPlanterSlotSaveData {
  state: BerryPlanterState;

  /**
   * BERRY = 나무열매
   * APRICORN = 규토리
   */
  category?: BerryPlanterCropCategory;

  /**
   * 예:
   * berry:SITRUS
   * berry:LUM
   * apricorn:RED
   */
  cropId?: string;

  /** 현재 성장 단계 */
  growthStage: number;

  /**
   * 나중에 실제 시간/웨이브 성장 시스템을 붙일 때 사용.
   * 아직 없어도 되므로 optional.
   */
  /** 완전히 성장할 때까지 남은 웨이브 */
  growthWaves?: number;

  /** 구버전 세이브 호환용 */
  plantedAt?: number;
  lastGrowthWave?: number;
}

export type ResourceInventoryData = Record<string, number>;

export interface SystemSaveData {
  trainerId: number;
  secretId: number;
  gender: PlayerGender;
  dexData: DexData;
  starterData: StarterData;
  gameStats: GameStats;
  unlocks: Unlocks;
  achvUnlocks: AchvUnlocks;
  voucherUnlocks: VoucherUnlocks;
  voucherCounts: VoucherCounts;
  eggs: EggData[];
  gameVersion: string;
  timestamp: number;
  eggPity: number[];
  unlockPity: number[];
  roguePoints?: number;
  lastAttendanceDate?: string;
  attendanceCount?: number;
  bankMoney?: number;
  bankRoguePoints?: number;

  questList?: QuestEntry[];

  achvPointsGranted?: boolean;

  usedCoupons?: string[];

  storageItems?: StoredItemData[];
  practiceDummyConfig?: PracticeDummyConfig;
  practiceRentalModifiers?: RunItemData[];
  pendingRunItems?: string[];

  practicePresets?: PracticePresetData[];

  berryPlanterSlots?: BerryPlanterSlotSaveData[];
  resourceInventory?: ResourceInventoryData;
}

export interface SessionSaveData {
  seed: string;
  playTime: number;
  gameMode: GameModes;
  party: PokemonData[];
  enemyParty: PokemonData[];
  modifiers: ModifierData[];
  enemyModifiers: ModifierData[];
  arena: ArenaData;
  pokeballCounts: PokeballCounts;
  money: number;
  score: number;
  waveIndex: number;
  battleType: BattleType;
  trainer: TrainerData;
  gameVersion: string;
  name: string;
  timestamp: number;
  challenges: ChallengeData[];
  mysteryEncounterType: MysteryEncounterType | -1;
  mysteryEncounterSaveData: MysteryEncounterSaveData;
  playerFaints: number;

  runStorageItems?: RunItemData[];

  kecleonShop?: KecleonShopSaveData;

  monsterHouse?: MonsterHouseSaveData;

  mysteryTime?: MysteryTimeSaveData;
}

export interface Unlocks {
  [key: number]: boolean;
}

export interface AchvUnlocks {
  [key: string]: number;
}

export interface VoucherUnlocks {
  [key: string]: number;
}

export interface VoucherCounts {
  [type: string]: number;
}

export type StarterMoveset = [MoveId] | [MoveId, MoveId] | [MoveId, MoveId, MoveId] | [MoveId, MoveId, MoveId, MoveId];

export interface StarterFormMoveData {
  [key: number]: StarterMoveset;
}

export interface StarterMoveData {
  [key: number]: StarterMoveset | StarterFormMoveData;
}

export interface StarterAttributes {
  nature?: number;
  ability?: number;
  variant?: number;
  form?: number;
  female?: boolean;
  shiny?: boolean;
  favorite?: boolean;
  mark?: MarkId;
  nickname?: string;
  tera?: PokemonType;
}

export interface DexAttrProps {
  shiny: boolean;
  female: boolean;
  variant: Variant;
  formIndex: number;
}

export interface Starter {
  speciesId: SpeciesId;
  shiny: boolean;
  variant: Variant;
  formIndex: number;
  female?: boolean;
  abilityIndex: number;
  passive: boolean;
  nature: Nature;
  moveset?: StarterMoveset;
  pokerus: boolean;
  nickname?: string;
  teraType?: PokemonType;
  ivs: number[];
  mark?: MarkId;

  preRunItems?: string[];

  practiceAbilityId?: AbilityId;
  practicePassiveAbilityId?: AbilityId;
}

export type RunHistoryData = Record<number, RunEntry>;

export interface RunEntry {
  entry: SessionSaveData;
  isVictory: boolean;
  /** Automatically set to false at the moment - implementation TBD */
  isFavorite: boolean;
}

export interface StarterDataEntry {
  moveset: StarterMoveset | StarterFormMoveData | null;
  eggMoves: number;
  candyCount: number;
  friendship: number;
  abilityAttr: number;
  passiveAttr: number;
  valueReduction: number;
  classicWinCount: number;
  teraTypeAttr?: number;
  marks?: MarkId[];
}

export interface StarterData {
  [key: number]: StarterDataEntry;
}

// TODO: Rework into a bitmask
export type TutorialFlags = {
  [key in Tutorial]: boolean;
};

// TODO: Rework into a bitmask
export interface SeenDialogues {
  [key: string]: boolean;
}
