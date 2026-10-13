import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#enums/trainer-variant";
import { PlayerGender } from "#enums/player-gender";
import { SpeciesId } from "#enums/species-id";
import { Trainer } from "#field/trainer";
import { TrainerKnowhowId } from "#enums/trainer-knowhow-id";
import {
  type CompanionDefinition,
  type CompanionSaveData,
  getCompanionBackSpriteKey,
} from "#system/companion-data";
import { Gender } from "#data/gender";
import { getMonthlyRunStarters } from "#data/daily-seed/monthly-run";
import { TimeOfDay } from "#enums/time-of-day";
import {
  allTrainerKnowhows,
  type TrainerKnowhow,
} from "#trainers/trainer-knowhow/trainer-knowhow";

/**
 * Owns recruitable-trainer state for the current run/session.
 *
 * Responsibilities:
 * - register companion definitions
 * - recruit/unrecruit companions
 * - choose the currently active companion
 * - expose the companion's trainer/back-sprite data
 * - serialize/restore minimal save state
 *
 * Battle placement, Pokémon summoning and throw animation stay in the
 * existing Battle/BattleScene/SummonPhase code.
 */
export class CompanionManager {
  private readonly definitions = new Map<TrainerType, CompanionDefinition>();

  /** 해금 조건은 만족했지만 아직 영입하지 않은 동료 */
  private readonly available = new Set<TrainerType>();

  /** 만남 이벤트를 끝내고 정식 영입한 동료 */
  private readonly recruited = new Set<TrainerType>();

  private activeTrainerType: TrainerType | null = null;

  register(definition: CompanionDefinition): this {
  this.definitions.set(definition.trainerType, {
    ...definition,

    pokemonTeam: definition.pokemonTeam
      ? definition.pokemonTeam.map(member => ({
          ...member,
        }))
      : undefined,

    trainingCardIds: definition.trainingCardIds
      ? [...definition.trainingCardIds]
      : undefined,
  });

  return this;
}

  registerMany(definitions: readonly CompanionDefinition[]): this {
    for (const definition of definitions) {
      this.register(definition);
    }

    return this;
  }

  hasDefinition(trainerType: TrainerType): boolean {
    return this.definitions.has(trainerType);
  }

  getDefinition(trainerType: TrainerType): CompanionDefinition | undefined {
    return this.definitions.get(trainerType);
  }

  getAllDefinitions(): CompanionDefinition[] {
    return [...this.definitions.values()];
  }

  private createDefaultPlayerCompanionTeam(): CompanionDefinition["pokemonTeam"] {
  const starters = getMonthlyRunStarters();

  return starters.map((starter, index) => ({
    speciesId: starter.speciesId,

    // 월간런 구성상 마지막 6번째가 LEGENDARY
    ace: index === starters.length - 1,

    transformPolicy: "AUTO",
  }));
}

    registerMainSeriesProtagonists(): this {
  return this.registerMany([
    // Gen 1 - 리프
    {
      trainerType: TrainerType.LEAF,
      variant: TrainerVariant.FEMALE,
      generation: 1,
      knowhowId: TrainerKnowhowId.LEAF_KANTO_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.EEVEE,
          ace: true,
          formKey: "partner",
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.VENUSAUR,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.CHARIZARD,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.BLASTOISE,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.HAUNTER,
  evolutionTarget: SpeciesId.GENGAR,
  transformPolicy: "AUTO",
},
        {
          speciesId: SpeciesId.TAUROS,
          transformPolicy: "AUTO",
        },
      ],
    },

    // Gen 2 - 심향
    {
      trainerType: TrainerType.ETHAN,
      variant: TrainerVariant.DEFAULT,
      generation: 2,
      knowhowId: TrainerKnowhowId.ETHAN_JOHTO_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.TYPHLOSION,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.MEGANIUM,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.FERALIGATR,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.AMPHAROS,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.EEVEE,
  evolutionTarget: SpeciesId.UMBREON,
  preferredEvolutionTime: [
    TimeOfDay.DUSK,
    TimeOfDay.NIGHT,
  ],
  friendshipFloor: 120,
  transformPolicy: "AUTO",
},
        {
          speciesId: SpeciesId.HERACROSS,
          transformPolicy: "AUTO",
        },
      ],
    },

    // Gen 2 - 금선
    {
      trainerType: TrainerType.LYRA,
      variant: TrainerVariant.FEMALE,
      generation: 2,
      knowhowId: TrainerKnowhowId.ETHAN_JOHTO_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.MEGANIUM,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.TYPHLOSION,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.FERALIGATR,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.EEVEE,
  evolutionTarget: SpeciesId.ESPEON,
  preferredEvolutionTime: [
    TimeOfDay.DAWN,
    TimeOfDay.DAY,
  ],
  friendshipFloor: 120,
  transformPolicy: "AUTO",
},
        {
          speciesId: SpeciesId.SCIZOR,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.TYRANITAR,
          transformPolicy: "AUTO",
        },
      ],
    },

    // Gen 3 - 휘웅
    {
      trainerType: TrainerType.BRENDAN,
      variant: TrainerVariant.DEFAULT,
      generation: 3,
      knowhowId: TrainerKnowhowId.BRENDAN_HOENN_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.SWAMPERT,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SCEPTILE,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.BLAZIKEN,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SWELLOW,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.METAGROSS,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.FLYGON,
          transformPolicy: "AUTO",
        },
      ],
    },

    // Gen 3 - 봄이
    {
      trainerType: TrainerType.MAY,
      variant: TrainerVariant.FEMALE,
      generation: 3,
      knowhowId: TrainerKnowhowId.BRENDAN_HOENN_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.BLAZIKEN,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SCEPTILE,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SWAMPERT,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.ALTARIA,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SALAMENCE,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.GARDEVOIR,
          transformPolicy: "AUTO",
        },
      ],
    },

    // Gen 4 - 광휘
    {
      trainerType: TrainerType.LUCAS,
      variant: TrainerVariant.DEFAULT,
      generation: 4,
      knowhowId: TrainerKnowhowId.LUCAS_SINNOH_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.INFERNAPE,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.TORTERRA,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.EMPOLEON,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.STARAPTOR,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.RIOLU,
  evolutionTarget: SpeciesId.LUCARIO,
  preferredEvolutionTime: [
    TimeOfDay.DAWN,
    TimeOfDay.DAY,
  ],
  friendshipFloor: 120,
  transformPolicy: "AUTO",
},
        {
          speciesId: SpeciesId.GARCHOMP,
          transformPolicy: "AUTO",
        },
      ],
    },

    // Gen 4 - 빛나
    {
      trainerType: TrainerType.DAWN,
      variant: TrainerVariant.FEMALE,
      generation: 4,
      knowhowId: TrainerKnowhowId.LUCAS_SINNOH_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.EMPOLEON,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.TORTERRA,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.INFERNAPE,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.TOGETIC,
  evolutionTarget: SpeciesId.TOGEKISS,
  transformPolicy: "AUTO",
},
{
  speciesId: SpeciesId.RALTS,
  evolutionTarget: SpeciesId.GALLADE,
  forcedGender: Gender.MALE,
  transformPolicy: "AUTO",
},
{
  speciesId: SpeciesId.PILOSWINE,
  evolutionTarget: SpeciesId.MAMOSWINE,
  transformPolicy: "AUTO",
},
      ],
    },

    // Gen 5 - 투지
    {
      trainerType: TrainerType.HILBERT,
      variant: TrainerVariant.DEFAULT,
      generation: 5,
      knowhowId: TrainerKnowhowId.HILBERT_UNOVA_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.SAMUROTT,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SERPERIOR,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.EMBOAR,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.BRAVIARY,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.KROOKODILE,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.HAXORUS,
          transformPolicy: "AUTO",
        },
      ],
    },

    // Gen 5 - 투희
    {
      trainerType: TrainerType.HILDA,
      variant: TrainerVariant.FEMALE,
      generation: 5,
      knowhowId: TrainerKnowhowId.HILBERT_UNOVA_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.EMBOAR,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SERPERIOR,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SAMUROTT,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.HYDREIGON,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.EXCADRILL,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.MINCCINO,
  evolutionTarget: SpeciesId.CINCCINO,
  transformPolicy: "AUTO",
},
      ],
    },

    // Gen 5 - 공명
    {
      trainerType: TrainerType.NATE,
      variant: TrainerVariant.DEFAULT,
      generation: 5,
      knowhowId: TrainerKnowhowId.TRAINING_EXPERT,
      pokemonTeam: [
        {
  speciesId: SpeciesId.RIOLU,
  evolutionTarget: SpeciesId.LUCARIO,
  preferredEvolutionTime: [
    TimeOfDay.DAWN,
    TimeOfDay.DAY,
  ],
  friendshipFloor: 120,
  ace: true,
  transformPolicy: "FORCED",
  forcedTransformKey: "mega-z",
},
        {
          speciesId: SpeciesId.SERPERIOR,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.EMBOAR,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SAMUROTT,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SCOLIPEDE,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.ZOROARK,
          transformPolicy: "AUTO",
        },
      ],
    },

    // Gen 5 - 명희
    {
      trainerType: TrainerType.ROSA,
      variant: TrainerVariant.FEMALE,
      generation: 5,
      knowhowId: TrainerKnowhowId.TRAINING_EXPERT,
      pokemonTeam: [
        {
          speciesId: SpeciesId.SERPERIOR,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.EMBOAR,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SAMUROTT,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.UNFEZANT,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.EELEKTRIK,
  evolutionTarget: SpeciesId.EELEKTROSS,
  transformPolicy: "AUTO",
},
        {
          speciesId: SpeciesId.MIENSHAO,
          transformPolicy: "AUTO",
        },
      ],
    },

    // Gen 6 - 칼름
    {
      trainerType: TrainerType.CALEM,
      variant: TrainerVariant.DEFAULT,
      generation: 6,
      knowhowId: TrainerKnowhowId.CALEM_KALOS_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.GRENINJA,
          ace: true,
          transformPolicy: "NONE",
        },
        {
          speciesId: SpeciesId.CHESNAUGHT,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.DELPHOX,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.DOUBLADE,
  evolutionTarget: SpeciesId.AEGISLASH,
  transformPolicy: "AUTO",
},
        {
          speciesId: SpeciesId.NOIVERN,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.TYRUNT,
  evolutionTarget: SpeciesId.TYRANTRUM,
  preferredEvolutionTime: [
    TimeOfDay.DAWN,
    TimeOfDay.DAY,
  ],
  transformPolicy: "AUTO",
},
      ],
    },

    // Gen 6 - 세레나
    {
      trainerType: TrainerType.SERENA,
      variant: TrainerVariant.FEMALE,
      generation: 6,
      knowhowId: TrainerKnowhowId.CALEM_KALOS_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.DELPHOX,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.CHESNAUGHT,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.GRENINJA,
          transformPolicy: "NONE",
        },
        {
  speciesId: SpeciesId.FLOETTE,
  evolutionTarget: SpeciesId.FLORGES,
  transformPolicy: "AUTO",
},
{
  speciesId: SpeciesId.SLIGGOO,
  evolutionTarget: SpeciesId.GOODRA,
  transformPolicy: "AUTO",
},
{
  speciesId: SpeciesId.AMAURA,
  evolutionTarget: SpeciesId.AURORUS,
  preferredEvolutionTime: [
    TimeOfDay.DUSK,
    TimeOfDay.NIGHT,
  ],
  transformPolicy: "AUTO",
},
      ],
    },

    // Gen 7 - 영태
    {
      trainerType: TrainerType.ELIO,
      variant: TrainerVariant.DEFAULT,
      generation: 7,
      knowhowId: TrainerKnowhowId.ELIO_ALOLA_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.INCINEROAR,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.DECIDUEYE,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.PRIMARINA,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.ROCKRUFF,
  evolutionTarget: SpeciesId.LYCANROC,
  evolutionTargetFormKey: "midday",
  preferredEvolutionTime: [
    TimeOfDay.DAWN,
    TimeOfDay.DAY,
  ],
  transformPolicy: "AUTO",
},
        {
          speciesId: SpeciesId.KOMMO_O,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.ALOLA_SANDSHREW,
  evolutionTarget: SpeciesId.ALOLA_SANDSLASH,
  transformPolicy: "AUTO",
},
      ],
    },

    // Gen 7 - 미월
    {
      trainerType: TrainerType.SELENE,
      variant: TrainerVariant.FEMALE,
      generation: 7,
      knowhowId: TrainerKnowhowId.ELIO_ALOLA_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.DECIDUEYE,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.INCINEROAR,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.PRIMARINA,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.MIMIKYU,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.ALOLA_VULPIX,
  evolutionTarget: SpeciesId.ALOLA_NINETALES,
  transformPolicy: "AUTO",
},
        {
  speciesId: SpeciesId.ROCKRUFF,
  evolutionTarget: SpeciesId.LYCANROC,
  evolutionTargetFormKey: "midnight",
  preferredEvolutionTime: [
    TimeOfDay.DUSK,
    TimeOfDay.NIGHT,
  ],
  transformPolicy: "AUTO",
},
      ],
    },

    // Gen 8 - 승재
    {
      trainerType: TrainerType.VICTOR,
      variant: TrainerVariant.DEFAULT,
      generation: 8,
      knowhowId: TrainerKnowhowId.VICTOR_GALAR_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.CINDERACE,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.RILLABOOM,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.INTELEON,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.CORVIKNIGHT,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SIRFETCHD,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.TOXEL,
  evolutionTarget: SpeciesId.TOXTRICITY,
  evolutionTargetFormKey: "amped",
  transformPolicy: "AUTO",
},
      ],
    },

    // Gen 8 - 우리
    {
      trainerType: TrainerType.GLORIA,
      variant: TrainerVariant.FEMALE,
      generation: 8,
      knowhowId: TrainerKnowhowId.VICTOR_GALAR_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.INTELEON,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.RILLABOOM,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.CINDERACE,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.GALAR_RAPIDASH,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.TOXEL,
  evolutionTarget: SpeciesId.TOXTRICITY,
  evolutionTargetFormKey: "lowkey",
  transformPolicy: "AUTO",
},
        {
          speciesId: SpeciesId.HATTERENE,
          transformPolicy: "AUTO",
        },
      ],
    },

    // Gen 9 - 보민
    {
      trainerType: TrainerType.FLORIAN,
      variant: TrainerVariant.DEFAULT,
      generation: 9,
      knowhowId: TrainerKnowhowId.FLORIAN_PALDEA_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.SKELEDIRGE,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.MEOWSCARADA,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.QUAQUAVAL,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.KILOWATTREL,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.CHARCADET,
  evolutionTarget: SpeciesId.CERULEDGE,
  transformPolicy: "AUTO",
},
        {
          speciesId: SpeciesId.BAXCALIBUR,
          transformPolicy: "AUTO",
        },
      ],
    },

    // Gen 9 - 푸름
    {
      trainerType: TrainerType.JULIANA,
      variant: TrainerVariant.FEMALE,
      generation: 9,
      knowhowId: TrainerKnowhowId.FLORIAN_PALDEA_MASTERY,
      pokemonTeam: [
        {
          speciesId: SpeciesId.MEOWSCARADA,
          ace: true,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.SKELEDIRGE,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.QUAQUAVAL,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.TINKATON,
          transformPolicy: "AUTO",
        },
        {
          speciesId: SpeciesId.PAWMOT,
          transformPolicy: "AUTO",
        },
        {
  speciesId: SpeciesId.CHARCADET,
  evolutionTarget: SpeciesId.ARMAROUGE,
  transformPolicy: "AUTO",
},
      ],
    },
  ]);
}

    updateGenerationUnlocks(gameData: {
    isGenerationDexComplete(generation: number): boolean;
  }): void {
    for (const definition of this.definitions.values()) {
      const generation = definition.generation;

      // 세대 도감 조건이 없는 특수 동료는 여기서 처리하지 않음
      if (!generation) {
        continue;
      }

      // 이미 정식 영입한 동료는 다시 해금하지 않음
      if (this.isRecruited(definition.trainerType)) {
        continue;
      }

      // 이미 만남의광장에 나와 있다면 다시 추가하지 않음
      if (this.isAvailable(definition.trainerType)) {
        continue;
      }

      if (gameData.isGenerationDexComplete(generation)) {
        this.makeAvailable(definition.trainerType);

        console.log("[COMPANION_GENERATION_UNLOCK]", {
          trainerType: definition.trainerType,
          generation,
        });
      }
    }
  }

  ensureDefaultPlayerCompanion(
  playerGender: PlayerGender,
): TrainerType {
  if (!this.hasDefinition(TrainerType.PLAYER_M_ALTERNATE)) {
  this.register({
    trainerType: TrainerType.PLAYER_M_ALTERNATE,
    variant: TrainerVariant.DEFAULT,
    knowhowId: TrainerKnowhowId.KYLE_BALANCED_TRAINING,
    pokemonTeam: this.createDefaultPlayerCompanionTeam(),
  });
}

if (!this.hasDefinition(TrainerType.PLAYER_F_ALTERNATE)) {
  this.register({
    trainerType: TrainerType.PLAYER_F_ALTERNATE,
    variant: TrainerVariant.FEMALE,
    knowhowId: TrainerKnowhowId.AMBER_BALANCED_TRAINING,
    pokemonTeam: this.createDefaultPlayerCompanionTeam(),
  });
}

  const companionTrainerType =
    playerGender === PlayerGender.FEMALE
      ? TrainerType.PLAYER_M_ALTERNATE
      : TrainerType.PLAYER_F_ALTERNATE;

  if (!this.isRecruited(companionTrainerType)) {
    // 기본 동료를 등록하되
    // 자동으로 출전 동료가 되지는 않게 한다.
    const previousActive = this.activeTrainerType;

    this.recruit(companionTrainerType);

    this.activeTrainerType = previousActive;
  }

  return companionTrainerType;
}

    makeAvailable(trainerType: TrainerType): boolean {
    if (!this.definitions.has(trainerType)) {
      console.warn(
        `[COMPANION_AVAILABLE_FAILED] No definition for TrainerType ${trainerType}`,
      );
      return false;
    }

    // 이미 영입했다면 다시 만남 가능 상태로 돌리지 않음
    if (this.recruited.has(trainerType)) {
      return false;
    }

    this.available.add(trainerType);
    return true;
  }

  isAvailable(trainerType: TrainerType): boolean {
    return this.available.has(trainerType);
  }

  getAvailableDefinitions(): CompanionDefinition[] {
    return [...this.available]
      .map(trainerType => this.definitions.get(trainerType))
      .filter(
        (definition): definition is CompanionDefinition => !!definition,
      );
  }

      recruit(trainerType: TrainerType): boolean {
    if (!this.definitions.has(trainerType)) {
      console.warn(
        `[COMPANION_RECRUIT_FAILED] No definition for TrainerType ${trainerType}`,
      );
      return false;
    }

    // 만남의광장 후보 목록에서 제거
    this.available.delete(trainerType);

    // 동료카페에 등록
    this.recruited.add(trainerType);

    return true;
  }

  unrecruit(trainerType: TrainerType): boolean {
    if (!this.recruited.delete(trainerType)) {
      return false;
    }

    if (this.activeTrainerType === trainerType) {
      this.activeTrainerType = null;
    }

    return true;
  }

  isRecruited(trainerType: TrainerType): boolean {
    return this.recruited.has(trainerType);
  }

  getRecruitedDefinitions(): CompanionDefinition[] {
    return [...this.recruited]
      .map(trainerType => this.definitions.get(trainerType))
      .filter((definition): definition is CompanionDefinition => !!definition);
  }

  setActive(trainerType: TrainerType): boolean {
    if (!this.recruited.has(trainerType) || !this.definitions.has(trainerType)) {
      console.warn(`[COMPANION_SET_ACTIVE_FAILED] TrainerType ${trainerType} is not recruited/registered`);
      return false;
    }

    this.activeTrainerType = trainerType;
    return true;
  }

  clearActive(): void {
    this.activeTrainerType = null;
  }

  hasActive(): boolean {
    return this.activeTrainerType !== null;
  }

  getActiveTrainerType(): TrainerType | null {
    return this.activeTrainerType;
  }

  getActiveDefinition(): CompanionDefinition | undefined {
  if (this.activeTrainerType === null) {
    return undefined;
  }

  return this.definitions.get(this.activeTrainerType);
}

getActiveKnowhowId(): TrainerKnowhowId | undefined {
  return this.getActiveDefinition()?.knowhowId;
}

getActiveKnowhow(): TrainerKnowhow | undefined {
  const knowhowId = this.getActiveKnowhowId();

  return knowhowId !== undefined
    ? getTrainerKnowhow(knowhowId)
    : undefined;
}

  getPlayerKnowhow(
  playerGender: PlayerGender,
): TrainerKnowhow | undefined {
  const knowhowId =
    playerGender === PlayerGender.FEMALE
      ? TrainerKnowhowId.AMBER_BALANCED_TRAINING
      : TrainerKnowhowId.KYLE_BALANCED_TRAINING;

  return getTrainerKnowhow(knowhowId);
}

  getActiveBackSpriteKey(): string | undefined {
    const definition = this.getActiveDefinition();
    return definition ? getCompanionBackSpriteKey(definition) : undefined;
  }

  /**
   * Build the existing Trainer runtime object for the active companion.
   * This intentionally reuses Trainer instead of introducing a second trainer
   * class before one is actually needed.
   */
  createActiveTrainer(): Trainer | null {
    const definition = this.getActiveDefinition();
    if (!definition) {
      return null;
    }

    return new Trainer(definition.trainerType, definition.variant ?? TrainerVariant.DEFAULT);
  }

    exportSaveData(): CompanionSaveData {
    return {
      availableTrainerTypes: [...this.available],
      recruitedTrainerTypes: [...this.recruited],
      activeTrainerType: this.activeTrainerType,
    };
  }

    importSaveData(data?: Partial<CompanionSaveData> | null): void {
    this.available.clear();
    this.recruited.clear();
    this.activeTrainerType = null;

    if (!data) {
      return;
    }

    for (const trainerType of data.availableTrainerTypes ?? []) {
      if (this.definitions.has(trainerType)) {
        this.available.add(trainerType);
      }
    }

    for (const trainerType of data.recruitedTrainerTypes ?? []) {
      if (this.definitions.has(trainerType)) {
        this.recruited.add(trainerType);

        // 혹시 구버전/이상 데이터에 양쪽 모두 들어가 있어도
        // recruited 쪽을 우선시함.
        this.available.delete(trainerType);
      }
    }

    const activeTrainerType = data.activeTrainerType ?? null;

    if (
      activeTrainerType !== null
      && this.recruited.has(activeTrainerType)
    ) {
      this.activeTrainerType = activeTrainerType;
    }
  }

    reset(): void {
    this.available.clear();
    this.recruited.clear();
    this.activeTrainerType = null;
  }
}

export function getTrainerKnowhow(
  id: TrainerKnowhowId,
): TrainerKnowhow | undefined {
  return allTrainerKnowhows.find(
    knowhow => knowhow.id === id,
  );
}

/**
 * Shared manager instance.
 * Import this from battle/session code until/unless ownership later moves into
 * GameData or BattleScene.
 */
export const companionManager =
  new CompanionManager().registerMainSeriesProtagonists();
