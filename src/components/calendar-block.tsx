"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight } from "@/components/icons";

import { Checkbox } from "@/components/ui/checkbox";
import { TodoDetailModal } from "@/components/todo-detail-modal";
import { InlineText } from "@/components/inline-text";
import { cn } from "@/lib/utils";
import { blockHeightPx } from "@/lib/calendar-layout";
import { CATEGORY_COLOR_VAR, CATEGORY_TINT_VAR, getParaCategory } from "@/lib/category";
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_START_MINUTES,
  HOUR_HEIGHT,
  MIN_DURATION_MINUTES,
  clampMinutes,
  minutesRangeLabel,
  minutesToPx,
  snapMinutes,
} from "@/lib/time";
import type { Area, Project, Resource, Todo } from "@/lib/types";
import type { DraggedTodoData } from "@/lib/dnd/drop-targets";
import { useSubtasks } from "@/lib/app-data/use-subtasks";
import { useSubtaskActions } from "@/lib/app-data/subtask-actions";
import { usePhotos } from "@/lib/app-data/use-photos";
import { useSession } from "@/lib/app-data/app-data-provider";
import { photoUrl } from "@/lib/photos";

/** 블록 안 하위 할 일 목록 배치 — 머리(패딩 · 제목 · 시간) 아래, 진행률 바 위에 들어갈 줄 수를 계산할 때 쓴다. */
const SUBTASK_HEAD_PX = 40;
const SUBTASK_FOOT_PX = 9;
const SUBTASK_ROW_PX = 15;
/** 진행률 바를 그릴 최소 블록 높이 (그보다 짧으면 제목 옆 개수만) */
const PROGRESS_BAR_MIN_HEIGHT = 44;
/** 이만큼 움직였으면 클릭이 아니라 드래그 — dnd-provider.tsx의 PointerSensor 시작 거리와 같게 */
const DRAG_DISTANCE_PX = 4;
/**
 * 1시간 30분 이상 블록이면 대표 사진을 블록 배경으로, 짧으면 오른쪽 위 작은 썸네일 (PHOTOS-PLAN.md, 시안 ② bg).
 * 픽셀이 아니라 시간으로 정한다 — 블록 사이 간격(BLOCK_GAP)을 바꿨을 때 1px 차이로 기준이 어긋났었다.
 */
const PHOTO_BG_MIN_HEIGHT = blockHeightPx(90);
const PHOTO_THUMB_PX = 38;

interface CalendarBlockProps {
  todo: Todo;
  /** 겹침 배치 (`layoutDayBlocks`) — 없으면 칸 전체 너비 */
  placement?: { left: string; width: string; nested: boolean };
  projects?: Project[];
  areas?: Area[];
  resources?: Resource[];
  onToggle?: (id: string) => void;
  onRemove?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onMemoEdit?: (id: string, memo: string) => void;
  onUrlEdit?: (id: string, url: string | null) => void;
  onAssignPara?: (id: string, patch: { projectId: string | null; areaId: string | null; resourceId: string | null }) => void;
  onResize?: (id: string, durationMinutes: number) => void;
  overlay?: boolean;
}

export function CalendarBlock({
  todo,
  placement,
  projects,
  areas,
  resources,
  onToggle,
  onRemove,
  onEdit,
  onMemoEdit,
  onUrlEdit,
  onAssignPara,
  onResize,
  overlay,
}: CalendarBlockProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [previewDuration, setPreviewDuration] = useState<number | null>(null);
  const resizeState = useRef<{ startY: number; startDuration: number } | null>(null);
  // 누른 위치 — 놓았을 때 거의 안 움직였으면 클릭(팝업), 움직였으면 드래그였던 것
  const pressPoint = useRef<{ x: number; y: number } | null>(null);
  const { subtasksOf } = useSubtasks();
  const subtaskActions = useSubtaskActions();
  const { coverOf } = usePhotos();
  const { googleConnected } = useSession();
  // Drive 연결이 끊겼거나 파일이 없어서 못 불러온 사진 — 평소 모양으로 돌아간다
  const [failedPhotoId, setFailedPhotoId] = useState<string | null>(null);

  const startMinutes = todo.startMinutes ?? DEFAULT_START_MINUTES;
  const baseDuration = todo.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const duration = previewDuration ?? baseDuration;

  // 완료된 할 일은 끌어서 옮길 수 없다 — 끝난 일정이 실수로 다른 날로 밀리지 않게. 완료를 풀면 다시 옮길 수 있다.
  const locked = todo.completed;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    disabled: overlay || locked,
    data: { type: "todo", source: "calendar" } satisfies DraggedTodoData,
  });

  function handleBlockPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    pressPoint.current = { x: e.clientX, y: e.clientY };
    listeners?.onPointerDown?.(e);
  }

  // 블록 어디를 눌러도 상세 팝업 — 겹친 블록의 제목이 가려져도 보이는 부분을 누르면 열린다.
  // 체크박스 · 하위 할 일 동그라미 · 크기 조절 손잡이는 각자 click을 막는다.
  function handleBlockClick(e: ReactMouseEvent<HTMLDivElement>) {
    const press = pressPoint.current;
    pressPoint.current = null;
    // 드래그 시작 거리(4px, dnd-provider.tsx) 이상 움직였으면 드래그 — 놓자마자 팝업이 뜨지 않게
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) >= DRAG_DISTANCE_PX) return;
    if (onEdit) setDetailOpen(true);
  }

  function handleBlockKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    if (onEdit) setDetailOpen(true);
  }

  function handleResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeState.current = { startY: e.clientY, startDuration: baseDuration };
  }

  function handleResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizeState.current) return;
    const deltaMinutes = ((e.clientY - resizeState.current.startY) / HOUR_HEIGHT) * 60;
    const next = clampMinutes(
      snapMinutes(resizeState.current.startDuration + deltaMinutes),
      MIN_DURATION_MINUTES,
      1440 - startMinutes
    );
    setPreviewDuration(next);
  }

  function handleResizePointerUp() {
    if (!resizeState.current) return;
    resizeState.current = null;
    if (previewDuration !== null) onResize?.(todo.id, previewDuration);
    setPreviewDuration(null);
  }

  const renderedHeight = blockHeightPx(duration);
  const compact = renderedHeight <= 34;

  const category = getParaCategory(todo);
  // 완료돼도 카테고리 색은 유지하고 블록 전체를 흐리게(애플 캘린더 방식). 매핑 없으면 회색.
  const colorVar = category ? `var(${CATEGORY_COLOR_VAR[category]})` : "var(--muted-foreground)";
  const tintVar = category ? `var(${CATEGORY_TINT_VAR[category]})` : "var(--secondary)";

  // 하위 할 일: 제목 옆 개수 · 바닥 진행률 바 · 블록이 크면 앞에서부터 목록 (노트는 없음)
  const subtasks = todo.kind === "task" ? subtasksOf(todo.id) : [];
  const subtaskDone = subtasks.filter((s) => s.completed).length;
  const showProgressBar = subtasks.length > 0 && !compact && renderedHeight >= PROGRESS_BAR_MIN_HEIGHT;
  const rowsThatFit = compact
    ? 0
    : Math.max(0, Math.floor((renderedHeight - SUBTASK_HEAD_PX - SUBTASK_FOOT_PX) / SUBTASK_ROW_PX));
  // 다 못 보여주면 마지막 줄을 "외 N개"로
  const visibleSubtasks =
    rowsThatFit >= subtasks.length ? subtasks : subtasks.slice(0, Math.max(0, rowsThatFit - 1));
  const hiddenSubtaskCount = subtasks.length - visibleSubtasks.length;

  // 대표 사진 — 긴 블록은 배경(흰 글씨, 하위 목록 · 진행률 바는 숨김), 짧으면 썸네일, 한 줄 블록엔 없음
  const cover = todo.kind === "task" && googleConnected && !compact ? coverOf(todo.id) : null;
  const photo = cover && cover.id !== failedPhotoId ? cover : null;
  const photoBg = photo !== null && renderedHeight >= PHOTO_BG_MIN_HEIGHT;
  const thumbPx = photo && !photoBg ? Math.min(PHOTO_THUMB_PX, renderedHeight - 10) : 0;
  const thumbPad = thumbPx ? { paddingRight: thumbPx + 4 } : undefined;

  if (overlay) {
    return (
      <div
        className="relative w-[200px] rounded-[4px] py-1.5 pl-[13px] pr-2.5 shadow-lg"
        style={{ height: renderedHeight, backgroundColor: tintVar }}
      >
        <CategoryBar color={colorVar} />
        <p className="truncate text-[12px] font-semibold text-foreground"><InlineText text={todo.content} /></p>
        <p className="truncate text-[11px] text-muted-foreground">
          {minutesRangeLabel(startMinutes, duration)}
        </p>
      </div>
    );
  }

  const style: CSSProperties = {
    position: "absolute",
    top: minutesToPx(startMinutes),
    height: renderedHeight,
    left: placement?.left ?? 3,
    width: placement?.width ?? "calc(100% - 7px)",
    transform: CSS.Translate.toString(transform),
    backgroundColor: tintVar,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onPointerDown={handleBlockPointerDown}
        onClick={handleBlockClick}
        onKeyDown={handleBlockKeyDown}
        className={cn(
          "absolute z-[1] flex cursor-pointer select-none flex-col justify-start overflow-hidden rounded-[4px] py-[5px] pl-[13px] pr-[7px] hover:brightness-[0.98]",
          // 끌 수 있을 때만 touch-none — 잠긴 블록 위에서는 모바일에서 손가락으로 캘린더를 스크롤할 수 있게
          !locked && "touch-none",
          // 안쪽에 얹힌 블록은 흰 테두리 + 틴트를 살짝 어둡게 — 같은 색 블록 위에서도 구분되게
          placement?.nested &&
            "bg-[linear-gradient(rgba(0,0,0,0.04),rgba(0,0,0,0.04))] shadow-[0_0_0_1px_var(--background)]",
          todo.completed && "opacity-50",
          isDragging && "z-20 opacity-40",
          compact && "flex-row items-center gap-1.5 py-0"
        )}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- Drive에서 읽어오는 사용자 사진이라 next/image 최적화 대상이 아님
          <img
            src={photoUrl(photo.id, "thumb")}
            alt=""
            draggable={false}
            onError={() => setFailedPhotoId(photo.id)}
            className={cn(
              "pointer-events-none absolute object-cover",
              photoBg ? "inset-0 size-full" : "right-[5px] top-[5px] rounded-[4px] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"
            )}
            style={photoBg ? undefined : { width: thumbPx, height: thumbPx }}
          />
        ) : null}
        {photoBg ? (
          // 글자가 있는 위쪽을 어둡게 — 흰 글씨가 어떤 사진 위에서도 읽히게
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.22)_60%,rgba(0,0,0,0.05)_100%)]"
          />
        ) : null}
        <CategoryBar color={colorVar} />
        <div className={cn("relative flex min-w-0 items-center gap-1.5", compact && "flex-1")} style={thumbPad}>
          <span
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="flex shrink-0"
          >
            <Checkbox
              checked={todo.completed}
              onCheckedChange={() => onToggle?.(todo.id)}
              className="size-[13px] border-[1.5px] [&_svg]:size-2.5"
              style={{
                borderColor: photoBg ? "white" : colorVar,
                backgroundColor: todo.completed ? colorVar : undefined,
              }}
              aria-label="완료 표시"
            />
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[12px] font-semibold leading-tight",
              photoBg ? "text-white" : "text-foreground",
              todo.completed && "line-through"
            )}
          >
            <InlineText text={todo.content} />
          </span>
          {subtasks.length > 0 ? (
            <span
              className={cn(
                "shrink-0 text-[10.5px] font-bold tabular-nums",
                photoBg ? "text-white/90" : "text-foreground/70"
              )}
              aria-label={`하위 할 일 ${subtasks.length}개 중 ${subtaskDone}개 완료`}
            >
              {subtaskDone}/{subtasks.length}
            </span>
          ) : null}
        </div>
        {!compact ? (
          <span
            className={cn(
              "relative mt-0.5 truncate pl-[19px] text-[11px] leading-tight",
              photoBg ? "text-white/90" : "text-foreground/70"
            )}
            style={thumbPad}
          >
            {minutesRangeLabel(startMinutes, duration)}
          </span>
        ) : null}
        {!compact && !photoBg && rowsThatFit > 0 && subtasks.length > 0 ? (
          <div className="mt-1 flex min-w-0 flex-col gap-px pl-[19px]">
            {visibleSubtasks.map((subtask) => (
              <span key={subtask.id} className="flex h-[14px] min-w-0 items-center gap-[5px] text-[11px] leading-none">
                {subtask.carriedAt ? (
                  // 넘긴 항목 — 체크 대신 화살표, 취소선 없음 (완료와 구분)
                  <span className="flex size-2.5 shrink-0 items-center justify-center" aria-label="넘김">
                    <ArrowRight weight="bold" className="size-2.5" />
                  </span>
                ) : (
                  // 드래그와 겹치지 않게 pointerdown을 막는다 (부모 체크박스와 같은 방식)
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      subtaskActions.toggle(subtask.id);
                    }}
                    aria-label={`${subtask.content} ${subtask.completed ? "완료 취소" : "완료 표시"}`}
                    className="size-2.5 shrink-0 rounded-full border-[1.3px]"
                    style={{ borderColor: colorVar, backgroundColor: subtask.completed ? colorVar : undefined }}
                  />
                )}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    subtask.completed ? "text-foreground/50 line-through" : "text-foreground"
                  )}
                >
                  <InlineText text={subtask.content} />
                </span>
              </span>
            ))}
            {hiddenSubtaskCount > 0 ? (
              <span className="flex h-[14px] items-center text-[10.5px] leading-none text-foreground/55">
                {visibleSubtasks.length > 0 ? `외 ${hiddenSubtaskCount}개` : `하위 할 일 ${hiddenSubtaskCount}개`}
              </span>
            ) : null}
          </div>
        ) : null}
        {showProgressBar && !photoBg ? (
          <div
            className="mt-auto h-[3px] shrink-0 overflow-hidden rounded-full"
            style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 20%, transparent)` }}
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${(subtaskDone / subtasks.length) * 100}%`, backgroundColor: colorVar }}
            />
          </div>
        ) : null}
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize touch-none"
        />
      </div>
      {detailOpen ? (
        <TodoDetailModal
          todo={todo}
          projects={projects ?? []}
          areas={areas ?? []}
          resources={resources ?? []}
          onEdit={(id, content) => onEdit?.(id, content)}
          onMemoEdit={(id, memo) => onMemoEdit?.(id, memo)}
          onUrlEdit={(id, url) => onUrlEdit?.(id, url)}
          onAssignPara={(id, patch) => onAssignPara?.(id, patch)}
          onRemove={(id) => onRemove?.(id)}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </>
  );
}

/**
 * 블록 왼쪽 카테고리 선 — 가장자리에 붙이지 않고 위 · 아래 · 왼쪽에서 3px 띄운 3px 막대(끝은 살짝 둥글게).
 * 애플 캘린더 방식이라 블록 모서리를 따라 휘지 않는다.
 */
function CategoryBar({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[3px] left-[3px] top-[3px] w-[3px] rounded-[2px]"
      style={{ backgroundColor: color }}
    />
  );
}
