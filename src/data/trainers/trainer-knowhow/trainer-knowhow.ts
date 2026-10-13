// src/trainers/trainer-knowhow.ts

import { TrainerKnowhowId } from "#enums/trainer-knowhow-id";
import type { Localizable } from "#types/locales";
import type { Constructor } from "#utils/common";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import { toCamelCase } from "#utils/strings";
import { KnowhowStatMultiplierAttr } from "./knowhow-attrs";
import type { KnowhowAttr } from "./knowhow-attrs";
import i18next from "i18next";

export class TrainerKnowhow implements Localizable {
  public id: TrainerKnowhowId;

  public name: string;
  public description: string;

  public attrs: KnowhowAttr[];

  constructor(id: TrainerKnowhowId) {
    this.id = id;
    this.attrs = [];

    this.name = "";
    this.description = "";

    this.localize();
  }

  localize(): void {
    if (this.id === TrainerKnowhowId.NONE) {
      this.name = "";
      this.description = "";
      return;
    }

    const i18nKey = toCamelCase(
      TrainerKnowhowId[this.id],
    );

    this.name = i18next.t(
      `trainerKnowhow:${i18nKey}.name`,
    );

    this.description = i18next.t(
      `trainerKnowhow:${i18nKey}.description`,
    );
  }

  attr<T extends Constructor<KnowhowAttr>>(
    AttrType: T,
    ...args: ConstructorParameters<T>
  ): this {
    this.attrs.push(new AttrType(...args));
    return this;
  }
}

export const allTrainerKnowhows = [
  new TrainerKnowhow(
    TrainerKnowhowId.NONE,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.KYLE_BALANCED_TRAINING,
  ).attr(
    KnowhowStatMultiplierAttr,
    1.1,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.AMBER_BALANCED_TRAINING,
  ).attr(
    KnowhowStatMultiplierAttr,
    1.1,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.LEAF_KANTO_MASTERY,
  ).attr(
    KnowhowStatMultiplierAttr,
    1.2,
    pokemon =>
      getPokemonSpecies(
        pokemon.species.speciesId,
      ).generation === 1,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.ETHAN_JOHTO_MASTERY,
  ).attr(
    KnowhowStatMultiplierAttr,
    1.2,
    pokemon =>
      getPokemonSpecies(
        pokemon.species.speciesId,
      ).generation === 2,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.BRENDAN_HOENN_MASTERY,
  ).attr(
    KnowhowStatMultiplierAttr,
    1.2,
    pokemon =>
      getPokemonSpecies(
        pokemon.species.speciesId,
      ).generation === 3,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.LUCAS_SINNOH_MASTERY,
  ).attr(
    KnowhowStatMultiplierAttr,
    1.2,
    pokemon =>
      getPokemonSpecies(
        pokemon.species.speciesId,
      ).generation === 4,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.HILBERT_UNOVA_MASTERY,
  ).attr(
    KnowhowStatMultiplierAttr,
    1.2,
    pokemon =>
      getPokemonSpecies(
        pokemon.species.speciesId,
      ).generation === 5,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.CALEM_KALOS_MASTERY,
  ).attr(
    KnowhowStatMultiplierAttr,
    1.2,
    pokemon =>
      getPokemonSpecies(
        pokemon.species.speciesId,
      ).generation === 6,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.ELIO_ALOLA_MASTERY,
  ).attr(
    KnowhowStatMultiplierAttr,
    1.2,
    pokemon =>
      getPokemonSpecies(
        pokemon.species.speciesId,
      ).generation === 7,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.VICTOR_GALAR_MASTERY,
  ).attr(
    KnowhowStatMultiplierAttr,
    1.2,
    pokemon =>
      getPokemonSpecies(
        pokemon.species.speciesId,
      ).generation === 8,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.FLORIAN_PALDEA_MASTERY,
  ).attr(
    KnowhowStatMultiplierAttr,
    1.2,
    pokemon =>
      getPokemonSpecies(
        pokemon.species.speciesId,
      ).generation === 9,
  ),

  new TrainerKnowhow(
    TrainerKnowhowId.TRAINING_EXPERT,
  ),
];