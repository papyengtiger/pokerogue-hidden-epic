import type { Ability } from "#app/data/abilities/ability-class";
import { allAbilities } from "#app/data/data-lists";
import type Pokemon from "#app/field/pokemon";
import type { PlayerPokemon } from "#app/field/pokemon";
import { globalScene } from "#app/global-scene";
import { getPokemonNameWithAffix } from "#app/messages";
import { ChangeAbilityModifier, RegisterAbilityModifier } from "#app/modifier/modifier";
import type { Phase } from "#app/phase";
import { PlayerPartyMemberPokemonPhase } from "#app/phases/player-party-member-pokemon-phase";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase";
import type { OptionSelectConfig, OptionSelectItem } from "#app/ui/abstact-option-select-ui-handler";
import { BallUiHandler } from "#app/ui/handlers/ball-ui-handler";
import { CommandUiHandler } from "#app/ui/handlers/command-ui-handler";
import { FightUiHandler } from "#app/ui/handlers/fight-ui-handler";
import { TitleUiHandler } from "#app/ui/handlers/title-ui-handler";
import { AbilityAttr } from "#enums/ability-attr";
import { UiMode } from "#enums/ui-mode";
import i18next from "i18next";

export enum ChangeAbilityType {
  /** For changing a Pokémon's ability using an Ability Capsule */
  ABILITY_CAPSULE = "ability_capsule",

  /** For changing a Pokémon's ability using an Ability Patch */
  ABILITY_PATCH = "ability_patch",

  /** For changing a Pokémon's ability via special training during a Training Period Mystery Encounter */
  TRAINING_SESSION_ENCOUNTER = "training_session_encounter",

  CHANGE_ABILITY,

  DEX_UPDATE,
}

export class ChangeAbilityPhase extends PlayerPartyMemberPokemonPhase {
  private readonly changeAbilityType: ChangeAbilityType;
  private readonly cost: number;
  private handlers: any[];
  private messageMode: UiMode;

  private previousPhase?: Phase; // ✅ 여기에 previousPhase 추가

  constructor(
    partyMemberIndex: number,
    changeAbilityType: ChangeAbilityType,
    cost = -1,
    previousPhase?: Phase, // ✅ 이전 Phase 선택적으로 받음
  ) {
    super(partyMemberIndex);
    this.changeAbilityType = changeAbilityType;
    this.cost = cost;
    this.previousPhase = previousPhase;

    this.handlers = [new TitleUiHandler(), new CommandUiHandler(), new FightUiHandler(), new BallUiHandler()];

    this.messageMode =
      globalScene.ui.getHandler() instanceof SelectModifierPhase ? UiMode.SELECT_MODIFIER : UiMode.MESSAGE;

    this.mode = UiMode.MESSAGE;
  }

  start() {
    if (this.abilityOptions?.length <= 1) {
      globalScene.ui.showTextPromise(i18next.t("battle:noOtherAbilities"), undefined, true);
      console.warn("이 포켓몬은 특성이 하나뿐이어서 특성 바꾸기를 사용할 수 없습니다.");
      return;
    }

    super.start();
    this.showAbilitySelectionUI();
  }

  public async showAbilitySelectionScreen(pokemon: Pokemon): Promise<void> {
    console.log("[AbilityUI] showAbilitySelectionScreen 호출됨");

    await globalScene.ui.showTextPromise(i18next.t("battle:chooseAbilityAgain"), undefined, false);

    const speciesForm = pokemon.getFusionSpeciesForm() ?? pokemon.getSpeciesForm();
    const abilities = speciesForm.getAllAbilities();
    const currentAbility = pokemon.getAbility();

    const abilityOptions = abilities.map((abilityId: string, index: number) => {
      const ability = allAbilities[abilityId];
      return {
        label: ability.name,
        value: index,
        isSelected: currentAbility.name === ability.name,
      };
    });

    console.log("[AbilityUI] showSelectionList 호출 전");

    await globalScene.ui.showSelectionList(abilityOptions, async (selectedIndex: number) => {
      console.log("[AbilityUI] 선택된 인덱스:", selectedIndex);
      const selectedAbilityName = allAbilities[abilities[selectedIndex]].name;
      console.log("[AbilityUI] 선택된 특성 이름:", selectedAbilityName);
      await this.onAbilitySelected(selectedIndex, selectedAbilityName, pokemon);
    });
  }

  private showAbilitySelectionUI() {
    const pokemon = this.getPokemon();
    const speciesForm = pokemon.getFusionSpeciesForm() ?? pokemon.getSpeciesForm();
    const abilityCount = speciesForm.getAbilityCount();

    if (abilityCount <= 1) {
      globalScene.ui.showTextPromise(i18next.t("abilityChange:noOtherAbilities")).then(() => this.end());
      return;
    }

    const speciesId = speciesForm.getRootSpeciesId(true);
    const dexEntry = globalScene.gameData.dexData[speciesId];
    const abilityAttr = dexEntry?.abilityAttr ?? 0;

    const options: OptionSelectItem[] = [];

    const isRegisterMode = this.modifier instanceof RegisterAbilityModifier;
    const isChangeMode = this.modifier instanceof ChangeAbilityModifier;

    for (let i = 0; i < abilityCount; i++) {
      const abilityId = speciesForm.getAbility(i);
      if (!abilityId) {
        continue;
      }

      const ability = allAbilities[abilityId];
      if (!ability) {
        continue;
      }

      if (ability.name === pokemon.getAbility()?.name) {
        continue;
      }

      const isHidden = abilityId === speciesForm.hiddenAbility;
      const abilityBit = isHidden ? AbilityAttr.ABILITY_HIDDEN : 1 << i;
      const isUnlocked = (abilityAttr & abilityBit) !== 0;

      let disabled = false;

      if (isChangeMode && !isUnlocked) {
        disabled = true; // ChangeAbilityModifier면 미등록 특성 비활성화
      }

      options.push({
        label: ability.name + (isUnlocked ? "" : " (미등록)"),
        disabled,
        handler: () => {
          const shouldRegister = isRegisterMode && !isUnlocked;
          this.onAbilitySelected(i, ability.name, undefined, undefined, shouldRegister ? abilityBit : undefined);
        },
      });
    }

    if (options.length === 0) {
      globalScene.ui.showTextPromise(i18next.t("battle:noOtherAbilities")).then(() => {
        this.returnToPreviousScreen();
      });
      return;
    }

    options.push({
      label: i18next.t("menu:cancel"),
      handler: () => {
        globalScene.ui.clearText();

        this.returnToPreviousScreen();

        return true;
      },
      onHover: () => {},
    });

    const config: OptionSelectConfig = {
      options,
      maxOptions: 7,
      yOffset: 0,
      supportHover: true,
    };

    globalScene.ui.setModeWithoutClear(UiMode.OPTION_SELECT, config, null, true);
  }

  private returnToPreviousScreen(): void {
    console.log("[AbilityUI] 이전 화면으로 복귀");

    // 현재 OPTION_SELECT 종료
    globalScene.ui.clearText();

    if (this.previousPhase instanceof SelectModifierPhase) {
      // 현재 ChangeAbilityPhase만 끝낸 뒤
      // 원래 아이템/보상 선택 화면으로 복귀
      globalScene.ui.setMode(
        UiMode.MODIFIER_SELECT,
        this.previousPhase.isPlayer(),
        this.previousPhase.typeOptions,
        this.previousPhase.modifierSelectCallback,
        this.previousPhase.getRerollCost(globalScene.lockModifierTiers),
      );

      this.end();
      return;
    }

    // previousPhase가 따로 없다면 UI 스택으로 복귀
    globalScene.ui.revertMode().then(reverted => {
      if (!reverted) {
        console.warn("[AbilityUI] 이전 UI 모드 복원 실패");
        globalScene.ui.setMode(UiMode.MESSAGE);
      }

      this.end();
    });
  }

  private async attemptUnlockAbility(speciesId: string, abilityBit: number): Promise<boolean> {
    // TODO: 아이템 존재 여부 체크 및 소모 처리 (아이템 시스템과 연동)
    // 예시:
    const hasUnlockItem = globalScene.player.hasItem("AbilityUnlocker");
    if (!hasUnlockItem) {
      await globalScene.ui.showTextPromise("특성 해금 아이템이 없습니다.", 0, false);
      return false;
    }
    globalScene.player.consumeItem("AbilityUnlocker");

    // 여기서 해금 성공 확률, 실패 조건 등 추가 가능
    // 현재는 무조건 성공 처리
    return true;
  }

  private async onAbilitySelected(
    index: number,
    name: string,
    playerPokemon: PlayerPokemon,
    textMessage?: string,
    unlockBit?: number,
  ) {
    const pokemon = this.getPokemon();
    if (!pokemon) {
      console.error("Pokemon is undefined!");
      return;
    }

    const speciesForm = pokemon.getFusionSpeciesForm() ?? pokemon.getSpeciesForm();
    const speciesId = speciesForm.getRootSpeciesId(true);

    if (!speciesId) {
      console.error("Failed to get speciesId");
      return;
    }

    pokemon.speciesId = speciesId;

    // dexEntry 및 abilityAttr는 무시합니다
    // const dexEntry = globalScene.gameData.dexData[speciesId];
    // if (!dexEntry) {
    //   console.error("DexEntry is undefined!");
    //   return;
    // }

    // const abilityAttr = dexEntry.abilityAttr ?? 0;
    // const isHidden = speciesForm.getAbility(index) === speciesForm.hiddenAbility;
    // const abilityBit = isHidden ? AbilityAttr.ABILITY_HIDDEN : (1 << index);

    // if ((abilityAttr & abilityBit) === 0) {
    //   // 미해금 처리 삭제
    // }

    const currentAbility = pokemon.getAbility();
    const newAbilityId = speciesForm.getAbility(index);
    const newAbility = newAbilityId ? allAbilities[newAbilityId] : undefined;

    if (!currentAbility || !newAbility) {
      await globalScene.ui.showTextPromise(i18next.t("battle:abilityLoadError") || "능력 정보를 불러올 수 없습니다.");
      return;
    }

    globalScene.ui.clearText();

    pokemon.setAbility(newAbility);
    pokemon.abilityIndex = index;
    await this.registerPokemonToDex(pokemon, playerPokemon, speciesId);

    await globalScene.ui.showTextPromise(`${pokemon.name}가 새로운 능력을 배웠습니다!`, 0, false);

    globalScene.phaseManager.tryRemovePhase(phase => phase instanceof SelectModifierPhase);
    globalScene.ui.setMode(this.messageMode);
    this.end();
  }

  // Confirm 다이얼로그를 보여주는 함수
  private async showConfirmDialog(message: string): Promise<boolean> {
    return new Promise(resolve => {
      // 텍스트 메시지 표시
      globalScene.ui.showTextPromise(message, undefined, true).then(() => {
        // 확인 및 취소 버튼 설정 (실제 UI 시스템에 따라 다를 수 있음)
        globalScene.ui.setConfirmCallbacks(
          () => {
            // 확인 시
            resolve(true);
          },
          () => {
            // 취소 시
            resolve(false);
          },
        );
      });
    });
  }

  /**
   * 이 함수는 포켓몬의 능력치나 특성이 변경되었을 때,
   * 해당 변경 사항을 반영하고 UI를 업데이트하는 역할을 합니다.
   * 능력치 변화나 특성 변경에 따라 효과가 발생할 수 있으며,
   * 이를 UI나 상태에 즉시 반영하여 사용자에게 변경된 내용을 보여줍니다.
   *
   * @param pokemon 변경될 포켓몬 객체
   * @param newAbility 변경될 새로운 능력치(특성)
   * @param isBattle 이 변경이 전투 중에 일어난 것인지 여부
   *
   * @returns {Promise<void>} 비동기적으로 UI 업데이트와 관련된 작업을 처리
   */
  async applyAbilityChange(pokemon: Pokemon, newAbility: Ability, isBattle: boolean): Promise<void> {
    // 새로운 능력치를 포켓몬에 적용
    pokemon.ability = newAbility;

    // 능력치 변경에 따른 효과가 있다면 적용
    if (newAbility.effect) {
      // 예: 특성에 따른 효과를 적용 (예: 공격력 증가, 속도 증가 등)
      applyAbilityEffect(pokemon, newAbility);
    }
    globalScene.playSound("level_up_fanfare"); // Sound loaded into game as is

    const speciesForm = pokemon.getFusionSpeciesForm() ?? pokemon.getSpeciesForm();
    const currentAbility = pokemon.getAbility();

    // UI 업데이트: 포켓몬의 특성이 변경되었음을 사용자에게 알려줌
    await globalScene.ui.showTextPromise(
      i18next.t("battle:abilityChangeComplete", {
        pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
        oldability: currentAbility.name,
        newability: pokemon.ability.name,
      }),
    );

    // 전투 중에 능력치가 변경되었을 때
    if (isBattle) {
      // 전투 UI 업데이트 (필요한 경우)
      updateBattleUI(pokemon);
    }

    // 다른 상태나 동작을 반영할 수 있다면, 그 부분에 대한 추가 처리
    // 예: 포켓몬의 상태에 따른 능력치 변화나 효과 반영
    if (pokemon.statusEffects.includes("StatBoost")) {
      // 상태 효과에 따른 능력치 변화 처리
      applyStatBoostEffect(pokemon);
    }
  }

  /**
   * 도감 등록 및 UI 갱신 담당 함수
   */
  private async registerPokemonToDex(pokemon: Pokemon, playerPokemon: PlayerPokemon, speciesId: string) {
    try {
      // changeType이 DEX_UPDATE일 때만 도감 등록 시도
      if (this.changeType === ChangeAbilityType.DEX_UPDATE) {
        await globalScene.gameData.setPokemonCaught(pokemon, true);
      }

      // UI 갱신 처리 분기
      if (this.changeType === ChangeAbilityType.DEX_UPDATE) {
        // 완전 갱신: UI 갱신 메서드 호출 또는 닫았다 다시 열기
        if (typeof globalScene.ui.updateDexList === "function") {
          globalScene.ui.updateDexList();
        } else {
          globalScene.ui.closeDex?.();
          setTimeout(() => globalScene.ui.openDex?.(), 100);
        }
      } else if (this.registerType === RegisterDexType.QUICK_UPDATE) {
        // 간단 갱신: 빠른 갱신 메서드 호출
        if (typeof globalScene.ui.quickUpdateDexList === "function") {
          globalScene.ui.quickUpdateDexList();
        }
      }

      // 도감 내 특성 비트 업데이트
      if (this.changeType === ChangeAbilityType.DEX_UPDATE) {
        const dexEntry = globalScene.gameData.dexData[speciesId];
        const abilityIndex = pokemon.abilityIndex;
        let bit = 0;

        if (abilityIndex === 2 || (abilityIndex === 1 && !playerPokemon.species.ability2)) {
          bit = AbilityAttr.ABILITY_HIDDEN;
        } else if (abilityIndex === 0) {
          bit = AbilityAttr.ABILITY_1;
        } else if (abilityIndex === 1) {
          if (playerPokemon.species.ability2 === playerPokemon.species.ability1) {
            bit = AbilityAttr.ABILITY_1;
          } else {
            bit = AbilityAttr.ABILITY_2;
          }
        }

        // 미등록 특성은 등록
        if ((dexEntry.abilityAttr & bit) === 0) {
          dexEntry.abilityAttr |= bit;
        }

        // 스타팅 포켓몬은 무조건 도감 등록
        if (pokemon.isStarter) {
          await globalScene.gameData.setPokemonCaught(pokemon, true);
        }
      }
    } catch (error) {
      console.error("Error registering Pokémon in Pokedex:", error);
    } finally {
      // 도감 등록 시 팬페어 사운드 재생
      if (this.changeType === ChangeAbilityType.DEX_UPDATE) {
        globalScene.playSound("level_up_fanfare");
      }
    }
  }
}
