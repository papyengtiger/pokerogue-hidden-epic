import { timedEventManager } from "#app/global-event-manager";
import { globalScene } from "#app/global-scene";
import { modifierTypes } from "#data/data-lists";
import { getCharVariantFromDialogue } from "#data/dialogue";
import { BiomeId } from "#enums/biome-id";
import { GameModes } from "#enums/game-modes";
import { PlayerGender } from "#enums/player-gender";
import { TrainerSlot } from "#enums/trainer-slot";
import { TrainerType } from "#enums/trainer-type";
import { BattlePhase } from "#phases/battle-phase";
import { achvs } from "#system/achv";
import { vouchers } from "#system/voucher";
import { randSeedItem } from "#utils/common";
import i18next from "i18next";

/** 디 아더 보스전 승리 스토리: 트레이너전/야생전 공통. */
export function showTheOtherMfoVictoryStory(wave: number, onComplete: () => void): void {
  const female = globalScene.gameData.gender === PlayerGender.FEMALE;
  const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
  type Line = [string, string];
  let ko: Line[];
  let en: Line[];

  if (wave === 25) {
    ko = [
      ["M.F.O", "………."],
      ["M.F.O", "로보키드 3기, 전투 불능."],
      ["M.F.O", "대상의 전투 능력…… 예상 수치 초과."],
      ...(female
        ? ([
            ["핀", "휴우…… 정말 힘들었어!"],
            ["미로", "그런데 저 녀석은 왜 직접 싸우지 않는 거지?"],
            ["미지", "잠깐! 아직 물어볼 게 있어!"],
          ] as Line[])
        : ([
            ["미지", "휴우…… 겨우 이겼어!"],
            ["아이비", "그런데 저 녀석은 직접 싸울 생각이 없는 건가?"],
            ["미로", "잠깐! 아직 물어볼 게 있어!"],
          ] as Line[])),
      ["M.F.O", "추가 교전은 불필요."],
      ["M.F.O", "관측 기록을 갱신한다."],
      ["시스템", "M.F.O는 모습을 감췄다."],
      ...(female
        ? ([
            ["핀", "가 버렸어…… 대체 정체가 뭐지?"],
            ["미로", "적어도 저 기계들과 관련 있는 녀석인 건 확실해."],
            ["미지", "계속 수색하자. 나중에 다시 만날 수도 있어."],
          ] as Line[])
        : ([
            ["미지", "가 버렸네…… 대체 뭐였을까?"],
            ["아이비", "로보키드를 부릴 수 있다는 건 확실해졌어."],
            ["미로", "일단 계속 가자. 또 만날지도 모르니까."],
          ] as Line[])),
    ];
    en = [
      ["M.F.O", "........."],
      ["M.F.O", "Three Robokid units incapacitated."],
      ["M.F.O", "Target combat capability exceeds expectations."],
      ...(female
        ? ([
            ["Finn", "Phew... That was tough!"],
            ["Miro", "Why isn't that thing fighting us itself?"],
            ["Miji", "Wait! We still have questions!"],
          ] as Line[])
        : ([
            ["Miji", "Phew... We made it!"],
            ["Ivy", "Does that thing have no intention of fighting itself?"],
            ["Miro", "Wait! We still have questions!"],
          ] as Line[])),
      ["M.F.O", "Further engagement unnecessary."],
      ["M.F.O", "Updating observation records."],
      ["System", "M.F.O disappeared."],
      ...(female
        ? ([
            ["Finn", "It's gone... What was that?"],
            ["Miro", "At least it's connected to those machines."],
            ["Miji", "Let's keep searching. We may meet it again."],
          ] as Line[])
        : ([
            ["Miji", "It left... What was that?"],
            ["Ivy", "We know it commands those Robokids."],
            ["Miro", "Let's continue. We might run into it again."],
          ] as Line[])),
    ];
  } else if (wave === 55) {
    ko = [
      ["M.F.O", "………."],
      ["M.F.O", "로보키드 6기, 전투 불능."],
      ["M.F.O", "재검증 실패. 대상 전투 능력 재평가."],
      ...(female
        ? ([
            ["핀", "하아…… 이번엔 진짜 힘들었어!"],
            ["미로", "여섯 대를 상대했는데도 아직 부족하다는 거야?"],
            ["미지", "우리를 계속 시험하는 이유가 뭐지?"],
          ] as Line[])
        : ([
            ["미지", "하아…… 여섯 대나 상대하려니 정말 힘들었어."],
            ["아이비", "이 정도면 저 녀석도 포기할 때가 되지 않았어?"],
            ["미로", "넌 대체 뭘 확인하려는 거야?"],
          ] as Line[])),
      ["M.F.O", "현재 전력으로는 목표 달성 불가."],
      ["M.F.O", "다음 교전에서는 직접 대응한다."],
      ["시스템", "M.F.O는 다시 모습을 감췄다."],
      ...(female
        ? ([
            ["미로", "다음에는 직접 싸우겠다는 뜻인가?"],
            ["핀", "으으…… 벌써부터 불길한데."],
            ["미지", "경계하면서 움직이자. 초코도 계속 찾아야 하니까."],
          ] as Line[])
        : ([
            ["아이비", "직접 대응한다고……? 설마 다음엔 저 녀석이 싸우려는 거야?"],
            ["미지", "어쩐지 점점 더 위험해지는 것 같아……."],
            ["미로", "그래도 초코를 찾는 게 먼저야. 계속 가자."],
          ] as Line[])),
      ["시스템", "그러나 일행이 미처 눈치채지 못한 곳에서, 누군가가 그 광경을 지켜보고 있었다."],
      ["피아나", "………."],
      ["피아나", "저 녀석들…… 생각보다 제법인데?"],
      ["피아나", "후후, 재미있어지겠어."],
      ["시스템", "피아나는 아무런 기척도 남기지 않은 채 자리를 떠났다."],
    ];
    en = [
      ["M.F.O", "........."],
      ["M.F.O", "Six Robokid units incapacitated."],
      ["M.F.O", "Revalidation failed. Reassessing target capabilities."],
      ...(female
        ? ([
            ["Finn", "Phew... That was tough!"],
            ["Miro", "Six weren't enough either?"],
            ["Miji", "Why do you keep testing us?"],
          ] as Line[])
        : ([
            ["Miji", "Phew... Six was exhausting!"],
            ["Ivy", "Isn't it time that thing gave up?"],
            ["Miro", "What are you trying to find out?"],
          ] as Line[])),
      ["M.F.O", "Current forces insufficient."],
      ["M.F.O", "Next encounter: direct engagement."],
      ["System", "M.F.O disappeared again."],
      ...(female
        ? ([
            ["Miro", "So next time it'll fight us itself?"],
            ["Finn", "That sounds ominous..."],
            ["Miji", "Stay alert. We still need to find Choco."],
          ] as Line[])
        : ([
            ["Ivy", "Direct engagement...? Does that mean it'll fight us next time?"],
            ["Miji", "Things are getting dangerous..."],
            ["Miro", "Let's keep going. Finding Choco comes first."],
          ] as Line[])),
      ["System", "Unnoticed by the team, someone had been observing everything from the shadows."],
      ["Zinnia", "........."],
      ["Zinnia", "Those kids... better than I expected."],
      ["Zinnia", "Heh. Now this is getting interesting."],
      ["System", "Zinnia slipped away without a trace."],
    ];
  } else if (wave === 195) {
    ko = [
      ["N.O.2.4.8", "……시스템…… 한계 초과……."],
      ["N.O.2.4.8", "폭주 출력으로도…… 목표 제압 실패……."],
      ...(female
        ? ([
            ["핀", "하아…… 이번엔 정말 끝난 거지?"],
            ["미로", "아까는 정말 통제가 안 되는 것 같았어."],
            ["미지", "왜 이렇게까지 우리를 막으려는 거야?"],
          ] as Line[])
        : ([
            ["미지", "하아…… 정말 무서웠어."],
            ["아이비", "마지막엔 자기 자신도 제어하지 못한 것 같았어."],
            ["미로", "이제 그만해. 대체 뭘 지키려는 거지?"],
          ] as Line[])),
      ["N.O.2.4.8", "……응답…… 불가……."],
      ["N.O.2.4.8", "동력 저하. 기능 정지 절차…… 실행……."],
      ["시스템", "N.O.2.4.8의 기계음이 끊기고, 기체는 움직임을 멈췄다."],
      ...(female
        ? ([
            ["미로", "정말 끝난 건가……?"],
            ["핀", "우리도 여기서 오래 머물면 안 될 것 같아."],
            ["미지", "초코를 찾아야 해. 계속 가자."],
          ] as Line[])
        : ([
            ["아이비", "이젠 정말 멈춘 것 같네……."],
            ["미지", "그래도 마음이 편하진 않아."],
            ["미로", "초코를 찾으러 가자. 아직 할 일이 남았어."],
          ] as Line[])),
    ];
    en = [
      ["N.O.2.4.8", "...System... beyond operational limits..."],
      ["N.O.2.4.8", "Even berserk output... target suppression failed..."],
      ...(female
        ? ([
            ["Finn", "Is it really over now?"],
            ["Miro", "It seemed completely out of control."],
            ["Miji", "Why are you so determined to stop us?"],
          ] as Line[])
        : ([
            ["Miji", "That was terrifying..."],
            ["Ivy", "It couldn't even control itself at the end."],
            ["Miro", "Stop this. What are you trying to protect?"],
          ] as Line[])),
      ["N.O.2.4.8", "...Unable... to respond..."],
      ["N.O.2.4.8", "Power depleted. Initiating shutdown..."],
      ["System", "The machine fell silent and stopped moving."],
      ...(female
        ? ([
            ["Miro", "Is it finally over...?"],
            ["Finn", "We shouldn't stay here."],
            ["Miji", "We still have to find Choco. Let's go."],
          ] as Line[])
        : ([
            ["Ivy", "Looks like it really stopped..."],
            ["Miji", "I still feel uneasy."],
            ["Miro", "Let's find Choco. We're not done yet."],
          ] as Line[])),
    ];
  } else if (wave === 145) {
    ko = [
      ["N.O.2.4.8", "………!?"],
      ["N.O.2.4.8", "오류…… 전투 결과가 예측값을 초과……."],
      ["N.O.2.4.8", "제2전투형태에서도…… 목표 제압 실패……."],
      ...(female
        ? ([
            ["핀", "하아…… 심장이 멎는 줄 알았어!"],
            ["미로", "변신까지 하다니…… 정말 끝이 없네."],
            ["미지", "넌 대체 무슨 목적으로 우리를 쫓아오는 거야?"],
          ] as Line[])
        : ([
            ["미지", "하아…… 이번엔 정말 위험했어!"],
            ["아이비", "저렇게까지 강해졌는데도 또 덤벼들 줄이야."],
            ["미로", "이제 그만해. 대체 뭘 위해 이렇게까지 하는 거야?"],
          ] as Line[])),
      ["N.O.2.4.8", "………."],
      ["N.O.2.4.8", "현재 전투 체계의 결함 확인."],
      ["N.O.2.4.8", "최종 대응 프로토콜…… 검토 필요."],
      ["N.O.2.4.8", "일시 철수한다."],
      ["시스템", "N.O.2.4.8은 손상된 기체를 이끌고 모습을 감췄다."],
      ...(female
        ? ([
            ["미로", "최종 대응이라니…… 또 뭘 꾸미는 거지?"],
            ["핀", "이제 제발 그만 나타났으면 좋겠는데……."],
            ["미지", "아직 방심할 수 없겠어. 계속 가자."],
          ] as Line[])
        : ([
            ["아이비", "최종 대응 프로토콜……? 어째 불길한데."],
            ["미지", "설마 또 나타나는 건 아니겠지……?"],
            ["미로", "아직 끝나지 않았어. 다음엔 더 조심해야겠어."],
          ] as Line[])),
    ];
    en = [
      ["N.O.2.4.8", "...!?"],
      ["N.O.2.4.8", "Error... Result exceeds projected values..."],
      ["N.O.2.4.8", "Even in the second combat form... target suppression failed..."],
      ...(female
        ? ([
            ["Finn", "I thought my heart would stop!"],
            ["Miro", "It even transformed..."],
            ["Miji", "Why are you pursuing us?"],
          ] as Line[])
        : ([
            ["Miji", "That was really dangerous!"],
            ["Ivy", "It got so much stronger..."],
            ["Miro", "Stop this. Why go so far?"],
          ] as Line[])),
      ["N.O.2.4.8", "........."],
      ["N.O.2.4.8", "Current combat system deficiencies confirmed."],
      ["N.O.2.4.8", "Final response protocol... requires evaluation."],
      ["N.O.2.4.8", "Temporary withdrawal."],
      ["System", "N.O.2.4.8 vanished, carrying its damaged body away."],
      ...(female
        ? ([
            ["Miro", "Final response? What's it planning?"],
            ["Finn", "I hope it stops showing up..."],
            ["Miji", "Stay alert. Let's go."],
          ] as Line[])
        : ([
            ["Ivy", "Final response protocol...? Sounds ominous."],
            ["Miji", "Surely it won't appear again...?"],
            ["Miro", "This isn't over. Stay alert."],
          ] as Line[])),
    ];
  } else {
    ko = [
      ["M.F.O", "………!?"],
      ["M.F.O", "오류…… 예상 전투 결과와 불일치……."],
      ["M.F.O", "직접 교전에서도…… 제압 실패……."],
      ...(female
        ? ([
            ["핀", "으아…… 정말 강했어!"],
            ["미로", "로보키드랑은 비교도 안 되는데?"],
            ["미지", "이제 말해 줘. 왜 우리를 계속 방해하는 거야?"],
          ] as Line[])
        : ([
            ["미지", "하아…… 드디어 쓰러뜨렸어!"],
            ["아이비", "로보키드보다 훨씬 강했네. 대체 정체가 뭐야?"],
            ["미로", "이제 대답해. 왜 우리를 계속 공격하는 거지?"],
          ] as Line[])),
      ["M.F.O", "………."],
      ["M.F.O", "대상의 전투 능력…… 재평가 필요."],
      ["M.F.O", "현 단계에서는 임무 수행 불가능."],
      ["M.F.O", "전술 체계 재구축을 개시한다."],
      ...(female
        ? ([
            ["미로", "야, 잠깐! 아직 얘기 안 끝났어!"],
            ["핀", "또 가 버리는 거야……?"],
            ["미지", "다음에 만날 때는 더 위험해질지도 몰라."],
          ] as Line[])
        : ([
            ["아이비", "잠깐! 또 도망칠 생각이야!?"],
            ["미지", "저 녀석, 대체 무슨 목적이 있는 걸까……."],
            ["미로", "아직 끝난 게 아닌 것 같아. 조심하자."],
          ] as Line[])),
      ["시스템", "M.F.O는 불안정한 기계음을 남긴 채 모습을 감췄다."],
    ];
    en = [
      ["M.F.O", "...!?"],
      ["M.F.O", "Error... Result deviates from projections..."],
      ["M.F.O", "Even direct engagement... failed to suppress targets..."],
      ...(female
        ? ([
            ["Finn", "That was so strong!"],
            ["Miro", "Nothing like those Robokids."],
            ["Miji", "Tell us why you keep stopping us!"],
          ] as Line[])
        : ([
            ["Miji", "Phew... We finally beat it!"],
            ["Ivy", "Much stronger than a Robokid. What are you?"],
            ["Miro", "Tell us why you keep attacking us!"],
          ] as Line[])),
      ["M.F.O", "........."],
      ["M.F.O", "Reevaluation of target combat ability required."],
      ["M.F.O", "Mission cannot be completed at this stage."],
      ["M.F.O", "Initiating tactical system reconstruction."],
      ...(female
        ? ([
            ["Miro", "Hey, wait! We're not finished!"],
            ["Finn", "It's leaving again...?"],
            ["Miji", "It may be even more dangerous next time."],
          ] as Line[])
        : ([
            ["Ivy", "Wait! Running away again!?"],
            ["Miji", "What is it trying to do...?"],
            ["Miro", "I don't think this is over. Stay alert."],
          ] as Line[])),
      ["System", "M.F.O vanished, leaving an unstable mechanical noise behind."],
    ];
  }

  const lines = korean ? ko : en;
  const portraitKey = wave === 145 || wave === 195 ? "theother_mno248_portrait" : "theother_mfo_portrait";
  let portrait: Phaser.GameObjects.Image | undefined;
  const finish = (): void => {
    portrait?.destroy();
    globalScene.hideFieldOverlay(250).then(onComplete);
  };
  const advance = (index: number): void => {
    if (index >= lines.length) {
      finish();
      return;
    }
    const [speaker, message] = lines[index];
    if ((speaker === "피아나" || speaker === "Zinnia") && portrait) {
      portrait.setVisible(false);
    }
    globalScene.ui.showDialogue(message, speaker, null, () => advance(index + 1));
  };
  globalScene.showFieldOverlay(500).then(() => {
    if (globalScene.textures.exists(portraitKey)) {
      portrait = globalScene.add.image(globalScene.scaledCanvas.width * 0.71, -104, portraitKey);
      portrait.setOrigin(0.5);
      portrait.setScale(1.3);
      globalScene.fieldUI.add(portrait);
    }
    advance(0);
  });
}

export class TrainerVictoryPhase extends BattlePhase {
  public readonly phaseName = "TrainerVictoryPhase";

  /** 디 아더 보스전 공통 대사를 실행하고 정상적으로 다음 페이즈로 복귀합니다. */
  private showTheOtherMfoVictoryStory(wave: number): void {
    showTheOtherMfoVictoryStory(wave, () => this.end());
  }

  /** 디 아더 245층: 첫 피아나전 승리 후. 기존 트레이너 보상 처리는 유지합니다. */
  private showTheOtherZinnia245VictoryStory(): void {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    type Line = [string, string];
    const ko: Line[] = [
      ["피아나", "아하하! 대단한데? 생각했던 것보다 훨씬 강하잖아!"],
      ...(female
        ? ([
            ["핀", "후우…… 꽤 강한 사람이었어!"],
            ["미로", "이제 질문에 답해 줄 차례야."],
            ["미지", "혹시 초코라는 나옹에 대해 아는 게 있어?"],
          ] as Line[])
        : ([
            ["미지", "후우…… 정말 강했어!"],
            ["아이비", "그러니까 우리 질문에 대답해 줘."],
            ["미로", "초코라는 나옹에 대해 아는 게 있어?"],
          ] as Line[])),
      ["피아나", "초코라…… 이름까지 있는 나옹을 찾고 있구나."],
      ["피아나", "미안하지만 지금은 확실하게 해 줄 말이 없어."],
      ...(female
        ? ([["미지", "그럼 왜 우리 앞에 나타난 거야?"]] as Line[])
        : ([["미로", "그럼 왜 우리를 막아선 거야?"]] as Line[])),
      ["피아나", "말했잖아. 너희 실력이 궁금했다고!"],
      ["피아나", "아무튼 오늘 승부, 정말 즐거웠어. 다음에 또 만나면 좋겠네."],
      ["시스템", "피아나는 장난스러운 미소를 남기고 길 너머로 사라졌다."],
      ...(female
        ? ([
            ["핀", "정말 이상한 사람이네……."],
            ["미로", "뭔가 숨기는 것 같지만, 지금은 알 방법이 없겠어."],
            ["미지", "계속 가자. 초코를 찾는 게 먼저야."],
          ] as Line[])
        : ([
            ["미지", "정말 이상한 사람이었어……."],
            ["아이비", "뭔가 아는 것처럼 굴었는데 말이지."],
            ["미로", "계속 가자. 초코를 찾는 게 먼저야."],
          ] as Line[])),
    ];
    const en: Line[] = [
      ["Zinnia", "Ahaha! You're even stronger than I expected!"],
      ...(female
        ? ([
            ["Finn", "Whew... She was strong!"],
            ["Miro", "Now answer our questions."],
            ["Miji", "Do you know a Meowth named Choco?"],
          ] as Line[])
        : ([
            ["Miji", "Whew... That was tough!"],
            ["Ivy", "Now it's your turn to answer."],
            ["Miro", "Do you know a Meowth named Choco?"],
          ] as Line[])),
      ["Zinnia", "Choco... So you're looking for a Meowth with a name."],
      ["Zinnia", "Sorry, but I can't tell you anything for certain right now."],
      ...(female
        ? ([["Miji", "Then why did you approach us?"]] as Line[])
        : ([["Miro", "Then why did you stop us?"]] as Line[])),
      ["Zinnia", "I told you! I wanted to see how strong you are!"],
      ["Zinnia", "That was fun. Hope we meet again!"],
      ["System", "Zinnia left with a mischievous smile."],
      ...(female
        ? ([
            ["Finn", "What a strange person..."],
            ["Miro", "She's hiding something."],
            ["Miji", "Let's keep looking for Choco."],
          ] as Line[])
        : ([
            ["Miji", "What a strange person..."],
            ["Ivy", "She acted like she knew something."],
            ["Miro", "Let's keep looking for Choco."],
          ] as Line[])),
    ];
    const lines = korean ? ko : en;
    const advance = (index: number): void => {
      if (index >= lines.length) {
        this.end();
        return;
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => advance(index + 1));
    };
    advance(0);
  }

  /** 디 아더 295층: 피아나 재대결 승리 후, 300층으로 이어지는 복선. */
  private showTheOtherZinnia295VictoryStory(): void {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    type Line = [string, string];
    const ko: Line[] = [
      ["피아나", "하하……! 정말 대단해. 이번엔 진심이었는데도 졌네."],
      ...(female
        ? ([
            ["핀", "하아…… 나, 다리가 풀릴 뻔했어……."],
            ["미로", "지난번보다 훨씬 강했어."],
            ["미지", "이제 초코에 대해 말해 줄 수 있어?"],
          ] as Line[])
        : ([
            ["미지", "하아…… 이번엔 정말 힘들었어!"],
            ["아이비", "지난번과는 차원이 달랐어."],
            ["미로", "이제 초코에 대해 말해 줄 수 있어?"],
          ] as Line[])),
      ["피아나", "……너희라면 끝까지 갈 수 있을지도 모르겠네."],
      ["피아나", "하지만 내가 대신 답을 정해 줄 순 없어."],
      ["피아나", "이 길의 끝에서 무얼 보든, 스스로 판단해. 그게 너희가 여기까지 온 이유잖아?"],
      ...(female
        ? ([
            ["미로", "끝에 뭔가 있다는 뜻이야?"],
            ["핀", "왜 자꾸 수수께끼처럼 말하는 거야?"],
            ["미지", "좋아. 직접 확인할게."],
          ] as Line[])
        : ([
            ["아이비", "이 길 끝에 뭔가 기다리고 있다는 거야?"],
            ["미지", "정말 끝까지 알쏭달쏭한 사람이네……."],
            ["미로", "좋아. 직접 확인할게."],
          ] as Line[])),
      ["피아나", "후후, 그 대답이 듣고 싶었어."],
      ["피아나", "그럼…… 마지막에 다시 만나자. 이번엔 진짜 마지막이야."],
      ["시스템", "피아나는 의미심장한 미소를 지으며 앞서 길을 떠났다."],
      ...(female
        ? ([
            ["미지", "마지막이라고……?"],
            ["미로", "일단 앞으로 가 보자."],
            ["핀", "초코를 찾을 때까지 멈출 순 없으니까!"],
          ] as Line[])
        : ([
            ["미로", "마지막이라니…… 무슨 뜻일까?"],
            ["아이비", "가 보면 알겠지."],
            ["미지", "좋아! 초코를 찾으러 가자!"],
          ] as Line[])),
    ];
    const en: Line[] = [
      ["Zinnia", "Haha... Amazing. I gave it everything and still lost."],
      ...(female
        ? ([
            ["Finn", "My legs are shaking..."],
            ["Miro", "You were so much stronger than last time."],
            ["Miji", "Will you tell us about Choco now?"],
          ] as Line[])
        : ([
            ["Miji", "That was exhausting!"],
            ["Ivy", "A whole different level from last time."],
            ["Miro", "Will you tell us about Choco now?"],
          ] as Line[])),
      ["Zinnia", "...Maybe you really can make it to the end."],
      ["Zinnia", "But I can't decide the answers for you."],
      ["Zinnia", "Whatever you find at the end, decide what it means for yourselves."],
      ...(female
        ? ([
            ["Miro", "So there's something waiting for us?"],
            ["Finn", "Why speak in riddles?"],
            ["Miji", "Fine. We'll see for ourselves."],
          ] as Line[])
        : ([
            ["Ivy", "Something's waiting at the end?"],
            ["Miji", "She's as mysterious as ever..."],
            ["Miro", "Fine. We'll see for ourselves."],
          ] as Line[])),
      ["Zinnia", "Hehe, that's what I wanted to hear."],
      ["Zinnia", "Then let's meet one last time. The next one will be the last."],
      ["System", "Zinnia walked ahead, smiling mysteriously."],
      ...(female
        ? ([
            ["Miji", "One last time...?"],
            ["Miro", "Let's keep going."],
            ["Finn", "We won't stop until we find Choco!"],
          ] as Line[])
        : ([
            ["Miro", "What does she mean, last time?"],
            ["Ivy", "We'll find out."],
            ["Miji", "Let's find Choco!"],
          ] as Line[])),
    ];
    const lines = korean ? ko : en;
    const advance = (index: number): void => {
      if (index >= lines.length) {
        this.end();
        return;
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => advance(index + 1));
    };
    advance(0);
  }

  /** 디 아더 300층: 피아나전 직후의 이야기. 실제 레쿠쟈 교전은 추가 페이즈 연결 필요. */
  private showTheOtherZinnia300VictoryStory(): void {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const korean = (i18next.resolvedLanguage ?? i18next.language ?? "ko").startsWith("ko");
    type Line = [string, string];
    const ko: Line[] = [
      ["피아나", "하하……! 역시 너희라면 해낼 줄 알았어."],
      ...(female
        ? ([
            ["핀", "드디어 이겼다……!"],
            ["미로", "이제 초코에 관한 이야기를 들을 수 있겠지?"],
            ["미지", "피아나, 약속 지켜 줘."],
          ] as Line[])
        : ([
            ["미지", "하아…… 드디어 이겼어!"],
            ["아이비", "이번엔 정말 마지막 승부였겠지?"],
            ["미로", "피아나, 이제 약속대로 알려 줘."],
          ] as Line[])),
      ["피아나", "그래. 너희는 끝까지 포기하지 않았어."],
      ["피아나", "하지만…… 아직 마지막 시험이 하나 남아 있어."],
      ["시스템", "갑자기 머리 위로 거센 바람이 휘몰아쳤다!"],
      ...(female
        ? ([
            ["핀", "뭐, 뭐야!?"],
            ["미지", "저 위에서 뭔가 내려오고 있어!"],
          ] as Line[])
        : ([
            ["미지", "꺄악! 갑자기 바람이!?"],
            ["미로", "위험해! 모두 뒤로 물러나!"],
          ] as Line[])),
      ["피아나", "이제부터는…… 하늘의 수호자와 마주할 차례야."],
      ["시스템", "거대한 용의 그림자가 하늘을 가로질렀다……!"],
    ];
    const en: Line[] = [
      ["Zinnia", "Haha... I knew you could do it."],
      ...(female
        ? ([
            ["Finn", "We won!"],
            ["Miro", "Now tell us about Choco."],
            ["Miji", "Keep your promise, Zinnia."],
          ] as Line[])
        : ([
            ["Miji", "We won!"],
            ["Ivy", "Surely that was the last battle?"],
            ["Miro", "You promised to tell us."],
          ] as Line[])),
      ["Zinnia", "Yes. You never gave up."],
      ["Zinnia", "But there is one final trial."],
      ["System", "A fierce gale suddenly swept through the sky!"],
      ...(female
        ? ([
            ["Finn", "What's that!?"],
            ["Miji", "Something's coming down!"],
          ] as Line[])
        : ([
            ["Miji", "What's with this wind!?"],
            ["Miro", "Get back, everyone!"],
          ] as Line[])),
      ["Zinnia", "Now it's time to face the guardian of the skies."],
      ["System", "The shadow of a gigantic dragon crossed the heavens..."],
    ];
    const lines = korean ? ko : en;
    const advance = (index: number): void => {
      if (index >= lines.length) {
        // 디 아더 300층: 피아나가 퇴장한 뒤 레쿠쟈전으로 전환한다.
        // 트레이너 오브젝트는 다음 전투에서 재사용하지 않으므로 화면에서만 숨긴다.
        const trainer = globalScene.currentBattle?.trainer;
        if (!trainer || !trainer.active) {
          this.end();
          return;
        }

        globalScene.tweens.add({
          targets: trainer,
          x: trainer.x + 300,
          duration: 650,
          ease: "Sine.easeIn",
          onComplete: () => {
            trainer.setVisible(false);
            console.log("[THEOTHER_300_ZINNIA_EXIT]");
            this.end();
          },
        });
        return;
      }
      const [speaker, message] = lines[index];
      globalScene.ui.showDialogue(message, speaker, null, () => advance(index + 1));
    };
    advance(0);
  }

  start() {
    console.log("[TrainerVictoryPhase] START");

    const trainer = globalScene.currentBattle.trainer;
    if (!trainer) {
      console.warn("[TrainerVictoryPhase] trainer is null -> end()");
      this.end();
      return;
    }

    globalScene.disableMenu = true;

    globalScene.playBgm(trainer.config.victoryBgm);

    // 트레이너전 골드 배수는 trainer-config.ts의 moneyMultiplier를 사용합니다.
    globalScene.phaseManager.unshiftNew("MoneyRewardPhase", trainer.config.moneyMultiplier);

    const baseRp = trainer.config.isBoss ? 500 : 150;
    const multiplier = trainer.config.moneyMultiplier ?? 1;
    const waveBonus = Math.floor(globalScene.currentBattle.waveIndex / 10) * 500;

    const gainedRp = Math.floor(baseRp * multiplier + waveBonus);

    globalScene.gameData.addRoguePoints(gainedRp);

    console.log("[TRAINER_VICTORY_RP]", {
      trainerType: TrainerType[trainer.config.trainerType],
      isBoss: trainer.config.isBoss,
      moneyMultiplier: trainer.config.moneyMultiplier,
      waveIndex: globalScene.currentBattle.waveIndex,
      gainedRp,
    });

    const modifierRewardFuncs = trainer.config.modifierRewardFuncs ?? [];
    console.log("[TrainerVictoryPhase] modifierRewardFuncs count =", modifierRewardFuncs.length);

    for (const [i, modifierRewardFunc] of modifierRewardFuncs.entries()) {
      console.log(`[TrainerVictoryPhase] enqueue ModifierRewardPhase #${i}`);
      globalScene.phaseManager.unshiftNew("ModifierRewardPhase", modifierRewardFunc);
    }

    const trainerType = trainer.config.trainerType;

    console.log("[TrainerVictoryPhase] trainerType =", TrainerType[trainerType]);
    console.log("[TrainerVictoryPhase] isBoss =", trainer?.config.isBoss);

    if (vouchers.hasOwnProperty(TrainerType[trainerType])) {
      const voucher = vouchers[TrainerType[trainerType]];
      console.log("[TrainerVictoryPhase] voucher entry found:", voucher);

      const valid = globalScene.validateVoucher(voucher);
      console.log("[TrainerVictoryPhase] voucher valid =", valid);

      if (!valid && trainer?.config.isBoss) {
        const upgraded = timedEventManager.getUpgradeUnlockedVouchers();
        console.log("[TrainerVictoryPhase] grant voucher | upgraded =", upgraded);

        const voucherType = voucher.voucherType;
        const reward = upgraded
          ? [
              modifierTypes.VOUCHER_PLUS,
              modifierTypes.VOUCHER_PLUS,
              modifierTypes.VOUCHER_PLUS,
              modifierTypes.VOUCHER_PREMIUM,
            ][voucherType]
          : [modifierTypes.VOUCHER, modifierTypes.VOUCHER, modifierTypes.VOUCHER_PLUS, modifierTypes.VOUCHER_PREMIUM][
              voucherType
            ];

        console.log("[TrainerVictoryPhase] enqueue voucher reward =", reward);

        globalScene.phaseManager.unshiftNew("ModifierRewardPhase", reward);
      }
    }

    // 🛰️ Achievement check
    if (
      globalScene.arena.biomeType === BiomeId.SPACE
      && (trainerType === TrainerType.BREEDER || trainerType === TrainerType.EXPERT_POKEMON_BREEDER)
    ) {
      console.log("[TrainerVictoryPhase] Achv: BREEDERS_IN_SPACE");
      globalScene.validateAchv(achvs.BREEDERS_IN_SPACE);
    }

    // 300층 피아나전 후속 컷신. 이 대화만으로 레쿠쟈전이 시작되는 것은 아닙니다.
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 300
      && trainerType === TrainerType.ZINNIA
    ) {
      this.showEnemyTrainer();
      this.showTheOtherZinnia300VictoryStory();
      return;
    }

    // 295층 피아나 재대결. 트레이너 보상 큐잉 완료 후 전용 대사 출력.
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 295
      && trainerType === TrainerType.ZINNIA
    ) {
      this.showEnemyTrainer();
      this.showTheOtherZinnia295VictoryStory();
      return;
    }

    // 피아나 첫 대결. 기존 보상 큐잉 후 전용 승리 대사를 재생합니다.
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && globalScene.currentBattle.waveIndex === 245
      && trainerType === TrainerType.ZINNIA
    ) {
      this.showEnemyTrainer();
      this.showTheOtherZinnia245VictoryStory();
      return;
    }

    // 디 아더 고정 M.F.O전 승리 컷신. 일반 트레이너 승리 대사보다 우선합니다.
    // 기존 보상 큐잉은 위에서 완료됐으므로 손실 없이 이어집니다.
    const wave = globalScene.currentBattle.waveIndex;
    if (
      globalScene.gameMode.modeId === GameModes.THEOTHER
      && (wave === 25 || wave === 55 || wave === 95 || wave === 145 || wave === 195)
    ) {
      this.showEnemyTrainer();
      this.showTheOtherMfoVictoryStory(wave);
      return;
    }

    // 🗨️ Victory dialogue
    const trainerName = trainer?.getName(TrainerSlot.NONE, true);
    console.log("[TrainerVictoryPhase] trainerDefeated text trainerName =", trainerName);

    globalScene.ui.showText(
      i18next.t("battle:trainerDefeated", { trainerName }),
      null,
      () => {
        const victoryMessages = trainer?.getVictoryMessages()!;
        console.log("[TrainerVictoryPhase] victoryMessages =", victoryMessages);

        let message: string;
        globalScene.executeWithSeedOffset(() => {
          message = randSeedItem(victoryMessages);
          console.log("[TrainerVictoryPhase] selected victory message =", message);
        }, globalScene.currentBattle.waveIndex);

        const showMessage = () => {
          console.log("[TrainerVictoryPhase] showDialogue");
          const originalFunc = showMessageOrEnd;
          showMessageOrEnd = () =>
            globalScene.ui.showDialogue(message, trainer?.getName(TrainerSlot.TRAINER, true), null, originalFunc);
          showMessageOrEnd();
        };

        let showMessageOrEnd = () => {
          console.log("[TrainerVictoryPhase] END");
          this.end();
        };

        if (victoryMessages?.length > 0) {
          const hasSprite = trainer?.config.hasCharSprite;
          const skip = globalScene.ui.shouldSkipDialogue(message);

          console.log("[TrainerVictoryPhase] hasCharSprite =", hasSprite, "skipDialogue =", skip);

          if (hasSprite && !skip) {
            const originalFunc = showMessageOrEnd;
            showMessageOrEnd = () =>
              globalScene.charSprite.hide().then(() => globalScene.hideFieldOverlay(250).then(() => originalFunc()));

            globalScene
              .showFieldOverlay(500)
              .then(() =>
                globalScene.charSprite
                  .showCharacter(trainer?.getKey()!, getCharVariantFromDialogue(victoryMessages[0]))
                  .then(() => showMessage()),
              );
          } else {
            showMessage();
          }
        } else {
          showMessageOrEnd();
        }
      },
      null,
      true,
    );

    this.showEnemyTrainer();
  }
}
