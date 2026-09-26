/**
 * 한국 표준시 기준 일일 초기화 시각입니다.
 * 출석체크, 데일리런, 일일 미션 등에 공통으로 사용합니다.
 */
export const DAILY_RESET_HOUR_KST = 6;

/**
 * 한국 표준시 오전 6시를 기준으로 현재 게임 날짜를 반환합니다.
 *
 * 예:
 * - KST 2026-08-06 05:59 → "2026-08-05"
 * - KST 2026-08-06 06:00 → "2026-08-06"
 *
 * 사용자의 현지 시간대와 관계없이 동일한 시각에 초기화됩니다.
 */
export function getDailyResetDate(): string {
  const kstOffsetHours = 9;
  const shiftedHours = kstOffsetHours - DAILY_RESET_HOUR_KST;

  return new Date(Date.now() + shiftedHours * 60 * 60 * 1000).toISOString().substring(0, 10);
}
