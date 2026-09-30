"use client";

import { useDeferredValue, useMemo } from "react";

import { useTodos } from "@/lib/app-data/use-todos";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { useContainers } from "@/lib/app-data/use-containers";
import { buildSearchIndex, search, type SearchIndex, type SearchResult } from "@/lib/search";
import type { MarkState } from "@/lib/memo-marks";

/** 불러와 있는 할 일 · 하위 할 일 · PARA로 만든 검색 색인. 데이터가 바뀔 때만 다시 만든다. */
export function useSearchIndex(): SearchIndex {
  const { todos } = useTodos();
  const { subtasks } = useSubtasks();
  const { projects, areas, resources } = useContainers();
  return useMemo(
    () => buildSearchIndex({ todos, subtasks, projects, areas, resources }),
    [todos, subtasks, projects, areas, resources]
  );
}

/**
 * 검색 결과 (SEARCH-PLAN.md 4번). 검색어 · 칩은 `useDeferredValue`로 받아 입력이 먼저 그려지고 결과는 뒤따라온다.
 * `marks` = 칩(확인할 것 · 질문)이 고른 줄 표시.
 */
export function useSearch(index: SearchIndex, query: string, marks: MarkState[]): SearchResult {
  const deferredQuery = useDeferredValue(query);
  const marksKey = marks.join("|");
  const deferredMarksKey = useDeferredValue(marksKey);
  return useMemo(
    () =>
      search(index, deferredQuery, {
        marks: deferredMarksKey ? (deferredMarksKey.split("|") as MarkState[]) : [],
      }),
    [index, deferredQuery, deferredMarksKey]
  );
}
