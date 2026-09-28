"use client";

import { useCallback, useMemo } from "react";

import { useAppData } from "@/lib/app-data/app-data-provider";
import type { Subtask, SubtaskProgress } from "@/lib/types";

const EMPTY: Subtask[] = [];

/** 하위 할 일 목록 + 저장소 함수 + 할 일별 조회(`subtasksOf`) · 진행률(`progressOf`). */
export function useSubtasks() {
  const { subtasks: store } = useAppData();
  const { subtasks } = store;

  /** todoId → position 순으로 정렬된 하위 할 일 */
  const byTodo = useMemo(() => {
    const map = new Map<string, Subtask[]>();
    for (const s of subtasks) {
      const list = map.get(s.todoId);
      if (list) list.push(s);
      else map.set(s.todoId, [s]);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [subtasks]);

  const subtasksOf = useCallback((todoId: string): Subtask[] => byTodo.get(todoId) ?? EMPTY, [byTodo]);

  /** 하위가 없으면 `{ done: 0, total: 0 }` — 이때 진행률 UI는 그리지 않는다. */
  const progressOf = useCallback(
    (todoId: string): SubtaskProgress => {
      const list = byTodo.get(todoId) ?? EMPTY;
      return { done: list.filter((s) => s.completed).length, total: list.length };
    },
    [byTodo]
  );

  return { ...store, subtasksOf, progressOf };
}
