import { allAbilities } from "#app/data/data-lists";
import { globalScene } from "#app/global-scene";
import { PlayerPartyMemberPokemonPhase } from "#app/phases/player-party-member-pokemon-phase";
import { AbilityAttr } from "#enums/ability-attr";
import { UiMode } from "#enums/ui-mode";
import type { OptionSelectConfig, OptionSelectItem } from "#app/ui/abstact-option-select-ui-handler";
import i18next from "i18next";

export enum ChangeAbilityType {
  ABILITY_CAPSULE = "ability_capsule",
  ABILITY_PATCH = "ability_patch", // 이전 세이브/호출부 호환
  TRAINING_SESSION_ENCOUNTER = "training_session_encounter",
  CHANGE_ABILITY = "change_ability",
  DEX_UPDATE = "dex_update",
}

export class ChangeAbilityPhase extends PlayerPartyMemberPokemonPhase {
  private directSelection = false;
  constructor(partyMemberIndex: number, private readonly changeAbilityType: ChangeAbilityType, private readonly cost = -1, private readonly onSelectionComplete?: (confirmed: boolean) => void) {
    super(partyMemberIndex);
  }

  /** 아이템 화면이 활성화된 상태에서 대기열 없이 선택 UI를 즉시 연다. */
  public showSelectionDirect(): void {
    this.directSelection = true;
    this.showSelection();
  }

  override start(): void {
    super.start();
    this.showSelection();
  }

  private showSelection(): void {
    const pokemon = this.getPokemon();
    const form = pokemon.getFusionSpeciesForm() ?? pokemon.getSpeciesForm();
    const rootId = form.getRootSpeciesId(true);
    const dexEntry = globalScene.gameData.dexData[rootId];
    const options: OptionSelectItem[] = [];
    const seen = new Set<string>();

    for (let index = 0; index < form.getAbilityCount(); index++) {
      const abilityId = form.getAbility(index);
      const ability = abilityId ? allAbilities[abilityId] : undefined;
      if (!ability || seen.has(String(abilityId))) continue;
      seen.add(String(abilityId));
      const hidden = abilityId === form.hiddenAbility;
      const bit = hidden ? AbilityAttr.ABILITY_HIDDEN : index === 0 ? AbilityAttr.ABILITY_1 : AbilityAttr.ABILITY_2;
      const unlocked = !!dexEntry && (dexEntry.abilityAttr & bit) !== 0;
      if (index === pokemon.abilityIndex && unlocked) continue;
      options.push({
        label: `${ability.name}${unlocked ? "" : " (미등록 → 해금)"}`,
        handler: () => {
          // 포켓몬의 speciesId를 루트 종으로 덮어쓰지 말 것!
          // 진화 후에도 같은 슬롯 인덱스를 사용하도록 한다.
          pokemon.abilityIndex = index;
          // setAbility()는 구 종의 특성 ID를 영구 고정하므로 사용하지 않는다.
          delete pokemon.customPokemonData.ability;
          if (pokemon.summonData?.ability) delete pokemon.summonData.ability;
          if (dexEntry) dexEntry.abilityAttr |= bit;
          const starter = globalScene.gameData.starterData[rootId];
          if (starter) starter.abilityAttr |= bit;
          void globalScene.gameData.saveSystem();
          console.log("[ABILITY_CAPSULE]", { rootId, speciesId: pokemon.speciesId, index, abilityId, bit });
          globalScene.ui.setMode(UiMode.MESSAGE);
          if (!this.directSelection) this.end();
          this.onSelectionComplete?.(true);
          return true;
        },
      });
    }
    options.push({
      label: i18next.t("menu:cancel"),
      handler: () => {
        globalScene.ui.setMode(UiMode.MESSAGE);
        if (!this.directSelection) this.end();
        this.onSelectionComplete?.(false);
        return true;
      },
    });
    const config: OptionSelectConfig = { options, maxOptions: 7, yOffset: 0, supportHover: true };
    // 기존 아이템/포켓몬 UI를 숨기고 단독 선택 화면으로 전환
    globalScene.ui.setMode(UiMode.OPTION_SELECT, config, null, true);
  }
}
