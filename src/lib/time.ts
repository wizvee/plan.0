export const HOUR_HEIGHT = 52;
export const HOURS_IN_DAY = 24;
export const MINUTES_PER_DAY = HOURS_IN_DAY * 60;
export const SNAP_MINUTES = 15;
export const MIN_DURATION_MINUTES = 15;
export const DEFAULT_DURATION_MINUTES = 60;
export const DEFAULT_START_MINUTES = 9 * 60;
export const MIN_BLOCK_HEIGHT = 28;
export const GUTTER_WIDTH = 52;
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

export function hourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

function formatClock(minutes: number): string {
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
