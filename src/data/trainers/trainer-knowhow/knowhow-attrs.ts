// src/trainers/knowhow-attrs.ts

import type { Pokemon } from "#field/pokemon";
import type { Stat } from "#enums/stat";
import { NumberHolder } from "#utils/common";

export interface KnowhowAttrBaseParams {
  pokemon: Pokemon;
}

export abstract class KnowhowAttr {
  canApply(_params: KnowhowAttrBaseParams): boolean {
    return true;
  }

  apply(_params: KnowhowAttrBaseParams): void {}
}

export interface KnowhowStatMultiplierAttrParams
  extends KnowhowAttrBaseParams {
  stat: Stat;
  statVal: NumberHolder;
}

export class KnowhowStatMultiplierAttr
  extends KnowhowAttr {
  constructor(
    private readonly multiplier: number,
    private readonly condition?: (
      pokemon: Pokemon,
    ) => boolean,
  ) {
    super();
  }

  override canApply({
    pokemon,
  }: KnowhowStatMultiplierAttrParams): boolean {
    return (
      !this.condition
      || this.condition(pokemon)
    );
  }

  override apply({
    statVal,
  }: KnowhowStatMultiplierAttrParams): void {
    statVal.value = Math.floor(
      statVal.value * this.multiplier,
    );
  }
}