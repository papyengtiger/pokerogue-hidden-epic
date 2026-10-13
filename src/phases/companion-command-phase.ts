import { globalScene } from "#app/global-scene";
import { Command } from "#enums/command";
import { MoveUseMode } from "#enums/move-use-mode";
import { MoveTarget } from "#enums/move-target";
import { getMoveTargets } from "#moves/move-utils";
import type { PlayerPokemon } from "#field/pokemon";
import { FieldPhase } from "#phases/field-phase";

export class CompanionCommandPhase extends FieldPhase {
  public readonly phaseName = "CompanionCommandPhase";

  protected fieldIndex: number;

  constructor(fieldIndex: number) {
    super();
    this.fieldIndex = fieldIndex;
  }

  start(): void {
  super.start();

  console.log("[COMPANION_AI_START]", {
    fieldIndex: this.fieldIndex,
    companionParty: globalScene
      .getCompanionParty()
      .map(p => ({
        name: p.getName(),
        active: p.isActive(),
        onField: p.isOnField(),
        battlerIndex: p.getBattlerIndex(),
      })),
  });

  const battle = globalScene.currentBattle;

  const companionPokemon = globalScene
    .getCompanionParty()
    .find(p => p.isActive(true));

  if (!companionPokemon) {
    console.warn("[COMPANION_AI_NO_ACTIVE_POKEMON]", {
      fieldIndex: this.fieldIndex,
    });

    this.end();
    return;
  }

  console.log("[COMPANION_SPRITE_DEBUG]", {
    name: companionPokemon.getName(),
    spriteId: companionPokemon.getBattleSpriteId(true),
    spriteKey: companionPokemon.getBattleSpriteKey(true),
    atlasPath: companionPokemon.getBattleSpriteAtlasPath(true),
    animExists: globalScene.anims.exists(
      companionPokemon.getBattleSpriteKey(true),
    ),
  });

    const usableMoves = companionPokemon
      .getMoveset()
      .map((move, index) => ({
        move,
        index,
      }))
      .filter(({ move }) =>
        move.isUsable(
          companionPokemon,
          false,
          true,
        )[0],
      );

    if (usableMoves.length === 0) {
  console.warn("[COMPANION_AI_NO_USABLE_MOVE]", {
    companion: companionPokemon.getName(),
    fieldIndex: this.fieldIndex,
  });

  this.end();
  return;
}

    const selected =
      usableMoves[
        battle.randSeedInt(usableMoves.length)
      ];

    const moveTargets =
  getMoveTargets(
    companionPokemon,
    selected.move.moveId,
  );

// 실제 현재 필드에 존재하는 BattlerIndex만 허용
const move = selected.move.getMove();

const enemyTargets = globalScene
  .getEnemyField()
  .filter(
    p =>
      p.isActive(true)
      && !p.isFainted(),
  )
  .map(p => p.getBattlerIndex());

const allyTargets = globalScene
  .getPlayerField(true)
  .filter(
    p =>
      p.id !== companionPokemon.id
      && !p.isFainted(),
  )
  .map(p => p.getBattlerIndex());

let validTargets: number[];

// 적을 대상으로 하는 일반 기술
switch (move.moveTarget) {
  case MoveTarget.NEAR_ENEMY:
  case MoveTarget.RANDOM_NEAR_ENEMY:
  case MoveTarget.ALL_NEAR_ENEMIES:
  case MoveTarget.ALL_ENEMIES:
  case MoveTarget.ENEMY_SIDE:
    validTargets = enemyTargets;
    break;

  // 동료 자신
  case MoveTarget.USER:
  case MoveTarget.PARTY:
    validTargets = [
      companionPokemon.getBattlerIndex(),
    ];
    break;

  // 아군 1마리
  case MoveTarget.NEAR_ALLY:
  case MoveTarget.ALLY:
    validTargets = allyTargets;
    break;

  // 자신 또는 아군
  case MoveTarget.USER_OR_NEAR_ALLY:
    validTargets = [
      companionPokemon.getBattlerIndex(),
      ...allyTargets,
    ];
    break;

  // 자신 + 아군 전체
  case MoveTarget.USER_AND_ALLIES:
  case MoveTarget.USER_SIDE:
    validTargets = [
      companionPokemon.getBattlerIndex(),
      ...allyTargets,
    ];
    break;

  // 아무 대상이나 가능한 기술
  case MoveTarget.NEAR_OTHER:
  case MoveTarget.OTHER:
  case MoveTarget.ALL_NEAR_OTHERS:
  case MoveTarget.ALL_OTHERS:
    validTargets = [
      ...enemyTargets,
      ...allyTargets,
    ];
    break;

  // 전체 필드
  case MoveTarget.ALL:
  case MoveTarget.BOTH_SIDES:
    validTargets = [
      companionPokemon.getBattlerIndex(),
      ...allyTargets,
      ...enemyTargets,
    ];
    break;

  default:
    validTargets =
      moveTargets.targets.filter(
        index =>
          globalScene
            .getField(true)
            .some(
              p =>
                p.getBattlerIndex()
                === index,
            ),
      );
    break;
}

if (validTargets.length === 0) {
  console.warn(
    "[COMPANION_AI_NO_VALID_TARGET]",
    {
      companion:
        companionPokemon.getName(),
      move: selected.move.getName(),
      moveId: selected.move.moveId,
      rawTargets: moveTargets.targets,
      activeField: globalScene
        .getField(true)
        .map(p => ({
          name: p.getName?.(),
          battlerIndex:
            p.getBattlerIndex(),
        })),
    },
  );

  this.end();
  return;
}

const targets =
  moveTargets.multiple
    || validTargets.length === 1
    ? validTargets
    : [
        validTargets[
          battle.randSeedInt(
            validTargets.length,
          )
        ],
      ];

battle.turnCommands[this.fieldIndex] = {
  command: Command.FIGHT,
  cursor: selected.index,
  move: {
    move: selected.move.moveId,
    targets,
    useMode: MoveUseMode.NORMAL,
  },
};

    console.log("[COMPANION_AI_COMMAND]", {
      companion: companionPokemon.getName(),
      move: selected.move.getName(),
      targets,
      fieldIndex: this.fieldIndex,
    });

    this.end();
  }

  getFieldIndex(): number {
    return this.fieldIndex;
  }

  getPokemon(): PlayerPokemon | undefined {
    return globalScene
      .getCompanionParty()
      .find(p => p.isActive(true));
  }
}