"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useDroppable } from "@dnd-kit/core";
import { Calendar, LayoutGrid, Plus, X } from "lucide-react";

import { TodoCard } from "@/components/todo-card";
import { AddTodoForm } from "@/components/add-todo-form";
import { MiniCalendar } from "@/components/mini-calendar";
import { cn } from "@/lib/utils";
import { toDateKey } from "@/lib/week";
import { BACKLOG, type Todo, type TodoKind } from "@/lib/types";

interface AppSidebarProps {
  activePage: "calendar" | "para";
  userEmail: string;
  onSignOut: () => void;
  panelOpen: boolean;
  onClosePanel: () => void;
  items: Todo[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onMemoEdit: (id: string, memo: string) => void;
  onConvert?: (id: string, kind: TodoKind) => void;
  onAdd: (content: string, kind: TodoKind) => void;
  /** PARA 목록 화면에서 재사용할 때, 이미 매핑된 항목에 보여줄 배지 텍스트 */
  getBadge?: (todo: Todo) => string | undefined;
  /** 캘린더 화면에서만 넘겨준다 — 미니 캘린더가 이번 주를 강조하고, 날짜를 누르면 그 주로 이동한다 */
  monday?: Date;
  onSelectWeek?: (monday: Date) => void;
  /** 캘린더 화면에서만 넘겨준다 — 미니 캘린더 월 라벨을 클릭 가능하게 만들고, 그 달의 월별 뷰로 전환한다 */
  onSelectMonth?: (month: Date) => void;
  /** 캘린더 화면에서만 넘겨준다 — 이미 캘린더 화면에 있을 때 "캘린더" 메뉴를 눌러도 페이지 이동 없이
   * 바로 이번 주 주별 뷰로 전환할 수 있게 함. 없으면 기본값(다른 화면에서 넘어올 때)대로 "/"로 이동. */
  onCalendarClick?: () => void;
}

/**
 * 데스크톱에서는 왼쪽에 고정된 사이드바(브랜드 · 미니 캘린더 · 보관함 · 내비게이션 · 계정),
 * 모바일에서는 하단 탭의 "Todo" 버튼으로 여닫는 바텀시트로 렌더링되는 반응형 컴포넌트.
 * 보관함 SortableContext/드롭 영역은 항상 하나만 마운트된다 — sm: 클래스가 모바일용
 * fixed/hidden 상태를 데스크톱에서 덮어써서 항상 보이게 만드는 방식.
 */
export function AppSidebar({
  activePage,
  userEmail,
  onSignOut,
  panelOpen,
  onClosePanel,
  items,
  onToggle,
  onRemove,
  onEdit,
  onMemoEdit,
  onConvert,
  onAdd,
  getBadge,
  monday,
  onSelectWeek,
  onSelectMonth,
  onCalendarClick,
}: AppSidebarProps) {
  const router = useRouter();
  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG });
  const backlogSectionRef = useRef<HTMLDivElement>(null);

  function focusQuickAdd() {
    backlogSectionRef.current?.querySelector("input")?.focus();
  }

  function handleSelectDate(date: Date) {
    if (onSelectWeek) {
      onSelectWeek(date);
    } else {
      router.push(`/?week=${toDateKey(date)}`);
    }
  }

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <>
      {panelOpen ? (
        <div className="fixed inset-0 z-30 bg-black/20 sm:hidden" onClick={onClosePanel} aria-hidden="true" />
      ) : null}

      <div
        className={cn(
          panelOpen
            ? "fixed left-0 right-0 bottom-14 top-auto z-40 flex h-[55vh] flex-col rounded-t-xl border border-border bg-card"
            : "hidden",
          "sm:fixed sm:inset-y-0 sm:left-0 sm:z-30 sm:flex sm:h-screen sm:w-[260px] sm:flex-col sm:gap-5 sm:rounded-none sm:border-0 sm:border-r sm:border-border sm:bg-secondary sm:p-[18px]"
        )}
      >
        {/* 모바일 바텀시트 전용 헤더 */}
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1.5 w-9 rounded-full bg-border" />
        </div>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3.5 sm:hidden">
          <div className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-muted-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[16px] font-semibold">Todo List</span>
          <span className="ml-auto text-sm text-muted-foreground">{items.length > 0 ? items.length : ""}</span>
          <button
            type="button"
            onClick={onClosePanel}
            aria-label="닫기"
            className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 데스크톱 전용: 브랜드 */}
        <div className="hidden items-center gap-2.5 sm:flex">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.5 4.5L19 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="truncate text-[15px] font-bold tracking-tight">주간 Todo Planner</span>
        </div>

        {/* 데스크톱 전용: 빠른 추가 */}
        <button
          type="button"
          onClick={focusQuickAdd}
          className="hidden h-10 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-[14px] font-semibold text-primary-foreground sm:flex"
        >
          <Plus className="size-4" />
          새 할 일
        </button>

        {/* 데스크톱 전용: 미니 캘린더 */}
        <div className="hidden sm:block">
          <MiniCalendar highlightWeekStart={monday} onSelectDate={handleSelectDate} onSelectMonth={onSelectMonth} />
        </div>

        {/* 보관함 — 모바일/데스크톱 공통 */}
        <div
          ref={(node) => {
            setNodeRef(node);
            backlogSectionRef.current = node;
          }}
          className={cn(
            "flex min-h-0 flex-1 flex-col divide-y divide-border/70 overflow-y-auto px-4 transition-colors sm:rounded-lg sm:border sm:border-border sm:bg-card sm:px-3 sm:py-1",
            isOver && "bg-accent/30"
          )}
        >
          {items.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              onToggle={onToggle}
              onRemove={onRemove}
              onEdit={onEdit}
              onMemoEdit={onMemoEdit}
              onConvert={onConvert}
              badge={getBadge?.(todo)}
            />
          ))}
          <AddTodoForm onAdd={onAdd} />
        </div>

        {/* 데스크톱 전용: 내비게이션 전환 */}
        <div className="hidden flex-col gap-1 sm:flex">
          <button
            type="button"
            onClick={() => (onCalendarClick ? onCalendarClick() : router.push("/"))}
            aria-pressed={activePage === "calendar"}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium",
              activePage === "calendar" ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-card"
            )}
          >
            <Calendar className="size-[17px]" />
            캘린더
          </button>
          <button
            type="button"
            onClick={() => router.push("/para")}
            aria-pressed={activePage === "para"}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium",
              activePage === "para" ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-card"
            )}
          >
            <LayoutGrid className="size-[17px]" />
            PARA
          </button>
        </div>

        {/* 데스크톱 전용: 계정 */}
        <div className="hidden items-center gap-2.5 border-t border-border pt-3.5 sm:flex">
          <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-accent-foreground">
            {initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[12.5px]">{userEmail}</span>
            <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
              <a href="/api/auth/google" className="hover:text-foreground">
                Google Drive 연결
              </a>
              <span>·</span>
              <button type="button" onClick={onSignOut} className="hover:text-foreground">
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
