import { addDays, addWeeks, format, getISOWeek, startOfWeek } from "date-fns";

import { DAY_KEYS, type DayKey } from "@/lib/types";

export function mondayOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function shiftWeeks(monday: Date, delta: number): Date {
  return addWeeks(monday, delta);
}

export function weekNumberLabel(monday: Date): string {
  return `${getISOWeek(monday)}주`;
}

export function weekRangeLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  return `${format(monday, "M.d")} - ${format(sunday, "M.d")}`;
}

export function dayDateKey(monday: Date, dayIndex: number): string {
  return toDateKey(addDays(monday, dayIndex));
}

/** date-fns getDay()는 일요일=0 시작이라, 월요일 시작인 DAY_KEYS 순서로 바꿔준다. */
export function dayKeyOf(date: Date): DayKey {
  return DAY_KEYS[(date.getDay() + 6) % 7];
}

export function isToday(dateKey: string): boolean {
  return dateKey === toDateKey(new Date());
}

/** URL 쿼리스트링의 yyyy-MM-dd 값을 Date로 파싱. 없거나 형식이 이상하면 null. */
export function parseDateKey(key: string | null): Date | null {
  if (!key) return null;
  const parsed = new Date(`${key}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
