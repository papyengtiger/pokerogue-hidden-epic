import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { UiMode } from "#enums/ui-mode";
import { MessageUiHandler } from "#ui/message-ui-handler";

/**
 * 로그광산 1차 UI
 *
 * 구현 범위
 * - miningbg 배경 표시
 * - 오른쪽 곡괭이/망치 버튼 클릭
 * - 선택한 도구가 마우스를 따라다님
 * - 광산 영역 안에서만 도구 표시
 * - CANCEL(X/ESC)로 로그센터 복귀
 *
 * 아직 미구현
 * - 암반 내구도/균열
 * - 타격 이펙트
 * - 자원 배치/획득
 * - 붕괴 게이지
 */

type RogueMineTool = "PICKAXE" | "HAMMER";

type MineCell = {
  damage: number;
  startFrame: number;
  sprite?: Phaser.GameObjects.Image;
};

type MineResource = {
  id: string;

  x: number;
  y: number;

  width: number;
  height: number;

  sprite: Phaser.GameObjects.Image;

  revealed: boolean;
  collected: boolean;
};

export interface RogueMineUiArgs {
  /** 광산에서 나갈 때 호출. 지정하지 않으면 로그센터로 돌아감 */
  onExit?: () => void;
}

export class RogueMineUiHandler extends MessageUiHandler {
  private rootContainer!: Phaser.GameObjects.Container;

  private background?: Phaser.GameObjects.Image;
  private toolSprite?: Phaser.GameObjects.Image;

  private pickaxeHitArea?: Phaser.GameObjects.Zone;
  private hammerHitArea?: Phaser.GameObjects.Zone;

  private selectedTool: RogueMineTool = "PICKAXE";
  private uiArgs: RogueMineUiArgs | null = null;

  private pointerMoveHandler?: (pointer: Phaser.Input.Pointer) => void;

  private pickaxeButtonSprite?: Phaser.GameObjects.Image;
  private hammerButtonSprite?: Phaser.GameObjects.Image;

  private readonly hammerIconOffsetX = 1;
  private readonly hammerIconOffsetY = 0;

  private readonly pickaxeIconOffsetX = 1;
  private readonly pickaxeIconOffsetY = 4;

  private mineRoundFinishing = false;

  private readonly mineColumns = 13;
  private readonly mineRows = 10;

  private mineCells: MineCell[][] = [];

  private crackGaugeSprites: Phaser.GameObjects.Image[] = [];

  private mineResources: MineResource[] = [];

  private readonly crackSlotRightX = [418, 370, 322, 274, 226, 178, 130, 82] as const;

  private readonly crackSlotY = 0;

  private readonly crackStageFrames = [1, 2, 3, 4, 5, 6] as const;

  private crackStep = 0;
  private readonly maxCrackDamage = 100;

  private mineTiles: Phaser.GameObjects.Image[][] = [];
  /**
   * 원본 miningbg.png 기준 좌표.
   * 배경 원본은 512x384.
   *
   * 왼쪽 큰 영역 = 채굴 영역
   * 오른쪽 세로 영역 = 도구 선택 UI
   */
  private readonly sourceWidth = 512;
  private readonly sourceHeight = 384;

  private readonly mineArea = {
    x: 0,
    y: 0,
    width: 420,
    height: 384,
  };

  /**
   * miningbg.png의 오른쪽 버튼 위치를 기준으로 한 대략적인 클릭 영역.
   * 실제 이미지 배치가 조금 다르면 이 값만 조절하면 됨.
   */
  private readonly hammerButtonRect = {
    x: 428,
    y: 105,
    width: 76,
    height: 112,
  };

  private readonly pickaxeButtonRect = {
    x: 428,
    y: 242,
    width: 76,
    height: 112,
  };

  private pointerDownHandler?: (pointer: Phaser.Input.Pointer) => void;

  private toolAnimating = false;

  constructor() {
    super(UiMode.ROGUE_MINE);
  }

  setup(): void {
    const ui = this.getUi();
    const sWidth = globalScene.scaledCanvas.width;
    const sHeight = globalScene.scaledCanvas.height;

    this.rootContainer = globalScene.add.container(0, -sHeight).setVisible(false);

    ui.add(this.rootContainer);

    // 배경
    if (globalScene.textures.exists("rogue_mine_bg")) {
      this.background = globalScene.add.image(0, 0, "rogue_mine_bg").setOrigin(0).setDisplaySize(sWidth, sHeight);

      this.rootContainer.add(this.background);
    } else {
      // 에셋이 아직 preload되지 않았을 때 크래시 방지용 임시 배경
      const fallback = globalScene.add.rectangle(0, 0, sWidth, sHeight, 0xb9ac91).setOrigin(0);

      this.rootContainer.add(fallback);
    }

    this.createCrackGauge();
    this.createToolIconSprites();
    this.createToolButtons();
    this.createToolSprite();

    this.pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    };

    this.pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
      this.handlePointerMove(pointer);
    };
  }

  show(args: any[]): boolean {
    super.show(args);

    this.uiArgs = args?.length > 0 ? (args[0] as RogueMineUiArgs) : null;

    this.rootContainer.setVisible(true);
    this.selectedTool = "PICKAXE";

    this.updateToolTexture();
    this.updateToolButtonState();

    this.mineRoundFinishing = false;

    this.clearMineResources();
    this.clearMineCells();

    this.crackStep = 0;
    this.updateCrackGauge();

    this.initializeMineResources();
    this.initializeMineCells();

    this.crackStep = 0;
    this.updateCrackGauge();

    if (this.pointerDownHandler) {
      globalScene.input.on("pointerdown", this.pointerDownHandler, this);
    }

    if (this.pointerMoveHandler) {
      globalScene.input.on("pointermove", this.pointerMoveHandler, this);
    }

    return true;
  }

  clear(): void {
    if (this.pointerMoveHandler) {
      globalScene.input.off("pointermove", this.pointerMoveHandler, this);
    }

    this.toolSprite?.setVisible(false);
    this.rootContainer?.setVisible(false);

    if (this.pointerDownHandler) {
      globalScene.input.off("pointerdown", this.pointerDownHandler, this);
    }

    super.clear();
  }

  processInput(button: Button): boolean {
    switch (button) {
      case Button.CANCEL:
        this.exitMine();
        return true;
    }

    return false;
  }

  private handleMineCollapse(): void {
    this.toolSprite?.setVisible(false);

    this.setNotice?.("벽이 무너질 것 같다!");

    globalScene.time.delayedCall(800, () => {
      this.exitMine();
    });
  }

  private initializeMineCells(): void {
    this.mineCells = [];

    const sourceCellSize = 32;

    for (let y = 0; y < this.mineRows; y++) {
      const row: MineCell[] = [];

      for (let x = 0; x < this.mineColumns; x++) {
        const sourceX = 4 + x * sourceCellSize;

        const sourceY = 62 + y * sourceCellSize;

        const pos = this.sourceRectToUi(sourceX, sourceY, sourceCellSize, sourceCellSize);

        const startFrame = this.getRandomMineStartFrame();

        const sprite = globalScene.add
          .image(pos.x, pos.y, "rogue_mine_tiles", startFrame)
          .setOrigin(0)
          .setDisplaySize(pos.width, pos.height);

        this.rootContainer.add(sprite);

        row.push({
          damage: 0,
          startFrame,
          sprite,
        });
      }

      this.mineCells.push(row);
    }

    if (this.toolSprite) {
      this.rootContainer.bringToTop(this.toolSprite);
    }
  }

  private initializeMineResources(): void {
    this.clearMineResources();

    this.spawnMineResource("COVER_FOSSIL", 3, 3, 2, 2, "rogue_mine_cover_fossil");

    this.spawnMineResource("SAIL_FOSSIL", 8, 5, 2, 2, "rogue_mine_sail_fossil");
  }

  private clearMineResources(): void {
    for (const resource of this.mineResources) {
      resource.sprite.destroy();
    }

    this.mineResources = [];
  }

  private checkMineResources(): void {
    for (const resource of this.mineResources) {
      if (resource.collected) {
        continue;
      }

      let fullyRevealed = true;

      for (let y = resource.y; y < resource.y + resource.height; y++) {
        for (let x = resource.x; x < resource.x + resource.width; x++) {
          const cell = this.mineCells[y]?.[x];

          // 자원을 덮고 있는 흙이 하나라도 남아있음
          if (cell?.sprite) {
            fullyRevealed = false;
            break;
          }
        }

        if (!fullyRevealed) {
          break;
        }
      }

      if (!fullyRevealed) {
        continue;
      }

      this.collectMineResource(resource);
    }
  }

  private spawnMineResource(
    id: string,
    cellX: number,
    cellY: number,
    width: number,
    height: number,
    textureKey: string,
  ): void {
    const sourceCellSize = 32;

    const sourceX = 4 + cellX * sourceCellSize;

    const sourceY = 62 + cellY * sourceCellSize;

    const pos = this.sourceRectToUi(sourceX, sourceY, width * sourceCellSize, height * sourceCellSize);

    const sprite = globalScene.add
      .image(pos.x, pos.y, textureKey)
      .setOrigin(0.5)
      .setDisplaySize(pos.width * 0.9, pos.height * 0.9);

    // 2×2 영역 중앙에 배치
    sprite.setPosition(pos.x + pos.width / 2, pos.y + pos.height / 2);

    this.rootContainer.add(sprite);

    this.mineResources.push({
      id,
      x: cellX,
      y: cellY,
      width,
      height,
      sprite,
      revealed: false,
      collected: false,
    });
  }

  private createCrackGauge(): void {
    this.crackGaugeSprites = [];
  }

  private addCrackDamage(amount: number): void {
    this.crackStep += amount;

    const maxStep = this.crackSlotRightX.length * (this.crackStageFrames.length + 1);

    if (this.crackStep >= maxStep) {
      this.crackStep = maxStep;
      this.updateCrackGauge();

      this.handleMineCaveIn();
      return;
    }

    this.updateCrackGauge();
  }

  private handleMineCaveIn(): void {
    if (this.mineRoundFinishing) {
      return;
    }

    this.mineRoundFinishing = true;

    /*
     * 이미 완전히 발굴된 자원만 회수
     */
    const recoveredResources = this.mineResources.filter(resource => resource.collected);

    for (const resource of recoveredResources) {
      globalScene.gameData.addToStorage(resource.id, 1);
    }

    if (recoveredResources.length > 0) {
      globalScene.gameData.saveSystem();
    }

    console.log("[ROGUE_MINE] CAVE_IN", {
      recovered: recoveredResources.map(r => r.id),
      lost: this.mineResources.filter(r => !r.collected).map(r => r.id),
    });

    /*
     * 마지막 균열 상태를 잠깐 보여줌
     */
    globalScene.time.delayedCall(300, () => {
      this.resetMineRound();
    });
  }

  private updateCrackGauge(): void {
    for (const sprite of this.crackGaugeSprites) {
      sprite.destroy();
    }

    this.crackGaugeSprites = [];

    if (this.crackStep <= 0) {
      return;
    }

    // 중간 6단계 + ^ 완성
    const stagesPerSlot = 7;

    const completedSlots = Math.floor(this.crackStep / stagesPerSlot);

    const currentStage = this.crackStep % stagesPerSlot;

    for (let i = 0; i < this.crackSlotRightX.length; i++) {
      let frame: number | null = null;

      if (i < completedSlots) {
        // 이미 완성된 ^
        frame = 0;
      } else if (i === completedSlots && currentStage > 0) {
        // 지금 자라고 있는 균열
        frame = this.crackStageFrames[currentStage - 1];
      } else {
        break;
      }

      /*
       * 중요:
       * 각 프레임의 오른쪽 끝을 같은 위치에 고정합니다.
       */
      const rightX = this.crackSlotRightX[i];

      const rect = this.sourceRectToUi(rightX - 96, this.crackSlotY, 96, 52);

      const frameRightOffset = frame === 0 ? 48 * (globalScene.scaledCanvas.width / this.sourceWidth) : 0;

      const sprite = globalScene.add
        .image(rect.x + rect.width + frameRightOffset, rect.y, "rogue_mine_cracks", frame)
        .setOrigin(1, 0)
        .setDisplaySize(rect.width, rect.height);

      this.rootContainer.add(sprite);
      this.crackGaugeSprites.push(sprite);
    }

    if (this.toolSprite) {
      this.rootContainer.bringToTop(this.toolSprite);
    }
  }

  private createToolButtons(): void {
    const pickaxe = this.sourceRectToUi(
      this.pickaxeButtonRect.x,
      this.pickaxeButtonRect.y,
      this.pickaxeButtonRect.width,
      this.pickaxeButtonRect.height,
    );

    const hammer = this.sourceRectToUi(
      this.hammerButtonRect.x,
      this.hammerButtonRect.y,
      this.hammerButtonRect.width,
      this.hammerButtonRect.height,
    );

    this.pickaxeHitArea = globalScene.add
      .zone(pickaxe.x + pickaxe.width / 2, pickaxe.y + pickaxe.height / 2, pickaxe.width, pickaxe.height)
      .setInteractive({ useHandCursor: true });

    this.hammerHitArea = globalScene.add
      .zone(hammer.x + hammer.width / 2, hammer.y + hammer.height / 2, hammer.width, hammer.height)
      .setInteractive({ useHandCursor: true });

    this.pickaxeHitArea.on("pointerdown", () => {
      this.selectTool("PICKAXE");
    });

    this.hammerHitArea.on("pointerdown", () => {
      this.selectTool("HAMMER");
    });

    this.rootContainer.add([this.pickaxeHitArea, this.hammerHitArea]);
  }

  private createToolIconSprites(): void {
    if (!globalScene.textures.exists("rogue_mine_tool_icons")) {
      return;
    }

    const hammerRect = this.sourceRectToUi(
      this.hammerButtonRect.x,
      this.hammerButtonRect.y,
      this.hammerButtonRect.width,
      this.hammerButtonRect.height,
    );

    const pickaxeRect = this.sourceRectToUi(
      this.pickaxeButtonRect.x,
      this.pickaxeButtonRect.y,
      this.pickaxeButtonRect.width,
      this.pickaxeButtonRect.height,
    );

    this.hammerButtonSprite = globalScene.add
      .image(
        hammerRect.x + hammerRect.width / 2 + this.hammerIconOffsetX,
        hammerRect.y + hammerRect.height / 2 + this.hammerIconOffsetY,
        "rogue_mine_tool_icons",
        1,
      )
      .setOrigin(0.5)
      .setDisplaySize(hammerRect.width * 0.85, hammerRect.height * 0.87);

    this.pickaxeButtonSprite = globalScene.add
      .image(
        pickaxeRect.x + pickaxeRect.width / 2 + this.pickaxeIconOffsetX,
        pickaxeRect.y + pickaxeRect.height / 2 + this.pickaxeIconOffsetY,
        "rogue_mine_tool_icons",
        0,
      )
      .setOrigin(0.5)
      .setDisplaySize(pickaxeRect.width * 0.86, pickaxeRect.height * 0.86);

    this.rootContainer.add([this.hammerButtonSprite, this.pickaxeButtonSprite]);
  }

  private getMineCellAt(uiX: number, uiY: number): { x: number; y: number } | null {
    const scaleX = globalScene.scaledCanvas.width / this.sourceWidth;

    const scaleY = globalScene.scaledCanvas.height / this.sourceHeight;

    const sourceX = uiX / scaleX;
    const sourceY = uiY / scaleY;

    const mineStartX = 4;
    const mineStartY = 62;
    const cellSize = 32;

    const x = Math.floor((sourceX - mineStartX) / cellSize);

    const y = Math.floor((sourceY - mineStartY) / cellSize);

    if (x < 0 || y < 0 || x >= this.mineColumns || y >= this.mineRows) {
      return null;
    }

    return { x, y };
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.rootContainer.visible) {
      return;
    }

    const uiX = this.pointerToUiX(pointer.x);

    const uiY = this.pointerToUiY(pointer.y);

    if (!this.isInsideMineArea(uiX, uiY)) {
      return;
    }

    const cell = this.getMineCellAt(uiX, uiY);

    if (!cell) {
      return;
    }

    this.playToolHitAnimation();

    const x = cell.x;
    const y = cell.y;

    if (this.selectedTool === "PICKAXE") {
      this.hitMineCell(x, y, 2);

      this.hitMineCell(x - 1, y, 1);
      this.hitMineCell(x + 1, y, 1);
      this.hitMineCell(x, y - 1, 1);
      this.hitMineCell(x, y + 1, 1);

      // 한 번에 한 단계
      this.addCrackDamage(1);

      globalScene.playSound("hit_weak");
    } else {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          this.hitMineCell(x + dx, y + dy, dx === 0 && dy === 0 ? 2 : 1);
        }
      }

      // 망치는 두 단계
      this.addCrackDamage(2);

      globalScene.playSound("hit_strong");
    }
  }

  private hitMineCell(x: number, y: number, damage: number): void {
    const cell = this.mineCells[y]?.[x];

    if (!cell) {
      return;
    }

    cell.damage = Math.min(6, cell.damage + damage);

    this.updateMineCellVisual(x, y, cell);

    // ★ 타일이 파괴될 때마다 자원 노출 상태 검사
    this.checkMineResources();
  }

  private collectMineResource(resource: MineResource): void {
    if (resource.collected) {
      return;
    }

    resource.revealed = true;
    resource.collected = true;

    console.log("[ROGUE_MINE_RESOURCE_FOUND]", resource.id);

    this.checkAllMineResourcesCollected();
  }

  private checkAllMineResourcesCollected(): void {
    if (this.mineRoundFinishing || this.mineResources.length === 0) {
      return;
    }

    const allCollected = this.mineResources.every(resource => resource.collected);

    if (!allCollected) {
      return;
    }

    this.mineRoundFinishing = true;
    this.finishMineRound();
  }

  private finishMineRound(): void {
    for (const resource of this.mineResources) {
      if (!resource.collected) {
        continue;
      }

      globalScene.gameData.addToStorage(resource.id, 1);
    }

    globalScene.gameData.saveSystem();

    console.log(
      "[ROGUE_MINE] ALL RESOURCES SENT TO STORAGE",
      this.mineResources.map(r => r.id),
    );

    globalScene.time.delayedCall(500, () => {
      this.resetMineRound();
    });
  }

  private sendMineResourceToStorage(resource: MineResource): void {
    const added = globalScene.gameData.addToStorage(resource.id, 1);

    if (!added) {
      console.warn("[ROGUE_MINE] 창고 저장 실패", resource.id);
      return;
    }

    console.log("[ROGUE_MINE -> STORAGE]", resource.id);
  }

  private resetMineRound(): void {
    this.clearMineResources();
    this.clearMineCells();

    this.crackStep = 0;
    this.updateCrackGauge();

    // 자원을 먼저 깔고
    this.initializeMineResources();

    // 그 위를 흙으로 덮음
    this.initializeMineCells();

    this.mineRoundFinishing = false;
  }

  private updateMineCellVisual(x: number, y: number, cell: MineCell): void {
    if (!cell.sprite) {
      return;
    }

    const frame = Phaser.Math.Clamp(cell.startFrame - cell.damage, 0, 5);

    cell.sprite.setFrame(frame);

    if (cell.startFrame - cell.damage < 0) {
      cell.sprite.destroy();
      cell.sprite = undefined;
    }
  }

  private getRandomMineStartFrame(): number {
    const roll = Phaser.Math.Between(1, 100);

    if (roll <= 10) {
      return 1;
    }

    if (roll <= 25) {
      return 2;
    }

    if (roll <= 45) {
      return 3;
    }

    if (roll <= 70) {
      return 4;
    }

    return 5;
  }

  private clearMineCells(): void {
    for (const row of this.mineCells) {
      for (const cell of row) {
        cell.sprite?.destroy();
      }
    }

    this.mineCells = [];
  }

  private createMineTiles(): void {
    if (!globalScene.textures.exists("rogue_mine_tiles")) {
      return;
    }

    this.mineTiles = [];

    const columns = 13;
    const rows = 10;

    const startSourceX = 4;
    const startSourceY = 62;

    const sourceCellSize = 32;

    for (let y = 0; y < rows; y++) {
      const row: Phaser.GameObjects.Image[] = [];

      for (let x = 0; x < columns; x++) {
        const sourceX = startSourceX + x * sourceCellSize;

        const sourceY = startSourceY + y * sourceCellSize;

        const pos = this.sourceRectToUi(sourceX, sourceY, sourceCellSize, sourceCellSize);

        // 일단 테스트용으로 0~5 중 랜덤 프레임
        const frame = Phaser.Math.Between(0, 5);

        const tile = globalScene.add
          .image(pos.x, pos.y, "rogue_mine_tiles", frame)
          .setOrigin(0)
          .setDisplaySize(pos.width, pos.height);

        row.push(tile);
        this.rootContainer.add(tile);
      }

      this.mineTiles.push(row);
    }
  }

  private createToolSprite(): void {
    /**
     * tools.png를 spritesheet로 preload했다면
     * frame 0 = 곡괭이, frame 1 = 망치
     * 같은 식으로 사용할 수 있습니다.
     *
     * 아직 spritesheet 등록 전이라면 image 전체를 임시 사용합니다.
     */
    if (globalScene.textures.exists("rogue_mine_tools")) {
      this.toolSprite = globalScene.add.image(0, 0, "rogue_mine_tools").setOrigin(0.5).setVisible(false);

      // 192x192 전체 시트가 그대로 보이는 것을 막기 위한 임시 크기.
      // spritesheet 등록 후에는 setDisplaySize 대신 frame 사용 권장.
      this.toolSprite.setDisplaySize(24, 24);

      this.rootContainer.add(this.toolSprite);
    }
  }

  private selectTool(tool: RogueMineTool): void {
    if (this.selectedTool === tool) {
      return;
    }

    this.selectedTool = tool;

    this.getUi().playSelect();

    this.updateToolTexture();
    this.updateToolButtonState();
  }

  private updateToolTexture(): void {
    if (!this.toolSprite) {
      return;
    }

    const frame = this.selectedTool === "PICKAXE" ? 0 : 2;

    this.toolSprite.setFrame(frame);
  }

  private playToolHitAnimation(): void {
    if (!this.toolSprite || this.toolAnimating) {
      return;
    }

    this.toolAnimating = true;

    const hitFrame = this.selectedTool === "PICKAXE" ? 1 : 3;

    this.toolSprite.setFrame(hitFrame);

    globalScene.time.delayedCall(100, () => {
      this.updateToolTexture();
      this.toolAnimating = false;
    });
  }

  private updateToolButtonState(): void {
    if (!this.pickaxeButtonSprite || !this.hammerButtonSprite) {
      return;
    }

    // 선택된 쪽은 눌린 것처럼 어둡게
    this.pickaxeButtonSprite.setAlpha(this.selectedTool === "PICKAXE" ? 0.55 : 1);

    this.hammerButtonSprite.setAlpha(this.selectedTool === "HAMMER" ? 0.55 : 1);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.rootContainer.visible || !this.toolSprite) {
      return;
    }

    const uiX = this.pointerToUiX(pointer.x);
    const uiY = this.pointerToUiY(pointer.y);

    if (!this.isInsideMineArea(uiX, uiY)) {
      this.toolSprite.setVisible(false);
      return;
    }

    this.toolSprite.setVisible(true).setPosition(uiX, uiY);
  }

  /**
   * 원본 512x384 miningbg 좌표를 현재 scaledCanvas 좌표로 변환
   */
  private sourceRectToUi(
    x: number,
    y: number,
    width: number,
    height: number,
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const sx = globalScene.scaledCanvas.width / this.sourceWidth;

    const sy = globalScene.scaledCanvas.height / this.sourceHeight;

    return {
      x: x * sx,
      y: y * sy,
      width: width * sx,
      height: height * sy,
    };
  }

  private isInsideMineArea(uiX: number, uiY: number): boolean {
    const area = this.sourceRectToUi(this.mineArea.x, this.mineArea.y, this.mineArea.width, this.mineArea.height);

    return uiX >= area.x && uiX < area.x + area.width && uiY >= area.y && uiY < area.y + area.height;
  }

  /**
   * Phaser pointer 좌표는 실제 canvas 픽셀 기준이므로
   * PokeRogue의 scaledCanvas 논리좌표로 환산합니다.
   */
  private pointerToUiX(pointerX: number): number {
    const canvasWidth = globalScene.game.canvas.width || 1;

    return pointerX * (globalScene.scaledCanvas.width / canvasWidth);
  }

  private pointerToUiY(pointerY: number): number {
    const canvasHeight = globalScene.game.canvas.height || 1;

    return pointerY * (globalScene.scaledCanvas.height / canvasHeight);
  }

  private exitMine(): void {
    this.toolSprite?.setVisible(false);

    if (this.uiArgs?.onExit) {
      this.uiArgs.onExit();
      return;
    }

    globalScene.ui.setMode(UiMode.ROGUE_SHOP);
  }
}
