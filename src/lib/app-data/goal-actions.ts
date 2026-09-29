"use client";

import { useMemo } from "react";

import { useGoals } from "@/lib/app-data/use-goals";
import { nextPosition, useTodos } from "@/lib/app-data/use-todos";
import type { GoalParaPatch } from "@/lib/supabase/goals";

/**
 * 주간 목표에 대한 사용자 동작의 단일 구현 (할 일 쪽 `useTodoActions`와 같은 역할). (GOALS-PLAN.md)
 * 목표 화면 · 드롭 처리가 모두 이것만 쓴다.
 */
export function useGoalActions() {
  const { goals, goalsOfWeek, addGoal, updateGoal, removeGoal } = useGoals();
  const { todos, backlogItems, addTodo, updateTodo, clearGoalLinks } = useTodos();

  return useMemo(
    () => ({
      /** 그 주 맨 끝에 목표를 추가한다. 빈 문자열은 무시. 개수는 막지 않는다(3개 이하 권장은 화면 안내만). */
      add(weekStart: string, content: string, para?: Partial<GoalParaPatch>) {
        const list = goalsOfWeek(weekStart);
        const position = list.length === 0 ? 0 : list[list.length - 1].position + 1;
        return addGoal(weekStart, content, position, para);
      },
      /** 내용을 비우면 무시한다(삭제는 메뉴에서만 — 실수로 지우지 않게). */
      rename(id: string, content: string) {
        const trimmed = content.trim();
        if (trimmed) void updateGoal(id, { content: trimmed });
      },
      setPara(id: string, para: GoalParaPatch) {
        void updateGoal(id, para);
      },
      /** 연결된 할 일은 그대로 두고 연결만 끊는다(DB는 on delete set null). */
      remove(id: string) {
        clearGoalLinks(id);
        void removeGoal(id);
      },
      /** 목표 + 목표의 PARA가 붙은 할 일을 Inbox 맨 끝에 만든다 — 캘린더로 끌어다 놓으면 된다. */
      addTodo(goalId: string, content: string) {
        const goal = goals.find((g) => g.id === goalId);
        if (!goal) return Promise.resolve(undefined);
        return addTodo(content, nextPosition(backlogItems), {
          goalId,
          projectId: goal.projectId,
          areaId: goal.areaId,
          resourceId: goal.resourceId,
        });
      },
      /**
       * 할 일들을 목표에 연결한다(다른 목표에 연결돼 있었으면 옮겨진다).
       * 할 일에 PARA가 없으면 목표의 PARA를 채운다 — 있으면 건드리지 않는다.
       */
      link(goalId: string, todoIds: string[]) {
        const goal = goals.find((g) => g.id === goalId);
        if (!goal) return;
        for (const id of todoIds) {
          const todo = todos.find((t) => t.id === id);
          if (!todo) continue;
          const hasPara = Boolean(todo.projectId || todo.areaId || todo.resourceId);
          const goalHasPara = Boolean(goal.projectId || goal.areaId || goal.resourceId);
          void updateTodo(
            id,
            !hasPara && goalHasPara
              ? { goalId, projectId: goal.projectId, areaId: goal.areaId, resourceId: goal.resourceId }
              : { goalId }
          );
        }
      },
      unlink(todoId: string) {
        void updateTodo(todoId, { goalId: null });
      },
    }),
    [goals, goalsOfWeek, addGoal, updateGoal, removeGoal, todos, backlogItems, addTodo, updateTodo, clearGoalLinks]
  );
}
