import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import Overrides from "#app/overrides";
import { Stat } from "#enums/stat";
import { StatusEffect } from "#enums/status-effect";
import { FieldPhase } from "#phases/field-phase";
import { NumberHolder } from "#utils/common";
import i18next from "i18next";
import { RunSuccessModifier } from "#app/modifier/modifier";
import { ModifierType } from "#modifiers/modifier-type";

export class AttemptRunPhase extends FieldPhase {
  /** For testing purposes: this is to force the pokemon to fail and escape */
  public forceFailEscape = false;

  start() {
    super.start();

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
        hasNeutralizingGas: ally.arena?.hasTag(ArenaTagType.NEUTRALIZING_GAS),
      });
    });

    // 2️⃣ 연막탄(Smoke Ball) 우선 적용 → 무조건 도망
    const currentPlayerField = globalScene.getPlayerField();
    currentPlayerField.forEach(ally => {
      if (ally.hasHeldItemOfType(ModifierType.SMOKE_BALL)) {
        console.log("[DEBUG] 연막탄 소지 아군 발견 → 무조건 도망");
        escapeChance.value = 256;
        playerPokemon.battleData.escapeChance = 256;
      }

      // 3️⃣ RunSuccessModifier 적용 (연막탄 외 아이템/효과)
      globalScene.applyModifiers(RunSuccessModifier, ally.isPlayer(), ally);
    });

    // 4️⃣ 특성 처리 (RunSuccessAbAttr)
    if (escapeChance.value < 256) {
      applyAbAttrs("RunSuccessAbAttr", { pokemon: playerPokemon, chance: escapeChance });
    }

    // 5️⃣ 최종 도망 판정
    const roll = playerPokemon.randBattleSeedInt(100);
    const escapeSuccess = roll < escapeChance.value && !this.forceFailEscape;

    console.log("[DEBUG] 도망 판정", {
      escapeChance: escapeChance.value,
      roll,
      forceFailEscape: this.forceFailEscape,
    });

    if (escapeSuccess) {
      globalScene.playSound("se/flee");
      globalScene.phaseManager.queueMessage(i18next.t("battle:runAwaySuccess"), null, true, 500);

      globalScene.tweens.add({
        targets: [globalScene.arenaEnemy, globalScene.getEnemyField()].flat(),
        alpha: 0,
        duration: 250,
        ease: "Sine.easeIn",
        onComplete: () => globalScene.getEnemyField().forEach(enemyPokemon => enemyPokemon.destroy()),
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
