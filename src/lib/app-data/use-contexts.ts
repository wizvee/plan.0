"use client";

import { useCallback, useMemo } from "react";

import { useAppData } from "@/lib/app-data/app-data-provider";
import type { Context, Todo } from "@/lib/types";

/**
 * 컨텍스트(회사 · 개인 …) 목록 + 현재 컨텍스트 + "이 PARA / 할 일은 어느 컨텍스트인가" 조회 (WEBAPP-PLAN.md).
 * 규칙: 컨테이너의 contextId가 null이면 기본 컨텍스트, 할 일은 매핑된 컨테이너를 따르고 매핑이 없으면 기본.
 */
export function useContexts() {
  const { contexts: store, projects, areas, resources } = useAppData();

  const contexts = useMemo(() => [...store.contexts].sort((a, b) => a.position - b.position), [store.contexts]);
  const defaultContext = useMemo(() => contexts.find((c) => c.isDefault) ?? null, [contexts]);
  const byId = useMemo(() => new Map(contexts.map((c) => [c.id, c])), [contexts]);

  /** 현재 컨텍스트 — null이면 "전부"(아직 단축어로 바꾼 적 없음) */
  const currentContext: Context | null = store.current.contextId ? (byId.get(store.current.contextId) ?? null) : null;

  /** 컨테이너가 고른 컨텍스트(없으면 기본) */
  const contextOfContainer = useCallback(
    (contextId: string | null): Context | null => (contextId ? (byId.get(contextId) ?? defaultContext) : defaultContext),
    [byId, defaultContext]
  );

  const containerContextId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of projects.projects) map.set(p.id, p.contextId);
    for (const a of areas.areas) map.set(a.id, a.contextId);
    for (const r of resources.resources) map.set(r.id, r.contextId);
    return map;
  }, [projects.projects, areas.areas, resources.resources]);

  /** 할 일의 컨텍스트 — 매핑된 컨테이너를 따르고, 매핑이 없으면 기본 */
  const contextOfTodo = useCallback(
    (todo: Todo): Context | null => {
      const mappedId = todo.projectId ?? todo.areaId ?? todo.resourceId;
      return contextOfContainer(mappedId ? (containerContextId.get(mappedId) ?? null) : null);
    },
    [containerContextId, contextOfContainer]
  );

  /** 컨테이너별 PARA 개수 (컨텍스트 관리 화면용) */
  const containerCountOf = useCallback(
    (context: Context) => {
      let count = 0;
      for (const contextId of containerContextId.values()) {
        if ((contextId ? byId.get(contextId) : defaultContext)?.id === context.id) count += 1;
      }
      return count;
    },
    [containerContextId, byId, defaultContext]
  );

  return {
    ...store,
    contexts,
    defaultContext,
    currentContext,
    contextOfContainer,
    contextOfTodo,
    containerCountOf,
  };
}
