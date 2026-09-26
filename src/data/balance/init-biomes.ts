/*
 * SPDX-FileCopyrightText: 2024-2025 Pagefault Games
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { biomeLinks, biomePokemonPools, biomeTrainerPools } from "#balance/biomes";
import { pokemonEvolutions, type SpeciesFormEvolution } from "#balance/pokemon-evolutions";
import { biomeDepths, catchableSpecies, uncatchableSpecies } from "#data/data-lists";
import { BiomeId } from "#enums/biome-id";
import { BiomePoolTier } from "#enums/biome-pool-tier";
import { EvoLevelThresholdKind } from "#enums/evo-level-threshold-kind";
import { PokemonType } from "#enums/pokemon-type";
import { SpeciesId } from "#enums/species-id";
import { TimeOfDay } from "#enums/time-of-day";
import { TrainerType } from "#enums/trainer-type";
import type { Mutable } from "#types/type-helpers";
import { randSeedInt } from "#utils/common";
import { getEnumValues } from "#utils/enums";

export function initBiomes() {
  const pokemonBiomes = [
    [ SpeciesId.BULBASAUR, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.GRASS, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.IVYSAUR, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.GRASS, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.VENUSAUR, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.GRASS, BiomePoolTier.RARE ],
      [ BiomeId.GRASS, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.CHARMANDER, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.CHARMELEON, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.CHARIZARD, PokemonType.FIRE, PokemonType.FLYING, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SQUIRTLE, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.WARTORTLE, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.BLASTOISE, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.CATERPIE, PokemonType.BUG, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.METAPOD, PokemonType.BUG, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.BUTTERFREE, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.WEEDLE, PokemonType.BUG, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ], 
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.KAKUNA, PokemonType.BUG, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.BEEDRILL, PokemonType.BUG, PokemonType.POISON, [
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PIDGEY, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.PIDGEOTTO, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.PIDGEOT, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ], 
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.RATTATA, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON ],
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.RATICATE, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON ],
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SPEAROW, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ], 
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.FEAROW, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.EKANS, PokemonType.POISON, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SWAMP, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ARBOK, PokemonType.POISON, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SWAMP, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PIKACHU, PokemonType.ELECTRIC, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.RAICHU, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SANDSHREW, PokemonType.GROUND, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERT, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SANDSLASH, PokemonType.GROUND, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERT, BiomePoolTier.COMMON ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.NIDORAN_F, PokemonType.POISON, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.DAY ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON, TimeOfDay.DAY ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.NIDORINA, PokemonType.POISON, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.DAY ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON, TimeOfDay.DAY ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ], 
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.NIDOQUEEN, PokemonType.POISON, PokemonType.GROUND, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.DAY ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS, TimeOfDay.DAY ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.NIDORAN_M, PokemonType.POISON, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.DAY ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON, TimeOfDay.DAY ], 
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.NIDORINO, PokemonType.POISON, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.DAY ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON, TimeOfDay.DAY ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.NIDOKING, PokemonType.POISON, PokemonType.GROUND, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.DAY ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS, TimeOfDay.DAY ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CLEFAIRY, PokemonType.FAIRY, -1, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPACE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.CLEFABLE, PokemonType.FAIRY, -1, [
      [ BiomeId.SPACE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.VULPIX, PokemonType.FIRE, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.NINETALES, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.JIGGLYPUFF, PokemonType.NORMAL, PokemonType.FAIRY, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.WIGGLYTUFF, PokemonType.NORMAL, PokemonType.FAIRY, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ZUBAT, PokemonType.POISON, PokemonType.FLYING, [
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GOLBAT, PokemonType.POISON, PokemonType.FLYING, [
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ODDISH, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GLOOM, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.VILEPLUME, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PARAS, PokemonType.BUG, PokemonType.GRASS, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.PARASECT, PokemonType.BUG, PokemonType.GRASS, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.VENONAT, PokemonType.BUG, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.VENOMOTH, PokemonType.BUG, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, TimeOfDay.NIGHT ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ], 
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DIGLETT, PokemonType.GROUND, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DUGTRIO, PokemonType.GROUND, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON ],
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MEOWTH, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.PERSIAN, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.PSYDUCK, PokemonType.WATER, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GOLDUCK, PokemonType.WATER, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MANKEY, PokemonType.FIGHTING, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.DOJO, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.PRIMEAPE, PokemonType.FIGHTING, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.DOJO, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GROWLITHE, PokemonType.FIRE, -1, [
      [ BiomeId.GRASS, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ARCANINE, PokemonType.FIRE, -1, [
      [ BiomeId.GRASS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.POLIWAG, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.POLIWHIRL, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.POLIWRATH, PokemonType.WATER, PokemonType.FIGHTING, [
      [ BiomeId.SWAMP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ABRA, PokemonType.PSYCHIC, -1, [
      [ BiomeId.TOWN, BiomePoolTier.RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.KADABRA, PokemonType.PSYCHIC, -1, [
      [ BiomeId.TOWN, BiomePoolTier.RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ALAKAZAM, PokemonType.PSYCHIC, -1, [
      [ BiomeId.TOWN, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MACHOP, PokemonType.FIGHTING, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FACTORY, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MACHOKE, PokemonType.FIGHTING, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FACTORY, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MACHAMP, PokemonType.FIGHTING, -1, [
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BELLSPROUT, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.WEEPINBELL, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.VICTREEBEL, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TENTACOOL, PokemonType.WATER, PokemonType.POISON, [
      [ BiomeId.SEA, BiomePoolTier.COMMON ],
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.TENTACRUEL, PokemonType.WATER, PokemonType.POISON, [
      [ BiomeId.SEA, BiomePoolTier.COMMON ],
      [ BiomeId.SEA, BiomePoolTier.BOSS ],
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GEODUDE, PokemonType.ROCK, PokemonType.GROUND, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GRAVELER, PokemonType.ROCK, PokemonType.GROUND, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GOLEM, PokemonType.ROCK, PokemonType.GROUND, [
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PONYTA, PokemonType.FIRE, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.RAPIDASH, PokemonType.FIRE, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SLOWPOKE, PokemonType.WATER, PokemonType.PSYCHIC, [
      [ BiomeId.SEA, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SLOWBRO, PokemonType.WATER, PokemonType.PSYCHIC, [
      [ BiomeId.SEA, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MAGNEMITE, PokemonType.ELECTRIC, PokemonType.STEEL, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.FACTORY, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MAGNETON, PokemonType.ELECTRIC, PokemonType.STEEL, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.FACTORY, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.FARFETCHD, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.PLAINS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DODUO, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.DESERT, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.DODRIO, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ], 
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.DESERT, BiomePoolTier.RARE ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SEEL, PokemonType.WATER, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.DEWGONG, PokemonType.WATER, PokemonType.ICE, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ] ,
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.GRIMER, PokemonType.POISON, -1, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MUK, PokemonType.POISON, -1, [
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.SLUM, BiomePoolTier.BOSS ],
      [ BiomeId.LABORATORY, BiomePoolTier.COMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SHELLDER, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.BEACH, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.CLOYSTER, PokemonType.WATER, PokemonType.ICE, [
      [ BiomeId.BEACH, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GASTLY, PokemonType.GHOST, PokemonType.POISON, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.HAUNTER, PokemonType.GHOST, PokemonType.POISON, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GENGAR, PokemonType.GHOST, PokemonType.POISON, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.RARE ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ONIX, PokemonType.ROCK, PokemonType.GROUND, [
      [ BiomeId.BADLANDS, BiomePoolTier.RARE ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.RARE ],
      [ BiomeId.CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.DROWZEE, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.RUINS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.HYPNO, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.RUINS, BiomePoolTier.COMMON ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.KRABBY, PokemonType.WATER, -1, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.KINGLER, PokemonType.WATER, -1, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.VOLTORB, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.FACTORY, BiomePoolTier.COMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ELECTRODE, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.FACTORY, BiomePoolTier.COMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.COMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.EXEGGCUTE, PokemonType.GRASS, PokemonType.PSYCHIC, [
      [ BiomeId.FOREST, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.EXEGGUTOR, PokemonType.GRASS, PokemonType.PSYCHIC, [
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.CUBONE, PokemonType.GROUND, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ], 
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON, TimeOfDay.NIGHT ]
    ]
    ],
    [ SpeciesId.MAROWAK, PokemonType.GROUND, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS, TimeOfDay.NIGHT ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY, TimeOfDay.DUSK ]],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS, TimeOfDay.NIGHT ]
    ]
    ],
    [ SpeciesId.HITMONLEE, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.HITMONCHAN, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.LICKITUNG, PokemonType.NORMAL, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.KOFFING, PokemonType.POISON, -1, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.WEEZING, PokemonType.POISON, -1, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.SLUM, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.RHYHORN, PokemonType.GROUND, PokemonType.ROCK, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.RHYDON, PokemonType.GROUND, PokemonType.ROCK, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.CHANSEY, PokemonType.NORMAL, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.TANGELA, PokemonType.GRASS, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.KANGASKHAN, PokemonType.NORMAL, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.HORSEA, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SEADRA, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GOLDEEN, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SEAKING, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.STARYU, PokemonType.WATER, -1, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.SPACE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.STARMIE, PokemonType.WATER, PokemonType.PSYCHIC, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.BEACH, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ],
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.MR_MIME, PokemonType.PSYCHIC, PokemonType.FAIRY, [
      [ BiomeId.RUINS, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SCYTHER, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.FOREST, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.JYNX, PokemonType.ICE, PokemonType.PSYCHIC, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ], 
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ELECTABUZZ, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.MAGMAR, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PINSIR, PokemonType.BUG, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.TAUROS, PokemonType.NORMAL, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MAGIKARP, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.COMMON ],
      [ BiomeId.LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GYARADOS, PokemonType.WATER, PokemonType.FLYING, [
      [ BiomeId.SEA, BiomePoolTier.COMMON ],
      [ BiomeId.LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ], 
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ], 
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.LAPRAS, PokemonType.WATER, PokemonType.ICE, [
      [ BiomeId.SEA, BiomePoolTier.RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.DITTO, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.METROPOLIS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SEWER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LABORATORY, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.EEVEE, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.METROPOLIS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.VAPOREON, PokemonType.WATER, -1, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LAKE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.JOLTEON, PokemonType.ELECTRIC, -1, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.FLAREON, PokemonType.FIRE, -1, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.PORYGON, PokemonType.NORMAL, -1, [
      [ BiomeId.FACTORY, BiomePoolTier.RARE ],
      [ BiomeId.SPACE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LABORATORY, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.OMANYTE, PokemonType.ROCK, PokemonType.WATER, [
      [ BiomeId.SEABED, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.OMASTAR, PokemonType.ROCK, PokemonType.WATER, [
      [ BiomeId.SEABED, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.KABUTO, PokemonType.ROCK, PokemonType.WATER, [
      [ BiomeId.SEABED, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.KABUTOPS, PokemonType.ROCK, PokemonType.WATER, [
      [ BiomeId.SEABED, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.AERODACTYL, PokemonType.ROCK, PokemonType.FLYING, [
      [ BiomeId.WASTELAND, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SNORLAX, PokemonType.NORMAL, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ARTICUNO, PokemonType.ICE, PokemonType.FLYING, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ZAPDOS, PokemonType.ELECTRIC, PokemonType.FLYING, [
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS_SUPER_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.MOLTRES, PokemonType.FIRE, PokemonType.FLYING, [
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.DRATINI, PokemonType.DRAGON, -1, [
      [ BiomeId.WASTELAND, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.DRAGONAIR, PokemonType.DRAGON, -1, [
      [ BiomeId.WASTELAND, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.DRAGONITE, PokemonType.DRAGON, PokemonType.FLYING, [
      [ BiomeId.WASTELAND, BiomePoolTier.RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ], 
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ], 
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.MEWTWO, PokemonType.PSYCHIC, -1, [
      [ BiomeId.LABORATORY, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.MEW, PokemonType.PSYCHIC, -1, [ 
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.CHIKORITA, PokemonType.GRASS, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.BAYLEEF, PokemonType.GRASS, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.MEGANIUM, PokemonType.GRASS, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.CYNDAQUIL, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.QUILAVA, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.TYPHLOSION, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.TOTODILE, PokemonType.WATER, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.CROCONAW, PokemonType.WATER, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.FERALIGATR, PokemonType.WATER, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.RARE ],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SENTRET, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.FURRET, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.HOOTHOOT, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SKY, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.NOCTOWL, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, TimeOfDay.NIGHT ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS, TimeOfDay.NIGHT ],
      [ BiomeId.SKY, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SKY, BiomePoolTier.BOSS, TimeOfDay.NIGHT ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.LEDYBA, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, TimeOfDay.DAWN ],
      [ BiomeId.MEADOW, BiomePoolTier.COMMON, TimeOfDay.DAWN ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.LEDIAN, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, TimeOfDay.DAWN ],
      [ BiomeId.MEADOW, BiomePoolTier.COMMON, TimeOfDay.DAWN ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS, TimeOfDay.DAWN ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SPINARAK, PokemonType.BUG, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.DUSK ],
      [ BiomeId.TOWN, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, TimeOfDay.DUSK ],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON, TimeOfDay.DUSK ],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ARIADOS, PokemonType.BUG, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, TimeOfDay.DUSK ],
      [ BiomeId.TOWN, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, TimeOfDay.DUSK ],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON, TimeOfDay.DUSK ],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ], 
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CROBAT, PokemonType.POISON, PokemonType.FLYING, [
      [ BiomeId.CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SKY, BiomePoolTier.BOSS, TimeOfDay.NIGHT ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CHINCHOU, PokemonType.WATER, PokemonType.ELECTRIC, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SEABED, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.LANTURN, PokemonType.WATER, PokemonType.ELECTRIC, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SEABED, BiomePoolTier.COMMON ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PICHU, PokemonType.ELECTRIC, -1, [ 
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.CLEFFA, PokemonType.FAIRY, -1, [ 
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.IGGLYBUFF, PokemonType.NORMAL, PokemonType.FAIRY, [ 
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.TOGEPI, PokemonType.FAIRY, -1, [ 
      [BiomeId.TOWN, BiomePoolTier.SUPER_RARE],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.TOGETIC, PokemonType.FAIRY, PokemonType.FLYING, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.NATU, PokemonType.PSYCHIC, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RUINS, BiomePoolTier.COMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.XATU, PokemonType.PSYCHIC, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RUINS, BiomePoolTier.COMMON ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS ],
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MAREEP, PokemonType.ELECTRIC, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.RARE ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.FLAAFFY, PokemonType.ELECTRIC, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.RARE ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.AMPHAROS, PokemonType.ELECTRIC, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BELLOSSOM, PokemonType.GRASS, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.MARILL, PokemonType.WATER, PokemonType.FAIRY, [
      [ BiomeId.LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.RIVER, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.AZUMARILL, PokemonType.WATER, PokemonType.FAIRY, [
      [ BiomeId.LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.RIVER, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LAKE, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.RIVER, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SUDOWOODO, PokemonType.ROCK, -1, [
      [ BiomeId.GRASS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GRASS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.POLITOED, PokemonType.WATER, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HOPPIP, PokemonType.GRASS, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SKIPLOOM, PokemonType.GRASS, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.JUMPLUFF, PokemonType.GRASS, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GRASS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.AIPOM, PokemonType.NORMAL, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SUNKERN, PokemonType.GRASS, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.SUNFLORA, PokemonType.GRASS, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GRASS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.YANMA, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.WOOPER, PokemonType.WATER, PokemonType.GROUND, [
      [ BiomeId.LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.QUAGSIRE, PokemonType.WATER, PokemonType.GROUND, [
      [ BiomeId.LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ESPEON, PokemonType.PSYCHIC, -1, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.RUINS, BiomePoolTier.SUPER_RARE, TimeOfDay.DAY ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS_RARE, TimeOfDay.DAY ]
    ]
    ],
    [ SpeciesId.UMBREON, PokemonType.DARK, -1, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.MURKROW, PokemonType.DARK, PokemonType.FLYING, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.RARE, TimeOfDay.NIGHT ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SLOWKING, PokemonType.WATER, PokemonType.PSYCHIC, [
      [ BiomeId.LAKE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.MISDREAVUS, PokemonType.GHOST, -1, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.UNOWN, PokemonType.PSYCHIC, -1, [
      [ BiomeId.RUINS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.WOBBUFFET, PokemonType.PSYCHIC, -1, [
      [ BiomeId.RUINS, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GIRAFARIG, PokemonType.NORMAL, PokemonType.PSYCHIC, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.PINECO, PokemonType.BUG, -1, [
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.FORRETRESS, PokemonType.BUG, PokemonType.STEEL, [
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DUNSPARCE, PokemonType.NORMAL, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GLIGAR, PokemonType.GROUND, PokemonType.FLYING, [
      [ BiomeId.BADLANDS, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.STEELIX, PokemonType.STEEL, PokemonType.GROUND, [
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SNUBBULL, PokemonType.FAIRY, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GRANBULL, PokemonType.FAIRY, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.QWILFISH, PokemonType.WATER, PokemonType.POISON, [
      [ BiomeId.SEABED, BiomePoolTier.RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SCIZOR, PokemonType.BUG, PokemonType.STEEL, [
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SHUCKLE, PokemonType.BUG, PokemonType.ROCK, [
      [ BiomeId.CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.HERACROSS, PokemonType.BUG, PokemonType.FIGHTING, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SNEASEL, PokemonType.DARK, PokemonType.ICE, [
      [ BiomeId.SLUM, BiomePoolTier.RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.TEDDIURSA, PokemonType.NORMAL, -1, [
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.URSARING, PokemonType.NORMAL, -1, [
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.SLUGMA, PokemonType.FIRE, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MAGCARGO, PokemonType.FIRE, PokemonType.ROCK, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SWINUB, PokemonType.ICE, PokemonType.GROUND, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.PILOSWINE, PokemonType.ICE, PokemonType.GROUND, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.CORSOLA, PokemonType.WATER, PokemonType.ROCK, [
      [ BiomeId.SEABED, BiomePoolTier.RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.REMORAID, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.OCTILLERY, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DELIBIRD, PokemonType.ICE, PokemonType.FLYING, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MANTINE, PokemonType.WATER, PokemonType.FLYING, [
      [ BiomeId.SEABED, BiomePoolTier.RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SKARMORY, PokemonType.STEEL, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.HOUNDOUR, PokemonType.DARK, PokemonType.FIRE, [
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SLUM, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.HOUNDOOM, PokemonType.DARK, PokemonType.FIRE, [
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SLUM, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.KINGDRA, PokemonType.WATER, PokemonType.DRAGON, [
      [ BiomeId.SEA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SEA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PHANPY, PokemonType.GROUND, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DONPHAN, PokemonType.GROUND, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CANYON, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.PORYGON2, PokemonType.NORMAL, -1, [
      [ BiomeId.FACTORY, BiomePoolTier.RARE ],
      [ BiomeId.SPACE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LABORATORY, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.STANTLER, PokemonType.NORMAL, -1, [
      [ BiomeId.FOREST, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FOREST, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.SMEARGLE, PokemonType.NORMAL, -1, [
      [ BiomeId.METROPOLIS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TYROGUE, PokemonType.FIGHTING, -1, [ 
      [ BiomeId.DOJO, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DOJO, BiomePoolTier.RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.RARE ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.HITMONTOP, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SMOOCHUM, PokemonType.ICE, PokemonType.PSYCHIC, [ 
      [ BiomeId.ICE_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ELEKID, PokemonType.ELECTRIC, -1, [ 
      [ BiomeId.POWER_PLANT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FACTORY, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.MAGBY, PokemonType.FIRE, -1, [ 
      [ BiomeId.VOLCANO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.FACTORY, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.MILTANK, PokemonType.NORMAL, -1, [
      [ BiomeId.GRASS, BiomePoolTier.BOSS ],
      [ BiomeId.MEADOW, BiomePoolTier.RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BLISSEY, PokemonType.NORMAL, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.RAIKOU, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ENTEI, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SUICUNE, PokemonType.WATER, -1, [
      [ BiomeId.RIVER, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.LARVITAR, PokemonType.ROCK, PokemonType.GROUND, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.PUPITAR, PokemonType.ROCK, PokemonType.GROUND, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.TYRANITAR, PokemonType.ROCK, PokemonType.DARK, [
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.SUPER_RARE ], 
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ], 
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.LUGIA, PokemonType.PSYCHIC, PokemonType.FLYING, [
      [ BiomeId.SEA, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.HO_OH, PokemonType.FIRE, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.CELEBI, PokemonType.PSYCHIC, PokemonType.GRASS, [ 
      [ BiomeId.FOREST, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.TREECKO, PokemonType.GRASS, -1, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GROVYLE, PokemonType.GRASS, -1, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SCEPTILE, PokemonType.GRASS, -1, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.TORCHIC, PokemonType.FIRE, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.COMBUSKEN, PokemonType.FIRE, PokemonType.FIGHTING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.BLAZIKEN, PokemonType.FIRE, PokemonType.FIGHTING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.MUDKIP, PokemonType.WATER, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.MARSHTOMP, PokemonType.WATER, PokemonType.GROUND, [
      [ BiomeId.SWAMP, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.SWAMPERT, PokemonType.WATER, PokemonType.GROUND, [
      [ BiomeId.SWAMP, BiomePoolTier.RARE ],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.POOCHYENA, PokemonType.DARK, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MIGHTYENA, PokemonType.DARK, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ZIGZAGOON, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON ],
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.LINOONE, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS ],
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.WURMPLE, PokemonType.BUG, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SILCOON, PokemonType.BUG, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, TimeOfDay.DAY ],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.BEAUTIFLY, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, TimeOfDay.DAY ],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, TimeOfDay.DAY ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, TimeOfDay.DAY ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CASCOON, PokemonType.BUG, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DUSTOX, PokemonType.BUG, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, TimeOfDay.NIGHT ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.LOTAD, PokemonType.WATER, PokemonType.GRASS, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SWAMP, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.RIVER, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.LOMBRE, PokemonType.WATER, PokemonType.GRASS, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SWAMP, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.RIVER, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.LUDICOLO, PokemonType.WATER, PokemonType.GRASS, [
      [ BiomeId.SWAMP, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.SEEDOT, PokemonType.GRASS, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.NUZLEAF, PokemonType.GRASS, PokemonType.DARK, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SHIFTRY, PokemonType.GRASS, PokemonType.DARK, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TAILLOW, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SWELLOW, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.WINGULL, PokemonType.WATER, PokemonType.FLYING, [
      [ BiomeId.SEA, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.PELIPPER, PokemonType.WATER, PokemonType.FLYING, [
      [ BiomeId.SEA, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SEA, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.RALTS, PokemonType.PSYCHIC, PokemonType.FAIRY, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DOJO, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.KIRLIA, PokemonType.PSYCHIC, PokemonType.FAIRY, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DOJO, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GARDEVOIR, PokemonType.PSYCHIC, PokemonType.FAIRY, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SURSKIT, PokemonType.BUG, PokemonType.WATER, [
      [ BiomeId.TOWN, BiomePoolTier.RARE ],
      [ BiomeId.LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.MASQUERAIN, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.RARE ],
      [ BiomeId.LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SHROOMISH, PokemonType.GRASS, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.BRELOOM, PokemonType.GRASS, PokemonType.FIGHTING, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SLAKOTH, PokemonType.NORMAL, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.VIGOROTH, PokemonType.NORMAL, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SLAKING, PokemonType.NORMAL, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.NINCADA, PokemonType.BUG, PokemonType.GROUND, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.NINJASK, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SHEDINJA, PokemonType.BUG, PokemonType.GHOST, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.WHISMUR, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.LOUDRED, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.EXPLOUD, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS ], 
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.ABYSS, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.MAKUHITA, PokemonType.FIGHTING, -1, [
      [ BiomeId.CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DOJO, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.HARIYAMA, PokemonType.FIGHTING, -1, [
      [ BiomeId.CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DOJO, BiomePoolTier.COMMON ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.AZURILL, PokemonType.NORMAL, PokemonType.FAIRY, [ 
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.NOSEPASS, PokemonType.ROCK, -1, [
      [ BiomeId.CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SKITTY, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.DELCATTY, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.SABLEYE, PokemonType.DARK, PokemonType.GHOST, [
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MAWILE, PokemonType.STEEL, PokemonType.FAIRY, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.ABYSS, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ARON, PokemonType.STEEL, PokemonType.ROCK, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.LAIRON, PokemonType.STEEL, PokemonType.ROCK, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.AGGRON, PokemonType.STEEL, PokemonType.ROCK, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MEDITITE, PokemonType.FIGHTING, PokemonType.PSYCHIC, [
      [ BiomeId.DOJO, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.MEDICHAM, PokemonType.FIGHTING, PokemonType.PSYCHIC, [
      [ BiomeId.DOJO, BiomePoolTier.COMMON ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VOLCANO, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ELECTRIKE, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MANECTRIC, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PLUSLE, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.MINUN, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.VOLBEAT, PokemonType.BUG, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.RARE, TimeOfDay.NIGHT ],
      [ BiomeId.RIVER, BiomePoolTier.RARE, TimeOfDay.NIGHT ]
    ]
    ],
    [ SpeciesId.ILLUMISE, PokemonType.BUG, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.RARE, TimeOfDay.NIGHT ],
      [ BiomeId.RIVER, BiomePoolTier.RARE, TimeOfDay.NIGHT ]
    ]
    ],
    [ SpeciesId.ROSELIA, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MEADOW, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GULPIN, PokemonType.POISON, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SWALOT, PokemonType.POISON, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.COMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CARVANHA, PokemonType.WATER, PokemonType.DARK, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SHARPEDO, PokemonType.WATER, PokemonType.DARK, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SEA, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.WAILMER, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.WAILORD, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.NUMEL, PokemonType.FIRE, PokemonType.GROUND, [
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.CAMERUPT, PokemonType.FIRE, PokemonType.GROUND, [
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.TORKOAL, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SPOINK, PokemonType.PSYCHIC, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GRUMPIG, PokemonType.PSYCHIC, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.COMMON ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SPINDA, PokemonType.NORMAL, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.TRAPINCH, PokemonType.GROUND, -1, [
      [ BiomeId.DESERT, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.VIBRAVA, PokemonType.GROUND, PokemonType.DRAGON, [
      [ BiomeId.DESERT, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.FLYGON, PokemonType.GROUND, PokemonType.DRAGON, [
      [ BiomeId.DESERT, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ], 
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ], 
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.CACNEA, PokemonType.GRASS, -1, [
      [ BiomeId.DESERT, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.CACTURNE, PokemonType.GRASS, PokemonType.DARK, [
      [ BiomeId.DESERT, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.DESERT, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.SWABLU, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.WASTELAND, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ALTARIA, PokemonType.DRAGON, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.WASTELAND, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ZANGOOSE, PokemonType.NORMAL, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SEVIPER, PokemonType.POISON, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.LUNATONE, PokemonType.ROCK, PokemonType.PSYCHIC, [
      [ BiomeId.SPACE, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SPACE, BiomePoolTier.BOSS, TimeOfDay.NIGHT ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SOLROCK, PokemonType.ROCK, PokemonType.PSYCHIC, [
      [ BiomeId.SPACE, BiomePoolTier.COMMON, TimeOfDay.DAY ],
      [ BiomeId.SPACE, BiomePoolTier.BOSS, TimeOfDay.DAY ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BARBOACH, PokemonType.WATER, PokemonType.GROUND, [
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.WHISCASH, PokemonType.WATER, PokemonType.GROUND, [
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CORPHISH, PokemonType.WATER, -1, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.CRAWDAUNT, PokemonType.WATER, PokemonType.DARK, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BALTOY, PokemonType.GROUND, PokemonType.PSYCHIC, [
      [ BiomeId.RUINS, BiomePoolTier.COMMON ],
      [ BiomeId.SPACE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.CLAYDOL, PokemonType.GROUND, PokemonType.PSYCHIC, [
      [ BiomeId.RUINS, BiomePoolTier.COMMON ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS ],
      [ BiomeId.SPACE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.LILEEP, PokemonType.ROCK, PokemonType.GRASS, [
      [ BiomeId.DESERT, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.CRADILY, PokemonType.ROCK, PokemonType.GRASS, [
      [ BiomeId.DESERT, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.ANORITH, PokemonType.ROCK, PokemonType.BUG, [
      [ BiomeId.DESERT, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ARMALDO, PokemonType.ROCK, PokemonType.BUG, [
      [ BiomeId.DESERT, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.FEEBAS, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.RIVER, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SEWER, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.MILOTIC, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.BOSS_SUPER_RARE ],
      [ BiomeId.RIVER, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.CASTFORM, PokemonType.NORMAL, -1, [
      [ BiomeId.METROPOLIS, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.METROPOLIS, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.KECLEON, PokemonType.NORMAL, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SHUPPET, PokemonType.GHOST, -1, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]], 
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.BANETTE, PokemonType.GHOST, -1, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DUSKULL, PokemonType.GHOST, -1, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DUSCLOPS, PokemonType.GHOST, -1, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.TROPIUS, PokemonType.GRASS, PokemonType.FLYING, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ],
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.CHIMECHO, PokemonType.PSYCHIC, -1, [
      [ BiomeId.TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ABSOL, PokemonType.DARK, -1, [
      [ BiomeId.ABYSS, BiomePoolTier.RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.WYNAUT, PokemonType.PSYCHIC, -1, [ 
      [ BiomeId.RUINS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SNORUNT, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GLALIE, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SPHEAL, PokemonType.ICE, PokemonType.WATER, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.UNCOMMON ], 
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SEALEO, PokemonType.ICE, PokemonType.WATER, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.WALREIN, PokemonType.ICE, PokemonType.WATER, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CLAMPERL, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.HUNTAIL, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GOREBYSS, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.RELICANTH, PokemonType.WATER, PokemonType.ROCK, [
      [ BiomeId.SEABED, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.LUVDISC, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BAGON, PokemonType.DRAGON, -1, [
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SHELGON, PokemonType.DRAGON, -1, [
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SALAMENCE, PokemonType.DRAGON, PokemonType.FLYING, [
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ], 
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.BELDUM, PokemonType.STEEL, PokemonType.PSYCHIC, [
      [ BiomeId.FACTORY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPACE, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.METANG, PokemonType.STEEL, PokemonType.PSYCHIC, [
      [ BiomeId.FACTORY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPACE, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.METAGROSS, PokemonType.STEEL, PokemonType.PSYCHIC, [
      [ BiomeId.FACTORY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPACE, BiomePoolTier.RARE ],
      [ BiomeId.SPACE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.REGIROCK, PokemonType.ROCK, -1, [
      [ BiomeId.DESERT, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.REGICE, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.REGISTEEL, PokemonType.STEEL, -1, [
      [ BiomeId.RUINS, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.LATIAS, PokemonType.DRAGON, PokemonType.PSYCHIC, [
      [ BiomeId.PLAINS, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.LATIOS, PokemonType.DRAGON, PokemonType.PSYCHIC, [
      [ BiomeId.PLAINS, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.KYOGRE, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.GROUDON, PokemonType.GROUND, -1, [
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.RAYQUAZA, PokemonType.DRAGON, PokemonType.FLYING, [
      [ BiomeId.SKY, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.JIRACHI, PokemonType.STEEL, PokemonType.PSYCHIC, [ 
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS_SUPER_RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.ULTRA_RARE ]
    ] 
    ],
    [ SpeciesId.DEOXYS, PokemonType.PSYCHIC, -1, [ 
      [ BiomeId.SPACE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.TURTWIG, PokemonType.GRASS, -1, [
      [ BiomeId.GRASS, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.GROTLE, PokemonType.GRASS, -1, [
      [ BiomeId.GRASS, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.TORTERRA, PokemonType.GRASS, PokemonType.GROUND, [
      [ BiomeId.GRASS, BiomePoolTier.RARE ],
      [ BiomeId.GRASS, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.CHIMCHAR, PokemonType.FIRE, -1, [
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.MONFERNO, PokemonType.FIRE, PokemonType.FIGHTING, [
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.INFERNAPE, PokemonType.FIRE, PokemonType.FIGHTING, [
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.PIPLUP, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.PRINPLUP, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.EMPOLEON, PokemonType.WATER, PokemonType.STEEL, [
      [ BiomeId.SEA, BiomePoolTier.RARE ],
      [ BiomeId.SEA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.STARLY, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.STARAVIA, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.STARAPTOR, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BIDOOF, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.BIBAREL, PokemonType.NORMAL, PokemonType.WATER, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.KRICKETOT, PokemonType.BUG, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.KRICKETUNE, PokemonType.BUG, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SHINX, PokemonType.ELECTRIC, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.LUXIO, PokemonType.ELECTRIC, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.LUXRAY, PokemonType.ELECTRIC, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BUDEW, PokemonType.GRASS, PokemonType.POISON, [ 
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ROSERADE, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.MEADOW, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CRANIDOS, PokemonType.ROCK, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.RAMPARDOS, PokemonType.ROCK, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SHIELDON, PokemonType.ROCK, PokemonType.STEEL, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.BASTIODON, PokemonType.ROCK, PokemonType.STEEL, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ], 
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BURMY, PokemonType.BUG, -1, [
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BEACH, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SLUM, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.WORMADAM, PokemonType.BUG, PokemonType.GRASS, [
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.BEACH, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS ],
      [ BiomeId.SLUM, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SLUM, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MOTHIM, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.COMBEE, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GRASS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.VESPIQUEN, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GRASS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PACHIRISU, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.BUIZEL, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.FLOATZEL, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEA, BiomePoolTier.BOSS ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CHERUBI, PokemonType.GRASS, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GRASS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.CHERRIM, PokemonType.GRASS, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GRASS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SHELLOS, PokemonType.WATER, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.COMMON ],
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GASTRODON, PokemonType.WATER, PokemonType.GROUND, [
      [ BiomeId.SWAMP, BiomePoolTier.COMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS ],
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.AMBIPOM, PokemonType.NORMAL, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DRIFLOON, PokemonType.GHOST, PokemonType.FLYING, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DRIFBLIM, PokemonType.GHOST, PokemonType.FLYING, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],   
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BUNEARY, PokemonType.NORMAL, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.LOPUNNY, PokemonType.NORMAL, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MISMAGIUS, PokemonType.GHOST, -1, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.HONCHKROW, PokemonType.DARK, PokemonType.FLYING, [
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GLAMEOW, PokemonType.NORMAL, -1, [
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.PURUGLY, PokemonType.NORMAL, -1, [
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CHINGLING, PokemonType.PSYCHIC, -1, [
      [ BiomeId.TEMPLE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.STUNKY, PokemonType.POISON, PokemonType.DARK, [
      [ BiomeId.SLUM, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SKUNTANK, PokemonType.POISON, PokemonType.DARK, [
      [ BiomeId.SLUM, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SLUM, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BRONZOR, PokemonType.STEEL, PokemonType.PSYCHIC, [
      [ BiomeId.FACTORY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPACE, BiomePoolTier.COMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.BRONZONG, PokemonType.STEEL, PokemonType.PSYCHIC, [
      [ BiomeId.FACTORY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPACE, BiomePoolTier.COMMON ],
      [ BiomeId.SPACE, BiomePoolTier.BOSS ],
      [ BiomeId.LABORATORY, BiomePoolTier.COMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.BOSS ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BONSLY, PokemonType.ROCK, -1, [ 
      [ BiomeId.GRASS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GRASS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MIME_JR, PokemonType.PSYCHIC, PokemonType.FAIRY, [ 
      [ BiomeId.RUINS, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.HAPPINY, PokemonType.NORMAL, -1, [ 
      [BiomeId.TOWN, BiomePoolTier.RARE],
      [ BiomeId.PLAINS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.CHATOT, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.JUNGLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SPIRITOMB, PokemonType.GHOST, PokemonType.DARK, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GIBLE, PokemonType.DRAGON, PokemonType.GROUND, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DESERT, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GABITE, PokemonType.DRAGON, PokemonType.GROUND, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DESERT, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GARCHOMP, PokemonType.DRAGON, PokemonType.GROUND, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DESERT, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.MUNCHLAX, PokemonType.NORMAL, -1, [ 
      [ BiomeId.TOWN, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.RIOLU, PokemonType.FIGHTING, -1, [ 
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DOJO, BiomePoolTier.RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.LUCARIO, PokemonType.FIGHTING, PokemonType.STEEL, [
      [ BiomeId.DOJO, BiomePoolTier.RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.HIPPOPOTAS, PokemonType.GROUND, -1, [
      [ BiomeId.DESERT, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.HIPPOWDON, PokemonType.GROUND, -1, [
      [ BiomeId.DESERT, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DESERT, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.SKORUPI, PokemonType.POISON, PokemonType.BUG, [
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERT, BiomePoolTier.COMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DRAPION, PokemonType.POISON, PokemonType.DARK, [
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERT, BiomePoolTier.COMMON ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS ],
      [ BiomeId.TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CROAGUNK, PokemonType.POISON, PokemonType.FIGHTING, [
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.DOJO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.TOXICROAK, PokemonType.POISON, PokemonType.FIGHTING, [
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.DOJO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CARNIVINE, PokemonType.GRASS, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.FINNEON, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.LUMINEON, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SEA, BiomePoolTier.BOSS, TimeOfDay.NIGHT ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MANTYKE, PokemonType.WATER, PokemonType.FLYING, [
      [ BiomeId.SEABED, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SNOVER, PokemonType.GRASS, PokemonType.ICE, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ABOMASNOW, PokemonType.GRASS, PokemonType.ICE, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.WEAVILE, PokemonType.DARK, PokemonType.ICE, [
      [ BiomeId.SLUM, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.MAGNEZONE, PokemonType.ELECTRIC, PokemonType.STEEL, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS ],
      [ BiomeId.LABORATORY, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.LICKILICKY, PokemonType.NORMAL, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.RHYPERIOR, PokemonType.GROUND, PokemonType.ROCK, [
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ], 
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TANGROWTH, PokemonType.GRASS, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ELECTIVIRE, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.FACTORY, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MAGMORTAR, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.FACTORY, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TOGEKISS, PokemonType.FAIRY, PokemonType.FLYING, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.YANMEGA, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.LEAFEON, PokemonType.GRASS, -1, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.GLACEON, PokemonType.ICE, -1, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.GLISCOR, PokemonType.GROUND, PokemonType.FLYING, [
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MAMOSWINE, PokemonType.ICE, PokemonType.GROUND, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.PORYGON_Z, PokemonType.NORMAL, -1, [
      [ BiomeId.SPACE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LABORATORY, BiomePoolTier.BOSS ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.GALLADE, PokemonType.PSYCHIC, PokemonType.FIGHTING, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DOJO, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.PROBOPASS, PokemonType.ROCK, PokemonType.STEEL, [
      [ BiomeId.CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DUSKNOIR, PokemonType.GHOST, -1, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.FROSLASS, PokemonType.ICE, PokemonType.GHOST, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.ABYSS, BiomePoolTier.RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ROTOM, PokemonType.ELECTRIC, PokemonType.GHOST, [
      [ BiomeId.LABORATORY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LABORATORY, BiomePoolTier.BOSS_SUPER_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_SUPER_RARE ],
      [ BiomeId.SEA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SEA, BiomePoolTier.BOSS_SUPER_RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS_SUPER_RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS_SUPER_RARE ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.UXIE, PokemonType.PSYCHIC, -1, [
      [ BiomeId.CAVE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.MESPRIT, PokemonType.PSYCHIC, -1, [
      [ BiomeId.LAKE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.AZELF, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.DIALGA, PokemonType.STEEL, PokemonType.DRAGON, [
      [ BiomeId.RUINS, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.PALKIA, PokemonType.WATER, PokemonType.DRAGON, [
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.HEATRAN, PokemonType.FIRE, PokemonType.STEEL, [
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.REGIGIGAS, PokemonType.NORMAL, -1, [
      [ BiomeId.TEMPLE, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.GIRATINA, PokemonType.GHOST, PokemonType.DRAGON, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.CRESSELIA, PokemonType.PSYCHIC, -1, [
      [ BiomeId.BEACH, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.PHIONE, PokemonType.WATER, -1, [ 
      [ BiomeId.SEA, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.MANAPHY, PokemonType.WATER, -1, [ 
      [ BiomeId.SEA, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.DARKRAI, PokemonType.DARK, -1, [
      [ BiomeId.ABYSS, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SHAYMIN, PokemonType.GRASS, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ARCEUS, PokemonType.NORMAL, -1, [ ]
    ],
    [ SpeciesId.VICTINI, PokemonType.PSYCHIC, PokemonType.FIRE, [ 
      [ BiomeId.ISLAND, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SNIVY, PokemonType.GRASS, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SERVINE, PokemonType.GRASS, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SERPERIOR, PokemonType.GRASS, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.TEPIG, PokemonType.FIRE, -1, [
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.PIGNITE, PokemonType.FIRE, PokemonType.FIGHTING, [
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.EMBOAR, PokemonType.FIRE, PokemonType.FIGHTING, [
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.RARE ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.OSHAWOTT, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.DEWOTT, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.SAMUROTT, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.PATRAT, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SLUM, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.WATCHOG, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SLUM, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SLUM, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.LILLIPUP, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.HERDIER, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.STOUTLAND, PokemonType.NORMAL, -1, [
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON ],
      [ BiomeId.METROPOLIS, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PURRLOIN, PokemonType.DARK, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.LIEPARD, PokemonType.DARK, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PANSAGE, PokemonType.GRASS, -1, [
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.SIMISAGE, PokemonType.GRASS, -1, [
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ], 
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.PANSEAR, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SIMISEAR, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PANPOUR, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SIMIPOUR, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEA, BiomePoolTier.BOSS ],
      [ BiomeId.RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ], 
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MUNNA, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SPACE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MUSHARNA, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SPACE, BiomePoolTier.COMMON ],
      [ BiomeId.SPACE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PIDOVE, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.TRANQUILL, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.UNFEZANT, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BLITZLE, PokemonType.ELECTRIC, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.COMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ZEBSTRIKA, PokemonType.ELECTRIC, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.COMMON ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS ],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ROGGENROLA, PokemonType.ROCK, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.BOLDORE, PokemonType.ROCK, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GIGALITH, PokemonType.ROCK, -1, [
      [ BiomeId.CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.WOOBAT, PokemonType.PSYCHIC, PokemonType.FLYING, [
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SWOOBAT, PokemonType.PSYCHIC, PokemonType.FLYING, [
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON, TimeOfDay.NIGHT ],
      [ BiomeId.SKY, BiomePoolTier.BOSS, TimeOfDay.NIGHT ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DRILBUR, PokemonType.GROUND, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.EXCADRILL, PokemonType.GROUND, PokemonType.STEEL, [
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON ],
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.AUDINO, PokemonType.NORMAL, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TIMBURR, PokemonType.FIGHTING, -1, [
      [ BiomeId.FACTORY, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.GURDURR, PokemonType.FIGHTING, -1, [
      [ BiomeId.FACTORY, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.CONKELDURR, PokemonType.FIGHTING, -1, [
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.TYMPOLE, PokemonType.WATER, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.PALPITOAD, PokemonType.WATER, PokemonType.GROUND, [
      [ BiomeId.SWAMP, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.SEISMITOAD, PokemonType.WATER, PokemonType.GROUND, [
      [ BiomeId.SWAMP, BiomePoolTier.COMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.THROH, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SAWK, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SEWADDLE, PokemonType.BUG, PokemonType.GRASS, [
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SWADLOON, PokemonType.BUG, PokemonType.GRASS, [
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.LEAVANNY, PokemonType.BUG, PokemonType.GRASS, [
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.VENIPEDE, PokemonType.BUG, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.WHIRLIPEDE, PokemonType.BUG, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SCOLIPEDE, PokemonType.BUG, PokemonType.POISON, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.GRASS, BiomePoolTier.BOSS ],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.COTTONEE, PokemonType.GRASS, PokemonType.FAIRY, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MEADOW, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.WHIMSICOTT, PokemonType.GRASS, PokemonType.FAIRY, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GRASS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.PETILIL, PokemonType.GRASS, -1, [
      [ BiomeId.GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.LILLIGANT, PokemonType.GRASS, -1, [
      [ BiomeId.FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BASCULIN, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.SANDILE, PokemonType.GROUND, PokemonType.DARK, [
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DESERT, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.KROKOROK, PokemonType.GROUND, PokemonType.DARK, [
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DESERT, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.KROOKODILE, PokemonType.GROUND, PokemonType.DARK, [
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DESERT, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.DESERT, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS_RARE],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.DARUMAKA, PokemonType.FIRE, -1, [
      [ BiomeId.DESERT, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.DARMANITAN, PokemonType.FIRE, -1, [
      [ BiomeId.DESERT, BiomePoolTier.RARE ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MARACTUS, PokemonType.GRASS, -1, [
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DWEBBLE, PokemonType.BUG, PokemonType.ROCK, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.CRUSTLE, PokemonType.BUG, PokemonType.ROCK, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SCRAGGY, PokemonType.DARK, PokemonType.FIGHTING, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.DOJO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SCRAFTY, PokemonType.DARK, PokemonType.FIGHTING, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.SLUM, BiomePoolTier.BOSS ],
      [ BiomeId.DOJO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SIGILYPH, PokemonType.PSYCHIC, PokemonType.FLYING, [
      [ BiomeId.RUINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS ],
      [ BiomeId.SPACE, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.DESERT, BiomePoolTier.RARE ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.YAMASK, PokemonType.GHOST, -1, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.COFAGRIGUS, PokemonType.GHOST, -1, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ], 
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.DESERT, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.TIRTOUGA, PokemonType.WATER, PokemonType.ROCK, [
      [ BiomeId.SEA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BEACH, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.CARRACOSTA, PokemonType.WATER, PokemonType.ROCK, [
      [ BiomeId.SEA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BEACH, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ARCHEN, PokemonType.ROCK, PokemonType.FLYING, [
      [ BiomeId.RUINS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ARCHEOPS, PokemonType.ROCK, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.RUINS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TRUBBISH, PokemonType.POISON, -1, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GARBODOR, PokemonType.POISON, -1, [
      [ BiomeId.SLUM, BiomePoolTier.COMMON ],
      [ BiomeId.SLUM, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ZORUA, PokemonType.DARK, -1, [
      [ BiomeId.TOWN, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.RARE ], 
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.ZOROARK, PokemonType.DARK, -1, [
      [ BiomeId.ABYSS, BiomePoolTier.RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MINCCINO, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MEADOW, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.CINCCINO, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GOTHITA, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SLUM, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.GOTHORITA, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SLUM, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.GOTHITELLE, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SLUM, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.RARE ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SOLOSIS, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SPACE, BiomePoolTier.RARE ],
      [ BiomeId.LABORATORY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DUOSION, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SPACE, BiomePoolTier.RARE ],
      [ BiomeId.LABORATORY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.REUNICLUS, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SPACE, BiomePoolTier.RARE ],
      [ BiomeId.SPACE, BiomePoolTier.BOSS ],
      [ BiomeId.LABORATORY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DUCKLETT, PokemonType.WATER, PokemonType.FLYING, [
      [ BiomeId.LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.RIVER, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.SWANNA, PokemonType.WATER, PokemonType.FLYING, [
      [ BiomeId.LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.RIVER, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.RIVER, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.VANILLITE, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.VANILLISH, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.VANILLUXE, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DEERLING, PokemonType.NORMAL, PokemonType.GRASS, [
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SAWSBUCK, PokemonType.NORMAL, PokemonType.GRASS, [
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.EMOLGA, PokemonType.ELECTRIC, PokemonType.FLYING, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.KARRABLAST, PokemonType.BUG, -1, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ESCAVALIER, PokemonType.BUG, PokemonType.STEEL, [
      [ BiomeId.FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.FOONGUS, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.GRASS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.JUNGLE, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.AMOONGUSS, PokemonType.GRASS, PokemonType.POISON, [
      [ BiomeId.GRASS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.JUNGLE, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.FRILLISH, PokemonType.WATER, PokemonType.GHOST, [
      [ BiomeId.SEABED, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.JELLICENT, PokemonType.WATER, PokemonType.GHOST, [
      [ BiomeId.SEABED, BiomePoolTier.COMMON ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ALOMOMOLA, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.JOLTIK, PokemonType.BUG, PokemonType.ELECTRIC, [
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.GALVANTULA, PokemonType.BUG, PokemonType.ELECTRIC, [
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.FERROSEED, PokemonType.GRASS, PokemonType.STEEL, [
      [ BiomeId.CAVE, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.FERROTHORN, PokemonType.GRASS, PokemonType.STEEL, [
      [ BiomeId.CAVE, BiomePoolTier.RARE ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.KLINK, PokemonType.STEEL, -1, [
      [ BiomeId.FACTORY, BiomePoolTier.COMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.KLANG, PokemonType.STEEL, -1, [
      [ BiomeId.FACTORY, BiomePoolTier.COMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.KLINKLANG, PokemonType.STEEL, -1, [
      [ BiomeId.FACTORY, BiomePoolTier.COMMON ],
      [ BiomeId.FACTORY, BiomePoolTier.BOSS ],
      [ BiomeId.LABORATORY, BiomePoolTier.COMMON ],
      [ BiomeId.LABORATORY, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TYNAMO, PokemonType.ELECTRIC, -1, [
      [ BiomeId.SEABED, BiomePoolTier.RARE ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.EELEKTRIK, PokemonType.ELECTRIC, -1, [
      [ BiomeId.SEABED, BiomePoolTier.RARE ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.EELEKTROSS, PokemonType.ELECTRIC, -1, [
      [ BiomeId.SEABED, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.ELGYEM, PokemonType.PSYCHIC, -1, [
      [ BiomeId.RUINS, BiomePoolTier.COMMON ],
      [ BiomeId.SPACE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.BEHEEYEM, PokemonType.PSYCHIC, -1, [
      [ BiomeId.RUINS, BiomePoolTier.COMMON ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS ],
      [ BiomeId.SPACE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.LITWICK, PokemonType.GHOST, PokemonType.FIRE, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.LAMPENT, PokemonType.GHOST, PokemonType.FIRE, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.CHANDELURE, PokemonType.GHOST, PokemonType.FIRE, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS ],
      [ BiomeId.TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.AXEW, PokemonType.DRAGON, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.FRAXURE, PokemonType.DRAGON, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.HAXORUS, PokemonType.DRAGON, -1, [
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CUBCHOO, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.BEARTIC, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ], 
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.CRYOGONAL, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.SHELMET, PokemonType.BUG, -1, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ACCELGOR, PokemonType.BUG, -1, [
      [ BiomeId.FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.STUNFISK, PokemonType.GROUND, PokemonType.ELECTRIC, [
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MIENFOO, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MIENSHAO, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DRUDDIGON, PokemonType.DRAGON, -1, [
      [ BiomeId.WASTELAND, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.GOLETT, PokemonType.GROUND, PokemonType.GHOST, [
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GOLURK, PokemonType.GROUND, PokemonType.GHOST, [
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PAWNIARD, PokemonType.DARK, PokemonType.STEEL, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ],
      [ BiomeId.SLUM, BiomePoolTier.RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.BISHARP, PokemonType.DARK, PokemonType.STEEL, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ],
      [ BiomeId.SLUM, BiomePoolTier.RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.BOUFFALANT, PokemonType.NORMAL, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.RUFFLET, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.BRAVIARY, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.VULLABY, PokemonType.DARK, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.MANDIBUZZ, PokemonType.DARK, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HEATMOR, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DURANT, PokemonType.BUG, PokemonType.STEEL, [
      [ BiomeId.FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DEINO, PokemonType.DARK, PokemonType.DRAGON, [
      [ BiomeId.WASTELAND, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.ABYSS, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ZWEILOUS, PokemonType.DARK, PokemonType.DRAGON, [
      [ BiomeId.WASTELAND, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.ABYSS, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.HYDREIGON, PokemonType.DARK, PokemonType.DRAGON, [
      [ BiomeId.WASTELAND, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.ABYSS, BiomePoolTier.RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.LARVESTA, PokemonType.BUG, PokemonType.FIRE, [
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.VOLCARONA, PokemonType.BUG, PokemonType.FIRE, [
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.COBALION, PokemonType.STEEL, PokemonType.FIGHTING, [
      [ BiomeId.SHARP_FIELD, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.TERRAKION, PokemonType.ROCK, PokemonType.FIGHTING, [
      [ BiomeId.DOJO, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.VIRIZION, PokemonType.GRASS, PokemonType.FIGHTING, [
      [ BiomeId.GRASS, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.GRASS, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.TORNADUS, PokemonType.FLYING, -1, [
      [ BiomeId.SKY, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.THUNDURUS, PokemonType.ELECTRIC, PokemonType.FLYING, [
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.RESHIRAM, PokemonType.DRAGON, PokemonType.FIRE, [
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.ZEKROM, PokemonType.DRAGON, PokemonType.ELECTRIC, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.LANDORUS, PokemonType.GROUND, PokemonType.FLYING, [
      [ BiomeId.CANYON, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.KYUREM, PokemonType.DRAGON, PokemonType.ICE, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.KELDEO, PokemonType.WATER, PokemonType.FIGHTING, [
      [ BiomeId.BEACH, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.MELOETTA, PokemonType.NORMAL, PokemonType.PSYCHIC, [
      [ BiomeId.METROPOLIS, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.METROPOLIS, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GENESECT, PokemonType.BUG, PokemonType.STEEL, [
      [ BiomeId.SEWER, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.CHESPIN, PokemonType.GRASS, -1, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.QUILLADIN, PokemonType.GRASS, -1, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.CHESNAUGHT, PokemonType.GRASS, PokemonType.FIGHTING, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.FENNEKIN, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.BRAIXEN, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.DELPHOX, PokemonType.FIRE, PokemonType.PSYCHIC, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.FROAKIE, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.FROGADIER, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.GRENINJA, PokemonType.WATER, PokemonType.DARK, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.BUNNELBY, PokemonType.NORMAL, -1, [
      [ BiomeId.CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DIGGERSBY, PokemonType.NORMAL, PokemonType.GROUND, [
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.FLETCHLING, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.FLETCHINDER, PokemonType.FIRE, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ], 
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.TALONFLAME, PokemonType.FIRE, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SCATTERBUG, PokemonType.BUG, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SPEWPA, PokemonType.BUG, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ], 
      [ BiomeId.SKY, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.VIVILLON, PokemonType.BUG, PokemonType.FLYING, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.LITLEO, PokemonType.FIRE, PokemonType.NORMAL, [
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.PYROAR, PokemonType.FIRE, PokemonType.NORMAL, [
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ], 
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.FLABEBE, PokemonType.FAIRY, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.FLOETTE, PokemonType.FAIRY, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.FLORGES, PokemonType.FAIRY, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SKIDDO, PokemonType.GRASS, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GOGOAT, PokemonType.GRASS, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PANCHAM, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.SLUM, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.PANGORO, PokemonType.FIGHTING, PokemonType.DARK, [
      [ BiomeId.DOJO, BiomePoolTier.RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SLUM, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SLUM, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.FURFROU, PokemonType.NORMAL, -1, [
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.METROPOLIS, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.ESPURR, PokemonType.PSYCHIC, -1, [
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.MEOWSTIC, PokemonType.PSYCHIC, -1, [
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.METROPOLIS, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.HONEDGE, PokemonType.STEEL, PokemonType.GHOST, [
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.DOUBLADE, PokemonType.STEEL, PokemonType.GHOST, [
      [ BiomeId.TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.AEGISLASH, PokemonType.STEEL, PokemonType.GHOST, [
      [ BiomeId.TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SPRITZEE, PokemonType.FAIRY, -1, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.AROMATISSE, PokemonType.FAIRY, -1, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SWIRLIX, PokemonType.FAIRY, -1, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SLURPUFF, PokemonType.FAIRY, -1, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.INKAY, PokemonType.DARK, PokemonType.PSYCHIC, [
      [ BiomeId.SEA, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.MALAMAR, PokemonType.DARK, PokemonType.PSYCHIC, [
      [ BiomeId.SEA, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SEA, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.BINACLE, PokemonType.ROCK, PokemonType.WATER, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.BARBARACLE, PokemonType.ROCK, PokemonType.WATER, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SKRELP, PokemonType.POISON, PokemonType.WATER, [
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.DRAGALGE, PokemonType.POISON, PokemonType.DRAGON, [
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CLAUNCHER, PokemonType.WATER, -1, [
      [ BiomeId.BEACH, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.CLAWITZER, PokemonType.WATER, -1, [
      [ BiomeId.BEACH, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.HELIOPTILE, PokemonType.ELECTRIC, PokemonType.NORMAL, [
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.HELIOLISK, PokemonType.ELECTRIC, PokemonType.NORMAL, [
      [ BiomeId.DESERT, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.TYRUNT, PokemonType.ROCK, PokemonType.DRAGON, [
      [ BiomeId.WASTELAND, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.TYRANTRUM, PokemonType.ROCK, PokemonType.DRAGON, [
      [ BiomeId.WASTELAND, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.AMAURA, PokemonType.ROCK, PokemonType.ICE, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.AURORUS, PokemonType.ROCK, PokemonType.ICE, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SYLVEON, PokemonType.FAIRY, -1, [
      [ BiomeId.TOWN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HAWLUCHA, PokemonType.FIGHTING, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DEDENNE, PokemonType.ELECTRIC, PokemonType.FAIRY, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CARBINK, PokemonType.ROCK, PokemonType.FAIRY, [
      [ BiomeId.CAVE, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GOOMY, PokemonType.DRAGON, -1, [
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SLIGGOO, PokemonType.DRAGON, -1, [
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GOODRA, PokemonType.DRAGON, -1, [
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.KLEFKI, PokemonType.STEEL, PokemonType.FAIRY, [
      [ BiomeId.FACTORY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FACTORY, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PHANTUMP, PokemonType.GHOST, PokemonType.GRASS, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.TREVENANT, PokemonType.GHOST, PokemonType.GRASS, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.NIGHT ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PUMPKABOO, PokemonType.GHOST, PokemonType.GRASS, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GOURGEIST, PokemonType.GHOST, PokemonType.GRASS, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BERGMITE, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.AVALUGG, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.NOIBAT, PokemonType.FLYING, PokemonType.DRAGON, [
      [ BiomeId.CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GRASS, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.NOIVERN, PokemonType.FLYING, PokemonType.DRAGON, [
      [ BiomeId.GRASS, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GRASS, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.XERNEAS, PokemonType.FAIRY, -1, [
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.YVELTAL, PokemonType.DARK, PokemonType.FLYING, [
      [ BiomeId.ABYSS, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.ZYGARDE, PokemonType.DRAGON, PokemonType.GROUND, [
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.DIANCIE, PokemonType.ROCK, PokemonType.FAIRY, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.HOOPA, PokemonType.PSYCHIC, PokemonType.GHOST, [
      [ BiomeId.TEMPLE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.TEMPLE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.VOLCANION, PokemonType.FIRE, PokemonType.WATER, [
      [ BiomeId.SPA, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ROWLET, PokemonType.GRASS, PokemonType.FLYING, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.DARTRIX, PokemonType.GRASS, PokemonType.FLYING, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.DECIDUEYE, PokemonType.GRASS, PokemonType.GHOST, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.LITTEN, PokemonType.FIRE, -1, [
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.TORRACAT, PokemonType.FIRE, -1, [
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.INCINEROAR, PokemonType.FIRE, PokemonType.DARK, [
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.POPPLIO, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.BRIONNE, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.PRIMARINA, PokemonType.WATER, PokemonType.FAIRY, [
      [ BiomeId.SEA, BiomePoolTier.RARE ],
      [ BiomeId.SEA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.PIKIPEK, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.TRUMBEAK, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.TOUCANNON, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.JUNGLE, BiomePoolTier.COMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.YUNGOOS, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.GUMSHOOS, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.GRUBBIN, PokemonType.BUG, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.CHARJABUG, PokemonType.BUG, PokemonType.ELECTRIC, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.VIKAVOLT, PokemonType.BUG, PokemonType.ELECTRIC, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.CRABRAWLER, PokemonType.FIGHTING, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.CRABOMINABLE, PokemonType.FIGHTING, PokemonType.ICE, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ORICORIO, PokemonType.FIRE, PokemonType.FLYING, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CUTIEFLY, PokemonType.BUG, PokemonType.FAIRY, [
      [ BiomeId.MEADOW, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.RIBOMBEE, PokemonType.BUG, PokemonType.FAIRY, [
      [ BiomeId.MEADOW, BiomePoolTier.COMMON ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ROCKRUFF, PokemonType.ROCK, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, TimeOfDay.DAY ],
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.CAVE, BiomePoolTier.UNCOMMON, TimeOfDay.DUSK ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.LYCANROC, PokemonType.ROCK, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, TimeOfDay.DAY ],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS_RARE, TimeOfDay.DAY ],
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS_RARE, TimeOfDay.NIGHT ],
      [ BiomeId.CAVE, BiomePoolTier.UNCOMMON, TimeOfDay.DUSK ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS_RARE, TimeOfDay.DUSK ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.WISHIWASHI, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MAREANIE, PokemonType.POISON, PokemonType.WATER, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.TOXAPEX, PokemonType.POISON, PokemonType.WATER, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS ],
      [ BiomeId.SWAMP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MUDBRAY, PokemonType.GROUND, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MUDSDALE, PokemonType.GROUND, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.COMMON ],
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DEWPIDER, PokemonType.WATER, PokemonType.BUG, [
      [ BiomeId.LAKE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.ARAQUANID, PokemonType.WATER, PokemonType.BUG, [
      [ BiomeId.LAKE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LAKE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.FOMANTIS, PokemonType.GRASS, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.LURANTIS, PokemonType.GRASS, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS ],
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MORELULL, PokemonType.GRASS, PokemonType.FAIRY, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SHIINOTIC, PokemonType.GRASS, PokemonType.FAIRY, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SALANDIT, PokemonType.POISON, PokemonType.FIRE, [
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SALAZZLE, PokemonType.POISON, PokemonType.FIRE, [
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.STUFFUL, PokemonType.NORMAL, PokemonType.FIGHTING, [
      [ BiomeId.DOJO, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.BEWEAR, PokemonType.NORMAL, PokemonType.FIGHTING, [
      [ BiomeId.DOJO, BiomePoolTier.COMMON ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BOUNSWEET, PokemonType.GRASS, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.STEENEE, PokemonType.GRASS, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.TSAREENA, PokemonType.GRASS, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.COMFEY, PokemonType.FAIRY, -1, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ORANGURU, PokemonType.NORMAL, PokemonType.PSYCHIC, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.PASSIMIAN, PokemonType.FIGHTING, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.WIMPOD, PokemonType.BUG, PokemonType.WATER, [
      [ BiomeId.CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GOLISOPOD, PokemonType.BUG, PokemonType.WATER, [
      [ BiomeId.CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SANDYGAST, PokemonType.GHOST, PokemonType.GROUND, [
      [ BiomeId.BEACH, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.PALOSSAND, PokemonType.GHOST, PokemonType.GROUND, [
      [ BiomeId.BEACH, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PYUKUMUKU, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.TYPE_NULL, PokemonType.NORMAL, -1, [
      [ BiomeId.LABORATORY, BiomePoolTier.ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.SILVALLY, PokemonType.NORMAL, -1, [
      [ BiomeId.LABORATORY, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.MINIOR, PokemonType.ROCK, PokemonType.FLYING, [
      [ BiomeId.SPACE, BiomePoolTier.COMMON ],
      [ BiomeId.SPACE, BiomePoolTier.BOSS ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.KOMALA, PokemonType.NORMAL, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.TURTONATOR, PokemonType.FIRE, PokemonType.DRAGON, [
      [ BiomeId.VOLCANO, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TOGEDEMARU, PokemonType.ELECTRIC, PokemonType.STEEL, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MIMIKYU, PokemonType.GHOST, PokemonType.FAIRY, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.RARE ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.BRUXISH, PokemonType.WATER, PokemonType.PSYCHIC, [
      [ BiomeId.ISLAND, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DRAMPA, PokemonType.NORMAL, PokemonType.DRAGON, [
      [ BiomeId.WASTELAND, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DHELMISE, PokemonType.GHOST, PokemonType.GRASS, [
      [ BiomeId.SEABED, BiomePoolTier.RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.JANGMO_O, PokemonType.DRAGON, -1, [
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.HAKAMO_O, PokemonType.DRAGON, PokemonType.FIGHTING, [
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.KOMMO_O, PokemonType.DRAGON, PokemonType.FIGHTING, [
      [ BiomeId.WASTELAND, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.TAPU_KOKO, PokemonType.ELECTRIC, PokemonType.FAIRY, [
      [ BiomeId.TEMPLE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.TEMPLE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.TAPU_LELE, PokemonType.PSYCHIC, PokemonType.FAIRY, [
      [ BiomeId.JUNGLE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.TAPU_BULU, PokemonType.GRASS, PokemonType.FAIRY, [
      [ BiomeId.DESERT, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.TAPU_FINI, PokemonType.WATER, PokemonType.FAIRY, [
      [ BiomeId.GHOST_SHIP, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.COSMOG, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SPACE, BiomePoolTier.ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.COSMOEM, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SPACE, BiomePoolTier.ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.SOLGALEO, PokemonType.PSYCHIC, PokemonType.STEEL, [
      [ BiomeId.SPACE, BiomePoolTier.BOSS_ULTRA_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.LUNALA, PokemonType.PSYCHIC, PokemonType.GHOST, [
      [ BiomeId.SPACE, BiomePoolTier.BOSS_ULTRA_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.NIHILEGO, PokemonType.ROCK, PokemonType.POISON, [
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.BUZZWOLE, PokemonType.BUG, PokemonType.FIGHTING, [
      [ BiomeId.LOG_CAVE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.PHEROMOSA, PokemonType.BUG, PokemonType.FIGHTING, [
      [ BiomeId.DESERT, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.XURKITREE, PokemonType.ELECTRIC, -1, [
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.CELESTEELA, PokemonType.STEEL, PokemonType.FLYING, [
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.KARTANA, PokemonType.GRASS, PokemonType.STEEL, [
      [ BiomeId.FOREST, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GUZZLORD, PokemonType.DARK, PokemonType.DRAGON, [
      [ BiomeId.SLUM, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SLUM, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.NECROZMA, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SPACE, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.MAGEARNA, PokemonType.STEEL, PokemonType.FAIRY, [
      [ BiomeId.FACTORY, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.FACTORY, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.MARSHADOW, PokemonType.FIGHTING, PokemonType.GHOST, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.POIPOLE, PokemonType.POISON, -1, [
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.NAGANADEL, PokemonType.POISON, PokemonType.DRAGON, [
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.STAKATAKA, PokemonType.ROCK, PokemonType.STEEL, [
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.BLACEPHALON, PokemonType.FIRE, PokemonType.GHOST, [
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ZERAORA, PokemonType.ELECTRIC, -1, [
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.MELTAN, PokemonType.STEEL, -1, [ 
      [ BiomeId.FACTORY, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.MELMETAL, PokemonType.STEEL, -1, [ 
      [ BiomeId.FACTORY, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.GROOKEY, PokemonType.GRASS, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.THWACKEY, PokemonType.GRASS, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.RILLABOOM, PokemonType.GRASS, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SCORBUNNY, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.RABOOT, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.CINDERACE, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SOBBLE, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.DRIZZILE, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.INTELEON, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.RARE ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SKWOVET, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.GREEDENT, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.ROOKIDEE, PokemonType.FLYING, -1, [
      [ BiomeId.TOWN, BiomePoolTier.RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.CORVISQUIRE, PokemonType.FLYING, -1, [
      [ BiomeId.TOWN, BiomePoolTier.RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.CORVIKNIGHT, PokemonType.FLYING, PokemonType.STEEL, [
      [ BiomeId.TOWN, BiomePoolTier.RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BLIPBUG, PokemonType.BUG, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DOTTLER, PokemonType.BUG, PokemonType.PSYCHIC, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ORBEETLE, PokemonType.BUG, PokemonType.PSYCHIC, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.NICKIT, PokemonType.DARK, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.THIEVUL, PokemonType.DARK, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GOSSIFLEUR, PokemonType.GRASS, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ELDEGOSS, PokemonType.GRASS, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.WOOLOO, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.MEADOW, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DUBWOOL, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.MEADOW, BiomePoolTier.COMMON ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CHEWTLE, PokemonType.WATER, -1, [
      [ BiomeId.LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DREDNAW, PokemonType.WATER, PokemonType.ROCK, [
      [ BiomeId.LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.COMMON ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.YAMPER, PokemonType.ELECTRIC, -1, [
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.BOLTUND, PokemonType.ELECTRIC, -1, [
      [ BiomeId.METROPOLIS, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.METROPOLIS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ROLYCOLY, PokemonType.ROCK, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.CARKOL, PokemonType.ROCK, PokemonType.FIRE, [
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.COALOSSAL, PokemonType.ROCK, PokemonType.FIRE, [
      [ BiomeId.VOLCANO, BiomePoolTier.COMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.APPLIN, PokemonType.GRASS, PokemonType.DRAGON, [
      [ BiomeId.MEADOW, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.FLAPPLE, PokemonType.GRASS, PokemonType.DRAGON, [
      [ BiomeId.MEADOW, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.APPLETUN, PokemonType.GRASS, PokemonType.DRAGON, [
      [ BiomeId.MEADOW, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SILICOBRA, PokemonType.GROUND, -1, [
      [ BiomeId.DESERT, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.SANDACONDA, PokemonType.GROUND, -1, [
      [ BiomeId.DESERT, BiomePoolTier.COMMON ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CRAMORANT, PokemonType.FLYING, PokemonType.WATER, [
      [ BiomeId.SEA, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SEA, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.ARROKUDA, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.BARRASKEWDA, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.COMMON ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TOXEL, PokemonType.ELECTRIC, PokemonType.POISON, [ 
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SLUM, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.TOXTRICITY, PokemonType.ELECTRIC, PokemonType.POISON, [
      [ BiomeId.SLUM, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SLUM, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SIZZLIPEDE, PokemonType.FIRE, PokemonType.BUG, [
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.CENTISKORCH, PokemonType.FIRE, PokemonType.BUG, [
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.COMMON ],
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS ],
      [ BiomeId.SEWER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CANYON, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CLOBBOPUS, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.COMMON ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GRAPPLOCT, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.COMMON ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SINISTEA, PokemonType.GHOST, -1, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.POLTEAGEIST, PokemonType.GHOST, -1, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.HATENNA, PokemonType.PSYCHIC, -1, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.HATTREM, PokemonType.PSYCHIC, -1, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.HATTERENE, PokemonType.PSYCHIC, PokemonType.FAIRY, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.IMPIDIMP, PokemonType.DARK, PokemonType.FAIRY, [
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.MORGREM, PokemonType.DARK, PokemonType.FAIRY, [
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GRIMMSNARL, PokemonType.DARK, PokemonType.FAIRY, [
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.OBSTAGOON, PokemonType.DARK, PokemonType.NORMAL, [
      [ BiomeId.SLUM, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SLUM, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PERRSERKER, PokemonType.STEEL, -1, [
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.RARE, TimeOfDay.DUSK ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS_RARE, TimeOfDay.DUSK ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.CURSOLA, PokemonType.GHOST, -1, [
      [ BiomeId.SEABED, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SIRFETCHD, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MR_RIME, PokemonType.ICE, PokemonType.PSYCHIC, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.RUNERIGUS, PokemonType.GROUND, PokemonType.GHOST, [
      [ BiomeId.RUINS, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.RUINS, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MILCERY, PokemonType.FAIRY, -1, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ALCREMIE, PokemonType.FAIRY, -1, [
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.FALINKS, PokemonType.FIGHTING, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PINCURCHIN, PokemonType.ELECTRIC, -1, [
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SNOM, PokemonType.ICE, PokemonType.BUG, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.FROSMOTH, PokemonType.ICE, PokemonType.BUG, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.STONJOURNER, PokemonType.ROCK, -1, [
      [ BiomeId.RUINS, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.DESERT, BiomePoolTier.RARE ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.EISCUE, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.INDEEDEE, PokemonType.PSYCHIC, PokemonType.NORMAL, [
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.MORPEKO, PokemonType.ELECTRIC, PokemonType.DARK, [
      [ BiomeId.METROPOLIS, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]]
    ]
    ],
    [ SpeciesId.CUFANT, PokemonType.STEEL, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.COPPERAJAH, PokemonType.STEEL, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DRACOZOLT, PokemonType.ELECTRIC, PokemonType.DRAGON, [
      [ BiomeId.WASTELAND, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.ARCTOZOLT, PokemonType.ELECTRIC, PokemonType.ICE, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.DRACOVISH, PokemonType.WATER, PokemonType.DRAGON, [
      [ BiomeId.WASTELAND, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.ARCTOVISH, PokemonType.WATER, PokemonType.ICE, [
      [ BiomeId.SEABED, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.DURALUDON, PokemonType.STEEL, PokemonType.DRAGON, [
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.DREEPY, PokemonType.DRAGON, PokemonType.GHOST, [
      [ BiomeId.WASTELAND, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.DRAKLOAK, PokemonType.DRAGON, PokemonType.GHOST, [
      [ BiomeId.WASTELAND, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.DRAGAPULT, PokemonType.DRAGON, PokemonType.GHOST, [
      [ BiomeId.WASTELAND, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.ZACIAN, PokemonType.FAIRY, -1, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.ZAMAZENTA, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.ETERNATUS, PokemonType.POISON, PokemonType.DRAGON, [
      [ BiomeId.END, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.KUBFU, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.URSHIFU, PokemonType.FIGHTING, PokemonType.DARK, [
      [ BiomeId.DOJO, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ZARUDE, PokemonType.DARK, PokemonType.GRASS, [
      [ BiomeId.JUNGLE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.REGIELEKI, PokemonType.ELECTRIC, -1, [
      [ BiomeId.SPARK_CAVE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.REGIDRAGO, PokemonType.DRAGON, -1, [
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GLASTRIER, PokemonType.ICE, -1, [
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SPECTRIER, PokemonType.GHOST, -1, [
      [ BiomeId.BLACK_FIELD, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.CALYREX, PokemonType.PSYCHIC, PokemonType.GRASS, [
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.WYRDEER, PokemonType.NORMAL, PokemonType.PSYCHIC, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.KLEAVOR, PokemonType.BUG, PokemonType.ROCK, [
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.URSALUNA, PokemonType.GROUND, PokemonType.NORMAL, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.BASCULEGION, PokemonType.WATER, PokemonType.GHOST, [
      [ BiomeId.SEABED, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RIVER, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.SNEASLER, PokemonType.FIGHTING, PokemonType.POISON, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.OVERQWIL, PokemonType.DARK, PokemonType.POISON, [
      [ BiomeId.SEABED, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.ENAMORUS, PokemonType.FAIRY, PokemonType.FLYING, [
      [ BiomeId.CASTLE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SPRIGATITO, PokemonType.GRASS, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.FLORAGATO, PokemonType.GRASS, -1, [
      [ BiomeId.MEADOW, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.MEOWSCARADA, PokemonType.GRASS, PokemonType.DARK, [
      [ BiomeId.MEADOW, BiomePoolTier.RARE ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.FUECOCO, PokemonType.FIRE, -1, [
      [ BiomeId.LAVA_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.CROCALOR, PokemonType.FIRE, -1, [
      [ BiomeId.LAVA_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.SKELEDIRGE, PokemonType.FIRE, PokemonType.GHOST, [
      [ BiomeId.LAVA_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.RARE ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.QUAXLY, PokemonType.WATER, -1, [
      [ BiomeId.BEACH, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.QUAXWELL, PokemonType.WATER, -1, [
      [ BiomeId.BEACH, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.QUAQUAVAL, PokemonType.WATER, PokemonType.FIGHTING, [
      [ BiomeId.BEACH, BiomePoolTier.RARE ],
      [ BiomeId.BEACH, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.LECHONK, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.OINKOLOGNE, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.COMMON ],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TAROUNTULA, PokemonType.BUG, -1, [
      [ BiomeId.FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.SPIDOPS, PokemonType.BUG, -1, [
      [ BiomeId.FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.NYMBLE, PokemonType.BUG, -1, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.LOKIX, PokemonType.BUG, PokemonType.DARK, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.COMMON ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS ],
      [ BiomeId.FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PAWMI, PokemonType.ELECTRIC, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.PAWMO, PokemonType.ELECTRIC, PokemonType.FIGHTING, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.PAWMOT, PokemonType.ELECTRIC, PokemonType.FIGHTING, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.LIGHTNING_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TANDEMAUS, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.METROPOLIS, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.MAUSHOLD, PokemonType.NORMAL, -1, [
      [ BiomeId.TOWN, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.METROPOLIS, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.METROPOLIS, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.FIDOUGH, PokemonType.FAIRY, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DACHSBUN, PokemonType.FAIRY, -1, [
      [ BiomeId.TOWN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.METROPOLIS, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.COMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SMOLIV, PokemonType.GRASS, PokemonType.NORMAL, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DOLLIV, PokemonType.GRASS, PokemonType.NORMAL, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ARBOLIVA, PokemonType.GRASS, PokemonType.NORMAL, [
      [ BiomeId.MEADOW, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SQUAWKABILLY, PokemonType.NORMAL, PokemonType.FLYING, [
      [ BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SLUM, BiomePoolTier.RARE ],
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.NACLI, PokemonType.ROCK, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.NACLSTACK, PokemonType.ROCK, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GARGANACL, PokemonType.ROCK, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CHARCADET, PokemonType.FIRE, -1, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.ARMAROUGE, PokemonType.FIRE, PokemonType.PSYCHIC, [
      [ BiomeId.VOLCANO, BiomePoolTier.RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.CERULEDGE, PokemonType.FIRE, PokemonType.GHOST, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.RARE ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.TADBULB, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.BELLIBOLT, PokemonType.ELECTRIC, -1, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.COMMON ],
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.WATTREL, PokemonType.ELECTRIC, PokemonType.FLYING, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.KILOWATTREL, PokemonType.ELECTRIC, PokemonType.FLYING, [
      [ BiomeId.SEA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEA, BiomePoolTier.BOSS ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.MASCHIFF, PokemonType.DARK, -1, [
      [ BiomeId.SLUM, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.MABOSSTIFF, PokemonType.DARK, -1, [
      [ BiomeId.SLUM, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.SHROODLE, PokemonType.POISON, PokemonType.NORMAL, [
      [ BiomeId.FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GRAFAIAI, PokemonType.POISON, PokemonType.NORMAL, [
      [ BiomeId.FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BRAMBLIN, PokemonType.GRASS, PokemonType.GHOST, [
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.BRAMBLEGHAST, PokemonType.GRASS, PokemonType.GHOST, [
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TOEDSCOOL, PokemonType.GROUND, PokemonType.GRASS, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.TOEDSCRUEL, PokemonType.GROUND, PokemonType.GRASS, [
      [ BiomeId.FOREST, BiomePoolTier.RARE ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.KLAWF, PokemonType.ROCK, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ], 
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CAPSAKID, PokemonType.GRASS, -1, [
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.SCOVILLAIN, PokemonType.GRASS, PokemonType.FIRE, [
      [ BiomeId.BADLANDS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLAZE_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CANYON, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.RELLOR, PokemonType.BUG, -1, [
      [ BiomeId.DESERT, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.RABSCA, PokemonType.BUG, PokemonType.PSYCHIC, [
      [ BiomeId.DESERT, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.DESERT, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SAND_CAVE, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.FLITTLE, PokemonType.PSYCHIC, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.ESPATHRA, PokemonType.PSYCHIC, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.TINKATINK, PokemonType.FAIRY, PokemonType.STEEL, [
      [ BiomeId.RUINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.TINKATUFF, PokemonType.FAIRY, PokemonType.STEEL, [
      [ BiomeId.RUINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.TINKATON, PokemonType.FAIRY, PokemonType.STEEL, [
      [ BiomeId.RUINS, BiomePoolTier.UNCOMMON ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.WIGLETT, PokemonType.WATER, -1, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.WUGTRIO, PokemonType.WATER, -1, [
      [ BiomeId.BEACH, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BOMBIRDIER, PokemonType.FLYING, PokemonType.DARK, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.FINIZEN, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.PALAFIN, PokemonType.WATER, -1, [
      [ BiomeId.SEA, BiomePoolTier.COMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SEA, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.VAROOM, PokemonType.STEEL, PokemonType.POISON, [
      [ BiomeId.METROPOLIS, BiomePoolTier.RARE ],
      [ BiomeId.SLUM, BiomePoolTier.RARE ],
      [ BiomeId.SEWER, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.REVAVROOM, PokemonType.STEEL, PokemonType.POISON, [
      [ BiomeId.METROPOLIS, BiomePoolTier.RARE ],
      [ BiomeId.METROPOLIS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SLUM, BiomePoolTier.RARE ],
      [ BiomeId.SEWER, BiomePoolTier.RARE ],
      [ BiomeId.SEWER, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SLUM, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CYCLIZAR, PokemonType.DRAGON, PokemonType.NORMAL, [
      [ BiomeId.WASTELAND, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ORTHWORM, PokemonType.STEEL, -1, [
      [ BiomeId.DESERT, BiomePoolTier.UNCOMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GLIMMET, PokemonType.ROCK, PokemonType.POISON, [
      [ BiomeId.CAVE, BiomePoolTier.RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.GLIMMORA, PokemonType.ROCK, PokemonType.POISON, [
      [ BiomeId.CAVE, BiomePoolTier.RARE ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.POLLUTED_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.GREAVARD, PokemonType.GHOST, -1, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.HOUNDSTONE, PokemonType.GHOST, -1, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.COMMON ],
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.COMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.FLAMIGO, PokemonType.FLYING, PokemonType.FIGHTING, [
      [ BiomeId.LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.RARE ],
      [ BiomeId.SKY, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CETODDLE, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.CETITAN, PokemonType.ICE, -1, [
      [ BiomeId.ICE_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ICE_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.VELUZA, PokemonType.WATER, PokemonType.PSYCHIC, [
      [ BiomeId.SEABED, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.DONDOZO, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SEABED, BiomePoolTier.BOSS ],
      [ BiomeId.RIVER, BiomePoolTier.RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.RARE ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.TATSUGIRI, PokemonType.DRAGON, PokemonType.WATER, [
      [ BiomeId.BEACH, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ANNIHILAPE, PokemonType.FIGHTING, PokemonType.GHOST, [
      [ BiomeId.PLAINS, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.DOJO, BiomePoolTier.COMMON ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.SPA, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SPA, BiomePoolTier.BOSS ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.CLODSIRE, PokemonType.POISON, PokemonType.GROUND, [
      [ BiomeId.SWAMP, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.FARIGIRAF, PokemonType.NORMAL, PokemonType.PSYCHIC, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.RARE ],
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.DUDUNSPARCE, PokemonType.NORMAL, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.ABYSS, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.KINGAMBIT, PokemonType.DARK, PokemonType.STEEL, [
      [ BiomeId.TALL_GRASS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SLUM, BiomePoolTier.RARE ],
      [ BiomeId.ABYSS, BiomePoolTier.COMMON ],
      [ BiomeId.ABYSS, BiomePoolTier.BOSS ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],  
      [ BiomeId.CANYON, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GREAT_TUSK, PokemonType.GROUND, PokemonType.FIGHTING, [
      [ BiomeId.END, BiomePoolTier.COMMON ],
      [ BiomeId.DESERT, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.SCREAM_TAIL, PokemonType.FAIRY, PokemonType.PSYCHIC, [
      [ BiomeId.END, BiomePoolTier.COMMON ],
      [ BiomeId.MEADOW, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.BRUTE_BONNET, PokemonType.GRASS, PokemonType.DARK, [
      [ BiomeId.END, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.FLUTTER_MANE, PokemonType.GHOST, PokemonType.FAIRY, [
      [ BiomeId.END, BiomePoolTier.COMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.SLITHER_WING, PokemonType.BUG, PokemonType.FIGHTING, [
      [ BiomeId.END, BiomePoolTier.COMMON ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.SANDY_SHOCKS, PokemonType.ELECTRIC, PokemonType.GROUND, [
      [ BiomeId.END, BiomePoolTier.COMMON ],  
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS_ULTRA_RARE ] 
    ]
    ],
    [ SpeciesId.IRON_TREADS, PokemonType.GROUND, PokemonType.STEEL, [
      [ BiomeId.END, BiomePoolTier.COMMON ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.IRON_BUNDLE, PokemonType.ICE, PokemonType.WATER, [
      [ BiomeId.END, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.IRON_HANDS, PokemonType.FIGHTING, PokemonType.ELECTRIC, [
      [ BiomeId.END, BiomePoolTier.COMMON ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.IRON_JUGULIS, PokemonType.DARK, PokemonType.FLYING, [
      [ BiomeId.END, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.IRON_MOTH, PokemonType.FIRE, PokemonType.POISON, [
      [ BiomeId.END, BiomePoolTier.COMMON ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.IRON_THORNS, PokemonType.ROCK, PokemonType.ELECTRIC, [
      [ BiomeId.END, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.FRIGIBAX, PokemonType.DRAGON, PokemonType.ICE, [
      [ BiomeId.WASTELAND, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.ARCTIBAX, PokemonType.DRAGON, PokemonType.ICE, [
      [ BiomeId.WASTELAND, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.BAXCALIBUR, PokemonType.DRAGON, PokemonType.ICE, [
      [ BiomeId.WASTELAND, BiomePoolTier.RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.GIMMIGHOUL, PokemonType.GHOST, -1, [
      [ BiomeId.TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.GHOLDENGO, PokemonType.STEEL, PokemonType.GHOST, [
      [ BiomeId.TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.WO_CHIEN, PokemonType.DARK, PokemonType.GRASS, [
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.CHIEN_PAO, PokemonType.DARK, PokemonType.ICE, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.TING_LU, PokemonType.DARK, PokemonType.GROUND, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.CHI_YU, PokemonType.DARK, PokemonType.FIRE, [
      [ BiomeId.LAVA_LAKE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.LAVA_LAKE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ROARING_MOON, PokemonType.DRAGON, PokemonType.DARK, [
      [ BiomeId.END, BiomePoolTier.UNCOMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.IRON_VALIANT, PokemonType.FAIRY, PokemonType.FIGHTING, [
      [ BiomeId.END, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.KORAIDON, PokemonType.FIGHTING, PokemonType.DRAGON, [
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.MIRAIDON, PokemonType.ELECTRIC, PokemonType.DRAGON, [
      [ BiomeId.LABORATORY, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.WALKING_WAKE, PokemonType.WATER, PokemonType.DRAGON, [
      [ BiomeId.END, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.IRON_LEAVES, PokemonType.GRASS, PokemonType.PSYCHIC, [
      [ BiomeId.END, BiomePoolTier.RARE ],
      [ BiomeId.GRASS, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.DIPPLIN, PokemonType.GRASS, PokemonType.DRAGON, [
      [ BiomeId.MEADOW, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.POLTCHAGEIST, PokemonType.GRASS, PokemonType.GHOST, [
      [ BiomeId.BADLANDS, BiomePoolTier.RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.SINISTCHA, PokemonType.GRASS, PokemonType.GHOST, [
      [ BiomeId.BADLANDS, BiomePoolTier.RARE ],
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPA, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPA, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.OKIDOGI, PokemonType.POISON, PokemonType.FIGHTING, [
      [ BiomeId.BADLANDS, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.BADLANDS, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.MUNKIDORI, PokemonType.POISON, PokemonType.PSYCHIC, [
      [ BiomeId.JUNGLE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.FEZANDIPITI, PokemonType.POISON, PokemonType.FAIRY, [
      [ BiomeId.RUINS, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.RUINS, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.OGERPON, PokemonType.GRASS, -1, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ARCHALUDON, PokemonType.STEEL, PokemonType.DRAGON, [
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SAND_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HYDRAPPLE, PokemonType.GRASS, PokemonType.DRAGON, [
      [ BiomeId.MEADOW, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GREEN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.UNCOMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GOUGING_FIRE, PokemonType.FIRE, PokemonType.DRAGON, [
      [ BiomeId.END, BiomePoolTier.RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.INFERNO_FOREST, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.RAGING_BOLT, PokemonType.ELECTRIC, PokemonType.DRAGON, [
      [ BiomeId.END, BiomePoolTier.RARE ],
      [ BiomeId.WASTELAND, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.IRON_BOULDER, PokemonType.ROCK, PokemonType.PSYCHIC, [
      [ BiomeId.END, BiomePoolTier.RARE ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.IRON_CROWN, PokemonType.STEEL, PokemonType.PSYCHIC, [
      [ BiomeId.END, BiomePoolTier.RARE ],
      [ BiomeId.CAVE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.TERAPAGOS, PokemonType.NORMAL, -1, [
      [ BiomeId.CAVE, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.PECHARUNT, PokemonType.POISON, PokemonType.GHOST, [ 
      [ BiomeId.SWAMP, BiomePoolTier.BOSS_ULTRA_RARE ]
    ]
    ],
    [ SpeciesId.ALOLA_RATTATA, PokemonType.DARK, PokemonType.NORMAL, [
      [BiomeId.SLUM, BiomePoolTier.UNCOMMON],
      [ BiomeId.ISLAND, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ALOLA_RATICATE, PokemonType.DARK, PokemonType.NORMAL, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [BiomeId.SLUM, BiomePoolTier.UNCOMMON],
      [BiomeId.SLUM, BiomePoolTier.BOSS]
    ]
    ],
    [ SpeciesId.ALOLA_RAICHU, PokemonType.ELECTRIC, PokemonType.PSYCHIC, [
      [ BiomeId.ISLAND, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]]
    ]
    ],
    [ SpeciesId.ALOLA_SANDSHREW, PokemonType.ICE, PokemonType.STEEL, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ALOLA_SANDSLASH, PokemonType.ICE, PokemonType.STEEL, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ALOLA_VULPIX, PokemonType.ICE, -1, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ALOLA_NINETALES, PokemonType.ICE, PokemonType.FAIRY, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.COMMON ],
      [ BiomeId.GLACIER, BiomePoolTier.BOSS ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ALOLA_DIGLETT, PokemonType.GROUND, PokemonType.STEEL, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VOLCANO, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ALOLA_DUGTRIO, PokemonType.GROUND, PokemonType.STEEL, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.COMMON ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.BOSS ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ALOLA_MEOWTH, PokemonType.DARK, -1, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.ALOLA_PERSIAN, PokemonType.DARK, -1, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ALOLA_GEODUDE, PokemonType.ROCK, PokemonType.ELECTRIC, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ALOLA_GRAVELER, PokemonType.ROCK, PokemonType.ELECTRIC, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ALOLA_GOLEM, PokemonType.ROCK, PokemonType.ELECTRIC, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.THUNDER_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ALOLA_GRIMER, PokemonType.POISON, PokemonType.DARK, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.ALOLA_MUK, PokemonType.POISON, PokemonType.DARK, [
      [ BiomeId.ISLAND, BiomePoolTier.COMMON ],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ALOLA_EXEGGUTOR, PokemonType.GRASS, PokemonType.DRAGON, [
      [ BiomeId.ISLAND, BiomePoolTier.UNCOMMON, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.ALOLA_MAROWAK, PokemonType.FIRE, PokemonType.GHOST, [
      [ BiomeId.ISLAND, BiomePoolTier.UNCOMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.ISLAND, BiomePoolTier.BOSS, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.BATTLE_BOND_GRENINJA, PokemonType.WATER, PokemonType.DARK, [
      [ BiomeId.LAKE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.LAKE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.ETERNAL_FLOETTE, PokemonType.FAIRY, -1, [
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.GALAR_MEOWTH, PokemonType.STEEL, -1, [
      [ BiomeId.CONSTRUCTION_SITE, BiomePoolTier.RARE, TimeOfDay.DUSK ],
      [ BiomeId.SHARP_FIELD, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.GALAR_PONYTA, PokemonType.PSYCHIC, -1, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE, TimeOfDay.DAWN ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GALAR_RAPIDASH, PokemonType.PSYCHIC, PokemonType.FAIRY, [
      [ BiomeId.JUNGLE, BiomePoolTier.RARE, TimeOfDay.DAWN ],
      [ BiomeId.JUNGLE, BiomePoolTier.BOSS_RARE, TimeOfDay.DAWN ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GALAR_SLOWPOKE, PokemonType.PSYCHIC, -1, [
      [ BiomeId.SWAMP, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]], 
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GALAR_SLOWBRO, PokemonType.POISON, PokemonType.PSYCHIC, [
      [ BiomeId.SWAMP, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.GALAR_FARFETCHD, PokemonType.FIGHTING, -1, [
      [ BiomeId.DOJO, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GALAR_WEEZING, PokemonType.POISON, PokemonType.FAIRY, [
      [ BiomeId.SLUM, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.COMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.GALAR_MR_MIME, PokemonType.ICE, PokemonType.PSYCHIC, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.AMUSEMENT_PARK, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CASTLE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.COMMON ],
      [ BiomeId.STAR_MOUNTAIN, BiomePoolTier.BOSS ],
      [ BiomeId.GLACIER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GALAR_ARTICUNO, PokemonType.PSYCHIC, PokemonType.FLYING, [
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GALAR_ZAPDOS, PokemonType.FIGHTING, PokemonType.FLYING, [
      [ BiomeId.DOJO, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.DOJO, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GALAR_MOLTRES, PokemonType.DARK, PokemonType.FLYING, [
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.ULTRA_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS_SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GALAR_SLOWKING, PokemonType.POISON, PokemonType.PSYCHIC, [
      [ BiomeId.SWAMP, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.GALAR_CORSOLA, PokemonType.GHOST, -1, [
      [ BiomeId.SEABED, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.GALAR_ZIGZAGOON, PokemonType.DARK, PokemonType.NORMAL, [
      [ BiomeId.SLUM, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GALAR_LINOONE, PokemonType.DARK, PokemonType.NORMAL, [
      [ BiomeId.SLUM, BiomePoolTier.RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.GALAR_DARUMAKA, PokemonType.ICE, -1, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.GALAR_DARMANITAN, PokemonType.ICE, -1, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.GALAR_YAMASK, PokemonType.GROUND, PokemonType.GHOST, [
      [ BiomeId.RUINS, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.GALAR_STUNFISK, PokemonType.GROUND, PokemonType.STEEL, [
      [ BiomeId.SWAMP, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SPARK_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HISUI_GROWLITHE, PokemonType.FIRE, PokemonType.ROCK, [
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.HISUI_ARCANINE, PokemonType.FIRE, PokemonType.ROCK, [
      [ BiomeId.MAGMA_CAVERN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VOLCANO, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HISUI_VOLTORB, PokemonType.ELECTRIC, PokemonType.GRASS, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.HISUI_ELECTRODE, PokemonType.ELECTRIC, PokemonType.GRASS, [
      [ BiomeId.POWER_PLANT, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HISUI_TYPHLOSION, PokemonType.FIRE, PokemonType.GHOST, [
      [ BiomeId.GRAVEYARD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HISUI_QWILFISH, PokemonType.DARK, PokemonType.POISON, [
      [ BiomeId.SEABED, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.HISUI_SNEASEL, PokemonType.FIGHTING, PokemonType.POISON, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.UNCOMMON ],
      [ BiomeId.CANYON, BiomePoolTier.UNCOMMON ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.UNCOMMON ]
    ]
    ],
    [ SpeciesId.HISUI_SAMUROTT, PokemonType.WATER, PokemonType.DARK, [
      [ BiomeId.ABYSS, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HISUI_LILLIGANT, PokemonType.GRASS, PokemonType.FIGHTING, [
      [ BiomeId.MEADOW, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.UNCOMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.HISUI_BASCULIN, PokemonType.WATER, -1, [
      [ BiomeId.SEABED, BiomePoolTier.COMMON ],
      [ BiomeId.RIVER, BiomePoolTier.UNCOMMON ],
      [ BiomeId.GHOST_SHIP, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.HISUI_ZORUA, PokemonType.NORMAL, PokemonType.GHOST, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.RARE ]
    ]
    ],
    [ SpeciesId.HISUI_ZOROARK, PokemonType.NORMAL, PokemonType.GHOST, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.ABANDONED_CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.BLACK_FIELD, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DARK_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.RARE ],
      [ BiomeId.DESERTED_HOUSE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.RARE ],
      [ BiomeId.FAIRY_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HISUI_BRAVIARY, PokemonType.PSYCHIC, PokemonType.FLYING, [
      [ BiomeId.MOUNTAIN, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.CASTLE, BiomePoolTier.RARE ],
      [ BiomeId.CASTLE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.SKY, BiomePoolTier.UNCOMMON ],
      [ BiomeId.SKY, BiomePoolTier.BOSS ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.WYVERN_MOUNTAIN, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.CANYON, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.VORTEX_CAVE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HISUI_SLIGGOO, PokemonType.STEEL, PokemonType.DRAGON, [
      [ BiomeId.SWAMP, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ]
    ]
    ],
    [ SpeciesId.HISUI_GOODRA, PokemonType.STEEL, PokemonType.DRAGON, [
      [ BiomeId.SWAMP, BiomePoolTier.SUPER_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.SWAMP, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.LOG_CAVE, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.LOG_CAVE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_TEMPLE, BiomePoolTier.BOSS ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.MUSHROOM_FOREST, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.DRAKE_LAKE, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.DRAGON_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.HISUI_AVALUGG, PokemonType.ICE, PokemonType.ROCK, [
      [ BiomeId.SNOWY_FOREST, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOWY_FIELD, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.SNOW_MOUNTAIN, BiomePoolTier.SUPER_RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.RARE ],
      [ BiomeId.GLACIER_LAKE, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.HISUI_DECIDUEYE, PokemonType.GRASS, PokemonType.FIGHTING, [
      [ BiomeId.DOJO, BiomePoolTier.BOSS_RARE ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS_RARE ]
    ]
    ],
    [ SpeciesId.PALDEA_TAUROS, PokemonType.FIGHTING, -1, [
      [ BiomeId.PLAINS, BiomePoolTier.RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.PLAINS, BiomePoolTier.BOSS_RARE, [ TimeOfDay.DAWN, TimeOfDay.DAY ]],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.COMMON ],
      [ BiomeId.BAMBOO_FOREST, BiomePoolTier.BOSS ]
    ]
    ],
    [ SpeciesId.PALDEA_WOOPER, PokemonType.POISON, PokemonType.GROUND, [
      [ BiomeId.SWAMP, BiomePoolTier.COMMON, [ TimeOfDay.DUSK, TimeOfDay.NIGHT ]],
      [ BiomeId.POLLUTED_RIVER, BiomePoolTier.SUPER_RARE ]
    ]
    ],
    [ SpeciesId.BLOODMOON_URSALUNA, PokemonType.GROUND, PokemonType.NORMAL, [
      [ BiomeId.FOREST, BiomePoolTier.SUPER_RARE, TimeOfDay.NIGHT ],
      [ BiomeId.FOREST, BiomePoolTier.BOSS_RARE, TimeOfDay.NIGHT ]
    ]
    ]
  ];

  const trainerBiomes = [
    [TrainerType.ACE_TRAINER, [
      [BiomeId.PLAINS, BiomePoolTier.UNCOMMON],
      [BiomeId.GRASS, BiomePoolTier.UNCOMMON],
      [BiomeId.TALL_GRASS, BiomePoolTier.UNCOMMON],
      [BiomeId.SWAMP, BiomePoolTier.UNCOMMON],
      [BiomeId.BEACH, BiomePoolTier.UNCOMMON],
      [BiomeId.LAKE, BiomePoolTier.UNCOMMON],
      [BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON],
      [BiomeId.BADLANDS, BiomePoolTier.UNCOMMON],
      [BiomeId.CAVE, BiomePoolTier.UNCOMMON],
      [BiomeId.MEADOW, BiomePoolTier.UNCOMMON],
      [BiomeId.RUINS, BiomePoolTier.UNCOMMON],
      [BiomeId.ABYSS, BiomePoolTier.UNCOMMON],
      [BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON],
      [BiomeId.TEMPLE, BiomePoolTier.UNCOMMON]
    ]
    ],
    [TrainerType.ARTIST, [
      [BiomeId.METROPOLIS, BiomePoolTier.RARE]
    ]
    ],
    [TrainerType.BACKERS, []],
    [TrainerType.BACKPACKER, [
      [BiomeId.MOUNTAIN, BiomePoolTier.COMMON],
      [BiomeId.CAVE, BiomePoolTier.COMMON],
      [BiomeId.BADLANDS, BiomePoolTier.COMMON],
      [BiomeId.JUNGLE, BiomePoolTier.COMMON],
      [BiomeId.DESERT, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.BAKER, [
      [BiomeId.SLUM, BiomePoolTier.UNCOMMON],
      [BiomeId.MEADOW, BiomePoolTier.UNCOMMON]
    ]
    ],
    [TrainerType.BEAUTY, [
      [BiomeId.METROPOLIS, BiomePoolTier.COMMON],
      [BiomeId.MEADOW, BiomePoolTier.COMMON],
      [BiomeId.FAIRY_CAVE, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.BIKER, [
      [BiomeId.SLUM, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.BLACK_BELT, [
      [BiomeId.DOJO, BiomePoolTier.COMMON],
      [BiomeId.PLAINS, BiomePoolTier.RARE],
      [BiomeId.GRASS, BiomePoolTier.RARE],
      [BiomeId.SWAMP, BiomePoolTier.RARE],
      [BiomeId.BEACH, BiomePoolTier.RARE],
      [BiomeId.LAKE, BiomePoolTier.RARE],
      [BiomeId.MOUNTAIN, BiomePoolTier.COMMON],
      [BiomeId.CAVE, BiomePoolTier.UNCOMMON],
      [BiomeId.RUINS, BiomePoolTier.UNCOMMON]
    ]
    ],
    [TrainerType.BREEDER, [
      [BiomeId.PLAINS, BiomePoolTier.COMMON],
      [BiomeId.GRASS, BiomePoolTier.COMMON],
      [BiomeId.TALL_GRASS, BiomePoolTier.UNCOMMON],
      [BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON],
      [BiomeId.BEACH, BiomePoolTier.UNCOMMON],
      [BiomeId.LAKE, BiomePoolTier.COMMON],
      [BiomeId.MEADOW, BiomePoolTier.UNCOMMON],
      [BiomeId.FAIRY_CAVE, BiomePoolTier.UNCOMMON]
    ]
    ],
    [TrainerType.CLERK, [
      [BiomeId.METROPOLIS, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.CYCLIST, [
      [BiomeId.PLAINS, BiomePoolTier.UNCOMMON],
      [BiomeId.METROPOLIS, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.DANCER, []],
    [TrainerType.DEPOT_AGENT, [
      [BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON]
    ]
    ],
    [TrainerType.DOCTOR, []],
    [TrainerType.FIREBREATHER, [
      [BiomeId.VOLCANO, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.FISHERMAN, [
      [BiomeId.LAKE, BiomePoolTier.COMMON],
      [BiomeId.BEACH, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.GUITARIST, [
      [BiomeId.METROPOLIS, BiomePoolTier.UNCOMMON],
      [BiomeId.POWER_PLANT, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.HARLEQUIN, []],
    [TrainerType.HIKER, [
      [BiomeId.MOUNTAIN, BiomePoolTier.COMMON],
      [BiomeId.CAVE, BiomePoolTier.COMMON],
      [BiomeId.BADLANDS, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.HOOLIGANS, [
      [BiomeId.SLUM, BiomePoolTier.UNCOMMON]
    ]
    ],
    [TrainerType.HOOPSTER, []],
    [TrainerType.INFIELDER, []],
    [TrainerType.JANITOR, []],
    [TrainerType.LINEBACKER, []],
    [TrainerType.MAID, []],
    [TrainerType.MUSICIAN, [
      [BiomeId.MEADOW, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.HEX_MANIAC, [
      [BiomeId.RUINS, BiomePoolTier.UNCOMMON],
      [BiomeId.GRAVEYARD, BiomePoolTier.UNCOMMON]
    ]
    ],
    [TrainerType.NURSERY_AIDE, []],
    [TrainerType.OFFICER, [
      [BiomeId.METROPOLIS, BiomePoolTier.COMMON],
      [BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON],
      [BiomeId.SLUM, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.PARASOL_LADY, [
      [BiomeId.SWAMP, BiomePoolTier.COMMON],
      [BiomeId.LAKE, BiomePoolTier.COMMON],
      [BiomeId.MEADOW, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.PILOT, [
      [BiomeId.MOUNTAIN, BiomePoolTier.UNCOMMON]
    ]
    ],
    [TrainerType.POKEFAN, [
      [BiomeId.GRASS, BiomePoolTier.UNCOMMON],
      [BiomeId.MEADOW, BiomePoolTier.UNCOMMON]
    ]
    ],
    [TrainerType.PRESCHOOLER, []],
    [TrainerType.PSYCHIC, [
      [BiomeId.GRAVEYARD, BiomePoolTier.COMMON],
      [BiomeId.RUINS, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.RANGER, [
      [BiomeId.TALL_GRASS, BiomePoolTier.UNCOMMON],
      [BiomeId.FOREST, BiomePoolTier.COMMON],
      [BiomeId.JUNGLE, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.RICH, [
      [BiomeId.ISLAND, BiomePoolTier.UNCOMMON]
    ]
    ],
    [TrainerType.RICH_KID, [
      [BiomeId.METROPOLIS, BiomePoolTier.RARE],
      [BiomeId.ISLAND, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.ROUGHNECK, [
      [BiomeId.SLUM, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.SAILOR, [
      [BiomeId.SEA, BiomePoolTier.COMMON],
      [BiomeId.BEACH, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.SCIENTIST, [
      [BiomeId.DESERT, BiomePoolTier.COMMON],
      [BiomeId.RUINS, BiomePoolTier.COMMON],
      [BiomeId.LABORATORY, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.SMASHER, []],
    [TrainerType.SNOW_WORKER, [
      [BiomeId.ICE_CAVE, BiomePoolTier.COMMON],
      [BiomeId.SNOWY_FOREST, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.STRIKER, []],
    [TrainerType.SCHOOL_KID, [
      [BiomeId.GRASS, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.SWIMMER, [
      [BiomeId.SEA, BiomePoolTier.COMMON],
      [BiomeId.SEABED, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.TWINS, [
      [BiomeId.PLAINS, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.VETERAN, [
      [BiomeId.WASTELAND, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.WAITER, [
      [BiomeId.METROPOLIS, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.WORKER, [
      [BiomeId.POWER_PLANT, BiomePoolTier.COMMON],
      [BiomeId.FACTORY, BiomePoolTier.COMMON],
      [BiomeId.CONSTRUCTION_SITE, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.YOUNGSTER, [
      [BiomeId.TOWN, BiomePoolTier.COMMON]
    ]
    ],
    [TrainerType.BROCK, [
      [BiomeId.CAVE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.MISTY, [
      [BiomeId.BEACH, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.LT_SURGE, [
      [BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.ERIKA, [
      [BiomeId.GRASS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.JANINE, [
      [BiomeId.SWAMP, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.SABRINA, [
      [BiomeId.RUINS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.GIOVANNI, [
      [BiomeId.LABORATORY, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.BLAINE, [
      [BiomeId.VOLCANO, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.FALKNER, [
      [BiomeId.MOUNTAIN, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.BUGSY, [
      [BiomeId.FOREST, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.WHITNEY, [
      [BiomeId.METROPOLIS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.MORTY, [
      [BiomeId.GRAVEYARD, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.CHUCK, [
      [BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.JASMINE, [
      [BiomeId.FACTORY, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.PRYCE, [
      [BiomeId.ICE_CAVE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.CLAIR, [
      [BiomeId.WASTELAND, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.ROXANNE, [
      [BiomeId.CAVE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.BRAWLY, [
      [BiomeId.DOJO, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.WATTSON, [
      [BiomeId.CONSTRUCTION_SITE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.FLANNERY, [
      [BiomeId.VOLCANO, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.NORMAN, [
      [BiomeId.METROPOLIS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.WINONA, [
      [BiomeId.MOUNTAIN, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.TATE, [
      [BiomeId.RUINS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.LIZA, [
      [BiomeId.RUINS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.JUAN, [
      [BiomeId.SEABED, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.ROARK, [
      [BiomeId.CAVE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.GARDENIA, [
      [BiomeId.TALL_GRASS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.CRASHER_WAKE, [
      [BiomeId.LAKE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.MAYLENE, [
      [BiomeId.DOJO, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.FANTINA, [
      [BiomeId.TEMPLE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.BYRON, [
      [BiomeId.FACTORY, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.CANDICE, [
      [BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.VOLKNER, [
      [BiomeId.POWER_PLANT, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.CILAN, [
      [BiomeId.PLAINS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.CHILI, [
      [BiomeId.PLAINS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.CRESS, [
      [BiomeId.PLAINS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.CHEREN, [
      [BiomeId.PLAINS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.LENORA, [
      [BiomeId.MEADOW, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.ROXIE, [
      [BiomeId.SWAMP, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.BURGH, [
      [BiomeId.FOREST, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.ELESA, [
      [BiomeId.POWER_PLANT, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.CLAY, [
      [BiomeId.BADLANDS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.SKYLA, [
      [BiomeId.MOUNTAIN, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.BRYCEN, [
      [BiomeId.ICE_CAVE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.DRAYDEN, [
      [BiomeId.WASTELAND, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.MARLON, [
      [BiomeId.SEA, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.VIOLA, [
      [BiomeId.TALL_GRASS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.GRANT, [
      [BiomeId.BADLANDS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.KORRINA, [
      [BiomeId.DOJO, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.RAMOS, [
      [BiomeId.JUNGLE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.CLEMONT, [
      [BiomeId.POWER_PLANT, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.VALERIE, [
      [BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.OLYMPIA, [
      [BiomeId.SPACE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.WULFRIC, [
      [BiomeId.ICE_CAVE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.MILO, [
      [BiomeId.MEADOW, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.NESSA, [
      [BiomeId.ISLAND, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.KABU, [
      [BiomeId.VOLCANO, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.BEA, [
      [BiomeId.DOJO, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.ALLISTER, [
      [BiomeId.GRAVEYARD, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.OPAL, [
      [BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.BEDE, [
      [BiomeId.FAIRY_CAVE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.GORDIE, [
      [BiomeId.DESERT, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.MELONY, [
      [BiomeId.SNOWY_FOREST, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.PIERS, [
      [BiomeId.SLUM, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.MARNIE, [
      [BiomeId.ABYSS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.RAIHAN, [
      [BiomeId.WASTELAND, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.KATY, [
      [BiomeId.FOREST, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.BRASSIUS, [
      [BiomeId.TALL_GRASS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.IONO, [
      [BiomeId.METROPOLIS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.KOFU, [
      [BiomeId.BEACH, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.LARRY, [
      [BiomeId.METROPOLIS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.RYME, [
      [BiomeId.GRAVEYARD, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.TULIP, [
      [BiomeId.RUINS, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.GRUSHA, [
      [BiomeId.ICE_CAVE, BiomePoolTier.BOSS]
    ]
    ],
    [TrainerType.LORELEI, []],
    [TrainerType.BRUNO, []],
    [TrainerType.AGATHA, []],
    [TrainerType.LANCE, []],
    [TrainerType.WILL, []],
    [TrainerType.KOGA, []],
    [TrainerType.KAREN, []],
    [TrainerType.SIDNEY, []],
    [TrainerType.PHOEBE, []],
    [TrainerType.GLACIA, []],
    [TrainerType.DRAKE, []],
    [TrainerType.AARON, []],
    [TrainerType.BERTHA, []],
    [TrainerType.FLINT, []],
    [TrainerType.LUCIAN, []],
    [TrainerType.SHAUNTAL, []],
    [TrainerType.MARSHAL, []],
    [TrainerType.GRIMSLEY, []],
    [TrainerType.CAITLIN, []],
    [TrainerType.MALVA, []],
    [TrainerType.SIEBOLD, []],
    [TrainerType.WIKSTROM, []],
    [TrainerType.DRASNA, []],
    [TrainerType.HALA, []],
    [TrainerType.MOLAYNE, []],
    [TrainerType.OLIVIA, []],
    [TrainerType.ACEROLA, []],
    [TrainerType.KAHILI, []],
    [TrainerType.RIKA, []],
    [TrainerType.POPPY, []],
    [TrainerType.LARRY_ELITE, []],
    [TrainerType.HASSEL, []],
    [TrainerType.CRISPIN, []],
    [TrainerType.AMARYS, []],
    [TrainerType.LACEY, []],
    [TrainerType.DRAYTON, []],
    [TrainerType.BLUE, []],
    [TrainerType.RED, []],
    [TrainerType.LANCE_CHAMPION, []],
    [TrainerType.STEVEN, []],
    [TrainerType.WALLACE, []],
    [TrainerType.CYNTHIA, []],
    [TrainerType.ALDER, []],
    [TrainerType.IRIS, []],
    [TrainerType.DIANTHA, []],
    [TrainerType.KUKUI, []],
    [TrainerType.HAU, []],
    [TrainerType.LEON, []],
    [TrainerType.MUSTARD, []],
    [TrainerType.GEETA, []],
    [TrainerType.NEMONA, []],
    [TrainerType.KIERAN, []],
    [TrainerType.RIVAL, []]
  ];

  biomeDepths[BiomeId.TOWN] = [0, 1];

  const traverseBiome = (biome: BiomeId, depth: number) => {
    if (biome === BiomeId.END) {
      const biomeList = getEnumValues(BiomeId);
      biomeList.pop(); // Removes BiomeId.END from the list
      const randIndex = randSeedInt(biomeList.length, 1); // Will never be BiomeId.TOWN
      biome = biomeList[randIndex];
    }
    const linkedBiomes: (BiomeId | [BiomeId, number])[] = Array.isArray(biomeLinks[biome])
      ? biomeLinks[biome] as (BiomeId | [BiomeId, number])[]
      : [biomeLinks[biome] as BiomeId];
    for (const linkedBiomeEntry of linkedBiomes) {
      const linkedBiome = Array.isArray(linkedBiomeEntry)
        ? linkedBiomeEntry[0] : linkedBiomeEntry as BiomeId;
      const biomeChance = Array.isArray(linkedBiomeEntry)
        ? linkedBiomeEntry[1] : 1;
      if (!biomeDepths.hasOwnProperty(linkedBiome) || biomeChance < biomeDepths[linkedBiome][1] || (depth < biomeDepths[linkedBiome][0] && biomeChance === biomeDepths[linkedBiome][1])) {
        biomeDepths[linkedBiome] = [depth + 1, biomeChance];
        traverseBiome(linkedBiome, depth + 1);
      }
    }
  };

  traverseBiome(BiomeId.TOWN, 0);
  biomeDepths[BiomeId.END] = [Object.values(biomeDepths).map(d => d[0]).reduce((max: number, value: number) => Math.max(max, value), 0) + 1, 1];

  for (const biome of getEnumValues(BiomeId)) {
    (biomePokemonPools[biome] as Mutable<typeof biomePokemonPools[number]>) = {};
    (biomeTrainerPools[biome] as Mutable<typeof biomeTrainerPools[number]>) = {};

    for (const tier of getEnumValues(BiomePoolTier)) {
      (biomePokemonPools[biome][tier] as Mutable<typeof biomePokemonPools[number][number]>) = {};
      (biomeTrainerPools[biome][tier] as Mutable<typeof biomeTrainerPools[number][number]>) = [];

      for (const tod of getEnumValues(TimeOfDay)) {
        (biomePokemonPools[biome][tier][tod] as Mutable<typeof biomePokemonPools[number][number][number]>) = [];
      }
    }
  }

  for (const pb of pokemonBiomes) {
  const speciesId = pb[0];
  const biomeEntries = pb[3];

  if (Array.isArray(biomeEntries)) {
    const bad = biomeEntries.findIndex(b => !Array.isArray(b));
    if (bad !== -1) {
      console.log("[BAD BIOME ENTRY]", speciesId, "idx:", bad, "value:", biomeEntries[bad]);
      break;
    }
  }
}

  for (const pb of pokemonBiomes) {
    const speciesId = pb[0] as SpeciesId;
    const biomeEntries = pb[3] as (BiomeId | BiomePoolTier)[][];

    const speciesEvolutions: SpeciesFormEvolution[] = pokemonEvolutions.hasOwnProperty(speciesId)
      ? pokemonEvolutions[speciesId]
      : [];

    if (biomeEntries.filter(b => b[0] !== BiomeId.END).length === 0 && speciesEvolutions.filter(es => ((pokemonBiomes.find(p => p[0] === es.speciesId)!)[3] as any[]).filter(b => b[0] !== BiomeId.END).length > 0).length === 0) { // TODO: is the bang on the `find()` correct?
      uncatchableSpecies.push(speciesId);
    }

    type mutableSpecies = Mutable<typeof catchableSpecies[SpeciesId]>;
    // array of biome options for the current species
    (catchableSpecies[speciesId] as mutableSpecies) = [];

    for (const b of biomeEntries) {
      const biome = b[0];
      const tier = b[1];
      const timesOfDay = b.length > 2
        ? Array.isArray(b[2])
          ? b[2]
          : [b[2]]
        : [TimeOfDay.ALL];

      (catchableSpecies[speciesId] as mutableSpecies).push({
        biome: biome as BiomeId,
        tier: tier as BiomePoolTier,
        tod: timesOfDay as TimeOfDay[]
      });

      for (const tod of timesOfDay) {
        if (!biomePokemonPools.hasOwnProperty(biome) || !biomePokemonPools[biome].hasOwnProperty(tier) || !biomePokemonPools[biome][tier].hasOwnProperty(tod)) {
          continue;
        }

        const biomeTierPool = biomePokemonPools[biome][tier][tod];

        let treeIndex = -1;
        let arrayIndex = 0;

        for (let t = 0; t < biomeTierPool.length; t++) {
          const existingSpeciesIds = biomeTierPool[t] as unknown as SpeciesId[];
          for (let es = 0; es < existingSpeciesIds.length; es++) {
            const existingSpeciesId = existingSpeciesIds[es];
            if (pokemonEvolutions.hasOwnProperty(existingSpeciesId) && (pokemonEvolutions[existingSpeciesId] as SpeciesFormEvolution[]).find(ese => ese.speciesId === speciesId)) {
              treeIndex = t;
              arrayIndex = es + 1;
              break;
            }
            if (speciesEvolutions?.find(se => se.speciesId === existingSpeciesId)) {
              treeIndex = t;
              arrayIndex = es;
              break;
            }
          }
          if (treeIndex > -1) {
            break;
          }
        }

        if (treeIndex > -1) {
          (biomeTierPool[treeIndex] as unknown as SpeciesId[]).splice(arrayIndex, 0, speciesId);
        } else {
          (biomeTierPool as unknown as SpeciesId[][]).push([speciesId]);
        }
      }
    }
  }

  for (const b of Object.keys(biomePokemonPools)) {
    for (const t of Object.keys(biomePokemonPools[b])) {
      const tier = Number.parseInt(t) as BiomePoolTier;
      for (const tod of Object.keys(biomePokemonPools[b][t])) {
        const biomeTierTimePool = biomePokemonPools[b][t][tod];
        for (let e = 0; e < biomeTierTimePool.length; e++) {
          const entry = biomeTierTimePool[e];
          if (entry.length === 1) {
            biomeTierTimePool[e] = entry[0];
          } else {
            const newEntry = {
              1: [entry[0]]
            };
            for (let s = 1; s < entry.length; s++) {
              const speciesId = entry[s];
              const prevolution = entry.flatMap((s: string | number) => pokemonEvolutions[s]).find(e => e && e.speciesId === speciesId);
              const level = prevolution.level - (prevolution.level === 1 ? 1 : 0) + (prevolution?.evoLevelThreshold?.[EvoLevelThresholdKind.WILD] ?? 0) - (tier >= BiomePoolTier.BOSS ? 10 : 0);
              if (newEntry.hasOwnProperty(level)) {
                newEntry[level].push(speciesId);
              } else {
                newEntry[level] = [speciesId];
              }
            }
            biomeTierTimePool[e] = newEntry;
          }
        }
      }
    }
  }

  for (const tb of trainerBiomes) {
    const trainerType = tb[0] as TrainerType;
    const biomeEntries = tb[1] as BiomePoolTier[][];

    for (const b of biomeEntries) {
      const biome = b[0];
      const tier = b[1];

      if (!biomeTrainerPools.hasOwnProperty(biome) || !biomeTrainerPools[biome].hasOwnProperty(tier)) {
        continue;
      }

      const biomeTierPool = biomeTrainerPools[biome][tier];
      (biomeTierPool as Mutable<typeof biomeTierPool>).push(trainerType);
    }
    //outputPools();
  }


  // used in a commented code
  // function outputPools() {
  //   const pokemonOutput = {};
  //   const trainerOutput = {};
  //   for (const b of Object.keys(biomePokemonPools)) {
  //     const biome = BiomeId[b];
  //     pokemonOutput[biome] = {};
  //     trainerOutput[biome] = {};
  //     for (const t of Object.keys(biomePokemonPools[b])) {
  //       const tier = BiomePoolTier[t];
  //       pokemonOutput[biome][tier] = {};
  //       for (const tod of Object.keys(biomePokemonPools[b][t])) {
  //         const timeOfDay = TimeOfDay[tod];
  //         pokemonOutput[biome][tier][timeOfDay] = [];
  //         for (const f of biomePokemonPools[b][t][tod]) {
  //           if (typeof f === "number") {
  //             pokemonOutput[biome][tier][timeOfDay].push(SpeciesId[f]);
  //           } else {
  //             const tree = {};
  //             for (const l of Object.keys(f)) {
  //               tree[l] = f[l].map(s => SpeciesId[s]);
  //             }
  //             pokemonOutput[biome][tier][timeOfDay].push(tree);
  //           }
  //         }
  //       }
  //     }
  //     for (const t of Object.keys(biomeTrainerPools[b])) {
  //       const tier = BiomePoolTier[t];
  //       trainerOutput[biome][tier] = [];
  //       for (const f of biomeTrainerPools[b][t]) {
  //         trainerOutput[biome][tier].push(TrainerType[f]);
  //       }
  //     }
  //   }
  //   console.log(beautify(pokemonOutput, null, 2, 180).replace(/(        |        (?:\{ "\d+": \[ )?|    "(?:.*?)": \[ |(?:,|\[) (?:"\w+": \[ |(?:\{ )?"\d+": \[ )?)"(\w+)"(?= |,|\n)/g, "$1SpeciesId.$2").replace(/"(\d+)": /g, "$1: ").replace(/((?:      )|(?:(?!\n)    "(?:.*?)": \{) |\[(?: .*? )?\], )"(\w+)"/g, "$1[TimeOfDay.$2]").replace(/(    )"(.*?)"/g, "$1[BiomePoolTier.$2]").replace(/(  )"(.*?)"/g, "$1[BiomeId.$2]"));
  //   console.log(beautify(trainerOutput, null, 2, 120).replace(/(      |      (?:\{ "\d+": \[ )?|    "(?:.*?)": \[ |, (?:(?:\{ )?"\d+": \[ )?)"(.*?)"/g, "$1TrainerType.$2").replace(/"(\d+)": /g, "$1: ").replace(/(    )"(.*?)"/g, "$1[BiomePoolTier.$2]").replace(/(  )"(.*?)"/g, "$1[BiomeId.$2]"));
  // }
  /*for (let pokemon of allSpecies) {
    if (pokemon.speciesId >= SpeciesId.XERNEAS)
      break;
    pokemonBiomes[pokemon.speciesId - 1][0] = Species[pokemonBiomes[pokemon.speciesId - 1][0]];
    pokemonBiomes[pokemon.speciesId - 1][1] = Type[pokemonBiomes[pokemon.speciesId - 1][1]];
    if (pokemonBiomes[pokemon.speciesId - 1][2] > -1)
      pokemonBiomes[pokemon.speciesId - 1][2] = Type[pokemonBiomes[pokemon.speciesId - 1][2]];
    for (let b of Utils.getEnumValues(Biome)) {
      if (biomePools.hasOwnProperty(b)) {
        let poolTier = -1;
        for (let t of Object.keys(biomePools[b])) {
          for (let p = 0; p < biomePools[b][t].length; p++) {
            if (biomePools[b][t][p] === pokemon.speciesId) {
              poolTier = parseInt(t) as BiomePoolTier;
              break;
            }
          }
        }
        if (poolTier > -1)
          pokemonBiomes[pokemon.speciesId - 1][3].push([ Biome[b], BiomePoolTier[poolTier] ]);
      } else if (biomePoolPredicates[b](pokemon)) {
        pokemonBiomes[pokemon.speciesId - 1][3].push([ Biome[b], BiomePoolTier[BiomePoolTier.COMMON] ]);
      }
    }
  }

  console.log(JSON.stringify(pokemonBiomes, null, '  '));*/
}
