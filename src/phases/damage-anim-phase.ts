import { globalScene } from "#app/global-scene";
import { BattleSpec } from "#enums/battle-spec";
import type { BattlerIndex } from "#enums/battler-index";
import { GameModes } from "#enums/game-modes";
import { HitResult } from "#enums/hit-result";
import { PlayerGender } from "#enums/player-gender";
import { PokemonPhase } from "#phases/pokemon-phase";
import type { DamageResult } from "#types/damage-result";
import { fixedInt } from "#utils/common";
import i18next from "i18next";
import Phaser from "phaser";

export class DamageAnimPhase extends PokemonPhase {
  public readonly phaseName = "DamageAnimPhase";
  private amount: number;
  private damageResult: DamageResult;
  private critical: boolean;

  constructor(
    battlerIndex: BattlerIndex,
    amount: number,
    damageResult: DamageResult = HitResult.EFFECTIVE,
    critical = false,
  ) {
    super(battlerIndex);

    this.amount = amount;
    this.damageResult = damageResult;
    this.critical = critical;
  }

  start() {
    super.start();

    if (this.damageResult === HitResult.ONE_HIT_KO || this.damageResult === HitResult.INDIRECT_KO) {
      if (globalScene.moveAnimations) {
        globalScene.toggleInvert(true);
      }
      globalScene.time.delayedCall(fixedInt(1000), () => {
        globalScene.toggleInvert(false);
        this.applyDamage();
      });
      return;
    }

    this.applyDamage();
  }

  updateAmount(amount: number): void {
    this.amount = amount;
  }

  applyDamage() {
    const pokemon = this.getPokemon();

    if (!pokemon) {
      console.log("[DAMAGE_ANIM_SKIP_VIRTUAL_TARGET]", {
        battlerIndex: this.battlerIndex,
        amount: this.amount,
        damageResult: this.damageResult,
      });

      this.end();
      return;
    }

    switch (this.damageResult) {
      case HitResult.EFFECTIVE:
      case HitResult.CONFUSION:
        globalScene.playSound("se/hit");
        break;

      case HitResult.SUPER_EFFECTIVE:
      case HitResult.EXTREMELY_EFFECTIVE:
      case HitResult.INDIRECT_KO:
      case HitResult.ONE_HIT_KO:
        globalScene.playSound("se/hit_strong");
        break;

      case HitResult.NOT_VERY_EFFECTIVE:
      case HitResult.MOSTLY_INEFFECTIVE:
        globalScene.playSound("se/hit_weak");
        break;
    }

    if (this.amount) {
      globalScene.damageNumberHandler.add(pokemon, this.amount, this.damageResult, this.critical);
    }

    if (this.damageResult !== HitResult.INDIRECT && this.amount > 0) {
      const flashTimer = globalScene.time.addEvent({
        delay: 100,
        repeat: 5,
        startAt: 200,
        callback: () => {
          pokemon.getSprite().setVisible(flashTimer.repeatCount % 2 === 0);

          if (!flashTimer.repeatCount) {
            pokemon.updateInfo().then(() => this.end());
          }
        },
      });
    } else {
      pokemon.updateInfo().then(() => this.end());
    }
  }

  /** 로보키드가 8층에서 폭주형으로 변한 직후, 피해 연출 다음에 대화가 나오도록 한다. */
  private tryShowTheOtherRobokidBerserkDialogue(): boolean {
    const battle = globalScene.currentBattle;
    const pokemon = this.getPokemon() as
      | (ReturnType<DamageAnimPhase["getPokemon"]> & {
          theOtherRobokidBerserkDialoguePending?: boolean;
        })
      | null;

    if (
      !pokemon?.theOtherRobokidBerserkDialoguePending
      || battle?.waveIndex !== 8
      || globalScene.gameMode.modeId !== GameModes.THEOTHER
    ) {
      return false;
    }
    // 피해 애니메이션의 end()가 여러 번 호출되어도 한 번만 출력.
    pokemon.theOtherRobokidBerserkDialoguePending = false;

    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const isKo = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    const ko: [string, string][] = [
      ["", "로보키드의 몸에서 이상한 소리가 들려온다……!"],
      ["로보키드", "삐……삐빅…… 손상 확인……."],
      ["로보키드", "경고…… 경고…… 제어 불능……!"],
      ["", "로보키드의 모습이 변하기 시작했다!"],
      ["로보키드", "끼기기기긱……!! 제거…… 제거한다……!!"],
      ...((female
        ? [
            ["핀", "으아악!? 저 녀석, 갑자기 왜 저래!?"],
            ["미로", "뭐야!? 아까랑 모습이 완전히 달라졌잖아!"],
            ["미지", "위험해! 다들 조심해!"],
          ]
        : [
            ["미지", "꺄악!? 저 녀석, 갑자기 왜 저래!?"],
            ["아이비", "방금 전까지랑 완전히 달라졌어! 조심해!"],
            ["미로", "다들 방심하지 마! 아직 끝나지 않았어!"],
          ]) as [string, string][]),
    ];
    const en: [string, string][] = [
      ["", "A strange noise is coming from Robokid...!"],
      ["Robokid", "Be... beep... Damage detected..."],
      ["Robokid", "Warning... Warning... Control lost...!"],
      ["", "Robokid's appearance is changing!"],
      ["Robokid", "KRRRR...!! ELIMINATE... ELIMINATE...!!"],
      ...((female
        ? [
            ["Finn", "Aah!? What's happening to it!?"],
            ["Miro", "What!? It looks completely different now!"],
            ["Miji", "Watch out, everyone!"],
          ]
        : [
            ["Miji", "Aaah!? What happened to it!?"],
            ["Ivy", "It's totally different now! Be careful!"],
            ["Miro", "Don't let your guard down! This isn't over!"],
          ]) as [string, string][]),
    ];
    const lines = isKo ? ko : en;
    let portrait: Phaser.GameObjects.Image | undefined;
    const key = "theother_robokid_reckless_portrait";
    const finish = () => {
      if (portrait) {
        portrait.destroy();
        portrait = undefined;
      }
      globalScene.hideFieldOverlay(250).then(() => super.end());
    };
    const showLine = (index: number) => {
      if (index >= lines.length) {
        finish();
        return;
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => showLine(index + 1));
    };
    globalScene.showFieldOverlay(500).then(() => {
      if (globalScene.textures.exists(key)) {
        portrait = globalScene.add.image(globalScene.scaledCanvas.width * 0.71, -104, key);
        portrait.setOrigin(0.5, 0.5).setScale(1.05).setAlpha(0);
        globalScene.fieldUI.add(portrait);
        globalScene.tweens.add({ targets: portrait, alpha: 1, duration: 300 });
      } else {
        console.warn("[THEOTHER_8F_BERSERK_PORTRAIT_MISSING]", key);
      }
      showLine(0);
    });
    return true;
  }

  /** 145층 M.F.O가 체력 50% 이하에서 N.O.2.4.8로 변신한 직후 재생. */
  private tryShowTheOtherMno248TransformDialogue(): boolean {
    const battle = globalScene.currentBattle;
    const pokemon = this.getPokemon() as
      | (ReturnType<DamageAnimPhase["getPokemon"]> & {
          theOtherMno248TransformDialoguePending?: boolean;
        })
      | null;
    if (
      !pokemon?.theOtherMno248TransformDialoguePending
      || battle?.waveIndex !== 145
      || globalScene.gameMode.modeId !== GameModes.THEOTHER
    ) {
      return false;
    }

    pokemon.theOtherMno248TransformDialoguePending = false;
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    type Line = [string, string];
    const ko: Line[] = [
      ["M.F.O", "……!?"],
      ["M.F.O", "경고. 기체 손상률 증가."],
      ["M.F.O", "현재 전투 형태의 승리 확률…… 허용 기준 미달."],
      ...(female
        ? ([
            ["핀", "됐다! 이제 거의 다 쓰러뜨렸어!"],
            ["미로", "어라? 저 녀석한테 무슨 일이 생긴 거야?"],
            ["미지", "잠깐! 다들 경계해!"],
          ] as Line[])
        : ([
            ["미지", "좋아! 이제 조금만 더 하면……!"],
            ["아이비", "잠깐, 저 녀석 상태가 이상한데?"],
            ["미로", "모두 조심해! 뭔가 하려는 것 같아!"],
          ] as Line[])),
      ["M.F.O", "제1전투형태의 운용 한계 도달."],
      ["M.F.O", "비상 전투 프로토콜 승인."],
      ["M.F.O", "제2전투형태…… 전환 개시."],
      ["시스템", "M.F.O의 기체가 격렬하게 진동하기 시작했다!"],
      ["시스템", "눈부신 섬광이 사라지자, 완전히 달라진 모습의 기계가 모습을 드러냈다!"],
      ["N.O.2.4.8", "기체 재구성 완료."],
      ["N.O.2.4.8", "개체 식별명 갱신…… N.O.2.4.8."],
      ["N.O.2.4.8", "출력 정상. 전투 성능 확장 완료."],
      ...(female
        ? ([
            ["핀", "으아아!? 저게 대체 뭐야!?"],
            ["미로", "아까랑은 완전히 다른 모습인데!?"],
            ["미지", "아직 숨겨둔 힘이 있었던 거야……!"],
          ] as Line[])
        : ([
            ["미지", "뭐, 뭐야!? 모습이 완전히 달라졌잖아!?"],
            ["아이비", "변신까지 할 수 있었던 거야!?"],
            ["미로", "이제부터가 진짜라는 거군……!"],
          ] as Line[])),
      ["N.O.2.4.8", "대상의 전투 능력 재측정 개시."],
      ["N.O.2.4.8", "제압 절차를 속행한다."],
    ];
    const en: Line[] = [
      ["M.F.O", "...!?"],
      ["M.F.O", "Warning. Structural damage increasing."],
      ["M.F.O", "Victory probability in current form below tolerance."],
      ...(female
        ? ([
            ["Finn", "We're almost there!"],
            ["Miro", "What's happening to it?"],
            ["Miji", "Wait! Everyone, stay alert!"],
          ] as Line[])
        : ([
            ["Miji", "Just a little more...!"],
            ["Ivy", "Something is wrong with it!"],
            ["Miro", "Careful! It's doing something!"],
          ] as Line[])),
      ["M.F.O", "First combat form operational limit reached."],
      ["M.F.O", "Emergency combat protocol authorized."],
      ["M.F.O", "Second combat form... transition initiated."],
      ["System", "M.F.O's chassis began to shake violently!"],
      ["System", "When the flash faded, a completely different machine stood before them!"],
      ["N.O.2.4.8", "Chassis reconfiguration complete."],
      ["N.O.2.4.8", "Identification updated... N.O.2.4.8."],
      ["N.O.2.4.8", "Output nominal. Combat capacity expanded."],
      ...(female
        ? ([
            ["Finn", "What is that!?"],
            ["Miro", "It looks completely different!"],
            ["Miji", "It had more power hidden away...!"],
          ] as Line[])
        : ([
            ["Miji", "Its appearance changed completely!?"],
            ["Ivy", "It can transform!?"],
            ["Miro", "So the real battle starts now...!"],
          ] as Line[])),
      ["N.O.2.4.8", "Reassessing target combat capability."],
      ["N.O.2.4.8", "Resuming suppression procedure."],
    ];
    const lines = korean ? ko : en;
    const portraitKey = "theother_mno248_portrait";
    let portrait: Phaser.GameObjects.Image | undefined;
    const finish = () => {
      portrait?.destroy();
      globalScene.hideFieldOverlay(250).then(() => super.end());
    };
    const advance = (index: number) => {
      if (index >= lines.length) {
        return finish();
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => advance(index + 1));
    };
    const start = () =>
      globalScene.showFieldOverlay(500).then(() => {
        if (globalScene.textures.exists(portraitKey)) {
          portrait = globalScene.add.image(globalScene.scaledCanvas.width * 0.71, -104, portraitKey);
          portrait.setOrigin(0.5, 0.5).setScale(1.15).setAlpha(0);
          globalScene.fieldUI.add(portrait);
          globalScene.tweens.add({ targets: portrait, alpha: 1, duration: 300 });
        }
        advance(0);
      });
    if (globalScene.textures.exists(portraitKey)) {
      start();
    } else {
      globalScene.load.once(Phaser.Loader.Events.COMPLETE, start);
      globalScene.load.image(portraitKey, "/images/cg/m_n_o_2_4_8.png");
      if (!globalScene.load.isLoading()) {
        globalScene.load.start();
      }
    }
    return true;
  }

  /** 디 아더 195층 HP 25% 이하 폭주 이벤트: 기존 폼 변경 직후 한 번만 출력. */
  private tryShowTheOtherMno248BerserkDialogue(): boolean {
    const battle = globalScene.currentBattle;
    const pokemon = this.getPokemon() as
      | (ReturnType<DamageAnimPhase["getPokemon"]> & {
          theOtherMno248BerserkDialoguePending?: boolean;
        })
      | null;
    if (
      !pokemon?.theOtherMno248BerserkDialoguePending
      || battle?.waveIndex !== 195
      || globalScene.gameMode.modeId !== GameModes.THEOTHER
    ) {
      return false;
    }
    pokemon.theOtherMno248BerserkDialoguePending = false;
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    type Line = [string, string];
    const ko: Line[] = [
      ["N.O.2.4.8", "경고…… 기체 손상 한계 접근……."],
      ["N.O.2.4.8", "최종 대응 프로토콜…… 유지 불가……."],
      ...(female
        ? ([
            ["핀", "저, 저 녀석 또 이상해졌어!"],
            ["미로", "기계음이 점점 거칠어지는데!?"],
            ["미지", "다들 물러서! 뭔가 위험해!"],
          ] as Line[])
        : ([
            ["미지", "저 녀석 상태가 이상해!"],
            ["아이비", "지난번 변신이랑은 달라……!"],
            ["미로", "모두 조심해! 제어가 풀리는 것 같아!"],
          ] as Line[])),
      ["N.O.2.4.8", "안전 제한 장치…… 해제……."],
      ["N.O.2.4.8", "출력…… 최대…… 최대…… 최대……!"],
      ["시스템", "N.O.2.4.8의 기체에서 불길한 섬광이 폭발하듯 뿜어져 나왔다!"],
      ["시스템", "N.O.2.4.8이 통제 불능의 폭주 상태에 돌입했다!"],
      ...(female
        ? ([
            ["핀", "으아아! 저건 진짜 위험해 보여!"],
            ["미로", "공격이 훨씬 거세질 거야!"],
            ["미지", "여기서 물러날 순 없어. 끝까지 버티자!"],
          ] as Line[])
        : ([
            ["미지", "어떡해! 완전히 폭주했어!"],
            ["아이비", "이젠 자기 자신도 못 멈출 것 같은데!"],
            ["미로", "마지막까지 방심하지 마! 모두 집중해!"],
          ] as Line[])),
      ["N.O.2.4.8", "목표…… 제거…… 제거…… 제거……!"],
    ];
    const en: Line[] = [
      ["N.O.2.4.8", "Warning... Structural integrity critical..."],
      ["N.O.2.4.8", "Final response protocol... unstable..."],
      ...(female
        ? ([
            ["Finn", "It's acting strange again!"],
            ["Miro", "That mechanical noise is getting worse!"],
            ["Miji", "Everyone, back away!"],
          ] as Line[])
        : ([
            ["Miji", "Something's wrong with it!"],
            ["Ivy", "This isn't like its last transformation!"],
            ["Miro", "Be careful! It's losing control!"],
          ] as Line[])),
      ["N.O.2.4.8", "Safety limiters... disengaged..."],
      ["N.O.2.4.8", "Output... maximum... maximum...!"],
      ["System", "An ominous flash erupted from N.O.2.4.8!"],
      ["System", "N.O.2.4.8 entered an uncontrollable berserk state!"],
      ...(female
        ? ([
            ["Finn", "It's completely out of control!"],
            ["Miro", "Its attacks will only get stronger!"],
            ["Miji", "Hold on! We can finish this!"],
          ] as Line[])
        : ([
            ["Miji", "It's gone berserk!"],
            ["Ivy", "It can't even stop itself now!"],
            ["Miro", "Stay focused! Don't let your guard down!"],
          ] as Line[])),
      ["N.O.2.4.8", "Targets... eliminate... eliminate...!"],
    ];
    const lines = korean ? ko : en;
    const key = "theother_mno248_portrait"; // 폭주 전용 CG가 추가될 때 교체 가능.
    let portrait: Phaser.GameObjects.Image | undefined;
    const finish = () => {
      portrait?.destroy();
      globalScene.hideFieldOverlay(250).then(() => super.end());
    };
    const advance = (i: number) => {
      if (i >= lines.length) {
        return finish();
      }
      const [speaker, message] = lines[i];
      globalScene.ui.showDialogue(message, speaker, null, () => advance(i + 1));
    };
    const start = () =>
      globalScene.showFieldOverlay(500).then(() => {
        if (globalScene.textures.exists(key)) {
          portrait = globalScene.add.image(globalScene.scaledCanvas.width * 0.71, -104, key);
          portrait.setOrigin(0.5).setScale(1.15);
          globalScene.fieldUI.add(portrait);
        }
        advance(0);
      });
    if (globalScene.textures.exists(key)) {
      start();
    } else {
      globalScene.load.once(Phaser.Loader.Events.COMPLETE, start);
      globalScene.load.image(key, "/images/cg/m_n_o_2_4_8.png");
      if (!globalScene.load.isLoading()) {
        globalScene.load.start();
      }
    }
    return true;
  }

  override end() {
    if (this.tryShowTheOtherMno248BerserkDialogue()) {
      return;
    }
    if (this.tryShowTheOtherMno248TransformDialogue()) {
      return;
    }
    if (this.tryShowTheOtherRobokidBerserkDialogue()) {
      return;
    }
    if (globalScene.currentBattle.battleSpec === BattleSpec.FINAL_BOSS) {
      globalScene.initFinalBossPhaseTwo(this.getPokemon());
    } else {
      super.end();
    }
  }
}
