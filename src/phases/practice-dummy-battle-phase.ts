import { globalScene } from "#app/global-scene";
import { FieldPosition } from "#enums/field-position";
import type { Pokemon } from "#field/pokemon";
import { BattlePhase } from "#phases/battle-phase";

export class PracticeDummyBattlePhase extends BattlePhase {
  public readonly phaseName = "PracticeDummyBattlePhase";

  start() {
    const pm: any = globalScene.phaseManager;

    super.start();

    const battle = globalScene.currentBattle as any;

    // 기존 연습전 플래그
    battle.practiceDebugId = Math.random().toString(36).slice(2);

    battle.isPracticeBattle = true;
    battle.skipEnemyBattleTurns = true;

    // 추가한 배틀 유형 처리
    const battleType = (globalScene.gameData.practiceDummyConfig as any)?.battleType ?? "SINGLE";

    battle.double = battleType === "DOUBLE";

    console.log("[PRACTICE_BATTLE_TYPE]", battleType, battle.double);

    battle.practiceNoPpCost = true;

    battle.practicePlayerAutoRevive = !(globalScene.gameData.practiceDummyConfig?.rewardFlags?.allowAllyFaint ?? false);

    battle.practiceDummyNoHpLoss = true;

    battle.enemyParty = [];
    battle.seenEnemyPartyMemberIds.clear();

    const playerPokemon = globalScene.getPlayerPokemon() as Pokemon | undefined;

    if (playerPokemon) {
      globalScene.add.existing(playerPokemon);
      globalScene.field.add(playerPokemon);

      playerPokemon.setFieldPosition(FieldPosition.CENTER, 0);
      playerPokemon.setVisible(true);
      playerPokemon.setAlpha(1);
      playerPokemon.getSprite()?.setVisible(true);
      playerPokemon.playAnim();
      playerPokemon.showInfo();
    }

    const dummy1 = globalScene.addPracticeDummyEnemy();

    dummy1.setFieldPosition(battle.double ? FieldPosition.LEFT : FieldPosition.CENTER, 0);

    battle.practiceDummy = dummy1;

    if (battle.double) {
      const dummy2 = globalScene.addPracticeDummyEnemy();

      dummy2.setFieldPosition(FieldPosition.RIGHT, 1);

      dummy2.setVisible(true);
      dummy2.setAlpha(1);
      dummy2.getSprite?.()?.setVisible(true);
      dummy2.playAnim?.();
      dummy2.showInfo?.();

      battle.practiceDummy2 = dummy2;
    }

    dummy1.setVisible(true);
    dummy1.setAlpha(1);
    dummy1.getSprite?.()?.setVisible(true);
    dummy1.playAnim?.();
    dummy1.showInfo?.();

    globalScene.arenaEnemy.setVisible(true);
    globalScene.arenaNextEnemy.setVisible(false);
    globalScene.field.setVisible(true);

    // 내부 스프라이트는 중복 확대하지 않음
    (dummy1 as any).sprite?.setScale(1);
    (dummy1 as any).sprite?.setOrigin(0.5, 1);
    (dummy1 as any).sprite?.setVisible(true);
    (dummy1 as any).sprite?.setAlpha(1);

    console.log("[PRACTICE_DUMMY]", {
      container: {
        x: dummy1.x,
        y: dummy1.y,
        scaleX: dummy1.scaleX,
        scaleY: dummy1.scaleY,
        visible: dummy1.visible,
        alpha: dummy1.alpha,
        depth: dummy1.depth,
        children: dummy1.list?.length,
      },
      sprite: {
        x: (dummy1 as any).sprite?.x,
        y: (dummy1 as any).sprite?.y,
        scaleX: (dummy1 as any).sprite?.scaleX,
        scaleY: (dummy1 as any).sprite?.scaleY,
        visible: (dummy1 as any).sprite?.visible,
        alpha: (dummy1 as any).sprite?.alpha,
        texture: (dummy1 as any).sprite?.texture?.key,
        frame: (dummy1 as any).sprite?.frame?.name,
      },
    });

    globalScene.updateFieldScale();
    console.log("[PRACTICE_PHASE] before updateFieldScale", {
      fieldScaleX: globalScene.field.scaleX,
      fieldScaleY: globalScene.field.scaleY,
      fieldX: globalScene.field.x,
      fieldY: globalScene.field.y,
    });

    globalScene.updateFieldScale().then(() => {
      console.log("[PRACTICE_PHASE] after updateFieldScale", {
        fieldScaleX: globalScene.field.scaleX,
        fieldScaleY: globalScene.field.scaleY,
        fieldX: globalScene.field.x,
        fieldY: globalScene.field.y,
      });
    });
    battle.started = true;

    console.log("player field", globalScene.getPlayerField());
    console.log("enemy field", globalScene.getEnemyField());
    console.log("player pokemon", globalScene.getPlayerPokemon());
    console.log("enemy pokemon", globalScene.getEnemyPokemon());

    this.end();
  }
}
