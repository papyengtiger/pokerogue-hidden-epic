/**
 * Hidden Epic / The Other: opt-in diagnostic export for stuck battle transitions.
 * No save data, account identifiers, cookies, or credentials are collected.
 * Nothing is transmitted; the player must explicitly click the export button.
 */
import type { BattleScene } from "#app/battle-scene";
import { GameModes } from "#enums/game-modes";

type DiagnosticKind = "errors" | "events" | "resources";
type DiagnosticEntry = { time: string; kind: string; [key: string]: unknown };

const LIMIT = 100;
const SECRET = /(?:bearer\s+[\w.\-]+|(?:password|token|secret|authorization|cookie|sessionid)\s*[:=]\s*[^\s,;]+)/gi;
const sanitize = (value: unknown, length = 600) => String(value ?? "").replace(SECRET, "[redacted]").slice(0, length);
const phaseName = (phase: any): string | null => phase?.phaseName ?? phase?.constructor?.name ?? null;
const errorMessage = (value: any): string => sanitize(value?.stack ?? value?.message ?? value, 1500);
const resourcePath = (value: unknown): string => {
  try {
    return new URL(String(value ?? ""), window.location.href).pathname;
  } catch {
    return sanitize(value, 260).split("?")[0];
  }
};

class TheOtherDiagnostics {
  private scene: BattleScene | null = null;
  private records: Record<DiagnosticKind, DiagnosticEntry[]> = { errors: [], events: [], resources: [] };
  private lastPhase: unknown = null;
  private phaseSince = Date.now();
  private lastModeActive = false;
  private button: HTMLButtonElement | null = null;
  private attachedLoaders = new WeakSet<object>();

  constructor() {
    window.addEventListener("error", event => {
      if (event.target && event.target !== window) {
        const element = event.target as HTMLImageElement;
        const src = element.src ?? (element as any).href;
        if (src) this.add("resources", "resource-error", { path: resourcePath(src) });
        return;
      }
      this.add("errors", "window.error", {
        message: errorMessage(event.error ?? event.message),
        file: resourcePath(event.filename),
        line: event.lineno,
        column: event.colno,
      });
    }, true);
    window.addEventListener("unhandledrejection", event => {
      this.add("errors", "unhandledrejection", { message: errorMessage(event.reason) });
    });
  }

  private add(group: DiagnosticKind, kind: string, details: Record<string, unknown>) {
    if (!this.lastModeActive) return;
    const bucket = this.records[group];
    bucket.push({ time: new Date().toISOString(), kind, ...details });
    if (bucket.length > LIMIT) bucket.shift();
  }

  private partyData(pokemon: any) {
    return {
      species: pokemon?.species?.speciesId ?? pokemon?.species?.id ?? null,
      level: pokemon?.level ?? null,
      hp: pokemon?.hp ?? null,
      status: pokemon?.status?.effect ?? null,
      moves: pokemon?.moveset?.map((move: any) => ({ id: move.moveId, ppUsed: move.ppUsed, ppUp: move.ppUp })) ?? [],
    };
  }

  update(scene: BattleScene) {
    this.scene = scene;
    const enabled = scene.gameMode?.modeId === GameModes.THEOTHER;
    if (enabled && !this.lastModeActive) {
      this.records = { errors: [], events: [], resources: [] };
      this.lastPhase = null;
      this.phaseSince = Date.now();
    }
    this.lastModeActive = enabled;
    this.setButtonVisible(enabled);
    if (!enabled) return;

    const manager = scene.phaseManager as any;
    const phase = manager?.getCurrentPhase?.() ?? manager?.currentPhase;
    if (phase && phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.phaseSince = Date.now();
      this.add("events", "phase", { name: phaseName(phase), wave: scene.currentBattle?.waveIndex ?? null });
    }

    const loader = scene.load as any;
    if (loader && !this.attachedLoaders.has(loader)) {
      this.attachedLoaders.add(loader);
      loader.on("loaderror", (file: any) => {
        this.add("resources", "loader-error", {
          key: sanitize(file?.key, 120),
          path: resourcePath(file?.url ?? file?.src),
          type: sanitize(file?.type, 100),
        });
      });
    }
  }

  private setButtonVisible(enabled: boolean) {
    if (enabled && !this.button && document.body) {
      const button = document.createElement("button");
      button.id = "theother-diagnostic-button";
      button.textContent = "오류 진단";
      button.type = "button";
      button.style.cssText = "position:fixed;right:10px;bottom:10px;z-index:2147483647;padding:7px 10px;font:12px sans-serif;background:#f8f8f8;color:#17243b;border:1px solid #777;border-radius:2px;cursor:pointer;touch-action:manipulation";
      button.addEventListener("click", event => { event.stopPropagation(); this.download(); });
      button.addEventListener("keydown", event => event.stopPropagation());
      document.body.appendChild(button);
      this.button = button;
    } else if (!enabled && this.button) {
      this.button.remove();
      this.button = null;
      document.getElementById("theother-diagnostic-fallback")?.remove();
    }
  }

  private report() {
    const scene = this.scene;
    const battle = scene?.currentBattle as any;
    const manager = scene?.phaseManager as any;
    const phase = manager?.getCurrentPhase?.() ?? manager?.currentPhase;
    const loader = scene?.load as any;
    const queue = manager?.phaseQueue;
    const queuedPhases = Array.isArray(queue)
      ? queue.slice(0, 30).map(phaseName)
      : Array.isArray(queue?.levels)
        ? queue.levels.slice(0, 30).map((level: any) => Array.isArray(level) ? level.map(phaseName) : null)
        : null;
    return {
      version: "theother-diagnostic-ts-v1",
      createdAt: new Date().toISOString(),
      scene: {
        mode: scene?.gameMode?.modeId ?? null,
        wave: battle?.waveIndex ?? null,
        battleType: battle?.battleType ?? null,
        biome: (scene?.arena as any)?.biomeType ?? null,
        trainerType: battle?.trainer?.trainerType ?? null,
        theOther300Stage: scene?.theOther300Stage ?? null,
        uiMode: (scene?.ui as any)?.mode ?? null,
        playerParty: scene?.getPlayerParty?.().map(p => this.partyData(p)) ?? [],
        enemyParty: battle?.enemyParty?.map((p: any) => this.partyData(p)) ?? [],
      },
      phase: { name: phaseName(phase), ageSeconds: Math.round((Date.now() - this.phaseSince) / 1000) },
      queue: queuedPhases,
      loader: { loading: loader?.isLoading?.() ?? null, progress: loader?.progress ?? null, pending: loader?.list?.size ?? null, inflight: loader?.inflight?.size ?? null },
      presentation: { arenaBg: scene?.arenaBg?.texture?.key ?? null, playerTrainer: scene?.trainer?.visible ?? null, activeTweens: scene?.tweens?.getTweens?.()?.length ?? null },
      ...this.records,
    };
  }

  private download() {
    try {
      const content = JSON.stringify(this.report(), null, 2);
      const file = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pokerogue-theother-diagnostic-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      let panel = document.getElementById("theother-diagnostic-fallback");
      if (!panel) {
        panel = document.createElement("div");
        panel.id = "theother-diagnostic-fallback";
        panel.style.cssText = "position:fixed;right:10px;bottom:48px;z-index:2147483647;background:#30283e;color:white;padding:12px;max-width:330px;font:13px sans-serif;border:1px solid #c99959";
        document.body.appendChild(panel);
      }
      panel.replaceChildren();
      const note = document.createElement("div");
      note.textContent = "진단 파일을 저장했습니다. 다운로드가 안 되면 아래 내용을 복사해 주세요.";
      const area = document.createElement("textarea");
      area.value = content;
      area.readOnly = true;
      area.style.cssText = "width:300px;max-width:70vw;height:90px;margin-top:8px";
      const close = document.createElement("button");
      close.textContent = "닫기";
      close.addEventListener("click", () => panel?.remove());
      panel.append(note, area, close);
    } catch (error) {
      this.add("errors", "export-error", { message: errorMessage(error) });
      window.alert(`진단 파일 생성 실패: ${errorMessage(error)}`);
    }
  }
}

let instance: TheOtherDiagnostics | null = null;
export function updateTheOtherDiagnostics(scene: BattleScene): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  instance ??= new TheOtherDiagnostics();
  instance.update(scene);
}
