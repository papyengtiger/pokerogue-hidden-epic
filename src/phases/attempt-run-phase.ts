import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { RunSuccessModifier } from "#app/modifier/modifier";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { mysteryTimeManager } from "#data/mystery-time/mystery-time-manager";
import { MarkId } from "#enums/mark-id";
import { Stat } from "#enums/stat";
import { StatusEffect } from "#enums/status-effect";
import { ModifierType } from "#modifiers/modifier-type";
import { FieldPhase } from "#phases/field-phase";
import { NumberHolder } from "#utils/common";
import i18next from "i18next";

export class AttemptRunPhase extends FieldPhase {
  /** For testing purposes: this is to force the pokemon to fail and escape */
  public forceFailEscape = false;

  start() {
    super.start();

    const battle = globalScene.currentBattle as any;

    if (battle?.isPracticeBattle) {
      globalScene.playSound("se/flee");
      globalScene.phaseManager.queueMessage("넘어갔다!", null, true, 500);

      const dummy = battle.practiceDummy as any;

      if (dummy) {
        dummy.hp = dummy.maxHp ?? 100;
        dummy.status = undefined;
        dummy.battleData = {};
        dummy.turnData = {};
        dummy.summonData = {};

        dummy.setVisible?.(true);
        dummy.setAlpha?.(1);
        dummy.dummySprite?.setVisible?.(true);
        dummy.dummySprite?.setAlpha?.(1);
      }

      globalScene.phaseManager.pushNew("TurnInitPhase");
      this.end();
      return;
    }

    // 액티브 플레이어 포켓몬 가져오기
    const playerPokemon = globalScene.getPlayerField(true)[0];
    const escapeChance = new NumberHolder(0);

    // 1️⃣ 기본 도망 확률 계산 (속도 기반)
    this.attemptRunAway(globalScene.getPlayerField(), globalScene.getEnemyField(), escapeChance);

    const arena = playerPokemon.arena;
    const allies = arena?.getAllies(playerPokemon) ?? [];

    console.log("[DEBUG] 현재 아군 포켓몬 상태:");
    allies.forEach(ally => {
      console.log({
        name: ally.name,
        fainted: ally.isFainted(),
        heldItem: ally.heldItem?.modifierType,
        hasSmokeBall: ally.hasHeldItemOfType(ModifierType.SMOKE_BALL),
        arenaTag: ally.arena?.getTags(),
      });
    });

    // 2️⃣ 연막탄(Smoke Ball) 우선 적용 → 무조건 도망
    // 2️⃣ 연막탄 및 확정 도주 modifier 처리
    const currentPlayerField = globalScene.getPlayerField();

    for (const ally of currentPlayerField) {
      if (ally.hasHeldItemOfType(ModifierType.SMOKE_BALL)) {
        console.log("[DEBUG] 연막탄 소지 아군 발견 → 무조건 도망");

        escapeChance.value = 256;
        playerPokemon.battleData.escapeChance = 256;
      }

      // 연막탄 이외의 확정 도주 아이템·효과
      globalScene.applyModifiers(RunSuccessModifier, ally.isPlayer(), ally);

      escapeChance.value = Math.max(escapeChance.value, ally.battleData.escapeChance ?? 0);
    }

    // 3️⃣ 도주 특성 처리
    if (escapeChance.value < 256) {
      applyAbAttrs("RunSuccessAbAttr", {
        pokemon: playerPokemon,
        chance: escapeChance,
      });
    }

    // ========================================
    // 4️⃣ 미스터리타임 특수 개체는 확정 도주
    // ========================================
    const isOminousMysteryBattle =
      mysteryTimeManager.isActive()
      && globalScene.getEnemyField().some(enemy => enemy.isMysteryMonster() && enemy.mark === MarkId.MYSTERY);

    if (isOminousMysteryBattle) {
      escapeChance.value = 256;

      playerPokemon.battleData.escapeChance = 256;

      console.log("[MYSTERY_TIME_OMINOUS_ESCAPE_GUARANTEED]", {
        wave: globalScene.currentBattle.waveIndex,
        escapeChance: escapeChance.value,
      });
    }

    /*
     * 4️⃣ 몬스터소굴 전용 도주 확률
     *
     * 연막탄·도주 특성 등으로 이미 확정 도주라면
     * 소굴 확률로 덮어쓰지 않는다.
     */
    if (monsterHouseManager.isActive() && escapeChance.value < 256) {
      escapeChance.value = monsterHouseManager.getEscapeChance();

      playerPokemon.battleData.escapeChance = escapeChance.value;

      console.log("[MONSTER_HOUSE_ESCAPE_CHANCE]", {
        rank: monsterHouseManager.getRank(),
        chance: escapeChance.value,
      });
    }

    // 5️⃣ 최종 도주 판정
    const roll = playerPokemon.randBattleSeedInt(100);

    const escapeSuccess = roll < escapeChance.value && !this.forceFailEscape;

    console.log("[DEBUG] 도망 판정", {
      escapeChance: escapeChance.value,
      roll,
      forceFailEscape: this.forceFailEscape,
      monsterHouse: monsterHouseManager.isActive(),
    });

    if (escapeSuccess) {
      if (monsterHouseManager.isActive()) {
        monsterHouseManager.finishEscape();
      }

      globalScene.playSound("se/flee");

      globalScene.phaseManager.queueMessage(i18next.t("battle:runAwaySuccess"), null, true, 500);

      globalScene.tweens.add({
        targets: [globalScene.arenaEnemy, globalScene.getEnemyField()].flat(),
        alpha: 0,
        duration: 250,
        ease: "Sine.easeIn",
        onComplete: () => {
          globalScene.getEnemyField().forEach(enemyPokemon => {
            enemyPokemon.destroy();
          });
        },
      });

      globalScene.clearEnemyHeldItemModifiers();

      globalScene.getEnemyField().forEach(enemyPokemon => {
        enemyPokemon.hideInfo().then(() => enemyPokemon.destroy());

        enemyPokemon.hp = 0;
        enemyPokemon.trySetStatus(StatusEffect.FAINT);
      });

      globalScene.phaseManager.pushNew("BattleEndPhase", false);

      if (globalScene.gameMode.hasRandomBiomes || globalScene.isNewBiome()) {
        globalScene.phaseManager.pushNew("SelectBiomePhase");
      }

      globalScene.phaseManager.pushNew("NewBattlePhase");
    } else {
      playerPokemon.turnData.failedRunAway = true;

      globalScene.queueMessage(i18next.t("battle:runAwayCannotEscape"), null, true, 500);
    }

    this.end();
  }

  attemptRunAway(playerField: PlayerPokemon[], enemyField: EnemyPokemon[], escapeChance: NumberHolder) {
    const enemySpeed = enemyField.reduce((total, p) => total + p.getStat(Stat.SPD), 0);
    const playerSpeed = playerField.reduce((total, p) => total + p.getStat(Stat.SPD), 0);

    const isBoss = enemyField.some(p => p.isBoss());

    const speedRatio = playerSpeed / enemySpeed;
    const speedCap = isBoss ? 6 : 4;
    const minChance = 5;
    const maxChance = isBoss ? 45 : 95;
    const escapeBonus = isBoss ? 2 : 10;
    const escapeSlope = (maxChance - minChance) / speedCap;

    escapeChance.value = Phaser.Math.Clamp(
      Math.round(escapeSlope * speedRatio + minChance + escapeBonus * globalScene.currentBattle.escapeAttempts++),
      minChance,
      maxChance,
    );
  }
}
