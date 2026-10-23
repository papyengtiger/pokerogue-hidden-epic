import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { TypeImmunityModifier, WishingStarModifier } from "#app/modifier/modifier";
import { SpeciesFormChangeActiveTrigger } from "#data/form-change-triggers";
import { getPokeballAtlasKey, getPokeballTintColor } from "#data/pokeball";
import { BattleType } from "#enums/battle-type";
import { BattlerTagType } from "#enums/battler-tag-type";
import { FieldPosition } from "#enums/field-position";
import { MysteryEncounterMode } from "#enums/mystery-encounter-mode";
import { PlayerGender } from "#enums/player-gender";
import { Stat } from "#enums/stat";
import { TrainerSlot } from "#enums/trainer-slot";
import { addPokeballOpenParticles } from "#field/anims";
import type { Pokemon } from "#field/pokemon";
import { PartyMemberPokemonPhase } from "#phases/party-member-pokemon-phase";
import { randSeedInt } from "#utils/common";
import i18next from "i18next";

export class SummonPhase extends PartyMemberPokemonPhase {
  // The union type is needed to keep typescript happy as these phases extend from SummonPhase
  public readonly phaseName: "SummonPhase" | "SummonMissingPhase" | "SwitchSummonPhase" | "ReturnPhase" = "SummonPhase";
  private loaded: boolean;
  protected companion: boolean;

  constructor(partyMemberIndex: number, player = true, loaded = false, fieldIndex?: number, companion = false) {
    super(partyMemberIndex, player);

    if (fieldIndex !== undefined) {
      this.fieldIndex = fieldIndex;
    }

    this.loaded = loaded;
    this.companion = companion;
  }

  start() {
    super.start();

    const pokemon = this.getPokemon();

    const isCompanionSummon =
      this.player
      && this.fieldIndex === 1
      && !!globalScene.currentBattle.companionTrainer
      && (this.companion || globalScene.getCompanionParty().some(p => p.id === pokemon.id));

    const continueSummon = () => {
      applyAbAttrs("PreSummonAbAttr", { pokemon });
      this.preSummon();
    };

    if (isCompanionSummon) {
      pokemon.loadAssets().then(() => {
        console.log("[COMPANION_ASSETS_LOADED]", {
          name: pokemon.getName(),
          spriteKey: pokemon.getBattleSpriteKey(true),
          animExists: globalScene.anims.exists(pokemon.getBattleSpriteKey(true)),
        });

        continueSummon();
      });

      return;
    }

    continueSummon();
  }

  /**
   * Sends out a Pokemon before the battle begins and shows the appropriate messages
   */
  preSummon(): void {
    const partyMember = this.getPokemon();
    // If the Pokemon about to be sent out is fainted, illegal under a challenge, or no longer in the party for some reason, switch to the first non-fainted legal Pokemon
    if (!partyMember.isAllowedInBattle() || (this.player && !this.getParty().some(p => p.id === partyMember.id))) {
      console.warn(
        "The Pokemon about to be sent out is fainted or illegal under a challenge. Attempting to resolve...",
      );

      // First check if they're somehow still in play, if so remove them.
      if (partyMember.isOnField()) {
        partyMember.leaveField();
      }

      const party = this.getParty();

      // Find the first non-fainted Pokemon index above the current one
      const legalIndex = party.findIndex((p, i) => i > this.partyMemberIndex && p.isAllowedInBattle());
      if (legalIndex === -1) {
        console.error("Party Details:\n", party);
        console.error("All available Pokemon were fainted or illegal!");
        globalScene.clearPhaseQueue();
        globalScene.unshiftPhase(new GameOverPhase());
        this.end();
        return;
      }

      // Swaps the fainted Pokemon and the first non-fainted legal Pokemon in the party
      [party[this.partyMemberIndex], party[legalIndex]] = [party[legalIndex], party[this.partyMemberIndex]];
      console.warn(
        "Swapped %s %O with %s %O",
        getPokemonNameWithAffix(partyMember),
        partyMember,
        getPokemonNameWithAffix(party[0]),
        party[0],
      );
    }

    if (this.player) {
      const isCompanionSummon =
        this.fieldIndex === 1 && !!globalScene.currentBattle.companionTrainer && !!globalScene.companionTrainerSprite;

      const hasCompanion =
        !isCompanionSummon && !!globalScene.currentBattle.companionTrainer && !!globalScene.companionTrainerSprite;

      console.log("[COMPANION_TRAINER_ANIM]", {
        fieldIndex: this.fieldIndex,
        isCompanionSummon,
        hasCompanion,
        hasBattleCompanion: !!globalScene.currentBattle.companionTrainer,
        hasSprite: !!globalScene.companionTrainerSprite,
      });

      globalScene.ui.showText(
        i18next.t("battle:playerGo", {
          pokemonName: getPokemonNameWithAffix(this.getPokemon()),
        }),
      );

      globalScene.pbTray.hide();

      // ==========================================
      // 동료 자신의 SummonPhase
      // 이미 플레이어와 함께 등장 연출을 했으므로
      // 트레이너를 다시 띄우지 않는다.
      // ==========================================
      if (isCompanionSummon) {
        globalScene.time.delayedCall(250, () => this.summon());
        return;
      }

      // ==========================================
      // 플레이어 트레이너
      // ==========================================
      const trainerSprite = globalScene.trainer;

      trainerSprite.setTexture(`trainer_${globalScene.gameData.gender === PlayerGender.FEMALE ? "f" : "m"}_back_pb`);

      trainerSprite.setPosition(70, 186);
      trainerSprite.setVisible(true);
      trainerSprite.setFrame("1");

      const companionSprite = hasCompanion ? globalScene.companionTrainerSprite! : null;

      if (companionSprite) {
        companionSprite.setTexture(
          globalScene.gameData.gender === PlayerGender.FEMALE ? "trainer_m_back_pb" : "trainer_f_back_pb",
        );

        companionSprite.setPosition(118, 186);
        companionSprite.setVisible(true);
        companionSprite.setFrame("1");

        console.log("[COMPANION_TRAINER_VISIBLE]", {
          x: companionSprite.x,
          y: companionSprite.y,
          visible: companionSprite.visible,
          texture: companionSprite.texture.key,
        });
      }

      // 둘이 동시에 몬스터볼을 드는 프레임
      globalScene.time.delayedCall(562, () => {
        trainerSprite.setFrame("2");
        companionSprite?.setFrame("2");

        globalScene.time.delayedCall(64, () => {
          trainerSprite.setFrame("3");
          companionSprite?.setFrame("3");
        });
      });

      globalScene.tweens.add({
        targets: trainerSprite,
        x: -36,
        duration: 1000,
        onComplete: () => trainerSprite.setVisible(false),
      });

      if (companionSprite) {
        globalScene.tweens.add({
          targets: companionSprite,
          x: 12,
          duration: 1000,
          onComplete: () => companionSprite.setVisible(false),
        });
      }

      globalScene.time.delayedCall(750, () => this.summon());
    } else if (
      globalScene.currentBattle.battleType === BattleType.TRAINER
      || globalScene.currentBattle.mysteryEncounter?.encounterMode === MysteryEncounterMode.TRAINER_BATTLE
    ) {
      const trainerName = globalScene.currentBattle.trainer?.getName(
        !(this.fieldIndex % 2) ? TrainerSlot.TRAINER : TrainerSlot.TRAINER_PARTNER,
      );
      const pokemonName = this.getPokemon().getNameToRender();
      const message = i18next.t("battle:trainerSendOut", {
        trainerName,
        pokemonName,
      });

      globalScene.pbTrayEnemy.hide();
      globalScene.ui.showText(message, null, () => this.summon());
    } else if (globalScene.currentBattle.isBattleMysteryEncounter()) {
      globalScene.pbTrayEnemy.hide();
      this.summonWild();
    }
  }

  /**
   * Enemy trainer or player trainer will do animations to throw Pokeball and summon a Pokemon to the field.
   */
  summon(): void {
    const pokemon = this.getPokemon();

    const isCompanionSummon = this.player && this.fieldIndex === 1 && !!globalScene.currentBattle.companionTrainer;

    const pokeball = globalScene.addFieldSprite(
      this.player ? (isCompanionSummon ? 68 : 36) : 248,
      this.player ? 80 : 44,
      "pb",
      getPokeballAtlasKey(pokemon.getPokeball(true)),
    );
    pokeball.setVisible(false);
    pokeball.setOrigin(0.5, 0.625);
    globalScene.field.add(pokeball);

    if (this.fieldIndex === 1) {
      pokemon.setFieldPosition(FieldPosition.RIGHT, 0);
    } else {
      const availablePartyMembers = this.getParty().filter(p => p.isAllowedInBattle()).length;
      pokemon.setFieldPosition(
        !globalScene.currentBattle.double || availablePartyMembers === 1 ? FieldPosition.CENTER : FieldPosition.LEFT,
      );
    }

    const fpOffset = pokemon.getFieldPositionOffset();

    pokeball.setVisible(true);

    globalScene.tweens.add({
      targets: pokeball,
      duration: 650,
      x: (this.player ? (isCompanionSummon ? 116 : 100) : 236) + fpOffset[0],
    });

    globalScene.tweens.add({
      targets: pokeball,
      duration: 150,
      ease: "Cubic.easeOut",
      y: (this.player ? 70 : 34) + fpOffset[1],
      onComplete: () => {
        globalScene.tweens.add({
          targets: pokeball,
          duration: 500,
          ease: "Cubic.easeIn",
          angle: 1440,
          y: (this.player ? 132 : 86) + fpOffset[1],
          onComplete: () => {
            globalScene.playSound("se/pb_rel");
            pokeball.destroy();
            globalScene.add.existing(pokemon);
            globalScene.field.add(pokemon);
            if (!this.player) {
              const playerPokemon = globalScene.getPlayerPokemon() as Pokemon;
              if (playerPokemon?.isOnField()) {
                globalScene.field.moveBelow(pokemon, playerPokemon);
              }
              globalScene.currentBattle.seenEnemyPartyMemberIds.add(pokemon.id);
            }
            addPokeballOpenParticles(pokemon.x, pokemon.y - 16, pokemon.getPokeball(true));
            globalScene.updateModifiers(this.player);
            globalScene.updateFieldScale();
            pokemon.showInfo();
            pokemon.playAnim();
            pokemon.setVisible(true);
            pokemon.getSprite().setVisible(true);
            pokemon.setScale(0.5);
            pokemon.tint(getPokeballTintColor(pokemon.getPokeball(true)));
            pokemon.untint(250, "Sine.easeIn");
            globalScene.updateFieldScale();
            globalScene.tweens.add({
              targets: pokemon,
              duration: 250,
              ease: "Sine.easeIn",
              scale: pokemon.getSpriteScale(),
              onComplete: () => {
                pokemon.cry(pokemon.getHpRatio() > 0.25 ? undefined : { rate: 0.85 });
                pokemon.getSprite().clearTint();
                pokemon.fieldSetup();

                // ✅ 풍선 체크
                const airBalloon = pokemon
                  .getHeldItems?.()
                  .find(
                    i =>
                      i instanceof TypeImmunityModifier
                      && ((i as any).sourceItem?.name === "air_balloon"
                        || (i as any).type?.id === "AIR_BALLOON"
                        || (i as any).type?.name === "풍선"
                        || (i as any).name === "air_balloon"),
                  );

                if (airBalloon && !(pokemon.battleData as any).airBalloonFloatMessageShown) {
                  (pokemon.battleData as any).airBalloonFloatMessageShown = true;

                  pokemon.addTag(BattlerTagType.FLOATING);

                  globalScene.phaseManager.queueMessage(
                    i18next.t("modifier:airBalloonActivated", {
                      pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
                    }),
                  );
                }

                // 기존 코드
                if (pokemon.summonData.speciesForm) {
                  pokemon.loadAssets(false);
                }
                globalScene.time.delayedCall(1000, () => this.end());
              },
            });
          },
        });
      },
    });
  }

  /**
   * Handles tweening and battle setup for a wild Pokemon that appears outside of the normal screen transition.
   * Wild Pokemon will ease and fade in onto the field, then perform standard summon behavior.
   * Currently only used by Mystery Encounters, as all other battle types pre-summon wild pokemon before screen transitions.
   */
  summonWild(): void {
    const pokemon = this.getPokemon();

    if (this.fieldIndex === 1) {
      pokemon.setFieldPosition(FieldPosition.RIGHT, 0);
    } else {
      const availablePartyMembers = this.getParty().filter(p => !p.isFainted()).length;
      pokemon.setFieldPosition(
        !globalScene.currentBattle.double || availablePartyMembers === 1 ? FieldPosition.CENTER : FieldPosition.LEFT,
      );
    }

    globalScene.add.existing(pokemon);
    globalScene.field.add(pokemon);
    if (!this.player) {
      const playerPokemon = globalScene.getPlayerPokemon() as Pokemon;
      if (playerPokemon?.isOnField()) {
        globalScene.field.moveBelow(pokemon, playerPokemon);
      }
      globalScene.currentBattle.seenEnemyPartyMemberIds.add(pokemon.id);
    }
    globalScene.updateModifiers(this.player);
    globalScene.updateFieldScale();
    pokemon.showInfo();
    pokemon.playAnim();
    pokemon.setVisible(true);
    pokemon.getSprite().setVisible(true);
    pokemon.setScale(0.75);
    pokemon.tint(getPokeballTintColor(pokemon.pokeball));
    pokemon.untint(250, "Sine.easeIn");
    globalScene.updateFieldScale();
    pokemon.x += 16;
    pokemon.y -= 20;
    pokemon.alpha = 0;

    // Ease pokemon in
    globalScene.tweens.add({
      targets: pokemon,
      x: "-=16",
      y: "+=16",
      alpha: 1,
      duration: 1000,
      ease: "Sine.easeIn",
      scale: pokemon.getSpriteScale(),
      onComplete: () => {
        pokemon.cry(pokemon.getHpRatio() > 0.25 ? undefined : { rate: 0.85 });
        pokemon.getSprite().clearTint();
        pokemon.fieldSetup();

        // ✅ 풍선 체크
        const airBalloon = pokemon
          .getHeldItems?.()
          .find(
            i =>
              i instanceof TypeImmunityModifier
              && ((i as any).sourceItem?.name === "air_balloon"
                || (i as any).type?.id === "AIR_BALLOON"
                || (i as any).type?.name === "풍선"
                || (i as any).name === "air_balloon"),
          );

        if (airBalloon && !(pokemon.battleData as any).airBalloonFloatMessageShown) {
          (pokemon.battleData as any).airBalloonFloatMessageShown = true;

          pokemon.addTag(BattlerTagType.FLOATING);

          globalScene.phaseManager.queueMessage(
            i18next.t("modifier:airBalloonActivated", {
              pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
            }),
          );
        }
        globalScene.updateFieldScale();
        globalScene.time.delayedCall(1000, () => this.end());
      },
    });
  }

  private applyHardTrainerBoost(): void {
    if (
      this.player
      || this.loaded
      || globalScene.gameMode.difficulty !== "HARD"
      || globalScene.currentBattle.battleType !== BattleType.TRAINER
    ) {
      return;
    }

    const pokemon = this.getPokemon();
    const trainer = globalScene.currentBattle.trainer;

    if (!pokemon || !trainer) {
      return;
    }

    // 같은 포켓몬에게 여러 번 지급하지 않음
    const battleData = pokemon.battleData as typeof pokemon.battleData & {
      hardInitialBoostApplied?: boolean;
    };

    if (battleData.hardInitialBoostApplied) {
      return;
    }

    const tier = trainer.config.hardBoostTier ?? 1;

    const candidates = [Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];

    const count = tier === 4 ? 1 : Math.min(tier, 3);
    const stages = tier === 4 ? 2 : 1;

    const selectedStats: Stat[] = [];

    for (let i = 0; i < count; i++) {
      const index = randSeedInt(candidates.length);
      selectedStats.push(candidates.splice(index, 1)[0]);
    }

    battleData.hardInitialBoostApplied = true;

    globalScene.phaseManager.pushNew(
      "StatStageChangePhase",
      pokemon.getBattlerIndex(),
      true,
      selectedStats,
      stages,
      true,
    );

    console.log("[HARD_TRAINER_STAT_BOOST]", {
      pokemon: pokemon.name,
      trainer: trainer.config.trainerType,
      tier,
      stats: selectedStats.map(stat => Stat[stat]),
      stages,
    });
  }

  onEnd(): void {
    const pokemon = this.getPokemon();

    console.log("[SUMMON_END_TARGET_DEBUG]", {
      name: pokemon?.name,
      id: pokemon?.id,
      isPlayer: pokemon?.isPlayer?.(),
      partyMemberIndex: this.partyMemberIndex,
      phaserFieldIndex: globalScene.field?.getIndex(pokemon),
      getFieldIndex: pokemon?.getFieldIndex?.(),
      getBattlerIndex: pokemon?.getBattlerIndex?.(),

      playerField: globalScene.getPlayerField().map(p => ({
        name: p.name,
        id: p.id,
        phaserIndex: globalScene.field?.getIndex(p),
      })),

      enemyField: globalScene.getEnemyField().map(p => ({
        name: p.name,
        id: p.id,
        phaserIndex: globalScene.field?.getIndex(p),
      })),
    });

    if (pokemon.isShiny(true)) {
      globalScene.phaseManager.unshiftNew("ShinySparklePhase", pokemon.getBattlerIndex());
    }

    pokemon.resetTurnData();

    // ✅ [폼체인지 조건 통과 여부 판단]
    if (
      !this.loaded
      || [BattleType.TRAINER, BattleType.MYSTERY_ENCOUNTER].includes(globalScene.currentBattle.battleType)
      || globalScene.currentBattle.waveIndex % 10 === 1
    ) {
      globalScene.triggerPokemonFormChange(pokemon, SpeciesFormChangeActiveTrigger, true);
    }
    // ✅ [폼체인지 추적 로그 끝]

    this.applyHardTrainerBoost();
    this.queuePostSummon();

    // ✅ 다이맥스 상태 복원 시도 (거다이맥스 폼 + 소원의별 있을 때)
    if (
      globalScene.getModifiers(WishingStarModifier)
      && pokemon.formKey?.includes("gigantamax")
      && !pokemon.isDynamaxed
    ) {
      pokemon.setDynamax(true);
      if (globalScene.inBattle && globalScene.currentPhase) {
        globalScene.unshiftPhase(new DynamaxPhase(pokemon, globalScene));
      }
    }
  }

  getParty(): Pokemon[] {
    if (this.companion) {
      return globalScene.getCompanionParty();
    }

    return super.getParty();
  }

  getPokemon(): Pokemon {
    return this.getParty()[this.partyMemberIndex];
  }

  queuePostSummon(): void {
    globalScene.phaseManager.pushNew("PostSummonPhase", this.getPokemon().getBattlerIndex());
  }

  end() {
    this.onEnd();

    super.end();
  }
}
