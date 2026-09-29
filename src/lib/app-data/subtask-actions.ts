"use client";

import { useMemo } from "react";

import { useSubtasks } from "@/lib/app-data/use-subtasks";

/**
 * 하위 할 일에 대한 사용자 동작의 단일 구현 (할 일 쪽 `useTodoActions`와 같은 역할).
 * 상세 모달 · PARA 상세 펼침 · 캘린더 블록이 모두 이것만 쓴다.
 * 완료 연동은 하지 않는다 — 하위를 다 체크해도 부모 할 일은 그대로 (SUBTASKS-PLAN.md 2번).
 */
export function useSubtaskActions() {
  const { subtasks, subtasksOf, addSubtask, updateSubtask, removeSubtask, persistSubtaskPositions } = useSubtasks();

  return useMemo(
    () => ({
      /** 할 일 맨 끝에 하위 할 일을 추가한다. 빈 문자열은 무시. */
      add(todoId: string, content: string) {
        const list = subtasksOf(todoId);
        const position = list.length === 0 ? 0 : list[list.length - 1].position + 1;
        void addSubtask(todoId, content, position);
      },
      /** 넘긴 항목은 체크할 수 없다 — 그날 못 했다는 기록이라서. */
      toggle(id: string) {
        const current = subtasks.find((s) => s.id === id);
        if (current && current.carriedAt === null) void updateSubtask(id, { completed: !current.completed });
      },
      /** 내용을 비우면 삭제한다. 넘긴 항목은 고칠 수 없다. */
      edit(id: string, content: string) {
        if (subtasks.find((s) => s.id === id)?.carriedAt) return;
        const trimmed = content.trim();
        if (!trimmed) void removeSubtask(id);
        else void updateSubtask(id, { content: trimmed });
      },
      remove(id: string) {
        void removeSubtask(id);
      },
      /** 한 할 일 안의 하위 할 일을 `orderedIds` 순서로 다시 번호 매긴다(바뀐 것만 저장). */
      reorder(todoId: string, orderedIds: string[]) {
        const current = subtasksOf(todoId);
        const changes = orderedIds
          .map((id, index) => ({ id, position: index }))
          .filter(({ id, position }) => current.find((s) => s.id === id)?.position !== position);
        if (changes.length > 0) void persistSubtaskPositions(changes);
      },
    }),
    [subtasks, subtasksOf, addSubtask, updateSubtask, removeSubtask, persistSubtaskPositions]
  );
}
