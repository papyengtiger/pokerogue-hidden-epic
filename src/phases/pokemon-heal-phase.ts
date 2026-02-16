import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import type { HealBlockTag } from "#data/battler-tags";
import { getStatusEffectHealText } from "#data/status-effect";
import type { BattlerIndex } from "#enums/battler-index";
import { BattlerTagType } from "#enums/battler-tag-type";
import { HitResult } from "#enums/hit-result";
import { CommonAnim } from "#enums/move-anims-common";
import { StatusEffect } from "#enums/status-effect";
import { HealingBoosterModifier, SpeciesHealingBellModifier } from "#modifiers/modifier";
import { CommonAnimPhase } from "#phases/common-anim-phase";
import { HealAchv } from "#system/achv";
import { NumberHolder } from "#utils/common";
import i18next from "i18next";
import { BATTLE_STATS, EFFECTIVE_STATS, getStatKey, Stat } from "#enums/stat";
import type { StatStageChangePhase } from "#phases/stat-stage-change-phase";
import { Ability, PreAttackModifyDamageAbAttrParams, DefeatistHealBonusAbAttr } from "#abilities/ability";
import { applyAbAttrs, applyOnGainAbAttrs, applyOnLoseAbAttrs } from "#abilities/apply-ab-attrs";
import { AbilityId } from "#enums/ability-id";

// TODO: Refactor this - it has far too many arguments
export class PokemonHealPhase extends CommonAnimPhase {
  public readonly phaseName = "PokemonHealPhase";
  private hpHealed: number;
  private message: string | null;
  private showFullHpMessage: boolean;
  private skipAnim: boolean;
  private revive: boolean;
  private healStatus: boolean;
  private preventFullHeal: boolean;
  private fullRestorePP: boolean;

  constructor(
    battlerIndex: BattlerIndex,
    hpHealed: number,
    message: string | null,
    showFullHpMessage = true,
    skipAnim = false,
    revive = false,
    healStatus = false,
    preventFullHeal = false,
    fullRestorePP = false,
  ) {
    super(battlerIndex, undefined, CommonAnim.HEALTH_UP);

    this.hpHealed = hpHealed;
    this.message = message;
    this.showFullHpMessage = showFullHpMessage;
    this.skipAnim = skipAnim;
    this.revive = revive;
    this.healStatus = healStatus;
    this.preventFullHeal = preventFullHeal;
    this.fullRestorePP = fullRestorePP;
  }

  start() {
  const pokemon = this.getPokemon();

  // ✅ revive용 HealPhase는 "hp==0일 때만" 의미가 있다
  // 이미 hp>0이면(=이미 반피 등으로 부활이 적용된 상태) 추가 heal을 막는다
  if (this.revive && pokemon.hp > 0) {
    return this.end();
  }

  if (!this.skipAnim && (this.revive || pokemon.hp) && !pokemon.isFullHp()) {
    super.start();
  } else {
    this.end();
  }
}

  end() {
    const pokemon = this.getPokemon();

    if (!pokemon.isOnField() || (!this.revive && !pokemon.isActive())) {
      return super.end();
    }

    const hasMessage = !!this.message;
    const canRestorePP = this.fullRestorePP && pokemon.getMoveset().some(mv => mv.ppUsed > 0);
    const healOrDamage = !pokemon.isFullHp() || this.hpHealed < 0 || canRestorePP;
    const healBlock = pokemon.getTag(BattlerTagType.HEAL_BLOCK) as HealBlockTag;
    let lastStatusEffect = StatusEffect.NONE;

    if (healBlock && this.hpHealed > 0) {
      globalScene.phaseManager.queueMessage(healBlock.onActivation(pokemon));
      this.message = null;
      return super.end();
    }

    if (healOrDamage) {
  const hpRestoreMultiplier = new NumberHolder(1);

  console.log("[HEAL_PHASE] start", {
    name: pokemon.name,
    baseHpHealed: this.hpHealed,
    revive: this.revive,
  });

  if (!this.revive) {
    console.log("[HEAL_PHASE] before modifiers", { multiplier: hpRestoreMultiplier.value });

    globalScene.applyModifiers(HealingBoosterModifier, this.player, hpRestoreMultiplier);
    console.log("[HEAL_PHASE] after HealingBoosterModifier", { multiplier: hpRestoreMultiplier.value });

    // ✅ tidal_bell: scene modifiers에서 내 pokemon.id에 붙은 SpeciesHealingBellModifier 찾아 적용
    const bellMods =
      (globalScene as any).modifiers?.filter((m: any) => m instanceof SpeciesHealingBellModifier) ?? [];

    const getModPokemonId = (m: any): number | undefined =>
      m?.pokemonId ?? m?.pokemonID ?? m?.pokemon?.id ?? m?.id;

    console.log(
      "[HEAL_PHASE] tidal_bell scene mods",
      bellMods.map((m: any) => ({
        ctor: m.constructor?.name,
        pokemonId: getModPokemonId(m),
        type: m?.type,
      })),
    );

    const myBell = bellMods.find((m: any) => getModPokemonId(m) === pokemon.id);

    console.log("[HEAL_PHASE] tidal_bell match", {
      pokemon: pokemon.name,
      pokemonId: pokemon.id,
      found: !!myBell,
      foundPokemonId: myBell ? getModPokemonId(myBell) : null,
    });

    if (myBell) {
      const before = hpRestoreMultiplier.value;
      hpRestoreMultiplier.value *= 1.5; // ✅ 해명의방울 회복 배율
      console.log("[HEAL_PHASE] after tidal_bell MULT", { before, after: hpRestoreMultiplier.value });
    }
  } // ✅ 여기서 if(!this.revive) 닫아줘야 함!

  const healAmount = new NumberHolder(Math.floor(this.hpHealed * hpRestoreMultiplier.value));
  console.log("[HEAL_PHASE] final heal calculation", {
    baseHpHealed: this.hpHealed,
    multiplier: hpRestoreMultiplier.value,
    finalHealAmount: healAmount.value,
  });

  if (healAmount.value < 0) {
    pokemon.damageAndUpdate(healAmount.value * -1, { result: HitResult.INDIRECT });
    healAmount.value = 0;
  }

      // Prevent healing to full if specified (in case of healing tokens so Sturdy doesn't cause a softlock)
      if (this.preventFullHeal && pokemon.hp + healAmount.value >= pokemon.getMaxHp()) {
        healAmount.value = pokemon.getMaxHp() - pokemon.hp - 1;
      }
     // ✅ 회복 "직전" 무기력 상태였는지(회복 후엔 ratio가 바뀔 수 있음)
const preHealHpRatio = pokemon.getHpRatio();

healAmount.value = pokemon.heal(healAmount.value);

// ✅ DefeatistHealBonusAbAttr: 무기력(Defeatist) + 해당 Attr 있을 때만,
// "반피 이하에서 실제로 1 이상 회복"되면 스탯 +1 (전투당 1회)
const hasDefeatist = pokemon.hasAbility?.(AbilityId.DEFEATIST, false, true) ?? false;

// 보통 Ability 인스턴스에 attrs 배열이 있음(프로젝트 구조에 맞게 접근)
const ability: any = (pokemon as any).getAbility?.() ?? (pokemon as any).ability;
const hasDefeatistHealBonusAttr =
  !!ability?.attrs?.some((a: any) => a instanceof DefeatistHealBonusAbAttr);

// revive 힐(부활/씨앗류)에는 보너스 안 주고 싶으면 !this.revive 유지
if (
  !this.revive &&
  healAmount.value > 0 &&
  preHealHpRatio <= 0.5 &&
  hasDefeatist &&
  hasDefeatistHealBonusAttr
) {
  const bd: any = (pokemon as any).battleData ??= {};
  if (!bd.defeatistHealBonusUsed) {
    bd.defeatistHealBonusUsed = true;

    globalScene.phaseManager.unshiftNew(
      "StatStageChangePhase",
      pokemon.getBattlerIndex(),
      true, // selfTarget
      [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD],
      1,
      true,  // showMessage
      false, // ignoreAbilities
      false, // canBeCopied
    );
  }
}

      if (healAmount.value) {
  globalScene.damageNumberHandler.add(pokemon, healAmount.value, HitResult.HEAL);
}
      if (pokemon.isPlayer()) {
        globalScene.validateAchvs(HealAchv, healAmount);
        if (healAmount.value > globalScene.gameData.gameStats.highestHeal) {
          globalScene.gameData.gameStats.highestHeal = healAmount.value;
        }
      }
      if (this.healStatus && !this.revive && pokemon.status) {
        lastStatusEffect = pokemon.status.effect;
        pokemon.resetStatus();
      }
      if (this.fullRestorePP) {
        for (const move of this.getPokemon().getMoveset()) {
          if (move) {
            move.ppUsed = 0;
          }
        }
      }
      pokemon.updateInfo().then(() => super.end());
    } else if (this.healStatus && !this.revive && pokemon.status) {
      lastStatusEffect = pokemon.status.effect;
      pokemon.resetStatus();
      pokemon.updateInfo().then(() => super.end());
    } else if (this.showFullHpMessage) {
      this.message = i18next.t("battle:hpIsFull", {
        pokemonName: getPokemonNameWithAffix(pokemon),
      });
    }

    if (this.message) {
      globalScene.phaseManager.queueMessage(this.message);
    }

    if (this.healStatus && lastStatusEffect && !hasMessage) {
      globalScene.phaseManager.queueMessage(
        getStatusEffectHealText(lastStatusEffect, getPokemonNameWithAffix(pokemon)),
      );
    }

    if (!healOrDamage && !lastStatusEffect) {
      super.end();
    }
  }
}