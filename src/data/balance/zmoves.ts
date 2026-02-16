import { MoveId } from "#enums/move-id";
import { SpeciesId } from "#enums/species-id";
import { globalScene } from "#app/global-scene";

export interface ZmovesSpecies {
  [key: number]: Array<Species | Array<Species | string>>;
}
export const allSpecies: Species[] = Object.values(SpeciesId).filter(v => typeof v === 'number') as Species[];

export const zmovesSpecies: ZmovesSpecies = {
    [MoveId.BREAKNECK_BLITZ]: allSpecies,
    [MoveId.ALL_OUT_PUMMELING]: allSpecies,
    [MoveId.SUPERSONIC_SKYSTRIKE]: allSpecies,
    [MoveId.ACID_DOWNPOUR]: allSpecies,
    [MoveId.TECTONIC_RAGE]: allSpecies,
    [MoveId.CONTINENTAL_CRUSH]: allSpecies,
    [MoveId.SAVAGE_SPIN_OUT]: allSpecies,
    [MoveId.NEVER_ENDING_NIGHTMARE]: allSpecies,
    [MoveId.CORKSCREW_CRASH]: allSpecies,
    [MoveId.INFERNO_OVERDRIVE]: allSpecies,
    [MoveId.HYDRO_VORTEX]: allSpecies,
    [MoveId.BLOOM_DOOM]: allSpecies,
    [MoveId.GIGAVOLT_HAVOC]: allSpecies,
    [MoveId.SHATTERED_PSYCHE]: allSpecies,
    [MoveId.SUBZERO_SLAMMER]: allSpecies,
    [MoveId.DEVASTATING_DRAKE]: allSpecies,
    [MoveId.BLACK_HOLE_ECLIPSE]: allSpecies,
    [MoveId.TWINKLE_TACKLE]: allSpecies,

    [MoveId.CATASTROPIKA]: [SpeciesId.PICHU, SpeciesId.PIKACHU, SpeciesId.RAICHU, SpeciesId.ALOLA_RAICHU], 
    [MoveId.SINISTER_ARROW_RAID]: [SpeciesId.ROWLET, SpeciesId.DARTRIX, SpeciesId.DECIDUEYE, SpeciesId.HISUI_DECIDUEYE], 
    [MoveId.MALICIOUS_MOONSAULT]: [SpeciesId.LITTEN, SpeciesId.TORRACAT, SpeciesId.INCINEROAR], 
    [MoveId.OCEANIC_OPERETTA]: [SpeciesId.POPPLIO, SpeciesId.BRIONNE, SpeciesId.PRIMARINA], 
    [MoveId.GUARDIAN_OF_ALOLA]: [SpeciesId.TAPU_KOKO, SpeciesId.TAPU_LELE, SpeciesId.TAPU_BULU, SpeciesId.TAPU_FINI], 
    [MoveId.SOUL_STEALING_7_STAR_STRIKE]: [SpeciesId.MARSHADOW], 
    [MoveId.STOKED_SPARKSURFER]: [SpeciesId.PICHU, SpeciesId.PIKACHU, SpeciesId.RAICHU, SpeciesId.ALOLA_RAICHU], 
    [MoveId.PULVERIZING_PANCAKE]: [SpeciesId.MUNCHLAX, SpeciesId.SNORLAX], 
    [MoveId.EXTREME_EVOBOOST]: [
      SpeciesId.EEVEE,
      SpeciesId.VAPOREON,
      SpeciesId.JOLTEON,
      SpeciesId.FLAREON,
      SpeciesId.ESPEON,
      SpeciesId.UMBREON,
      SpeciesId.LEAFEON,
      SpeciesId.GLACEON,
      SpeciesId.SYLVEON,
    ], 
    [MoveId.GENESIS_SUPERNOVA]: [SpeciesId.MEW, SpeciesId.MEWTWO], 
    [MoveId.TEN_MILLION_VOLT_THUNDERBOLT]: [SpeciesId.PICHU, SpeciesId.PIKACHU, SpeciesId.RAICHU, SpeciesId.ALOLA_RAICHU], 
    [MoveId.LIGHT_THAT_BURNS_THE_SKY]: [SpeciesId.NECROZMA], 
    [MoveId.SEARING_SUNRAZE_SMASH]: [SpeciesId.COSMOG, SpeciesId.COSMOEM, SpeciesId.SOLGALEO, SpeciesId.NECROZMA], 
    [MoveId.MENACING_MOONRAZE_MAELSTROM]: [SpeciesId.COSMOG, SpeciesId.COSMOEM, SpeciesId.LUNALA, SpeciesId.NECROZMA], 
    [MoveId.LETS_SNUGGLE_FOREVER]: [SpeciesId.MIMIKYU], 
    [MoveId.SPLINTERED_STORMSHARDS]: [SpeciesId.ROCKRUFF, [SpeciesId.LYCANROC, "midnight"], [SpeciesId.LYCANROC, "dusk",], [SpeciesId.LYCANROC, "dusk",], SpeciesId.LYCANROC], 
    [MoveId.CLANGOROUS_SOULBLAZE]: [SpeciesId.JANGMO_O, SpeciesId.HAKAMO_O, SpeciesId.KOMMO_O],
  };

export interface SpeciesZMoves {
  [speciesId: number]: (Moves | [string | Species, Moves])[];
}

const exclusiveZMovesSet = new Set<Moves>([
  MoveId.CATASTROPIKA,
MoveId.SINISTER_ARROW_RAID,
MoveId.MALICIOUS_MOONSAULT,
MoveId.OCEANIC_OPERETTA,
MoveId.GUARDIAN_OF_ALOLA,
MoveId.SOUL_STEALING_7_STAR_STRIKE,
MoveId.STOKED_SPARKSURFER,
MoveId.PULVERIZING_PANCAKE,
MoveId.EXTREME_EVOBOOST,
MoveId.GENESIS_SUPERNOVA,
MoveId.TEN_MILLION_VOLT_THUNDERBOLT,
MoveId.LIGHT_THAT_BURNS_THE_SKY,
MoveId.SEARING_SUNRAZE_SMASH,
MoveId.MENACING_MOONRAZE_MAELSTROM,
MoveId.LETS_SNUGGLE_FOREVER,
MoveId.SPLINTERED_STORMSHARDS,
MoveId.CLANGOROUS_SOULBLAZE,
]);

export function isExclusiveZCrystal(moveId: Moves): boolean {
  return exclusiveZMovesSet.has(moveId);
}

let speciesZMoves: SpeciesZMoves | null = null;

export function getCompatibleZMovesForPokemon(pokemon: PlayerPokemon): Moves[] {
  try {
    const speciesZMoves = getSpeciesZMoves();
    const entries = speciesZMoves[pokemon.id];
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
    console.error("Error in getCompatibleZMovesForPokemon:", e);
    return [];
  }
}

export function initSpeciesZMoves() {
  if (!speciesZMoves) {
    speciesZMoves = transposeZmovesSpecies();
    console.log("SpeciesZMoves initialized");
  }
}

console.log("globalScene:", typeof globalScene !== "undefined" ? globalScene : "globalScene is undefined");

if (globalScene) {
  console.log("globalScene.party:", globalScene.party ?? "party is undefined");
  
  if (Array.isArray(globalScene.party)) {
    console.log("파티 멤버 수:", globalScene.party.length);
    const solgaleo = globalScene.party.find(p => p.species?.name === "솔가레오");
    if (solgaleo) {
      console.log("솔가레오 찾음:", solgaleo);
    } else {
      console.warn("파티에 솔가레오가 없습니다.");
    }
  } else {
    console.warn("globalScene.party가 배열이 아닙니다.");
  }
} else {
  console.warn("globalScene이 정의되어 있지 않습니다.");
}

if (!speciesZMoves) {
  console.warn("speciesZMoves가 아직 초기화되지 않았습니다.");
} else if (!solgaleo) {
  console.warn("solgaleo 객체가 없습니다.");
} else {
  console.log("speciesZMoves keys:", Object.keys(speciesZMoves));
  console.log("solgaleo.species:", solgaleo.species);
  console.log("solgaleo speciesZMoves:", speciesZMoves[solgaleo.species]);
}

export function getSpeciesZMoves(): SpeciesZMoves {
  if (!speciesZMoves) {
    console.warn("speciesZMoves not initialized, auto-initializing");
    initSpeciesZMoves(); // 자동 초기화 fallback
  }
  return speciesZMoves!;
}

export function transposeZmovesSpecies(): SpeciesZMoves {
  const flipped: SpeciesZMoves = {};

  for (const moveKeyStr in zmovesSpecies) {
    const moveKey = Number(moveKeyStr);
    const speciesList = zmovesSpecies[moveKey];

    for (const species of speciesList) {
      if (Array.isArray(species)) {
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
