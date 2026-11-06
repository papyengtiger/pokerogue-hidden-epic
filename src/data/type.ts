import { globalScene } from "#app/global-scene";
import { PokemonType } from "#enums/pokemon-type";

export type TypeDamageMultiplier = 0 | 0.125 | 0.25 | 0.5 | 1 | 2 | 4 | 8;

function getHiddenEpicTypeDamageMultiplier(attackType: PokemonType, defType: PokemonType): TypeDamageMultiplier {
  if (attackType === PokemonType.UNKNOWN || defType === PokemonType.UNKNOWN) {
    return 1;
  }

  switch (defType) {
    case PokemonType.NORMAL:
      switch (attackType) {
        case PokemonType.FIGHTING:
        case PokemonType.DARK:
        case PokemonType.FAIRY:
          return 2;
        case PokemonType.GHOST:
          return 0;
        default:
          return 1;
      }
    case PokemonType.FIGHTING:
      switch (attackType) {
        case PokemonType.FLYING:
        case PokemonType.PSYCHIC:
        case PokemonType.FAIRY:
        case PokemonType.POISON:
          return 2;
        case PokemonType.ROCK:
        case PokemonType.DARK:
        case PokemonType.GHOST:
        case PokemonType.ICE:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.FLYING:
      switch (attackType) {
        case PokemonType.ROCK:
        case PokemonType.ELECTRIC:
        case PokemonType.ICE:
        case PokemonType.POISON:
          return 2;
        case PokemonType.FIGHTING:
        case PokemonType.DARK:
        case PokemonType.NORMAL:
          return 0.5;
        case PokemonType.GROUND:
          return 0;
        default:
          return 1;
      }
    case PokemonType.POISON:
      switch (attackType) {
        case PokemonType.GROUND:
        case PokemonType.PSYCHIC:
        case PokemonType.FLYING:
        case PokemonType.ROCK:
        case PokemonType.WATER:
          return 2;
        case PokemonType.FIGHTING:
        case PokemonType.BUG:
        case PokemonType.FAIRY:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.GROUND:
      switch (attackType) {
        case PokemonType.WATER:
        case PokemonType.GRASS:
        case PokemonType.ICE:
        case PokemonType.STEEL:
          return 2;
        case PokemonType.POISON:
        case PokemonType.ROCK:
        case PokemonType.DARK:
        case PokemonType.GROUND:
          return 0.5;
        case PokemonType.ELECTRIC:
          return 0;
        default:
          return 1;
      }
    case PokemonType.ROCK:
      switch (attackType) {
        case PokemonType.FIGHTING:
        case PokemonType.STEEL:
        case PokemonType.WATER:
        case PokemonType.GRASS:
        case PokemonType.GROUND:
          return 2;
        case PokemonType.NORMAL:
        case PokemonType.FLYING:
        case PokemonType.GHOST:
        case PokemonType.FIRE:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.BUG:
      switch (attackType) {
        case PokemonType.FLYING:
        case PokemonType.ROCK:
        case PokemonType.FIRE:
        case PokemonType.BUG:
          return 2;
        case PokemonType.FIGHTING:
        case PokemonType.GROUND:
        case PokemonType.PSYCHIC:
        case PokemonType.WATER:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.GHOST:
      switch (attackType) {
        case PokemonType.GHOST:
        case PokemonType.DARK:
        case PokemonType.FIRE:
        case PokemonType.PSYCHIC:
          return 2;
        case PokemonType.POISON:
        case PokemonType.FAIRY:
          return 0.5;
        case PokemonType.NORMAL:
        case PokemonType.FIGHTING:
          return 0;
        default:
          return 1;
      }
    case PokemonType.STEEL:
      switch (attackType) {
        case PokemonType.FIGHTING:
        case PokemonType.GROUND:
        case PokemonType.FIRE:
        case PokemonType.ELECTRIC:
          return 2;
        case PokemonType.NORMAL:
        case PokemonType.FLYING:
        case PokemonType.ROCK:
        case PokemonType.BUG:
        case PokemonType.GRASS:
        case PokemonType.PSYCHIC:
        case PokemonType.DRAGON:
        case PokemonType.FAIRY:
          return 0.5;
        case PokemonType.POISON:
          return 0;
        default:
          return 1;
      }
    case PokemonType.FIRE:
      switch (attackType) {
        case PokemonType.GROUND:
        case PokemonType.ROCK:
        case PokemonType.WATER:
        case PokemonType.ICE:
          return 2;
        case PokemonType.BUG:
        case PokemonType.STEEL:
        case PokemonType.FIRE:
        case PokemonType.GRASS:
        case PokemonType.FAIRY:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.WATER:
      switch (attackType) {
        case PokemonType.GRASS:
        case PokemonType.ELECTRIC:
        case PokemonType.POISON:
        case PokemonType.GROUND:
          return 2;
        case PokemonType.STEEL:
        case PokemonType.FIRE:
        case PokemonType.WATER:
        case PokemonType.ICE:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.GRASS:
      switch (attackType) {
        case PokemonType.FLYING:
        case PokemonType.STEEL:
        case PokemonType.BUG:
        case PokemonType.FIRE:
        case PokemonType.DARK:
          return 2;
        case PokemonType.GROUND:
        case PokemonType.WATER:
        case PokemonType.GRASS:
        case PokemonType.ELECTRIC:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.ELECTRIC:
      switch (attackType) {
        case PokemonType.GROUND:
        case PokemonType.GRASS:
        case PokemonType.ROCK:
        case PokemonType.PSYCHIC:
        case PokemonType.GHOST:
          return 2;
        case PokemonType.FLYING:
        case PokemonType.STEEL:
        case PokemonType.ELECTRIC:
        case PokemonType.BUG:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.PSYCHIC:
      switch (attackType) {
        case PokemonType.BUG:
        case PokemonType.GHOST:
        case PokemonType.DARK:
        case PokemonType.POISON:
          return 2;
        case PokemonType.FIGHTING:
        case PokemonType.PSYCHIC:
        case PokemonType.NORMAL:
        case PokemonType.FAIRY:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.ICE:
      switch (attackType) {
        case PokemonType.FIGHTING:
        case PokemonType.ROCK:
        case PokemonType.STEEL:
        case PokemonType.FIRE:
        case PokemonType.WATER:
          return 2;
        case PokemonType.ICE:
        case PokemonType.POISON:
        case PokemonType.ELECTRIC:
        case PokemonType.GROUND:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.DRAGON:
      switch (attackType) {
        case PokemonType.ICE:
        case PokemonType.DRAGON:
        case PokemonType.FAIRY:
          return 2;
        case PokemonType.FIRE:
        case PokemonType.WATER:
        case PokemonType.GRASS:
        case PokemonType.ELECTRIC:
          return 0.5;
        default:
          return 1;
      }
    case PokemonType.DARK:
      switch (attackType) {
        case PokemonType.FIGHTING:
        case PokemonType.BUG:
        case PokemonType.FAIRY:
        case PokemonType.ELECTRIC:
          return 2;
        case PokemonType.GHOST:
        case PokemonType.DARK:
        case PokemonType.POISON:
          return 0.5;
        case PokemonType.PSYCHIC:
          return 0;
        default:
          return 1;
      }
    case PokemonType.FAIRY:
      switch (attackType) {
        case PokemonType.POISON:
        case PokemonType.STEEL:
        case PokemonType.PSYCHIC:
        case PokemonType.ELECTRIC:
          return 2;
        case PokemonType.DARK:
        case PokemonType.ICE:
        case PokemonType.FLYING:
          return 0.5;
        case PokemonType.DRAGON:
          return 0;
        default:
          return 1;
      }
    case PokemonType.STELLAR:
      return 1;
    case PokemonType.MYSTERY:
      return 0.5;
  }

  return 1;
}

/** Standard Pokemon type chart. Defensive type -> offensive multipliers. */
const ORIGINAL_TYPE_MATCHUPS: Partial<Record<PokemonType, Partial<Record<PokemonType, TypeDamageMultiplier>>>> = {
  [PokemonType.NORMAL]: {
    [PokemonType.FIGHTING]: 2,
    [PokemonType.GHOST]: 0,
  },
  [PokemonType.FIGHTING]: {
    [PokemonType.FLYING]: 2,
    [PokemonType.ROCK]: 0.5,
    [PokemonType.BUG]: 0.5,
    [PokemonType.PSYCHIC]: 2,
    [PokemonType.DARK]: 0.5,
    [PokemonType.FAIRY]: 2,
  },
  [PokemonType.FLYING]: {
    [PokemonType.FIGHTING]: 0.5,
    [PokemonType.GROUND]: 0,
    [PokemonType.ROCK]: 2,
    [PokemonType.BUG]: 0.5,
    [PokemonType.GRASS]: 0.5,
    [PokemonType.ELECTRIC]: 2,
    [PokemonType.ICE]: 2,
  },
  [PokemonType.POISON]: {
    [PokemonType.FIGHTING]: 0.5,
    [PokemonType.POISON]: 0.5,
    [PokemonType.GROUND]: 2,
    [PokemonType.BUG]: 0.5,
    [PokemonType.GRASS]: 0.5,
    [PokemonType.PSYCHIC]: 2,
    [PokemonType.FAIRY]: 0.5,
  },
  [PokemonType.GROUND]: {
    [PokemonType.POISON]: 0.5,
    [PokemonType.ROCK]: 0.5,
    [PokemonType.WATER]: 2,
    [PokemonType.GRASS]: 2,
    [PokemonType.ELECTRIC]: 0,
    [PokemonType.ICE]: 2,
  },
  [PokemonType.ROCK]: {
    [PokemonType.NORMAL]: 0.5,
    [PokemonType.FIGHTING]: 2,
    [PokemonType.FLYING]: 0.5,
    [PokemonType.POISON]: 0.5,
    [PokemonType.GROUND]: 2,
    [PokemonType.STEEL]: 2,
    [PokemonType.FIRE]: 0.5,
    [PokemonType.WATER]: 2,
    [PokemonType.GRASS]: 2,
  },
  [PokemonType.BUG]: {
    [PokemonType.FIGHTING]: 0.5,
    [PokemonType.FLYING]: 2,
    [PokemonType.GROUND]: 0.5,
    [PokemonType.ROCK]: 2,
    [PokemonType.FIRE]: 2,
    [PokemonType.GRASS]: 0.5,
  },
  [PokemonType.GHOST]: {
    [PokemonType.NORMAL]: 0,
    [PokemonType.FIGHTING]: 0,
    [PokemonType.POISON]: 0.5,
    [PokemonType.BUG]: 0.5,
    [PokemonType.GHOST]: 2,
    [PokemonType.DARK]: 2,
  },
  [PokemonType.STEEL]: {
    [PokemonType.NORMAL]: 0.5,
    [PokemonType.FIGHTING]: 2,
    [PokemonType.FLYING]: 0.5,
    [PokemonType.POISON]: 0,
    [PokemonType.GROUND]: 2,
    [PokemonType.ROCK]: 0.5,
    [PokemonType.BUG]: 0.5,
    [PokemonType.STEEL]: 0.5,
    [PokemonType.FIRE]: 2,
    [PokemonType.GRASS]: 0.5,
    [PokemonType.PSYCHIC]: 0.5,
    [PokemonType.ICE]: 0.5,
    [PokemonType.DRAGON]: 0.5,
    [PokemonType.FAIRY]: 0.5,
  },
  [PokemonType.FIRE]: {
    [PokemonType.GROUND]: 2,
    [PokemonType.ROCK]: 2,
    [PokemonType.BUG]: 0.5,
    [PokemonType.STEEL]: 0.5,
    [PokemonType.FIRE]: 0.5,
    [PokemonType.WATER]: 2,
    [PokemonType.GRASS]: 0.5,
    [PokemonType.ICE]: 0.5,
    [PokemonType.FAIRY]: 0.5,
  },
  [PokemonType.WATER]: {
    [PokemonType.STEEL]: 0.5,
    [PokemonType.FIRE]: 0.5,
    [PokemonType.WATER]: 0.5,
    [PokemonType.GRASS]: 2,
    [PokemonType.ELECTRIC]: 2,
    [PokemonType.ICE]: 0.5,
  },
  [PokemonType.GRASS]: {
    [PokemonType.FLYING]: 2,
    [PokemonType.POISON]: 2,
    [PokemonType.GROUND]: 0.5,
    [PokemonType.BUG]: 2,
    [PokemonType.FIRE]: 2,
    [PokemonType.WATER]: 0.5,
    [PokemonType.GRASS]: 0.5,
    [PokemonType.ELECTRIC]: 0.5,
    [PokemonType.ICE]: 2,
  },
  [PokemonType.ELECTRIC]: {
    [PokemonType.FLYING]: 0.5,
    [PokemonType.GROUND]: 2,
    [PokemonType.STEEL]: 0.5,
    [PokemonType.ELECTRIC]: 0.5,
  },
  [PokemonType.PSYCHIC]: {
    [PokemonType.FIGHTING]: 0.5,
    [PokemonType.BUG]: 2,
    [PokemonType.GHOST]: 2,
    [PokemonType.PSYCHIC]: 0.5,
    [PokemonType.DARK]: 2,
  },
  [PokemonType.ICE]: {
    [PokemonType.FIGHTING]: 2,
    [PokemonType.ROCK]: 2,
    [PokemonType.STEEL]: 2,
    [PokemonType.FIRE]: 2,
    [PokemonType.ICE]: 0.5,
  },
  [PokemonType.DRAGON]: {
    [PokemonType.FIRE]: 0.5,
    [PokemonType.WATER]: 0.5,
    [PokemonType.GRASS]: 0.5,
    [PokemonType.ELECTRIC]: 0.5,
    [PokemonType.ICE]: 2,
    [PokemonType.DRAGON]: 2,
    [PokemonType.FAIRY]: 2,
  },
  [PokemonType.DARK]: {
    [PokemonType.FIGHTING]: 2,
    [PokemonType.BUG]: 2,
    [PokemonType.GHOST]: 0.5,
    [PokemonType.PSYCHIC]: 0,
    [PokemonType.DARK]: 0.5,
    [PokemonType.FAIRY]: 2,
  },
  [PokemonType.FAIRY]: {
    [PokemonType.FIGHTING]: 0.5,
    [PokemonType.POISON]: 2,
    [PokemonType.BUG]: 0.5,
    [PokemonType.STEEL]: 2,
    [PokemonType.DRAGON]: 0,
    [PokemonType.DARK]: 0.5,
  },
};

/** Original / Hidden Epic switch. The old chart remains the Hidden Epic default. */
export function getTypeDamageMultiplier(attackType: PokemonType, defType: PokemonType): TypeDamageMultiplier {
  if (globalScene?.typeMatchupVersion !== "original") {
    return getHiddenEpicTypeDamageMultiplier(attackType, defType);
  }
  if (attackType === PokemonType.UNKNOWN || defType === PokemonType.UNKNOWN) {
    return 1;
  }
  if (defType === PokemonType.MYSTERY) {
    return 0.5;
  }
  if (defType === PokemonType.STELLAR) {
    return 1;
  }
  return ORIGINAL_TYPE_MATCHUPS[defType]?.[attackType] ?? 1;
}

/**
 * Retrieve the color corresponding to a specific damage multiplier
 * @returns A color or undefined if the default color should be used
 */
export function getTypeDamageMultiplierColor(
  multiplier: TypeDamageMultiplier,
  side: "defense" | "offense",
  highContrast = false,
): string | undefined {
  if (side === "offense") {
    switch (multiplier) {
      case 0:
        return "#929292";
      case 0.125:
        return "#FF5500";
      case 0.25:
        return "#FF7400";
      case 0.5:
        return "#FE8E00";
      case 1:
        return;
      case 2:
        return highContrast ? "#2DB4FF" : "#4AA500";
      case 4:
        return highContrast ? "#00A4FF" : "#4BB400";
      case 8:
        return highContrast ? "#0093FF" : "#52C200";
    }
  }
  switch (multiplier) {
    case 0:
      return "#B1B100";
    case 0.125:
      return "#2DB4FF";
    case 0.25:
      return "#00A4FF";
    case 0.5:
      return "#0093FF";
    case 1:
      return;
    case 2:
      return "#FE8E00";
    case 4:
      return "#FF7400";
    case 8:
      return "#FF5500";
  }
}

export function getTypeRgb(type: PokemonType): [number, number, number] {
  switch (type) {
    case PokemonType.NORMAL:
      return [168, 168, 120];
    case PokemonType.FIGHTING:
      return [192, 48, 40];
    case PokemonType.FLYING:
      return [168, 144, 240];
    case PokemonType.POISON:
      return [160, 64, 160];
    case PokemonType.GROUND:
      return [224, 192, 104];
    case PokemonType.ROCK:
      return [184, 160, 56];
    case PokemonType.BUG:
      return [168, 184, 32];
    case PokemonType.GHOST:
      return [112, 88, 152];
    case PokemonType.STEEL:
      return [184, 184, 208];
    case PokemonType.FIRE:
      return [240, 128, 48];
    case PokemonType.WATER:
      return [104, 144, 240];
    case PokemonType.GRASS:
      return [120, 200, 80];
    case PokemonType.ELECTRIC:
      return [248, 208, 48];
    case PokemonType.PSYCHIC:
      return [248, 88, 136];
    case PokemonType.ICE:
      return [152, 216, 216];
    case PokemonType.DRAGON:
      return [112, 56, 248];
    case PokemonType.DARK:
      return [112, 88, 72];
    case PokemonType.FAIRY:
      return [232, 136, 200];
    case PokemonType.STELLAR:
      return [255, 255, 255];
    default:
      return [0, 0, 0];
  }
}
