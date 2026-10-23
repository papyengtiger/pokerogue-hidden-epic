import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { NaturalDisasterType } from "#data/natural-disaster/natural-disaster";
import { naturalDisasterManager } from "#data/natural-disaster/natural-disaster-manager";
import { UiMode } from "#enums/ui-mode";

const DISASTER_NAMES: Partial<Record<NaturalDisasterType, string>> = {
  [NaturalDisasterType.EARTHQUAKE]: "지진",
  [NaturalDisasterType.FLOOD]: "홍수",
  [NaturalDisasterType.TYPHOON]: "태풍",
  [NaturalDisasterType.ROCKSLIDE]: "낙석",
  [NaturalDisasterType.LIGHTNING]: "낙뢰",
  [NaturalDisasterType.ERUPTION]: "화산 폭발",
};

export class NaturalDisasterPhase extends Phase {
  public readonly phaseName = "NaturalDisasterPhase";
  private applying = false;

  public override start(): void {
    super.start();
    this.applying = false;

    const disaster = naturalDisasterManager.prepareDisaster();
    if (!disaster) {
      this.end();
      return;
    }

    void this.showDisasterMessage();
  }

  private async showDisasterMessage(): Promise<void> {
    try {
      await globalScene.ui.setMode(UiMode.MESSAGE);
      const disaster = naturalDisasterManager.getPendingDisaster();
      if (!disaster) {
        this.end();
        return;
      }

      const name = DISASTER_NAMES[disaster.type] ?? "자연재해";
      globalScene.ui.showText(
        `규모 ${disaster.grade}의 ${name}이(가) 발생했다!`,
        null,
        () => {
          void this.applyDisaster(name);
        },
        null,
        true,
      );
    } catch (error) {
      console.error("[NATURAL_DISASTER_PHASE_ERROR]", error);
      naturalDisasterManager.clearPendingDisaster();
      this.end();
    }
  }

  private async applyDisaster(name: string): Promise<void> {
    if (this.applying) {
      return;
    }
    this.applying = true;

    // 실제 HP 변화를 집계해 피해가 발생했는지 안내한다.
    const pokemonById = new Map<number, { hp: number; name: string }>();
    for (const pokemon of [...globalScene.getPlayerParty(), ...globalScene.getEnemyParty()]) {
      if (pokemon && !pokemonById.has(pokemon.id)) {
        pokemonById.set(pokemon.id, { hp: pokemon.hp, name: pokemon.getName() });
      }
    }

    try {
      await naturalDisasterManager.activatePreparedDisaster();
      let damagedCount = 0;
      let totalHpLost = 0;
      for (const pokemon of [...globalScene.getPlayerParty(), ...globalScene.getEnemyParty()]) {
        if (!pokemon) {
          continue;
        }
        const before = pokemonById.get(pokemon.id);
        if (before && pokemon.hp < before.hp) {
          damagedCount++;
          totalHpLost += before.hp - pokemon.hp;
          pokemonById.delete(pokemon.id);
        }
      }
      const result =
        damagedCount > 0
          ? `${name}으로 포켓몬 ${damagedCount}마리가 피해를 입었다! (총 HP ${totalHpLost})`
          : `포켓몬들이 ${name}의 피해를 피했다!`;
      globalScene.ui.showText(result, null, () => this.finishDisaster(), null, true);
    } catch (error) {
      console.error("[NATURAL_DISASTER_ACTIVATE_ERROR]", error);
      this.finishDisaster();
    }
  }

  private finishDisaster(): void {
    naturalDisasterManager.clearPendingDisaster();
    this.end();
  }
}
