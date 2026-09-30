"use client";

import { useCallback, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { CaretDown, CaretLeft, CaretRight, Check, Plus } from "@/components/icons";

import { MiniCalendar } from "@/components/mini-calendar";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/lib/use-dismiss";
import { useShellUI } from "@/lib/shell-ui";
import { weekNumberLabel, weekRangeLabelKo } from "@/lib/week";

export type CalendarViewMode = "week" | "month";

interface CalendarHeaderProps {
  viewMode: CalendarViewMode;
  /** 주 보기: 보고 있는 주의 월요일 */
  monday: Date;
  /** 월 보기: 보고 있는 달(1일) */
  displayMonth: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectView: (mode: CalendarViewMode) => void;
  /** 미니 캘린더에서 날짜를 누름 → 그 주의 주 보기 */
  onSelectDate: (date: Date) => void;
  /** 미니 캘린더 월 라벨을 누름 → 그 달의 월 보기 */
  onSelectMonth: (month: Date) => void;
}

/**
 * 캘린더 화면 툴바 — 왼쪽 "2026년 9월 ⌄" 제목을 누르면 애플 캘린더처럼 미니 캘린더 팝오버,
 * 오른쪽은 새 할 일(+) · 보기 드롭다운(주/월) · 이전/오늘/다음.
 */
export function CalendarHeader({
  viewMode,
  monday,
  displayMonth,
  onPrev,
  onNext,
  onToday,
  onSelectView,
  onSelectDate,
  onSelectMonth,
}: CalendarHeaderProps) {
  const { openInboxForAdd } = useShellUI();
  const [miniOpen, setMiniOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const miniRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  useDismiss(miniOpen, miniRef, useCallback(() => setMiniOpen(false), []));
  useDismiss(viewMenuOpen, viewRef, useCallback(() => setViewMenuOpen(false), []));

  // 주 보기 제목은 그 주의 목요일이 속한 달(ISO 주 기준)로 표시한다.
  const titleMonth = viewMode === "week" ? addDays(monday, 3) : displayMonth;
  const unit = viewMode === "week" ? "주" : "달";

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-2.5 px-3 sm:pl-4 sm:pr-5">
      <div ref={miniRef} className="relative">
        <button
          type="button"
          onClick={() => setMiniOpen((open) => !open)}
          aria-haspopup="dialog"
          aria-expanded={miniOpen}
          aria-label="날짜 선택"
          className={cn("flex h-9 items-center gap-1 rounded-lg px-2 hover:bg-black/5", miniOpen && "bg-black/5")}
        >
          <span className="text-[20px] font-bold tracking-[-0.4px] sm:text-[22px]">{format(titleMonth, "yyyy년 M월")}</span>
          <CaretDown weight="bold" className="size-4 text-muted-foreground" />
        </button>
        {miniOpen ? (
          <div
            role="dialog"
            aria-label="날짜 선택"
            className="absolute left-0 top-[calc(100%+6px)] z-30 w-[268px] rounded-xl border border-black/10 bg-popover/95 px-3 pb-3 pt-3.5 shadow-[0_14px_36px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur"
          >
            <MiniCalendar
              initialMonth={titleMonth}
              highlightWeekStart={viewMode === "week" ? monday : undefined}
              onSelectDate={(date) => {
                setMiniOpen(false);
                onSelectDate(date);
              }}
              onSelectMonth={(month) => {
                setMiniOpen(false);
                onSelectMonth(month);
              }}
            />
          </div>
        ) : null}
      </div>

      {viewMode === "week" ? (
        <span className="hidden text-[13.5px] text-muted-foreground md:inline">
          {weekNumberLabel(monday)} · {weekRangeLabelKo(monday)}
        </span>
      ) : null}

      <div className="flex-1" />

      <button
        type="button"
        onClick={openInboxForAdd}
        aria-label="새 할 일 (Inbox에 추가)"
        className="hidden size-[30px] items-center justify-center rounded-[7px] border border-black/10 bg-card hover:bg-black/5 sm:flex"
      >
        <Plus className="size-4" />
      </button>

      <div ref={viewRef} className="relative">
        <button
          type="button"
          onClick={() => setViewMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={viewMenuOpen}
          aria-label="보기 선택"
          className={cn(
            "flex h-[30px] min-w-16 items-center justify-between gap-1.5 rounded-[7px] border border-black/10 bg-card pl-3 pr-2 text-[13px] font-medium hover:bg-black/5",
            viewMenuOpen && "bg-secondary"
          )}
        >
          {viewMode === "week" ? "주" : "월"}
          <CaretDown className="size-3.5 text-muted-foreground" />
        </button>
        {viewMenuOpen ? (
          <div
            role="menu"
            aria-label="보기"
            className="absolute right-0 top-[calc(100%+6px)] z-30 w-[180px] rounded-[10px] border border-black/10 bg-popover/95 p-[5px] shadow-[0_12px_32px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur"
          >
            {(["week", "month"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="menuitemradio"
                aria-checked={viewMode === mode}
                onClick={() => {
                  setViewMenuOpen(false);
                  onSelectView(mode);
                }}
                className="group flex h-[30px] w-full items-center rounded-md pl-2 pr-2.5 text-left text-[13.5px] hover:bg-primary hover:text-primary-foreground"
              >
                <span className="flex w-5 text-primary group-hover:text-primary-foreground">
                  {viewMode === mode ? <Check weight="bold" className="size-3.5" /> : null}
                </span>
                {mode === "week" ? "주" : "월"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex h-[30px] items-center overflow-hidden rounded-[7px] border border-black/10 bg-card">
        <button
          type="button"
          onClick={onPrev}
          aria-label={`이전 ${unit}`}
          className="flex h-full w-8 items-center justify-center hover:bg-black/5"
        >
          <CaretLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="h-full border-x border-black/10 px-3 text-[13px] font-medium hover:bg-black/5"
        >
          오늘
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label={`다음 ${unit}`}
          className="flex h-full w-8 items-center justify-center hover:bg-black/5"
        >
          <CaretRight className="size-4" />
        </button>
      </div>
    </header>
  );
}
