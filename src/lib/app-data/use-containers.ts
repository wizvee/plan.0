"use client";

import { useCallback, useMemo } from "react";

import { useAppData } from "@/lib/app-data/app-data-provider";
import type { Todo } from "@/lib/types";

/** Project/Area/Resource 목록 + 저장소 함수 + 할 일이 매핑된 컨테이너 이름 조회. */
export function useContainers() {
  const { projects: projectStore, areas: areaStore, resources: resourceStore } = useAppData();
  const { projects } = projectStore;
  const { areas } = areaStore;
  const { resources } = resourceStore;

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.name);
    for (const a of areas) map.set(a.id, a.name);
    for (const r of resources) map.set(r.id, r.name);
    return map;
  }, [projects, areas, resources]);

  /** 할 일이 매핑된 Project/Area/Resource 이름. 매핑이 없으면 undefined. */
  const containerNameOf = useCallback(
    (todo: Todo): string | undefined => {
      const mappedId = todo.projectId ?? todo.areaId ?? todo.resourceId;
      return mappedId ? nameById.get(mappedId) : undefined;
    },
    [nameById]
  );

  // 세 저장소 모두 `loading`이라 펼치면 덮어써진다 — 셋 중 하나라도 처음 조회 중인지 따로 계산한다
  const containersLoading = projectStore.loading || areaStore.loading || resourceStore.loading;

  return { ...projectStore, ...areaStore, ...resourceStore, containerNameOf, containersLoading };
}
