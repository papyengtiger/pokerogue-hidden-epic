import { pokerogueApi } from "#api/pokerogue-api";
import { clientSessionId } from "#app/account";
import { getGameMode } from "#app/game-mode";
import { globalScene } from "#app/global-scene";
import { pokemonEvolutions } from "#balance/pokemon-evolutions";
import { bypassLogin } from "#constants/app-constants";
import { modifierTypes } from "#data/data-lists";
import { getCharVariantFromDialogue } from "#data/dialogue";
import type { PokemonSpecies } from "#data/pokemon-species";
import { BattleType } from "#enums/battle-type";
import { GameDifficulty } from "#enums/game-difficulty";
import { GameModes } from "#enums/game-modes";
import { PlayerGender } from "#enums/player-gender";
import { TrainerType } from "#enums/trainer-type";
import { UiMode } from "#enums/ui-mode";
import { Unlockables } from "#enums/unlockables";
import type { Pokemon } from "#field/pokemon";
import { BattlePhase } from "#phases/battle-phase";
import type { EndCardPhase } from "#phases/end-card-phase";
import { achvs, ChallengeAchv } from "#system/achv";
import { ArenaData } from "#system/arena-data";
import { ChallengeData } from "#system/challenge-data";
import { ModifierData as PersistentModifierData } from "#system/modifier-data";
import { PokemonData } from "#system/pokemon-data";
import { RibbonData, type RibbonFlag } from "#system/ribbons/ribbon-data";
import { awardRibbonsToSpeciesLine } from "#system/ribbons/ribbon-methods";
import { TrainerData } from "#system/trainer-data";
import { trainerConfigs } from "#trainers/trainer-config";
import type { SessionSaveData } from "#types/save-data";
import { checkSpeciesValidForChallenge, isNuzlockeChallenge } from "#utils/challenge-utils";
import { isLocalServerConnected } from "#utils/common";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import i18next from "i18next";

export class GameOverPhase extends BattlePhase {
  public readonly phaseName = "GameOverPhase";
  private isVictory: boolean;

  private clearType: "NORMAL" | "QUEST";

  private firstRibbons: PokemonSpecies[] = [];

  constructor(isVictory = false, clearType: "NORMAL" | "QUEST" = "NORMAL") {
    super();

    this.isVictory = isVictory;
    this.clearType = clearType;
  }

  start() {
    super.start();

    globalScene.phaseManager.hideAbilityBar();

    // Failsafe if players somehow skip floor 200 in classic mode
    if (globalScene.gameMode.isClassic && globalScene.currentBattle.waveIndex > 200) {
      this.isVictory = true;
    }

    // Handle Mystery Encounter special Game Over cases
    // Situations such as when player lost a battle, but it isn't treated as full Game Over
    if (
      !this.isVictory
      && globalScene.currentBattle.mysteryEncounter?.onGameOver
      && !globalScene.currentBattle.mysteryEncounter.onGameOver()
    ) {
      // Do not end the game
      return this.end();
    }
    // Otherwise, continue standard Game Over logic

    if (this.isVictory && globalScene.gameMode.isEndless) {
      const genderIndex = globalScene.gameData.gender ?? PlayerGender.UNSET;
      const genderStr = PlayerGender[genderIndex].toLowerCase();
      globalScene.ui.showDialogue(
        i18next.t("miscDialogue:endingEndless", { context: genderStr }),
        i18next.t("miscDialogue:endingName"),
        0,
        () => this.handleGameOver(),
      );
    } else if (this.isVictory || !globalScene.enableRetries) {
      this.handleGameOver();
    } else {
      const isPracticeBattle = (globalScene.currentBattle as any)?.isPracticeBattle === true;

      const retryMessage = isPracticeBattle
        ? "연습모드에서 모든 포켓몬이 기절했습니다.\n다시 처음부터 도전하시겠습니까?"
        : i18next.t("battle:retryBattle");

      globalScene.ui.showText(retryMessage, null, () => {
        globalScene.ui.setMode(
          UiMode.CONFIRM,
          () => {
            globalScene.ui.fadeOut(1250).then(() => {
              const wasPracticeBattle =
                (globalScene.currentBattle as any)?.isPracticeBattle === true
                || globalScene.gameMode?.modeId === GameModes.PRACTICE;

              console.log("[RETRY_PRACTICE_CHECK]", { wasPracticeBattle });

              if (wasPracticeBattle) {
                console.log("[PRACTICE_RETRY_START]");

                (globalScene as any).practiceTurnResult = null;
                (globalScene as any).practiceLastResult = null;

                globalScene.phaseManager.clearAllPhases();
                globalScene.ui.clearText();

                globalScene.gameMode = getGameMode(GameModes.PRACTICE);

                const battle = globalScene.newBattle(1, BattleType.WILD, undefined, false) as any;

                battle.turnCommands = [];
                battle.preTurnCommands = [];
                battle.commandPhase = null;
                battle.cancelledMove = false;
                battle.started = false;
                battle.enemySwitchCounter = 0;

                battle.isPracticeBattle = true;
                battle.waveIndex = 1;

                console.log("[PRACTICE_RETRY_RESET]", {
                  turnCommands: battle.turnCommands,
                  preTurnCommands: battle.preTurnCommands,
                  started: battle.started,
                  waveIndex: battle.waveIndex,
                });

                globalScene.phaseManager.unshiftNew("PracticeEncounterPhase");

                globalScene.ui.fadeIn(250).then(() => {
                  console.log("[PRACTICE_RETRY_READY]");
                  this.end();
                });

                return;
              }

              globalScene.reset();
              globalScene.phaseManager.clearPhaseQueue();

              globalScene.gameData.loadSession(globalScene.sessionSlotId).then(() => {
                globalScene.phaseManager.pushNew("EncounterPhase", true);

                const availablePartyMembers = globalScene.getPokemonAllowedInBattle().length;

                globalScene.phaseManager.pushNew("SummonPhase", 0);

                if (globalScene.currentBattle.double && availablePartyMembers > 1) {
                  globalScene.phaseManager.pushNew("SummonPhase", 1);
                }

                globalScene.ui.fadeIn(1250);
                this.end();
              });
            });
          },
          () => this.handleGameOver(),
          false,
          0,
          0,
          1000,
        );
      });
    }
  }

  /**
   * Submethod of {@linkcode handleGameOver} that awards ribbons to Pokémon in the player's party based on the current
   * game mode and challenges.
   */
  private awardRibbons(): void {
    let ribbonFlags = 0n;
    for (const challenge of globalScene.gameMode.challenges) {
      const ribbon = challenge.ribbonAwarded;
      if (challenge.value && ribbon) {
        ribbonFlags |= ribbon;
      }
    }
    // Block other ribbons if flip stats or inverse is active
    const flip_or_inverse = ribbonFlags & (RibbonData.FLIP_STATS | RibbonData.INVERSE);
    if (flip_or_inverse) {
      ribbonFlags = flip_or_inverse;
    } else {
      if (globalScene.gameMode.isClassic) {
        ribbonFlags |= RibbonData.CLASSIC;
      }
      if (isNuzlockeChallenge()) {
        ribbonFlags |= RibbonData.NUZLOCKE;
      }
    }
    // Award ribbons to all Pokémon in the player's party that are considered valid
    // for the current game mode and challenges.
    for (const pokemon of globalScene.getPlayerParty()) {
      const species = pokemon.species;
      if (
        checkSpeciesValidForChallenge(
          species,
          globalScene.gameData.getSpeciesDexAttrProps(species, pokemon.getDexAttr()),
          false,
        )
      ) {
        awardRibbonsToSpeciesLine(species.speciesId, ribbonFlags as RibbonFlag);
      }
    }
  }

  handleGameOver(): void {
    const isQuestClear = this.clearType === "QUEST";

    const doGameOver = (newClear: boolean) => {
      globalScene.disableMenu = true;
      globalScene.time.delayedCall(1000, () => {
        let firstClear = false;
        if (this.isVictory) {
          if (!isQuestClear && globalScene.gameMode.modeId !== GameModes.PRACTICE) {
            const baseRp = globalScene.gameMode.isClassic
              ? 10000
              : globalScene.gameMode.isDaily
                ? 7000
                : globalScene.gameMode.isEndless
                  ? 15000
                  : globalScene.gameMode.isChallenge
                    ? 12000
                    : 0;

            const difficulty = globalScene.gameMode.difficulty;

            const rpMultiplier =
              difficulty === GameDifficulty.EASY ? 0.5 : difficulty === GameDifficulty.HARD ? 1.5 : 1;

            const bonusRp = Math.floor(baseRp * rpMultiplier);

            globalScene.gameData.addRoguePoints(bonusRp);

            console.log("[DIFFICULTY_CLEAR_RP]", {
              mode: globalScene.gameMode.modeId,
              difficulty,
              baseRp,
              multiplier: rpMultiplier,
              bonusRp,
            });
          }

          if (!isQuestClear && globalScene.gameMode.isClassic) {
            firstClear = globalScene.validateAchv(achvs.CLASSIC_VICTORY);
            globalScene.validateAchv(achvs.UNEVOLVED_CLASSIC_VICTORY);
            globalScene.gameData.gameStats.sessionsWon++;
            for (const pokemon of globalScene.getPlayerParty()) {
              this.awardFirstClassicCompletion(pokemon);
              if (pokemon.species.getRootSpeciesId() !== pokemon.species.getRootSpeciesId(true)) {
                this.awardFirstClassicCompletion(pokemon, true);
              }
            }
            this.awardRibbons();
          } else if (!isQuestClear && globalScene.gameMode.isDaily && newClear) {
            globalScene.gameData.gameStats.dailyRunSessionsWon++;
            globalScene.validateAchv(achvs.DAILY_VICTORY);
          }
        }

        const fadeDuration = this.isVictory ? 10000 : 5000;
        globalScene.fadeOutBgm(fadeDuration, true);
        const activeBattlers = globalScene.getField().filter(p => p?.isActive(true));
        activeBattlers.map(p => p.hideInfo());
        globalScene.ui.fadeOut(fadeDuration).then(() => {
          activeBattlers.map(a => a.setVisible(false));

          globalScene.pbTray?.setVisible(false);
          globalScene.pbTrayEnemy?.setVisible(false);

          globalScene.setFieldScale(1, true);
          globalScene.phaseManager.clearPhaseQueue();
          globalScene.ui.clearText();

          if (this.isVictory && !isQuestClear && globalScene.gameMode.isChallenge) {
            globalScene.gameMode.challenges.forEach(c => globalScene.validateAchvs(ChallengeAchv, c));
          }

          const clear = async (endCardPhase?: EndCardPhase) => {
            if (this.isVictory) {
              const isTutorial = globalScene.gameMode.modeId === GameModes.TUTORIAL;

              // 해금 처리를 먼저 실행
              if (!isQuestClear && (newClear || isTutorial)) {
                this.handleUnlocks();
              }

              // 아이템 회수 및 시스템 저장
              if (globalScene.gameMode.modeId !== GameModes.PRACTICE) {
                globalScene.gameData.depositRemainingRunItemsToStorage(
                  this.isVictory && !isQuestClear && globalScene.gameMode.difficulty === GameDifficulty.HARD,
                );

                try {
                  const saved = await globalScene.gameData.saveSystem();

                  if (!saved) {
                    console.error("[GAME_OVER] 시스템 저장 실패");
                  } else {
                    console.log("[GAME_OVER] 시스템 저장 완료");
                  }
                } catch (error) {
                  console.error("[GAME_OVER] 시스템 저장 오류", error);
                }
              }

              const difficulty = globalScene.gameMode.isEndless
                ? GameDifficulty.NORMAL
                : globalScene.gameMode.difficulty;

              const clearVoucher =
                difficulty === GameDifficulty.EASY
                  ? modifierTypes.VOUCHER_PLUS
                  : difficulty === GameDifficulty.HARD
                    ? modifierTypes.VOUCHER_GOLDEN
                    : modifierTypes.VOUCHER_PREMIUM;

              // 기존 클리어 보상 유지
              if (newClear && !isQuestClear) {
                for (const species of this.firstRibbons) {
                  globalScene.phaseManager.unshiftNew("RibbonModifierRewardPhase", clearVoucher, species);
                }

                if (!firstClear) {
                  globalScene.phaseManager.unshiftNew("GameOverModifierRewardPhase", modifierTypes.VOUCHER_PREMIUM);
                }
              }
            }

            this.getRunHistoryEntry().then(runHistoryEntry => {
              globalScene.gameData.saveRunHistory(runHistoryEntry, this.isVictory && !isQuestClear);

              globalScene.phaseManager.pushNew("PostGameOverPhase", globalScene.sessionSlotId, endCardPhase);

              this.end();
            });
          };

          if (this.isVictory && !isQuestClear && globalScene.gameMode.isClassic) {
            const dialogueKey = "miscDialogue:ending";

            if (!globalScene.ui.shouldSkipDialogue(dialogueKey)) {
              globalScene.ui.fadeIn(500).then(() => {
                const genderIndex = globalScene.gameData.gender ?? PlayerGender.UNSET;
                const genderStr = PlayerGender[genderIndex].toLowerCase();
                // Dialogue has to be retrieved so that the rival's expressions can be loaded and shown via getCharVariantFromDialogue
                const dialogue = i18next.t(dialogueKey, { context: genderStr });
                globalScene.charSprite
                  .showCharacter(
                    `rival_${globalScene.gameData.gender === PlayerGender.FEMALE ? "m" : "f"}`,
                    getCharVariantFromDialogue(dialogue),
                  )
                  .then(() => {
                    globalScene.ui.showDialogue(
                      dialogueKey,
                      globalScene.gameData.gender === PlayerGender.FEMALE
                        ? trainerConfigs[TrainerType.RIVAL].name
                        : trainerConfigs[TrainerType.RIVAL].nameFemale,
                      null,
                      () => {
                        globalScene.ui.fadeOut(500).then(() => {
                          globalScene.charSprite.hide().then(() => {
                            const endCardPhase = globalScene.phaseManager.create("EndCardPhase");
                            globalScene.phaseManager.unshiftPhase(endCardPhase);
                            clear(endCardPhase);
                          });
                        });
                      },
                    );
                  });
              });
            } else {
              const endCardPhase = globalScene.phaseManager.create("EndCardPhase");
              globalScene.phaseManager.unshiftPhase(endCardPhase);
              clear(endCardPhase);
            }
          } else {
            clear();
          }
        });
      });
    };

    // If Online, execute apiFetch as intended
    // If Offline, execute offlineNewClear() only for victory, a localStorage implementation of newClear daily run checks
    if (isQuestClear) {
      doGameOver(false);
      return;
    }

    if (!bypassLogin || isLocalServerConnected) {
      pokerogueApi.savedata.session
        .newclear({
          slot: globalScene.sessionSlotId,
          isVictory: this.isVictory,
          clientSessionId,
        })
        .then(success => doGameOver(!globalScene.gameMode.isDaily || !!success))
        .catch(_err => {
          globalScene.phaseManager.clearPhaseQueue();
          globalScene.phaseManager.unshiftNew("MessagePhase", i18next.t("menu:serverCommunicationFailed"), 2500);
          // force the game to reload after 2 seconds.
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          this.end();
        });
    } else if (this.isVictory) {
      globalScene.gameData.offlineNewClear().then(result => {
        doGameOver(result);
      });
    } else {
      doGameOver(false);
    }
  }

  handleUnlocks(): void {
    // 튜토리얼 모드 클리어 보상

    // 튜토리얼 모드 클리어 보상
    if (this.isVictory && globalScene.gameMode.modeId === GameModes.TUTORIAL) {
      const tutorialUnlocks = [
        Unlockables.CLASSIC_MODE,
        Unlockables.DAILY_MODE,
        Unlockables.WEEKLY_MODE,
        Unlockables.MONTHLY_MODE,
      ];

      for (const unlockable of tutorialUnlocks) {
        if (!globalScene.gameData.isUnlocked(unlockable)) {
          // 해금 연출 예약
          globalScene.phaseManager.unshiftNew("UnlockPhase", unlockable);

          // 저장 전에 해금 상태 변경
          globalScene.gameData.unlocks[unlockable] = true;
        }
      }

      console.log("[TUTORIAL_CLEAR] 4개 모드 해금 처리");

      return;
    }

    if (this.isVictory && globalScene.gameMode.isClassic) {
      if (!globalScene.gameData.unlocks[Unlockables.ENDLESS_MODE]) {
        globalScene.phaseManager.unshiftNew("UnlockPhase", Unlockables.ENDLESS_MODE);
      }
      if (
        globalScene.gameMode.modeId === GameModes.CLASSIC
        && !globalScene.gameData.isUnlocked(Unlockables.ANOTHER_MODE)
      ) {
        // 어나더 모드 해금 연출
        globalScene.phaseManager.unshiftNew("UnlockPhase", Unlockables.ANOTHER_MODE);

        // 시스템 저장 전에 해금 상태 반영
        globalScene.gameData.unlocks[Unlockables.ANOTHER_MODE] = true;

        console.log("[ANOTHER_MODE_UNLOCKED]");
      }
      if (
        globalScene.getPlayerParty().filter(p => p.fusionSpecies).length > 0
        && !globalScene.gameData.unlocks[Unlockables.SPLICED_ENDLESS_MODE]
      ) {
        globalScene.phaseManager.unshiftNew("UnlockPhase", Unlockables.SPLICED_ENDLESS_MODE);
      }
      if (!globalScene.gameData.unlocks[Unlockables.MINI_BLACK_HOLE]) {
        globalScene.phaseManager.unshiftNew("UnlockPhase", Unlockables.MINI_BLACK_HOLE);
      }
      if (
        !globalScene.gameData.unlocks[Unlockables.EVIOLITE]
        && globalScene.getPlayerParty().some(p => p.getSpeciesForm(true).speciesId in pokemonEvolutions)
      ) {
        globalScene.phaseManager.unshiftNew("UnlockPhase", Unlockables.EVIOLITE);
      }
    }
  }

  awardFirstClassicCompletion(pokemon: Pokemon, forStarter = false): void {
    const species = pokemon.species;

    // 기존 클래식 클리어 횟수 및 리본 기록 유지
    globalScene.gameData.incrementRibbonCount(getPokemonSpecies(species.speciesId), forStarter);

    const rootSpeciesId = species.getRootSpeciesId(forStarter);

    // 모드·난이도별 최초 클리어 보상 검사
    const isFirstReward = globalScene.gameData.registerFirstClearVoucher(
      globalScene.gameMode.modeId,
      globalScene.gameMode.difficulty,
      rootSpeciesId,
    );

    if (isFirstReward) {
      this.firstRibbons.push(getPokemonSpecies(rootSpeciesId));
    }

    console.log("[DIFFICULTY_CLEAR_VOUCHER]", {
      pokemon: species.name,
      rootSpeciesId,
      mode: globalScene.gameMode.modeId,
      difficulty: globalScene.gameMode.difficulty,
      firstReward: isFirstReward,
    });
  }

  // TODO: Make function use existing getSessionSaveData() function and then modify the values from there.
  /**
   * Slightly modified version of {@linkcode GameData.getSessionSaveData}.
   * @returns A promise containing the {@linkcode SessionSaveData}
   */
  private async getRunHistoryEntry(): Promise<SessionSaveData> {
    const preWaveSessionData = await globalScene.gameData.getSession(globalScene.sessionSlotId);
    return {
      seed: globalScene.seed,
      playTime: globalScene.sessionPlayTime,
      gameMode: globalScene.gameMode.modeId,
      party: globalScene.getPlayerParty().map(p => new PokemonData(p)),
      enemyParty: globalScene.getEnemyParty().map(p => new PokemonData(p)),
      modifiers: preWaveSessionData
        ? preWaveSessionData.modifiers
        : globalScene.findModifiers(() => true).map(m => new PersistentModifierData(m, true)),
      enemyModifiers: preWaveSessionData
        ? preWaveSessionData.enemyModifiers
        : globalScene.findModifiers(() => true, false).map(m => new PersistentModifierData(m, false)),
      arena: new ArenaData(globalScene.arena),
      pokeballCounts: globalScene.pokeballCounts,
      money: Math.floor(globalScene.money),
      score: globalScene.score,
      waveIndex: globalScene.currentBattle.waveIndex,
      battleType: globalScene.currentBattle.battleType,
      trainer: globalScene.currentBattle.trainer ? new TrainerData(globalScene.currentBattle.trainer) : null,
      gameVersion: globalScene.game.config.gameVersion,
      timestamp: Date.now(),
      challenges: globalScene.gameMode.challenges.map(c => new ChallengeData(c)),
      mysteryEncounterType: globalScene.currentBattle.mysteryEncounter?.encounterType ?? -1,
      mysteryEncounterSaveData: globalScene.mysteryEncounterSaveData,
      playerFaints: globalScene.arena.playerFaints,
    } as SessionSaveData;
  }
}
