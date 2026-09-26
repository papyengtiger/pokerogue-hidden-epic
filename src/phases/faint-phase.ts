import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { FRIENDSHIP_LOSS_FROM_FAINT } from "#balance/starters";
import { getMysteryMonster } from "#data/balance/mystery-monster-species-list";
import { allMoves } from "#data/data-lists";
import { battleSpecDialogue } from "#data/dialogue";
import { SpeciesFormChangeActiveTrigger } from "#data/form-change-triggers";
import { kecleonShopManager } from "#data/kecleon-shop/kecleon-shop-manager";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { mysteryTimeManager } from "#data/mystery-time/mystery-time-manager";
import { BattleSpec } from "#enums/battle-spec";
import { BattleType } from "#enums/battle-type";
import type { BattlerIndex } from "#enums/battler-index";
import { BattlerTagLapseType } from "#enums/battler-tag-lapse-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { HitResult } from "#enums/hit-result";
import { MarkId } from "#enums/mark-id";
import { MysteryMonsterId } from "#enums/mystery-monster-id";
import { StatusEffect } from "#enums/status-effect";
import { SwitchType } from "#enums/switch-type";
import type { EnemyPokemon, PlayerPokemon, Pokemon } from "#field/pokemon";
import {
  CalyrexReinsUnifiedModifier,
  DawnWingsBeadModifier,
  DuskManeBeadModifier,
  PokemonInstantReviveModifier,
  UltraBeadModifier,
  VictoryStatBoostModifier,
} from "#modifiers/modifier";
import { PokemonMove } from "#moves/pokemon-move";
import { PokemonPhase } from "#phases/pokemon-phase";
import i18next from "i18next";
import Phaser from "phaser";

export class FaintPhase extends PokemonPhase {
  public readonly phaseName = "FaintPhase";

  private preventInstantRevive: boolean;
  private source?: Pokemon;

  private mysteryTimeAwakeningPending = false;

  constructor(battlerIndex: BattlerIndex, preventInstantRevive = false, source?: Pokemon) {
    super(battlerIndex);
    this.preventInstantRevive = preventInstantRevive;
    this.source = source;
  }

  start() {
    super.start();

    const faintPokemon = this.getPokemon();

    if (!faintPokemon) {
      console.warn("[FAINT_PHASE_NO_FIELD_POKEMON]", {
        battlerIndex: this.battlerIndex,
        monsterHouse: monsterHouseManager.isActive(),
        spreadResolving: monsterHouseManager.isSpreadAttackResolving(),
      });

      return this.end();
    }

    if (faintPokemon.hp > 0 && faintPokemon.status?.effect !== StatusEffect.FAINT) {
      console.log("[FAINT_PHASE_CANCEL_ALREADY_ALIVE]", {
        pokemon: faintPokemon.getName(),
        hp: faintPokemon.hp,
        status: faintPokemon.status?.effect,
      });

      return this.end();
    }

    console.log("[FAINT_PHASE_ENTER]", {
      name: faintPokemon?.getName?.(),
      hp: faintPokemon?.hp,
      isPlayer: faintPokemon?.isPlayer?.(),
      isPractice: (globalScene.currentBattle as any)?.isPracticeBattle,
    });

    const battle = globalScene.currentBattle as any;

    const allowAllyFaint = globalScene.gameData.practiceDummyConfig?.rewardFlags?.allowAllyFaint ?? false;

    const isPracticeAllyFaint = battle?.isPracticeBattle && faintPokemon.isPlayer();

    if (isPracticeAllyFaint && !allowAllyFaint) {
      console.log("[PRACTICE_PLAYER_FAINT_BLOCKED]", {
        pokemon: faintPokemon.getName(),
        hpBefore: faintPokemon.hp,
        maxHp: faintPokemon.getMaxHp(),
      });

      faintPokemon.hp = 1;
      faintPokemon.doSetStatus(StatusEffect.NONE);
      faintPokemon.updateInfo();

      return this.end();
    }

    if (this.source) {
      faintPokemon.getTag(BattlerTagType.DESTINY_BOND)?.lapse(this.source, BattlerTagLapseType.CUSTOM);
      faintPokemon.getTag(BattlerTagType.GRUDGE)?.lapse(faintPokemon, BattlerTagLapseType.CUSTOM, this.source);
    }

    faintPokemon.resetSummonData();

    if (!this.preventInstantRevive) {
      const instantReviveModifier = globalScene.applyModifier(
        PokemonInstantReviveModifier,
        this.player,
        faintPokemon,
      ) as PokemonInstantReviveModifier;

      if (instantReviveModifier) {
        faintPokemon.loseHeldItem(instantReviveModifier);
        globalScene.updateModifiers(this.player);
        return this.end();
      }
    }

    // 플레이어 필드 참여 포켓몬 처리
    for (const pokemon of globalScene.getPlayerField()) {
      if (pokemon?.isActive(true) && pokemon.isPlayer()) {
        globalScene.currentBattle.addParticipant(pokemon as PlayerPokemon);
      }
    }

    if (!this.tryOverrideForBattleSpec()) {
      this.doFaint();
    }
  }

  doFaint(): void {
    const pokemon = this.getPokemon();

    // KO 카운트 기록 (라스트 리스펙트, 대장군 등에 사용)
    if (pokemon.isPlayer()) {
      globalScene.arena.playerFaints += 1;
      globalScene.currentBattle.playerFaintsHistory.push({
        pokemon,
        turn: globalScene.currentBattle.turn,
      });
    } else {
      globalScene.currentBattle.enemyFaints += 1;
      globalScene.currentBattle.enemyFaintsHistory.push({
        pokemon,
        turn: globalScene.currentBattle.turn,
      });
    }

    globalScene.phaseManager.queueMessage(
      i18next.t("battle:fainted", { pokemonNameWithAffix: getPokemonNameWithAffix(pokemon) }),
      null,
      true,
    );

    globalScene.triggerPokemonFormChange(pokemon, SpeciesFormChangeActiveTrigger, true);
    pokemon.resetTera();

    // PostFaintAbAttr (기절한 포켓몬의 특성 발동)
    if (pokemon.turnData.attacksReceived?.length > 0) {
      const lastAttack = pokemon.turnData.attacksReceived[0];
      applyAbAttrs("PostFaintAbAttr", {
        pokemon,
        attacker: globalScene.getPokemonById(lastAttack.sourceId) ?? undefined,
        move: new PokemonMove(lastAttack.move).getMove(),
        hitResult: lastAttack.result,
      });
    } else {
      applyAbAttrs("PostFaintAbAttr", { pokemon });
    }

    // 🔽 PostKnockOutAbAttr 브로드캐스트 (Soul-Heart, Grim Neigh 등)
    const alivePlayField = globalScene.getField(true);
    for (const p of alivePlayField) {
      if (p !== pokemon) {
        applyAbAttrs("PostKnockOutAbAttr", { pokemon: p, victim: pokemon });
      }
    }

    // 승자 계산 (아이템/특성 로직 포함)
    if (pokemon.turnData.attacksReceived?.length > 0) {
      const lastAttack = pokemon.turnData.attacksReceived[0];
      const victor =
        this.source ?? (lastAttack?.sourceId ? globalScene.getPokemonById(lastAttack.sourceId) : undefined);

      if (lastAttack && victor && victor.isOnField()) {
        // 1) 승리 모디파이어 적용 (VictoryStatBoostModifier 등)
        const victoryModifier = globalScene.applyModifier(
          VictoryStatBoostModifier,
          victor.isPlayer(),
          victor,
          1,
        ) as VictoryStatBoostModifier;

        if (victoryModifier) {
          victoryModifier.applyPostVictory(victor, pokemon, new PokemonMove(lastAttack.move).getMove(), false);
        }

        // 🌆 황혼 / 🌅 새벽 / 🌟 광명 비드 공통 KO 트리거
        const beadMods = victor
          .getHeldItems()
          .filter(
            i =>
              i instanceof DuskManeBeadModifier || i instanceof DawnWingsBeadModifier || i instanceof UltraBeadModifier,
          ) as (DuskManeBeadModifier | DawnWingsBeadModifier | UltraBeadModifier)[];

        for (const m of beadMods) {
          m.applyPostVictory(victor, pokemon, new PokemonMove(lastAttack.move).getMove(), false);
        }

        // ✅ 검은갈기/하얀갈기: 승리 시(혼연일체 발동) 아이템 효과
        const reinsMods = victor
          .getHeldItems()
          .filter(i => i instanceof CalyrexReinsUnifiedModifier) as CalyrexReinsUnifiedModifier[];

        for (const m of reinsMods) {
          m.applyPostVictory(victor, pokemon, new PokemonMove(lastAttack.move).getMove(), false);
        }

        // 2) 승리 특성(PostVictoryAbAttr) 적용
        applyAbAttrs("PostVictoryAbAttr", {
          pokemon: victor,
          victim: pokemon,
          move: new PokemonMove(lastAttack.move).getMove(),
          hitResult: lastAttack.result,
        });

        // 3) PostVictoryStatStageChangeAttr (예: 맘보르기니 Boost 특성)
        const pvmove = allMoves[lastAttack.move];
        const pvattrs = pvmove.getAttrs("PostVictoryStatStageChangeAttr");
        for (const pvattr of pvattrs) {
          pvattr.applyPostVictory(victor, victor, pvmove);
        }
      }
    }

    if (this.player) {
      const battle = globalScene.currentBattle as any;

      if (battle?.isPracticeBattle && globalScene.getPlayerParty().every((p: any) => p.hp <= 0 || p.isFainted?.())) {
        console.log("[PRACTICE_ALL_PLAYER_FAINTED]");

        this.end();
        return;
      }

      const legalPlayerPokemon = globalScene.getPokemonAllowedInBattle();
      const legalPlayerPartyPokemon = legalPlayerPokemon.filter(p => !p.isActive(true));

      if (legalPlayerPokemon.length === 0) {
        globalScene.phaseManager.unshiftNew("GameOverPhase");
      } else if (
        globalScene.currentBattle.double
        && legalPlayerPokemon.length === 1
        && legalPlayerPartyPokemon.length === 0
      ) {
        globalScene.phaseManager.unshiftNew("ToggleDoublePositionPhase", true);
      } else if (legalPlayerPartyPokemon.length > 0) {
        globalScene.phaseManager.pushNew("SwitchPhase", SwitchType.SWITCH, this.fieldIndex, true, false);
      }
    } else {
      if (!(globalScene.currentBattle as any)?.isPracticeBattle) {
        const isKecleonTheftBattle = kecleonShopManager.isTheftBattleActive();

        const isMonsterHouse = monsterHouseManager.isActive();

        // ========================================
        // 미스터리타임 특수 미스터리언 격파
        // ========================================
        if (
          mysteryTimeManager.isActive()
          && pokemon.isMysteryMonster()
          && pokemon.mark === MarkId.MYSTERY
          && !mysteryTimeManager.hasDefeatedOminous()
        ) {
          mysteryTimeManager.defeatOminousMonster();

          this.mysteryTimeAwakeningPending = true;

          console.log("[MYSTERY_TIME_OMINOUS_DEFEATED]", {
            wave: globalScene.currentBattle.waveIndex,
            name: pokemon.getName(),
            mark: pokemon.mark,
            bossAwakened: mysteryTimeManager.isBossAwakened(),
            bossWave: mysteryTimeManager.getEndWave(),
          });
        }

        // ========================================
        // 미스터리타임 보스 격파
        // ========================================
        // ========================================
        // 미스터리타임 보스 격파
        // ========================================
        if (
          mysteryTimeManager.isActive()
          && mysteryTimeManager.isFinalWave(globalScene.currentBattle.waveIndex)
          && pokemon.isMysteryMonster()
          && pokemon.isBoss()
          && !mysteryTimeManager.isBossDefeated()
        ) {
          mysteryTimeManager.defeatBoss();

          console.log("[MYSTERY_TIME_BOSS_DEFEATED]", {
            wave: globalScene.currentBattle.waveIndex,
            name: pokemon.getName(),
            rank: mysteryTimeManager.getRank(),
            bossDefeated: mysteryTimeManager.isBossDefeated(),
          });
        }
        /*
         * 몬스터소굴:
         * 적 1마리가 기절할 때마다 소굴 처리 수를 1 증가시킵니다.
         * 마지막 일반 개체가 쓰러지면 우두머리를 해금합니다.
         */
        if (isMonsterHouse) {
          monsterHouseManager.registerEnemyDefeated();

          if (monsterHouseManager.canReleaseBoss()) {
            monsterHouseManager.releaseBoss();
          }
        }

        const hasMonsterHouseReserve = isMonsterHouse && monsterHouseManager.getRemainingEnemies() > 0;

        const isMultiEnemyBattle =
          [BattleType.TRAINER, BattleType.MYSTERY_ENCOUNTER].includes(globalScene.currentBattle.battleType)
          || isKecleonTheftBattle
          || isMonsterHouse;

        const hasReservePartyMember = isMonsterHouse
          ? hasMonsterHouseReserve
          : isMultiEnemyBattle
            ? isKecleonTheftBattle
              ? globalScene.getEnemyParty().some(p => p !== pokemon && !p.isFainted() && !p.isOnField())
              : globalScene
                  .getEnemyParty()
                  .some(p => p.isActive() && !p.isOnField() && p.trainerSlot === (pokemon as EnemyPokemon).trainerSlot)
            : false;

        /*
         * 캘리몬 추격전 / 몬스터소굴:
         * 다음 적이 남아 있으면 중간 VictoryPhase만 실행하여
         * 경험치 등을 처리하고 전투는 계속합니다.
         */
        if ((isKecleonTheftBattle || isMonsterHouse) && hasReservePartyMember) {
          globalScene.phaseManager.unshiftNew("VictoryPhase", this.battlerIndex, true);
        } else {
          // 마지막 적 또는 일반 전투
          globalScene.phaseManager.unshiftNew("VictoryPhase", this.battlerIndex);
        }

        if (isMonsterHouse) {
          console.log("[MONSTER_HOUSE_FAINT_FLOW]", {
            pokemon: pokemon.getName(),
            defeated: monsterHouseManager.getDefeatedEnemies(),
            captured: monsterHouseManager.getCapturedEnemies(),
            remaining: monsterHouseManager.getRemainingEnemies(),
            bossReleased: monsterHouseManager.isBossReleased(),
            hasReservePartyMember,
          });
        }

        if (isKecleonTheftBattle) {
          const wave = globalScene.currentBattle.waveIndex;

          // 골드
          globalScene.phaseManager.pushNew("MoneyRewardPhase", 3);

          // RP
          const kecleonRp = 500 + Math.floor(wave / 10) * 250;

          globalScene.gameData.addRoguePoints(kecleonRp);
          globalScene.updateroguePointText();

          globalScene.phaseManager.queueMessage(`+${kecleonRp.toLocaleString()} RP`);
        }

        const isKecleonCleared = isKecleonTheftBattle && !hasReservePartyMember;

        const wave = globalScene.currentBattle.waveIndex;

        const isKecleonLuxuryRewardWave = wave % 10 === 0;

        const isTheftSettlementWave = globalScene.currentBattle.waveIndex === kecleonShopManager.getTheftEndWave();

        if (isKecleonTheftBattle && !hasReservePartyMember && isTheftSettlementWave) {
          globalScene.phaseManager.pushNew("KecleonLuxuryRewardPhase");

          kecleonShopManager.finishTheftChase();
        }

        const isMonsterHouseSpreadResolving = isMonsterHouse && monsterHouseManager.isSpreadAttackResolving();

        if (hasReservePartyMember && !isMonsterHouseSpreadResolving) {
          globalScene.phaseManager.pushNew("SwitchSummonPhase", SwitchType.SWITCH, this.fieldIndex, -1, false, false);
        }
      }

      const legalPlayerPokemon = globalScene.getPokemonAllowedInBattle();
      const legalPlayerPartyPokemon = legalPlayerPokemon.filter(p => !p.isActive(true));

      if (legalPlayerPokemon.length === 0) {
        globalScene.phaseManager.unshiftNew("GameOverPhase");
      } else if (
        globalScene.currentBattle.double
        && legalPlayerPokemon.length === 1
        && legalPlayerPartyPokemon.length === 0
      ) {
        globalScene.phaseManager.unshiftNew("ToggleDoublePositionPhase", true);
      } else if (legalPlayerPartyPokemon.length > 0) {
        globalScene.phaseManager.pushNew("SwitchPhase", SwitchType.SWITCH, this.fieldIndex, true, false);
      }
    }

    // in double battles redirect potential moves off fainted pokemon
    const allyPokemon = pokemon.getAlly();
    if (globalScene.currentBattle.double && allyPokemon != null) {
      globalScene.redirectPokemonMoves(pokemon, allyPokemon);
    }

    pokemon.faintCry(() => {
      if (pokemon.isPlayer()) {
        pokemon.addFriendship(-FRIENDSHIP_LOSS_FROM_FAINT);
      }
      pokemon.hideInfo();
      globalScene.playSound("se/faint");
      globalScene.tweens.add({
        targets: pokemon,
        duration: 500,
        y: pokemon.y + 150,
        ease: "Sine.easeIn",
        onComplete: () => {
          pokemon.lapseTags(BattlerTagLapseType.FAINT);

          pokemon.y -= 150;
          pokemon.doSetStatus(StatusEffect.FAINT);

          if (pokemon.isPlayer()) {
            globalScene.currentBattle.removeFaintedParticipant(pokemon as PlayerPokemon);
          } else if ((globalScene.currentBattle as any)?.isPracticeBattle) {
            globalScene.refreshPracticeDummy?.();
          } else {
            globalScene.addFaintedEnemyScore(pokemon as EnemyPokemon);
            globalScene.currentBattle.addPostBattleLoot(pokemon as EnemyPokemon);
          }

          console.log("[FAINT_ON_COMPLETE]", {
            name: pokemon.getName(),
            isPlayer: pokemon.isPlayer(),
            isPractice: (globalScene.currentBattle as any)?.isPracticeBattle,
            beforeOnField: pokemon.isOnField?.(),
          });

          if ((globalScene.currentBattle as any)?.isPracticeBattle && !pokemon.isPlayer()) {
            globalScene.refreshPracticeDummy?.();
          } else {
            pokemon.leaveField();
          }

          // ========================================
          // 데몬스터리 각성 연출
          // ========================================
          if (this.mysteryTimeAwakeningPending) {
            this.mysteryTimeAwakeningPending = false;

            this.playMysteryTimeAwakening();
          }

          this.end();
        },
      });
    });
  }

  private playMysteryTimeAwakening(): void {
    const demonstery = getMysteryMonster(MysteryMonsterId.DEMONSTERY);

    const cryKey = demonstery.getCryKey();

    const playAwakening = () => {
      console.log("[MYSTERY_TIME_DEMONSTERY_AWAKENING]", {
        wave: globalScene.currentBattle.waveIndex,
        cryKey,
        bgm: "something_is_comming!",
      });

      // 화면 흔들림
      globalScene.cameras.main.shake(1000, 0.012);

      // 데몬스터리 울음소리
      globalScene.playSound(cryKey);

      // 불길한 BGM으로 전환
      globalScene.playBgm("something_is_comming!", true);
    };

    /*
     * 이 시점에는 아직 데몬스터리 자체가
     * 생성되지 않았을 수 있으므로 울음소리가
     * 캐시에 없다면 먼저 로드한다.
     */
    if (globalScene.cache.audio.exists(cryKey)) {
      playAwakening();
      return;
    }

    globalScene.load.audio(cryKey, `audio/${cryKey}.m4a`);

    globalScene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      playAwakening();
    });

    if (!globalScene.load.isLoading()) {
      globalScene.load.start();
    }
  }

  tryOverrideForBattleSpec(): boolean {
    switch (globalScene.currentBattle.battleSpec) {
      case BattleSpec.FINAL_BOSS:
        if (!this.player) {
          const enemy = this.getPokemon();
          if (enemy.formIndex) {
            globalScene.ui.showDialogue(
              battleSpecDialogue[BattleSpec.FINAL_BOSS].secondStageWin,
              enemy.species.name,
              null,
              () => this.doFaint(),
            );
          } else {
            // Final boss' HP threshold has been bypassed; cancel faint and force check for 2nd phase
            enemy.hp++;
            globalScene.phaseManager.unshiftNew("DamageAnimPhase", enemy.getBattlerIndex(), 0, HitResult.INDIRECT);
            this.end();
          }
          return true;
        }
    }

    return false;
  }
}
