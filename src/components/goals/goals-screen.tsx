"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays } from "date-fns";
import { CaretDown, CaretLeft, CaretRight, Info, Plus } from "@/components/icons";

import { BalanceSection } from "@/components/goals/balance-section";
import { GoalCard } from "@/components/goals/goal-card";
import { ParaMenu } from "@/components/para/para-menu";
import { InlineText } from "@/components/inline-text";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, getParaCategory } from "@/lib/category";
import { RECOMMENDED_GOAL_COUNT } from "@/lib/goals";
import { useDismiss } from "@/lib/use-dismiss";
import { useTodayKey } from "@/lib/use-today";
import { mondayOf, parseDateKey, shiftWeeks, toDateKey, weekNumberLabel, weekRangeLabelKo } from "@/lib/week";
import type { GoalParaPatch } from "@/lib/supabase/goals";
import { useGoals } from "@/lib/app-data/use-goals";
import { useGoalActions } from "@/lib/app-data/goal-actions";
import { useContainers } from "@/lib/app-data/use-containers";

const NO_PARA: GoalParaPatch = { projectId: null, areaId: null, resourceId: null };

/**
 * 주간 목표 화면 (GOALS-PLAN.md · 시안 ① ④ ⑤). 보고 있는 주는 URL `?week=`(그 주 월요일)가 유일한 출처.
 * 목표가 있으면 요약 줄 + 카드 그리드 + "목표 추가", 없으면 목표 적기 + 좋은 목표 확인 질문 + 지난주 요약.
 */
export function GoalsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");
  const monday = useMemo(() => mondayOf(parseDateKey(weekParam) ?? new Date()), [weekParam]);
  const weekKey = toDateKey(monday);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i))), [monday]);
  const todayKey = useTodayKey();
  const isThisWeek = todayKey !== null && todayKey >= weekDays[0] && todayKey <= weekDays[6];

  const { goalsOfWeek, progressOf, weekRatioOf, loading } = useGoals();
  const goals = goalsOfWeek(weekKey);
  const ratio = weekRatioOf(weekKey);

  function goToWeek(date: Date) {
    router.replace(`/goals?week=${toDateKey(mondayOf(date))}`, { scroll: false });
  }

  const linkedTotal = goals.reduce((acc, g) => acc + progressOf(g.id).total, 0);
  const linkedDone = goals.reduce((acc, g) => acc + progressOf(g.id).done, 0);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 py-6 sm:px-9 sm:py-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold tracking-[-0.5px] sm:text-[28px]">
            {isThisWeek ? "이번 주 목표" : `${weekNumberLabel(monday)} 목표`}
          </h1>
          <p className="text-[13.5px] text-muted-foreground">
            {weekNumberLabel(monday)} · {weekRangeLabelKo(monday)}
          </p>
        </header>
        <div role="group" aria-label="주 이동" className="flex rounded-lg bg-black/[0.06] p-0.5">
          <button
            type="button"
            onClick={() => goToWeek(shiftWeeks(monday, -1))}
            aria-label="지난 주"
            className="flex h-8 w-9 items-center justify-center rounded-md hover:bg-black/5 sm:h-7 sm:w-8"
          >
            <CaretLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => goToWeek(new Date())}
            className={cn(
              "h-8 rounded-md px-3 text-[13px] font-semibold sm:h-7",
              isThisWeek ? "bg-card shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "hover:bg-black/5"
            )}
          >
            이번 주
          </button>
          <button
            type="button"
            onClick={() => goToWeek(shiftWeeks(monday, 1))}
            aria-label="다음 주"
            className="flex h-8 w-9 items-center justify-center rounded-md hover:bg-black/5 sm:h-7 sm:w-8"
          >
            <CaretRight className="size-4" />
          </button>
        </div>
      </div>

      {loading ? null : goals.length === 0 ? (
        <EmptyWeek
          weekKey={weekKey}
          previousWeekKey={toDateKey(shiftWeeks(monday, -1))}
          previousWeekLabel={weekNumberLabel(shiftWeeks(monday, -1))}
        />
      ) : (
        <>
          <div className="flex items-center gap-3.5 rounded-xl bg-secondary px-4 py-3">
            <span className="text-[22px] font-bold tabular-nums tracking-[-0.4px] text-primary">
              {Math.round((ratio ?? 0) * 100)}%
            </span>
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/15"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((ratio ?? 0) * 100)}
              aria-label="이번 주 목표 진행률"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${(ratio ?? 0) * 100}%` }}
              />
            </div>
            <span className="hidden text-[13px] text-muted-foreground sm:inline">
              목표 {goals.length}개 · 연결된 할 일 {linkedTotal}개 중 {linkedDone}개 완료
            </span>
            <span className="text-[12px] tabular-nums text-muted-foreground sm:hidden">
              {linkedDone}/{linkedTotal}
            </span>
          </div>

          <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              // content를 key에 넣어 다른 기기에서 바뀐 이름이 오면 제목 입력칸을 새 값으로 초기화
              <GoalCard key={`${goal.id}:${goal.content}`} goal={goal} weekDays={weekDays} />
            ))}
            <AddGoalCard weekKey={weekKey} count={goals.length} />
          </div>

          <p className="text-[12.5px] text-muted-foreground">
            내가 정한 개인 목표만 · 다음 주로 넘기지 않아요 · 캘린더에서 할 일을 체크하면 여기와 레일 링이 함께 올라가요
          </p>
        </>
      )}

      {/* 시간 균형 — 목표가 없는 주에도 보인다(지난 주를 돌아볼 때) (BALANCE-PLAN.md) */}
      {loading ? null : <BalanceSection weekStart={weekKey} />}
    </div>
  );
}

/** 점선 "목표 추가" 카드 — 누르면 입력 줄로 바뀐다. 3개가 넘어도 막지 않고 안내만. */
function AddGoalCard({ weekKey, count }: { weekKey: string; count: number }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="rounded-xl border border-border bg-card">
        <AddGoalForm weekKey={weekKey} autoFocus onDone={() => setOpen(false)} />
        <p className="border-t border-border px-4 py-2.5 text-[12px] text-muted-foreground">
          {count >= RECOMMENDED_GOAL_COUNT
            ? `지금 ${count}개예요 — 더 적을 수는 있지만 ${RECOMMENDED_GOAL_COUNT}개 이하를 권해요`
            : `${RECOMMENDED_GOAL_COUNT}개 이하를 권해요 · 지금 ${count}개`}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex min-h-[150px] flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-black/15 text-primary hover:bg-accent/50"
    >
      <Plus className="size-[22px]" aria-hidden="true" />
      <span className="text-[14px] font-semibold">목표 추가</span>
      <span className="text-[12px] text-muted-foreground">
        {RECOMMENDED_GOAL_COUNT}개 이하를 권해요 · 지금 {count}개
      </span>
    </button>
  );
}

/** 목표 한 줄 입력 + PARA 선택. Enter로 추가하고 입력칸은 비운 채 남는다(연속 입력). */
function AddGoalForm({
  weekKey,
  autoFocus,
  number,
  onDone,
}: {
  weekKey: string;
  autoFocus?: boolean;
  number?: number;
  onDone?: () => void;
}) {
  const goalActions = useGoalActions();
  const [draft, setDraft] = useState("");
  const [para, setPara] = useState<GoalParaPatch>(NO_PARA);

  function submit() {
    if (!draft.trim()) return;
    void goalActions.add(weekKey, draft, para);
    setDraft("");
    setPara(NO_PARA);
  }

  return (
    <div className="flex min-h-[52px] items-center gap-3 px-4">
      {number ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[12px] font-bold text-muted-foreground">
          {number}
        </span>
      ) : (
        <Plus className="size-5 shrink-0 text-primary" aria-hidden="true" />
      )}
      <input
        autoFocus={autoFocus}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            setDraft("");
            onDone?.();
          }
        }}
        enterKeyHint="done"
        placeholder="예: 주 4회 운동하기"
        aria-label="새 목표"
        className="min-w-0 flex-1 bg-transparent py-3 text-[16px] font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground sm:text-[15px]"
      />
      <ParaChipPicker value={para} onChange={setPara} />
    </div>
  );
}

/** 새 목표의 PARA 고르기 — "PARA 없음 ⌄" 칩. */
function ParaChipPicker({ value, onChange }: { value: GoalParaPatch; onChange: (next: GoalParaPatch) => void }) {
  const { projects, areas, resources, containerNameOf } = useContainers();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  const category = getParaCategory(value);
  const mappedId = value.projectId ?? value.areaId ?? value.resourceId;
  const name = containerNameOf(value);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex h-[30px] items-center gap-1.5 rounded-[7px] bg-black/[0.05] px-2.5 text-[12.5px] hover:bg-black/[0.08]",
          name ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {category ? (
          <span className="size-[7px] rounded-full" style={{ backgroundColor: `var(${CATEGORY_COLOR_VAR[category]})` }} />
        ) : null}
        <span className="max-w-[120px] truncate">{name ? <InlineText text={name} /> : "PARA 없음"}</span>
        <CaretDown weight="bold" className="size-3 text-muted-foreground" aria-hidden="true" />
      </button>
      {open ? (
        <ParaMenu
          projects={projects}
          areas={areas}
          resources={resources}
          selected={category && mappedId ? { kind: category, id: mappedId } : null}
          onPick={(kind, id) => {
            onChange({
              projectId: kind === "project" ? id : null,
              areaId: kind === "area" ? id : null,
              resourceId: kind === "resource" ? id : null,
            });
            setOpen(false);
          }}
          onClear={() => {
            onChange(NO_PARA);
            setOpen(false);
          }}
          className="absolute right-0 top-[calc(100%+4px)] w-[240px]"
        />
      ) : null}
    </div>
  );
}

/** 목표가 없는 주 (시안 ④) — 목표 적기 + 좋은 목표 확인 질문 + 지난주 요약. */
function EmptyWeek({
  weekKey,
  previousWeekKey,
  previousWeekLabel,
}: {
  weekKey: string;
  previousWeekKey: string;
  previousWeekLabel: string;
}) {
  const { goalsOfWeek, progressOf, weekRatioOf } = useGoals();
  const lastGoals = goalsOfWeek(previousWeekKey);
  const lastRatio = weekRatioOf(previousWeekKey);

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-1 px-[18px] pb-3 pt-[18px]">
          <h2 className="text-[17px] font-bold">이번 주엔 무엇을 해낼까요?</h2>
          <p className="text-[13px] text-muted-foreground">
            내가 정한 개인 목표를 {RECOMMENDED_GOAL_COUNT}개 이하로. 적고 나면 목표마다 할 일을 캘린더에 올려서 진행률을 쌓아요.
          </p>
        </div>
        <div className="border-t border-border">
          <AddGoalForm weekKey={weekKey} number={1} autoFocus />
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-secondary px-4 py-2.5 text-[12.5px] text-muted-foreground">
          <Info className="size-3.5 shrink-0" aria-hidden="true" />
          Enter로 추가해요. 목표는 다음 주로 넘어가지 않아요 — 이어서 할 거면 새로 적어요.
        </div>
      </section>

      <aside className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2.5 rounded-xl bg-secondary p-4">
          <span className="text-[13px] font-bold">좋은 주간 목표인지 확인</span>
          {[
            <>내가 조절할 수 있는 <b>행동</b>인가요? (12kg 감량 → 주 4회 운동)</>,
            <>진행을 셀 수 있게 <b>할 일로 쪼갤</b> 수 있나요?</>,
            <>그 할 일들을 <b>캘린더에 올릴</b> 시간이 이번 주에 있나요?</>,
          ].map((text, i) => (
            <div key={i} className="flex gap-2 text-[13px] leading-[1.45]">
              <span className="font-bold text-primary">{i + 1}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {lastGoals.length > 0 ? (
          <div className="flex flex-col gap-2.5 rounded-xl border border-border px-4 py-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-bold">지난주 · {previousWeekLabel}</span>
              <span className="text-[15px] font-bold tabular-nums text-primary">
                {Math.round((lastRatio ?? 0) * 100)}%
              </span>
            </div>
            {lastGoals.map((g) => {
              const category = getParaCategory(g);
              const p = progressOf(g.id);
              return (
                <div key={g.id} className="flex items-center gap-2 text-[13px]">
                  <span
                    className="size-[7px] shrink-0 rounded-full"
                    style={{
                      backgroundColor: category ? `var(${CATEGORY_COLOR_VAR[category]})` : "var(--muted-foreground)",
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <InlineText text={g.content} />
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {p.total === 0 ? "0%" : `${p.done}/${p.total}`}
                  </span>
                </div>
              );
            })}
            <span className="text-[12px] text-muted-foreground">지난주 목표는 넘어오지 않아요 — 이어서 할 거면 새로 적어요</span>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
