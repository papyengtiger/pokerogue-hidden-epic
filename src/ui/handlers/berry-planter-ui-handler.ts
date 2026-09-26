import { globalScene } from "#app/global-scene";
import { getApricornName } from "#data/apricorn";
import { getBerryName } from "#data/berry";
import { ApricornType } from "#enums/apricorn-type";
import { BerryType } from "#enums/berry-type";
import { Button } from "#enums/buttons";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";
import { getEnumValues } from "#utils/enums";
import i18next from "i18next";

const PLANTER_SLOT_COUNT = 3;
const SLOT_X = [90, 160, 230];
const POT_Y = 104;

const CROP_BASE_Y = POT_Y - 22;

export enum PlanterState {
  EMPTY = "EMPTY",
  PLANTED = "PLANTED",
  GROWING = "GROWING",
  READY = "READY",
}

export enum PlanterCropCategory {
  BERRY = "BERRY",
  APRICORN = "APRICORN",
}

export type BerryPlanterSlotData = {
  state: PlanterState;
  category?: PlanterCropCategory;
  cropId?: string;
  growthStage?: number;
  /** 완전히 성장할 때까지 남은 웨이브 */
  growthWaves?: number;
};

export class BerryPlanterUiHandler extends UiHandler {
  private rootContainer: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Image;
  private potSpace: Phaser.GameObjects.Image;

  private pots: Phaser.GameObjects.Image[] = [];
  private cursorBox: Phaser.GameObjects.Rectangle;

  private cropSprites: Phaser.GameObjects.Sprite[] = [];

  private titleText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private helpText: Phaser.GameObjects.Text;

  private selectedSlot = 0;
  private returnMode: UiMode = UiMode.TITLE;
  private pendingCategory: PlanterCropCategory | null = null;

  /**
   * 우선 UI 골격 확인용 임시 데이터.
   * 실제 재배 데이터 시스템을 만들 때 gameData 쪽 저장값으로 교체하면 됨.
   */
  private get slots(): BerryPlanterSlotData[] {
    return globalScene.gameData.berryPlanterSlots as BerryPlanterSlotData[];
  }

  constructor() {
    super(UiMode.BERRY_PLANTER);
  }

  setup(): void {
    const ui = this.getUi();
    const width = globalScene.scaledCanvas.width;
    const height = globalScene.scaledCanvas.height;

    this.rootContainer = globalScene.add.container(0, -height).setName("berry-planter").setVisible(false);

    /*
     * bg_pot 원본은 512x384(4:3).
     * 포켓로그 논리 화면은 320x180이라 비율을 유지한 채
     * 320x240으로 줄이고 위/아래를 조금 잘라서 사용.
     */
    this.background = globalScene.add.image(0, -30, "berry_planter_bg").setOrigin(0).setDisplaySize(width, 240);

    /*
     * pot_space는 화분 하나의 슬롯이라기보다
     * 여러 화분이 올라가는 노란 플랜터 영역으로 사용.
     */
    this.potSpace = globalScene.add.image(160, 107, "berry_planter_pot_space").setOrigin(0.5).setDisplaySize(248, 92);

    this.titleText = addTextObject(
      160,
      8,
      i18next.t("menu:berryPlanterTitle", {
        defaultValue: "나무열매 플랜터",
      }),
      TextStyle.SUMMARY,
    ).setOrigin(0.5, 0);

    for (let i = 0; i < PLANTER_SLOT_COUNT; i++) {
      const pot = globalScene.add.image(SLOT_X[i], POT_Y, "berry_planter_pot").setOrigin(0.5, 1).setScale(0.5);

      const cropSprite = globalScene.add
        .sprite(SLOT_X[i], CROP_BASE_Y, "berry_tree_seed")
        .setOrigin(0.5, 1)
        .setVisible(false);

      this.pots.push(pot);
      this.cropSprites.push(cropSprite);
    }

    this.cursorBox = globalScene.add
      .rectangle(SLOT_X[this.selectedSlot], POT_Y - 24, 46, 54, 0x000000, 0)
      .setStrokeStyle(2, 0xffffff, 1);

    const infoWindow = addWindow(16, 145, 288, 30);

    this.statusText = addTextObject(24, 148, "", TextStyle.WINDOW);

    this.helpText = addTextObject(
      24,
      164,
      i18next.t("menu:berryPlanterHelp", {
        defaultValue: "←→ 화분 선택  Z 확인  X 나가기",
      }),
      TextStyle.WINDOW,
    );

    this.rootContainer.add([
      this.background,
      this.potSpace,
      this.titleText,
      ...this.pots,
      ...this.cropSprites,
      this.cursorBox,
      infoWindow,
      this.statusText,
      this.helpText,
    ]);

    ui.add(this.rootContainer);
  }

  show(args: any[]): boolean {
    super.show(args);

    const config = args?.[0] as { returnMode?: UiMode } | undefined;
    this.returnMode = config?.returnMode ?? UiMode.MENU;

    this.selectedSlot = 0;
    this.pendingCategory = null;
    this.getUi().bringToTop(this.rootContainer);
    this.rootContainer.setVisible(true);

    this.updateGrowthStageFromRemainingWaves();
    this.refresh();

    return true;
  }

  clear(): void {
    super.clear();
    this.rootContainer.setVisible(false);
  }

  processInput(button: Button): boolean {
    switch (button) {
      case Button.LEFT:
        return this.moveCursor(-1);

      case Button.RIGHT:
        return this.moveCursor(1);

      case Button.ACTION:
      case Button.SUBMIT:
        this.getUi().playSelect();
        this.handleSelectedPot();
        return true;

      case Button.CANCEL:
        this.getUi().playSelect();
        this.getUi().setMode(this.returnMode);
        return true;

      default:
        return false;
    }
  }

  setCursor(cursor: number): boolean {
    const next = Math.max(0, Math.min(PLANTER_SLOT_COUNT - 1, cursor));

    if (next === this.selectedSlot) {
      return false;
    }

    this.selectedSlot = next;
    this.refreshCursor();
    this.refreshStatus();
    return true;
  }

  private moveCursor(delta: number): boolean {
    const next = (this.selectedSlot + delta + PLANTER_SLOT_COUNT) % PLANTER_SLOT_COUNT;

    this.selectedSlot = next;
    this.getUi().playSelect();
    this.refreshCursor();
    this.refreshStatus();

    return true;
  }

  private refresh(): void {
    this.refreshPots();
    this.refreshCursor();
    this.refreshStatus();
  }

  private refreshPots(): void {
    for (let i = 0; i < this.pots.length; i++) {
      const slot = this.slots[i];
      const cropSprite = this.cropSprites[i];

      this.pots[i].setAlpha(slot.state === PlanterState.EMPTY ? 0.9 : 1);

      if (slot.state === PlanterState.EMPTY || !slot.cropId) {
        cropSprite.stop();
        cropSprite.setVisible(false);
        continue;
      }

      const stage = slot.growthStage ?? 0;

      // 씨앗 도트만 화분 중심에서 조금 왼쪽으로 보정.
      const xOffset =
        stage === 0
          ? -4 // 씨앗
          : -6; // 새싹 이후

      cropSprite.setPosition(SLOT_X[i] + xOffset, CROP_BASE_Y);

      if (slot.category === PlanterCropCategory.BERRY) {
        this.showBerryGrowthSprite(cropSprite, slot);
      } else if (slot.category === PlanterCropCategory.APRICORN && stage >= 1) {
        this.showApricornGrowthSprite(cropSprite, slot, stage);
      } else {
        /*
         * 규토리 0단계는 공용 씨앗 애니메이션 사용.
         */
        this.showAtlasAnimation(cropSprite, "berry_tree_seed");
      }
    }
  }

  /**
   * TexturePacker JSON atlas의 frame_N... 프레임을
   * 순서대로 재생합니다.
   */
  private showAtlasAnimation(sprite: Phaser.GameObjects.Sprite, textureKey: string): void {
    if (!globalScene.textures.exists(textureKey)) {
      sprite.stop();
      sprite.setVisible(false);
      return;
    }

    const texture = globalScene.textures.get(textureKey);

    const frameNames = texture
      .getFrameNames()
      .filter(name => /^frame_\d+/i.test(String(name)))
      .sort((a, b) => {
        const aIndex = Number(String(a).match(/frame_(\d+)/i)?.[1] ?? 0);
        const bIndex = Number(String(b).match(/frame_(\d+)/i)?.[1] ?? 0);

        return aIndex - bIndex;
      });

    /*
     * TexturePacker atlas가 아닌 단일 이미지라면
     * 기존처럼 정적 이미지로 표시합니다.
     */
    if (frameNames.length === 0) {
      sprite.stop();
      sprite.setTexture(textureKey).setVisible(true);
      return;
    }

    const animKey = `${textureKey}_anim`;

    if (!globalScene.anims.exists(animKey)) {
      globalScene.anims.create({
        key: animKey,
        frames: frameNames.map(frame => ({
          key: textureKey,
          frame,
        })),
        // frame_*_delay-0.5s 기준: 초당 2프레임
        frameRate: 2,
        repeat: -1,
      });
    }

    sprite.setVisible(true).play(animKey, true);
  }

  private showBerryGrowthSprite(sprite: Phaser.GameObjects.Sprite, slot: BerryPlanterSlotData): void {
    const textureKey = this.getGrowthTextureKey(slot);

    this.showAtlasAnimation(sprite, textureKey);
  }

  /**
   * 규토리 스프라이트시트:
   * 128x256 = 32x64 프레임 4열 x 4행.
   *
   * stage 1 -> frames 0~3
   * stage 2 -> frames 4~7
   * stage 3 -> frames 8~11
   * stage 4 -> frames 12~15
   */
  private showApricornGrowthSprite(sprite: Phaser.GameObjects.Sprite, slot: BerryPlanterSlotData, stage: number): void {
    if (!slot.cropId) {
      sprite.setVisible(false);
      return;
    }

    const [, enumKey] = slot.cropId.split(":");

    if (!enumKey) {
      sprite.setVisible(false);
      return;
    }

    const apricornKey = enumKey.toLowerCase();
    const textureKey = `apricorn_tree_${apricornKey}`;
    const animKey = `${textureKey}_stage_${stage}`;

    if (!globalScene.textures.exists(textureKey)) {
      // 아직 도트를 넣지 않은 규토리는 공용 새싹 애니메이션으로 임시 표시.
      this.showAtlasAnimation(sprite, "berry_tree_sprout");
      return;
    }

    if (!globalScene.anims.exists(animKey)) {
      const startFrame = (stage - 1) * 4;
      const endFrame = startFrame + 3;

      globalScene.anims.create({
        key: animKey,
        frames: globalScene.anims.generateFrameNumbers(textureKey, {
          start: startFrame,
          end: endFrame,
        }),
        frameRate: 4,
        repeat: -1,
      });
    }

    sprite.setVisible(true).play(animKey, true);
  }

  private getGrowthTextureKey(slot: BerryPlanterSlotData): string {
    const stage = slot.growthStage ?? 0;

    // 규토리는 나중에 별도 그래픽 연결
    if (slot.category !== PlanterCropCategory.BERRY || !slot.cropId) {
      return "berry_tree_seed";
    }

    switch (stage) {
      // 심은 직후는 전 열매 공용
      case 0:
        return "berry_tree_seed";

      // 싹도 전 열매 공용
      case 1:
        return "berry_tree_sprout";
    }

    // berry:AGUAV → aguav
    // berry:ASPEAR → aspear
    // berry:APICOT → apicot
    const [, enumKey] = slot.cropId.split(":");

    if (!enumKey) {
      return "berry_tree_sprout";
    }

    const berryKey = enumKey.toLowerCase();

    switch (stage) {
      case 2:
        return `berry_tree_${berryKey}_taller`;

      case 3:
        return `berry_tree_${berryKey}_bloom`;

      case 4:
      default:
        return `berry_tree_${berryKey}_berry`;
    }
  }

  /**
   * growthWaves는 BerryPlanterLapsePhase에서 매 웨이브 1씩 감소합니다.
   * 플랜터 UI는 남은 웨이브를 보고 표시할 성장 단계만 맞춥니다.
   *
   * 20~16 : 씨앗
   * 15~11 : 새싹
   * 10~6  : 어린 나무
   * 5~1   : 꽃
   * 0     : 열매 / 수확 가능
   */
  private updateGrowthStageFromRemainingWaves(): void {
    let changed = false;

    for (const slot of this.slots) {
      if (slot.state === PlanterState.EMPTY) {
        continue;
      }

      // 기존 세이브 호환:
      // 심어져 있는데 growthWaves가 없으면 20으로 시작.
      if (slot.growthWaves == null) {
        slot.growthWaves = 20;
        changed = true;
      }

      const remaining = Math.max(0, slot.growthWaves);

      let nextStage = 0;

      if (remaining <= 0) {
        nextStage = 4;
      } else if (remaining <= 5) {
        nextStage = 3;
      } else if (remaining <= 10) {
        nextStage = 2;
      } else if (remaining <= 15) {
        nextStage = 1;
      }

      if (slot.growthStage !== nextStage) {
        slot.growthStage = nextStage;
        changed = true;
      }

      const nextState =
        nextStage >= 4 ? PlanterState.READY : nextStage > 0 ? PlanterState.GROWING : PlanterState.PLANTED;

      if (slot.state !== nextState) {
        slot.state = nextState;
        changed = true;
      }
    }

    if (changed) {
      void globalScene.gameData.saveSystem();
    }
  }

  private growCrop(slotIndex: number): void {
    const slot = this.slots[slotIndex];

    if (slot.state === PlanterState.EMPTY || slot.growthWaves == null) {
      return;
    }

    // 테스트용: 한 번 호출할 때 5웨이브 진행한 것처럼 처리
    slot.growthWaves = Math.max(0, slot.growthWaves - 5);

    this.updateGrowthStageFromRemainingWaves();
    this.refresh();

    void globalScene.gameData.saveSystem();
  }

  private refreshCursor(): void {
    this.cursorBox.setPosition(SLOT_X[this.selectedSlot], POT_Y - 24);
  }

  private refreshStatus(): void {
    const slot = this.slots[this.selectedSlot];

    const stateName = (() => {
      switch (slot.state) {
        case PlanterState.EMPTY:
          return i18next.t("menu:berryPlanterStateEmpty", {
            defaultValue: "비어 있음",
          });

        case PlanterState.PLANTED:
          return i18next.t("menu:berryPlanterStatePlanted", {
            defaultValue: "심어짐",
          });

        case PlanterState.GROWING:
          return i18next.t("menu:berryPlanterStateGrowing", {
            defaultValue: "성장 중",
          });

        case PlanterState.READY:
          return i18next.t("menu:berryPlanterStateReady", {
            defaultValue: "수확 가능",
          });
      }
    })();

    const cropName = this.getCropDisplayName(slot);

    this.statusText.setText(
      cropName
        ? i18next.t("menu:berryPlanterSlotStatusWithCrop", {
            defaultValue: "{{slot}}번 화분 · {{state}} · {{crop}}",
            slot: this.selectedSlot + 1,
            state: stateName,
            crop: cropName,
          })
        : i18next.t("menu:berryPlanterSlotStatus", {
            defaultValue: "{{slot}}번 화분 · {{state}}",
            slot: this.selectedSlot + 1,
            state: stateName,
          }),
    );
  }

  private handleSelectedPot(): void {
    const slot = this.slots[this.selectedSlot];

    switch (slot.state) {
      case PlanterState.EMPTY:
        this.openPlantCategorySelect();
        break;

      case PlanterState.PLANTED:
      case PlanterState.GROWING:
        /*
         * TODO:
         * 물주기 / 성장 정보 / 비료 기능 연결.
         */
        this.statusText.setText(
          i18next.t("menu:berryPlanterGrowingTodo", {
            defaultValue: "현재 작물이 자라고 있습니다.",
          }),
        );
        break;

      case PlanterState.READY:
        this.harvestCrop(this.selectedSlot);
        break;
    }
  }

  private harvestCrop(slotIndex: number): void {
    const slot = this.slots[slotIndex];

    if (slot.state !== PlanterState.READY || !slot.cropId || !slot.category) {
      return;
    }

    const [, enumKey] = slot.cropId.split(":");

    if (!enumKey) {
      return;
    }

    const amount = 3;
    let storageId: string | null = null;

    if (slot.category === PlanterCropCategory.BERRY) {
      const berryType = BerryType[enumKey as keyof typeof BerryType];

      if (typeof berryType !== "number") {
        return;
      }

      storageId = `BERRY_${berryType}`;
    } else {
      const apricornType = ApricornType[enumKey as keyof typeof ApricornType];

      if (typeof apricornType !== "number") {
        return;
      }

      storageId = `APRICORN_${apricornType}`;
    }

    const cropName = this.getCropDisplayName(slot) ?? enumKey;

    const stored = globalScene.gameData.addToStorage(storageId, amount);

    if (!stored) {
      this.statusText.setText(`${cropName} 수확물의 창고 저장에 실패했습니다.`);
      this.getUi().playError();
      return;
    }

    slot.state = PlanterState.EMPTY;
    slot.category = undefined;
    slot.cropId = undefined;
    slot.growthStage = 0;
    slot.growthWaves = undefined;

    this.refresh();

    this.statusText.setText(`${cropName} ${amount}개를 수확해 창고로 보냈습니다!`);

    void globalScene.gameData.saveSystem();
  }

  /**
   * 빈 화분에서 Z를 눌렀을 때 나무열매 / 규토리 종류를 먼저 고릅니다.
   * 실제 세부 작물 선택은 다음 단계에서 연결합니다.
   */
  private openPlantCategorySelect(): void {
    const slotNumber = this.selectedSlot + 1;

    this.statusText.setText(
      i18next.t("menu:berryPlanterChooseCategory", {
        defaultValue: "{{slot}}번 화분에 무엇을 심을까요?",
        slot: slotNumber,
      }),
    );

    this.getUi().setOverlayMode(UiMode.OPTION_SELECT, {
      options: [
        {
          label: i18next.t("menu:berryPlanterBerryCategory", {
            defaultValue: "나무열매",
          }),
          handler: () => {
            this.pendingCategory = PlanterCropCategory.BERRY;

            // 현재 카테고리 선택창이 자동으로 닫힌 뒤 나무열매 목록을 엽니다.
            globalScene.time.delayedCall(10, () => {
              this.openBerrySelect();
            });

            return true;
          },
        },
        {
          label: i18next.t("menu:berryPlanterApricornCategory", {
            defaultValue: "규토리",
          }),
          handler: () => {
            this.pendingCategory = PlanterCropCategory.APRICORN;

            // 현재 카테고리 선택창이 자동으로 닫힌 뒤 규토리 목록을 엽니다.
            globalScene.time.delayedCall(10, () => {
              this.openApricornSelect();
            });

            return true;
          },
        },
        {
          label: i18next.t("menu:cancel", {
            defaultValue: "취소",
          }),
          handler: () => {
            this.pendingCategory = null;
            this.refreshStatus();
            return true;
          },
        },
      ],
      maxOptions: 3,
      xOffset: 8,
      yOffset: 24,
    });
  }

  /**
   * 실제 작물 선택 UI를 붙인 뒤 사용할 심기 공통 처리.
   * 아직은 호출하지 않습니다.
   */
  private plantCrop(cropId: string, category: PlanterCropCategory): void {
    const slot = this.slots[this.selectedSlot];

    slot.cropId = cropId;
    slot.category = category;
    slot.state = PlanterState.PLANTED;
    slot.growthStage = 0;

    // 완전히 성장할 때까지 20웨이브
    slot.growthWaves = 20;

    this.pendingCategory = null;
    this.refresh();

    void globalScene.gameData.saveSystem();
  }

  /**
   * 나무열매 목록. 종류가 많으므로 페이지당 7개로 나눕니다.
   */
  private openBerrySelect(page = 0): void {
    const berryTypes = getEnumValues(BerryType);
    const pageSize = 7;
    const maxPage = Math.max(0, Math.ceil(berryTypes.length / pageSize) - 1);
    const safePage = Math.max(0, Math.min(maxPage, page));
    const pageBerries = berryTypes.slice(safePage * pageSize, safePage * pageSize + pageSize);

    const options: any[] = pageBerries.map(berryType => ({
      label: getBerryName(berryType),
      handler: () => {
        const cropId = `berry:${BerryType[berryType]}`;

        this.plantCrop(cropId, PlanterCropCategory.BERRY);

        return true;
      },
    }));

    if (safePage > 0) {
      options.push({
        label: i18next.t("menu:previousPage", {
          defaultValue: "← 이전 페이지",
        }),
        handler: () => {
          globalScene.time.delayedCall(10, () => {
            this.openBerrySelect(safePage - 1);
          });
          return true;
        },
      });
    }

    if (safePage < maxPage) {
      options.push({
        label: i18next.t("menu:nextPage", {
          defaultValue: "다음 페이지 →",
        }),
        handler: () => {
          globalScene.time.delayedCall(10, () => {
            this.openBerrySelect(safePage + 1);
          });
          return true;
        },
      });
    }

    options.push({
      label: i18next.t("menu:cancel", {
        defaultValue: "취소",
      }),
      handler: () => {
        this.pendingCategory = null;
        this.refreshStatus();
        return true;
      },
    });

    this.statusText.setText(
      i18next.t("menu:berryPlanterChooseBerry", {
        defaultValue: "심을 나무열매를 선택하세요. ({{page}}/{{maxPage}})",
        page: safePage + 1,
        maxPage: maxPage + 1,
      }),
    );

    this.getUi().setOverlayMode(UiMode.OPTION_SELECT, {
      options,
      maxOptions: 10,
      xOffset: 8,
      yOffset: 8,
    });
  }

  /**
   * 규토리는 7색 전부 한 화면에 표시합니다.
   */
  private openApricornSelect(): void {
    const apricornTypes = getEnumValues(ApricornType);

    const options: any[] = apricornTypes.map(apricornType => ({
      label: getApricornName(apricornType),
      handler: () => {
        const cropId = `apricorn:${ApricornType[apricornType]}`;

        this.plantCrop(cropId, PlanterCropCategory.APRICORN);

        return true;
      },
    }));

    options.push({
      label: i18next.t("menu:cancel", {
        defaultValue: "취소",
      }),
      handler: () => {
        this.pendingCategory = null;
        this.refreshStatus();
        return true;
      },
    });

    this.statusText.setText(
      i18next.t("menu:berryPlanterChooseApricorn", {
        defaultValue: "심을 규토리를 선택하세요.",
      }),
    );

    this.getUi().setOverlayMode(UiMode.OPTION_SELECT, {
      options,
      maxOptions: 8,
      xOffset: 8,
      yOffset: 16,
    });
  }

  /**
   * 화분 상태창에 현재 심어진 작물 이름을 표시합니다.
   */
  private getCropDisplayName(slot: BerryPlanterSlotData): string | null {
    if (!slot.cropId || !slot.category) {
      return null;
    }

    const [, enumKey] = slot.cropId.split(":");

    if (!enumKey) {
      return null;
    }

    if (slot.category === PlanterCropCategory.BERRY) {
      const berryType = BerryType[enumKey as keyof typeof BerryType];

      return typeof berryType === "number" ? getBerryName(berryType) : enumKey;
    }

    const apricornType = ApricornType[enumKey as keyof typeof ApricornType];

    return typeof apricornType === "number" ? getApricornName(apricornType) : enumKey;
  }
}
