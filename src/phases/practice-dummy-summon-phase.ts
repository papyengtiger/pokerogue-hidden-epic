import { globalScene } from "#app/global-scene";
import { BattlerIndex } from "#enums/battler-index";
import { PokemonAnimType } from "#enums/pokemon-anim-type";
import type { Pokemon } from "#field/pokemon";
import { BattlePhase } from "#phases/battle-phase";
import { TypeImmunityModifier } from "#app/modifier/modifier";
import { BattlerTagType } from "#enums/battler-tag-type";
import i18next from "i18next";
import { getPokemonNameWithAffix } from "#app/messages";

export class PracticeDummySummonPhase extends BattlePhase {
  public readonly phaseName = "PracticeDummySummonPhase";

  constructor(private readonly dummy: Pokemon) {
    super();
  }

  start(): void {
    super.start();

    const dummy = this.dummy as any;
    const battle = globalScene.currentBattle as any;

    battle.practiceDummy = dummy;

    if (!battle.enemyParty.includes(dummy)) {
      battle.enemyParty = [dummy];
    }

    dummy.isPracticeDummy = true;

    if (!dummy.parentContainer) {
      globalScene.field.add(dummy);
    }

    const logDummySpriteState = (label: string) => {
  console.log(`[DUMMY_SPRITE][${label}]`, {
    dummyVisible: dummy.visible,
    dummyAlpha: dummy.alpha,
    dummyX: dummy.x,
    dummyY: dummy.y,
    dummyParent: dummy.parentContainer?.name ?? dummy.parentContainer?.constructor?.name,

    spriteExists: !!dummy.dummySprite,
    spriteVisible: dummy.dummySprite?.visible,
    spriteAlpha: dummy.dummySprite?.alpha,
    spriteX: dummy.dummySprite?.x,
    spriteY: dummy.dummySprite?.y,
    spriteParent: dummy.dummySprite?.parentContainer?.name
      ?? dummy.dummySprite?.parentContainer?.constructor?.name,
    spriteTexture: dummy.dummySprite?.texture?.key,
    spriteFrame: dummy.dummySprite?.frame?.name,
  });
};

    logDummySpriteState("START");

logDummySpriteState("AFTER_SET_X");

const keepDummySpriteVisible = () => {
  logDummySpriteState("KEEP_BEFORE");

  dummy.setVisible(true);
  dummy.setAlpha(1);

  dummy.children?.each?.((child: any) => {
    if (child !== dummy.dummySprite) {
      child.setVisible?.(false);
      child.setAlpha?.(0);
    }
  });

  dummy.dummySprite?.setPosition(0, 0);
  dummy.dummySprite?.setVisible(true);
  dummy.dummySprite?.setAlpha(1);

  logDummySpriteState("KEEP_AFTER");
};

dummy.keepDummySpriteVisible = keepDummySpriteVisible;

dummy.getSprite = () => dummy.dummySprite;

const wrapKeep = (methodName: string) => {
  const original = dummy[methodName]?.bind(dummy);

  dummy[methodName] = (...args: any[]) => {
    const ret = original?.(...args);
    keepDummySpriteVisible();
    return ret;
  };
};

wrapKeep("showInfo");
wrapKeep("updateInfo");
wrapKeep("playAnim");
wrapKeep("tint");
wrapKeep("clearTint");
wrapKeep("untint");

keepDummySpriteVisible();
logDummySpriteState("AFTER_KEEP_1");

    battle.seenEnemyPartyMemberIds.add(dummy.id);

    const playerPokemon = globalScene.getPlayerPokemon();
    if (playerPokemon?.isOnField()) {
      globalScene.field.moveBelow(dummy, playerPokemon);
    }

    dummy.setVisible(true);
    dummy.setAlpha(1);
    dummy.showInfo();
logDummySpriteState("AFTER_SHOW_INFO");

// ✅ 연습 대타 풍선 등장 메시지
const airBalloon = dummy.getHeldItems?.().find((i: any) =>
  i instanceof TypeImmunityModifier &&
  (
    i.sourceItem?.name === "air_balloon" ||
    i.type?.id === "AIR_BALLOON" ||
    i.type?.name === "풍선" ||
    i.name === "air_balloon"
  )
);

if (
  airBalloon &&
  !(dummy.battleData as any).airBalloonFloatMessageShown
) {
  (dummy.battleData as any).airBalloonFloatMessageShown = true;

  dummy.addTag(BattlerTagType.FLOATING);

  globalScene.phaseManager.queueMessage(
    i18next.t("modifier:airBalloonActivated", {
      pokemonNameWithAffix: getPokemonNameWithAffix(dummy),
    }),
  );
}

keepDummySpriteVisible();
logDummySpriteState("AFTER_KEEP_2");

if (playerPokemon?.isOnField()) {
  console.log("[PRACTICE_PLAYER_POST_SUMMON_ABILITY]", {
    name: playerPokemon.name,
    ability: playerPokemon.getAbility?.()?.name,
    battlerIndex: playerPokemon.getBattlerIndex?.(),
  });

  globalScene.phaseManager.pushNew(
    "PostSummonActivateAbilityPhase",
    playerPokemon.getBattlerIndex(),
    0,
    false,
  );

  globalScene.phaseManager.pushNew(
    "PostSummonActivateAbilityPhase",
    playerPokemon.getBattlerIndex(),
    0,
    true,
  );
}

console.log("[PRACTICE_DUMMY_POST_SUMMON_ABILITY]", {
  name: dummy.name,
  ability: dummy.getAbility?.()?.name,
  abilityId: dummy.abilityId,
  battlerIndex: dummy.getBattlerIndex?.(),
  isPlayer: dummy.isPlayer?.(),
  held: dummy.getHeldItems?.().map((i: any) => ({
    ctor: i.constructor?.name,
    name: i.type?.name ?? i.name,
    pokemonId: i.pokemonId,
  })),
});

globalScene.phaseManager.pushNew(
  "PostSummonActivateAbilityPhase",
  dummy.getBattlerIndex(),
  0,
  false,
);
logDummySpriteState("AFTER_PUSH_ABILITY");

globalScene.phaseManager.pushNew(
  "PostSummonActivateAbilityPhase",
  dummy.getBattlerIndex(),
  0,
  true,
);
logDummySpriteState("AFTER_PUSH_PASSIVE");

globalScene.phaseManager.pushNew("TurnInitPhase");
logDummySpriteState("AFTER_PUSH_TURN_INIT");;

this.end();
  }
}