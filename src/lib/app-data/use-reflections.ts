"use client";

import { useCallback, useMemo } from "react";

import { useAppData } from "@/lib/app-data/app-data-provider";
import type { Reflection, Todo } from "@/lib/types";

const EMPTY: Reflection[] = [];

/** 프로젝트 회고 한 줄 + 출처 할 일(프로젝트에 직접 쓴 회고면 null). */
export interface ProjectReflection {
  reflection: Reflection;
  sourceTodo: Todo | null;
}

function byCreatedAt(a: Reflection, b: Reflection) {
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * 회고 목록 + 저장소 함수 + 할 일별 조회(`reflectionsOf`) · 프로젝트 회고 모으기(`reflectionsOfProject`).
 * 전부 작성 순(오래된 것 위).
 */
export function useReflections() {
  const { reflections: store, todos: todoStore } = useAppData();
  const { reflections } = store;
  const { todos } = todoStore;

  /** todoId → 작성 순으로 정렬된 회고 */
  const byTodo = useMemo(() => {
    const map = new Map<string, Reflection[]>();
    for (const r of reflections) {
      if (!r.todoId) continue;
      const list = map.get(r.todoId);
      if (list) list.push(r);
      else map.set(r.todoId, [r]);
    }
    for (const list of map.values()) list.sort(byCreatedAt);
    return map;
  }, [reflections]);

  const reflectionsOf = useCallback((todoId: string): Reflection[] => byTodo.get(todoId) ?? EMPTY, [byTodo]);

  /**
   * 프로젝트 회고 = 프로젝트에 직접 쓴 회고 + 지금 이 프로젝트에 매핑된 **할 일(task)**의 회고.
   * 노트로 바뀐 할 일의 회고는 숨긴다(지우지는 않음 — 다시 할 일로 바꾸면 돌아온다).
   */
  const reflectionsOfProject = useCallback(
    (projectId: string): ProjectReflection[] => {
      const todoById = new Map(todos.map((t) => [t.id, t]));
      const result: ProjectReflection[] = [];
      for (const r of reflections) {
        if (r.projectId === projectId) {
          result.push({ reflection: r, sourceTodo: null });
        } else if (r.todoId) {
          const todo = todoById.get(r.todoId);
          if (todo && todo.kind === "task" && todo.projectId === projectId) {
            result.push({ reflection: r, sourceTodo: todo });
          }
        }
      }
      return result.sort((a, b) => byCreatedAt(a.reflection, b.reflection));
    },
    [reflections, todos]
  );

  return { ...store, reflectionsOf, reflectionsOfProject };
}
