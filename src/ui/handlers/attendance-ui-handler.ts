import { globalScene } from "#app/global-scene";
import { modifierTypes } from "#data/data-lists";
import { Button } from "#enums/buttons";
import { TextStyle } from "#enums/text-style";
import { UiMode } from "#enums/ui-mode";
import { MessageUiHandler } from "#ui/message-ui-handler";
import { addTextObject } from "#ui/text";
import { addWindow } from "#ui/ui-theme";
import { getDailyResetDate } from "#utils/date-utils";

// 타입 정의
type AttendanceReward =
  | {
      type: "ROGUE_POINTS";
      amount: number;
    }
  | {
      type: "MODIFIER";
      modifierKey: keyof typeof modifierTypes;
      amount: number;
      delivery: "DIRECT" | "STORAGE";
    };

const ATTENDANCE_REWARDS: AttendanceReward[] = [
  // 1~7일
  { type: "ROGUE_POINTS", amount: 100 },
  { type: "ROGUE_POINTS", amount: 150 },
  {
    type: "MODIFIER",
    modifierKey: "VOUCHER",
    amount: 1,
    delivery: "DIRECT",
  },
  { type: "ROGUE_POINTS", amount: 200 },
  {
    type: "MODIFIER",
    modifierKey: "WIDE_LENS",
    amount: 1,
    delivery: "STORAGE",
  },
  { type: "ROGUE_POINTS", amount: 250 },
  {
    type: "MODIFIER",
    modifierKey: "LOCK_CAPSULE",
    amount: 1,
    delivery: "DIRECT",
  },

  // 8~14일
  { type: "ROGUE_POINTS", amount: 300 },
  {
    type: "MODIFIER",
    modifierKey: "GRIP_CLAW",
    amount: 1,
    delivery: "STORAGE",
  },
  { type: "ROGUE_POINTS", amount: 350 },
  {
    type: "MODIFIER",
    modifierKey: "VOUCHER_PLUS",
    amount: 1,
    delivery: "DIRECT",
  },
  { type: "ROGUE_POINTS", amount: 400 },
  {
    type: "MODIFIER",
    modifierKey: "ABILITY_SHIELD",
    amount: 1,
    delivery: "STORAGE",
  },
  {
    type: "MODIFIER",
    modifierKey: "COIN_CASE",
    amount: 1,
    delivery: "DIRECT",
  },

  // 15~21일
  { type: "ROGUE_POINTS", amount: 500 },
  {
    type: "MODIFIER",
    modifierKey: "HEALING_CHARM",
    amount: 1,
    delivery: "DIRECT",
  },
  { type: "ROGUE_POINTS", amount: 550 },
  {
    type: "MODIFIER",
    modifierKey: "VOUCHER",
    amount: 3,
    delivery: "DIRECT",
  },
  { type: "ROGUE_POINTS", amount: 600 },
  {
    type: "MODIFIER",
    modifierKey: "BERRY_POUCH",
    amount: 1,
    delivery: "DIRECT",
  },
  {
    type: "MODIFIER",
    modifierKey: "VOUCHER_PREMIUM",
    amount: 1,
    delivery: "DIRECT",
  },

  // 22~28일
  { type: "ROGUE_POINTS", amount: 700 },
  {
    type: "MODIFIER",
    modifierKey: "FOCUS_BAND",
    amount: 1,
    delivery: "STORAGE",
  },
  { type: "ROGUE_POINTS", amount: 750 },
  {
    type: "MODIFIER",
    modifierKey: "MULTI_LENS",
    amount: 1,
    delivery: "STORAGE",
  },
  { type: "ROGUE_POINTS", amount: 800 },
  {
    type: "MODIFIER",
    modifierKey: "STRANGE_BOX",
    amount: 1,
    delivery: "DIRECT",
  },
  {
    type: "MODIFIER",
    modifierKey: "VOUCHER_PLUS",
    amount: 2,
    delivery: "DIRECT",
  },

  // 29~31일
  { type: "ROGUE_POINTS", amount: 1000 },
  {
    type: "MODIFIER",
    modifierKey: "VOUCHER_PREMIUM",
    amount: 2,
    delivery: "DIRECT",
  },
  {
    type: "MODIFIER",
    modifierKey: "VOUCHER_GOLDEN",
    amount: 1,
    delivery: "DIRECT",
  },
];

export class AttendanceUiHandler extends MessageUiHandler {
  private readonly cellWidth = 47;
  private readonly cellHeight = 20;

  private rootContainer: Phaser.GameObjects.Container;
  private titleText: Phaser.GameObjects.Text;
  private infoText: Phaser.GameObjects.Text;
  private rewardContainers: Phaser.GameObjects.Container[] = [];

  private rewardWindows: Phaser.GameObjects.NineSlice[] = [];
  private rewardDayTexts: Phaser.GameObjects.Text[] = [];
  private rewardIcons: Phaser.GameObjects.Sprite[] = [];
  private rewardNameTexts: Phaser.GameObjects.Text[] = [];
  private rewardStatusTexts: Phaser.GameObjects.Text[] = [];

  private helpText: Phaser.GameObjects.Text;

  constructor() {
    super(UiMode.ATTENDANCE);
  }

  setup(): void {
    const ui = this.getUi();
    const height = globalScene.scaledCanvas.height;

    this.rootContainer = globalScene.add.container(0, -height).setVisible(false);

    ui.add(this.rootContainer);

    const mainWindow = addWindow(4, 4, 312, 168);
    const helpWindow = addWindow(4, 172, 312, 16);

    this.titleText = addTextObject(160, 12, "출석체크", TextStyle.SUMMARY).setOrigin(0.5, 0);

    this.infoText = addTextObject(12, 28, "", TextStyle.WINDOW);

    this.helpText = addTextObject(12, 175, "Z 수령  X 닫기", TextStyle.WINDOW);

    // 반드시 출석 UI 컨테이너에 추가
    this.rootContainer.add([mainWindow, helpWindow, this.titleText, this.infoText, this.helpText]);

    const calendarStartX = 12;
    const calendarStartY = 42;

    const columnGap = 2;
    const rowGap = 1;

    const columns = 6;

    for (let i = 0; i < 31; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);

      const x = calendarStartX + col * (this.cellWidth + columnGap);

      const y = calendarStartY + row * (this.cellHeight + rowGap);

      const container = globalScene.add.container(x, y);

      const cellWindow = addWindow(0, 0, this.cellWidth, this.cellHeight);

      const dayText = addTextObject(3, 1, `${i + 1}`, TextStyle.WINDOW);

      const icon = globalScene.add.image(25, 11, "items").setScale(0.32).setVisible(false);

      const rewardText = addTextObject(this.cellWidth - 3, 10, "", TextStyle.WINDOW).setOrigin(1, 0);

      const statusText = addTextObject(this.cellWidth - 3, 2, "", TextStyle.WINDOW).setOrigin(1, 0);

      container.add([cellWindow, dayText, icon, rewardText, statusText]);

      this.rewardContainers.push(container);
      this.rewardWindows.push(cellWindow);
      this.rewardDayTexts.push(dayText);
      this.rewardIcons.push(icon);
      this.rewardNameTexts.push(rewardText);
      this.rewardStatusTexts.push(statusText);

      this.rootContainer.add(container);
    }
  }

  show(args: any[]): boolean {
    super.show(args);

    this.rootContainer.setVisible(true);
    this.getUi().bringToTop(this.rootContainer);
    this.refresh();

    return true;
  }

  clear(): void {
    this.rootContainer.setVisible(false);
    super.clear();
  }

  processInput(button: Button): boolean {
    switch (button) {
      case Button.ACTION:
      case Button.SUBMIT:
        this.claimAttendance();
        return true;

      case Button.CANCEL:
        this.rootContainer.setVisible(false);
        this.getUi().revertMode();
        return true;
    }

    return false;
  }

  private refresh(): void {
    const gameData = globalScene.gameData;
    const today = getDailyResetDate();
    const claimedToday = gameData.lastAttendanceDate === today;

    const attendanceCount = gameData.attendanceCount ?? 0;

    const currentCycleDay = attendanceCount > 0 ? ((attendanceCount - 1) % 31) + 1 : 0;

    const nextCycleDay = (attendanceCount % 31) + 1;

    this.infoText.setText(
      claimedToday
        ? `오늘 출석 완료 / 누적 출석 ${attendanceCount}일`
        : `오늘 출석 가능 / 다음 보상 ${nextCycleDay}일차`,
    );

    for (let i = 0; i < 31; i++) {
      const day = i + 1;

      const container = this.rewardContainers[i];
      const cellWindow = this.rewardWindows[i];
      const dayText = this.rewardDayTexts[i];
      const icon = this.rewardIcons[i];
      const rewardText = this.rewardNameTexts[i];
      const statusText = this.rewardStatusTexts[i];

      if (!container || !cellWindow || !dayText || !icon || !rewardText || !statusText) {
        console.warn("[ATTENDANCE_UI] missing view", {
          index: i,
          container,
          cellWindow,
          dayText,
          icon,
          rewardText,
          statusText,
        });
        continue;
      }

      const isClaimed = currentCycleDay > 0 && day <= currentCycleDay;

      const isCurrent = claimedToday ? day === currentCycleDay : day === nextCycleDay;

      dayText.setText(`${day}`);

      // 여기부터 보상 표시
      const reward = ATTENDANCE_REWARDS[i];

      if (!reward) {
        icon.setVisible(false);
        rewardText
          .setPosition(this.cellWidth / 2, 7)
          .setOrigin(0.5, 0)
          .setText("-");
      } else if (reward.type === "ROGUE_POINTS") {
        icon.setVisible(false);
        rewardText
          .setPosition(this.cellWidth / 2, 6)
          .setOrigin(0.5, 0)
          .setText(`RP\n${reward.amount}`);
      } else {
        const modifierFactory = modifierTypes[reward.modifierKey];

        const modifierType = typeof modifierFactory === "function" ? modifierFactory() : modifierFactory;

        console.log(modifierType);

        if (!modifierType) {
          console.warn("[ATTENDANCE_REWARD] modifierType not initialized", reward.modifierKey);

          icon.setVisible(false);

          rewardText
            .setPosition(this.cellWidth / 2, 7)
            .setOrigin(0.5, 0)
            .setText("?");

          continue;
        }

        const iconFrame = modifierType.iconImage;
        const itemsTexture = globalScene.textures.get("items");
        const frameExists = Boolean(iconFrame) && itemsTexture.has(iconFrame);

        console.log("[ATTENDANCE_ICON]", {
          modifierKey: reward.modifierKey,
          iconImage: iconFrame,
          frameExists,
        });

        if (!frameExists) {
          console.warn("[ATTENDANCE_ICON_NOT_FOUND]", {
            modifierKey: reward.modifierKey,
            iconFrame,
          });

          icon.setVisible(false);

          rewardText
            .setPosition(this.cellWidth / 2, 7)
            .setOrigin(0.5, 0)
            .setText("?");
        } else {
          icon.setTexture("items").setFrame(iconFrame).setVisible(true);

          rewardText
            .setPosition(this.cellWidth - 3, 10)
            .setOrigin(1, 0)
            .setText(`×${reward.amount}`);
        }
      }

      if (isClaimed) {
        container.setAlpha(0.55);
        cellWindow.setTint(0x707070);
        statusText.setText("✓");
        statusText.setTint(0x66ff99);
      } else if (isCurrent) {
        container.setAlpha(1);
        cellWindow.setTint(0xffd766);
        statusText.setText("▶");
        statusText.setTint(0xffffff);
      } else {
        container.setAlpha(1);
        cellWindow.clearTint();
        statusText.setText("");
        statusText.clearTint();
      }
    }

    this.helpText.setText(claimedToday ? "오늘 보상 수령 완료  X 닫기" : "Z 수령  X 닫기");
  }

  private async grantDirectAttendanceModifier(modifierKey: keyof typeof modifierTypes, amount: number): Promise<void> {
    const modifierFactory = modifierTypes[modifierKey];

    console.log("[DIRECT_MODIFIER_START]", modifierKey, amount);

    if (typeof modifierFactory !== "function") {
      console.error("[ATTENDANCE] Modifier 생성 함수 없음", modifierKey);
      return;
    }

    for (let i = 0; i < amount; i++) {
      const modifierType = modifierFactory();

      if (!modifierType) {
        console.error("[ATTENDANCE] ModifierType 생성 실패", modifierKey);
        continue;
      }

      const modifier = modifierType.newModifier();

      if (!modifier) {
        console.error("[ATTENDANCE] Modifier 생성 실패", modifierKey);
        continue;
      }

      console.log("[DIRECT_MODIFIER_CREATED]", modifierType);
      console.log("[DIRECT_MODIFIER_INSTANCE]", modifier);

      const voucherCountsBefore = {
        ...globalScene.gameData.voucherCounts,
      };

      console.log("[VOUCHER_BEFORE]", voucherCountsBefore);

      globalScene.addModifier(modifier, false, false, true);

      const voucherCountsAfter = {
        ...globalScene.gameData.voucherCounts,
      };

      console.log("[VOUCHER_AFTER]", voucherCountsAfter);

      console.log("[DIRECT_MODIFIER_ADDED]", {
        modifierKey,
        modifier,
        voucherCountsBefore,
        voucherCountsAfter,
      });
    }
  }

  private async claimAttendance(): Promise<void> {
    const gameData = globalScene.gameData;
    const today = getDailyResetDate();

    if (gameData.lastAttendanceDate === today) {
      this.getUi().playError();
      return;
    }

    gameData.attendanceCount = (gameData.attendanceCount ?? 0) + 1;

    gameData.lastAttendanceDate = today;

    const cycleDay = ((gameData.attendanceCount - 1) % 31) + 1;

    const reward = ATTENDANCE_REWARDS[cycleDay - 1];

    console.log("[ATTENDANCE_REWARD]", reward);

    if (!reward) {
      console.error("[ATTENDANCE] 보상 데이터 없음", {
        cycleDay,
      });

      this.getUi().playError();
      return;
    }

    if (reward.type === "ROGUE_POINTS") {
      console.log("[ROGUE_POINTS_REWARD]", reward.amount);

      gameData.addRoguePoints(reward.amount);
    } else if (reward.delivery === "STORAGE") {
      console.log("[STORAGE_REWARD]", reward.modifierKey, reward.amount);

      console.log("[STORAGE_AFTER]", {
        modifierKey: reward.modifierKey,
        storedItem: gameData.storageItems.find(item => item.itemId === reward.modifierKey),
      });

      const existingItem = gameData.storageItems.find(item => item.itemId === reward.modifierKey);

      if (existingItem) {
        existingItem.quantity += reward.amount;
      } else {
        gameData.storageItems.push({
          itemId: reward.modifierKey,
          quantity: reward.amount,
        });
      }
    } else {
      console.log("[DIRECT_REWARD]", reward.modifierKey, reward.amount);

      await this.grantDirectAttendanceModifier(reward.modifierKey, reward.amount);
    }
  }
}
