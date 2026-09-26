import { globalScene } from "#app/global-scene";
import type { BiomeId } from "#enums/biome-id";
import { getBiomeKey } from "#field/arena";
import { BattlePhase } from "#phases/battle-phase";
import { questManager } from "#system/quest-manager";

export class SwitchBiomePhase extends BattlePhase {
  public readonly phaseName = "SwitchBiomePhase";
  private nextBiome: BiomeId;

  constructor(nextBiome: BiomeId) {
    super();

    this.nextBiome = nextBiome;
  }

  start() {
    super.start();

    if (this.nextBiome === undefined) {
      return this.end();
    }

    // Before switching biomes, make sure to set the last encounter for other phases that need it too.
    globalScene.lastEnemyTrainer = globalScene.currentBattle?.trainer ?? null;
    globalScene.lastMysteryEncounter = globalScene.currentBattle?.mysteryEncounter;

    globalScene.tweens.add({
      targets: [globalScene.arenaEnemy, globalScene.lastEnemyTrainer],
      x: "+=300",
      duration: 2000,
      onComplete: () => {
        globalScene.arenaEnemy.setX(globalScene.arenaEnemy.x - 600);

        globalScene.newArena(this.nextBiome);

        const biomeKey = getBiomeKey(this.nextBiome);
        const bgTexture = `${biomeKey}_bg`;
        globalScene.arenaBgTransition.setTexture(bgTexture);
        globalScene.arenaBgTransition.setAlpha(0);
        globalScene.arenaBgTransition.setVisible(true);
        globalScene.arenaPlayerTransition.setBiome(this.nextBiome);
        globalScene.arenaPlayerTransition.setAlpha(0);
        globalScene.arenaPlayerTransition.setVisible(true);

        globalScene.tweens.add({
          targets: [globalScene.arenaPlayer, globalScene.arenaBgTransition, globalScene.arenaPlayerTransition],
          duration: 1000,
          delay: 1000,
          ease: "Sine.easeInOut",
          alpha: (target: any) => (target === globalScene.arenaPlayer ? 0 : 1),
          onComplete: () => {
            globalScene.arenaBg.setTexture(bgTexture);
            globalScene.arenaPlayer.setBiome(this.nextBiome);
            globalScene.arenaPlayer.setAlpha(1);
            globalScene.arenaEnemy.setBiome(this.nextBiome);
            globalScene.arenaEnemy.setAlpha(1);
            globalScene.arenaNextEnemy.setBiome(this.nextBiome);
            globalScene.arenaBgTransition.setVisible(false);
            globalScene.arenaPlayerTransition.setVisible(false);

            if (globalScene.lastEnemyTrainer) {
              globalScene.lastEnemyTrainer.destroy();
            }

            // ★ REACH_BIOME
            const completedBiomeQuests = questManager.onBiomeEntered(this.nextBiome);

            if (completedBiomeQuests.length > 0) {
              const completedQuest = completedBiomeQuests[0];

              console.log("[QUEST_BIOME_EXPLORE_COMPLETED]", {
                questId: completedQuest.id,
                title: completedQuest.title,
                targetBiome: completedQuest.targetBiome,
              });

              globalScene.ui.showText(
                "의뢰 지역에 도착했다!\n주변 지역의 탐사를 완료했다.",
                null,
                () => {
                  if (questManager.isAcceptedQuestClear()) {
                    console.log("[QUEST_ALL_ACCEPTED_CLEAR_BIOME]");

                    globalScene.phaseManager.unshiftNew("QuestClearPromptPhase");
                  }

                  this.end();
                },
                1500,
                true,
              );

              return;
            }

            this.end();
          },
        });
      },
    });
  }
}
