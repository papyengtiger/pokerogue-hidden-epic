import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { SwitchType } from "#enums/switch-type";

/**
 * 몬스터소굴 광역 공격의 모든 후속 처리가 끝난 뒤 실행되는 Phase.
 *
 * 역할:
 * 1. 광역 공격 처리 상태를 종료한다.
 * 2. 현재 필드의 적이 쓰러져 비어 있는지 확인한다.
 * 3. 살아 있는 소굴 멤버가 남아 있다면 정확히 한 번 소환한다.
 * 4. 일반 개체가 모두 처리된 경우 해금된 우두머리를 소환한다.
 */
export class MonsterHouseSpreadEndPhase extends Phase {
  public readonly phaseName = "MonsterHouseSpreadEndPhase";

  start(): void {
    super.start();

    if (!monsterHouseManager.isActive()) {
      monsterHouseManager.endSpreadAttack();
      this.end();
      return;
    }

    console.log("[MONSTER_HOUSE_SPREAD_FINALIZE_BEGIN]", {
      remaining: monsterHouseManager.getRemainingEnemies(),
      bossReleased: monsterHouseManager.isBossReleased(),
    });

    /*
     * 여기까지 왔다는 것은 MoveEffectPhase의 광역 공격과
     * 그 공격으로 예약된 FaintPhase 처리가 끝났다는 뜻입니다.
     */
    monsterHouseManager.endSpreadAttack();

    const enemyParty = monsterHouseManager.getMembers();

    /*
     * 현재 실제 필드에 살아 있는 적이 있는지 확인합니다.
     *
     * 몬스터소굴은 실제 전투 슬롯을 1개만 사용하므로
     * 살아 있는 적이 하나라도 필드에 있으면 새 적을
     * 꺼낼 필요가 없습니다.
     */
    const hasAliveEnemyOnField = enemyParty.some(pokemon => pokemon.isOnField() && !pokemon.isFainted());

    if (hasAliveEnemyOnField) {
      console.log("[MONSTER_HOUSE_SPREAD_FINALIZE_FIELD_OCCUPIED]");

      this.end();
      return;
    }

    const bossReleased = monsterHouseManager.isBossReleased();

    const bossIndex = monsterHouseManager.getBossIndex();

    /*
     * 다음에 내보낼 수 있는 살아 있는 예비 개체가 있는지 확인합니다.
     *
     * 우두머리 해금 전:
     *   우두머리를 제외한 일반 개체만 인정
     *
     * 우두머리 해금 후:
     *   살아 있는 모든 예비 개체를 인정
     */
    const hasReserve = enemyParty.some(
      pokemon =>
        !pokemon.isFainted() && !pokemon.isOnField() && (bossReleased || !monsterHouseManager.isBossPokemon(pokemon)),
    );

    console.log("[MONSTER_HOUSE_SPREAD_FINALIZE_CHECK]", {
      remaining: monsterHouseManager.getRemainingEnemies(),
      bossReleased,
      bossIndex,
      hasReserve,
    });

    if (!hasReserve) {
      this.end();
      return;
    }

    /*
     * 실제 필드가 비었고 살아 있는 소굴 개체가 남았습니다.
     *
     * FaintPhase에서는 광역기 처리 중이었기 때문에
     * SwitchSummonPhase를 만들지 않았으므로 여기서
     * 정확히 한 번만 생성합니다.
     */
    globalScene.phaseManager.unshiftNew("SwitchSummonPhase", SwitchType.SWITCH, 0, -1, false, false);

    console.log("[MONSTER_HOUSE_SPREAD_NEXT_SUMMON]", {
      bossReleased,
      remaining: monsterHouseManager.getRemainingEnemies(),
    });

    this.end();
  }
}
