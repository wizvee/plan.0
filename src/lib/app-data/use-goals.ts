"use client";

import { useCallback, useMemo } from "react";

import { useAppData } from "@/lib/app-data/app-data-provider";
import { goalProgress, weekRatio, type GoalProgress } from "@/lib/goals";
import type { WeeklyGoal } from "@/lib/types";

const EMPTY: WeeklyGoal[] = [];

/**
 * 주간 목표 목록 + 저장소 함수 + 주별 조회(`goalsOfWeek`) · 목표 진행률(`progressOf`) · 주 진행률(`weekRatioOf`).
 * 진행률은 저장하지 않고 할 일의 `goalId`에서 매번 계산한다 — 캘린더에서 체크하면 바로 반영된다. (GOALS-PLAN.md)
 */
export function useGoals() {
  const { goals: store, todos: todoStore } = useAppData();
  const { goals } = store;
  const { todos } = todoStore;

  /** weekStart → position 순으로 정렬된 목표 */
  const byWeek = useMemo(() => {
    const map = new Map<string, WeeklyGoal[]>();
    for (const g of goals) {
      const list = map.get(g.weekStart);
      if (list) list.push(g);
      else map.set(g.weekStart, [g]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
    }
    return map;
  }, [goals]);

  const progressById = useMemo(() => {
    const map = new Map<string, GoalProgress>();
    for (const g of goals) map.set(g.id, goalProgress(todos, g.id));
    return map;
  }, [goals, todos]);

  const goalsOfWeek = useCallback((weekStart: string): WeeklyGoal[] => byWeek.get(weekStart) ?? EMPTY, [byWeek]);

  const progressOf = useCallback(
    (goalId: string): GoalProgress => progressById.get(goalId) ?? { done: 0, total: 0, inbox: 0 },
    [progressById]
  );

  /** 0–1, 목표가 없으면 null. */
  const weekRatioOf = useCallback(
    (weekStart: string): number | null => weekRatio(goalsOfWeek(weekStart), progressOf),
    [goalsOfWeek, progressOf]
  );

  return { ...store, goalsOfWeek, progressOf, weekRatioOf };
}
