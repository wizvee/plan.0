"use client";

import { useRef, useState, type ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { CaretDown, Clock, DotsThree, LinkSimple, PencilSimple, Plus, Trash, X } from "@/components/icons";

import { Checkbox } from "@/components/ui/checkbox";
import { InlineText } from "@/components/inline-text";
import { GoalRing } from "@/components/goals/goal-ring";
import { GoalLinkPopover } from "@/components/goals/goal-link-popover";
import { ParaMenu } from "@/components/para/para-menu";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, getParaCategory } from "@/lib/category";
import { formatClock, DEFAULT_START_MINUTES } from "@/lib/time";
import { isInWeek, progressRatio } from "@/lib/goals";
import { useDismiss } from "@/lib/use-dismiss";
import type { DropTargetData } from "@/lib/dnd/drop-targets";
import type { Area, Project, Resource, Todo, WeeklyGoal } from "@/lib/types";
import { useGoals } from "@/lib/app-data/use-goals";
import { useGoalActions } from "@/lib/app-data/goal-actions";
import { useTodos } from "@/lib/app-data/use-todos";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import { useContainers } from "@/lib/app-data/use-containers";

/** "화 오전 7:30" (그 주) · "10/6 (월)" (다른 주) · 캘린더에 안 올렸으면 null */
function whenLabel(todo: Todo, weekDays: string[]): string | null {
  if (!todo.scheduledDate) return null;
  const date = parseISO(todo.scheduledDate);
  if (!isInWeek(todo.scheduledDate, weekDays)) return format(date, "M/d (EEE)", { locale: ko });
  const day = format(date, "EEE", { locale: ko });
  return todo.startMinutes === null ? day : `${day} ${formatClock(todo.startMinutes)}`;
}

/** 캘린더에 올린 것 먼저(날짜 · 시각 순), 안 올린 것(Inbox)은 뒤로. */
function byWhen(a: Todo, b: Todo): number {
  if (a.scheduledDate === null || b.scheduledDate === null) {
    return a.scheduledDate === b.scheduledDate ? a.position - b.position : a.scheduledDate === null ? 1 : -1;
  }
  return (
    a.scheduledDate.localeCompare(b.scheduledDate) ||
    (a.startMinutes ?? DEFAULT_START_MINUTES) - (b.startMinutes ?? DEFAULT_START_MINUTES)
  );
}

/**
 * 주간 목표 카드 (GOALS-PLAN.md · 시안 ①) — 진행률 링 · 제목(눌러서 수정) · PARA · `···` 메뉴 ·
 * 연결된 할 일(체크 가능) · "새 할 일" · "이번 주 할 일 연결". 카드 전체가 드롭 영역이라 Inbox 항목을 끌어다 놓으면 연결된다.
 */
export function GoalCard({ goal, weekDays }: { goal: WeeklyGoal; weekDays: string[] }) {
  const { progressOf } = useGoals();
  const goalActions = useGoalActions();
  const { todos } = useTodos();
  const { toggle } = useTodoActions();
  const { projects, areas, resources, containerNameOf } = useContainers();

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(goal.content);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const { setNodeRef, isOver } = useDroppable({
    id: `goal:${goal.id}`,
    data: { type: "goal", id: goal.id } satisfies DropTargetData,
  });

  const category = getParaCategory(goal);
  const color = category ? `var(${CATEGORY_COLOR_VAR[category]})` : "var(--muted-foreground)";
  const progress = progressOf(goal.id);
  const linked = todos.filter((t) => t.goalId === goal.id && t.kind === "task").sort(byWhen);

  function commitTitle() {
    setEditingTitle(false);
    const trimmed = title.trim();
    if (trimmed && trimmed !== goal.content) goalActions.rename(goal.id, trimmed);
    else setTitle(goal.content);
  }

  function submitDraft() {
    if (!draft.trim()) return;
    void goalActions.addTodo(goal.id, draft);
    setDraft("");
  }

  return (
    <section
      ref={setNodeRef}
      aria-label={goal.content}
      className={cn(
        "rounded-xl border border-border bg-card transition-shadow",
        isOver && "ring-2 ring-primary/40"
      )}
    >
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <GoalRing ratio={progress.total === 0 ? null : progressRatio(progress)} size={44} strokeWidth={4} color={color}>
          <span className="text-[12px] font-bold tabular-nums text-muted-foreground">
            {progress.total === 0 ? "0%" : `${progress.done}/${progress.total}`}
          </span>
        </GoalRing>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
                if (e.key === "Escape") {
                  setTitle(goal.content);
                  setEditingTitle(false);
                }
              }}
              aria-label="목표 이름"
              className="min-w-0 border-0 bg-transparent p-0 text-[16px] font-bold outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              aria-label={`${goal.content} — 눌러서 이름 수정`}
              className="min-w-0 cursor-text break-words text-left text-[16px] font-bold leading-snug"
            >
              <InlineText text={goal.content} />
            </button>
          )}
          <GoalParaChip
            goal={goal}
            name={containerNameOf(goal) ?? null}
            projects={projects}
            areas={areas}
            resources={resources}
            onChange={(patch) => goalActions.setPara(goal.id, patch)}
          />
        </div>
        <GoalMenu onRename={() => setEditingTitle(true)} onDelete={() => goalActions.remove(goal.id)} />
      </div>

      <div className="border-t border-border">
        {linked.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 px-4 pb-4 pt-5 text-center">
            <Clock className="size-[22px] text-warning" aria-hidden="true" />
            <span className="text-[14px] font-semibold">아직 캘린더에 시간이 안 잡혔어요</span>
            <span className="text-[12.5px] text-muted-foreground">할 일로 쪼개서 캘린더에 올리면 진행률이 쌓여요</span>
          </div>
        ) : (
          linked.map((todo) => {
            const when = whenLabel(todo, weekDays);
            return (
              <div
                key={todo.id}
                className="group flex min-h-10 items-center gap-2.5 border-b border-border py-1.5 pl-3.5 pr-2"
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggle(todo.id)}
                  aria-label={todo.completed ? "완료 취소" : "완료 표시"}
                  className="size-[18px] text-white [&_svg]:size-3"
                  style={{ borderColor: color, backgroundColor: todo.completed ? color : undefined }}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 break-words text-[14px]",
                    todo.completed && "text-muted-foreground line-through"
                  )}
                >
                  <InlineText text={todo.content} />
                </span>
                {when ? (
                  <span className="shrink-0 text-[12px] text-muted-foreground">{when}</span>
                ) : (
                  <span className="shrink-0 rounded-[5px] bg-black/[0.06] px-1.5 py-px text-[11px] font-semibold text-muted-foreground">
                    Inbox
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => goalActions.unlink(todo.id)}
                  aria-label={`${todo.content} — 목표에서 빼기`}
                  title="목표에서 빼기"
                  className="flex size-[26px] shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <X weight="bold" className="size-3.5" />
                </button>
              </div>
            );
          })
        )}

        {progress.inbox > 0 ? (
          <div className="border-b border-border px-3.5 py-2 text-[12px] text-muted-foreground">
            Inbox에 {progress.inbox}개 — 캘린더로 끌어다 놓아 시간을 잡아 주세요
          </div>
        ) : null}

        {adding ? (
          <label className="flex min-h-10 items-center gap-2.5 border-b border-border pl-3.5 pr-2 text-primary">
            <Plus className="size-[18px] shrink-0" aria-hidden="true" />
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submitDraft(); // 입력칸은 그대로 — 연속 입력
                } else if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              onBlur={() => {
                submitDraft();
                setAdding(false);
              }}
              enterKeyHint="done"
              placeholder="새 할 일 — Inbox에 생겨요"
              aria-label="이 목표의 새 할 일"
              className="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-foreground outline-none placeholder:text-muted-foreground sm:text-[14px]"
            />
          </label>
        ) : null}

        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
          <FooterButton onClick={() => setAdding(true)} icon={<Plus className="size-[15px]" />}>
            새 할 일
          </FooterButton>
          <GoalLinkPopover goal={goal} weekDays={weekDays}>
            {(open, toggleOpen) => (
              <FooterButton
                onClick={toggleOpen}
                active={open}
                ariaExpanded={open}
                icon={<LinkSimple className="size-[15px]" />}
              >
                이번 주 할 일 연결
              </FooterButton>
            )}
          </GoalLinkPopover>
        </div>
      </div>
    </section>
  );
}

function FooterButton({
  onClick,
  icon,
  active,
  ariaExpanded,
  children,
}: {
  onClick: () => void;
  icon: ReactNode;
  active?: boolean;
  ariaExpanded?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={ariaExpanded}
      className={cn(
        "flex min-h-8 items-center gap-1.5 rounded-[7px] px-2 text-[13px] font-medium text-primary hover:bg-accent",
        active && "bg-accent"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** 목표의 PARA — 점 + 이름, 누르면 PARA 선택(할 일 상세 팝업과 같은 `ParaMenu`). */
function GoalParaChip({
  goal,
  name,
  projects,
  areas,
  resources,
  onChange,
}: {
  goal: WeeklyGoal;
  name: string | null;
  projects: Project[];
  areas: Area[];
  resources: Resource[];
  onChange: (patch: { projectId: string | null; areaId: string | null; resourceId: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  const category = getParaCategory(goal);
  const mappedId = goal.projectId ?? goal.areaId ?? goal.resourceId;

  return (
    <div ref={ref} className="relative self-start">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-[5px] rounded-[5px] text-[12px] text-muted-foreground hover:text-foreground"
      >
        {category ? (
          <span className="size-[7px] rounded-full" style={{ backgroundColor: `var(${CATEGORY_COLOR_VAR[category]})` }} />
        ) : null}
        {name ? <InlineText text={name} /> : "PARA 없음"}
        <CaretDown weight="bold" className="size-3" aria-hidden="true" />
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
            onChange({ projectId: null, areaId: null, resourceId: null });
            setOpen(false);
          }}
          className="absolute left-0 top-[calc(100%+4px)] w-[240px]"
        />
      ) : null}
    </div>
  );
}

/** `···` — 이름 바꾸기 · 삭제 (PARA 상세 `ContainerMenu`와 같은 macOS 메뉴 모양). */
function GoalMenu({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  function pick(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={ref} className="relative shrink-0 self-start">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="목표 메뉴"
        className={cn(
          "flex size-7 items-center justify-center rounded-full bg-black/[0.05] text-muted-foreground hover:bg-black/[0.09]",
          open && "bg-black/[0.12]"
        )}
      >
        <DotsThree className="size-4" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="목표 메뉴"
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[200px] rounded-[10px] border border-black/10 bg-popover/95 p-[5px] shadow-[0_12px_32px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => pick(onRename)}
            className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] hover:bg-primary hover:text-primary-foreground"
          >
            <PencilSimple className="size-[15px]" />
            이름 바꾸기
          </button>
          <div className="mx-2 my-[5px] h-px bg-black/10" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={() => pick(onDelete)}
            className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px] text-destructive hover:bg-primary hover:text-primary-foreground"
          >
            <Trash className="size-[15px]" />
            목표 삭제 (할 일은 남아요)
          </button>
        </div>
      ) : null}
    </div>
  );
}
