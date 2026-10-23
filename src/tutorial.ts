import { globalScene } from "#app/global-scene";
import Overrides from "#app/overrides";
import { GameModes } from "#enums/game-modes";
import { UiMode } from "#enums/ui-mode";
import { AwaitableUiHandler } from "#ui/awaitable-ui-handler";
import type { UiHandler } from "#ui/ui-handler";
import i18next from "i18next";

export enum Tutorial {
  Intro = "INTRO",
  Access_Menu = "ACCESS_MENU",
  Menu = "MENU",
  Starter_Select = "STARTER_SELECT",
  Pokedex = "POKEDEX",
  Pokerus = "POKERUS",
  Stat_Change = "STAT_CHANGE",
  Select_Item = "SELECT_ITEM",
  Egg_Gacha = "EGG_GACHA",
  HE_Battle = "HE_BATTLE",
  HE_Capture = "HE_CAPTURE",
  HE_Switch = "HE_SWITCH",
  HE_Type = "HE_TYPE",
  HE_Biome = "HE_BIOME",
  HE_Starter_Unlock = "HE_STARTER_UNLOCK",
  HE_Growth = "HE_GROWTH",
}

const tutorialShownThisRun = new Set<Tutorial>();

// 새 튜토리얼 회차 시작 시 호출
export function resetTutorialShownThisRun(): void {
  tutorialShownThisRun.clear();
}

function showHiddenEpicTutorial(key: string): Promise<void> {
  return new Promise<void>(resolve => {
    globalScene.ui.showText(i18next.t(`tutorialStory:${key}`), null, () => resolve(), null, true);
  });
}

const tutorialHandlers = {
  [Tutorial.Intro]: () => {
    return new Promise<void>(resolve => {
      globalScene.ui.showText(i18next.t("tutorial:intro"), null, () => resolve(), null, true);
    });
  },
  [Tutorial.Access_Menu]: () => {
    return new Promise<void>(resolve => {
      if (globalScene.enableTouchControls) {
        return resolve();
      }
      globalScene
        .showFieldOverlay(1000)
        .then(() =>
          globalScene.ui.showText(
            i18next.t("tutorial:accessMenu"),
            null,
            () => globalScene.hideFieldOverlay(1000).then(() => resolve()),
            null,
            true,
          ),
        );
    });
  },
  [Tutorial.Menu]: () => {
    return new Promise<void>(resolve => {
      globalScene.gameData.saveTutorialFlag(Tutorial.Access_Menu, true);
      globalScene.ui.showText(
        i18next.t("tutorial:menu"),
        null,
        () => globalScene.ui.showText("", null, () => resolve()),
        null,
        true,
      );
    });
  },
  [Tutorial.Starter_Select]: () => {
    return new Promise<void>(resolve => {
      globalScene.ui.showText(
        i18next.t("tutorial:starterSelect"),
        null,
        () => globalScene.ui.showText("", null, () => resolve()),
        null,
        true,
      );
    });
  },
  [Tutorial.Pokerus]: () => {
    return new Promise<void>(resolve => {
      globalScene.ui.showText(
        i18next.t("tutorial:pokerus"),
        null,
        () => globalScene.ui.showText("", null, () => resolve()),
        null,
        true,
      );
    });
  },
  [Tutorial.Stat_Change]: () => {
    return new Promise<void>(resolve => {
      globalScene
        .showFieldOverlay(1000)
        .then(() =>
          globalScene.ui.showText(
            i18next.t("tutorial:statChange"),
            null,
            () => globalScene.ui.showText("", null, () => globalScene.hideFieldOverlay(1000).then(() => resolve())),
            null,
            true,
          ),
        );
    });
  },
  [Tutorial.Select_Item]: () => {
    return new Promise<void>(resolve => {
      globalScene.ui.setModeWithoutClear(UiMode.MESSAGE).then(() => {
        globalScene.ui.showText(
          i18next.t("tutorial:selectItem"),
          null,
          () =>
            globalScene.ui.showText("", null, () =>
              globalScene.ui.setModeWithoutClear(UiMode.MODIFIER_SELECT).then(() => resolve()),
            ),
          null,
          true,
        );
      });
    });
  },
  [Tutorial.Egg_Gacha]: () => {
    return new Promise<void>(resolve => {
      globalScene.ui.showText(
        i18next.t("tutorial:eggGacha"),
        null,
        () => globalScene.ui.showText("", null, () => resolve()),
        null,
        true,
      );
    });
  },
  [Tutorial.HE_Battle]: () => showHiddenEpicTutorial("battle"),
  [Tutorial.HE_Capture]: () => showHiddenEpicTutorial("capture"),
  [Tutorial.HE_Switch]: () => showHiddenEpicTutorial("switch"),
  [Tutorial.HE_Type]: () => showHiddenEpicTutorial("type"),
  [Tutorial.HE_Biome]: () => showHiddenEpicTutorial("biome"),
  [Tutorial.HE_Starter_Unlock]: () => showHiddenEpicTutorial("starterUnlock"),
  [Tutorial.HE_Growth]: () => showHiddenEpicTutorial("growth"),
};

/**
 * Run through the specified tutorial if it hasn't been seen before and mark it as seen once done
 * This will show a tutorial overlay if defined in the current {@linkcode AwaitableUiHandler}
 * The main menu will also get disabled while the tutorial is running
 * @param tutorial the {@linkcode Tutorial} to play
 * @returns a promise with result `true` if the tutorial was run and finished, `false` otherwise
 */

export async function handleTutorial(tutorial: Tutorial): Promise<boolean> {
  const isTutorialMode = globalScene.gameMode?.modeId === GameModes.TUTORIAL;

  // 튜토리얼 모드에서는 같은 회차에 한 번만 표시
  if (isTutorialMode && tutorialShownThisRun.has(tutorial)) {
    return false;
  }

  // 등록되지 않은 튜토리얼은 실행하지 않음
  const tutorialHandler = tutorialHandlers[tutorial];

  if (typeof tutorialHandler !== "function") {
    console.error("[TUTORIAL_HANDLER_MISSING]", tutorial);
    console.trace("[TUTORIAL_CALL_TRACE]");
    return false;
  }

  if (!isTutorialMode && !globalScene.enableTutorials && !Overrides.BYPASS_TUTORIAL_SKIP_OVERRIDE) {
    return false;
  }

  if (
    !isTutorialMode
    && globalScene.gameData.getTutorialFlags()[tutorial]
    && !Overrides.BYPASS_TUTORIAL_SKIP_OVERRIDE
  ) {
    return false;
  }

  const handler = globalScene.ui.getHandler();
  const isMenuDisabled = globalScene.disableMenu;

  globalScene.disableMenu = true;

  if (handler instanceof AwaitableUiHandler) {
    handler.tutorialActive = true;
  }

  try {
    await showTutorialOverlay(handler);
    await tutorialHandler();
    await hideTutorialOverlay(handler);

    if (isTutorialMode) {
      tutorialShownThisRun.add(tutorial);
    }
    globalScene.gameData.saveTutorialFlag(tutorial, true);
    return true;
  } finally {
    globalScene.disableMenu = isMenuDisabled;

    if (handler instanceof AwaitableUiHandler) {
      handler.tutorialActive = false;
    }
  }
}

/**
 * Show the tutorial overlay if there is one
 * @param handler the current UiHandler
 * @returns `true` once the overlay has finished appearing, or if there is no overlay
 */
async function showTutorialOverlay(handler: UiHandler) {
  if (handler instanceof AwaitableUiHandler && handler.tutorialOverlay) {
    globalScene.tweens.add({
      targets: handler.tutorialOverlay,
      alpha: 0.5,
      duration: 750,
      ease: "Sine.easeOut",
      onComplete: () => {
        return true;
      },
    });
  } else {
    return true;
  }
}

/**
 * Hide the tutorial overlay if there is one
 * @param handler the current UiHandler
 * @returns `true` once the overlay has finished disappearing, or if there is no overlay
 */
async function hideTutorialOverlay(handler: UiHandler) {
  if (handler instanceof AwaitableUiHandler && handler.tutorialOverlay) {
    globalScene.tweens.add({
      targets: handler.tutorialOverlay,
      alpha: 0,
      duration: 500,
      ease: "Sine.easeOut",
      onComplete: () => {
        return true;
      },
    });
  } else {
    return true;
  }
}
