import { globalScene } from "#app/global-scene";
import { PersistentModifier } from "#modifiers/modifier";
import type { GeneratedPersistentModifierType, ModifierType } from "#modifiers/modifier-type";
import { getModifierTypeFuncById, ModifierTypeGenerator } from "#modifiers/modifier-type";

export class ModifierData {
  public player: boolean;
  public typeId: string;
  public typePregenArgs: any[] = [];
  public args: any[] = [];
  public stackCount: number;
  public className: string;

  constructor(source: PersistentModifier | any, player: boolean) {
    const sourceModifier = source instanceof PersistentModifier ? (source as PersistentModifier) : null;

    this.player = player;
    this.typeId = sourceModifier ? sourceModifier.type?.id || source.typeId || "" : source.typeId || "";

    if (sourceModifier) {
      if ("getPregenArgs" in source.type) {
        this.typePregenArgs = (source.type as GeneratedPersistentModifierType).getPregenArgs();
      }
    } else if (source.typePregenArgs) {
      this.typePregenArgs = source.typePregenArgs;
    }

    this.args = sourceModifier ? sourceModifier.getArgs() : source.args || [];

    // ✅ 핵심 1) stackCount 정규화 (null/undefined/NaN/0/음수 방지)
    const rawStack = sourceModifier ? sourceModifier.stackCount : source.stackCount;
    this.stackCount = typeof rawStack === "number" && Number.isFinite(rawStack) && rawStack > 0 ? rawStack : 1;

    this.className = sourceModifier ? sourceModifier.constructor.name : source.className;
  }

  toModifier(_constructor: any): PersistentModifier | null {
    if (!this.typeId && this.className) {
      const boostPercent =
        this.className === "PokemonExpBoosterModifier"
          ? Number(this.args?.[1])
          : this.className === "ExpBoosterModifier"
            ? Number(this.args?.[0])
            : Number.NaN;

      let recoveredTypeId = "";

      if (this.className === "PokemonExpBoosterModifier") {
        // 행복의알 / 황금의알 계열
        if (boostPercent >= 100) {
          recoveredTypeId = "GOLDEN_EGG";
        } else {
          recoveredTypeId = "LUCKY_EGG";
        }
      }

      if (this.className === "ExpBoosterModifier") {
        // 경험치 부적 계열
        recoveredTypeId = "EXP_CHARM";
      }

      if (recoveredTypeId) {
        console.warn("[LOAD][RECOVER_EMPTY_TYPEID]", {
          className: this.className,
          boostPercent,
          to: recoveredTypeId,
          args: this.args,
          stackCount: this.stackCount,
        });

        this.typeId = recoveredTypeId;
      } else {
        console.warn("[LOAD][DROP_EMPTY_TYPEID]", {
          className: this.className,
          args: this.args,
          typePregenArgs: this.typePregenArgs,
          stackCount: this.stackCount,
        });

        return null;
      }
    }

    const typeFunc = getModifierTypeFuncById(this.typeId);

    if (!typeFunc) {
      console.warn("[DROP_DEBUG]", {
        typeId: this.typeId,
        className: this.className,
        args: this.args,
        typePregenArgs: this.typePregenArgs,
      });

      console.warn("[LOAD][DROP_NO_TYPEFUNC]", this.typeId, this.className, this);
      return null;
    }

    try {
      let type: ModifierType | null = typeFunc();
      type.id = this.typeId;

      if (type instanceof ModifierTypeGenerator) {
        type = (type as ModifierTypeGenerator).generateType(
          this.player ? globalScene.getPlayerParty() : globalScene.getEnemyField(),
          this.typePregenArgs,
        );
      }

      // ✅ 핵심 2) 여기서도 한 번 더 안전장치 (옛 세이브/변조 대비)
      const safeStack =
        typeof this.stackCount === "number" && Number.isFinite(this.stackCount) && this.stackCount > 0
          ? this.stackCount
          : 1;

      const ctorArgs = ([type] as any[]).concat(this.args).concat(safeStack);

      const ret = Reflect.construct(_constructor, ctorArgs) as PersistentModifier;

      // ✅ clamp (이건 유지해도 OK)
      const max = ret.getMaxStackCount();

      // ret.stackCount가 null일 가능성까지 방어하면 더 튼튼
      if (typeof ret.stackCount !== "number" || !Number.isFinite(ret.stackCount) || ret.stackCount <= 0) {
        ret.stackCount = 1;
      }
      if (max > 0 && ret.stackCount > max) {
        ret.stackCount = max;
      }

      return ret;
    } catch (err) {
      console.error("[LOAD][DROP_CTOR_FAIL]", this.typeId, this.className, this.args, this.stackCount, err);
      return null;
    }
  }
}
