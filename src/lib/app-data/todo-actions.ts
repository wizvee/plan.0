"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";

import { nextPosition, useTodos } from "@/lib/app-data/use-todos";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { useReflections } from "@/lib/app-data/use-reflections";
import { findCarryTarget, nextWeekday } from "@/lib/carry-over";
import { isSubtaskPending, type ParaKind, type TodoKind } from "@/lib/types";

export type ParaMappingPatch = { projectId: string | null; areaId: string | null; resourceId: string | null };

/**
 * 할 일 하나에 대한 사용자 동작의 단일 구현. 예전엔 캘린더 · PARA 목록 · PARA 상세 화면이
 * 같은 핸들러(완료 토글, 노트 전환, PARA 매핑 …)를 각자 복붙해서 들고 있었다.
 */
export function useTodoActions() {
  const { todos, backlogItems, addTodo, addNote, updateTodo, removeTodo } = useTodos();
  const { subtasks, subtasksOf, addSubtask, removeSubtask, markSubtasksCarried, dropSubtasksOf } = useSubtasks();
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
      /**
       * "나중에" — 안 끝난 하위 할 일을 날짜 없는 할 일로 뺀다(LATER-PLAN.md). 부모와 같은 PARA에 매핑돼
       * PARA 할 일 탭 · Inbox에 보이고, 메모에 "L사 업무(9/30)에서 옮김"을 남긴다. 넘김 기록은 남기지 않는다.
       * 되돌리기 함수를 돌려준다(원래 자리로 — 새 할 일은 지우고 하위 할 일을 같은 순서 번호로 다시 만든다).
       */
      async moveSubtaskToLater(subtaskId: string): Promise<(() => void) | null> {
        const subtask = subtasks.find((s) => s.id === subtaskId);
        if (!subtask || subtask.completed || subtask.carriedAt) return null;
        const parent = todos.find((t) => t.id === subtask.todoId);
        if (!parent) return null;

        const from = parent.scheduledDate
          ? `${parent.content}(${format(parseISO(parent.scheduledDate), "M/d")})`
          : parent.content;
        const todoId = await addTodo(subtask.content, nextPosition(backlogItems), {
          projectId: parent.projectId,
          areaId: parent.areaId,
          resourceId: parent.resourceId,
          memo: `${from}에서 옮김`,
        });
        if (!todoId) return null;
        await removeSubtask(subtask.id);

        return () => {
          void removeTodo(todoId);
          void addSubtask(subtask.todoId, subtask.content, subtask.position);
        };
      },
    }),
    [
      todos,
      backlogItems,
      addTodo,
      addNote,
      updateTodo,
      removeTodo,
      subtasks,
      subtasksOf,
      addSubtask,
      removeSubtask,
      markSubtasksCarried,
      dropSubtasksOf,
      dropReflectionsOfTodo,
    ]
  );
}
