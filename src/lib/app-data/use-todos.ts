"use client";

import { useMemo } from "react";

import { useAppData } from "@/lib/app-data/app-data-provider";
import { isInboxVisible, type Todo } from "@/lib/types";

/** Inbox(보관함) 맨 끝에 붙일 position 값. */
export function nextPosition(items: Todo[]) {
  return items.length === 0 ? 0 : Math.max(...items.map((t) => t.position)) + 1;
}

/** 전체 할 일 목록 + 저장소 함수 + Inbox에 보이는 항목(정렬된 `backlogItems`). */
export function useTodos() {
  const { todos: store } = useAppData();
  const { todos } = store;

  const backlogItems = useMemo(
    () => todos.filter(isInboxVisible).sort((a, b) => a.position - b.position),
    [todos]
  );

  return { ...store, backlogItems };
}
