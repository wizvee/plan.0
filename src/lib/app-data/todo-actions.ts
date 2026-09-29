"use client";

import { useMemo } from "react";

import { nextPosition, useTodos } from "@/lib/app-data/use-todos";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { useReflections } from "@/lib/app-data/use-reflections";
import { findCarryTarget, nextWeekday } from "@/lib/carry-over";
import { isSubtaskPending, type TodoKind } from "@/lib/types";

export type ParaMappingPatch = { projectId: string | null; areaId: string | null; resourceId: string | null };

/**
 * 할 일 하나에 대한 사용자 동작의 단일 구현. 예전엔 캘린더 · PARA 목록 · PARA 상세 화면이
 * 같은 핸들러(완료 토글, 노트 전환, PARA 매핑 …)를 각자 복붙해서 들고 있었다.
 */
export function useTodoActions() {
  const { todos, backlogItems, addTodo, addNote, updateTodo, removeTodo } = useTodos();
  const { subtasksOf, addSubtask, markSubtasksCarried, dropSubtasksOf } = useSubtasks();
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
      /**
       * 안 끝난 하위 할 일을 다음 평일로 넘긴다 (CARRY-OVER-PLAN.md).
       * 다음 평일에 이름 + PARA가 같은 할 일이 있으면 그 목록 맨 위에, 없으면 같은 시간으로 새로 만들어 넣는다.
       * 원래 항목은 "넘김"으로 남기고(3/4 그대로), 이 할 일은 완료 처리한다.
       */
      async carryOver(id: string) {
        const source = todos.find((t) => t.id === id);
        if (!source || source.kind !== "task" || !source.scheduledDate) return;
        const pending = subtasksOf(id).filter(isSubtaskPending);
        if (pending.length === 0) return;

        const date = nextWeekday(source.scheduledDate);
        const targetId =
          findCarryTarget(todos, source, date)?.id ??
          (await addTodo(source.content, nextPosition(backlogItems), {
            projectId: source.projectId,
            areaId: source.areaId,
            resourceId: source.resourceId,
            scheduledDate: date,
            startMinutes: source.startMinutes,
            durationMinutes: source.durationMinutes,
          }));
        if (!targetId) return;

        // 맨 위에 원래 순서대로 — 어제 못 한 일을 먼저 보게
        const existing = subtasksOf(targetId);
        const top = existing.length > 0 ? existing[0].position : 0;
        const copied = await Promise.all(
          pending.map((s, index) => addSubtask(targetId, s.content, top - pending.length + index))
        );
        // 옮겨 적기에 성공한 것만 넘김으로 — 실패한 건 오늘 그대로 남아서 다시 넘길 수 있다
        const carriedIds = pending.filter((_, index) => copied[index]).map((s) => s.id);
        if (carriedIds.length === 0) return;
        await markSubtasksCarried(carriedIds);
        if (!source.completed) void updateTodo(id, { completed: true });
      },
      /** Inbox 맨 끝에 새 할 일/노트를 추가한다. */
      addToInbox(content: string, kind: TodoKind) {
        if (kind === "note") void addNote(content, nextPosition(backlogItems));
        else void addTodo(content, nextPosition(backlogItems));
      },
    }),
    [
      todos,
      backlogItems,
      addTodo,
      addNote,
      updateTodo,
      removeTodo,
      subtasksOf,
      addSubtask,
      markSubtasksCarried,
      dropSubtasksOf,
      dropReflectionsOfTodo,
    ]
  );
}
