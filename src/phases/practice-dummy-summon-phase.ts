import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { TypeImmunityModifier } from "#app/modifier/modifier";
import { modifierTypes } from "#data/data-lists";
import { BattlerTagType } from "#enums/battler-tag-type";
import type { Pokemon } from "#field/pokemon";
import { BattlePhase } from "#phases/battle-phase";
import i18next from "i18next";

export class PracticeDummySummonPhase extends BattlePhase {
  public readonly phaseName = "PracticeDummySummonPhase";

  constructor(private readonly dummy: Pokemon) {
    super();
  }

  start(): void {
    super.start();

    const dummy = this.dummy as any;
    const battle = globalScene.currentBattle as any;

    battle.practiceDummy = battle.practiceDummy ?? dummy;

    if (!battle.enemyParty.includes(dummy)) {
      battle.enemyParty.push(dummy);
    }

    dummy.isPracticeDummy = true;

    // PracticeDummySummonPhase 안에서 dummy.isPracticeDummy = true; 바로 아래

    const dummyKey = (dummy as any).practiceDummyKey ?? "dummy1";
    const rentals = globalScene.gameData.practiceDummyConfig?.[dummyKey]?.rentalModifiers ?? [];

    for (const rental of rentals) {
      const factory = (modifierTypes as any)[rental.itemId];

      const type = typeof factory === "function" ? factory() : factory;

      if (!type) {
        console.warn("[PRACTICE_DUMMY_RENTAL_TYPE_NOT_FOUND]", rental.itemId);
        continue;
      }

      globalScene.givePracticeRentalModifierType?.(dummy, type, rental.quantity ?? 1);
    }

    // ✅ 연습 대타용 렌탈 아이템 pokemonId 보정
    const rentalMods = ((globalScene as any).practiceRentalModifiers ?? []) as any[];

    for (const mod of rentalMods) {
      if (
        mod instanceof TypeImmunityModifier
        && (mod.sourceItem?.name === "air_balloon"
          || mod.type?.id === "AIR_BALLOON"
          || mod.type?.name === "풍선"
          || mod.name === "air_balloon")
      ) {
        mod.pokemonId = dummy.id;
      }
    }

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
        spriteParent: dummy.dummySprite?.parentContainer?.name ?? dummy.dummySprite?.parentContainer?.constructor?.name,
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

    // ✅ 연습모드 아군 풍선 등장 메시지
    if (playerPokemon?.isOnField()) {
      const playerAirBalloon = playerPokemon
        .getHeldItems?.()
        .find(
          (i: any) =>
            i?.type?.id === "AIR_BALLOON"
            || i?.type?.localeKey?.includes?.("air_balloon")
            || i?.sourceItem?.name === "air_balloon"
            || i?.name === "air_balloon",
        );

      console.log("[PRACTICE_PLAYER_AIR_BALLOON]", {
        player: playerPokemon.name,
        playerId: playerPokemon.id,
        found: !!playerAirBalloon,
        heldItems: playerPokemon.getHeldItems?.().map((i: any) => ({
          ctor: i.constructor?.name,
          pokemonId: i.pokemonId,
          typeId: i.type?.id,
          localeKey: i.type?.localeKey,
          typeName: i.type?.name,
          sourceItemName: i.sourceItem?.name,
          name: i.name,
        })),
      });

      if (playerAirBalloon && !(playerPokemon.battleData as any).airBalloonFloatMessageShown) {
        (playerPokemon.battleData as any).airBalloonFloatMessageShown = true;

        playerPokemon.addTag(BattlerTagType.FLOATING);

        globalScene.phaseManager.queueMessage(
          i18next.t("modifier:airBalloonActivated", {
            pokemonNameWithAffix: getPokemonNameWithAffix(playerPokemon),
          }),
        );
      }
    }

    if (playerPokemon?.isOnField()) {
      globalScene.field.moveBelow(dummy, playerPokemon);
    }

    dummy.setVisible(true);
    dummy.setAlpha(1);
    dummy.showInfo();
    logDummySpriteState("AFTER_SHOW_INFO");

    // ✅ 연습 대타 풍선 등장 메시지
    // ✅ 연습 대타 풍선 등장 메시지
    const practiceMods = ((globalScene as any).practiceRentalModifiers ?? []) as any[];

    const airBalloon = practiceMods.find(
      (m: any) =>
        m instanceof TypeImmunityModifier
        && (m.pokemonId === dummy.id || m.pokemonId == null || m.pokemonId === 0)
        && (m.sourceItem?.name === "air_balloon"
          || m.type?.id === "AIR_BALLOON"
          || m.type?.name === "풍선"
          || m.name === "air_balloon"),
    );

    if (airBalloon) {
      // ✅ 대타인형에게 확실히 귀속
      airBalloon.pokemonId = dummy.id;

      const added = dummy.addTag(BattlerTagType.FLOATING);

      console.log("[PRACTICE_DUMMY_AIR_BALLOON]", {
        dummy: dummy.name,
        dummyId: dummy.id,
        added,
        balloonPokemonId: airBalloon.pokemonId,
        heldItems: dummy.getHeldItems?.().map((i: any) => ({
          ctor: i.constructor?.name,
          pokemonId: i.pokemonId,
          typeId: i.type?.id,
          typeName: i.type?.name,
          sourceItemName: i.sourceItem?.name,
          name: i.name,
        })),
      });

      if (!(dummy.battleData as any).airBalloonFloatMessageShown) {
        (dummy.battleData as any).airBalloonFloatMessageShown = true;

        globalScene.phaseManager.queueMessage(
          i18next.t("modifier:airBalloonActivated", {
            pokemonNameWithAffix: getPokemonNameWithAffix(dummy),
          }),
        );
      }
    }

    keepDummySpriteVisible();
    logDummySpriteState("AFTER_KEEP_2");

    if (playerPokemon?.isOnField()) {
      console.log("[PRACTICE_PLAYER_POST_SUMMON_ABILITY]", {
        name: playerPokemon.name,
        ability: playerPokemon.getAbility?.()?.name,
        battlerIndex: playerPokemon.getBattlerIndex?.(),
      });

      globalScene.phaseManager.pushNew("PostSummonActivateAbilityPhase", playerPokemon.getBattlerIndex(), 0, false);

      globalScene.phaseManager.pushNew("PostSummonActivateAbilityPhase", playerPokemon.getBattlerIndex(), 0, true);
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

    globalScene.phaseManager.pushNew("PostSummonActivateAbilityPhase", dummy.getBattlerIndex(), 0, false);
    logDummySpriteState("AFTER_PUSH_ABILITY");

    globalScene.phaseManager.pushNew("PostSummonActivateAbilityPhase", dummy.getBattlerIndex(), 0, true);
    logDummySpriteState("AFTER_PUSH_PASSIVE");

    globalScene.phaseManager.pushNew("TurnInitPhase");
    logDummySpriteState("AFTER_PUSH_TURN_INIT");

    this.end();
  }
}
