/* biome-ignore-start lint/correctness/noUnusedImports: tsdoc imports */
import type { initModifierTypes } from "#modifiers/modifier-type";
/* biome-ignore-end lint/correctness/noUnusedImports: tsdoc imports */

import { timedEventManager } from "#app/global-event-manager";
import { globalScene } from "#app/global-scene";
import { pokemonEvolutions } from "#balance/pokemon-evolutions";
import { modifierTypes } from "#data/data-lists";
import { MAX_PER_TYPE_POKEBALLS } from "#data/pokeball";
import { AbilityId } from "#enums/ability-id";
import { BerryType } from "#enums/berry-type";
import { ModifierTier } from "#enums/modifier-tier";
import { MoveId } from "#enums/move-id";
import { PokeballType } from "#enums/pokeball";
import { SpeciesId } from "#enums/species-id";
import { StatusEffect } from "#enums/status-effect";
import { Unlockables } from "#enums/unlockables";
import type { Pokemon } from "#field/pokemon";
import {
  BerryModifier,
  DoubleBattleChanceBoosterModifier,
  SpeciesCritBoosterModifier,
  TurnStatusEffectModifier,
  UrshifuGloveAbilityBypassModifier,
  SpeciesHealingBellModifier,
  CalyrexReinsUnifiedModifier,
  LegendPlateModifier,
  SturdyMealModifier,
  DuskManeBeadModifier,
  DawnWingsBeadModifier,
  UltraBeadModifier,
} from "#modifiers/modifier";
import {
  dailyStarterModifierPool,
  enemyBuffModifierPool,
  modifierPool,
  trainerModifierPool,
  wildModifierPool,
} from "#modifiers/modifier-pools";
import { WeightedModifierType } from "#modifiers/modifier-type";
import type { WeightedModifierTypeWeightFunc } from "#types/modifier-types";
import { initSpeciesZMoves, getSpeciesZMoves, isExclusiveZCrystal, zmovesSpecies } from "#app/data/balance/zmoves";
import { trPoolTiers, maxmovesSpecies } from "#app/data/balance/trs";
import { SpeciesFormKey } from "#enums/species-form-key";

/**
 * Initialize the wild modifier pool
 */
function initWildModifierPool() {
  wildModifierPool[ModifierTier.COMMON] = [new WeightedModifierType(modifierTypes.BERRY, 1)].map(m => {
    m.setTier(ModifierTier.COMMON);
    return m;
  });
  wildModifierPool[ModifierTier.GREAT] = [
    new WeightedModifierType(modifierTypes.BASE_STAT_BOOSTER, 1),
    new WeightedModifierType(modifierTypes.WHITE_HERB, 7),
    new WeightedModifierType(modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER, 7),
    new WeightedModifierType(modifierTypes.AIR_BALLOON, 7),
    new WeightedModifierType(modifierTypes.BLUNDER_POLICY, 7),
    new WeightedModifierType(modifierTypes.MENTAL_HERB, 7),
    new WeightedModifierType(modifierTypes.ROOM_SERVICE, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [MoveId.TRICK_ROOM].some(m => moveset.includes(m));

        return hasMoves; // 기술이 하나라도 있으면 true 반환
      })
        ? 7
        : 0;
    }),
    new WeightedModifierType(modifierTypes.THROAT_SPRAY, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
          MoveId.BOOMBURST,
          MoveId.METAL_SOUND,
          MoveId.SING,
          MoveId.ROUND,
          MoveId.PARTING_SHOT,
          MoveId.TORCH_SONG,
          MoveId.ALLURING_VOICE,
          MoveId.HOWL,
          MoveId.PERISH_SONG,
          MoveId.SPARKLING_ARIA,
          MoveId.SNARL,
          MoveId.BUG_BUZZ,
          MoveId.NOBLE_ROAR,
          MoveId.CONFIDE,
          MoveId.PSYCHIC_NOISE,
          MoveId.EERIE_SPELL,
          MoveId.UPROAR,
          MoveId.CLANGOROUS_SOUL,
          MoveId.CHATTER,
          MoveId.CLANGING_SCALES,
          MoveId.SCREECH,
          MoveId.ECHOED_VOICE,
          MoveId.RELIC_SONG,
          MoveId.OVERDRIVE,
          MoveId.ROAR,
          MoveId.GROWL,
          MoveId.DISARMING_VOICE,
          MoveId.SUPERSONIC,
          MoveId.HEAL_BELL,
          MoveId.SNORE,
          MoveId.GRASS_WHISTLE,
          MoveId.HYPER_VOICE,
        ].some(m => moveset.includes(m));

        return hasMoves; // 기술이 하나라도 있으면 true 반환
      })
        ? 7
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_HERB, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
          MoveId.GEOMANCY,
          MoveId.SKY_ATTACK,
          MoveId.PHANTOM_FORCE,
          MoveId.FLY,
          MoveId.DIVE,
          MoveId.DIG,
          MoveId.BOUNCE,
          MoveId.SHADOW_FORCE,
          MoveId.SKY_DROP,
          MoveId.SKULL_BASH,
          MoveId.METEOR_BEAM,
          MoveId.SOLAR_BLADE,
          MoveId.SOLAR_BEAM,
          MoveId.ELECTRO_SHOT,
          MoveId.RAZOR_WIND,
          MoveId.ICE_BURN,
          MoveId.FREEZE_SHOCK,
        ].some(m => moveset.includes(m));

        return hasMoves; // 기술이 하나라도 있으면 true 반환
      })
        ? 7
        : 0;
    }),
  ].map(m => {
    m.setTier(ModifierTier.GREAT);
    return m;
  });
  wildModifierPool[ModifierTier.ULTRA] = [
    new WeightedModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, 10),
    new WeightedModifierType(modifierTypes.UTILITY_UMBRELLA, 4),
    new WeightedModifierType(modifierTypes.ODD_INCENSE, 4),
    new WeightedModifierType(
      modifierTypes.LEEK,
      (party: Pokemon[]) => {
        const checkedSpecies = [SpeciesId.FARFETCHD, SpeciesId.GALAR_FARFETCHD, SpeciesId.SIRFETCHD];
        // If a party member doesn't already have a Leek and is one of the relevant species, Leek can appear
        return party.some(
          p =>
            !p.getHeldItems().some(i => i instanceof SpeciesCritBoosterModifier) &&
            (checkedSpecies.includes(p.getSpeciesForm(true).speciesId) ||
              (p.isFusion() && checkedSpecies.includes(p.getFusionSpeciesForm(true).speciesId))),
        )
          ? 12
          : 0;
      },
      12,
    ),
    new WeightedModifierType(modifierTypes.STURDYSTONE_INCENSE, 4),
    new WeightedModifierType(modifierTypes.WEAKNESS_POLICY, 7),
    new WeightedModifierType(modifierTypes.MOODY_BAND, 4),
    new WeightedModifierType(modifierTypes.SIMPLE_BAND, 4),
    new WeightedModifierType(modifierTypes.AROMA_INCENSE, 4),
    new WeightedModifierType(modifierTypes.UNAWARE_BAND, 4),
    new WeightedModifierType(modifierTypes.MIRROR_HERB, 5),
    new WeightedModifierType(modifierTypes.UNNERVE_INCENSE, 4),
    new WeightedModifierType(modifierTypes.DAMP_INCENSE, 4),
    new WeightedModifierType(modifierTypes.SILVER_INCENSE, 7),
    new WeightedModifierType(modifierTypes.LOADED_DICE, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
          MoveId.SPIKE_CANNON,
          MoveId.ICICLE_SPEAR,
          MoveId.BULLET_SEED,
          MoveId.PIN_MISSILE,
          MoveId.BARRAGE,
          MoveId.ROCK_BLAST,
          MoveId.FURY_ATTACK,
          MoveId.FURY_SWIPES,
          MoveId.WATER_SHURIKEN,
          MoveId.BONE_RUSH,
          MoveId.COMET_PUNCH,
        ].some(m => moveset.includes(m));

        return hasMoves; // 기술이 하나라도 있으면 true 반환
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.RECOIL_BELT, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasAbility = [AbilityId.ROCK_HEAD, AbilityId.RECKLESS, AbilityId.MAGIC_GUARD].some(a =>
          p.hasAbility(a, false, true),
        );

        const hasMoves = [
  MoveId.TAKE_DOWN,
  MoveId.DOUBLE_EDGE,
  MoveId.SUBMISSION,
  MoveId.STRUGGLE,
  MoveId.VOLT_TACKLE,
  MoveId.FLARE_BLITZ,
  MoveId.BRAVE_BIRD,
  MoveId.WOOD_HAMMER,
  MoveId.HEAD_SMASH,
  MoveId.WILD_CHARGE,
  MoveId.HEAD_CHARGE,
  MoveId.LIGHT_OF_RUIN,
  MoveId.WAVE_CRASH,
  MoveId.CHLOROBLAST,
  MoveId.SUPERCELL_SLAM,
  MoveId.JUMP_KICK,
  MoveId.STEEL_BEAM,
  MoveId.MIND_BLOWN,
  MoveId.HIGH_JUMP_KICK,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열에 하나라도 있으면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.STAT_STAGE_CHANGE_REVERSE_BAND, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.V_CREATE,
  MoveId.MAKE_IT_RAIN,
  MoveId.HEADLONG_RUSH,
  MoveId.LEAF_STORM,
  MoveId.PSYCHO_BOOST,
  MoveId.CLANGING_SCALES,
  MoveId.SCALE_SHOT,
  MoveId.ARMOR_CANNON,
  MoveId.ICE_HAMMER,
  MoveId.HAMMER_ARM,
  MoveId.SUPERPOWER,
  MoveId.OVERHEAT,
  MoveId.DRACO_METEOR,
  MoveId.HYPERSPACE_FURY,
  MoveId.CLOSE_COMBAT,
  MoveId.TERA_BLAST,
  MoveId.FLEUR_CANNON,
  MoveId.DRAGON_ASCENT,
  MoveId.SPIN_OUT,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.PUNCHING_GLOVE, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.POWER_UP_PUNCH,
  MoveId.FIRE_PUNCH,
  MoveId.ICE_PUNCH,
  MoveId.THUNDER_PUNCH,
  MoveId.DRAIN_PUNCH,
  MoveId.HEADLONG_RUSH,
  MoveId.MACH_PUNCH,
  MoveId.MEGA_PUNCH,
  MoveId.RAGE_FIST,
  MoveId.BULLET_PUNCH,
  MoveId.SHADOW_PUNCH,
  MoveId.SURGING_STRIKES,
  MoveId.SKY_UPPERCUT,
  MoveId.ICE_HAMMER,
  MoveId.HAMMER_ARM,
  MoveId.WICKED_BLOW,
  MoveId.COMET_PUNCH,
  MoveId.DIZZY_PUNCH,
  MoveId.JET_PUNCH,
  MoveId.METEOR_MASH,
  MoveId.DYNAMIC_PUNCH,
  MoveId.PLASMA_FISTS,
  MoveId.FOCUS_PUNCH,
  MoveId.DOUBLE_IRON_BASH,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.ENIGMA_INCENSE, 4),
    new WeightedModifierType(modifierTypes.SAFETY_GOGGLES, 4),
    new WeightedModifierType(modifierTypes.MUSCLE_BAND, 4),
    new WeightedModifierType(modifierTypes.WISE_GLASSES, 4),
    new WeightedModifierType(modifierTypes.CLEAR_AMULET, 4),
    new WeightedModifierType(modifierTypes.PROTECTIVE_PADS, 4),
    new WeightedModifierType(modifierTypes.ROCKY_HELMET, 4),
    new WeightedModifierType(modifierTypes.EXPERT_BELT, 4),
    new WeightedModifierType(modifierTypes.CRITICAL_BAND, 4),
    new WeightedModifierType(modifierTypes.TECHNIC_ANKLET, 4),
    new WeightedModifierType(modifierTypes.EVOLUTION_INCENSE, (party: Pokemon[]) => {
      const { gameMode, gameData } = globalScene;

      if (
        gameMode.isDaily ||
        (!gameMode.isFreshStartChallenge() && gameData.isUnlocked(Unlockables.EVOLUTION_INCENSE))
      ) {
        return party.some(p => {
          const isUnevolved =
            p.getSpeciesForm(true).speciesId in pokemonEvolutions ||
            (p.isFusion() && p.getFusionSpeciesForm(true).speciesId in pokemonEvolutions);

          const alreadyHasItem = p.getHeldItems().some(i => i.type.id === "EVOLUTION_INCENSE");

          return !p.isMax() && isUnevolved && !alreadyHasItem;
        })
          ? 10
          : 0;
      }

      return 0;
    }),
    new WeightedModifierType(
      modifierTypes.MYSTICAL_ROCK,
      (party: Pokemon[]) => {
        return party.some(p => {
          let isHoldingMax = false;
          for (const i of p.getHeldItems()) {
            if (i.type.id === "MYSTICAL_ROCK") {
              isHoldingMax = i.getStackCount() === i.getMaxStackCount();
              break;
            }
          }

          if (!isHoldingMax) {
            const moveset = p.getMoveset(true).map(m => m.moveId);

            const hasAbility = [
              AbilityId.DROUGHT,
              AbilityId.ORICHALCUM_PULSE,
              AbilityId.DRIZZLE,
              AbilityId.SAND_STREAM,
              AbilityId.SAND_SPIT,
              AbilityId.SNOW_WARNING,
              AbilityId.ELECTRIC_SURGE,
              AbilityId.HADRON_ENGINE,
              AbilityId.PSYCHIC_SURGE,
              AbilityId.GRASSY_SURGE,
              AbilityId.SEED_SOWER,
              AbilityId.MISTY_SURGE,
            ].some(a => p.hasAbility(a, false, true));

            const hasMoves = [
              MoveId.SUNNY_DAY,
              MoveId.RAIN_DANCE,
              MoveId.SANDSTORM,
              MoveId.SNOWSCAPE,
              MoveId.HAIL,
              MoveId.CHILLY_RECEPTION,
              MoveId.ELECTRIC_TERRAIN,
              MoveId.PSYCHIC_TERRAIN,
              MoveId.GRASSY_TERRAIN,
              MoveId.MISTY_TERRAIN,
            ].some(m => moveset.includes(m));

            return hasAbility || hasMoves;
          }
          return false;
        })
          ? 10
          : 0;
      },
      10,
    ),
    new WeightedModifierType(modifierTypes.LIGHT_CLAY, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
          MoveId.REFLECT,
          MoveId.LIGHT_SCREEN,
          MoveId.BADDY_BAD,
          MoveId.GLITZY_GLOW,
          MoveId.AURORA_VEIL,
        ].some(m => moveset.includes(m));

        return hasMoves; // 기술이 하나라도 있으면 true 반환
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.WIDE_LENS, 7),
    new WeightedModifierType(modifierTypes.SPECIES_STAT_BOOSTER, 12),
    new WeightedModifierType(modifierTypes.RARE_SPECIES_STAT_BOOSTER, 12),
  ].map(m => {
    m.setTier(ModifierTier.ULTRA);
    return m;
  });
  wildModifierPool[ModifierTier.ROGUE] = [
    new WeightedModifierType(modifierTypes.LUCKY_EGG, 8),
    new WeightedModifierType(modifierTypes.BRIGHT_POWDER, 4),
    new WeightedModifierType(modifierTypes.FOCUS_BAND, 2),
    new WeightedModifierType(modifierTypes.QUICK_CLAW, 1),
    new WeightedModifierType(modifierTypes.GRIP_CLAW, 1),
    new WeightedModifierType(
  modifierTypes.BOOSTER_ENERGY,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.PROTOSYNTHESIS, AbilityId.QUARK_DRIVE, AbilityId.PLUVIAFLUX, AbilityId.NEURO_CHARGE, AbilityId.CRYOSYNTHESIS, AbilityId.PHYTONCIDE, AbilityId.PSAMMOSYNTHESIS, AbilityId.UNSEEN_FORCE]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 10
      : 0;
  },
  10,
),
    new WeightedModifierType(
  modifierTypes.POWER_UP_DISK,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.ORICHALCUM_PULSE, AbilityId.HADRON_ENGINE, AbilityId.AQUA_HEART, AbilityId.BIO_PULSE, AbilityId.TUNDRA_SPIRIT, AbilityId.NATURAL_SOUL, AbilityId.DESERT_MIRACLE, AbilityId.MIRACLE_FOG]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 10
      : 0;
  },
  10,
),
    new WeightedModifierType(
  modifierTypes.VICTORY_SYMBOL,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.VICTORY_STAR]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 10
      : 0;
  },
  10,
),
    new WeightedModifierType(modifierTypes.ADAPTABILITY_BAND, 4),
    new WeightedModifierType(modifierTypes.POWER_UP_WEIGHT, 4),
    new WeightedModifierType(modifierTypes.SHEER_FORCE_BAND, 4),
    new WeightedModifierType(modifierTypes.SCRAPPY_BELT, 4),
    new WeightedModifierType(modifierTypes.COVERT_CLOAK, 4),
    new WeightedModifierType(modifierTypes.LIFE_ORB, 4),
    new WeightedModifierType(modifierTypes.COLORFUL_LENS, 4),
    new WeightedModifierType(modifierTypes.CHOICE_SCARF, 3),
    new WeightedModifierType(modifierTypes.CHOICE_SPECS, 3),
    new WeightedModifierType(modifierTypes.CHOICE_BAND, 3),
    new WeightedModifierType(modifierTypes.ASSAULT_VEST, 3),
    new WeightedModifierType(modifierTypes.METRONOME, 3),
    new WeightedModifierType(modifierTypes.FOCUS_SASH, 4),
    new WeightedModifierType(modifierTypes.KINGS_ROCK, 3),
    new WeightedModifierType(modifierTypes.LEFTOVERS, 3),
    new WeightedModifierType(modifierTypes.SHELL_BELL, 3),
    new WeightedModifierType(modifierTypes.SCOPE_LENS, 4),
  ].map(m => {
    m.setTier(ModifierTier.ROGUE);
    return m;
  });
  wildModifierPool[ModifierTier.MASTER] = [
    new WeightedModifierType(modifierTypes.GOLDEN_EGG, 4),
    new WeightedModifierType(modifierTypes.ABILITY_SHIELD, 1),
    new WeightedModifierType(modifierTypes.MULTI_LENS, 1),
    new WeightedModifierType(modifierTypes.GOLDEN_INCENSE, 1),
    new WeightedModifierType(modifierTypes.MOLD_BREAKER_BRACER, 1),
  ].map(m => {
    m.setTier(ModifierTier.MASTER);
    return m;
  });
}

/**
 * Initialize the common modifier pool
 */
const allZMoveIds: Set<Moves> = new Set(Object.keys(zmovesSpecies).map(Number));
const allMaxMoveIds: Set<Moves> = new Set(Object.keys(maxmovesSpecies).map(Number));
function initCommonModifierPool() {
  const arr = [
    new WeightedModifierType(modifierTypes.POKEBALL, () => (hasMaximumBalls(PokeballType.POKEBALL) ? 0 : 6), 6),
    new WeightedModifierType(modifierTypes.RARE_CANDY, 2),
    new WeightedModifierType(
      modifierTypes.POTION,
      (party: Pokemon[]) => {
        const thresholdPartyMemberCount = Math.min(
          party.filter(p => p.getInverseHp() >= 10 && p.getHpRatio() <= 0.875 && !p.isFainted()).length,
          3,
        );
        return thresholdPartyMemberCount * 3;
      },
      9,
    ),
    new WeightedModifierType(
      modifierTypes.SUPER_POTION,
      (party: Pokemon[]) => {
        const thresholdPartyMemberCount = Math.min(
          party.filter(p => p.getInverseHp() >= 25 && p.getHpRatio() <= 0.75 && !p.isFainted()).length,
          3,
        );
        return thresholdPartyMemberCount;
      },
      3,
    ),
    new WeightedModifierType(
      modifierTypes.ETHER,
      (party: Pokemon[]) => {
        const thresholdPartyMemberCount = Math.min(
          party.filter(
            p =>
              p.hp &&
              !p.getHeldItems().some(m => m instanceof BerryModifier && m.berryType === BerryType.LEPPA) &&
              p
                .getMoveset()
                .filter(m => m.ppUsed && m.getMovePp() - m.ppUsed <= 5 && m.ppUsed > Math.floor(m.getMovePp() / 2))
                .length,
          ).length,
          3,
        );
        return thresholdPartyMemberCount * 3;
      },
      9,
    ),
    new WeightedModifierType(
      modifierTypes.MAX_ETHER,
      (party: Pokemon[]) => {
        const thresholdPartyMemberCount = Math.min(
          party.filter(
            p =>
              p.hp &&
              !p.getHeldItems().some(m => m instanceof BerryModifier && m.berryType === BerryType.LEPPA) &&
              p
                .getMoveset()
                .filter(m => m.ppUsed && m.getMovePp() - m.ppUsed <= 5 && m.ppUsed > Math.floor(m.getMovePp() / 2))
                .length,
          ).length,
          3,
        );
        return thresholdPartyMemberCount;
      },
      3,
    ),
    new WeightedModifierType(modifierTypes.LURE, lureWeightFunc(10, 2)),
    new WeightedModifierType(modifierTypes.TEMP_STAT_STAGE_BOOSTER, 4),
    new WeightedModifierType(modifierTypes.BERRY, 10),
    new WeightedModifierType(modifierTypes.TM_COMMON, 14),
  ];

arr.forEach(m => m.setTier(ModifierTier.COMMON));
modifierPool[ModifierTier.COMMON] = arr;
}

/**
 * Initialize the Great modifier pool
 */
function initGreatModifierPool() {
  const arr = [
    new WeightedModifierType(modifierTypes.GREAT_BALL, () => (hasMaximumBalls(PokeballType.GREAT_BALL) ? 0 : 6), 6),
    new WeightedModifierType(modifierTypes.WHITE_HERB, 7),
    new WeightedModifierType(modifierTypes.TR_COMMON, 14),
    new WeightedModifierType(modifierTypes.DYNAMAX_CANDY, 7),
    new WeightedModifierType(modifierTypes.ARMORITE_ORE, 7),
    new WeightedModifierType(modifierTypes.Z_GENERIC, 7),
    new WeightedModifierType(modifierTypes.WISHING_STAR, 17),
    new WeightedModifierType(modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER, 7),
    new WeightedModifierType(
      modifierTypes.CLEAR_BELL,
      (party: Pokemon[]) => {
        const checkedSpecies = [SpeciesId.HO_OH];
        // If a party member doesn't already have a Leek and is one of the relevant species, Leek can appear
        return party.some(
          p =>
            !p.getHeldItems().some(i => i instanceof SturdyMealModifier) &&
            (checkedSpecies.includes(p.getSpeciesForm(true).speciesId) ||
              (p.isFusion() && checkedSpecies.includes(p.getFusionSpeciesForm(true).speciesId))),
        )
          ? 12
          : 0;
      },
      12,
    ),
    new WeightedModifierType(
  modifierTypes.LEGEND_PLATE,
  (party: Pokemon[]) => {
    return party.some(p => {
      const sid = p.getSpeciesForm(true).speciesId;
      const held = p.getHeldItems().map(i => ({
        ctor: i.constructor?.name,
        type: i.type,
        typeKey: (i as any).type?.toString?.(),
      }));
      console.log("[LP_WEIGHT_CHECK]", p.getName?.(), sid, held);

      if (sid !== SpeciesId.ARCEUS) return false;

      const has = p.getHeldItems().some(i => i.type === ModifierType.LEGEND_PLATE);
      return !has;
    }) ? 12 : 0;
  },
  12,
),
    new WeightedModifierType(
  modifierTypes.DUSK_BEAD,
  (party: Pokemon[]) => {
    return party.some(p => {
      if (p.getSpeciesForm(true).speciesId !== SpeciesId.NECROZMA) return false;

      const k = p.getFormKey();
      const isDuskMane = k === "dusk-mane";

      if (!isDuskMane) return false;

      // ✅ 이미 DUSK_BEAD(=dusk_flute)를 들고 있으면 등장 안함
      return !p.getHeldItems().some(
        i => i instanceof DuskManeBeadModifier && i.type === ModifierType.DUSK_BEAD
      );
    })
      ? 12
      : 0;
  },
  12,
),
new WeightedModifierType(
  modifierTypes.DAWN_BEAD,
  (party: Pokemon[]) => {
    return party.some(p => {
      if (p.getSpeciesForm(true).speciesId !== SpeciesId.NECROZMA) return false;

      const k = p.getFormKey();
      const isDawnWings = k === "dawn-wings";

      if (!isDawnWings) return false;

      // ✅ 이미 DAWN_BEAD(=dawn_flute)를 들고 있으면 등장 안함
      return !p.getHeldItems().some(
        i => i instanceof DawnWingsBeadModifier && i.type === ModifierType.DAWN_BEAD
      );
    })
      ? 12
      : 0;
  },
  12,
),
new WeightedModifierType(
  modifierTypes.BLIGHT_BEAD,
  (party: Pokemon[]) => {
    return party.some(p => {
      if (p.getSpeciesForm(true).speciesId !== SpeciesId.NECROZMA) return false;

      const k = p.getFormKey();
      const isUltra = k === "ultra"; // ✅ 브라이트비드는 울트라 전용

      if (!isUltra) return false;

      // ✅ 이미 BLIGHT_BEAD(=bright_flute)를 들고 있으면 등장 안함
      return !p.getHeldItems().some(
        i => i instanceof UltraBeadModifier && i.type === ModifierType.BLIGHT_BEAD
      );
    })
      ? 12
      : 0;
  },
  12,
),
    new WeightedModifierType(
  modifierTypes.CURSED_BOWL,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.VESSEL_OF_RUIN]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 12
      : 0;
  },
  12,
),
    new WeightedModifierType(
  modifierTypes.CURSED_SWORD,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.SWORD_OF_RUIN]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 12
      : 0;
  },
  12,
),
    new WeightedModifierType(
  modifierTypes.CURSED_BOOK,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.TABLETS_OF_RUIN]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 12
      : 0;
  },
  12,
),
    new WeightedModifierType(
  modifierTypes.CURSED_BEAD,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.BEADS_OF_RUIN]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 12
      : 0;
  },
  12,
),
    new WeightedModifierType(
  modifierTypes.BLACK_MANE_HAIR,
  (party: Pokemon[]) => {
    return party.some(p => {
      if (p.getSpeciesForm(true).speciesId !== SpeciesId.CALYREX) return false;

      const k = p.getFormKey();
     const isShadow =
        k === "shadow" ||
        k === SpeciesFormKey.SHADOW;

      if (!isShadow) return false;

      return !p.getHeldItems().some(
        i => i instanceof CalyrexReinsUnifiedModifier && i.type === ModifierType.BLACK_MANE_HAIR
      );
    })
      ? 12
      : 0;
  },
  12,
),

new WeightedModifierType(
  modifierTypes.WHITE_MANE_HAIR,
  (party: Pokemon[]) => {
    return party.some(p => {
      if (p.getSpeciesForm(true).speciesId !== SpeciesId.CALYREX) return false;

      const k = p.getFormKey();
      const isIce =
        k === "ice" ||
        k === SpeciesFormKey.ICE;

      if (!isIce) return false;

      return !p.getHeldItems().some(
        i => i instanceof CalyrexReinsUnifiedModifier && i.type === ModifierType.WHITE_MANE_HAIR
      );
    })
      ? 12
      : 0;
  },
  12,
),
    new WeightedModifierType(
      modifierTypes.TIDAL_BELL,
      (party: Pokemon[]) => {
        const checkedSpecies = [SpeciesId.LUGIA];
        // If a party member doesn't already have a Leek and is one of the relevant species, Leek can appear
        return party.some(
          p =>
            !p.getHeldItems().some(i => i instanceof SpeciesHealingBellModifier) &&
            (checkedSpecies.includes(p.getSpeciesForm(true).speciesId) ||
              (p.isFusion() && checkedSpecies.includes(p.getFusionSpeciesForm(true).speciesId))),
        )
          ? 12
          : 0;
      },
      12,
    ),
    new WeightedModifierType(
  modifierTypes.ANGE_ORB,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.ANGE_AURA]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 10
      : 0;
  },
  10,
),
    new WeightedModifierType(
      modifierTypes.MEGA_BRACELET,
      () => Math.min(Math.ceil(globalScene.currentBattle.waveIndex / 50), 4) * 9,
      36,
    ),
    new WeightedModifierType(
      modifierTypes.DYNAMAX_BAND,
      () => Math.min(Math.ceil(globalScene.currentBattle.waveIndex / 50), 4) * 9,
      36,
    ),
    new WeightedModifierType(
      modifierTypes.EVOLUTION_ITEM,
      () => {
        return Math.min(Math.ceil(globalScene.currentBattle.waveIndex / 15), 24);
      },
      24,
    ),
    new WeightedModifierType(
      modifierTypes.RARE_FORM_CHANGE_ITEM,
      () => Math.min(Math.ceil(globalScene.currentBattle.waveIndex / 50), 4) * 6,
      24,
    ),
    new WeightedModifierType(
      modifierTypes.FORM_CHANGE_ITEM,
      () => Math.min(Math.ceil(globalScene.currentBattle.waveIndex / 50), 4) * 6,
      24,
    ),
    new WeightedModifierType(
      modifierTypes.RARE_EVOLUTION_ITEM,
      () => Math.min(Math.ceil(globalScene.currentBattle.waveIndex / 15) * 4, 32),
      32,
    ),
    new WeightedModifierType(
  modifierTypes.VICTORY_SYMBOL,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.VICTORY_STAR]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 10
      : 0;
  },
  10,
),
   new WeightedModifierType(
  modifierTypes.POWER_UP_DISK,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.ORICHALCUM_PULSE, AbilityId.HADRON_ENGINE, AbilityId.AQUA_HEART, AbilityId.BIO_PULSE, AbilityId.TUNDRA_SPIRIT, AbilityId.NATURAL_SOUL, AbilityId.DESERT_MIRACLE, AbilityId.MIRACLE_FOG]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 10
      : 0;
  },
  10,
),
    new WeightedModifierType(
  modifierTypes.WICKED_GLOVE,
  (party: Pokemon[]) => {
    return party.some(p => {
      if (p.getSpeciesForm(true).speciesId !== SpeciesId.URSHIFU) return false;

      const k = p.getFormKey();
      const isSingle =
        k === "single-strike" ||
        k === SpeciesFormKey.GIGANTAMAX_SINGLE;

      if (!isSingle) return false;

      // ✅ 이미 WICKED_GLOVE를 들고 있으면 등장 안함
      return !p.getHeldItems().some(
        i => i instanceof UrshifuGloveAbilityBypassModifier && i.type === ModifierType.WICKED_GLOVE
      );
    })
      ? 12
      : 0;
  },
  12,
),
   new WeightedModifierType(
  modifierTypes.SURGING_GLOVE,
  (party: Pokemon[]) => {
    return party.some(p => {
      if (p.getSpeciesForm(true).speciesId !== SpeciesId.URSHIFU) return false;

      const k = p.getFormKey();
      const isRapid =
        k === "rapid-strike" ||
        k === SpeciesFormKey.GIGANTAMAX_RAPID;

      if (!isRapid) return false;

      // ✅ 이미 SURGING_GLOVE를 들고 있으면 등장 안함
      return !p.getHeldItems().some(
        i => i instanceof UrshifuGloveAbilityBypassModifier && i.type === ModifierType.SURGING_GLOVE
      );
    })
      ? 12
      : 0;
  },
  12,
),
    new WeightedModifierType(modifierTypes.PP_UP, 2),
    new WeightedModifierType(
      modifierTypes.FULL_HEAL,
      (party: Pokemon[]) => {
        const statusEffectPartyMemberCount = Math.min(
          party.filter(
            p =>
              p.hp &&
              !!p.status &&
              !p.getHeldItems().some(i => {
                if (i instanceof TurnStatusEffectModifier) {
                  return (i as TurnStatusEffectModifier).getStatusEffect() === p.status?.effect;
                }
                return false;
              }),
          ).length,
          3,
        );
        return statusEffectPartyMemberCount * 6;
      },
      18,
    ),
    new WeightedModifierType(modifierTypes.RARE_SPECIES_STAT_BOOSTER, 12),
    new WeightedModifierType(
      modifierTypes.REVIVE,
      (party: Pokemon[]) => {
        const faintedPartyMemberCount = Math.min(party.filter(p => p.isFainted()).length, 3);
        return faintedPartyMemberCount * 9;
      },
      27,
    ),
    new WeightedModifierType(
      modifierTypes.MAX_REVIVE,
      (party: Pokemon[]) => {
        const faintedPartyMemberCount = Math.min(party.filter(p => p.isFainted()).length, 3);
        return faintedPartyMemberCount * 3;
      },
      9,
    ),
    new WeightedModifierType(
      modifierTypes.SACRED_ASH,
      (party: Pokemon[]) => {
        return party.filter(p => p.isFainted()).length >= Math.ceil(party.length / 2) ? 1 : 0;
      },
      1,
    ),
    new WeightedModifierType(
      modifierTypes.HYPER_POTION,
      (party: Pokemon[]) => {
        const thresholdPartyMemberCount = Math.min(
          party.filter(p => p.getInverseHp() >= 100 && p.getHpRatio() <= 0.625 && !p.isFainted()).length,
          3,
        );
        return thresholdPartyMemberCount * 3;
      },
      9,
    ),
    new WeightedModifierType(
      modifierTypes.MAX_POTION,
      (party: Pokemon[]) => {
        const thresholdPartyMemberCount = Math.min(
          party.filter(p => p.getInverseHp() >= 100 && p.getHpRatio() <= 0.5 && !p.isFainted()).length,
          3,
        );
        return thresholdPartyMemberCount;
      },
      3,
    ),
    new WeightedModifierType(
      modifierTypes.FULL_RESTORE,
      (party: Pokemon[]) => {
        const statusEffectPartyMemberCount = Math.min(
          party.filter(
            p =>
              p.hp &&
              !!p.status &&
              !p.getHeldItems().some(i => {
                if (i instanceof TurnStatusEffectModifier) {
                  return (i as TurnStatusEffectModifier).getStatusEffect() === p.status?.effect;
                }
                return false;
              }),
          ).length,
          3,
        );
        const thresholdPartyMemberCount = Math.floor(
          (Math.min(party.filter(p => p.getInverseHp() >= 100 && p.getHpRatio() <= 0.5 && !p.isFainted()).length, 3) +
            statusEffectPartyMemberCount) /
            2,
        );
        return thresholdPartyMemberCount;
      },
      3,
    ),
    new WeightedModifierType(
      modifierTypes.ELIXIR,
      (party: Pokemon[]) => {
        const thresholdPartyMemberCount = Math.min(
          party.filter(
            p =>
              p.hp &&
              !p.getHeldItems().some(m => m instanceof BerryModifier && m.berryType === BerryType.LEPPA) &&
              p
                .getMoveset()
                .filter(m => m.ppUsed && m.getMovePp() - m.ppUsed <= 5 && m.ppUsed > Math.floor(m.getMovePp() / 2))
                .length,
          ).length,
          3,
        );
        return thresholdPartyMemberCount * 3;
      },
      9,
    ),
    new WeightedModifierType(
      modifierTypes.MAX_ELIXIR,
      (party: Pokemon[]) => {
        const thresholdPartyMemberCount = Math.min(
          party.filter(
            p =>
              p.hp &&
              !p.getHeldItems().some(m => m instanceof BerryModifier && m.berryType === BerryType.LEPPA) &&
              p
                .getMoveset()
                .filter(m => m.ppUsed && m.getMovePp() - m.ppUsed <= 5 && m.ppUsed > Math.floor(m.getMovePp() / 2))
                .length,
          ).length,
          3,
        );
        return thresholdPartyMemberCount;
      },
      3,
    ),
    new WeightedModifierType(
      modifierTypes.Z_DRINK,
      (party: Pokemon[]) => {
        const count = party.filter(p =>
          p.getMoveset().some(m => allZMoveIds.has(m.MoveId) && m.ppUsed > Math.floor(m.getMovePp() / 2)),
        ).length;

        // 최대 3마리까지만 반영 → 가중치 3씩
        return Math.min(count, 3) * 3;
      },
      7, // 기본 가중치 (Z기술은 희소하므로 일반 엘릭서보다 낮게 설정 가능)
    ),
    new WeightedModifierType(
      modifierTypes.MAX_DRINK,
      (party: Pokemon[]) => {
        const count = party.filter(p =>
          p.getMoveset().some(m => allMaxMoveIds.has(m.MoveId) && m.ppUsed > Math.floor(m.getMovePp() / 2)),
        ).length;

        // 최대 3마리까지만 반영 → 가중치 3씩
        return Math.min(count, 3) * 3;
      },
      7, // 기본 가중치 (Z기술은 희소하므로 일반 엘릭서보다 낮게 설정 가능)
    ),
    new WeightedModifierType(modifierTypes.DIRE_HIT, 4),
    new WeightedModifierType(modifierTypes.SUPER_LURE, lureWeightFunc(15, 4)),
    new WeightedModifierType(modifierTypes.NUGGET, skipInLastClassicWaveOrDefault(5)),
    new WeightedModifierType(modifierTypes.SPECIES_STAT_BOOSTER, 12),
    new WeightedModifierType(
      modifierTypes.EVOLUTION_ITEM,
      () => {
        return Math.min(Math.ceil(globalScene.currentBattle.waveIndex / 15), 8);
      },
      8,
    ),
    new WeightedModifierType(modifierTypes.MAP, skipInLastClassicWaveOrDefault(10)),
    new WeightedModifierType(modifierTypes.SOOTHE_BELL, 2),
    new WeightedModifierType(modifierTypes.TM_GREAT, 14),
    new WeightedModifierType(modifierTypes.AIR_BALLOON, 7),
    new WeightedModifierType(modifierTypes.BLUNDER_POLICY, 7),
    new WeightedModifierType(modifierTypes.MENTAL_HERB, 7),
    new WeightedModifierType(modifierTypes.LAGGING_TAIL, 4),
    new WeightedModifierType(
      modifierTypes.MEMORY_MUSHROOM,
      (party: Pokemon[]) => {
        if (!party.find(p => p.getLearnableLevelMoves().length)) {
          return 0;
        }
        const highestPartyLevel = party
          .map(p => p.level)
          .reduce((highestLevel: number, level: number) => Math.max(highestLevel, level), 1);
        return Math.min(Math.ceil(highestPartyLevel / 20), 4);
      },
      4,
    ),
    new WeightedModifierType(modifierTypes.BASE_STAT_BOOSTER, 3),
    new WeightedModifierType(modifierTypes.TERA_SHARD, (party: Pokemon[]) =>
      party.filter(
        p =>
          !(p.hasSpecies(SpeciesId.TERAPAGOS) || p.hasSpecies(SpeciesId.OGERPON)),
      ).length > 0
        ? 10
        : 0,
    ),
    new WeightedModifierType(
      modifierTypes.DNA_SPLICERS,
      (party: Pokemon[]) => {
        if (party.filter(p => !p.fusionSpecies).length > 1) {
          if (globalScene.gameMode.isSplicedOnly) {
            return 4;
          }
          if (globalScene.gameMode.isClassic && timedEventManager.areFusionsBoosted()) {
            return 2;
          }
        }
        return 0;
      },
      4,
    ),
    new WeightedModifierType(
      modifierTypes.VOUCHER,
      (_party: Pokemon[], rerollCount: number) => (!globalScene.gameMode.isDaily ? Math.max(1 - rerollCount, 0) : 0),
      1,
    ),
    new WeightedModifierType(modifierTypes.ROOM_SERVICE, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves= [MoveId.TRICK_ROOM].some(m => moveset.includes(m));

        return hasMoves; // 기술이 하나라도 있으면 true 반환
      })
        ? 7
        : 0;
    }),
    new WeightedModifierType(modifierTypes.THROAT_SPRAY, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
          MoveId.BOOMBURST,
          MoveId.METAL_SOUND,
          MoveId.SING,
          MoveId.ROUND,
          MoveId.PARTING_SHOT,
          MoveId.TORCH_SONG,
          MoveId.ALLURING_VOICE,
          MoveId.HOWL,
          MoveId.PERISH_SONG,
          MoveId.SPARKLING_ARIA,
          MoveId.SNARL,
          MoveId.BUG_BUZZ,
          MoveId.NOBLE_ROAR,
          MoveId.CONFIDE,
          MoveId.PSYCHIC_NOISE,
          MoveId.EERIE_SPELL,
          MoveId.UPROAR,
          MoveId.CLANGOROUS_SOUL,
          MoveId.CHATTER,
          MoveId.CLANGING_SCALES,
          MoveId.SCREECH,
          MoveId.ECHOED_VOICE,
          MoveId.RELIC_SONG,
          MoveId.OVERDRIVE,
          MoveId.ROAR,
          MoveId.GROWL,
          MoveId.DISARMING_VOICE,
          MoveId.SUPERSONIC,
          MoveId.HEAL_BELL,
          MoveId.SNORE,
          MoveId.GRASS_WHISTLE,
          MoveId.HYPER_VOICE,
          MoveId.MOUNTAIN_ECHO,
          MoveId.FOREST_ARIA,
          MoveId.CURSED_SONG,
          MoveId.BRAVE_SHOUTING,
          MoveId.CLIFF_SONG,
          MoveId.AURORA_ARIA,
          MoveId.METAL_SONG,
          MoveId.TOXIC_SONG,
].some(m => moveset.includes(m));

        return hasMoves; // 기술이 하나라도 있으면 true 반환
      })
        ? 7
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_HERB, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.GEOMANCY,
  MoveId.SKY_ATTACK,
  MoveId.PHANTOM_FORCE,
  MoveId.FLY,
  MoveId.DIVE,
  MoveId.DIG,
  MoveId.BOUNCE,
  MoveId.SHADOW_FORCE,
  MoveId.SKY_DROP,
  MoveId.SKULL_BASH,
  MoveId.METEOR_BEAM,
  MoveId.SOLAR_BLADE,
  MoveId.SOLAR_BEAM,
  MoveId.ELECTRO_SHOT,
  MoveId.RAZOR_WIND,
  MoveId.ICE_BURN,
  MoveId.FREEZE_SHOCK,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열에 하나라도 포함되어 있으면 true
      })
        ? 7
        : 0;
    }),
  ];

arr.forEach(m => m.setTier(ModifierTier.GREAT));
modifierPool[ModifierTier.GREAT] = arr;
}

/**
 * Initialize the Ultra modifier pool
 */
function initUltraModifierPool() {
  const arr = [
    new WeightedModifierType(modifierTypes.ULTRA_BALL, () => (hasMaximumBalls(PokeballType.ULTRA_BALL) ? 0 : 15), 15),
    new WeightedModifierType(modifierTypes.ABILITY_CAPSULE, 7),
    new WeightedModifierType(modifierTypes.TR_RARE, 14),
    new WeightedModifierType(
      modifierTypes.Z_RING,
      () =>
        !globalScene.gameMode.isClassic
          ? Math.min(Math.max(Math.floor(globalScene.currentBattle.waveIndex / 50) * 2, 1), 7)
          : 0,
      36,
    ),
    new WeightedModifierType(
      modifierTypes.Z_POWER_RING,
      () =>
        !globalScene.gameMode.isClassic
          ? Math.min(Math.max(Math.floor(globalScene.currentBattle.waveIndex / 50) * 2, 1), 7)
          : 0,
      36,
    ),
    new WeightedModifierType(modifierTypes.OVAL_CHARM, 7),
    new WeightedModifierType(modifierTypes.Z_EXCLUSIVE, 7),
    new WeightedModifierType(modifierTypes.UTILITY_UMBRELLA, 4),
    new WeightedModifierType(modifierTypes.ODD_INCENSE, 4),
    new WeightedModifierType(modifierTypes.STURDYSTONE_INCENSE, 4),
    new WeightedModifierType(modifierTypes.MAX_LURE, lureWeightFunc(30, 4)),
    new WeightedModifierType(modifierTypes.TEMP_WEATHER_ROCK, 4),
    new WeightedModifierType(modifierTypes.TEMP_TERRAIN_SEED, 4),
    new WeightedModifierType(modifierTypes.BIG_NUGGET, skipInLastClassicWaveOrDefault(12)),
    new WeightedModifierType(modifierTypes.PP_MAX, 3),
    new WeightedModifierType(modifierTypes.WEAKNESS_POLICY, 7),
    new WeightedModifierType(modifierTypes.MOODY_BAND, 4),
    new WeightedModifierType(modifierTypes.SIMPLE_BAND, 4),
    new WeightedModifierType(modifierTypes.AROMA_INCENSE, 4),
    new WeightedModifierType(modifierTypes.UNAWARE_BAND, 4),
    new WeightedModifierType(modifierTypes.COIN_CASE, skipInLastClassicWaveOrDefault(4)),

    new WeightedModifierType(modifierTypes.MIRROR_HERB, 5),
    new WeightedModifierType(modifierTypes.UNNERVE_INCENSE, 4),
    new WeightedModifierType(modifierTypes.DAMP_INCENSE, 4),
    new WeightedModifierType(modifierTypes.SILVER_INCENSE, 4),
    new WeightedModifierType(modifierTypes.LOADED_DICE, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
          MoveId.SPIKE_CANNON,
          MoveId.ICICLE_SPEAR,
          MoveId.BULLET_SEED,
          MoveId.PIN_MISSILE,
          MoveId.BARRAGE,
          MoveId.ROCK_BLAST,
          MoveId.FURY_ATTACK,
          MoveId.FURY_SWIPES,
          MoveId.WATER_SHURIKEN,
          MoveId.BONE_RUSH,
          MoveId.COMET_PUNCH,
        ].some(m => moveset.includes(m));

        return hasMoves; // 기술이 하나라도 있으면 true 반환
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.RECOIL_BELT, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasAbility = [AbilityId.ROCK_HEAD, AbilityId.RECKLESS, AbilityId.MAGIC_GUARD].some(a =>
          p.hasAbility(a, false, true),
        );

        const hasMoves = [
  MoveId.TAKE_DOWN,
  MoveId.DOUBLE_EDGE,
  MoveId.SUBMISSION,
  MoveId.STRUGGLE,
  MoveId.VOLT_TACKLE,
  MoveId.FLARE_BLITZ,
  MoveId.BRAVE_BIRD,
  MoveId.WOOD_HAMMER,
  MoveId.HEAD_SMASH,
  MoveId.WILD_CHARGE,
  MoveId.HEAD_CHARGE,
  MoveId.LIGHT_OF_RUIN,
  MoveId.WAVE_CRASH,
  MoveId.CHLOROBLAST,
  MoveId.SUPERCELL_SLAM,
  MoveId.JUMP_KICK,
  MoveId.STEEL_BEAM,
  MoveId.MIND_BLOWN,
  MoveId.HIGH_JUMP_KICK,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열에 하나라도 있으면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.STAT_STAGE_CHANGE_REVERSE_BAND, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.V_CREATE,
  MoveId.MAKE_IT_RAIN,
  MoveId.HEADLONG_RUSH,
  MoveId.LEAF_STORM,
  MoveId.PSYCHO_BOOST,
  MoveId.CLANGING_SCALES,
  MoveId.SCALE_SHOT,
  MoveId.ARMOR_CANNON,
  MoveId.ICE_HAMMER,
  MoveId.HAMMER_ARM,
  MoveId.SUPERPOWER,
  MoveId.OVERHEAT,
  MoveId.DRACO_METEOR,
  MoveId.HYPERSPACE_FURY,
  MoveId.CLOSE_COMBAT,
  MoveId.TERA_BLAST,
  MoveId.FLEUR_CANNON,
  MoveId.DRAGON_ASCENT,
  MoveId.SPIN_OUT,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.PUNCHING_GLOVE, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.POWER_UP_PUNCH,
  MoveId.FIRE_PUNCH,
  MoveId.ICE_PUNCH,
  MoveId.THUNDER_PUNCH,
  MoveId.DRAIN_PUNCH,
  MoveId.HEADLONG_RUSH,
  MoveId.MACH_PUNCH,
  MoveId.MEGA_PUNCH,
  MoveId.RAGE_FIST,
  MoveId.BULLET_PUNCH,
  MoveId.SHADOW_PUNCH,
  MoveId.SURGING_STRIKES,
  MoveId.SKY_UPPERCUT,
  MoveId.ICE_HAMMER,
  MoveId.HAMMER_ARM,
  MoveId.WICKED_BLOW,
  MoveId.COMET_PUNCH,
  MoveId.DIZZY_PUNCH,
  MoveId.JET_PUNCH,
  MoveId.METEOR_MASH,
  MoveId.DYNAMIC_PUNCH,
  MoveId.PLASMA_FISTS,
  MoveId.FOCUS_PUNCH,
  MoveId.DOUBLE_IRON_BASH,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.SHARPNESS_SWORD, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.CUT,
  MoveId.RAZOR_LEAF,
  MoveId.SLASH,
  MoveId.FURY_CUTTER,
  MoveId.AIR_CUTTER,
  MoveId.AERIAL_ACE,
  MoveId.LEAF_BLADE,
  MoveId.NIGHT_SLASH,
  MoveId.AIR_SLASH,
  MoveId.X_SCISSOR,
  MoveId.PSYCHO_CUT,
  MoveId.CROSS_POISON,
  MoveId.SACRED_SWORD,
  MoveId.RAZOR_SHELL,
  MoveId.SECRET_SWORD,
  MoveId.PRECIPICE_BLADES,
  MoveId.SOLAR_BLADE,
  MoveId.BEHEMOTH_BLADE,
  MoveId.STONE_AXE,
  MoveId.CEASELESS_EDGE,
  MoveId.POPULATION_BOMB,
  MoveId.KOWTOW_CLEAVE,
  MoveId.PSYBLADE,
  MoveId.BITTER_BLADE,
  MoveId.AQUA_CUTTER,
  MoveId.MIGHTY_CLEAVE,
  MoveId.TACHYON_CUTTER,
  MoveId.SPIN_ATTACK,
  MoveId.BLADE_STORM,
  MoveId.SHADOW_BLADE,
  MoveId.FEATHER_BLADE,
  MoveId.DRAGON_BLADE,
  MoveId.ANCIENT_SLASH,
  MoveId.GEO_BLADE,
  MoveId.METAL_BLADE,
  MoveId.ICICLE_SWORD,
  MoveId.MAGIC_BLADE,
  MoveId.LIGHTNING_SWORD,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_TEETH, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.BITE,
  MoveId.HYPER_FANG,
  MoveId.CRUNCH,
  MoveId.POISON_FANG,
  MoveId.THUNDER_FANG,
  MoveId.ICE_FANG,
  MoveId.FIRE_FANG,
  MoveId.PSYCHIC_FANGS,
  MoveId.JAW_LOCK,
  MoveId.FISHIOUS_REND,
  MoveId.GRASS_FANG,
  MoveId.SHADOW_FANG,
  MoveId.DRAGON_FANG,
  MoveId.BREAK_FANG,
  MoveId.MAGICAL_FANG,
  MoveId.FINCH_FANG,
  MoveId.SOLAR_BLADE,
  MoveId.SKY_FANG,
  MoveId.STONE_FANG,
  MoveId.STEEL_FANG,
  MoveId.GROUND_FANG,
  MoveId.FURY_BITE,
  MoveId.DOUBLE_BITE,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_HELMET, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.HEADBUTT,
  MoveId.SKULL_BASH,
  MoveId.ZEN_HEADBUTT,
  MoveId.IRON_HEAD,
  MoveId.HEAD_SMASH,
  MoveId.HEAD_CHARGE,
  MoveId.DRAGON_HEAD,
  MoveId.GROUND_HEAD,
  MoveId.MEGA_HEAD,
  MoveId.FIRE_HEAD,
  MoveId.MAGICAL_HEAD,
  MoveId.BEETLE_HEAD,
  MoveId.VENOM_HEAD,
  MoveId.WICKED_HEAD,
  MoveId.WAVE_HEAD,
  MoveId.COLD_HEAD,
  MoveId.BITTER_HEAD,
  MoveId.THUNDER_HEAD,
  MoveId.WOOD_HEAD,
  MoveId.FLYING_HEAD,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.HORN_HELMET, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.HORN_ATTACK,
  MoveId.FURY_ATTACK,
  MoveId.MEGAHORN,
  MoveId.HORN_LEECH,
  MoveId.SMART_STRIKE,
  MoveId.DRAGON_HORN,
  MoveId.BLAZING_HORN,
  MoveId.MIRACLE_HORN,
  MoveId.BRAVE_HORN,
  MoveId.ELECTRIC_HORN,
  MoveId.AQUAHORN,
  MoveId.GROUND_HORN,
  MoveId.CLIFF_HORN,
  MoveId.TOXIC_HORN,
  MoveId.ICICLE_HORN,
  MoveId.GALE_HORN,
  MoveId.PSYCHIC_HORN,
  MoveId.WICKED_HORN,
  MoveId.SPECTRAL_HORN,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_PROTECTOR, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.DOUBLE_KICK,
  MoveId.MEGA_KICK,
  MoveId.JUMP_KICK,
  MoveId.ROLLING_KICK,
  MoveId.LOW_KICK,
  MoveId.HIGH_JUMP_KICK,
  MoveId.TRIPLE_KICK,
  MoveId.BLAZE_KICK,
  MoveId.TROP_KICK,
  MoveId.THUNDEROUS_KICK,
  MoveId.AXE_KICK,
  MoveId.ZEN_KICK,
  MoveId.WICKED_KICK,
  MoveId.CLIFF_KICK,
  MoveId.IRON_KICK,
  MoveId.MAGICIAN_KICK,
  MoveId.SHADOW_KICK,
  MoveId.WAVE_KICK,
  MoveId.ICICLE_KICK,
  MoveId.ELECTRIC_KICK,
  MoveId.GROUND_KICK,
  MoveId.LONG_LEG_KICK,
  MoveId.POISON_KICK,
  MoveId.DRAGON_KICK,
  MoveId.GALE_KICK,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.SPIKE_SPEAR, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.FURY_ATTACK,
  MoveId.TWINEEDLE,
  MoveId.PIN_MISSILE,
  MoveId.POISON_JAB,
  MoveId.ZING_ZAP,
  MoveId.BRANCH_POKE,
  MoveId.THROAT_CHOP,
  MoveId.METEOR_ASSAULT,
  MoveId.FALSE_SURRENDER,
  MoveId.GLACIAL_LANCE,
  MoveId.ROCK_SPEAR,
  MoveId.ANCIENT_SPEAR,
  MoveId.OCEAN_SPEAR,
  MoveId.ZEN_JAB,
  MoveId.THUNDER_SPEAR,
  MoveId.SKY_LANCE,
  MoveId.DRAGON_LANCE,
  MoveId.BIO_LANCE,
  MoveId.BLAZE_LANCE,
  MoveId.SPECTER_LANCE,
  MoveId.IRON_LANCE,
  MoveId.ICICLE_SPEAR,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_FEATHER, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.WING_ATTACK,
  MoveId.STEEL_WING,
  MoveId.OBLIVION_WING,
  MoveId.DUAL_WINGBEAT,
  MoveId.ESPER_WING,
  MoveId.QUICK_WINGS,
  MoveId.ICE_WING,
  MoveId.THUNDER_WING,
  MoveId.INFERNO_WING,
  MoveId.DRAIN_WING,
  MoveId.BLAST_WING,
  MoveId.DRAGON_WING,
  MoveId.MEGA_WING,
  MoveId.SILVER_WING,
  MoveId.TROPICAL_WING,
  MoveId.WAVE_WING,
  MoveId.DARK_WING,
  MoveId.SHADOW_WING,
  MoveId.BRAVE_WING,
  MoveId.GROUND_WING,
  MoveId.POISON_WING,
  MoveId.FAIRY_WING,
  MoveId.ANCIENT_WING,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.MIGHTY_HAMMER, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.CRABHAMMER,
  MoveId.HAMMER_ARM,
  MoveId.WOOD_HAMMER,
  MoveId.ICE_HAMMER,
  MoveId.DRAGON_HAMMER,
  MoveId.GIGATON_HAMMER,
  MoveId.HARD_HAMMER,
  MoveId.MEGA_HAMMER,
  MoveId.ANCHOR_HAMMER,
  MoveId.DARKNESS_HAMMER,
  MoveId.SHADOW_HAMMER,
  MoveId.GROUND_HAMMER,
  MoveId.ANCIENT_HAMMER,
  MoveId.MAGMA_HAMMER,
  MoveId.THUNDER_HAMMER,
  MoveId.POISON_HAMMER,
  MoveId.MAGIC_HAMMER,
  MoveId.PSYCHO_HAMMER,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_CLAW, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.SCRATCH,
  MoveId.FURY_SWIPES,
  MoveId.METAL_CLAW,
  MoveId.CRUSH_CLAW,
  MoveId.DRAGON_CLAW,
  MoveId.SHADOW_CLAW,
  MoveId.HONE_CLAWS,
  MoveId.DIRE_CLAW,
  MoveId.POPULATION_BOMB,
  MoveId.FIRE_CLAW,
  MoveId.ICE_CLAW,
  MoveId.THUNDER_CLAW,
  MoveId.BRAVE_CLAW,
  MoveId.MAGIC_CLAW,
  MoveId.PSYCHIC_CLAW,
  MoveId.AQUA_CLAW,
  MoveId.GROUND_CLAW,
  MoveId.BEETLE_CLAW,
  MoveId.FLIGHT_CLAW,
  MoveId.MADNESS_CLAW,
  MoveId.WOOD_CLAW,
  MoveId.STONE_CLAW,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_PINCH, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.VISE_GRIP,
  MoveId.CLAMP,
  MoveId.CRABHAMMER,
  MoveId.CROSS_CHOP,
  MoveId.X_SCISSOR,
  MoveId.CROSS_POISON,
  MoveId.BLAZING_SCISSOR,
  MoveId.MEGA_SCISSOR,
  MoveId.ROCK_SCISSOR,
  MoveId.MUD_SCISSOR,
  MoveId.IRON_SCISSOR,
  MoveId.PSYCHIC_SCISSOR,
  MoveId.SPIRIT_SCISSOR,
  MoveId.SOUL_SCISSOR,
  MoveId.WICKED_SCISSOR,
  MoveId.DRAGON_SCISSOR,
  MoveId.TRAP_SCISSOR,
  MoveId.THUNDER_SCISSOR,
  MoveId.BEAK_CLAP,
  MoveId.COLD_SCISSOR,
  MoveId.FISHIOUS_REND,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.HARDEN_BEAK, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.FURY_ATTACK,
  MoveId.PECK,
  MoveId.DRILL_PECK,
  MoveId.POISON_JAB,
  MoveId.THROAT_CHOP,
  MoveId.BEAK_BLAST,
  MoveId.BOLT_BEAK,
  MoveId.ROCK_SPEAR,
  MoveId.ZEN_JAB,
  MoveId.BEAK_CLAP,
  MoveId.DRAGON_BEAK,
  MoveId.BUG_BEAK,
  MoveId.FIRE_BEAK,
  MoveId.AQUA_BEAK,
  MoveId.ICICLE_BEAK,
  MoveId.PSYCHIC_BEAK,
  MoveId.CHARMING_BEAK,
  MoveId.BITTER_BEAK,
  MoveId.WOOD_BEAK,
  MoveId.SAND_BEAK,
  MoveId.IRON_BEAK,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.FAST_BOOTS, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.ACCELEROCK,
  MoveId.BLAZING_TORQUE,
  MoveId.WICKED_TORQUE,
  MoveId.NOXIOUS_TORQUE,
  MoveId.COMBAT_TORQUE,
  MoveId.MAGICAL_TORQUE,
  MoveId.COLLISION_COURSE,
  MoveId.ELECTRO_DRIFT,
  MoveId.VOLT_SPEED,
  MoveId.BURNING_TORQUE,
  MoveId.FROST_ACCEL,
  MoveId.MACH_NEEDLE,
  MoveId.MAGIC_ACCEL,
  MoveId.GREEN_ACCEL,
  MoveId.MUD_SLIDE,
  MoveId.SONIC_RUSH,
  MoveId.HYDRO_ACCEL,
  MoveId.MACH_DRIVE,
  MoveId.MACH_BEETLE,
  MoveId.DRAKE_ACCEL,
  MoveId.GROUND_RUSH,
  MoveId.POWER_DRIFT,
  MoveId.STEEL_TORQUE,
  MoveId.PSYCHIC_TORQUE,
  MoveId.SPECTER_TORQUE,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.SPIN_TOP, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.ROLLING_KICK,
  MoveId.FIRE_SPIN,
  MoveId.RAPID_SPIN,
  MoveId.WHIRLPOOL,
  MoveId.SAND_TOMB,
  MoveId.LEAF_TORNADO,
  MoveId.COLLISION_COURSE,
  MoveId.ELECTRO_DRIFT,
  MoveId.DARKEST_LARIAT,
  MoveId.SPIN_OUT,
  MoveId.ICE_SPINNER,
  MoveId.MORTAL_SPIN,
  MoveId.SPIN_ATTACK,
  MoveId.BLADE_STORM,
  MoveId.WONDER_SPIN,
  MoveId.SHADOW_SPIN,
  MoveId.HARD_SPIN,
  MoveId.SPARKLING_SPIN,
  MoveId.DRAGON_SPIN,
  MoveId.SILK_SPIN,
  MoveId.BOLT_SPIN,
  MoveId.GALE_SPIN,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_DRILL, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.DRILL_PECK,
  MoveId.DRILL_RUN,
  MoveId.HYPER_DRILL,
  MoveId.DRAGON_DRILL,
  MoveId.IRON_DRILL,
  MoveId.SHELL_DRILL,
  MoveId.NEEDLE_DRILL,
  MoveId.DRILL_BREAK,
  MoveId.MAGMA_DRILL,
  MoveId.CHLORODRILL,
  MoveId.SHADOW_DRILL,
  MoveId.THUNDER_DRILL,
  MoveId.POWER_DRILL,
  MoveId.PSYCHIC_DRILL,
  MoveId.MAGICAL_DRILL,
  MoveId.DARK_DRILL,
  MoveId.POISON_DRILL,
  MoveId.ICICLE_DRILL,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_WHEEL, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.SUBMISSION,
  MoveId.FLAME_WHEEL,
  MoveId.ROLLOUT,
  MoveId.ICE_BALL,
  MoveId.STEAMROLLER,
  MoveId.AURA_WHEEL,
  MoveId.STEEL_ROLLER,
  MoveId.SPIN_OUT,
  MoveId.COLLISION_COURSE,
  MoveId.ELECTRO_DRIFT,
  MoveId.POWER_DRIFT,
  MoveId.OCEAN_WHEEL,
  MoveId.NATURAL_WHEEL,
  MoveId.SPECTER_WHEEL,
  MoveId.DRAGON_WHEEL,
  MoveId.PSYCHO_WHEEL,
  MoveId.MAGICAL_WHEEL,
  MoveId.DARK_WHEEL,
  MoveId.AERODRIFT,
  MoveId.VENOM_WHEEL,
  MoveId.GROUND_WHEEL,
  MoveId.BLAZING_TORQUE,
  MoveId.WICKED_TORQUE,
  MoveId.NOXIOUS_TORQUE,
  MoveId.COMBAT_TORQUE,
  MoveId.MAGICAL_TORQUE,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_ROPE, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.VINE_WHIP,
  MoveId.POWER_WHIP,
  MoveId.FIRE_LASH,
  MoveId.SHINY_SWIP,
  MoveId.MEGA_SWIP,
  MoveId.WAVE_WHIP,
  MoveId.VENOM_WHIP,
  MoveId.WICKED_WHIP,
  MoveId.MIGHTY_SWIP,
  MoveId.FROST_WHIP,
  MoveId.SOUL_WHIP,
  MoveId.THUNDER_WHIP,
  MoveId.HARD_WHIP,
  MoveId.DRAGON_WHIP,
  MoveId.MUD_WHIP,
  MoveId.GALE_WHIP,
  MoveId.BEETLE_WHIP,
  MoveId.PSYCHIC_WHIP,
  MoveId.METAL_WHIP,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_TAIL, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.TAIL_WHIP,
  MoveId.IRON_TAIL,
  MoveId.POISON_TAIL,
  MoveId.AQUA_TAIL,
  MoveId.DRAGON_TAIL,
  MoveId.SHED_TAIL,
  MoveId.ICE_TAIL,
  MoveId.SAVEGE_TAIL,
  MoveId.FAIRYTAIL,
  MoveId.MYSTIC_TAIL,
  MoveId.STING_TAIL,
  MoveId.MIGHTY_TAIL,
  MoveId.TAIL_ATTACK,
  MoveId.GROUND_TAIL,
  MoveId.MEGA_TAIL,
  MoveId.ELECTRO_TAIL,
  MoveId.SHADOW_TAIL,
  MoveId.AERO_TAIL,
  MoveId.WOOD_TAIL,
  MoveId.BLAZING_TAIL,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }), 
    new WeightedModifierType(modifierTypes.POWER_BOW, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.THOUSAND_ARROWS,
  MoveId.SPIRIT_SHACKLE,
  MoveId.DRAGON_DARTS,
  MoveId.TRIPLE_ARROWS,
  MoveId.POISON_ARROW,
  MoveId.MAGIC_ARROW,
  MoveId.LIGHTNING_ARROW,
  MoveId.BLAZE_ARROW,
  MoveId.GALE_ARROW,
  MoveId.MAGICAL_ARROW,
  MoveId.NIGHT_ARROW,
  MoveId.DARKNES_ARROW,
  MoveId.FOREST_ARROW,
  MoveId.IRON_ARROW,
  MoveId.ANCIENT_ARROW,
  MoveId.ARROW_SHOT,
  MoveId.NEEDLE_ARROW,
  MoveId.AQUA_ARROW,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_BEADS, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.EGG_BOMB,
  MoveId.BARRAGE,
  MoveId.SLUDGE_BOMB,
  MoveId.OCTAZOOKA,
  MoveId.ZAP_CANNON,
  MoveId.SHADOW_BALL,
  MoveId.MIST_BALL,
  MoveId.ICE_BALL,
  MoveId.WEATHER_BALL,
  MoveId.BULLET_SEED,
  MoveId.ROCK_BLAST,
  MoveId.GYRO_BALL,
  MoveId.AURA_SPHERE,
  MoveId.SEED_BOMB,
  MoveId.FOCUS_BLAST,
  MoveId.ENERGY_BALL,
  MoveId.MUD_BOMB,
  MoveId.ROCK_WRECKER,
  MoveId.MAGNET_BOMB,
  MoveId.ELECTRO_BALL,
  MoveId.ACID_SPRAY,
  MoveId.SEARING_SHOT,
  MoveId.POLLEN_PUFF,
  MoveId.BEAK_BLAST,
  MoveId.PYRO_BALL,
  MoveId.SYRUP_BOMB,
  MoveId.TURBO_BULLET,
  MoveId.AQUA_SHOT,
  MoveId.SONIC_CANNON,
  MoveId.SILVER_BULLET,
  MoveId.POISON_SHOT,
  MoveId.SHINY_SHOT,
  MoveId.SHADOW_BULLET,
  MoveId.BLANK_SHELL,
  MoveId.SAND_BULLET,
  MoveId.NATURE_SHOT,
  MoveId.SAND_BULLET,
  MoveId.MINERAL_SHOT,
  MoveId.MAGNET_SHOT,
  MoveId.POISON_BULLET,
  MoveId.MAGNET_BULLET,
  MoveId.DRAGON_BLAST,
  MoveId.SHINY_CANNON,
  MoveId.SHELL_CANNON,
  MoveId.FLAME_BARRAGE,
  MoveId.SNOW_BARRAGE,
  MoveId.GALE_CANNON,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_BOOMERANG, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.BONEMERANG,
  MoveId.BOOMERANG_ATTACK,
  MoveId.FLARE_BOOMERANG,
  MoveId.THUNDER_BOOMERANG,
  MoveId.WAVE_BOOMERANG,
  MoveId.GRASS_BOOMERANG,
  MoveId.SHADOW_BOOMERANG,
  MoveId.IRON_BOOMERANG,
  MoveId.FROST_BOOMERANG,
  MoveId.DRAGON_BOOMERANG,
  MoveId.MEGA_BOOMERANG,
  MoveId.BEETLE_BOOMERANG,
  MoveId.GALE_BOOMERANG,
  MoveId.POISON_BOOMERANG,
  MoveId.STONE_BOOMERANG,
  MoveId.DARK_BOOMERANG,
  MoveId.SHINE_BOOMERANG,
  MoveId.BONE_RUSH,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.THROW_GLOVE, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.ROCK_THROW,
  MoveId.SLUDGE,
  MoveId.BARRAGE,
  MoveId.MUD_SLAP,
  MoveId.VITAL_THROW,
  MoveId.FLING,
  MoveId.STORM_THROW,
  MoveId.CIRCLE_THROW,
  MoveId.GRAV_APPLE,
  MoveId.FLAME_BARRAGE,
  MoveId.SNOW_BARRAGE,
  MoveId.BUG_SLIDE,
  MoveId.LIGHTNING_THROW,
  MoveId.SPEAR_THROW,
  MoveId.CHARMING_THROW,
  MoveId.BITTER_THROW,
  MoveId.DEW_BLAST,
  MoveId.DRAGON_THROW, 
  MoveId.ZEN_THROW,
  MoveId.SMACK_DOWN,
  MoveId.ICICLE_CRASH,
  MoveId.ROCK_SLIDE,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.PULSE_ORB, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.WATER_PULSE,
  MoveId.AURA_SPHERE,
  MoveId.DARK_PULSE,
  MoveId.DRAGON_PULSE,
  MoveId.HEAL_PULSE,
  MoveId.ORIGIN_PULSE,
  MoveId.TERRAIN_PULSE,
  MoveId.THUNDER_PULSE,
  MoveId.BLAZE_PULSE,
  MoveId.ZEN_PULSE,
  MoveId.FAIRY_PULSE,
  MoveId.GRUDGE_PULSE,
  MoveId.COLD_PULSE,
  MoveId.BUG_PULSE,
  MoveId.MINERAL_PULSE,
  MoveId.GEO_PULSE,
  MoveId.MAGNET_PULSE,
  MoveId.GALE_PULSE, 
  MoveId.NATURAL_PULSE,
  MoveId.VENOM_PULSE,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.RAZORPOINTER, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.ICE_BEAM,
  MoveId.PSYBEAM,
  MoveId.BUBBLE_BEAM,
  MoveId.AURORA_BEAM,
  MoveId.HYPER_BEAM,
  MoveId.SOLAR_BEAM,
  MoveId.SIGNAL_BEAM,
  MoveId.CHARGE_BEAM,
  MoveId.PRISMATIC_LASER,
  MoveId.MOONGEIST_BEAM,
  MoveId.ETERNABEAM,
  MoveId.STEEL_BEAM,
  MoveId.METEOR_BEAM,
  MoveId.TWIN_BEAM,
  MoveId.ELECTRO_SHOT,
  MoveId.FICKLE_BEAM,
  MoveId.HEAT_BEAM,
  MoveId.DARK_BEAM, 
  MoveId.FOCUS_BEAM,
  MoveId.VORTEX_BEAM,
  MoveId.GEO_BEAM,
  MoveId.GENE_BEAM,
  MoveId.GYRO_BEAM, 
  MoveId.VENOM_BEAM,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_LANTERN, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.ICE_BEAM,
  MoveId.PSYBEAM,
  MoveId.BUBBLE_BEAM,
  MoveId.AURORA_BEAM,
  MoveId.HYPER_BEAM,
  MoveId.SOLAR_BEAM,
  MoveId.SIGNAL_BEAM,
  MoveId.CHARGE_BEAM,
  MoveId.PRISMATIC_LASER,
  MoveId.MOONGEIST_BEAM,
  MoveId.ETERNABEAM,
  MoveId.STEEL_BEAM,
  MoveId.METEOR_BEAM,
  MoveId.TWIN_BEAM,
  MoveId.ELECTRO_SHOT,
  MoveId.FICKLE_BEAM,
  MoveId.HEAT_BEAM,
  MoveId.DARK_BEAM, 
  MoveId.FOCUS_BEAM,
  MoveId.VORTEX_BEAM,
  MoveId.GEO_BEAM,
  MoveId.GENE_BEAM,
  MoveId.GYRO_BEAM, 
  MoveId.VENOM_BEAM,
  MoveId.DAZZLING_GLEAM,
  MoveId.SHINY_SHOT,
  MoveId.MIRACLE_SHINE,
  MoveId.FLASH_ATTCK,
  MoveId.LIGHTNING_SPLITE,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.HULAHULA_SKIRT, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
          MoveId.SWORDS_DANCE,
          MoveId.PETAL_DANCE,
          MoveId.FEATHER_DANCE,
          MoveId.TEETER_DANCE,
          MoveId.DRAGON_DANCE,
          MoveId.LUNAR_DANCE,
          MoveId.QUIVER_DANCE,
          MoveId.FIERY_DANCE,
          MoveId.REVELATION_DANCE,
          MoveId.CLANGOROUS_SOUL,
          MoveId.VICTORY_DANCE,
          MoveId.AQUA_STEP,
          MoveId.DRAGON_STEP,
          MoveId.ELECTRO_STEP,
          MoveId.AURORA_DANCE,
          MoveId.BERSERK_DANCE,
          MoveId.GROUND_DANCE,
          MoveId.ROCK_STEPS,
          MoveId.TECHNIC_DANCE,
          MoveId.TOXIC_DANCE,
          MoveId.FAIRY_DANCE,
          MoveId.MYSTICAL_DANCE,
          MoveId.BUG_DANCE,
          MoveId.GALE_DANCE,
          MoveId.SPECTER_DANCE,
          MoveId.DARKEST_DANCE,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.PUNK_MIKE, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
          MoveId.BOOMBURST,
          MoveId.METAL_SOUND,
          MoveId.SING,
          MoveId.ROUND,
          MoveId.PARTING_SHOT,
          MoveId.TORCH_SONG,
          MoveId.ALLURING_VOICE,
          MoveId.HOWL,
          MoveId.PERISH_SONG,
          MoveId.SPARKLING_ARIA,
          MoveId.SNARL,
          MoveId.BUG_BUZZ,
          MoveId.NOBLE_ROAR,
          MoveId.CONFIDE,
          MoveId.PSYCHIC_NOISE,
          MoveId.EERIE_SPELL,
          MoveId.UPROAR,
          MoveId.CLANGOROUS_SOUL,
          MoveId.CHATTER,
          MoveId.CLANGING_SCALES,
          MoveId.SCREECH,
          MoveId.ECHOED_VOICE,
          MoveId.RELIC_SONG,
          MoveId.OVERDRIVE,
          MoveId.ROAR,
          MoveId.GROWL,
          MoveId.DISARMING_VOICE,
          MoveId.SUPERSONIC,
          MoveId.HEAL_BELL,
          MoveId.SNORE,
          MoveId.GRASS_WHISTLE,
          MoveId.HYPER_VOICE,
          MoveId.MOUNTAIN_ECHO,
          MoveId.FOREST_ARIA,
          MoveId.CURSED_SONG,
          MoveId.BRAVE_SHOUTING,
          MoveId.CLIFF_SONG,
          MoveId.AURORA_ARIA,
          MoveId.METAL_SONG,
          MoveId.TOXIC_SONG,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.POWER_FAN, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
          MoveId.RAZOR_WIND,
          MoveId.GUST,
          MoveId.WHIRLWIND,
          MoveId.BLIZZARD,
          MoveId.AEROBLAST,
          MoveId.ICY_WIND,
          MoveId.TWISTER,
          MoveId.HEAT_WAVE,
          MoveId.AIR_CUTTER,
          MoveId.SILVER_WIND,
          MoveId.TAILWIND,
          MoveId.OMINOUS_WIND,
          MoveId.LEAF_TORNADO,
          MoveId.HURRICANE,
          MoveId.PETAL_BLIZZARD,
          MoveId.FAIRY_WIND,
          MoveId.SPRINGTIDE_STORM,
          MoveId.BLEAKWIND_STORM,
          MoveId.WILDBOLT_STORM,
          MoveId.SANDSEAR_STORM,
          MoveId.SAND_TORNADO,
          MoveId.STEELY_GALE,
          MoveId.WICKED_WIND,
          MoveId.DARKNESS_VORTEX,
          MoveId.VALOR_VOLTEX,
          MoveId.MINDSTORM,
          MoveId.RAINSTORM,
          MoveId.DUSTSTORM,
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.BIG_ROOT, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
  MoveId.ABSORB,
  MoveId.MEGA_DRAIN,
  MoveId.DREAM_EATER,
  MoveId.LEECH_LIFE,
  MoveId.GIGA_DRAIN,
  MoveId.DRAIN_PUNCH,
  MoveId.HORN_LEECH,
  MoveId.PARABOLIC_CHARGE,
  MoveId.DRAINING_KISS,
  MoveId.OBLIVION_WING,
  MoveId.STRENGTH_SAP,
  MoveId.BOUNCY_BUBBLE,
  MoveId.G_MAX_REPLENISH,
  MoveId.BITTER_BLADE,
  MoveId.MATCHA_GOTCHA,
  MoveId.GREEN_DRAIN,
  MoveId.DRAIN_WING,
  MoveId.VENOM_DRAIN,
  MoveId.HYDRO_DRAIN,
  MoveId.MIRACLE_HORN,
  MoveId.WICKED_HORN,
  MoveId.SPECTRAL_HORN,
  MoveId.POISON_WING,
  MoveId.PSYCHIC_SCISSOR,
  MoveId.POWER_DRILL,
  MoveId.FROST_WHIP,
  MoveId.OCEAN_WHEEL,
  MoveId.ENERGY_DRAIN,
  MoveId.COLORFUL_DRAIN,
  MoveId.CHARGE_DRAIN,
  MoveId.HEAT_DRAIN,
  MoveId.EON_DRAIN,
  MoveId.DRAIN_GEAR,
  MoveId.GEO_DRAIN,
  MoveId.QUAKE_DRAIN,
  MoveId.BLACK_DRAIN,
  MoveId.SOUL_DRAIN,
  MoveId.DRAIN_CLAW,
  MoveId.DRAGON_DRAIN,
  MoveId.COLD_DRAIN, 
  MoveId.MINERAL_DRAIN,
  MoveId.MANA_DRAIN,
  MoveId.POWER_DRAIN
].some(m => moveset.includes(m));

return hasMoves; // MoveId 배열 중 하나라도 존재하면 true
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.ENIGMA_INCENSE, 4),
    new WeightedModifierType(modifierTypes.SAFETY_GOGGLES, 4),
    new WeightedModifierType(modifierTypes.MUSCLE_BAND, 4),
    new WeightedModifierType(modifierTypes.CLEAR_AMULET, 4),
    new WeightedModifierType(modifierTypes.WISE_GLASSES, 4),
    new WeightedModifierType(modifierTypes.PROTECTIVE_PADS, 4),
    new WeightedModifierType(modifierTypes.ROCKY_HELMET, 4),
    new WeightedModifierType(modifierTypes.EXPERT_BELT, 4),
    new WeightedModifierType(modifierTypes.CRITICAL_BAND, 4),
    new WeightedModifierType(modifierTypes.TECHNIC_ANKLET, 4),
    new WeightedModifierType(modifierTypes.AMULET_COIN, skipInLastClassicWaveOrDefault(3)),
    new WeightedModifierType(modifierTypes.EVIOLITE, (party: Pokemon[]) => {
      const { gameMode, gameData } = globalScene;
      if (gameMode.isDaily || (!gameMode.isFreshStartChallenge() && gameData.isUnlocked(Unlockables.EVIOLITE))) {
        return party.some(p => {
          // Check if Pokemon's species (or fusion species, if applicable) can evolve or if they're G-Max'd
          if (
            !p.isMax() &&
            (p.getSpeciesForm(true).speciesId in pokemonEvolutions ||
              (p.isFusion() && p.getFusionSpeciesForm(true).speciesId in pokemonEvolutions))
          ) {
            // Check if Pokemon is already holding an Eviolite
            return !p.getHeldItems().some(i => i.type.id === "EVIOLITE");
          }
          return false;
        })
          ? 10
          : 0;
      }
      return 0;
    }),
    new WeightedModifierType(modifierTypes.EVOLUTION_INCENSE, (party: Pokemon[]) => {
      const { gameMode, gameData } = globalScene;

      if (
        gameMode.isDaily ||
        (!gameMode.isFreshStartChallenge() && gameData.isUnlocked(Unlockables.EVOLUTION_INCENSE))
      ) {
        return party.some(p => {
          const isUnevolved =
            p.getSpeciesForm(true).speciesId in pokemonEvolutions ||
            (p.isFusion() && p.getFusionSpeciesForm(true).speciesId in pokemonEvolutions);

          const alreadyHasItem = p.getHeldItems().some(i => i.type.id === "EVOLUTION_INCENSE");

          return !p.isMax() && isUnevolved && !alreadyHasItem;
        })
          ? 10
          : 0;
      }

      return 0;
    }),
    new WeightedModifierType(
      modifierTypes.FREEZE_ORB,
      (party: Pokemon[]) => {
        return party.some(p => {
          const isHoldingOrb = p
            .getHeldItems()
            .some(i => i.type.id === "FLAME_ORB" || i.type.id === "TOXIC_ORB" || i.type.id === "FREEZE_ORB");

          if (!isHoldingOrb) {
            const moveset = p
              .getMoveset(true)
              .filter(m => m != null)
              .map(m => m.moveId);
            const canSetStatus = p.canSetStatus(StatusEffect.FROSTBITE, true, true, null, true);

            // Moves that take advantage of obtaining the actual status effect
            const hasStatusMoves = [MoveId.FACADE, MoveId.PSYCHO_SHIFT, MoveId.ALL_OUT_POWER].some(m =>
              moveset.includes(m),
            );
            // Moves that take advantage of being able to give the target a status orb
            // TODO: Take moves (Trick, Fling, Switcheroo) from comment when they are implemented
            const hasItemMoves = [
              MoveId.FLING
            ].some(m => moveset.includes(m));

            if (canSetStatus) {
              // Abilities that take advantage of obtaining the actual status effect, separated based on specificity to the orb
              const hasGeneralAbility = [
                AbilityId.QUICK_FEET,
                AbilityId.GUTS,
                AbilityId.MARVEL_SCALE,
                AbilityId.MAGIC_GUARD,
              ].some(a => p.hasAbility(a, false, true));
              const hasSpecificAbility = [AbilityId.FLARE_BOOST].some(a => p.hasAbility(a, false, true));
              const hasOppositeAbility = [AbilityId.TOXIC_BOOST, AbilityId.POISON_HEAL].some(a =>
                p.hasAbility(a, false, true),
              );

              return hasSpecificAbility || (hasGeneralAbility && !hasOppositeAbility) || hasStatusMoves;
            }
            return hasItemMoves;
          }

          return false;
        })
          ? 10
          : 0;
      },
      10,
    ),
    new WeightedModifierType(
      modifierTypes.TOXIC_ORB,
      (party: Pokemon[]) => {
        return party.some(p => {
          const isHoldingOrb = p.getHeldItems().some(i => i.type.id === "FLAME_ORB" || i.type.id === "TOXIC_ORB");

          if (!isHoldingOrb) {
            const moveset = p
              .getMoveset(true)
              .filter(m => m != null)
              .map(m => m.moveId);
            const canSetStatus = p.canSetStatus(StatusEffect.TOXIC, true, true, null, true);

            // Moves that take advantage of obtaining the actual status effect
            const hasStatusMoves = [MoveId.FACADE, MoveId.PSYCHO_SHIFT].some(m => moveset.includes(m));
            // Moves that take advantage of being able to give the target a status orb
            // TODO: Take moves (Trick, Fling, Switcheroo) from comment when they are implemented
            const hasItemMoves = [
              MoveId.FLING
            ].some(m => moveset.includes(m));

            if (canSetStatus) {
              // Abilities that take advantage of obtaining the actual status effect, separated based on specificity to the orb
              const hasGeneralAbility = [
                AbilityId.QUICK_FEET,
                AbilityId.GUTS,
                AbilityId.MARVEL_SCALE,
                AbilityId.MAGIC_GUARD,
              ].some(a => p.hasAbility(a, false, true));
              const hasSpecificAbility = [AbilityId.TOXIC_BOOST, AbilityId.POISON_HEAL].some(a =>
                p.hasAbility(a, false, true),
              );
              const hasOppositeAbility = [AbilityId.FLARE_BOOST].some(a => p.hasAbility(a, false, true));

              return hasSpecificAbility || (hasGeneralAbility && !hasOppositeAbility) || hasStatusMoves;
            }
            return hasItemMoves;
          }

          return false;
        })
          ? 10
          : 0;
      },
      10,
    ),
    new WeightedModifierType(modifierTypes.MYSTIC_SCALE, 4),
    new WeightedModifierType(modifierTypes.REVIVER_SEED, 4),
    new WeightedModifierType(modifierTypes.LIGHT_CLAY, (party: Pokemon[]) => {
      return party.some(p => {
        const moveset = p.getMoveset(true).map(m => m.moveId);

        const hasMoves = [
          MoveId.REFLECT,
          MoveId.LIGHT_SCREEN,
          MoveId.BADDY_BAD,
          MoveId.GLITZY_GLOW,
          MoveId.AURORA_VEIL,
        ].some(m => moveset.includes(m));

        return hasMoves; // 기술이 하나라도 있으면 true 반환
      })
        ? 4
        : 0;
    }),
    new WeightedModifierType(modifierTypes.MAX_LURE, lureWeightFunc(30, 4)),
    new WeightedModifierType(modifierTypes.BIG_NUGGET, skipInLastClassicWaveOrDefault(12)),
    new WeightedModifierType(modifierTypes.PP_MAX, 3),
    new WeightedModifierType(modifierTypes.MINT, 4),
    new WeightedModifierType(modifierTypes.AMULET_COIN, skipInLastClassicWaveOrDefault(3)),
    new WeightedModifierType(modifierTypes.EVIOLITE, (party: Pokemon[]) => {
      const { gameMode, gameData } = globalScene;
      if (gameMode.isDaily || (!gameMode.isFreshStartChallenge() && gameData.isUnlocked(Unlockables.EVIOLITE))) {
        return party.some(p => {
          // Check if Pokemon's species (or fusion species, if applicable) can evolve or if they're G-Max'd
          if (
            !p.isMax() &&
            (p.getSpeciesForm(true).speciesId in pokemonEvolutions ||
              (p.isFusion() && p.getFusionSpeciesForm(true).speciesId in pokemonEvolutions))
          ) {
            // Check if Pokemon is already holding an Eviolite
            return !p.getHeldItems().some(i => i.type.id === "EVIOLITE");
          }
          return false;
        })
          ? 10
          : 0;
      }
      return 0;
    }),
    new WeightedModifierType(
      modifierTypes.LEEK,
      (party: Pokemon[]) => {
        const checkedSpecies = [SpeciesId.FARFETCHD, SpeciesId.GALAR_FARFETCHD, SpeciesId.SIRFETCHD];
        // If a party member doesn't already have a Leek and is one of the relevant species, Leek can appear
        return party.some(
          p =>
            !p.getHeldItems().some(i => i instanceof SpeciesCritBoosterModifier) &&
            (checkedSpecies.includes(p.getSpeciesForm(true).speciesId) ||
              (p.isFusion() && checkedSpecies.includes(p.getFusionSpeciesForm(true).speciesId))),
        )
          ? 12
          : 0;
      },
      12,
    ),   
    new WeightedModifierType(
      modifierTypes.FLAME_ORB,
      (party: Pokemon[]) => {
        return party.some(p => {
          const isHoldingOrb = p.getHeldItems().some(i => i.type.id === "FLAME_ORB" || i.type.id === "TOXIC_ORB");

          if (!isHoldingOrb) {
            const moveset = p
              .getMoveset(true)
              .filter(m => m != null)
              .map(m => m.moveId);
            const canSetStatus = p.canSetStatus(StatusEffect.BURN, true, true, null, true);

            // Moves that take advantage of obtaining the actual status effect
            const hasStatusMoves = [MoveId.FACADE, MoveId.PSYCHO_SHIFT].some(m => moveset.includes(m));
            // Moves that take advantage of being able to give the target a status orb
            // TODO: Take moves (Trick, Fling, Switcheroo) from comment when they are implemented
            const hasItemMoves = [
              MoveId.FLING
            ].some(m => moveset.includes(m));

            if (canSetStatus) {
              // Abilities that take advantage of obtaining the actual status effect, separated based on specificity to the orb
              const hasGeneralAbility = [
                AbilityId.QUICK_FEET,
                AbilityId.GUTS,
                AbilityId.MARVEL_SCALE,
                AbilityId.MAGIC_GUARD,
              ].some(a => p.hasAbility(a, false, true));
              const hasSpecificAbility = [AbilityId.FLARE_BOOST].some(a => p.hasAbility(a, false, true));
              const hasOppositeAbility = [AbilityId.TOXIC_BOOST, AbilityId.POISON_HEAL].some(a =>
                p.hasAbility(a, false, true),
              );

              return hasSpecificAbility || (hasGeneralAbility && !hasOppositeAbility) || hasStatusMoves;
            }
            return hasItemMoves;
          }

          return false;
        })
          ? 10
          : 0;
      },
      10,
    ),
    new WeightedModifierType(
      modifierTypes.MYSTICAL_ROCK,
      (party: Pokemon[]) => {
        return party.some(p => {
          let isHoldingMax = false;
          for (const i of p.getHeldItems()) {
            if (i.type.id === "MYSTICAL_ROCK") {
              isHoldingMax = i.getStackCount() === i.getMaxStackCount();
              break;
            }
          }

          if (!isHoldingMax) {
            const moveset = p.getMoveset(true).map(m => m.moveId);

            const hasAbility = [
              AbilityId.DROUGHT,
              AbilityId.ORICHALCUM_PULSE,
              AbilityId.DRIZZLE,
              AbilityId.SAND_STREAM,
              AbilityId.SAND_SPIT,
              AbilityId.SNOW_WARNING,
              AbilityId.ELECTRIC_SURGE,
              AbilityId.HADRON_ENGINE,
              AbilityId.PSYCHIC_SURGE,
              AbilityId.GRASSY_SURGE,
              AbilityId.SEED_SOWER,
              AbilityId.MISTY_SURGE,
              AbilityId.AQUA_HEART,
              AbilityId.BIO_PULSE,
              AbilityId.TUNDRA_SPIRIT,
              AbilityId.NATURAL_SOUL,
              AbilityId.DESERT_MIRACLE,
              AbilityId.MIRACLE_FOG,
            ].some(a => p.hasAbility(a, false, true));

            const hasMoves = [
              MoveId.SUNNY_DAY,
              MoveId.RAIN_DANCE,
              MoveId.SANDSTORM,
              MoveId.SNOWSCAPE,
              MoveId.HAIL,
              MoveId.CHILLY_RECEPTION,
              MoveId.ELECTRIC_TERRAIN,
              MoveId.PSYCHIC_TERRAIN,
              MoveId.GRASSY_TERRAIN,
              MoveId.MISTY_TERRAIN,
            ].some(m => moveset.includes(m));

            return hasAbility || hasMoves;
          }
          return false;
        })
          ? 10
          : 0;
      },
      10,
    ),
    new WeightedModifierType(modifierTypes.REVIVER_SEED, 4),
    new WeightedModifierType(modifierTypes.CANDY_JAR, skipInLastClassicWaveOrDefault(5)),
    new WeightedModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, 10),
    new WeightedModifierType(modifierTypes.TM_ULTRA, 11),
    new WeightedModifierType(modifierTypes.RARER_CANDY, 4),
    new WeightedModifierType(modifierTypes.GOLDEN_PUNCH, skipInLastClassicWaveOrDefault(2)),
    new WeightedModifierType(modifierTypes.IV_SCANNER, skipInLastClassicWaveOrDefault(4)),
    new WeightedModifierType(modifierTypes.EXP_CHARM, skipInLastClassicWaveOrDefault(8)),
    new WeightedModifierType(modifierTypes.EXP_SHARE, skipInLastClassicWaveOrDefault(10)),
    new WeightedModifierType(
      modifierTypes.TERA_ORB,
      () =>
        !globalScene.gameMode.isClassic
          ? Math.min(Math.max(Math.floor(globalScene.currentBattle.waveIndex / 50) * 2, 1), 4)
          : 0,
      4,
    ),
    new WeightedModifierType(modifierTypes.QUICK_CLAW, 3),
    new WeightedModifierType(modifierTypes.WIDE_LENS, 7),
    new WeightedModifierType(modifierTypes.POWER_SHELL, 4),
  ];

arr.forEach(m => m.setTier(ModifierTier.ULTRA));
modifierPool[ModifierTier.ULTRA] = arr;
}

function initRogueModifierPool() {
  const arr = [
    new WeightedModifierType(modifierTypes.ROGUE_BALL, () => (hasMaximumBalls(PokeballType.ROGUE_BALL) ? 0 : 16), 16),
    new WeightedModifierType(
  modifierTypes.BOOSTER_ENERGY,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.PROTOSYNTHESIS, AbilityId.QUARK_DRIVE, AbilityId.PLUVIAFLUX, AbilityId.NEURO_CHARGE, AbilityId.CRYOSYNTHESIS, AbilityId.PHYTONCIDE, AbilityId.PSAMMOSYNTHESIS, AbilityId.UNSEEN_FORCE]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 10
      : 0;
  },
  10,
),
    new WeightedModifierType(
  modifierTypes.ULTRA_ENERGY,
  (party: Pokemon[]) => {
    return party.some(p =>
      [AbilityId.BEAST_BOOST]
        .some(a => p.hasAbility(a, false, true))
    )
      ? 10
      : 0;
  },
  10,
),
    new WeightedModifierType(modifierTypes.RELIC_GOLD, skipInLastClassicWaveOrDefault(2)),
    new WeightedModifierType(modifierTypes.LEFTOVERS, 3),
    new WeightedModifierType(modifierTypes.BOTTLE_CAP, 4),
    new WeightedModifierType(modifierTypes.BRIGHT_POWDER, 4),
    new WeightedModifierType(modifierTypes.ADAPTABILITY_BAND, 4),
    new WeightedModifierType(modifierTypes.POWER_UP_WEIGHT, 4),
    new WeightedModifierType(modifierTypes.SHEER_FORCE_BAND, 4),
    new WeightedModifierType(modifierTypes.LIFE_ORB, 4),
    new WeightedModifierType(modifierTypes.SHELL_BELL, 3),
    new WeightedModifierType(modifierTypes.ABILITY_PATCH, 4),
    new WeightedModifierType(modifierTypes.SCRAPPY_BELT, 4),
    new WeightedModifierType(modifierTypes.SMOKE_BALL, 4),
    new WeightedModifierType(modifierTypes.FOCUS_SASH, 4),
    new WeightedModifierType(modifierTypes.SHELL_BELL, 3),
    new WeightedModifierType(modifierTypes.COVERT_CLOAK, 4),
    new WeightedModifierType(modifierTypes.COLORFUL_LENS, 4),
    new WeightedModifierType(modifierTypes.CHOICE_SCARF, 3),
    new WeightedModifierType(modifierTypes.CHOICE_SPECS, 3),
    new WeightedModifierType(modifierTypes.CHOICE_BAND, 3),
    new WeightedModifierType(modifierTypes.ASSAULT_VEST, 3),
    new WeightedModifierType(modifierTypes.METRONOME, 3),
    new WeightedModifierType(modifierTypes.BERRY_POUCH, 4),
    new WeightedModifierType(modifierTypes.STRANGE_BOX, 4),
    new WeightedModifierType(modifierTypes.GRIP_CLAW, 5),
    new WeightedModifierType(modifierTypes.SCOPE_LENS, 4),
    new WeightedModifierType(modifierTypes.BATON, 2),
    new WeightedModifierType(modifierTypes.TREASURE_POUCH, 4),
    new WeightedModifierType(modifierTypes.MIND_ORB, 7),
    new WeightedModifierType(modifierTypes.CATCHING_CHARM, () => (!globalScene.gameMode.isClassic ? 4 : 0), 4),
    new WeightedModifierType(modifierTypes.ABILITY_CHARM, skipInClassicAfterWave(189, 6)),
    new WeightedModifierType(modifierTypes.FOCUS_BAND, 5),
    new WeightedModifierType(modifierTypes.KINGS_ROCK, 3),
    new WeightedModifierType(modifierTypes.LOCK_CAPSULE, () => (globalScene.gameMode.isClassic ? 0 : 3)),
    new WeightedModifierType(modifierTypes.SUPER_EXP_CHARM, skipInLastClassicWaveOrDefault(8)),
    new WeightedModifierType(
      modifierTypes.VOUCHER_PLUS,
      (_party: Pokemon[], rerollCount: number) =>
        !globalScene.gameMode.isDaily ? Math.max(3 - rerollCount * 1, 0) : 0,
      6,
    ),
  ];

arr.forEach(m => m.setTier(ModifierTier.ROGUE));
modifierPool[ModifierTier.ROGUE] = arr;
}

/**
 * Initialize the Master modifier pool
 */
function initMasterModifierPool() {
  const arr = [
    new WeightedModifierType(modifierTypes.MASTER_BALL, () => (hasMaximumBalls(PokeballType.MASTER_BALL) ? 0 : 24), 24),
    new WeightedModifierType(modifierTypes.GOLD_BOTTLE_CAP, 10),
    new WeightedModifierType(modifierTypes.ABILITY_SHIELD, 14),
    new WeightedModifierType(modifierTypes.SHINY_CHARM, 14),
    new WeightedModifierType(modifierTypes.HEALING_CHARM, 18),
    new WeightedModifierType(modifierTypes.MULTI_LENS, 18),
    new WeightedModifierType(modifierTypes.GOLDEN_INCENSE, 14),
    new WeightedModifierType(modifierTypes.MOLD_BREAKER_BRACER, 14),
    new WeightedModifierType(modifierTypes.CHAMPION_BELT, 10),
    new WeightedModifierType(modifierTypes.SCHOLAR_TOME, 10),
    new WeightedModifierType(
      modifierTypes.VOUCHER_PREMIUM,
      (_party: Pokemon[], rerollCount: integer) =>
        !globalScene.gameMode.isDaily && !globalScene.gameMode.isSplicedOnly ? Math.max(5 - rerollCount * 2, 0) : 0,
      5,
    ),
    new WeightedModifierType(
      modifierTypes.DNA_SPLICERS,
      (party: Pokemon[]) =>
        !(globalScene.gameMode.isClassic && timedEventManager.areFusionsBoosted()) &&
        !globalScene.gameMode.isSplicedOnly &&
        party.filter(p => !p.fusionSpecies).length > 1
          ? 24
          : 0,
      24,
    ),
    new WeightedModifierType(
      modifierTypes.MINI_BLACK_HOLE,
      () =>
        globalScene.gameMode.isDaily ||
        (!globalScene.gameMode.isFreshStartChallenge() && globalScene.gameData.isUnlocked(Unlockables.MINI_BLACK_HOLE))
          ? 1
          : 0,
      1,
    ),
  ];

arr.forEach(m => m.setTier(ModifierTier.MASTER));
modifierPool[ModifierTier.MASTER] = arr;
}

function initTrainerModifierPool() {
  trainerModifierPool[ModifierTier.COMMON] = [
    new WeightedModifierType(modifierTypes.BERRY, 8),
    new WeightedModifierType(modifierTypes.BASE_STAT_BOOSTER, 3),
  ].map(m => {
    m.setTier(ModifierTier.COMMON);
    return m;
  });
  trainerModifierPool[ModifierTier.GREAT] = [new WeightedModifierType(modifierTypes.BASE_STAT_BOOSTER, 3)].map(m => {
    m.setTier(ModifierTier.GREAT);
    return m;
  });
  trainerModifierPool[ModifierTier.ULTRA] = [
    new WeightedModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, 10),
    new WeightedModifierType(modifierTypes.WHITE_HERB, 0),
  ].map(m => {
    m.setTier(ModifierTier.ULTRA);
    return m;
  });
  trainerModifierPool[ModifierTier.ROGUE] = [
    new WeightedModifierType(modifierTypes.FOCUS_BAND, 2),
    new WeightedModifierType(modifierTypes.LUCKY_EGG, 4),
    new WeightedModifierType(modifierTypes.QUICK_CLAW, 1),
    new WeightedModifierType(modifierTypes.GRIP_CLAW, 1),
    new WeightedModifierType(modifierTypes.WIDE_LENS, 1),
  ].map(m => {
    m.setTier(ModifierTier.ROGUE);
    return m;
  });
  trainerModifierPool[ModifierTier.MASTER] = [
    new WeightedModifierType(modifierTypes.KINGS_ROCK, 1),
    new WeightedModifierType(modifierTypes.LEFTOVERS, 1),
    new WeightedModifierType(modifierTypes.SHELL_BELL, 1),
    new WeightedModifierType(modifierTypes.SCOPE_LENS, 1),
  ].map(m => {
    m.setTier(ModifierTier.MASTER);
    return m;
  });
}

/**
 * Initialize the enemy buff modifier pool
 */
function initEnemyBuffModifierPool() {
  enemyBuffModifierPool[ModifierTier.COMMON] = [
    new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_BOOSTER, 9),
    new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_REDUCTION, 9),
    new WeightedModifierType(modifierTypes.ENEMY_ATTACK_POISON_CHANCE, 3),
    new WeightedModifierType(modifierTypes.ENEMY_ATTACK_PARALYZE_CHANCE, 3),
    new WeightedModifierType(modifierTypes.ENEMY_ATTACK_BURN_CHANCE, 3),
    new WeightedModifierType(modifierTypes.ENEMY_STATUS_EFFECT_HEAL_CHANCE, 9),
    new WeightedModifierType(modifierTypes.ENEMY_ENDURE_CHANCE, 4),
    new WeightedModifierType(modifierTypes.ENEMY_FUSED_CHANCE, 1),
  ].map(m => {
    m.setTier(ModifierTier.COMMON);
    return m;
  });
  enemyBuffModifierPool[ModifierTier.GREAT] = [
    new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_BOOSTER, 5),
    new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_REDUCTION, 5),
    new WeightedModifierType(modifierTypes.ENEMY_STATUS_EFFECT_HEAL_CHANCE, 5),
    new WeightedModifierType(modifierTypes.ENEMY_ENDURE_CHANCE, 5),
    new WeightedModifierType(modifierTypes.ENEMY_FUSED_CHANCE, 1),
  ].map(m => {
    m.setTier(ModifierTier.GREAT);
    return m;
  });
  enemyBuffModifierPool[ModifierTier.ULTRA] = [
    new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_BOOSTER, 10),
    new WeightedModifierType(modifierTypes.ENEMY_DAMAGE_REDUCTION, 10),
    new WeightedModifierType(modifierTypes.ENEMY_HEAL, 10),
    new WeightedModifierType(modifierTypes.ENEMY_STATUS_EFFECT_HEAL_CHANCE, 10),
    new WeightedModifierType(modifierTypes.ENEMY_ENDURE_CHANCE, 10),
    new WeightedModifierType(modifierTypes.ENEMY_FUSED_CHANCE, 5),
  ].map(m => {
    m.setTier(ModifierTier.ULTRA);
    return m;
  });
  enemyBuffModifierPool[ModifierTier.ROGUE] = [].map((m: WeightedModifierType) => {
    m.setTier(ModifierTier.ROGUE);
    return m;
  });
  enemyBuffModifierPool[ModifierTier.MASTER] = [].map((m: WeightedModifierType) => {
    m.setTier(ModifierTier.MASTER);
    return m;
  });
}

/**
 * Initialize the daily starter modifier pool
 */
function initDailyStarterModifierPool() {
  dailyStarterModifierPool[ModifierTier.COMMON] = [
    new WeightedModifierType(modifierTypes.BASE_STAT_BOOSTER, 1),
    new WeightedModifierType(modifierTypes.BERRY, 3),
  ].map(m => {
    m.setTier(ModifierTier.COMMON);
    return m;
  });
  dailyStarterModifierPool[ModifierTier.GREAT] = [new WeightedModifierType(modifierTypes.ATTACK_TYPE_BOOSTER, 5)].map(
    m => {
      m.setTier(ModifierTier.GREAT);
      return m;
    },
  );
  dailyStarterModifierPool[ModifierTier.ULTRA] = [
    new WeightedModifierType(modifierTypes.REVIVER_SEED, 4),
    new WeightedModifierType(modifierTypes.SOOTHE_BELL, 1),
    new WeightedModifierType(modifierTypes.MIND_ORB, 1),
    new WeightedModifierType(modifierTypes.GOLDEN_PUNCH, 1),
  ].map(m => {
    m.setTier(ModifierTier.ULTRA);
    return m;
  });
  dailyStarterModifierPool[ModifierTier.ROGUE] = [
    new WeightedModifierType(modifierTypes.GRIP_CLAW, 5),
    new WeightedModifierType(modifierTypes.BATON, 2),
    new WeightedModifierType(modifierTypes.FOCUS_BAND, 5),
    new WeightedModifierType(modifierTypes.QUICK_CLAW, 3),
    new WeightedModifierType(modifierTypes.KINGS_ROCK, 3),
  ].map(m => {
    m.setTier(ModifierTier.ROGUE);
    return m;
  });
  dailyStarterModifierPool[ModifierTier.MASTER] = [
    new WeightedModifierType(modifierTypes.LEFTOVERS, 1),
    new WeightedModifierType(modifierTypes.SHELL_BELL, 1),
  ].map(m => {
    m.setTier(ModifierTier.MASTER);
    return m;
  });
}

/**
 * Initialize {@linkcode modifierPool} with the initial set of modifier types.
 * {@linkcode initModifierTypes} MUST be called before this function.
 */
export function initModifierPools() {
  // The modifier pools the player chooses from during modifier selection
  initCommonModifierPool();
  initGreatModifierPool();
  initUltraModifierPool();
  initRogueModifierPool();
  initMasterModifierPool();

  // Modifier pools for specific scenarios
  initWildModifierPool();
  initTrainerModifierPool();
  initEnemyBuffModifierPool();
  initDailyStarterModifierPool();
}

/**
 * High order function that returns a WeightedModifierTypeWeightFunc that will only be applied on
 * classic and skip an ModifierType if current wave is greater or equal to the one passed down
 * @param wave - Wave where we should stop showing the modifier
 * @param defaultWeight - ModifierType default weight
 * @returns A WeightedModifierTypeWeightFunc
 */
function skipInClassicAfterWave(wave: number, defaultWeight: number): WeightedModifierTypeWeightFunc {
  return () => {
    const gameMode = globalScene.gameMode;
    const currentWave = globalScene.currentBattle.waveIndex;
    return gameMode.isClassic && currentWave >= wave ? 0 : defaultWeight;
  };
}

/**
 * High order function that returns a WeightedModifierTypeWeightFunc that will only be applied on
 * classic and it will skip a ModifierType if it is the last wave pull.
 * @param defaultWeight ModifierType default weight
 * @returns A WeightedModifierTypeWeightFunc
 */
function skipInLastClassicWaveOrDefault(defaultWeight: number): WeightedModifierTypeWeightFunc {
  return skipInClassicAfterWave(199, defaultWeight);
}

/**
 * High order function that returns a WeightedModifierTypeWeightFunc to ensure Lures don't spawn on Classic 199
 * or if the lure still has over 60% of its duration left
 * @param maxBattles The max battles the lure type in question lasts. 10 for green, 15 for Super, 30 for Max
 * @param weight The desired weight for the lure when it does spawn
 * @returns A WeightedModifierTypeWeightFunc
 */
function lureWeightFunc(maxBattles: number, weight: number): WeightedModifierTypeWeightFunc {
  return () => {
    const lures = globalScene.getModifiers(DoubleBattleChanceBoosterModifier);
    return !(globalScene.gameMode.isClassic && globalScene.currentBattle.waveIndex === 199) &&
      (lures.length === 0 ||
        lures.filter(m => m.getMaxBattles() === maxBattles && m.getBattleCount() >= maxBattles * 0.6).length === 0)
      ? weight
      : 0;
  };
}

/**
 * Used to check if the player has max of a given ball type in Classic
 * @param ballType The {@linkcode PokeballType} being checked
 * @returns boolean: true if the player has the maximum of a given ball type
 */
function hasMaximumBalls(ballType: PokeballType): boolean {
  return globalScene.gameMode.isClassic && globalScene.pokeballCounts[ballType] >= MAX_PER_TYPE_POKEBALLS;
}
