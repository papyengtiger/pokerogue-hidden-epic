import { globalScene } from "#app/global-scene";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { MoveCategory } from "#enums/move-category";
import { MoveUseMode } from "#enums/move-use-mode";
import type { EnemyPokemon, Pokemon } from "#field/pokemon";
import { PokemonMove } from "#moves/pokemon-move";
import { FieldPhase } from "#phases/field-phase";

/**
 * 몬스터소굴 대기 개체들의 추가 행동을 순차 실행한다.
 *
 * 1차 안전 버전:
 * - 실제 필드에 없는 생존 소굴 개체만 행동
 * - 잠긴 우두머리는 제외
 * - 상태기/자기강화기/교체기 등은 제외하고 공격기만 사용
 * - 실제 플레이어 필드의 생존 포켓몬만 대상으로 지정
 * - 한 번의 Phase에서 한 마리만 예약하고, 자기 자신을 다시 삽입해 다음 개체를 처리
 *
 * 주의:
 * MovePhase 자체가 오프필드 user를 완전히 지원하지 않는 코드가 있을 수 있으므로
 * 첫 테스트에서는 직접 공격기의 대미지/PP/애니메이션/부가효과를 집중 확인한다.
 */
export class MonsterHouseVirtualActionPhase extends FieldPhase {
  public readonly phaseName = "MonsterHouseVirtualActionPhase";

  constructor(
    private readonly pendingPokemonIds?: number[],
    private readonly index = 0,
  ) {
    super();
  }

  start(): void {
    super.start();

    if (!monsterHouseManager.isActive()) {
      this.end();
      return;
    }

    const pendingIds = this.pendingPokemonIds ?? this.buildPendingPokemonIds();

    let nextIndex = this.index;

    while (nextIndex < pendingIds.length) {
      const pokemonId = pendingIds[nextIndex++];
      const pokemon = this.getEnemyById(pokemonId);

      if (!pokemon || !this.canAct(pokemon)) {
        continue;
      }

      const target = this.choosePlayerTarget(pokemon);
      if (!target) {
        this.end();
        return;
      }

      const move = this.chooseAttackMove(pokemon);
      if (!move) {
        console.log("[MONSTER_HOUSE_VIRTUAL_NO_ATTACK_MOVE]", {
          pokemon: pokemon.getName(),
          pokemonId: pokemon.id,
        });
        continue;
      }

      console.log("[MONSTER_HOUSE_VIRTUAL_ACTION]", {
        pokemon: pokemon.getName(),
        pokemonId: pokemon.id,
        move: move.getName(),
        target: target.getName(),
        targetBattlerIndex: target.getBattlerIndex(),
        progress: `${nextIndex}/${pendingIds.length}`,
      });

      /*
       * MovePhase 종료 후 다음 대기 개체를 처리한다.
       *
       * 다음 VirtualActionPhase를 먼저 unshift하고 MovePhase를 다시 unshift하는 이유:
       * 현재 프로젝트의 TurnCommandExecutionPhase와 같은 방식으로
       * MovePhase가 먼저 실행된 뒤 이 Phase가 이어지도록 하기 위함이다.
       */
      globalScene.phaseManager.unshiftNew("MonsterHouseVirtualActionPhase", pendingIds, nextIndex);

      globalScene.phaseManager.unshiftNew("MovePhase", pokemon, [target.getBattlerIndex()], move, MoveUseMode.NORMAL);

      this.end();
      return;
    }

    console.log("[MONSTER_HOUSE_VIRTUAL_ACTIONS_DONE]", {
      count: pendingIds.length,
    });

    this.end();
  }

  /**
   * 이번 턴에 가상 행동할 소굴 개체들의 ID를 고정한다.
   * 처리 도중 파티 순서가 바뀌어도 ID 기준이므로 안전하다.
   */
  private buildPendingPokemonIds(): number[] {
    const maxAttackers = monsterHouseManager.getMaxAttackersPerTurn();

    /*
     * 현재 실제 필드에서 행동하는 적도
     * 최대 공격자 수에 포함한다.
     */
    const activeFieldEnemyCount = globalScene
      .getEnemyField()
      .filter(pokemon => !!pokemon && pokemon.isActive() && !pokemon.isFainted()).length;

    const virtualAttackerLimit = Math.max(0, maxAttackers - activeFieldEnemyCount);

    if (virtualAttackerLimit <= 0) {
      return [];
    }

    const candidates = globalScene
      .getEnemyParty()
      .filter((pokemon): pokemon is EnemyPokemon => !!pokemon)
      .filter(pokemon => !pokemon.isFainted() && !pokemon.isOnField())
      /*
       * 우두머리가 아직 해금되지 않았다면
       * 가상 공격자로도 나오지 못하게 한다.
       */
      .filter(pokemon => !monsterHouseManager.isBossPokemon(pokemon) || monsterHouseManager.isBossReleased());

    /*
     * 우두머리가 해금됐고 대기 중이라면
     * 이번 턴 공격자에 우선 포함한다.
     */
    const releasedBoss = monsterHouseManager.isBossReleased()
      ? candidates.find(pokemon => monsterHouseManager.isBossPokemon(pokemon))
      : undefined;

    const otherCandidates = candidates.filter(pokemon => pokemon.id !== releasedBoss?.id);

    /*
     * seeded Fisher-Yates shuffle.
     * 새로고침해도 전투 시드에 따라
     * 동일하게 재현될 수 있다.
     */
    for (let i = otherCandidates.length - 1; i > 0; i--) {
      const j = globalScene.randBattleSeedInt(i + 1);

      [otherCandidates[i], otherCandidates[j]] = [otherCandidates[j], otherCandidates[i]];
    }

    const selectedAttackers = [...(releasedBoss ? [releasedBoss] : []), ...otherCandidates].slice(
      0,
      virtualAttackerLimit,
    );

    console.log("[MONSTER_HOUSE_ATTACKERS_SELECTED]", {
      rank: monsterHouseManager.getRank(),
      maxAttackers,
      activeFieldEnemyCount,
      virtualAttackerLimit,
      candidateCount: candidates.length,
      selected: selectedAttackers.map(pokemon => ({
        id: pokemon.id,
        name: pokemon.getName(),
        boss: monsterHouseManager.isBossPokemon(pokemon),
      })),
    });

    return selectedAttackers.map(pokemon => pokemon.id);
  }

  private getEnemyById(pokemonId: number): EnemyPokemon | undefined {
    return globalScene
      .getEnemyParty()
      .find((pokemon): pokemon is EnemyPokemon => !!pokemon && pokemon.id === pokemonId);
  }

  /**
   * Phase가 예약된 뒤 상황이 변했을 수 있으므로 실행 직전에 재검증한다.
   */
  private canAct(pokemon: EnemyPokemon): boolean {
    if (pokemon.isFainted() || pokemon.isOnField()) {
      return false;
    }

    return true;
  }

  /**
   * 1차 버전에서는 상태기를 제외한다.
   * PokemonMove.isUsable()을 사용해 PP/봉인 등 기존 사용 가능 판정을 유지한다.
   */
  private chooseAttackMove(pokemon: EnemyPokemon): PokemonMove | undefined {
    const usableAttackMoves = pokemon
      .getMoveset()
      .filter(move => move.isUsable(pokemon))
      .filter(move => move.getMove().category !== MoveCategory.STATUS)
      // 필드 밖 포켓몬은 충전 애니메이션을 실행할 수 없음
      .filter(move => !move.getMove().isChargingMove());

    if (usableAttackMoves.length === 0) {
      return;
    }

    /*
     * seeded RNG.
     * 오프필드 EnemyPokemon.getNextMove()는 getNextTargets()와 AI 점수 계산에서
     * 필드 위치를 전제로 하는 부분이 있으므로 1차 버전에서는 직접 선택한다.
     */
    const selected = usableAttackMoves[globalScene.randBattleSeedInt(usableAttackMoves.length)];

    return (
      pokemon.getMoveset().find(move => move.moveId === selected.moveId && move.ppUsed < move.getMovePp())
      ?? new PokemonMove(selected.moveId)
    );
  }

  /**
   * 실제 플레이어 필드 중 생존/활성 포켓몬을 seeded RNG로 하나 고른다.
   */
  private choosePlayerTarget(_pokemon: EnemyPokemon): Pokemon | undefined {
    const targets = globalScene
      .getPlayerField()
      .filter(pokemon => !!pokemon && pokemon.isActive() && !pokemon.isFainted());

    if (targets.length === 0) {
      return;
    }

    return targets[globalScene.randBattleSeedInt(targets.length)];
  }
}
