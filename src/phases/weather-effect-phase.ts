import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { blocksNonDirectDamage } from "#abilities/block-non-direct-damage";
import { globalScene } from "#app/global-scene";
import { IgnoreWeatherEffectsItemModifier, OvercoatModifier } from "#app/modifier/modifier";
import type { Weather } from "#data/weather";
import { getWeatherDamageMessage, getWeatherLapseMessage } from "#data/weather";
import { HitResult } from "#enums/hit-result";
import { CommonAnim } from "#enums/move-anims-common";
import { WeatherType } from "#enums/weather-type";
import type { Pokemon } from "#field/pokemon";
import { CommonAnimPhase } from "#phases/common-anim-phase";
import { BooleanHolder, toDmgValue } from "#utils/common";

export class WeatherEffectPhase extends CommonAnimPhase {
  public weather: Weather | null;

  constructor() {
    super(
      undefined,
      undefined,
      CommonAnim.SUNNY + ((globalScene?.arena?.weather?.weatherType || WeatherType.NONE) - 1),
    );
    this.weather = globalScene?.arena?.weather;
  }

  start() {
    this.weather = globalScene?.arena?.weather;

    const hasActualWeather = !!this.weather;

    if (hasActualWeather) {
      this.setAnimation(CommonAnim.SUNNY + (this.weather!.weatherType - 1));

      if (this.weather!.isDamaging()) {
        const cancelled = new BooleanHolder(false);

        this.executeForAll((pokemon: Pokemon) =>
          applyAbAttrs("SuppressWeatherEffectAbAttr", {
            pokemon,
            weather: this.weather,
            cancelled,
          }),
        );

        if (!cancelled.value) {
          const inflictDamage = (pokemon: Pokemon) => {
            const currentWeatherType = this.weather!.weatherType;

            if (!pokemon || pokemon.switchOutStatus) {
              return;
            }

            const hasIgnoreWeatherEffectItem = globalScene
              .getModifiers(IgnoreWeatherEffectsItemModifier)
              .some(mod => mod.pokemonId === pokemon.id);

            if (hasIgnoreWeatherEffectItem) {
              return;
            }

            const hasSafetyGoggles = globalScene
              .getModifiers(OvercoatModifier)
              .some(mod => mod.pokemonId === pokemon.id);

            if (hasSafetyGoggles) {
              return;
            }

            if (blocksNonDirectDamage(pokemon, false)) {
              return;
            }

            if ([WeatherType.HAIL, WeatherType.SANDSTORM].includes(currentWeatherType)) {
              const damage = toDmgValue(pokemon.getMaxHp() / 16);

              globalScene.phaseManager.queueMessage(getWeatherDamageMessage(currentWeatherType, pokemon)!);

              pokemon.damageAndUpdate(damage, HitResult.EFFECTIVE, false, false, true);
            }
          };

          this.executeForAll((pokemon: Pokemon) => {
            const immune =
              !pokemon
              || pokemon.getTypes(true, true).filter(t => this.weather?.isTypeDamageImmune(t)).length > 0
              || pokemon.switchOutStatus;

            if (!immune) {
              inflictDamage(pokemon);
            }
          });
        }
      }
    }

    const runAbilityWeatherLapse = () => {
      this.executeForAll((pokemon: Pokemon) => {
        if (pokemon.switchOutStatus) {
          return;
        }

        const hasMegaSol =
          pokemon.getAbility().hasAttr("MegaSolAbAttr") || !!pokemon.getPassiveAbility()?.hasAttr("MegaSolAbAttr");

        const actualWeatherIsSun =
          this.weather?.weatherType === WeatherType.SUNNY || this.weather?.weatherType === WeatherType.HARSH_SUN;

        // 실제 날씨의 PostWeatherLapse 처리
        if (this.weather) {
          applyAbAttrs("PostWeatherLapseAbAttr", {
            pokemon,
            weather: this.weather,
          });
        }

        // 메가솔라 보유자:
        // 실제 날씨가 쾌청이 아닐 경우 가상의 쾌청 lapse 추가
        if (hasMegaSol && !actualWeatherIsSun) {
          applyAbAttrs("PostWeatherLapseAbAttr", {
            pokemon,
            weather: {
              weatherType: WeatherType.SUNNY,
            } as Weather,
          });
        }
      });

      super.start();
    };

    if (this.weather) {
      globalScene.ui.showText(getWeatherLapseMessage(this.weather.weatherType) ?? "", null, runAbilityWeatherLapse);
    } else {
      runAbilityWeatherLapse();
    }
  }
}
