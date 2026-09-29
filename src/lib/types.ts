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
 * 할 일 하나 아래의 체크리스트 항목(한 단계만). 날짜 · PARA 없이 내용 · 완료 · 순서만 가진다.
 * `Todo`에 넣지 않고 따로 구독해서 `todoId`로 묶는다 — 하위 체크 때문에 할 일 목록 · 드래그 · 정렬이
 * 다시 계산되지 않게. (SUBTASKS-PLAN.md)
 */
export interface Subtask {
  id: string;
  todoId: string;
  content: string;
  completed: boolean;
  position: number;
  createdAt: string;
}

/** 하위 할 일 진행률. total이 0이면 진행률 UI를 보여주지 않는다. */
export interface SubtaskProgress {
  done: number;
  total: number;
}

/** 회고 종류 — 잘한 점(keep) · 아쉬운 점(problem) · 다음엔(try). KPT. */
export type ReflectionKind = "keep" | "problem" | "try";

export const REFLECTION_KINDS: ReflectionKind[] = ["keep", "problem", "try"];

/**
 * 회고 한 줄. 할 일(`todoId`)에 붙거나 프로젝트에 직접(`projectId`) 붙는다 — 둘 중 정확히 하나.
 * 할 일에 붙은 회고의 프로젝트는 할 일의 현재 매핑에서 계산한다(저장하지 않음). (REFLECTIONS-PLAN.md)
 */
export interface Reflection {
  id: string;
  todoId: string | null;
  projectId: string | null;
  kind: ReflectionKind;
  content: string;
  /** "다음엔" 항목을 할 일로 만들었으면 그 할 일 id. 그 할 일을 지우면 null로 돌아간다. */
  convertedTodoId: string | null;
  createdAt: string;
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

/** 문장 안에서 쓰는 한국어 이름 ("이 프로젝트의 할 일", "영역 삭제…") */
export const PARA_KIND_LABELS_KO: Record<ParaKind, string> = { project: "프로젝트", area: "영역", resource: "리소스" };

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
  /** PLANNING.md 9번: 이 프로젝트에 대응하는 Google Drive 폴더 ID. 아직 없으면 null */
  driveFolderId: string | null;
  /** 컨텍스트(회사 · 개인 …, `contexts` 테이블). null = 기본 컨텍스트 (WEBAPP-PLAN.md) */
  contextId: string | null;
}

/** Area와 Resource는 같은 모양 — 끝(due date)이 없는 컨테이너라는 점만 Project와 다름 */
export interface ParaContainer {
  id: string;
  name: string;
  archived: boolean;
  createdAt: string;
  /** PLANNING.md 9번: 이 컨테이너에 대응하는 Google Drive 폴더 ID. 아직 없으면 null */
  driveFolderId: string | null;
  /** 컨텍스트(회사 · 개인 …, `contexts` 테이블). null = 기본 컨텍스트 (WEBAPP-PLAN.md) */
  contextId: string | null;
}

/**
 * 컨텍스트 — 회사 · 개인 · 공부 … (WEBAPP-PLAN.md). PARA 컨테이너가 하나를 고르고, 할 일은 매핑된 컨테이너의
 * 컨텍스트를 따른다(매핑 없음 = 기본). iOS 단축어(집중 모드)가 `key`로 현재 컨텍스트를 바꾼다.
 */
export interface Context {
  id: string;
  name: string;
  /** 단축어가 /api/context에 보내는 영문 이름 (`work`) — 소문자 · 숫자 · - · _ , 32자 이하 */
  key: string;
  position: number;
  isDefault: boolean;
}

export type Area = ParaContainer;
export type Resource = ParaContainer;
