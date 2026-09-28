import type { ParaKind } from "@/lib/types";

/**
 * 드래그 앤 드롭에서 "무엇을 끌고 있는지"(useDraggable/useSortable의 `data`)와
 * "어디에 놓는지"(useDroppable의 `data`)를 선언하는 타입. 화면은 핸들러를 넘기지 않고
 * 이 데이터만 선언하고, 처리는 `handle-drop.ts` 한 곳에서 한다.
 */

/** 끌고 있는 항목이 어디서 왔는지. */
export type DragSource =
  /** Inbox(보관함) 목록의 카드 */
  | "inbox"
  /** PARA 상세 화면(할 일 · 스크랩 목록)의 카드 */
  | "container"
  /** 캘린더에 배치된 블록 */
  | "calendar";

export interface DraggedTodoData {
  type: "todo";
  source: DragSource;
}

/**
 * 끌고 있는 하위 할 일 — 정렬 가능한 행이라 드롭 대상 `data`도 같다. 같은 `todoId` 안에서 순서만 바꾸고,
 * 캘린더 · Inbox · PARA 같은 다른 드롭 대상과는 충돌 계산에서 서로 제외된다(`collision.ts`).
 */
export interface DraggedSubtaskData {
  type: "subtask";
  todoId: string;
}

/** 끌고 있는 항목의 `active.data` */
export type ActiveData = DraggedTodoData | DraggedSubtaskData;

export type DropTargetData =
  /** Inbox 패널 전체 */
  | { type: "inbox" }
  /** 주간 캘린더의 하루 칸 — 실제 날짜(yyyy-MM-dd) */
  | { type: "calendar-day"; date: string }
  /** PARA 카드 또는 PARA 상세 화면 */
  | { type: "para-container"; kind: ParaKind; id: string };

/** 정렬 가능한 카드(useSortable)는 드래그 대상이자 드롭 대상이라 같은 `data`를 쓴다. */
export type OverData = DropTargetData | DraggedTodoData | DraggedSubtaskData;
