import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { SubstituteTag } from "#data/battler-tags";
import { allMoves } from "#data/data-lists";
import { SpeciesFormChangeActiveTrigger } from "#data/form-change-triggers";
import { kecleonShopManager } from "#data/kecleon-shop/kecleon-shop-manager";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { getPokeballTintColor } from "#data/pokeball";
import { ArenaTagSide } from "#enums/arena-tag-side";
import { Command } from "#enums/command";
import { MoveId } from "#enums/move-id";
import { Stat } from "#enums/stat";
import { SwitchType } from "#enums/switch-type";
import { TrainerSlot } from "#enums/trainer-slot";
import type { Pokemon } from "#field/pokemon";
import { SwitchEffectTransferModifier } from "#modifiers/modifier";
import { PokemonMove } from "#moves/pokemon-move";
import { SummonPhase } from "#phases/summon-phase";
import { inSpeedOrder } from "#utils/speed-order-generator";
import i18next from "i18next";

export class SwitchSummonPhase extends SummonPhase {
  public readonly phaseName: "SwitchSummonPhase" | "ReturnPhase" = "SwitchSummonPhase";
  private readonly switchType: SwitchType;
  private slotIndex: number;
  private readonly doReturn: boolean;

  private lastPokemon: Pokemon;
  private skipOnEnd = false;

  /**
   * Constructor for creating a new SwitchSummonPhase
   * @param switchType - The type of switch behavior
   * @param fieldIndex - Position on the battle field
   * @param slotIndex - The index of pokemon (in party of 6) to switch into
   * @param doReturn - Whether to render "comeback" dialogue
   * @param player - Whether the switch came from the player or enemy; default `true`
   */
  constructor(switchType: SwitchType, fieldIndex: number, slotIndex: number, doReturn: boolean, player = true) {
    super(fieldIndex, player);

    this.switchType = switchType;
    this.slotIndex = slotIndex;
    this.doReturn = doReturn;
  }

  start(): void {
    super.start();
  }

  preSummon(): void {
    const outgoing = this.getPokemon();
    const td: any = outgoing.turnData ?? (outgoing.turnData = {} as any);

    // ✅ 디버그
    console.log(
      "[PURSCHK] outgoing=",
      outgoing?.getName?.(),
      "battler=",
      outgoing?.getBattlerIndex?.(),
      "isSwitching=",
      !!td.isSwitching,
      "pursuitInterceptedOnce=",
      !!td.pursuitInterceptedOnce,
    );

    // ✅ 1) 재호출된 SwitchSummonPhase(= Pursuit 후 다시 들어온 교체)는 인터셉트 금지
    if (td.pursuitInterceptedOnce) {
      delete td.pursuitInterceptedOnce;
      // 교체 커맨드였으니 isSwitching은 여기서 내려도 되고(선택),
      // SwitchSummon 끝나고 정리해도 됩니다. 일단 유지해도 무방.
      // td.isSwitching = false;
    } else if (td.isSwitching && this.switchType === SwitchType.SWITCH && this.doReturn) {
      // ✅ 2) 교체 중일 때만 Pursuit 인터셉트 탐색
      const field = globalScene.getField(true);
      const commands: any[] = globalScene.currentBattle.turnCommands as any;

      const interceptor = field.find(p => {
        if (!p || p.isFainted()) {
          return false;
        }
        if (p.isPlayer() === outgoing.isPlayer()) {
          return false; // 상대만
        }

        // ✅ turnCommands는 battlerIndex로 조회해야 함 (너 로그에서 battler=2가 정답)
        const tc = commands?.[p.getBattlerIndex()];
        if (!tc || tc.skip) {
          return false;
        }
        if (tc.command !== Command.FIGHT) {
          return false;
        }

        return tc.move?.move === MoveId.PURSUIT;
      });

      console.log("[PURSCHK] interceptor=", interceptor?.getName?.(), "battler=", interceptor?.getBattlerIndex?.());

      if (interceptor) {
        const itc = commands[interceptor.getBattlerIndex()];
        const qm = itc.move;

        // ✅ Pursuit 실제 사용 Move 확보(필요시 임시 생성)
        const pursuitMove =
          interceptor.getMoveset().find(m => m.moveId === MoveId.PURSUIT && m.ppUsed < m.getMovePp())
          ?? new PokemonMove(MoveId.PURSUIT);

        // ✅ Pursuit를 “특수 인터셉트 1회”로 소비 처리 → 턴 뒤에 또 실행되지 않게
        itc.skip = true;

        // ✅ 다음에 재삽입된 SwitchSummonPhase에서는 인터셉트 블록을 건너뛰게
        td.pursuitInterceptedOnce = true;

        // ✅ 1) Pursuit 먼저
        globalScene.phaseManager.unshiftNew(
          "MovePhase",
          interceptor,
          [outgoing.getBattlerIndex()], // 교체 전 대상
          pursuitMove,
          qm.useMode,
        );

        // ✅ 2) 그 다음 교체(재삽입)
        globalScene.phaseManager.unshiftNew(
          "SwitchSummonPhase",
          this.switchType,
          this.fieldIndex,
          this.slotIndex,
          this.doReturn,
          this.player,
        );

        this.skipOnEnd = true;
        super.end();
        return;
      }
    }
    if (!this.player) {
      if (this.slotIndex === -1) {
        const isKecleonTheftBattle = kecleonShopManager.isTheftBattleActive();

        const isMonsterHouse = monsterHouseManager.isActive();

        if (isKecleonTheftBattle) {
          this.slotIndex = globalScene.getEnemyParty().findIndex(p => !p.isFainted() && !p.isOnField());
        } else if (isMonsterHouse) {
          const bossIndex = monsterHouseManager.getBossIndex();

          const bossReleased = monsterHouseManager.isBossReleased();

          this.slotIndex = globalScene
            .getEnemyParty()
            .findIndex((p, index) => !p.isFainted() && !p.isOnField() && (bossReleased || index !== bossIndex));

          console.log("[MONSTER_HOUSE_NEXT_SUMMON]", {
            slotIndex: this.slotIndex,
            bossIndex,
            bossReleased,
            remaining: monsterHouseManager.getRemainingEnemies(),
          });
        } else {
          //@ts-expect-error
          this.slotIndex =
            globalScene.currentBattle.trainer?.getNextSummonIndex(
              this.fieldIndex ? TrainerSlot.TRAINER_PARTNER : TrainerSlot.TRAINER,
            ) ?? -1;
        }
      }

      const isKecleonTheftBattle = kecleonShopManager.isTheftBattleActive();

      const isMonsterHouse = monsterHouseManager.isActive();

      if (this.slotIndex > -1 && !isKecleonTheftBattle && !isMonsterHouse) {
        this.showEnemyTrainer(this.fieldIndex % 2 ? TrainerSlot.TRAINER_PARTNER : TrainerSlot.TRAINER);

        globalScene.pbTrayEnemy.showPbTray(globalScene.getEnemyParty());
      }
    }

    if (
      !this.doReturn
      || (this.slotIndex !== -1
        && !(this.player ? globalScene.getPlayerParty() : globalScene.getEnemyParty())[this.slotIndex])
    ) {
      globalScene.time.delayedCall(750, () => this.switchAndSummon());
      return;
    }

    const pokemon = this.getPokemon();
    for (const enemyPokemon of inSpeedOrder(this.player ? ArenaTagSide.ENEMY : ArenaTagSide.PLAYER)) {
      enemyPokemon.removeTagsBySourceId(pokemon.id);
    }

    if (this.switchType === SwitchType.SWITCH || this.switchType === SwitchType.INITIAL_SWITCH) {
      const substitute = pokemon.getTag(SubstituteTag);
      if (substitute) {
        globalScene.tweens.add({
          targets: substitute.sprite,
          duration: 250,
          scale: substitute.sprite.scale * 0.5,
          ease: "Sine.easeIn",
          onComplete: () => substitute.sprite.destroy(),
        });
      }
    }

    globalScene.ui.showText(
      this.player
        ? i18next.t("battle:playerComeBack", {
            pokemonName: getPokemonNameWithAffix(pokemon),
          })
        : i18next.t("battle:trainerComeBack", {
            trainerName: globalScene.currentBattle.trainer?.getName(
              this.fieldIndex % 2 ? TrainerSlot.TRAINER_PARTNER : TrainerSlot.TRAINER,
            ),
            pokemonName: pokemon.getNameToRender(),
          }),
    );
    globalScene.playSound("se/pb_rel");
    pokemon.hideInfo();
    pokemon.tint(getPokeballTintColor(pokemon.getPokeball(true)), 1, 250, "Sine.easeIn");
    globalScene.tweens.add({
      targets: pokemon,
      duration: 250,
      ease: "Sine.easeIn",
      scale: 0.5,
      onComplete: () => {
        globalScene.time.delayedCall(750, () => this.switchAndSummon());
        pokemon.leaveField(this.switchType === SwitchType.SWITCH, false);
      },
    });
  }

  switchAndSummon() {
    const party = this.player ? this.getParty() : globalScene.getEnemyParty();
    const switchedInPokemon: Pokemon | undefined = party[this.slotIndex];

    this.lastPokemon = this.getPokemon();

    if (!switchedInPokemon) {
      console.warn("[SWITCH_SUMMON_NO_POKEMON]", {
        player: this.player,
        slotIndex: this.slotIndex,
        theftBattle: kecleonShopManager.isTheftBattleActive(),
        monsterHouse: monsterHouseManager.isActive(),
        remaining: monsterHouseManager.isActive() ? monsterHouseManager.getRemainingEnemies() : undefined,
        bossReleased: monsterHouseManager.isActive() ? monsterHouseManager.isBossReleased() : undefined,
      });

      this.end();
      return;
    }

    // ✅ 몬스터소굴에서는 대기 중 공유받은 랭크만 보존
    const monsterHouseStatStages =
      monsterHouseManager.isActive() && !this.player ? [...switchedInPokemon.summonData.statStages] : null;

    // 기존 소환 데이터는 정상적으로 초기화
    switchedInPokemon.resetSummonData();

    // 몬스터소굴에서 공유받았던 랭크만 복원
    if (monsterHouseStatStages) {
      switchedInPokemon.summonData.statStages = monsterHouseStatStages;

      console.log("[MONSTER_HOUSE_RESTORE_STAT_STAGES]", {
        pokemon: switchedInPokemon.getName(),
        statStages: [...switchedInPokemon.summonData.statStages],
        entries: switchedInPokemon.summonData.statStages.map((value, index) => ({
          stat: Stat[index],
          value,
        })),
      });
    }

    switchedInPokemon.loadAssets(true);

    if (this.switchType === SwitchType.BATON_PASS) {
      // If switching via baton pass, update opposing tags coming from the prior pokemon
      (this.player ? globalScene.getEnemyField() : globalScene.getPlayerField()).forEach((enemyPokemon: Pokemon) =>
        enemyPokemon.transferTagsBySourceId(this.lastPokemon.id, switchedInPokemon.id),
      );

      // If the recipient pokemon lacks a baton, give our baton to it during the swap
      if (
        !globalScene.findModifier(
          m =>
            m instanceof SwitchEffectTransferModifier
            && (m as SwitchEffectTransferModifier).pokemonId === switchedInPokemon.id,
        )
      ) {
        const batonPassModifier = globalScene.findModifier(
          m =>
            m instanceof SwitchEffectTransferModifier
            && (m as SwitchEffectTransferModifier).pokemonId === this.lastPokemon.id,
        ) as SwitchEffectTransferModifier;

        if (batonPassModifier) {
          globalScene.tryTransferHeldItemModifier(
            batonPassModifier,
            switchedInPokemon,
            false,
            undefined,
            undefined,
            undefined,
            false,
          );
        }
      }
    }

    party[this.slotIndex] = this.lastPokemon;
    party[this.fieldIndex] = switchedInPokemon;
    const showTextAndSummon = () => {
      globalScene.ui.showText(this.getSendOutText(switchedInPokemon));
      /**
       * If this switch is passing a Substitute, make the switched Pokemon matches the returned Pokemon's state as it left.
       * Otherwise, clear any persisting tags on the returned Pokemon.
       */
      if (this.switchType === SwitchType.BATON_PASS || this.switchType === SwitchType.SHED_TAIL) {
        const substitute = this.lastPokemon.getTag(SubstituteTag);
        if (substitute) {
          switchedInPokemon.x += this.lastPokemon.getSubstituteOffset()[0];
          switchedInPokemon.y += this.lastPokemon.getSubstituteOffset()[1];
          switchedInPokemon.setAlpha(0.5);
        }
      } else {
        if (monsterHouseManager.isActive() && !this.player) {
          switchedInPokemon.fieldSetup();

          // ★ 몬스터소굴 우두머리 시작 랭크 보정
          const bossIndex = monsterHouseManager.getBossIndex();
          const bossReleased = monsterHouseManager.isBossReleased();

          if (bossReleased && switchedInPokemon.id === monsterHouseManager.getBossPokemonId()) {
            const rank = monsterHouseManager.getRank();

            const stats = [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];

            // seeded Fisher-Yates shuffle
            for (let i = stats.length - 1; i > 0; i--) {
              const j = globalScene.currentBattle.randSeedInt(i + 1);

              [stats[i], stats[j]] = [stats[j], stats[i]];
            }

            // 1등급=1개 ... 5등급=5개
            const selectedStats = stats.slice(0, Math.min(rank, stats.length));

            globalScene.phaseManager.pushNew(
              "StatStageChangePhase",
              switchedInPokemon.getBattlerIndex(),
              true,
              selectedStats,
              1,
              true,
            );

            console.log("[MONSTER_HOUSE_BOSS_RANK_BUFF]", {
              pokemon: switchedInPokemon.getName(),
              rank,
              stats: selectedStats.map(stat => Stat[stat]),
            });
          }
        } else {
          switchedInPokemon.fieldSetup(true);
        }

        console.log("[MONSTER_HOUSE_AFTER_FIELD_SETUP]", {
          pokemon: switchedInPokemon.getName(),
          statStages: [...switchedInPokemon.summonData.statStages],
        });
      }
      this.summon();
    };

    if (this.player) {
      showTextAndSummon();
    } else if (kecleonShopManager.isTheftBattleActive() || monsterHouseManager.isActive()) {
      globalScene.time.delayedCall(500, () => {
        showTextAndSummon();
      });
    } else {
      globalScene.time.delayedCall(1500, () => {
        this.hideEnemyTrainer();
        globalScene.pbTrayEnemy.hide();
        showTextAndSummon();
      });
    }
  }

  onEnd(): void {
    if (this.skipOnEnd) {
      this.skipOnEnd = false; // ✅ 다음 정상 SwitchSummonPhase에 영향 없게
      return;
    }
    super.onEnd();

    const pokemon = this.getPokemon();

    const moveId = globalScene.currentBattle.lastMove;
    const lastUsedMove = moveId ? allMoves[moveId] : undefined;

    const currentCommand = globalScene.currentBattle.turnCommands[this.fieldIndex]?.command;
    const lastPokemonIsForceSwitchedAndNotFainted =
      lastUsedMove?.hasAttr("ForceSwitchOutAttr") && !this.lastPokemon.isFainted();
    const lastPokemonHasForceSwitchAbAttr =
      this.lastPokemon.hasAbilityWithAttr("PostDamageForceSwitchAbAttr") && !this.lastPokemon.isFainted();

    // Compensate for turn spent summoning/forced switch if switched out pokemon is not fainted.
    // Needed as we increment turn counters in `TurnEndPhase`.
    if (
      currentCommand === Command.POKEMON
      || lastPokemonIsForceSwitchedAndNotFainted
      || lastPokemonHasForceSwitchAbAttr
    ) {
      pokemon.tempSummonData.turnCount--;
      pokemon.tempSummonData.waveTurnCount--;
    }

    if (this.switchType === SwitchType.BATON_PASS && pokemon) {
      pokemon.transferSummon(this.lastPokemon);
    } else if (this.switchType === SwitchType.SHED_TAIL && pokemon) {
      const subTag = this.lastPokemon.getTag(SubstituteTag);
      if (subTag) {
        pokemon.summonData.tags.push(subTag);
      }
    }

    // Reset turn data if not initial switch (since it gets initialized to an empty object on turn start)
    if (this.switchType !== SwitchType.INITIAL_SWITCH) {
      pokemon.resetTurnData();
      pokemon.turnData.switchedInThisTurn = true;
    }

    this.lastPokemon.resetSummonData();

    globalScene.triggerPokemonFormChange(pokemon, SpeciesFormChangeActiveTrigger, true);
    // Reverts to weather-based forms when weather suppressors (Cloud Nine/Air Lock) are switched out
    globalScene.arena.triggerWeatherBasedFormChanges(pokemon);
  }

  queuePostSummon(): void {
    globalScene.phaseManager.unshiftNew("PostSummonPhase", this.getPokemon().getBattlerIndex());
  }

  /**
   * Get the text to be displayed when a pokemon is forced to switch and leave the field.
   * @param switchedInPokemon - The Pokemon having newly been sent in.
   * @returns The text to display.
   */
  private getSendOutText(switchedInPokemon: Pokemon): string {
    if (this.switchType === SwitchType.FORCE_SWITCH) {
      return i18next.t("battle:pokemonDraggedOut", {
        pokemonName: getPokemonNameWithAffix(switchedInPokemon),
      });
    }

    if (this.player) {
      return i18next.t("battle:playerGo", {
        pokemonName: getPokemonNameWithAffix(switchedInPokemon),
      });
    }

    // 캘리몬 도둑질 추격전
    if (kecleonShopManager.isTheftBattleActive()) {
      return "또 다른 캘리몬이 나타났다!";
    }

    // 몬스터소굴 연속전투
    if (monsterHouseManager.isActive()) {
      if (monsterHouseManager.isBossReleased() && monsterHouseManager.getRemainingEnemies() === 1) {
        return `우두머리 ${switchedInPokemon.getNameToRender()}이 나타났다!`;
      }

      return `또 다른 ${switchedInPokemon.getNameToRender()}이 나타났다!`;
    }

    return i18next.t("battle:trainerGo", {
      trainerName: globalScene.currentBattle.trainer?.getName(
        this.fieldIndex % 2 ? TrainerSlot.TRAINER_PARTNER : TrainerSlot.TRAINER,
      ),
      pokemonName: switchedInPokemon.getNameToRender(),
    });
  }
}
