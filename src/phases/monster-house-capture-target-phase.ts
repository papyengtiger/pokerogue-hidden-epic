import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import type { PokeballType } from "#enums/pokeball";
import { SwitchType } from "#enums/switch-type";
import type { EnemyPokemon } from "#field/pokemon";

/**
 * 몬스터소굴에서 선택된 개체를 실제 포획 대상으로 준비하는 Phase.
 *
 * 흐름:
 * 1. 선택된 Pokemon ID를 원본 소굴 members에서 찾는다.
 * 2. 이미 현재 필드에 있다면 바로 AttemptCapturePhase를 예약한다.
 * 3. 예비 개체라면 현재 필드 개체를 예비로 돌려보낸다.
 * 4. 선택 개체가 다음 소환 대상으로 잡히도록 enemyParty 순서를 조정한다.
 * 5. SwitchSummonPhase -> AttemptCapturePhase 순으로 실행한다.
 *
 * 전제:
 * - 몬스터소굴은 실제 적 전투 슬롯 1개를 사용한다.
 * - 기존 SwitchSummonPhase가 -1 인덱스일 때
 *   살아 있는 비활성 enemyParty 멤버 중 앞쪽 후보를 고르는 기존 흐름을 재사용한다.
 * - 우두머리는 졸개 선택 포획 대상에서 제외한다.
 */
export class MonsterHouseCaptureTargetPhase extends Phase {
  public readonly phaseName = "MonsterHouseCaptureTargetPhase";

  constructor(
    private readonly pokemonId: number,
    private readonly pokeballType: PokeballType,
  ) {
    super();
  }

  start(): void {
    super.start();

    if (!monsterHouseManager.isActive()) {
      console.warn("[MONSTER_HOUSE_CAPTURE_TARGET_INACTIVE]", {
        pokemonId: this.pokemonId,
      });

      this.end();
      return;
    }

    const target = monsterHouseManager.getMembers().find(pokemon => pokemon?.id === this.pokemonId) as
      | EnemyPokemon
      | undefined;

    if (!target) {
      console.warn("[MONSTER_HOUSE_CAPTURE_TARGET_NOT_FOUND]", {
        pokemonId: this.pokemonId,
      });

      this.end();
      return;
    }

    if (target.isFainted()) {
      console.warn("[MONSTER_HOUSE_CAPTURE_TARGET_FAINTED]", {
        pokemonId: target.id,
        pokemon: target.name,
      });

      this.end();
      return;
    }

    /*
     * 졸개 선택 포획에서는 우두머리를 직접 지정할 수 없다.
     * 우두머리는 졸개 전멸 후 실제 필드에 등장한 상태에서
     * 기존 포획 흐름을 사용한다.
     */
    if (monsterHouseManager.isBossPokemon(target)) {
      console.warn("[MONSTER_HOUSE_CAPTURE_TARGET_BOSS_BLOCKED]", {
        pokemonId: target.id,
        pokemon: target.name,
        bossReleased: monsterHouseManager.isBossReleased(),
      });

      this.end();
      return;
    }

    console.log("[MONSTER_HOUSE_CAPTURE_TARGET_BEGIN]", {
      pokemonId: target.id,
      pokemon: target.name,
      onField: target.isOnField(),
      active: target.isActive(true),
      hp: target.hp,
    });

    /*
     * 이미 현재 필드에 있는 대상이면 교체가 필요 없다.
     */
    if (target.isOnField() && target.isActive(true)) {
      globalScene.phaseManager.unshiftNew("AttemptCapturePhase", 0, this.pokeballType, this.pokemonId);

      console.log("[MONSTER_HOUSE_CAPTURE_TARGET_ALREADY_ACTIVE]", {
        pokemonId: target.id,
        pokemon: target.name,
      });

      this.end();
      return;
    }

    const enemyParty = globalScene.getEnemyParty?.() ?? globalScene.currentBattle.enemyParty ?? [];

    /*
     * SwitchSummonPhase는 생성자에서 정확한 party slotIndex를
     * 받을 수 있으므로, 선택한 Pokemon ID의 현재 실제 인덱스를
     * 그대로 전달한다.
     *
     * enemyParty의 순서를 바꾸면 안 된다.
     */
    const targetPartyIndex = enemyParty.findIndex(pokemon => pokemon?.id === target.id);

    if (targetPartyIndex < 0) {
      console.warn("[MONSTER_HOUSE_CAPTURE_TARGET_NOT_IN_ENEMY_PARTY]", {
        pokemonId: target.id,
        pokemon: target.name,
      });

      this.end();
      return;
    }

    const activeEnemy = enemyParty.find(
      pokemon => pokemon && pokemon.id !== target.id && pokemon.isOnField() && !pokemon.isFainted(),
    ) as EnemyPokemon | undefined;

    /*
     * 현재 필드 개체는 포획/격파가 아니라 단순히 reserve로
     * 돌아가는 것이므로 HP와 상태를 그대로 유지한다.
     *
     * doReturn=false SwitchSummonPhase는 기존 포켓몬을
     * 자동으로 leaveField하지 않으므로 여기서 필드 표시만 내린다.
     *
     * SwitchSummonPhase 내부의 일반 SWITCH 철수와 동일하게
     * leaveField(true, false)를 사용한다.
     */
    if (activeEnemy) {
      console.log("[MONSTER_HOUSE_CAPTURE_TARGET_WITHDRAW_CURRENT]", {
        pokemonId: activeEnemy.id,
        pokemon: activeEnemy.name,
        hp: activeEnemy.hp,
      });

      // 일반 SwitchSummonPhase의 철수 처리와 동일하게
      // 포켓몬 정보/HP 바를 먼저 숨긴 뒤 필드에서 내린다.
      activeEnemy.hideInfo();
      activeEnemy.leaveField(true, false);
    }

    /*
     * 중요:
     *
     * 현재 PhaseManager의 unshiftNew는 같은 호출부에서
     * 먼저 넣은 Phase가 먼저 실행되는 흐름이다.
     *
     * 따라서 반드시:
     *
     *   SwitchSummonPhase
     *   -> AttemptCapturePhase
     *
     * 순서로 등록한다.
     *
     * targetPartyIndex를 직접 전달하므로
     * SwitchSummonPhase의 slotIndex === -1 자동 탐색을 사용하지 않는다.
     */

    globalScene.phaseManager.unshiftNew(
  "SwitchSummonPhase",
  SwitchType.SWITCH,
  0,
  targetPartyIndex,
  false,
  false,
);

globalScene.phaseManager.unshiftNew(
  "MonsterHouseCaptureTargetPhase",
  this.pokemonId,
  this.pokeballType,
);

    console.log("[MONSTER_HOUSE_CAPTURE_TARGET_QUEUED]", {
      pokemonId: target.id,
      pokemon: target.name,
      targetPartyIndex,
      pokeballType: this.pokeballType,
      previousActivePokemonId: activeEnemy?.id ?? null,
      previousActivePokemon: activeEnemy?.name ?? null,
    });

    this.end();
  }
}
