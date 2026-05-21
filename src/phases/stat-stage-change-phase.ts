import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { handleTutorial, Tutorial } from "#app/tutorial";
import type { ArenaTag } from "#data/arena-tag";
import { MistTag } from "#data/arena-tag";
import { OctolockTag } from "#data/battler-tags";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { ArenaTagType } from "#enums/arena-tag-type";
import type { BattlerIndex } from "#enums/battler-index";
import { type BattleStat, getStatKey, getStatStageChangeDescriptionKey, Stat } from "#enums/stat";
import type { Pokemon } from "#field/pokemon";
import { ResetNegativeStatStageModifier, ProtectStatModifier, StatStageChangeCopyModifier, StatStageChangeBoostModifier, StatStageChangeReverseModifier, DuskManeBeadModifier, PreserveItemModifier } from "#modifiers/modifier";
import { recordRecycleSnapshot } from "#moves/recycle-snapshot";
import { PokemonPhase } from "#phases/pokemon-phase";
import type { ConditionalUserFieldProtectStatAbAttrParams, PreStatStageChangeAbAttrParams } from "#types/ability-types";
import { BooleanHolder, NumberHolder } from "#utils/common";
import i18next from "i18next";

export type StatStageChangeCallback = (
  target: Pokemon | null,
  changed: BattleStat[],
  relativeChanges: number[],
) => void;

export class StatStageChangePhase extends PokemonPhase {
  private stats: BattleStat[];
  private selfTarget: boolean;
  private stages: number;
  private showMessage: boolean;
  private ignoreAbilities: boolean;
  private canBeCopied: boolean;
  private onChange: StatStageChangeCallback | null;
  private comingFromMirrorArmorUser: boolean;
  private comingFromStickyWeb: boolean;
  private statList?: BattleStat[];
  private stage?: number;

  constructor(
    battlerIndex: BattlerIndex,
    selfTarget: boolean,
    stats: BattleStat[],
    stages: number,
    showMessage = true,
    ignoreAbilities = false,
    canBeCopied = true,
    onChange: StatStageChangeCallback | null = null,
    comingFromMirrorArmorUser = false,
    comingFromStickyWeb = false,
    expectedPokemonId?: number,
  ) {
    super(battlerIndex);

    this.selfTarget = selfTarget;
    this.stats = stats;
    this.stages = stages;
    this.showMessage = showMessage;
    this.ignoreAbilities = ignoreAbilities;
    this.canBeCopied = canBeCopied;
    this.onChange = onChange;
    this.comingFromMirrorArmorUser = comingFromMirrorArmorUser;
    this.comingFromStickyWeb = comingFromStickyWeb;

    // 🔽 추가
    this.statList = stats;
    this.stage = stages;
  }

  start() {
    console.log("StatStageChangePhase start", this.battlerIndex);

    const pokemon = this.getPokemon();
if (!pokemon || !pokemon.isActive(true)) return this.end();

if (this.expectedPokemonId != null && pokemon.id !== this.expectedPokemonId) {
  console.log("[SSCP] target mismatch", { expected: this.expectedPokemonId, got: pokemon.id });
  return this.end();
}

    if (this.stats.length > 1) {
      for (let i = 0; i < this.stats.length; i++) {
        const stat = [this.stats[i]];
        console.log("Unshifting phase for stat:", stat);
        globalScene.phaseManager.unshiftNew(
          "StatStageChangePhase",
          this.battlerIndex,
          this.selfTarget,
          stat,
          this.stages,
          this.showMessage,
          this.ignoreAbilities,
          this.canBeCopied,
          this.onChange,
          this.comingFromMirrorArmorUser,
        );
      }
      return this.end();
    }

    let opponentPokemon: Pokemon | undefined;

    /** Gets the position of last enemy or player pokemon that used ability or move, primarily for double battles involving Mirror Armor */
    if (pokemon.isPlayer()) {
      /** If this SSCP is not from sticky web, then we find the opponent pokemon that last did something */
      if (!this.comingFromStickyWeb) {
        opponentPokemon = globalScene.getEnemyField()[globalScene.currentBattle.lastEnemyInvolved];
      } else {
        /** If this SSCP is from sticky web, then check if pokemon that last sucessfully used sticky web is on field */
        const stickyTagID = globalScene.arena.findTagsOnSide(
          (t: ArenaTag) => t.tagType === ArenaTagType.STICKY_WEB,
          ArenaTagSide.PLAYER,
        )[0].sourceId;
        globalScene.getEnemyField().forEach(e => {
          if (e.id === stickyTagID) {
            opponentPokemon = e;
          }
        });
      }
    } else {
      if (!this.comingFromStickyWeb) {
        opponentPokemon = globalScene.getPlayerField()[globalScene.currentBattle.lastPlayerInvolved];
      } else {
        const stickyTagID = globalScene.arena.findTagsOnSide(
          (t: ArenaTag) => t.tagType === ArenaTagType.STICKY_WEB,
          ArenaTagSide.ENEMY,
        )[0].sourceId;
        globalScene.getPlayerField().forEach(e => {
          if (e.id === stickyTagID) {
            opponentPokemon = e;
          }
        });
      }
    }

    if (!pokemon.isActive(true)) {
      return this.end();
    }

    // ProtectStatModifier(클리어참)가 적용된 상태인지 확인
    // ✅ 클리어참: 해당 포켓몬이 실제로 들고 있는지 확인
const hasClearAmulet = pokemon.getHeldItems?.().some(
  item => item instanceof ProtectStatModifier,
);

    const stages = new NumberHolder(this.stages);
    let statProtected = false; // 보호 여부 변수 추가
    const protectedStats: BattleStat[] = []; // 보호된 능력치 목록 추가

   // 특성/아이템 배율
let boostMultiplier = 1;
let reverseMultiplier = 1;

// 특성 적용 (예: 단순)
if (!this.ignoreAbilities) {
  applyAbAttrs(
    "StatStageChangeMultiplierAbAttr",
    {
      pokemon,
      numStages: stages,
    },
  );

  // 단순한밴드
  const boostModifier = pokemon.getHeldItems?.().find(
    item => item instanceof StatStageChangeBoostModifier,
  ) as StatStageChangeBoostModifier | undefined;

  if (boostModifier) {
    boostMultiplier = 2;
  }

  // 내맘대로밴드
  const reverseModifier = pokemon.getHeldItems?.().find(
    item => item instanceof StatStageChangeReverseModifier,
  ) as StatStageChangeReverseModifier | undefined;

  if (reverseModifier) {
    reverseMultiplier = -1;
  }
}

// 최종 배율 적용
stages.value *= boostMultiplier * reverseMultiplier;

    // Ensure holder is initialized and properly used in subsequent logic
    if (stages && stages.value !== undefined) {
      // If holder needs to be used in another part of the code, make sure it's initialized
      const holder = stages; // This ensures you're working with the correct value
    }

    // stats 배열이 비어있거나 undefined가 아닌지 확인
    if (this.stats && this.stats.length > 0) {
      for (let i = 0; i < this.stats.length; i++) {
        const stat = this.stats[i];

        // stat이 유효한지 확인
        if (!stat) {
          continue; // stat이 없으면 건너뜀
        }

        // holder가 제대로 정의되었는지 확인
        const holder = stat.holder;
        if (!holder) {
          continue; // holder가 없으면 건너뜀
        }

        // 예시: stat을 2배 증가시키는 작업
        holder.value *= 2;
      }
    }

    // 클리어참(ProtectStatModifier)이 적용된 경우 능력치 감소 차단
    if (hasClearAmulet && stages.value < 0) {
      statProtected = true;
    }

    let simulate = false;
    const filteredStats: BattleStat[] = []; // 필터링된 결과를 담을 배열

    const duskBeadMods = pokemon.getHeldItems().filter(
  i => i instanceof DuskManeBeadModifier
) as DuskManeBeadModifier[];

    // stats 배열을 순회하면서 필터링
    for (let i = 0; i < this.stats.length; i++) {
      const stat = this.stats[i];
      const cancelled = new BooleanHolder(false);

      // ✅ 황혼비드: 능력치 감소 가드 (감소 + 상대효과일 때만)
  if (!this.selfTarget && stages.value < 0 && duskBeadMods.length) {
    const cur = pokemon.getStatStage(stat);
    const desiredStage = Math.max(cur + stages.value, -6);

    let finalStage = desiredStage;
    for (const m of duskBeadMods) {
      finalStage = m.applyStatChange(pokemon, stat, finalStage, opponentPokemon);
    }

    if (finalStage === cur) {
      cancelled.value = true;
      protectedStats.push(stat);
    }
  }

      // MistTag가 있을 때 능력치 보호
      if (!this.selfTarget && stages.value < 0 && pokemon.findTag(tag => tag instanceof MistTag)) {
        cancelled.value = true; // MistTag가 있을 때 능력치 감소 차단
        protectedStats.push(stat); // 보호된 능력치 저장
      }

      // 상대 효과인 경우에만 ProtectStatModifier가 발동하도록 수정
      if (hasClearAmulet && stages.value < 0 && !this.selfTarget) {
        cancelled.value = true;
        protectedStats.push(stat);
      }
      if (!cancelled.value && !this.selfTarget && stages.value < 0) {
        const abAttrParams: PreStatStageChangeAbAttrParams & ConditionalUserFieldProtectStatAbAttrParams = {
          pokemon,
          stat,
          cancelled,
          simulated: simulate,
          target: pokemon,
          stages: this.stages,
        };
      // 능력치 변화가 있는 경우만 적용 (단, 상승하는 경우는 제외)
      applyAbAttrs("ProtectStatAbAttr", abAttrParams);
        applyAbAttrs("ConditionalUserFieldProtectStatAbAttr", abAttrParams);
        // TODO: Consider skipping this call if `cancelled` is false.
        const ally = pokemon.getAlly();
        if (ally != null) {
          applyAbAttrs("ConditionalUserFieldProtectStatAbAttr", { ...abAttrParams, pokemon: ally });
        }

      // Mirror Armor와 반사 능력치 변경 (Octolock에 의한 변화 제외)
      if (
          opponentPokemon !== undefined &&
          // TODO: investigate whether this is stoping mirror armor from applying to non-octolock
          // reasons for stat drops if the user has the Octolock tag
          !pokemon.findTag(t => t instanceof OctolockTag) &&
          !this.comingFromMirrorArmorUser
        ) {
          applyAbAttrs("ReflectStatStageChangeAbAttr", {
            pokemon,
            stat,
            cancelled,
            simulated: simulate,
            source: opponentPokemon,
            stages: this.stages,
          });
        }
      }
      // 능력치 감소가 취소되었을 때 나머지 효과 시뮬레이션
      if (cancelled.value) {
        simulate = true;
      }

      // 필터링된 결과 배열에 추가
      if (!cancelled.value) {
        filteredStats.push(stat);
      }
    }

    // 보호된 능력치 메시지 출력
    if (protectedStats.length > 0) {
      globalScene.phaseManager.queueMessage(
        i18next.t("modifier:protectStatStageBlocked", {
          pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
          statName: protectedStats.join(", "),
        }),
      );
    }

    const relLevels = filteredStats.map(
      s =>
        (stages.value >= 1
          ? Math.min(pokemon.getStatStage(s) + stages.value, 6)
          : Math.max(pokemon.getStatStage(s) + stages.value, -6)) - pokemon.getStatStage(s),
    );

    // 🔽 여기에 추가
    this.statList = filteredStats;
    this.stage = stages.value;

    this.onChange && this.onChange(this.getPokemon(), filteredStats, relLevels);

    const end = () => {
      if (this.showMessage) {
        const messages = this.getStatStageChangeMessages(filteredStats, stages.value, relLevels);
        for (const message of messages) {
          globalScene.phaseManager.queueMessage(message);
        }
      }

      for (const s of filteredStats) {
        if (stages.value > 0 && pokemon.getStatStage(s) < 6) {
          if (!pokemon.turnData) {
            // Temporary fix for missing turn data struct on turn 1
            pokemon.resetTurnData();
          }
          pokemon.turnData.statStagesIncreased = true;
        } else if (stages.value < 0 && pokemon.getStatStage(s) > -6) {
          if (!pokemon.turnData) {
            // Temporary fix for missing turn data struct on turn 1
            pokemon.resetTurnData();
          }
          pokemon.turnData.statStagesDecreased = true;
        }

        pokemon.setStatStage(s, pokemon.getStatStage(s) + stages.value);
      }

      const copiedSet = new Set<number>(); // 중복 방지용

      if (this.statList?.length && this.stage > 0 && this.canBeCopied) {
        for (const opponent of pokemon.getOpponents()) {
          if (copiedSet.has(opponent.id)) continue;

          // ✅ 이미 같은 battlerIndex 대상으로 복사 큐에 있으면 생략
          const existingPhase = globalScene.phaseManager.hasPhaseOfType(
        p => p.is("StatStageChangePhase") && p.battlerIndex === this.battlerIndex,
      );
          if (existingPhase) continue;

          // ✅ opponent에게 실제 적용된 흉내허브 modifier만 필터링
          // ✅ opponent에게 실제 적용된 흉내허브 modifier만 필터링
const mirrorHerb = opponent.getHeldItems?.().find(
  item => item instanceof StatStageChangeCopyModifier,
) as StatStageChangeCopyModifier | undefined;

if (!mirrorHerb) {
  continue;
}

const copied = mirrorHerb.apply(opponent, this.statList, this.stage);

if (copied) {
  copiedSet.add(opponent.id);

  const preserve = new BooleanHolder(false);

  globalScene.applyModifiers(
    PreserveItemModifier,
    opponent.isPlayer(),
    opponent,
    preserve,
    "item",
  );

  if (!preserve.value) {
    recordRecycleSnapshot(opponent, mirrorHerb, { args: [] });

    if (mirrorHerb.stackCount > 1) {
      mirrorHerb.stackCount--;
    } else {
      opponent.loseHeldItem(mirrorHerb);
    }
  }

  globalScene.updateModifiers(opponent.isPlayer());
  opponent.updateInfo();

  applyAbAttrs("StatStageChangeCopyAbAttr", {
    pokemon: opponent,
    stats: this.stats,
    numStages: stages.value,
  });
}
        }
      }

      applyAbAttrs("PostStatStageChangeAbAttr", {
        pokemon,
        stats: filteredStats,
        stages: this.stages,
        selfTarget: this.selfTarget,
      });

      // Look for any other stat change phases; if this is the last one, do White Herb check
      if (!globalScene.phaseManager.hasPhaseOfType("StatStageChangePhase", p => p.battlerIndex === this.battlerIndex)) {
        // Apply White Herb if needed
        const whiteHerb = globalScene.applyModifier(
          ResetNegativeStatStageModifier,
          this.player,
          pokemon,
        ) as ResetNegativeStatStageModifier;
        // If the White Herb was applied, consume it
        if (whiteHerb) {
          pokemon.loseHeldItem(whiteHerb);
          globalScene.updateModifiers(this.player);
        }
      }

      pokemon.updateInfo();

if ((pokemon as any).isPracticeDummy) {
  (pokemon as any).keepDummySpriteVisible?.();
}

handleTutorial(Tutorial.Stat_Change).then(() => super.end());
    };

    if (
  relLevels.filter(l => l).length
  && globalScene.moveAnimations
  && !(pokemon as any).isPracticeDummy
) {
      pokemon.enableMask();
      const pokemonMaskSprite = pokemon.maskSprite;

      const tileX = (this.player ? 106 : 236) * pokemon.getSpriteScale() * globalScene.field.scale;
      const tileY =
        ((this.player ? 148 : 84) + (stages.value >= 1 ? 160 : 0)) * pokemon.getSpriteScale() * globalScene.field.scale;
      const tileWidth = 156 * globalScene.field.scale * pokemon.getSpriteScale();
      const tileHeight = 316 * globalScene.field.scale * pokemon.getSpriteScale();

      // On increase, show the red sprite located at ATK
      // On decrease, show the blue sprite located at SPD
      const spriteColor = stages.value >= 1 ? Stat[Stat.ATK].toLowerCase() : Stat[Stat.SPD].toLowerCase();
      const statSprite = globalScene.add.tileSprite(tileX, tileY, tileWidth, tileHeight, "battle_stats", spriteColor);
      statSprite.setPipeline(globalScene.fieldSpritePipeline);
      statSprite.setAlpha(0);
      statSprite.setScale(6);
      statSprite.setOrigin(0.5, 1);

      globalScene.playSound(`se/stat_${stages.value >= 1 ? "up" : "down"}`);

      statSprite.setMask(new Phaser.Display.Masks.BitmapMask(globalScene, pokemonMaskSprite ?? undefined));

      globalScene.tweens.add({
        targets: statSprite,
        duration: 250,
        alpha: 0.8375,
        onComplete: () => {
          globalScene.tweens.add({
            targets: statSprite,
            delay: 1000,
            duration: 250,
            alpha: 0,
          });
        },
      });

      globalScene.tweens.add({
        targets: statSprite,
        duration: 1500,
        y: `${stages.value >= 1 ? "-" : "+"}=${160 * 6}`,
      });

      globalScene.time.delayedCall(1750, () => {
        pokemon.disableMask();
        end();
      });
    } else {
      end();
    }
  }

  aggregateStatStageChanges(): void {
    const accEva: BattleStat[] = [Stat.ACC, Stat.EVA];
    const isAccEva = accEva.some(s => this.stats.includes(s));
    let existingPhase: StatStageChangePhase;
    if (this.stats.length === 1) {
      while (
        (existingPhase = globalScene.phaseManager.hasPhaseOfType(
          p =>
            p.is("StatStageChangePhase") &&
            p.battlerIndex === this.battlerIndex &&
            p.stats.length === 1 &&
            p.stats[0] === this.stats[0] &&
            p.selfTarget === this.selfTarget &&
            p.showMessage === this.showMessage &&
            p.ignoreAbilities === this.ignoreAbilities,
        ) as StatStageChangePhase)
      ) {
        this.stages += existingPhase.stages;

        if (!globalScene.phaseManager.tryRemovePhase(p => p === existingPhase)) {
          break;
        }
      }
    }
    while (
      (existingPhase = globalScene.phaseManager.hasPhaseOfType(
        p =>
          p.is("StatStageChangePhase") &&
          p.battlerIndex === this.battlerIndex &&
          p.selfTarget === this.selfTarget &&
          accEva.some(s => p.stats.includes(s)) === isAccEva &&
          p.stages === this.stages &&
          p.showMessage === this.showMessage &&
          p.ignoreAbilities === this.ignoreAbilities,
      ) as StatStageChangePhase)
    ) {
      this.stats.push(...existingPhase.stats);
      if (!globalScene.phaseManager.tryRemovePhase(p => p === existingPhase)) {
        break;
      }
    }
  }

  getStatStageChangeMessages(stats: BattleStat[], stages: number, relStages: number[]): string[] {
    const messages: string[] = [];

    const relStageStatIndexes = {};
    for (let rl = 0; rl < relStages.length; rl++) {
      const relStage = relStages[rl];
      if (!relStageStatIndexes[relStage]) {
        relStageStatIndexes[relStage] = [];
      }
      relStageStatIndexes[relStage].push(rl);
    }

    Object.keys(relStageStatIndexes).forEach(rl => {
      const relStageStats = stats.filter((_, i) => relStageStatIndexes[rl].includes(i));
      let statsFragment = "";

      if (relStageStats.length > 1) {
        statsFragment =
          relStageStats.length >= 5
            ? i18next.t("battle:stats")
            : `${relStageStats
                .slice(0, -1)
                .map(s => i18next.t(getStatKey(s)))
                .join(
                  ", ",
                )}${relStageStats.length > 2 ? "," : ""} ${i18next.t("battle:statsAnd")} ${i18next.t(getStatKey(relStageStats[relStageStats.length - 1]))}`;
        messages.push(
          i18next.t(getStatStageChangeDescriptionKey(Math.abs(Number.parseInt(rl)), stages >= 1), {
            pokemonNameWithAffix: getPokemonNameWithAffix(this.getPokemon()),
            stats: statsFragment,
            count: relStageStats.length,
          }),
        );
      } else {
        statsFragment = i18next.t(getStatKey(relStageStats[0]));
        messages.push(
          i18next.t(getStatStageChangeDescriptionKey(Math.abs(Number.parseInt(rl)), stages >= 1), {
            pokemonNameWithAffix: getPokemonNameWithAffix(this.getPokemon()),
            stats: statsFragment,
            count: relStageStats.length,
          }),
        );
      }
    });

    return messages;
  }
}
