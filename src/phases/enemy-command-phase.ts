import { globalScene } from "#app/global-scene";
import { AbilityId } from "#enums/ability-id";
import { BattlerIndex } from "#enums/battler-index";
import { BattlerTagType } from "#enums/battler-tag-type";
import { Command } from "#enums/command";
import { FieldPhase } from "#phases/field-phase";

/**
 * Phase for determining an enemy AI's action for the next turn.
 * During this phase, the enemy decides whether to switch (if it has a trainer)
 * or to use a move from its moveset.
 *
 * For more information on how the Enemy AI works, see docs/enemy-ai.md
 * @see {@linkcode Pokemon.getMatchupScore}
 * @see {@linkcode EnemyPokemon.getNextMove}
 */
export class EnemyCommandPhase extends FieldPhase {
  public readonly phaseName = "EnemyCommandPhase";
  protected fieldIndex: number;
  protected skipTurn = false;

  constructor(fieldIndex: number) {
    super();

    this.fieldIndex = fieldIndex;
    if (globalScene.currentBattle.mysteryEncounter?.skipEnemyBattleTurns) {
      this.skipTurn = true;
    }
  }

  start() {
    super.start();

    const battle = globalScene.currentBattle as any;

    console.log("[PRACTICE_RETRY_RESET]", {
      turnCommands: battle.turnCommands,
      preTurnCommands: battle.preTurnCommands,
      started: battle.started,
      waveIndex: battle.waveIndex,
    });

    console.log("[PRACTICE_TARGET_CHECK]", {
      playerField: globalScene.getPlayerField?.().map(p => ({
        name: p?.getName?.(),
        hp: p?.hp,
        active: p?.isActive?.(),
        fainted: p?.isFainted?.(),
        battler: p?.getBattlerIndex?.(),
      })),
      activeField: globalScene.getPlayerField?.(true).map(p => ({
        name: p?.getName?.(),
        battler: p?.getBattlerIndex?.(),
      })),
    });

    if (battle.isPracticeBattle && battle.skipEnemyBattleTurns) {
      console.log("[PRACTICE] enemy turn skipped", {
        fieldIndex: this.fieldIndex,
      });

      this.end();
      return;
    }

    if (battle.isPracticeBattle) {
      console.log("[PRACTICE] enemy can act", {
        fieldIndex: this.fieldIndex,
        enemy: globalScene.getEnemyField()?.[this.fieldIndex]?.getName?.(),
      });

      console.log("[PRACTICE_TARGET_CHECK]", {
        playerField: globalScene.getPlayerField?.().map((p: any) => ({
          name: p?.getName?.(),
          hp: p?.hp,
          active: p?.isActive?.(),
          fainted: p?.isFainted?.(),
          battler: p?.getBattlerIndex?.(),
        })),

        activeField: globalScene.getPlayerField?.(true).map((p: any) => ({
          name: p?.getName?.(),
          battler: p?.getBattlerIndex?.(),
        })),
      });

      console.log("[PRACTICE_TARGET_CHECK]", {
        playerParty: globalScene.getPlayerParty().map((p: any, i) => ({
          i,
          name: p.getName?.(),
          hp: p.hp,
          maxHp: p.getMaxHp?.(),
          isFainted: p.isFainted?.(),
          isActive: p.isActive?.(),
          isOnField: p.isOnField?.(),
          isAllowedInBattle: p.isAllowedInBattle?.(),
          fieldIndex: p.getFieldIndex?.(),
          battlerIndex: p.getBattlerIndex?.(),
          visible: p.visible,
        })),

        playerField: globalScene.getPlayerField?.().map((p: any) => p?.getName?.()),

        playerActiveField: globalScene.getPlayerField?.(true).map((p: any) => p?.getName?.()),
      });
    }

    const enemyPokemon = globalScene.getEnemyField()[this.fieldIndex];

    const trainer = battle.trainer;

    if (
      battle.double
      && enemyPokemon.hasAbility(AbilityId.COMMANDER)
      && enemyPokemon.getAlly()?.getTag(BattlerTagType.COMMANDED)
    ) {
      this.skipTurn = true;
    }

    /**
     * If the enemy has a trainer, decide whether or not the enemy should switch
     * to another member in its party.
     *
     * This block compares the active enemy Pokemon's {@linkcode Pokemon.getMatchupScore | matchup score}
     * against the active player Pokemon with the enemy party's other non-fainted Pokemon. If a party
     * member's matchup score is 3x the active enemy's score (or 2x for "boss" trainers),
     * the enemy will switch to that Pokemon.
     */
    if (trainer && enemyPokemon.getMoveQueue().length === 0) {
      const opponents = enemyPokemon.getOpponents();

      if (!enemyPokemon.isTrapped()) {
        const partyMemberScores = trainer.getPartyMemberMatchupScores(enemyPokemon.trainerSlot, true);

        if (partyMemberScores.length > 0) {
          const matchupScores = opponents.map(opp => enemyPokemon.getMatchupScore(opp));
          const matchupScore = matchupScores.reduce((total, score) => (total += score), 0) / matchupScores.length;

          const sortedPartyMemberScores = trainer.getSortedPartyMemberMatchupScores(partyMemberScores);

          const switchMultiplier = 1 - (battle.enemySwitchCounter ? Math.pow(0.1, 1 / battle.enemySwitchCounter) : 0);

          if (sortedPartyMemberScores[0][1] * switchMultiplier >= matchupScore * (trainer.config.isBoss ? 2 : 3)) {
            const index = trainer.getNextSummonIndex(enemyPokemon.trainerSlot, partyMemberScores);

            battle.turnCommands[this.fieldIndex + BattlerIndex.ENEMY] = {
              command: Command.POKEMON,
              cursor: index,
              args: [false],
              skip: this.skipTurn,
            };

            battle.enemySwitchCounter++;

            return this.end();
          }
        }
      }
    }

    /** Select a move to use (and a target to use it against, if applicable) */
    if (battle.isPracticeBattle) {
      console.log("[PRACTICE] dummy selecting move", {
        species: enemyPokemon?.species?.name,
        moves: enemyPokemon?.moveset?.map(m => m?.getName?.()),
      });
    }

    /** Select a move to use (and a target to use it against, if applicable) */
    if (battle.isPracticeBattle) {
      console.log("[PRACTICE] dummy selecting move", {
        species: enemyPokemon?.species?.name,
        moves: enemyPokemon?.moveset?.map(m => m?.getName?.()),
      });

      const nextMove = enemyPokemon.getNextMove();

      console.log("[PRACTICE_AI_MOVE]", {
        enemy: enemyPokemon.getName?.(),
        nextMove,
      });

      globalScene.currentBattle.turnCommands[enemyPokemon.getBattlerIndex()] = {
        command: Command.FIGHT,
        move: nextMove,
        skip: this.skipTurn,
      };

      console.log("[PRACTICE_AFTER_ENEMY_INSERT]", {
        turnCommands: Object.entries(globalScene.currentBattle.turnCommands ?? {}).map(([k, v]: any) => ({
          slot: k,
          move: v?.move,
          command: v?.command,
        })),
      });

      globalScene.currentBattle.enemySwitchCounter = Math.max(globalScene.currentBattle.enemySwitchCounter - 1, 0);

      this.end();
      return;
    }

    const nextMove = enemyPokemon.getNextMove();

    if (trainer?.shouldTera(enemyPokemon)) {
      globalScene.currentBattle.preTurnCommands[this.fieldIndex + BattlerIndex.ENEMY] = {
        command: Command.TERA,
      };
    }

    globalScene.currentBattle.turnCommands[this.fieldIndex + BattlerIndex.ENEMY] = {
      command: Command.FIGHT,
      move: nextMove,
      skip: this.skipTurn,
    };

    globalScene.currentBattle.enemySwitchCounter = Math.max(globalScene.currentBattle.enemySwitchCounter - 1, 0);

    this.end();
  }

  getFieldIndex(): number {
    return this.fieldIndex;
  }
}
