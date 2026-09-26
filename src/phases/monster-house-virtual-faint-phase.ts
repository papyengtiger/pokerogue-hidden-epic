import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";

export class MonsterHouseVirtualFaintPhase extends Phase {
  public readonly phaseName = "MonsterHouseVirtualFaintPhase";

  private pokemonId: number;

  constructor(pokemonId: number) {
    super();

    this.pokemonId = pokemonId;
  }

  start(): void {
    super.start();

    if (!monsterHouseManager.isActive()) {
      console.warn("[MONSTER_HOUSE_VIRTUAL_FAINT_INACTIVE]", {
        pokemonId: this.pokemonId,
      });

      this.end();
      return;
    }

    /*
     * BattlerIndex를 사용하지 않고
     * MonsterHouseManager가 보관 중인 원래 멤버에서
     * 고유 Pokemon ID로 직접 찾습니다.
     */
    const pokemon = monsterHouseManager.getMembers().find(member => member?.id === this.pokemonId);

    if (!pokemon) {
      console.warn("[MONSTER_HOUSE_VIRTUAL_FAINT_NOT_FOUND]", {
        pokemonId: this.pokemonId,
      });

      this.end();
      return;
    }

    /*
     * 혹시 실제 필드 포켓몬이 잘못 들어왔다면
     * 여기서 중복 Faint 처리를 하지 않습니다.
     */
    if (pokemon.isActive(true)) {
      console.warn("[MONSTER_HOUSE_VIRTUAL_FAINT_ACTIVE_TARGET]", {
        pokemonId: pokemon.id,
        pokemon: pokemon.name,
      });

      this.end();
      return;
    }

    console.log("[MONSTER_HOUSE_VIRTUAL_FAINT_BEGIN]", {
      pokemonId: pokemon.id,
      pokemon: pokemon.name,
      hp: pokemon.hp,
      remainingBefore: monsterHouseManager.getRemainingEnemies(),
    });

    /*
     * 가상 대상은 이미 MoveEffectPhase에서
     * 대미지를 받아 HP가 0이 된 상태입니다.
     *
     * 실제 필드용 faint 애니메이션,
     * leaveField(), sprite tween 등은 하지 않습니다.
     */

    // 몬스터소굴 격파 수 등록
    monsterHouseManager.registerEnemyDefeated();

    /*
     * 일반 VictoryPhase의 EXP 처리와 동일한 부분.
     *
     * VictoryPhase 전체를 호출하면 일반적인
     * BattleEndPhase 판정까지 실행될 수 있으므로
     * 필요한 부분만 직접 처리합니다.
     */
    globalScene.gameData.gameStats.pokemonDefeated++;

    const expValue = pokemon.getExpValue();

    globalScene.applyPartyExp(expValue, true);

    /*
     * 일반 멤버가 모두 처리되어
     * 우두머리 하나만 남았다면 해금합니다.
     */
    if (monsterHouseManager.canReleaseBoss()) {
      monsterHouseManager.releaseBoss();
    }

    console.log("[MONSTER_HOUSE_VIRTUAL_FAINT_COMPLETE]", {
      pokemonId: pokemon.id,
      pokemon: pokemon.name,
      expValue,
      defeated: monsterHouseManager.getDefeatedEnemies(),
      captured: monsterHouseManager.getCapturedEnemies(),
      remaining: monsterHouseManager.getRemainingEnemies(),
      bossReleased: monsterHouseManager.isBossReleased(),
    });

    this.end();
  }
}
