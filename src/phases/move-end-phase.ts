import { applyAbAttrs } from "#abilities/apply-ab-attrs";
import { globalScene } from "#app/global-scene";
import type { BattlerIndex } from "#enums/battler-index";
import { BattlerTagLapseType } from "#enums/battler-tag-lapse-type";
import type { Pokemon } from "#field/pokemon";
import { PokemonPhase } from "#phases/pokemon-phase";

export class MoveEndPhase extends PokemonPhase {
  public readonly phaseName = "MoveEndPhase";
  private wasFollowUp: boolean;

  /** Targets from the preceding MovePhase */
  private targets: Pokemon[];
  constructor(battlerIndex: BattlerIndex, targets: Pokemon[], wasFollowUp = false) {
    super(battlerIndex);

    this.targets = targets;
    this.wasFollowUp = wasFollowUp;
  }

  start() {
  super.start();

  const pokemon = this.getPokemon();

  // ✅ Me First 1턴 플래그 정리 (턴 종료 시 확실히 제거)
  if (pokemon?.turnData) {
    delete pokemon.turnData.meFirstNoAccuracyCheck;
    delete pokemon.turnData.meFirstCopiedMove;
    delete pokemon.turnData.meFirstPowerBoost;
  }

  if (!this.wasFollowUp && pokemon?.isActive(true)) {
    pokemon.lapseTags(BattlerTagLapseType.AFTER_MOVE);
  }

  // Remove effects which were set on a Pokemon which removes them on summon (i.e. via Mold Breaker)
  globalScene.arena.setIgnoreAbilities(false);
  for (const target of this.targets) {
    if (target) {
      applyAbAttrs("PostSummonRemoveEffectAbAttr", { pokemon: target });
    }
  }

  // ✅ 멀티히트 때문에 미뤄둔 승리 판정 처리
  const battle: any = globalScene.currentBattle;
  if (battle?.deferVictory) {
    battle.deferVictory = false;

    const aliveEnemies =
      globalScene.getEnemyField?.(true)
      ?? globalScene.getField?.(true)?.filter(p => !p.isPlayer())
      ?? [];

    if (!aliveEnemies.length) {
      globalScene.phaseManager.unshiftNew("VictoryPhase", battle.deferVictoryIndex ?? this.battlerIndex);
    }
  }

    this.end();
  }
}
