"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, FileText, Plus } from "@/components/icons";

import { InlineText } from "@/components/inline-text";
import { TodoDetailById } from "@/components/todo-detail-by-id";
import { MARK_META } from "@/components/memo/mark-meta";
import { RetroKindIcon, RetroKindSelect } from "@/components/retro/retro-kind";
import {
  appendRetroLine,
  buildRetroMarkdown,
  collectProjectRetro,
  findRetroNote,
  markConverted,
  retroDateLabel,
  retroNoteTitle,
  RETRO_KINDS,
  type RetroItem,
  type RetroKind,
} from "@/lib/retro";
import { nextPosition, useTodos } from "@/lib/app-data/use-todos";
import { useTodoActions } from "@/lib/app-data/todo-actions";

/**
 * PARA 상세(Project)의 회고 탭 — 이 프로젝트에 붙은 할 일 메모의 `[p]` `[c]` `[I]` 줄을 잘한 점 / 아쉬운 점 / 다음엔
 * 3열로 모아 보여준다 (MEMO-MARKS-PLAN.md 7번, 시안 ⑨). 줄을 누르면 그 할 일의 메모 탭이 열린다(고치기는 거기서).
 * 맨 위 입력 줄은 프로젝트 전체 회고 — "〈프로젝트〉 회고" 노트(처음 쓸 때 만듦)의 메모에 줄로 붙인다.
 * `onSaveNote`는 마크다운을 자료 탭 편집기에 새 노트로 채워 연다 — Drive 쪽 처리는 상세 화면이 갖고 있다.
 */
export function ProjectRetroTab({
  projectId,
  projectName,
  googleConnected,
  onSaveNote,
}: {
  projectId: string;
  projectName: string;
  googleConnected: boolean;
  onSaveNote: (title: string, body: string) => void;
}) {
  const { todos, backlogItems, addNote } = useTodos();
  const { editMemo } = useTodoActions();
  const retroNote = findRetroNote(todos, projectId, projectName);
  const items = useMemo(() => collectProjectRetro(todos, projectId, retroNote?.id ?? null), [todos, projectId, retroNote?.id]);
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);
  const closeTodo = useCallback(() => setOpenTodoId(null), []);

  const [kind, setKind] = useState<RetroKind>("keep");
  const [draft, setDraft] = useState("");
  // 노트를 만드는 중에 Enter를 한 번 더 눌러 노트가 둘 생기지 않게
  const creatingNote = useRef(false);

  async function addProjectRetro() {
    const text = draft.trim();
    if (!text || creatingNote.current) return;
    setDraft("");
    if (retroNote) {
      editMemo(retroNote.id, appendRetroLine(retroNote.memo, kind, text));
      return;
    }
    creatingNote.current = true;
    try {
      await addNote(retroNoteTitle(projectName), nextPosition(backlogItems), {
        projectId,
        memo: appendRetroLine(null, kind, text),
      });
    } finally {
      creatingNote.current = false;
    }
  }

  function saveNote() {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    onSaveNote(`${projectName} 회고 ${dateKey}`, buildRetroMarkdown(items));
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <label className="flex h-[44px] min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card pl-[7px] pr-3">
          <RetroKindSelect value={kind} onChange={setKind} />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void addProjectRetro();
              }
            }}
            placeholder="프로젝트 전체 회고 적기"
            aria-label="프로젝트 전체 회고"
            className="min-w-0 flex-1 border-0 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
        </label>
        {googleConnected ? (
          <button
            type="button"
            onClick={saveNote}
            disabled={items.length === 0}
            title={items.length === 0 ? "회고가 쌓이면 노트로 저장할 수 있어요" : "자료 탭에 새 노트로 열어요"}
            className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-[13px] font-medium hover:bg-black/[0.03] disabled:cursor-default disabled:text-muted-foreground disabled:hover:bg-card"
          >
            <FileText className="size-[15px]" aria-hidden="true" />
            <span className="hidden sm:inline">회고 노트로 저장</span>
            <span className="sm:hidden">노트로</span>
          </button>
        ) : null}
      </div>

      <div className="grid items-start gap-3.5 sm:grid-cols-3">
        {RETRO_KINDS.map((k) => {
          const column = items.filter((item) => item.kind === k);
          return (
            <section key={k} aria-label={MARK_META[k].label} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <RetroKindIcon kind={k} className="mt-0 size-[22px] rounded-md" />
                <h2 className="text-[15px] font-bold">{MARK_META[k].label}</h2>
                <span className="text-[13px] text-muted-foreground">{column.length}</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {column.length === 0 ? (
                  <p className="px-3.5 py-3 text-[13px] text-muted-foreground">아직 없어요</p>
                ) : (
                  column.map((item) => (
                    <RetroRow
                      key={`${item.todo.id}:${item.lineIndex}`}
                      item={item}
                      projectId={projectId}
                      onOpenTodo={setOpenTodoId}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* 출처 할 일의 상세 팝업 — 메모 탭에서 회고 줄을 고친다 */}
      {openTodoId ? <TodoDetailById todoId={openTodoId} initialTab="memo" onClose={closeTodo} /> : null}
    </div>
  );
}

function RetroRow({
  item,
  projectId,
  onOpenTodo,
}: {
  item: RetroItem;
  projectId: string;
  onOpenTodo: (todoId: string) => void;
}) {
  const { backlogItems, addTodo } = useTodos();
  const { editMemo } = useTodoActions();
  // 저장이 끝나 메모에 "할 일로 만듦"이 붙기 전에 한 번 더 눌러 할 일이 두 개 생기지 않게
  const [converting, setConverting] = useState(false);

  /** "다음엔" → Inbox에 이 프로젝트의 할 일로, 메모 줄 끝에 "→ 할 일로 만듦" */
  async function convert() {
    if (converting || item.converted) return;
    setConverting(true);
    try {
      const todoId = await addTodo(item.text, nextPosition(backlogItems), { projectId });
      if (todoId && item.todo.memo) editMemo(item.todo.id, markConverted(item.todo.memo, item.lineIndex));
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="flex items-start gap-2 border-b border-border px-3 py-2.5 last:border-b-0">
      <button
        type="button"
        onClick={() => onOpenTodo(item.todo.id)}
        className="flex min-w-0 flex-1 flex-col gap-[3px] text-left"
      >
        <span className="break-words text-[14px] leading-[1.45]">
          <InlineText text={item.text} />
        </span>
        <span className="truncate text-[12px] text-muted-foreground">
          {item.projectWide ? (
            "프로젝트 전체"
          ) : (
            <>
              <InlineText text={item.todo.content} /> · {retroDateLabel(item.sortKey)}
            </>
          )}
        </span>
      </button>
      {item.kind === "try" ? (
        item.converted ? (
          <span className="flex h-[22px] shrink-0 items-center gap-[3px] text-[12px] text-muted-foreground">
            <Check weight="bold" className="size-3" aria-hidden="true" />
            할 일로 만듦
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void convert()}
            disabled={converting}
            title="같은 내용의 할 일을 Inbox에 만들고 이 프로젝트에 연결해요"
            className="flex h-[22px] shrink-0 items-center gap-0.5 rounded-[5px] px-1.5 text-[12.5px] font-semibold text-primary hover:bg-accent disabled:opacity-50"
          >
            <Plus weight="bold" className="size-3" aria-hidden="true" />
            할 일로
          </button>
        )
      ) : null}
    </div>
  );
}
