import { globalScene } from "#app/global-scene";
import { Phase } from "#app/phase";
import { TextStyle } from "#enums/text-style";
import { addTextObject } from "#ui/text";
import { addWindow } from "#ui/ui-theme";

export class PracticeResultPhase extends Phase {
  public readonly phaseName = "PracticeResultPhase";

  private container: Phaser.GameObjects.Container | null = null;
  private pageText: Phaser.GameObjects.Text | null = null;
  private footerText: Phaser.GameObjects.Text | null = null;

  private result: any = null;
  private page = 0;
  private canClose = false;
  private closed = false;

  private readonly maxPage = 2;

  start(): void {
    super.start();

    if (!(globalScene.currentBattle as any)?.isPracticeBattle) {
      this.end();
      return;
    }

    this.result = (globalScene as any).practiceTurnResult;

if (!this.result) {
  this.end();
  return;
}

// ✅ 연습모드 이론 경험치
if ((globalScene.currentBattle as any)?.isPracticeBattle) {
  if ((this.result.expGained ?? 0) <= 0) {
    const theoreticalExp =
  (globalScene.currentBattle as any)
    ?.practiceDummy
    ?.getExpValue?.() ?? 1000;

    this.result.expGained += theoreticalExp;

    this.result.expFactors ??= [];

    this.result.expFactors.push(
      `이론 경험치 +${theoreticalExp}`,
    );

    console.log(
      "[PRACTICE_THEORY_EXP]",
      theoreticalExp,
    );
  }
}

    const sWidth = globalScene.scaledCanvas.width;
    const sHeight = globalScene.scaledCanvas.height;

    const windowW = 240;
    const windowH = 160;

    const x = Math.floor((sWidth - windowW) / 2);
    const y = Math.floor((sHeight - windowH) / 2);

    this.container = globalScene.add.container(0, 0);
    this.container.setName("practice-result-window");
    this.container.setDepth(9999);

    const window = addWindow(x, y, windowW, windowH);
    this.container.add(window);

    const title = addTextObject(
      x + 12,
      y + 10,
      "실험 결과",
      TextStyle.SUMMARY,
    );
    this.container.add(title);

    this.pageText = addTextObject(
  x + 14,
  y + 34,
  "",
  TextStyle.WINDOW,
  { fontSize: "28px", lineSpacing: 3 },
);
    this.container.add(this.pageText);

    this.footerText = addTextObject(
  x + 14,
  y + windowH - 18,
  "",
  TextStyle.WINDOW,
  { fontSize: "24px" },
);
    this.container.add(this.footerText);

    globalScene.uiContainer.add(this.container);

    this.refreshPage();

    globalScene.time.delayedCall(200, () => {
      this.canClose = true;
      this.bindKeys();
    });
  }

  private refreshPage(): void {
    if (!this.pageText || !this.footerText || !this.result) {
      return;
    }

    const r = this.result;

    const unique = (arr?: string[]) => [...new Set(arr ?? [])];

    const short = (arr?: string[], max = 3): string => {
      const list = unique(arr);

      if (!list.length) {
        return "-";
      }

      if (list.length <= max) {
        return list.join(" / ");
      }

      return `${list.slice(0, max).join(" / ")} 외 ${list.length - max}개`;
    };

    const detailGrid = (
  title: string,
  arr?: string[],
  rowsPerCol = 12,
  maxCols = 2,
): string[] => {
  const list = unique(arr);

  if (!list.length) {
    return [`${title}: -`];
  }

  const maxItems = rowsPerCol * maxCols;
  const shown = list.slice(0, maxItems);
  const hidden = list.length - shown.length;

  const cols: string[][] = [];

  for (let c = 0; c < maxCols; c++) {
    cols[c] = shown.slice(c * rowsPerCol, (c + 1) * rowsPerCol);
  }

  const lines = [`${title}:`];

  for (let r = 0; r < rowsPerCol; r++) {
    const left = cols[0]?.[r] ? `- ${cols[0][r]}` : "";
    const right = cols[1]?.[r] ? `- ${cols[1][r]}` : "";

    lines.push(`${left.padEnd(22, " ")}${right}`);
  }

  if (hidden > 0) {
    lines.push(`외 ${hidden}개`);
  }

  return lines;
};

    let lines: string[] = [];

    if (this.page === 0) {
      lines = [
        "[요약]",
        "",
        "[아군]",
        `준 대미지: ${r.damageDealt ?? 0}`,
        `명중: ${r.playerHitCount ?? 0}`,
        `빗나감: ${r.playerMissCount ?? 0}`,
        `급소: ${r.playerCriticalCount ?? 0}`,
        `대미지요인: ${short(r.playerDamageFactors)}`,
        "",
        "[상대]",
        `준 대미지: ${r.damageTaken ?? 0}`,
        `명중: ${r.enemyHitCount ?? 0}`,
        `빗나감: ${r.enemyMissCount ?? 0}`,
        `급소: ${r.enemyCriticalCount ?? 0}`,
        `대미지요인: ${short(r.enemyDamageFactors)}`,
        "",
        "[보상]",
        `경험치: ${r.expGained ?? 0}`,
        `골드: ${r.moneyGained ?? 0}`,
        `RP: ${r.roguePointsGained ?? 0}`,
      ];
    }

    if (this.page === 1) {
  lines = [
    "[아군 상세]",
    "",
    ...detailGrid("대미지요인", r.playerDamageFactors, 12, 2),
    "",
    ...detailGrid("명중요인", r.playerAccuracyFactors, 4, 2),
    "",
    ...detailGrid("급소요인", r.playerCritFactors, 4, 2),
  ];
}

   if (this.page === 2) {
  lines = [
    "[상대 상세]",
    "",
    ...detailGrid("대미지요인", r.enemyDamageFactors, 12, 2),
    "",
    ...detailGrid("명중요인", r.enemyAccuracyFactors, 4, 2),
    "",
    ...detailGrid("급소요인", r.enemyCritFactors, 4, 2),
  ];
}

    this.pageText.setText(lines.join("\n"));
    this.footerText.setText(`←/→ 페이지 ${this.page + 1}/${this.maxPage + 1}   Z/X 닫기`);
  }

  private bindKeys(): void {
    const close = () => this.close();

    globalScene.input.keyboard?.on("keydown-LEFT", this.prevPage, this);
    globalScene.input.keyboard?.on("keydown-RIGHT", this.nextPage, this);

    globalScene.input.keyboard?.once("keydown-Z", close);
    globalScene.input.keyboard?.once("keydown-X", close);
    globalScene.input.keyboard?.once("keydown-ENTER", close);
    globalScene.input.keyboard?.once("keydown-SPACE", close);
  }

  private unbindKeys(): void {
    globalScene.input.keyboard?.off("keydown-LEFT", this.prevPage, this);
    globalScene.input.keyboard?.off("keydown-RIGHT", this.nextPage, this);
  }

  private prevPage(): void {
    if (!this.canClose || this.closed) {
      return;
    }

    this.page = this.page > 0 ? this.page - 1 : this.maxPage;
    this.refreshPage();
  }

  private nextPage(): void {
    if (!this.canClose || this.closed) {
      return;
    }

    this.page = this.page < this.maxPage ? this.page + 1 : 0;
    this.refreshPage();
  }

  private close(): void {
    if (this.closed || !this.canClose) {
      return;
    }

    this.closed = true;
    this.canClose = false;

    this.unbindKeys();

    this.container?.destroy(true);
    this.container = null;

    if (
  (globalScene as any)
    .practiceDummyNeedsRefresh
) {
  (globalScene as any)
    .practiceDummyNeedsRefresh = false;

  globalScene.refreshPracticeDummy?.();
}

    this.pageText = null;
    this.footerText = null;

    // ✅ 여기 추가
if ((globalScene.currentBattle as any)?.isPracticeBattle) {
  globalScene.refreshPracticeDummy?.();
}

    globalScene.time.delayedCall(100, () => {
      this.end();
    });
  }
}