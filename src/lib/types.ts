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

export const DAY_LABELS_KO: Record<DayKey, string> = {
  mon: "월",
  tue: "화",
  wed: "수",
  thu: "목",
  fri: "금",
  sat: "토",
  sun: "일",
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
  /** day가 설정된 항목만 값이 있음. 자정 기준 분(0~1439) */
  startMinutes: number | null;
  /** day가 설정된 항목만 값이 있음. 분 단위 소요 시간 */
  durationMinutes: number | null;
  /** 스크랩(공유하기 → 단축어)으로 추가된 항목의 원본 링크 */
  url: string | null;
  /** 스크랩 메모. 지금은 저장만 하고 화면에는 표시하지 않음 */
  memo: string | null;
  /** PARA 매핑 — projectId/areaId/resourceId 중 최대 1개만 값을 가짐 (요일/시간 배치와는 무관한 별개 축) */
  projectId: string | null;
  areaId: string | null;
  resourceId: string | null;
}

/** PARA: Project(시작과 끝이 있는 일) / Area(끝 없이 계속 해야 하는 일) / Resource(지금은 신경 안 쓰지만 관심 있는 것) */
export type ParaKind = "project" | "area" | "resource";

export const PARA_KINDS: ParaKind[] = ["project", "area", "resource"];

export const PARA_KIND_LABELS: Record<ParaKind, string> = {
  project: "Project",
  area: "Area",
  resource: "Resource",
};

export interface Project {
  id: string;
  name: string;
  status: "active" | "completed";
  /** created_at과 별개로 사용자가 지정하는 시작일 (yyyy-MM-dd) */
  startDate: string;
  /** 목표 마감일. Area/Resource에는 없는 개념(끝이 없음) */
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

/** Area와 Resource는 같은 모양 — 끝(due date)이 없는 컨테이너라는 점만 Project와 다름 */
export interface ParaContainer {
  id: string;
  name: string;
  archived: boolean;
  notes: string | null;
  createdAt: string;
}

export type Area = ParaContainer;
export type Resource = ParaContainer;
