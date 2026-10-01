"use client";

import { useMemo } from "react";

import { useAppData } from "@/lib/app-data/app-data-provider";
import { useContexts } from "@/lib/app-data/use-contexts";
import { weekBalanceWithPrevious, type WeekBalance } from "@/lib/balance";
import { useNow } from "@/lib/use-today";

/**
 * 그 주의 시간 균형 + 지난주 같은 시점까지 (BALANCE-PLAN.md 3번). 저장하지 않고 할 일 · 컨텍스트 · 지금 시각으로
 * 매번 계산한다 — 캘린더에서 체크하면 바로 반영되고, 1분마다 "지금까지"가 늘어난다.
 * 지금 시각은 클라이언트에서만 알 수 있어서(`useNow`) 마운트 전에는 null.
 */
export function useBalance(weekStart: string): { current: WeekBalance; previous: WeekBalance } | null {
  const { todos: todoStore } = useAppData();
  const { contexts, contextOfTodo } = useContexts();
  const now = useNow();
  const { todos } = todoStore;

  return useMemo(
    () => (now ? weekBalanceWithPrevious(todos, contexts, contextOfTodo, weekStart, now) : null),
    [todos, contexts, contextOfTodo, weekStart, now]
  );
}
