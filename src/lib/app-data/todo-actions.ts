"use client";

import { useMemo } from "react";

import { nextPosition, useTodos } from "@/lib/app-data/use-todos";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { useReflections } from "@/lib/app-data/use-reflections";
import type { ParaKind, TodoKind } from "@/lib/types";

export type ParaMappingPatch = { projectId: string | null; areaId: string | null; resourceId: string | null };

/**
 * 할 일 하나에 대한 사용자 동작의 단일 구현. 예전엔 캘린더 · PARA 목록 · PARA 상세 화면이
 * 같은 핸들러(완료 토글, 노트 전환, PARA 매핑 …)를 각자 복붙해서 들고 있었다.
 */
export function useTodoActions() {
  const { todos, backlogItems, addTodo, addNote, updateTodo, removeTodo } = useTodos();
  const { dropSubtasksOf } = useSubtasks();
  const { dropReflectionsOfTodo } = useReflections();

  return useMemo(
    () => ({
      toggle(id: string) {
        const current = todos.find((t) => t.id === id);
        if (current) void updateTodo(id, { completed: !current.completed });
      },
      edit(id: string, content: string) {
        void updateTodo(id, { content });
      },
      editMemo(id: string, memo: string) {
        void updateTodo(id, { memo: memo || null });
      },
      editUrl(id: string, url: string | null) {
        void updateTodo(id, { url });
      },
      assignPara(id: string, patch: ParaMappingPatch) {
        void updateTodo(id, patch);
      },
      /** 노트로 바꾸면 노트엔 없는 개념(날짜 · 시간 · 완료)을 전부 초기화한다. */
      convert(id: string, kind: TodoKind) {
        if (kind === "note") {
          void updateTodo(id, { kind, scheduledDate: null, startMinutes: null, durationMinutes: null, completed: false });
        } else {
          void updateTodo(id, { kind });
        }
      },
      resize(id: string, durationMinutes: number) {
        void updateTodo(id, { durationMinutes });
      },
      /** 하위 할 일 · 회고는 DB에서 cascade로 지워지고, 로컬 상태에서도 바로 뺀다. */
      remove(id: string) {
        dropSubtasksOf(id);
        dropReflectionsOfTodo(id);
        void removeTodo(id);
      },
      /** Inbox 맨 끝에 새 할 일/노트를 추가한다. */
      addToInbox(content: string, kind: TodoKind) {
        if (kind === "note") void addNote(content, nextPosition(backlogItems));
        else void addTodo(content, nextPosition(backlogItems));
      },
      /**
       * PARA 상세에서 바로 만든 할 일 — 이 컨테이너에 매핑되고, 날짜가 없으니 Inbox 맨 끝에도 보인다.
       * 만든 할 일 id를 돌려준다(빈 내용 · 저장 실패면 undefined).
       */
      addToContainer(content: string, kind: ParaKind, containerId: string) {
        return addTodo(content, nextPosition(backlogItems), {
          projectId: kind === "project" ? containerId : null,
          areaId: kind === "area" ? containerId : null,
          resourceId: kind === "resource" ? containerId : null,
        });
      },
    }),
    [todos, backlogItems, addTodo, addNote, updateTodo, removeTodo, dropSubtasksOf, dropReflectionsOfTodo]
  );
}
