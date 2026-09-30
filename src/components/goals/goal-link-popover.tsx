"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { MagnifyingGlass } from "@/components/icons";

import { InlineText } from "@/components/inline-text";
import { CATEGORY_COLOR_VAR, getParaCategory } from "@/lib/category";
import { formatClock } from "@/lib/time";
import { linkCandidates } from "@/lib/goals";
import { useDismiss } from "@/lib/use-dismiss";
import type { Todo, WeeklyGoal } from "@/lib/types";
import { useGoals } from "@/lib/app-data/use-goals";
import { useGoalActions } from "@/lib/app-data/goal-actions";
import { useTodos } from "@/lib/app-data/use-todos";

/**
 * "이번 주 할 일 연결" 팝오버 (GOALS-PLAN.md · 시안 ③) — 그 주 캘린더 할 일을 요일별로 보여주고 체크해서 연결한다.
 * 이미 이 목표에 연결된 건 체크된 채로 시작하고, 체크를 풀면 연결이 풀린다. 다른 목표에 연결된 건 고르면 옮겨진다.
 * "업무"처럼 같은 이름이 3일 이상 있는 할 일과 노트는 빼고 보여준다(`linkCandidates`).
 * 트리거 버튼은 `children(open, toggle)`로 쓰는 쪽이 그린다.
 */
export function GoalLinkPopover({
  goal,
  weekDays,
  children,
}: {
  goal: WeeklyGoal;
  weekDays: string[];
  children: (open: boolean, toggle: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      {children(open, () => setOpen((v) => !v))}
      {open ? <LinkPanel goal={goal} weekDays={weekDays} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function LinkPanel({ goal, weekDays, onClose }: { goal: WeeklyGoal; weekDays: string[]; onClose: () => void }) {
  const { todos } = useTodos();
  const { goals } = useGoals();
  const goalActions = useGoalActions();
  const [query, setQuery] = useState("");

  const candidates = useMemo(() => linkCandidates(todos, weekDays), [todos, weekDays]);
  // 열 때의 연결 상태에서 시작 — 이 목표에 연결된 것은 체크된 채로
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(candidates.filter((t) => t.goalId === goal.id).map((t) => t.id))
  );

  const q = query.trim().toLowerCase();
  const visible = q ? candidates.filter((t) => t.content.toLowerCase().includes(q)) : candidates;
  const byDay = new Map<string, Todo[]>();
  for (const t of visible) {
    const list = byDay.get(t.scheduledDate!) ?? [];
    list.push(t);
    byDay.set(t.scheduledDate!, list);
  }

  const toLink = candidates.filter((t) => checked.has(t.id) && t.goalId !== goal.id).map((t) => t.id);
  const toUnlink = candidates.filter((t) => !checked.has(t.id) && t.goalId === goal.id).map((t) => t.id);
  const changed = toLink.length + toUnlink.length > 0;

  function toggleChecked(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function apply() {
    if (toLink.length > 0) goalActions.link(goal.id, toLink);
    for (const id of toUnlink) goalActions.unlink(id);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-label={`${goal.content}에 할 일 연결`}
      className="absolute left-0 top-[calc(100%+6px)] z-30 flex max-h-[420px] w-[min(380px,calc(100vw-32px))] flex-col rounded-xl border border-black/10 bg-popover/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur"
    >
      <div className="px-2 pb-1.5 pt-2 text-[13px] font-bold">이번 주 할 일에서 고르기</div>
      <label className="mx-1.5 mb-1.5 flex items-center gap-1.5 rounded-lg bg-black/[0.05] px-2">
        <MagnifyingGlass weight="bold" className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색"
          aria-label="검색"
          className="min-w-0 flex-1 bg-transparent py-2 text-[16px] outline-none placeholder:text-muted-foreground sm:text-[13px]"
        />
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {byDay.size === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
            {candidates.length === 0 ? "이번 주 캘린더에 올린 할 일이 없어요" : "검색 결과가 없어요"}
          </p>
        ) : (
          Array.from(byDay.entries()).map(([date, list]) => (
            <div key={date}>
              <div className="px-2.5 pb-1 pt-2 text-[11px] font-bold text-muted-foreground">
                {format(parseISO(date), "EEE · M월 d일", { locale: ko })}
              </div>
              {list.map((t) => {
                const category = getParaCategory(t);
                const otherGoal = t.goalId && t.goalId !== goal.id ? goals.find((g) => g.id === t.goalId) : null;
                return (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-black/[0.04]"
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(t.id)}
                      onChange={() => toggleChecked(t.id)}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <span
                      className="size-[7px] shrink-0 rounded-full"
                      style={{
                        backgroundColor: category ? `var(${CATEGORY_COLOR_VAR[category]})` : "var(--muted-foreground)",
                      }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className={t.completed ? "text-[14px] text-muted-foreground line-through" : "text-[14px]"}>
                        <InlineText text={t.content} />
                      </span>
                      {otherGoal ? (
                        <span className="text-[11.5px] text-muted-foreground">
                          지금 &apos;<InlineText text={otherGoal.content} />&apos;에 연결됨 · 고르면 옮겨져요
                        </span>
                      ) : null}
                    </span>
                    {t.startMinutes !== null ? (
                      <span className="shrink-0 text-[12px] text-muted-foreground">{formatClock(t.startMinutes)}</span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-border px-1.5 pb-0.5 pt-2">
        <span className="text-[11.5px] leading-snug text-muted-foreground">
          같은 이름이 매일 있는 &apos;업무&apos; 같은 블록은 빼고 보여요
        </span>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="h-[30px] rounded-[7px] bg-black/[0.06] px-3 text-[13px] font-medium hover:bg-black/[0.09]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!changed}
            className="h-[30px] rounded-[7px] bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            {toUnlink.length > 0 && toLink.length === 0 ? "연결 풀기" : `${checked.size}개 연결`}
          </button>
        </div>
      </div>
    </div>
  );
}
