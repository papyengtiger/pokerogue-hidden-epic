import { PLAYER_PARTY_MAX_SIZE } from "#app/constants";
import { timedEventManager } from "#app/global-event-manager";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { isBeta, isDev } from "#constants/app-constants";
import { SubstituteTag } from "#data/battler-tags";
import { getEggTierForSpecies } from "#data/egg";
import { Gender } from "#data/gender";
import { kecleonShopManager } from "#data/kecleon-shop/kecleon-shop-manager";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import {
  doPokeballBounceAnim,
  getCriticalCaptureChance,
  getPokeballAtlasKey,
  getPokeballCatchMultiplier,
  getPokeballTintColor,
} from "#data/pokeball";
import { getStatusEffectCatchRateMultiplier } from "#data/status-effect";
import { BattlerIndex } from "#enums/battler-index";
import { ChallengeType } from "#enums/challenge-type";
import { EggTier } from "#enums/egg-type";
import type { PokeballType } from "#enums/pokeball";
import { StatusEffect } from "#enums/status-effect";
import { UiMode } from "#enums/ui-mode";
import { VariantTier } from "#enums/variant-tier";
import { addPokeballCaptureStars, addPokeballOpenParticles } from "#field/anims";
import type { EnemyPokemon } from "#field/pokemon";
import { PokemonHeldItemModifier } from "#modifiers/modifier";
import { PokemonPhase } from "#phases/pokemon-phase";
import { achvs } from "#system/achv";
import { questManager } from "#system/quest-manager";
import type { PartyOption } from "#ui/party-ui-handler";
import { PartyUiMode } from "#ui/party-ui-handler";
import { SummaryUiMode } from "#ui/summary-ui-handler";
import { applyChallenges } from "#utils/challenge-utils";
import { BooleanHolder } from "#utils/common";
import i18next from "i18next";

function mobileDebug(message: string, data?: unknown): void {
  const text =
    `[${new Date().toLocaleTimeString()}] ${message}`
    + (data !== undefined ? `\n${JSON.stringify(data)}` : "");

  console.log(message, data ?? "");

  let box = document.getElementById("mobile-debug-box");

  if (!box) {
    box = document.createElement("div");
    box.id = "mobile-debug-box";

    Object.assign(box.style, {
      position: "fixed",
      left: "4px",
      top: "4px",
      width: "calc(100vw - 8px)",
      maxHeight: "45vh",
      overflow: "auto",
      zIndex: "999999",
      background: "rgba(0, 0, 0, 0.85)",
      color: "white",
      fontSize: "11px",
      fontFamily: "monospace",
      whiteSpace: "pre-wrap",
      padding: "6px",
      pointerEvents: "none",
    });

    document.body.appendChild(box);
  }

  box.textContent += `${text}\n\n`;
  box.scrollTop = box.scrollHeight;

  try {
    localStorage.setItem("hiddenEpicCaptureDebug", box.textContent ?? "");
  } catch {
    // 무시
  }
}
// TODO: Refactor and split up to allow for overriding capture chance
// TODO: Refactor and split up to allow for overriding capture chance
export class AttemptCapturePhase extends PokemonPhase {
  public readonly phaseName = "AttemptCapturePhase";

  private pokeballType: PokeballType;
  private pokeball: Phaser.GameObjects.Sprite;
  private originalY: number;

  private targetPokemonId?: number;

  constructor(targetIndex: number, pokeballType: PokeballType, targetPokemonId?: number) {
    super(BattlerIndex.ENEMY + targetIndex);

    this.pokeballType = pokeballType;
    this.targetPokemonId = targetPokemonId;
  }

  private getCaptureTarget(): EnemyPokemon {
    if (monsterHouseManager.isActive() && this.targetPokemonId !== undefined) {
      const target = globalScene.getEnemyParty().find(p => p.id === this.targetPokemonId);

      if (target) {
        return target as EnemyPokemon;
      }
    }

    return this.getPokemon() as EnemyPokemon;
  }

  start() {
    super.start();

    console.log("[ATTEMPT_CAPTURE_START]", {
      theftActive: kecleonShopManager.isTheftBattleActive(),
    });

    const pokemon = this.getCaptureTarget();

    mobileDebug("1. AttemptCapture start", {
  pokemonId: pokemon?.id,
  name: pokemon?.getName?.() ?? pokemon?.name,
  onField: pokemon?.isOnField?.(),
  active: pokemon?.isActive?.(true),
  hp: pokemon?.hp,
});
    // 미스터리몬스터는 포획 불가
    if (pokemon.isMysteryMonster()) {
      globalScene.ui.showText("미스터리몬스터는 포획할 수 없다!", null, () => this.end(), 1500, true);

      return;
    }

    // 기존 캘리몬 도둑전 포획 금지
    if (kecleonShopManager.isTheftBattleActive()) {
      globalScene.ui.showText(i18next.t("battle:kecleonCaptureBlocked"), null, () => this.end(), 1500, true);

      return;
    }

    const activeCatchQuest = questManager
      .getQuests()
      .find(
        quest =>
          quest.accepted
          && !quest.completed
          && quest.objectiveType === "CATCH_POKEMON"
          && quest.targetSpeciesId !== undefined
          && Number(quest.targetSpeciesId) === Number(pokemon.species.speciesId)
          && quest.targetCatchWave === globalScene.currentBattle.waveIndex,
      );

    const isHeldItemQuestTarget = questManager.isActiveHeldItemQuestPokemon(
      pokemon.id,
      globalScene.currentBattle.waveIndex,
    );

    const isQuestTarget = activeCatchQuest !== undefined || isHeldItemQuestTarget;

    if (activeCatchQuest) {
      console.log("[QUEST_CAPTURE_GUARANTEED]", {
        questId: activeCatchQuest.id,
        speciesId: pokemon.species.speciesId,
        speciesName: pokemon.getName?.(),
        wave: globalScene.currentBattle.waveIndex,
        pokeballType: this.pokeballType,
      });
    }

    if (isHeldItemQuestTarget) {
      console.log("[QUEST_ITEM_CAPTURE_GUARANTEED]", {
        pokemonId: pokemon.id,
        speciesId: pokemon.species.speciesId,
        speciesName: pokemon.getName?.(),
        wave: globalScene.currentBattle.waveIndex,
        pokeballType: this.pokeballType,
      });
    }

    if (!pokemon?.hp) {
      return this.end();
    }

    const substitute = pokemon.getTag(SubstituteTag);
    if (substitute) {
      substitute.sprite.setVisible(false);
    }

    globalScene.pokeballCounts[this.pokeballType]--;

    this.originalY = pokemon.y;

    const _3m = 3 * pokemon.getMaxHp();
    const _2h = 2 * pokemon.hp;
    const catchRate = pokemon.species.catchRate;
    const pokeballMultiplier = getPokeballCatchMultiplier(this.pokeballType, pokemon);
    const statusMultiplier = pokemon.status ? getStatusEffectCatchRateMultiplier(pokemon.status.effect) : 1;
    const shinyMultiplier = pokemon.isShiny() ? timedEventManager.getShinyCatchMultiplier() : 1;
    const modifiedCatchRate = Math.round(
      (((_3m - _2h) * catchRate * pokeballMultiplier) / _3m) * statusMultiplier * shinyMultiplier,
    );
    const shakeProbability = Math.round(65536 / Math.pow(255 / modifiedCatchRate, 0.1875)); // Formula taken from gen 6
    const criticalCaptureChance = getCriticalCaptureChance(modifiedCatchRate);

    if ((isBeta || isDev) && import.meta.env.NODE_ENV !== "test") {
      console.log(
        "Base Catch Rate: %d\nBall Mult: %d\nStatus Mult: %d\nShiny Bonus: %d\nModified Catch Rate: %d\nShake Probability: %d\nCritical Catch Chance: %d",
        catchRate,
        pokeballMultiplier,
        statusMultiplier,
        shinyMultiplier,
        modifiedCatchRate,
        shakeProbability,
        criticalCaptureChance,
      );
    }

    const isCritical = pokemon.randBattleSeedInt(256) < criticalCaptureChance;
    const fpOffset = pokemon.getFieldPositionOffset();

    const pokeballAtlasKey = getPokeballAtlasKey(this.pokeballType);
    this.pokeball = globalScene.addFieldSprite(16, 80, "pb", pokeballAtlasKey);
    this.pokeball.setOrigin(0.5, 0.625);
    globalScene.field.add(this.pokeball);

    globalScene.playSound(isCritical ? "se/crit_throw" : "se/pb_throw");
    globalScene.time.delayedCall(300, () => {
      const fieldList = globalScene.field.list;

      if (fieldList.includes(this.pokeball) && fieldList.includes(pokemon)) {
        globalScene.field.moveBelow(this.pokeball as Phaser.GameObjects.GameObject, pokemon);
      }
    });

    globalScene.tweens.add({
      // Throw animation
      targets: this.pokeball,
      x: { value: 236 + fpOffset[0], ease: "Linear" },
      y: { value: 16 + fpOffset[1], ease: "Cubic.easeOut" },
      duration: 500,
      onComplete: () => {
        mobileDebug("4. Pokemon entered ball");
        // Ball opens
        this.pokeball.setTexture("pb", `${pokeballAtlasKey}_opening`);
        globalScene.time.delayedCall(17, () => this.pokeball.setTexture("pb", `${pokeballAtlasKey}_open`));
        globalScene.playSound("se/pb_rel");
        pokemon.tint(getPokeballTintColor(this.pokeballType));

        addPokeballOpenParticles(this.pokeball.x, this.pokeball.y, this.pokeballType);

        globalScene.tweens.add({
          // Mon enters ball
          targets: pokemon,
          duration: 500,
          ease: "Sine.easeIn",
          scale: 0.25,
          y: 20,
          onComplete: () => {
            // Ball closes
            this.pokeball.setTexture("pb", `${pokeballAtlasKey}_opening`);
            pokemon.setVisible(false);
            globalScene.playSound("se/pb_catch");
            globalScene.time.delayedCall(17, () => this.pokeball.setTexture("pb", `${pokeballAtlasKey}`));

            const doShake = () => {
              // After the overall catch rate check, the game does 3 shake checks before confirming the catch.
              let shakeCount = 0;
              const pbX = this.pokeball.x;
              const shakeCounter = globalScene.tweens.addCounter({
                from: 0,
                to: 1,
                repeat: isCritical ? 2 : 4, // Critical captures only perform 1 shake check
                yoyo: true,
                ease: "Cubic.easeOut",
                duration: 250,
                repeatDelay: 500,
                onUpdate: t => {
                  if (shakeCount && shakeCount < (isCritical ? 2 : 4)) {
                    const value = t.getValue() ?? 0;
                    const directionMultiplier = shakeCount % 2 === 1 ? 1 : -1;
                    this.pokeball.setX(pbX + value * 4 * directionMultiplier);
                    this.pokeball.setAngle(value * 27.5 * directionMultiplier);
                  }
                },
                onRepeat: () => {
                  if (!pokemon.species.isObtainable()) {
                    shakeCounter.stop();
                    this.failCatch(shakeCount);
                  } else if (shakeCount++ < (isCritical ? 1 : 3)) {
                    // 흔들기 판정
                    if (
                      isQuestTarget
                      || pokeballMultiplier === -1
                      || isCritical
                      || modifiedCatchRate >= 255
                      || pokemon.randBattleSeedInt(65536) < shakeProbability
                    ) {
                      globalScene.playSound("se/pb_move");
                    } else {
                      shakeCounter.stop();
                      this.failCatch(shakeCount);
                    }
                  } else if (!isQuestTarget && isCritical && pokemon.randBattleSeedInt(65536) >= shakeProbability) {
                    // 일반 크리티컬 포획의 최종 실패 판정
                    shakeCounter.stop();
                    this.failCatch(shakeCount);
                  } else {
                    // 포획 성공
                    globalScene.playSound("se/pb_lock");
                    addPokeballCaptureStars(this.pokeball);

                    const pbTint = globalScene.add.sprite(this.pokeball.x, this.pokeball.y, "pb", "pb");

                    pbTint.setOrigin(this.pokeball.originX, this.pokeball.originY);

                    pbTint.setTintFill(0);
                    pbTint.setAlpha(0);

                    globalScene.field.add(pbTint);

                    globalScene.tweens.add({
                      targets: pbTint,
                      alpha: 0.375,
                      duration: 200,
                      easing: "Sine.easeOut",
                      onComplete: () => {
                        globalScene.tweens.add({
                          targets: pbTint,
                          alpha: 0,
                          duration: 200,
                          easing: "Sine.easeIn",
                          onComplete: () => pbTint.destroy(),
                        });
                      },
                    });
                  }
                },
                onComplete: () => {
                  this.catch();
                },
              });
            };

            // Ball bounces (handled in pokemon.ts)
            globalScene.time.delayedCall(250, () =>
              doPokeballBounceAnim(this.pokeball, 16, 72, 350, doShake, isCritical),
            );
          },
        });
      },
    });
  }

  failCatch(_shakeCount: number) {
    const pokemon = this.getCaptureTarget();

    mobileDebug("2. Before pokeball animation", {
  x: pokemon.x,
  y: pokemon.y,
  visible: pokemon.visible,
  onField: pokemon.isOnField?.(),
  active: pokemon.isActive?.(true),
});

const fpOffset = pokemon.getFieldPositionOffset();
    globalScene.playSound("se/pb_rel");
    pokemon.setY(this.originalY);
    if (pokemon.status?.effect !== StatusEffect.SLEEP) {
      pokemon.cry(pokemon.getHpRatio() > 0.25 ? undefined : { rate: 0.85 });
    }
    pokemon.tint(getPokeballTintColor(this.pokeballType));
    pokemon.setVisible(true);
    pokemon.untint(250, "Sine.easeOut");

    const substitute = pokemon.getTag(SubstituteTag);
    if (substitute) {
      substitute.sprite.setVisible(true);
    }

    const pokeballAtlasKey = getPokeballAtlasKey(this.pokeballType);
    this.pokeball.setTexture("pb", `${pokeballAtlasKey}_opening`);
    globalScene.time.delayedCall(17, () => this.pokeball.setTexture("pb", `${pokeballAtlasKey}_open`));

    globalScene.tweens.add({
      targets: pokemon,
      duration: 250,
      ease: "Sine.easeOut",
      scale: 1,
    });

    globalScene.currentBattle.lastUsedPokeball = this.pokeballType;
    this.removePb();
    this.end();
  }

  catch() {
    const pokemon = this.getCaptureTarget();

mobileDebug("5. catch() reached", {
    pokemonId: pokemon.id,
    name: pokemon.getName?.() ?? pokemon.name,
  });
// 몬스터소굴 예비 개체가 실제 필드 준비를 마칠 때까지 대기
if (
  monsterHouseManager.isActive()
  && this.targetPokemonId !== undefined
  && (!pokemon.isOnField() || !pokemon.isActive(true))
) {
  console.warn("[MONSTER_HOUSE_CAPTURE_WAIT_FOR_TARGET]", {
    pokemonId: pokemon.id,
    pokemon: pokemon.getName?.() ?? pokemon.name,
    onField: pokemon.isOnField?.(),
    active: pokemon.isActive?.(true),
  });

  globalScene.time.delayedCall(250, () => {
    globalScene.phaseManager.unshiftNew(
      "AttemptCapturePhase",
      0,
      this.pokeballType,
      this.targetPokemonId,
    );
  });

  this.end();
  return;
}

    if (pokemon.isMysteryMonster()) {
      this.removePb();
      this.end();
      return;
    }

    const speciesForm = !pokemon.fusionSpecies ? pokemon.getSpeciesForm() : pokemon.getFusionSpeciesForm();

    if (
      speciesForm.abilityHidden
      && (pokemon.fusionSpecies ? pokemon.fusionAbilityIndex : pokemon.abilityIndex)
        === speciesForm.getAbilityCount() - 1
    ) {
      globalScene.validateAchv(achvs.HIDDEN_ABILITY);
    }

    if (pokemon.species.subLegendary) {
      globalScene.validateAchv(achvs.CATCH_SUB_LEGENDARY);
    }

    if (pokemon.species.legendary) {
      globalScene.validateAchv(achvs.CATCH_LEGENDARY);
    }

    if (pokemon.species.mythical) {
      globalScene.validateAchv(achvs.CATCH_MYTHICAL);
    }

    globalScene.pokemonInfoContainer.show(pokemon, true);

    void globalScene.gameData.setPokemonCaught(pokemon, true, false, false).then(() => {
      globalScene.gameData.updateSpeciesDexIvs(pokemon.species.getRootSpeciesId(true), pokemon.ivs);

      // 소굴에서는 중간 포획 시 VictoryPhase를 거치지 않으므로
      // 도감/스타팅 해금 데이터를 즉시 시스템 데이터에 저장
      if (monsterHouseManager.isActive()) {
        void globalScene.gameData.saveSystem();
      }
    });
    const addStatus = new BooleanHolder(true);
    applyChallenges(ChallengeType.POKEMON_ADD_TO_PARTY, pokemon, addStatus);

    globalScene.ui.showText(
      i18next.t(addStatus.value ? "battle:pokemonCaught" : "battle:pokemonCaughtButChallenge", {
        pokemonName: getPokemonNameWithAffix(pokemon),
      }),
      null,
      () => {
        mobileDebug("6. Capture message callback");
        console.log("[CAPTURE_MESSAGE_CALLBACK]", {
          pokemon: pokemon.getName(),
          monsterHouse: monsterHouseManager.isActive(),
        });

        const end = () => {
          if (monsterHouseManager.isActive()) {
            monsterHouseManager.registerEnemyCaptured();

            if (monsterHouseManager.canReleaseBoss()) {
              monsterHouseManager.releaseBoss();
            }

            const bossReleased = monsterHouseManager.isBossReleased();

            /*
             * SwitchSummonPhase는 enemyParty의 실제 배열 순서를 바꾸므로
             * bossIndex 같은 배열 인덱스로 우두머리를 판정하면 안 된다.
             * MonsterHouseManager가 보관하는 고유 Pokemon ID 판정을 사용한다.
             */
            const hasReservePartyMember = globalScene
              .getEnemyParty()
              .some(
                p =>
                  p !== pokemon
                  && !p.isFainted()
                  && !p.isOnField()
                  && (bossReleased || !monsterHouseManager.isBossPokemon(p)),
              );

            if (hasReservePartyMember) {
              const expValue = pokemon.getExpValue();
              globalScene.applyPartyExp(expValue, true);

              console.log("[MONSTER_HOUSE_CAPTURE_CONTINUE]", {
                pokemon: pokemon.getName(),
                expValue,
                remaining: monsterHouseManager.getRemainingEnemies(),
                bossReleased,
              });
            } else {
              // 우두머리까지 포획했거나 마지막 개체 처리 완료
              globalScene.phaseManager.unshiftNew("VictoryPhase", this.battlerIndex);
            }

            console.log("[MONSTER_HOUSE_CAPTURE_FLOW]", {
              pokemon: pokemon.getName(),
              defeated: monsterHouseManager.getDefeatedEnemies(),
              captured: monsterHouseManager.getCapturedEnemies(),
              remaining: monsterHouseManager.getRemainingEnemies(),
              bossReleased: monsterHouseManager.isBossReleased(),
              hasReservePartyMember,
            });
          } else {
            globalScene.phaseManager.unshiftNew("VictoryPhase", this.battlerIndex);
          }

          globalScene.pokemonInfoContainer.hide();
          this.removePb();
          this.end();
        };
        const removePokemon = () => {
          globalScene.addFaintedEnemyScore(pokemon);
          pokemon.hp = 0;
          pokemon.doSetStatus(StatusEffect.FAINT);
          globalScene.clearEnemyHeldItemModifiers();
          pokemon.leaveField(true, true, true);
        };

        // 의뢰 완료 여부를 포획 처리 전체에서 공유
        let questCompletedThisCapture = false;

        // 포획 의뢰 판정
        const completedCatchQuests = questManager.onPokemonCaught(pokemon.species.speciesId);

        if (completedCatchQuests.length > 0) {
          questCompletedThisCapture = true;
        }

        const addToParty = (slotIndex?: number) => {
          mobileDebug("7. addToParty()", {
  pokemon: pokemon.getName(),
  slotIndex,
});
          console.log("[CAPTURE_ADD_TO_PARTY]", {
            pokemon: pokemon.getName(),
            slotIndex,
            monsterHouse: monsterHouseManager.isActive(),
          });

          const newPokemon = pokemon.addToParty(this.pokeballType, slotIndex);

          const modifiers = globalScene.findModifiers(
            m => m instanceof PokemonHeldItemModifier && m.pokemonId === pokemon.id,
            false,
          ) as PokemonHeldItemModifier[];

          // 포획한 포켓몬의 지닌도구 의뢰 판정
          for (const modifier of modifiers) {
            const itemId = modifier.type?.id;

            if (!itemId) {
              continue;
            }

            console.log("[QUEST_CAPTURE_HELD_ITEM]", {
              pokemon: pokemon.name,
              pokemonId: pokemon.id,
              itemId,
              itemName: modifier.type?.name,
              stackCount: modifier.stackCount,
            });

            const completedItemQuests = questManager.onItemObtained(itemId, modifier.stackCount ?? 1);

            if (completedItemQuests.length > 0) {
              questCompletedThisCapture = true;
            }
          }

          // 아이템 의뢰까지 판정한 뒤 전체 완료 확인
          if (questCompletedThisCapture && questManager.isAcceptedQuestClear()) {
            console.log("[QUEST_ALL_ACCEPTED_CLEAR]");

            globalScene.phaseManager.unshiftNew("QuestClearPromptPhase");
          }

          if (globalScene.getPlayerParty().filter(p => p.isShiny()).length === PLAYER_PARTY_MAX_SIZE) {
            globalScene.validateAchv(achvs.SHINY_PARTY);
          }

          // 실제 지닌도구를 플레이어 쪽으로 이전
          Promise.all(modifiers.map(m => globalScene.addModifier(m, true))).then(() => {
            globalScene.updateModifiers(true);

            removePokemon();

            if (newPokemon) {
  newPokemon.leaveField(true, true, false);

  newPokemon
    .loadAssets()
    .then(() => {
      console.log("[CAPTURE_NEW_POKEMON_ASSETS_LOADED]", {
        pokemon: pokemon.getName(),
        pokemonId: pokemon.id,
      });

      end();
    })
    .catch(error => {
      console.error("[CAPTURE_NEW_POKEMON_ASSET_LOAD_FAILED]", {
        pokemon: pokemon.getName(),
        pokemonId: pokemon.id,
        error,
      });

      /*
       * 에셋 로딩 실패 때문에 포획 Phase 자체가
       * 영원히 끝나지 않는 것을 방지한다.
       *
       * 에셋은 이후 파티 UI 등에서 다시 로딩될 수 있으므로
       * 전투 진행을 막지는 않는다.
       */
      end();
    });
} else {
  end();
}
          });
        };

        const eggTier = getEggTierForSpecies(pokemon.species);
        const variantTier = pokemon.variant as VariantTier;

        let gainedRp = 0;
        gainedRp += this.getEggTierRoguePoints(eggTier);
        gainedRp += this.getVariantRoguePoints(variantTier, pokemon.isShiny());

        if (gainedRp > 0) {
          globalScene.gameData.addRoguePoints(gainedRp);
          globalScene.updateroguePointText();
        }

        if (!addStatus.value) {
          removePokemon();
          end();
          return;
        }
        if (globalScene.getPlayerParty().length === PLAYER_PARTY_MAX_SIZE) {
          const promptRelease = () => {
            globalScene.ui.showText(
              i18next.t("battle:partyFull", {
                pokemonName: pokemon.getNameToRender(),
              }),
              null,
              () => {
                globalScene.pokemonInfoContainer.makeRoomForConfirmUi(1, true);
                globalScene.ui.setMode(
                  UiMode.CONFIRM,
                  () => {
                    const newPokemon = globalScene.addPlayerPokemon(
                      pokemon.species,
                      pokemon.level,
                      pokemon.abilityIndex,
                      pokemon.formIndex,
                      pokemon.gender,
                      pokemon.shiny,
                      pokemon.variant,
                      pokemon.ivs,
                      pokemon.nature,
                      pokemon,
                    );
                    globalScene.ui.setMode(
                      UiMode.SUMMARY,
                      newPokemon,
                      0,
                      SummaryUiMode.DEFAULT,
                      () => {
                        globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
                          promptRelease();
                        });
                      },
                      false,
                    );
                  },
                  () => {
                    const attributes = {
                      shiny: pokemon.shiny,
                      variant: pokemon.variant,
                      form: pokemon.formIndex,
                      female: pokemon.gender === Gender.FEMALE,
                    };
                    globalScene.ui.setOverlayMode(UiMode.POKEDEX_PAGE, pokemon.species, attributes, null, null, () => {
                      globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
                        promptRelease();
                      });
                    });
                  },
                  () => {
                    globalScene.ui.setMode(
                      UiMode.PARTY,
                      PartyUiMode.RELEASE,
                      this.fieldIndex,
                      (slotIndex: number, _option: PartyOption) => {
                        globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
                          if (slotIndex < 6) {
                            addToParty(slotIndex);
                          } else {
                            promptRelease();
                          }
                        });
                      },
                    );
                  },
                  () => {
                    globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
                      removePokemon();
                      end();
                    });
                  },
                  "fullParty",
                );
              },
            );
          };
          promptRelease();
        } else {
          addToParty();
        }
      },
      0,
      true,
    );
  }

  private getEggTierRoguePoints(tier?: EggTier): number {
    switch (tier) {
      case EggTier.COMMON:
        return 10;
      case EggTier.RARE:
        return 25;
      case EggTier.EPIC:
        return 50;
      case EggTier.LEGENDARY:
        return 100;
      default:
        return 0;
    }
  }

  private showQuestClearPrompt(): void {
    globalScene.ui.showText("모든 의뢰를 해결했다!\n복귀하시겠습니까?", null, () => {
      globalScene.ui.setMode(
        UiMode.CONFIRM,

        // YES
        () => {
          globalScene.phaseManager.clearPhaseQueue();

          globalScene.phaseManager.pushNew("QuestClearRewardPhase");

          return true;
        },

        // NO
        () => {
          globalScene.ui.setMode(UiMode.MESSAGE);
          globalScene.ui.showText("계속 여행하기로 했다.", null, () => {
            // 기존 포획 후 진행 계속
          });

          return true;
        },
      );
    });
  }

  private getVariantRoguePoints(tier?: VariantTier, isShiny?: boolean): number {
    // 일반 이로치
    if (isShiny && tier === VariantTier.STANDARD) {
      return 10;
    }

    switch (tier) {
      case VariantTier.RARE:
        return 50;

      case VariantTier.EPIC:
        return 100;

      default:
        return 5;
    }
  }

  removePb() {
    globalScene.tweens.add({
      targets: this.pokeball,
      duration: 250,
      delay: 250,
      ease: "Sine.easeIn",
      alpha: 0,
      onComplete: () => this.pokeball.destroy(),
    });
  }
}
