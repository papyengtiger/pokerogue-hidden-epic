import { getAbilityEffectLines } from "#abilities/ability-detail";
import { globalScene } from "#app/global-scene";
import { biomeLinks, biomePokemonPools, biomeTrainerPools } from "#balance/biomes";
import { allAbilities, allMoves } from "#data/data-lists";
import { getNatureName, getNatureStatMultiplier } from "#data/nature";
import { TerrainType } from "#data/terrain";
import { AbilityId } from "#enums/ability-id";
import { BiomeId } from "#enums/biome-id";
import { BiomePoolTier } from "#enums/biome-pool-tier";
import { Button } from "#enums/buttons";
import { SpeciesId } from "#enums/species-id";
import { Stat } from "#enums/stat";
import { TextStyle } from "#enums/text-style";
import { TimeOfDay } from "#enums/time-of-day";
import { TrainerType } from "#enums/trainer-type";
import { UiMode } from "#enums/ui-mode";
import { WeatherType } from "#enums/weather-type";
import type { Pokemon } from "#field/pokemon";
import { getMoveDetailLines } from "#moves/move-detail";
import type { PokemonMove } from "#moves/pokemon-move";
import { trainerConfigs } from "#trainers/trainer-config";
import { addBBCodeTextObject, addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";
import { getBiomeName } from "#utils/common";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import { toCamelCase } from "#utils/strings";
import i18next from "i18next";
import type BBCodeText from "phaser3-rex-plugins/plugins/bbcodetext";

enum RotomDexPage {
  MAIN_MENU,
  ENEMY_LIST,
  ALLY_LIST,
  POKEMON_MENU,
  BASIC_INFO,
  ABILITY_LIST,
  MOVE_LIST,
  ITEM_LIST,
  DETAIL,
  BIOME_INFO,
  BIOME_MENU,
}

export class RotomDexUiHandler extends UiHandler {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.NineSlice;
  private titleText: Phaser.GameObjects.Text;
  private bodyText: BBCodeText;
  private detailFooter: Phaser.GameObjects.Text;

  private fieldIndex = 0;
  private cursor = 0;
  private page = RotomDexPage.MAIN_MENU;
  private previousPage = RotomDexPage.MAIN_MENU;

  private selectedPokemon: Pokemon | null = null;
  private detailTitle = "";
  private detailBody = "";
  private detailPages: string[] = [];
  private detailPage = 0;
  /** bodyText의 y=28부터 footer의 y=112 앞까지 사용하는 표시 높이. */
  private readonly detailBodyHeight = 76;

  private readonly mainMenu = ["상대 정보", "아군 정보", "바이옴 정보"];
  private readonly pokemonMenu = ["기본 정보", "특성/패시브", "기술", "지닌도구"];

  private readonly biomeMenu = [
    "기본 정보",
    "다음 후보",
    "등장 트레이너",
    "등장 포켓몬",
    "희귀 포켓몬",
    "출현 보스",
    "웨이브",
    "날씨",
    "필드",
  ];

  private listPage = 0;
  private readonly pageSize = 8;

  constructor() {
    super(UiMode.ROTOM_DEX);
  }

  setup() {
    const ui = this.getUi();

    this.container = globalScene.add.container(24, -172);
    this.container.setName("rotom-dex");
    this.container.setVisible(false);

    this.bg = addWindow(0, 0, 272, 128);
    this.bg.setOrigin(0, 0);
    this.container.add(this.bg);

    this.titleText = addTextObject(12, 8, "터몽도감", TextStyle.WINDOW);
    this.titleText.setOrigin(0, 0);
    this.container.add(this.titleText);

    this.bodyText = addBBCodeTextObject(12, 28, "", TextStyle.WINDOW, {
      fontSize: "48px",
      wordWrap: { width: 1450 },
    });
    this.bodyText.setOrigin(0, 0);
    this.container.add(this.bodyText);

    this.detailFooter = addTextObject(12, 112, "", TextStyle.WINDOW);
    this.detailFooter.setOrigin(0, 0);
    this.detailFooter.setVisible(false);
    this.container.add(this.detailFooter);

    ui.add(this.container);
  }

  show(args: any[]): boolean {
    super.show(args);
    this.fieldIndex = args.length > 0 ? (args[0] as number) : 0;
    this.page = RotomDexPage.MAIN_MENU;
    this.previousPage = RotomDexPage.MAIN_MENU;
    this.cursor = 0;
    this.listPage = 0;
    this.detailPage = 0;
    this.detailPages = [];
    this.selectedPokemon = null;
    this.container.setVisible(true);
    this.refresh();
    return true;
  }

  private getEnemyList(): Pokemon[] {
    return globalScene.getEnemyField().filter(p => p?.isActive?.()) as Pokemon[];
  }

  private getAllyList(): Pokemon[] {
    return globalScene.getPlayerParty().filter(Boolean) as Pokemon[];
  }

  private getListForPage(): string[] {
    switch (this.page) {
      case RotomDexPage.MAIN_MENU:
        return this.mainMenu;
      case RotomDexPage.ENEMY_LIST:
        return this.getEnemyList().map(p => `${p.getNameToRender?.() ?? p.name} Lv.${p.level}`);
      case RotomDexPage.ALLY_LIST:
        return this.getAllyList().map(p => `${p.getNameToRender?.() ?? p.name} Lv.${p.level}`);
      case RotomDexPage.POKEMON_MENU:
        return this.pokemonMenu;
      case RotomDexPage.ABILITY_LIST:
        return this.getAbilityList();
      case RotomDexPage.MOVE_LIST:
        return this.getMoveList();
      case RotomDexPage.ITEM_LIST:
        return this.getItemList();
      case RotomDexPage.BIOME_MENU:
        return this.biomeMenu;
      default:
        return [];
    }
  }

  private refresh(): void {
    this.detailFooter.setVisible(this.page === RotomDexPage.DETAIL);
    switch (this.page) {
      case RotomDexPage.MAIN_MENU:
        this.renderMenu("터몽도감", "무엇을 살펴볼까?", this.mainMenu, "Z 선택 / X 닫기");
        break;

      case RotomDexPage.ENEMY_LIST:
        this.renderMenu("터몽도감 - 상대 정보", "상대를 선택하세요.", this.getListForPage(), "Z 상세 / X 뒤로");
        break;

      case RotomDexPage.ALLY_LIST:
        this.renderMenu("터몽도감 - 아군 정보", "아군을 선택하세요.", this.getListForPage(), "Z 상세 / X 뒤로");
        break;

      case RotomDexPage.POKEMON_MENU:
        this.renderMenu(
          `터몽도감 - ${this.selectedPokemon?.getNameToRender?.() ?? this.selectedPokemon?.name ?? "포켓몬"}`,
          "확인할 정보를 선택하세요.",
          this.pokemonMenu,
          "Z 선택 / X 뒤로",
        );
        break;

      case RotomDexPage.BASIC_INFO:
        this.renderBasicInfo();
        break;

      case RotomDexPage.ABILITY_LIST:
        this.renderMenu(
          "터몽도감 - 특성/패시브",
          "확인할 항목을 선택하세요.",
          this.getListForPage(),
          "Z 상세 / X 뒤로",
        );
        break;

      case RotomDexPage.MOVE_LIST:
        this.renderMenu("터몽도감 - 기술", "확인할 기술을 선택하세요.", this.getListForPage(), "Z 상세 / X 뒤로");
        break;

      case RotomDexPage.ITEM_LIST:
        this.renderMenu("터몽도감 - 지닌도구", "확인할 도구를 선택하세요.", this.getListForPage(), "Z 상세 / X 뒤로");
        break;

      case RotomDexPage.BIOME_MENU:
        this.renderMenu("터몽도감 - 환경 정보", "확인할 정보를 선택하세요.", this.getListForPage(), "Z 상세 / X 뒤로");
        break;

      case RotomDexPage.DETAIL:
        this.renderDetailPage();
        break;
    }
  }

  /** 각 상세창의 내용을 실제 표시 높이에 맞춰 나누고 첫 페이지를 엽니다. */
  private openDetailPage(previousPage: RotomDexPage): void {
    this.previousPage = previousPage;
    this.detailPage = 0;
    // 기존 특성/바이옴 내용에 포함된 안내 문구는 고정 footer와 중복되지 않게 제거합니다.
    const body = this.detailBody.replace(/(?:\r?\n)*X 뒤로\s*$/, "").trim();
    this.detailPages = this.paginateDetail(body || "설명 정보가 없습니다.");
    this.page = RotomDexPage.DETAIL;
    this.refresh();
  }

  private renderDetailPage(): void {
    const total = Math.max(1, this.detailPages.length);
    this.detailPage = Math.max(0, Math.min(this.detailPage, total - 1));
    this.titleText.setText(this.detailTitle);
    this.bodyText.setText(this.detailPages[this.detailPage] ?? "설명 정보가 없습니다.");
    this.detailFooter.setText(total > 1 ? `${this.detailPage + 1}/${total}  ←→ 페이지 / X 뒤로` : "X 뒤로");
  }

  /**
   * 줄 개수 대신 BBCodeText의 실제 줄바꿈 결과(displayHeight)를 측정합니다.
   * 한 문장이 화면 높이보다 길어도 나누며, 페이지 경계의 색상 태그를 복원합니다.
   * 페이지를 넘길 때는 이미 만들어 둔 문자열만 표시합니다.
   */
  private paginateDetail(text: string): string[] {
    const tokens = text.match(/\[color=[^\]]+\]|\[\/color\]|[\s\S]/gu) ?? [];
    const pages: string[] = [];
    let start = 0;
    let activeColors: string[] = [];

    const fragment = (count: number): { text: string; colors: string[] } => {
      const colors = [...activeColors];
      const content = tokens.slice(start, start + count);
      for (const token of content) {
        if (token.startsWith("[color=")) {
          colors.push(token);
        } else if (token === "[/color]") {
          colors.pop();
        }
      }
      return {
        text: activeColors.join("") + content.join("") + "[/color]".repeat(colors.length),
        colors,
      };
    };

    while (start < tokens.length) {
      let low = 1;
      let high = tokens.length - start;
      let count = 1;
      // 긴 문장도 문자마다 다시 그리지 않고 이진 탐색으로 잘라낼 위치를 찾습니다.
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        this.bodyText.setText(fragment(mid).text);
        if (this.bodyText.displayHeight <= this.detailBodyHeight) {
          count = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      if (start + count < tokens.length) {
        // 화면을 충분히 채울 수 있으면 문장/단어 경계에서 페이지를 나눕니다.
        const minBoundary = Math.floor(count / 2);
        let boundary = -1;
        for (let i = count - 1; i >= minBoundary; i--) {
          if (tokens[start + i] === "\n") {
            boundary = i + 1;
            break;
          }
        }
        if (boundary < 0) {
          for (let i = count - 1; i >= minBoundary; i--) {
            if (tokens[start + i] === " ") {
              boundary = i + 1;
              break;
            }
          }
        }
        if (boundary > 0) {
          count = boundary;
        }
      }

      const result = fragment(count);
      pages.push(result.text);
      activeColors = result.colors;
      start += count;
    }
    return pages.length > 0 ? pages : ["설명 정보가 없습니다."];
  }

  private renderMenu(title: string, header: string, items: string[], footer: string): void {
    this.titleText.setText(title);

    if (items.length === 0) {
      this.bodyText.setText(`${header}\n\n정보가 없습니다.\n\nX 뒤로`);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(items.length / this.pageSize));

    if (this.listPage >= totalPages) {
      this.listPage = totalPages - 1;
    }

    const start = this.listPage * this.pageSize;
    const visibleItems = items.slice(start, start + this.pageSize);

    const lines = [
      header,
      "",
      ...visibleItems.map((item, i) => {
        const realIndex = start + i;
        return `${this.cursor === realIndex ? "▶ " : "   "}${item}`;
      }),
      "",
      `페이지 ${this.listPage + 1}/${totalPages}`,
      footer,
    ];

    this.bodyText.setText(lines.join("\n"));
  }

  private renderBasicInfo(): void {
    const p = this.selectedPokemon;
    if (!p) {
      return;
    }

    const speciesForm = p.getSpeciesForm?.();
    const stats = p.stats ?? [];
    const ivs = p.ivs ?? [];

    const nature = (p as any).nature;
    const hasNature = typeof nature === "number";

    const statLabels = ["HP", "공격", "방어", "특공", "특방", "스피드"];

    const natureStats = [null, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];

    const natureName = hasNature ? getNatureName(nature, false, false, true) : "알 수 없음";

    const starterData = hasNature ? globalScene.gameData?.dexData?.[p.species.speciesId] : null;

    const starterNatures = starterData?.natures ?? starterData?.natureAttr ?? starterData?.natureMask ?? null;

    const hasStarterNature = (() => {
      if (!hasNature || starterNatures == null) {
        return true;
      }

      if (Array.isArray(starterNatures)) {
        return starterNatures.includes(nature);
      }

      if (typeof starterNatures === "number") {
        return !!(starterNatures & (1 << nature));
      }

      if (typeof starterNatures === "object") {
        return !!starterNatures[nature];
      }

      return true;
    })();

    const natureDisplayName = hasStarterNature ? natureName : `[color=#ffd966]★ ${natureName}[/color]`;

    const getStatColor = (i: number): string | null => {
      const natureStat = natureStats[i];
      if (!hasNature || natureStat === null) {
        return null;
      }

      const multiplier = getNatureStatMultiplier(nature, natureStat);
      if (multiplier > 1) {
        return "#ff6666"; // 빨강
      }
      if (multiplier < 1) {
        return "#66ccff"; // 파랑
      }
      return null;
    };

    const colorText = (text: string, color?: string | null): string =>
      color ? `[color=${color}]${text}[/color]` : text;

    const increasedStatIndex = natureStats.findIndex(
      stat => stat !== null && hasNature && getNatureStatMultiplier(nature, stat) > 1,
    );

    const decreasedStatIndex = natureStats.findIndex(
      stat => stat !== null && hasNature && getNatureStatMultiplier(nature, stat) < 1,
    );

    const natureEffectText =
      increasedStatIndex >= 0 && decreasedStatIndex >= 0
        ? `([color=#ff6666]+${statLabels[increasedStatIndex]}[/color]/[color=#66ccff]-${statLabels[decreasedStatIndex]}[/color])`
        : "([color=#aaaaaa]-[/color])";

    const formatStatLine = (i: number): string => {
      const color = getStatColor(i);
      const label = colorText(statLabels[i].padEnd(3, "　"), color);
      const stat = colorText(String(stats[i] ?? "?").padStart(3, " "), color);

      const natureMark =
        color === "#ff6666"
          ? "[color=#ff6666]↑[/color]"
          : color === "#66ccff"
            ? "[color=#66ccff]↓[/color]"
            : "[color=#aaaaaa]-[/color]";

      const iv = ivs[i] ?? "?";
      const ivText = iv === 31 ? `[color=#d8b4ff]IV ${iv}★[/color]` : `IV ${iv}`;

      return `${natureMark}${label} ${stat} / ${ivText}`;
    };

    const leftLines = [0, 1, 2].map(formatStatLine);
    const rightLines = [3, 4, 5].map(formatStatLine);

    const statLines = leftLines.map((line, i) => {
      const spacer = "      ";
      return `${line}${spacer}${rightLines[i]}`;
    });

    const ivTotal = ivs.reduce((total, iv) => total + (iv ?? 0), 0);

    this.titleText.setText("터몽도감 - 기본 정보");
    this.bodyText.setText(
      [
        `${p.getNameToRender?.() ?? p.name}   Lv.${p.level}`,
        `이로치: ${p.shiny ? "예" : "아니오"}   성격: ${natureDisplayName} ${natureEffectText}`,
        `종족값 합계: ${speciesForm?.baseTotal ?? "?"}   IV 합계: ${ivTotal}/186`,
        "",
        ...statLines,
        "",
        "[color=#ff6666]↑ 상승[/color]   [color=#66ccff]↓ 하락[/color]   [color=#d8b4ff]★ 최대 IV[/color]   [color=#ffd966]★ 신규 성격[/color]",
        "",
        "X 뒤로",
      ].join("\n"),
    );
  }

  private getAbilityList(): string[] {
    const p = this.selectedPokemon;
    if (!p) {
      return [];
    }

    const speciesForm = p.getSpeciesForm?.();
    if (!speciesForm) {
      return [];
    }

    const ability1 = speciesForm.ability1;
    const ability2 = speciesForm.ability2;
    const abilityHidden = speciesForm.abilityHidden;
    const passiveAbility = speciesForm.getPassiveAbility?.(p.formIndex);

    return [
      `일반 1: ${this.getAbilityNameFromId(ability1)}`,
      `일반 2: ${this.getAbilityNameFromId(ability2)}`,
      `숨겨진: ${this.getAbilityNameFromId(abilityHidden)}`,
      `패시브: ${this.getAbilityNameFromId(passiveAbility)}`,
    ];
  }

  private getMoveList(): string[] {
    return this.getListedMoves().map(move => move.getName?.() || "알 수 없는 기술");
  }

  private getListedMoves(): PokemonMove[] {
    // 목록과 상세창에서 같은 배열을 사용하여 빈 슬롯이 있어도 인덱스가 어긋나지 않습니다.
    return (this.selectedPokemon?.getMoveset?.() ?? []).filter((move): move is PokemonMove => move != null);
  }

  private getItemList(): string[] {
    const p = this.selectedPokemon;
    if (!p) {
      return [];
    }

    return (
      p
        .getHeldItems?.()
        ?.map(m => `${m?.type?.name ?? "알 수 없는 도구"} ×${m?.getStackCount?.() ?? m?.stackCount ?? 1}`)
        .filter(Boolean) ?? []
    );
  }

  private getAbilityNameFromId(abilityId: any): string {
    if (abilityId == null || abilityId === AbilityId.NONE) {
      return "없음";
    }

    return i18next.t(`ability:${toCamelCase(AbilityId[abilityId])}.name`, {
      defaultValue: AbilityId[abilityId] ?? "알 수 없음",
    });
  }

  private openAbilityDetail(index: number): void {
    const p = this.selectedPokemon;
    if (!p) {
      return;
    }

    const currentAbility = p.getAbility?.();
    const currentPassive = p.getPassiveAbility?.();

    const speciesForm = p.getSpeciesForm?.();
    if (!speciesForm) {
      return;
    }

    const rootSpeciesId = speciesForm.getRootSpeciesId?.(true) ?? p.species.speciesId;
    const starterEntry = globalScene.gameData.starterData?.[rootSpeciesId];

    const abilityAttr = (starterEntry as any)?.abilityAttr ?? 0;
    const passiveAttr = (starterEntry as any)?.passiveAttr ?? 0;

    const ability1 = speciesForm.ability1;
    const ability2 = speciesForm.ability2;
    const abilityHidden = speciesForm.abilityHidden;
    const passiveAbility = speciesForm.getPassiveAbility?.(p.formIndex);

    const selectedAbilityId =
      index === 0 ? ability1 : index === 1 ? ability2 : index === 2 ? abilityHidden : passiveAbility;

    const ability =
      selectedAbilityId != null && selectedAbilityId !== AbilityId.NONE ? allAbilities[selectedAbilityId] : null;

    const isPassive = index === 3;
    const isCurrent = isPassive ? currentPassive?.id === selectedAbilityId : currentAbility?.id === selectedAbilityId;

    const known = isPassive ? !!passiveAttr : !!(abilityAttr & (1 << index));

    const category = index === 0 ? "일반 1" : index === 1 ? "일반 2" : index === 2 ? "숨겨진" : "패시브";

    const effectLines = getAbilityEffectLines(ability);

    this.detailTitle = isPassive ? "터몽도감 - 패시브 상세" : "터몽도감 - 특성 상세";

    this.detailBody = [
      `${category}: ${ability?.name ?? "없음"}`,
      "",
      `상태: ${isCurrent ? "[color=#ffd966]현재 사용 중[/color]" : "[color=#aaaaaa]현재 미사용[/color]"}`,
      `등록: ${known ? "[color=#90ff90]발견/해금됨[/color]" : "[color=#777777]미발견/미해금[/color]"}`,
      "",
      "설명",
      ability?.getDescription?.() ?? ability?.description ?? "설명 정보가 없습니다.",
      "",
      "상세 효과",
      ...effectLines,
      "",
      "X 뒤로",
    ].join("\n");

    this.openDetailPage(RotomDexPage.ABILITY_LIST);
  }

  private openMoveDetail(index: number): void {
    const pokemonMove = this.getListedMoves()[index];
    if (!pokemonMove) {
      return;
    }

    const move = pokemonMove.getMove?.() ?? allMoves[pokemonMove.moveId];
    if (!move) {
      return;
    }

    const maxPp = pokemonMove.getMovePp?.() ?? move.pp;
    const remainingPp = Math.max(0, maxPp - (pokemonMove.ppUsed ?? 0));
    this.detailTitle = "터몽도감 - 기술 상세";
    this.detailBody = [
      pokemonMove.getName?.() || move.name || "알 수 없는 기술",
      `현재 PP: ${remainingPp}/${maxPp}`,
      "",
      ...getMoveDetailLines(move, { includeBaseDescription: true }),
    ].join("\n");
    this.openDetailPage(RotomDexPage.MOVE_LIST);
  }

  private openItemDetail(index: number): void {
    const item = this.selectedPokemon?.getHeldItems?.()?.[index];

    this.detailTitle = "터몽도감 - 지닌도구";
    this.detailBody = [
      `${item?.type?.name ?? "알 수 없는 도구"} ×${item?.getStackCount?.() ?? item?.stackCount ?? 1}`,
      "",
      item?.type?.getDescription?.() ?? item?.type?.description ?? "설명 정보가 없습니다.",
    ].join("\n");

    this.openDetailPage(RotomDexPage.ITEM_LIST);
  }

  private getSpeciesName(speciesId: SpeciesId): string {
    return getPokemonSpecies(speciesId)?.getName?.() ?? SpeciesId[speciesId] ?? "알 수 없음";
  }

  private getTrainerName(trainerType: TrainerType): string {
    const enumName = TrainerType[trainerType];

    if (!enumName) {
      return "알 수 없음";
    }

    const key = toCamelCase(enumName);

    return i18next.t(`trainerClasses:${key}`, {
      defaultValue: trainerConfigs[trainerType]?.name ?? enumName,
    });
  }

  private formatBiomeLink(link: any): string {
    let biome: BiomeId;
    let weight: number | undefined;

    if (Array.isArray(link)) {
      biome = link[0];
      weight = link[1];
    } else {
      biome = link;
    }

    const biomeName = getBiomeName(biome);

    return `• ${biomeName}${weight ? ` (${weight})` : ""}`;
  }

  private formatSpeciesEntry(entry: any): string {
    if (typeof entry === "number") {
      return this.getSpeciesName(entry);
    }

    const levels = Object.keys(entry)
      .map(Number)
      .sort((a, b) => a - b);

    return levels.map(level => this.getSpeciesName(entry[level][0])).join(" → ");
  }

  private collectBiomeSpecies(biome: BiomeId, tiers: BiomePoolTier[], limit = 8): string {
    const pool = biomePokemonPools[biome];
    if (!pool) {
      return "정보 없음";
    }

    const result = new Set<string>();

    for (const tier of tiers) {
      const tierPool = pool[tier];
      if (!tierPool) {
        continue;
      }

      for (const tod of [TimeOfDay.ALL, TimeOfDay.DAY, TimeOfDay.NIGHT, TimeOfDay.DAWN, TimeOfDay.DUSK]) {
        const entries = tierPool[tod] ?? [];

        for (const entry of entries) {
          result.add(this.formatSpeciesEntry(entry));
          if (result.size >= limit) {
            return [...result].map(v => `• ${v}`).join("\n");
          }
        }
      }
    }

    return result.size > 0 ? [...result].map(v => `• ${v}`).join("\n") : "정보 없음";
  }

  private collectBiomeTrainers(biome: BiomeId, limit = 6): string {
    const pool = biomeTrainerPools?.[biome];
    if (!pool) {
      return "정보 없음";
    }

    const result = new Set<string>();

    for (const value of Object.values(pool).flat() as any[]) {
      const trainerId = Array.isArray(value) ? value[0] : value;
      result.add(this.getTrainerName(trainerId));

      if (result.size >= limit) {
        break;
      }
    }

    return result.size > 0 ? [...result].map(v => `• ${v}`).join("\n") : "정보 없음";
  }

  private openBiomeDetail(index: number): void {
    const arena: any = globalScene.arena;
    const biome = arena?.biomeType ?? BiomeId.TOWN;

    const biomeName = getBiomeName(biome);
    const weatherName = WeatherType[arena?.weather?.weatherType ?? 0] ?? "없음";
    const terrainName = TerrainType[arena?.terrain?.terrainType ?? 0] ?? "없음";

    const links = biomeLinks[biome];

    const linkText = Array.isArray(links)
      ? links.map(link => this.formatBiomeLink(link)).join("\n")
      : this.formatBiomeLink(links);

    if (index === 0) {
      this.detailTitle = "터몽도감 - 바이옴";

      this.detailBody = [`현재 바이옴: ${biomeName}`, "", "이 바이옴의 기본 정보입니다.", "", "X 뒤로"].join("\n");
    } else if (index === 1) {
      this.detailTitle = "터몽도감 - 다음 후보";

      this.detailBody = ["다음 이동 가능 바이옴:", "", linkText, "", "X 뒤로"].join("\n");
    } else if (index === 2) {
      this.detailTitle = "터몽도감 - 등장 트레이너";

      this.detailBody = [this.collectBiomeTrainers(biome), "", "X 뒤로"].join("\n");
    } else if (index === 3) {
      this.detailTitle = "터몽도감 - 등장 포켓몬";

      this.detailBody = [
        this.collectBiomeSpecies(biome, [BiomePoolTier.COMMON, BiomePoolTier.UNCOMMON], 8),
        "",
        "X 뒤로",
      ].join("\n");
    } else if (index === 4) {
      this.detailTitle = "터몽도감 - 희귀 포켓몬";

      this.detailBody = [
        this.collectBiomeSpecies(biome, [BiomePoolTier.RARE, BiomePoolTier.SUPER_RARE, BiomePoolTier.ULTRA_RARE], 8),
        "",
        "X 뒤로",
      ].join("\n");
    } else if (index === 5) {
      this.detailTitle = "터몽도감 - 출현 보스";

      this.detailBody = [
        this.collectBiomeSpecies(
          biome,
          [BiomePoolTier.BOSS, BiomePoolTier.BOSS_RARE, BiomePoolTier.BOSS_SUPER_RARE, BiomePoolTier.BOSS_ULTRA_RARE],
          8,
        ),
        "",
        "X 뒤로",
      ].join("\n");
    } else if (index === 6) {
      this.detailTitle = "터몽도감 - 웨이브";

      this.detailBody = [`현재 웨이브: ${globalScene.currentBattle?.waveIndex ?? "?"}`, "", "X 뒤로"].join("\n");
    } else if (index === 7) {
      this.detailTitle = "터몽도감 - 날씨";

      this.detailBody = [`현재 날씨: ${weatherName}`, "", "날씨 효과 설명은 추후 추가 예정입니다.", "", "X 뒤로"].join(
        "\n",
      );
    } else if (index === 8) {
      this.detailTitle = "터몽도감 - 필드";

      this.detailBody = [`현재 필드: ${terrainName}`, "", "필드 효과 설명은 추후 추가 예정입니다.", "", "X 뒤로"].join(
        "\n",
      );
    }

    this.openDetailPage(RotomDexPage.BIOME_MENU);
  }

  private renderBiomeInfo(): void {
    const arena: any = globalScene.arena;

    this.titleText.setText("터몽도감 - 바이옴 정보");
    this.bodyText.setText(
      [
        `바이옴: ${arena?.getBiomeName?.() ?? arena?.biomeType ?? "알 수 없음"}`,
        `웨이브: ${globalScene.currentBattle?.waveIndex ?? "?"}`,
        `날씨: ${arena?.weather?.weatherType ?? "없음"}`,
        `필드: ${arena?.terrain?.terrainType ?? "없음"}`,
        "",
        "X 뒤로",
      ].join("\n"),
    );
  }

  processInput(button: Button): boolean {
    if (button === Button.CANCEL) {
      if (this.page === RotomDexPage.MAIN_MENU) {
        this.getUi().setMode(UiMode.COMMAND, this.fieldIndex);
        return true;
      }

      if (this.page === RotomDexPage.DETAIL) {
        this.page = this.previousPage;
        // 상세창에서는 목록의 커서/페이지를 변경하지 않으므로 그대로 복귀합니다.
        this.refresh();
        return true;
      }

      if (
        this.page === RotomDexPage.BASIC_INFO
        || this.page === RotomDexPage.ABILITY_LIST
        || this.page === RotomDexPage.MOVE_LIST
        || this.page === RotomDexPage.ITEM_LIST
      ) {
        this.page = RotomDexPage.POKEMON_MENU;
        this.cursor = 0;
        this.listPage = 0;
        this.refresh();
        return true;
      }

      this.page = RotomDexPage.MAIN_MENU;
      this.cursor = 0;
      this.listPage = 0;
      this.refresh();
      return true;
    }

    if (this.page === RotomDexPage.DETAIL) {
      const previous = button === Button.LEFT || button === Button.UP;
      const next = button === Button.RIGHT || button === Button.DOWN;

      if (previous || next) {
        const total = Math.max(1, this.detailPages.length);

        if (next) {
          // 마지막 페이지에서 다음을 누르면 첫 페이지로
          this.detailPage = this.detailPage < total - 1 ? this.detailPage + 1 : 0;
        } else {
          // 첫 페이지에서 이전을 누르면 마지막 페이지로
          this.detailPage = this.detailPage > 0 ? this.detailPage - 1 : total - 1;
        }

        this.renderDetailPage();
        return true;
      }

      return false;
    }

    const items = this.getListForPage();

    if (button === Button.UP && items.length > 0) {
      this.cursor = this.cursor > 0 ? this.cursor - 1 : items.length - 1;

      this.listPage = Math.floor(this.cursor / this.pageSize);

      this.refresh();
      return true;
    }

    if (button === Button.DOWN && items.length > 0) {
      this.cursor = this.cursor < items.length - 1 ? this.cursor + 1 : 0;

      this.listPage = Math.floor(this.cursor / this.pageSize);

      this.refresh();
      return true;
    }

    if (button === Button.LEFT && items.length > 0) {
      const totalPages = Math.max(1, Math.ceil(items.length / this.pageSize));

      this.listPage = this.listPage > 0 ? this.listPage - 1 : totalPages - 1;

      this.cursor = this.listPage * this.pageSize;
      this.refresh();
      return true;
    }

    if (button === Button.RIGHT && items.length > 0) {
      const totalPages = Math.max(1, Math.ceil(items.length / this.pageSize));

      this.listPage = this.listPage < totalPages - 1 ? this.listPage + 1 : 0;

      this.cursor = this.listPage * this.pageSize;
      this.refresh();
      return true;
    }

    if (button === Button.ACTION) {
      if (this.page === RotomDexPage.MAIN_MENU) {
        if (this.cursor === 0) {
          this.page = RotomDexPage.ENEMY_LIST;
        }
        if (this.cursor === 1) {
          this.page = RotomDexPage.ALLY_LIST;
        }
        if (this.cursor === 2) {
          this.page = RotomDexPage.BIOME_MENU;
        }
        this.cursor = 0;
        this.listPage = 0;
        this.refresh();

        return true;
      }

      if (this.page === RotomDexPage.ENEMY_LIST) {
        this.selectedPokemon = this.getEnemyList()[this.cursor] ?? null;
        this.page = RotomDexPage.POKEMON_MENU;
        this.cursor = 0;
        this.listPage = 0;
        this.refresh();
        return true;
      }

      if (this.page === RotomDexPage.ALLY_LIST) {
        this.selectedPokemon = this.getAllyList()[this.cursor] ?? null;
        this.page = RotomDexPage.POKEMON_MENU;
        this.cursor = 0;
        this.listPage = 0;
        this.refresh();
        return true;
      }

      if (this.page === RotomDexPage.POKEMON_MENU) {
        if (this.cursor === 0) {
          this.page = RotomDexPage.BASIC_INFO;
        }
        if (this.cursor === 1) {
          this.page = RotomDexPage.ABILITY_LIST;
        }
        if (this.cursor === 2) {
          this.page = RotomDexPage.MOVE_LIST;
        }
        if (this.cursor === 3) {
          this.page = RotomDexPage.ITEM_LIST;
        }
        this.cursor = 0;
        this.listPage = 0;
        this.refresh();
        return true;
      }

      if (this.page === RotomDexPage.BIOME_MENU) {
        this.openBiomeDetail(this.cursor);
        return true;
      }

      if (this.page === RotomDexPage.ABILITY_LIST) {
        this.openAbilityDetail(this.cursor);
        return true;
      }

      if (this.page === RotomDexPage.MOVE_LIST) {
        this.openMoveDetail(this.cursor);
        return true;
      }

      if (this.page === RotomDexPage.ITEM_LIST) {
        this.openItemDetail(this.cursor);
        return true;
      }
    }

    return false;
  }

  clear(): void {
    super.clear();
    this.detailPages = [];
    this.detailPage = 0;
    this.detailFooter.setVisible(false);
    this.container.setVisible(false);
  }
}
