"use client";

import { useCallback, useMemo } from "react";

import { useAppData } from "@/lib/app-data/app-data-provider";
import type { TodoPhoto } from "@/lib/types";

const EMPTY: TodoPhoto[] = [];

/**
 * 할 일 사진 + 저장소 함수 + 할 일별 조회(`photosOf`, 올린 순) · 대표 사진(`coverOf`). (PHOTOS-PLAN.md)
 */
export function usePhotos() {
  const { photos: store } = useAppData();
  const { photos } = store;

  const byTodo = useMemo(() => {
    const map = new Map<string, TodoPhoto[]>();
    for (const p of photos) {
      const list = map.get(p.todoId);
      if (list) list.push(p);
      else map.set(p.todoId, [p]);
    }
    for (const list of map.values()) list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return map;
  }, [photos]);

  const photosOf = useCallback((todoId: string): TodoPhoto[] => byTodo.get(todoId) ?? EMPTY, [byTodo]);

  /** 대표로 고른 사진, 없으면 먼저 올린 사진. 사진이 없으면 null. */
  const coverOf = useCallback(
    (todoId: string): TodoPhoto | null => {
      const list = byTodo.get(todoId);
      if (!list) return null;
      return list.find((p) => p.isCover) ?? list[0] ?? null;
    },
    [byTodo]
  );

  return { ...store, photosOf, coverOf };
}
