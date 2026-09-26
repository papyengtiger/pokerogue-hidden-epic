import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { monsterHouseManager } from "#data/monster-house/monster-house-manager";
import { UiMode } from "#enums/ui-mode";
import { VariantTier } from "#enums/variant-tier";
import type { Pokemon } from "#field/pokemon";

/**
 * 몬스터소굴에서 포획할 일반 개체를 고르는 Phase.
 *
 * 역할:
 * 1. MonsterHouseManager가 보관 중인 원래 members를 기준으로 후보를 만든다.
 * 2. 기절한 개체와 우두머리는 제외한다.
 * 3. 후보를 하나씩 보여 주며 YES / NO 방식으로 선택한다.
 * 4. 선택된 개체의 고유 Pokemon ID를 콜백으로 전달한다.
 *
 * 주의:
 * - 이 Phase는 "선택"만 담당한다.
 * - 실제 필드 교체 / SwitchSummon / AttemptCapturePhase 실행은
 *   onSelected 콜백 쪽에서 처리한다.
 * - enemyParty 배열 인덱스가 아니라 Pokemon ID를 사용하므로,
 *   SwitchSummonPhase 등으로 enemyParty 순서가 바뀌어도 안전하다.
 */
export class MonsterHouseCaptureSelectPhase extends Phase {
  public readonly phaseName = "MonsterHouseCaptureSelectPhase";

  private readonly onSelected: (pokemonId: number) => void;
  private readonly onCancel?: () => void;

  private candidates: Pokemon[] = [];
  private finished = false;

  constructor(onSelected: (pokemonId: number) => void, onCancel?: () => void) {
    super();

    this.onSelected = onSelected;
    this.onCancel = onCancel;
  }

  start(): void {
    super.start();

    if (!monsterHouseManager.isActive()) {
      console.warn("[MONSTER_HOUSE_CAPTURE_SELECT_INACTIVE]");

      this.finishCancel();
      return;
    }

    /*
     * enemyParty는 SwitchSummonPhase 등으로 순서가 바뀔 수 있으므로
     * MonsterHouseManager가 보관하는 원본 members를 기준으로 한다.
     */
    this.candidates = monsterHouseManager.getAliveMembers().filter((pokemon: Pokemon) => {
      if (!pokemon) {
        return false;
      }

      if (monsterHouseManager.isBossPokemon(pokemon)) {
        return false;
      }

      return true;
    });

    if (this.candidates.length === 0) {
      globalScene.ui.showText("포획할 수 있는 소굴의 일반 개체가 없다!", null, () => this.finishCancel(), 1200, true);

      return;
    }

    console.log("[MONSTER_HOUSE_CAPTURE_SELECT_LIST_OPEN]", {
      candidateCount: this.candidates.length,
      candidates: this.candidates.map(pokemon => ({
        id: pokemon.id,
        name: pokemon.getName?.() ?? pokemon.name,
        shiny: pokemon.isShiny?.() ?? false,
        variant: (pokemon as any).variant,
        hiddenAbility: this.hasHiddenAbility(pokemon),
        hp: pokemon.hp,
        maxHp: pokemon.getMaxHp?.(),
        onField: pokemon.isOnField?.(),
      })),
    });

    this.openCandidateList();
  }

  /**
   * 후보 전부를 하나의 스크롤 선택창으로 연다.
   *
   * maxOptions: 8
   * → 8마리까지만 동시에 표시하고
   *   그 이상은 ↑↓ 이동 시 자동 스크롤.
   */
  private openCandidateList(): void {
    if (this.finished) {
      return;
    }

    const options = this.candidates.map(pokemon => {
      return {
        label: this.getCandidateLabel(pokemon),

        handler: () => {
          this.selectCandidate(pokemon);
          return true;
        },

        keepOpen: true,
      };
    });

    options.push({
      label: "취소",
      handler: () => {
        this.finishCancel();
        return true;
      },
      keepOpen: true,
    });

    globalScene.ui.setOverlayMode(UiMode.MENU_OPTION_SELECT, {
      options,

      /*
       * 로그센터의 여러 선택 메뉴처럼
       * 긴 목록은 maxOptions를 기준으로 스크롤된다.
       */
      maxOptions: 8,

      /*
       * 화면 우측에 너무 붙지 않도록
       * 전투 화면 중앙 부근에 배치.
       * 실제 UI에서 필요하면 이 두 값만 조절.
       */
      xOffset: 72,
      yOffset: 24,
    });
  }

  /**
   * 목록 한 줄에 표시될 텍스트.
   *
   * 예:
   * ★ 개무소  HP 18/18
   * ★★ 랄토스 (H)  HP 14/20
   * ★★★ 나옹  HP 8/22  [전투중]
   */
  private getCandidateLabel(pokemon: Pokemon): string {
    const name = pokemon.getName?.() ?? pokemon.name ?? "알 수 없는 포켓몬";

    const shinyMark = this.getShinyMark(pokemon);

    const hiddenMark = this.hasHiddenAbility(pokemon) ? " (H)" : "";

    const maxHp = Math.max(1, pokemon.getMaxHp?.() ?? pokemon.hp ?? 1);

    const hp = Math.max(0, Math.min(pokemon.hp ?? 0, maxHp));

    const fieldMark = pokemon.isOnField?.() ? " [전투중]" : "";

    const prefix = shinyMark ? `${shinyMark} ` : "";

    return `${prefix}${name}${hiddenMark}` + `  HP ${hp}/${maxHp}` + fieldMark;
  }

  /**
   * 이로치 등급별 별 개수 + 색상.
   *
   * AbstractOptionSelectUiHandler가 BBCodeText를 사용하므로
   * label 내부에 color 태그를 직접 넣으면
   * 별 부분만 원하는 색으로 표시할 수 있다.
   *
   * STANDARD = 노란색 ★
   * RARE     = 연한 파란색 ★★
   * EPIC     = 빨간색 ★★★
   */
  private getShinyMark(pokemon: Pokemon): string {
    if (!pokemon.isShiny?.()) {
      return "";
    }

    switch ((pokemon as any).variant as VariantTier) {
      case VariantTier.EPIC:
        return "[color=#ff4a4a]★★★[/color]";

      case VariantTier.RARE:
        return "[color=#7fdfff]★★[/color]";

      case VariantTier.STANDARD:
      default:
        return "[color=#ffd84a]★[/color]";
    }
  }

  /**
   * 숨겨진 특성 판정.
   */
  private hasHiddenAbility(pokemon: Pokemon): boolean {
    const p = pokemon as any;

    const speciesForm = !p.fusionSpecies ? p.getSpeciesForm?.() : p.getFusionSpeciesForm?.();

    if (!speciesForm?.abilityHidden) {
      return false;
    }

    const abilityIndex = p.fusionSpecies ? p.fusionAbilityIndex : p.abilityIndex;

    const abilityCount = speciesForm.getAbilityCount?.();

    if (abilityIndex === undefined || abilityCount === undefined) {
      return false;
    }

    return abilityIndex === abilityCount - 1;
  }

  private selectCandidate(pokemon: Pokemon): void {
    if (this.finished) {
      return;
    }

    if (!pokemon) {
      this.finishCancel();
      return;
    }

    if (pokemon.isFainted()) {
      console.warn("[MONSTER_HOUSE_CAPTURE_SELECT_FAINTED]", {
        pokemonId: pokemon.id,
        pokemon: pokemon.name,
      });

      this.finishCancel();
      return;
    }

    if (monsterHouseManager.isBossPokemon(pokemon)) {
      console.warn("[MONSTER_HOUSE_CAPTURE_SELECT_BOSS_BLOCKED]", {
        pokemonId: pokemon.id,
        pokemon: pokemon.name,
      });

      this.finishCancel();
      return;
    }

    this.finished = true;

    console.log("[MONSTER_HOUSE_CAPTURE_TARGET_SELECTED]", {
      pokemonId: pokemon.id,
      pokemon: pokemon.getName?.() ?? pokemon.name,
      onField: pokemon.isOnField?.(),
      shiny: pokemon.isShiny?.() ?? false,
      variant: (pokemon as any).variant,
      hiddenAbility: this.hasHiddenAbility(pokemon),
    });

    /*
     * MENU_OPTION_SELECT를 overlay stack에 맡겨 두지 않고
     * MESSAGE 모드로 명시적으로 복귀시킨 뒤 다음 Phase를 시작한다.
     *
     * option의 keepOpen:true와 조합하여
     * AbstractOptionSelectUiHandler의 자동 revertMode()와
     * 중복되지 않게 한다.
     */
    globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
      this.onSelected(pokemon.id);
      this.end();
    });
  }

  private finishCancel(): void {
    if (this.finished) {
      return;
    }

    this.finished = true;

    console.log("[MONSTER_HOUSE_CAPTURE_SELECT_CANCEL]");

    globalScene.ui.setMode(UiMode.MESSAGE).then(() => {
      this.onCancel?.();
      this.end();
    });
  }
}
