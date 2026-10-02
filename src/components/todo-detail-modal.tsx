"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ArrowSquareOut, BookmarkSimple, CaretDown, Clock, Compass, LinkSimple, Note, Stack, Target, Trash, X } from "@/components/icons";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SubtaskList } from "@/components/subtask/subtask-list";
import { MovedTodoList } from "@/components/subtask/moved-todo-list";
import { ParaMenu } from "@/components/para/para-menu";
import { PhotoTab } from "@/components/photo/photo-tab";
import { TodoTimeEditor } from "@/components/todo-time-editor";
import { InlineText } from "@/components/inline-text";
import { MemoEditor } from "@/components/memo/memo-editor";
import { MemoView } from "@/components/memo/memo-view";
import type { MemoLinks } from "@/components/memo/memo-link";
import { MARK_META } from "@/components/memo/mark-meta";
import { hasMemoBullets, hasMemoMarks, parseMemoLines } from "@/lib/memo-marks";
import { hasMemoLinks, movedTodosOf, resolveLink } from "@/lib/memo-links";
import { hasWebLinks } from "@/lib/web-links";
import { hasRetroLines, RETRO_KINDS, RETRO_STATE, type RetroKind } from "@/lib/retro";
import { cn } from "@/lib/utils";
import { getParaCategory } from "@/lib/category";
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_START_MINUTES,
  endMinutesOf,
  formatClock,
  isOvernight,
} from "@/lib/time";
import { isSubtaskPending, type Area, type ParaKind, type Project, type Resource, type Todo, type TodoKind } from "@/lib/types";
import { carryDateLabel, findCarryTarget, isCarryDue, nextWeekday } from "@/lib/carry-over";
import { useNow } from "@/lib/use-today";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import { useTodos } from "@/lib/app-data/use-todos";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { usePhotos } from "@/lib/app-data/use-photos";
import { useParaColor } from "@/lib/app-data/use-para-color";

const KIND_ICON: Record<ParaKind, typeof Target> = {
  project: Target,
  area: Compass,
  resource: BookmarkSimple,
};

const KIND_LABEL: Record<ParaKind, string> = {
  project: "프로젝트",
  area: "영역",
  resource: "리소스",
};

/** "9월 28일 (월) · 오전 9시 – 오전 11시", 자정을 넘으면 "… 오후 11:45 – 다음 날 오전 7:15". 캘린더에 배치되지 않았으면 null. */
function scheduleLabel(todo: Todo): string | null {
  if (!todo.scheduledDate) return null;
  const day = format(parseISO(todo.scheduledDate), "M월 d일 (EEE)", { locale: ko });
  if (todo.startMinutes === null) return day;
  const duration = todo.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const end = endMinutesOf(todo.startMinutes, duration);
  const nextDay = isOvernight(todo.startMinutes, duration) ? "다음 날 " : "";
  return `${day} · ${formatClock(todo.startMinutes)} – ${nextDay}${formatClock(end)}`;
}

export type DetailTab = "subtasks" | "memo" | "photos";

interface ParaAssignPatch {
  projectId: string | null;
  areaId: string | null;
  resourceId: string | null;
}

interface TodoDetailModalProps {
  todo: Todo;
  projects: Project[];
  areas: Area[];
  resources: Resource[];
  onEdit: (id: string, content: string) => void;
  onMemoEdit: (id: string, memo: string) => void;
  onUrlEdit: (id: string, url: string | null) => void;
  onAssignPara: (id: string, patch: ParaAssignPatch) => void;
  onRemove: (id: string) => void;
  onConvert?: (id: string, kind: TodoKind) => void;
  onClose: () => void;
  /** 처음 열 탭(검색 결과 등). 없으면 완료 = 회고, 미완료 = 하위 할 일 */
  initialTab?: DetailTab;
}

export function TodoDetailModal({
  todo,
  projects,
  areas,
  resources,
  onEdit,
  onMemoEdit,
  onUrlEdit,
  onAssignPara,
  onRemove,
  onConvert,
  onClose,
  initialTab,
}: TodoDetailModalProps) {
  const [title, setTitle] = useState(todo.content);
  const [memo, setMemo] = useState(todo.memo ?? "");
  // 메모가 밖에서 바뀌면(링크 대상 이름이 바뀌어 고쳐짐 · 다른 기기) 편집 중이 아닐 때 따라간다
  const [syncedMemo, setSyncedMemo] = useState(todo.memo);
  // 제목 · 메모는 평소엔 `코드`가 렌더링된 텍스트로 보여주고, 누르면 원문 입력칸으로 바뀐다
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingMemo, setEditingMemo] = useState(false);
  // 보기 모드에서 누른 메모 줄 — 편집으로 바뀔 때 그 줄 끝에 커서를 둔다
  const [memoCaretLine, setMemoCaretLine] = useState<number | null>(null);
  const [url, setUrl] = useState(todo.url ?? "");
  const [paraOpen, setParaOpen] = useState(false);
  const paraRef = useRef<HTMLDivElement>(null);
  const { toggle, carryOver, setTime } = useTodoActions();
  const paraColor = useParaColor();
  // 일정 줄을 누르면 시작 · 끝 편집이 열린다 (BALANCE-PLAN.md 6번)
  const [editingTime, setEditingTime] = useState(false);
  const { todos } = useTodos();
  const { subtasksOf, progressOf } = useSubtasks();
  const [carrying, setCarrying] = useState(false);
  const { photosOf } = usePhotos();
  // 완료된 할 일은 메모 탭으로 연다 — 끝낸 직후가 회고([p] [c] [I] 줄)하기 가장 좋은 때라서 (MEMO-MARKS-PLAN.md 7번).
  // 모달 안에서만 기억한다(URL · localStorage에 저장하지 않음).
  const [tab, setTab] = useState<DetailTab>(initialTab ?? (todo.completed ? "memo" : "subtasks"));
  // 메모 링크 · 옮긴 할 일 목록으로 연 다른 할 일 — 이 팝업 위에 겹쳐 열고, 닫으면 여기로 돌아온다 (LINKS-PLAN.md)
  const [linked, setLinked] = useState<{ id: string; tab: DetailTab | undefined } | null>(null);
  // 겹쳐 연 할 일이 지워졌으면(그 팝업에서 삭제) 닫힌 것으로
  const linkedTodo = linked ? (todos.find((t) => t.id === linked.id) ?? null) : null;

  if (!editingMemo && todo.memo !== syncedMemo) {
    setSyncedMemo(todo.memo);
    setMemo(todo.memo ?? "");
  }

  useEffect(() => {
    // 위에 겹쳐 연 팝업이 있으면 Esc는 그것만 닫는다
    if (linkedTodo) return;
    function onKeyDown(e: KeyboardEvent) {
      // 모달 안 팝오버(회고 종류 메뉴 등)가 Esc를 처리했으면 그 팝오버만 닫힌다 (useDismiss)
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, linkedTodo]);

  useEffect(() => {
    if (!paraOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (paraRef.current && !paraRef.current.contains(e.target as Node)) setParaOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [paraOpen]);

  function commitTitle() {
    setEditingTitle(false);
    const trimmed = title.trim();
    if (trimmed && trimmed !== todo.content) {
      onEdit(todo.id, trimmed);
    } else {
      setTitle(todo.content);
    }
  }

  function commitMemo() {
    setEditingMemo(false);
    // 표시만 있고 글자가 없는 줄뿐이면(회고 버튼을 누르고 안 적음) 빈 메모로
    const trimmed = parseMemoLines(memo).some((line) => line.text.trim() !== "") ? memo.trim() : "";
    if (trimmed !== memo) setMemo(trimmed);
    if (trimmed !== (todo.memo ?? "")) {
      onMemoEdit(todo.id, trimmed);
    }
  }

  /** 보기 모드에서 체크 · 질문 해결처럼 바로 저장되는 메모 변경 */
  function saveMemo(next: string) {
    setMemo(next);
    const trimmed = next.trim();
    if (trimmed !== (todo.memo ?? "")) onMemoEdit(todo.id, trimmed);
  }

  function editMemo(line: number | null) {
    setMemoCaretLine(line);
    setEditingMemo(true);
  }

  /** 빈 메모의 회고 버튼 — 그 표시가 붙은 줄로 편집을 연다(커서는 줄 끝) */
  function startRetro(kind: RetroKind) {
    setMemo(`- [${RETRO_STATE[kind]}] `);
    editMemo(null);
  }

  function commitUrl() {
    const trimmed = url.trim();
    if (trimmed !== (todo.url ?? "")) {
      onUrlEdit(todo.id, trimmed || null);
    }
  }

  function pick(kind: ParaKind, id: string) {
    onAssignPara(todo.id, {
      projectId: kind === "project" ? id : null,
      areaId: kind === "area" ? id : null,
      resourceId: kind === "resource" ? id : null,
    });
    setParaOpen(false);
  }

  function clearPara() {
    onAssignPara(todo.id, { projectId: null, areaId: null, resourceId: null });
    setParaOpen(false);
  }

  const category = getParaCategory(todo);
  const mappedId = todo.projectId ?? todo.areaId ?? todo.resourceId;
  const mappedName = category
    ? (category === "project" ? projects : category === "area" ? areas : resources).find((c) => c.id === mappedId)
        ?.name ?? null
    : null;

  // 색 = 영역(컨텍스트) 색, 종류는 타일 아이콘 · 라벨이 말한다
  const { color, tint, context } = paraColor.ofMapping(todo);
  const KindIcon = category ? KIND_ICON[category] : Stack;

  const isTask = todo.kind === "task";
  const schedule = scheduleLabel(todo);
  const progress = progressOf(todo.id);
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const photoCount = photosOf(todo.id).length;
  // 다음 날로 넘기기 — 캘린더에 배치된 할 일에 안 끝난 하위 할 일이 있을 때만 (CARRY-OVER-PLAN.md)
  const pendingCount = isTask ? subtasksOf(todo.id).filter(isSubtaskPending).length : 0;
  const carryDate = isTask && todo.scheduledDate && pendingCount > 0 ? nextWeekday(todo.scheduledDate) : null;
  const carryTarget = carryDate ? findCarryTarget(todos, todo, carryDate) : null;
  // 끝나는 시각 전엔 푸터에 작은 "넘기기"만, 지나면(또는 지난 날짜면) 큰 카드로 유도 — 업무 중 잘못 누르지 않게
  const now = useNow();
  const carryDue = carryDate !== null && now !== null && isCarryDue(todo, now);
  const carrySummary = carryDate
    ? `안 끝난 ${pendingCount}개를 ${carryDateLabel(carryDate)} ${carryTarget ? `${carryTarget.content}에 추가` : "새 할 일로"} 넘기고 이 할 일은 완료`
    : "";

  async function handleCarryOver() {
    setCarrying(true);
    try {
      await carryOver(todo.id);
    } finally {
      setCarrying(false);
    }
  }
  const hasMemoOrUrl = Boolean(todo.memo?.trim() || todo.url?.trim());
  // 이 할 일에서 "나중에"로 옮겨 간 할 일들(역링크) — 하위 할 일 탭 아래
  const movedTodos = isTask ? movedTodosOf(todo, todos) : [];
  const memoLinks: MemoLinks = {
    resolve: (target) => resolveLink(target, todos, todo),
    // 원래 할 일(옮긴 할 일이 있는 쪽)은 그 목록이 보이는 하위 할 일 탭으로 연다
    open: (target) =>
      setLinked({
        id: target.id,
        tab: target.kind === "task" && movedTodosOf(target, todos).length > 0 ? "subtasks" : undefined,
      }),
  };
  // 메모에 남은 일 — 열린 질문 [?] + 열린 확인 [ ] (시안 ⑰). 있으면 회색 알약 숫자, 없으면 내용 점
  const openMarks = parseMemoLines(memo).filter((line) => line.state === " " || line.state === "?").length;
  const tabs: { id: DetailTab; label: string; badge: string | null; pill: number; dot: boolean }[] = [
    { id: "subtasks", label: "하위 할 일", badge: progress.total > 0 ? `${progress.done}/${progress.total}` : null, pill: 0, dot: false },
    { id: "memo", label: "메모 · URL", badge: null, pill: openMarks, dot: openMarks === 0 && hasMemoOrUrl },
    { id: "photos", label: "사진", badge: photoCount > 0 ? String(photoCount) : null, pill: 0, dot: false },
  ];

  // 메모 · URL — 할 일은 "메모 · URL" 탭 안에서 탭 높이를 채우고, 노트는 탭 없이 지금처럼 바로 보인다.
  const memoAndUrl = (
    <>
      {editingMemo ? (
        <MemoEditor
          value={memo}
          onChange={setMemo}
          onCommit={commitMemo}
          caretLine={memoCaretLine}
          className={isTask ? "min-h-0 flex-1" : "mt-2.5"}
          textareaClassName={isTask ? "min-h-0 flex-1 resize-none" : "resize-y"}
        />
      ) : isTask && todo.completed && !memo.trim() ? (
        <RetroPrompt onPick={startRetro} onPlain={() => editMemo(null)} />
      ) : hasMemoMarks(memo) || hasMemoBullets(memo) || hasMemoLinks(memo) || hasWebLinks(memo) ? (
        <MemoView
          text={memo}
          onChange={saveMemo}
          onEdit={editMemo}
          links={memoLinks}
          className={isTask ? "min-h-0 flex-1 overflow-y-auto" : "mt-2.5"}
        />
      ) : (
        <button
          type="button"
          onClick={() => editMemo(null)}
          aria-label="메모 수정"
          className={cn(
            "cursor-text whitespace-pre-wrap break-words text-left text-[15px] leading-snug",
            // 버튼은 내용을 세로 가운데에 두므로, 탭을 채울 때는 flex로 위에 붙인다
            isTask ? "flex min-h-0 flex-1 items-start overflow-y-auto" : "mt-2.5 min-h-[3.9em]",
            !memo && "text-muted-foreground"
          )}
        >
          <span className="min-w-0">{memo ? <InlineText text={memo} /> : "메모"}</span>
        </button>
      )}

      {!editingMemo && todo.projectId && mappedName && hasRetroLines(memo) ? (
        <p className="mt-2 flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="flex gap-[3px]" aria-hidden="true">
            {RETRO_KINDS.map((kind) => {
              const Icon = MARK_META[kind].icon;
              return (
                <span
                  key={kind}
                  className="flex size-3.5 items-center justify-center rounded-[4px]"
                  style={{ backgroundColor: MARK_META[kind].tint, color: MARK_META[kind].color }}
                >
                  <Icon weight="bold" className="size-2.5" />
                </span>
              );
            })}
          </span>
          <span className="min-w-0 truncate">
            <InlineText text={mappedName} /> 프로젝트 회고에도 모여요
          </span>
        </p>
      ) : null}

      <div className="mt-3 flex shrink-0 items-center gap-1.5 rounded-md bg-muted pl-2.5 pr-1">
        <LinkSimple className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={commitUrl}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder="URL 추가"
          className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[13px] outline-none placeholder:text-muted-foreground"
        />
        {url.trim() ? (
          <a
            href={url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="새 탭에서 열기"
            className="flex size-[26px] shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-card"
          >
            <ArrowSquareOut weight="bold" className="size-3.5" />
          </a>
        ) : null}
      </div>
    </>
  );

  // body로 포털 — 모달을 연 카드가 Inbox 패널(sticky = 자체 쌓임 맥락) 안에 있으면 본문 캘린더의
  // z-index 요소(현재 시각 선 · 블록)가 모달 위로 올라와 클릭을 가로챘다.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[440px] flex-col overflow-y-auto rounded-xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {isTask ? (
            <Checkbox
              checked={todo.completed}
              onCheckedChange={() => toggle(todo.id)}
              aria-label={todo.completed ? "완료 취소" : "완료 표시"}
              className="mt-[3px] size-[22px] text-white"
              style={{ borderColor: color, backgroundColor: todo.completed ? color : undefined }}
            />
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            {editingTitle ? (
              <Input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
                }}
                aria-label="제목"
                className={cn(
                  "h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-[19px] font-bold shadow-none focus-visible:ring-0",
                  isTask && todo.completed && "text-muted-foreground line-through"
                )}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                aria-label={`${title} — 눌러서 제목 수정`}
                className={cn(
                  "min-w-0 cursor-text break-words text-left text-[19px] font-bold leading-snug",
                  isTask && todo.completed && "text-muted-foreground line-through"
                )}
              >
                <InlineText text={title} />
              </button>
            )}
            {schedule ? (
              isTask ? (
                <button
                  type="button"
                  onClick={() => setEditingTime((v) => !v)}
                  aria-expanded={editingTime}
                  aria-label={`${schedule} — 눌러서 시간 수정`}
                  className="flex w-fit items-center gap-[5px] rounded-[5px] text-left text-[12.5px] text-muted-foreground hover:text-foreground"
                >
                  <Clock className="size-[13px] shrink-0" aria-hidden="true" />
                  {schedule}
                  <CaretDown
                    weight="bold"
                    className={cn("size-[11px] shrink-0 transition-transform", editingTime && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <span className="flex items-center gap-[5px] text-[12.5px] text-muted-foreground">
                  <Clock className="size-[13px] shrink-0" aria-hidden="true" />
                  {schedule}
                </span>
              )
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        {editingTime && isTask && todo.scheduledDate ? (
          <TodoTimeEditor
            startMinutes={todo.startMinutes ?? DEFAULT_START_MINUTES}
            durationMinutes={todo.durationMinutes ?? DEFAULT_DURATION_MINUTES}
            onChange={(start, duration) => setTime(todo.id, start, duration)}
          />
        ) : null}

        <div ref={paraRef} className="relative mt-2.5">
          <button
            type="button"
            onClick={() => setParaOpen((open) => !open)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md p-2 text-left hover:bg-accent",
              paraOpen && "bg-accent"
            )}
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: tint, color }}
            >
              <KindIcon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {category ? KIND_LABEL[category] : "PARA"}
                {category && context ? ` · ${context.name}` : ""}
              </span>
              <span
                className="truncate text-[14px] font-semibold"
                style={{ color: mappedName ? undefined : "var(--muted-foreground)" }}
              >
                {mappedName ?? "선택 안 함"}
              </span>
            </span>
            <CaretDown
              className={cn("size-[15px] shrink-0 text-muted-foreground transition-transform", paraOpen && "rotate-180")}
            />
          </button>

          {paraOpen ? (
            <ParaMenu
              projects={projects}
              areas={areas}
              resources={resources}
              selected={category && mappedId ? { kind: category, id: mappedId } : null}
              onPick={pick}
              onClear={clearPara}
              className="absolute inset-x-0 top-[calc(100%+4px)]"
            />
          ) : null}
        </div>

        {isTask ? (
          <>
            <div role="tablist" aria-label="할 일 상세" className="mt-3 grid grid-cols-3 rounded-lg bg-black/[0.06] p-0.5">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`todo-tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="todo-tabpanel"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex h-7 min-w-0 items-center justify-center gap-[5px] rounded-md px-1 text-[13px] font-medium text-muted-foreground hover:text-foreground",
                    tab === t.id && "bg-card font-semibold text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                  )}
                >
                  <span className="truncate">{t.label}</span>
                  {t.badge ? (
                    <span className="text-[12px] font-medium tabular-nums text-muted-foreground">{t.badge}</span>
                  ) : null}
                  {t.pill > 0 ? (
                    <span
                      className="flex h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-full bg-black/10 px-[5px] text-[11px] font-bold tabular-nums text-foreground"
                      aria-label={`남은 질문 · 확인 ${t.pill}개`}
                    >
                      {t.pill}
                    </span>
                  ) : null}
                  {t.dot ? (
                    <span className="size-[5px] shrink-0 rounded-full bg-muted-foreground" aria-label="내용 있음" />
                  ) : null}
                </button>
              ))}
            </div>

            {/* 탭 본문 높이 고정 — 탭을 바꿔도 모달 크기가 출렁이지 않게. 넘치면 본문 안에서만 스크롤 */}
            <div
              id="todo-tabpanel"
              role="tabpanel"
              aria-labelledby={`todo-tab-${tab}`}
              className="mt-3 flex h-[300px] flex-col"
            >
              {tab === "subtasks" ? (
                <div className="flex min-h-0 flex-1 flex-col gap-2">
                  {progress.total > 0 ? (
                    <div className="flex items-center gap-2 px-0.5">
                      <span className="text-[12.5px] font-semibold tabular-nums" style={{ color }}>
                        {progress.done}/{progress.total}
                      </span>
                      <div
                        className="h-1 flex-1 overflow-hidden rounded-full"
                        style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={progress.total}
                        aria-valuenow={progress.done}
                        aria-label="하위 할 일 진행률"
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-200"
                          style={{ width: `${percent}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[12px] tabular-nums text-muted-foreground">
                        {percent}%{progress.carried > 0 ? ` · 넘김 ${progress.carried}` : null}
                      </span>
                    </div>
                  ) : null}
                  <SubtaskList
                    todoId={todo.id}
                    color={color}
                    className="min-h-0 overflow-y-auto rounded-[10px] border border-border"
                  />
                  <MovedTodoList todos={movedTodos} onOpen={(t) => setLinked({ id: t.id, tab: undefined })} />
                  {carryDue && carryDate ? (
                    <button
                      type="button"
                      onClick={handleCarryOver}
                      disabled={carrying}
                      className="mt-auto flex w-full shrink-0 items-center gap-2.5 rounded-[10px] bg-accent px-3 py-2.5 text-left text-accent-foreground hover:brightness-[0.97] disabled:opacity-60"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="text-[14px] font-semibold">안 끝난 {pendingCount}개를 다음 날로 넘기기</span>
                        <span className="truncate text-[12px]">
                          {carryDateLabel(carryDate)}{" "}
                          {carryTarget ? (
                            <>
                              <InlineText text={carryTarget.content} />에 추가
                            </>
                          ) : (
                            "새로 만들어 추가"
                          )}{" "}
                          · 이 할 일은 완료돼요
                        </span>
                      </span>
                    </button>
                  ) : null}
                </div>
              ) : null}

              {tab === "memo" ? <div className="flex min-h-0 flex-1 flex-col">{memoAndUrl}</div> : null}

              {tab === "photos" ? <PhotoTab todoId={todo.id} /> : null}
            </div>
          </>
        ) : (
          memoAndUrl
        )}

        <div className="mt-3.5 flex items-center justify-between border-t border-border pt-2.5">
          <div className="-ml-2 flex items-center gap-0.5">
            {onConvert ? (
              <button
                type="button"
                onClick={() => onConvert(todo.id, todo.kind === "note" ? "task" : "note")}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Note weight="bold" className="size-3.5" />
                {todo.kind === "note" ? "할 일로 전환" : "노트로 전환"}
              </button>
            ) : null}
            {/* 끝나는 시각 전의 작은 넘기기 — 삭제 버튼과 떨어진 왼쪽에 둔다 */}
            {carryDate && !carryDue ? (
              <button
                type="button"
                onClick={handleCarryOver}
                disabled={carrying}
                title={carrySummary}
                aria-label={carrySummary}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
              >
                <ArrowRight className="size-3.5" />
                넘기기
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              onRemove(todo.id);
              onClose();
            }}
            aria-label="삭제"
            className="-mr-1.5 flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
          >
            <Trash className="size-[17px]" />
          </button>
        </div>
        {/* 메모 링크로 연 할 일 — 그 팝업도 body로 포털이라 이 팝업 위에 뜬다. 클릭은 위 stopPropagation에서 멈춰
            이 팝업의 배경(닫기)까지 올라오지 않는다 */}
        {linkedTodo ? (
          <TodoDetailModal
            key={linkedTodo.id}
            todo={linkedTodo}
            projects={projects}
            areas={areas}
            resources={resources}
            initialTab={linked?.tab}
            onEdit={onEdit}
            onMemoEdit={onMemoEdit}
            onUrlEdit={onUrlEdit}
            onAssignPara={onAssignPara}
            onRemove={onRemove}
            onConvert={onConvert}
            onClose={() => setLinked(null)}
          />
        ) : null}
      </div>
    </div>,
    document.body
  );
}

/** 완료했는데 메모가 비어 있을 때 — 회고 한 줄 유도 (시안 ⑧). 누르면 그 표시가 붙은 줄로 편집을 연다. */
function RetroPrompt({ onPick, onPlain }: { onPick: (kind: RetroKind) => void; onPlain: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 pb-6 text-center">
      <span className="text-[16px] font-bold">끝낸 일, 돌아볼까요?</span>
      <span className="text-[13px] text-muted-foreground">한 줄씩 적으면 메모에 표시와 함께 남아요</span>
      <div className="flex flex-wrap justify-center gap-2">
        {RETRO_KINDS.map((kind) => {
          const Icon = MARK_META[kind].icon;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onPick(kind)}
              className="flex h-10 items-center gap-2 rounded-[10px] pl-2.5 pr-3.5 text-[14px] font-semibold hover:brightness-[0.97]"
              style={{ backgroundColor: MARK_META[kind].tint }}
            >
              <Icon weight="bold" className="size-4" style={{ color: MARK_META[kind].color }} aria-hidden="true" />
              {MARK_META[kind].label}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onPlain} className="px-1 py-1 text-[13px] text-primary">
        그냥 메모 쓰기
      </button>
    </div>
  );
}
