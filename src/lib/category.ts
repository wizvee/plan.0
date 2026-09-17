import type { ParaKind, Todo } from "@/lib/types";

/** PARA 매핑(projectId/areaId/resourceId)에서 이 할 일의 카테고리를 읽어온다. 매핑이 없으면 null. */
export function getParaCategory(todo: Todo): ParaKind | null {
  if (todo.projectId) return "project";
  if (todo.areaId) return "area";
  if (todo.resourceId) return "resource";
  return null;
}

/** 캘린더 블록 등에서 카테고리별 색/틴트를 칠할 때 쓰는 CSS 변수 이름 */
export const CATEGORY_COLOR_VAR: Record<ParaKind, string> = {
  project: "--primary",
  area: "--category-area",
  resource: "--category-resource",
};

export const CATEGORY_TINT_VAR: Record<ParaKind, string> = {
  project: "--accent",
  area: "--category-area-tint",
  resource: "--category-resource-tint",
};
