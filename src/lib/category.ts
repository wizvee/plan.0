import type { ParaKind, Todo } from "@/lib/types";

/** PARA 매핑(projectId/areaId/resourceId)에서 카테고리를 읽어온다(할 일 · 주간 목표). 매핑이 없으면 null. */
export function getParaCategory(todo: Pick<Todo, "projectId" | "areaId" | "resourceId">): ParaKind | null {
  if (todo.projectId) return "project";
  if (todo.areaId) return "area";
  if (todo.resourceId) return "resource";
  return null;
}

// PARA 종류별 색(CATEGORY_COLOR_VAR · CATEGORY_TINT_VAR)은 2026-10-01에 없앴다 — 색은 이제 영역(컨텍스트) 색이다.
// 할 일 · PARA · 목표의 색은 `useParaColor()`(`lib/app-data/use-para-color.ts`)로 읽는다. 종류는 탭 · 그룹 순서 · 아이콘이 말한다.
