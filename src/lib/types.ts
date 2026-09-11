export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const BACKLOG = "backlog" as const;

export type ColumnKey = typeof BACKLOG | DayKey;

export interface Todo {
  id: string;
  content: string;
  /** null = 전역 Todo List 보관함, 그 외는 해당 주(weekStart)의 요일 */
  day: DayKey | null;
  /** day가 null이 아닐 때만 값이 있음. 그 주 월요일 날짜 (yyyy-MM-dd) */
  weekStart: string | null;
  completed: boolean;
  position: number;
  createdAt: string;
}
