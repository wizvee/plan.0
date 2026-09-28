"use client";

import { useMemo } from "react";

import { nextPosition, useTodos } from "@/lib/app-data/use-todos";
import { useReflections } from "@/lib/app-data/use-reflections";
import type { ReflectionOwner } from "@/lib/supabase/reflections";
import type { ReflectionKind } from "@/lib/types";

/**
 * 회고에 대한 사용자 동작의 단일 구현 (할 일 쪽 `useTodoActions`, 하위 할 일 쪽 `useSubtaskActions`와 같은 역할).
 * 할 일 상세 모달의 회고 탭과 PARA 상세의 회고 탭이 이것만 쓴다.
 */
export function useReflectionActions() {
  const { reflections, addReflection, updateReflection, removeReflection } = useReflections();
  const { backlogItems, addTodo } = useTodos();

  return useMemo(
    () => ({
      /** 빈 문자열은 무시. */
      add(owner: ReflectionOwner, kind: ReflectionKind, content: string) {
        void addReflection(owner, kind, content);
      },
      /** 내용을 비우면 삭제한다. */
      edit(id: string, content: string) {
        const trimmed = content.trim();
        if (!trimmed) void removeReflection(id);
        else void updateReflection(id, { content: trimmed });
      },
      remove(id: string) {
        void removeReflection(id);
      },
      /**
       * "다음엔" 항목을 같은 내용의 할 일로 만든다 — Inbox 맨 끝에, 이 프로젝트에 매핑해서.
       * 회고 항목은 그대로 두고 만든 할 일을 기억한다(그 할 일을 지우면 다시 만들 수 있게 됨).
       */
      async convertToTodo(id: string, projectId: string) {
        const reflection = reflections.find((r) => r.id === id);
        if (!reflection || reflection.convertedTodoId) return;
        const todoId = await addTodo(reflection.content, nextPosition(backlogItems), { projectId });
        if (todoId) void updateReflection(id, { convertedTodoId: todoId });
      },
    }),
    [reflections, addReflection, updateReflection, removeReflection, backlogItems, addTodo]
  );
}
