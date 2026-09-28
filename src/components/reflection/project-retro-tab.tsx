"use client";

import { useState } from "react";
import { Check, CircleCheck, FileText, Plus, X } from "lucide-react";

import { InlineText } from "@/components/inline-text";
import { TodoDetailModal } from "@/components/todo-detail-modal";
import { ReflectionKindIcon } from "@/components/reflection/reflection-kind";
import { ReflectionAddRow, ReflectionText } from "@/components/reflection/reflection-list";
import { buildRetroMarkdown, REFLECTION_META, reflectionDateLabel } from "@/lib/reflection";
import { REFLECTION_KINDS } from "@/lib/types";
import { useReflections, type ProjectReflection } from "@/lib/app-data/use-reflections";
import { useReflectionActions } from "@/lib/app-data/reflection-actions";
import { useContainers } from "@/lib/app-data/use-containers";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import { useTodos } from "@/lib/app-data/use-todos";

/**
 * PARA 상세(Project)의 회고 탭 — 프로젝트에 직접 쓴 회고 + 매핑된 할 일들의 회고를 잘한 점 / 아쉬운 점 / 다음엔
 * 3열로 모아 보여준다 (REFLECTIONS-PLAN.md 4번 ②).
 * 할 일에서 온 회고는 여기선 읽기만 하고(출처를 누르면 그 할 일 상세가 열림), 직접 쓴 회고만 여기서 고치고 지운다.
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
  const { reflectionsOfProject } = useReflections();
  const items = reflectionsOfProject(projectId);
  const [openTodoId, setOpenTodoId] = useState<string | null>(null);

  function saveNote() {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const body = buildRetroMarkdown(
      items.map(({ reflection, sourceTodo }) => ({
        kind: reflection.kind,
        content: reflection.content,
        source: sourceTodo?.content ?? null,
        createdAt: reflection.createdAt,
      }))
    );
    onSaveNote(`${projectName} 회고 ${dateKey}`, body);
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <ReflectionAddRow
          owner={{ projectId }}
          placement="down"
          placeholderSuffix=" (프로젝트 전체)"
          className="min-w-0 flex-1 rounded-xl border border-border bg-card py-1.5 pl-2 pr-3"
        />
        {googleConnected ? (
          <button
            type="button"
            onClick={saveNote}
            disabled={items.length === 0}
            title={items.length === 0 ? "회고가 쌓이면 노트로 저장할 수 있어요" : "자료 탭에 새 노트로 열어요"}
            className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-[13px] font-medium hover:bg-black/[0.03] disabled:cursor-default disabled:text-muted-foreground disabled:hover:bg-card"
          >
            <FileText className="size-[15px]" strokeWidth={1.8} aria-hidden="true" />
            <span className="hidden sm:inline">회고 노트로 저장</span>
            <span className="sm:hidden">노트로</span>
          </button>
        ) : null}
      </div>

      <div className="grid items-start gap-3.5 sm:grid-cols-3">
        {REFLECTION_KINDS.map((kind) => {
          const column = items.filter((item) => item.reflection.kind === kind);
          return (
            <section key={kind} aria-label={REFLECTION_META[kind].label} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <ReflectionKindIcon kind={kind} />
                <h2 className="text-[15px] font-bold">{REFLECTION_META[kind].label}</h2>
                <span className="text-[13px] text-muted-foreground">{column.length}</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {column.length === 0 ? (
                  <p className="px-3.5 py-3 text-[13px] text-muted-foreground">아직 없어요</p>
                ) : (
                  column.map((item) => (
                    <RetroRow
                      key={`${item.reflection.id}:${item.reflection.content}`}
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

      {openTodoId ? <SourceTodoModal todoId={openTodoId} onClose={() => setOpenTodoId(null)} /> : null}
    </div>
  );
}

function RetroRow({
  item,
  projectId,
  onOpenTodo,
}: {
  item: ProjectReflection;
  projectId: string;
  onOpenTodo: (todoId: string) => void;
}) {
  const { reflection, sourceTodo } = item;
  const actions = useReflectionActions();
  const { todos } = useTodos();
  // 만든 할 일이 아직 있을 때만 "추가됨" — 지워졌으면(Realtime 반영 전이라도) 다시 만들 수 있게
  const converted = reflection.convertedTodoId !== null && todos.some((t) => t.id === reflection.convertedTodoId);
  // 저장이 끝나 convertedTodoId가 채워지기 전에 한 번 더 눌러 할 일이 두 개 생기지 않게
  const [converting, setConverting] = useState(false);

  return (
    <div className="group flex flex-col gap-1.5 border-b border-border py-2.5 pl-3.5 pr-3 last:border-b-0">
      <div className="flex items-start gap-1.5">
        {sourceTodo ? (
          <span className="min-w-0 flex-1 break-words text-[14px] leading-[1.42]">
            <InlineText text={reflection.content} />
          </span>
        ) : (
          <>
            <ReflectionText reflection={reflection} />
            <button
              type="button"
              onClick={() => actions.remove(reflection.id)}
              aria-label="회고 삭제"
              className="-mr-1 -mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <X className="size-3" strokeWidth={2.2} />
            </button>
          </>
        )}
      </div>
      <div className="flex min-h-[22px] flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-muted-foreground">
        {sourceTodo ? (
          <button
            type="button"
            onClick={() => onOpenTodo(sourceTodo.id)}
            title="할 일 열기"
            className="flex min-w-0 max-w-full items-center gap-1 rounded-[5px] hover:text-foreground"
          >
            <CircleCheck className="size-3 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="truncate">
              <InlineText text={sourceTodo.content} />
            </span>
          </button>
        ) : (
          <span className="shrink-0 rounded-[5px] bg-black/[0.06] px-1.5 py-px font-semibold">프로젝트 전체</span>
        )}
        <span className="shrink-0 tabular-nums">· {reflectionDateLabel(reflection.createdAt)}</span>
        {reflection.kind === "try" ? (
          converted ? (
            <span className="ml-auto flex shrink-0 items-center gap-0.5 font-semibold text-[var(--retro-keep)]">
              <Check className="size-3" strokeWidth={2.4} aria-hidden="true" />
              Inbox에 추가됨
            </span>
          ) : (
            <button
              type="button"
              disabled={converting}
              onClick={() => {
                setConverting(true);
                void actions.convertToTodo(reflection.id, projectId).finally(() => setConverting(false));
              }}
              title="같은 내용의 할 일을 Inbox에 만들고 이 프로젝트에 연결해요"
              className="ml-auto flex h-[22px] shrink-0 items-center gap-0.5 rounded-[5px] px-1.5 font-semibold text-primary hover:bg-accent disabled:opacity-50"
            >
              <Plus className="size-3" strokeWidth={2.4} aria-hidden="true" />
              할 일로
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

/** 출처 할 일의 상세 팝업 — 회고는 거기서 고친다. */
function SourceTodoModal({ todoId, onClose }: { todoId: string; onClose: () => void }) {
  const { todos } = useTodos();
  const { projects, areas, resources } = useContainers();
  const actions = useTodoActions();
  const todo = todos.find((t) => t.id === todoId);
  if (!todo) return null;

  return (
    <TodoDetailModal
      todo={todo}
      projects={projects}
      areas={areas}
      resources={resources}
      onEdit={actions.edit}
      onMemoEdit={actions.editMemo}
      onUrlEdit={actions.editUrl}
      onAssignPara={actions.assignPara}
      onRemove={actions.remove}
      onConvert={actions.convert}
      onClose={onClose}
    />
  );
}
