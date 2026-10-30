import { allAbilities } from "#app/data/data-lists";
import { globalScene } from "#app/global-scene";
import { getStarterPassiveAbilities } from "#balance/passives";
import { PlayerPartyMemberPokemonPhase } from "#app/phases/player-party-member-pokemon-phase";
import { UiMode } from "#enums/ui-mode";
import type { OptionSelectConfig, OptionSelectItem } from "#app/ui/abstact-option-select-ui-handler";
import i18next from "i18next";

export enum RegisterAbilityType {
  ABILITY_CAPSULE = "ability_capsule",
  ABILITY_PATCH = "ability_patch",
  TRAINING_SESSION_ENCOUNTER = "training_session_encounter",
  REGISTER_ABILITY = "register_ability",
  DEX_UPDATE = "dex_update",
}

/** 특성패치: 패시브 슬롯 선택 + 미해금 슬롯 등록 + 개체 활성화/전환. */
export class RegisterAbilityPhase extends PlayerPartyMemberPokemonPhase {
  private directSelection = false;
  constructor(
    partyMemberIndex: number,
    private readonly registerAbilityType: RegisterAbilityType,
    private readonly cost = -1,
    private readonly onSelectionComplete?: (confirmed: boolean) => void,
  ) { super(partyMemberIndex); }

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
    const rootId = pokemon.species.getRootSpeciesId(true);
    const starter = globalScene.gameData.starterData[rootId];
    const passives = getStarterPassiveAbilities(rootId, pokemon.formIndex);
    if (!starter || !passives.length) {
      globalScene.ui.setMode(UiMode.MESSAGE);
      if (!this.directSelection) this.end();
      this.onSelectionComplete?.(false);
      return;
    }

    const options: OptionSelectItem[] = [];
    for (let index = 0; index < passives.length; index++) {
      const ability = allAbilities[passives[index]];
      if (!ability) continue;
      const bit = 1 << index;
      const unlocked = ((starter.passiveUnlocks ?? 0) & bit) !== 0;
      const selected = pokemon.passive && pokemon.passiveIndex === index;
      if (selected) continue;
      options.push({
        label: `${ability.name}${unlocked ? "" : " (미등록 → 해금)"}`,
        handler: () => {
          starter.passiveUnlocks = (starter.passiveUnlocks ?? 0) | bit;
          // 기존 스타터/패시브 UI용 해금 비트. 활성화는 개체별로 처리.
          starter.passiveAttr = (starter.passiveAttr ?? 0) | 1;
          starter.passiveIndex = index;
          pokemon.passiveIndex = index;
          pokemon.passive = true;
          void globalScene.gameData.saveSystem();
          console.log("[ABILITY_PATCH_PASSIVE]", { rootId, pokemonId: pokemon.id, index, unlocked, ability: ability.name });
          globalScene.ui.setMode(UiMode.MESSAGE);
          if (!this.directSelection) this.end();
          this.onSelectionComplete?.(true);
          return true;
        },
      });
    }
    options.push({
      label: i18next.t("menu:cancel"),
      handler: () => { globalScene.ui.setMode(UiMode.MESSAGE); if (!this.directSelection) this.end(); this.onSelectionComplete?.(false); return true; },
    });
    const config: OptionSelectConfig = { options, maxOptions: 7, yOffset: 0, supportHover: true };
    // 기존 아이템/포켓몬 UI를 숨기고 단독 선택 화면으로 전환
    globalScene.ui.setMode(UiMode.OPTION_SELECT, config, null, true);
  }
}
