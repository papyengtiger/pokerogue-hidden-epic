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

type MonthlyStarterTuple = [Starter, Starter, Starter, Starter, Starter, Starter];

/**
 * 같은 달에는 항상 동일한 월간 런 시드를 반환합니다.
 *
 * 예:
 * 2026-08
 */
export function getMonthlyRunSeed(date = new Date()): string {
  // 월간 리셋 기준을 매월 1일 06:00으로 맞추기 위해
  // 현재 시간에서 6시간을 뺀 날짜를 기준으로 연/월 계산
  const resetAdjustedDate = new Date(date.getTime() - 6 * 60 * 60 * 1000);

  const year = resetAdjustedDate.getFullYear();
  const month = (resetAdjustedDate.getMonth() + 1).toString().padStart(2, "0");

  return btoa(`${year}-${month}`);
}

/**
 * 월간 런 스타터를 생성합니다.
 *
 * 커먼 2마리
 * 레어 2마리
 * 에픽 1마리
 * 레전더리 1마리
 */
export function getMonthlyRunStarters(): MonthlyStarterTuple {
  const starters: Starter[] = [];
  const seed = globalScene.seed;

  const monthlyTiers = [
    EggTier.COMMON,
    EggTier.COMMON,
    EggTier.RARE,
    EggTier.RARE,
    EggTier.EPIC,
    EggTier.LEGENDARY,
  ] as const;

  globalScene.executeWithSeedOffset(
    () => {
      const startingLevel = globalScene.gameMode.getStartingLevel();

      for (const tier of monthlyTiers) {
        const candidates = Object.keys(speciesEggTiers)
          .map(speciesId => Number(speciesId) as SpeciesId)
          .filter(speciesId => {
            if (speciesEggTiers[speciesId] !== tier) {
              return false;
            }

            /*
             * 이미 선택된 포켓몬과 같은 진화 계통은 제외합니다.
             */
            return !starters.some(starter => {
              const starterRoot = pokemonStarters[starter.speciesId] ?? starter.speciesId;

              const candidateRoot = pokemonStarters[speciesId] ?? speciesId;

              return starterRoot === candidateRoot;
            });
          });

        if (candidates.length === 0) {
          throw new Error(`월간 런 스타터 후보가 없습니다. 알 등급: ${EggTier[tier]}`);
        }

        const baseSpeciesId = randSeedItem(candidates);

        const baseSpecies = getPokemonSpecies(baseSpeciesId);

        /*
         * 월간 시작 레벨에 맞는 진화형으로 변환합니다.
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

  return starters as MonthlyStarterTuple;
}
