import { addDays, addWeeks, format, getISOWeek, startOfWeek } from "date-fns";

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
