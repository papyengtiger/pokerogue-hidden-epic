import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import type { Weather } from "#data/weather";
import { getWeatherDamageMessage, getWeatherLapseMessage } from "#data/weather";
import { BattlerTagType } from "#enums/battler-tag-type";
import { HitResult } from "#enums/hit-result";
import { CommonAnim } from "#enums/move-anims-common";
import { WeatherType } from "#enums/weather-type";
import type { Pokemon } from "#field/pokemon";
import { CommonAnimPhase } from "#phases/common-anim-phase";
import { BooleanHolder, toDmgValue } from "#utils/common";
import { OvercoatModifier, IgnoreWeatherEffectsItemModifier } from "#app/modifier/modifier";
import { blocksNonDirectDamage } from "#abilities/block-non-direct-damage";

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

    if (!this.weather) {
      this.end();
      return;
    }

    this.setAnimation(CommonAnim.SUNNY + (this.weather.weatherType - 1));

    if (this.weather.isDamaging()) {
      const cancelled = new BooleanHolder(false);

      // ✅ 날씨 자체를 억제하는 특성(예: Overcoat류) / 효과 무시 어트리뷰트
      this.executeForAll((pokemon: Pokemon) =>
        applyAbAttrs("SuppressWeatherEffectAbAttr", { pokemon, weather: this.weather, cancelled }),
      );

      if (!cancelled.value) {
        const inflictDamage = (pokemon: Pokemon) => {
          const currentWeatherType = this.weather!.weatherType;

          // ✅ 0) 타입 면역 / 교체중이면 밖에서 거르지만 안전망으로 한 번 더
          if (!pokemon || pokemon.switchOutStatus) return;

          // ✅ 1) “날씨 효과 무시” 계열 아이템/모디파이어(Utility Umbrella 등)
          const hasIgnoreWeatherEffectItem = globalScene
            .getModifiers(IgnoreWeatherEffectsItemModifier)
            .some(mod => mod.pokemonId === pokemon.id);
          if (hasIgnoreWeatherEffectItem) return;

          // ✅ 2) Overcoat/Safety Goggles(너 코드에서는 OvercoatModifier로 판정)
          const hasSafetyGoggles = globalScene
            .getModifiers(OvercoatModifier)
            .some(mod => mod.pokemonId === pokemon.id);
          if (hasSafetyGoggles) return;

          // ✅ 3) 매직가드/새벽비드/스터디밀 등 “간접데미지 면역”이면 날씨 데미지 무효
          if (blocksNonDirectDamage(pokemon, false)) return;

          // ✅ 4) 실제 날씨 데미지 적용
          if ([WeatherType.HAIL, WeatherType.SANDSTORM].includes(currentWeatherType)) {
            const damage = toDmgValue(pokemon.getMaxHp() / 16);
            globalScene.phaseManager.queueMessage(getWeatherDamageMessage(currentWeatherType, pokemon)!);
            // 기존 시그니처 유지(너 코드 그대로)
            pokemon.damageAndUpdate(damage, HitResult.EFFECTIVE, false, false, true);
          }
        };

        this.executeForAll((pokemon: Pokemon) => {
          const immune =
            !pokemon ||
            !!pokemon.getTypes(true, true).filter(t => this.weather?.isTypeDamageImmune(t)).length ||
            pokemon.switchOutStatus;

          if (!immune) {
            inflictDamage(pokemon);
          }
        });
      }
    }

    globalScene.ui.showText(getWeatherLapseMessage(this.weather.weatherType) ?? "", null, () => {
      this.executeForAll((pokemon: Pokemon) => {
        if (!pokemon.switchOutStatus) {
          applyAbAttrs("PostWeatherLapseAbAttr", { pokemon, weather: this.weather });
        }
      });

      super.start();
    });
  }
}