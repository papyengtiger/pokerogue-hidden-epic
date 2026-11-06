import { WeatherType } from "#app/enums/weather-type";
import { getGameMode } from "#app/game-mode";
import { globalScene } from "#app/global-scene";
import { EvolutionItem } from "#balance/pokemon-evolutions";
import { getApricornName } from "#data/apricorn";
import { getBerryEffectDescription, getBerryName } from "#data/berry";
import { CraftingLocation } from "#data/crafting/crafting-manager";
import { modifierTypes } from "#data/data-lists";
import { getPokeballName } from "#data/pokeball";
import { TerrainType } from "#data/terrain";
import type { ApricornType } from "#enums/apricorn-type";
import { BankCurrencyType } from "#enums/bank-currency-type";
import { BerryType } from "#enums/berry-type";
import { Button } from "#enums/buttons";
import { ExchangeCurrencyType } from "#enums/exchange-currency-type";
import { FormChangeItem } from "#enums/form-change-item";
import { GameModes } from "#enums/game-modes";
import { ModifierTier } from "#enums/modifier-tier";
import { PlayerGender } from "#enums/player-gender";
import { PokeballType } from "#enums/pokeball";
import type { PokemonType } from "#enums/pokemon-type";
import type { SpeciesId } from "#enums/species-id";
import { TextStyle } from "#enums/text-style";
import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#enums/trainer-variant";
import { UiMode } from "#enums/ui-mode";
import { Unlockables } from "#enums/unlockables";
import { PokemonHeldItemModifier } from "#modifiers/modifier";
import type { ModifierTypeOption } from "#modifiers/modifier-type";
import { getModifierTypeById, type ModifierType, type ModifierTypeGenerator } from "#modifiers/modifier-type";
import { buildRogueShopListings } from "#modifiers/rogue-shop-utils";
import { companionManager, getTrainerKnowhow } from "#system/companion-manager";
import { type QuestEntry, questManager } from "#system/quest-manager";
import { VoucherType } from "#system/voucher";
import { TrainerConfig } from "#trainers/trainer-config";
import type { PracticePresetData, Starter } from "#types/save-data";
import { MessageUiHandler } from "#ui/message-ui-handler";
import { PracticePresetSlotUiMode } from "#ui/practice-preset-slot-select-ui-handler";
import { addTextObject } from "#ui/text";
import { addWindow } from "#ui/ui-theme";
import { getPokemonSpecies } from "#utils/pokemon-utils";

/** 로그센터 이름만큼은 번역 로딩 순서와 무관하도록 한국어 modifier-type.json의 이름을 보존합니다. */
const ROGUE_SHOP_KO_NAME_MAP: Record<string, string> = {
  "ModifierType.MaxAllIvModifierType": "금색병뚜껑",
  "ModifierType.ChangeAbilityModifierType": "특성캡슐",
  "ModifierType.RegisterAbilityModifierType": "특성패치",
  "ModifierType.PokemonZMovePpRestoreModifierType": "Z회복",
  "ModifierType.PokemonMaxMovePpRestoreModifierType": "다이PP맥스",
  "ModifierType.PokemonBaseStatTotalModifierType": "단단지주스",
  "ModifierType.PokemonBaseStatFlatModifierType": "숲의양갱",
  "ModifierType.RARE_CANDY": "이상한사탕",
  "ModifierType.RARER_CANDY": "더이상한사탕",
  "ModifierType.MEGA_BRACELET": "메가링",
  "ModifierType.DYNAMAX_BAND": "다이맥스 밴드",
  "ModifierType.TERA_ORB": "테라스탈오브",
  "ModifierType.Z_RING": "Z링",
  "ModifierType.Z_POWER_RING": "Z파워링",
  "ModifierType.MAP": "지도",
  "ModifierType.POTION": "상처약",
  "ModifierType.SUPER_POTION": "좋은상처약",
  "ModifierType.HYPER_POTION": "고급상처약",
  "ModifierType.MAX_POTION": "풀회복약",
  "ModifierType.FULL_RESTORE": "회복약",
  "ModifierType.REVIVE": "기력의조각",
  "ModifierType.MAX_REVIVE": "기력의덩어리",
  "ModifierType.FULL_HEAL": "만병통치제",
  "ModifierType.SACRED_ASH": "성스러운분말",
  "ModifierType.REVIVER_SEED": "부활의씨앗",
  "ModifierType.WHITE_HERB": "하양허브",
  "ModifierType.WISHING_STAR": "소원의별",
  "ModifierType.DYNAMAX_CANDY": "다이맥스사탕",
  "ModifierType.ETHER": "PP에이드",
  "ModifierType.MAX_ETHER": "PP회복",
  "ModifierType.ELIXIR": "PP에이더",
  "ModifierType.MAX_ELIXIR": "PP맥스",
  "ModifierType.PP_UP": "포인트업",
  "ModifierType.PP_MAX": "포인트맥스",
  "ModifierType.LURE": "더블배틀코롱",
  "ModifierType.SUPER_LURE": "실버코롱",
  "ModifierType.MAX_LURE": "골드코롱",
  "ModifierType.MEMORY_MUSHROOM": "기억버섯",
  "ModifierType.EXP_SHARE": "학습장치",
  "ModifierType.EXP_BALANCE": "균형학습장치",
  "ModifierType.OVAL_CHARM": "둥근부적",
  "ModifierType.ARMORITE_ORE": "갑옷광석",
  "ModifierType.EXP_CHARM": "경험부적",
  "ModifierType.SUPER_EXP_CHARM": "좋은경험부적",
  "ModifierType.GOLDEN_EXP_CHARM": "황금경험부적",
  "ModifierType.LUCKY_EGG": "행복의알",
  "ModifierType.GOLDEN_EGG": "황금의알",
  "ModifierType.SOOTHE_BELL": "평온의방울",
  "ModifierType.SCOPE_LENS": "초점렌즈",
  "ModifierType.DIRE_HIT": "크리티컬커터",
  "ModifierType.LEEK": "대파",
  "ModifierType.TIDAL_BELL": "해명의방울",
  "ModifierType.CLEAR_BELL": "크리스탈방울",
  "ModifierType.EVIOLITE": "진화의휘석",
  "ModifierType.MIND_ORB": "마음의구슬",
  "ModifierType.MUSCLE_BAND": "힘의머리띠",
  "ModifierType.WISE_GLASSES": "박식안경",
  "ModifierType.EXPERT_BELT": "달인의띠",
  "ModifierType.METRONOME": "메트로놈",
  "ModifierType.LIFE_ORB": "생명의구슬",
  "ModifierType.SMOKE_BALL": "연막탄",
  "ModifierType.BRIGHT_POWDER": "반짝가루",
  "ModifierType.PROTECTIVE_PADS": "방호패드",
  "ModifierType.FOCUS_SASH": "기합의띠",
  "ModifierType.MENTAL_HERB": "멘탈허브",
  "ModifierType.ROCKY_HELMET": "울퉁불퉁멧",
  "ModifierType.WEAKNESS_POLICY": "약점보험",
  "ModifierType.CLEAR_AMULET": "클리어참",
  "ModifierType.ASSAULT_VEST": "돌격조끼",
  "ModifierType.CHOICE_SCARF": "구애스카프",
  "ModifierType.CHOICE_SPECS": "구애안경",
  "ModifierType.CHOICE_BAND": "구애머리띠",
  "ModifierType.SAFETY_GOGGLES": "방진고글",
  "ModifierType.PUNCHING_GLOVE": "펀치글러브",
  "ModifierType.COVERT_CLOAK": "은밀망토",
  "ModifierType.LOADED_DICE": "속임수주사위",
  "ModifierType.AIR_BALLOON": "풍선",
  "ModifierType.THROAT_SPRAY": "목스프레이",
  "ModifierType.LAGGING_TAIL": "느림보꼬리",
  "ModifierType.UTILITY_UMBRELLA": "만능우산",
  "ModifierType.LIGHT_CLAY": "빛의점토",
  "ModifierType.MIRROR_HERB": "흉내허브",
  "ModifierType.TREASURE_POUCH": "보물주머니",
  "ModifierType.CRITICAL_BAND": "크리티컬밴드",
  "ModifierType.COLORFUL_LENS": "칼라풀렌즈",
  "ModifierType.TECHNIC_ANKLET": "테크닉앵클릿",
  "ModifierType.RECOIL_BELT": "이판사판벨트",
  "ModifierType.MOLD_BREAKER_BRACER": "틀깨기벨트",
  "ModifierType.POWER_UP_WEIGHT": "파워업웨이트",
  "ModifierType.UNAWARE_BAND": "천진밴드",
  "ModifierType.SIMPLE_BAND": "단순한밴드",
  "ModifierType.POWER_HERB": "파워풀허브",
  "ModifierType.UNNERVE_INCENSE": "바들바들향로",
  "ModifierType.DAMP_INCENSE": "습기향로",
  "ModifierType.ODD_INCENSE": "괴상한향로",
  "ModifierType.SILVER_INCENSE": "은빛향로",
  "ModifierType.GOLDEN_INCENSE": "황금향로",
  "ModifierType.AROMA_INCENSE": "아로마향로",
  "ModifierType.SCRAPPY_BELT": "관통벨트",
  "ModifierType.ADAPTABILITY_BAND": "적응력밴드",
  "ModifierType.SHEER_FORCE_BAND": "우격다짐밴드",
  "ModifierType.ENIGMA_INCENSE": "수수깨끼향로",
  "ModifierType.STAT_STAGE_CHANGE_REVERSE_BAND": "내맘대로밴드",
  "ModifierType.MOODY_BAND": "변덕쟁이밴드",
  "ModifierType.EVOLUTION_INCENSE": "진화의향로",
  "ModifierType.STURDYSTONE_INCENSE": "멧집향로",
  "ModifierType.ROOM_SERVICE": "룸서비스",
  "ModifierType.BLUNDER_POLICY": "허탕보험",
  "ModifierType.ABILITY_SHIELD": "특성가드",
  "ModifierType.BOOSTER_ENERGY": "부스트에너지",
  "ModifierType.POWER_UP_DISK": "파워업디스크",
  "ModifierType.ULTRA_ENERGY": "울트라에너지",
  "ModifierType.VICTORY_SYMBOL": "승리의배지",
  "ModifierType.CURSED_BOWL": "저주받은그릇",
  "ModifierType.CURSED_SWORD": "저주받은검",
  "ModifierType.CURSED_BOOK": "저주받은서",
  "ModifierType.CURSED_BEAD": "저주받은구슬",
  "ModifierType.SHARPNESS_SWORD": "예리한칼",
  "ModifierType.POWER_TEETH": "파워틀니",
  "ModifierType.POWER_HELMET": "파워헬멧",
  "ModifierType.HORN_HELMET": "뿔투구",
  "ModifierType.POWER_PROTECTOR": "파워보호대",
  "ModifierType.SPIKE_SPEAR": "뾰족한 창",
  "ModifierType.POWER_FEATHER": "파워깃털",
  "ModifierType.MIGHTY_HAMMER": "마이티해머",
  "ModifierType.POWER_CLAW": "파워발톱",
  "ModifierType.POWER_PINCH": "파워집게",
  "ModifierType.HARDEN_BEAK": "단단한부리",
  "ModifierType.FAST_BOOTS": "쾌속부츠",
  "ModifierType.SPIN_TOP": "회오리팽이",
  "ModifierType.POWER_DRILL": "파워드릴",
  "ModifierType.POWER_ROPE": "파워로프",
  "ModifierType.POWER_WHEEL": "파워타이어",
  "ModifierType.POWER_TAIL": "튼튼한꼬리",
  "ModifierType.POWER_BOW": "만능활",
  "ModifierType.POWER_BEADS": "파워구슬",
  "ModifierType.POWER_BOOMERANG": "파워부메랑",
  "ModifierType.THROW_GLOVE": "파워글러브",
  "ModifierType.PULSE_ORB": "파동의구슬",
  "ModifierType.RAZORPOINTER": "레이저포인터",
  "ModifierType.POWER_LANTERN": "파워랜턴",
  "ModifierType.PUNK_MIKE": "펑크마이크",
  "ModifierType.POWER_FAN": "만능부채",
  "ModifierType.HULAHULA_SKIRT": "훌라훌라스커트",
  "ModifierType.BIG_ROOT": "큰뿌리",
  "ModifierType.POWER_SHELL": "만능조개껍질",
  "ModifierType.CHAMPION_BELT": "천하장사벨트",
  "ModifierType.SCHOLAR_TOME": "박학다식도감",
  "ModifierType.NUGGET": "금구슬",
  "ModifierType.BIG_NUGGET": "큰금구슬",
  "ModifierType.RELIC_GOLD": "고대의금화",
  "ModifierType.AMULET_COIN": "부적금화",
  "ModifierType.GOLDEN_PUNCH": "골든펀치",
  "ModifierType.COIN_CASE": "동전케이스",
  "ModifierType.LOCK_CAPSULE": "록캡슐",
  "ModifierType.GRIP_CLAW": "끈기갈고리손톱",
  "ModifierType.WIDE_LENS": "광각렌즈",
  "ModifierType.MULTI_LENS": "멀티렌즈",
  "ModifierType.HEALING_CHARM": "치유의부적",
  "ModifierType.CANDY_JAR": "사탕단지",
  "ModifierType.BERRY_POUCH": "열매주머니",
  "ModifierType.STRANGE_BOX": "이상한박스",
  "ModifierType.FOCUS_BAND": "기합의머리띠",
  "ModifierType.QUICK_CLAW": "선제공격손톱",
  "ModifierType.KINGS_ROCK": "왕의징표석",
  "ModifierType.LEFTOVERS": "먹다남은음식",
  "ModifierType.SHELL_BELL": "조개껍질방울",
  "ModifierType.TOXIC_ORB": "맹독구슬",
  "ModifierType.FLAME_ORB": "화염구슬",
  "ModifierType.FREEZE_ORB": "서리구슬",
  "ModifierType.MYSTIC_SCALE": "신비한비늘",
  "ModifierType.MYSTICAL_ROCK": "신비한바위",
  "ModifierType.WICKED_GLOVE": "일격의글러브",
  "ModifierType.BLACK_MANE_HAIR": "검은갈기",
  "ModifierType.WHITE_MANE_HAIR": "하얀갈기",
  "ModifierType.SURGING_GLOVE": "연격의글러브",
  "ModifierType.WARRIOR_SWORD": "역전의보검",
  "ModifierType.WARRIOR_SHIELD": "역전의방패",
  "ModifierType.ANGE_ORB": "앙쥬오브",
  "ModifierType.LEGEND_PLATE": "레전드플레이트",
  "ModifierType.DUSK_BEAD": "황혼의비드로",
  "ModifierType.DAWN_BEAD": "새벽의비드로",
  "ModifierType.BLIGHT_BEAD": "광명의비드로",
  "ModifierType.EVOLUTION_TRACKER_GIMMIGHOUL": "보물",
  "ModifierType.BATON": "배턴",
  "ModifierType.SHINY_CHARM": "빛나는부적",
  "ModifierType.MARK_CHARM": "증표의부적",
  "ModifierType.ABILITY_CHARM": "특성부적",
  "ModifierType.CATCHING_CHARM": "흔들림없는부적",
  "ModifierType.IV_SCANNER": "개체값탐지기",
  "ModifierType.DNA_SPLICERS": "유전자쐐기",
  "ModifierType.MINI_BLACK_HOLE": "미니 블랙홀",
  "ModifierType.GOLDEN_POKEBALL": "황금몬스터볼",
  "ModifierType.ENEMY_DAMAGE_BOOSTER": "데미지 토큰",
  "ModifierType.ENEMY_DAMAGE_REDUCTION": "보호 토큰",
  "ModifierType.ENEMY_HEAL": "회복 토큰",
  "ModifierType.ENEMY_ATTACK_POISON_CHANCE": "독 토큰",
  "ModifierType.ENEMY_ATTACK_PARALYZE_CHANCE": "마비 토큰",
  "ModifierType.ENEMY_ATTACK_BURN_CHANCE": "화상 토큰",
  "ModifierType.ENEMY_STATUS_EFFECT_HEAL_CHANCE": "만병통치 토큰",
  "ModifierType.ENEMY_ENDURE_CHANCE": "버티기 토큰",
  "ModifierType.ENEMY_FUSED_CHANCE": "합체 토큰",
  "ModifierType.MYSTERY_ENCOUNTER_SHUCKLE_JUICE": "단단지주스",
  "ModifierType.MYSTERY_ENCOUNTER_BLACK_SLUDGE": "검은진흙",
  "ModifierType.MYSTERY_ENCOUNTER_MACHO_BRACE": "교정깁스",
  "ModifierType.MYSTERY_ENCOUNTER_OLD_GATEAU": "숲의양갱",
  "ModifierType.MYSTERY_ENCOUNTER_GOLDEN_BUG_NET": "황금잠자리채",
  "SpeciesBoosterItem.LIGHT_BALL": "전기구슬",
  "SpeciesBoosterItem.THICK_CLUB": "굵은뼈",
  "SpeciesBoosterItem.RARE_BONE": "귀중한뼈",
  "SpeciesBoosterItem.METAL_POWDER": "금속파우더",
  "SpeciesBoosterItem.QUICK_POWDER": "스피드파우더",
  "SpeciesBoosterItem.ADAMANT_ORB": "금강옥",
  "SpeciesBoosterItem.LUSTROUS_ORB": "백옥",
  "SpeciesBoosterItem.GRISEOUS_ORB": "백금옥",
  "SpeciesBoosterItem.DEEP_SEA_SCALE": "심해의비늘",
  "SpeciesBoosterItem.DEEP_SEA_TOOTH": "심해의이빨",
  "SpeciesBoosterItem.HELIX_FOSSIL": "조개화석",
  "SpeciesBoosterItem.DOME_FOSSIL": "껍질화석",
  "SpeciesBoosterItem.OLD_AMBER": "비밀의호박",
  "SpeciesBoosterItem.ROOT_FOSSIL": "뿌리화석",
  "SpeciesBoosterItem.CLAW_FOSSIL": "발톱화석",
  "SpeciesBoosterItem.SKULL_FOSSIL": "두개의화석",
  "SpeciesBoosterItem.ARMOR_FOSSIL": "방패화석",
  "SpeciesBoosterItem.COVER_FOSSIL": "덮개화석",
  "SpeciesBoosterItem.PLUME_FOSSIL": "깃털화석",
  "SpeciesBoosterItem.JAW_FOSSIL": "턱화석",
  "SpeciesBoosterItem.SAIL_FOSSIL": "지느러미화석",
  "SpeciesBoosterItem.FOSSILIZED_BIRD": "화석새",
  "SpeciesBoosterItem.FOSSILIZED_DINO": "화석용",
  "SpeciesBoosterItem.FOSSILIZED_DRAKE": "화석물고기",
  "SpeciesBoosterItem.FOSSILIZED_FISH": "화석긴목",
  "SpeciesBoosterItem.LIGHT_STONE": "라이트스톤",
  "SpeciesBoosterItem.DARK_STONE": "다크스톤",
  "SpeciesBoosterItem.GOD_STONE": "갓스톤",
  "SpeciesBoosterItem.ODD_KEYSTONE": "쐐기돌",
  "SpeciesBoosterItem.MOON_FLUTE": "달의피리",
  "SpeciesBoosterItem.SUN_FLUTE": "태양의피리",
  "SpeciesBoosterItem.SILVER_WING": "은빛날개",
  "SpeciesBoosterItem.RAINBOW_WING": "무지갯빛깃털",
  "SpeciesBoosterItem.SOUL_DEW": "마음의물방울",
  "SpeciesBoosterItem.MAGMA_STONE": "화산의돌",
  "SpeciesBoosterItem.LIFES_FLOWER": "생명의꽃",
  "SpeciesBoosterItem.OBLIVION_WINGS": "파괴의날개",
  "SpeciesBoosterItem.ZYGARDE_CUBE": "지가르데큐브",
  "SpeciesBoosterItem.ENIGMA_STONE": "수수께끼수정",
  "SpeciesBoosterItem.ALPHA_SAPPHIRE": "근원의사파이어",
  "SpeciesBoosterItem.OMEGA_RUBY": "최후의루비",
  "SpeciesBoosterItem.DELTA_FLUTE": "델타플루트",
  "SpeciesBoosterItem.ICEROOT_CARROT": "차가운당근",
  "SpeciesBoosterItem.SHADEROOT_CARROT": "검은당근",
  "SpeciesBoosterItem.METEORITE_SHARD": "소원의조각",
  "SpeciesBoosterItem.METEORITE": "운석",
  "SpeciesBoosterItem.NORMAL_MEMORY": "노말메모리",
  "SpeciesBoosterItem.BLANK_PLATE": "순백플레이트",
  "SpeciesBoosterItem.RADIANT_PETAL": "황제의꽃",
  "SpeciesBoosterItem.BLIZZARD_FEATHER": "눈보라깃털",
  "SpeciesBoosterItem.THUNDER_FEATHER": "천둥의깃털",
  "SpeciesBoosterItem.BLAZE_FEATHER": "불사의깃털",
  "SpeciesBoosterItem.MUTATION_SAMPLE": "파괴의샘플",
  "SpeciesBoosterItem.NEO_SAMPLE": "신종샘플",
  "SpeciesBoosterItem.LIGHTNING_MANE": "우레갈기",
  "SpeciesBoosterItem.MAGMA_MANE": "용암갈기",
  "SpeciesBoosterItem.AURORA_MANE": "오로라갈기",
  "SpeciesBoosterItem.GREEN_WATCH": "심록의회중시계",
  "SpeciesBoosterItem.ROCK_MILESTONE": "바위점자판",
  "SpeciesBoosterItem.ICE_MILESTONE": "얼음점자판",
  "SpeciesBoosterItem.STEEL_MILESTONE": "무쇠점자판",
  "SpeciesBoosterItem.KNOWLEDGE_GEM": "지식의보석",
  "SpeciesBoosterItem.EMOTION_GEM": "감정의보석",
  "SpeciesBoosterItem.WILLPOWER_GEM": "의지의보석",
  "SpeciesBoosterItem.GIANT_MILESTONE": "거대점자판",
  "SpeciesBoosterItem.LUNAR_WING": "초승달깃털",
  "SpeciesBoosterItem.RAPIDS_SYMBOL": "여울의심볼",
  "SpeciesBoosterItem.WAVE_SYMBOL": "파랑의심볼",
  "SpeciesBoosterItem.NIGHTMARE_SYMBOLE": "악몽의심볼",
  "SpeciesBoosterItem.COBALT_SWORD": "코발트소드",
  "SpeciesBoosterItem.TERRACOTTA_AXE": "테라코타액스",
  "SpeciesBoosterItem.VIRIDIAN_KNIFE": "비리디안나이프",
  "SpeciesBoosterItem.CYCLONE_FAN": "선풍부채",
  "SpeciesBoosterItem.BOLT_STRIKE_FAN": "천둥바람부채",
  "SpeciesBoosterItem.ABUNDANCE_FAN": "풍요부채",
  "SpeciesBoosterItem.SPRINGTIDE_FAN": "봄바람부채",
  "SpeciesBoosterItem.RESOLVE_BLADE": "각오의칼날",
  "SpeciesBoosterItem.MELODY_SYMBOL": "멜로디심볼",
  "SpeciesBoosterItem.GENE_DRIVE": "게놈카세트",
  "SpeciesBoosterItem.VOLCANIC_RING": "마그마링",
  "SpeciesBoosterItem.KOKO_FLOWER": "뇌신의꽃",
  "SpeciesBoosterItem.LELE_FLOWER": "치유의꽃",
  "SpeciesBoosterItem.BULU_FLOWER": "심원의꽃",
  "SpeciesBoosterItem.FINI_FLOWER": "저너머의꽃",
  "SpeciesBoosterItem.PRISM_CORE": "프리즘코어",
  "SpeciesBoosterItem.ANTIQUE_GEAR": "고대의기어하트",
  "SpeciesBoosterItem.SHADE_CAPE": "그림자망토",
  "SpeciesBoosterItem.THUNDERCLAP_CLAW": "신뢰의발톱",
  "SpeciesBoosterItem.ANTIQUE_NUT": "이상한고대너트",
  "SpeciesBoosterItem.WARRIOR_SWORD": "역전의보검",
  "SpeciesBoosterItem.WARRIOR_SHIELD": "역전의방패",
  "SpeciesBoosterItem.ETERNAL_HOLE": "무한다이오브",
  "SpeciesBoosterItem.WUSHU_BELT": "궁극의허리띠",
  "SpeciesBoosterItem.JUNGLE_CAPE": "심원의망토",
  "SpeciesBoosterItem.ELEKI_MILESTONE": "전자점자판",
  "SpeciesBoosterItem.DRAGO_MILESTONE": "마룡점자판",
  "SpeciesBoosterItem.SCALET_SCALE": "진홍빛비늘",
  "SpeciesBoosterItem.HADRON_SCALE": "하드론비늘",
  "SpeciesBoosterItem.MALIGNANT_CHAINS": "악독한사슬",
  "SpeciesBoosterItem.CRYSTAL_CLUSTER": "감청빛크리스탈",
  "SpeciesBoosterItem.REDMOON_STONE": "붉은달의돌",
  "SpeciesBoosterItem.CRUEL_FEATHER": "냉정한깃털",
  "SpeciesBoosterItem.STRONG_FEATHER": "강력한깃털",
  "SpeciesBoosterItem.MALEVOLENT_FEATHER": "사악한깃털",
  "SpeciesBoosterItem.ODD_JAR": "괴상한항아리",
  "SpeciesBoosterItem.MYTHICAL_PECHA_BERRY": "환상복슝",
  "TempStatStageBoosterItem.x_attack": "플러스파워",
  "TempStatStageBoosterItem.x_defense": "디펜드업",
  "TempStatStageBoosterItem.x_sp_atk": "스페셜업",
  "TempStatStageBoosterItem.x_sp_def": "스페셜가드",
  "TempStatStageBoosterItem.x_speed": "스피드업",
  "TempStatStageBoosterItem.x_accuracy": "잘-맞히기",
  "WeatherRockTrainer.heat_rock": "뜨거운바위",
  "WeatherRockTrainer.damp_rock": "축축한바위",
  "WeatherRockTrainer.smooth_rock": "보송보송바위",
  "WeatherRockTrainer.icy_rock": "차가운바위",
  "TerrainSeedTrainer.misty_seed": "미스트시드",
  "TerrainSeedTrainer.electric_seed": "일렉트릭시드",
  "TerrainSeedTrainer.grassy_seed": "그래스시드",
  "TerrainSeedTrainer.psychic_seed": "사이코시드",
  "AttackTypeBoosterItem.silk_scarf": "실크스카프",
  "AttackTypeBoosterItem.black_belt": "검은띠",
  "AttackTypeBoosterItem.sharp_beak": "예리한부리",
  "AttackTypeBoosterItem.poison_barb": "독바늘",
  "AttackTypeBoosterItem.soft_sand": "부드러운모래",
  "AttackTypeBoosterItem.hard_stone": "딱딱한돌",
  "AttackTypeBoosterItem.silver_powder": "은빛가루",
  "AttackTypeBoosterItem.spell_tag": "저주의부적",
  "AttackTypeBoosterItem.metal_coat": "금속코트",
  "AttackTypeBoosterItem.charcoal": "목탄",
  "AttackTypeBoosterItem.mystic_water": "신비의물방울",
  "AttackTypeBoosterItem.miracle_seed": "기적의씨",
  "AttackTypeBoosterItem.magnet": "자석",
  "AttackTypeBoosterItem.twisted_spoon": "휘어진스푼",
  "AttackTypeBoosterItem.never_melt_ice": "녹지않는얼음",
  "AttackTypeBoosterItem.dragon_fang": "용의이빨",
  "AttackTypeBoosterItem.black_glasses": "검은안경",
  "AttackTypeBoosterItem.fairy_feather": "요정의깃털",
  "exclusiveZMoves.pikanium_z": "피카츄Z",
  "exclusiveZMoves.decidium_z": "모크나이퍼Z",
  "exclusiveZMoves.incinium_z": "어흥염Z",
  "exclusiveZMoves.primarium_z": "누리레느Z",
  "exclusiveZMoves.tapunium_z": "카푸Z",
  "exclusiveZMoves.marshadium_z": "마샤도Z",
  "exclusiveZMoves.aloraichium_z": "알로라이Z",
  "exclusiveZMoves.snorlium_z": "잠만보Z",
  "exclusiveZMoves.eevium_z": "이브이Z",
  "exclusiveZMoves.mewnium_z": "뮤Z",
  "exclusiveZMoves.pikashunium_z": "지우피카Z",
  "exclusiveZMoves.solium_z": "솔가레오Z",
  "exclusiveZMoves.lunarium_z": "루나아라Z",
  "exclusiveZMoves.mimikium_z": "따라큐Z",
  "exclusiveZMoves.lycanium_z": "루가루암Z",
  "exclusiveZMoves.kommonium_z": "짜랑고우거Z",
  "exclusiveZMoves.ultranecrozium_z": "울트라네크로Z",
  "TypeSpecificMoveBoosterItem.normal_gem": "노말주얼",
  "TypeSpecificMoveBoosterItem.fighting_gem": "격투주얼",
  "TypeSpecificMoveBoosterItem.flying_gem": "비행주얼",
  "TypeSpecificMoveBoosterItem.poison_gem": "독주얼",
  "TypeSpecificMoveBoosterItem.ground_gem": "땅주얼",
  "TypeSpecificMoveBoosterItem.rock_gem": "바위주얼",
  "TypeSpecificMoveBoosterItem.bug_gem": "벌레주얼",
  "TypeSpecificMoveBoosterItem.ghost_gem": "고스트주얼",
  "TypeSpecificMoveBoosterItem.steel_gem": "강철주얼",
  "TypeSpecificMoveBoosterItem.fire_gem": "불꽃주얼",
  "TypeSpecificMoveBoosterItem.water_gem": "물주얼",
  "TypeSpecificMoveBoosterItem.grass_gem": "풀주얼",
  "TypeSpecificMoveBoosterItem.electric_gem": "전기주얼",
  "TypeSpecificMoveBoosterItem.psychic_gem": "에스퍼주얼",
  "TypeSpecificMoveBoosterItem.ice_gem": "얼음주얼",
  "TypeSpecificMoveBoosterItem.dragon_gem": "드래곤주얼",
  "TypeSpecificMoveBoosterItem.dark_gem": "악주얼",
  "TypeSpecificMoveBoosterItem.fairy_gem": "페어리주얼",
  "BaseStatBoosterItem.hp_up": "맥스업",
  "BaseStatBoosterItem.protein": "타우린",
  "BaseStatBoosterItem.iron": "사포닌",
  "BaseStatBoosterItem.calcium": "리보플라빈",
  "BaseStatBoosterItem.zinc": "키토산",
  "BaseStatBoosterItem.carbos": "알칼로이드",
  "EvolutionItem.LINKING_CORD": "연결의끈",
  "EvolutionItem.SUN_STONE": "태양의돌",
  "EvolutionItem.MOON_STONE": "달의돌",
  "EvolutionItem.LEAF_STONE": "리프의돌",
  "EvolutionItem.FIRE_STONE": "불꽃의돌",
  "EvolutionItem.WATER_STONE": "물의돌",
  "EvolutionItem.THUNDER_STONE": "천둥의돌",
  "EvolutionItem.ICE_STONE": "얼음의돌",
  "EvolutionItem.DUSK_STONE": "어둠의돌",
  "EvolutionItem.DAWN_STONE": "각성의돌",
  "EvolutionItem.SHINY_STONE": "빛의돌",
  "EvolutionItem.CRACKED_POT": "깨진포트",
  "EvolutionItem.SWEET_APPLE": "달콤한사과",
  "EvolutionItem.TART_APPLE": "새콤한사과",
  "EvolutionItem.STRAWBERRY_SWEET": "딸기사탕공예",
  "EvolutionItem.UNREMARKABLE_TEACUP": "범작찻잔",
  "EvolutionItem.UPGRADE": "업그레이드",
  "EvolutionItem.DUBIOUS_DISC": "괴상한패치",
  "EvolutionItem.DRAGON_SCALE": "용의비늘",
  "EvolutionItem.PRISM_SCALE": "고운비늘",
  "EvolutionItem.RAZOR_CLAW": "예리한손톱",
  "EvolutionItem.RAZOR_FANG": "예리한이빨",
  "EvolutionItem.REAPER_CLOTH": "영계의천",
  "EvolutionItem.ELECTIRIZER": "에레키부스터",
  "EvolutionItem.MAGMARIZER": "마그마부스터",
  "EvolutionItem.PROTECTOR": "프로텍터",
  "EvolutionItem.SACHET": "향기주머니",
  "EvolutionItem.WHIPPED_DREAM": "휘핑크림",
  "EvolutionItem.LEADERS_CREST": "대장의징표",
  "EvolutionItem.CHIPPED_POT": "이빠진포트",
  "EvolutionItem.BLACK_AUGURITE": "검은휘석",
  "EvolutionItem.GALARICA_CUFF": "가라두구팔찌",
  "EvolutionItem.GALARICA_WREATH": "가라두구머리장식",
  "EvolutionItem.PEAT_BLOCK": "피트블록",
  "EvolutionItem.AUSPICIOUS_ARMOR": "축복받은갑옷",
  "EvolutionItem.MALICIOUS_ARMOR": "저주받은갑옷",
  "EvolutionItem.MASTERPIECE_TEACUP": "걸작찻잔",
  "EvolutionItem.METAL_ALLOY": "복합금속",
  "EvolutionItem.SCROLL_OF_DARKNESS": "악의 족자",
  "EvolutionItem.SCROLL_OF_WATERS": "물의 족자",
  "EvolutionItem.SYRUPY_APPLE": "꿀맛사과",
  "EvolutionItem.OVAL_STONE": "동글동글돌",
  "FormChangeItem.ABOMASITE": "눈설왕나이트",
  "FormChangeItem.ABSOLITE": "앱솔나이트",
  "FormChangeItem.AERODACTYLITE": "프테라나이트",
  "FormChangeItem.AGGRONITE": "보스로라나이트",
  "FormChangeItem.ALAKAZITE": "후딘나이트",
  "FormChangeItem.ALTARIANITE": "파비코리나이트",
  "FormChangeItem.AMPHAROSITE": "전룡나이트",
  "FormChangeItem.AUDINITE": "다부니나이트",
  "FormChangeItem.BANETTITE": "다크펫나이트",
  "FormChangeItem.BEEDRILLITE": "독침붕나이트",
  "FormChangeItem.BLASTOISINITE": "거북왕나이트",
  "FormChangeItem.BLAZIKENITE": "번치코나이트",
  "FormChangeItem.CAMERUPTITE": "폭타나이트",
  "FormChangeItem.CHARIZARDITE_X": "리자몽나이트 X",
  "FormChangeItem.CHARIZARDITE_Y": "리자몽나이트 Y",
  "FormChangeItem.DIANCITE": "디안시나이트",
  "FormChangeItem.GALLADITE": "엘레이드나이트",
  "FormChangeItem.GARCHOMPITE": "한카리아스나이트",
  "FormChangeItem.GARDEVOIRITE": "가디안나이트",
  "FormChangeItem.GENGARITE": "팬텀나이트",
  "FormChangeItem.GLALITITE": "얼음귀신나이트",
  "FormChangeItem.GYARADOSITE": "갸라도스나이트",
  "FormChangeItem.HERACRONITE": "헤라크로스나이트",
  "FormChangeItem.HOUNDOOMINITE": "헬가나이트",
  "FormChangeItem.KANGASKHANITE": "캥카나이트",
  "FormChangeItem.LATIASITE": "라티아스나이트",
  "FormChangeItem.LATIOSITE": "라티오스나이트",
  "FormChangeItem.LOPUNNITE": "이어롭나이트",
  "FormChangeItem.LUCARIONITE": "루카리오나이트",
  "FormChangeItem.MANECTITE": "썬더볼트나이트",
  "FormChangeItem.MAWILITE": "입치트나이트",
  "FormChangeItem.MEDICHAMITE": "요가램나이트",
  "FormChangeItem.METAGROSSITE": "메타그로스나이트",
  "FormChangeItem.MEWTWONITE_X": "뮤츠나이트 X",
  "FormChangeItem.MEWTWONITE_Y": "뮤츠나이트 Y",
  "FormChangeItem.PIDGEOTITE": "피죤투나이트",
  "FormChangeItem.PINSIRITE": "쁘사이저나이트",
  "FormChangeItem.RAYQUAZITE": "레쿠쟈나이트",
  "FormChangeItem.SABLENITE": "깜까미나이트",
  "FormChangeItem.SALAMENCITE": "보만다나이트",
  "FormChangeItem.SCEPTILITE": "나무킹나이트",
  "FormChangeItem.SCIZORITE": "핫삼나이트",
  "FormChangeItem.SHARPEDONITE": "샤크니아나이트",
  "FormChangeItem.SLOWBRONITE": "야도란나이트",
  "FormChangeItem.STEELIXITE": "강철톤나이트",
  "FormChangeItem.SWAMPERTITE": "대짱이나이트",
  "FormChangeItem.TYRANITARITE": "마기라스나이트",
  "FormChangeItem.VENUSAURITE": "이상해꽃나이트",
  "FormChangeItem.CLEFABLITE": "픽시나이트",
  "FormChangeItem.VICTREEBELITE": "우츠보트나이트",
  "FormChangeItem.STARMINITE": "아쿠스타나이트",
  "FormChangeItem.DRAGONINITE": "망나뇽나이트",
  "FormChangeItem.MEGANIUMITE": "메가니움나이트",
  "FormChangeItem.FERALIGITE": "장크로다일나이트",
  "FormChangeItem.SKARMORITE": "무장조나이트",
  "FormChangeItem.FROSLASSITE": "눈여아나이트",
  "FormChangeItem.EMBOARITE": "염무왕나이트",
  "FormChangeItem.EXCADRITE": "몰드류나이트",
  "FormChangeItem.SCOLIPITE": "펜드라나이트",
  "FormChangeItem.SCRAFTINITE": "곤율거니나이트",
  "FormChangeItem.EELEKTROSSITE": "저리더프나이트",
  "FormChangeItem.CHANDELURITE": "샹델라나이트",
  "FormChangeItem.CHESNAUGHTITE": "브리가론나이트",
  "FormChangeItem.DELPHOXITE": "마폭시나이트",
  "FormChangeItem.GRENINJITE": "개굴닌자나이트",
  "FormChangeItem.PYROARITE": "화염레오나이트",
  "FormChangeItem.FLOETTITE": "플라엣테나이트",
  "FormChangeItem.MALAMARITE": "칼라마네로나이트",
  "FormChangeItem.BARBARACITE": "거북손데스나이트",
  "FormChangeItem.DRAGALGITE": "드래캄나이트",
  "FormChangeItem.HAWLUCHANITE": "루차불나이트",
  "FormChangeItem.ZYGARDITE": "지가르데나이트",
  "FormChangeItem.DRAMPANITE": "할비롱나이트",
  "FormChangeItem.FALINKSITE": "대여르나이트",
  "FormChangeItem.HEATRANITE": "히드런나이트",
  "FormChangeItem.DARKRANITE": "다크라이나이트",
  "FormChangeItem.ZERAORITE": "제라오라나이트",
  "FormChangeItem.RAICHUNITE_X": "라이츄나이트 X",
  "FormChangeItem.RAICHUNITE_Y": "라이츄나이트 Y",
  "FormChangeItem.CHIMECHITE": "치렁나이트",
  "FormChangeItem.ABSOLITE_Z": "앱솔나이트Z",
  "FormChangeItem.STARAPTITE": "찌르호크나이트",
  "FormChangeItem.GARCHOMPITE_Z": "한카리아스나이트Z",
  "FormChangeItem.LUCARIONITE_Z": "루카리오나이트Z",
  "FormChangeItem.GOLURKITE": "골루그나이트",
  "FormChangeItem.MEOWSTICITE": "냐오닉스나이트",
  "FormChangeItem.CRABOMINITE": "모단단게나이트",
  "FormChangeItem.GOLISOPITE": "갑주무사나이트",
  "FormChangeItem.MAGEARNITE": "마기아나이트",
  "FormChangeItem.SCOVILLAINITE": "스코빌런나이트",
  "FormChangeItem.BAXCALIBRITE": "드닐레이브나이트",
  "FormChangeItem.TATSUGIRINITE": "싸리용나이트",
  "FormChangeItem.GLIMMORANITE": "킬라플로르나이트",
  "FormChangeItem.BLUE_ORB": "쪽빛구슬",
  "FormChangeItem.RED_ORB": "주홍구슬",
  "FormChangeItem.SHARP_METEORITE": "뾰족한운석",
  "FormChangeItem.HARD_METEORITE": "단단한운석",
  "FormChangeItem.SMOOTH_METEORITE": "부드러운운석",
  "FormChangeItem.ADAMANT_CRYSTAL": "큰금강옥",
  "FormChangeItem.LUSTROUS_GLOBE": "큰백옥",
  "FormChangeItem.GRISEOUS_CORE": "큰백금옥",
  "FormChangeItem.REVEAL_GLASS": "비추는거울",
  "FormChangeItem.GRACIDEA": "그라시데아꽃",
  "FormChangeItem.MAX_MUSHROOMS": "다이버섯",
  "FormChangeItem.MAX_HONEY": "다이꿀",
  "FormChangeItem.DARK_SPLICERS": "이상의쐐기",
  "FormChangeItem.LIGHT_SPLICERS": "진실의쐐기",
  "FormChangeItem.PRISON_BOTTLE": "굴레의항아리",
  "FormChangeItem.N_LUNARIZER": "네크로플러스루나",
  "FormChangeItem.N_SOLARIZER": "네크로플러스솔",
  "FormChangeItem.RUSTED_SWORD": "녹슨검",
  "FormChangeItem.RUSTED_SHIELD": "녹슨방패",
  "FormChangeItem.ICY_REINS_OF_UNITY": "차가운유대의고삐",
  "FormChangeItem.SHADOW_REINS_OF_UNITY": "검은유대의고삐",
  "FormChangeItem.WELLSPRING_MASK": "우물의가면",
  "FormChangeItem.HEARTHFLAME_MASK": "화덕의가면",
  "FormChangeItem.CORNERSTONE_MASK": "주춧돌의가면",
  "FormChangeItem.SHOCK_DRIVE": "번개카세트",
  "FormChangeItem.BURN_DRIVE": "블레이즈카세트",
  "FormChangeItem.CHILL_DRIVE": "프리즈카세트",
  "FormChangeItem.DOUSE_DRIVE": "아쿠아카세트",
  "FormChangeItem.FIST_PLATE": "주먹플레이트",
  "FormChangeItem.SKY_PLATE": "푸른하늘플레이트",
  "FormChangeItem.TOXIC_PLATE": "맹독플레이트",
  "FormChangeItem.EARTH_PLATE": "대지플레이트",
  "FormChangeItem.STONE_PLATE": "암석플레이트",
  "FormChangeItem.INSECT_PLATE": "비단벌레플레이트",
  "FormChangeItem.SPOOKY_PLATE": "원령플레이트",
  "FormChangeItem.IRON_PLATE": "강철플레이트",
  "FormChangeItem.FLAME_PLATE": "불구슬플레이트",
  "FormChangeItem.SPLASH_PLATE": "물방울플레이트",
  "FormChangeItem.MEADOW_PLATE": "초록플레이트",
  "FormChangeItem.ZAP_PLATE": "우뢰플레이트",
  "FormChangeItem.MIND_PLATE": "이상한플레이트",
  "FormChangeItem.ICICLE_PLATE": "고드름플레이트",
  "FormChangeItem.DRACO_PLATE": "용의플레이트",
  "FormChangeItem.DREAD_PLATE": "공포플레이트",
  "FormChangeItem.PIXIE_PLATE": "정령플레이트",
  "FormChangeItem.BLANK_PLATE": "순백플레이트",
  "FormChangeItem.LEGEND_PLATE": "레전드플레이트",
  "FormChangeItem.FIGHTING_MEMORY": "파이팅메모리",
  "FormChangeItem.FLYING_MEMORY": "플라잉메모리",
  "FormChangeItem.POISON_MEMORY": "포이즌메모리",
  "FormChangeItem.GROUND_MEMORY": "그라운드메모리",
  "FormChangeItem.ROCK_MEMORY": "록메모리",
  "FormChangeItem.BUG_MEMORY": "버그메모리",
  "FormChangeItem.GHOST_MEMORY": "고스트메모리",
  "FormChangeItem.STEEL_MEMORY": "스틸메모리",
  "FormChangeItem.FIRE_MEMORY": "파이어메모리",
  "FormChangeItem.WATER_MEMORY": "워터메모리",
  "FormChangeItem.GRASS_MEMORY": "그래스메모리",
  "FormChangeItem.ELECTRIC_MEMORY": "일렉트릭메모리",
  "FormChangeItem.PSYCHIC_MEMORY": "사이킥메모리",
  "FormChangeItem.ICE_MEMORY": "아이스메모리",
  "FormChangeItem.DRAGON_MEMORY": "드래곤메모리",
  "FormChangeItem.DARK_MEMORY": "다크메모리",
  "FormChangeItem.FAIRY_MEMORY": "페어리메모리",
  "FormChangeItem.NORMAL_MEMORY": "일반메모리",
};

export type RogueShopTab =
  | "SHOP"
  | "BANK"
  | "STORAGE"
  | "QUEST"
  | "PRACTICE"
  | "WORKSHOP"
  | "MINE"
  | "MEETING"
  | "CAFE"
  | "BRIEFING"
  | "HEADQUARTERS";

/** 표시 전용: 은행 금액을 K/M 단위로 소수 첫째 자리까지 버림. 원본 수치는 변경하지 않습니다. */
export function formatRogueBankAmount(value: number): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return "0";
  }
  const abs = Math.abs(amount);
  if (abs < 1000) {
    return Math.trunc(amount).toLocaleString("en-US");
  }
  const unit = abs >= 1_000_000 ? 1_000_000 : 1000;
  const suffix = unit === 1_000_000 ? "M" : "K";
  const truncated = Math.trunc((amount / unit) * 10) / 10;
  return `${truncated}${suffix}`;
}

/** 일반 소지 금액은 축약하지 않고 3자리마다 쉼표로 구분합니다. */
export function formatRogueOwnedAmount(value: number): string {
  const amount = Number(value ?? 0);
  return (Number.isFinite(amount) ? Math.trunc(amount) : 0).toLocaleString("en-US");
}

export interface RogueShopBankData {
  roguePoints: number;
  gold: number;
  bankRoguePoints: number;
  bankGold: number;
}

export type QuestStatus = "AVAILABLE" | "ACCEPTED" | "COMPLETED" | "REPORTED";

export interface RogueShopStorageEntry {
  id: string;
  name: string;
  quantity: number;
  description: string;
  purchaseMode: "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT";
  option?: ModifierTypeOption;
}

export interface RogueShopUiArgs {
  onExit?: () => void;
  onStartRun?: () => void;

  source?: "TITLE" | "MENU" | "STARTER_SELECT";
  starters?: Starter[];

  limitedMode?: boolean;
  allowShop?: boolean;
  allowBank?: boolean;
  allowStorage?: boolean;
  allowQuest?: boolean;
  allowWorkshop?: boolean;
  allowPreRunPurchase?: boolean;
  allowRewardUse?: boolean;
  allowSendItems?: boolean;

  initialTab?: RogueShopTab;

  onPracticeStart?: () => void;

  onPracticePresetStart?: () => void;
}

type RogueCompanionEntry = {
  trainerType: TrainerType | null;
  name: string;
  description: string;
  action: "RECRUIT" | "SELECT" | "SOLO";
};

type RogueBankActionEntry = {
  name: string;
  description: string;
  currency?: BankCurrencyType;
  exchangeCurrencyType?: ExchangeCurrencyType;
  mode: "DEPOSIT" | "WITHDRAW" | "EXCHANGE";
  amount?: number;
  useCustomAmount?: boolean;
};

type RogueBankCandySpeciesEntry = {
  speciesId: SpeciesId;
  name: string;
  candyCount: number;
};

type RogueWorkshopEntry = {
  recipeId: string;
  name: string;
  description: string;
};

export interface RogueShopListing {
  id: string;
  tier: ModifierTier;
  priceRp: number;
  stock: number;
  purchaseMode: "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT";
  option: ModifierTypeOption;

  specialAction?: "COUPON";
}

export class RogueShopUiHandler extends MessageUiHandler {
  private rootContainer: Phaser.GameObjects.Container;

  private titleText: Phaser.GameObjects.Text;
  private moneyWindow: Phaser.GameObjects.NineSlice;
  private mainListWindow: Phaser.GameObjects.NineSlice;
  private detailWindow: Phaser.GameObjects.NineSlice;
  private tabWindow: Phaser.GameObjects.NineSlice;
  private helpWindow: Phaser.GameObjects.NineSlice;

  private tabTexts: Phaser.GameObjects.Text[] = [];
  private tabCursorObj: Phaser.GameObjects.Image;
  private listCursorObj: Phaser.GameObjects.Image;

  private valueRoguePointText: Phaser.GameObjects.Text;
  private valueGoldText: Phaser.GameObjects.Text;
  private moneyHeaderRpScale = 1;
  private moneyHeaderGoldScale = 1;

  private listTextObjects: Phaser.GameObjects.Text[] = [];
  private detailTitleText: Phaser.GameObjects.Text;
  private detailBodyText: Phaser.GameObjects.Text;
  private footerHelpText: Phaser.GameObjects.Text;

  private defaultHelpText = "";
  private noticeTimer?: Phaser.Time.TimerEvent;

  private currentTab: RogueShopTab = "SHOP";
  private tabCursor = 0;
  private listCursor = 0;
  private listScroll = 0;
  private readonly visibleRows = 8;

  private companionPortrait: Phaser.GameObjects.Sprite;
  private companionKnowhowTitleText: Phaser.GameObjects.Text;
  private companionKnowhowBodyText: Phaser.GameObjects.Text;

  private shopListings: RogueShopListing[] = [];
  private storageItems: RogueShopStorageEntry[] = [];
  private bankData: RogueShopBankData = {
    roguePoints: 0,
    gold: 5000,
    bankRoguePoints: 0,
    bankGold: 0,
  };

  private readonly visibleTabCount = 5;
  private tabScroll = 0;

  private readonly tabXPositions = [12, 70, 128, 186, 244];

  private uiArgs: RogueShopUiArgs | null = null;
  private enabledTabs: RogueShopTab[] = [
    "SHOP",
    "BANK",
    "STORAGE",
    "QUEST",
    "PRACTICE",
    "WORKSHOP",
    "MINE",
    "MEETING",
    "CAFE",
    "BRIEFING",
    "HEADQUARTERS",
  ];

  private selectingTarget = false;
  private pendingTargetListing: RogueShopListing | null = null;
  private targetCursor = 0;
  private starterIcons: Phaser.GameObjects.Sprite[] = [];
  private starterIconCursorObj: Phaser.GameObjects.Image;

  private starterPanelWindow: Phaser.GameObjects.NineSlice;
  private starterPanelTitleText: Phaser.GameObjects.Text;
  private starterIconsContainer: Phaser.GameObjects.Container;

  private selectingCandySpecies = false;
  private candySpeciesCursor = 0;
  private candySpeciesList: RogueBankCandySpeciesEntry[] = [];
  private pendingExchangeEntry: RogueBankActionEntry | null = null;
  private pendingStorageItem: RogueShopStorageEntry | null = null;

  private pendingStorageAmount = 1;
  private selectingStorageAmount = false;

  private storageApplyMode = false;

  private selectingStorageItem = false;
  private selectingStorageTarget = false;

  private storageCursor = 0;
  private storageScroll = 0;

  private starterCursor = 0;
  private selectedStorageAmount = 1;

  private selectedStorageEntry: RogueShopStorageEntry | null = null;

  private questFooterText: Phaser.GameObjects.Text;

  private pendingShopListing: RogueShopListing | null = null;
  private selectingShopDestination = false;

  // 회의실/본부는 기존 만남의광장(MEETING)과 별개입니다.
  private briefingStep = 0;

  private getBriefingLines(): Array<{ name: string; description: string }> {
    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const leader = female ? "미로" : "미지";
    const rival = female ? "핀" : "아이비";
    return [
      {
        name: `${leader} · ${rival}`,
        description: "클래식에서 보여준 활약을 인정하고, 주인공의 정식 합류를 축하한다.",
      },
      { name: "캡틴", description: "정식 로그탐사대원으로서 새로운 출발을 축하한다." },
      {
        name: "캡틴 — 시스템 안내",
        description: "터몽도감과 트레이닝 카드 슬롯을 소개한다. 실제 지급 및 해금 로직은 후속 단계에서 연결한다.",
      },
      {
        name: "페더 — 긴급 의뢰",
        description: "바닐라가 실종된 에픽 이로치 나옹 '초코'를 찾아달라고 요청했다. 실종 장소는 아직 밝혀지지 않았다.",
      },
      {
        name: "페더 — 동료 안내",
        description: "동료가 탐사 중 전투를 지원하는 방법을 설명한다. 실제 동료 튜토리얼은 후속 단계에서 연결한다.",
      },
      {
        name: "탐사 출발 준비",
        description: "프롤로그 안내를 마쳤습니다. 타이틀의 '새 게임 → 디 아더'를 선택하여 탐사를 시작할 수 있습니다.",
      },
    ];
  }

  private readonly workshopEntries: RogueWorkshopEntry[] = [
    {
      recipeId: "crafting_table",
      name: "제작대 사용",
      description: "3개의 재료 슬롯에 재료를 넣어 제작합니다.",
    },
  ];

  constructor() {
    super(UiMode.ROGUE_SHOP);
  }

  setup() {
    console.log("[ROGUE_SHOP] setup called");

    const ui = this.getUi();
    const sWidth = globalScene.scaledCanvas.width;
    const sHeight = globalScene.scaledCanvas.height;

    this.rootContainer = globalScene.add.container(0, -sHeight).setVisible(false);
    ui.add(this.rootContainer);

    const bg = globalScene.add.rectangle(0, 0, sWidth, sHeight, 0x103030).setOrigin(0);

    this.titleText = addTextObject(8, 6, "로그센터", TextStyle.SUMMARY);

    this.moneyWindow = addWindow(210, 4, 107, 28);
    this.tabWindow = addWindow(4, 20, 306, 18);
    this.mainListWindow = addWindow(4, 38, 140, 124);
    this.detailWindow = addWindow(146, 38, 171, 124);
    this.helpWindow = addWindow(4, 162, 313, 18);

    // RP / 골드 영역을 분할하고 각 영역 안에서만 텍스트 크기를 조절합니다.
    this.valueRoguePointText = addTextObject(214, 9, "RP: 0", TextStyle.WINDOW);
    this.valueGoldText = addTextObject(266, 9, "G: 0", TextStyle.WINDOW);
    this.moneyHeaderRpScale = this.valueRoguePointText.scaleX;
    this.moneyHeaderGoldScale = this.valueGoldText.scaleX;
    const assetTooltipTargets = [this.moneyWindow, this.valueRoguePointText, this.valueGoldText];

    for (const target of assetTooltipTargets) {
      target.setInteractive();

      target.on("pointerover", () => {
        this.showAssetTooltip();
      });

      target.on("pointerout", () => {
        this.hideAssetTooltip();
      });
    }

    for (let i = 0; i < this.visibleTabCount; i++) {
      const tabText = addTextObject(this.tabXPositions[i], 25, "", TextStyle.WINDOW);

      this.tabTexts.push(tabText);
    }

    this.companionPortrait = globalScene.add.sprite(174, 133, "trainer_m").setOrigin(0.5, 1).setVisible(false);

    this.companionKnowhowTitleText = addTextObject(202, 65, "", TextStyle.SUMMARY).setVisible(false);

    this.companionKnowhowBodyText = addTextObject(202, 80, "", TextStyle.WINDOW, {
      fontSize: 60,
      wordWrap: {
        width: 420,
        useAdvancedWrap: true,
      },
    }).setVisible(false);

    this.tabCursorObj = globalScene.add.image(10, 23, "select_cursor").setOrigin(0);
    this.listCursorObj = globalScene.add.image(8, 44, "select_cursor").setOrigin(0);

    for (let i = 0; i < this.visibleRows; i++) {
      const rowText = addTextObject(16, 44 + i * 14, "", TextStyle.WINDOW);
      this.listTextObjects.push(rowText);
    }

    this.detailTitleText = addTextObject(152, 44, "", TextStyle.SUMMARY, {
      fontSize: 78,
      wordWrap: {
        width: 690,
        useAdvancedWrap: true,
      },
    });

    this.detailBodyText = addTextObject(152, 60, "", TextStyle.WINDOW, {
      fontSize: 72,
      maxLines: 6,
      wordWrap: {
        width: 690,
        useAdvancedWrap: true,
      },
    }).setInteractive(new Phaser.Geom.Rectangle(0, 0, 690, 420), Phaser.Geom.Rectangle.Contains);

    this.questFooterText = addTextObject(152, 132, "", TextStyle.WINDOW, {
      fontSize: 66,
      wordWrap: {
        width: 690,
        useAdvancedWrap: true,
      },
    }).setVisible(false);

    this.footerHelpText = addTextObject(8, 167, "←→ 탭 이동  ↑↓ 선택  Z 확인  X 취소", TextStyle.WINDOW);

    // 스타팅 패널 추가
    this.starterPanelWindow = addWindow(272, 44, 38, 104);
    this.starterPanelTitleText = addTextObject(291, 48, "스타팅", TextStyle.WINDOW).setOrigin(0.5, 0);
    this.starterIconsContainer = globalScene.add.container(0, 0);

    this.starterIcons = [];
    for (let i = 0; i < 6; i++) {
      const icon = globalScene.add
        .sprite(283, this.calcShopStarterIconY(i), "pokemon_icons_0", "unknown")
        .setScale(0.5)
        .setOrigin(0)
        .setVisible(false);

      this.starterIcons.push(icon);
      this.starterIconsContainer.add(icon);
    }

    this.starterIconCursorObj = globalScene.add
      .image(279, this.calcShopStarterIconY(0) - 1, "select_cursor_highlight")
      .setOrigin(0)
      .setVisible(false);

    this.starterIconsContainer.add(this.starterIconCursorObj);

    this.rootContainer.add([
      bg,
      this.moneyWindow,
      this.tabWindow,
      this.mainListWindow,
      this.detailWindow,
      this.helpWindow,
      this.titleText,
      this.valueRoguePointText,
      this.valueGoldText,
      ...this.tabTexts,
      this.tabCursorObj,
      this.listCursorObj,
      ...this.listTextObjects,
      this.detailTitleText,
      this.detailBodyText,

      this.companionPortrait,
      this.companionKnowhowTitleText,
      this.companionKnowhowBodyText,

      this.footerHelpText,
      this.questFooterText,
      this.starterPanelWindow,
      this.starterPanelTitleText,
      this.starterIconsContainer,
    ]);
  }

  show(args: any[]): boolean {
    super.show(args);

    console.log("[ROGUE_SHOP] show called", args);

    this.uiArgs = args?.length > 0 ? (args[0] as RogueShopUiArgs) : null;

    console.log("[ROGUE_SHOP.show uiArgs]", {
      source: this.uiArgs?.source,
      startersLength: this.uiArgs?.starters?.length ?? 0,
    });

    this.rootContainer.setVisible(true);
    companionManager.ensureDefaultPlayerCompanion(globalScene.gameData.gender);

    this.shopListings = buildRogueShopListings();
    console.info("[ROGUE_SHOP_KO_DIAG_V2] 한글 이름 진단 활성화", this.shopListings.length);
    console.table(
      this.shopListings.slice(0, 30).map(listing => ({
        id: listing.id,
        typeId: listing.option?.type?.id,
        icon: listing.option?.type?.iconImage,
        englishOrNative: listing.option?.type?.name,
        displayName: this.getListingDisplayName(listing),
      })),
    );
    console.table(
      this.shopListings
        .filter(l => l.id.startsWith("BERRY"))
        .map(l => ({
          id: l.id,
          name: this.getListingDisplayName(l),
          typeId: l.option?.type?.id,
        })),
    );

    this.shopListings.unshift({
      id: "COUPON_EXCHANGE",
      tier: ModifierTier.COMMON,
      priceRp: 0,
      stock: 1,
      purchaseMode: "INSTANT",

      // 특수 항목이라 실제 modifier는 사용하지 않음
      option: null as unknown as ModifierTypeOption,

      specialAction: "COUPON",
    });

    this.migrateLegacyBerryStorageItems();
    this.migrateBrokenGeneratedStorageItems();

    const storedItems = globalScene.gameData.getStorageItems();

    this.storageItems = this.buildStorageEntries();

    const quests = questManager.getQuests();

    const currentWave = globalScene.currentBattle?.waveIndex ?? 1;

    const currentBiomeIndex = questManager.getQuestBiomeIndex(currentWave);

    // 이전 바이옴에서 남은 미수락 의뢰 제거
    for (let i = quests.length - 1; i >= 0; i--) {
      const quest = quests[i];

      // 수락한 의뢰는 절대 유지
      if (quest.accepted) {
        continue;
      }

      // 완료 의뢰도 기존 처리 유지
      if (quest.completed) {
        continue;
      }

      // ★ 다른 바이옴 세대의 미수락 의뢰는 게시판에서 제거
      if (quest.generatedBiomeIndex === undefined || quest.generatedBiomeIndex !== currentBiomeIndex) {
        console.log("[QUEST_BOARD_REFRESH]", {
          questId: quest.id,
          oldIndex: quest.generatedBiomeIndex,
          newIndex: currentBiomeIndex,
          currentWave,
        });

        quests.splice(i, 1);
        continue;
      }

      let invalid = false;

      switch (quest.objectiveType) {
        case "CATCH_POKEMON":
          invalid = quest.targetSpeciesId === undefined || quest.targetCatchWave === undefined;
          break;

        case "FIND_ITEM":
          invalid = quest.targetItemId === undefined || quest.targetItemWave === undefined;
          break;

        case "FIND_TRAINER":
          invalid = quest.targetTrainerType === undefined || quest.targetTrainerWave === undefined;
          break;

        case "REACH_BIOME":
          invalid = quest.targetBiome === undefined;
          break;
      }

      if (invalid) {
        console.warn("[QUEST_BOARD_REMOVE_INVALID]", {
          questId: quest.id,
          objectiveType: quest.objectiveType,
        });

        quests.splice(i, 1);
      }
    }

    const canGenerateQuest = questManager.canGenerateQuestAtWave(currentWave);

    if (canGenerateQuest) {
      const testQuests = this.buildTestQuestList();

      for (const testQuest of testQuests) {
        const exists = quests.some(quest => quest.id === testQuest.id);

        if (exists) {
          continue;
        }

        questManager.setupQuest(testQuest, currentWave);

        // ★ 목표 생성에 실패한 의뢰는 게시판에 올리지 않음
        let setupSucceeded = true;

        switch (testQuest.objectiveType) {
          case "CATCH_POKEMON":
            setupSucceeded = testQuest.targetSpeciesId !== undefined && testQuest.targetCatchWave !== undefined;
            break;

          case "FIND_ITEM":
            setupSucceeded = testQuest.targetItemId !== undefined && testQuest.targetItemWave !== undefined;
            break;

          case "FIND_TRAINER":
            setupSucceeded = testQuest.targetTrainerType !== undefined && testQuest.targetTrainerWave !== undefined;
            break;

          case "REACH_BIOME":
            setupSucceeded = testQuest.targetBiome !== undefined;
            break;
        }

        if (!setupSucceeded) {
          console.warn("[QUEST_BOARD_SKIP_INVALID]", {
            questId: testQuest.id,
            objectiveType: testQuest.objectiveType,
            currentWave,
          });

          continue;
        }

        quests.push(testQuest);
      }
    }

    globalScene.gameData.saveSystem();

    const allowShop = this.uiArgs?.allowShop ?? true;
    const allowBank = this.uiArgs?.allowBank ?? true;
    const allowStorage = this.uiArgs?.allowStorage ?? true;
    const allowQuest = this.uiArgs?.allowQuest ?? true;
    const allowWorkshop = this.uiArgs?.allowWorkshop ?? true;

    const enabledTabs: RogueShopTab[] = [];
    const isTitleCenter = (this.uiArgs?.source ?? "TITLE") === "TITLE";
    if (allowShop) {
      enabledTabs.push("SHOP");
    }
    if (allowBank) {
      enabledTabs.push("BANK");
    }
    if (allowStorage) {
      enabledTabs.push("STORAGE");
    }

    if (isTitleCenter) {
      // 클래식 이후 첫 개방 시설 5개. 나머지는 별도 해금 조건 설정 후 개방.
      enabledTabs.push("BRIEFING", "HEADQUARTERS");
    } else {
      // 전투/스타팅 메뉴에서 사용하는 기존 로그센터 기능은 그대로 유지.
      if (allowQuest) {
        enabledTabs.push("QUEST");
      }
      enabledTabs.push("PRACTICE");
      if (allowWorkshop) {
        enabledTabs.push("WORKSHOP");
      }
      enabledTabs.push("MINE", "MEETING", "CAFE");
    }

    this.enabledTabs = enabledTabs.length > 0 ? enabledTabs : ["PRACTICE"];

    const requestedInitialTab = this.uiArgs?.initialTab;

    const initialTabIndex = requestedInitialTab != null ? this.enabledTabs.indexOf(requestedInitialTab) : -1;

    this.tabCursor = initialTabIndex >= 0 ? initialTabIndex : 0;

    this.currentTab = this.enabledTabs[this.tabCursor];

    this.tabScroll = Phaser.Math.Clamp(
      this.tabCursor - this.visibleTabCount + 1,
      0,
      Math.max(0, this.enabledTabs.length - this.visibleTabCount),
    );

    this.listCursor = 0;
    this.listScroll = 0;

    this.selectingTarget = false;
    this.pendingTargetListing = null;
    this.targetCursor = 0;

    this.selectingCandySpecies = false;
    this.candySpeciesList = [];
    this.pendingExchangeEntry = null;

    this.syncBankDataWithGame();
    this.refreshMoneyTexts();
    this.refreshTabTexts();
    this.refreshStarterIcons();
    this.refreshTabCursor();
    this.refreshList();
    this.refreshDetail();
    this.refreshHelpText();

    this.defaultHelpText = this.footerHelpText.text;

    const hasStarters = (this.uiArgs?.starters?.length ?? 0) > 0;

    this.starterPanelWindow.setVisible(hasStarters);
    this.starterPanelTitleText.setVisible(hasStarters);
    this.starterIconsContainer.setVisible(hasStarters);

    return true;
  }

  private getButtonName(button: Button): string {
    return Button[button] ?? `UNKNOWN(${button})`;
  }

  private parseApricornTypeFromItemId(itemId: string): ApricornType | null {
    if (!itemId.startsWith("APRICORN_")) {
      return null;
    }

    const value = Number(itemId.replace("APRICORN_", ""));

    if (Number.isNaN(value)) {
      return null;
    }

    return value as ApricornType;
  }

  private showAssetTooltip(): void {
    const ownedRp = globalScene.gameData.roguePoints ?? 0;

    const bankRp = globalScene.gameData.bankRoguePoints ?? 0;

    const ownedGold = globalScene.money ?? 0;

    const bankGold = globalScene.gameData.bankMoney ?? 0;

    const tooltipText =
      "[현재 보유]\n"
      + `로그포인트: ${ownedRp.toLocaleString()} RP\n`
      + `골드: ${ownedGold.toLocaleString()} G\n\n`
      + "[은행 예치]\n"
      + `로그포인트: ${bankRp.toLocaleString()} RP\n`
      + `골드: ${bankGold.toLocaleString()} G`;

    globalScene.ui.showTooltip("로그센터 자산", tooltipText, true);
  }

  private hideAssetTooltip(): void {
    globalScene.ui.hideTooltip();
  }

  processInput(button: Button): boolean {
    console.log(
      "[ROGUE_SHOP] processInput",
      button,
      this.getButtonName(button),
      "tab=",
      this.currentTab,
      "selectingTarget=",
      this.selectingTarget,
    );

    if (this.storageApplyMode) {
      return this.processStorageApplyInput(button);
    }

    if (this.selectingShopDestination) {
      return this.processShopDestinationInput(button);
    }

    if (this.selectingTarget) {
      return this.processTargetSelectInput(button);
    }

    if (this.selectingCandySpecies) {
      return this.processCandySpeciesSelectInput(button);
    }

    let success = false;
    let playMoveSound = false;

    switch (button) {
      case Button.LEFT:
        success = this.moveTabCursor(-1);
        playMoveSound = success;
        break;

      case Button.RIGHT:
        success = this.moveTabCursor(1);
        playMoveSound = success;
        break;

      case Button.UP:
        success = this.moveListCursor(-1);
        playMoveSound = success;
        break;

      case Button.DOWN:
        success = this.moveListCursor(1);
        playMoveSound = success;
        break;

      case Button.SUBMIT:
      case Button.ACTION:
        console.log("[ROGUE_SHOP] confirm -> handleSubmit");
        success = this.handleSubmit();
        break;

      case Button.CANCEL:
        if (this.uiArgs?.source === "STARTER_SELECT") {
          console.log("[ROGUE_SHOP] cancel -> tryStartRun");
          this.tryStartRun();
        } else {
          console.log("[ROGUE_SHOP] cancel -> tryExit");
          this.tryExit();
        }
        return true;
    }

    if (playMoveSound) {
      this.getUi().playSelect();
    }

    if (success) {
      this.refreshMoneyTexts();
      this.refreshTabTexts();
      this.refreshStarterIcons();
      this.refreshTabCursor();
      this.refreshList();
      this.refreshDetail();
      this.refreshHelpText();
    }

    return success;
  }

  private getStorageItemIdFromListing(listing: RogueShopListing): string {
    const type = listing.option?.type as any;
    const id = type?.id ?? listing.id;

    // 생성형 타입은 type.id가 이미 ATTACK_TYPE_BOOSTER_1 형태로 완성되어 있음
    if (
      id.startsWith("ATTACK_TYPE_BOOSTER_")
      || id.startsWith("TYPE_SPECIFIC_MOVE_BOOSTER_")
      || id.startsWith("BERRY_")
      || id.startsWith("modifierType:SpeciesBoosterItem.")
    ) {
      return id;
    }

    const args = type?.getPregenArgs?.();
    if (id && Array.isArray(args) && args.length > 0) {
      const suffix = `_${args.join("_")}`;
      // ModifierTypeGenerator가 ID에 생성 인자를 이미 붙인 경우 중복 저장하지 않는다.
      return id.endsWith(suffix) ? id : `${id}${suffix}`;
    }

    return id;
  }

  private buildTestQuestList(): QuestEntry[] {
    return [
      {
        id: "quest_001",
        category: "REQUEST",
        objectiveType: "CATCH_POKEMON",

        title: "포켓몬 포획 의뢰",
        description: "포획할 포켓몬을 확인해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_002",
        category: "REQUEST",
        objectiveType: "FIND_ITEM",

        title: "아이템을 찾아주세요!",
        description: "아이템을 1개 찾아주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_003",
        category: "REQUEST",
        objectiveType: "REACH_BIOME",

        title: "지역 탐사 의뢰",
        description: "탐사할 지역을 확인해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_004",
        category: "REQUEST",
        objectiveType: "FIND_TRAINER",

        title: "실종된 트레이너를 찾아주세요!",
        description: "실종된 트레이너를 찾아 구조해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_005",
        category: "REQUEST",
        objectiveType: "CATCH_POKEMON",

        title: "포켓몬 포획 의뢰 2",
        description: "지정된 포켓몬을 포획해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_006",
        category: "REQUEST",
        objectiveType: "FIND_ITEM",

        title: "아이템 수색 의뢰 2",
        description: "지정된 아이템을 찾아주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_007",
        category: "REQUEST",
        objectiveType: "REACH_BIOME",

        title: "지역 탐사 의뢰 2",
        description: "지정된 지역을 탐사해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_008",
        category: "REQUEST",
        objectiveType: "FIND_TRAINER",

        title: "트레이너 구조 의뢰 2",
        description: "실종된 트레이너를 찾아 구조해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_009",
        category: "REQUEST",
        objectiveType: "CATCH_POKEMON",

        title: "포켓몬 포획 의뢰 3",
        description: "지정된 포켓몬을 포획해 주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },

      {
        id: "quest_010",
        category: "REQUEST",
        objectiveType: "FIND_ITEM",

        title: "아이템 수색 의뢰 3",
        description: "지정된 아이템을 찾아주세요.",

        progress: 0,
        requirement: 1,

        accepted: false,
        completed: false,

        rewardRp: 0,
        rewardGold: 0,
      },
    ];
  }

  /**
   * 창고에 직렬화된 생성형 도구 ID를 원래 ModifierType으로 복원한다.
   * 개별 이름을 하드코딩하지 않고 modifier-type.ts의 생성기와 getPregenArgs를 재사용한다.
   */
  private resolveGeneratedStorageModifierType(itemId: string): ModifierType | null {
    const speciesMatch = itemId.match(/^modifierType:SpeciesBoosterItem\.(.+)$/);
    if (speciesMatch) {
      for (const key of ["RARE_SPECIES_STAT_BOOSTER", "SPECIES_STAT_BOOSTER"] as const) {
        try {
          const factory = modifierTypes[key];
          const generator = factory().withIdFromFunc(factory) as ModifierTypeGenerator;
          const type = generator.generateType([], [speciesMatch[1]]) as ModifierType | null;
          if (type) {
            return type;
          }
        } catch {
          /* 다른 종류의 종족 전용 강화 도구를 검사 */
        }
      }
    }

    // 긴 접두사부터 처리하여 다른 생성형 아이템과 잘못 매칭되지 않도록 한다.
    const keys = [
      "RARE_FORM_CHANGE_ITEM",
      "FORM_CHANGE_ITEM",
      "RARE_EVOLUTION_ITEM",
      "EVOLUTION_ITEM",
      "TEMP_WEATHER_ROCK",
      "TEMP_TERRAIN_SEED",
      "TEMP_STAT_STAGE_BOOSTER",
      "BASE_STAT_BOOSTER",
      "ATTACK_TYPE_BOOSTER",
      "TYPE_SPECIFIC_MOVE_BOOSTER",
      "RARE_SPECIES_STAT_BOOSTER",
      "SPECIES_STAT_BOOSTER",
    ] as const;

    for (const key of keys) {
      if (!itemId.startsWith(`${key}_`)) {
        continue;
      }
      const suffix = itemId.slice(key.length + 1);
      const args = suffix.split("_");
      // 종족 전용 도구는 문자열 키가 필요하며, 그 외 생성기는 숫자 인자이다.
      const isSpecies = key === "SPECIES_STAT_BOOSTER" || key === "RARE_SPECIES_STAT_BOOSTER";
      if (!isSpecies && (args.length === 0 || args.some(arg => !/^\d+$/.test(arg)))) {
        continue;
      }
      const values = isSpecies ? [suffix] : args.map(Number);
      if (values.some(v => typeof v === "number" && !Number.isSafeInteger(v))) {
        continue;
      }
      const index = values[0];
      if (typeof index === "number") {
        if ((key === "FORM_CHANGE_ITEM" || key === "RARE_FORM_CHANGE_ITEM") && FormChangeItem[index] === undefined) {
          continue;
        }
        if ((key === "EVOLUTION_ITEM" || key === "RARE_EVOLUTION_ITEM") && EvolutionItem[index] === undefined) {
          continue;
        }
        if (key === "TEMP_WEATHER_ROCK" && (!WeatherType[index] || index === WeatherType.NONE)) {
          continue;
        }
        if (key === "TEMP_TERRAIN_SEED" && (!TerrainType[index] || index === TerrainType.NONE)) {
          continue;
        }
      }
      try {
        const factory = modifierTypes[key];
        const generator = factory().withIdFromFunc(factory) as ModifierTypeGenerator;
        const result = generator.generateType([], values) as ModifierType | null;
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn("[ROGUE_SHOP] 생성형 도구 복원 실패", { itemId, key, error });
      }
    }

    return null;
  }

  private processStorageApplyInput(button: Button): boolean {
    const storageList = this.getStorageList();
    const starterList = this.uiArgs?.starters ?? [];

    switch (button) {
      case Button.UP:
        if (this.selectingStorageItem) {
          if (this.storageCursor > 0) {
            this.storageCursor--;
            if (this.storageCursor < this.storageScroll) {
              this.storageScroll = this.storageCursor;
            }
            this.refreshStorageApplyUi();
            this.getUi().playSelect();
          }
          return true;
        }

        if (this.selectingStorageAmount) {
          if (this.selectedStorageEntry) {
            this.selectedStorageAmount = Math.min(this.selectedStorageEntry.quantity, this.selectedStorageAmount + 1);
            this.refreshStorageApplyUi();
            this.getUi().playSelect();
          }
          return true;
        }

        if (this.selectingStorageTarget) {
          if (this.starterCursor > 0) {
            this.starterCursor--;
            this.refreshStorageApplyUi();
            this.refreshStarterIcons();
            this.getUi().playSelect();
          }
          return true;
        }
        return true;

      case Button.DOWN:
        if (this.selectingStorageItem) {
          if (this.storageCursor < storageList.length - 1) {
            this.storageCursor++;
            const maxVisible = this.visibleRows ?? 8;
            if (this.storageCursor >= this.storageScroll + maxVisible) {
              this.storageScroll = this.storageCursor - maxVisible + 1;
            }
            this.refreshStorageApplyUi();
            this.getUi().playSelect();
          }
          return true;
        }

        if (this.selectingStorageAmount) {
          if (this.selectedStorageEntry) {
            this.selectedStorageAmount = Math.max(1, this.selectedStorageAmount - 1);
            this.refreshStorageApplyUi();
            this.getUi().playSelect();
          }
          return true;
        }

        if (this.selectingStorageTarget) {
          if (this.starterCursor < starterList.length - 1) {
            this.starterCursor++;
            this.refreshStorageApplyUi();
            this.refreshStarterIcons();
            this.getUi().playSelect();
          }
          return true;
        }
        return true;

      case Button.ACTION:
      case Button.SUBMIT:
        if (this.selectingStorageItem) {
          return this.handleStorageItemConfirm();
        }

        if (this.selectingStorageAmount) {
          return this.handleStorageAmountConfirm();
        }

        if (this.selectingStorageTarget) {
          return this.handleStorageTargetConfirm();
        }

        return true;

      case Button.CANCEL:
        return this.handleStorageApplyCancel();
    }

    return false;
  }

  private confirmShopDestinationSelection(): boolean {
    const listing = this.pendingShopListing;
    if (!listing) {
      return false;
    }

    const action = this.shopDestinationCursor;

    // 2 = 취소
    if (action === 2) {
      this.selectingShopDestination = false;
      this.pendingShopListing = null;
      this.shopDestinationCursor = 0;
      this.refreshDetail();
      this.refreshHelpText();
      this.setNotice("구매를 취소했습니다.");
      this.getUi().playSelect();
      return true;
    }

    // 1 = 창고 보관
    if (action === 1) {
      return this.purchaseListingToStorage(listing);
    }

    // 0 = 바로 적용 / 즉시 반영
    if (listing.purchaseMode === "TRAINER_LOADOUT") {
      return this.purchaseTrainerLoadoutDirectly(listing);
    }

    if (listing.purchaseMode === "SELECT_POKEMON") {
      const hasStarters = (this.uiArgs?.starters?.length ?? 0) > 0;
      if (!hasStarters) {
        this.setNotice("적용할 스타팅이 없습니다.");
        this.getUi().playError();
        return true;
      }

      this.selectingShopDestination = false;
      this.pendingTargetListing = listing;
      this.pendingShopListing = null;
      this.selectingTarget = true;
      this.targetCursor = 0;
      this.shopDestinationCursor = 0;

      this.refreshStarterIcons();
      this.refreshDetail();
      this.refreshHelpText();
      this.setNotice("적용할 스타팅을 선택하세요.");
      this.getUi().playSelect();
      return true;
    }

    // INSTANT
    return this.purchaseInstantListing(listing);
  }

  private shopDestinationCursor = 0; // 0: 바로 적용/즉시 반영, 1: 창고 보관, 2: 취소

  private addVoucherCount(voucherType: VoucherType, amount = 1): void {
    globalScene.gameData.voucherCounts ??= {
      [VoucherType.REGULAR]: 0,
      [VoucherType.PLUS]: 0,
      [VoucherType.PREMIUM]: 0,
      [VoucherType.GOLDEN]: 0,
    };

    globalScene.gameData.voucherCounts[voucherType] = (globalScene.gameData.voucherCounts[voucherType] ?? 0) + amount;

    globalScene.gameData.saveSystem();
  }

  private processShopDestinationInput(button: Button): boolean {
    const listing = this.pendingShopListing;
    if (!listing) {
      this.selectingShopDestination = false;
      return false;
    }

    switch (button) {
      case Button.UP:
      case Button.LEFT:
        this.shopDestinationCursor = this.shopDestinationCursor > 0 ? this.shopDestinationCursor - 1 : 2;
        this.refreshDetail();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.DOWN:
      case Button.RIGHT:
        this.shopDestinationCursor = this.shopDestinationCursor < 2 ? this.shopDestinationCursor + 1 : 0;
        this.refreshDetail();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.ACTION:
      case Button.SUBMIT:
        return this.confirmShopDestinationSelection();

      case Button.CANCEL:
        this.selectingShopDestination = false;
        this.pendingShopListing = null;
        this.shopDestinationCursor = 0;
        this.refreshDetail();
        this.refreshHelpText();
        this.setNotice("구매를 취소했습니다.");
        this.getUi().playSelect();
        return true;
    }

    return false;
  }

  private handleStorageItemConfirm(): boolean {
    const entry = this.storageItems[this.storageCursor];
    if (!entry) {
      this.getUi().playError();
      return true;
    }

    if (
      entry.id === "VOUCHER_GOLD"
      || entry.id === "VOUCHER_GOLDEN"
      || entry.id === "EGG_VOUCHER_GOLD"
      || entry.id === "EGG_VOUCHER_GOLDEN"
    ) {
      this.addVoucherCount(VoucherType.GOLDEN, entry.quantity);
      globalScene.gameData.removeFromStorage(entry.id, entry.quantity);

      this.storageItems = this.buildStorageEntries();
      this.refreshList();
      this.refreshDetail();
      this.refreshMoneyTexts();
      globalScene.gameData.saveSystem();

      this.setNotice(`알바우처골드 x${entry.quantity} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (entry.id === "VOUCHER" || entry.id === "VOUCHER_REGULAR" || entry.id === "EGG_VOUCHER") {
      this.addVoucherCount(VoucherType.REGULAR, entry.quantity);
      globalScene.gameData.removeFromStorage(entry.id, entry.quantity);

      this.storageItems = this.buildStorageEntries();
      this.refreshList();
      this.refreshDetail();
      this.refreshMoneyTexts();
      globalScene.gameData.saveSystem();

      this.setNotice(`알바우처 x${entry.quantity} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (entry.id === "VOUCHER_PLUS" || entry.id === "EGG_VOUCHER_PLUS") {
      this.addVoucherCount(VoucherType.PLUS, entry.quantity);
      globalScene.gameData.removeFromStorage(entry.id, entry.quantity);

      this.storageItems = this.buildStorageEntries();
      this.refreshList();
      this.refreshDetail();
      this.refreshMoneyTexts();
      globalScene.gameData.saveSystem();

      this.setNotice(`알바우처플러스 x${entry.quantity} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (entry.id === "VOUCHER_PREMIUM" || entry.id === "EGG_VOUCHER_PREMIUM") {
      this.addVoucherCount(VoucherType.PREMIUM, entry.quantity);
      globalScene.gameData.removeFromStorage(entry.id, entry.quantity);

      this.storageItems = this.buildStorageEntries();
      this.refreshList();
      this.refreshDetail();
      this.refreshMoneyTexts();
      globalScene.gameData.saveSystem();

      this.setNotice(`알바우처프리미엄 x${entry.quantity} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    // 이하 기존 코드 유지
    this.selectedStorageEntry = entry;
    this.selectedStorageAmount = 1;

    this.selectingStorageItem = false;
    this.selectingStorageAmount = true;
    this.selectingStorageTarget = false;

    this.refreshStorageApplyUi();
    this.setNotice("수량을 선택하세요.");
    this.getUi().playSelect();
    return true;
  }

  private handleStorageAmountConfirm(): boolean {
    if (!this.selectedStorageEntry) {
      this.getUi().playError();
      return true;
    }

    this.selectedStorageAmount = Phaser.Math.Clamp(this.selectedStorageAmount, 1, this.selectedStorageEntry.quantity);

    // 몬스터볼 같은 즉시 사용형
    if (this.selectedStorageEntry.purchaseMode === "INSTANT") {
      return this.handleStorageInstantDirectly();
    }

    // 트레이너 장비
    if (this.selectedStorageEntry.purchaseMode === "TRAINER_LOADOUT") {
      return this.handleStorageTrainerLoadoutDirectly();
    }

    // 포켓몬 지급형
    this.selectingStorageItem = false;
    this.selectingStorageAmount = false;
    this.selectingStorageTarget = true;
    this.starterCursor = 0;

    this.refreshStorageApplyUi();
    this.setNotice("적용할 스타팅을 선택하세요.");
    this.getUi().playSelect();

    return true;
  }

  private handleStorageInstantDirectly(): boolean {
    const entry = this.selectedStorageEntry;
    if (!entry) {
      this.getUi().playError();
      return true;
    }

    const amount = this.selectedStorageAmount;

    const ballType = this.parsePokeballTypeFromStorageId(entry.id);

    if (ballType !== null) {
      // 먼저 창고에서 선택한 만큼 제거
      if (!globalScene.gameData.removeFromStorage(entry.id, amount)) {
        this.setNotice("창고에서 몬스터볼을 꺼낼 수 없습니다.");
        this.getUi().playError();
        return true;
      }

      if (this.uiArgs?.source === "MENU") {
        // 진행 중인 런의 로그센터에서 꺼낸 경우:
        // 현재 런에 즉시 지급
        globalScene.pokeballCounts[ballType] = (globalScene.pokeballCounts[ballType] ?? 0) + amount;

        console.log("[ROGUE_SHOP_POKEBALL_APPLIED]", {
          itemId: entry.id,
          ballType,
          amount,
          total: globalScene.pokeballCounts[ballType],
        });
      } else {
        // 스타팅 선택 화면 등에서 꺼낸 경우:
        // 다음 런 시작 시 지급하도록 예약
        globalScene.gameData.pendingRunItems ??= [];

        for (let i = 0; i < amount; i++) {
          globalScene.gameData.pendingRunItems.push(entry.id);
        }

        console.log("[ROGUE_SHOP_POKEBALL_PENDING]", {
          itemId: entry.id,
          ballType,
          amount,
        });
      }

      this.storageItems = this.buildStorageEntries();

      this.selectedStorageEntry = null;
      this.selectedStorageAmount = 1;
      this.selectingStorageItem = true;
      this.selectingStorageAmount = false;
      this.selectingStorageTarget = false;

      globalScene.gameData.saveSystem();

      this.refreshStorageApplyUi();
      this.refreshList();
      this.refreshDetail();

      this.setNotice(
        this.uiArgs?.source === "MENU"
          ? `${entry.name} x${amount} 꺼내기 완료`
          : `${entry.name} x${amount} 다음 모험에 등록 완료`,
      );

      this.getUi().playSelect();
      return true;
    }

    return true;
  }

  private getPokeballTypeFromShopId(id: string): PokeballType | null {
    switch (id) {
      case "POKEBALL":
        return PokeballType.POKEBALL;
      case "GREAT_BALL":
        return PokeballType.GREAT_BALL;
      case "ULTRA_BALL":
        return PokeballType.ULTRA_BALL;
      case "ROGUE_BALL":
        return PokeballType.ROGUE_BALL;
      case "MASTER_BALL":
        return PokeballType.MASTER_BALL;
      case "QUICK_BALL":
        return PokeballType.QUICK_BALL;
      default:
        return null;
    }
  }

  private handleStorageTrainerLoadoutDirectly(): boolean {
    const entry = this.selectedStorageEntry;
    if (!entry) {
      this.getUi().playError();
      return true;
    }

    const amount = this.selectedStorageAmount;

    const modifierType = this.resolveModifierTypeFromStorageItemId(entry.id);
    if (!modifierType) {
      this.setNotice("도구 정보를 찾을 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    const maxStackCount = this.getTrainerItemMaxStackCount(modifierType);

    if (this.uiArgs?.source === "MENU") {
      const ownedCount = this.getOwnedTrainerItemCount(entry.id);

      if (ownedCount + amount > maxStackCount) {
        this.setNotice(`${entry.name}은(는) 최대 ${maxStackCount}개까지 보유할 수 있습니다.`);
        this.getUi().playError();
        return true;
      }

      let applied = 0;

      for (let i = 0; i < amount; i++) {
        const modifier = modifierType.newModifier();

        if (!modifier || !globalScene.addModifier(modifier, false, false)) {
          break;
        }

        applied++;
      }

      if (applied !== amount) {
        this.setNotice("트레이너 도구를 지급할 수 없습니다.");
        this.getUi().playError();
        return true;
      }

      globalScene.updateModifiers?.(true);
    } else {
      const added = this.addPendingRunItems(entry.id, amount, maxStackCount);

      if (!added) {
        this.setNotice(`${entry.name}은(는) 최대 ${maxStackCount}개까지만 예약할 수 있습니다.`);
        this.getUi().playError();
        return true;
      }
    }

    const moved = globalScene.gameData.moveStorageItemToRun(entry.id, amount);
    if (!moved) {
      this.setNotice("창고에서 아이템을 꺼낼 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    this.storageItems = this.buildStorageEntries();
    this.selectedStorageEntry = null;
    this.selectedStorageAmount = 1;
    this.selectingStorageItem = true;
    this.selectingStorageAmount = false;
    this.selectingStorageTarget = false;

    this.refreshStorageApplyUi();
    this.refreshStarterIcons();
    globalScene.gameData.saveSystem();

    this.setNotice(`${entry.name} x${amount} 즉시 반영 완료`);
    this.getUi().playSelect();
    return true;
  }

  private handleStorageTargetConfirm(): boolean {
    const entry = this.selectedStorageEntry;
    if (!entry) {
      this.getUi().playError();
      return true;
    }

    const starters = this.uiArgs?.starters ?? [];
    const starter = starters[this.starterCursor];

    if (!starter) {
      this.setNotice("스타팅이 없습니다.");
      this.getUi().playError();
      return true;
    }

    const amount = this.selectedStorageAmount;
    const itemName = entry.name;
    const starterName = getPokemonSpecies(starter.speciesId).name;

    // 1) 트레이너 아이템이면 포켓몬 선택 자체를 막고 바로 트레이너 지급/런 지급
    if (entry.purchaseMode === "TRAINER_LOADOUT") {
      const modifierType = this.resolveModifierTypeFromStorageItemId(entry.id);

      if (amount > 1) {
        this.setNotice("이 도구는 1개만 꺼낼 수 있습니다.");
        this.getUi().playError();
        return true;
      }

      const moved = globalScene.gameData.moveStorageItemToRun(entry.id, 1);
      if (!moved) {
        this.setNotice("창고에서 아이템을 꺼낼 수 없습니다.");
        this.getUi().playError();
        return true;
      }

      if (this.uiArgs?.source === "MENU") {
        if (!modifierType) {
          this.setNotice("도구 정보를 찾을 수 없습니다.");
          this.getUi().playError();
          return true;
        }

        const alreadyOwned = globalScene.findModifier(m => {
          const mid = (m as any)?.type?.id;
          return mid === entry.id;
        });

        if (alreadyOwned) {
          this.setNotice("이미 보유 중인 트레이너 도구입니다.");
          this.getUi().playError();
          return true;
        }

        const modifier = modifierType.newModifier();
        if (!modifier || !globalScene.addModifier(modifier, false, false)) {
          this.setNotice("트레이너 도구를 지급할 수 없습니다.");
          this.getUi().playError();
          return true;
        }
      } else {
        const added = this.addPendingRunItemOnce(entry.id);
        if (!added) {
          this.setNotice("이미 예약된 트레이너 도구입니다.");
          this.getUi().playError();
          return true;
        }
      }

      this.storageItems = this.buildStorageEntries();

      this.selectedStorageEntry = null;
      this.selectedStorageAmount = 1;
      this.selectingStorageItem = true;
      this.selectingStorageAmount = false;
      this.selectingStorageTarget = false;

      this.refreshStorageApplyUi();
      this.refreshStarterIcons();
      globalScene.updateModifiers?.(true);
      globalScene.gameData.saveSystem();

      this.setNotice(`${itemName} 지급 완료`);
      this.getUi().playSelect();
      return true;
    }

    // 2) 포켓몬 지급형만 기존 로직 유지
    if (entry.purchaseMode === "SELECT_POKEMON" && this.uiArgs?.source === "MENU") {
      const availableCapacity = this.getAvailableHeldItemCapacity(starter, entry);

      if (availableCapacity <= 0) {
        this.setNotice(`${starterName}은(는) 이미 ${itemName} 최대치입니다.`);
        this.getUi().playError();
        return true;
      }

      if (amount > availableCapacity) {
        this.setNotice(`${starterName}은(는) ${itemName}을(를) ${availableCapacity}개까지만 더 지닐 수 있습니다.`);
        this.getUi().playError();
        return true;
      }
    }

    let applied = false;

    if (this.uiArgs?.source === "MENU") {
      applied = this.applyStorageItemImmediatelyToPartyPokemon(starter, entry, amount);
    } else {
      (starter as any).preRunItems ??= [];
      for (let i = 0; i < amount; i++) {
        (starter as any).preRunItems.push(entry.id);
      }
      applied = true;
    }

    if (!applied) {
      this.setNotice("아이템을 적용할 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    const moved = globalScene.gameData.moveStorageItemToRun(entry.id, amount);
    if (!moved) {
      this.setNotice("창고에서 아이템을 꺼낼 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    this.storageItems = this.buildStorageEntries();

    this.setNotice(`${itemName} x${amount} → ${starterName} 적용 완료`);

    this.selectedStorageEntry = null;
    this.selectedStorageAmount = 1;
    this.selectingStorageItem = true;
    this.selectingStorageAmount = false;
    this.selectingStorageTarget = false;

    this.refreshStorageApplyUi();
    this.refreshStarterIcons();
    globalScene.updateModifiers?.(true);
    globalScene.gameData.saveSystem();
    this.getUi().playSelect();
    return true;
  }

  private applyStorageItemImmediatelyToPartyPokemon(
    starter: Starter,
    entry: RogueShopStorageEntry,
    amount: number,
  ): boolean {
    const party = globalScene.getPlayerParty();

    const targetPokemon = party.find(p => p.species.speciesId === starter.speciesId);
    if (!targetPokemon) {
      console.warn("[ROGUE_SHOP] target pokemon not found", starter);
      return false;
    }

    const modifierType = this.resolveModifierTypeFromStorageItemId(entry.id);
    if (!modifierType) {
      console.warn("[ROGUE_SHOP] modifierType not found by id", entry.id);
      return false;
    }

    console.log("[ROGUE_SHOP] immediate apply type check", {
      itemId: entry.id,
      purchaseMode: entry.purchaseMode,
      modifierTypeName: modifierType?.name,
      ctor: modifierType?.constructor?.name,
    });

    let applied = 0;

    for (let i = 0; i < amount; i++) {
      const modifier = modifierType.newModifier(targetPokemon);

      if (!modifier) {
        console.warn("[ROGUE_SHOP] failed to create modifier for", entry.id);
        break;
      }

      const result = globalScene.addModifier(modifier, false, false);
      if (!result) {
        console.warn("[ROGUE_SHOP] addModifier failed for", entry.id);
        break;
      }

      applied++;
    }

    if (applied > 0) {
      globalScene.updateModifiers?.(true);
    }

    return applied === amount;
  }

  private getAvailableHeldItemCapacity(starter: Starter, entry: RogueShopStorageEntry): number {
    if (entry.id === "BERRY") {
      console.warn("[ROGUE_SHOP] legacy BERRY entry detected, skipping capacity check", entry);
      return 99;
    }

    const targetPokemon = globalScene.getPlayerParty().find(p => p.species.speciesId === starter.speciesId);

    if (!targetPokemon) {
      console.warn("[ROGUE_SHOP] target pokemon not found for capacity check", {
        starterSpeciesId: starter.speciesId,
        itemId: entry.id,
      });
      return 0;
    }

    const modifierType = this.resolveModifierTypeFromStorageItemId(entry.id);
    if (!modifierType) {
      console.warn("[ROGUE_SHOP] modifierType not found for capacity check", entry.id);
      return 0;
    }

    const dummyModifier = modifierType.newModifier(targetPokemon);
    if (!dummyModifier) {
      console.warn("[ROGUE_SHOP] failed to create dummy modifier for capacity check", entry.id);
      return 0;
    }

    const matchingModifier = globalScene.findModifier(
      m => m instanceof PokemonHeldItemModifier && m.pokemonId === targetPokemon.id && m.matchType(dummyModifier),
    ) as PokemonHeldItemModifier | undefined;

    const maxStackCount =
      typeof (dummyModifier as any).getMaxStackCount === "function" ? (dummyModifier as any).getMaxStackCount() : 0;

    if (!maxStackCount) {
      return 0;
    }

    const currentStack = matchingModifier?.stackCount ?? 0;
    return Math.max(0, maxStackCount - currentStack);
  }

  private migrateLegacyBerryStorageItems(): void {
    const storedItems = globalScene.gameData.getStorageItems();
    let changed = false;

    for (const item of storedItems) {
      if (item.itemId === "BERRY") {
        item.itemId = `BERRY_${BerryType.SITRUS}`;
        changed = true;
      }
    }

    if (changed) {
      globalScene.gameData.saveSystem();
      console.log("[ROGUE_SHOP] migrated legacy BERRY storage items");
    }
  }

  /**
   * 이전 버전에서 생성 인자가 두 번 붙어 저장된 품목을 정상 판매 ID로 복구한다.
   * 실제 판매 목록에서 대응되는 개별 품목을 찾았을 때에만 병합한다.
   * 대응 품목이 없는 데이터는 삭제하지 않는다.
   */
  private migrateBrokenGeneratedStorageItems(): void {
    const allowed = this.getRogueShopSaleStorageIds();
    const storedItems = globalScene.gameData.getStorageItems();
    let changed = false;

    for (const item of storedItems) {
      const match = item.itemId.match(/^(ATTACK_TYPE_BOOSTER|TYPE_SPECIFIC_MOVE_BOOSTER|BASE_STAT_BOOSTER)_(\d+)_\2$/);
      if (!match) {
        continue;
      }
      const correctedId = `${match[1]}_${match[2]}`;
      if (!allowed.has(correctedId)) {
        continue;
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
        continue;
      }
      if (!globalScene.gameData.addToStorage(correctedId, item.quantity)) {
        continue;
      }
      if (!globalScene.gameData.removeFromStorage(item.itemId, item.quantity)) {
        // 비정상적인 데이터가 있으면 기존 수량을 복원한다.
        globalScene.gameData.removeFromStorage(correctedId, item.quantity);
        continue;
      }
      changed = true;
      console.info("[ROGUE_SHOP_STORAGE_REPAIRED_ID]", { from: item.itemId, to: correctedId, quantity: item.quantity });
    }

    if (changed) {
      void globalScene.gameData.saveSystem();
    }
  }

  private applyStorageItemImmediately(starter: Starter, itemId: string): void {
    const party = globalScene.getPlayerParty();

    const targetPokemon = party.find(p => p.species.speciesId === starter.speciesId);

    if (!targetPokemon) {
      return;
    }

    const modifierType = modifierTypes[itemId];
    if (!modifierType) {
      return;
    }

    globalScene.addModifier(modifierType, false, targetPokemon, 1);
  }

  private handleStorageApplyCancel(): boolean {
    if (this.selectingStorageTarget) {
      this.selectingStorageTarget = false;
      this.selectingStorageAmount = true;
      this.refreshStorageApplyUi();
      this.setNotice("수량 선택으로 돌아갑니다.");
      this.getUi().playSelect();
      return true;
    }

    if (this.selectingStorageAmount) {
      this.selectingStorageAmount = false;
      this.selectingStorageItem = true;
      this.selectedStorageAmount = 1;
      this.selectedStorageEntry = null;
      this.refreshStorageApplyUi();
      this.setNotice("아이템 선택으로 돌아갑니다.");
      this.getUi().playSelect();
      return true;
    }

    if (this.selectingStorageItem) {
      this.closeStorageApplyMode();
      this.getUi().playSelect();
      return true;
    }

    return true;
  }

  private applyPreRunItemOption(entry: RogueShopStorageEntry, amount: number): boolean {
    const moved = globalScene.gameData.moveStorageItemToRun(entry.id, amount);
    if (!moved) {
      return false;
    }

    globalScene.gameData.pendingRunItems ??= [];
    for (let i = 0; i < amount; i++) {
      globalScene.gameData.pendingRunItems.push(entry.id);
    }

    return true;
  }

  private consumeStorageItem(entry: RogueShopStorageEntry, amount: number): void {
    const storageList = this.getStorageList();
    const idx = storageList.indexOf(entry);

    if (idx < 0) {
      return;
    }

    storageList[idx].quantity = Math.max(0, storageList[idx].quantity - amount);

    if (storageList[idx].quantity <= 0) {
      storageList.splice(idx, 1);

      if (this.storageCursor >= storageList.length) {
        this.storageCursor = Math.max(0, storageList.length - 1);
      }
      if (this.storageScroll > this.storageCursor) {
        this.storageScroll = this.storageCursor;
      }
    }
  }

  private refreshStorageApplyUi(): void {
    const storageList = this.getStorageList();
    const selectedEntry = storageList[this.storageCursor] ?? null;

    for (let i = 0; i < this.visibleRows; i++) {
      const index = this.storageScroll + i;
      const row = storageList[index];
      const textObj = this.listTextObjects[i];

      if (!textObj) {
        continue;
      }

      if (!row) {
        textObj.setText("");
        textObj.setAlpha(0);
        continue;
      }

      const cursor = index === this.storageCursor && this.selectingStorageItem ? "▶ " : "  ";
      textObj.setText(`${cursor}${row.name} x${row.quantity}`);
      textObj.setAlpha(1);
    }

    this.detailTitleText.setText(selectedEntry?.name ?? "창고");

    const starters = this.uiArgs?.starters ?? [];

    const starterLines = starters
      .map((starter, i) => {
        const cursor = this.selectingStorageTarget && i === this.starterCursor ? "▶ " : "  ";
        const starterName = getPokemonSpecies(starter.speciesId).name;
        const itemCount = (starter as any).preRunItems?.length ?? 0;
        return `${cursor}${starterName} (${itemCount})`;
      })
      .join("\n");

    const stepText = this.selectingStorageItem
      ? "아이템 선택 중"
      : this.selectingStorageAmount
        ? "수량 선택 중"
        : this.selectingStorageTarget
          ? "대상 스타팅 선택 중"
          : "";

    const amountText = this.selectedStorageEntry ? `선택 수량: ${this.selectedStorageAmount}` : "";

    this.detailBodyText.setText(`${stepText}\n\n${amountText}\n\n[스타팅]\n${starterLines}`);
  }

  private getStorageList(): RogueShopStorageEntry[] {
    return this.storageItems;
  }

  private requiresPokemonTarget(entry: RogueShopStorageEntry): boolean {
    return entry.purchaseMode === "SELECT_POKEMON";
  }

  private applyStorageItemToStarter(entry: RogueShopStorageEntry, starter: Starter, amount: number): number {
    const moved = globalScene.gameData.moveStorageItemToRun(entry.id, amount);
    if (!moved) {
      return 0;
    }

    (starter as any).preRunItems ??= [];
    for (let i = 0; i < amount; i++) {
      (starter as any).preRunItems.push(entry.id);
    }

    return amount;
  }

  private refreshStarterPanelSafe(): void {
    try {
      if ((this as any).refreshStarterPanel) {
        (this as any).refreshStarterPanel();
      }
    } catch (e) {
      console.warn("[ROGUE_SHOP] refreshStarterPanelSafe failed", e);
    }
  }

  private saveRogueDataSafe(): void {
    try {
      if (globalScene?.gameData?.saveSystem) {
        globalScene.gameData.saveSystem();
      }
    } catch (e) {
      console.warn("[ROGUE_SHOP] saveRogueDataSafe failed", e);
    }
  }

  private onStorageButtonPressed(): void {
    this.openStorageApplyMode();
  }

  private getCandySpeciesList(): RogueBankCandySpeciesEntry[] {
    const result: RogueBankCandySpeciesEntry[] = [];
    const starterData = globalScene.gameData.starterData ?? {};

    for (const speciesIdStr of Object.keys(starterData)) {
      const speciesId = Number(speciesIdStr) as SpeciesId;
      const candyCount = starterData[speciesId]?.candyCount ?? 0;

      if (candyCount >= 10) {
        result.push({
          speciesId,
          name: getPokemonSpecies(speciesId).name,
          candyCount,
        });
      }
    }

    result.sort((a, b) => b.candyCount - a.candyCount);
    return result;
  }

  private isPokemonTargetStorageItem(itemId: string): boolean {
    const modifierType = this.resolveGeneratedStorageModifierType(itemId) ?? getModifierTypeById(itemId);
    if (!modifierType) {
      return false;
    }

    const party = globalScene.getPlayerParty();
    const samplePokemon = party[0];

    if (!samplePokemon) {
      return false;
    }

    try {
      const modifier = modifierType.newModifier(samplePokemon);
      return !!modifier && modifier instanceof PokemonHeldItemModifier;
    } catch (e) {
      console.warn("[ROGUE_SHOP] isPokemonTargetStorageItem failed", { itemId, e });
      return false;
    }
  }

  private parsePokeballTypeFromStorageId(itemId: string): PokeballType | null {
    if (!itemId.startsWith("BALL_")) {
      return null;
    }

    const value = Number(itemId.substring(5));

    if (Number.isNaN(value)) {
      return null;
    }

    return value as PokeballType;
  }

  /** 실제 로그센터 판매 목록을 창고 허용 목록으로 사용한다. */
  private getRogueShopSaleStorageIds(): Set<string> {
    const allowed = new Set<string>();
    for (const listing of this.shopListings) {
      if (!listing.option?.type || listing.specialAction) {
        continue;
      }
      const itemId = this.getStorageItemIdFromListing(listing);
      if (itemId) {
        allowed.add(itemId);
      }
      if (listing.id) {
        allowed.add(listing.id);
      }
      if (listing.option.type.id) {
        allowed.add(listing.option.type.id);
      }
    }
    return allowed;
  }

  private buildStorageEntries(): RogueShopStorageEntry[] {
    const storedItems = globalScene.gameData.getStorageItems();

    console.log("[ROGUE_SHOP] raw storageItems", storedItems);
    const allowed = this.getRogueShopSaleStorageIds();

    return storedItems
      .filter(item => {
        // 개별 판매 ID가 확인되지 않는 도구는 창고에 표시하지 않는다.
        // 기존 데이터는 삭제하지 않으며, 모드 클리어 시 신규 반입은 game-data.ts에서 차단한다.
        if (!allowed.has(item.itemId)) {
          console.info("[ROGUE_SHOP_STORAGE_NOT_FOR_SALE] 창고에서 제외 (원본 저장 데이터 보존)", item);
          return false;
        }
        return true;
      })
      .map(item => {
        console.log("[ROGUE_SHOP] storage entry raw", item);

        const display = this.getStorageDisplayMeta(item.itemId);

        let purchaseMode: "INSTANT" | "SELECT_POKEMON" | "TRAINER_LOADOUT" = (item as any).purchaseMode ?? "INSTANT";

        if (!(item as any).purchaseMode) {
          if (item.itemId.startsWith("BERRY_") || item.itemId === "BERRY") {
            purchaseMode = "SELECT_POKEMON";
          } else {
            const modifierType =
              this.resolveGeneratedStorageModifierType(item.itemId) ?? getModifierTypeById(item.itemId);

            if (modifierType && typeof (modifierType as any).getRogueShopPurchaseMode === "function") {
              purchaseMode = (modifierType as any).getRogueShopPurchaseMode();
            } else if (this.isPokemonTargetStorageItem(item.itemId)) {
              purchaseMode = "SELECT_POKEMON";
            }
          }
        }

        return {
          id: item.itemId,
          name: display.name,
          quantity: item.quantity,
          description: display.description,
          purchaseMode,
          option: undefined,
        };
      });
  }

  /**
   * 한국어 modifier-type.json에 정의된 이름을 직접 사용합니다.
   * 각 생성형 타입의 iconImage / enum 인자를 기준으로 종류별 정확한 이름을 찾습니다.
   * 실행 시 i18next가 아직 ko 리소스를 로드하지 않았더라도 영어로 표시되지 않습니다.
   */
  /**
   * 생성형 도구의 한국어 표시명은 원본 ModifierType의 id, 아이콘, 생성 인자를
   * 함께 조사합니다. 이름을 찾지 못하면 실제 조회값을 콘솔에서 확인할 수 있습니다.
   */
  private getLocalizedModifierName(modifierType: ModifierType | null | undefined, fallbackId: string): string {
    const map = ROGUE_SHOP_KO_NAME_MAP;
    const lookup = (key: string): string | undefined => map[key];
    const type = modifierType as
      | (ModifierType & { nameKey?: string; key?: string; getPregenArgs?: () => unknown[] })
      | undefined;
    const id = String(type?.id ?? fallbackId ?? "");
    const icon = String(type?.iconImage ?? "");
    const localeKey = String(type?.localeKey ?? "").replace(/^modifierType:/, "");
    const className = type?.constructor?.name ?? "";
    const args = typeof type?.getPregenArgs === "function" ? type.getPregenArgs() : [];
    const prefixes: Record<string, string> = {
      TEMP_WEATHER_ROCK: "WeatherRockTrainer",
      WEATHER_ROCK_TRAINER: "WeatherRockTrainer",
      TEMP_TERRAIN_SEED: "TerrainSeedTrainer",
      TERRAIN_SEED_TRAINER: "TerrainSeedTrainer",
      TEMP_STAT_STAGE_BOOSTER: "TempStatStageBoosterItem",
      BASE_STAT_BOOSTER: "BaseStatBoosterItem",
      ATTACK_TYPE_BOOSTER: "AttackTypeBoosterItem",
      TYPE_SPECIFIC_MOVE_BOOSTER: "TypeSpecificMoveBoosterItem",
      RARE_EVOLUTION_ITEM: "EvolutionItem",
      EVOLUTION_ITEM: "EvolutionItem",
      RARE_FORM_CHANGE_ITEM: "FormChangeItem",
      FORM_CHANGE_ITEM: "FormChangeItem",
    };
    const classes: Record<string, string> = {
      WeatherRockTrainerModifierType: "WeatherRockTrainer",
      TerrainSeedTrainerModifierType: "TerrainSeedTrainer",
      TempStatStageBoosterModifierType: "TempStatStageBoosterItem",
      BaseStatBoosterModifierType: "BaseStatBoosterItem",
      AttackTypeBoosterModifierType: "AttackTypeBoosterItem",
      TypeSpecificMoveBoosterModifierType: "TypeSpecificMoveBoosterItem",
      EvolutionItemModifierType: "EvolutionItem",
      FormChangeItemModifierType: "FormChangeItem",
    };
    const prefix = Object.keys(prefixes).find(
      p => id === p || id.startsWith(`${p}_`) || fallbackId === p || fallbackId.startsWith(`${p}_`),
    );
    const preferredGroup = classes[className] ?? (prefix ? prefixes[prefix] : "");
    const groups = [
      preferredGroup,
      "WeatherRockTrainer",
      "TerrainSeedTrainer",
      "TempStatStageBoosterItem",
      "BaseStatBoosterItem",
      "AttackTypeBoosterItem",
      "TypeSpecificMoveBoosterItem",
      "EvolutionItem",
      "FormChangeItem",
      "SpeciesBoosterItem",
      "exclusiveZMoves",
    ].filter(Boolean);
    const variants = [icon, String(type?.nameKey ?? ""), String(type?.key ?? ""), localeKey, id, fallbackId];
    const tried = new Set<string>();
    const candidates: string[] = [];
    for (const value of variants) {
      if (!value) {
        continue;
      }
      candidates.push(value, value.replace(/^modifierType:/, ""), value.toLowerCase(), value.toUpperCase());
      for (const group of groups) {
        const raw = value.replace(/^modifierType:/, "").replace(/^.*[.:]/, "");
        candidates.push(`${group}.${raw}`, `${group}.${raw.toLowerCase()}`, `${group}.${raw.toUpperCase()}`);
      }
    }
    for (const value of [id, fallbackId]) {
      if (!value) {
        continue;
      }
      candidates.push(`ModifierType.${value}`, `SpeciesBoosterItem.${value.replace(/^.*[.:]/, "")}`);
    }
    for (const candidate of candidates) {
      if (tried.has(candidate)) {
        continue;
      }
      tried.add(candidate);
      const found = lookup(candidate);
      if (found) {
        return found;
      }
    }
    // 명시적 매핑이 없는 동적 아이템(민트, Z기술 등)은 기존 생성 로직을 사용합니다.
    const nativeName = type?.name;
    if (
      typeof nativeName === "string"
      && nativeName.trim()
      && !nativeName.includes("{{")
      && !nativeName.endsWith(".name")
      && nativeName !== localeKey
      && nativeName !== "NULL.NAME"
    ) {
      if (/^[A-Za-z][A-Za-z0-9_ .:-]*$/.test(nativeName)) {
        console.warn("[ROGUE_SHOP_KO_UNRESOLVED]", {
          id,
          fallbackId,
          icon,
          localeKey,
          className,
          args,
          nativeName,
          preferredGroup,
        });
      }
      return nativeName;
    }
    console.warn("[ROGUE_SHOP_KO_UNRESOLVED]", {
      id,
      fallbackId,
      icon,
      localeKey,
      className,
      args,
      nativeName,
      preferredGroup,
    });
    return id || fallbackId || "이름없음";
  }

  private getListingDisplayName(listing: RogueShopListing): string {
    return this.getLocalizedModifierName(listing.option?.type, listing.id);
  }

  private confirmCandySpeciesSelection(): boolean {
    const selected = this.candySpeciesList[this.listCursor];
    const entry = this.pendingExchangeEntry;

    if (!selected || !entry || !entry.exchangeCurrencyType) {
      this.getUi().playError();
      return false;
    }

    this.selectingCandySpecies = false;
    this.refreshHelpText();

    this.getUi().setOverlayMode(UiMode.BANK_AMOUNT_FORM, {
      buttonActions: [
        (amount: number) => {
          const result = globalScene.gameData.exchangeCurrencyToRoguePoints(
            entry.exchangeCurrencyType,
            amount,
            selected.speciesId,
          );

          if (result.success) {
            this.setNotice(`${selected.name} 사탕 ${result.consumedAmount} 사용 -> RP ${result.gainedRp}`);
            this.getUi().playSelect();
          } else {
            this.setNotice(result.reason ?? "환전에 실패했습니다.");
            this.getUi().playError();
          }

          this.candySpeciesList = this.getCandySpeciesList();
          this.pendingExchangeEntry = null;
          this.syncBankDataWithGame();
          this.refreshMoneyTexts();
          this.refreshTabCursor();
          this.refreshList();
          this.refreshDetail();
          globalScene.gameData.saveSystem();
          this.getUi().revertMode();
        },

        () => {
          this.pendingExchangeEntry = null;
          this.setNotice("환전을 취소했습니다.");
          this.getUi().playSelect();
          this.getUi().revertMode();
        },
      ],
    });

    return true;
  }

  private processCandySpeciesSelectInput(button: Button): boolean {
    if (this.candySpeciesList.length === 0) {
      this.selectingCandySpecies = false;
      this.pendingExchangeEntry = null;
      return false;
    }

    switch (button) {
      case Button.UP:
        this.moveListCursor(-1);
        this.refreshTabCursor();
        this.refreshList();
        this.refreshDetail();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.DOWN:
        this.moveListCursor(1);
        this.refreshTabCursor();
        this.refreshList();
        this.refreshDetail();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.ACTION:
      case Button.SUBMIT:
        return this.confirmCandySpeciesSelection();

      case Button.CANCEL:
        this.selectingCandySpecies = false;
        this.pendingExchangeEntry = null;
        this.candySpeciesList = [];
        this.listCursor = 0;
        this.listScroll = 0;
        this.refreshTabCursor();
        this.refreshList();
        this.refreshDetail();
        this.refreshHelpText();
        this.setNotice("사탕 포켓몬 선택을 취소했습니다.", 1000);
        return true;
    }

    return false;
  }

  private processTargetSelectInput(button: Button): boolean {
    const starters = this.uiArgs?.starters ?? [];

    if (starters.length === 0) {
      this.selectingTarget = false;
      this.pendingTargetListing = null;
      this.pendingStorageItem = null;
      return false;
    }

    switch (button) {
      case Button.UP:
        this.targetCursor = this.targetCursor > 0 ? this.targetCursor - 1 : starters.length - 1;
        this.refreshStarterIcons();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.DOWN:
        this.targetCursor = this.targetCursor < starters.length - 1 ? this.targetCursor + 1 : 0;
        this.refreshStarterIcons();
        this.refreshHelpText();
        this.getUi().playSelect();
        return true;

      case Button.ACTION:
      case Button.SUBMIT:
        return this.confirmTargetSelection();

      case Button.CANCEL:
        this.selectingTarget = false;
        this.pendingTargetListing = null;
        this.pendingStorageItem = null;
        this.refreshStarterIcons();
        this.refreshHelpText();
        this.setNotice("대상 선택을 취소했습니다.", 1000);
        return true;
    }

    return false;
  }

  private getExchangeList(): RogueBankActionEntry[] {
    return [
      {
        name: "골드 -> 로그포인트",
        description: "1000골드당 1 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.MONEY,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
      {
        name: "포켓몬사탕 -> 로그포인트",
        description: "포켓몬사탕 10개당 1 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.CANDY,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
      {
        name: "알바우처 -> 로그포인트",
        description: "알바우처 1장당 15 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.VOUCHER_REGULAR,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
      {
        name: "알바우처플러스 -> 로그포인트",
        description: "알바우처플러스 1장당 60 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.VOUCHER_PLUS,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
      {
        name: "알바우처프리미엄 -> 로그포인트",
        description: "알바우처프리미엄 1장당 250 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.VOUCHER_PREMIUM,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
      {
        name: "알바우처골드 -> 로그포인트",
        description: "알바우처골드 1장당 250 로그포인트로 환전합니다.",
        exchangeCurrencyType: ExchangeCurrencyType.VOUCHER_GOLD,
        mode: "EXCHANGE",
        useCustomAmount: true,
      },
    ];
  }

  private confirmTargetSelection(): boolean {
    const starters = this.uiArgs?.starters ?? [];
    const starter = starters[this.targetCursor];

    if (!starter) {
      return false;
    }

    if (this.pendingStorageItem) {
      const item = this.pendingStorageItem;
      const amount = this.pendingStorageAmount || 1;

      const moved = globalScene.gameData.moveStorageItemToRun(item.id, amount);
      if (!moved) {
        this.setNotice("창고에서 아이템을 꺼낼 수 없습니다.");
        this.getUi().playError();
        return true;
      }

      (starter as any).preRunItems ??= [];
      for (let i = 0; i < amount; i++) {
        (starter as any).preRunItems.push(item.id);
      }

      this.pendingStorageItem = null;
      this.pendingStorageAmount = 1;
      this.selectingTarget = false;

      this.storageItems = this.buildStorageEntries();
      this.refreshStarterIcons();
      this.refreshList();
      this.refreshDetail();
      this.refreshHelpText();

      const speciesName = getPokemonSpecies(starter.speciesId).name;
      this.setNotice(`${item.name} ${amount}개를 ${speciesName}에게 지급 예정으로 등록했습니다.`);
      this.getUi().playSelect();
      return true;
    }

    const listing = this.pendingTargetListing;
    if (!listing) {
      return false;
    }

    const itemName = this.getListingDisplayName(listing);
    const speciesName = getPokemonSpecies(starter.speciesId).name;

    if (listing.purchaseMode === "SELECT_POKEMON" && this.uiArgs?.source === "MENU") {
      const fakeEntry: RogueShopStorageEntry = {
        id: listing.id,
        name: itemName,
        quantity: 1,
        description:
          typeof listing.option?.type?.getDescription === "function"
            ? listing.option.type.getDescription()
            : "설명이 없습니다.",
        purchaseMode: listing.purchaseMode,
        option: listing.option,
      };

      const availableCapacity = this.getAvailableHeldItemCapacity(starter, fakeEntry);
      if (availableCapacity <= 0) {
        this.setNotice(`${speciesName}은(는) 이미 ${itemName} 최대치입니다.`);
        this.getUi().playError();
        return true;
      }
    }

    if (!this.tryConsumeListingPurchase(listing)) {
      return true;
    }

    let applied = false;

    if (this.uiArgs?.source === "MENU") {
      const fakeEntry: RogueShopStorageEntry = {
        id: listing.id,
        name: itemName,
        quantity: 1,
        description:
          typeof listing.option?.type?.getDescription === "function"
            ? listing.option.type.getDescription()
            : "설명이 없습니다.",
        purchaseMode: listing.purchaseMode,
        option: listing.option,
      };

      applied = this.applyStorageItemImmediatelyToPartyPokemon(starter, fakeEntry, 1);
    } else {
      (starter as any).preRunItems ??= [];
      (starter as any).preRunItems.push(listing.id);
      applied = true;
    }

    if (!applied) {
      globalScene.gameData.addRoguePoints(listing.priceRp);
      listing.stock++;
      this.setNotice("아이템을 적용할 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    this.selectingTarget = false;
    this.pendingTargetListing = null;

    this.syncBankDataWithGame();
    this.refreshMoneyTexts();
    this.refreshStarterIcons();
    this.refreshList();
    this.refreshDetail();
    this.refreshHelpText();
    globalScene.gameData.saveSystem();

    this.setNotice(`${itemName}을(를) ${speciesName}에게 적용했습니다.`);
    this.getUi().playSelect();
    return true;
  }

  private syncBankDataWithGame(): void {
    this.bankData.roguePoints = globalScene.gameData.roguePoints ?? 0;
    this.bankData.gold = globalScene.money ?? 0;
    this.bankData.bankRoguePoints = globalScene.gameData.bankRoguePoints ?? 0;
    this.bankData.bankGold = globalScene.gameData.bankMoney ?? 0;
  }

  private handleSubmit(): boolean {
    switch (this.currentTab) {
      case "SHOP":
        return this.handleShopConfirm();
      case "BANK":
        return this.handleBankConfirm();
      case "STORAGE":
        return this.handleStorageConfirm();
      case "QUEST":
        return this.handleQuestConfirm();
      case "PRACTICE":
        return this.handlePracticeConfirm();
      case "WORKSHOP":
        return this.handleWorkshopConfirm();
      case "MINE":
        return this.handleMineConfirm();
      case "BRIEFING":
        return this.handleBriefingConfirm();
      case "HEADQUARTERS":
        return this.handleHeadquartersConfirm();
      case "MEETING":
        return this.handleMeetingConfirm();
      case "CAFE":
        return this.handleCafeConfirm();
      default:
        return false;
    }
  }

  /** 회의실 전용 대화 연출: 로그센터 UI와 분리해서 일반 스토리 대화창을 사용합니다. */
  private handleBriefingConfirm(): boolean {
    if (globalScene.gameData.isUnlocked(Unlockables.LOG_CENTER_BRIEFING_SEEN)) {
      this.setNotice("현재 진행 중인 새로운 스토리가 없습니다.");
      return true;
    }

    const female = globalScene.gameData.gender === PlayerGender.FEMALE;
    const leader = female ? "미로" : "미지";
    const rival = female ? "핀" : "아이비";
    const rivalSprite = female ? "rival_m" : "rival_f";
    const lines: Array<{ speaker: string; message: string; portrait?: string }> = [
      {
        speaker: leader,
        message: "클래식에서 정말 대단한 활약을 보여줬어! 이제 우리와 정식으로 함께하게 된 걸 축하해!",
      },
      {
        speaker: rival,
        message: "나도 네 실력을 인정해. 앞으로는 정식 팀원으로서 함께 탐사하는 거야.",
        portrait: rivalSprite,
      },
      { speaker: leader, message: `${rival}도 이렇게 말하니 든든하네! 셋이서 힘을 합쳐 보자!` },
      { speaker: "캡틴", message: "하하하! 자네가 정식 로그탐사대원이 된 것을 진심으로 축하하네!" },
      {
        speaker: "캡틴",
        message:
          "새로운 탐사를 위한 터몽도감과 트레이닝 카드 슬롯도 준비했네. 자세한 사용법은 본부에서 확인할 수 있을 걸세.",
      },
      { speaker: "페더", message: "캡틴! 방금 긴급 구조 의뢰가 도착했습니다!" },
      { speaker: "페더", message: "바닐라라는 트레이너가 초코라는 에픽 이로치 나옹을 찾아달라고 부탁했어요." },
      { speaker: "페더", message: "초코가 사라진 경위는 아직 자세히 알려지지 않았다고 합니다." },
      { speaker: leader, message: "그렇다면 우리가 가봐야겠네. 초코를 무사히 찾아주자!" },
      { speaker: rival, message: "좋아. 준비를 마치고 출발하자!", portrait: rivalSprite },
      {
        speaker: "페더",
        message: "출발 전에 동료 시스템도 설명해 드릴게요. 탐사 중에는 동료가 전투에서 여러분을 도와줄 수 있어요.",
      },
      { speaker: "페더", message: "준비가 끝나면 디 아더에서 초코의 행방을 찾아주세요!" },
    ];

    // 먼저 상점 화면을 숨기고 메시지 전용 UI로 이동합니다.
    // 시설 화면 안의 상세 설명 영역에 스토리를 표시하지 않습니다.
    this.rootContainer.setVisible(false);
    void globalScene.ui
      .setMode(UiMode.MESSAGE)
      .then(async () => {
        await globalScene.showFieldOverlay(350);

        const finish = async (): Promise<void> => {
          await globalScene.charSprite.hide();
          await globalScene.hideFieldOverlay(350);
          // 실제 도구 지급 및 디 아더 출발 처리 전까지는 완료 플래그를 저장하지 않습니다.
          // 따라서 대화는 다시 볼 수 있습니다.
          await globalScene.ui.setMode(UiMode.ROGUE_SHOP, this.uiArgs ?? {});
        };

        const next = async (index: number): Promise<void> => {
          if (index >= lines.length) {
            await finish();
            return;
          }
          const line = lines[index];
          // 현재 확인된 라이벌 일러스트만 표시합니다. 다른 인물 에셋은 이후 연결합니다.
          if (line.portrait) {
            await globalScene.charSprite.showCharacter(line.portrait, 0);
          } else {
            await globalScene.charSprite.hide();
          }
          globalScene.ui.showDialogue(line.message, line.speaker, null, () => {
            void next(index + 1);
          });
        };
        await next(0);
      })
      .catch(error => {
        console.error("[BRIEFING_CUTSCENE_FAILED]", error);
        void globalScene.hideFieldOverlay(0).then(() => globalScene.ui.setMode(UiMode.ROGUE_SHOP, this.uiArgs ?? {}));
      });
    return true;
  }

  private handleHeadquartersConfirm(): boolean {
    const entry = this.getCurrentList()[this.listCursor] as RogueWorkshopEntry | undefined;
    if (entry) {
      this.setNotice(entry.description);
    }
    return true;
  }

  private handleMeetingConfirm(): boolean {
    const list = this.getCurrentList();
    const entry = list[this.listCursor] as RogueCompanionEntry;

    if (!entry || entry.trainerType == null) {
      this.getUi().playError();
      return false;
    }

    if (companionManager.isRecruited(entry.trainerType)) {
      this.setNotice(`${entry.name}은(는) 이미 동료입니다.`);
      this.getUi().playError();
      return true;
    }

    companionManager.recruit(entry.trainerType);

    globalScene.gameData.saveSystem();

    this.setNotice(`${entry.name}이(가) 동료가 되었습니다!`);

    this.getUi().playSelect();

    this.refreshList();
    this.refreshDetail();

    return true;
  }

  private handleCafeConfirm(): boolean {
    const list = this.getCurrentList();
    const entry = list[this.listCursor] as RogueCompanionEntry;

    if (!entry) {
      this.getUi().playError();
      return false;
    }

    if (entry.action === "SOLO") {
      const previousKnowhow = companionManager.getActiveKnowhow();

      companionManager.clearActive();

      console.log("[COMPANION_KNOWHOW_CLEARED]", {
        previousKnowhowId: previousKnowhow?.id,
        previousKnowhow: previousKnowhow?.name,
      });

      for (const pokemon of globalScene.getPlayerParty()) {
        pokemon.calculateStats();
      }

      globalScene.gameData.saveSystem();

      this.setNotice("이번 모험은 혼자 떠납니다.");

      this.getUi().playSelect();

      this.refreshList();
      this.refreshDetail();

      return true;
    }

    if (entry.action === "SELECT" && entry.trainerType != null) {
      if (!companionManager.isRecruited(entry.trainerType)) {
        this.setNotice(`${entry.name}은(는) 아직 동료가 아닙니다.`);

        this.getUi().playError();
        return true;
      }

      const selected = companionManager.setActive(entry.trainerType);

      if (selected) {
        console.log("[COMPANION_KNOWHOW_ACTIVATED]", {
          trainerType: entry.trainerType,
          companion: entry.name,
          knowhowId: companionManager.getActiveKnowhowId(),
          knowhow: companionManager.getActiveKnowhow()?.name,
        });

        for (const pokemon of globalScene.getPlayerParty()) {
          pokemon.calculateStats();
        }
      }

      globalScene.gameData.saveSystem();

      this.setNotice(`${entry.name}와 함께 모험을 떠납니다.`);

      this.getUi().playSelect();

      this.refreshList();
      this.refreshDetail();

      return true;
    }

    return false;
  }

  private handleMineConfirm(): boolean {
    this.getUi().playSelect();

    void this.getUi().setMode(UiMode.ROGUE_MINE, {
      onExit: () => {
        void globalScene.ui.setMode(UiMode.ROGUE_SHOP, {
          ...this.uiArgs,
          initialTab: "MINE",
        });
      },
    });

    return true;
  }

  private handleWorkshopConfirm(): boolean {
    const entry = this.workshopEntries[this.listCursor];

    if (!entry) {
      this.getUi().playError();
      return false;
    }

    this.getUi().playSelect();

    void this.getUi().setMode(UiMode.CRAFTING, {
      returnMode: UiMode.ROGUE_SHOP,
      returnArgs: this.uiArgs ?? undefined,
      location: CraftingLocation.ROGUE_WORKSHOP,
    });

    return true;
  }

  private handleShopConfirm(): boolean {
    const listing = this.shopListings[this.listCursor];

    if (!listing) {
      return false;
    }

    // ★ 쿠폰 교환소
    if (listing.specialAction === "COUPON") {
      this.getUi().playSelect();
      this.getUi().setOverlayMode(UiMode.COUPON);
      return true;
    }

    // 이하 기존 상품 구매 로직
    if (listing.stock <= 0) {
      this.setNotice("매진된 상품입니다.");
      this.getUi().playError();
      return true;
    }

    const hasSelectedStarters = (this.uiArgs?.starters?.length ?? 0) > 0;

    /*
     * 스타팅을 고르기 전 로그센터로 바로 들어온 경우:
     * 적용 대상이 없으므로 목적지 선택창을 띄우지 않고
     * 구매 즉시 창고로 보낸다.
     */
    if (!hasSelectedStarters) {
      console.log("[ROGUE_SHOP] no starters -> auto storage", {
        id: listing.id,
        name: this.getListingDisplayName(listing),
        source: this.uiArgs?.source,
      });

      return this.purchaseListingToStorage(listing);
    }

    /*
     * 스타팅을 고른 뒤 로그센터에 들어온 경우:
     * 기존처럼 적용 / 창고 / 취소 중 하나를 선택한다.
     */
    this.pendingShopListing = listing;
    this.selectingShopDestination = true;
    this.shopDestinationCursor = 0;

    this.refreshDetail();
    this.refreshHelpText();
    this.getUi().playSelect();
    return true;
  }

  private handleBankConfirm(): boolean {
    const list = this.getCurrentList();
    const entry = list[this.listCursor] as RogueBankActionEntry;

    if (!entry) {
      return false;
    }

    if (entry.mode === "EXCHANGE" && entry.exchangeCurrencyType === ExchangeCurrencyType.CANDY) {
      this.candySpeciesList = this.getCandySpeciesList();

      if (this.candySpeciesList.length === 0) {
        this.setNotice("환전 가능한 포켓몬사탕이 없습니다.");
        this.getUi().playError();
        return true;
      }

      this.selectingCandySpecies = true;
      this.pendingExchangeEntry = entry;
      this.listCursor = 0;
      this.listScroll = 0;
      this.refreshTabCursor();

      this.refreshList();
      this.refreshDetail();
      this.refreshHelpText();
      this.setNotice("사탕을 사용할 포켓몬을 선택하세요.");
      return true;
    }

    if (entry.useCustomAmount) {
      this.getUi().setOverlayMode(UiMode.BANK_AMOUNT_FORM, {
        buttonActions: [
          (amount: number) => {
            if (entry.mode === "EXCHANGE") {
              const exchangeType = entry.exchangeCurrencyType;
              if (!exchangeType) {
                this.setNotice("환전 타입이 올바르지 않습니다.");
                this.getUi().playError();
                this.getUi().revertMode();
                return;
              }

              const result = globalScene.gameData.exchangeCurrencyToRoguePoints(exchangeType, amount);

              if (result.success) {
                this.setNotice(`${entry.name} / ${result.consumedAmount} 사용 -> RP ${result.gainedRp}`);
                this.getUi().playSelect();
              } else {
                this.setNotice(result.reason ?? "환전에 실패했습니다.");
                this.getUi().playError();
              }

              this.syncBankDataWithGame();
              this.refreshMoneyTexts();
              this.refreshDetail();
              globalScene.gameData.saveSystem();
              this.getUi().revertMode();
              return;
            }

            const bonus = Math.floor(amount / 100) * 10;

            const success =
              entry.mode === "DEPOSIT"
                ? globalScene.gameData.depositCurrency(entry.currency!, amount)
                : globalScene.gameData.withdrawCurrency(entry.currency!, amount);

            if (success) {
              const label = entry.currency === BankCurrencyType.ROGUE_POINTS ? "로그포인트" : "골드";

              if (entry.mode === "DEPOSIT") {
                this.setNotice(`${label} ${amount} 입금 (이자 +${bonus})`);
              } else {
                this.setNotice(`${label} ${amount} 출금`);
              }

              this.getUi().playSelect();
            } else {
              this.setNotice("잔액이 부족합니다.");
              this.getUi().playError();
            }

            this.syncBankDataWithGame();
            this.refreshMoneyTexts();
            this.refreshDetail();
            globalScene.gameData.saveSystem();
            this.getUi().revertMode();
          },

          () => {
            this.setNotice("작업을 취소했습니다.");
            this.getUi().playSelect();
            this.getUi().revertMode();
          },
        ],
      });

      return true;
    }

    if (typeof entry.amount !== "number") {
      return false;
    }

    if (entry.mode === "EXCHANGE") {
      const exchangeType = entry.exchangeCurrencyType;
      if (!exchangeType) {
        this.setNotice("환전 타입이 올바르지 않습니다.");
        this.getUi().playError();
        return true;
      }

      const result = globalScene.gameData.exchangeCurrencyToRoguePoints(exchangeType, entry.amount);

      if (result.success) {
        this.setNotice(`${entry.name} / ${result.consumedAmount} 사용 -> RP ${result.gainedRp}`);
        this.getUi().playSelect();
      } else {
        this.setNotice(result.reason ?? "환전에 실패했습니다.");
        this.getUi().playError();
      }

      this.syncBankDataWithGame();
      this.refreshMoneyTexts();
      this.refreshDetail();
      globalScene.gameData.saveSystem();
      return true;
    }

    const success =
      entry.mode === "DEPOSIT"
        ? globalScene.gameData.depositCurrency(entry.currency!, entry.amount)
        : globalScene.gameData.withdrawCurrency(entry.currency!, entry.amount);

    if (success) {
      this.getUi().playSelect();
    } else {
      this.getUi().playError();
    }

    this.syncBankDataWithGame();
    this.refreshMoneyTexts();
    this.refreshDetail();
    globalScene.gameData.saveSystem();
    return true;
  }

  private handleStorageConfirm(): boolean {
    const item = this.storageItems[this.listCursor];
    if (!item) {
      return false;
    }

    const hasStarters = (this.uiArgs?.starters?.length ?? 0) > 0;
    if (!hasStarters) {
      this.setNotice("적용할 스타팅이 없습니다.");
      this.getUi().playError();
      return true;
    }

    this.openStorageApplyMode();
    this.storageCursor = this.listCursor;
    this.storageScroll = this.listScroll;
    this.selectedStorageEntry = this.storageItems[this.storageCursor] ?? null;
    this.selectedStorageAmount = 1;

    this.refreshStorageApplyUi();
    this.refreshStarterIcons();
    this.refreshHelpText();
    this.setNotice("수량을 고른 뒤 적용할 스타팅을 선택하세요.");
    this.getUi().playSelect();
    return true;
  }

  private handleQuestConfirm(): boolean {
    const quest = questManager.getQuests()[this.listCursor];

    if (!quest) {
      this.getUi().playError();
      return false;
    }

    // 완료한 의뢰 → 보상 수령
    if (quest.completed) {
      // RP 지급
      globalScene.gameData.addRoguePoints(quest.rewardRp);

      // 골드 → 로그센터 은행
      globalScene.gameData.bankMoney = (globalScene.gameData.bankMoney ?? 0) + quest.rewardGold;

      // 아이템 → 로그센터 창고
      for (const rewardItem of quest.rewardItems ?? []) {
        globalScene.gameData.addToStorage(rewardItem.modifierTypeId, rewardItem.quantity);

        console.log("[QUEST_ITEM_REWARD]", {
          questId: quest.id,
          itemId: rewardItem.modifierTypeId,
          quantity: rewardItem.quantity,
        });
      }

      console.log("[QUEST_REWARD_CLAIMED]", {
        questId: quest.id,
        title: quest.title,
        rewardRp: quest.rewardRp,
        rewardGold: quest.rewardGold,
        rewardItems: quest.rewardItems,
      });

      globalScene.gameData.saveSystem();

      // 보상 수령 완료 후 완료 의뢰 제거
      questManager.removeCompletedQuests();

      // 창고 목록도 즉시 갱신
      this.storageItems = this.buildStorageEntries();

      this.listCursor = 0;
      this.listScroll = 0;

      this.refreshMoneyTexts();
      this.refreshList();
      this.refreshDetail();
      this.refreshHelpText();

      this.setNotice("의뢰 보상을 수령했습니다.");

      this.getUi().playSelect();

      return true;
    }

    // 이미 수락한 경우 → 수락 취소
    if (quest.accepted) {
      const cancelled = questManager.cancelQuest(quest.id);

      if (!cancelled) {
        this.setNotice("의뢰 수락을 취소할 수 없습니다.");

        this.getUi().playError();

        return true;
      }

      this.setNotice("의뢰 수락을 취소했습니다.");

      this.getUi().playSelect();

      this.refreshList();
      this.refreshDetail();
      this.refreshHelpText();

      return true;
    }

    // 최대 수락 개수 검사
    const acceptedCount = questManager.getAcceptedQuestCount();

    if (acceptedCount >= questManager.getMaxAcceptedQuests()) {
      this.setNotice(`의뢰는 최대 ${questManager.getMaxAcceptedQuests()}개까지 수락할 수 있습니다.`);

      this.getUi().playError();

      return true;
    }

    // 의뢰 수락
    const accepted = questManager.acceptQuest(quest.id);

    if (!accepted) {
      this.setNotice("의뢰를 수락할 수 없습니다.");

      this.getUi().playError();

      return true;
    }

    this.setNotice(`의뢰를 수락했습니다. (${acceptedCount + 1}/${questManager.getMaxAcceptedQuests()})`);

    this.getUi().playSelect();

    this.refreshList();
    this.refreshDetail();
    this.refreshHelpText();

    return true;
  }

  private handlePracticeConfirm(): boolean {
    switch (this.listCursor) {
      case 0:
        return this.startPracticeMode();

      case 1:
        this.openPracticeLevelMenu("dummy1");
        return true;

      case 2:
        this.openPracticeLevelMenu("dummy2");
        return true;

      case 3:
        this.openPracticeStatMenu("dummy1");
        return true;

      case 4:
        this.openPracticeStatMenu("dummy2");
        return true;

      case 5:
        this.openPracticeTypeMenu("dummy1");
        return true;

      case 6:
        this.openPracticeTypeMenu("dummy2");
        return true;

      case 7:
        this.openPracticeAbilityMenu("dummy1");
        return true;

      case 8:
        this.openPracticeAbilityMenu("dummy2");
        return true;

      case 9:
        this.openPracticePassiveMenu("dummy1");
        return true;

      case 10:
        this.openPracticePassiveMenu("dummy2");
        return true;

      case 11:
        return this.togglePracticeDummyCanAct();

      case 12:
        this.openPracticeDummy1MoveMenu();
        return true;

      case 13:
        this.openPracticeDummy2MoveMenu();
        return true;

      case 14:
        this.openPracticeDummy1RentalModifierMenu();
        return true;

      case 15:
        this.openPracticeDummy2RentalModifierMenu();
        return true;

      case 16:
        return this.togglePracticeExpReward();

      case 17:
        return this.togglePracticeMoneyReward();

      case 18:
        return this.togglePracticeRpReward();

      case 19:
        return this.togglePracticeDummyFaint();

      case 20:
        return this.togglePracticeAllyFaint();

      case 21:
        this.openPracticeBattleTypeMenu();
        return true;

      case 22:
        return this.resetPracticeDummyConfig();

      case 23:
        this.openPracticePresetSaveMenu();
        return true;

      case 24:
        this.openPracticePresetLoadMenu();
        return true;
    }

    return true;
  }

  private startPracticeMode(): boolean {
    globalScene.gameMode = getGameMode(GameModes.PRACTICE);

    this.rootContainer.setVisible(false);
    this.getUi().setMode(UiMode.MESSAGE);
    this.getUi().clearText();

    this.uiArgs?.onPracticeStart?.();
    return true;
  }

  private openPracticeLevelMenu(dummyKey: "dummy1" | "dummy2"): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_LEVEL_FORM, {
      dummyKey,
      buttonActions: [
        (level: number) => {
          this.setNotice(`${dummyKey === "dummy1" ? "대타1" : "대타2"} 레벨 ${level} 설정 완료`);

          this.getUi().revertMode();
        },

        () => {
          this.getUi().revertMode();
        },
      ],
    });
  }

  private openPracticeStatMenu(dummyKey: "dummy1" | "dummy2"): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_STAT_FORM, {
      dummyKey,
      buttonActions: [
        () => {
          this.setNotice(`${dummyKey === "dummy1" ? "대타1" : "대타2"} 능력치 설정 완료`);

          this.getUi().revertMode();
        },

        () => {
          this.getUi().revertMode();
        },
      ],
    });
  }

  private openPracticeTypeMenu(dummyKey: "dummy1" | "dummy2"): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_TYPE_FORM, {
      dummyKey,
      buttonActions: [
        () => {
          this.setNotice(`${dummyKey === "dummy1" ? "대타1" : "대타2"} 타입 설정 완료`);

          this.getUi().revertMode();
        },

        () => {
          this.getUi().revertMode();
        },
      ],
    });
  }

  private openPracticeAbilityMenu(dummyKey: "dummy1" | "dummy2"): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_ABILITY_FORM, {
      dummyKey,

      target: "ability",

      title: dummyKey === "dummy1" ? "대타1 특성을 선택하시오" : "대타2 특성을 선택하시오",
    });
  }

  private openPracticePassiveMenu(dummyKey: "dummy1" | "dummy2"): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_ABILITY_FORM, {
      dummyKey,

      target: "passive",

      title: dummyKey === "dummy1" ? "대타1 패시브를 선택하시오" : "대타2 패시브를 선택하시오",
    });
  }

  private openPracticeDummy1MoveMenu(): void {
    globalScene.ui.setOverlayMode(UiMode.PRACTICE_MOVE_FORM, {
      dummyKey: "dummy1",
    });
  }

  private openPracticeDummy2MoveMenu(): void {
    globalScene.ui.setOverlayMode(UiMode.PRACTICE_MOVE_FORM, {
      dummyKey: "dummy2",
    });
  }

  private openPracticeDummy1RentalModifierMenu(): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_RENTAL_MODIFIER_SELECT, {
      dummyKey: "dummy1",
    });
  }

  private openPracticeDummy2RentalModifierMenu(): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_RENTAL_MODIFIER_SELECT, {
      dummyKey: "dummy2",
    });
  }

  private togglePracticeDummyCanAct(): boolean {
    globalScene.gameData.practiceDummyConfig ??= {};

    const current = globalScene.gameData.practiceDummyConfig.canAct ?? false;

    globalScene.gameData.practiceDummyConfig.canAct = !current;

    console.log("[PRACTICE] toggle canAct", {
      before: current,
      after: !current,
      config: globalScene.gameData.practiceDummyConfig,
    });

    globalScene.gameData.saveSystem();

    this.setNotice(!current ? "대타출동이 행동하도록 설정했습니다." : "대타출동이 행동하지 않도록 설정했습니다.");

    this.getUi().playSelect();
    this.refreshDetail();
    return true;
  }

  private togglePracticeExpReward(): boolean {
    globalScene.gameData.practiceDummyConfig ??= {};
    globalScene.gameData.practiceDummyConfig.rewardFlags ??= {};

    const current = globalScene.gameData.practiceDummyConfig.rewardFlags.exp ?? false;

    globalScene.gameData.practiceDummyConfig.rewardFlags.exp = !current;

    globalScene.gameData.saveSystem();

    this.setNotice(!current ? "연습모드 경험치 지급 ON" : "연습모드 경험치 지급 OFF");

    this.refreshDetail();
    this.getUi().playSelect();
    return true;
  }

  private togglePracticeMoneyReward(): boolean {
    globalScene.gameData.practiceDummyConfig ??= {};
    globalScene.gameData.practiceDummyConfig.rewardFlags ??= {};

    const current = globalScene.gameData.practiceDummyConfig.rewardFlags.money ?? false;

    globalScene.gameData.practiceDummyConfig.rewardFlags.money = !current;

    globalScene.gameData.saveSystem();

    this.setNotice(!current ? "연습모드 골드 지급 ON" : "연습모드 골드 지급 OFF");

    this.refreshDetail();
    this.getUi().playSelect();
    return true;
  }

  private togglePracticeRpReward(): boolean {
    globalScene.gameData.practiceDummyConfig ??= {};
    globalScene.gameData.practiceDummyConfig.rewardFlags ??= {};

    const current = globalScene.gameData.practiceDummyConfig.rewardFlags.roguePoints ?? false;

    globalScene.gameData.practiceDummyConfig.rewardFlags.roguePoints = !current;

    globalScene.gameData.saveSystem();

    this.setNotice(!current ? "연습모드 로그포인트 지급 ON" : "연습모드 로그포인트 지급 OFF");

    this.refreshDetail();
    this.getUi().playSelect();
    return true;
  }

  private togglePracticeDummyFaint(): boolean {
    const cfg = (globalScene.gameData.practiceDummyConfig ??= {});
    cfg.rewardFlags ??= {};

    cfg.rewardFlags.allowDummyFaint = !cfg.rewardFlags.allowDummyFaint;

    this.refreshList();
    return true;
  }

  private togglePracticeAllyFaint(): boolean {
    const cfg = (globalScene.gameData.practiceDummyConfig ??= {});
    cfg.rewardFlags ??= {};

    cfg.rewardFlags.allowAllyFaint = !cfg.rewardFlags.allowAllyFaint;

    globalScene.gameData.saveSystem();

    this.setNotice(cfg.rewardFlags.allowAllyFaint ? "아군 기절 처리 ON" : "아군 기절 처리 OFF");

    this.refreshList();
    this.refreshDetail();
    this.getUi().playSelect();
    return true;
  }

  private openPracticeBattleTypeMenu(): void {
    this.getUi().setOverlayMode(UiMode.MENU_OPTION_SELECT, {
      options: [
        {
          label: "싱글배틀",
          handler: () => {
            const cfg = (globalScene.gameData.practiceDummyConfig ??= {});
            (cfg as any).battleType = "SINGLE";

            globalScene.gameData.saveSystem();

            this.setNotice("배틀 유형을 싱글배틀로 설정했습니다.");
            this.refreshList();
            this.refreshDetail();
            this.getUi().playSelect();
            return true;
          },
          keepOpen: false,
        },
        {
          label: "더블배틀",
          handler: () => {
            const cfg = (globalScene.gameData.practiceDummyConfig ??= {});
            (cfg as any).battleType = "DOUBLE";

            globalScene.gameData.saveSystem();

            this.setNotice("배틀 유형을 더블배틀로 설정했습니다.");
            this.refreshList();
            this.refreshDetail();
            this.getUi().playSelect();
            return true;
          },
          keepOpen: false,
        },
        {
          label: "취소",
          handler: () => true,
          keepOpen: false,
        },
      ],
      xOffset: 90,
      yOffset: 24,
      maxOptions: 3,
    });
  }

  private openPracticePresetSaveMenu(): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_PRESET_SLOT, PracticePresetSlotUiMode.SAVE, (slot: number) => {
      if (slot < 0) {
        return;
      }

      const preset: PracticePresetData = {
        name: `프리셋 ${slot + 1}`,

        config: structuredClone(globalScene.gameData.practiceDummyConfig),

        rentalModifiers: structuredClone(globalScene.gameData.practiceDummyConfig?.rentalModifiers ?? []),

        starters: structuredClone(globalScene.gameData.lastSelectedStarters ?? []),

        timestamp: Date.now(),
      };

      globalScene.gameData.savePracticePreset(slot, preset);
      this.setNotice(`프리셋 ${slot + 1} 저장 완료`);
      this.refreshList();
      this.refreshDetail();
    });
  }

  private openPracticePresetLoadMenu(): void {
    this.getUi().setOverlayMode(UiMode.PRACTICE_PRESET_SLOT, PracticePresetSlotUiMode.LOAD, (slot: number) => {
      if (slot < 0) {
        return;
      }

      const preset = globalScene.gameData.getPracticePreset(slot);

      if (!preset) {
        this.setNotice("불러올 프리셋이 없습니다.");
        this.getUi().playError();
        return;
      }

      globalScene.gameData.practiceDummyConfig = JSON.parse(JSON.stringify(preset.config ?? {}));

      // 연습 전투에서는 practiceDummyConfig.rentalModifiers를 사용합니다.
      globalScene.gameData.practiceDummyConfig.rentalModifiers = (
        preset.rentalModifiers
        ?? preset.config?.rentalModifiers
        ?? []
      ).map(item => ({
        itemId: item.itemId,
        quantity: item.quantity,
      }));

      const presetStarters = (preset.starters ?? []).map(starter => ({
        ...starter,
        preRunItems: [...(starter.preRunItems ?? [])],
      }));

      globalScene.gameData.lastSelectedStarters = presetStarters;

      globalScene.gameData.pendingPracticePresetStarters = presetStarters;

      globalScene.gameData.saveSystem();

      this.rootContainer.setVisible(false);
      this.uiArgs?.onPracticePresetStart?.();
    });
  }

  private openPracticeDummyConfig(): boolean {
    this.openPracticeLevelMenu("dummy1");
    return true;
  }

  private resetPracticeDummyConfig(): boolean {
    globalScene.gameData.practiceDummyConfig = {
      dummy1: {},
      dummy2: {},
      rentalModifiers: [],
      battleType: "SINGLE",
    };

    globalScene.gameData.saveSystem();

    this.setNotice("대타출동 설정을 초기화했습니다.");
    this.getUi().playSelect();
    return true;
  }

  private openStorageAmountMenu(item: RogueShopStorageEntry): void {
    const max = Math.min(item.quantity, 9);

    globalScene.ui.setOverlayMode(UiMode.MENU_OPTION_SELECT, {
      options: new Array(max)
        .fill(null)
        .map((_, i) => {
          const amount = i + 1;
          return {
            label: `${amount}개 꺼내기`,
            handler: () => {
              this.pendingStorageAmount = amount;
              this.selectingTarget = true;
              this.targetCursor = 0;
              this.refreshStarterIcons();
              this.refreshHelpText();
              this.setNotice(`${item.name} ${amount}개를 줄 스타팅을 선택하세요.`);
              return true;
            },
            keepOpen: false,
          };
        })
        .concat([
          {
            label: "취소",
            handler: () => true,
            keepOpen: false,
          },
        ]),
      xOffset: 90,
      yOffset: 24,
      maxOptions: 6,
    });
  }

  private syncTabFromCursor(): void {
    this.currentTab = this.enabledTabs[this.tabCursor];
  }

  private resetListState(): void {
    this.listCursor = 0;
    this.listScroll = 0;
  }

  private moveTabCursor(delta: number): boolean {
    if (this.enabledTabs.length <= 1) {
      return false;
    }

    this.tabCursor = (this.tabCursor + delta + this.enabledTabs.length) % this.enabledTabs.length;

    if (this.tabCursor < this.tabScroll) {
      this.tabScroll = this.tabCursor;
    }

    if (this.tabCursor >= this.tabScroll + this.visibleTabCount) {
      this.tabScroll = this.tabCursor - this.visibleTabCount + 1;
    }

    // 끝에서 처음으로 순환했을 때
    if (this.tabCursor === 0) {
      this.tabScroll = 0;
    }

    // 처음에서 끝으로 역순환했을 때
    if (this.tabCursor === this.enabledTabs.length - 1) {
      this.tabScroll = Math.max(0, this.enabledTabs.length - this.visibleTabCount);
    }

    this.syncTabFromCursor();
    globalScene.ui.hideTooltip();
    this.resetListState();

    return true;
  }

  private moveListCursor(delta: number): boolean {
    const maxIndex = this.getCurrentList().length - 1;
    if (maxIndex < 0) {
      return false;
    }

    let next = this.listCursor + delta;

    if (next < 0) {
      next = maxIndex;
    } else if (next > maxIndex) {
      next = 0;
    }

    this.listCursor = next;

    if (this.listCursor < this.listScroll) {
      this.listScroll = this.listCursor;
    } else if (this.listCursor >= this.listScroll + this.visibleRows) {
      this.listScroll = this.listCursor - this.visibleRows + 1;
    }

    return true;
  }

  private getDefaultCompanionTrainerType(): TrainerType {
    return globalScene.gameData.gender === PlayerGender.FEMALE
      ? TrainerType.PLAYER_M_ALTERNATE
      : TrainerType.PLAYER_F_ALTERNATE;
  }

  private getDefaultCompanionName(): string {
    return globalScene.gameData.gender === PlayerGender.FEMALE ? "남자 주인공" : "여자 주인공";
  }

  private getCurrentList(): Array<
    | RogueShopListing
    | RogueShopStorageEntry
    | RogueBankActionEntry
    | RogueBankCandySpeciesEntry
    | RogueWorkshopEntry
    | RogueCompanionEntry
    | QuestEntry
  > {
    if (this.selectingCandySpecies) {
      return this.candySpeciesList;
    }

    if (this.currentTab === "BRIEFING") {
      if (globalScene.gameData.isUnlocked(Unlockables.LOG_CENTER_BRIEFING_SEEN)) {
        return [
          {
            recipeId: "briefing_done",
            name: "회의 기록",
            description: "첫 안내는 확인했습니다. 새로운 사건이 발생하면 회의실에 알림이 표시됩니다.",
          },
        ];
      }
      return [
        {
          recipeId: "briefing_story",
          name: "정식 합류 기념 회의 !",
          description:
            "로그탐사대 정식 합류와 첫 구조 의뢰에 관한 이야기를 듣습니다. 선택하면 별도의 스토리 연출이 시작됩니다.",
        },
      ];
    }

    if (this.currentTab === "HEADQUARTERS") {
      return [
        {
          recipeId: "hq_modes",
          name: "게임 모드",
          description: "튜토리얼, 클래식, 디 아더 등 각 모드의 진행 방식을 안내하는 시설입니다.",
        },
        {
          recipeId: "hq_items",
          name: "도구와 창고",
          description: "로그센터 상점에서 도구를 구입하고 창고에서 보관하거나 꺼낼 수 있습니다.",
        },
        {
          recipeId: "hq_companions",
          name: "동료 시스템",
          description: "동료는 탐사 중 전투를 지원합니다. 세부 설명은 정식 동료 튜토리얼에서 제공됩니다.",
        },
        {
          recipeId: "hq_facilities",
          name: "시설 해금",
          description: "현재는 상점, 은행, 창고, 회의실, 본부를 이용할 수 있습니다.",
        },
      ];
    }

    if (this.currentTab === "SHOP") {
      return this.shopListings;
    }

    if (this.currentTab === "BANK") {
      return [
        {
          name: "RP 입금",
          description: "원하는 양의 로그포인트를 은행에 입금합니다. 100마다 이자 +10",
          currency: BankCurrencyType.ROGUE_POINTS,
          mode: "DEPOSIT",
          useCustomAmount: true,
        },
        {
          name: "RP 출금",
          description: "원하는 양의 로그포인트를 은행에서 출금합니다.",
          currency: BankCurrencyType.ROGUE_POINTS,
          mode: "WITHDRAW",
          useCustomAmount: true,
        },
        {
          name: "골드 입금",
          description: "원하는 양의 골드를 은행에 입금합니다. 100마다 이자 +10",
          currency: BankCurrencyType.MONEY,
          mode: "DEPOSIT",
          useCustomAmount: true,
        },
        {
          name: "골드 출금",
          description: "원하는 양의 골드를 은행에서 출금합니다.",
          currency: BankCurrencyType.MONEY,
          mode: "WITHDRAW",
          useCustomAmount: true,
        },
        ...this.getExchangeList(),
      ];
    }

    if (this.currentTab === "QUEST") {
      return questManager.getQuests();
    }

    if (this.currentTab === "WORKSHOP") {
      return this.workshopEntries;
    }

    if (this.currentTab === "MINE") {
      return [
        {
          recipeId: "rogue_mine",
          name: "로그광산 입장",
          description: "광산에서 다양한 광물과 희귀 자원을 채굴합니다.",
        },
      ];
    }

    if (this.currentTab === "MEETING") {
      return companionManager.getAvailableDefinitions().map(definition => ({
        trainerType: definition.trainerType,
        name: TrainerType[definition.trainerType],
        description: "조건을 달성하여 만남의광장에 찾아온 트레이너입니다.\n대화를 나누면 동료로 영입할 수 있습니다.",
        action: "RECRUIT" as const,
      }));
    }

    if (this.currentTab === "CAFE") {
      const activeTrainerType = companionManager.getActiveTrainerType();

      const recruitedEntries: RogueCompanionEntry[] = companionManager.getRecruitedDefinitions().map(definition => {
        const isActive = activeTrainerType === definition.trainerType;

        return {
          trainerType: definition.trainerType,
          name: `${TrainerType[definition.trainerType]}${isActive ? " V" : ""}`,
          description: isActive
            ? "현재 함께 모험 중인 동료입니다."
            : "영입한 동료입니다. 선택하면 함께 모험을 떠납니다.",
          action: "SELECT" as const,
        };
      });

      const isSolo = activeTrainerType === null;

      recruitedEntries.push({
        trainerType: null,
        name: `혼자 출발${isSolo ? " V" : ""}`,
        description: isSolo ? "현재 동료 없이 혼자 모험을 떠납니다." : "이번 모험은 동료 없이 혼자 떠납니다.",
        action: "SOLO",
      });

      return recruitedEntries;
    }

    if (this.currentTab === "PRACTICE") {
      const cfg = globalScene.gameData.practiceDummyConfig ?? {};
      const rewards = cfg.rewardFlags ?? {};

      const dummyFaintText = rewards.allowDummyFaint ? "대타 기절 처리 [ON]" : "대타 기절 처리 [OFF]";

      const allyFaintText = rewards.allowAllyFaint ? "아군 기절 처리 [ON]" : "아군 기절 처리 [OFF]";

      const actText = cfg.canAct ? "대타출동 행동 설정 [행동]" : "대타출동 행동 설정 [정지]";

      const expText = rewards.exp ? "경험치 지급 설정 [ON]" : "경험치 지급 설정 [OFF]";

      const moneyText = rewards.money ? "골드 지급 설정 [ON]" : "골드 지급 설정 [OFF]";

      const rpText = rewards.roguePoints ? "로그포인트 지급 설정 [ON]" : "로그포인트 지급 설정 [OFF]";

      return [
        { name: "연습모드 시작", description: "연습장으로 이동합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
        {
          name: "대타1 레벨 설정",
          description: "첫 번째 대타출동 인형의 레벨을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 레벨 설정",
          description: "두 번째 대타출동 인형의 레벨을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타1 능력치 설정",
          description: "첫 번째 대타출동 인형의 능력치를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 능력치 설정",
          description: "두 번째 대타출동 인형의 능력치를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타1 타입 설정",
          description: "첫 번째 대타출동 인형의 타입을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 타입 설정",
          description: "두 번째 대타출동 인형의 타입을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타1 특성 설정",
          description: "첫 번째 대타출동 인형의 특성을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 특성 설정",
          description: "두 번째 대타출동 인형의 특성을 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타1 패시브 설정",
          description: "첫 번째 대타출동 인형의 패시브를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 패시브 설정",
          description: "두 번째 대타출동 인형의 패시브를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: actText,
          description: "대타출동 인형이 행동할지 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: "대타1 기술 설정",
          description: "첫 번째 대타출동 인형의 기술 4개를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 기술 설정",
          description: "두 번째 대타출동 인형의 기술 4개를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타1 렌탈 아이템 설정",
          description: "첫 번째 대타출동 인형에게 연습용 렌탈 아이템을 지급합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,

        {
          name: "대타2 렌탈 아이템 설정",
          description: "두 번째 대타출동 인형에게 연습용 렌탈 아이템을 지급합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: expText,
          description: "연습모드에서 경험치 획득 여부를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: moneyText,
          description: "연습모드에서 골드 획득 여부를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: rpText,
          description: "연습모드에서 로그포인트 획득 여부를 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: dummyFaintText,
          description: "대타출동 인형이 HP 0이 되어 기절할지 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: allyFaintText,
          description: "아군 포켓몬이 HP 0이 되어 기절할지 설정합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: `배틀 유형 : ${((globalScene.gameData.practiceDummyConfig as any)?.battleType ?? "SINGLE") === "DOUBLE" ? "더블" : "싱글"}`,
          description: "연습전 배틀 유형을 변경합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        { name: "설정 초기화", description: "대타출동 설정을 초기화합니다.", mode: "EXCHANGE" } as RogueBankActionEntry,
        {
          name: "프리셋 저장",
          description: "현재 연습장 설정을 프리셋 슬롯에 저장합니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
        {
          name: "프리셋 불러오기",
          description: "저장된 연습장 프리셋을 불러옵니다.",
          mode: "EXCHANGE",
        } as RogueBankActionEntry,
      ];
    }

    return this.storageItems;
  }

  /** 헤더의 RP/골드 텍스트가 서로 침범하지 않도록 지정된 폭으로 맞춥니다. */
  private fitMoneyHeaderText(text: Phaser.GameObjects.Text, baseScale: number, maxDisplayWidth: number): void {
    text.setScale(baseScale);
    if (text.displayWidth > maxDisplayWidth && text.displayWidth > 0) {
      text.setScale((baseScale * maxDisplayWidth) / text.displayWidth);
    }
  }

  private refreshMoneyTexts(): void {
    const isBank = this.currentTab === "BANK";
    const rp = isBank ? (globalScene.gameData.bankRoguePoints ?? 0) : (globalScene.gameData.roguePoints ?? 0);
    const gold = isBank ? (globalScene.gameData.bankMoney ?? 0) : (globalScene.money ?? 0);

    this.valueRoguePointText.setText(`RP: ${isBank ? formatRogueBankAmount(rp) : formatRogueOwnedAmount(rp)}`);
    this.valueGoldText.setText(`G: ${isBank ? formatRogueBankAmount(gold) : formatRogueOwnedAmount(gold)}`);

    // 210~317의 107px 창: RP(214~263) / 골드(266~313).
    this.valueRoguePointText.setPosition(214, 9);
    this.valueGoldText.setPosition(266, 9);
    this.fitMoneyHeaderText(this.valueRoguePointText, this.moneyHeaderRpScale, 48);
    this.fitMoneyHeaderText(this.valueGoldText, this.moneyHeaderGoldScale, 47);
  }

  private refreshTabCursor(): void {
    const visibleCursor = this.tabCursor - this.tabScroll;

    this.tabCursorObj.setPosition(this.tabXPositions[visibleCursor] - 4, 23);

    const list = this.getCurrentList();

    const listY = 44 + (this.listCursor - this.listScroll) * 14;

    this.listCursorObj.setPosition(8, listY);

    this.listCursorObj.setVisible(list.length > 0);
  }

  private refreshTabTexts(): void {
    const labels: Record<RogueShopTab, string> = {
      SHOP: "상점",
      BANK: "은행",
      STORAGE: "창고",
      QUEST: "의뢰소",
      PRACTICE: "연습",
      WORKSHOP: "공방소",
      MINE: "로그광산",
      MEETING: "만남의광장",
      CAFE: "동료카페",
      BRIEFING: "회의실",
      HEADQUARTERS: "본부",
    };

    for (let i = 0; i < this.tabTexts.length; i++) {
      const visibleIndex = this.tabScroll + i;
      const tab = this.enabledTabs[visibleIndex];
      const textObj = this.tabTexts[i];

      if (!tab || i >= this.visibleTabCount) {
        textObj.setText("").setVisible(false);

        continue;
      }

      textObj.setVisible(true).setText(labels[tab]).setPosition(this.tabXPositions[i], 25);
    }
  }

  /** 목록 폭을 넘는 상품/아이템명은 축약하고 전체 이름은 툴팁으로 제공합니다. */
  private setListRowText(textObj: Phaser.GameObjects.Text, fullText: string): void {
    textObj.setText(fullText);
    // UI는 320x180 논리 좌표이고 텍스트 폰트는 6배 기준으로 작성됩니다.
    const maxWidth = 124 * 6;
    if (textObj.width <= maxWidth) {
      return;
    }

    let low = 0;
    let high = fullText.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      textObj.setText(`${fullText.slice(0, mid)}…`);
      if (textObj.width <= maxWidth) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    textObj.setText(`${fullText.slice(0, low)}…`);
    textObj.setInteractive();
    textObj.on("pointerover", () => globalScene.ui.showTooltip("전체 이름", fullText, true));
    textObj.on("pointerout", () => globalScene.ui.hideTooltip());
  }

  private refreshList(): void {
    const list = this.getCurrentList();

    for (let i = 0; i < this.visibleRows; i++) {
      const dataIndex = this.listScroll + i;
      const row = list[dataIndex];
      const textObj = this.listTextObjects[i];

      // 이전 탭의 툴팁이 다음 상품 행에 남거나 중복 실행되지 않도록 정리합니다.
      textObj.off("pointerover");
      textObj.off("pointerout");
      textObj.disableInteractive();
      textObj.setFontSize(72);

      if (!row) {
        textObj.setText("");
        textObj.setAlpha(0);
        textObj.off("pointerover");
        textObj.off("pointerout");
        textObj.disableInteractive();
        continue;
      }

      textObj.setAlpha(1);

      // ✅ 사탕 선택 모드
      if (this.selectingCandySpecies) {
        const candyEntry = row as RogueBankCandySpeciesEntry;
        textObj.setText(`${candyEntry.name} - 사탕 ${candyEntry.candyCount}`);
      }

      // 상점
      else if (this.currentTab === "SHOP") {
        const listing = row as RogueShopListing;

        if (listing.specialAction === "COUPON") {
          textObj.setText("쿠폰 교환소");
          continue;
        }

        const soldOut = listing.stock <= 0 ? " [매진]" : "";

        const itemName = this.getListingDisplayName(listing);
        this.setListRowText(textObj, `${itemName} - ${listing.priceRp}RP${soldOut}`);
      }

      // 창고
      else if (this.currentTab === "STORAGE") {
        const storageItem = row as RogueShopStorageEntry;
        this.setListRowText(textObj, `${storageItem.name} x${storageItem.quantity}`);
      }

      // 공방소
      else if (this.currentTab === "BRIEFING" || this.currentTab === "HEADQUARTERS") {
        this.setListRowText(textObj, (row as RogueWorkshopEntry).name);
      } else if (this.currentTab === "WORKSHOP") {
        const workshopEntry = row as RogueWorkshopEntry;
        this.setListRowText(textObj, workshopEntry.name);
      } else if (this.currentTab === "MINE") {
        const mineEntry = row as RogueWorkshopEntry;
        this.setListRowText(textObj, mineEntry.name);
      } else if (this.currentTab === "MEETING" || this.currentTab === "CAFE") {
        const companionEntry = row as RogueCompanionEntry;
        this.setListRowText(textObj, companionEntry.name);
      }

      // 의뢰
      else if (this.currentTab === "QUEST") {
        const quest = row as QuestEntry;

        const statusText = quest.completed ? "[완료]" : quest.accepted ? "[수락]" : "[게시]";

        textObj.setFontSize(72);

        const fullText = `${statusText} ${quest.title} (${quest.progress}/${quest.requirement})`;

        const maxLength = 20;

        const isTruncated = fullText.length > maxLength;

        const displayText = isTruncated ? `${fullText.slice(0, maxLength)}…` : fullText;

        textObj.setText(displayText);

        // 잘린 경우에만 마우스 툴팁
        if (isTruncated) {
          textObj.setInteractive(new Phaser.Geom.Rectangle(0, 0, 780, 80), Phaser.Geom.Rectangle.Contains);

          textObj.on("pointerover", () => {
            globalScene.ui.showTooltip(quest.title, fullText, true);
          });

          textObj.on("pointerout", () => {
            globalScene.ui.hideTooltip();
          });
        }
      }
      // 은행 / 연습
      else {
        this.setListRowText(textObj, (row as RogueBankActionEntry).name);
      }
    }

    this.listCursorObj.setVisible(list.length > 0);
  }

  private openStorageApplyMode(): void {
    this.storageApplyMode = true;

    this.selectingStorageItem = true;
    this.selectingStorageAmount = false;
    this.selectingStorageTarget = false;

    this.storageCursor = 0;
    this.storageScroll = 0;
    this.starterCursor = 0;
    this.selectedStorageAmount = 1;
    this.selectedStorageEntry = null;

    this.refreshStorageApplyUi();
    this.setNotice("창고에서 아이템을 선택하세요.");
  }

  private closeStorageApplyMode(): void {
    this.storageApplyMode = false;

    this.selectingStorageItem = false;
    this.selectingStorageAmount = false;
    this.selectingStorageTarget = false;

    this.selectedStorageEntry = null;
    this.selectedStorageAmount = 1;

    this.refreshList();
    this.refreshDetail();
    this.setNotice("아이템 선택으로 돌아갑니다.");
  }

  private refreshStarterIcons(): void {
    const starters = this.uiArgs?.starters ?? [];
    const hasStarterSelection = starters.length > 0;

    this.starterPanelWindow.setVisible(hasStarterSelection);
    this.starterPanelTitleText.setVisible(hasStarterSelection);
    this.starterIconsContainer.setVisible(hasStarterSelection);

    if (!hasStarterSelection) {
      this.starterIconCursorObj.setVisible(false);
      return;
    }

    for (let i = 0; i < this.starterIcons.length; i++) {
      const icon = this.starterIcons[i];
      const starter = starters[i];

      if (!starter) {
        icon.setVisible(false);
        icon.setTexture("pokemon_icons_0").setFrame("unknown");
        continue;
      }

      const species = getPokemonSpecies(starter.speciesId);
      const formIndex = starter.formIndex ?? 0;
      const shiny = !!starter.shiny;
      const variant = starter.variant ?? 0;
      const female = !!starter.female;

      icon
        .setTexture(species.getIconAtlasKey(formIndex, shiny, variant))
        .setFrame(species.getIconId(female, formIndex, shiny, variant))
        .setPosition(283, this.calcShopStarterIconY(i))
        .setVisible(true);
    }

    if ((this.selectingTarget || this.selectingStorageTarget) && starters.length > 0) {
      const cursorIndex = this.selectingStorageTarget ? this.starterCursor : this.targetCursor;

      this.starterIconCursorObj.setVisible(true).setPosition(279, this.calcShopStarterIconY(cursorIndex) - 1);
    } else {
      this.starterIconCursorObj.setVisible(false);
    }

    this.starterPanelWindow.setAlpha(this.selectingTarget || this.selectingStorageTarget ? 1 : 0.75);
    this.starterPanelTitleText.setAlpha(this.selectingTarget || this.selectingStorageTarget ? 1 : 0.75);
    this.starterPanelTitleText.setText(this.selectingTarget || this.selectingStorageTarget ? "대상 선택" : "스타팅");
  }

  private refreshDetail(): void {
    this.detailTitleText.setFontSize(78);
    this.detailBodyText.setFontSize(72).setVisible(true);
    this.detailBodyText.off("pointerover");
    this.detailBodyText.off("pointerout");
    this.questFooterText.setVisible(false);
    this.companionPortrait.setVisible(false);
    this.companionKnowhowTitleText.setVisible(false);
    this.companionKnowhowBodyText.setVisible(false);

    const list = this.getCurrentList();
    const selected = list[this.listCursor];

    if (!selected) {
      this.detailTitleText.setText("");
      this.detailBodyText.setText("");
      return;
    }

    if (this.selectingCandySpecies) {
      const candyEntry = selected as RogueBankCandySpeciesEntry;
      this.detailTitleText.setText(candyEntry.name);
      this.detailBodyText.setText(
        `보유 사탕: ${candyEntry.candyCount}\n\n포켓몬사탕 10개당 1 로그포인트로 환전합니다.\n\n[확인] 이 포켓몬의 사탕 사용`,
      );
      return;
    }

    if (this.selectingShopDestination && this.pendingShopListing) {
      const listing = this.pendingShopListing;
      const itemName = this.getListingDisplayName(listing);
      const itemDesc =
        typeof listing.option?.type?.getDescription === "function"
          ? listing.option.type.getDescription()
          : "설명이 없습니다.";

      const firstLabel =
        listing.purchaseMode === "TRAINER_LOADOUT"
          ? "즉시 반영"
          : listing.purchaseMode === "SELECT_POKEMON"
            ? "포켓몬에게 적용"
            : "즉시 사용";

      const options = [
        `${this.shopDestinationCursor === 0 ? "▶" : "  "} ${firstLabel}`,
        `${this.shopDestinationCursor === 1 ? "▶" : "  "} 창고에 보관`,
        `${this.shopDestinationCursor === 2 ? "▶" : "  "} 취소`,
      ].join("\n");

      this.detailTitleText.setText(itemName);
      this.detailBodyText.setText(
        `가격: ${listing.priceRp} RP\n재고: ${listing.stock}\n\n${itemDesc}\n\n[구매 후 처리]\n${options}`,
      );
      return;
    }

    if (this.currentTab === "SHOP") {
      const listing = selected as RogueShopListing;

      // ★ 쿠폰 교환소는 일반 상품과 별도로 표시
      if (listing.specialAction === "COUPON") {
        this.detailTitleText.setText("쿠폰 교환소");
        this.detailBodyText.setText(
          "이벤트 및 기념 쿠폰 코드를\n입력하여 특별한 보상을\n받을 수 있습니다.\n\n[확인] 쿠폰 입력",
        );
        return;
      }

      // 일반 상점 상품
      const itemName = this.getListingDisplayName(listing);

      const itemDesc =
        typeof listing.option?.type?.getDescription === "function"
          ? listing.option.type.getDescription()
          : "설명이 없습니다.";

      this.detailTitleText.setText(itemName);
      this.detailBodyText.setText(
        `등급: ${ModifierTier[listing.tier]}\n`
          + `가격: ${listing.priceRp} RP\n`
          + `재고: ${listing.stock}\n\n`
          + `${itemDesc}\n\n`
          + "[확인] 구매",
      );

      return;
    }

    if (this.currentTab === "BANK") {
      const bankEntry = selected as RogueBankActionEntry;
      this.detailTitleText.setText(bankEntry.name);
      this.detailBodyText.setText(
        `${bankEntry.description}\n\n보유 RP: ${formatRogueOwnedAmount(globalScene.gameData.roguePoints ?? 0)}\n예치 RP: ${formatRogueBankAmount(this.bankData.bankRoguePoints)}\n보유 골드: ${formatRogueOwnedAmount(globalScene.money ?? 0)}\n예치 골드: ${formatRogueBankAmount(this.bankData.bankGold)}\n\n이자 시스템은 추후 연결`,
      );
      return;
    }

    if (this.currentTab === "QUEST") {
      const quest = selected as QuestEntry;

      this.detailBodyText.off("pointerover");
      this.detailBodyText.off("pointerout");

      const categoryText =
        quest.category === "REQUEST" ? "일반 의뢰" : quest.category === "BOUNTY" ? "현상수배" : "미션";

      const statusText = quest.completed ? "완료" : quest.accepted ? "수행 중" : "미수락";

      const actionText = quest.completed
        ? "완료된 의뢰입니다."
        : quest.accepted
          ? "[확인] 수락 취소"
          : `[확인] 의뢰 수락 (${questManager.getAcceptedQuestCount()}/${questManager.getMaxAcceptedQuests()})`;

      // 의뢰 상세창 전용 글씨 크기
      this.detailTitleText.setFontSize(78);
      this.detailBodyText.setFontSize(72);

      this.detailTitleText.setText(quest.title);

      this.detailBodyText.setText(
        `[${categoryText}] ${statusText} ${quest.progress}/${quest.requirement}\n\n` + `${quest.description}`,
      );

      // 마우스를 올리면 전체 의뢰 내용 표시
      const itemRewardText =
        (quest.rewardItems ?? []).length > 0
          ? (quest.rewardItems ?? [])
              .map(item => {
                const display = this.getStorageDisplayMeta(item.modifierTypeId);

                return `${display.name} x${item.quantity}`;
              })
              .join("\n")
          : "없음";

      const rewardTooltipText =
        `${quest.description}\n\n`
        + "[보상]\n"
        + `로그포인트: ${quest.rewardRp} RP\n`
        + `골드: ${quest.rewardGold} G\n`
        + `아이템:\n${itemRewardText}`;

      this.detailBodyText.on("pointerover", () => {
        globalScene.ui.showTooltip(quest.title, rewardTooltipText, true);
      });

      this.detailBodyText.on("pointerout", () => {
        globalScene.ui.hideTooltip();
      });

      this.questFooterText
        .setText(`[보상] ${quest.rewardRp} RP / ${quest.rewardGold} G\n` + `${actionText}`)
        .setVisible(true);

      return;
    }

    if (this.currentTab === "MINE") {
      const mineEntry = selected as RogueWorkshopEntry;

      this.detailTitleText.setText("로그광산");
      this.detailBodyText.setText(
        `${mineEntry.description}\n\n`
          + "곡괭이와 망치를 이용하여\n"
          + "암반 속 자원을 발굴합니다.\n\n"
          + "[확인] 로그광산 입장",
      );

      return;
    }

    if (this.currentTab === "WORKSHOP") {
      const entry = selected as RogueWorkshopEntry;

      this.detailTitleText.setText(entry.name);
      this.detailBodyText.setText(
        `${entry.description}\n\n`
          + "재료 슬롯 3칸에 원하는 재료를 넣으면\n"
          + "등록된 조합에 따라 결과물이 결정됩니다.\n\n"
          + "현재 공방소에서 만든 완성품은\n"
          + "자동으로 창고에 보관됩니다.\n\n"
          + "[확인] 제작대 열기",
      );
      return;
    }

    if (this.currentTab === "BRIEFING" || this.currentTab === "HEADQUARTERS") {
      const entry = selected as RogueWorkshopEntry;
      this.detailTitleText.setText(entry.name);
      this.detailBodyText.setText(entry.description);
      this.companionPortrait.setVisible(false);
      this.companionKnowhowTitleText.setVisible(false);
      this.companionKnowhowBodyText.setVisible(false);
      return;
    }

    if (this.currentTab === "MEETING") {
      const companionEntry = selected as RogueCompanionEntry;

      this.detailTitleText.setText(companionEntry.name);
      this.detailBodyText.setText(companionEntry.description);

      this.companionPortrait.setVisible(false);
      this.companionKnowhowTitleText.setVisible(false);
      this.companionKnowhowBodyText.setVisible(false);

      return;
    }

    if (this.currentTab === "CAFE") {
      const companionEntry = selected as RogueCompanionEntry;

      this.detailTitleText.setText(companionEntry.name);

      // 혼자 출발
      if (companionEntry.trainerType === null) {
        this.detailBodyText.setText(companionEntry.description).setVisible(true);

        this.companionPortrait.setVisible(false);
        this.companionKnowhowTitleText.setVisible(false);
        this.companionKnowhowBodyText.setVisible(false);

        return;
      }

      const definition = companionManager.getDefinition(companionEntry.trainerType);

      const trainerConfig = new TrainerConfig(companionEntry.trainerType);

      const variant = definition?.variant ?? TrainerVariant.DEFAULT;

      const spriteKey = definition?.frontSpriteKey ?? trainerConfig.getSpriteKey(variant === TrainerVariant.FEMALE);

      trainerConfig.loadAssets(variant).then(() => {
        // 다른 동료/탭으로 이동한 뒤 늦게 로딩된 이미지가 덮어쓰지 않도록 합니다.
        const currentEntry = this.getCurrentList()[this.listCursor] as RogueCompanionEntry | undefined;
        if (
          !this.rootContainer.visible
          || this.currentTab !== "CAFE"
          || currentEntry?.trainerType !== companionEntry.trainerType
        ) {
          return;
        }
        this.companionPortrait.setTexture(spriteKey);

        const frame = this.companionPortrait.frame;

        const maxWidth = 42;
        const maxHeight = 76;

        const scale = Math.min(maxWidth / frame.width, maxHeight / frame.height);

        this.companionPortrait.setScale(scale).setVisible(true);
      });

      const knowhow = definition?.knowhowId !== undefined ? getTrainerKnowhow(definition.knowhowId) : undefined;

      this.detailBodyText.setVisible(false);

      this.companionKnowhowTitleText.setText(knowhow ? `노하우: ${knowhow.name}` : "노하우: 없음").setVisible(true);

      this.companionKnowhowBodyText.setText(knowhow?.description ?? "").setVisible(true);

      return;
    }

    if (this.currentTab === "PRACTICE") {
      this.detailTitleText.setText("연습센터");
      this.detailBodyText.setText(
        "연습모드를 시작합니다.\n\n시작 바이옴은 TUTORIAL_ROOM으로 고정됩니다.\n보상과 진행은 추후 연습 전용 규칙으로 분리할 수 있습니다.\n\n[확인] 연습모드 시작",
      );
      return;
    }

    const storageItem = selected as RogueShopStorageEntry;
    this.detailTitleText.setText(storageItem.name);
    const canAssignToStarter = (this.uiArgs?.starters?.length ?? 0) > 0;

    const actionText =
      storageItem.purchaseMode === "SELECT_POKEMON"
        ? canAssignToStarter
          ? "[확인] 꺼내서 포켓몬에게 지급"
          : "[확인] 스타터 선택 단계에서만 장착 가능"
        : "[확인] 꺼내기";

    this.detailBodyText.setText(`보관 수량: ${storageItem.quantity}\n\n${storageItem.description}\n\n${actionText}`);
  }

  private setNotice(text: string, duration = 1200): void {
    this.footerHelpText.setText(text);

    if (this.noticeTimer) {
      this.noticeTimer.remove(false);
      this.noticeTimer = undefined;
    }

    this.noticeTimer = globalScene.time.delayedCall(duration, () => {
      this.refreshHelpText();
      this.noticeTimer = undefined;
    });
  }

  private calcShopStarterIconY(index: number): number {
    return 64 + index * 14;
  }

  private refreshHelpText(): void {
    if (this.selectingShopDestination) {
      this.footerHelpText.setText("←→ 또는 ↑↓ 선택  Z 확인  X 취소");
      return;
    }

    if (this.storageApplyMode) {
      this.footerHelpText.setText("↑↓ 선택  Z 확인  X 이전");
      return;
    }

    if (this.selectingTarget) {
      this.footerHelpText.setText("↑↓ 스타팅 선택  Z 확인  X 취소");
      return;
    }

    if (this.selectingCandySpecies) {
      this.footerHelpText.setText("↑↓ 포켓몬 선택  Z 확인  X 취소");
      return;
    }

    const hasStarterSelection = (this.uiArgs?.starters?.length ?? 0) > 0;
    const exitLabel = this.uiArgs?.source === "STARTER_SELECT" ? "X 출발" : "X 나가기";

    if (this.currentTab === "STORAGE" && hasStarterSelection) {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 창고 선택  Z 장착/꺼내기  ${exitLabel}`);
      return;
    }

    if (this.currentTab === "SHOP") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 상품 선택  Z 구매  ${exitLabel}`);
    } else if (this.currentTab === "BANK") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 항목 선택  Z 실행  ${exitLabel}`);
    } else if (this.currentTab === "QUEST") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 의뢰 선택  Z 확인  ${exitLabel}`);
    } else if (this.currentTab === "PRACTICE") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 설정 선택  Z 확인  ${exitLabel}`);
    } else if (this.currentTab === "WORKSHOP") {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 선택  Z 제작대 열기  ${exitLabel}`);
    } else if (this.currentTab === "BRIEFING" || this.currentTab === "HEADQUARTERS") {
      this.footerHelpText.setText(`←→ 시설 이동  ↑↓ 선택  Z 내용 확인  ${exitLabel}`);
    } else if (this.currentTab === "MINE") {
      this.footerHelpText.setText(`←→ 탭 이동  Z 로그광산 입장  ${exitLabel}`);
    } else {
      this.footerHelpText.setText(`←→ 탭 이동  ↑↓ 창고 선택  Z 조작  ${exitLabel}`);
    }
  }

  private tryConsumeListingPurchase(listing: RogueShopListing): boolean {
    if (listing.stock <= 0) {
      this.setNotice("매진된 상품입니다.");
      this.getUi().playError();
      return false;
    }

    const spent = globalScene.gameData.spendroguePoints(listing.priceRp);
    if (!spent) {
      this.setNotice("로그포인트가 부족합니다.");
      this.getUi().playError();
      return false;
    }

    listing.stock--;
    return true;
  }

  private finishShopPurchaseCleanup(): void {
    this.selectingShopDestination = false;
    this.pendingShopListing = null;
    this.shopDestinationCursor = 0;

    this.storageItems = this.buildStorageEntries();
    this.syncBankDataWithGame();
    this.refreshMoneyTexts();
    this.refreshList();
    this.refreshDetail();
    this.refreshHelpText();
    globalScene.gameData.saveSystem();
  }

  private parseBerryTypeFromItemId(itemId: string): BerryType | null {
    if (!itemId.startsWith("BERRY_")) {
      return null;
    }

    const berryIndex = Number(itemId.replace("BERRY_", ""));
    if (Number.isNaN(berryIndex)) {
      return null;
    }

    return berryIndex as BerryType;
  }

  private resolveModifierTypeFromStorageItemId(itemId: string): ModifierType | null {
    const generated = this.resolveGeneratedStorageModifierType(itemId);
    if (generated) {
      return generated;
    }

    const direct = getModifierTypeById(itemId);
    if (direct) {
      return direct;
    }

    const func = (modifierTypes as any)[itemId];
    if (typeof func === "function") {
      const type = func() as ModifierType;
      type.id = itemId;
      return type;
    }

    console.warn("[ROGUE_SHOP] modifierType not found by id", itemId);
    return null;

    if (itemId.startsWith("BERRY_")) {
      const berryType = Number(itemId.split("_")[1]) as BerryType;
      const gen = modifierTypes.BERRY().withIdFromFunc(modifierTypes.BERRY) as ModifierTypeGenerator;
      return gen.generateType([], [berryType]) as ModifierType;
    }

    if (itemId.startsWith("TYPE_SPECIFIC_MOVE_BOOSTER_")) {
      const type = Number(itemId.split("_").pop()) as PokemonType;
      const gen = modifierTypes
        .TYPE_SPECIFIC_MOVE_BOOSTER()
        .withIdFromFunc(modifierTypes.TYPE_SPECIFIC_MOVE_BOOSTER) as ModifierTypeGenerator;
      return gen.generateType([], [type]) as ModifierType;
    }

    if (itemId.startsWith("ATTACK_TYPE_BOOSTER_")) {
      const type = Number(itemId.split("_").pop()) as PokemonType;
      const gen = modifierTypes
        .ATTACK_TYPE_BOOSTER()
        .withIdFromFunc(modifierTypes.ATTACK_TYPE_BOOSTER) as ModifierTypeGenerator;
      return gen.generateType([], [type]) as ModifierType;
    }

    if (itemId.startsWith("modifierType:SpeciesBoosterItem.")) {
      const key = itemId.replace("modifierType:SpeciesBoosterItem.", "");

      const rareGen = modifierTypes
        .RARE_SPECIES_STAT_BOOSTER?.()
        ?.withIdFromFunc(modifierTypes.RARE_SPECIES_STAT_BOOSTER) as ModifierTypeGenerator | undefined;

      const normalGen = modifierTypes.SPECIES_STAT_BOOSTER?.()?.withIdFromFunc(modifierTypes.SPECIES_STAT_BOOSTER) as
        | ModifierTypeGenerator
        | undefined;

      return (
        (rareGen?.generateType([], [key]) as ModifierType)
        ?? (normalGen?.generateType([], [key]) as ModifierType)
        ?? null
      );
    }

    return getModifierTypeById(itemId) ?? null;
  }

  private purchaseListingToStorage(listing: RogueShopListing): boolean {
    if (!this.tryConsumeListingPurchase(listing)) {
      return true;
    }

    const ballType = this.getPokeballTypeFromShopId(listing.id);

    const storageItemId = ballType !== null ? `BALL_${ballType}` : this.getStorageItemIdFromListing(listing);

    // 몬스터볼류는 1회 구매당 5개
    const storageAmount = ballType !== null ? 5 : 1;

    const stored = globalScene.gameData.addToStorage(storageItemId, storageAmount, {
      purchaseMode: listing.purchaseMode,
    });

    if (!stored) {
      globalScene.gameData.addRoguePoints(listing.priceRp);
      listing.stock++;

      this.setNotice("창고 저장에 실패했습니다.");
      this.getUi().playError();
      return true;
    }

    const itemName = this.getListingDisplayName(listing);

    this.finishShopPurchaseCleanup();

    this.setNotice(
      ballType !== null
        ? `${itemName} x5 구매 완료! 창고에 저장했습니다.`
        : `${itemName} 구매 완료! 창고에 저장했습니다.`,
    );

    this.getUi().playSelect();
    return true;
  }

  private addPendingRunItemOnce(itemId: string): boolean {
    (globalScene.gameData as any).pendingRunItems ??= [];

    const pendingRunItems = (globalScene.gameData as any).pendingRunItems as string[];

    if (pendingRunItems.includes(itemId)) {
      console.warn("[ROGUE_SHOP] duplicate pendingRunItem blocked", itemId);
      return false;
    }

    pendingRunItems.push(itemId);
    console.log("[ROGUE_SHOP] pendingRunItem added", itemId, pendingRunItems);
    return true;
  }

  private getTrainerItemMaxStackCount(modifierType: any): number {
    const modifier = modifierType?.newModifier?.();

    if (modifier && typeof (modifier as any).getMaxStackCount === "function") {
      return Math.max(1, (modifier as any).getMaxStackCount());
    }

    if (typeof modifierType?.getMaxStackCount === "function") {
      return Math.max(1, modifierType.getMaxStackCount());
    }

    return 1;
  }

  private getOwnedTrainerItemCount(itemId: string): number {
    const existing = globalScene.findModifier(m => {
      const mid = (m as any)?.type?.id;
      return mid === itemId;
    }) as any;

    return existing?.stackCount ?? (existing ? 1 : 0);
  }

  private getPendingRunItemCount(itemId: string): number {
    const pendingRunItems = ((globalScene.gameData as any).pendingRunItems ?? []) as string[];
    return pendingRunItems.filter(id => id === itemId).length;
  }

  private addPendingRunItems(itemId: string, amount: number, maxStackCount: number): boolean {
    (globalScene.gameData as any).pendingRunItems ??= [];
    const pendingRunItems = (globalScene.gameData as any).pendingRunItems as string[];

    const current = this.getPendingRunItemCount(itemId);
    if (current + amount > maxStackCount) {
      return false;
    }

    for (let i = 0; i < amount; i++) {
      pendingRunItems.push(itemId);
    }

    return true;
  }

  private purchaseTrainerLoadoutDirectly(listing: RogueShopListing): boolean {
    const modifierType = listing.option?.type;
    if (!modifierType) {
      this.setNotice("도구 정보를 찾을 수 없습니다.");
      this.getUi().playError();
      return true;
    }

    const alreadyOwned = globalScene.findModifier(m => {
      const mid = (m as any)?.type?.id;
      return mid === listing.id;
    });

    if (alreadyOwned) {
      this.setNotice("이미 보유 중인 트레이너 도구입니다.");
      this.getUi().playError();
      return true;
    }

    if (!this.tryConsumeListingPurchase(listing)) {
      return true;
    }

    if (this.uiArgs?.source === "MENU") {
      const modifier = modifierType.newModifier();
      if (!modifier || !globalScene.addModifier(modifier, false, false)) {
        globalScene.gameData.addRoguePoints(listing.priceRp);
        listing.stock++;
        this.setNotice("트레이너 도구를 지급할 수 없습니다.");
        this.getUi().playError();
        return true;
      }
      globalScene.updateModifiers?.(true);
    } else {
      const added = this.addPendingRunItemOnce(listing.id);
      if (!added) {
        globalScene.gameData.addRoguePoints(listing.priceRp);
        listing.stock++;
        this.setNotice("이미 예약된 트레이너 도구입니다.");
        this.getUi().playError();
        return true;
      }
    }

    const itemName = this.getListingDisplayName(listing);
    this.finishShopPurchaseCleanup();
    this.setNotice(`${itemName} 즉시 반영 완료`);
    this.getUi().playSelect();
    return true;
  }

  private purchaseInstantListing(listing: RogueShopListing): boolean {
    if (!this.tryConsumeListingPurchase(listing)) {
      return true;
    }

    const itemName = this.getListingDisplayName(listing);

    if (listing.id === "VOUCHER" || listing.id === "VOUCHER_REGULAR" || listing.id === "EGG_VOUCHER") {
      this.addVoucherCount(VoucherType.REGULAR, 1);
      this.finishShopPurchaseCleanup();
      this.setNotice(`${itemName} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (listing.id === "VOUCHER_PLUS" || listing.id === "EGG_VOUCHER_PLUS") {
      this.addVoucherCount(VoucherType.PLUS, 1);
      this.finishShopPurchaseCleanup();
      this.setNotice(`${itemName} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (listing.id === "VOUCHER_PREMIUM" || listing.id === "EGG_VOUCHER_PREMIUM") {
      this.addVoucherCount(VoucherType.PREMIUM, 1);
      this.finishShopPurchaseCleanup();
      this.setNotice(`${itemName} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    if (
      listing.id === "VOUCHER_GOLD"
      || listing.id === "VOUCHER_GOLDEN"
      || listing.id === "EGG_VOUCHER_GOLD"
      || listing.id === "EGG_VOUCHER_GOLDEN"
    ) {
      this.addVoucherCount(VoucherType.GOLDEN, 1);
      this.finishShopPurchaseCleanup();
      this.setNotice(`${itemName} 획득 완료`);
      this.getUi().playSelect();
      return true;
    }

    const ballType = this.getPokeballTypeFromShopId(listing.id);

    if (ballType !== null) {
      const amount = 5;

      if (this.uiArgs?.source === "MENU") {
        // 진행 중인 런에서 구매
        globalScene.pokeballCounts[ballType] = (globalScene.pokeballCounts[ballType] ?? 0) + amount;
      } else {
        // 새 런 시작 전에 구매
        globalScene.gameData.pendingRunItems ??= [];

        const storageId = `BALL_${ballType}`;

        for (let i = 0; i < amount; i++) {
          globalScene.gameData.pendingRunItems.push(storageId);
        }
      }

      this.finishShopPurchaseCleanup();
      this.setNotice(`${this.getListingDisplayName(listing)} x${amount} 획득 완료`);
      this.getUi().playSelect();

      return true;
    }

    if (this.uiArgs?.source !== "MENU") {
      (globalScene.gameData as any).pendingRunItems ??= [];
      (globalScene.gameData as any).pendingRunItems.push(listing.id);
    }

    this.finishShopPurchaseCleanup();
    this.setNotice(`${itemName} 즉시 적용 완료`);
    this.getUi().playSelect();
    return true;
  }

  clearText(): void {
    if (this.noticeTimer) {
      this.noticeTimer.remove(false);
      this.noticeTimer = undefined;
    }

    this.refreshHelpText();
  }

  tryExit(): void {
    console.log("[ROGUE_SHOP] tryExit", this.uiArgs);

    this.selectingTarget = false;
    this.pendingTargetListing = null;
    this.pendingStorageItem = null;

    this.selectingCandySpecies = false;
    this.candySpeciesList = [];
    this.pendingExchangeEntry = null;
    this.listCursor = 0;
    this.listScroll = 0;

    if (this.noticeTimer) {
      this.noticeTimer.remove(false);
      this.noticeTimer = undefined;
    }

    this.rootContainer.setVisible(false);

    // 중요: 현재 핸들러 상태 정리
    this.clear();

    if (this.uiArgs?.onExit) {
      console.log("[ROGUE_SHOP] calling onExit");
      this.uiArgs.onExit();
      return;
    }

    // onExit가 없을 때만 기본 복귀
    this.getUi().setMode(UiMode.TITLE);
  }

  private getStorageDisplayMeta(itemId: string): { name: string; description: string } {
    const pokeballType = this.parsePokeballTypeFromStorageId(itemId);

    if (pokeballType !== null) {
      return {
        name: getPokeballName(pokeballType),
        description: "포켓몬을 포획할 때 사용하는 몬스터볼입니다.",
      };
    }

    const apricornType = this.parseApricornTypeFromItemId(itemId);

    if (apricornType !== null) {
      return {
        name: getApricornName(apricornType),
        description: "몬스터볼 제작 등에 사용하는 규토리입니다.",
      };
    }

    const berryType = this.parseBerryTypeFromItemId(itemId);

    if (berryType !== null) {
      return {
        name: getBerryName(berryType) ?? "열매",
        description: getBerryEffectDescription(berryType) ?? "열매 아이템입니다.",
      };
    }

    if (itemId === "BERRY") {
      return {
        name: "열매",
        description: "열매 아이템입니다.",
      };
    }

    const modifierType = this.resolveModifierTypeFromStorageItemId(itemId);
    if (modifierType) {
      const name = this.getLocalizedModifierName(modifierType, itemId);

      const description =
        typeof modifierType.getDescription === "function"
          ? modifierType.getDescription()
          : "창고에 보관된 아이템입니다.";

      return { name, description };
    }

    return {
      name: itemId,
      description: "창고에 보관된 아이템입니다.",
    };
  }

  private tryStartRun(): void {
    console.log("[ROGUE_SHOP] tryStartRun", this.uiArgs);

    this.selectingTarget = false;
    this.pendingTargetListing = null;
    this.pendingStorageItem = null;

    this.selectingCandySpecies = false;
    this.candySpeciesList = [];
    this.pendingExchangeEntry = null;
    this.listCursor = 0;
    this.listScroll = 0;

    if (this.noticeTimer) {
      this.noticeTimer.remove(false);
      this.noticeTimer = undefined;
    }

    this.rootContainer.setVisible(false);

    // 중요: 현재 핸들러 상태 정리
    this.clear();

    if (this.uiArgs?.onStartRun) {
      this.uiArgs.onStartRun();
      return;
    }

    this.getUi().setMode(UiMode.MESSAGE);
  }

  clear(): void {
    super.clear();
    globalScene.ui.hideTooltip();

    if (this.noticeTimer) {
      this.noticeTimer.remove(false);
      this.noticeTimer = undefined;
    }

    this.rootContainer?.setVisible(false);

    this.selectingTarget = false;
    this.pendingTargetListing = null;
    this.pendingStorageItem = null;

    this.selectingCandySpecies = false;
    this.candySpeciesList = [];
    this.pendingExchangeEntry = null;

    this.listCursor = 0;
    this.listScroll = 0;

    this.refreshHelpText();
  }
}
