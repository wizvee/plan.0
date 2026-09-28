export const HOUR_HEIGHT = 52;
export const HOURS_IN_DAY = 24;
export const MINUTES_PER_DAY = HOURS_IN_DAY * 60;
export const SNAP_MINUTES = 15;
export const MIN_DURATION_MINUTES = 15;
export const DEFAULT_DURATION_MINUTES = 60;
export const DEFAULT_START_MINUTES = 9 * 60;
export const MIN_BLOCK_HEIGHT = 28;
export const BLOCK_GAP = 2;
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

export function minutesRangeLabel(startMinutes: number, durationMinutes: number): string {
  const end = Math.min(startMinutes + durationMinutes, MINUTES_PER_DAY);
  return `${formatClock(startMinutes)} - ${formatClock(end)}`;
}

export function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
