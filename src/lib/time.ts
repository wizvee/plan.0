export const HOUR_HEIGHT = 52;
export const HOURS_IN_DAY = 24;
export const MINUTES_PER_DAY = HOURS_IN_DAY * 60;
export const SNAP_MINUTES = 15;
export const MIN_DURATION_MINUTES = 15;
/** 블록 하나는 24시간까지 — 자정을 넘어도 다음 날 안에서 끝난다 (BALANCE-PLAN.md 5번) */
export const MAX_DURATION_MINUTES = 24 * 60;
export const DEFAULT_DURATION_MINUTES = 60;
export const DEFAULT_START_MINUTES = 9 * 60;
/** 블록 최소 높이 = 30분 칸 — 30분 블록끼리 딱 붙어도 BLOCK_GAP만큼 틈이 보이게 (애플 캘린더처럼) */
export const MIN_BLOCK_HEIGHT = 26;
export const BLOCK_GAP = 3;
export const GUTTER_WIDTH = 56;
export const INITIAL_SCROLL_HOUR = 7;

export function snapMinutes(minutes: number, step: number = SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

export function clampMinutes(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function minutesToPx(minutes: number): number {
  return (minutes / 60) * HOUR_HEIGHT;
}

/** 시간 눈금 라벨 — 애플 캘린더(한국어)처럼 "오전 9시", "정오", "오후 1시". */
export function hourLabel(hour: number): string {
  if (hour === 12) return "정오";
  const period = hour < 12 ? "오전" : "오후";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${h12}시`;
}

/** "오전 9시", "오후 2:30" */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${period} ${h12}시` : `${period} ${h12}:${String(m).padStart(2, "0")}`;
}

/** "오후 11:30 - 오전 7시" — 자정을 넘으면 끝은 다음 날 시각 */
export function minutesRangeLabel(startMinutes: number, durationMinutes: number): string {
  return `${formatClock(startMinutes)} - ${formatClock(endMinutesOf(startMinutes, durationMinutes))}`;
}

/** 시작한 날 0시 기준 끝 분 — 자정을 넘으면 1440보다 크다(최대 하루 더) */
export function endMinutesOf(startMinutes: number, durationMinutes: number): number {
  return startMinutes + Math.min(durationMinutes, MAX_DURATION_MINUTES);
}

/** 자정을 넘는 블록인가 — 끝이 다음 날 */
export function isOvernight(startMinutes: number, durationMinutes: number): boolean {
  return endMinutesOf(startMinutes, durationMinutes) > MINUTES_PER_DAY;
}

/** 시작 · 끝 시각(0~1439)으로 길이 — 끝이 시작보다 이르거나 같으면 다음 날 (그래서 같으면 24시간) */
export function durationBetween(startMinutes: number, endMinutes: number): number {
  return endMinutes > startMinutes ? endMinutes - startMinutes : endMinutes + MINUTES_PER_DAY - startMinutes;
}

/** "7시간 30분", "45분", "24시간" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

/** `<input type="time">` 값 "23:45" ↔ 분 */
export function toTimeInputValue(minutes: number): string {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function parseTimeInputValue(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes < MINUTES_PER_DAY ? minutes : null;
}

export function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
