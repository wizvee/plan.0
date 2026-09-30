"use client";

import { Fragment, useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { InlineText } from "@/components/inline-text";
import { TodoDetailById } from "@/components/todo-detail-by-id";
import { MarkLineRow, resultDateLabel } from "@/components/search/search-result";
import {
  chipMarks,
  countMarks,
  MARK_CHIPS,
  MarkChipButtons,
  ShowDoneSwitch,
  type MarkChip,
} from "@/components/search/mark-chips";
import { buildSearchIndex, search, type LineHit } from "@/lib/search";
import { useTodos } from "@/lib/app-data/use-todos";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import type { ParaKind, Todo } from "@/lib/types";

/** 처음에 보이는 줄 수 — 나머지는 "N개 더 보기" */
const PAGE = 10;

function mappedTo(todo: Todo, kind: ParaKind, id: string): boolean {
  return (kind === "project" ? todo.projectId : kind === "area" ? todo.areaId : todo.resourceId) === id;
}

/**
 * PARA 개요 탭 맨 위 "남은 것" 카드 (MEMO-MARKS-PLAN.md 8번, 시안 ⑩⑪⑫) — 이 PARA에 붙은 할 일 · 노트 메모의
 * 열린 `[ ]` · `[?]` 줄을 할 일별로 모은다. 검색 패널 칩 목록과 같은 부품(칩 · `MarkLineRow`)이라
 * 줄에서 바로 체크 · 해결 · 되돌리기가 되고, 줄을 누르면 그 할 일 팝업의 메모 탭이 열린다.
 * 열린 줄도 끝난 줄도 없으면 카드를 그리지 않는다.
 */
export function OpenMarksCard({ kind, id }: { kind: ParaKind; id: string }) {
  const { todos } = useTodos();
  const { editMemo } = useTodoActions();

  // 이 PARA 할 일 · 노트만으로 만든 검색 색인 — 줄 모드(줄 표시 칩)만 쓴다
  const mapped = useMemo(() => todos.filter((t) => t.memo && mappedTo(t, kind, id)), [todos, kind, id]);
  const index = useMemo(
    () => buildSearchIndex({ todos: mapped, subtasks: [], projects: [], areas: [], resources: [] }),
    [mapped]
  );
  const counts = useMemo(() => countMarks(index), [index]);

  // 고르기 전엔 개수가 있는 칩이 켜진다(확인할 것 먼저)
  const [pickedChip, setPickedChip] = useState<MarkChip | null>(null);
  const chip: MarkChip = pickedChip ?? (counts.check > 0 || counts.question === 0 ? "check" : "question");
  const [showDone, setShowDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);
  const closeTodo = useCallback(() => setOpenTodoId(null), []);

  const lines = useMemo(() => {
    const result = search(index, "", { marks: chipMarks(chip, showDone) });
    return result.mode === "lines" ? result.lines : [];
  }, [index, chip, showDone]);
  const shown = expanded ? lines : lines.slice(0, PAGE);

  // 같은 할 일의 줄은 정렬상 붙어 있다
  const groups: { todo: Todo; start: number; lines: LineHit[] }[] = [];
  shown.forEach((line, i) => {
    const last = groups[groups.length - 1];
    if (last && last.todo.id === line.todo.id) last.lines.push(line);
    else groups.push({ todo: line.todo, start: i, lines: [line] });
  });

  function editLineMemo(todo: Todo, memo: string) {
    const trimmed = memo.trim();
    if (trimmed !== (todo.memo ?? "")) editMemo(todo.id, trimmed);
  }

  const visible = counts.check + counts.question + counts.done > 0;

  return (
    <>
      {visible ? (
        <section aria-label="남은 것">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 px-1 pb-2">
            <h2 className="mr-1.5 text-[13px] font-bold">남은 것</h2>
            <MarkChipButtons
              chip={chip}
              counts={counts}
              allowNone={false}
              onChange={(next) => {
                setPickedChip(next);
                setExpanded(false);
              }}
            />
            <ShowDoneSwitch checked={showDone} onChange={setShowDone} className="ml-auto" />
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {lines.length === 0 ? (
              <p className="px-3.5 py-3 text-[13px] text-muted-foreground">
                {showDone ? `${MARK_CHIPS[chip].label} 줄이 없어요` : `남은 ${MARK_CHIPS[chip].label}이 없어요`}
              </p>
            ) : (
              groups.map((group, g) => (
                <Fragment key={`${group.todo.id}-${group.start}`}>
                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-x-1.5 px-3 pb-0.5 pt-2.5 text-[12px] text-muted-foreground",
                      g > 0 && "border-t border-border"
                    )}
                  >
                    <span className="font-semibold text-foreground">
                      <InlineText text={group.todo.content} />
                    </span>
                    <span>· {resultDateLabel(group.todo)}</span>
                  </div>
                  {group.lines.map((line, k) => (
                    <MarkLineRow
                      key={`${line.todo.id}:${line.lineIndex}`}
                      hit={line}
                      words={[]}
                      id={`open-mark-${group.start + k}`}
                      first
                      selected={false}
                      onOpen={() => setOpenTodoId(line.todo.id)}
                      onHover={() => {}}
                      onEditMemo={editLineMemo}
                    />
                  ))}
                </Fragment>
              ))
            )}
            {lines.length > shown.length ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full border-t border-border py-2.5 text-[13px] font-semibold text-primary hover:bg-accent"
              >
                {lines.length - shown.length}개 더 보기
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
      {/* 줄을 누르면 그 할 일의 메모 탭 — 카드가 사라져도(마지막 줄을 지움) 팝업은 남는다 */}
      {openTodoId ? <TodoDetailById todoId={openTodoId} initialTab="memo" onClose={closeTodo} /> : null}
    </>
  );
}
