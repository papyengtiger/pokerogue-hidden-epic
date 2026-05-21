import { globalScene } from "#app/global-scene";
import { BattlePhase } from "#phases/battle-phase";
import { SpeciesId } from "#enums/species-id";
import { TrainerSlot } from "#enums/trainer-slot";
import { FieldPosition } from "#enums/field-position";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import type { Pokemon } from "#field/pokemon";

export class PracticeDummyBattlePhase extends BattlePhase {
  public readonly phaseName = "PracticeDummyBattlePhase";

  start() {
  console.log("[PRACTICE_PHASE] start entered", {
  currentBattle: globalScene.currentBattle,
  phaseName: this.phaseName,
  fieldVisible: globalScene.field?.visible,
  arenaBgVisible: globalScene.arenaBg?.visible,
  arenaEnemyVisible: globalScene.arenaEnemy?.visible,
  arenaPlayerVisible: globalScene.arenaPlayer?.visible,
});
    const pm: any = globalScene.phaseManager;

console.log("[PRACTICE_PHASE] phase manager keys", Object.keys(pm));

console.log("[PRACTICE_PHASE] raw phaseQueue", pm.phaseQueue);
console.log("[PRACTICE_PHASE] raw phaseStack", pm.phaseStack);
console.log("[PRACTICE_PHASE] raw phases", pm.phases);
    super.start();

    const battle = globalScene.currentBattle as any;

battle.practiceDebugId = Math.random().toString(36).slice(2);

battle.isPracticeBattle = true;
battle.skipEnemyBattleTurns = true;
battle.practiceNoPpCost = true;
battle.practicePlayerAutoRevive = true;
battle.practiceDummyNoHpLoss = true;

console.log("[PRACTICE_FLAGS_SET]",
  "debugId=", battle.practiceDebugId,
  "isPracticeBattle=", battle.isPracticeBattle,
  "practiceNoPpCost=", battle.practiceNoPpCost,
);

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

    const dummy = globalScene.addPracticeDummyEnemy();
battle.practiceDummy = dummy;

dummy.setFieldPosition(FieldPosition.CENTER, 0);
dummy.setVisible(true);
dummy.setAlpha(1);
dummy.getSprite?.()?.setVisible(true);
dummy.playAnim?.();
dummy.showInfo?.();

console.log("[PRACTICE_PHASE] dummy created", {
  dummy,
  dummyParent: dummy.parentContainer?.name,
  dummyX: dummy.x,
  dummyY: dummy.y,
  dummyVisible: dummy.visible,
  dummyAlpha: dummy.alpha,
  dummyActive: dummy.active,
  enemyField: globalScene.getEnemyField(),
  enemyPokemon: globalScene.getEnemyPokemon(),
});

globalScene.arenaEnemy.setVisible(true);
globalScene.arenaNextEnemy.setVisible(false);
globalScene.field.setVisible(true);

    // 내부 스프라이트는 중복 확대하지 않음
    (dummy as any).sprite?.setScale(1);
    (dummy as any).sprite?.setOrigin(0.5, 1);
    (dummy as any).sprite?.setVisible(true);
    (dummy as any).sprite?.setAlpha(1);

    console.log("[PRACTICE_DUMMY]", {
      container: {
        x: dummy.x,
        y: dummy.y,
        scaleX: dummy.scaleX,
        scaleY: dummy.scaleY,
        visible: dummy.visible,
        alpha: dummy.alpha,
        depth: dummy.depth,
        children: dummy.list?.length,
      },
      sprite: {
        x: (dummy as any).sprite?.x,
        y: (dummy as any).sprite?.y,
        scaleX: (dummy as any).sprite?.scaleX,
        scaleY: (dummy as any).sprite?.scaleY,
        visible: (dummy as any).sprite?.visible,
        alpha: (dummy as any).sprite?.alpha,
        texture: (dummy as any).sprite?.texture?.key,
        frame: (dummy as any).sprite?.frame?.name,
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