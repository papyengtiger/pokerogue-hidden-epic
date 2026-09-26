import { globalScene } from "#app/global-scene";
import { pokemonStarters } from "#balance/pokemon-evolutions";
import { speciesEggTiers } from "#balance/species-egg-tiers";
import { EggTier } from "#enums/egg-type";
import { EvoLevelThresholdKind } from "#enums/evo-level-threshold-kind";
import { PartyMemberStrength } from "#enums/party-member-strength";
import type { SpeciesId } from "#enums/species-id";
import type { Starter } from "#types/save-data";
import { randSeedItem } from "#utils/common";
import { getPokemonSpecies } from "#utils/pokemon-utils";
import { getDailyRunStarter } from "./daily-seed-utils";

type WeeklyStarterTuple = [Starter, Starter, Starter];

/**
 * 주간 런 스타터 등급별 비용 범위
 *
 * 커먼: 1~3
 * 레어: 4~5
 * 에픽: 6~7
 *
 * 프로젝트의 실제 등급 기준이 다르면 이 범위만 수정하면 됩니다.
 */
/**
 * 현재 날짜가 속한 ISO 주차를 반환합니다.
 */
function getIsoWeek(date: Date): {
  year: number;
  week: number;
} {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  const dayNumber = target.getUTCDay() || 7;

  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));

  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return {
    year: target.getUTCFullYear(),
    week,
  };
}

/**
 * 매주 월요일 오전 6시를 기준으로
 * 같은 주에는 항상 동일한 주간 런 시드를 반환합니다.
 */
export function getWeeklyRunSeed(date = new Date()): string {
  // 주간 리셋 기준을 월요일 06:00으로 맞추기 위해
  // 현재 시간에서 6시간을 뺀 날짜를 기준으로 ISO 주차 계산
  const resetAdjustedDate = new Date(date.getTime() - 6 * 60 * 60 * 1000);

  const { year, week } = getIsoWeek(resetAdjustedDate);

  return btoa(`${year}-W${week.toString().padStart(2, "0")}`);
}

/**
 * 커먼 1마리, 레어 1마리, 에픽 1마리를 생성합니다.
 */
export function getWeeklyRunStarters(): WeeklyStarterTuple {
  const starters: Starter[] = [];
  const seed = globalScene.seed;

  const weeklyTiers = [EggTier.COMMON, EggTier.RARE, EggTier.EPIC] as const;

  globalScene.executeWithSeedOffset(
    () => {
      const startingLevel = globalScene.gameMode.getStartingLevel();

      for (const tier of weeklyTiers) {
        const candidates = Object.keys(speciesEggTiers)
          .map(speciesId => Number(speciesId) as SpeciesId)
          .filter(speciesId => {
            if (speciesEggTiers[speciesId] !== tier) {
              return false;
            }

            /*
             * 이미 선택된 포켓몬과 같은 진화 계통은 제외
             */
            return !starters.some(starter => {
              const starterRoot = pokemonStarters[starter.speciesId] ?? starter.speciesId;

              const candidateRoot = pokemonStarters[speciesId] ?? speciesId;

              return starterRoot === candidateRoot;
            });
          });

        if (candidates.length === 0) {
          throw new Error(`주간 런 스타터 후보가 없습니다. 알 등급: ${EggTier[tier]}`);
        }

        const baseSpeciesId = randSeedItem(candidates);
        const baseSpecies = getPokemonSpecies(baseSpeciesId);

        /*
         * 주간 시작 레벨에 맞는 진화형으로 변환
         */
        const starterSpecies = getPokemonSpecies(
          baseSpecies.getTrainerSpeciesForLevel(
            startingLevel,
            true,
            PartyMemberStrength.STRONGER,
            EvoLevelThresholdKind.STRONG,
          ),
        );

        starters.push(getDailyRunStarter(starterSpecies));
      }
    },
    0,
    seed,
  );

  return starters as WeeklyStarterTuple;
}
