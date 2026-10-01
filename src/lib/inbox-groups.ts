"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { getParaCategory } from "@/lib/category";
import type { Area, ParaKind, Project, Resource, Todo } from "@/lib/types";

/**
 * Inbox를 PARA별로 묶기 (INBOX-GROUPS-PLAN.md). 그룹 하나 = PARA 컨테이너 하나, 매핑 없는 항목은 "미분류".
 */
export interface InboxGroup {
  /** `none` 또는 `project:<id>` · `area:<id>` · `resource:<id>` — 접힘 상태 · 드롭 대상 id에 쓴다 */
  key: string;
  /** null = 미분류 */
  kind: ParaKind | null;
  containerId: string | null;
  name: string;
  items: Todo[];
}

export const UNSORTED_GROUP_KEY = "none";

type Mapping = Pick<Todo, "projectId" | "areaId" | "resourceId">;

export function inboxGroupKey(todo: Mapping): string {
  const kind = getParaCategory(todo);
  if (!kind) return UNSORTED_GROUP_KEY;
  return `${kind}:${todo.projectId ?? todo.areaId ?? todo.resourceId}`;
}

/** 그룹(종류 · 컨테이너 id)에 놓았을 때 할 일에 넣을 매핑. 미분류(kind = null)면 전부 비운다. */
export function mappingOfGroup(kind: ParaKind | null, id: string | null): Mapping {
  return {
    projectId: kind === "project" ? id : null,
    areaId: kind === "area" ? id : null,
    resourceId: kind === "resource" ? id : null,
  };
}

interface ContainerOrder {
  kind: ParaKind;
  id: string;
  name: string;
  closed: boolean;
  startKey: string;
  createdAt: string;
}

const KIND_ORDER: Record<ParaKind, number> = { project: 0, area: 1, resource: 2 };

/**
 * `items`(position 순으로 정렬된 Inbox 항목)를 그룹으로 묶는다. 빈 그룹은 만들지 않는다.
 * 순서: 미분류 → Project → Area → Resource, 같은 종류 안은 PARA 목록과 같은 순서(시작일 · 만든 날),
 * 완료된 Project · 보관한 Area/Resource는 맨 아래. 그룹 안은 `items` 순서 그대로.
 */
export function groupInboxItems(
  items: Todo[],
  projects: Project[],
  areas: Area[],
  resources: Resource[]
): InboxGroup[] {
  const containers = new Map<string, ContainerOrder>();
  for (const p of projects) {
    containers.set(`project:${p.id}`, {
      kind: "project",
      id: p.id,
      name: p.name,
      closed: p.status === "completed",
      startKey: p.startDate,
      createdAt: p.createdAt,
    });
  }
  for (const [kind, list] of [
    ["area", areas],
    ["resource", resources],
  ] as const) {
    for (const c of list) {
      containers.set(`${kind}:${c.id}`, {
        kind,
        id: c.id,
        name: c.name,
        closed: c.archived,
        startKey: c.createdAt.slice(0, 10),
        createdAt: c.createdAt,
      });
    }
  }

  const byKey = new Map<string, InboxGroup>();
  for (const todo of items) {
    const key = inboxGroupKey(todo);
    let group = byKey.get(key);
    if (!group) {
      const kind = getParaCategory(todo);
      const containerId = todo.projectId ?? todo.areaId ?? todo.resourceId;
      group = {
        key,
        kind,
        containerId,
        // 컨테이너를 아직 못 불러왔으면(첫 조회 중) 이름 없이 그린다
        name: kind ? (containers.get(key)?.name ?? "") : "미분류",
        items: [],
      };
      byKey.set(key, group);
    }
    group.items.push(todo);
  }

  const rank = (group: InboxGroup) => {
    const c = containers.get(group.key);
    return {
      unsorted: group.kind === null,
      closed: c?.closed ?? false,
      kind: group.kind ? KIND_ORDER[group.kind] : -1,
      startKey: c?.startKey ?? "",
      createdAt: c?.createdAt ?? "",
    };
  };

  return [...byKey.values()].sort((a, b) => {
    const x = rank(a);
    const y = rank(b);
    return (
      Number(y.unsorted) - Number(x.unsorted) ||
      Number(x.closed) - Number(y.closed) ||
      x.kind - y.kind ||
      x.startKey.localeCompare(y.startKey) ||
      x.createdAt.localeCompare(y.createdAt) ||
      a.key.localeCompare(b.key)
    );
  });
}

// --- 접힘 상태: 이 브라우저의 localStorage에 그룹 key 목록으로 (shell-ui.tsx의 Inbox 열림 상태와 같은 방식) ---

const STORAGE_KEY = "plan0.inboxCollapsed";
const CHANGE_EVENT = "plan0:inbox-collapsed-change";
let memoryCollapsed = "[]";

function readCollapsed(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryCollapsed;
  } catch {
    return memoryCollapsed;
  }
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function parseKeys(raw: string): Set<string> {
  try {
    const value: unknown = JSON.parse(raw);
    return new Set(Array.isArray(value) ? value.filter((k): k is string => typeof k === "string") : []);
  } catch {
    return new Set();
  }
}

/** 접힌 그룹 key 목록과 접기/펼치기. 서버 렌더에선 전부 펼침. */
export function useInboxCollapsed() {
  const raw = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => "[]");
  const collapsed = useMemo(() => parseKeys(raw), [raw]);

  const setCollapsed = useCallback((key: string, value: boolean) => {
    const next = parseKeys(readCollapsed());
    if (value) next.add(key);
    else next.delete(key);
    memoryCollapsed = JSON.stringify([...next]);
    try {
      window.localStorage.setItem(STORAGE_KEY, memoryCollapsed);
    } catch {
      // 저장 못 해도 메모리 값으로 이번 방문 동안은 동작한다
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { collapsed, setCollapsed };
}
