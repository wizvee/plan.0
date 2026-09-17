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

/** task = 체크박스 있는 할 일, note = 완료 개념 없는 참고용 노트 (전환 가능) */
export type TodoKind = "task" | "note";

export interface Todo {
  id: string;
  content: string;
  kind: TodoKind;
  /** null = 전역 Todo List 보관함, 그 외는 캘린더에 배치된 실제 날짜 (yyyy-MM-dd) */
  scheduledDate: string | null;
  completed: boolean;
  position: number;
  createdAt: string;
  /** scheduledDate가 설정된 항목만 값이 있음. 자정 기준 분(0~1439) */
  startMinutes: number | null;
  /** scheduledDate가 설정된 항목만 값이 있음. 분 단위 소요 시간 */
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

/**
 * 이 할 일/노트가 Todo List 보관함(Inbox)에 보여야 하는지. 할 일은 캘린더에 배정만 안 됐으면
 * PARA 매핑 여부와 무관하게 항상 보이지만(배지로 표시), 노트는 PARA 어딘가에 매핑되는 순간
 * 그 컨테이너의 Notes 탭으로 "이동"한 것으로 취급해 보관함에서는 사라진다.
 */
export function isInboxVisible(todo: Todo): boolean {
  if (todo.scheduledDate !== null) return false;
  if (todo.kind === "note" && (todo.projectId || todo.areaId || todo.resourceId)) return false;
  return true;
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
  createdAt: string;
  completedAt: string | null;
}

/** Area와 Resource는 같은 모양 — 끝(due date)이 없는 컨테이너라는 점만 Project와 다름 */
export interface ParaContainer {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string;
}

export type Area = ParaContainer;
export type Resource = ParaContainer;
