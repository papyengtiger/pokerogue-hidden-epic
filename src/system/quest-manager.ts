import { globalScene } from "#app/global-scene";
import { biomeLinks } from "#data/balance/biomes";
import { speciesEggTiers } from "#data/balance/species-egg-tiers";
import { BiomeId } from "#enums/biome-id";
import { EggTier } from "#enums/egg-type";
import { GameModes } from "#enums/game-modes";
import type { SpeciesId } from "#enums/species-id";
import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#enums/trainer-variant";
import { PokemonHeldItemModifier } from "#modifiers/modifier";
import { PokemonHeldItemModifierType } from "#modifiers/modifier-type";
import { trainerConfigs } from "#trainers/trainer-config";
import { getBiomeName, randSeedInt, randSeedItem } from "#utils/common";
import { getRandomLocaleEntry } from "#utils/i18n";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import { toCamelCase } from "#utils/strings";
import i18next from "i18next";

export const RESCUABLE_TRAINER_TYPES: readonly TrainerType[] = [
  TrainerType.ACE_TRAINER,
  TrainerType.AROMA_LADY,
  TrainerType.ARTIST,
  TrainerType.BACKPACKER,
  TrainerType.BAKER,
  TrainerType.BEAUTY,
  TrainerType.BIKER,
  TrainerType.BIRD_KEEPER,
  TrainerType.BLACK_BELT,
  TrainerType.BREEDER,
  TrainerType.BUG_CATCHER,
  TrainerType.CAMPER,
  TrainerType.CLERK,
  TrainerType.COLLECTOR,
  TrainerType.CYCLIST,
  TrainerType.DANCER,
  TrainerType.DEPOT_AGENT,
  TrainerType.DOCTOR,
  TrainerType.DRAGON_TAMER,
  TrainerType.FAIRY_TALE_GIRL,
  TrainerType.FIREBREATHER,
  TrainerType.FISHERMAN,
  TrainerType.GUITARIST,
  TrainerType.HARLEQUIN,
  TrainerType.HEX_MANIAC,
  TrainerType.HIKER,
  TrainerType.HOOPSTER,
  TrainerType.INFIELDER,
  TrainerType.JANITOR,
  TrainerType.LINEBACKER,
  TrainerType.MAID,
  TrainerType.MUSICIAN,
  TrainerType.NURSERY_AIDE,
  TrainerType.OFFICER,
  TrainerType.PARASOL_LADY,
  TrainerType.PILOT,
  TrainerType.POKEFAN,
  TrainerType.PRESCHOOLER,
  TrainerType.PSYCHIC,
  TrainerType.RANGER,
  TrainerType.RICH,
  TrainerType.RICH_KID,
  TrainerType.ROUGHNECK,
  TrainerType.RUIN_MANIAC,
  TrainerType.SAILOR,
  TrainerType.SCIENTIST,
  TrainerType.SCUBA_DIVER,
  TrainerType.SMASHER,
  TrainerType.SNOW_ACE_TRAINER,
  TrainerType.SNOW_WORKER,
  TrainerType.STRIKER,
  TrainerType.SCHOOL_KID,
  TrainerType.SWIMMER,
  TrainerType.VETERAN,
  TrainerType.WAITER,
  TrainerType.WORKER,
  TrainerType.YOUNGSTER,
];

export type QuestCategory = "REQUEST" | "BOUNTY" | "MISSION";

export type QuestObjectiveType = "CATCH_POKEMON" | "FIND_ITEM" | "FIND_TRAINER" | "REACH_BIOME";

export interface QuestEntry {
  id: string;
  category: QuestCategory;
  objectiveType: QuestObjectiveType;

  title: string;
  description: string;

  progress: number;
  requirement: number;

  accepted: boolean;
  completed: boolean;

  targetSpeciesId?: SpeciesId;

  targetCatchBiome?: BiomeId;
  targetCatchWave?: number;

  targetItemId?: string;
  targetItemName?: string;

  targetItemBiome?: BiomeId;
  targetItemWave?: number;

  findItemMethod?: "WILD_HELD" | "REWARD";

  targetTrainerType?: TrainerType;
  targetTrainerVariant?: TrainerVariant;
  targetTrainerNameKey?: string;
  targetTrainerName?: string;
  targetTrainerWave?: number;
  targetBiome?: BiomeId;

  generatedBiomeIndex?: number;

  rewardRp: number;
  rewardGold: number;
  rewardItems?: {
    modifierTypeId: string;
    quantity: number;
  }[];
}

export class QuestManager {
  private readonly maxAcceptedQuests = 5;

  public getQuests(): QuestEntry[] {
    return globalScene.gameData.questList ?? [];
  }

  public getAcceptedQuestCount(): number {
    return this.getQuests().filter(quest => quest.accepted).length;
  }

  public getMaxAcceptedQuests(): number {
    return this.maxAcceptedQuests;
  }

  public setQuests(quests: QuestEntry[]): void {
    globalScene.gameData.questList = quests;
    globalScene.gameData.saveSystem();
  }

  public getCompletedQuests(): QuestEntry[] {
    return this.getQuests().filter(quest => quest.accepted && quest.completed);
  }

  public isAcceptedQuestClear(): boolean {
    const acceptedQuests = this.getQuests().filter(quest => quest.accepted);

    return acceptedQuests.length > 0 && acceptedQuests.every(quest => quest.completed);
  }

  public areAllQuestsCompleted(): boolean {
    return this.getQuests().length > 0 && this.getQuests().every(quest => quest.completed);
  }

  public getQuestBiomeIndex(waveIndex: number): number {
    const biomeLength = globalScene.gameMode.hasShortBiomes ? 5 : 10;

    return Math.floor((waveIndex - 1) / biomeLength);
  }

  public canGenerateQuestAtWave(waveIndex: number): boolean {
    const modeId = globalScene.gameMode.modeId;

    switch (modeId) {
      case GameModes.CLASSIC:
      case GameModes.CHALLENGE:
        // 180층부터 챔피언리그,
        // 190층부터 END 바이옴이므로
        // 의뢰는 179층까지만 생성
        return waveIndex <= 179;

      case GameModes.ENDLESS:
      case GameModes.SPLICED_ENDLESS:
        // 무한모드는 10층 단위에서 생성 금지.
        // 50, 100, 150...도 당연히 여기 포함됨.
        if (waveIndex % 10 === 0) {
          return false;
        }

        return true;

      default:
        return true;
    }
  }

  public getCompletedAcceptedQuestRewards(): {
    roguePoints: number;
    gold: number;
  } {
    const completedQuests = this.getQuests().filter(quest => quest.accepted && quest.completed);

    return completedQuests.reduce(
      (total, quest) => {
        total.roguePoints += quest.rewardRp;
        total.gold += quest.rewardGold;
        return total;
      },
      {
        roguePoints: 0,
        gold: 0,
      },
    );
  }

  public getActiveTrainerRescueQuest(waveIndex: number): QuestEntry | undefined {
    return this.getQuests().find(
      quest =>
        quest.accepted
        && !quest.completed
        && quest.objectiveType === "FIND_TRAINER"
        && quest.targetTrainerType !== undefined
        && quest.targetTrainerWave === waveIndex,
    );
  }

  public isTrainerRescueWave(waveIndex: number): boolean {
    return this.getActiveTrainerRescueQuest(waveIndex) !== undefined;
  }

  private getQuestTargetWaveCandidates(currentWave: number, minOffset = 3, maxOffset = 30): number[] {
    const result: number[] = [];

    const modeId = globalScene.gameMode.modeId;

    for (let wave = currentWave + minOffset; wave <= currentWave + maxOffset; wave++) {
      // 현재층 이전/동일층 방지
      if (wave <= currentWave) {
        continue;
      }

      // 클래식 / 챌린지는 179층까지만
      if ((modeId === GameModes.CLASSIC || modeId === GameModes.CHALLENGE) && wave > 179) {
        continue;
      }

      // 무한은 10의 배수 금지
      // 50, 100, 150, 250...도 자동 포함
      if ((modeId === GameModes.ENDLESS || modeId === GameModes.SPLICED_ENDLESS) && wave % 10 === 0) {
        continue;
      }

      // 고정 전투 제외
      if (globalScene.gameMode.isFixedBattle(wave)) {
        continue;
      }

      // 일반 보스층 제외
      if (globalScene.gameMode.isBoss(wave)) {
        continue;
      }

      // 최종/특수 보스층 제외
      if (globalScene.gameMode.isWaveFinal(wave)) {
        continue;
      }

      result.push(wave);
    }

    return result;
  }

  public getRandomRescuableTrainerType(): TrainerType {
    return randSeedItem(RESCUABLE_TRAINER_TYPES);
  }

  public clearQuestBoard(): void {
    this.setQuests([]);
  }

  public resetQuestBoard(): void {
    globalScene.gameData.questList = [];

    globalScene.gameData.saveSystem();
  }

  public setupQuest(quest: QuestEntry, currentWave: number): void {
    quest.generatedBiomeIndex = this.getQuestBiomeIndex(currentWave);

    switch (quest.objectiveType) {
      case "CATCH_POKEMON":
        this.setupPokemonCatchQuest(quest, currentWave);
        break;

      case "FIND_ITEM":
        this.setupItemFindQuest(quest, currentWave);
        break;

      case "REACH_BIOME":
        this.setupBiomeExploreQuest(quest, currentWave);
        break;

      case "FIND_TRAINER":
        this.setupTrainerRescueQuest(quest, currentWave);
        break;
    }

    // ★ 의뢰 게시 순간 보상도 확정
    this.setupQuestReward(quest);
  }

  public setupTrainerRescueQuest(quest: QuestEntry, currentWave: number): void {
    quest.targetTrainerType = this.getRandomRescuableTrainerType();

    const possibleWaves = this.getQuestTargetWaveCandidates(currentWave, 3, 30);

    if (possibleWaves.length === 0) {
      quest.targetTrainerType = undefined;
      quest.targetTrainerWave = undefined;
      quest.targetBiome = undefined;

      console.warn("[QUEST_RESCUE_SETUP_FAILED]", {
        questId: quest.id,
        currentWave,
        reason: "NO_VALID_WAVE",
      });

      return;
    }

    quest.targetTrainerWave = randSeedItem(possibleWaves);

    // 미래 바이옴은 의뢰 생성 시점에는 확정하지 않음
    quest.targetBiome = undefined;

    this.setupTrainerRescueIdentity(quest);
    this.setupTrainerRescueDescription(quest);

    console.log("[QUEST_RESCUE_SETUP]", {
      questId: quest.id,
      currentWave,
      targetTrainerType: quest.targetTrainerType,
      targetTrainerClass: quest.targetTrainerType !== undefined ? TrainerType[quest.targetTrainerType] : undefined,
      targetTrainerName: quest.targetTrainerName,
      targetTrainerWave: quest.targetTrainerWave,
      possibleWaves,
    });
  }

  private getLinkedBiomeIds(biome: BiomeId): BiomeId[] {
    const links = biomeLinks[biome];

    if (links === undefined) {
      return [];
    }

    if (!Array.isArray(links)) {
      return [links];
    }

    const result: BiomeId[] = [];

    for (const link of links) {
      if (Array.isArray(link)) {
        result.push(link[0]);
      } else {
        result.push(link);
      }
    }

    return result;
  }

  private getItemFindItemPool(): {
    id: string;
    name: string;
    method: "WILD_HELD" | "REWARD";
  }[] {
    const result: {
      id: string;
      name: string;
      method: "WILD_HELD" | "REWARD";
    }[] = [];

    for (const [id, factory] of Object.entries(modifierTypeInitObj)) {
      try {
        const type = factory();

        if (!type.id) {
          type.withIdFromFunc(factory);
        }

        // 일반 포켓몬 지닌도구
        if (type instanceof PokemonHeldItemModifierType) {
          result.push({
            id,
            name: type.getSafeName(),
            method: "WILD_HELD",
          });

          continue;
        }

        // ★ 모든 트레이너 도구
        if (type.isTrainerLoadoutItem()) {
          result.push({
            id,
            name: type.getSafeName(),
            method: "REWARD",
          });
        }
      } catch {}
    }

    return result;
  }

  public setupBiomeExploreQuest(quest: QuestEntry): void {
    const currentBiome = globalScene.arena.biomeType;

    const candidates = new Set<BiomeId>();

    let frontier: BiomeId[] = [currentBiome];

    // 현재 위치에서 최대 3번의 바이옴 이동까지 탐색
    for (let depth = 0; depth < 3; depth++) {
      const nextFrontier: BiomeId[] = [];

      for (const biome of frontier) {
        const linkedBiomes = this.getLinkedBiomeIds(biome);

        for (const linkedBiome of linkedBiomes) {
          // 특수 바이옴 제외
          if (linkedBiome === BiomeId.END || linkedBiome === BiomeId.TUTORIAL_ROOM || linkedBiome === currentBiome) {
            continue;
          }

          candidates.add(linkedBiome);
          nextFrontier.push(linkedBiome);
        }
      }

      frontier = nextFrontier;

      if (frontier.length === 0) {
        break;
      }
    }

    const possibleBiomes = Array.from(candidates);

    if (possibleBiomes.length === 0) {
      console.warn("[QUEST_BIOME_SETUP_FAILED]", {
        questId: quest.id,
        currentBiome,
        currentBiomeName: getBiomeName(currentBiome),
      });

      return;
    }

    const targetBiome = randSeedItem(possibleBiomes);

    quest.targetBiome = targetBiome;

    const biomeName = getBiomeName(targetBiome);

    quest.title = `${biomeName} 탐사 의뢰`;

    quest.description =
      `${biomeName} 지역에 대한 탐사 자료가 부족한 상황입니다. `
      + "해당 지역에 직접 방문하여 주변 환경을 조사해 주세요. "
      + "탐사가 완료되면 의뢰소로 돌아와 결과를 보고해 주시면 됩니다.";

    console.log("[QUEST_BIOME_SETUP]", {
      questId: quest.id,
      currentBiome,
      currentBiomeName: getBiomeName(currentBiome),
      targetBiome,
      targetBiomeName: biomeName,
      possibleBiomes: possibleBiomes.map(biome => ({
        id: biome,
        name: getBiomeName(biome),
      })),
    });
  }

  private setupTrainerRescueIdentity(quest: QuestEntry): void {
    if (quest.targetTrainerType === undefined) {
      return;
    }

    const config = trainerConfigs[quest.targetTrainerType];

    // 남녀 스프라이트가 있는 트레이너라면 성별 랜덤
    const variant = config?.hasGenders && randSeedInt(2) === 1 ? TrainerVariant.FEMALE : TrainerVariant.DEFAULT;

    quest.targetTrainerVariant = variant;

    const classKey = `trainersCommon:${toCamelCase(TrainerType[quest.targetTrainerType])}`;

    if (
      !i18next.exists(classKey, {
        returnObjects: true,
      })
    ) {
      return;
    }

    // Trainer 생성자와 동일한 성별 이름 풀 선택
    const genderKey = i18next.exists(`${classKey}.male`)
      ? variant === TrainerVariant.FEMALE
        ? ".female"
        : ".male"
      : "";

    const [nameKey, name] = getRandomLocaleEntry(`${classKey}${genderKey}`);

    quest.targetTrainerNameKey = nameKey;
    quest.targetTrainerName = name;

    console.log("[QUEST_RESCUE_IDENTITY]", {
      trainerType: TrainerType[quest.targetTrainerType],
      variant: TrainerVariant[variant],
      classKey,
      genderKey,
      nameKey,
      name,
    });
  }

  private setupTrainerRescueDescription(quest: QuestEntry): void {
    if (quest.targetTrainerType === undefined || quest.targetTrainerWave === undefined) {
      return;
    }

    const trainerConfig = trainerConfigs[quest.targetTrainerType];

    const trainerClassKey = toCamelCase(
      trainerConfig?.getTitle(undefined, quest.targetTrainerVariant ?? TrainerVariant.DEFAULT)
        ?? TrainerType[quest.targetTrainerType],
    );

    const trainerClass = i18next.t(`trainerClasses:${trainerClassKey}`);

    const trainerName = quest.targetTrainerName ?? "이름불명";

    const displayName = `${trainerClass} ${trainerName}`;

    const location = `${quest.targetTrainerWave}층`;

    quest.title = `${displayName} 구조 요청`;

    quest.description =
      `${displayName}이 해당 바이옴을 탐사하기 위해 이동하던 중 `
      + `${location} 이후로 통신이 끊겼습니다. `
      + "로그탐사대의 도움이 절실한 상황이라 이렇게 의뢰를 남깁니다. "
      + "사례는 넉넉히 해드릴 테니 부디 무사히 구조해 주세요!";
  }

  public removeCompletedAcceptedQuests(): void {
    globalScene.gameData.questList = this.getQuests().filter(quest => !(quest.accepted && quest.completed));

    globalScene.gameData.saveSystem();

    console.log("[QUEST_COMPLETED_REMOVED]", {
      remainingQuests: globalScene.gameData.questList.length,
    });
  }

  private getCatchQuestSpeciesPool(): SpeciesId[] {
    return Object.entries(speciesEggTiers)
      .filter(([_, tier]) => tier === EggTier.COMMON || tier === EggTier.RARE)
      .map(([speciesId]) => Number(speciesId) as SpeciesId);
  }

  private getRandomCatchQuestSpecies(): SpeciesId | undefined {
    const pool = this.getCatchQuestSpeciesPool();

    if (pool.length === 0) {
      return;
    }

    return randSeedItem(pool);
  }

  public isActiveCatchQuestTarget(speciesId: SpeciesId, waveIndex: number): boolean {
    return this.getQuests().some(
      quest =>
        quest.accepted
        && !quest.completed
        && quest.objectiveType === "CATCH_POKEMON"
        && quest.targetSpeciesId !== undefined
        && Number(quest.targetSpeciesId) === Number(speciesId)
        && quest.targetCatchWave === waveIndex,
    );
  }

  public getActiveHeldItemFindQuest(waveIndex: number): QuestEntry | undefined {
    return this.getQuests().find(
      quest =>
        quest.accepted
        && !quest.completed
        && quest.objectiveType === "FIND_ITEM"
        && quest.findItemMethod === "WILD_HELD"
        && quest.targetItemId !== undefined
        && quest.targetItemWave === waveIndex,
    );
  }

  public setupPokemonCatchQuest(quest: QuestEntry, currentWave: number): void {
    const targetSpecies = this.getRandomCatchQuestSpecies();

    if (targetSpecies === undefined) {
      return;
    }

    quest.targetSpeciesId = targetSpecies;

    const speciesName = getPokemonSpecies(targetSpecies).name;

    // 현재 층 이후 후보
    // 우선 테스트용으로 +3 ~ +10층
    const possibleWaves = this.getQuestTargetWaveCandidates(currentWave, 3, 30);

    if (possibleWaves.length === 0) {
      quest.targetSpeciesId = undefined;
      quest.targetCatchWave = undefined;
      quest.targetCatchBiome = undefined;

      console.warn("[QUEST_CATCH_SETUP_FAILED]", {
        questId: quest.id,
        currentWave,
        reason: "NO_VALID_WAVE",
      });

      return;
    }

    quest.targetCatchWave = randSeedItem(possibleWaves);

    quest.title = `${speciesName} 포획 의뢰`;

    const location = `${quest.targetCatchWave}층`;

    quest.description =
      `최근 ${speciesName}의 생태 조사를 진행하고 있습니다. `
      + `조사에 필요한 개체 확보를 위해 ${speciesName} ${quest.requirement}마리를 포획해 주세요. `
      + `최근 ${location} 부근에서 목격되었다는 보고가 있습니다. `
      + "사례는 넉넉히 준비하겠습니다.";

    console.log("[QUEST_CATCH_SETUP]", {
      questId: quest.id,
      currentWave,
      targetSpeciesId: quest.targetSpeciesId,
      targetSpeciesName: speciesName,
      eggTier: speciesEggTiers[quest.targetSpeciesId],
      targetCatchWave: quest.targetCatchWave,
      possibleWaves,
    });
  }

  public removeCompletedQuests(): void {
    globalScene.gameData.questList = this.getQuests().filter(quest => !quest.completed);

    globalScene.gameData.saveSystem();

    console.log("[QUEST_COMPLETED_CLEARED]");
  }

  public acceptQuest(questId: string): boolean {
    const quest = this.getQuests().find(q => q.id === questId);

    if (!quest || quest.completed || quest.accepted) {
      return false;
    }

    if (this.getAcceptedQuestCount() >= this.maxAcceptedQuests) {
      return false;
    }

    quest.accepted = true;

    globalScene.gameData.saveSystem();

    return true;
  }

  private setupQuestReward(quest: QuestEntry): void {
    // RP: 1,000 ~ 100,000
    quest.rewardRp = randSeedInt(99001, 1000);

    // 골드: 1,000 ~ 100,000
    quest.rewardGold = randSeedInt(99001, 1000);

    // 아이템 보상
    quest.rewardItems = this.getRandomQuestRewardItems();

    console.log("[QUEST_REWARD_SETUP]", {
      questId: quest.id,
      rewardRp: quest.rewardRp,
      rewardGold: quest.rewardGold,
      rewardItems: quest.rewardItems,
    });
  }

  private getQuestRewardItemPool(): string[] {
    const result: string[] = [];

    for (const [id, factory] of Object.entries(modifierTypeInitObj)) {
      try {
        const type = factory();

        if (!type.id) {
          type.withIdFromFunc(factory);
        }

        const purchaseMode =
          typeof (type as any).getRogueShopPurchaseMode === "function"
            ? (type as any).getRogueShopPurchaseMode()
            : null;

        // 창고에서 실제로 다루기 쉬운 타입들
        if (purchaseMode === "SELECT_POKEMON" || purchaseMode === "TRAINER_LOADOUT" || purchaseMode === "INSTANT") {
          result.push(id);
        }
      } catch {}
    }

    return result;
  }

  private getRandomQuestRewardItems(): {
    modifierTypeId: string;
    quantity: number;
  }[] {
    const pool = this.getQuestRewardItemPool();

    if (pool.length === 0) {
      return [];
    }

    // 아이템 보상이 아예 없을 수도 있음
    const itemCount = randSeedInt(4); // 0 ~ 3개

    if (itemCount === 0) {
      return [];
    }

    const available = [...pool];

    const result: {
      modifierTypeId: string;
      quantity: number;
    }[] = [];

    for (let i = 0; i < itemCount && available.length > 0; i++) {
      const itemId = randSeedItem(available);

      // 같은 종류 중복 방지
      const index = available.indexOf(itemId);

      if (index >= 0) {
        available.splice(index, 1);
      }

      result.push({
        modifierTypeId: itemId,

        // 당분간 1~3개 랜덤
        quantity: randSeedInt(3, 1),
      });
    }

    return result;
  }

  public cancelQuest(questId: string): boolean {
    const quest = this.getQuests().find(q => q.id === questId);

    if (!quest || !quest.accepted || quest.completed) {
      return false;
    }

    quest.accepted = false;

    globalScene.gameData.saveSystem();

    return true;
  }

  public onPokemonCaught(speciesId: SpeciesId): QuestEntry[] {
    const completedQuests: QuestEntry[] = [];
    let changed = false;

    const quests = this.getQuests();
    const QUEST_DEBUG_ANY_CATCH = false;

    console.log("[QUEST_CATCH_EVENT]", {
      caughtSpeciesId: speciesId,
      caughtSpeciesIdNumber: Number(speciesId),
      quests,
    });

    for (const quest of quests) {
      const targetSpeciesId = Number(quest.targetSpeciesId);
      const caughtSpeciesId = Number(speciesId);

      console.log("[QUEST_CHECK]", {
        id: quest.id,
        accepted: quest.accepted,
        completed: quest.completed,
        objectiveType: quest.objectiveType,

        targetSpeciesId: quest.targetSpeciesId,
        targetSpeciesIdNumber: targetSpeciesId,

        caughtSpeciesId: speciesId,
        caughtSpeciesIdNumber: caughtSpeciesId,

        progress: quest.progress,
        requirement: quest.requirement,
      });

      if (!quest.accepted || quest.completed) {
        continue;
      }

      if (quest.objectiveType !== "CATCH_POKEMON") {
        continue;
      }

      if (!QUEST_DEBUG_ANY_CATCH && targetSpeciesId !== caughtSpeciesId) {
        console.log("[QUEST_TARGET_MISMATCH]", {
          targetSpeciesId,
          caughtSpeciesId,
        });

        continue;
      }

      quest.progress++;
      changed = true;

      console.log("[QUEST_PROGRESS]", {
        id: quest.id,
        progress: quest.progress,
        requirement: quest.requirement,
      });

      if (quest.progress >= quest.requirement) {
        quest.progress = quest.requirement;
        quest.completed = true;

        completedQuests.push(quest);

        console.log("[QUEST_COMPLETED]", {
          id: quest.id,
          title: quest.title,
        });
      }
    }

    if (changed) {
      globalScene.gameData.saveSystem();
    }

    console.log("[QUEST_CATCH_RESULT]", {
      completedCount: completedQuests.length,
      acceptedClear: this.isAcceptedQuestClear(),
    });

    return completedQuests;
  }

  public onBiomeEntered(biomeId: BiomeId): QuestEntry[] {
    const completedQuests: QuestEntry[] = [];
    let changed = false;

    console.log("[QUEST_BIOME_EVENT]", {
      biomeId,
      quests: this.getQuests(),
    });

    for (const quest of this.getQuests()) {
      console.log("[QUEST_BIOME_CHECK]", {
        id: quest.id,
        accepted: quest.accepted,
        completed: quest.completed,
        objectiveType: quest.objectiveType,
        targetBiome: quest.targetBiome,
        enteredBiomeId: biomeId,
      });

      if (!quest.accepted || quest.completed) {
        continue;
      }

      if (quest.objectiveType !== "REACH_BIOME") {
        continue;
      }

      // ★ 반드시 목표 바이옴과 일치해야 진행
      if (quest.targetBiome !== biomeId) {
        console.log("[QUEST_BIOME_MISMATCH]", {
          id: quest.id,
          targetBiome: quest.targetBiome,
          enteredBiomeId: biomeId,
        });

        continue;
      }

      quest.progress++;
      changed = true;

      console.log("[QUEST_BIOME_PROGRESS]", {
        id: quest.id,
        progress: quest.progress,
        requirement: quest.requirement,
      });

      if (quest.progress >= quest.requirement) {
        quest.progress = quest.requirement;
        quest.completed = true;

        completedQuests.push(quest);

        console.log("[QUEST_COMPLETED]", {
          id: quest.id,
          title: quest.title,
        });
      }
    }

    if (changed) {
      globalScene.gameData.saveSystem();
    }

    console.log("[QUEST_BIOME_RESULT]", {
      completedCount: completedQuests.length,
      acceptedClear: this.isAcceptedQuestClear(),
    });

    return completedQuests;
  }

  public isActiveHeldItemQuestPokemon(pokemonId: number, waveIndex: number): boolean {
    const quest = this.getActiveHeldItemFindQuest(waveIndex);

    if (!quest) {
      return false;
    }

    const heldItems = globalScene.findModifiers(
      m => m instanceof PokemonHeldItemModifier && m.pokemonId === pokemonId,
      false,
    ) as PokemonHeldItemModifier[];

    return heldItems.some(modifier => modifier.type?.id === quest.targetItemId);
  }

  public setupItemFindQuest(quest: QuestEntry, currentWave: number): void {
    /**
     * 우선 테스트용.
     * 실제 아이템 랜덤 선정은 이후 아이템 풀을 연결하면서 교체.
     */
    const itemPool = this.getItemFindItemPool();

    if (itemPool.length === 0) {
      console.warn("[QUEST_ITEM_SETUP_FAILED]", {
        questId: quest.id,
        reason: "NO_VALID_ITEM",
      });

      return;
    }

    const targetItem = randSeedItem(itemPool);

    const targetItemId = targetItem.id;

    const targetItemName = targetItem.name;

    const findMethod = targetItem.method;

    quest.targetItemId = targetItemId;
    quest.targetItemName = targetItemName;
    quest.findItemMethod = findMethod;

    const possibleWaves = this.getQuestTargetWaveCandidates(currentWave, 3, 30);

    if (possibleWaves.length === 0) {
      console.warn("[QUEST_ITEM_SETUP_FAILED]", {
        questId: quest.id,
        currentWave,
        reason: "NO_VALID_WAVE",
      });

      return;
    }

    const targetWave = randSeedItem(possibleWaves);

    quest.targetItemId = targetItemId;
    quest.targetItemName = targetItemName;
    quest.targetItemWave = targetWave;
    quest.targetItemBiome = undefined;
    quest.findItemMethod = findMethod;

    const location = `${targetWave}층`;

    quest.title = `${targetItemName} 수색 의뢰`;

    quest.description =
      `${targetItemName}을 찾아달라는 의뢰가 들어왔습니다. `
      + `최근 ${location} 부근에서 해당 물건이 발견되었다는 보고가 있습니다. `
      + (findMethod === "WILD_HELD"
        ? "근처 야생 포켓몬이 가지고 있을 가능성이 높습니다. "
          + `어떤 방법을 사용해도 좋으니 ${targetItemName}을 확보해 주세요.`
        : `해당 지역을 조사하여 ${targetItemName}을 회수해 주세요.`);

    console.log("[QUEST_ITEM_SETUP]", {
      questId: quest.id,

      targetItemId: quest.targetItemId,

      targetItemName: quest.targetItemName,

      findItemMethod: quest.findItemMethod,

      targetItemWave: quest.targetItemWave,

      possibleWaves,
    });
  }

  public getActiveRewardItemFindQuest(waveIndex: number): QuestEntry | undefined {
    return this.getQuests().find(
      quest =>
        quest.accepted
        && !quest.completed
        && quest.objectiveType === "FIND_ITEM"
        && quest.findItemMethod === "REWARD"
        && quest.targetItemId !== undefined
        && quest.targetItemWave === waveIndex,
    );
  }

  public onItemObtained(itemId: string, amount = 1): QuestEntry[] {
    const completedQuests: QuestEntry[] = [];
    let changed = false;

    console.log("[QUEST_ITEM_EVENT]", {
      obtainedItemId: itemId,
      amount,
      quests: this.getQuests(),
    });

    for (const quest of this.getQuests()) {
      console.log("[QUEST_ITEM_CHECK]", {
        id: quest.id,
        accepted: quest.accepted,
        completed: quest.completed,
        objectiveType: quest.objectiveType,
        targetItemId: quest.targetItemId,
        obtainedItemId: itemId,
        progress: quest.progress,
        requirement: quest.requirement,
      });

      if (!quest.accepted || quest.completed) {
        continue;
      }

      if (quest.objectiveType !== "FIND_ITEM") {
        continue;
      }

      // 실제 의뢰 아이템과 정확히 일치해야 진행
      if (quest.targetItemId !== itemId) {
        console.log("[QUEST_ITEM_TARGET_MISMATCH]", {
          targetItemId: quest.targetItemId,
          obtainedItemId: itemId,
        });

        continue;
      }

      // ★ 반드시 의뢰에서 지정된 층에서 획득해야 진행
      const currentWave = globalScene.currentBattle?.waveIndex;

      if (currentWave === undefined || quest.targetItemWave !== currentWave) {
        console.log("[QUEST_ITEM_WAVE_MISMATCH]", {
          questId: quest.id,
          targetWave: quest.targetItemWave,
          currentWave,
          targetItemId: quest.targetItemId,
          obtainedItemId: itemId,
        });

        continue;
      }

      console.log("[QUEST_ITEM_PROGRESS_BEFORE]", {
        questId: quest.id,
        progress: quest.progress,
        progressType: typeof quest.progress,
        amount,
        amountType: typeof amount,
      });

      const currentProgress = typeof quest.progress === "number" ? quest.progress : 0;

      quest.progress = currentProgress + amount;

      changed = true;

      console.log("[QUEST_ITEM_PROGRESS]", {
        id: quest.id,
        progress: quest.progress,
        requirement: quest.requirement,
      });

      if (quest.progress >= quest.requirement) {
        quest.progress = quest.requirement;
        quest.completed = true;

        completedQuests.push(quest);

        console.log("[QUEST_COMPLETED]", {
          id: quest.id,
          title: quest.title,
        });
      }
    }

    if (changed) {
      globalScene.gameData.saveSystem();
    }

    console.log("[QUEST_ITEM_RESULT]", {
      completedCount: completedQuests.length,
      acceptedClear: this.isAcceptedQuestClear(),
    });

    return completedQuests;
  }

  public onTrainerRescued(trainerType: TrainerType, waveIndex: number): QuestEntry[] {
    const completedQuests: QuestEntry[] = [];
    let changed = false;

    for (const quest of this.getQuests()) {
      if (!quest.accepted || quest.completed) {
        continue;
      }

      if (quest.objectiveType !== "FIND_TRAINER") {
        continue;
      }

      if (quest.targetTrainerType !== trainerType) {
        continue;
      }

      // ★ 반드시 지정된 구조 층이어야 함
      if (quest.targetTrainerWave !== waveIndex) {
        continue;
      }

      quest.progress++;
      changed = true;

      if (quest.progress >= quest.requirement) {
        quest.progress = quest.requirement;
        quest.completed = true;
        completedQuests.push(quest);
      }
    }

    if (changed) {
      globalScene.gameData.saveSystem();
    }

    return completedQuests;
  }
}

export const questManager = new QuestManager();
