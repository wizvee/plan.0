"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ArrowSquareOut, BookmarkSimple, CaretDown, Clock, Compass, LinkSimple, Note, Stack, Target, Trash, X } from "@/components/icons";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SubtaskList } from "@/components/subtask/subtask-list";
import { ParaMenu } from "@/components/para/para-menu";
import { TodoReflectionList } from "@/components/reflection/reflection-list";
import { PhotoTab } from "@/components/photo/photo-tab";
import { InlineText } from "@/components/inline-text";
import { MemoEditor } from "@/components/memo/memo-editor";
import { MemoView } from "@/components/memo/memo-view";
import { hasMemoMarks } from "@/lib/memo-marks";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, CATEGORY_TINT_VAR, getParaCategory } from "@/lib/category";
import { formatClock, MINUTES_PER_DAY } from "@/lib/time";
import { isSubtaskPending, type Area, type ParaKind, type Project, type Resource, type Todo, type TodoKind } from "@/lib/types";
import { carryDateLabel, findCarryTarget, isCarryDue, nextWeekday } from "@/lib/carry-over";
import { useNow } from "@/lib/use-today";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import { useTodos } from "@/lib/app-data/use-todos";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { useReflections } from "@/lib/app-data/use-reflections";
import { usePhotos } from "@/lib/app-data/use-photos";

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

/** "9월 28일 (월) · 오전 9시 – 오전 11시". 캘린더에 배치되지 않았으면 null. */
function scheduleLabel(todo: Todo): string | null {
  if (!todo.scheduledDate) return null;
  const day = format(parseISO(todo.scheduledDate), "M월 d일 (EEE)", { locale: ko });
  if (todo.startMinutes === null) return day;
  const end = Math.min(todo.startMinutes + (todo.durationMinutes ?? 0), MINUTES_PER_DAY);
  return `${day} · ${formatClock(todo.startMinutes)} – ${formatClock(end)}`;
}

type DetailTab = "subtasks" | "retro" | "memo" | "photos";

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
}: TodoDetailModalProps) {
  const [title, setTitle] = useState(todo.content);
  const [memo, setMemo] = useState(todo.memo ?? "");
  // 제목 · 메모는 평소엔 `코드`가 렌더링된 텍스트로 보여주고, 누르면 원문 입력칸으로 바뀐다
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingMemo, setEditingMemo] = useState(false);
  // 보기 모드에서 누른 메모 줄 — 편집으로 바뀔 때 그 줄 끝에 커서를 둔다
  const [memoCaretLine, setMemoCaretLine] = useState<number | null>(null);
  const [url, setUrl] = useState(todo.url ?? "");
  const [paraOpen, setParaOpen] = useState(false);
  const paraRef = useRef<HTMLDivElement>(null);
  const { toggle, carryOver } = useTodoActions();
  const { todos } = useTodos();
  const { subtasksOf, progressOf } = useSubtasks();
  const [carrying, setCarrying] = useState(false);
  const { reflectionsOf } = useReflections();
  const { photosOf } = usePhotos();
  // 완료된 할 일은 회고 탭으로 연다 — 끝낸 직후가 회고하기 가장 좋은 때라서 (REFLECTIONS-PLAN.md 4번 ①).
  // 모달 안에서만 기억한다(URL · localStorage에 저장하지 않음).
  const [tab, setTab] = useState<DetailTab>(todo.completed ? "retro" : "subtasks");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // 모달 안 팝오버(회고 종류 메뉴 등)가 Esc를 처리했으면 그 팝오버만 닫힌다 (useDismiss)
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
    const trimmed = memo.trim();
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

  const color = category ? `var(${CATEGORY_COLOR_VAR[category]})` : "var(--muted-foreground)";
  const tint = category ? `var(${CATEGORY_TINT_VAR[category]})` : "var(--secondary)";
  const KindIcon = category ? KIND_ICON[category] : Stack;

  const isTask = todo.kind === "task";
  const schedule = scheduleLabel(todo);
  const progress = progressOf(todo.id);
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const reflections = reflectionsOf(todo.id);
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
  const tabs: { id: DetailTab; label: string; badge: string | null; dot: boolean }[] = [
    { id: "subtasks", label: "하위 할 일", badge: progress.total > 0 ? `${progress.done}/${progress.total}` : null, dot: false },
    { id: "retro", label: "회고", badge: reflections.length > 0 ? String(reflections.length) : null, dot: false },
    { id: "memo", label: "메모 · URL", badge: null, dot: hasMemoOrUrl },
    { id: "photos", label: "사진", badge: photoCount > 0 ? String(photoCount) : null, dot: false },
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
      ) : hasMemoMarks(memo) ? (
        <MemoView
          text={memo}
          onChange={saveMemo}
          onEdit={editMemo}
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
              <span className="flex items-center gap-[5px] text-[12.5px] text-muted-foreground">
                <Clock className="size-[13px] shrink-0" aria-hidden="true" />
                {schedule}
              </span>
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
            <div role="tablist" aria-label="할 일 상세" className="mt-3 grid grid-cols-4 rounded-lg bg-black/[0.06] p-0.5">
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

              {tab === "retro" ? (
                <div className="flex min-h-0 flex-1 flex-col gap-2">
                  {todo.projectId && mappedName ? (
                    <span className="px-0.5 text-[12px] text-muted-foreground">
                      <InlineText text={mappedName} /> 프로젝트 회고에도 모여요
                    </span>
                  ) : null}
                  <TodoReflectionList todoId={todo.id} reflections={reflections} />
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
      </div>
    </div>,
    document.body
  );
}
