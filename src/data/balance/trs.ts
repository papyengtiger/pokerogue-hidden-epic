import { ModifierTier } from "#enums/modifier-tier";
import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";

export interface MaxmovesSpecies {
  [key: number]: Array<Species | Array<Species | string>>;
}
export const allSpecies: Species[] = Object.values(SpeciesId).filter(v => typeof v === 'number') as Species[];

export const maxmovesSpecies: MaxmovesSpecies = {
    [MoveId.MAX_GUARD]: allSpecies,
    [MoveId.MAX_FLARE]: allSpecies,
    [MoveId.MAX_FLUTTERBY]: allSpecies,
    [MoveId.MAX_LIGHTNING]: allSpecies,
    [MoveId.MAX_STRIKE]: allSpecies,
    [MoveId.MAX_KNUCKLE]: allSpecies,
    [MoveId.MAX_PHANTASM]: allSpecies,
    [MoveId.MAX_HAILSTORM]: allSpecies,
    [MoveId.MAX_OOZE]: allSpecies,
    [MoveId.MAX_GEYSER]: allSpecies,
    [MoveId.MAX_AIRSTREAM]: allSpecies,
    [MoveId.MAX_STARFALL]: allSpecies,
    [MoveId.MAX_WYRMWIND]: allSpecies,
    [MoveId.MAX_MINDSTORM]: allSpecies,
    [MoveId.MAX_ROCKFALL]: allSpecies,
    [MoveId.MAX_QUAKE]: allSpecies,
    [MoveId.MAX_DARKNESS]: allSpecies,
    [MoveId.MAX_OVERGROWTH]: allSpecies,
    [MoveId.MAX_STEELSPIKE]: allSpecies,

    [MoveId.G_MAX_WILDFIRE]: [SpeciesId.CHARIZARD], 
    [MoveId.G_MAX_BEFUDDLE]: [SpeciesId.BUTTERFREE], 
    [MoveId.G_MAX_VOLT_CRASH]: [SpeciesId.PIKACHU], 
    [MoveId.G_MAX_GOLD_RUSH]: [SpeciesId.MEOWTH],  
    [MoveId.G_MAX_CHI_STRIKE]: [SpeciesId.MACHAMP], 
    [MoveId.G_MAX_TERROR]: [SpeciesId.GENGAR], 
    [MoveId.G_MAX_RESONANCE]: [SpeciesId.LAPRAS], 
    [MoveId.G_MAX_CUDDLE]: [SpeciesId.EEVEE], 
    [MoveId.G_MAX_REPLENISH]: [SpeciesId.SNORLAX], 
    [MoveId.G_MAX_MALODOR]: [SpeciesId.GARBODOR], 
    [MoveId.G_MAX_STONESURGE]: [SpeciesId.DREDNAW], 
    [MoveId.G_MAX_WIND_RAGE]: [SpeciesId.CORVIKNIGHT], 
    [MoveId.G_MAX_STUN_SHOCK]: [SpeciesId.TOXTRICITY], 
    [MoveId.G_MAX_FINALE]: [SpeciesId.ALCREMIE],
    [MoveId.G_MAX_DEPLETION]: [SpeciesId.DURALUDON],
    [MoveId.G_MAX_GRAVITAS]: [SpeciesId.ORBEETLE],
    [MoveId.G_MAX_VOLCALITH]: [SpeciesId.COALOSSAL],
    [MoveId.G_MAX_SANDBLAST]: [SpeciesId.SANDACONDA],
    [MoveId.G_MAX_SNOOZE]: [SpeciesId.GRIMMSNARL],
    [MoveId.G_MAX_TARTNESS]: [SpeciesId.FLAPPLE],
    [MoveId.G_MAX_SWEETNESS]: [SpeciesId.APPLETUN],
    [MoveId.G_MAX_SMITE]: [SpeciesId.HATTERENE],
    [MoveId.G_MAX_STEELSURGE]: [SpeciesId.COPPERAJAH],
    [MoveId.G_MAX_MELTDOWN]: [SpeciesId.MELMETAL],
    [MoveId.G_MAX_FOAM_BURST]: [SpeciesId.KINGLER],
    [MoveId.G_MAX_CENTIFERNO]: [SpeciesId.CENTISKORCH],
    [MoveId.G_MAX_VINE_LASH]: [SpeciesId.VENUSAUR],
    [MoveId.G_MAX_CANNONADE]: [SpeciesId.BLASTOISE],
    [MoveId.G_MAX_DRUM_SOLO]: [SpeciesId.RILLABOOM],
    [MoveId.G_MAX_FIREBALL]: [SpeciesId.CINDERACE],
    [MoveId.G_MAX_HYDROSNIPE]: [SpeciesId.INTELEON],
    [MoveId.G_MAX_ONE_BLOW]: [SpeciesId.URSHIFU],
    [MoveId.G_MAX_RAPID_FLOW]: [SpeciesId.URSHIFU],
  };

export interface SpeciesMaxMoves {
  [speciesId: number]: (Moves | [string | Species, Moves])[];
}

const GMaxMovesSet = new Set<Moves>([
  // G-Max Moves
  MoveId.G_MAX_WILDFIRE,
MoveId.G_MAX_BEFUDDLE,
MoveId.G_MAX_VOLT_CRASH,
MoveId.G_MAX_GOLD_RUSH,
MoveId.G_MAX_CHI_STRIKE,
MoveId.G_MAX_TERROR,
MoveId.G_MAX_RESONANCE,
MoveId.G_MAX_CUDDLE,
MoveId.G_MAX_REPLENISH,
MoveId.G_MAX_MALODOR,
MoveId.G_MAX_STONESURGE,
MoveId.G_MAX_WIND_RAGE,
MoveId.G_MAX_STUN_SHOCK,
MoveId.G_MAX_FINALE,
MoveId.G_MAX_DEPLETION,
MoveId.G_MAX_GRAVITAS,
MoveId.G_MAX_VOLCALITH,
MoveId.G_MAX_SANDBLAST,
MoveId.G_MAX_SNOOZE,
MoveId.G_MAX_TARTNESS,
MoveId.G_MAX_SWEETNESS,
MoveId.G_MAX_SMITE,
MoveId.G_MAX_STEELSURGE,
MoveId.G_MAX_MELTDOWN,
MoveId.G_MAX_FOAM_BURST,
MoveId.G_MAX_CENTIFERNO,
MoveId.G_MAX_VINE_LASH,
MoveId.G_MAX_CANNONADE,
MoveId.G_MAX_DRUM_SOLO,
MoveId.G_MAX_FIREBALL,
MoveId.G_MAX_HYDROSNIPE,
MoveId.G_MAX_ONE_BLOW,
MoveId.G_MAX_RAPID_FLOW,
]);

export function getCompatibleMaxMovesForPokemon(pokemon: PlayerPokemon): Moves[] {
  try {
    const speciesMovesMap = getSpeciesMaxMoves(); // ✅ 올바른 값
    const entries = speciesMovesMap[pokemon.id]; // ✅ speciesMaxMoves → speciesMovesMap
    if (!entries || entries.length === 0) return [];

    return entries
      .map(entry => {
        if (Array.isArray(entry) && typeof entry[1] === 'number') {
          return entry[1] as Moves;
        } else if (typeof entry === 'number') {
          return entry as Moves;
        }
        return null;
      })
      .filter(moveId => moveId !== null) as Moves[];
  } catch (e) {
    return [];
  }
}

let transposedSpeciesMaxMoves: SpeciesMaxMoves | null = null;

// 공통 로직 함수 (source를 받아서 뒤집기)
export function transposeSpeciesMoveMap(source: Record<MoveId, (PokemonSpecies | [PokemonSpecies, ...PokemonSpecies[]])[]>): SpeciesMaxMoves {
  const flipped: SpeciesMaxMoves = {};

  for (const moveKeyStr in source) {
    const moveKey = Number(moveKeyStr) as MoveId;
    const speciesList = source[moveKey] ?? []; // undefined/null 방어

    if (!Array.isArray(speciesList)) {
      console.warn("speciesList is not an array for moveKey:", moveKey, speciesList);
      continue; // 배열이 아니면 스킵
    }

    for (const species of speciesList) {
      if (Array.isArray(species)) {
        // forms가 있는 경우
        const [baseSpecies, ...forms] = species;

        const speciesKey = Number(baseSpecies);

        if (!flipped[speciesKey]) flipped[speciesKey] = [];

        for (const form of forms) {
          flipped[speciesKey].push([form, moveKey]);
        }
      } else {
        const speciesKey = Number(species);
        if (!flipped[speciesKey]) flipped[speciesKey] = [];
        flipped[speciesKey].push(moveKey);
      }
    }
  }

  return flipped;
}

// 기존에 있던 함수는 공통 함수 호출로 대체
export function transposeMaxmovesSpecies(): SpeciesMaxMoves {
  return transposeSpeciesMoveMap(maxmovesSpecies);
}

export function initSpeciesMaxMoves() {
  if (!transposedSpeciesMaxMoves) {
    transposedSpeciesMaxMoves = transposeMaxmovesSpecies();
  }
}

export function getSpeciesMaxMoves(): SpeciesMaxMoves {
  if (!transposedSpeciesMaxMoves) {
    initSpeciesMaxMoves();
  }
  return transposedSpeciesMaxMoves!;
}

export const speciesTrMoves: SpeciesTrMoves = transposeSpeciesMoveMap(maxmovesSpecies);

interface TrPoolTiers {
    [key: number]: ModifierTier
}

export const trPoolTiers: TrPoolTiers = {
  [MoveId.MAX_GUARD]: ModifierTier.COMMON,
  [MoveId.MAX_FLARE]: ModifierTier.COMMON,
  [MoveId.MAX_FLUTTERBY]: ModifierTier.COMMON,
  [MoveId.MAX_LIGHTNING]: ModifierTier.COMMON,
  [MoveId.MAX_STRIKE]: ModifierTier.COMMON,
  [MoveId.MAX_KNUCKLE]: ModifierTier.COMMON,
  [MoveId.MAX_PHANTASM]: ModifierTier.COMMON,
  [MoveId.MAX_HAILSTORM]: ModifierTier.COMMON,
  [MoveId.MAX_OOZE]: ModifierTier.COMMON,
  [MoveId.MAX_GEYSER]: ModifierTier.COMMON,
  [MoveId.MAX_AIRSTREAM]: ModifierTier.COMMON,
  [MoveId.MAX_STARFALL]: ModifierTier.COMMON,
  [MoveId.MAX_WYRMWIND]: ModifierTier.COMMON,
  [MoveId.MAX_MINDSTORM]: ModifierTier.COMMON,
  [MoveId.MAX_ROCKFALL]: ModifierTier.COMMON,
  [MoveId.MAX_QUAKE]: ModifierTier.COMMON,
  [MoveId.MAX_DARKNESS]: ModifierTier.COMMON,
  [MoveId.MAX_OVERGROWTH]: ModifierTier.COMMON,
  [MoveId.MAX_STEELSPIKE]: ModifierTier.COMMON,

  [MoveId.G_MAX_WILDFIRE]: ModifierTier.RARE,
  [MoveId.G_MAX_BEFUDDLE]: ModifierTier.RARE,
  [MoveId.G_MAX_VOLT_CRASH]: ModifierTier.RARE,
  [MoveId.G_MAX_GOLD_RUSH]: ModifierTier.RARE,
  [MoveId.G_MAX_CHI_STRIKE]: ModifierTier.RARE,
  [MoveId.G_MAX_TERROR]: ModifierTier.RARE,
  [MoveId.G_MAX_RESONANCE]: ModifierTier.RARE,
  [MoveId.G_MAX_CUDDLE]: ModifierTier.RARE,
  [MoveId.G_MAX_REPLENISH]: ModifierTier.RARE,
  [MoveId.G_MAX_MALODOR]: ModifierTier.RARE,
  [MoveId.G_MAX_STONESURGE]: ModifierTier.RARE,
  [MoveId.G_MAX_WIND_RAGE]: ModifierTier.RARE,
  [MoveId.G_MAX_STUN_SHOCK]: ModifierTier.RARE,
  [MoveId.G_MAX_FINALE]: ModifierTier.RARE,
  [MoveId.G_MAX_DEPLETION]: ModifierTier.RARE,
  [MoveId.G_MAX_GRAVITAS]: ModifierTier.RARE,
  [MoveId.G_MAX_VOLCALITH]: ModifierTier.RARE,
  [MoveId.G_MAX_SANDBLAST]: ModifierTier.RARE,
  [MoveId.G_MAX_SNOOZE]: ModifierTier.RARE,
  [MoveId.G_MAX_TARTNESS]: ModifierTier.RARE,
  [MoveId.G_MAX_SWEETNESS]: ModifierTier.RARE,
  [MoveId.G_MAX_SMITE]: ModifierTier.RARE,
  [MoveId.G_MAX_STEELSURGE]: ModifierTier.RARE,
  [MoveId.G_MAX_MELTDOWN]: ModifierTier.RARE,
  [MoveId.G_MAX_FOAM_BURST]: ModifierTier.RARE,
  [MoveId.G_MAX_CENTIFERNO]: ModifierTier.RARE,
  [MoveId.G_MAX_VINE_LASH]: ModifierTier.RARE,
  [MoveId.G_MAX_CANNONADE]: ModifierTier.RARE,
  [MoveId.G_MAX_DRUM_SOLO]: ModifierTier.RARE,
  [MoveId.G_MAX_FIREBALL]: ModifierTier.RARE,
  [MoveId.G_MAX_HYDROSNIPE]: ModifierTier.RARE,
  [MoveId.G_MAX_ONE_BLOW]: ModifierTier.RARE,
  [MoveId.G_MAX_RAPID_FLOW]: ModifierTier.RARE,
};
// 코드 어딘가에
(window as any).trPoolTiers = trPoolTiers;

